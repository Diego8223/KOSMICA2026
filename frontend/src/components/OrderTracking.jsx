// ============================================================
//  OrderTracking.jsx — Seguimiento de pedido para el cliente
// ============================================================
import { useState } from 'react';
import { orderAPI } from '../services/api';

const CSS = `
  .ot-wrap{max-width:600px;margin:0 auto;padding:24px 16px 40px;font-family:'DM Sans',sans-serif}
  .ot-title{font-family:'Playfair Display',serif;font-size:1.8rem;font-weight:700;color:#2D1B4E;margin-bottom:6px}
  .ot-sub{color:#9B72CF;font-size:.85rem;margin-bottom:28px}
  .ot-form{display:flex;gap:10px;margin-bottom:28px;flex-wrap:wrap}
  .ot-input{
    flex:1;min-width:200px;padding:12px 16px;border:2px solid #E8D5FF;border-radius:14px;
    font-size:.9rem;outline:none;transition:border .2s;font-family:'DM Sans',sans-serif;color:#2D1B4E;
  }
  .ot-input:focus{border-color:#9B72CF}
  .ot-btn{
    padding:12px 24px;background:linear-gradient(135deg,#9B72CF,#7B5EA7);color:#fff;
    border:none;border-radius:14px;font-weight:700;font-size:.88rem;cursor:pointer;
    box-shadow:0 5px 16px rgba(155,114,207,.35);transition:all .3s;white-space:nowrap;
  }
  .ot-btn:hover{transform:translateY(-1px);box-shadow:0 8px 22px rgba(155,114,207,.5)}
  .ot-btn:disabled{opacity:.7;cursor:wait}
  .ot-error{background:#FFF0F8;border:1px solid #F4A7C3;border-radius:12px;padding:12px 16px;color:#8B2252;font-size:.83rem;margin-bottom:20px}

  /* Card resultado */
  .ot-card{background:#fff;border-radius:22px;box-shadow:0 6px 32px rgba(120,80,180,.12);overflow:hidden;border:1.5px solid #F0E8FF}
  .ot-card-top{padding:22px 24px;background:linear-gradient(135deg,#2D1B4E,#4A2D7A)}
  .ot-order-num{font-size:.68rem;letter-spacing:.15em;text-transform:uppercase;color:rgba(255,255,255,.5);margin-bottom:4px}
  .ot-order-val{font-family:'Playfair Display',serif;font-size:1.35rem;font-weight:700;color:#fff}
  .ot-customer{color:rgba(255,255,255,.7);font-size:.82rem;margin-top:6px}
  .ot-card-body{padding:22px 24px}

  /* Timeline */
  .ot-timeline{margin:0 0 24px}
  .ot-step{display:flex;align-items:flex-start;gap:14px;margin-bottom:0;position:relative}
  .ot-step:not(:last-child)::after{
    content:'';position:absolute;left:17px;top:36px;width:2px;height:calc(100% + 4px);
    background:linear-gradient(180deg,#E8D5FF,transparent);
  }
  .ot-step.done::after{background:linear-gradient(180deg,#9B72CF,#C9B8E8)}
  .ot-step-icon{
    width:36px;height:36px;border-radius:50%;display:flex;align-items:center;
    justify-content:center;font-size:1rem;flex-shrink:0;margin-top:2px;
    background:#F0E8FF;color:#C9B8E8;border:2px solid #E8D5FF;
    transition:all .3s;
  }
  .ot-step.done .ot-step-icon{background:linear-gradient(135deg,#9B72CF,#7B5EA7);color:#fff;border-color:transparent;box-shadow:0 4px 12px rgba(155,114,207,.35)}
  .ot-step.current .ot-step-icon{background:#fff;color:#9B72CF;border-color:#9B72CF;box-shadow:0 0 0 3px rgba(155,114,207,.2);animation:pulse 2s infinite}
  @keyframes pulse{0%,100%{box-shadow:0 0 0 3px rgba(155,114,207,.2)}50%{box-shadow:0 0 0 6px rgba(155,114,207,.1)}}
  .ot-step-info{padding:4px 0 20px;flex:1}
  .ot-step-label{font-weight:700;font-size:.88rem;color:#2D1B4E;margin-bottom:3px}
  .ot-step.done .ot-step-label{color:#9B72CF}
  .ot-step.pending .ot-step-label{color:#C9B8E8}
  .ot-step-desc{font-size:.76rem;color:#B8A0D8;line-height:1.5}
  .ot-step.current .ot-step-desc{color:#9B72CF;font-weight:500}

  /* Info del pedido */
  .ot-info-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px}
  .ot-info-box{background:#FAF7FF;border-radius:14px;padding:14px 16px;border:1px solid #F0E8FF}
  .ot-info-label{font-size:.67rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#B8A0D8;margin-bottom:4px}
  .ot-info-val{font-size:.9rem;font-weight:700;color:#2D1B4E}
  .ot-info-val.green{color:#52B788}
  .ot-info-val.purple{color:#7B5EA7;font-family:'Playfair Display',serif;font-size:1rem}

  /* Status badge */
  .ot-status{display:inline-flex;align-items:center;gap:6px;padding:6px 16px;border-radius:30px;font-size:.78rem;font-weight:700;margin-bottom:20px}
  .ot-status.PENDING{background:#FFF8E1;color:#F57F17}
  .ot-status.PAID{background:#E8F5E9;color:#2E7D32}
  .ot-status.PROCESSING{background:#E3F2FD;color:#1565C0}
  .ot-status.SHIPPED{background:#F3E5F5;color:#7B1FA2}
  .ot-status.DELIVERED{background:#E8F5E9;color:#1B5E20}
  .ot-status.CANCELLED{background:#FFEBEE;color:#C62828}

  /* Botón rastrear otro */
  .ot-reset{display:block;margin:20px auto 0;padding:10px 24px;background:rgba(155,114,207,.08);color:#7B5EA7;border:2px solid rgba(155,114,207,.25);border-radius:14px;font-weight:600;font-size:.82rem;cursor:pointer;transition:all .2s;text-align:center}
  .ot-reset:hover{background:#F0E8FF;border-color:#9B72CF}
`;

const STEPS = [
  { key:'PENDING',    icon:'⏳', label:'Pedido recibido',      desc:'Tu pedido fue registrado y está esperando confirmación de pago.' },
  { key:'PAID',       icon:'✅', label:'Pago confirmado',       desc:'Tu pago fue procesado exitosamente. Estamos preparando tu pedido.' },
  { key:'PROCESSING', icon:'📦', label:'Preparando envío',      desc:'Estamos empacando tu pedido con mucho cuidado 💕' },
  { key:'SHIPPED',    icon:'🚚', label:'En camino',             desc:'Tu pedido fue enviado y está en camino a tu dirección.' },
  { key:'DELIVERED',  icon:'🎉', label:'¡Entregado!',           desc:'Tu pedido llegó a su destino. ¡Esperamos que lo ames!' },
];

const STATUS_ORDER = ['PENDING','PAID','PROCESSING','SHIPPED','DELIVERED'];

export default function OrderTracking({ onBack }) {
  const [query, setQuery]   = useState('');
  const [email, setEmail]   = useState('');
  const [order, setOrder]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  const search = async () => {
    if (!query.trim()) { setError('Ingresa el número de pedido'); return; }
    setLoading(true); setError(''); setOrder(null);
    try {
      const data = await orderAPI.getByNumber(query.trim());
      setOrder(data);
    } catch {
      setError('Pedido no encontrado. Verifica el número e intenta de nuevo.');
    } finally { setLoading(false); }
  };

  const curIdx   = order ? STATUS_ORDER.indexOf(order.status) : -1;
  const isCancelled = order?.status === 'CANCELLED';

  const stepStatus = (stepKey) => {
    if (isCancelled) return 'pending';
    const sIdx = STATUS_ORDER.indexOf(stepKey);
    if (sIdx < curIdx) return 'done';
    if (sIdx === curIdx) return 'current';
    return 'pending';
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="ot-wrap">
        {onBack && (
          <button onClick={onBack} style={{background:'none',border:'none',color:'#9B72CF',fontWeight:700,fontSize:'.82rem',cursor:'pointer',marginBottom:16,display:'flex',alignItems:'center',gap:6}}>
            ← Volver a la tienda
          </button>
        )}
        <h2 className="ot-title">📦 Rastrear mi pedido</h2>
        <p className="ot-sub">Ingresa el número de pedido que recibiste en tu correo</p>

        <div className="ot-form">
          <input className="ot-input" placeholder="Ej: KOS-2025-00123" value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()} />
          <button className="ot-btn" onClick={search} disabled={loading}>
            {loading ? '⏳ Buscando...' : '🔍 Rastrear'}
          </button>
        </div>

        {error && <div className="ot-error">⚠️ {error}</div>}

        {order && (
          <div className="ot-card">
            <div className="ot-card-top">
              <div className="ot-order-num">Número de pedido</div>
              <div className="ot-order-val">{order.orderNumber}</div>
              <div className="ot-customer">👤 {order.customerName} · {order.customerEmail}</div>
            </div>
            <div className="ot-card-body">
              <span className={`ot-status ${order.status}`}>
                {order.status === 'PENDING'    && '⏳ Pendiente'}
                {order.status === 'PAID'       && '✅ Pago confirmado'}
                {order.status === 'PROCESSING' && '📦 En preparación'}
                {order.status === 'SHIPPED'    && '🚚 Enviado'}
                {order.status === 'DELIVERED'  && '🎉 Entregado'}
                {order.status === 'CANCELLED'  && '❌ Cancelado'}
              </span>

              {isCancelled ? (
                <div style={{background:'#FFEBEE',borderRadius:14,padding:'14px 18px',color:'#C62828',fontSize:'.84rem',marginBottom:20}}>
                  ❌ Este pedido fue cancelado. Si tienes preguntas contáctanos.
                </div>
              ) : (
                <div className="ot-timeline">
                  {STEPS.map(s => (
                    <div key={s.key} className={`ot-step ${stepStatus(s.key)}`}>
                      <div className="ot-step-icon">{s.icon}</div>
                      <div className="ot-step-info">
                        <div className="ot-step-label">{s.label}</div>
                        <div className="ot-step-desc">{stepStatus(s.key) === 'current' ? s.desc : stepStatus(s.key) === 'done' ? '✓ Completado' : 'Próximamente'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="ot-info-grid">
                <div className="ot-info-box">
                  <div className="ot-info-label">Total pagado</div>
                  <div className="ot-info-val purple">${Number(order.total || 0).toFixed(2)}</div>
                </div>
                <div className="ot-info-box">
                  <div className="ot-info-label">Fecha del pedido</div>
                  <div className="ot-info-val">{order.createdAt ? new Date(order.createdAt).toLocaleDateString('es-CO', {day:'2-digit',month:'long',year:'numeric'}) : '-'}</div>
                </div>
                <div className="ot-info-box" style={{gridColumn:'1/-1'}}>
                  <div className="ot-info-label">Dirección de entrega</div>
                  <div className="ot-info-val" style={{fontFamily:'inherit',fontSize:'.86rem'}}>{order.shippingAddress || 'No especificada'}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {order && (
          <button className="ot-reset" onClick={() => { setOrder(null); setQuery(''); }}>
            🔍 Rastrear otro pedido
          </button>
        )}
      </div>
    </>
  );
}
