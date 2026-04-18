package com.luxshop.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.luxshop.service.WompiService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/wompi")
@RequiredArgsConstructor
public class WompiController {

    private final WompiService wompiService;
    private final ObjectMapper objectMapper;

    @PostMapping("/webhook")
    public ResponseEntity<Void> handleWebhook(HttpServletRequest request) {

        String rawBody;
        try {
            rawBody = new BufferedReader(
                new InputStreamReader(request.getInputStream(), StandardCharsets.UTF_8))
                .lines()
                .collect(Collectors.joining("\n"));
        } catch (Exception e) {
            log.error("❌ Error leyendo body del webhook Wompi", e);
            return ResponseEntity.badRequest().build();
        }

        String signature = request.getHeader("x-event-checksum");
        log.info("📨 Webhook Wompi recibido | signature={} | body_length={}", signature, rawBody.length());

        if (signature == null || signature.isBlank()) {
            log.warn("⛔ Webhook Wompi rechazado: header x-event-checksum ausente");
            return ResponseEntity.status(401).build();
        }

        JsonNode event;
        try {
            event = objectMapper.readTree(rawBody);
        } catch (Exception e) {
            log.error("❌ Error parseando JSON del webhook Wompi", e);
            return ResponseEntity.badRequest().build();
        }

        String eventType = event.path("event").asText();
        log.info("📨 Webhook Wompi event={}", eventType);

        if (!wompiService.isValidWebhookSignature(event, signature)) {
            log.warn("⛔ Webhook Wompi rechazado: firma inválida. signature={}", signature);
            return ResponseEntity.status(401).build();
        }

        try {
            wompiService.processWebhookEvent(event);
        } catch (Exception e) {
            log.error("❌ Error procesando webhook Wompi: event={}", eventType, e);
            return ResponseEntity.internalServerError().build();
        }

        return ResponseEntity.ok().build();
    }
}
