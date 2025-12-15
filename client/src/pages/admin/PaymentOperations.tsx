import React, { useState, useEffect } from 'react';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, XCircle, ArrowDownLeft, ArrowUpRight, DollarSign, Clock, RefreshCw, TrendingUp, Coins, Send, Eye, Building2, Plus, Edit2, Trash2, CreditCard, Banknote } from 'lucide-react';
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


interface DepositRequest {
  id: string;
  userId: string;
  bankAccountId: string;
  amountUsd: string;
  referenceNumber: string;
  proofOfPayment: string | null;
  senderBankName: string | null;
  senderAccountName: string | null;
  status: 'Pending' | 'Confirmed' | 'Rejected';
  adminNotes: string | null;
  processedBy: string | null;
  processedAt: string | null;
  createdAt: string;
}

interface WithdrawalRequest {
  id: string;
  userId: string;
  amountUsd: string;
  referenceNumber: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  routingNumber: string | null;
  swiftCode: string | null;
  status: 'Pending' | 'Processing' | 'Completed' | 'Rejected';
  adminNotes: string | null;
  processedBy: string | null;
  processedAt: string | null;
  createdAt: string;
}

interface PeerTransfer {
  id: string;
  senderId: string;
  recipientId: string;
  amountUsd: string;
  channel: 'email' | 'finatrades_id' | 'qr_code';
  memo: string | null;
  referenceNumber: string;
  status: 'Completed' | 'Failed';
  createdAt: string;
}

interface PeerRequest {
  id: string;
  requesterId: string;
  targetId: string | null;
  amountUsd: string;
  channel: 'email' | 'finatrades_id' | 'qr_code';
  memo: string | null;
  referenceNumber: string;
  status: 'Pending' | 'Paid' | 'Declined' | 'Expired';
  paidAt: string | null;
  paidBy: string | null;
  createdAt: string;
  expiresAt: string;
}

export default function FinaPayManagement() {
  const { user: currentUser } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [users, setUsers] = useState<Record<string, UserInfo>>({});
  const [depositRequests, setDepositRequests] = useState<DepositRequest[]>([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [peerTransfers, setPeerTransfers] = useState<PeerTransfer[]>([]);
  const [peerRequests, setPeerRequests] = useState<PeerRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  
  
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const [selectedDeposit, setSelectedDeposit] = useState<DepositRequest | null>(null);
  const [depositAdminNotes, setDepositAdminNotes] = useState('');
  
  const [withdrawalDialogOpen, setWithdrawalDialogOpen] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [withdrawalAdminNotes, setWithdrawalAdminNotes] = useState('');
  
  const [bankAccountDialogOpen, setBankAccountDialogOpen] = useState(false);
  const [editingBankAccount, setEditingBankAccount] = useState<any>(null);
  const [bankAccountForm, setBankAccountForm] = useState({
    bankName: '',
    accountName: '',
    accountNumber: '',
    routingNumber: '',
    swiftCode: '',
    iban: '',
    currency: 'USD',
    isActive: true
  });

  const handleSaveBankAccount = async () => {
    try {
      if (editingBankAccount) {
        await apiRequest('PUT', `/api/admin/bank-accounts/${editingBankAccount.id}`, bankAccountForm);
        toast.success("Bank account updated successfully");
      } else {
        await apiRequest('POST', '/api/admin/bank-accounts', bankAccountForm);
        toast.success("Bank account created successfully");
      }
      setBankAccountDialogOpen(false);
      setEditingBankAccount(null);
      setBankAccountForm({
        bankName: '',
        accountName: '',
        accountNumber: '',
        routingNumber: '',
        swiftCode: '',
        iban: '',
        currency: 'USD',
        isActive: true
      });
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save bank account");
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [txResponse, usersResponse, depositsRes, withdrawalsRes, peerTransfersRes, peerRequestsRes] = await Promise.all([
        fetch('/api/admin/transactions'),
        fetch('/api/admin/users'),
        fetch('/api/admin/deposit-requests'),
        fetch('/api/admin/withdrawal-requests'),
        fetch('/api/admin/finapay/peer-transfers'),
        fetch('/api/admin/finapay/peer-requests')
      ]);
      
      const txData = await txResponse.json();
      const usersData = await usersResponse.json();
      const depositData = await depositsRes.json();
      const withdrawalData = await withdrawalsRes.json();
      const peerTransfersData = await peerTransfersRes.json();
      const peerRequestsData = await peerRequestsRes.json();
      
      setTransactions(txData.transactions || []);
      setDepositRequests(depositData.requests || []);
      setWithdrawalRequests(withdrawalData.requests || []);
      setPeerTransfers(peerTransfersData.transfers || []);
      setPeerRequests(peerRequestsData.requests || []);
      
      const userMap: Record<string, UserInfo> = {};
      (usersData.users || []).forEach((u: UserInfo) => {
        userMap[u.id] = u;
      });
      setUsers(userMap);
    } catch (error) {
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
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


  const openDepositDialog = (deposit: DepositRequest) => {
    setSelectedDeposit(deposit);
    setDepositAdminNotes(deposit.adminNotes || '');
    setDepositDialogOpen(true);
  };

  const handleDepositAction = async (action: 'Confirmed' | 'Rejected') => {
    if (!selectedDeposit) return;
    try {
      await apiRequest('PATCH', `/api/admin/deposit-requests/${selectedDeposit.id}`, {
        status: action,
        adminNotes: depositAdminNotes,
        processedBy: currentUser?.id
      });
      toast.success(`Deposit ${action.toLowerCase()}`);
      setDepositDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error(`Failed to ${action.toLowerCase()} deposit`);
    }
  };

  const openWithdrawalDialog = (withdrawal: WithdrawalRequest) => {
    setSelectedWithdrawal(withdrawal);
    setWithdrawalAdminNotes(withdrawal.adminNotes || '');
    setWithdrawalDialogOpen(true);
  };

  const handleWithdrawalAction = async (action: 'Processing' | 'Completed' | 'Rejected') => {
    if (!selectedWithdrawal) return;
    try {
      await apiRequest('PATCH', `/api/admin/withdrawal-requests/${selectedWithdrawal.id}`, {
        status: action,
        adminNotes: withdrawalAdminNotes,
        processedBy: currentUser?.id
      });
      toast.success(`Withdrawal ${action.toLowerCase()}`);
      setWithdrawalDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error(`Failed to update withdrawal`);
    }
  };

  const pendingDeposits = depositRequests.filter(d => d.status === 'Pending');
  const pendingWithdrawals = withdrawalRequests.filter(w => w.status === 'Pending' || w.status === 'Processing');
  const pendingTxs = transactions.filter(t => t.status === 'Pending');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending': return <Badge variant="secondary">{status}</Badge>;
      case 'Processing': return <Badge className="bg-blue-100 text-blue-700">{status}</Badge>;
      case 'Confirmed':
      case 'Completed': return <Badge className="bg-green-100 text-green-700">{status}</Badge>;
      case 'Rejected': return <Badge variant="destructive">{status}</Badge>;
      default: return <Badge>{status}</Badge>;
    }
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
            <p className="text-gray-500">Manage bank accounts, deposits, withdrawals, and transactions.</p>
          </div>
          <Button onClick={fetchData} variant="outline" size="icon" data-testid="button-refresh">
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-green-50 border-green-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 text-green-700 rounded-lg">
                  <ArrowDownLeft className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-green-900">Pending Deposits</p>
                  <h3 className="text-xl font-bold text-green-700" data-testid="text-pending-deposits">{pendingDeposits.length}</h3>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-orange-50 border-orange-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 text-orange-700 rounded-lg">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-orange-900">Pending Withdrawals</p>
                  <h3 className="text-xl font-bold text-orange-700" data-testid="text-pending-withdrawals">{pendingWithdrawals.length}</h3>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-yellow-50 border-yellow-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 text-yellow-700 rounded-lg">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-yellow-900">Pending Transactions</p>
                  <h3 className="text-xl font-bold text-yellow-700" data-testid="text-pending-tx">{pendingTxs.length}</h3>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-900">Total Transactions</p>
                  <h3 className="text-xl font-bold text-gray-900" data-testid="text-total-tx">{transactions.length}</h3>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="deposits" className="w-full">
          <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent space-x-6">
            <TabsTrigger value="deposits" className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 py-3 px-1">
              <ArrowDownLeft className="w-4 h-4 mr-2" />
              Deposits ({depositRequests.length})
            </TabsTrigger>
            <TabsTrigger value="withdrawals" className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 py-3 px-1">
              <ArrowUpRight className="w-4 h-4 mr-2" />
              Withdrawals ({withdrawalRequests.length})
            </TabsTrigger>
            <TabsTrigger value="transactions" className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 py-3 px-1">
              <Coins className="w-4 h-4 mr-2" />
              Transactions ({transactions.length})
            </TabsTrigger>
            <TabsTrigger value="peer-transfers" className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 py-3 px-1">
              <Send className="w-4 h-4 mr-2" />
              Peer Transfers ({peerTransfers.length})
            </TabsTrigger>
            <TabsTrigger value="peer-requests" className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 py-3 px-1">
              <CreditCard className="w-4 h-4 mr-2" />
              Peer Requests ({peerRequests.length})
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="deposits">
              <h2 className="text-lg font-semibold mb-4">Deposit Requests</h2>
              {depositRequests.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-gray-500">
                    <ArrowDownLeft className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No deposit requests</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {depositRequests.map(deposit => (
                      <Card key={deposit.id} data-testid={`card-deposit-${deposit.id}`}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="p-3 bg-green-100 text-green-700 rounded-lg">
                                <ArrowDownLeft className="w-6 h-6" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-gray-900 text-lg">${parseFloat(deposit.amountUsd).toFixed(2)}</span>
                                  {getStatusBadge(deposit.status)}
                                </div>
                                <p className="text-sm text-gray-600">{getUserName(deposit.userId)} ({getUserEmail(deposit.userId)})</p>
                                <p className="text-xs text-gray-400">Ref: {deposit.referenceNumber}</p>
                                {deposit.senderBankName && (
                                  <p className="text-xs text-gray-400">From: {deposit.senderBankName} ({deposit.senderAccountName})</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="text-xs text-gray-400">{new Date(deposit.createdAt).toLocaleString()}</p>
                                {deposit.processedAt && (
                                  <p className="text-xs text-gray-400">Processed: {new Date(deposit.processedAt).toLocaleString()}</p>
                                )}
                              </div>
                              {deposit.status === 'Pending' && (
                                <Button size="sm" onClick={() => openDepositDialog(deposit)} data-testid={`button-process-deposit-${deposit.id}`}>
                                  Process
                                </Button>
                              )}
                              {deposit.status !== 'Pending' && (
                                <Button size="sm" variant="ghost" onClick={() => openDepositDialog(deposit)}>
                                  <Eye className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="withdrawals">
              <h2 className="text-lg font-semibold mb-4">Withdrawal Requests</h2>
              {withdrawalRequests.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-gray-500">
                    <ArrowUpRight className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No withdrawal requests</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {withdrawalRequests.map(withdrawal => (
                    <Card key={withdrawal.id} data-testid={`card-withdrawal-${withdrawal.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-orange-100 text-orange-700 rounded-lg">
                              <ArrowUpRight className="w-6 h-6" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-900 text-lg">${parseFloat(withdrawal.amountUsd).toFixed(2)}</span>
                                {getStatusBadge(withdrawal.status)}
                              </div>
                              <p className="text-sm text-gray-600">{getUserName(withdrawal.userId)} ({getUserEmail(withdrawal.userId)})</p>
                              <p className="text-xs text-gray-400">Ref: {withdrawal.referenceNumber}</p>
                              <p className="text-xs text-gray-400">
                                To: {withdrawal.bankName} - {withdrawal.accountName} ({withdrawal.accountNumber})
                              </p>
                              {withdrawal.swiftCode && <p className="text-xs text-gray-400">SWIFT: {withdrawal.swiftCode}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-xs text-gray-400">{new Date(withdrawal.createdAt).toLocaleString()}</p>
                              {withdrawal.processedAt && (
                                <p className="text-xs text-gray-400">Processed: {new Date(withdrawal.processedAt).toLocaleString()}</p>
                              )}
                            </div>
                            {(withdrawal.status === 'Pending' || withdrawal.status === 'Processing') && (
                              <Button size="sm" onClick={() => openWithdrawalDialog(withdrawal)} data-testid={`button-process-withdrawal-${withdrawal.id}`}>
                                Process
                              </Button>
                            )}
                            {withdrawal.status !== 'Pending' && withdrawal.status !== 'Processing' && (
                              <Button size="sm" variant="ghost" onClick={() => openWithdrawalDialog(withdrawal)}>
                                <Eye className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="transactions">
              <h2 className="text-lg font-semibold mb-4">All Transactions</h2>
              {transactions.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-gray-500">
                    No transactions found
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {transactions.map(tx => <TransactionRow key={tx.id} tx={tx} showActions={tx.status === 'Pending'} />)}
                </div>
              )}
            </TabsContent>

            <TabsContent value="peer-transfers">
              <h2 className="text-lg font-semibold mb-4">Peer-to-Peer Transfers</h2>
              {peerTransfers.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-gray-500">
                    <Send className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No peer transfers yet</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {peerTransfers.map(transfer => (
                    <Card key={transfer.id} data-testid={`card-peer-transfer-${transfer.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-100 text-blue-700 rounded-lg">
                              <Send className="w-6 h-6" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-900 text-lg">${parseFloat(transfer.amountUsd).toFixed(2)}</span>
                                <Badge variant={transfer.status === 'Completed' ? 'default' : 'destructive'}>{transfer.status}</Badge>
                              </div>
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">{getUserName(transfer.senderId)}</span>
                                <span className="mx-2">→</span>
                                <span className="font-medium">{getUserName(transfer.recipientId)}</span>
                              </p>
                              <p className="text-xs text-gray-400">
                                Ref: {transfer.referenceNumber} | Channel: {transfer.channel.replace('_', ' ')}
                              </p>
                              {transfer.memo && (
                                <p className="text-xs text-gray-500 mt-1 italic">"{transfer.memo}"</p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-400">{new Date(transfer.createdAt).toLocaleString()}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="peer-requests">
              <h2 className="text-lg font-semibold mb-4">Payment Requests</h2>
              {peerRequests.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-gray-500">
                    <CreditCard className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No payment requests yet</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {peerRequests.map(request => (
                    <Card key={request.id} data-testid={`card-peer-request-${request.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-lg ${
                              request.status === 'Paid' ? 'bg-green-100 text-green-700' :
                              request.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                              request.status === 'Declined' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              <CreditCard className="w-6 h-6" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-900 text-lg">${parseFloat(request.amountUsd).toFixed(2)}</span>
                                <Badge variant={
                                  request.status === 'Paid' ? 'default' :
                                  request.status === 'Pending' ? 'secondary' :
                                  request.status === 'Declined' ? 'destructive' :
                                  'outline'
                                }>{request.status}</Badge>
                              </div>
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Requested by: {getUserName(request.requesterId)}</span>
                                {request.targetId && (
                                  <span className="ml-2">→ {getUserName(request.targetId)}</span>
                                )}
                              </p>
                              <p className="text-xs text-gray-400">
                                Ref: {request.referenceNumber} | Channel: {request.channel.replace('_', ' ')}
                              </p>
                              {request.memo && (
                                <p className="text-xs text-gray-500 mt-1 italic">"{request.memo}"</p>
                              )}
                              {request.paidBy && (
                                <p className="text-xs text-green-600 mt-1">Paid by: {getUserName(request.paidBy)}</p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-400">{new Date(request.createdAt).toLocaleString()}</p>
                            <p className="text-xs text-gray-400">Expires: {new Date(request.expiresAt).toLocaleDateString()}</p>
                            {request.paidAt && (
                              <p className="text-xs text-green-600">Paid: {new Date(request.paidAt).toLocaleString()}</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>

        <Dialog open={bankAccountDialogOpen} onOpenChange={setBankAccountDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingBankAccount ? 'Edit Bank Account' : 'Add Bank Account'}</DialogTitle>
              <DialogDescription>Configure platform bank account for user deposits</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Bank Name</Label>
                  <Input value={bankAccountForm.bankName} onChange={e => setBankAccountForm({...bankAccountForm, bankName: e.target.value})} placeholder="e.g., Chase Bank" data-testid="input-bank-name" />
                </div>
                <div>
                  <Label>Account Name</Label>
                  <Input value={bankAccountForm.accountName} onChange={e => setBankAccountForm({...bankAccountForm, accountName: e.target.value})} placeholder="e.g., Finatrades LLC" data-testid="input-account-name" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Account Number</Label>
                  <Input value={bankAccountForm.accountNumber} onChange={e => setBankAccountForm({...bankAccountForm, accountNumber: e.target.value})} placeholder="Account number" data-testid="input-account-number" />
                </div>
                <div>
                  <Label>Routing Number</Label>
                  <Input value={bankAccountForm.routingNumber} onChange={e => setBankAccountForm({...bankAccountForm, routingNumber: e.target.value})} placeholder="Optional" data-testid="input-routing-number" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>SWIFT Code</Label>
                  <Input value={bankAccountForm.swiftCode} onChange={e => setBankAccountForm({...bankAccountForm, swiftCode: e.target.value})} placeholder="Optional" data-testid="input-swift-code" />
                </div>
                <div>
                  <Label>IBAN</Label>
                  <Input value={bankAccountForm.iban} onChange={e => setBankAccountForm({...bankAccountForm, iban: e.target.value})} placeholder="Optional" data-testid="input-iban" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Currency</Label>
                  <Select value={bankAccountForm.currency} onValueChange={v => setBankAccountForm({...bankAccountForm, currency: v})}>
                    <SelectTrigger data-testid="select-currency"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="AED">AED</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Country</Label>
                  <Input value={bankAccountForm.country} onChange={e => setBankAccountForm({...bankAccountForm, country: e.target.value})} placeholder="e.g., USA" data-testid="input-country" />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={bankAccountForm.status} onValueChange={v => setBankAccountForm({...bankAccountForm, status: v as 'Active' | 'Inactive'})}>
                    <SelectTrigger data-testid="select-status"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBankAccountDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveBankAccount} data-testid="button-save-bank-account">Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={depositDialogOpen} onOpenChange={setDepositDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Process Deposit Request</DialogTitle>
            </DialogHeader>
            {selectedDeposit && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Amount</p>
                    <p className="font-bold text-lg">${parseFloat(selectedDeposit.amountUsd).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Status</p>
                    {getStatusBadge(selectedDeposit.status)}
                  </div>
                  <div>
                    <p className="text-gray-500">Reference</p>
                    <p className="font-mono text-xs">{selectedDeposit.referenceNumber}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">User</p>
                    <p>{getUserName(selectedDeposit.userId)}</p>
                    <p className="text-xs text-gray-400">{getUserEmail(selectedDeposit.userId)}</p>
                  </div>
                  {selectedDeposit.senderBankName && (
                    <>
                      <div>
                        <p className="text-gray-500">Sender Bank</p>
                        <p>{selectedDeposit.senderBankName}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Sender Account</p>
                        <p>{selectedDeposit.senderAccountName}</p>
                      </div>
                    </>
                  )}
                  <div className="col-span-2">
                    <p className="text-gray-500">Submitted</p>
                    <p>{new Date(selectedDeposit.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                
                {selectedDeposit.proofOfPayment && (
                  <div>
                    <p className="text-gray-500 text-sm mb-2">Proof of Payment</p>
                    <a href={selectedDeposit.proofOfPayment} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-sm">
                      View Document
                    </a>
                  </div>
                )}
                
                <div>
                  <Label>Admin Notes</Label>
                  <Textarea 
                    value={depositAdminNotes} 
                    onChange={e => setDepositAdminNotes(e.target.value)} 
                    placeholder="Add notes about this deposit..."
                    disabled={selectedDeposit.status !== 'Pending'}
                    data-testid="input-deposit-notes"
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDepositDialogOpen(false)}>Close</Button>
              {selectedDeposit?.status === 'Pending' && (
                <>
                  <Button variant="destructive" onClick={() => handleDepositAction('Rejected')} data-testid="button-reject-deposit">
                    <XCircle className="w-4 h-4 mr-2" /> Reject
                  </Button>
                  <Button className="bg-green-600 hover:bg-green-700" onClick={() => handleDepositAction('Confirmed')} data-testid="button-confirm-deposit">
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Confirm Deposit
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={withdrawalDialogOpen} onOpenChange={setWithdrawalDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Process Withdrawal Request</DialogTitle>
            </DialogHeader>
            {selectedWithdrawal && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Amount</p>
                    <p className="font-bold text-lg">${parseFloat(selectedWithdrawal.amountUsd).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Status</p>
                    {getStatusBadge(selectedWithdrawal.status)}
                  </div>
                  <div>
                    <p className="text-gray-500">Reference</p>
                    <p className="font-mono text-xs">{selectedWithdrawal.referenceNumber}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">User</p>
                    <p>{getUserName(selectedWithdrawal.userId)}</p>
                    <p className="text-xs text-gray-400">{getUserEmail(selectedWithdrawal.userId)}</p>
                  </div>
                  <div className="col-span-2 p-3 bg-gray-50 rounded-lg">
                    <p className="text-gray-500 text-xs mb-1">Withdrawal Bank Details</p>
                    <p className="font-medium">{selectedWithdrawal.bankName}</p>
                    <p className="text-sm">{selectedWithdrawal.accountName}</p>
                    <p className="text-sm text-gray-600">{selectedWithdrawal.accountNumber}</p>
                    {selectedWithdrawal.routingNumber && <p className="text-xs text-gray-400">Routing: {selectedWithdrawal.routingNumber}</p>}
                    {selectedWithdrawal.swiftCode && <p className="text-xs text-gray-400">SWIFT: {selectedWithdrawal.swiftCode}</p>}
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-500">Submitted</p>
                    <p>{new Date(selectedWithdrawal.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                
                <div>
                  <Label>Admin Notes</Label>
                  <Textarea 
                    value={withdrawalAdminNotes} 
                    onChange={e => setWithdrawalAdminNotes(e.target.value)} 
                    placeholder="Add notes about this withdrawal..."
                    disabled={selectedWithdrawal.status === 'Completed' || selectedWithdrawal.status === 'Rejected'}
                    data-testid="input-withdrawal-notes"
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setWithdrawalDialogOpen(false)}>Close</Button>
              {selectedWithdrawal?.status === 'Pending' && (
                <>
                  <Button variant="destructive" onClick={() => handleWithdrawalAction('Rejected')} data-testid="button-reject-withdrawal">
                    <XCircle className="w-4 h-4 mr-2" /> Reject
                  </Button>
                  <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => handleWithdrawalAction('Processing')} data-testid="button-processing-withdrawal">
                    <Clock className="w-4 h-4 mr-2" /> Mark Processing
                  </Button>
                  <Button className="bg-green-600 hover:bg-green-700" onClick={() => handleWithdrawalAction('Completed')} data-testid="button-complete-withdrawal">
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Complete
                  </Button>
                </>
              )}
              {selectedWithdrawal?.status === 'Processing' && (
                <>
                  <Button variant="destructive" onClick={() => handleWithdrawalAction('Rejected')} data-testid="button-reject-withdrawal">
                    <XCircle className="w-4 h-4 mr-2" /> Reject
                  </Button>
                  <Button className="bg-green-600 hover:bg-green-700" onClick={() => handleWithdrawalAction('Completed')} data-testid="button-complete-withdrawal">
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Complete
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
