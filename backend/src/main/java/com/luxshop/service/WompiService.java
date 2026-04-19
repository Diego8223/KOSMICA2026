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

    // ✅ FIX: wompi.events.secret  → para validar webhooks  (WOMPI_EVENTS_SECRET  en Render)
    //         wompi.integrity.secret → para firmar checkout (WOMPI_INTEGRITY_SECRET en Render)
    //         Son llaves DISTINTAS en el panel de Wompi. No las mezcles.
    @Value("${wompi.events.secret:secret_placeholder}")
    private String wompiEventsSecret;

    @Value("${wompi.public.key:pub_test_placeholder}")
    private String wompiPublicKey;

    @Value("${wompi.private.key:prv_test_placeholder}")
    private String wompiPrivateKey;

    private final OrderRepository orderRepository;

    // ══════════════════════════════════════════════════════════════
    //  VALIDACIÓN DE FIRMA DEL WEBHOOK
    //
    //  ✅ FIX: La fórmula oficial de Wompi para webhooks es:
    //
    //     SHA256( id + status + amountInCents + currency + timestamp + eventsSecret )
    //
    //  Referencia: https://docs.wompi.co/docs/colombia/eventos/
    //
    //  El bug anterior usaba SHA256(rawBody + secret), que es incorrecto
    //  y producía: "⛔ Firma Wompi inválida" en todos los webhooks.
    // ══════════════════════════════════════════════════════════════
    public boolean isValidWebhookSignature(String rawBody, String receivedSignature) {

        // Si el secret es el placeholder o está vacío, aceptar sin validar
        if (wompiEventsSecret == null
                || wompiEventsSecret.isBlank()
                || wompiEventsSecret.equals("secret_placeholder")) {
            log.warn("⚠️ WOMPI_EVENTS_SECRET no configurado — aceptando webhook sin validar firma. " +
                     "Configura WOMPI_EVENTS_SECRET en Render para activar la seguridad.");
            return true;
        }

        if (receivedSignature == null || receivedSignature.isBlank()) {
            log.warn("⛔ Webhook sin header x-event-checksum y secret SÍ está configurado — rechazado.");
            return false;
        }

        try {
            // ✅ FIX: Parsear el body para extraer los campos requeridos por Wompi
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            JsonNode root        = mapper.readTree(rawBody);
            JsonNode transaction = root.path("data").path("transaction");

            String id           = transaction.path("id").asText("");
            String status       = transaction.path("status").asText("");
            String amountCents  = transaction.path("amount_in_cents").asText("");
            String currency     = transaction.path("currency").asText("");
            // timestamp viene en el nivel raíz del evento
            String timestamp    = root.path("sent_at").asText(
                                  root.path("timestamp").asText(""));

            // Fórmula oficial: id + status + amountInCents + currency + timestamp + eventsSecret
            String toHash  = id + status + amountCents + currency + timestamp + wompiEventsSecret;
            String computed = sha256Hex(toHash);

            boolean valid = computed != null && computed.equalsIgnoreCase(receivedSignature);

            if (valid) {
                log.info("✅ Firma Wompi válida | id={}", id);
            } else {
                log.warn("⛔ Firma Wompi inválida. computed={} | received={}", computed, receivedSignature);
            }

            return valid;

        } catch (Exception e) {
            log.error("❌ Error validando firma Wompi", e);
            return false;
        }
    }

    private String sha256Hex(String input) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
        return HexFormat.of().formatHex(hash);
    }

    // ══════════════════════════════════════════════════════════════
    //  PROCESAR EVENTO DEL WEBHOOK
    // ══════════════════════════════════════════════════════════════
    @Transactional
    public void processWebhookEvent(JsonNode event) {

        String eventType = event.path("event").asText();
        String eventId   = event.path("id").asText();

        log.info("📨 Procesando evento Wompi | id={} | type={}", eventId, eventType);

        if (!"transaction.updated".equals(eventType)) {
            log.info("ℹ️ Evento ignorado: {}", eventType);
            return;
        }

        JsonNode transaction = event.path("data").path("transaction");

        String reference     = transaction.path("reference").asText();
        String status        = transaction.path("status").asText();
        String transactionId = transaction.path("id").asText();

        log.info("💳 Transacción | id={} | ref={} | status={}", transactionId, reference, status);

        orderRepository.findByOrderNumber(reference).ifPresentOrElse(order -> {

            switch (status) {
                case "APPROVED" -> {
                    order.setStatus(Order.Status.PAID);
                    log.info("✅ Pedido APROBADO: {}", reference);
                }
                case "DECLINED", "VOIDED", "ERROR" -> {
                    order.setStatus(Order.Status.CANCELLED);
                    log.info("❌ Pedido {}: {}", status, reference);
                }
                case "PENDING" -> {
                    log.info("⏳ Pago pendiente: {}", reference);
                }
                default -> {
                    log.info("ℹ️ Estado no manejado: {} | ref={}", status, reference);
                }
            }

            orderRepository.save(order);

        }, () -> log.warn("⚠️ Pedido no encontrado para referencia: {}", reference));
    }

    public String getPublicKey() {
        return wompiPublicKey;
    }
}
