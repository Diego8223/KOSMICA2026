// ═══════════════════════════════════════════════════════════
//  Kosmica AI Microservice — Node.js + Express
//  Responsabilidad: SOLO lógica de IA y chatbot
//  Despliegue: Render (Web Service, Node)
//  Puerto: 4000 (configurable via PORT env)
// ═══════════════════════════════════════════════════════════

const express    = require("express");
const cors       = require("cors");
const helmet     = require("helmet");
const rateLimit  = require("express-rate-limit");

const app  = express();
const PORT = process.env.PORT || 4000;

// ─── Seguridad básica ────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "64kb" })); // limita payloads grandes

// ─── CORS ────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "").split(",").filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      cb(null, true);
    } else {
      cb(new Error("CORS: origen no permitido"));
    }
  },
}));

// ─── Rate limiting: max 30 req/min por IP ────────────────────
app.use("/api/ai", rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiadas solicitudes. Espera un momento." },
}));

// ═══════════════════════════════════════════════════════════
//  QUICK INTENTS — respuestas sin IA (< 5ms)
//  Detecta patrones comunes y devuelve respuesta local
// ═══════════════════════════════════════════════════════════
const QUICK_INTENTS = [
  {
    patterns: [/^(hola|buenas|buenos días|buenas tardes|buenas noches|hey|hi)\b/i],
    response: () => "Hola hermosa! ✨ Soy Isabel, tu asesora personal de Kosmica. ¿Buscas algo para ti o es un regalo especial?",
  },
  {
    patterns: [/envío|domicilio|despacho|shipping|cuánto.*envío|envío.*cuánto/i],
    response: () => "El costo de envío depende de tu ciudad y lo calculas en el checkout con opciones reales de transportadoras 🚚. ¿Quieres que te ayude a elegir un producto primero?",
  },
  {
    patterns: [/pago|mercadopago|tarjeta|efectivo|transferencia|cómo.*pago/i],
    response: () => "Aceptamos MercadoPago: tarjeta de crédito/débito, PSE, Nequi, Daviplata y efectivo 💳. Seguro y rápido. ¿Te ayudo a encontrar lo que buscas?",
  },
  {
    patterns: [/devolución|cambio|garantía|devolver/i],
    response: () => "Tienes hasta 15 días para cambios o devoluciones si el producto llega en mal estado. Escríbenos a hola@kosmica.com y te ayudamos de inmediato 💜",
  },
  {
    patterns: [/gracias|muchas gracias|thank/i],
    response: () => "¡Con gusto, hermosa! Fue un placer ayudarte ✨ Cualquier cosa que necesites, aquí estoy.",
  },
  {
    patterns: [/horario|horarios|atienden|atención|cuándo.*abren/i],
    response: () => "Somos una tienda 100% online — disponible las 24 horas 🌙. Pedidos y envíos de lunes a sábado. ¿Te ayudo a encontrar algo?",
  },
  {
    patterns: [/contacto|whatsapp|teléfono|email|correo/i],
    response: () => "Puedes contactarnos en hola@kosmica.com o por WhatsApp al +57 304 392 7148. ¿En qué te puedo ayudar yo? 💜",
  },
  {
    patterns: [/adios|chao|hasta luego|bye/i],
    response: () => "¡Hasta pronto, reina! Fue un placer atenderte. Vuelve cuando quieras ✨",
  },
];

function matchQuickIntent(text) {
  const clean = text.trim();
  for (const intent of QUICK_INTENTS) {
    if (intent.patterns.some(p => p.test(clean))) {
      return intent.response();
    }
  }
  return null;
}

// ═══════════════════════════════════════════════════════════
//  FILTRADO DE PRODUCTOS — reduce tokens enviados a la IA
//  Selecciona máx 12 productos relevantes según la consulta
// ═══════════════════════════════════════════════════════════
const CATEGORY_KEYWORDS = {
  "Bolsos y Morrales": ["bolso", "cartera", "morral", "bolsa", "tote", "clutch", "shopper"],
  "Maquillaje":        ["maquillaje", "labial", "base", "sombra", "rubor", "corrector", "rimmel", "máscara", "brillo", "delineador"],
  "Capilar":           ["cabello", "pelo", "shampoo", "acondicionador", "mascarilla", "keratina", "tinte", "capilar", "tratamiento"],
  "Accesorios":        ["accesorio", "collar", "aretes", "pulsera", "anillo", "gafas", "cinturón", "bufanda", "sombrero"],
  "Billeteras":        ["billetera", "monedero", "porta", "wallet"],
};

const INTENT_KEYWORDS = {
  oferta:    ["oferta", "descuento", "rebaja", "barato", "económico", "promoción", "sale"],
  nuevo:     ["nuevo", "nueva", "novedad", "reciente", "lanzamiento", "llegó"],
  popular:   ["popular", "vendido", "favorito", "trend", "moda", "viral"],
  regalo:    ["regalo", "obsequio", "cumpleaños", "mamá", "amiga", "novia", "esposa"],
};

function filterProducts(products, query) {
  const q = query.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // quita tildes
  
  const available = products.filter(p => p.stock > 0);
  
  // 1. Filtro por categoría (alta precisión)
  let byCategory = [];
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(k => q.includes(k))) {
      byCategory = available.filter(p =>
        p.category?.toLowerCase().includes(cat.toLowerCase())
      );
      break;
    }
  }

  // 2. Filtro por intent especial
  const intentMatches = [];
  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    if (keywords.some(k => q.includes(k))) {
      if (intent === "oferta") {
        intentMatches.push(...available.filter(p => p.badge === "OFERTA"));
      } else if (intent === "nuevo") {
        intentMatches.push(...available.filter(p => p.badge === "NUEVO"));
      } else if (intent === "popular") {
        // Top rated
        intentMatches.push(...[...available].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 10));
      } else if (intent === "regalo") {
        // Mix de categorías, ordenados por rating
        intentMatches.push(...[...available].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 12));
      }
    }
  }

  // 3. Búsqueda por texto en nombre/descripción
  const words = q.split(/\s+/).filter(w => w.length > 3);
  const byText = words.length > 0
    ? available.filter(p =>
        words.some(w =>
          p.name?.toLowerCase().includes(w) ||
          p.description?.toLowerCase().includes(w)
        )
      )
    : [];

  // 4. Merge y deduplicar, priorizando categoría
  const seen = new Set();
  const result = [];
  for (const p of [...byCategory, ...intentMatches, ...byText]) {
    if (!seen.has(p.id)) {
      seen.add(p.id);
      result.push(p);
    }
  }

  // Si no hay matches específicos, devuelve los mejor valorados
  if (result.length === 0) {
    return [...available]
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 12);
  }

  // Mapea solo los campos necesarios (reduce tokens ~60%)
  return result.slice(0, 12).map(p => ({
    id:          p.id,
    nombre:      p.name,
    descripcion: p.description?.slice(0, 120) || "",  // trunca descripción larga
    precio:      `$${Number(p.price).toLocaleString("es-CO")} COP`,
    categoria:   p.category,
    rating:      p.rating,
    stock:       Math.min(p.stock, 10), // no revelar stock exacto, solo "hay"
    badge:       p.badge || null,
  }));
}

// ═══════════════════════════════════════════════════════════
//  SYSTEM PROMPT — compacto y orientado a ventas
// ═══════════════════════════════════════════════════════════
function buildSystemPrompt(filteredProducts) {
  return `Eres ISABEL, asesora de ventas de Kosmica (Colombia). Experta en moda, accesorios y belleza.

PERSONALIDAD: Cálida, directa, colombiana. Tuteo siempre. 2 emojis máx por mensaje. Respuestas cortas (3-4 líneas máx). NUNCA empieces con "¡Claro!" o "¡Por supuesto!".

ESTRATEGIA DE VENTAS:
• Entiende qué busca en 1 pregunta máx
• Recomienda máx 3 productos con razón específica
• Crea urgencia: "oferta vuela", "pocas unidades"
• Cierra SIEMPRE con CTA: "¿Lo agregamos al carrito?" o "¿Te cuento más?"
• Si el cliente duda → compara 2 opciones y ayúdala a decidir

PRODUCTOS DISPONIBLES AHORA:
${JSON.stringify(filteredProducts, null, 1)}

REGLA DE FORMATO — CRÍTICA:
Si recomiendas productos, termina el mensaje con:
PRODUCTOS_RECOMENDADOS:id1,id2,id3

LÍMITES:
• Solo productos Kosmica
• Nunca inventes precios ni características
• Stock 0 = no existe para ti`;
}

// ═══════════════════════════════════════════════════════════
//  ENDPOINT PRINCIPAL: POST /api/ai/chat
// ═══════════════════════════════════════════════════════════
app.post("/api/ai/chat", async (req, res) => {
  const { messages = [], products = [], lastUserMessage = "" } = req.body;

  // ── 1. Quick intent check (sin IA) ──────────────────────
  const lastMsg = lastUserMessage || messages.findLast?.(m => m.role === "user")?.content || "";
  const quickReply = matchQuickIntent(lastMsg);
  if (quickReply) {
    return res.json({
      content: [{ type: "text", text: quickReply }],
      source:  "quick_intent",
    });
  }

  // ── 2. Validar GROQ_API_KEY ──────────────────────────────
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    return res.status(500).json({ error: "GROQ_API_KEY no configurada en variables de entorno" });
  }

  // ── 3. Filtrar productos relevantes ─────────────────────
  const filteredProducts = filterProducts(products, lastMsg);

  // ── 4. Limitar historial a últimos 6 mensajes ───────────
  const trimmedHistory = messages.slice(-6).map(m => ({
    role:    m.role === "bot" ? "assistant" : m.role,
    content: String(m.content).slice(0, 500), // trunca mensajes muy largos
  }));

  // ── 5. Llamar a Groq ─────────────────────────────────────
  try {
    const groqPayload = {
      model:       "llama-3.3-70b-versatile",
      max_tokens:  400,        // suficiente para respuesta de ventas
      temperature: 0.72,
      messages: [
        { role: "system", content: buildSystemPrompt(filteredProducts) },
        ...trimmedHistory,
      ],
    };

    const groqResp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method:  "POST",
      headers: {
        "Authorization": `Bearer ${groqKey}`,
        "Content-Type":  "application/json",
      },
      body:    JSON.stringify(groqPayload),
      signal:  AbortSignal.timeout(8000), // timeout 8s
    });

    if (!groqResp.ok) {
      const errText = await groqResp.text();
      console.error("Groq error:", groqResp.status, errText);
      return res.status(groqResp.status).json({ error: `Error de IA: ${groqResp.status}` });
    }

    const groqData = await groqResp.json();
    const text = groqData.choices?.[0]?.message?.content || "";

    // Devuelve en formato compatible con el frontend existente
    return res.json({
      content: [{ type: "text", text }],
      source:  "groq_ai",
      debug: {
        productsFiltered: filteredProducts.length,
        historyLength:    trimmedHistory.length,
        tokensUsed:       groqData.usage?.total_tokens,
      },
    });

  } catch (err) {
    if (err.name === "TimeoutError") {
      return res.status(504).json({ error: "La IA tardó demasiado. Intenta de nuevo." });
    }
    console.error("AI service error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ─── Health check ────────────────────────────────────────────
app.get("/health", (_req, res) => res.json({ status: "ok", service: "kosmica-ai" }));

// ─── 404 ─────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: "Endpoint no encontrado" }));

// ─── Error handler ───────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ error: "Error interno del servidor" });
});

app.listen(PORT, () => {
  console.log(`✅ Kosmica AI Service corriendo en puerto ${PORT}`);
  console.log(`   GROQ_API_KEY: ${process.env.GROQ_API_KEY ? "✅ configurada" : "❌ FALTA"}`);
});
