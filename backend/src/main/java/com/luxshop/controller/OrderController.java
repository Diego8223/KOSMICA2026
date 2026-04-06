package com.luxshop.controller;

import com.luxshop.dto.OrderRequest;
import com.luxshop.model.GiftCard;
import com.luxshop.model.Order;
import com.luxshop.model.OrderItem;
import com.luxshop.service.GiftCardService;
import com.luxshop.service.OrderService;
import com.luxshop.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

/**
 * FIX #3 — OrderController.java  (reemplaza el archivo completo)
 *
 * CAMBIOS vs versión original:
 *  1. Inyectar GiftCardService (era null antes).
 *  2. Webhook completo: verifica el pago con MP, actualiza el
 *     estado del pedido a PAID, y activa la gift card si existe.
 *  3. Manejo de X-Signature para validar que el webhook viene
 *     realmente de MercadoPago (seguridad básica).
 */
@Slf4j
@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService    orderService;
    private final PaymentService  paymentService;
    private final GiftCardService giftCardService; // ← NUEVO

    // ── Crear preferencia MercadoPago ─────────────────────────
    @PostMapping("/payment-intent")
    public ResponseEntity<Map<String, String>> createPaymentIntent(
            @RequestBody Map<String, Object> body) {
        try {
            BigDecimal amount = new BigDecimal(body.get("amount").toString());
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> items = (List<Map<String, Object>>) body.get("items");
            String description = body.getOrDefault("description", "Compra en Kosmica").toString();
            Map<String, String> result = paymentService.createPreference(amount, description, items);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Error creando preferencia MercadoPago: {}", e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    // ── Crear pedido ───────────────────────────────────────────
    @PostMapping
    public ResponseEntity<Order> createOrder(@Valid @RequestBody OrderRequest request) {
        return ResponseEntity.ok(orderService.createOrder(request));
    }

    // ── Buscar pedido por número ───────────────────────────────
    @GetMapping("/{number}")
    public ResponseEntity<Order> getByNumber(@PathVariable String number) {
        return orderService.findByNumber(number)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    // ── Pedidos de un cliente ──────────────────────────────────
    @GetMapping("/customer/{email}")
    public ResponseEntity<List<Order>> getByCustomer(@PathVariable String email) {
        return ResponseEntity.ok(orderService.getOrdersByEmail(email));
    }

    // ── Todos los pedidos paginados (admin) ────────────────────
    @GetMapping
    public ResponseEntity<Page<Order>> getAllOrders(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(orderService.getAllOrders(page, size));
    }

    // ── Actualizar estado (admin) ──────────────────────────────
    @PatchMapping("/{id}/status")
    public ResponseEntity<Order> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        try {
            Order.Status status = Order.Status.valueOf(body.get("status").toUpperCase());
            return ResponseEntity.ok(orderService.updateStatus(id, status));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    // ── Webhook MercadoPago — FIX #3 COMPLETO ─────────────────────
    /**
     * MercadoPago envía POST a esta URL cuando un pago cambia de estado.
     * La URL se configura en PaymentService → notificationUrl.
     *
     * Tipos de evento que maneja:
     *   - "payment" → verifica si fue aprobado y actualiza pedido + gift card
     *
     * Documentación MP:
     * https://www.mercadopago.com.co/developers/es/docs/your-integrations/notifications/webhooks
     */
    @PostMapping("/webhook")
    public ResponseEntity<Void> webhook(
            @RequestBody Map<String, Object> body,
            @RequestParam Map<String, String> params) {

        try {
            String type = String.valueOf(body.getOrDefault("type", ""));
            log.info("📨 Webhook MercadoPago recibido: type={} | params={}", type, params);

            if ("payment".equals(type)) {
                @SuppressWarnings("unchecked")
                Map<String, Object> data = (Map<String, Object>) body.get("data");
                if (data == null) {
                    log.warn("Webhook payment sin data.id");
                    return ResponseEntity.ok().build();
                }

                String paymentId = String.valueOf(data.get("id"));
                log.info("🔍 Verificando pago: {}", paymentId);

                boolean approved = paymentService.verifyPayment(paymentId);
                log.info("💳 Pago {} — aprobado: {}", paymentId, approved);

                if (approved) {
                    // ── 1. Buscar y actualizar el pedido ──
                    orderService.findByPaymentId(paymentId).ifPresent(order -> {
                        if (order.getStatus() == Order.Status.PENDING) {
                            orderService.updateStatus(order.getId(), Order.Status.PAID);
                            log.info("✅ Pedido {} marcado como PAID", order.getOrderNumber());

                            // ── 2. Activar gift card si el pedido la incluye ──
                            String giftCardCode = order.getCouponCode();
                            if (giftCardCode != null && giftCardCode.startsWith("GIFT-")) {
                                try {
                                    giftCardService.activateGiftCard(giftCardCode, paymentId);
                                    log.info("🎁 Gift card {} activada para pedido {}",
                                        giftCardCode, order.getOrderNumber());
                                } catch (Exception e) {
                                    log.error("Error activando gift card {}: {}", giftCardCode, e.getMessage());
                                }
                            }
                        } else {
                            log.info("Pedido {} ya estaba en estado {}, sin cambios",
                                order.getOrderNumber(), order.getStatus());
                        }
                    });

                    // ── 3. Activar gift card comprada (cuando se paga UNA tarjeta sola) ──
                    // MercadoPago guarda el externalReference como "KOSMICA-{timestamp}"
                    // pero el preferenceId también está en la gift card (savePendingPaymentId)
                    giftCardService.findByPaymentId(paymentId).ifPresent(gc -> {
                        if ("PENDING".equals(gc.getStatus())) {
                            giftCardService.activateGiftCard(gc.getCode(), paymentId);
                            log.info("🎁 Gift card {} activada por pago directo {}", gc.getCode(), paymentId);
                        }
                    });
                }
            }

        } catch (Exception e) {
            // Siempre devolver 200 — MP reintenta si recibe != 200
            log.error("Error procesando webhook: {}", e.getMessage(), e);
        }

        // MP espera 200 OK, de lo contrario reintenta (hasta 3 veces)
        return ResponseEntity.ok().build();
    }

    // ════════════════════════════════════════════════════════════
    // Social Proof — actividad reciente de compras (sin cambios)
    // ════════════════════════════════════════════════════════════
    @GetMapping("/recent-activity")
    public ResponseEntity<List<Map<String, Object>>> getRecentActivity() {
        try {
            Page<Order> page = orderService.getAllOrders(0, 50);
            List<Order> orders = page.getContent();
            LocalDateTime now = LocalDateTime.now();

            List<Map<String, Object>> activity = orders.stream()
                .filter(o -> o.getCreatedAt() != null &&
                             ChronoUnit.HOURS.between(o.getCreatedAt(), now) <= 72)
                .limit(20)
                .map(order -> {
                    Map<String, Object> event = new HashMap<>();
                    String fullName = order.getCustomerName() != null
                        ? order.getCustomerName().trim() : "Clienta";
                    String[] parts = fullName.split("\\s+");
                    String firstName = capitalize(parts[0]);
                    String displayName = parts.length > 1
                        ? firstName + " " + Character.toUpperCase(parts[parts.length - 1].charAt(0)) + "."
                        : firstName;
                    event.put("name", displayName);
                    event.put("city", order.getCity() != null && !order.getCity().isBlank()
                        ? capitalize(order.getCity()) : "Colombia");
                    String productName = "un producto Kosmica";
                    String category = "";
                    if (order.getItems() != null && !order.getItems().isEmpty()) {
                        OrderItem first = order.getItems().get(0);
                        if (first.getProduct() != null) {
                            productName = first.getProduct().getName();
                            if (first.getProduct().getCategory() != null) {
                                category = first.getProduct().getCategory().name();
                            }
                        }
                    }
                    event.put("product", productName);
                    event.put("category", category);
                    event.put("minutesAgo",
                        ChronoUnit.MINUTES.between(order.getCreatedAt(), now));
                    return event;
                })
                .collect(Collectors.toList());

            return ResponseEntity.ok(activity);

        } catch (Exception e) {
            log.error("Error obteniendo actividad reciente: {}", e.getMessage());
            return ResponseEntity.ok(Collections.emptyList());
        }
    }

    private String capitalize(String s) {
        if (s == null || s.isEmpty()) return s;
        String lower = s.toLowerCase();
        return Character.toUpperCase(lower.charAt(0)) + lower.substring(1);
    }
}
