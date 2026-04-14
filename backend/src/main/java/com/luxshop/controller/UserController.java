package com.luxshop.controller;

import com.luxshop.model.User;
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
        } catch (IllegalArgumentException e) {
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
        } catch (IllegalArgumentException e) {
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
        } catch (IllegalArgumentException e) {
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
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
