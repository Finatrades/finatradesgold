import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Send, Search, RefreshCw, Clock, CheckCircle, XCircle, AlertTriangle, Building2, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { apiRequest } from '@/lib/queryClient';
import { format, formatDistanceToNow } from 'date-fns';

interface WireTransfer {
  id: string;
  referenceNumber: string;
  userId: string;
  userName: string;
  userEmail: string;
  amountUsd: number;
  currency: string;
  bankName: string;
  accountNumber: string;
  swiftCode: string;
  beneficiaryName: string;
  status: 'pending' | 'processing' | 'sent' | 'completed' | 'failed' | 'cancelled';
  internalRef: string | null;
  externalRef: string | null;
  notes: string | null;
  processedBy: string | null;
  sentAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export default function WireTransferTracking() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [updateOpen, setUpdateOpen] = useState(false);
  const [selected, setSelected] = useState<WireTransfer | null>(null);
  const [updateData, setUpdateData] = useState({ status: '', externalRef: '', notes: '' });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['wire-transfers', statusFilter],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/admin/wire-transfers?status=${statusFilter}`);
      return res.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const res = await apiRequest('PATCH', `/api/admin/wire-transfers/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wire-transfers'] });
      setUpdateOpen(false);
      toast.success('Wire transfer updated');
    },
  });

  const transfers: WireTransfer[] = data?.transfers || [];
  const filtered = transfers.filter(t => 
    !search || 
    t.referenceNumber.includes(search) || 
    t.userName.toLowerCase().includes(search.toLowerCase()) ||
    t.bankName.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: transfers.length,
    pending: transfers.filter(t => t.status === 'pending').length,
    processing: transfers.filter(t => t.status === 'processing' || t.status === 'sent').length,
    completed: transfers.filter(t => t.status === 'completed').length,
    totalAmount: transfers.reduce((sum, t) => sum + t.amountUsd, 0),
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { variant: any; icon: any }> = {
      pending: { variant: 'secondary', icon: Clock },
      processing: { variant: 'default', icon: RefreshCw },
      sent: { variant: 'default', icon: Send },
      completed: { variant: 'default', icon: CheckCircle },
      failed: { variant: 'destructive', icon: XCircle },
      cancelled: { variant: 'secondary', icon: XCircle },
    };
    const config = styles[status] || styles.pending;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {status}
      </Badge>
    );
  };

  const openUpdateDialog = (transfer: WireTransfer) => {
    setSelected(transfer);
    setUpdateData({
      status: transfer.status,
      externalRef: transfer.externalRef || '',
      notes: transfer.notes || '',
    });
    setUpdateOpen(true);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Wire Transfer Tracking</h1>
            <p className="text-muted-foreground">Track outbound wire transfers end-to-end</p>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Send className="w-8 h-8 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total Transfers</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <RefreshCw className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.processing}</p>
                  <p className="text-sm text-muted-foreground">Processing</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <DollarSign className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">${stats.totalAmount.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Wire Transfers</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search transfers..." 
                    className="pl-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
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
                <Send className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No wire transfers found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-medium">Reference</th>
                      <th className="text-left py-3 px-2 font-medium">User</th>
                      <th className="text-left py-3 px-2 font-medium">Amount</th>
                      <th className="text-left py-3 px-2 font-medium">Bank</th>
                      <th className="text-left py-3 px-2 font-medium">Status</th>
                      <th className="text-left py-3 px-2 font-medium">Created</th>
                      <th className="text-right py-3 px-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((transfer) => (
                      <tr key={transfer.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-2">
                          <code className="text-sm bg-muted px-2 py-0.5 rounded">{transfer.referenceNumber}</code>
                        </td>
                        <td className="py-3 px-2">
                          <div>
                            <p className="font-medium">{transfer.userName}</p>
                            <p className="text-sm text-muted-foreground">{transfer.userEmail}</p>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <p className="font-medium">${transfer.amountUsd.toLocaleString()}</p>
                          <p className="text-sm text-muted-foreground">{transfer.currency}</p>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm">{transfer.bankName}</p>
                              <p className="text-xs text-muted-foreground">{transfer.swiftCode}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-2">{getStatusBadge(transfer.status)}</td>
                        <td className="py-3 px-2 text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(transfer.createdAt), { addSuffix: true })}
                        </td>
                        <td className="py-3 px-2 text-right">
                          <Button variant="outline" size="sm" onClick={() => openUpdateDialog(transfer)}>
                            Update
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
      </div>

      <Dialog open={updateOpen} onOpenChange={setUpdateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Wire Transfer</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm"><strong>Reference:</strong> {selected.referenceNumber}</p>
                <p className="text-sm"><strong>Amount:</strong> ${selected.amountUsd.toLocaleString()}</p>
                <p className="text-sm"><strong>Beneficiary:</strong> {selected.beneficiaryName}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <Select value={updateData.status} onValueChange={(v) => setUpdateData({ ...updateData, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="sent">Sent to Bank</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">External Reference</label>
                <Input 
                  placeholder="Bank reference number" 
                  value={updateData.externalRef}
                  onChange={(e) => setUpdateData({ ...updateData, externalRef: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Notes</label>
                <Textarea 
                  placeholder="Internal notes..." 
                  value={updateData.notes}
                  onChange={(e) => setUpdateData({ ...updateData, notes: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateOpen(false)}>Cancel</Button>
            <Button onClick={() => selected && updateMutation.mutate({ id: selected.id, ...updateData })}>
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
