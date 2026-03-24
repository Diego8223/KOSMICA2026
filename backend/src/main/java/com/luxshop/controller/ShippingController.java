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

@Slf4j
@RestController
@RequestMapping("/api/shipping")
@RequiredArgsConstructor
public class ShippingController {

    // ════════════════════════════════════════════════════════════
    //  Agrega en Render → Environment:
    //    ENVIA_API_TOKEN = tu_token_de_envia.com
    //  Obtén tu token en: https://ship.envia.com → Configuración → API
    //
    //  ORIGEN: cambia estos valores a la dirección de tu bodega/tienda
    // ════════════════════════════════════════════════════════════
    @Value("${envia.api.token:}")
    private String enviaToken;

    // Dirección de origen (tu tienda/bodega) — ajusta según tu ubicación
    private static final String ORIGIN_COUNTRY   = "CO";
    private static final String ORIGIN_STATE     = "ANT";          // Antioquia
    private static final String ORIGIN_CITY      = "05001";        // Medellín (Código DANE)
    private static final String ORIGIN_ZIP       = "05001";
    private static final String ORIGIN_NAME      = "Kosmica Store";
    private static final String ORIGIN_ADDRESS   = "Calle 10 #43-50";
    private static final String ORIGIN_PHONE     = "3043927148";

    // Peso y dimensiones promedio de tus productos (ajusta según tus paquetes)
    private static final double PKG_WEIGHT       = 0.5;   // kg
    private static final int    PKG_LENGTH       = 20;    // cm
    private static final int    PKG_WIDTH        = 15;    // cm
    private static final int    PKG_HEIGHT       = 10;    // cm
    private static final double PKG_VALUE        = 100000; // valor declarado COP

    private static final String ENVIA_RATES_URL  = "https://api.envia.com/ship/rates/";

    private final ObjectMapper mapper = new ObjectMapper();

    @PostMapping("/rates")
    public ResponseEntity<String> getRates(@RequestBody RateRequest req) {
        if (enviaToken == null || enviaToken.isBlank()) {
            log.error("ENVIA_API_TOKEN no configurado en variables de entorno de Render");
            return ResponseEntity.internalServerError()
                .body("{\"error\":\"Token de Envia no configurado en el servidor\"}");
        }

        try {
            // ── Construir body para la API de Envia ──────────────────────
            ObjectNode body = mapper.createObjectNode();

            // Origen (tu tienda)
            ObjectNode origin = mapper.createObjectNode();
            origin.put("name",        ORIGIN_NAME);
            origin.put("company",     "Kosmica");
            origin.put("email",       "hola@kosmica.com");
            origin.put("phone",       ORIGIN_PHONE);
            origin.put("street",      ORIGIN_ADDRESS);
            origin.put("number",      "1");
            origin.put("district",    "Centro");
            origin.put("city",        ORIGIN_CITY);
            origin.put("state",       ORIGIN_STATE);
            origin.put("country",     ORIGIN_COUNTRY);
            origin.put("postalCode",  ORIGIN_ZIP);
            body.set("origin", origin);

            // Destino (el cliente)
            // Para Colombia: city y postalCode deben ser el Código DANE
            // Como el cliente ingresa nombre de ciudad, usamos el DANE de
            // Medellín como fallback; en producción puedes usar el Geocodes API
            // de Envia para convertir nombre → DANE automáticamente
            String daneCode = getColombiaDane(req.city());
            ObjectNode destination = mapper.createObjectNode();
            destination.put("name",       req.name());
            destination.put("phone",      req.phone() != null ? req.phone() : "3000000000");
            destination.put("street",     req.address());
            destination.put("number",     "1");
            destination.put("district",   req.neighborhood() != null ? req.neighborhood() : "");
            destination.put("city",       daneCode);
            destination.put("state",      "");  // Envia lo infiere del DANE
            destination.put("country",    "CO");
            destination.put("postalCode", daneCode);
            body.set("destination", destination);

            // Paquete
            ArrayNode packages = mapper.createArrayNode();
            ObjectNode pkg = mapper.createObjectNode();
            pkg.put("content",      "Productos de moda y accesorios");
            pkg.put("amount",       1);
            pkg.put("type",         "box");
            pkg.put("weight",       PKG_WEIGHT);
            pkg.put("insurance",    0);
            pkg.put("declaredValue", PKG_VALUE);
            pkg.put("weightUnit",   "KG");
            pkg.put("lengthUnit",   "CM");
            ObjectNode dims = mapper.createObjectNode();
            dims.put("length", PKG_LENGTH);
            dims.put("width",  PKG_WIDTH);
            dims.put("height", PKG_HEIGHT);
            pkg.set("dimensions", dims);
            packages.add(pkg);
            body.set("packages", packages);

            // Tipo de envío
            body.put("shipment_type", "package");

            log.info("Cotizando envío Envia → destino DANE: {} | body enviado: {}", daneCode, body);

            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(ENVIA_RATES_URL))
                .header("Authorization", "Bearer " + enviaToken)
                .header("Content-Type",  "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body.toString()))
                .build();

            HttpResponse<String> response = HttpClient.newHttpClient()
                .send(request, HttpResponse.BodyHandlers.ofString());

            log.info("Envia API → HTTP {}", response.statusCode());
            log.info("Envia API → body respuesta: {}", response.body());

            if (response.statusCode() != 200) {
                log.error("Envia error {}: {}", response.statusCode(), response.body());
                return ResponseEntity.status(response.statusCode())
                    .body("{\"error\":\"Error de Envia: " + response.statusCode() + "\"}");
            }

            // Parsear y devolver solo los campos útiles para el frontend
            JsonNode enviaResp = mapper.readTree(response.body());
            ArrayNode carriers = mapper.createArrayNode();

            JsonNode data = enviaResp.has("data") ? enviaResp.get("data") : enviaResp;
            if (data.isArray()) {
                for (JsonNode item : data) {
                    ObjectNode carrier = mapper.createObjectNode();
                    carrier.put("name",     item.path("carrier").asText("Transportadora"));
                    carrier.put("service",  item.path("service").asText(""));
                    carrier.put("price",    item.path("totalPrice").asDouble(0));
                    carrier.put("currency", item.path("currency").asText("COP"));
                    carrier.put("days",     item.path("deliveryEstimate").asText("2-5 días"));
                    carrier.put("logo",     getCarrierEmoji(item.path("carrier").asText("")));
                    carriers.add(carrier);
                }
            }

            // Ordenar por precio (menor primero)
            carriers.elements();
            ObjectNode result = mapper.createObjectNode();
            result.set("carriers", carriers);
            result.put("destination", req.city());

            return ResponseEntity.ok(result.toString());

        } catch (Exception e) {
            log.error("Error llamando a Envia API: {}", e.getMessage());
            ObjectNode errBody = mapper.createObjectNode();
            errBody.put("error", e.getMessage() != null ? e.getMessage() : "Error interno del servidor");
            return ResponseEntity.internalServerError().body(errBody.toString());
        }
    }

    // ── Códigos DANE de las principales ciudades de Colombia ─────
    private String getColombiaDane(String cityName) {
        if (cityName == null) return "05001";
        return switch (cityName.trim().toLowerCase()
                .replace("é","e").replace("á","a").replace("ó","o").replace("í","i").replace("ú","u")) {
            case "medellin", "medellín"         -> "05001";
            case "bogota", "bogotá"             -> "11001";
            case "cali"                          -> "76001";
            case "barranquilla"                  -> "08001";
            case "cartagena"                     -> "13001";
            case "cucuta", "cúcuta"              -> "54001";
            case "bucaramanga"                   -> "68001";
            case "pereira"                       -> "66001";
            case "manizales"                     -> "17001";
            case "ibague", "ibagué"              -> "73001";
            case "santa marta"                   -> "47001";
            case "villavicencio"                 -> "50001";
            case "monteria", "montería"          -> "23001";
            case "pasto"                         -> "52001";
            case "neiva"                         -> "41001";
            case "armenia"                       -> "63001";
            case "popayan", "popayán"            -> "19001";
            case "valledupar"                    -> "20001";
            case "sincelejo"                     -> "70001";
            case "riohacha"                      -> "44001";
            case "quibdo", "quibdó"              -> "27001";
            case "florencia"                     -> "18001";
            case "mocoa"                         -> "86001";
            case "yopal"                         -> "85001";
            default                              -> "05001"; // fallback Medellín
        };
    }

    private String getCarrierEmoji(String carrier) {
        return switch (carrier.toLowerCase()) {
            case "servientrega" -> "🟡";
            case "coordinadora" -> "🔵";
            case "tcc"          -> "🔴";
            case "interrapidisimo", "interrapidísimo" -> "🟠";
            case "envia", "envía" -> "🟢";
            case "fedex"        -> "🟣";
            default             -> "📦";
        };
    }

    // ── Record para el request del frontend ─────────────────────
    public record RateRequest(
        String name,
        String phone,
        String city,
        String neighborhood,
        String address
    ) {}
}
