import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/queryClient';
import { toast } from 'sonner';
import {
  Warehouse as WarehouseIcon, Search, Truck, CheckCircle2, X, Clock,
  Package as PackageIcon, ScrollText, AlertCircle, ChevronRight, ShieldAlert,
} from 'lucide-react';

interface ConsignmentRow {
  id: string;
  referenceNo: string;
  commodityName: string;
  commodityCategory?: string | null;
  quantity: number;
  unit: string;
  qualityGrade?: string | null;
  originCountry: string;
  targetHubCode?: string | null;
  incoterms?: string | null;
  askingPriceCents?: number | null;
  askingCurrency?: string | null;
  status: string;
  updatedAt: string;
  tally: TallyRow | null;
}

interface TallyRow {
  id: string;
  consignmentId: string;
  hubCode: string;
  arrivedAt: string | null;
  declaredQuantity: number | null;
  actualQuantity: number | null;
  unit: string;
  packageCount: number | null;
  packageType: string | null;
  qualityGrade: string | null;
  moisturePct: number | null;
  sampleNotes: string | null;
  damageNotes: string | null;
  status: 'Draft' | 'Tallied' | 'Verified' | 'Rejected';
  verifiedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  inventoryItemId: string | null;
}

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  'Approved':       { bg: 'rgba(16,185,129,0.1)', color: '#059669' },
  'In Transit':     { bg: 'rgba(139,92,246,0.1)', color: '#7C3AED' },
  'At Warehouse':   { bg: 'rgba(199,59,34,0.1)', color: '#C73B22' },
  'Verified':       { bg: 'rgba(5,150,105,0.12)', color: '#047857' },
  'Rejected':       { bg: 'rgba(239,68,68,0.1)', color: '#DC2626' },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] || { bg: '#F0EBE6', color: '#888880' };
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: s.bg, color: s.color }} data-testid={`status-${status}`}>
      {status}
    </span>
  );
}

function fmtMoney(cents: number | null | undefined, currency = 'USD'): string {
  if (cents == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(cents / 100);
}

function fmtDate(s: string | null | undefined): string {
  if (!s) return '—';
  try { return new Date(s).toLocaleString(); } catch { return s; }
}

export default function Warehouse() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: rows = [], isLoading, error } = useQuery<ConsignmentRow[]>({
    queryKey: ['/api/b2b/warehouse/inbound'],
  });

  const filtered = useMemo(() => {
    let list = rows;
    if (statusFilter !== 'all') list = list.filter(r => r.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.referenceNo?.toLowerCase().includes(q) ||
        r.commodityName?.toLowerCase().includes(q) ||
        r.originCountry?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [rows, search, statusFilter]);

  const selected = useMemo(() => rows.find(r => r.id === selectedId) || null, [rows, selectedId]);

  const counts = useMemo(() => {
    const c = { total: rows.length, awaiting: 0, atHub: 0, verified: 0, rejected: 0 };
    for (const r of rows) {
      if (r.status === 'In Transit' || r.status === 'Approved') c.awaiting++;
      if (r.status === 'At Warehouse') c.atHub++;
      if (r.status === 'Verified') c.verified++;
      if (r.status === 'Rejected') c.rejected++;
    }
    return c;
  }, [rows]);

  const arriveMut = useMutation({
    mutationFn: async (id: string) => apiRequest('POST', `/api/b2b/warehouse/consignments/${id}/arrive`, {}),
    onSuccess: () => {
      toast.success('Marked as arrived at hub');
      qc.invalidateQueries({ queryKey: ['/api/b2b/warehouse/inbound'] });
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to mark arrival'),
  });

  const hubError = (error as any)?.message?.includes('HUB_NOT_ASSIGNED') ||
                   (error as any)?.code === 'HUB_NOT_ASSIGNED';

  return (
    <div className="space-y-6" data-testid="page-warehouse">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>Warehouse Tally Queue</h1>
          <p className="text-sm mt-1" style={{ color: '#888880' }}>
            Step 4 — weigh, count, sample-test, and verify inbound consignments at your hub.
          </p>
        </div>
        {user && (user as any).assignedHubCode && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{ background: 'rgba(199,59,34,0.08)', color: '#C73B22', border: '1px solid rgba(199,59,34,0.18)' }}>
            <WarehouseIcon size={12} /> Hub {(user as any).assignedHubCode}
          </div>
        )}
      </div>

      {hubError && (
        <div className="rounded-xl p-4 flex items-start gap-3"
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
          <ShieldAlert size={20} style={{ color: '#B45309' }} className="mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>No hub assigned</p>
            <p className="text-xs mt-0.5" style={{ color: '#7A6242' }}>
              An administrator needs to assign a warehouse hub code to your account before you can see inbound consignments.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Total Inbound" value={counts.total} />
        <StatCard label="Awaiting Arrival" value={counts.awaiting} color="#7C3AED" />
        <StatCard label="At Warehouse" value={counts.atHub} color="#C73B22" />
        <StatCard label="Verified" value={counts.verified} color="#047857" />
        <StatCard label="Rejected" value={counts.rejected} color="#DC2626" />
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#888880' }} />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reference, commodity or origin…"
            className="w-full pl-9 pr-3 py-2 rounded-lg text-sm"
            style={{ border: '1px solid #E8E2DC', background: '#FAFAF8', color: '#1A1A1A' }}
            data-testid="input-search"
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm"
          style={{ border: '1px solid #E8E2DC', background: '#FAFAF8', color: '#1A1A1A' }}
          data-testid="select-status">
          <option value="all">All statuses</option>
          {Object.keys(STATUS_STYLE).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="rounded-2xl bg-white overflow-hidden" style={{ border: '1px solid #E8E2DC' }}>
        {isLoading ? (
          <div className="p-10 text-center text-sm" style={{ color: '#888880' }}>Loading inbound consignments…</div>
        ) : error && !hubError ? (
          <div className="p-10 text-center text-sm" style={{ color: '#DC2626' }}>
            Failed to load: {(error as any)?.message || 'unknown error'}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center" data-testid="empty-state">
            <WarehouseIcon size={36} className="mx-auto mb-2" style={{ color: '#888880' }} />
            <p className="font-semibold" style={{ color: '#1A1A1A' }}>Nothing inbound right now</p>
            <p className="text-sm mt-1" style={{ color: '#888880' }}>
              Approved consignments routed to your hub will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ background: '#FAFAF8' }}>
                <tr className="text-left" style={{ color: '#888880' }}>
                  <th className="px-4 py-3 font-semibold">Reference</th>
                  <th className="px-4 py-3 font-semibold">Commodity</th>
                  <th className="px-4 py-3 font-semibold">Declared</th>
                  <th className="px-4 py-3 font-semibold">Origin → Hub</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Tally</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className="border-t" style={{ borderColor: '#E8E2DC' }}
                    data-testid={`row-${r.referenceNo}`}>
                    <td className="px-4 py-3 font-semibold" style={{ color: '#1A1A1A' }}>{r.referenceNo}</td>
                    <td className="px-4 py-3" style={{ color: '#1A1A1A' }}>{r.commodityName}</td>
                    <td className="px-4 py-3" style={{ color: '#1A1A1A' }}>{r.quantity} {r.unit}</td>
                    <td className="px-4 py-3" style={{ color: '#1A1A1A' }}>{r.originCountry} → {r.targetHubCode ?? '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3 text-xs" style={{ color: '#888880' }}>
                      {r.tally
                        ? `${r.tally.status} · ${r.tally.actualQuantity != null ? `${r.tally.actualQuantity} ${r.tally.unit}` : '—'}`
                        : <span style={{ color: '#B0AAA4' }}>No tally yet</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {(r.status === 'Approved' || r.status === 'In Transit') && (
                        <button
                          onClick={(e) => { e.stopPropagation(); arriveMut.mutate(r.id); }}
                          disabled={arriveMut.isPending}
                          className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md mr-2 disabled:opacity-50"
                          style={{ background: 'rgba(199,59,34,0.08)', color: '#C73B22' }}
                          data-testid={`btn-arrive-${r.referenceNo}`}>
                          <Truck size={12} /> Mark Arrived
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedId(r.id)}
                        className="inline-flex items-center gap-1 text-xs font-semibold"
                        style={{ color: '#C73B22' }}
                        data-testid={`btn-tally-${r.referenceNo}`}>
                        Tally <ChevronRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <TallyDrawer
          row={selected}
          onClose={() => setSelectedId(null)}
          onChanged={() => qc.invalidateQueries({ queryKey: ['/api/b2b/warehouse/inbound'] })}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, color = '#C73B22' }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="rounded-2xl p-4 bg-white" style={{ border: '1px solid #E8E2DC' }}>
      <p className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>{value}</p>
      <p className="text-xs font-medium mt-1" style={{ color }}>{label}</p>
    </div>
  );
}

interface TallyForm {
  actualQuantity: string;
  packageCount: string;
  packageType: string;
  qualityGrade: string;
  moisturePct: string;
  sampleNotes: string;
  damageNotes: string;
}

function TallyDrawer({ row, onClose, onChanged }: {
  row: ConsignmentRow;
  onClose: () => void;
  onChanged: () => void;
}) {
  const qc = useQueryClient();
  const existing = row.tally;
  const [form, setForm] = useState<TallyForm>({
    actualQuantity: existing?.actualQuantity?.toString() ?? row.quantity.toString(),
    packageCount: existing?.packageCount?.toString() ?? '',
    packageType: existing?.packageType ?? '',
    qualityGrade: existing?.qualityGrade ?? row.qualityGrade ?? '',
    moisturePct: existing?.moisturePct?.toString() ?? '',
    sampleNotes: existing?.sampleNotes ?? '',
    damageNotes: existing?.damageNotes ?? '',
  });
  const [rejectReason, setRejectReason] = useState('');
  const [mode, setMode] = useState<'tally' | 'reject'>('tally');

  const readonly = existing?.status === 'Verified' || existing?.status === 'Rejected';

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['/api/b2b/warehouse/inbound'] });
    qc.invalidateQueries({ queryKey: [`/api/b2b/consignments/${row.id}`] });
    onChanged();
  };

  const tallyMut = useMutation({
    mutationFn: async () => {
      const body: any = {
        actualQuantity: Number(form.actualQuantity),
      };
      if (form.packageCount) body.packageCount = Number(form.packageCount);
      if (form.packageType) body.packageType = form.packageType;
      if (form.qualityGrade) body.qualityGrade = form.qualityGrade;
      if (form.moisturePct) body.moisturePct = Number(form.moisturePct);
      if (form.sampleNotes) body.sampleNotes = form.sampleNotes;
      if (form.damageNotes) body.damageNotes = form.damageNotes;
      return apiRequest('POST', `/api/b2b/warehouse/consignments/${row.id}/tally`, body);
    },
    onSuccess: () => { toast.success('Tally saved'); invalidate(); },
    onError: (e: any) => toast.error(e?.message || 'Failed to save tally'),
  });

  const verifyMut = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/b2b/warehouse/consignments/${row.id}/verify`, {});
      return res.json();
    },
    onSuccess: (data: any) => {
      toast.success(`Verified — receipt ${data?.warehouseReceiptNo ?? ''}`);
      invalidate();
      onClose();
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to verify'),
  });

  const rejectMut = useMutation({
    mutationFn: async () => apiRequest('POST', `/api/b2b/warehouse/consignments/${row.id}/reject`, { reason: rejectReason }),
    onSuccess: () => { toast.success('Consignment rejected'); invalidate(); onClose(); },
    onError: (e: any) => toast.error(e?.message || 'Failed to reject'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/30" onClick={onClose}
         data-testid="tally-drawer">
      <div className="w-full max-w-xl h-full bg-white shadow-2xl overflow-y-auto"
           onClick={(e) => e.stopPropagation()}
           style={{ borderLeft: '1px solid #E8E2DC' }}>
        <div className="p-5 flex items-start justify-between gap-3"
             style={{ borderBottom: '1px solid #E8E2DC', background: '#FAFAF8' }}>
          <div>
            <h2 className="text-lg font-bold" style={{ color: '#1A1A1A' }}>{row.referenceNo}</h2>
            <p className="text-xs mt-1" style={{ color: '#888880' }}>
              {row.commodityName} · declared {row.quantity} {row.unit} · {row.originCountry} → {row.targetHubCode}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <StatusBadge status={row.status} />
              {existing && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: '#F0EBE6', color: '#888880' }}>
                  Tally: {existing.status}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F0EBE6]" data-testid="btn-close-drawer">
            <X size={18} style={{ color: '#888880' }} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {existing?.status === 'Verified' && (
            <Banner color="#047857" bg="rgba(5,150,105,0.08)" icon={<CheckCircle2 size={16} />}
              title="Verified"
              text={`Verified ${fmtDate(existing.verifiedAt)}. Inventory receipt issued: ${existing.inventoryItemId ?? '—'}`} />
          )}
          {existing?.status === 'Rejected' && (
            <Banner color="#DC2626" bg="rgba(239,68,68,0.08)" icon={<AlertCircle size={16} />}
              title="Rejected"
              text={existing.rejectionReason || 'No reason recorded'} />
          )}

          <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: '#F0EBE6' }}>
            <button onClick={() => setMode('tally')}
              className="flex-1 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all"
              style={mode === 'tally'
                ? { background: '#fff', color: '#1A1A1A', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }
                : { color: '#888880' }}
              data-testid="tab-tally">Tally & Verify</button>
            <button onClick={() => setMode('reject')} disabled={readonly}
              className="flex-1 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
              style={mode === 'reject'
                ? { background: '#fff', color: '#DC2626', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }
                : { color: '#888880' }}
              data-testid="tab-reject">Reject</button>
          </div>

          {mode === 'tally' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label={`Actual quantity (${row.unit}) *`}>
                  <input type="number" step="0.001" value={form.actualQuantity}
                    disabled={readonly}
                    onChange={(e) => setForm({ ...form, actualQuantity: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ border: '1px solid #E8E2DC', background: '#FAFAF8', color: '#1A1A1A' }}
                    data-testid="input-actual-quantity" />
                </Field>
                <Field label="Package count">
                  <input type="number" value={form.packageCount}
                    disabled={readonly}
                    onChange={(e) => setForm({ ...form, packageCount: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ border: '1px solid #E8E2DC', background: '#FAFAF8', color: '#1A1A1A' }}
                    data-testid="input-package-count" />
                </Field>
                <Field label="Package type">
                  <input value={form.packageType}
                    disabled={readonly}
                    onChange={(e) => setForm({ ...form, packageType: e.target.value })}
                    placeholder="50kg jute sacks"
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ border: '1px solid #E8E2DC', background: '#FAFAF8', color: '#1A1A1A' }} />
                </Field>
                <Field label="Quality grade (sampled)">
                  <select value={form.qualityGrade}
                    disabled={readonly}
                    onChange={(e) => setForm({ ...form, qualityGrade: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ border: '1px solid #E8E2DC', background: '#FAFAF8', color: '#1A1A1A' }}
                    data-testid="select-quality">
                    <option value="">—</option>
                    {['A+', 'A', 'B+', 'B', 'C', 'D'].map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </Field>
                <Field label="Moisture %">
                  <input type="number" step="0.01" value={form.moisturePct}
                    disabled={readonly}
                    onChange={(e) => setForm({ ...form, moisturePct: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ border: '1px solid #E8E2DC', background: '#FAFAF8', color: '#1A1A1A' }} />
                </Field>
              </div>

              <Field label="Sample / inspection notes">
                <textarea rows={2} value={form.sampleNotes}
                  disabled={readonly}
                  onChange={(e) => setForm({ ...form, sampleNotes: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm resize-none"
                  style={{ border: '1px solid #E8E2DC', background: '#FAFAF8', color: '#1A1A1A' }}
                  data-testid="input-sample-notes" />
              </Field>

              <Field label="Damage / discrepancy notes">
                <textarea rows={2} value={form.damageNotes}
                  disabled={readonly}
                  onChange={(e) => setForm({ ...form, damageNotes: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm resize-none"
                  style={{ border: '1px solid #E8E2DC', background: '#FAFAF8', color: '#1A1A1A' }} />
              </Field>

              {!readonly && (
                <div className="flex items-center gap-2 pt-2">
                  <button onClick={() => tallyMut.mutate()}
                    disabled={tallyMut.isPending || !form.actualQuantity}
                    className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                    style={{ background: '#F0EBE6', color: '#1A1A1A' }}
                    data-testid="btn-save-tally">
                    {tallyMut.isPending ? 'Saving…' : existing ? 'Update Tally' : 'Save Tally'}
                  </button>
                  <button onClick={() => verifyMut.mutate()}
                    disabled={verifyMut.isPending || !existing || existing.status === 'Draft'}
                    className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                    style={{ background: '#047857' }}
                    title={!existing || existing.status === 'Draft' ? 'Save tally first' : 'Verify and add to inventory'}
                    data-testid="btn-verify">
                    {verifyMut.isPending ? 'Verifying…' : 'Verify → Inventory'}
                  </button>
                </div>
              )}
            </div>
          )}

          {mode === 'reject' && !readonly && (
            <div className="space-y-3">
              <Field label="Rejection reason *">
                <textarea rows={4} value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Quality below contracted grade; visible mold; weight short by 8%…"
                  className="w-full px-3 py-2 rounded-lg text-sm resize-none"
                  style={{ border: '1px solid #E8E2DC', background: '#FAFAF8', color: '#1A1A1A' }}
                  data-testid="input-reject-reason" />
              </Field>
              <button onClick={() => rejectMut.mutate()}
                disabled={rejectMut.isPending || rejectReason.trim().length < 3}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: '#DC2626' }}
                data-testid="btn-reject">
                {rejectMut.isPending ? 'Rejecting…' : 'Reject Consignment'}
              </button>
            </div>
          )}

          <div className="pt-3" style={{ borderTop: '1px solid #E8E2DC' }}>
            <p className="text-xs font-semibold mb-2" style={{ color: '#888880' }}>Consignment summary</p>
            <KV k="Declared value" v={fmtMoney(row.askingPriceCents, row.askingCurrency ?? 'USD')} />
            <KV k="Incoterms" v={row.incoterms ?? '—'} />
            <KV k="Category" v={row.commodityCategory ?? '—'} />
            <KV k="Status updated" v={fmtDate(row.updatedAt)} />
            {existing && <KV k="Arrived at hub" v={fmtDate(existing.arrivedAt)} icon={<Truck size={12} />} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold mb-1" style={{ color: '#888880' }}>{label}</span>
      {children}
    </label>
  );
}

function KV({ k, v, icon }: { k: string; v: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="text-xs flex items-center gap-1" style={{ color: '#888880' }}>{icon}{k}</span>
      <span className="text-sm font-semibold text-right" style={{ color: '#1A1A1A' }}>{v}</span>
    </div>
  );
}

function Banner({ color, bg, icon, title, text }: { color: string; bg: string; icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-xl p-3 flex items-start gap-2" style={{ background: bg, border: `1px solid ${color}33` }}>
      <span style={{ color }}>{icon}</span>
      <div>
        <p className="text-sm font-semibold" style={{ color }}>{title}</p>
        <p className="text-xs mt-0.5" style={{ color: '#1A1A1A' }}>{text}</p>
      </div>
    </div>
  );
}
