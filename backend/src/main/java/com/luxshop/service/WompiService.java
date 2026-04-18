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
import java.util.List;
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
 *
 * ── Verificación de firma del webhook ──────────────────────────────────────
 * Wompi NO usa el header X-Wompi-Signature.
 * La firma viaja DENTRO del body JSON en: body.signature.checksum
 *
 * El checksum se calcula así:
 *   SHA256( valor1 + valor2 + ... + events_secret )
 *
 * Donde los valores provienen de los campos indicados en body.signature.properties,
 * en el orden exacto en que aparecen en ese array.
 *
 * Ejemplo de body real de Wompi:
 * {
 *   "event": "transaction.updated",
 *   "data": { "transaction": { "id": "...", "status": "APPROVED", ... } },
 *   "signature": {
 *     "properties": ["transaction.id", "transaction.status", "transaction.amount_in_cents"],
 *     "checksum": "abc123..."
 *   },
 *   "timestamp": 1713300000,
 *   "sent_at": "2024-04-17T00:00:00.000Z"
 * }
 *
 * Concatenación: value(transaction.id) + value(transaction.status) +
 *                value(transaction.amount_in_cents) + timestamp + events_secret
 *
 * Documentación oficial: https://docs.wompi.co/docs/colombia/eventos/
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

        long amountInCents = amountCOP.multiply(BigDecimal.valueOf(100)).longValueExact();
        String reference   = "KOSMICA-" + orderId + "-" + System.currentTimeMillis();
        String redirectFinal = (redirectUrl != null && !redirectUrl.isBlank())
            ? redirectUrl : storeUrl + "/?pago=exitoso&metodo=wompi";

        String acceptanceToken = getAcceptanceToken();

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
     * ✅ CORRECCIÓN: Wompi NO usa el header X-Wompi-Signature.
     * La firma viene DENTRO del body JSON en body.signature.checksum.
     *
     * El checksum se construye así:
     *   1. Tomar los campos de body.signature.properties (en ese orden)
     *   2. Resolver cada campo en body.data.transaction (ej: "transaction.id" → body.data.transaction.id)
     *   3. Concatenar: valor1 + valor2 + ... + timestamp + events_secret
     *   4. SHA-256 de esa cadena (hex en minúsculas)
     *
     * Documentación: https://docs.wompi.co/docs/colombia/eventos/
     */
    @SuppressWarnings("unchecked")
    public boolean verifyWebhookSignature(Map<String, Object> body) {
        try {
            if (eventsSecret == null || eventsSecret.isBlank()) {
                log.warn("⚠️  WOMPI_EVENTS_SECRET no configurado. Verificación de firma omitida.");
                return true;
            }

            // Leer la firma y las propiedades desde el body
            Map<String, Object> signatureBlock = (Map<String, Object>) body.get("signature");
            if (signatureBlock == null) {
                log.warn("Webhook Wompi: campo 'signature' ausente en el body");
                return false;
            }

            String receivedChecksum = String.valueOf(signatureBlock.getOrDefault("checksum", ""));
            List<String> properties = (List<String>) signatureBlock.get("properties");
            if (properties == null || properties.isEmpty()) {
                log.warn("Webhook Wompi: 'signature.properties' ausente o vacío");
                return false;
            }

            // Timestamp del evento (campo de primer nivel en el body)
            String timestamp = String.valueOf(body.getOrDefault("timestamp", ""));

            // Resolver los valores de cada propiedad desde body.data.transaction
            Map<String, Object> data = (Map<String, Object>) body.get("data");
            if (data == null) return false;
            Map<String, Object> tx = (Map<String, Object>) data.get("transaction");
            if (tx == null) return false;

            StringBuilder concatenated = new StringBuilder();
            for (String prop : properties) {
                // prop tiene forma "transaction.field_name" → extraer "field_name"
                String field = prop.contains(".") ? prop.substring(prop.indexOf('.') + 1) : prop;
                concatenated.append(String.valueOf(tx.getOrDefault(field, "")));
            }
            // Agregar timestamp y events_secret al final
            concatenated.append(timestamp);
            concatenated.append(eventsSecret);

            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(concatenated.toString().getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hashBytes) sb.append(String.format("%02x", b));
            String computed = sb.toString();

            boolean valid = computed.equalsIgnoreCase(receivedChecksum);
            if (!valid) {
                log.warn("Firma Wompi inválida. computed={} received={}", computed, receivedChecksum);
            }
            return valid;

        } catch (Exception e) {
            log.error("Error verificando firma Wompi: {}", e.getMessage());
            return false;
        }
    }

    // ── Helpers ───────────────────────────────────────────────

    /**
     * Obtiene el acceptance_token vigente del merchant (llamada pública, sin auth).
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
}
