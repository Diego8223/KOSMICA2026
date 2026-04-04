package com.luxshop.controller;

import com.luxshop.service.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * ✅ CUPÓN DE BIENVENIDA
 *
 * Cuando la clienta ingresa su email en el popup de bienvenida,
 * el frontend llama POST /api/coupons/welcome y este controlador:
 *   1. Envía el código BIENVENIDA10 al correo de la clienta
 *   2. Envía el código por WhatsApp al número que ella puso
 *      (si lo ingresó; si no, solo correo)
 *
 * INSTALACIÓN:
 *   Copiar a: backend/src/main/java/com/luxshop/controller/WelcomeController.java
 */
@Slf4j
@RestController
@RequestMapping("/api/coupons")
@RequiredArgsConstructor
public class WelcomeController {

    private final EmailService emailService;

    @PostMapping("/welcome")
    public ResponseEntity<Map<String, String>> sendWelcomeCoupon(
            @RequestBody Map<String, String> body) {

        String email = body.get("email");
        String phone = body.get("phone"); // opcional — puede ser null
        String code  = body.getOrDefault("code", "BIENVENIDA10");

        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Email requerido"));
        }

        try {
            // 1. Enviar correo con el cupón
            emailService.sendWelcomeCoupon(email, code);
            log.info("💌 Cupón {} enviado por email a {}", code, email);

            // 2. Enviar WhatsApp si tiene teléfono
            if (phone != null && !phone.isBlank()) {
                String cleanPhone = phone.replaceAll("[^0-9]", "");
                if (!cleanPhone.startsWith("57")) cleanPhone = "57" + cleanPhone;
                emailService.sendWelcomeCouponWhatsapp(cleanPhone, code);
                log.info("💬 Cupón {} enviado por WhatsApp a {}", code, cleanPhone);
            }

            return ResponseEntity.ok(Map.of(
                "status", "ok",
                "message", "Cupón enviado exitosamente"
            ));

        } catch (Exception e) {
            log.warn("No se pudo enviar el cupón de bienvenida: {}", e.getMessage());
            // Responder ok igual — el cupón ya se mostró en pantalla al cliente
            return ResponseEntity.ok(Map.of(
                "status", "ok",
                "message", "Cupón disponible en pantalla"
            ));
        }
    }
}
