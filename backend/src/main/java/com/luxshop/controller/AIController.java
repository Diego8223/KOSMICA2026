package com.luxshop.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

@Slf4j
@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AIController {

    // ✅ Agrega en Render → Environment Variables:
    //    ANTHROPIC_API_KEY = sk-ant-api03-xxxxxxxxxxxx
    // Obtén tu clave en: https://console.anthropic.com → API Keys
    @Value("${anthropic.api.key:}")
    private String anthropicKey;

    private static final String ANTHROPIC_URL     = "https://api.anthropic.com/v1/messages";
    private static final String ANTHROPIC_VERSION = "2023-06-01";
    private static final String MODEL             = "claude-haiku-4-5-20251001";

    private final ObjectMapper mapper = new ObjectMapper();

    @PostMapping("/chat")
    public ResponseEntity<String> chat(@RequestBody String body) {

        if (anthropicKey == null || anthropicKey.isBlank()) {
            log.error("Anthropic API key no configurada. Agrega 'ANTHROPIC_API_KEY' en Render.");
            return ResponseEntity.internalServerError()
                    .body("{\"error\":\"ANTHROPIC_API_KEY no configurada en el servidor\"}");
        }

        try {
            JsonNode reqNode = mapper.readTree(body);

            ObjectNode anthropicBody = mapper.createObjectNode();
            anthropicBody.put("model", MODEL);
            anthropicBody.put("max_tokens", 600);

            // System prompt
            if (reqNode.has("system")) {
                anthropicBody.put("system", reqNode.get("system").asText());
            }

            // Mensajes — solo "user" y "assistant"
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

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(ANTHROPIC_URL))
                    .header("x-api-key", anthropicKey)
                    .header("anthropic-version", ANTHROPIC_VERSION)
                    .header("Content-Type", "application/json")
                    .timeout(Duration.ofSeconds(25))
                    .POST(HttpRequest.BodyPublishers.ofString(anthropicBody.toString()))
                    .build();

            HttpResponse<String> response = HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(10))
                    .build()
                    .send(request, HttpResponse.BodyHandlers.ofString());

            log.info("Anthropic API → HTTP {}", response.statusCode());

            if (response.statusCode() != 200) {
                log.error("Anthropic error {}: {}", response.statusCode(), response.body());
                return ResponseEntity.status(response.statusCode())
                        .body("{\"error\":\"Error Anthropic: " + response.statusCode() + "\"}");
            }

            // Anthropic ya devuelve el formato exacto que necesita el frontend
            return ResponseEntity.ok(response.body());

        } catch (Exception e) {
            log.error("Error llamando a Anthropic: {}", e.getMessage());
            return ResponseEntity.internalServerError()
                    .body("{\"error\":\"" + e.getMessage() + "\"}");
        }
    }
}
