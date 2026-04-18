package com.luxshop.controller;

import com.luxshop.service.OrderService;
import com.luxshop.service.WompiService;
import com.luxshop.model.Order;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
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

    // ─────────────────────────────────────────────────────────────────────────
    // POST /api/wompi/transaction
    // Crea una transacción Wompi y devuelve la URL del widget de pago
    // ─────────────────────────────────────────────────────────────────────────
    @PostMapping("/transaction")
    public ResponseEntity<Map<String, String>> createTransaction(
            @RequestBody Map<String, Object> body) {
        try {
            BigDecimal amount  = new BigDecimal(body.get("amount").toString());
            String email       = body.containsKey("email")       ? String.valueOf(body.get("email"))       : null;
            String name        = body.containsKey("name")        ? String.valueOf(body.get("name"))        : null;
            String phone       = body.containsKey("phone")       ? String.valueOf(body.get("phone"))       : null;
            String orderId     = body.containsKey("orderId")     ? String.valueOf(body.get("orderId"))     : null;
            String redirectUrl = body.containsKey("redirectUrl") ? String.valueOf(body.get("redirectUrl")) : null;

            Map<String, String> result = wompiService.createTransaction(amount, email, name, phone, orderId, redirectUrl);
            return ResponseEntity.ok(result);

        } catch (Exception e) {
            log.error("Error creando transacción Wompi: {}", e.getMessage());
            Map<String, String> err = new HashMap<>();
            err.put("error",  e.getMessage());
            err.put("status", "error");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(err);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/wompi/status/{transactionId}
    // Consulta el estado de una transacción (polling desde el frontend)
    // ─────────────────────────────────────────────────────────────────────────
    @GetMapping("/status/{transactionId}")
    public ResponseEntity<Map<String, String>> getStatus(@PathVariable String transactionId) {
        try {
            return ResponseEntity.ok(wompiService.getTransactionStatus(transactionId));
        } catch (Exception e) {
            log.error("Error consultando estado Wompi {}: {}", transactionId, e.getMessage());
            Map<String, String> err = new HashMap<>();
            err.put("transactionId", transactionId);
            err.put("status", "ERROR");
            err.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(err);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /api/wompi/webhook   ← URL para configurar en el panel de Wompi
    //
    // Wompi envía notificaciones de pago a esta URL.
    // Panel Wompi → Desarrolladores → URL de eventos:
    //   https://kosmica-backend.onrender.com/api/wompi/webhook
    //
    // ✅ CORRECCIÓN: Wompi NO usa el header X-Wompi-Signature.
    // La firma viene DENTRO del body JSON en: body.signature.checksum
    // Ver: https://docs.wompi.co/docs/colombia/eventos/
    // ─────────────────────────────────────────────────────────────────────────
    @PostMapping("/webhook")
    public ResponseEntity<Void> webhook(@RequestBody Map<String, Object> body) {

        try {
            String event = String.valueOf(body.getOrDefault("event", ""));
            log.info("📨 Webhook Wompi recibido: event={}", event);

            // ── 1. Verificar firma desde body.signature.checksum ────────────
            if (!wompiService.verifyWebhookSignature(body)) {
                log.warn("⛔ Webhook Wompi rechazado: firma inválida.");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            // ── 2. Procesar evento transaction.updated ──────────────────────
            if ("transaction.updated".equals(event)) {
                processTransactionUpdated(body);
            } else {
                log.info("Evento Wompi ignorado (no es transaction.updated): {}", event);
            }

        } catch (Exception e) {
            // Wompi reintentará si no devolvemos 200. Logueamos el error pero
            // respondemos 200 para evitar reintentos indefinidos en errores internos.
            log.error("Error procesando webhook Wompi: {}", e.getMessage(), e);
        }

        // Wompi espera siempre HTTP 200 para confirmar recepción
        return ResponseEntity.ok().build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers privados
    // ─────────────────────────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private void processTransactionUpdated(Map<String, Object> body) {

        Map<String, Object> data = (Map<String, Object>) body.get("data");
        if (data == null) {
            log.warn("Webhook Wompi: campo 'data' ausente en el body");
            return;
        }

        Map<String, Object> tx = (Map<String, Object>) data.get("transaction");
        if (tx == null) {
            log.warn("Webhook Wompi: campo 'transaction' ausente en data");
            return;
        }

        String reference = String.valueOf(tx.getOrDefault("reference", ""));
        String status    = String.valueOf(tx.getOrDefault("status", ""));
        String txId      = String.valueOf(tx.getOrDefault("id", ""));

        log.info("Wompi transaction.updated → id={} ref={} status={}", txId, reference, status);

        // ── Solo procesar pagos APROBADOS con referencia de Kosmica ─────────
        if (!"APPROVED".equals(status)) {
            log.info("Transacción {} no aprobada (status={}), no se actualiza el pedido.", txId, status);
            return;
        }

        if (!reference.startsWith("KOSMICA-")) {
            log.warn("Referencia desconocida, no pertenece a Kosmica: {}", reference);
            return;
        }

        // Formato de referencia: KOSMICA-{orderNumber}-{timestamp}
        // Ejemplo: KOSMICA-1042-1713300000000
        String[] parts = reference.split("-");
        if (parts.length < 3) {
            log.error("Formato de referencia inesperado: {}", reference);
            return;
        }

        String orderNumber = parts[1];

        orderService.findByNumber(orderNumber).ifPresentOrElse(
            order -> {
                if (order.getStatus() == Order.Status.PAID) {
                    // Idempotencia: evitar doble procesamiento si Wompi reintenta
                    log.info("Pedido {} ya estaba en estado PAID, ignorando webhook duplicado.", orderNumber);
                    return;
                }
                orderService.updateStatus(order.getId(), Order.Status.PAID);
                log.info("✅ Pedido {} marcado como PAID por Wompi (txId={})", orderNumber, txId);
            },
            () -> log.error("❌ Pedido no encontrado para número: {}", orderNumber)
        );
    }
}
