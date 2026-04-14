package com.luxshop.service;

import com.mercadopago.MercadoPagoConfig;
import com.mercadopago.client.payment.PaymentClient;
import com.mercadopago.client.payment.PaymentCreateRequest;
import com.mercadopago.client.common.IdentificationRequest;
import com.mercadopago.client.payment.PaymentPayerRequest;
import com.mercadopago.client.payment.PaymentPayerPhoneRequest;
import com.mercadopago.client.preference.*;
import com.mercadopago.exceptions.MPApiException;
import com.mercadopago.exceptions.MPException;
import com.mercadopago.resources.payment.Payment;
import com.mercadopago.resources.preference.Preference;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.*;

@Slf4j
@Service
public class PaymentService {

    @Value("${mercadopago.access.token:TEST-placeholder}")
    private String accessToken;

    @Value("${mercadopago.public.key:TEST-placeholder}")
    private String publicKey;

    @Value("${store.url:http://localhost:3000}")
    private String storeUrl;

    @Value("${store.name:LuxShop}")
    private String storeName;

    // ══════════════════════════════════════════════════════════════
    //  MERCADOPAGO — Checkout Pro (redirige al usuario a MP)
    //  Soporta: Tarjetas, PSE, Efecty, Bancolombia, Nequi, y más
    // ══════════════════════════════════════════════════════════════

    public Map<String, String> createPaymentIntent(BigDecimal amount, String currency) throws Exception {
        return createPreference(amount, "Compra en " + storeName, null);
    }

    public Map<String, String> createPreference(
            BigDecimal total,
            String description,
            List<Map<String, Object>> items) throws MPException, MPApiException {

        MercadoPagoConfig.setAccessToken(accessToken);
        PreferenceClient client = new PreferenceClient();
        List<PreferenceItemRequest> mpItems = new ArrayList<>();

        if (items != null && !items.isEmpty()) {
            for (Map<String, Object> item : items) {
                String rawPrice = String.valueOf(item.getOrDefault("price", total));
                BigDecimal unitPrice;
                try { unitPrice = new BigDecimal(rawPrice); } catch (Exception e) { unitPrice = total; }

                if (unitPrice.compareTo(BigDecimal.ZERO) <= 0) continue;

                mpItems.add(PreferenceItemRequest.builder()
                        .id(String.valueOf(item.getOrDefault("id", "prod")))
                        .title(String.valueOf(item.getOrDefault("name", "Producto")))
                        .description(String.valueOf(item.getOrDefault("description", "")))
                        .quantity(Integer.parseInt(String.valueOf(item.getOrDefault("quantity", 1))))
                        .unitPrice(unitPrice)
                        .currencyId("COP")
                        .build());
            }
        }

        if (mpItems.isEmpty()) {
            mpItems.add(PreferenceItemRequest.builder()
                    .id("order")
                    .title(description != null ? description : "Compra en " + storeName)
                    .quantity(1)
                    .unitPrice(total)
                    .currencyId("COP")
                    .build());
        }

        PreferenceRequest request = PreferenceRequest.builder()
                .items(mpItems)
                .backUrls(PreferenceBackUrlsRequest.builder()
                        .success(storeUrl + "/?pago=exitoso")
                        .failure(storeUrl + "/?pago=fallido")
                        .pending(storeUrl + "/?pago=pendiente")
                        .build())
                .autoReturn("approved")
                .externalReference(storeName.toUpperCase() + "-" + System.currentTimeMillis())
                .notificationUrl(storeUrl + "/api/orders/webhook")
                .statementDescriptor(storeName)
                .build();

        Preference preference = client.create(request);

        // En sandbox usamos sandboxInitPoint; en producción initPoint
        String initPoint = accessToken.startsWith("TEST-")
                ? preference.getSandboxInitPoint()
                : preference.getInitPoint();

        return Map.of(
                "preferenceId", preference.getId(),
                "initPoint", initPoint != null ? initPoint : preference.getInitPoint(),
                "publicKey", publicKey
        );
    }

    // ══════════════════════════════════════════════════════════════
    //  NEQUI — Notificación Push (el cliente aprueba desde su app)
    //
    //  ⚠️  REQUISITO: MERCADOPAGO_ACCESS_TOKEN debe ser de PRODUCCIÓN
    //      formato: APP_USR-XXXX...  (NO TEST-...)
    //
    //  Flujo:
    //    1. Backend llama a MP con payment_method_id = "nequi"
    //    2. MP envía push notification a la app Nequi del cliente
    //    3. Cliente abre Nequi → Centro de notificaciones → Aprueba
    //    4. Frontend hace polling cada 5s a /api/orders/nequi-status/{id}
    //    5. Cuando status = "approved", se confirma el pedido
    // ══════════════════════════════════════════════════════════════

    public Map<String, String> createNequiPayment(
            BigDecimal amount,
            String phone,
            String customerEmail,
            String customerName,
            String customerDocument,
            String orderId) throws Exception {

        // Validar que sea token de producción
        if (accessToken == null
                || accessToken.startsWith("TEST-")
                || accessToken.equals("TEST-placeholder")
                || accessToken.equals("APP_USR-placeholder")) {
            throw new RuntimeException(
                "Nequi push requiere token de PRODUCCIÓN de MercadoPago (APP_USR-...)." +
                " Configura MERCADOPAGO_ACCESS_TOKEN con tu token productivo.");
        }

        // Limpiar y validar teléfono
        String cleanPhone = phone.replaceAll("\\D", "");
        if (cleanPhone.startsWith("57") && cleanPhone.length() == 12) {
            cleanPhone = cleanPhone.substring(2); // quitar indicativo si ya viene incluido
        }
        if (cleanPhone.length() != 10) {
            throw new IllegalArgumentException(
                "El número Nequi debe tener 10 dígitos (ej: 3001234567). Se recibió: " + cleanPhone);
        }

        // Email válido (requerido por MP aunque sea ficticio)
        String email = (customerEmail != null && customerEmail.contains("@"))
                ? customerEmail
                : "cliente@" + storeName.toLowerCase().replaceAll("\\s","") + ".com";

        String firstName = extractFirstName(customerName);
        String extRef = storeName.toUpperCase().replaceAll("\\s","") + "-NEQUI-"
                + (orderId != null ? orderId : System.currentTimeMillis());

        log.info("💜 Iniciando pago Nequi push → teléfono: {} | monto: {} | ref: {}", cleanPhone, amount, extRef);

        MercadoPagoConfig.setAccessToken(accessToken);

        // Cédula requerida por MercadoPago Colombia para Nequi push (error 2131 sin este campo)
        String docNumber = (customerDocument != null && !customerDocument.isBlank())
                ? customerDocument.replaceAll("\\D", "")
                : "0000000000";
        IdentificationRequest identification = IdentificationRequest.builder()
                .type("CC")
                .number(docNumber)
                .build();

        PaymentCreateRequest paymentRequest = PaymentCreateRequest.builder()
                .transactionAmount(amount)
                .description("Compra en " + storeName)
                .paymentMethodId("nequi")
                .payer(PaymentPayerRequest.builder()
                        .email(email)
                        .firstName(firstName)
                        .identification(identification)
                        .phone(PaymentPayerPhoneRequest.builder()
                                .areaCode("57")
                                .number(cleanPhone)
                                .build())
                        .build())
                .externalReference(extRef)
                .notificationUrl(storeUrl + "/api/orders/webhook")
                .build();

        log.info("📋 Nequi request → phone: {} | doc: {} | email: {} | amount: {}", cleanPhone, docNumber, email, amount);
        PaymentClient client = new PaymentClient();
        Payment payment;

        try {
            payment = client.create(paymentRequest);
        } catch (MPApiException e) {
            // Extraer body completo de la respuesta MP para diagnóstico real
            String apiBody = "";
            try { apiBody = e.getApiResponse().getContent(); } catch (Exception ignored) {}
            String apiMsg = e.getMessage();
            int    status = e.getStatusCode();

            log.error("❌ MPApiException Nequi | statusCode: {} | message: {} | body: {}",
                      status, apiMsg, apiBody);

            // Causa 1: número no registrado en Nequi (código 10102) o formato incorrecto
            if (apiBody.contains("10102") || apiBody.contains("not_result_by_params")
                    || apiBody.contains("No result found")
                    || apiBody.contains("phone") || apiBody.contains("E301")
                    || apiBody.contains("invalid_number") || apiBody.contains("user not found")) {
                throw new RuntimeException(
                    "NEQUI_NOT_FOUND:" + cleanPhone);
            }
            // Causa 2: método de pago no habilitado para esta cuenta MP
            if (apiBody.contains("payment_method") || apiBody.contains("E302")
                    || apiBody.contains("method not allowed") || apiBody.contains("not_allowed")) {
                throw new RuntimeException(
                    "Tu cuenta MercadoPago no tiene habilitado Nequi push. " +
                    "Actívalo en: mercadopago.com.co → Configuración → Métodos de pago.");
            }
            // Causa 3: monto inválido
            if (apiBody.contains("amount") || apiBody.contains("E101")) {
                throw new RuntimeException("Monto inválido para Nequi. El mínimo es $1.000 COP.");
            }
            // Causa 4: token sin permisos
            if (status == 401 || apiBody.contains("unauthorized") || apiBody.contains("Unauthorized")) {
                throw new RuntimeException(
                    "Token de MercadoPago sin permisos para Nequi. Verifica credenciales de producción.");
            }
            // Causa genérica — mostramos body completo para seguir diagnosticando
            throw new RuntimeException(
                "Error MP " + status + " al crear pago Nequi: " +
                (apiBody.isBlank() ? apiMsg : apiBody));
        }

        log.info("✅ Pago Nequi creado: id={} | status={} | detail={}", 
            payment.getId(), payment.getStatus(), payment.getStatusDetail());

        Map<String, String> result = new HashMap<>();
        result.put("paymentId", String.valueOf(payment.getId()));
        result.put("status", payment.getStatus());
        result.put("statusDetail", payment.getStatusDetail());
        result.put("phone", cleanPhone);
        return result;
    }

    // ══════════════════════════════════════════════════════════════
    //  CONSULTA DE ESTADO — Usado por el polling del frontend
    // ══════════════════════════════════════════════════════════════

    public boolean verifyPayment(String paymentId) {
        try {
            MercadoPagoConfig.setAccessToken(accessToken);
            log.info("🔍 verifyPayment → paymentId: {}", paymentId);
            PaymentClient client = new PaymentClient();
            Payment payment = client.get(Long.parseLong(paymentId));
            return "approved".equals(payment.getStatus());
        } catch (Exception e) {
            log.warn("⚠️ verifyPayment error para {}: {}", paymentId, e.getMessage());
            return false;
        }
    }

    public Map<String, String> getPaymentStatus(String paymentId) {
        try {
            MercadoPagoConfig.setAccessToken(accessToken);
            log.info("🔍 getPaymentStatus → paymentId: {}", paymentId);
            PaymentClient client = new PaymentClient();
            Payment payment = client.get(Long.parseLong(paymentId));

            return Map.of(
                "paymentId",    paymentId,
                "status",       payment.getStatus() != null ? payment.getStatus() : "unknown",
                "statusDetail", payment.getStatusDetail() != null ? payment.getStatusDetail() : ""
            );

        } catch (Exception e) {
            log.warn("⚠️ getPaymentStatus error para {}: {}", paymentId, e.getMessage());
            return Map.of(
                "paymentId",    paymentId,
                "status",       "error",
                "statusDetail", e.getMessage()
            );
        }
    }

    // ══════════════════════════════════════════════════════════════
    //  Helpers
    // ══════════════════════════════════════════════════════════════

    private String extractFirstName(String fullName) {
        if (fullName == null || fullName.isBlank()) return "Cliente";
        return fullName.trim().split("\\s+")[0];
    }
}
