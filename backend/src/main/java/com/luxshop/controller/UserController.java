package com.luxshop.controller;

import com.luxshop.exception.EntityNotFoundException;
import com.luxshop.model.User;
import com.luxshop.service.EmailService;
import com.luxshop.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final EmailService emailService;

    /** POST /api/users/register */
    @PostMapping("/register")
    public ResponseEntity<User> register(@RequestBody Map<String, Object> payload) {
        User user = userService.registerOrUpdate(payload);
        return ResponseEntity.ok(user);
    }

    /** GET /api/users — panel admin */
    @GetMapping
    public ResponseEntity<List<User>> getAll() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    /** GET /api/users/{email} — sincronizar puntos al login */
    @GetMapping("/{email}")
    public ResponseEntity<User> getByEmail(@PathVariable String email) {
        try {
            return ResponseEntity.ok(userService.getByEmail(email));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /** POST /api/users/{email}/checkin */
    @PostMapping("/{email}/checkin")
    public ResponseEntity<User> checkin(@PathVariable String email) {
        try {
            return ResponseEntity.ok(userService.doCheckin(email));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * POST /api/users/{email}/purchase-points
     * Body: { "total": 120000 }
     * Acredita puntos por compra respetando el límite diario acumulado.
     */
    @PostMapping("/{email}/purchase-points")
    public ResponseEntity<User> purchasePoints(
            @PathVariable String email,
            @RequestBody Map<String, Object> body) {
        try {
            int total = ((Number) body.getOrDefault("total", 0)).intValue();
            return ResponseEntity.ok(userService.awardPurchasePoints(email, total));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * POST /api/users/{email}/add-points
     * Suma puntos manualmente (admin / eventos especiales).
     * Body: { "points": 50 }
     */
    @PostMapping("/{email}/add-points")
    public ResponseEntity<User> addPoints(
            @PathVariable String email,
            @RequestBody Map<String, Object> body) {
        try {
            int pts = ((Number) body.getOrDefault("points", 0)).intValue();
            return ResponseEntity.ok(userService.addPoints(email, pts));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * POST /api/users/{email}/redeem-points
     * Descuenta puntos canjeados. Mínimo 500 pts.
     * Body: { "points": 500 }
     * Responde con el usuario actualizado o error si puntos insuficientes.
     */
    @PostMapping("/{email}/redeem-points")
    public ResponseEntity<?> redeemPoints(
            @PathVariable String email,
            @RequestBody Map<String, Object> body) {
        try {
            int pts = ((Number) body.getOrDefault("points", 0)).intValue();
            User updated = userService.redeemPoints(email, pts);
            return ResponseEntity.ok(updated);
        } catch (EntityNotFoundException e) {
            return ResponseEntity.notFound().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ── Recuperación de contraseña ────────────────────────────

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String,String>> forgotPassword(@RequestBody Map<String, Object> body) {
        String email = (String) body.getOrDefault("email", "");
        if (email.isBlank()) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "El correo es requerido"));
        }
        try {
            String token = userService.generateResetToken(email.trim().toLowerCase());
            User user = userService.getByEmail(email.trim().toLowerCase());
            emailService.sendPasswordReset(user.getEmail(), user.getName(), token);
            return ResponseEntity.ok(Map.of("message", "Correo de recuperación enviado"));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.ok(Map.of("message", "Correo de recuperación enviado"));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("message", "Correo de recuperación enviado"));
        }
    }

    @GetMapping("/reset-password/validate")
    public ResponseEntity<Map<String,Object>> validateResetToken(@RequestParam String token) {
        boolean valid = userService.validateResetToken(token);
        if (!valid) {
            return ResponseEntity.badRequest()
                .body(Map.of("valid", false, "error", "El enlace es inválido o ya expiró"));
        }
        try {
            String email = userService.getEmailByResetToken(token);
            return ResponseEntity.ok(Map.of("valid", true, "email", email));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.badRequest()
                .body(Map.of("valid", false, "error", "Token no encontrado"));
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Map<String,String>> resetPassword(@RequestBody Map<String, Object> body) {
        String token = (String) body.getOrDefault("token", "");
        String hash  = (String) body.getOrDefault("passwordHash", "");
        if (token.isBlank() || hash.isBlank()) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Token y hash son requeridos"));
        }
        try {
            String email = userService.getEmailByResetToken(token);
            userService.resetPassword(token, hash);
            return ResponseEntity.ok(Map.of(
                "message", "Contraseña actualizada correctamente",
                "email", email
            ));
        } catch (EntityNotFoundException | IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", e.getMessage()));
        }
    }
}
