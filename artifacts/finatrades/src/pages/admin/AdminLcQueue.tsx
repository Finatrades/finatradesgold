import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import DashboardLayout from '@/components/DashboardLayout';

interface Lc {
  id: string;
  lcRef: string;
  status: string;
  amountCents: number;
  currency: string;
}
interface Presentation {
  id: string;
  lcId: string;
  status: string;
  documentIds: string[];
  discrepancies?: string[] | null;
  createdAt: string;
}

function money(c: number, cur: string) {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: cur }).format(c / 100);
  } catch {
    return `${cur} ${(c / 100).toFixed(2)}`;
  }
}

export default function AdminLcQueue() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [notes, setNotes] = useState<Record<string, string>>({});

  const q = useQuery({
    queryKey: ['/api/admin/lc/queue'],
    queryFn: async () => {
      const r = await apiRequest('GET', '/api/admin/lc/queue');
      return (await r.json()) as { lcs: Lc[]; pendingPresentations: Presentation[] };
    },
  });

  const decide = useMutation({
    mutationFn: async ({ lcId, presentationId, decision }: { lcId: string; presentationId: string; decision: 'approve' | 'discrepancy' | 'reject' }) => {
      const r = await apiRequest('POST', `/api/lc/${lcId}/presentations/${presentationId}/decision`, {
        decision,
        notes: notes[presentationId] || undefined,
      });
      return r.json();
    },
    onSuccess: () => {
      toast({ title: 'Decision recorded' });
      qc.invalidateQueries({ queryKey: ['/api/admin/lc/queue'] });
    },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Failed', description: e?.message }),
  });

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-semibold">LC Queue</h1>

        <section>
          <h2 className="font-semibold mb-2">Pending document presentations</h2>
          <div className="space-y-2">
            {(q.data?.pendingPresentations ?? []).map((p) => {
              const lc = q.data?.lcs.find((l) => l.id === p.lcId);
              return (
                <Card key={p.id} className="p-4" data-testid={`presentation-${p.id}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-mono">{lc?.lcRef ?? p.lcId}</div>
                      <div className="text-xs text-muted-foreground">
                        {p.documentIds.length} document(s) · presented {new Date(p.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <Badge>{p.status}</Badge>
                  </div>
                  <Textarea
                    placeholder="Decision notes / discrepancies"
                    value={notes[p.id] ?? ''}
                    onChange={(e) => setNotes((s) => ({ ...s, [p.id]: e.target.value }))}
                    className="mb-2"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => decide.mutate({ lcId: p.lcId, presentationId: p.id, decision: 'approve' })} data-testid={`button-approve-${p.id}`}>
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => decide.mutate({ lcId: p.lcId, presentationId: p.id, decision: 'discrepancy' })}>
                      Discrepancy
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => decide.mutate({ lcId: p.lcId, presentationId: p.id, decision: 'reject' })}>
                      Reject
                    </Button>
                  </div>
                </Card>
              );
            })}
            {q.data && q.data.pendingPresentations.length === 0 && (
              <p className="text-sm text-muted-foreground">No presentations awaiting review.</p>
            )}
          </div>
        </section>

        <section>
          <h2 className="font-semibold mb-2">All Letters of Credit</h2>
          <div className="space-y-1">
            {(q.data?.lcs ?? []).map((lc) => (
              <Card key={lc.id} className="p-3 flex items-center justify-between">
                <div className="font-mono text-sm">{lc.lcRef}</div>
                <div className="text-sm">{money(lc.amountCents, lc.currency)}</div>
                <Badge variant="secondary">{lc.status}</Badge>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
