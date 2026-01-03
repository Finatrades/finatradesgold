import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Shield, Plus, AlertTriangle, CheckCircle, RefreshCw, Building2, TrendingUp, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';

interface Counterparty {
  id: string;
  name: string;
  type: 'bank' | 'payment_processor' | 'gold_supplier' | 'exchange' | 'custodian';
  country: string;
  riskScore: number;
  creditRating: string;
  exposureAmount: number;
  exposureLimit: number;
  status: 'active' | 'monitoring' | 'suspended';
  lastReviewDate: string;
  notes: string;
}

export default function CounterpartyRisk() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedCounterparty, setSelectedCounterparty] = useState<Counterparty | null>(null);
  const [form, setForm] = useState({
    name: '', type: 'bank', country: '', creditRating: '', exposureLimit: 0, notes: '',
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['counterparties'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/counterparties');
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await apiRequest('POST', '/api/admin/counterparties', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['counterparties'] });
      setCreateOpen(false);
      setForm({ name: '', type: 'bank', country: '', creditRating: '', exposureLimit: 0, notes: '' });
      toast.success('Counterparty added');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest('PATCH', `/api/admin/counterparties/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['counterparties'] });
      toast.success('Status updated');
    },
  });

  const counterparties: Counterparty[] = data?.counterparties || [];
  const stats = data?.stats || {
    totalCounterparties: 0, totalExposure: 0, avgRiskScore: 0, highRiskCount: 0,
  };
  const exposureByType = data?.exposureByType || [];

  const getRiskColor = (score: number) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRiskBadge = (score: number) => {
    if (score >= 70) return <Badge className="bg-green-100 text-green-700">Low Risk</Badge>;
    if (score >= 50) return <Badge className="bg-yellow-100 text-yellow-700">Medium Risk</Badge>;
    return <Badge className="bg-red-100 text-red-700">High Risk</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-700',
      monitoring: 'bg-yellow-100 text-yellow-700',
      suspended: 'bg-red-100 text-red-700',
    };
    return <Badge className={styles[status] || ''}>{status}</Badge>;
  };

  const formatCurrency = (value: number) => `$${value.toLocaleString()}`;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Counterparty Risk Monitor</h1>
            <p className="text-muted-foreground">Track and manage FinaBridge trade partner risk</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" /> Refresh
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Add Counterparty
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Building2 className="w-8 h-8 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalCounterparties}</p>
                  <p className="text-sm text-muted-foreground">Counterparties</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <DollarSign className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(stats.totalExposure)}</p>
                  <p className="text-sm text-muted-foreground">Total Exposure</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <TrendingUp className={`w-8 h-8 ${getRiskColor(stats.avgRiskScore)}`} />
                <div>
                  <p className={`text-2xl font-bold ${getRiskColor(stats.avgRiskScore)}`}>
                    {stats.avgRiskScore.toFixed(0)}
                  </p>
                  <p className="text-sm text-muted-foreground">Avg Risk Score</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.highRiskCount}</p>
                  <p className="text-sm text-muted-foreground">High Risk</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Exposure by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={exposureByType} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" className="text-xs" tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} />
                <YAxis type="category" dataKey="type" className="text-xs" width={120} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Bar dataKey="exposure" fill="#8B5CF6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>All Counterparties</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : counterparties.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No counterparties tracked</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-medium">Name</th>
                      <th className="text-left py-3 px-2 font-medium">Type</th>
                      <th className="text-left py-3 px-2 font-medium">Country</th>
                      <th className="text-left py-3 px-2 font-medium">Risk</th>
                      <th className="text-left py-3 px-2 font-medium">Rating</th>
                      <th className="text-right py-3 px-2 font-medium">Exposure</th>
                      <th className="text-right py-3 px-2 font-medium">Limit</th>
                      <th className="text-left py-3 px-2 font-medium">Status</th>
                      <th className="text-right py-3 px-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {counterparties.map((cp) => {
                      const utilizationPercent = cp.exposureLimit > 0 
                        ? (cp.exposureAmount / cp.exposureLimit) * 100 
                        : 0;
                      return (
                        <tr key={cp.id} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-2 font-medium">{cp.name}</td>
                          <td className="py-3 px-2">
                            <Badge variant="outline">{cp.type.replace('_', ' ')}</Badge>
                          </td>
                          <td className="py-3 px-2">{cp.country}</td>
                          <td className="py-3 px-2">{getRiskBadge(cp.riskScore)}</td>
                          <td className="py-3 px-2">{cp.creditRating}</td>
                          <td className="py-3 px-2 text-right">{formatCurrency(cp.exposureAmount)}</td>
                          <td className="py-3 px-2 text-right">
                            <div className="w-24">
                              <div className="flex justify-between text-xs mb-1">
                                <span>{utilizationPercent.toFixed(0)}%</span>
                              </div>
                              <Progress 
                                value={utilizationPercent} 
                                className={utilizationPercent > 80 ? 'bg-red-100' : ''} 
                              />
                            </div>
                          </td>
                          <td className="py-3 px-2">{getStatusBadge(cp.status)}</td>
                          <td className="py-3 px-2 text-right">
                            <Select 
                              value={cp.status} 
                              onValueChange={(v) => updateStatusMutation.mutate({ id: cp.id, status: v })}
                            >
                              <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="monitoring">Monitoring</SelectItem>
                                <SelectItem value="suspended">Suspended</SelectItem>
                              </SelectContent>
                            </Select>
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
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Counterparty</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input 
                placeholder="Company name" 
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Type</label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank">Bank</SelectItem>
                    <SelectItem value="payment_processor">Payment Processor</SelectItem>
                    <SelectItem value="gold_supplier">Gold Supplier</SelectItem>
                    <SelectItem value="exchange">Exchange</SelectItem>
                    <SelectItem value="custodian">Custodian</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Country</label>
                <Input 
                  placeholder="UAE" 
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Credit Rating</label>
                <Input 
                  placeholder="AAA" 
                  value={form.creditRating}
                  onChange={(e) => setForm({ ...form, creditRating: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Exposure Limit ($)</label>
                <Input 
                  type="number"
                  placeholder="1000000" 
                  value={form.exposureLimit || ''}
                  onChange={(e) => setForm({ ...form, exposureLimit: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Notes</label>
              <Textarea 
                placeholder="Additional notes..." 
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate(form)}>Add Counterparty</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
