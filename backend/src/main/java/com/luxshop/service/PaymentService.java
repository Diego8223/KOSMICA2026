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

    @Value("${store.name:Kosmica}")
    private String storeName;

    // ── Checkout Pro ─────────────────────────────────────────
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
                    .id("kosmica-order")
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
                .externalReference("KOSMICA-" + System.currentTimeMillis())
                .notificationUrl(storeUrl + "/api/orders/webhook")
                .statementDescriptor(storeName)
                .build();

        Preference preference = client.create(request);

        String initPoint = accessToken.startsWith("TEST-")
                ? preference.getSandboxInitPoint()
                : preference.getInitPoint();

        return Map.of(
                "preferenceId", preference.getId(),
                "initPoint", initPoint != null ? initPoint : preference.getInitPoint(),
                "publicKey", publicKey
        );
    }

    // ── NEQUI DIRECTO (CORREGIDO) ───────────────────────────
    public Map<String, String> createNequiPayment(
            BigDecimal amount,
            String phone,
            String customerEmail,
            String customerName,
            String orderId) throws Exception {

        MercadoPagoConfig.setAccessToken(accessToken);

        if (accessToken == null || accessToken.startsWith("TEST-") || accessToken.equals("TEST-placeholder")) {
            throw new RuntimeException("Nequi requiere token de PRODUCCIÓN (APP_USR-...)");
        }

        String cleanPhone = phone.replaceAll("\\D", "");
        if (cleanPhone.length() != 10) {
            throw new IllegalArgumentException("El número Nequi debe tener 10 dígitos");
        }

        String email = (customerEmail != null && customerEmail.contains("@"))
                ? customerEmail
                : "cliente@kosmica.com.co";

        String firstName = extractFirstName(customerName);
        String extRef = "KOSMICA-NEQUI-" + (orderId != null ? orderId : System.currentTimeMillis());

        // 🔥 AQUÍ ESTABA EL ERROR (YA CORREGIDO)
        PaymentPayerPhoneRequest phoneRequest =
                PaymentPayerPhoneRequest.builder()
                        .areaCode("57")
                        .number(cleanPhone)
                        .build();

        PaymentCreateRequest paymentRequest =
                PaymentCreateRequest.builder()
                        .transactionAmount(amount)
                        .description("Compra en " + storeName)
                        .paymentMethodId("nequi")
                        .payer(PaymentPayerRequest.builder()
                                .email(email)
                                .firstName(firstName)
                                .phone(phoneRequest) // ✅ CORRECTO
                                .build())
                        .externalReference(extRef)
                        .notificationUrl(storeUrl + "/api/orders/webhook")
                        .build();

        PaymentClient client = new PaymentClient();
        Payment payment;

        try {
            payment = client.create(paymentRequest);
        } catch (MPApiException e) {
            throw new RuntimeException("Error MercadoPago: " + e.getMessage());
        }

        Map<String, String> result = new HashMap<>();
        result.put("paymentId", String.valueOf(payment.getId()));
        result.put("status", payment.getStatus());
        result.put("statusDetail", payment.getStatusDetail());
        result.put("phone", cleanPhone);

        return result;
    }

    public boolean verifyPayment(String paymentId) {
        try {
            MercadoPagoConfig.setAccessToken(accessToken);
            PaymentClient client = new PaymentClient();
            Payment payment = client.get(Long.parseLong(paymentId));
            return "approved".equals(payment.getStatus());
        } catch (Exception e) {
            return false;
        }
    }

    public Map<String, String> getPaymentStatus(String paymentId) {
        try {
            MercadoPagoConfig.setAccessToken(accessToken);
            PaymentClient client = new PaymentClient();
            Payment payment = client.get(Long.parseLong(paymentId));

            return Map.of(
                    "paymentId", paymentId,
                    "status", payment.getStatus(),
                    "statusDetail", payment.getStatusDetail()
            );

        } catch (Exception e) {
            return Map.of(
                    "paymentId", paymentId,
                    "status", "error",
                    "statusDetail", e.getMessage()
            );
        }
    }

    private String extractFirstName(String fullName) {
        if (fullName == null || fullName.isBlank()) return "Cliente";
        return fullName.split(" ")[0];
    }
}