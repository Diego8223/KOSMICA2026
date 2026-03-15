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
  .adm-root{font-family:'DM Sans',sans-serif;background:#F8F4FF;min-height:100vh;color:#2D1B4E}
  .adm-login{min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#F5EEFF 0%,#E8D5FF 50%,#D4C5F0 100%)}
  .adm-login-box{background:#fff;border-radius:28px;padding:50px 44px;width:100%;max-width:400px;box-shadow:0 20px 60px rgba(120,80,180,.2);text-align:center}
  .adm-login-icon{font-size:3rem;margin-bottom:16px}
  .adm-login-title{font-family:'Playfair Display',serif;font-size:2rem;color:#2D1B4E;margin-bottom:8px}
  .adm-login-sub{color:#9B72CF;font-size:.87rem;margin-bottom:32px}
  .adm-login-input{width:100%;padding:13px 16px;border:2px solid #E8D5FF;border-radius:14px;font-size:.9rem;outline:none;transition:border .2s;font-family:'DM Sans',sans-serif;margin-bottom:12px}
  .adm-login-input:focus{border-color:#9B72CF}
  .adm-login-btn{width:100%;padding:14px;background:linear-gradient(135deg,#9B72CF,#7B5EA7);color:#fff;border:none;border-radius:14px;font-weight:700;font-size:1rem;cursor:pointer;box-shadow:0 8px 24px rgba(155,114,207,.4);transition:all .3s}
  .adm-login-btn:hover{transform:translateY(-2px);box-shadow:0 12px 32px rgba(155,114,207,.55)}
  .adm-login-error{color:#E74C3C;font-size:.8rem;margin-top:8px}

  .adm-sidebar{width:240px;background:linear-gradient(180deg,#2D1B4E 0%,#4A2D7A 100%);min-height:100vh;display:flex;flex-direction:column;position:fixed;left:0;top:0;z-index:100}
  .adm-logo{padding:28px 24px 20px;border-bottom:1px solid rgba(255,255,255,.1)}
  .adm-logo-text{font-family:'Playfair Display',serif;font-size:1.4rem;color:#fff;font-weight:700}
  .adm-logo-sub{font-size:.7rem;color:rgba(255,255,255,.4);margin-top:2px;letter-spacing:.1em;text-transform:uppercase}
  .adm-nav{padding:20px 12px;flex:1}
  .adm-nav-item{display:flex;align-items:center;gap:12px;padding:11px 14px;border-radius:14px;cursor:pointer;transition:all .2s;color:rgba(255,255,255,.6);font-size:.88rem;font-weight:500;margin-bottom:4px}
  .adm-nav-item:hover{background:rgba(255,255,255,.08);color:#fff}
  .adm-nav-item.active{background:linear-gradient(135deg,rgba(155,114,207,.4),rgba(123,94,167,.3));color:#fff;box-shadow:0 4px 14px rgba(0,0,0,.2)}
  .adm-nav-icon{font-size:1.1rem;width:22px;text-align:center}
  .adm-nav-logout{padding:16px 12px;border-top:1px solid rgba(255,255,255,.1)}
  .adm-logout-btn{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:12px;cursor:pointer;color:rgba(255,255,255,.5);font-size:.85rem;transition:all .2s;border:none;background:none;width:100%;font-family:'DM Sans',sans-serif}
  .adm-logout-btn:hover{color:#FF8A80;background:rgba(255,255,255,.05)}

  .adm-content{margin-left:240px;padding:32px 36px;min-height:100vh}
  .adm-page-title{font-family:'Playfair Display',serif;font-size:2rem;font-weight:700;color:#2D1B4E;margin-bottom:6px}
  .adm-page-sub{color:#9B72CF;font-size:.87rem;margin-bottom:28px}

  /* Stats cards */
  .adm-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;margin-bottom:32px}
  @media(max-width:1000px){.adm-stats{grid-template-columns:repeat(2,1fr)}}
  .adm-stat-card{background:#fff;border-radius:20px;padding:22px;box-shadow:0 4px 20px rgba(120,80,180,.08);border-left:4px solid var(--color)}
  .adm-stat-icon{font-size:1.8rem;margin-bottom:10px}
  .adm-stat-n{font-family:'Playfair Display',serif;font-size:2rem;font-weight:700;color:#2D1B4E}
  .adm-stat-label{font-size:.78rem;color:#9B72CF;margin-top:4px;font-weight:500}

  /* Tabla productos */
  .adm-card{background:#fff;border-radius:20px;box-shadow:0 4px 20px rgba(120,80,180,.08);overflow:hidden}
  .adm-card-header{padding:20px 24px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #F0E8FF}
  .adm-card-title{font-weight:700;font-size:1.05rem;color:#2D1B4E}
  .adm-new-btn{padding:10px 20px;background:linear-gradient(135deg,#9B72CF,#7B5EA7);color:#fff;border:none;border-radius:12px;font-weight:700;font-size:.85rem;cursor:pointer;display:flex;align-items:center;gap:8px;transition:all .3s;box-shadow:0 4px 14px rgba(155,114,207,.35)}
  .adm-new-btn:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(155,114,207,.5)}
  .adm-table{width:100%;border-collapse:collapse}
  .adm-table th{padding:12px 16px;text-align:left;font-size:.72rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#9B72CF;border-bottom:1px solid #F0E8FF;background:#FAF7FF}
  .adm-table td{padding:14px 16px;border-bottom:1px solid #F8F4FF;vertical-align:middle}
  .adm-table tr:hover td{background:#FAF7FF}
  .adm-prod-img{width:50px;height:50px;border-radius:10px;object-fit:cover}
  .adm-badge{padding:3px 10px;border-radius:30px;font-size:.65rem;font-weight:800;text-transform:uppercase}
  .adm-badge.VIRAL{background:#F0E8FF;color:#7B5EA7}
  .adm-badge.HOT{background:#FFE8EA;color:#C0392B}
  .adm-badge.BESTSELLER{background:#FFF3E0;color:#E67E22}
  .adm-badge.NUEVO{background:#E8F5E9;color:#27AE60}
  .adm-cat-pill{background:#F0E8FF;color:#7B5EA7;padding:3px 10px;border-radius:30px;font-size:.72rem;font-weight:600}
  .adm-action-btn{padding:6px 14px;border-radius:10px;font-size:.75rem;font-weight:700;cursor:pointer;transition:all .2s;border:none}
  .adm-edit-btn{background:#F0E8FF;color:#7B5EA7}
  .adm-edit-btn:hover{background:#E0D0FF;color:#5B3A8A}
  .adm-del-btn{background:#FFF0F0;color:#E74C3C;margin-left:6px}
  .adm-del-btn:hover{background:#FFD0D0}

  /* Formulario producto */
  .adm-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
  @media(max-width:700px){.adm-form-grid{grid-template-columns:1fr}}
  .adm-form-group{display:flex;flex-direction:column;gap:6px}
  .adm-form-group.full{grid-column:1/-1}
  .adm-label{font-size:.78rem;font-weight:700;color:#6B5B8A;letter-spacing:.06em}
  .adm-input{padding:11px 14px;border:2px solid #E8D5FF;border-radius:12px;font-size:.9rem;outline:none;transition:border .2s;font-family:'DM Sans',sans-serif;color:#2D1B4E}
  .adm-input:focus{border-color:#9B72CF}
  .adm-select{padding:11px 14px;border:2px solid #E8D5FF;border-radius:12px;font-size:.9rem;outline:none;cursor:pointer;font-family:'DM Sans',sans-serif;color:#2D1B4E;background:#fff}
  .adm-textarea{padding:11px 14px;border:2px solid #E8D5FF;border-radius:12px;font-size:.9rem;outline:none;resize:vertical;min-height:80px;font-family:'DM Sans',sans-serif;color:#2D1B4E;transition:border .2s}
  .adm-textarea:focus{border-color:#9B72CF}

  /* Upload zone */
  .adm-upload-zone{border:2.5px dashed #C9B8E8;border-radius:16px;padding:28px;text-align:center;cursor:pointer;transition:all .3s;background:#FAF7FF}
  .adm-upload-zone:hover,.adm-upload-zone.drag{border-color:#9B72CF;background:#F0E8FF}
  .adm-upload-icon{font-size:2.5rem;margin-bottom:8px}
  .adm-upload-text{font-size:.87rem;color:#7B5EA7;font-weight:600}
  .adm-upload-sub{font-size:.75rem;color:#B8A0D8;margin-top:4px}
  .adm-progress{height:6px;background:#E8D5FF;border-radius:3px;overflow:hidden;margin-top:10px}
  .adm-progress-bar{height:100%;background:linear-gradient(90deg,#9B72CF,#C9B8E8);transition:width .3s;border-radius:3px}
  .adm-preview-row{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
  .adm-preview-item{position:relative;width:70px;height:70px;border-radius:10px;overflow:hidden;border:2px solid #E8D5FF}
  .adm-preview-item img{width:100%;height:100%;object-fit:cover}
  .adm-preview-del{position:absolute;top:2px;right:2px;background:rgba(0,0,0,.6);color:#fff;border:none;border-radius:50%;width:18px;height:18px;font-size:.6rem;cursor:pointer;display:flex;align-items:center;justify-content:center}
  .adm-video-preview{display:flex;align-items:center;gap:10px;background:#2D1B4E;border-radius:12px;padding:10px 14px;margin-top:8px}
  .adm-video-icon{font-size:1.5rem}
  .adm-video-name{color:#fff;font-size:.8rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px}

  /* Submit button */
  .adm-submit{padding:14px 36px;background:linear-gradient(135deg,#9B72CF,#7B5EA7);color:#fff;border:none;border-radius:14px;font-weight:700;font-size:1rem;cursor:pointer;box-shadow:0 8px 24px rgba(155,114,207,.4);transition:all .3s;display:flex;align-items:center;gap:10px}
  .adm-submit:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 12px 32px rgba(155,114,207,.55)}
  .adm-submit:disabled{opacity:.7;cursor:wait}
  .adm-cancel{padding:14px 28px;background:rgba(155,114,207,.1);color:#7B5EA7;border:2px solid rgba(155,114,207,.3);border-radius:14px;font-weight:700;font-size:.95rem;cursor:pointer;transition:all .2s;margin-right:10px}
  .adm-cancel:hover{background:rgba(155,114,207,.18)}

  /* Toast */
  .adm-toast{position:fixed;bottom:28px;right:28px;z-index:9999;padding:14px 22px;border-radius:14px;font-weight:600;font-size:.87rem;box-shadow:0 8px 32px rgba(0,0,0,.2);animation:toastIn .4s ease}
  @keyframes toastIn{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
  .adm-toast.success{background:linear-gradient(135deg,#9B72CF,#7B5EA7);color:#fff}
  .adm-toast.error{background:linear-gradient(135deg,#E74C3C,#C0392B);color:#fff}

  /* Pedidos */
  .adm-status-badge{padding:4px 12px;border-radius:30px;font-size:.7rem;font-weight:700}
  .adm-status-badge.PENDING{background:#FFF8E1;color:#F57F17}
  .adm-status-badge.PAID{background:#E8F5E9;color:#2E7D32}
  .adm-status-badge.PROCESSING{background:#E3F2FD;color:#1565C0}
  .adm-status-badge.SHIPPED{background:#F3E5F5;color:#7B1FA2}
  .adm-status-badge.DELIVERED{background:#E8F5E9;color:#1B5E20}
  .adm-status-badge.CANCELLED{background:#FFEBEE;color:#C62828}
  .adm-status-select{padding:4px 8px;border:1px solid #E8D5FF;border-radius:8px;font-size:.75rem;cursor:pointer;background:#fff;color:#2D1B4E}
  .adm-search-box{padding:10px 16px;border:2px solid #E8D5FF;border-radius:12px;font-size:.87rem;outline:none;width:260px;transition:border .2s;font-family:'DM Sans',sans-serif}
  .adm-search-box:focus{border-color:#9B72CF}
  .adm-empty{padding:50px;text-align:center;color:#B8A0D8}
  .adm-empty-icon{font-size:3rem;margin-bottom:12px}
  .adm-loading{display:flex;align-items:center;justify-content:center;padding:60px;color:#9B72CF;gap:12px;font-size:.9rem}

  /* ── RESPONSIVO ADMIN ── */
  @media(max-width:860px){
    .adm-sidebar{width:200px}
    .adm-content{margin-left:200px;padding:24px 20px}
    .adm-stats{grid-template-columns:repeat(2,1fr);gap:14px}
    .adm-form-grid{grid-template-columns:1fr}
    .adm-form-group.full{grid-column:1}
    .adm-search-box{width:180px}
    .adm-table th:nth-child(3),.adm-table td:nth-child(3){display:none}
  }
  @media(max-width:600px){
    .adm-sidebar{position:fixed;bottom:0;top:auto;width:100%;height:60px;flex-direction:row;z-index:200}
    .adm-logo{display:none}
    .adm-nav{padding:0;display:flex;flex-direction:row;align-items:center;justify-content:space-around;flex:1}
    .adm-nav-item{flex-direction:column;gap:2px;padding:8px 10px;font-size:.6rem;border-radius:10px}
    .adm-nav-item .adm-nav-icon{font-size:.95rem;width:auto}
    .adm-nav-logout{display:none}
    .adm-content{margin-left:0;margin-bottom:60px;padding:16px 14px}
    .adm-page-title{font-size:1.5rem}
    .adm-stats{grid-template-columns:repeat(2,1fr);gap:10px}
    .adm-stat-card{padding:16px 14px}
    .adm-stat-n{font-size:1.5rem}
    .adm-card-header{flex-direction:column;align-items:flex-start;gap:10px}
    .adm-search-box{width:100%}
    .adm-table{font-size:.78rem}
    .adm-table th,.adm-table td{padding:10px 10px}
    .adm-table th:nth-child(4),.adm-table td:nth-child(4),
    .adm-table th:nth-child(6),.adm-table td:nth-child(6){display:none}
    .adm-login-box{padding:36px 24px;margin:16px}
    .adm-login-title{font-size:1.6rem}
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

      <div style={{ display:'flex' }}>
        {/* SIDEBAR */}
        <div className="adm-sidebar">
          <div className="adm-logo">
            <div className="adm-logo-text">✦ Kosmica</div>
            <div className="adm-logo-sub">Admin Panel</div>
          </div>
          <div className="adm-nav">
            {NAV.map(n => (
              <div key={n.id} className={`adm-nav-item${section===n.id?' active':''}`}
                onClick={() => { setSection(n.id); setEditing(null); }}>
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
                <table className="adm-table">
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
                  <table className="adm-table">
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
                <table className="adm-table">
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
    </>
  );
}
