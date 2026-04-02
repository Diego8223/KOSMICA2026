// ============================================================
//  src/components/AIChatBot.jsx — Isabel · Asesora Kosmica
//  Coloca este archivo en: src/components/AIChatBot.jsx
// ============================================================
import { useState, useEffect, useRef } from "react";

// ── Productos del catálogo (reemplaza con tu API real si quieres) ──
const CATALOG = [
  {id:1,  name:"Bolso dama elegante",   cat:"bolsos",    price:89000,  emoji:"👜", top:true},
  {id:2,  name:"Bolso crossbody",        cat:"bolsos",    price:65000,  emoji:"👜", top:false},
  {id:3,  name:"Bolso clutch noche",     cat:"bolsos",    price:55000,  emoji:"👜", top:false},
  {id:4,  name:"Bolso tote grande",      cat:"bolsos",    price:78000,  emoji:"👜", top:false},
  {id:5,  name:"Morral dama",            cat:"morrales",  price:68000,  emoji:"🎒", top:true},
  {id:6,  name:"Morral Hello Kitty",     cat:"morrales",  price:72000,  emoji:"🎒", top:true},
  {id:7,  name:"Morral ejecutivo",       cat:"morrales",  price:95000,  emoji:"🎒", top:false},
  {id:8,  name:"Morral casual deportivo",cat:"morrales",  price:58000,  emoji:"🎒", top:false},
  {id:9,  name:"Billetera dama",         cat:"billeteras",price:35000,  emoji:"👛", top:true},
  {id:10, name:"Billetera hombre",       cat:"billeteras",price:38000,  emoji:"👛", top:false},
  {id:11, name:"Billetera con cadena",   cat:"billeteras",price:42000,  emoji:"👛", top:false},
  {id:12, name:"Kit maquillaje completo",cat:"maquillaje",price:120000, emoji:"💄", top:true},
  {id:13, name:"Labiales mate x5",       cat:"maquillaje",price:45000,  emoji:"💄", top:false},
  {id:14, name:"Paleta sombras glam",    cat:"maquillaje",price:65000,  emoji:"💄", top:true},
  {id:15, name:"Base líquida cobertura", cat:"maquillaje",price:52000,  emoji:"💄", top:false},
  {id:16, name:"Shampoo nutritivo",      cat:"capilar",   price:38000,  emoji:"💇", top:true},
  {id:17, name:"Mascarilla capilar",     cat:"capilar",   price:44000,  emoji:"💇", top:false},
  {id:18, name:"Aceite capilar serum",   cat:"capilar",   price:36000,  emoji:"💇", top:false},
  {id:19, name:"Aretes dorados",         cat:"accesorios",price:28000,  emoji:"💍", top:false},
  {id:20, name:"Collar perlas",          cat:"accesorios",price:35000,  emoji:"💍", top:true},
  {id:21, name:"Pulsera tejida",         cat:"accesorios",price:18000,  emoji:"💍", top:false},
  {id:22, name:"Crema corporal",         cat:"cuidado",   price:32000,  emoji:"🧴", top:false},
  {id:23, name:"Set baño premium",       cat:"cuidado",   price:65000,  emoji:"🧴", top:true},
  {id:24, name:"Perfume floral dama",    cat:"cuidado",   price:88000,  emoji:"🧴", top:false},
];

const fmtCOP = (n) => "$" + Number(n).toLocaleString("es-CO");
const getTime = () => {
  const d = new Date();
  return String(d.getHours()).padStart(2,"0") + ":" + String(d.getMinutes()).padStart(2,"0");
};

// ── Estilos del bot (aislados para no interferir con App.jsx) ──
const BOT_CSS = `
.kb-overlay{position:fixed;inset:0;z-index:1000;display:flex;align-items:flex-end;justify-content:flex-end;padding:0 16px 90px;pointer-events:none}
.kb-overlay *{box-sizing:border-box;margin:0;padding:0}
.kb-window{
  width:min(420px,96vw);height:min(640px,85vh);
  display:flex;flex-direction:column;
  border-radius:20px;overflow:hidden;
  border:1px solid rgba(139,92,246,.25);
  background:#fff;
  box-shadow:0 16px 60px rgba(76,29,149,.35);
  pointer-events:all;
  transform:translateY(20px) scale(.97);opacity:0;
  transition:transform .3s cubic-bezier(.34,1.56,.64,1),opacity .25s;
  font-family:'DM Sans',sans-serif
}
.kb-window.kb-open{transform:translateY(0) scale(1);opacity:1}
.kb-header{
  background:linear-gradient(135deg,#4C1D95,#6C3FC5,#8B5CF6);
  padding:14px 16px;display:flex;align-items:center;gap:11px;flex-shrink:0
}
.kb-avatar{
  width:44px;height:44px;border-radius:50%;border:2px solid rgba(255,255,255,.4);
  background:linear-gradient(135deg,#E040FB,#8B5CF6);
  display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;
  position:relative
}
.kb-dot{
  position:absolute;bottom:1px;right:1px;width:11px;height:11px;
  background:#22c55e;border-radius:50%;border:2px solid #5b21b6
}
.kb-hinfo{flex:1;min-width:0}
.kb-hname{color:#fff;font-weight:700;font-size:15px;display:flex;align-items:center;gap:7px}
.kb-badge{
  background:rgba(255,255,255,.2);color:#fff;font-size:9.5px;font-weight:700;
  padding:2px 7px;border-radius:20px;border:1px solid rgba(255,255,255,.3);letter-spacing:.4px;
  white-space:nowrap
}
.kb-hsub{color:rgba(255,255,255,.75);font-size:11px;margin-top:2px}
.kb-hbtns{display:flex;gap:6px;align-items:center;flex-shrink:0}
.kb-hbtn{
  background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);
  color:#fff;font-size:11px;padding:3px 10px;border-radius:12px;cursor:pointer;
  font-family:inherit;font-weight:600;transition:background .2s
}
.kb-hbtn:hover{background:rgba(255,255,255,.28)}
.kb-close{
  background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);
  color:#fff;width:28px;height:28px;border-radius:50%;cursor:pointer;
  font-size:15px;display:flex;align-items:center;justify-content:center;transition:background .2s
}
.kb-close:hover{background:rgba(255,255,255,.3)}
.kb-cats{
  display:flex;gap:6px;padding:9px 12px 7px;overflow-x:auto;
  background:#fff;border-bottom:1px solid #f0ebff;scrollbar-width:none;flex-shrink:0
}
.kb-cats::-webkit-scrollbar{display:none}
.kb-cat{
  flex-shrink:0;padding:4px 11px;border-radius:20px;border:1px solid #e5e7eb;
  background:#fafafa;color:#6b7280;font-size:11.5px;font-family:inherit;
  cursor:pointer;white-space:nowrap;transition:all .2s;font-weight:500
}
.kb-cat:hover,.kb-cat.kb-active{background:#6C3FC5;color:#fff;border-color:#6C3FC5}
.kb-msgs{
  flex:1;overflow-y:auto;padding:12px 12px 6px;
  display:flex;flex-direction:column;gap:9px;scroll-behavior:smooth;background:#fdfcff
}
.kb-msgs::-webkit-scrollbar{width:3px}
.kb-msgs::-webkit-scrollbar-thumb{background:#d8b4fe;border-radius:3px}
.kb-bot,.kb-user{max-width:88%;display:flex;flex-direction:column;gap:3px}
.kb-bot{align-self:flex-start}
.kb-user{align-self:flex-end}
.kb-bub{padding:9px 13px;border-radius:15px;font-size:13px;line-height:1.55}
.kb-bub-bot{background:#f0ebff;color:#1a0a2e;border-bottom-left-radius:3px}
.kb-bub-user{background:linear-gradient(135deg,#6C3FC5,#8B5CF6);color:#fff;border-bottom-right-radius:3px}
.kb-time{font-size:9.5px;color:#9ca3af;align-self:flex-end}
.kb-bot .kb-time{align-self:flex-start}
.kb-chips{display:flex;flex-wrap:wrap;gap:5px;margin-top:3px}
.kb-chip{
  padding:4px 12px;border-radius:20px;border:1.5px solid #8B5CF6;color:#6C3FC5;
  font-size:11.5px;cursor:pointer;background:#fff;font-family:inherit;
  font-weight:500;transition:all .2s
}
.kb-chip:hover{background:#6C3FC5;color:#fff}
.kb-pgrid{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:7px;max-width:320px}
.kb-pcard{
  background:#fff;border:1px solid #ede9fe;border-radius:11px;overflow:hidden;
  cursor:pointer;transition:all .2s
}
.kb-pcard:hover{border-color:#8B5CF6;transform:translateY(-1px)}
.kb-pimg{
  width:100%;height:80px;background:linear-gradient(135deg,#f0ebff,#ede9fe);
  display:flex;align-items:center;justify-content:center;font-size:30px
}
.kb-pinfo{padding:6px 8px}
.kb-pcat{font-size:8.5px;color:#8B5CF6;font-weight:700;text-transform:uppercase;letter-spacing:.4px}
.kb-pname{font-size:11px;font-weight:600;color:#1a0a2e;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kb-pprice{font-size:12px;font-weight:700;color:#6C3FC5;margin-top:2px}
.kb-pbtn{
  width:100%;padding:5px;background:linear-gradient(135deg,#6C3FC5,#8B5CF6);
  color:#fff;border:none;border-radius:7px;font-size:10.5px;font-family:inherit;
  font-weight:600;cursor:pointer;margin-top:4px;transition:opacity .2s
}
.kb-pbtn:hover{opacity:.88}
.kb-typing{
  display:flex;align-items:center;gap:4px;padding:9px 13px;
  background:#f0ebff;border-radius:15px;border-bottom-left-radius:3px;width:58px
}
.kb-tdot{
  width:5px;height:5px;border-radius:50%;background:#8B5CF6;
  animation:kbbounce 1.2s infinite
}
.kb-tdot:nth-child(2){animation-delay:.2s}
.kb-tdot:nth-child(3){animation-delay:.4s}
@keyframes kbbounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-4px)}}
.kb-footer{padding:9px 11px;background:#fff;border-top:1px solid #f0ebff;display:flex;gap:7px;align-items:center;flex-shrink:0}
.kb-input{
  flex:1;padding:9px 14px;border:1.5px solid #ede9fe;border-radius:22px;
  font-size:13px;font-family:inherit;outline:none;color:#1a0a2e;
  transition:border .2s;background:#fafafa
}
.kb-input:focus{border-color:#8B5CF6;background:#fff}
.kb-send{
  width:36px;height:36px;border-radius:50%;
  background:linear-gradient(135deg,#6C3FC5,#8B5CF6);
  border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;
  flex-shrink:0;transition:opacity .2s
}
.kb-send:hover{opacity:.88}
.kb-cart-bar{
  background:linear-gradient(135deg,#4C1D95,#6C3FC5);color:#fff;
  padding:8px 14px;display:flex;align-items:center;justify-content:space-between;
  font-size:12px;flex-shrink:0
}
.kb-cart-btn{
  background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.3);
  color:#fff;padding:4px 13px;border-radius:11px;font-size:11px;
  font-family:inherit;cursor:pointer;font-weight:600;transition:background .2s
}
.kb-cart-btn:hover{background:rgba(255,255,255,.32)}
.kb-fab{
  position:fixed;bottom:22px;right:16px;z-index:999;
  width:56px;height:56px;border-radius:50%;
  background:linear-gradient(135deg,#6C3FC5,#8B5CF6);
  border:none;cursor:pointer;
  box-shadow:0 6px 24px rgba(108,63,197,.5);
  display:flex;align-items:center;justify-content:center;
  font-size:26px;transition:transform .2s,box-shadow .2s
}
.kb-fab:hover{transform:scale(1.08);box-shadow:0 8px 32px rgba(108,63,197,.6)}
.kb-fab-badge{
  position:absolute;top:-2px;right:-2px;background:#ef4444;color:#fff;
  border-radius:50%;width:18px;height:18px;font-size:10px;font-weight:700;
  display:flex;align-items:center;justify-content:center;border:2px solid #fff
}
@media(min-width:640px){
  .kb-overlay{align-items:flex-end;padding:0 24px 24px}
  .kb-fab{bottom:24px;right:24px}
}
`;

export default function AIChatBot({ products: externalProducts }) {
  const [open, setOpen]       = useState(false);
  const [msgs, setMsgs]       = useState([]);
  const [chips, setChips]     = useState([]);
  const [input, setInput]     = useState("");
  const [typing, setTyping]   = useState(false);
  const [cart, setCart]       = useState([]);
  const [clientName, setClientName] = useState("");
  const [waitName, setWaitName]     = useState(false);
  const [history, setHistory]       = useState([]);
  const [cartBadge, setCartBadge]   = useState(0);
  const msgsRef = useRef(null);

  // Usa productos externos si se pasan, si no usa el catálogo local
  const PRODUCTS = (externalProducts && externalProducts.length > 0)
    ? externalProducts.map(p => ({
        id: p.id,
        name: p.name,
        cat: p.category || p.cat || "general",
        price: p.price,
        emoji: p.emoji || "🛍️",
        top: p.topSale || p.top || false,
      }))
    : CATALOG;

  const CATEGORIES = [...new Set(PRODUCTS.map(p => p.cat))];

  // Inyectar CSS una sola vez
  useEffect(() => {
    if (!document.getElementById("kosmica-bot-css")) {
      const s = document.createElement("style");
      s.id = "kosmica-bot-css";
      s.textContent = BOT_CSS;
      document.head.appendChild(s);
    }
  }, []);

  // Scroll al final en cada mensaje nuevo
  useEffect(() => {
    if (msgsRef.current) {
      msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
    }
  }, [msgs, typing]);

  // Cargar nombre guardado e iniciar conversación
  useEffect(() => {
    const savedName = (() => { try { return localStorage.getItem("kb_client") || ""; } catch { return ""; } })();
    const savedHist = (() => { try { const r = localStorage.getItem("kb_history"); return r ? JSON.parse(r) : []; } catch { return []; } })();
    const savedCart = (() => { try { const r = localStorage.getItem("kb_cart"); return r ? JSON.parse(r) : []; } catch { return []; } })();

    if (savedName) {
      setClientName(savedName);
      setHistory(savedHist);
      if (savedCart.length) {
        setCart(savedCart);
        setCartBadge(savedCart.reduce((a, b) => a + b.qty, 0));
      }
      addBotMsg(
        `¡Hola de nuevo, <strong>${savedName}</strong>! 💜 Qué bueno verte otra vez en Kosmica. ¿Qué te llama la atención hoy? ✨`,
        ["Ver más vendidos", "Ver novedades", "Necesito un regalo", "Ver todo el catálogo"]
      );
    } else {
      addBotMsg(
        `¡Hola! Soy <strong>Isabel</strong>, tu asesora personal de Kosmica ✨<br><br>Tenemos bolsos, morrales, billeteras, maquillaje, productos capilares, cuidado personal y accesorios. ¡Todo con estilo!<br><br>¿Cómo te llamas para atenderte mejor? 💜`
      );
      setWaitName(true);
    }
  }, []);

  // ── Helpers ────────────────────────────────────────────────
  const save = (name, hist, cartData) => {
    try {
      if (name) localStorage.setItem("kb_client", name);
      localStorage.setItem("kb_history", JSON.stringify(hist.slice(-30)));
      localStorage.setItem("kb_cart", JSON.stringify(cartData));
    } catch {}
  };

  const addBotMsg = (html, nextChips = []) => {
    const msg = { role: "bot", html, time: getTime(), id: Date.now() + Math.random() };
    setMsgs(prev => [...prev, msg]);
    setChips(nextChips);
  };

  const addUserMsg = (text) => {
    const msg = { role: "user", text, time: getTime(), id: Date.now() + Math.random() };
    setMsgs(prev => [...prev, msg]);
    setChips([]);
  };

  const renderProducts = (prods) => {
    if (!prods.length) return "";
    const cards = prods.slice(0, 4).map(p =>
      `<div class="kb-pcard" data-prod-id="${p.id}">
        <div class="kb-pimg">${p.emoji}</div>
        <div class="kb-pinfo">
          <div class="kb-pcat">${p.cat}</div>
          <div class="kb-pname">${p.name}</div>
          <div class="kb-pprice">${fmtCOP(p.price)}</div>
          <button class="kb-pbtn" data-prod-id="${p.id}">🛒 Agregar</button>
        </div>
      </div>`
    ).join("");
    return `<div class="kb-pgrid">${cards}</div>`;
  };

  // ── Delegación de eventos en tarjetas de producto ──────────
  const handleMsgClick = (e) => {
    const btn = e.target.closest("[data-prod-id]");
    if (btn) {
      const id = parseInt(btn.getAttribute("data-prod-id"));
      handleAddToCart(id);
    }
  };

  const handleAddToCart = (id) => {
    const p = PRODUCTS.find(x => x.id === id);
    if (!p) return;
    setCart(prev => {
      const ex = prev.find(x => x.id === id);
      const next = ex
        ? prev.map(x => x.id === id ? { ...x, qty: x.qty + 1 } : x)
        : [...prev, { ...p, qty: 1 }];
      setCartBadge(next.reduce((a, b) => a + b.qty, 0));
      save(clientName, history, next);
      return next;
    });
    addBotMsg(
      `¡Perfecto! Agregué <strong>${p.name}</strong> a tu pedido 🛒<br>¿Deseas algo más o quieres que un asesor te contacte?`,
      ["Ver mi pedido", "Seguir comprando", "Quiero que me contacten"]
    );
  };

  // ── System prompt para la IA ───────────────────────────────
  const buildSystem = (name) => {
    const list = PRODUCTS.map(p =>
      `ID${p.id}: ${p.name} (${p.cat}) ${fmtCOP(p.price)}${p.top ? " [TOP VENTA]" : ""}`
    ).join("\n");
    return `Eres Isabel, asesora de ventas virtual de Kosmica Colombia — tienda de bolsos, morrales, billeteras, maquillaje, productos capilares, cuidado personal y accesorios femeninos. Eres cálida, profesional y experta cerrando ventas.

CATÁLOGO:
${list}

INSTRUCCIONES:
1. Llama siempre al cliente por su nombre: ${name || "amiga"}.
2. Cuando pregunten por una categoría, sugiere 2-4 productos con el formato [PRODUCTO:ID]. Ej: [PRODUCTO:5] y [PRODUCTO:6].
3. Cierra ventas activamente: pregunta si agrega al carrito, ofrece combos, menciona TOP VENTA.
4. Al confirmar compra di: "Un asesor te contactará para confirmar tu pedido y coordinar el envío." NUNCA menciones el costo de envío.
5. Respuestas cortas y cálidas (2-4 oraciones + productos). Español colombiano con emojis ocasionales.
6. No menciones que eres IA. Eres Isabel, asesora humana virtual.
7. Para regalos sugiere kits/sets. Para uso diario los más prácticos. Para eventos especiales los más elegantes.`;
  };

  // ── Chips contextuales ─────────────────────────────────────
  const contextChips = (msg) => {
    const m = msg.toLowerCase();
    if (m.includes("regalo"))   return ["Para dama", "Para caballero", "¿Cuál es el más popular?"];
    if (m.includes("bolso"))    return ["Ver más bolsos", "Ver morrales", "¿Tienen ofertas?"];
    if (m.includes("morral"))   return ["Ver más morrales", "Ver bolsos", "Agregar al pedido"];
    if (m.includes("billetera"))return ["Para dama", "Para caballero", "Ver todos los modelos"];
    if (m.includes("maquillaj"))return ["Ver kits completos", "Ver labiales", "Ver paletas"];
    if (m.includes("capilar") || m.includes("cabello") || m.includes("shampoo"))
                                return ["Ver tratamientos", "Ver shampoos", "Ver kits capilares"];
    if (m.includes("accesorio") || m.includes("aretes") || m.includes("collar"))
                                return ["Ver aretes", "Ver collares", "Ver pulseras"];
    if (m.includes("cuidado") || m.includes("crema") || m.includes("perfume"))
                                return ["Ver cremas", "Ver sets de baño", "Ver perfumes"];
    return ["¿Tienen ofertas?", "Ver más vendidos", "Quiero que me contacten"];
  };

  // ── Llamada a Claude API ───────────────────────────────────
  const callIsabel = async (userMsg, name, hist) => {
    const newHist = [...hist, { role: "user", content: userMsg }];
    setHistory(newHist);
    setTyping(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 800,
          system: buildSystem(name),
          messages: newHist.slice(-14),
        }),
      });
      const data = await res.json();
      setTyping(false);
      let text = (data.content || []).map(x => x.text || "").join("") ||
        "Disculpa, tuve un inconveniente. ¿Me repites tu pregunta? 💜";

      const updHist = [...newHist, { role: "assistant", content: text }];
      setHistory(updHist);
      save(name, updHist, cart);

      // Extraer IDs de productos
      const refs = [...text.matchAll(/\[PRODUCTO:(\d+)\]/g)].map(m => parseInt(m[1]));
      const clean = text.replace(/\[PRODUCTO:\d+\]/g, "").trim()
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\n/g, "<br>");

      const prods = refs.map(id => PRODUCTS.find(p => p.id === id)).filter(Boolean);
      const html = clean + (prods.length ? renderProducts(prods) : "");

      const lower = text.toLowerCase();
      const closing = ["contactará", "confirmar", "asesor", "pedido"].some(k => lower.includes(k));
      addBotMsg(html, closing
        ? ["Ver mi carrito", "Seguir comprando", "Ver otra categoría"]
        : contextChips(userMsg)
      );
    } catch {
      setTyping(false);
      addBotMsg("Disculpa el inconveniente. Un asesor de Kosmica te ayudará personalmente 💜",
        ["Quiero que me contacten"]);
    }
  };

  // ── Enviar mensaje ─────────────────────────────────────────
  const send = async (text) => {
    const t = (text || input).trim();
    if (!t) return;
    setInput("");
    addUserMsg(t);

    if (waitName) {
      const name = t.split(" ")[0];
      const clean = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
      setClientName(clean);
      setWaitName(false);
      try { localStorage.setItem("kb_client", clean); } catch {}
      setTimeout(() => {
        addBotMsg(
          `¡Mucho gusto, <strong>${clean}</strong>! 💜 Bienvenida a Kosmica. Tenemos bolsos, morrales, billeteras, maquillaje, capilar, cuidado personal y accesorios. ¿En qué te puedo ayudar hoy? ✨`,
          ["Ver más vendidos", "Ver novedades", "Necesito un regalo", "Ver todo el catálogo"]
        );
      }, 500);
      return;
    }

    await callIsabel(t, clientName, history);
  };

  // ── Filtro por categoría ───────────────────────────────────
  const filterCat = (cat) => {
    const prods = cat === "todo" ? PRODUCTS : PRODUCTS.filter(p => p.cat === cat);
    const label = cat === "todo" ? "catálogo completo ✨" : `<strong>${cat}</strong> 💜`;
    addBotMsg(`Aquí están nuestros productos de ${label}` + renderProducts(prods));
  };

  // ── Historial ──────────────────────────────────────────────
  const showHistory = () => {
    if (!history.length) {
      addBotMsg("No hay historial previo aún. ¡Esta es tu primera visita! 🌟");
      return;
    }
    const c = cart.length;
    addBotMsg(
      `📋 <strong>Tu historial</strong><br>Tienes ${history.length} mensaje${history.length > 1 ? "s" : ""} guardados${c ? ` y ${c} producto(s) en tu carrito.` : "."}`,
      c ? ["Retomar mi pedido", "Seguir comprando"] : ["Seguir comprando"]
    );
  };

  // ── Carrito ────────────────────────────────────────────────
  const total  = cart.reduce((a, b) => a + b.price * b.qty, 0);
  const qtotal = cart.reduce((a, b) => a + b.qty, 0);

  const requestAdvisor = () => {
    addBotMsg(
      `✅ ¡Listo, <strong>${clientName || "amiga"}</strong>! Un asesor de Kosmica se pondrá en contacto contigo para confirmar tu pedido y coordinar el envío. ¡Gracias por elegirnos! 💜`
    );
  };

  // ── Render ─────────────────────────────────────────────────
  return (
    <>
      {/* Botón flotante */}
      <button className="kb-fab" onClick={() => setOpen(o => !o)} aria-label="Abrir chat">
        {open ? "✕" : "✨"}
        {!open && cartBadge > 0 && (
          <span className="kb-fab-badge">{cartBadge}</span>
        )}
      </button>

      {/* Ventana del chat */}
      <div className="kb-overlay" style={{ pointerEvents: open ? "all" : "none" }}>
        <div className={`kb-window${open ? " kb-open" : ""}`}>

          {/* Header */}
          <div className="kb-header">
            <div className="kb-avatar">
              ✨
              <div className="kb-dot" />
            </div>
            <div className="kb-hinfo">
              <div className="kb-hname">
                Isabel · Asesora Kosmica
                <span className="kb-badge">IA PRO</span>
              </div>
              <div className="kb-hsub">En línea · Kosmica Colombia</div>
            </div>
            <div className="kb-hbtns">
              <button className="kb-hbtn" onClick={showHistory}>Historial</button>
              <button className="kb-close" onClick={() => setOpen(false)}>✕</button>
            </div>
          </div>

          {/* Categorías */}
          <div className="kb-cats">
            <button className="kb-cat kb-active" onClick={e => { document.querySelectorAll(".kb-cat").forEach(b => b.classList.remove("kb-active")); e.target.classList.add("kb-active"); filterCat("todo"); }}>✨ Todo</button>
            {CATEGORIES.map(cat => (
              <button key={cat} className="kb-cat"
                onClick={e => { document.querySelectorAll(".kb-cat").forEach(b => b.classList.remove("kb-active")); e.target.classList.add("kb-active"); filterCat(cat); }}>
                {cat === "bolsos" ? "👜" : cat === "morrales" ? "🎒" : cat === "billeteras" ? "👛" :
                 cat === "maquillaje" ? "💄" : cat === "capilar" ? "💇" : cat === "accesorios" ? "💍" : "🧴"} {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>

          {/* Mensajes */}
          <div className="kb-msgs" ref={msgsRef} onClick={handleMsgClick}>
            {msgs.map(m => (
              <div key={m.id} className={m.role === "user" ? "kb-user" : "kb-bot"}>
                <div
                  className={`kb-bub ${m.role === "user" ? "kb-bub-user" : "kb-bub-bot"}`}
                  dangerouslySetInnerHTML={{ __html: m.role === "user" ? m.text : m.html }}
                />
                <div className="kb-time">{m.time}</div>
              </div>
            ))}
            {typing && (
              <div className="kb-bot">
                <div className="kb-typing">
                  <div className="kb-tdot" /><div className="kb-tdot" /><div className="kb-tdot" />
                </div>
              </div>
            )}
            {chips.length > 0 && (
              <div className="kb-bot">
                <div className="kb-chips">
                  {chips.map(c => (
                    <button key={c} className="kb-chip" onClick={() => send(c)}>{c}</button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Carrito */}
          {cart.length > 0 && (
            <div className="kb-cart-bar">
              <span>🛒 {qtotal} producto{qtotal > 1 ? "s" : ""} · <strong>{fmtCOP(total)}</strong></span>
              <button className="kb-cart-btn" onClick={requestAdvisor}>Confirmar pedido</button>
            </div>
          )}

          {/* Input */}
          <div className="kb-footer">
            <input
              className="kb-input"
              type="text"
              placeholder="¿Qué estás buscando hoy?"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send()}
            />
            <button className="kb-send" onClick={() => send()} aria-label="Enviar">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="white">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
