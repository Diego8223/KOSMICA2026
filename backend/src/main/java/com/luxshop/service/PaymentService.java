package com.luxshop.service;

import com.mercadopago.MercadoPagoConfig;
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
 * PaymentService — MercadoPago Checkout Pro
 *
 * Flujo:
 * 1. Frontend llama POST /api/orders/payment-intent con los items
 * 2. Backend crea una Preference en MercadoPago
 * 3. Backend devuelve init_point (URL de pago)
 * 4. Frontend redirige al cliente a esa URL
 * 5. Cliente paga en MercadoPago (tarjeta, PSE, Nequi, Efecty, etc)
 * 6. MercadoPago redirige de vuelta a la tienda con el resultado
 *
 * Obtén tus credenciales en:
 * https://www.mercadopago.com.co/developers/es/docs/your-integrations/credentials
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

        // Items de la preferencia
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
            // Item genérico si no se pasan detalles
            mpItems.add(PreferenceItemRequest.builder()
                .id("kosmica-order")
                .title(description)
                .quantity(1)
                .unitPrice(total)
                .currencyId("COP")
                .build());
        }

        // URLs de retorno
        PreferenceBackUrlsRequest backUrls = PreferenceBackUrlsRequest.builder()
            .success(storeUrl + "/?pago=exitoso")
            .failure(storeUrl + "/?pago=fallido")
            .pending(storeUrl + "/?pago=pendiente")
            .build();

        // Construir preferencia
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

        // Usar sandbox_init_point en TEST, init_point en producción
        String initPoint = accessToken.startsWith("TEST-")
            ? preference.getSandboxInitPoint()
            : preference.getInitPoint();

        return Map.of(
            "preferenceId",  preference.getId(),
            "initPoint",     initPoint != null ? initPoint : preference.getInitPoint(),
            "publicKey",     publicKey
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
