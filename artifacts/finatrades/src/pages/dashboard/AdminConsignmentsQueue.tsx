import React, { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { useAdminListConsignments } from '@workspace/api-client-react';
import {
  Package, Search, Clock, AlertTriangle, CheckCircle2,
  ChevronRight, FileText, Filter,
} from 'lucide-react';

const STATUS_OPTIONS = ['all', 'Submitted', 'Pending Review', 'Under Review', 'Needs More Info', 'Approved', 'Rejected'];
const PRIORITY_STATUSES = ['Submitted', 'Pending Review', 'Under Review', 'Needs More Info'];
const SLA_HOURS = 48;
const PAGE_SIZE = 25;

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    Submitted: { bg: 'rgba(59,130,246,0.12)', color: '#1D4ED8' },
    'Pending Review': { bg: 'rgba(59,130,246,0.12)', color: '#1D4ED8' },
    'Under Review': { bg: 'rgba(245,158,11,0.12)', color: '#B45309' },
    'Needs More Info': { bg: 'rgba(245,158,11,0.12)', color: '#92400E' },
    Approved: { bg: 'rgba(16,185,129,0.12)', color: '#047857' },
    Rejected: { bg: 'rgba(239,68,68,0.12)', color: '#B91C1C' },
  };
  const s = styles[status] || { bg: 'rgba(136,136,128,0.12)', color: '#444' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color }}>
      {status}
    </span>
  );
}

function SlaBadge({ submittedAt }: { submittedAt: string | null }) {
  if (!submittedAt) return null;
  const ageHours = (Date.now() - new Date(submittedAt).getTime()) / 36e5;
  const overdue = ageHours > SLA_HOURS;
  const warn = !overdue && ageHours > SLA_HOURS * 0.75;
  const color = overdue ? '#B91C1C' : warn ? '#B45309' : '#047857';
  const bg = overdue ? 'rgba(239,68,68,0.12)' : warn ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.10)';
  const label = ageHours < 1 ? `${Math.round(ageHours * 60)}m`
    : ageHours < 48 ? `${Math.round(ageHours)}h`
    : `${Math.floor(ageHours / 24)}d`;
  return (
    <span title={`Submitted ${new Date(submittedAt).toLocaleString()}`} style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px',
      borderRadius: 6, fontSize: 11, fontWeight: 700, background: bg, color,
    }}>
      <Clock size={11} /> {label}{overdue ? ' · SLA' : ''}
    </span>
  );
}

interface Row {
  id: string;
  referenceNo: string;
  exporterName: string | null;
  exporterEmail: string | null;
  commodityName: string;
  quantity: number;
  unit: string;
  targetHubCode: string | null;
  status: string;
  submittedAt: string | null;
  createdAt: string;
}

interface Sla {
  pendingTotal: number;
  pendingOverSla: number;
  slaHours: number;
  oldestPendingHours: number;
  avgReviewHoursLast7d: number;
  reviewedLast7d: number;
}

export default function AdminConsignmentsQueue() {
  const [, navigate] = useLocation();
  const [status, setStatus] = useState('all');
  const [hub, setHub] = useState('');
  const [commodity, setCommodity] = useState('');
  const [exporterId, setExporterId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [groupByStatus, setGroupByStatus] = useState(true);
  const [page, setPage] = useState(1);

  const params = useMemo(() => ({
    ...(status ? { status } : {}),
    ...(hub ? { hub } : {}),
    ...(commodity ? { commodity } : {}),
    ...(exporterId ? { exporterId } : {}),
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {}),
    ...(search ? { search } : {}),
  }), [status, hub, commodity, exporterId, dateFrom, dateTo, search]);

  const { data, isLoading } = useAdminListConsignments(params, {
    request: { credentials: 'include' },
  });

  const rows = (data?.items as Row[] | undefined) ?? [];
  const sla = data?.sla as Sla | undefined;

  // Group by status (priority statuses first), or paginate flat.
  const groups = useMemo(() => {
    if (!groupByStatus) return null;
    const map = new Map<string, Row[]>();
    for (const r of rows) {
      const arr = map.get(r.status) ?? [];
      arr.push(r);
      map.set(r.status, arr);
    }
    const ordered: { status: string; rows: Row[] }[] = [];
    for (const s of PRIORITY_STATUSES) {
      const arr = map.get(s);
      if (arr && arr.length) ordered.push({ status: s, rows: arr });
      map.delete(s);
    }
    for (const [s, arr] of map.entries()) ordered.push({ status: s, rows: arr });
    return ordered;
  }, [rows, groupByStatus]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = useMemo(() => {
    if (groupByStatus) return rows;
    const start = (page - 1) * PAGE_SIZE;
    return rows.slice(start, start + PAGE_SIZE);
  }, [rows, page, groupByStatus]);

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1500, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1A1A1A', margin: 0 }}>Consignment Review Queue</h1>
          <p style={{ color: '#666', marginTop: 4, fontSize: 13 }}>Triage submitted consignments, review documents, and approve or reject.</p>
        </div>
      </div>

      {sla && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
          <Stat label="Pending review" value={sla.pendingTotal} icon={<FileText size={16} />} />
          <Stat label="Over SLA (48h)" value={sla.pendingOverSla} icon={<AlertTriangle size={16} />} tone={sla.pendingOverSla > 0 ? 'danger' : 'ok'} />
          <Stat label="Oldest pending" value={`${sla.oldestPendingHours}h`} icon={<Clock size={16} />} />
          <Stat label="Avg review (7d)" value={`${sla.avgReviewHoursLast7d}h`} icon={<CheckCircle2 size={16} />} subtle={`${sla.reviewedLast7d} reviewed`} />
        </div>
      )}

      <div style={{ background: '#FAFAF8', border: '1px solid #E5E5E0', borderRadius: 10, padding: 14, marginBottom: 16, display: 'grid', gap: 10, gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', alignItems: 'end' }}>
        <Field label="Status">
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={selectStyle}>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s === 'all' ? 'All statuses' : s}</option>)}
          </select>
        </Field>
        <Field label="Hub code">
          <input placeholder="e.g. LOS" value={hub} onChange={(e) => setHub(e.target.value)} style={selectStyle} />
        </Field>
        <Field label="Commodity">
          <input placeholder="Cocoa, Cashew…" value={commodity} onChange={(e) => setCommodity(e.target.value)} style={selectStyle} />
        </Field>
        <Field label="Exporter ID">
          <input placeholder="UUID" value={exporterId} onChange={(e) => setExporterId(e.target.value)} style={selectStyle} />
        </Field>
        <Field label="Submitted from">
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={selectStyle} />
        </Field>
        <Field label="Submitted to">
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={selectStyle} />
        </Field>
        <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10, alignItems: 'center' }}>
          <Filter size={14} style={{ color: '#888' }} />
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: '#888' }} />
            <input
              placeholder="Search reference, ID, exporter…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ ...selectStyle, width: '100%', paddingLeft: 32 }}
            />
          </div>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#666' }}>
            <input type="checkbox" checked={groupByStatus} onChange={(e) => { setGroupByStatus(e.target.checked); setPage(1); }} />
            Group by status
          </label>
        </div>
      </div>

      {isLoading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Loading…</div>
      ) : rows.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#888', background: '#FFF', border: '1px solid #E5E5E0', borderRadius: 12 }}>
          <Package size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
          <div>No consignments match these filters.</div>
        </div>
      ) : groupByStatus && groups ? (
        groups.map(g => (
          <div key={g.status} style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <StatusBadge status={g.status} />
              <span style={{ fontSize: 11, color: '#888' }}>{g.rows.length} consignment{g.rows.length === 1 ? '' : 's'}</span>
            </div>
            <Table rows={g.rows} onOpen={(id) => navigate(`/admin/consignments/${id}`)} />
          </div>
        ))
      ) : (
        <>
          <Table rows={pageRows} onOpen={(id) => navigate(`/admin/consignments/${id}`)} />
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 16 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={pageBtn(page === 1)}>Prev</button>
              <span style={{ fontSize: 12, color: '#666' }}>Page {page} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={pageBtn(page === totalPages)}>Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Table({ rows, onOpen }: { rows: Row[]; onOpen: (id: string) => void }) {
  return (
    <div style={{ background: '#FFF', border: '1px solid #E5E5E0', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.3fr 1fr 0.7fr 1fr 0.7fr 0.6fr 120px', gap: 12, padding: '12px 16px', background: '#FAFAF8', borderBottom: '1px solid #E5E5E0', fontSize: 11, fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        <div>Reference</div>
        <div>Exporter</div>
        <div>Commodity</div>
        <div>Hub</div>
        <div>Submitted</div>
        <div>Status</div>
        <div>SLA</div>
        <div />
      </div>
      {rows.map((r) => (
        <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.3fr 1fr 0.7fr 1fr 0.7fr 0.6fr 120px', gap: 12, padding: '14px 16px', borderBottom: '1px solid #F0F0EC', alignItems: 'center' }}>
          <div style={{ fontWeight: 600, color: '#C73B22', fontSize: 13 }}>{r.referenceNo || r.id.slice(0, 8)}</div>
          <div>
            <div style={{ fontSize: 13, color: '#1A1A1A', fontWeight: 500 }}>{r.exporterName || '—'}</div>
            <div style={{ fontSize: 11, color: '#888' }}>{r.exporterEmail}</div>
          </div>
          <div style={{ fontSize: 13 }}>
            <div style={{ color: '#1A1A1A' }}>{r.commodityName}</div>
            <div style={{ fontSize: 11, color: '#888' }}>{Number(r.quantity).toLocaleString()} {r.unit}</div>
          </div>
          <div style={{ fontSize: 12, color: '#444' }}>{r.targetHubCode || '—'}</div>
          <div style={{ fontSize: 12, color: '#444' }}>{r.submittedAt ? new Date(r.submittedAt).toLocaleDateString() : '—'}</div>
          <div><StatusBadge status={r.status} /></div>
          <div><SlaBadge submittedAt={r.submittedAt} /></div>
          <div>
            <button
              onClick={() => onOpen(r.id)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', background: '#C73B22', color: '#FFF', border: 0, borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              Review <ChevronRight size={12} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#888', letterSpacing: 0.4 }}>{label}</label>
      {children}
    </div>
  );
}

function Stat({ label, value, icon, tone, subtle }: { label: string; value: React.ReactNode; icon: React.ReactNode; tone?: 'danger' | 'ok'; subtle?: string }) {
  const color = tone === 'danger' ? '#B91C1C' : tone === 'ok' ? '#047857' : '#1A1A1A';
  return (
    <div style={{ background: '#FFF', border: '1px solid #E5E5E0', borderRadius: 10, padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#888', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
      {subtle && <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{subtle}</div>}
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  padding: '8px 12px',
  border: '1px solid #DDD',
  borderRadius: 6,
  fontSize: 13,
  background: '#FFF',
  color: '#1A1A1A',
  width: '100%',
};

const pageBtn = (disabled: boolean): React.CSSProperties => ({
  padding: '6px 14px',
  border: '1px solid #DDD',
  borderRadius: 6,
  background: '#FFF',
  fontSize: 12,
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.5 : 1,
});
