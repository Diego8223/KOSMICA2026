// ============================================================
//  AIChatBot.jsx — Asistente IA de recomendaciones LuxShop
//  Llama al backend /api/ai/chat (que hace proxy a Claude API)
// ============================================================
import { useState, useEffect, useRef } from "react";

const STYLES = `
  .ai-fab {
    position: fixed;
    bottom: 28px;
    right: 28px;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: linear-gradient(135deg, #9B72CF, #6B3FA0);
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 26px;
    box-shadow: 0 4px 24px rgba(107,63,160,0.45);
    z-index: 9999;
    transition: transform .2s, box-shadow .2s;
  }
  .ai-fab:hover { transform: scale(1.1); box-shadow: 0 8px 32px rgba(107,63,160,0.6); }
  .ai-fab .ai-fab-badge {
    position: absolute;
    top: -4px; right: -4px;
    width: 18px; height: 18px;
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
    bottom: 100px;
    right: 28px;
    width: 370px;
    max-height: 600px;
    background: #fff;
    border-radius: 20px;
    box-shadow: 0 16px 64px rgba(0,0,0,0.18);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    z-index: 9999;
    animation: aiSlideIn .25s cubic-bezier(.34,1.56,.64,1);
  }
  @keyframes aiSlideIn {
    from { opacity: 0; transform: translateY(20px) scale(.96); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @media (max-width: 420px) {
    .ai-window { right: 10px; left: 10px; width: auto; bottom: 90px; }
  }

  .ai-header {
    background: linear-gradient(135deg, #9B72CF, #6B3FA0);
    padding: 16px 20px;
    display: flex;
    align-items: center;
    gap: 12px;
    color: #fff;
  }
  .ai-header-avatar {
    width: 40px; height: 40px;
    background: rgba(255,255,255,.2);
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 20px;
    flex-shrink: 0;
  }
  .ai-header-info { flex: 1; }
  .ai-header-name { font-weight: 700; font-size: .95rem; }
  .ai-header-status { font-size: .75rem; opacity: .85; display: flex; align-items: center; gap: 5px; }
  .ai-header-dot { width: 7px; height: 7px; background: #4DFFA0; border-radius: 50%; }
  .ai-header-close {
    background: rgba(255,255,255,.15);
    border: none; color: #fff;
    width: 30px; height: 30px;
    border-radius: 50%;
    cursor: pointer; font-size: 16px;
    display: flex; align-items: center; justify-content: center;
    transition: background .2s;
  }
  .ai-header-close:hover { background: rgba(255,255,255,.3); }

  .ai-messages {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    background: #F9F6FF;
    min-height: 0;
    max-height: 380px;
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
    width: 28px; height: 28px;
    border-radius: 50%;
    flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    font-size: 14px;
  }
  .ai-msg.bot .ai-msg-avatar { background: linear-gradient(135deg,#9B72CF,#6B3FA0); }
  .ai-msg.user .ai-msg-avatar { background: #E8E0F0; }

  .ai-bubble {
    padding: 10px 14px;
    border-radius: 16px;
    font-size: .875rem;
    line-height: 1.5;
    max-width: 260px;
    word-break: break-word;
  }
  .ai-msg.bot .ai-bubble {
    background: #fff;
    color: #2D1B4E;
    border-bottom-left-radius: 4px;
    box-shadow: 0 2px 8px rgba(0,0,0,.06);
  }
  .ai-msg.user .ai-bubble {
    background: linear-gradient(135deg,#9B72CF,#6B3FA0);
    color: #fff;
    border-bottom-right-radius: 4px;
  }

  .ai-typing {
    display: flex; gap: 4px; align-items: center; padding: 4px 0;
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
    30%          { transform: translateY(-6px); opacity: 1; }
  }

  .ai-products-row {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding: 4px 0 8px;
    scrollbar-width: none;
  }
  .ai-products-row::-webkit-scrollbar { display: none; }
  .ai-product-card {
    flex-shrink: 0;
    width: 120px;
    background: #fff;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 2px 10px rgba(0,0,0,.08);
    cursor: pointer;
    transition: transform .2s, box-shadow .2s;
    border: 2px solid transparent;
  }
  .ai-product-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 6px 20px rgba(107,63,160,.2);
    border-color: #9B72CF;
  }
  .ai-product-img {
    width: 100%; height: 90px;
    object-fit: cover;
    background: #F0EAF8;
  }
  .ai-product-img-placeholder {
    width: 100%; height: 90px;
    background: linear-gradient(135deg,#E8D5F8,#D4B8F0);
    display: flex; align-items: center; justify-content: center;
    font-size: 28px;
  }
  .ai-product-info { padding: 8px; }
  .ai-product-name {
    font-size: .72rem;
    font-weight: 600;
    color: #2D1B4E;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    line-height: 1.3;
    margin-bottom: 4px;
  }
  .ai-product-price {
    font-size: .75rem;
    font-weight: 700;
    color: #9B72CF;
  }

  .ai-suggestions {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: 4px 0;
  }
  .ai-suggestion-btn {
    background: #fff;
    border: 1.5px solid #D4B8F0;
    color: #6B3FA0;
    border-radius: 20px;
    padding: 5px 12px;
    font-size: .78rem;
    cursor: pointer;
    transition: all .15s;
    white-space: nowrap;
  }
  .ai-suggestion-btn:hover {
    background: #9B72CF;
    color: #fff;
    border-color: #9B72CF;
  }

  .ai-input-area {
    padding: 12px 16px;
    border-top: 1px solid #EDE8F5;
    display: flex;
    gap: 8px;
    background: #fff;
  }
  .ai-input {
    flex: 1;
    border: 1.5px solid #E0D4F0;
    border-radius: 24px;
    padding: 9px 16px;
    font-size: .875rem;
    outline: none;
    color: #2D1B4E;
    transition: border-color .2s;
    background: #F9F6FF;
  }
  .ai-input:focus { border-color: #9B72CF; }
  .ai-send {
    width: 38px; height: 38px;
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
  .ai-send:disabled { opacity: .5; cursor: default; }
`;

const SYSTEM_PROMPT = (products) => `Eres ISABEL, la asistente personal de Kosmica — una tienda colombiana de belleza y accesorios premium. No eres un bot genérico: eres la mejor amiga fashion de cada clienta, que conoce el catálogo de memoria y tiene el don de hacer sentir especial a quien le escribe.

═══════════════════════════════════════
PERSONALIDAD Y VOZ
═══════════════════════════════════════
- Hablas como una amiga cercana, cálida, elegante y divertida — nunca robótica ni formal
- Usas el tuteo siempre. Puedes usar "amiga", "hermosa" con moderación y naturalidad
- Tu tono es el de una stylist personal que quiere genuinamente que la clienta quede enamorada
- Máximo 2 emojis por mensaje, bien elegidos — no los spamees
- NUNCA digas frases genéricas como "¡Claro!", "¡Por supuesto!", "¡Entendido!" al inicio
- Arranca directo con valor: una observación interesante, una recomendación, o una pregunta que enganche

═══════════════════════════════════════
CATÁLOGO DISPONIBLE (solo productos con stock > 0)
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

Categorías disponibles: Bolsos y Morrales, Maquillaje, Capilar, Accesorios.

═══════════════════════════════════════
CÓMO RECOMENDAR
═══════════════════════════════════════
- Antes de recomendar, entiende QUÉ necesita: ¿es para ella o de regalo? ¿tiene ocasión especial? ¿qué estilo le gusta?
- Si no tienes suficiente info, haz UNA sola pregunta clave para afinar (no un interrogatorio)
- Cuando recomiendes, explica en 1 frase POR QUÉ ese producto es perfecto para ella — no solo listarlo
- Resalta lo que hace único cada producto: materiales, detalles, para qué ocasión sirve
- Si un producto tiene badge "OFERTA" o "NUEVO", menciónalo con entusiasmo natural
- Máximo 3 productos por recomendación
- NUNCA recomiendes productos con stock 0
- Precios siempre en pesos colombianos (COP)

Al final de cada mensaje con recomendaciones, incluye EXACTAMENTE esto (sin markdown ni backticks):
PRODUCTOS_RECOMENDADOS:[id1,id2,id3]

═══════════════════════════════════════
SITUACIONES ESPECIALES
═══════════════════════════════════════
REGALO: Pregunta presupuesto y a quién es. Recomienda con frases como "para una mamá que ama cuidarse, esto es perfecto..."
PRESUPUESTO LIMITADO: Sé honesta, muestra lo mejor en ese rango sin hacerla sentir mal
DUDA ENTRE DOS: Ayúdala a decidir según su estilo/necesidad, no digas "ambos son buenos"
PRODUCTO AGOTADO: Ofrece la alternativa más similar con entusiasmo
QUEJA O PROBLEMA: Muestra empatía real primero, luego oriéntala a contactar a Kosmica
SOLO EXPLORANDO: Engancha con una pregunta curiosa sobre su estilo o muéstrale lo más nuevo

═══════════════════════════════════════
LÍMITES
═══════════════════════════════════════
- Solo hablas de productos de Kosmica y temas de belleza/moda relacionados
- Si preguntan algo fuera de tema, redirige con gracia: "Eso escapa un poco de mi mundo fashion, pero lo que sí sé es que..."
- Nunca inventes precios, características o disponibilidad — usa SOLO el catálogo
- Nunca seas condescendiente ni hagas sentir mal a la clienta por su presupuesto o gustos
- Respuestas cortas y con gancho: máximo 4 líneas de texto antes de los productos`;

const SUGGESTIONS = [
  "¿Qué bolso está de moda? 👜",
  "Busco regalo para mi mamá 🎁",
  "¿Qué tiene de nuevo Kosmica?",
  "Los más vendidos ⭐",
  "¿Tienen algo para el cabello?",
  "¿Qué hay en oferta? 💜",
];

const formatPrice = (p) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(p);

export default function AIChatBot({ products = [], onProductClick }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "bot",
      content: "Hola hermosa, soy Isabel ✨ Tu asistente personal de Kosmica. Dime, ¿estás buscando algo para ti o es un regalo especial?",
      products: [],
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(1);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

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
    const history = [...messages, newUserMsg];
    setMessages(history);
    setLoading(true);

    // Construir historial para la API (solo role user/assistant)
    const apiMessages = history
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role === "bot" ? "assistant" : m.role, content: m.content }));

    // Añadir el mensaje del usuario actual
    if (apiMessages[apiMessages.length - 1]?.role !== "user") {
      apiMessages.push({ role: "user", content: userText });
    }

    try {
      const backendUrl = process.env.REACT_APP_API_URL || 'https://kosmica-backend.onrender.com';

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

      // Si el backend devolvió un error
      if (!resp.ok || data.error) {
        const errMsg = data.error || `Error del servidor (${resp.status})`;
        console.error("Error API IA:", errMsg);
        setMessages((prev) => [
          ...prev,
          { role: "bot", content: `No pude conectarme ahora mismo. (${errMsg}) ¿Intentamos de nuevo?`, products: [] },
        ]);
        return;
      }

      const rawText = data.content?.[0]?.text || "Lo siento, no pude procesar tu mensaje. ¿Intentamos de nuevo?";
      const productIds = extractProductIds(rawText);
      const cleanedText = cleanText(rawText);
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
      <button className="ai-fab" onClick={() => setOpen((o) => !o)} title="Asistente IA">
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
              <div className="ai-header-name">Isabel ✨ Tu asesora de Kosmica</div>
              <div className="ai-header-status">
                <span className="ai-header-dot" />
                Lista para ayudarte 💜
              </div>
            </div>
            <button className="ai-header-close" onClick={() => setOpen(false)}>✕</button>
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

                {/* Productos recomendados */}
                {msg.products?.length > 0 && (
                  <div className="ai-products-row" style={{ paddingLeft: 36 }}>
                    {msg.products.map((prod) => (
                      <div
                        key={prod.id}
                        className="ai-product-card"
                        onClick={() => { onProductClick?.(prod); setOpen(false); }}
                        title={prod.name}
                      >
                        {prod.imageUrl ? (
                          <img src={prod.imageUrl} alt={prod.name} className="ai-product-img" />
                        ) : (
                          <div className="ai-product-img-placeholder">
                            {prod.category === "BOLSOS" ? "👜"
                              : prod.category === "MAQUILLAJE" ? "💄"
                              : prod.category === "CAPILAR" ? "✨"
                              : prod.category === "ACCESORIOS" ? "💍"
                              : prod.category === "BILLETERAS" ? "💳"
                              : "🧴"}
                          </div>
                        )}
                        <div className="ai-product-info">
                          <div className="ai-product-name">{prod.name}</div>
                          <div className="ai-product-price">{formatPrice(prod.price)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Sugerencias rápidas solo en primer mensaje */}
                {i === 0 && messages.length === 1 && (
                  <div className="ai-suggestions" style={{ paddingLeft: 36 }}>
                    {SUGGESTIONS.map((s) => (
                      <button key={s} className="ai-suggestion-btn" onClick={() => sendMessage(s)}>
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Indicador de escritura */}
            {loading && (
              <div className="ai-msg bot">
                <div className="ai-msg-avatar">✨</div>
                <div className="ai-bubble">
                  <div className="ai-typing">
                    <span /><span /><span />
                  </div>
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
              placeholder="Escríbeme lo que necesitas..."
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
