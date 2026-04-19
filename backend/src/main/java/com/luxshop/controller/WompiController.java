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
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
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

    // ✅ FIX: Se agrega la llave de integridad — obligatoria en producción
    @Value("${wompi.integrity.secret:integrity_placeholder}")
    private String wompiIntegritySecret;

    // ══════════════════════════════════════════════════════════════
    //  POST /api/wompi/transaction
    //  Genera la URL del checkout de Wompi con firma de integridad
    // ══════════════════════════════════════════════════════════════
    @PostMapping("/transaction")
    public ResponseEntity<Map<String, Object>> createTransaction(
            @RequestBody Map<String, Object> body) {

        try {
            String email       = getString(body, "email",       "cliente@kosmica.com");
            String name        = getString(body, "name",        "Cliente");
            String phone       = getString(body, "phone",       "");
            String orderId     = getString(body, "orderId",     String.valueOf(System.currentTimeMillis()));
            String redirectUrl = getString(body, "redirectUrl", "");

            long amountCop   = Long.parseLong(body.get("amount").toString());
            long amountCents = amountCop * 100L;

            log.info("🏦 Creando transacción Wompi | ref={} | amount={} COP | email={}",
                    orderId, amountCop, email);

            // ✅ FIX: Calcular firma de integridad (OBLIGATORIA en producción)
            // Fórmula: SHA256(reference + amountInCents + currency + integritySecret)
            String toHash   = orderId + amountCents + "COP" + wompiIntegritySecret;
            String integrity = sha256Hex(toHash);

            log.info("🔑 Firma de integridad calculada | ref={} | hash={}", orderId, integrity);

            StringBuilder url = new StringBuilder("https://checkout.wompi.io/p/");
            url.append("?public-key=").append(encode(wompiPublicKey));
            url.append("&currency=COP");
            url.append("&amount-in-cents=").append(amountCents);
            url.append("&reference=").append(encode(orderId));

            // ✅ FIX: Agregar la firma de integridad a la URL
            url.append("&signature:integrity=").append(integrity);

            if (!redirectUrl.isBlank()) {
                url.append("&redirect-url=").append(encode(redirectUrl));
            }
            if (!email.isBlank()) {
                url.append("&customer-data:email=").append(encode(email));
            }
            if (!name.isBlank()) {
                url.append("&customer-data:full-name=").append(encode(name));
                url.append("&customer-data:legal-id=").append(encode("000000000"));
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
            log.info("✅ URL Wompi generada con firma | ref={}", orderId);

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

    // ══════════════════════════════════════════════════════════════
    //  GET /api/wompi/status/{transactionId}
    // ══════════════════════════════════════════════════════════════
    @GetMapping("/status/{transactionId}")
    public ResponseEntity<Map<String, Object>> getTransactionStatus(
            @PathVariable String transactionId) {

        log.info("🔍 Consultando estado Wompi | transactionId={}", transactionId);

        try {
            java.net.URL apiUrl = new java.net.URL(
                    "https://production.wompi.co/v1/transactions/" + transactionId);

            java.net.HttpURLConnection conn =
                    (java.net.HttpURLConnection) apiUrl.openConnection();
            conn.setRequestMethod("GET");
            conn.setRequestProperty("Authorization", "Bearer " + wompiPublicKey);
            conn.setConnectTimeout(8000);
            conn.setReadTimeout(8000);

            int httpStatus = conn.getResponseCode();

            java.io.InputStream stream = (httpStatus >= 200 && httpStatus < 300)
                    ? conn.getInputStream()
                    : conn.getErrorStream();

            String responseBody = new BufferedReader(
                    new InputStreamReader(stream, StandardCharsets.UTF_8))
                    .lines().collect(Collectors.joining("\n"));

            conn.disconnect();

            JsonNode root   = objectMapper.readTree(responseBody);
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

    // ══════════════════════════════════════════════════════════════
    //  POST /api/wompi/webhook
    // ══════════════════════════════════════════════════════════════
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
            log.warn("⛔ Webhook Wompi rechazado: firma inválida. signature={}", signature);
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

    // ── Helpers ───────────────────────────────────────────────────

    private String getString(Map<String, Object> map, String key, String defaultValue) {
        Object val = map.get(key);
        if (val == null) return defaultValue;
        String s = val.toString().trim();
        return s.isBlank() ? defaultValue : s;
    }

    private String encode(String value) {
        try {
            return URLEncoder.encode(value, StandardCharsets.UTF_8);
        } catch (Exception e) {
            return value;
        }
    }

    // ✅ FIX: Método SHA-256 para calcular la firma de integridad
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
