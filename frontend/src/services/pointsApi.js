/**
 * KOSMICA — pointsApi.js
 * Capa de acceso a la API de puntos.
 * Importar desde los componentes para todas las llamadas a puntos.
 */
import api from "./api"; // Axios instance existente del proyecto

export const pointsApi = {

  /**
   * Obtiene el saldo y resumen completo de puntos del usuario.
   * Llamar al montar la pantalla de perfil/checkout.
   *
   * @returns {PointsBalanceResponse} balance, tier, expiringIn7Days, etc.
   */
  getBalance: (email) =>
    api.get(`/points/balance/${encodeURIComponent(email)}`).then((r) => r.data),

  /**
   * Obtiene el historial de transacciones.
   * @param {number} limit — máximo de registros (default 20)
   */
  getHistory: (email, limit = 20) =>
    api.get(`/points/history/${encodeURIComponent(email)}?limit=${limit}`).then((r) => r.data),

  /**
   * Acredita puntos por compra completada.
   * Llamar desde el webhook de pago exitoso (no del frontend del cliente).
   *
   * @param {string} email
   * @param {number} totalCop  — total pagado en COP
   * @param {string} orderNumber
   */
  addPurchasePoints: (email, totalCop, orderNumber) =>
    api
      .post(`/points/add/purchase/${encodeURIComponent(email)}`, {
        totalCop,
        orderNumber,
      })
      .then((r) => r.data),

  /**
   * Acredita puntos por evento especial.
   * type: "SIGNUP" | "REFERRAL" | "REVIEW"
   */
  addBonusPoints: (email, type, reference = null) =>
    api
      .post(`/points/add/bonus/${encodeURIComponent(email)}`, {
        type,
        reference,
      })
      .then((r) => r.data),

  /**
   * Registra el check-in diario del usuario.
   * Idempotente: si ya se hizo check-in hoy, no falla.
   */
  doCheckin: (email) =>
    api.post(`/points/checkin/${encodeURIComponent(email)}`).then((r) => r.data),

  /**
   * Valida si el canje es posible ANTES de confirmarlo.
   * Llamar cuando el usuario cambia la cantidad de puntos en el checkout.
   *
   * @param {string} email
   * @param {number} orderTotal  — total del pedido en COP
   * @param {number} points      — puntos que quiere canjear (default: 500)
   * @returns {RedeemValidationResponse}
   */
  validateRedeem: (email, orderTotal, points = 500) =>
    api
      .get("/points/redeem/validate", {
        params: { email, orderTotal, points },
      })
      .then((r) => r.data),

  /**
   * Ejecuta el canje. Llamar al confirmar el pedido.
   *
   * @param {string} email
   * @param {number} pointsToRedeem — puntos a canjear
   * @param {number} orderTotalCop  — total del pedido antes del descuento
   * @param {string} orderNumber
   * @returns {RedeemResponse} discountCop, newBalance, newOrderTotal
   */
  redeemPoints: (email, pointsToRedeem, orderTotalCop, orderNumber) =>
    api
      .post(`/points/redeem/${encodeURIComponent(email)}`, {
        pointsToRedeem,
        orderTotalCop,
        orderNumber,
      })
      .then((r) => r.data),
};
