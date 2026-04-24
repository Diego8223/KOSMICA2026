package com.luxshop.constants;

/**
 * ╔══════════════════════════════════════════════════════════╗
 *  KOSMICA — PointsConstants.java
 *  Fuente única de verdad para TODAS las reglas de puntos.
 *
 *  ⚠️  NUNCA duplicar estas constantes en otro lugar.
 *  ⚠️  El frontend NUNCA calcula: solo muestra lo que el backend devuelve.
 * ╚══════════════════════════════════════════════════════════╝
 */
public final class PointsConstants {

    private PointsConstants() { /* utilidad estática */ }

    // ── Acumulación por compra ────────────────────────────────
    /**
     * Cada $1.000 COP gastados = 1 punto.
     * Fórmula: floor(totalCOP / POINTS_PER_COP_UNIT)
     *
     * ✅ CORRECTO: /1_000
     * ❌ INCORRECTO (bug anterior): /20  o  /36
     */
    public static final int POINTS_PER_COP_UNIT = 1_000;

    /** Límite acumulado de puntos ganados POR COMPRAS en un mismo día (por usuario). */
    public static final int DAILY_PURCHASE_LIMIT = 500;

    // ── Valor de redención ────────────────────────────────────
    /**
     * 1 punto vale $25 COP al momento del canje (descuento).
     * Ejemplo: 500 puntos = $12.500 COP
     *
     * Este valor debe coincidir exactamente en:
     *   - Backend (aquí)
     *   - Respuesta de la API
     *   - Lo que el frontend muestra al usuario
     */
    public static final int COP_PER_POINT = 25;

    // ── Reglas de redención ───────────────────────────────────
    /** Mínimo de puntos para iniciar un canje. */
    public static final int REDEEM_MIN_POINTS = 500;

    /** Valor mínimo del pedido (COP) para poder usar puntos. */
    public static final int REDEEM_MIN_ORDER_COP = 50_000;

    /**
     * Máximo porcentaje del total del pedido que puede cubrirse con puntos.
     * 0.30 = 30 %
     */
    public static final double REDEEM_MAX_ORDER_FRACTION = 0.30;

    // ── Bonos por eventos ─────────────────────────────────────
    /** Puntos al registrar cuenta nueva. */
    public static final int BONUS_SIGNUP = 20;

    /** Puntos al referir un usuario que realiza su primera compra. */
    public static final int BONUS_REFERRAL = 50;

    /** Puntos al publicar reseña de producto. */
    public static final int BONUS_REVIEW = 10;

    // ── Check-in diario ───────────────────────────────────────
    /** Puntos base por check-in (días 1-2 de racha). */
    public static final int CHECKIN_BASE = 5;

    /** Puntos por check-in en días 3–6 de racha consecutiva. */
    public static final int CHECKIN_MID = 10;

    /** Puntos por check-in en día 7 en adelante de racha. */
    public static final int CHECKIN_HIGH = 15;

    /** Día de racha a partir del cual aplica CHECKIN_MID. */
    public static final int CHECKIN_MID_DAY = 3;

    /** Día de racha a partir del cual aplica CHECKIN_HIGH. */
    public static final int CHECKIN_HIGH_DAY = 7;

    // ── Expiración ────────────────────────────────────────────
    /** Los puntos ganados expiran a los N días de inactividad (sin usar). */
    public static final int EXPIRY_DAYS = 60;

    // ── Niveles (tiers) ───────────────────────────────────────
    public static final int TIER_PREMIUM_MIN = 500;
    public static final int TIER_VIP_MIN     = 1_500;

    // ── Utilidades ────────────────────────────────────────────

    /**
     * Calcula puntos a otorgar por una compra.
     * Aplica la fórmula canónica: floor(totalCOP / 1_000)
     *
     * @param totalCOP monto total pagado en pesos colombianos
     * @return puntos brutos (antes de aplicar límite diario)
     */
    public static int calculatePurchasePoints(long totalCOP) {
        if (totalCOP <= 0) return 0;
        return (int) Math.floor((double) totalCOP / POINTS_PER_COP_UNIT);
    }

    /**
     * Convierte puntos a su equivalente en COP.
     * 1 punto = $25 COP
     */
    public static long pointsToCop(int points) {
        return (long) points * COP_PER_POINT;
    }

    /**
     * Convierte COP a puntos necesarios para cubrirlo.
     * Se redondea hacia arriba para no "perder" COP al usuario.
     */
    public static int copToPoints(long cop) {
        return (int) Math.ceil((double) cop / COP_PER_POINT);
    }

    /**
     * Máximo de puntos canjeables en una compra específica (30% del total).
     *
     * @param orderTotalCOP total del pedido sin descuento de puntos
     * @return máximo de puntos que se pueden usar
     */
    public static int maxRedeemablePoints(long orderTotalCOP) {
        long maxCopDiscount = Math.round(orderTotalCOP * REDEEM_MAX_ORDER_FRACTION);
        return (int) Math.floor((double) maxCopDiscount / COP_PER_POINT);
    }

    /**
     * Calcula puntos del check-in según la racha.
     *
     * @param streakDay día actual de la racha (1-based)
     * @return puntos a otorgar
     */
    public static int checkinPoints(int streakDay) {
        if (streakDay >= CHECKIN_HIGH_DAY) return CHECKIN_HIGH;
        if (streakDay >= CHECKIN_MID_DAY)  return CHECKIN_MID;
        return CHECKIN_BASE;
    }

    /**
     * Determina el nivel (tier) de un usuario según sus puntos actuales.
     */
    public static String calculateTier(int points) {
        if (points >= TIER_VIP_MIN)     return "VIP";
        if (points >= TIER_PREMIUM_MIN) return "PREMIUM";
        return "ESENCIAL";
    }
}
