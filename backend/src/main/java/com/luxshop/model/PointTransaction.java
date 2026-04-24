package com.luxshop.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Registro inmutable de cada evento que afecta el saldo de puntos.
 * - points > 0 → puntos ganados
 * - points < 0 → puntos usados o expirados
 */
@Entity
@Table(name = "point_transactions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PointTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_email", nullable = false, length = 150)
    private String userEmail;

    /**
     * Tipo de transacción.
     * Valores válidos: PURCHASE, CHECKIN, SIGNUP, REFERRAL, REVIEW, REDEEM, ADMIN, EXPIRE
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TransactionType type;

    /** Puntos afectados (positivo = ganados, negativo = usados/expirados). */
    @Column(nullable = false)
    private Integer points;

    /** Descripción legible para mostrar al usuario en el historial. */
    @Column(nullable = false, length = 255)
    private String description;

    /** Número de pedido relacionado (solo PURCHASE y REDEEM). */
    @Column(name = "order_number", length = 30)
    private String orderNumber;

    /**
     * Fecha de expiración (solo transacciones con points > 0).
     * NULL = estos puntos no expiran (checkin, referidos, etc. sí expiran igual — ver reglas).
     */
    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    /**
     * Saldo disponible de ESTE lote de puntos (patrón FIFO para expiración).
     * Se va decrementando conforme se usan en canjes.
     * Cuando llega a 0, el lote está agotado.
     */
    @Column(name = "points_remaining", nullable = false)
    @Builder.Default
    private Integer pointsRemaining = 0;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (pointsRemaining == null) pointsRemaining = 0;
    }

    public enum TransactionType {
        PURCHASE,   // Compra normal
        CHECKIN,    // Check-in diario
        SIGNUP,     // Registro nuevo
        REFERRAL,   // Usuario referido hizo compra
        REVIEW,     // Reseña de producto
        REDEEM,     // Canje (descuento)
        ADMIN,      // Ajuste manual
        EXPIRE      // Expiración automática
    }
}
