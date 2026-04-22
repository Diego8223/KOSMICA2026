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

    /**
     * POST /api/users/register
     * Registra una cuenta nueva o actualiza datos si el email ya existe.
     * Body: { name, email, phone, document, city, neighborhood, address }
     */
    @PostMapping("/register")
    public ResponseEntity<User> register(@RequestBody Map<String, Object> payload) {
        User user = userService.registerOrUpdate(payload);
        return ResponseEntity.ok(user);
    }

    /**
     * GET /api/users
     * Panel admin: lista todos los clientes registrados.
     */
    @GetMapping
    public ResponseEntity<List<User>> getAll() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    /**
     * GET /api/users/{email}
     * Obtiene un usuario por email (usado al hacer login para sincronizar puntos/racha desde BD).
     */
    @GetMapping("/{email}")
    public ResponseEntity<User> getByEmail(@PathVariable String email) {
        try {
            return ResponseEntity.ok(userService.getByEmail(email));
        } catch (EntityNotFoundException e) {
            // FIX: UserService lanza EntityNotFoundException, no IllegalArgumentException
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * POST /api/users/{email}/checkin
     * Registra el check-in diario del usuario: suma puntos y actualiza racha.
     * Responde con el usuario actualizado (incluye points y checkinStreak).
     */
    @PostMapping("/{email}/checkin")
    public ResponseEntity<User> checkin(@PathVariable String email) {
        try {
            return ResponseEntity.ok(userService.doCheckin(email));
        } catch (EntityNotFoundException e) {
            // FIX: UserService lanza EntityNotFoundException, no IllegalArgumentException
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * POST /api/users/{email}/purchase-points
     * Acredita puntos por compra. 1 pto = $36 COP.
     * Body: { "total": 120000 }
     */
    @PostMapping("/{email}/purchase-points")
    public ResponseEntity<User> purchasePoints(
            @PathVariable String email,
            @RequestBody Map<String, Object> body) {
        try {
            int total = ((Number) body.getOrDefault("total", 0)).intValue();
            return ResponseEntity.ok(userService.awardPurchasePoints(email, total));
        } catch (EntityNotFoundException e) {
            // FIX: UserService lanza EntityNotFoundException, no IllegalArgumentException
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * POST /api/users/{email}/add-points
     * Suma puntos manualmente (admin o eventos especiales).
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

    // ── Recuperación de contraseña ────────────────────────────

    /**
     * POST /api/users/forgot-password
     * Genera token y envía email con enlace de reset.
     * Body: { "email": "usuario@correo.com" }
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String,String>> forgotPassword(@RequestBody Map<String, Object> body) {
        String email = (String) body.getOrDefault("email", "");
        if (email.isBlank()) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "El correo es requerido"));
        }
        try {
            String token = userService.generateResetToken(email.trim().toLowerCase());
            // Obtener nombre del usuario para personalizar el email
            User user = userService.getByEmail(email.trim().toLowerCase());
            emailService.sendPasswordReset(user.getEmail(), user.getName(), token);
            return ResponseEntity.ok(Map.of("message", "Correo de recuperación enviado"));
        } catch (EntityNotFoundException e) {
            // Por seguridad respondemos OK aunque el email no exista (evitar enumerar usuarios)
            return ResponseEntity.ok(Map.of("message", "Correo de recuperación enviado"));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("message", "Correo de recuperación enviado"));
        }
    }

    /**
     * GET /api/users/reset-password/validate?token=xxx
     * Valida si el token es válido y no expiró. Devuelve el email asociado.
     */
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

    /**
     * POST /api/users/reset-password
     * Invalida el token y confirma el reset (el hash lo guarda el frontend en localStorage).
     * Body: { "token": "xxx", "passwordHash": "sha256hash" }
     */
    @PostMapping("/reset-password")
    public ResponseEntity<Map<String,String>> resetPassword(@RequestBody Map<String, Object> body) {
        String token = (String) body.getOrDefault("token", "");
        String hash  = (String) body.getOrDefault("passwordHash", "");
        if (token.isBlank() || hash.isBlank()) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Token y hash son requeridos"));
        }
        try {
            // Obtener email antes de invalidar el token
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
