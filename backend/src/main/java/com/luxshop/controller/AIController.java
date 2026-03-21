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

@Slf4j
@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AIController {

    // ✅ Agrega en application.properties:
    // anthropic.api.key=sk-ant-TU_CLAVE_AQUI
    @Value("${anthropic.api.key:}")
    private String anthropicKey;

    private static final String ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
    private static final String MODEL = "claude-sonnet-4-20250514";

    private final ObjectMapper mapper = new ObjectMapper();

    @PostMapping("/chat")
    public ResponseEntity<String> chat(@RequestBody String body) {
        if (anthropicKey == null || anthropicKey.isBlank()) {
            log.error("Anthropic API key no configurada. Agrega 'anthropic.api.key' en application.properties");
            return ResponseEntity.internalServerError()
                .body("{\"error\":\"API key no configurada en el servidor\"}");
        }

        try {
            // Reemplazar el modelo por si el frontend envía uno distinto
            JsonNode reqNode = mapper.readTree(body);
            ObjectNode req = (ObjectNode) reqNode;
            req.put("model", MODEL);

            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(ANTHROPIC_URL))
                .header("x-api-key", anthropicKey)
                .header("anthropic-version", "2023-06-01")
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(req.toString()))
                .build();

            HttpResponse<String> response = HttpClient.newHttpClient()
                .send(request, HttpResponse.BodyHandlers.ofString());

            log.info("Anthropic API → HTTP {}", response.statusCode());
            return ResponseEntity.status(response.statusCode()).body(response.body());

        } catch (Exception e) {
            log.error("Error llamando a Anthropic API: {}", e.getMessage());
            return ResponseEntity.internalServerError()
                .body("{\"error\":\"" + e.getMessage() + "\"}");
        }
    }
}
