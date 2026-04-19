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
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/wompi")
@RequiredArgsConstructor
public class WompiController {

    private final WompiService wompiService;
    private final ObjectMapper objectMapper;

    @Value("${wompi.public.key}")
    private String wompiPublicKey;

    // ══════════════════════════════════════════════════════════════
    //  CREAR TRANSACCIÓN — El frontend llama aquí para obtener la
    //  URL del widget de pago de Wompi (Bancolombia).
    //
    //  Flujo:
    //    1. Frontend POST /api/wompi/transaction con { amount, email,
    //       name, phone, orderId, redirectUrl }
    //    2. Backend construye la URL del widget con los parámetros
    //       firmados y la devuelve como { checkoutUrl }
    //    3. Frontend redirige al usuario a checkoutUrl
    //    4. Wompi notifica el resultado via POST /api/wompi/webhook
    //
    //  Notas:
    //    - amount debe llegar en COP (pesos). Se multiplica x100
    //      internamente porque Wompi trabaja en centavos.
    //    - WOMPI_PUBLIC_KEY debe estar configurada en Render →
    //      Environment Variables (ej: pub_prod_XXXX o pub_test_XXXX)
    // ══════════════════════════════════════════════════════════════
    @PostMapping("/transaction")
    public ResponseEntity<Map<String, Object>> createTransaction(
            @RequestBody Map<String, Object> body) {

        try {
            // ── Extraer parámetros del body ──────────────────────
            String email       = getString(body, "email", "cliente@luxshop.com");
            String name        = getString(body, "name",  "Cliente");
            String phone       = getString(body, "phone", "");
            String orderId     = getString(body, "orderId", String.valueOf(System.currentTimeMillis()));
            String redirectUrl = getString(body, "redirectUrl", "");

            // amount viene en COP desde el frontend → convertir a centavos
            long amountCop    = Long.parseLong(body.get("amount").toString());
            long amountCents  = amountCop * 100L;

            log.info("🏦 Creando transacción Wompi | ref={} | amount={} COP ({} centavos) | email={}",
                    orderId, amountCop, amountCents, email);

            // ── Construir URL del widget Wompi ───────────────────
            // Documentación: https://docs.wompi.co/docs/colombia/widget-checkout
            StringBuilder url = new StringBuilder("https://checkout.wompi.io/p/");
            url.append("?public-key=").append(encode(wompiPublicKey));
            url.append("&currency=COP");
            url.append("&amount-in-cents=").append(amountCents);
            url.append("&reference=").append(encode(orderId));

            if (!redirectUrl.isBlank()) {
                url.append("&redirect-url=").append(encode(redirectUrl));
            }
            if (!email.isBlank()) {
                url.append("&customer-data:email=").append(encode(email));
            }
            if (!name.isBlank()) {
                String[] parts = name.trim().split("\\s+", 2);
                url.append("&customer-data:full-name=").append(encode(name));
                if (parts.length >= 1) url.append("&customer-data:legal-id=").append(encode("000000000"));
                url.append("&customer-data:legal-id-type=CC");
            }
            if (!phone.isBlank()) {
                String cleanPhone = phone.replaceAll("\\D", "");
                if (cleanPhone.startsWith("57") && cleanPhone.length() == 12) {
                    cleanPhone = cleanPhone.substring(2);
                }
                url.append("&customer-data:phone-number=").append(encode(cleanPhone));
            }

            String checkoutUrl = url.toString();
            log.info("✅ URL Wompi generada | ref={} | url={}", orderId, checkoutUrl);

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
            // Se devuelve 200 para que el frontend pueda leer el campo "error"
            // sin que Axios lo trate como excepción de red
            return ResponseEntity.ok(error);
        }
    }

    // ══════════════════════════════════════════════════════════════
    //  CONSULTAR ESTADO de una transacción por su ID de Wompi.
    //  Usado por el frontend cuando vuelve de la redirección y
    //  necesita confirmar si el pago fue aprobado.
    //
    //  GET /api/wompi/status/{transactionId}
    //
    //  Wompi API pública — no requiere clave privada para consulta
    //  básica de estado de una transacción individual.
    // ══════════════════════════════════════════════════════════════
    @GetMapping("/status/{transactionId}")
    public ResponseEntity<Map<String, Object>> getTransactionStatus(
            @PathVariable String transactionId) {

        log.info("🔍 Consultando estado Wompi | transactionId={}", transactionId);

        try {
            // Consultar la API pública de Wompi
            java.net.URL apiUrl = new java.net.URL(
                    "https://production.wompi.co/v1/transactions/" + transactionId);

            java.net.HttpURLConnection conn = (java.net.HttpURLConnection) apiUrl.openConnection();
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
    //  WEBHOOK — Wompi notifica aquí cada cambio de estado.
    //  Requiere que en el panel de Wompi configures:
    //    URL: https://TU-BACKEND.onrender.com/api/wompi/webhook
    //  Y que WOMPI_EVENTS_SECRET esté en Render → Environment Variables
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

        log.info("📨 Webhook recibido | signature={} | size={}", signature, rawBody.length());

        if (signature == null || signature.isBlank()) {
            log.warn("⛔ Firma ausente");
            return ResponseEntity.status(401).build();
        }

        if (!wompiService.isValidWebhookSignature(rawBody, signature)) {
            log.warn("⛔ Firma inválida");
            return ResponseEntity.status(401).build();
        }

        try {
            JsonNode event = objectMapper.readTree(rawBody);
            log.info("📦 Evento recibido: {}", event.path("event").asText());
            wompiService.processWebhookEvent(event);
        } catch (Exception e) {
            log.error("❌ Error procesando evento Wompi", e);
            return ResponseEntity.internalServerError().build();
        }

        return ResponseEntity.ok().build();
    }

    // ── Helpers privados ──────────────────────────────────────────

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

    private String mapWompiStatus(String status) {
        return switch (status) {
            case "APPROVED"  -> "Pago aprobado";
            case "DECLINED"  -> "Pago rechazado";
            case "VOIDED"    -> "Pago anulado";
            case "ERROR"     -> "Error en el pago";
            case "PENDING"   -> "Pago pendiente";
            default          -> "Estado desconocido";
        };
    }
}
