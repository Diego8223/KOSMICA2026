package com.luxshop.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/shipping")
@RequiredArgsConstructor
public class ShippingController {

    @Value("${envia.api.key:595ac5bf894317bb92ffaf7e3c96bb725ba32df87354fdb3b9d6e637fec10af1}")
    private String enviaKey;

    private static final String ENVIA_URL = "https://api.envia.com";

    // ✅ Cotizar envío — llama a Envia.com desde el backend (evita CORS)
    @PostMapping("/rates")
    public ResponseEntity<String> getRates(@RequestBody String body) {
        try {
            log.info("Cotizando envío con Envia.com...");
            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(ENVIA_URL + "/ship/rate/"))
                .header("Authorization", "Bearer " + enviaKey)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();

            HttpResponse<String> response = HttpClient.newHttpClient()
                .send(request, HttpResponse.BodyHandlers.ofString());

            log.info("Envia.com rates response: {}", response.statusCode());
            return ResponseEntity.status(response.statusCode()).body(response.body());

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
