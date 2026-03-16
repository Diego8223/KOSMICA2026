// ============================================================
//  ProductDetailModal.jsx v3
//  Galería Amazon + Mini Carrito integrado + Botón volver
// ============================================================
import { useState, useEffect, useRef } from 'react';

const CSS = `
  @keyframes pdmIn{from{opacity:0}to{opacity:1}}
  @keyframes pdmUp{from{transform:translateY(36px) scale(.97);opacity:0}to{transform:translateY(0) scale(1);opacity:1}}
  @keyframes cartIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
  @keyframes cartOut{from{transform:translateX(0);opacity:1}to{transform:translateX(100%);opacity:0}}
  @keyframes addPop{0%{transform:scale(1)}50%{transform:scale(1.08)}100%{transform:scale(1)}}

  .pdm-ov{position:fixed;inset:0;background:rgba(30,10,60,.55);z-index:1100;backdrop-filter:blur(8px);animation:pdmIn .22s ease}
  .pdm-wrap{position:fixed;inset:0;z-index:1101;display:flex;align-items:center;justify-content:center;padding:14px;pointer-events:none}
  .pdm-box{
    background:#fff;border-radius:28px;width:100%;max-width:980px;
    max-height:92vh;overflow:hidden;display:flex;flex-direction:column;
    box-shadow:0 40px 100px rgba(90,40,160,.28);
    animation:pdmUp .32s cubic-bezier(.22,.68,0,1.1);
    pointer-events:all;position:relative;
  }

  /* ── HEADER ── */
  .pdm-hdr{
    padding:14px 18px 0;display:flex;align-items:center;gap:10px;
    border-bottom:1px solid #F0E8FF;padding-bottom:12px;flex-shrink:0;
  }
  .pdm-back{
    display:flex;align-items:center;gap:6px;background:none;border:none;
    color:#9B72CF;font-size:.78rem;font-weight:700;cursor:pointer;
    padding:6px 12px;border-radius:30px;transition:background .2s;
  }
  .pdm-back:hover{background:#F0E8FF}
  .pdm-breadcrumb{font-size:.72rem;color:#B8A0D8;flex:1}
  .pdm-breadcrumb span{color:#9B72CF;font-weight:600}
  .pdm-cart-toggle{
    position:relative;display:flex;align-items:center;gap:6px;
    padding:7px 14px;background:linear-gradient(135deg,#9B72CF,#7B5EA7);
    color:#fff;border:none;border-radius:30px;font-size:.76rem;font-weight:700;
    cursor:pointer;transition:all .2s;box-shadow:0 4px 14px rgba(155,114,207,.35);
  }
  .pdm-cart-toggle:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(155,114,207,.5)}
  .pdm-cart-badge2{
    background:#F4A7C3;color:#fff;border-radius:50%;
    width:18px;height:18px;font-size:.58rem;font-weight:800;
    display:flex;align-items:center;justify-content:center;
  }
  .pdm-close{
    background:rgba(180,150,220,.12);border:none;border-radius:50%;
    width:36px;height:36px;display:flex;align-items:center;justify-content:center;
    cursor:pointer;font-size:1rem;color:#7B5EA7;transition:all .2s;flex-shrink:0;
  }
  .pdm-close:hover{background:rgba(180,150,220,.28);transform:scale(1.08)}

  /* ── BODY ── */
  .pdm-body{display:flex;flex:1;overflow:hidden;position:relative}

  /* ── GALERÍA ── */
  .pdm-gallery{display:flex;gap:10px;padding:16px 14px 16px 18px;flex:1;overflow:hidden;min-width:0}
  .pdm-thumbs{
    display:flex;flex-direction:column;gap:7px;overflow-y:auto;
    width:68px;flex-shrink:0;padding-right:2px;
  }
  .pdm-thumbs::-webkit-scrollbar{width:3px}
  .pdm-thumbs::-webkit-scrollbar-thumb{background:#C9B8E8;border-radius:2px}
  .pdm-thumb{
    width:62px;height:62px;border-radius:11px;object-fit:cover;cursor:pointer;
    border:2.5px solid transparent;transition:all .2s;flex-shrink:0;
  }
  .pdm-thumb.active{border-color:#9B72CF;box-shadow:0 0 0 2px rgba(155,114,207,.25)}
  .pdm-thumb:hover:not(.active){border-color:#C9B8E8;transform:scale(1.04)}
  .pdm-vthumb{
    width:62px;height:62px;border-radius:11px;cursor:pointer;
    border:2.5px solid transparent;background:#2D1B4E;
    display:flex;align-items:center;justify-content:center;
    font-size:1.3rem;transition:all .2s;flex-shrink:0;
  }
  .pdm-vthumb.active{border-color:#9B72CF}

  .pdm-main{
    flex:1;position:relative;background:#FAF7FF;border-radius:16px;
    overflow:hidden;display:flex;align-items:center;justify-content:center;
    min-height:350px;
  }
  .pdm-img{width:100%;height:100%;object-fit:contain;cursor:zoom-in;transition:transform .4s ease}
  .pdm-img.zoom{transform:scale(2);cursor:zoom-out}
  .pdm-vid{width:100%;height:100%;object-fit:contain}
  .pdm-nav{
    position:absolute;top:50%;transform:translateY(-50%);
    background:rgba(255,255,255,.92);border:none;border-radius:50%;
    width:34px;height:34px;display:flex;align-items:center;justify-content:center;
    cursor:pointer;font-size:.95rem;box-shadow:0 2px 12px rgba(120,80,180,.18);
    transition:all .2s;color:#7B5EA7;
  }
  .pdm-nav:hover{background:#fff;box-shadow:0 4px 18px rgba(120,80,180,.3);transform:translateY(-50%) scale(1.08)}
  .pdm-prev{left:9px}
  .pdm-next{right:9px}
  .pdm-badge-img{
    position:absolute;top:11px;left:11px;padding:4px 12px;border-radius:30px;
    font-size:.62rem;font-weight:800;letter-spacing:.08em;color:#fff;text-transform:uppercase;
  }
  .pdm-vid-tag{
    position:absolute;bottom:9px;right:9px;background:rgba(30,10,60,.75);
    color:#fff;font-size:.67rem;font-weight:700;padding:3px 9px;border-radius:18px;
    display:flex;align-items:center;gap:4px;
  }
  .pdm-zoom-hint{
    position:absolute;bottom:9px;left:50%;transform:translateX(-50%);
    background:rgba(30,10,60,.5);color:#fff;font-size:.62rem;
    padding:3px 10px;border-radius:18px;pointer-events:none;
    opacity:0;transition:opacity .3s;
  }
  .pdm-main:hover .pdm-zoom-hint{opacity:1}

  /* ── INFO PANEL ── */
  .pdm-info{
    width:320px;flex-shrink:0;padding:16px 18px 18px 12px;
    overflow-y:auto;display:flex;flex-direction:column;gap:11px;
    border-left:1px solid #F0E8FF;
  }
  .pdm-info::-webkit-scrollbar{width:3px}
  .pdm-info::-webkit-scrollbar-thumb{background:#C9B8E8;border-radius:2px}
  .pdm-cat{font-size:.63rem;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#9B72CF}
  .pdm-name{font-family:'Playfair Display',serif;font-size:1.42rem;font-weight:700;color:#2D1B4E;line-height:1.25}
  .pdm-stars{display:flex;align-items:center;gap:7px;font-size:.79rem;color:#B8A0D8}
  .pdm-stars-gold{color:#C9A96E;font-size:.95rem}
  .pdm-div{height:1px;background:linear-gradient(90deg,#E8D5FF,transparent);margin:2px 0}
  .pdm-price-row{display:flex;align-items:baseline;gap:9px;flex-wrap:wrap}
  .pdm-price{font-family:'Playfair Display',serif;font-size:1.9rem;font-weight:700;color:#7B5EA7}
  .pdm-orig{font-size:.9rem;color:#bbb;text-decoration:line-through}
  .pdm-disc{background:linear-gradient(135deg,#E8D5FF,#F5EEFF);color:#7B5EA7;font-weight:700;font-size:.76rem;padding:3px 9px;border-radius:30px}
  .pdm-desc{font-size:.83rem;color:#6B5B8A;line-height:1.75}
  .pdm-stock-in{font-size:.79rem;font-weight:700;color:#52B788}
  .pdm-stock-out{font-size:.79rem;font-weight:700;color:#E74C3C}
  .pdm-qty-row{display:flex;align-items:center;gap:10px}
  .pdm-qty-lbl{font-size:.78rem;font-weight:600;color:#6B5B8A}
  .pdm-qty{display:flex;align-items:center;gap:2px;background:#F5EEFF;border-radius:30px;padding:3px}
  .pdm-qbtn{background:none;border:none;width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:1rem;color:#7B5EA7;font-weight:700;display:flex;align-items:center;justify-content:center;transition:background .2s}
  .pdm-qbtn:hover{background:rgba(155,114,207,.2)}
  .pdm-qval{min-width:30px;text-align:center;font-weight:700;font-size:.9rem;color:#2D1B4E}
  .pdm-add{
    padding:14px 0;background:linear-gradient(135deg,#9B72CF,#7B5EA7);
    color:#fff;border:none;border-radius:14px;font-weight:700;font-size:.95rem;
    cursor:pointer;box-shadow:0 7px 22px rgba(155,114,207,.38);
    transition:all .3s;letter-spacing:.03em;
  }
  .pdm-add:hover{transform:translateY(-2px);box-shadow:0 11px 30px rgba(155,114,207,.52)}
  .pdm-add.popped{animation:addPop .3s ease}
  .pdm-add:disabled{opacity:.6;cursor:default;transform:none}
  .pdm-wish{
    padding:12px 0;background:rgba(155,114,207,.08);color:#7B5EA7;
    border:2px solid rgba(155,114,207,.28);border-radius:14px;
    font-weight:700;font-size:.86rem;cursor:pointer;transition:all .3s;
  }
  .pdm-wish:hover{background:rgba(155,114,207,.16);border-color:#9B72CF}
  .pdm-tags{display:flex;flex-wrap:wrap;gap:5px}
  .pdm-tag{background:#F5EEFF;color:#9B72CF;font-size:.68rem;font-weight:600;padding:3px 10px;border-radius:30px}

  /* ── MINI CARRITO ── */
  .pdm-cart-panel{
    position:absolute;top:0;right:0;bottom:0;width:310px;
    background:#fff;border-left:1px solid #F0E8FF;
    display:flex;flex-direction:column;z-index:10;
    box-shadow:-8px 0 40px rgba(90,40,160,.12);
  }
  .pdm-cart-panel.entering{animation:cartIn .3s ease forwards}
  .pdm-cart-panel.leaving{animation:cartOut .25s ease forwards}
  .pdm-cp-hdr{
    padding:14px 16px 12px;border-bottom:1px solid #F0E8FF;
    display:flex;align-items:center;justify-content:space-between;
  }
  .pdm-cp-title{font-family:'Playfair Display',serif;font-size:1.05rem;font-weight:700;color:#2D1B4E}
  .pdm-cp-close{background:none;border:none;color:#B8A0D8;font-size:1rem;cursor:pointer;padding:4px;transition:color .2s}
  .pdm-cp-close:hover{color:#7B5EA7}
  .pdm-cp-items{flex:1;overflow-y:auto;padding:12px 14px;display:flex;flex-direction:column;gap:10px}
  .pdm-cp-items::-webkit-scrollbar{width:3px}
  .pdm-cp-items::-webkit-scrollbar-thumb{background:#C9B8E8;border-radius:2px}
  .pdm-cp-empty{text-align:center;padding:40px 20px;color:#C9B8E8}
  .pdm-cp-empty-icon{font-size:2.5rem;margin-bottom:10px}
  .pdm-cp-item{display:flex;gap:10px;background:#FAF7FF;border-radius:14px;padding:10px;border:1px solid #F0E8FF}
  .pdm-cp-img{width:56px;height:56px;border-radius:10px;object-fit:cover;flex-shrink:0}
  .pdm-cp-inf{flex:1;min-width:0}
  .pdm-cp-nm{font-size:.77rem;font-weight:600;color:#2D1B4E;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:3px}
  .pdm-cp-pr{font-size:.85rem;font-weight:700;color:#7B5EA7;margin-bottom:6px}
  .pdm-cp-qty{display:flex;align-items:center;gap:6px}
  .pdm-cp-qb{width:24px;height:24px;border-radius:7px;border:1.5px solid #E8D5FF;background:#fff;font-size:.8rem;font-weight:700;color:#7B5EA7;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s}
  .pdm-cp-qb:hover{border-color:#9B72CF;background:#F0E8FF}
  .pdm-cp-qv{font-size:.82rem;font-weight:700;color:#2D1B4E;min-width:16px;text-align:center}
  .pdm-cp-rm{margin-left:auto;background:none;border:none;color:#F4A7C3;font-size:.95rem;cursor:pointer;padding:2px;transition:color .2s}
  .pdm-cp-rm:hover{color:#E74C3C}
  .pdm-cp-footer{padding:12px 14px 16px;border-top:1px solid #F0E8FF}
  .pdm-cp-row{display:flex;justify-content:space-between;font-size:.77rem;color:#6B5B8A;margin-bottom:3px}
  .pdm-cp-total{display:flex;justify-content:space-between;font-weight:700;font-size:.92rem;margin:8px 0 12px;color:#2D1B4E}
  .pdm-cp-checkout{
    width:100%;padding:12px;background:linear-gradient(135deg,#9B72CF,#7B5EA7);
    color:#fff;border:none;border-radius:12px;font-weight:700;font-size:.85rem;
    cursor:pointer;box-shadow:0 5px 16px rgba(155,114,207,.38);transition:all .3s;
  }
  .pdm-cp-checkout:hover{transform:translateY(-1px);box-shadow:0 8px 24px rgba(155,114,207,.5)}
  .pdm-cp-continue{
    width:100%;padding:10px;margin-top:7px;background:transparent;
    color:#9B72CF;border:2px solid rgba(155,114,207,.28);border-radius:12px;
    font-weight:600;font-size:.8rem;cursor:pointer;transition:all .2s;
  }
  .pdm-cp-continue:hover{background:#F0E8FF;border-color:#9B72CF}

  /* ── RESPONSIVE ── */
  @media(max-width:760px){
    .pdm-wrap{padding:0;align-items:flex-end}
    .pdm-box{border-radius:22px 22px 0 0;max-height:96vh;max-width:100%}
    .pdm-body{flex-direction:column;overflow-y:auto}
    .pdm-gallery{flex-direction:column;padding:10px 12px 0}
    .pdm-thumbs{flex-direction:row;width:auto;overflow-x:auto;overflow-y:hidden;padding-bottom:6px}
    .pdm-thumb,.pdm-vthumb{width:52px;height:52px}
    .pdm-main{min-height:240px}
    .pdm-info{width:100%;border-left:none;border-top:1px solid #F0E8FF;padding:14px 12px 20px}
    .pdm-name{font-size:1.2rem}
    .pdm-price{font-size:1.6rem}
    .pdm-cart-panel{width:100%;top:auto;bottom:0;height:75%;border-left:none;border-top:2px solid #E8D5FF;border-radius:18px 18px 0 0}
  }
  @media(max-width:480px){
    .pdm-breadcrumb{display:none}
    .pdm-hdr{gap:7px}
  }
`;

const BADGE_BG = {
  VIRAL:'linear-gradient(135deg,#E8A0CF,#C9B8E8)',
  HOT:'linear-gradient(135deg,#FFB3BA,#FFC9A0)',
  BESTSELLER:'linear-gradient(135deg,#C9B8E8,#9B72CF)',
  NUEVO:'linear-gradient(135deg,#B3E8D0,#80CBA8)',
};

export default function ProductDetailModal({
  product, onClose, cart, onAddToCart, onUpdateQty, onRemoveFromCart,
  wishlist, onToggleWishlist, onCheckout
}) {
  const [media, setMedia]       = useState(0);
  const [zoomed, setZoomed]     = useState(false);
  const [qty, setQty]           = useState(1);
  const [added, setAdded]       = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const vidRef = useRef(null);

  const fmtCOP = (n) => {
    const num = Number(n);
    if (isNaN(num)) return '$0';
    return '$' + num.toLocaleString('es-CO', {minimumFractionDigits:0, maximumFractionDigits:0});
  };

  // Construir lista de medios
  const gallery = (() => { try { return JSON.parse(product.gallery || '[]'); } catch { return []; } })();
  const mainImg = product.imageUrl || 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&q=80';
  const allImgs = [mainImg, ...gallery.filter(u => u && u !== mainImg)];
  const mediaList = [
    ...allImgs.map(url => ({ type: 'image', url })),
    ...(product.videoUrl ? [{ type: 'video', url: product.videoUrl }] : []),
  ];
  const cur = mediaList[media] || mediaList[0];

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') { if (cartOpen) setCartOpen(false); else onClose(); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose, cartOpen]);

  const discount = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100) : 0;

  const cartTotal = (cart || []).reduce((s, i) => s + Number(i.price) * i.qty, 0);
  const cartCount = (cart || []).reduce((s, i) => s + i.qty, 0);
  const shipping  = cartTotal >= 80 ? 0 : cartTotal * 0.08;

  const handleAdd = () => {
    onAddToCart(product, qty);
    setAdded(true);
    setCartOpen(true);
    setTimeout(() => setAdded(false), 1800);
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="pdm-ov" onClick={() => { if (cartOpen) setCartOpen(false); else onClose(); }} />
      <div className="pdm-wrap">
        <div className="pdm-box" onClick={e => e.stopPropagation()}>

          {/* ── HEADER ── */}
          <div className="pdm-hdr">
            <button className="pdm-back" onClick={onClose}>
              ← Volver
            </button>
            <div className="pdm-breadcrumb">
              Tienda / <span>{product.category}</span> / {product.name}
            </div>
            <button className="pdm-cart-toggle" onClick={() => setCartOpen(o => !o)}>
              🛍️ Mi carrito
              {cartCount > 0 && <span className="pdm-cart-badge2">{cartCount}</span>}
            </button>
            <button className="pdm-close" onClick={onClose}>✕</button>
          </div>

          {/* ── BODY ── */}
          <div className="pdm-body">

            {/* GALERÍA */}
            <div className="pdm-gallery">
              {mediaList.length > 1 && (
                <div className="pdm-thumbs">
                  {mediaList.map((m, i) => m.type === 'video'
                    ? <div key={i} className={`pdm-vthumb${media === i ? ' active' : ''}`}
                        onClick={() => { setMedia(i); setZoomed(false); }}>▶️</div>
                    : <img key={i} src={m.url} alt="" className={`pdm-thumb${media === i ? ' active' : ''}`}
                        onClick={() => { setMedia(i); setZoomed(false); }} />
                  )}
                </div>
              )}

              <div className="pdm-main">
                {cur?.type === 'video'
                  ? <video ref={vidRef} className="pdm-vid" controls autoPlay><source src={cur.url} /></video>
                  : <img className={`pdm-img${zoomed ? ' zoom' : ''}`}
                      src={cur?.url} alt={product.name}
                      onClick={() => setZoomed(z => !z)} />
                }
                {product.badge && (
                  <span className="pdm-badge-img" style={{ background: BADGE_BG[product.badge] || '#C9B8E8' }}>
                    {product.badge}
                  </span>
                )}
                {cur?.type === 'video' && <div className="pdm-vid-tag">🎥 Video</div>}
                {cur?.type === 'image' && <div className="pdm-zoom-hint">🔍 Clic para zoom</div>}
                {mediaList.length > 1 && (
                  <>
                    {media > 0 && <button className="pdm-nav pdm-prev" onClick={() => { setZoomed(false); setMedia(i => i - 1); }}>‹</button>}
                    {media < mediaList.length - 1 && <button className="pdm-nav pdm-next" onClick={() => { setZoomed(false); setMedia(i => i + 1); }}>›</button>}
                  </>
                )}
              </div>
            </div>

            {/* INFO */}
            <div className="pdm-info">
              <div className="pdm-cat">{product.category}</div>
              <h2 className="pdm-name">{product.name}</h2>
              <div className="pdm-stars">
                <span className="pdm-stars-gold">
                  {'★'.repeat(Math.round(product.rating || 0))}{'☆'.repeat(5 - Math.round(product.rating || 0))}
                </span>
                {product.rating?.toFixed(1)} · {product.reviewCount} reseñas
              </div>
              <div className="pdm-div" />
              <div className="pdm-price-row">
                <span className="pdm-price">{fmtCOP(product.price)}</span>
                {product.originalPrice && <span className="pdm-orig">{fmtCOP(product.originalPrice)}</span>}
                {discount > 0 && <span className="pdm-disc">-{discount}%</span>}
              </div>
              {product.description && <p className="pdm-desc">{product.description}</p>}
              <div className="pdm-div" />
              <div className={product.stock > 0 ? 'pdm-stock-in' : 'pdm-stock-out'}>
                {product.stock > 0 ? `✓ En stock (${product.stock} disponibles)` : '✗ Sin stock'}
              </div>
              {product.stock > 0 && (
                <div className="pdm-qty-row">
                  <span className="pdm-qty-lbl">Cantidad:</span>
                  <div className="pdm-qty">
                    <button className="pdm-qbtn" onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
                    <span className="pdm-qval">{qty}</span>
                    <button className="pdm-qbtn" onClick={() => setQty(q => Math.min(product.stock, q + 1))}>+</button>
                  </div>
                </div>
              )}
              <button className={`pdm-add${added ? ' popped' : ''}`} onClick={handleAdd} disabled={!product.stock}>
                {added ? '✓ ¡Agregado!' : '🛍️ Agregar al carrito'}
              </button>
              <button className="pdm-wish" onClick={() => onToggleWishlist(product.id)}>
                {wishlist?.includes(product.id) ? '❤️ En favoritos' : '🤍 Guardar en favoritos'}
              </button>
              <div className="pdm-tags">
                {['Envío gratis +$80', 'Devolución 30 días', 'Pago seguro'].map(t => (
                  <span key={t} className="pdm-tag">✓ {t}</span>
                ))}
              </div>
            </div>

            {/* ── MINI CARRITO ── */}
            {cartOpen && (
              <div className="pdm-cart-panel entering">
                <div className="pdm-cp-hdr">
                  <div className="pdm-cp-title">🛍️ Tu carrito ({cartCount})</div>
                  <button className="pdm-cp-close" onClick={() => setCartOpen(false)}>✕</button>
                </div>

                <div className="pdm-cp-items">
                  {(cart || []).length === 0 ? (
                    <div className="pdm-cp-empty">
                      <div className="pdm-cp-empty-icon">🛍️</div>
                      <p style={{fontSize:'.82rem',color:'#B8A0D8'}}>Tu carrito está vacío</p>
                    </div>
                  ) : (cart || []).map(item => (
                    <div key={item.id} className="pdm-cp-item">
                      <img className="pdm-cp-img"
                        src={item.imageUrl || 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=100'}
                        alt={item.name} />
                      <div className="pdm-cp-inf">
                        <div className="pdm-cp-nm">{item.name}</div>
                        <div className="pdm-cp-pr">{fmtCOP(Number(item.price) * item.qty)}</div>
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

                {(cart || []).length > 0 && (
                  <div className="pdm-cp-footer">
                    <div className="pdm-cp-row">
                      <span>Subtotal</span><span>{fmtCOP(cartTotal)}</span>
                    </div>
                    <div className="pdm-cp-row" style={{color: shipping === 0 ? '#52B788' : undefined}}>
                      <span>Envío</span><span>{shipping === 0 ? 'GRATIS 🎉' : fmtCOP(shipping)}</span>
                    </div>
                    <div className="pdm-cp-total">
                      <span>Total</span>
                      <span style={{color:'#7B5EA7',fontFamily:"'Playfair Display',serif"}}>
                        {fmtCOP(cartTotal + shipping)}
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

          </div>
        </div>
      </div>
    </>
  );
}
