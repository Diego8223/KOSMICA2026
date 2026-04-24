package com.luxshop.controller;

import com.luxshop.dto.PointsDtos.*;
import com.luxshop.exception.EntityNotFoundException;
import com.luxshop.service.PointsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * ╔══════════════════════════════════════════════════════════╗
 *  KOSMICA — PointsController.java
 *  Endpoints REST del sistema de puntos.
 *
 *  Base path: /api/points
 *
 *  Endpoints públicos (requieren email del usuario):
 *    GET  /api/points/balance/{email}
 *    GET  /api/points/history/{email}
 *    POST /api/points/add/purchase/{email}
 *    POST /api/points/add/bonus/{email}
 *    POST /api/points/checkin/{email}
 *    GET  /api/points/redeem/validate
 *    POST /api/points/redeem/{email}
 *
 *  Admin (requieren X-Admin-Key header):
 *    POST /api/points/expire/run  → ejecuta expiración manualmente
 * ╚══════════════════════════════════════════════════════════╝
 */
@Slf4j
@RestController
@RequestMapping("/api/points")
@RequiredArgsConstructor
public class PointsController {

    private final PointsService pointsService;

    // ══════════════════════════════════════════════════════════
    //  GET /api/points/balance/{email}
    //  Saldo, nivel, puntos por expirar, info de check-in.
    //  El frontend usa este endpoint para MOSTRAR todo.
    // ══════════════════════════════════════════════════════════
    @GetMapping("/balance/{email}")
    public ResponseEntity<PointsBalanceResponse> getBalance(@PathVariable String email) {
        try {
            return ResponseEntity.ok(pointsService.getBalance(email));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // ══════════════════════════════════════════════════════════
    //  GET /api/points/history/{email}?limit=20
    //  Historial de transacciones del usuario.
    // ══════════════════════════════════════════════════════════
    @GetMapping("/history/{email}")
    public ResponseEntity<List<TransactionHistoryItem>> getHistory(
            @PathVariable String email,
            @RequestParam(defaultValue = "20") int limit) {
        try {
            return ResponseEntity.ok(pointsService.getHistory(email, limit));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // ══════════════════════════════════════════════════════════
    //  POST /api/points/add/purchase/{email}
    //  Acreditar puntos por compra (llamado al confirmar pago).
    //
    //  Body: { "totalCop": 120000, "orderNumber": "ORD-001" }
    //  Response: { pointsAwarded, newBalance, pointsCappedByDailyLimit, ... }
    // ══════════════════════════════════════════════════════════
    @PostMapping("/add/purchase/{email}")
    public ResponseEntity<?> addPurchasePoints(
            @PathVariable String email,
            @RequestBody AddPurchasePointsRequest request) {
        try {
            return ResponseEntity.ok(pointsService.awardPurchasePoints(email, request));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.notFound().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ══════════════════════════════════════════════════════════
    //  POST /api/points/add/bonus/{email}
    //  Acreditar puntos por evento especial.
    //
    //  Body: { "type": "SIGNUP" | "REFERRAL" | "REVIEW" | "ADMIN",
    //          "reference": "product-123",  ← opcional
    //          "adminPoints": 100 }          ← solo para ADMIN
    // ══════════════════════════════════════════════════════════
    @PostMapping("/add/bonus/{email}")
    public ResponseEntity<?> addBonusPoints(
            @PathVariable String email,
            @RequestBody AddBonusPointsRequest request) {
        try {
            return ResponseEntity.ok(pointsService.awardBonusPoints(email, request));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.notFound().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ══════════════════════════════════════════════════════════
    //  POST /api/points/checkin/{email}
    //  Registrar check-in diario.
    //  Idempotente: si ya hizo check-in hoy, devuelve estado actual sin error.
    // ══════════════════════════════════════════════════════════
    @PostMapping("/checkin/{email}")
    public ResponseEntity<?> doCheckin(@PathVariable String email) {
        try {
            return ResponseEntity.ok(pointsService.doCheckin(email));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // ══════════════════════════════════════════════════════════
    //  GET /api/points/redeem/validate?email=X&orderTotal=Y&points=Z
    //  Valida si el canje es posible SIN ejecutarlo.
    //  Llamar en el checkout al cambiar la cantidad de puntos.
    //
    //  Response: { valid, errorCode, message, maxRedeemablePoints,
    //              maxRedeemableCop, availablePoints, pointValueCop, ... }
    // ══════════════════════════════════════════════════════════
    @GetMapping("/redeem/validate")
    public ResponseEntity<?> validateRedeem(
            @RequestParam String email,
            @RequestParam long orderTotal,
            @RequestParam(defaultValue = "500") int points) {
        try {
            return ResponseEntity.ok(
                pointsService.validateRedeem(email, orderTotal, points));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // ══════════════════════════════════════════════════════════
    //  POST /api/points/redeem/{email}
    //  Ejecutar el canje. Llama validate internamente.
    //
    //  Body: { "pointsToRedeem": 500,
    //          "orderTotalCop": 80000,
    //          "orderNumber": "ORD-001" }
    //
    //  Response: { pointsRedeemed, discountCop, newBalance, newOrderTotal }
    // ══════════════════════════════════════════════════════════
    @PostMapping("/redeem/{email}")
    public ResponseEntity<?> redeemPoints(
            @PathVariable String email,
            @RequestBody RedeemPointsRequest request) {
        try {
            return ResponseEntity.ok(pointsService.redeemPoints(email, request));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.notFound().build();
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ══════════════════════════════════════════════════════════
    //  POST /api/points/expire/run  [ADMIN]
    //  Ejecutar expiración manualmente (normalmente via @Scheduled).
    // ══════════════════════════════════════════════════════════
    @PostMapping("/expire/run")
    public ResponseEntity<Map<String, Object>> runExpiration() {
        try {
            int expired = pointsService.expireOldPoints();
            return ResponseEntity.ok(Map.of(
                "status",  "ok",
                "expired", expired
            ));
        } catch (Exception e) {
            log.error("[POINTS] Error en job de expiración: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError()
                .body(Map.of("status", "error", "message", e.getMessage()));
        }
    }
}
