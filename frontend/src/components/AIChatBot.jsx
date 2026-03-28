// ============================================================
//  AIChatBot_NUEVO.jsx — Isabel, asesora IA de Kosmica  v7.0
//  ✅ Guarda estado hasta que products estén cargados
//  ✅ Botón "Agregar al carrito" directo en tarjetas del bot
//  ✅ Manejo de errores claro (GROQ_API_KEY, red, etc.)
//  ✅ Sistema de ventas completo: ver → agregar → comprar
//  ✅ Imágenes con spinner y fallback
//  ✅ Panel lateral, categorías, sugerencias
//  ✅ Responsive móvil
//
//  USO EN App.jsx:
//  <AIChatBot
//    products={products}
//    onProductClick={(p) => openProductModal(p)}
//    onAddToCart={(p) => addToCart(p)}   ← NUEVO prop
//  />
// ============================================================
import { useState, useEffect, useRef, useCallback } from "react";

// ─────────────────────────────────────────────────────────────
// ESTILOS
// ─────────────────────────────────────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Cormorant+Garamond:wght@600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  /* ── FAB ── */
  .kb-fab {
    position: fixed; bottom: 28px; right: 28px;
    width: 66px; height: 66px; border-radius: 50%;
    background: linear-gradient(135deg,#C084FC,#7C3AED);
    border: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    font-size: 28px;
    box-shadow: 0 8px 32px rgba(124,58,237,.55), 0 0 0 0 rgba(192,132,252,.4);
    z-index: 10000; transition: transform .2s, box-shadow .2s;
    animation: kbPulseRing 3s ease infinite;
  }
  @keyframes kbPulseRing {
    0%   { box-shadow: 0 8px 32px rgba(124,58,237,.55), 0 0 0 0 rgba(192,132,252,.4); }
    50%  { box-shadow: 0 8px 32px rgba(124,58,237,.55), 0 0 0 10px rgba(192,132,252,0); }
    100% { box-shadow: 0 8px 32px rgba(124,58,237,.55), 0 0 0 0 rgba(192,132,252,0); }
  }
  .kb-fab:hover { transform: scale(1.1) rotate(-5deg); }
  .kb-fab-badge {
    position: absolute; top: -5px; right: -5px;
    width: 23px; height: 23px;
    background: #F43F5E; border-radius: 50%;
    border: 2.5px solid #fff;
    font-size: 10px; font-weight: 800; color: #fff;
    display: flex; align-items: center; justify-content: center;
    font-family: 'DM Sans', sans-serif;
    animation: kbBounce .5s cubic-bezier(.36,.07,.19,.97) infinite alternate;
  }
  @keyframes kbBounce { from{transform:scale(1)} to{transform:scale(1.15)} }

  /* ── OVERLAY ── */
  .kb-overlay {
    position: fixed; inset: 0;
    background: rgba(15,5,35,.6);
    backdrop-filter: blur(8px);
    z-index: 9998; animation: kbFade .22s ease;
  }
  @keyframes kbFade { from{opacity:0} to{opacity:1} }

  /* ── PANEL ── */
  .kb-panel {
    position: fixed; bottom: 0; right: 0;
    width: 900px; height: 92vh;
    max-width: 100vw; max-height: 100vh;
    background: #FDFBFF;
    border-radius: 24px 24px 0 0;
    display: grid;
    grid-template-columns: 1fr 320px;
    grid-template-rows: auto auto 1fr auto;
    overflow: hidden;
    z-index: 9999;
    box-shadow: -8px 0 80px rgba(0,0,0,.3);
    animation: kbUp .35s cubic-bezier(.34,1.15,.64,1);
    font-family: 'DM Sans', sans-serif;
  }
  @keyframes kbUp {
    from { transform: translateY(60px); opacity:0; }
    to   { transform: translateY(0);    opacity:1; }
  }
  @media (max-width: 920px) {
    .kb-panel { width: 100vw; border-radius: 20px 20px 0 0; grid-template-columns: 1fr; }
    .kb-prod-panel { display: none !important; }
  }

  /* ── HEADER ── */
  .kb-header {
    grid-column: 1 / -1;
    background: linear-gradient(135deg, #7C3AED 0%, #4C1D95 60%, #2E1065 100%);
    padding: 16px 22px;
    display: flex; align-items: center; gap: 14px;
    flex-shrink: 0; position: relative; overflow: hidden;
  }
  .kb-header::after {
    content: '';
    position: absolute; top: -50px; right: -60px;
    width: 220px; height: 220px; border-radius: 50%;
    background: rgba(255,255,255,.05); pointer-events: none;
  }
  .kb-header::before {
    content: '';
    position: absolute; bottom: -30px; left: 40%;
    width: 140px; height: 140px; border-radius: 50%;
    background: rgba(192,132,252,.1); pointer-events: none;
  }
  .kb-av-wrap { position: relative; flex-shrink: 0; z-index: 1; }
  .kb-av {
    width: 52px; height: 52px; border-radius: 50%;
    background: rgba(255,255,255,.15);
    border: 2px solid rgba(255,255,255,.3);
    display: flex; align-items: center; justify-content: center;
    font-size: 24px;
    box-shadow: 0 0 0 6px rgba(255,255,255,.06), 0 4px 20px rgba(0,0,0,.3);
  }
  .kb-online-dot {
    position: absolute; bottom: 1px; right: 1px;
    width: 14px; height: 14px;
    background: #34D399; border-radius: 50%;
    border: 2.5px solid #4C1D95;
    animation: kbPulse 2s infinite;
  }
  @keyframes kbPulse {
    0%,100%{ box-shadow: 0 0 0 0 rgba(52,211,153,.5); }
    50%    { box-shadow: 0 0 0 7px rgba(52,211,153,0); }
  }
  .kb-hinfo { flex: 1; min-width: 0; z-index: 1; }
  .kb-hname {
    font-family: 'Cormorant Garamond', serif;
    font-size: 1.1rem; font-weight: 700; color: #fff;
    white-space: nowrap; line-height: 1.2; letter-spacing: .01em;
  }
  .kb-hsub {
    font-size: .72rem; color: rgba(255,255,255,.82);
    display: flex; align-items: center; gap: 5px;
    margin-top: 4px; font-weight: 500;
  }
  .kb-hsub-dot { width: 6px; height: 6px; background: #34D399; border-radius: 50%; flex-shrink:0; }
  .kb-hbadge {
    font-size: .62rem; font-weight: 700; letter-spacing: .08em;
    padding: 2px 9px; border-radius: 10px; text-transform: uppercase;
    background: rgba(255,255,255,.15); color: rgba(255,255,255,.9);
    border: 1px solid rgba(255,255,255,.2);
    margin-left: 4px;
  }
  .kb-close {
    width: 36px; height: 36px; flex-shrink: 0; z-index: 1;
    background: rgba(255,255,255,.12);
    border: 1.5px solid rgba(255,255,255,.25);
    border-radius: 50%; color: #fff; font-size: 15px;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    transition: background .15s, transform .2s;
  }
  .kb-close:hover { background: rgba(255,255,255,.25); transform: rotate(90deg); }

  /* ── CATEGORÍAS ── */
  .kb-cats-bar {
    grid-column: 1 / -1;
    background: linear-gradient(135deg,#6D28D9,#4C1D95);
    padding: 9px 18px;
    display: flex; align-items: center; gap: 7px;
    overflow-x: auto; scrollbar-width: none;
    flex-shrink: 0;
    border-bottom: 1px solid rgba(0,0,0,.1);
  }
  .kb-cats-bar::-webkit-scrollbar { display: none; }
  .kb-cat-btn {
    flex-shrink: 0; padding: 6px 15px; border-radius: 22px;
    background: rgba(255,255,255,.12);
    border: 1.5px solid rgba(255,255,255,.22);
    color: #fff; font-size: .73rem; font-weight: 600;
    cursor: pointer; white-space: nowrap;
    transition: all .18s; font-family: 'DM Sans', sans-serif;
    letter-spacing: .01em;
  }
  .kb-cat-btn:hover, .kb-cat-btn.active {
    background: rgba(255,255,255,.28);
    border-color: rgba(255,255,255,.65);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0,0,0,.2);
  }
  .kb-cat-btn:disabled { opacity: .4; cursor: default; transform: none; }

  /* ── CHAT ÁREA ── */
  .kb-chat {
    display: flex; flex-direction: column;
    background: #F5F0FF; overflow: hidden;
    border-right: 1px solid #E9E0FA;
    position: relative;
  }
  .kb-msgs {
    flex: 1; overflow-y: auto;
    padding: 18px 15px 10px;
    display: flex; flex-direction: column; gap: 14px;
    scrollbar-width: thin; scrollbar-color: #D8C8F0 transparent;
  }
  .kb-msgs::-webkit-scrollbar { width: 4px; }
  .kb-msgs::-webkit-scrollbar-thumb { background: #D8C8F0; border-radius: 4px; }

  /* Burbujas */
  .kb-msg { display: flex; gap: 9px; align-items: flex-end; }
  .kb-msg.user { flex-direction: row-reverse; }
  .kb-msgav {
    width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center; font-size: 15px;
  }
  .kb-msg.bot  .kb-msgav { background: linear-gradient(135deg,#7C3AED,#4C1D95); box-shadow: 0 3px 12px rgba(124,58,237,.35); }
  .kb-msg.user .kb-msgav { background: #EDE8FA; }
  .kb-bbl {
    padding: 12px 16px; border-radius: 20px;
    font-size: .875rem; line-height: 1.65;
    max-width: 300px; word-break: break-word; white-space: pre-line;
    font-family: 'DM Sans', sans-serif;
  }
  .kb-msg.bot  .kb-bbl {
    background: #fff; color: #1E0845;
    border-bottom-left-radius: 5px;
    box-shadow: 0 2px 12px rgba(0,0,0,.07);
    border: 1px solid #EDE8FA;
  }
  .kb-msg.user .kb-bbl {
    background: linear-gradient(135deg,#7C3AED,#4C1D95);
    color: #fff; border-bottom-right-radius: 5px;
    box-shadow: 0 4px 18px rgba(124,58,237,.4);
  }

  /* Typing */
  .kb-typing { display: flex; gap: 5px; align-items: center; padding: 3px 0; }
  .kb-typing span {
    width: 7px; height: 7px; background: #7C3AED;
    border-radius: 50%; animation: kbDot 1.3s infinite;
  }
  .kb-typing span:nth-child(2) { animation-delay: .22s; }
  .kb-typing span:nth-child(3) { animation-delay: .44s; }
  @keyframes kbDot {
    0%,60%,100% { transform: translateY(0); opacity:.3; }
    30%          { transform: translateY(-8px); opacity:1; }
  }

  /* Sugerencias */
  .kb-sugs {
    display: flex; flex-wrap: wrap; gap: 7px;
    padding: 6px 0 2px; margin-left: 43px;
  }
  .kb-sug {
    background: #fff; border: 1.5px solid #D4B8F0;
    color: #6D28D9; border-radius: 22px;
    padding: 7px 14px; font-size: .76rem; font-weight: 600;
    cursor: pointer; transition: all .18s; white-space: nowrap;
    font-family: 'DM Sans', sans-serif;
    box-shadow: 0 2px 8px rgba(124,58,237,.08);
  }
  .kb-sug:hover {
    background: linear-gradient(135deg,#7C3AED,#4C1D95);
    color: #fff; border-color: transparent;
    transform: translateY(-2px); box-shadow: 0 6px 18px rgba(124,58,237,.35);
  }

  /* Input */
  .kb-input-row {
    padding: 12px 14px; border-top: 1px solid #EDE8FA;
    display: flex; gap: 9px; align-items: center; background: #fff;
    box-shadow: 0 -4px 20px rgba(0,0,0,.04);
  }
  .kb-input {
    flex: 1; border: 1.5px solid #DDD4F0; border-radius: 26px;
    padding: 12px 20px; font-size: .875rem; color: #1E0845;
    outline: none; background: #F9F6FF;
    transition: border-color .2s, box-shadow .2s;
    font-family: 'DM Sans', sans-serif;
  }
  .kb-input:focus { border-color: #7C3AED; box-shadow: 0 0 0 3px rgba(124,58,237,.12); }
  .kb-input::placeholder { color: #B8A8D4; }
  .kb-send {
    width: 46px; height: 46px; flex-shrink: 0;
    background: linear-gradient(135deg,#7C3AED,#4C1D95);
    border: none; border-radius: 50%; color: #fff; font-size: 18px;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    transition: transform .15s, box-shadow .15s;
    box-shadow: 0 4px 18px rgba(124,58,237,.5);
  }
  .kb-send:hover:not(:disabled) { transform: scale(1.12); box-shadow: 0 8px 24px rgba(124,58,237,.6); }
  .kb-send:disabled { opacity: .3; cursor: default; box-shadow: none; }

  /* ── LOADING STATE ── */
  .kb-loading-state {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 16px; padding: 32px;
  }
  .kb-loading-spinner {
    width: 48px; height: 48px; border-radius: 50%;
    border: 3px solid #EDE8FA;
    border-top-color: #7C3AED;
    animation: kbSpin .85s linear infinite;
  }
  @keyframes kbSpin { to { transform: rotate(360deg); } }
  .kb-loading-txt { font-size: .84rem; color: #9D8BC0; text-align: center; line-height: 1.7; }

  /* ── ERROR STATE ── */
  .kb-error-banner {
    background: #FFF1F2; border: 1.5px solid #FCA5A5;
    border-radius: 14px; padding: 12px 16px;
    margin: 10px; display: flex; align-items: flex-start; gap: 10px;
  }
  .kb-error-icon { font-size: 18px; flex-shrink: 0; margin-top: 2px; }
  .kb-error-txt { font-size: .78rem; color: #991B1B; line-height: 1.5; font-weight: 500; }
  .kb-error-retry {
    margin-top: 7px; padding: 5px 14px; border-radius: 8px;
    background: #FCA5A5; border: none; color: #7F1D1D;
    font-size: .73rem; font-weight: 700; cursor: pointer;
    font-family: 'DM Sans', sans-serif; transition: background .15s;
  }
  .kb-error-retry:hover { background: #F87171; }

  /* ── PANEL PRODUCTOS ── */
  .kb-prod-panel {
    background: #fff; display: flex; flex-direction: column;
    overflow: hidden; border-left: 1px solid #EDE8FA;
  }
  .kb-prod-hdr {
    padding: 15px 18px 13px;
    border-bottom: 1px solid #EDE8FA;
    display: flex; align-items: center; justify-content: space-between;
    flex-shrink: 0;
    background: linear-gradient(to bottom, #FDFBFF, #F9F6FF);
  }
  .kb-prod-hdr-ttl {
    font-family: 'Cormorant Garamond', serif;
    font-size: .98rem; font-weight: 700; color: #1E0845;
  }
  .kb-prod-cnt {
    font-size: .68rem; font-weight: 800; color: #fff;
    background: linear-gradient(135deg,#7C3AED,#4C1D95);
    padding: 3px 11px; border-radius: 12px; letter-spacing: .03em;
  }
  .kb-prod-scroll {
    flex: 1; overflow-y: auto; padding: 14px 13px;
    display: flex; flex-direction: column; gap: 14px;
    scrollbar-width: thin; scrollbar-color: #E0D4F0 transparent;
  }
  .kb-prod-scroll::-webkit-scrollbar { width: 3px; }
  .kb-prod-scroll::-webkit-scrollbar-thumb { background: #E0D4F0; border-radius: 3px; }

  /* Tarjeta */
  .kb-pcard {
    border-radius: 16px; overflow: hidden;
    border: 1.5px solid #EDE8FA; background: #fff;
    transition: transform .22s, box-shadow .22s, border-color .22s;
    position: relative;
  }
  .kb-pcard:hover {
    transform: translateY(-4px);
    box-shadow: 0 14px 40px rgba(124,58,237,.18);
    border-color: #7C3AED;
  }
  .kb-pbadge {
    position: absolute; top: 10px; left: 10px;
    font-size: .58rem; font-weight: 800; letter-spacing: .09em;
    padding: 4px 10px; border-radius: 10px; text-transform: uppercase; z-index: 3;
    font-family: 'DM Sans', sans-serif;
  }
  .kb-pbadge.oferta { background: #F43F5E; color: #fff; box-shadow: 0 3px 10px rgba(244,63,94,.45); }
  .kb-pbadge.nuevo  { background: #7C3AED; color: #fff; box-shadow: 0 3px 10px rgba(124,58,237,.45); }

  /* Imagen */
  .kb-pimg-wrap {
    width: 100%; height: 170px; position: relative; overflow: hidden;
    background: linear-gradient(135deg,#EDE8FA,#DDD4F0);
    display: flex; align-items: center; justify-content: center;
  }
  .kb-pimg-real {
    position: absolute; inset: 0; width: 100%; height: 100%;
    object-fit: cover; opacity: 0; transition: opacity .4s ease;
  }
  .kb-pimg-real.vis { opacity: 1; }
  .kb-pimg-spinner {
    width: 28px; height: 28px; border-radius: 50%;
    border: 3px solid #DDD4F0; border-top-color: #7C3AED;
    animation: kbSpin .85s linear infinite; position: absolute;
  }
  .kb-pimg-spinner.hide { display: none; }
  .kb-pimg-emoji { font-size: 44px; position: absolute; opacity: 0; transition: opacity .3s; }
  .kb-pimg-emoji.vis { opacity: 1; }

  /* Body tarjeta */
  .kb-pbody { padding: 12px 14px 14px; }
  .kb-pname {
    font-size: .85rem; font-weight: 700; color: #1E0845;
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
  .kb-pprice { font-size: .95rem; font-weight: 800; color: #6D28D9; }
  .kb-pstars { display: flex; gap: 2px; align-items: center; }
  .kb-pstar  { font-size: 11px; }
  .kb-pstar.on  { color: #FBBF24; }
  .kb-pstar.off { color: #E5DDF5; }
  .kb-prating { font-size: .67rem; color: #A89BC0; margin-left: 2px; }

  /* Botones tarjeta */
  .kb-pbtns { display: flex; gap: 7px; }
  .kb-pver {
    flex: 1; padding: 9px 0;
    background: none;
    border: 1.5px solid #7C3AED;
    border-radius: 10px;
    font-size: .74rem; font-weight: 700; color: #7C3AED;
    text-align: center; cursor: pointer;
    transition: all .15s; font-family: 'DM Sans', sans-serif;
  }
  .kb-pver:hover { background: #F5F0FF; border-color: #4C1D95; }
  .kb-padd {
    flex: 1.4; padding: 9px 0;
    background: linear-gradient(135deg,#7C3AED,#4C1D95);
    border: none; border-radius: 10px;
    font-size: .74rem; font-weight: 700; color: #fff;
    text-align: center; cursor: pointer;
    transition: all .15s; font-family: 'DM Sans', sans-serif;
    box-shadow: 0 4px 14px rgba(124,58,237,.4);
  }
  .kb-padd:hover { opacity: .88; transform: translateY(-1px); box-shadow: 0 7px 20px rgba(124,58,237,.5); }
  .kb-padd.added {
    background: linear-gradient(135deg,#10B981,#059669);
    box-shadow: 0 4px 14px rgba(16,185,129,.4);
    animation: kbAdded .4s ease;
  }
  @keyframes kbAdded {
    0%   { transform: scale(1); }
    50%  { transform: scale(1.07); }
    100% { transform: scale(1); }
  }

  /* Panel vacío */
  .kb-pempty {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 14px; padding: 32px 24px; text-align: center;
  }
  .kb-pempty-icon { font-size: 44px; opacity: .18; }
  .kb-pempty-txt { font-size: .82rem; color: #B8A8D4; line-height: 1.7; }

  /* Toast */
  .kb-toast {
    position: absolute; top: 14px; left: 50%; transform: translateX(-50%);
    background: linear-gradient(135deg,#7C3AED,#4C1D95);
    color: #fff; padding: 8px 22px; border-radius: 24px;
    font-size: .73rem; font-weight: 700; white-space: nowrap;
    box-shadow: 0 6px 24px rgba(124,58,237,.5);
    animation: kbToastIn .35s ease; z-index: 20; pointer-events: none;
    font-family: 'DM Sans', sans-serif;
  }
  @keyframes kbToastIn {
    from { opacity:0; transform: translateX(-50%) translateY(-12px); }
    to   { opacity:1; transform: translateX(-50%) translateY(0); }
  }
  .kb-toast.cart {
    background: linear-gradient(135deg,#10B981,#059669);
    box-shadow: 0 6px 24px rgba(16,185,129,.5);
  }
`;

// ─────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────
const CATEGORIAS = [
  { label: "👜 Bolsos",        query: "Muéstrame los bolsos disponibles" },
  { label: "💄 Maquillaje",    query: "¿Qué maquillaje tienen?" },
  { label: "✨ Capilar",       query: "Productos para el cabello" },
  { label: "💍 Accesorios",    query: "Muéstrame los accesorios" },
  { label: "💳 Billeteras",    query: "Quiero ver las billeteras" },
  { label: "🏷️ Ofertas",      query: "¿Qué productos están en oferta hoy?" },
  { label: "🆕 Novedades",     query: "¿Qué hay de nuevo en la tienda?" },
  { label: "⭐ Más vendidos",  query: "¿Cuáles son los más vendidos?" },
  { label: "🎁 Regalos",      query: "Necesito ideas para un regalo especial" },
];

const SUGGESTIONS = [
  "¿Qué bolso está de moda? 👜",
  "Busco regalo para mi mamá 🎁",
  "Los más vendidos ⭐",
  "¿Qué hay en oferta? 🏷️",
  "Algo para el cabello ✨",
  "Sorpréndeme 💜",
];

// ─────────────────────────────────────────────────────────────
// SYSTEM PROMPT — Motor de ventas Isabel
// ─────────────────────────────────────────────────────────────
const buildSystemPrompt = (products) => `Eres ISABEL, la asesora personal de belleza y moda de Kosmica — tienda colombiana premium de accesorios y belleza. Eres la amiga más fashion, sofisticada y cálida de cada clienta. Tu misión principal es VENDER con elegancia, sin presión.

═══════════════════════════════════════════════
PERSONALIDAD Y ESTILO DE COMUNICACIÓN
═══════════════════════════════════════════════
• Cálida, sofisticada, motivadora. NUNCA robótica ni genérica
• Tuteo natural. Usa "amiga", "hermosa", "reina", "mi amor" con naturalidad colombiana
• NUNCA empieces con "¡Claro!", "¡Por supuesto!", "¡Perfecto!" — ve directo al valor
• Máximo 2 emojis por mensaje, bien ubicados al final o inicio de frase
• Respuestas cortas con gancho: 2-3 líneas antes de recomendar
• Usa ocasionalmente expresiones colombianas: "chimba", "bacano", "qué nota"

═══════════════════════════════════════════════
ESTRATEGIA DE VENTAS (sin presionar jamás)
═══════════════════════════════════════════════
• Describe detalles sensoriales: textura, acabado, cómo se ve puesto, con qué combina
• Conecta el producto con una emoción: "perfecto para esa reunión importante"
• Badge OFERTA → urgencia suave: "estas ofertas vuelan, hermosa"
• Stock bajo → menciónalo con naturalidad: "es muy pedido, quedan pocas unidades"
• Siempre cierra con CTA suave: "¿Lo agregamos al carrito?" o "¿Te cuento más de este?"
• Después de 2 recomendaciones sin respuesta → pregunta si prefiere algo diferente

═══════════════════════════════════════════════
CATÁLOGO DISPONIBLE (solo stock > 0)
═══════════════════════════════════════════════
${JSON.stringify(
  products.filter(p => p.stock > 0).map(p => ({
    id: p.id,
    nombre: p.name,
    descripcion: p.description,
    precio: `$${Number(p.price).toLocaleString("es-CO")} COP`,
    categoria: p.category,
    rating: p.rating,
    stock: p.stock,
    badge: p.badge || null,
  })),
  null, 2
)}

Categorías disponibles: Bolsos y Morrales, Maquillaje, Capilar, Accesorios, Billeteras.

═══════════════════════════════════════════════
CÓMO RECOMENDAR
═══════════════════════════════════════════════
• Antes de recomendar, entiende: ¿para ella o regalo? ¿ocasión? ¿estilo? ¿presupuesto?
• Si falta info clave, haz UNA sola pregunta (no interrogatorio)
• Explica en 1-2 frases POR QUÉ ese producto es ideal para ELLA específicamente
• Máximo 3 productos por recomendación
• NUNCA menciones productos con stock 0
• Precios siempre en COP

═══════════════════════════════════════════════
SITUACIONES ESPECIALES
═══════════════════════════════════════════════
REGALO → pregunta presupuesto y a quién es antes de recomendar
PRESUPUESTO LIMITADO → honesta, resalta el valor del producto
DUDA ENTRE DOS → ayúdala a decidir con una razón concreta
AGOTADO → ofrece la alternativa más similar con entusiasmo
QUEJA → empatía total primero, luego orienta
SOLO EXPLORANDO → genera curiosidad con pregunta sobre su estilo personal
PREGUNTA POR ENVÍO → el envío se calcula al momento de pagar, varía según ciudad

═══════════════════════════════════════════════
LÍMITES
═══════════════════════════════════════════════
• Solo productos Kosmica y temas de belleza/moda/accesorios
• Nunca inventes productos, precios ni características
• Nunca hagas sentir mal a la clienta por su presupuesto o gustos

═══════════════════════════════════════════════
⚠️ FORMATO OBLIGATORIO — LEE CON CUIDADO
═══════════════════════════════════════════════
Cuando recomiendes productos, SIEMPRE incluye al FINAL del mensaje:
PRODUCTOS_RECOMENDADOS:id1,id2,id3

CORRECTO → PRODUCTOS_RECOMENDADOS:15,73,42
INCORRECTO → PRODUCTOS_RECOMENDADOS:[15,73,42]
INCORRECTO → PRODUCTOS_RECOMENDADOS: 15, 73, 42

Si NO recomiendas productos en ese mensaje, NO incluyas esa línea.`;

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
const fmtCOP = (p) =>
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

// Imagen con carga progresiva, spinner y fallback emoji
const ProductImage = ({ src, alt, emoji }) => {
  const [state, setState] = useState("loading");
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

// Extraer IDs del mensaje
const extractIds = (text) => {
  const m = text.match(/PRODUCTOS_RECOMENDADOS:\[?([\d,\s]+)\]?/);
  if (!m) return [];
  return m[1].split(",").map(s => parseInt(s.trim(), 10)).filter(n => Number.isFinite(n) && n > 0);
};
const cleanText = (text) => text.replace(/PRODUCTOS_RECOMENDADOS:\[?[\d,\s]+\]?/g, "").trim();

// ─────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────
export default function AIChatBot({ products = [], onProductClick, onAddToCart }) {
  const [open, setOpen]           = useState(false);
  const [messages, setMessages]   = useState([{
    role: "bot",
    content: "Hola hermosa, soy Isabel ✨\nTu asesora personal de Kosmica. ¿Estás buscando algo para ti o es un regalo especial?",
    products: [],
  }]);
  const [shownProducts, setShownProducts] = useState([]);
  const [addedIds, setAddedIds]   = useState(new Set());
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [unread, setUnread]       = useState(1);
  const [activeCat, setActiveCat] = useState(null);
  const [toast, setToast]         = useState({ msg: "", type: "info" });
  const bottomRef                 = useRef(null);
  const inputRef                  = useRef(null);

  // Productos listos: solo funcionamos si hay catálogo
  const productsReady = products.length > 0;

  useEffect(() => {
    if (open) { setUnread(0); setTimeout(() => inputRef.current?.focus(), 150); }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const fireToast = useCallback((msg, type = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "info" }), 3000);
  }, []);

  const byIds = useCallback((ids) =>
    ids.map(id => products.find(p => p.id === id)).filter(Boolean),
  [products]);

  const handleAddToCart = useCallback((prod, e) => {
    e?.stopPropagation();
    if (onAddToCart) {
      onAddToCart(prod);
      setAddedIds(prev => new Set([...prev, prod.id]));
      fireToast(`🛒 ${prod.name} agregado al carrito`, "cart");
      setTimeout(() => {
        setAddedIds(prev => { const n = new Set(prev); n.delete(prod.id); return n; });
      }, 2500);
    } else if (onProductClick) {
      onProductClick(prod);
      setOpen(false);
    }
  }, [onAddToCart, onProductClick, fireToast]);

  const sendMessage = useCallback(async (overrideText) => {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;
    if (!productsReady) {
      fireToast("⏳ Cargando catálogo, espera un momento...");
      return;
    }
    setInput("");
    setError(null);

    const userMsg = { role: "user", content: text };
    const history = [...messages, userMsg];
    setMessages(history);
    setLoading(true);

    // Historial para la API: bot → assistant
    const apiMessages = history
      .filter(m => m.role === "user" || m.role === "bot")
      .map(m => ({ role: m.role === "bot" ? "assistant" : "user", content: m.content }));

    try {
      const base = process.env.REACT_APP_API_URL || "https://kosmica-backend.onrender.com";
      const resp = await fetch(`${base}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          max_tokens: 1000,
          system: buildSystemPrompt(products),
          messages: apiMessages,
        }),
      });

      const data = await resp.json();

      if (!resp.ok || data.error) {
        const errMsg = typeof data.error === "string"
          ? data.error
          : data.error?.message || `Error ${resp.status}`;
        setError(errMsg);
        setMessages(prev => [...prev, {
          role: "bot",
          content: "Tuve un pequeño inconveniente técnico. ¿Lo intentamos de nuevo? 🔄",
          products: [],
        }]);
        return;
      }

      const raw     = data.content?.[0]?.text ?? "Lo siento, no pude procesar tu mensaje. ¿Intentamos de nuevo?";
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
      const errMsg = err.message || "Error de conexión";
      setError(errMsg);
      setMessages(prev => [...prev, {
        role: "bot",
        content: "No pude conectarme en este momento. Verifica tu conexión e intenta de nuevo. 🔄",
        products: [],
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, products, productsReady, open, byIds, fireToast]);

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleCat = (cat) => {
    setActiveCat(cat.label);
    sendMessage(cat.query);
  };

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
                  En línea y lista para ayudarte
                  <span className="kb-hbadge">IA</span>
                </div>
              </div>
              <button className="kb-close" onClick={() => setOpen(false)}>✕</button>
            </div>

            {/* CATEGORÍAS */}
            <div className="kb-cats-bar">
              {CATEGORIAS.map(c => (
                <button
                  key={c.label}
                  className={`kb-cat-btn${activeCat === c.label ? " active" : ""}`}
                  onClick={() => handleCat(c)}
                  disabled={loading || !productsReady}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* CHAT */}
            <div className="kb-chat">
              {toast.msg && (
                <div className={`kb-toast${toast.type === "cart" ? " cart" : ""}`}>
                  {toast.msg}
                </div>
              )}

              {/* ESTADO: Cargando catálogo */}
              {!productsReady ? (
                <div className="kb-loading-state">
                  <div className="kb-loading-spinner" />
                  <div className="kb-loading-txt">
                    Cargando el catálogo de Kosmica...<br />
                    Un momento por favor 💜
                  </div>
                </div>
              ) : (
                <>
                  {/* ERROR BANNER */}
                  {error && (
                    <div className="kb-error-banner">
                      <span className="kb-error-icon">⚠️</span>
                      <div>
                        <div className="kb-error-txt">
                          Problema de conexión con el servidor.<br />
                          <em style={{ fontWeight: 400 }}>{error}</em>
                        </div>
                        <button
                          className="kb-error-retry"
                          onClick={() => { setError(null); sendMessage(messages[messages.length - 2]?.content); }}
                        >
                          Reintentar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* MENSAJES */}
                  <div className="kb-msgs">
                    {messages.map((msg, i) => (
                      <div key={i}>
                        <div className={`kb-msg ${msg.role}`}>
                          <div className="kb-msgav">{msg.role === "bot" ? "✨" : "👤"}</div>
                          <div className="kb-bbl">{msg.content}</div>
                        </div>
                        {/* Sugerencias solo en primer mensaje */}
                        {i === 0 && messages.length === 1 && (
                          <div className="kb-sugs">
                            {SUGGESTIONS.map(s => (
                              <button key={s} className="kb-sug" onClick={() => sendMessage(s)}>
                                {s}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    {loading && (
                      <div className="kb-msg bot">
                        <div className="kb-msgav">✨</div>
                        <div className="kb-bbl">
                          <div className="kb-typing"><span /><span /><span /></div>
                        </div>
                      </div>
                    )}
                    <div ref={bottomRef} />
                  </div>

                  {/* INPUT */}
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
                    >
                      ➤
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* PANEL LATERAL PRODUCTOS */}
            <div className="kb-prod-panel">
              <div className="kb-prod-hdr">
                <span className="kb-prod-hdr-ttl">Recomendaciones</span>
                {shownProducts.length > 0 && (
                  <span className="kb-prod-cnt">{shownProducts.length}</span>
                )}
              </div>

              {shownProducts.length === 0 ? (
                <div className="kb-pempty">
                  <div className="kb-pempty-icon">✨</div>
                  <div className="kb-pempty-txt">
                    Cuéntale a Isabel qué necesitas y aquí verás las recomendaciones
                    con fotos, descripción, precio y opción de agregar al carrito.
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
                        <span className={`kb-pbadge ${prod.badge.toLowerCase()}`}>
                          {prod.badge}
                        </span>
                      )}
                      <ProductImage
                        src={prod.imageUrl}
                        alt={prod.name}
                        emoji={catEmoji(prod.category)}
                      />
                      <div className="kb-pbody">
                        <div className="kb-pname">{prod.name}</div>
                        {prod.description && (
                          <div className="kb-pdesc">{prod.description}</div>
                        )}
                        <div className="kb-pmeta">
                          <span className="kb-pprice">{fmtCOP(prod.price)}</span>
                          <Stars rating={prod.rating} />
                        </div>
                        {/* Dos botones: Ver + Agregar al carrito */}
                        <div className="kb-pbtns">
                          <button
                            className="kb-pver"
                            onClick={e => {
                              e.stopPropagation();
                              onProductClick?.(prod);
                              setOpen(false);
                            }}
                          >
                            Ver →
                          </button>
                          <button
                            className={`kb-padd${addedIds.has(prod.id) ? " added" : ""}`}
                            onClick={e => handleAddToCart(prod, e)}
                          >
                            {addedIds.has(prod.id) ? "✓ Agregado" : "🛒 Al carrito"}
                          </button>
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
