// ============================================================
//  src/components/AIChatBot.jsx — Isabel · Asesora Kosmica v17
//  ✅ Bot súper inteligente con cierre de ventas
//  ✅ Conoce TODO el catálogo en tiempo real
//  ✅ Métodos de envío integrados (local $15.999 / nacional $20.000)
//  ✅ Sin opción "contactar asesor"
//  ✅ Agrega al carrito REAL de App.jsx (onAddToCart prop)
//  ✅ Historial de conversación funcional y persistente
// ============================================================
import { useState, useEffect, useRef, useCallback } from "react";

// ─── Config ───────────────────────────────────────────────
const MAX_HIST = 20;

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

// ─── Métodos de envío ─────────────────────────────────────
export const SHIPPING_METHODS = [
  {
    id: "local",
    label: "🏍️ Entrega Local",
    cost: 15000,
    desc: "Medellín y Área Metropolitana",
    detail: "Tu pedido llega en máximo 24 horas. Uno de nuestros domiciliarios te contactará para confirmar dirección y horario.",
    badge: "⚡ Más rápido"
  },
  {
    id: "national",
    label: "📦 Envío Nacional",
    cost: 20000,
    desc: "Todo Colombia",
    detail: "Se enviará al día siguiente de tu compra. Un asesor se contactará contigo para el seguimiento de tu pedido y asesoría personalizada.",
    badge: "🇨🇴 A todo el país"
  }
];

// ─── Intenciones rápidas ──────────────────────────────────
const QUICK = [
  { test: /^(hola|buenas|buenos?\s?d[íi]as?|tardes?|noches?|hey|hi|ola)\b/i,
    reply: n => `¡Hola${n?", <strong>"+n+"</strong>":""}! Soy Isabel, tu asesora de Kosmica 💜<br>¿Buscas algo para ti o es un regalo especial?`,
    chips: ["Para mí 💜","Es un regalo 🎁","Ver lo más vendido ⭐","Ver ofertas 🏷️"] },
  { test: /env[íi]o|domicilio|despacho|transporte|flete|cuánto.*env[íi]o|costo.*env[íi]o/i,
    reply: () => `Tenemos dos opciones de envío 🚚<br><br><strong>🏍️ Entrega Local</strong> — ${fmtCOP(15000)}<br>Medellín y Área Metropolitana. Llega en máx 24h.<br><br><strong>📦 Envío Nacional</strong> — ${fmtCOP(20000)}<br>A todo Colombia. Se envía al día siguiente.<br><br>Lo eliges al finalizar tu compra 😊`,
    chips: ["Ver catálogo 🛍️","Lo más vendido ⭐","¿Cómo pago? 💳"] },
  { test: /pago|mercado\s?pago|tarjeta|pse|nequi|daviplata|efectivo|c[oó]mo pago/i,
    reply: () => "Aceptamos MercadoPago: tarjeta, PSE, Nequi, Daviplata y efectivo 💳<br>Todo 100% seguro y con confirmación inmediata.",
    chips: ["Ver catálogo 🛍️","¿Cuánto es el envío? 🚚"] },
  { test: /devoluci[oó]n|cambio|garant[íi]a|devolver/i,
    reply: () => "Tienes 15 días para cambios si el producto llega con defecto 💜<br>Escríbenos al WhatsApp con fotos y lo resolvemos rápido.",
    chips: ["Ver productos 🛍️"] },
  { test: /gracias|muchas gracias|perfecto|excelente|ch[eé]vere/i,
    reply: n => `¡Con mucho gusto${n?", <strong>"+n+"</strong>":""}! Para eso estoy ✨ ¿Te ayudo con algo más?`,
    chips: ["Ver más productos 🛍️","Ver ofertas 🏷️"] },
  { test: /adios|chao|bye|hasta luego/i,
    reply: n => `¡Hasta pronto${n?", <strong>"+n+"</strong>":""}! Fue un placer atenderte 💜`,
    chips: [] },
];

// ─── Chips contextuales con categorías ───────────────────
const ctxChips = (t, cats = []) => {
  const m = t.toLowerCase();
  // Chips de categorías disponibles (máx 3)
  const catChips = cats.slice(0, 3).map(c => `${catEmoji(c)} ${c.charAt(0)+c.slice(1).toLowerCase()}`);

  if (/regalo/.test(m))                  return ["Para dama 👜","Para caballero 💼","¿El más popular?",...catChips].slice(0,4);
  if (/bolso|cartera/.test(m))           return ["Ver más bolsos 👜","Ver morrales 🎒","¿Hay ofertas?",...catChips].slice(0,4);
  if (/morral|mochila/.test(m))          return ["Ver más morrales 🎒","Ver bolsos 👜","Agregar al pedido",...catChips].slice(0,4);
  if (/billetera|monedero/.test(m))      return ["Para dama 💜","Para caballero 💙","Ver todos"];
  if (/maquillaje|labial|sombra/.test(m))return ["Kits completos 💄","Ver labiales","Ver paletas",...catChips].slice(0,4);
  if (/capilar|cabello|shampoo/.test(m)) return ["Ver shampoos ✨","Ver tratamientos","Kits capilares"];
  if (/accesorio|aretes|collar/.test(m)) return ["Ver aretes 💍","Ver collares","Ver pulseras"];
  if (/cuidado|crema|perfume/.test(m))   return ["Ver cremas 🧴","Sets de baño","Ver perfumes 🌸"];
  if (/oferta|descuento|promo/.test(m))  return ["Ver ofertas 🏷️","Lo más vendido ⭐",...catChips].slice(0,4);
  if (/env[íi]o|enviar/.test(m))         return ["🏍️ Local $15.000","📦 Nacional $20.000","Ver carrito 🛒"];
  return [...catChips, "¿Hay ofertas? 🏷️","Lo más vendido ⭐","Ver carrito 🛒"].slice(0,4);
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
    `\n## ${cat.toUpperCase()} (${ps.length} productos disponibles)\n` +
    ps.map(p =>
      `  [ID:${p.id}] ${p.name} | Precio: ${fmtCOP(p.price)}` +
      (p.badge ? ` | DESTACADO: ${p.badge}` : "") +
      (Number(p.stock) <= 5 ? ` | ⚡ ÚLTIMAS ${p.stock} unidades` : "") +
      (p.rating ? ` | ★${p.rating}` : "") +
      (p.description ? ` | ${String(p.description).slice(0, 120)}` : "")
    ).join("\n")
  ).join("\n");

  return `Eres ISABEL, asesora profesional de ventas de KOSMICA — tienda colombiana de moda y belleza.

═══════════════════════════════════
IDENTIDAD
═══════════════════════════════════
- Eres una asesora real de tienda, NO una inteligencia artificial. Nunca lo menciones.
- Nunca digas "Como IA", "Como modelo de lenguaje", ni nada similar.
- Nunca digas "un asesor te contactará" — TÚ eres la asesora.
${name
  ? `- El cliente se llama **${name}**. SIEMPRE úsalo en tus respuestas para crear cercanía.`
  : "- Aún no sabes el nombre del cliente."}

═══════════════════════════════════
PERSONALIDAD
═══════════════════════════════════
- Colombiana cálida, empática y profesional
- Lenguaje natural y cercano, como una amiga experta en moda
- Respuestas CORTAS, CLARAS y ENFOCADAS en vender
- Máximo 2-3 emojis por respuesta — no abuses
- NUNCA empieces con: "¡Claro!", "Por supuesto", "Entendido", "Con gusto"

═══════════════════════════════════
PROCESO DE VENTA (sigue este orden)
═══════════════════════════════════
1. ESCUCHA — Si el cliente no sabe qué quiere, haz UNA pregunta breve:
   Ejemplo: "¿Buscas algo elegante, casual o para uso diario?"

2. RECOMIENDA — Máximo 3 productos del catálogo. Usa este formato exacto:

   👜 Nombre del producto
   💰 Precio
   ✨ Beneficio principal — por qué ES PERFECTO para este cliente.

3. URGENCIA — Si el producto tiene stock limitado (ÚLTIMAS X unidades), menciónalo sutilmente.
   Ejemplo: "Quedan pocas unidades, es muy solicitado."

4. CIERRA — Siempre termina con una invitación directa a comprar:
   "¿Te gustaría que lo agregue al carrito?"
   "¿Lo reservamos ahora?"
   "¿Cuál de los dos te convence más?"

5. POST-VENTA — Si el cliente agrega al carrito, confirma con entusiasmo y guíalo al checkout.

═══════════════════════════════════
VENTA CONSULTIVA
═══════════════════════════════════
Cuando recomiendes, usa frases que generen confianza:
- "Es uno de los más vendidos de Kosmica."
- "A muchas clientas les encanta este modelo."
- "Es una excelente elección para esa ocasión."

═══════════════════════════════════
MANEJO DE OBJECIONES
═══════════════════════════════════
Si dice que está caro:
  "Lo entiendo. Este modelo destaca por su durabilidad y diseño — por eso es uno de los más elegidos."

Si pide descuento:
  "El precio es muy competitivo para la calidad que ofrece, además incluye [beneficio del producto]."

Si dice "lo pienso" o duda:
  "Te entiendo. Si te ayuda a decidir, ${Number(avail.filter(p=>Number(p.stock)<=5).length) > 0 ? "algunos modelos tienen pocas unidades disponibles. " : ""}¿quieres que te cuente más sobre este?"

Si ya está listo para comprar ("lo quiero", "me gusta", "lo compro"):
  Confirma con entusiasmo: "¡Excelente elección! ¿Lo agregamos al carrito ahora mismo? 🛒"

═══════════════════════════════════
ENVÍOS
═══════════════════════════════════
Cuando pregunten por envío, explica ambas opciones y que se elige al finalizar la compra:
- 🏍️ Entrega Local: $15.000 — Medellín y Área Metropolitana. Llega en máx 24 horas.
- 📦 Envío Nacional: $20.000 — Todo Colombia. Se envía al día siguiente.

═══════════════════════════════════
REGLAS CRÍTICAS
═══════════════════════════════════
- SOLO recomienda productos del catálogo. NUNCA inventes productos ni precios.
- Ofrece MÁXIMO 3 productos por recomendación.
- Respuestas CORTAS — nunca muy largas.
- NUNCA menciones que eres IA.

═══════════════════════════════════
CATÁLOGO DISPONIBLE HOY
═══════════════════════════════════
${catalog}

INSTRUCCIÓN TÉCNICA: Cuando recomiendes productos específicos, escribe AL FINAL de tu respuesta (sin que el cliente lo vea):
PRODUCTOS_RECOMENDADOS:id1,id2,id3
Solo IDs numéricos separados por comas. NUNCA inventes IDs que no estén en el catálogo.`;
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

// ─── Sesiones archivadas ──────────────────────────────────
const SESSIONS_KEY = "kb_sessions";
const MAX_SESSIONS = 10;

const saveSession = (name, msgs, aiHist) => {
  if (!msgs || msgs.length < 2) return;
  const sessions = lsGet(SESSIONS_KEY, []);
  const session = {
    id: Date.now(),
    name: name || "Cliente",
    date: new Date().toLocaleString("es-CO", { dateStyle:"short", timeStyle:"short" }),
    preview: msgs.filter(m=>m.role==="user").slice(-1)[0]?.text?.slice(0,60) || "Conversación",
    msgCount: msgs.length,
    msgs: msgs.slice(-30),
    aiHist: aiHist.slice(-40),
  };
  const updated = [session, ...sessions.filter(s=>s.id!==session.id)].slice(0, MAX_SESSIONS);
  lsSet(SESSIONS_KEY, updated);
};

// ─── CSS ──────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&display=swap');

/* FAB */
.kb-fab{
  position:fixed;bottom:22px;right:18px;z-index:1003;
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
/* Móvil: ventana ocupa casi toda la pantalla */
@media(max-width:480px){
  .kb-overlay{padding:0 0 0;bottom:0;right:0;left:0;align-items:flex-end;justify-content:center}
  .kb-win{width:100vw;height:calc(100dvh - 70px);border-radius:18px 18px 0 0;margin:0}
  .kb-fab{bottom:16px;right:14px}
  .kb-fab.kb-fab-hidden{display:none}
}

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
  border-bottom:1px solid #F3EEFF;scrollbar-width:thin;scrollbar-color:#C4B5FD transparent;flex-shrink:0;
  -webkit-overflow-scrolling:touch;
}
.kb-cats::-webkit-scrollbar{display:block;height:3px}
.kb-cats::-webkit-scrollbar-thumb{background:#C4B5FD;border-radius:3px}
@media(max-width:480px){
  .kb-cats{scrollbar-width:none}
  .kb-cats::-webkit-scrollbar{display:none}
}
.kb-cat{
  flex-shrink:0;padding:5px 12px;border-radius:20px;
  border:1.5px solid #EDE9FE;background:#FAF7FF;
  color:#7C3AED;font-size:12px;font-family:inherit;
  cursor:pointer;white-space:nowrap;transition:all .18s;font-weight:600;
}
.kb-cat:hover,.kb-cat.on{background:#6D28D9;color:#fff;border-color:#6D28D9}

/* Mensajes */
.kb-msgs{
  flex:1;overflow-y:auto;overflow-x:hidden;padding:13px 13px 7px;
  display:flex;flex-direction:column;gap:9px;
  scroll-behavior:smooth;background:#FDFCFF;
  -webkit-overflow-scrolling:touch;
  overscroll-behavior:contain;
}
.kb-msgs::-webkit-scrollbar{width:4px}
.kb-msgs::-webkit-scrollbar-thumb{background:#C4B5FD;border-radius:4px}
.kb-msgs::-webkit-scrollbar-track{background:transparent}
@media(max-width:480px){
  .kb-msgs::-webkit-scrollbar{width:2px}
}

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

/* Card envío */
.kb-ship-card{
  background:#fff;border:1.5px solid #EDE9FE;border-radius:13px;
  padding:10px 13px;margin-top:5px;cursor:pointer;
  transition:border-color .2s,box-shadow .2s;
}
.kb-ship-card:hover{border-color:#6D28D9;box-shadow:0 3px 12px rgba(109,40,217,.12)}
.kb-ship-title{font-size:13px;font-weight:800;color:#2E1065;margin-bottom:2px}
.kb-ship-price{font-size:14px;font-weight:900;color:#4C1D95}
.kb-ship-desc{font-size:11px;color:#6B7280;margin-top:3px;line-height:1.4}
.kb-ship-badge{display:inline-block;font-size:9px;font-weight:800;padding:1px 7px;border-radius:8px;margin-bottom:4px;background:#F3EEFF;color:#6D28D9;border:1px solid #EDE9FE}

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
  position:relative;z-index:10;
}
@media(max-width:480px){
  .kb-footer{
    padding:10px 12px calc(10px + env(safe-area-inset-bottom, 0px));
  }
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
/* Panel sesiones archivadas */
.kb-sessions-overlay{
  position:absolute;inset:0;background:rgba(20,5,45,.9);
  backdrop-filter:blur(8px);z-index:31;
  display:flex;align-items:center;justify-content:center;padding:16px;
  animation:kbFadeIn .25s;
}
.kb-session-item{
  background:#fff;border:1.5px solid #EDE9FE;border-radius:13px;
  padding:11px 14px;cursor:pointer;transition:all .2s;
  display:flex;flex-direction:column;gap:3px;
}
.kb-session-item:hover{border-color:#6D28D9;box-shadow:0 3px 12px rgba(109,40,217,.14)}
.kb-session-date{font-size:10px;color:#9CA3AF;font-weight:600}
.kb-session-preview{font-size:12.5px;color:#1A0A2E;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kb-session-count{font-size:10px;color:#7C3AED;font-weight:700}
.kb-session-actions{display:flex;gap:6px;margin-top:6px}
.kb-session-btn{flex:1;padding:5px 8px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;border:none;font-family:inherit;transition:all .18s}
.kb-session-btn.load{background:linear-gradient(135deg,#4C1D95,#6D28D9);color:#fff}
.kb-session-btn.del{background:#FEF2F2;color:#DC2626;border:1.5px solid #FECACA}
/* Editar nombre */
.kb-edit-name{
  display:flex;gap:6px;padding:8px 12px;background:#F3EEFF;
  border-bottom:1px solid #EDE9FE;flex-shrink:0;align-items:center;
}
.kb-edit-name input{
  flex:1;padding:6px 11px;border:1.5px solid #EDE9FE;border-radius:10px;
  font-size:12.5px;font-family:inherit;outline:none;color:#1A0A2E;background:#fff;
}
.kb-edit-name input:focus{border-color:#6D28D9}
.kb-edit-name button{padding:6px 13px;border-radius:10px;background:linear-gradient(135deg,#4C1D95,#6D28D9);color:#fff;border:none;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit}
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

@media(min-width:481px){
  .kb-overlay{padding:0 28px 90px;align-items:flex-end;justify-content:flex-end}
  .kb-fab{bottom:28px;right:28px}
  .kb-win{width:min(480px,90vw);height:min(700px,88vh)}
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

// ─── Tarjeta de método de envío ───────────────────────────
function ShippingCard({ method, onSelect }) {
  return (
    <div className="kb-ship-card" onClick={() => onSelect(method)}>
      <div className="kb-ship-badge">{method.badge}</div>
      <div className="kb-ship-title">{method.label}</div>
      <div className="kb-ship-price">{fmtCOP(method.cost)} COP</div>
      <div className="kb-ship-desc">{method.desc}<br/>{method.detail}</div>
      <button className="kb-pbtn" style={{marginTop:8}}>Seleccionar este método</button>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────
export default function AIChatBot({ onAddToCart, onOpenCart, onSelectShipping }) {
  const [open,      setOpen]      = useState(false);
  const [msgs,      setMsgs]      = useState([]);
  const [chips,     setChips]     = useState([]);
  const [input,     setInput]     = useState("");
  const [typing,    setTyping]    = useState(false);
  const [toast,     setToast]     = useState("");
  const [showHist,  setShowHist]  = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const [editingName,  setEditingName]  = useState(false);
  const [nameInput,    setNameInput]    = useState("");

  const [allProds,  setAllProds]  = useState([]);
  const [cats,      setCats]      = useState([]);
  const [loadCat,   setLoadCat]   = useState(true);

  const [clientName, setClientName] = useState("");
  const [waitName,   setWaitName]   = useState(false);
  const [aiHist,     setAiHist]     = useState([]);
  const [addedIds,   setAddedIds]   = useState(new Set());
  const [showShipping, setShowShipping] = useState(false);

  const msgsRef = useRef(null);
  const inputRef = useRef(null);

  // ── Inyectar CSS ────────────────────────────────────────
  useEffect(() => {
    if (!document.getElementById("kb-style-v17")) {
      const s = document.createElement("style");
      s.id = "kb-style-v17";
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
    // Archivar sesión al cerrar
    if (!open && msgs.length >= 2) {
      saveSession(clientName, msgs, aiHist);
    }
  }, [open]); // eslint-disable-line

  // ── Helpers de mensaje ───────────────────────────────────
  const addBot = useCallback((html, nextChips = [], prods = [], shipping = false) => {
    setMsgs(p => {
      const next = [...p, { role:"bot", html, prods, shipping, time:ts(), id:Date.now()+Math.random() }];
      lsSet("kb_msgs", next.slice(-30));
      return next;
    });
    setChips(nextChips);
  }, []);

  const addUser = useCallback(text => {
    setMsgs(p => {
      const next = [...p, { role:"user", text, time:ts(), id:Date.now()+Math.random() }];
      lsSet("kb_msgs", next.slice(-30));
      return next;
    });
    setChips([]);
  }, []);

  const showToast = useCallback(msg => {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
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
    const savedMsgs = lsGet("kb_msgs", []);
    const savedHist = lsGet("kb_aihist", []);
    const available = allProds.filter(p=>Number(p.stock)>0).length;

    if (savedName) {
      setClientName(savedName);
      setAiHist(savedHist);
      // Restaurar mensajes previos si los hay
      if (savedMsgs.length > 0) {
        setMsgs(savedMsgs.slice(-30));
        // Solo saludo corto al volver
        setTimeout(() => addBot(
          `¡Bienvenida de nuevo, <strong>${savedName}</strong>! 💜 Aquí continúa tu conversación ✨`,
          ["Ver lo más vendido ⭐","Quiero un regalo 🎁","Ver novedades ✨","¿Qué hay de nuevo?"]
        ), 300);
      } else {
        addBot(
          `¡Hola de nuevo, <strong>${savedName}</strong>! 💜 Qué bueno verte.<br>Tenemos <strong>${available} productos</strong> esperándote hoy ✨`,
          ["Ver lo más vendido ⭐","Quiero un regalo 🎁","Ver novedades ✨","Ver ofertas 🏷️"]
        );
      }
    } else {
      addBot(
        `¡Hola! Soy <strong>Isabel</strong> ✨ tu asesora personal de Kosmica 💜<br><br>Tenemos bolsos, morrales, maquillaje, capilar y mucho más — <strong>${available} productos</strong> disponibles hoy.<br><br>Para darte una atención personalizada... <strong>¿Cómo te llamas?</strong> 😊`
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
      `¡Listo! 🛒 Agregué <strong>${p.name}</strong> a tu carrito.<br>¿Quieres seguir viendo productos o finalizamos tu compra?`,
      ["Seguir comprando 🛍️","Ver mi carrito 🛒","Finalizar compra ✅"]
    );
  }, [onAddToCart, showToast, addBot]);

  // ── Seleccionar método de envío ──────────────────────────
  const handleSelectShipping = useCallback(method => {
    if (onSelectShipping) onSelectShipping(method);
    showToast(`✓ ${method.label} seleccionado`);
    addBot(
      `¡Perfecto! Elegiste <strong>${method.label}</strong> — ${fmtCOP(method.cost)}<br>${method.detail}<br><br>¿Continuamos con el pago?`,
      ["Ver mi carrito 🛒","Finalizar compra ✅","Seguir comprando 🛍️"]
    );
  }, [onSelectShipping, showToast, addBot]);

  // ── Filtrar por categoría ────────────────────────────────
  const filterCat = useCallback((cat, btn) => {
    document.querySelectorAll(".kb-cat").forEach(b => b.classList.remove("on"));
    btn?.classList.add("on");

    // Accesorios = próximamente
    if (cat === "ACCESORIOS") {
      addBot(
        `¡Los accesorios están llegando muy pronto! 💍✨<br>Mientras tanto tenemos bolsos, morrales, maquillaje, capilar, billeteras y más.<br>¿Qué te gustaría ver?`,
        ["Ver bolsos 👜","Ver morrales 🎒","Ver maquillaje 💄","Capilar ✨","Billeteras 💳","Cuidado personal 🧴"]
      );
      return;
    }

    const prods = cat === "_all"
      ? allProds.filter(p => Number(p.stock) > 0).slice(0, 6)
      : allProds.filter(p => p.category === cat && Number(p.stock) > 0).slice(0, 6);
    const label = cat === "_all" ? "catálogo completo" : `<strong>${cat.charAt(0)+cat.slice(1).toLowerCase()}</strong>`;
    if (prods.length === 0) {
      addBot(
        `Ahorita no tenemos productos de ${label} disponibles, pero están llegando nuevos muy pronto 💜`,
        ["Ver todo el catálogo 🛍️","Ver lo más vendido ⭐"]
      );
      return;
    }
    addBot(
      `Aquí tienes los mejores de ${label} 💜`,
      ["¿Hay ofertas? 🏷️","Ver otra categoría","¿Cuánto es el envío? 🚚"],
      prods
    );
  }, [allProds, addBot]);

  // ── Llamada directa a Anthropic ─────────────────────────
  const callIsabel = useCallback(async (msg, name, hist, retryCount = 0) => {
    const newHist = [...hist, { role:"user", content:msg }];
    setAiHist(newHist);
    lsSet("kb_aihist", newHist.slice(-40));
    setTyping(true);

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.REACT_APP_ANTHROPIC_KEY || "",
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 600,
          system: buildPrompt(allProds, name),
          messages: newHist.slice(-MAX_HIST).map(h => ({
            role: h.role === "bot" ? "assistant" : h.role,
            content: h.content,
          })),
        }),
      });

      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      const raw = (data.content || []).map(x => x.text || "").join("").trim();

      if (!raw && retryCount < 1) {
        setTyping(false);
        return callIsabel(msg, name, hist, retryCount + 1);
      }

      const finalRaw = raw || `¿Me cuentas un poco más qué estás buscando${name ? ", <strong>" + name + "</strong>" : ""}? Así te ayudo mejor 💜`;
      const updHist = [...newHist, { role:"assistant", content:finalRaw }];
      setAiHist(updHist);
      lsSet("kb_aihist", updHist.slice(-40));

      const ids = extractIds(finalRaw);
      const clean = cleanAI(finalRaw);
      const recProds = ids
        .map(id => allProds.find(p => p.id === id || p.id === String(id)))
        .filter(Boolean);

      const showShip = /env[íi]o|enviar|domicilio|despacho/i.test(msg);
      addBot(clean, ctxChips(msg, cats), recProds, showShip);

    } catch (err) {
      if (retryCount < 1) {
        setTyping(false);
        await new Promise(r => setTimeout(r, 800));
        return callIsabel(msg, name, hist, retryCount + 1);
      }
      // Fallback inteligente: Isabel responde con recursos locales
      const tl = msg.toLowerCase();
      if (/bolso|cartera|morral/i.test(tl)) {
        const prods = allProds.filter(p => /BOLSO|MORRAL/i.test(p.category||"") && Number(p.stock)>0).slice(0,3);
        addBot(`Mira estas opciones de bolsos que tenemos 💜`, ctxChips(msg, cats), prods);
      } else if (/maquillaje|labial|cosm/i.test(tl)) {
        const prods = allProds.filter(p => /MAQUILLAJE/i.test(p.category||"") && Number(p.stock)>0).slice(0,3);
        addBot(`Te muestro lo mejor en maquillaje ✨`, ctxChips(msg, cats), prods);
      } else if (/billetera/i.test(tl)) {
        const prods = allProds.filter(p => /BILLETERA/i.test(p.category||"") && Number(p.stock)>0).slice(0,3);
        addBot(`Aquí las billeteras disponibles 💳`, ctxChips(msg, cats), prods);
      } else {
        const top = allProds.filter(p => Number(p.stock)>0 && (p.badge || Number(p.rating)>=4.5)).slice(0,3);
        addBot(
          `¿Qué tipo de producto buscas${name?", <strong>"+name+"</strong>":""}? Cuéntame y te recomiendo lo mejor 💜`,
          ["Bolso o cartera 👜","Morral 🎒","Maquillaje 💄","Capilar ✨","Billeteras 💳","Cuidado personal 🧴","Accesorios 💍","Lo más vendido ⭐"],
          top
        );
      }
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
        `¡Qué nombre tan bonito, <strong>${name}</strong>! 💜 Bienvenida a Kosmica.<br>Tengo <strong>${allProds.filter(p=>Number(p.stock)>0).length} productos</strong> listos para ti hoy ✨<br>¿Qué estás buscando?`,
        ["Ver lo más vendido ⭐","Quiero algo para mí 💜","Busco un regalo 🎁","Ver lo nuevo ✨"]
      ), 350);
      return;
    }

    const tl = t.toLowerCase();

    // Ver carrito
    if (tl.includes("ver mi carrito") || tl.includes("mi carrito")) {
      if (onOpenCart) onOpenCart();
      addBot(`¡Aquí va tu carrito${clientName?", <strong>"+clientName+"</strong>":""}! 🛒`,[
        "Seguir comprando 🛍️","Finalizar compra ✅","¿Cuánto es el envío? 🚚"
      ]);
      return;
    }

    // Finalizar compra
    if (tl.includes("finalizar compra") || tl.includes("confirmar pedido") || tl.includes("pagar")) {
      if (onOpenCart) onOpenCart();
      addBot(
        `¡Vamos${clientName?", <strong>"+clientName+"</strong>":""}! 🎉<br>Recuerda seleccionar tu método de envío al finalizar — elige el que más te convenga.`,
        ["Ver mi carrito 🛒","¿Cuánto es el envío? 🚚"]
      );
      return;
    }

    // Lo más vendido
    if (/m[aá]s vendido|top|popular|mejor|destacado/i.test(tl)) {
      const top = allProds
        .filter(p => Number(p.stock) > 0 && (p.badge || Number(p.rating) >= 4.5))
        .slice(0, 4);
      const fallback = allProds.filter(p => Number(p.stock) > 0).slice(0, 4);
      const prods = top.length >= 2 ? top : fallback;
      setTimeout(() => addBot(
        `Estos son los más amados por nuestras clientas${clientName?", <strong>"+clientName+"</strong>":""}! ⭐`,
        ["¿Cuánto es el envío? 🚚","Busco un regalo 🎁","Ver más 🛍️"],
        prods
      ), 400);
      return;
    }

    // Para mí / quiero algo para mí
    if (/para m[íi]|algo para m[íi]|quiero algo/i.test(tl)) {
      setTimeout(() => addBot(
        `¡Me encanta! ¿Qué tipo de producto estás buscando${clientName?", <strong>"+clientName+"</strong>":""}? 💜`,
        ["Bolso o cartera 👜","Morral o mochila 🎒","Maquillaje 💄","Capilar ✨","Cuidado personal 🧴","Billeteras 💳","Accesorios 💍","Lo más vendido ⭐"]
      ), 350);
      return;
    }

    // Regalo
    if (/regalo|obsequio|para.*ella|para.*él|para.*esposa|para.*mamá|para.*amiga/i.test(tl)) {
      setTimeout(() => addBot(
        `¡Qué detalle tan especial! 🎁 Para elegir el regalo perfecto, ¿me cuentas el presupuesto${clientName?", <strong>"+clientName+"</strong>":""}?`,
        ["Hasta $50.000","Entre $50.000 y $100.000","Más de $100.000","Sorpréndeme 💜"]
      ), 400);
      return;
    }

    // Ver novedades / lo nuevo
    if (/novedad|nuevo|reciente|lleg[oó]|estreno/i.test(tl)) {
      const nuevos = allProds.filter(p => Number(p.stock) > 0).slice(-4).reverse();
      setTimeout(() => addBot(
        `¡Mira lo que acaba de llegar${clientName?", <strong>"+clientName+"</strong>":""}! ✨`,
        ["Ver más novedades","¿Cuánto es el envío? 🚚","Agregar al carrito 🛒"],
        nuevos
      ), 400);
      return;
    }

    // Información de envío
    if (/env[íi]o|despacho|dom[ií]cilio|cuánto.*env|costo.*env|opciones.*env/i.test(tl)) {
      addBot(
        `Tenemos dos opciones de envío 🚚 Elige al momento de finalizar tu compra:`,
        ["¿Cómo pago? 💳","Ver mi carrito 🛒"],
        [],
        true
      );
      return;
    }

    // Respuesta rápida
    for (const q of QUICK) {
      if (q.test.test(t)) {
        setTimeout(() => addBot(q.reply(clientName), q.chips), 350);
        return;
      }
    }

    // ── Filtro directo por categoría desde chips ──────────
    const catMap = [
      { regex: /bolso|cartera/i,              cat: null, key: /BOLSO|CARTERA/i },
      { regex: /morral|mochila/i,             cat: null, key: /MORRAL|MOCHILA/i },
      { regex: /maquillaje|labial|cosm/i,     cat: null, key: /MAQUILLAJE|COSM/i },
      { regex: /capilar|cabello|shampoo/i,    cat: null, key: /CAPILAR|CABELLO/i },
      { regex: /billetera|monedero|wallet/i,  cat: null, key: /BILLETERA|WALLET/i },
      { regex: /cuidado personal|crema|cuidado/i, cat: null, key: /CUIDADO|CREMA|PERSONAL/i },
      { regex: /accesorio|aretes|collar|joya/i, cat: null, key: /ACCESORIO|ARETE|COLLAR|JOYA/i },
    ];
    for (const { regex, key } of catMap) {
      if (regex.test(tl)) {
        const prods = allProds.filter(p => key.test(p.category || "") && Number(p.stock) > 0).slice(0, 6);
        if (prods.length > 0) {
          const label = prods[0].category
            ? prods[0].category.charAt(0).toUpperCase() + prods[0].category.slice(1).toLowerCase()
            : "productos";
          setTimeout(() => addBot(
            `Aquí tienes lo mejor en <strong>${label}</strong>${clientName ? ", <strong>" + clientName + "</strong>" : ""} 💜`,
            ["¿Hay ofertas? 🏷️","Ver otra categoría 🛍️","¿Cuánto es el envío? 🚚","Lo más vendido ⭐"],
            prods
          ), 350);
          return;
        }
        // Si no hay stock en esa categoría
        setTimeout(() => addBot(
          `Ahorita no tenemos productos de esa categoría disponibles, pero están llegando muy pronto 💜<br>¿Te muestro algo más?`,
          ["Bolso o cartera 👜","Morral o mochila 🎒","Maquillaje 💄","Capilar ✨","Billeteras 💳","Cuidado personal 🧴"]
        ), 350);
        return;
      }
    }

    await callIsabel(t, clientName, aiHist);
  }, [input, waitName, clientName, aiHist, addUser, addBot, callIsabel, onOpenCart, allProds]);

  // ── Borrar historial ─────────────────────────────────────
  const clearHistory = () => {
    setAiHist([]);
    lsSet("kb_aihist", []);
    lsSet("kb_name", "");
    lsSet("kb_msgs", []);
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

  // ── Cargar sesión archivada ──────────────────────────────
  const loadSession = (session) => {
    setMsgs(session.msgs || []);
    setAiHist(session.aiHist || []);
    setClientName(session.name || "");
    lsSet("kb_msgs", session.msgs || []);
    lsSet("kb_aihist", session.aiHist || []);
    lsSet("kb_name", session.name || "");
    setShowSessions(false);
    setChips([]);
    setTimeout(() => addBot(
      `¡Bienvenida de nuevo, <strong>${session.name}</strong>! 💜 Retomé tu conversación del ${session.date} ✨`,
      ["Ver lo más vendido ⭐","¿Qué hay de nuevo? ✨","Seguir comprando 🛍️"]
    ), 300);
  };

  // ── Borrar sesión archivada ──────────────────────────────
  const deleteSession = (id) => {
    const sessions = lsGet(SESSIONS_KEY, []).filter(s => s.id !== id);
    lsSet(SESSIONS_KEY, sessions);
    showToast("Sesión eliminada");
    // Forzar re-render
    setShowSessions(false);
    setTimeout(() => setShowSessions(true), 50);
  };

  // ── Guardar nuevo nombre ─────────────────────────────────
  const saveEditedName = () => {
    const n = nameInput.trim();
    if (!n) return;
    const name = n.charAt(0).toUpperCase() + n.slice(1).toLowerCase();
    setClientName(name);
    lsSet("kb_name", name);
    setEditingName(false);
    setNameInput("");
    showToast(`✓ Nombre actualizado a ${name}`);
    addBot(`¡Listo! Ahora te llamo <strong>${name}</strong> 💜`, []);
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
      <button className={`kb-fab${open ? " kb-fab-hidden" : ""}`} onClick={() => setOpen(o => !o)} aria-label="Chat con Isabel">
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

          {/* ── Panel sesiones archivadas ── */}
          {showSessions && (
            <div className="kb-sessions-overlay">
              <div className="kb-hist-box">
                <div className="kb-hist-hd">
                  <div className="kb-hist-title"><span>🗂️</span> Conversaciones guardadas</div>
                  <button className="kb-close" style={{ background:"rgba(76,29,149,.1)", border:"1px solid #EDE9FE", color:"#4C1D95" }} onClick={() => setShowSessions(false)}>✕</button>
                </div>
                <div className="kb-hist-body">
                  {(() => {
                    const sessions = lsGet(SESSIONS_KEY, []);
                    return sessions.length === 0
                      ? <div className="kb-hist-empty">📭 No hay conversaciones archivadas.<br/>Cada vez que cierres el chat, se guardará aquí.</div>
                      : sessions.map(s => (
                          <div key={s.id} className="kb-session-item">
                            <div className="kb-session-date">📅 {s.date} · {s.name}</div>
                            <div className="kb-session-preview">"{s.preview}"</div>
                            <div className="kb-session-count">💬 {s.msgCount} mensajes</div>
                            <div className="kb-session-actions">
                              <button className="kb-session-btn load" onClick={() => loadSession(s)}>↩️ Retomar</button>
                              <button className="kb-session-btn del" onClick={() => deleteSession(s.id)}>🗑️ Borrar</button>
                            </div>
                          </div>
                        ));
                  })()}
                </div>
                <div className="kb-hist-footer">
                  <button className="kb-hist-btn secondary" onClick={() => setShowSessions(false)}>Cerrar</button>
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
                {clientName
                  ? <span style={{cursor:"pointer"}} onClick={() => { setEditingName(e=>!e); setNameInput(clientName); }} title="Editar nombre">
                      {clientName} ✏️
                    </span>
                  : "Isabel está en línea"
                }
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
              <button className="kb-hbtn" onClick={() => setShowSessions(true)} title="Conversaciones guardadas">🗂️</button>
              <button className="kb-hbtn" onClick={() => setShowHist(true)}>📋</button>
              <button className="kb-close" onClick={() => setOpen(false)}>✕</button>
            </div>
          </div>

          {/* ── Editar nombre ── */}
          {editingName && (
            <div className="kb-edit-name">
              <input
                autoFocus
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => e.key==="Enter" && saveEditedName()}
                placeholder="Tu nombre..."
              />
              <button onClick={saveEditedName}>Guardar</button>
              <button onClick={() => setEditingName(false)} style={{background:"#F3EEFF",color:"#4C1D95",border:"1.5px solid #EDE9FE",borderRadius:10,padding:"6px 11px",cursor:"pointer",fontSize:12,fontWeight:700}}>✕</button>
            </div>
          )}

          {/* ── Categorías ── */}
          <div className="kb-cats">
            <button className="kb-cat on" onClick={e => filterCat("_all", e.currentTarget)}>✨ Todo</button>
            {cats.map(cat => (
              <button key={cat} className="kb-cat" onClick={e => filterCat(cat, e.currentTarget)}>
                {catEmoji(cat)} {cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase()}
              </button>
            ))}
            {/* Accesorios - próximamente */}
            {!cats.includes("ACCESORIOS") && (
              <button className="kb-cat" onClick={e => filterCat("ACCESORIOS", e.currentTarget)}
                style={{opacity:.7,position:"relative"}}>
                💍 Accesorios
                <span style={{
                  position:"absolute",top:-7,right:-4,
                  background:"linear-gradient(135deg,#C026D3,#7C3AED)",
                  color:"#fff",fontSize:"7px",fontWeight:800,
                  padding:"1px 5px",borderRadius:"8px",letterSpacing:".3px",
                  whiteSpace:"nowrap"
                }}>Pronto</span>
              </button>
            )}
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
                {m.shipping && (
                  <div style={{marginTop:8,display:"flex",flexDirection:"column",gap:8,maxWidth:340}}>
                    {SHIPPING_METHODS.map(method => (
                      <ShippingCard
                        key={method.id}
                        method={method}
                        onSelect={handleSelectShipping}
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
