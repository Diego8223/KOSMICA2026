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

    public boolean isValidWebhookSignature(JsonNode event, String receivedSignature) {
        try {
            JsonNode transaction = event.path("data").path("transaction");

            String transactionId   = transaction.path("id").asText();
            String statusChangedAt = transaction.path("status_changed_at").asText();
            String amountInCents   = transaction.path("amount_in_cents").asText();
            String currency        = transaction.path("currency").asText();

            String concatenated = transactionId + statusChangedAt + amountInCents + currency + wompiEventsSecret;
            String computed = sha256Hex(concatenated);

            log.info("🔐 Wompi firma | computed={} | received={}", computed, receivedSignature);

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

    @Transactional
    public void processWebhookEvent(JsonNode event) {
        String eventType = event.path("event").asText();

        if ("transaction.updated".equals(eventType)) {
            JsonNode transaction = event.path("data").path("transaction");
            String reference = transaction.path("reference").asText();
            String status    = transaction.path("status").asText();

            log.info("💳 Wompi transacción | ref={} | status={}", reference, status);

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
                    default -> log.info("ℹ️ Estado no manejado: {} | ref={}", status, reference);
                }
                orderRepository.save(order);
            }, () -> log.warn("⚠️ Pedido no encontrado para ref Wompi: {}", reference));
        }
    }

    public String generateWidgetUrl(String orderNumber, long amountCents) {
        log.info("Wompi widget URL generada: ref={} amountCents={}", orderNumber, amountCents);
        return orderNumber;
    }
}