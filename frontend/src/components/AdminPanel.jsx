// ============================================================
//  src/components/AdminPanel.jsx
//  Panel de administración — publicar productos sin tocar código
// ============================================================
import { useState, useEffect, useRef } from 'react';
import { productAPI, orderAPI } from '../services/api';

const ADMIN_PASSWORD = process.env.REACT_APP_ADMIN_PASSWORD || 'Kosmica2025';

const CATEGORIES = ['BOLSOS','BILLETERAS','MAQUILLAJE','CAPILAR','ROPA'];
const BADGES     = ['','VIRAL','HOT','BESTSELLER','NUEVO'];

const ADM_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500;600;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; }
  .adm-root{font-family:'DM Sans',sans-serif;background:#F8F4FF;min-height:100vh;color:#2D1B4E}

  /* ── LOGIN ── */
  .adm-login{min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#F5EEFF 0%,#E8D5FF 50%,#D4C5F0 100%);padding:20px}
  .adm-login-box{background:#fff;border-radius:24px;padding:40px 32px;width:100%;max-width:380px;box-shadow:0 20px 60px rgba(120,80,180,.2);text-align:center}
  .adm-login-icon{font-size:3rem;margin-bottom:14px}
  .adm-login-title{font-family:'Playfair Display',serif;font-size:1.8rem;color:#2D1B4E;margin-bottom:7px}
  .adm-login-sub{color:#9B72CF;font-size:.9rem;margin-bottom:28px}
  .adm-login-input{width:100%;padding:14px 16px;border:2px solid #E8D5FF;border-radius:14px;font-size:1rem;outline:none;transition:border .2s;font-family:'DM Sans',sans-serif;margin-bottom:12px}
  .adm-login-input:focus{border-color:#9B72CF}
  .adm-login-btn{width:100%;padding:15px;background:linear-gradient(135deg,#9B72CF,#7B5EA7);color:#fff;border:none;border-radius:14px;font-weight:700;font-size:1rem;cursor:pointer;box-shadow:0 8px 24px rgba(155,114,207,.4);transition:all .3s}
  .adm-login-error{color:#E74C3C;font-size:.85rem;margin-top:8px}

  /* ── LAYOUT ── */
  .adm-layout{display:flex;min-height:100vh}

  /* ── HAMBURGER ── */
  .adm-hamburger{
    display:none;position:fixed;top:12px;left:12px;z-index:500;
    background:linear-gradient(135deg,#9B72CF,#7B5EA7);border:none;
    border-radius:12px;width:46px;height:46px;
    align-items:center;justify-content:center;
    font-size:1.3rem;cursor:pointer;
    box-shadow:0 4px 16px rgba(120,80,180,.5);color:#fff;
  }
  .adm-mob-overlay{
    display:none;position:fixed;inset:0;
    background:rgba(0,0,0,.55);z-index:300;
    backdrop-filter:blur(3px);
  }

  /* ── SIDEBAR ── */
  .adm-sidebar{
    width:240px;flex-shrink:0;
    background:linear-gradient(180deg,#2D1B4E 0%,#4A2D7A 100%);
    min-height:100vh;display:flex;flex-direction:column;
    position:sticky;top:0;height:100vh;overflow-y:auto;
  }
  .adm-logo{padding:26px 22px 18px;border-bottom:1px solid rgba(255,255,255,.1)}
  .adm-logo-text{font-family:'Playfair Display',serif;font-size:1.35rem;color:#fff;font-weight:700}
  .adm-logo-sub{font-size:.75rem;color:rgba(255,255,255,.4);margin-top:2px;letter-spacing:.1em;text-transform:uppercase}
  .adm-nav{padding:18px 10px;flex:1}
  .adm-nav-item{
    display:flex;align-items:center;gap:12px;padding:13px 14px;
    border-radius:14px;cursor:pointer;transition:all .2s;
    color:rgba(255,255,255,.6);font-size:.95rem;font-weight:500;
    margin-bottom:4px;min-height:50px;border:none;background:none;
    width:100%;text-align:left;font-family:'DM Sans',sans-serif;
  }
  .adm-nav-item:hover{background:rgba(255,255,255,.08);color:#fff}
  .adm-nav-item.active{background:linear-gradient(135deg,rgba(155,114,207,.4),rgba(123,94,167,.3));color:#fff;box-shadow:0 4px 14px rgba(0,0,0,.2)}
  .adm-nav-icon{font-size:1.2rem;width:24px;text-align:center;flex-shrink:0}
  .adm-nav-logout{padding:14px 10px;border-top:1px solid rgba(255,255,255,.1)}
  .adm-logout-btn{
    display:flex;align-items:center;gap:10px;padding:13px 14px;
    border-radius:12px;cursor:pointer;color:rgba(255,255,255,.5);
    font-size:.92rem;transition:all .2s;border:none;background:none;
    width:100%;font-family:'DM Sans',sans-serif;min-height:48px;
  }
  .adm-logout-btn:hover{color:#FF8A80;background:rgba(255,255,255,.05)}

  /* ── CONTENT ── */
  .adm-content{flex:1;padding:32px 36px;min-height:100vh;overflow-x:hidden}
  .adm-page-title{font-family:'Playfair Display',serif;font-size:1.9rem;font-weight:700;color:#2D1B4E;margin-bottom:6px}
  .adm-page-sub{color:#9B72CF;font-size:.92rem;margin-bottom:26px}

  /* ── STATS ── */
  .adm-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;margin-bottom:28px}
  .adm-stat-card{background:#fff;border-radius:20px;padding:22px;box-shadow:0 4px 20px rgba(120,80,180,.08);border-left:4px solid var(--color)}
  .adm-stat-icon{font-size:1.8rem;margin-bottom:10px}
  .adm-stat-n{font-family:'Playfair Display',serif;font-size:2rem;font-weight:700;color:#2D1B4E}
  .adm-stat-label{font-size:.82rem;color:#9B72CF;margin-top:4px;font-weight:500}

  /* ── CARD ── */
  .adm-card{background:#fff;border-radius:20px;box-shadow:0 4px 20px rgba(120,80,180,.08);overflow:hidden;margin-bottom:24px}
  .adm-card-header{padding:20px 24px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #F0E8FF;flex-wrap:wrap;gap:10px}
  .adm-card-title{font-weight:700;font-size:1.05rem;color:#2D1B4E}
  .adm-new-btn{padding:10px 20px;background:linear-gradient(135deg,#9B72CF,#7B5EA7);color:#fff;border:none;border-radius:12px;font-weight:700;font-size:.88rem;cursor:pointer;display:flex;align-items:center;gap:8px;transition:all .3s;box-shadow:0 4px 14px rgba(155,114,207,.35);white-space:nowrap}
  .adm-new-btn:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(155,114,207,.5)}

  /* ── TABLE ── */
  .adm-table-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}
  .adm-table{width:100%;border-collapse:collapse;min-width:540px}
  .adm-table th{padding:12px 16px;text-align:left;font-size:.78rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#9B72CF;border-bottom:1px solid #F0E8FF;background:#FAF7FF}
  .adm-table td{padding:13px 16px;border-bottom:1px solid #F8F4FF;vertical-align:middle;font-size:.88rem}
  .adm-table tr:hover td{background:#FAF7FF}
  .adm-prod-img{width:48px;height:48px;border-radius:10px;object-fit:cover}
  .adm-badge{padding:3px 10px;border-radius:30px;font-size:.72rem;font-weight:800;text-transform:uppercase}
  .adm-badge.VIRAL{background:#F0E8FF;color:#7B5EA7}
  .adm-badge.HOT{background:#FFE8EA;color:#C0392B}
  .adm-badge.BESTSELLER{background:#FFF3E0;color:#E67E22}
  .adm-badge.NUEVO{background:#E8F5E9;color:#27AE60}
  .adm-cat-pill{background:#F0E8FF;color:#7B5EA7;padding:3px 10px;border-radius:30px;font-size:.78rem;font-weight:600}
  .adm-action-btn{padding:7px 14px;border-radius:10px;font-size:.8rem;font-weight:700;cursor:pointer;transition:all .2s;border:none}
  .adm-edit-btn{background:#F0E8FF;color:#7B5EA7}
  .adm-edit-btn:hover{background:#E0D0FF}
  .adm-del-btn{background:#FFF0F0;color:#E74C3C;margin-left:6px}
  .adm-del-btn:hover{background:#FFD0D0}

  /* ── FORM ── */
  .adm-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
  .adm-form-group{display:flex;flex-direction:column;gap:6px}
  .adm-form-group.full{grid-column:1/-1}
  .adm-label{font-size:.82rem;font-weight:700;color:#6B5B8A;letter-spacing:.04em}
  .adm-input{padding:12px 14px;border:2px solid #E8D5FF;border-radius:12px;font-size:.95rem;outline:none;transition:border .2s;font-family:'DM Sans',sans-serif;color:#2D1B4E}
  .adm-input:focus{border-color:#9B72CF}
  .adm-select{padding:12px 14px;border:2px solid #E8D5FF;border-radius:12px;font-size:.95rem;outline:none;cursor:pointer;font-family:'DM Sans',sans-serif;color:#2D1B4E;background:#fff}
  .adm-textarea{padding:12px 14px;border:2px solid #E8D5FF;border-radius:12px;font-size:.95rem;outline:none;resize:vertical;min-height:80px;font-family:'DM Sans',sans-serif;color:#2D1B4E;transition:border .2s}
  .adm-textarea:focus{border-color:#9B72CF}

  /* ── UPLOAD ── */
  .adm-upload-zone{border:2.5px dashed #C9B8E8;border-radius:16px;padding:24px;text-align:center;cursor:pointer;transition:all .3s;background:#FAF7FF}
  .adm-upload-zone:hover,.adm-upload-zone.drag{border-color:#9B72CF;background:#F0E8FF}
  .adm-upload-icon{font-size:2.5rem;margin-bottom:8px}
  .adm-upload-text{font-size:.9rem;color:#7B5EA7;font-weight:600}
  .adm-upload-sub{font-size:.78rem;color:#B8A0D8;margin-top:4px}
  .adm-progress{height:6px;background:#E8D5FF;border-radius:3px;overflow:hidden;margin-top:10px}
  .adm-progress-bar{height:100%;background:linear-gradient(90deg,#9B72CF,#C9B8E8);transition:width .3s;border-radius:3px}
  .adm-preview-row{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
  .adm-preview-item{position:relative;width:70px;height:70px;border-radius:10px;overflow:hidden;border:2px solid #E8D5FF}
  .adm-preview-item img{width:100%;height:100%;object-fit:cover}
  .adm-preview-del{position:absolute;top:2px;right:2px;background:rgba(0,0,0,.6);color:#fff;border:none;border-radius:50%;width:18px;height:18px;font-size:.6rem;cursor:pointer;display:flex;align-items:center;justify-content:center}
  .adm-video-preview{display:flex;align-items:center;gap:10px;background:#2D1B4E;border-radius:12px;padding:10px 14px;margin-top:8px}
  .adm-video-icon{font-size:1.5rem}
  .adm-video-name{color:#fff;font-size:.85rem;font-weight:600;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .adm-video-del{background:rgba(255,255,255,.15);border:none;color:#fff;border-radius:8px;padding:5px 10px;cursor:pointer;font-size:.8rem}

  /* ── MODAL ── */
  .adm-modal-bg{position:fixed;inset:0;background:rgba(45,27,78,.5);z-index:1000;display:flex;align-items:flex-end;justify-content:center;padding:0;backdrop-filter:blur(6px)}
  .adm-modal-inner{background:#fff;border-radius:24px 24px 0 0;width:100%;max-width:680px;max-height:92vh;overflow-y:auto;padding:28px 28px 40px;box-shadow:0 -12px 50px rgba(120,80,180,.3)}
  .adm-modal-title{font-family:'Playfair Display',serif;font-size:1.5rem;color:#2D1B4E;margin-bottom:22px;padding-bottom:14px;border-bottom:1px solid #F0E8FF;font-weight:700}
  .adm-modal-actions{display:flex;gap:12px;margin-top:24px;flex-wrap:wrap}
  .adm-save-btn{flex:1;padding:14px;background:linear-gradient(135deg,#9B72CF,#7B5EA7);color:#fff;border:none;border-radius:14px;font-weight:700;font-size:1rem;cursor:pointer;box-shadow:0 6px 20px rgba(155,114,207,.4);min-width:120px}
  .adm-cancel-btn{padding:14px 24px;background:#F0E8FF;color:#7B5EA7;border:none;border-radius:14px;font-weight:700;font-size:1rem;cursor:pointer}

  /* ── ORDERS ── */
  .adm-status{padding:4px 12px;border-radius:30px;font-size:.78rem;font-weight:700;display:inline-block}
  .adm-status.PENDING{background:#FFF9E0;color:#B8860B}
  .adm-status.PAID{background:#E8F5E9;color:#27AE60}
  .adm-status.PROCESSING{background:#E8F0FF;color:#3B5BDB}
  .adm-status.SHIPPED{background:#E0F7FA;color:#00838F}
  .adm-status.DELIVERED{background:#E8F5E9;color:#2E7D32}
  .adm-status.CANCELLED{background:#FFF0F0;color:#E74C3C}
  .adm-select-sm{padding:5px 10px;border-radius:9px;border:1.5px solid #E8D5FF;font-size:.82rem;font-family:'DM Sans',sans-serif;color:#2D1B4E;background:#fff;cursor:pointer;outline:none}

  /* ═══════════════════════════════════
     TABLET  ≥ 768px
  ═══════════════════════════════════ */
  @media(min-width:768px){
    .adm-modal-bg{align-items:center;padding:20px}
    .adm-modal-inner{border-radius:24px;max-height:88vh}
    .adm-stats{grid-template-columns:repeat(2,1fr)}
    .adm-content{padding:28px 28px}
  }

  /* ═══════════════════════════════════
     DESKTOP  ≥ 1024px
  ═══════════════════════════════════ */
  @media(min-width:1024px){
    .adm-stats{grid-template-columns:repeat(4,1fr)}
    .adm-content{padding:32px 40px}
    .adm-page-title{font-size:2rem}
  }

  /* ═══════════════════════════════════
     MÓVIL  < 768px
  ═══════════════════════════════════ */
  @media(max-width:767px){
    .adm-hamburger{display:flex}
    .adm-sidebar{
      position:fixed;left:0;top:0;height:100vh;z-index:400;
      transform:translateX(-100%);transition:transform .3s ease;
    }
    .adm-sidebar.open{transform:translateX(0)}
    .adm-mob-overlay.open{display:block}
    .adm-content{padding:16px 14px;padding-top:72px}
    .adm-page-title{font-size:1.45rem}
    .adm-page-sub{font-size:.88rem;margin-bottom:16px}
    .adm-stats{grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:20px}
    .adm-stat-card{padding:16px 14px}
    .adm-stat-n{font-size:1.55rem}
    .adm-stat-label{font-size:.78rem}
    .adm-card-header{padding:14px 16px}
    .adm-card-title{font-size:.95rem}
    .adm-new-btn{padding:9px 16px;font-size:.84rem}
    .adm-form-grid{grid-template-columns:1fr}
    .adm-form-group.full{grid-column:auto}
    .adm-modal-inner{padding:20px 16px 36px;border-radius:20px 20px 0 0}
    .adm-modal-title{font-size:1.3rem;margin-bottom:16px}
    .adm-modal-actions{flex-direction:column}
    .adm-save-btn,.adm-cancel-btn{width:100%}
    .adm-login-box{padding:30px 22px}
  }
`;
const EMPTY_PRODUCT = {
  name:'', description:'', price:'', originalPrice:'', category:'BOLSOS',
  badge:'', stock:'', imageUrl:'', videoUrl:'', gallery:'[]'
};

export default function AdminPanel({ onExit }) {
  const [authed, setAuthed]       = useState(false);
  const [pass, setPass]           = useState('');
  const [loginErr, setLoginErr]   = useState('');
  const [section, setSection]     = useState('dashboard');
  const [products, setProducts]   = useState([]);
  const [orders, setOrders]       = useState([]);
  const [loading, setLoading]     = useState(false);
  const [editing, setEditing]     = useState(null); // product being edited
  const [form, setForm]           = useState(EMPTY_PRODUCT);
  const [toast, setToast]         = useState(null);
  const [saving, setSaving]       = useState(false);
  const [imgProgress, setImgProgress] = useState(0);
  const [vidProgress, setVidProgress] = useState(0);
  const [galleryUrls, setGalleryUrls] = useState([]);
  const [videoName, setVideoName] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const imgInput = useRef(); const vidInput = useRef(); const gallInput = useRef();

  const showToast = (msg, type='success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const login = () => {
    if (pass === ADMIN_PASSWORD) { setAuthed(true); setLoginErr(''); }
    else setLoginErr('Contraseña incorrecta');
  };

  // Cargar datos
  const loadProducts = async () => {
    setLoading(true);
    try { const d = await productAPI.getAll(); setProducts(Array.isArray(d) ? d : (d.content||[])); }
    catch(e) { showToast(e.message,'error'); }
    finally { setLoading(false); }
  };
  const loadOrders = async () => {
    setLoading(true);
    try { const d = await orderAPI.getAll(); setOrders(Array.isArray(d) ? d : (d.content||[])); }
    catch(e) { showToast(e.message,'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (!authed) return;
    if (section === 'products' || section === 'dashboard') loadProducts();
    if (section === 'orders' || section === 'dashboard') loadOrders();
  }, [authed, section]);

  // Form handlers
  const fSet = (k, v) => setForm(p => ({...p, [k]: v}));
  const openNew = () => { setForm(EMPTY_PRODUCT); setGalleryUrls([]); setVideoName(''); setEditing('new'); };
  const openEdit = (p) => {
    setForm({
      name: p.name||'', description: p.description||'', price: p.price||'',
      originalPrice: p.originalPrice||'', category: p.category||'BOLSOS',
      badge: p.badge||'', stock: p.stock||0, imageUrl: p.imageUrl||'',
      videoUrl: p.videoUrl||'', gallery: p.gallery||'[]'
    });
    let g = []; try { g = JSON.parse(p.gallery||'[]'); } catch {}
    setGalleryUrls(g);
    setVideoName(p.videoUrl ? p.videoUrl.split('/').pop() : '');
    setEditing(p);
  };
  const cancelEdit = () => { setEditing(null); setGalleryUrls([]); setVideoName(''); };

  // Upload imagen principal
  const uploadMainImage = async (file) => {
    if (!file) return;
    setImgProgress(1);
    try {
      const res = await productAPI.uploadImage(file, p => setImgProgress(p));
      fSet('imageUrl', res.url);
      showToast('✓ Imagen principal subida');
    } catch(e) { showToast(e.message,'error'); }
    finally { setImgProgress(0); }
  };

  // Upload galería múltiple
  const uploadGalleryImages = async (files) => {
    for (const file of Array.from(files)) {
      try {
        const res = await productAPI.uploadImage(file);
        setGalleryUrls(prev => [...prev, res.url]);
      } catch(e) { showToast(`Error: ${file.name}`,'error'); }
    }
    showToast(`✓ ${files.length} imagen(es) de galería subidas`);
  };

  // Upload video
  const uploadVideo = async (file) => {
    if (!file) return;
    setVidProgress(1);
    setVideoName(file.name);
    try {
      const res = await productAPI.uploadVideo(file, p => setVidProgress(p));
      fSet('videoUrl', res.url);
      showToast('✓ Video subido correctamente');
    } catch(e) { showToast(e.message,'error'); }
    finally { setVidProgress(0); }
  };

  const removeGalleryImg = (url) => setGalleryUrls(prev => prev.filter(u => u !== url));

  // Guardar producto
  const saveProduct = async () => {
    if (!form.name || !form.price || !form.category) {
      showToast('Nombre, precio y categoría son requeridos','error'); return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        price: parseFloat(form.price),
        originalPrice: form.originalPrice ? parseFloat(form.originalPrice) : null,
        stock: parseInt(form.stock)||0,
        gallery: JSON.stringify(galleryUrls),
      };
      if (editing === 'new') await productAPI.create(payload);
      else await productAPI.update(editing.id, payload);
      showToast(editing === 'new' ? '✓ Producto publicado' : '✓ Producto actualizado');
      cancelEdit();
      loadProducts();
    } catch(e) { showToast(e.message,'error'); }
    finally { setSaving(false); }
  };

  const deleteProduct = async (id, name) => {
    if (!window.confirm(`¿Eliminar "${name}"?`)) return;
    try {
      await productAPI.delete(id);
      showToast('✓ Producto eliminado');
      loadProducts();
    } catch(e) { showToast(e.message,'error'); }
  };

  const updateOrderStatus = async (id, status) => {
    try {
      await orderAPI.updateStatus(id, status);
      setOrders(prev => prev.map(o => o.id === id ? {...o, status} : o));
      showToast('✓ Estado actualizado');
    } catch(e) { showToast(e.message,'error'); }
  };

  const totalRevenue = orders.filter(o=>o.status!=='CANCELLED').reduce((s,o)=>s+Number(o.total||0),0);
  const filteredOrders = orders.filter(o =>
    !orderSearch ||
    o.orderNumber?.toLowerCase().includes(orderSearch.toLowerCase()) ||
    o.customerEmail?.toLowerCase().includes(orderSearch.toLowerCase()) ||
    o.customerName?.toLowerCase().includes(orderSearch.toLowerCase())
  );

  // ── LOGIN ─────────────────────────────────────────────────
  if (!authed) return (
    <>
      <style>{ADM_CSS}</style>
      <div className="adm-login">
        <div className="adm-login-box">
          <div className="adm-login-icon">🛡️</div>
          <h1 className="adm-login-title">Panel Admin</h1>
          <p className="adm-login-sub">Kosmica · Acceso restringido</p>
          <input className="adm-login-input" type="password" placeholder="Contraseña de administrador"
            value={pass} onChange={e => setPass(e.target.value)}
            onKeyDown={e => e.key==='Enter' && login()} />
          <button className="adm-login-btn" onClick={login}>Ingresar →</button>
          {loginErr && <p className="adm-login-error">⚠️ {loginErr}</p>}
          <div style={{marginTop:20,fontSize:'.75rem',color:'#C9B8E8'}}>
            <br/>
            <span style={{fontSize:'.68rem',color:'#D4B8FF'}}>
              Cámbiala en .env → REACT_APP_ADMIN_PASSWORD
            </span>
          </div>
        </div>
      </div>
    </>
  );

  // ── PANEL PRINCIPAL ───────────────────────────────────────
  const NAV = [
    { id:'dashboard', icon:'📊', label:'Dashboard' },
    { id:'products',  icon:'🛍️', label:'Productos' },
    { id:'orders',    icon:'📦', label:'Pedidos' },
    { id:'media',     icon:'📸', label:'Subir Medios' },
  ];

  return (
    <>
      <style>{ADM_CSS}</style>
      {toast && <div className={`adm-toast ${toast.type}`}>{toast.msg}</div>}

      {/* HAMBURGER MÓVIL */}
      <button className="adm-hamburger" onClick={()=>setSidebarOpen(o=>!o)}>
        {sidebarOpen ? '✕' : '☰'}
      </button>
      {/* OVERLAY */}
      <div className={`adm-mob-overlay${sidebarOpen?' open':''}`} onClick={()=>setSidebarOpen(false)}/>

      <div className="adm-layout">
        {/* SIDEBAR */}
        <div className={`adm-sidebar${sidebarOpen?' open':''}`}>
          <div className="adm-logo">
            <div className="adm-logo-text">✦ Kosmica</div>
            <div className="adm-logo-sub">Admin Panel</div>
          </div>
          <div className="adm-nav">
            {NAV.map(n => (
              <div key={n.id} className={`adm-nav-item${section===n.id?' active':''}`}
                onClick={() => { setSection(n.id); setEditing(null); setSidebarOpen(false); }}>
                <span className="adm-nav-icon">{n.icon}</span>
                {n.label}
              </div>
            ))}
          </div>
          <div className="adm-nav-logout">
            <button className="adm-logout-btn" onClick={onExit}>
              ← Volver a la tienda
            </button>
            <button className="adm-logout-btn" onClick={() => setAuthed(false)} style={{marginTop:4}}>
              🔒 Cerrar sesión
            </button>
          </div>
        </div>

        {/* CONTENT */}
        <div className="adm-content">

          {/* ─── DASHBOARD ─── */}
          {section === 'dashboard' && (
            <>
              <h1 className="adm-page-title">Dashboard</h1>
              <p className="adm-page-sub">Resumen general de tu tienda</p>
              <div className="adm-stats">
                {[
                  { icon:'🛍️', n:products.length, label:'Productos activos', color:'#9B72CF' },
                  { icon:'📦', n:orders.length,   label:'Pedidos totales',   color:'#72B7CF' },
                  { icon:'💰', n:`$${totalRevenue.toFixed(0)}`, label:'Ingresos totales', color:'#72CF9B' },
                  { icon:'❤️', n:orders.filter(o=>o.status==='DELIVERED').length, label:'Entregados', color:'#CF7299' },
                ].map((s,i) => (
                  <div key={i} className="adm-stat-card" style={{'--color':s.color}}>
                    <div className="adm-stat-icon">{s.icon}</div>
                    <div className="adm-stat-n">{s.n}</div>
                    <div className="adm-stat-label">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="adm-card">
                <div className="adm-card-header">
                  <span className="adm-card-title">Últimos 5 pedidos</span>
                </div>
                <div className="adm-table-scroll"><table className="adm-table">
                  <thead><tr>
                    <th>Pedido</th><th>Cliente</th><th>Total</th><th>Estado</th>
                  </tr></thead>
                  <tbody>
                    {orders.slice(0,5).map(o => (
                      <tr key={o.id}>
                        <td style={{fontWeight:700,color:'#7B5EA7'}}>{o.orderNumber}</td>
                        <td>{o.customerName}</td>
                        <td style={{fontWeight:700}}>${Number(o.total||0).toFixed(2)}</td>
                        <td><span className={`adm-status-badge ${o.status}`}>{o.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ─── PRODUCTOS ─── */}
          {section === 'products' && !editing && (
            <>
              <h1 className="adm-page-title">Productos</h1>
              <p className="adm-page-sub">Gestiona tu catálogo completo</p>
              <div className="adm-card">
                <div className="adm-card-header">
                  <span className="adm-card-title">{products.length} productos</span>
                  <button className="adm-new-btn" onClick={openNew}>+ Publicar nuevo producto</button>
                </div>
                {loading ? <div className="adm-loading">⏳ Cargando...</div> :
                  products.length === 0 ? <div className="adm-empty"><div className="adm-empty-icon">📭</div><p>Sin productos</p></div> :
                  <div className="adm-table-scroll"><table className="adm-table">
                    <thead><tr>
                      <th>Imagen</th><th>Nombre</th><th>Categoría</th><th>Precio</th><th>Stock</th><th>Badge</th><th>Acciones</th>
                    </tr></thead>
                    <tbody>
                      {products.map(p => (
                        <tr key={p.id}>
                          <td><img className="adm-prod-img" src={p.imageUrl||'https://via.placeholder.com/50'} alt="" /></td>
                          <td style={{fontWeight:600,maxWidth:180}}>{p.name}</td>
                          <td><span className="adm-cat-pill">{p.category}</span></td>
                          <td style={{fontWeight:700,color:'#7B5EA7'}}>${Number(p.price||0).toFixed(2)}</td>
                          <td>{p.stock}</td>
                          <td>{p.badge && <span className={`adm-badge ${p.badge}`}>{p.badge}</span>}</td>
                          <td>
                            <button className="adm-action-btn adm-edit-btn" onClick={()=>openEdit(p)}>✏️ Editar</button>
                            <button className="adm-action-btn adm-del-btn" onClick={()=>deleteProduct(p.id,p.name)}>🗑️</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                }
              </div>
            </>
          )}

          {/* ─── FORMULARIO PRODUCTO ─── */}
          {section === 'products' && editing && (
            <>
              <h1 className="adm-page-title">{editing==='new' ? '✦ Publicar Nuevo Producto' : '✏️ Editar Producto'}</h1>
              <p className="adm-page-sub">{editing==='new' ? 'Completa el formulario para publicar en la tienda' : `Editando: ${editing.name}`}</p>

              <div className="adm-card" style={{padding:'28px'}}>
                <div className="adm-form-grid">
                  <div className="adm-form-group full">
                    <label className="adm-label">Nombre del producto *</label>
                    <input className="adm-input" value={form.name} onChange={e=>fSet('name',e.target.value)} placeholder="Ej: Bolso Chanel Premium" />
                  </div>
                  <div className="adm-form-group full">
                    <label className="adm-label">Descripción</label>
                    <textarea className="adm-textarea" value={form.description} onChange={e=>fSet('description',e.target.value)} placeholder="Describe el producto..." />
                  </div>
                  <div className="adm-form-group">
                    <label className="adm-label">Precio * ($)</label>
                    <input className="adm-input" type="number" step="0.01" value={form.price} onChange={e=>fSet('price',e.target.value)} placeholder="89.99" />
                  </div>
                  <div className="adm-form-group">
                    <label className="adm-label">Precio original ($) — para mostrar descuento</label>
                    <input className="adm-input" type="number" step="0.01" value={form.originalPrice} onChange={e=>fSet('originalPrice',e.target.value)} placeholder="129.99" />
                  </div>
                  <div className="adm-form-group">
                    <label className="adm-label">Categoría *</label>
                    <select className="adm-select" value={form.category} onChange={e=>fSet('category',e.target.value)}>
                      {CATEGORIES.map(c=><option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="adm-form-group">
                    <label className="adm-label">Badge (etiqueta)</label>
                    <select className="adm-select" value={form.badge} onChange={e=>fSet('badge',e.target.value)}>
                      {BADGES.map(b=><option key={b} value={b}>{b||'Sin badge'}</option>)}
                    </select>
                  </div>
                  <div className="adm-form-group">
                    <label className="adm-label">Stock (unidades)</label>
                    <input className="adm-input" type="number" value={form.stock} onChange={e=>fSet('stock',e.target.value)} placeholder="50" />
                  </div>

                  {/* IMAGEN PRINCIPAL */}
                  <div className="adm-form-group full">
                    <label className="adm-label">📸 Imagen principal</label>
                    <input ref={imgInput} type="file" accept="image/*" style={{display:'none'}} onChange={e=>uploadMainImage(e.target.files[0])} />
                    <div className="adm-upload-zone" onClick={()=>imgInput.current.click()}>
                      {form.imageUrl
                        ? <img src={form.imageUrl} alt="" style={{height:120,objectFit:'contain',borderRadius:10,margin:'0 auto'}} />
                        : <>
                            <div className="adm-upload-icon">🖼️</div>
                            <div className="adm-upload-text">Haz clic para subir imagen principal</div>
                            <div className="adm-upload-sub">JPG, PNG, WebP · Máximo 10 MB</div>
                          </>
                      }
                      {imgProgress > 0 && imgProgress < 100 && (
                        <div className="adm-progress"><div className="adm-progress-bar" style={{width:`${imgProgress}%`}} /></div>
                      )}
                    </div>
                    {form.imageUrl && (
                      <div style={{display:'flex',gap:8,marginTop:8}}>
                        <input className="adm-input" style={{flex:1}} value={form.imageUrl} onChange={e=>fSet('imageUrl',e.target.value)} placeholder="O pega una URL" />
                        <button className="adm-action-btn adm-del-btn" onClick={()=>fSet('imageUrl','')}>Quitar</button>
                      </div>
                    )}
                  </div>

                  {/* GALERÍA */}
                  <div className="adm-form-group full">
                    <label className="adm-label">🖼️ Galería de imágenes adicionales (tipo Amazon)</label>
                    <input ref={gallInput} type="file" accept="image/*" multiple style={{display:'none'}} onChange={e=>uploadGalleryImages(e.target.files)} />
                    <div className="adm-upload-zone" onClick={()=>gallInput.current.click()}>
                      <div className="adm-upload-icon">📷</div>
                      <div className="adm-upload-text">Subir múltiples imágenes para galería</div>
                      <div className="adm-upload-sub">Selecciona varias a la vez · El cliente las verá en el modal</div>
                    </div>
                    {galleryUrls.length > 0 && (
                      <div className="adm-preview-row">
                        {galleryUrls.map((url,i) => (
                          <div key={i} className="adm-preview-item">
                            <img src={url} alt="" />
                            <button className="adm-preview-del" onClick={()=>removeGalleryImg(url)}>×</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* VIDEO */}
                  <div className="adm-form-group full">
                    <label className="adm-label">🎥 Video del producto (aparece en galería)</label>
                    <input ref={vidInput} type="file" accept="video/*" style={{display:'none'}} onChange={e=>uploadVideo(e.target.files[0])} />
                    <div className="adm-upload-zone" onClick={()=>vidInput.current.click()}>
                      <div className="adm-upload-icon">🎬</div>
                      <div className="adm-upload-text">Subir video del producto</div>
                      <div className="adm-upload-sub">MP4, MOV, AVI · Máximo 100 MB</div>
                      {vidProgress > 0 && vidProgress < 100 && (
                        <div className="adm-progress"><div className="adm-progress-bar" style={{width:`${vidProgress}%`}} /></div>
                      )}
                    </div>
                    {videoName && (
                      <div className="adm-video-preview">
                        <span className="adm-video-icon">🎥</span>
                        <span className="adm-video-name">{videoName}</span>
                        <button className="adm-action-btn adm-del-btn" style={{marginLeft:'auto'}} onClick={()=>{fSet('videoUrl','');setVideoName('')}}>Quitar</button>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{display:'flex',marginTop:28}}>
                  <button className="adm-cancel" onClick={cancelEdit}>Cancelar</button>
                  <button className="adm-submit" onClick={saveProduct} disabled={saving}>
                    {saving ? '⏳ Guardando...' : (editing==='new' ? '🚀 Publicar Producto' : '💾 Guardar Cambios')}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ─── PEDIDOS ─── */}
          {section === 'orders' && (
            <>
              <h1 className="adm-page-title">Pedidos</h1>
              <p className="adm-page-sub">Gestiona y actualiza el estado de los pedidos</p>
              <div className="adm-card">
                <div className="adm-card-header">
                  <span className="adm-card-title">{orders.length} pedidos</span>
                  <input className="adm-search-box" placeholder="🔍 Buscar pedido, cliente..." value={orderSearch} onChange={e=>setOrderSearch(e.target.value)} />
                </div>
                {loading ? <div className="adm-loading">⏳ Cargando pedidos...</div> :
                filteredOrders.length === 0 ? <div className="adm-empty"><div className="adm-empty-icon">📭</div><p>Sin pedidos</p></div> :
                <div className="adm-table-scroll"><table className="adm-table">
                  <thead><tr><th>#Pedido</th><th>Cliente</th><th>Email</th><th>Total</th><th>Estado</th><th>Fecha</th><th>Cambiar estado</th></tr></thead>
                  <tbody>
                    {filteredOrders.map(o => (
                      <tr key={o.id}>
                        <td style={{fontWeight:700,color:'#7B5EA7'}}>{o.orderNumber}</td>
                        <td style={{fontWeight:600}}>{o.customerName}</td>
                        <td style={{fontSize:'.82rem',color:'#9B72CF'}}>{o.customerEmail}</td>
                        <td style={{fontWeight:700}}>${Number(o.total||0).toFixed(2)}</td>
                        <td><span className={`adm-status-badge ${o.status}`}>{o.status}</span></td>
                        <td style={{fontSize:'.78rem',color:'#aaa'}}>{o.createdAt ? new Date(o.createdAt).toLocaleDateString('es-CO') : '-'}</td>
                        <td>
                          <select className="adm-status-select" value={o.status} onChange={e=>updateOrderStatus(o.id,e.target.value)}>
                            {['PENDING','PAID','PROCESSING','SHIPPED','DELIVERED','CANCELLED'].map(s=><option key={s}>{s}</option>)}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>}
              </div>
            </>
          )}

          {/* ─── MEDIOS ─── */}
          {section === 'media' && (
            <>
              <h1 className="adm-page-title">Subir Medios</h1>
              <p className="adm-page-sub">Sube fotos y videos rápidamente para agregar a productos</p>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
                {[
                  {title:'📸 Subir Foto',sub:'JPG, PNG, WebP — máx 10 MB',accept:'image/*',ref:useRef(),upload:uploadMainImage},
                  {title:'🎬 Subir Video',sub:'MP4, MOV, AVI — máx 100 MB',accept:'video/*',ref:useRef(),upload:uploadVideo},
                ].map((m,i)=>(
                  <div key={i} className="adm-card" style={{padding:28}}>
                    <div className="adm-card-title" style={{marginBottom:16}}>{m.title}</div>
                    <input ref={m.ref} type="file" accept={m.accept} style={{display:'none'}} onChange={e=>m.upload(e.target.files[0])} />
                    <div className="adm-upload-zone" onClick={()=>m.ref.current.click()}>
                      <div className="adm-upload-icon">{i===0?'🖼️':'🎥'}</div>
                      <div className="adm-upload-text">Haz clic para seleccionar archivo</div>
                      <div className="adm-upload-sub">{m.sub}</div>
                    </div>
                    <p style={{marginTop:14,fontSize:'.8rem',color:'#B8A0D8'}}>
                      Después de subir, copia la URL y pégala al editar un producto en la sección Productos.
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}

        </div>
      </div>
      </div>
    </>
  );
}
