// ============================================================
//  src/components/AIChatBot.jsx — Isabel · Asesora Kosmica
//  ✅ v15.0 — CATÁLOGO COMPLETO (fetch independiente)
//  ✅ Pregunta nombre al inicio
//  ✅ Historial de conversaciones persistente
//  ✅ Categorías en barra superior
//  ✅ Chips inteligentes por contexto
//  ✅ Productos con imagen real
//  ✅ Carrito rápido integrado
//  ✅ No depende de props de App.jsx para el catálogo
// ============================================================
import { useState, useEffect, useRef, useCallback } from "react";

// ── Configuración ──────────────────────────────────────────
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL
  || process.env.REACT_APP_API_URL
  || "https://kosmica-backend.onrender.com";

const MAX_HISTORY = 16;

// ── Utilidades ─────────────────────────────────────────────
const fmtCOP = n =>
  "$" + Number(n).toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const getTime = () => {
  const d = new Date();
  return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
};

const catEmoji = (c = "") => {
  const u = c.toUpperCase();
  if (u.includes("BOLSO") || u.includes("CARTERA"))  return "👜";
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

// ── Intenciones rápidas (sin llamar IA) ──────────────────
const QUICK = [
  {
    test: /^(hola|buenas|buenos?\s?días?|tardes?|noches?|hey|hi|ola)\b/i,
    reply: (n) => `¡Hola${n ? ", <strong>" + n + "</strong>" : ""}! Soy Isabel, tu asesora de Kosmica 💜<br>¿Buscas algo para ti o es un regalo especial?`,
    sugs: ["Para mí 💜", "Es un regalo 🎁", "Ver lo más vendido ⭐", "Ver ofertas 🏷️"],
  },
  {
    test: /envío|domicilio|despacho|transporte|flete|costo.*envío/i,
    reply: () => "El valor del envío lo coordina un asesor contigo directamente 🚚<br>¿Te ayudo a elegir algo primero?",
    sugs: ["Ver catálogo 🛍️", "Lo más vendido ⭐"],
  },
  {
    test: /pago|mercado\s?pago|tarjeta|pse|nequi|daviplata|efectivo|cómo pago/i,
    reply: () => "Aceptamos MercadoPago: tarjeta débito/crédito, PSE, Nequi, Daviplata y efectivo 💳<br>Todo 100% seguro.",
    sugs: ["Ver catálogo 🛍️"],
  },
  {
    test: /devolución|cambio|garantía|devolver|llegó mal/i,
    reply: () => "Tienes 15 días para cambios si el producto llega con defecto 💜<br>Escríbenos con fotos y lo resolvemos rápido.",
    sugs: ["Ver productos 🛍️"],
  },
  {
    test: /demora|cuando llega|tiempo.*entrega|días.*entrega/i,
    reply: () => "Los tiempos los confirma el asesor según tu ciudad 📦<br>Generalmente entre 2 y 5 días hábiles en Colombia.",
    sugs: ["Ver catálogo 🛍️"],
  },
  {
    test: /whatsapp|teléfono|contacto|llamar|hablar con alguien/i,
    reply: () => "Puedes escribirnos por WhatsApp 📱<br>¡Respondemos rápido! ¿Te ayudo con algún producto?",
    sugs: ["Ver productos 🛍️"],
  },
  {
    test: /gracias|muchas gracias|perfecto|excelente|chévere|genial/i,
    reply: (n) => `¡Con mucho gusto${n ? ", <strong>" + n + "</strong>" : ""}! Para eso estoy ✨ ¿Te ayudo con algo más?`,
    sugs: ["Ver más productos 🛍️", "Ver ofertas 🏷️"],
  },
  {
    test: /adios|chao|bye|hasta luego|nos vemos/i,
    reply: (n) => `¡Hasta pronto${n ? ", <strong>" + n + "</strong>" : ""}! Fue un placer atenderte 💜`,
    sugs: [],
  },
];

// ── System Prompt ──────────────────────────────────────────
function buildSystemPrompt(products, clientName) {
  const avail = products.filter(p => Number(p.stock) > 0);
  // Agrupar por categoría
  const groups = {};
  avail.forEach(p => {
    const cat = (p.category || "General").trim();
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(p);
  });

  const catalogStr = Object.entries(groups).map(([cat, prods]) =>
    `\n## ${cat.toUpperCase()} (${prods.length} productos)\n` +
    prods.map(p =>
      `  [ID:${p.id}] ${p.name} | ${fmtCOP(p.price)}` +
      (p.badge ? ` [${p.badge}]` : "") +
      (Number(p.stock) <= 5 ? ` ⚡ÚLTIMAS ${p.stock} UNIDADES` : "") +
      (p.rating ? ` ★${p.rating}` : "") +
      (p.description ? ` | ${String(p.description).slice(0, 80)}` : "")
    ).join("\n")
  ).join("\n");

  const catNames = Object.keys(groups).join(", ");

  return `Eres ISABEL, asesora de ventas experta de KOSMICA, tienda colombiana de moda, accesorios y belleza.

CLIENTE: ${clientName ? `Se llama ${clientName}. Llámala siempre por su nombre.` : "Nombre desconocido, no inventes uno."}

PERSONALIDAD:
- Colombiana auténtica, cálida, directa. Siempre tutea.
- Respuestas CORTAS: máximo 3 líneas + productos si aplica.
- Máximo 2 emojis por respuesta.
- NUNCA empieces con "¡Claro!", "Por supuesto" ni "Entendido".
- Si no entiendes, pregunta de forma corta y simpática.

TU META: CERRAR VENTAS. Cada respuesta debe acercar al cliente a comprar.

PROCESO DE VENTA:
1. ESCUCHA: Si el cliente es vago, pregunta ocasión, para quién, presupuesto — UNA pregunta a la vez.
2. RECOMIENDA: Máximo 2-3 productos. Explica en 1 frase POR QUÉ cada uno le sirve.
3. URGENCIA: Menciona stock bajo o badge OFERTA/NUEVO cuando aplique.
4. CIERRA: Termina con "¿Lo agregamos?" o "¿Cuál prefieres, el [A] o el [B]?"
5. OBJECIONES:
   - "Está caro" → ofrece opción más económica del catálogo
   - "Lo pienso" → "¿Qué duda te queda? Te ayudo a decidir 💜"
   - "No sé qué elegir" → haz UNA pregunta (ocasión O presupuesto)

ENVÍO: Si preguntan → "El valor del envío lo coordina un asesor contigo 🚚". NUNCA inventes precio de envío.

CATEGORÍAS: ${catNames}

CATÁLOGO COMPLETO:
${catalogStr}

REGLA CRÍTICA: Al mencionar productos específicos, escribe AL FINAL:
PRODUCTOS_RECOMENDADOS:id1,id2,id3
Solo IDs numéricos separados por coma. NUNCA inventes IDs ni nombres.`;
}

// ── Chips contextuales ─────────────────────────────────────
function contextChips(text) {
  const m = text.toLowerCase();
  if (/regalo|obsequio/.test(m))      return ["Para dama 👜", "Para caballero 💼", "¿Cuál es el más popular?"];
  if (/bolso|cartera/.test(m))        return ["Ver más bolsos 👜", "Ver morrales 🎒", "¿Tienen ofertas?"];
  if (/morral|mochila/.test(m))       return ["Ver más morrales 🎒", "Ver bolsos 👜", "Agregar al pedido"];
  if (/billetera|monedero/.test(m))   return ["Para dama 💜", "Para caballero 💙", "Ver todos los modelos"];
  if (/maquillaje|labial|sombra/.test(m)) return ["Ver kits completos 💄", "Ver labiales", "Ver paletas"];
  if (/capilar|cabello|pelo|shampoo/.test(m)) return ["Ver shampoos ✨", "Ver tratamientos", "Ver kits capilares"];
  if (/accesorio|aretes|collar|pulsera/.test(m)) return ["Ver aretes 💍", "Ver collares", "Ver pulseras"];
  if (/cuidado|crema|perfume/.test(m)) return ["Ver cremas 🧴", "Ver sets de baño", "Ver perfumes 🌸"];
  if (/oferta|descuento|promo/.test(m)) return ["Ver ofertas 🏷️", "Ver lo más vendido ⭐"];
  return ["¿Tienen ofertas? 🏷️", "Ver más vendidos ⭐", "Quiero que me contacten"];
}

// ── Extracción de IDs de respuesta IA ─────────────────────
const extractIds = text => {
  const m = text.match(/PRODUCTOS_RECOMENDADOS:\[?([\d,\s]+)\]?/);
  if (!m) return [];
  return m[1].split(",").map(s => parseInt(s.trim())).filter(n => !isNaN(n));
};

const cleanText = text =>
  text.replace(/PRODUCTOS_RECOMENDADOS:\[?[\d,\s]+\]?/g, "").trim()
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br>");

// ─────────────────────────────────────────────────────────
//  Estilos aislados — prefijo "kb2-" para no colisionar
// ─────────────────────────────────────────────────────────
const BOT_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

.kb2-fab {
  position: fixed; bottom: 22px; right: 16px; z-index: 997;
  width: 58px; height: 58px; border-radius: 50%;
  background: linear-gradient(135deg,#5B21B6,#7C3AED,#8B5CF6);
  border: none; cursor: pointer;
  box-shadow: 0 6px 28px rgba(91,33,182,.5), 0 0 0 0 rgba(139,92,246,.4);
  display: flex; align-items: center; justify-content: center;
  font-size: 26px; transition: transform .25s, box-shadow .25s;
  animation: kb2Pulse 2.5s infinite;
}
.kb2-fab:hover { transform: scale(1.1); box-shadow: 0 10px 36px rgba(91,33,182,.65); animation: none; }
@keyframes kb2Pulse {
  0%,100% { box-shadow: 0 6px 28px rgba(91,33,182,.5), 0 0 0 0 rgba(139,92,246,.45); }
  60%      { box-shadow: 0 6px 28px rgba(91,33,182,.5), 0 0 0 14px rgba(139,92,246,0); }
}
.kb2-fab-badge {
  position: absolute; top: -3px; right: -3px;
  background: #EF4444; color: #fff; border-radius: 50%;
  width: 20px; height: 20px; font-size: 11px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  border: 2px solid #fff; font-family: 'Plus Jakarta Sans',sans-serif;
}

/* ── Overlay ── */
.kb2-overlay {
  position: fixed; inset: 0; z-index: 998;
  display: flex; align-items: flex-end; justify-content: flex-end;
  padding: 0 16px 90px; pointer-events: none;
}
.kb2-overlay * { box-sizing: border-box; margin: 0; padding: 0; }

/* ── Ventana ── */
.kb2-win {
  width: min(440px, 96vw); height: min(680px, 86vh);
  display: flex; flex-direction: column;
  border-radius: 22px; overflow: hidden;
  background: #FFFFFF;
  box-shadow: 0 20px 70px rgba(76,29,149,.38), 0 2px 12px rgba(76,29,149,.12);
  border: 1px solid rgba(139,92,246,.18);
  pointer-events: none;
  transform: translateY(30px) scale(.94); opacity: 0;
  transition: transform .35s cubic-bezier(.34,1.56,.64,1), opacity .28s;
  font-family: 'Plus Jakarta Sans', sans-serif;
}
.kb2-win.kb2-open { transform: translateY(0) scale(1); opacity: 1; pointer-events: all; }

/* ── Header ── */
.kb2-header {
  background: linear-gradient(135deg,#3B0764 0%,#5B21B6 50%,#7C3AED 100%);
  padding: 14px 16px 12px;
  display: flex; align-items: center; gap: 11px; flex-shrink: 0;
  position: relative; overflow: hidden;
}
.kb2-header::before {
  content: ''; position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(ellipse 70% 80% at 80% -10%, rgba(255,255,255,.12) 0%, transparent 70%);
}
.kb2-avatar {
  width: 46px; height: 46px; border-radius: 50%;
  border: 2.5px solid rgba(255,255,255,.35);
  background: linear-gradient(135deg,#C026D3,#7C3AED);
  display: flex; align-items: center; justify-content: center;
  font-size: 22px; flex-shrink: 0; position: relative; z-index: 1;
}
.kb2-dot {
  position: absolute; bottom: 1px; right: 1px;
  width: 12px; height: 12px;
  background: #22C55E; border-radius: 50%; border: 2.5px solid #5B21B6;
}
.kb2-hinfo { flex: 1; min-width: 0; position: relative; z-index: 1; }
.kb2-hname {
  color: #fff; font-weight: 800; font-size: 15px;
  display: flex; align-items: center; gap: 7px; line-height: 1.2;
}
.kb2-badge {
  background: rgba(255,255,255,.18); color: #fff; font-size: 9px;
  font-weight: 800; padding: 2px 8px; border-radius: 20px;
  border: 1px solid rgba(255,255,255,.28); letter-spacing: .5px;
  white-space: nowrap;
}
.kb2-hsub { color: rgba(255,255,255,.72); font-size: 11.5px; margin-top: 3px; }
.kb2-hbtns { display: flex; gap: 6px; align-items: center; position: relative; z-index: 1; }
.kb2-hbtn {
  background: rgba(255,255,255,.14); border: 1px solid rgba(255,255,255,.24);
  color: #fff; font-size: 11px; padding: 4px 11px; border-radius: 12px;
  cursor: pointer; font-family: inherit; font-weight: 600; transition: background .2s;
}
.kb2-hbtn:hover { background: rgba(255,255,255,.26); }
.kb2-close {
  background: rgba(255,255,255,.14); border: 1px solid rgba(255,255,255,.24);
  color: #fff; width: 30px; height: 30px; border-radius: 50%;
  cursor: pointer; font-size: 15px; display: flex;
  align-items: center; justify-content: center; transition: background .2s;
}
.kb2-close:hover { background: rgba(255,255,255,.3); }

/* ── Categorías ── */
.kb2-cats {
  display: flex; gap: 6px; padding: 9px 12px 8px;
  overflow-x: auto; background: #fff;
  border-bottom: 1px solid #F3EEFF;
  scrollbar-width: none; flex-shrink: 0;
}
.kb2-cats::-webkit-scrollbar { display: none; }
.kb2-cat {
  flex-shrink: 0; padding: 5px 12px; border-radius: 20px;
  border: 1.5px solid #E9DDFF; background: #FAF6FF;
  color: #6B7280; font-size: 12px; font-family: inherit;
  cursor: pointer; white-space: nowrap; transition: all .2s; font-weight: 600;
}
.kb2-cat:hover { border-color: #7C3AED; color: #5B21B6; background: #F5EEFF; }
.kb2-cat.kb2-active { background: #7C3AED; color: #fff; border-color: #7C3AED; }

/* ── Mensajes ── */
.kb2-msgs {
  flex: 1; overflow-y: auto; padding: 14px 14px 8px;
  display: flex; flex-direction: column; gap: 10px;
  scroll-behavior: smooth; background: #FDFCFF;
}
.kb2-msgs::-webkit-scrollbar { width: 3px; }
.kb2-msgs::-webkit-scrollbar-thumb { background: #D8B4FE; border-radius: 3px; }

.kb2-bot,.kb2-user { max-width: 90%; display: flex; flex-direction: column; gap: 3px; }
.kb2-bot { align-self: flex-start; }
.kb2-user { align-self: flex-end; }

.kb2-bub {
  padding: 10px 14px; border-radius: 16px;
  font-size: 13.5px; line-height: 1.58;
}
.kb2-bub-bot {
  background: #F3EEFF; color: #1A0A2E;
  border-bottom-left-radius: 4px;
}
.kb2-bub-user {
  background: linear-gradient(135deg,#5B21B6,#7C3AED);
  color: #fff; border-bottom-right-radius: 4px;
}
.kb2-time { font-size: 10px; color: #B0A0C8; align-self: flex-end; }
.kb2-bot .kb2-time { align-self: flex-start; }

/* Chips sugerencias */
.kb2-chips { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 4px; }
.kb2-chip {
  padding: 5px 13px; border-radius: 20px;
  border: 1.5px solid #A78BFA; color: #5B21B6;
  font-size: 12px; cursor: pointer; background: #fff;
  font-family: inherit; font-weight: 600; transition: all .2s;
}
.kb2-chip:hover { background: #7C3AED; color: #fff; border-color: #7C3AED; }

/* Productos grid */
.kb2-pgrid {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 8px; margin-top: 10px; max-width: 340px;
}
.kb2-pcard {
  background: #fff; border: 1.5px solid #EDE9FE;
  border-radius: 13px; overflow: hidden; cursor: pointer;
  transition: all .22s;
}
.kb2-pcard:hover { border-color: #7C3AED; transform: translateY(-2px); box-shadow: 0 6px 20px rgba(124,58,237,.15); }
.kb2-pimg {
  width: 100%; aspect-ratio: 1; background: linear-gradient(135deg,#F3EEFF,#EDE9FE);
  display: flex; align-items: center; justify-content: center;
  overflow: hidden;
}
.kb2-pimg img { width: 100%; height: 100%; object-fit: cover; }
.kb2-pimg-emo { font-size: 32px; }
.kb2-pinfo { padding: 7px 9px 9px; }
.kb2-pcat {
  font-size: 9px; color: #7C3AED; font-weight: 800;
  text-transform: uppercase; letter-spacing: .5px;
}
.kb2-pname {
  font-size: 11.5px; font-weight: 700; color: #1A0A2E;
  margin: 3px 0 2px; white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis;
}
.kb2-pprice { font-size: 12.5px; font-weight: 800; color: #5B21B6; }
.kb2-pbadge {
  display: inline-block; font-size: 8.5px; font-weight: 800;
  padding: 1px 6px; border-radius: 8px; margin-bottom: 3px;
  background: linear-gradient(135deg,#F4A7C3,#C026D3); color: #fff;
}
.kb2-pbtn {
  width: 100%; padding: 6px; margin-top: 5px;
  background: linear-gradient(135deg,#5B21B6,#7C3AED);
  color: #fff; border: none; border-radius: 8px;
  font-size: 11px; font-family: inherit; font-weight: 700;
  cursor: pointer; transition: opacity .2s;
}
.kb2-pbtn:hover { opacity: .88; }

/* Typing animation */
.kb2-typing {
  display: flex; align-items: center; gap: 4px;
  padding: 10px 14px; background: #F3EEFF;
  border-radius: 16px; border-bottom-left-radius: 4px; width: 62px;
}
.kb2-tdot {
  width: 6px; height: 6px; border-radius: 50%;
  background: #7C3AED; animation: kb2Bounce 1.2s infinite;
}
.kb2-tdot:nth-child(2) { animation-delay: .2s; }
.kb2-tdot:nth-child(3) { animation-delay: .4s; }
@keyframes kb2Bounce {
  0%,60%,100% { transform: translateY(0); }
  30% { transform: translateY(-5px); }
}

/* Cargando catálogo */
.kb2-loading-cat {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px; font-size: 12px; color: #9CA3AF;
  background: #F9F7FF; border-radius: 10px;
}
.kb2-spin {
  width: 16px; height: 16px; border-radius: 50%;
  border: 2px solid #EDE9FE; border-top-color: #7C3AED;
  animation: kb2Spin .7s linear infinite; flex-shrink: 0;
}
@keyframes kb2Spin { to { transform: rotate(360deg); } }

/* Carrito bar */
.kb2-cart-bar {
  background: linear-gradient(135deg,#3B0764,#5B21B6);
  color: #fff; padding: 9px 14px;
  display: flex; align-items: center; justify-content: space-between;
  font-size: 12.5px; flex-shrink: 0;
}
.kb2-cart-btn {
  background: rgba(255,255,255,.18);
  border: 1px solid rgba(255,255,255,.3);
  color: #fff; padding: 5px 14px; border-radius: 12px;
  font-size: 11.5px; font-family: inherit; cursor: pointer;
  font-weight: 700; transition: background .2s;
}
.kb2-cart-btn:hover { background: rgba(255,255,255,.3); }

/* Footer input */
.kb2-footer {
  padding: 9px 12px 11px; background: #fff;
  border-top: 1px solid #F3EEFF;
  display: flex; gap: 8px; align-items: center; flex-shrink: 0;
}
.kb2-input {
  flex: 1; padding: 10px 15px; border: 2px solid #EDE9FE;
  border-radius: 24px; font-size: 13.5px; font-family: inherit;
  outline: none; color: #1A0A2E; transition: border .2s;
  background: #FAF8FF;
}
.kb2-input:focus { border-color: #7C3AED; background: #fff; }
.kb2-input::placeholder { color: #C4B5FD; }
.kb2-send {
  width: 40px; height: 40px; border-radius: 50%;
  background: linear-gradient(135deg,#5B21B6,#7C3AED);
  border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; transition: transform .2s, opacity .2s;
  box-shadow: 0 4px 14px rgba(91,33,182,.4);
}
.kb2-send:hover { transform: scale(1.08); }
.kb2-send:active { transform: scale(.96); }

/* Toast */
.kb2-toast {
  position: absolute; top: 10px; left: 50%; transform: translateX(-50%);
  background: #22C55E; color: #fff; padding: 6px 16px; border-radius: 20px;
  font-size: 12px; font-weight: 700; font-family: 'Plus Jakarta Sans',sans-serif;
  white-space: nowrap; z-index: 10; pointer-events: none;
  animation: kb2FadeIn .3s;
}
@keyframes kb2FadeIn { from{opacity:0;transform:translateX(-50%) translateY(-5px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }

/* Historial modal */
.kb2-hist {
  position: absolute; inset: 0; background: rgba(26,10,46,.9);
  backdrop-filter: blur(4px); z-index: 20; display: flex; align-items: center;
  justify-content: center; padding: 20px;
}
.kb2-hist-box {
  background: #fff; border-radius: 18px; width: 100%; max-width: 360px;
  max-height: 420px; display: flex; flex-direction: column;
  box-shadow: 0 16px 50px rgba(91,33,182,.3);
}
.kb2-hist-head {
  padding: 16px 18px 12px; border-bottom: 1px solid #F3EEFF;
  display: flex; align-items: center; justify-content: space-between;
}
.kb2-hist-title {
  font-weight: 800; font-size: 15px; color: #1A0A2E;
  font-family: 'Plus Jakarta Sans',sans-serif;
}
.kb2-hist-body { flex: 1; overflow-y: auto; padding: 12px 16px; }
.kb2-hist-item {
  padding: 8px 12px; border-radius: 10px; margin-bottom: 6px;
  font-size: 13px; line-height: 1.5; font-family: 'Plus Jakarta Sans',sans-serif;
}
.kb2-hist-item.user { background: #F3EEFF; color: #1A0A2E; text-align: right; }
.kb2-hist-item.bot  { background: #FAF8FF; color: #4B5563; border: 1px solid #F3EEFF; }
.kb2-hist-empty {
  text-align: center; padding: 32px; color: #9CA3AF;
  font-size: 13px; font-family: 'Plus Jakarta Sans',sans-serif;
}

@media (min-width: 640px) {
  .kb2-overlay { align-items: flex-end; padding: 0 28px 28px; }
  .kb2-fab { bottom: 28px; right: 28px; }
}
`;

// ─────────────────────────────────────────────────────────
//  Tarjeta de producto
// ─────────────────────────────────────────────────────────
function ProdCard({ p, onAdd }) {
  const [imgOk, setImgOk] = useState(null);
  const emoji = catEmoji(p.category || "");

  useEffect(() => {
    if (!p.imageUrl) { setImgOk(false); return; }
    const img = new window.Image();
    img.onload  = () => setImgOk(true);
    img.onerror = () => setImgOk(false);
    img.src = p.imageUrl;
    return () => { img.onload = null; img.onerror = null; };
  }, [p.imageUrl]);

  return (
    <div className="kb2-pcard">
      <div className="kb2-pimg">
        {imgOk === null && <div className="kb2-spin" />}
        {imgOk === true && <img src={p.imageUrl} alt={p.name} />}
        {imgOk === false && <span className="kb2-pimg-emo">{emoji}</span>}
      </div>
      <div className="kb2-pinfo">
        {p.badge && <div className="kb2-pbadge">{p.badge}</div>}
        <div className="kb2-pcat">{p.category}</div>
        <div className="kb2-pname">{p.name}</div>
        <div className="kb2-pprice">{fmtCOP(p.price)}</div>
        <button className="kb2-pbtn" onClick={() => onAdd(p)}>🛒 Agregar</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  Componente principal
// ─────────────────────────────────────────────────────────
export default function AIChatBot() {
  // Estado UI
  const [open, setOpen]           = useState(false);
  const [msgs, setMsgs]           = useState([]);
  const [chips, setChips]         = useState([]);
  const [input, setInput]         = useState("");
  const [typing, setTyping]       = useState(false);
  const [toast, setToast]         = useState("");
  const [showHist, setShowHist]   = useState(false);

  // Estado datos
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [categories, setCategories]   = useState([]);

  // Estado cliente
  const [clientName, setClientName]   = useState("");
  const [waitName, setWaitName]       = useState(false);
  const [aiHistory, setAiHistory]     = useState([]);
  const [cart, setCart]               = useState([]);

  const msgsRef = useRef(null);

  // ── Inyectar CSS ────────────────────────────────────────
  useEffect(() => {
    if (!document.getElementById("kb2-css")) {
      const s = document.createElement("style");
      s.id = "kb2-css";
      s.textContent = BOT_CSS;
      document.head.appendChild(s);
    }
  }, []);

  // ── Scroll automático ───────────────────────────────────
  useEffect(() => {
    if (msgsRef.current) {
      msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
    }
  }, [msgs, typing]);

  // ── Helpers ─────────────────────────────────────────────
  const addBot = useCallback((html, nextChips = []) => {
    setMsgs(p => [...p, { role: "bot", html, time: getTime(), id: Date.now() + Math.random() }]);
    setChips(nextChips);
  }, []);

  const addUser = useCallback((text) => {
    setMsgs(p => [...p, { role: "user", text, time: getTime(), id: Date.now() + Math.random() }]);
    setChips([]);
  }, []);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  }, []);

  const renderProds = useCallback((prods) => {
    if (!prods.length) return null;
    return (
      <div className="kb2-pgrid">
        {prods.slice(0, 4).map(p => (
          <ProdCard key={p.id} p={p} onAdd={handleAddToCart} />
        ))}
      </div>
    );
  }, []);

  // ── Cargar todos los productos ───────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function loadAll() {
      try {
        const API = process.env.REACT_APP_API_URL || "http://localhost:8080";
        // Intentar /api/products para obtener TODOS
        const res = await fetch(`${API}/api/products?size=200`);
        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = await res.json();
        const prods = Array.isArray(data) ? data : (data.content || []);
        if (!cancelled) {
          setAllProducts(prods);
          const cats = [...new Set(prods.map(p => p.category).filter(Boolean))];
          setCategories(cats);
        }
      } catch (err) {
        // Si falla, usar catálogo local de emergencia
        if (!cancelled) {
          setAllProducts([]);
          setCategories([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadAll();
    return () => { cancelled = true; };
  }, []);

  // ── Iniciar conversación cuando catálogo listo ──────────
  useEffect(() => {
    if (loading) return;

    const savedName = (() => { try { return localStorage.getItem("kb2_client") || ""; } catch { return ""; } })();
    const savedHist = (() => { try { const r = localStorage.getItem("kb2_hist"); return r ? JSON.parse(r) : []; } catch { return []; } })();
    const savedCart = (() => { try { const r = localStorage.getItem("kb2_cart"); return r ? JSON.parse(r) : []; } catch { return []; } })();

    if (savedCart.length) setCart(savedCart);

    if (savedName) {
      setClientName(savedName);
      setAiHistory(savedHist);
      addBot(
        `¡Hola de nuevo, <strong>${savedName}</strong>! 💜 Qué bueno verte. ¿Qué te llama la atención hoy?`,
        ["Ver lo más vendido ⭐", "Ver novedades ✨", "Necesito un regalo 🎁", "Ver el catálogo completo"]
      );
    } else {
      addBot(
        `¡Hola! Soy <strong>Isabel</strong> ✨ tu asesora personal de Kosmica.<br><br>Tenemos bolsos, morrales, maquillaje, productos capilares, accesorios y mucho más.<br><br><strong>¿Cómo te llamas? 💜</strong>`,
        []
      );
      setWaitName(true);
    }
  }, [loading]); // eslint-disable-line

  // ── Guardar datos ────────────────────────────────────────
  const persist = useCallback((name, hist, cartData) => {
    try {
      if (name) localStorage.setItem("kb2_client", name);
      localStorage.setItem("kb2_hist", JSON.stringify(hist.slice(-40)));
      localStorage.setItem("kb2_cart", JSON.stringify(cartData));
    } catch {}
  }, []);

  // ── Agregar al carrito ───────────────────────────────────
  const handleAddToCart = useCallback((p) => {
    setCart(prev => {
      const ex = prev.find(x => x.id === p.id);
      const next = ex
        ? prev.map(x => x.id === p.id ? { ...x, qty: x.qty + 1 } : x)
        : [...prev, { ...p, qty: 1 }];
      persist(clientName, aiHistory, next);
      return next;
    });
    showToast("✓ Agregado al carrito");
    addBot(
      `¡Perfecto! Agregué <strong>${p.name}</strong> a tu pedido 🛒<br>¿Quieres algo más o confirmo el pedido?`,
      ["Ver mi pedido 🛒", "Seguir comprando 🛍️", "Confirmar pedido ✅"]
    );
  }, [clientName, aiHistory, persist, showToast, addBot]);

  // ── Filtrar por categoría ────────────────────────────────
  const filterCat = useCallback((cat) => {
    const prods = cat === "_all"
      ? allProducts.filter(p => Number(p.stock) > 0)
      : allProducts.filter(p => p.category === cat && Number(p.stock) > 0);

    const label = cat === "_all" ? "catálogo completo ✨" : `<strong>${cat}</strong>`;
    setMsgs(p => [...p, {
      role: "bot",
      html: `Aquí están los productos de ${label} 💜`,
      prods: prods.slice(0, 4),
      time: getTime(),
      id: Date.now(),
    }]);
    setChips(["¿Tienen ofertas? 🏷️", "Ver otro tipo de producto", "Quiero asesoría personalizada"]);
  }, [allProducts]);

  // ── Llamada al backend AI ────────────────────────────────
  const callIsabel = useCallback(async (userMsg, name, hist) => {
    const newHist = [...hist, { role: "user", content: userMsg }];
    setAiHistory(newHist);
    setTyping(true);

    try {
      const API = process.env.REACT_APP_API_URL || "http://localhost:8080";
      const sysPrompt = buildSystemPrompt(allProducts, name);

      const res = await fetch(`${API}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: sysPrompt,
          messages: newHist.slice(-MAX_HISTORY),
          max_tokens: 700,
        }),
      });

      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      setTyping(false);

      const rawText = (data.content || []).map(x => x.text || "").join("") ||
        "Disculpa, tuve un inconveniente. ¿Me repites tu pregunta? 💜";

      const updHist = [...newHist, { role: "assistant", content: rawText }];
      setAiHistory(updHist);
      persist(name, updHist, cart);

      const ids = extractIds(rawText);
      const clean = cleanText(rawText);
      const recProds = ids.map(id => allProducts.find(p => p.id === id || p.id === String(id))).filter(Boolean);

      setMsgs(p => [...p, {
        role: "bot",
        html: clean,
        prods: recProds,
        time: getTime(),
        id: Date.now(),
      }]);

      const lower = rawText.toLowerCase();
      const isClosing = ["contactará", "confirmar", "asesor"].some(k => lower.includes(k));
      setChips(isClosing
        ? ["Ver mi carrito 🛒", "Seguir comprando", "Ver otra categoría"]
        : contextChips(userMsg)
      );
    } catch (err) {
      setTyping(false);
      addBot(
        "Disculpa el inconveniente. Un asesor de Kosmica te contactará personalmente 💜",
        ["Quiero que me contacten 📱"]
      );
    }
  }, [allProducts, cart, persist, addBot]);

  // ── Enviar mensaje ───────────────────────────────────────
  const send = useCallback(async (text) => {
    const t = (text || input).trim();
    if (!t) return;
    setInput("");
    addUser(t);

    // Captura de nombre
    if (waitName) {
      const raw = t.split(" ")[0];
      const name = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
      setClientName(name);
      setWaitName(false);
      try { localStorage.setItem("kb2_client", name); } catch {}
      setTimeout(() => {
        addBot(
          `¡Mucho gusto, <strong>${name}</strong>! 💜 Bienvenida a Kosmica.<br>Tenemos de todo para ti: bolsos, morrales, maquillaje, capilar, accesorios y más. ¿En qué te puedo ayudar hoy? ✨`,
          ["Ver lo más vendido ⭐", "Ver novedades ✨", "Necesito un regalo 🎁", "Ver todo el catálogo"]
        );
      }, 400);
      return;
    }

    // Respuesta rápida sin IA
    for (const qi of QUICK) {
      if (qi.test.test(t)) {
        setTimeout(() => addBot(qi.reply(clientName), qi.sugs), 350);
        return;
      }
    }

    // Chips especiales
    const tl = t.toLowerCase();
    if (tl.includes("ver mi pedido") || tl.includes("mi carrito")) {
      const total = cart.reduce((a, b) => a + Number(b.price) * b.qty, 0);
      const qty   = cart.reduce((a, b) => a + b.qty, 0);
      if (!cart.length) {
        addBot("Tu carrito está vacío por ahora. ¿Te ayudo a elegir algo? 💜", ["Ver productos 🛍️"]);
      } else {
        addBot(
          `🛒 <strong>Tu pedido (${qty} productos):</strong><br>` +
          cart.map(i => `• ${i.name} × ${i.qty} — ${fmtCOP(i.price * i.qty)}`).join("<br>") +
          `<br><strong>Total: ${fmtCOP(total)}</strong>`,
          ["Confirmar pedido ✅", "Seguir comprando 🛍️"]
        );
      }
      return;
    }
    if (tl.includes("confirmar pedido") || tl.includes("quiero que me contacten")) {
      addBot(
        `✅ ¡Listo, <strong>${clientName || "amiga"}</strong>! Un asesor de Kosmica se pondrá en contacto para confirmar tu pedido y coordinar el envío. ¡Gracias por elegirnos! 💜`
      );
      return;
    }

    await callIsabel(t, clientName, aiHistory);
  }, [input, waitName, clientName, aiHistory, cart, addUser, addBot, callIsabel]);

  // ── Resumen carrito ──────────────────────────────────────
  const cartTotal = cart.reduce((a, b) => a + Number(b.price) * b.qty, 0);
  const cartQty   = cart.reduce((a, b) => a + b.qty, 0);

  // ── Historial visual ─────────────────────────────────────
  const histItems = aiHistory.slice(-20).map((h, i) => ({
    role: h.role === "user" ? "user" : "bot",
    text: h.content.replace(/<[^>]+>/g, "").replace(/PRODUCTOS_RECOMENDADOS:[\d,\s]+/g, "").slice(0, 120),
    key: i,
  }));

  // ── Render ───────────────────────────────────────────────
  return (
    <>
      {/* FAB flotante */}
      <button
        className="kb2-fab"
        onClick={() => setOpen(o => !o)}
        aria-label="Abrir chat con Isabel"
      >
        {open ? "✕" : "✨"}
        {!open && cartQty > 0 && <span className="kb2-fab-badge">{cartQty}</span>}
      </button>

      <div className="kb2-overlay" style={{ pointerEvents: open ? "all" : "none" }}>
        <div className={`kb2-win${open ? " kb2-open" : ""}`} style={{ position: "relative" }}>

          {/* Toast */}
          {toast && <div className="kb2-toast">{toast}</div>}

          {/* Historial overlay */}
          {showHist && (
            <div className="kb2-hist">
              <div className="kb2-hist-box">
                <div className="kb2-hist-head">
                  <span className="kb2-hist-title">📋 Historial</span>
                  <button className="kb2-close" onClick={() => setShowHist(false)}>✕</button>
                </div>
                <div className="kb2-hist-body">
                  {histItems.length === 0
                    ? <div className="kb2-hist-empty">No hay historial todavía 🌟</div>
                    : histItems.map(h => (
                        <div key={h.key} className={`kb2-hist-item ${h.role}`}>{h.text}</div>
                      ))
                  }
                </div>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="kb2-header">
            <div className="kb2-avatar">
              💎
              <div className="kb2-dot" />
            </div>
            <div className="kb2-hinfo">
              <div className="kb2-hname">
                Isabel · Asesora Kosmica
                <span className="kb2-badge">IA PRO</span>
              </div>
              <div className="kb2-hsub">
                {loading
                  ? "Cargando catálogo completo..."
                  : `En línea · ${allProducts.filter(p => Number(p.stock) > 0).length} productos disponibles`
                }
              </div>
            </div>
            <div className="kb2-hbtns">
              <button className="kb2-hbtn" onClick={() => setShowHist(true)}>Historial</button>
              <button className="kb2-close" onClick={() => setOpen(false)}>✕</button>
            </div>
          </div>

          {/* Barra de categorías */}
          <div className="kb2-cats">
            <button
              className="kb2-cat kb2-active"
              onClick={e => {
                document.querySelectorAll(".kb2-cat").forEach(b => b.classList.remove("kb2-active"));
                e.currentTarget.classList.add("kb2-active");
                filterCat("_all");
              }}
            >
              ✨ Todo
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                className="kb2-cat"
                onClick={e => {
                  document.querySelectorAll(".kb2-cat").forEach(b => b.classList.remove("kb2-active"));
                  e.currentTarget.classList.add("kb2-active");
                  filterCat(cat);
                }}
              >
                {catEmoji(cat)} {cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* Área de mensajes */}
          <div className="kb2-msgs" ref={msgsRef}>
            {loading && (
              <div className="kb2-bot">
                <div className="kb2-loading-cat">
                  <div className="kb2-spin" />
                  Cargando todo el catálogo de Kosmica...
                </div>
              </div>
            )}

            {msgs.map(m => (
              <div key={m.id} className={m.role === "user" ? "kb2-user" : "kb2-bot"}>
                <div
                  className={`kb2-bub ${m.role === "user" ? "kb2-bub-user" : "kb2-bub-bot"}`}
                  dangerouslySetInnerHTML={{
                    __html: m.role === "user" ? m.text : m.html,
                  }}
                />
                {m.prods && m.prods.length > 0 && (
                  <div className="kb2-pgrid">
                    {m.prods.slice(0, 4).map(p => (
                      <ProdCard key={p.id} p={p} onAdd={handleAddToCart} />
                    ))}
                  </div>
                )}
                <div className="kb2-time">{m.time}</div>
              </div>
            ))}

            {typing && (
              <div className="kb2-bot">
                <div className="kb2-typing">
                  <div className="kb2-tdot" />
                  <div className="kb2-tdot" />
                  <div className="kb2-tdot" />
                </div>
              </div>
            )}

            {chips.length > 0 && (
              <div className="kb2-bot">
                <div className="kb2-chips">
                  {chips.map(c => (
                    <button key={c} className="kb2-chip" onClick={() => send(c)}>{c}</button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Barra carrito */}
          {cart.length > 0 && (
            <div className="kb2-cart-bar">
              <span>🛒 {cartQty} producto{cartQty > 1 ? "s" : ""} · <strong>{fmtCOP(cartTotal)}</strong></span>
              <button className="kb2-cart-btn" onClick={() => send("confirmar pedido")}>
                Confirmar pedido ✅
              </button>
            </div>
          )}

          {/* Input */}
          <div className="kb2-footer">
            <input
              className="kb2-input"
              type="text"
              placeholder={waitName ? "Escribe tu nombre aquí..." : "¿Qué estás buscando hoy?"}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send()}
            />
            <button className="kb2-send" onClick={() => send()} aria-label="Enviar">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
