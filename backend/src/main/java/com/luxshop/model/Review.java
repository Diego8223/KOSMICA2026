package com.luxshop.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Review — Reseñas de productos
 * La tabla ya existe en luxshop_database.sql.
 * Solo ejecutar el migration SQL si quieres agregar la columna "photos".
 */
@Entity
@Table(name = "reviews")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Review {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "product_id", nullable = false)
    private Long productId;

    @Column(name = "user_name", length = 100)
    private String userName;

    @Column(name = "user_email", length = 150)
    private String userEmail;

    @NotNull
    @Min(1) @Max(5)
    @Column(nullable = false)
    private Integer rating;

    @Column(columnDefinition = "TEXT")
    private String comment;

    // Foto de reseña (URL). Requiere ejecutar el migration SQL.
    @Column(name = "photo_url", length = 500)
    private String photoUrl;

    @Column(nullable = false)
    @Builder.Default
    private Boolean verified = false;

    // true = visible, false = moderación pendiente
    @Column(nullable = false)
    @Builder.Default
    private Boolean approved = true;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
