package com.luxshop.controller;

import com.luxshop.service.OrderService;
import com.luxshop.service.WompiService;
import com.luxshop.model.Order;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/wompi")
@RequiredArgsConstructor
public class WompiController {

    private final WompiService wompiService;
    private final OrderService orderService;

    /** Crea una transacción Wompi y devuelve la URL del widget de pago */
    @PostMapping("/transaction")
    public ResponseEntity<Map<String, String>> createTransaction(
            @RequestBody Map<String, Object> body) {
        try {
            BigDecimal amount = new BigDecimal(body.get("amount").toString());
            String email   = body.containsKey("email")   ? String.valueOf(body.get("email"))   : null;
            String name    = body.containsKey("name")    ? String.valueOf(body.get("name"))    : null;
            String phone   = body.containsKey("phone")   ? String.valueOf(body.get("phone"))   : null;
            String orderId = body.containsKey("orderId") ? String.valueOf(body.get("orderId")) : null;
            String redirect= body.containsKey("redirectUrl") ? String.valueOf(body.get("redirectUrl")) : null;

            Map<String, String> result = wompiService.createTransaction(amount, email, name, phone, orderId, redirect);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Error creando transacción Wompi: {}", e.getMessage());
            Map<String, String> err = new HashMap<>();
            err.put("error",  e.getMessage());
            err.put("status", "error");
            return ResponseEntity.ok(err);
        }
    }

    /** Consulta el estado de una transacción Wompi (para polling) */
    @GetMapping("/status/{transactionId}")
    public ResponseEntity<Map<String, String>> getStatus(@PathVariable String transactionId) {
        return ResponseEntity.ok(wompiService.getTransactionStatus(transactionId));
    }

    /** Webhook de Wompi — recibe notificaciones de pago */
    @PostMapping("/webhook")
    public ResponseEntity<Void> webhook(
            @RequestBody Map<String, Object> body,
            @RequestHeader(value = "X-Event-Checksum", required = false) String checksum) {
        try {
            log.info("📨 Webhook Wompi recibido: event={}", body.get("event"));

            // Verificar firma si está configurado
            // wompiService.verifyWebhookSignature(body.toString(), checksum);

            String event = String.valueOf(body.getOrDefault("event", ""));
            if ("transaction.updated".equals(event)) {
                @SuppressWarnings("unchecked")
                Map<String, Object> data = (Map<String, Object>) body.get("data");
                if (data != null) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> tx = (Map<String, Object>) data.get("transaction");
                    if (tx != null) {
                        String reference = String.valueOf(tx.getOrDefault("reference", ""));
                        String status    = String.valueOf(tx.getOrDefault("status", ""));
                        log.info("Wompi transacción: ref={} status={}", reference, status);

                        if ("APPROVED".equals(status) && reference.startsWith("KOSMICA-")) {
                            // Extraer orderId de la referencia KOSMICA-{orderId}-{timestamp}
                            String[] parts = reference.split("-");
                            if (parts.length >= 2) {
                                String orderNumber = parts[1];
                                orderService.findByNumber(orderNumber).ifPresent(order -> {
                                    if (order.getStatus() == Order.Status.PENDING) {
                                        orderService.updateStatus(order.getId(), Order.Status.PAID);
                                        log.info("✅ Pedido {} marcado PAID por Wompi", orderNumber);
                                    }
                                });
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.error("Error procesando webhook Wompi: {}", e.getMessage(), e);
        }
        return ResponseEntity.ok().build();
    }
}
