import React, { useState, useEffect } from 'react';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Bitcoin, Clock, CheckCircle, XCircle, Eye, DollarSign } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { apiRequest } from '@/lib/queryClient';

interface BinanceTransaction {
  id: string;
  userId: string;
  merchantTradeNo: string;
  prepayId: string | null;
  orderStatus: string;
  amountUsd: string;
  goldGrams: string | null;
  goldPriceAtTime: string | null;
  currency: string;
  paymentUrl: string | null;
  createdAt: string;
  completedAt: string | null;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    finatradesId: string | null;
  };
}

export default function BinancePayAdmin() {
  const [transactions, setTransactions] = useState<BinanceTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTx, setSelectedTx] = useState<BinanceTransaction | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('GET', '/api/admin/binance-pay/transactions');
      const data = await res.json();
      setTransactions(data.transactions || []);
    } catch (err) {
      toast.error('Failed to load Binance Pay transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'INITIAL':
        return <Badge variant="secondary" data-testid={`status-${status}`}>Pending</Badge>;
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-700" data-testid={`status-${status}`}>Processing</Badge>;
      case 'PAID':
        return <Badge className="bg-green-100 text-green-700" data-testid={`status-${status}`}>Paid</Badge>;
      case 'CANCELED':
        return <Badge variant="destructive" data-testid={`status-${status}`}>Cancelled</Badge>;
      case 'EXPIRED':
        return <Badge className="bg-gray-100 text-gray-700" data-testid={`status-${status}`}>Expired</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const stats = {
    total: transactions.length,
    paid: transactions.filter(t => t.orderStatus === 'PAID').length,
    pending: transactions.filter(t => t.orderStatus === 'INITIAL' || t.orderStatus === 'PENDING').length,
    cancelled: transactions.filter(t => t.orderStatus === 'CANCELED' || t.orderStatus === 'EXPIRED').length,
    totalVolume: transactions.filter(t => t.orderStatus === 'PAID').reduce((sum, t) => sum + parseFloat(t.amountUsd || '0'), 0),
  };

  const openDetails = (tx: BinanceTransaction) => {
    setSelectedTx(tx);
    setDetailsOpen(true);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Bitcoin className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">Binance Pay Transactions</h1>
              <p className="text-muted-foreground">View all crypto payment transactions via Binance Pay</p>
            </div>
          </div>
          <Button onClick={fetchTransactions} variant="outline" disabled={loading} data-testid="button-refresh">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold" data-testid="text-total-count">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Transactions</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-100">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600" data-testid="text-paid-count">{stats.paid}</p>
              <p className="text-xs text-green-700">Paid</p>
            </CardContent>
          </Card>
          <Card className="bg-yellow-50 border-yellow-100">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600" data-testid="text-pending-count">{stats.pending}</p>
              <p className="text-xs text-yellow-700">Pending</p>
            </CardContent>
          </Card>
          <Card className="bg-gray-50 border-gray-100">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-gray-600" data-testid="text-cancelled-count">{stats.cancelled}</p>
              <p className="text-xs text-gray-700">Cancelled/Expired</p>
            </CardContent>
          </Card>
          <Card className="bg-purple-50 border-purple-100">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-purple-600" data-testid="text-volume">${stats.totalVolume.toLocaleString()}</p>
              <p className="text-xs text-purple-700">Total Volume</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Transactions</CardTitle>
            <CardDescription>Binance Pay crypto payment history</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Bitcoin className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No Binance Pay transactions found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    data-testid={`row-transaction-${tx.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-yellow-100 rounded-lg">
                        <Bitcoin className="w-5 h-5 text-yellow-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{tx.merchantTradeNo}</span>
                          {getStatusBadge(tx.orderStatus)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {tx.user ? `${tx.user.firstName} ${tx.user.lastName} (${tx.user.email})` : 'Unknown User'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tx.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold">${parseFloat(tx.amountUsd).toLocaleString()}</p>
                        {tx.goldGrams && (
                          <p className="text-xs text-muted-foreground">{parseFloat(tx.goldGrams).toFixed(4)}g Gold</p>
                        )}
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => openDetails(tx)} data-testid={`button-details-${tx.id}`}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Transaction Details</DialogTitle>
            </DialogHeader>
            {selectedTx && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Trade Number</p>
                    <p className="font-medium">{selectedTx.merchantTradeNo}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    {getStatusBadge(selectedTx.orderStatus)}
                  </div>
                  <div>
                    <p className="text-muted-foreground">Amount</p>
                    <p className="font-medium">${parseFloat(selectedTx.amountUsd).toLocaleString()} {selectedTx.currency}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Gold</p>
                    <p className="font-medium">{selectedTx.goldGrams ? `${parseFloat(selectedTx.goldGrams).toFixed(4)}g` : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Gold Price</p>
                    <p className="font-medium">{selectedTx.goldPriceAtTime ? `$${parseFloat(selectedTx.goldPriceAtTime).toFixed(2)}/g` : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Created</p>
                    <p className="font-medium">{new Date(selectedTx.createdAt).toLocaleString()}</p>
                  </div>
                  {selectedTx.completedAt && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Completed</p>
                      <p className="font-medium">{new Date(selectedTx.completedAt).toLocaleString()}</p>
                    </div>
                  )}
                </div>
                {selectedTx.user && (
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium mb-2">Customer</p>
                    <p className="text-sm">{selectedTx.user.firstName} {selectedTx.user.lastName}</p>
                    <p className="text-xs text-muted-foreground">{selectedTx.user.email}</p>
                    {selectedTx.user.finatradesId && (
                      <p className="text-xs text-muted-foreground">ID: {selectedTx.user.finatradesId}</p>
                    )}
                  </div>
                )}
                {selectedTx.prepayId && (
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium mb-2">Binance Details</p>
                    <p className="text-xs text-muted-foreground break-all">Prepay ID: {selectedTx.prepayId}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
