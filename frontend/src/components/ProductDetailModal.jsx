// ============================================================
//  ProductDetailModal.jsx — Con Lightbox de foto ✅
//  ✅ v2: + Sistema de Reseñas completo (tabs Info | Reseñas)
// ============================================================
import { useState, useEffect, useRef, useCallback } from 'react';
import { reviewAPI } from '../services/api';

const CSS = `
  @keyframes pdmIn  { from{opacity:0}                              to{opacity:1} }
  @keyframes pdmUp  { from{transform:translateY(100%);opacity:0}   to{transform:translateY(0);opacity:1} }
  @keyframes addPop { 0%{transform:scale(1)} 50%{transform:scale(1.06)} 100%{transform:scale(1)} }
  @keyframes cartIn { from{transform:translateX(100%);opacity:0}   to{transform:translateX(0);opacity:1} }
  @keyframes lbIn   { from{opacity:0;transform:scale(.88)}         to{opacity:1;transform:scale(1)} }

  /* ── OVERLAY MODAL ── */
  .pdm-ov{
    position:fixed;inset:0;
    background:rgba(30,10,60,.6);
    z-index:1100;
    backdrop-filter:blur(6px);
    animation:pdmIn .2s ease;
  }

  .pdm-wrap{
    position:fixed;inset:0;z-index:1101;
    display:flex;align-items:flex-end;justify-content:center;
    pointer-events:none;
  }

  .pdm-box{
    pointer-events:all;
    background:#fff;
    border-radius:22px 22px 0 0;
    width:100%;max-width:480px;
    height:92vh;
    display:flex;flex-direction:column;
    overflow:hidden;
    box-shadow:0 -8px 60px rgba(90,40,160,.3);
    animation:pdmUp .3s cubic-bezier(.22,.68,0,1.08);
  }

  /* ── HEADER ── */
  .pdm-hdr{
    flex-shrink:0;
    padding:12px 14px 10px;
    border-bottom:1px solid #F0E8FF;
    display:flex;align-items:center;gap:8px;
    background:#fff;
  }
  .pdm-back{
    display:flex;align-items:center;gap:4px;
    background:none;border:none;color:#9B72CF;
    font-size:.82rem;font-weight:700;cursor:pointer;
    padding:6px 10px;border-radius:30px;white-space:nowrap;
    transition:background .2s;
  }
  .pdm-back:hover{background:#F0E8FF}
  .pdm-cart-toggle{
    margin-left:auto;
    display:flex;align-items:center;gap:5px;
    padding:7px 12px;
    background:linear-gradient(135deg,#9B72CF,#7B5EA7);
    color:#fff;border:none;border-radius:30px;
    font-size:.76rem;font-weight:700;cursor:pointer;
    box-shadow:0 3px 12px rgba(155,114,207,.35);
    white-space:nowrap;
  }
  .pdm-cart-badge2{
    background:#F4A7C3;color:#fff;border-radius:50%;
    width:17px;height:17px;font-size:.58rem;font-weight:800;
    display:flex;align-items:center;justify-content:center;
  }
  .pdm-close{
    background:rgba(180,150,220,.12);border:none;border-radius:50%;
    width:34px;height:34px;flex-shrink:0;
    display:flex;align-items:center;justify-content:center;
    cursor:pointer;font-size:.95rem;color:#7B5EA7;transition:all .2s;
  }
  .pdm-close:hover{background:rgba(180,150,220,.28)}

  /* ── SCROLL ── */
  .pdm-scroll{
    flex:1;overflow-y:auto;overflow-x:hidden;
    -webkit-overflow-scrolling:touch;
    overscroll-behavior:contain;
  }
  .pdm-scroll::-webkit-scrollbar{width:3px}
  .pdm-scroll::-webkit-scrollbar-thumb{background:#C9B8E8;border-radius:2px}

  /* ══════════════════════════════════════
     SECCIÓN IMAGEN — cuadrado con swipe
  ══════════════════════════════════════ */
  .pdm-img-section{ width:100%; background:#F8F5FF; position:relative; }

  .pdm-img-box{
    width:100%;
    aspect-ratio:1 / 1;
    position:relative;
    overflow:hidden;
    background:#F8F5FF;
    display:flex;align-items:center;justify-content:center;
    cursor:zoom-in;
    user-select:none;
    -webkit-user-select:none;
    touch-action:none;
  }

  .pdm-img{
    width:100%;height:100%;
    object-fit:contain;
    display:block;
    padding:12px;
    box-sizing:border-box;
    pointer-events:none;
  }

  .pdm-vid{ width:100%;height:100%;object-fit:contain;display:block; }

  /* Flechas sobre imagen */
  .pdm-nav{
    position:absolute;top:50%;transform:translateY(-50%);
    background:rgba(255,255,255,.92);border:none;border-radius:50%;
    width:36px;height:36px;
    display:flex;align-items:center;justify-content:center;
    cursor:pointer;font-size:1.1rem;
    box-shadow:0 2px 12px rgba(120,80,180,.2);
    transition:all .2s;color:#7B5EA7;z-index:2;
  }
  .pdm-nav:hover{transform:translateY(-50%) scale(1.1)}
  .pdm-prev{left:8px} .pdm-next{right:8px}

  .pdm-badge-img{
    position:absolute;top:10px;left:10px;
    padding:4px 11px;border-radius:30px;
    font-size:.62rem;font-weight:800;letter-spacing:.08em;
    color:#fff;text-transform:uppercase;z-index:2;
  }

  /* Hint "toca para ampliar" */
  .pdm-zoom-hint{
    position:absolute;bottom:8px;left:50%;transform:translateX(-50%);
    background:rgba(30,10,60,.65);color:#fff;
    font-size:.62rem;padding:3px 12px;border-radius:20px;
    pointer-events:none;
    white-space:nowrap;z-index:2;
    opacity:.85;
  }

  /* Puntos indicadores */
  .pdm-dots{
    position:absolute;bottom:8px;left:50%;transform:translateX(-50%);
    display:flex;gap:5px;z-index:3;pointer-events:none;
  }
  .pdm-dot{
    height:6px;border-radius:3px;
    background:rgba(255,255,255,.7);
    transition:all .25s;
  }
  .pdm-dot.on{ background:#9B72CF; }

  /* ══════════════════════════════════════
     LIGHTBOX — foto sale hacia adelante
  ══════════════════════════════════════ */
  .pdm-lb-ov{
    position:fixed;inset:0;
    background:rgba(0,0,0,.92);
    z-index:2000;
    display:flex;align-items:center;justify-content:center;
    animation:pdmIn .18s ease;
  }

  .pdm-lb-img{
    max-width:96vw;
    max-height:90vh;
    object-fit:contain;
    border-radius:10px;
    animation:lbIn .22s ease;
    display:block;
    user-select:none;
    -webkit-user-select:none;
    touch-action:none;
  }

  /* Botón cerrar lightbox */
  .pdm-lb-close{
    position:fixed;top:16px;right:16px;
    width:44px;height:44px;border-radius:50%;
    background:rgba(255,255,255,.15);
    border:2px solid rgba(255,255,255,.3);
    color:#fff;font-size:1.3rem;
    display:flex;align-items:center;justify-content:center;
    cursor:pointer;transition:all .2s;z-index:2001;
  }
  .pdm-lb-close:hover{background:rgba(255,255,255,.28);transform:scale(1.1)}

  /* Flechas lightbox */
  .pdm-lb-prev, .pdm-lb-next{
    position:fixed;top:50%;transform:translateY(-50%);
    width:48px;height:48px;border-radius:50%;
    background:rgba(255,255,255,.15);
    border:2px solid rgba(255,255,255,.3);
    color:#fff;font-size:1.5rem;
    display:flex;align-items:center;justify-content:center;
    cursor:pointer;transition:all .2s;z-index:2001;
  }
  .pdm-lb-prev:hover,.pdm-lb-next:hover{background:rgba(255,255,255,.28)}
  .pdm-lb-prev{left:12px} .pdm-lb-next{right:12px}

  /* Contador lightbox */
  .pdm-lb-counter{
    position:fixed;bottom:20px;left:50%;transform:translateX(-50%);
    background:rgba(0,0,0,.5);color:#fff;
    padding:5px 16px;border-radius:20px;
    font-size:.82rem;font-weight:600;z-index:2001;
  }

  /* ── MINIATURAS ── */
  .pdm-thumbs{
    display:flex;gap:7px;
    padding:10px 14px;
    overflow-x:auto;overflow-y:hidden;
    scrollbar-width:none;
    -webkit-overflow-scrolling:touch;
    background:#fff;
    border-bottom:1px solid #F0E8FF;
  }
  .pdm-thumbs::-webkit-scrollbar{display:none}
  .pdm-thumb{
    width:60px;height:60px;flex-shrink:0;
    border-radius:10px;object-fit:cover;cursor:pointer;
    border:2.5px solid transparent;transition:all .2s;
  }
  .pdm-thumb.active{border-color:#9B72CF;box-shadow:0 0 0 2px rgba(155,114,207,.25)}
  .pdm-thumb:hover:not(.active){border-color:#C9B8E8}
  .pdm-vthumb{
    width:60px;height:60px;flex-shrink:0;
    border-radius:10px;cursor:pointer;
    border:2.5px solid transparent;
    background:#2D1B4E;
    display:flex;align-items:center;justify-content:center;
    font-size:1.4rem;transition:all .2s;
  }
  .pdm-vthumb.active{border-color:#9B72CF}

  /* ── INFO ── */
  .pdm-info{
    padding:16px 16px 8px;
    display:flex;flex-direction:column;gap:11px;
  }
  .pdm-cat{font-size:.63rem;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#9B72CF}
  .pdm-name{font-family:'Playfair Display',serif;font-size:1.35rem;font-weight:700;color:#2D1B4E;line-height:1.25}
  .pdm-stars{display:flex;align-items:center;gap:6px;font-size:.8rem;color:#B8A0D8;cursor:pointer}
  .pdm-stars:hover{color:#7B5EA7}
  .pdm-stars-gold{color:#C9A96E;font-size:.95rem}
  .pdm-div{height:1px;background:linear-gradient(90deg,#E8D5FF,transparent)}
  .pdm-price-row{display:flex;align-items:baseline;gap:9px;flex-wrap:wrap}
  .pdm-price{font-family:'Playfair Display',serif;font-size:2rem;font-weight:700;color:#7B5EA7}
  .pdm-orig{font-size:.9rem;color:#bbb;text-decoration:line-through}
  .pdm-disc{background:linear-gradient(135deg,#E8D5FF,#F5EEFF);color:#7B5EA7;font-weight:700;font-size:.76rem;padding:3px 9px;border-radius:30px}
  .pdm-desc{font-size:.85rem;color:#6B5B8A;line-height:1.75;white-space:pre-line}
  .pdm-stock-in{font-size:.8rem;font-weight:700;color:#52B788}
  .pdm-stock-out{font-size:.8rem;font-weight:700;color:#E74C3C}
  .pdm-qty-row{display:flex;align-items:center;gap:10px}
  .pdm-qty-lbl{font-size:.8rem;font-weight:600;color:#6B5B8A}
  .pdm-qty{display:flex;align-items:center;gap:2px;background:#F5EEFF;border-radius:30px;padding:3px}
  .pdm-qbtn{background:none;border:none;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:1.1rem;color:#7B5EA7;font-weight:700;display:flex;align-items:center;justify-content:center;transition:background .2s}
  .pdm-qbtn:hover{background:rgba(155,114,207,.2)}
  .pdm-qval{min-width:30px;text-align:center;font-weight:700;font-size:.92rem;color:#2D1B4E}
  .pdm-add{
    padding:15px 0;
    background:linear-gradient(135deg,#9B72CF,#7B5EA7);
    color:#fff;border:none;border-radius:14px;
    font-weight:700;font-size:1rem;cursor:pointer;
    box-shadow:0 7px 22px rgba(155,114,207,.38);
    transition:all .3s;
  }
  .pdm-add:hover{transform:translateY(-2px)}
  .pdm-add.popped{animation:addPop .3s ease}
  .pdm-wish{
    padding:13px 0;background:rgba(155,114,207,.07);color:#7B5EA7;
    border:2px solid rgba(155,114,207,.28);border-radius:14px;
    font-weight:700;font-size:.88rem;cursor:pointer;transition:all .3s;
  }
  .pdm-wish:hover{background:rgba(155,114,207,.15);border-color:#9B72CF}
  .pdm-share-wa{
    padding:13px 0;background:rgba(37,211,102,.08);color:#1a8f42;
    border:2px solid rgba(37,211,102,.35);border-radius:14px;
    font-weight:700;font-size:.88rem;cursor:pointer;transition:all .3s;
    display:flex;align-items:center;justify-content:center;gap:6px;
  }
  .pdm-share-wa:hover{background:rgba(37,211,102,.16);border-color:#25d366}
  .pdm-tags{display:flex;flex-wrap:wrap;gap:5px}
  .pdm-tag{background:#F5EEFF;color:#9B72CF;font-size:.7rem;font-weight:600;padding:4px 11px;border-radius:30px}

  /* ── TABS RESEÑAS ── */
  .pdm-tabs{
    display:flex;border-bottom:2px solid #F0E8FF;
    margin:0;flex-shrink:0;
  }
  .pdm-tab{
    flex:1;padding:11px 8px;
    background:none;border:none;
    font-size:.85rem;font-weight:700;
    color:#B8A0D8;cursor:pointer;transition:all .2s;
    border-bottom:3px solid transparent;margin-bottom:-2px;
  }
  .pdm-tab.active{color:#7B5EA7;border-bottom-color:#9B72CF;}
  .pdm-tab:hover:not(.active){color:#9B72CF;}

  /* ── SECCIÓN RESEÑAS ── */
  .pdm-reviews{
    padding:16px 16px 32px;
    display:flex;flex-direction:column;gap:16px;
  }

  /* Resumen general de ratings */
  .rv-summary{
    background:#F8F5FF;border-radius:16px;
    padding:16px;
    display:flex;gap:16px;align-items:center;
  }
  .rv-big-score{
    font-family:'Playfair Display',serif;
    font-size:3rem;font-weight:700;color:#7B5EA7;
    line-height:1;min-width:56px;text-align:center;
  }
  .rv-big-stars{font-size:1.1rem;color:#C9A96E;letter-spacing:2px;margin-top:2px;text-align:center}
  .rv-total{font-size:.72rem;color:#9B72CF;font-weight:600;text-align:center}
  .rv-bars{flex:1;display:flex;flex-direction:column;gap:5px}
  .rv-bar-row{display:flex;align-items:center;gap:6px;font-size:.72rem;color:#6B5B8A}
  .rv-bar-track{flex:1;height:6px;background:#E8D5FF;border-radius:3px;overflow:hidden}
  .rv-bar-fill{height:100%;background:linear-gradient(90deg,#C9A96E,#E8C97A);border-radius:3px;transition:width .6s ease}
  .rv-bar-count{min-width:16px;text-align:right;color:#B8A0D8}

  /* Botón escribir reseña */
  .rv-write-btn{
    padding:13px;border:2px dashed #C9B8E8;
    background:#FAFAFF;border-radius:14px;
    color:#9B72CF;font-weight:700;font-size:.9rem;
    cursor:pointer;transition:all .2s;text-align:center;
  }
  .rv-write-btn:hover{background:#F0E8FF;border-color:#9B72CF}

  /* Formulario de reseña */
  .rv-form{
    background:#F8F5FF;border-radius:16px;
    padding:16px;display:flex;flex-direction:column;gap:11px;
    border:2px solid #E8D5FF;
  }
  .rv-form-title{font-size:.9rem;font-weight:700;color:#2D1B4E}
  .rv-star-pick{display:flex;gap:6px;font-size:1.8rem;cursor:pointer}
  .rv-star-pick span{
    transition:transform .15s;filter:grayscale(1);opacity:.4;
    cursor:pointer;user-select:none;
  }
  .rv-star-pick span.on{filter:none;opacity:1;transform:scale(1.15)}
  .rv-input{
    border:1.5px solid #E8D5FF;border-radius:10px;
    padding:10px 12px;font-size:.86rem;font-family:inherit;
    color:#2D1B4E;background:#fff;outline:none;transition:border .2s;
    width:100%;box-sizing:border-box;
  }
  .rv-input:focus{border-color:#9B72CF}
  .rv-textarea{
    border:1.5px solid #E8D5FF;border-radius:10px;
    padding:10px 12px;font-size:.86rem;font-family:inherit;
    color:#2D1B4E;background:#fff;outline:none;resize:vertical;
    min-height:90px;transition:border .2s;
    width:100%;box-sizing:border-box;
  }
  .rv-textarea:focus{border-color:#9B72CF}
  .rv-submit{
    padding:12px;
    background:linear-gradient(135deg,#9B72CF,#7B5EA7);
    color:#fff;border:none;border-radius:10px;
    font-weight:700;font-size:.88rem;cursor:pointer;
    transition:all .2s;
  }
  .rv-submit:hover{transform:translateY(-1px)}
  .rv-submit:disabled{opacity:.6;cursor:not-allowed;transform:none}
  .rv-cancel{
    padding:10px;background:none;
    border:1.5px solid #E8D5FF;border-radius:10px;
    color:#9B72CF;font-weight:600;font-size:.83rem;cursor:pointer;
  }
  .rv-msg-ok{color:#52B788;font-size:.83rem;font-weight:600;text-align:center;padding:4px 0}
  .rv-msg-err{color:#E74C3C;font-size:.83rem;font-weight:600;text-align:center;padding:4px 0}

  /* Lista de reseñas */
  .rv-list{display:flex;flex-direction:column;gap:14px}
  .rv-item{
    border-radius:14px;padding:14px;
    background:#FAFAFF;border:1px solid #F0E8FF;
  }
  .rv-item-head{display:flex;align-items:center;gap:10px;margin-bottom:8px}
  .rv-avatar{
    width:36px;height:36px;border-radius:50%;
    background:linear-gradient(135deg,#9B72CF,#C9B8E8);
    color:#fff;font-weight:700;font-size:.95rem;
    display:flex;align-items:center;justify-content:center;
    flex-shrink:0;
  }
  .rv-meta{flex:1}
  .rv-author{font-weight:700;font-size:.84rem;color:#2D1B4E}
  .rv-date{font-size:.72rem;color:#B8A0D8;margin-top:1px}
  .rv-stars-sm{color:#C9A96E;font-size:.8rem;letter-spacing:1px}
  .rv-verified{
    font-size:.65rem;font-weight:700;
    background:#E6F9F0;color:#52B788;
    padding:2px 8px;border-radius:20px;
  }
  .rv-comment{font-size:.84rem;color:#5A4876;line-height:1.65}
  .rv-photo{
    margin-top:8px;border-radius:10px;
    max-width:100%;max-height:180px;object-fit:cover;cursor:pointer;
  }
  .rv-empty{
    text-align:center;padding:28px 16px;color:#C9B8E8;
    font-size:.88rem;
  }
  .rv-load-more{
    padding:11px;border:1.5px solid #E8D5FF;border-radius:10px;
    background:#fff;color:#9B72CF;font-weight:700;
    font-size:.82rem;cursor:pointer;transition:all .2s;text-align:center;
  }
  .rv-load-more:hover{background:#F0E8FF}
  .rv-loading{text-align:center;padding:20px;color:#C9B8E8;font-size:.84rem}

  /* ── MINI CARRITO ── */
  .pdm-cart-panel{
    position:fixed;inset:0;z-index:1200;
    display:flex;flex-direction:column;
    background:#fff;animation:cartIn .28s ease;
  }
  .pdm-cp-hdr{padding:16px 16px 12px;border-bottom:1px solid #F0E8FF;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;}
  .pdm-cp-title{font-family:'Playfair Display',serif;font-size:1.1rem;font-weight:700;color:#2D1B4E}
  .pdm-cp-close{background:none;border:none;color:#B8A0D8;font-size:1.1rem;cursor:pointer;padding:4px}
  .pdm-cp-items{flex:1;overflow-y:auto;padding:12px 14px;display:flex;flex-direction:column;gap:10px}
  .pdm-cp-empty{text-align:center;padding:40px 20px;color:#C9B8E8}
  .pdm-cp-item{display:flex;gap:10px;background:#FAF7FF;border-radius:14px;padding:10px;border:1px solid #F0E8FF}
  .pdm-cp-img{width:58px;height:58px;border-radius:10px;object-fit:cover;flex-shrink:0}
  .pdm-cp-inf{flex:1;min-width:0}
  .pdm-cp-nm{font-size:.78rem;font-weight:600;color:#2D1B4E;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:3px}
  .pdm-cp-pr{font-size:.88rem;font-weight:700;color:#7B5EA7;margin-bottom:6px}
  .pdm-cp-qty{display:flex;align-items:center;gap:6px}
  .pdm-cp-qb{width:26px;height:26px;border-radius:7px;border:1.5px solid #E8D5FF;background:#fff;font-size:.8rem;font-weight:700;color:#7B5EA7;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s}
  .pdm-cp-qb:hover{border-color:#9B72CF;background:#F0E8FF}
  .pdm-cp-qv{font-size:.84rem;font-weight:700;color:#2D1B4E;min-width:18px;text-align:center}
  .pdm-cp-rm{margin-left:auto;background:none;border:none;color:#F4A7C3;font-size:1rem;cursor:pointer;padding:2px}
  .pdm-cp-footer{padding:12px 14px 24px;border-top:1px solid #F0E8FF;flex-shrink:0}
  .pdm-cp-row{display:flex;justify-content:space-between;font-size:.8rem;color:#6B5B8A;margin-bottom:4px}
  .pdm-cp-total{display:flex;justify-content:space-between;font-weight:700;font-size:.95rem;margin:8px 0 12px;color:#2D1B4E}
  .pdm-cp-checkout{width:100%;padding:13px;background:linear-gradient(135deg,#9B72CF,#7B5EA7);color:#fff;border:none;border-radius:12px;font-weight:700;font-size:.88rem;cursor:pointer;box-shadow:0 5px 16px rgba(155,114,207,.38);transition:all .3s}
  .pdm-cp-continue{width:100%;padding:10px;margin-top:7px;background:transparent;color:#9B72CF;border:2px solid rgba(155,114,207,.28);border-radius:12px;font-weight:600;font-size:.82rem;cursor:pointer;transition:all .2s}
  .pdm-cp-continue:hover{background:#F0E8FF}

  @media(min-width:640px){
    .pdm-wrap{align-items:center;padding:20px}
    .pdm-box{border-radius:24px;height:auto;max-height:92vh;max-width:900px;}
    .pdm-lb-prev{left:24px} .pdm-lb-next{right:24px}
  }
`;

const BADGE_BG = {
  VIRAL:'linear-gradient(135deg,#E8A0CF,#C9B8E8)',
  HOT:'linear-gradient(135deg,#FFB3BA,#FFC9A0)',
  BESTSELLER:'linear-gradient(135deg,#C9B8E8,#9B72CF)',
  NUEVO:'linear-gradient(135deg,#B3E8D0,#80CBA8)',
};

// ── Helper: estrellas ─────────────────────────────────────
const Stars = ({ rating, size = '.9rem' }) => (
  <span style={{ color: '#C9A96E', fontSize: size, letterSpacing: 1 }}>
    {'★'.repeat(Math.round(rating || 0))}
    {'☆'.repeat(5 - Math.round(rating || 0))}
  </span>
);

// ── Helper: fecha relativa ────────────────────────────────
const relativeDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Ayer';
  if (diff < 30) return `Hace ${diff} días`;
  if (diff < 365) return `Hace ${Math.floor(diff / 30)} meses`;
  return `Hace ${Math.floor(diff / 365)} años`;
};

export default function ProductDetailModal({
  product, onClose, cart, onAddToCart, onUpdateQty, onRemoveFromCart,
  wishlist, onToggleWishlist, onCheckout
}) {
  // ── Estado original ────────────────────────────────────────
  const [media,     setMedia]     = useState(0);
  const [qty,       setQty]       = useState(1);
  const [added,     setAdded]     = useState(false);
  const [cartOpen,  setCartOpen]  = useState(false);
  const [lightbox,  setLightbox]  = useState(false);
  const vidRef      = useRef(null);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);

  // ── Estado NUEVO: tabs y reseñas ───────────────────────────
  const [activeTab,    setActiveTab]    = useState('info');  // 'info' | 'reviews'
  const [reviews,      setReviews]      = useState([]);
  const [reviewStats,  setReviewStats]  = useState(null);
  const [reviewsPage,  setReviewsPage]  = useState(0);
  const [reviewsTotal, setReviewsTotal] = useState(0);
  const [rvLoading,    setRvLoading]    = useState(false);
  const [showForm,     setShowForm]     = useState(false);
  const [rvMsg,        setRvMsg]        = useState({ type: '', text: '' });
  const [submitting,   setSubmitting]   = useState(false);
  const [hoverStar,    setHoverStar]    = useState(0);

  // Formulario reseña
  const [rvForm, setRvForm] = useState({
    userName: '', userEmail: '', rating: 0, comment: ''
  });

  const fmtCOP = n => {
    const num = Number(n);
    if (isNaN(num)) return '$0';
    return '$' + num.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const gallery   = (() => { try { return JSON.parse(product.gallery || '[]'); } catch { return []; } })();
  const mainImg   = product.imageUrl || 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&q=90';
  const allImgs   = [mainImg, ...gallery.filter(u => u && u !== mainImg)];
  const mediaList = [
    ...allImgs.map(url => ({ type: 'image', url })),
    ...(product.videoUrl ? [{ type: 'video', url: product.videoUrl }] : []),
  ];
  const cur = mediaList[media] || mediaList[0];
  const imageCount = mediaList.filter(m => m.type === 'image').length;

  // ── Cargar reseñas ─────────────────────────────────────────
  const loadReviews = useCallback(async (page = 0, append = false) => {
    if (!product?.id) return;
    setRvLoading(true);
    try {
      const [pageData, stats] = await Promise.all([
        reviewAPI.getByProduct(product.id, page, 10),
        page === 0 ? reviewAPI.getStats(product.id) : Promise.resolve(null),
      ]);
      const items = pageData.content || pageData || [];
      setReviews(prev => append ? [...prev, ...items] : items);
      setReviewsTotal(pageData.totalElements || items.length);
      if (stats) setReviewStats(stats);
      setReviewsPage(page);
    } catch {
      // Silencioso — la sección queda vacía si hay error de red
    } finally {
      setRvLoading(false);
    }
  }, [product?.id]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    if (typeof window.fbq === 'function') {
      window.fbq('track', 'ViewContent', {
        content_name: product?.name,
        content_ids: [String(product?.id)],
        content_type: 'product',
        value: Number(product?.price) || 0,
        currency: 'COP',
      });
    }
    // Precargar reseñas al abrir el modal
    loadReviews(0);
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Cargar reseñas cuando el usuario cambia al tab
  useEffect(() => {
    if (activeTab === 'reviews' && reviews.length === 0) {
      loadReviews(0);
    }
  }, [activeTab]);

  useEffect(() => {
    const h = e => {
      if (e.key === 'Escape') {
        if (lightbox) { setLightbox(false); return; }
        if (cartOpen)  { setCartOpen(false); return; }
        onClose();
      }
      if (lightbox) {
        if (e.key === 'ArrowRight') goNext();
        if (e.key === 'ArrowLeft')  goPrev();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose, cartOpen, lightbox, media, mediaList.length]);

  const discount  = product.originalPrice ? Math.round((1 - product.price / product.originalPrice) * 100) : 0;
  const cartTotal = (cart || []).reduce((s, i) => s + Number(i.price) * i.qty, 0);
  const cartCount = (cart || []).reduce((s, i) => s + i.qty, 0);
  const shipping  = cartTotal >= 80 ? 0 : cartTotal * 0.08;

  const goPrev = () => { if (media > 0) setMedia(i => i - 1); };
  const goNext = () => { if (media < mediaList.length - 1) setMedia(i => i + 1); };

  const handleTouchStart = e => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = e => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    const moved = Math.abs(dx) > 6 || Math.abs(dy) > 6;
    if (!moved && cur?.type === 'image') {
      setLightbox(true);
    } else if (Math.abs(dx) > 40 && Math.abs(dy) < 70) {
      if (dx < 0) goNext(); else goPrev();
    }
    touchStartX.current = null;
  };

  const lbTouchStart = useRef(null);
  const handleLbTouchStart = e => { lbTouchStart.current = e.touches[0].clientX; };
  const handleLbTouchEnd = e => {
    if (lbTouchStart.current === null) return;
    const dx = e.changedTouches[0].clientX - lbTouchStart.current;
    if (Math.abs(dx) > 40) { if (dx < 0) goNext(); else goPrev(); }
    lbTouchStart.current = null;
  };

  const handleAdd = () => {
    onAddToCart(product, qty);
    setAdded(true);
    setCartOpen(true);
    setTimeout(() => setAdded(false), 1800);
  };

  // ── Enviar reseña ──────────────────────────────────────────
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (rvForm.rating === 0) {
      setRvMsg({ type: 'err', text: 'Selecciona una calificación con estrellas ⭐' });
      return;
    }
    if (!rvForm.userName.trim()) {
      setRvMsg({ type: 'err', text: 'Escribe tu nombre' });
      return;
    }
    if (!rvForm.comment.trim() || rvForm.comment.trim().length < 10) {
      setRvMsg({ type: 'err', text: 'Escribe un comentario de al menos 10 caracteres' });
      return;
    }
    setSubmitting(true);
    setRvMsg({ type: '', text: '' });
    try {
      await reviewAPI.create(product.id, {
        userName:  rvForm.userName.trim(),
        userEmail: rvForm.userEmail.trim() || null,
        rating:    rvForm.rating,
        comment:   rvForm.comment.trim(),
      });
      setRvMsg({ type: 'ok', text: '¡Gracias por tu reseña! 💜 Ya está publicada.' });
      setRvForm({ userName: '', userEmail: '', rating: 0, comment: '' });
      setHoverStar(0);
      setShowForm(false);
      // Recargar reseñas con los nuevos datos
      setTimeout(() => loadReviews(0), 500);
    } catch (err) {
      setRvMsg({ type: 'err', text: err.message || 'No se pudo enviar la reseña. Intenta de nuevo.' });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Distribución de estrellas ─────────────────────────────
  const totalReviews = reviewStats?.total || 0;
  const avgRating    = reviewStats?.average || product.rating || 0;
  const dist         = reviewStats?.distribution || {};

  return (
    <>
      <style>{CSS}</style>

      {/* LIGHTBOX */}
      {lightbox && cur?.type === 'image' && (
        <div className="pdm-lb-ov" onClick={() => setLightbox(false)}>
          <button className="pdm-lb-close" onClick={() => setLightbox(false)}>✕</button>
          {media > 0 && (
            <button className="pdm-lb-prev" onClick={e => { e.stopPropagation(); goPrev(); }}>‹</button>
          )}
          <img
            className="pdm-lb-img"
            src={cur.url}
            alt={product.name}
            onClick={e => e.stopPropagation()}
            onTouchStart={handleLbTouchStart}
            onTouchEnd={handleLbTouchEnd}
            draggable="false"
          />
          {media < mediaList.length - 1 && (
            <button className="pdm-lb-next" onClick={e => { e.stopPropagation(); goNext(); }}>›</button>
          )}
          {imageCount > 1 && (
            <div className="pdm-lb-counter">{media + 1} / {mediaList.length}</div>
          )}
        </div>
      )}

      {/* MODAL PRINCIPAL */}
      <div className="pdm-ov" onClick={() => { if (cartOpen) setCartOpen(false); else onClose(); }} />
      <div className="pdm-wrap">
        <div className="pdm-box" onClick={e => e.stopPropagation()}>

          {/* HEADER */}
          <div className="pdm-hdr">
            <button className="pdm-back" onClick={onClose}>← Volver</button>
            <button className="pdm-cart-toggle" onClick={() => setCartOpen(o => !o)}>
              🛍️ Mi carrito
              {cartCount > 0 && <span className="pdm-cart-badge2">{cartCount}</span>}
            </button>
            <button className="pdm-close" onClick={onClose}>✕</button>
          </div>

          {/* SCROLL */}
          <div className="pdm-scroll">

            {/* SECCIÓN IMAGEN */}
            <div className="pdm-img-section">
              {mediaList.length > 1 && (
                <div className="pdm-thumbs">
                  {mediaList.map((m, i) => m.type === 'video'
                    ? <div key={i} className={`pdm-vthumb${media===i?' active':''}`}
                        onClick={() => setMedia(i)}>▶️</div>
                    : <img key={i} src={m.url} alt=""
                        className={`pdm-thumb${media===i?' active':''}`}
                        onClick={() => setMedia(i)} />
                  )}
                </div>
              )}

              <div
                className="pdm-img-box"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onClick={() => cur?.type === 'image' && setLightbox(true)}
              >
                {cur?.type === 'video' ? (
                  <video ref={vidRef} className="pdm-vid" controls autoPlay>
                    <source src={cur.url} />
                  </video>
                ) : (
                  <img className="pdm-img" src={cur?.url} alt={product.name} draggable="false" />
                )}
                {product.badge && (
                  <span className="pdm-badge-img" style={{background: BADGE_BG[product.badge] || '#C9B8E8'}}>
                    {product.badge}
                  </span>
                )}
                {cur?.type === 'image' && (
                  <div className="pdm-zoom-hint">🔍 Toca para ampliar</div>
                )}
                {mediaList.length > 1 && <>
                  {media > 0 && (
                    <button className="pdm-nav pdm-prev"
                      onClick={e => { e.stopPropagation(); goPrev(); }}>‹</button>
                  )}
                  {media < mediaList.length - 1 && (
                    <button className="pdm-nav pdm-next"
                      onClick={e => { e.stopPropagation(); goNext(); }}>›</button>
                  )}
                </>}
                {mediaList.length > 1 && (
                  <div className="pdm-dots">
                    {mediaList.map((_, i) => (
                      <div key={i} className={`pdm-dot${media===i?' on':''}`}
                        style={{width: media===i ? 18 : 6}} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── TABS ── */}
            <div className="pdm-tabs">
              <button
                className={`pdm-tab${activeTab === 'info' ? ' active' : ''}`}
                onClick={() => setActiveTab('info')}
              >
                📦 Producto
              </button>
              <button
                className={`pdm-tab${activeTab === 'reviews' ? ' active' : ''}`}
                onClick={() => setActiveTab('reviews')}
              >
                ⭐ Reseñas
                {(product.reviewCount > 0 || totalReviews > 0) && (
                  <span style={{
                    marginLeft: 5, background: '#9B72CF', color: '#fff',
                    borderRadius: 20, fontSize: '.68rem', fontWeight: 800,
                    padding: '1px 7px'
                  }}>
                    {totalReviews || product.reviewCount}
                  </span>
                )}
              </button>
            </div>

            {/* ══════════════════════════════════
                TAB: INFORMACIÓN DEL PRODUCTO
            ══════════════════════════════════ */}
            {activeTab === 'info' && (
              <div className="pdm-info">
                <div className="pdm-cat">{product.category || 'BOLSOS'}</div>
                <h2 className="pdm-name">{product.name}</h2>

                <div
                  className="pdm-stars"
                  onClick={() => { setActiveTab('reviews'); }}
                  title="Ver reseñas"
                >
                  <span className="pdm-stars-gold">
                    {'★'.repeat(Math.round(product.rating||0))}{'☆'.repeat(5-Math.round(product.rating||0))}
                  </span>
                  {product.rating||0} · {product.reviewCount||0} reseñas
                  <span style={{fontSize:'.74rem',color:'#9B72CF',fontWeight:600}}>
                    · Ver →
                  </span>
                </div>

                <div className="pdm-div" />

                <div className="pdm-price-row">
                  <span className="pdm-price">{fmtCOP(product.price||0)}</span>
                  {product.originalPrice && <span className="pdm-orig">{fmtCOP(product.originalPrice)}</span>}
                  {discount > 0 && <span className="pdm-disc">-{discount}%</span>}
                </div>

                {product.description && <p className="pdm-desc">{product.description}</p>}

                <div className="pdm-div" />

                <div className={product.stock > 0 ? 'pdm-stock-in' : 'pdm-stock-out'}>
                  {product.stock > 0 ? `✔ En stock (${product.stock} disponibles)` : '✖ Sin stock'}
                </div>

                <div className="pdm-qty-row">
                  <span className="pdm-qty-lbl">Cantidad:</span>
                  <div className="pdm-qty">
                    <button className="pdm-qbtn" onClick={() => setQty(q => Math.max(1, q-1))}>−</button>
                    <span className="pdm-qval">{qty}</span>
                    <button className="pdm-qbtn" onClick={() => setQty(q => q+1)}>+</button>
                  </div>
                </div>

                <button className={`pdm-add${added?' popped':''}`} onClick={handleAdd}>
                  {added ? '✓ ¡Agregado!' : '🛒 Agregar al carrito'}
                </button>

                <button className="pdm-wish" onClick={() => onToggleWishlist(product.id)}>
                  {wishlist?.includes(product.id) ? '❤️ En favoritos' : '🤍 Guardar en favoritos'}
                </button>

                <button className="pdm-share-wa" onClick={() => {
                  const txt = encodeURIComponent(`¡Mira este producto en Kosmica! 💜\n*${product.name}*\n$${Number(product.price).toLocaleString('es-CO')}\nhttps://www.kosmica.com.co`);
                  window.open(`https://wa.me/?text=${txt}`, '_blank');
                }}>
                  📲 Compartir por WhatsApp
                </button>

                <div className="pdm-tags">
                  <span className="pdm-tag">✓ Envío express Colombia</span>
                  <span className="pdm-tag">✓ Garantía de calidad</span>
                  <span className="pdm-tag">✓ Pago seguro</span>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════
                TAB: RESEÑAS
            ══════════════════════════════════ */}
            {activeTab === 'reviews' && (
              <div className="pdm-reviews">

                {/* ── Resumen con barra de distribución ── */}
                {(totalReviews > 0 || (product.reviewCount || 0) > 0) && (
                  <div className="rv-summary">
                    <div>
                      <div className="rv-big-score">
                        {Number(avgRating).toFixed(1)}
                      </div>
                      <div className="rv-big-stars">
                        <Stars rating={avgRating} size="1rem" />
                      </div>
                      <div className="rv-total">
                        {totalReviews || product.reviewCount} reseña{(totalReviews || product.reviewCount) !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div className="rv-bars">
                      {[5, 4, 3, 2, 1].map(star => {
                        const count = Number(dist[star] || 0);
                        const pct   = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
                        return (
                          <div key={star} className="rv-bar-row">
                            <span>{star}★</span>
                            <div className="rv-bar-track">
                              <div className="rv-bar-fill" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="rv-bar-count">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── Mensaje de éxito/error del formulario ── */}
                {rvMsg.text && (
                  <div className={rvMsg.type === 'ok' ? 'rv-msg-ok' : 'rv-msg-err'}>
                    {rvMsg.type === 'ok' ? '✅ ' : '⚠️ '}{rvMsg.text}
                  </div>
                )}

                {/* ── Botón para abrir formulario ── */}
                {!showForm && (
                  <button className="rv-write-btn" onClick={() => {
                    setShowForm(true);
                    setRvMsg({ type: '', text: '' });
                  }}>
                    ✍️ Escribir una reseña
                  </button>
                )}

                {/* ── Formulario de reseña ── */}
                {showForm && (
                  <form className="rv-form" onSubmit={handleSubmitReview}>
                    <div className="rv-form-title">✍️ Tu reseña de {product.name}</div>

                    {/* Selector de estrellas interactivo */}
                    <div>
                      <div style={{ fontSize: '.75rem', color: '#9B72CF', fontWeight: 600, marginBottom: 6 }}>
                        Calificación *
                      </div>
                      <div className="rv-star-pick">
                        {[1, 2, 3, 4, 5].map(s => (
                          <span
                            key={s}
                            className={(hoverStar || rvForm.rating) >= s ? 'on' : ''}
                            onMouseEnter={() => setHoverStar(s)}
                            onMouseLeave={() => setHoverStar(0)}
                            onClick={() => setRvForm(f => ({ ...f, rating: s }))}
                          >
                            ⭐
                          </span>
                        ))}
                        {(hoverStar || rvForm.rating) > 0 && (
                          <span style={{ fontSize: '.78rem', color: '#C9A96E', fontWeight: 700, alignSelf: 'center' }}>
                            {['', 'Muy malo', 'Malo', 'Regular', 'Bueno', 'Excelente'][hoverStar || rvForm.rating]}
                          </span>
                        )}
                      </div>
                    </div>

                    <input
                      className="rv-input"
                      placeholder="Tu nombre *"
                      value={rvForm.userName}
                      onChange={e => setRvForm(f => ({ ...f, userName: e.target.value }))}
                      maxLength={80}
                      required
                    />
                    <input
                      className="rv-input"
                      placeholder="Tu email (opcional, no se publica)"
                      type="email"
                      value={rvForm.userEmail}
                      onChange={e => setRvForm(f => ({ ...f, userEmail: e.target.value }))}
                    />
                    <textarea
                      className="rv-textarea"
                      placeholder="¿Qué te pareció el producto? Cuéntanos tu experiencia (mínimo 10 caracteres)"
                      value={rvForm.comment}
                      onChange={e => setRvForm(f => ({ ...f, comment: e.target.value }))}
                      maxLength={1000}
                      required
                    />
                    <div style={{ fontSize: '.7rem', color: '#C9B8E8', textAlign: 'right' }}>
                      {rvForm.comment.length}/1000
                    </div>

                    <button className="rv-submit" type="submit" disabled={submitting}>
                      {submitting ? 'Enviando...' : '💜 Publicar reseña'}
                    </button>
                    <button type="button" className="rv-cancel"
                      onClick={() => { setShowForm(false); setRvMsg({ type: '', text: '' }); }}>
                      Cancelar
                    </button>
                  </form>
                )}

                {/* ── Lista de reseñas ── */}
                {rvLoading && reviews.length === 0 && (
                  <div className="rv-loading">Cargando reseñas...</div>
                )}

                {!rvLoading && reviews.length === 0 && (
                  <div className="rv-empty">
                    <div style={{ fontSize: '2.2rem', marginBottom: 8 }}>💬</div>
                    <div style={{ fontWeight: 700, color: '#9B72CF', marginBottom: 4 }}>
                      Sé la primera en opinar
                    </div>
                    <div>Comparte tu experiencia con este producto</div>
                  </div>
                )}

                {reviews.length > 0 && (
                  <div className="rv-list">
                    {reviews.map(rv => (
                      <div key={rv.id} className="rv-item">
                        <div className="rv-item-head">
                          <div className="rv-avatar">
                            {(rv.userName || '?')[0].toUpperCase()}
                          </div>
                          <div className="rv-meta">
                            <div className="rv-author">{rv.userName || 'Cliente verificado'}</div>
                            <div className="rv-date">{relativeDate(rv.createdAt)}</div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                            <Stars rating={rv.rating} size=".82rem" />
                            {rv.verified && (
                              <span className="rv-verified">✓ Compra verificada</span>
                            )}
                          </div>
                        </div>
                        <p className="rv-comment">{rv.comment}</p>
                        {rv.photoUrl && (
                          <img
                            className="rv-photo"
                            src={rv.photoUrl}
                            alt="Foto de la reseña"
                            onClick={() => window.open(rv.photoUrl, '_blank')}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Cargar más */}
                {reviews.length < reviewsTotal && (
                  <button
                    className="rv-load-more"
                    disabled={rvLoading}
                    onClick={() => loadReviews(reviewsPage + 1, true)}
                  >
                    {rvLoading ? 'Cargando...' : `Ver más reseñas (${reviewsTotal - reviews.length} restantes)`}
                  </button>
                )}

              </div>
            )}

          </div>{/* fin scroll */}
        </div>
      </div>

      {/* MINI CARRITO */}
      {cartOpen && (
        <div className="pdm-cart-panel" onClick={e => e.stopPropagation()}>
          <div className="pdm-cp-hdr">
            <div className="pdm-cp-title">🛍️ Tu carrito ({cartCount})</div>
            <button className="pdm-cp-close" onClick={() => setCartOpen(false)}>✕</button>
          </div>
          <div className="pdm-cp-items">
            {(cart||[]).length === 0 ? (
              <div className="pdm-cp-empty">
                <div style={{fontSize:'2.5rem',marginBottom:8}}>🛍️</div>
                <p style={{fontSize:'.84rem',color:'#B8A0D8'}}>Tu carrito está vacío</p>
              </div>
            ) : (cart||[]).map(item => (
              <div key={item.id} className="pdm-cp-item">
                <img className="pdm-cp-img"
                  src={item.imageUrl||'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=100'}
                  alt={item.name} />
                <div className="pdm-cp-inf">
                  <div className="pdm-cp-nm">{item.name}</div>
                  <div className="pdm-cp-pr">{fmtCOP(Number(item.price)*item.qty)}</div>
                  <div className="pdm-cp-qty">
                    <button className="pdm-cp-qb" onClick={() => onUpdateQty(item.id, -1)}>−</button>
                    <span className="pdm-cp-qv">{item.qty}</span>
                    <button className="pdm-cp-qb" onClick={() => onUpdateQty(item.id, 1)}>+</button>
                    <button className="pdm-cp-rm" onClick={() => onRemoveFromCart(item.id)}>🗑️</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {(cart||[]).length > 0 && (
            <div className="pdm-cp-footer">
              <div className="pdm-cp-row"><span>Subtotal</span><span>{fmtCOP(cartTotal)}</span></div>
              <div className="pdm-cp-row" style={{color:shipping===0?'#52B788':undefined}}>
                <span>Envío</span><span>{shipping===0?'Elige al finalizar la compra':fmtCOP(shipping)}</span>
              </div>
              <div className="pdm-cp-total">
                <span>Total</span>
                <span style={{color:'#7B5EA7',fontFamily:"'Playfair Display',serif"}}>
                  {fmtCOP(cartTotal+shipping)}
                </span>
              </div>
              <button className="pdm-cp-checkout" onClick={() => { onClose(); onCheckout(); }}>
                Finalizar Compra →
              </button>
              <button className="pdm-cp-continue" onClick={() => setCartOpen(false)}>
                ← Seguir comprando
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
