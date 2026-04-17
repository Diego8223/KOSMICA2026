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
 * Wompi usa la API REST directa (sin SDK Java oficial).
 * Flujo: crear transacción → redirigir a widget Wompi → recibir webhook con resultado.
 *
 * Documentación: https://docs.wompi.co/docs/colombia/
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
        String key = cleanKey(privateKey);
        return !key.isBlank() && !key.equals("prv_test_placeholder");
    }

    /**
     * Crea una transacción en Wompi y retorna la URL del widget de pago.
     * El cliente es redirigido a esa URL para completar el pago con:
     * - Tarjeta crédito/débito (Visa, Mastercard, Amex, Diners)
     * - Nequi (push notification)
     * - PSE (débito bancario)
     * - Bancolombia (botón de pago)
     * - Efectivo (Efecty, baloto)
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
                "Wompi no está configurado. Agrega WOMPI_PUBLIC_KEY y WOMPI_PRIVATE_KEY en las variables de entorno.");
        }

        // Wompi maneja centavos (COP * 100)
        long amountInCents = amountCOP.multiply(BigDecimal.valueOf(100)).longValueExact();
        String reference   = "KOSMICA-" + orderId + "-" + System.currentTimeMillis();
        String redirectFinal = (redirectUrl != null && !redirectUrl.isBlank())
            ? redirectUrl : storeUrl + "/?pago=exitoso&metodo=wompi";

        // Obtener token de aceptación vigente
        String acceptanceToken = getAcceptanceToken();

        String bodyJson = mapper.writeValueAsString(Map.of(
            "amount_in_cents",   amountInCents,
            "currency",          "COP",
            "customer_email",    customerEmail != null ? customerEmail : "cliente@kosmica.com.co",
            "payment_method",    Map.of("installments", 1),
            "reference",         reference,
            "acceptance_token",  acceptanceToken,
            "redirect_url",      redirectFinal,
            "customer_data",     Map.of(
                "full_name",          customerName != null ? customerName : "Cliente",
                "phone_number",       customerPhone != null ? customerPhone.replaceAll("[^0-9]","") : "3000000000",
                "phone_number_prefix","+57"
            )
        ));

        HttpRequest req = HttpRequest.newBuilder()
            .uri(URI.create(WOMPI_API + "/transactions"))
            .header("Authorization", "Bearer " + cleanKey(privateKey))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(bodyJson))
            .build();

        HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
        log.info("Wompi createTransaction status={}", resp.statusCode());

        if (resp.statusCode() != 200 && resp.statusCode() != 201) {
            log.error("Wompi error: {}", resp.body());
            throw new RuntimeException("Error Wompi [" + resp.statusCode() + "]: " + extractWompiError(resp.body()));
        }

        JsonNode root = mapper.readTree(resp.body());
        String transactionId = root.path("data").path("id").asText();
        String status        = root.path("data").path("status").asText("PENDING");

        // URL del widget de pago Wompi
        String paymentUrl = buildWompiWidgetUrl(publicKey, amountInCents, reference, customerEmail, acceptanceToken, redirectFinal);

        Map<String, String> result = new HashMap<>();
        result.put("transactionId", transactionId);
        result.put("reference",     reference);
        result.put("status",        status);
        result.put("checkoutUrl",   paymentUrl);
        log.info("Wompi transacción creada: id={} ref={} status={}", transactionId, reference, status);
        return result;
    }

    /** Consulta el estado de una transacción Wompi */
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
     *
     * Si WOMPI_EVENTS_SECRET no está configurado en el entorno, se omite la verificación
     * (útil en desarrollo) pero se registra una advertencia.
     *
     * @param body            Mapa con el body completo del webhook (ya deserializado)
     * @param wompiSignature  Valor del header X-Wompi-Signature enviado por Wompi
     */
    @SuppressWarnings("unchecked")
    public boolean verifyWebhookSignature(Map<String, Object> body, String wompiSignature) {
        try {
            if (eventsSecret == null || eventsSecret.isBlank()) {
                log.warn("⚠️  WOMPI_EVENTS_SECRET no configurado. Verificación de firma omitida.");
                return true;
            }

            // Extraer campos de la transacción
            Map<String, Object> data = (Map<String, Object>) body.get("data");
            if (data == null) return false;
            Map<String, Object> tx = (Map<String, Object>) data.get("transaction");
            if (tx == null) return false;

            String id            = String.valueOf(tx.getOrDefault("id",             ""));
            String status        = String.valueOf(tx.getOrDefault("status",         ""));
            String amountCents   = String.valueOf(tx.getOrDefault("amount_in_cents",""));
            String currency      = String.valueOf(tx.getOrDefault("currency",       ""));
            String createdAt     = String.valueOf(tx.getOrDefault("created_at",     ""));

            // Concatenar exactamente como lo hace Wompi
            String concatenated = id + status + amountCents + currency + createdAt + eventsSecret;

            // SHA-256 en hexadecimal (minúsculas)
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(concatenated.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hashBytes) sb.append(String.format("%02x", b));
            String computed = sb.toString();

            boolean valid = computed.equalsIgnoreCase(wompiSignature);
            if (!valid) {
                log.warn("Firma Wompi inválida. computed={} received={}", computed, wompiSignature);
            }
            return valid;

        } catch (Exception e) {
            log.error("Error verificando firma Wompi: {}", e.getMessage());
            return false;
        }
    }

    // ── Helpers ───────────────────────────────────────────────

    private String getAcceptanceToken() throws Exception {
        HttpRequest req = HttpRequest.newBuilder()
            .uri(URI.create(WOMPI_API + "/merchants/" + publicKey))
            .GET().build();
        HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
        JsonNode root = mapper.readTree(resp.body());
        return root.path("data").path("presigned_acceptance").path("acceptance_token").asText("");
    }

    private String buildWompiWidgetUrl(String pubKey, long amountCents, String reference,
                                        String email, String acceptanceToken, String redirectUrl) {
        return "https://checkout.wompi.co/p/?" +
            "public-key=" + pubKey +
            "&currency=COP" +
            "&amount-in-cents=" + amountCents +
            "&reference=" + reference +
            (email != null && !email.isBlank() ? "&customer-email=" + email : "") +
            "&acceptance-token=" + acceptanceToken +
            "&redirect-url=" + java.net.URLEncoder.encode(redirectUrl, StandardCharsets.UTF_8);
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
