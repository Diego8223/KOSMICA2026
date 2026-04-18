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

    // Esta llave es la de INTEGRIDAD (no la de eventos/webhooks).
    // En el dashboard de Wompi: Desarrolladores → Llaves → "Llave de integridad"
    // Variable de entorno en Render: WOMPI_EVENTS_SECRET
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
        return privateKey != null && !privateKey.isBlank() && !privateKey.equals("prv_test_placeholder");
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

        // Generar firma de integridad (REQUERIDA por Wompi)
        String integritySignature = generateIntegritySignature(reference, amountInCents, "COP");

        String bodyJson = mapper.writeValueAsString(Map.of(
            "amount_in_cents",   amountInCents,
            "currency",          "COP",
            "customer_email",    customerEmail != null ? customerEmail : "cliente@kosmica.com.co",
            "payment_method",    Map.of("installments", 1),
            "reference",         reference,
            "acceptance_token",  acceptanceToken,
            "signature",         Map.of("integrity", integritySignature),
            "redirect_url",      redirectFinal,
            "customer_data",     Map.of(
                "full_name",          customerName != null ? customerName : "Cliente",
                "phone_number",       customerPhone != null ? customerPhone.replaceAll("[^0-9]","") : "3000000000",
                "phone_number_prefix","+57"
            )
        ));

        HttpRequest req = HttpRequest.newBuilder()
            .uri(URI.create(WOMPI_API + "/transactions"))
            .header("Authorization", "Bearer " + privateKey)
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

        // URL del widget de pago Wompi (incluye firma de integridad)
        String paymentUrl = buildWompiWidgetUrl(publicKey, amountInCents, reference, customerEmail, acceptanceToken, redirectFinal, integritySignature);

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
                .header("Authorization", "Bearer " + privateKey)
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

    /**
     * Genera la firma de integridad requerida por Wompi para cada transacción.
     *
     * Fórmula: SHA256( reference + amount_in_cents + currency + integrity_secret )
     *
     * La "integrity_secret" es la llave de integridad del dashboard de Wompi.
     * En este proyecto se reutiliza la variable WOMPI_EVENTS_SECRET para almacenarla.
     */
    private String generateIntegritySignature(String reference, long amountInCents, String currency) throws Exception {
        if (eventsSecret == null || eventsSecret.isBlank()) {
            log.warn("⚠️  WOMPI_EVENTS_SECRET (llave de integridad) no configurada. La firma de integridad estará vacía.");
            return "";
        }
        String data = reference + amountInCents + currency + eventsSecret;
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] hash = digest.digest(data.getBytes(StandardCharsets.UTF_8));
        StringBuilder sb = new StringBuilder();
        for (byte b : hash) sb.append(String.format("%02x", b));
        return sb.toString();
    }

    private String getAcceptanceToken() throws Exception {
        HttpRequest req = HttpRequest.newBuilder()
            .uri(URI.create(WOMPI_API + "/merchants/" + publicKey))
            .GET().build();
        HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
        JsonNode root = mapper.readTree(resp.body());
        return root.path("data").path("presigned_acceptance").path("acceptance_token").asText("");
    }

    /**
     * Construye la URL del widget de pago de Wompi incluyendo la firma de integridad.
     * El parámetro "signature:integrity" es obligatorio desde 2024.
     */
    private String buildWompiWidgetUrl(String pubKey, long amountCents, String reference,
                                        String email, String acceptanceToken, String redirectUrl,
                                        String integritySignature) {
        StringBuilder url = new StringBuilder("https://checkout.wompi.co/p/?");
        url.append("public-key=").append(pubKey);
        url.append("&currency=COP");
        url.append("&amount-in-cents=").append(amountCents);
        url.append("&reference=").append(reference);
        if (email != null && !email.isBlank()) {
            url.append("&customer-email=").append(email);
        }
        url.append("&acceptance-token=").append(acceptanceToken);
        url.append("&redirect-url=").append(java.net.URLEncoder.encode(redirectUrl, StandardCharsets.UTF_8));
        if (integritySignature != null && !integritySignature.isBlank()) {
            url.append("&signature:integrity=").append(integritySignature);
        }
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
