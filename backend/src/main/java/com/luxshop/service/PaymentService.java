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

    @Value("${store.name:Kosmica}")
    private String storeName;

    // FIX: PaymentClient y PreferenceClient como singletons.
    // Antes se instanciaban dentro de cada método (new PaymentClient() en cada request),
    // lo que creaba objetos innecesarios y no reutilizaba conexiones HTTP.
    // Con @PostConstruct no se puede usar fácilmente aquí porque accessToken se inyecta
    // después del constructor, así que usamos inicialización lazy con volatile.
    private volatile PaymentClient    paymentClient;
    private volatile PreferenceClient preferenceClient;

    private PaymentClient getPaymentClient() {
        if (paymentClient == null) {
            synchronized (this) {
                if (paymentClient == null) {
                    MercadoPagoConfig.setAccessToken(accessToken);
                    paymentClient = new PaymentClient();
                }
            }
        }
        return paymentClient;
    }

    private PreferenceClient getPreferenceClient() {
        if (preferenceClient == null) {
            synchronized (this) {
                if (preferenceClient == null) {
                    MercadoPagoConfig.setAccessToken(accessToken);
                    preferenceClient = new PreferenceClient();
                }
            }
        }
        return preferenceClient;
    }

    public Map<String, String> createPaymentIntent(BigDecimal amount, String currency) throws Exception {
        return createPreference(amount, "Compra en " + storeName, null);
    }

    public Map<String, String> createPreference(
            BigDecimal total,
            String description,
            List<Map<String, Object>> items) throws MPException, MPApiException {

        MercadoPagoConfig.setAccessToken(accessToken);
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

        Preference preference = getPreferenceClient().create(request);

        String initPoint = accessToken.startsWith("TEST-")
            ? preference.getSandboxInitPoint()
            : preference.getInitPoint();

        return Map.of(
            "preferenceId", preference.getId(),
            "initPoint",    initPoint != null ? initPoint : preference.getInitPoint(),
            "publicKey",    publicKey
        );
    }

    public Map<String, String> createNequiPayment(
            BigDecimal amount, String phone, String customerEmail,
            String customerName, String customerDocument, String orderId) throws Exception {

        if (accessToken == null
                || accessToken.startsWith("TEST-")
                || accessToken.equals("TEST-placeholder")
                || accessToken.equals("APP_USR-placeholder")) {
            throw new RuntimeException(
                "Nequi push requiere token de PRODUCCIÓN de MercadoPago (APP_USR-...). " +
                "Configura MERCADOPAGO_ACCESS_TOKEN con tu token productivo.");
        }

        String cleanPhone = phone.replaceAll("\\D", "");
        if (cleanPhone.startsWith("57") && cleanPhone.length() == 12) {
            cleanPhone = cleanPhone.substring(2);
        }
        if (cleanPhone.length() != 10) {
            throw new IllegalArgumentException(
                "El número Nequi debe tener 10 dígitos (ej: 3001234567). Se recibió: " + cleanPhone);
        }

        String email = (customerEmail != null && customerEmail.contains("@"))
            ? customerEmail
            : "cliente@" + storeName.toLowerCase().replaceAll("\\s", "") + ".com";

        String firstName = extractFirstName(customerName);
        String extRef    = storeName.toUpperCase().replaceAll("\\s", "") + "-NEQUI-"
            + (orderId != null ? orderId : System.currentTimeMillis());

        log.info("💜 Iniciando pago Nequi push → teléfono: {} | monto: {} | ref: {}",
            cleanPhone, amount, extRef);

        MercadoPagoConfig.setAccessToken(accessToken);

        String docNumber = (customerDocument != null && !customerDocument.isBlank())
            ? customerDocument.replaceAll("\\D", "") : "0000000000";

        PaymentCreateRequest paymentRequest = PaymentCreateRequest.builder()
            .transactionAmount(amount)
            .description("Compra en " + storeName)
            .paymentMethodId("nequi")
            .payer(PaymentPayerRequest.builder()
                .email(email)
                .firstName(firstName)
                .identification(IdentificationRequest.builder().type("CC").number(docNumber).build())
                .phone(PaymentPayerPhoneRequest.builder().areaCode("57").number(cleanPhone).build())
                .build())
            .externalReference(extRef)
            .notificationUrl(storeUrl + "/api/orders/webhook")
            .build();

        log.info("📋 Nequi request → phone: {} | doc: {} | email: {} | amount: {}",
            cleanPhone, docNumber, email, amount);

        Payment payment;
        try {
            payment = getPaymentClient().create(paymentRequest);
        } catch (MPApiException e) {
            String apiBody = "";
            try { apiBody = e.getApiResponse().getContent(); } catch (Exception ignored) {}
            int status = e.getStatusCode();

            log.error("❌ MPApiException Nequi | statusCode: {} | body: {}", status, apiBody);

            if (apiBody.contains("10102") || apiBody.contains("not_result_by_params")
                    || apiBody.contains("phone") || apiBody.contains("user not found")) {
                throw new RuntimeException("NEQUI_NOT_FOUND:" + cleanPhone);
            }
            if (apiBody.contains("payment_method") || apiBody.contains("not_allowed")) {
                throw new RuntimeException(
                    "Tu cuenta MercadoPago no tiene habilitado Nequi push.");
            }
            if (apiBody.contains("amount") || apiBody.contains("E101")) {
                throw new RuntimeException("Monto inválido para Nequi. El mínimo es $1.000 COP.");
            }
            if (status == 401) {
                throw new RuntimeException(
                    "Token de MercadoPago sin permisos para Nequi. Verifica credenciales.");
            }
            throw new RuntimeException("Error MP " + status + ": " +
                (apiBody.isBlank() ? e.getMessage() : apiBody));
        }

        log.info("✅ Pago Nequi creado: id={} | status={} | detail={}",
            payment.getId(), payment.getStatus(), payment.getStatusDetail());

        Map<String, String> result = new HashMap<>();
        result.put("paymentId",    String.valueOf(payment.getId()));
        result.put("status",       payment.getStatus());
        result.put("statusDetail", payment.getStatusDetail());
        result.put("phone",        cleanPhone);
        return result;
    }

    public boolean verifyPayment(String paymentId) {
        try {
            MercadoPagoConfig.setAccessToken(accessToken);
            Payment payment = getPaymentClient().get(Long.parseLong(paymentId));
            return "approved".equals(payment.getStatus());
        } catch (Exception e) {
            log.warn("⚠️ verifyPayment error para {}: {}", paymentId, e.getMessage());
            return false;
        }
    }

    public Map<String, String> getPaymentStatus(String paymentId) {
        try {
            MercadoPagoConfig.setAccessToken(accessToken);
            Payment payment = getPaymentClient().get(Long.parseLong(paymentId));
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

    private String extractFirstName(String fullName) {
        if (fullName == null || fullName.isBlank()) return "Cliente";
        return fullName.trim().split("\\s+")[0];
    }
}
