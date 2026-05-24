import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

interface Country {
  isoCode: string; displayName: string; flagEmoji: string | null; region: string | null;
  isEnabled: boolean; allowSignup: boolean; allowShipping: boolean;
}

export default function AdminCountries() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [add, setAdd] = useState({ isoCode: '', displayName: '', flagEmoji: '', region: '' });

  const q = useQuery({
    queryKey: ['/api/admin/settings/countries'],
    queryFn: async () => (await (await apiRequest('GET', '/api/admin/settings/countries')).json()) as { countries: Country[] },
  });

  const upsert = useMutation({
    mutationFn: async (c: Partial<Country> & { isoCode: string }) => {
      const r = await apiRequest('PUT', `/api/admin/settings/countries/${c.isoCode}`, c);
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['/api/admin/settings/countries'] }); },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Failed', description: e?.message }),
  });

  const countries = q.data?.countries ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>Supported Countries</h1>
        <p className="text-sm" style={{ color: '#888880' }}>Toggle countries on/off for signup and shipping routes.</p>
      </div>

      <Card className="p-5">
        <h2 className="font-semibold mb-3">Add country</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <Input placeholder="ISO (NG)" maxLength={2} value={add.isoCode} onChange={e => setAdd({ ...add, isoCode: e.target.value.toUpperCase() })} />
          <Input placeholder="Name" value={add.displayName} onChange={e => setAdd({ ...add, displayName: e.target.value })} />
          <Input placeholder="Flag emoji" value={add.flagEmoji} onChange={e => setAdd({ ...add, flagEmoji: e.target.value })} />
          <Input placeholder="Region" value={add.region} onChange={e => setAdd({ ...add, region: e.target.value })} />
          <Button onClick={() => { upsert.mutate({ ...add, isEnabled: true, allowSignup: true, allowShipping: true }); setAdd({ isoCode: '', displayName: '', flagEmoji: '', region: '' }); }}
            disabled={add.isoCode.length !== 2 || !add.displayName} style={{ background: '#C73B22', color: 'white' }}>Add</Button>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold mb-4">Countries ({countries.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 px-2">ISO</th><th>Flag</th><th>Name</th><th>Region</th>
                <th>Enabled</th><th>Signup</th><th>Shipping</th>
              </tr>
            </thead>
            <tbody>
              {countries.map(c => (
                <tr key={c.isoCode} className="border-b">
                  <td className="py-2 px-2 font-mono">{c.isoCode}</td>
                  <td>{c.flagEmoji}</td>
                  <td>{c.displayName}</td>
                  <td className="text-gray-500">{c.region}</td>
                  <td><input type="checkbox" checked={c.isEnabled} onChange={e => upsert.mutate({ ...c, isEnabled: e.target.checked })} /></td>
                  <td><input type="checkbox" checked={c.allowSignup} onChange={e => upsert.mutate({ ...c, allowSignup: e.target.checked })} /></td>
                  <td><input type="checkbox" checked={c.allowShipping} onChange={e => upsert.mutate({ ...c, allowShipping: e.target.checked })} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
