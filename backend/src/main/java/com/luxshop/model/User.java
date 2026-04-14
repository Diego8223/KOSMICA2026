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
    private Integer points = 0;

    // ── Racha de check-in diario ──────────────────────────
    @Column(name = "checkin_streak", columnDefinition = "INT NOT NULL DEFAULT 0")
    private Integer checkinStreak = 0;

    @Column(name = "last_checkin_date")
    private LocalDate lastCheckinDate;

    // ── Racha de compras ──────────────────────────────────
    @Column(name = "purchase_streak", columnDefinition = "INT NOT NULL DEFAULT 0")
    private Integer purchaseStreak = 0;

    @Column(name = "last_purchase_date")
    private LocalDate lastPurchaseDate;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (points == null) points = 0;
        if (checkinStreak == null) checkinStreak = 0;
        if (purchaseStreak == null) purchaseStreak = 0;
    }
}
