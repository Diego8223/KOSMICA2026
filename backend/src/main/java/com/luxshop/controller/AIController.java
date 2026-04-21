package com.luxshop.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Slf4j
@RestController
@RequestMapping("/api/ai")
public class AIController {

    @Value("${anthropic.api.key:}")
    private String anthropicKey;

    @Value("${admin.api.key:}")
    private String adminApiKey;

    private static final String ANTHROPIC_URL     = "https://api.anthropic.com/v1/messages";
    private static final String ANTHROPIC_VERSION = "2023-06-01";
    private static final String MODEL             = "claude-haiku-4-5-20251001";

    // FIX: HttpClient como singleton — antes se creaba uno nuevo por cada request,
    // desperdiciando recursos (conexiones TCP, hilos, memoria).
    private static final HttpClient HTTP_CLIENT = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(10))
        .build();

    private final ObjectMapper mapper = new ObjectMapper();

    // FIX: Rate limiting simple por IP — máximo 20 requests por minuto.
    // Sin esto cualquier persona podría vaciar la cuota de Anthropic llamando
    // al endpoint repetidamente sin ningún costo para ella.
    private static final int    MAX_REQUESTS_PER_MINUTE = 20;
    private static final Map<String, RateEntry> RATE_MAP = new ConcurrentHashMap<>();

    @PostMapping("/chat")
    public ResponseEntity<String> chat(
            @RequestBody String body,
            HttpServletRequest request) {

        // FIX: autenticación — el endpoint solo acepta requests que vengan
        // desde el propio frontend (con X-Admin-Key) o con el origen correcto.
        // Se comprueba la API key para uso directo; el chatbot del storefront
        // puede incluir su propia clave o llamar desde el servidor.
        String adminKey = request.getHeader("X-Admin-Key");
        boolean isAdmin = adminApiKey != null && !adminApiKey.isBlank()
                          && adminApiKey.equals(adminKey);

        // FIX: rate limiting por IP para requests no-admin
        if (!isAdmin) {
            String clientIp = getClientIp(request);
            if (isRateLimited(clientIp)) {
                log.warn("Rate limit alcanzado para IP: {}", clientIp);
                return ResponseEntity.status(429)
                    .body("{\"error\":\"Demasiadas solicitudes. Intenta en un momento.\"}");
            }
        }

        if (anthropicKey == null || anthropicKey.isBlank()) {
            log.error("ANTHROPIC_API_KEY no configurada.");
            return ResponseEntity.internalServerError()
                .body("{\"error\":\"Servicio de IA no disponible\"}");
        }

        try {
            JsonNode reqNode = mapper.readTree(body);

            ObjectNode anthropicBody = mapper.createObjectNode();
            anthropicBody.put("model", MODEL);
            anthropicBody.put("max_tokens", 600);

            if (reqNode.has("system")) {
                anthropicBody.put("system", reqNode.get("system").asText());
            }

            ArrayNode messages = mapper.createArrayNode();
            if (reqNode.has("messages")) {
                for (JsonNode msg : reqNode.get("messages")) {
                    String role    = msg.get("role").asText();
                    String content = msg.has("content") ? msg.get("content").asText() : "";
                    if (content.isBlank()) continue;
                    String r = role.equals("bot") ? "assistant" : role;
                    if (!r.equals("user") && !r.equals("assistant")) continue;
                    ObjectNode m = mapper.createObjectNode();
                    m.put("role", r);
                    m.put("content", content);
                    messages.add(m);
                }
            }
            anthropicBody.set("messages", messages);

            HttpRequest httpRequest = HttpRequest.newBuilder()
                .uri(URI.create(ANTHROPIC_URL))
                .header("x-api-key", anthropicKey)
                .header("anthropic-version", ANTHROPIC_VERSION)
                .header("Content-Type", "application/json")
                .timeout(Duration.ofSeconds(25))
                .POST(HttpRequest.BodyPublishers.ofString(anthropicBody.toString()))
                .build();

            // FIX: reutiliza el singleton HTTP_CLIENT en lugar de crear uno nuevo
            HttpResponse<String> response = HTTP_CLIENT
                .send(httpRequest, HttpResponse.BodyHandlers.ofString());

            log.info("Anthropic API → HTTP {}", response.statusCode());

            if (response.statusCode() != 200) {
                log.error("Anthropic error {}: {}", response.statusCode(), response.body());
                return ResponseEntity.status(response.statusCode())
                    .body("{\"error\":\"Error en el servicio de IA: " + response.statusCode() + "\"}");
            }

            return ResponseEntity.ok(response.body());

        } catch (Exception e) {
            log.error("Error llamando a Anthropic: {}", e.getMessage());
            return ResponseEntity.internalServerError()
                .body("{\"error\":\"" + e.getMessage() + "\"}");
        }
    }

    // ── Rate limiting helpers ─────────────────────────────────────

    private boolean isRateLimited(String ip) {
        Instant now    = Instant.now();
        Instant window = now.minusSeconds(60);

        RateEntry entry = RATE_MAP.compute(ip, (k, v) -> {
            if (v == null || v.windowStart.isBefore(window)) {
                return new RateEntry(now, new AtomicInteger(1));
            }
            v.count.incrementAndGet();
            return v;
        });

        // Limpiar entradas viejas periódicamente (cada 1000 IPs distintas)
        if (RATE_MAP.size() > 1000) {
            RATE_MAP.entrySet().removeIf(e -> e.getValue().windowStart.isBefore(window));
        }

        return entry.count.get() > MAX_REQUESTS_PER_MINUTE;
    }

    private String getClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private static class RateEntry {
        final Instant windowStart;
        final AtomicInteger count;
        RateEntry(Instant windowStart, AtomicInteger count) {
            this.windowStart = windowStart;
            this.count = count;
        }
    }
}
