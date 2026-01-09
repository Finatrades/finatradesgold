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
        return <Clock className="w-4 h-4 text-purple-500" />;
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
        return 'bg-green-100 text-green-700';
      case 'pending':
      case 'in_progress':
        return 'bg-purple-100 text-fuchsia-700';
      case 'rejected':
      case 'cancelled':
        return 'bg-red-100 text-red-700';
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

  const formatAction = (action: string, entry?: LedgerEntry) => {
    // For Deposit actions, show proper labels based on source
    if (action === 'Deposit') {
      // Physical vault deposits
      if (entry?.notes?.includes('FinaVault') || entry?.notes?.includes('physical') || entry?.notes?.includes('Physical')) {
        return 'Deposit Physical Gold';
      }
      // Bank/card/crypto purchases
      return 'Acquire Gold';
    }
    // Handle MPGW/FPGW conversion actions
    if (action === 'MPGW_To_FPGW') {
      return 'MPGW → FPGW Conversion';
    }
    if (action === 'FPGW_To_MPGW') {
      return 'FPGW → MPGW Conversion';
    }
    // For other actions, add spaces before uppercase letters that follow lowercase
    return action.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim();
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
          <TabsList className="grid w-full grid-cols-2 bg-muted/80 p-1 rounded-xl border border-border">
            <TabsTrigger 
              value="ledger" 
              data-testid="tab-ledger"
              className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg py-3 font-medium transition-all"
            >
              <Wallet className="w-4 h-4 mr-2" />
              Ledger History
            </TabsTrigger>
            <TabsTrigger 
              value="physical" 
              data-testid="tab-physical"
              className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg py-3 font-medium transition-all"
            >
              <History className="w-4 h-4 mr-2" />
              Physical Deposits/Withdrawals
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ledger">
            <Card className="overflow-hidden">
              <CardHeader className="border-b border-border bg-muted/30">
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="w-5 h-5" />
                  Gold Movement Ledger
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
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
                  <div className="overflow-x-auto">
                    <table className="w-full" data-testid="ledger-table">
                      <thead>
                        <tr className="bg-muted/50 border-b border-border">
                          <th className="text-left py-3 px-4 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Date</th>
                          <th className="text-left py-3 px-4 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Description</th>
                          <th className="text-right py-3 px-4 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Debit (g)</th>
                          <th className="text-right py-3 px-4 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Credit (g)</th>
                          <th className="text-right py-3 px-4 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Value (USD)</th>
                          <th className="text-right py-3 px-4 font-semibold text-xs uppercase tracking-wider text-muted-foreground bg-muted/80">Balance (g)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {ledgerEntries.map((entry, index) => {
                          const goldAmount = parseFloat(entry.goldGrams);
                          const isCredit = goldAmount >= 0;
                          const debitActions = ['Withdrawal', 'Transfer_Send', 'Fee_Deduction'];
                          const isDebit = debitActions.includes(entry.action) || goldAmount < 0;
                          
                          return (
                            <tr 
                              key={entry.id} 
                              className={`hover:bg-muted/30 transition-colors ${index % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}
                              data-testid={`ledger-entry-${entry.id}`}
                            >
                              <td className="py-3 px-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-foreground">
                                  {format(new Date(entry.createdAt), 'MMM dd, yyyy')}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {format(new Date(entry.createdAt), 'HH:mm')}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                    isCredit ? 'bg-green-100' : 'bg-red-100'
                                  }`}>
                                    {getActionIcon(entry.action)}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-medium text-foreground text-sm">
                                      {formatAction(entry.action, entry)}
                                    </div>
                                    <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                                      {entry.notes || (entry.fromWallet && entry.toWallet 
                                        ? `${entry.fromWallet} → ${entry.toWallet}`
                                        : 'Gold movement')}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-right font-mono">
                                {isDebit ? (
                                  <span className="text-red-600 font-medium">
                                    {Math.abs(goldAmount).toFixed(4)}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right font-mono">
                                {isCredit && !isDebit ? (
                                  <span className="text-green-600 font-medium">
                                    {Math.abs(goldAmount).toFixed(4)}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right font-mono text-sm text-muted-foreground">
                                {entry.valueUsd ? `$${parseFloat(entry.valueUsd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                              </td>
                              <td className="py-3 px-4 text-right font-mono bg-muted/20">
                                <span className="font-semibold text-foreground">
                                  {parseFloat(entry.balanceAfterGrams).toFixed(4)}
                                </span>
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
          </TabsContent>

          <TabsContent value="physical">
            <Card className="overflow-hidden">
              <CardHeader className="border-b border-border bg-muted/30">
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Physical Gold Transactions
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
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
                  <div className="overflow-x-auto">
                    <table className="w-full" data-testid="physical-transactions-table">
                      <thead>
                        <tr className="bg-muted/50 border-b border-border">
                          <th className="text-left py-3 px-4 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Date</th>
                          <th className="text-left py-3 px-4 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Type</th>
                          <th className="text-left py-3 px-4 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Reference</th>
                          <th className="text-left py-3 px-4 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Location</th>
                          <th className="text-right py-3 px-4 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Weight (g)</th>
                          <th className="text-center py-3 px-4 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {allTransactions.map((tx, index) => (
                          <tr 
                            key={tx.id} 
                            className={`hover:bg-muted/30 transition-colors ${index % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}
                            data-testid={`vault-transaction-${tx.id}`}
                          >
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-foreground">
                                {format(new Date(tx.createdAt), 'MMM dd, yyyy')}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {format(new Date(tx.createdAt), 'HH:mm')}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                  tx.type === 'deposit' 
                                    ? 'bg-green-100' 
                                    : 'bg-red-100'
                                }`}>
                                  {tx.type === 'deposit' 
                                    ? <ArrowDownRight className="w-4 h-4 text-green-600" />
                                    : <ArrowUpRight className="w-4 h-4 text-red-600" />
                                  }
                                </div>
                                <span className="font-medium text-foreground text-sm capitalize">
                                  {tx.type === 'deposit' ? 'Deposit' : 'Withdrawal'}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-sm font-mono text-muted-foreground">
                                {tx.referenceNumber || tx.id.slice(0, 8).toUpperCase()}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-sm text-muted-foreground">
                                {tx.vaultLocation || '—'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-mono">
                              <span className={`font-medium ${tx.type === 'deposit' ? 'text-green-600' : 'text-red-600'}`}>
                                {tx.type === 'deposit' ? '+' : '-'}{parseFloat(tx.goldGrams).toFixed(4)}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex justify-center">
                                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(tx.status)}`}>
                                  {getStatusIcon(tx.status)}
                                  <span className="capitalize">{tx.status.replace('_', ' ')}</span>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
