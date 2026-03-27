// ============================================================
//  AIChatBot.jsx — Isabel, asesora IA de Kosmica
//  Colores corporativos: #9B72CF / #6B3FA0
// ============================================================
import { useState, useEffect, useRef } from "react";

const STYLES = `
  .kb-fab {
    position: fixed; bottom: 28px; right: 28px;
    width: 62px; height: 62px; border-radius: 50%;
    background: linear-gradient(135deg, #9B72CF, #6B3FA0);
    border: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    font-size: 26px;
    box-shadow: 0 8px 28px rgba(107,63,160,0.5);
    z-index: 10000; transition: transform .2s, box-shadow .2s;
  }
  .kb-fab:hover { transform: scale(1.1); box-shadow: 0 12px 36px rgba(107,63,160,0.65); }
  .kb-fab-badge {
    position: absolute; top: -3px; right: -3px;
    width: 20px; height: 20px; background: #FF4D6D;
    border-radius: 50%; border: 2.5px solid #fff;
    font-size: 10px; font-weight: 700; color: #fff;
    display: flex; align-items: center; justify-content: center;
  }

  .kb-overlay {
    position: fixed; inset: 0;
    background: rgba(30,15,60,0.5);
    backdrop-filter: blur(4px);
    z-index: 9998; animation: kbFade .2s ease;
  }
  @keyframes kbFade { from { opacity:0 } to { opacity:1 } }

  /* ── PANEL PRINCIPAL ── */
  .kb-panel {
    position: fixed; bottom: 0; right: 0;
    width: 820px; height: 88vh;
    max-width: 100vw; max-height: 100vh;
    background: #fff;
    border-radius: 20px 20px 0 0;
    display: grid;
    grid-template-columns: 1fr 300px;
    grid-template-rows: auto 1fr;
    overflow: hidden;
    z-index: 9999;
    box-shadow: -4px 0 60px rgba(0,0,0,0.25);
    animation: kbUp .32s cubic-bezier(.34,1.2,.64,1);
  }
  @keyframes kbUp {
    from { transform: translateY(30px); opacity: 0; }
    to   { transform: translateY(0); opacity: 1; }
  }
  @media (max-width: 860px) {
    .kb-panel { width: 100vw; border-radius: 16px 16px 0 0; grid-template-columns: 1fr; }
    .kb-prod-panel { display: none; }
  }

  /* ── HEADER ── */
  .kb-header {
    grid-column: 1 / -1;
    background: linear-gradient(135deg, #9B72CF 0%, #6B3FA0 100%);
    padding: 0 20px;
    height: 68px;
    display: flex; align-items: center; gap: 14px;
    flex-shrink: 0; overflow: hidden;
  }
  .kb-av-wrap { position: relative; flex-shrink: 0; }
  .kb-av {
    width: 46px; height: 46px; border-radius: 50%;
    background: rgba(255,255,255,0.2);
    border: 2px solid rgba(255,255,255,0.35);
    display: flex; align-items: center; justify-content: center;
    font-size: 22px; flex-shrink: 0;
  }
  .kb-dot-online {
    position: absolute; bottom: 1px; right: 1px;
    width: 11px; height: 11px; background: #4DFFA0;
    border-radius: 50%; border: 2px solid #6B3FA0;
  }
  .kb-hinfo { flex-shrink: 0; min-width: 0; }
  .kb-hname {
    font-weight: 700; font-size: .95rem; color: #fff;
    white-space: nowrap; line-height: 1.2;
  }
  .kb-hsub {
    font-size: .72rem; color: rgba(255,255,255,0.8);
    white-space: nowrap; display: flex; align-items: center; gap: 5px;
    margin-top: 2px;
  }
  .kb-hsub-dot { width: 6px; height: 6px; background: #4DFFA0; border-radius: 50%; flex-shrink: 0; }

  /* Categorías en el header */
  .kb-hcats {
    flex: 1; display: flex; gap: 6px; align-items: center;
    overflow-x: auto; padding: 0 4px;
    scrollbar-width: none; margin-left: 8px;
  }
  .kb-hcats::-webkit-scrollbar { display: none; }
  .kb-hcat {
    flex-shrink: 0; padding: 5px 12px; border-radius: 20px;
    background: rgba(255,255,255,0.15);
    border: 1px solid rgba(255,255,255,0.3);
    color: #fff; font-size: .72rem; font-weight: 600;
    cursor: pointer; white-space: nowrap; transition: all .15s;
  }
  .kb-hcat:hover { background: rgba(255,255,255,0.28); }
  .kb-hcat:disabled { opacity: .5; cursor: default; }
  .kb-close {
    width: 32px; height: 32px; flex-shrink: 0;
    background: rgba(255,255,255,0.15);
    border: 1px solid rgba(255,255,255,0.25);
    border-radius: 50%; color: #fff; font-size: 15px;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    transition: background .15s; margin-left: 4px;
  }
  .kb-close:hover { background: rgba(255,255,255,0.3); }

  /* ── CHAT ── */
  .kb-chat {
    display: flex; flex-direction: column;
    background: #F9F6FF; overflow: hidden;
    border-right: 1px solid #EDE8F5;
  }
  .kb-msgs {
    flex: 1; overflow-y: auto;
    padding: 18px 18px 8px;
    display: flex; flex-direction: column; gap: 14px;
    scrollbar-width: thin; scrollbar-color: #D8C8F0 transparent;
  }
  .kb-msgs::-webkit-scrollbar { width: 4px; }
  .kb-msgs::-webkit-scrollbar-thumb { background: #D8C8F0; border-radius: 4px; }

  .kb-msg { display: flex; gap: 9px; align-items: flex-end; }
  .kb-msg.user { flex-direction: row-reverse; }
  .kb-msgav {
    width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center; font-size: 14px;
  }
  .kb-msg.bot  .kb-msgav { background: linear-gradient(135deg,#9B72CF,#6B3FA0); }
  .kb-msg.user .kb-msgav { background: #E8E0F0; }
  .kb-bbl {
    padding: 10px 14px; border-radius: 18px;
    font-size: .875rem; line-height: 1.55;
    max-width: 300px; word-break: break-word; white-space: pre-line;
  }
  .kb-msg.bot  .kb-bbl {
    background: #fff; color: #2D1B4E;
    border-bottom-left-radius: 4px;
    box-shadow: 0 2px 8px rgba(0,0,0,.07);
    border: 1px solid #EDE8F5;
  }
  .kb-msg.user .kb-bbl {
    background: linear-gradient(135deg,#9B72CF,#6B3FA0);
    color: #fff; border-bottom-right-radius: 4px;
  }

  .kb-typing { display: flex; gap: 5px; align-items: center; padding: 4px 0; }
  .kb-typing span {
    width: 7px; height: 7px; background: #9B72CF;
    border-radius: 50%; animation: kbDot 1.2s infinite;
  }
  .kb-typing span:nth-child(2) { animation-delay: .2s; }
  .kb-typing span:nth-child(3) { animation-delay: .4s; }
  @keyframes kbDot {
    0%,60%,100% { transform: translateY(0); opacity:.35; }
    30%          { transform: translateY(-7px); opacity:1; }
  }

  .kb-sugs {
    display: flex; flex-wrap: wrap; gap: 7px;
    padding: 4px 0 0; margin-left: 39px;
  }
  .kb-sug {
    background: #fff; border: 1.5px solid #D4B8F0;
    color: #6B3FA0; border-radius: 20px;
    padding: 6px 13px; font-size: .77rem; font-weight: 500;
    cursor: pointer; transition: all .15s; white-space: nowrap;
  }
  .kb-sug:hover { background: #9B72CF; color: #fff; border-color: #9B72CF; transform: translateY(-1px); }

  .kb-input-row {
    padding: 12px 14px; border-top: 1px solid #EDE8F5;
    display: flex; gap: 9px; background: #fff;
  }
  .kb-input {
    flex: 1; border: 1.5px solid #E0D4F0; border-radius: 24px;
    padding: 10px 16px; font-size: .875rem; color: #2D1B4E;
    outline: none; background: #F9F6FF;
    transition: border-color .2s, box-shadow .2s;
  }
  .kb-input:focus { border-color: #9B72CF; box-shadow: 0 0 0 3px rgba(155,114,207,.12); }
  .kb-input::placeholder { color: #C4B5D4; }
  .kb-send {
    width: 42px; height: 42px; flex-shrink: 0;
    background: linear-gradient(135deg,#9B72CF,#6B3FA0);
    border: none; border-radius: 50%; color: #fff; font-size: 16px;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    transition: transform .15s, opacity .15s;
    box-shadow: 0 4px 14px rgba(107,63,160,0.4);
  }
  .kb-send:hover:not(:disabled) { transform: scale(1.1); }
  .kb-send:disabled { opacity: .4; cursor: default; }

  /* ── PANEL PRODUCTOS ── */
  .kb-prod-panel {
    background: #fff; display: flex; flex-direction: column;
    overflow: hidden; border-left: 1px solid #EDE8F5;
  }
  .kb-prod-hdr {
    padding: 14px 16px 12px;
    border-bottom: 1px solid #EDE8F5;
    display: flex; align-items: center; justify-content: space-between;
    flex-shrink: 0;
  }
  .kb-prod-hdr-title {
    font-weight: 700; font-size: .88rem; color: #2D1B4E;
  }
  .kb-prod-cnt {
    font-size: .7rem; font-weight: 700; color: #6B3FA0;
    background: #F0EAF8; border: 1px solid #D4B8F0;
    padding: 2px 9px; border-radius: 10px;
  }
  .kb-prod-scroll {
    flex: 1; overflow-y: auto; padding: 12px;
    display: flex; flex-direction: column; gap: 12px;
    scrollbar-width: thin; scrollbar-color: #E0D4F0 transparent;
  }
  .kb-prod-scroll::-webkit-scrollbar { width: 3px; }
  .kb-prod-scroll::-webkit-scrollbar-thumb { background: #E0D4F0; border-radius: 3px; }

  /* Tarjeta producto */
  .kb-pcard {
    border-radius: 14px; overflow: hidden;
    border: 1.5px solid #EDE8F5;
    cursor: pointer; transition: transform .2s, box-shadow .2s, border-color .2s;
    position: relative; background: #fff;
  }
  .kb-pcard:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 28px rgba(107,63,160,0.18);
    border-color: #9B72CF;
  }
  .kb-pcard-badge {
    position: absolute; top: 8px; left: 8px;
    font-size: .6rem; font-weight: 700; letter-spacing: .05em;
    padding: 3px 9px; border-radius: 10px; text-transform: uppercase; z-index: 1;
  }
  .kb-pcard-badge.oferta { background: #FF4D6D; color: #fff; }
  .kb-pcard-badge.nuevo  { background: #6B3FA0; color: #fff; }
  .kb-pimg {
    width: 100%; height: 155px;
    object-fit: cover; display: block; background: #F0EAF8;
  }
  .kb-pimg-ph {
    width: 100%; height: 155px;
    background: linear-gradient(135deg,#E8D5F8,#D4B8F0);
    display: flex; align-items: center; justify-content: center; font-size: 42px;
  }
  .kb-pbody { padding: 11px 12px 13px; }
  .kb-pname {
    font-size: .8rem; font-weight: 700; color: #2D1B4E;
    line-height: 1.35; margin-bottom: 4px;
    display: -webkit-box; -webkit-line-clamp: 2;
    -webkit-box-orient: vertical; overflow: hidden;
  }
  .kb-pdesc {
    font-size: .7rem; color: #7A6899; line-height: 1.4; margin-bottom: 7px;
    display: -webkit-box; -webkit-line-clamp: 2;
    -webkit-box-orient: vertical; overflow: hidden;
  }
  .kb-pmeta { display: flex; align-items: center; justify-content: space-between; gap: 4px; }
  .kb-pprice { font-size: .88rem; font-weight: 700; color: #6B3FA0; }
  .kb-pstars { display: flex; gap: 2px; align-items: center; }
  .kb-pstar { font-size: 11px; }
  .kb-pstar.on  { color: #FBBF24; }
  .kb-pstar.off { color: #E0D4F0; }
  .kb-prating { font-size: .67rem; color: #A89BC0; margin-left: 2px; }
  .kb-pver {
    display: block; width: 100%; margin-top: 8px; padding: 7px 0;
    background: #F5F0FF; border: 1px solid #D4B8F0;
    border-radius: 8px; font-size: .73rem; font-weight: 600; color: #6B3FA0;
    text-align: center; cursor: pointer; transition: background .15s, color .15s;
  }
  .kb-pver:hover { background: #6B3FA0; color: #fff; border-color: #6B3FA0; }

  /* Panel vacío */
  .kb-pempty {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 12px; padding: 28px; text-align: center;
  }
  .kb-pempty-icon { font-size: 38px; opacity: .25; }
  .kb-pempty-txt { font-size: .8rem; color: #B8A8D4; line-height: 1.6; }
`;

const CATEGORIAS = [
  { label: "👜 Bolsos",     query: "Muéstrame los bolsos disponibles" },
  { label: "💄 Maquillaje", query: "¿Qué maquillaje tienen?" },
  { label: "✨ Capilar",    query: "Productos para el cabello" },
  { label: "💍 Accesorios", query: "Muéstrame los accesorios" },
  { label: "💳 Billeteras", query: "Quiero ver las billeteras" },
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
- Respuestas cortas y con gancho: 2-3 líneas antes de los productos

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
- Explica en 1 frase POR QUÉ ese producto es perfecto
- Menciona materiales, detalles, ocasión, cómo combina
- Badge "OFERTA" o "NUEVO" → menciónalo con entusiasmo
- Máximo 3 productos por recomendación
- NUNCA stock 0. Precios en COP

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
- Nunca hagas sentir mal a la clienta

═══════════════════════════════════════
FORMATO OBLIGATORIO
═══════════════════════════════════════
Al final de mensajes con recomendaciones, escribe EXACTAMENTE en la última línea (sin markdown, sin backticks, sin espacios):
PRODUCTOS_RECOMENDADOS:[id1,id2,id3]

Si no recomiendas productos, NO incluyas esa línea.`;

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

const Stars = ({ rating = 0 }) => (
  <div className="kb-pstars">
    {[1,2,3,4,5].map(i => (
      <span key={i} className={`kb-pstar ${i <= Math.round(rating) ? "on" : "off"}`}>★</span>
    ))}
    {rating > 0 && <span className="kb-prating">{Number(rating).toFixed(1)}</span>}
  </div>
);

export default function AIChatBot({ products = [], onProductClick }) {
  const [open, setOpen]               = useState(false);
  const [messages, setMessages]       = useState([{
    role: "bot",
    content: "Hola hermosa, soy Isabel ✨\nTu asesora personal de Kosmica. Cuéntame, ¿estás buscando algo para ti o es un regalo especial?",
    products: [],
  }]);
  const [shownProducts, setShownProducts] = useState([]);
  const [input, setInput]             = useState("");
  const [loading, setLoading]         = useState(false);
  const [unread, setUnread]           = useState(1);
  const messagesEndRef                = useRef(null);
  const inputRef                      = useRef(null);

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
        setMessages(prev => [...prev, {
          role: "bot",
          content: `No pude conectarme ahora (${errMsg}). ¿Intentamos de nuevo?`,
          products: [],
        }]);
        return;
      }

      const rawText = data.content?.[0]?.text || "Lo siento, no pude procesar tu mensaje. ¿Intentamos de nuevo?";
      const ids     = extractProductIds(rawText);
      const cleaned = cleanText(rawText);
      const prods   = getProductsById(ids);

      setMessages(prev => [...prev, { role: "bot", content: cleaned, products: prods }]);

      // Actualizar panel lateral siempre que haya productos
      if (prods.length > 0) setShownProducts(prods);

      if (!open) setUnread(u => u + 1);
    } catch (e) {
      console.error("Error chat Kosmica:", e);
      setMessages(prev => [...prev, {
        role: "bot",
        content: "No pude conectarme. Verifica tu conexión e intenta de nuevo. 🔄",
        products: [],
      }]);
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

            {/* ── HEADER — altura fija, todo en una línea ── */}
            <div className="kb-header">
              <div className="kb-av-wrap">
                <div className="kb-av">✨</div>
                <span className="kb-dot-online" />
              </div>
              <div className="kb-hinfo">
                <div className="kb-hname">Isabel · Tu asesora de Kosmica</div>
                <div className="kb-hsub">
                  <span className="kb-hsub-dot" />
                  En línea y lista para ayudarte 💜
                </div>
              </div>

              {/* Categorías */}
              <div className="kb-hcats">
                {CATEGORIAS.map(c => (
                  <button key={c.label} className="kb-hcat" onClick={() => sendMessage(c.query)} disabled={loading}>
                    {c.label}
                  </button>
                ))}
              </div>

              <button className="kb-close" onClick={() => setOpen(false)}>✕</button>
            </div>

            {/* ── CHAT ── */}
            <div className="kb-chat">
              <div className="kb-msgs">
                {messages.map((msg, i) => (
                  <div key={i}>
                    <div className={`kb-msg ${msg.role}`}>
                      <div className="kb-msgav">{msg.role === "bot" ? "✨" : "👤"}</div>
                      <div className="kb-bbl">{msg.content}</div>
                    </div>

                    {i === 0 && messages.length === 1 && (
                      <div className="kb-sugs">
                        {SUGGESTIONS.map(s => (
                          <button key={s} className="kb-sug" onClick={() => sendMessage(s)}>{s}</button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {loading && (
                  <div className="kb-msg bot">
                    <div className="kb-msgav">✨</div>
                    <div className="kb-bbl">
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

            {/* ── PANEL LATERAL PRODUCTOS ── */}
            <div className="kb-prod-panel">
              <div className="kb-prod-hdr">
                <span className="kb-prod-hdr-title">Productos recomendados</span>
                {shownProducts.length > 0 && (
                  <span className="kb-prod-cnt">{shownProducts.length}</span>
                )}
              </div>

              {shownProducts.length === 0 ? (
                <div className="kb-pempty">
                  <div className="kb-pempty-icon">✨</div>
                  <div className="kb-pempty-txt">
                    Cuéntale a Isabel qué necesitas y aquí verás las recomendaciones con fotos, descripción y precio.
                  </div>
                </div>
              ) : (
                <div className="kb-prod-scroll">
                  {shownProducts.map(prod => (
                    <div key={prod.id} className="kb-pcard">
                      {prod.badge && (
                        <span className={`kb-pcard-badge ${prod.badge.toLowerCase()}`}>{prod.badge}</span>
                      )}
                      {prod.imageUrl ? (
                        <img src={prod.imageUrl} alt={prod.name} className="kb-pimg" loading="lazy" />
                      ) : (
                        <div className="kb-pimg-ph">{catEmoji(prod.category)}</div>
                      )}
                      <div className="kb-pbody">
                        <div className="kb-pname">{prod.name}</div>
                        {prod.description && <div className="kb-pdesc">{prod.description}</div>}
                        <div className="kb-pmeta">
                          <span className="kb-pprice">{formatPrice(prod.price)}</span>
                          <Stars rating={prod.rating} />
                        </div>
                        <button className="kb-pver" onClick={() => { onProductClick?.(prod); setOpen(false); }}>
                          Ver en la tienda →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </>
      )}
    </>
  );
}
