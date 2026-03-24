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
    private static final String ORIGIN_STATE     = "ANT";
    private static final String ORIGIN_CITY      = "Medellín";
    private static final String ORIGIN_ZIP       = "";
    private static final String ORIGIN_NAME      = "Kosmica Store";
    private static final String ORIGIN_ADDRESS   = "Calle 10 #43-50";
    private static final String ORIGIN_PHONE     = "3043927148";

    // Peso y dimensiones promedio de tus productos
    private static final double PKG_WEIGHT       = 0.5;   // kg
    private static final int    PKG_LENGTH       = 20;    // cm
    private static final int    PKG_WIDTH        = 15;    // cm
    private static final int    PKG_HEIGHT       = 10;    // cm
    private static final double PKG_VALUE        = 100000;

    private static final String ENVIA_RATES_URL  = "https://api.envia.com/ship/rates/";

    private final ObjectMapper mapper = new ObjectMapper();

    @PostMapping("/rates")
    public ResponseEntity<String> getRates(@RequestBody RateRequest req) {
        if (enviaToken == null || enviaToken.isBlank()) {
            log.error("ENVIA_API_TOKEN no configurado en variables de entorno de Render");
            ObjectNode err = mapper.createObjectNode();
            err.put("error", "Token de Envia no configurado en el servidor");
            return ResponseEntity.internalServerError().body(err.toString());
        }

        try {
            ObjectNode body = mapper.createObjectNode();

            // ── Origen (tu tienda) ───────────────────────────────────
            ObjectNode origin = mapper.createObjectNode();
            origin.put("name",       ORIGIN_NAME);
            origin.put("company",    "Kosmica");
            origin.put("email",      "hola@kosmica.com");
            origin.put("phone",      ORIGIN_PHONE);
            origin.put("street",     ORIGIN_ADDRESS);
            origin.put("number",     "1");
            origin.put("district",   "Centro");
            origin.put("city",       ORIGIN_CITY);
            origin.put("state",      ORIGIN_STATE);
            origin.put("country",    ORIGIN_COUNTRY);
            origin.put("postalCode", ORIGIN_ZIP);
            body.set("origin", origin);

            // ── Destino (el cliente) ─────────────────────────────────
            // Envia.com Colombia usa nombre de ciudad normalizado, no DANE
            String cityName  = normalizeCityName(req.city());
            String stateCode = getColombiaState(req.city());

            ObjectNode destination = mapper.createObjectNode();
            destination.put("name",       req.name()         != null ? req.name()         : "Cliente");
            destination.put("company",    "");
            destination.put("email",      "");
            destination.put("phone",      req.phone()        != null ? req.phone()        : "3000000000");
            destination.put("street",     req.address()      != null ? req.address()      : "Dirección");
            destination.put("number",     "1");
            destination.put("district",   req.neighborhood() != null ? req.neighborhood() : "Centro");
            destination.put("city",       cityName);
            destination.put("state",      stateCode);
            destination.put("country",    "CO");
            destination.put("postalCode", "");
            body.set("destination", destination);

            // ── Paquete ──────────────────────────────────────────────
            ArrayNode packages = mapper.createArrayNode();
            ObjectNode pkg = mapper.createObjectNode();
            pkg.put("content",       "Productos de moda y accesorios");
            pkg.put("amount",        1);
            pkg.put("type",          "box");
            pkg.put("weight",        PKG_WEIGHT);
            pkg.put("insurance",     0);
            pkg.put("declaredValue", PKG_VALUE);
            pkg.put("weightUnit",    "KG");
            pkg.put("lengthUnit",    "CM");
            ObjectNode dims = mapper.createObjectNode();
            dims.put("length", PKG_LENGTH);
            dims.put("width",  PKG_WIDTH);
            dims.put("height", PKG_HEIGHT);
            pkg.set("dimensions", dims);
            packages.add(pkg);
            body.set("packages", packages);

            body.put("shipment_type", "package");

            log.info("Cotizando envío Envia → ciudad: {} ({}) | body: {}", cityName, stateCode, body);

            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(ENVIA_RATES_URL))
                .header("Authorization", "Bearer " + enviaToken)
                .header("Content-Type",  "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body.toString()))
                .build();

            HttpResponse<String> response = HttpClient.newHttpClient()
                .send(request, HttpResponse.BodyHandlers.ofString());

            log.info("Envia API → HTTP {} | body: {}", response.statusCode(), response.body());

            // Envia a veces devuelve HTTP 200 pero con code:400 dentro del body
            JsonNode enviaResp = mapper.readTree(response.body());
            if (response.statusCode() != 200 || enviaResp.has("code") && enviaResp.get("code").asInt() >= 400) {
                String description = enviaResp.path("description").asText(
                    enviaResp.path("message").asText("Error al cotizar con Envia")
                );
                log.error("Envia error: {}", description);
                ObjectNode errBody = mapper.createObjectNode();
                errBody.put("error", description);
                return ResponseEntity.status(422).body(errBody.toString());
            }

            // ── Parsear y devolver solo los campos útiles ─────────────
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

    // ── Normaliza nombre de ciudad para Envia.com ────────────────
    private String normalizeCityName(String cityName) {
        if (cityName == null) return "Medellín";
        return switch (cityName.trim().toLowerCase()
                .replace("é","e").replace("á","a").replace("ó","o").replace("í","i").replace("ú","u")) {
            case "medellin"      -> "Medellín";
            case "bogota"        -> "Bogotá";
            case "cali"          -> "Cali";
            case "barranquilla"  -> "Barranquilla";
            case "cartagena"     -> "Cartagena";
            case "cucuta"        -> "Cúcuta";
            case "bucaramanga"   -> "Bucaramanga";
            case "pereira"       -> "Pereira";
            case "manizales"     -> "Manizales";
            case "ibague"        -> "Ibagué";
            case "santa marta"   -> "Santa Marta";
            case "villavicencio" -> "Villavicencio";
            case "monteria"      -> "Montería";
            case "pasto"         -> "Pasto";
            case "neiva"         -> "Neiva";
            case "armenia"       -> "Armenia";
            case "popayan"       -> "Popayán";
            case "valledupar"    -> "Valledupar";
            case "sincelejo"     -> "Sincelejo";
            case "riohacha"      -> "Riohacha";
            default              -> cityName.trim();
        };
    }

    // ── Código de departamento para Envia.com ────────────────────
    private String getColombiaState(String cityName) {
        if (cityName == null) return "ANT";
        return switch (cityName.trim().toLowerCase()
                .replace("é","e").replace("á","a").replace("ó","o").replace("í","i").replace("ú","u")) {
            case "medellin"      -> "ANT";
            case "bogota"        -> "CUN";
            case "cali"          -> "VAC";
            case "barranquilla"  -> "ATL";
            case "cartagena"     -> "BOL";
            case "cucuta"        -> "NSA";
            case "bucaramanga"   -> "SAN";
            case "pereira"       -> "RIS";
            case "manizales"     -> "CAL";
            case "ibague"        -> "TOL";
            case "santa marta"   -> "MAG";
            case "villavicencio" -> "MET";
            case "monteria"      -> "COR";
            case "pasto"         -> "NAR";
            case "neiva"         -> "HUI";
            case "armenia"       -> "QUI";
            case "popayan"       -> "CAU";
            case "valledupar"    -> "CES";
            case "sincelejo"     -> "SUC";
            case "riohacha"      -> "LAG";
            default              -> "ANT";
        };
    }

    private String getCarrierEmoji(String carrier) {
        return switch (carrier.toLowerCase()) {
            case "servientrega"  -> "🟡";
            case "coordinadora"  -> "🔵";
            case "tcc"           -> "🔴";
            case "interrapidisimo", "interrapidísimo" -> "🟠";
            case "envia", "envía" -> "🟢";
            case "fedex"         -> "🟣";
            default              -> "📦";
        };
    }

    public record RateRequest(
        String name,
        String phone,
        String city,
        String neighborhood,
        String address
    ) {}
}
