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
import { Vault, Plus, Trash2 } from 'lucide-react';

interface EscrowConfig {
  id: string;
  currency: string;
  accountHolder: string;
  holdingBank: string;
  accountNumber: string | null;
  swiftBic: string | null;
  maxHoldPerCaseCents: number | null;
  autoReleaseTimeoutDays: number;
  requiresKyc: boolean;
  notes: string | null;
  status: string;
}

const CURRENCIES = ['USD', 'EUR', 'GBP'] as const;

interface FormState {
  currency: string; accountHolder: string; holdingBank: string;
  accountNumber: string; swiftBic: string; maxHoldPerCase: string;
  autoReleaseTimeoutDays: string; requiresKyc: boolean; notes: string;
}

const empty: FormState = {
  currency: 'USD', accountHolder: '', holdingBank: '',
  accountNumber: '', swiftBic: '', maxHoldPerCase: '',
  autoReleaseTimeoutDays: '30', requiresKyc: true, notes: '',
};

function formatLimit(cents: number | null, currency: string): string {
  if (cents === null) return 'unlimited';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(cents / 100);
  } catch {
    return `${currency} ${(cents / 100).toFixed(0)}`;
  }
}

export default function AdminEscrowConfig() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [showForm, setShowForm] = useState(false);

  const q = useQuery({
    queryKey: ['/api/admin/trade-finance/escrow-configurations'],
    queryFn: async () => {
      const r = await apiRequest('GET', '/api/admin/trade-finance/escrow-configurations');
      return (await r.json()) as { escrowConfigurations: EscrowConfig[] };
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const body: any = {
        currency: form.currency,
        accountHolder: form.accountHolder,
        holdingBank: form.holdingBank,
        accountNumber: form.accountNumber || undefined,
        swiftBic: form.swiftBic || undefined,
        maxHoldPerCaseCents: form.maxHoldPerCase
          ? Math.round(parseFloat(form.maxHoldPerCase) * 100)
          : null,
        autoReleaseTimeoutDays: parseInt(form.autoReleaseTimeoutDays || '30', 10),
        requiresKyc: form.requiresKyc,
        notes: form.notes || undefined,
      };
      const path = editId
        ? `/api/admin/trade-finance/escrow-configurations/${editId}`
        : '/api/admin/trade-finance/escrow-configurations';
      const r = await apiRequest(editId ? 'PUT' : 'POST', path, body);
      return r.json();
    },
    onSuccess: () => {
      toast({ title: editId ? 'Configuration updated' : 'Configuration created' });
      qc.invalidateQueries({ queryKey: ['/api/admin/trade-finance/escrow-configurations'] });
      setShowForm(false); setEditId(null); setForm(empty);
    },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Failed', description: e?.message }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const r = await apiRequest('DELETE', `/api/admin/trade-finance/escrow-configurations/${id}`);
      return r.json();
    },
    onSuccess: () => {
      toast({ title: 'Configuration deactivated' });
      qc.invalidateQueries({ queryKey: ['/api/admin/trade-finance/escrow-configurations'] });
    },
  });

  function openEdit(c: EscrowConfig) {
    setEditId(c.id);
    setForm({
      currency: c.currency, accountHolder: c.accountHolder, holdingBank: c.holdingBank,
      accountNumber: c.accountNumber || '', swiftBic: c.swiftBic || '',
      maxHoldPerCase: c.maxHoldPerCaseCents != null ? (c.maxHoldPerCaseCents / 100).toFixed(0) : '',
      autoReleaseTimeoutDays: String(c.autoReleaseTimeoutDays),
      requiresKyc: c.requiresKyc, notes: c.notes || '',
    });
    setShowForm(true);
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold flex items-center gap-2"><Vault size={20} /> Escrow Configuration</h1>
          <Button onClick={() => { setEditId(null); setForm(empty); setShowForm(true); }} data-testid="button-new-escrow">
            <Plus size={16} className="mr-1" /> New Currency Config
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Per-currency escrow holding account, platform-level cap per case, auto-release timeout, and
          KYC enforcement. Escrow funding refuses amounts above the cap.
        </p>

        {showForm && (
          <Card className="p-4 space-y-3" data-testid="form-escrow-config">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Currency *</Label>
                <select className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                  value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} data-testid="select-currency">
                  {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs">Account holder *</Label>
                <Input value={form.accountHolder} onChange={(e) => setForm({ ...form, accountHolder: e.target.value })} data-testid="input-holder" />
              </div>
              <div>
                <Label className="text-xs">Holding bank *</Label>
                <Input value={form.holdingBank} onChange={(e) => setForm({ ...form, holdingBank: e.target.value })} data-testid="input-bank" />
              </div>
              <div>
                <Label className="text-xs">SWIFT/BIC</Label>
                <Input value={form.swiftBic} onChange={(e) => setForm({ ...form, swiftBic: e.target.value.toUpperCase() })} data-testid="input-swift" />
              </div>
              <div>
                <Label className="text-xs">Account number</Label>
                <Input value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} data-testid="input-account-number" />
              </div>
              <div>
                <Label className="text-xs">Max hold per case (whole units; blank = unlimited)</Label>
                <Input type="number" value={form.maxHoldPerCase} onChange={(e) => setForm({ ...form, maxHoldPerCase: e.target.value })} data-testid="input-max-hold" />
              </div>
              <div>
                <Label className="text-xs">Auto-release timeout (days)</Label>
                <Input type="number" value={form.autoReleaseTimeoutDays} onChange={(e) => setForm({ ...form, autoReleaseTimeoutDays: e.target.value })} data-testid="input-timeout" />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.requiresKyc}
                    onChange={(e) => setForm({ ...form, requiresKyc: e.target.checked })}
                    data-testid="checkbox-requires-kyc" />
                  Require KYC approval to fund
                </label>
              </div>
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} data-testid="textarea-notes" />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => save.mutate()} disabled={save.isPending} data-testid="button-save">
                {save.isPending ? 'Saving…' : editId ? 'Update' : 'Create'}
              </Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setEditId(null); }}>Cancel</Button>
            </div>
          </Card>
        )}

        <div className="space-y-2">
          {(q.data?.escrowConfigurations || []).map((c) => (
            <Card key={c.id} className="p-4" data-testid={`escrow-${c.currency}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium">
                    <span className="font-mono mr-2">{c.currency}</span>
                    {c.accountHolder} · {c.holdingBank}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Max/case: {formatLimit(c.maxHoldPerCaseCents, c.currency)} · Timeout: {c.autoReleaseTimeoutDays}d · KYC: {c.requiresKyc ? 'required' : 'optional'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={c.status === 'active' ? 'default' : 'secondary'}>{c.status}</Badge>
                  <Button size="sm" variant="outline" onClick={() => openEdit(c)} data-testid={`button-edit-${c.currency}`}>Edit</Button>
                  {c.status === 'active' && (
                    <Button size="sm" variant="ghost" onClick={() => remove.mutate(c.id)} data-testid={`button-delete-${c.currency}`}>
                      <Trash2 size={14} />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
          {q.data && q.data.escrowConfigurations.length === 0 && (
            <p className="text-sm text-muted-foreground">No escrow configurations yet.</p>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
