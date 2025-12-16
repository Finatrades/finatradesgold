import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { History, ArrowUpRight, ArrowDownRight, Clock, CheckCircle, XCircle, Loader2, RefreshCw, ArrowLeftRight, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

interface VaultTransaction {
  id: string;
  type: 'deposit' | 'withdrawal';
  goldGrams: string;
  status: string;
  createdAt: string;
  referenceNumber?: string;
  vaultLocation?: string;
}

interface LedgerEntry {
  id: string;
  action: string;
  goldGrams: string;
  valueUsd?: string;
  goldPriceUsdPerGram?: string;
  fromWallet?: string;
  toWallet?: string;
  fromStatus?: string;
  toStatus?: string;
  balanceAfterGrams: string;
  notes?: string;
  createdAt: string;
}

export default function FinaVaultHistory() {
  const { user } = useAuth();

  const { data: depositsData, isLoading: depositsLoading } = useQuery({
    queryKey: ['vault-deposits', user?.id],
    queryFn: async () => {
      if (!user?.id) return { requests: [] };
      const res = await fetch(`/api/vault/deposits/${user.id}`);
      if (!res.ok) return { requests: [] };
      return res.json();
    },
    enabled: !!user?.id
  });

  const { data: withdrawalsData, isLoading: withdrawalsLoading } = useQuery({
    queryKey: ['vault-withdrawals', user?.id],
    queryFn: async () => {
      if (!user?.id) return { requests: [] };
      const res = await fetch(`/api/vault/withdrawals/${user.id}`);
      if (!res.ok) return { requests: [] };
      return res.json();
    },
    enabled: !!user?.id
  });

  const { data: ledgerData, isLoading: ledgerLoading } = useQuery({
    queryKey: ['vault-ledger', user?.id],
    queryFn: async () => {
      if (!user?.id) return { entries: [] };
      const res = await fetch(`/api/vault/ledger/${user.id}?limit=100`);
      if (!res.ok) return { entries: [] };
      return res.json();
    },
    enabled: !!user?.id
  });

  const isLoading = depositsLoading || withdrawalsLoading || ledgerLoading;
  const ledgerEntries: LedgerEntry[] = ledgerData?.entries || [];

  const allTransactions: VaultTransaction[] = [
    ...(depositsData?.requests || []).map((d: any) => ({
      id: d.id,
      type: 'deposit' as const,
      goldGrams: d.totalDeclaredWeightGrams,
      status: d.status,
      createdAt: d.createdAt,
      referenceNumber: d.referenceNumber,
      vaultLocation: d.vaultLocation,
    })),
    ...(withdrawalsData?.requests || []).map((w: any) => ({
      id: w.id,
      type: 'withdrawal' as const,
      goldGrams: w.goldGrams,
      status: w.status,
      createdAt: w.createdAt,
      referenceNumber: w.referenceNumber,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending':
      case 'in_progress':
        return <Clock className="w-4 h-4 text-amber-500" />;
      case 'rejected':
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'approved':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'pending':
      case 'in_progress':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'rejected':
      case 'cancelled':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getActionIcon = (action: string) => {
    const creditActions = ['Deposit', 'Transfer_Receive', 'Payout_Credit', 'Adjustment'];
    const debitActions = ['Withdrawal', 'Transfer_Send', 'Fee_Deduction'];
    const transferActions = ['FinaPay_To_BNSL', 'BNSL_To_FinaPay', 'FinaPay_To_Trade', 'Trade_To_FinaPay'];
    
    if (creditActions.includes(action)) {
      return <ArrowDownRight className="w-5 h-5 text-green-600" />;
    } else if (debitActions.includes(action)) {
      return <ArrowUpRight className="w-5 h-5 text-red-600" />;
    } else if (transferActions.includes(action)) {
      return <ArrowLeftRight className="w-5 h-5 text-blue-600" />;
    }
    return <RefreshCw className="w-5 h-5 text-muted-foreground" />;
  };

  const getActionColor = (action: string) => {
    const creditActions = ['Deposit', 'Transfer_Receive', 'Payout_Credit', 'Adjustment'];
    const debitActions = ['Withdrawal', 'Transfer_Send', 'Fee_Deduction'];
    
    if (creditActions.includes(action)) {
      return 'text-green-600';
    } else if (debitActions.includes(action)) {
      return 'text-red-600';
    }
    return 'text-blue-600';
  };

  const formatAction = (action: string) => {
    return action.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim();
  };

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <History className="w-8 h-8 text-[#D4AF37]" />
            Vault History
          </h1>
          <p className="text-muted-foreground">View all your vault activity and gold movements.</p>
        </div>

        <Tabs defaultValue="ledger" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="ledger" data-testid="tab-ledger">
              <Wallet className="w-4 h-4 mr-2" />
              Ledger History
            </TabsTrigger>
            <TabsTrigger value="physical" data-testid="tab-physical">
              <History className="w-4 h-4 mr-2" />
              Physical Deposits/Withdrawals
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ledger">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="w-5 h-5" />
                  Gold Movement History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {ledgerLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37]" />
                  </div>
                ) : ledgerEntries.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Wallet className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No ledger entries yet</p>
                    <p className="text-sm mt-2">Your gold movements will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {ledgerEntries.map((entry) => (
                      <div 
                        key={entry.id} 
                        className="flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                        data-testid={`ledger-entry-${entry.id}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-muted`}>
                            {getActionIcon(entry.action)}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">
                              {formatAction(entry.action)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {entry.fromWallet && entry.toWallet 
                                ? `${entry.fromWallet} → ${entry.toWallet}`
                                : entry.notes || 'Gold movement'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className={`font-bold ${getActionColor(entry.action)}`}>
                              {parseFloat(entry.goldGrams) >= 0 ? '+' : ''}{parseFloat(entry.goldGrams).toFixed(4)} g
                            </p>
                            {entry.valueUsd && (
                              <p className="text-xs text-muted-foreground">
                                ${parseFloat(entry.valueUsd).toFixed(2)}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(entry.createdAt), 'MMM dd, yyyy HH:mm')}
                            </p>
                          </div>
                          <div className="text-right min-w-[80px]">
                            <p className="text-xs text-muted-foreground">Balance</p>
                            <p className="font-semibold text-foreground">
                              {parseFloat(entry.balanceAfterGrams).toFixed(4)} g
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="physical">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Physical Gold Transactions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37]" />
                  </div>
                ) : allTransactions.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No physical gold transactions yet</p>
                    <p className="text-sm mt-2">Physical deposits and withdrawals will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {allTransactions.map((tx) => (
                      <div 
                        key={tx.id} 
                        className="flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                        data-testid={`vault-transaction-${tx.id}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            tx.type === 'deposit' 
                              ? 'bg-green-100 dark:bg-green-900/30' 
                              : 'bg-red-100 dark:bg-red-900/30'
                          }`}>
                            {tx.type === 'deposit' 
                              ? <ArrowDownRight className="w-5 h-5 text-green-600" />
                              : <ArrowUpRight className="w-5 h-5 text-red-600" />
                            }
                          </div>
                          <div>
                            <p className="font-semibold text-foreground capitalize">
                              {tx.type === 'deposit' ? 'Gold Deposit' : 'Gold Withdrawal'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {tx.referenceNumber || tx.id.slice(0, 8)}
                              {tx.vaultLocation && ` - ${tx.vaultLocation}`}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className={`font-bold ${tx.type === 'deposit' ? 'text-green-600' : 'text-red-600'}`}>
                              {tx.type === 'deposit' ? '+' : '-'}{parseFloat(tx.goldGrams).toFixed(3)} g
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(tx.createdAt), 'MMM dd, yyyy')}
                            </p>
                          </div>
                          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(tx.status)}`}>
                            {getStatusIcon(tx.status)}
                            <span className="capitalize">{tx.status.replace('_', ' ')}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
