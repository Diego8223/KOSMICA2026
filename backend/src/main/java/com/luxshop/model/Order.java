package com.luxshop.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * ✅ PARCHE v2 — Campos añadidos:
 *
 *  + pointsDiscount  → descuento en COP aplicado con puntos en este pedido
 *  + pointsRedeemed  → cantidad de puntos canjeados (para auditoría)
 *
 * El SQL V3__orders_points_columns.sql añade estas columnas a la BD.
 * Resto del archivo sin cambios.
 */
@Entity
@Table(name = "orders")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Order {

    public enum Status { PENDING, PAID, PROCESSING, SHIPPED, DELIVERED, CANCELLED }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_number", unique = true)
    private String orderNumber;

    @NotBlank
    @Column(name = "customer_name", nullable = false)
    private String customerName;

    @Email @NotBlank
    @Column(name = "customer_email", nullable = false)
    private String customerEmail;

    @Column(name = "phone")
    private String phone;

    @Column(name = "document")
    private String document;

    @Column(name = "city")
    private String city;

    @Column(name = "neighborhood")
    private String neighborhood;

    @Column(name = "shipping_address", columnDefinition = "TEXT")
    private String shippingAddress;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Builder.Default
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<OrderItem> items = new ArrayList<>();

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal subtotal;

    @Builder.Default
    @Column(name = "shipping_cost", precision = 10, scale = 2)
    private BigDecimal shippingCost = BigDecimal.ZERO;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal total;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    private Status status = Status.PENDING;

    @Column(name = "payment_id")
    private String paymentId;

    @Column(name = "payment_method")
    private String paymentMethod;

    @Column(name = "coupon_code")
    private String couponCode;

    @Builder.Default
    @Column(name = "coupon_discount", precision = 10, scale = 2)
    private BigDecimal couponDiscount = BigDecimal.ZERO;

    @Column(name = "gift_card_code")
    private String giftCardCode;

    @Builder.Default
    @Column(name = "gift_card_discount", precision = 10, scale = 2)
    private BigDecimal giftCardDiscount = BigDecimal.ZERO;

    @Column(name = "referral_code")
    private String referralCode;

    // ✅ NUEVO — puntos canjeados en este pedido
    /** Descuento en COP aplicado con puntos. Equivale a pointsRedeemed × $25. */
    @Builder.Default
    @Column(name = "points_discount", precision = 10, scale = 2)
    private BigDecimal pointsDiscount = BigDecimal.ZERO;

    /** Cantidad de puntos canjeados (para historial y auditoría). */
    @Builder.Default
    @Column(name = "points_redeemed")
    private Integer pointsRedeemed = 0;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = updatedAt = LocalDateTime.now();
        orderNumber = "KOSMICA-" + UUID.randomUUID().toString()
            .replace("-", "").substring(0, 10).toUpperCase();
        if (pointsDiscount == null)  pointsDiscount  = BigDecimal.ZERO;
        if (pointsRedeemed == null)  pointsRedeemed  = 0;
    }

    @PreUpdate
    protected void onUpdate() { updatedAt = LocalDateTime.now(); }
}
