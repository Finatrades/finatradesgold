import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useParams, useLocation } from 'wouter';
import {
  useAdminGetConsignment,
  useAdminUpdateConsignmentDocument,
  useAdminUpdateConsignmentStatus,
  getAdminGetConsignmentQueryKey,
  getAdminListConsignmentsQueryKey,
} from '@workspace/api-client-react';
import {
  ArrowLeft, FileText, CheckCircle2, XCircle, AlertTriangle,
  Download, Clock, User, Package, History, MessageSquare,
  ClipboardCheck, Camera, Scale, ShieldCheck, Loader2, ExternalLink,
} from 'lucide-react';

interface DocRow {
  id: string;
  docType: string;
  docLabel: string;
  isRequired: boolean;
  status: string;
  fileName: string | null;
  mimeType: string | null;
  signedUrl?: string | null;
  uploadedAt: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  rejectReason: string | null;
}

interface HistoryRow {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  actorId: string | null;
  actorName: string | null;
  actorRole: string | null;
  note: string | null;
  createdAt: string;
}

interface Detail {
  id: string;
  referenceNo: string;
  exporterName: string | null;
  exporterEmail: string | null;
  commodityName: string;
  commodityCategory: string | null;
  hsCode: string | null;
  quantity: number;
  unit: string;
  qualityGrade: string | null;
  originCountry: string;
  targetHubCode: string | null;
  incoterms: string | null;
  askingPriceCents: number | null;
  askingCurrency: string | null;
  estimatedValueCents: number | null;
  notes: string | null;
  adminNotes: string | null;
  reviewNotes: string | null;
  reviewedAt: string | null;
  status: string;
  submittedAt: string | null;
  createdAt: string;
  documents: DocRow[];
  history: HistoryRow[];
}

const DOC_STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  pending:           { bg: 'rgba(136,136,128,0.12)', color: '#666', label: 'Pending' },
  uploaded:          { bg: 'rgba(59,130,246,0.12)', color: '#1D4ED8', label: 'Uploaded' },
  verified:          { bg: 'rgba(16,185,129,0.12)', color: '#047857', label: 'Approved' },
  rejected:          { bg: 'rgba(239,68,68,0.12)', color: '#B91C1C', label: 'Rejected' },
  changes_requested: { bg: 'rgba(245,158,11,0.12)', color: '#B45309', label: 'Changes Requested' },
};

export default function AdminConsignmentReview() {
  const params = useParams();
  const [, navigate] = useLocation();
  const id = params.id as string;
  const qc = useQueryClient();

  const { data: rawData, isLoading } = useAdminGetConsignment(id, {
    request: { credentials: 'include' },
  });
  const data = rawData as unknown as Detail | undefined;

  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [decision, setDecision] = useState<'Approved' | 'Rejected' | 'Needs More Info' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const selectedDoc = data?.documents.find(d => d.id === selectedDocId)
    ?? data?.documents[0]
    ?? null;

  const invalidateDetail = () => {
    qc.invalidateQueries({ queryKey: getAdminGetConsignmentQueryKey(id) });
    qc.invalidateQueries({ queryKey: getAdminListConsignmentsQueryKey() });
  };

  const docAction = useAdminUpdateConsignmentDocument({
    request: { credentials: 'include' },
    mutation: {
      onSuccess: () => invalidateDetail(),
    },
  });

  const statusAction = useAdminUpdateConsignmentStatus({
    request: { credentials: 'include' },
    mutation: {
      onSuccess: () => {
        setActionError(null);
        setDecision(null);
        setReviewNotes('');
        invalidateDetail();
      },
      onError: (e: any) => setActionError(e?.message || 'Failed'),
    },
  });

  if (isLoading || !data) {
    return <div style={{ padding: 40, color: '#888' }}>Loading consignment…</div>;
  }

  const requiredDocs = data.documents.filter(d => d.isRequired);
  const allApproved = requiredDocs.length > 0 && requiredDocs.every(d => d.status === 'verified');

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1500, margin: '0 auto' }}>
      <Link href="/admin/consignments">
        <a style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#666', fontSize: 13, textDecoration: 'none', marginBottom: 16 }}>
          <ArrowLeft size={14} /> Back to queue
        </a>
      </Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, gap: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: '#1A1A1A' }}>{data.referenceNo}</h1>
            <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, background: 'rgba(199,59,34,0.1)', color: '#C73B22' }}>{data.status}</span>
          </div>
          <div style={{ color: '#666', fontSize: 13 }}>
            {data.commodityName} · {Number(data.quantity).toLocaleString()} {data.unit} · {data.originCountry}{data.targetHubCode ? ` → ${data.targetHubCode}` : ''}
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 12, color: '#666' }}>
          <div><User size={11} style={{ verticalAlign: 'middle' }} /> {data.exporterName}</div>
          <div>{data.exporterEmail}</div>
          {data.submittedAt && <div style={{ marginTop: 4 }}><Clock size={11} style={{ verticalAlign: 'middle' }} /> Submitted {new Date(data.submittedAt).toLocaleString()}</div>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr 360px', gap: 16, alignItems: 'flex-start' }}>
        {/* LEFT — document list */}
        <div style={{ background: '#FFF', border: '1px solid #E5E5E0', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', background: '#FAFAF8', borderBottom: '1px solid #E5E5E0', fontSize: 11, fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Documents ({data.documents.length})
          </div>
          {data.documents.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: '#888', fontSize: 13 }}>No documents uploaded.</div>
          )}
          {data.documents.map((d) => {
            const st = DOC_STATUS_STYLE[d.status] || DOC_STATUS_STYLE.pending;
            const active = selectedDoc?.id === d.id;
            return (
              <button
                key={d.id}
                onClick={() => setSelectedDocId(d.id)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '12px 14px', border: 0, borderBottom: '1px solid #F0F0EC',
                  background: active ? '#FFF6F4' : '#FFF', cursor: 'pointer',
                  borderLeft: active ? '3px solid #C73B22' : '3px solid transparent',
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#1A1A1A' }}>{d.docLabel}</div>
                  <span style={{ padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: st.bg, color: st.color }}>{st.label}</span>
                </div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
                  <span>{d.fileName || '(no file)'}</span>
                  {d.isRequired && <span style={{ color: '#B45309', fontWeight: 600 }}>Required</span>}
                </div>
              </button>
            );
          })}
        </div>

        {/* CENTER — document viewer + actions */}
        <div style={{ background: '#FFF', border: '1px solid #E5E5E0', borderRadius: 10, padding: 16 }}>
          {selectedDoc ? (
            <DocReviewer
              doc={selectedDoc}
              onAct={(action, payload) => docAction.mutate({ id, docId: selectedDoc.id, data: { action, ...payload } })}
              pending={docAction.isPending}
            />
          ) : (
            <div style={{ color: '#888', textAlign: 'center', padding: 40 }}>Select a document to review.</div>
          )}

          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #F0F0EC' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, color: '#1A1A1A' }}>Consignment notes</h3>
            <div style={{ fontSize: 13, color: '#444', whiteSpace: 'pre-wrap' }}>{data.notes || '—'}</div>
            {data.commodityCategory && (
              <div style={{ marginTop: 12, fontSize: 12, color: '#666' }}>
                <strong>Category:</strong> {data.commodityCategory}{data.hsCode ? ` · HS ${data.hsCode}` : ''}
                {data.qualityGrade ? ` · Grade ${data.qualityGrade}` : ''}
                {data.incoterms ? ` · ${data.incoterms}` : ''}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — decision + history */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: '#FFF', border: '1px solid #E5E5E0', borderRadius: 10, padding: 16 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A', marginTop: 0, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Decision</h3>

            <div style={{ fontSize: 12, color: '#666', marginBottom: 10 }}>
              <div>{requiredDocs.filter(d => d.status === 'verified').length} / {requiredDocs.length} required docs approved</div>
              {!allApproved && data.status !== 'Under Review' && (
                <div style={{ marginTop: 4, color: '#B45309' }}>Move to "Under Review" while you triage.</div>
              )}
            </div>

            {data.status !== 'Under Review' && data.status !== 'Approved' && data.status !== 'Rejected' && (
              <button
                onClick={() => statusAction.mutate({ id, data: { status: 'Under Review' } })}
                disabled={statusAction.isPending}
                style={btnSecondary}>
                Start Review
              </button>
            )}

            <textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Reviewer notes (required for reject / needs info)…"
              rows={4}
              style={{ width: '100%', padding: 8, fontSize: 13, border: '1px solid #DDD', borderRadius: 6, marginTop: 10, marginBottom: 8, fontFamily: 'inherit', resize: 'vertical' }}
            />

            {actionError && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C', padding: 8, borderRadius: 6, fontSize: 12, marginBottom: 8 }}>{actionError}</div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button
                onClick={() => statusAction.mutate({ id, data: { status: 'Approved', note: reviewNotes || undefined } })}
                disabled={statusAction.isPending || !allApproved}
                title={!allApproved ? 'All required documents must be approved first' : ''}
                style={{ ...btnPrimary, opacity: (!allApproved || statusAction.isPending) ? 0.5 : 1, cursor: (!allApproved || statusAction.isPending) ? 'not-allowed' : 'pointer' }}>
                <CheckCircle2 size={14} /> Approve Documents
              </button>
              <button
                onClick={() => {
                  if (!reviewNotes.trim()) { setActionError('Notes are required for "Needs More Info".'); return; }
                  statusAction.mutate({ id, data: { status: 'Needs More Info', note: reviewNotes } });
                }}
                disabled={statusAction.isPending}
                style={btnWarn}>
                <AlertTriangle size={14} /> Needs More Info
              </button>
              <button
                onClick={() => {
                  if (!reviewNotes.trim()) { setActionError('Notes are required for "Reject".'); return; }
                  statusAction.mutate({ id, data: { status: 'Rejected', note: reviewNotes } });
                }}
                disabled={statusAction.isPending}
                style={btnDanger}>
                <XCircle size={14} /> Reject
              </button>
            </div>
          </div>

          <TallyPanel
            consignmentId={data.id}
            consignmentStatus={data.status}
            declaredQuantity={data.quantity}
            unit={data.unit}
            qualityGrade={data.qualityGrade}
            onTallyComplete={invalidateDetail}
          />

          <div style={{ background: '#FFF', border: '1px solid #E5E5E0', borderRadius: 10, padding: 16 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A', marginTop: 0, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 6 }}>
              <History size={13} /> Audit Trail
            </h3>
            {data.history.length === 0 ? (
              <div style={{ color: '#888', fontSize: 12 }}>No status changes yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {data.history.map((h) => (
                  <div key={h.id} style={{ borderLeft: '2px solid #E5E5E0', paddingLeft: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#1A1A1A' }}>
                      {h.fromStatus ? `${h.fromStatus} → ` : ''}<span style={{ color: '#C73B22' }}>{h.toStatus}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#888' }}>
                      {new Date(h.createdAt).toLocaleString()}
                      {h.actorName && (
                        <> · by <span style={{ color: '#1A1A1A', fontWeight: 600 }}>{h.actorName}</span>{h.actorRole ? ` (${h.actorRole})` : ''}</>
                      )}
                    </div>
                    {h.note && (
                      <div style={{ fontSize: 12, color: '#444', marginTop: 4, background: '#FAFAF8', padding: 6, borderRadius: 4, display: 'flex', gap: 6 }}>
                        <MessageSquare size={11} style={{ flexShrink: 0, marginTop: 2, color: '#888' }} />
                        <span>{h.note}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DocReviewer({ doc, onAct, pending }: {
  doc: DocRow;
  onAct: (action: 'approve' | 'reject' | 'request_replacement', payload: { notes?: string; reason?: string }) => void;
  pending: boolean;
}) {
  const [notes, setNotes] = useState('');
  const isPdf = (doc.mimeType || '').includes('pdf') || (doc.fileName || '').toLowerCase().endsWith('.pdf');
  const isImage = (doc.mimeType || '').startsWith('image/');

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1A1A1A' }}>{doc.docLabel}</h2>
          <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{doc.fileName} · {doc.docType}</div>
        </div>
        {doc.signedUrl && (
          <a href={doc.signedUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 10px', border: '1px solid #DDD', borderRadius: 6, fontSize: 12, color: '#1A1A1A', textDecoration: 'none' }}>
            <Download size={12} /> Open
          </a>
        )}
      </div>

      <div style={{ background: '#FAFAF8', border: '1px solid #E5E5E0', borderRadius: 8, height: 480, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {!doc.signedUrl ? (
          <div style={{ color: '#888', fontSize: 13 }}>
            <FileText size={32} style={{ opacity: 0.3, display: 'block', margin: '0 auto 8px' }} />
            No preview available
          </div>
        ) : isPdf ? (
          <iframe src={doc.signedUrl} title={doc.docLabel} style={{ width: '100%', height: '100%', border: 0 }} />
        ) : isImage ? (
          <img src={doc.signedUrl} alt={doc.docLabel} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        ) : (
          <div style={{ color: '#888', fontSize: 13 }}>Preview unavailable — use Open to download.</div>
        )}
      </div>

      {(doc.reviewNotes || doc.rejectReason) && (
        <div style={{ marginTop: 12, fontSize: 12, padding: 10, background: '#FAFAF8', borderRadius: 6, color: '#444' }}>
          <strong>Last reviewer note:</strong> {doc.rejectReason || doc.reviewNotes}
        </div>
      )}

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        placeholder="Note for this document (required for reject)…"
        style={{ width: '100%', padding: 8, fontSize: 13, border: '1px solid #DDD', borderRadius: 6, marginTop: 12, fontFamily: 'inherit', resize: 'vertical' }}
      />

      <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
        <button onClick={() => onAct('approve', { notes })} disabled={pending} style={btnPrimary}>
          <CheckCircle2 size={13} /> Approve doc
        </button>
        <button onClick={() => {
          if (!notes.trim()) return alert('Please add a reason.');
          onAct('request_replacement', { notes, reason: notes });
        }} disabled={pending} style={btnWarn}>
          <AlertTriangle size={13} /> Request Replacement
        </button>
        <button onClick={() => {
          if (!notes.trim()) return alert('Please add a reason.');
          onAct('reject', { notes, reason: notes });
        }} disabled={pending} style={btnDanger}>
          <XCircle size={13} /> Reject doc
        </button>
      </div>
    </div>
  );
}

function TallyPanel({
  consignmentId, consignmentStatus, declaredQuantity, unit, qualityGrade, onTallyComplete,
}: {
  consignmentId: string;
  consignmentStatus: string;
  declaredQuantity: number;
  unit: string;
  qualityGrade: string | null;
  onTallyComplete: () => void;
}) {
  const [inspectorName, setInspectorName] = useState('');
  const [actualQuantity, setActualQuantity] = useState<string>(String(declaredQuantity));
  const [actualGrade, setActualGrade] = useState<string>(qualityGrade || '');
  const [moisturePct, setMoisturePct] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [weighbridge, setWeighbridge] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<null | { wrNumber: string; pdfStatus: string; verificationUrl: string }>(null);
  const [downloading, setDownloading] = useState(false);
  const [pdfReady, setPdfReady] = useState(false);

  const tallyEligible =
    consignmentStatus === 'Approved' ||
    consignmentStatus === 'At Warehouse' ||
    consignmentStatus === 'In Transit';

  const alreadyDone = consignmentStatus === 'Physically Verified' || consignmentStatus === 'Listed';

  const variance = (() => {
    const q = Number(actualQuantity);
    if (!q || !declaredQuantity) return null;
    return Math.round(((q - declaredQuantity) / declaredQuantity) * 100 * 100) / 100;
  })();

  // Poll for PDF readiness after issue
  React.useEffect(() => {
    if (!result || pdfReady) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch(`/api/admin/consignments/${consignmentId}/warehouse-receipt/url`, {
          credentials: 'include',
        });
        if (res.ok && !cancelled) { setPdfReady(true); return; }
      } catch {}
      if (!cancelled) setTimeout(tick, 3000);
    };
    const t = setTimeout(tick, 2000);
    return () => { cancelled = true; clearTimeout(t); };
  }, [result, pdfReady, consignmentId]);

  const downloadWr = async () => {
    setDownloading(true);
    try {
      const r = await fetch(`/api/admin/consignments/${consignmentId}/warehouse-receipt/url`, {
        credentials: 'include',
      });
      const body = await r.json();
      if (!r.ok) throw new Error(body.message || `HTTP ${r.status}`);
      window.open(body.signedUrl, '_blank', 'noopener');
    } catch (e: any) {
      alert(`Failed: ${e?.message || 'unknown'}`);
    } finally {
      setDownloading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectorName.trim()) { setErr('Inspector name is required.'); return; }
    if (!actualQuantity || Number(actualQuantity) <= 0) { setErr('Actual quantity must be positive.'); return; }
    if (photoFiles.length === 0) { setErr('At least one tally photo is required.'); return; }

    setSubmitting(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.append('inspectorName', inspectorName);
      fd.append('actualQuantity', actualQuantity);
      if (actualGrade) fd.append('actualGrade', actualGrade);
      if (moisturePct) fd.append('moisturePct', moisturePct);
      if (notes) fd.append('notes', notes);
      if (weighbridge) fd.append('weighbridge_slip', weighbridge);
      photoFiles.forEach((f, i) => fd.append(`photo_${i}`, f));

      const res = await fetch(`/api/admin/consignments/${consignmentId}/tally`, {
        method: 'POST',
        credentials: 'include',
        body: fd,
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || `HTTP ${res.status}`);
      setResult({
        wrNumber: body.warehouseReceipt.wrNumber,
        pdfStatus: body.warehouseReceipt.pdfStatus,
        verificationUrl: body.warehouseReceipt.verificationUrl,
      });
      onTallyComplete();
    } catch (e: any) {
      setErr(e?.message || 'Failed to submit tally');
    } finally {
      setSubmitting(false);
    }
  };

  if (alreadyDone && !result) {
    return (
      <div style={{ background: '#FFF', border: '1px solid #E5E5E0', borderRadius: 10, padding: 16 }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A', marginTop: 0, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 6 }}>
          <ShieldCheck size={13} /> Warehouse Receipt
        </h3>
        <div style={{ fontSize: 12, color: '#888', marginBottom: 10 }}>
          A physical tally has been recorded and a Warehouse Receipt has been issued.
        </div>
        <button
          onClick={downloadWr}
          disabled={downloading}
          data-testid="btn-download-wr-admin"
          style={{ ...btnBase, background: '#1A1A1A', color: '#FFF' }}
        >
          {downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
          Download Warehouse Receipt PDF
        </button>
      </div>
    );
  }

  if (!tallyEligible) {
    return (
      <div style={{ background: '#FFF', border: '1px dashed #E5E5E0', borderRadius: 10, padding: 16 }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: '#888', marginTop: 0, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 6 }}>
          <ClipboardCheck size={13} /> Physical Tally
        </h3>
        <div style={{ fontSize: 12, color: '#888' }}>
          Tally form unlocks once consignment documents are approved. Current status: <strong>{consignmentStatus}</strong>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div style={{ background: 'rgba(5,150,105,0.04)', border: '1px solid #10B981', borderRadius: 10, padding: 16 }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: '#047857', marginTop: 0, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 6 }}>
          <CheckCircle2 size={13} /> Warehouse Receipt Issued
        </h3>
        <div style={{ fontSize: 13, color: '#1A1A1A', fontWeight: 700, fontFamily: 'monospace', marginBottom: 4 }}>
          {result.wrNumber}
        </div>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 10 }}>
          PDF generation: <strong>{pdfReady ? 'ready' : 'in progress…'}</strong>. Exporter has been notified by email.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button
            onClick={downloadWr}
            disabled={!pdfReady || downloading}
            data-testid="btn-download-wr-fresh"
            style={{ ...btnBase, background: '#1A1A1A', color: '#FFF', opacity: (!pdfReady || downloading) ? 0.5 : 1 }}
          >
            {downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            {pdfReady ? 'Download Warehouse Receipt PDF' : 'PDF generating…'}
          </button>
          <a
            href={result.verificationUrl}
            target="_blank"
            rel="noreferrer"
            data-testid="link-verify-fresh"
            style={{ ...btnBase, background: '#FAFAF8', color: '#1A1A1A', border: '1px solid #DDD', textDecoration: 'none' }}
          >
            <ExternalLink size={13} /> Public verification URL
          </a>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} style={{ background: '#FFF', border: '1px solid #E5E5E0', borderRadius: 10, padding: 16 }} data-testid="tally-form">
      <h3 style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A', marginTop: 0, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 6 }}>
        <ClipboardCheck size={13} /> Record Physical Tally
      </h3>
      <div style={{ fontSize: 11, color: '#888', marginBottom: 12 }}>
        Submitting issues an Electronic Warehouse Receipt and transitions status to <strong>Listed</strong>.
      </div>

      <Field label="Inspector name *">
        <input
          required
          value={inspectorName}
          onChange={(e) => setInspectorName(e.target.value)}
          data-testid="input-inspector"
          style={inputStyle}
        />
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <Field label={`Actual quantity (${unit}) *`}>
          <input
            required
            type="number"
            step="0.001"
            min="0"
            value={actualQuantity}
            onChange={(e) => setActualQuantity(e.target.value)}
            data-testid="input-actual-qty"
            style={inputStyle}
          />
        </Field>
        <Field label={`Declared (${unit})`}>
          <input value={String(declaredQuantity)} readOnly style={{ ...inputStyle, background: '#FAFAF8', color: '#888' }} />
        </Field>
      </div>

      {variance != null && (
        <div style={{
          fontSize: 11, marginBottom: 10, padding: 6, borderRadius: 4,
          background: Math.abs(variance) > 5 ? 'rgba(217,119,6,0.1)' : 'rgba(5,150,105,0.08)',
          color: Math.abs(variance) > 5 ? '#B45309' : '#047857',
        }}>
          Variance: <strong>{variance > 0 ? '+' : ''}{variance}%</strong>
          {Math.abs(variance) > 5 ? ' — exceeds 5% tolerance, please confirm before submit.' : ''}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <Field label="Actual grade">
          <input value={actualGrade} onChange={(e) => setActualGrade(e.target.value)} placeholder="e.g. A, B+" style={inputStyle} data-testid="input-grade" />
        </Field>
        <Field label="Moisture %">
          <input type="number" step="0.01" min="0" max="100" value={moisturePct} onChange={(e) => setMoisturePct(e.target.value)} style={inputStyle} data-testid="input-moisture" />
        </Field>
      </div>

      <Field label={<><Camera size={11} style={{ display: 'inline', marginRight: 4 }} />Tally photos * (multiple allowed)</>}>
        <input
          type="file"
          accept="image/*"
          multiple
          required
          onChange={(e) => setPhotoFiles(Array.from(e.target.files || []))}
          data-testid="input-photos"
          style={{ ...inputStyle, padding: 6 }}
        />
        {photoFiles.length > 0 && (
          <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>{photoFiles.length} file(s) selected</div>
        )}
      </Field>

      <Field label={<><Scale size={11} style={{ display: 'inline', marginRight: 4 }} />Weighbridge slip (optional)</>}>
        <input
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => setWeighbridge(e.target.files?.[0] || null)}
          data-testid="input-weighbridge"
          style={{ ...inputStyle, padding: 6 }}
        />
      </Field>

      <Field label="Inspector notes">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          data-testid="input-notes"
          style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }}
        />
      </Field>

      {err && (
        <div style={{ fontSize: 12, color: '#B91C1C', marginBottom: 10, padding: 8, background: 'rgba(220,38,38,0.06)', borderRadius: 4 }}>
          {err}
        </div>
      )}

      <button type="submit" disabled={submitting} data-testid="btn-submit-tally"
              style={{ ...btnBase, background: '#C73B22', color: '#FFF', opacity: submitting ? 0.5 : 1 }}>
        {submitting ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
        Submit tally & issue Warehouse Receipt
      </button>
    </form>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: 8, fontSize: 13, border: '1px solid #DDD',
  borderRadius: 6, marginBottom: 10, outline: 'none', fontFamily: 'inherit',
};

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', marginBottom: 4 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
        {label}
      </div>
      {children}
    </label>
  );
}

const btnBase: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  padding: '9px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600,
  border: 0, cursor: 'pointer', width: '100%',
};
const btnPrimary: React.CSSProperties = { ...btnBase, background: '#047857', color: '#FFF' };
const btnWarn: React.CSSProperties = { ...btnBase, background: '#D97706', color: '#FFF' };
const btnDanger: React.CSSProperties = { ...btnBase, background: '#B91C1C', color: '#FFF' };
const btnSecondary: React.CSSProperties = { ...btnBase, background: '#FAFAF8', color: '#1A1A1A', border: '1px solid #DDD', marginBottom: 10 };
