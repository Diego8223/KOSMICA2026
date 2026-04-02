// ============================================================
//  src/components/AIChatBot.jsx — Isabel · Asesora Kosmica v16
//  ✅ Agrega al carrito REAL de App.jsx (onAddToCart prop)
//  ✅ Logo ✦ Kosmica en cabecera (no ícono genérico)
//  ✅ Historial de conversación funcional y persistente
//  ✅ Categorías desplazables en todas las resoluciones
//  ✅ Diseño desktop mejorado — ventana más ancha
//  ✅ Fetch independiente de TODO el catálogo
//  ✅ Pregunta el nombre al iniciar
// ============================================================
import { useState, useEffect, useRef, useCallback } from "react";

// ─── Config ───────────────────────────────────────────────
const MAX_HIST = 18;

// ─── Helpers ──────────────────────────────────────────────
const fmtCOP = n =>
  "$" + Number(n).toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const ts = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
};

const catEmoji = (c = "") => {
  const u = c.toUpperCase();
  if (u.includes("BOLSO") || u.includes("CARTERA"))   return "👜";
  if (u.includes("MORRAL") || u.includes("MOCHILA"))  return "🎒";
  if (u.includes("MAQUILLAJE") || u.includes("COSM")) return "💄";
  if (u.includes("CAPILAR") || u.includes("CABELLO")) return "✨";
  if (u.includes("ACCESORIO") || u.includes("JOYA"))  return "💍";
  if (u.includes("BILLETERA") || u.includes("WALLET"))return "💳";
  if (u.includes("CUIDADO") || u.includes("CREMA"))   return "🧴";
  if (u.includes("PERFUME") || u.includes("FRAGANCIA"))return "🌸";
  if (u.includes("ROPA") || u.includes("VESTIDO"))    return "👗";
  return "🛍️";
};

// ─── Intenciones rápidas ──────────────────────────────────
const QUICK = [
  { test: /^(hola|buenas|buenos?\s?d[íi]as?|tardes?|noches?|hey|hi|ola)\b/i,
    reply: n => `¡Hola${n?", <strong>"+n+"</strong>":""}! Soy Isabel, tu asesora de Kosmica 💜<br>¿Buscas algo para ti o es un regalo especial?`,
    chips: ["Para mí 💜","Es un regalo 🎁","Ver lo más vendido ⭐","Ver ofertas 🏷️"] },
  { test: /env[íi]o|domicilio|despacho|transporte|flete/i,
    reply: () => "El valor del envío lo coordina un asesor contigo 🚚<br>¿Te ayudo a elegir algo primero?",
    chips: ["Ver catálogo 🛍️","Lo más vendido ⭐"] },
  { test: /pago|mercado\s?pago|tarjeta|pse|nequi|daviplata|efectivo|c[oó]mo pago/i,
    reply: () => "Aceptamos MercadoPago: tarjeta, PSE, Nequi, Daviplata y efectivo 💳<br>Todo 100% seguro.",
    chips: ["Ver catálogo 🛍️"] },
  { test: /devoluci[oó]n|cambio|garant[íi]a|devolver/i,
    reply: () => "Tienes 15 días para cambios si el producto llega con defecto 💜<br>Escríbenos con fotos y lo resolvemos.",
    chips: ["Ver productos 🛍️"] },
  { test: /gracias|muchas gracias|perfecto|excelente|ch[eé]vere/i,
    reply: n => `¡Con mucho gusto${n?", <strong>"+n+"</strong>":""}! Para eso estoy ✨ ¿Te ayudo con algo más?`,
    chips: ["Ver más productos 🛍️","Ver ofertas 🏷️"] },
  { test: /adios|chao|bye|hasta luego/i,
    reply: n => `¡Hasta pronto${n?", <strong>"+n+"</strong>":""}! Fue un placer atenderte 💜`,
    chips: [] },
];

// ─── Chips contextuales ───────────────────────────────────
const ctxChips = t => {
  const m = t.toLowerCase();
  if (/regalo/.test(m))                  return ["Para dama 👜","Para caballero 💼","¿El más popular?"];
  if (/bolso|cartera/.test(m))           return ["Ver más bolsos 👜","Ver morrales 🎒","¿Hay ofertas?"];
  if (/morral|mochila/.test(m))          return ["Ver más morrales 🎒","Ver bolsos 👜","Agregar al pedido"];
  if (/billetera|monedero/.test(m))      return ["Para dama 💜","Para caballero 💙","Ver todos"];
  if (/maquillaje|labial|sombra/.test(m))return ["Kits completos 💄","Ver labiales","Ver paletas"];
  if (/capilar|cabello|shampoo/.test(m)) return ["Ver shampoos ✨","Ver tratamientos","Kits capilares"];
  if (/accesorio|aretes|collar/.test(m)) return ["Ver aretes 💍","Ver collares","Ver pulseras"];
  if (/cuidado|crema|perfume/.test(m))   return ["Ver cremas 🧴","Sets de baño","Ver perfumes 🌸"];
  if (/oferta|descuento|promo/.test(m))  return ["Ver ofertas 🏷️","Lo más vendido ⭐"];
  return ["¿Hay ofertas? 🏷️","Lo más vendido ⭐","Quiero que me contacten"];
};

// ─── System Prompt ────────────────────────────────────────
const buildPrompt = (products, name) => {
  const avail = products.filter(p => Number(p.stock) > 0);
  const groups = {};
  avail.forEach(p => {
    const cat = (p.category || "General").trim();
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(p);
  });
  const catalog = Object.entries(groups).map(([cat, ps]) =>
    `\n## ${cat.toUpperCase()} (${ps.length})\n` +
    ps.map(p =>
      `  [ID:${p.id}] ${p.name} | ${fmtCOP(p.price)}` +
      (p.badge?` [${p.badge}]`:"") +
      (Number(p.stock)<=5?` ⚡ÚLTIMAS ${p.stock}`:"") +
      (p.rating?` ★${p.rating}`:"") +
      (p.description?` | ${String(p.description).slice(0,80)}`:"")
    ).join("\n")
  ).join("\n");

  return `Eres ISABEL, asesora de ventas experta de KOSMICA, tienda colombiana de moda y belleza.
CLIENTE: ${name ? `Su nombre es ${name}. SIEMPRE llámala por su nombre.` : "Nombre desconocido, no inventes uno."}
PERSONALIDAD: Colombiana cálida, directa. Respuestas cortas (máx 3 líneas + productos). Máx 2 emojis.
NUNCA empieces con "¡Claro!", "Por supuesto" ni "Entendido".
META: CERRAR VENTAS. Cada respuesta acerca al cliente a comprar.
PROCESO: 1) Escucha (pregunta ocasión/presupuesto UNA a la vez) 2) Recomienda máx 3 productos con razón 3) Menciona urgencia de stock 4) Cierra: "¿Lo agregamos?" o "¿Cuál prefieres?"
ENVÍO: Solo di "Lo coordina un asesor contigo 🚚". NUNCA inventes precio.
CATÁLOGO:${catalog}
REGLA CRÍTICA: Si recomiendas productos específicos, escribe al final exactamente:
PRODUCTOS_RECOMENDADOS:id1,id2,id3
Solo IDs numéricos. NUNCA inventes IDs.`;
};

const extractIds = t => {
  const m = t.match(/PRODUCTOS_RECOMENDADOS:\[?([\d,\s]+)\]?/);
  return m ? m[1].split(",").map(s => parseInt(s.trim())).filter(n => !isNaN(n)) : [];
};
const cleanAI = t =>
  t.replace(/PRODUCTOS_RECOMENDADOS:\[?[\d,\s]+\]?/g,"").trim()
   .replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>")
   .replace(/\n/g,"<br>");

// ─── LocalStorage helpers ─────────────────────────────────
const lsGet = (k, fallback) => {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
};
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

// ─── CSS ──────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&display=swap');

/* FAB */
.kb-fab{
  position:fixed;bottom:22px;right:18px;z-index:1002;
  width:58px;height:58px;border-radius:50%;
  background:linear-gradient(135deg,#4C1D95,#6D28D9,#8B5CF6);
  border:none;cursor:pointer;
  box-shadow:0 6px 28px rgba(76,29,149,.55);
  display:flex;align-items:center;justify-content:center;
  font-size:24px;font-family:'Plus Jakarta Sans',sans-serif;
  transition:transform .22s,box-shadow .22s;
  animation:kbPulse 3s infinite;
}
.kb-fab:hover{transform:scale(1.1);box-shadow:0 10px 36px rgba(76,29,149,.7);animation:none}
@keyframes kbPulse{
  0%,100%{box-shadow:0 6px 28px rgba(76,29,149,.55),0 0 0 0 rgba(139,92,246,.5)}
  65%{box-shadow:0 6px 28px rgba(76,29,149,.55),0 0 0 16px rgba(139,92,246,0)}
}
.kb-fab-badge{
  position:absolute;top:-3px;right:-3px;background:#EF4444;color:#fff;
  border-radius:50%;width:20px;height:20px;font-size:10px;font-weight:800;
  display:flex;align-items:center;justify-content:center;border:2.5px solid #fff;
  font-family:'Plus Jakarta Sans',sans-serif;
}

/* Overlay contenedor */
.kb-overlay{
  position:fixed;inset:0;z-index:1001;
  display:flex;align-items:flex-end;justify-content:flex-end;
  padding:0 18px 92px;pointer-events:none;
}
.kb-overlay *{box-sizing:border-box;margin:0;padding:0}

/* Ventana chat */
.kb-win{
  width:min(460px,96vw);height:min(700px,88vh);
  display:flex;flex-direction:column;
  border-radius:22px;overflow:hidden;
  background:#fff;
  box-shadow:0 24px 80px rgba(76,29,149,.38);
  border:1px solid rgba(109,40,217,.15);
  pointer-events:none;
  transform:translateY(32px) scale(.93);opacity:0;
  transition:transform .38s cubic-bezier(.34,1.56,.64,1),opacity .28s;
  font-family:'Plus Jakarta Sans',sans-serif;
}
.kb-win.kb-open{transform:none;opacity:1;pointer-events:all}

/* Header */
.kb-head{
  background:linear-gradient(135deg,#2E1065 0%,#4C1D95 45%,#6D28D9 100%);
  padding:12px 15px 11px;
  display:flex;align-items:center;gap:11px;flex-shrink:0;
  position:relative;overflow:hidden;
}
.kb-head::after{
  content:'';position:absolute;inset:0;pointer-events:none;
  background:radial-gradient(ellipse 60% 90% at 85% -5%,rgba(255,255,255,.13) 0%,transparent 70%);
}
/* Logo Kosmica en el header */
.kb-logo{
  font-family:'Plus Jakarta Sans',sans-serif;
  font-size:22px;font-weight:900;font-style:italic;
  background:linear-gradient(135deg,#E9D5FF,#F9A8D4);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;
  letter-spacing:-.3px;flex-shrink:0;line-height:1;
  position:relative;z-index:1;cursor:default;
  user-select:none;
}
.kb-logo span{font-size:14px;font-style:normal;opacity:.85}
.kb-hinfo{flex:1;min-width:0;position:relative;z-index:1}
.kb-hname{
  color:#fff;font-weight:800;font-size:14px;
  display:flex;align-items:center;gap:6px;line-height:1.2;
}
.kb-dot-online{
  width:8px;height:8px;background:#22C55E;border-radius:50%;
  border:2px solid rgba(255,255,255,.35);flex-shrink:0;
}
.kb-badge{
  background:rgba(255,255,255,.18);color:#fff;font-size:9px;
  font-weight:800;padding:2px 7px;border-radius:20px;
  border:1px solid rgba(255,255,255,.28);letter-spacing:.5px;
}
.kb-hsub{color:rgba(255,255,255,.68);font-size:11px;margin-top:3px}
.kb-hbtns{display:flex;gap:6px;align-items:center;position:relative;z-index:1;flex-shrink:0}
.kb-hbtn{
  background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.24);
  color:#fff;font-size:11px;padding:4px 11px;border-radius:12px;
  cursor:pointer;font-family:inherit;font-weight:600;transition:background .18s;white-space:nowrap;
}
.kb-hbtn:hover{background:rgba(255,255,255,.26)}
.kb-close{
  background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.24);
  color:#fff;width:30px;height:30px;border-radius:50%;
  cursor:pointer;font-size:15px;display:flex;
  align-items:center;justify-content:center;transition:background .18s;
}
.kb-close:hover{background:rgba(255,255,255,.3)}

/* Barra de categorías */
.kb-cats{
  display:flex;gap:6px;padding:8px 12px 7px;
  overflow-x:auto;background:#fff;
  border-bottom:1px solid #F3EEFF;scrollbar-width:none;flex-shrink:0;
  -webkit-overflow-scrolling:touch;
}
.kb-cats::-webkit-scrollbar{display:none}
.kb-cat{
  flex-shrink:0;padding:5px 12px;border-radius:20px;
  border:1.5px solid #EDE9FE;background:#FAF7FF;
  color:#7C3AED;font-size:12px;font-family:inherit;
  cursor:pointer;white-space:nowrap;transition:all .18s;font-weight:600;
}
.kb-cat:hover,.kb-cat.on{background:#6D28D9;color:#fff;border-color:#6D28D9}

/* Mensajes */
.kb-msgs{
  flex:1;overflow-y:auto;padding:13px 13px 7px;
  display:flex;flex-direction:column;gap:9px;
  scroll-behavior:smooth;background:#FDFCFF;
}
.kb-msgs::-webkit-scrollbar{width:3px}
.kb-msgs::-webkit-scrollbar-thumb{background:#C4B5FD;border-radius:3px}

.kb-row-bot,.kb-row-user{
  max-width:88%;display:flex;flex-direction:column;gap:3px;
}
.kb-row-bot{align-self:flex-start}
.kb-row-user{align-self:flex-end}
.kb-bub{padding:10px 14px;border-radius:16px;font-size:13.5px;line-height:1.58}
.kb-bub-bot{background:#F3EEFF;color:#1A0A2E;border-bottom-left-radius:4px}
.kb-bub-user{
  background:linear-gradient(135deg,#4C1D95,#6D28D9);
  color:#fff;border-bottom-right-radius:4px;
}
.kb-time{font-size:10px;color:#B0A0C8;align-self:flex-end}
.kb-row-bot .kb-time{align-self:flex-start}

/* Chips */
.kb-chips{display:flex;flex-wrap:wrap;gap:5px;margin-top:4px}
.kb-chip{
  padding:5px 13px;border-radius:20px;
  border:1.5px solid #8B5CF6;color:#5B21B6;
  font-size:12px;cursor:pointer;background:#fff;
  font-family:inherit;font-weight:600;transition:all .18s;
}
.kb-chip:hover{background:#6D28D9;color:#fff;border-color:#6D28D9}

/* Grid de productos */
.kb-pgrid{
  display:grid;grid-template-columns:1fr 1fr;
  gap:8px;margin-top:9px;max-width:350px;
}
.kb-pcard{
  background:#fff;border:1.5px solid #EDE9FE;
  border-radius:13px;overflow:hidden;cursor:default;
  transition:border-color .18s,box-shadow .18s;
}
.kb-pcard:hover{border-color:#6D28D9;box-shadow:0 4px 18px rgba(109,40,217,.14)}
.kb-pimg{
  width:100%;aspect-ratio:1;overflow:hidden;
  background:linear-gradient(135deg,#F3EEFF,#EDE9FE);
  display:flex;align-items:center;justify-content:center;
  font-size:30px;
}
.kb-pimg img{width:100%;height:100%;object-fit:cover}
.kb-pinfo{padding:7px 9px 9px}
.kb-pcat{font-size:9px;color:#7C3AED;font-weight:800;text-transform:uppercase;letter-spacing:.5px}
.kb-pname{
  font-size:11.5px;font-weight:700;color:#1A0A2E;
  margin:3px 0 2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
}
.kb-pprice{font-size:12.5px;font-weight:800;color:#4C1D95;margin-bottom:5px}
.kb-pbadge{
  display:inline-block;font-size:8px;font-weight:800;
  padding:1px 6px;border-radius:8px;margin-bottom:3px;
  background:linear-gradient(135deg,#F4A7C3,#C026D3);color:#fff;
}
.kb-pbtn{
  width:100%;padding:6px;
  background:linear-gradient(135deg,#4C1D95,#6D28D9);
  color:#fff;border:none;border-radius:8px;
  font-size:11px;font-family:inherit;font-weight:700;
  cursor:pointer;transition:opacity .18s;
}
.kb-pbtn:hover{opacity:.85}
.kb-pbtn:active{transform:scale(.97)}
.kb-pbtn.added{background:linear-gradient(135deg,#065F46,#059669)!important}

/* Typing */
.kb-typing{
  display:flex;align-items:center;gap:4px;padding:10px 14px;
  background:#F3EEFF;border-radius:16px;border-bottom-left-radius:4px;width:62px;
}
.kb-tdot{
  width:6px;height:6px;border-radius:50%;background:#6D28D9;
  animation:kbBounce 1.2s infinite;
}
.kb-tdot:nth-child(2){animation-delay:.2s}
.kb-tdot:nth-child(3){animation-delay:.4s}
@keyframes kbBounce{
  0%,60%,100%{transform:translateY(0)}
  30%{transform:translateY(-5px)}
}

/* Cargando */
.kb-loading{
  display:flex;align-items:center;gap:9px;
  padding:9px 13px;font-size:12.5px;color:#8B5CF6;
  background:#F5F0FF;border-radius:13px;border:1px solid #EDE9FE;
}
.kb-spin{
  width:16px;height:16px;flex-shrink:0;border-radius:50%;
  border:2.5px solid #EDE9FE;border-top-color:#6D28D9;
  animation:kbSpin .7s linear infinite;
}
@keyframes kbSpin{to{transform:rotate(360deg)}}

/* Footer input */
.kb-footer{
  padding:9px 12px 11px;background:#fff;
  border-top:1px solid #F3EEFF;
  display:flex;gap:8px;align-items:center;flex-shrink:0;
}
.kb-inp{
  flex:1;padding:10px 15px;border:2px solid #EDE9FE;
  border-radius:24px;font-size:13.5px;font-family:inherit;
  outline:none;color:#1A0A2E;transition:border .2s;background:#FAF8FF;
}
.kb-inp:focus{border-color:#6D28D9;background:#fff}
.kb-inp::placeholder{color:#C4B5FD}
.kb-send{
  width:40px;height:40px;flex-shrink:0;border-radius:50%;
  background:linear-gradient(135deg,#4C1D95,#6D28D9);
  border:none;cursor:pointer;
  display:flex;align-items:center;justify-content:center;
  box-shadow:0 4px 14px rgba(76,29,149,.4);transition:transform .2s;
}
.kb-send:hover{transform:scale(1.08)}
.kb-send:active{transform:scale(.95)}

/* Toast notificación */
.kb-toast{
  position:absolute;top:10px;left:50%;transform:translateX(-50%);
  background:#059669;color:#fff;padding:6px 18px;border-radius:20px;
  font-size:12px;font-weight:700;white-space:nowrap;z-index:20;
  pointer-events:none;animation:kbFadeUp .3s ease;
  font-family:'Plus Jakarta Sans',sans-serif;
}
@keyframes kbFadeUp{from{opacity:0;transform:translateX(-50%) translateY(-6px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}

/* Panel historial */
.kb-hist-overlay{
  position:absolute;inset:0;background:rgba(20,5,45,.88);
  backdrop-filter:blur(6px);z-index:30;
  display:flex;align-items:center;justify-content:center;padding:16px;
  animation:kbFadeIn .25s;
}
@keyframes kbFadeIn{from{opacity:0}to{opacity:1}}
.kb-hist-box{
  background:#fff;border-radius:18px;width:100%;max-height:85%;
  display:flex;flex-direction:column;
  box-shadow:0 16px 50px rgba(76,29,149,.4);overflow:hidden;
}
.kb-hist-hd{
  padding:15px 18px 12px;border-bottom:1px solid #F3EEFF;
  display:flex;align-items:center;justify-content:space-between;
  background:linear-gradient(135deg,#F3EEFF,#fff);flex-shrink:0;
}
.kb-hist-title{
  font-weight:800;font-size:14px;color:#2E1065;
  font-family:'Plus Jakarta Sans',sans-serif;
  display:flex;align-items:center;gap:7px;
}
.kb-hist-body{flex:1;overflow-y:auto;padding:12px 14px;display:flex;flex-direction:column;gap:7px}
.kb-hist-bubble{
  padding:9px 13px;border-radius:13px;font-size:12.5px;
  line-height:1.55;font-family:'Plus Jakarta Sans',sans-serif;max-width:90%;
}
.kb-hist-bubble.user{
  align-self:flex-end;background:linear-gradient(135deg,#4C1D95,#6D28D9);
  color:#fff;border-bottom-right-radius:4px;
}
.kb-hist-bubble.bot{
  align-self:flex-start;background:#F3EEFF;
  color:#1A0A2E;border-bottom-left-radius:4px;
}
.kb-hist-empty{
  text-align:center;padding:36px;color:#9CA3AF;
  font-size:13px;font-family:'Plus Jakarta Sans',sans-serif;
}
.kb-hist-footer{
  padding:12px 16px;border-top:1px solid #F3EEFF;
  display:flex;gap:8px;justify-content:flex-end;flex-shrink:0;
}
.kb-hist-btn{
  padding:7px 16px;border-radius:12px;font-size:12px;font-weight:700;
  cursor:pointer;font-family:inherit;transition:all .18s;
}
.kb-hist-btn.secondary{background:#F3EEFF;border:1.5px solid #EDE9FE;color:#4C1D95}
.kb-hist-btn.secondary:hover{background:#EDE9FE}
.kb-hist-btn.danger{background:#FEF2F2;border:1.5px solid #FECACA;color:#DC2626}
.kb-hist-btn.danger:hover{background:#FEE2E2}

@media(min-width:640px){
  .kb-overlay{padding:0 28px 28px}
  .kb-fab{bottom:28px;right:28px}
  .kb-win{width:min(480px,90vw)}
}
`;

// ─── Tarjeta de producto ──────────────────────────────────
function ProdCard({ p, onAdd, added }) {
  const [imgOk, setImgOk] = useState(null);

  useEffect(() => {
    if (!p.imageUrl) { setImgOk(false); return; }
    const img = new window.Image();
    img.onload  = () => setImgOk(true);
    img.onerror = () => setImgOk(false);
    img.src = p.imageUrl;
    return () => { img.onload = null; img.onerror = null; };
  }, [p.imageUrl]);

  return (
    <div className="kb-pcard">
      <div className="kb-pimg">
        {imgOk === null && <div className="kb-spin" />}
        {imgOk === true  && <img src={p.imageUrl} alt={p.name} />}
        {imgOk === false && catEmoji(p.category || "")}
      </div>
      <div className="kb-pinfo">
        {p.badge && <div className="kb-pbadge">{p.badge}</div>}
        <div className="kb-pcat">{p.category}</div>
        <div className="kb-pname" title={p.name}>{p.name}</div>
        <div className="kb-pprice">{fmtCOP(p.price)}</div>
        <button
          className={`kb-pbtn${added ? " added" : ""}`}
          onClick={() => !added && onAdd(p)}
        >
          {added ? "✓ En carrito" : "🛒 Agregar"}
        </button>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────
export default function AIChatBot({ onAddToCart, onOpenCart }) {
  const [open,      setOpen]      = useState(false);
  const [msgs,      setMsgs]      = useState([]);
  const [chips,     setChips]     = useState([]);
  const [input,     setInput]     = useState("");
  const [typing,    setTyping]    = useState(false);
  const [toast,     setToast]     = useState("");
  const [showHist,  setShowHist]  = useState(false);

  const [allProds,  setAllProds]  = useState([]);
  const [cats,      setCats]      = useState([]);
  const [loadCat,   setLoadCat]   = useState(true);

  const [clientName, setClientName] = useState("");
  const [waitName,   setWaitName]   = useState(false);
  const [aiHist,     setAiHist]     = useState([]);     // historial para la IA
  const [addedIds,   setAddedIds]   = useState(new Set()); // IDs ya agregados

  const msgsRef = useRef(null);
  const inputRef = useRef(null);

  // ── Inyectar CSS ────────────────────────────────────────
  useEffect(() => {
    if (!document.getElementById("kb-style-v16")) {
      const s = document.createElement("style");
      s.id = "kb-style-v16";
      s.textContent = CSS;
      document.head.appendChild(s);
    }
  }, []);

  // ── Scroll automático ────────────────────────────────────
  useEffect(() => {
    if (msgsRef.current) {
      msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
    }
  }, [msgs, typing]);

  // ── Focus al abrir ───────────────────────────────────────
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 360);
    }
  }, [open]);

  // ── Helpers de mensaje ───────────────────────────────────
  const addBot = useCallback((html, nextChips = [], prods = []) => {
    setMsgs(p => [...p, { role:"bot", html, prods, time:ts(), id:Date.now()+Math.random() }]);
    setChips(nextChips);
  }, []);

  const addUser = useCallback(text => {
    setMsgs(p => [...p, { role:"user", text, time:ts(), id:Date.now()+Math.random() }]);
    setChips([]);
  }, []);

  const showToast = useCallback(msg => {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  }, []);

  // ── Cargar catálogo completo ─────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const API = process.env.REACT_APP_API_URL || "http://localhost:8080";
    fetch(`${API}/api/products?size=300`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => {
        if (cancelled) return;
        const prods = Array.isArray(d) ? d : (d.content || []);
        setAllProds(prods);
        setCats([...new Set(prods.map(p => p.category).filter(Boolean))]);
      })
      .catch(() => { if (!cancelled) setAllProds([]); })
      .finally(() => { if (!cancelled) setLoadCat(false); });
    return () => { cancelled = true; };
  }, []);

  // ── Iniciar conversación ─────────────────────────────────
  useEffect(() => {
    if (loadCat) return;
    const savedName = lsGet("kb_name", "");
    const savedHist = lsGet("kb_aihist", []);

    if (savedName) {
      setClientName(savedName);
      setAiHist(savedHist);
      addBot(
        `¡Hola de nuevo, <strong>${savedName}</strong>! 💜 Qué bueno verte. ¿Qué te llama la atención hoy?`,
        ["Ver lo más vendido ⭐","Ver novedades ✨","Necesito un regalo 🎁","Ver todo el catálogo"]
      );
    } else {
      addBot(
        `¡Hola! Soy <strong>Isabel</strong>, tu asesora personal de Kosmica ✨<br><br>Tenemos bolsos, morrales, maquillaje, capilar, accesorios y mucho más.<br><br><strong>¿Cómo te llamas? 💜</strong>`
      );
      setWaitName(true);
    }
  }, [loadCat]); // eslint-disable-line

  // ── Agregar al carrito real ──────────────────────────────
  const handleAdd = useCallback(p => {
    if (onAddToCart) {
      onAddToCart(p, 1);
    }
    setAddedIds(prev => new Set([...prev, p.id]));
    showToast(`✓ ${p.name} agregado al carrito`);
    addBot(
      `¡Listo! 🛒 Agregué <strong>${p.name}</strong> a tu carrito.<br>¿Quieres ver tu carrito o seguir comprando?`,
      ["Ver mi carrito 🛒","Seguir comprando 🛍️","Confirmar pedido ✅"]
    );
  }, [onAddToCart, showToast, addBot]);

  // ── Filtrar por categoría ────────────────────────────────
  const filterCat = useCallback((cat, btn) => {
    document.querySelectorAll(".kb-cat").forEach(b => b.classList.remove("on"));
    btn?.classList.add("on");
    const prods = cat === "_all"
      ? allProds.filter(p => Number(p.stock) > 0).slice(0, 6)
      : allProds.filter(p => p.category === cat && Number(p.stock) > 0).slice(0, 6);
    const label = cat === "_all" ? "catálogo completo" : `<strong>${cat}</strong>`;
    addBot(
      `Aquí están los productos de ${label} 💜`,
      ["¿Tienen ofertas? 🏷️","Ver otra categoría","Quiero asesoría"],
      prods
    );
  }, [allProds, addBot]);

  // ── Llamada al backend IA ────────────────────────────────
  const callIsabel = useCallback(async (msg, name, hist) => {
    const newHist = [...hist, { role:"user", content:msg }];
    setAiHist(newHist);
    lsSet("kb_aihist", newHist.slice(-40));
    setTyping(true);

    try {
      const API = process.env.REACT_APP_API_URL || "http://localhost:8080";
      const res = await fetch(`${API}/api/ai/chat`, {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          system: buildPrompt(allProds, name),
          messages: newHist.slice(-MAX_HIST),
          max_tokens: 700,
        }),
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      const raw = (data.content||[]).map(x => x.text||"").join("") ||
        "Disculpa, tuve un inconveniente. ¿Me repites tu pregunta? 💜";

      const updHist = [...newHist, { role:"assistant", content:raw }];
      setAiHist(updHist);
      lsSet("kb_aihist", updHist.slice(-40));

      const ids = extractIds(raw);
      const clean = cleanAI(raw);
      const recProds = ids.map(id => allProds.find(p => p.id === id || p.id === String(id))).filter(Boolean);

      const lower = raw.toLowerCase();
      const closing = ["contactará","confirmar","asesor"].some(k => lower.includes(k));
      addBot(clean, closing ? ["Ver mi carrito 🛒","Seguir comprando","Ver otra categoría"] : ctxChips(msg), recProds);
    } catch {
      addBot("Disculpa el inconveniente. Un asesor de Kosmica te contactará 💜",["Quiero que me contacten 📱"]);
    } finally {
      setTyping(false);
    }
  }, [allProds, addBot]);

  // ── Enviar mensaje ───────────────────────────────────────
  const send = useCallback(async text => {
    const t = (text || input).trim();
    if (!t) return;
    setInput("");
    addUser(t);

    // Captura nombre
    if (waitName) {
      const raw = t.split(" ")[0];
      const name = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
      setClientName(name);
      setWaitName(false);
      lsSet("kb_name", name);
      setTimeout(() => addBot(
        `¡Mucho gusto, <strong>${name}</strong>! 💜 Bienvenida a Kosmica.<br>¿En qué te puedo ayudar hoy? ✨`,
        ["Ver lo más vendido ⭐","Ver novedades ✨","Necesito un regalo 🎁","Ver todo el catálogo"]
      ), 350);
      return;
    }

    // Chips especiales
    const tl = t.toLowerCase();
    if (tl.includes("ver mi carrito") || tl.includes("mi carrito")) {
      if (onOpenCart) onOpenCart();
      addBot("¡Aquí va tu carrito! Puedes ver y editar todo 🛒",["Seguir comprando 🛍️","Confirmar pedido ✅"]);
      return;
    }
    if (tl.includes("confirmar pedido") || tl.includes("quiero que me contacten") || tl.includes("contacten")) {
      addBot(`✅ ¡Listo${clientName ? ", <strong>"+clientName+"</strong>" : ""}! Un asesor de Kosmica se pondrá en contacto para confirmar tu pedido y coordinar el envío. ¡Gracias por elegirnos! 💜`);
      return;
    }

    // Respuesta rápida
    for (const q of QUICK) {
      if (q.test.test(t)) {
        setTimeout(() => addBot(q.reply(clientName), q.chips), 350);
        return;
      }
    }

    await callIsabel(t, clientName, aiHist);
  }, [input, waitName, clientName, aiHist, addUser, addBot, callIsabel, onOpenCart]);

  // ── Borrar historial ─────────────────────────────────────
  const clearHistory = () => {
    setAiHist([]);
    lsSet("kb_aihist", []);
    lsSet("kb_name", "");
    setClientName("");
    setWaitName(false);
    setMsgs([]);
    setShowHist(false);
    setTimeout(() => {
      addBot(
        `¡Historial borrado! Soy <strong>Isabel</strong>, tu asesora de Kosmica ✨<br>¿Cómo te llamas?`
      );
      setWaitName(true);
    }, 200);
  };

  // ── Render historial legible ─────────────────────────────
  const histToShow = aiHist
    .filter(h => h.content && h.content.trim().length > 0)
    .map(h => ({
      role: h.role === "user" ? "user" : "bot",
      text: h.content
        .replace(/PRODUCTOS_RECOMENDADOS:[\d,\s]+/g, "")
        .replace(/<[^>]+>/g, "")
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .trim()
        .slice(0, 200),
    }))
    .slice(-30);

  // ── Render ───────────────────────────────────────────────
  return (
    <>
      {/* Botón flotante ✨ */}
      <button className="kb-fab" onClick={() => setOpen(o => !o)} aria-label="Chat con Isabel">
        {open ? "✕" : "✨"}
        {!open && addedIds.size > 0 && <span className="kb-fab-badge">{addedIds.size}</span>}
      </button>

      <div className="kb-overlay" style={{ pointerEvents: open ? "all" : "none" }}>
        <div className={`kb-win${open ? " kb-open" : ""}`} style={{ position:"relative" }}>

          {/* Toast */}
          {toast && <div className="kb-toast">{toast}</div>}

          {/* Panel historial */}
          {showHist && (
            <div className="kb-hist-overlay">
              <div className="kb-hist-box">
                <div className="kb-hist-hd">
                  <div className="kb-hist-title">
                    <span>📋</span> Historial de conversación
                  </div>
                  <button className="kb-close" style={{ background:"rgba(76,29,149,.1)", border:"1px solid #EDE9FE", color:"#4C1D95" }} onClick={() => setShowHist(false)}>✕</button>
                </div>
                <div className="kb-hist-body">
                  {histToShow.length === 0
                    ? <div className="kb-hist-empty">🌟 No hay conversaciones guardadas todavía.<br />¡Chatea con Isabel para empezar!</div>
                    : histToShow.map((h, i) => (
                        <div key={i} className={`kb-hist-bubble ${h.role}`}>{h.text}</div>
                      ))
                  }
                </div>
                <div className="kb-hist-footer">
                  <button className="kb-hist-btn danger" onClick={clearHistory}>🗑️ Borrar historial</button>
                  <button className="kb-hist-btn secondary" onClick={() => setShowHist(false)}>Cerrar</button>
                </div>
              </div>
            </div>
          )}

          {/* ── Header con logo Kosmica ── */}
          <div className="kb-head">
            <div className="kb-logo">
              ✦&nbsp;Kosmica
              <br/>
              <span style={{fontSize:10, fontStyle:"normal", fontWeight:600, opacity:.75, background:"none", WebkitTextFillColor:"rgba(233,213,255,.75)"}}>Asesora IA</span>
            </div>
            <div className="kb-hinfo">
              <div className="kb-hname">
                <div className="kb-dot-online" />
                Isabel está en línea
                <span className="kb-badge">IA PRO</span>
              </div>
              <div className="kb-hsub">
                {loadCat
                  ? "Cargando catálogo completo..."
                  : `${allProds.filter(p=>Number(p.stock)>0).length} productos disponibles`
                }
              </div>
            </div>
            <div className="kb-hbtns">
              <button className="kb-hbtn" onClick={() => setShowHist(true)}>Historial</button>
              <button className="kb-close" onClick={() => setOpen(false)}>✕</button>
            </div>
          </div>

          {/* ── Categorías ── */}
          <div className="kb-cats">
            <button className="kb-cat on" onClick={e => filterCat("_all", e.currentTarget)}>✨ Todo</button>
            {cats.map(cat => (
              <button key={cat} className="kb-cat" onClick={e => filterCat(cat, e.currentTarget)}>
                {catEmoji(cat)} {cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* ── Mensajes ── */}
          <div className="kb-msgs" ref={msgsRef}>
            {loadCat && (
              <div className="kb-row-bot">
                <div className="kb-loading">
                  <div className="kb-spin" /> Cargando todo el catálogo de Kosmica...
                </div>
              </div>
            )}
            {msgs.map(m => (
              <div key={m.id} className={m.role === "user" ? "kb-row-user" : "kb-row-bot"}>
                <div
                  className={`kb-bub ${m.role === "user" ? "kb-bub-user" : "kb-bub-bot"}`}
                  dangerouslySetInnerHTML={{ __html: m.role === "user" ? m.text : m.html }}
                />
                {m.prods && m.prods.length > 0 && (
                  <div className="kb-pgrid">
                    {m.prods.map(p => (
                      <ProdCard
                        key={p.id}
                        p={p}
                        onAdd={handleAdd}
                        added={addedIds.has(p.id)}
                      />
                    ))}
                  </div>
                )}
                <div className="kb-time">{m.time}</div>
              </div>
            ))}
            {typing && (
              <div className="kb-row-bot">
                <div className="kb-typing">
                  <div className="kb-tdot"/><div className="kb-tdot"/><div className="kb-tdot"/>
                </div>
              </div>
            )}
            {chips.length > 0 && (
              <div className="kb-row-bot">
                <div className="kb-chips">
                  {chips.map(c => (
                    <button key={c} className="kb-chip" onClick={() => send(c)}>{c}</button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Input ── */}
          <div className="kb-footer">
            <input
              ref={inputRef}
              className="kb-inp"
              type="text"
              placeholder={waitName ? "Escribe tu nombre aquí..." : "¿Qué estás buscando hoy?"}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send()}
            />
            <button className="kb-send" onClick={() => send()} aria-label="Enviar">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
