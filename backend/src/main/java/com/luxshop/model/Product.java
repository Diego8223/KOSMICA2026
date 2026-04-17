package com.luxshop.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "products")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false, length = 200)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @NotNull
    @DecimalMin("0.01")
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal price;

    @Column(name = "original_price", precision = 12, scale = 2)
    private BigDecimal originalPrice;

    // ✅ FIX: String en lugar de @Enumerated — la BD tiene VARCHAR(100), no un tipo enum de Postgres
    @Column(nullable = false, length = 100)
    private String category = "";

    // ✅ FIX: eliminados badge, gallery, rating, reviewCount — no existen en la tabla SQL
    // Si los necesitas en el futuro, agrégalos primero en la BD con una migración ALTER TABLE

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(name = "image_url2", length = 500)
    private String imageUrl2;

    @Column(name = "image_url3", length = 500)
    private String imageUrl3;

    @Column(name = "video_url", length = 500)
    private String videoUrl;

    @Min(0)
    @Column(nullable = false)
    private Integer stock = 0;

    @Column(nullable = false)
    private Boolean featured = false;

    @Column(nullable = false)
    private Boolean active = true;

    @Column(length = 100)
    private String brand;

    @Column(length = 50, unique = true)
    private String sku;

    @Column(name = "weight_grams")
    private Integer weightGrams;

    @Column(columnDefinition = "TEXT")
    private String tags;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() { createdAt = updatedAt = LocalDateTime.now(); }

    @PreUpdate
    protected void onUpdate() { updatedAt = LocalDateTime.now(); }
}
