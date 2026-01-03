import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertTriangle, Search, RefreshCw, DollarSign, Clock, CheckCircle, XCircle, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { apiRequest } from '@/lib/queryClient';
import { format, formatDistanceToNow } from 'date-fns';

interface Chargeback {
  id: string;
  transactionId: string;
  userId: string;
  userName: string;
  userEmail: string;
  amount: number;
  reason: string;
  reasonCode: string;
  status: 'open' | 'under_review' | 'won' | 'lost' | 'accepted';
  paymentMethod: string;
  deadline: string;
  evidence: string | null;
  adminNotes: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export default function ChargebackTracker() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [respondOpen, setRespondOpen] = useState(false);
  const [selected, setSelected] = useState<Chargeback | null>(null);
  const [response, setResponse] = useState({ status: '', notes: '', evidence: '' });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['chargebacks', statusFilter],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/admin/chargebacks?status=${statusFilter}`);
      return res.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const res = await apiRequest('PATCH', `/api/admin/chargebacks/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chargebacks'] });
      setRespondOpen(false);
      toast.success('Chargeback updated');
    },
  });

  const chargebacks: Chargeback[] = data?.chargebacks || [];
  const stats = data?.stats || {
    totalOpen: 0, totalAmount: 0, winRate: 0, avgResolutionDays: 0,
  };
  const reasonBreakdown = data?.reasonBreakdown || [];

  const filtered = chargebacks.filter(cb => 
    !search || 
    cb.transactionId.includes(search) ||
    cb.userName.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { className: string; icon: any }> = {
      open: { className: 'bg-yellow-100 text-yellow-700', icon: Clock },
      under_review: { className: 'bg-blue-100 text-blue-700', icon: FileText },
      won: { className: 'bg-green-100 text-green-700', icon: CheckCircle },
      lost: { className: 'bg-red-100 text-red-700', icon: XCircle },
      accepted: { className: 'bg-gray-100 text-gray-700', icon: CheckCircle },
    };
    const config = styles[status] || styles.open;
    const Icon = config.icon;
    return (
      <Badge className={`${config.className} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const openRespondDialog = (chargeback: Chargeback) => {
    setSelected(chargeback);
    setResponse({ status: chargeback.status, notes: chargeback.adminNotes || '', evidence: '' });
    setRespondOpen(true);
  };

  const formatCurrency = (value: number) => `$${value.toLocaleString()}`;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Chargeback Tracker</h1>
            <p className="text-muted-foreground">Handle payment disputes and chargebacks</p>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalOpen}</p>
                  <p className="text-sm text-muted-foreground">Open Disputes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <DollarSign className="w-8 h-8 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(stats.totalAmount)}</p>
                  <p className="text-sm text-muted-foreground">At Risk Amount</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.winRate}%</p>
                  <p className="text-sm text-muted-foreground">Win Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.avgResolutionDays}</p>
                  <p className="text-sm text-muted-foreground">Avg Resolution Days</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Dispute Reasons</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={reasonBreakdown} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" className="text-xs" />
                <YAxis type="category" dataKey="reason" className="text-xs" width={150} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                <Bar dataKey="count" fill="#8B5CF6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>All Chargebacks</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search by ID or user..." 
                    className="pl-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="under_review">Under Review</SelectItem>
                    <SelectItem value="won">Won</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No chargebacks found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-medium">Transaction</th>
                      <th className="text-left py-3 px-2 font-medium">User</th>
                      <th className="text-right py-3 px-2 font-medium">Amount</th>
                      <th className="text-left py-3 px-2 font-medium">Reason</th>
                      <th className="text-left py-3 px-2 font-medium">Status</th>
                      <th className="text-left py-3 px-2 font-medium">Deadline</th>
                      <th className="text-left py-3 px-2 font-medium">Filed</th>
                      <th className="text-right py-3 px-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((cb) => {
                      const isUrgent = new Date(cb.deadline) < new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
                      return (
                        <tr key={cb.id} className={`border-b hover:bg-muted/50 ${isUrgent && cb.status === 'open' ? 'bg-red-50 dark:bg-red-950/10' : ''}`}>
                          <td className="py-3 px-2">
                            <code className="text-sm bg-muted px-2 py-0.5 rounded">{cb.transactionId}</code>
                          </td>
                          <td className="py-3 px-2">
                            <div>
                              <p className="font-medium">{cb.userName}</p>
                              <p className="text-sm text-muted-foreground">{cb.userEmail}</p>
                            </div>
                          </td>
                          <td className="py-3 px-2 text-right font-medium text-red-600">
                            {formatCurrency(cb.amount)}
                          </td>
                          <td className="py-3 px-2">
                            <div>
                              <Badge variant="outline">{cb.reasonCode}</Badge>
                              <p className="text-sm text-muted-foreground mt-1">{cb.reason}</p>
                            </div>
                          </td>
                          <td className="py-3 px-2">{getStatusBadge(cb.status)}</td>
                          <td className="py-3 px-2">
                            <span className={isUrgent ? 'text-red-600 font-medium' : ''}>
                              {format(new Date(cb.deadline), 'MMM d, yyyy')}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(cb.createdAt), { addSuffix: true })}
                          </td>
                          <td className="py-3 px-2 text-right">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => openRespondDialog(cb)}
                            >
                              Respond
                            </Button>
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

      <Dialog open={respondOpen} onOpenChange={setRespondOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Respond to Chargeback</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><strong>Transaction:</strong> {selected.transactionId}</div>
                  <div><strong>Amount:</strong> {formatCurrency(selected.amount)}</div>
                  <div><strong>Reason:</strong> {selected.reason}</div>
                  <div><strong>Deadline:</strong> {format(new Date(selected.deadline), 'MMM d, yyyy')}</div>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Status</label>
                <Select value={response.status} onValueChange={(v) => setResponse({ ...response, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="under_review">Under Review</SelectItem>
                    <SelectItem value="won">Won - Dispute Rejected</SelectItem>
                    <SelectItem value="lost">Lost - Refunded</SelectItem>
                    <SelectItem value="accepted">Accepted - Refund Agreed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Evidence/Documentation</label>
                <Textarea 
                  placeholder="Describe evidence being submitted..." 
                  rows={3}
                  value={response.evidence}
                  onChange={(e) => setResponse({ ...response, evidence: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Internal Notes</label>
                <Textarea 
                  placeholder="Internal notes..." 
                  rows={2}
                  value={response.notes}
                  onChange={(e) => setResponse({ ...response, notes: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRespondOpen(false)}>Cancel</Button>
            <Button onClick={() => selected && updateMutation.mutate({ 
              id: selected.id, 
              status: response.status, 
              adminNotes: response.notes,
              evidence: response.evidence 
            })}>
              Update Chargeback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
