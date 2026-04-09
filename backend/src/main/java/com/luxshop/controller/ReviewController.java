package com.luxshop.controller;

import com.luxshop.model.Review;
import com.luxshop.service.ReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * ReviewController — Sistema de reseñas de productos
 *
 * Endpoints:
 *   GET    /api/products/{id}/reviews         → Reseñas paginadas (público)
 *   GET    /api/products/{id}/reviews/stats   → Stats: promedio + distribución (público)
 *   POST   /api/products/{id}/reviews         → Crear reseña (público, sin login)
 *   DELETE /api/products/{id}/reviews/{rid}   → Eliminar reseña (admin)
 *   PATCH  /api/products/{id}/reviews/{rid}/moderate → Aprobar/rechazar (admin)
 */
@RestController
@RequestMapping("/api/products/{productId}/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    // ── GET reseñas paginadas ─────────────────────────────────────
    @GetMapping
    public ResponseEntity<?> list(
            @PathVariable Long productId,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(reviewService.getReviews(productId, page, size));
    }

    // ── GET stats (promedio + distribución estrellas) ─────────────
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> stats(@PathVariable Long productId) {
        return ResponseEntity.ok(reviewService.getStats(productId));
    }

    // ── POST crear reseña ─────────────────────────────────────────
    @PostMapping
    public ResponseEntity<?> create(
            @PathVariable Long productId,
            @Valid @RequestBody Review review) {
        try {
            return ResponseEntity.ok(reviewService.createReview(productId, review));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ── DELETE eliminar reseña (admin) ────────────────────────────
    @DeleteMapping("/{reviewId}")
    public ResponseEntity<Void> delete(
            @PathVariable Long productId,
            @PathVariable Long reviewId) {
        reviewService.deleteReview(reviewId);
        return ResponseEntity.noContent().build();
    }

    // ── PATCH moderar reseña (admin) ──────────────────────────────
    @PatchMapping("/{reviewId}/moderate")
    public ResponseEntity<?> moderate(
            @PathVariable Long productId,
            @PathVariable Long reviewId,
            @RequestBody Map<String, Boolean> body) {
        boolean approved = Boolean.TRUE.equals(body.get("approved"));
        return ResponseEntity.ok(reviewService.moderateReview(reviewId, approved));
    }

    // ── GET todas las reseñas (admin, incluye rechazadas) ─────────
    @GetMapping("/all")
    public ResponseEntity<?> listAll(@PathVariable Long productId) {
        return ResponseEntity.ok(reviewService.getAllReviews(productId));
    }
}
