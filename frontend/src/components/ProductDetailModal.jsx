// ============================================================
//  ProductDetailModal.jsx v4 - EXPERIENCIA PREMIUM
//  Estilo Shein/Amazon con Zoom profesional y galería interactiva
// ============================================================
import { useState, useEffect, useRef } from 'react';

const CSS = `
  @keyframes pdmIn{from{opacity:0}to{opacity:1}}
  @keyframes pdmUp{from{transform:translateY(36px) scale(.97);opacity:0}to{transform:translateY(0) scale(1);opacity:1}}
  @keyframes cartIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
  @keyframes cartOut{from{transform:translateX(0);opacity:1}to{transform:translateX(100%);opacity:0}}
  @keyframes addPop{0%{transform:scale(1)}50%{transform:scale(1.08)}100%{transform:scale(1)}}
  @keyframes shimmer{0%{background-position:-1000px 0}100%{background-position:1000px 0}}

  .pdm-ov{position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:1100;backdrop-filter:blur(12px);animation:pdmIn .25s ease}
  .pdm-wrap{position:fixed;inset:0;z-index:1101;display:flex;align-items:center;justify-content:center;padding:20px;pointer-events:none}
  .pdm-box{
    background:#fff;border-radius:32px;width:100%;max-width:1320px;
    max-height:94vh;overflow:hidden;display:flex;flex-direction:column;
    box-shadow:0 50px 120px rgba(0,0,0,.4);
    animation:pdmUp .35s cubic-bezier(.22,.68,0,1.1);
    pointer-events:all;position:relative;
  }

  /* ── HEADER ── */
  .pdm-hdr{
    padding:16px 24px 12px;display:flex;align-items:center;gap:16px;
    border-bottom:1px solid #eee;flex-shrink:0;
  }
  .pdm-back{
    display:flex;align-items:center;gap:6px;background:none;border:none;
    color:#666;font-size:.85rem;font-weight:500;cursor:pointer;
    padding:8px 16px;border-radius:40px;transition:all .2s;
  }
  .pdm-back:hover{background:#f5f5f5;color:#000}
  .pdm-breadcrumb{font-size:.8rem;color:#999;flex:1}
  .pdm-breadcrumb span{color:#333;font-weight:500}
  .pdm-cart-toggle{
    position:relative;display:flex;align-items:center;gap:8px;
    padding:8px 20px;background:#000;color:#fff;border:none;
    border-radius:40px;font-size:.85rem;font-weight:500;
    cursor:pointer;transition:all .2s;
  }
  .pdm-cart-toggle:hover{background:#222;transform:scale(1.02)}
  .pdm-cart-badge2{
    background:#ff4d4d;color:#fff;border-radius:50%;
    width:20px;height:20px;font-size:.7rem;font-weight:600;
    display:flex;align-items:center;justify-content:center;
  }
  .pdm-close{
    background:transparent;border:none;border-radius:50%;
    width:40px;height:40px;display:flex;align-items:center;justify-content:center;
    cursor:pointer;font-size:1.2rem;color:#666;transition:all .2s;
  }
  .pdm-close:hover{background:#f0f0f0;color:#000}

  /* ── BODY ── */
  .pdm-body{display:flex;flex:1;overflow:hidden;position:relative;background:#fff;}

  /* ── GALERÍA PROFESIONAL (estilo Shein/Amazon) ── */
  .pdm-gallery{display:flex;gap:16px;padding:24px;flex:1.2;overflow:hidden;min-width:0;background:#fafafa;}
  
  /* Miniaturas verticales */
  .pdm-thumbs{
    display:flex;flex-direction:column;gap:12px;overflow-y:auto;
    width:80px;flex-shrink:0;padding-right:4px;
  }
  .pdm-thumbs::-webkit-scrollbar{width:4px}
  .pdm-thumbs::-webkit-scrollbar-thumb{background:#ddd;border-radius:4px}
  .pdm-thumb-wrap{
    width:76px;height:76px;border-radius:12px;cursor:pointer;
    border:2px solid transparent;overflow:hidden;
    transition:all .2s;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.05);
  }
  .pdm-thumb-wrap.active{border-color:#000;box-shadow:0 4px 16px rgba(0,0,0,.15);}
  .pdm-thumb-wrap:hover:not(.active){border-color:#ccc;}
  .pdm-thumb{
    width:100%;height:100%;object-fit:cover;display:block;
  }
  .pdm-vthumb-wrap{
    width:76px;height:76px;border-radius:12px;cursor:pointer;
    border:2px solid transparent;background:#f0f0f0;
    display:flex;align-items:center;justify-content:center;
    font-size:2rem;transition:all .2s;color:#666;
  }
  .pdm-vthumb-wrap.active{border-color:#000;background:#e0e0e0;color:#000}
  .pdm-vthumb-wrap:hover:not(.active){border-color:#ccc;}

  /* Contenedor principal de imagen - ZOOM PROFESIONAL */
  .pdm-main{
    flex:1;position:relative;background:#fff;border-radius:20px;
    overflow:hidden;display:flex;align-items:center;justify-content:center;
    min-height:0;box-shadow:0 8px 30px rgba(0,0,0,.05);
    cursor:crosshair;
  }
  
  /* Contenedor de zoom estilo Amazon */
  .pdm-zoom-container{
    width:100%;height:100%;position:relative;overflow:hidden;
    display:flex;align-items:center;justify-content:center;
  }
  
  .pdm-img{
    max-width:100%;max-height:100%;width:auto;height:auto;
    object-fit:contain;transition:opacity .2s;
    user-select:none;-webkit-user-drag:none;
  }
  
  /* Lupa de zoom (efecto Shein) */
  .pdm-zoom-lens{
    position:absolute;width:120px;height:120px;border-radius:50%;
    border:2px solid rgba(0,0,0,.3);background:rgba(255,255,255,.2);
    backdrop-filter:blur(2px);pointer-events:none;z-index:10;
    box-shadow:0 0 0 1px rgba(255,255,255,.5),0 4px 20px rgba(0,0,0,.2);
    transform:translate(-50%, -50%);display:none;
  }
  
  .pdm-main.zooming .pdm-zoom-lens{display:block;}
  
  /* Zoom result (como Amazon - imagen ampliada) */
  .pdm-zoom-result{
    position:absolute;top:0;left:calc(100% + 20px);width:100%;height:100%;
    background:#fff;border-radius:20px;overflow:hidden;z-index:20;
    box-shadow:0 10px 40px rgba(0,0,0,.2);border:1px solid #eee;
    opacity:0;visibility:hidden;transition:opacity .2s;
    pointer-events:none;background-repeat:no-repeat;
  }
  
  .pdm-main.zooming .pdm-zoom-result{
    opacity:1;visibility:visible;
  }
  
  /* Loading shimmer */
  .pdm-img.loading{opacity:0.5;}
  .pdm-img:not(.loaded){background:#f0f0f0;}
  .pdm-img.loaded{opacity:1;}
  
  /* Video */
  .pdm-vid{width:100%;height:100%;object-fit:contain;background:#000;border-radius:16px;}
  
  .pdm-nav{
    position:absolute;top:50%;transform:translateY(-50%);
    background:rgba(255,255,255,.9);border:none;border-radius:50%;
    width:40px;height:40px;display:flex;align-items:center;justify-content:center;
    cursor:pointer;font-size:1.2rem;box-shadow:0 2px 10px rgba(0,0,0,.1);
    transition:all .2s;color:#333;z-index:5;
  }
  .pdm-nav:hover{background:#fff;box-shadow:0 4px 16px rgba(0,0,0,.2);transform:translateY(-50%) scale(1.1);}
  .pdm-prev{left:16px;}
  .pdm-next{right:16px;}
  
  .pdm-badge-img{
    position:absolute;top:16px;left:16px;padding:6px 16px;border-radius:40px;
    font-size:.7rem;font-weight:600;letter-spacing:.05em;color:#fff;text-transform:uppercase;
    z-index:6;box-shadow:0 2px 8px rgba(0,0,0,.2);
  }
  
  .pdm-vid-tag{
    position:absolute;bottom:16px;right:16px;background:rgba(0,0,0,.7);
    color:#fff;font-size:.75rem;font-weight:500;padding:6px 14px;border-radius:40px;
    display:flex;align-items:center;gap:6px;backdrop-filter:blur(4px);z-index:6;
  }
  
  .pdm-zoom-hint{
    position:absolute;bottom:16px;left:50%;transform:translateX(-50%);
    background:rgba(0,0,0,.5);color:#fff;font-size:.7rem;
    padding:6px 16px;border-radius:40px;pointer-events:none;
    opacity:0;transition:opacity .2s;backdrop-filter:blur(4px);z-index:6;
    white-space:nowrap;
  }
  .pdm-main:hover .pdm-zoom-hint{opacity:1;}

  /* ── INFO PANEL ── */
  .pdm-info{
    width:400px;flex-shrink:0;padding:24px;overflow-y:auto;
    display:flex;flex-direction:column;gap:16px;
    border-left:1px solid #eee;background:#fff;
  }
  .pdm-info::-webkit-scrollbar{width:4px}
  .pdm-info::-webkit-scrollbar-thumb{background:#ddd;border-radius:4px}
  
  .pdm-cat{font-size:.7rem;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:#999;margin-bottom:4px;}
  .pdm-name{font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;font-size:1.8rem;font-weight:600;color:#000;line-height:1.2;margin-bottom:8px;}
  
  .pdm-stars{display:flex;align-items:center;gap:12px;font-size:.9rem;color:#666;}
  .pdm-stars-gold{color:#ffc107;font-size:1.1rem;letter-spacing:2px;}
  
  .pdm-div{height:1px;background:linear-gradient(90deg,#eee,transparent);margin:8px 0;}
  
  .pdm-price-row{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;}
  .pdm-price{font-size:2.2rem;font-weight:700;color:#000;}
  .pdm-orig{font-size:1rem;color:#999;text-decoration:line-through;}
  .pdm-disc{background:#ff4d4d;color:#fff;font-weight:600;font-size:.8rem;padding:4px 12px;border-radius:40px;}
  
  .pdm-desc{font-size:.95rem;color:#444;line-height:1.6;margin:8px 0;}
  
  .pdm-stock-in{font-size:.9rem;font-weight:600;color:#00a650;}
  .pdm-stock-out{font-size:.9rem;font-weight:600;color:#ff4d4d;}
  
  .pdm-qty-row{display:flex;align-items:center;gap:16px;margin:8px 0;}
  .pdm-qty-lbl{font-size:.9rem;font-weight:500;color:#333;}
  .pdm-qty{display:flex;align-items:center;gap:4px;border:1px solid #ddd;border-radius:40px;padding:4px;}
  .pdm-qbtn{
    width:36px;height:36px;border:none;border-radius:50%;
    background:#f5f5f5;cursor:pointer;font-size:1.2rem;
    color:#333;font-weight:500;transition:all .2s;
  }
  .pdm-qbtn:hover{background:#e0e0e0;}
  .pdm-qbtn:active{transform:scale(.95);}
  .pdm-qval{min-width:40px;text-align:center;font-weight:600;font-size:1rem;color:#000;}
  
  .pdm-add{
    padding:16px;background:#000;color:#fff;border:none;
    border-radius:40px;font-weight:600;font-size:1rem;
    cursor:pointer;transition:all .2s;margin:8px 0;
  }
  .pdm-add:hover{background:#222;transform:translateY(-2px);box-shadow:0 8px 20px rgba(0,0,0,.2);}
  .pdm-add.popped{animation:addPop .3s ease;background:#00a650;}
  .pdm-add:disabled{opacity:.3;cursor:not-allowed;transform:none;}
  
  .pdm-wish{
    padding:14px;background:transparent;color:#000;
    border:2px solid #ddd;border-radius:40px;font-weight:600;
    font-size:.95rem;cursor:pointer;transition:all .2s;
  }
  .pdm-wish:hover{background:#f5f5f5;border-color:#000;}
  .pdm-wish.in-wishlist{background:#fff0f0;border-color:#ff4d4d;color:#ff4d4d;}
  
  .pdm-tags{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px;}
  .pdm-tag{background:#f5f5f5;color:#666;font-size:.75rem;font-weight:500;padding:6px 14px;border-radius:40px;}

  /* ── MINI CARRITO ── */
  .pdm-cart-panel{
    position:absolute;top:0;right:0;bottom:0;width:380px;
    background:#fff;border-left:1px solid #eee;
    display:flex;flex-direction:column;z-index:100;
    box-shadow:-10px 0 40px rgba(0,0,0,.1);
  }
  .pdm-cart-panel.entering{animation:cartIn .3s ease forwards}
  .pdm-cart-panel.leaving{animation:cartOut .25s ease forwards}
  
  .pdm-cp-hdr{
    padding:20px 24px 16px;border-bottom:1px solid #eee;
    display:flex;align-items:center;justify-content:space-between;
  }
  .pdm-cp-title{font-size:1.2rem;font-weight:600;color:#000;}
  .pdm-cp-close{background:none;border:none;color:#999;font-size:1.2rem;cursor:pointer;padding:8px;transition:color .2s;}
  .pdm-cp-close:hover{color:#000;}
  
  .pdm-cp-items{flex:1;overflow-y:auto;padding:20px 24px;display:flex;flex-direction:column;gap:16px;}
  .pdm-cp-items::-webkit-scrollbar{width:4px}
  .pdm-cp-items::-webkit-scrollbar-thumb{background:#ddd;border-radius:4px}
  
  .pdm-cp-empty{text-align:center;padding:60px 20px;color:#999;}
  .pdm-cp-empty-icon{font-size:3rem;margin-bottom:16px;}
  
  .pdm-cp-item{display:flex;gap:16px;background:#fafafa;border-radius:16px;padding:16px;}
  .pdm-cp-img{width:80px;height:80px;border-radius:12px;object-fit:cover;}
  .pdm-cp-inf{flex:1;min-width:0;}
  .pdm-cp-nm{font-size:.9rem;font-weight:600;color:#000;margin-bottom:4px;}
  .pdm-cp-pr{font-size:1rem;font-weight:600;color:#000;margin-bottom:8px;}
  .pdm-cp-qty{display:flex;align-items:center;gap:8px;}
  .pdm-cp-qb{
    width:28px;height:28px;border-radius:8px;border:1px solid #ddd;
    background:#fff;font-size:.9rem;font-weight:600;color:#333;
    cursor:pointer;transition:all .2s;
  }
  .pdm-cp-qb:hover{border-color:#000;}
  .pdm-cp-qv{font-size:.9rem;font-weight:600;color:#000;min-width:20px;text-align:center;}
  .pdm-cp-rm{background:none;border:none;color:#ff4d4d;font-size:1rem;cursor:pointer;padding:4px;}
  
  .pdm-cp-footer{padding:20px 24px;border-top:1px solid #eee;background:#fff;}
  .pdm-cp-row{display:flex;justify-content:space-between;font-size:.9rem;color:#666;margin-bottom:8px;}
  .pdm-cp-total{display:flex;justify-content:space-between;font-weight:700;font-size:1.1rem;margin:16px 0;color:#000;}
  .pdm-cp-checkout{
    width:100%;padding:16px;background:#000;color:#fff;
    border:none;border-radius:40px;font-weight:600;font-size:.95rem;
    cursor:pointer;transition:all .2s;
  }
  .pdm-cp-checkout:hover{background:#222;}
  .pdm-cp-continue{
    width:100%;padding:14px;margin-top:12px;background:transparent;
    color:#000;border:2px solid #eee;border-radius:40px;
    font-weight:500;font-size:.9rem;cursor:pointer;transition:all .2s;
  }
  .pdm-cp-continue:hover{border-color:#000;}

  /* ── RESPONSIVE ── */
  @media(max-width:1024px){
    .pdm-box{max-width:95%;}
    .pdm-info{width:350px;}
  }
  
  @media(max-width:860px){
    .pdm-wrap{padding:10px;}
    .pdm-body{flex-direction:column;}
    .pdm-gallery{padding:16px;}
    .pdm-thumbs{flex-direction:row;width:auto;overflow-x:auto;padding-bottom:8px;}
    .pdm-thumb-wrap,.pdm-vthumb-wrap{width:70px;height:70px;flex-shrink:0;}
    .pdm-main{min-height:400px;}
    .pdm-zoom-result{display:none;}
    .pdm-info{width:100%;border-left:none;border-top:1px solid #eee;}
    .pdm-cart-panel{width:100%;}
  }
  
  @media(max-width:480px){
    .pdm-hdr{padding:12px 16px;}
    .pdm-breadcrumb{display:none;}
    .pdm-name{font-size:1.4rem;}
    .pdm-price{font-size:1.8rem;}
    .pdm-gallery{padding:12px;}
    .pdm-thumb-wrap,.pdm-vthumb-wrap{width:60px;height:60px;}
    .pdm-main{min-height:300px;}
  }
`;

const BADGE_BG = {
  VIRAL:'linear-gradient(135deg,#ff4d4d,#ff8080)',
  HOT:'linear-gradient(135deg,#ff8c42,#ffb347)',
  BESTSELLER:'linear-gradient(135deg,#9b59b6,#8e44ad)',
  NUEVO:'linear-gradient(135deg,#2ecc71,#27ae60)',
};

export default function ProductDetailModal({
  product, onClose, cart, onAddToCart, onUpdateQty, onRemoveFromCart,
  wishlist, onToggleWishlist, onCheckout
}) {
  const [media, setMedia] = useState(0);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [isZooming, setIsZooming] = useState(false);
  const [lensPos, setLensPos] = useState({ x: 50, y: 50 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  
  const mainRef = useRef(null);
  const imgRef = useRef(null);
  const lensRef = useRef(null);
  const zoomResultRef = useRef(null);
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
  const shipping = cartTotal >= 80 ? 0 : cartTotal * 0.08;

  const handleAdd = () => {
    onAddToCart(product, qty);
    setAdded(true);
    setCartOpen(true);
    setTimeout(() => setAdded(false), 1800);
  };

  // Manejar el zoom estilo Shein/Amazon
  const handleMouseMove = (e) => {
    if (!mainRef.current || !imgRef.current || cur?.type !== 'image') return;
    
    const main = mainRef.current;
    const img = imgRef.current;
    const rect = main.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();
    
    // Calcular posición del mouse relativa a la imagen
    let x = e.clientX - imgRect.left;
    let y = e.clientY - imgRect.top;
    
    // Limitar dentro de la imagen
    x = Math.max(0, Math.min(x, imgRect.width));
    y = Math.max(0, Math.min(y, imgRect.height));
    
    // Convertir a porcentajes
    const xPercent = (x / imgRect.width) * 100;
    const yPercent = (y / imgRect.height) * 100;
    
    setLensPos({ x: xPercent, y: yPercent });
    
    // Actualizar posición de la lupa
    if (lensRef.current) {
      lensRef.current.style.left = e.clientX - rect.left + 'px';
      lensRef.current.style.top = e.clientY - rect.top + 'px';
    }
    
    // Actualizar zoom result (para Amazon style)
    if (zoomResultRef.current && imgRef.current) {
      const zoomSize = 2.5; // Factor de zoom
      const bgX = (xPercent / 100) * (imageDimensions.width * zoomSize - rect.width);
      const bgY = (yPercent / 100) * (imageDimensions.height * zoomSize - rect.height);
      
      zoomResultRef.current.style.backgroundImage = `url(${cur.url})`;
      zoomResultRef.current.style.backgroundSize = `${imageDimensions.width * zoomSize}px ${imageDimensions.height * zoomSize}px`;
      zoomResultRef.current.style.backgroundPosition = `-${bgX}px -${bgY}px`;
    }
  };

  const handleMouseEnter = () => {
    if (cur?.type === 'image') {
      setIsZooming(true);
    }
  };

  const handleMouseLeave = () => {
    setIsZooming(false);
  };

  const handleImageLoad = (e) => {
    setImageLoaded(true);
    setImageDimensions({
      width: e.target.naturalWidth,
      height: e.target.naturalHeight
    });
  };

  const handleMediaChange = (index) => {
    setMedia(index);
    setImageLoaded(false);
    setIsZooming(false);
    if (vidRef.current) vidRef.current.pause();
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
              Inicio / <span>{product.category}</span> / {product.name}
            </div>
            <button className="pdm-cart-toggle" onClick={() => setCartOpen(o => !o)}>
              🛒 Carrito
              {cartCount > 0 && <span className="pdm-cart-badge2">{cartCount}</span>}
            </button>
            <button className="pdm-close" onClick={onClose}>✕</button>
          </div>

          {/* ── BODY ── */}
          <div className="pdm-body">
            {/* GALERÍA PROFESIONAL */}
            <div className="pdm-gallery">
              {/* Miniaturas verticales */}
              {mediaList.length > 1 && (
                <div className="pdm-thumbs">
                  {mediaList.map((m, i) => (
                    m.type === 'video' ? (
                      <div 
                        key={i} 
                        className={`pdm-vthumb-wrap${media === i ? ' active' : ''}`}
                        onClick={() => handleMediaChange(i)}
                      >
                        ▶️
                      </div>
                    ) : (
                      <div 
                        key={i} 
                        className={`pdm-thumb-wrap${media === i ? ' active' : ''}`}
                        onClick={() => handleMediaChange(i)}
                      >
                        <img src={m.url} alt="" className="pdm-thumb" loading="lazy" />
                      </div>
                    )
                  ))}
                </div>
              )}

              {/* Contenedor principal con ZOOM */}
              <div 
                className={`pdm-main${isZooming ? ' zooming' : ''}`}
                ref={mainRef}
                onMouseMove={handleMouseMove}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                <div className="pdm-zoom-container">
                  {cur?.type === 'video' ? (
                    <video ref={vidRef} className="pdm-vid" controls autoPlay>
                      <source src={cur.url} />
                    </video>
                  ) : (
                    <>
                      <img 
                        ref={imgRef}
                        className={`pdm-img${imageLoaded ? ' loaded' : ' loading'}`}
                        src={cur?.url} 
                        alt={product.name}
                        onLoad={handleImageLoad}
                        draggable="false"
                      />
                      
                      {/* Lupa (efecto Shein) */}
                      <div className="pdm-zoom-lens" ref={lensRef} />
                      
                      {/* Panel de zoom ampliado (estilo Amazon) */}
                      <div 
                        className="pdm-zoom-result" 
                        ref={zoomResultRef}
                      />
                    </>
                  )}
                </div>

                {product.badge && (
                  <span className="pdm-badge-img" style={{ background: BADGE_BG[product.badge] || '#000' }}>
                    {product.badge}
                  </span>
                )}
                
                {cur?.type === 'video' && (
                  <div className="pdm-vid-tag">
                    <span>🎥</span> Ver video
                  </div>
                )}
                
                {cur?.type === 'image' && !isZooming && (
                  <div className="pdm-zoom-hint">
                    🔍 Pasa el mouse para hacer zoom
                  </div>
                )}

                {/* Navegación */}
                {mediaList.length > 1 && (
                  <>
                    {media > 0 && (
                      <button 
                        className="pdm-nav pdm-prev" 
                        onClick={() => handleMediaChange(media - 1)}
                      >
                        ‹
                      </button>
                    )}
                    {media < mediaList.length - 1 && (
                      <button 
                        className="pdm-nav pdm-next" 
                        onClick={() => handleMediaChange(media + 1)}
                      >
                        ›
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* PANEL DE INFORMACIÓN */}
            <div className="pdm-info">
              <div>
                <div className="pdm-cat">{product.category}</div>
                <h2 className="pdm-name">{product.name}</h2>
                
                <div className="pdm-stars">
                  <span className="pdm-stars-gold">
                    {'★'.repeat(Math.round(product.rating || 0))}
                    {'☆'.repeat(5 - Math.round(product.rating || 0))}
                  </span>
                  <span>{product.rating?.toFixed(1)}</span>
                  <span>·</span>
                  <span>{product.reviewCount || 0} reseñas</span>
                </div>
              </div>

              <div className="pdm-div" />

              <div className="pdm-price-row">
                <span className="pdm-price">{fmtCOP(product.price)}</span>
                {product.originalPrice && (
                  <span className="pdm-orig">{fmtCOP(product.originalPrice)}</span>
                )}
                {discount > 0 && (
                  <span className="pdm-disc">-{discount}%</span>
                )}
              </div>

              {product.description && (
                <p className="pdm-desc">{product.description}</p>
              )}

              <div className={product.stock > 0 ? 'pdm-stock-in' : 'pdm-stock-out'}>
                {product.stock > 0 
                  ? `✓ En stock - Envío gratis a toda Colombia` 
                  : '✗ Agotado temporalmente'
                }
              </div>

              {product.stock > 0 && (
                <div className="pdm-qty-row">
                  <span className="pdm-qty-lbl">Cantidad:</span>
                  <div className="pdm-qty">
                    <button 
                      className="pdm-qbtn" 
                      onClick={() => setQty(q => Math.max(1, q - 1))}
                    >
                      −
                    </button>
                    <span className="pdm-qval">{qty}</span>
                    <button 
                      className="pdm-qbtn" 
                      onClick={() => setQty(q => Math.min(product.stock, q + 1))}
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

              <button 
                className={`pdm-add${added ? ' popped' : ''}`} 
                onClick={handleAdd} 
                disabled={!product.stock}
              >
                {added ? '✓ Agregado al carrito' : '🛒 Agregar al carrito'}
              </button>

              <button 
                className={`pdm-wish${wishlist?.includes(product.id) ? ' in-wishlist' : ''}`} 
                onClick={() => onToggleWishlist(product.id)}
              >
                {wishlist?.includes(product.id) ? '❤️ En favoritos' : '🤍 Guardar'}
              </button>

              <div className="pdm-tags">
                <span className="pdm-tag">🚚 Envío gratis +$80.000</span>
                <span className="pdm-tag">🔄 30 días de devolución</span>
                <span className="pdm-tag">🔒 Pago seguro</span>
                <span className="pdm-tag">⭐ Garantía de calidad</span>
              </div>
            </div>

            {/* MINI CARRITO */}
            {cartOpen && (
              <div className="pdm-cart-panel entering">
                <div className="pdm-cp-hdr">
                  <div className="pdm-cp-title">
                    Mi carrito ({cartCount} {cartCount === 1 ? 'producto' : 'productos'})
                  </div>
                  <button className="pdm-cp-close" onClick={() => setCartOpen(false)}>
                    ✕
                  </button>
                </div>

                <div className="pdm-cp-items">
                  {(cart || []).length === 0 ? (
                    <div className="pdm-cp-empty">
                      <div className="pdm-cp-empty-icon">🛒</div>
                      <p>Tu carrito está vacío</p>
                      <p style={{fontSize:'.8rem',marginTop:'8px'}}>
                        ¡Agrega productos para continuar!
                      </p>
                    </div>
                  ) : (
                    (cart || []).map(item => (
                      <div key={item.id} className="pdm-cp-item">
                        <img 
                          className="pdm-cp-img"
                          src={item.imageUrl || 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=100'} 
                          alt={item.name} 
                        />
                        <div className="pdm-cp-inf">
                          <div className="pdm-cp-nm">{item.name}</div>
                          <div className="pdm-cp-pr">{fmtCOP(Number(item.price) * item.qty)}</div>
                          <div className="pdm-cp-qty">
                            <button 
                              className="pdm-cp-qb" 
                              onClick={() => onUpdateQty(item.id, -1)}
                            >
                              −
                            </button>
                            <span className="pdm-cp-qv">{item.qty}</span>
                            <button 
                              className="pdm-cp-qb" 
                              onClick={() => onUpdateQty(item.id, 1)}
                            >
                              +
                            </button>
                            <button 
                              className="pdm-cp-rm" 
                              onClick={() => onRemoveFromCart(item.id)}
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {(cart || []).length > 0 && (
                  <div className="pdm-cp-footer">
                    <div className="pdm-cp-row">
                      <span>Subtotal</span>
                      <span>{fmtCOP(cartTotal)}</span>
                    </div>
                    <div className="pdm-cp-row">
                      <span>Envío</span>
                      <span style={{color: shipping === 0 ? '#00a650' : undefined}}>
                        {shipping === 0 ? 'GRATIS' : fmtCOP(shipping)}
                      </span>
                    </div>
                    <div className="pdm-cp-total">
                      <span>Total</span>
                      <span>{fmtCOP(cartTotal + shipping)}</span>
                    </div>
                    
                    <button 
                      className="pdm-cp-checkout" 
                      onClick={() => { onClose(); onCheckout(); }}
                    >
                      Finalizar compra →
                    </button>
                    
                    <button 
                      className="pdm-cp-continue" 
                      onClick={() => setCartOpen(false)}
                    >
                      Seguir comprando
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