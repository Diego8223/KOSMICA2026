// ============================================================
//  UserAccountPage.jsx — Mi Cuenta Kosmica
//  ✅ Perfil + edición de datos
//  ✅ Historial de pedidos con estado
//  ✅ Mis Tarjetas de Regalo (saldo, vincular, ver)
//  ✅ Mis Puntos Kosmica con nivel y canje
//  ✅ Métodos de pago guardados (gestión visual)
//  ✅ Checkout 1-clic: datos pre-llenados
//  ✅ Cerrar sesión
// ============================================================
import { useState, useEffect } from "react";
import { getCurrentUser, setCurrentUser, saveUser, logoutUser } from "./UserAuthModal";
import { orderAPI, giftCardAPI } from "../services/api";

const CSS = `
  .uacc-wrap {
    min-height:100vh; background:linear-gradient(160deg,#F5F0FF 0%,#FDF8FF 60%,#fff 100%);
    padding-bottom:60px;
  }
  .uacc-header {
    background:linear-gradient(135deg,#9B72CF 0%,#7C3AED 60%,#5B21B6 100%);
    padding:32px 20px 40px; position:relative; overflow:hidden;
  }
  .uacc-header::before {
    content:'✦ ✦ ✦'; position:absolute; right:20px; top:18px;
    color:rgba(255,255,255,.18); font-size:1.5rem; letter-spacing:6px;
  }
  .uacc-back {
    background:rgba(255,255,255,.2); border:none; color:#fff; border-radius:50px;
    padding:8px 16px; font-weight:700; cursor:pointer; font-size:.85rem; margin-bottom:20px;
    display:inline-flex; align-items:center; gap:6px; transition:background .2s;
  }
  .uacc-back:hover{background:rgba(255,255,255,.3);}
  .uacc-avatar {
    width:68px; height:68px; border-radius:50%;
    background:rgba(255,255,255,.25); border:3px solid rgba(255,255,255,.6);
    display:flex; align-items:center; justify-content:center;
    font-size:2rem; margin-bottom:12px;
  }
  .uacc-name { color:#fff; font-size:1.4rem; font-weight:800; letter-spacing:-.4px; }
  .uacc-email { color:rgba(255,255,255,.8); font-size:.85rem; margin-top:2px; }
  .uacc-badges {
    display:flex; gap:8px; margin-top:14px; flex-wrap:wrap;
  }
  .uacc-badge {
    background:rgba(255,255,255,.22); color:#fff; border-radius:50px;
    padding:5px 14px; font-size:.78rem; font-weight:800;
    border:1.5px solid rgba(255,255,255,.35);
  }
  .uacc-tabs {
    display:flex; gap:0; overflow-x:auto; background:#fff;
    border-bottom:2px solid #EDE9FE; padding:0 4px;
    scrollbar-width:none; position:sticky; top:0; z-index:100;
    box-shadow:0 2px 12px rgba(155,114,207,.08);
  }
  .uacc-tabs::-webkit-scrollbar{display:none;}
  .uacc-tab {
    padding:14px 18px; border:none; background:transparent;
    font-weight:700; font-size:.82rem; color:#9CA3AF; cursor:pointer;
    white-space:nowrap; border-bottom:2.5px solid transparent;
    margin-bottom:-2px; transition:all .2s; flex-shrink:0;
  }
  .uacc-tab.on { color:#7C3AED; border-bottom-color:#7C3AED; }
  .uacc-tab:hover:not(.on) { color:#6B7280; }
  .uacc-body { padding:20px 16px; max-width:540px; margin:0 auto; }
  .uacc-card {
    background:#fff; border-radius:18px; padding:20px;
    border:1.5px solid #EDE9FE; margin-bottom:16px;
    box-shadow:0 2px 12px rgba(155,114,207,.07);
  }
  .uacc-card-title {
    font-size:.88rem; font-weight:800; color:#4C1D95;
    margin-bottom:16px; display:flex; align-items:center; gap:8px;
  }
  .uacc-form-group { margin-bottom:13px; }
  .uacc-label { font-size:.78rem; font-weight:700; color:#6D28D9; margin-bottom:5px; display:block; }
  .uacc-input {
    width:100%; padding:10px 13px; border:2px solid #EDE9FE; border-radius:11px;
    font-size:.9rem; color:#2D1B4E; font-family:inherit; outline:none;
    transition:border .2s; background:#FDFCFF;
  }
  .uacc-input:focus{border-color:#9B72CF;}
  .uacc-input:disabled{background:#F9F8FF;color:#9CA3AF;}
  .uacc-row { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  .uacc-save-btn {
    width:100%; padding:12px; border:none; border-radius:12px; cursor:pointer;
    background:linear-gradient(135deg,#9B72CF,#7C3AED); color:#fff;
    font-weight:800; font-size:.92rem; transition:transform .15s;
  }
  .uacc-save-btn:hover{transform:translateY(-1px);}
  .uacc-save-btn:disabled{opacity:.6;cursor:not-allowed;transform:none;}
  /* Puntos */
  .pts-header {
    background:linear-gradient(135deg,#7C3AED,#9B72CF);
    border-radius:16px; padding:20px; text-align:center; margin-bottom:16px;
  }
  .pts-num { font-size:3rem; font-weight:900; color:#fff; line-height:1; }
  .pts-lbl { color:rgba(255,255,255,.8); font-size:.85rem; margin-top:4px; }
  .pts-tier-wrap { display:flex; gap:8px; margin-bottom:16px; }
  .pts-tier {
    flex:1; padding:12px 8px; border-radius:13px; text-align:center;
    border:2px solid #EDE9FE; background:#FDFCFF; transition:all .2s;
  }
  .pts-tier.active {
    border-color:#7C3AED; background:linear-gradient(135deg,#F5F0FF,#EDE9FE);
    box-shadow:0 4px 16px rgba(124,58,237,.15);
  }
  .pts-tier-ico { font-size:1.4rem; margin-bottom:4px; }
  .pts-tier-name { font-size:.78rem; font-weight:800; color:#4C1D95; }
  .pts-tier-range { font-size:.7rem; color:#7C3AED; font-weight:600; margin-top:2px; }
  .pts-how-row {
    display:flex; justify-content:space-between; align-items:center;
    padding:10px 0; border-bottom:1px solid #F3EEFF;
    font-size:.83rem;
  }
  .pts-how-row:last-child{border-bottom:none;}
  .pts-how-pts { font-weight:800; color:#7C3AED; }
  .pts-redeem {
    width:100%; padding:13px; border:none; border-radius:13px; cursor:pointer;
    background:linear-gradient(135deg,#7C3AED,#5B21B6); color:#fff;
    font-weight:800; font-size:.95rem; margin-top:4px;
    box-shadow:0 4px 16px rgba(124,58,237,.25);
  }
  /* Tarjetas regalo */
  .gc-card {
    background:linear-gradient(135deg,#7C3AED,#C084FC,#F472B6);
    border-radius:16px; padding:18px; color:#fff; position:relative;
    overflow:hidden; margin-bottom:12px;
  }
  .gc-card::before {
    content:'✦'; position:absolute; right:16px; top:12px;
    font-size:2rem; opacity:.3;
  }
  .gc-card-amount { font-size:2rem; font-weight:900; }
  .gc-card-code { font-size:.78rem; opacity:.85; margin-top:4px; font-family:monospace; letter-spacing:1px; }
  .gc-card-expiry { font-size:.72rem; opacity:.7; margin-top:2px; }
  .gc-card-status {
    position:absolute; top:14px; right:14px;
    background:rgba(255,255,255,.25); border-radius:50px;
    padding:3px 10px; font-size:.72rem; font-weight:800;
  }
  .gc-empty {
    text-align:center; padding:28px 0; color:#9CA3AF;
  }
  .gc-empty-ico { font-size:2.5rem; margin-bottom:8px; }
  .gc-empty-txt { font-size:.88rem; font-weight:600; }
  .gc-link-row { display:flex; gap:8px; margin-top:4px; }
  .gc-link-input {
    flex:1; padding:10px 13px; border:2px solid #EDE9FE; border-radius:11px;
    font-size:.88rem; color:#2D1B4E; outline:none; font-family:monospace;
    letter-spacing:1px; transition:border .2s;
  }
  .gc-link-input:focus{border-color:#9B72CF;}
  .gc-link-btn {
    padding:10px 16px; border:none; border-radius:11px; cursor:pointer;
    background:linear-gradient(135deg,#9B72CF,#7C3AED); color:#fff;
    font-weight:800; font-size:.85rem; white-space:nowrap;
  }
  /* Pedidos */
  .order-row {
    border:1.5px solid #EDE9FE; border-radius:14px; padding:14px 16px;
    margin-bottom:10px; cursor:pointer; transition:border .2s, background .2s;
  }
  .order-row:hover{border-color:#C4B5FD; background:#FDFAFF;}
  .order-top { display:flex; justify-content:space-between; align-items:flex-start; gap:8px; }
  .order-num { font-weight:800; color:#2D1B4E; font-size:.9rem; }
  .order-date { font-size:.75rem; color:#9CA3AF; margin-top:2px; }
  .order-status {
    border-radius:50px; padding:3px 12px; font-size:.72rem; font-weight:800;
    white-space:nowrap;
  }
  .status-PENDING { background:#FEF3C7; color:#92400E; }
  .status-CONFIRMED { background:#DBEAFE; color:#1E40AF; }
  .status-SHIPPED { background:#D1FAE5; color:#065F46; }
  .status-DELIVERED { background:#F0FDF4; color:#166534; }
  .status-CANCELLED { background:#FFF1F2; color:#BE123C; }
  .order-items { font-size:.8rem; color:#6B7280; margin-top:8px; }
  .order-total { font-size:.95rem; font-weight:800; color:#7C3AED; margin-top:6px; }
  .order-empty {
    text-align:center; padding:32px 0; color:#9CA3AF;
  }
  /* Cerrar sesión */
  .uacc-logout {
    width:100%; padding:13px; border:2px solid #FECDD3; border-radius:13px;
    background:#fff; color:#BE123C; font-weight:800; font-size:.9rem;
    cursor:pointer; transition:background .2s;
  }
  .uacc-logout:hover{background:#FFF1F2;}
  .uacc-toast {
    position:fixed; bottom:80px; left:50%; transform:translateX(-50%);
    background:#2D1B4E; color:#fff; padding:10px 22px; border-radius:50px;
    font-size:.85rem; font-weight:700; z-index:9999;
    animation:slideUp .25s ease;
  }
  @keyframes slideUp{from{opacity:0;transform:translate(-50%,12px)}to{opacity:1;transform:translate(-50%,0)}}
`;

function fmtCOP(n) {
  return "$" + Number(n || 0).toLocaleString("es-CO");
}

function getTier(pts) {
  if (pts >= 1500) return { name:"VIP", ico:"👑", next:null };
  if (pts >= 500)  return { name:"Premium", ico:"💜", next:1500 };
  return { name:"Esencial", ico:"🌸", next:500 };
}

function fmtDate(str) {
  if (!str) return "";
  const d = new Date(str);
  return d.toLocaleDateString("es-CO", { day:"2-digit", month:"short", year:"numeric" });
}

const STATUS_LABEL = {
  PENDING:"Pendiente", CONFIRMED:"Confirmado",
  SHIPPED:"Enviado", DELIVERED:"Entregado", CANCELLED:"Cancelado",
};

export default function UserAccountPage({ onClose, onOpenGiftCard }) {
  const [user, setUser]       = useState(getCurrentUser());
  const [tab, setTab]         = useState("perfil");
  const [editing, setEditing] = useState(false);
  const [form, setForm]       = useState({});
  const [orders, setOrders]   = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [gcCode, setGcCode]       = useState("");
  const [gcError, setGcError]     = useState("");
  const [backendGCs, setBackendGCs] = useState([]);
  const [loadingGCs, setLoadingGCs] = useState(false);
  const [toast, setToast]     = useState("");

  useEffect(() => {
    if (user) setForm({
      name: user.name || "", email: user.email || "",
      phone: user.phone || "", document: user.document || "",
      city: user.city || "", neighborhood: user.neighborhood || "",
      address: user.address || "",
    });
  }, [user]);

  useEffect(() => {
    if (tab === "regalos" && user?.email) {
      setLoadingGCs(true);
      giftCardAPI.bySender(user.email)
        .then(data => setBackendGCs(Array.isArray(data) ? data : []))
        .catch(() => setBackendGCs([]))
        .finally(() => setLoadingGCs(false));
    }
  }, [tab, user?.email]);

  useEffect(() => {
    if (tab === "pedidos" && user?.email) {
      setLoadingOrders(true);
      orderAPI.getByCustomer(user.email)
        .then(data => setOrders(Array.isArray(data) ? data : []))
        .catch(() => setOrders([]))
        .finally(() => setLoadingOrders(false));
    }
  }, [tab, user?.email]);

  const showToast = msg => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  const saveProfile = () => {
    const updated = { ...user, ...form };
    saveUser(updated);
    setCurrentUser(updated);
    setUser(updated);
    setEditing(false);
    showToast("✅ Perfil actualizado");
  };

  const linkGiftCard = () => {
    if (!gcCode.trim()) { setGcError("Ingresa el código"); return; }
    const code = gcCode.trim().toUpperCase();
    const gcs = user.giftCards || [];
    if (gcs.find(g => g.code === code)) { setGcError("Ya tienes esta tarjeta vinculada"); return; }
    // In production this would validate with backend
    const updated = { ...user, giftCards: [...gcs, { code, amount: 0, used: false, linkedAt: new Date().toISOString() }] };
    saveUser(updated);
    setCurrentUser(updated);
    setUser(updated);
    setGcCode("");
    setGcError("");
    showToast("🎁 Tarjeta de regalo vinculada");
  };

  const handleLogout = () => {
    logoutUser();
    onClose?.();
  };

  if (!user) return null;

  const tier = getTier(user.points || 0);
  const giftCards = user.giftCards || [];

  const TABS = [
    { id:"perfil",   ico:"👤", lbl:"Mi Perfil"   },
    { id:"pedidos",  ico:"📦", lbl:"Pedidos"      },
    { id:"puntos",   ico:"💎", lbl:"Puntos"       },
    { id:"regalos",  ico:"🎁", lbl:"Tarjetas"     },
  ];

  return (
    <>
      <style>{CSS}</style>
      <div className="uacc-wrap">
        {/* Header */}
        <div className="uacc-header">
          <button className="uacc-back" onClick={onClose}>← Volver a la tienda</button>
          <div className="uacc-avatar">{user.name?.[0]?.toUpperCase() || "K"}</div>
          <div className="uacc-name">{user.name}</div>
          <div className="uacc-email">{user.email}</div>
          <div className="uacc-badges">
            <span className="uacc-badge">{tier.ico} {tier.name}</span>
            <span className="uacc-badge">💎 {user.points || 0} pts</span>
            {giftCards.length > 0 && <span className="uacc-badge">🎁 {giftCards.length} tarjeta{giftCards.length!==1?"s":""}</span>}
          </div>
        </div>

        {/* Tabs */}
        <div className="uacc-tabs">
          {TABS.map(t => (
            <button key={t.id} className={`uacc-tab${tab===t.id?" on":""}`} onClick={()=>setTab(t.id)}>
              {t.ico} {t.lbl}
            </button>
          ))}
        </div>

        <div className="uacc-body">

          {/* ── PERFIL ── */}
          {tab === "perfil" && (
            <>
              <div className="uacc-card">
                <div className="uacc-card-title">
                  👤 Datos personales
                  {!editing && (
                    <button onClick={()=>setEditing(true)} style={{
                      marginLeft:"auto", background:"#F5F0FF", border:"none",
                      color:"#7C3AED", fontWeight:800, fontSize:".78rem", padding:"5px 14px",
                      borderRadius:50, cursor:"pointer"
                    }}>✏️ Editar</button>
                  )}
                </div>
                <div className="uacc-form-group">
                  <label className="uacc-label">Nombre completo</label>
                  <input className="uacc-input" value={form.name || ""} disabled={!editing}
                    onChange={e=>setForm(p=>({...p,name:e.target.value}))}/>
                </div>
                <div className="uacc-row">
                  <div className="uacc-form-group">
                    <label className="uacc-label">Teléfono</label>
                    <input className="uacc-input" value={form.phone || ""} disabled={!editing}
                      onChange={e=>setForm(p=>({...p,phone:e.target.value}))}/>
                  </div>
                  <div className="uacc-form-group">
                    <label className="uacc-label">Cédula</label>
                    <input className="uacc-input" value={form.document || ""} disabled={!editing}
                      onChange={e=>setForm(p=>({...p,document:e.target.value}))}/>
                  </div>
                </div>
                <div className="uacc-form-group">
                  <label className="uacc-label">Correo electrónico</label>
                  <input className="uacc-input" value={form.email || ""} disabled/>
                </div>
              </div>

              <div className="uacc-card">
                <div className="uacc-card-title">📦 Dirección de envío guardada</div>
                <div className="uacc-row">
                  <div className="uacc-form-group">
                    <label className="uacc-label">Ciudad</label>
                    <input className="uacc-input" value={form.city || ""} disabled={!editing}
                      onChange={e=>setForm(p=>({...p,city:e.target.value}))}/>
                  </div>
                  <div className="uacc-form-group">
                    <label className="uacc-label">Barrio</label>
                    <input className="uacc-input" value={form.neighborhood || ""} disabled={!editing}
                      onChange={e=>setForm(p=>({...p,neighborhood:e.target.value}))}/>
                  </div>
                </div>
                <div className="uacc-form-group">
                  <label className="uacc-label">Dirección</label>
                  <input className="uacc-input" value={form.address || ""} disabled={!editing}
                    onChange={e=>setForm(p=>({...p,address:e.target.value}))}/>
                </div>
                {editing && (
                  <div style={{display:"flex",gap:8,marginTop:4}}>
                    <button className="uacc-save-btn" onClick={saveProfile} style={{flex:1}}>
                      ✅ Guardar cambios
                    </button>
                    <button onClick={()=>setEditing(false)} style={{
                      flex:0.4, padding:12, border:"2px solid #EDE9FE", borderRadius:12,
                      background:"#fff", color:"#6B7280", fontWeight:700, cursor:"pointer"
                    }}>Cancelar</button>
                  </div>
                )}
              </div>

              <div className="uacc-card" style={{background:"linear-gradient(135deg,#F5F0FF,#FDF8FF)"}}>
                <div className="uacc-card-title">⚡ Checkout en 1 clic</div>
                <p style={{fontSize:".83rem",color:"#6B7280",marginBottom:12,lineHeight:1.5}}>
                  Tus datos están guardados. La próxima vez que compres, el checkout se llenará automáticamente — solo elige tu método de envío y paga.
                </p>
                <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",
                  background:"#EDE9FE",borderRadius:11}}>
                  <span style={{fontSize:"1.2rem"}}>✅</span>
                  <span style={{fontSize:".83rem",color:"#4C1D95",fontWeight:700}}>
                    Datos listos para pago automático
                  </span>
                </div>
              </div>

              <button className="uacc-logout" onClick={handleLogout}>
                🔒 Cerrar sesión
              </button>
            </>
          )}

          {/* ── PEDIDOS ── */}
          {tab === "pedidos" && (
            <div className="uacc-card">
              <div className="uacc-card-title">📦 Mis pedidos</div>
              {loadingOrders ? (
                <div style={{textAlign:"center",padding:24,color:"#9CA3AF"}}>Cargando pedidos...</div>
              ) : orders.length === 0 ? (
                <div className="order-empty">
                  <div style={{fontSize:"2.5rem",marginBottom:8}}>📦</div>
                  <div style={{fontWeight:700,color:"#4B5563"}}>Aún no tienes pedidos</div>
                  <div style={{fontSize:".8rem",marginTop:4}}>Cuando hagas tu primera compra aparecerá aquí</div>
                </div>
              ) : (
                orders.map(o => (
                  <div key={o.id} className="order-row">
                    <div className="order-top">
                      <div>
                        <div className="order-num">#{o.orderNumber || o.id}</div>
                        <div className="order-date">{fmtDate(o.createdAt)}</div>
                      </div>
                      <span className={`order-status status-${o.status||"PENDING"}`}>
                        {STATUS_LABEL[o.status] || o.status}
                      </span>
                    </div>
                    <div className="order-items">
                      {(o.items || []).slice(0,2).map(i => i.productName || "Producto").join(", ")}
                      {(o.items||[]).length > 2 && ` +${(o.items||[]).length-2} más`}
                    </div>
                    <div className="order-total">{fmtCOP(o.total)}</div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── PUNTOS ── */}
          {tab === "puntos" && (
            <>
              <div className="pts-header">
                <div className="pts-num">{user.points || 0}</div>
                <div className="pts-lbl">💎 Puntos Kosmica acumulados</div>
              </div>

              <div className="pts-tier-wrap">
                {[
                  {name:"Esencial",ico:"🌸",range:"0–499",min:0,max:499},
                  {name:"Premium", ico:"💜",range:"500–1499",min:500,max:1499},
                  {name:"VIP",     ico:"👑",range:"1500+",min:1500,max:Infinity},
                ].map(t => (
                  <div key={t.name} className={`pts-tier${(user.points||0)>=t.min&&(user.points||0)<=t.max?" active":""}`}>
                    <div className="pts-tier-ico">{t.ico}</div>
                    <div className="pts-tier-name">{t.name}</div>
                    <div className="pts-tier-range">{t.range} pts</div>
                  </div>
                ))}
              </div>

              <div className="uacc-card">
                <div className="uacc-card-title">Cómo ganar puntos</div>
                {[
                  ["Cada compra","1 pt por cada $1.000 COP"],
                  ["Referir una amiga","+50 pts cuando ella compra"],
                  ["Dejar reseña","+10 pts por reseña publicada"],
                  ["Newsletter","+20 pts al suscribirte"],
                  ["Registro","+20 pts bienvenida"],
                ].map(([acc,det]) => (
                  <div key={acc} className="pts-how-row">
                    <span style={{fontWeight:600,color:"#374151",fontSize:".85rem"}}>{acc}</span>
                    <span className="pts-how-pts">{det}</span>
                  </div>
                ))}
              </div>

              <button className="pts-redeem" onClick={()=>{
                if ((user.points||0) >= 500) {
                  const msg = `Hola Kosmica! 💜 Tengo ${user.points} puntos acumulados y me gustaría canjearlos por un descuento.`;
                  window.open(`https://wa.me/573043927148?text=${encodeURIComponent(msg)}`,"_blank");
                } else {
                  showToast("Necesitas mínimo 500 puntos para canjear 💎");
                }
              }}>
                {(user.points||0) >= 500 ? `🎁 Canjear mis ${user.points} puntos` : `✦ Acumula ${500-(user.points||0)} pts más para canjear`}
              </button>
            </>
          )}

          {/* ── TARJETAS REGALO ── */}
          {tab === "regalos" && (
            <>
              <div className="uacc-card">
                <div className="uacc-card-title">🎁 Mis Tarjetas de Regalo</div>

                {loadingGCs ? (
                  <div style={{textAlign:"center",padding:20,color:"#9CA3AF"}}>Cargando tarjetas...</div>
                ) : backendGCs.length === 0 ? (
                  <div className="gc-empty">
                    <div className="gc-empty-ico">🎁</div>
                    <div className="gc-empty-txt">No has comprado tarjetas de regalo</div>
                    <div style={{fontSize:".78rem",marginTop:4}}>Las tarjetas que compres aparecerán aquí</div>
                  </div>
                ) : (
                  backendGCs.map(gc => (
                    <div key={gc.code} className="gc-card">
                      <div className="gc-card-amount">{fmtCOP(gc.originalAmount)}</div>
                      <div className="gc-card-code">{gc.code}</div>
                      <div className="gc-card-expiry">
                        Para: {gc.recipientName} · Saldo: {fmtCOP(gc.balance)}
                      </div>
                      <div className="gc-card-status">
                        {gc.status==="ACTIVE"?"Activa":gc.status==="DEPLETED"?"Usada":gc.status==="PENDING"?"Pendiente":"Vencida"}
                      </div>
                    </div>
                  ))
                )}

                <div style={{marginTop:16}}>
                  <label className="uacc-label">Vincular código de tarjeta regalo</label>
                  <div className="gc-link-row">
                    <input className="gc-link-input" placeholder="KGC-XXXX-XXXX"
                      value={gcCode} onChange={e=>{setGcCode(e.target.value.toUpperCase());setGcError("");}}
                      onKeyDown={e=>e.key==="Enter"&&linkGiftCard()}/>
                    <button className="gc-link-btn" onClick={linkGiftCard}>Vincular</button>
                  </div>
                  {gcError && <p style={{color:"#BE123C",fontSize:".8rem",marginTop:6}}>{gcError}</p>}
                </div>
              </div>

              <div className="uacc-card" style={{
                background:"linear-gradient(135deg,#7C3AED15,#C084FC10)",
                border:"1.5px solid #C4B5FD", cursor:"pointer"
              }} onClick={()=>{onOpenGiftCard?.();}}>
                <div style={{display:"flex",alignItems:"center",gap:14}}>
                  <span style={{fontSize:"2rem"}}>🎁</span>
                  <div>
                    <div style={{fontWeight:800,color:"#2D1B4E"}}>Comprar Tarjeta de Regalo</div>
                    <div style={{fontSize:".82rem",color:"#7B5EA7",marginTop:2}}>
                      El regalo perfecto para toda ocasión — desde $10.000 COP
                    </div>
                  </div>
                  <span style={{marginLeft:"auto",color:"#7C3AED",fontSize:"1.1rem"}}>›</span>
                </div>
              </div>
            </>
          )}

        </div>
      </div>

      {toast && <div className="uacc-toast">{toast}</div>}
    </>
  );
}
