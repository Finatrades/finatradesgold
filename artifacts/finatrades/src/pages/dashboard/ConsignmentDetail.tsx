import React, { useState } from 'react';
import { useRoute, Link } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, FileText, CheckCircle2, Clock, AlertCircle, X, Truck, Warehouse, Package as PackageIcon, ShieldCheck, Gavel,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/queryClient';
import { toast } from 'sonner';

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

const REVIEWABLE = new Set(['Submitted', 'Pending Review', 'Under Review', 'Needs More Info']);

export default function ConsignmentDetail() {
  const [, params] = useRoute<{ id: string }>('/consignments/:id');
  const id = params?.id;
  const { user } = useAuth();
  const isAdmin = (user as any)?.role === 'admin';

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

      {isAdmin && REVIEWABLE.has(c.status) && (
        <AdminReviewPanel consignmentId={c.id} status={c.status} />
      )}

      {c.adminNotes && (
        <div className="rounded-xl p-4" data-testid="admin-note"
             style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#B45309' }}>
            Reviewer note
          </p>
          <p className="text-sm mt-1 whitespace-pre-wrap" style={{ color: '#1A1A1A' }}>{c.adminNotes}</p>
        </div>
      )}

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

      {c.tally && (
        <Card title="Warehouse Tally" icon={<Warehouse size={16} />}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
            <div>
              <KV k="Hub" v={c.tally.hubCode} />
              <KV k="Tally Status" v={
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
                  style={{
                    background: c.tally.status === 'Verified' ? 'rgba(5,150,105,0.12)'
                              : c.tally.status === 'Rejected' ? 'rgba(239,68,68,0.1)'
                              : c.tally.status === 'Tallied'  ? 'rgba(199,59,34,0.1)'
                              : '#F0EBE6',
                    color: c.tally.status === 'Verified' ? '#047857'
                         : c.tally.status === 'Rejected' ? '#DC2626'
                         : c.tally.status === 'Tallied'  ? '#C73B22'
                         : '#888880',
                  }}>{c.tally.status}</span>
              } />
              <KV k="Arrived" v={fmtDate(c.tally.arrivedAt)} />
              <KV k="Declared" v={c.tally.declaredQuantity != null ? `${c.tally.declaredQuantity} ${c.tally.unit}` : '—'} />
              <KV k="Actual (weighed)" v={c.tally.actualQuantity != null ? `${c.tally.actualQuantity} ${c.tally.unit}` : '—'} />
              <KV k="Variance" v={
                c.tally.actualQuantity != null && c.tally.declaredQuantity != null
                  ? `${(((c.tally.actualQuantity - c.tally.declaredQuantity) / c.tally.declaredQuantity) * 100).toFixed(2)}%`
                  : '—'
              } />
            </div>
            <div>
              <KV k="Packages" v={c.tally.packageCount ?? '—'} />
              <KV k="Package Type" v={c.tally.packageType || '—'} />
              <KV k="Grade (sampled)" v={c.tally.qualityGrade || '—'} />
              <KV k="Moisture %" v={c.tally.moisturePct != null ? `${c.tally.moisturePct}%` : '—'} />
              <KV k="Verified" v={fmtDate(c.tally.verifiedAt)} />
              <KV k="Warehouse Receipt" v={c.tally.inventoryItemId ? <span className="font-mono text-xs">{c.tally.inventoryItemId}</span> : '—'} />
            </div>
          </div>
          {c.tally.sampleNotes && (
            <div className="mt-3 pt-3" style={{ borderTop: '1px solid #E8E2DC' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: '#888880' }}>Sample / inspection notes</p>
              <p className="text-sm" style={{ color: '#1A1A1A' }}>{c.tally.sampleNotes}</p>
            </div>
          )}
          {c.tally.damageNotes && (
            <div className="mt-3 pt-3" style={{ borderTop: '1px solid #E8E2DC' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: '#888880' }}>Damage / discrepancy notes</p>
              <p className="text-sm" style={{ color: '#1A1A1A' }}>{c.tally.damageNotes}</p>
            </div>
          )}
          {c.tally.status === 'Rejected' && c.tally.rejectionReason && (
            <div className="mt-3 p-3 rounded-lg"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: '#DC2626' }}>Rejection reason</p>
              <p className="text-sm" style={{ color: '#1A1A1A' }}>{c.tally.rejectionReason}</p>
            </div>
          )}
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

function DocOpenLink({ doc }: { doc: any }) {
  const [busy, setBusy] = useState(false);
  // Server returns signedUrl directly on detail; otherwise we fetch via downloadPath.
  const directUrl: string | undefined = doc.signedUrl || doc.storageUrl;
  if (directUrl) {
    return (
      <a href={directUrl} target="_blank" rel="noreferrer"
         className="text-xs font-semibold shrink-0"
         style={{ color: '#C73B22' }}
         data-testid={`doc-open-${doc.docType}`}>Open</a>
    );
  }
  if (!doc.downloadPath) return null;
  const onClick = async () => {
    try {
      setBusy(true);
      const r = await fetch(doc.downloadPath, { credentials: 'include' });
      if (!r.ok) throw new Error(`Failed to get download URL (${r.status})`);
      const json = await r.json();
      if (json?.signedUrl) window.open(json.signedUrl, '_blank', 'noreferrer');
    } catch (e: any) {
      toast.error(e?.message || 'Could not open document');
    } finally {
      setBusy(false);
    }
  };
  return (
    <button type="button" onClick={onClick} disabled={busy}
            className="text-xs font-semibold shrink-0 disabled:opacity-50"
            style={{ color: '#C73B22' }}
            data-testid={`doc-open-${doc.docType}`}>
      {busy ? 'Opening…' : 'Open'}
    </button>
  );
}

type ReviewAction = 'start_review' | 'approve' | 'reject' | 'needs_info';

function AdminReviewPanel({ consignmentId, status }: { consignmentId: string; status: string }) {
  const qc = useQueryClient();
  const [note, setNote] = useState('');
  const [pendingAction, setPendingAction] = useState<ReviewAction | null>(null);

  const mutation = useMutation({
    mutationFn: async (action: ReviewAction) => {
      const res = await apiRequest('PATCH', `/api/b2b/consignments/${consignmentId}/status`, {
        action,
        note: note.trim() || undefined,
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      toast.success(`Consignment ${data.toStatus || 'updated'}`);
      setNote('');
      setPendingAction(null);
      qc.invalidateQueries({ queryKey: [`/api/b2b/consignments/${consignmentId}`] });
      qc.invalidateQueries({ queryKey: ['/api/b2b/consignments'] });
      qc.invalidateQueries({ queryKey: ['/api/b2b/consignments?queue=review'] });
    },
    onError: (e: any) => {
      toast.error(e?.message || 'Failed to update consignment');
      setPendingAction(null);
    },
  });

  const run = (action: ReviewAction) => {
    if ((action === 'reject' || action === 'needs_info') && !note.trim()) {
      toast.error('Please provide a note explaining your decision.');
      return;
    }
    setPendingAction(action);
    mutation.mutate(action);
  };

  const isBusy = mutation.isPending;
  const showStartReview = status === 'Submitted' || status === 'Pending Review';

  return (
    <section className="rounded-2xl p-4 bg-white" style={{ border: '1.5px solid #C73B22' }}
             data-testid="admin-review-panel">
      <h3 className="text-sm font-bold mb-1 flex items-center gap-2" style={{ color: '#C73B22' }}>
        <Gavel size={16} /> Admin Review
      </h3>
      <p className="text-xs mb-3" style={{ color: '#888880' }}>
        Inspect the documents and pricing above, then transition this consignment.
        A note is required for Reject and Needs More Info.
      </p>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Reviewer note (visible to exporter; required for Reject / Needs More Info)…"
        rows={3}
        className="w-full p-3 rounded-lg text-sm mb-3"
        style={{ border: '1px solid #E8E2DC', background: '#FAFAF8', color: '#1A1A1A' }}
        data-testid="input-review-note"
      />

      <div className="flex flex-wrap gap-2">
        {showStartReview && (
          <ActionBtn
            label="Start Review"
            color="#2563EB"
            outline
            disabled={isBusy}
            loading={isBusy && pendingAction === 'start_review'}
            onClick={() => run('start_review')}
            testid="btn-start-review"
          />
        )}
        <ActionBtn
          label="Approve"
          color="#047857"
          disabled={isBusy}
          loading={isBusy && pendingAction === 'approve'}
          onClick={() => run('approve')}
          testid="btn-approve"
        />
        <ActionBtn
          label="Request More Info"
          color="#B45309"
          outline
          disabled={isBusy}
          loading={isBusy && pendingAction === 'needs_info'}
          onClick={() => run('needs_info')}
          testid="btn-needs-info"
        />
        <ActionBtn
          label="Reject"
          color="#DC2626"
          disabled={isBusy}
          loading={isBusy && pendingAction === 'reject'}
          onClick={() => run('reject')}
          testid="btn-reject"
        />
      </div>
    </section>
  );
}

function ActionBtn({
  label, color, outline, disabled, loading, onClick, testid,
}: {
  label: string; color: string; outline?: boolean; disabled?: boolean;
  loading?: boolean; onClick: () => void; testid?: string;
}) {
  const base = 'px-3.5 py-2 rounded-lg text-xs font-semibold transition disabled:opacity-50';
  const style: React.CSSProperties = outline
    ? { background: 'white', color, border: `1.5px solid ${color}` }
    : { background: color, color: 'white', border: `1.5px solid ${color}` };
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={base} style={style} data-testid={testid}>
      {loading ? 'Working…' : label}
    </button>
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
