// ═══════════════════════════════════════════════════════════
//  AIChatBot.jsx — Isabel, Asesora IA de Kosmica  v13.0
//  ✅ Conoce TODO el catálogo (todas las categorías reales)
//  ✅ Carrito principal conectado correctamente (objeto completo)
//  ✅ Historial de conversaciones en localStorage
//  ✅ Tarjetas INLINE en el chat con foto + precio
//  ✅ Sin X flotante que tapa el input
//  ✅ Cuidado Personal + todas las categorías en la barra
// ═══════════════════════════════════════════════════════════
import { useState, useEffect, useRef, useCallback, useMemo } from "react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "https://kosmica-backend.onrender.com";
const MAX_HISTORY  = 10;      // mensajes de contexto para la IA
const HIST_KEY     = "kosmica_chat_history";   // localStorage key
const MAX_SESSIONS = 15;      // máximo de sesiones guardadas

// ─────────────────────────────────────────────────────────
//  Persistencia de historial
// ─────────────────────────────────────────────────────────
const loadSessions = () => {
  try { return JSON.parse(localStorage.getItem(HIST_KEY) || "[]"); }
  catch { return []; }
};
const saveSessions = sessions => {
  try { localStorage.setItem(HIST_KEY, JSON.stringify(sessions.slice(0, MAX_SESSIONS))); }
  catch {}
};

// ─────────────────────────────────────────────────────────
//  Quick Intents — respuesta local instantánea
// ─────────────────────────────────────────────────────────
const QUICK_INTENTS = [
  { test: /^(hola|buenas|buenos días|buenas tardes|buenas noches|hey|hi)\b/i,
    reply: "¡Hola hermosa! ✨ Soy Isabel, tu asesora de Kosmica. ¿Buscas algo para ti o un regalo especial?",
    sugs: ["Para mí 💜","Es un regalo 🎁","Ver ofertas 🏷️","Lo más vendido ⭐"] },
  { test: /envío|domicilio|despacho/i,
    reply: "El envío se calcula en el checkout según tu ciudad 🚚. ¿Te ayudo a elegir algo primero?",
    sugs: ["Ver bolsos 👜","Ver ofertas 🏷️"] },
  { test: /pago|mercadopago|tarjeta|pse|nequi|daviplata/i,
    reply: "Aceptamos MercadoPago: tarjeta, PSE, Nequi, Daviplata y efectivo 💳",
    sugs: ["Ver catálogo 🛍️"] },
  { test: /devolución|cambio|garantía|devolver/i,
    reply: "Tienes 15 días para cambios si el producto llega con defecto. Escríbenos a hola@kosmica.com 💜",
    sugs: ["Ver productos 🛍️"] },
  { test: /gracias|thank/i,  reply:"¡Con gusto, reina! Aquí estoy ✨", sugs:[] },
  { test: /adios|chao|bye/i, reply:"¡Hasta pronto! Fue un placer ✨",  sugs:[] },
];
const checkQuick = t => {
  const m = QUICK_INTENTS.find(i => i.test.test(t.trim()));
  return m ? { reply: m.reply, sugs: m.sugs } : null;
};

// ─────────────────────────────────────────────────────────
//  Construcción del catálogo completo para la IA
//  → Isabel ve TODOS los productos agrupados por categoría
// ─────────────────────────────────────────────────────────
function buildCatalog(products) {
  const avail = products.filter(p => p.stock > 0);
  // Agrupar por categoría (normalizar null/undefined a "General")
  const groups = {};
  avail.forEach(p => {
    const cat = (p.category && p.category.trim()) ? p.category.trim() : "General";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push({
      id: p.id,
      nombre: p.name,
      precio: `$${Number(p.price).toLocaleString("es-CO")} COP`,
      descripcion: (p.description || "").slice(0, 120),
      rating: p.rating,
      stock: p.stock,
      badge: p.badge || null,
    });
  });
  return groups;
}

// ─────────────────────────────────────────────────────────
//  Búsqueda inteligente de productos para mostrar tarjetas
//  Ahora usa las categorías REALES del catálogo
// ─────────────────────────────────────────────────────────
function searchProds(products, query) {
  const q     = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const avail = products.filter(p => p.stock > 0);

  // Buscar por categoría real (coincidencia parcial con lo que escribe el usuario)
  let byCat = [];
  const catNames = [...new Set(avail.map(p => p.category).filter(Boolean))];
  for (const cat of catNames) {
    const catNorm = cat.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    // Palabras clave dinámicas desde el nombre real de la categoría
    const catWords = catNorm.split(/[\s\/\-&]+/).filter(w => w.length > 2);
    if (catWords.some(w => q.includes(w)) || q.includes(catNorm)) {
      byCat = avail.filter(p => p.category === cat);
      break;
    }
  }

  // Mapeo de sinónimos comunes → palabras que aparecen en nombres de categoría
  const SYNONYMS = {
    bolso:["bolso","morral","cartera","tote","clutch"],
    bolsa:["bolso","morral","cartera"],
    cartera:["bolso","morral","cartera"],
    morral:["morral","bolso"],
    maquillaje:["maquillaje","make"],
    labial:["maquillaje","labial"],
    sombra:["maquillaje","sombra"],
    base:["maquillaje","base"],
    rubor:["maquillaje","rubor"],
    capilar:["capilar","cabello","pelo","shampoo"],
    cabello:["capilar","cabello","pelo"],
    pelo:["capilar","cabello","pelo"],
    shampoo:["capilar","shampoo"],
    keratina:["capilar","keratina"],
    accesorio:["accesorio","collar","aretes","pulsera","anillo"],
    collar:["accesorio","collar"],
    aretes:["accesorio","aretes"],
    pulsera:["accesorio","pulsera"],
    billetera:["billetera","monedero","wallet"],
    monedero:["billetera","monedero"],
    cuidado:["cuidado","personal","crema","serum","tónico","loción"],
    crema:["cuidado","crema"],
    serum:["cuidado","serum"],
    perfume:["perfume","fragancia"],
    fragancia:["perfume","fragancia"],
  };

  if (byCat.length === 0) {
    for (const [kw, aliases] of Object.entries(SYNONYMS)) {
      if (q.includes(kw)) {
        for (const cat of catNames) {
          const catNorm = cat.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          if (aliases.some(a => catNorm.includes(a))) {
            byCat = avail.filter(p => p.category === cat);
            break;
          }
        }
        if (byCat.length > 0) break;
      }
    }
  }

  // Por intent (oferta, nuevo, más vendido)
  let byIntent = [];
  if      (/oferta|descuento/i.test(q))        byIntent = avail.filter(p => p.badge === "OFERTA");
  else if (/nuevo|novedad/i.test(q))           byIntent = avail.filter(p => p.badge === "NUEVO");
  else if (/popular|vendido|moda|top/i.test(q)) byIntent = [...avail].sort((a,b)=>(b.rating||0)-(a.rating||0)).slice(0,6);
  else if (/regalo|mama|amiga|mujer/i.test(q)) byIntent = [...avail].sort((a,b)=>(b.rating||0)-(a.rating||0)).slice(0,6);

  // Por texto libre en nombre/descripción
  const words  = q.split(/\s+/).filter(w => w.length > 3);
  const byText = words.length
    ? avail.filter(p => words.some(w =>
        p.name?.toLowerCase().includes(w) ||
        p.description?.toLowerCase().includes(w)))
    : [];

  const seen = new Set(), merged = [];
  for (const p of [...byCat, ...byIntent, ...byText])
    if (!seen.has(p.id)) { seen.add(p.id); merged.push(p); }

  // Si nada coincide → top rated como fallback
  const res = merged.length ? merged : [...avail].sort((a,b)=>(b.rating||0)-(a.rating||0));
  return res.slice(0, 5);  // devuelve objeto completo (para carrito correcto)
}

// ─────────────────────────────────────────────────────────
//  System Prompt — Isabel conoce TODO el catálogo
// ─────────────────────────────────────────────────────────
function buildSystem(catalog, catNames) {
  const catalogStr = Object.entries(catalog)
    .map(([cat, prods]) =>
      `\n### ${cat} (${prods.length} productos)\n` +
      prods.map(p =>
        `  [ID:${p.id}] ${p.nombre} — ${p.precio}${p.badge ? " 🏷️"+p.badge : ""}${p.stock<=5?" ⚡POCO STOCK":""}${p.rating?" ⭐"+p.rating:""}`
      ).join("\n")
    ).join("\n");

  return `Eres ISABEL, asesora experta de ventas de Kosmica (Colombia). Tienda de moda y belleza.

PERSONALIDAD: Cálida, directa, colombiana auténtica. Tutea siempre. Máx 2 emojis por mensaje. Máx 3 líneas de texto. NUNCA empieces con "¡Claro!" ni "Por supuesto".

TÉCNICA DE VENTAS PROFESIONAL:
1. Pregunta qué necesita (regalo/personal, ocasión, presupuesto) si no lo dice
2. Recomienda 2-3 productos MÁX explicando POR QUÉ le sirven a ESA persona
3. Crea urgencia con stock bajo u ofertas
4. Cierra siempre: "¿Lo agregamos al carrito?" o "¿Cuál te llama más?"
5. Si dice que está caro → ofrece alternativa más económica de inmediato
6. Si pregunta por una categoría → muestra las mejores opciones de ESA categoría

CATEGORÍAS DE LA TIENDA: ${catNames.join(", ")}

CATÁLOGO COMPLETO (todos los productos disponibles con stock):
${catalogStr}

REGLA CRÍTICA: Al FINAL de cada respuesta donde recomiendes productos escribe exactamente:
PRODUCTOS_RECOMENDADOS:id1,id2,id3
(solo los IDs numéricos de los productos que mencionas)

Si no recomiendas productos específicos, NO incluyas esa línea.
Nunca inventes productos ni precios. Solo usa IDs del catálogo de arriba.`;
}

// ─────────────────────────────────────────────────────────
//  Llamada al backend
// ─────────────────────────────────────────────────────────
async function callClaude(system, messages) {
  const res = await fetch(`${BACKEND_URL}/api/ai/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system, messages, max_tokens: 500 }),
  });
  if (!res.ok) {
    const err = await res.json().catch(()=>({}));
    throw new Error(err.error || `Error ${res.status}`);
  }
  const data = await res.json();
  return data.content?.[0]?.text ?? "";
}

// ─────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────
const fmtCOP     = n => new Intl.NumberFormat("es-CO",{style:"currency",currency:"COP",maximumFractionDigits:0}).format(n);
const extractIds = t => {
  const m = t.match(/PRODUCTOS_RECOMENDADOS:\[?([\d,\s]+)\]?/);
  if (!m) return [];
  return m[1].split(",").map(s => s.trim()).filter(s => s.length > 0);
  // Retorna strings — prodMap acepta tanto string como number
};
const cleanText  = t => t.replace(/PRODUCTOS_RECOMENDADOS:\[?[\d,\s]+\]?/g,"").trim();
const catEmoji   = (c="") => {
  const u = c.toUpperCase();
  if (u.includes("BOLSO")||u.includes("MORRAL")) return "👜";
  if (u.includes("MAQUILLAJE")||u.includes("MAKE")) return "💄";
  if (u.includes("CAPILAR")||u.includes("CABELLO")) return "✨";
  if (u.includes("ACCESORIO")) return "💍";
  if (u.includes("BILLETERA")||u.includes("WALLET")) return "💳";
  if (u.includes("CUIDADO")||u.includes("PERSONAL")||u.includes("SKIN")) return "🧴";
  if (u.includes("PERFUME")||u.includes("FRAGANCIA")) return "🌸";
  return "🛍️";
};
const fmtDate = d => {
  const dt = new Date(d);
  return dt.toLocaleDateString("es-CO",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});
};

// ─────────────────────────────────────────────────────────
//  Stars
// ─────────────────────────────────────────────────────────
const Stars = ({rating=0}) => (
  <span style={{display:"flex",gap:1,alignItems:"center"}}>
    {[1,2,3,4,5].map(i=>(
      <span key={i} style={{fontSize:11,color:i<=Math.round(rating)?"#FBBF24":"#ddd0f8"}}>★</span>
    ))}
  </span>
);

// ─────────────────────────────────────────────────────────
//  TARJETA DE PRODUCTO — horizontal, inline en el chat
// ─────────────────────────────────────────────────────────
const ProductCard = ({ prod, onAdd, onView, isAdded }) => {
  const [imgOk, setImgOk] = useState(null);
  const emoji = catEmoji(prod.category || "");

  useEffect(()=>{
    if (!prod.imageUrl) { setImgOk(false); return; }
    setImgOk(null);
    const img = new window.Image();
    img.onload  = () => setImgOk(true);
    img.onerror = () => setImgOk(false);
    img.src = prod.imageUrl;
    return () => { img.onload=null; img.onerror=null; };
  },[prod.imageUrl]);

  return (
    <div style={{
      borderRadius:16,overflow:"hidden",
      background:"#fff",
      boxShadow:"0 3px 16px rgba(109,40,217,.12)",
      border:"1px solid #ede8ff",
      display:"flex",flexDirection:"row",minHeight:108,
      transition:"transform .18s,box-shadow .18s",
      fontFamily:"'DM Sans',sans-serif",
    }}
      onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 10px 30px rgba(109,40,217,.2)";}}
      onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="0 3px 16px rgba(109,40,217,.12)";}}>

      {/* FOTO */}
      <div style={{
        position:"relative",width:108,minWidth:108,
        background:"#f9f7ff",display:"flex",alignItems:"center",
        justifyContent:"center",overflow:"hidden",flexShrink:0,cursor:"pointer",
      }} onClick={()=>onView(prod)}>
        {imgOk===null&&<div style={{width:22,height:22,borderRadius:"50%",border:"3px solid #e8defa",borderTopColor:"#7c3aed",animation:"kbSpin .7s linear infinite"}}/>}
        {prod.imageUrl&&(
          <img src={prod.imageUrl} alt={prod.name} style={{
            position:"absolute",inset:0,width:"100%",height:"100%",
            objectFit:"contain",objectPosition:"center",
            padding:"8px",boxSizing:"border-box",
            opacity:imgOk?1:0,transition:"opacity .3s",
          }}/>
        )}
        {imgOk===false&&<div style={{fontSize:36,opacity:.5}}>{emoji}</div>}
        {prod.badge&&(
          <span style={{
            position:"absolute",top:6,left:6,zIndex:3,
            fontSize:".46rem",fontWeight:900,letterSpacing:".08em",
            padding:"3px 7px",borderRadius:20,textTransform:"uppercase",color:"#fff",
            background:prod.badge==="OFERTA"
              ?"linear-gradient(135deg,#f43f5e,#be123c)"
              :"linear-gradient(135deg,#7c3aed,#4c1d95)",
            boxShadow:"0 2px 6px rgba(0,0,0,.2)",
          }}>{prod.badge}</span>
        )}
        {prod.stock>0&&prod.stock<=5&&(
          <span style={{
            position:"absolute",bottom:4,left:4,zIndex:3,
            fontSize:".44rem",fontWeight:800,padding:"2px 6px",borderRadius:20,
            background:"rgba(0,0,0,.6)",color:"#fcd34d",
          }}>⚡ Solo {prod.stock}</span>
        )}
      </div>

      {/* INFO */}
      <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"space-between",padding:"10px 12px",minWidth:0}}>
        <div onClick={()=>onView(prod)} style={{
          fontSize:".8rem",fontWeight:700,color:"#1e0a4a",lineHeight:1.35,cursor:"pointer",
          display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden",
        }}>{prod.name}</div>
        <div style={{display:"flex",alignItems:"center",gap:4,marginTop:3}}>
          <Stars rating={prod.rating}/>
          {prod.category&&<span style={{fontSize:".6rem",color:"#9d8bc4",marginLeft:2}}>{prod.category}</span>}
        </div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:6,gap:6}}>
          <span style={{fontSize:"1.05rem",fontWeight:900,color:"#6d28d9",letterSpacing:"-.02em",flexShrink:0}}>
            {fmtCOP(prod.price)}
          </span>
          <button onClick={e=>{e.stopPropagation();onAdd(prod,e);}}
            title={isAdded?"Agregado":"Agregar al carrito"}
            style={{
              flexShrink:0,padding:"6px 14px",borderRadius:22,border:"none",cursor:"pointer",
              fontSize:".72rem",fontWeight:800,display:"flex",alignItems:"center",gap:5,
              background:isAdded?"linear-gradient(135deg,#10b981,#065f46)":"linear-gradient(135deg,#7c3aed,#4c1d95)",
              color:"#fff",
              boxShadow:isAdded?"0 3px 12px rgba(16,185,129,.4)":"0 3px 12px rgba(124,58,237,.4)",
              transform:isAdded?"scale(1.04)":"scale(1)",
              transition:"all .2s",fontFamily:"'DM Sans',sans-serif",
            }}>
            {isAdded?"✓ Agregado":"🛒 Al carrito"}
          </button>
        </div>
      </div>
    </div>
  );
};

// Grid inline de tarjetas
const ProductGrid = ({ prods, onAdd, onView, added }) => (
  <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:8,marginLeft:38}}>
    {prods.map(p=>(
      <ProductCard key={p.id} prod={p}
        onView={onView} onAdd={onAdd} isAdded={added.has(p.id)}/>
    ))}
  </div>
);

// ─────────────────────────────────────────────────────────
//  Panel de historial de sesiones
// ─────────────────────────────────────────────────────────
const HistoryPanel = ({ sessions, onResume, onDelete, onClose }) => (
  <div style={{
    position:"absolute",inset:0,zIndex:30,
    background:"#f5f0fe",display:"flex",flexDirection:"column",
    fontFamily:"'DM Sans',sans-serif",
  }}>
    <div style={{
      background:"linear-gradient(135deg,#6d28d9,#3b0764)",
      padding:"14px 18px",display:"flex",alignItems:"center",gap:12,flexShrink:0,
    }}>
      <button onClick={onClose} style={{
        width:34,height:34,background:"rgba(255,255,255,.12)",border:"1.5px solid rgba(255,255,255,.22)",
        borderRadius:"50%",color:"#fff",fontSize:16,cursor:"pointer",
        display:"flex",alignItems:"center",justifyContent:"center",
      }}>←</button>
      <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"1rem",fontWeight:700,color:"#fff"}}>
        Historial de conversaciones
      </span>
    </div>
    <div style={{flex:1,overflowY:"auto",padding:"12px 14px",display:"flex",flexDirection:"column",gap:10}}>
      {sessions.length===0?(
        <div style={{textAlign:"center",color:"#b0a0cc",fontSize:".85rem",marginTop:40,lineHeight:1.7}}>
          No hay conversaciones guardadas aún.<br/>¡Empieza a chatear con Isabel! ✨
        </div>
      ):sessions.map((s,i)=>(
        <div key={s.id} style={{
          background:"#fff",borderRadius:14,padding:"12px 14px",
          boxShadow:"0 2px 10px rgba(109,40,217,.08)",border:"1px solid #ede8ff",
        }}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:".7rem",color:"#9d8bc4",marginBottom:4}}>{fmtDate(s.date)}</div>
              <div style={{fontSize:".82rem",fontWeight:700,color:"#1e0a4a",lineHeight:1.4,
                overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                {s.preview}
              </div>
              <div style={{fontSize:".7rem",color:"#b0a0cc",marginTop:3}}>
                {s.msgs.length} mensajes
              </div>
            </div>
            <div style={{display:"flex",gap:6,flexShrink:0}}>
              <button onClick={()=>onResume(s)} style={{
                padding:"5px 13px",borderRadius:16,border:"none",cursor:"pointer",
                background:"linear-gradient(135deg,#7c3aed,#4c1d95)",color:"#fff",
                fontSize:".7rem",fontWeight:700,fontFamily:"'DM Sans',sans-serif",
              }}>Continuar</button>
              <button onClick={()=>onDelete(s.id)} style={{
                width:30,height:30,borderRadius:"50%",border:"1.5px solid #fda4a4",
                background:"#fff1f2",color:"#ef4444",cursor:"pointer",fontSize:14,
                display:"flex",alignItems:"center",justifyContent:"center",
              }}>✕</button>
            </div>
          </div>
        </div>
      ))}
    </div>
    {sessions.length>0&&(
      <div style={{padding:"10px 14px",borderTop:"1px solid #e8defa",background:"#fff"}}>
        <button onClick={()=>{sessions.forEach(s=>onDelete(s.id));}}
          style={{width:"100%",padding:"9px",borderRadius:12,border:"1.5px solid #fda4a4",
            background:"#fff1f2",color:"#ef4444",cursor:"pointer",
            fontSize:".78rem",fontWeight:700,fontFamily:"'DM Sans',sans-serif"}}>
          🗑️ Borrar todo el historial
        </button>
      </div>
    )}
  </div>
);

// ─────────────────────────────────────────────────────────
//  Categorías con detección DINÁMICA desde el catálogo real
// ─────────────────────────────────────────────────────────
const CAT_EMOJI_MAP = [
  { test: /bolso|morral|cartera|tote|clutch/i, emoji:"👜" },
  { test: /maquillaje|make|labial|cosmético/i, emoji:"💄" },
  { test: /capilar|cabello|pelo|shampoo/i,     emoji:"✨" },
  { test: /accesorio|collar|aretes|joya/i,     emoji:"💍" },
  { test: /billetera|monedero|wallet/i,        emoji:"💳" },
  { test: /cuidado|personal|skin|crema|serum/i,emoji:"🧴" },
  { test: /perfume|fragancia|colonia/i,        emoji:"🌸" },
  { test: /ropa|vestido|blusa|prenda/i,        emoji:"👗" },
  { test: /calzado|zapato|sandalia|bota/i,     emoji:"👠" },
];
const getEmoji = name => {
  const match = CAT_EMOJI_MAP.find(m => m.test.test(name));
  return match ? match.emoji : "🛍️";
};

// Categorías fijas de acceso rápido (siempre visibles)
const QUICK_CATS = [
  { label:"🏷️ Ofertas",   q:"¿Qué está en oferta?" },
  { label:"⭐ Top ventas", q:"¿Cuáles son los más vendidos?" },
  { label:"🎁 Regalos",   q:"Ideas para regalo especial" },
];

// ─────────────────────────────────────────────────────────
//  Estilos globales
// ─────────────────────────────────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&family=Cormorant+Garamond:wght@600;700&display=swap');

  @keyframes kbSpin    { to { transform:rotate(360deg) } }
  @keyframes kbSlideUp { from{transform:translateY(60px);opacity:0} to{transform:translateY(0);opacity:1} }
  @keyframes kbFadeIn  { from{opacity:0} to{opacity:1} }
  @keyframes kbBounce  { 0%,60%,100%{transform:translateY(0);opacity:.25} 30%{transform:translateY(-7px);opacity:1} }
  @keyframes kbPulse   { 0%,100%{box-shadow:0 0 0 0 rgba(52,211,153,.55)} 60%{box-shadow:0 0 0 7px rgba(52,211,153,0)} }
  @keyframes kbFabRing { 0%,100%{box-shadow:0 8px 28px rgba(91,33,182,.6),0 0 0 0 rgba(139,92,246,.4)} 50%{box-shadow:0 8px 28px rgba(91,33,182,.6),0 0 0 11px rgba(139,92,246,0)} }
  @keyframes kbToast   { from{opacity:0;transform:translateX(-50%) translateY(-8px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
  @keyframes kbCardIn  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }

  *, *::before, *::after { box-sizing:border-box; }

  .kb-fab {
    position:fixed; bottom:24px; right:24px; width:62px; height:62px; border-radius:50%;
    background:linear-gradient(145deg,#8b5cf6,#5b21b6); border:none; cursor:pointer;
    display:flex; align-items:center; justify-content:center; font-size:26px;
    z-index:10000; transition:transform .2s; animation:kbFabRing 3s ease infinite;
  }
  .kb-fab:hover { transform:scale(1.1) rotate(-8deg); }

  .kb-overlay {
    position:fixed; inset:0;
    background:rgba(8,0,24,.72); backdrop-filter:blur(10px);
    z-index:9998; animation:kbFadeIn .22s;
  }

  .kb-panel {
    position:fixed; bottom:0; right:0;
    width:520px; height:91vh; max-width:100vw; max-height:100vh;
    background:#f5f0fe; border-radius:24px 24px 0 0;
    display:flex; flex-direction:column; overflow:hidden;
    z-index:9999; box-shadow:-6px 0 50px rgba(0,0,0,.28);
    animation:kbSlideUp .3s cubic-bezier(.34,1.1,.64,1);
    font-family:'DM Sans',sans-serif;
  }
  @media(max-width:540px){
    .kb-panel{ width:100vw; border-radius:20px 20px 0 0; }
  }

  .kb-cat {
    flex-shrink:0; padding:5px 13px; border-radius:22px;
    background:rgba(255,255,255,.13); border:1.5px solid rgba(255,255,255,.2);
    color:#fff; font-size:.7rem; font-weight:700; cursor:pointer;
    white-space:nowrap; transition:all .15s; font-family:'DM Sans',sans-serif;
  }
  .kb-cat:hover, .kb-cat.on { background:rgba(255,255,255,.28); border-color:rgba(255,255,255,.6); transform:translateY(-1px); }
  .kb-cat:disabled { opacity:.3; cursor:default; transform:none; }

  .kb-sug {
    background:#fff; border:1.5px solid #d4b8f0; color:#5b21b6;
    border-radius:22px; padding:6px 14px; font-size:.73rem; font-weight:700;
    cursor:pointer; white-space:nowrap; transition:all .15s;
    font-family:'DM Sans',sans-serif; box-shadow:0 2px 6px rgba(91,33,182,.07);
  }
  .kb-sug:hover { background:linear-gradient(135deg,#7c3aed,#4c1d95); color:#fff; border-color:transparent; transform:translateY(-2px); }

  .kb-input {
    flex:1; border:1.5px solid #ddd0f8; border-radius:26px; padding:11px 18px;
    font-size:.875rem; color:#1e0a4a; outline:none; background:#faf7ff;
    transition:border-color .18s,box-shadow .18s; font-family:'DM Sans',sans-serif;
  }
  .kb-input:focus { border-color:#7c3aed; box-shadow:0 0 0 3px rgba(124,58,237,.13); }
  .kb-input::placeholder { color:#b8a8d4; }

  .kb-msgs {
    flex:1; overflow-y:auto; padding:16px 14px 8px;
    display:flex; flex-direction:column; gap:12px;
    scrollbar-width:thin; scrollbar-color:#ddd0f8 transparent;
  }
  .kb-msgs::-webkit-scrollbar { width:3px; }
  .kb-msgs::-webkit-scrollbar-thumb { background:#ddd0f8; border-radius:3px; }

  .kb-card-anim { animation:kbCardIn .35s ease both; }
`;

// ═══════════════════════════════════════════════════════════
//  COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════
export default function AIChatBot({ products=[], onProductClick, onAddToCart }) {
  // ── DEBUG: confirma en consola que los props llegan ──
  useEffect(() => {
    if (products.length > 0) {
      const cats = [...new Set(products.map(p => p.category).filter(Boolean))];
      console.log(`[AIChatBot] ✅ Catálogo cargado: ${products.length} productos, ${cats.length} categorías:`, cats);
      console.log(`[AIChatBot] onAddToCart:`, typeof onAddToCart);
    } else {
      console.warn("[AIChatBot] ⚠️ products[] está vacío — el bot no tiene catálogo.");
    }
  }, [products, onAddToCart]);
  const INIT_MSG = {
    role:"bot",
    content:"¡Hola hermosa, soy Isabel! ✨\nTu asesora personal de Kosmica. ¿Buscas algo para ti o es un regalo especial?",
    sugs:["Para mí 💜","Es un regalo 🎁","Ver ofertas 🏷️","Lo más vendido ⭐"],
  };

  const [open,       setOpen]      = useState(false);
  const [msgs,       setMsgs]      = useState([INIT_MSG]);
  const [added,      setAdded]     = useState(new Set());
  const [input,      setInput]     = useState("");
  const [loading,    setLoading]   = useState(false);
  const [error,      setError]     = useState(null);
  const [unread,     setUnread]    = useState(1);
  const [activeCat,  setActiveCat] = useState(null);
  const [toast,      setToast]     = useState(null);
  const [lastMsg,    setLastMsg]   = useState("");
  const [showHist,   setShowHist]  = useState(false);
  const [sessions,   setSessions]  = useState(loadSessions);
  const [sessionId,  setSessionId] = useState(()=>Date.now().toString());

  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  // ready solo cuando hay productos CON categoría (catálogo real cargado)
  const ready = products.length > 0 && products.some(p => p.category || p.name);

  // Catálogo completo y mapa de IDs
  const catalog  = useMemo(()=> buildCatalog(products), [products]);
  const catNames = useMemo(()=> Object.keys(catalog), [catalog]);
  const prodMap  = useMemo(()=>{
    const m = new Map();
    products.forEach(p => {
      m.set(p.id, p);
      m.set(Number(p.id), p);   // por si el ID viene como string desde la IA
      m.set(String(p.id), p);
    });
    return m;
  }, [products]);

  // Categorías dinámicas desde el catálogo real del cliente
  const dynCats = useMemo(()=> catNames.map(name=>({
    label: `${getEmoji(name)} ${name}`,
    q: `Quiero ver ${name}`,
  })), [catNames]);

  // Todas las categorías: dinámicas + quick
  const allCats = useMemo(()=>[...dynCats, ...QUICK_CATS],[dynCats]);

  useEffect(()=>{ if(open){ setUnread(0); setTimeout(()=>inputRef.current?.focus(),120); }},[open]);
  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:"smooth"}); },[msgs,loading]);

  // Guardar sesión automáticamente cuando hay mensajes reales
  useEffect(()=>{
    if (msgs.length < 2) return;
    const userMsgs = msgs.filter(m=>m.role==="user");
    if (userMsgs.length === 0) return;
    const preview = userMsgs[0]?.content?.slice(0,60) || "Conversación";
    // Serializar msgs sin los objetos producto completos (solo ids para ahorrar espacio)
    const lightMsgs = msgs.map(m=>({
      role:m.role,content:m.content,sugs:m.sugs,quick:m.quick,
      productIds: m.products?.map(p=>p.id),
    }));
    const session = { id:sessionId, date:Date.now(), preview, msgs:lightMsgs };
    setSessions(prev=>{
      const filtered = prev.filter(s=>s.id!==sessionId);
      const updated  = [session, ...filtered];
      saveSessions(updated);
      return updated;
    });
  },[msgs, sessionId]);

  const fireToast = useCallback((msg,type="info")=>{
    setToast({msg,type});
    setTimeout(()=>setToast(null),2600);
  },[]);

  // ── Agregar al carrito — pasa el objeto COMPLETO original ──
  const handleAdd = useCallback((prod, e) => {
    e?.stopPropagation();
    if (!prod) return;
    // Buscar siempre el objeto completo desde prodMap primero
    const full = prodMap.get(prod.id) || prodMap.get(Number(prod.id)) || prod;
    if (typeof onAddToCart === "function") {
      onAddToCart(full);
    } else {
      console.warn("[AIChatBot] onAddToCart no está definido en el componente padre.");
    }
    setAdded(prev => new Set([...prev, prod.id]));
    fireToast(`🛒 ${full.name || prod.name} agregado al carrito`, "cart");
    setTimeout(() => setAdded(prev => { const n = new Set(prev); n.delete(prod.id); return n; }), 2500);
  }, [onAddToCart, fireToast, prodMap]);

  const newConversation = useCallback(()=>{
    setMsgs([INIT_MSG]);
    setInput(""); setError(null); setActiveCat(null); setAdded(new Set());
    setSessionId(Date.now().toString());
    setShowHist(false);
  },[]);

  const resumeSession = useCallback((session)=>{
    // Reconstruir los mensajes con los productos completos
    const restored = session.msgs.map(m=>({
      ...m,
      products: m.productIds?.map(id=>prodMap.get(id)).filter(Boolean),
    }));
    setMsgs(restored);
    setSessionId(session.id);
    setShowHist(false);
  },[prodMap]);

  const deleteSession = useCallback((id)=>{
    setSessions(prev=>{ const u=prev.filter(s=>s.id!==id); saveSessions(u); return u; });
  },[]);

  const send = useCallback(async(override)=>{
    const text = (override ?? input).trim();
    if (!text || loading) return;
    if (!ready){ fireToast("⏳ Cargando catálogo..."); return; }

    setInput(""); setError(null); setLastMsg(text);

    // Respuesta local instantánea
    const local = checkQuick(text);
    if (local){
      setMsgs(prev=>[...prev,
        {role:"user",content:text},
        {role:"bot",content:local.reply,sugs:local.sugs,quick:true},
      ]);
      return;
    }

    const userMsg = {role:"user",content:text};
    const history = [...msgs, userMsg];
    setMsgs(history);
    setLoading(true);

    const apiMsgs = history
      .filter(m=>m.role==="user"||m.role==="bot")
      .slice(-MAX_HISTORY)
      .map(m=>({role:m.role==="bot"?"assistant":"user",content:m.content}));

    try {
      // Isabel ahora recibe el catálogo COMPLETO, no filtrado
      const raw    = await callClaude(buildSystem(catalog, catNames), apiMsgs);
      const ids    = extractIds(raw);
      const cleaned= cleanText(raw);

      // Los productos recomendados son los objetos COMPLETOS (para carrito correcto)
      const prods = ids.map(id => prodMap.get(id) || prodMap.get(Number(id))).filter(Boolean);

      setMsgs(prev=>[...prev,{
        role:"bot",
        content:cleaned,
        products: prods.length>0 ? prods : undefined,
      }]);

      if (prods.length>0)
        fireToast(`✨ ${prods.length} producto${prods.length>1?"s":""} encontrado${prods.length>1?"s":""}`);
      if (!open) setUnread(u=>u+1);

    } catch(err){
      console.error("ChatBot:",err.message);
      setError(err.message);
      setMsgs(prev=>[...prev,{role:"bot",content:"Ups, tuve un problema. ¿Lo intentamos de nuevo? 🔄"}]);
    } finally {
      setLoading(false);
    }
  },[input,loading,msgs,catalog,catNames,prodMap,ready,open,fireToast]);

  const handleKey = e=>{ if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();} };
  const handleCat = cat=>{ setActiveCat(cat.label); send(cat.q); };

  return (
    <>
      <style>{STYLES}</style>

      {/* FAB — solo visible con el chat CERRADO */}
      {!open&&(
        <button className="kb-fab" onClick={()=>setOpen(true)} title="Habla con Isabel">
          ✨
          {unread>0&&(
            <span style={{position:"absolute",top:-4,right:-4,width:21,height:21,borderRadius:"50%",
              background:"#ef4444",border:"2.5px solid #fff",fontSize:10,fontWeight:800,color:"#fff",
              display:"flex",alignItems:"center",justifyContent:"center"}}>
              {unread}
            </span>
          )}
        </button>
      )}

      {open&&<>
        <div className="kb-overlay" onClick={()=>setOpen(false)}/>
        <div className="kb-panel">

          {/* HEADER */}
          <div style={{
            background:"linear-gradient(135deg,#6d28d9 0%,#3b0764 100%)",
            padding:"12px 16px",display:"flex",alignItems:"center",gap:10,
            flexShrink:0,position:"relative",overflow:"hidden",
          }}>
            <div style={{position:"absolute",top:-50,right:-40,width:180,height:180,borderRadius:"50%",background:"rgba(255,255,255,.035)",pointerEvents:"none"}}/>
            <div style={{position:"relative",flexShrink:0}}>
              <div style={{width:44,height:44,borderRadius:"50%",
                background:"rgba(255,255,255,.14)",border:"2px solid rgba(255,255,255,.28)",
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:20,boxShadow:"0 0 0 5px rgba(255,255,255,.06)"}}>✨</div>
              <span style={{position:"absolute",bottom:2,right:2,width:11,height:11,borderRadius:"50%",
                background:"#34d399",border:"2px solid #4c1d95",animation:"kbPulse 2.2s ease infinite"}}/>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"1rem",fontWeight:700,color:"#fff",lineHeight:1.2}}>
                Isabel · Asesora Kosmica
              </div>
              <div style={{fontSize:".68rem",color:"rgba(255,255,255,.8)",display:"flex",alignItems:"center",gap:5,marginTop:2}}>
                <span style={{width:6,height:6,background:"#34d399",borderRadius:"50%"}}/>
                En línea · Conozco todo el catálogo
                <span style={{fontSize:".55rem",fontWeight:800,padding:"2px 7px",borderRadius:7,
                  background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.2)",
                  color:"rgba(255,255,255,.9)",textTransform:"uppercase",marginLeft:2,letterSpacing:".07em"}}>
                  IA Pro
                </span>
              </div>
            </div>
            {/* Botón historial */}
            <button onClick={()=>setShowHist(true)} title="Ver historial"
              style={{width:34,height:34,flexShrink:0,background:"rgba(255,255,255,.12)",
                border:"1.5px solid rgba(255,255,255,.22)",borderRadius:"50%",color:"#fff",
                fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",
                transition:"all .18s",position:"relative"}}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.25)"}
              onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,.12)"}>
              🕐
              {sessions.length>0&&(
                <span style={{position:"absolute",top:-4,right:-4,width:17,height:17,borderRadius:"50%",
                  background:"#fbbf24",border:"2px solid #4c1d95",fontSize:9,fontWeight:900,color:"#1e0a4a",
                  display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {sessions.length}
                </span>
              )}
            </button>
            {/* Botón nueva conversación */}
            <button onClick={newConversation} title="Nueva conversación"
              style={{width:34,height:34,flexShrink:0,background:"rgba(255,255,255,.12)",
                border:"1.5px solid rgba(255,255,255,.22)",borderRadius:"50%",color:"#fff",
                fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",
                transition:"all .18s"}}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.25)"}
              onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,.12)"}>
              ✏️
            </button>
            {/* Botón cerrar */}
            <button onClick={()=>setOpen(false)}
              style={{width:34,height:34,flexShrink:0,background:"rgba(255,255,255,.12)",
                border:"1.5px solid rgba(255,255,255,.22)",borderRadius:"50%",color:"#fff",
                fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",
                transition:"all .18s"}}
              onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,.25)";e.currentTarget.style.transform="rotate(90deg)";}}
              onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,.12)";e.currentTarget.style.transform="";}}>
              ✕
            </button>
          </div>

          {/* CATEGORÍAS DINÁMICAS — desde el catálogo real */}
          <div style={{
            background:"linear-gradient(135deg,#5b21b6,#3b0764)",
            padding:"7px 14px",display:"flex",gap:6,overflowX:"auto",
            scrollbarWidth:"none",flexShrink:0,
            borderBottom:"1px solid rgba(0,0,0,.12)",
          }}
            onWheel={e=>{e.currentTarget.scrollLeft+=e.deltaY;e.preventDefault();}}
          >
            {!ready ? (
              <span style={{fontSize:".68rem",color:"rgba(255,255,255,.5)",padding:"5px 4px"}}>
                Cargando categorías...
              </span>
            ) : allCats.map(c=>(
              <button key={c.label}
                className={`kb-cat${activeCat===c.label?" on":""}`}
                onClick={()=>handleCat(c)}
                disabled={loading||!ready}>
                {c.label}
              </button>
            ))}
          </div>

          {/* ÁREA CHAT */}
          <div style={{display:"flex",flexDirection:"column",background:"#ede8fc",overflow:"hidden",flex:1,position:"relative"}}>

            {/* Panel historial (overlay) */}
            {showHist&&(
              <HistoryPanel
                sessions={sessions}
                onResume={resumeSession}
                onDelete={deleteSession}
                onClose={()=>setShowHist(false)}/>
            )}

            {toast&&(
              <div style={{
                position:"absolute",top:12,left:"50%",transform:"translateX(-50%)",
                padding:"7px 18px",borderRadius:24,fontSize:".7rem",fontWeight:700,
                whiteSpace:"nowrap",animation:"kbToast .28s ease",zIndex:20,
                pointerEvents:"none",color:"#fff",fontFamily:"'DM Sans',sans-serif",
                background:toast.type==="cart"
                  ?"linear-gradient(135deg,#10b981,#065f46)"
                  :"linear-gradient(135deg,#7c3aed,#4c1d95)",
                boxShadow:toast.type==="cart"
                  ?"0 5px 18px rgba(16,185,129,.5)"
                  :"0 5px 18px rgba(124,58,237,.5)",
              }}>
                {toast.msg}
              </div>
            )}

            {!ready?(
              <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:14,padding:30}}>
                <div style={{width:42,height:42,borderRadius:"50%",border:"3px solid #e8defa",borderTopColor:"#7c3aed",animation:"kbSpin .75s linear infinite"}}/>
                <div style={{fontSize:".83rem",color:"#9d8bc4",textAlign:"center",lineHeight:1.7}}>
                  Cargando el catálogo completo...<br/>Un momento 💜
                </div>
              </div>
            ):<>
              {error&&(
                <div style={{margin:"8px 12px",padding:"10px 13px",background:"#fff1f2",
                  border:"1px solid #fda4a4",borderRadius:12,display:"flex",gap:10,alignItems:"flex-start",flexShrink:0}}>
                  <span style={{fontSize:17,flexShrink:0}}>⚠️</span>
                  <div>
                    <div style={{fontSize:".76rem",color:"#991b1b",lineHeight:1.5,fontWeight:500}}>{error}</div>
                    <button onClick={()=>{setError(null);send(lastMsg);}}
                      style={{marginTop:5,padding:"4px 12px",borderRadius:8,background:"#fda4a4",border:"none",
                        color:"#7f1d1d",fontSize:".7rem",fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
                      Reintentar
                    </button>
                  </div>
                </div>
              )}

              <div className="kb-msgs">
                {msgs.map((msg,i)=>(
                  <div key={i}>
                    {/* Burbuja de mensaje */}
                    <div style={{display:"flex",gap:8,alignItems:"flex-end",flexDirection:msg.role==="user"?"row-reverse":"row"}}>
                      <div style={{
                        width:30,height:30,borderRadius:"50%",flexShrink:0,
                        display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,
                        background:msg.role==="bot"?"linear-gradient(135deg,#7c3aed,#4c1d95)":"#e8defa",
                        boxShadow:msg.role==="bot"?"0 3px 10px rgba(124,58,237,.35)":"none",
                      }}>
                        {msg.role==="bot"?"✨":"👤"}
                      </div>
                      <div style={{
                        padding:"10px 14px",borderRadius:18,fontSize:".86rem",
                        lineHeight:1.65,maxWidth:"78%",wordBreak:"break-word",
                        whiteSpace:"pre-line",fontFamily:"'DM Sans',sans-serif",
                        ...(msg.role==="bot"
                          ?{background:"#fff",color:"#1e0a4a",borderBottomLeftRadius:4,
                            boxShadow:"0 2px 10px rgba(0,0,0,.07)",border:"1px solid #ede8fa"}
                          :{background:"linear-gradient(135deg,#7c3aed,#4c1d95)",color:"#fff",
                            borderBottomRightRadius:4,boxShadow:"0 4px 14px rgba(124,58,237,.4)"}),
                      }}>
                        {msg.quick&&(
                          <div style={{fontSize:".55rem",fontWeight:700,letterSpacing:".08em",
                            padding:"2px 7px",borderRadius:6,background:"#ede8fa",color:"#6d28d9",
                            display:"inline-block",marginBottom:5,textTransform:"uppercase"}}>
                            Respuesta rápida
                          </div>
                        )}
                        {msg.content}
                      </div>
                    </div>

                    {/* Chips sugerencia */}
                    {msg.sugs?.length>0&&(
                      <div style={{display:"flex",flexWrap:"wrap",gap:5,padding:"5px 0 2px",marginLeft:38}}>
                        {msg.sugs.map(s=>(
                          <button key={s} className="kb-sug"
                            onClick={()=>{const cat=allCats.find(c=>c.label===s);cat?handleCat(cat):send(s);}}>
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                    {i===0&&msgs.length===1&&!msg.sugs&&(
                      <div style={{display:"flex",flexWrap:"wrap",gap:5,padding:"5px 0 2px",marginLeft:38}}>
                        {["¿Qué bolso está de moda? 👜","Regalo para mamá 🎁","Los más vendidos ⭐","¿Qué hay en oferta? 🏷️"].map(s=>(
                          <button key={s} className="kb-sug" onClick={()=>send(s)}>{s}</button>
                        ))}
                      </div>
                    )}

                    {/* Tarjetas INLINE */}
                    {msg.products?.length>0&&(
                      <div className="kb-card-anim">
                        <ProductGrid
                          prods={msg.products}
                          onView={prod=>{onProductClick?.(prod);setOpen(false);}}
                          onAdd={(prod,e)=>handleAdd(prod,e)}
                          added={added}/>
                      </div>
                    )}
                  </div>
                ))}

                {loading&&(
                  <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
                    <div style={{width:30,height:30,borderRadius:"50%",display:"flex",alignItems:"center",
                      justifyContent:"center",fontSize:13,background:"linear-gradient(135deg,#7c3aed,#4c1d95)",
                      boxShadow:"0 3px 10px rgba(124,58,237,.35)"}}>✨</div>
                    <div style={{padding:"12px 16px",borderRadius:18,borderBottomLeftRadius:4,
                      background:"#fff",border:"1px solid #ede8fa",boxShadow:"0 2px 10px rgba(0,0,0,.07)"}}>
                      <div style={{display:"flex",gap:5,alignItems:"center"}}>
                        {[0,180,360].map(d=>(
                          <span key={d} style={{width:7,height:7,background:"#8b5cf6",borderRadius:"50%",
                            animation:`kbBounce 1.2s ${d}ms infinite`}}/>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef}/>
              </div>

              {/* INPUT — limpio, sin FAB encima */}
              <div style={{
                padding:"10px 12px",borderTop:"1px solid #e8defa",
                display:"flex",gap:8,alignItems:"center",
                background:"#fff",boxShadow:"0 -3px 14px rgba(0,0,0,.04)",
                flexShrink:0,
              }}>
                <input ref={inputRef} className="kb-input"
                  placeholder="Cuéntame qué buscas..."
                  value={input}
                  onChange={e=>setInput(e.target.value)}
                  onKeyDown={handleKey}
                  disabled={loading}/>
                <button onClick={()=>send()} disabled={loading||!input.trim()} style={{
                  width:44,height:44,flexShrink:0,border:"none",borderRadius:"50%",
                  background:"linear-gradient(135deg,#7c3aed,#4c1d95)",
                  color:"#fff",fontSize:17,cursor:"pointer",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  opacity:loading||!input.trim()?0.28:1,
                  boxShadow:"0 4px 14px rgba(124,58,237,.5)",transition:"transform .14s",
                  fontFamily:"'DM Sans',sans-serif"}}
                  onMouseEnter={e=>{if(!loading&&input.trim())e.currentTarget.style.transform="scale(1.1)";}}
                  onMouseLeave={e=>e.currentTarget.style.transform=""}>
                  ➤
                </button>
              </div>
            </>}
          </div>

        </div>
      </>}
    </>
  );
}
