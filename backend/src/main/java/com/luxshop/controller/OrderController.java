package com.luxshop.controller;

import com.luxshop.dto.OrderRequest;
import com.luxshop.model.Order;
import com.luxshop.service.OrderService;
import com.luxshop.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService   orderService;
    private final PaymentService paymentService;

    // ── Crear preferencia MercadoPago ─────────────────────────
    // Frontend llama esto, recibe init_point y redirige al cliente
    @PostMapping("/payment-intent")
    public ResponseEntity<Map<String, String>> createPaymentIntent(
            @RequestBody Map<String, Object> body) {
        try {
            BigDecimal amount = new BigDecimal(body.get("amount").toString());

            // Si vienen items detallados, usarlos
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

    // ── Buscar pedido por número (rastreo cliente) ─────────────
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

    // ── Actualizar estado (admin) → envía email automático ─────
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

    // ── Webhook MercadoPago (notificaciones automáticas) ───────
    // MercadoPago llama a este endpoint cuando un pago cambia de estado
    @PostMapping("/webhook")
    public ResponseEntity<Void> webhook(@RequestBody Map<String, Object> body,
                                         @RequestParam Map<String, String> params) {
        try {
            String type = String.valueOf(body.getOrDefault("type", ""));
            log.info("Webhook MercadoPago recibido: type={}", type);

            if ("payment".equals(type)) {
                @SuppressWarnings("unchecked")
                Map<String, Object> data = (Map<String, Object>) body.get("data");
                if (data != null) {
                    String paymentId = String.valueOf(data.get("id"));
                    boolean approved = paymentService.verifyPayment(paymentId);
                    log.info("Pago {} — aprobado: {}", paymentId, approved);
                    // Aquí podrías actualizar el estado del pedido si tienes el external_reference
                }
            }
        } catch (Exception e) {
            log.error("Error procesando webhook: {}", e.getMessage());
        }
        return ResponseEntity.ok().build();
    }
}
