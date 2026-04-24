import React, { useState, useEffect } from "react";
import { pointsApi } from "../services/pointsApi";
import {
  getTransactionLabel,
  formatExpiry,
} from "../services/pointsUtils";

/**
 * ╔══════════════════════════════════════════════════════════╗
 *  KOSMICA — PointsHistory.jsx
 *
 *  Historial de transacciones de puntos del usuario.
 *
 *  Props:
 *    email  {string}  — email del usuario
 *    limit  {number}  — máximo de registros (default 20)
 * ╚══════════════════════════════════════════════════════════╝
 */
export default function PointsHistory({ email, limit = 20 }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!email) return;
    setLoading(true);
    pointsApi.getHistory(email, limit)
      .then(setHistory)
      .catch(() => setError("No se pudo cargar el historial."))
      .finally(() => setLoading(false));
  }, [email, limit]);

  if (loading) return <div className="points-history points-history--loading">Cargando historial...</div>;
  if (error)   return <div className="points-history points-history--error">{error}</div>;
  if (!history.length) return <div className="points-history points-history--empty">Sin movimientos aún.</div>;

  return (
    <div className="points-history">
      <ul className="points-history__list">
        {history.map(tx => {
          const meta    = getTransactionLabel(tx.type);
          const isGain  = tx.points > 0;
          const expiry  = formatExpiry(tx.expiresAt);
          const date    = new Date(tx.createdAt).toLocaleDateString("es-CO", {
            day: "numeric", month: "short", year: "numeric"
          });

          return (
            <li key={tx.id} className={`points-history__item ${tx.expired ? "points-history__item--expired" : ""}`}>
              <span className="points-history__icon" style={{ color: meta.color }}>
                {meta.icon}
              </span>
              <div className="points-history__body">
                <div className="points-history__desc">{tx.description}</div>
                <div className="points-history__meta">
                  <span className="points-history__date">{date}</span>
                  {expiry && (
                    <span className={`points-history__expiry ${tx.expired ? "points-history__expiry--expired" : ""}`}>
                      {expiry}
                    </span>
                  )}
                  {tx.orderNumber && (
                    <span className="points-history__order">#{tx.orderNumber}</span>
                  )}
                </div>
              </div>
              <span
                className={`points-history__amount ${isGain ? "points-history__amount--gain" : "points-history__amount--loss"}`}
              >
                {isGain ? "+" : ""}{tx.points} pts
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
