package com.luxshop.service;

import com.stripe.Stripe;
import com.stripe.model.PaymentIntent;
import com.stripe.param.PaymentIntentCreateParams;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.util.Map;

@Slf4j
@Service
public class PaymentService {

    @Value("${stripe.secret-key}")
    private String stripeSecretKey;

    public Map<String, String> createPaymentIntent(BigDecimal amount, String currency) throws Exception {
        Stripe.apiKey = stripeSecretKey;

        PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
            .setAmount(amount.multiply(new BigDecimal("100")).longValue())
            .setCurrency(currency.toLowerCase())
            .setAutomaticPaymentMethods(
                PaymentIntentCreateParams.AutomaticPaymentMethods.builder()
                    .setEnabled(true).build())
            .build();

        PaymentIntent intent = PaymentIntent.create(params);
        log.info("PaymentIntent creado: {}", intent.getId());

        return Map.of(
            "clientSecret", intent.getClientSecret(),
            "paymentIntentId", intent.getId()
        );
    }

    public boolean verifyPayment(String paymentIntentId) {
        try {
            Stripe.apiKey = stripeSecretKey;
            PaymentIntent intent = PaymentIntent.retrieve(paymentIntentId);
            return "succeeded".equals(intent.getStatus());
        } catch (Exception e) {
            log.error("Error verificando pago {}: {}", paymentIntentId, e.getMessage());
            return false;
        }
    }
}
