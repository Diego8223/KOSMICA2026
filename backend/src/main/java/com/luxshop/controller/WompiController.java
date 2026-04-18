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

    /**
     * Webhook de Wompi.
     * Wompi envía la firma en el header: x-event-checksum
     * Se debe leer el body como String RAW antes de cualquier deserialización
     * para que la firma sea válida.
     */
    @PostMapping("/webhook")
    public ResponseEntity<Void> handleWebhook(HttpServletRequest request) {

        // 1. Leer body raw (necesario para verificar firma sobre el contenido exacto)
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

        // 2. Leer la firma del header correcto de Wompi
        String signature = request.getHeader("x-event-checksum");

        // Log de diagnóstico (puedes eliminarlo después de confirmar que funciona)
        log.info("📨 Webhook Wompi recibido | signature={} | body_length={}",
                signature, rawBody.length());

        if (signature == null || signature.isBlank()) {
            log.warn("⛔ Webhook Wompi rechazado: header x-event-checksum ausente o vacío");
            // Wompi reintenta si devuelves != 200, retorna 200 para evitar reintentos
            // mientras diagnosticas, pero SOLO en dev. En producción usa 401.
            return ResponseEntity.status(401).build();
        }

        // 3. Parsear el evento
        JsonNode event;
        try {
            event = objectMapper.readTree(rawBody);
        } catch (Exception e) {
            log.error("❌ Error parseando JSON del webhook Wompi", e);
            return ResponseEntity.badRequest().build();
        }

        String eventType = event.path("event").asText();
        log.info("📨 Webhook Wompi recibido: event={}", eventType);

        // 4. Verificar firma
        if (!wompiService.isValidWebhookSignature(event, signature)) {
            log.warn("⛔ Webhook Wompi rechazado: firma inválida. signature={}", signature);
            return ResponseEntity.status(401).build();
        }

        // 5. Procesar el evento
        try {
            wompiService.processWebhookEvent(event);
        } catch (Exception e) {
            log.error("❌ Error procesando webhook Wompi: event={}", eventType, e);
            return ResponseEntity.internalServerError().build();
        }

        return ResponseEntity.ok().build();
    }
}
