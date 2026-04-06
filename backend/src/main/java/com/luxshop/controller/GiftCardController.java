package com.luxshop.controller;

import com.luxshop.model.GiftCard;
import com.luxshop.service.GiftCardService;
import com.luxshop.service.PaymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * FIX #2 — GiftCardController.java
 *
 * PROBLEMA: el endpoint /purchase activaba la tarjeta inmediatamente
 * (giftCardService.activateGiftCard con "MANUAL") sin pasar por
 * MercadoPago, permitiendo obtener una tarjeta activa sin pagar.
 *
 * SOLUCIÓN:
 *   1. /purchase → crea la tarjeta en estado PENDING y genera
 *      una preferencia real de MercadoPago, devuelve paymentUrl.
 *   2. /activate → solo se llama desde el webhook cuando MP confirma.
 *   3. El webhook en OrderController ya recibe el evento "payment"
 *      y debe llamar a giftCardService.activateGiftCard(code, paymentId)
 *      (ver FIX #3 – OrderController).
 */
@Slf4j
@RestController
@RequestMapping("/api/gift-cards")
@RequiredArgsConstructor
public class GiftCardController {

    private final GiftCardService giftCardService;
    private final PaymentService  paymentService;   // ← NUEVO: inyectar PaymentService

    // ── 1. COMPRAR tarjeta — crea PENDING + genera preferencia MP ──
    @PostMapping("/purchase")
    public ResponseEntity<Map<String, Object>> purchase(
            @RequestBody Map<String, Object> body) {
        try {
            String occasion      = (String) body.get("occasion");
            String occasionLabel = (String) body.get("occasionLabel");
            BigDecimal amount    = new BigDecimal(body.get("amount").toString());
            String message       = (String) body.getOrDefault("message", "");
            String recipientName = (String) body.get("recipientName");
            String recipientEmail= (String) body.get("recipientEmail");
            String senderName    = (String) body.get("senderName");
            String senderEmail   = (String) body.get("senderEmail");
            String senderPhone   = (String) body.getOrDefault("senderPhone", "");

            if (occasion == null || amount == null || amount.compareTo(new BigDecimal("10000")) < 0) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false, "message", "Monto mínimo $10.000 y ocasión requerida"));
            }

            // 1. Crear tarjeta en estado PENDING (NO activar aquí)
            GiftCard gc = giftCardService.createGiftCard(
                occasion, occasionLabel, amount, message,
                recipientName, recipientEmail,
                senderName, senderEmail, senderPhone
            );

            // 2. Crear preferencia real en MercadoPago
            List<Map<String, Object>> mpItems = List.of(Map.of(
                "id",          gc.getCode(),
                "name",        "Tarjeta de Regalo Kosmica — " + (occasionLabel != null ? occasionLabel : occasion),
                "description", "Para: " + recipientName + (message != null && !message.isBlank() ? " | " + message : ""),
                "quantity",    1,
                "price",       amount
            ));

            Map<String, String> mpResult = paymentService.createPreference(
                amount,
                "Tarjeta de Regalo Kosmica",
                mpItems
            );

            // Guardar el preferenceId en la tarjeta para rastreo en webhook
            giftCardService.savePendingPaymentId(gc.getCode(), mpResult.get("preferenceId"));

            log.info("🎁 Tarjeta {} creada PENDING | preferenceId: {}", gc.getCode(), mpResult.get("preferenceId"));

            return ResponseEntity.ok(Map.of(
                "success",    true,
                "code",       gc.getCode(),
                "amount",     gc.getOriginalAmount(),
                "paymentUrl", mpResult.get("initPoint"),     // ← Frontend abre esta URL
                "preferenceId", mpResult.get("preferenceId"),
                "message",    "Redirigiendo a MercadoPago para completar el pago..."
            ));

        } catch (Exception e) {
            log.error("Error creando tarjeta de regalo: {}", e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of(
                "success", false, "message", "Error creando tarjeta. Intenta de nuevo."));
        }
    }

    // ── 2. ACTIVAR después de pago confirmado (llamado desde webhook) ──
    @PostMapping("/activate")
    public ResponseEntity<Map<String, Object>> activate(
            @RequestBody Map<String, String> body) {
        try {
            String code      = body.get("code");
            String paymentId = body.get("paymentId");
            GiftCard gc = giftCardService.activateGiftCard(code, paymentId);
            return ResponseEntity.ok(Map.of(
                "success", true,
                "code",    gc.getCode(),
                "balance", gc.getBalance()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false, "message", e.getMessage()));
        }
    }

    // ── 3. VALIDAR saldo ─────────────────────────────────────────
    @GetMapping("/validate/{code}")
    public ResponseEntity<Map<String, Object>> validate(
            @PathVariable String code) {
        Map<String, Object> result = giftCardService.validateGiftCard(code);
        return ResponseEntity.ok(result);
    }

    // ── 4. REDIMIR al confirmar pedido ───────────────────────────
    @PostMapping("/redeem")
    public ResponseEntity<Map<String, Object>> redeem(
            @RequestBody Map<String, Object> body) {
        try {
            String code          = (String) body.get("code");
            BigDecimal amount    = new BigDecimal(body.get("amount").toString());
            String orderNumber   = (String) body.get("orderNumber");
            String redeemerEmail = (String) body.getOrDefault("redeemerEmail", "");

            Map<String, Object> result = giftCardService.redeemGiftCard(
                code, amount, orderNumber, redeemerEmail);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                "success", false, "message", "Error aplicando tarjeta: " + e.getMessage()));
        }
    }

    // ── 5. RECARGAR (admin) ──────────────────────────────────────
    @PostMapping("/reload")
    public ResponseEntity<Map<String, Object>> reload(
            @RequestBody Map<String, Object> body) {
        try {
            String code       = (String) body.get("code");
            BigDecimal amount = new BigDecimal(body.get("amount").toString());
            GiftCard gc = giftCardService.reloadGiftCard(code, amount);
            return ResponseEntity.ok(Map.of(
                "success",    true,
                "code",       gc.getCode(),
                "newBalance", gc.getBalance(),
                "message",    "Tarjeta recargada exitosamente"
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false, "message", e.getMessage()));
        }
    }

    // ── 6. LISTAR todas (admin) ──────────────────────────────────
    @GetMapping("/all")
    public ResponseEntity<List<GiftCard>> getAll() {
        return ResponseEntity.ok(giftCardService.getAllGiftCards());
    }

    // ── 7. Las mías (por sender) ─────────────────────────────────
    @GetMapping("/by-sender/{email}")
    public ResponseEntity<List<GiftCard>> getBySender(
            @PathVariable String email) {
        return ResponseEntity.ok(giftCardService.getGiftCardsBySender(email));
    }
}
