// ============================================================
//  AIChatBot.jsx — Isabel, asesora IA de Kosmica
//  Llama al backend /api/ai/chat (que hace proxy a Claude API)
// ============================================================
import { useState, useEffect, useRef } from "react";

const STYLES = `
  .ai-fab {
    position: fixed;
    bottom: 28px;
    right: 28px;
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: linear-gradient(135deg, #9B72CF, #6B3FA0);
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    box-shadow: 0 4px 24px rgba(107,63,160,0.45);
    z-index: 9999;
    transition: transform .2s, box-shadow .2s;
  }
  .ai-fab:hover { transform: scale(1.1); box-shadow: 0 8px 32px rgba(107,63,160,0.6); }
  .ai-fab .ai-fab-badge {
    position: absolute;
    top: -4px; right: -4px;
    width: 20px; height: 20px;
    background: #FF4D6D;
    border-radius: 50%;
    border: 2px solid #fff;
    font-size: 10px;
    color: #fff;
    display: flex; align-items: center; justify-content: center;
    font-weight: 700;
  }

  .ai-window {
    position: fixed;
    bottom: 106px;
    right: 28px;
    width: 420px;
    max-height: 680px;
    background: #fff;
    border-radius: 24px;
    box-shadow: 0 20px 80px rgba(0,0,0,0.2);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    z-index: 9999;
    animation: aiSlideIn .28s cubic-bezier(.34,1.56,.64,1);
  }
  @keyframes aiSlideIn {
    from { opacity: 0; transform: translateY(24px) scale(.95); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @media (max-width: 460px) {
    .ai-window { right: 8px; left: 8px; width: auto; bottom: 90px; border-radius: 18px; }
  }

  .ai-header {
    background: linear-gradient(135deg, #9B72CF, #6B3FA0);
    padding: 14px 18px;
    display: flex;
    align-items: center;
    gap: 12px;
    color: #fff;
    flex-shrink: 0;
  }
  .ai-header-avatar {
    width: 44px; height: 44px;
    background: rgba(255,255,255,.2);
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 22px;
    flex-shrink: 0;
    border: 2px solid rgba(255,255,255,.35);
  }
  .ai-header-info { flex: 1; }
  .ai-header-name { font-weight: 700; font-size: 1rem; letter-spacing: .01em; }
  .ai-header-status { font-size: .73rem; opacity: .9; display: flex; align-items: center; gap: 5px; margin-top: 2px; }
  .ai-header-dot { width: 7px; height: 7px; background: #4DFFA0; border-radius: 50%; animation: pulse 2s infinite; }
  @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.4; } }
  .ai-header-close {
    background: rgba(255,255,255,.15);
    border: none; color: #fff;
    width: 32px; height: 32px;
    border-radius: 50%;
    cursor: pointer; font-size: 16px;
    display: flex; align-items: center; justify-content: center;
    transition: background .2s;
    flex-shrink: 0;
  }
  .ai-header-close:hover { background: rgba(255,255,255,.3); }

  .ai-categories {
    display: flex;
    gap: 6px;
    padding: 10px 14px;
    overflow-x: auto;
    background: #fff;
    border-bottom: 1px solid #EDE8F5;
    scrollbar-width: none;
    flex-shrink: 0;
  }
  .ai-categories::-webkit-scrollbar { display: none; }
  .ai-cat-btn {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 5px 12px;
    border-radius: 20px;
    border: 1.5px solid #E0D4F0;
    background: #F9F6FF;
    color: #6B3FA0;
    font-size: .75rem;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    transition: all .15s;
    flex-shrink: 0;
  }
  .ai-cat-btn:hover {
    background: linear-gradient(135deg, #9B72CF, #6B3FA0);
    color: #fff;
    border-color: transparent;
    transform: translateY(-1px);
  }
  .ai-cat-btn:disabled { opacity: .5; cursor: default; transform: none; }

  .ai-messages {
    flex: 1;
    overflow-y: auto;
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    background: #F9F6FF;
    min-height: 0;
  }
  .ai-messages::-webkit-scrollbar { width: 4px; }
  .ai-messages::-webkit-scrollbar-thumb { background: #D8C8F0; border-radius: 4px; }

  .ai-msg {
    display: flex;
    gap: 8px;
    align-items: flex-end;
    max-width: 100%;
  }
  .ai-msg.user { flex-direction: row-reverse; }
  .ai-msg-avatar {
    width: 30px; height: 30px;
    border-radius: 50%;
    flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    font-size: 15px;
  }
  .ai-msg.bot .ai-msg-avatar { background: linear-gradient(135deg,#9B72CF,#6B3FA0); }
  .ai-msg.user .ai-msg-avatar { background: #E8E0F0; }

  .ai-bubble {
    padding: 10px 14px;
    border-radius: 18px;
    font-size: .875rem;
    line-height: 1.55;
    max-width: 290px;
    word-break: break-word;
    white-space: pre-line;
  }
  .ai-msg.bot .ai-bubble {
    background: #fff;
    color: #2D1B4E;
    border-bottom-left-radius: 4px;
    box-shadow: 0 2px 10px rgba(0,0,0,.07);
  }
  .ai-msg.user .ai-bubble {
    background: linear-gradient(135deg,#9B72CF,#6B3FA0);
    color: #fff;
    border-bottom-right-radius: 4px;
  }

  .ai-typing {
    display: flex; gap: 5px; align-items: center; padding: 4px 2px;
  }
  .ai-typing span {
    width: 7px; height: 7px;
    background: #9B72CF;
    border-radius: 50%;
    animation: aiTyping 1.2s infinite;
  }
  .ai-typing span:nth-child(2) { animation-delay: .2s; }
  .ai-typing span:nth-child(3) { animation-delay: .4s; }
  @keyframes aiTyping {
    0%,60%,100% { transform: translateY(0); opacity: .4; }
    30%          { transform: translateY(-7px); opacity: 1; }
  }

  .ai-products-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    gap: 10px;
    padding: 8px 0 4px;
    margin-left: 38px;
  }
  .ai-product-card {
    background: #fff;
    border-radius: 14px;
    overflow: hidden;
    box-shadow: 0 3px 12px rgba(0,0,0,.09);
    cursor: pointer;
    transition: transform .2s, box-shadow .2s;
    border: 2px solid transparent;
    position: relative;
  }
  .ai-product-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(107,63,160,.22);
    border-color: #9B72CF;
  }
  .ai-product-badge {
    position: absolute;
    top: 6px; left: 6px;
    color: #fff;
    font-size: .6rem;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 10px;
    letter-spacing: .04em;
    z-index: 1;
    text-transform: uppercase;
  }
  .ai-product-badge.nuevo  { background: #6B3FA0; }
  .ai-product-badge.oferta { background: #FF4D6D; }
  .ai-product-img {
    width: 100%; height: 110px;
    object-fit: cover;
    background: #F0EAF8;
    display: block;
  }
  .ai-product-img-placeholder {
    width: 100%; height: 110px;
    background: linear-gradient(135deg,#E8D5F8,#D4B8F0);
    display: flex; align-items: center; justify-content: center;
    font-size: 34px;
  }
  .ai-product-info { padding: 9px 9px 10px; }
  .ai-product-name {
    font-size: .73rem;
    font-weight: 600;
    color: #2D1B4E;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    line-height: 1.35;
    margin-bottom: 3px;
  }
  .ai-product-desc {
    font-size: .67rem;
    color: #7A6899;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    line-height: 1.35;
    margin-bottom: 5px;
  }
  .ai-product-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 4px;
  }
  .ai-product-price {
    font-size: .76rem;
    font-weight: 700;
    color: #9B72CF;
  }
  .ai-product-rating {
    font-size: .65rem;
    color: #F5A623;
    font-weight: 600;
  }
  .ai-product-ver {
    font-size: .63rem;
    color: #9B72CF;
    font-weight: 600;
    background: #F0EAF8;
    padding: 3px 7px;
    border-radius: 8px;
    margin-top: 5px;
    text-align: center;
    transition: background .15s;
  }
  .ai-product-card:hover .ai-product-ver {
    background: #9B72CF;
    color: #fff;
  }

  .ai-suggestions {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: 4px 0;
    margin-left: 38px;
  }
  .ai-suggestion-btn {
    background: #fff;
    border: 1.5px solid #D4B8F0;
    color: #6B3FA0;
    border-radius: 20px;
    padding: 6px 13px;
    font-size: .78rem;
    font-weight: 500;
    cursor: pointer;
    transition: all .15s;
    white-space: nowrap;
  }
  .ai-suggestion-btn:hover {
    background: #9B72CF;
    color: #fff;
    border-color: #9B72CF;
    transform: translateY(-1px);
  }

  .ai-input-area {
    padding: 12px 14px;
    border-top: 1px solid #EDE8F5;
    display: flex;
    gap: 8px;
    background: #fff;
    flex-shrink: 0;
  }
  .ai-input {
    flex: 1;
    border: 1.5px solid #E0D4F0;
    border-radius: 24px;
    padding: 10px 16px;
    font-size: .875rem;
    outline: none;
    color: #2D1B4E;
    transition: border-color .2s, box-shadow .2s;
    background: #F9F6FF;
    font-family: inherit;
  }
  .ai-input:focus { border-color: #9B72CF; box-shadow: 0 0 0 3px rgba(155,114,207,.12); }
  .ai-input::placeholder { color: #B8A8D4; }
  .ai-send {
    width: 40px; height: 40px;
    background: linear-gradient(135deg,#9B72CF,#6B3FA0);
    border: none;
    border-radius: 50%;
    color: #fff;
    font-size: 16px;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: transform .15s, opacity .15s;
    flex-shrink: 0;
  }
  .ai-send:hover:not(:disabled) { transform: scale(1.1); }
  .ai-send:disabled { opacity: .45; cursor: default; }
`;

const CATEGORIAS = [
  { label: "Bolsos",      emoji: "👜", query: "Muéstrame los bolsos y morrales disponibles" },
  { label: "Maquillaje",  emoji: "💄", query: "¿Qué productos de maquillaje tienen?" },
  { label: "Capilar",     emoji: "✨", query: "Quiero ver productos para el cabello" },
  { label: "Accesorios",  emoji: "💍", query: "¿Qué accesorios tienen disponibles?" },
  { label: "Billeteras",  emoji: "💳", query: "Quiero ver las billeteras" },
  { label: "Ofertas",     emoji: "🏷️", query: "¿Qué productos están en oferta?" },
  { label: "Novedades",   emoji: "🆕", query: "¿Qué hay de nuevo en Kosmica?" },
];

const SUGGESTIONS = [
  "¿Qué bolso está de moda? 👜",
  "Busco regalo para mi mamá 🎁",
  "Los más vendidos ⭐",
  "¿Tienen algo para el cabello?",
  "¿Qué hay en oferta? 💜",
  "Recomiéndame algo nuevo ✨",
];

const SYSTEM_PROMPT = (products) => `Eres ISABEL, la asesora personal de Kosmica — una tienda colombiana de belleza y accesorios premium. Eres la mejor amiga fashion de cada clienta: conoces el catálogo de memoria, tienes criterio estético y el don de hacer sentir especial a quien te escribe.

═══════════════════════════════════════
PERSONALIDAD Y VOZ
═══════════════════════════════════════
- Hablas como una amiga cercana, cálida, elegante y divertida — nunca robótica ni formal
- Usas el tuteo siempre. Puedes usar "amiga", "hermosa", "mi amor" con moderación y naturalidad
- Tu tono es el de una asesora personal que quiere genuinamente que la clienta quede enamorada
- Máximo 2 emojis por mensaje, bien elegidos
- NUNCA empieces con "¡Claro!", "¡Por supuesto!", "¡Entendido!" — ve directo al valor
- Arranca con una observación interesante, una recomendación, o una pregunta que enganche

═══════════════════════════════════════
CATÁLOGO DISPONIBLE (solo stock > 0)
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

Categorías disponibles: Bolsos y Morrales, Maquillaje, Capilar, Accesorios, Billeteras.

═══════════════════════════════════════
CÓMO RECOMENDAR
═══════════════════════════════════════
- Antes de recomendar, entiende QUÉ necesita: ¿es para ella o de regalo? ¿tiene ocasión especial? ¿qué estilo le gusta? ¿cuál es su presupuesto?
- Si no tienes suficiente info, haz UNA sola pregunta clave (no un interrogatorio)
- Cuando recomiendes, explica en 1 frase POR QUÉ ese producto es perfecto para ella — no solo listarlo
- Resalta materiales, detalles, para qué ocasión sirve, cómo combina
- Menciona la descripción del producto de forma natural en tu mensaje
- Si un producto tiene badge "OFERTA" o "NUEVO", menciónalo con entusiasmo
- Máximo 3 productos por recomendación
- NUNCA recomiendes productos con stock 0
- Precios siempre en pesos colombianos (COP)

═══════════════════════════════════════
RECORRIDO POR CATEGORÍAS
═══════════════════════════════════════
Cuando la clienta pide ver una categoría:
- Presenta los 3 mejores productos de esa categoría con entusiasmo
- Explica qué hace especial a cada uno
- Si hay variedad de precios, muestra opciones para distintos presupuestos
- Invítala a preguntar más detalles

═══════════════════════════════════════
SITUACIONES ESPECIALES
═══════════════════════════════════════
REGALO: Pregunta presupuesto y a quién es. Recomienda con frases como "para una mamá que ama cuidarse, esto es perfecto..."
PRESUPUESTO LIMITADO: Sé honesta, muestra lo mejor en ese rango sin hacerla sentir mal
DUDA ENTRE DOS: Ayúdala a decidir según su estilo/necesidad
PRODUCTO AGOTADO: Ofrece la alternativa más similar con entusiasmo
QUEJA O PROBLEMA: Muestra empatía real primero, luego oriéntala a contactar a Kosmica
SOLO EXPLORANDO: Engancha con una pregunta curiosa o muéstrale lo más nuevo

═══════════════════════════════════════
LÍMITES
═══════════════════════════════════════
- Solo hablas de productos de Kosmica y temas de belleza/moda relacionados
- Si preguntan algo fuera de tema, redirige con gracia
- Nunca inventes precios, características o disponibilidad — usa SOLO el catálogo
- Nunca hagas sentir mal a la clienta por su presupuesto o gustos
- Respuestas con gancho: máximo 4 líneas de texto antes de los productos

═══════════════════════════════════════
FORMATO OBLIGATORIO
═══════════════════════════════════════
Al final de CADA mensaje con recomendaciones de productos escribe EXACTAMENTE (sin markdown ni backticks):
PRODUCTOS_RECOMENDADOS:[id1,id2,id3]

Si no recomiendas productos, NO incluyas esa línea.`;

const formatPrice = (p) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(p);

const getCategoryEmoji = (cat = "") => {
  const c = cat.toUpperCase();
  if (c.includes("BOLSO") || c.includes("MORRAL")) return "👜";
  if (c.includes("MAQUILLAJE"))  return "💄";
  if (c.includes("CAPILAR"))     return "✨";
  if (c.includes("ACCESORIO"))   return "💍";
  if (c.includes("BILLETERA"))   return "💳";
  return "🧴";
};

export default function AIChatBot({ products = [], onProductClick }) {
  const [open, setOpen]         = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "bot",
      content: "Hola hermosa, soy Isabel ✨ Tu asesora personal de Kosmica. Cuéntame, ¿estás buscando algo para ti o es un regalo especial?",
      products: [],
    },
  ]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [unread, setUnread]     = useState(1);
  const messagesEndRef          = useRef(null);
  const inputRef                = useRef(null);

  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const extractProductIds = (text) => {
    const match = text.match(/PRODUCTOS_RECOMENDADOS:\[([^\]]*)\]/);
    if (!match) return [];
    return match[1].split(",").map((id) => parseInt(id.trim())).filter(Boolean);
  };

  const cleanText = (text) =>
    text.replace(/PRODUCTOS_RECOMENDADOS:\[[^\]]*\]/g, "").trim();

  const getProductsById = (ids) =>
    ids.map((id) => products.find((p) => p.id === id)).filter(Boolean);

  const sendMessage = async (text) => {
    const userText = text || input.trim();
    if (!userText || loading) return;
    setInput("");

    const newUserMsg = { role: "user", content: userText };
    const history    = [...messages, newUserMsg];
    setMessages(history);
    setLoading(true);

    const apiMessages = history
      .filter((m) => m.role === "user" || m.role === "bot")
      .map((m) => ({ role: m.role === "bot" ? "assistant" : "user", content: m.content }));

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
        const errMsg = data.error || `Error del servidor (${resp.status})`;
        console.error("Error API IA:", errMsg);
        setMessages((prev) => [
          ...prev,
          { role: "bot", content: `No pude conectarme ahora mismo (${errMsg}). ¿Intentamos de nuevo?`, products: [] },
        ]);
        return;
      }

      const rawText             = data.content?.[0]?.text || "Lo siento, no pude procesar tu mensaje. ¿Intentamos de nuevo?";
      const productIds          = extractProductIds(rawText);
      const cleanedText         = cleanText(rawText);
      const recommendedProducts = getProductsById(productIds);

      setMessages((prev) => [
        ...prev,
        { role: "bot", content: cleanedText, products: recommendedProducts },
      ]);

      if (!open) setUnread((u) => u + 1);
    } catch (e) {
      console.error("Error chat Kosmica:", e);
      setMessages((prev) => [
        ...prev,
        { role: "bot", content: "No pude conectarme al servidor. Verifica tu conexión e intenta de nuevo. 🔄", products: [] },
      ]);
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

      {/* Botón flotante */}
      <button className="ai-fab" onClick={() => setOpen((o) => !o)} title="Habla con Isabel">
        {open ? "✕" : "✨"}
        {!open && unread > 0 && <span className="ai-fab-badge">{unread}</span>}
      </button>

      {/* Ventana del chat */}
      {open && (
        <div className="ai-window">

          {/* Header */}
          <div className="ai-header">
            <div className="ai-header-avatar">✨</div>
            <div className="ai-header-info">
              <div className="ai-header-name">Isabel — Tu asesora de Kosmica</div>
              <div className="ai-header-status">
                <span className="ai-header-dot" />
                En línea y lista para asesorarte 💜
              </div>
            </div>
            <button className="ai-header-close" onClick={() => setOpen(false)}>✕</button>
          </div>

          {/* Barra de categorías */}
          <div className="ai-categories">
            {CATEGORIAS.map((cat) => (
              <button
                key={cat.label}
                className="ai-cat-btn"
                onClick={() => sendMessage(cat.query)}
                disabled={loading}
              >
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Mensajes */}
          <div className="ai-messages">
            {messages.map((msg, i) => (
              <div key={i}>
                <div className={`ai-msg ${msg.role}`}>
                  <div className="ai-msg-avatar">
                    {msg.role === "bot" ? "✨" : "👤"}
                  </div>
                  <div className="ai-bubble">{msg.content}</div>
                </div>

                {/* Tarjetas con foto + descripción */}
                {msg.products?.length > 0 && (
                  <div className="ai-products-grid">
                    {msg.products.map((prod) => (
                      <div
                        key={prod.id}
                        className="ai-product-card"
                        onClick={() => { onProductClick?.(prod); setOpen(false); }}
                        title={`Ver ${prod.name}`}
                      >
                        {prod.badge && (
                          <span className={`ai-product-badge ${prod.badge.toLowerCase()}`}>
                            {prod.badge}
                          </span>
                        )}
                        {prod.imageUrl ? (
                          <img src={prod.imageUrl} alt={prod.name} className="ai-product-img" loading="lazy" />
                        ) : (
                          <div className="ai-product-img-placeholder">
                            {getCategoryEmoji(prod.category)}
                          </div>
                        )}
                        <div className="ai-product-info">
                          <div className="ai-product-name">{prod.name}</div>
                          {prod.description && (
                            <div className="ai-product-desc">{prod.description}</div>
                          )}
                          <div className="ai-product-footer">
                            <span className="ai-product-price">{formatPrice(prod.price)}</span>
                            {prod.rating > 0 && (
                              <span className="ai-product-rating">⭐ {prod.rating}</span>
                            )}
                          </div>
                          <div className="ai-product-ver">Ver producto →</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Sugerencias rápidas solo en el primer mensaje */}
                {i === 0 && messages.length === 1 && (
                  <div className="ai-suggestions">
                    {SUGGESTIONS.map((s) => (
                      <button key={s} className="ai-suggestion-btn" onClick={() => sendMessage(s)}>
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="ai-msg bot">
                <div className="ai-msg-avatar">✨</div>
                <div className="ai-bubble">
                  <div className="ai-typing"><span /><span /><span /></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="ai-input-area">
            <input
              ref={inputRef}
              className="ai-input"
              placeholder="Cuéntame qué estás buscando..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={loading}
            />
            <button
              className="ai-send"
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
            >
              ➤
            </button>
          </div>

        </div>
      )}
    </>
  );
}
