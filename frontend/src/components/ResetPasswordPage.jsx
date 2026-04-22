// ============================================================
//  ResetPasswordPage.jsx — Kosmica
//  Página para restablecer contraseña desde el link del email
//  Flujo: validar token → ingresar nueva contraseña → guardar hash en localStorage
// ============================================================
import { useState, useEffect } from "react";

async function hashPassword(pwd) {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(pwd)
  );
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

function getUsers() {
  try { return JSON.parse(localStorage.getItem("kosmica_users") || "[]"); } catch { return []; }
}
function saveUsers(users) {
  localStorage.setItem("kosmica_users", JSON.stringify(users));
}

export default function ResetPasswordPage({ token }) {
  const [stage, setStage]       = useState("loading"); // loading | valid | invalid | success
  const [userEmail, setUserEmail] = useState("");
  const [pwd, setPwd]            = useState("");
  const [pwd2, setPwd2]          = useState("");
  const [showPwd, setShowPwd]    = useState(false);
  const [error, setError]        = useState("");
  const [loading, setLoading]    = useState(false);

  const API_URL = process.env.REACT_APP_API_URL || "";

  useEffect(() => {
    if (!token) { setStage("invalid"); return; }
    fetch(`${API_URL}/api/users/reset-password/validate?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(data => {
        if (data.valid) {
          setUserEmail(data.email || "");
          setStage("valid");
        } else {
          setStage("invalid");
        }
      })
      .catch(() => setStage("invalid"));
  }, [token]);

  const handleReset = async () => {
    setError("");
    if (!pwd) { setError("Ingresa tu nueva contraseña"); return; }
    if (pwd.length < 6) { setError("La contraseña debe tener al menos 6 caracteres"); return; }
    if (pwd !== pwd2) { setError("Las contraseñas no coinciden"); return; }
    setLoading(true);
    try {
      const newHash = await hashPassword(pwd);
      const res = await fetch(`${API_URL}/api/users/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, passwordHash: newHash }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Error al restablecer contraseña"); setLoading(false); return; }

      // Actualizar hash en localStorage para que el login funcione inmediatamente
      const email = data.email || userEmail;
      const users = getUsers();
      const idx = users.findIndex(u => u.email?.toLowerCase() === email.toLowerCase());
      if (idx >= 0) {
        users[idx].passwordHash = newHash;
        saveUsers(users);
      }
      setStage("success");
    } catch (_) {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    page: {
      minHeight: "100vh", background: "#F5F0FF",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "20px", fontFamily: "'DM Sans', Arial, sans-serif",
    },
    card: {
      background: "#fff", borderRadius: 24, width: "100%", maxWidth: 420,
      boxShadow: "0 24px 64px rgba(45,27,78,.18)", overflow: "hidden",
    },
    header: {
      background: "linear-gradient(135deg,#9B72CF,#7C3AED)",
      padding: "32px 28px", textAlign: "center",
    },
    title: { color: "#fff", fontSize: "1.5rem", fontWeight: 800, margin: "8px 0 0" },
    sub:   { color: "rgba(255,255,255,.85)", fontSize: ".9rem", margin: "6px 0 0" },
    body:  { padding: "28px 28px 32px" },
    label: { display: "block", fontSize: ".8rem", fontWeight: 700, color: "#4C1D95", marginBottom: 5 },
    input: {
      width: "100%", padding: "12px 14px", border: "2px solid #EDE9FE", borderRadius: 12,
      fontSize: ".92rem", color: "#2D1B4E", background: "#FDFCFF", outline: "none",
      fontFamily: "inherit", boxSizing: "border-box", transition: "border .2s",
    },
    btn: {
      width: "100%", padding: 14, border: "none", borderRadius: 14, cursor: "pointer",
      fontWeight: 800, fontSize: "1rem",
      background: "linear-gradient(135deg,#9B72CF,#7C3AED)", color: "#fff",
      marginTop: 18, boxShadow: "0 4px 18px rgba(124,58,237,.28)",
      transition: "transform .15s, box-shadow .15s",
    },
    error: {
      background: "#FFF1F2", border: "1.5px solid #FECDD3", borderRadius: 10,
      padding: "10px 14px", color: "#BE123C", fontSize: ".85rem", fontWeight: 600,
      marginTop: 12,
    },
    pwdWrap: { position: "relative" },
    eye: {
      position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
      background: "none", border: "none", cursor: "pointer", fontSize: "1rem", color: "#9CA3AF",
    },
  };

  if (stage === "loading") return (
    <div style={styles.page}>
      <div style={{ textAlign: "center", color: "#7C3AED" }}>
        <div style={{ fontSize: "2rem", marginBottom: 12 }}>⏳</div>
        <p style={{ fontWeight: 700 }}>Verificando enlace...</p>
      </div>
    </div>
  );

  if (stage === "invalid") return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={{ fontSize: "2.5rem" }}>❌</div>
          <h1 style={styles.title}>Enlace inválido</h1>
          <p style={styles.sub}>Este enlace ya expiró o no es válido</p>
        </div>
        <div style={styles.body}>
          <p style={{ color: "#6B7280", fontSize: ".95rem", lineHeight: 1.6, margin: "0 0 20px" }}>
            Los enlaces de recuperación son válidos por <strong>1 hora</strong>.
            Por favor solicita uno nuevo desde el inicio de sesión.
          </p>
          <button style={styles.btn} onClick={() => window.location.href = "/"}>
            Volver a la tienda
          </button>
        </div>
      </div>
    </div>
  );

  if (stage === "success") return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={{ ...styles.header, background: "linear-gradient(135deg,#059669,#10B981)" }}>
          <div style={{ fontSize: "2.5rem" }}>✅</div>
          <h1 style={styles.title}>¡Contraseña actualizada!</h1>
          <p style={styles.sub}>Ya puedes iniciar sesión con tu nueva contraseña</p>
        </div>
        <div style={styles.body}>
          <p style={{ color: "#6B7280", fontSize: ".95rem", lineHeight: 1.6, margin: "0 0 20px", textAlign: "center" }}>
            Tu contraseña fue cambiada exitosamente 💜
          </p>
          <button style={styles.btn} onClick={() => window.location.href = "/"}>
            Ir a la tienda e iniciar sesión
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={{ fontSize: "2.5rem" }}>🔐</div>
          <h1 style={styles.title}>Nueva contraseña</h1>
          <p style={styles.sub}>{userEmail}</p>
        </div>
        <div style={styles.body}>
          <div style={{ marginBottom: 16 }}>
            <label style={styles.label}>Nueva contraseña *</label>
            <div style={styles.pwdWrap}>
              <input
                style={{ ...styles.input, paddingRight: 42 }}
                type={showPwd ? "text" : "password"}
                placeholder="Mínimo 6 caracteres"
                value={pwd}
                onChange={e => setPwd(e.target.value)}
                onFocus={e => e.target.style.borderColor = "#9B72CF"}
                onBlur={e => e.target.style.borderColor = "#EDE9FE"}
              />
              <button style={styles.eye} type="button" onClick={() => setShowPwd(p => !p)}>
                {showPwd ? "🙈" : "👁️"}
              </button>
            </div>
          </div>
          <div style={{ marginBottom: 4 }}>
            <label style={styles.label}>Confirmar contraseña *</label>
            <input
              style={styles.input}
              type={showPwd ? "text" : "password"}
              placeholder="Repite la contraseña"
              value={pwd2}
              onChange={e => setPwd2(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleReset()}
              onFocus={e => e.target.style.borderColor = "#9B72CF"}
              onBlur={e => e.target.style.borderColor = "#EDE9FE"}
            />
          </div>
          {error && <div style={styles.error}>⚠️ {error}</div>}
          <button
            style={{ ...styles.btn, opacity: loading ? .6 : 1, cursor: loading ? "not-allowed" : "pointer" }}
            onClick={handleReset}
            disabled={loading}
          >
            {loading ? "Guardando..." : "Guardar nueva contraseña →"}
          </button>
          <div style={{ textAlign: "center", marginTop: 14 }}>
            <a href="/" style={{ fontSize: ".82rem", color: "#7C3AED", fontWeight: 600, textDecoration: "none" }}>
              ← Volver a la tienda
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
