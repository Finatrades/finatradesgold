import React from 'react';
import { useRoute, Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, FileText, CheckCircle2, Clock, AlertCircle, X, Truck, Warehouse, Package as PackageIcon, ShieldCheck,
} from 'lucide-react';

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

const DOC_STATUS: Record<string, { color: string; label: string }> = {
  pending:            { color: '#888880', label: 'Pending upload' },
  uploaded:           { color: '#2563EB', label: 'Uploaded' },
  verified:           { color: '#047857', label: 'Verified' },
  rejected:           { color: '#DC2626', label: 'Rejected' },
  changes_requested:  { color: '#B45309', label: 'Changes requested' },
};

function fmtMoney(cents: number | null | undefined, currency = 'USD'): string {
  if (cents == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(cents / 100);
}

function fmtDate(s: string | null | undefined): string {
  if (!s) return '—';
  try { return new Date(s).toLocaleString(); } catch { return s; }
}

export default function ConsignmentDetail() {
  const [, params] = useRoute<{ id: string }>('/consignments/:id');
  const id = params?.id;

  const { data, isLoading, error } = useQuery<any>({
    queryKey: [`/api/b2b/consignments/${id}`],
    enabled: !!id,
  });

  if (!id) return null;

  if (isLoading) {
    return <div className="p-10 text-center text-sm" style={{ color: '#888880' }}>Loading consignment…</div>;
  }

  if (error) {
    return (
      <div className="p-10 text-center text-sm" style={{ color: '#DC2626' }}>
        Failed to load: {(error as any)?.message || 'unknown error'}
      </div>
    );
  }

  const c = data;
  const status = STATUS_STYLE[c?.status] || STATUS_STYLE['Draft'];

  return (
    <div className="space-y-6" data-testid="page-consignment-detail">
      <div>
        <Link href="/consignments" className="inline-flex items-center gap-1 text-xs font-semibold mb-2"
              style={{ color: '#888880' }} data-testid="link-back">
          <ArrowLeft size={14} /> Back to Consignments
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>{c.referenceNo}</h1>
            <p className="text-sm mt-1" style={{ color: '#888880' }}>
              {c.commodityName} · {c.quantity} {c.unit} · {c.originCountry} → {c.targetHubCode}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold"
                style={{ background: status.bg, color: status.color }} data-testid="status-badge">
            {status.icon} {c.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="Commodity" icon={<PackageIcon size={16} />}>
          <KV k="Commodity" v={c.commodityName} />
          <KV k="HS Code" v={c.hsCode || '—'} />
          <KV k="Category" v={c.commodityCategory || '—'} />
          <KV k="Quality Grade" v={c.qualityGrade || '—'} />
          <KV k="Quantity" v={`${c.quantity} ${c.unit}`} />
          <KV k="Batch" v={c.batchNumber || '—'} />
          <KV k="Harvest Date" v={c.harvestDate ? new Date(c.harvestDate).toLocaleDateString() : '—'} />
        </Card>

        <Card title="Logistics & Pricing" icon={<Truck size={16} />}>
          <KV k="Origin" v={c.originCountry} />
          <KV k="Target Hub" v={c.targetHubCode || '—'} />
          <KV k="Incoterms" v={c.incoterms || '—'} />
          <KV k="Packing" v={c.packingType || '—'} />
          <KV k="Asking Price" v={fmtMoney(c.askingPriceCents, c.askingCurrency ?? 'USD')} />
          <KV k="Estimated Value" v={fmtMoney(c.estimatedValueCents, c.askingCurrency ?? 'USD')} />
        </Card>

        <Card title="Timeline" icon={<Clock size={16} />}>
          <KV k="Submitted" v={fmtDate(c.submittedAt)} />
          <KV k="Created" v={fmtDate(c.createdAt)} />
          <KV k="Last Update" v={fmtDate(c.updatedAt)} />
          <KV k="Approved" v={fmtDate(c.approvedAt)} />
        </Card>
      </div>

      {(c.reviewNotes || c.reviewedAt) && (
        <Card title="Reviewer Notes" icon={<ShieldCheck size={16} />}>
          {c.reviewNotes ? (
            <p className="text-sm whitespace-pre-wrap" style={{ color: '#1A1A1A' }}>{c.reviewNotes}</p>
          ) : (
            <p className="text-sm" style={{ color: '#888880' }}>No notes from reviewer.</p>
          )}
          {c.reviewedAt && (
            <p className="text-xs mt-2" style={{ color: '#888880' }}>Reviewed {fmtDate(c.reviewedAt)}</p>
          )}
        </Card>
      )}

      <Card title={`Documents (${c.documents?.length ?? 0})`} icon={<FileText size={16} />}>
        {c.documents?.length ? (
          <div className="space-y-2">
            {c.documents.map((d: any) => {
              const ds = DOC_STATUS[d.status] || DOC_STATUS.pending;
              return (
                <div key={d.id} className="p-3 rounded-xl"
                     style={{ border: '1px solid #E8E2DC', background: '#FAFAF8' }}
                     data-testid={`doc-row-${d.docType}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: '#1A1A1A' }}>
                        {d.docLabel || d.docType} {d.isRequired && <span style={{ color: '#C73B22' }}>*</span>}
                      </p>
                      <p className="text-xs truncate" style={{ color: '#888880' }}>
                        {d.fileName || '—'} {d.fileSize ? `· ${Math.round(d.fileSize / 1024)} KB` : ''}
                      </p>
                    </div>
                    <span className="text-xs font-semibold shrink-0" style={{ color: ds.color }}>{ds.label}</span>
                    {d.downloadPath && (
                      <a href={d.downloadPath} target="_blank" rel="noreferrer"
                         className="text-xs font-semibold shrink-0"
                         style={{ color: '#C73B22' }}>Open</a>
                    )}
                  </div>
                  {(d.rejectReason || d.reviewNotes) && (
                    <div className="mt-2 p-2 rounded-md text-xs" style={{ background: '#FFF7ED', border: '1px solid #FED7AA', color: '#9A3412' }}>
                      {d.rejectReason && <div><strong>Reason:</strong> {d.rejectReason}</div>}
                      {d.reviewNotes && <div className="mt-1">{d.reviewNotes}</div>}
                      {d.reviewedAt && <div className="mt-1 opacity-70">Reviewed {fmtDate(d.reviewedAt)}</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm" style={{ color: '#888880' }}>No documents yet.</p>
        )}
      </Card>

      {c.complianceDeclarations && Object.keys(c.complianceDeclarations).length > 0 && (
        <Card title="Compliance Declarations" icon={<ShieldCheck size={16} />}>
          <ul className="space-y-1">
            {Object.entries(c.complianceDeclarations).map(([k, v]) => (
              <li key={k} className="text-sm flex items-center gap-2" style={{ color: '#1A1A1A' }}>
                {v ? <CheckCircle2 size={14} style={{ color: '#047857' }} /> : <X size={14} style={{ color: '#DC2626' }} />}
                <span className="text-xs">{k}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card title={`Status History (${c.history?.length ?? 0})`} icon={<Clock size={16} />}>
        {c.history?.length ? (
          <div className="space-y-2">
            {c.history.map((h: any) => (
              <div key={h.id} className="flex items-center justify-between gap-3 p-2.5 rounded-lg"
                   style={{ background: '#FAFAF8', border: '1px solid #E8E2DC' }}>
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>
                    {h.fromStatus ? `${h.fromStatus} → ${h.toStatus}` : h.toStatus}
                  </p>
                  {h.actorName && (
                    <p className="text-xs mt-0.5" style={{ color: '#888880' }}>
                      by <span style={{ color: '#1A1A1A', fontWeight: 600 }}>{h.actorName}</span>
                      {h.actorRole ? ` (${h.actorRole})` : ''}
                    </p>
                  )}
                  {h.note && <p className="text-xs mt-0.5" style={{ color: '#888880' }}>{h.note}</p>}
                </div>
                <span className="text-xs" style={{ color: '#888880' }}>{fmtDate(h.createdAt)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm" style={{ color: '#888880' }}>No history yet.</p>
        )}
      </Card>
    </div>
  );
}

function Card({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl p-4 bg-white" style={{ border: '1px solid #E8E2DC' }}>
      <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: '#1A1A1A' }}>
        {icon} {title}
      </h3>
      {children}
    </section>
  );
}

function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="text-xs" style={{ color: '#888880' }}>{k}</span>
      <span className="text-sm font-semibold text-right" style={{ color: '#1A1A1A' }}>{v}</span>
    </div>
  );
}
