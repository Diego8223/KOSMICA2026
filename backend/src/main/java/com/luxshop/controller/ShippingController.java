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
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;

@Slf4j
@RestController
@RequestMapping("/api/shipping")
@RequiredArgsConstructor
public class ShippingController {

    @Value("${envia.api.key:595ac5bf894317bb92ffaf7e3c96bb725ba32df87354fdb3b9d6e637fec10af1}")
    private String enviaKey;

    private static final String ENVIA_URL = "https://api.envia.com";

    // Transportadoras activas en Colombia en Envia.com
    // IMPORTANTE: Deben estar activadas en tu cuenta de Envia.com
    // (Settings → Print Options & Carriers → Colombia)
    private static final List<String> CO_CARRIERS = List.of(
        "coordinadora",
        "interrapidisimo",
        "tcc",
        "servientrega",
        "deprisa"
    );

    private final ObjectMapper mapper = new ObjectMapper();

    // ✅ Cotizar envío con TODAS las transportadoras de Colombia en paralelo
    // La API de Envia.com requiere UNA petición POR transportadora.
    // Este endpoint hace el fan-out internamente y devuelve los resultados combinados.
    @PostMapping("/rates")
    public ResponseEntity<String> getRates(@RequestBody String body) {
        try {
            log.info("Cotizando envío con {} transportadoras en paralelo...", CO_CARRIERS.size());

            JsonNode baseBody = mapper.readTree(body);

            // Quitar el campo shipment del body recibido (si viene) y preparar la base
            ObjectNode baseObj = (ObjectNode) baseBody;
            baseObj.remove("shipment");

            ExecutorService executor = Executors.newFixedThreadPool(CO_CARRIERS.size());
            List<Future<List<JsonNode>>> futures = new ArrayList<>();

            for (String carrier : CO_CARRIERS) {
                final String carrierName = carrier;
                futures.add(executor.submit(() -> {
                    try {
                        // Construir el body con el carrier específico
                        ObjectNode requestBody = baseObj.deepCopy();
                        ObjectNode shipment = mapper.createObjectNode();
                        shipment.put("carrier", carrierName);
                        shipment.put("type", 1);
                        requestBody.set("shipment", shipment);

                        HttpRequest request = HttpRequest.newBuilder()
                            .uri(URI.create(ENVIA_URL + "/ship/rate/"))
                            .header("Authorization", "Bearer " + enviaKey)
                            .header("Content-Type", "application/json")
                            .POST(HttpRequest.BodyPublishers.ofString(requestBody.toString()))
                            .build();

                        HttpResponse<String> response = HttpClient.newHttpClient()
                            .send(request, HttpResponse.BodyHandlers.ofString());

                        log.info("Envia.com [{}] → HTTP {}", carrierName, response.statusCode());

                        JsonNode resp = mapper.readTree(response.body());
                        List<JsonNode> rates = new ArrayList<>();

                        // Extraer array "data" si existe y tiene elementos
                        if (resp.has("data") && resp.get("data").isArray()) {
                            resp.get("data").forEach(rates::add);
                        }
                        return rates;

                    } catch (Exception e) {
                        log.warn("Error cotizando con {}: {}", carrierName, e.getMessage());
                        return new ArrayList<>();
                    }
                }));
            }

            executor.shutdown();

            // Recoger todos los resultados
            ArrayNode allRates = mapper.createArrayNode();
            for (Future<List<JsonNode>> future : futures) {
                try {
                    future.get(15, TimeUnit.SECONDS).forEach(allRates::add);
                } catch (TimeoutException e) {
                    log.warn("Timeout esperando respuesta de una transportadora");
                } catch (Exception e) {
                    log.warn("Error recogiendo resultado: {}", e.getMessage());
                }
            }

            if (allRates.isEmpty()) {
                // Devolver mensaje claro si ninguna transportadora respondió con tarifas
                ObjectNode errorResp = mapper.createObjectNode();
                errorResp.put("meta", "error");
                ObjectNode errorDetail = mapper.createObjectNode();
                errorDetail.put("code", 404);
                errorDetail.put("description", "No rates found");
                errorDetail.put("message",
                    "Ninguna transportadora devolvió tarifas. " +
                    "Verifica que las transportadoras estén activadas en tu cuenta de Envia.com " +
                    "(Settings → Print Options & Carriers → Colombia).");
                errorResp.set("error", errorDetail);
                return ResponseEntity.ok(errorResp.toString());
            }

            // Respuesta exitosa con todos los rates combinados
            ObjectNode result = mapper.createObjectNode();
            result.put("meta", "ok");
            result.set("data", allRates);
            log.info("Total tarifas obtenidas: {}", allRates.size());
            return ResponseEntity.ok(result.toString());

        } catch (Exception e) {
            log.error("Error cotizando envío: {}", e.getMessage());
            return ResponseEntity.internalServerError()
                .body("{\"error\":\"" + e.getMessage() + "\"}");
        }
    }

    // ✅ Generar guía — llama a Envia.com desde el backend
    @PostMapping("/generate")
    public ResponseEntity<String> generateGuide(@RequestBody String body) {
        try {
            log.info("Generando guía con Envia.com...");
            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(ENVIA_URL + "/ship/generate/"))
                .header("Authorization", "Bearer " + enviaKey)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();

            HttpResponse<String> response = HttpClient.newHttpClient()
                .send(request, HttpResponse.BodyHandlers.ofString());

            log.info("Envia.com generate response: {}", response.statusCode());
            return ResponseEntity.status(response.statusCode()).body(response.body());

        } catch (Exception e) {
            log.error("Error generando guía: {}", e.getMessage());
            return ResponseEntity.internalServerError()
                .body("{\"error\":\"" + e.getMessage() + "\"}");
        }
    }
}
