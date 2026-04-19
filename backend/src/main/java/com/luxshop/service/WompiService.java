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

    // 🔧 FIX: defaultValue="secret_placeholder" evita que el backend
    //         no arranque si WOMPI_EVENTS_SECRET no está configurado en Render.
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
    //  Wompi firma cada evento con SHA-256(rawBody + eventsSecret).
    //  Si el secret no está configurado (placeholder), se acepta el
    //  evento de todas formas y se loguea una advertencia.
    //
    //  Para activar la validación real:
    //    1. Ve al panel de Wompi → Desarrolladores → Eventos
    //    2. Copia el "Secreto de eventos"
    //    3. En Render → Environment Variables → WOMPI_EVENTS_SECRET
    // ══════════════════════════════════════════════════════════════
    public boolean isValidWebhookSignature(String rawBody, String receivedSignature) {

        // Si el secret es el placeholder o está vacío, aceptar sin validar
        // (modo desarrollo / secret no configurado aún)
        if (wompiEventsSecret == null
                || wompiEventsSecret.isBlank()
                || wompiEventsSecret.equals("secret_placeholder")) {
            log.warn("⚠️ WOMPI_EVENTS_SECRET no configurado — aceptando webhook sin validar firma. " +
                     "Configura WOMPI_EVENTS_SECRET en Render para activar la seguridad.");
            return true;
        }

        // Si Wompi no mandó firma, rechazar
        if (receivedSignature == null || receivedSignature.isBlank()) {
            log.warn("⛔ Webhook sin header x-event-checksum y secret SÍ está configurado — rechazado.");
            return false;
        }

        try {
            String computed = sha256Hex(rawBody + wompiEventsSecret);
            boolean valid = computed != null && computed.equalsIgnoreCase(receivedSignature);

            if (valid) {
                log.info("✅ Firma Wompi válida");
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
