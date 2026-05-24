import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { Link } from 'wouter';
import {
  Package, Plus, Search, ChevronRight, CheckCircle2,
  Clock, AlertCircle, Truck, Warehouse, FileText, X, ShieldAlert,
} from 'lucide-react';
import ListCommodityWizard from './ListCommodityWizard';

const STATUS_STYLE: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
  'Draft':            { bg: 'rgba(136,136,128,0.1)', color: '#888880', icon: <FileText size={12} /> },
  'Submitted':        { bg: 'rgba(59,130,246,0.1)', color: '#2563EB', icon: <Clock size={12} /> },
  'Pending Review':   { bg: 'rgba(59,130,246,0.1)', color: '#2563EB', icon: <Clock size={12} /> },
  'Under Review':     { bg: 'rgba(245,158,11,0.1)', color: '#D97706', icon: <AlertCircle size={12} /> },
  'Needs More Info':  { bg: 'rgba(245,158,11,0.12)', color: '#B45309', icon: <AlertCircle size={12} /> },
  'Approved':         { bg: 'rgba(16,185,129,0.1)', color: '#059669', icon: <CheckCircle2 size={12} /> },
  'Rejected':         { bg: 'rgba(239,68,68,0.1)', color: '#DC2626', icon: <X size={12} /> },
  'In Transit':       { bg: 'rgba(139,92,246,0.1)', color: '#7C3AED', icon: <Truck size={12} /> },
  'At Warehouse':     { bg: 'rgba(199,59,34,0.1)', color: '#C73B22', icon: <Warehouse size={12} /> },
  'Verified':         { bg: 'rgba(5,150,105,0.12)', color: '#047857', icon: <CheckCircle2 size={12} /> },
};

interface ConsignmentRow {
  id: string;
  referenceNo: string;
  commodityName: string;
  hsCode?: string | null;
  quantity: number;
  unit: string;
  qualityGrade?: string | null;
  originCountry: string;
  targetHubCode?: string | null;
  incoterms?: string | null;
  estimatedValueCents?: number | null;
  askingCurrency?: string | null;
  status: string;
  submittedAt?: string | null;
  createdAt: string;
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE['Draft'];
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
          style={{ background: s.bg, color: s.color }} data-testid={`status-${status}`}>
      {s.icon} {status}
    </span>
  );
}

function StatCard({ label, value, sub, color = '#C73B22' }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="rounded-2xl p-4 bg-white" style={{ border: '1px solid #E8E2DC' }}>
      <p className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>{value}</p>
      <p className="text-sm font-medium mt-0.5" style={{ color: '#888880' }}>{label}</p>
      {sub && <p className="text-xs mt-1 font-semibold" style={{ color }}>{sub}</p>}
    </div>
  );
}

function fmtMoney(cents: number | null | undefined, currency = 'USD'): string {
  if (cents == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(cents / 100);
}

export default function Consignments() {
  const { user } = useAuth();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const userType = (user as any)?.userType;
  const isExporter = userType === 'exporter' || (user as any)?.role === 'admin';

  const { data: eligibility } = useQuery<{ eligible: boolean; reason?: string; kycStatus?: string; kycTier?: string }>({
    queryKey: ['/api/b2b/consignments/eligibility'],
    enabled: isExporter,
  });
  const kycOk = !!eligibility?.eligible;
  const kycReason = eligibility?.reason;
  const kycTier = eligibility?.kycTier;

  const { data: rows = [], isLoading, error } = useQuery<ConsignmentRow[]>({
    queryKey: ['/api/b2b/consignments'],
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

  const counts = useMemo(() => {
    const c = { total: rows.length, submitted: 0, approved: 0, inTransit: 0 };
    for (const r of rows) {
      if (['Submitted', 'Pending Review', 'Under Review'].includes(r.status)) c.submitted++;
      if (['Approved', 'At Warehouse', 'Verified'].includes(r.status)) c.approved++;
      if (r.status === 'In Transit') c.inTransit++;
    }
    return c;
  }, [rows]);

  return (
    <div className="space-y-6" data-testid="page-consignments">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>Consignments</h1>
          <p className="text-sm mt-1" style={{ color: '#888880' }}>
            List commodities and track them from submission to warehouse verification.
          </p>
        </div>
        {isExporter && (
          <button
            onClick={() => setWizardOpen(true)}
            disabled={!kycOk}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: '#C73B22' }}
            data-testid="btn-list-commodity"
          >
            <Plus size={16} /> List a Commodity
          </button>
        )}
      </div>

      {isExporter && !kycOk && (
        <div className="rounded-xl p-4 flex items-start gap-3"
             style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}
             data-testid="kyc-gate-banner">
          <ShieldAlert size={20} style={{ color: '#B45309' }} className="mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>Corporate KYC required</p>
            <p className="text-xs mt-0.5" style={{ color: '#7A6242' }}>
              {kycReason || 'Complete Finatrades Corporate KYC to submit consignments.'}
            </p>
          </div>
          <Link href="/kyc" className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                style={{ background: '#C73B22' }}>Go to KYC</Link>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total" value={counts.total} />
        <StatCard label="In Review" value={counts.submitted} color="#2563EB" />
        <StatCard label="Approved / At Warehouse" value={counts.approved} color="#047857" />
        <StatCard label="In Transit" value={counts.inTransit} color="#7C3AED" />
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
          <div className="p-10 text-center text-sm" style={{ color: '#888880' }}>Loading consignments…</div>
        ) : error ? (
          <div className="p-10 text-center text-sm" style={{ color: '#DC2626' }}>
            Failed to load: {(error as any)?.message || 'unknown error'}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center" data-testid="empty-state">
            <Package size={36} className="mx-auto mb-2" style={{ color: '#888880' }} />
            <p className="font-semibold" style={{ color: '#1A1A1A' }}>No consignments yet</p>
            <p className="text-sm mt-1" style={{ color: '#888880' }}>
              {isExporter ? 'Click "List a Commodity" to submit your first one.' : 'Nothing to show here.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ background: '#FAFAF8' }}>
                <tr className="text-left" style={{ color: '#888880' }}>
                  <th className="px-4 py-3 font-semibold">Reference</th>
                  <th className="px-4 py-3 font-semibold">Commodity</th>
                  <th className="px-4 py-3 font-semibold">Quantity</th>
                  <th className="px-4 py-3 font-semibold">Origin → Hub</th>
                  <th className="px-4 py-3 font-semibold">Value</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className="border-t" style={{ borderColor: '#E8E2DC' }}
                      data-testid={`row-${r.referenceNo}`}>
                    <td className="px-4 py-3 font-semibold" style={{ color: '#1A1A1A' }}>{r.referenceNo}</td>
                    <td className="px-4 py-3" style={{ color: '#1A1A1A' }}>
                      {r.commodityName}
                      {r.qualityGrade && <span className="ml-1 text-xs" style={{ color: '#888880' }}>· {r.qualityGrade}</span>}
                    </td>
                    <td className="px-4 py-3" style={{ color: '#1A1A1A' }}>{r.quantity} {r.unit}</td>
                    <td className="px-4 py-3" style={{ color: '#1A1A1A' }}>
                      {r.originCountry} → {r.targetHubCode ?? '—'}
                    </td>
                    <td className="px-4 py-3" style={{ color: '#1A1A1A' }}>
                      {fmtMoney(r.estimatedValueCents, r.askingCurrency ?? 'USD')}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/consignments/${r.id}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold"
                            style={{ color: '#C73B22' }}
                            data-testid={`link-detail-${r.referenceNo}`}>
                        View <ChevronRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ListCommodityWizard open={wizardOpen} onClose={() => setWizardOpen(false)} />
    </div>
  );
}
