import React, { useState } from 'react';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { 
  Search, RefreshCw, Clock, CheckCircle, XCircle, 
  DollarSign, Send, AlertTriangle, ArrowUpDown, Coins
} from 'lucide-react';
import { apiRequest, apiFetch } from '@/lib/queryClient';

interface SettlementItem {
  id: string;
  referenceId: string;
  userId: string;
  type: 'withdrawal' | 'bnsl_payout' | 'trade_finance' | 'refund' | 'commission';
  amountUsd: string;
  amountGold: string | null;
  currency: string;
  paymentMethod: string | null;
  bankDetails: any;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  priority: number;
  scheduledFor: string | null;
  processedAt: string | null;
  processedBy: string | null;
  externalRef: string | null;
  notes: string | null;
  errorMessage: string | null;
  createdAt: string;
  user?: { firstName: string; lastName: string; email: string };
}

export default function SettlementQueue() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [selectedSettlement, setSelectedSettlement] = useState<SettlementItem | null>(null);
  const [processNotes, setProcessNotes] = useState('');

  const { data, isLoading, refetch } = useQuery<{ settlements: SettlementItem[] }>({
    queryKey: ['/api/admin/settlements', statusFilter, typeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (typeFilter !== 'all') params.set('type', typeFilter);
      const res = await apiFetch(`/api/admin/settlements?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch settlements');
      return res.json();
    },
  });

  const processMutation = useMutation({
    mutationFn: ({ id, action, notes }: { id: string; action: 'process' | 'complete' | 'fail' | 'cancel'; notes: string }) =>
      apiRequest('POST', `/api/admin/settlements/${id}/${action}`, { notes }),
    onSuccess: () => {
      toast.success('Settlement updated');
      setSelectedSettlement(null);
      setProcessNotes('');
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settlements'] });
    },
    onError: () => toast.error('Failed to update settlement'),
  });

  const batchProcessMutation = useMutation({
    mutationFn: (ids: string[]) => apiRequest('POST', '/api/admin/settlements/batch-process', { ids }),
    onSuccess: () => {
      toast.success('Batch processing started');
      setSelectedItems(new Set());
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settlements'] });
    },
    onError: () => toast.error('Failed to process batch'),
  });

  const settlements = data?.settlements || [];

  const filteredSettlements = settlements.filter(s =>
    s.referenceId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.user && `${s.user.firstName} ${s.user.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-warning-muted text-warning-muted-foreground"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'processing':
        return <Badge className="bg-info-muted text-info-muted-foreground"><RefreshCw className="w-3 h-3 mr-1 animate-spin" />Processing</Badge>;
      case 'completed':
        return <Badge className="bg-success-muted text-success-muted-foreground"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      case 'cancelled':
        return <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      withdrawal: 'bg-primary/10 text-primary',
      bnsl_payout: 'bg-info-muted text-info-muted-foreground',
      trade_finance: 'bg-warning-muted text-warning-muted-foreground',
      refund: 'bg-error-muted text-error-muted-foreground',
      commission: 'bg-success-muted text-success-muted-foreground',
    };
    return <Badge className={colors[type] || 'bg-muted'}>{type.replace(/_/g, ' ')}</Badge>;
  };

  const formatCurrency = (value: string) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(parseFloat(value));
  };

  const stats = {
    pending: settlements.filter(s => s.status === 'pending').length,
    pendingValue: settlements.filter(s => s.status === 'pending').reduce((acc, s) => acc + parseFloat(s.amountUsd), 0),
    processing: settlements.filter(s => s.status === 'processing').length,
    todayCompleted: settlements.filter(s => s.status === 'completed' && s.processedAt && new Date(s.processedAt).toDateString() === new Date().toDateString()).length,
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground" data-testid="text-settlement-title">Settlement Queue</h1>
            <p className="text-muted-foreground mt-1">Pending payments and transfer processing</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} data-testid="button-refresh">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            {selectedItems.size > 0 && (
              <Button 
                onClick={() => batchProcessMutation.mutate(Array.from(selectedItems))}
                disabled={batchProcessMutation.isPending}
              >
                <Send className="w-4 h-4 mr-2" />
                Process Selected ({selectedItems.size})
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-warning-muted rounded-lg">
                  <Clock className="w-6 h-6 text-warning-muted-foreground" />
                </div>
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
                <div className="p-3 bg-primary/10 rounded-lg">
                  <DollarSign className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(stats.pendingValue.toString())}</p>
                  <p className="text-sm text-muted-foreground">Pending Value</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-info-muted rounded-lg">
                  <RefreshCw className="w-6 h-6 text-info-muted-foreground" />
                </div>
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
                <div className="p-3 bg-success-muted rounded-lg">
                  <CheckCircle className="w-6 h-6 text-success-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.todayCompleted}</p>
                  <p className="text-sm text-muted-foreground">Completed Today</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by reference or user..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="withdrawal">Withdrawal</SelectItem>
                  <SelectItem value="bnsl_payout">BNSL Payout</SelectItem>
                  <SelectItem value="trade_finance">Trade Finance</SelectItem>
                  <SelectItem value="refund">Refund</SelectItem>
                  <SelectItem value="commission">Commission</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredSettlements.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No settlements found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={selectedItems.size === filteredSettlements.filter(s => s.status === 'pending').length}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedItems(new Set(filteredSettlements.filter(s => s.status === 'pending').map(s => s.id)));
                          } else {
                            setSelectedItems(new Set());
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSettlements.map((settlement) => (
                    <TableRow key={settlement.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedItems.has(settlement.id)}
                          disabled={settlement.status !== 'pending'}
                          onCheckedChange={(checked) => {
                            const newSelected = new Set(selectedItems);
                            if (checked) {
                              newSelected.add(settlement.id);
                            } else {
                              newSelected.delete(settlement.id);
                            }
                            setSelectedItems(newSelected);
                          }}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm">{settlement.referenceId}</TableCell>
                      <TableCell>
                        {settlement.user ? `${settlement.user.firstName} ${settlement.user.lastName}` : settlement.userId}
                      </TableCell>
                      <TableCell>{getTypeBadge(settlement.type)}</TableCell>
                      <TableCell className="font-bold">{formatCurrency(settlement.amountUsd)}</TableCell>
                      <TableCell>
                        <Badge variant={settlement.priority <= 3 ? 'destructive' : 'secondary'}>
                          P{settlement.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(settlement.status)}</TableCell>
                      <TableCell>{formatDistanceToNow(new Date(settlement.createdAt), { addSuffix: true })}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedSettlement(settlement)}>
                          <ArrowUpDown className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!selectedSettlement} onOpenChange={() => setSelectedSettlement(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Settlement Details - {selectedSettlement?.referenceId}</DialogTitle>
            </DialogHeader>
            {selectedSettlement && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">User</p>
                    <p className="font-medium">
                      {selectedSettlement.user ? `${selectedSettlement.user.firstName} ${selectedSettlement.user.lastName}` : selectedSettlement.userId}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    {getStatusBadge(selectedSettlement.status)}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Type</p>
                    {getTypeBadge(selectedSettlement.type)}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Amount</p>
                    <p className="text-xl font-bold">{formatCurrency(selectedSettlement.amountUsd)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Payment Method</p>
                    <p>{selectedSettlement.paymentMethod || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Priority</p>
                    <Badge variant={selectedSettlement.priority <= 3 ? 'destructive' : 'secondary'}>
                      Priority {selectedSettlement.priority}
                    </Badge>
                  </div>
                </div>

                {selectedSettlement.bankDetails && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-2">Bank Details</p>
                    <pre className="text-xs">{JSON.stringify(selectedSettlement.bankDetails, null, 2)}</pre>
                  </div>
                )}

                {selectedSettlement.errorMessage && (
                  <div className="p-3 bg-error-muted rounded-lg">
                    <p className="text-sm font-medium text-destructive">Error</p>
                    <p className="text-sm">{selectedSettlement.errorMessage}</p>
                  </div>
                )}

                {selectedSettlement.status === 'pending' && (
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Processing notes..."
                      value={processNotes}
                      onChange={(e) => setProcessNotes(e.target.value)}
                    />
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              {selectedSettlement?.status === 'pending' && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => processMutation.mutate({ id: selectedSettlement.id, action: 'cancel', notes: processNotes })}
                    disabled={processMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => processMutation.mutate({ id: selectedSettlement.id, action: 'process', notes: processNotes })}
                    disabled={processMutation.isPending}
                  >
                    {processMutation.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                    Process
                  </Button>
                </>
              )}
              {selectedSettlement?.status === 'processing' && (
                <>
                  <Button
                    variant="destructive"
                    onClick={() => processMutation.mutate({ id: selectedSettlement.id, action: 'fail', notes: processNotes })}
                    disabled={processMutation.isPending}
                  >
                    Mark Failed
                  </Button>
                  <Button
                    onClick={() => processMutation.mutate({ id: selectedSettlement.id, action: 'complete', notes: processNotes })}
                    disabled={processMutation.isPending}
                  >
                    Mark Completed
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
