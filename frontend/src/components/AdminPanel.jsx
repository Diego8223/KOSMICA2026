// ============================================================
//  src/components/AdminPanel.jsx — Kosmica Admin v4
//  ✅ Mobile-first  ✅ Hamburger menu  ✅ Media fix (no useRef en map)
// ============================================================
import { useState, useEffect, useRef } from 'react';
import { productAPI, orderAPI } from '../services/api';

const ADMIN_PASSWORD = process.env.REACT_APP_ADMIN_PASSWORD || 'Kosmica2025';
// Envia.com via backend proxy — v3 (auth y fan-out manejados en el backend)
const CATEGORIES = ['BOLSOS','BILLETERAS','MAQUILLAJE','CAPILAR','CUIDADO_PERSONAL','ACCESORIOS'];
const BADGES     = ['','VIRAL','HOT','BESTSELLER','NUEVO'];
const EMPTY_PROD = {
  name:'', description:'', price:'', originalPrice:'',
  category:'BOLSOS', badge:'', stock:'', imageUrl:'', videoUrl:'', gallery:'[]'
};

const CSS = `
  *, *::before, *::after { box-sizing: border-box; margin:0; padding:0; }

  .adm { font-family:'DM Sans',sans-serif; background:#F8F4FF; min-height:100vh; color:#2D1B4E; }

  /* ══ LOGIN ══ */
  .adm-login {
    min-height:100vh; display:flex; align-items:center; justify-content:center;
    background:linear-gradient(135deg,#F0E8FF 0%,#E0D0FF 50%,#D4C5F0 100%); padding:20px;
  }
  .adm-login-box {
    background:#fff; border-radius:24px; padding:44px 36px;
    width:100%; max-width:380px; box-shadow:0 20px 60px rgba(120,80,180,.22); text-align:center;
  }
  .adm-login-icon { font-size:3.5rem; margin-bottom:16px; }
  .adm-login-title { font-family:'Playfair Display',serif; font-size:2rem; color:#2D1B4E; margin-bottom:8px; font-weight:700; }
  .adm-login-sub { color:#9B72CF; font-size:.95rem; margin-bottom:32px; }
  .adm-login-input {
    width:100%; padding:15px 16px; border:2px solid #E8D5FF; border-radius:14px;
    font-size:1rem; outline:none; transition:border .2s; font-family:'DM Sans',sans-serif; margin-bottom:14px;
  }
  .adm-login-input:focus { border-color:#9B72CF; }
  .adm-login-btn {
    width:100%; padding:15px; background:linear-gradient(135deg,#9B72CF,#7B5EA7);
    color:#fff; border:none; border-radius:14px; font-weight:700; font-size:1.05rem;
    cursor:pointer; box-shadow:0 8px 24px rgba(155,114,207,.4); transition:all .3s;
  }
  .adm-login-btn:hover { transform:translateY(-2px); }
  .adm-login-err { color:#E74C3C; font-size:.88rem; margin-top:10px; }

  /* ══ TOAST ══ */
  .adm-toast {
    position:fixed; top:18px; right:16px; z-index:9999;
    padding:13px 20px; border-radius:14px; font-weight:600; font-size:.9rem;
    box-shadow:0 8px 28px rgba(0,0,0,.18); max-width:320px; animation:toastIn .3s ease;
  }
  .adm-toast.success { background:#2D1B4E; color:#A8DEC4; }
  .adm-toast.error   { background:#FFF0F0; color:#C0392B; border:1px solid #FFD0D0; }
  @keyframes toastIn { from{transform:translateX(120%);opacity:0} to{transform:translateX(0);opacity:1} }

  /* ══ HAMBURGER ══ */
  .adm-hbg {
    display:none; position:fixed; top:14px; left:14px; z-index:600;
    background:linear-gradient(135deg,#9B72CF,#7B5EA7); border:none;
    border-radius:13px; width:48px; height:48px;
    align-items:center; justify-content:center;
    font-size:1.4rem; cursor:pointer;
    box-shadow:0 4px 18px rgba(120,80,180,.5); color:#fff;
  }

  /* ══ OVERLAY ══ */
  .adm-overlay {
    display:none; position:fixed; inset:0;
    background:rgba(0,0,0,.55); z-index:399; backdrop-filter:blur(4px);
  }
  .adm-overlay.show { display:block; }

  /* ══ LAYOUT ══ */
  .adm-layout { display:flex; min-height:100vh; }

  /* ══ SIDEBAR ══ */
  .adm-sidebar {
    width:250px; flex-shrink:0;
    background:linear-gradient(180deg,#2D1B4E 0%,#4A2D7A 100%);
    display:flex; flex-direction:column;
    position:sticky; top:0; height:100vh; overflow-y:auto;
  }
  .adm-logo { padding:28px 22px 18px; border-bottom:1px solid rgba(255,255,255,.1); }
  .adm-logo-name { font-family:'Playfair Display',serif; font-size:1.4rem; color:#fff; font-weight:700; }
  .adm-logo-sub { font-size:.75rem; color:rgba(255,255,255,.38); margin-top:3px; letter-spacing:.1em; text-transform:uppercase; }
  .adm-nav { padding:20px 10px; flex:1; }
  .adm-nav-btn {
    display:flex; align-items:center; gap:13px; padding:14px 16px;
    border-radius:14px; cursor:pointer; transition:all .2s;
    color:rgba(255,255,255,.58); font-size:.97rem; font-weight:500;
    margin-bottom:5px; min-height:52px; border:none; background:none;
    width:100%; text-align:left; font-family:'DM Sans',sans-serif;
  }
  .adm-nav-btn:hover { background:rgba(255,255,255,.09); color:#fff; }
  .adm-nav-btn.on { background:linear-gradient(135deg,rgba(155,114,207,.42),rgba(123,94,167,.3)); color:#fff; box-shadow:0 4px 14px rgba(0,0,0,.2); }
  .adm-nav-ico { font-size:1.25rem; width:26px; text-align:center; flex-shrink:0; }
  .adm-nav-foot { padding:14px 10px; border-top:1px solid rgba(255,255,255,.1); }
  .adm-nav-foot-btn {
    display:flex; align-items:center; gap:10px; padding:13px 16px;
    border-radius:12px; cursor:pointer; color:rgba(255,255,255,.45);
    font-size:.92rem; transition:all .2s; border:none; background:none;
    width:100%; font-family:'DM Sans',sans-serif; min-height:48px;
  }
  .adm-nav-foot-btn:hover { color:#FF8A80; background:rgba(255,255,255,.06); }

  /* ══ CONTENT ══ */
  .adm-main { flex:1; padding:36px 40px; min-height:100vh; overflow-x:hidden; }
  .adm-h1 { font-family:'Playfair Display',serif; font-size:2rem; font-weight:700; color:#2D1B4E; margin-bottom:6px; }
  .adm-sub { color:#9B72CF; font-size:.93rem; margin-bottom:28px; }

  /* ══ STATS ══ */
  .adm-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:18px; margin-bottom:30px; }
  .adm-stat {
    background:#fff; border-radius:20px; padding:22px 20px;
    box-shadow:0 4px 20px rgba(120,80,180,.07); border-left:4px solid var(--c);
  }
  .adm-stat-ico { font-size:1.9rem; margin-bottom:10px; }
  .adm-stat-n { font-family:'Playfair Display',serif; font-size:2rem; font-weight:700; color:#2D1B4E; }
  .adm-stat-lbl { font-size:.83rem; color:#9B72CF; margin-top:4px; font-weight:500; }

  /* ══ CARD ══ */
  .adm-card { background:#fff; border-radius:20px; box-shadow:0 4px 20px rgba(120,80,180,.07); overflow:hidden; margin-bottom:24px; }
  .adm-card-top {
    padding:20px 24px; display:flex; justify-content:space-between;
    align-items:center; border-bottom:1px solid #F0E8FF; flex-wrap:wrap; gap:10px;
  }
  .adm-card-title { font-weight:700; font-size:1.05rem; color:#2D1B4E; }
  .adm-btn-primary {
    padding:11px 22px; background:linear-gradient(135deg,#9B72CF,#7B5EA7);
    color:#fff; border:none; border-radius:12px; font-weight:700; font-size:.9rem;
    cursor:pointer; display:flex; align-items:center; gap:8px;
    transition:all .3s; box-shadow:0 4px 14px rgba(155,114,207,.35); white-space:nowrap;
  }
  .adm-btn-primary:hover { transform:translateY(-1px); box-shadow:0 6px 20px rgba(155,114,207,.5); }

  /* ══ TABLE ══ */
  .adm-tbl-wrap { overflow-x:auto; -webkit-overflow-scrolling:touch; }
  .adm-tbl { width:100%; border-collapse:collapse; min-width:560px; }
  .adm-tbl th {
    padding:12px 16px; text-align:left; font-size:.78rem; font-weight:700;
    letter-spacing:.1em; text-transform:uppercase; color:#9B72CF;
    border-bottom:1px solid #F0E8FF; background:#FAF7FF; white-space:nowrap;
  }
  .adm-tbl td { padding:13px 16px; border-bottom:1px solid #F8F4FF; vertical-align:middle; font-size:.9rem; }
  .adm-tbl tr:last-child td { border-bottom:none; }
  .adm-tbl tr:hover td { background:#FAF7FF; }
  .adm-prod-img { width:48px; height:48px; border-radius:10px; object-fit:cover; flex-shrink:0; }

  /* ══ BADGES / STATUS ══ */
  .adm-badge { padding:3px 10px; border-radius:30px; font-size:.73rem; font-weight:800; text-transform:uppercase; display:inline-block; }
  .adm-badge.VIRAL     { background:#F0E8FF; color:#7B5EA7; }
  .adm-badge.HOT       { background:#FFE8EA; color:#C0392B; }
  .adm-badge.BESTSELLER{ background:#FFF3E0; color:#E67E22; }
  .adm-badge.NUEVO     { background:#E8F5E9; color:#27AE60; }
  .adm-cat  { background:#F0E8FF; color:#7B5EA7; padding:3px 10px; border-radius:30px; font-size:.78rem; font-weight:600; display:inline-block; }
  .adm-status { padding:4px 12px; border-radius:30px; font-size:.78rem; font-weight:700; display:inline-block; }
  .adm-status.PENDING    { background:#FFF9E0; color:#B8860B; }
  .adm-status.PAID       { background:#E8F5E9; color:#27AE60; }
  .adm-status.PROCESSING { background:#E8F0FF; color:#3B5BDB; }
  .adm-status.SHIPPED    { background:#E0F7FA; color:#00838F; }
  .adm-status.DELIVERED  { background:#E8F5E9; color:#2E7D32; }
  .adm-status.CANCELLED  { background:#FFF0F0; color:#E74C3C; }

  /* ══ ACTION BUTTONS ══ */
  .adm-btn-sm { padding:7px 14px; border-radius:10px; font-size:.82rem; font-weight:700; cursor:pointer; transition:all .2s; border:none; }
  .adm-btn-edit { background:#F0E8FF; color:#7B5EA7; }
  .adm-btn-edit:hover { background:#E0D0FF; }
  .adm-btn-del  { background:#FFF0F0; color:#E74C3C; margin-left:6px; }
  .adm-btn-del:hover  { background:#FFD0D0; }

  /* ══ FORM ══ */
  .adm-form { padding:28px; }
  .adm-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
  .adm-form-group { display:flex; flex-direction:column; gap:6px; }
  .adm-form-group.full { grid-column:1/-1; }
  .adm-label { font-size:.83rem; font-weight:700; color:#6B5B8A; letter-spacing:.03em; }
  .adm-input {
    padding:13px 15px; border:2px solid #E8D5FF; border-radius:12px;
    font-size:.97rem; outline:none; transition:border .2s; font-family:'DM Sans',sans-serif; color:#2D1B4E;
  }
  .adm-input:focus { border-color:#9B72CF; }
  .adm-select {
    padding:13px 15px; border:2px solid #E8D5FF; border-radius:12px;
    font-size:.97rem; outline:none; cursor:pointer; font-family:'DM Sans',sans-serif;
    color:#2D1B4E; background:#fff;
  }
  .adm-textarea {
    padding:13px 15px; border:2px solid #E8D5FF; border-radius:12px;
    font-size:.97rem; outline:none; resize:vertical; min-height:90px;
    font-family:'DM Sans',sans-serif; color:#2D1B4E; transition:border .2s;
  }
  .adm-textarea:focus { border-color:#9B72CF; }

  /* ══ SEARCH ══ */
  .adm-search {
    padding:10px 14px; border:2px solid #E8D5FF; border-radius:12px;
    font-size:.92rem; outline:none; font-family:'DM Sans',sans-serif;
    color:#2D1B4E; width:220px; transition:border .2s;
  }
  .adm-search:focus { border-color:#9B72CF; }

  /* ══ UPLOAD ══ */
  .adm-upload-zone {
    border:2.5px dashed #C9B8E8; border-radius:16px; padding:28px 20px;
    text-align:center; cursor:pointer; transition:all .3s; background:#FAF7FF;
  }
  .adm-upload-zone:hover,.adm-upload-zone.drag { border-color:#9B72CF; background:#F0E8FF; }
  .adm-upload-ico { font-size:2.8rem; margin-bottom:10px; }
  .adm-upload-txt { font-size:.95rem; color:#7B5EA7; font-weight:600; }
  .adm-upload-sub { font-size:.8rem; color:#B8A0D8; margin-top:5px; }
  .adm-progress { height:6px; background:#E8D5FF; border-radius:3px; overflow:hidden; margin-top:12px; }
  .adm-progress-bar { height:100%; background:linear-gradient(90deg,#9B72CF,#C9B8E8); transition:width .3s; border-radius:3px; }
  .adm-preview-row { display:flex; flex-wrap:wrap; gap:9px; margin-top:14px; }
  .adm-preview-item { position:relative; width:72px; height:72px; border-radius:10px; overflow:hidden; border:2px solid #E8D5FF; }
  .adm-preview-item img { width:100%; height:100%; object-fit:cover; }
  .adm-preview-del {
    position:absolute; top:2px; right:2px; background:rgba(0,0,0,.65);
    color:#fff; border:none; border-radius:50%; width:20px; height:20px;
    font-size:.7rem; cursor:pointer; display:flex; align-items:center; justify-content:center;
  }
  .adm-video-bar {
    display:flex; align-items:center; gap:12px; background:#2D1B4E;
    border-radius:12px; padding:11px 15px; margin-top:10px;
  }
  .adm-video-ico { font-size:1.6rem; }
  .adm-video-name { color:#fff; font-size:.88rem; font-weight:600; flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .adm-url-row { display:flex; gap:8px; margin-top:10px; }

  /* ══ FORM ACTIONS ══ */
  .adm-form-actions { display:flex; gap:14px; margin-top:30px; flex-wrap:wrap; }
  .adm-btn-save {
    flex:1; min-width:140px; padding:15px; background:linear-gradient(135deg,#9B72CF,#7B5EA7);
    color:#fff; border:none; border-radius:14px; font-weight:700; font-size:1rem;
    cursor:pointer; box-shadow:0 6px 20px rgba(155,114,207,.4); transition:all .3s;
  }
  .adm-btn-save:hover:not(:disabled) { transform:translateY(-1px); }
  .adm-btn-save:disabled { opacity:.7; cursor:wait; }
  .adm-btn-cancel {
    padding:15px 28px; background:#F0E8FF; color:#7B5EA7;
    border:none; border-radius:14px; font-weight:700; font-size:1rem; cursor:pointer;
  }

  /* ══ STATUS SELECT ══ */
  .adm-sel-status {
    padding:7px 11px; border-radius:9px; border:1.5px solid #E8D5FF;
    font-size:.85rem; font-family:'DM Sans',sans-serif; color:#2D1B4E;
    background:#fff; cursor:pointer; outline:none;
  }

  /* ══ EMPTY / LOADING ══ */
  .adm-empty { text-align:center; padding:56px 20px; color:#B8A0D8; }
  .adm-empty-ico { font-size:3rem; margin-bottom:12px; }
  .adm-empty p { font-size:.95rem; }
  .adm-loading { text-align:center; padding:44px; color:#9B72CF; font-size:.95rem; }

  /* ══ MEDIA PAGE ══ */
  .adm-media-grid { display:grid; grid-template-columns:1fr 1fr; gap:22px; }
  .adm-media-card { padding:28px; }
  .adm-media-note { margin-top:14px; font-size:.83rem; color:#B8A0D8; line-height:1.65; }
  .adm-copied-url {
    background:#F0E8FF; border:1px solid #C9B8E8; border-radius:10px;
    padding:10px 14px; margin-top:12px; font-size:.82rem; color:#7B5EA7;
    word-break:break-all; display:flex; align-items:center; gap:10px;
  }
  .adm-copy-btn {
    flex-shrink:0; background:#9B72CF; color:#fff; border:none;
    border-radius:8px; padding:5px 12px; font-size:.78rem; cursor:pointer; font-weight:700;
  }

  /* ══════════════════════════════
     TABLET  ≥ 768px
  ══════════════════════════════ */
  @media(min-width:768px){
    .adm-stats{ grid-template-columns:repeat(2,1fr); }
    .adm-main{ padding:28px 28px; }
  }

  /* ══════════════════════════════
     DESKTOP  ≥ 1100px
  ══════════════════════════════ */
  @media(min-width:1100px){
    .adm-stats{ grid-template-columns:repeat(4,1fr); }
    .adm-main{ padding:36px 44px; }
  }

  /* ══════════════════════════════
     MÓVIL  < 768px
  ══════════════════════════════ */
  /* ══ ENVÍOS ══ */
  .adm-ship-modal {
    position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.55);
    display:flex;align-items:center;justify-content:center;padding:16px;
  }
  .adm-ship-box {
    background:#fff;border-radius:20px;width:100%;max-width:600px;
    max-height:90vh;overflow-y:auto;
    box-shadow:0 20px 60px rgba(0,0,0,.3);
  }
  .adm-ship-hdr {
    padding:20px 24px 16px;border-bottom:1px solid #F0E8FF;
    display:flex;justify-content:space-between;align-items:center;
    position:sticky;top:0;background:#fff;z-index:2;
  }
  .adm-ship-title {font-family:'Playfair Display',serif;font-size:1.15rem;font-weight:700;color:#2D1B4E;}
  .adm-ship-body {padding:20px 24px 28px;}
  .adm-rate-card {
    border:2px solid #F0E8FF;border-radius:14px;padding:14px 16px;
    margin-bottom:10px;display:flex;align-items:center;gap:14px;
    cursor:pointer;transition:all .2s;
  }
  .adm-rate-card:hover,.adm-rate-card.selected {border-color:#9B72CF;background:#FAF7FF;}
  .adm-rate-logo {width:60px;height:40px;object-fit:contain;border-radius:6px;background:#f5f5f5;padding:4px;}
  .adm-rate-info {flex:1;}
  .adm-rate-carrier {font-weight:700;color:#2D1B4E;font-size:.95rem;}
  .adm-rate-service {font-size:.82rem;color:#9B72CF;margin-top:2px;}
  .adm-rate-days {font-size:.78rem;color:#B8A0D8;margin-top:2px;}
  .adm-rate-price {font-family:'Playfair Display',serif;font-size:1.2rem;font-weight:700;color:#7B5EA7;white-space:nowrap;}
  .adm-btn-ship {
    width:100%;padding:14px;
    background:linear-gradient(135deg,#9B72CF,#7B5EA7);
    color:#fff;border:none;border-radius:12px;font-weight:700;font-size:.95rem;
    cursor:pointer;margin-top:16px;transition:all .3s;
  }
  .adm-btn-ship:disabled {opacity:.6;cursor:wait;}
  .adm-guide-box {
    background:#E8F5E9;border:1px solid #A5D6A7;border-radius:12px;
    padding:16px;margin-top:14px;text-align:center;
  }
  .adm-guide-num {font-size:1.3rem;font-weight:700;color:#2E7D32;letter-spacing:.05em;}

  @media(max-width:767px){
    .adm-hbg{ display:flex; }
    .adm-sidebar{
      position:fixed; left:0; top:0; height:100vh; z-index:500;
      transform:translateX(-100%); transition:transform .3s ease;
      width:250px;
    }
    .adm-sidebar.open{ transform:translateX(0); box-shadow:4px 0 30px rgba(0,0,0,.3); }
    .adm-layout{ display:block; }
    .adm-main{ padding:16px 14px; padding-top:76px; min-height:100vh; display:block; }
    .adm-h1{ font-size:1.5rem; }
    .adm-sub{ font-size:.88rem; margin-bottom:16px; }
    .adm-stats{ grid-template-columns:repeat(2,1fr); gap:12px; margin-bottom:18px; }
    .adm-stat{ padding:16px 14px; }
    .adm-stat-n{ font-size:1.6rem; }
    .adm-stat-lbl{ font-size:.78rem; }
    .adm-card-top{ padding:14px 16px; flex-wrap:wrap; }
    .adm-card-title{ font-size:.95rem; }
    .adm-btn-primary{ padding:9px 16px; font-size:.85rem; }
    .adm-form{ padding:18px 16px; }
    .adm-form-grid{ grid-template-columns:1fr; }
    .adm-form-group.full{ grid-column:auto; }
    .adm-form-actions{ flex-direction:column; }
    .adm-btn-save,.adm-btn-cancel{ width:100%; text-align:center; }
    .adm-media-grid{ grid-template-columns:1fr; }
    .adm-search{ width:100%; margin-top:8px; }
    .adm-login-box{ padding:32px 22px; }
    .adm-login-title{ font-size:1.75rem; }
    .adm-ship-box{ max-height:95vh; border-radius:16px; }
    .adm-rate-card{ flex-wrap:wrap; }
    .adm-tbl-wrap{ -webkit-overflow-scrolling:touch; }
  }
`;

export default function AdminPanel({ onExit }) {
  const [authed,  setAuthed]  = useState(false);
  const [pass,    setPass]    = useState('');
  const [loginErr,setLoginErr]= useState('');
  const [section, setSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);   // ← FIX: declarado
  const [products,setProducts]= useState([]);
  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form,    setForm]    = useState(EMPTY_PROD);
  const [toast,   setToast]   = useState(null);
  const [saving,  setSaving]  = useState(false);
  const [imgProg, setImgProg] = useState(0);
  const [vidProg, setVidProg] = useState(0);
  const [gallery, setGallery] = useState([]);
  const [vidName, setVidName] = useState('');
  const [orderSearch,    setOrderSearch]    = useState('');
  const [prodCatFilter,  setProdCatFilter]  = useState('');
  const [shipModal,      setShipModal]      = useState(null);
  const [shipRates,      setShipRates]      = useState([]);
  const [shipLoading,    setShipLoading]    = useState(false);
  const [shipSelected,   setShipSelected]   = useState(null);
  const [shipGuide,      setShipGuide]      = useState(null);
  const [shipGenerating, setShipGenerating] = useState(false);
  const [shipPkg,        setShipPkg]        = useState({weight:'0.5',length:'20',width:'15',height:'10'});
  // ── FIX: refs declarados fuera del map ──────────────────────
  const [uploadedImgUrl, setUploadedImgUrl] = useState('');
  const [uploadedVidUrl, setUploadedVidUrl] = useState('');
  const imgRef  = useRef();
  const vidRef  = useRef();
  const gallRef = useRef();
  const mediaImgRef = useRef();  // para sección Medios
  const mediaVidRef = useRef();  // para sección Medios

  const showToast = (msg, type='success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  const login = () => {
    if (pass === ADMIN_PASSWORD) { setAuthed(true); setLoginErr(''); }
    else setLoginErr('Contraseña incorrecta');
  };

  const loadProducts = async () => {
    setLoading(true);
    try { const d = await productAPI.getAll(); setProducts(Array.isArray(d) ? d : (d.content||[])); }
    catch(e) { showToast(e.message,'error'); }
    finally  { setLoading(false); }
  };

  const loadOrders = async () => {
    setLoading(true);
    try {
      const d = await orderAPI.getAll();
      console.log('ORDERS RAW:', JSON.stringify(d));
      const list = Array.isArray(d) ? d : (d.content || d.orders || d || []);
      console.log('ORDERS LIST:', list.length, list);
      setOrders(list);
    }
    catch(e) { showToast(e.message,'error'); }
    finally  { setLoading(false); }
  };

  useEffect(() => {
    if (!authed) return;
    if (section === 'products'  || section === 'dashboard') loadProducts();
    if (section === 'orders'    || section === 'dashboard') loadOrders();
  }, [authed, section]);

  const fSet    = (k,v) => setForm(p => ({...p,[k]:v}));

  // ── Envia.com — Cotizar envío ─────────────────────────────
  const getShipRates = async (order) => {
    setShipModal(order);
    setShipRates([]);
    setShipSelected(null);
    setShipGuide(null);
    setShipLoading(true);
    try {
      // ✅ Colombia usa Código DANE (no postal codes) para la API de Envia.com
      // city y postalCode deben ser el mismo Código DANE según documentación oficial
      const getCityState = (city) => {
        const c = (city||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
        if (c.includes('medell') || c.includes('bello') || c.includes('itagui') || c.includes('envigado') || c.includes('sabaneta')) return {state:'ANT',cp:'05001'};
        if (c.includes('bogot') || c.includes('soacha') || c.includes('chia') || c.includes('zipaquira')) return {state:'CUN',cp:'11001'};
        if (c.includes('cali') || c.includes('palmira') || c.includes('buenaventura')) return {state:'VAL',cp:'76001'};
        if (c.includes('barranquill') || c.includes('soledad') || c.includes('malambo')) return {state:'ATL',cp:'08001'};
        if (c.includes('cartagena') || c.includes('turbaco')) return {state:'BOL',cp:'13001'};
        if (c.includes('bucaramanga') || c.includes('floridablanca') || c.includes('giron')) return {state:'SAN',cp:'68001'};
        if (c.includes('pereira') || c.includes('dosquebradas')) return {state:'RIS',cp:'66001'};
        if (c.includes('manizales')) return {state:'CAL',cp:'17001'};
        if (c.includes('armenia')) return {state:'QUI',cp:'63001'};
        if (c.includes('cucuta')) return {state:'NSA',cp:'54001'};
        if (c.includes('ibague')) return {state:'TOL',cp:'73001'};
        if (c.includes('neiva')) return {state:'HUI',cp:'41001'};
        if (c.includes('villavicencio')) return {state:'MET',cp:'50001'};
        if (c.includes('pasto')) return {state:'NAR',cp:'52001'};
        if (c.includes('santa marta')) return {state:'MAG',cp:'47001'};
        if (c.includes('monteria')) return {state:'COR',cp:'23001'};
        if (c.includes('sincelejo')) return {state:'SUC',cp:'70001'};
        if (c.includes('valledupar')) return {state:'CES',cp:'20001'};
        if (c.includes('riohacha')) return {state:'LAG',cp:'44001'};
        if (c.includes('quibdo')) return {state:'CHO',cp:'27001'};
        if (c.includes('popayan')) return {state:'CAU',cp:'19001'};
        return {state:'CUN',cp:'11001'}; // Bogotá por defecto
      };
      const destInfo = getCityState(order.city);
      const destCity = (order.city||'Bogota').normalize('NFD').replace(/[\u0300-\u036f]/g,'');

      const body = {
        origin: {
          name: "Kosmica",
          company: "Kosmica",
          email: "hola@kosmica.com",
          phone: "3043927148",
          street: "Calle 10",
          number: "20",
          district: "El Centro",
          city: "05001",
          state: "ANT",
          country: "CO",
          postalCode: "05001"
        },
        destination: {
          name: order.customerName || "Cliente",
          company: "",
          email: order.customerEmail || "cliente@email.com",
          phone: (order.phone||"3000000000").replace(/\D/g,'').slice(-10),
          street: (order.shippingAddress||"Calle 1").normalize('NFD').replace(/[\u0300-\u036f]/g,''),
          number: "1",
          district: (order.neighborhood||"Centro").normalize('NFD').replace(/[\u0300-\u036f]/g,''),
          city: destInfo.cp,
          state: destInfo.state,
          country: "CO",
          postalCode: destInfo.cp
        },
        packages: [{
          content: "Productos Kosmica",
          amount: 1,
          type: "box",
          dimensions: {
            length: parseFloat(shipPkg.length) || 20,
            width:  parseFloat(shipPkg.width)  || 15,
            height: parseFloat(shipPkg.height) || 10
          },
          physicalWeight: parseFloat(shipPkg.weight) || 0.5,
          weight: parseFloat(shipPkg.weight) || 0.5
        }]
        // ✅ Sin shipment aquí — el backend hace fan-out por cada transportadora
      };

      const resp = await fetch(`${process.env.REACT_APP_API_URL || 'https://kosmica-backend.onrender.com'}/api/shipping/rates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await resp.json();
      console.log('Envia.com response:', JSON.stringify(data));
      if (data.data && data.data.length > 0) {
        setShipRates(data.data.sort((a,b) => (a.totalPrice||a.price||0) - (b.totalPrice||b.price||0)));
      } else {
        showToast('No se encontraron tarifas: ' + (data.error?.description || JSON.stringify(data)), 'error');
      }
    } catch(e) {
      showToast('Error cotizando: ' + e.message, 'error');
    } finally {
      setShipLoading(false);
    }
  };

  // ── Envia.com — Generar guía ──────────────────────────────
  const generateGuide = async () => {
    if (!shipSelected || !shipModal) return;
    setShipGenerating(true);

    // ✅ Reutilizar la misma función getCityState que getShipRates
    const getCityStateFn = (city) => {
      const c = (city||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
      if (c.includes('medell') || c.includes('bello') || c.includes('itagui') || c.includes('envigado') || c.includes('sabaneta')) return {state:'ANT',cp:'05001'};
      if (c.includes('bogot') || c.includes('soacha') || c.includes('chia') || c.includes('zipaquira')) return {state:'CUN',cp:'11001'};
      if (c.includes('cali') || c.includes('palmira') || c.includes('buenaventura')) return {state:'VAL',cp:'76001'};
      if (c.includes('barranquill') || c.includes('soledad') || c.includes('malambo')) return {state:'ATL',cp:'08001'};
      if (c.includes('cartagena') || c.includes('turbaco')) return {state:'BOL',cp:'13001'};
      if (c.includes('bucaramanga') || c.includes('floridablanca') || c.includes('giron')) return {state:'SAN',cp:'68001'};
      if (c.includes('pereira') || c.includes('dosquebradas')) return {state:'RIS',cp:'66001'};
      if (c.includes('manizales')) return {state:'CAL',cp:'17001'};
      if (c.includes('armenia')) return {state:'QUI',cp:'63001'};
      if (c.includes('cucuta')) return {state:'NSA',cp:'54001'};
      if (c.includes('ibague')) return {state:'TOL',cp:'73001'};
      if (c.includes('neiva')) return {state:'HUI',cp:'41001'};
      if (c.includes('villavicencio')) return {state:'MET',cp:'50001'};
      if (c.includes('pasto')) return {state:'NAR',cp:'52001'};
      if (c.includes('santa marta')) return {state:'MAG',cp:'47001'};
      if (c.includes('monteria')) return {state:'COR',cp:'23001'};
      if (c.includes('sincelejo')) return {state:'SUC',cp:'70001'};
      if (c.includes('valledupar')) return {state:'CES',cp:'20001'};
      if (c.includes('popayan')) return {state:'CAU',cp:'19001'};
      return {state:'CUN',cp:'11001'};
    };

    const destInfo = getCityStateFn(shipModal.city);

    try {
      const body = {
        origin: {
          name: "Kosmica",
          company: "Kosmica",
          email: "hola@kosmica.com",
          phone: "3043927148",
          street: "Calle 10",
          number: "20",
          district: "El Centro",
          city: "05001",
          state: "ANT",
          country: "CO",
          postalCode: "05001"
        },
        destination: {
          name: shipModal.customerName || "Cliente",
          company: "",
          email: shipModal.customerEmail || "",
          phone: (shipModal.phone||"3000000000").replace(/\D/g,'').slice(-10),
          street: (shipModal.shippingAddress||"Dirección").normalize('NFD').replace(/[\u0300-\u036f]/g,''),
          number: "1",
          district: (shipModal.neighborhood||"Centro").normalize('NFD').replace(/[\u0300-\u036f]/g,''),
          city: destInfo.cp,
          state: destInfo.state,
          country: "CO",
          postalCode: destInfo.cp
        },
        packages: [{
          content: "Productos Kosmica",
          amount: 1,
          type: "box",
          weight: parseFloat(shipPkg.weight) || 0.5,
          dimensions: {
            length: parseFloat(shipPkg.length) || 20,
            width:  parseFloat(shipPkg.width)  || 15,
            height: parseFloat(shipPkg.height) || 10
          }
        }],
        shipment: {
          carrier: shipSelected.carrier,
          service: shipSelected.service,
          type: 1
        },
        settings: { currency: "COP", printFormat: "PDF", labelSize: "STOCK_4X6", printSize: "STOCK_4X6" }
      };

      const resp = await fetch(`${process.env.REACT_APP_API_URL || 'https://kosmica-backend.onrender.com'}/api/shipping/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      const data = await resp.json();
      if (data.data) {
        const guide = data.data[0];
        setShipGuide(guide);
        // Cambiar estado del pedido a SHIPPED
        await updateOrderStatus(shipModal.id, 'SHIPPED');
        showToast('✅ Guía generada exitosamente');
      } else {
        showToast('Error generando guía: ' + JSON.stringify(data), 'error');
      }
    } catch(e) {
      showToast('Error: ' + e.message, 'error');
    } finally {
      setShipGenerating(false);
    }
  };
  const navTo   = (id)  => { setSection(id); setEditing(null); setSidebarOpen(false); };

  const openNew = () => { setForm(EMPTY_PROD); setGallery([]); setVidName(''); setEditing('new'); };
  const openEdit = (p) => {
    setForm({
      name:p.name||'', description:p.description||'', price:p.price||'',
      originalPrice:p.originalPrice||'', category:p.category||'BOLSOS',
      badge:p.badge||'', stock:p.stock||0, imageUrl:p.imageUrl||'',
      videoUrl:p.videoUrl||'', gallery:p.gallery||'[]'
    });
    let g=[]; try{ g=JSON.parse(p.gallery||'[]'); }catch{}
    setGallery(g);
    setVidName(p.videoUrl ? p.videoUrl.split('/').pop() : '');
    setEditing(p);
  };
  const cancelEdit = () => { setEditing(null); setGallery([]); setVidName(''); };

  const uploadMainImg = async (file) => {
    if (!file) return;
    setImgProg(1);
    try {
      const r = await productAPI.uploadImage(file, p => setImgProg(p));
      fSet('imageUrl', r.url);
      showToast('✓ Imagen subida');
    } catch(e) { showToast(e.message,'error'); }
    finally { setImgProg(0); }
  };

  const uploadGallery = async (files) => {
    for (const f of Array.from(files)) {
      try { const r = await productAPI.uploadImage(f); setGallery(prev=>[...prev,r.url]); }
      catch(e) { showToast(`Error: ${f.name}`,'error'); }
    }
    showToast(`✓ ${files.length} imagen(es) añadidas`);
  };

  const uploadVideo = async (file) => {
    if (!file) return;
    setVidProg(1); setVidName(file.name);
    try {
      const r = await productAPI.uploadVideo(file, p => setVidProg(p));
      fSet('videoUrl', r.url);
      showToast('✓ Video subido');
    } catch(e) { showToast(e.message,'error'); }
    finally { setVidProg(0); }
  };

  // ── Subir medio desde sección Medios (sin useRef en map) ────
  const uploadMediaImg = async (file) => {
    if (!file) return;
    try {
      const r = await productAPI.uploadImage(file);
      setUploadedImgUrl(r.url);
      showToast('✓ Imagen subida — copia la URL');
    } catch(e) { showToast(e.message,'error'); }
  };

  const uploadMediaVid = async (file) => {
    if (!file) return;
    try {
      const r = await productAPI.uploadVideo(file);
      setUploadedVidUrl(r.url);
      showToast('✓ Video subido — copia la URL');
    } catch(e) { showToast(e.message,'error'); }
  };

  const copyToClipboard = (url) => {
    navigator.clipboard.writeText(url).then(() => showToast('✓ URL copiada'));
  };

  const saveProduct = async () => {
    if (!form.name || !form.price || !form.category) {
      showToast('Nombre, precio y categoría requeridos','error'); return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        price: parseFloat(form.price),
        originalPrice: form.originalPrice ? parseFloat(form.originalPrice) : null,
        stock: parseInt(form.stock)||0,
        gallery: JSON.stringify(gallery),
      };
      if (editing==='new') await productAPI.create(payload);
      else await productAPI.update(editing.id, payload);
      showToast(editing==='new' ? '✓ Producto publicado' : '✓ Producto actualizado');
      cancelEdit(); loadProducts();
    } catch(e) { showToast(e.message,'error'); }
    finally { setSaving(false); }
  };

  const deleteProduct = async (id, name) => {
    if (!window.confirm(`¿Eliminar "${name}"?`)) return;
    try { await productAPI.delete(id); showToast('✓ Eliminado'); loadProducts(); }
    catch(e) { showToast(e.message,'error'); }
  };

  const updateOrderStatus = async (id, status) => {
    try {
      await orderAPI.updateStatus(id, status);
      setOrders(prev => prev.map(o => o.id===id ? {...o,status} : o));
      showToast('✓ Estado actualizado');
    } catch(e) { showToast(e.message,'error'); }
  };

  const totalRev = orders.filter(o=>o.status!=='CANCELLED').reduce((s,o)=>s+Number(o.total||0),0);
  const filteredOrders = orders.filter(o =>
    !orderSearch ||
    o.orderNumber?.toLowerCase().includes(orderSearch.toLowerCase()) ||
    o.customerEmail?.toLowerCase().includes(orderSearch.toLowerCase()) ||
    o.customerName?.toLowerCase().includes(orderSearch.toLowerCase())
  );

  const NAV = [
    { id:'dashboard', ico:'📊', lbl:'Dashboard'   },
    { id:'products',  ico:'🛍️',  lbl:'Productos'   },
    { id:'orders',    ico:'📦', lbl:'Pedidos'      },
    { id:'media',     ico:'📸', lbl:'Subir Medios' },
  ];

  /* ── LOGIN ── */
  if (!authed) return (
    <>
      <style>{CSS}</style>
      <div className="adm-login">
        <div className="adm-login-box">
          <div className="adm-login-icon">🛡️</div>
          <h1 className="adm-login-title">Panel Admin</h1>
          <p className="adm-login-sub">Kosmica · Acceso restringido</p>
          <input className="adm-login-input" type="password" placeholder="Contraseña"
            value={pass} onChange={e=>setPass(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&login()} />
          <button className="adm-login-btn" onClick={login}>Ingresar →</button>
          {loginErr && <p className="adm-login-err">⚠️ {loginErr}</p>}
        </div>
      </div>
    </>
  );

  /* ── PANEL ── */
  return (
    <>
      <style>{CSS}</style>
      {toast && <div className={`adm-toast ${toast.type}`}>{toast.msg}</div>}

      {/* Hamburger */}
      <button className="adm-hbg" onClick={()=>setSidebarOpen(o=>!o)}>
        {sidebarOpen ? '✕' : '☰'}
      </button>

      {/* Overlay móvil */}
      <div className={`adm-overlay${sidebarOpen?' show':''}`} onClick={()=>setSidebarOpen(false)}/>

      <div className="adm-layout">

        {/* ── SIDEBAR ── */}
        <aside className={`adm-sidebar${sidebarOpen?' open':''}`}>
          <div className="adm-logo">
            <div className="adm-logo-name">✦ Kosmica</div>
            <div className="adm-logo-sub">Admin Panel</div>
          </div>
          <nav className="adm-nav">
            {NAV.map(n=>(
              <button key={n.id}
                className={`adm-nav-btn${section===n.id?' on':''}`}
                onClick={()=>navTo(n.id)}>
                <span className="adm-nav-ico">{n.ico}</span> {n.lbl}
              </button>
            ))}
          </nav>
          <div className="adm-nav-foot">
            <button className="adm-nav-foot-btn" onClick={onExit}>← Volver a la tienda</button>
            <button className="adm-nav-foot-btn" onClick={()=>setAuthed(false)}>🔒 Cerrar sesión</button>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <main className="adm-main">

          {/* DASHBOARD */}
          {section==='dashboard' && (<>
            <h1 className="adm-h1">Dashboard</h1>
            <p className="adm-sub">Resumen general de tu tienda</p>
            <div className="adm-stats">
              {[
                {ico:'🛍️', n:products.length,  lbl:'Productos',      c:'#9B72CF'},
                {ico:'📦', n:orders.length,    lbl:'Pedidos',        c:'#72B7CF'},
                {ico:'💰', n:`$${Number(totalRev||0).toLocaleString("es-CO",{minimumFractionDigits:0,maximumFractionDigits:0})}`, lbl:'Ingresos COP', c:'#72CF9B'},
                {ico:'❤️', n:orders.filter(o=>o.status==='DELIVERED').length, lbl:'Entregados', c:'#CF7299'},
              ].map((s,i)=>(
                <div key={i} className="adm-stat" style={{'--c':s.c}}>
                  <div className="adm-stat-ico">{s.ico}</div>
                  <div className="adm-stat-n">{s.n}</div>
                  <div className="adm-stat-lbl">{s.lbl}</div>
                </div>
              ))}
            </div>
            <div className="adm-card">
              <div className="adm-card-top"><span className="adm-card-title">Últimos pedidos</span></div>
              <div className="adm-tbl-wrap">
                <table className="adm-tbl">
                  <thead><tr><th>Pedido</th><th>Cliente</th><th>Total</th><th>Estado</th></tr></thead>
                  <tbody>
                    {orders.slice(0,6).map(o=>(
                      <tr key={o.id}>
                        <td style={{fontWeight:700,color:'#7B5EA7'}}>{o.orderNumber}</td>
                        <td>{o.customerName}</td>
                        <td style={{fontWeight:700}}>${Number(o.total||0).toLocaleString("es-CO",{minimumFractionDigits:0,maximumFractionDigits:0})}</td>
                        <td><span className={`adm-status ${o.status}`}>
                                {{'PENDING':'⏳ Pendiente','PAID':'✅ Pagado','PROCESSING':'📦 Preparando','SHIPPED':'🚚 Enviado','DELIVERED':'🎉 Entregado','CANCELLED':'❌ Cancelado'}[o.status]||o.status}
                              </span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>)}

          {/* PRODUCTOS — LISTA */}
          {section==='products' && !editing && (<>
            <h1 className="adm-h1">Productos</h1>
            <p className="adm-sub">Gestiona tu catálogo completo</p>
            <div className="adm-card">
              <div className="adm-card-top" style={{flexWrap:'wrap',gap:10}}>
                <span className="adm-card-title">{products.length} productos</span>
                <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
                  <select className="adm-sel-status" value={prodCatFilter} onChange={e=>setProdCatFilter(e.target.value)}
                    style={{padding:'8px 12px',fontSize:'.88rem'}}>
                    <option value="">Todas las categorías</option>
                    <option value="BOLSOS">👜 Bolsos y Morrales</option>
                    <option value="BILLETERAS">💳 Billeteras</option>
                    <option value="MAQUILLAJE">💄 Maquillaje</option>
                    <option value="CAPILAR">✨ Capilar</option>
                    <option value="CUIDADO_PERSONAL">🧴 Cuidado Personal</option>
                    <option value="ACCESORIOS">💍 Accesorios</option>
                  </select>
                  <button className="adm-btn-primary" onClick={openNew}>+ Nuevo producto</button>
                </div>
              </div>
              {loading
                ? <div className="adm-loading">⏳ Cargando...</div>
                : products.length===0
                ? <div className="adm-empty"><div className="adm-empty-ico">📭</div><p>Sin productos aún</p></div>
                : <div className="adm-tbl-wrap">
                    <table className="adm-tbl">
                      <thead><tr><th>Foto</th><th>Nombre</th><th>Cat.</th><th>Precio</th><th>Stock</th><th>Badge</th><th>Acc.</th></tr></thead>
                      <tbody>
                        {(prodCatFilter ? products.filter(p=>p.category===prodCatFilter) : products).map(p=>(
                          <tr key={p.id}>
                            <td><img className="adm-prod-img" src={p.imageUrl||'https://via.placeholder.com/48'} alt=""/></td>
                            <td style={{fontWeight:600,maxWidth:180}}>{p.name}</td>
                            <td><span className="adm-cat">{{BOLSOS:'👜 Bolsos',BILLETERAS:'💳 Billeteras',MAQUILLAJE:'💄 Maquillaje',CAPILAR:'✨ Capilar',CUIDADO_PERSONAL:'🧴 Cuidado',ACCESORIOS:'💍 Accesorios'}[p.category]||p.category}</span></td>
                            <td style={{fontWeight:700,color:'#7B5EA7'}}>${Number(p.price||0).toLocaleString("es-CO",{minimumFractionDigits:0,maximumFractionDigits:0})}</td>
                            <td>{p.stock}</td>
                            <td>{p.badge&&<span className={`adm-badge ${p.badge}`}>{p.badge}</span>}</td>
                            <td>
                              <button className="adm-btn-sm adm-btn-edit" onClick={()=>openEdit(p)}>✏️</button>
                              <button className="adm-btn-sm adm-btn-del"  onClick={()=>deleteProduct(p.id,p.name)}>🗑️</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
              }
            </div>
          </>)}

          {/* PRODUCTOS — FORMULARIO */}
          {section==='products' && editing && (<>
            <h1 className="adm-h1">{editing==='new'?'✦ Nuevo Producto':'✏️ Editar Producto'}</h1>
            <p className="adm-sub">{editing==='new'?'Completa el formulario y publica en la tienda':`Editando: ${editing.name}`}</p>
            <div className="adm-card">
              <div className="adm-form">
                <div className="adm-form-grid">

                  <div className="adm-form-group full">
                    <label className="adm-label">Nombre del producto *</label>
                    <input className="adm-input" value={form.name} onChange={e=>fSet('name',e.target.value)} placeholder="Ej: Bolso Chanel Premium"/>
                  </div>

                  <div className="adm-form-group full">
                    <label className="adm-label">Descripción</label>
                    <textarea className="adm-textarea" value={form.description} onChange={e=>fSet('description',e.target.value)} placeholder="Describe el producto..."/>
                  </div>

                  <div className="adm-form-group">
                    <label className="adm-label">Precio * ($)</label>
                    <input className="adm-input" type="number" step="0.01" value={form.price} onChange={e=>fSet('price',e.target.value)} placeholder="89.99"/>
                  </div>

                  <div className="adm-form-group">
                    <label className="adm-label">Precio original (tachado) — opcional</label>
                    <div style={{display:'flex',gap:8}}>
                      <input className="adm-input" style={{flex:1}} type="number" step="0.01"
                        value={form.originalPrice}
                        onChange={e=>fSet('originalPrice',e.target.value)}
                        placeholder="Solo si tiene descuento"/>
                      {form.originalPrice &&
                        <button type="button" className="adm-btn-sm adm-btn-del"
                          style={{whiteSpace:'nowrap'}}
                          onClick={()=>fSet('originalPrice','')}>✕ Quitar</button>
                      }
                    </div>
                  </div>

                  <div className="adm-form-group">
                    <label className="adm-label">Categoría *</label>
                    <select className="adm-select" value={form.category} onChange={e=>fSet('category',e.target.value)}>
                      <option value="BOLSOS">👜 Bolsos y Morrales</option>
                      <option value="BILLETERAS">💳 Billeteras</option>
                      <option value="MAQUILLAJE">💄 Maquillaje</option>
                      <option value="CAPILAR">✨ Capilar</option>
                      <option value="CUIDADO_PERSONAL">🧴 Cuidado Personal</option>
                      <option value="ACCESORIOS">💍 Accesorios</option>
                    </select>
                  </div>

                  <div className="adm-form-group">
                    <label className="adm-label">Badge</label>
                    <select className="adm-select" value={form.badge} onChange={e=>fSet('badge',e.target.value)}>
                      {BADGES.map(b=><option key={b} value={b}>{b||'Sin badge'}</option>)}
                    </select>
                  </div>

                  <div className="adm-form-group">
                    <label className="adm-label">Stock (unidades)</label>
                    <input className="adm-input" type="number" value={form.stock} onChange={e=>fSet('stock',e.target.value)} placeholder="50"/>
                  </div>

                  {/* Imagen principal */}
                  <div className="adm-form-group full">
                    <label className="adm-label">📸 Imagen principal</label>
                    <input ref={imgRef} type="file" accept="image/*" style={{display:'none'}} onChange={e=>uploadMainImg(e.target.files[0])}/>
                    <div className="adm-upload-zone" onClick={()=>imgRef.current.click()}>
                      {form.imageUrl
                        ? <img src={form.imageUrl} alt="" style={{height:120,objectFit:'contain',borderRadius:10,margin:'0 auto'}}/>
                        : <><div className="adm-upload-ico">🖼️</div>
                           <div className="adm-upload-txt">Clic para subir imagen principal</div>
                           <div className="adm-upload-sub">JPG, PNG, WebP · máx 10 MB</div></>
                      }
                      {imgProg>0&&imgProg<100&&<div className="adm-progress"><div className="adm-progress-bar" style={{width:`${imgProg}%`}}/></div>}
                    </div>
                    {form.imageUrl && (
                      <div className="adm-url-row">
                        <input className="adm-input" style={{flex:1}} value={form.imageUrl} onChange={e=>fSet('imageUrl',e.target.value)} placeholder="O pega una URL"/>
                        <button className="adm-btn-sm adm-btn-del" onClick={()=>fSet('imageUrl','')}>Quitar</button>
                      </div>
                    )}
                  </div>

                  {/* Galería */}
                  <div className="adm-form-group full">
                    <label className="adm-label">🖼️ Galería adicional (Amazon-style)</label>
                    <input ref={gallRef} type="file" accept="image/*" multiple style={{display:'none'}} onChange={e=>uploadGallery(e.target.files)}/>
                    <div className="adm-upload-zone" onClick={()=>gallRef.current.click()}>
                      <div className="adm-upload-ico">📷</div>
                      <div className="adm-upload-txt">Subir múltiples imágenes</div>
                      <div className="adm-upload-sub">Se muestran en el modal del producto</div>
                    </div>
                    {gallery.length>0&&(
                      <div className="adm-preview-row">
                        {gallery.map((url,i)=>(
                          <div key={i} className="adm-preview-item">
                            <img src={url} alt=""/>
                            <button className="adm-preview-del" onClick={()=>setGallery(g=>g.filter(u=>u!==url))}>×</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Video */}
                  <div className="adm-form-group full">
                    <label className="adm-label">🎥 Video del producto</label>
                    <input ref={vidRef} type="file" accept="video/*" style={{display:'none'}} onChange={e=>uploadVideo(e.target.files[0])}/>
                    <div className="adm-upload-zone" onClick={()=>vidRef.current.click()}>
                      <div className="adm-upload-ico">🎬</div>
                      <div className="adm-upload-txt">Subir video del producto</div>
                      <div className="adm-upload-sub">MP4, MOV · máx 100 MB</div>
                      {vidProg>0&&vidProg<100&&<div className="adm-progress"><div className="adm-progress-bar" style={{width:`${vidProg}%`}}/></div>}
                    </div>
                    {vidName&&(
                      <div className="adm-video-bar">
                        <span className="adm-video-ico">🎥</span>
                        <span className="adm-video-name">{vidName}</span>
                        <button className="adm-btn-sm adm-btn-del" onClick={()=>{fSet('videoUrl','');setVidName('')}}>Quitar</button>
                      </div>
                    )}
                  </div>

                </div>

                <div className="adm-form-actions">
                  <button className="adm-btn-cancel" onClick={cancelEdit}>Cancelar</button>
                  <button className="adm-btn-save" onClick={saveProduct} disabled={saving}>
                    {saving ? '⏳ Guardando...' : editing==='new' ? '🚀 Publicar Producto' : '💾 Guardar Cambios'}
                  </button>
                </div>
              </div>
            </div>
          </>)}

          {/* PEDIDOS */}
          {section==='orders' && (<>
            <h1 className="adm-h1">Pedidos</h1>
            <p className="adm-sub">Gestiona el estado de cada pedido</p>
            <div className="adm-card">
              <div className="adm-card-top">
                <span className="adm-card-title">{orders.length} pedidos</span>
                <input className="adm-search" placeholder="🔍 Buscar..." value={orderSearch} onChange={e=>setOrderSearch(e.target.value)}/>
              </div>
              {loading
                ? <div className="adm-loading">⏳ Cargando pedidos...</div>
                : filteredOrders.length===0
                ? <div className="adm-empty"><div className="adm-empty-ico">📭</div><p>Sin pedidos</p></div>
                : <div className="adm-tbl-wrap">
                    <table className="adm-tbl">
                      <thead><tr><th>#</th><th>Cliente</th><th>Total</th><th>Estado</th><th>Fecha</th><th>Cambiar</th></tr></thead>
                      <tbody>
                        {filteredOrders.map(o=>(
                          <tr key={o.id}>
                            <td style={{fontWeight:700,color:'#7B5EA7',whiteSpace:'nowrap'}}>{o.orderNumber}</td>
                            <td>
                              <div style={{fontWeight:600}}>{o.customerName}</div>
                              <div style={{fontSize:'.8rem',color:'#9B72CF'}}>{o.customerEmail}</div>
                            </td>
                            <td style={{fontWeight:700,whiteSpace:'nowrap'}}>${Number(o.total||0).toLocaleString("es-CO",{minimumFractionDigits:0,maximumFractionDigits:0})}</td>
                            <td><span className={`adm-status ${o.status}`}>
                                {{'PENDING':'⏳ Pendiente','PAID':'✅ Pagado','PROCESSING':'📦 Preparando','SHIPPED':'🚚 Enviado','DELIVERED':'🎉 Entregado','CANCELLED':'❌ Cancelado'}[o.status]||o.status}
                              </span></td>
                            <td style={{fontSize:'.82rem',color:'#aaa',whiteSpace:'nowrap'}}>{o.createdAt?new Date(o.createdAt).toLocaleDateString('es-CO'):'-'}</td>
                            <td style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>
                              <select className="adm-sel-status" value={o.status} onChange={e=>updateOrderStatus(o.id,e.target.value)}>
                                <option value="PENDING">⏳ Pendiente</option>
                                <option value="PAID">✅ Pagado</option>
                                <option value="PROCESSING">📦 Preparando</option>
                                <option value="SHIPPED">🚚 Enviado</option>
                                <option value="DELIVERED">🎉 Entregado</option>
                                <option value="CANCELLED">❌ Cancelado</option>
                              </select>
                              <button className="adm-btn-sm adm-btn-edit" onClick={()=>getShipRates(o)}
                                style={{background:'linear-gradient(135deg,#9B72CF,#7B5EA7)',color:'#fff',whiteSpace:'nowrap'}}>
                                🚚 Enviar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
              }
            </div>
          </>)}

          {/* MEDIOS — FIX: sin useRef en map */}
          {section==='media' && (<>
            <h1 className="adm-h1">Subir Medios</h1>
            <p className="adm-sub">Sube fotos y videos · Copia la URL y pégala en el producto</p>
            <div className="adm-media-grid">

              {/* Subir foto */}
              <div className="adm-card adm-media-card">
                <div className="adm-card-title" style={{marginBottom:18}}>📸 Subir Foto</div>
                <input ref={mediaImgRef} type="file" accept="image/*" style={{display:'none'}}
                  onChange={e=>uploadMediaImg(e.target.files[0])}/>
                <div className="adm-upload-zone" onClick={()=>mediaImgRef.current.click()}>
                  <div className="adm-upload-ico">🖼️</div>
                  <div className="adm-upload-txt">Clic para seleccionar foto</div>
                  <div className="adm-upload-sub">JPG, PNG, WebP · máx 10 MB</div>
                </div>
                {uploadedImgUrl && (
                  <div className="adm-copied-url">
                    <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{uploadedImgUrl}</span>
                    <button className="adm-copy-btn" onClick={()=>copyToClipboard(uploadedImgUrl)}>Copiar</button>
                  </div>
                )}
                <p className="adm-media-note">
                  1. Sube la imagen aquí<br/>
                  2. Copia la URL<br/>
                  3. Ve a Productos → Editar → pega en "Imagen principal" o "Galería"
                </p>
              </div>

              {/* Subir video */}
              <div className="adm-card adm-media-card">
                <div className="adm-card-title" style={{marginBottom:18}}>🎬 Subir Video</div>
                <input ref={mediaVidRef} type="file" accept="video/*" style={{display:'none'}}
                  onChange={e=>uploadMediaVid(e.target.files[0])}/>
                <div className="adm-upload-zone" onClick={()=>mediaVidRef.current.click()}>
                  <div className="adm-upload-ico">🎥</div>
                  <div className="adm-upload-txt">Clic para seleccionar video</div>
                  <div className="adm-upload-sub">MP4, MOV, AVI · máx 100 MB</div>
                </div>
                {uploadedVidUrl && (
                  <div className="adm-copied-url">
                    <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{uploadedVidUrl}</span>
                    <button className="adm-copy-btn" onClick={()=>copyToClipboard(uploadedVidUrl)}>Copiar</button>
                  </div>
                )}
                <p className="adm-media-note">
                  1. Sube el video aquí<br/>
                  2. Copia la URL<br/>
                  3. Ve a Productos → Editar → pega en "Video del producto"
                </p>
              </div>

            </div>
          </>)}

        </main>
      </div>

      {/* ── MODAL ENVÍOS ENVIA.COM ── */}
      {shipModal && (
        <div className="adm-ship-modal" onClick={()=>setShipModal(null)}>
          <div className="adm-ship-box" onClick={e=>e.stopPropagation()}>
            <div className="adm-ship-hdr">
              <div className="adm-ship-title">🚚 Generar Guía de Envío</div>
              <button className="adm-btn-sm adm-btn-del" onClick={()=>setShipModal(null)}>✕ Cerrar</button>
            </div>
            <div className="adm-ship-body">
              <div style={{background:'#FAF7FF',borderRadius:12,padding:'12px 16px',marginBottom:16,fontSize:'.88rem'}}>
                <div style={{fontWeight:700,color:'#2D1B4E',marginBottom:4}}>📦 {shipModal.orderNumber}</div>
                <div style={{color:'#6B5B8A'}}>👤 {shipModal.customerName}</div>
                <div style={{color:'#6B5B8A'}}>📱 {shipModal.phone||'Sin teléfono'}</div>
                <div style={{color:'#6B5B8A'}}>📍 {shipModal.shippingAddress}{shipModal.city?`, ${shipModal.city}`:''}</div>
              </div>
              <div style={{marginBottom:16}}>
                <div style={{fontWeight:700,color:'#2D1B4E',marginBottom:10,fontSize:'.9rem'}}>📐 Dimensiones del paquete</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:8}}>
                  {[['Peso (kg)','weight'],['Largo (cm)','length'],['Ancho (cm)','width'],['Alto (cm)','height']].map(([label,key])=>(
                    <div key={key}>
                      <div style={{fontSize:'.75rem',color:'#9B72CF',marginBottom:3}}>{label}</div>
                      <input className="adm-input" style={{padding:'8px 10px',fontSize:'.9rem'}}
                        type="number" step="0.1" value={shipPkg[key]}
                        onChange={e=>setShipPkg(p=>({...p,[key]:e.target.value}))}/>
                    </div>
                  ))}
                </div>
              </div>
              {!shipGuide && (
                <button className="adm-btn-primary" style={{width:'100%',justifyContent:'center',marginBottom:14}}
                  onClick={()=>getShipRates(shipModal)} disabled={shipLoading}>
                  {shipLoading?'⏳ Cotizando...':'🔍 Cotizar con todas las transportadoras'}
                </button>
              )}
              {shipLoading && <div style={{textAlign:'center',padding:'20px',color:'#9B72CF'}}>⏳ Consultando tarifas...</div>}
              {!shipLoading && shipRates.length>0 && !shipGuide && (<>
                <div style={{fontWeight:700,color:'#2D1B4E',marginBottom:10,fontSize:'.9rem'}}>
                  💰 Elige la transportadora más económica
                </div>
                {shipRates.map((rate,i)=>(
                  <div key={i} className={`adm-rate-card${shipSelected===rate?' selected':''}`} onClick={()=>setShipSelected(rate)}>
                    <div style={{width:24,height:24,borderRadius:'50%',border:'2px solid',
                      borderColor:shipSelected===rate?'#9B72CF':'#E8D5FF',
                      display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      {shipSelected===rate&&<div style={{width:12,height:12,borderRadius:'50%',background:'#9B72CF'}}/>}
                    </div>
                    <div className="adm-rate-info">
                      <div className="adm-rate-carrier">{rate.carrierName||rate.carrier}</div>
                      <div className="adm-rate-service">{rate.serviceDescription||rate.service}</div>
                      <div className="adm-rate-days">⏱ {rate.deliveryEstimate||rate.days||'?'} días hábiles</div>
                    </div>
                    <div className="adm-rate-price">${Number(rate.totalPrice||rate.price||0).toLocaleString('es-CO')} COP</div>
                  </div>
                ))}
                <button className="adm-btn-ship" disabled={!shipSelected||shipGenerating} onClick={generateGuide}>
                  {shipGenerating?'⏳ Generando guía...':'✅ Generar guía de envío'}
                </button>
              </>)}
              {shipGuide && (
                <div className="adm-guide-box">
                  <div style={{fontSize:'2rem',marginBottom:8}}>🎉</div>
                  <div style={{fontWeight:700,color:'#2E7D32',marginBottom:6}}>¡Guía generada!</div>
                  <div className="adm-guide-num">{shipGuide.trackingNumber||shipGuide.label}</div>
                  {shipGuide.label&&(
                    <a href={shipGuide.label} target="_blank" rel="noreferrer"
                      style={{display:'inline-block',marginTop:12,padding:'10px 20px',
                        background:'#2E7D32',color:'#fff',borderRadius:10,textDecoration:'none',fontWeight:700,fontSize:'.88rem'}}>
                      📄 Descargar etiqueta PDF
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
