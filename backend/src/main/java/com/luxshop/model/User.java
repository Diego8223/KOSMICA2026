package com.luxshop.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
@Entity
@Table(name = "users")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, unique = true, length = 150)
    private String email;

    @Column(length = 20)
    private String phone;

    @Column(length = 30)
    private String document;

    @Column(length = 100)
    private String city;

    @Column(length = 100)
    private String neighborhood;

    @Column(columnDefinition = "TEXT")
    private String address;

    // ── Puntos Kosmica ────────────────────────────────────
    @Column(name = "points", columnDefinition = "INT NOT NULL DEFAULT 0")
    @Builder.Default
    private Integer points = 0;

    // ── Racha de check-in diario ──────────────────────────
    @Column(name = "checkin_streak", columnDefinition = "INT NOT NULL DEFAULT 0")
    @Builder.Default
    private Integer checkinStreak = 0;

    @Column(name = "last_checkin_date")
    private LocalDate lastCheckinDate;

    // ── Racha de compras ──────────────────────────────────
    @Column(name = "purchase_streak", columnDefinition = "INT NOT NULL DEFAULT 0")
    @Builder.Default
    private Integer purchaseStreak = 0;

    @Column(name = "last_purchase_date")
    private LocalDate lastPurchaseDate;

    // ── Límite diario de puntos por compras ───────────────
    // Acumula los puntos ganados HOY por compras; se resetea al cambiar el día.
    @Column(name = "daily_points_earned", columnDefinition = "INT NOT NULL DEFAULT 0")
    @Builder.Default
    private Integer dailyPointsEarned = 0;

    @Column(name = "last_points_date")
    private LocalDate lastPointsDate;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    // ── Contraseña (hash SHA-256 desde el frontend) ───────────
    @Column(name = "password_hash", length = 64)
    private String passwordHash;

    // ── Recuperación de contraseña ────────────────────────────
    @Column(name = "reset_token", length = 100)
    private String resetToken;

    @Column(name = "reset_token_expiry")
    private LocalDateTime resetTokenExpiry;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (points == null) points = 0;
        if (checkinStreak == null) checkinStreak = 0;
        if (purchaseStreak == null) purchaseStreak = 0;
        if (dailyPointsEarned == null) dailyPointsEarned = 0;
    }
}
