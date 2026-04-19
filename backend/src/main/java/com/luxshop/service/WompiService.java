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

    @Value("${wompi.events.secret}")
    private String wompiEventsSecret;

    @Value("${wompi.public.key}")
    private String wompiPublicKey;

    @Value("${wompi.private.key}")
    private String wompiPrivateKey;

    private final OrderRepository orderRepository;

    // 🔐 VALIDACIÓN PRO CON RAW BODY
    public boolean isValidWebhookSignature(String rawBody, String receivedSignature) {
        try {
            String computed = sha256Hex(rawBody + wompiEventsSecret);

            log.info("🔐 Firma calculada={} | recibida={}", computed, receivedSignature);

            return computed != null && computed.equalsIgnoreCase(receivedSignature);

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

    @Transactional
    public void processWebhookEvent(JsonNode event) {

        String eventType = event.path("event").asText();
        String eventId = event.path("id").asText();

        log.info("📨 Procesando evento Wompi | id={} | type={}", eventId, eventType);

        // 🚫 Ignorar eventos no relevantes
        if (!"transaction.updated".equals(eventType)) {
            log.info("ℹ️ Evento ignorado: {}", eventType);
            return;
        }

        JsonNode transaction = event.path("data").path("transaction");

        String reference = transaction.path("reference").asText();
        String status    = transaction.path("status").asText();
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

    // 🔗 (por ahora simple, luego lo puedes mejorar)
    public String generateWidgetUrl(String orderNumber, long amountCents) {
        log.info("🧾 Generando widget Wompi | ref={} | amount={}", orderNumber, amountCents);
        return orderNumber;
    }
}