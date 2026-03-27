// ============================================================
//  AIChatBot.jsx — Isabel, asesora IA de Kosmica  v6.0 DEFINITIVO
//  ✅ Regex IDs: acepta con y sin corchetes
//  ✅ Imágenes: carga progresiva + spinner + fallback emoji
//  ✅ Categorías: barra propia, scroll horizontal, nunca recortada
//  ✅ Panel lateral productos: fotos grandes, CTA destacado
//  ✅ Historial API: mapeo correcto bot→assistant
//  ✅ Toast de nuevos productos
//  ✅ Responsive móvil
// ============================================================
import { useState, useEffect, useRef, useCallback } from "react";

// ─────────────────────────────────────────────────────────────
// ESTILOS
// ─────────────────────────────────────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .kb-fab {
    position: fixed; bottom: 28px; right: 28px;
    width: 64px; height: 64px; border-radius: 50%;
    background: linear-gradient(135deg,#9B72CF,#6B3FA0);
    border: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    font-size: 27px;
    box-shadow: 0 8px 32px rgba(107,63,160,.55);
    z-index: 10000; transition: transform .2s, box-shadow .2s;
  }
  .kb-fab:hover { transform: scale(1.12); box-shadow: 0 14px 44px rgba(107,63,160,.7); }
  .kb-fab-badge {
    position: absolute; top: -4px; right: -4px;
    width: 22px; height: 22px;
    background: #FF4D6D; border-radius: 50%;
    border: 2.5px solid #fff;
    font-size: 10px; font-weight: 700; color: #fff;
    display: flex; align-items: center; justify-content: center;
    font-family: 'DM Sans', sans-serif;
  }

  .kb-overlay {
    position: fixed; inset: 0;
    background: rgba(18,8,40,.52);
    backdrop-filter: blur(7px);
    z-index: 9998; animation: kbFade .22s ease;
  }
  @keyframes kbFade { from{opacity:0} to{opacity:1} }

  .kb-panel {
    position: fixed; bottom: 0; right: 0;
    width: 870px; height: 92vh;
    max-width: 100vw; max-height: 100vh;
    background: #fff;
    border-radius: 22px 22px 0 0;
    display: grid;
    grid-template-columns: 1fr 315px;
    grid-template-rows: auto auto 1fr auto;
    overflow: hidden;
    z-index: 9999;
    box-shadow: -6px 0 80px rgba(0,0,0,.26);
    animation: kbUp .32s cubic-bezier(.34,1.2,.64,1);
    font-family: 'DM Sans', sans-serif;
  }
  @keyframes kbUp {
    from { transform: translateY(50px); opacity:0; }
    to   { transform: translateY(0);    opacity:1; }
  }
  @media (max-width: 880px) {
    .kb-panel {
      width: 100vw; border-radius: 18px 18px 0 0;
      grid-template-columns: 1fr;
      grid-template-rows: auto auto 1fr auto;
    }
    .kb-prod-panel { display: none !important; }
  }

  /* HEADER */
  .kb-header {
    grid-column: 1 / -1;
    background: linear-gradient(135deg,#9B72CF 0%,#6B3FA0 100%);
    padding: 14px 20px;
    display: flex; align-items: center; gap: 13px;
    flex-shrink: 0; position: relative; overflow: hidden;
  }
  .kb-header::before {
    content: '';
    position: absolute; top: -40px; right: -40px;
    width: 160px; height: 160px; border-radius: 50%;
    background: rgba(255,255,255,.06); pointer-events: none;
  }
  .kb-av-wrap { position: relative; flex-shrink: 0; z-index: 1; }
  .kb-av {
    width: 48px; height: 48px; border-radius: 50%;
    background: rgba(255,255,255,.18);
    border: 2.5px solid rgba(255,255,255,.38);
    display: flex; align-items: center; justify-content: center;
    font-size: 22px;
    box-shadow: 0 0 0 5px rgba(255,255,255,.08);
  }
  .kb-online-dot {
    position: absolute; bottom: 2px; right: 2px;
    width: 12px; height: 12px;
    background: #4DFFA0; border-radius: 50%;
    border: 2.5px solid #7850B8;
    animation: kbPulse 2.2s infinite;
  }
  @keyframes kbPulse {
    0%,100%{ box-shadow: 0 0 0 0 rgba(77,255,160,.45); }
    50%    { box-shadow: 0 0 0 6px rgba(77,255,160,0); }
  }
  .kb-hinfo { flex: 1; min-width: 0; z-index: 1; }
  .kb-hname {
    font-family: 'Playfair Display', serif;
    font-size: 1.02rem; font-weight: 700; color: #fff;
    white-space: nowrap; line-height: 1.2;
  }
  .kb-hsub {
    font-size: .72rem; color: rgba(255,255,255,.85);
    display: flex; align-items: center; gap: 5px;
    margin-top: 3px; font-weight: 500;
  }
  .kb-hsub-dot { width: 6px; height: 6px; background: #4DFFA0; border-radius: 50%; }
  .kb-close {
    width: 34px; height: 34px; flex-shrink: 0; z-index: 1;
    background: rgba(255,255,255,.14);
    border: 1.5px solid rgba(255,255,255,.28);
    border-radius: 50%; color: #fff; font-size: 14px;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    transition: background .15s, transform .2s;
  }
  .kb-close:hover { background: rgba(255,255,255,.28); transform: rotate(90deg); }

  /* BARRA CATEGORÍAS — fila independiente */
  .kb-cats-bar {
    grid-column: 1 / -1;
    background: linear-gradient(135deg,#7E56BB,#5B34A0);
    padding: 9px 18px;
    display: flex; align-items: center; gap: 7px;
    overflow-x: auto; scrollbar-width: none;
    flex-shrink: 0;
    border-bottom: 1px solid rgba(0,0,0,.08);
  }
  .kb-cats-bar::-webkit-scrollbar { display: none; }
  .kb-cat-btn {
    flex-shrink: 0; padding: 6px 15px; border-radius: 22px;
    background: rgba(255,255,255,.13);
    border: 1.5px solid rgba(255,255,255,.26);
    color: #fff; font-size: .73rem; font-weight: 600;
    cursor: pointer; white-space: nowrap;
    transition: all .16s; font-family: 'DM Sans', sans-serif;
    letter-spacing: .01em;
  }
  .kb-cat-btn:hover, .kb-cat-btn.active {
    background: rgba(255,255,255,.28);
    border-color: rgba(255,255,255,.7);
    transform: translateY(-1px);
  }
  .kb-cat-btn:disabled { opacity: .4; cursor: default; transform: none; }

  /* CHAT */
  .kb-chat {
    display: flex; flex-direction: column;
    background: #F8F5FE; overflow: hidden;
    border-right: 1px solid #EDE8F5;
    position: relative;
  }
  .kb-msgs {
    flex: 1; overflow-y: auto;
    padding: 18px 15px 10px;
    display: flex; flex-direction: column; gap: 13px;
    scrollbar-width: thin; scrollbar-color: #D8C8F0 transparent;
  }
  .kb-msgs::-webkit-scrollbar { width: 4px; }
  .kb-msgs::-webkit-scrollbar-thumb { background: #D8C8F0; border-radius: 4px; }

  .kb-msg { display: flex; gap: 8px; align-items: flex-end; }
  .kb-msg.user { flex-direction: row-reverse; }
  .kb-msgav {
    width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center; font-size: 14px;
  }
  .kb-msg.bot  .kb-msgav { background: linear-gradient(135deg,#9B72CF,#6B3FA0); box-shadow: 0 3px 10px rgba(107,63,160,.3); }
  .kb-msg.user .kb-msgav { background: #E5DDF5; }
  .kb-bbl {
    padding: 11px 15px; border-radius: 18px;
    font-size: .875rem; line-height: 1.6;
    max-width: 290px; word-break: break-word; white-space: pre-line;
    font-family: 'DM Sans', sans-serif;
  }
  .kb-msg.bot  .kb-bbl {
    background: #fff; color: #2D1B4E;
    border-bottom-left-radius: 4px;
    box-shadow: 0 2px 10px rgba(0,0,0,.07);
    border: 1px solid #EDE8F5;
  }
  .kb-msg.user .kb-bbl {
    background: linear-gradient(135deg,#9B72CF,#6B3FA0);
    color: #fff; border-bottom-right-radius: 4px;
    box-shadow: 0 4px 16px rgba(107,63,160,.35);
  }
  .kb-typing { display: flex; gap: 5px; align-items: center; padding: 3px 0; }
  .kb-typing span {
    width: 7px; height: 7px; background: #9B72CF;
    border-radius: 50%; animation: kbDot 1.3s infinite;
  }
  .kb-typing span:nth-child(2) { animation-delay: .22s; }
  .kb-typing span:nth-child(3) { animation-delay: .44s; }
  @keyframes kbDot {
    0%,60%,100% { transform: translateY(0); opacity:.3; }
    30%          { transform: translateY(-8px); opacity:1; }
  }
  .kb-sugs {
    display: flex; flex-wrap: wrap; gap: 7px;
    padding: 5px 0 0; margin-left: 40px;
  }
  .kb-sug {
    background: #fff; border: 1.5px solid #D4B8F0;
    color: #6B3FA0; border-radius: 22px;
    padding: 7px 14px; font-size: .76rem; font-weight: 600;
    cursor: pointer; transition: all .18s; white-space: nowrap;
    font-family: 'DM Sans', sans-serif;
    box-shadow: 0 2px 8px rgba(107,63,160,.08);
  }
  .kb-sug:hover {
    background: linear-gradient(135deg,#9B72CF,#6B3FA0);
    color: #fff; border-color: transparent;
    transform: translateY(-2px); box-shadow: 0 5px 16px rgba(107,63,160,.32);
  }
  .kb-input-row {
    padding: 12px 14px; border-top: 1px solid #EDE8F5;
    display: flex; gap: 9px; align-items: center; background: #fff;
  }
  .kb-input {
    flex: 1; border: 1.5px solid #E0D4F0; border-radius: 24px;
    padding: 11px 18px; font-size: .875rem; color: #2D1B4E;
    outline: none; background: #F9F6FF;
    transition: border-color .2s, box-shadow .2s;
    font-family: 'DM Sans', sans-serif;
  }
  .kb-input:focus { border-color: #9B72CF; box-shadow: 0 0 0 3px rgba(155,114,207,.15); }
  .kb-input::placeholder { color: #C4B5D4; }
  .kb-send {
    width: 44px; height: 44px; flex-shrink: 0;
    background: linear-gradient(135deg,#9B72CF,#6B3FA0);
    border: none; border-radius: 50%; color: #fff; font-size: 18px;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    transition: transform .15s, box-shadow .15s;
    box-shadow: 0 4px 16px rgba(107,63,160,.45);
  }
  .kb-send:hover:not(:disabled) { transform: scale(1.11); box-shadow: 0 7px 22px rgba(107,63,160,.55); }
  .kb-send:disabled { opacity: .32; cursor: default; box-shadow: none; }

  /* PANEL PRODUCTOS */
  .kb-prod-panel {
    background: #fff; display: flex; flex-direction: column;
    overflow: hidden; border-left: 1px solid #EDE8F5;
  }
  .kb-prod-hdr {
    padding: 15px 16px 13px;
    border-bottom: 1px solid #EDE8F5;
    display: flex; align-items: center; justify-content: space-between;
    flex-shrink: 0; background: #FDFBFF;
  }
  .kb-prod-hdr-ttl {
    font-family: 'Playfair Display', serif;
    font-size: .93rem; font-weight: 700; color: #2D1B4E;
  }
  .kb-prod-cnt {
    font-size: .69rem; font-weight: 800; color: #fff;
    background: linear-gradient(135deg,#9B72CF,#6B3FA0);
    padding: 3px 11px; border-radius: 12px; letter-spacing: .03em;
  }
  .kb-prod-scroll {
    flex: 1; overflow-y: auto; padding: 13px 12px;
    display: flex; flex-direction: column; gap: 13px;
    scrollbar-width: thin; scrollbar-color: #E0D4F0 transparent;
  }
  .kb-prod-scroll::-webkit-scrollbar { width: 3px; }
  .kb-prod-scroll::-webkit-scrollbar-thumb { background: #E0D4F0; border-radius: 3px; }

  /* Tarjeta */
  .kb-pcard {
    border-radius: 14px; overflow: hidden;
    border: 1.5px solid #EDE8F5; background: #fff;
    cursor: pointer; transition: transform .22s, box-shadow .22s, border-color .22s;
    position: relative;
  }
  .kb-pcard:hover {
    transform: translateY(-5px);
    box-shadow: 0 14px 36px rgba(107,63,160,.2);
    border-color: #9B72CF;
  }
  .kb-pbadge {
    position: absolute; top: 9px; left: 9px;
    font-size: .58rem; font-weight: 800; letter-spacing: .08em;
    padding: 4px 10px; border-radius: 10px; text-transform: uppercase; z-index: 3;
    font-family: 'DM Sans', sans-serif;
  }
  .kb-pbadge.oferta { background: #FF4D6D; color: #fff; box-shadow: 0 3px 10px rgba(255,77,109,.4); }
  .kb-pbadge.nuevo  { background: #6B3FA0; color: #fff; box-shadow: 0 3px 10px rgba(107,63,160,.4); }

  /* IMAGEN — fix definitivo */
  .kb-pimg-wrap {
    width: 100%; height: 168px; position: relative; overflow: hidden;
    background: linear-gradient(135deg,#F0EAF8,#E8D8F8);
    display: flex; align-items: center; justify-content: center;
  }
  .kb-pimg-real {
    position: absolute; inset: 0; width: 100%; height: 100%;
    object-fit: cover; opacity: 0; transition: opacity .4s ease; display: block;
  }
  .kb-pimg-real.vis { opacity: 1; }
  .kb-pimg-spinner {
    width: 30px; height: 30px; border-radius: 50%;
    border: 3px solid #E0D4F0; border-top-color: #9B72CF;
    animation: kbSpin .85s linear infinite; position: absolute;
  }
  .kb-pimg-spinner.hide { display: none; }
  @keyframes kbSpin { to { transform: rotate(360deg); } }
  .kb-pimg-emoji { font-size: 46px; position: absolute; opacity: 0; transition: opacity .3s; }
  .kb-pimg-emoji.vis { opacity: 1; }

  .kb-pbody { padding: 11px 13px 13px; }
  .kb-pname {
    font-size: .83rem; font-weight: 700; color: #2D1B4E;
    line-height: 1.35; margin-bottom: 5px;
    display: -webkit-box; -webkit-line-clamp: 2;
    -webkit-box-orient: vertical; overflow: hidden;
  }
  .kb-pdesc {
    font-size: .71rem; color: #7A6899; line-height: 1.45; margin-bottom: 9px;
    display: -webkit-box; -webkit-line-clamp: 2;
    -webkit-box-orient: vertical; overflow: hidden;
  }
  .kb-pmeta { display: flex; align-items: center; justify-content: space-between; gap: 4px; margin-bottom: 10px; }
  .kb-pprice { font-size: .92rem; font-weight: 800; color: #6B3FA0; }
  .kb-pstars { display: flex; gap: 2px; align-items: center; }
  .kb-pstar  { font-size: 12px; }
  .kb-pstar.on  { color: #FBBF24; }
  .kb-pstar.off { color: #E5DDF5; }
  .kb-prating { font-size: .67rem; color: #A89BC0; margin-left: 2px; }
  .kb-pver {
    display: block; width: 100%; padding: 9px 0;
    background: linear-gradient(135deg,#9B72CF,#6B3FA0);
    border: none; border-radius: 10px;
    font-size: .76rem; font-weight: 700; color: #fff;
    text-align: center; cursor: pointer;
    transition: opacity .15s, transform .15s, box-shadow .15s;
    letter-spacing: .04em; font-family: 'DM Sans', sans-serif;
    box-shadow: 0 4px 14px rgba(107,63,160,.35);
  }
  .kb-pver:hover { opacity: .88; transform: translateY(-1px); box-shadow: 0 8px 22px rgba(107,63,160,.45); }

  .kb-pempty {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 14px; padding: 32px 24px; text-align: center;
  }
  .kb-pempty-icon { font-size: 42px; opacity: .18; }
  .kb-pempty-txt { font-size: .82rem; color: #B8A8D4; line-height: 1.7; }

  /* Toast */
  .kb-toast {
    position: absolute; top: 12px; left: 50%; transform: translateX(-50%);
    background: linear-gradient(135deg,#9B72CF,#6B3FA0);
    color: #fff; padding: 7px 20px; border-radius: 22px;
    font-size: .73rem; font-weight: 700; white-space: nowrap;
    box-shadow: 0 6px 22px rgba(107,63,160,.45);
    animation: kbToast .35s ease; z-index: 20; pointer-events: none;
    font-family: 'DM Sans', sans-serif;
  }
  @keyframes kbToast {
    from { opacity:0; transform: translateX(-50%) translateY(-10px); }
    to   { opacity:1; transform: translateX(-50%) translateY(0); }
  }
`;

// ─────────────────────────────────────────────────────────────
// DATOS
// ─────────────────────────────────────────────────────────────
const CATEGORIAS = [
  { label: "👜 Bolsos",       query: "Muéstrame los bolsos disponibles" },
  { label: "💄 Maquillaje",   query: "¿Qué maquillaje tienen?" },
  { label: "✨ Capilar",      query: "Productos para el cabello" },
  { label: "💍 Accesorios",   query: "Muéstrame los accesorios" },
  { label: "💳 Billeteras",   query: "Quiero ver las billeteras" },
  { label: "🏷️ Ofertas",     query: "¿Qué está en oferta hoy?" },
  { label: "🆕 Novedades",    query: "¿Qué hay de nuevo?" },
  { label: "⭐ Más vendidos", query: "¿Cuáles son los más vendidos?" },
];

const SUGGESTIONS = [
  "¿Qué bolso está de moda? 👜",
  "Busco regalo para mi mamá 🎁",
  "Los más vendidos ⭐",
  "Algo para el cabello ✨",
  "¿Qué hay en oferta? 💜",
  "Sorpréndeme ✨",
];

// ─────────────────────────────────────────────────────────────
// SYSTEM PROMPT
// ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = (products) => `Eres ISABEL, la asesora personal de belleza de Kosmica — tienda colombiana de belleza y accesorios premium. Eres la amiga fashion más sofisticada y cálida de cada clienta. Conoces el catálogo de memoria, tienes criterio estético impecable y el don natural de hacer sentir especial y bella a quien te escribe.

═══════════════════════════════════════
PERSONALIDAD Y VOZ
═══════════════════════════════════════
- Cálida, elegante, motivadora — NUNCA robótica, NUNCA genérica
- Tuteo siempre. "amiga", "hermosa", "mi amor", "reina" con naturalidad colombiana
- NUNCA empieces con "¡Claro!", "¡Por supuesto!", "¡Entendido!" — ve directo al valor
- Máximo 2 emojis por mensaje, bien ubicados
- Respuestas cortas con gancho: 2-3 líneas antes de recomendar

═══════════════════════════════════════
MOTIVAR A COMPRAR (sin presionar jamás)
═══════════════════════════════════════
- Describe detalles sensoriales: textura, acabado, cómo se ve puesto, cómo combina
- Conecta el producto con una emoción o momento: "perfecto para esa noche especial"
- Badge OFERTA → urgencia suave: "las ofertas vuelan, amiga"
- Stock limitado → menciónalo con naturalidad: "es muy pedido, quedan pocas"
- Cierra siempre con pregunta o CTA suave: "¿Te lo muestro en detalle?" o "¿Lo llevamos?"

═══════════════════════════════════════
CATÁLOGO DISPONIBLE (solo stock > 0)
═══════════════════════════════════════
${JSON.stringify(
  products.filter(p => p.stock > 0).map(p => ({
    id: p.id, nombre: p.name, descripcion: p.description,
    precio: p.price, categoria: p.category,
    rating: p.rating, stock: p.stock, badge: p.badge,
  })), null, 2
)}

Categorías: Bolsos y Morrales, Maquillaje, Capilar, Accesorios, Billeteras.

═══════════════════════════════════════
CÓMO RECOMENDAR
═══════════════════════════════════════
- Antes de recomendar entiende: ¿para ella o regalo? ¿ocasión? ¿estilo? ¿presupuesto?
- Si falta info clave, haz UNA sola pregunta (no interrogatorio)
- Explica en 1-2 frases POR QUÉ ese producto es perfecto para ELLA
- Badge OFERTA → urgencia. Badge NUEVO → exclusividad
- Máximo 3 productos por recomendación
- NUNCA stock 0. Precios en COP

═══════════════════════════════════════
SITUACIONES ESPECIALES
═══════════════════════════════════════
REGALO → pregunta presupuesto y destinataria ANTES de recomendar
PRESUPUESTO LIMITADO → honesta, resalta el valor de lo que hay
DUDA ENTRE DOS → ayúdala a decidir por estilo/ocasión
AGOTADO → ofrece la alternativa más similar con entusiasmo
QUEJA → empatía total primero, luego orienta a Kosmica
SOLO EXPLORANDO → genera curiosidad con pregunta sobre su estilo

═══════════════════════════════════════
LÍMITES
═══════════════════════════════════════
- Solo productos Kosmica y temas belleza/moda
- Nunca inventes datos — usa SOLO el catálogo
- Nunca hagas sentir mal a la clienta

═══════════════════════════════════════
⚠️ FORMATO OBLIGATORIO
═══════════════════════════════════════
Cuando recomiendes productos, al FINAL del mensaje escribe EXACTAMENTE:
PRODUCTOS_RECOMENDADOS:id1,id2,id3

CORRECTO:   PRODUCTOS_RECOMENDADOS:15,73,42
INCORRECTO: PRODUCTOS_RECOMENDADOS:[15,73,42]

Si no recomiendas productos, NO incluyas esa línea.`;

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
const formatPrice = (p) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(p);

const catEmoji = (cat = "") => {
  const c = cat.toUpperCase();
  if (c.includes("BOLSO") || c.includes("MORRAL")) return "👜";
  if (c.includes("MAQUILLAJE")) return "💄";
  if (c.includes("CAPILAR"))    return "✨";
  if (c.includes("ACCESORIO"))  return "💍";
  if (c.includes("BILLETERA"))  return "💳";
  return "🛍️";
};

const Stars = ({ rating = 0 }) => (
  <div className="kb-pstars">
    {[1,2,3,4,5].map(i => (
      <span key={i} className={`kb-pstar ${i <= Math.round(rating) ? "on" : "off"}`}>★</span>
    ))}
    {rating > 0 && <span className="kb-prating">{Number(rating).toFixed(1)}</span>}
  </div>
);

/* Imagen con carga progresiva, spinner y fallback emoji */
const ProductImage = ({ src, alt, emoji }) => {
  const [state, setState] = useState("loading"); // loading | ok | err
  useEffect(() => {
    if (!src) { setState("err"); return; }
    setState("loading");
    const img = new window.Image();
    img.onload  = () => setState("ok");
    img.onerror = () => setState("err");
    img.src = src;
    return () => { img.onload = null; img.onerror = null; };
  }, [src]);
  return (
    <div className="kb-pimg-wrap">
      <div className={`kb-pimg-spinner${state !== "loading" ? " hide" : ""}`} />
      {src && <img src={src} alt={alt} className={`kb-pimg-real${state === "ok" ? " vis" : ""}`} />}
      <span className={`kb-pimg-emoji${state === "err" ? " vis" : ""}`}>{emoji}</span>
    </div>
  );
};

/* Extracción de IDs — acepta con y sin corchetes */
const extractIds = (text) => {
  const m = text.match(/PRODUCTOS_RECOMENDADOS:\[?([\d,\s]+)\]?/);
  if (!m) return [];
  return m[1].split(",").map(s => parseInt(s.trim(), 10)).filter(n => Number.isFinite(n) && n > 0);
};
const cleanText = (text) => text.replace(/PRODUCTOS_RECOMENDADOS:\[?[\d,\s]+\]?/g, "").trim();

// ─────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────
export default function AIChatBot({ products = [], onProductClick }) {
  const [open, setOpen]               = useState(false);
  const [messages, setMessages]       = useState([{
    role: "bot",
    content: "Hola hermosa, soy Isabel ✨\nTu asesora personal de Kosmica. ¿Estás buscando algo para ti o es un regalo especial?",
    products: [],
  }]);
  const [shownProducts, setShownProducts] = useState([]);
  const [input, setInput]             = useState("");
  const [loading, setLoading]         = useState(false);
  const [unread, setUnread]           = useState(1);
  const [activeCat, setActiveCat]     = useState(null);
  const [toast, setToast]             = useState("");
  const bottomRef                     = useRef(null);
  const inputRef                      = useRef(null);

  useEffect(() => {
    if (open) { setUnread(0); setTimeout(() => inputRef.current?.focus(), 150); }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const fireToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3200);
  }, []);

  const byIds = useCallback((ids) =>
    ids.map(id => products.find(p => p.id === id)).filter(Boolean),
  [products]);

  const sendMessage = useCallback(async (overrideText) => {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;
    setInput("");

    const userMsg = { role: "user", content: text };
    const history = [...messages, userMsg];
    setMessages(history);
    setLoading(true);

    /* Historial para la API: bot → assistant */
    const apiMessages = history
      .filter(m => m.role === "user" || m.role === "bot")
      .map(m => ({ role: m.role === "bot" ? "assistant" : "user", content: m.content }));

    try {
      const base = process.env.REACT_APP_API_URL || "https://kosmica-backend.onrender.com";
      const resp = await fetch(`${base}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: SYSTEM_PROMPT(products),
          messages: apiMessages,
        }),
      });

      const data = await resp.json();

      if (!resp.ok || data.error) {
        const errMsg = data.error || `Error ${resp.status}`;
        setMessages(prev => [...prev, {
          role: "bot",
          content: `Amiga, tuve un pequeño problema de conexión (${errMsg}). ¿Lo intentamos de nuevo? 🔄`,
          products: [],
        }]);
        return;
      }

      const raw     = data.content?.[0]?.text ?? "Lo siento hermosa, no pude procesar tu mensaje. ¿Intentamos de nuevo?";
      const ids     = extractIds(raw);
      const cleaned = cleanText(raw);
      const prods   = byIds(ids);

      setMessages(prev => [...prev, { role: "bot", content: cleaned, products: prods }]);

      if (prods.length > 0) {
        setShownProducts(prods);
        fireToast(`✨ ${prods.length} producto${prods.length > 1 ? "s" : ""} recomendado${prods.length > 1 ? "s" : ""}`);
      }

      if (!open) setUnread(u => u + 1);
    } catch (err) {
      console.error("Error chat Kosmica:", err);
      setMessages(prev => [...prev, {
        role: "bot",
        content: "No pude conectarme ahora. Verifica tu conexión e intenta de nuevo. 🔄",
        products: [],
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, products, open, byIds, fireToast]);

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleCat = (cat) => { setActiveCat(cat.label); sendMessage(cat.query); };

  return (
    <>
      <style>{STYLES}</style>

      <button className="kb-fab" onClick={() => setOpen(o => !o)} title="Habla con Isabel">
        {open ? "✕" : "✨"}
        {!open && unread > 0 && <span className="kb-fab-badge">{unread}</span>}
      </button>

      {open && (
        <>
          <div className="kb-overlay" onClick={() => setOpen(false)} />

          <div className="kb-panel">

            {/* HEADER */}
            <div className="kb-header">
              <div className="kb-av-wrap">
                <div className="kb-av">✨</div>
                <span className="kb-online-dot" />
              </div>
              <div className="kb-hinfo">
                <div className="kb-hname">Isabel · Asesora de Kosmica</div>
                <div className="kb-hsub">
                  <span className="kb-hsub-dot" />
                  En línea y lista para ayudarte 💜
                </div>
              </div>
              <button className="kb-close" onClick={() => setOpen(false)}>✕</button>
            </div>

            {/* CATEGORÍAS — fila propia, nunca recortada */}
            <div className="kb-cats-bar">
              {CATEGORIAS.map(c => (
                <button
                  key={c.label}
                  className={`kb-cat-btn${activeCat === c.label ? " active" : ""}`}
                  onClick={() => handleCat(c)}
                  disabled={loading}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* CHAT */}
            <div className="kb-chat">
              {toast && <div className="kb-toast">{toast}</div>}

              <div className="kb-msgs">
                {messages.map((msg, i) => (
                  <div key={i}>
                    <div className={`kb-msg ${msg.role}`}>
                      <div className="kb-msgav">{msg.role === "bot" ? "✨" : "👤"}</div>
                      <div className="kb-bbl">{msg.content}</div>
                    </div>
                    {i === 0 && messages.length === 1 && (
                      <div className="kb-sugs">
                        {SUGGESTIONS.map(s => (
                          <button key={s} className="kb-sug" onClick={() => sendMessage(s)}>{s}</button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {loading && (
                  <div className="kb-msg bot">
                    <div className="kb-msgav">✨</div>
                    <div className="kb-bbl">
                      <div className="kb-typing"><span/><span/><span/></div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              <div className="kb-input-row">
                <input
                  ref={inputRef}
                  className="kb-input"
                  placeholder="Cuéntame qué estás buscando..."
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  disabled={loading}
                />
                <button
                  className="kb-send"
                  onClick={() => sendMessage()}
                  disabled={loading || !input.trim()}
                >➤</button>
              </div>
            </div>

            {/* PANEL LATERAL PRODUCTOS */}
            <div className="kb-prod-panel">
              <div className="kb-prod-hdr">
                <span className="kb-prod-hdr-ttl">Productos recomendados</span>
                {shownProducts.length > 0 && (
                  <span className="kb-prod-cnt">{shownProducts.length}</span>
                )}
              </div>

              {shownProducts.length === 0 ? (
                <div className="kb-pempty">
                  <div className="kb-pempty-icon">✨</div>
                  <div className="kb-pempty-txt">
                    Cuéntale a Isabel qué necesitas y aquí verás las recomendaciones con fotos, descripción y precio.
                  </div>
                </div>
              ) : (
                <div className="kb-prod-scroll">
                  {shownProducts.map(prod => (
                    <div
                      key={prod.id}
                      className="kb-pcard"
                      onClick={() => { onProductClick?.(prod); setOpen(false); }}
                    >
                      {prod.badge && (
                        <span className={`kb-pbadge ${prod.badge.toLowerCase()}`}>{prod.badge}</span>
                      )}
                      <ProductImage
                        src={prod.imageUrl}
                        alt={prod.name}
                        emoji={catEmoji(prod.category)}
                      />
                      <div className="kb-pbody">
                        <div className="kb-pname">{prod.name}</div>
                        {prod.description && <div className="kb-pdesc">{prod.description}</div>}
                        <div className="kb-pmeta">
                          <span className="kb-pprice">{formatPrice(prod.price)}</span>
                          <Stars rating={prod.rating} />
                        </div>
                        <button
                          className="kb-pver"
                          onClick={e => { e.stopPropagation(); onProductClick?.(prod); setOpen(false); }}
                        >
                          Ver en la tienda →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </>
      )}
    </>
  );
}
