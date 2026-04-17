package com.luxshop.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;
import java.util.HashMap;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;

/**
 * WompiService — Integración con Wompi (Bancolombia) para Colombia
 *
 * Flujo correcto para checkout multi-método (Widget):
 *   1. Backend obtiene acceptance_token y genera una referencia única
 *   2. Backend construye la URL de checkout.wompi.co con parámetros en query string
 *   3. Frontend redirige al usuario a esa URL
 *   4. Wompi crea la transacción internamente cuando el usuario confirma el pago
 *   5. Wompi notifica el resultado vía webhook POST /api/wompi/webhook
 *
 * NO se hace POST /v1/transactions desde el backend.
 * Eso es para cobros directos (tarjeta tokenizada) y exige payment_method.type.
 *
 * Documentación: https://docs.wompi.co/docs/colombia/widget-de-pago/
 */
@Slf4j
@Service
public class WompiService {

    @Value("${wompi.public.key:}")
    private String publicKey;

    @Value("${wompi.private.key:}")
    private String privateKey;

    // Limpia saltos de línea/espacios que pueden colarse al copiar la key en Render/env
    private String cleanKey(String key) {
        return key == null ? "" : key.strip().replaceAll("[\\r\\n\\t]", "");
    }

    @Value("${wompi.events.secret:}")
    private String eventsSecret;

    @Value("${store.url:https://www.kosmica.com.co}")
    private String storeUrl;

    @Value("${store.name:Kosmica}")
    private String storeName;

    private static final String WOMPI_API = "https://api.wompi.co/v1";
    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final ObjectMapper mapper = new ObjectMapper();

    private boolean isConfigured() {
        String key = cleanKey(publicKey);
        return !key.isBlank() && !key.equals("pub_test_placeholder");
    }

    /**
     * Genera la URL del widget de Wompi para que el usuario complete el pago.
     *
     * El backend solo:
     *   - Obtiene el acceptance_token del merchant (GET /merchants/{publicKey})
     *   - Genera una referencia única
     *   - Construye la URL del widget con los parámetros requeridos
     *
     * Wompi crea la transacción internamente cuando el usuario confirma.
     * El resultado llega por webhook a POST /api/wompi/webhook.
     */
    public Map<String, String> createTransaction(
            BigDecimal amountCOP,
            String customerEmail,
            String customerName,
            String customerPhone,
            String orderId,
            String redirectUrl) throws Exception {

        if (!isConfigured()) {
            throw new RuntimeException(
                "Wompi no está configurado. Agrega WOMPI_PUBLIC_KEY en las variables de entorno.");
        }

        // Wompi maneja centavos (COP * 100)
        long amountInCents = amountCOP.multiply(BigDecimal.valueOf(100)).longValueExact();
        String reference   = "KOSMICA-" + orderId + "-" + System.currentTimeMillis();
        String redirectFinal = (redirectUrl != null && !redirectUrl.isBlank())
            ? redirectUrl : storeUrl + "/?pago=exitoso&metodo=wompi";

        // Obtener acceptance_token vigente — requerido en la URL del widget
        String acceptanceToken = getAcceptanceToken();

        // Construir URL del widget — el usuario elige el método de pago en la pantalla de Wompi
        String paymentUrl = buildWompiWidgetUrl(
            cleanKey(publicKey), amountInCents, reference,
            customerEmail, acceptanceToken, redirectFinal
        );

        Map<String, String> result = new HashMap<>();
        result.put("transactionId", "pending-" + reference);
        result.put("reference",     reference);
        result.put("status",        "PENDING");
        result.put("checkoutUrl",   paymentUrl);
        log.info("Wompi widget URL generada: ref={} amountCents={}", reference, amountInCents);
        return result;
    }

    /** Consulta el estado de una transacción Wompi por su ID */
    public Map<String, String> getTransactionStatus(String transactionId) {
        try {
            HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(WOMPI_API + "/transactions/" + transactionId))
                .header("Authorization", "Bearer " + cleanKey(privateKey))
                .GET().build();

            HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            JsonNode root = mapper.readTree(resp.body());
            String status = root.path("data").path("status").asText("PENDING");

            Map<String, String> result = new HashMap<>();
            result.put("transactionId", transactionId);
            result.put("status",        status);
            result.put("wompiStatus",   status);
            return result;
        } catch (Exception e) {
            log.error("Error consultando transacción Wompi {}: {}", transactionId, e.getMessage());
            return Map.of("transactionId", transactionId, "status", "ERROR", "error", e.getMessage());
        }
    }

    /**
     * Verifica la firma del webhook de Wompi.
     *
     * Wompi construye el checksum así:
     *   SHA256( id + status + amount_in_cents + currency + created_at + events_secret )
     *
     * El hash resultante (hex en minúsculas) debe coincidir con el header X-Wompi-Signature.
     * Si WOMPI_EVENTS_SECRET no está configurado, se omite la verificación (útil en dev).
     */
    @SuppressWarnings("unchecked")
    public boolean verifyWebhookSignature(Map<String, Object> body, String wompiSignature) {
        try {
            if (eventsSecret == null || eventsSecret.isBlank()) {
                log.warn("⚠️  WOMPI_EVENTS_SECRET no configurado. Verificación de firma omitida.");
                return true;
            }

            Map<String, Object> data = (Map<String, Object>) body.get("data");
            if (data == null) return false;
            Map<String, Object> tx = (Map<String, Object>) data.get("transaction");
            if (tx == null) return false;

            String id          = String.valueOf(tx.getOrDefault("id",             ""));
            String status      = String.valueOf(tx.getOrDefault("status",         ""));
            String amountCents = String.valueOf(tx.getOrDefault("amount_in_cents",""));
            String currency    = String.valueOf(tx.getOrDefault("currency",       ""));
            String createdAt   = String.valueOf(tx.getOrDefault("created_at",     ""));

            String concatenated = id + status + amountCents + currency + createdAt + eventsSecret;

            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(concatenated.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hashBytes) sb.append(String.format("%02x", b));
            String computed = sb.toString();

            boolean valid = computed.equalsIgnoreCase(wompiSignature);
            if (!valid) log.warn("Firma Wompi inválida. computed={} received={}", computed, wompiSignature);
            return valid;

        } catch (Exception e) {
            log.error("Error verificando firma Wompi: {}", e.getMessage());
            return false;
        }
    }

    // ── Helpers ───────────────────────────────────────────────

    /**
     * Obtiene el acceptance_token vigente del merchant (llamada pública, sin auth).
     * Este token es requerido en la URL del widget y expira periódicamente.
     */
    private String getAcceptanceToken() throws Exception {
        HttpRequest req = HttpRequest.newBuilder()
            .uri(URI.create(WOMPI_API + "/merchants/" + cleanKey(publicKey)))
            .GET().build();
        HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
        JsonNode root = mapper.readTree(resp.body());
        String token = root.path("data").path("presigned_acceptance").path("acceptance_token").asText("");
        if (token.isBlank()) {
            log.error("No se pudo obtener acceptance_token. Respuesta Wompi: {}", resp.body());
            throw new RuntimeException("No se pudo obtener acceptance_token de Wompi");
        }
        return token;
    }

    /**
     * Construye la URL del widget de Wompi.
     * El usuario elige el método de pago (Tarjeta, Nequi, PSE, Bancolombia,
     * Efecty, Daviplata) directamente en la interfaz de Wompi.
     */
    private String buildWompiWidgetUrl(String pubKey, long amountCents, String reference,
                                        String email, String acceptanceToken, String redirectUrl) {
        StringBuilder url = new StringBuilder("https://checkout.wompi.co/p/?");
        url.append("public-key=").append(pubKey);
        url.append("&currency=COP");
        url.append("&amount-in-cents=").append(amountCents);
        url.append("&reference=").append(reference);
        if (email != null && !email.isBlank()) {
            url.append("&customer-email=").append(
                java.net.URLEncoder.encode(email, StandardCharsets.UTF_8));
        }
        url.append("&acceptance-token=").append(acceptanceToken);
        url.append("&redirect-url=").append(
            java.net.URLEncoder.encode(redirectUrl, StandardCharsets.UTF_8));
        return url.toString();
    }

    private String extractWompiError(String body) {
        try {
            JsonNode root = mapper.readTree(body);
            JsonNode errors = root.path("error");
            if (!errors.isMissingNode()) return errors.path("reason").asText(body);
            return body.length() > 200 ? body.substring(0, 200) : body;
        } catch (Exception e) { return body; }
    }
}
