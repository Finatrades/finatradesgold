import React, { useEffect, useMemo, useState } from 'react';
import { Warehouse, Plus, Edit2, Power, X, MapPin, Search } from 'lucide-react';

type Hub = {
  id: string; code: string; name: string; city: string; country: string;
  address?: string | null; capacityMT?: number | null;
  latitude?: string | null; longitude?: string | null;
  commodityTypes: string[]; contactEmail?: string | null; contactPhone?: string | null;
  hubInchargeUserId?: string | null; status: string;
  inchargeName?: string | null; inchargeEmail?: string | null;
  openConsignments?: number; lastActivityAt?: string | null;
  operatorName?: string | null;
  photos?: string[] | null;
};

type Candidate = { id: string; firstName?: string; lastName?: string; email: string; userType?: string; role?: string };

const STATUSES = ['active', 'inactive', 'under_maintenance'] as const;
const COMMODITY_OPTIONS = ['Cocoa', 'Cashew', 'Sesame', 'Coffee', 'Cotton', 'Rubber', 'Palm Oil', 'Maize', 'Rice', 'Soybeans', 'Gold', 'Other'];

const inputCls = 'w-full px-3 py-2 rounded-lg border outline-none';
const inputStyle: React.CSSProperties = { borderColor: '#E8E2DC', fontSize: 14, background: '#fff' };
const labelStyle: React.CSSProperties = { fontSize: 12, color: '#5a5a55', fontWeight: 600, display: 'block', marginBottom: 4 };

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    active: { bg: 'rgba(16,185,129,0.12)', color: '#047857', label: 'Active' },
    inactive: { bg: 'rgba(148,148,148,0.18)', color: '#525252', label: 'Inactive' },
    under_maintenance: { bg: 'rgba(245,158,11,0.15)', color: '#B45309', label: 'Maintenance' },
  };
  const s = map[status] || map.inactive;
  return <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color }}>{s.label}</span>;
}

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

export default function AdminHubs() {
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [editing, setEditing] = useState<Hub | null>(null);
  const [creating, setCreating] = useState(false);

  async function reload() {
    setLoading(true); setError(null);
    try {
      const [hubsRes, candRes] = await Promise.all([
        api('/api/admin/hubs'),
        api('/api/admin/users/warehouse-incharge-candidates').catch(() => ({ users: [] })),
      ]);
      setHubs(hubsRes.hubs || []);
      setCandidates(candRes.users || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load hubs');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { reload(); }, []);

  const filtered = useMemo(() => {
    return hubs.filter(h => {
      if (statusFilter && h.status !== statusFilter) return false;
      if (q) {
        const s = q.toLowerCase();
        if (!h.code.toLowerCase().includes(s)
          && !h.name.toLowerCase().includes(s)
          && !h.country.toLowerCase().includes(s)
          && !h.city.toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [hubs, q, statusFilter]);

  async function deactivate(id: string) {
    if (!confirm('Deactivate this hub? It will no longer appear in consignment/route dropdowns.')) return;
    try {
      await api(`/api/admin/hubs/${id}`, { method: 'DELETE' });
      await reload();
    } catch (e: any) { alert(e?.message || 'Failed to deactivate'); }
  }

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Warehouse size={22} color="#C73B22" />
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1A1A1A', margin: 0 }}>Warehouse Hubs</h1>
          </div>
          <p style={{ color: '#666', fontSize: 13, margin: '4px 0 0 0' }}>Manage the network of warehouse hubs across the platform.</p>
        </div>
        <button onClick={() => setCreating(true)} data-testid="btn-create-hub"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, background: '#C73B22', color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>
          <Plus size={16} /> New Hub
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: 360 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: 11, color: '#999' }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search code, name, city, country…"
            className={inputCls} style={{ ...inputStyle, paddingLeft: 30 }} data-testid="input-search" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={inputCls} style={{ ...inputStyle, maxWidth: 200 }} data-testid="select-status">
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
      </div>

      {loading && <div style={{ padding: 24, color: '#666' }}>Loading hubs…</div>}
      {error && <div style={{ padding: 16, background: 'rgba(199,59,34,0.08)', color: '#C73B22', borderRadius: 8 }}>{error}</div>}

      {!loading && !error && (
        <div style={{ background: '#fff', border: '1px solid #E8E2DC', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }} data-testid="hubs-table">
            <thead>
              <tr style={{ background: '#FAFAF8', borderBottom: '1px solid #E8E2DC' }}>
                <th style={th}>Code</th><th style={th}>Name</th><th style={th}>Location</th>
                <th style={th}>Utilisation</th><th style={th}>Commodities</th>
                <th style={th}>Incharge</th><th style={th}>Last Activity</th><th style={th}>Status</th><th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={9} style={{ padding: 32, textAlign: 'center', color: '#999' }}>No hubs match the filters.</td></tr>
              )}
              {filtered.map(h => (
                <tr key={h.id} style={{ borderBottom: '1px solid #F0EBE5' }} data-testid={`hub-row-${h.code}`}>
                  <td style={td}><span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#C73B22' }}>{h.code}</span></td>
                  <td style={td}>{h.name}{h.operatorName ? <div style={{ fontSize: 11, color: '#888' }}>{h.operatorName}</div> : null}</td>
                  <td style={td}>
                    <div>{h.city}, {h.country}</div>
                    {h.latitude && h.longitude && (
                      <div style={{ fontSize: 11, color: '#888', display: 'flex', alignItems: 'center', gap: 2 }}>
                        <MapPin size={10} /> {Number(h.latitude).toFixed(3)}, {Number(h.longitude).toFixed(3)}
                      </div>
                    )}
                  </td>
                  <td style={td}>
                    {(() => {
                      const open = h.openConsignments ?? 0;
                      const cap = h.capacityMT ?? 0;
                      const pct = cap > 0 ? Math.min(100, Math.round((open / cap) * 100)) : 0;
                      const barColor = pct >= 90 ? '#C73B22' : pct >= 70 ? '#B45309' : '#047857';
                      return (
                        <div data-testid={`hub-util-${h.code}`}>
                          <div style={{ fontSize: 12, color: '#1A1A1A', fontWeight: 600 }}>
                            {open.toLocaleString()} <span style={{ color: '#888', fontWeight: 400 }}>/ {cap ? cap.toLocaleString() : '—'} MT</span>
                          </div>
                          {cap > 0 && (
                            <div style={{ marginTop: 4, height: 4, width: 100, background: '#F0EBE5', borderRadius: 2, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${pct}%`, background: barColor }} />
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </td>
                  <td style={td}>
                    {(h.commodityTypes || []).slice(0, 3).map(c => (
                      <span key={c} style={{ display: 'inline-block', padding: '1px 6px', margin: 1, borderRadius: 4, fontSize: 10, background: '#F0EBE5', color: '#5a5a55' }}>{c}</span>
                    ))}
                    {(h.commodityTypes?.length || 0) > 3 && <span style={{ fontSize: 11, color: '#888' }}>+{h.commodityTypes.length - 3}</span>}
                  </td>
                  <td style={td}>{h.inchargeName || <span style={{ color: '#bbb' }}>—</span>}</td>
                  <td style={td} data-testid={`hub-last-activity-${h.code}`}>
                    {h.lastActivityAt
                      ? <span title={new Date(h.lastActivityAt).toLocaleString()}>{new Date(h.lastActivityAt).toLocaleDateString()}</span>
                      : <span style={{ color: '#bbb' }}>—</span>}
                  </td>
                  <td style={td}><StatusPill status={h.status} /></td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    <button onClick={() => setEditing(h)} title="Edit" data-testid={`btn-edit-${h.code}`}
                      style={iconBtn}><Edit2 size={14} /></button>
                    {h.status !== 'inactive' && (
                      <button onClick={() => deactivate(h.id)} title="Deactivate" data-testid={`btn-deactivate-${h.code}`}
                        style={{ ...iconBtn, color: '#C73B22' }}><Power size={14} /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(creating || editing) && (
        <HubFormModal
          hub={editing}
          candidates={candidates}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={async () => { setCreating(false); setEditing(null); await reload(); }}
        />
      )}
    </div>
  );
}

const th: React.CSSProperties = { padding: '10px 12px', textAlign: 'left', fontSize: 11, color: '#666', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 };
const td: React.CSSProperties = { padding: '10px 12px', color: '#1A1A1A', verticalAlign: 'top' };
const iconBtn: React.CSSProperties = { background: 'transparent', border: 'none', cursor: 'pointer', padding: 6, marginLeft: 4, color: '#5a5a55' };

function HubFormModal({ hub, candidates, onClose, onSaved }: { hub: Hub | null; candidates: Candidate[]; onClose: () => void; onSaved: () => void }) {
  const isNew = !hub;
  const [form, setForm] = useState({
    code: hub?.code ?? '',
    name: hub?.name ?? '',
    city: hub?.city ?? '',
    country: hub?.country ?? '',
    address: hub?.address ?? '',
    capacityMT: hub?.capacityMT?.toString() ?? '',
    latitude: hub?.latitude ?? '',
    longitude: hub?.longitude ?? '',
    commodityTypes: hub?.commodityTypes ?? [],
    contactEmail: hub?.contactEmail ?? '',
    contactPhone: hub?.contactPhone ?? '',
    hubInchargeUserId: hub?.hubInchargeUserId ?? '',
    status: hub?.status ?? 'active',
    photos: hub?.photos as any ?? [],
    operatorName: hub?.operatorName ?? '',
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function set<K extends keyof typeof form>(k: K, v: any) { setForm(f => ({ ...f, [k]: v })); }

  async function save() {
    setBusy(true); setErr(null);
    try {
      const payload: any = {
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        city: form.city.trim(),
        country: form.country.trim(),
        address: form.address.trim() || null,
        capacityMT: form.capacityMT ? Number(form.capacityMT) : null,
        latitude: form.latitude !== '' && form.latitude != null ? Number(form.latitude) : null,
        longitude: form.longitude !== '' && form.longitude != null ? Number(form.longitude) : null,
        commodityTypes: form.commodityTypes,
        contactEmail: form.contactEmail.trim() || null,
        contactPhone: form.contactPhone.trim() || null,
        hubInchargeUserId: form.hubInchargeUserId || null,
        status: form.status,
        photos: form.photos,
        operatorName: form.operatorName.trim() || null,
      };
      if (isNew) {
        await api('/api/admin/hubs', { method: 'POST', body: JSON.stringify(payload) });
      } else {
        await api(`/api/admin/hubs/${hub!.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      }
      onSaved();
    } catch (e: any) {
      setErr(e?.message || 'Failed to save');
    } finally { setBusy(false); }
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{isNew ? 'New Warehouse Hub' : `Edit ${hub!.code}`}</h2>
          <button onClick={onClose} style={iconBtn}><X size={18} /></button>
        </div>
        {err && <div style={{ padding: 10, background: 'rgba(199,59,34,0.08)', color: '#C73B22', borderRadius: 6, marginBottom: 12, fontSize: 13 }}>{err}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label style={labelStyle}>Code *</label><input className={inputCls} style={inputStyle} value={form.code} onChange={e => set('code', e.target.value.toUpperCase())} disabled={!isNew} data-testid="hub-field-code" /></div>
          <div><label style={labelStyle}>Display Name *</label><input className={inputCls} style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} data-testid="hub-field-name" /></div>
          <div><label style={labelStyle}>City *</label><input className={inputCls} style={inputStyle} value={form.city} onChange={e => set('city', e.target.value)} data-testid="hub-field-city" /></div>
          <div><label style={labelStyle}>Country *</label><input className={inputCls} style={inputStyle} value={form.country} onChange={e => set('country', e.target.value)} data-testid="hub-field-country" /></div>
          <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Address</label><input className={inputCls} style={inputStyle} value={form.address} onChange={e => set('address', e.target.value)} /></div>
          <div><label style={labelStyle}>Latitude</label><input type="number" step="any" className={inputCls} style={inputStyle} value={form.latitude as any} onChange={e => set('latitude', e.target.value)} placeholder="e.g. 6.5244" /></div>
          <div><label style={labelStyle}>Longitude</label><input type="number" step="any" className={inputCls} style={inputStyle} value={form.longitude as any} onChange={e => set('longitude', e.target.value)} placeholder="e.g. 3.3792" /></div>
          <div><label style={labelStyle}>Capacity (MT)</label><input type="number" min={0} className={inputCls} style={inputStyle} value={form.capacityMT} onChange={e => set('capacityMT', e.target.value)} /></div>
          <div><label style={labelStyle}>Operator</label><input className={inputCls} style={inputStyle} value={form.operatorName} onChange={e => set('operatorName', e.target.value)} /></div>
          <div><label style={labelStyle}>Contact Email</label><input className={inputCls} style={inputStyle} value={form.contactEmail} onChange={e => set('contactEmail', e.target.value)} /></div>
          <div><label style={labelStyle}>Contact Phone</label><input className={inputCls} style={inputStyle} value={form.contactPhone} onChange={e => set('contactPhone', e.target.value)} /></div>
          <div>
            <label style={labelStyle}>Hub Incharge</label>
            <select className={inputCls} style={inputStyle} value={form.hubInchargeUserId} onChange={e => set('hubInchargeUserId', e.target.value)}>
              <option value="">— None —</option>
              {candidates.map(c => (
                <option key={c.id} value={c.id}>{(`${c.firstName ?? ''} ${c.lastName ?? ''}`).trim() || c.email}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Status</label>
            <select className={inputCls} style={inputStyle} value={form.status} onChange={e => set('status', e.target.value)}>
              {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Commodity Types Accepted</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {COMMODITY_OPTIONS.map(c => {
                const on = form.commodityTypes.includes(c);
                return (
                  <button key={c} type="button" onClick={() => set('commodityTypes', on ? form.commodityTypes.filter((x: string) => x !== c) : [...form.commodityTypes, c])}
                    style={{ padding: '4px 10px', borderRadius: 14, fontSize: 12, fontWeight: 600, border: '1px solid', borderColor: on ? '#C73B22' : '#E8E2DC', background: on ? 'rgba(199,59,34,0.08)' : '#fff', color: on ? '#C73B22' : '#5a5a55', cursor: 'pointer' }}>
                    {c}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <button onClick={onClose} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #E8E2DC', background: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
          <button onClick={save} disabled={busy} data-testid="btn-save-hub"
            style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#C73B22', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13, opacity: busy ? 0.6 : 1 }}>
            {busy ? 'Saving…' : (isNew ? 'Create Hub' : 'Save Changes')}
          </button>
        </div>
      </div>
    </div>
  );
}

const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 20px', zIndex: 100, overflowY: 'auto' };
const modal: React.CSSProperties = { background: '#FAFAF8', borderRadius: 14, padding: 24, width: '100%', maxWidth: 760, boxShadow: '0 10px 40px rgba(0,0,0,0.2)' };
