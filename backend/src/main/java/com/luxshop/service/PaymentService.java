package com.luxshop.service;

import com.mercadopago.MercadoPagoConfig;
import com.mercadopago.client.payment.PaymentClient;
import com.mercadopago.client.payment.PaymentCreateRequest;
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
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class PaymentService {

    @Value("${mercadopago.access.token:TEST-placeholder}")
    private String accessToken;

    @Value("${mercadopago.public.key:TEST-placeholder}")
    private String publicKey;

    @Value("${store.url:http://localhost:3000}")
    private String storeUrl;

    @Value("${store.name:Kosmica}")
    private String storeName;

    // ── Checkout Pro: PSE, tarjetas, Efecty ───────────────────
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
                try { unitPrice = new BigDecimal(rawPrice); } catch (NumberFormatException e) { unitPrice = total; }
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
                .id("kosmica-order")
                .title(description != null ? description : "Compra en " + storeName)
                .quantity(1).unitPrice(total).currencyId("COP").build());
        }

        PreferenceRequest request = PreferenceRequest.builder()
            .items(mpItems)
            .backUrls(PreferenceBackUrlsRequest.builder()
                .success(storeUrl + "/?pago=exitoso")
                .failure(storeUrl + "/?pago=fallido")
                .pending(storeUrl + "/?pago=pendiente")
                .build())
            .autoReturn("approved")
            .externalReference("KOSMICA-" + System.currentTimeMillis())
            .notificationUrl(storeUrl + "/api/orders/webhook")
            .statementDescriptor(storeName)
            .build();

        Preference preference = client.create(request);
        log.info("MercadoPago Preference creada: {}", preference.getId());

        String initPoint = accessToken.startsWith("TEST-")
            ? preference.getSandboxInitPoint()
            : preference.getInitPoint();

        return Map.of(
            "preferenceId", preference.getId(),
            "initPoint",    initPoint != null ? initPoint : preference.getInitPoint(),
            "publicKey",    publicKey
        );
    }

    // ── Nequi DIRECTO — Payments API ──────────────────────────
    // Usa PaymentPayerPhoneRequest (correcto para SDK 2.8.0)
    public Map<String, String> createNequiPayment(
            BigDecimal amount,
            String phone,
            String customerEmail,
            String customerName,
            String orderId) throws Exception {

        MercadoPagoConfig.setAccessToken(accessToken);

        if (accessToken == null || accessToken.startsWith("TEST-") || accessToken.equals("TEST-placeholder")) {
            log.warn("⚠️ Nequi requiere credenciales de PRODUCCIÓN (APP_USR-...). Token actual parece de prueba.");
            throw new RuntimeException(
                "Nequi directo requiere credenciales de producción activas de MercadoPago Colombia. " +
                "Verifica que MERCADOPAGO_ACCESS_TOKEN sea tu token de producción (APP_USR-...).");
        }

        String cleanPhone = phone.replaceAll("\\D", "");
        if (cleanPhone.length() != 10) {
            throw new IllegalArgumentException("El número Nequi debe tener exactamente 10 dígitos: recibido=" + cleanPhone);
        }

        String email = (customerEmail != null && !customerEmail.isBlank() && customerEmail.contains("@"))
            ? customerEmail : "cliente@kosmica.com.co";

        String extRef = "KOSMICA-NEQUI-" + (orderId != null ? orderId : System.currentTimeMillis());

        log.info("🟣 Creando pago Nequi: phone={} email={} amount={} ref={}", cleanPhone, email, amount, extRef);

        // ✅ SDK 2.8.0 usa PaymentPayerPhoneRequest (no PhoneRequest genérico)
        PaymentPayerPhoneRequest phoneRequest = PaymentPayerPhoneRequest.builder()
            .areaCode("57")
            .number(cleanPhone)
            .build();

        PaymentCreateRequest paymentRequest = PaymentCreateRequest.builder()
            .transactionAmount(amount)
            .description("Compra en " + storeName)
            .paymentMethodId("nequi")
            .payer(PaymentPayerRequest.builder()
                .email(email)
                .firstName(extractFirstName(customerName))
                .phone(phoneRequest)
                .build())
            .externalReference(extRef)
            .notificationUrl(storeUrl + "/api/orders/webhook")
            .build();

        PaymentClient client = new PaymentClient();
        Payment payment;

        try {
            payment = client.create(paymentRequest);
        } catch (MPApiException apiEx) {
            log.error("❌ MercadoPago API error Nequi: status={} content={}",
                apiEx.getStatusCode(),
                apiEx.getApiResponse() != null ? apiEx.getApiResponse().getContent() : "sin contenido");
            throw new RuntimeException("Error MercadoPago [" + apiEx.getStatusCode() + "]: " +
                (apiEx.getApiResponse() != null ? apiEx.getApiResponse().getContent() : apiEx.getMessage()));
        }

        log.info("✅ Nequi pago creado: id={} status={} statusDetail={}",
            payment.getId(), payment.getStatus(), payment.getStatusDetail());

        if ("rejected".equals(payment.getStatus())) {
            throw new RuntimeException("Pago rechazado: " + humanizeNequiError(payment.getStatusDetail()));
        }

        Map<String, String> result = new HashMap<>();
        result.put("paymentId",    String.valueOf(payment.getId()));
        result.put("status",       payment.getStatus() != null ? payment.getStatus() : "pending");
        result.put("statusDetail", payment.getStatusDetail() != null ? payment.getStatusDetail() : "");
        result.put("phone",        cleanPhone);
        return result;
    }

    // Sobrecarga de compatibilidad
    public Map<String, String> createNequiPayment(BigDecimal amount, String phone) throws Exception {
        return createNequiPayment(amount, phone, null, null, null);
    }

    // ── Verificar pago por payment_id ─────────────────────────
    public boolean verifyPayment(String paymentId) {
        try {
            MercadoPagoConfig.setAccessToken(accessToken);
            PaymentClient client = new PaymentClient();
            Payment payment = client.get(Long.parseLong(paymentId));
            boolean approved = "approved".equals(payment.getStatus());
            log.info("Pago {} verificado: status={}", paymentId, payment.getStatus());
            return approved;
        } catch (Exception e) {
            log.error("Error verificando pago {}: {}", paymentId, e.getMessage());
            return false;
        }
    }

    // ── Polling estado de un pago Nequi ───────────────────────
    public Map<String, String> getPaymentStatus(String paymentId) {
        try {
            MercadoPagoConfig.setAccessToken(accessToken);
            PaymentClient client = new PaymentClient();
            Payment payment = client.get(Long.parseLong(paymentId));
            Map<String, String> result = new HashMap<>();
            result.put("paymentId",    paymentId);
            result.put("status",       payment.getStatus() != null ? payment.getStatus() : "pending");
            result.put("statusDetail", payment.getStatusDetail() != null ? payment.getStatusDetail() : "");
            return result;
        } catch (Exception e) {
            log.error("Error consultando estado pago {}: {}", paymentId, e.getMessage());
            return Map.of("paymentId", paymentId, "status", "error", "statusDetail", e.getMessage());
        }
    }

    private String extractFirstName(String fullName) {
        if (fullName == null || fullName.isBlank()) return "Cliente";
        return fullName.trim().split("\\s+")[0];
    }

    private String humanizeNequiError(String detail) {
        if (detail == null) return "Error desconocido";
        return switch (detail) {
            case "cc_rejected_insufficient_amount" -> "Saldo insuficiente en Nequi";
            case "cc_rejected_bad_filled_other"    -> "Datos incorrectos";
            case "cc_rejected_call_for_authorize"  -> "Nequi bloqueó el pago. Verifica tu app";
            case "cc_rejected_other_reason"        -> "Nequi no procesó el pago. Intenta de nuevo";
            case "pending_waiting_transfer"        -> "Notificación enviada — espera en la app";
            case "pending_review_manual"           -> "En revisión por MercadoPago";
            default                                -> detail;
        };
    }
}
