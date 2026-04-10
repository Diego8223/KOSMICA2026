package com.luxshop.controller;

import com.luxshop.dto.OrderRequest;
import com.luxshop.model.GiftCard;
import com.luxshop.model.Order;
import com.luxshop.model.OrderItem;
import com.luxshop.service.EmailService;
import com.luxshop.service.GiftCardService;
import com.luxshop.service.OrderService;
import com.luxshop.service.PaymentService;
import com.luxshop.service.ReferralService;
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

@Slf4j
@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService    orderService;
    private final PaymentService  paymentService;
    private final GiftCardService giftCardService;
    private final ReferralService referralService;  // ✅ NUEVO: para activar cupón 15%
    private final EmailService    emailService;     // ✅ NUEVO: para notificaciones gift card

    // ── Pago directo con Nequi ─────────────────────────────────────
    @PostMapping("/nequi-payment")
    public ResponseEntity<Map<String, String>> createNequiPayment(
            @RequestBody Map<String, Object> body) {
        try {
            BigDecimal amount = new BigDecimal(body.get("amount").toString());
            String phone = body.get("phone").toString();
            // ✅ Pasar email y nombre para la Payments API de Nequi (requerido por MercadoPago)
            String email   = body.containsKey("email")   ? String.valueOf(body.get("email"))   : null;
            String name    = body.containsKey("name")    ? String.valueOf(body.get("name"))    : null;
            String orderId = body.containsKey("orderId") ? String.valueOf(body.get("orderId")) : null;
            Map<String, String> result = paymentService.createNequiPayment(amount, phone, email, name, orderId);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Error creando pago Nequi: {}", e.getMessage());
            return ResponseEntity.internalServerError()
                .body(Map.of("error", e.getMessage()));
        }
    }

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

    // ── Webhook MercadoPago ────────────────────────────────────
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

                    // ── 1. Buscar y actualizar el pedido normal ──
                    orderService.findByPaymentId(paymentId).ifPresent(order -> {
                        if (order.getStatus() == Order.Status.PENDING) {
                            orderService.updateStatus(order.getId(), Order.Status.PAID);
                            log.info("✅ Pedido {} marcado como PAID", order.getOrderNumber());

                            // ── 2. Activar gift card usada DENTRO del pedido ──
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

                            // ── 3. ✅ NUEVO: Redimir código referido y generar cupón 15% ──
                            String referralCode = order.getReferralCode();
                            if (referralCode != null && !referralCode.isBlank()
                                    && referralCode.startsWith("LUX-")) {
                                try {
                                    boolean redeemed = referralService.redeemCode(
                                        referralCode,
                                        order.getCustomerEmail(),
                                        order.getCustomerName(),
                                        order.getOrderNumber()
                                    );
                                    if (redeemed) {
                                        log.info("🎉 Código referido {} redimido — cupón 15% generado y enviado",
                                            referralCode);
                                    } else {
                                        log.warn("⚠️ Código referido {} no pudo ser redimido", referralCode);
                                    }
                                } catch (Exception e) {
                                    log.error("Error redimiendo código referido {}: {}", referralCode, e.getMessage());
                                }
                            }
                        } else {
                            log.info("Pedido {} ya estaba en estado {}, sin cambios",
                                order.getOrderNumber(), order.getStatus());
                        }
                    });

                    // ── 4. ✅ NUEVO: Activar gift card COMPRADA + enviar email/WhatsApp ──
                    // (cuando alguien compra una tarjeta de regalo directamente)
                    giftCardService.findByPaymentId(paymentId).ifPresent(gc -> {
                        if ("PENDING".equals(gc.getStatus())) {
                            GiftCard activated = giftCardService.activateGiftCard(gc.getCode(), paymentId);
                            log.info("🎁 Gift card {} activada por pago directo {}", gc.getCode(), paymentId);

                            // Enviar email al receptor + WhatsApp al sender
                            try {
                                emailService.sendGiftCardNotifications(activated);
                            } catch (Exception e) {
                                log.error("Error enviando notificaciones de gift card {}: {}",
                                    gc.getCode(), e.getMessage());
                            }
                        }
                    });
                }
            }

        } catch (Exception e) {
            log.error("Error procesando webhook: {}", e.getMessage(), e);
        }

        return ResponseEntity.ok().build();
    }

    // ── Social Proof ───────────────────────────────────────────
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
