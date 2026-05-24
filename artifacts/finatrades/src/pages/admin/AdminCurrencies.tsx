import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

interface Currency {
  isoCode: string; displayName: string; symbol: string | null; decimals: number;
  isEnabled: boolean; allowWallet: boolean; allowEscrow: boolean;
}

export default function AdminCurrencies() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [add, setAdd] = useState({ isoCode: '', displayName: '', symbol: '', decimals: 2 });

  const q = useQuery({
    queryKey: ['/api/admin/settings/currencies'],
    queryFn: async () => (await (await apiRequest('GET', '/api/admin/settings/currencies')).json()) as { currencies: Currency[] },
  });

  const upsert = useMutation({
    mutationFn: async (c: Partial<Currency> & { isoCode: string }) => (await (await apiRequest('PUT', `/api/admin/settings/currencies/${c.isoCode}`, c)).json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['/api/admin/settings/currencies'] }),
    onError: (e: any) => toast({ variant: 'destructive', title: 'Failed', description: e?.message }),
  });

  const currencies = q.data?.currencies ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>Supported Currencies</h1>
        <p className="text-sm" style={{ color: '#888880' }}>Wallet and escrow rails are gated on `allowWallet`/`allowEscrow`.</p>
      </div>

      <Card className="p-5">
        <h2 className="font-semibold mb-3">Add currency</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <Input placeholder="ISO (USD)" maxLength={3} value={add.isoCode} onChange={e => setAdd({ ...add, isoCode: e.target.value.toUpperCase() })} />
          <Input placeholder="Name" value={add.displayName} onChange={e => setAdd({ ...add, displayName: e.target.value })} />
          <Input placeholder="Symbol ($)" value={add.symbol} onChange={e => setAdd({ ...add, symbol: e.target.value })} />
          <Input type="number" placeholder="Decimals" value={add.decimals} onChange={e => setAdd({ ...add, decimals: parseInt(e.target.value || '2', 10) })} />
          <Button onClick={() => { upsert.mutate({ ...add, isEnabled: true, allowWallet: true, allowEscrow: true }); setAdd({ isoCode: '', displayName: '', symbol: '', decimals: 2 }); }}
            disabled={add.isoCode.length !== 3 || !add.displayName} style={{ background: '#C73B22', color: 'white' }}>Add</Button>
        </div>
      </Card>

      <Card className="p-5">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 px-2">ISO</th><th>Symbol</th><th>Name</th><th>Decimals</th>
              <th>Enabled</th><th>Wallet</th><th>Escrow</th>
            </tr>
          </thead>
          <tbody>
            {currencies.map(c => (
              <tr key={c.isoCode} className="border-b">
                <td className="py-2 px-2 font-mono">{c.isoCode}</td>
                <td>{c.symbol}</td>
                <td>{c.displayName}</td>
                <td>{c.decimals}</td>
                <td><input type="checkbox" checked={c.isEnabled} onChange={e => upsert.mutate({ ...c, isEnabled: e.target.checked })} /></td>
                <td><input type="checkbox" checked={c.allowWallet} onChange={e => upsert.mutate({ ...c, allowWallet: e.target.checked })} /></td>
                <td><input type="checkbox" checked={c.allowEscrow} onChange={e => upsert.mutate({ ...c, allowEscrow: e.target.checked })} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
