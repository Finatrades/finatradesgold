import React, { useEffect, useMemo, useState } from 'react';
import { Truck, Edit2, X, Search } from 'lucide-react';

type Shipment = {
  id: string;
  tradeRequestId: string;
  dealRoomId?: string | null;
  trackingNumber?: string | null;
  courierName?: string | null;
  status: string;
  estimatedShipDate?: string | null;
  actualShipDate?: string | null;
  estimatedArrivalDate?: string | null;
  actualArrivalDate?: string | null;
  originPort?: string | null;
  destinationPort?: string | null;
  currentLocation?: string | null;
  customsStatus?: string | null;
  notes?: string | null;
  carrierId?: string | null;
  shippingRouteId?: string | null;
  updatedAt?: string | null;
};

type Carrier = { id: string; name: string; carrierType: string; status: string };
type Route = {
  id: string; code?: string | null; originHubId: string;
  destinationName: string; destinationCountry: string; mode: string;
  transitDays?: number | null; status: string;
};

const STATUSES = ['Pending', 'In Transit', 'Customs', 'Delivered', 'Delayed'] as const;
const CUSTOMS_STATUSES = ['Pending', 'Submitted', 'Cleared', 'Held'] as const;

const inputCls = 'w-full px-3 py-2 rounded-lg border outline-none';
const inputStyle: React.CSSProperties = { borderColor: '#E8E2DC', fontSize: 14, background: '#fff' };
const labelStyle: React.CSSProperties = { fontSize: 12, color: '#5a5a55', fontWeight: 600, display: 'block', marginBottom: 4 };

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    const txt = await res.text();
    let msg = txt;
    try { msg = JSON.parse(txt).message || txt; } catch {}
    throw new Error(msg || `Request failed (${res.status})`);
  }
  return res.json();
}

export default function AdminShipments() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<Shipment | null>(null);

  async function reload() {
    setLoading(true); setError(null);
    try {
      const [shipRes, carRes, routeRes] = await Promise.all([
        api('/api/admin/finabridge/shipments'),
        api('/api/admin/carriers').catch(() => ({ carriers: [] })),
        api('/api/admin/shipping-routes').catch(() => ({ routes: [] })),
      ]);
      setShipments(shipRes.shipments || []);
      setCarriers(carRes.carriers || []);
      setRoutes(routeRes.routes || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load shipments');
    } finally { setLoading(false); }
  }

  useEffect(() => { reload(); }, []);

  const carrierName = (id?: string | null) => carriers.find(c => c.id === id)?.name ?? null;
  const routeLabel = (id?: string | null) => {
    const r = routes.find(x => x.id === id);
    if (!r) return null;
    return r.code ? `${r.code} · ${r.destinationName}` : `${r.destinationName}, ${r.destinationCountry}`;
  };

  const filtered = useMemo(() => {
    if (!q) return shipments;
    const s = q.toLowerCase();
    return shipments.filter(sh =>
      (sh.trackingNumber || '').toLowerCase().includes(s) ||
      (sh.tradeRequestId || '').toLowerCase().includes(s) ||
      (carrierName(sh.carrierId) || '').toLowerCase().includes(s) ||
      (routeLabel(sh.shippingRouteId) || '').toLowerCase().includes(s)
    );
  }, [shipments, q, carriers, routes]);

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Truck size={22} color="#C73B22" />
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1A1A1A', margin: 0 }}>Shipments</h1>
          </div>
          <p style={{ color: '#666', fontSize: 13, margin: '4px 0 0 0' }}>
            Record carrier &amp; shipping route assignments for active trade shipments. Carrier and route options are sourced live from the Network masters.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: 360 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: 11, color: '#999' }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search tracking, trade ref, carrier, route…"
            className={inputCls} style={{ ...inputStyle, paddingLeft: 30 }} data-testid="input-search-shipments" />
        </div>
      </div>

      {loading && <div style={{ padding: 24, color: '#666' }}>Loading shipments…</div>}
      {error && <div style={{ padding: 16, background: 'rgba(199,59,34,0.08)', color: '#C73B22', borderRadius: 8 }}>{error}</div>}

      {!loading && !error && (
        <div style={{ background: '#fff', border: '1px solid #E8E2DC', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }} data-testid="shipments-table">
            <thead>
              <tr style={{ background: '#FAFAF8', borderBottom: '1px solid #E8E2DC' }}>
                <th style={th}>Tracking</th>
                <th style={th}>Trade</th>
                <th style={th}>Carrier</th>
                <th style={th}>Route</th>
                <th style={th}>Status</th>
                <th style={th}>Customs</th>
                <th style={th}>Updated</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center', color: '#999' }}>No shipments match the filter.</td></tr>
              )}
              {filtered.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid #F0EBE5' }} data-testid={`shipment-row-${s.id}`}>
                  <td style={td}><span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#C73B22' }}>{s.trackingNumber || '—'}</span></td>
                  <td style={td}><span style={{ fontFamily: 'monospace', fontSize: 11, color: '#5a5a55' }}>{s.tradeRequestId.slice(0, 8)}…</span></td>
                  <td style={td}>{carrierName(s.carrierId) ?? (s.courierName || <span style={{ color: '#bbb' }}>—</span>)}</td>
                  <td style={td}>{routeLabel(s.shippingRouteId) ?? <span style={{ color: '#bbb' }}>—</span>}</td>
                  <td style={td}>{s.status}</td>
                  <td style={td}>{s.customsStatus || '—'}</td>
                  <td style={td}>{s.updatedAt ? new Date(s.updatedAt).toLocaleDateString() : '—'}</td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    <button onClick={() => setEditing(s)} title="Edit" data-testid={`btn-edit-shipment-${s.id}`}
                      style={iconBtn}><Edit2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <ShipmentEditModal
          shipment={editing}
          carriers={carriers}
          routes={routes}
          onClose={() => setEditing(null)}
          onSaved={async () => { setEditing(null); await reload(); }}
        />
      )}
    </div>
  );
}

const th: React.CSSProperties = { padding: '10px 12px', textAlign: 'left', fontSize: 11, color: '#666', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 };
const td: React.CSSProperties = { padding: '10px 12px', color: '#1A1A1A', verticalAlign: 'top' };
const iconBtn: React.CSSProperties = { background: 'transparent', border: 'none', cursor: 'pointer', padding: 6, marginLeft: 4, color: '#5a5a55' };

function ShipmentEditModal({ shipment, carriers, routes, onClose, onSaved }: {
  shipment: Shipment;
  carriers: Carrier[];
  routes: Route[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    trackingNumber: shipment.trackingNumber ?? '',
    courierName: shipment.courierName ?? '',
    carrierId: shipment.carrierId ?? '',
    shippingRouteId: shipment.shippingRouteId ?? '',
    status: shipment.status,
    customsStatus: shipment.customsStatus ?? '',
    currentLocation: shipment.currentLocation ?? '',
    notes: shipment.notes ?? '',
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const activeCarriers = carriers.filter(c => c.status === 'active' || c.id === form.carrierId);
  const activeRoutes = routes.filter(r => r.status === 'active' || r.id === form.shippingRouteId);

  function set<K extends keyof typeof form>(k: K, v: any) { setForm(f => ({ ...f, [k]: v })); }

  async function save() {
    setBusy(true); setErr(null);
    try {
      await api('/api/admin/finabridge/shipments', {
        method: 'POST',
        body: JSON.stringify({
          tradeRequestId: shipment.tradeRequestId,
          dealRoomId: shipment.dealRoomId,
          trackingNumber: form.trackingNumber.trim() || null,
          courierName: form.courierName.trim() || null,
          carrierId: form.carrierId || null,
          shippingRouteId: form.shippingRouteId || null,
          status: form.status,
          customsStatus: form.customsStatus || null,
          currentLocation: form.currentLocation.trim() || null,
          notes: form.notes.trim() || null,
        }),
      });
      onSaved();
    } catch (e: any) {
      setErr(e?.message || 'Failed to save');
    } finally { setBusy(false); }
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Edit Shipment</h2>
          <button onClick={onClose} style={iconBtn}><X size={18} /></button>
        </div>
        {err && <div style={{ padding: 10, background: 'rgba(199,59,34,0.08)', color: '#C73B22', borderRadius: 6, marginBottom: 12, fontSize: 13 }}>{err}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label style={labelStyle}>Tracking Number</label><input className={inputCls} style={inputStyle} value={form.trackingNumber} onChange={e => set('trackingNumber', e.target.value)} data-testid="shipment-field-tracking" /></div>
          <div>
            <label style={labelStyle}>Carrier</label>
            <select className={inputCls} style={inputStyle} value={form.carrierId} onChange={e => set('carrierId', e.target.value)} data-testid="shipment-field-carrier">
              <option value="">— None —</option>
              {activeCarriers.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.carrierType})</option>
              ))}
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Shipping Route</label>
            <select className={inputCls} style={inputStyle} value={form.shippingRouteId} onChange={e => set('shippingRouteId', e.target.value)} data-testid="shipment-field-route">
              <option value="">— None —</option>
              {activeRoutes.map(r => (
                <option key={r.id} value={r.id}>
                  {(r.code ? `${r.code} · ` : '')}{r.destinationName}, {r.destinationCountry} ({r.mode}{r.transitDays != null ? ` · ${r.transitDays}d` : ''})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Status</label>
            <select className={inputCls} style={inputStyle} value={form.status} onChange={e => set('status', e.target.value)}>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Customs</label>
            <select className={inputCls} style={inputStyle} value={form.customsStatus} onChange={e => set('customsStatus', e.target.value)}>
              <option value="">—</option>
              {CUSTOMS_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Current Location</label>
            <input className={inputCls} style={inputStyle} value={form.currentLocation} onChange={e => set('currentLocation', e.target.value)} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Notes</label>
            <textarea className={inputCls} style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
          <div><label style={labelStyle}>Courier (free text)</label><input className={inputCls} style={inputStyle} value={form.courierName} onChange={e => set('courierName', e.target.value)} /></div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <button onClick={onClose} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #E8E2DC', background: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
          <button onClick={save} disabled={busy} data-testid="btn-save-shipment"
            style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#C73B22', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13, opacity: busy ? 0.6 : 1 }}>
            {busy ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 20px', zIndex: 100, overflowY: 'auto' };
const modal: React.CSSProperties = { background: '#FAFAF8', borderRadius: 14, padding: 24, width: '100%', maxWidth: 760, boxShadow: '0 10px 40px rgba(0,0,0,0.2)' };
