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
import { CheckCircle2, XCircle, ArrowDownLeft, ArrowUpRight, DollarSign, Clock, RefreshCw, TrendingUp, Coins, Send, Eye, Building2, Plus, Edit2, Trash2, CreditCard, Banknote, Bitcoin, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/context/AuthContext';
import AdminOtpModal, { AdminActionType } from '@/components/admin/AdminOtpModal';

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

interface CryptoPaymentRequest {
  id: string;
  userId: string;
  walletConfigId: string;
  amountUsd: string;
  goldGrams: string;
  goldPriceAtTime: string;
  cryptoAmount: string | null;
  transactionHash: string | null;
  proofImageUrl: string | null;
  status: 'Pending' | 'Under Review' | 'Approved' | 'Rejected' | 'Credited' | 'Expired' | 'Cancelled';
  reviewerId: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  rejectionReason: string | null;
  createdAt: string;
  user?: UserInfo | null;
  walletConfig?: {
    id: string;
    networkLabel: string;
    walletAddress: string;
  } | null;
}

export default function FinaPayManagement() {
  const { user: currentUser } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [users, setUsers] = useState<Record<string, UserInfo>>({});
  const [depositRequests, setDepositRequests] = useState<DepositRequest[]>([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [peerTransfers, setPeerTransfers] = useState<PeerTransfer[]>([]);
  const [peerRequests, setPeerRequests] = useState<PeerRequest[]>([]);
  const [cryptoPayments, setCryptoPayments] = useState<CryptoPaymentRequest[]>([]);
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
  
  const [cryptoDialogOpen, setCryptoDialogOpen] = useState(false);
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoPaymentRequest | null>(null);
  const [cryptoReviewNotes, setCryptoReviewNotes] = useState('');
  const [cryptoRejectionReason, setCryptoRejectionReason] = useState('');
  
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otpActionType, setOtpActionType] = useState<AdminActionType>('deposit_approval');
  const [otpTargetId, setOtpTargetId] = useState('');
  const [pendingAction, setPendingAction] = useState<(() => Promise<void>) | null>(null);
  
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
    const adminHeaders = { 
      'X-Admin-User-Id': currentUser?.id || '' 
    };
    try {
      const [txResponse, usersResponse, depositsRes, withdrawalsRes, peerTransfersRes, peerRequestsRes, cryptoRes] = await Promise.all([
        fetch('/api/admin/transactions', { credentials: 'include', headers: adminHeaders }),
        fetch('/api/admin/users', { credentials: 'include', headers: adminHeaders }),
        fetch('/api/admin/deposit-requests', { credentials: 'include', headers: adminHeaders }),
        fetch('/api/admin/withdrawal-requests', { credentials: 'include', headers: adminHeaders }),
        fetch('/api/admin/finapay/peer-transfers', { credentials: 'include', headers: adminHeaders }),
        fetch('/api/admin/finapay/peer-requests', { credentials: 'include', headers: adminHeaders }),
        fetch('/api/admin/crypto-payments', { credentials: 'include', headers: adminHeaders })
      ]);
      
      const txData = await txResponse.json();
      const usersData = await usersResponse.json();
      const depositData = await depositsRes.json();
      const withdrawalData = await withdrawalsRes.json();
      const peerTransfersData = await peerTransfersRes.json();
      const peerRequestsData = await peerRequestsRes.json();
      const cryptoData = cryptoRes.ok ? await cryptoRes.json() : { requests: [] };
      
      setTransactions(txData.transactions || []);
      setDepositRequests(depositData.requests || []);
      setWithdrawalRequests(withdrawalData.requests || []);
      setPeerTransfers(peerTransfersData.transfers || []);
      setPeerRequests(peerRequestsData.requests || []);
      setCryptoPayments(cryptoData.requests || []);
      
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

  const executeDepositAction = async (action: 'Confirmed' | 'Rejected') => {
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

  const handleDepositAction = (action: 'Confirmed' | 'Rejected') => {
    if (!selectedDeposit || !currentUser) return;
    
    const actionType: AdminActionType = action === 'Confirmed' ? 'deposit_approval' : 'deposit_rejection';
    setOtpActionType(actionType);
    setOtpTargetId(selectedDeposit.id);
    setPendingAction(() => () => executeDepositAction(action));
    setOtpModalOpen(true);
  };

  const openWithdrawalDialog = (withdrawal: WithdrawalRequest) => {
    setSelectedWithdrawal(withdrawal);
    setWithdrawalAdminNotes(withdrawal.adminNotes || '');
    setWithdrawalDialogOpen(true);
  };

  const executeWithdrawalAction = async (action: 'Processing' | 'Completed' | 'Rejected') => {
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

  const handleWithdrawalAction = (action: 'Processing' | 'Completed' | 'Rejected') => {
    if (!selectedWithdrawal || !currentUser) return;
    
    const actionType: AdminActionType = action === 'Rejected' ? 'withdrawal_rejection' : 'withdrawal_approval';
    setOtpActionType(actionType);
    setOtpTargetId(selectedWithdrawal.id);
    setPendingAction(() => () => executeWithdrawalAction(action));
    setOtpModalOpen(true);
  };

  const handleOtpVerified = () => {
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
    setOtpModalOpen(false);
  };

  const openCryptoDialog = (payment: CryptoPaymentRequest) => {
    setSelectedCrypto(payment);
    setCryptoReviewNotes(payment.reviewNotes || '');
    setCryptoRejectionReason('');
    setCryptoDialogOpen(true);
  };

  const handleCryptoAction = async (action: 'Credited' | 'Rejected') => {
    if (!selectedCrypto || !currentUser) {
      console.error('[handleCryptoAction] Missing selectedCrypto or currentUser', { selectedCrypto, currentUser });
      return;
    }
    
    try {
      const endpoint = action === 'Credited' 
        ? `/api/admin/crypto-payments/${selectedCrypto.id}/approve`
        : `/api/admin/crypto-payments/${selectedCrypto.id}/reject`;
      
      const body = action === 'Credited'
        ? { reviewNotes: cryptoReviewNotes }
        : { rejectionReason: cryptoRejectionReason, reviewNotes: cryptoReviewNotes };
      
      console.log('[handleCryptoAction] Sending request:', { endpoint, userId: currentUser.id, body });
      
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-User-Id': String(currentUser.id)
        },
        credentials: 'include',
        body: JSON.stringify(body)
      });
      
      console.log('[handleCryptoAction] Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[handleCryptoAction] Error response:', errorData);
        throw new Error(errorData.message || 'Request failed');
      }
      
      toast.success(`Crypto payment ${action === 'Credited' ? 'approved and credited' : 'rejected'}`);
      setCryptoDialogOpen(false);
      setSelectedCrypto(null);
      fetchData();
    } catch (error) {
      console.error('[handleCryptoAction] Caught error:', error);
      toast.error(`Failed to ${action === 'Credited' ? 'approve' : 'reject'} crypto payment`);
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
            <TabsTrigger value="crypto" className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 py-3 px-1">
              <Bitcoin className="w-4 h-4 mr-2" />
              Crypto ({cryptoPayments.length})
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

            <TabsContent value="crypto">
              <h2 className="text-lg font-semibold mb-4">Crypto Payment Requests</h2>
              {cryptoPayments.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-gray-500">
                    <Bitcoin className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No crypto payment requests</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {cryptoPayments.map(payment => (
                    <Card key={payment.id} data-testid={`card-crypto-${payment.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-orange-100 text-orange-700 rounded-lg">
                              <Bitcoin className="w-6 h-6" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-900 text-lg">${parseFloat(payment.amountUsd).toFixed(2)}</span>
                                <Badge variant={
                                  payment.status === 'Credited' ? 'default' :
                                  payment.status === 'Approved' ? 'default' :
                                  payment.status === 'Rejected' ? 'destructive' :
                                  payment.status === 'Under Review' ? 'secondary' : 'outline'
                                } className={
                                  payment.status === 'Credited' ? 'bg-green-100 text-green-800' :
                                  payment.status === 'Approved' ? 'bg-blue-100 text-blue-800' : ''
                                }>
                                  {payment.status}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600">
                                {payment.user ? `${payment.user.firstName} ${payment.user.lastName}` : getUserName(payment.userId)} 
                                {' '}({payment.user?.email || getUserEmail(payment.userId)})
                              </p>
                              <p className="text-xs text-gray-400">
                                {payment.walletConfig?.networkLabel || 'Unknown Network'} • {parseFloat(payment.goldGrams).toFixed(4)}g Gold
                              </p>
                              {payment.transactionHash && (
                                <p className="text-xs text-blue-600 font-mono truncate max-w-xs">
                                  TX: {payment.transactionHash.slice(0, 20)}...
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-xs text-gray-400">{new Date(payment.createdAt).toLocaleString()}</p>
                              {payment.reviewedAt && (
                                <p className="text-xs text-gray-400">Reviewed: {new Date(payment.reviewedAt).toLocaleString()}</p>
                              )}
                            </div>
                            <Button size="sm" onClick={() => openCryptoDialog(payment)} data-testid={`button-review-crypto-${payment.id}`}>
                              {payment.status === 'Pending' || payment.status === 'Under Review' ? 'Review' : <Eye className="w-4 h-4" />}
                            </Button>
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

        <Dialog open={cryptoDialogOpen} onOpenChange={setCryptoDialogOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Crypto Payment Details</DialogTitle>
              <DialogDescription>Review and process this crypto payment request</DialogDescription>
            </DialogHeader>
            {selectedCrypto && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Amount (USD)</p>
                    <p className="font-bold text-xl">${parseFloat(selectedCrypto.amountUsd).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Gold to Credit</p>
                    <p className="font-bold text-xl text-secondary">{parseFloat(selectedCrypto.goldGrams).toFixed(4)}g</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Network</p>
                    <p className="font-medium">{selectedCrypto.walletConfig?.networkLabel || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Status</p>
                    <Badge variant={
                      selectedCrypto.status === 'Credited' ? 'default' :
                      selectedCrypto.status === 'Rejected' ? 'destructive' : 'secondary'
                    }>
                      {selectedCrypto.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-gray-500">Gold Price at Time</p>
                    <p className="font-medium">${parseFloat(selectedCrypto.goldPriceAtTime).toFixed(2)}/g</p>
                  </div>
                  <div>
                    <p className="text-gray-500">User</p>
                    <p className="font-medium">{selectedCrypto.user ? `${selectedCrypto.user.firstName} ${selectedCrypto.user.lastName}` : getUserName(selectedCrypto.userId)}</p>
                    <p className="text-xs text-gray-400">{selectedCrypto.user?.email || getUserEmail(selectedCrypto.userId)}</p>
                  </div>
                </div>

                {selectedCrypto.transactionHash && (
                  <div className="p-3 bg-gray-50 rounded-lg border">
                    <p className="text-gray-500 text-xs mb-1">Transaction Hash</p>
                    <p className="font-mono text-sm break-all">{selectedCrypto.transactionHash}</p>
                    <Button 
                      variant="link" 
                      size="sm" 
                      className="p-0 h-auto mt-1 text-blue-600"
                      onClick={() => {
                        const explorerUrls: Record<string, string> = {
                          'Bitcoin': 'https://blockchair.com/bitcoin/transaction/',
                          'Ethereum': 'https://etherscan.io/tx/',
                          'USDT (TRC20)': 'https://tronscan.org/#/transaction/',
                          'USDT (ERC20)': 'https://etherscan.io/tx/',
                        };
                        const network = selectedCrypto.walletConfig?.networkLabel || '';
                        const baseUrl = explorerUrls[network] || 'https://blockchair.com/search?q=';
                        window.open(`${baseUrl}${selectedCrypto.transactionHash}`, '_blank');
                      }}
                    >
                      <ExternalLink className="w-3 h-3 mr-1" /> View on Explorer
                    </Button>
                  </div>
                )}

                {selectedCrypto.walletConfig && (
                  <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <p className="text-orange-700 text-xs mb-1">Receiving Wallet</p>
                    <p className="font-mono text-sm break-all">{selectedCrypto.walletConfig.walletAddress}</p>
                  </div>
                )}

                {(selectedCrypto.status === 'Pending' || selectedCrypto.status === 'Under Review') && (
                  <div>
                    <Label>Review Notes</Label>
                    <Textarea 
                      value={cryptoReviewNotes}
                      onChange={e => setCryptoReviewNotes(e.target.value)}
                      placeholder="Add notes about this payment..."
                      data-testid="input-crypto-review-notes"
                    />
                  </div>
                )}

                {selectedCrypto.status === 'Pending' || selectedCrypto.status === 'Under Review' ? (
                  <div>
                    <Label>Rejection Reason (if rejecting)</Label>
                    <Textarea 
                      value={cryptoRejectionReason}
                      onChange={e => setCryptoRejectionReason(e.target.value)}
                      placeholder="Required if rejecting..."
                      data-testid="input-crypto-rejection-reason"
                    />
                  </div>
                ) : selectedCrypto.rejectionReason && (
                  <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-red-700 text-xs mb-1">Rejection Reason</p>
                    <p className="text-sm">{selectedCrypto.rejectionReason}</p>
                  </div>
                )}

                {selectedCrypto.reviewNotes && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-blue-700 text-xs mb-1">Admin Notes</p>
                    <p className="text-sm">{selectedCrypto.reviewNotes}</p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setCryptoDialogOpen(false)}>Close</Button>
              {(selectedCrypto?.status === 'Pending' || selectedCrypto?.status === 'Under Review') && (
                <>
                  <Button 
                    variant="destructive" 
                    onClick={() => handleCryptoAction('Rejected')}
                    disabled={!cryptoRejectionReason.trim()}
                    data-testid="button-reject-crypto"
                  >
                    <XCircle className="w-4 h-4 mr-2" /> Reject
                  </Button>
                  <Button 
                    className="bg-green-600 hover:bg-green-700" 
                    onClick={() => handleCryptoAction('Credited')}
                    data-testid="button-credit-crypto"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Approve & Credit Gold
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Process Deposit Request</DialogTitle>
            </DialogHeader>
            {selectedDeposit && (
              <div className="flex gap-6">
                {selectedDeposit.proofOfPayment && (
                  <div className="w-1/2 flex-shrink-0">
                    <p className="text-gray-500 text-sm mb-2">Proof of Payment</p>
                    <div className="border rounded-lg p-2 bg-gray-50">
                      <img 
                        src={selectedDeposit.proofOfPayment} 
                        alt="Proof of Payment" 
                        className="max-w-full max-h-80 object-contain cursor-pointer rounded"
                        onClick={() => {
                          const newWindow = window.open('', '_blank');
                          if (newWindow) {
                            newWindow.document.write(`
                              <html>
                                <head><title>Proof of Payment</title></head>
                                <body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#000;">
                                  <img src="${selectedDeposit.proofOfPayment}" style="max-width:100%;max-height:100vh;object-fit:contain;" />
                                </body>
                              </html>
                            `);
                          }
                        }}
                      />
                      <p className="text-xs text-center text-gray-400 mt-1">Click to view full size</p>
                    </div>
                  </div>
                )}
                
                <div className={`space-y-4 ${selectedDeposit.proofOfPayment ? 'w-1/2' : 'w-full'}`}>
                  <div className="grid grid-cols-2 gap-3 text-sm">
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
                      <p className="text-sm">{getUserName(selectedDeposit.userId)}</p>
                      <p className="text-xs text-gray-400">{getUserEmail(selectedDeposit.userId)}</p>
                    </div>
                    {selectedDeposit.senderBankName && (
                      <>
                        <div>
                          <p className="text-gray-500">Sender Bank</p>
                          <p className="text-sm">{selectedDeposit.senderBankName}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Sender Account</p>
                          <p className="text-sm">{selectedDeposit.senderAccountName}</p>
                        </div>
                      </>
                    )}
                    <div className="col-span-2">
                      <p className="text-gray-500">Submitted</p>
                      <p className="text-sm">{new Date(selectedDeposit.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  
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

        {/* Admin OTP Verification Modal */}
        <AdminOtpModal
          isOpen={otpModalOpen}
          onClose={() => {
            setOtpModalOpen(false);
            setPendingAction(null);
          }}
          onVerified={handleOtpVerified}
          actionType={otpActionType}
          targetId={otpTargetId}
          targetType={otpActionType.includes('deposit') ? 'deposit_request' : 'withdrawal_request'}
          adminUserId={currentUser?.id || ''}
        />
      </div>
    </AdminLayout>
  );
}
