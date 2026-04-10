package com.luxshop.service;

import com.mercadopago.MercadoPagoConfig;
import com.mercadopago.client.payment.*;
import com.mercadopago.client.preference.*;
import com.mercadopago.exceptions.MPApiException;
import com.mercadopago.exceptions.MPException;
import com.mercadopago.resources.preference.Preference;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * PaymentService — MercadoPago Checkout Pro + Nequi directo
 */
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

    // ── Crear preferencia de pago (reemplaza createPaymentIntent) ──
    public Map<String, String> createPaymentIntent(BigDecimal amount, String currency) throws Exception {
        return createPreference(amount, "Compra en " + storeName, null);
    }

    // ── Crear preferencia con items detallados ─────────────────────
    public Map<String, String> createPreference(
            BigDecimal total,
            String description,
            List<Map<String, Object>> items) throws MPException, MPApiException {

        MercadoPagoConfig.setAccessToken(accessToken);

        PreferenceClient client = new PreferenceClient();

        List<PreferenceItemRequest> mpItems = new ArrayList<>();

        if (items != null && !items.isEmpty()) {
            for (Map<String, Object> item : items) {
                mpItems.add(PreferenceItemRequest.builder()
                    .id(String.valueOf(item.getOrDefault("id", "prod")))
                    .title(String.valueOf(item.getOrDefault("name", "Producto")))
                    .description(String.valueOf(item.getOrDefault("description", "")))
                    .quantity(Integer.parseInt(String.valueOf(item.getOrDefault("quantity", 1))))
                    .unitPrice(new BigDecimal(String.valueOf(item.getOrDefault("price", total))))
                    .currencyId("COP")
                    .build());
            }
        } else {
            mpItems.add(PreferenceItemRequest.builder()
                .id("kosmica-order")
                .title(description)
                .quantity(1)
                .unitPrice(total)
                .currencyId("COP")
                .build());
        }

        PreferenceBackUrlsRequest backUrls = PreferenceBackUrlsRequest.builder()
            .success(storeUrl + "/?pago=exitoso")
            .failure(storeUrl + "/?pago=fallido")
            .pending(storeUrl + "/?pago=pendiente")
            .build();

        PreferenceRequest request = PreferenceRequest.builder()
            .items(mpItems)
            .backUrls(backUrls)
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
            "preferenceId",  preference.getId(),
            "initPoint",     initPoint != null ? initPoint : preference.getInitPoint(),
            "publicKey",     publicKey
        );
    }

    // ── Pago directo con Nequi ─────────────────────────────────────
    // Usa la Payments API de MercadoPago con payment_method_id = "nequi"
    // El cliente recibe una notificación push en su app Nequi para aprobar
    public Map<String, Object> createNequiPayment(BigDecimal amount, String phone) throws Exception {
        MercadoPagoConfig.setAccessToken(accessToken);

        // Normalizar teléfono: solo dígitos, 10 caracteres
        String cleanPhone = phone.replaceAll("\\D", "");
        if (cleanPhone.length() != 10) {
            throw new IllegalArgumentException("El número Nequi debe tener 10 dígitos");
        }

        PaymentClient paymentClient = new PaymentClient();

        PaymentCreateRequest paymentRequest = PaymentCreateRequest.builder()
            .transactionAmount(amount)
            .description("Compra en " + storeName)
            .paymentMethodId("nequi")
            .payer(PaymentPayerRequest.builder()
                .email("cliente@kosmica.com.co") // email genérico requerido por MP
                .identification(PaymentIdentificationRequest.builder()
                    .type("CC")
                    .number(cleanPhone)
                    .build())
                .build())
            .additionalInfo(PaymentAdditionalInfoRequest.builder()
                .payer(PaymentAdditionalInfoPayerRequest.builder()
                    .phone(PaymentAdditionalInfoPayerPhoneRequest.builder()
                        .number(cleanPhone)
                        .build())
                    .build())
                .build())
            .notificationUrl(storeUrl + "/api/orders/webhook")
            .externalReference("KOSMICA-NEQUI-" + System.currentTimeMillis())
            .build();

        com.mercadopago.resources.payment.Payment payment = paymentClient.create(paymentRequest);

        log.info("Nequi payment creado: id={} status={}", payment.getId(), payment.getStatus());

        return Map.of(
            "paymentId",  String.valueOf(payment.getId()),
            "status",     payment.getStatus(),
            "statusDetail", payment.getStatusDetail() != null ? payment.getStatusDetail() : ""
        );
    }

    // ── Verificar pago por payment_id (webhook o callback) ────────
    public boolean verifyPayment(String paymentId) {
        try {
            MercadoPagoConfig.setAccessToken(accessToken);
            com.mercadopago.client.payment.PaymentClient client =
                new com.mercadopago.client.payment.PaymentClient();
            com.mercadopago.resources.payment.Payment payment = client.get(Long.parseLong(paymentId));
            boolean approved = "approved".equals(payment.getStatus());
            log.info("Pago {} verificado: {}", paymentId, payment.getStatus());
            return approved;
        } catch (Exception e) {
            log.error("Error verificando pago {}: {}", paymentId, e.getMessage());
            return false;
        }
    }
}
