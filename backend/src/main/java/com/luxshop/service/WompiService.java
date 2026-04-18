package com.luxshop.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.luxshop.model.Order;
import com.luxshop.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;

@Slf4j
@Service
@RequiredArgsConstructor
public class WompiService {

    @Value("${wompi.events-secret}")
    private String wompiEventsSecret;

    @Value("${wompi.public-key}")
    private String wompiPublicKey;

    @Value("${wompi.private-key}")
    private String wompiPrivateKey;

    private final OrderRepository orderRepository;

    // ─────────────────────────────────────────────────────────────────
    // VERIFICACIÓN DE FIRMA DEL WEBHOOK
    // Documentación oficial Wompi:
    // checksum = SHA256( transactionId + statusChangedAt + amountInCents + currency + eventsSecret )
    // ─────────────────────────────────────────────────────────────────

    /**
     * Verifica que el webhook proviene realmente de Wompi.
     * Wompi construye el checksum así:
     *   SHA256( data.transaction.id
     *         + data.transaction.status_changed_at
     *         + data.transaction.amount_in_cents
     *         + data.transaction.currency
     *         + EVENTS_SECRET )
     */
    public boolean isValidWebhookSignature(JsonNode event, String receivedSignature) {
        try {
            JsonNode transaction = event.path("data").path("transaction");

            String transactionId     = transaction.path("id").asText();
            String statusChangedAt   = transaction.path("status_changed_at").asText();
            String amountInCents     = transaction.path("amount_in_cents").asText();
            String currency          = transaction.path("currency").asText();

            String concatenated = transactionId
                    + statusChangedAt
                    + amountInCents
                    + currency
                    + wompiEventsSecret;

            String computed = sha256Hex(concatenated);

            log.info("🔐 Wompi firma | computed={} | received={}",
                    computed, receivedSignature);

            return computed.equalsIgnoreCase(receivedSignature);

        } catch (Exception e) {
            log.error("❌ Error verificando firma Wompi", e);
            return false;
        }
    }

    private String sha256Hex(String input) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
        return HexFormat.of().formatHex(hash);
    }

    // ─────────────────────────────────────────────────────────────────
    // PROCESAMIENTO DEL EVENTO
    // ─────────────────────────────────────────────────────────────────

    @Transactional
    public void processWebhookEvent(JsonNode event) {
        String eventType = event.path("event").asText();

        if ("transaction.updated".equals(eventType)) {
            JsonNode transaction = event.path("data").path("transaction");
            String reference = transaction.path("reference").asText();
            String status    = transaction.path("status").asText();

            log.info("💳 Wompi transacción actualizada | ref={} | status={}", reference, status);

            // Buscar el pedido por referencia (elimina el prefijo "KOSMICA-" si aplica)
            String orderId = reference.replace("KOSMICA-", "").trim();

            orderRepository.findByReference(orderId).ifPresentOrElse(order -> {
                switch (status) {
                    case "APPROVED" -> {
                        order.setStatus(Order.Status.PAGADO);
                        log.info("✅ Pedido APROBADO: {}", orderId);
                    }
                    case "DECLINED" -> {
                        order.setStatus(Order.Status.CANCELADO);
                        log.info("❌ Pedido RECHAZADO: {}", orderId);
                    }
                    case "VOIDED" -> {
                        order.setStatus(Order.Status.CANCELADO);
                        log.info("🚫 Pedido ANULADO: {}", orderId);
                    }
                    case "ERROR" -> {
                        order.setStatus(Order.Status.CANCELADO);
                        log.info("⚠️ Pedido ERROR: {}", orderId);
                    }
                    default -> log.info("ℹ️ Estado no manejado: {} para pedido {}", status, orderId);
                }
                orderRepository.save(order);
            }, () -> log.warn("⚠️ Pedido no encontrado para referencia: {}", orderId));
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // GENERACIÓN DE URL DEL WIDGET
    // ─────────────────────────────────────────────────────────────────

    public String generateWidgetUrl(String orderId, long amountCents) {
        String ref = "KOSMICA-" + orderId + "-" + System.currentTimeMillis();
        log.info("Wompi widget URL generada: ref={} amountCents={}", ref, amountCents);
        return ref;
    }
}
