// ============================================================
//  src/App.jsx — Kosmica v3  MOBILE-FIRST RESPONSIVE
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
    --lila:       #9B72CF;
    --lila-dark:  #7B5EA7;
    --lila-light: #C9B8E8;
    --lila-xlight:#F0E8FF;
    --pink:       #F4A7C3;
    --mint:       #A8DEC4;
    --cream:      #FDF8FF;
    --dark:       #2D1B4E;
    --brown:      #6B5B8A;
    --muted:      #B8A0D8;
    --shadow:     0 8px 28px rgba(155,114,207,.28);
    --shadow-sm:  0 4px 16px rgba(120,80,180,.12);
    --r:          16px;
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
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-thumb { background: var(--lila-light); border-radius: 2px; }

  /* ── NAVBAR ── */
  .nav {
    position: fixed; top: 0; left: 0; right: 0; z-index: 900;
    padding: 0 14px; transition: all .3s;
  }
  .nav.scrolled {
    background: rgba(253,248,255,.97); backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(155,114,207,.18);
    box-shadow: 0 2px 20px rgba(120,80,180,.08);
  }
  .nav-inner {
    height: 52px; display: flex; align-items: center;
    justify-content: space-between; gap: 8px; max-width: 1400px; margin: 0 auto;
  }
  .logo {
    font-family: 'Playfair Display', serif; font-size: 1.2rem; font-weight: 900;
    background: linear-gradient(135deg, var(--lila), var(--lila-dark));
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    cursor: pointer; flex-shrink: 0; white-space: nowrap;
  }
  .nav-links { display: none; }
  .nav-right { display: flex; align-items: center; gap: 7px; }
  .search-box {
    padding: 7px 11px; border-radius: 30px;
    border: 2px solid var(--lila-xlight); background: rgba(255,255,255,.9);
    font-size: .82rem; width: 85px; min-height: 40px; outline: none;
    transition: all .3s; color: var(--dark);
  }
  .search-box:focus { border-color: var(--lila); width: 130px; }
  .admin-toggle { min-height: 38px;
    padding: 5px 9px; background: var(--lila-xlight); color: var(--lila-dark);
    border: 2px solid var(--lila-light); border-radius: 30px;
    font-size: .76rem; font-weight: 700; white-space: nowrap; transition: all .2s;
  }
  .cart-btn {
    position: relative; background: linear-gradient(135deg, var(--lila), var(--lila-dark));
    border: none; border-radius: 50%; width: 38px; height: 38px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    font-size: .95rem; box-shadow: var(--shadow); transition: transform .2s;
  }
  .cart-btn:hover, .cart-btn:active { transform: scale(1.08); }
  .cart-badge {
    position: absolute; top: -3px; right: -3px;
    background: var(--pink); color: #fff; border-radius: 50%;
    width: 17px; height: 17px; font-size: .82rem; font-weight: 800;
    display: flex; align-items: center; justify-content: center;
  }

  /* ── CATEGORÍAS MÓVIL (scroll horizontal) ── */
  .mobile-cats {
    position: fixed; top: 52px; left: 0; right: 0; z-index: 890;
    display: flex; gap: 7px; overflow-x: auto; padding: 9px 14px;
    background: rgba(253,248,255,.97); border-bottom: 1px solid var(--lila-xlight);
    scrollbar-width: none; -webkit-overflow-scrolling: touch;
  }
  .mobile-cats::-webkit-scrollbar { display: none; }
  .mobile-cat-btn {
    padding: 6px 12px; border-radius: 30px; border: 2px solid var(--lila-xlight);
    background: #fff; color: var(--brown); font-size: .8rem; font-weight: 600;
    white-space: nowrap; flex-shrink: 0; transition: all .2s;
  }
  .mobile-cat-btn.active { border-color: transparent; color: #fff; box-shadow: 0 3px 12px rgba(155,114,207,.35); }

  /* ── ANIMACIONES ── */
  @keyframes moveGrad { 0%{background-position:0%} 100%{background-position:300%} }
  @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
  @keyframes slideRight { from{transform:translateX(100%);opacity:0} to{transform:translateX(0);opacity:1} }
  @keyframes slideLeft { from{transform:translateX(-100%);opacity:0} to{transform:translateX(0);opacity:1} }
  @keyframes slideUp { from{transform:translateY(100%);opacity:0} to{transform:translateY(0);opacity:1} }
  @keyframes popIn { from{transform:scale(.9);opacity:0} to{transform:scale(1);opacity:1} }

  /* ── HERO BASE MÓVIL ── */
  .hero {
    min-height: auto; padding: 88px 16px 36px;
    display: flex; align-items: center;
    background: linear-gradient(160deg,#EDE4FF 0%,#F5EEFF 40%,#FDE8F5 70%,#FFE8F0 100%);
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
    background: rgba(155,114,207,.12); border: 1.5px solid rgba(155,114,207,.28);
    border-radius: 30px; padding: 5px 13px; color: var(--lila);
    font-size: .76rem; font-weight: 700; letter-spacing: .13em; text-transform: uppercase;
    margin-bottom: 14px; width: fit-content;
  }
  .hero-title {
    font-family: 'Playfair Display', serif;
    font-size: 2.1rem; line-height: 1.15; color: var(--dark); font-weight: 900;
    margin-bottom: 10px;
  }
  .hero-title em {
    font-style: italic;
    background: linear-gradient(135deg, var(--lila), var(--pink));
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  }
  .hero-sub { color: var(--brown); font-size: .93rem; line-height: 1.7; margin-bottom: 18px; }
  .hero-btns { display: flex; flex-direction: column; gap: 10px; margin-bottom: 22px; }
  .btn-primary {
    padding: 13px 24px; text-align: center;
    background: linear-gradient(135deg, var(--lila), var(--lila-dark));
    color: #fff; border: none; border-radius: 50px;
    font-weight: 700; font-size: .84rem; letter-spacing: .05em;
    box-shadow: var(--shadow); transition: all .3s;
  }
  .btn-primary:hover { transform: translateY(-2px); filter: brightness(1.06); }
  .btn-outline {
    padding: 12px 24px; text-align: center;
    background: rgba(155,114,207,.08); color: var(--lila-dark);
    border: 2px solid rgba(155,114,207,.35); border-radius: 50px;
    font-weight: 600; font-size: .84rem; transition: all .3s;
  }
  .hero-stats { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; }
  .stat-n { font-family: 'Playfair Display', serif; font-size: 1.35rem; font-weight: 700; color: var(--lila); }
  .stat-l { font-size: .73rem; color: var(--muted); margin-top: 1px; }

  /* ── PROMO STRIP ── */
  .promo-strip {
    background: linear-gradient(90deg,var(--lila),var(--pink),var(--mint),var(--lila));
    background-size: 300%; animation: moveGrad 6s linear infinite;
    padding: 8px 0; text-align: center;
    color: #fff; font-size: .75rem; font-weight: 700; letter-spacing: .07em; text-transform: uppercase;
  }

  /* ── PRODUCTOS BASE MÓVIL ── */
  .section-wrap { max-width: 1400px; margin: 0 auto; padding: 0 12px; }
  .products-section { padding: 14px 0 36px; }
  .section-eyebrow { font-size: .78rem; font-weight: 700; letter-spacing: .2em; text-transform: uppercase; color: var(--lila); margin-bottom: 5px; }
  .section-title { font-family: 'Playfair Display', serif; font-size: 1.45rem; font-weight: 700; color: var(--dark); margin-bottom: 14px; }
  .cat-pills { display: none; }

  .product-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 9px; }
  .product-card {
    background: #fff; border-radius: var(--r); overflow: hidden;
    box-shadow: var(--shadow-sm); transition: transform .3s, box-shadow .3s;
    border: 2px solid transparent;
  }
  .product-card:hover { transform: translateY(-4px); box-shadow: 0 14px 40px rgba(155,114,207,.18); border-color: var(--lila-xlight); }
  .card-img-wrap { position: relative; overflow: hidden; height: 155px; background: #F8F4FF; cursor: pointer; }
  .card-img { width: 100%; height: 100%; object-fit: cover; transition: transform .5s; }
  .product-card:hover .card-img { transform: scale(1.05); }
  .card-see-more {
    position: absolute; bottom: 0; left: 0; right: 0;
    background: linear-gradient(transparent,rgba(45,27,78,.7));
    color: #fff; text-align: center; padding: 16px 6px 9px;
    font-size: .76rem; font-weight: 700; opacity: 0; transition: opacity .3s;
  }
  .product-card:hover .card-see-more { opacity: 1; }
  .card-badge {
    position: absolute; top: 7px; left: 7px;
    padding: 3px 8px; border-radius: 30px;
    font-size: .82rem; font-weight: 800; letter-spacing: .07em; text-transform: uppercase;
  }
  .card-badge.VIRAL    { background: linear-gradient(135deg,#F4A7C3,#C9B8E8); color:#fff; }
  .card-badge.HOT      { background: linear-gradient(135deg,#FFB3BA,#FFCBA4); color:#fff; }
  .card-badge.BESTSELLER { background: linear-gradient(135deg,#C9B8E8,#9B72CF); color:#fff; }
  .card-badge.NUEVO    { background: linear-gradient(135deg,#A8DEC4,#80CBA8); color:#fff; }
  .card-wish {
    position: absolute; top: 7px; right: 7px;
    background: rgba(255,255,255,.9); border: none; border-radius: 50%;
    width: 30px; height: 30px; display: flex; align-items: center;
    justify-content: center; font-size: .8rem; box-shadow: 0 2px 8px rgba(120,80,180,.15);
    transition: transform .2s;
  }
  .card-wish:active { transform: scale(1.2); }
  .card-body { padding: 8px 10px 10px; }
  .card-stars { color: #C9A96E; font-size: .78rem; }
  .card-reviews { color: #ccc; font-size: .73rem; margin-left: 3px; }
  .card-name {
    font-weight: 600; font-size: .86rem; color: var(--dark); margin: 3px 0 6px; line-height: 1.3;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  }
  .card-footer { display: flex; align-items: center; justify-content: space-between; gap: 5px; }
  .card-price { font-family: 'Playfair Display', serif; font-size: 1rem; font-weight: 700; color: var(--lila); }
  .card-original { font-size: .76rem; color: #bbb; text-decoration: line-through; display: none; }
  .card-add {
    background: linear-gradient(135deg, var(--lila), var(--lila-dark));
    color: #fff; border: none; border-radius: 9px;
    padding: 7px 10px; font-weight: 700; font-size: .78rem; white-space: nowrap;
    box-shadow: 0 3px 10px rgba(155,114,207,.3); transition: all .25s; flex-shrink: 0;
  }
  .card-add:active { transform: scale(.95); }

  .skeleton {
    background: linear-gradient(90deg,#f0eaff 25%,#f8f4ff 50%,#f0eaff 75%);
    background-size: 200%; animation: shimmer 1.4s infinite; border-radius: 10px;
  }

  /* ── TESTIMONIOS BASE MÓVIL ── */
  .testimonials { padding: 36px 14px; background: linear-gradient(135deg,#2D1B4E 0%,#4A2D7A 60%,#6B3FA0 100%); }
  .test-eyebrow { font-size: .73rem; font-weight: 700; letter-spacing: .2em; text-transform: uppercase; color: var(--lila-light); margin-bottom: 6px; }
  .test-title { font-family: 'Playfair Display', serif; font-size: 1.4rem; font-weight: 700; color: #fff; margin-bottom: 16px; }
  .test-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
  .test-card { background: rgba(255,255,255,.07); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,.13); border-radius: 16px; padding: 18px 16px; }
  .test-stars { color: #F4A7C3; font-size: .82rem; margin-bottom: 8px; }
  .test-text { color: rgba(255,255,255,.8); font-size: .85rem; line-height: 1.65; margin-bottom: 10px; }
  .test-author { display: flex; align-items: center; gap: 9px; }
  .test-avatar { width: 34px; height: 34px; border-radius: 50%; background: linear-gradient(135deg,var(--lila-light),var(--pink)); display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: .82rem; flex-shrink: 0; }
  .test-name { color: #fff; font-weight: 600; font-size: .8rem; }

  /* ── FEATURES BASE MÓVIL ── */
  .features { padding: 28px 14px; background: #fff; }
  .feat-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 10px; max-width: 1400px; margin: 0 auto; }
  .feat-card { text-align: center; padding: 14px 10px; background: var(--lila-xlight); border-radius: 16px; border: 1.5px solid rgba(155,114,207,.14); }
  .feat-icon { font-size: 1.6rem; margin-bottom: 6px; }
  .feat-title { font-weight: 700; font-size: .88rem; margin-bottom: 3px; color: var(--dark); }
  .feat-sub { font-size: .8rem; color: var(--brown); line-height: 1.5; }

  /* ── FOOTER BASE MÓVIL ── */
  .footer { background: #1A0D30; padding: 36px 14px 18px; color: rgba(255,255,255,.55); font-size: .78rem; }
  .footer-inner { max-width: 1400px; margin: 0 auto; }
  .footer-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 28px; }
  .footer-brand { grid-column: 1 / -1; }
  .footer-logo { font-family: 'Playfair Display', serif; font-size: 1.35rem; font-weight: 900; background: linear-gradient(135deg,var(--lila-light),var(--pink)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 8px; }
  .footer-desc { line-height: 1.72; color: rgba(255,255,255,.38); font-size: .76rem; }
  .footer-heading { color: var(--lila-light); font-weight: 700; letter-spacing: .09em; text-transform: uppercase; font-size: .73rem; margin-bottom: 10px; }
  .footer-links a { display: block; margin-bottom: 6px; color: rgba(255,255,255,.38); text-decoration: none; transition: color .2s; font-size: .76rem; }
  .footer-links a:hover { color: var(--lila-light); }
  .footer-bottom { border-top: 1px solid rgba(155,114,207,.14); padding-top: 16px; display: flex; flex-direction: column; gap: 10px; text-align: center; font-size: .82rem; }
  .social-icons { display: flex; gap: 7px; justify-content: center; }
  .social-icon { width: 32px; height: 32px; border-radius: 50%; background: rgba(155,114,207,.12); border: 1px solid rgba(155,114,207,.22); display: flex; align-items: center; justify-content: center; font-size: .82rem; transition: all .2s; text-decoration: none; }
  .social-icon:hover { background: rgba(155,114,207,.24); transform: translateY(-2px); }

  /* ── OVERLAY ── */
  .overlay { position: fixed; inset: 0; background: rgba(45,27,78,.44); z-index: 998; backdrop-filter: blur(4px); }

  /* ── CARRITO MÓVIL ── */
  .cart-panel { position: fixed; inset: 0; background: var(--cream); z-index: 999; display: flex; flex-direction: column; animation: slideRight .34s ease; }
  .cart-header { padding: 16px 16px 12px; border-bottom: 1px solid var(--lila-xlight); display: flex; justify-content: space-between; align-items: center; }
  .cart-title { font-family: 'Playfair Display', serif; font-size: 1.25rem; font-weight: 700; color: var(--dark); }
  .close-btn { background: none; border: none; font-size: 1.1rem; color: var(--muted); }
  .close-btn:hover { color: var(--lila); }
  .cart-items { flex: 1; overflow-y: auto; padding: 12px 16px; }
  .cart-empty { text-align: center; padding: 48px 20px; color: var(--muted); }
  .cart-item { display: flex; gap: 11px; margin-bottom: 12px; background: #fff; border-radius: 13px; padding: 11px; box-shadow: 0 2px 10px rgba(120,80,180,.07); }
  .cart-item-img { width: 62px; height: 62px; border-radius: 9px; object-fit: cover; flex-shrink: 0; }
  .cart-item-info { flex: 1; min-width: 0; }
  .cart-item-name { font-size: .78rem; font-weight: 600; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .cart-item-price { color: var(--lila); font-weight: 700; font-size: .82rem; margin-bottom: 6px; }
  .qty-controls { display: flex; align-items: center; gap: 5px; }
  .qty-btn { width: 25px; height: 25px; border-radius: 7px; border: 1.5px solid var(--lila-xlight); background: #fff; font-weight: 700; color: var(--lila-dark); font-size: .82rem; display: flex; align-items: center; justify-content: center; transition: all .2s; }
  .qty-btn:hover { border-color: var(--lila); background: var(--lila-xlight); }
  .qty-val { font-weight: 600; min-width: 17px; text-align: center; font-size: .82rem; }
  .cart-remove { background: none; border: none; margin-left: auto; color: var(--pink); font-size: .9rem; }
  .cart-footer { padding: 12px 16px 22px; border-top: 1px solid var(--lila-xlight); }
  .cart-row { display: flex; justify-content: space-between; font-size: .78rem; color: var(--brown); margin-bottom: 4px; }
  .cart-total-row { display: flex; justify-content: space-between; font-weight: 700; font-size: .92rem; margin: 9px 0 13px; }
  .checkout-btn { width: 100%; padding: 13px; background: linear-gradient(135deg,var(--lila),var(--lila-dark)); color: #fff; border: none; border-radius: 13px; font-weight: 700; font-size: .88rem; box-shadow: var(--shadow); transition: all .3s; }

  /* ── CHECKOUT MODAL MÓVIL ── */
  .modal-wrap { position: fixed; inset: 0; z-index: 1100; display: flex; align-items: flex-end; }
  .modal { background: var(--cream); border-radius: 20px 20px 0 0; width: 100%; max-height: 94vh; overflow-y: auto; box-shadow: 0 -8px 50px rgba(120,80,180,.28); animation: slideUp .36s ease; }
  .modal-header { padding: 16px 16px 12px; border-bottom: 1px solid var(--lila-xlight); display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; background: var(--cream); z-index: 2; }
  .modal-title { font-family: 'Playfair Display', serif; font-size: 1.15rem; font-weight: 700; color: var(--dark); }
  .modal-body { padding: 14px 16px 32px; }
  .form-section { font-size: .73rem; font-weight: 700; letter-spacing: .15em; text-transform: uppercase; color: var(--lila); margin: 15px 0 8px; }
  .form-group { margin-bottom: 10px; }
  .form-label { display: block; font-size: .82rem; font-weight: 600; color: var(--brown); margin-bottom: 4px; }
  .form-input { width: 100%; padding: 12px 12px; border-radius: 11px; border: 2px solid var(--lila-xlight); background: #fff; font-size: 16px; outline: none; transition: border .2s; color: var(--dark); }
  .form-input:focus { border-color: var(--lila); }
  .card-visual { background: linear-gradient(135deg,#2D1B4E,#4A2D7A); border-radius: 14px; padding: 16px; margin-bottom: 10px; }
  .card-label { color: rgba(255,255,255,.44); font-size: .73rem; margin-bottom: 5px; }
  .card-input { width: 100%; background: none; border: none; color: #fff; font-size: 1rem; letter-spacing: .1em; outline: none; font-family: inherit; }
  .card-row { display: flex; gap: 14px; margin-top: 12px; }
  .card-row-half { flex: 1; }
  .card-row-input { background: none; border: none; color: #fff; font-size: .85rem; outline: none; width: 100%; }
  .secure-note { display: flex; align-items: center; gap: 5px; font-size: .78rem; color: var(--muted); justify-content: center; margin-top: 8px; }
  .pay-btn { width: 100%; padding: 14px; background: linear-gradient(135deg,var(--lila),var(--lila-dark)); color: #fff; border: none; border-radius: 13px; font-weight: 800; font-size: .92rem; letter-spacing: .04em; box-shadow: var(--shadow); margin-top: 14px; transition: all .3s; }
  .pay-btn:hover:not(:disabled) { transform: translateY(-1px); }
  .pay-btn:disabled { opacity: .7; cursor: wait; }
  .order-summary-box { background: var(--lila-xlight); border: 1px solid rgba(155,114,207,.2); border-radius: 12px; padding: 12px; margin-bottom: 12px; }
  .summary-item { display: flex; justify-content: space-between; font-size: .76rem; color: var(--brown); margin-bottom: 3px; }
  .summary-total { display: flex; justify-content: space-between; font-weight: 700; margin-top: 7px; padding-top: 7px; border-top: 1px solid rgba(155,114,207,.2); }
  .success-modal { text-align: center; padding: 36px 18px 44px; }
  .success-icon { width: 62px; height: 62px; border-radius: 50%; background: linear-gradient(135deg,#A8DEC4,#52B788); display: flex; align-items: center; justify-content: center; font-size: 1.8rem; margin: 0 auto 14px; }
  .success-title { font-family: 'Playfair Display', serif; font-size: 1.65rem; font-weight: 700; margin-bottom: 9px; color: var(--dark); }
  .success-sub { color: var(--muted); font-size: .83rem; line-height: 1.7; margin-bottom: 18px; }
  .order-num-badge { background: var(--lila-xlight); border: 1px solid var(--lila-light); border-radius: 9px; padding: 7px 15px; display: inline-block; font-weight: 700; color: var(--lila); font-size: .82rem; margin-bottom: 20px; font-family: 'Playfair Display', serif; }


  /* ── WHATSAPP FLOTANTE ── */
  .wa-float{
    position:fixed; bottom:22px; right:16px; z-index:800;
    width:52px; height:52px; border-radius:50%;
    background:linear-gradient(135deg,#25D366,#128C7E);
    display:flex; align-items:center; justify-content:center;
    font-size:1.55rem; box-shadow:0 6px 22px rgba(37,211,102,.45);
    border:none; cursor:pointer; transition:transform .25s;
    text-decoration:none;
  }
  .wa-float:hover,.wa-float:active{ transform:scale(1.1); }
  @media(min-width:860px){ .wa-float{ width:58px; height:58px; bottom:30px; right:28px; font-size:1.75rem; } }

  /* ── TOAST ── */
  .toast { position: fixed; bottom: 18px; left: 12px; right: 12px; z-index: 9999; background: linear-gradient(135deg,var(--lila),var(--lila-dark)); color: #fff; padding: 11px 16px; border-radius: 13px; font-weight: 600; font-size: .8rem; box-shadow: 0 8px 28px rgba(155,114,207,.42); animation: slideLeft .4s ease; text-align: center; }
  .error-banner { background: #FFF0F8; border: 1px solid #F4A7C3; border-radius: 11px; padding: 11px 13px; color: #8B2252; font-size: .8rem; margin: 12px 0; display: flex; align-items: center; gap: 7px; }

  /* ══════════════════════════════════════
     TABLET  ≥ 580px
  ══════════════════════════════════════ */
  @media (min-width: 580px) {
    .nav-inner { height: 62px; }
    .logo { font-size: 1.5rem; }
    .search-box { width: 140px; }
    .search-box:focus { width: 180px; }
    .admin-toggle { min-height: 38px; padding: 6px 12px; font-size: .82rem; }
    .cart-btn { width: 42px; height: 42px; font-size: 1rem; }
    .mobile-cats { top: 62px; }
    .hero { padding: 130px 22px 55px; }
    .hero-title { font-size: 2.9rem; }
    .hero-sub { font-size: .93rem; max-width: 420px; }
    .hero-btns { flex-direction: row; }
    .btn-primary, .btn-outline { width: auto; }
    .stat-n { font-size: 1.65rem; }
    .product-grid { gap: 14px; }
    .card-img-wrap { height: 200px; }
    .card-name { font-size: .8rem; }
    .card-price { font-size: 1.05rem; }
    .card-original { display: inline; }
    .test-grid { grid-template-columns: repeat(2,1fr); }
    .test-title { font-size: 1.8rem; }
    .footer-grid { grid-template-columns: 1fr 1fr 1fr; }
    .footer-brand { grid-column: 1 / -1; }
    .cart-panel { max-width: 370px; right: 0; left: auto; }
    .modal-wrap { align-items: center; justify-content: center; padding: 20px; }
    .modal { border-radius: 22px; max-width: 490px; max-height: 90vh; }
    @keyframes slideUp { from{transform:scale(.9) translateY(20px);opacity:0} to{transform:scale(1) translateY(0);opacity:1} }
    .toast { left: 18px; right: auto; max-width: 300px; text-align: left; }
    .promo-strip { font-size: .82rem; }
  }

  /* ══════════════════════════════════════
     TABLET GRANDE  ≥ 860px
  ══════════════════════════════════════ */
  @media (min-width: 860px) {
    .nav { padding: 0 5%; }
    .nav-inner { height: 68px; }
    .logo { font-size: 1.65rem; }
    .nav-links { display: flex; gap: 20px; list-style: none; flex: 1; justify-content: center; }
    .nav-links a { font-size: .75rem; font-weight: 600; letter-spacing: .09em; text-transform: uppercase; color: var(--brown); text-decoration: none; transition: color .2s; padding: 4px 0; }
    .nav-links a:hover, .nav-links a.active { color: var(--lila); border-bottom: 2px solid var(--lila-light); }
    .mobile-cats { display: none; }
    .search-box { width: 155px; }
    .search-box:focus { width: 200px; }
    .cart-btn { width: 44px; height: 44px; }
    .hero { padding: 98px 5% 65px; min-height: 100vh; }
    .hero-inner { display: grid; grid-template-columns: 1fr 1fr; gap: 55px; align-items: center; }
    .hero-mosaic { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .mosaic-img { border-radius: 20px; overflow: hidden; box-shadow: 0 14px 44px rgba(120,80,180,.2); border: 3px solid rgba(255,255,255,.8); }
    .mosaic-img img { width: 100%; height: 100%; object-fit: cover; transition: transform .5s; }
    .mosaic-img:hover img { transform: scale(1.04); }
    .hero-title { font-size: 3.5rem; }
    .hero-btns { flex-direction: row; }
    .btn-primary, .btn-outline { width: auto; }
    .stat-n { font-size: 1.85rem; }
    .section-wrap { padding: 0 22px; }
    .products-section { padding: 44px 0 60px; }
    .cat-pills { display: flex; gap: 9px; flex-wrap: wrap; margin-bottom: 32px; }
    .cat-pill { padding: 10px 20px; border-radius: 50px; font-weight: 600; font-size: .78rem; border: 2px solid var(--lila-xlight); background: #fff; color: var(--brown); transition: all .28s; box-shadow: var(--shadow-sm); }
    .cat-pill:hover { transform: translateY(-2px); }
    .cat-pill.active { border-color: transparent; color: #fff; box-shadow: 0 6px 20px rgba(155,114,207,.35); }
    .section-title { font-size: 2.2rem; margin-bottom: 30px; }
    .product-grid { grid-template-columns: repeat(3,1fr); gap: 18px; }
    .card-img-wrap { height: 240px; }
    .card-body { padding: 13px 15px 15px; }
    .card-name { font-size: .86rem; }
    .card-price { font-size: 1.15rem; }
    .card-add { padding: 8px 13px; font-size: .74rem; }
    .testimonials { padding: 65px 5%; }
    .test-grid { grid-template-columns: repeat(2,1fr); gap: 15px; }
    .test-title { font-size: 2rem; }
    .features { padding: 50px 5%; }
    .feat-grid { grid-template-columns: repeat(4,1fr); gap: 18px; }
    .footer { padding: 50px 5% 22px; }
    .footer-grid { grid-template-columns: 2fr 1fr 1fr; gap: 38px; }
    .footer-brand { grid-column: auto; }
    .footer-bottom { flex-direction: row; text-align: left; }
    .social-icons { justify-content: flex-start; }
    .cart-panel { max-width: 400px; }
  }

  /* ══════════════════════════════════════
     DESKTOP  ≥ 1100px
  ══════════════════════════════════════ */
  @media (min-width: 1100px) {
    .hero-title { font-size: 4rem; }
    .product-grid { grid-template-columns: repeat(4,1fr); gap: 22px; }
    .card-img-wrap { height: 265px; }
    .test-grid { grid-template-columns: repeat(4,1fr); }
    .footer-grid { grid-template-columns: 2fr 1fr 1fr 1fr; gap: 48px; }
    .promo-strip { font-size: .78rem; }
  }

  /* ══════════════════════════════════════
     LANDSCAPE MÓVIL
  ══════════════════════════════════════ */
  @media (max-height: 500px) and (orientation: landscape) {
    .hero { min-height: auto; padding: 70px 5% 34px; }
    .hero-title { font-size: 1.9rem; }
    .mobile-cats { position: relative; top: auto; }
    .modal { max-height: 98vh; }
  }
`;

const CATEGORIES = [
  { key:"BOLSOS",     label:"👜 Bolsos",       color:"linear-gradient(135deg,#9B72CF,#7B5EA7)" },
  { key:"BILLETERAS", label:"💳 Billeteras",    color:"linear-gradient(135deg,#B8A0D8,#9B72CF)" },
  { key:"MAQUILLAJE", label:"💄 Maquillaje",    color:"linear-gradient(135deg,#F4A7C3,#D4719B)" },
  { key:"CAPILAR",    label:"✨ Capilar",        color:"linear-gradient(135deg,#A8D4F0,#72B7D4)" },
  { key:"ROPA",       label:"👗 Ropa",           color:"linear-gradient(135deg,#A8DEC4,#72BEA0)" },
];
const TESTIMONIALS = [
  { name:"Valentina R.", text:"¡Me llegó todo perfecto! La calidad es increíble, ya hice mi 3ra compra 💕", stars:5 },
  { name:"Camila T.",    text:"El bolso es exactamente como en la foto. La galería me convenció de comprarlo 🛍️", stars:5 },
  { name:"Sofía M.",     text:"El video del producto fue clave. Llegó igual y el maquillaje es increíble 💋", stars:5 },
  { name:"Isabella V.",  text:"Envío rapidísimo y el empaque es hermoso. 100% recomendada 🌸", stars:5 },
];

export default function App() {
  const [adminMode,setAdminMode]           = useState(false);
  const [trackingMode,setTrackingMode]     = useState(false);
  const [activeCategory,setActiveCategory] = useState("BOLSOS");
  const [products,setProducts]             = useState([]);
  const [loading,setLoading]               = useState(true);
  const [error,setError]                   = useState(null);
  const [cart,setCart]                     = useState([]);
  const [wishlist,setWishlist]             = useState([]);
  const [cartOpen,setCartOpen]             = useState(false);
  const [checkoutOpen,setCheckoutOpen]     = useState(false);
  const [orderSuccess,setOrderSuccess]     = useState(null);
  const [search,setSearch]                 = useState("");
  const [scrolled,setScrolled]             = useState(false);
  const [toast,setToast]                   = useState("");
  const [paying,setPaying]                 = useState(false);
  const [selectedProduct,setSelectedProduct] = useState(null);
  const [form,setForm] = useState({name:"",email:"",address:"",card:"",expiry:"",cvv:""});
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
      // Preparar items para MercadoPago
      const mpItems=cart.map(i=>({
        id:i.id, name:i.name,
        description:i.description||i.name,
        quantity:i.qty, price:Number(i.price),
      }));

      // Crear preferencia de pago en MercadoPago
      const result=await orderAPI.createPaymentIntent(grandTotal,"COP",mpItems);

      // Guardar pedido en la base de datos
      await orderAPI.createOrder({
        name:form.name, email:form.email, address:form.address,
        paymentMethod:"MERCADOPAGO",
        paymentIntentId:result.preferenceId,
        items:cart.map(i=>({productId:i.id,quantity:i.qty})),
      });

      setCart([]);
      setCheckoutOpen(false);

      // Redirigir a MercadoPago para completar el pago
      window.location.href=result.initPoint;

    }catch(e){ showToast("⚠️ "+e.message); }
    finally{ setPaying(false); }
  };

  const scrollTo=()=>ref.current?.scrollIntoView({behavior:"smooth"});
  const selectCat=cat=>{ setActiveCategory(cat); setSearch(""); scrollTo(); };

  if(adminMode) return <AdminPanel onExit={()=>setAdminMode(false)} />;
  if(trackingMode) return <div style={{minHeight:'100vh',background:'#F8F4FF',paddingTop:60}}><OrderTracking onBack={()=>setTrackingMode(false)}/></div>;

  return (
    <>
      <style>{CSS}</style>
      {toast && <div className="toast">{toast}</div>}

      {/* NAVBAR */}
      <nav className={`nav${scrolled?" scrolled":""}`}>
        <div className="nav-inner">
          <div className="logo" onClick={()=>window.scrollTo({top:0,behavior:"smooth"})}>✦ Kosmica</div>
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
            <input className="search-box" placeholder="🔍 Buscar..." value={search} onChange={e=>setSearch(e.target.value)} />
            <button className="admin-toggle" onClick={()=>setTrackingMode(true)} style={{background:'rgba(168,222,196,.2)',borderColor:'#A8DEC4',color:'#1A6B3A'}}>📦 Mi pedido</button>
            <button className="admin-toggle" onClick={()=>setAdminMode(true)}>⚙️ Admin</button>
            <button className="cart-btn" onClick={()=>setCartOpen(true)}>
              🛍️{cartCount>0&&<span className="cart-badge">{cartCount}</span>}
            </button>
          </div>
        </div>
      </nav>

      {/* CATEGORÍAS MÓVIL */}
      <div className="mobile-cats">
        {CATEGORIES.map(c=>(
          <button key={c.key}
            className={`mobile-cat-btn${activeCategory===c.key?" active":""}`}
            onClick={()=>selectCat(c.key)}
            style={activeCategory===c.key?{background:c.color}:{}}>
            {c.label}
          </button>
        ))}
      </div>

      {/* HERO */}
      <section className="hero">
        <div className="hero-inner">
          <div>
            <div className="hero-tag">✦ Nueva Colección 2026</div>
            <h1 className="hero-title">Moda que te<br/><em>enamora</em> ✦</h1>
            <p className="hero-sub">Bolsos, maquillaje, capilar y ropa femenina premium. Galería con fotos y videos.</p>
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
                <img src={img.src} alt="" style={{height:"100%"}} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="promo-strip">✦ Envío GRATIS en compras +$80 &nbsp;|&nbsp; 🎀 Hasta 40% OFF &nbsp;|&nbsp; 💳 3 cuotas sin interés ✦</div>

      {/* PRODUCTOS */}
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
              <button onClick={fetchProducts} style={{background:"none",border:"1px solid #F4A7C3",borderRadius:6,padding:"2px 10px",cursor:"pointer",color:"#8B2252",fontSize:".74rem",marginLeft:8}}>Reintentar</button>
            </div>
          )}
          <div className="product-grid">
            {loading
              ? Array(6).fill(0).map((_,i)=>(
                  <div key={i} className="product-card">
                    <div className="skeleton" style={{height:170}}/>
                    <div style={{padding:"10px 11px 12px"}}>
                      <div className="skeleton" style={{height:11,width:"55%",marginBottom:7}}/>
                      <div className="skeleton" style={{height:16,marginBottom:9}}/>
                      <div className="skeleton" style={{height:32}}/>
                    </div>
                  </div>
                ))
              : products.length===0
              ? <div style={{gridColumn:"1/-1",textAlign:"center",padding:"44px 18px",color:"var(--muted)"}}>
                  <div style={{fontSize:"2.6rem",marginBottom:10}}>🔍</div>
                  <p>No se encontraron productos</p>
                </div>
              : products.map(p=>(
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
                      <div className="card-stars">
                        {"★".repeat(Math.round(p.rating||0))}{"☆".repeat(5-Math.round(p.rating||0))}
                        <span className="card-reviews">({p.reviewCount})</span>
                      </div>
                      <div className="card-name">{p.name}</div>
                      <div className="card-footer">
                        <div>
                          <span className="card-price">${Number(p.price).toFixed(2)}</span>
                          {p.originalPrice&&<span className="card-original">${Number(p.originalPrice).toFixed(2)}</span>}
                        </div>
                        <button className="card-add" onClick={()=>addToCart(p)}>+ Carrito</button>
                      </div>
                    </div>
                  </div>
                ))
            }
          </div>
        </div>
      </div>

      {/* TESTIMONIOS */}
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

      {/* FEATURES */}
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

      {/* FOOTER */}
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
            <div style={{display:"flex",gap:7,fontSize:"1.15rem",justifyContent:"center"}}>💳 🏧 📱</div>
          </div>
        </div>
      </footer>

      {/* MODAL PRODUCTO */}
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

      {/* CARRITO */}
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
                ? <div className="cart-empty"><div style={{fontSize:"2.8rem",marginBottom:11}}>🛍️</div><p style={{fontWeight:600,color:"var(--dark)"}}>Tu carrito está vacío</p></div>
                : cart.map(item=>(
                    <div key={item.id} className="cart-item">
                      <img className="cart-item-img" src={item.imageUrl||"https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=200"} alt={item.name}/>
                      <div className="cart-item-info">
                        <div className="cart-item-name">{item.name}</div>
                        <div className="cart-item-price">${(Number(item.price)*item.qty).toFixed(2)}</div>
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
                <div className="cart-row"><span>Subtotal</span><span>${cartTotal.toFixed(2)}</span></div>
                <div className="cart-row" style={{color:shipping===0?"#52B788":undefined}}>
                  <span>Envío</span><span>{shipping===0?"GRATIS 🎉":`$${shipping.toFixed(2)}`}</span>
                </div>
                <div className="cart-total-row">
                  <span>Total</span>
                  <span style={{color:"var(--lila)",fontFamily:"'Playfair Display',serif"}}>${grandTotal.toFixed(2)}</span>
                </div>
                <button className="checkout-btn" onClick={()=>{setCartOpen(false);setCheckoutOpen(true);}}>Finalizar Compra →</button>
              </div>
            )}
          </div>
        </>
      )}

      {/* CHECKOUT */}
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
                      <span>{i.name} ×{i.qty}</span><span>${(Number(i.price)*i.qty).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="summary-item" style={{color:shipping===0?"#52B788":undefined}}>
                    <span>Envío</span><span>{shipping===0?"GRATIS":`$${shipping.toFixed(2)}`}</span>
                  </div>
                  <div className="summary-total">
                    <span>Total</span><span style={{color:"var(--lila)"}}>${grandTotal.toFixed(2)}</span>
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
                    <div style={{color:'#fff',fontWeight:700,fontSize:'.95rem'}}>Pagar con MercadoPago</div>
                    <div style={{color:'rgba(255,255,255,.75)',fontSize:'.77rem',marginTop:3}}>
                      Tarjetas, PSE, Nequi, Efecty, Bancolombia y más
                    </div>
                  </div>
                  <div style={{marginLeft:'auto',background:'rgba(255,255,255,.18)',borderRadius:10,padding:'4px 12px',color:'#fff',fontSize:'.7rem',fontWeight:700}}>
                    ✓ Seguro
                  </div>
                </div>
                <div className="secure-note">
                  🔒 Serás redirigido a MercadoPago para completar tu pago de forma segura
                </div>
                <button type="submit" className="pay-btn" disabled={paying}
                  style={{background:'linear-gradient(135deg,#009EE3,#0070B8)'}}>
                  {paying?"⏳ Redirigiendo...":`Ir a pagar $${grandTotal.toFixed(2)} COP →`}
                </button>
              </form>
            </div>
          </div>
        </>
      )}

      {/* SUCCESS */}
      {orderSuccess&&(
        <>
          <div className="overlay"/>
          <div className="modal-wrap">
            <div className="modal">
              <div className="success-modal">
                <div style={{fontSize:"3.2rem",marginBottom:12}}>🎉</div>
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
      {/* WHATSAPP FLOTANTE */}
      <a className="wa-float" href="https://wa.me/573000000000?text=Hola%20Kosmica%2C%20quiero%20información" target="_blank" rel="noreferrer" aria-label="WhatsApp">
        💬
      </a>
    </>
  );
}
