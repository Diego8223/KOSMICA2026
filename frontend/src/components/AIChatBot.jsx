// ============================================================
//  AIChatBot.jsx — Isabel, asesora IA premium de Kosmica
//  Diseño: panel lateral de productos + chat principal
// ============================================================
import { useState, useEffect, useRef } from "react";

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600&family=Inter:wght@400;500;600&display=swap');

  /* ── FAB ─────────────────────────────────────────── */
  .kb-fab {
    position: fixed;
    bottom: 28px; right: 28px;
    width: 62px; height: 62px;
    border-radius: 50%;
    background: linear-gradient(135deg, #C084FC, #7C3AED);
    border: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    font-size: 26px;
    box-shadow: 0 8px 32px rgba(124,58,237,0.5);
    z-index: 10000;
    transition: transform .25s cubic-bezier(.34,1.56,.64,1), box-shadow .25s;
  }
  .kb-fab:hover { transform: scale(1.12); box-shadow: 0 12px 40px rgba(124,58,237,0.65); }
  .kb-fab-badge {
    position: absolute; top: -3px; right: -3px;
    width: 20px; height: 20px;
    background: #F43F5E; border-radius: 50%;
    border: 2.5px solid #fff;
    font-size: 10px; font-weight: 700; color: #fff;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Inter', sans-serif;
  }

  /* ── OVERLAY ─────────────────────────────────────── */
  .kb-overlay {
    position: fixed; inset: 0;
    background: rgba(15, 10, 30, 0.55);
    backdrop-filter: blur(6px);
    z-index: 9998;
    animation: kbFadeIn .2s ease;
  }
  @keyframes kbFadeIn { from { opacity:0 } to { opacity:1 } }

  /* ── PANEL PRINCIPAL ─────────────────────────────── */
  .kb-panel {
    position: fixed;
    bottom: 0; right: 0;
    width: 820px; height: 90vh;
    max-width: 100vw; max-height: 100vh;
    background: #0F0A1E;
    border-radius: 24px 24px 0 0;
    display: grid;
    grid-template-columns: 1fr 320px;
    grid-template-rows: auto 1fr;
    overflow: hidden;
    z-index: 9999;
    box-shadow: -4px 0 60px rgba(0,0,0,0.6);
    animation: kbSlideUp .35s cubic-bezier(.34,1.2,.64,1);
    font-family: 'Inter', sans-serif;
  }
  @keyframes kbSlideUp {
    from { transform: translateY(40px); opacity: 0; }
    to   { transform: translateY(0); opacity: 1; }
  }
  @media (max-width: 860px) {
    .kb-panel { width: 100vw; border-radius: 20px 20px 0 0; grid-template-columns: 1fr; grid-template-rows: auto 1fr auto; height: 92vh; }
    .kb-products-panel { display: none; }
    .kb-products-panel.mobile-open { display: flex; position: absolute; inset: 0; z-index: 10; }
  }

  /* ── HEADER (ocupa ambas columnas) ───────────────── */
  .kb-header {
    grid-column: 1 / -1;
    background: linear-gradient(135deg, #1A0A3B 0%, #0D0621 50%, #1A0533 100%);
    padding: 20px 24px 16px;
    display: flex; align-items: center; gap: 16px;
    border-bottom: 1px solid rgba(192,132,252,0.15);
    position: relative;
    overflow: hidden;
  }
  .kb-header::before {
    content: '';
    position: absolute; top: -40px; right: 80px;
    width: 200px; height: 200px;
    background: radial-gradient(circle, rgba(192,132,252,0.12) 0%, transparent 70%);
    pointer-events: none;
  }
  .kb-header-left { display: flex; align-items: center; gap: 14px; flex: 1; min-width: 0; }
  .kb-avatar-wrap {
    position: relative; flex-shrink: 0;
  }
  .kb-avatar {
    width: 52px; height: 52px;
    border-radius: 50%;
    background: linear-gradient(135deg, #C084FC, #7C3AED);
    display: flex; align-items: center; justify-content: center;
    font-size: 24px;
    border: 2px solid rgba(192,132,252,0.4);
    box-shadow: 0 0 20px rgba(192,132,252,0.3);
  }
  .kb-online-dot {
    position: absolute; bottom: 2px; right: 2px;
    width: 12px; height: 12px;
    background: #34D399; border-radius: 50%;
    border: 2px solid #0F0A1E;
    animation: pulse-dot 2s infinite;
  }
  @keyframes pulse-dot {
    0%,100% { box-shadow: 0 0 0 0 rgba(52,211,153,0.5); }
    50%      { box-shadow: 0 0 0 5px rgba(52,211,153,0); }
  }
  .kb-header-info { min-width: 0; }
  .kb-name {
    font-family: 'Playfair Display', serif;
    font-size: 1.15rem; font-weight: 600;
    color: #F3E8FF;
    letter-spacing: .02em;
    line-height: 1.2;
  }
  .kb-subtitle {
    font-size: .73rem; color: rgba(216,180,254,0.7);
    margin-top: 2px; display: flex; align-items: center; gap: 6px;
  }
  .kb-status-dot { width: 6px; height: 6px; background: #34D399; border-radius: 50%; }

  /* Categorías en el header */
  .kb-cats {
    display: flex; gap: 6px; align-items: center;
    flex-shrink: 0;
  }
  @media (max-width: 640px) { .kb-cats { display: none; } }
  .kb-cat {
    padding: 5px 12px;
    border-radius: 20px;
    background: rgba(192,132,252,0.1);
    border: 1px solid rgba(192,132,252,0.25);
    color: #D8B4FE;
    font-size: .72rem; font-weight: 500;
    cursor: pointer;
    transition: all .15s;
    white-space: nowrap;
  }
  .kb-cat:hover {
    background: rgba(192,132,252,0.25);
    border-color: rgba(192,132,252,0.5);
    color: #F3E8FF;
  }
  .kb-close {
    width: 34px; height: 34px;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 50%;
    color: #D8B4FE; font-size: 16px;
    cursor: pointer; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    transition: background .15s;
  }
  .kb-close:hover { background: rgba(255,255,255,0.14); color: #fff; }

  /* ── ZONA CHAT ────────────────────────────────────── */
  .kb-chat-zone {
    display: flex; flex-direction: column;
    background: #0A0618;
    overflow: hidden;
    border-right: 1px solid rgba(192,132,252,0.1);
  }
  .kb-messages {
    flex: 1;
    overflow-y: auto;
    padding: 20px 20px 8px;
    display: flex; flex-direction: column; gap: 16px;
    scrollbar-width: thin;
    scrollbar-color: rgba(124,58,237,0.3) transparent;
  }
  .kb-messages::-webkit-scrollbar { width: 4px; }
  .kb-messages::-webkit-scrollbar-thumb { background: rgba(124,58,237,0.35); border-radius: 4px; }

  /* Mensajes */
  .kb-msg { display: flex; gap: 10px; align-items: flex-end; }
  .kb-msg.user { flex-direction: row-reverse; }
  .kb-msg-av {
    width: 32px; height: 32px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 15px; flex-shrink: 0;
  }
  .kb-msg.bot  .kb-msg-av { background: linear-gradient(135deg,#C084FC,#7C3AED); }
  .kb-msg.user .kb-msg-av { background: rgba(255,255,255,0.08); font-size: 13px; }
  .kb-bubble {
    padding: 11px 15px;
    border-radius: 18px;
    font-size: .855rem; line-height: 1.6;
    max-width: 320px; word-break: break-word;
    white-space: pre-line;
  }
  .kb-msg.bot  .kb-bubble {
    background: rgba(255,255,255,0.06);
    color: #E9D5FF;
    border: 1px solid rgba(192,132,252,0.15);
    border-bottom-left-radius: 4px;
  }
  .kb-msg.user .kb-bubble {
    background: linear-gradient(135deg,#7C3AED,#5B21B6);
    color: #F3E8FF;
    border-bottom-right-radius: 4px;
  }

  /* Typing */
  .kb-typing { display: flex; gap: 5px; align-items: center; padding: 4px 0; }
  .kb-typing span {
    width: 7px; height: 7px;
    background: #A855F7; border-radius: 50%;
    animation: kbDot 1.3s infinite;
  }
  .kb-typing span:nth-child(2) { animation-delay: .2s; }
  .kb-typing span:nth-child(3) { animation-delay: .4s; }
  @keyframes kbDot {
    0%,60%,100% { transform: translateY(0); opacity: .3; }
    30%          { transform: translateY(-7px); opacity: 1; }
  }

  /* Sugerencias */
  .kb-suggestions {
    display: flex; flex-wrap: wrap; gap: 7px;
    padding: 4px 0 0; margin-left: 42px;
  }
  .kb-sug {
    background: rgba(192,132,252,0.08);
    border: 1px solid rgba(192,132,252,0.28);
    color: #C084FC;
    border-radius: 20px; padding: 6px 13px;
    font-size: .77rem; font-weight: 500;
    cursor: pointer; transition: all .15s; white-space: nowrap;
  }
  .kb-sug:hover { background: rgba(192,132,252,0.2); color: #E9D5FF; border-color: rgba(192,132,252,0.55); transform: translateY(-1px); }

  /* Input */
  .kb-input-row {
    padding: 14px 16px;
    border-top: 1px solid rgba(192,132,252,0.1);
    display: flex; gap: 10px;
    background: rgba(15,10,30,0.9);
  }
  .kb-input {
    flex: 1;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(192,132,252,0.2);
    border-radius: 24px; padding: 10px 18px;
    font-size: .875rem; color: #F3E8FF;
    outline: none; transition: border-color .2s, box-shadow .2s;
    font-family: 'Inter', sans-serif;
  }
  .kb-input::placeholder { color: rgba(216,180,254,0.35); }
  .kb-input:focus { border-color: rgba(192,132,252,0.55); box-shadow: 0 0 0 3px rgba(124,58,237,0.15); }
  .kb-send {
    width: 42px; height: 42px;
    background: linear-gradient(135deg,#A855F7,#7C3AED);
    border: none; border-radius: 50%; color: #fff;
    font-size: 16px; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: transform .15s, opacity .15s;
    flex-shrink: 0;
    box-shadow: 0 4px 16px rgba(124,58,237,0.4);
  }
  .kb-send:hover:not(:disabled) { transform: scale(1.1); }
  .kb-send:disabled { opacity: .35; cursor: default; }

  /* ── PANEL DE PRODUCTOS ───────────────────────────── */
  .kb-products-panel {
    background: #0D0921;
    display: flex; flex-direction: column;
    overflow: hidden;
    border-left: 1px solid rgba(192,132,252,0.08);
  }
  .kb-prod-header {
    padding: 16px 16px 12px;
    border-bottom: 1px solid rgba(192,132,252,0.1);
    display: flex; align-items: center; justify-content: space-between;
  }
  .kb-prod-title {
    font-family: 'Playfair Display', serif;
    font-size: .9rem; font-weight: 500; color: #E9D5FF;
    letter-spacing: .02em;
  }
  .kb-prod-count {
    font-size: .7rem; color: #A855F7;
    background: rgba(168,85,247,0.12);
    border: 1px solid rgba(168,85,247,0.25);
    padding: 2px 8px; border-radius: 10px; font-weight: 600;
  }
  .kb-prod-scroll {
    flex: 1; overflow-y: auto;
    padding: 12px;
    display: flex; flex-direction: column; gap: 10px;
    scrollbar-width: thin;
    scrollbar-color: rgba(124,58,237,0.2) transparent;
  }
  .kb-prod-scroll::-webkit-scrollbar { width: 3px; }
  .kb-prod-scroll::-webkit-scrollbar-thumb { background: rgba(124,58,237,0.25); border-radius: 3px; }

  /* Tarjeta de producto — modo lista lateral */
  .kb-prod-card {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(192,132,252,0.12);
    border-radius: 14px; overflow: hidden;
    cursor: pointer;
    transition: transform .2s, border-color .2s, box-shadow .2s;
    position: relative;
  }
  .kb-prod-card:hover {
    transform: translateY(-3px);
    border-color: rgba(192,132,252,0.45);
    box-shadow: 0 8px 28px rgba(124,58,237,0.2);
  }
  .kb-prod-img-wrap { position: relative; }
  .kb-prod-img {
    width: 100%; height: 160px;
    object-fit: cover; display: block;
    background: rgba(255,255,255,0.04);
  }
  .kb-prod-img-ph {
    width: 100%; height: 160px;
    background: linear-gradient(135deg, rgba(124,58,237,0.2), rgba(192,132,252,0.1));
    display: flex; align-items: center; justify-content: center;
    font-size: 44px;
  }
  .kb-prod-badge {
    position: absolute; top: 8px; left: 8px;
    font-size: .62rem; font-weight: 700;
    padding: 3px 9px; border-radius: 10px;
    letter-spacing: .05em; text-transform: uppercase;
    font-family: 'Inter', sans-serif;
  }
  .kb-prod-badge.oferta { background: #F43F5E; color: #fff; }
  .kb-prod-badge.nuevo  { background: #7C3AED; color: #fff; }
  .kb-prod-body { padding: 12px 12px 14px; }
  .kb-prod-name {
    font-size: .82rem; font-weight: 600; color: #E9D5FF;
    line-height: 1.4; margin-bottom: 5px;
    display: -webkit-box;
    -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  }
  .kb-prod-desc {
    font-size: .73rem; color: rgba(216,180,254,0.55);
    line-height: 1.45; margin-bottom: 8px;
    display: -webkit-box;
    -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  }
  .kb-prod-meta {
    display: flex; align-items: center; justify-content: space-between;
    gap: 6px;
  }
  .kb-prod-price {
    font-size: .9rem; font-weight: 700;
    color: #C084FC; letter-spacing: -.01em;
  }
  .kb-prod-stars { display: flex; align-items: center; gap: 3px; }
  .kb-star { font-size: 11px; }
  .kb-star.on  { color: #FBBF24; }
  .kb-star.off { color: rgba(255,255,255,0.15); }
  .kb-prod-rating-val { font-size: .68rem; color: rgba(216,180,254,0.5); margin-left: 2px; }
  .kb-ver-btn {
    display: block; width: 100%;
    margin-top: 9px; padding: 7px 0;
    background: rgba(192,132,252,0.1);
    border: 1px solid rgba(192,132,252,0.22);
    border-radius: 8px;
    font-size: .73rem; font-weight: 600; color: #C084FC;
    text-align: center; cursor: pointer;
    transition: background .15s, color .15s;
    font-family: 'Inter', sans-serif;
  }
  .kb-ver-btn:hover { background: rgba(192,132,252,0.22); color: #F3E8FF; }

  /* Estado vacío del panel */
  .kb-prod-empty {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 10px; padding: 24px;
    text-align: center;
  }
  .kb-prod-empty-icon { font-size: 36px; opacity: .3; }
  .kb-prod-empty-text { font-size: .8rem; color: rgba(216,180,254,0.35); line-height: 1.5; }

  /* Mensaje de "asesoría" destacada en el panel */
  .kb-insight {
    margin: 0 12px 8px;
    padding: 10px 13px;
    background: rgba(192,132,252,0.07);
    border: 1px solid rgba(192,132,252,0.18);
    border-radius: 10px;
    font-size: .73rem; color: #D8B4FE; line-height: 1.5;
    font-style: italic;
  }
`;

const CATEGORIAS = [
  { label: "👜 Bolsos",     query: "Muéstrame los bolsos disponibles" },
  { label: "💄 Maquillaje", query: "¿Qué maquillaje tienen?" },
  { label: "✨ Capilar",    query: "Productos para el cabello" },
  { label: "💍 Accesorios", query: "Muéstrame los accesorios" },
  { label: "🏷️ Ofertas",   query: "¿Qué está en oferta?" },
  { label: "🆕 Novedades",  query: "¿Qué hay de nuevo?" },
];

const SUGGESTIONS = [
  "¿Qué bolso está de moda? 👜",
  "Busco regalo para mi mamá 🎁",
  "Los más vendidos ⭐",
  "¿Tienen algo para el cabello?",
  "¿Qué hay en oferta? 💜",
  "Sorpréndeme con algo nuevo ✨",
];

const SYSTEM_PROMPT = (products) => `Eres ISABEL, la asesora personal de Kosmica — tienda colombiana de belleza y accesorios premium. Eres la amiga fashion más sofisticada de cada clienta: conoces el catálogo de memoria, tienes criterio estético impecable y el don de hacer sentir especial a quien te escribe.

═══════════════════════════════════════
PERSONALIDAD Y VOZ
═══════════════════════════════════════
- Cálida, elegante, cercana — nunca robótica
- Tuteo siempre. "amiga", "hermosa", "mi amor" con naturalidad
- NUNCA empieces con "¡Claro!", "¡Por supuesto!" — ve directo al valor
- Máximo 2 emojis por mensaje
- Respuestas con gancho: 2-3 líneas antes de los productos

═══════════════════════════════════════
CATÁLOGO (solo stock > 0)
═══════════════════════════════════════
${JSON.stringify(products.filter(p => p.stock > 0).map(p => ({
  id: p.id,
  nombre: p.name,
  descripcion: p.description,
  precio: p.price,
  categoria: p.category,
  rating: p.rating,
  stock: p.stock,
  badge: p.badge,
  imagen: p.imageUrl || null
})), null, 2)}

Categorías: Bolsos y Morrales, Maquillaje, Capilar, Accesorios, Billeteras.

═══════════════════════════════════════
CÓMO RECOMENDAR
═══════════════════════════════════════
- Entiende primero: ¿para ella o regalo? ¿ocasión? ¿estilo? ¿presupuesto?
- Si falta info, haz UNA pregunta clave
- Explica en 1 frase POR QUÉ ese producto es perfecto para ella
- Menciona materiales, detalles, ocasión, cómo combina
- Menciona la descripción del producto de forma natural
- Badge "OFERTA" o "NUEVO" → menciónalo con entusiasmo
- Máximo 3 productos por recomendación
- NUNCA stock 0. Precios en COP

═══════════════════════════════════════
RECORRIDO DE CATEGORÍAS
═══════════════════════════════════════
Al explorar una categoría: presenta los 3 mejores, explica qué hace único a cada uno, muestra opciones para distintos presupuestos, invítala a pedir más detalles.

═══════════════════════════════════════
SITUACIONES ESPECIALES
═══════════════════════════════════════
REGALO → pregunta presupuesto y destinataria
PRESUPUESTO LIMITADO → honesta, sin hacerla sentir mal
DUDA ENTRE DOS → ayúdala a decidir según su estilo
AGOTADO → ofrece la alternativa más similar
QUEJA → empatía primero, luego orienta a Kosmica
EXPLORANDO → pregunta curiosa sobre su estilo

═══════════════════════════════════════
LÍMITES
═══════════════════════════════════════
- Solo productos Kosmica y temas belleza/moda
- Nunca inventes datos — usa SOLO el catálogo
- Respuesta corta y con gancho antes de los productos

═══════════════════════════════════════
FORMATO OBLIGATORIO
═══════════════════════════════════════
Al final de mensajes con recomendaciones, escribe EXACTAMENTE (sin markdown, sin backticks):
PRODUCTOS_RECOMENDADOS:[id1,id2,id3]

Si no recomiendas productos, NO incluyas esa línea.`;

// ─── helpers ─────────────────────────────────────────────────
const formatPrice = (p) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(p);

const catEmoji = (cat = "") => {
  const c = cat.toUpperCase();
  if (c.includes("BOLSO") || c.includes("MORRAL")) return "👜";
  if (c.includes("MAQUILLAJE")) return "💄";
  if (c.includes("CAPILAR"))    return "✨";
  if (c.includes("ACCESORIO"))  return "💍";
  if (c.includes("BILLETERA"))  return "💳";
  return "🛍️";
};

const StarRating = ({ rating = 0 }) => {
  const r = Math.round(rating);
  return (
    <div className="kb-prod-stars">
      {[1,2,3,4,5].map(i => (
        <span key={i} className={`kb-star ${i <= r ? "on" : "off"}`}>★</span>
      ))}
      {rating > 0 && <span className="kb-prod-rating-val">{Number(rating).toFixed(1)}</span>}
    </div>
  );
};

// ─── componente principal ─────────────────────────────────────
export default function AIChatBot({ products = [], onProductClick }) {
  const [open, setOpen]             = useState(false);
  const [messages, setMessages]     = useState([
    {
      role: "bot",
      content: "Hola hermosa, soy Isabel ✨\nTu asesora personal de Kosmica. Cuéntame, ¿estás buscando algo especial para ti o es un regalo?",
      products: [],
    },
  ]);
  const [shownProducts, setShownProducts] = useState([]);
  const [lastInsight, setLastInsight]     = useState("");
  const [input, setInput]           = useState("");
  const [loading, setLoading]       = useState(false);
  const [unread, setUnread]         = useState(1);
  const messagesEndRef              = useRef(null);
  const inputRef                    = useRef(null);

  useEffect(() => {
    if (open) { setUnread(0); setTimeout(() => inputRef.current?.focus(), 120); }
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const extractProductIds = (text) => {
    const match = text.match(/PRODUCTOS_RECOMENDADOS:\[([^\]]*)\]/);
    if (!match) return [];
    return match[1].split(",").map(id => parseInt(id.trim())).filter(Boolean);
  };

  const cleanText = (text) =>
    text.replace(/PRODUCTOS_RECOMENDADOS:\[[^\]]*\]/g, "").trim();

  const getProductsById = (ids) =>
    ids.map(id => products.find(p => p.id === id)).filter(Boolean);

  const sendMessage = async (text) => {
    const userText = text || input.trim();
    if (!userText || loading) return;
    setInput("");

    const newUserMsg = { role: "user", content: userText };
    const history    = [...messages, newUserMsg];
    setMessages(history);
    setLoading(true);

    const apiMessages = history
      .filter(m => m.role === "user" || m.role === "bot")
      .map(m => ({ role: m.role === "bot" ? "assistant" : "user", content: m.content }));

    try {
      const backendUrl = process.env.REACT_APP_API_URL || "https://kosmica-backend.onrender.com";
      const resp = await fetch(`${backendUrl}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: SYSTEM_PROMPT(products),
          messages: apiMessages,
        }),
      });

      const data = await resp.json();
      if (!resp.ok || data.error) {
        const errMsg = data.error || `Error ${resp.status}`;
        setMessages(prev => [...prev, { role: "bot", content: `No pude conectarme ahora (${errMsg}). ¿Intentamos de nuevo?`, products: [] }]);
        return;
      }

      const rawText   = data.content?.[0]?.text || "Lo siento, no pude procesar tu mensaje. ¿Intentamos de nuevo?";
      const ids       = extractProductIds(rawText);
      const cleaned   = cleanText(rawText);
      const prods     = getProductsById(ids);

      setMessages(prev => [...prev, { role: "bot", content: cleaned, products: prods }]);

      if (prods.length > 0) {
        setShownProducts(prods);
        // Extraer primera frase del texto como insight
        const insight = cleaned.split(/[.!?]/)[0]?.trim();
        if (insight && insight.length > 10) setLastInsight(insight);
      }

      if (!open) setUnread(u => u + 1);
    } catch (e) {
      console.error("Error chat Kosmica:", e);
      setMessages(prev => [...prev, { role: "bot", content: "No pude conectarme. Verifica tu conexión e intenta de nuevo. 🔄", products: [] }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <>
      <style>{STYLES}</style>

      {/* FAB */}
      <button className="kb-fab" onClick={() => setOpen(o => !o)} title="Habla con Isabel">
        {open ? "✕" : "✨"}
        {!open && unread > 0 && <span className="kb-fab-badge">{unread}</span>}
      </button>

      {open && (
        <>
          <div className="kb-overlay" onClick={() => setOpen(false)} />

          <div className="kb-panel">

            {/* ── HEADER COMPLETO ── */}
            <div className="kb-header">
              <div className="kb-header-left">
                <div className="kb-avatar-wrap">
                  <div className="kb-avatar">✨</div>
                  <span className="kb-online-dot" />
                </div>
                <div className="kb-header-info">
                  <div className="kb-name">Isabel · Asesora de Kosmica</div>
                  <div className="kb-subtitle">
                    <span className="kb-status-dot" />
                    En línea · Lista para asesorarte con todo nuestro catálogo
                  </div>
                </div>
              </div>

              {/* Categorías en el header */}
              <div className="kb-cats">
                {CATEGORIAS.map(c => (
                  <button key={c.label} className="kb-cat" onClick={() => sendMessage(c.query)} disabled={loading}>
                    {c.label}
                  </button>
                ))}
              </div>

              <button className="kb-close" onClick={() => setOpen(false)}>✕</button>
            </div>

            {/* ── CHAT ── */}
            <div className="kb-chat-zone">
              <div className="kb-messages">
                {messages.map((msg, i) => (
                  <div key={i}>
                    <div className={`kb-msg ${msg.role}`}>
                      <div className="kb-msg-av">{msg.role === "bot" ? "✨" : "👤"}</div>
                      <div className="kb-bubble">{msg.content}</div>
                    </div>

                    {/* Sugerencias solo en bienvenida */}
                    {i === 0 && messages.length === 1 && (
                      <div className="kb-suggestions">
                        {SUGGESTIONS.map(s => (
                          <button key={s} className="kb-sug" onClick={() => sendMessage(s)}>{s}</button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {loading && (
                  <div className="kb-msg bot">
                    <div className="kb-msg-av">✨</div>
                    <div className="kb-bubble">
                      <div className="kb-typing"><span/><span/><span/></div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="kb-input-row">
                <input
                  ref={inputRef}
                  className="kb-input"
                  placeholder="Cuéntame qué estás buscando..."
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  disabled={loading}
                />
                <button className="kb-send" onClick={() => sendMessage()} disabled={loading || !input.trim()}>➤</button>
              </div>
            </div>

            {/* ── PANEL LATERAL DE PRODUCTOS ── */}
            <div className="kb-products-panel">
              <div className="kb-prod-header">
                <span className="kb-prod-title">Productos recomendados</span>
                {shownProducts.length > 0 && (
                  <span className="kb-prod-count">{shownProducts.length}</span>
                )}
              </div>

              {shownProducts.length === 0 ? (
                <div className="kb-prod-empty">
                  <div className="kb-prod-empty-icon">✨</div>
                  <div className="kb-prod-empty-text">
                    Cuéntale a Isabel qué necesitas y aquí verás las recomendaciones con fotos, descripción y precio.
                  </div>
                </div>
              ) : (
                <>
                  {lastInsight && (
                    <div className="kb-insight">"{lastInsight}..."</div>
                  )}
                  <div className="kb-prod-scroll">
                    {shownProducts.map(prod => (
                      <div key={prod.id} className="kb-prod-card">
                        <div className="kb-prod-img-wrap">
                          {prod.imageUrl ? (
                            <img src={prod.imageUrl} alt={prod.name} className="kb-prod-img" loading="lazy" />
                          ) : (
                            <div className="kb-prod-img-ph">{catEmoji(prod.category)}</div>
                          )}
                          {prod.badge && (
                            <span className={`kb-prod-badge ${prod.badge.toLowerCase()}`}>{prod.badge}</span>
                          )}
                        </div>
                        <div className="kb-prod-body">
                          <div className="kb-prod-name">{prod.name}</div>
                          {prod.description && (
                            <div className="kb-prod-desc">{prod.description}</div>
                          )}
                          <div className="kb-prod-meta">
                            <span className="kb-prod-price">{formatPrice(prod.price)}</span>
                            <StarRating rating={prod.rating} />
                          </div>
                          <button
                            className="kb-ver-btn"
                            onClick={() => { onProductClick?.(prod); setOpen(false); }}
                          >
                            Ver en la tienda →
                          </button>
                        </div>
                      </div>
                    ))}
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
