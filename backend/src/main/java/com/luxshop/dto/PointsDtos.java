package com.luxshop.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

// ══════════════════════════════════════════════════════════════
//  DTOs del sistema de puntos — KOSMICA
//  El frontend SOLO usa estos objetos. Nunca calcula nada.
// ══════════════════════════════════════════════════════════════

public class PointsDtos {

    // ── Request: sumar puntos por compra ─────────────────────
    @Data
    public static class AddPurchasePointsRequest {
        /** Total pagado en COP (sin IVA ni descuentos de puntos). */
        private long totalCop;
        /** Número de orden (para auditoría). */
        private String orderNumber;
    }

    // ── Request: sumar puntos por evento ─────────────────────
    @Data
    public static class AddBonusPointsRequest {
        /** Tipo: SIGNUP, REFERRAL, REVIEW, ADMIN */
        private String type;
        /** Contexto opcional (ej: productId para REVIEW). */
        private String reference;
        /** Puntos a otorgar (solo para ADMIN). */
        private Integer adminPoints;
    }

    // ── Request: canjear puntos ───────────────────────────────
    @Data
    public static class RedeemPointsRequest {
        /** Puntos que el usuario quiere canjear (mínimo 500). */
        private int pointsToRedeem;
        /** Total del pedido en COP (para validar el 30% máximo y el mínimo de $50k). */
        private long orderTotalCop;
        /** Número de orden (para auditoría). */
        private String orderNumber;
    }

    // ── Response: saldo y resumen ─────────────────────────────
    @Data @Builder
    public static class PointsBalanceResponse {
        /** Saldo actual de puntos. */
        private int balance;

        /** Equivalente en COP del saldo (balance × 25). */
        private long balanceCop;

        /** Nivel del usuario: ESENCIAL, PREMIUM, VIP. */
        private String tier;

        /** Puntos mínimos del nivel actual. */
        private int tierMinPoints;

        /** Puntos necesarios para el siguiente nivel (null si ya es VIP). */
        private Integer nextTierPoints;

        /** Puntos que expiran en los próximos 7 días. */
        private int expiringIn7Days;

        /** Puede canjear puntos en este momento. */
        private boolean canRedeem;

        /** Mínimo de puntos para canjear (siempre 500). */
        private int redeemMinPoints;

        /** Valor en COP de los puntos mínimos ($12.500). */
        private long redeemMinCop;

        /** Racha de check-in actual. */
        private int checkinStreak;

        /** Fecha del último check-in. */
        private LocalDate lastCheckinDate;

        /** ¿Ya hizo check-in hoy? */
        private boolean checkedInToday;

        /** Puntos que recibirá si hace check-in ahora. */
        private int nextCheckinPoints;
    }

    // ── Response: resultado de añadir puntos ─────────────────
    @Data @Builder
    public static class AddPointsResponse {
        /** Puntos otorgados en esta transacción. */
        private int pointsAwarded;

        /** Saldo nuevo después de la operación. */
        private int newBalance;

        /** Puntos que NO se acreditaron por límite diario (solo en PURCHASE). */
        private int pointsCappedByDailyLimit;

        /** Puntos ganados hoy por compras (incluyendo esta transacción). */
        private int dailyEarned;

        /** Espacio restante del límite diario. */
        private int dailyRemaining;

        /** Nivel actualizado. */
        private String tier;
    }

    // ── Response: resultado de un canje ──────────────────────
    @Data @Builder
    public static class RedeemResponse {
        /** Puntos efectivamente canjeados. */
        private int pointsRedeemed;

        /** Descuento en COP aplicado (pointsRedeemed × 25). */
        private long discountCop;

        /** Saldo de puntos después del canje. */
        private int newBalance;

        /** Total del pedido después de descontar puntos. */
        private long newOrderTotal;
    }

    // ── Response: validación de canje (antes de confirmar) ───
    @Data @Builder
    public static class RedeemValidationResponse {
        private boolean valid;
        private String  errorCode;    // null si valid=true
        private String  message;

        // Si es válido:
        /** Máximo de puntos canjeables en este pedido (30% del total). */
        private int maxRedeemablePoints;

        /** Equivalente COP del máximo canjeable. */
        private long maxRedeemableCop;

        /** Puntos disponibles del usuario. */
        private int availablePoints;

        /** Saldo en COP disponible. */
        private long availableCop;

        // Constantes para mostrar en UI:
        /** 1 punto = $25 COP (siempre). */
        private int pointValueCop;

        /** Mínimo para canjear: 500 pts. */
        private int minRedeemPoints;

        /** Mínimo del pedido para usar puntos: $50.000 COP. */
        private long minOrderCop;
    }

    // ── Response: historial ───────────────────────────────────
    @Data @Builder
    public static class TransactionHistoryItem {
        private Long   id;
        private String type;
        private int    points;
        private String description;
        private String orderNumber;
        private String expiresAt;    // ISO date string, null si no expira
        private String createdAt;
        private boolean expired;
    }
}
