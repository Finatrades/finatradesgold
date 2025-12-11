import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  CheckCircle2, XCircle, ArrowDownLeft, ArrowUpRight, DollarSign, 
  Clock, AlertCircle, CreditCard, FileText, Plus, Search, User,
  Wallet, HandCoins
} from 'lucide-react';
import { toast } from 'sonner';

interface UserData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  finatradesId: string | null;
}

interface WalletData {
  id: string;
  userId: string;
  goldGrams: string;
  usdBalance: string;
  eurBalance: string;
}

interface TransactionData {
  id: string;
  userId: string;
  type: string;
  amount: string;
  currency: string;
  status: string;
  createdAt: string;
}

export default function FinaPayManagement() {
  const queryClient = useQueryClient();
  const [showManualDialog, setShowManualDialog] = useState(false);
  const [operationType, setOperationType] = useState<'deposit' | 'withdrawal'>('deposit');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('usd');
  const [notes, setNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: usersData } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const response = await fetch('/api/admin/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    },
  });

  const { data: walletsData } = useQuery({
    queryKey: ['admin-wallets'],
    queryFn: async () => {
      const response = await fetch('/api/admin/wallets');
      if (!response.ok) throw new Error('Failed to fetch wallets');
      return response.json();
    },
  });

  const { data: transactionsData } = useQuery({
    queryKey: ['admin-transactions'],
    queryFn: async () => {
      const response = await fetch('/api/admin/transactions');
      if (!response.ok) throw new Error('Failed to fetch transactions');
      return response.json();
    },
  });

  const users: UserData[] = usersData?.users || [];
  const wallets: WalletData[] = walletsData?.wallets || [];
  const transactions: TransactionData[] = transactionsData?.transactions || [];

  const manualOperationMutation = useMutation({
    mutationFn: async (data: { userId: string; type: 'deposit' | 'withdrawal'; amount: string; currency: string; notes: string }) => {
      const response = await fetch('/api/admin/manual-operation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Operation failed');
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      toast.success(`${variables.type === 'deposit' ? 'Deposit' : 'Withdrawal'} completed successfully`);
      queryClient.invalidateQueries({ queryKey: ['admin-wallets'] });
      queryClient.invalidateQueries({ queryKey: ['admin-transactions'] });
      closeDialog();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Operation failed');
    },
  });

  const openDepositDialog = () => {
    setOperationType('deposit');
    setShowManualDialog(true);
  };

  const openWithdrawalDialog = () => {
    setOperationType('withdrawal');
    setShowManualDialog(true);
  };

  const closeDialog = () => {
    setShowManualDialog(false);
    setSelectedUserId('');
    setAmount('');
    setCurrency('usd');
    setNotes('');
  };

  const handleSubmit = () => {
    if (!selectedUserId) {
      toast.error('Please select a user');
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    manualOperationMutation.mutate({
      userId: selectedUserId,
      type: operationType,
      amount: numAmount.toString(),
      currency,
      notes,
    });
  };

  const filteredUsers = users.filter(u => 
    u.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.finatradesId && u.finatradesId.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getUserWallet = (userId: string) => wallets.find(w => w.userId === userId);
  const getUser = (userId: string) => users.find(u => u.id === userId);

  const totalUsdBalance = wallets.reduce((sum, w) => sum + parseFloat(w.usdBalance || '0'), 0);
  const totalEurBalance = wallets.reduce((sum, w) => sum + parseFloat(w.eurBalance || '0'), 0);
  const totalGoldGrams = wallets.reduce((sum, w) => sum + parseFloat(w.goldGrams || '0'), 0);

  const pendingDeposits = transactions.filter(t => t.type === 'Deposit' && t.status === 'Pending');
  const pendingWithdrawals = transactions.filter(t => t.type === 'Withdrawal' && t.status === 'Pending');

  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 20);

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900" data-testid="text-page-title">FinaPay Management</h1>
            <p className="text-gray-500">Manage fiat deposits, withdrawals, and digital wallet operations.</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={openDepositDialog} className="bg-green-600 hover:bg-green-700" data-testid="button-manual-deposit">
              <ArrowDownLeft className="w-4 h-4 mr-2" />
              Manual Deposit
            </Button>
            <Button onClick={openWithdrawalDialog} variant="outline" className="border-orange-500 text-orange-600 hover:bg-orange-50" data-testid="button-manual-withdrawal">
              <ArrowUpRight className="w-4 h-4 mr-2" />
              Manual Withdrawal
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-blue-50 border-blue-100">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 text-blue-700 rounded-lg">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-900">Total USD</p>
                  <h3 className="text-2xl font-bold text-blue-700" data-testid="text-total-usd">${totalUsdBalance.toLocaleString()}</h3>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-purple-50 border-purple-100">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 text-purple-700 rounded-lg">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-purple-900">Total EUR</p>
                  <h3 className="text-2xl font-bold text-purple-700" data-testid="text-total-eur">€{totalEurBalance.toLocaleString()}</h3>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-orange-50 border-orange-100">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-100 text-orange-700 rounded-lg">
                  <HandCoins className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-orange-900">Total Gold</p>
                  <h3 className="text-2xl font-bold text-orange-700" data-testid="text-total-gold">{totalGoldGrams.toFixed(2)}g</h3>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 text-green-700 rounded-lg">
                  <Wallet className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Active Wallets</p>
                  <h3 className="text-2xl font-bold text-gray-900" data-testid="text-active-wallets">{wallets.length}</h3>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="wallets" className="w-full">
          <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent space-x-6">
            <TabsTrigger value="wallets" className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 py-3 px-1">
              User Wallets
            </TabsTrigger>
            <TabsTrigger value="pending" className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 py-3 px-1">
              Pending Operations ({pendingDeposits.length + pendingWithdrawals.length})
            </TabsTrigger>
            <TabsTrigger value="txs" className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 py-3 px-1">
              Transaction Log
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="wallets">
              <Card>
                <CardHeader>
                  <CardTitle>All User Wallets</CardTitle>
                  <CardDescription>View and manage user wallet balances</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {wallets.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                        <Wallet className="w-12 h-12 mb-4 text-gray-300" />
                        <p>No wallets found</p>
                      </div>
                    ) : (
                      wallets.map((wallet) => {
                        const user = getUser(wallet.userId);
                        return (
                          <div key={wallet.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50" data-testid={`card-wallet-${wallet.id}`}>
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold">
                                {user ? `${user.firstName[0]}${user.lastName[0]}` : '??'}
                              </div>
                              <div>
                                <p className="font-bold text-gray-900">{user ? `${user.firstName} ${user.lastName}` : 'Unknown User'}</p>
                                <p className="text-sm text-gray-500">{user?.email} | {user?.finatradesId}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-6">
                              <div className="text-right">
                                <p className="text-sm text-gray-500">USD</p>
                                <p className="font-bold text-blue-600">${parseFloat(wallet.usdBalance).toLocaleString()}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-gray-500">EUR</p>
                                <p className="font-bold text-purple-600">€{parseFloat(wallet.eurBalance).toLocaleString()}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-gray-500">Gold</p>
                                <p className="font-bold text-orange-600">{parseFloat(wallet.goldGrams).toFixed(4)}g</p>
                              </div>
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedUserId(wallet.userId);
                                    openDepositDialog();
                                  }}
                                  data-testid={`button-deposit-${wallet.id}`}
                                >
                                  <ArrowDownLeft className="w-4 h-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedUserId(wallet.userId);
                                    openWithdrawalDialog();
                                  }}
                                  data-testid={`button-withdraw-${wallet.id}`}
                                >
                                  <ArrowUpRight className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pending">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Pending Deposits</CardTitle>
                    <CardDescription>Review and confirm incoming deposits</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {pendingDeposits.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                        <CheckCircle2 className="w-8 h-8 mb-2 text-green-300" />
                        <p className="text-sm">No pending deposits</p>
                      </div>
                    ) : (
                      pendingDeposits.map((tx) => {
                        const user = getUser(tx.userId);
                        return (
                          <div key={tx.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-green-100 text-green-700 rounded-full flex items-center justify-center">
                                <ArrowDownLeft className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="font-bold text-gray-900">{tx.currency} {tx.amount}</p>
                                <p className="text-sm text-gray-500">{user ? `${user.firstName} ${user.lastName}` : 'Unknown'}</p>
                              </div>
                            </div>
                            <Badge variant="secondary">Pending</Badge>
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Pending Withdrawals</CardTitle>
                    <CardDescription>Approve outgoing transfers</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {pendingWithdrawals.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                        <CheckCircle2 className="w-8 h-8 mb-2 text-green-300" />
                        <p className="text-sm">No pending withdrawals</p>
                      </div>
                    ) : (
                      pendingWithdrawals.map((tx) => {
                        const user = getUser(tx.userId);
                        return (
                          <div key={tx.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center">
                                <ArrowUpRight className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="font-bold text-gray-900">{tx.currency} {tx.amount}</p>
                                <p className="text-sm text-gray-500">{user ? `${user.firstName} ${user.lastName}` : 'Unknown'}</p>
                              </div>
                            </div>
                            <Badge variant="secondary">Pending</Badge>
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="txs">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Transactions</CardTitle>
                  <CardDescription>View all wallet transactions</CardDescription>
                </CardHeader>
                <CardContent>
                  {recentTransactions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                      <FileText className="w-12 h-12 mb-4 text-gray-300" />
                      <p>No transactions yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {recentTransactions.map((tx) => {
                        const user = getUser(tx.userId);
                        return (
                          <div key={tx.id} className="flex items-center justify-between p-3 border-b border-gray-50 hover:bg-gray-50">
                            <div className="flex items-center gap-4">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                tx.type === 'Deposit' ? 'bg-green-100 text-green-700' : 
                                tx.type === 'Withdrawal' ? 'bg-orange-100 text-orange-700' : 
                                'bg-blue-100 text-blue-700'
                              }`}>
                                {tx.type === 'Deposit' ? <ArrowDownLeft className="w-4 h-4" /> : 
                                 tx.type === 'Withdrawal' ? <ArrowUpRight className="w-4 h-4" /> :
                                 <DollarSign className="w-4 h-4" />}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{tx.type}</p>
                                <p className="text-xs text-gray-500">{user ? `${user.firstName} ${user.lastName}` : tx.userId}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`font-bold ${tx.type === 'Deposit' ? 'text-green-600' : tx.type === 'Withdrawal' ? 'text-red-600' : 'text-gray-900'}`}>
                                {tx.type === 'Deposit' ? '+' : tx.type === 'Withdrawal' ? '-' : ''}{tx.currency} {tx.amount}
                              </p>
                              <p className="text-xs text-gray-500">{new Date(tx.createdAt).toLocaleString()}</p>
                            </div>
                            <Badge variant={tx.status === 'Completed' ? 'default' : tx.status === 'Failed' ? 'destructive' : 'secondary'}>
                              {tx.status}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      <Dialog open={showManualDialog} onOpenChange={setShowManualDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {operationType === 'deposit' ? (
                <>
                  <ArrowDownLeft className="w-5 h-5 text-green-600" />
                  Manual Deposit
                </>
              ) : (
                <>
                  <ArrowUpRight className="w-5 h-5 text-orange-600" />
                  Manual Withdrawal
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {operationType === 'deposit' 
                ? 'Add funds to a user\'s wallet manually'
                : 'Deduct funds from a user\'s wallet manually'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select User *</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger data-testid="select-user">
                  <SelectValue placeholder="Search and select user..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.firstName} {user.lastName} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedUserId && (
                <div className="p-3 bg-gray-50 rounded-lg text-sm">
                  <p className="font-medium">Current Balance:</p>
                  {(() => {
                    const wallet = getUserWallet(selectedUserId);
                    if (!wallet) return <p className="text-gray-500">No wallet found</p>;
                    return (
                      <div className="flex gap-4 mt-1">
                        <span className="text-blue-600">USD: ${parseFloat(wallet.usdBalance).toLocaleString()}</span>
                        <span className="text-purple-600">EUR: €{parseFloat(wallet.eurBalance).toLocaleString()}</span>
                        <span className="text-orange-600">Gold: {parseFloat(wallet.goldGrams).toFixed(4)}g</span>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount *</Label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  data-testid="input-amount"
                />
              </div>
              <div className="space-y-2">
                <Label>Currency *</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger data-testid="select-currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="usd">USD ($)</SelectItem>
                    <SelectItem value="eur">EUR (€)</SelectItem>
                    <SelectItem value="gold">Gold (g)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Reason for this operation..."
                rows={2}
                data-testid="textarea-notes"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} data-testid="button-cancel">
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={manualOperationMutation.isPending}
              className={operationType === 'deposit' ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'}
              data-testid="button-confirm"
            >
              {manualOperationMutation.isPending ? 'Processing...' : 
               operationType === 'deposit' ? 'Confirm Deposit' : 'Confirm Withdrawal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
