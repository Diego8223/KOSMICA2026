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

// ============================================================
//  AIController — Asistente Kosmica con Groq (GRATIS)
//
//  Groq es 100% gratis y ultra-rápido (Llama 3.3 70B)
//  Límites gratis: 6000 tokens/min · 500 req/día
//  Registro en: https://console.groq.com
//  Variable requerida en .env: GROQ_API_KEY=gsk_...
// ============================================================
@Slf4j
@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AIController {

    @Value("${groq.api.key:}")
    private String groqKey;

    // Groq usa la misma interfaz que OpenAI
    private static final String GROQ_URL   = "https://api.groq.com/openai/v1/chat/completions";
    private static final String GROQ_MODEL = "llama-3.3-70b-versatile";  // Gratis, muy inteligente

    private final ObjectMapper mapper = new ObjectMapper();

    @PostMapping("/chat")
    public ResponseEntity<String> chat(@RequestBody String body) {

        if (groqKey == null || groqKey.isBlank()) {
            log.error("Groq API key no configurada. Agrega 'groq.api.key' en application.properties");
            return ResponseEntity.internalServerError()
                .body("{\"error\":\"API key no configurada en el servidor\"}");
        }

        try {
            // ── Leer el cuerpo que envía el frontend ──────────────
            // El frontend envía formato Anthropic:
            // { model, max_tokens, system: "...", messages: [...] }
            // Groq usa formato OpenAI:
            // { model, max_tokens, messages: [{role:"system",...}, ...] }

            JsonNode reqNode = mapper.readTree(body);

            // Extraer el system prompt y los mensajes
            String systemPrompt = reqNode.has("system") ? reqNode.get("system").asText() : "";
            JsonNode originalMessages = reqNode.get("messages");
            int maxTokens = reqNode.has("max_tokens") ? reqNode.get("max_tokens").asInt() : 1000;

            // Construir el array de mensajes en formato OpenAI
            ArrayNode groqMessages = mapper.createArrayNode();

            // Agregar system prompt como primer mensaje
            if (!systemPrompt.isBlank()) {
                ObjectNode sysMsg = mapper.createObjectNode();
                sysMsg.put("role", "system");
                sysMsg.put("content", systemPrompt);
                groqMessages.add(sysMsg);
            }

            // Agregar el historial de mensajes
            if (originalMessages != null) {
                for (JsonNode msg : originalMessages) {
                    ObjectNode m = mapper.createObjectNode();
                    m.put("role", msg.get("role").asText());
                    m.put("content", msg.get("content").asText());
                    groqMessages.add(m);
                }
            }

            // Construir request para Groq
            ObjectNode groqReq = mapper.createObjectNode();
            groqReq.put("model", GROQ_MODEL);
            groqReq.put("max_tokens", maxTokens);
            groqReq.put("temperature", 0.7);
            groqReq.set("messages", groqMessages);

            // ── Llamar a Groq API ──────────────────────────────────
            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(GROQ_URL))
                .header("Authorization", "Bearer " + groqKey)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(groqReq.toString()))
                .build();

            HttpResponse<String> groqResponse = HttpClient.newHttpClient()
                .send(request, HttpResponse.BodyHandlers.ofString());

            log.info("Groq API → HTTP {}", groqResponse.statusCode());

            if (groqResponse.statusCode() != 200) {
                log.error("Error Groq: {}", groqResponse.body());
                return ResponseEntity.status(groqResponse.statusCode())
                    .body("{\"error\":\"Error del servicio AI: " + groqResponse.statusCode() + "\"}");
            }

            // ── Convertir respuesta Groq → formato Anthropic ──────
            // Groq devuelve: { choices: [{ message: { content: "..." } }] }
            // El frontend espera: { content: [{ type: "text", text: "..." }] }
            JsonNode groqData = mapper.readTree(groqResponse.body());
            String aiText = groqData
                .path("choices").get(0)
                .path("message")
                .path("content").asText("Lo siento, no pude procesar tu mensaje.");

            // Construir respuesta en formato que el frontend ya entiende
            ObjectNode anthropicFormat = mapper.createObjectNode();
            ArrayNode contentArray = mapper.createArrayNode();
            ObjectNode textBlock = mapper.createObjectNode();
            textBlock.put("type", "text");
            textBlock.put("text", aiText);
            contentArray.add(textBlock);
            anthropicFormat.set("content", contentArray);

            return ResponseEntity.ok(mapper.writeValueAsString(anthropicFormat));

        } catch (Exception e) {
            log.error("Error llamando a Groq API: {}", e.getMessage());
            return ResponseEntity.internalServerError()
                .body("{\"error\":\"" + e.getMessage() + "\"}");
        }
    }
}
