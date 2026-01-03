import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { DollarSign, RefreshCw, TrendingUp, TrendingDown, Settings, Plus, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { apiRequest } from '@/lib/queryClient';
import { format, formatDistanceToNow } from 'date-fns';

interface ExchangeRate {
  id: string;
  baseCurrency: string;
  targetCurrency: string;
  rate: number;
  buySpread: number;
  sellSpread: number;
  effectiveBuyRate: number;
  effectiveSellRate: number;
  isActive: boolean;
  autoUpdate: boolean;
  lastUpdated: string;
  source: string;
}

export default function CurrencyExchange() {
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [selected, setSelected] = useState<ExchangeRate | null>(null);
  const [editForm, setEditForm] = useState({ rate: 0, buySpread: 0, sellSpread: 0 });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['exchange-rates'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/exchange-rates');
      return res.json();
    },
    refetchInterval: 60000,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const res = await apiRequest('PATCH', `/api/admin/exchange-rates/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exchange-rates'] });
      setEditOpen(false);
      toast.success('Rate updated');
    },
  });

  const toggleAutoUpdateMutation = useMutation({
    mutationFn: async ({ id, autoUpdate }: { id: string; autoUpdate: boolean }) => {
      const res = await apiRequest('PATCH', `/api/admin/exchange-rates/${id}`, { autoUpdate });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exchange-rates'] });
      toast.success('Auto-update toggled');
    },
  });

  const refreshAllMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/admin/exchange-rates/refresh-all');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exchange-rates'] });
      toast.success('All rates refreshed');
    },
  });

  const rates: ExchangeRate[] = data?.rates || [];
  const rateHistory = data?.history || [];
  const stats = data?.stats || {
    totalPairs: 0, lastGlobalUpdate: null, usdAedRate: 0, usdEurRate: 0,
  };

  const openEditDialog = (rate: ExchangeRate) => {
    setSelected(rate);
    setEditForm({ rate: rate.rate, buySpread: rate.buySpread, sellSpread: rate.sellSpread });
    setEditOpen(true);
  };

  const getRateChange = (current: number, previous: number) => {
    if (!previous) return 0;
    return ((current - previous) / previous) * 100;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Currency Exchange Rates</h1>
            <p className="text-muted-foreground">Manage USD/AED/EUR conversion rates and spreads</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" /> Refresh
            </Button>
            <Button onClick={() => refreshAllMutation.mutate()}>
              <RefreshCw className="w-4 h-4 mr-2" /> Update All Rates
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <DollarSign className="w-8 h-8 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalPairs}</p>
                  <p className="text-sm text-muted-foreground">Currency Pairs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
                  AED
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.usdAedRate.toFixed(4)}</p>
                  <p className="text-sm text-muted-foreground">USD/AED</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold text-sm">
                  EUR
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.usdEurRate.toFixed(4)}</p>
                  <p className="text-sm text-muted-foreground">USD/EUR</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <RefreshCw className="w-8 h-8 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {stats.lastGlobalUpdate ? formatDistanceToNow(new Date(stats.lastGlobalUpdate), { addSuffix: true }) : 'N/A'}
                  </p>
                  <p className="text-sm text-muted-foreground">Last Update</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Rate History (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={rateHistory}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" domain={['dataMin - 0.01', 'dataMax + 0.01']} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                <Legend />
                <Line type="monotone" dataKey="usdAed" stroke="#8B5CF6" name="USD/AED" strokeWidth={2} />
                <Line type="monotone" dataKey="usdEur" stroke="#10B981" name="USD/EUR" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Exchange Rate Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : rates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No exchange rates configured</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-medium">Pair</th>
                      <th className="text-right py-3 px-2 font-medium">Mid Rate</th>
                      <th className="text-right py-3 px-2 font-medium">Buy Spread</th>
                      <th className="text-right py-3 px-2 font-medium">Sell Spread</th>
                      <th className="text-right py-3 px-2 font-medium">Buy Rate</th>
                      <th className="text-right py-3 px-2 font-medium">Sell Rate</th>
                      <th className="text-left py-3 px-2 font-medium">Auto Update</th>
                      <th className="text-left py-3 px-2 font-medium">Source</th>
                      <th className="text-left py-3 px-2 font-medium">Updated</th>
                      <th className="text-right py-3 px-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rates.map((rate) => (
                      <tr key={rate.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-2">
                          <span className="font-mono font-bold">
                            {rate.baseCurrency}/{rate.targetCurrency}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right font-mono">{rate.rate.toFixed(4)}</td>
                        <td className="py-3 px-2 text-right">{rate.buySpread.toFixed(2)}%</td>
                        <td className="py-3 px-2 text-right">{rate.sellSpread.toFixed(2)}%</td>
                        <td className="py-3 px-2 text-right text-green-600 font-mono">
                          {rate.effectiveBuyRate.toFixed(4)}
                        </td>
                        <td className="py-3 px-2 text-right text-red-600 font-mono">
                          {rate.effectiveSellRate.toFixed(4)}
                        </td>
                        <td className="py-3 px-2">
                          <Switch 
                            checked={rate.autoUpdate}
                            onCheckedChange={(v) => toggleAutoUpdateMutation.mutate({ id: rate.id, autoUpdate: v })}
                          />
                        </td>
                        <td className="py-3 px-2">
                          <Badge variant="outline">{rate.source}</Badge>
                        </td>
                        <td className="py-3 px-2 text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(rate.lastUpdated), { addSuffix: true })}
                        </td>
                        <td className="py-3 px-2 text-right">
                          <Button variant="outline" size="sm" onClick={() => openEditDialog(rate)}>
                            <Settings className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-yellow-500 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-700 dark:text-yellow-400">Rate Configuration Note</h3>
                <p className="text-sm mt-1">
                  Buy spread is added to the mid rate (users pay more). Sell spread is subtracted from the mid rate (users receive less).
                  Auto-update pulls rates from external APIs hourly. Manual rates remain fixed until changed.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Edit {selected?.baseCurrency}/{selected?.targetCurrency} Rate
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Mid Rate</label>
              <Input 
                type="number"
                step="0.0001"
                value={editForm.rate}
                onChange={(e) => setEditForm({ ...editForm, rate: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Buy Spread (%)</label>
                <Input 
                  type="number"
                  step="0.01"
                  value={editForm.buySpread}
                  onChange={(e) => setEditForm({ ...editForm, buySpread: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Sell Spread (%)</label>
                <Input 
                  type="number"
                  step="0.01"
                  value={editForm.sellSpread}
                  onChange={(e) => setEditForm({ ...editForm, sellSpread: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Preview:</p>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <p className="text-xs text-muted-foreground">Buy Rate</p>
                  <p className="font-mono font-bold text-green-600">
                    {(editForm.rate * (1 + editForm.buySpread / 100)).toFixed(4)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Sell Rate</p>
                  <p className="font-mono font-bold text-red-600">
                    {(editForm.rate * (1 - editForm.sellSpread / 100)).toFixed(4)}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={() => selected && updateMutation.mutate({ id: selected.id, ...editForm })}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
