import React, { useState, useEffect, useCallback } from "react";
import { pointsApi } from "../services/pointsApi";
import { formatCOP, formatPoints } from "../services/pointsUtils";

/**
 * ╔══════════════════════════════════════════════════════════╗
 *  KOSMICA — CheckoutPoints.jsx
 *
 *  Sección de canje de puntos en el checkout.
 *
 *  Props:
 *    email         {string}   — email del cliente
 *    orderTotal    {number}   — total del pedido en COP (antes de descuento de puntos)
 *    onApply       {function} — callback(discountCop, pointsRedeemed) al confirmar canje
 *    onRemove      {function} — callback() al quitar el canje
 *
 *  Flujo:
 *    1. Cargar balance del usuario
 *    2. Mostrar slider para elegir cuántos puntos usar
 *    3. Llamar validateRedeem() al cambiar la cantidad (sin confirmar)
 *    4. Al pulsar "Aplicar": ejecutar redeemPoints() y notificar al padre
 *
 *  ⚠️  Este componente NUNCA calcula puntos ni descuentos.
 *      Todo viene de la API.
 * ╚══════════════════════════════════════════════════════════╝
 */
export default function CheckoutPoints({ email, orderTotal, onApply, onRemove }) {
  const [balance,      setBalance]      = useState(null);
  const [validation,   setValidation]   = useState(null);
  const [pointsToUse,  setPointsToUse]  = useState(500);
  const [applied,      setApplied]      = useState(null);   // RedeemResponse si ya se aplicó
  const [loading,      setLoading]      = useState(true);
  const [applying,     setApplying]     = useState(false);
  const [validating,   setValidating]   = useState(false);
  const [open,         setOpen]         = useState(false);

  // ── Cargar saldo inicial ─────────────────────────────────
  useEffect(() => {
    if (!email) return;
    pointsApi.getBalance(email)
      .then(data => {
        setBalance(data);
        setPointsToUse(Math.min(500, data.balance));
      })
      .catch(() => setBalance(null))
      .finally(() => setLoading(false));
  }, [email]);

  // ── Validar cada vez que cambian puntos o el total ────────
  const validate = useCallback(async (pts) => {
    if (!balance || !open || pts <= 0) return;
    setValidating(true);
    try {
      const v = await pointsApi.validateRedeem(email, orderTotal, pts);
      setValidation(v);
    } catch {
      setValidation({ valid: false, message: "Error al validar." });
    } finally {
      setValidating(false);
    }
  }, [balance, open, email, orderTotal]);

  // Debounce la validación al mover el slider
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => validate(pointsToUse), 300);
    return () => clearTimeout(t);
  }, [pointsToUse, open, validate]);

  useEffect(() => {
    if (open) validate(pointsToUse);
  }, [open]); // eslint-disable-line

  // ── Aplicar canje ────────────────────────────────────────
  const handleApply = async () => {
    if (!validation?.valid || applying) return;
    setApplying(true);
    try {
      const result = await pointsApi.redeemPoints(
        email,
        pointsToUse,
        orderTotal,
        `CHECKOUT-${Date.now()}`  // El número real de orden lo asignará el backend al crear el pedido
      );
      setApplied(result);
      onApply && onApply(result.discountCop, result.pointsRedeemed);
    } catch (e) {
      setValidation({ valid: false, message: e?.response?.data?.error || "Error al aplicar puntos." });
    } finally {
      setApplying(false);
    }
  };

  // ── Quitar canje ─────────────────────────────────────────
  const handleRemove = () => {
    setApplied(null);
    setOpen(false);
    onRemove && onRemove();
  };

  // ── Sin puntos disponibles ───────────────────────────────
  if (loading) return <div className="checkout-points checkout-points--loading">Verificando puntos...</div>;
  if (!balance || balance.balance < balance.redeemMinPoints) {
    return (
      <div className="checkout-points checkout-points--unavailable">
        <span>
          Puntos: {balance ? formatPoints(balance.balance) : "0 pts"}
          {balance && ` — necesitas ${balance.redeemMinPoints - balance.balance} pts más para canjear`}
        </span>
      </div>
    );
  }

  // ── Canje ya aplicado ────────────────────────────────────
  if (applied) {
    return (
      <div className="checkout-points checkout-points--applied">
        <div className="checkout-points__applied-row">
          <span>
            ✓ {formatPoints(applied.pointsRedeemed)} canjeados
            — descuento de {formatCOP(applied.discountCop)}
          </span>
          <button className="checkout-points__remove-btn" onClick={handleRemove}>
            Quitar
          </button>
        </div>
        <span className="checkout-points__applied-sub">
          Saldo restante: {formatPoints(applied.newBalance)}
        </span>
      </div>
    );
  }

  const maxSlider = validation?.maxRedeemablePoints ?? balance.balance;

  // ── Formulario de canje ──────────────────────────────────
  return (
    <div className="checkout-points">
      <button
        className={`checkout-points__toggle ${open ? "checkout-points__toggle--open" : ""}`}
        onClick={() => setOpen(o => !o)}
      >
        <span>
          Usar puntos ({formatPoints(balance.balance)} disponibles
          = {formatCOP(balance.balanceCop)})
        </span>
        <span className="checkout-points__toggle-icon">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="checkout-points__panel">
          {/* Slider de puntos */}
          <div className="checkout-points__slider-row">
            <label className="checkout-points__slider-label">
              Puntos a usar: <strong>{pointsToUse}</strong>
            </label>
            <input
              type="range"
              min={balance.redeemMinPoints}
              max={Math.min(balance.balance, maxSlider || balance.balance)}
              step={10}
              value={pointsToUse}
              onChange={e => setPointsToUse(Number(e.target.value))}
              className="checkout-points__slider"
            />
            <div className="checkout-points__slider-ends">
              <span>{formatPoints(balance.redeemMinPoints)}</span>
              <span>{formatPoints(Math.min(balance.balance, maxSlider || balance.balance))}</span>
            </div>
          </div>

          {/* Resultado de la validación */}
          {validating && (
            <div className="checkout-points__validating">Calculando...</div>
          )}

          {!validating && validation && (
            <div className={`checkout-points__validation ${validation.valid ? "checkout-points__validation--ok" : "checkout-points__validation--err"}`}>
              {validation.valid ? (
                <>
                  <span>
                    Descuento: <strong>{formatCOP(pointsToUse * (validation.pointValueCop || 25))}</strong>
                  </span>
                  <span className="checkout-points__validation-sub">
                    Máximo permitido: {formatPoints(validation.maxRedeemablePoints)} (30% del pedido)
                  </span>
                </>
              ) : (
                <span>{validation.message}</span>
              )}
            </div>
          )}

          {/* Botón de aplicar */}
          {!validating && validation?.valid && (
            <button
              className="checkout-points__apply-btn"
              onClick={handleApply}
              disabled={applying}
            >
              {applying ? "Aplicando..." : `Aplicar ${formatPoints(pointsToUse)}`}
            </button>
          )}

          {/* Info adicional */}
          <p className="checkout-points__info">
            1 punto = {formatCOP(validation?.pointValueCop || 25)} de descuento.
            Mínimo para canjear: {formatPoints(balance.redeemMinPoints)}.
          </p>
        </div>
      )}
    </div>
  );
}
