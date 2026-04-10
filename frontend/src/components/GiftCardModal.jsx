// ============================================================
//  GiftCardModal.jsx — Tarjetas de Regalo Kosmica (Rediseño)
// ============================================================

import { useState } from "react";
import api from "../services/api";

const OCCASIONS = [
  { id: "birthday",    emoji: "🎂", label: "Cumpleaños",   color: "#C026D3" },
  { id: "mother",      emoji: "💐", label: "Día Madre",     color: "#DB2777" },
  { id: "love",        emoji: "💑", label: "Amor",          color: "#E11D48" },
  { id: "christmas",   emoji: "🎄", label: "Navidad",       color: "#16A34A" },
  { id: "graduation",  emoji: "🎓", label: "Graduación",    color: "#D97706" },
  { id: "anniversary", emoji: "💍", label: "Aniversario",   color: "#A21CAF" },
  { id: "friend",      emoji: "👯", label: "Para mi amiga", color: "#0EA5E9" },
  { id: "other",       emoji: "✨", label: "Otra ocasión",  color: "#4338CA" },
];

const AMOUNTS = [25000, 50000, 100000, 150000, 200000];

const GRADIENTS = {
  birthday:    "linear-gradient(140deg,#7C2D92,#C026D3,#E879F9)",
  mother:      "linear-gradient(140deg,#9D174D,#DB2777,#F472B6)",
  love:        "linear-gradient(140deg,#881337,#E11D48,#FB7185)",
  christmas:   "linear-gradient(140deg,#14532D,#16A34A,#4ADE80)",
  graduation:  "linear-gradient(140deg,#78350F,#D97706,#FCD34D)",
  anniversary: "linear-gradient(140deg,#4A044E,#A21CAF,#E879F9)",
  friend:      "linear-gradient(140deg,#0C4A6E,#0EA5E9,#7DD3FC)",
  other:       "linear-gradient(140deg,#1E1B4B,#4338CA,#818CF8)",
  default:     "linear-gradient(140deg,#5B21B6,#7C3AED,#9F67F5)",
};

function fmt(n) { return "$" + Number(n).toLocaleString("es-CO"); }

export default function GiftCardModal({ open, onClose }) {
  const [step, setStep]           = useState("design");
  const [occasion, setOccasion]   = useState(null);
  const [amount, setAmount]       = useState("");
  const [customAmt, setCustomAmt] = useState("");
  const [message, setMessage]     = useState("");
  const [recipientName, setRName] = useState("");
  const [recipientEmail, setREmail] = useState("");
  const [senderName, setSName]    = useState("");
  const [senderEmail, setSEmail]  = useState("");
  const [senderPhone, setSPhone]  = useState("");
  const [error, setError]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [giftCode, setGiftCode]   = useState(null);
  const [copied, setCopied]       = useState(false);

  const finalAmount = amount === "custom"
    ? parseInt(customAmt.replace(/\D/g,"") || "0")
    : parseInt(amount || "0");

  const occ  = OCCASIONS.find(o => o.id === occasion);
  const grad = GRADIENTS[occasion] || GRADIENTS.default;

  function reset() {
    setStep("design"); setOccasion(null); setAmount(""); setCustomAmt("");
    setMessage(""); setRName(""); setREmail(""); setSName(""); setSEmail("");
    setSPhone(""); setError(""); setGiftCode(null); setCopied(false);
  }

  function handleClose() { reset(); onClose(); }

  function nextFromDesign() {
    setError("");
    if (!occasion)                           return setError("Elige una ocasión");
    if (!finalAmount || finalAmount < 10000) return setError("El monto mínimo es $10.000");
    if (!recipientName.trim())               return setError("Ingresa el nombre de quien recibe");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail))
                                             return setError("Ingresa un email válido de quien recibe");
    setStep("pay");
  }

  async function handlePay() {
    setError("");
    if (!senderName.trim())  return setError("Ingresa tu nombre");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderEmail)) return setError("Ingresa tu email");
    if (senderPhone.trim().length < 7) return setError("Ingresa tu número de WhatsApp");
    setLoading(true);
    try {
      const data = await api.post("/gift-cards/purchase", {
        occasion, occasionLabel: occ?.label,
        amount: finalAmount, message: message.trim(),
        recipientName: recipientName.trim(),
        recipientEmail: recipientEmail.trim().toLowerCase(),
        senderName: senderName.trim(),
        senderEmail: senderEmail.trim().toLowerCase(),
        senderPhone: senderPhone.trim(),
      }).then(r => r.data);

      if (data.success) {
        setGiftCode(data.code);
        setStep("success");
        if (data.paymentUrl) window.open(data.paymentUrl, "_blank");
      } else {
        setError(data.message || "Error procesando. Intenta de nuevo.");
      }
    } catch(e) {
      setError(e?.message || "Error de conexión.");
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(giftCode || "").then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 3000);
    });
  }

  function handleWhatsApp() {
    const text =
      `🎁 *Tarjeta de Regalo Kosmica* ${occ?.emoji || ""}\n\n` +
      `Para: *${recipientName}*\n` +
      `Ocasión: ${occ?.emoji} ${occ?.label}\n` +
      `Saldo: *${fmt(finalAmount)}*\n\n` +
      (message ? `"${message}"\n\n` : "") +
      `🔑 Tu código: *${giftCode}*\n\n` +
      `Úsalo en www.kosmica.com.co al finalizar tu compra 💜`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  if (!open) return null;

  const STEPS = ["design","pay","success"];
  const stepIdx = STEPS.indexOf(step);

  return (
    <>
      <style>{CSS}</style>
      <div className="gc-overlay" onClick={handleClose}>
        <div className="gc-box" onClick={e => e.stopPropagation()}>

          <div className="gc-hero" style={{background: grad}}>
            <button className="gc-close" onClick={handleClose}>✕</button>
            <div className="gc-particles">
              {[...Array(8)].map((_,i) => <div key={i} className={`gc-particle gc-p${i+1}`}/>)}
            </div>
            <div className="gc-hero-inner">
              {step !== "success" ? (
                <>
                  <div className="gc-hero-icon">{occ?.emoji || "🎁"}</div>
                  <div className="gc-hero-brand">KOSMICA</div>
                  <div className="gc-hero-title">Tarjeta de Regalo</div>
                  {finalAmount > 0 && <div className="gc-hero-amount">{fmt(finalAmount)}</div>}
                  <div className="gc-hero-sub">
                    {step === "design" && "Sorprende a alguien especial 💜"}
                    {step === "pay"    && `Para: ${recipientName || "..."}`}
                  </div>
                </>
              ) : (
                <>
                  <div className="gc-success-anim">🎉</div>
                  <div className="gc-hero-brand">¡Lista para regalar!</div>
                  <div className="gc-hero-amount">{fmt(finalAmount)}</div>
                </>
              )}
            </div>
          </div>

          <div className="gc-progress">
            {STEPS.map((s, i) => (
              <div key={s} className="gc-prog-item">
                <div className={`gc-prog-dot ${i < stepIdx ? "done" : i === stepIdx ? "active" : ""}`}>
                  {i < stepIdx ? "✓" : i+1}
                </div>
                {i < STEPS.length-1 && <div className={`gc-prog-line ${i < stepIdx ? "done" : ""}`}/>}
              </div>
            ))}
          </div>

          <div className="gc-body">

            {step === "design" && (
              <div className="gc-section">
                <div className="gc-label">🎉 Ocasión</div>
                <div className="gc-occasions">
                  {OCCASIONS.map(o => (
                    <button key={o.id} type="button"
                      className={`gc-occ-btn ${occasion === o.id ? "selected" : ""}`}
                      style={occasion===o.id ? {borderColor:o.color,background:`${o.color}18`} : {}}
                      onClick={() => setOccasion(o.id)}>
                      <span className="gc-occ-emoji">{o.emoji}</span>
                      <span className="gc-occ-lbl">{o.label}</span>
                    </button>
                  ))}
                </div>

                <div className="gc-label">💰 Monto</div>
                <div className="gc-amounts">
                  {AMOUNTS.map(a => (
                    <button key={a} type="button"
                      className={`gc-amt-btn ${amount===String(a) ? "selected" : ""}`}
                      onClick={() => setAmount(String(a))}>{fmt(a)}</button>
                  ))}
                  <button type="button"
                    className={`gc-amt-btn gc-amt-custom ${amount==="custom" ? "selected" : ""}`}
                    onClick={() => setAmount("custom")}>✏️ Otro valor</button>
                </div>
                {amount === "custom" && (
                  <input className="gc-input" placeholder="Monto personalizado (mín. $10.000)"
                    value={customAmt} inputMode="numeric"
                    onChange={e => setCustomAmt(e.target.value.replace(/\D/g,""))}/>
                )}

                <div className="gc-label">👤 Para quién es</div>
                <input className="gc-input" placeholder="Nombre de quien recibe *"
                  value={recipientName} onChange={e => setRName(e.target.value)}/>
                <input className="gc-input" type="email" placeholder="Email de quien recibe *"
                  value={recipientEmail} onChange={e => setREmail(e.target.value)}/>

                <div className="gc-label">💬 Mensaje personal <span className="gc-optional">(opcional)</span></div>
                <textarea className="gc-textarea"
                  placeholder="Escribe algo desde el corazón..."
                  maxLength={160} value={message}
                  onChange={e => setMessage(e.target.value)}/>
                <div className="gc-charcount">{message.length}/160</div>

                {error && <div className="gc-error">⚠️ {error}</div>}
                <button className="gc-btn-primary" onClick={nextFromDesign}>Continuar →</button>
              </div>
            )}

            {step === "pay" && (
              <div className="gc-section">
                <div className="gc-card-preview" style={{background: grad}}>
                  <div className="gc-card-shine"/>
                  <div className="gc-card-top">
                    <span className="gc-card-brand">✦ KOSMICA</span>
                    <span className="gc-card-chip">💎</span>
                  </div>
                  <div className="gc-card-center">
                    <div className="gc-card-occ">{occ?.emoji} {occ?.label}</div>
                    {message && <div className="gc-card-msg">"{message}"</div>}
                  </div>
                  <div className="gc-card-bottom">
                    <div>
                      <div className="gc-card-for">Para</div>
                      <div className="gc-card-recipient">{recipientName}</div>
                    </div>
                    <div className="gc-card-value">{fmt(finalAmount)}</div>
                  </div>
                </div>

                <div className="gc-label">👤 Tus datos (quien regala)</div>
                <input className="gc-input" placeholder="Tu nombre *"
                  value={senderName} onChange={e => setSName(e.target.value)}/>
                <input className="gc-input" type="email" placeholder="Tu email *"
                  value={senderEmail} onChange={e => setSEmail(e.target.value)}/>
                <input className="gc-input" type="tel" placeholder="Tu WhatsApp *"
                  value={senderPhone} onChange={e => setSPhone(e.target.value)}/>

                <div className="gc-pay-note">
                  💳 Serás redirigido a MercadoPago. El código se genera automáticamente cuando
                  el pago sea aprobado y se envía al email de <strong>{recipientName}</strong>.
                </div>

                {error && <div className="gc-error">⚠️ {error}</div>}
                <button className="gc-btn-primary" onClick={handlePay} disabled={loading}>
                  {loading ? "⏳ Procesando..." : `💳 Pagar ${fmt(finalAmount)} con MercadoPago`}
                </button>
                <button className="gc-btn-back" onClick={() => { setError(""); setStep("design"); }}>
                  ← Volver
                </button>
              </div>
            )}

            {step === "success" && (
              <div className="gc-section gc-section-success">
                <p className="gc-success-sub">
                  Tu pago está siendo procesado. Cuando MercadoPago confirme, el código
                  llega al email de <strong>{recipientName}</strong> automáticamente.
                </p>

                {giftCode && (
                  <div className="gc-code-box">
                    <div className="gc-code-label">Código de regalo</div>
                    <div className="gc-code-value">{giftCode}</div>
                    <button className="gc-copy-btn" onClick={handleCopy}>
                      {copied ? "✅ ¡Copiado!" : "📋 Copiar código"}
                    </button>
                  </div>
                )}

                <div className="gc-success-actions">
                  <button className="gc-wa-btn" onClick={handleWhatsApp}>
                    💬 Enviar por WhatsApp
                  </button>
                  <button className="gc-btn-back" onClick={handleClose}>Cerrar</button>
                </div>
                <div className="gc-success-note">
                  ✨ El código también fue enviado al email de {recipientName}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}

const CSS = `
.gc-overlay {
  position:fixed;inset:0;background:rgba(15,5,35,.65);
  z-index:4000;display:flex;align-items:flex-end;
  backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);
}
.gc-box {
  width:100%;max-width:480px;margin:0 auto;
  background:#fff;border-radius:28px 28px 0 0;
  max-height:92vh;overflow-y:auto;
  animation:gcSlideUp .38s cubic-bezier(.22,1,.36,1);
  -webkit-overflow-scrolling:touch;
}
@keyframes gcSlideUp {
  from{transform:translateY(100%);opacity:0}
  to{transform:translateY(0);opacity:1}
}
.gc-hero {
  position:relative;padding:32px 20px 28px;
  border-radius:28px 28px 0 0;overflow:hidden;
  min-height:170px;display:flex;align-items:center;justify-content:center;
}
.gc-hero-inner{position:relative;z-index:2;text-align:center;width:100%;}
.gc-close {
  position:absolute;top:14px;right:14px;z-index:10;
  background:rgba(255,255,255,.2);border:1.5px solid rgba(255,255,255,.35);
  border-radius:50%;width:36px;height:36px;cursor:pointer;
  color:#fff;font-size:1rem;display:flex;align-items:center;justify-content:center;
}
.gc-close:hover{background:rgba(255,255,255,.35);}
.gc-hero-icon{font-size:2.6rem;margin-bottom:6px;}
.gc-hero-brand{font-size:.65rem;font-weight:900;letter-spacing:.3em;color:rgba(255,255,255,.7);margin-bottom:6px;}
.gc-hero-title{font-size:1.5rem;font-weight:800;color:#fff;margin-bottom:4px;}
.gc-hero-amount{font-size:2.2rem;font-weight:900;color:#fff;text-shadow:0 2px 12px rgba(0,0,0,.25);margin:6px 0;}
.gc-hero-sub{color:rgba(255,255,255,.85);font-size:.9rem;}
.gc-success-anim{font-size:3rem;margin-bottom:6px;animation:gcBounce .6s ease;}
@keyframes gcBounce{0%,100%{transform:scale(1)}40%{transform:scale(1.3)}}
.gc-particles{position:absolute;inset:0;z-index:1;pointer-events:none;}
.gc-particle{position:absolute;border-radius:50%;background:rgba(255,255,255,.08);}
.gc-p1{width:100px;height:100px;top:-30px;right:-20px;}
.gc-p2{width:60px;height:60px;top:20px;left:-15px;}
.gc-p3{width:40px;height:40px;bottom:10px;right:50px;background:rgba(255,255,255,.12);}
.gc-p4{width:80px;height:80px;bottom:-20px;left:30px;}
.gc-p5{width:30px;height:30px;top:10px;right:90px;background:rgba(255,255,255,.15);}
.gc-p6{width:50px;height:50px;top:50%;left:10%;}
.gc-p7{width:120px;height:120px;top:-50px;left:-30px;background:rgba(255,255,255,.04);}
.gc-p8{width:20px;height:20px;bottom:20px;right:20px;background:rgba(255,255,255,.2);}
.gc-progress{display:flex;align-items:center;justify-content:center;padding:14px 20px;background:#F8F5FF;gap:0;}
.gc-prog-item{display:flex;align-items:center;}
.gc-prog-dot{width:28px;height:28px;border-radius:50%;border:2px solid #DDD6FE;background:#fff;display:flex;align-items:center;justify-content:center;font-size:.72rem;font-weight:700;color:#9CA3AF;transition:all .3s;}
.gc-prog-dot.active{border-color:#7C3AED;background:#7C3AED;color:#fff;transform:scale(1.15);box-shadow:0 0 0 4px rgba(124,58,237,.2);}
.gc-prog-dot.done{border-color:#A78BFA;background:#A78BFA;color:#fff;}
.gc-prog-line{width:40px;height:2px;background:#DDD6FE;margin:0 4px;transition:background .3s;}
.gc-prog-line.done{background:#A78BFA;}
.gc-body{padding:20px;}
.gc-section{display:flex;flex-direction:column;gap:12px;}
.gc-section-success{align-items:center;text-align:center;}
.gc-label{font-size:.75rem;font-weight:800;color:#7C3AED;text-transform:uppercase;letter-spacing:.07em;}
.gc-optional{font-weight:400;color:#9CA3AF;text-transform:none;letter-spacing:0;}
.gc-occasions{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;}
.gc-occ-btn{display:flex;flex-direction:column;align-items:center;padding:10px 4px;border:1.5px solid #E5E7EB;border-radius:14px;background:#fff;cursor:pointer;transition:all .18s;gap:5px;}
.gc-occ-btn:hover{border-color:#C4B5FD;background:#F5F3FF;transform:translateY(-1px);}
.gc-occ-btn.selected{box-shadow:0 4px 12px rgba(124,58,237,.2);}
.gc-occ-emoji{font-size:1.5rem;}
.gc-occ-lbl{font-size:.65rem;color:#555;text-align:center;line-height:1.2;font-weight:600;}
.gc-amounts{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;}
.gc-amt-btn{padding:11px 6px;border:1.5px solid #E5E7EB;border-radius:12px;background:#fff;cursor:pointer;font-size:.85rem;font-weight:700;color:#374151;transition:all .18s;}
.gc-amt-btn:hover{border-color:#C4B5FD;background:#F5F3FF;}
.gc-amt-btn.selected{border-color:#7C3AED;background:linear-gradient(135deg,#F5F3FF,#EDE9FE);color:#5B21B6;box-shadow:0 0 0 3px #EDE9FE;}
.gc-amt-custom{grid-column:span 3;color:#7C3AED;}
.gc-input,.gc-textarea{border:1.5px solid #DDD6FE;border-radius:12px;padding:13px 16px;font-size:.93rem;outline:none;transition:all .2s;width:100%;box-sizing:border-box;font-family:inherit;color:#1F2937;}
.gc-input:focus,.gc-textarea:focus{border-color:#7C3AED;box-shadow:0 0 0 3px rgba(124,58,237,.12);}
.gc-textarea{resize:vertical;min-height:80px;}
.gc-charcount{font-size:.74rem;color:#9CA3AF;text-align:right;margin-top:-8px;}
.gc-error{background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;padding:11px 14px;color:#DC2626;font-size:.84rem;font-weight:600;}
.gc-card-preview{border-radius:20px;padding:20px;position:relative;overflow:hidden;color:#fff;box-sizing:border-box;box-shadow:0 12px 40px rgba(0,0,0,.25);}
.gc-card-shine{position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,.15) 0%,transparent 60%);pointer-events:none;}
.gc-card-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;}
.gc-card-brand{font-size:.65rem;font-weight:900;letter-spacing:.25em;opacity:.8;}
.gc-card-chip{font-size:1.4rem;}
.gc-card-center{text-align:center;padding:10px 0;}
.gc-card-occ{font-size:1rem;font-weight:700;margin-bottom:6px;}
.gc-card-msg{font-size:.8rem;opacity:.85;font-style:italic;line-height:1.5;}
.gc-card-bottom{display:flex;justify-content:space-between;align-items:flex-end;margin-top:16px;padding-top:12px;border-top:1px solid rgba(255,255,255,.2);}
.gc-card-for{font-size:.65rem;opacity:.7;margin-bottom:2px;letter-spacing:.05em;}
.gc-card-recipient{font-size:1rem;font-weight:800;}
.gc-card-value{font-size:1.5rem;font-weight:900;}
.gc-pay-note{background:#F0FDF4;border:1px solid #BBF7D0;border-radius:12px;padding:13px 16px;font-size:.82rem;color:#166534;line-height:1.6;}
.gc-btn-primary{background:linear-gradient(135deg,#5B21B6,#7C3AED);color:#fff;border:none;border-radius:14px;padding:16px;font-size:1rem;font-weight:700;cursor:pointer;width:100%;transition:all .2s;box-shadow:0 6px 20px rgba(124,58,237,.35);}
.gc-btn-primary:hover{filter:brightness(1.08);transform:translateY(-1px);}
.gc-btn-primary:disabled{opacity:.65;cursor:not-allowed;transform:none;}
.gc-btn-back{background:none;border:1.5px solid #DDD6FE;border-radius:14px;padding:13px;font-size:.9rem;color:#7C3AED;cursor:pointer;width:100%;font-weight:600;transition:all .2s;}
.gc-btn-back:hover{background:#F5F3FF;}
.gc-success-sub{color:#6B7280;font-size:.9rem;line-height:1.6;margin-bottom:4px;}
.gc-code-box{width:100%;background:linear-gradient(135deg,#F5F3FF,#EDE9FE);border:2px dashed #C4B5FD;border-radius:18px;padding:20px;text-align:center;box-sizing:border-box;}
.gc-code-label{font-size:.75rem;font-weight:700;color:#7C3AED;letter-spacing:.1em;margin-bottom:8px;text-transform:uppercase;}
.gc-code-value{font-size:1.8rem;font-weight:900;letter-spacing:.18em;color:#5B21B6;font-family:monospace;margin-bottom:14px;}
.gc-copy-btn{background:#5B21B6;color:#fff;border:none;border-radius:10px;padding:10px 22px;font-size:.9rem;font-weight:700;cursor:pointer;transition:all .2s;}
.gc-copy-btn:hover{background:#7C3AED;}
.gc-success-actions{display:flex;flex-direction:column;gap:10px;width:100%;}
.gc-wa-btn{background:linear-gradient(135deg,#22C55E,#16A34A);color:#fff;border:none;border-radius:14px;padding:15px;font-size:1rem;font-weight:700;cursor:pointer;width:100%;box-shadow:0 4px 14px rgba(34,197,94,.35);}
.gc-success-note{font-size:.78rem;color:#9CA3AF;margin-top:4px;}
`;
