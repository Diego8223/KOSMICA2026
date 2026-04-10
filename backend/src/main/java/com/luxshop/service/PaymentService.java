package com.luxshop.service;

import com.mercadopago.MercadoPagoConfig;
import com.mercadopago.client.payment.PaymentClient;
import com.mercadopago.client.payment.PaymentCreateRequest;
import com.mercadopago.client.payment.PaymentPayerRequest;
import com.mercadopago.client.preference.*;
import com.mercadopago.client.common.PhoneRequest;
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

/**
 * PaymentService — MercadoPago Checkout Pro + Nequi directo (Payments API)
 * SDK: com.mercadopago:sdk-java:2.8.0
 *
 * NEQUI DIRECTO:
 *   Usa la Payments API (/v1/payments) con payment_method_id="nequi".
 *   MP envía push notification a la app Nequi del comprador.
 *   El cobro queda en estado PENDING hasta que el usuario aprueba en su app.
 *   NO redirige al sitio de MercadoPago.
 *
 * MERCADOPAGO (PSE, tarjetas, Efecty):
 *   Usa Checkout Pro (Preferences API). Redirige al checkout de MP con todos
 *   los métodos: PSE, tarjetas crédito/débito, Efecty, Bancolombia.
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

    // ── Crear preferencia de pago (compat.) ───────────────────
    public Map<String, String> createPaymentIntent(BigDecimal amount, String currency) throws Exception {
        return createPreference(amount, "Compra en " + storeName, null);
    }

    // ── Checkout Pro: PSE, tarjetas, Efecty, Bancolombia ──────
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
                if (unitPrice.compareTo(BigDecimal.ZERO) <= 0) continue; // Ignorar descuentos negativos

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
            // ✅ Sin exclusiones: PSE, tarjetas, Efecty disponibles
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

    // ── Nequi DIRECTO con Payments API ───────────────────────
    // Flujo correcto:
    //   1. Backend llama POST /v1/payments con payment_method_id="nequi"
    //   2. MercadoPago envía push notification al celular del comprador
    //   3. Comprador aprueba en su app Nequi → estado = "approved"
    //   4. MercadoPago llama nuestro webhook → pedido se marca PAID
    //   *** NO redirige a ningún sitio externo ***
    public Map<String, String> createNequiPayment(
            BigDecimal amount,
            String phone,
            String customerEmail,
            String customerName,
            String orderId) throws Exception {

        MercadoPagoConfig.setAccessToken(accessToken);

        String cleanPhone = phone.replaceAll("\\D", "");
        if (cleanPhone.length() != 10) {
            throw new IllegalArgumentException("El número Nequi debe tener 10 dígitos: " + cleanPhone);
        }

        String email = (customerEmail != null && !customerEmail.isBlank())
            ? customerEmail : "cliente@kosmica.com.co";

        PaymentCreateRequest paymentRequest = PaymentCreateRequest.builder()
            .transactionAmount(amount)
            .description("Compra en " + storeName + (orderId != null ? " #" + orderId : ""))
            .paymentMethodId("nequi")
            .payer(PaymentPayerRequest.builder()
                .email(email)
                .firstName(extractFirstName(customerName))
                .phone(PhoneRequest.builder()
                    .areaCode("57")
                    .number(cleanPhone)
                    .build())
                .build())
            .externalReference("KOSMICA-NEQUI-" + (orderId != null ? orderId : System.currentTimeMillis()))
            .notificationUrl(storeUrl + "/api/orders/webhook")
            .build();

        PaymentClient client = new PaymentClient();
        Payment payment = client.create(paymentRequest);

        log.info("Nequi Payments API: id={} status={} statusDetail={}",
            payment.getId(), payment.getStatus(), payment.getStatusDetail());

        if ("rejected".equals(payment.getStatus())) {
            throw new RuntimeException("Pago Nequi rechazado: " + humanizeNequiError(payment.getStatusDetail()));
        }

        Map<String, String> result = new HashMap<>();
        result.put("paymentId",    String.valueOf(payment.getId()));
        result.put("status",       payment.getStatus() != null ? payment.getStatus() : "pending");
        result.put("statusDetail", payment.getStatusDetail() != null ? payment.getStatusDetail() : "");
        result.put("phone",        cleanPhone);
        return result;
    }

    // Sobrecarga de compatibilidad para el controlador existente
    public Map<String, String> createNequiPayment(BigDecimal amount, String phone) throws Exception {
        return createNequiPayment(amount, phone, null, null, null);
    }

    // ── Verificar pago por payment_id (webhook) ───────────────
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

    private String extractFirstName(String fullName) {
        if (fullName == null || fullName.isBlank()) return "Cliente";
        return fullName.trim().split("\\s+")[0];
    }

    private String humanizeNequiError(String detail) {
        if (detail == null) return "Error desconocido";
        return switch (detail) {
            case "cc_rejected_insufficient_amount" -> "Saldo insuficiente en Nequi";
            case "cc_rejected_bad_filled_other"    -> "Datos incorrectos";
            case "pending_waiting_transfer"        -> "Esperando aprobación en app Nequi";
            case "pending_review_manual"           -> "En revisión por MercadoPago";
            default                                -> detail;
        };
    }
}
