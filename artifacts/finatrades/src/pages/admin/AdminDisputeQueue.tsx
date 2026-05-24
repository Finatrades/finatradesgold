import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import DashboardLayout from '@/components/DashboardLayout';

type Decision = 'release_to_seller' | 'refund_to_buyer' | 'split';

interface Dispute {
  id: string;
  disputeRefId: string;
  status: string;
  subject: string;
  description: string;
  currency: string | null;
  tradeCaseId: string | null;
  decision: Decision | null;
  splitBps: number | null;
  decisionNotes: string | null;
  importerAllocationCents: number | null;
  exporterAllocationCents: number | null;
  createdAt: string;
}

interface FormState {
  decision: Decision;
  splitBps: string; // basis points to the exporter (0..10000)
  decisionNotes: string;
}

function formatCents(cents: number | null | undefined, currency: string | null): string {
  if (cents === null || cents === undefined) return '—';
  const cur = currency || 'USD';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: cur }).format(cents / 100);
  } catch {
    return `${cur} ${(cents / 100).toFixed(2)}`;
  }
}

export default function AdminDisputeQueue() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [forms, setForms] = useState<Record<string, FormState>>({});

  const q = useQuery({
    queryKey: ['/api/admin/disputes/queue'],
    queryFn: async () => {
      const r = await apiRequest('GET', '/api/admin/disputes/queue');
      return (await r.json()) as { disputes: Dispute[] };
    },
  });

  const decide = useMutation({
    mutationFn: async ({ id, form }: { id: string; form: FormState }) => {
      const body: Record<string, unknown> = {
        decision: form.decision,
        decisionNotes: form.decisionNotes || undefined,
      };
      if (form.decision === 'split') {
        const bps = parseInt(form.splitBps || '0', 10);
        if (Number.isNaN(bps) || bps < 0 || bps > 10_000) {
          throw new Error('Split must be between 0 and 10000 basis points (0–100%).');
        }
        body.splitBps = bps;
      }
      const r = await apiRequest('POST', `/api/dispute/${id}/decision`, body);
      return r.json();
    },
    onSuccess: () => {
      toast({ title: 'Tribunal decision recorded', description: 'Escrow disbursed per decision.' });
      qc.invalidateQueries({ queryKey: ['/api/admin/disputes/queue'] });
    },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Failed', description: e?.message }),
  });

  function getForm(id: string): FormState {
    return forms[id] ?? { decision: 'split', splitBps: '5000', decisionNotes: '' };
  }
  function setForm(id: string, partial: Partial<FormState>) {
    setForms((s) => ({ ...s, [id]: { ...getForm(id), ...partial } }));
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Dispute Tribunal</h1>
        {(q.data?.disputes ?? []).map((d) => {
          const form = getForm(d.id);
          return (
            <Card key={d.id} className="p-4" data-testid={`dispute-${d.disputeRefId}`}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="font-mono">{d.disputeRefId}</div>
                  <div className="text-sm font-medium">{d.subject}</div>
                  <div className="text-xs text-muted-foreground">{new Date(d.createdAt).toLocaleString()}</div>
                </div>
                <Badge>{d.status}</Badge>
              </div>
              <p className="text-sm mb-3">{d.description}</p>
              {d.status !== 'Resolved' && d.tradeCaseId && (
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs">Decision</Label>
                    <select
                      className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                      value={form.decision}
                      onChange={(e) => setForm(d.id, { decision: e.target.value as Decision })}
                      data-testid={`select-decision-${d.disputeRefId}`}
                    >
                      <option value="release_to_seller">Release to seller (exporter wins)</option>
                      <option value="refund_to_buyer">Refund to buyer (importer wins)</option>
                      <option value="split">Split escrow</option>
                    </select>
                  </div>
                  {form.decision === 'split' && (
                    <div>
                      <Label className="text-xs">Exporter share (basis points, 0–10000)</Label>
                      <Input
                        value={form.splitBps}
                        onChange={(e) => setForm(d.id, { splitBps: e.target.value })}
                        placeholder="5000 = 50%"
                        data-testid={`input-split-bps-${d.disputeRefId}`}
                      />
                      <div className="text-[11px] text-muted-foreground">
                        Importer receives the remainder of the escrow.
                      </div>
                    </div>
                  )}
                  <div>
                    <Label className="text-xs">Decision notes (optional)</Label>
                    <Textarea
                      placeholder="Tribunal reasoning"
                      value={form.decisionNotes}
                      onChange={(e) => setForm(d.id, { decisionNotes: e.target.value })}
                      data-testid={`textarea-decision-notes-${d.disputeRefId}`}
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={() => decide.mutate({ id: d.id, form })}
                    disabled={decide.isPending}
                    data-testid={`button-resolve-${d.disputeRefId}`}
                  >
                    {decide.isPending ? 'Resolving…' : 'Record decision'}
                  </Button>
                </div>
              )}
              {d.status === 'Resolved' && (
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>
                    Resolved · decision: <span className="font-medium">{d.decision ?? 'unknown'}</span>
                    {d.decision === 'split' && d.splitBps !== null
                      ? ` (${(d.splitBps / 100).toFixed(2)}% to exporter)`
                      : ''}
                  </div>
                  <div>
                    Importer refund: {formatCents(d.importerAllocationCents, d.currency)} · Exporter payout:{' '}
                    {formatCents(d.exporterAllocationCents, d.currency)}
                  </div>
                  {d.decisionNotes && <div>Notes: {d.decisionNotes}</div>}
                </div>
              )}
            </Card>
          );
        })}
        {q.data && q.data.disputes.length === 0 && (
          <p className="text-sm text-muted-foreground">No disputes in queue.</p>
        )}
      </div>
    </DashboardLayout>
  );
}
