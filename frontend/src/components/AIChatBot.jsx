// ═══════════════════════════════════════════════════════════
//  AIChatBot.jsx — Isabel, Asesora IA de Kosmica  v14.0
//  ✅ Coherente con CUALQUIER solicitud del cliente
//  ✅ Conoce TODO el catálogo dinámicamente (todas las categorías)
//  ✅ Fallback local si la IA falla — siempre muestra productos
//  ✅ Cierre de ventas profesional
//  ✅ Envío coordinado por asesor
//  ✅ UI viral y premium
// ═══════════════════════════════════════════════════════════
import { useState, useEffect, useRef, useCallback, useMemo } from "react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "https://kosmica-backend.onrender.com";
const MAX_HISTORY  = 12;

// ─────────────────────────────────────────────────────────
//  Formateo de moneda
// ─────────────────────────────────────────────────────────
const fmtCOP = n =>
  new Intl.NumberFormat("es-CO", { style:"currency", currency:"COP", maximumFractionDigits:0 }).format(n);

// ─────────────────────────────────────────────────────────
//  Emojis por categoría
// ─────────────────────────────────────────────────────────
const catEmoji = (c = "") => {
  const u = c.toUpperCase();
  if (u.includes("BOLSO") || u.includes("MORRAL") || u.includes("CARTERA")) return "👜";
  if (u.includes("MAQUILLAJE") || u.includes("MAKE") || u.includes("COSM")) return "💄";
  if (u.includes("CAPILAR") || u.includes("CABELLO") || u.includes("PELO")) return "✨";
  if (u.includes("ACCESORIO") || u.includes("JOYA") || u.includes("BISUT")) return "💍";
  if (u.includes("BILLETERA") || u.includes("WALLET") || u.includes("MONEDERO")) return "💳";
  if (u.includes("CUIDADO") || u.includes("PERSONAL") || u.includes("SKIN") || u.includes("CREMA")) return "🧴";
  if (u.includes("PERFUME") || u.includes("FRAGANCIA") || u.includes("COLONIA")) return "🌸";
  if (u.includes("ROPA") || u.includes("VESTIDO") || u.includes("BLUSA")) return "👗";
  if (u.includes("CALZADO") || u.includes("ZAPATO") || u.includes("SANDAL")) return "👠";
  return "🛍️";
};

// ─────────────────────────────────────────────────────────
//  Respuestas instantáneas (sin API) para preguntas comunes
// ─────────────────────────────────────────────────────────
const QUICK_INTENTS = [
  {
    test: /^(hola|buenas|buenos días|buenas tardes|buenas noches|hey|hi|ey|ola)\b/i,
    reply: "¡Hola! Soy Isabel, tu asesora personal de Kosmica 💜\n¿Buscas algo para ti o es un regalo especial?",
    sugs: ["Para mí 💜", "Es un regalo 🎁", "Ver ofertas 🏷️", "Lo más vendido ⭐"],
  },
  {
    test: /envío|domicilio|despacho|transporte|transportadora|flete|costo.*envío|precio.*envío/i,
    reply: "El valor del envío lo coordina un asesor contigo después de tu pedido 🚚\nEl proceso es súper fácil: pagas los productos y listo. ¿Te ayudo a elegir algo?",
    sugs: ["Ver catálogo 🛍️", "Ver ofertas 🏷️", "Lo más vendido ⭐"],
  },
  {
    test: /pago|mercadopago|tarjeta|pse|nequi|daviplata|efectivo|como pago/i,
    reply: "Aceptamos MercadoPago: tarjeta débito/crédito, PSE, Nequi, Daviplata y efectivo 💳\nTodo 100% seguro y encriptado.",
    sugs: ["Ver catálogo 🛍️", "Ver ofertas 🏷️"],
  },
  {
    test: /devolución|cambio|garantía|devolver|me llegó mal/i,
    reply: "Tienes 15 días para cambios si el producto llega con defecto 💜\nEscríbenos a hola@kosmica.com con fotos y lo resolvemos rápido.",
    sugs: ["Ver productos 🛍️"],
  },
  {
    test: /cuanto.*demora|cuando.*llega|tiempo.*entrega|dias.*entrega/i,
    reply: "Los tiempos de entrega los confirma el asesor según tu ciudad 📦\nNormalmente entre 2 y 5 días hábiles en Colombia.",
    sugs: ["Ver catálogo 🛍️"],
  },
  {
    test: /whatsapp|telefono|teléfono|contacto|llamar|hablar con alguien/i,
    reply: "Puedes escribirnos por WhatsApp al número que aparece en la página 📱\nO a hola@kosmica.com. ¡Respondemos rápido!",
    sugs: ["Ver productos 🛍️"],
  },
  {
    test: /gracias|thank|muchas gracias|genial|perfecto|excelente|chevere/i,
    reply: "¡Con gusto, reina! Para eso estoy ✨ ¿Te ayudo con algo más?",
    sugs: ["Ver más productos 🛍️", "Ver ofertas 🏷️"],
  },
  {
    test: /adios|chao|bye|hasta luego|nos vemos/i,
    reply: "¡Hasta pronto! Fue un placer atenderte 💜 Vuelve cuando quieras.",
    sugs: [],
  },
];

// ─────────────────────────────────────────────────────────
//  Construir catálogo completo para la IA
// ─────────────────────────────────────────────────────────
function buildCatalog(products) {
  const avail = products.filter(p => p.stock > 0);
  const groups = {};
  avail.forEach(p => {
    const cat = (p.category?.trim()) || "General";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push({
      id: p.id,
      nombre: p.name,
      precio: fmtCOP(p.price),
      desc: (p.description || "").slice(0, 100),
      rating: p.rating || null,
      stock: p.stock,
      badge: p.badge || null,
    });
  });
  return groups;
}

// ─────────────────────────────────────────────────────────
//  System prompt — Isabel conoce TODO el catálogo
// ─────────────────────────────────────────────────────────
function buildSystemPrompt(catalog, catNames) {
  const catalogStr = Object.entries(catalog)
    .map(([cat, prods]) =>
      `\n## ${cat.toUpperCase()} (${prods.length} productos)\n` +
      prods.map(p =>
        `  [ID:${p.id}] ${p.nombre} | ${p.precio}` +
        `${p.badge ? " [" + p.badge + "]" : ""}` +
        `${p.stock <= 5 ? " ⚡ÚLTIMAS " + p.stock + " UNIDADES" : ""}` +
        `${p.rating ? " ★" + p.rating : ""}` +
        `${p.desc ? " | " + p.desc : ""}`
      ).join("\n")
    ).join("\n");

  return `Eres ISABEL, asesora de ventas experta de KOSMICA, tienda colombiana de moda, accesorios y belleza.

PERSONALIDAD:
- Colombiana auténtica, cálida y directa. Siempre tutea.
- Respuestas CORTAS: máximo 3 líneas de texto + productos si aplica.
- Máximo 2 emojis por respuesta.
- NUNCA empieces con "¡Claro!", "Por supuesto" ni "Entendido".
- Si no entiendes algo, pregunta de forma corta y simpática.

TU META: CERRAR VENTAS. Cada respuesta debe acercar al cliente a comprar.

PROCESO DE VENTA:
1. ESCUCHA: Si el cliente es vago ("quiero algo bonito"), pregunta: ocasión, para quién, presupuesto — UNA pregunta a la vez.
2. RECOMIENDA: Máximo 2-3 productos. Explica en 1 frase POR QUÉ cada uno le sirve a ESA persona.
3. URGENCIA: Menciona stock bajo o badge OFERTA/NUEVO cuando aplique.
4. CIERRA: SIEMPRE termina con una pregunta de cierre: "¿Lo agregamos?" o "¿Cuál prefieres, el [A] o el [B]?"
5. OBJECIONES:
   - "Está caro" → ofrece inmediatamente una opción más económica del catálogo
   - "Lo pienso" → "¿Qué duda te queda? Te ayudo a decidir 💜"
   - "No sé qué elegir" → haz UNA pregunta (ocasión O presupuesto)
   - "¿Es de buena calidad?" → cita el rating ★ y menciona la garantía

SOBRE EL ENVÍO: Si preguntan → di SOLO: "El valor del envío lo coordina un asesor contigo 🚚"
NUNCA inventes un precio de envío.

CATEGORÍAS DISPONIBLES: ${catNames.join(", ")}

CATÁLOGO COMPLETO (recomienda de CUALQUIER categoría según lo que pida el cliente):
${catalogStr}

REGLA CRÍTICA: Al final de toda respuesta donde menciones productos específicos, escribe EXACTAMENTE:
PRODUCTOS_RECOMENDADOS:id1,id2,id3

Solo IDs numéricos separados por coma, sin espacios extra.
Si no recomiendas productos concretos, NO escribas esa línea.
NUNCA inventes productos, nombres ni precios. Solo usa IDs del catálogo de arriba.`;
}

// ─────────────────────────────────────────────────────────
//  Búsqueda local de productos (fallback cuando la IA falla)
// ─────────────────────────────────────────────────────────
function searchProducts(products, query) {
  const q = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const avail = products.filter(p => p.stock > 0);

  // Por categoría real
  const catNames = [...new Set(avail.map(p => p.category).filter(Boolean))];
  let byCat = [];
  for (const cat of catNames) {
    const cn = cat.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const words = cn.split(/[\s\/\-&]+/).filter(w => w.length > 2);
    if (words.some(w => q.includes(w)) || q.includes(cn)) {
      byCat = avail.filter(p => p.category === cat);
      break;
    }
  }

  // Sinónimos
  if (!byCat.length) {
    const SYNS = {
      bolso:["bolso","morral","cartera","tote","clutch","bolsa"],
      morral:["bolso","morral","mochila"],
      maquillaje:["maquillaje","make","cosmet","labial","sombra","base","rubor"],
      labial:["maquillaje","labial"],
      capilar:["capilar","cabello","pelo","shampoo","keratina"],
      accesorio:["accesorio","collar","aretes","pulsera","anillo"],
      billetera:["billetera","monedero","wallet"],
      cuidado:["cuidado","personal","crema","serum","facial"],
      perfume:["perfume","fragancia","colonia"],
    };
    for (const [kw, aliases] of Object.entries(SYNS)) {
      if (q.includes(kw)) {
        for (const cat of catNames) {
          const cn = cat.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          if (aliases.some(a => cn.includes(a))) { byCat = avail.filter(p => p.category === cat); break; }
        }
        if (byCat.length) break;
      }
    }
  }

  // Por intención
  let byIntent = [];
  if (/oferta|descuento|promo/i.test(q))               byIntent = avail.filter(p => p.badge === "OFERTA");
  else if (/nuevo|novedad/i.test(q))                   byIntent = avail.filter(p => p.badge === "NUEVO");
  else if (/popular|vendido|moda|top|mejor/i.test(q))  byIntent = [...avail].sort((a,b) => (b.rating||0)-(a.rating||0)).slice(0,6);
  else if (/regalo|mama|amiga|mujer/i.test(q))         byIntent = [...avail].sort((a,b) => (b.rating||0)-(a.rating||0)).slice(0,6);

  // Por texto
  const words = q.split(/\s+/).filter(w => w.length > 3);
  const byText = words.length
    ? avail.filter(p => words.some(w => p.name?.toLowerCase().includes(w) || p.description?.toLowerCase().includes(w)))
    : [];

  const seen = new Set(), merged = [];
  for (const p of [...byCat, ...byIntent, ...byText])
    if (!seen.has(p.id)) { seen.add(p.id); merged.push(p); }

  const result = merged.length ? merged : [...avail].sort((a,b) => (b.rating||0)-(a.rating||0));
  return result.slice(0, 5);
}

// ─────────────────────────────────────────────────────────
//  Parsear respuesta IA
// ─────────────────────────────────────────────────────────
const extractIds = text => {
  const m = text.match(/PRODUCTOS_RECOMENDADOS:\[?([\d,\s]+)\]?/);
  if (!m) return [];
  return m[1].split(",").map(s => s.trim()).filter(Boolean);
};
const cleanText = text => text.replace(/PRODUCTOS_RECOMENDADOS:\[?[\d,\s]+\]?/g, "").trim();

// ─────────────────────────────────────────────────────────
//  Llamada al backend
// ─────────────────────────────────────────────────────────
async function callIsabel(systemPrompt, messages) {
  const res = await fetch(`${BACKEND_URL}/api/ai/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system: systemPrompt, messages, max_tokens: 600 }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Error ${res.status}`);
  }
  const data = await res.json();
  return data.content?.[0]?.text ?? "";
}

// ─────────────────────────────────────────────────────────
//  Estrellas
// ─────────────────────────────────────────────────────────
const Stars = ({ rating = 0 }) => (
  <span style={{ display:"flex", gap:1 }}>
    {[1,2,3,4,5].map(i => (
      <span key={i} style={{ fontSize:10, color: i <= Math.round(rating) ? "#FBBF24" : "#ddd0f8" }}>★</span>
    ))}
  </span>
);

// ─────────────────────────────────────────────────────────
//  Tarjeta de producto inline
// ─────────────────────────────────────────────────────────
const ProductCard = ({ prod, onAdd, onView, isAdded }) => {
  const [imgOk, setImgOk] = useState(null);
  const emoji = catEmoji(prod.category || "");

  useEffect(() => {
    if (!prod.imageUrl) { setImgOk(false); return; }
    setImgOk(null);
    const img = new window.Image();
    img.onload  = () => setImgOk(true);
    img.onerror = () => setImgOk(false);
    img.src = prod.imageUrl;
    return () => { img.onload = null; img.onerror = null; };
  }, [prod.imageUrl]);

  return (
    <div
      onClick={() => onView(prod)}
      style={{
        display:"flex", borderRadius:16, overflow:"hidden",
        background:"#fff", boxShadow:"0 2px 14px rgba(109,40,217,.1)",
        border:"1px solid #ede8ff", cursor:"pointer",
        transition:"transform .18s, box-shadow .18s", minHeight:96,
      }}
      onMouseEnter={e => { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 8px 26px rgba(109,40,217,.2)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow="0 2px 14px rgba(109,40,217,.1)"; }}
    >
      {/* Imagen */}
      <div style={{
        width:96, minWidth:96, background:"#f8f5ff",
        display:"flex", alignItems:"center", justifyContent:"center",
        position:"relative", overflow:"hidden", flexShrink:0,
      }}>
        {imgOk === null && (
          <div style={{ width:18, height:18, borderRadius:"50%", border:"2.5px solid #e8defa", borderTopColor:"#7c3aed", animation:"isaSpin .7s linear infinite" }}/>
        )}
        {prod.imageUrl && (
          <img src={prod.imageUrl} alt={prod.name} style={{
            position:"absolute", inset:0, width:"100%", height:"100%",
            objectFit:"cover", opacity: imgOk ? 1 : 0, transition:"opacity .3s",
          }}/>
        )}
        {imgOk === false && <div style={{ fontSize:30, opacity:.4 }}>{emoji}</div>}
        {prod.badge && (
          <span style={{
            position:"absolute", top:5, left:5, zIndex:2,
            fontSize:".45rem", fontWeight:900, letterSpacing:".06em",
            padding:"2px 6px", borderRadius:20, color:"#fff", textTransform:"uppercase",
            background: prod.badge === "OFERTA"
              ? "linear-gradient(135deg,#f43f5e,#be123c)"
              : "linear-gradient(135deg,#7c3aed,#4c1d95)",
          }}>{prod.badge}</span>
        )}
        {prod.stock > 0 && prod.stock <= 5 && (
          <span style={{
            position:"absolute", bottom:4, left:4, zIndex:2,
            fontSize:".42rem", fontWeight:800, padding:"2px 5px", borderRadius:20,
            background:"rgba(0,0,0,.65)", color:"#fcd34d",
          }}>⚡{prod.stock}</span>
        )}
      </div>

      {/* Info */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"space-between", padding:"9px 11px", minWidth:0 }}>
        <div>
          {prod.category && (
            <div style={{ fontSize:".58rem", color:"#9d8bc4", fontWeight:700, marginBottom:2, textTransform:"uppercase", letterSpacing:".07em" }}>
              {prod.category}
            </div>
          )}
          <div style={{
            fontSize:".8rem", fontWeight:700, color:"#1e0a4a", lineHeight:1.3,
            display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden",
          }}>{prod.name}</div>
          {prod.rating > 0 && <div style={{ marginTop:3 }}><Stars rating={prod.rating}/></div>}
        </div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:6, marginTop:7 }}>
          <div style={{ fontSize:".95rem", fontWeight:900, color:"#6d28d9", letterSpacing:"-.02em" }}>
            {fmtCOP(prod.price)}
          </div>
          <button
            onClick={e => { e.stopPropagation(); onAdd(prod, e); }}
            style={{
              padding:"5px 11px", borderRadius:20, border:"none", cursor:"pointer",
              fontSize:".68rem", fontWeight:800,
              background: isAdded
                ? "linear-gradient(135deg,#10b981,#065f46)"
                : "linear-gradient(135deg,#7c3aed,#4c1d95)",
              color:"#fff",
              boxShadow: isAdded ? "0 2px 8px rgba(16,185,129,.4)" : "0 2px 8px rgba(124,58,237,.4)",
              transition:"all .2s",
            }}
          >
            {isAdded ? "✓ Listo" : "🛒 Agregar"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────
//  ESTILOS GLOBALES
// ─────────────────────────────────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,600;0,9..40,700;0,9..40,800&display=swap');

  @keyframes isaSpin    { to { transform:rotate(360deg) } }
  @keyframes isaSlideUp { from{transform:translateY(70px);opacity:0} to{transform:translateY(0);opacity:1} }
  @keyframes isaFadeIn  { from{opacity:0} to{opacity:1} }
  @keyframes isaBounce  { 0%,60%,100%{transform:translateY(0);opacity:.2} 30%{transform:translateY(-6px);opacity:1} }
  @keyframes isaRing    { 0%,100%{box-shadow:0 6px 24px rgba(91,33,182,.6),0 0 0 0 rgba(139,92,246,.5)} 50%{box-shadow:0 6px 24px rgba(91,33,182,.6),0 0 0 12px rgba(139,92,246,0)} }
  @keyframes isaOnline  { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.3)} }
  @keyframes isaCardIn  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes isaToast   { from{opacity:0;transform:translateX(-50%) scale(.88)} to{opacity:1;transform:translateX(-50%) scale(1)} }

  .isa-fab {
    position:fixed; bottom:24px; right:24px; width:60px; height:60px;
    border-radius:50%; background:linear-gradient(145deg,#8b5cf6,#5b21b6);
    border:none; cursor:pointer; display:flex; align-items:center;
    justify-content:center; font-size:24px; z-index:10000;
    transition:transform .2s; animation:isaRing 3.5s ease infinite;
    box-shadow:0 6px 24px rgba(91,33,182,.6);
  }
  .isa-fab:hover { transform:scale(1.12) rotate(-8deg); }
  .isa-fab:active { transform:scale(.95); }

  .isa-overlay {
    position:fixed; inset:0; background:rgba(8,0,24,.65);
    backdrop-filter:blur(8px); z-index:9998; animation:isaFadeIn .2s;
  }

  .isa-panel {
    position:fixed; bottom:0; right:0; width:500px; height:90vh;
    max-width:100vw; max-height:100vh;
    background:#f4f0fe; border-radius:22px 22px 0 0;
    display:flex; flex-direction:column; overflow:hidden;
    z-index:9999; box-shadow:-4px 0 40px rgba(0,0,0,.3);
    animation:isaSlideUp .32s cubic-bezier(.34,1.1,.64,1);
    font-family:'DM Sans',sans-serif;
  }
  @media(max-width:520px) {
    .isa-panel { width:100vw; height:92vh; border-radius:18px 18px 0 0; }
    .isa-fab   { bottom:20px; right:16px; width:54px; height:54px; font-size:21px; }
  }

  .isa-cat {
    flex-shrink:0; padding:5px 12px; border-radius:20px;
    background:rgba(255,255,255,.13); border:1.5px solid rgba(255,255,255,.22);
    color:#fff; font-size:.67rem; font-weight:700; cursor:pointer;
    white-space:nowrap; transition:all .15s; font-family:'DM Sans',sans-serif;
  }
  .isa-cat:hover, .isa-cat.on {
    background:rgba(255,255,255,.3); border-color:rgba(255,255,255,.7);
    transform:translateY(-1px);
  }
  .isa-cat:disabled { opacity:.35; cursor:default; transform:none; }

  .isa-sug {
    background:#fff; border:1.5px solid #cdb8f0; color:#5b21b6;
    border-radius:20px; padding:5px 12px; font-size:.71rem; font-weight:700;
    cursor:pointer; white-space:nowrap; transition:all .15s;
    font-family:'DM Sans',sans-serif; box-shadow:0 1px 5px rgba(91,33,182,.07);
  }
  .isa-sug:hover {
    background:linear-gradient(135deg,#7c3aed,#4c1d95); color:#fff;
    border-color:transparent; transform:translateY(-2px);
    box-shadow:0 4px 14px rgba(124,58,237,.4);
  }

  .isa-input {
    flex:1; border:1.5px solid #ddd0f8; border-radius:24px; padding:10px 16px;
    font-size:.875rem; color:#1e0a4a; outline:none; background:#faf7ff;
    transition:border-color .18s, box-shadow .18s; font-family:'DM Sans',sans-serif;
  }
  .isa-input:focus { border-color:#7c3aed; box-shadow:0 0 0 3px rgba(124,58,237,.12); }
  .isa-input::placeholder { color:#b8a8d4; }
  .isa-input:disabled { opacity:.6; }

  .isa-msgs {
    flex:1; overflow-y:auto; padding:14px 12px 8px;
    display:flex; flex-direction:column; gap:10px;
    scrollbar-width:thin; scrollbar-color:#ddd0f8 transparent;
  }
  .isa-msgs::-webkit-scrollbar { width:3px; }
  .isa-msgs::-webkit-scrollbar-thumb { background:#ddd0f8; border-radius:3px; }

  .isa-card-grid {
    display:flex; flex-direction:column; gap:7px;
    margin-top:8px; margin-left:36px;
    animation:isaCardIn .3s ease both;
  }

  .isa-send-btn {
    width:42px; height:42px; flex-shrink:0; border:none; border-radius:50%;
    background:linear-gradient(135deg,#7c3aed,#4c1d95); color:#fff;
    font-size:16px; cursor:pointer; display:flex; align-items:center;
    justify-content:center; transition:all .15s;
    box-shadow:0 3px 12px rgba(124,58,237,.5);
  }
  .isa-send-btn:hover:not(:disabled) { transform:scale(1.1); box-shadow:0 5px 18px rgba(124,58,237,.6); }
  .isa-send-btn:disabled { opacity:.28; cursor:default; }
`;

// ─────────────────────────────────────────────────────────
//  Categorías fijas de acceso rápido
// ─────────────────────────────────────────────────────────
const FIXED_CATS = [
  { label:"🏷️ Ofertas",    q:"¿Qué productos están en oferta ahora?" },
  { label:"⭐ Top ventas",  q:"¿Cuáles son los más vendidos?" },
  { label:"🆕 Novedades",  q:"¿Qué hay nuevo en el catálogo?" },
  { label:"🎁 Regalos",    q:"Necesito ideas para un regalo especial" },
  { label:"💰 Económicos", q:"¿Qué hay a buen precio?" },
];

// ═══════════════════════════════════════════════════════════
//  COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════
export default function AIChatBot({ products = [], onProductClick, onAddToCart }) {

  useEffect(() => {
    if (products.length > 0) {
      const cats = [...new Set(products.map(p => p.category).filter(Boolean))];
      console.log(`[Isabel] ✅ ${products.length} productos, categorías:`, cats);
    } else {
      console.warn("[Isabel] ⚠️ Sin catálogo todavía...");
    }
  }, [products]);

  const INIT = {
    role: "bot",
    content: "¡Hola! Soy Isabel, tu asesora de Kosmica ✨\n¿Buscas algo para ti o es un regalo especial?",
    sugs: ["Para mí 💜", "Es un regalo 🎁", "Ver ofertas 🏷️", "Lo más vendido ⭐"],
  };

  const [open,      setOpen]      = useState(false);
  const [msgs,      setMsgs]      = useState([INIT]);
  const [added,     setAdded]     = useState(new Set());
  const [input,     setInput]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const [unread,    setUnread]    = useState(1);
  const [activeCat, setActiveCat] = useState(null);
  const [toast,     setToast]     = useState(null);
  const [lastMsg,   setLastMsg]   = useState("");

  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  const ready = products.length > 0;

  const catalog  = useMemo(() => buildCatalog(products), [products]);
  const catNames = useMemo(() => Object.keys(catalog), [catalog]);
  const prodMap  = useMemo(() => {
    const m = new Map();
    products.forEach(p => {
      m.set(p.id, p);
      m.set(Number(p.id), p);
      m.set(String(p.id), p);
    });
    return m;
  }, [products]);

  const dynCats = useMemo(() =>
    catNames.map(name => ({
      label: `${catEmoji(name)} ${name}`,
      q: `Muéstrame los productos de ${name}`,
    })),
    [catNames]
  );
  const allCats = useMemo(() => [...dynCats, ...FIXED_CATS], [dynCats]);

  useEffect(() => {
    if (open) { setUnread(0); setTimeout(() => inputRef.current?.focus(), 150); }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [msgs, loading]);

  const showToast = useCallback((msg, type = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  }, []);

  const handleAdd = useCallback((prod, e) => {
    e?.stopPropagation();
    if (!prod) return;
    const full = prodMap.get(prod.id) || prodMap.get(Number(prod.id)) || prod;
    if (typeof onAddToCart === "function") onAddToCart(full);
    setAdded(prev => new Set([...prev, prod.id]));
    showToast(`🛒 ${full.name || "Producto"} agregado`, "cart");
    setTimeout(() => setAdded(prev => { const n = new Set(prev); n.delete(prod.id); return n; }), 2800);
  }, [onAddToCart, showToast, prodMap]);

  const newChat = useCallback(() => {
    setMsgs([INIT]);
    setInput(""); setError(null); setActiveCat(null); setAdded(new Set());
  }, []);

  // ── ENVIAR MENSAJE ──
  const send = useCallback(async (override) => {
    const text = (override ?? input).trim();
    if (!text || loading) return;
    setInput(""); setError(null); setLastMsg(text);

    // 1. Respuesta rápida local
    const quick = QUICK_INTENTS.find(i => i.test.test(text));
    if (quick) {
      setMsgs(prev => [...prev,
        { role:"user", content:text },
        { role:"bot", content:quick.reply, sugs:quick.sugs, quick:true },
      ]);
      return;
    }

    // 2. Búsqueda local inmediata (para fallback)
    const localProds = ready ? searchProducts(products, text) : [];

    const userMsg = { role:"user", content:text };
    const history = [...msgs, userMsg];
    setMsgs(history);
    setLoading(true);

    const apiMsgs = history
      .filter(m => m.role === "user" || m.role === "bot")
      .slice(-MAX_HISTORY)
      .map(m => ({ role: m.role === "bot" ? "assistant" : "user", content: m.content }));

    try {
      const raw     = await callIsabel(buildSystemPrompt(catalog, catNames), apiMsgs);
      const ids     = extractIds(raw);
      const cleaned = cleanText(raw);

      // IDs de la IA primero; si no hay, usar búsqueda local
      let prods = ids.map(id => prodMap.get(id) || prodMap.get(Number(id))).filter(Boolean);
      if (!prods.length && localProds.length) prods = localProds;

      setMsgs(prev => [...prev, {
        role:"bot",
        content: cleaned || "Aquí van algunas opciones que podrían interesarte:",
        products: prods.length ? prods : undefined,
      }]);

      if (!open) setUnread(u => u + 1);

    } catch (err) {
      console.error("[Isabel]", err.message);
      setError(err.message);
      // Siempre mostrar algo al cliente
      setMsgs(prev => [...prev, {
        role:"bot",
        content:"Tuve un problema de conexión, pero aquí van opciones que podrían gustarte:",
        products: localProds.length ? localProds : undefined,
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, msgs, catalog, catNames, prodMap, products, ready, open]);

  const handleKey = e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } };
  const handleCat = cat => { setActiveCat(cat.label); send(cat.q); };

  // ── RENDER ──
  return (
    <>
      <style>{STYLES}</style>

      {/* FAB flotante */}
      {!open && (
        <button className="isa-fab" onClick={() => setOpen(true)} title="Habla con Isabel">
          ✨
          {unread > 0 && (
            <span style={{
              position:"absolute", top:-3, right:-3,
              width:20, height:20, borderRadius:"50%",
              background:"#ef4444", border:"2.5px solid #fff",
              fontSize:9, fontWeight:900, color:"#fff",
              display:"flex", alignItems:"center", justifyContent:"center",
            }}>{unread}</span>
          )}
        </button>
      )}

      {open && (
        <>
          <div className="isa-overlay" onClick={() => setOpen(false)}/>
          <div className="isa-panel">

            {/* ── HEADER ── */}
            <div style={{
              background:"linear-gradient(135deg,#5b21b6 0%,#3b0764 100%)",
              padding:"12px 14px", display:"flex", alignItems:"center", gap:10,
              flexShrink:0, position:"relative", overflow:"hidden",
            }}>
              <div style={{ position:"absolute", top:-40, right:-30, width:160, height:160, borderRadius:"50%", background:"rgba(255,255,255,.03)", pointerEvents:"none" }}/>

              {/* Avatar */}
              <div style={{ position:"relative", flexShrink:0 }}>
                <div style={{
                  width:44, height:44, borderRadius:"50%",
                  background:"rgba(255,255,255,.16)", border:"2px solid rgba(255,255,255,.3)",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:20, boxShadow:"0 0 0 5px rgba(255,255,255,.05)",
                }}>✨</div>
                <span style={{
                  position:"absolute", bottom:1, right:1,
                  width:12, height:12, borderRadius:"50%",
                  background:"#34d399", border:"2px solid #3b0764",
                  animation:"isaOnline 2.5s ease infinite",
                }}/>
              </div>

              {/* Info */}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:".94rem", fontWeight:700, color:"#fff", lineHeight:1.2 }}>
                  Isabel · Asesora Kosmica
                </div>
                <div style={{ fontSize:".63rem", color:"rgba(255,255,255,.8)", display:"flex", alignItems:"center", gap:5, marginTop:2 }}>
                  <span style={{ width:6, height:6, background:"#34d399", borderRadius:"50%", flexShrink:0 }}/>
                  En línea · Conozco todo el catálogo
                  <span style={{
                    fontSize:".5rem", fontWeight:900, padding:"2px 6px", borderRadius:6,
                    background:"rgba(255,255,255,.15)", border:"1px solid rgba(255,255,255,.2)",
                    color:"rgba(255,255,255,.95)", textTransform:"uppercase", letterSpacing:".08em",
                  }}>IA Pro</span>
                </div>
              </div>

              {/* Botones */}
              {[
                { ico:"✏️", title:"Nueva conversación", action:newChat },
                { ico:"✕",  title:"Cerrar",             action:() => setOpen(false) },
              ].map(btn => (
                <button key={btn.title} onClick={btn.action} title={btn.title}
                  style={{
                    width:32, height:32, flexShrink:0,
                    background:"rgba(255,255,255,.1)",
                    border:"1.5px solid rgba(255,255,255,.2)",
                    borderRadius:"50%", color:"#fff", fontSize:13, cursor:"pointer",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    transition:"all .18s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,.28)"}
                  onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,.1)"}
                >{btn.ico}</button>
              ))}
            </div>

            {/* ── CATEGORÍAS DINÁMICAS ── */}
            <div
              style={{
                background:"linear-gradient(135deg,#4c1d95,#3b0764)",
                padding:"7px 12px", display:"flex", gap:6, overflowX:"auto",
                scrollbarWidth:"none", flexShrink:0,
                borderBottom:"1px solid rgba(0,0,0,.1)",
              }}
              onWheel={e => { e.currentTarget.scrollLeft += e.deltaY; e.preventDefault(); }}
            >
              <style>{`.isa-cats-bar::-webkit-scrollbar{display:none}`}</style>
              {!ready ? (
                <span style={{ fontSize:".64rem", color:"rgba(255,255,255,.4)", padding:"5px 2px" }}>
                  Cargando categorías...
                </span>
              ) : allCats.map(c => (
                <button
                  key={c.label}
                  className={`isa-cat${activeCat === c.label ? " on" : ""}`}
                  onClick={() => handleCat(c)}
                  disabled={loading || !ready}
                >{c.label}</button>
              ))}
            </div>

            {/* ── ÁREA MENSAJES ── */}
            <div style={{ display:"flex", flexDirection:"column", background:"#ede8fc", overflow:"hidden", flex:1, position:"relative" }}>

              {/* Toast */}
              {toast && (
                <div style={{
                  position:"absolute", top:10, left:"50%", transform:"translateX(-50%)",
                  padding:"7px 16px", borderRadius:22, fontSize:".68rem", fontWeight:700,
                  whiteSpace:"nowrap", animation:"isaToast .25s ease", zIndex:20,
                  pointerEvents:"none", color:"#fff", fontFamily:"'DM Sans',sans-serif",
                  background: toast.type === "cart"
                    ? "linear-gradient(135deg,#10b981,#065f46)"
                    : "linear-gradient(135deg,#7c3aed,#4c1d95)",
                  boxShadow: toast.type === "cart"
                    ? "0 4px 16px rgba(16,185,129,.5)"
                    : "0 4px 16px rgba(124,58,237,.5)",
                }}>{toast.msg}</div>
              )}

              {!ready ? (
                <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:12, padding:28 }}>
                  <div style={{ width:36, height:36, borderRadius:"50%", border:"3px solid #e8defa", borderTopColor:"#7c3aed", animation:"isaSpin .7s linear infinite" }}/>
                  <div style={{ fontSize:".8rem", color:"#9d8bc4", textAlign:"center", lineHeight:1.7 }}>
                    Cargando catálogo...<br/>Un momento 💜
                  </div>
                </div>
              ) : (
                <>
                  {/* Error */}
                  {error && (
                    <div style={{
                      margin:"8px 10px", padding:"10px 12px",
                      background:"#fff1f2", border:"1px solid #fda4a4",
                      borderRadius:12, display:"flex", gap:8, alignItems:"flex-start", flexShrink:0,
                    }}>
                      <span style={{ fontSize:15, flexShrink:0 }}>⚠️</span>
                      <div>
                        <div style={{ fontSize:".73rem", color:"#991b1b", lineHeight:1.5 }}>
                          Problema de conexión. ¿Reintentamos?
                        </div>
                        <button onClick={() => { setError(null); send(lastMsg); }}
                          style={{
                            marginTop:5, padding:"3px 10px", borderRadius:8,
                            background:"#fda4a4", border:"none", color:"#7f1d1d",
                            fontSize:".68rem", fontWeight:700, cursor:"pointer",
                          }}>Reintentar</button>
                      </div>
                    </div>
                  )}

                  {/* Mensajes */}
                  <div className="isa-msgs">
                    {msgs.map((msg, i) => (
                      <div key={i}>
                        {/* Burbuja */}
                        <div style={{
                          display:"flex", gap:8, alignItems:"flex-end",
                          flexDirection: msg.role === "user" ? "row-reverse" : "row",
                        }}>
                          <div style={{
                            width:28, height:28, borderRadius:"50%", flexShrink:0,
                            display:"flex", alignItems:"center", justifyContent:"center", fontSize:12,
                            background: msg.role === "bot"
                              ? "linear-gradient(135deg,#7c3aed,#4c1d95)"
                              : "#e8defa",
                            boxShadow: msg.role === "bot" ? "0 2px 8px rgba(124,58,237,.3)" : "none",
                          }}>
                            {msg.role === "bot" ? "✨" : "👤"}
                          </div>
                          <div style={{
                            padding:"9px 13px", borderRadius:16, fontSize:".84rem",
                            lineHeight:1.65, maxWidth:"78%", wordBreak:"break-word",
                            whiteSpace:"pre-line", fontFamily:"'DM Sans',sans-serif",
                            ...(msg.role === "bot"
                              ? { background:"#fff", color:"#1e0a4a", borderBottomLeftRadius:4, boxShadow:"0 2px 8px rgba(0,0,0,.06)", border:"1px solid #ede8fa" }
                              : { background:"linear-gradient(135deg,#7c3aed,#4c1d95)", color:"#fff", borderBottomRightRadius:4, boxShadow:"0 3px 12px rgba(124,58,237,.4)" }),
                          }}>
                            {msg.quick && (
                              <div style={{
                                fontSize:".5rem", fontWeight:700, letterSpacing:".08em",
                                padding:"2px 6px", borderRadius:5, background:"#ede8fa",
                                color:"#6d28d9", display:"inline-block", marginBottom:5,
                                textTransform:"uppercase",
                              }}>Respuesta rápida</div>
                            )}
                            {msg.content}
                          </div>
                        </div>

                        {/* Sugerencias */}
                        {msg.sugs?.length > 0 && (
                          <div style={{ display:"flex", flexWrap:"wrap", gap:5, padding:"5px 0 2px", marginLeft:36 }}>
                            {msg.sugs.map(s => (
                              <button key={s} className="isa-sug"
                                onClick={() => { const cat = allCats.find(c => c.label === s); cat ? handleCat(cat) : send(s); }}>
                                {s}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Sugerencias iniciales */}
                        {i === 0 && msgs.length === 1 && !msg.sugs && (
                          <div style={{ display:"flex", flexWrap:"wrap", gap:5, padding:"5px 0 2px", marginLeft:36 }}>
                            {["Ver todo 🛍️", "Los más vendidos ⭐", "Ver ofertas 🏷️", "Necesito un regalo 🎁"].map(s => (
                              <button key={s} className="isa-sug" onClick={() => send(s)}>{s}</button>
                            ))}
                          </div>
                        )}

                        {/* Tarjetas inline */}
                        {msg.products?.length > 0 && (
                          <div className="isa-card-grid">
                            {msg.products.map(p => (
                              <ProductCard
                                key={p.id} prod={p}
                                onView={prod => { onProductClick?.(prod); setOpen(false); }}
                                onAdd={(prod, e) => handleAdd(prod, e)}
                                isAdded={added.has(p.id)}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Typing indicator */}
                    {loading && (
                      <div style={{ display:"flex", gap:8, alignItems:"flex-end" }}>
                        <div style={{
                          width:28, height:28, borderRadius:"50%", flexShrink:0,
                          display:"flex", alignItems:"center", justifyContent:"center", fontSize:12,
                          background:"linear-gradient(135deg,#7c3aed,#4c1d95)",
                          boxShadow:"0 2px 8px rgba(124,58,237,.3)",
                        }}>✨</div>
                        <div style={{
                          padding:"10px 14px", borderRadius:16, borderBottomLeftRadius:4,
                          background:"#fff", border:"1px solid #ede8fa", boxShadow:"0 2px 8px rgba(0,0,0,.06)",
                        }}>
                          <div style={{ display:"flex", gap:4, alignItems:"center" }}>
                            {[0, 180, 360].map(d => (
                              <span key={d} style={{
                                width:6, height:6, background:"#8b5cf6", borderRadius:"50%",
                                animation:`isaBounce 1.2s ${d}ms infinite`,
                              }}/>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={bottomRef}/>
                  </div>

                  {/* ── INPUT ── */}
                  <div style={{
                    padding:"10px 12px", borderTop:"1px solid #e0d8f8",
                    display:"flex", gap:8, alignItems:"center",
                    background:"#fff", boxShadow:"0 -2px 10px rgba(0,0,0,.04)",
                    flexShrink:0,
                  }}>
                    <input
                      ref={inputRef}
                      className="isa-input"
                      placeholder={ready ? "¿Qué estás buscando hoy?" : "Cargando..."}
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={handleKey}
                      disabled={loading || !ready}
                    />
                    <button
                      className="isa-send-btn"
                      onClick={() => send()}
                      disabled={loading || !input.trim() || !ready}
                    >➤</button>
                  </div>
                </>
              )}
            </div>

          </div>
        </>
      )}
    </>
  );
}
