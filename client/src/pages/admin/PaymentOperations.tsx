import React, { useState, useEffect } from 'react';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, XCircle, ArrowDownLeft, ArrowUpRight, DollarSign, Clock, RefreshCw, TrendingUp, Coins, Send, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/context/AuthContext';

interface Transaction {
  id: string;
  userId: string;
  type: 'Buy' | 'Sell' | 'Send' | 'Receive' | 'Deposit' | 'Withdrawal' | 'Swap';
  status: 'Pending' | 'Processing' | 'Completed' | 'Failed' | 'Cancelled';
  amountGold: string | null;
  amountUsd: string | null;
  amountEur: string | null;
  goldPriceUsdPerGram: string | null;
  recipientEmail: string | null;
  senderEmail: string | null;
  description: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  completedAt: string | null;
}

interface UserInfo {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export default function FinaPayManagement() {
  const { user: currentUser } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [users, setUsers] = useState<Record<string, UserInfo>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [txResponse, usersResponse] = await Promise.all([
        fetch('/api/admin/transactions'),
        fetch('/api/admin/users')
      ]);
      
      const txData = await txResponse.json();
      const usersData = await usersResponse.json();
      
      setTransactions(txData.transactions || []);
      
      const userMap: Record<string, UserInfo> = {};
      (usersData.users || []).forEach((u: UserInfo) => {
        userMap[u.id] = u;
      });
      setUsers(userMap);
    } catch (error) {
      toast.error("Failed to load transactions");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApprove = async (txId: string) => {
    try {
      await apiRequest('POST', `/api/admin/transactions/${txId}/approve`, {
        adminId: currentUser?.id
      });
      toast.success("Transaction approved successfully");
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to approve transaction");
    }
  };

  const openRejectDialog = (tx: Transaction) => {
    setSelectedTx(tx);
    setRejectReason('');
    setRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!selectedTx) return;
    
    try {
      await apiRequest('POST', `/api/admin/transactions/${selectedTx.id}/reject`, {
        adminId: currentUser?.id,
        reason: rejectReason || 'Rejected by admin'
      });
      toast.success("Transaction rejected");
      setRejectDialogOpen(false);
      setSelectedTx(null);
      fetchData();
    } catch (error) {
      toast.error("Failed to reject transaction");
    }
  };

  const openDetails = (tx: Transaction) => {
    setSelectedTx(tx);
    setDetailsDialogOpen(true);
  };

  const getUserName = (userId: string) => {
    const user = users[userId];
    return user ? `${user.firstName} ${user.lastName}` : userId;
  };

  const getUserEmail = (userId: string) => {
    return users[userId]?.email || '';
  };

  const pendingTxs = transactions.filter(t => t.status === 'Pending');
  const buyTxs = pendingTxs.filter(t => t.type === 'Buy');
  const sellTxs = pendingTxs.filter(t => t.type === 'Sell');
  const sendTxs = pendingTxs.filter(t => t.type === 'Send' || t.type === 'Receive');
  const depositTxs = pendingTxs.filter(t => t.type === 'Deposit');
  const withdrawalTxs = pendingTxs.filter(t => t.type === 'Withdrawal');
  const completedTxs = transactions.filter(t => t.status === 'Completed');
  const allTxs = transactions;

  const stats = {
    pendingCount: pendingTxs.length,
    pendingGold: pendingTxs.reduce((sum, t) => sum + parseFloat(t.amountGold || '0'), 0),
    pendingUsd: pendingTxs.reduce((sum, t) => sum + parseFloat(t.amountUsd || '0'), 0),
    completedCount: completedTxs.length
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Buy': return <TrendingUp className="w-4 h-4" />;
      case 'Sell': return <ArrowUpRight className="w-4 h-4" />;
      case 'Send': return <Send className="w-4 h-4" />;
      case 'Receive': return <ArrowDownLeft className="w-4 h-4" />;
      case 'Deposit': return <ArrowDownLeft className="w-4 h-4" />;
      case 'Withdrawal': return <ArrowUpRight className="w-4 h-4" />;
      default: return <Coins className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Buy': return 'bg-green-100 text-green-700';
      case 'Sell': return 'bg-red-100 text-red-700';
      case 'Send': return 'bg-blue-100 text-blue-700';
      case 'Receive': return 'bg-purple-100 text-purple-700';
      case 'Deposit': return 'bg-green-100 text-green-700';
      case 'Withdrawal': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const TransactionRow = ({ tx, showActions = true }: { tx: Transaction; showActions?: boolean }) => (
    <div className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50" data-testid={`row-tx-${tx.id}`}>
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getTypeColor(tx.type)}`}>
          {getTypeIcon(tx.type)}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-900">
              {tx.amountGold ? `${parseFloat(tx.amountGold).toFixed(4)}g Gold` : ''}
              {tx.amountGold && tx.amountUsd ? ' / ' : ''}
              {tx.amountUsd ? `$${parseFloat(tx.amountUsd).toFixed(2)}` : ''}
            </span>
            <Badge variant="outline" className="text-xs">{tx.type}</Badge>
          </div>
          <p className="text-sm text-gray-500">{getUserName(tx.userId)}</p>
          {tx.recipientEmail && <p className="text-xs text-gray-400">To: {tx.recipientEmail}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="text-right mr-4">
          <Badge variant={tx.status === 'Pending' ? 'secondary' : tx.status === 'Completed' ? 'default' : 'destructive'}>
            {tx.status}
          </Badge>
          <p className="text-xs text-gray-400 mt-1">{new Date(tx.createdAt).toLocaleString()}</p>
        </div>
        {showActions && tx.status === 'Pending' && (
          <>
            <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => openRejectDialog(tx)} data-testid={`button-reject-${tx.id}`}>
              <XCircle className="w-4 h-4 mr-1" /> Reject
            </Button>
            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleApprove(tx.id)} data-testid={`button-approve-${tx.id}`}>
              <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
            </Button>
          </>
        )}
        <Button size="sm" variant="ghost" onClick={() => openDetails(tx)} data-testid={`button-details-${tx.id}`}>
          <Eye className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">FinaPay Management</h1>
            <p className="text-gray-500">Manage gold transactions, deposits, withdrawals, and transfers.</p>
          </div>
          <Button onClick={fetchData} variant="outline" size="icon" data-testid="button-refresh">
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-yellow-50 border-yellow-100">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-100 text-yellow-700 rounded-lg">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-yellow-900">Pending Approval</p>
                  <h3 className="text-2xl font-bold text-yellow-700" data-testid="text-pending-count">{stats.pendingCount}</h3>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-amber-50 border-amber-100">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-100 text-amber-700 rounded-lg">
                  <Coins className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-amber-900">Pending Gold</p>
                  <h3 className="text-2xl font-bold text-amber-700" data-testid="text-pending-gold">{stats.pendingGold.toFixed(4)}g</h3>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-100">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 text-green-700 rounded-lg">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-green-900">Pending USD</p>
                  <h3 className="text-2xl font-bold text-green-700" data-testid="text-pending-usd">${stats.pendingUsd.toFixed(2)}</h3>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 text-blue-700 rounded-lg">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Completed</p>
                  <h3 className="text-2xl font-bold text-gray-900" data-testid="text-completed-count">{stats.completedCount}</h3>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent space-x-6">
            <TabsTrigger value="pending" className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 py-3 px-1">
              Pending ({pendingTxs.length})
            </TabsTrigger>
            <TabsTrigger value="buy" className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 py-3 px-1">
              Buy Orders ({buyTxs.length})
            </TabsTrigger>
            <TabsTrigger value="sell" className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 py-3 px-1">
              Sell Orders ({sellTxs.length})
            </TabsTrigger>
            <TabsTrigger value="transfers" className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 py-3 px-1">
              Transfers ({sendTxs.length})
            </TabsTrigger>
            <TabsTrigger value="all" className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 py-3 px-1">
              All Transactions
            </TabsTrigger>
          </TabsList>

          <div className="mt-6 space-y-4">
            <TabsContent value="pending">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : pendingTxs.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-gray-500">
                    No pending transactions
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {pendingTxs.map(tx => <TransactionRow key={tx.id} tx={tx} />)}
                </div>
              )}
            </TabsContent>

            <TabsContent value="buy">
              {buyTxs.length === 0 ? (
                <Card><CardContent className="py-12 text-center text-gray-500">No pending buy orders</CardContent></Card>
              ) : (
                <div className="space-y-3">{buyTxs.map(tx => <TransactionRow key={tx.id} tx={tx} />)}</div>
              )}
            </TabsContent>

            <TabsContent value="sell">
              {sellTxs.length === 0 ? (
                <Card><CardContent className="py-12 text-center text-gray-500">No pending sell orders</CardContent></Card>
              ) : (
                <div className="space-y-3">{sellTxs.map(tx => <TransactionRow key={tx.id} tx={tx} />)}</div>
              )}
            </TabsContent>

            <TabsContent value="transfers">
              {sendTxs.length === 0 ? (
                <Card><CardContent className="py-12 text-center text-gray-500">No pending transfers</CardContent></Card>
              ) : (
                <div className="space-y-3">{sendTxs.map(tx => <TransactionRow key={tx.id} tx={tx} />)}</div>
              )}
            </TabsContent>

            <TabsContent value="all">
              {allTxs.length === 0 ? (
                <Card><CardContent className="py-12 text-center text-gray-500">No transactions found</CardContent></Card>
              ) : (
                <div className="space-y-3">{allTxs.map(tx => <TransactionRow key={tx.id} tx={tx} showActions={tx.status === 'Pending'} />)}</div>
              )}
            </TabsContent>
          </div>
        </Tabs>

        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Transaction</DialogTitle>
              <DialogDescription>
                Please provide a reason for rejecting this transaction.
              </DialogDescription>
            </DialogHeader>
            <Textarea
              placeholder="Reason for rejection..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              data-testid="input-reject-reason"
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleReject} data-testid="button-confirm-reject">Reject Transaction</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Transaction Details</DialogTitle>
            </DialogHeader>
            {selectedTx && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Transaction ID</p>
                    <p className="font-mono text-xs">{selectedTx.id}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Type</p>
                    <Badge>{selectedTx.type}</Badge>
                  </div>
                  <div>
                    <p className="text-gray-500">Status</p>
                    <Badge variant={selectedTx.status === 'Pending' ? 'secondary' : selectedTx.status === 'Completed' ? 'default' : 'destructive'}>
                      {selectedTx.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-gray-500">User</p>
                    <p>{getUserName(selectedTx.userId)}</p>
                    <p className="text-xs text-gray-400">{getUserEmail(selectedTx.userId)}</p>
                  </div>
                  {selectedTx.amountGold && (
                    <div>
                      <p className="text-gray-500">Gold Amount</p>
                      <p className="font-bold">{parseFloat(selectedTx.amountGold).toFixed(6)}g</p>
                    </div>
                  )}
                  {selectedTx.amountUsd && (
                    <div>
                      <p className="text-gray-500">USD Amount</p>
                      <p className="font-bold">${parseFloat(selectedTx.amountUsd).toFixed(2)}</p>
                    </div>
                  )}
                  {selectedTx.goldPriceUsdPerGram && (
                    <div>
                      <p className="text-gray-500">Gold Price</p>
                      <p>${parseFloat(selectedTx.goldPriceUsdPerGram).toFixed(2)}/g</p>
                    </div>
                  )}
                  {selectedTx.recipientEmail && (
                    <div>
                      <p className="text-gray-500">Recipient</p>
                      <p>{selectedTx.recipientEmail}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-gray-500">Created</p>
                    <p>{new Date(selectedTx.createdAt).toLocaleString()}</p>
                  </div>
                  {selectedTx.completedAt && (
                    <div>
                      <p className="text-gray-500">Completed</p>
                      <p>{new Date(selectedTx.completedAt).toLocaleString()}</p>
                    </div>
                  )}
                  {selectedTx.approvedBy && (
                    <div>
                      <p className="text-gray-500">Approved By</p>
                      <p>{getUserName(selectedTx.approvedBy)}</p>
                    </div>
                  )}
                  {selectedTx.rejectionReason && (
                    <div className="col-span-2">
                      <p className="text-gray-500">Rejection Reason</p>
                      <p className="text-red-600">{selectedTx.rejectionReason}</p>
                    </div>
                  )}
                  {selectedTx.description && (
                    <div className="col-span-2">
                      <p className="text-gray-500">Description</p>
                      <p>{selectedTx.description}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
