package com.luxshop.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.luxshop.service.WompiService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/wompi")
@RequiredArgsConstructor
public class WompiController {

    private final WompiService wompiService;
    private final ObjectMapper objectMapper;

    @Value("${wompi.public.key:pub_test_placeholder}")
    private String wompiPublicKey;

    @Value("${wompi.private.key:prv_test_placeholder}")
    private String wompiPrivateKey;

    @Value("${wompi.integrity.secret:integrity_placeholder}")
    private String wompiIntegritySecret;

    // FIX: HttpClient como singleton.
    // Antes se usaba HttpURLConnection (API de Java 1.1, verbose y sin pool de conexiones).
    // Ahora usamos java.net.http.HttpClient (Java 11+) como singleton, que:
    //   - Reutiliza conexiones HTTP/2 automáticamente
    //   - Tiene API más limpia y menos propensa a errores
    //   - No requiere conn.disconnect() manual
    private static final HttpClient HTTP_CLIENT = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(8))
        .build();

    @PostMapping("/transaction")
    public ResponseEntity<Map<String, Object>> createTransaction(
            @RequestBody Map<String, Object> body) {

        try {
            String email       = getString(body, "email",       "cliente@kosmica.com");
            String name        = getString(body, "name",        "Cliente");
            String phone       = getString(body, "phone",       "");
            String orderId     = getString(body, "orderId",     String.valueOf(System.currentTimeMillis()));
            String redirectUrl = getString(body, "redirectUrl", "");
            // FIX: document del cliente para Wompi (reemplaza el "000000000" hardcodeado)
            String document    = getString(body, "document",    "");

            long amountCop   = Long.parseLong(body.get("amount").toString());
            long amountCents = amountCop * 100L;

            log.info("🏦 Creando transacción Wompi | ref={} | amount={} COP | email={}",
                orderId, amountCop, email);

            String integrity = sha256Hex(orderId + amountCents + "COP" + wompiIntegritySecret.trim());

            StringBuilder url = new StringBuilder("https://checkout.wompi.co/p/");
            url.append("?public-key=").append(encode(wompiPublicKey));
            url.append("&currency=COP");
            url.append("&amount-in-cents=").append(amountCents);
            url.append("&reference=").append(encode(orderId));
            url.append("&signature:integrity=").append(integrity);

            if (!redirectUrl.isBlank()) {
                url.append("&redirect-url=").append(encode(redirectUrl));
            }
            if (!email.isBlank()) {
                url.append("&customer-data:email=").append(encode(email));
            }
            if (!name.isBlank()) {
                url.append("&customer-data:full-name=").append(encode(name));
                // FIX: antes hardcodeaba "000000000" siempre.
                // Ahora usa el documento real del cliente si viene en el body.
                String legalId = !document.isBlank()
                    ? document.replaceAll("\\D", "") : "000000000";
                url.append("&customer-data:legal-id=").append(encode(legalId));
                url.append("&customer-data:legal-id-type=CC");
            }
            if (!phone.isBlank()) {
                String cleanPhone = phone.replaceAll("\\D", "");
                if (cleanPhone.startsWith("57") && cleanPhone.length() == 12) {
                    cleanPhone = cleanPhone.substring(2);
                }
                if (cleanPhone.length() == 10) {
                    url.append("&customer-data:phone-number=").append(encode(cleanPhone));
                }
            }

            String checkoutUrl = url.toString();
            log.info("✅ URL Wompi generada | ref={}", orderId);

            Map<String, Object> response = new HashMap<>();
            response.put("checkoutUrl", checkoutUrl);
            response.put("reference",   orderId);
            response.put("amountCents", amountCents);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("❌ Error creando transacción Wompi: {}", e.getMessage());
            Map<String, Object> error = new HashMap<>();
            error.put("error",  e.getMessage());
            error.put("status", "error");
            return ResponseEntity.ok(error);
        }
    }

    @GetMapping("/status/{transactionId}")
    public ResponseEntity<Map<String, Object>> getTransactionStatus(
            @PathVariable String transactionId) {

        log.info("🔍 Consultando estado Wompi | transactionId={}", transactionId);

        try {
            // FIX: reemplaza HttpURLConnection manual por HttpClient moderno.
            // Antes: ~15 líneas de código con conn.setRequestMethod, getInputStream,
            //        manejo manual de streams y conn.disconnect().
            // Ahora: 5 líneas con la API fluida de HttpClient.
            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://production.wompi.co/v1/transactions/" + transactionId))
                .header("Authorization", "Bearer " + wompiPrivateKey)
                .timeout(Duration.ofSeconds(8))
                .GET()
                .build();

            HttpResponse<String> httpResponse = HTTP_CLIENT
                .send(request, HttpResponse.BodyHandlers.ofString());

            JsonNode root   = objectMapper.readTree(httpResponse.body());
            JsonNode txData = root.path("data");

            String status    = txData.path("status").asText("UNKNOWN");
            String reference = txData.path("reference").asText("");

            log.info("💳 Estado Wompi | id={} | ref={} | status={}", transactionId, reference, status);

            Map<String, Object> result = new HashMap<>();
            result.put("transactionId", transactionId);
            result.put("status",        status);
            result.put("reference",     reference);
            result.put("statusText",    mapWompiStatus(status));
            return ResponseEntity.ok(result);

        } catch (Exception e) {
            log.error("❌ Error consultando estado Wompi para {}: {}", transactionId, e.getMessage());
            Map<String, Object> error = new HashMap<>();
            error.put("transactionId", transactionId);
            error.put("status",        "ERROR");
            error.put("error",         e.getMessage());
            return ResponseEntity.ok(error);
        }
    }

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
        if (signature == null) {
            signature = request.getHeader("X-Event-Checksum");
        }

        log.info("📨 Webhook Wompi recibido | signature={} | size={}", signature, rawBody.length());

        if (!wompiService.isValidWebhookSignature(rawBody, signature)) {
            log.warn("⛔ Webhook Wompi rechazado: firma inválida.");
            return ResponseEntity.status(401).build();
        }

        try {
            JsonNode event = objectMapper.readTree(rawBody);
            log.info("📦 Evento Wompi: {}", event.path("event").asText());
            wompiService.processWebhookEvent(event);
        } catch (Exception e) {
            log.error("❌ Error procesando evento Wompi", e);
            return ResponseEntity.internalServerError().build();
        }

        return ResponseEntity.ok().build();
    }

    private String getString(Map<String, Object> map, String key, String defaultValue) {
        Object val = map.get(key);
        if (val == null) return defaultValue;
        String s = val.toString().trim();
        return s.isBlank() ? defaultValue : s;
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private String sha256Hex(String input) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
        return HexFormat.of().formatHex(hash);
    }

    private String mapWompiStatus(String status) {
        return switch (status) {
            case "APPROVED" -> "Pago aprobado";
            case "DECLINED" -> "Pago rechazado";
            case "VOIDED"   -> "Pago anulado";
            case "ERROR"    -> "Error en el pago";
            case "PENDING"  -> "Pago pendiente";
            default         -> "Estado desconocido";
        };
    }
}
