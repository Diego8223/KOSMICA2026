// ============================================================
//  TermsModal.jsx — Términos y Condiciones
//  ✅ Invita y Gana (cupón 15% válido 6 meses)
//  ✅ Tarjeta de Regalo (válida 1 año)
// ============================================================

import { useState } from "react";

const CSS = `
.tm-overlay {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(0,0,0,.55);
  display: flex; align-items: center; justify-content: center;
  padding: 16px;
  animation: tm-fade .2s ease;
}
@keyframes tm-fade { from { opacity: 0 } to { opacity: 1 } }

.tm-box {
  background: #fff;
  border-radius: 20px;
  width: 100%; max-width: 560px;
  max-height: 90vh;
  overflow: hidden;
  display: flex; flex-direction: column;
  box-shadow: 0 20px 60px rgba(124,58,237,.2);
}

.tm-header {
  background: linear-gradient(135deg, #7C3AED, #C026D3);
  padding: 24px 28px 20px;
  position: relative;
}
.tm-close {
  position: absolute; top: 16px; right: 18px;
  background: rgba(255,255,255,.2); border: none; border-radius: 50%;
  width: 32px; height: 32px; cursor: pointer;
  color: #fff; font-size: 1rem; display: flex; align-items: center; justify-content: center;
}
.tm-close:hover { background: rgba(255,255,255,.35); }
.tm-title { color: #fff; font-size: 1.2rem; font-weight: 800; margin: 0 0 4px; }
.tm-subtitle { color: rgba(255,255,255,.8); font-size: .83rem; margin: 0; }

.tm-tabs {
  display: flex; border-bottom: 2px solid #f0e8ff;
  background: #faf5ff;
}
.tm-tab {
  flex: 1; padding: 12px 8px; border: none; background: none;
  font-size: .83rem; font-weight: 600; color: #9CA3AF; cursor: pointer;
  border-bottom: 3px solid transparent; margin-bottom: -2px;
  transition: all .2s;
}
.tm-tab.active { color: #7C3AED; border-bottom-color: #7C3AED; background: #fff; }
.tm-tab:hover:not(.active) { color: #7C3AED; background: #f5f0ff; }

.tm-body {
  overflow-y: auto; padding: 24px 28px;
  flex: 1;
}
.tm-body::-webkit-scrollbar { width: 4px; }
.tm-body::-webkit-scrollbar-thumb { background: #e0d0ff; border-radius: 4px; }

.tm-section { margin-bottom: 24px; }
.tm-section-title {
  font-size: .85rem; font-weight: 700; color: #7C3AED;
  text-transform: uppercase; letter-spacing: .08em;
  margin: 0 0 10px; display: flex; align-items: center; gap: 8px;
}
.tm-section-title::after {
  content: ''; flex: 1; height: 1px; background: #f0e8ff;
}
.tm-list {
  margin: 0; padding: 0; list-style: none;
}
.tm-list li {
  padding: 8px 0 8px 20px; position: relative;
  color: #4B5563; font-size: .88rem; line-height: 1.6;
  border-bottom: 1px solid #faf5ff;
}
.tm-list li::before {
  content: ''; position: absolute; left: 0; top: 16px;
  width: 8px; height: 8px; border-radius: 50%;
  background: linear-gradient(135deg, #7C3AED, #C026D3);
}
.tm-list li strong { color: #1a1a2e; }

.tm-highlight {
  background: linear-gradient(135deg, #faf5ff, #fdf2f8);
  border: 1.5px solid #e9d5ff;
  border-radius: 14px; padding: 16px 18px; margin: 16px 0;
}
.tm-highlight p { margin: 0; color: #6B21A8; font-size: .87rem; line-height: 1.6; }
.tm-highlight strong { color: #7C3AED; }

.tm-badge {
  display: inline-flex; align-items: center; gap: 6px;
  background: linear-gradient(135deg, #7C3AED, #C026D3);
  color: #fff; border-radius: 50px; padding: 4px 14px;
  font-size: .78rem; font-weight: 700; margin: 4px 0;
}

.tm-footer {
  padding: 16px 28px 20px;
  border-top: 1px solid #f0e8ff;
  background: #faf5ff;
  text-align: center;
}
.tm-footer p { margin: 0 0 12px; color: #9CA3AF; font-size: .78rem; }
.tm-btn {
  display: inline-block; background: linear-gradient(135deg, #7C3AED, #C026D3);
  color: #fff; border: none; border-radius: 50px;
  padding: 12px 36px; font-weight: 700; font-size: .95rem; cursor: pointer;
}
.tm-btn:hover { opacity: .9; }

.tm-update { color: #C4B5FD; font-size: .72rem; text-align: center; margin-top: 16px; }
`;

// ── Contenido: Invita y Gana ──────────────────────────────
function ReferralTerms() {
  return (
    <div>
      <div className="tm-highlight">
        <p>
          El sistema <strong>Invita y Gana</strong> te permite compartir tu código único con
          amigos y familiares. Cuando ellos hagan su primera compra usándolo, ambos ganan.
          Lee con atención las condiciones a continuación.
        </p>
      </div>

      <div className="tm-section">
        <div className="tm-section-title">🎁 Cómo funciona</div>
        <ul className="tm-list">
          <li>Regístrate en Kosmica y obtén tu código personal <strong>LUX-XXXXXX</strong> de forma automática.</li>
          <li>Comparte tu código con quien quieras — por WhatsApp, redes sociales o directamente.</li>
          <li>Tu amiga ingresa el código al momento de pagar su primera compra y obtiene un <strong>descuento inmediato</strong>.</li>
          <li>Una vez confirmado el pago, tú recibes automáticamente un <strong>cupón de 15% de descuento</strong> para tu próxima compra.</li>
        </ul>
      </div>

      <div className="tm-section">
        <div className="tm-section-title">📋 Condiciones del código</div>
        <ul className="tm-list">
          <li>El código es <strong>personal e intransferible</strong> — está vinculado a tu email de registro.</li>
          <li>Cada código es de <strong>uso único</strong>: una vez que alguien lo redime, queda bloqueado para siempre.</li>
          <li>El dueño del código <strong>no puede usarlo en su propia compra</strong>. Solo puede redimirlo quien lo recibió.</li>
          <li>Solo aplica para <strong>usuarios nuevos</strong> que no hayan comprado antes en Kosmica.</li>
          <li>El código no tiene valor en efectivo y no es canjeable por dinero.</li>
        </ul>
      </div>

      <div className="tm-section">
        <div className="tm-section-title">🏷️ Cupón de recompensa 15%</div>
        <ul className="tm-list">
          <li>El cupón <strong>REF15-XXXXXX</strong> se genera y envía automáticamente por email y WhatsApp cuando tu amiga paga.</li>
          <li>
            El cupón tiene una vigencia de <strong>6 meses</strong> a partir de la fecha de emisión.{" "}
            <span className="tm-badge">⏳ 6 meses</span>
          </li>
          <li>Es de <strong>un solo uso</strong> — una vez aplicado no puede reutilizarse.</li>
          <li><strong>No es acumulable</strong> con otras promociones, descuentos o cupones de bienvenida.</li>
          <li>Aplica sobre el valor de los productos, <strong>no incluye costos de envío</strong>.</li>
          <li>Para usarlo debes ingresar tu email registrado en Kosmica para validar la titularidad.</li>
        </ul>
      </div>

      <div className="tm-section">
        <div className="tm-section-title">⚠️ Restricciones</div>
        <ul className="tm-list">
          <li>Kosmica se reserva el derecho de <strong>invalidar códigos o cupones</strong> si detecta uso fraudulento o abusivo.</li>
          <li>Crear múltiples cuentas para generar varios códigos está <strong>estrictamente prohibido</strong>.</li>
          <li>El programa puede ser modificado o suspendido en cualquier momento con previo aviso.</li>
        </ul>
      </div>

      <div className="tm-highlight">
        <p>
          Al obtener tu código <strong>LUX-XXXXXX</strong> aceptas el tratamiento de tus datos
          personales conforme a la <strong>Ley 1581 de 2012</strong> (Colombia) únicamente para
          gestionar el programa de referidos. Tus datos no serán compartidos con terceros.
        </p>
      </div>

      <p className="tm-update">Última actualización: Abril 2025</p>
    </div>
  );
}

// ── Contenido: Tarjeta de Regalo ──────────────────────────
function GiftCardTerms() {
  return (
    <div>
      <div className="tm-highlight">
        <p>
          Las <strong>Tarjetas de Regalo Kosmica</strong> son un regalo digital que puedes
          comprar para alguien especial. El receptor puede usarla para comprar cualquier
          producto en nuestra tienda. Lee las condiciones a continuación.
        </p>
      </div>

      <div className="tm-section">
        <div className="tm-section-title">🎁 Cómo funciona</div>
        <ul className="tm-list">
          <li>Elige la ocasión, el monto y escribe un mensaje personalizado para el receptor.</li>
          <li>Pagas con MercadoPago — la tarjeta se activa <strong>automáticamente</strong> al confirmar el pago.</li>
          <li>El receptor recibe un email con su código <strong>GIFT-XXXXXX</strong> y las instrucciones de uso.</li>
          <li>Al comprar, el receptor ingresa el código en el carrito y el saldo se descuenta automáticamente.</li>
          <li>Si el saldo supera el valor del pedido, el <strong>saldo restante queda disponible</strong> para una próxima compra.</li>
        </ul>
      </div>

      <div className="tm-section">
        <div className="tm-section-title">📋 Condiciones generales</div>
        <ul className="tm-list">
          <li>
            La tarjeta tiene una vigencia de <strong>1 año</strong> a partir de la fecha de activación.{" "}
            <span className="tm-badge">📅 1 año</span>
          </li>
          <li>Una vez vencida, el saldo <strong>no es reembolsable ni renovable</strong>.</li>
          <li>La tarjeta <strong>no tiene valor en efectivo</strong> y no puede cambiarse por dinero.</li>
          <li>No es acumulable con otras tarjetas de regalo en un mismo pedido.</li>
          <li><strong>Sí puede combinarse</strong> con cupones de descuento normales.</li>
          <li>El monto mínimo de compra de una tarjeta de regalo es <strong>$10.000 COP</strong>.</li>
        </ul>
      </div>

      <div className="tm-section">
        <div className="tm-section-title">💳 Pagos y activación</div>
        <ul className="tm-list">
          <li>El pago se procesa a través de <strong>MercadoPago</strong> — plataforma segura y certificada.</li>
          <li>La tarjeta pasa a estado <strong>PENDIENTE</strong> hasta que MercadoPago confirme el pago.</li>
          <li>Si el pago es rechazado o no se completa, la tarjeta <strong>no se activa</strong>.</li>
          <li>Una vez activada, el comprador recibe confirmación por WhatsApp y el receptor por email.</li>
        </ul>
      </div>

      <div className="tm-section">
        <div className="tm-section-title">🔄 Devoluciones</div>
        <ul className="tm-list">
          <li>Las tarjetas de regalo <strong>no son reembolsables</strong> una vez activadas.</li>
          <li>Si un pedido pagado con tarjeta de regalo es cancelado, el saldo <strong>se devuelve a la tarjeta</strong>.</li>
          <li>Para solicitar una devolución o aclarar dudas escríbenos a <strong>hola@kosmica.com.co</strong>.</li>
        </ul>
      </div>

      <div className="tm-section">
        <div className="tm-section-title">⚠️ Restricciones</div>
        <ul className="tm-list">
          <li>Kosmica no se hace responsable si el código es compartido con terceros no autorizados.</li>
          <li>El uso fraudulento de tarjetas de regalo resultará en la <strong>cancelación inmediata</strong> del saldo.</li>
          <li>Las tarjetas solo aplican para compras en <strong>www.kosmica.com.co</strong>.</li>
        </ul>
      </div>

      <div className="tm-highlight">
        <p>
          Al comprar una Tarjeta de Regalo aceptas que los datos del receptor serán usados
          únicamente para enviarle el código y las instrucciones, conforme a la{" "}
          <strong>Ley 1581 de 2012</strong> (Colombia).
        </p>
      </div>

      <p className="tm-update">Última actualización: Abril 2025</p>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────
export default function TermsModal({ open, onClose, defaultTab = "referral" }) {
  const [tab, setTab] = useState(defaultTab);

  if (!open) return null;

  return (
    <>
      <style>{CSS}</style>
      <div className="tm-overlay" onClick={onClose}>
        <div className="tm-box" onClick={e => e.stopPropagation()}>

          {/* HEADER */}
          <div className="tm-header">
            <button className="tm-close" onClick={onClose}>✕</button>
            <div className="tm-title">📄 Términos y Condiciones</div>
            <div className="tm-subtitle">Kosmica — Programa de beneficios</div>
          </div>

          {/* TABS */}
          <div className="tm-tabs">
            <button
              className={`tm-tab ${tab === "referral" ? "active" : ""}`}
              onClick={() => setTab("referral")}
            >
              🎉 Invita y Gana
            </button>
            <button
              className={`tm-tab ${tab === "giftcard" ? "active" : ""}`}
              onClick={() => setTab("giftcard")}
            >
              🎁 Tarjeta de Regalo
            </button>
          </div>

          {/* CONTENIDO */}
          <div className="tm-body">
            {tab === "referral" ? <ReferralTerms /> : <GiftCardTerms />}
          </div>

          {/* FOOTER */}
          <div className="tm-footer">
            <p>¿Tienes preguntas? Escríbenos a <strong>hola@kosmica.com.co</strong></p>
            <button className="tm-btn" onClick={onClose}>Entendido ✓</button>
          </div>

        </div>
      </div>
    </>
  );
}
