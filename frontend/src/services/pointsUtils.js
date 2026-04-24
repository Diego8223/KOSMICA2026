/**
 * ╔══════════════════════════════════════════════════════════╗
 *  KOSMICA — pointsUtils.js
 *
 *  ⚠️  REGLA FUNDAMENTAL:
 *  Este archivo SOLO contiene helpers de VISUALIZACIÓN.
 *  NUNCA calcula puntos, límites ni descuentos.
 *  Todo cálculo viene del backend.
 *
 *  El frontend debe:
 *    ✅ Llamar a la API
 *    ✅ Mostrar los datos recibidos
 *    ❌ NUNCA hacer: total / 1000, points * 25, etc.
 * ╚══════════════════════════════════════════════════════════╝
 */

// ── Formateo ──────────────────────────────────────────────────

/**
 * Formatea un valor en COP para mostrar al usuario.
 * Ejemplo: 12500 → "$12.500"
 */
export const formatCOP = (amount) => {
  if (amount == null) return "$0";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Formatea un número de puntos.
 * Ejemplo: 1500 → "1.500 pts"
 */
export const formatPoints = (points) => {
  if (points == null) return "0 pts";
  return `${new Intl.NumberFormat("es-CO").format(points)} pts`;
};

// ── Nivel (tier) ──────────────────────────────────────────────

/** Configuración visual de cada nivel (viene del backend como string). */
export const TIER_CONFIG = {
  ESENCIAL: {
    label:     "Esencial",
    color:     "#6B7280",
    bgColor:   "#F3F4F6",
    emoji:     "⭐",
    nextLabel: "Premium",
  },
  PREMIUM: {
    label:     "Premium",
    color:     "#7C3AED",
    bgColor:   "#EDE9FE",
    emoji:     "💎",
    nextLabel: "VIP",
  },
  VIP: {
    label:     "VIP",
    color:     "#B45309",
    bgColor:   "#FEF3C7",
    emoji:     "👑",
    nextLabel: null,
  },
};

/**
 * Devuelve la configuración visual del nivel.
 * @param {string} tier — "ESENCIAL" | "PREMIUM" | "VIP" (viene del backend)
 */
export const getTierConfig = (tier) => {
  return TIER_CONFIG[tier] || TIER_CONFIG.ESENCIAL;
};

/**
 * Calcula el porcentaje de progreso hacia el siguiente nivel.
 * Todos los datos vienen de la respuesta del backend (PointsBalanceResponse).
 *
 * @param {object} balance — respuesta de GET /api/points/balance/{email}
 * @returns {number} 0–100
 */
export const getTierProgressPercent = (balance) => {
  if (!balance || balance.tier === "VIP") return 100;
  const current = balance.balance;
  const min     = balance.tierMinPoints;
  const next    = balance.nextTierPoints;
  if (next == null || next <= min) return 100;
  return Math.min(100, Math.round(((current - min) / (next - min)) * 100));
};

// ── Check-in ──────────────────────────────────────────────────

/**
 * Describe los puntos que recibirá el usuario con el check-in.
 * El valor nextCheckinPoints viene del backend.
 */
export const getCheckinLabel = (balance) => {
  if (!balance) return "";
  if (balance.checkedInToday) return "✅ Check-in realizado hoy";
  return `+${balance.nextCheckinPoints} pts por check-in`;
};

/**
 * Emoji de racha de check-in.
 */
export const getStreakEmoji = (streak) => {
  if (streak >= 7)  return "🔥";
  if (streak >= 3)  return "⚡";
  return "✨";
};

// ── Resumen de canje ──────────────────────────────────────────

/**
 * Construye el texto de resumen del canje para el checkout.
 * TODOS los valores vienen de la respuesta de la API.
 *
 * @param {object} redeemResult — respuesta de POST /api/points/redeem/{email}
 * @returns {string}
 */
export const buildRedeemSummary = (redeemResult) => {
  if (!redeemResult) return "";
  return (
    `Aplicaste ${formatPoints(redeemResult.pointsRedeemed)} ` +
    `— descuento de ${formatCOP(redeemResult.discountCop)}`
  );
};

// ── Historial ─────────────────────────────────────────────────

/** Etiquetas legibles por tipo de transacción. */
export const TRANSACTION_LABELS = {
  PURCHASE: { label: "Compra",        icon: "🛍️",  color: "#059669" },
  CHECKIN:  { label: "Check-in",      icon: "📅",  color: "#2563EB" },
  SIGNUP:   { label: "Bienvenida",    icon: "🎉",  color: "#7C3AED" },
  REFERRAL: { label: "Referido",      icon: "👥",  color: "#D97706" },
  REVIEW:   { label: "Reseña",        icon: "⭐",  color: "#0891B2" },
  REDEEM:   { label: "Canje",         icon: "💸",  color: "#DC2626" },
  ADMIN:    { label: "Ajuste",        icon: "🔧",  color: "#6B7280" },
  EXPIRE:   { label: "Expiración",    icon: "⏰",  color: "#9CA3AF" },
};

export const getTransactionLabel = (type) =>
  TRANSACTION_LABELS[type] || { label: type, icon: "•", color: "#6B7280" };

/**
 * Formatea la fecha de expiración de forma amigable.
 * @param {string|null} expiresAt — ISO date del backend
 */
export const formatExpiry = (expiresAt) => {
  if (!expiresAt) return null;
  const date  = new Date(expiresAt);
  const now   = new Date();
  const days  = Math.ceil((date - now) / (1000 * 60 * 60 * 24));
  if (days < 0)  return "Expirado";
  if (days === 0) return "Expira hoy";
  if (days === 1) return "Expira mañana";
  if (days <= 7)  return `Expira en ${days} días ⚠️`;
  return `Vence ${date.toLocaleDateString("es-CO", { day: "numeric", month: "short" })}`;
};
