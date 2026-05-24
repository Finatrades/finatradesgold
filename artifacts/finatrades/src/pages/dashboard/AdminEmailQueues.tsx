import React, { useMemo, useState } from 'react';
import {
  useAdminListEmailQueues,
  useAdminRetryEmailQueueJob,
  type AdminEmailQueueFailedJob,
  type AdminEmailQueueSummary,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Mail, RefreshCw, AlertTriangle, CheckCircle2, Clock, Inbox, Loader2,
  ChevronDown, ChevronRight,
} from 'lucide-react';

const REFETCH_INTERVAL_MS = 15_000;

function Pill({ children, color, bg }: { children: React.ReactNode; color: string; bg: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px',
      borderRadius: 6, fontSize: 11, fontWeight: 700, background: bg, color,
    }}>
      {children}
    </span>
  );
}

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleString();
}

function QueueCard({
  summary,
  onRetry,
  retryingJobId,
}: {
  summary: AdminEmailQueueSummary;
  onRetry: (jobId: string) => void;
  retryingJobId: string | null;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const counts = summary.counts;
  const failed = summary.failed || [];

  return (
    <div style={{
      background: '#fff', border: '1px solid #E8E2DC', borderRadius: 12,
      padding: 20, marginBottom: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            background: 'rgba(199,59,34,0.08)', color: '#C73B22',
          }}>
            <Mail size={20} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A' }}>
              {summary.label || summary.queue}
            </div>
            <div style={{ fontSize: 11, color: '#888880', fontFamily: 'monospace' }}>
              queue: {summary.queue}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Pill color="#1D4ED8" bg="rgba(59,130,246,0.12)"><Clock size={11} /> waiting {counts.waiting}</Pill>
          <Pill color="#B45309" bg="rgba(245,158,11,0.12)"><Loader2 size={11} /> active {counts.active}</Pill>
          <Pill color="#047857" bg="rgba(16,185,129,0.12)"><CheckCircle2 size={11} /> completed {counts.completed}</Pill>
          <Pill color="#B91C1C" bg="rgba(239,68,68,0.12)"><AlertTriangle size={11} /> failed {counts.failed}</Pill>
          <Pill color="#444" bg="rgba(136,136,128,0.12)">delayed {counts.delayed}</Pill>
        </div>
      </div>

      {!summary.available && (
        <div style={{
          marginTop: 16, padding: 12, borderRadius: 8,
          background: 'rgba(245,158,11,0.08)', color: '#92400E',
          fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <AlertTriangle size={14} />
          {summary.unavailableReason || 'Queue is not available.'}
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#888880', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
          Failed jobs ({failed.length})
        </div>
        {failed.length === 0 ? (
          <div style={{
            padding: 24, textAlign: 'center', color: '#888880',
            background: '#FAFAF8', borderRadius: 8, fontSize: 13,
          }}>
            <Inbox size={20} style={{ marginBottom: 6, opacity: 0.6 }} />
            <div>No failed jobs.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {failed.map((job) => {
              const isOpen = !!expanded[job.id];
              const isRetrying = retryingJobId === job.id;
              return (
                <div key={job.id} style={{ border: '1px solid #E8E2DC', borderRadius: 8, background: '#FAFAF8' }}>
                  <div style={{ padding: 12, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A' }}>
                          {job.targetLabel || job.name}
                        </span>
                        <Pill color="#444" bg="rgba(136,136,128,0.12)">{job.kind || job.name}</Pill>
                        <Pill color="#B91C1C" bg="rgba(239,68,68,0.12)">
                          attempts {job.attemptsMade}/{job.maxAttempts}
                        </Pill>
                        <span style={{ fontSize: 11, color: '#888880' }} title={job.failedAt || ''}>
                          failed {formatWhen(job.failedAt)}
                        </span>
                      </div>
                      <div style={{
                        fontSize: 12, color: '#B91C1C', fontFamily: 'monospace',
                        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                      }}>
                        {job.failedReason}
                      </div>
                      <div style={{ fontSize: 11, color: '#888880', marginTop: 4, fontFamily: 'monospace' }}>
                        job id: {job.id}
                        {job.targetCaseId ? ` · case: ${job.targetCaseId}` : ''}
                        {job.targetDocumentId ? ` · doc: ${job.targetDocumentId}` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={() => onRetry(job.id)}
                        disabled={isRetrying || !summary.available}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '6px 12px', borderRadius: 6, border: 'none',
                          background: '#C73B22', color: '#fff', fontSize: 12, fontWeight: 700,
                          cursor: isRetrying || !summary.available ? 'not-allowed' : 'pointer',
                          opacity: isRetrying || !summary.available ? 0.6 : 1,
                        }}
                      >
                        {isRetrying ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                        {isRetrying ? 'Retrying…' : 'Retry'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpanded((p) => ({ ...p, [job.id]: !p[job.id] }))}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '4px 8px', borderRadius: 6, border: '1px solid #E8E2DC',
                          background: '#fff', color: '#444', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        {isOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                        {isOpen ? 'Hide' : 'Details'}
                      </button>
                    </div>
                  </div>
                  {isOpen && (
                    <div style={{ borderTop: '1px solid #E8E2DC', padding: 12, background: '#fff' }}>
                      {job.stacktrace && (
                        <>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#888880', marginBottom: 4 }}>Stack trace</div>
                          <pre style={{
                            fontSize: 11, fontFamily: 'monospace', color: '#444',
                            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                            background: '#FAFAF8', padding: 8, borderRadius: 6, margin: 0, marginBottom: 12,
                            maxHeight: 200, overflow: 'auto',
                          }}>{job.stacktrace}</pre>
                        </>
                      )}
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#888880', marginBottom: 4 }}>Payload</div>
                      <pre style={{
                        fontSize: 11, fontFamily: 'monospace', color: '#444',
                        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                        background: '#FAFAF8', padding: 8, borderRadius: 6, margin: 0,
                        maxHeight: 200, overflow: 'auto',
                      }}>{JSON.stringify(job.data, null, 2)}</pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminEmailQueues() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error, refetch, isFetching } = useAdminListEmailQueues({
    query: { refetchInterval: REFETCH_INTERVAL_MS, queryKey: ['/admin/email-queues'] },
  });

  const [retryingJobId, setRetryingJobId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const retryMutation = useAdminRetryEmailQueueJob({
    mutation: {
      onSuccess: () => {
        setToast({ kind: 'success', text: 'Job re-queued for another attempt.' });
        queryClient.invalidateQueries({ queryKey: ['/admin/email-queues'] });
        refetch();
      },
      onError: (err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Retry failed';
        setToast({ kind: 'error', text: msg });
      },
      onSettled: () => {
        setRetryingJobId(null);
        setTimeout(() => setToast(null), 4000);
      },
    },
  });

  const totalFailed = useMemo(
    () => (data?.queues || []).reduce((sum, q) => sum + (q.counts?.failed || 0), 0),
    [data],
  );

  const handleRetry = (queue: AdminEmailQueueSummary['queue'], jobId: string) => {
    setRetryingJobId(jobId);
    retryMutation.mutate({ queue, jobId });
  };

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1A1A1A', margin: 0 }}>
            Background Email Queues
          </h1>
          <p style={{ fontSize: 13, color: '#888880', margin: '4px 0 0' }}>
            Failed trade case email and document verification jobs. Inspect rejection reasons and manually retry sends that exhausted automatic retries.
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 8,
            border: '1px solid #E8E2DC', background: '#fff', color: '#1A1A1A',
            fontSize: 13, fontWeight: 600, cursor: isFetching ? 'wait' : 'pointer',
          }}
        >
          {isFetching ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Refresh
        </button>
      </div>

      <div style={{ marginTop: 16, marginBottom: 20, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Pill color="#B91C1C" bg="rgba(239,68,68,0.12)">
          <AlertTriangle size={11} /> {totalFailed} failed total
        </Pill>
        <Pill color="#444" bg="rgba(136,136,128,0.12)">
          Auto-refresh every {REFETCH_INTERVAL_MS / 1000}s
        </Pill>
      </div>

      {toast && (
        <div style={{
          marginBottom: 16, padding: 12, borderRadius: 8, fontSize: 13, fontWeight: 600,
          background: toast.kind === 'success' ? 'rgba(16,185,129,0.10)' : 'rgba(239,68,68,0.10)',
          color: toast.kind === 'success' ? '#047857' : '#B91C1C',
        }}>
          {toast.text}
        </div>
      )}

      {isLoading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#888880' }}>
          <Loader2 size={20} className="animate-spin" />
          <div style={{ marginTop: 8, fontSize: 13 }}>Loading queues…</div>
        </div>
      ) : isError ? (
        <div style={{ padding: 16, borderRadius: 8, background: 'rgba(239,68,68,0.10)', color: '#B91C1C', fontSize: 13 }}>
          Failed to load queues: {(error as Error)?.message || 'Unknown error'}
        </div>
      ) : (
        (data?.queues || []).map((q) => (
          <QueueCard
            key={q.queue}
            summary={q}
            onRetry={(jobId) => handleRetry(q.queue, jobId)}
            retryingJobId={retryingJobId}
          />
        ))
      )}
    </div>
  );
}
