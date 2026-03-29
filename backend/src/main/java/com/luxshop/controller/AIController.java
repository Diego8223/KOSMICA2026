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

    // ✅ Agrega en Render → Environment:
    //    GROQ_API_KEY = gsk_xxxxxxxxxxxxxxxxxxxx
    // Obtén tu clave GRATIS en: https://console.groq.com
    @Value("${groq.api.key:}")
    private String groqKey;

    private static final String GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
    private static final String MODEL    = "llama-3.3-70b-versatile"; // Modelo gratis y potente

    private final ObjectMapper mapper = new ObjectMapper();

    @PostMapping("/chat")
    public ResponseEntity<String> chat(@RequestBody String body) {

        if (groqKey == null || groqKey.isBlank()) {
            log.error("Groq API key no configurada. Agrega 'GROQ_API_KEY' en variables de entorno de Render.");
            return ResponseEntity.internalServerError()
                    .body("{\"error\":\"API key no configurada en el servidor\"}");
        }

        try {
            // Leer el body que envía el frontend (formato Anthropic)
            JsonNode reqNode = mapper.readTree(body);

            // Construir mensajes en formato OpenAI / Groq
            ArrayNode messages = mapper.createArrayNode();

            // El system prompt viene como campo "system" en el formato Anthropic
            if (reqNode.has("system")) {
                ObjectNode systemMsg = mapper.createObjectNode();
                systemMsg.put("role", "system");
                systemMsg.put("content", reqNode.get("system").asText());
                messages.add(systemMsg);
            }

            // Los mensajes del historial de conversación
            if (reqNode.has("messages")) {
                for (JsonNode msg : reqNode.get("messages")) {
                    ObjectNode m = mapper.createObjectNode();
                    String role = msg.get("role").asText();
                    // Normalizar "bot" → "assistant" por si acaso
                    m.put("role", role.equals("bot") ? "assistant" : role);
                    m.put("content", msg.get("content").asText());
                    messages.add(m);
                }
            }

            // Construir el request body para Groq (formato OpenAI)
            ObjectNode groqBody = mapper.createObjectNode();
            groqBody.put("model", MODEL);
            groqBody.set("messages", messages);
            groqBody.put("max_tokens", 1000);
            groqBody.put("temperature", 0.7);

            // Llamar a la API de Groq
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(GROQ_URL))
                    .header("Authorization", "Bearer " + groqKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(groqBody.toString()))
                    .build();

            HttpResponse<String> groqResponse = HttpClient.newHttpClient()
                    .send(request, HttpResponse.BodyHandlers.ofString());

            log.info("Groq API → HTTP {}", groqResponse.statusCode());

            if (groqResponse.statusCode() != 200) {
                log.error("Groq error: {}", groqResponse.body());
                return ResponseEntity.status(groqResponse.statusCode())
                        .body("{\"error\":\"Error de Groq: " + groqResponse.statusCode() + "\"}");
            }

            // Extraer el texto de la respuesta Groq
            JsonNode groqJson  = mapper.readTree(groqResponse.body());
            String textContent = groqJson
                    .path("choices").path(0)
                    .path("message").path("content").asText("");

            // Convertir al formato Anthropic que espera el frontend (no hay que tocar AIChatBot.jsx)
            ObjectNode anthropicFormat = mapper.createObjectNode();
            ArrayNode  contentArray    = mapper.createArrayNode();
            ObjectNode textBlock       = mapper.createObjectNode();
            textBlock.put("type", "text");
            textBlock.put("text", textContent);
            contentArray.add(textBlock);
            anthropicFormat.set("content", contentArray);

            return ResponseEntity.ok(anthropicFormat.toString());

        } catch (Exception e) {
            log.error("Error llamando a Groq API: {}", e.getMessage());
            return ResponseEntity.internalServerError()
                    .body("{\"error\":\"" + e.getMessage() + "\"}");
        }
    }
}
