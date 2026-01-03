import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Target, Plus, TrendingUp, TrendingDown, DollarSign, RefreshCw, ExternalLink, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';

interface Competitor {
  id: string;
  name: string;
  website: string;
  buySpread: number;
  sellSpread: number;
  minOrder: number;
  deliveryFee: number;
  lastUpdated: string;
}

export default function CompetitorMonitor() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    name: '', website: '', buySpread: 0, sellSpread: 0, minOrder: 0, deliveryFee: 0,
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['competitors'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/competitors');
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await apiRequest('POST', '/api/admin/competitors', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitors'] });
      setCreateOpen(false);
      setForm({ name: '', website: '', buySpread: 0, sellSpread: 0, minOrder: 0, deliveryFee: 0 });
      toast.success('Competitor added');
    },
  });

  const competitors: Competitor[] = data?.competitors || [];
  const priceHistory = data?.priceHistory || [];
  const ourPricing = data?.ourPricing || { buySpread: 0, sellSpread: 0 };

  const avgCompetitorBuySpread = competitors.length > 0
    ? competitors.reduce((sum, c) => sum + c.buySpread, 0) / competitors.length
    : 0;
  const avgCompetitorSellSpread = competitors.length > 0
    ? competitors.reduce((sum, c) => sum + c.sellSpread, 0) / competitors.length
    : 0;

  const buySpreadComparison = ourPricing.buySpread - avgCompetitorBuySpread;
  const sellSpreadComparison = ourPricing.sellSpread - avgCompetitorSellSpread;

  const formatPercent = (value: number) => `${value.toFixed(2)}%`;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Competitor Pricing Monitor</h1>
            <p className="text-muted-foreground">Compare gold spreads and pricing vs market</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" /> Refresh
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Add Competitor
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Target className="w-8 h-8 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{competitors.length}</p>
                  <p className="text-sm text-muted-foreground">Competitors Tracked</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <DollarSign className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{formatPercent(ourPricing.buySpread)}</p>
                  <p className="text-sm text-muted-foreground">Our Buy Spread</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                {buySpreadComparison <= 0 ? (
                  <TrendingUp className="w-8 h-8 text-green-500" />
                ) : (
                  <TrendingDown className="w-8 h-8 text-red-500" />
                )}
                <div>
                  <p className={`text-2xl font-bold ${buySpreadComparison <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {buySpreadComparison <= 0 ? '' : '+'}{formatPercent(buySpreadComparison)}
                  </p>
                  <p className="text-sm text-muted-foreground">vs Avg Competitor</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <DollarSign className="w-8 h-8 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">{formatPercent(avgCompetitorBuySpread)}</p>
                  <p className="text-sm text-muted-foreground">Avg Market Spread</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Price Spread Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={[
                { name: 'FinaGold', buySpread: ourPricing.buySpread, sellSpread: ourPricing.sellSpread },
                ...competitors.map(c => ({ name: c.name, buySpread: c.buySpread, sellSpread: c.sellSpread }))
              ]}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => `${v}%`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                  formatter={(value: number) => `${value.toFixed(2)}%`}
                />
                <Legend />
                <Bar dataKey="buySpread" fill="#8B5CF6" name="Buy Spread" />
                <Bar dataKey="sellSpread" fill="#EC4899" name="Sell Spread" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Historical Spread Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={priceHistory}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => `${v}%`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                  formatter={(value: number) => `${value.toFixed(2)}%`}
                />
                <Legend />
                <Line type="monotone" dataKey="ourSpread" stroke="#8B5CF6" name="Our Spread" strokeWidth={2} />
                <Line type="monotone" dataKey="avgMarket" stroke="#9CA3AF" name="Market Avg" strokeWidth={2} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Competitor Details</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : competitors.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No competitors tracked</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-medium">Competitor</th>
                      <th className="text-right py-3 px-2 font-medium">Buy Spread</th>
                      <th className="text-right py-3 px-2 font-medium">Sell Spread</th>
                      <th className="text-right py-3 px-2 font-medium">Min Order</th>
                      <th className="text-right py-3 px-2 font-medium">Delivery Fee</th>
                      <th className="text-left py-3 px-2 font-medium">Updated</th>
                      <th className="text-left py-3 px-2 font-medium">Comparison</th>
                    </tr>
                  </thead>
                  <tbody>
                    {competitors.map((competitor) => {
                      const isBetter = ourPricing.buySpread < competitor.buySpread;
                      return (
                        <tr key={competitor.id} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{competitor.name}</span>
                              <a href={competitor.website} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-4 h-4 text-muted-foreground" />
                              </a>
                            </div>
                          </td>
                          <td className="py-3 px-2 text-right">{formatPercent(competitor.buySpread)}</td>
                          <td className="py-3 px-2 text-right">{formatPercent(competitor.sellSpread)}</td>
                          <td className="py-3 px-2 text-right">${competitor.minOrder}</td>
                          <td className="py-3 px-2 text-right">${competitor.deliveryFee}</td>
                          <td className="py-3 px-2 text-sm text-muted-foreground">
                            {format(new Date(competitor.lastUpdated), 'MMM d')}
                          </td>
                          <td className="py-3 px-2">
                            <Badge variant={isBetter ? 'default' : 'destructive'}>
                              {isBetter ? 'We\'re cheaper' : 'They\'re cheaper'}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {buySpreadComparison > 0 && (
          <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-orange-500 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-orange-700 dark:text-orange-400">Pricing Alert</h3>
                  <p className="text-sm mt-1">
                    Your buy spread is {formatPercent(Math.abs(buySpreadComparison))} higher than the market average. 
                    Consider adjusting your pricing to stay competitive.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Competitor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input 
                placeholder="Competitor name" 
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Website</label>
              <Input 
                placeholder="https://competitor.com" 
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Buy Spread (%)</label>
                <Input 
                  type="number"
                  step="0.01"
                  placeholder="2.5" 
                  value={form.buySpread || ''}
                  onChange={(e) => setForm({ ...form, buySpread: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Sell Spread (%)</label>
                <Input 
                  type="number"
                  step="0.01"
                  placeholder="2.0" 
                  value={form.sellSpread || ''}
                  onChange={(e) => setForm({ ...form, sellSpread: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Min Order ($)</label>
                <Input 
                  type="number"
                  placeholder="100" 
                  value={form.minOrder || ''}
                  onChange={(e) => setForm({ ...form, minOrder: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Delivery Fee ($)</label>
                <Input 
                  type="number"
                  placeholder="25" 
                  value={form.deliveryFee || ''}
                  onChange={(e) => setForm({ ...form, deliveryFee: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate(form)}>Add Competitor</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
