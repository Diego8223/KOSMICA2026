// ============================================================
//  ReferralModal.jsx — Sistema "Invita y Gana"
//  
//  FLUJOS:
//    1. Usuario sin cuenta → Ve formulario de registro
//    2. Usuario registrado → Ve su código y botones de compartir
//    3. Receptor del link  → Al pagar, el código se valida y aplica
//
//  REGLAS DE NEGOCIO:
//    ✅ Solo usuarios registrados obtienen código
//    ✅ Código generado automáticamente (KOS-XXXXXX)
//    ✅ Solo lo redime el RECEPTOR, nunca el dueño
//    ✅ USO ÚNICO — una vez redimido queda bloqueado
//    ✅ Control en backend: no hay forma de saltárselo
// ============================================================

import { useState, useEffect } from "react";
import { referralAPI } from "../services/api";

const STORAGE_KEY = "kosmica_referral_user";

// Leer usuario registrado del localStorage
function getSavedUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveUser(user) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(user)); } catch {}
}

// ── Componente principal ───────────────────────────────────
export default function ReferralModal({ open, onClose }) {
  const [step, setStep] = useState("loading"); 
  // steps: "loading" | "register" | "mycode"
  
  const [savedUser, setSavedUser] = useState(null);
  const [form, setForm]           = useState({ name: "", email: "", phone: "" });
  const [dataConsent, setDataConsent] = useState(false);
  const [formError, setFormError] = useState("");
  const [loading, setLoading]     = useState(false);
  const [copied, setCopied]       = useState(false);
  const [codeData, setCodeData]   = useState(null); 
  // { code, ownerName, used, redeemedBy, redeemedAt }

  // ── Al abrir: ver si ya hay usuario guardado ──────────────
  useEffect(() => {
    if (!open) return;
    setCopied(false);
    setFormError("");
    const user = getSavedUser();
    setSavedUser(user);
    if (user?.email) {
      loadMyCode(user.email, user.name);
    } else {
      setStep("register");
    }
  }, [open]);

  async function loadMyCode(email, name) {
    setStep("loading");
    try {
      const data = await referralAPI.getMyCode(email);
      if (data.success) {
        setCodeData(data);
        setStep("mycode");
      } else {
        // No tiene código — lo registramos automáticamente si tenemos nombre
        if (name) {
          await registerUser(name, email, true);
        } else {
          setStep("register");
        }
      }
    } catch {
      setStep("register");
    }
  }

  async function registerUser(name, email, silent = false, phone = "") {
    setLoading(true);
    try {
      const data = await referralAPI.register(name, email, phone);
      if (data.success) {
        const user = { name, email };
        saveUser(user);
        setSavedUser(user);
        setCodeData(data);
        setStep("mycode");
        setFormError("");
      } else {
        if (!silent) setFormError(data.message || "Error al registrarse");
        else setStep("register");
      }
    } catch (e) {
      if (!silent) setFormError("Error de conexión. Intenta de nuevo.");
      else setStep("register");
    } finally {
      setLoading(false);
    }
  }

  function handleRegister(e) {
    e.preventDefault();
    const name  = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const phone = form.phone.trim();
    if (!name)  { setFormError("Por favor ingresa tu nombre"); return; }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFormError("Por favor ingresa un email válido"); return;
    }
    if (!phone || phone.length < 7) {
      setFormError("Por favor ingresa tu número de teléfono/WhatsApp"); return;
    }
    if (!dataConsent) {
      setFormError("Debes aceptar el tratamiento de datos personales para continuar"); return;
    }
    setFormError("");
    registerUser(name, email, false, phone);
  }

  const [copiedCode, setCopiedCode] = useState(false);

  function handleCopyCode() {
    navigator.clipboard.writeText(codeData?.code || "").then(() => {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 3000);
    });
  }

  function handleCopy() {
    const link = `https://www.kosmica.com.co/?ref=${codeData?.code}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  }

  function handleWhatsApp() {
    const link = `https://www.kosmica.com.co/?ref=${codeData?.code}`;
    const text = `¡Hola! Te recomiendo Kosmica, moda femenina premium 💜\n`
      + `Usa mi código ${codeData?.code} al comprar y obtén un descuento especial en tu primera compra:\n${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  function handleLogout() {
    localStorage.removeItem(STORAGE_KEY);
    setSavedUser(null);
    setCodeData(null);
    setForm({ name: "", email: "", phone: "" });
    setDataConsent(false);
    setStep("register");
  }

  if (!open) return null;

  const shareLink = codeData?.code
    ? `kosmica.com.co/?ref=${codeData.code}`
    : "";

  return (
    <>
      <style>{MODAL_CSS}</style>
      <div className="ref-overlay" onClick={onClose}>
        <div className="ref-box" onClick={e => e.stopPropagation()}>
          
          {/* ── HEADER ── */}
          <div className="ref-hero">
            <button className="ref-close" onClick={onClose}>✕</button>
            <div className="ref-emoji">🎁</div>
            <div className="ref-title">Invita y Gana</div>
            <div className="ref-sub">
              Comparte Kosmica con tus amigas y todas ganan 💜
            </div>
          </div>

          {/* ── CÓMO FUNCIONA ── */}
          <div className="ref-steps-row">
            <div className="ref-step">
              <div className="ref-step-num">1</div>
              <div className="ref-step-text">Regístrate y obtén tu código único</div>
            </div>
            <div className="ref-step">
              <div className="ref-step-num">2</div>
              <div className="ref-step-text">Comparte el link con tus amigas</div>
            </div>
            <div className="ref-step">
              <div className="ref-step-num">3</div>
              <div className="ref-step-text">¡Ella compra con descuento y tú ganas también!</div>
            </div>
          </div>

          <div className="ref-body">

            {/* ══ PASO: CARGANDO ══ */}
            {step === "loading" && (
              <div className="ref-loading">
                <div className="ref-spinner" />
                <p>Cargando tu código...</p>
              </div>
            )}

            {/* ══ PASO: REGISTRO ══ */}
            {step === "register" && (
              <div className="ref-register">
                <p className="ref-register-desc">
                  Para obtener tu código de referido, regístrate con tu nombre y email.
                  <br />
                  <span style={{ color: "var(--muted)", fontSize: ".82rem" }}>
                    Si ya te registraste, ingresa el mismo email.
                  </span>
                </p>
                <form onSubmit={handleRegister} className="ref-form">
                  <input
                    type="text"
                    placeholder="Tu nombre"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="ref-input"
                    required
                  />
                  <input
                    type="email"
                    placeholder="Tu email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="ref-input"
                    required
                  />
                  <input
                    type="tel"
                    placeholder="Tu WhatsApp / teléfono (ej: 3001234567)"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    className="ref-input"
                    required
                  />
                  <label className="ref-consent-label">
                    <input
                      type="checkbox"
                      checked={dataConsent}
                      onChange={e => setDataConsent(e.target.checked)}
                      className="ref-consent-check"
                    />
                    <span>
                      Acepto el{" "}
                      <a href="/politica-de-privacidad" target="_blank" rel="noopener noreferrer" className="ref-consent-link">
                        tratamiento de mis datos personales
                      </a>{" "}
                      conforme a la Ley 1581 de 2012.
                    </span>
                  </label>
                  {formError && (
                    <div className="ref-error">⚠️ {formError}</div>
                  )}
                  <button
                    type="submit"
                    className="ref-submit-btn"
                    disabled={loading}
                  >
                    {loading ? "Generando tu código..." : "Obtener mi código gratis"}
                  </button>
                </form>
              </div>
            )}

            {/* ══ PASO: VER MI CÓDIGO ══ */}
            {step === "mycode" && codeData && (
              <div className="ref-mycode">
                {/* Usuario identificado */}
                <div className="ref-user-badge">
                  <span className="ref-user-name">👤 {savedUser?.name || codeData.ownerName}</span>
                  <button className="ref-logout-btn" onClick={handleLogout}>
                    Cambiar cuenta
                  </button>
                </div>

                {/* Estado del código */}
                {codeData.used ? (
                  <div className="ref-used-notice">
                    <div className="ref-used-icon">✅</div>
                    <div>
                      <div className="ref-used-title">Tu código fue redimido</div>
                      <div className="ref-used-sub">
                        {codeData.redeemedBy
                          ? `Por ${codeData.redeemedBy}`
                          : "Ya fue utilizado"}
                        {codeData.redeemedAt && ` · ${new Date(codeData.redeemedAt).toLocaleDateString("es-CO")}`}
                      </div>
                      <div className="ref-used-note">
                        ¡Nuevo código generado automáticamente! Compártelo de nuevo 🎉
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="ref-active-notice">
                    <div className="ref-active-icon">🟢</div>
                    <div className="ref-active-text">
                      Código activo — disponible para compartir
                    </div>
                  </div>
                )}

                {/* El código */}
                <div className="ref-label">Tu código exclusivo</div>
                <div className="ref-code-display">
                  <span className="ref-code-value">{codeData.code}</span>
                </div>
                <button className="ref-copy-code-btn" onClick={handleCopyCode}>
                  {copiedCode ? "✓ ¡Código copiado!" : "📋 Copiar código"}
                </button>

                {/* El link */}
                <div className="ref-label">Tu link de referida</div>
                <div className="ref-link-box">
                  <span className="ref-link-val">{shareLink}</span>
                  <button className="ref-copy-btn" onClick={handleCopy}>
                    {copied ? "✓ Copiado" : "Copiar"}
                  </button>
                </div>

                {/* Compartir */}
                <button className="ref-wa-btn" onClick={handleWhatsApp}>
                  💬 Compartir por WhatsApp
                </button>

                {/* Nota aclaratoria */}
                <div className="ref-disclaimer">
                  <strong>¿Cómo funciona?</strong> Tu amiga ingresa por tu link o ingresa 
                  el código <strong>{codeData.code}</strong> al pagar. 
                  Ella obtiene un descuento en su compra. Tú también ganas 💜
                  <br />
                  <em>El código no puede ser usado por ti misma. Solo funciona una vez.</em>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}

// ── Exportar también el helper para obtener el email guardado ──
export function getReferralUser() {
  return getSavedUser();
}

// ── CSS del modal ──────────────────────────────────────────
const MODAL_CSS = `
.ref-overlay {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(0,0,0,.55); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
  padding: 16px;
}
.ref-box {
  background: #fff; border-radius: 24px; width: 100%;
  max-width: 420px; max-height: 90vh; overflow-y: auto;
  box-shadow: 0 24px 64px rgba(0,0,0,.18);
  position: relative;
}
.ref-hero {
  background: linear-gradient(135deg, #7C3AED 0%, #9F67F5 100%);
  border-radius: 24px 24px 0 0; padding: 32px 24px 20px;
  text-align: center; position: relative;
}
.ref-close {
  position: absolute; top: 14px; right: 14px;
  background: rgba(255,255,255,.2); border: none; border-radius: 50%;
  width: 32px; height: 32px; cursor: pointer; color: #fff;
  font-size: 1rem; display: flex; align-items: center; justify-content: center;
}
.ref-emoji { font-size: 2.4rem; margin-bottom: 8px; }
.ref-title { font-size: 1.5rem; font-weight: 800; color: #fff; margin-bottom: 6px; }
.ref-sub { color: rgba(255,255,255,.9); font-size: .9rem; line-height: 1.4; }

.ref-steps-row {
  display: flex; gap: 0; padding: 16px 20px 0;
  background: #F8F5FF;
}
.ref-step {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; text-align: center; padding: 10px 6px;
}
.ref-step-num {
  width: 28px; height: 28px; border-radius: 50%;
  background: #7C3AED; color: #fff;
  font-size: .85rem; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 6px; flex-shrink: 0;
}
.ref-step-text { font-size: .74rem; color: #555; line-height: 1.35; }

.ref-body { padding: 20px; }

/* Loading */
.ref-loading { text-align: center; padding: 32px; }
.ref-spinner {
  width: 36px; height: 36px; border: 3px solid #E9D5FF;
  border-top-color: #7C3AED; border-radius: 50%;
  animation: refSpin .7s linear infinite; margin: 0 auto 12px;
}
@keyframes refSpin { to { transform: rotate(360deg); } }

/* Registro */
.ref-register-desc { font-size: .88rem; color: #555; margin-bottom: 16px; line-height: 1.5; }
.ref-form { display: flex; flex-direction: column; gap: 12px; }
.ref-input {
  border: 1.5px solid #DDD6FE; border-radius: 12px;
  padding: 12px 16px; font-size: .93rem; outline: none;
  transition: border-color .2s;
}
.ref-input:focus { border-color: #7C3AED; }
.ref-error {
  background: #FEF2F2; border: 1px solid #FECACA;
  border-radius: 10px; padding: 10px 14px;
  color: #DC2626; font-size: .84rem;
}
.ref-submit-btn {
  background: linear-gradient(135deg, #7C3AED, #9F67F5);
  color: #fff; border: none; border-radius: 12px;
  padding: 14px; font-size: .95rem; font-weight: 700;
  cursor: pointer; transition: opacity .2s;
}
.ref-submit-btn:disabled { opacity: .7; cursor: not-allowed; }

/* Mi código */
.ref-user-badge {
  display: flex; align-items: center; justify-content: space-between;
  background: #F5F3FF; border-radius: 10px; padding: 10px 14px;
  margin-bottom: 14px;
}
.ref-user-name { font-size: .88rem; font-weight: 600; color: #5B21B6; }
.ref-logout-btn {
  background: none; border: 1px solid #C4B5FD; border-radius: 8px;
  padding: 4px 10px; font-size: .76rem; color: #7C3AED; cursor: pointer;
}
.ref-used-notice {
  display: flex; gap: 12px; align-items: flex-start;
  background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 12px;
  padding: 14px; margin-bottom: 14px;
}
.ref-used-icon { font-size: 1.3rem; flex-shrink: 0; }
.ref-used-title { font-weight: 700; color: #15803D; font-size: .9rem; }
.ref-used-sub { font-size: .82rem; color: #166534; margin-top: 2px; }
.ref-used-note { font-size: .8rem; color: #15803D; margin-top: 6px; }

.ref-active-notice {
  display: flex; align-items: center; gap: 8px;
  background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 10px;
  padding: 10px 14px; margin-bottom: 14px;
  font-size: .86rem; color: #15803D; font-weight: 600;
}
.ref-active-icon { font-size: 1rem; }

.ref-label {
  font-size: .75rem; font-weight: 700; color: #7C3AED;
  text-transform: uppercase; letter-spacing: .07em;
  margin-bottom: 6px; margin-top: 10px;
}
.ref-code-display {
  background: linear-gradient(135deg, #F5F3FF, #EDE9FE);
  border: 2px dashed #C4B5FD; border-radius: 14px;
  padding: 16px; text-align: center; margin-bottom: 12px;
}
.ref-code-value {
  font-size: 1.6rem; font-weight: 800; letter-spacing: .12em;
  color: #5B21B6; font-family: monospace;
}
.ref-link-box {
  display: flex; align-items: center; justify-content: space-between;
  background: #F9F5FF; border: 1.5px solid #DDD6FE; border-radius: 12px;
  padding: 10px 14px; gap: 8px; margin-bottom: 12px;
}
.ref-link-val {
  font-size: .82rem; color: #6D28D9; flex: 1;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.ref-copy-btn {
  background: #7C3AED; color: #fff; border: none;
  border-radius: 8px; padding: 7px 14px;
  font-size: .8rem; font-weight: 600; cursor: pointer;
  white-space: nowrap; flex-shrink: 0;
}
.ref-wa-btn {
  width: 100%; background: #25D366; color: #fff; border: none;
  border-radius: 14px; padding: 14px; font-size: .95rem;
  font-weight: 700; cursor: pointer; margin-bottom: 14px;
}
.ref-disclaimer {
  font-size: .78rem; color: #888; line-height: 1.5;
  background: #F9FAFB; border-radius: 10px; padding: 12px;
  text-align: center;
}
.ref-consent-label {
  display: flex; align-items: flex-start; gap: 10px;
  font-size: .82rem; color: #555; line-height: 1.45;
  cursor: pointer; padding: 4px 0;
}
.ref-consent-check {
  width: 16px; height: 16px; flex-shrink: 0;
  accent-color: #7C3AED; margin-top: 1px; cursor: pointer;
}
.ref-consent-link {
  color: #7C3AED; text-decoration: underline;
}
.ref-copy-code-btn {
  width: 100%; background: #5B21B6; color: #fff;
  border: none; border-radius: 12px; padding: 13px;
  font-size: .95rem; font-weight: 700; cursor: pointer;
  margin-bottom: 10px; transition: background .2s;
  letter-spacing: .03em;
}
.ref-copy-code-btn:hover { background: #4C1D95; }
`;
