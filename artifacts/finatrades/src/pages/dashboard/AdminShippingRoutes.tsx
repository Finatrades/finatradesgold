import React, { useEffect, useMemo, useState } from 'react';
import { Route as RouteIcon, Plus, Edit2, Power, X, Search } from 'lucide-react';

type Hub = { id: string; code: string; name: string; country: string };
type Carrier = { id: string; name: string; carrierType: string };
type Route = {
  id: string; code?: string | null;
  originHubId: string; destinationName: string; destinationCountry: string;
  mode: string; transitDays?: number | null;
  baseFreightRateCents?: number | null; freightCurrency: string; freightPerUnit: string;
  customsBroker?: string | null; carrierId?: string | null;
  status: string; notes?: string | null;
};

const MODES = ['sea', 'road', 'rail', 'air'] as const;
const STATUSES = ['active', 'inactive', 'under_maintenance'] as const;
const CURRENCIES = ['USD', 'EUR', 'GBP'];

const inputCls = 'w-full px-3 py-2 rounded-lg border outline-none';
const inputStyle: React.CSSProperties = { borderColor: '#E8E2DC', fontSize: 14, background: '#fff' };
const labelStyle: React.CSSProperties = { fontSize: 12, color: '#5a5a55', fontWeight: 600, display: 'block', marginBottom: 4 };
const th: React.CSSProperties = { padding: '10px 12px', textAlign: 'left', fontSize: 11, color: '#666', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 };
const td: React.CSSProperties = { padding: '10px 12px', color: '#1A1A1A', verticalAlign: 'top' };
const iconBtn: React.CSSProperties = { background: 'transparent', border: 'none', cursor: 'pointer', padding: 6, marginLeft: 4, color: '#5a5a55' };

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, { credentials: 'include', headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) }, ...init });
  if (!res.ok) {
    const txt = await res.text(); let msg = txt;
    try { msg = JSON.parse(txt).message || txt; } catch {}
    throw new Error(msg || `Request failed (${res.status})`);
  }
  return res.json();
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    active: { bg: 'rgba(16,185,129,0.12)', color: '#047857', label: 'Active' },
    inactive: { bg: 'rgba(148,148,148,0.18)', color: '#525252', label: 'Inactive' },
    under_maintenance: { bg: 'rgba(245,158,11,0.15)', color: '#B45309', label: 'Maintenance' },
  };
  const s = map[status] || map.inactive;
  return <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color }}>{s.label}</span>;
}

export default function AdminShippingRoutes() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<Route | null>(null);
  const [creating, setCreating] = useState(false);

  async function reload() {
    setLoading(true); setError(null);
    try {
      const [r, h, c] = await Promise.all([
        api('/api/admin/shipping-routes'),
        api('/api/admin/hubs'),
        api('/api/admin/carriers'),
      ]);
      setRoutes(r.routes || []);
      setHubs(h.hubs || []);
      setCarriers(c.carriers || []);
    } catch (e: any) { setError(e?.message || 'Failed to load'); }
    finally { setLoading(false); }
  }
  useEffect(() => { reload(); }, []);

  const hubById = useMemo(() => new Map(hubs.map(h => [h.id, h])), [hubs]);
  const carrierById = useMemo(() => new Map(carriers.map(c => [c.id, c])), [carriers]);

  const filtered = useMemo(() => routes.filter(r => {
    if (!q) return true;
    const hub = hubById.get(r.originHubId);
    const s = q.toLowerCase();
    return (r.code || '').toLowerCase().includes(s)
      || r.destinationName.toLowerCase().includes(s)
      || r.destinationCountry.toLowerCase().includes(s)
      || (hub?.code || '').toLowerCase().includes(s);
  }), [routes, q, hubById]);

  async function deactivate(id: string) {
    if (!confirm('Deactivate this route?')) return;
    try { await api(`/api/admin/shipping-routes/${id}`, { method: 'DELETE' }); await reload(); }
    catch (e: any) { alert(e?.message || 'Failed'); }
  }

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <RouteIcon size={22} color="#C73B22" />
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1A1A1A', margin: 0 }}>Shipping Routes</h1>
          </div>
          <p style={{ color: '#666', fontSize: 13, margin: '4px 0 0 0' }}>Origin hub → destination port lanes with transit & freight defaults.</p>
        </div>
        <button onClick={() => setCreating(true)} data-testid="btn-create-route"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, background: '#C73B22', color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>
          <Plus size={16} /> New Route
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: 360 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: 11, color: '#999' }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by code, destination, or origin…"
            className={inputCls} style={{ ...inputStyle, paddingLeft: 30 }} />
        </div>
      </div>

      {loading && <div style={{ padding: 24, color: '#666' }}>Loading routes…</div>}
      {error && <div style={{ padding: 16, background: 'rgba(199,59,34,0.08)', color: '#C73B22', borderRadius: 8 }}>{error}</div>}

      {!loading && !error && (
        <div style={{ background: '#fff', border: '1px solid #E8E2DC', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }} data-testid="routes-table">
            <thead>
              <tr style={{ background: '#FAFAF8', borderBottom: '1px solid #E8E2DC' }}>
                <th style={th}>Code</th><th style={th}>Origin Hub</th><th style={th}>Destination</th>
                <th style={th}>Mode</th><th style={th}>Transit</th><th style={th}>Freight</th>
                <th style={th}>Carrier</th><th style={th}>Status</th><th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={9} style={{ padding: 32, textAlign: 'center', color: '#999' }}>No routes yet — add one to get started.</td></tr>}
              {filtered.map(r => {
                const hub = hubById.get(r.originHubId);
                const carrier = r.carrierId ? carrierById.get(r.carrierId) : null;
                const rate = r.baseFreightRateCents != null ? (r.baseFreightRateCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : null;
                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid #F0EBE5' }} data-testid={`route-row-${r.id}`}>
                    <td style={td}><span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#C73B22' }}>{r.code || '—'}</span></td>
                    <td style={td}>{hub ? `${hub.code} — ${hub.name}` : <span style={{ color: '#bbb' }}>unknown</span>}</td>
                    <td style={td}>{r.destinationName}<div style={{ fontSize: 11, color: '#888' }}>{r.destinationCountry}</div></td>
                    <td style={td}><span style={{ textTransform: 'uppercase', fontFamily: 'monospace', fontSize: 12 }}>{r.mode}</span></td>
                    <td style={td}>{r.transitDays != null ? `${r.transitDays}d` : '—'}</td>
                    <td style={td}>{rate ? `${rate} ${r.freightCurrency}/${r.freightPerUnit}` : '—'}</td>
                    <td style={td}>{carrier?.name || <span style={{ color: '#bbb' }}>—</span>}</td>
                    <td style={td}><StatusPill status={r.status} /></td>
                    <td style={{ ...td, textAlign: 'right' }}>
                      <button onClick={() => setEditing(r)} title="Edit" style={iconBtn}><Edit2 size={14} /></button>
                      {r.status !== 'inactive' && <button onClick={() => deactivate(r.id)} title="Deactivate" style={{ ...iconBtn, color: '#C73B22' }}><Power size={14} /></button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {(creating || editing) && (
        <RouteFormModal route={editing} hubs={hubs} carriers={carriers}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={async () => { setCreating(false); setEditing(null); await reload(); }} />
      )}
    </div>
  );
}

function RouteFormModal({ route, hubs, carriers, onClose, onSaved }: { route: Route | null; hubs: Hub[]; carriers: Carrier[]; onClose: () => void; onSaved: () => void }) {
  const isNew = !route;
  const [form, setForm] = useState({
    code: route?.code ?? '',
    originHubId: route?.originHubId ?? (hubs[0]?.id ?? ''),
    destinationName: route?.destinationName ?? '',
    destinationCountry: route?.destinationCountry ?? '',
    mode: route?.mode ?? 'sea',
    transitDays: route?.transitDays?.toString() ?? '',
    baseFreightRate: route?.baseFreightRateCents != null ? (route.baseFreightRateCents / 100).toString() : '',
    freightCurrency: route?.freightCurrency ?? 'USD',
    freightPerUnit: route?.freightPerUnit ?? 'MT',
    customsBroker: route?.customsBroker ?? '',
    carrierId: route?.carrierId ?? '',
    status: route?.status ?? 'active',
    notes: route?.notes ?? '',
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function set<K extends keyof typeof form>(k: K, v: any) { setForm(f => ({ ...f, [k]: v })); }

  async function save() {
    setBusy(true); setErr(null);
    try {
      const payload: any = {
        code: form.code.trim() || null,
        originHubId: form.originHubId,
        destinationName: form.destinationName.trim(),
        destinationCountry: form.destinationCountry.trim(),
        mode: form.mode,
        transitDays: form.transitDays !== '' ? Number(form.transitDays) : null,
        baseFreightRateCents: form.baseFreightRate !== '' ? Math.round(Number(form.baseFreightRate) * 100) : null,
        freightCurrency: form.freightCurrency,
        freightPerUnit: form.freightPerUnit,
        customsBroker: form.customsBroker.trim() || null,
        carrierId: form.carrierId || null,
        status: form.status,
        notes: form.notes.trim() || null,
      };
      if (isNew) await api('/api/admin/shipping-routes', { method: 'POST', body: JSON.stringify(payload) });
      else await api(`/api/admin/shipping-routes/${route!.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      onSaved();
    } catch (e: any) { setErr(e?.message || 'Failed to save'); }
    finally { setBusy(false); }
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{isNew ? 'New Shipping Route' : `Edit ${route!.code || 'Route'}`}</h2>
          <button onClick={onClose} style={iconBtn}><X size={18} /></button>
        </div>
        {err && <div style={{ padding: 10, background: 'rgba(199,59,34,0.08)', color: '#C73B22', borderRadius: 6, marginBottom: 12, fontSize: 13 }}>{err}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label style={labelStyle}>Code (optional)</label><input className={inputCls} style={inputStyle} value={form.code} onChange={e => set('code', e.target.value)} placeholder="e.g. LOS-RTM-SEA" /></div>
          <div><label style={labelStyle}>Mode *</label>
            <select className={inputCls} style={inputStyle} value={form.mode} onChange={e => set('mode', e.target.value)}>
              {MODES.map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Origin Hub *</label>
            <select className={inputCls} style={inputStyle} value={form.originHubId} onChange={e => set('originHubId', e.target.value)} data-testid="route-field-origin">
              <option value="">Select hub…</option>
              {hubs.map(h => <option key={h.id} value={h.id}>{h.code} — {h.name} ({h.country})</option>)}
            </select>
          </div>
          <div><label style={labelStyle}>Destination Port / Name *</label><input className={inputCls} style={inputStyle} value={form.destinationName} onChange={e => set('destinationName', e.target.value)} placeholder="e.g. Port of Rotterdam" /></div>
          <div><label style={labelStyle}>Destination Country *</label><input className={inputCls} style={inputStyle} value={form.destinationCountry} onChange={e => set('destinationCountry', e.target.value)} /></div>
          <div><label style={labelStyle}>Transit Days</label><input type="number" min={0} className={inputCls} style={inputStyle} value={form.transitDays} onChange={e => set('transitDays', e.target.value)} /></div>
          <div>
            <label style={labelStyle}>Default Carrier</label>
            <select className={inputCls} style={inputStyle} value={form.carrierId} onChange={e => set('carrierId', e.target.value)}>
              <option value="">— None —</option>
              {carriers.filter(c => c.carrierType === form.mode).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div><label style={labelStyle}>Base Freight Rate</label><input type="number" min={0} step="0.01" className={inputCls} style={inputStyle} value={form.baseFreightRate} onChange={e => set('baseFreightRate', e.target.value)} placeholder="e.g. 125.00" /></div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}><label style={labelStyle}>Currency</label>
              <select className={inputCls} style={inputStyle} value={form.freightCurrency} onChange={e => set('freightCurrency', e.target.value)}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}><label style={labelStyle}>Per</label>
              <select className={inputCls} style={inputStyle} value={form.freightPerUnit} onChange={e => set('freightPerUnit', e.target.value)}>
                <option value="MT">MT</option><option value="container20">20ft Container</option><option value="container40">40ft Container</option><option value="kg">kg</option>
              </select>
            </div>
          </div>
          <div><label style={labelStyle}>Customs Broker</label><input className={inputCls} style={inputStyle} value={form.customsBroker} onChange={e => set('customsBroker', e.target.value)} /></div>
          <div><label style={labelStyle}>Status</label>
            <select className={inputCls} style={inputStyle} value={form.status} onChange={e => set('status', e.target.value)}>
              {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Notes</label><textarea className={inputCls} style={{ ...inputStyle, minHeight: 60 }} value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <button onClick={onClose} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #E8E2DC', background: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
          <button onClick={save} disabled={busy} data-testid="btn-save-route"
            style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#C73B22', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13, opacity: busy ? 0.6 : 1 }}>
            {busy ? 'Saving…' : (isNew ? 'Create Route' : 'Save Changes')}
          </button>
        </div>
      </div>
    </div>
  );
}

const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 20px', zIndex: 100, overflowY: 'auto' };
const modal: React.CSSProperties = { background: '#FAFAF8', borderRadius: 14, padding: 24, width: '100%', maxWidth: 760, boxShadow: '0 10px 40px rgba(0,0,0,0.2)' };
