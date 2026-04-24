import React, { useState, useEffect, useCallback } from "react";
import { pointsApi } from "../services/pointsApi";
import {
  formatCOP,
  formatPoints,
  getTierConfig,
  getTierProgressPercent,
  getCheckinLabel,
  getStreakEmoji,
  formatExpiry,
} from "../services/pointsUtils";

/**
 * ╔══════════════════════════════════════════════════════════╗
 *  KOSMICA — PointsWidget.jsx
 *
 *  Tarjeta de puntos para el perfil del usuario.
 *  Muestra: saldo, nivel, progreso, expiración, check-in.
 *
 *  Props:
 *    email {string}  — email del usuario autenticado
 *
 *  ⚠️  Este componente NUNCA calcula puntos.
 *      Todo viene de pointsApi.getBalance().
 * ╚══════════════════════════════════════════════════════════╝
 */
export default function PointsWidget({ email }) {
  const [balance, setBalance]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError]       = useState(null);
  const [checkinMsg, setCheckinMsg] = useState(null);

  const load = useCallback(async () => {
    if (!email) return;
    setLoading(true);
    setError(null);
    try {
      const data = await pointsApi.getBalance(email);
      setBalance(data);
    } catch {
      setError("No se pudieron cargar los puntos.");
    } finally {
      setLoading(false);
    }
  }, [email]);

  useEffect(() => { load(); }, [load]);

  const handleCheckin = async () => {
    if (!balance || balance.checkedInToday || checking) return;
    setChecking(true);
    setCheckinMsg(null);
    try {
      const result = await pointsApi.doCheckin(email);
      if (result.pointsAwarded > 0) {
        setCheckinMsg(`+${result.pointsAwarded} pts ganados. Racha: ${balance.checkinStreak + 1} días`);
      } else {
        setCheckinMsg("Ya realizaste el check-in hoy.");
      }
      await load();
    } catch {
      setCheckinMsg("No se pudo registrar el check-in.");
    } finally {
      setChecking(false);
    }
  };

  if (loading) return <div className="points-widget points-widget--loading">Cargando puntos...</div>;
  if (error)   return <div className="points-widget points-widget--error">{error}</div>;
  if (!balance) return null;

  const tier        = getTierConfig(balance.tier);
  const progress    = getTierProgressPercent(balance);
  const streakEmoji = getStreakEmoji(balance.checkinStreak);

  return (
    <div className="points-widget">
      {/* ── Encabezado: nivel y saldo ── */}
      <div className="points-widget__header">
        <div className="points-widget__tier-badge" style={{ background: tier.bgColor, color: tier.color }}>
          {tier.emoji} {tier.label}
        </div>
        <div className="points-widget__balance">
          <span className="points-widget__balance-pts">{balance.balance.toLocaleString("es-CO")} pts</span>
          <span className="points-widget__balance-cop">= {formatCOP(balance.balanceCop)}</span>
        </div>
      </div>

      {/* ── Progreso hacia siguiente nivel ── */}
      {balance.nextTierPoints && (
        <div className="points-widget__progress">
          <div className="points-widget__progress-bar">
            <div
              className="points-widget__progress-fill"
              style={{ width: `${progress}%`, background: tier.color }}
            />
          </div>
          <span className="points-widget__progress-label">
            {balance.nextTierPoints - balance.balance} pts para {tier.nextLabel}
          </span>
        </div>
      )}

      {/* ── Aviso de expiración ── */}
      {balance.expiringIn7Days > 0 && (
        <div className="points-widget__expiry-alert">
          ⚠️ {formatPoints(balance.expiringIn7Days)} expiran en los próximos 7 días
        </div>
      )}

      {/* ── Info de canje ── */}
      <div className="points-widget__redeem-info">
        {balance.canRedeem ? (
          <span className="points-widget__redeem-ok">
            Puedes canjear {formatPoints(balance.balance)} → {formatCOP(balance.balanceCop)} de descuento
          </span>
        ) : (
          <span className="points-widget__redeem-pending">
            Necesitas {balance.redeemMinPoints - balance.balance} pts más para canjear
            (mínimo {formatPoints(balance.redeemMinPoints)} = {formatCOP(balance.redeemMinCop)})
          </span>
        )}
      </div>

      {/* ── Check-in diario ── */}
      <div className="points-widget__checkin">
        <div className="points-widget__streak">
          {streakEmoji} Racha: {balance.checkinStreak} día{balance.checkinStreak !== 1 ? "s" : ""}
        </div>
        <button
          className={`points-widget__checkin-btn ${balance.checkedInToday ? "points-widget__checkin-btn--done" : ""}`}
          onClick={handleCheckin}
          disabled={balance.checkedInToday || checking}
        >
          {balance.checkedInToday
            ? "✓ Check-in hecho"
            : checking
            ? "Registrando..."
            : getCheckinLabel(balance)}
        </button>
        {checkinMsg && <p className="points-widget__checkin-msg">{checkinMsg}</p>}
      </div>
    </div>
  );
}
