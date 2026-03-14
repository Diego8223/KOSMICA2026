package com.luxshop.controller;

import com.luxshop.dto.OrderRequest;
import com.luxshop.model.Order;
import com.luxshop.service.OrderService;
import com.luxshop.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService   orderService;
    private final PaymentService paymentService;

    // Crear intención de pago Stripe
    @PostMapping("/payment-intent")
    public ResponseEntity<Map<String, String>> createPaymentIntent(
            @RequestBody Map<String, Object> body) {
        try {
            BigDecimal amount = new BigDecimal(body.get("amount").toString());
            String currency   = body.getOrDefault("currency", "usd").toString();
            return ResponseEntity.ok(paymentService.createPaymentIntent(amount, currency));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    // Crear pedido
    @PostMapping
    public ResponseEntity<Order> createOrder(@Valid @RequestBody OrderRequest request) {
        return ResponseEntity.ok(orderService.createOrder(request));
    }

    // Buscar por número de pedido (para rastreo del cliente)
    @GetMapping("/{number}")
    public ResponseEntity<Order> getByNumber(@PathVariable String number) {
        return orderService.findByNumber(number)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    // Pedidos de un cliente por email
    @GetMapping("/customer/{email}")
    public ResponseEntity<List<Order>> getByCustomer(@PathVariable String email) {
        return ResponseEntity.ok(orderService.getOrdersByEmail(email));
    }

    // Todos los pedidos (admin) con paginación
    @GetMapping
    public ResponseEntity<Page<Order>> getAllOrders(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(orderService.getAllOrders(page, size));
    }

    // Actualizar estado del pedido (admin) → dispara email automático
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
}
