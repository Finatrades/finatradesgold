import React, { useEffect, useMemo, useState } from 'react';
import { Truck, Plus, Edit2, Power, X, Search } from 'lucide-react';

type Carrier = {
  id: string; name: string; carrierType: string;
  registrationNo?: string | null; contactName?: string | null;
  contactEmail?: string | null; contactPhone?: string | null;
  supportedLanes: string[]; onTimeScore?: string | null;
  status: string; notes?: string | null;
};

const MODES = ['sea', 'road', 'rail', 'air'] as const;
const STATUSES = ['active', 'inactive', 'under_maintenance'] as const;

const inputCls = 'w-full px-3 py-2 rounded-lg border outline-none';
const inputStyle: React.CSSProperties = { borderColor: '#E8E2DC', fontSize: 14, background: '#fff' };
const labelStyle: React.CSSProperties = { fontSize: 12, color: '#5a5a55', fontWeight: 600, display: 'block', marginBottom: 4 };
const th: React.CSSProperties = { padding: '10px 12px', textAlign: 'left', fontSize: 11, color: '#666', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 };
const td: React.CSSProperties = { padding: '10px 12px', color: '#1A1A1A', verticalAlign: 'top' };
const iconBtn: React.CSSProperties = { background: 'transparent', border: 'none', cursor: 'pointer', padding: 6, marginLeft: 4, color: '#5a5a55' };

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, { credentials: 'include', headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) }, ...init });
  if (!res.ok) {
    const txt = await res.text();
    let msg = txt; try { msg = JSON.parse(txt).message || txt; } catch {}
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

export default function AdminCarriers() {
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [modeFilter, setModeFilter] = useState('');
  const [editing, setEditing] = useState<Carrier | null>(null);
  const [creating, setCreating] = useState(false);

  async function reload() {
    setLoading(true); setError(null);
    try {
      const res = await api('/api/admin/carriers');
      setCarriers(res.carriers || []);
    } catch (e: any) { setError(e?.message || 'Failed to load'); }
    finally { setLoading(false); }
  }
  useEffect(() => { reload(); }, []);

  const filtered = useMemo(() => carriers.filter(c => {
    if (modeFilter && c.carrierType !== modeFilter) return false;
    if (q) {
      const s = q.toLowerCase();
      if (!c.name.toLowerCase().includes(s) && !(c.registrationNo || '').toLowerCase().includes(s)) return false;
    }
    return true;
  }), [carriers, q, modeFilter]);

  async function deactivate(id: string) {
    if (!confirm('Deactivate this carrier?')) return;
    try { await api(`/api/admin/carriers/${id}`, { method: 'DELETE' }); await reload(); }
    catch (e: any) { alert(e?.message || 'Failed'); }
  }

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Truck size={22} color="#C73B22" />
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1A1A1A', margin: 0 }}>Carriers</h1>
          </div>
          <p style={{ color: '#666', fontSize: 13, margin: '4px 0 0 0' }}>Sea, road, rail, and air carriers that operate platform shipments.</p>
        </div>
        <button onClick={() => setCreating(true)} data-testid="btn-create-carrier"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, background: '#C73B22', color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>
          <Plus size={16} /> New Carrier
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: 360 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: 11, color: '#999' }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name or registration…"
            className={inputCls} style={{ ...inputStyle, paddingLeft: 30 }} />
        </div>
        <select value={modeFilter} onChange={e => setModeFilter(e.target.value)} className={inputCls} style={{ ...inputStyle, maxWidth: 200 }}>
          <option value="">All modes</option>
          {MODES.map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
        </select>
      </div>

      {loading && <div style={{ padding: 24, color: '#666' }}>Loading carriers…</div>}
      {error && <div style={{ padding: 16, background: 'rgba(199,59,34,0.08)', color: '#C73B22', borderRadius: 8 }}>{error}</div>}

      {!loading && !error && (
        <div style={{ background: '#fff', border: '1px solid #E8E2DC', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }} data-testid="carriers-table">
            <thead>
              <tr style={{ background: '#FAFAF8', borderBottom: '1px solid #E8E2DC' }}>
                <th style={th}>Name</th><th style={th}>Mode</th><th style={th}>Reg #</th>
                <th style={th}>Contact</th><th style={th}>Lanes</th>
                <th style={th}>On-time</th><th style={th}>Status</th><th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center', color: '#999' }}>No carriers yet — add one to get started.</td></tr>}
              {filtered.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid #F0EBE5' }} data-testid={`carrier-row-${c.id}`}>
                  <td style={td}><div style={{ fontWeight: 700 }}>{c.name}</div></td>
                  <td style={td}><span style={{ fontFamily: 'monospace', textTransform: 'uppercase', fontSize: 12 }}>{c.carrierType}</span></td>
                  <td style={td}>{c.registrationNo || '—'}</td>
                  <td style={td}>
                    {c.contactName && <div>{c.contactName}</div>}
                    {c.contactEmail && <div style={{ fontSize: 11, color: '#888' }}>{c.contactEmail}</div>}
                    {c.contactPhone && <div style={{ fontSize: 11, color: '#888' }}>{c.contactPhone}</div>}
                  </td>
                  <td style={td}>
                    {(c.supportedLanes || []).slice(0, 3).map(l => <span key={l} style={{ display: 'inline-block', padding: '1px 6px', margin: 1, borderRadius: 4, fontSize: 10, background: '#F0EBE5', color: '#5a5a55' }}>{l}</span>)}
                    {(c.supportedLanes?.length || 0) > 3 && <span style={{ fontSize: 11, color: '#888' }}>+{c.supportedLanes.length - 3}</span>}
                  </td>
                  <td style={td}>{c.onTimeScore ? `${c.onTimeScore}%` : '—'}</td>
                  <td style={td}><StatusPill status={c.status} /></td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    <button onClick={() => setEditing(c)} title="Edit" style={iconBtn}><Edit2 size={14} /></button>
                    {c.status !== 'inactive' && <button onClick={() => deactivate(c.id)} title="Deactivate" style={{ ...iconBtn, color: '#C73B22' }}><Power size={14} /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(creating || editing) && (
        <CarrierFormModal carrier={editing} onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={async () => { setCreating(false); setEditing(null); await reload(); }} />
      )}
    </div>
  );
}

function CarrierFormModal({ carrier, onClose, onSaved }: { carrier: Carrier | null; onClose: () => void; onSaved: () => void }) {
  const isNew = !carrier;
  const [form, setForm] = useState({
    name: carrier?.name ?? '',
    carrierType: carrier?.carrierType ?? 'sea',
    registrationNo: carrier?.registrationNo ?? '',
    contactName: carrier?.contactName ?? '',
    contactEmail: carrier?.contactEmail ?? '',
    contactPhone: carrier?.contactPhone ?? '',
    supportedLanes: (carrier?.supportedLanes ?? []).join(', '),
    onTimeScore: carrier?.onTimeScore ?? '',
    status: carrier?.status ?? 'active',
    notes: carrier?.notes ?? '',
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function set<K extends keyof typeof form>(k: K, v: any) { setForm(f => ({ ...f, [k]: v })); }

  async function save() {
    setBusy(true); setErr(null);
    try {
      const payload: any = {
        name: form.name.trim(),
        carrierType: form.carrierType,
        registrationNo: form.registrationNo.trim() || null,
        contactName: form.contactName.trim() || null,
        contactEmail: form.contactEmail.trim() || null,
        contactPhone: form.contactPhone.trim() || null,
        supportedLanes: form.supportedLanes.split(',').map(s => s.trim()).filter(Boolean),
        onTimeScore: form.onTimeScore !== '' ? Number(form.onTimeScore) : null,
        status: form.status,
        notes: form.notes.trim() || null,
      };
      if (isNew) await api('/api/admin/carriers', { method: 'POST', body: JSON.stringify(payload) });
      else await api(`/api/admin/carriers/${carrier!.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      onSaved();
    } catch (e: any) { setErr(e?.message || 'Failed to save'); }
    finally { setBusy(false); }
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{isNew ? 'New Carrier' : `Edit ${carrier!.name}`}</h2>
          <button onClick={onClose} style={iconBtn}><X size={18} /></button>
        </div>
        {err && <div style={{ padding: 10, background: 'rgba(199,59,34,0.08)', color: '#C73B22', borderRadius: 6, marginBottom: 12, fontSize: 13 }}>{err}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label style={labelStyle}>Name *</label><input className={inputCls} style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} data-testid="carrier-field-name" /></div>
          <div><label style={labelStyle}>Mode *</label>
            <select className={inputCls} style={inputStyle} value={form.carrierType} onChange={e => set('carrierType', e.target.value)}>
              {MODES.map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
            </select>
          </div>
          <div><label style={labelStyle}>Registration / IMO / MC #</label><input className={inputCls} style={inputStyle} value={form.registrationNo} onChange={e => set('registrationNo', e.target.value)} /></div>
          <div><label style={labelStyle}>On-Time Score (%)</label><input type="number" min={0} max={100} step="0.01" className={inputCls} style={inputStyle} value={form.onTimeScore} onChange={e => set('onTimeScore', e.target.value)} /></div>
          <div><label style={labelStyle}>Contact Name</label><input className={inputCls} style={inputStyle} value={form.contactName} onChange={e => set('contactName', e.target.value)} /></div>
          <div><label style={labelStyle}>Contact Email</label><input className={inputCls} style={inputStyle} value={form.contactEmail} onChange={e => set('contactEmail', e.target.value)} /></div>
          <div><label style={labelStyle}>Contact Phone</label><input className={inputCls} style={inputStyle} value={form.contactPhone} onChange={e => set('contactPhone', e.target.value)} /></div>
          <div><label style={labelStyle}>Status</label>
            <select className={inputCls} style={inputStyle} value={form.status} onChange={e => set('status', e.target.value)}>
              {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Supported Lanes (comma-separated)</label><input className={inputCls} style={inputStyle} value={form.supportedLanes} onChange={e => set('supportedLanes', e.target.value)} placeholder="e.g. Lagos→Rotterdam, Mombasa→Hamburg" /></div>
          <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Notes</label><textarea className={inputCls} style={{ ...inputStyle, minHeight: 60 }} value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <button onClick={onClose} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #E8E2DC', background: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
          <button onClick={save} disabled={busy} data-testid="btn-save-carrier"
            style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#C73B22', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13, opacity: busy ? 0.6 : 1 }}>
            {busy ? 'Saving…' : (isNew ? 'Create Carrier' : 'Save Changes')}
          </button>
        </div>
      </div>
    </div>
  );
}

const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 20px', zIndex: 100, overflowY: 'auto' };
const modal: React.CSSProperties = { background: '#FAFAF8', borderRadius: 14, padding: 24, width: '100%', maxWidth: 720, boxShadow: '0 10px 40px rgba(0,0,0,0.2)' };
