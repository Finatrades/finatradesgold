import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

type Category = 'marketplace_commission'|'trade_finance_fee'|'wallet_deposit_fee'|'wallet_withdrawal_fee'|'fx_spread';
interface Fee {
  id: string; category: Category; scopeKey: string;
  percentBps: number; flatCents: number; currency: string;
  effectiveFrom: string; effectiveTo: string | null; notes: string | null;
}

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'marketplace_commission', label: 'Marketplace Commission' },
  { value: 'trade_finance_fee',      label: 'Trade Finance' },
  { value: 'wallet_deposit_fee',     label: 'Wallet Deposit' },
  { value: 'wallet_withdrawal_fee',  label: 'Wallet Withdrawal' },
  { value: 'fx_spread',              label: 'FX Spread' },
];

export default function AdminFees() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({ category: 'marketplace_commission' as Category, scopeKey: '*', percentBps: 250, flatCents: 0, currency: 'USD', notes: '' });

  const q = useQuery({
    queryKey: ['/api/admin/settings/fees'],
    queryFn: async () => (await (await apiRequest('GET', '/api/admin/settings/fees')).json()) as { fees: Fee[] },
  });

  const create = useMutation({
    mutationFn: async () => (await (await apiRequest('POST', '/api/admin/settings/fees', form)).json()),
    onSuccess: () => { toast({ title: 'Fee schedule saved' }); qc.invalidateQueries({ queryKey: ['/api/admin/settings/fees'] }); },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Failed', description: e?.message }),
  });

  const fees = q.data?.fees ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>Fees & Commissions</h1>
        <p className="text-sm" style={{ color: '#888880' }}>Versioned fee schedules — past entries are preserved for historical invoices.</p>
      </div>

      <Card className="p-5">
        <h2 className="font-semibold mb-4">New / update fee</h2>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
          <div className="md:col-span-2">
            <label className="text-xs font-medium block mb-1">Category</label>
            <select className="w-full h-10 px-3 rounded-lg border" value={form.category} onChange={e => setForm({ ...form, category: e.target.value as Category })}>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">Scope</label>
            <Input value={form.scopeKey} onChange={e => setForm({ ...form, scopeKey: e.target.value })} placeholder="*, USD, USD_EUR" />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">Percent (bps)</label>
            <Input type="number" value={form.percentBps} onChange={e => setForm({ ...form, percentBps: parseInt(e.target.value || '0', 10) })} />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">Flat (cents)</label>
            <Input type="number" value={form.flatCents} onChange={e => setForm({ ...form, flatCents: parseInt(e.target.value || '0', 10) })} />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">Currency</label>
            <Input value={form.currency} maxLength={3} onChange={e => setForm({ ...form, currency: e.target.value.toUpperCase() })} />
          </div>
          <div className="md:col-span-5">
            <label className="text-xs font-medium block mb-1">Notes</label>
            <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
          <Button disabled={create.isPending} onClick={() => create.mutate()} style={{ background: '#C73B22', color: 'white' }}>
            {create.isPending ? 'Saving…' : 'Save version'}
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold mb-4">All fee schedules</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 px-2">Category</th><th>Scope</th><th>Percent</th><th>Flat</th><th>Currency</th>
                <th>Effective from</th><th>Effective to</th><th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {fees.map(f => (
                <tr key={f.id} className="border-b">
                  <td className="py-2 px-2">{f.category}</td>
                  <td>{f.scopeKey}</td>
                  <td>{(f.percentBps / 100).toFixed(2)}%</td>
                  <td>{(f.flatCents / 100).toFixed(2)}</td>
                  <td>{f.currency}</td>
                  <td>{new Date(f.effectiveFrom).toLocaleString()}</td>
                  <td>{f.effectiveTo ? new Date(f.effectiveTo).toLocaleString() : '—'}</td>
                  <td className="text-gray-500">{f.notes || ''}</td>
                </tr>
              ))}
              {fees.length === 0 && <tr><td colSpan={8} className="py-6 text-center text-gray-500">No fee schedules yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
