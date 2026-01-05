import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { History, ArrowUpRight, ArrowDownRight, Loader2, Wallet, Briefcase, ArrowLeftRight, Clock, CheckCircle, XCircle, Ship } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';

interface FinaBridgeLedgerEntry {
  id: string;
  action: string;
  goldGrams: string;
  valueUsd?: string;
  goldPriceUsdPerGram?: string;
  tradeRequestId?: string;
  balanceAfterGrams: string;
  notes?: string;
  createdAt: string;
}

interface TradeRequest {
  id: string;
  status: string;
  tradeValueUsd: string;
  settlementGoldGrams: string;
  goodsName: string;
  destination: string;
  createdAt: string;
  userRole: 'importer' | 'exporter';
}

export default function FinaBridgeHistory() {
  const { user } = useAuth();

  const { data: ledgerData, isLoading: ledgerLoading } = useQuery({
    queryKey: ['finabridge-ledger', user?.id],
    queryFn: async () => {
      if (!user?.id) return { entries: [] };
      const res = await fetch(`/api/finabridge/ledger/${user.id}?limit=100`);
      if (!res.ok) return { entries: [] };
      return res.json();
    },
    enabled: !!user?.id
  });

  const { data: tradesData, isLoading: tradesLoading } = useQuery({
    queryKey: ['finabridge-my-requests', user?.id],
    queryFn: async () => {
      if (!user?.id) return { requests: [] };
      const res = await apiRequest('GET', `/api/finabridge/requests/my/${user.id}`);
      if (!res.ok) return { requests: [] };
      return res.json();
    },
    enabled: !!user?.id
  });

  const { data: walletData } = useQuery({
    queryKey: ['finabridge-wallet', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const res = await fetch(`/api/finabridge/wallet/${user.id}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!user?.id
  });

  const ledgerEntries: FinaBridgeLedgerEntry[] = ledgerData?.entries || [];
  const trades: TradeRequest[] = tradesData?.requests || [];
  const wallet = walletData?.wallet;

  const getActionIcon = (action: string) => {
    const creditActions = ['Settlement_Credit', 'Transfer_In', 'Escrow_Release', 'Refund'];
    const debitActions = ['Funding_Lock', 'Transfer_Out', 'Settlement_Debit', 'Fee_Deduction'];
    const transferActions = ['FinaPay_To_Trade', 'Trade_To_FinaPay'];
    
    if (creditActions.includes(action)) {
      return <ArrowDownRight className="w-5 h-5 text-green-600" />;
    } else if (debitActions.includes(action)) {
      return <ArrowUpRight className="w-5 h-5 text-red-600" />;
    } else if (transferActions.includes(action)) {
      return <ArrowLeftRight className="w-5 h-5 text-blue-600" />;
    }
    return <Briefcase className="w-5 h-5 text-muted-foreground" />;
  };

  const formatAction = (action: string, entry?: FinaBridgeLedgerEntry) => {
    const actionLabels: Record<string, string> = {
      'Funding_Lock': 'Gold Locked for Trade',
      'Settlement_Credit': 'Trade Settlement Received',
      'Settlement_Debit': 'Trade Settlement Paid',
      'Transfer_In': 'Transfer from FinaPay',
      'Transfer_Out': 'Transfer to FinaPay',
      'FinaPay_To_Trade': 'Transfer from FinaPay',
      'Trade_To_FinaPay': 'Transfer to FinaPay',
      'Escrow_Release': 'Escrow Released',
      'Refund': 'Trade Refund',
      'Fee_Deduction': 'Trade Fee',
      'Deposit': 'Gold Deposit',
      'Partial_Settlement': 'Partial Settlement',
    };
    return actionLabels[action] || action.replace(/_/g, ' ');
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'settled':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'open':
      case 'in_progress':
      case 'pending':
        return <Clock className="w-4 h-4 text-purple-500" />;
      case 'cancelled':
      case 'disputed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'settled':
        return 'bg-green-100 text-green-700';
      case 'open':
        return 'bg-blue-100 text-blue-700';
      case 'in_progress':
      case 'pending':
        return 'bg-purple-100 text-fuchsia-700';
      case 'cancelled':
      case 'disputed':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <History className="w-8 h-8 text-primary" />
            FinaBridge History
          </h1>
          <p className="text-muted-foreground">View all your trade finance activity, settlements, and wallet movements.</p>
        </div>

        {wallet && (
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">FinaBridge Wallet Balance</p>
                  <p className="text-2xl font-bold text-foreground">
                    {parseFloat(wallet.availableGoldGrams || '0').toFixed(4)}g
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Locked in Trades</p>
                  <p className="text-xl font-semibold text-blue-600">
                    {parseFloat(wallet.lockedGoldGrams || '0').toFixed(4)}g
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground mb-1">Incoming (Pending)</p>
                  <p className="text-xl font-semibold text-green-600">
                    {parseFloat(wallet.incomingLockedGoldGrams || '0').toFixed(4)}g
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="ledger" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-muted/80 p-1 rounded-xl border border-border">
            <TabsTrigger 
              value="ledger" 
              data-testid="tab-finabridge-ledger"
              className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg py-3 font-medium transition-all"
            >
              <Wallet className="w-4 h-4 mr-2" />
              Transaction Ledger
            </TabsTrigger>
            <TabsTrigger 
              value="trades" 
              data-testid="tab-finabridge-trades"
              className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg py-3 font-medium transition-all"
            >
              <Ship className="w-4 h-4 mr-2" />
              Trade History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ledger">
            <Card className="overflow-hidden">
              <CardHeader className="border-b border-border bg-muted/30">
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="w-5 h-5" />
                  Trade Finance Wallet Ledger
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {ledgerLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : ledgerEntries.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Wallet className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No ledger entries yet</p>
                    <p className="text-sm mt-2">Your trade finance transactions will appear here</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full" data-testid="finabridge-ledger-table">
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
                          const debitActions = ['Funding_Lock', 'Transfer_Out', 'Settlement_Debit', 'Fee_Deduction', 'Trade_To_FinaPay'];
                          const isDebit = debitActions.includes(entry.action) || goldAmount < 0;
                          const isCredit = !isDebit && goldAmount >= 0;
                          
                          return (
                            <tr 
                              key={entry.id} 
                              className={`hover:bg-muted/30 transition-colors ${index % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}
                              data-testid={`finabridge-ledger-entry-${entry.id}`}
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
                                      {entry.notes || (entry.tradeRequestId ? `Trade #${entry.tradeRequestId.slice(0, 8)}` : 'Trade activity')}
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
                                {isCredit ? (
                                  <span className="text-green-600 font-medium">
                                    {Math.abs(goldAmount).toFixed(4)}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right font-mono text-sm text-muted-foreground">
                                {entry.valueUsd ? `USD ${parseFloat(entry.valueUsd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
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

          <TabsContent value="trades">
            <Card className="overflow-hidden">
              <CardHeader className="border-b border-border bg-muted/30">
                <CardTitle className="flex items-center gap-2">
                  <Ship className="w-5 h-5" />
                  Trade Request History
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {tradesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : trades.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Ship className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No trade requests yet</p>
                    <p className="text-sm mt-2">Your trade finance history will appear here</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full" data-testid="finabridge-trades-table">
                      <thead>
                        <tr className="bg-muted/50 border-b border-border">
                          <th className="text-left py-3 px-4 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Date</th>
                          <th className="text-left py-3 px-4 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Trade Details</th>
                          <th className="text-left py-3 px-4 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Role</th>
                          <th className="text-right py-3 px-4 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Gold (g)</th>
                          <th className="text-right py-3 px-4 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Value (USD)</th>
                          <th className="text-center py-3 px-4 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {trades.map((trade, index) => (
                          <tr 
                            key={trade.id} 
                            className={`hover:bg-muted/30 transition-colors ${index % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}
                            data-testid={`finabridge-trade-${trade.id}`}
                          >
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-foreground">
                                {format(new Date(trade.createdAt), 'MMM dd, yyyy')}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {format(new Date(trade.createdAt), 'HH:mm')}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                  <Ship className="w-4 h-4 text-blue-600" />
                                </div>
                                <div>
                                  <div className="font-medium text-foreground text-sm">
                                    {trade.goodsName || 'Trade Request'}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {trade.destination || 'Destination N/A'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                trade.userRole === 'importer' 
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-green-100 text-green-700'
                              }`}>
                                {trade.userRole === 'importer' ? 'Importer' : 'Exporter'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-mono">
                              <span className="font-medium text-foreground">
                                {parseFloat(trade.settlementGoldGrams || '0').toFixed(4)}g
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-mono">
                              <span className="font-medium text-foreground">
                                USD {parseFloat(trade.tradeValueUsd || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center justify-center gap-1.5">
                                {getStatusIcon(trade.status)}
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(trade.status)}`}>
                                  {trade.status}
                                </span>
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
