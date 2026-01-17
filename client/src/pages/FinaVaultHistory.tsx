import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { History, ArrowUpRight, ArrowDownRight, Clock, CheckCircle, XCircle, Loader2, RefreshCw, ArrowLeftRight, Wallet, ChevronDown, ChevronRight } from 'lucide-react';
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
  goldWalletType?: string;
  toGoldWalletType?: string;
  balanceAfterGrams: string;
  notes?: string;
  transactionId?: string;
  createdAt: string;
}

export default function FinaVaultHistory() {
  const { user } = useAuth();
  const [expandedTransactions, setExpandedTransactions] = useState<Set<string>>(new Set());

  const toggleExpanded = (txId: string) => {
    setExpandedTransactions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(txId)) {
        newSet.delete(txId);
      } else {
        newSet.add(txId);
      }
      return newSet;
    });
  };

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

  const groupedEntries = React.useMemo(() => {
    const groups: Map<string, LedgerEntry[]> = new Map();
    ledgerEntries.forEach(entry => {
      const key = entry.transactionId || entry.id;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(entry);
    });
    const actionOrder = (action: string) => {
      if (action === 'Vault_Transfer') return 0;
      if (action === 'Deposit') return 1;
      return 2;
    };
    groups.forEach((entries) => {
      entries.sort((a, b) => actionOrder(a.action) - actionOrder(b.action));
    });
    return Array.from(groups.entries()).sort((a, b) => {
      const dateA = new Date(a[1][0]?.createdAt || 0).getTime();
      const dateB = new Date(b[1][0]?.createdAt || 0).getTime();
      return dateB - dateA;
    });
  }, [ledgerEntries]);

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
    const conversionActions = ['LGPW_To_FGPW', 'FGPW_To_LGPW'];
    
    if (conversionActions.includes(action)) {
      return <ArrowLeftRight className="w-5 h-5 text-purple-600" />;
    } else if (creditActions.includes(action)) {
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
    // Handle LGPW/FGPW conversion actions
    if (action === 'LGPW_To_FGPW') {
      return 'LGPW → FGPW Conversion';
    }
    if (action === 'FGPW_To_LGPW') {
      return 'FGPW → LGPW Conversion';
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
          <TabsList className="inline-flex h-10 items-center justify-center rounded-lg bg-muted p-1 gap-1">
            <TabsTrigger 
              value="ledger" 
              data-testid="tab-ledger"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
            >
              <Wallet className="w-4 h-4 mr-2" />
              Ledger History
            </TabsTrigger>
            <TabsTrigger 
              value="physical" 
              data-testid="tab-physical"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
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
                          <th className="w-8 py-3 px-2"></th>
                          <th className="text-left py-3 px-4 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Date</th>
                          <th className="text-left py-3 px-4 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Action</th>
                          <th className="text-left py-3 px-4 font-semibold text-xs uppercase tracking-wider text-muted-foreground">From</th>
                          <th className="text-left py-3 px-4 font-semibold text-xs uppercase tracking-wider text-muted-foreground">To</th>
                          <th className="text-right py-3 px-4 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Gold (g)</th>
                          <th className="text-right py-3 px-4 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Value (USD)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {groupedEntries.map(([txId, entries], groupIndex) => {
                          const isExpanded = expandedTransactions.has(txId);
                          const hasMultiple = entries.length > 1;
                          const mainEntry = entries[entries.length - 1];
                          const totalValue = entries.reduce((sum, e) => sum + parseFloat(e.valueUsd || '0'), 0);
                          const goldAmount = parseFloat(mainEntry.goldGrams);
                          
                          const formatFrom = (entry: LedgerEntry) => {
                            if (entry.action === 'Vault_Transfer') return 'Wingold & Metals';
                            if (entry.fromWallet === 'FinaPay') return 'FinaVault';
                            return entry.fromWallet || '—';
                          };
                          
                          const formatTo = (entry: LedgerEntry) => {
                            if (entry.action === 'Vault_Transfer') return 'FinaVault';
                            if (entry.action === 'Deposit' && entry.toGoldWalletType) {
                              return `FinaPay-${entry.toGoldWalletType}`;
                            }
                            return entry.toWallet || '—';
                          };
                          
                          return (
                            <React.Fragment key={txId}>
                              <tr 
                                className={`hover:bg-muted/30 transition-colors cursor-pointer ${groupIndex % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}
                                onClick={() => hasMultiple && toggleExpanded(txId)}
                                data-testid={`ledger-group-${txId}`}
                              >
                                <td className="py-3 px-2 text-center">
                                  {hasMultiple && (
                                    isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                  )}
                                </td>
                                <td className="py-3 px-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-foreground">
                                    {format(new Date(mainEntry.createdAt), 'dd/MM/yyyy')}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {format(new Date(mainEntry.createdAt), 'h:mm:ss a')}
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                    {formatAction(mainEntry.action, mainEntry)}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-sm text-foreground">
                                  {hasMultiple ? 'Wingold & Metals' : formatFrom(mainEntry)}
                                </td>
                                <td className="py-3 px-4 text-sm text-foreground">
                                  {formatTo(mainEntry)}
                                </td>
                                <td className="py-3 px-4 text-right font-mono">
                                  <span className="text-green-600 font-medium">
                                    {goldAmount.toFixed(4)}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-right font-mono text-sm">
                                  ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              </tr>
                              {isExpanded && entries.map((entry, entryIndex) => (
                                <tr 
                                  key={entry.id}
                                  className="bg-muted/20 border-l-4 border-l-purple-400"
                                  data-testid={`ledger-entry-${entry.id}`}
                                >
                                  <td className="py-2 px-2"></td>
                                  <td className="py-2 px-4 whitespace-nowrap text-xs text-muted-foreground">
                                    Step {entryIndex + 1}
                                  </td>
                                  <td className="py-2 px-4">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                      entry.action === 'Vault_Transfer' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                                    }`}>
                                      {entry.action === 'Vault_Transfer' ? 'Physical Storage' : 'Digital Storage'}
                                    </span>
                                  </td>
                                  <td className="py-2 px-4 text-sm text-muted-foreground">
                                    {formatFrom(entry)}
                                  </td>
                                  <td className="py-2 px-4 text-sm text-muted-foreground">
                                    {formatTo(entry)}
                                  </td>
                                  <td className="py-2 px-4 text-right font-mono text-sm text-muted-foreground">
                                    {parseFloat(entry.goldGrams).toFixed(4)}
                                  </td>
                                  <td className="py-2 px-4 text-right font-mono text-sm text-muted-foreground">
                                    ${parseFloat(entry.valueUsd || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                </tr>
                              ))}
                            </React.Fragment>
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
