// ============================================================
//  GiftCardModal.jsx — Tarjetas de Regalo Kosmica
//
//  FLUJO:
//    1. Cliente elige ocasión + monto + mensaje personal
//    2. Paga con MercadoPago
//    3. Recibe código por email + pantalla + WhatsApp
//    4. Receptor ingresa código al pagar → se descuenta el saldo
//    5. Saldo parcial queda activo para próxima compra
//
//  REGLAS:
//    ✅ Monto libre (mínimo $10.000 COP)
//    ✅ Saldo parcial — queda remanente si no usa todo
//    ✅ Se puede recargar desde el admin
//    ✅ Entrega: pantalla + email + WhatsApp
// ============================================================

import { useState } from "react";
import { orderAPI } from "../services/api";

const OCCASIONS = [
  { id: "birthday",    emoji: "🎂", label: "Cumpleaños" },
  { id: "mother",      emoji: "💐", label: "Día de la Madre" },
  { id: "father",      emoji: "👔", label: "Día del Padre" },
  { id: "love",        emoji: "💑", label: "Amor y Amistad" },
  { id: "christmas",   emoji: "🎄", label: "Navidad" },
  { id: "graduation",  emoji: "🎓", label: "Graduación" },
  { id: "anniversary", emoji: "💍", label: "Aniversario" },
  { id: "other",       emoji: "✨", label: "Otra ocasión" },
];

const SUGGESTED_AMOUNTS = [25000, 50000, 100000, 200000];

function formatCOP(n) {
  return "$" + Number(n).toLocaleString("es-CO");
}

export default function GiftCardModal({ open, onClose }) {
  const [step, setStep]             = useState("design");
  // steps: "design" | "pay" | "success"

  const [occasion, setOccasion]     = useState(null);
  const [amount, setAmount]         = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [message, setMessage]       = useState("");
  const [recipientName, setRecipientName]   = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [senderName, setSenderName]   = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [error, setError]           = useState("");
  const [loading, setLoading]       = useState(false);
  const [giftCode, setGiftCode]     = useState(null);
  const [copied, setCopied]         = useState(false);

  const finalAmount = amount === "custom"
    ? parseInt(customAmount.replace(/\D/g, "") || "0")
    : parseInt(amount || "0");

  const selectedOccasion = OCCASIONS.find(o => o.id === occasion);

  function reset() {
    setStep("design");
    setOccasion(null);
    setAmount("");
    setCustomAmount("");
    setMessage("");
    setRecipientName("");
    setRecipientEmail("");
    setSenderName("");
    setSenderEmail("");
    setSenderPhone("");
    setError("");
    setGiftCode(null);
    setCopied(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function validateDesign() {
    if (!occasion)              { setError("Elige una ocasión"); return false; }
    if (!finalAmount || finalAmount < 10000) {
      setError("El monto mínimo es $10.000"); return false;
    }
    if (!recipientName.trim()) { setError("Ingresa el nombre de quien recibe"); return false; }
    if (!recipientEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
      setError("Ingresa el email de quien recibe"); return false;
    }
    return true;
  }

  function validatePay() {
    if (!senderName.trim())  { setError("Ingresa tu nombre"); return false; }
    if (!senderEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderEmail)) {
      setError("Ingresa tu email"); return false;
    }
    if (!senderPhone.trim() || senderPhone.length < 7) {
      setError("Ingresa tu WhatsApp"); return false;
    }
    return true;
  }

  async function handlePay() {
    setError("");
    if (!validatePay()) return;
    setLoading(true);
    try {
      // Crear orden de tarjeta de regalo via backend
      const res = await fetch("/api/gift-cards/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          occasion:       occasion,
          occasionLabel:  selectedOccasion?.label,
          amount:         finalAmount,
          message:        message.trim(),
          recipientName:  recipientName.trim(),
          recipientEmail: recipientEmail.trim().toLowerCase(),
          senderName:     senderName.trim(),
          senderEmail:    senderEmail.trim().toLowerCase(),
          senderPhone:    senderPhone.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setGiftCode(data.code);
        setStep("success");
        // Abrir MercadoPago si devuelve URL de pago
        if (data.paymentUrl) {
          window.open(data.paymentUrl, "_blank");
        }
      } else {
        setError(data.message || "Error procesando la tarjeta. Intenta de nuevo.");
      }
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(giftCode || "").then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  }

  function handleWhatsApp() {
    const text =
      `🎁 *Tarjeta de Regalo Kosmica*\n\n` +
      `Para: ${recipientName}\n` +
      `Ocasión: ${selectedOccasion?.emoji} ${selectedOccasion?.label}\n` +
      `Saldo: ${formatCOP(finalAmount)}\n\n` +
      (message ? `"${message}"\n\n` : "") +
      `Tu código: *${giftCode}*\n\n` +
      `Úsalo en www.kosmica.com.co al finalizar tu compra 💜`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  if (!open) return null;

  return (
    <>
      <style>{CSS}</style>
      <div className="gc-overlay" onClick={handleClose}>
        <div className="gc-box" onClick={e => e.stopPropagation()}>

          {/* ── HEADER ── */}
          <div className={`gc-hero gc-hero--${occasion || "default"}`}>
            <button className="gc-close" onClick={handleClose}>✕</button>
            <div className="gc-hero-content">
              <div className="gc-logo-mark">K</div>
              <div className="gc-hero-title">Tarjeta de Regalo</div>
              <div className="gc-hero-sub">
                {step === "design"  && "Diseña tu tarjeta perfecta"}
                {step === "pay"     && "Casi listo — confirma tu compra"}
                {step === "success" && "¡Tarjeta lista para regalar! 🎉"}
              </div>
              {finalAmount > 0 && (
                <div className="gc-hero-amount">{formatCOP(finalAmount)}</div>
              )}
            </div>
            {/* Patrón decorativo */}
            <div className="gc-hero-deco">
              {[...Array(6)].map((_,i) => <div key={i} className="gc-deco-circle" />)}
            </div>
          </div>

          {/* ── PASOS ── */}
          <div className="gc-stepper">
            {["design","pay","success"].map((s, i) => (
              <div key={s} className={`gc-step-dot ${step === s ? "active" : ""} ${
                ["design","pay","success"].indexOf(step) > i ? "done" : ""}`} />
            ))}
          </div>

          <div className="gc-body">

            {/* ══ PASO 1: DISEÑAR ══ */}
            {step === "design" && (
              <div className="gc-section">

                {/* Ocasión */}
                <div className="gc-field-label">¿Para qué ocasión?</div>
                <div className="gc-occasions">
                  {OCCASIONS.map(o => (
                    <button
                      key={o.id}
                      className={`gc-occasion-btn ${occasion === o.id ? "selected" : ""}`}
                      onClick={() => { setOccasion(o.id); setError(""); }}
                    >
                      <span className="gc-occ-emoji">{o.emoji}</span>
                      <span className="gc-occ-label">{o.label}</span>
                    </button>
                  ))}
                </div>

                {/* Monto */}
                <div className="gc-field-label" style={{marginTop: 20}}>¿Cuánto quieres cargar?</div>
                <div className="gc-amounts">
                  {SUGGESTED_AMOUNTS.map(a => (
                    <button
                      key={a}
                      className={`gc-amount-btn ${amount === String(a) ? "selected" : ""}`}
                      onClick={() => { setAmount(String(a)); setCustomAmount(""); setError(""); }}
                    >
                      {formatCOP(a)}
                    </button>
                  ))}
                  <button
                    className={`gc-amount-btn gc-amount-custom ${amount === "custom" ? "selected" : ""}`}
                    onClick={() => { setAmount("custom"); setError(""); }}
                  >
                    Otro monto
                  </button>
                </div>
                {amount === "custom" && (
                  <input
                    className="gc-input"
                    type="number"
                    placeholder="Monto en pesos (mín. $10.000)"
                    min="10000"
                    value={customAmount}
                    onChange={e => setCustomAmount(e.target.value)}
                    style={{marginTop: 8}}
                  />
                )}

                {/* Para quién */}
                <div className="gc-field-label" style={{marginTop: 20}}>¿Para quién es?</div>
                <input
                  className="gc-input"
                  type="text"
                  placeholder="Nombre de quien recibe"
                  value={recipientName}
                  onChange={e => setRecipientName(e.target.value)}
                />
                <input
                  className="gc-input"
                  type="email"
                  placeholder="Email de quien recibe (para enviarle la tarjeta)"
                  value={recipientEmail}
                  onChange={e => setRecipientEmail(e.target.value)}
                />

                {/* Mensaje */}
                <div className="gc-field-label" style={{marginTop: 20}}>Mensaje personalizado <span className="gc-optional">(opcional)</span></div>
                <textarea
                  className="gc-textarea"
                  placeholder={`Ej: "Feliz cumpleaños, espero que encuentres algo que te encante 💜"`}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  maxLength={200}
                  rows={3}
                />
                <div className="gc-char-count">{message.length}/200</div>

                {error && <div className="gc-error">⚠️ {error}</div>}

                <button
                  className="gc-btn-primary"
                  onClick={() => { if (validateDesign()) { setError(""); setStep("pay"); } }}
                >
                  Continuar →
                </button>
              </div>
            )}

            {/* ══ PASO 2: PAGAR ══ */}
            {step === "pay" && (
              <div className="gc-section">

                {/* Resumen */}
                <div className="gc-summary-card">
                  <div className="gc-summary-row">
                    <span className="gc-summary-label">Ocasión</span>
                    <span className="gc-summary-val">
                      {selectedOccasion?.emoji} {selectedOccasion?.label}
                    </span>
                  </div>
                  <div className="gc-summary-row">
                    <span className="gc-summary-label">Saldo</span>
                    <span className="gc-summary-val gc-summary-amount">{formatCOP(finalAmount)}</span>
                  </div>
                  <div className="gc-summary-row">
                    <span className="gc-summary-label">Para</span>
                    <span className="gc-summary-val">{recipientName}</span>
                  </div>
                  {message && (
                    <div className="gc-summary-message">"{message}"</div>
                  )}
                </div>

                {/* Datos del comprador */}
                <div className="gc-field-label" style={{marginTop: 20}}>Tus datos (quien regala)</div>
                <input
                  className="gc-input"
                  type="text"
                  placeholder="Tu nombre"
                  value={senderName}
                  onChange={e => setSenderName(e.target.value)}
                />
                <input
                  className="gc-input"
                  type="email"
                  placeholder="Tu email (recibirás confirmación)"
                  value={senderEmail}
                  onChange={e => setSenderEmail(e.target.value)}
                />
                <input
                  className="gc-input"
                  type="tel"
                  placeholder="Tu WhatsApp (ej: 3001234567)"
                  value={senderPhone}
                  onChange={e => setSenderPhone(e.target.value)}
                />

                <div className="gc-pay-note">
                  💳 El pago se procesa de forma segura con MercadoPago.<br/>
                  La tarjeta se envía por email y WhatsApp al completar el pago.
                </div>

                {error && <div className="gc-error">⚠️ {error}</div>}

                <button
                  className="gc-btn-primary"
                  onClick={handlePay}
                  disabled={loading}
                >
                  {loading ? "Procesando..." : `Pagar ${formatCOP(finalAmount)} →`}
                </button>
                <button className="gc-btn-back" onClick={() => { setStep("design"); setError(""); }}>
                  ← Volver
                </button>
              </div>
            )}

            {/* ══ PASO 3: ÉXITO ══ */}
            {step === "success" && giftCode && (
              <div className="gc-section gc-success">

                <div className="gc-success-icon">🎁</div>
                <div className="gc-success-title">¡Tarjeta creada!</div>
                <div className="gc-success-sub">
                  Le enviamos la tarjeta a <strong>{recipientName}</strong> por email.
                </div>

                {/* La tarjeta visual */}
                <div className={`gc-card-preview gc-card--${occasion}`}>
                  <div className="gc-card-brand">KOSMICA</div>
                  <div className="gc-card-occasion">
                    {selectedOccasion?.emoji} {selectedOccasion?.label}
                  </div>
                  {message && (
                    <div className="gc-card-msg">"{message}"</div>
                  )}
                  <div className="gc-card-code-label">Código</div>
                  <div className="gc-card-code">{giftCode}</div>
                  <div className="gc-card-balance">{formatCOP(finalAmount)}</div>
                  <div className="gc-card-footer">
                    Válido en kosmica.com.co · Saldo parcial disponible
                  </div>
                </div>

                {/* Acciones */}
                <button className="gc-copy-btn" onClick={handleCopy}>
                  {copied ? "✓ ¡Código copiado!" : "📋 Copiar código"}
                </button>
                <button className="gc-wa-btn" onClick={handleWhatsApp}>
                  💬 Compartir por WhatsApp
                </button>
                <button className="gc-btn-back" onClick={handleClose}>
                  Listo, cerrar
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}

// ── CSS ────────────────────────────────────────────────────
const CSS = `
.gc-overlay {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(0,0,0,.6); backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center;
  padding: 16px;
}
.gc-box {
  background: #fff; border-radius: 28px; width: 100%;
  max-width: 460px; max-height: 92vh; overflow-y: auto;
  box-shadow: 0 32px 80px rgba(0,0,0,.22);
  position: relative;
}

/* ── HERO ── */
.gc-hero {
  border-radius: 28px 28px 0 0; padding: 32px 24px 28px;
  position: relative; overflow: hidden;
  background: linear-gradient(140deg, #5B21B6 0%, #7C3AED 50%, #9F67F5 100%);
}
.gc-hero--birthday  { background: linear-gradient(140deg, #7C2D92 0%, #C026D3 55%, #E879F9 100%); }
.gc-hero--mother    { background: linear-gradient(140deg, #9D174D 0%, #DB2777 55%, #F472B6 100%); }
.gc-hero--father    { background: linear-gradient(140deg, #1E3A5F 0%, #1D4ED8 55%, #60A5FA 100%); }
.gc-hero--love      { background: linear-gradient(140deg, #881337 0%, #E11D48 55%, #FB7185 100%); }
.gc-hero--christmas { background: linear-gradient(140deg, #14532D 0%, #16A34A 55%, #4ADE80 100%); }
.gc-hero--graduation{ background: linear-gradient(140deg, #78350F 0%, #D97706 55%, #FCD34D 100%); }
.gc-hero--anniversary{background: linear-gradient(140deg, #4A044E 0%, #A21CAF 55%, #E879F9 100%); }
.gc-hero--other     { background: linear-gradient(140deg, #1E1B4B 0%, #4338CA 55%, #818CF8 100%); }
.gc-hero--default   { background: linear-gradient(140deg, #5B21B6 0%, #7C3AED 55%, #9F67F5 100%); }

.gc-hero-content { position: relative; z-index: 2; text-align: center; }
.gc-close {
  position: absolute; top: 14px; right: 14px; z-index: 3;
  background: rgba(255,255,255,.18); border: none; border-radius: 50%;
  width: 34px; height: 34px; cursor: pointer; color: #fff;
  font-size: 1rem; display: flex; align-items: center; justify-content: center;
}
.gc-logo-mark {
  width: 48px; height: 48px; border-radius: 50%;
  background: rgba(255,255,255,.18); border: 1.5px solid rgba(255,255,255,.35);
  display: flex; align-items: center; justify-content: center;
  font-size: 1.5rem; font-weight: 800; color: #fff;
  margin: 0 auto 12px; letter-spacing: .05em;
}
.gc-hero-title { font-size: 1.6rem; font-weight: 800; color: #fff; margin-bottom: 6px; }
.gc-hero-sub { color: rgba(255,255,255,.85); font-size: .9rem; }
.gc-hero-amount {
  font-size: 2rem; font-weight: 900; color: #fff;
  margin-top: 10px; letter-spacing: .03em;
  text-shadow: 0 2px 8px rgba(0,0,0,.2);
}
.gc-hero-deco {
  position: absolute; inset: 0; z-index: 1;
  pointer-events: none; overflow: hidden;
}
.gc-deco-circle {
  position: absolute; border-radius: 50%;
  background: rgba(255,255,255,.06);
}
.gc-deco-circle:nth-child(1) { width:120px;height:120px; top:-40px; right:-30px; }
.gc-deco-circle:nth-child(2) { width:80px; height:80px;  top:20px;  left:-20px; }
.gc-deco-circle:nth-child(3) { width:60px; height:60px;  bottom:10px; right:40px; }
.gc-deco-circle:nth-child(4) { width:40px; height:40px;  bottom:-10px; left:60px; }
.gc-deco-circle:nth-child(5) { width:100px;height:100px; top:50%; right:-20px; }
.gc-deco-circle:nth-child(6) { width:30px; height:30px;  top:10px; right:80px; background:rgba(255,255,255,.1); }

/* ── STEPPER ── */
.gc-stepper {
  display: flex; gap: 8px; justify-content: center;
  padding: 14px; background: #F8F5FF;
}
.gc-step-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: #DDD6FE; transition: all .3s;
}
.gc-step-dot.active { background: #7C3AED; transform: scale(1.4); }
.gc-step-dot.done { background: #A78BFA; }

/* ── BODY ── */
.gc-body { padding: 20px; }
.gc-section { display: flex; flex-direction: column; gap: 10px; }

/* ── LABELS ── */
.gc-field-label {
  font-size: .75rem; font-weight: 700; color: #7C3AED;
  text-transform: uppercase; letter-spacing: .07em; margin-bottom: 2px;
}
.gc-optional { font-weight: 400; color: #9CA3AF; text-transform: none; letter-spacing: 0; }

/* ── OCASIONES ── */
.gc-occasions {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;
}
.gc-occasion-btn {
  display: flex; flex-direction: column; align-items: center;
  padding: 10px 4px; border: 1.5px solid #E5E7EB; border-radius: 14px;
  background: #fff; cursor: pointer; transition: all .2s; gap: 4px;
}
.gc-occasion-btn:hover { border-color: #C4B5FD; background: #F5F3FF; }
.gc-occasion-btn.selected { border-color: #7C3AED; background: #F5F3FF; box-shadow: 0 0 0 3px #EDE9FE; }
.gc-occ-emoji { font-size: 1.4rem; }
.gc-occ-label { font-size: .68rem; color: #555; text-align: center; line-height: 1.2; }

/* ── MONTOS ── */
.gc-amounts {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;
}
.gc-amount-btn {
  padding: 11px 8px; border: 1.5px solid #E5E7EB; border-radius: 12px;
  background: #fff; cursor: pointer; font-size: .85rem; font-weight: 600;
  color: #374151; transition: all .2s;
}
.gc-amount-btn:hover { border-color: #C4B5FD; background: #F5F3FF; }
.gc-amount-btn.selected { border-color: #7C3AED; background: #F5F3FF; color: #5B21B6; box-shadow: 0 0 0 3px #EDE9FE; }
.gc-amount-custom { grid-column: span 3; font-weight: 500; color: #7C3AED; }

/* ── INPUTS ── */
.gc-input, .gc-textarea {
  border: 1.5px solid #DDD6FE; border-radius: 12px;
  padding: 12px 16px; font-size: .93rem; outline: none;
  transition: border-color .2s; width: 100%; box-sizing: border-box;
  font-family: inherit;
}
.gc-input:focus, .gc-textarea:focus { border-color: #7C3AED; }
.gc-textarea { resize: vertical; min-height: 72px; }
.gc-char-count { font-size: .74rem; color: #9CA3AF; text-align: right; margin-top: -6px; }

/* ── ERROR ── */
.gc-error {
  background: #FEF2F2; border: 1px solid #FECACA;
  border-radius: 10px; padding: 10px 14px;
  color: #DC2626; font-size: .84rem;
}

/* ── SUMMARY ── */
.gc-summary-card {
  background: #F8F5FF; border: 1px solid #DDD6FE; border-radius: 16px;
  padding: 16px; display: flex; flex-direction: column; gap: 10px;
}
.gc-summary-row { display: flex; justify-content: space-between; align-items: center; }
.gc-summary-label { font-size: .82rem; color: #6B7280; }
.gc-summary-val { font-size: .9rem; font-weight: 600; color: #374151; }
.gc-summary-amount { font-size: 1.2rem; color: #5B21B6; font-weight: 800; }
.gc-summary-message {
  font-size: .82rem; color: #7C3AED; font-style: italic;
  border-top: 1px solid #EDE9FE; padding-top: 10px; line-height: 1.5;
}
.gc-pay-note {
  font-size: .8rem; color: #6B7280; line-height: 1.6;
  background: #F9FAFB; border-radius: 10px; padding: 12px;
}

/* ── BOTONES ── */
.gc-btn-primary {
  background: linear-gradient(135deg, #5B21B6, #7C3AED);
  color: #fff; border: none; border-radius: 14px;
  padding: 15px; font-size: 1rem; font-weight: 700;
  cursor: pointer; width: 100%; margin-top: 4px; transition: opacity .2s;
}
.gc-btn-primary:disabled { opacity: .7; cursor: not-allowed; }
.gc-btn-back {
  background: none; border: 1.5px solid #DDD6FE; border-radius: 14px;
  padding: 12px; font-size: .9rem; color: #7C3AED;
  cursor: pointer; width: 100%; font-weight: 600;
}

/* ── SUCCESS ── */
.gc-success { align-items: center; }
.gc-success-icon { font-size: 3rem; margin-bottom: 4px; }
.gc-success-title { font-size: 1.4rem; font-weight: 800; color: #1F2937; }
.gc-success-sub { font-size: .88rem; color: #6B7280; text-align: center; margin-bottom: 8px; }

/* ── TARJETA PREVIEW ── */
.gc-card-preview {
  width: 100%; border-radius: 20px; padding: 24px 20px 20px;
  position: relative; overflow: hidden; text-align: center;
  background: linear-gradient(140deg, #5B21B6 0%, #7C3AED 60%, #9F67F5 100%);
  margin: 4px 0 12px; box-sizing: border-box;
}
.gc-card--birthday   { background: linear-gradient(140deg, #7C2D92 0%, #C026D3 60%, #E879F9 100%); }
.gc-card--mother     { background: linear-gradient(140deg, #9D174D 0%, #DB2777 60%, #F472B6 100%); }
.gc-card--father     { background: linear-gradient(140deg, #1E3A5F 0%, #1D4ED8 60%, #60A5FA 100%); }
.gc-card--love       { background: linear-gradient(140deg, #881337 0%, #E11D48 60%, #FB7185 100%); }
.gc-card--christmas  { background: linear-gradient(140deg, #14532D 0%, #16A34A 60%, #4ADE80 100%); }
.gc-card--graduation { background: linear-gradient(140deg, #78350F 0%, #D97706 60%, #FCD34D 100%); }
.gc-card--anniversary{ background: linear-gradient(140deg, #4A044E 0%, #A21CAF 60%, #E879F9 100%); }
.gc-card--other      { background: linear-gradient(140deg, #1E1B4B 0%, #4338CA 60%, #818CF8 100%); }

.gc-card-brand {
  font-size: .7rem; font-weight: 900; letter-spacing: .25em;
  color: rgba(255,255,255,.7); margin-bottom: 12px;
}
.gc-card-occasion { font-size: 1rem; font-weight: 700; color: #fff; margin-bottom: 6px; }
.gc-card-msg {
  font-size: .8rem; color: rgba(255,255,255,.85); font-style: italic;
  line-height: 1.5; margin-bottom: 14px; padding: 0 8px;
}
.gc-card-code-label {
  font-size: .65rem; color: rgba(255,255,255,.6);
  text-transform: uppercase; letter-spacing: .1em; margin-bottom: 4px;
}
.gc-card-code {
  font-size: 1.5rem; font-weight: 900; letter-spacing: .15em;
  color: #fff; font-family: monospace; margin-bottom: 10px;
}
.gc-card-balance {
  font-size: 1.8rem; font-weight: 900; color: #fff;
  text-shadow: 0 2px 8px rgba(0,0,0,.2);
}
.gc-card-footer {
  font-size: .68rem; color: rgba(255,255,255,.5); margin-top: 14px;
  padding-top: 10px; border-top: 1px solid rgba(255,255,255,.15);
}

/* ── BOTONES ACCIÓN ── */
.gc-copy-btn {
  width: 100%; background: #5B21B6; color: #fff; border: none;
  border-radius: 14px; padding: 14px; font-size: .95rem;
  font-weight: 700; cursor: pointer; letter-spacing: .03em;
}
.gc-wa-btn {
  width: 100%; background: #25D366; color: #fff; border: none;
  border-radius: 14px; padding: 14px; font-size: .95rem;
  font-weight: 700; cursor: pointer;
}
`;
