package com.luxshop.controller;

import com.luxshop.model.ReferralCode;
import com.luxshop.service.ReferralService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Endpoints del sistema "Invita y Gana".
 *
 *  POST /api/referrals/register          → Registrar usuario y obtener su código
 *  GET  /api/referrals/my-code/{email}   → Ver código activo (solo si ya registrado)
 *  GET  /api/referrals/validate/{code}?redeemerEmail=...  → Validar código
 *  GET  /api/referrals/history/{email}   → Historial de uso del código
 */
@Slf4j
@RestController
@RequestMapping("/api/referrals")
@RequiredArgsConstructor
public class ReferralController {

    private final ReferralService referralService;

    // ── 1. REGISTRARSE y obtener código ──────────────────────────────
    /**
     * El usuario se registra con nombre + email.
     * Si ya existe, devuelve su código activo.
     * Si es nuevo, genera uno nuevo automáticamente.
     *
     * Body: { "name": "Valentina", "email": "vale@gmail.com" }
     */
    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(
            @RequestBody Map<String, String> body) {

        String email = body.get("email");
        String name  = body.get("name");

        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest()
                .body(Map.of("success", false, "message", "Email requerido"));
        }
        if (name == null || name.isBlank()) {
            return ResponseEntity.badRequest()
                .body(Map.of("success", false, "message", "Nombre requerido"));
        }

        try {
            ReferralCode ref = referralService.getOrCreateCode(email, name);
            return ResponseEntity.ok(Map.of(
                "success",   true,
                "code",      ref.getCode(),
                "ownerName", ref.getOwnerName(),
                "used",      ref.getUsed(),
                "message",   "¡Tu código está listo para compartir! 🎁"
            ));
        } catch (Exception e) {
            log.error("Error registrando usuario referral: {}", e.getMessage());
            return ResponseEntity.internalServerError()
                .body(Map.of("success", false, "message", "Error generando código"));
        }
    }

    // ── 2. VER código activo de un usuario ───────────────────────────
    @GetMapping("/my-code/{email}")
    public ResponseEntity<Map<String, Object>> getMyCode(
            @PathVariable String email) {

        try {
            // getOrCreate sin nombre — si no existe retornamos 404 apropiado
            // En este endpoint solo consultamos, no creamos sin registro
            var history = referralService.getHistory(email);
            if (history.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of(
                    "success", false,
                    "message", "No tienes código aún. Regístrate primero."
                ));
            }
            // El más reciente y no usado
            ReferralCode active = history.stream()
                .filter(r -> !Boolean.TRUE.equals(r.getUsed()))
                .findFirst()
                .orElse(history.get(0)); // si todos usados, muestra el último

            return ResponseEntity.ok(Map.of(
                "success",   true,
                "code",      active.getCode(),
                "used",      active.getUsed(),
                "ownerName", active.getOwnerName() != null ? active.getOwnerName() : "",
                "redeemedBy",active.getRedeemedByName() != null ? active.getRedeemedByName() : "",
                "redeemedAt",active.getRedeemedAt() != null ? active.getRedeemedAt().toString() : ""
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                .body(Map.of("success", false, "message", "Error consultando código"));
        }
    }

    // ── 3. VALIDAR código antes de pagar ─────────────────────────────
    /**
     * El receptor valida el código antes de aplicarlo al carrito.
     * GET /api/referrals/validate/LUX-A3F9K2?redeemerEmail=comprador@gmail.com
     */
    @GetMapping("/validate/{code}")
    public ResponseEntity<Map<String, Object>> validate(
            @PathVariable String code,
            @RequestParam String redeemerEmail) {

        if (redeemerEmail == null || redeemerEmail.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of(
                "valid", false,
                "message", "Debes iniciar sesión para validar el código"
            ));
        }

        Map<String, Object> result = referralService.validateCode(code, redeemerEmail);
        return ResponseEntity.ok(result);
    }

    // ── 4. HISTORIAL del usuario ──────────────────────────────────────
    @GetMapping("/history/{email}")
    public ResponseEntity<List<ReferralCode>> getHistory(
            @PathVariable String email) {
        return ResponseEntity.ok(referralService.getHistory(email));
    }
}
