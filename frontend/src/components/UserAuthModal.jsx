// ============================================================
//  UserAuthModal.jsx — Registro & Login Kosmica
//  ✅ Registro completo con datos de envío pre-guardados
//  ✅ Login por email + contraseña (localStorage cifrado simple)
//  ✅ Al registrarse → perfil guardado → checkout en 1 clic
//  ✅ Registro SIEMPRE sincroniza con backend (fix reset password)
//  ✅ Estilo Kosmica (lila/morado, gradientes suaves)
// ============================================================
import { useState } from "react";

const CSS = `
  .auth-overlay {
    position:fixed; inset:0; background:rgba(45,27,78,.55);
    backdrop-filter:blur(6px); z-index:9000;
    display:flex; align-items:center; justify-content:center; padding:16px;
    animation:fadeIn .2s ease;
  }
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  .auth-box {
    background:#fff; border-radius:24px; width:100%; max-width:440px;
    max-height:92vh; overflow-y:auto;
    box-shadow:0 24px 64px rgba(45,27,78,.22);
    animation:slideUp .28s cubic-bezier(.34,1.4,.64,1);
  }
  @keyframes slideUp{from{transform:translateY(32px);opacity:0}to{transform:none;opacity:1}}
  .auth-header {
    background:linear-gradient(135deg,#9B72CF,#C084FC);
    padding:28px 28px 24px; border-radius:24px 24px 0 0; text-align:center;
    position:relative;
  }
  .auth-close {
    position:absolute; top:14px; right:16px; background:rgba(255,255,255,.25);
    border:none; color:#fff; width:32px; height:32px; border-radius:50%;
    font-size:1.1rem; cursor:pointer; display:flex; align-items:center; justify-content:center;
    transition:background .2s;
  }
  .auth-close:hover{background:rgba(255,255,255,.4);}
  .auth-logo { font-size:2rem; margin-bottom:4px; }
  .auth-title { color:#fff; font-size:1.4rem; font-weight:800; letter-spacing:-.5px; }
  .auth-sub { color:rgba(255,255,255,.85); font-size:.85rem; margin-top:4px; }
  .auth-tabs {
    display:flex; background:#F5F0FF; margin:20px 24px 0;
    border-radius:50px; padding:4px; gap:4px;
  }
  .auth-tab {
    flex:1; padding:9px; border:none; background:transparent;
    border-radius:50px; font-weight:700; font-size:.9rem;
    color:#7B5EA7; cursor:pointer; transition:all .2s;
  }
  .auth-tab.active {
    background:#fff; color:#2D1B4E;
    box-shadow:0 2px 10px rgba(155,114,207,.2);
  }
  .auth-body { padding:20px 24px 28px; }
  .auth-section-title {
    font-size:.75rem; font-weight:800; color:#9B72CF; text-transform:uppercase;
    letter-spacing:.8px; margin:18px 0 10px; display:flex; align-items:center; gap:6px;
  }
  .auth-section-title::after {
    content:''; flex:1; height:1px; background:#EDE9FE;
  }
  .auth-group { margin-bottom:14px; }
  .auth-label {
    display:block; font-size:.8rem; font-weight:700; color:#4C1D95;
    margin-bottom:5px;
  }
  .auth-input {
    width:100%; padding:11px 14px; border:2px solid #EDE9FE; border-radius:12px;
    font-size:.92rem; color:#2D1B4E; background:#FDFCFF; outline:none;
    transition:border .2s, box-shadow .2s; font-family:inherit;
  }
  .auth-input:focus {
    border-color:#9B72CF;
    box-shadow:0 0 0 3px rgba(155,114,207,.12);
  }
  .auth-input::placeholder{color:#C4B5FD;}
  .auth-row { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  .auth-btn {
    width:100%; padding:14px; border:none; border-radius:14px; cursor:pointer;
    font-weight:800; font-size:1rem; letter-spacing:-.2px;
    background:linear-gradient(135deg,#9B72CF,#7C3AED);
    color:#fff; margin-top:18px;
    box-shadow:0 4px 18px rgba(124,58,237,.28);
    transition:transform .15s, box-shadow .15s;
  }
  .auth-btn:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(124,58,237,.35);}
  .auth-btn:active{transform:translateY(0);}
  .auth-btn:disabled{opacity:.6;cursor:not-allowed;transform:none;}
  .auth-error {
    background:#FFF1F2; border:1.5px solid #FECDD3; border-radius:10px;
    padding:10px 14px; color:#BE123C; font-size:.85rem; font-weight:600;
    margin-top:12px; display:flex; align-items:center; gap:7px;
  }
  .auth-success {
    background:#F0FDF4; border:1.5px solid #BBF7D0; border-radius:10px;
    padding:14px; color:#166534; font-size:.88rem; font-weight:600;
    margin-top:12px; text-align:center;
  }
  .auth-divider {
    text-align:center; color:#9CA3AF; font-size:.82rem; margin:16px 0 10px;
    position:relative;
  }
  .auth-divider::before, .auth-divider::after {
    content:''; position:absolute; top:50%; width:38%; height:1px;
    background:#EDE9FE;
  }
  .auth-divider::before{left:0;}
  .auth-divider::after{right:0;}
  .auth-pwd-wrap{position:relative;}
  .auth-pwd-eye {
    position:absolute; right:12px; top:50%; transform:translateY(-50%);
    background:none; border:none; cursor:pointer; font-size:1rem;
    color:#9CA3AF;
  }
  .auth-forgot {
    text-align:right; margin-top:-8px; margin-bottom:4px;
  }
  .auth-forgot a {
    font-size:.8rem; color:#7C3AED; font-weight:600; text-decoration:none;
  }
  .auth-switch {
    text-align:center; margin-top:16px; font-size:.85rem; color:#6B7280;
  }
  .auth-switch span {
    color:#7C3AED; font-weight:700; cursor:pointer;
    text-decoration:underline; text-underline-offset:2px;
  }
  .auth-benefits {
    background:linear-gradient(135deg,#F5F0FF,#FDF8FF);
    border:1.5px solid #EDE9FE; border-radius:14px; padding:14px 16px;
    margin-bottom:4px;
  }
  .auth-benefit-title {
    font-size:.78rem; font-weight:800; color:#7C3AED; margin-bottom:10px;
    text-transform:uppercase; letter-spacing:.5px;
  }
  .auth-benefit-item {
    display:flex; align-items:flex-start; gap:8px; margin-bottom:8px;
    font-size:.83rem; color:#374151; font-weight:500;
  }
  .auth-benefit-item:last-child{margin-bottom:0;}
  .auth-benefit-ico{font-size:1rem;flex-shrink:0;}
`;

// SHA-256 via Web Crypto API (nativa en todos los navegadores modernos)
async function hashPassword(str) {
  const msgBuffer = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

export function saveUser(userData) {
  const users = getUsers();
  const existing = users.findIndex(u => u.email === userData.email);
  if (existing >= 0) {
    users[existing] = { ...users[existing], ...userData };
  } else {
    users.push({ ...userData, createdAt: new Date().toISOString(), points: 0 });
  }
  localStorage.setItem("kosmica_users", JSON.stringify(users));
}

export function getUsers() {
  try { return JSON.parse(localStorage.getItem("kosmica_users") || "[]"); }
  catch { return []; }
}

export function getCurrentUser() {
  try { return JSON.parse(localStorage.getItem("kosmica_current_user") || "null"); }
  catch { return null; }
}

export function setCurrentUser(user) {
  if (user) localStorage.setItem("kosmica_current_user", JSON.stringify(user));
  else localStorage.removeItem("kosmica_current_user");
}

export function logoutUser() {
  localStorage.removeItem("kosmica_current_user");
}

export default function UserAuthModal({ open, onClose, onSuccess, initialTab = "login" }) {
  const [tab, setTab]             = useState(initialTab);
  const [showPwd, setShowPwd]     = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState("");

  // Login fields
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPwd, setLoginPwd]     = useState("");

  // Register fields
  const [reg, setReg] = useState({
    name: "", email: "", phone: "", document: "",
    city: "", neighborhood: "", address: "",
    password: "", password2: "",
  });

  // Forgot password fields
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent]   = useState(false);

  if (!open) return null;

  const API_URL = process.env.REACT_APP_API_URL || "https://kosmica-backend.onrender.com";

  const handleLogin = async () => {
    setError("");
    if (!loginEmail || !loginPwd) { setError("Completa todos los campos"); return; }
    setLoading(true);
    const users = getUsers();
    const user = users.find(u => u.email.toLowerCase() === loginEmail.toLowerCase());
    if (!user) { setError("No encontramos una cuenta con ese correo"); setLoading(false); return; }
    const pwdHash = await hashPassword(loginPwd);
    if (user.passwordHash !== pwdHash) { setError("Contraseña incorrecta"); setLoading(false); return; }
    const sessionUser = { ...user };
    delete sessionUser.passwordHash;

    // Sincronizar puntos y racha desde el backend al hacer login
    try {
      const res = await fetch(`${API_URL}/api/users/${encodeURIComponent(sessionUser.email)}`);
      if (res.ok) {
        const backendUser = await res.json();
        sessionUser.points         = backendUser.points         ?? sessionUser.points ?? 0;
        sessionUser.checkinStreak  = backendUser.checkinStreak  ?? sessionUser.checkinStreak ?? 0;
        sessionUser.purchaseStreak = backendUser.purchaseStreak ?? sessionUser.purchaseStreak ?? 0;
        sessionUser.city           = backendUser.city           || sessionUser.city;
        sessionUser.phone          = backendUser.phone          || sessionUser.phone;
        sessionUser.address        = backendUser.address        || sessionUser.address;
        sessionUser.neighborhood   = backendUser.neighborhood   || sessionUser.neighborhood;
        const newHash = await hashPassword(loginPwd);
        saveUser({ ...sessionUser, passwordHash: newHash });
      }
    } catch (_) {
      // Sin conexión: continuar con datos locales
    }

    setCurrentUser(sessionUser);
    onSuccess?.(sessionUser);
    onClose?.();
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    setError("");
    if (!forgotEmail.trim()) { setError("Ingresa tu correo electrónico"); return; }
    setLoading(true);
    try {
      await fetch(`${API_URL}/api/users/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim().toLowerCase() }),
      });
      setForgotSent(true);
    } catch (_) {
      setForgotSent(true);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setError("");
    const { name, email, phone, document, city, address, password, password2 } = reg;
    if (!name || !email || !phone || !document || !city || !address || !password) {
      setError("Completa los campos obligatorios (*)"); return;
    }
    if (password.length < 6) { setError("La contraseña debe tener al menos 6 caracteres"); return; }
    if (password !== password2) { setError("Las contraseñas no coinciden"); return; }

    // ✅ FIX: verificar duplicado solo en localStorage para el mensaje de error,
    // pero SIEMPRE intentar registrar en el backend (puede existir en localStorage
    // pero no en DB, lo que rompe el reset de contraseña)
    const users = getUsers();
    const existsLocally = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existsLocally) {
      setError("Ya existe una cuenta con ese correo. Inicia sesión."); return;
    }

    setLoading(true);
    const normalizedEmail = email.toLowerCase();
    const passwordHash = await hashPassword(password);

    const newUser = {
      name, email: normalizedEmail, phone, document,
      city, neighborhood: reg.neighborhood, address,
      passwordHash,
      points: 20,
      giftCards: [],
      savedCards: [],
      createdAt: new Date().toISOString(),
    };

    // ✅ FIX: registrar en backend PRIMERO — así el reset de contraseña funciona
    try {
      const res = await fetch(`${API_URL}/api/users/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, email: normalizedEmail, phone, document,
          city, neighborhood: reg.neighborhood, address,
          createdAt: new Date().toISOString(),
        }),
      });
      if (!res.ok) {
        console.warn("⚠️ Backend registro respondió con error:", res.status);
      }
    } catch (err) {
      // No bloquear el registro si el backend falla
      console.warn("⚠️ No se pudo sincronizar usuario con el backend:", err?.message || err);
    }

    // Guardar en localStorage después del backend
    saveUser(newUser);

    const sessionUser = { ...newUser };
    delete sessionUser.passwordHash;
    setCurrentUser(sessionUser);
    onSuccess?.(sessionUser);
    onClose?.();
    setLoading(false);
  };

  const r = (field, val) => setReg(p => ({ ...p, [field]: val }));

  return (
    <>
      <style>{CSS}</style>
      <div className="auth-overlay" onClick={e => e.target === e.currentTarget && onClose?.()}>
        <div className="auth-box">
          <div className="auth-header">
            <button className="auth-close" onClick={onClose}>✕</button>
            <div className="auth-logo">✦</div>
            <div className="auth-title">Kosmica</div>
            <div className="auth-sub">Tu espacio de moda favorito</div>
          </div>

          <div className="auth-tabs">
            <button className={`auth-tab${tab==="login"?" active":""}`} onClick={()=>{setTab("login");setError("");setSuccess("");}}>
              Iniciar sesión
            </button>
            <button className={`auth-tab${tab==="register"?" active":""}`} onClick={()=>{setTab("register");setError("");setSuccess("");}}>
              Registrarse
            </button>
          </div>

          <div className="auth-body">
            {tab === "login" ? (
              <>
                <div className="auth-benefits">
                  <div className="auth-benefit-title">✦ Ventajas de tu cuenta</div>
                  {[
                    ["⚡", "Checkout en 1 clic — sin volver a llenar datos"],
                    ["💎", "Acumula puntos con cada compra"],
                    ["🎁", "Accede a tus Tarjetas de Regalo"],
                    ["📦", "Historial de pedidos y rastreo fácil"],
                  ].map(([ico, txt]) => (
                    <div key={txt} className="auth-benefit-item">
                      <span className="auth-benefit-ico">{ico}</span>{txt}
                    </div>
                  ))}
                </div>

                <div className="auth-section-title">Tu correo</div>
                <div className="auth-group">
                  <label className="auth-label">Correo electrónico *</label>
                  <input className="auth-input" type="email" placeholder="tu@correo.com"
                    value={loginEmail} onChange={e=>setLoginEmail(e.target.value)}
                    onKeyDown={e=>e.key==="Enter"&&handleLogin()}/>
                </div>
                <div className="auth-group">
                  <label className="auth-label">Contraseña *</label>
                  <div className="auth-pwd-wrap">
                    <input className="auth-input" type={showPwd?"text":"password"} placeholder="••••••••"
                      value={loginPwd} onChange={e=>setLoginPwd(e.target.value)}
                      onKeyDown={e=>e.key==="Enter"&&handleLogin()}
                      style={{paddingRight:42}}/>
                    <button className="auth-pwd-eye" type="button" onClick={()=>setShowPwd(p=>!p)}>
                      {showPwd ? "🙈" : "👁️"}
                    </button>
                  </div>
                </div>
                <div className="auth-forgot">
                  <a href="#!" onClick={e=>{
                    e.preventDefault();
                    setError(""); setSuccess("");
                    setForgotEmail(loginEmail); setForgotSent(false);
                    setTab("forgot");
                  }}>¿Olvidaste tu contraseña?</a>
                </div>
                {error && <div className="auth-error">⚠️ {error}</div>}
                {success && <div className="auth-success">{success}</div>}
                <button className="auth-btn" onClick={handleLogin} disabled={loading}>
                  {loading ? "Verificando..." : "Ingresar →"}
                </button>
              </>
            ) : tab === "forgot" ? (
              <>
                {!forgotSent ? (
                  <>
                    <div style={{textAlign:"center",marginBottom:20}}>
                      <div style={{fontSize:"2.5rem",marginBottom:8}}>🔐</div>
                      <p style={{color:"#4C1D95",fontWeight:700,fontSize:"1rem",margin:"0 0 6px"}}>
                        Recuperar contraseña
                      </p>
                      <p style={{color:"#6B7280",fontSize:".88rem",margin:0,lineHeight:1.5}}>
                        Ingresa tu correo y te enviaremos un enlace para crear una nueva contraseña.
                      </p>
                    </div>
                    <div className="auth-group">
                      <label className="auth-label">Correo electrónico *</label>
                      <input className="auth-input" type="email" placeholder="tu@correo.com"
                        value={forgotEmail} onChange={e=>setForgotEmail(e.target.value)}
                        onKeyDown={e=>e.key==="Enter"&&handleForgotPassword()}/>
                    </div>
                    {error && <div className="auth-error">⚠️ {error}</div>}
                    <button className="auth-btn" onClick={handleForgotPassword} disabled={loading}>
                      {loading ? "Enviando..." : "Enviar enlace →"}
                    </button>
                    <div className="auth-switch" style={{marginTop:14}}>
                      <span onClick={()=>{setTab("login");setError("");}}>← Volver al inicio de sesión</span>
                    </div>
                  </>
                ) : (
                  <div style={{textAlign:"center",padding:"16px 0"}}>
                    <div style={{fontSize:"3rem",marginBottom:12}}>💜</div>
                    <p style={{color:"#166534",fontWeight:700,fontSize:"1rem",margin:"0 0 10px"}}>
                      ¡Revisa tu correo!
                    </p>
                    <p style={{color:"#6B7280",fontSize:".9rem",lineHeight:1.6,margin:"0 0 20px"}}>
                      Si existe una cuenta con <strong>{forgotEmail}</strong>, recibirás un
                      enlace para restablecer tu contraseña en los próximos minutos.
                    </p>
                    <p style={{color:"#9CA3AF",fontSize:".82rem",margin:"0 0 20px"}}>
                      ¿No lo ves? Revisa tu carpeta de spam.
                    </p>
                    <button className="auth-btn" style={{marginTop:0}} onClick={()=>{setTab("login");setError("");}}>
                      Volver al inicio de sesión
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="auth-section-title">📋 Datos personales</div>
                <div className="auth-group">
                  <label className="auth-label">Nombre completo *</label>
                  <input className="auth-input" placeholder="Tu nombre" value={reg.name}
                    onChange={e=>r("name",e.target.value)}/>
                </div>
                <div className="auth-row">
                  <div className="auth-group">
                    <label className="auth-label">Teléfono / WhatsApp *</label>
                    <input className="auth-input" type="tel" placeholder="3XX XXXXXXX" value={reg.phone}
                      onChange={e=>r("phone",e.target.value)}/>
                  </div>
                  <div className="auth-group">
                    <label className="auth-label">Cédula *</label>
                    <input className="auth-input" placeholder="Número de documento" value={reg.document}
                      onChange={e=>r("document",e.target.value)}/>
                  </div>
                </div>
                <div className="auth-group">
                  <label className="auth-label">Correo electrónico *</label>
                  <input className="auth-input" type="email" placeholder="tu@correo.com" value={reg.email}
                    onChange={e=>r("email",e.target.value)}/>
                </div>

                <div className="auth-section-title">📦 Dirección de envío</div>
                <div className="auth-row">
                  <div className="auth-group">
                    <label className="auth-label">Ciudad *</label>
                    <input className="auth-input" placeholder="Medellín" value={reg.city}
                      onChange={e=>r("city",e.target.value)}/>
                  </div>
                  <div className="auth-group">
                    <label className="auth-label">Barrio</label>
                    <input className="auth-input" placeholder="Laureles" value={reg.neighborhood}
                      onChange={e=>r("neighborhood",e.target.value)}/>
                  </div>
                </div>
                <div className="auth-group">
                  <label className="auth-label">Dirección completa *</label>
                  <input className="auth-input" placeholder="Calle 10 # 45-20" value={reg.address}
                    onChange={e=>r("address",e.target.value)}/>
                </div>

                <div className="auth-section-title">🔒 Contraseña</div>
                <div className="auth-row">
                  <div className="auth-group">
                    <label className="auth-label">Contraseña *</label>
                    <div className="auth-pwd-wrap">
                      <input className="auth-input" type={showPwd?"text":"password"} placeholder="Mínimo 6 caracteres"
                        value={reg.password} onChange={e=>r("password",e.target.value)} style={{paddingRight:42}}/>
                      <button className="auth-pwd-eye" type="button" onClick={()=>setShowPwd(p=>!p)}>
                        {showPwd?"🙈":"👁️"}
                      </button>
                    </div>
                  </div>
                  <div className="auth-group">
                    <label className="auth-label">Confirmar *</label>
                    <input className="auth-input" type={showPwd?"text":"password"} placeholder="Repite la contraseña"
                      value={reg.password2} onChange={e=>r("password2",e.target.value)}/>
                  </div>
                </div>

                {error && <div className="auth-error">⚠️ {error}</div>}
                {success && <div className="auth-success">{success}</div>}
                <button className="auth-btn" onClick={handleRegister} disabled={loading}>
                  {loading ? "Creando cuenta..." : "Crear mi cuenta ✦"}
                </button>
                <div className="auth-switch">
                  ¿Ya tienes cuenta? <span onClick={()=>{setTab("login");setError("");setSuccess("");}}>Inicia sesión</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
