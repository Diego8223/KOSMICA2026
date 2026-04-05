// ============================================================
//  src/App.jsx — Kosmica v5  MOBILE-FIRST  Amazon-Style UX
//  ✅ Optimizado: lazy loading, useMemo, Schema.org, CountdownTimer
// ============================================================
import { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense, memo } from "react";
import { productAPI, orderAPI, imgUrl } from "./services/api";

// ✅ LAZY LOADING — reduce bundle inicial ~160KB (mejora LCP en móvil)
const ProductDetailModal = lazy(() => import("./components/ProductDetailModal"));
const AdminPanel         = lazy(() => import("./components/AdminPanel"));
const OrderTracking      = lazy(() => import("./components/OrderTracking"));
const AIChatBot          = lazy(() => import("./components/AIChatBot"));

const CSS = `
  /* ✅ FUENTE: cargada en index.html con display=swap — no bloquea render */

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --lila:        #9B72CF;
    --lila-dark:   #7B5EA7;
    --lila-light:  #C9B8E8;
    --lila-xlight: #F0E8FF;
    --pink:        #F4A7C3;
    --mint:        #A8DEC4;
    --cream:       #FDF8FF;
    --dark:        #2D1B4E;
    --brown:       #6B5B8A;
    --muted:       #B8A0D8;
    --shadow:      0 8px 28px rgba(155,114,207,.28);
    --shadow-sm:   0 4px 16px rgba(120,80,180,.12);
    --r:           16px;
  }

  html { scroll-behavior: smooth; -webkit-text-size-adjust: 100%; }
  body {
    font-family: 'DM Sans', sans-serif;
    background: var(--cream); color: var(--dark);
    overflow-x: hidden; -webkit-font-smoothing: antialiased;
  }
  img { max-width: 100%; display: block; }
  button { cursor: pointer; font-family: inherit; -webkit-tap-highlight-color: transparent; }
  input, textarea, select { font-family: inherit; }
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-thumb { background: var(--lila-light); border-radius: 3px; }

  /* ════════════════════════════════════════
     NAVBAR MÓVIL — Logo + Search + Cart + ☰
  ════════════════════════════════════════ */
  .nav {
    position: fixed; top: 0; left: 0; right: 0; z-index: 900;
    padding: 0 14px; transition: all .3s;
  }
  .nav.scrolled {
    background: rgba(253,248,255,.97); backdrop-filter: blur(22px);
    border-bottom: 1px solid rgba(155,114,207,.18);
    box-shadow: 0 2px 20px rgba(120,80,180,.1);
  }
  .nav-inner {
    height: 58px; display: flex; align-items: center;
    justify-content: space-between; gap: 10px; max-width: 1400px; margin: 0 auto;
  }
  .logo {
    font-family: 'Playfair Display', serif; font-size: 1.35rem; font-weight: 900;
    background: linear-gradient(135deg, var(--lila), var(--lila-dark));
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    cursor: pointer; flex-shrink: 0; white-space: nowrap;
  }

  /* Search móvil */
  .nav-search-wrap { flex: 1; position: relative; max-width: 220px; }
  .nav-search-wrap input {
    width: 100%; padding: 9px 14px 9px 36px; border-radius: 30px;
    border: 2px solid var(--lila-xlight); background: rgba(255,255,255,.95);
    font-size: 1rem; outline: none; transition: all .3s; color: var(--dark);
    min-height: 42px;
  }
  .nav-search-wrap input:focus { border-color: var(--lila); background: #fff; }
  .nav-search-ico {
    position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
    font-size: 1rem; pointer-events: none;
  }

  /* Botones nav derecha */
  .nav-right { display: flex; align-items: center; gap: 8px; }
  .cart-btn {
    position: relative; background: linear-gradient(135deg, var(--lila), var(--lila-dark));
    border: none; border-radius: 50%; width: 42px; height: 42px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    font-size: 1.1rem; box-shadow: var(--shadow); transition: transform .2s;
  }
  .cart-btn:hover, .cart-btn:active { transform: scale(1.08); }
  .cart-badge {
    position: absolute; top: -4px; right: -4px;
    background: var(--pink); color: #fff; border-radius: 50%;
    width: 20px; height: 20px; font-size: .78rem; font-weight: 800;
    display: flex; align-items: center; justify-content: center;
    border: 2px solid #fff;
  }

  /* Hamburger button */
  .hbg-btn {
    display: flex; align-items: center; justify-content: center;
    width: 42px; height: 42px; border-radius: 12px; flex-shrink: 0;
    background: var(--lila-xlight); border: 2px solid var(--lila-light);
    font-size: 1.25rem; transition: all .2s; color: var(--lila-dark);
  }
  .hbg-btn:hover { background: var(--lila-light); }

  /* nav-links desktop */
  .nav-links { display: none; }

  /* ════════════════════════════════════════
     DRAWER MENÚ LATERAL MÓVIL
  ════════════════════════════════════════ */
  .drawer-overlay {
    display: none; position: fixed; inset: 0;
    background: rgba(45,27,78,.52); z-index: 1050; backdrop-filter: blur(4px);
  }
  .drawer-overlay.show { display: block; }

  .drawer {
    position: fixed; top: 0; left: 0; bottom: 0; width: min(320px, 85vw);
    background: #fff; z-index: 1060; display: flex; flex-direction: column;
    transform: translateX(-100%); transition: transform .32s cubic-bezier(.4,0,.2,1);
    box-shadow: 4px 0 40px rgba(120,80,180,.22);
  }
  .drawer.open { transform: translateX(0); }

  .drawer-head {
    padding: 22px 20px 16px; border-bottom: 2px solid var(--lila-xlight);
    display: flex; justify-content: space-between; align-items: center;
    background: linear-gradient(135deg,#2D1B4E,#4A2D7A);
  }
  .drawer-logo {
    font-family: 'Playfair Display', serif; font-size: 1.5rem; font-weight: 900;
    background: linear-gradient(135deg, var(--lila-light), var(--pink));
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  }
  .drawer-close {
    background: rgba(255,255,255,.15); border: none; border-radius: 10px;
    width: 36px; height: 36px; font-size: 1.2rem; color: #fff;
    display: flex; align-items: center; justify-content: center; transition: all .2s;
  }
  .drawer-close:hover { background: rgba(255,255,255,.28); }

  .drawer-body { flex: 1; overflow-y: auto; padding: 10px 0; }

  .drawer-section-title {
    font-size: .75rem; font-weight: 800; letter-spacing: .16em;
    text-transform: uppercase; color: var(--muted);
    padding: 14px 20px 8px;
  }

  .drawer-cat-btn {
    width: 100%; display: flex; align-items: center; gap: 14px;
    padding: 14px 20px; border: none; background: none;
    font-size: 1.05rem; font-weight: 600; color: var(--dark);
    text-align: left; transition: all .18s; border-radius: 0;
    min-height: 54px;
  }
  .drawer-cat-btn:hover { background: var(--lila-xlight); color: var(--lila-dark); }
  .drawer-cat-btn.active { background: linear-gradient(90deg,var(--lila-xlight),#fff); color: var(--lila-dark); border-left: 3px solid var(--lila); }
  .drawer-cat-ico { font-size: 1.4rem; width: 30px; text-align: center; flex-shrink: 0; }
  .drawer-cat-arrow { margin-left: auto; font-size: .85rem; color: var(--muted); }

  .drawer-divider { height: 1px; background: var(--lila-xlight); margin: 8px 20px; }

  .drawer-action-btn {
    width: 100%; display: flex; align-items: center; gap: 14px;
    padding: 14px 20px; border: none; background: none;
    font-size: 1rem; font-weight: 600; color: var(--brown);
    text-align: left; transition: all .18s; min-height: 52px;
  }
  .drawer-action-btn:hover { background: var(--lila-xlight); color: var(--lila-dark); }

  .drawer-foot {
    padding: 16px 20px; border-top: 1px solid var(--lila-xlight);
    background: #FAF7FF;
  }
  .drawer-foot-txt { font-size: .85rem; color: var(--muted); margin-bottom: 10px; }
  .drawer-contact {
    display: flex; gap: 10px;
  }
  .drawer-social {
    width: 38px; height: 38px; border-radius: 10px;
    background: var(--lila-xlight); border: none;
    display: flex; align-items: center; justify-content: center;
    font-size: 1.1rem; text-decoration: none; transition: all .2s;
  }
  .drawer-social:hover { background: var(--lila-light); }

  /* ════════════════════════════════════════
     PROMO STRIP
  ════════════════════════════════════════ */
  .promo-strip {
    position: fixed; top: 58px; left: 0; right: 0; z-index: 890;
    background: linear-gradient(90deg,var(--lila),var(--pink),var(--mint),var(--lila));
    background-size: 300%; animation: moveGrad 6s linear infinite;
    padding: 8px 0; text-align: center;
    color: #fff; font-size: .84rem; font-weight: 700; letter-spacing: .04em;
  }

  /* ════════════════════════════════════════
     HERO MÓVIL
  ════════════════════════════════════════ */
  .hero {
    padding: 152px 16px 28px;
    background: linear-gradient(160deg,#EDE4FF 0%,#F5EEFF 45%,#FDE8F5 75%,#FFE8F0 100%);
    position: relative; overflow: hidden;
  }
  .hero::before {
    content: ''; position: absolute; inset: 0; pointer-events: none;
    background:
      radial-gradient(ellipse 80% 50% at 90% 10%, rgba(155,114,207,.14) 0%,transparent 70%),
      radial-gradient(ellipse 60% 60% at 5% 90%, rgba(244,167,195,.10) 0%,transparent 70%);
  }
  .hero-inner { max-width: 1400px; margin: 0 auto; width: 100%; position: relative; z-index: 1; }
  .hero-mosaic { display: none; }

  .hero-tag {
    display: inline-flex; align-items: center; gap: 6px;
    background: rgba(155,114,207,.13); border: 1.5px solid rgba(155,114,207,.3);
    border-radius: 30px; padding: 6px 14px; color: var(--lila);
    font-size: .82rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
    margin-bottom: 12px; width: fit-content;
  }
  .hero-title {
    font-family: 'Playfair Display', serif;
    font-size: 2.4rem; line-height: 1.12; color: var(--dark); font-weight: 900;
    margin-bottom: 12px;
  }
  .hero-title em {
    font-style: italic;
    background: linear-gradient(135deg, var(--lila), var(--pink));
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  }
  .hero-sub {
    color: var(--brown); font-size: 1rem; line-height: 1.7; margin-bottom: 20px;
    max-width: 460px;
  }
  .hero-btns { display: flex; flex-direction: column; gap: 10px; margin-bottom: 22px; }
  .btn-primary {
    padding: 14px 26px; text-align: center;
    background: linear-gradient(135deg, var(--lila), var(--lila-dark));
    color: #fff; border: none; border-radius: 50px;
    font-weight: 700; font-size: .97rem; letter-spacing: .04em;
    box-shadow: var(--shadow); transition: all .3s;
  }
  .btn-primary:hover { transform: translateY(-2px); filter: brightness(1.06); }
  .btn-outline {
    padding: 13px 26px; text-align: center;
    background: rgba(155,114,207,.08); color: var(--lila-dark);
    border: 2px solid rgba(155,114,207,.35); border-radius: 50px;
    font-weight: 600; font-size: .97rem; transition: all .3s;
  }
  .hero-stats { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; }
  .stat-n { font-family: 'Playfair Display', serif; font-size: 1.5rem; font-weight: 700; color: var(--lila); }
  .stat-l { font-size: .85rem; color: var(--muted); margin-top: 2px; }

  /* ════════════════════════════════════════
     CATEGORÍAS — barra horizontal bajo promo
  ════════════════════════════════════════ */
  .cats-bar {
    position: sticky; top: 92px; z-index: 880;
    display: flex; gap: 8px; overflow-x: auto; padding: 10px 14px;
    background: rgba(253,248,255,.97); border-bottom: 1px solid var(--lila-xlight);
    scrollbar-width: none; -webkit-overflow-scrolling: touch;
  }
  .cats-bar::-webkit-scrollbar { display: none; }
  .cats-bar-btn {
    padding: 11px 22px; border-radius: 30px; border: 2px solid var(--lila-xlight);
    background: #fff; color: var(--brown); font-size: 1rem; font-weight: 700;
    white-space: nowrap; flex-shrink: 0; transition: all .22s; min-height: 48px;
  }
  .cats-bar-btn.on { border-color: transparent; color: #fff; box-shadow: 0 3px 12px rgba(155,114,207,.38); }

  /* ════════════════════════════════════════
     ANIMACIONES
  ════════════════════════════════════════ */
  @keyframes moveGrad   { 0%{background-position:0%} 100%{background-position:300%} }
  @keyframes shimmer    { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
  @keyframes slideRight { from{transform:translateX(100%);opacity:0} to{transform:translateX(0);opacity:1} }
  @keyframes slideLeft  { from{transform:translateX(-100%);opacity:0} to{transform:translateX(0);opacity:1} }
  @keyframes slideUp    { from{transform:translateY(100%);opacity:0} to{transform:translateY(0);opacity:1} }
  @keyframes fadeIn     { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes cartPulse  { 0%{transform:scale(1)} 30%{transform:scale(1.22)} 60%{transform:scale(.92)} 100%{transform:scale(1)} }
  @keyframes badgePop   { 0%{transform:scale(0)} 60%{transform:scale(1.3)} 100%{transform:scale(1)} }
  .cart-btn.pulse { animation: cartPulse .42s cubic-bezier(.36,.07,.19,.97); }
  .cart-badge { animation: badgePop .3s cubic-bezier(.36,.07,.19,.97); }

  /* ════════════════════════════════════════
     PRODUCTOS — Amazon style móvil
  ════════════════════════════════════════ */
  .section-wrap { max-width: 1400px; margin: 0 auto; padding: 0 12px; }
  .products-section { padding: 16px 0 44px; }
  .section-eyebrow {
    font-size: .82rem; font-weight: 800; letter-spacing: .18em;
    text-transform: uppercase; color: var(--lila); margin-bottom: 4px;
  }
  .section-title {
    font-family: 'Playfair Display', serif; font-size: 1.6rem;
    font-weight: 700; color: var(--dark); margin-bottom: 16px;
  }
  .cat-pills { display: none; }

  .product-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 10px; }

  .product-card {
    background: #fff; border-radius: 14px; overflow: hidden;
    box-shadow: 0 2px 12px rgba(120,80,180,.09);
    transition: transform .3s, box-shadow .3s;
    border: 1.5px solid transparent; animation: fadeIn .4s ease;
  }
  .product-card:hover { transform: translateY(-4px); box-shadow: 0 14px 40px rgba(155,114,207,.2); border-color: var(--lila-xlight); }

  /* Imagen grande estilo Shein/Amazon */
  .card-img-wrap {
    position: relative; overflow: hidden;
    height: 240px; background: #F8F4FF; cursor: pointer;
  }
  .card-img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
    background: #F8F4FF;
    transition: transform .6s cubic-bezier(.25,.46,.45,.94), opacity .4s ease;
    padding: 8px;
    box-sizing: border-box;
    opacity: 0;
  }
  .card-img.loaded { opacity: 1; }
  .product-card:hover .card-img { transform: scale(1.06); }

  /* Skeleton shimmer */
  .img-skeleton {
    position: absolute; inset: 0; z-index: 1;
    background: linear-gradient(90deg, #EDE8F7 25%, #F5F0FF 50%, #EDE8F7 75%);
    background-size: 200% 100%;
    animation: shimmer 1.4s infinite;
  }
  @keyframes shimmer {
    0%   { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  .card-see-more {
    position: absolute; bottom: 0; left: 0; right: 0;
    background: linear-gradient(transparent, rgba(45,27,78,.85));
    color: #fff; text-align: center; padding: 40px 8px 14px;
    font-size: .88rem; font-weight: 700; letter-spacing:.03em;
    opacity: 0; transition: opacity .3s; pointer-events:none;
  }
  .card-see-more-inner { display:flex; align-items:center; justify-content:center; gap:5px; }
  .product-card:hover .card-see-more { opacity: 1; }

  .card-badge {
    position: absolute; top: 8px; left: 8px;
    padding: 4px 10px; border-radius: 30px;
    font-size: .75rem; font-weight: 800; letter-spacing: .05em; text-transform: uppercase;
  }
  .card-badge.VIRAL      { background: linear-gradient(135deg,#F4A7C3,#C9B8E8); color:#fff; }
  .card-badge.HOT        { background: linear-gradient(135deg,#FFB3BA,#FFCBA4); color:#fff; }
  .card-badge.BESTSELLER { background: linear-gradient(135deg,#C9B8E8,#9B72CF); color:#fff; }
  .card-badge.NUEVO      { background: linear-gradient(135deg,#A8DEC4,#80CBA8); color:#fff; }

  .card-wish {
    position: absolute; top: 8px; right: 8px;
    background: rgba(255,255,255,.92); border: none; border-radius: 50%;
    width: 34px; height: 34px; display: flex; align-items: center;
    justify-content: center; font-size: .95rem;
    box-shadow: 0 2px 8px rgba(120,80,180,.18); transition: transform .2s;
  }
  .card-wish:active { transform: scale(1.2); }

  /* Info tarjeta — grande y legible */
  .card-body { padding: 10px 11px 13px; }

  .card-stars { color: #E6A817; font-size: .9rem; }
  .card-reviews { color: #aaa; font-size: .82rem; margin-left: 4px; }

  .card-name {
    font-weight: 700; font-size: .97rem; color: var(--dark);
    margin: 5px 0 8px; line-height: 1.35;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  }

  .card-price-row { display: flex; align-items: baseline; gap: 6px; margin-bottom: 9px; }
  .card-price {
    font-family: 'Playfair Display', serif; font-size: 1.15rem;
    font-weight: 700; color: var(--lila);
  }
  .card-original { font-size: .82rem; color: #bbb; text-decoration: line-through; }
  .card-discount { font-size: .78rem; font-weight: 700; color: #27AE60; }

  .card-add {
    width: 100%; background: linear-gradient(135deg, var(--lila), var(--lila-dark));
    color: #fff; border: none; border-radius: 10px;
    padding: 10px; font-weight: 700; font-size: .9rem;
    box-shadow: 0 3px 10px rgba(155,114,207,.32); transition: all .25s;
  }
  .card-add:active { transform: scale(.97); }
  .card-add:hover { filter: brightness(1.08); }

  .card-stock {
    display: flex; align-items: center; gap: 6px;
    font-size: .74rem; font-weight: 600;
    margin-bottom: 8px;
  }
  .card-stock-bar {
    flex: 1; height: 3px; border-radius: 4px;
    background: #EDE8F5; overflow: hidden;
  }
  .card-stock-fill {
    height: 100%; border-radius: 4px;
    transition: width .4s ease;
  }
  .card-stock.high  .card-stock-fill  { background: var(--lila); }
  .card-stock.mid   .card-stock-fill  { background: #F4A261; }
  .card-stock.low   .card-stock-fill  { background: #E74C3C; }
  .card-stock.high  .card-stock-label { color: var(--brown); }
  .card-stock.mid   .card-stock-label { color: #E07A2A; }
  .card-stock.low   .card-stock-label { color: #E74C3C; }
  .card-add-disabled {
    width: 100%; padding: 10px; border-radius: 10px;
    border: none; font-size: .88rem; font-weight: 600;
    background: #EDE8F5; color: #B8A0D8; cursor: not-allowed;
  }

  /* Skeleton */
  .skeleton {
    background: linear-gradient(90deg,#f0eaff 25%,#f8f4ff 50%,#f0eaff 75%);
    background-size: 200%; animation: shimmer 1.4s infinite; border-radius: 10px;
  }

  /* ════════════════════════════════════════
     TESTIMONIOS
  ════════════════════════════════════════ */
  .testimonials {
    padding: 40px 14px;
    background: linear-gradient(135deg,#2D1B4E 0%,#4A2D7A 60%,#6B3FA0 100%);
  }
  .test-eyebrow {
    font-size: .82rem; font-weight: 700; letter-spacing: .18em;
    text-transform: uppercase; color: var(--lila-light); margin-bottom: 6px;
  }
  .test-title {
    font-family: 'Playfair Display', serif; font-size: 1.5rem;
    font-weight: 700; color: #fff; margin-bottom: 18px;
  }
  .test-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
  .test-card {
    background: rgba(255,255,255,.08); backdrop-filter: blur(10px);
    border: 1px solid rgba(255,255,255,.14); border-radius: 18px; padding: 20px 18px;
  }
  .test-stars { color: #F4A7C3; font-size: .95rem; margin-bottom: 9px; }
  .test-text { color: rgba(255,255,255,.85); font-size: .95rem; line-height: 1.68; margin-bottom: 13px; }
  .test-author { display: flex; align-items: center; gap: 10px; }
  .test-avatar {
    width: 38px; height: 38px; border-radius: 50%;
    background: linear-gradient(135deg,var(--lila-light),var(--pink));
    display: flex; align-items: center; justify-content: center;
    color: #fff; font-weight: 700; font-size: .95rem; flex-shrink: 0;
  }
  .test-name { color: #fff; font-weight: 600; font-size: .95rem; }

  /* ════════════════════════════════════════
     FEATURES
  ════════════════════════════════════════ */
  .features { padding: 30px 14px; background: #fff; }
  .feat-grid {
    display: grid; grid-template-columns: repeat(2,1fr);
    gap: 10px; max-width: 1400px; margin: 0 auto;
  }
  .feat-card {
    text-align: center; padding: 18px 12px;
    background: var(--lila-xlight); border-radius: 16px;
    border: 1.5px solid rgba(155,114,207,.14);
    transition: transform .25s;
  }
  .feat-card:hover { transform: translateY(-3px); }
  .feat-icon { font-size: 1.9rem; margin-bottom: 8px; }
  .feat-title { font-weight: 700; font-size: .97rem; margin-bottom: 4px; color: var(--dark); }
  .feat-sub { font-size: .85rem; color: var(--brown); line-height: 1.5; }

  /* ════════════════════════════════════════
     FOOTER
  ════════════════════════════════════════ */
  .footer { background: #1A0D30; padding: 36px 14px 20px; color: rgba(255,255,255,.55); font-size: .92rem; }
  .footer-inner { max-width: 1400px; margin: 0 auto; }
  .footer-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 28px; }
  .footer-brand { grid-column: 1 / -1; }
  .footer-logo {
    font-family: 'Playfair Display', serif; font-size: 1.45rem; font-weight: 900;
    background: linear-gradient(135deg,var(--lila-light),var(--pink));
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 9px;
  }
  .footer-desc { line-height: 1.72; color: rgba(255,255,255,.38); font-size: .9rem; }
  .footer-heading {
    color: var(--lila-light); font-weight: 700; letter-spacing: .09em;
    text-transform: uppercase; font-size: .78rem; margin-bottom: 12px;
  }
  .footer-links a {
    display: block; margin-bottom: 8px; color: rgba(255,255,255,.4);
    text-decoration: none; transition: color .2s; font-size: .92rem;
  }
  .footer-links a:hover { color: var(--lila-light); }
  .footer-bottom {
    border-top: 1px solid rgba(155,114,207,.14); padding-top: 16px;
    display: flex; flex-direction: column; gap: 10px;
    text-align: center; font-size: .88rem;
  }

  /* ✅ PWA INSTALL BANNER */
  .pwa-banner {
    position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
    width: calc(100% - 32px); max-width: 420px;
    background: linear-gradient(135deg, #7B5EA7, #9B72CF);
    border-radius: 20px; padding: 16px 18px;
    display: flex; align-items: center; gap: 14px;
    box-shadow: 0 8px 32px rgba(123,94,167,.45);
    z-index: 9999; animation: pwa-slide-up .4s cubic-bezier(.22,1,.36,1);
  }
  @keyframes pwa-slide-up {
    from { opacity:0; transform: translateX(-50%) translateY(30px); }
    to   { opacity:1; transform: translateX(-50%) translateY(0); }
  }
  .pwa-banner-icon {
    width: 52px; height: 52px; border-radius: 14px; flex-shrink: 0;
    background: rgba(255,255,255,.15); display: flex; align-items: center;
    justify-content: center; font-size: 1.6rem;
  }
  .pwa-banner-text { flex: 1; }
  .pwa-banner-title { color: #fff; font-weight: 700; font-size: 1rem; line-height: 1.3; }
  .pwa-banner-sub { color: rgba(255,255,255,.75); font-size: .82rem; margin-top: 2px; }
  .pwa-banner-btn {
    background: #fff; color: #7B5EA7; border: none; border-radius: 50px;
    padding: 10px 18px; font-weight: 700; font-size: .9rem; cursor: pointer;
    white-space: nowrap; flex-shrink: 0; transition: transform .15s;
  }
  .pwa-banner-btn:active { transform: scale(.95); }
  .sw-update-bar {
    position: fixed; top: 0; left: 0; right: 0; z-index: 10000;
    background: linear-gradient(90deg, #5E35B1, #9B72CF);
    color: #fff; display: flex; align-items: center; justify-content: center;
    gap: 14px; padding: 11px 16px; font-size: .92rem; font-weight: 600;
    box-shadow: 0 2px 12px rgba(94,53,177,.4);
    animation: pwa-slide-up .35s ease;
  }
  .sw-update-btn {
    background: #fff; color: #7B5EA7; border: none; border-radius: 50px;
    padding: 6px 18px; font-weight: 700; font-size: .85rem; cursor: pointer;
  }
  .pwa-banner-close {
    position: absolute; top: 8px; right: 10px; background: none; border: none;
    color: rgba(255,255,255,.6); font-size: 1rem; cursor: pointer; padding: 4px;
  }

  .social-icons { display: flex; gap: 8px; justify-content: center; }
  .social-icon {
    width: 36px; height: 36px; border-radius: 10px;
    background: rgba(155,114,207,.12); border: 1px solid rgba(155,114,207,.22);
    display: flex; align-items: center; justify-content: center;
    font-size: .95rem; transition: all .2s; text-decoration: none;
  }
  .social-icon:hover { background: rgba(155,114,207,.28); transform: translateY(-2px); }

  /* ════════════════════════════════════════
     OVERLAY GLOBAL
  ════════════════════════════════════════ */
  .overlay { position: fixed; inset: 0; background: rgba(45,27,78,.44); z-index: 998; backdrop-filter: blur(4px); }

  /* ════════════════════════════════════════
     CARRITO
  ════════════════════════════════════════ */
  .cart-overlay {
    position: fixed; inset: 0; background: rgba(45,27,78,.45);
    z-index: 998; backdrop-filter: blur(2px);
    animation: fadeIn .22s ease;
  }
  .cart-panel {
    position: fixed; top: 0; right: 0; bottom: 0;
    width: 100%; max-width: 420px;
    background: var(--cream);
    z-index: 999; display: flex; flex-direction: column;
    box-shadow: -8px 0 48px rgba(120,80,180,.22);
    animation: slideRight .32s cubic-bezier(.22,1,.36,1);
  }
  .cart-header {
    padding: 20px 18px 16px; border-bottom: 1px solid var(--lila-xlight);
    display: flex; justify-content: space-between; align-items: center;
    background: linear-gradient(135deg,#f8f4ff,var(--cream));
    flex-shrink: 0;
  }
  .cart-title { font-family: 'Playfair Display', serif; font-size: 1.35rem; font-weight: 700; color: var(--dark); }
  .cart-count-badge {
    background: linear-gradient(135deg,var(--lila),var(--lila-dark));
    color: #fff; font-size: .72rem; font-weight: 800;
    border-radius: 20px; padding: 2px 9px; margin-left: 8px;
  }
  .close-btn { background: rgba(155,114,207,.1); border: none; font-size: 1.1rem; color: var(--lila-dark); padding: 8px; border-radius: 50%; width:36px; height:36px; display:flex; align-items:center; justify-content:center; transition: all .2s; }
  .close-btn:hover { background: var(--lila-xlight); color: var(--lila); transform: scale(1.08); }
  .cart-items { flex: 1; overflow-y: auto; padding: 14px 16px; }
  .cart-items::-webkit-scrollbar { width: 4px; }
  .cart-items::-webkit-scrollbar-thumb { background: var(--lila-light); border-radius: 4px; }
  .cart-empty { text-align: center; padding: 52px 20px; color: var(--muted); }
  .cart-item {
    display: flex; gap: 12px; margin-bottom: 12px;
    background: #fff; border-radius: 16px; padding: 12px;
    box-shadow: 0 2px 12px rgba(120,80,180,.09);
    border: 1px solid rgba(155,114,207,.08);
    transition: box-shadow .2s;
  }
  .cart-item:hover { box-shadow: 0 4px 18px rgba(120,80,180,.16); }
  .cart-item-img { width: 74px; height: 74px; border-radius: 12px; object-fit: cover; flex-shrink: 0; border: 2px solid var(--lila-xlight); }
  .cart-item-info { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: space-between; }
  .cart-item-name { font-size: .9rem; font-weight: 700; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--dark); }
  .cart-item-cat { font-size: .72rem; color: var(--muted); margin-bottom: 4px; }
  .cart-item-price { color: var(--lila); font-weight: 800; font-size: 1rem; margin-bottom: 8px; }
  .qty-controls { display: flex; align-items: center; gap: 6px; }
  .qty-btn {
    width: 30px; height: 30px; border-radius: 8px;
    border: 1.5px solid var(--lila-xlight); background: #fff;
    font-weight: 700; color: var(--lila-dark); font-size: .95rem;
    display: flex; align-items: center; justify-content: center; transition: all .2s;
  }
  .qty-btn:hover { border-color: var(--lila); background: var(--lila-xlight); }
  .qty-val { font-weight: 700; min-width: 22px; text-align: center; font-size: .95rem; color: var(--dark); }
  .cart-remove { background: none; border: none; margin-left: auto; color: #F4A7C3; font-size: 1.1rem; padding: 4px; transition: transform .2s; }
  .cart-remove:hover { transform: scale(1.2); color: #e05a7a; }
  .cart-footer {
    padding: 16px 18px 28px; border-top: 2px solid var(--lila-xlight);
    background: linear-gradient(180deg,var(--cream),#f4eeff);
    flex-shrink: 0;
  }
  .cart-row { display: flex; justify-content: space-between; font-size: .92rem; color: var(--brown); margin-bottom: 6px; }
  .cart-total-row {
    display: flex; justify-content: space-between; font-weight: 800; font-size: 1.1rem;
    margin: 12px 0 16px; padding: 12px 0 0; border-top: 1px solid var(--lila-xlight);
    color: var(--dark);
  }
  .checkout-btn {
    width: 100%; padding: 16px;
    background: linear-gradient(135deg,var(--lila),var(--lila-dark));
    color: #fff; border: none; border-radius: 14px;
    font-weight: 800; font-size: 1rem; box-shadow: var(--shadow); transition: all .3s;
    letter-spacing: .02em;
  }
  .checkout-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 32px rgba(155,114,207,.45); }

  /* ════════════════════════════════════════
     CHECKOUT MODAL
  ════════════════════════════════════════ */
  .modal-wrap { position: fixed; inset: 0; z-index: 1100; display: flex; align-items: flex-end; }
  .modal {
    background: var(--cream); border-radius: 22px 22px 0 0; width: 100%;
    max-height: 95vh; overflow-y: auto;
    box-shadow: 0 -8px 50px rgba(120,80,180,.28); animation: slideUp .36s ease;
  }
  .modal-header {
    padding: 18px 18px 14px; border-bottom: 1px solid var(--lila-xlight);
    display: flex; justify-content: space-between; align-items: center;
    position: sticky; top: 0; background: var(--cream); z-index: 2;
  }
  .modal-title { font-family: 'Playfair Display', serif; font-size: 1.25rem; font-weight: 700; color: var(--dark); }
  .modal-body { padding: 16px 18px 36px; }
  .form-section {
    font-size: .8rem; font-weight: 800; letter-spacing: .14em;
    text-transform: uppercase; color: var(--lila); margin: 16px 0 9px;
  }
  .form-group { margin-bottom: 12px; }
  .form-label { display: block; font-size: .9rem; font-weight: 600; color: var(--brown); margin-bottom: 5px; }
  .form-input {
    width: 100%; padding: 13px 14px; border-radius: 12px;
    border: 2px solid var(--lila-xlight); background: #fff;
    font-size: 1rem; outline: none; transition: border .2s; color: var(--dark);
  }
  .form-input:focus { border-color: var(--lila); }
  .secure-note {
    display: flex; align-items: center; gap: 6px;
    font-size: .88rem; color: var(--muted); justify-content: center; margin-top: 9px;
  }
  .pay-btn {
    width: 100%; padding: 15px;
    background: linear-gradient(135deg,var(--lila),var(--lila-dark));
    color: #fff; border: none; border-radius: 14px;
    font-weight: 800; font-size: 1rem; letter-spacing: .03em;
    box-shadow: var(--shadow); margin-top: 14px; transition: all .3s;
  }
  .pay-btn:hover:not(:disabled) { transform: translateY(-1px); }
  .pay-btn:disabled { opacity: .7; cursor: wait; }
  .order-summary-box {
    background: var(--lila-xlight); border: 1px solid rgba(155,114,207,.2);
    border-radius: 13px; padding: 14px; margin-bottom: 14px;
  }
  .summary-item { display: flex; justify-content: space-between; font-size: .9rem; color: var(--brown); margin-bottom: 4px; }
  .summary-total {
    display: flex; justify-content: space-between; font-weight: 700;
    margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(155,114,207,.2);
    font-size: 1rem;
  }

  /* SUCCESS */
  .success-modal { text-align: center; padding: 40px 18px 48px; }
  .success-icon {
    width: 68px; height: 68px; border-radius: 50%;
    background: linear-gradient(135deg,#A8DEC4,#52B788);
    display: flex; align-items: center; justify-content: center;
    font-size: 2rem; margin: 0 auto 16px;
  }
  .success-title { font-family: 'Playfair Display', serif; font-size: 1.75rem; font-weight: 700; margin-bottom: 10px; color: var(--dark); }
  .success-sub { color: var(--muted); font-size: .95rem; line-height: 1.7; margin-bottom: 20px; }
  .order-num-badge {
    background: var(--lila-xlight); border: 1px solid var(--lila-light);
    border-radius: 10px; padding: 8px 18px; display: inline-block;
    font-weight: 700; color: var(--lila); font-size: .92rem; margin-bottom: 22px;
    font-family: 'Playfair Display', serif;
  }

  /* ════════════════════════════════════════
     TOAST
  ════════════════════════════════════════ */
  .toast {
    position: fixed; bottom: 20px; left: 14px; right: 14px; z-index: 9999;
    background: linear-gradient(135deg,var(--lila),var(--lila-dark));
    color: #fff; padding: 13px 18px; border-radius: 14px;
    font-weight: 600; font-size: .95rem;
    box-shadow: 0 8px 28px rgba(155,114,207,.45);
    animation: slideLeft .4s ease; text-align: center;
  }
  .error-banner {
    background: #FFF0F8; border: 1px solid #F4A7C3;
    border-radius: 12px; padding: 12px 14px; color: #8B2252;
    font-size: .9rem; margin: 12px 0; display: flex; align-items: center; gap: 8px;
  }

  /* ════════════════════════════════════════
     WHATSAPP FLOTANTE
  ════════════════════════════════════════ */
  .wa-float {
    position: fixed; bottom: 22px; left: 16px; z-index: 800;
    display: flex; align-items: center; gap: 10px;
    background: linear-gradient(135deg, #9B72CF, #6B3FA0);
    color: #fff; text-decoration: none;
    padding: 11px 18px 11px 13px;
    border-radius: 50px;
    box-shadow: 0 6px 24px rgba(107,63,160,.45);
    font-weight: 700; font-size: .9rem;
    transition: transform .25s, box-shadow .25s;
    border: none; cursor: pointer;
  }
  .wa-float:hover, .wa-float:active { transform: scale(1.05); box-shadow: 0 10px 32px rgba(107,63,160,.6); }
  .wa-float-icon {
    width: 34px; height: 34px;
    background: rgba(255,255,255,.2);
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 1.15rem; flex-shrink: 0;
  }
  .wa-float-text { display: flex; flex-direction: column; line-height: 1.2; }
  .wa-float-label { font-size: .7rem; opacity: .8; font-weight: 400; }
  .wa-float-cta { font-size: .88rem; font-weight: 700; }

  /* ════════════════════════════════════════
     TABLET  ≥ 580px
  ════════════════════════════════════════ */
  @media (min-width: 580px) {
    .nav-inner { height: 64px; }
    .promo-strip { top: 64px; }
    .logo { font-size: 1.5rem; }
    .nav-search-wrap { max-width: 260px; }
    .cart-btn { width: 46px; height: 46px; font-size: 1.15rem; }
    .hbg-btn { width: 46px; height: 46px; font-size: 1.3rem; }
    .cats-bar { top: 98px; }
    .hero { padding: 166px 22px 44px; }
    .hero-title { font-size: 2.9rem; }
    .hero-btns { flex-direction: row; }
    .btn-primary, .btn-outline { width: auto; }
    .stat-n { font-size: 1.7rem; }
    .product-grid { gap: 14px; }
    .card-img-wrap { height: 220px; }
    .card-name { font-size: 1rem; }
    .test-grid { grid-template-columns: repeat(2,1fr); }
    .cart-panel { max-width: 400px; }
    .modal-wrap { align-items: center; justify-content: center; padding: 22px; }
    .modal { border-radius: 24px; max-width: 500px; max-height: 90vh; }
    @keyframes slideUp { from{transform:scale(.9) translateY(20px);opacity:0} to{transform:scale(1) translateY(0);opacity:1} }
    .toast { left: 20px; right: auto; max-width: 320px; text-align: left; }
    .wa-float { bottom: 28px; left: 24px; padding: 12px 20px 12px 14px; }
  }

  /* ════════════════════════════════════════
     DESKTOP  ≥ 860px — nav links, hide hamburger
  ════════════════════════════════════════ */
  @media (min-width: 860px) {
    .nav { padding: 0 5%; }
    .nav-inner { height: 70px; }
    .logo { font-size: 1.7rem; }
    .hbg-btn { display: flex; }
    .nav-links {
      display: flex; gap: 22px; list-style: none; flex: 1; justify-content: center;
    }
    .nav-links a {
      font-size: .88rem; font-weight: 600; letter-spacing: .07em; text-transform: uppercase;
      color: var(--brown); text-decoration: none; transition: color .2s; padding: 5px 0;
    }
    .nav-links a:hover, .nav-links a.active { color: var(--lila); border-bottom: 2px solid var(--lila-light); }
    .nav-search-wrap { max-width: 220px; }
    .promo-strip { top: 70px; }
    .cats-bar { display: none; }

    .hero { padding: 140px 5% 70px; }
    .hero-inner { display: grid; grid-template-columns: 1fr 1fr; gap: 55px; align-items: center; }
    .hero-mosaic { display: grid; grid-template-columns: 1fr 1fr; gap: 13px; }
    .mosaic-img {
      border-radius: 20px; overflow: hidden;
      box-shadow: 0 14px 44px rgba(120,80,180,.2); border: 3px solid rgba(255,255,255,.85);
    }
    .mosaic-img img { width: 100%; height: 100%; object-fit: cover; transition: transform .5s; }
    .mosaic-img:hover img { transform: scale(1.05); }
    .mosaic-img.wide { grid-column: 2 / 4; }
    .hero-title { font-size: 3.6rem; }
    .hero-btns { flex-direction: row; }
    .stat-n { font-size: 1.9rem; }

    .section-wrap { padding: 0 24px; }
    .products-section { padding: 48px 0 64px; }
    .cat-pills {
      display: flex; gap: 9px; flex-wrap: wrap; margin-bottom: 32px;
    }
    .cat-pill {
      padding: 10px 22px; border-radius: 50px; font-weight: 600; font-size: .9rem;
      border: 2px solid var(--lila-xlight); background: #fff; color: var(--brown);
      transition: all .28s; box-shadow: var(--shadow-sm);
    }
    .cat-pill:hover { transform: translateY(-2px); }
    .cat-pill.active { border-color: transparent; color: #fff; box-shadow: 0 6px 20px rgba(155,114,207,.38); }
    .section-title { font-size: 2.3rem; margin-bottom: 30px; }
    .product-grid { grid-template-columns: repeat(3,1fr); gap: 20px; }
    .card-img-wrap { height: 220px; }
    .card-body { padding: 14px 16px 16px; }
    .card-name { font-size: 1.02rem; }
    .card-price { font-size: 1.2rem; }
    .card-add { padding: 11px; font-size: .93rem; }
    .testimonials { padding: 68px 5%; }
    .test-grid { grid-template-columns: repeat(2,1fr); gap: 16px; }
    .test-title { font-size: 2.1rem; }
    .features { padding: 56px 5%; }
    .feat-grid { grid-template-columns: repeat(4,1fr); gap: 20px; }
    .footer { padding: 55px 5% 24px; }
    .footer-grid { grid-template-columns: 2fr 1fr 1fr; gap: 40px; }
    .footer-brand { grid-column: auto; }
    .footer-bottom { flex-direction: row; text-align: left; }
    .social-icons { justify-content: flex-start; }
    .cart-panel { max-width: 440px; }
  }

  @media (min-width: 1100px) {
    .hero-title { font-size: 4.2rem; }
    .product-grid { grid-template-columns: repeat(4,1fr); gap: 22px; }
    .card-img-wrap { height: 220px; }
    .test-grid { grid-template-columns: repeat(4,1fr); }
    .footer-grid { grid-template-columns: 2fr 1fr 1fr 1fr; gap: 50px; }
  }

  @media (max-height: 500px) and (orientation: landscape) {
    .hero { padding: 130px 5% 28px; }
    .hero-title { font-size: 1.9rem; }
    .cats-bar { position: relative; top: auto; }
    .modal { max-height: 98vh; }
  }


  /* ════════════════════════════════════════
     WAKE-UP SCREEN — backend durmiendo
  ════════════════════════════════════════ */
  .wake-screen{
    position:fixed;inset:0;z-index:9999;
    background:linear-gradient(160deg,#EDE4FF 0%,#F5EEFF 45%,#FDE8F5 100%);
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    gap:20px;padding:24px;
  }
  .wake-logo{
    font-family:'Playfair Display',serif;font-size:2.8rem;font-weight:900;
    background:linear-gradient(135deg,var(--lila),var(--pink));
    -webkit-background-clip:text;-webkit-text-fill-color:transparent;
    margin-bottom:4px;
  }
  .wake-spinner{
    width:52px;height:52px;border-radius:50%;
    border:4px solid var(--lila-xlight);
    border-top-color:var(--lila);
    animation:spin 0.9s linear infinite;
  }
  @keyframes spin{to{transform:rotate(360deg)}}
  .wake-msg{
    font-size:1.05rem;font-weight:600;color:var(--brown);
    text-align:center;max-width:280px;line-height:1.6;
  }
  .wake-sub{
    font-size:.88rem;color:var(--muted);text-align:center;
    max-width:260px;line-height:1.55;
  }
  .wake-dots span{
    display:inline-block;width:8px;height:8px;border-radius:50%;
    background:var(--lila);margin:0 3px;
    animation:dotBounce 1.2s infinite ease-in-out;
  }
  .wake-dots span:nth-child(2){animation-delay:.2s}
  .wake-dots span:nth-child(3){animation-delay:.4s}
  @keyframes dotBounce{0%,80%,100%{transform:scale(0.7);opacity:.5}40%{transform:scale(1.1);opacity:1}}

  /* ════════════════════════════════════════
     💌 NEWSLETTER POPUP
  ════════════════════════════════════════ */
  .nl-overlay {
    position: fixed; inset: 0; z-index: 2000;
    background: rgba(45,27,78,.65); backdrop-filter: blur(6px);
    display: flex; align-items: center; justify-content: center; padding: 18px;
  }
  .nl-box {
    background: #fff; border-radius: 28px; max-width: 400px; width: 100%;
    overflow: hidden; box-shadow: 0 24px 80px rgba(120,80,180,.35);
    animation: popIn .4s cubic-bezier(.34,1.56,.64,1);
  }
  @keyframes popIn { from{transform:scale(.75);opacity:0} to{transform:scale(1);opacity:1} }
  .nl-hero {
    background: linear-gradient(140deg,#2D1B4E 0%,#6B3FA0 50%,#C04898 100%);
    padding: 32px 28px 24px; text-align: center; position: relative;
  }
  .nl-close {
    position: absolute; top: 14px; right: 14px;
    background: rgba(255,255,255,.18); border: none; border-radius: 50%;
    width: 32px; height: 32px; font-size: 1.1rem; color: #fff; cursor: pointer;
    display: flex; align-items: center; justify-content: center; transition: all .2s;
  }
  .nl-close:hover { background: rgba(255,255,255,.32); }
  .nl-emoji { font-size: 3rem; margin-bottom: 10px; }
  .nl-title {
    font-family: 'Playfair Display', serif; font-size: 1.8rem; font-weight: 900;
    color: #fff; line-height: 1.15; margin-bottom: 8px;
  }
  .nl-sub { color: rgba(255,255,255,.82); font-size: .95rem; line-height: 1.5; }
  .nl-body { padding: 24px 28px 28px; }
  .nl-input-row { display: flex; gap: 8px; margin-bottom: 12px; }
  .nl-input {
    flex: 1; padding: 13px 16px; border-radius: 50px;
    border: 2px solid var(--lila-xlight); font-size: .97rem;
    outline: none; transition: border .2s; color: var(--dark);
  }
  .nl-input:focus { border-color: var(--lila); }
  .nl-btn {
    padding: 13px 18px; border-radius: 50px; border: none;
    background: linear-gradient(135deg,var(--lila),var(--lila-dark));
    color: #fff; font-weight: 700; font-size: .9rem; cursor: pointer;
    white-space: nowrap; transition: all .2s;
  }
  .nl-btn:hover { transform: scale(1.04); }
  .nl-disclaimer { font-size: .78rem; color: var(--muted); text-align: center; }
  .nl-coupon {
    background: var(--lila-xlight); border: 2px dashed var(--lila-light);
    border-radius: 18px; padding: 18px; text-align: center; margin-bottom: 14px;
  }
  .nl-coupon-label { font-size: .82rem; color: var(--brown); margin-bottom: 6px; }
  .nl-coupon-code {
    font-family: 'Playfair Display', serif; font-size: 2rem; font-weight: 900;
    color: var(--lila-dark); letter-spacing: .08em;
  }
  .nl-coupon-copy {
    margin-top: 10px; padding: 9px 20px; border-radius: 50px;
    background: var(--lila); color: #fff; border: none;
    font-weight: 700; font-size: .88rem; cursor: pointer; transition: all .2s;
  }
  .nl-coupon-copy:hover { background: var(--lila-dark); }

  /* ════════════════════════════════════════
     🚪 EXIT INTENT POPUP
  ════════════════════════════════════════ */
  .exit-overlay {
    position: fixed; inset: 0; z-index: 2100;
    background: rgba(45,27,78,.7); backdrop-filter: blur(8px);
    display: flex; align-items: center; justify-content: center; padding: 18px;
  }
  .exit-box {
    background: linear-gradient(160deg,#2D1B4E,#4A2D7A);
    border-radius: 28px; max-width: 380px; width: 100%;
    padding: 36px 28px 28px; text-align: center; position: relative;
    box-shadow: 0 24px 80px rgba(45,27,78,.6);
    animation: popIn .35s cubic-bezier(.34,1.56,.64,1);
  }
  .exit-close {
    position: absolute; top: 14px; right: 14px;
    background: rgba(255,255,255,.15); border: none; border-radius: 50%;
    width: 32px; height: 32px; color: #fff; cursor: pointer; font-size: 1.1rem;
    display: flex; align-items: center; justify-content: center;
  }
  .exit-emoji { font-size: 3.5rem; margin-bottom: 12px; }
  .exit-title {
    font-family: 'Playfair Display', serif; font-size: 1.7rem; font-weight: 900;
    color: #fff; margin-bottom: 10px; line-height: 1.2;
  }
  .exit-sub { color: rgba(255,255,255,.75); font-size: .93rem; line-height: 1.55; margin-bottom: 22px; }
  .exit-code {
    background: rgba(255,255,255,.12); border: 2px dashed rgba(255,255,255,.35);
    border-radius: 14px; padding: 14px; margin-bottom: 18px;
  }
  .exit-code-label { font-size: .78rem; color: rgba(255,255,255,.6); margin-bottom: 4px; }
  .exit-code-val {
    font-family: 'Playfair Display', serif; font-size: 1.9rem; font-weight: 900;
    color: var(--pink); letter-spacing: .1em;
  }
  .exit-btn {
    width: 100%; padding: 15px; border-radius: 50px; border: none;
    background: linear-gradient(135deg,#F4A7C3,#D4719B);
    color: #fff; font-weight: 800; font-size: 1rem; cursor: pointer;
    margin-bottom: 10px; transition: all .2s;
  }
  .exit-btn:hover { transform: scale(1.03); }
  .exit-skip { background: none; border: none; color: rgba(255,255,255,.4); font-size: .82rem; cursor: pointer; }
  .exit-skip:hover { color: rgba(255,255,255,.7); }

  /* ════════════════════════════════════════
     📤 SHARE BUTTON en tarjeta de producto
  ════════════════════════════════════════ */
  .card-share {
    position: absolute; bottom: 100px; right: 8px;
    background: rgba(255,255,255,.95); border: none; border-radius: 50%;
    width: 34px; height: 34px; font-size: .95rem; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 2px 10px rgba(0,0,0,.15); transition: all .2s;
    z-index: 5;
  }
  .card-share:hover { transform: scale(1.12); background: #fff; }

  /* Share popup mini */
  .share-popup {
    position: fixed; z-index: 3000;
    background: #fff; border-radius: 18px;
    padding: 14px 18px; box-shadow: 0 12px 40px rgba(120,80,180,.28);
    display: flex; flex-direction: column; gap: 8px; min-width: 220px;
    animation: popIn .25s ease;
  }
  .share-title { font-size: .8rem; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; color: var(--muted); margin-bottom: 4px; }
  .share-opt {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 12px; border-radius: 12px; border: none; background: none;
    font-size: .95rem; font-weight: 600; color: var(--dark);
    cursor: pointer; transition: all .15s; text-align: left;
  }
  .share-opt:hover { background: var(--lila-xlight); color: var(--lila-dark); }
  .share-opt-ico { width: 32px; height: 32px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; flex-shrink: 0; }
  .share-wa-ico { background: #dcf8c6; }
  .share-cp-ico { background: var(--lila-xlight); }

  /* ════════════════════════════════════════
     ⭐ MODAL DE RESEÑAS
  ════════════════════════════════════════ */
  .review-overlay {
    position: fixed; inset: 0; z-index: 2000;
    background: rgba(45,27,78,.6); backdrop-filter: blur(6px);
    display: flex; align-items: flex-end; justify-content: center;
  }
  .review-box {
    background: #fff; border-radius: 28px 28px 0 0; width: 100%;
    max-width: 500px; padding: 28px 24px 36px;
    box-shadow: 0 -8px 50px rgba(120,80,180,.3);
    animation: slideUp .35s ease;
  }
  .review-title {
    font-family: 'Playfair Display', serif; font-size: 1.3rem; font-weight: 700;
    color: var(--dark); margin-bottom: 4px;
  }
  .review-sub { font-size: .88rem; color: var(--muted); margin-bottom: 18px; }
  .star-select { display: flex; gap: 8px; margin-bottom: 18px; }
  .star-btn {
    font-size: 2rem; background: none; border: none; cursor: pointer;
    transition: transform .15s; line-height: 1;
  }
  .star-btn:hover { transform: scale(1.15); }
  .review-textarea {
    width: 100%; padding: 13px 16px; border-radius: 14px;
    border: 2px solid var(--lila-xlight); font-size: .97rem;
    outline: none; resize: none; color: var(--dark); font-family: inherit;
    transition: border .2s; margin-bottom: 14px;
  }
  .review-textarea:focus { border-color: var(--lila); }
  .review-submit {
    width: 100%; padding: 14px; border-radius: 14px; border: none;
    background: linear-gradient(135deg,var(--lila),var(--lila-dark));
    color: #fff; font-weight: 800; font-size: 1rem; cursor: pointer;
    box-shadow: var(--shadow); transition: all .2s;
  }
  .review-submit:hover { transform: translateY(-1px); }

  /* ════════════════════════════════════════
     🎁 MODAL DE REFERIDOS
  ════════════════════════════════════════ */
  .ref-overlay {
    position: fixed; inset: 0; z-index: 2000;
    background: rgba(45,27,78,.6); backdrop-filter: blur(6px);
    display: flex; align-items: center; justify-content: center; padding: 18px;
  }
  .ref-box {
    background: #fff; border-radius: 28px; max-width: 400px; width: 100%;
    overflow: hidden; box-shadow: 0 24px 80px rgba(120,80,180,.35);
    animation: popIn .4s cubic-bezier(.34,1.56,.64,1);
  }
  .ref-hero {
    background: linear-gradient(140deg,#C04898,#F4A7C3);
    padding: 30px 24px 22px; text-align: center; position: relative;
  }
  .ref-close {
    position: absolute; top: 12px; right: 12px;
    background: rgba(255,255,255,.2); border: none; border-radius: 50%;
    width: 30px; height: 30px; color: #fff; cursor: pointer; font-size: 1rem;
    display: flex; align-items: center; justify-content: center;
  }
  .ref-emoji { font-size: 2.8rem; margin-bottom: 8px; }
  .ref-title { font-family: 'Playfair Display', serif; font-size: 1.6rem; font-weight: 900; color: #fff; margin-bottom: 6px; }
  .ref-sub { color: rgba(255,255,255,.85); font-size: .88rem; line-height: 1.5; }
  .ref-body { padding: 22px 24px 26px; }
  .ref-steps { margin-bottom: 18px; }
  .ref-step { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px; }
  .ref-step-num {
    width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
    background: var(--lila-xlight); color: var(--lila-dark);
    display: flex; align-items: center; justify-content: center;
    font-size: .82rem; font-weight: 800;
  }
  .ref-step-text { font-size: .9rem; color: var(--brown); line-height: 1.45; padding-top: 4px; }
  .ref-link-box {
    background: var(--lila-xlight); border-radius: 14px;
    padding: 12px 14px; display: flex; align-items: center; gap: 10px;
    margin-bottom: 14px;
  }
  .ref-link-val { flex: 1; font-size: .82rem; color: var(--brown); font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ref-copy-btn {
    padding: 8px 16px; border-radius: 50px; border: none;
    background: var(--lila); color: #fff; font-weight: 700; font-size: .82rem;
    cursor: pointer; transition: all .2s; white-space: nowrap; flex-shrink: 0;
  }
  .ref-copy-btn:hover { background: var(--lila-dark); }
  .ref-wa-btn {
    width: 100%; padding: 13px; border-radius: 14px; border: none;
    background: linear-gradient(135deg,#25D366,#128C7E);
    color: #fff; font-weight: 800; font-size: .97rem; cursor: pointer;
    transition: all .2s;
  }
  .ref-wa-btn:hover { transform: translateY(-1px); }

  /* ════════════════════════════════════════
     ⭐ BOTÓN DE RESEÑA EN TARJETA
  ════════════════════════════════════════ */
  .card-review-btn {
    display: flex; align-items: center; gap: 5px;
    background: none; border: 1px solid var(--lila-xlight);
    border-radius: 50px; padding: 5px 10px; font-size: .78rem;
    color: var(--muted); cursor: pointer; margin-top: 6px;
    transition: all .18s; width: fit-content;
  }
  .card-review-btn:hover { border-color: var(--lila); color: var(--lila); background: var(--lila-xlight); }

  /* ════════════════════════════════════════
     🎁 BANNER REFERIDOS en footer/drawer
  ════════════════════════════════════════ */
  .ref-banner {
    background: linear-gradient(135deg,#F0E8FF,#FDE8F5);
    border: 1.5px solid var(--lila-xlight); border-radius: 16px;
    padding: 14px 16px; display: flex; align-items: center; gap: 12px;
    cursor: pointer; transition: all .2s; margin: 10px 20px;
  }
  .ref-banner:hover { border-color: var(--lila-light); transform: translateY(-1px); }
  .ref-banner-ico { font-size: 1.6rem; flex-shrink: 0; }
  .ref-banner-text { flex: 1; }
  .ref-banner-title { font-size: .95rem; font-weight: 700; color: var(--dark); }
  .ref-banner-sub { font-size: .78rem; color: var(--muted); margin-top: 2px; }

  /* ✅ RENDIMIENTO — content-visibility ahorra re-layouts en secciones off-screen */
  .testimonials-section, .features-section, .footer {
    content-visibility: auto;
    contain-intrinsic-size: 0 400px;
  }

  /* ✅ COUNTDOWN TIMER — en tarjetas con descuento */
  .countdown-badge {
    display: inline-flex; align-items: center; gap: 4px;
    background: linear-gradient(135deg, #FF6B6B, #EE4444);
    color: #fff; font-size: .68rem; font-weight: 700;
    padding: 3px 8px; border-radius: 20px; letter-spacing: .3px;
    margin-top: 4px;
  }
  .countdown-badge .cd-time { font-variant-numeric: tabular-nums; }

  /* ✅ SUSPENSE FALLBACK */
  .lazy-spinner {
    display: flex; align-items: center; justify-content: center;
    min-height: 60px;
  }
  .lazy-spinner::after {
    content: ''; width: 28px; height: 28px;
    border: 3px solid var(--lila-xlight);
    border-top-color: var(--lila);
    border-radius: 50%; animation: spin .7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ✅ ASPECT-RATIO en imágenes evita layout shift (CLS) */
  .prod-card-img { aspect-ratio: 3/4; overflow: hidden; background: var(--lila-xlight); }
  .prod-card-img img { width: 100%; height: 100%; object-fit: cover; transition: transform .4s ease; }

  /* ════════════════════════════════════════
     🔴 SOCIAL PROOF EN TIEMPO REAL
  ════════════════════════════════════════ */
  .social-proof-toast {
    position: fixed; bottom: 90px; left: 16px; z-index: 8000;
    background: #fff; border-radius: 16px;
    box-shadow: 0 8px 32px rgba(45,27,78,.22);
    padding: 12px 16px 12px 14px;
    display: flex; align-items: center; gap: 12px;
    max-width: 300px; min-width: 240px;
    border-left: 4px solid var(--lila);
    animation: sp-slide-in .4s cubic-bezier(.22,1,.36,1);
    cursor: pointer;
  }
  .social-proof-toast.hiding {
    animation: sp-slide-out .35s ease forwards;
  }
  @keyframes sp-slide-in {
    from { transform: translateX(-120%); opacity: 0; }
    to   { transform: translateX(0);     opacity: 1; }
  }
  @keyframes sp-slide-out {
    from { transform: translateX(0);     opacity: 1; }
    to   { transform: translateX(-120%); opacity: 0; }
  }
  .sp-avatar {
    width: 44px; height: 44px; border-radius: 50%; flex-shrink: 0;
    background: linear-gradient(135deg, var(--lila), var(--pink));
    display: flex; align-items: center; justify-content: center;
    font-size: 1.2rem; font-weight: 700; color: #fff;
  }
  .sp-body { flex: 1; min-width: 0; }
  .sp-name { font-weight: 700; font-size: .9rem; color: var(--dark); }
  .sp-action { font-size: .82rem; color: var(--brown); margin-top: 2px; line-height: 1.4; }
  .sp-time { font-size: .72rem; color: var(--muted); margin-top: 3px; }

  /* ════════════════════════════════════════
     💎 PUNTOS DE FIDELIDAD
  ════════════════════════════════════════ */
  .loyalty-badge {
    display: inline-flex; align-items: center; gap: 6px;
    background: linear-gradient(135deg, #FFD700, #FFA500);
    color: #7B4F00; border-radius: 30px; padding: 5px 13px;
    font-size: .82rem; font-weight: 800; cursor: pointer;
    border: none; box-shadow: 0 2px 10px rgba(255,165,0,.35);
    transition: transform .2s; white-space: nowrap;
  }
  .loyalty-badge:hover { transform: scale(1.05); }
  .loyalty-modal-overlay {
    position: fixed; inset: 0; background: rgba(45,27,78,.5);
    z-index: 3500; display: flex; align-items: flex-end;
    backdrop-filter: blur(4px);
  }
  .loyalty-modal {
    width: 100%; max-width: 480px; margin: 0 auto;
    background: #fff; border-radius: 28px 28px 0 0;
    padding: 28px 22px 36px; animation: slideUp .35s cubic-bezier(.22,1,.36,1);
  }
  .loyalty-header {
    text-align: center; margin-bottom: 22px;
  }
  .loyalty-crown { font-size: 2.8rem; margin-bottom: 8px; }
  .loyalty-title {
    font-family: 'Playfair Display', serif; font-size: 1.4rem;
    font-weight: 800; color: var(--dark); margin-bottom: 4px;
  }
  .loyalty-sub { font-size: .9rem; color: var(--brown); }
  .loyalty-points-big {
    background: linear-gradient(135deg, #FFD700, #FFA500);
    border-radius: 20px; padding: 18px; text-align: center;
    margin-bottom: 20px;
  }
  .loyalty-points-num {
    font-family: 'Playfair Display', serif; font-size: 2.8rem;
    font-weight: 900; color: #7B4F00;
  }
  .loyalty-points-label { font-size: .9rem; color: #9B6500; font-weight: 600; margin-top: 2px; }
  .loyalty-how {
    background: var(--lila-xlight); border-radius: 16px;
    padding: 16px; margin-bottom: 16px;
  }
  .loyalty-how-title { font-weight: 800; font-size: .88rem; color: var(--dark); margin-bottom: 12px; text-transform: uppercase; letter-spacing: .08em; }
  .loyalty-how-row {
    display: flex; justify-content: space-between; align-items: center;
    padding: 8px 0; border-bottom: 1px solid rgba(155,114,207,.15);
    font-size: .88rem;
  }
  .loyalty-how-row:last-child { border-bottom: none; }
  .loyalty-how-pts { font-weight: 800; color: var(--lila-dark); }
  .loyalty-redeem {
    width: 100%; padding: 14px; border: none; border-radius: 50px;
    background: linear-gradient(135deg, var(--lila), var(--lila-dark));
    color: #fff; font-weight: 700; font-size: 1rem; cursor: pointer;
    box-shadow: var(--shadow); transition: all .2s; margin-top: 4px;
  }
  .loyalty-redeem:hover { filter: brightness(1.07); transform: translateY(-1px); }
  .loyalty-tier {
    display: flex; gap: 8px; margin-bottom: 16px;
  }
  .loyalty-tier-item {
    flex: 1; text-align: center; padding: 10px 6px;
    border-radius: 12px; border: 2px solid var(--lila-xlight);
    font-size: .78rem;
  }
  .loyalty-tier-item.active {
    border-color: #FFD700; background: linear-gradient(135deg,#FFF8DC,#FFF0A0);
  }
  .loyalty-tier-ico { font-size: 1.3rem; margin-bottom: 4px; }
  .loyalty-tier-name { font-weight: 700; color: var(--dark); }
  .loyalty-tier-pts { font-size: .72rem; color: var(--muted); margin-top: 2px; }

  /* ════════════════════════════════════════
     🔔 NOTIFICACIONES PUSH BANNER
  ════════════════════════════════════════ */
  .push-banner {
    position: fixed; top: 68px; left: 50%; transform: translateX(-50%);
    width: calc(100% - 28px); max-width: 420px;
    background: linear-gradient(135deg, #2D1B4E, #4A2D7A);
    border-radius: 18px; padding: 14px 16px;
    display: flex; align-items: center; gap: 12px;
    box-shadow: 0 8px 32px rgba(45,27,78,.45);
    z-index: 9990; animation: pwa-slide-up .4s cubic-bezier(.22,1,.36,1);
  }
  .push-banner-ico {
    font-size: 1.8rem; flex-shrink: 0;
  }
  .push-banner-text { flex: 1; }
  .push-banner-title { color: #fff; font-weight: 700; font-size: .95rem; }
  .push-banner-sub { color: rgba(255,255,255,.7); font-size: .78rem; margin-top: 2px; }
  .push-banner-btn {
    background: linear-gradient(135deg,var(--lila-light),var(--pink));
    color: var(--dark); border: none; border-radius: 50px;
    padding: 8px 16px; font-weight: 700; font-size: .85rem;
    cursor: pointer; white-space: nowrap; flex-shrink: 0;
  }
  .push-banner-close {
    position: absolute; top: 8px; right: 10px;
    background: none; border: none; color: rgba(255,255,255,.5);
    font-size: .95rem; cursor: pointer; padding: 2px;
  }

  /* ════════════════════════════════════════
     🛒 CARRITO ABANDONADO — sticky reminder
  ════════════════════════════════════════ */
  .abandoned-banner {
    position: fixed; bottom: 16px; right: 16px; z-index: 7000;
    background: #25D366; border-radius: 18px;
    padding: 14px 18px; max-width: 300px;
    box-shadow: 0 8px 28px rgba(37,211,102,.4);
    animation: sp-slide-in .4s cubic-bezier(.22,1,.36,1);
    cursor: pointer;
  }
  .abandoned-banner-title { color: #fff; font-weight: 800; font-size: .95rem; margin-bottom: 4px; }
  .abandoned-banner-sub { color: rgba(255,255,255,.88); font-size: .82rem; line-height: 1.4; }
  .abandoned-banner-close {
    position: absolute; top: 8px; right: 10px;
    background: none; border: none; color: rgba(255,255,255,.7);
    font-size: .95rem; cursor: pointer; padding: 2px;
  }

  /* ════════════════════════════════════════
     🛍️ UPSELL en carrito
  ════════════════════════════════════════ */
  .upsell-section {
    padding: 14px 18px; border-top: 1px solid var(--lila-xlight);
    background: #FAF7FF;
  }
  .upsell-title {
    font-size: .82rem; font-weight: 800; text-transform: uppercase;
    letter-spacing: .1em; color: var(--lila-dark); margin-bottom: 10px;
  }
  .upsell-scroll {
    display: flex; gap: 10px; overflow-x: auto;
    scrollbar-width: none; -webkit-overflow-scrolling: touch;
  }
  .upsell-scroll::-webkit-scrollbar { display: none; }
  .upsell-card {
    flex-shrink: 0; width: 110px; border-radius: 12px;
    background: #fff; border: 1.5px solid var(--lila-xlight);
    overflow: hidden; cursor: pointer; transition: all .2s;
  }
  .upsell-card:hover { border-color: var(--lila); transform: translateY(-2px); }
  .upsell-img {
    width: 100%; height: 80px; object-fit: contain;
    background: #F8F4FF; padding: 4px;
  }
  .upsell-info { padding: 6px 8px 8px; }
  .upsell-name { font-size: .75rem; font-weight: 600; color: var(--dark); line-height: 1.3; margin-bottom: 4px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .upsell-price { font-size: .8rem; font-weight: 800; color: var(--lila-dark); }
  .upsell-add {
    width: 100%; padding: 5px; background: var(--lila-xlight);
    border: none; color: var(--lila-dark); font-size: .75rem;
    font-weight: 700; cursor: pointer; transition: background .2s;
  }
  .upsell-add:hover { background: var(--lila-light); }

  /* ✅ CAMPO DE CUPÓN en checkout */
  .coupon-row {
    display: flex; gap: 8px; margin: 14px 0 4px;
  }
  .coupon-input {
    flex: 1; padding: 10px 14px; border-radius: 10px;
    border: 2px solid var(--lila-xlight); font-size: .95rem;
    outline: none; transition: border .2s; font-family: inherit;
    text-transform: uppercase; letter-spacing: 1px;
  }
  .coupon-input:focus { border-color: var(--lila); }
  .coupon-apply-btn {
    padding: 10px 16px; background: var(--lila); color: #fff;
    border: none; border-radius: 10px; font-weight: 700;
    font-size: .9rem; cursor: pointer; white-space: nowrap;
    transition: background .2s;
  }
  .coupon-apply-btn:hover { background: var(--lila-dark); }
  .coupon-applied-tag {
    display: flex; align-items: center; gap: 8px;
    background: #e8f5e9; border: 1.5px solid #81c784;
    border-radius: 10px; padding: 8px 12px;
    font-size: .9rem; color: #2e7d32; font-weight: 600;
    margin: 8px 0;
  }
  .coupon-remove { background: none; border: none; cursor: pointer; font-size: 1rem; color: #e53935; margin-left: auto; }
  .coupon-error { font-size: .82rem; color: #e53935; margin: 2px 0 8px; }
  .discount-row { color: #2e7d32; font-weight: 700; }

  /* ✅ PANTALLA DE ÉXITO mejorada */
  .success-track-btn {
    display: block; width: 100%; margin-top: 12px; padding: 13px;
    background: linear-gradient(135deg, #9B72CF, #7B5EA7);
    color: #fff; border: none; border-radius: 50px;
    font-size: 1rem; font-weight: 700; cursor: pointer;
    font-family: inherit;
  }
  .success-wa-btn {
    display: block; width: 100%; margin-top: 10px; padding: 13px;
    background: #25D366; color: #fff; border: none; border-radius: 50px;
    font-size: 1rem; font-weight: 700; cursor: pointer;
    font-family: inherit; text-decoration: none; text-align: center;
  }
  .success-order-detail {
    background: var(--lila-xlight); border-radius: 12px;
    padding: 14px 16px; margin: 14px 0; text-align: left;
  }
  .success-order-detail p { font-size: .88rem; color: var(--brown); margin-bottom: 6px; }
  .success-order-detail strong { color: var(--dark); }
`;

const CATEGORIES = [
  { key:"BOLSOS",           label:"👜 Bolsos y Morrales",  ico:"👜", color:"linear-gradient(135deg,#9B72CF,#7B5EA7)" },
  { key:"BILLETERAS",       label:"💳 Billeteras",         ico:"💳", color:"linear-gradient(135deg,#B8A0D8,#9B72CF)" },
  { key:"MAQUILLAJE",       label:"💄 Maquillaje",         ico:"💄", color:"linear-gradient(135deg,#F4A7C3,#D4719B)" },
  { key:"CAPILAR",          label:"✨ Capilar",             ico:"✨", color:"linear-gradient(135deg,#A8D4F0,#72B7D4)" },
  { key:"CUIDADO_PERSONAL", label:"🧴 Cuidado Personal",  ico:"🧴", color:"linear-gradient(135deg,#FFD6A5,#F4A261)" },
  { key:"ACCESORIOS",       label:"💍 Accesorios",         ico:"💍", color:"linear-gradient(135deg,#FFC8DD,#E07A9A)" },
];
const TESTIMONIALS = [
  { name:"Valentina R.", text:"¡Me llegó todo perfecto! La calidad es increíble, ya hice mi 3ra compra 💕", stars:5 },
  { name:"Camila T.",    text:"El bolso es exactamente como en la foto. La galería me convenció de comprarlo 🛍️", stars:5 },
  { name:"Sofía M.",     text:"El video del producto fue clave. Llegó igual y el maquillaje es increíble 💋", stars:5 },
  { name:"Isabella V.",  text:"Envío rapidísimo y el empaque es hermoso. 100% recomendada 🌸", stars:5 },
];

// ✅ COUNTDOWN TIMER — urgencia en productos con descuento
const CountdownTimer = memo(function CountdownTimer({ endHour = 23, endMin = 59 }) {
  const calcLeft = () => {
    const now = new Date();
    const end = new Date(); end.setHours(endHour, endMin, 59, 0);
    if (end <= now) end.setDate(end.getDate() + 1);
    const diff = Math.max(0, Math.floor((end - now) / 1000));
    const h = String(Math.floor(diff / 3600)).padStart(2, "0");
    const m = String(Math.floor((diff % 3600) / 60)).padStart(2, "0");
    const s = String(diff % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  };
  const [left, setLeft] = useState(calcLeft);
  useEffect(() => {
    const t = setInterval(() => setLeft(calcLeft()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="countdown-badge">
      🔥 Oferta termina en <span className="cd-time">{left}</span>
    </span>
  );
});

// ✅ SUSPENSE FALLBACK — spinner mientras carga componente lazy
const SpinFallback = () => <div className="lazy-spinner" />;

export default function App() {
  const [adminMode,setAdminMode]             = useState(false);
  const [trackingMode,setTrackingMode]       = useState(false);
  const [activeCategory,setActiveCategory]   = useState("BOLSOS");
  const [products,setProducts]               = useState([]);
  const [loading,setLoading]                 = useState(true);
  const [error,setError]                     = useState(null);
  const [cartPulse, setCartPulse] = useState(false);
  const [cart,setCart] = useState(() => {
    try {
      const saved = localStorage.getItem("kosmica_cart");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [wishlist,setWishlist] = useState(() => {
    try {
      const saved = localStorage.getItem("kosmica_wishlist");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [cartOpen,setCartOpen]               = useState(false);
  const [checkoutOpen,setCheckoutOpen]       = useState(false);
  const [orderSuccess,setOrderSuccess]       = useState(null);
  const [search,setSearch]                   = useState("");
  const [scrolled,setScrolled]               = useState(false);
  const [toast,setToast]                     = useState("");
  const [paying,setPaying]                   = useState(false);
  const [selectedProduct,setSelectedProduct] = useState(null);
  const [drawerOpen,setDrawerOpen]           = useState(false);
  const [form,setForm] = useState({name:"",email:"",phone:"",document:"",city:"",neighborhood:"",address:"",notes:""});
  const [selectedShippingMethod, setSelectedShippingMethod] = useState(null);
  // ── VIRAL FEATURES ──
  const [newsletterOpen, setNewsletterOpen]   = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [couponVisible, setCouponVisible]     = useState(false);
  // ✅ CUPÓN DE DESCUENTO — estado del campo y validación
  const [couponInput, setCouponInput]         = useState("");
  const [appliedCoupon, setAppliedCoupon]     = useState(null); // {code, pct}
  const [couponError, setCouponError]         = useState("");
  // ✅ REFERIDO — capturar ?ref= de la URL al cargar
  const [referralCode] = useState(() => {
    const p = new URLSearchParams(window.location.search);
    return p.get("ref") || null;
  });
  // ✅ CÓDIGO ÚNICO de referida — se genera y guarda en localStorage la primera vez
  const [myReferralCode] = useState(() => {
    try {
      const saved = localStorage.getItem("kosmica_my_ref");
      if (saved) return saved;
      // Generar código único: 6 chars alfanuméricos aleatorios
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      const code = Array.from({length:6}, ()=>chars[Math.floor(Math.random()*chars.length)]).join("");
      localStorage.setItem("kosmica_my_ref", code);
      return code;
    } catch { return "KOSMICA"; }
  });
  const [exitPopupShown, setExitPopupShown]   = useState(false);
  const [exitPopupOpen, setExitPopupOpen]     = useState(false);
  const [reviewModal, setReviewModal]         = useState(null); // product object
  const [reviewStars, setReviewStars]         = useState(0);
  const [reviewText, setReviewText]           = useState("");
  const [referralOpen, setReferralOpen]       = useState(false);
  const [referralCopied, setReferralCopied]   = useState(false);
  const [sharePopup, setSharePopup]           = useState(null); // {product, x, y}
  const [sharePos, setSharePos]               = useState({top:0,left:0});
  // ✅ PWA — botón de instalación propio
  const [pwaPrompt, setPwaPrompt]             = useState(null);
  const [pwaVisible, setPwaVisible]           = useState(false);
  const [swUpdated, setSwUpdated]              = useState(false);
  // ── SOCIAL PROOF en tiempo real ──
  const [socialProof, setSocialProof]         = useState(null);
  const [spHiding, setSpHiding]               = useState(false);
  // ── PUNTOS DE FIDELIDAD ──
  const [loyaltyOpen, setLoyaltyOpen]         = useState(false);
  const [loyaltyPoints] = useState(() => {
    try { return parseInt(localStorage.getItem("kosmica_pts") || "0", 10); }
    catch { return 0; }
  });
  const [displayPoints, setDisplayPoints]     = useState(loyaltyPoints);
  // ── NOTIFICACIONES PUSH ──
  const [pushBanner, setPushBanner]           = useState(false);
  const [pushGranted, setPushGranted]         = useState(false);
  // ── CARRITO ABANDONADO ──
  const [abandonedBanner, setAbandonedBanner] = useState(false);
  const abandonedTimerRef                     = useRef(null);
  // ── UPSELL productos sugeridos ──
  const [upsellProducts, setUpsellProducts]   = useState([]);

  const SHIPPING_OPTIONS = [
    {
      id: "local",
      label: "🏍️ Entrega Local",
      cost: 15000,
      desc: "Medellín y Área Metropolitana",
      detail: "Tu pedido llega en máximo 24 horas. Un domiciliario te contactará para confirmar dirección y horario.",
      badge: "⚡ Más rápido"
    },
    {
      id: "national",
      label: "📦 Envío Nacional",
      cost: 20000,
      desc: "Todo Colombia",
      detail: "Se envía al día siguiente de tu compra. Un asesor te contactará para seguimiento y asesoría personalizada.",
      badge: "🇨🇴 A todo el país"
    }
  ];
  const ref = useRef(null);

  // ✅ Productos placeholder — se muestran INSTANTÁNEO mientras el servidor despierta
  const PLACEHOLDER_PRODUCTS = Array(6).fill(null).map((_,i) => ({
    id: `ph-${i}`, name: '', price: 0, imageUrl: null,
    badge: null, rating: 0, reviewCount: 0, __placeholder: true,
  }));

  const fetchProducts = useCallback(async () => {
    setError(null);
    // Mostrar placeholders inmediatamente para que la UI no quede vacía
    setProducts(PLACEHOLDER_PRODUCTS);
    setLoading(true);
    try {
      const d = await productAPI.getByCategory(activeCategory);
      const list = Array.isArray(d) ? d : (d.content||[]);
      setProducts(list);
    } catch(e){
      setProducts([]);
      setError(e.message);
    }
    finally{ setLoading(false); }
  },[activeCategory]);

  useEffect(()=>{ fetchProducts(); },[fetchProducts]);

  // ✅ PERSISTENCIA — guardar carrito y wishlist en localStorage
  // Se ejecuta cada vez que cambian, así nunca se pierden al refrescar
  useEffect(()=>{
    try { localStorage.setItem("kosmica_cart", JSON.stringify(cart)); }
    catch(e) { console.warn("No se pudo guardar el carrito:", e); }
  }, [cart]);

  useEffect(()=>{
    try { localStorage.setItem("kosmica_wishlist", JSON.stringify(wishlist)); }
    catch(e) { console.warn("No se pudo guardar wishlist:", e); }
  }, [wishlist]);

  useEffect(()=>{
    const fn=()=>setScrolled(window.scrollY>50);
    window.addEventListener("scroll",fn);
    return ()=>window.removeEventListener("scroll",fn);
  },[]);

  // ── Newsletter: mostrar popup a los 9 segundos ──
  useEffect(()=>{
    const seen = localStorage.getItem("kosmica_nl_seen");
    if(seen) return;
    const t = setTimeout(()=>{ setNewsletterOpen(true); }, 9000);
    return ()=>clearTimeout(t);
  },[]);

  // ── Exit intent: detectar cuando el mouse sale por arriba ──
  useEffect(()=>{
    const seen = localStorage.getItem("kosmica_exit_seen");
    if(seen) return;
    const handle = (e)=>{
      if(e.clientY <= 8 && !exitPopupShown){
        setExitPopupShown(true);
        setExitPopupOpen(true);
        localStorage.setItem("kosmica_exit_seen","1");
      }
    };
    document.addEventListener("mouseleave", handle);
    return ()=>document.removeEventListener("mouseleave", handle);
  },[exitPopupShown]);

  // ── Cerrar share popup al click fuera ──
  useEffect(()=>{
    if(!sharePopup) return;
    const fn = ()=>setSharePopup(null);
    setTimeout(()=>document.addEventListener("click",fn),100);
    return ()=>document.removeEventListener("click",fn);
  },[sharePopup]);
  useEffect(()=>{
    if(!search.trim()){ fetchProducts(); return; }
    const t=setTimeout(async()=>{
      setLoading(true);
      try{ const d=await productAPI.search(search); setProducts(Array.isArray(d)?d:(d.content||[])); }
      catch(e){ setError(e.message); }
      finally{ setLoading(false); }
    },350);
    return()=>clearTimeout(t);
  },[search,fetchProducts]);

  // ✅ useMemo — evita recalcular productos filtrados en cada render
  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter(p =>
      (p.name||"").toLowerCase().includes(q) ||
      (p.description||"").toLowerCase().includes(q)
    );
  }, [products, search]);

  // ✅ Schema.org Product — Google Shopping muestra foto+precio gratis
  useEffect(() => {
    if (!products.length) return;
    const schemas = products.slice(0, 10).map(p => ({
      "@context": "https://schema.org",
      "@type": "Product",
      name: p.name,
      description: p.description || "",
      image: imgUrl(p.imageUrl || p.imageUrls?.[0]),
      offers: {
        "@type": "Offer",
        priceCurrency: "COP",
        price: p.discountPrice || p.price,
        availability: p.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
        url: `https://www.kosmica.com.co/?producto=${p.id}`
      }
    }));
    let el = document.getElementById("schema-products");
    if (!el) { el = document.createElement("script"); el.id = "schema-products"; el.type = "application/ld+json"; document.head.appendChild(el); }
    el.textContent = JSON.stringify(schemas);
  }, [products]);

  // ✅ PWA — capturar el evento de instalación del navegador
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setPwaPrompt(e);
      setPwaVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setPwaVisible(false));

    // ✅ Escuchar aviso del SW cuando hay nueva versión desplegada
    const swMsg = (e) => {
      if (e.data?.type === "SW_UPDATED") setSwUpdated(true);
    };
    navigator.serviceWorker?.addEventListener("message", swMsg);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      navigator.serviceWorker?.removeEventListener("message", swMsg);
    };
  }, []);

  // ✅ PWA — recarga automática cuando el SW detecta nueva versión
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const handleMessage = (e) => {
      if (e.data?.type === "SW_UPDATED") {
        // Pequeño delay para que el SW termine de activarse
        setTimeout(() => window.location.reload(), 800);
      }
    };
    navigator.serviceWorker.addEventListener("message", handleMessage);
    return () => navigator.serviceWorker.removeEventListener("message", handleMessage);
  }, []);

  const installPwa = async () => {
    if (!pwaPrompt) return;
    pwaPrompt.prompt();
    const { outcome } = await pwaPrompt.userChoice;
    if (outcome === "accepted") { setPwaVisible(false); setPwaPrompt(null); }
  };

  // ════════════════════════════════════════
  // 🎭 SOCIAL PROOF — Compras REALES desde el backend
  // ════════════════════════════════════════

  // Emojis por categoría para hacer el mensaje más visual
  const CAT_EMOJI = {
    BOLSOS: "👜", BILLETERAS: "💳", MAQUILLAJE: "💄",
    CAPILAR: "✨", CUIDADO_PERSONAL: "🧴", ACCESORIOS: "💍",
  };

  // Fallback si no hay compras recientes (primeros días del lanzamiento)
  const SOCIAL_PROOF_FALLBACK = [
    { name:"Valentina R.", city:"Medellín", action:"acaba de comprar en Kosmica 💜" },
    { name:"Camila T.",    city:"Bogotá",   action:"acaba de hacer su primera compra ✨" },
    { name:"Isabella M.",  city:"Cali",     action:"acaba de unirse a Kosmica 🌸" },
  ];

  const spQueueRef = useRef([]);
  const spIdxRef   = useRef(0);

  const showNextSP = useCallback(() => {
    const queue = spQueueRef.current;
    if (!queue.length) return;
    const ev = queue[spIdxRef.current % queue.length];
    spIdxRef.current++;
    setSpHiding(false);
    setSocialProof(ev);
    setTimeout(() => setSpHiding(true),  4500);
    setTimeout(() => setSocialProof(null), 5000);
  }, []);

  useEffect(() => {
    const API = process.env.REACT_APP_API_URL || "https://kosmica-backend.onrender.com";

    const loadActivity = async () => {
      try {
        const res = await fetch(`${API}/api/orders/recent-activity`);
        if (!res.ok) throw new Error("no data");
        const data = await res.json();

        if (Array.isArray(data) && data.length > 0) {
          // Convertir respuesta del backend al formato del componente
          spQueueRef.current = data.map(ev => {
            const emoji = CAT_EMOJI[ev.category] || "💜";
            const mins  = Number(ev.minutesAgo);
            let timeLabel;
            if (mins < 2)        timeLabel = "Hace un momento";
            else if (mins < 60)  timeLabel = `Hace ${mins} min`;
            else if (mins < 120) timeLabel = "Hace 1 hora";
            else                 timeLabel = `Hace ${Math.floor(mins/60)} horas`;

            return {
              name:      ev.name,
              city:      ev.city,
              action:    `acaba de comprar ${ev.product} ${emoji}`,
              timeLabel,
              real:      true,
            };
          });
        } else {
          // Sin compras aún — usar fallback
          spQueueRef.current = SOCIAL_PROOF_FALLBACK;
        }
      } catch {
        spQueueRef.current = SOCIAL_PROOF_FALLBACK;
      }
    };

    // Cargar al montar y refrescar cada 5 minutos
    loadActivity();
    const refresh = setInterval(loadActivity, 5 * 60 * 1000);

    // Mostrar toasts: primera vez a los 10s, luego cada 20s
    const first    = setTimeout(showNextSP, 10000);
    const interval = setInterval(showNextSP, 20000);

    return () => {
      clearTimeout(first);
      clearInterval(interval);
      clearInterval(refresh);
    };
  // eslint-disable-next-line
  }, [showNextSP]);

  // ════════════════════════════════════════
  // 🔔 NOTIFICACIONES PUSH — pedir permiso
  // ════════════════════════════════════════
  useEffect(() => {
    if (!("Notification" in window)) return;
    // Ya tiene permiso — no molestamos
    if (Notification.permission === "granted") { setPushGranted(true); return; }
    // Ya denegó — tampoco
    if (Notification.permission === "denied") return;
    // Mostrar banner propio después de 20s (no el prompt nativo directo)
    const t = setTimeout(() => {
      const seen = localStorage.getItem("kosmica_push_seen");
      if (!seen) setPushBanner(true);
    }, 20000);
    return () => clearTimeout(t);
  }, []);

  const requestPush = async () => {
    setPushBanner(false);
    localStorage.setItem("kosmica_push_seen", "1");
    if (!("Notification" in window)) return;
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      setPushGranted(true);
      // Notificación de bienvenida inmediata
      new Notification("¡Bienvenida a Kosmica! 💜", {
        body: "Serás la primera en enterarte de ofertas exclusivas 🎁",
        icon: "/icon-192.png",
      });
    }
  };

  // ════════════════════════════════════════
  // 🛒 CARRITO ABANDONADO — detectar inactividad con items en carrito
  // ════════════════════════════════════════
  useEffect(() => {
    if (abandonedTimerRef.current) clearTimeout(abandonedTimerRef.current);
    if (cart.length === 0 || cartOpen || checkoutOpen) {
      setAbandonedBanner(false);
      return;
    }
    // Si hay items en el carrito y el usuario está inactivo 3 minutos
    abandonedTimerRef.current = setTimeout(() => {
      setAbandonedBanner(true);
    }, 3 * 60 * 1000);
    return () => clearTimeout(abandonedTimerRef.current);
  }, [cart, cartOpen, checkoutOpen]);

  const sendAbandonedCartWA = () => {
    setAbandonedBanner(false);
    const itemsText = cart.map(i => `• ${i.name} ×${i.qty} — ${fmtCOP(Number(i.price)*i.qty)}`).join("\n");
    const total = fmtCOP(cart.reduce((s,i)=>s+Number(i.price)*i.qty,0));
    const text = `Hola Kosmica! 💜 Dejé estos productos en mi carrito y me gustaría completar mi compra:\n\n${itemsText}\n\nTotal: ${total}\n\n¿Pueden ayudarme? 🙏`;
    window.open(`https://wa.me/573043927148?text=${encodeURIComponent(text)}`, "_blank");
  };

  // ════════════════════════════════════════
  // 🛍️ UPSELL — cargar productos sugeridos cuando se abre el carrito
  // ════════════════════════════════════════
  useEffect(() => {
    if (!cartOpen || cart.length === 0) return;
    // Categorías que NO están en el carrito
    const cartCats = [...new Set(cart.map(i => i.category).filter(Boolean))];
    const otherCats = CATEGORIES.map(c => c.key).filter(k => !cartCats.includes(k));
    const targetCat = otherCats[Math.floor(Math.random() * otherCats.length)] || "BOLSOS";
    productAPI.getByCategory(targetCat)
      .then(d => {
        const list = (Array.isArray(d) ? d : (d.content||[])).slice(0,6);
        // Excluir lo que ya está en el carrito
        const cartIds = new Set(cart.map(i=>i.id));
        setUpsellProducts(list.filter(p=>!cartIds.has(p.id)).slice(0,4));
      })
      .catch(()=>{});
  }, [cartOpen]);

  // ════════════════════════════════════════
  // 💎 PUNTOS — sumar por compra y guardar
  // ════════════════════════════════════════
  const awardLoyaltyPoints = (total) => {
    const pts = Math.floor(total / 1000); // 1 punto por cada $1.000 COP
    try {
      const current = parseInt(localStorage.getItem("kosmica_pts") || "0", 10);
      const newTotal = current + pts;
      localStorage.setItem("kosmica_pts", String(newTotal));
      setDisplayPoints(newTotal);
    } catch(_) {}
    return pts;
  };

  const showToast=msg=>{ setToast(msg); setTimeout(()=>setToast(""),2800); };
  const addToCart=(p,qty=1)=>{
    setCart(prev=>{
      const ex=prev.find(i=>i.id===p.id);
      if(ex) return prev.map(i=>i.id===p.id?{...i,qty:i.qty+qty}:i);
      return [...prev,{...p,qty}];
    });
    setCartPulse(true); setTimeout(()=>setCartPulse(false), 500);
    showToast(`✨ ${p.name} agregado`);
    // ✅ Meta Pixel: AddToCart
    if (typeof window.fbq === 'function') {
      window.fbq('track', 'AddToCart', {
        content_name: p.name,
        content_ids: [String(p.id)],
        content_type: 'product',
        value: Number(p.price) * qty || 0,
        currency: 'COP',
      });
    }
  };
  const removeFromCart=id=>setCart(prev=>prev.filter(i=>i.id!==id));
  const updateQty=(id,d)=>setCart(prev=>prev.map(i=>i.id===id?{...i,qty:Math.max(1,i.qty+d)}:i));
  const toggleWishlist=id=>setWishlist(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]);

  const cartTotal=cart.reduce((s,i)=>s+Number(i.price)*i.qty,0);
  const cartCount=cart.reduce((s,i)=>s+i.qty,0);
  // ✅ DESCUENTO DEL CUPÓN aplicado al subtotal
  const couponDiscount = appliedCoupon ? Math.round(cartTotal * appliedCoupon.pct / 100) : 0;
  const cartTotalWithDiscount = cartTotal - couponDiscount;
  const [carriers, setCarriers]             = useState([]);
  const [carriersLoading, setCarriersLoading] = useState(false);
  const [carriersError, setCarriersError]   = useState(null);
  const [selectedCarrier, setSelectedCarrier] = useState(null);
  const [carrierModalOpen, setCarrierModalOpen] = useState(false); // desactivado - envío por asesor
  const shipping   = selectedShippingMethod ? selectedShippingMethod.cost : 0;
  const grandTotal = cartTotalWithDiscount + shipping;

  // Llama al backend que consulta la API real de Envia
  const fetchRates = async () => {
    setCarriersLoading(true);
    setCarriersError(null);
    setSelectedCarrier(null);
    setCarriers([]);
    try {
      const backendUrl = process.env.REACT_APP_API_URL || 'https://kosmica-backend.onrender.com';
      const resp = await fetch(`${backendUrl}/api/shipping/rates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:         form.name  || 'Cliente',
          phone:        form.phone || '3000000000',
          city:         form.city,
          neighborhood: form.neighborhood,
          address:      form.address,
        }),
      });
      const data = await resp.json();
      if (!resp.ok || data.error) {
        const errMsg = typeof data.error === 'string'
          ? data.error
          : data.error?.message || data.message || `Error ${resp.status} al cotizar`;
        throw new Error(errMsg);
      }
      const sorted = (data.carriers || []).sort((a, b) => a.price - b.price);
      setCarriers(sorted);
    } catch (e) {
      setCarriersError(e.message);
    } finally {
      setCarriersLoading(false);
    }
  };

  const handleCheckout=async e=>{
    e.preventDefault();
    if (!selectedShippingMethod) { showToast("⚠️ Selecciona un método de envío"); return; }
    setPaying(true);
    try{
      const mpItems=cart.map(i=>({
        id:i.id, name:i.name,
        description:i.description||i.name,
        quantity:i.qty, price:Number(i.price),
      }));
      // Agregar envío como ítem adicional
      mpItems.push({
        id:"shipping", name:selectedShippingMethod.label,
        description:selectedShippingMethod.desc,
        quantity:1, price:selectedShippingMethod.cost,
      });
      // ✅ Si hay cupón, agregar ítem de descuento negativo
      if (appliedCoupon && couponDiscount > 0) {
        mpItems.push({
          id:"discount", name:`Descuento ${appliedCoupon.code}`,
          description: appliedCoupon.label,
          quantity:1, price: -couponDiscount,
        });
      }
      const result=await orderAPI.createPaymentIntent(grandTotal,"COP",mpItems);
      const orderResp = await orderAPI.createOrder({
        name:form.name, email:form.email, phone:form.phone, document:form.document,
        city:form.city, neighborhood:form.neighborhood, address:form.address, notes:form.notes,
        paymentMethod:"MERCADOPAGO",
        paymentIntentId:result.preferenceId,
        shippingMethod:selectedShippingMethod.id,
        shippingCost:selectedShippingMethod.cost,
        items:cart.map(i=>({productId:i.id,quantity:i.qty})),
        // ✅ CUPÓN Y REFERIDO — se guardan en la orden para el admin
        couponCode: appliedCoupon ? appliedCoupon.code : null,
        couponDiscount: couponDiscount,
        referralCode: referralCode,
      });
      setCart([]);
      setAppliedCoupon(null);
      setSelectedShippingMethod(null);
      setCheckoutOpen(false);
      // ✅ Limpiar carrito del localStorage al completar compra
      try { localStorage.removeItem("kosmica_cart"); } catch(_) {}
      // ✅ PUNTOS DE FIDELIDAD — sumar por compra
      const pts = awardLoyaltyPoints(grandTotal);
      if (pts > 0) showToast(`💎 ¡Ganaste ${pts} puntos Kosmica!`);
      // ✅ Meta Pixel: Purchase
      if (typeof window.fbq === 'function') {
        window.fbq('track', 'InitiateCheckout', {
          num_items: cart.reduce((s,i) => s + i.qty, 0),
          value: grandTotal,
          currency: 'COP',
        });
      }
      window.location.href=result.initPoint;
    }catch(e){ showToast("⚠️ "+e.message); }
    finally{ setPaying(false); }
  };

  const scrollTo=()=>ref.current?.scrollIntoView({behavior:"smooth"});
  const selectCat=cat=>{ setActiveCategory(cat); setSearch(""); setDrawerOpen(false); scrollTo(); };

  // ── VIRAL FUNCTIONS ──
  const submitNewsletter = async (e) => {
    e.preventDefault();
    if(!newsletterEmail.trim()) return;
    localStorage.setItem("kosmica_nl_seen","1");
    localStorage.setItem("kosmica_nl_email", newsletterEmail);
    setCouponVisible(true);
    // Trackear con Meta Pixel y TikTok
    if(typeof window.fbq==="function") window.fbq("track","Lead",{content_name:"newsletter"});
    if(typeof window.ttq==="object") window.ttq.track("Subscribe");
    // ✅ Enviar código por correo y WhatsApp desde el backend
    try {
      await fetch("/api/coupons/welcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newsletterEmail, code: "BIENVENIDA10" })
      });
    } catch(_) { /* silencioso — el cupón se muestra igual en pantalla */ }
  };

  // ✅ VALIDAR Y APLICAR CUPÓN en el checkout
  const VALID_COUPONS = {
    "BIENVENIDA10": { pct: 10, label: "10% bienvenida" },
    "KOSMICA15":    { pct: 15, label: "15% especial" },
  };
  const applyCoupon = () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    if (appliedCoupon) { setCouponError("Ya hay un cupón aplicado."); return; }
    const found = VALID_COUPONS[code];
    if (!found) { setCouponError("Cupón inválido o ya expirado."); return; }
    setAppliedCoupon({ code, ...found });
    setCouponError("");
    setCouponInput("");
    showToast(`🎉 Cupón ${code} aplicado — ${found.pct}% de descuento`);
  };
  const removeCoupon = () => { setAppliedCoupon(null); setCouponInput(""); setCouponError(""); };

  const copyNlCoupon = () => {
    navigator.clipboard.writeText("BIENVENIDA10").then(()=>showToast("💜 Cupón BIENVENIDA10 copiado"));
  };
  const openSharePopup = (e, product) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setSharePos({ top: rect.top + window.scrollY - 10, left: Math.min(rect.left, window.innerWidth - 240) });
    setSharePopup(product);
  };
  const shareViaWhatsApp = (product) => {
    const url = `https://www.kosmica.com.co/?producto=${product.id}`;
    const text = `¡Mira esto en Kosmica! 💜\n*${product.name}*\n${fmtCOP(product.price)}\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`,"_blank");
    setSharePopup(null);
    if(typeof window.ttq==="object") window.ttq.track("Share",{content_id:String(product.id)});
  };
  const copyProductLink = (product) => {
    const url = `https://www.kosmica.com.co/?producto=${product.id}`;
    navigator.clipboard.writeText(url).then(()=>showToast("🔗 Link copiado al portapapeles"));
    setSharePopup(null);
  };
  const submitReview = () => {
    if(reviewStars===0){ showToast("⭐ Selecciona cuántas estrellas"); return; }
    if(!reviewText.trim()){ showToast("✍️ Escribe tu reseña"); return; }
    showToast(`💜 ¡Gracias por tu reseña, ${form.name||"amiga"}!`);
    setReviewModal(null); setReviewStars(0); setReviewText("");
    if(typeof window.fbq==="function") window.fbq("track","SubmitApplication",{content_name:"review"});
  };
  const copyReferral = () => {
    const link = `https://www.kosmica.com.co/?ref=${myReferralCode}`;
    navigator.clipboard.writeText(link).then(()=>{
      setReferralCopied(true);
      showToast("🎁 Link de referido copiado");
      setTimeout(()=>setReferralCopied(false), 3000);
    });
  };
  const shareReferralWA = () => {
    const link = `https://www.kosmica.com.co/?ref=${myReferralCode}`;
    const text = `¡Hola! Te recomiendo Kosmica, una tienda de moda femenina premium 💜\nUsa mi link y obtienes envío prioritario en tu primera compra:\n${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`,"_blank");
  };

  if(adminMode) return <Suspense fallback={<SpinFallback/>}><AdminPanel onExit={()=>setAdminMode(false)} /></Suspense>;
  if(trackingMode) return (
    <Suspense fallback={<SpinFallback/>}>
      <div style={{minHeight:'100vh',background:'#F8F4FF',paddingTop:60}}>
        <OrderTracking onBack={()=>setTrackingMode(false)}/>
      </div>
    </Suspense>
  );

  const fmtCOP=(n)=>{
    const num=Number(n);
    if(isNaN(num)) return "$0";
    return "$"+num.toLocaleString("es-CO",{minimumFractionDigits:0,maximumFractionDigits:0});
  };
  const discountPct=(p)=>{
    if(!p.originalPrice || p.originalPrice<=p.price) return 0;
    return Math.round((1-p.price/p.originalPrice)*100);
  };

  return (
    <>
      <style>{CSS}</style>
      {toast && <div className="toast">{toast}</div>}

      {/* ── DRAWER OVERLAY ── */}
      <div className={`drawer-overlay${drawerOpen?" show":""}`} onClick={()=>setDrawerOpen(false)}/>

      {/* ── DRAWER MENÚ ── */}
      <nav className={`drawer${drawerOpen?" open":""}`}>
        <div className="drawer-head">
          <div className="drawer-logo">✦ Kosmica</div>
          <button className="drawer-close" onClick={()=>setDrawerOpen(false)}>✕</button>
        </div>
        <div className="drawer-body">
          <div className="drawer-section-title">Categorías</div>
          {CATEGORIES.map(c=>(
            <button key={c.key}
              className={`drawer-cat-btn${activeCategory===c.key?" active":""}`}
              onClick={()=>selectCat(c.key)}>
              <span className="drawer-cat-ico">{c.ico}</span>
              {c.label.replace(/^\S+\s/,"")}
              <span className="drawer-cat-arrow">›</span>
            </button>
          ))}
          <div className="drawer-divider"/>
          <div className="drawer-section-title">Mi cuenta</div>
          <button className="drawer-action-btn" onClick={()=>{setDrawerOpen(false);setTrackingMode(true);}}>
            <span className="drawer-cat-ico">📦</span> Rastrear mi pedido
          </button>
          <button className="drawer-action-btn" onClick={()=>{setDrawerOpen(false);setAdminMode(true);}}>
            <span className="drawer-cat-ico">⚙️</span> Panel Admin
          </button>
          <button className="drawer-action-btn"
            onClick={()=>{ setDrawerOpen(false); setCartOpen(true); }}>
            <span className="drawer-cat-ico">🛍️</span>
            Mi carrito {cartCount>0&&`(${cartCount})`}
          </button>
        </div>
        <div className="drawer-foot">
          <button className="ref-banner" onClick={()=>setReferralOpen(true)}>
            <span className="ref-banner-ico">🎁</span>
            <span className="ref-banner-text">
              <span className="ref-banner-title">Invita y gana</span>
              <span className="ref-banner-sub">Tu amiga compra, tú ganas descuento</span>
            </span>
            <span style={{color:"var(--lila-dark)",fontSize:"1.1rem"}}>›</span>
          </button>
          <div className="drawer-foot-txt">Síguenos en redes</div>
          <div className="drawer-contact">
            <a href="https://www.facebook.com/profile.php?id=61584826324919" target="_blank" rel="noreferrer" className="drawer-social">📘</a>
              <a href="https://www.instagram.com/kosmica2109" target="_blank" rel="noreferrer" className="drawer-social">📷</a>
              <a href="https://www.tiktok.com/@kosmica_2109" target="_blank" rel="noreferrer" className="drawer-social">🎵</a>   
          </div>
        </div>
      </nav>

      {/* ── NAVBAR ── */}
      <nav className={`nav${scrolled?" scrolled":""}`}>
        <div className="nav-inner">
          {/* Hamburger — solo visible en móvil */}
          <button className="hbg-btn" onClick={()=>setDrawerOpen(true)} aria-label="Menú">☰</button>

          <div className="logo" onClick={()=>window.scrollTo({top:0,behavior:"smooth"})}>✦ Kosmica</div>

          {/* Nav links desktop */}
          <ul className="nav-links">
            {CATEGORIES.map(c=>(
              <li key={c.key}>
                <a href="#p" className={activeCategory===c.key?"active":""}
                  onClick={e=>{e.preventDefault();selectCat(c.key);}}>
                  {c.label.replace(/^\S+\s/,"")}
                </a>
              </li>
            ))}
          </ul>

          <div className="nav-right">
            <div className="nav-search-wrap">
              <span className="nav-search-ico">🔍</span>
              <input placeholder="Buscar productos..." value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
            {displayPoints > 0 && (
              <button className="loyalty-badge" onClick={()=>setLoyaltyOpen(true)} title="Mis puntos Kosmica">
                💎 {displayPoints} pts
              </button>
            )}
            <button className={`cart-btn${cartPulse?" pulse":""}`} onClick={()=>setCartOpen(true)}>
              🛍️{cartCount>0&&<span className="cart-badge">{cartCount}</span>}
            </button>
          </div>
        </div>
      </nav>

      {/* ── PROMO STRIP ── */}
      <div className="promo-strip">💳 Paga con Nequi, PSE y tarjeta &nbsp;|&nbsp; 🔒 Pago 100% seguro &nbsp;|&nbsp; 🚚 Elige tu envío al finalizar compra ✦</div>

      {/* ── CATEGORÍAS BARRA HORIZONTAL ── */}
      <div className="cats-bar">
        {CATEGORIES.map(c=>(
          <button key={c.key}
            className={`cats-bar-btn${activeCategory===c.key?" on":""}`}
            onClick={()=>selectCat(c.key)}
            style={activeCategory===c.key?{background:c.color}:{}}>
            {c.label}
          </button>
        ))}
      </div>

      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero-inner">
          <div>
            <div className="hero-tag">✦ Nueva Colección 2026</div>
            <h1 className="hero-title">Moda que te<br/><em>enamora</em> ✦</h1>
            <p className="hero-sub">Bolsos, maquillaje, capilar y ropa femenina premium. Galería con fotos y videos reales.</p>
            <div className="hero-btns">
              <button className="btn-primary" onClick={scrollTo}>Explorar Colección</button>
              <button className="btn-outline" onClick={()=>{setActiveCategory("MAQUILLAJE");scrollTo();}}>🔥 Ver Ofertas</button>
            </div>
            <div className="hero-stats">
              {[["10K+","Clientas"],["500+","Productos"],["98%","Satisfacción"]].map(([n,l])=>(
                <div key={l}><div className="stat-n">{n}</div><div className="stat-l">{l}</div></div>
              ))}
            </div>
          </div>
          <div className="hero-mosaic">
            {[
              {src:"https://images.unsplash.com/photo-1483985988355-763728e1935b?w=340&q=80",h:220,eager:true},
              {src:"https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=340&q=80",h:180,mt:30},
              {src:"https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=340&q=80",h:180,mt:30},
              {src:"https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=340&q=80",h:220},
            ].map((img,i)=>(
              <div key={i} className="mosaic-img" style={{height:img.h,marginTop:img.mt||0}}>
                <img src={img.src} alt="" style={{height:"100%",width:"100%",objectFit:"cover"}}
                  loading={img.eager ? "eager" : "lazy"}
                  fetchPriority={img.eager ? "high" : "auto"}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRODUCTOS ── */}
      <div ref={ref} id="p">
        <div className="section-wrap products-section">
          <p className="section-eyebrow">Nuestras Colecciones</p>
          <h2 className="section-title">Encuentra tu estilo</h2>
          <div className="cat-pills">
            {CATEGORIES.map(c=>(
              <button key={c.key}
                className={`cat-pill${activeCategory===c.key?" active":""}`}
                onClick={()=>{setActiveCategory(c.key);setSearch("");}}
                style={activeCategory===c.key?{background:c.color}:{}}>
                {c.label}
              </button>
            ))}
          </div>
          {error&&(
            <div className="error-banner">
              ⚠️ {error}
              <button onClick={fetchProducts} style={{background:"none",border:"1px solid #F4A7C3",borderRadius:6,padding:"2px 10px",cursor:"pointer",color:"#8B2252",fontSize:".82rem",marginLeft:8}}>Reintentar</button>
            </div>
          )}
          <div className="product-grid">
            {filteredProducts.length===0 && !loading
              ? <div style={{gridColumn:"1/-1",textAlign:"center",padding:"48px 18px",color:"var(--muted)"}}>
                  <div style={{fontSize:"3rem",marginBottom:12}}>🔍</div>
                  <p style={{fontSize:"1rem",fontWeight:600}}>No se encontraron productos</p>
                </div>
              : filteredProducts.map((p,idx)=>{
                  // ✅ Placeholder skeleton mientras el servidor responde
                  if(p.__placeholder) return (
                    <div key={p.id} className="product-card" style={{animationDelay:`${idx*0.08}s`}}>
                      <div className="skeleton" style={{height:240}}/>
                      <div style={{padding:"10px 12px 14px"}}>
                        <div className="skeleton" style={{height:11,width:"50%",marginBottom:8}}/>
                        <div className="skeleton" style={{height:17,marginBottom:7}}/>
                        <div className="skeleton" style={{height:16,width:"40%",marginBottom:10}}/>
                        <div className="skeleton" style={{height:38}}/>
                      </div>
                    </div>
                  );
                  const pct=discountPct(p);
                  return (
                    <div key={p.id} className="product-card">
                      <div className="card-img-wrap" onClick={()=>setSelectedProduct(p)}>
                        <div className="img-skeleton" />
                        <img className="card-img"
                          src={imgUrl(p.imageUrl)||"https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&q=80"}
                          alt={p.name}
                          loading="lazy"
                          width="400"
                          height="240"
                          decoding="async"
                          onLoad={e=>{e.target.classList.add("loaded");const sk=e.target.previousSibling;if(sk)sk.style.display="none";}}
                        />
                        <div className="card-see-more">{p.videoUrl?"🎥 Ver fotos y video →":"🔍 Ver más →"}</div>
                        {p.badge&&<span className={`card-badge ${p.badge}`}>{p.badge}</span>}
                        <button className="card-wish" onClick={e=>{e.stopPropagation();toggleWishlist(p.id);}}>
                          {wishlist.includes(p.id)?"❤️":"🤍"}
                        </button>
                        <button className="card-share" onClick={e=>openSharePopup(e,p)} title="Compartir">
                          📤
                        </button>
                      </div>
                      <div className="card-body">
                        <div>
                          <span className="card-stars">{"★".repeat(Math.round(p.rating||0))}{"☆".repeat(5-Math.round(p.rating||0))}</span>
                          <span className="card-reviews">({p.reviewCount||0})</span>
                        </div>
                        <div className="card-name">{p.name}</div>
                        <div className="card-price-row">
                          <span className="card-price">{fmtCOP(p.price)}</span>
                          {p.originalPrice&&<span className="card-original">{fmtCOP(p.originalPrice)}</span>}
                          {pct>0&&<span className="card-discount">-{pct}%</span>}
                        </div>
                        {/* ✅ COUNTDOWN en productos con descuento */}
                        {pct>0&&<CountdownTimer/>}
                        {/* ── STOCK ── */}
                        {(p.stock != null) && (() => {
                          const s = p.stock;
                          const level = s === 0 ? 'low' : s <= 5 ? 'low' : s <= 15 ? 'mid' : 'high';
                          const pctBar = s === 0 ? 100 : Math.min(100, Math.round((s / 30) * 100));
                          const label = s === 0 ? 'Agotado' : s === 1 ? '¡Último disponible!' : s <= 5 ? `¡Solo ${s} unidades!` : `${s} disponibles`;
                          return (
                            <div className={`card-stock ${level}`}>
                              <div className="card-stock-bar">
                                <div className="card-stock-fill" style={{width:`${pctBar}%`}}/>
                              </div>
                              <span className="card-stock-label">{label}</span>
                            </div>
                          );
                        })()}
                        {p.stock === 0
                          ? <button className="card-add-disabled" disabled>😔 Agotado</button>
                          : (() => {
                              const inCart = cart.some(i=>i.id===p.id);
                              return <button
                                className="card-add"
                                onClick={()=>addToCart(p)}
                                style={inCart?{background:"linear-gradient(135deg,#27AE60,#1a8a4a)"}:{}}
                              >{inCart?"✓ En el carrito":"🛒 Agregar al carrito"}</button>;
                            })()
                        }
                        <button className="card-review-btn" onClick={()=>{setReviewModal(p);setReviewStars(0);setReviewText("");}}>
                          ⭐ Dejar reseña
                        </button>
                      </div>
                    </div>
                  );
                })
            }
          </div>
        </div>
      </div>

      {/* ── TESTIMONIOS ── */}
      <section className="testimonials">
        <div style={{maxWidth:1400,margin:"0 auto"}}>
          <p className="test-eyebrow">Testimonios</p>
          <h2 className="test-title">Lo que dicen nuestras clientas</h2>
          <div className="test-grid">
            {TESTIMONIALS.map((t,i)=>(
              <div key={i} className="test-card">
                <div className="test-stars">{"★".repeat(t.stars)}</div>
                <p className="test-text">"{t.text}"</p>
                <div className="test-author">
                  <div className="test-avatar">{t.name[0]}</div>
                  <div className="test-name">{t.name}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="features">
        <div className="feat-grid">
          {[["🚚","Envío a todo Colombia","Elige tu método al finalizar compra"],["🔒","Pago Seguro","SSL cifrado"],["↩️","Calidad garantizada","Garantía de calidad"],["💎","Premium","Garantía autenticidad"]].map(([icon,t,d])=>(
            <div key={t} className="feat-card">
              <div className="feat-icon">{icon}</div>
              <div className="feat-title">{t}</div>
              <div className="feat-sub">{d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-grid">
            <div className="footer-brand">
              <div className="footer-logo">
                <div>✦ Kosmica</div>
                <div style={{fontSize:"1rem",fontWeight:400,letterSpacing:".18em",textTransform:"uppercase",opacity:.75,marginTop:4}}>Kosmica</div>
              </div>
              <p className="footer-desc">Tu destino de moda femenina premium. Calidad, estilo y exclusividad.</p>
              <div className="social-icons" style={{marginTop:14}}>
                {[["📘","https://www.facebook.com/profile.php?id=61584826324919"],["📷","https://www.instagram.com/kosmica2109"],["🎵","https://www.tiktok.com/@kosmica_2109"]].map(([s,url],i)=><a key={i} href={url} target="_blank" rel="noreferrer" className="social-icon">{s}</a>)}
              </div>
            </div>
            <div>
              <div className="footer-heading">Tienda</div>
              <div className="footer-links">
                <a href="#p" onClick={e=>{e.preventDefault();selectCat("BOLSOS");scrollTo();}}>Bolsos y Morrales</a>
                <a href="#p" onClick={e=>{e.preventDefault();selectCat("BILLETERAS");scrollTo();}}>Billeteras</a>
                <a href="#p" onClick={e=>{e.preventDefault();selectCat("MAQUILLAJE");scrollTo();}}>Maquillaje</a>
                <a href="#p" onClick={e=>{e.preventDefault();selectCat("CAPILAR");scrollTo();}}>Capilar</a>
                <a href="#p" onClick={e=>{e.preventDefault();selectCat("CUIDADO_PERSONAL");scrollTo();}}>Cuidado Personal</a>
                <a href="#p" onClick={e=>{e.preventDefault();selectCat("ACCESORIOS");scrollTo();}}>Accesorios</a>
              </div>
            </div>
            <div>
              <div className="footer-heading">Ayuda</div>
              <div className="footer-links">
                <a href="https://wa.me/573043927148?text=Hola%20Kosmica%2C%20tengo%20una%20pregunta" target="_blank" rel="noreferrer">Contacto</a>
                <a href="https://wa.me/573043927148?text=Hola%2C%20quiero%20saber%20sobre%20los%20env%C3%ADos" target="_blank" rel="noreferrer">Envíos</a>
                <a href="https://wa.me/573043927148?text=Hola%2C%20quiero%20hacer%20una%20devoluci%C3%B3n" target="_blank" rel="noreferrer">Garantías</a>
                <a href="https://wa.me/573043927148?text=Hola%2C%20tengo%20una%20pregunta%20frecuente" target="_blank" rel="noreferrer">FAQ</a>
              </div>
            </div>
            <div>
              <div className="footer-heading">Mi pedido</div>
              <div className="footer-links">
                <a href="#" onClick={e=>{e.preventDefault();setTrackingMode(true);}}>📦 Rastrear pedido</a>
                <a href="#" onClick={e=>e.preventDefault()}>Política de envíos</a>
                <a href="#" onClick={e=>e.preventDefault()}>Política de garantías</a>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© 2026 Kosmica · Todos los derechos reservados</span>
            <div style={{display:"flex",gap:8,fontSize:"1.2rem",justifyContent:"center"}}>💳 🏧 📱</div>
          </div>
        </div>
      </footer>

      {/* ── MODAL PRODUCTO ── */}
      {selectedProduct&&(
        <Suspense fallback={<SpinFallback/>}>
          <ProductDetailModal
            product={selectedProduct}
            onClose={()=>setSelectedProduct(null)}
            onAddToCart={addToCart}
            cart={cart}
            onUpdateQty={updateQty}
            onRemoveFromCart={removeFromCart}
            wishlist={wishlist}
            onToggleWishlist={toggleWishlist}
            onCheckout={()=>{setSelectedProduct(null);setCheckoutOpen(true);}}
          />
        </Suspense>
      )}

      {/* ── CARRITO ── */}
      {cartOpen&&(
        <>
          <div className="cart-overlay" onClick={()=>setCartOpen(false)}/>
          <div className="cart-panel">
            <div className="cart-header">
              <div style={{display:"flex",alignItems:"center"}}>
                <h2 className="cart-title">🛍️ Mi Carrito</h2>
                {cartCount>0&&<span className="cart-count-badge">{cartCount} ítem{cartCount!==1?"s":""}</span>}
              </div>
              <button className="close-btn" onClick={()=>setCartOpen(false)}>✕</button>
            </div>
            <div className="cart-items">
              {cart.length===0
                ? <div className="cart-empty">
                    <div style={{fontSize:"3.5rem",marginBottom:14}}>🛍️</div>
                    <p style={{fontWeight:700,fontSize:"1.05rem",color:"var(--dark)",marginBottom:8}}>Tu carrito está vacío</p>
                    <p style={{color:"var(--muted)",fontSize:".9rem",marginBottom:22}}>¡Explora nuestros productos y encuentra algo que te encante!</p>
                    <button onClick={()=>setCartOpen(false)} style={{
                      background:"linear-gradient(135deg,var(--lila),var(--lila-dark))",
                      color:"#fff",border:"none",borderRadius:12,padding:"11px 24px",
                      fontWeight:700,fontSize:".95rem",cursor:"pointer",boxShadow:"var(--shadow)"
                    }}>Ver productos ✦</button>
                  </div>
                : cart.map(item=>(
                    <div key={item.id} className="cart-item">
                      <img className="cart-item-img"
                        src={item.imageUrl||"https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=200"}
                        alt={item.name}
                        onError={e=>{e.target.src="https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=200";}}/>
                      <div className="cart-item-info">
                        <div>
                          {item.category&&<div className="cart-item-cat">{item.category}</div>}
                          <div className="cart-item-name">{item.name}</div>
                          <div className="cart-item-price">{fmtCOP(Number(item.price)*item.qty)}</div>
                          {item.qty>1&&<div style={{fontSize:".78rem",color:"var(--muted)",marginBottom:4}}>{fmtCOP(Number(item.price))} c/u</div>}
                        </div>
                        <div className="qty-controls">
                          <button className="qty-btn" onClick={()=>updateQty(item.id,-1)}>−</button>
                          <span className="qty-val">{item.qty}</span>
                          <button className="qty-btn" onClick={()=>updateQty(item.id,1)}>+</button>
                          <button className="cart-remove" title="Eliminar" onClick={()=>removeFromCart(item.id)}>🗑️</button>
                        </div>
                      </div>
                    </div>
                  ))
              }
            </div>
            {/* ── UPSELL — productos sugeridos ── */}
            {cart.length>0 && upsellProducts.length>0 && (
              <div className="upsell-section">
                <div className="upsell-title">✨ También te puede gustar</div>
                <div className="upsell-scroll">
                  {upsellProducts.map(p=>(
                    <div key={p.id} className="upsell-card" onClick={()=>{setCartOpen(false);setSelectedProduct(p);}}>
                      <img className="upsell-img"
                        src={imgUrl(p.imageUrl)||"https://images.unsplash.com/photo-1483985988355-763728e1935b?w=200"}
                        alt={p.name}
                        onError={e=>{e.target.src="https://images.unsplash.com/photo-1483985988355-763728e1935b?w=200";}}
                      />
                      <div className="upsell-info">
                        <div className="upsell-name">{p.name}</div>
                        <div className="upsell-price">{fmtCOP(p.price)}</div>
                      </div>
                      <button className="upsell-add" onClick={e=>{e.stopPropagation();addToCart(p);}}>
                        + Agregar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
              <div className="cart-footer">
                <div className="cart-row"><span>Subtotal ({cartCount} ítem{cartCount!==1?"s":""})</span><span>{fmtCOP(cartTotal)}</span></div>
                <div className="cart-row">
                  <span style={{color:"var(--muted)",fontSize:".88rem"}}>🚚 Envío</span>
                  {selectedShippingMethod
                    ? <span style={{color:"#4C1D95",fontSize:".83rem",fontWeight:700}}>{selectedShippingMethod.label} · {fmtCOP(selectedShippingMethod.cost)}</span>
                    : <span style={{color:"#6B7280",fontSize:".83rem",fontStyle:"italic"}}>Elige al finalizar compra</span>
                  }
                </div>
                <div className="cart-total-row">
                  <span>Total</span>
                  <span style={{color:"var(--lila)",fontFamily:"'Playfair Display',serif",fontSize:"1.2rem"}}>{fmtCOP(grandTotal)}</span>
                </div>
                <button className="checkout-btn" onClick={()=>{setCartOpen(false);setCheckoutOpen(true);}}>
                  Finalizar Compra →
                </button>
                <div style={{textAlign:"center",marginTop:10,fontSize:".78rem",color:"var(--muted)",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
                  <span>🔒</span> Pago seguro con MercadoPago
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── CHECKOUT ── */}
      {checkoutOpen&&!orderSuccess&&(
        <>
          <div className="overlay" onClick={()=>setCheckoutOpen(false)}/>
          <div className="modal-wrap">
            <div className="modal">
              <div className="modal-header">
                <h2 className="modal-title">💳 Finalizar Compra</h2>
                <button className="close-btn" onClick={()=>setCheckoutOpen(false)}>✕</button>
              </div>
              <form className="modal-body" onSubmit={handleCheckout}>
                <div className="order-summary-box">
                  {cart.map(i=>(
                    <div key={i.id} className="summary-item">
                      <span>{i.name} ×{i.qty}</span><span>{fmtCOP(Number(i.price)*i.qty)}</span>
                    </div>
                  ))}
                  <div className="summary-item">
                    <span>Envío</span>
                    <span style={{color: selectedShippingMethod ? "var(--lila)" : "var(--muted)", fontSize:".85rem", fontStyle: selectedShippingMethod ? "normal" : "italic", fontWeight: selectedShippingMethod ? 700 : 400}}>
                      {selectedShippingMethod ? fmtCOP(selectedShippingMethod.cost) : "Elige un método abajo 👇"}
                    </span>
                  </div>
                  {/* ✅ CAMPO CUPÓN */}
                  {!appliedCoupon ? (
                    <>
                      <div className="coupon-row">
                        <input
                          className="coupon-input"
                          type="text"
                          placeholder="Código de descuento"
                          value={couponInput}
                          onChange={e=>{setCouponInput(e.target.value); setCouponError("");}}
                          onKeyDown={e=>e.key==="Enter"&&(e.preventDefault(),applyCoupon())}
                        />
                        <button type="button" className="coupon-apply-btn" onClick={applyCoupon}>Aplicar</button>
                      </div>
                      {couponError&&<p className="coupon-error">⚠️ {couponError}</p>}
                    </>
                  ) : (
                    <div className="coupon-applied-tag">
                      🏷️ {appliedCoupon.code} — {appliedCoupon.label}
                      <button type="button" className="coupon-remove" onClick={removeCoupon} title="Quitar cupón">✕</button>
                    </div>
                  )}
                  {appliedCoupon&&(
                    <div className="summary-item discount-row">
                      <span>Descuento ({appliedCoupon.pct}%)</span>
                      <span>-{fmtCOP(couponDiscount)}</span>
                    </div>
                  )}
                  <div className="summary-total">
                    <span>Total</span><span style={{color:"var(--lila)"}}>{fmtCOP(grandTotal)}</span>
                  </div>
                </div>
                <p className="form-section">📋 Datos Personales</p>
                <div className="form-group">
                  <label className="form-label">Nombre completo *</label>
                  <input required type="text" className="form-input" value={form.name} placeholder=""
                    onChange={e=>setForm(p=>({...p,name:e.target.value}))}/>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                  <div className="form-group">
                    <label className="form-label">Teléfono / WhatsApp *</label>
                    <input required type="tel" className="form-input" value={form.phone} placeholder=""
                      onChange={e=>setForm(p=>({...p,phone:e.target.value}))}/>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Cédula *</label>
                    <input required type="text" className="form-input" value={form.document} placeholder=""
                      onChange={e=>setForm(p=>({...p,document:e.target.value}))}/>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Correo electrónico *</label>
                  <input required type="email" className="form-input" value={form.email} placeholder=""
                    onChange={e=>setForm(p=>({...p,email:e.target.value}))}/>
                </div>
                <p className="form-section">📦 Datos de Envío</p>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                  <div className="form-group">
                    <label className="form-label">Ciudad *</label>
                    <input required type="text" className="form-input" value={form.city} placeholder=""
                      onChange={e=>setForm(p=>({...p,city:e.target.value}))}/>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Barrio</label>
                    <input type="text" className="form-input" value={form.neighborhood} placeholder=""
                      onChange={e=>setForm(p=>({...p,neighborhood:e.target.value}))}/>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Dirección completa *</label>
                  <input required type="text" className="form-input" value={form.address} placeholder=""
                    onChange={e=>setForm(p=>({...p,address:e.target.value}))}/>
                </div>
                {/* ── Selección de método de envío ── */}
                <p className="form-section">🚚 Método de Envío</p>
                <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:16}}>
                  {SHIPPING_OPTIONS.map(method => (
                    <div
                      key={method.id}
                      onClick={() => setSelectedShippingMethod(method)}
                      style={{
                        border: selectedShippingMethod?.id === method.id
                          ? "2.5px solid #6D28D9"
                          : "2px solid #EDE9FE",
                        borderRadius: 13,
                        padding: "13px 16px",
                        cursor: "pointer",
                        background: selectedShippingMethod?.id === method.id
                          ? "linear-gradient(135deg,#F5F0FF,#EDE9FE)"
                          : "#FDFCFF",
                        transition: "all .2s",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 13,
                        boxShadow: selectedShippingMethod?.id === method.id
                          ? "0 4px 16px rgba(109,40,217,.15)"
                          : "none",
                      }}
                    >
                      <div style={{
                        width:22, height:22, borderRadius:"50%", flexShrink:0, marginTop:2,
                        border: selectedShippingMethod?.id === method.id
                          ? "6px solid #6D28D9"
                          : "2.5px solid #C4B5FD",
                        background: selectedShippingMethod?.id === method.id ? "#fff" : "transparent",
                        transition: "all .2s",
                      }}/>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:3}}>
                          <span style={{fontWeight:800,fontSize:"1rem",color:"#2E1065"}}>{method.label}</span>
                          <span style={{fontWeight:900,fontSize:"1rem",color:"#4C1D95"}}>{fmtCOP(method.cost)}</span>
                        </div>
                        <div style={{
                          display:"inline-block",fontSize:".72rem",fontWeight:800,
                          padding:"1px 8px",borderRadius:8,marginBottom:4,
                          background:"#F3EEFF",color:"#6D28D9",border:"1px solid #EDE9FE"
                        }}>{method.badge}</div>
                        <div style={{fontSize:".82rem",color:"#374151",fontWeight:600,marginBottom:2}}>{method.desc}</div>
                        <div style={{fontSize:".78rem",color:"#6B7280",lineHeight:1.4}}>{method.detail}</div>
                      </div>
                    </div>
                  ))}
                  {!selectedShippingMethod && (
                    <p style={{fontSize:".8rem",color:"#EF4444",margin:0,paddingLeft:4}}>
                      ⚠️ Debes seleccionar un método de envío para continuar
                    </p>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Nota para el envío (opcional)</label>
                  <input type="text" className="form-input" value={form.notes} placeholder=""
                    onChange={e=>setForm(p=>({...p,notes:e.target.value}))}/>
                </div>
                <p className="form-section">Método de Pago</p>
                <div style={{background:'linear-gradient(135deg,#009EE3,#0070B8)',borderRadius:16,padding:'18px 20px',marginBottom:12,display:'flex',alignItems:'center',gap:14}}>
                  <div style={{fontSize:'2.2rem'}}>💳</div>
                  <div>
                    <div style={{color:'#fff',fontWeight:700,fontSize:'1rem'}}>Pagar con MercadoPago</div>
                    <div style={{color:'rgba(255,255,255,.8)',fontSize:'.88rem',marginTop:3}}>
                      Tarjetas, PSE, Nequi, Efecty, Bancolombia y más
                    </div>
                  </div>
                  <div style={{marginLeft:'auto',background:'rgba(255,255,255,.18)',borderRadius:10,padding:'5px 13px',color:'#fff',fontSize:'.82rem',fontWeight:700}}>
                    ✓ Seguro
                  </div>
                </div>
                <div className="secure-note">
                  🔒 Serás redirigido a MercadoPago para completar tu pago de forma segura
                </div>
                <button type="submit" className="pay-btn"
                  disabled={paying || !selectedShippingMethod}
                  style={{background:paying||!selectedShippingMethod?"#A0AEC0":"linear-gradient(135deg,#009EE3,#0070B8)",cursor:paying||!selectedShippingMethod?"not-allowed":"pointer"}}>
                  {paying ? "⏳ Redirigiendo..."
                    : !selectedShippingMethod ? "Selecciona un método de envío"
                    : `Ir a pagar ${fmtCOP(grandTotal)} COP →`}
                </button>
              </form>
            </div>
          </div>
        </>
      )}

      {/* ── SUCCESS ── */}
      {orderSuccess&&(
        <>
          <div className="overlay"/>
          <div className="modal-wrap">
            <div className="modal">
              <div className="success-modal">
                <div style={{fontSize:"3.5rem",marginBottom:14}}>🎉</div>
                <div className="success-icon">✓</div>
                <h2 className="success-title">¡Compra exitosa!</h2>
                <p className="success-sub">Tu pedido está siendo preparado con mucho amor. 💕</p>

                {/* ✅ DETALLE DEL PEDIDO */}
                <div className="success-order-detail">
                  <p>📦 <strong>Número de pedido</strong></p>
                  <div className="order-num-badge" style={{marginBottom:10}}>
                    {orderSuccess.orderNumber}
                  </div>
                  <p style={{fontSize:".82rem",color:"var(--muted)"}}>
                    Guarda este número para rastrear tu pedido en cualquier momento.
                  </p>
                  <p style={{marginTop:8}}>📧 Confirmación enviada a <strong>{form.email}</strong></p>
                  {form.phone&&<p>💬 También te escribimos por WhatsApp al <strong>{form.phone}</strong></p>}
                </div>

                {/* ✅ BOTONES DE ACCIÓN */}
                <button className="success-track-btn"
                  onClick={()=>{ setOrderSuccess(null); setCheckoutOpen(false); setTrackingMode(true); }}>
                  📦 Rastrear mi pedido en tiempo real
                </button>
                <a className="success-wa-btn"
                  href={`https://wa.me/573043927148?text=Hola%20Kosmica%20🛍️%20Mi%20pedido%20es%20el%20%23${orderSuccess.orderNumber}%2C%20quiero%20saber%20el%20estado%20de%20mi%20compra%20💜`}
                  target="_blank" rel="noreferrer">
                  💬 Consultar por WhatsApp
                </a>
                <button className="btn-primary" style={{width:"100%",marginTop:10,display:"block"}}
                  onClick={()=>{setOrderSuccess(null);setCheckoutOpen(false);}}>
                  Seguir Comprando ✦
                </button>
              </div>
            </div>
          </div>
        </>
      )}


      {/* ── MODAL TRANSPORTADORAS ── */}
      {carrierModalOpen && (
        <>
          <div className="overlay" onClick={()=>setCarrierModalOpen(false)}/>
          <div className="modal-wrap">
            <div className="modal" style={{maxWidth:460}}>
              <div className="modal-header">
                <div>
                  <h2 className="modal-title">🚚 Elige tu envío</h2>
                  <div style={{fontSize:".82rem",color:"var(--muted)",marginTop:2}}>
                    Enviando a <strong style={{color:"var(--lila)"}}>{form.city}{form.neighborhood?`, ${form.neighborhood}`:""}</strong>
                  </div>
                </div>
                <button className="close-btn" onClick={()=>setCarrierModalOpen(false)}>✕</button>
              </div>
              <div className="modal-body" style={{paddingTop:10,paddingBottom:28}}>
                {carriersLoading && (
                  <div style={{textAlign:"center",padding:"32px 16px"}}>
                    <div style={{fontSize:"2rem",marginBottom:12}}>🚚</div>
                    <div style={{fontWeight:600,color:"var(--lila)",marginBottom:6}}>Cotizando precios reales...</div>
                    <div style={{fontSize:".85rem",color:"var(--muted)"}}>Consultando transportadoras disponibles para <strong>{form.city}</strong></div>
                    <div style={{marginTop:16,display:"flex",gap:6,justifyContent:"center"}}>
                      {[0,1,2].map(i=><div key={i} style={{width:10,height:10,borderRadius:"50%",background:"var(--lila)",animation:`dotBounce 1.2s ${i*0.2}s infinite ease-in-out`}}/>)}
                    </div>
                  </div>
                )}
                {carriersError && !carriersLoading && (
                  <div style={{background:"#FFF0F0",border:"1px solid #FFCDD2",borderRadius:12,padding:"14px 16px",marginBottom:12,color:"#C62828",fontSize:".88rem"}}>
                    ⚠️ {carriersError}
                    <button onClick={fetchRates} style={{display:"block",marginTop:8,background:"none",border:"1px solid #C62828",borderRadius:8,padding:"4px 14px",cursor:"pointer",color:"#C62828",fontSize:".82rem",fontWeight:700}}>
                      Reintentar
                    </button>
                  </div>
                )}
                {!carriersLoading && !carriersError && carriers.length === 0 && (
                  <div style={{textAlign:"center",padding:"24px",color:"var(--muted)",fontSize:".9rem"}}>
                    No se encontraron opciones de envío para esta ciudad.
                  </div>
                )}
                {!carriersLoading && carriers.map((c,i)=>(
                  <div key={c.name}
                    onClick={()=>{ setSelectedCarrier(c); setCarrierModalOpen(false); }}
                    style={{
                      display:"flex",alignItems:"center",justifyContent:"space-between",
                      padding:"14px 16px",marginBottom:10,borderRadius:14,cursor:"pointer",
                      border:`2px solid ${selectedCarrier?.name===c.name?"var(--lila)":"var(--lila-xlight)"}`,
                      background: selectedCarrier?.name===c.name?"var(--lila-xlight)":"#fff",
                      boxShadow:"0 2px 10px rgba(120,80,180,.07)",
                      transition:"all .18s"
                    }}>
                    <div style={{display:"flex",alignItems:"center",gap:12}}>
                      <span style={{fontSize:"1.7rem",lineHeight:1}}>{c.logo}</span>
                      <div>
                        <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:3}}>
                          <span style={{fontWeight:700,color:"var(--dark)",fontSize:".97rem"}}>{c.name}</span>
                          {i===0&&<span style={{background:"#27AE60",color:"#fff",fontSize:".67rem",
                            fontWeight:800,padding:"2px 8px",borderRadius:20,letterSpacing:".03em"}}>
                            MEJOR PRECIO
                          </span>}
                          {selectedCarrier?.name===c.name&&<span style={{background:"var(--lila)",color:"#fff",
                            fontSize:".67rem",fontWeight:800,padding:"2px 8px",borderRadius:20}}>
                            ✓ ELEGIDO
                          </span>}
                        </div>
                        <div style={{fontSize:".8rem",color:"var(--muted)"}}>⏱ {c.days || c.time}</div>
                      </div>
                    </div>
                    <div style={{fontWeight:800,color:"var(--lila)",fontSize:"1.15rem",flexShrink:0}}>
                      {fmtCOP(c.price)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── ASISTENTE IA LUNA ── */}
      <Suspense fallback={null}>
        <AIChatBot
          onAddToCart={addToCart}
          onOpenCart={() => { setCartOpen(true); }}
          onSelectShipping={(method) => { setSelectedShippingMethod(method); showToast(`✓ ${method.label} seleccionado`); }}
        />
      </Suspense>

      {/* ── WHATSAPP ── */}
      <a className="wa-float" href="https://wa.me/573043927148?text=Hola%20Kosmica%2C%20quiero%20información"
        target="_blank" rel="noreferrer" aria-label="WhatsApp">
        <span className="wa-float-icon">💬</span>
        <span className="wa-float-text">
          <span className="wa-float-label">¿Necesitas ayuda?</span>
          <span className="wa-float-cta">Escríbenos</span>
        </span>
      </a>

      {/* ════════════════════════════════════════
          💌 NEWSLETTER POPUP
      ════════════════════════════════════════ */}
      {newsletterOpen&&(
        <div className="nl-overlay" onClick={()=>{ setNewsletterOpen(false); localStorage.setItem("kosmica_nl_seen","1"); }}>
          <div className="nl-box" onClick={e=>e.stopPropagation()}>
            <div className="nl-hero">
              <button className="nl-close" onClick={()=>{ setNewsletterOpen(false); localStorage.setItem("kosmica_nl_seen","1"); }}>✕</button>
              <div className="nl-emoji">💜</div>
              <div className="nl-title">10% de descuento en tu primera compra</div>
              <div className="nl-sub">Suscríbete y recibe ofertas exclusivas antes que nadie</div>
            </div>
            <div className="nl-body">
              {!couponVisible ? (
                <>
                  <form onSubmit={submitNewsletter}>
                    <div className="nl-input-row">
                      <input
                        className="nl-input"
                        type="email"
                        placeholder="tu@correo.com"
                        value={newsletterEmail}
                        onChange={e=>setNewsletterEmail(e.target.value)}
                        required
                      />
                      <button className="nl-btn" type="submit">¡Quiero!</button>
                    </div>
                  </form>
                  <p className="nl-disclaimer">Sin spam. Solo lo mejor de Kosmica 💜</p>
                </>
              ) : (
                <>
                  <p style={{textAlign:"center",marginBottom:14,color:"var(--brown)",fontSize:".95rem"}}>
                    🎉 ¡Listo! Aquí está tu cupón exclusivo:
                  </p>
                  <div className="nl-coupon">
                    <div className="nl-coupon-label">Tu código de descuento</div>
                    <div className="nl-coupon-code">BIENVENIDA10</div>
                    <button className="nl-coupon-copy" onClick={copyNlCoupon}>📋 Copiar código</button>
                  </div>
                  <button className="nl-btn" style={{width:"100%",padding:"13px",borderRadius:"50px",fontSize:"1rem"}}
                    onClick={()=>{ setNewsletterOpen(false); scrollTo(); }}>
                    Ir a comprar →
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          🚪 EXIT INTENT POPUP
      ════════════════════════════════════════ */}
      {exitPopupOpen&&(
        <div className="exit-overlay">
          <div className="exit-box">
            <button className="exit-close" onClick={()=>setExitPopupOpen(false)}>✕</button>
            <div className="exit-emoji">😱</div>
            <div className="exit-title">¿Ya te vas, amiga?</div>
            <div className="exit-sub">Espera, tenemos algo especial para ti. Usa este cupón hoy y llévate lo que quieras con descuento.</div>
            <div className="exit-code">
              <div className="exit-code-label">Cupón exclusivo de despedida</div>
              <div className="exit-code-val">VUELVE15</div>
            </div>
            <button className="exit-btn" onClick={()=>{
              navigator.clipboard.writeText("VUELVE15").then(()=>showToast("💜 Cupón VUELVE15 copiado"));
              setExitPopupOpen(false);
              scrollTo();
            }}>
              💜 Copiar y seguir comprando
            </button>
            <button className="exit-skip" onClick={()=>setExitPopupOpen(false)}>No, prefiero pagar precio completo</button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          📤 SHARE POPUP FLOTANTE
      ════════════════════════════════════════ */}
      {sharePopup&&(
        <div className="share-popup" style={{position:"fixed", top: Math.min(sharePos.top, window.innerHeight-150), left: Math.max(8, sharePos.left), zIndex:3000}} onClick={e=>e.stopPropagation()}>
          <div className="share-title">Compartir producto</div>
          <button className="share-opt" onClick={()=>shareViaWhatsApp(sharePopup)}>
            <span className="share-opt-ico share-wa-ico">💬</span>
            Enviar por WhatsApp
          </button>
          <button className="share-opt" onClick={()=>copyProductLink(sharePopup)}>
            <span className="share-opt-ico share-cp-ico">🔗</span>
            Copiar link del producto
          </button>
        </div>
      )}

      {/* ════════════════════════════════════════
          ⭐ MODAL DE RESEÑA
      ════════════════════════════════════════ */}
      {reviewModal&&(
        <div className="review-overlay" onClick={()=>setReviewModal(null)}>
          <div className="review-box" onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
              <div>
                <div className="review-title">Deja tu reseña</div>
                <div className="review-sub">{reviewModal.name}</div>
              </div>
              <button style={{background:"none",border:"none",fontSize:"1.3rem",cursor:"pointer",color:"var(--muted)"}} onClick={()=>setReviewModal(null)}>✕</button>
            </div>
            <div style={{fontSize:".88rem",color:"var(--brown)",marginBottom:8,fontWeight:600}}>¿Cuántas estrellas le das?</div>
            <div className="star-select">
              {[1,2,3,4,5].map(n=>(
                <button key={n} className="star-btn" onClick={()=>setReviewStars(n)}>
                  {n<=reviewStars?"⭐":"☆"}
                </button>
              ))}
            </div>
            <textarea
              className="review-textarea"
              rows={3}
              placeholder="Cuéntanos tu experiencia con este producto... ¿llegó bien? ¿la calidad es buena? 💜"
              value={reviewText}
              onChange={e=>setReviewText(e.target.value)}
            />
            <button className="review-submit" onClick={submitReview}>
              ✨ Publicar reseña
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          🎁 MODAL DE PROGRAMA DE REFERIDOS
      ════════════════════════════════════════ */}
      {referralOpen&&(
        <div className="ref-overlay" onClick={()=>setReferralOpen(false)}>
          <div className="ref-box" onClick={e=>e.stopPropagation()}>
            <div className="ref-hero">
              <button className="ref-close" onClick={()=>setReferralOpen(false)}>✕</button>
              <div className="ref-emoji">🎁</div>
              <div className="ref-title">Invita y gana</div>
              <div className="ref-sub">Comparte Kosmica con tus amigas y todas ganan</div>
            </div>
            <div className="ref-body">
              <div className="ref-steps">
                <div className="ref-step">
                  <div className="ref-step-num">1</div>
                  <div className="ref-step-text">Comparte tu link exclusivo con una amiga</div>
                </div>
                <div className="ref-step">
                  <div className="ref-step-num">2</div>
                  <div className="ref-step-text">Ella hace su primera compra en Kosmica</div>
                </div>
                <div className="ref-step">
                  <div className="ref-step-num">3</div>
                  <div className="ref-step-text">Tú recibes un cupón de descuento exclusivo 💜</div>
                </div>
              </div>
              <div style={{fontSize:".82rem",color:"var(--muted)",marginBottom:8,fontWeight:600,textTransform:"uppercase",letterSpacing:".08em"}}>Tu link de referida</div>
              <div className="ref-link-box">
                <span className="ref-link-val">kosmica.com.co/?ref={myReferralCode}</span>
                <button className="ref-copy-btn" onClick={copyReferral}>
                  {referralCopied?"✓ Copiado":"Copiar"}
                </button>
              </div>
              <button className="ref-wa-btn" onClick={shareReferralWA}>
                💬 Compartir por WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ SW UPDATE BAR — avisa cuando hay nueva versión */}
      {swUpdated && (
        <div className="sw-update-bar">
          <span>💜 Nueva versión disponible</span>
          <button className="sw-update-btn"
            onClick={() => { window.location.reload(); }}>
            Actualizar ahora
          </button>
        </div>
      )}

      {/* ✅ PWA INSTALL BANNER — aparece cuando el navegador permite instalar */}
      {pwaVisible && (
        <div className="pwa-banner" style={{position:"fixed"}}>
          <button className="pwa-banner-close" onClick={()=>setPwaVisible(false)} aria-label="Cerrar">✕</button>
          <div className="pwa-banner-icon">✦</div>
          <div className="pwa-banner-text">
            <div className="pwa-banner-title">Instala Kosmica 💜</div>
            <div className="pwa-banner-sub">Acceso rápido desde tu celular, sin Play Store</div>
          </div>
          <button className="pwa-banner-btn" onClick={installPwa}>Instalar</button>
        </div>
      )}

      {/* ════════════════════════════════════════
          🎭 SOCIAL PROOF EN TIEMPO REAL
      ════════════════════════════════════════ */}
      {socialProof && (
        <div className={`social-proof-toast${spHiding?" hiding":""}`}
          onClick={()=>{setSpHiding(true);setTimeout(()=>setSocialProof(null),350);}}>
          <div className="sp-avatar">{socialProof.name[0]}</div>
          <div className="sp-body">
            <div className="sp-name">{socialProof.name} · {socialProof.city}</div>
            <div className="sp-action">{socialProof.action}</div>
            <div className="sp-time">
              {socialProof.timeLabel
                ? `${socialProof.timeLabel} · ✓ Compra verificada`
                : `Hace ${Math.floor(Math.random()*9)+1} min · ✓ Compra verificada`}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          🔔 BANNER DE NOTIFICACIONES PUSH
      ════════════════════════════════════════ */}
      {pushBanner && !pushGranted && (
        <div className="push-banner">
          <button className="push-banner-close" onClick={()=>{setPushBanner(false);localStorage.setItem("kosmica_push_seen","1");}}>✕</button>
          <div className="push-banner-ico">🔔</div>
          <div className="push-banner-text">
            <div className="push-banner-title">¿Activamos notificaciones?</div>
            <div className="push-banner-sub">Entérate primero de ofertas y nuevas llegadas 💜</div>
          </div>
          <button className="push-banner-btn" onClick={requestPush}>Sí, activar</button>
        </div>
      )}

      {/* ════════════════════════════════════════
          🛒 CARRITO ABANDONADO — WhatsApp rescue
      ════════════════════════════════════════ */}
      {abandonedBanner && (
        <div className="abandoned-banner" style={{position:"fixed"}} onClick={sendAbandonedCartWA}>
          <button className="abandoned-banner-close" onClick={e=>{e.stopPropagation();setAbandonedBanner(false);}}>✕</button>
          <div className="abandoned-banner-title">💬 ¿Necesitas ayuda con tu pedido?</div>
          <div className="abandoned-banner-sub">Tienes {cartCount} ítem{cartCount!==1?"s":""} en tu carrito. Toca aquí para completar tu compra por WhatsApp 🛍️</div>
        </div>
      )}

      {/* ════════════════════════════════════════
          💎 MODAL DE PUNTOS DE FIDELIDAD
      ════════════════════════════════════════ */}
      {loyaltyOpen && (
        <div className="loyalty-modal-overlay" onClick={()=>setLoyaltyOpen(false)}>
          <div className="loyalty-modal" onClick={e=>e.stopPropagation()}>
            <div className="loyalty-header">
              <div className="loyalty-crown">💎</div>
              <div className="loyalty-title">Mis Puntos Kosmica</div>
              <div className="loyalty-sub">Acumula puntos con cada compra y canjéalos por descuentos</div>
            </div>
            <div className="loyalty-points-big">
              <div className="loyalty-points-num">{displayPoints}</div>
              <div className="loyalty-points-label">puntos acumulados</div>
            </div>
            {/* Niveles */}
            <div className="loyalty-tier">
              {[
                {ico:"🌸", name:"Esencial", pts:"0–499", active: displayPoints < 500},
                {ico:"💜", name:"Premium",  pts:"500–1499", active: displayPoints>=500 && displayPoints<1500},
                {ico:"👑", name:"VIP",      pts:"1500+", active: displayPoints>=1500},
              ].map(t=>(
                <div key={t.name} className={`loyalty-tier-item${t.active?" active":""}`}>
                  <div className="loyalty-tier-ico">{t.ico}</div>
                  <div className="loyalty-tier-name">{t.name}</div>
                  <div className="loyalty-tier-pts">{t.pts} pts</div>
                </div>
              ))}
            </div>
            {/* Cómo ganar puntos */}
            <div className="loyalty-how">
              <div className="loyalty-how-title">Cómo ganar puntos</div>
              {[
                ["Cada compra","1 pt por cada $1.000 COP"],
                ["Referir una amiga","+50 pts cuando ella compra"],
                ["Dejar reseña","+10 pts por reseña publicada"],
                ["Newsletter","+20 pts al suscribirte"],
              ].map(([accion, det])=>(
                <div key={accion} className="loyalty-how-row">
                  <span style={{color:"var(--dark)",fontWeight:600}}>{accion}</span>
                  <span className="loyalty-how-pts">{det}</span>
                </div>
              ))}
            </div>
            {displayPoints >= 500 ? (
              <button className="loyalty-redeem" onClick={()=>{
                setLoyaltyOpen(false);
                showToast("💎 Contacta a Kosmica por WhatsApp para canjear tus puntos");
                setTimeout(()=>{
                  const text = `Hola Kosmica! 💜 Tengo ${displayPoints} puntos acumulados y me gustaría canjearlos por un descuento.`;
                  window.open(`https://wa.me/573043927148?text=${encodeURIComponent(text)}`,"_blank");
                },1000);
              }}>
                🎁 Canjear mis {displayPoints} puntos
              </button>
            ) : (
              <button className="loyalty-redeem" style={{background:"linear-gradient(135deg,#B8A0D8,#9B72CF)"}} onClick={()=>{setLoyaltyOpen(false);scrollTo();}}>
                ✦ Seguir comprando para acumular
              </button>
            )}
            <button onClick={()=>setLoyaltyOpen(false)} style={{
              width:"100%",marginTop:10,padding:"11px",background:"none",
              border:"1.5px solid var(--lila-xlight)",borderRadius:50,
              color:"var(--brown)",fontWeight:600,cursor:"pointer",fontSize:".9rem"
            }}>Cerrar</button>
          </div>
        </div>
      )}
    </>
  );
}
