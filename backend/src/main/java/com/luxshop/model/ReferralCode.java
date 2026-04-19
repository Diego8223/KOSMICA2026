package com.luxshop.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Sistema "Invita y Gana" — Kosmica
 *
 * Reglas de negocio:
 *  1. Solo usuarios REGISTRADOS pueden obtener su código.
 *  2. El código se genera automáticamente (KOS-XXXXXX) al registrarse o pedirlo.
 *  3. Solo lo puede redimir quien LO RECIBIÓ (el receptor), no el dueño del código.
 *  4. Cada código es de USO ÚNICO — no se puede reutilizar.
 *  5. Se lleva control de: quién envió, quién redimió, en qué orden y cuándo.
 */
@Entity
@Table(name = "referral_codes", indexes = {
    @Index(name = "idx_ref_code",        columnList = "code",        unique = true),
    @Index(name = "idx_ref_owner_email", columnList = "owner_email"),
    @Index(name = "idx_ref_redeemer",    columnList = "redeemed_by_email")
})
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class ReferralCode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Código único: KOS-A3F9K2 */
    @Column(nullable = false, unique = true, length = 20)
    private String code;

    /** Email del usuario que GENERÓ / POSEE el código */
    @Column(name = "owner_email", nullable = false, length = 150)
    private String ownerEmail;

    /** Nombre del dueño del código (para mensajes amigables) */
    @Column(name = "owner_name", length = 100)
    private String ownerName;

    /** Teléfono/WhatsApp del dueño del código */
    @Column(name = "owner_phone", length = 20)
    private String ownerPhone;

    /** Aceptó tratamiento de datos personales (Ley 1581/2012) */
    @Builder.Default
    @Column(name = "data_consent", nullable = false)
    private Boolean dataConsent = false;

    /** Fecha y hora exacta en que aceptó el tratamiento de datos */
    @Column(name = "data_consent_at")
    private LocalDateTime dataConsentAt;

    /** ¿Ha sido redimido ya? */
    @Builder.Default
    @Column(nullable = false)
    private Boolean used = false;

    /** Email de quien REDIMIÓ el código (receptor del link) */
    @Column(name = "redeemed_by_email", length = 150)
    private String redeemedByEmail;

    /** Nombre de quien redimió */
    @Column(name = "redeemed_by_name", length = 100)
    private String redeemedByName;

    /** ID del pedido donde se aplicó el descuento */
    @Column(name = "redeemed_in_order", length = 30)
    private String redeemedInOrder;

    /** Cuándo fue redimido */
    @Column(name = "redeemed_at")
    private LocalDateTime redeemedAt;

    /**
     * Cupón de recompensa generado para el DUEÑO del código (15% de descuento).
     * Se genera automáticamente al momento de la redención.
     * Formato: REF15-XXXXXX
     */
    @Column(name = "reward_coupon_code", length = 20)
    private String rewardCouponCode;

    /** Cuándo se generó el cupón de recompensa */
    @Column(name = "reward_coupon_generated_at")
    private LocalDateTime rewardCouponGeneratedAt;

    /** Cuándo se creó */
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (used == null) used = false;
    }
}
