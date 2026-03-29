// ═══════════════════════════════════════════════════════════
//  AIChatBot.jsx — Isabel, Asesora IA de Kosmica  v9.0
//  ✅ Conecta al backend Java /api/ai/chat
//  ✅ Tarjetas: imagen CUADRADA (1:1), precio grande visible
//  ✅ Quick intents locales (sin servidor, < 5ms)
//  ✅ Filtrado inteligente de productos
//  ✅ Historial limitado (6 msgs)
//  ✅ Botón "Al carrito" en cada tarjeta
//  ✅ Spinner mientras carga catálogo
//  ✅ Manejo de errores + reintentar
// ═══════════════════════════════════════════════════════════
import { useState, useEffect, useRef, useCallback, useMemo } from "react";

const BACKEND_URL = process.env.REACT_APP_API_URL || "https://kosmica-backend.onrender.com";
const MAX_HISTORY = 6;

// ── Quick Intents locales ──────────────────────────────────
const QUICK_INTENTS = [
  { test:/^(hola|buenas|buenos días|buenas tardes|buenas noches|hey|hi)\b/i,
    reply:"Hola hermosa! ✨ Soy Isabel, tu asesora de Kosmica. ¿Buscas algo para ti o es un regalo especial?",
    sugs:["Para mí 💜","Es un regalo 🎁","Ver ofertas 🏷️","Lo más vendido ⭐"] },
  { test:/envío|domicilio|despacho|cuánto.*envío/i,
    reply:"El envío se calcula en el checkout según tu ciudad 🚚. ¿Te ayudo a elegir un producto primero?",
    sugs:["Ver bolsos 👜","Ver ofertas 🏷️"] },
  { test:/pago|mercadopago|tarjeta|pse|nequi|daviplata/i,
    reply:"Aceptamos MercadoPago: tarjeta, PSE, Nequi, Daviplata y efectivo 💳.",
    sugs:["Ver catálogo 👜"] },
  { test:/devolución|cambio|garantía|devolver/i,
    reply:"Tienes 15 días para cambios si el producto llega con defecto. Escríbenos a hola@kosmica.com 💜",
    sugs:["Ver productos 🛍️"] },
  { test:/gracias|thank/i,
    reply:"¡Con gusto, reina! Aquí estoy cuando me necesites ✨", sugs:[] },
  { test:/adios|chao|hasta luego|bye/i,
    reply:"¡Hasta pronto! Fue un placer atenderte ✨", sugs:[] },
];
const checkQuick = (t) => {
  const m = QUICK_INTENTS.find(i => i.test.test(t.trim()));
  return m ? { reply: m.reply, sugs: m.sugs } : null;
};

// ── Filtrado de productos ──────────────────────────────────
const CAT_KW = {
  "Bolsos y Morrales":["bolso","cartera","morral","tote","clutch"],
  "Maquillaje":       ["maquillaje","labial","base","sombra","rubor","brillo"],
  "Capilar":          ["cabello","pelo","shampoo","mascarilla","keratina"],
  "Accesorios":       ["accesorio","collar","aretes","pulsera","anillo"],
  "Billeteras":       ["billetera","monedero","wallet"],
};
function filterProds(products, query) {
  const q = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  const avail = products.filter(p => p.stock > 0);
  let byCat = [];
  for (const [cat,kws] of Object.entries(CAT_KW))
    if (kws.some(k=>q.includes(k))) { byCat=avail.filter(p=>p.category?.toLowerCase().includes(cat.toLowerCase())); break; }
  let byIntent = [];
  if (/oferta|descuento/i.test(q))        byIntent = avail.filter(p=>p.badge==="OFERTA");
  else if (/nuevo|novedad/i.test(q))      byIntent = avail.filter(p=>p.badge==="NUEVO");
  else if (/popular|vendido|moda/i.test(q)) byIntent=[...avail].sort((a,b)=>(b.rating||0)-(a.rating||0)).slice(0,12);
  else if (/regalo|mamá|amiga/i.test(q))  byIntent=[...avail].sort((a,b)=>(b.rating||0)-(a.rating||0)).slice(0,12);
  const words=q.split(/\s+/).filter(w=>w.length>3);
  const byText=words.length?avail.filter(p=>words.some(w=>p.name?.toLowerCase().includes(w)||p.description?.toLowerCase().includes(w))):[];
  const seen=new Set(),merged=[];
  for (const p of [...byCat,...byIntent,...byText]) if(!seen.has(p.id)){seen.add(p.id);merged.push(p);}
  const res=merged.length?merged:[...avail].sort((a,b)=>(b.rating||0)-(a.rating||0));
  return res.slice(0,12).map(p=>({id:p.id,nombre:p.name,descripcion:(p.description||"").slice(0,100),
    precio:`$${Number(p.price).toLocaleString("es-CO")} COP`,categoria:p.category,
    rating:p.rating,stock:p.stock>5?"disponible":`solo ${p.stock}`,badge:p.badge||null}));
}

// ── System Prompt ──────────────────────────────────────────
function buildPrompt(fp) {
  return `Eres ISABEL, asesora de ventas de Kosmica (Colombia). Experta en moda y belleza.
PERSONALIDAD: Cálida, directa, colombiana. Tuteo. Máx 2 emojis. 3-4 líneas máx. NUNCA empieces con "¡Claro!".
VENTAS: Máx 3 productos. Urgencia: "oferta vuela". CTA: "¿Lo agregamos al carrito?".
PRODUCTOS: ${JSON.stringify(fp,null,1)}
Al final escribe: PRODUCTOS_RECOMENDADOS:id1,id2,id3 (solo si recomiendas)
LÍMITES: Solo Kosmica. Nunca inventes datos.`;
}

// ── Helpers ────────────────────────────────────────────────
const fmtCOP = n => new Intl.NumberFormat("es-CO",{style:"currency",currency:"COP",maximumFractionDigits:0}).format(n);
const extractIds = t => { const m=t.match(/PRODUCTOS_RECOMENDADOS:\[?([\d,\s]+)\]?/); return m?m[1].split(",").map(s=>parseInt(s.trim(),10)).filter(n=>n>0):[]; };
const cleanText  = t => t.replace(/PRODUCTOS_RECOMENDADOS:\[?[\d,\s]+\]?/g,"").trim();
const catEmoji   = (c="") => { const u=c.toUpperCase(); if(u.includes("BOLSO")||u.includes("MORRAL"))return"👜"; if(u.includes("MAQUILLAJE"))return"💄"; if(u.includes("CAPILAR"))return"✨"; if(u.includes("ACCESORIO"))return"💍"; if(u.includes("BILLETERA"))return"💳"; return"🛍️"; };

// ── Estrellas ──────────────────────────────────────────────
const Stars = ({rating=0}) => (
  <div style={{display:"flex",gap:2,alignItems:"center"}}>
    {[1,2,3,4,5].map(i=><span key={i} style={{fontSize:13,color:i<=Math.round(rating)?"#FBBF24":"#DDD0F8"}}>★</span>)}
    {rating>0&&<span style={{fontSize:11,color:"#A89BC0",marginLeft:3}}>{Number(rating).toFixed(1)}</span>}
  </div>
);

// ═══════════════════════════════════════════════════════════
//  TARJETA DE PRODUCTO — diseño mejorado
// ═══════════════════════════════════════════════════════════
const ProductCard = ({prod, onView, onAdd, isAdded}) => {
  const [imgSt, setImgSt] = useState("loading");
  const emoji = catEmoji(prod.category);

  useEffect(()=>{
    if(!prod.imageUrl){setImgSt("err");return;}
    setImgSt("loading");
    const img=new window.Image();
    img.onload=()=>setImgSt("ok");
    img.onerror=()=>setImgSt("err");
    img.src=prod.imageUrl;
    return()=>{img.onload=null;img.onerror=null;};
  },[prod.imageUrl]);

  return (
    <div style={{borderRadius:16,overflow:"hidden",border:"1.5px solid #EDE8FA",background:"#fff",
      boxShadow:"0 2px 14px rgba(109,40,217,.08)",transition:"transform .2s,box-shadow .2s,border-color .2s",
      fontFamily:"'DM Sans',sans-serif"}}
      onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-4px)";e.currentTarget.style.boxShadow="0 14px 38px rgba(109,40,217,.22)";e.currentTarget.style.borderColor="#6D28D9";}}
      onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="0 2px 14px rgba(109,40,217,.08)";e.currentTarget.style.borderColor="#EDE8FA";}}>

      {/* IMAGEN — ratio 1:1 cuadrada, sin estirar */}
      <div style={{width:"100%",paddingBottom:"100%",position:"relative",
        background:"linear-gradient(135deg,#F0EAF8,#E4D8F8)",overflow:"hidden"}}>

        {/* Badge oferta/nuevo */}
        {prod.badge && (
          <span style={{position:"absolute",top:10,left:10,zIndex:3,
            fontSize:".58rem",fontWeight:800,letterSpacing:".09em",
            padding:"4px 10px",borderRadius:10,textTransform:"uppercase",
            background:prod.badge==="OFERTA"?"#EF4444":"#6D28D9",color:"#fff",
            boxShadow:prod.badge==="OFERTA"?"0 3px 10px rgba(239,68,68,.45)":"0 3px 10px rgba(109,40,217,.45)"}}>
            {prod.badge}
          </span>
        )}

        {/* Spinner */}
        {imgSt==="loading" && (
          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <div style={{width:26,height:26,borderRadius:"50%",
              border:"3px solid #E4D8F8",borderTopColor:"#6D28D9",
              animation:"kbSpin .8s linear infinite"}}/>
          </div>
        )}

        {/* Foto — object-fit:cover evita que se estire */}
        {prod.imageUrl && (
          <img src={prod.imageUrl} alt={prod.name} style={{
            position:"absolute",inset:0,width:"100%",height:"100%",
            objectFit:"cover",        // ← CLAVE: recorta sin deformar
            objectPosition:"center top",
            opacity:imgSt==="ok"?1:0,
            transition:"opacity .4s ease",
          }}/>
        )}

        {/* Emoji fallback */}
        {imgSt==="err" && (
          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:54}}>
            {emoji}
          </div>
        )}

        {/* Precio encima de la imagen — siempre visible */}
        <div style={{position:"absolute",bottom:0,left:0,right:0,
          background:"linear-gradient(to top,rgba(20,5,55,.88) 0%,rgba(20,5,55,0) 100%)",
          padding:"28px 13px 11px",
          display:"flex",alignItems:"flex-end",justifyContent:"space-between"}}>
          <span style={{fontSize:"1.08rem",fontWeight:800,color:"#fff",
            textShadow:"0 1px 6px rgba(0,0,0,.5)",lineHeight:1,fontFamily:"'DM Sans',sans-serif"}}>
            {fmtCOP(prod.price)}
          </span>
          {prod.stock>0&&prod.stock<=5 && (
            <span style={{fontSize:".6rem",fontWeight:700,color:"#FCD34D",
              background:"rgba(0,0,0,.45)",padding:"3px 8px",borderRadius:8,whiteSpace:"nowrap"}}>
              ⚡ Solo {prod.stock}
            </span>
          )}
        </div>
      </div>

      {/* BODY */}
      <div style={{padding:"12px 13px 14px"}}>
        {/* Nombre */}
        <div style={{fontSize:".86rem",fontWeight:700,color:"#1C0845",lineHeight:1.35,
          marginBottom:6,display:"-webkit-box",WebkitLineClamp:2,
          WebkitBoxOrient:"vertical",overflow:"hidden"}}>
          {prod.name}
        </div>

        {/* Estrellas + categoría */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:11}}>
          <Stars rating={prod.rating}/>
          <span style={{fontSize:".62rem",color:"#9D8BC4",fontWeight:600,
            background:"#F3EEFF",padding:"2px 8px",borderRadius:8,whiteSpace:"nowrap"}}>
            {catEmoji(prod.category)} {(prod.category||"").split(" ")[0]}
          </span>
        </div>

        {/* Botones */}
        <div style={{display:"flex",gap:7}}>
          <button onClick={e=>{e.stopPropagation();onView(prod);}} style={{
            flex:1,padding:"9px 0",background:"none",
            border:"1.5px solid #6D28D9",borderRadius:10,
            fontSize:".73rem",fontWeight:700,color:"#6D28D9",
            cursor:"pointer",fontFamily:"'DM Sans',sans-serif",transition:"background .15s"}}
            onMouseEnter={e=>e.currentTarget.style.background="#F3EEFF"}
            onMouseLeave={e=>e.currentTarget.style.background="none"}>
            Ver detalle
          </button>
          <button onClick={e=>{e.stopPropagation();onAdd(prod,e);}} style={{
            flex:1.5,padding:"9px 0",border:"none",borderRadius:10,
            fontSize:".73rem",fontWeight:700,color:"#fff",
            cursor:"pointer",fontFamily:"'DM Sans',sans-serif",
            background:isAdded?"linear-gradient(135deg,#10B981,#065F46)":"linear-gradient(135deg,#6D28D9,#3B0764)",
            boxShadow:isAdded?"0 4px 14px rgba(16,185,129,.4)":"0 4px 14px rgba(109,40,217,.4)",
            transition:"all .2s",transform:isAdded?"scale(1.02)":"scale(1)"}}>
            {isAdded?"✓ Agregado":"🛒 Al carrito"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Categorías ─────────────────────────────────────────────
const CATS=[
  {label:"👜 Bolsos",       q:"Quiero ver los bolsos disponibles"},
  {label:"💄 Maquillaje",   q:"¿Qué maquillaje tienen?"},
  {label:"✨ Capilar",      q:"Muéstrame productos para el cabello"},
  {label:"💍 Accesorios",   q:"¿Qué accesorios tienen?"},
  {label:"💳 Billeteras",   q:"Quiero ver las billeteras"},
  {label:"🏷️ Ofertas",     q:"¿Qué está en oferta?"},
  {label:"🆕 Novedades",    q:"¿Qué novedades llegaron?"},
  {label:"⭐ Más vendidos", q:"¿Cuáles son los más vendidos?"},
  {label:"🎁 Regalos",     q:"Necesito ideas para un regalo especial"},
];

// ── Estilos globales ───────────────────────────────────────
const STYLES=`
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Cormorant+Garamond:wght@600;700&display=swap');
  @keyframes kbSpin    {to{transform:rotate(360deg)}}
  @keyframes kbSlideUp {from{transform:translateY(55px);opacity:0}to{transform:translateY(0);opacity:1}}
  @keyframes kbFadeIn  {from{opacity:0}to{opacity:1}}
  @keyframes kbBounce  {0%,60%,100%{transform:translateY(0);opacity:.3}30%{transform:translateY(-8px);opacity:1}}
  @keyframes kbPulse   {0%,100%{box-shadow:0 0 0 0 rgba(52,211,153,.5)}50%{box-shadow:0 0 0 6px rgba(52,211,153,0)}}
  @keyframes kbToast   {from{opacity:0;transform:translateX(-50%) translateY(-10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
  @keyframes kbFabRing {0%,100%{box-shadow:0 8px 30px rgba(91,33,182,.55),0 0 0 0 rgba(139,92,246,.4)}50%{box-shadow:0 8px 30px rgba(91,33,182,.55),0 0 0 12px rgba(139,92,246,0)}}

  .kbfab{position:fixed;bottom:26px;right:26px;width:64px;height:64px;border-radius:50%;
    background:linear-gradient(145deg,#8B5CF6,#5B21B6);border:none;cursor:pointer;
    display:flex;align-items:center;justify-content:center;font-size:26px;
    z-index:10000;transition:transform .2s;animation:kbFabRing 3s ease infinite;}
  .kbfab:hover{transform:scale(1.1) rotate(-8deg);}
  .kboverlay{position:fixed;inset:0;background:rgba(10,0,30,.68);backdrop-filter:blur(8px);z-index:9998;animation:kbFadeIn .2s;}
  .kbpanel{position:fixed;bottom:0;right:0;width:920px;height:92vh;max-width:100vw;max-height:100vh;
    background:#F8F4FE;border-radius:22px 22px 0 0;
    display:grid;grid-template-columns:1fr 320px;grid-template-rows:auto auto 1fr auto;
    overflow:hidden;z-index:9999;box-shadow:-8px 0 60px rgba(0,0,0,.3);
    animation:kbSlideUp .32s cubic-bezier(.34,1.1,.64,1);font-family:'DM Sans',sans-serif;}
  @media(max-width:940px){.kbpanel{width:100vw;border-radius:18px 18px 0 0;grid-template-columns:1fr;}.kbside{display:none!important;}}
  .kbcat{flex-shrink:0;padding:5px 14px;border-radius:20px;background:rgba(255,255,255,.12);
    border:1.5px solid rgba(255,255,255,.22);color:#fff;font-size:.72rem;font-weight:600;
    cursor:pointer;white-space:nowrap;transition:all .16s;font-family:'DM Sans',sans-serif;}
  .kbcat:hover,.kbcat.on{background:rgba(255,255,255,.3);border-color:rgba(255,255,255,.65);transform:translateY(-1px);}
  .kbcat:disabled{opacity:.35;cursor:default;transform:none;}
  .kbsug{background:#fff;border:1.5px solid #C8B4EC;color:#5B21B6;border-radius:20px;
    padding:6px 13px;font-size:.75rem;font-weight:600;cursor:pointer;white-space:nowrap;
    transition:all .16s;font-family:'DM Sans',sans-serif;box-shadow:0 2px 8px rgba(91,33,182,.08);}
  .kbsug:hover{background:linear-gradient(135deg,#6D28D9,#3B0764);color:#fff;border-color:transparent;transform:translateY(-2px);}
  .kbinput{flex:1;border:1.5px solid #DDD0F8;border-radius:24px;padding:11px 18px;
    font-size:.875rem;color:#1C0845;outline:none;background:#F8F4FF;
    transition:border-color .18s,box-shadow .18s;font-family:'DM Sans',sans-serif;}
  .kbinput:focus{border-color:#6D28D9;box-shadow:0 0 0 3px rgba(109,40,217,.12);}
  .kbinput::placeholder{color:#B8A8D4;}
  .kbmsgs{flex:1;overflow-y:auto;padding:16px 14px 8px;display:flex;flex-direction:column;gap:12px;
    scrollbar-width:thin;scrollbar-color:#D4B8F0 transparent;}
  .kbmsgs::-webkit-scrollbar{width:4px;}
  .kbmsgs::-webkit-scrollbar-thumb{background:#D4B8F0;border-radius:4px;}
  .kbside-scroll{flex:1;overflow-y:auto;padding:12px 11px;display:flex;flex-direction:column;gap:14px;
    scrollbar-width:thin;scrollbar-color:#DDD0F8 transparent;}
  .kbside-scroll::-webkit-scrollbar{width:3px;}
  .kbside-scroll::-webkit-scrollbar-thumb{background:#DDD0F8;border-radius:3px;}
`;

// ═══════════════════════════════════════════════════════════
//  COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════
export default function AIChatBot({products=[], onProductClick, onAddToCart}) {
  const [open,setOpen]           = useState(false);
  const [msgs,setMsgs]           = useState([{role:"bot",
    content:"Hola hermosa, soy Isabel ✨\nTu asesora personal de Kosmica. ¿Buscas algo para ti o es un regalo especial?",
    sugs:["Para mí 💜","Es un regalo 🎁","Ver ofertas 🏷️","Lo más vendido ⭐"]}]);
  const [shown,setShown]         = useState([]);
  const [added,setAdded]         = useState(new Set());
  const [input,setInput]         = useState("");
  const [loading,setLoading]     = useState(false);
  const [error,setError]         = useState(null);
  const [unread,setUnread]       = useState(1);
  const [activeCat,setActiveCat] = useState(null);
  const [toast,setToast]         = useState(null);
  const [lastMsg,setLastMsg]     = useState("");
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  const ready = products.length>0;

  const prodMap=useMemo(()=>{const m=new Map();products.forEach(p=>m.set(p.id,p));return m;},[products]);

  useEffect(()=>{if(open){setUnread(0);setTimeout(()=>inputRef.current?.focus(),120);}},[open]);
  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"});},[msgs,loading]);

  const fireToast=useCallback((msg,type="info")=>{setToast({msg,type});setTimeout(()=>setToast(null),2800);},[]);

  const handleAdd=useCallback((prod,e)=>{
    e?.stopPropagation();
    onAddToCart?.(prod);
    setAdded(prev=>new Set([...prev,prod.id]));
    fireToast(`🛒 ${prod.name} agregado`,"cart");
    setTimeout(()=>setAdded(prev=>{const n=new Set(prev);n.delete(prod.id);return n;}),2500);
  },[onAddToCart,fireToast]);

  const send=useCallback(async(override)=>{
    const text=(override??input).trim();
    if(!text||loading)return;
    if(!ready){fireToast("⏳ Cargando catálogo...");return;}
    setInput(""); setError(""); setLastMsg(text);

    // Quick intent local
    const local=checkQuick(text);
    if(local){setMsgs(prev=>[...prev,{role:"user",content:text},{role:"bot",content:local.reply,sugs:local.sugs,quick:true}]);return;}

    // Llamada al backend Java
    const userMsg={role:"user",content:text};
    const history=[...msgs,userMsg];
    setMsgs(history);
    setLoading(true);

    const fp=filterProds(products,text);
    const apiHistory=history.filter(m=>m.role==="user"||m.role==="bot").slice(-MAX_HISTORY)
      .map(m=>({role:m.role==="bot"?"assistant":"user",content:m.content}));

    try{
      const resp=await fetch(`${BACKEND_URL}/api/ai/chat`,{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({system:buildPrompt(fp),messages:apiHistory}),
      });
      if(!resp.ok){const e=await resp.json().catch(()=>({}));throw new Error(e.error||`Error ${resp.status}`);}
      const data=await resp.json();
      const raw=data.content?.[0]?.text??"No pude procesar tu mensaje. ¿Lo intentamos de nuevo?";
      const ids=extractIds(raw);
      const cleaned=cleanText(raw);
      const prods=ids.map(id=>prodMap.get(id)).filter(Boolean);
      setMsgs(prev=>[...prev,{role:"bot",content:cleaned}]);
      if(prods.length>0){setShown(prods);fireToast(`✨ ${prods.length} producto${prods.length>1?"s":""} para ti`);}
      if(!open)setUnread(u=>u+1);
    }catch(err){
      console.error("ChatBot:",err.message);
      setError(err.message);
      setMsgs(prev=>[...prev,{role:"bot",content:"Tuve un problema de conexión. ¿Lo intentamos de nuevo? 🔄"}]);
    }finally{setLoading(false);}
  },[input,loading,msgs,products,ready,prodMap,open,fireToast]);

  const handleKey=e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}};
  const handleCat=cat=>{setActiveCat(cat.label);send(cat.q);};

  return(
    <>
      <style>{STYLES}</style>

      {/* FAB */}
      <button className="kbfab" onClick={()=>setOpen(o=>!o)} title="Habla con Isabel">
        {open?"✕":"✨"}
        {!open&&unread>0&&<span style={{position:"absolute",top:-4,right:-4,width:22,height:22,borderRadius:"50%",
          background:"#EF4444",border:"2px solid #fff",fontSize:10,fontWeight:800,color:"#fff",
          display:"flex",alignItems:"center",justifyContent:"center"}}>{unread}</span>}
      </button>

      {open&&<>
        <div className="kboverlay" onClick={()=>setOpen(false)}/>
        <div className="kbpanel">

          {/* HEADER */}
          <div style={{gridColumn:"1/-1",background:"linear-gradient(135deg,#6D28D9 0%,#3B0764 100%)",
            padding:"15px 20px",display:"flex",alignItems:"center",gap:12,flexShrink:0,position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:-60,right:-50,width:200,height:200,borderRadius:"50%",background:"rgba(255,255,255,.04)",pointerEvents:"none"}}/>
            <div style={{position:"relative",flexShrink:0}}>
              <div style={{width:50,height:50,borderRadius:"50%",background:"rgba(255,255,255,.14)",
                border:"2px solid rgba(255,255,255,.28)",display:"flex",alignItems:"center",
                justifyContent:"center",fontSize:22,boxShadow:"0 0 0 6px rgba(255,255,255,.06)"}}>✨</div>
              <span style={{position:"absolute",bottom:2,right:2,width:13,height:13,borderRadius:"50%",
                background:"#34D399",border:"2.5px solid #4C1D95",animation:"kbPulse 2s ease infinite"}}/>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"1.08rem",fontWeight:700,color:"#fff",lineHeight:1.2}}>
                Isabel · Asesora Kosmica
              </div>
              <div style={{fontSize:".72rem",color:"rgba(255,255,255,.82)",display:"flex",alignItems:"center",gap:5,marginTop:3}}>
                <span style={{width:6,height:6,background:"#34D399",borderRadius:"50%"}}/>
                En línea ahora
                <span style={{fontSize:".6rem",fontWeight:800,padding:"2px 8px",borderRadius:8,
                  background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.22)",
                  color:"rgba(255,255,255,.92)",textTransform:"uppercase",marginLeft:4,letterSpacing:".08em"}}>IA Pro</span>
              </div>
            </div>
            <button onClick={()=>setOpen(false)} style={{width:35,height:35,flexShrink:0,
              background:"rgba(255,255,255,.12)",border:"1.5px solid rgba(255,255,255,.24)",
              borderRadius:"50%",color:"#fff",fontSize:14,cursor:"pointer",
              display:"flex",alignItems:"center",justifyContent:"center",transition:"all .2s"}}
              onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,.26)";e.currentTarget.style.transform="rotate(90deg)";}}
              onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,.12)";e.currentTarget.style.transform="";}}>✕</button>
          </div>

          {/* CATEGORÍAS */}
          <div style={{gridColumn:"1/-1",background:"linear-gradient(135deg,#5B21B6,#3B0764)",
            padding:"8px 16px",display:"flex",gap:6,overflowX:"auto",
            scrollbarWidth:"none",borderBottom:"1px solid rgba(0,0,0,.1)",flexShrink:0}}>
            {CATS.map(c=><button key={c.label} className={`kbcat${activeCat===c.label?" on":""}`}
              onClick={()=>handleCat(c)} disabled={loading||!ready}>{c.label}</button>)}
          </div>

          {/* CHAT */}
          <div style={{display:"flex",flexDirection:"column",background:"#F0EAFC",overflow:"hidden",
            borderRight:"1px solid #E8DEFA",position:"relative"}}>

            {toast&&<div style={{position:"absolute",top:12,left:"50%",transform:"translateX(-50%)",
              padding:"7px 20px",borderRadius:22,fontSize:".72rem",fontWeight:700,whiteSpace:"nowrap",
              animation:"kbToast .3s ease",zIndex:20,pointerEvents:"none",color:"#fff",
              fontFamily:"'DM Sans',sans-serif",
              background:toast.type==="cart"?"linear-gradient(135deg,#10B981,#065F46)":"linear-gradient(135deg,#6D28D9,#3B0764)",
              boxShadow:toast.type==="cart"?"0 5px 20px rgba(16,185,129,.5)":"0 5px 20px rgba(109,40,217,.5)"}}>
              {toast.msg}</div>}

            {!ready?(
              <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:14,padding:30}}>
                <div style={{width:44,height:44,borderRadius:"50%",border:"3px solid #E8DEFA",borderTopColor:"#6D28D9",animation:"kbSpin .8s linear infinite"}}/>
                <div style={{fontSize:".84rem",color:"#9D8BC4",textAlign:"center",lineHeight:1.7}}>Cargando el catálogo...<br/>Un momento 💜</div>
              </div>
            ):<>
              {error&&<div style={{margin:"8px 12px",padding:"10px 14px",background:"#FFF1F2",
                border:"1px solid #FDA4A4",borderRadius:12,display:"flex",gap:10,alignItems:"flex-start"}}>
                <span style={{fontSize:18,flexShrink:0}}>⚠️</span>
                <div>
                  <div style={{fontSize:".78rem",color:"#991B1B",lineHeight:1.5,fontWeight:500}}>Error: {error}</div>
                  <button onClick={()=>{setError(null);send(lastMsg);}}
                    style={{marginTop:6,padding:"4px 14px",borderRadius:8,background:"#FDA4A4",border:"none",
                      color:"#7F1D1D",fontSize:".72rem",fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
                    Reintentar
                  </button>
                </div>
              </div>}

              <div className="kbmsgs">
                {msgs.map((msg,i)=>(
                  <div key={i}>
                    <div style={{display:"flex",gap:8,alignItems:"flex-end",flexDirection:msg.role==="user"?"row-reverse":"row"}}>
                      <div style={{width:32,height:32,borderRadius:"50%",flexShrink:0,display:"flex",
                        alignItems:"center",justifyContent:"center",fontSize:14,
                        background:msg.role==="bot"?"linear-gradient(135deg,#6D28D9,#3B0764)":"#E8DEFA",
                        boxShadow:msg.role==="bot"?"0 3px 10px rgba(109,40,217,.35)":"none"}}>
                        {msg.role==="bot"?"✨":"👤"}
                      </div>
                      <div style={{padding:"11px 15px",borderRadius:18,fontSize:".875rem",lineHeight:1.65,
                        maxWidth:295,wordBreak:"break-word",whiteSpace:"pre-line",fontFamily:"'DM Sans',sans-serif",
                        ...(msg.role==="bot"?{background:"#fff",color:"#1C0845",borderBottomLeftRadius:4,
                          boxShadow:"0 2px 10px rgba(0,0,0,.07)",border:"1px solid #EDE8FA"}
                          :{background:"linear-gradient(135deg,#6D28D9,#3B0764)",color:"#fff",
                            borderBottomRightRadius:4,boxShadow:"0 4px 16px rgba(109,40,217,.4)"})}}>
                        {msg.quick&&<div style={{fontSize:".58rem",fontWeight:700,letterSpacing:".08em",padding:"2px 7px",
                          borderRadius:7,background:"#EDE8FA",color:"#6D28D9",display:"inline-block",
                          marginBottom:6,textTransform:"uppercase"}}>Respuesta rápida</div>}
                        {msg.content}
                      </div>
                    </div>
                    {msg.sugs?.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:6,padding:"6px 0 2px",marginLeft:40}}>
                      {msg.sugs.map(s=><button key={s} className="kbsug" onClick={()=>{const cat=CATS.find(c=>c.label===s);cat?handleCat(cat):send(s);}}>{s}</button>)}
                    </div>}
                    {i===0&&msgs.length===1&&!msg.sugs&&<div style={{display:"flex",flexWrap:"wrap",gap:6,padding:"6px 0 2px",marginLeft:40}}>
                      {["¿Qué bolso está de moda? 👜","Busco regalo para mi mamá 🎁","Los más vendidos ⭐","¿Qué hay en oferta? 🏷️"].map(s=><button key={s} className="kbsug" onClick={()=>send(s)}>{s}</button>)}
                    </div>}
                  </div>
                ))}
                {loading&&<div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
                  <div style={{width:32,height:32,borderRadius:"50%",display:"flex",alignItems:"center",
                    justifyContent:"center",fontSize:14,background:"linear-gradient(135deg,#6D28D9,#3B0764)",
                    boxShadow:"0 3px 10px rgba(109,40,217,.35)"}}>✨</div>
                  <div style={{padding:"11px 16px",borderRadius:18,borderBottomLeftRadius:4,
                    background:"#fff",border:"1px solid #EDE8FA",boxShadow:"0 2px 10px rgba(0,0,0,.07)"}}>
                    <div style={{display:"flex",gap:5,alignItems:"center"}}>
                      {[0,200,400].map(d=><span key={d} style={{width:7,height:7,background:"#8B5CF6",
                        borderRadius:"50%",animation:`kbBounce 1.3s ${d}ms infinite`}}/>)}
                    </div>
                  </div>
                </div>}
                <div ref={bottomRef}/>
              </div>

              <div style={{padding:"11px 13px",borderTop:"1px solid #EDE8FA",display:"flex",gap:8,
                alignItems:"center",background:"#fff",boxShadow:"0 -3px 16px rgba(0,0,0,.04)"}}>
                <input ref={inputRef} className="kbinput" placeholder="Cuéntame qué buscas..."
                  value={input} onChange={e=>setInput(e.target.value)} onKeyDown={handleKey} disabled={loading}/>
                <button onClick={()=>send()} disabled={loading||!input.trim()} style={{width:44,height:44,
                  flexShrink:0,background:"linear-gradient(135deg,#6D28D9,#3B0764)",border:"none",
                  borderRadius:"50%",color:"#fff",fontSize:17,cursor:"pointer",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  opacity:loading||!input.trim()?0.32:1,
                  boxShadow:"0 4px 16px rgba(109,40,217,.5)",transition:"transform .15s"}}
                  onMouseEnter={e=>{if(!loading&&input.trim())e.currentTarget.style.transform="scale(1.12)";}}
                  onMouseLeave={e=>e.currentTarget.style.transform=""}>➤</button>
              </div>
            </>}
          </div>

          {/* PANEL LATERAL */}
          <div className="kbside" style={{background:"#fff",display:"flex",flexDirection:"column",overflow:"hidden",borderLeft:"1px solid #EDE8FA"}}>
            <div style={{padding:"14px 16px 12px",borderBottom:"1px solid #EDE8FA",display:"flex",
              alignItems:"center",justifyContent:"space-between",flexShrink:0,
              background:"linear-gradient(to bottom,#FDFBFF,#F7F3FF)"}}>
              <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".96rem",fontWeight:700,color:"#1C0845"}}>
                Recomendaciones
              </span>
              {shown.length>0&&<span style={{fontSize:".67rem",fontWeight:800,color:"#fff",
                background:"linear-gradient(135deg,#6D28D9,#3B0764)",padding:"3px 10px",
                borderRadius:11,letterSpacing:".03em"}}>{shown.length}</span>}
            </div>

            {shown.length===0?(
              <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",
                justifyContent:"center",gap:12,padding:"28px 20px",textAlign:"center"}}>
                <div style={{fontSize:40,opacity:.18}}>✨</div>
                <div style={{fontSize:".8rem",color:"#B0A0CC",lineHeight:1.7}}>
                  Cuéntale a Isabel qué buscas y aquí verás los productos con foto, precio y opción de agregar al carrito.
                </div>
              </div>
            ):(
              <div className="kbside-scroll">
                {shown.map(p=>(
                  <ProductCard key={p.id} prod={p}
                    onView={prod=>{onProductClick?.(prod);setOpen(false);}}
                    onAdd={(prod,e)=>handleAdd(prod,e)}
                    isAdded={added.has(p.id)}/>
                ))}
              </div>
            )}
          </div>

        </div>
      </>}
    </>
  );
}
