package com.luxshop.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "gift_cards", indexes = {
    @Index(name = "idx_gc_code",      columnList = "code", unique = true),
    @Index(name = "idx_gc_recipient", columnList = "recipient_email"),
    @Index(name = "idx_gc_status",    columnList = "status")
})
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class GiftCard {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 20)
    private String code;                     // GIFT-XXXXXX

    @Column(nullable = false, length = 30)
    private String occasion;                 // birthday, mother, father...

    @Column(name = "occasion_label", length = 60)
    private String occasionLabel;            // "Cumpleaños", "Día de la Madre"...

    @Column(name = "original_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal originalAmount;       // monto original

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal balance;              // saldo disponible (decrece con cada uso)

    @Column(columnDefinition = "TEXT")
    private String message;                  // mensaje personalizado

    // ── Quien recibe ──
    @Column(name = "recipient_name", nullable = false, length = 100)
    private String recipientName;

    @Column(name = "recipient_email", nullable = false, length = 150)
    private String recipientEmail;

    // ── Quien regala ──
    @Column(name = "sender_name", nullable = false, length = 100)
    private String senderName;

    @Column(name = "sender_email", nullable = false, length = 150)
    private String senderEmail;

    @Column(name = "sender_phone", length = 20)
    private String senderPhone;

    // ── Estado ──
    @Builder.Default
    @Column(nullable = false, length = 20)
    private String status = "PENDING";
    // PENDING | ACTIVE | DEPLETED | EXPIRED

    @Column(name = "payment_id", length = 100)
    private String paymentId;

    // ── Timestamps ──
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "activated_at")
    private LocalDateTime activatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (status == null) status = "PENDING";
    }

    public boolean isActive() {
        return "ACTIVE".equals(status) && balance != null && balance.compareTo(BigDecimal.ZERO) > 0;
    }
}
