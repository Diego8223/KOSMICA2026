// ═══════════════════════════════════════════════════════════
//  AIChatBot.jsx — Isabel, Asesora IA de Kosmica  v8.0 PRO
//  ─────────────────────────────────────────────────────────
//  ✅ Quick Intents locales (< 5ms, sin llamada al servidor)
//  ✅ Productos enviados al microservicio IA (no a Java)
//  ✅ Historial limitado a 6 mensajes
//  ✅ Sistema de ventas con CTA y cierre automático
//  ✅ Botón "Al carrito" directo en tarjetas
//  ✅ Spinner de carga mientras llegan los productos
//  ✅ Error handling robusto con reintentos
//  ✅ Responsive móvil
//  ─────────────────────────────────────────────────────────
//  PROPS:
//    products       {Array}    - catálogo completo de la tienda
//    onProductClick {Function} - abre modal de detalle
//    onAddToCart    {Function} - agrega producto al carrito
// ═══════════════════════════════════════════════════════════
import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// ──────────────────────────────────────────────────────────────
//  CONFIGURACIÓN
// ──────────────────────────────────────────────────────────────
// URL del microservicio IA (Node.js)
// En desarrollo: http://localhost:4000
// En producción: tu URL de Render del ai-service
const AI_SERVICE_URL =
  process.env.REACT_APP_AI_SERVICE_URL ||
  process.env.REACT_APP_API_URL ||
  "https://kosmica-backend.onrender.com";

const MAX_HISTORY    = 6;   // máximo de mensajes enviados a la IA
const REQUEST_TIMEOUT = 10000; // 10 segundos

// ──────────────────────────────────────────────────────────────
//  QUICK INTENTS — respuestas locales sin llamar al servidor
//  Mismo motor que el backend, duplicado aquí para latencia 0
// ──────────────────────────────────────────────────────────────
const LOCAL_INTENTS = [
  {
    test: /^(hola|buenas|buenos días|buenas tardes|buenas noches|hey|hi)\b/i,
    reply: "Hola hermosa! ✨ Soy Isabel, tu asesora personal de Kosmica. ¿Buscas algo para ti o es un regalo especial?",
    suggestions: ["Para mí 💜", "Es un regalo 🎁", "Ver ofertas 🏷️", "Lo más vendido ⭐"],
  },
  {
    test: /envío|domicilio|despacho|cuánto.*envío|envío.*cuánto/i,
    reply: "El costo de envío lo calculas en el checkout según tu ciudad 🚚. ¿Quieres que te ayude a elegir un producto primero?",
    suggestions: ["Ver productos", "¿Qué está en oferta?"],
  },
  {
    test: /pago|mercadopago|tarjeta|pse|nequi|daviplata|cómo.*pago/i,
    reply: "Aceptamos MercadoPago: tarjeta crédito/débito, PSE, Nequi, Daviplata y efectivo 💳. ¿Te ayudo a encontrar algo?",
    suggestions: ["Ver catálogo 👜", "Ver ofertas 🏷️"],
  },
  {
    test: /devolución|cambio|garantía|devolver/i,
    reply: "Tienes 15 días para cambios si el producto llega con defecto. Escríbenos a hola@kosmica.com 💜",
    suggestions: ["Ver productos", "Hablar con soporte"],
  },
  {
    test: /gracias|thank you/i,
    reply: "¡Con gusto, reina! Cualquier cosa que necesites, aquí estoy ✨",
    suggestions: ["Ver más productos 👜"],
  },
  {
    test: /adios|chao|hasta luego|bye/i,
    reply: "¡Hasta pronto! Fue un placer atenderte ✨ Vuelve cuando quieras.",
    suggestions: [],
  },
];

function checkLocalIntent(text) {
  const clean = text.trim();
  const match = LOCAL_INTENTS.find(i => i.test.test(clean));
  return match ? { reply: match.reply, suggestions: match.suggestions || [] } : null;
}

// ──────────────────────────────────────────────────────────────
//  ESTILOS
// ──────────────────────────────────────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Cormorant+Garamond:wght@600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  /* FAB */
  .kb-fab {
    position: fixed; bottom: 26px; right: 26px;
    width: 64px; height: 64px; border-radius: 50%;
    background: linear-gradient(145deg,#8B5CF6,#5B21B6);
    border: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center; font-size: 26px;
    box-shadow: 0 8px 30px rgba(91,33,182,.55);
    z-index: 10000; transition: transform .2s;
    animation: kbPulseOuter 3s ease infinite;
  }
  @keyframes kbPulseOuter {
    0%,100% { box-shadow: 0 8px 30px rgba(91,33,182,.55), 0 0 0 0 rgba(139,92,246,.4); }
    50%     { box-shadow: 0 8px 30px rgba(91,33,182,.55), 0 0 0 12px rgba(139,92,246,0); }
  }
  .kb-fab:hover { transform: scale(1.1) rotate(-8deg); }
  .kb-fab-badge {
    position: absolute; top: -4px; right: -4px;
    width: 22px; height: 22px; border-radius: 50%;
    background: #EF4444; border: 2px solid #fff;
    font-size: 10px; font-weight: 800; color: #fff;
    display: flex; align-items: center; justify-content: center;
    font-family: 'DM Sans', sans-serif;
  }

  /* OVERLAY */
  .kb-overlay {
    position: fixed; inset: 0;
    background: rgba(10,0,30,.65); backdrop-filter: blur(8px);
    z-index: 9998; animation: kbFadeIn .2s ease;
  }
  @keyframes kbFadeIn { from{opacity:0} to{opacity:1} }

  /* PANEL PRINCIPAL */
  .kb-panel {
    position: fixed; bottom: 0; right: 0;
    width: 900px; height: 92vh;
    max-width: 100vw; max-height: 100vh;
    background: #FAFAFD;
    border-radius: 22px 22px 0 0;
    display: grid;
    grid-template-columns: 1fr 310px;
    grid-template-rows: auto auto 1fr auto;
    overflow: hidden;
    z-index: 9999;
    box-shadow: -6px 0 60px rgba(0,0,0,.28);
    animation: kbSlideUp .32s cubic-bezier(.34,1.1,.64,1);
    font-family: 'DM Sans', sans-serif;
  }
  @keyframes kbSlideUp {
    from { transform: translateY(55px); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }
  @media (max-width: 920px) {
    .kb-panel { width: 100vw; border-radius: 18px 18px 0 0; grid-template-columns: 1fr; }
    .kb-side  { display: none !important; }
  }

  /* HEADER */
  .kb-header {
    grid-column: 1 / -1;
    background: linear-gradient(135deg,#6D28D9 0%,#3B0764 100%);
    padding: 15px 20px;
    display: flex; align-items: center; gap: 12px;
    flex-shrink: 0; position: relative; overflow: hidden;
  }
  .kb-header::before {
    content:''; position:absolute; top:-60px; right:-50px;
    width:200px; height:200px; border-radius:50%;
    background: rgba(255,255,255,.05); pointer-events:none;
  }
  .kb-av-wrap { position: relative; flex-shrink: 0; }
  .kb-av {
    width: 50px; height: 50px; border-radius: 50%;
    background: rgba(255,255,255,.14);
    border: 2px solid rgba(255,255,255,.28);
    display: flex; align-items: center; justify-content: center;
    font-size: 22px;
    box-shadow: 0 0 0 6px rgba(255,255,255,.06);
  }
  .kb-dot {
    position: absolute; bottom: 2px; right: 2px;
    width: 13px; height: 13px; border-radius: 50%;
    background: #34D399; border: 2.5px solid #4C1D95;
    animation: kbPing 2s ease infinite;
  }
  @keyframes kbPing {
    0%,100%{ box-shadow: 0 0 0 0 rgba(52,211,153,.5); }
    50%    { box-shadow: 0 0 0 6px rgba(52,211,153,0); }
  }
  .kb-hinfo { flex: 1; min-width: 0; }
  .kb-hname {
    font-family: 'Cormorant Garamond', serif;
    font-size: 1.06rem; font-weight: 700; color: #fff; line-height: 1.2;
  }
  .kb-hsub {
    font-size: .72rem; color: rgba(255,255,255,.8);
    display: flex; align-items: center; gap: 5px; margin-top: 3px;
  }
  .kb-hsub-dot { width: 6px; height: 6px; background: #34D399; border-radius: 50%; }
  .kb-hbadge {
    font-size: .6rem; font-weight: 800; letter-spacing: .1em;
    padding: 2px 8px; border-radius: 8px;
    background: rgba(255,255,255,.14);
    border: 1px solid rgba(255,255,255,.2);
    color: rgba(255,255,255,.9); text-transform: uppercase; margin-left: 4px;
  }
  .kb-close {
    width: 35px; height: 35px; flex-shrink: 0;
    background: rgba(255,255,255,.12);
    border: 1.5px solid rgba(255,255,255,.24);
    border-radius: 50%; color: #fff; font-size: 14px;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    transition: background .15s, transform .2s;
  }
  .kb-close:hover { background: rgba(255,255,255,.25); transform: rotate(90deg); }

  /* CATEGORÍAS */
  .kb-cats {
    grid-column: 1 / -1;
    background: linear-gradient(135deg,#5B21B6,#3B0764);
    padding: 8px 16px;
    display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none;
    border-bottom: 1px solid rgba(0,0,0,.12);
    flex-shrink: 0;
  }
  .kb-cats::-webkit-scrollbar { display: none; }
  .kb-cat {
    flex-shrink: 0; padding: 5px 14px; border-radius: 20px;
    background: rgba(255,255,255,.11);
    border: 1.5px solid rgba(255,255,255,.2);
    color: #fff; font-size: .72rem; font-weight: 600;
    cursor: pointer; white-space: nowrap;
    transition: all .16s; font-family: 'DM Sans', sans-serif;
  }
  .kb-cat:hover, .kb-cat.on {
    background: rgba(255,255,255,.28);
    border-color: rgba(255,255,255,.6);
    transform: translateY(-1px);
  }
  .kb-cat:disabled { opacity: .35; cursor: default; transform: none; }

  /* ZONA DE CHAT */
  .kb-chat {
    display: flex; flex-direction: column;
    background: #F3EEFF; overflow: hidden;
    border-right: 1px solid #E8DEFA;
    position: relative;
  }
  .kb-msgs {
    flex: 1; overflow-y: auto; padding: 16px 14px 8px;
    display: flex; flex-direction: column; gap: 12px;
    scrollbar-width: thin; scrollbar-color: #D4B8F0 transparent;
  }
  .kb-msgs::-webkit-scrollbar { width: 4px; }
  .kb-msgs::-webkit-scrollbar-thumb { background: #D4B8F0; border-radius: 4px; }

  /* MENSAJES */
  .kb-msg { display: flex; gap: 8px; align-items: flex-end; }
  .kb-msg.user { flex-direction: row-reverse; }
  .kb-av-sm {
    width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center; font-size: 14px;
  }
  .kb-msg.bot  .kb-av-sm { background: linear-gradient(135deg,#6D28D9,#3B0764); box-shadow: 0 3px 10px rgba(109,40,217,.35); }
  .kb-msg.user .kb-av-sm { background: #E8DEFA; }
  .kb-bbl {
    padding: 11px 15px; border-radius: 18px;
    font-size: .875rem; line-height: 1.65;
    max-width: 285px; word-break: break-word; white-space: pre-line;
    font-family: 'DM Sans', sans-serif;
  }
  .kb-msg.bot  .kb-bbl {
    background: #fff; color: #1C0845;
    border-bottom-left-radius: 4px;
    box-shadow: 0 2px 10px rgba(0,0,0,.07);
    border: 1px solid #EDE8FA;
  }
  .kb-msg.user .kb-bbl {
    background: linear-gradient(135deg,#6D28D9,#3B0764);
    color: #fff; border-bottom-right-radius: 4px;
    box-shadow: 0 4px 16px rgba(109,40,217,.4);
  }

  /* QUICK BADGE */
  .kb-quick-badge {
    display: inline-block;
    font-size: .58rem; font-weight: 700; letter-spacing: .08em;
    padding: 2px 7px; border-radius: 8px; text-transform: uppercase;
    background: #EDE8FA; color: #6D28D9; margin-bottom: 5px;
  }

  /* TYPING */
  .kb-typing { display: flex; gap: 5px; align-items: center; padding: 2px 0; }
  .kb-typing span {
    width: 7px; height: 7px; background: #8B5CF6;
    border-radius: 50%; animation: kbBounce 1.3s infinite;
  }
  .kb-typing span:nth-child(2){ animation-delay:.2s; }
  .kb-typing span:nth-child(3){ animation-delay:.4s; }
  @keyframes kbBounce {
    0%,60%,100%{ transform: translateY(0); opacity:.3; }
    30%        { transform: translateY(-8px); opacity:1; }
  }

  /* SUGERENCIAS */
  .kb-sugs {
    display: flex; flex-wrap: wrap; gap: 6px;
    padding: 4px 0 2px; margin-left: 40px;
  }
  .kb-sug {
    background: #fff; border: 1.5px solid #C4B0E8;
    color: #5B21B6; border-radius: 20px;
    padding: 6px 13px; font-size: .75rem; font-weight: 600;
    cursor: pointer; white-space: nowrap;
    transition: all .16s; font-family: 'DM Sans', sans-serif;
    box-shadow: 0 2px 8px rgba(91,33,182,.08);
  }
  .kb-sug:hover {
    background: linear-gradient(135deg,#6D28D9,#3B0764);
    color: #fff; border-color: transparent;
    transform: translateY(-2px);
    box-shadow: 0 5px 16px rgba(109,40,217,.35);
  }

  /* ERROR BANNER */
  .kb-err {
    margin: 8px 12px; padding: 10px 14px;
    background: #FFF1F2; border: 1px solid #FDA4A4;
    border-radius: 12px; display: flex; gap: 10px; align-items: flex-start;
  }
  .kb-err-txt { font-size: .78rem; color: #991B1B; line-height: 1.5; }
  .kb-err-btn {
    margin-top: 6px; padding: 4px 12px; border-radius: 7px;
    background: #FDA4A4; border: none; color: #7F1D1D;
    font-size: .72rem; font-weight: 700; cursor: pointer;
    font-family: 'DM Sans', sans-serif;
  }

  /* INPUT */
  .kb-input-row {
    padding: 11px 13px; border-top: 1px solid #EDE8FA;
    display: flex; gap: 8px; align-items: center; background: #fff;
    box-shadow: 0 -3px 16px rgba(0,0,0,.04);
  }
  .kb-input {
    flex: 1; border: 1.5px solid #DDD0F8; border-radius: 24px;
    padding: 11px 18px; font-size: .875rem; color: #1C0845;
    outline: none; background: #F8F4FF;
    transition: border-color .18s, box-shadow .18s;
    font-family: 'DM Sans', sans-serif;
  }
  .kb-input:focus { border-color: #6D28D9; box-shadow: 0 0 0 3px rgba(109,40,217,.12); }
  .kb-input::placeholder { color: #B8A8D4; }
  .kb-send {
    width: 44px; height: 44px; flex-shrink: 0;
    background: linear-gradient(135deg,#6D28D9,#3B0764);
    border: none; border-radius: 50%; color: #fff; font-size: 17px;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    transition: transform .15s, box-shadow .15s;
    box-shadow: 0 4px 16px rgba(109,40,217,.5);
  }
  .kb-send:hover:not(:disabled) { transform: scale(1.12); }
  .kb-send:disabled { opacity: .28; cursor: default; box-shadow: none; }

  /* LOADING (catálogo vacío) */
  .kb-wait {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 14px; padding: 30px;
  }
  .kb-spin {
    width: 44px; height: 44px; border-radius: 50%;
    border: 3px solid #E8DEFA; border-top-color: #6D28D9;
    animation: kbSpin .8s linear infinite;
  }
  @keyframes kbSpin { to { transform: rotate(360deg); } }
  .kb-wait-txt { font-size: .83rem; color: #9D8BC4; text-align: center; line-height: 1.7; }

  /* ─── PANEL LATERAL (productos) ─── */
  .kb-side {
    background: #fff; display: flex; flex-direction: column;
    overflow: hidden; border-left: 1px solid #EDE8FA;
  }
  .kb-side-hdr {
    padding: 14px 16px 12px; border-bottom: 1px solid #EDE8FA;
    display: flex; align-items: center; justify-content: space-between; flex-shrink: 0;
    background: linear-gradient(to bottom, #FDFBFF, #F7F3FF);
  }
  .kb-side-ttl {
    font-family: 'Cormorant Garamond', serif;
    font-size: .95rem; font-weight: 700; color: #1C0845;
  }
  .kb-side-cnt {
    font-size: .67rem; font-weight: 800; color: #fff;
    background: linear-gradient(135deg,#6D28D9,#3B0764);
    padding: 3px 10px; border-radius: 11px; letter-spacing: .03em;
  }
  .kb-side-scroll {
    flex: 1; overflow-y: auto; padding: 12px 11px;
    display: flex; flex-direction: column; gap: 12px;
    scrollbar-width: thin; scrollbar-color: #DDD0F8 transparent;
  }
  .kb-side-scroll::-webkit-scrollbar { width: 3px; }
  .kb-side-scroll::-webkit-scrollbar-thumb { background: #DDD0F8; border-radius: 3px; }

  /* TARJETA */
  .kb-card {
    border-radius: 14px; overflow: hidden;
    border: 1.5px solid #EDE8FA; background: #fff;
    transition: transform .2s, box-shadow .2s, border-color .2s; position: relative;
  }
  .kb-card:hover { transform: translateY(-4px); box-shadow: 0 12px 36px rgba(109,40,217,.18); border-color: #6D28D9; }
  .kb-badge {
    position: absolute; top: 9px; left: 9px;
    font-size: .56rem; font-weight: 800; letter-spacing: .09em;
    padding: 3px 9px; border-radius: 9px; text-transform: uppercase; z-index: 3;
    font-family: 'DM Sans', sans-serif;
  }
  .kb-badge.oferta { background: #EF4444; color: #fff; box-shadow: 0 3px 10px rgba(239,68,68,.4); }
  .kb-badge.nuevo  { background: #6D28D9; color: #fff; box-shadow: 0 3px 10px rgba(109,40,217,.4); }

  /* IMAGEN */
  .kb-img-wrap {
    width: 100%; height: 162px; overflow: hidden; position: relative;
    background: linear-gradient(135deg,#EDE8FA,#DDD0F8);
    display: flex; align-items: center; justify-content: center;
  }
  .kb-img-real {
    position: absolute; inset: 0; width: 100%; height: 100%;
    object-fit: cover; opacity: 0; transition: opacity .35s;
  }
  .kb-img-real.ok { opacity: 1; }
  .kb-img-sp {
    width: 26px; height: 26px; border-radius: 50%;
    border: 3px solid #DDD0F8; border-top-color: #6D28D9;
    animation: kbSpin .8s linear infinite; position: absolute;
  }
  .kb-img-sp.hide { display: none; }
  .kb-img-em { font-size: 40px; position: absolute; opacity: 0; transition: opacity .3s; }
  .kb-img-em.ok { opacity: 1; }

  /* BODY TARJETA */
  .kb-cbody { padding: 11px 13px 13px; }
  .kb-cname {
    font-size: .83rem; font-weight: 700; color: #1C0845;
    line-height: 1.35; margin-bottom: 4px;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  }
  .kb-cdesc {
    font-size: .7rem; color: #7A6899; line-height: 1.45; margin-bottom: 8px;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  }
  .kb-cmeta { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
  .kb-cprice { font-size: .92rem; font-weight: 800; color: #5B21B6; }
  .kb-stars { display: flex; gap: 2px; }
  .kb-star { font-size: 11px; }
  .kb-star.on  { color: #FBBF24; }
  .kb-star.off { color: #E5DDF5; }
  .kb-cbtns { display: flex; gap: 6px; }
  .kb-cver {
    flex: 1; padding: 8px 0;
    background: none; border: 1.5px solid #6D28D9; border-radius: 9px;
    font-size: .72rem; font-weight: 700; color: #6D28D9;
    cursor: pointer; transition: all .15s; font-family: 'DM Sans', sans-serif;
    text-align: center;
  }
  .kb-cver:hover { background: #F3EEFF; }
  .kb-cadd {
    flex: 1.4; padding: 8px 0;
    background: linear-gradient(135deg,#6D28D9,#3B0764); border: none; border-radius: 9px;
    font-size: .72rem; font-weight: 700; color: #fff;
    cursor: pointer; transition: all .15s; font-family: 'DM Sans', sans-serif;
    text-align: center; box-shadow: 0 3px 12px rgba(109,40,217,.4);
  }
  .kb-cadd:hover { opacity: .88; transform: translateY(-1px); }
  .kb-cadd.ok { background: linear-gradient(135deg,#10B981,#065F46); box-shadow: 0 3px 12px rgba(16,185,129,.4); }

  /* PANEL VACÍO */
  .kb-empty {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 12px; padding: 28px 20px; text-align: center;
  }
  .kb-empty-ico { font-size: 40px; opacity: .2; }
  .kb-empty-txt { font-size: .8rem; color: #B0A0CC; line-height: 1.7; }

  /* TOAST */
  .kb-toast {
    position: absolute; top: 12px; left: 50%; transform: translateX(-50%);
    padding: 7px 20px; border-radius: 22px;
    font-size: .72rem; font-weight: 700; white-space: nowrap;
    animation: kbToast .3s ease; z-index: 20; pointer-events: none;
    font-family: 'DM Sans', sans-serif;
  }
  .kb-toast.info { background: linear-gradient(135deg,#6D28D9,#3B0764); color: #fff; box-shadow: 0 5px 20px rgba(109,40,217,.5); }
  .kb-toast.cart { background: linear-gradient(135deg,#10B981,#065F46); color: #fff; box-shadow: 0 5px 20px rgba(16,185,129,.5); }
  @keyframes kbToast {
    from { opacity:0; transform: translateX(-50%) translateY(-10px); }
    to   { opacity:1; transform: translateX(-50%) translateY(0); }
  }
`;

// ──────────────────────────────────────────────────────────────
//  CATEGORÍAS DEL CATÁLOGO
// ──────────────────────────────────────────────────────────────
const CATS = [
  { label: "👜 Bolsos",       q: "Quiero ver los bolsos disponibles" },
  { label: "💄 Maquillaje",   q: "¿Qué maquillaje tienen?" },
  { label: "✨ Capilar",      q: "Muéstrame productos para el cabello" },
  { label: "💍 Accesorios",   q: "¿Qué accesorios tienen?" },
  { label: "💳 Billeteras",   q: "Quiero ver las billeteras" },
  { label: "🏷️ Ofertas",     q: "¿Qué está en oferta?" },
  { label: "🆕 Novedades",    q: "¿Qué novedades llegaron?" },
  { label: "⭐ Más vendidos", q: "¿Cuáles son los más vendidos?" },
  { label: "🎁 Regalos",     q: "Necesito ideas para un regalo" },
];

// ──────────────────────────────────────────────────────────────
//  HELPERS
// ──────────────────────────────────────────────────────────────
const fmtCOP = (n) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

const catEmoji = (cat = "") => {
  const c = cat.toUpperCase();
  if (c.includes("BOLSO") || c.includes("MORRAL")) return "👜";
  if (c.includes("MAQUILLAJE")) return "💄";
  if (c.includes("CAPILAR"))    return "✨";
  if (c.includes("ACCESORIO"))  return "💍";
  if (c.includes("BILLETERA"))  return "💳";
  return "🛍️";
};

const extractIds = (text) => {
  const m = text.match(/PRODUCTOS_RECOMENDADOS:\[?([\d,\s]+)\]?/);
  return m ? m[1].split(",").map(s => parseInt(s.trim(), 10)).filter(n => n > 0) : [];
};

const cleanText = (text) =>
  text.replace(/PRODUCTOS_RECOMENDADOS:\[?[\d,\s]+\]?/g, "").trim();

// Sub-componentes
const Stars = ({ rating = 0 }) => (
  <div className="kb-stars">
    {[1,2,3,4,5].map(i => (
      <span key={i} className={`kb-star ${i <= Math.round(rating) ? "on" : "off"}`}>★</span>
    ))}
  </div>
);

const Img = ({ src, alt, emoji }) => {
  const [s, setS] = useState("load");
  useEffect(() => {
    if (!src) { setS("err"); return; }
    setS("load");
    const img = new window.Image();
    img.onload  = () => setS("ok");
    img.onerror = () => setS("err");
    img.src = src;
    return () => { img.onload = null; img.onerror = null; };
  }, [src]);
  return (
    <div className="kb-img-wrap">
      <div className={`kb-img-sp${s !== "load" ? " hide" : ""}`} />
      {src && <img src={src} alt={alt} className={`kb-img-real${s === "ok" ? " ok" : ""}`} />}
      <span className={`kb-img-em${s === "err" ? " ok" : ""}`}>{emoji}</span>
    </div>
  );
};

// ──────────────────────────────────────────────────────────────
//  COMPONENTE PRINCIPAL
// ──────────────────────────────────────────────────────────────
export default function AIChatBot({ products = [], onProductClick, onAddToCart }) {
  const [open, setOpen]         = useState(false);
  const [msgs, setMsgs]         = useState([{
    role: "bot", content: "Hola hermosa, soy Isabel ✨\nTu asesora personal de Kosmica. ¿Buscas algo para ti o es un regalo especial?",
    sugs: CATS.slice(0, 4).map(c => c.label),
  }]);
  const [shown, setShown]       = useState([]);
  const [added, setAdded]       = useState(new Set());
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [unread, setUnread]     = useState(1);
  const [activeCat, setActiveCat] = useState(null);
  const [toast, setToast]       = useState(null);
  const bottomRef               = useRef(null);
  const inputRef                = useRef(null);
  const abortRef                = useRef(null);

  const ready = products.length > 0;

  // Mapa de productos para lookup rápido
  const prodMap = useMemo(() => {
    const m = new Map();
    products.forEach(p => m.set(p.id, p));
    return m;
  }, [products]);

  useEffect(() => {
    if (open) { setUnread(0); setTimeout(() => inputRef.current?.focus(), 120); }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, loading]);

  const fireToast = useCallback((msg, type = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  }, []);

  const handleAdd = useCallback((prod, e) => {
    e?.stopPropagation();
    onAddToCart?.(prod);
    setAdded(prev => new Set([...prev, prod.id]));
    fireToast(`🛒 ${prod.name} agregado`, "cart");
    setTimeout(() => setAdded(prev => { const n = new Set(prev); n.delete(prod.id); return n; }), 2500);
  }, [onAddToCart, fireToast]);

  const send = useCallback(async (override) => {
    const text = (override ?? input).trim();
    if (!text || loading) return;
    if (!ready) { fireToast("⏳ Cargando catálogo..."); return; }

    setInput("");
    setError(null);

    // ── 1. Quick intent local (INSTANTÁNEO) ──────────────
    const local = checkLocalIntent(text);
    if (local) {
      setMsgs(prev => [
        ...prev,
        { role: "user", content: text },
        { role: "bot", content: local.reply, sugs: local.suggestions, quick: true },
      ]);
      return;
    }

    // ── 2. Llamada al microservicio IA ───────────────────
    const userMsg  = { role: "user", content: text };
    const history  = [...msgs, userMsg];
    setMsgs(history);
    setLoading(true);

    // Historial para la API: últimos MAX_HISTORY mensajes
    const apiHistory = history
      .filter(m => m.role === "user" || m.role === "bot")
      .slice(-MAX_HISTORY)
      .map(m => ({ role: m.role === "bot" ? "assistant" : "user", content: m.content }));

    // Cancela request anterior si hay uno en vuelo
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const resp = await fetch(`${AI_SERVICE_URL}/api/ai/chat`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        signal:  abortRef.current.signal,
        body: JSON.stringify({
          messages:        apiHistory,
          products,                     // el microservicio filtra internamente
          lastUserMessage: text,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || `Error ${resp.status}`);
      }

      const data    = await resp.json();
      const raw     = data.content?.[0]?.text ?? "Lo siento, no pude procesar tu mensaje. ¿Lo intentamos de nuevo?";
      const ids     = extractIds(raw);
      const cleaned = cleanText(raw);
      const prods   = ids.map(id => prodMap.get(id)).filter(Boolean);

      setMsgs(prev => [...prev, { role: "bot", content: cleaned, prods }]);
      if (prods.length > 0) {
        setShown(prods);
        fireToast(`✨ ${prods.length} producto${prods.length > 1 ? "s" : ""} para ti`);
      }
      if (!open) setUnread(u => u + 1);

    } catch (err) {
      if (err.name === "AbortError") return;
      console.error("ChatBot error:", err.message);
      setError(err.message);
      setMsgs(prev => [...prev, {
        role: "bot",
        content: "Tuve un problema de conexión. ¿Lo intentamos de nuevo? 🔄",
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, msgs, products, ready, prodMap, open, fireToast]);

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const handleCat = (cat) => { setActiveCat(cat.label); send(cat.q); };

  return (
    <>
      <style>{STYLES}</style>

      {/* FAB */}
      <button className="kb-fab" onClick={() => setOpen(o => !o)} title="Habla con Isabel">
        {open ? "✕" : "✨"}
        {!open && unread > 0 && <span className="kb-fab-badge">{unread}</span>}
      </button>

      {open && (
        <>
          <div className="kb-overlay" onClick={() => setOpen(false)} />
          <div className="kb-panel">

            {/* ── HEADER ── */}
            <div className="kb-header">
              <div className="kb-av-wrap">
                <div className="kb-av">✨</div>
                <span className="kb-dot" />
              </div>
              <div className="kb-hinfo">
                <div className="kb-hname">Isabel · Asesora Kosmica</div>
                <div className="kb-hsub">
                  <span className="kb-hsub-dot" />
                  En línea ahora
                  <span className="kb-hbadge">IA Pro</span>
                </div>
              </div>
              <button className="kb-close" onClick={() => setOpen(false)}>✕</button>
            </div>

            {/* ── CATEGORÍAS ── */}
            <div className="kb-cats">
              {CATS.map(c => (
                <button
                  key={c.label}
                  className={`kb-cat${activeCat === c.label ? " on" : ""}`}
                  onClick={() => handleCat(c)}
                  disabled={loading || !ready}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* ── CHAT ── */}
            <div className="kb-chat">
              {toast && <div className={`kb-toast ${toast.type}`}>{toast.msg}</div>}

              {!ready ? (
                <div className="kb-wait">
                  <div className="kb-spin" />
                  <div className="kb-wait-txt">Cargando el catálogo de Kosmica...<br />Un momento 💜</div>
                </div>
              ) : (
                <>
                  {error && (
                    <div className="kb-err">
                      <span>⚠️</span>
                      <div>
                        <div className="kb-err-txt">Error de conexión: {error}</div>
                        <button
                          className="kb-err-btn"
                          onClick={() => { setError(null); send(msgs.findLast?.(m => m.role === "user")?.content); }}
                        >
                          Reintentar
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="kb-msgs">
                    {msgs.map((msg, i) => (
                      <div key={i}>
                        <div className={`kb-msg ${msg.role}`}>
                          <div className="kb-av-sm">{msg.role === "bot" ? "✨" : "👤"}</div>
                          <div className="kb-bbl">
                            {msg.quick && <div className="kb-quick-badge">Respuesta rápida</div>}
                            {msg.content}
                          </div>
                        </div>
                        {/* Sugerencias */}
                        {msg.sugs?.length > 0 && (
                          <div className="kb-sugs">
                            {msg.sugs.map(s => (
                              <button key={s} className="kb-sug" onClick={() => {
                                // Si es una categoría, activa la cat
                                const cat = CATS.find(c => c.label === s);
                                if (cat) handleCat(cat);
                                else send(s);
                              }}>
                                {s}
                              </button>
                            ))}
                          </div>
                        )}
                        {/* Sugerencias primer mensaje */}
                        {i === 0 && msgs.length === 1 && !msg.sugs && (
                          <div className="kb-sugs">
                            {["¿Qué bolso está de moda? 👜", "Busco regalo para mi mamá 🎁", "Los más vendidos ⭐", "¿Qué hay en oferta? 🏷️"].map(s => (
                              <button key={s} className="kb-sug" onClick={() => send(s)}>{s}</button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}

                    {loading && (
                      <div className="kb-msg bot">
                        <div className="kb-av-sm">✨</div>
                        <div className="kb-bbl">
                          <div className="kb-typing"><span /><span /><span /></div>
                        </div>
                      </div>
                    )}
                    <div ref={bottomRef} />
                  </div>

                  <div className="kb-input-row">
                    <input
                      ref={inputRef}
                      className="kb-input"
                      placeholder="Cuéntame qué buscas..."
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={handleKey}
                      disabled={loading}
                    />
                    <button
                      className="kb-send"
                      onClick={() => send()}
                      disabled={loading || !input.trim()}
                    >➤</button>
                  </div>
                </>
              )}
            </div>

            {/* ── PANEL LATERAL ── */}
            <div className="kb-side">
              <div className="kb-side-hdr">
                <span className="kb-side-ttl">Recomendaciones</span>
                {shown.length > 0 && <span className="kb-side-cnt">{shown.length}</span>}
              </div>

              {shown.length === 0 ? (
                <div className="kb-empty">
                  <div className="kb-empty-ico">✨</div>
                  <div className="kb-empty-txt">
                    Cuéntale a Isabel qué buscas y aquí verás los productos recomendados con opción de agregar al carrito.
                  </div>
                </div>
              ) : (
                <div className="kb-side-scroll">
                  {shown.map(p => (
                    <div
                      key={p.id}
                      className="kb-card"
                      onClick={() => { onProductClick?.(p); setOpen(false); }}
                    >
                      {p.badge && <span className={`kb-badge ${p.badge.toLowerCase()}`}>{p.badge}</span>}
                      <Img src={p.imageUrl} alt={p.name} emoji={catEmoji(p.category)} />
                      <div className="kb-cbody">
                        <div className="kb-cname">{p.name}</div>
                        {p.description && <div className="kb-cdesc">{p.description}</div>}
                        <div className="kb-cmeta">
                          <span className="kb-cprice">{fmtCOP(p.price)}</span>
                          <Stars rating={p.rating} />
                        </div>
                        <div className="kb-cbtns">
                          <button
                            className="kb-cver"
                            onClick={e => { e.stopPropagation(); onProductClick?.(p); setOpen(false); }}
                          >Ver →</button>
                          <button
                            className={`kb-cadd${added.has(p.id) ? " ok" : ""}`}
                            onClick={e => handleAdd(p, e)}
                          >{added.has(p.id) ? "✓ Agregado" : "🛒 Al carrito"}</button>
                        </div>
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
