// ============================================================
//  src/App.jsx — Kosmica v5  MOBILE-FIRST  Amazon-Style UX
// ============================================================
import { useState, useEffect, useCallback, useRef } from "react";
import { productAPI, orderAPI } from "./services/api";
import ProductDetailModal from "./components/ProductDetailModal";
import AdminPanel from "./components/AdminPanel";
import OrderTracking from "./components/OrderTracking";

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=DM+Sans:wght@300;400;500;600;700&display=swap');

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
    background: linear-gradient(90deg,var(--lila),var(--pink),var(--mint),var(--lila));
    background-size: 300%; animation: moveGrad 6s linear infinite;
    padding: 9px 0; text-align: center;
    color: #fff; font-size: .88rem; font-weight: 700; letter-spacing: .04em;
  }

  /* ════════════════════════════════════════
     HERO MÓVIL
  ════════════════════════════════════════ */
  .hero {
    padding: 78px 16px 28px;
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
    position: sticky; top: 58px; z-index: 880;
    display: flex; gap: 8px; overflow-x: auto; padding: 10px 14px;
    background: rgba(253,248,255,.97); border-bottom: 1px solid var(--lila-xlight);
    scrollbar-width: none; -webkit-overflow-scrolling: touch;
  }
  .cats-bar::-webkit-scrollbar { display: none; }
  .cats-bar-btn {
    padding: 8px 16px; border-radius: 30px; border: 2px solid var(--lila-xlight);
    background: #fff; color: var(--brown); font-size: .92rem; font-weight: 600;
    white-space: nowrap; flex-shrink: 0; transition: all .22s; min-height: 40px;
  }
  .cats-bar-btn.on { border-color: transparent; color: #fff; box-shadow: 0 3px 12px rgba(155,114,207,.38); }

  /* ════════════════════════════════════════
     ANIMACIONES
  ════════════════════════════════════════ */
  @keyframes moveGrad { 0%{background-position:0%} 100%{background-position:300%} }
  @keyframes shimmer  { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
  @keyframes slideRight { from{transform:translateX(100%);opacity:0} to{transform:translateX(0);opacity:1} }
  @keyframes slideLeft  { from{transform:translateX(-100%);opacity:0} to{transform:translateX(0);opacity:1} }
  @keyframes slideUp    { from{transform:translateY(100%);opacity:0} to{transform:translateY(0);opacity:1} }
  @keyframes fadeIn     { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }

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

  /* Imagen grande tipo Amazon */
  .card-img-wrap {
    position: relative; overflow: hidden;
    height: 180px; background: #F8F4FF; cursor: pointer;
  }
  .card-img { width: 100%; height: 100%; object-fit: cover; transition: transform .5s; }
  .product-card:hover .card-img { transform: scale(1.06); }

  .card-see-more {
    position: absolute; bottom: 0; left: 0; right: 0;
    background: linear-gradient(transparent, rgba(45,27,78,.72));
    color: #fff; text-align: center; padding: 22px 8px 10px;
    font-size: .82rem; font-weight: 700; opacity: 0; transition: opacity .28s;
  }
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
  .cart-panel {
    position: fixed; inset: 0; background: var(--cream);
    z-index: 999; display: flex; flex-direction: column;
    animation: slideRight .34s ease;
  }
  .cart-header {
    padding: 18px 16px 14px; border-bottom: 1px solid var(--lila-xlight);
    display: flex; justify-content: space-between; align-items: center;
  }
  .cart-title { font-family: 'Playfair Display', serif; font-size: 1.35rem; font-weight: 700; color: var(--dark); }
  .close-btn { background: none; border: none; font-size: 1.25rem; color: var(--muted); padding: 4px; }
  .close-btn:hover { color: var(--lila); }
  .cart-items { flex: 1; overflow-y: auto; padding: 14px 16px; }
  .cart-empty { text-align: center; padding: 52px 20px; color: var(--muted); }
  .cart-item {
    display: flex; gap: 12px; margin-bottom: 12px;
    background: #fff; border-radius: 14px; padding: 12px;
    box-shadow: 0 2px 10px rgba(120,80,180,.07);
  }
  .cart-item-img { width: 68px; height: 68px; border-radius: 10px; object-fit: cover; flex-shrink: 0; }
  .cart-item-info { flex: 1; min-width: 0; }
  .cart-item-name { font-size: .9rem; font-weight: 600; margin-bottom: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .cart-item-price { color: var(--lila); font-weight: 700; font-size: .95rem; margin-bottom: 8px; }
  .qty-controls { display: flex; align-items: center; gap: 6px; }
  .qty-btn {
    width: 30px; height: 30px; border-radius: 8px;
    border: 1.5px solid var(--lila-xlight); background: #fff;
    font-weight: 700; color: var(--lila-dark); font-size: .95rem;
    display: flex; align-items: center; justify-content: center; transition: all .2s;
  }
  .qty-btn:hover { border-color: var(--lila); background: var(--lila-xlight); }
  .qty-val { font-weight: 600; min-width: 20px; text-align: center; font-size: .95rem; }
  .cart-remove { background: none; border: none; margin-left: auto; color: var(--pink); font-size: 1rem; }
  .cart-footer { padding: 14px 16px 24px; border-top: 1px solid var(--lila-xlight); }
  .cart-row { display: flex; justify-content: space-between; font-size: .92rem; color: var(--brown); margin-bottom: 5px; }
  .cart-total-row { display: flex; justify-content: space-between; font-weight: 700; font-size: 1.05rem; margin: 10px 0 14px; }
  .checkout-btn {
    width: 100%; padding: 15px;
    background: linear-gradient(135deg,var(--lila),var(--lila-dark));
    color: #fff; border: none; border-radius: 14px;
    font-weight: 700; font-size: 1rem; box-shadow: var(--shadow); transition: all .3s;
  }

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
    position: fixed; bottom: 22px; right: 16px; z-index: 800;
    width: 56px; height: 56px; border-radius: 50%;
    background: linear-gradient(135deg,#25D366,#128C7E);
    display: flex; align-items: center; justify-content: center;
    font-size: 1.7rem; box-shadow: 0 6px 22px rgba(37,211,102,.5);
    border: none; cursor: pointer; transition: transform .25s; text-decoration: none;
  }
  .wa-float:hover, .wa-float:active { transform: scale(1.1); }

  /* ════════════════════════════════════════
     TABLET  ≥ 580px
  ════════════════════════════════════════ */
  @media (min-width: 580px) {
    .nav-inner { height: 64px; }
    .logo { font-size: 1.5rem; }
    .nav-search-wrap { max-width: 260px; }
    .cart-btn { width: 46px; height: 46px; font-size: 1.15rem; }
    .hbg-btn { width: 46px; height: 46px; font-size: 1.3rem; }
    .cats-bar { top: 64px; }
    .hero { padding: 100px 22px 44px; }
    .hero-title { font-size: 2.9rem; }
    .hero-btns { flex-direction: row; }
    .btn-primary, .btn-outline { width: auto; }
    .stat-n { font-size: 1.7rem; }
    .product-grid { gap: 14px; }
    .card-img-wrap { height: 210px; }
    .card-name { font-size: 1rem; }
    .test-grid { grid-template-columns: repeat(2,1fr); }
    .cart-panel { max-width: 390px; right: 0; left: auto; }
    .modal-wrap { align-items: center; justify-content: center; padding: 22px; }
    .modal { border-radius: 24px; max-width: 500px; max-height: 90vh; }
    @keyframes slideUp { from{transform:scale(.9) translateY(20px);opacity:0} to{transform:scale(1) translateY(0);opacity:1} }
    .toast { left: 20px; right: auto; max-width: 320px; text-align: left; }
    .wa-float { width: 60px; height: 60px; font-size: 1.85rem; bottom: 28px; right: 24px; }
  }

  /* ════════════════════════════════════════
     DESKTOP  ≥ 860px — nav links, hide hamburger
  ════════════════════════════════════════ */
  @media (min-width: 860px) {
    .nav { padding: 0 5%; }
    .nav-inner { height: 70px; }
    .logo { font-size: 1.7rem; }
    .hbg-btn { display: none; }
    .nav-links {
      display: flex; gap: 22px; list-style: none; flex: 1; justify-content: center;
    }
    .nav-links a {
      font-size: .88rem; font-weight: 600; letter-spacing: .07em; text-transform: uppercase;
      color: var(--brown); text-decoration: none; transition: color .2s; padding: 5px 0;
    }
    .nav-links a:hover, .nav-links a.active { color: var(--lila); border-bottom: 2px solid var(--lila-light); }
    .nav-search-wrap { max-width: 220px; }
    .cats-bar { display: none; }

    .hero { padding: 100px 5% 70px; }
    .hero-inner { display: grid; grid-template-columns: 1fr 1fr; gap: 55px; align-items: center; }
    .hero-mosaic { display: grid; grid-template-columns: 1fr 1fr; gap: 13px; }
    .mosaic-img {
      border-radius: 20px; overflow: hidden;
      box-shadow: 0 14px 44px rgba(120,80,180,.2); border: 3px solid rgba(255,255,255,.85);
    }
    .mosaic-img img { width: 100%; height: 100%; object-fit: cover; transition: transform .5s; }
    .mosaic-img:hover img { transform: scale(1.05); }
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
    .card-img-wrap { height: 255px; }
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
    .cart-panel { max-width: 420px; }
  }

  @media (min-width: 1100px) {
    .hero-title { font-size: 4.2rem; }
    .product-grid { grid-template-columns: repeat(4,1fr); gap: 22px; }
    .card-img-wrap { height: 275px; }
    .test-grid { grid-template-columns: repeat(4,1fr); }
    .footer-grid { grid-template-columns: 2fr 1fr 1fr 1fr; gap: 50px; }
  }

  @media (max-height: 500px) and (orientation: landscape) {
    .hero { padding: 68px 5% 28px; }
    .hero-title { font-size: 1.9rem; }
    .cats-bar { position: relative; top: auto; }
    .modal { max-height: 98vh; }
  }
`;

const CATEGORIES = [
  { key:"BOLSOS",     label:"👜 Bolsos",     ico:"👜", color:"linear-gradient(135deg,#9B72CF,#7B5EA7)" },
  { key:"BILLETERAS", label:"💳 Billeteras", ico:"💳", color:"linear-gradient(135deg,#B8A0D8,#9B72CF)" },
  { key:"MAQUILLAJE", label:"💄 Maquillaje", ico:"💄", color:"linear-gradient(135deg,#F4A7C3,#D4719B)" },
  { key:"CAPILAR",    label:"✨ Capilar",     ico:"✨", color:"linear-gradient(135deg,#A8D4F0,#72B7D4)" },
  { key:"ROPA",       label:"👗 Ropa",        ico:"👗", color:"linear-gradient(135deg,#A8DEC4,#72BEA0)" },
];
const TESTIMONIALS = [
  { name:"Valentina R.", text:"¡Me llegó todo perfecto! La calidad es increíble, ya hice mi 3ra compra 💕", stars:5 },
  { name:"Camila T.",    text:"El bolso es exactamente como en la foto. La galería me convenció de comprarlo 🛍️", stars:5 },
  { name:"Sofía M.",     text:"El video del producto fue clave. Llegó igual y el maquillaje es increíble 💋", stars:5 },
  { name:"Isabella V.",  text:"Envío rapidísimo y el empaque es hermoso. 100% recomendada 🌸", stars:5 },
];

export default function App() {
  const [adminMode,setAdminMode]             = useState(false);
  const [trackingMode,setTrackingMode]       = useState(false);
  const [activeCategory,setActiveCategory]   = useState("BOLSOS");
  const [products,setProducts]               = useState([]);
  const [loading,setLoading]                 = useState(true);
  const [error,setError]                     = useState(null);
  const [cart,setCart]                       = useState([]);
  const [wishlist,setWishlist]               = useState([]);
  const [cartOpen,setCartOpen]               = useState(false);
  const [checkoutOpen,setCheckoutOpen]       = useState(false);
  const [orderSuccess,setOrderSuccess]       = useState(null);
  const [search,setSearch]                   = useState("");
  const [scrolled,setScrolled]               = useState(false);
  const [toast,setToast]                     = useState("");
  const [paying,setPaying]                   = useState(false);
  const [selectedProduct,setSelectedProduct] = useState(null);
  const [drawerOpen,setDrawerOpen]           = useState(false);
  const [form,setForm] = useState({name:"",email:"",address:""});
  const ref = useRef(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const d = await productAPI.getByCategory(activeCategory);
      setProducts(Array.isArray(d) ? d : (d.content||[]));
    } catch(e){ setError(e.message); }
    finally{ setLoading(false); }
  },[activeCategory]);

  useEffect(()=>{ fetchProducts(); },[fetchProducts]);
  useEffect(()=>{
    const fn=()=>setScrolled(window.scrollY>50);
    window.addEventListener("scroll",fn);
    return ()=>window.removeEventListener("scroll",fn);
  },[]);
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

  const showToast=msg=>{ setToast(msg); setTimeout(()=>setToast(""),2800); };
  const addToCart=(p,qty=1)=>{
    setCart(prev=>{
      const ex=prev.find(i=>i.id===p.id);
      if(ex) return prev.map(i=>i.id===p.id?{...i,qty:i.qty+qty}:i);
      return [...prev,{...p,qty}];
    });
    showToast(`✨ ${p.name} agregado`);
  };
  const removeFromCart=id=>setCart(prev=>prev.filter(i=>i.id!==id));
  const updateQty=(id,d)=>setCart(prev=>prev.map(i=>i.id===id?{...i,qty:Math.max(1,i.qty+d)}:i));
  const toggleWishlist=id=>setWishlist(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]);

  const cartTotal=cart.reduce((s,i)=>s+Number(i.price)*i.qty,0);
  const cartCount=cart.reduce((s,i)=>s+i.qty,0);
  const shipping=cartTotal>=80?0:cartTotal*.08;
  const grandTotal=cartTotal+shipping;

  const handleCheckout=async e=>{
    e.preventDefault(); setPaying(true);
    try{
      const mpItems=cart.map(i=>({
        id:i.id, name:i.name,
        description:i.description||i.name,
        quantity:i.qty, price:Number(i.price),
      }));
      const result=await orderAPI.createPaymentIntent(grandTotal,"COP",mpItems);
      await orderAPI.createOrder({
        name:form.name, email:form.email, address:form.address,
        paymentMethod:"MERCADOPAGO",
        paymentIntentId:result.preferenceId,
        items:cart.map(i=>({productId:i.id,quantity:i.qty})),
      });
      setCart([]);
      setCheckoutOpen(false);
      window.location.href=result.initPoint;
    }catch(e){ showToast("⚠️ "+e.message); }
    finally{ setPaying(false); }
  };

  const scrollTo=()=>ref.current?.scrollIntoView({behavior:"smooth"});
  const selectCat=cat=>{ setActiveCategory(cat); setSearch(""); setDrawerOpen(false); scrollTo(); };

  if(adminMode) return <AdminPanel onExit={()=>setAdminMode(false)} />;
  if(trackingMode) return (
    <div style={{minHeight:'100vh',background:'#F8F4FF',paddingTop:60}}>
      <OrderTracking onBack={()=>setTrackingMode(false)}/>
    </div>
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
          <div className="drawer-foot-txt">Síguenos en redes</div>
          <div className="drawer-contact">
            {["📘","📷","🎵","▶️"].map((s,i)=>(
              <a key={i} href="#" onClick={e=>e.preventDefault()} className="drawer-social">{s}</a>
            ))}
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
            <button className="cart-btn" onClick={()=>setCartOpen(true)}>
              🛍️{cartCount>0&&<span className="cart-badge">{cartCount}</span>}
            </button>
          </div>
        </div>
      </nav>

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

      {/* ── PROMO STRIP ── */}
      <div className="promo-strip">✦ Envío GRATIS en compras +$80 &nbsp;|&nbsp; 🎀 Hasta 40% OFF &nbsp;|&nbsp; 💳 Paga con Nequi, PSE, tarjeta ✦</div>

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
              {src:"https://images.unsplash.com/photo-1483985988355-763728e1935b?w=340&q=80",h:220},
              {src:"https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=340&q=80",h:180,mt:30},
              {src:"https://images.unsplash.com/photo-1599744331096-44b7a09e1059?w=340&q=80",h:180,mt:30},
              {src:"https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=340&q=80",h:220},
            ].map((img,i)=>(
              <div key={i} className="mosaic-img" style={{height:img.h,marginTop:img.mt||0}}>
                <img src={img.src} alt="" style={{height:"100%"}}/>
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
            {loading
              ? Array(6).fill(0).map((_,i)=>(
                  <div key={i} className="product-card">
                    <div className="skeleton" style={{height:180}}/>
                    <div style={{padding:"10px 12px 14px"}}>
                      <div className="skeleton" style={{height:12,width:"55%",marginBottom:8}}/>
                      <div className="skeleton" style={{height:18,marginBottom:10}}/>
                      <div className="skeleton" style={{height:36}}/>
                    </div>
                  </div>
                ))
              : products.length===0
              ? <div style={{gridColumn:"1/-1",textAlign:"center",padding:"48px 18px",color:"var(--muted)"}}>
                  <div style={{fontSize:"3rem",marginBottom:12}}>🔍</div>
                  <p style={{fontSize:"1rem",fontWeight:600}}>No se encontraron productos</p>
                </div>
              : products.map(p=>{
                  const pct=discountPct(p);
                  return (
                    <div key={p.id} className="product-card">
                      <div className="card-img-wrap" onClick={()=>setSelectedProduct(p)}>
                        <img className="card-img"
                          src={p.imageUrl||"https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&q=80"}
                          alt={p.name} loading="lazy"/>
                        <div className="card-see-more">{p.videoUrl?"🎥 Ver fotos y video →":"🔍 Ver más →"}</div>
                        {p.badge&&<span className={`card-badge ${p.badge}`}>{p.badge}</span>}
                        <button className="card-wish" onClick={e=>{e.stopPropagation();toggleWishlist(p.id);}}>
                          {wishlist.includes(p.id)?"❤️":"🤍"}
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
                        <button className="card-add" onClick={()=>addToCart(p)}>🛒 Agregar al carrito</button>
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
          {[["🚚","Envío Express","24–48 hrs Colombia"],["🔒","Pago Seguro","SSL cifrado"],["↩️","30 Días","Devolución fácil"],["💎","Premium","Garantía autenticidad"]].map(([icon,t,d])=>(
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
              <div className="footer-logo">✦ Kosmica</div>
              <p className="footer-desc">Tu destino de moda femenina premium. Calidad, estilo y exclusividad.</p>
              <div className="social-icons" style={{marginTop:14}}>
                {["📘","📷","🎵","▶️"].map((s,i)=><a key={i} href="#" onClick={e=>e.preventDefault()} className="social-icon">{s}</a>)}
              </div>
            </div>
            {[["Tienda",["Bolsos","Billeteras","Maquillaje","Capilar","Ropa"]],["Ayuda",["FAQ","Envíos","Devoluciones","Contacto"]]].map(([h,ls])=>(
              <div key={h}>
                <div className="footer-heading">{h}</div>
                <div className="footer-links">{ls.map(l=><a key={l} href="#" onClick={e=>e.preventDefault()}>{l}</a>)}</div>
              </div>
            ))}
            <div>
              <div className="footer-heading">Mi pedido</div>
              <div className="footer-links">
                <a href="#" onClick={e=>{e.preventDefault();setTrackingMode(true);}}>📦 Rastrear pedido</a>
                <a href="#" onClick={e=>e.preventDefault()}>Política de envíos</a>
                <a href="#" onClick={e=>e.preventDefault()}>Política de devoluciones</a>
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
      )}

      {/* ── CARRITO ── */}
      {cartOpen&&(
        <>
          <div className="overlay" onClick={()=>setCartOpen(false)}/>
          <div className="cart-panel">
            <div className="cart-header">
              <h2 className="cart-title">🛍️ Mi Carrito</h2>
              <button className="close-btn" onClick={()=>setCartOpen(false)}>✕</button>
            </div>
            <div className="cart-items">
              {cart.length===0
                ? <div className="cart-empty">
                    <div style={{fontSize:"3rem",marginBottom:14}}>🛍️</div>
                    <p style={{fontWeight:700,fontSize:"1.05rem",color:"var(--dark)"}}>Tu carrito está vacío</p>
                    <p style={{marginTop:8,color:"var(--muted)",fontSize:".9rem"}}>¡Explora nuestros productos!</p>
                  </div>
                : cart.map(item=>(
                    <div key={item.id} className="cart-item">
                      <img className="cart-item-img" src={item.imageUrl||"https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=200"} alt={item.name}/>
                      <div className="cart-item-info">
                        <div className="cart-item-name">{item.name}</div>
                        <div className="cart-item-price">{fmtCOP(Number(item.price)*item.qty)}</div>
                        <div className="qty-controls">
                          <button className="qty-btn" onClick={()=>updateQty(item.id,-1)}>−</button>
                          <span className="qty-val">{item.qty}</span>
                          <button className="qty-btn" onClick={()=>updateQty(item.id,1)}>+</button>
                          <button className="cart-remove" onClick={()=>removeFromCart(item.id)}>🗑️</button>
                        </div>
                      </div>
                    </div>
                  ))
              }
            </div>
            {cart.length>0&&(
              <div className="cart-footer">
                <div className="cart-row"><span>Subtotal</span><span>{fmtCOP(cartTotal)}</span></div>
                <div className="cart-row" style={{color:shipping===0?"#27AE60":undefined}}>
                  <span>Envío</span><span>{shipping===0?"GRATIS 🎉":fmtCOP(shipping)}</span>
                </div>
                <div className="cart-total-row">
                  <span>Total</span>
                  <span style={{color:"var(--lila)",fontFamily:"'Playfair Display',serif"}}>{fmtCOP(grandTotal)}</span>
                </div>
                <button className="checkout-btn" onClick={()=>{setCartOpen(false);setCheckoutOpen(true);}}>Finalizar Compra →</button>
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
                  <div className="summary-item" style={{color:shipping===0?"#27AE60":undefined}}>
                    <span>Envío</span><span>{shipping===0?"GRATIS":fmtCOP(shipping)}</span>
                  </div>
                  <div className="summary-total">
                    <span>Total</span><span style={{color:"var(--lila)"}}>{fmtCOP(grandTotal)}</span>
                  </div>
                </div>
                <p className="form-section">Información Personal</p>
                {[["Nombre completo","name","text"],["Correo electrónico","email","email"],["Dirección de envío","address","text"]].map(([label,field,type])=>(
                  <div key={field} className="form-group">
                    <label className="form-label">{label}</label>
                    <input required type={type} className="form-input" value={form[field]}
                      onChange={e=>setForm(p=>({...p,[field]:e.target.value}))}/>
                  </div>
                ))}
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
                <button type="submit" className="pay-btn" disabled={paying}
                  style={{background:'linear-gradient(135deg,#009EE3,#0070B8)'}}>
                  {paying?"⏳ Redirigiendo...":`Ir a pagar ${fmtCOP(grandTotal)} COP →`}
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
                <p className="success-sub">Tu pedido está siendo preparado. Recibirás un correo con el seguimiento. 💕</p>
                <div className="order-num-badge">Pedido: {orderSuccess.orderNumber}</div>
                <br/>
                <button className="btn-primary" style={{width:"auto",display:"inline-block"}}
                  onClick={()=>{setOrderSuccess(null);setCheckoutOpen(false);}}>
                  Seguir Comprando ✦
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── WHATSAPP ── */}
      <a className="wa-float" href="https://wa.me/573000000000?text=Hola%20Kosmica%2C%20quiero%20información"
        target="_blank" rel="noreferrer" aria-label="WhatsApp">💬</a>
    </>
  );
}
