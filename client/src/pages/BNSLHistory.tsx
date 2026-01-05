import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { History, ArrowUpRight, ArrowDownRight, Loader2, Wallet, TrendingUp, ArrowLeftRight, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';

interface BnslLedgerEntry {
  id: string;
  action: string;
  goldGrams: string;
  valueUsd?: string;
  goldPriceUsdPerGram?: string;
  planId?: string;
  payoutId?: string;
  balanceAfterGrams: string;
  notes?: string;
  createdAt: string;
}

interface BnslPlan {
  id: string;
  status: string;
  goldSoldGrams: string;
  tenorMonths: number;
  agreedMarginAnnualPercent: string;
  totalSaleProceedsUsd: string;
  startDate: string;
  maturityDate: string;
  createdAt: string;
}

export default function BNSLHistory() {
  const { user } = useAuth();

  const { data: ledgerData, isLoading: ledgerLoading } = useQuery({
    queryKey: ['bnsl-ledger', user?.id],
    queryFn: async () => {
      if (!user?.id) return { entries: [] };
      const res = await fetch(`/api/bnsl/ledger/${user.id}?limit=100`);
      if (!res.ok) return { entries: [] };
      return res.json();
    },
    enabled: !!user?.id
  });

  const { data: plansData, isLoading: plansLoading } = useQuery({
    queryKey: ['bnsl-plans', user?.id],
    queryFn: async () => {
      if (!user?.id) return { plans: [] };
      const res = await apiRequest('GET', `/api/bnsl/plans/${user.id}`);
      if (!res.ok) return { plans: [] };
      return res.json();
    },
    enabled: !!user?.id
  });

  const { data: walletData } = useQuery({
    queryKey: ['bnsl-wallet', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const res = await fetch(`/api/bnsl/wallet/${user.id}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!user?.id
  });

  const ledgerEntries: BnslLedgerEntry[] = ledgerData?.entries || [];
  const plans: BnslPlan[] = plansData?.plans || [];
  const wallet = walletData?.wallet;

  const getActionIcon = (action: string) => {
    const creditActions = ['Margin_Payout', 'Transfer_In', 'Plan_Termination_Credit', 'Adjustment_Credit'];
    const debitActions = ['Plan_Lock', 'Transfer_Out', 'Withdrawal', 'Fee_Deduction'];
    const transferActions = ['FinaPay_To_BNSL', 'BNSL_To_FinaPay'];
    
    if (creditActions.includes(action)) {
      return <ArrowDownRight className="w-5 h-5 text-green-600" />;
    } else if (debitActions.includes(action)) {
      return <ArrowUpRight className="w-5 h-5 text-red-600" />;
    } else if (transferActions.includes(action)) {
      return <ArrowLeftRight className="w-5 h-5 text-blue-600" />;
    }
    return <TrendingUp className="w-5 h-5 text-muted-foreground" />;
  };

  const formatAction = (action: string, entry?: BnslLedgerEntry) => {
    const actionLabels: Record<string, string> = {
      'Plan_Lock': 'Gold Locked for BNSL Plan',
      'Margin_Payout': 'Margin Payout Received',
      'Transfer_In': 'Transfer from FinaPay',
      'Transfer_Out': 'Transfer to FinaPay',
      'FinaPay_To_BNSL': 'Transfer from FinaPay',
      'BNSL_To_FinaPay': 'Transfer to FinaPay',
      'Plan_Termination_Credit': 'Early Termination Credit',
      'Withdrawal': 'Withdrawal',
      'Fee_Deduction': 'Fee Deduction',
      'Adjustment_Credit': 'Adjustment Credit',
      'Deposit': 'Gold Deposit',
    };
    return actionLabels[action] || action.replace(/_/g, ' ');
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending':
      case 'pending approval':
        return <Clock className="w-4 h-4 text-purple-500" />;
      case 'early terminated':
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-orange-500" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'completed':
        return 'bg-blue-100 text-blue-700';
      case 'pending':
      case 'pending approval':
        return 'bg-purple-100 text-fuchsia-700';
      case 'early terminated':
        return 'bg-orange-100 text-orange-700';
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
            BNSL History
          </h1>
          <p className="text-muted-foreground">View all your BNSL activity, plans, and margin payouts.</p>
        </div>

        {wallet && (
          <Card className="bg-gradient-to-r from-purple-50 to-fuchsia-50 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">BNSL Wallet Balance</p>
                  <p className="text-2xl font-bold text-foreground">
                    {parseFloat(wallet.availableGoldGrams || '0').toFixed(4)}g
                  </p>
                  <p className="text-sm text-muted-foreground">
                    USD {parseFloat(wallet.availableValueUsd || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground mb-1">Locked in Plans</p>
                  <p className="text-xl font-semibold text-fuchsia-600">
                    {parseFloat(wallet.lockedGoldGrams || '0').toFixed(4)}g
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
              data-testid="tab-bnsl-ledger"
              className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg py-3 font-medium transition-all"
            >
              <Wallet className="w-4 h-4 mr-2" />
              Transaction Ledger
            </TabsTrigger>
            <TabsTrigger 
              value="plans" 
              data-testid="tab-bnsl-plans"
              className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg py-3 font-medium transition-all"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Plan History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ledger">
            <Card className="overflow-hidden">
              <CardHeader className="border-b border-border bg-muted/30">
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="w-5 h-5" />
                  BNSL Wallet Ledger
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
                    <p className="text-sm mt-2">Your BNSL transactions will appear here</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full" data-testid="bnsl-ledger-table">
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
                          const debitActions = ['Plan_Lock', 'Transfer_Out', 'Withdrawal', 'Fee_Deduction', 'BNSL_To_FinaPay'];
                          const isDebit = debitActions.includes(entry.action) || goldAmount < 0;
                          const isCredit = !isDebit && goldAmount >= 0;
                          
                          return (
                            <tr 
                              key={entry.id} 
                              className={`hover:bg-muted/30 transition-colors ${index % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}
                              data-testid={`bnsl-ledger-entry-${entry.id}`}
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
                                      {entry.notes || (entry.planId ? `Plan #${entry.planId.slice(0, 8)}` : 'BNSL activity')}
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

          <TabsContent value="plans">
            <Card className="overflow-hidden">
              <CardHeader className="border-b border-border bg-muted/30">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  BNSL Plan History
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {plansLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : plans.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No BNSL plans yet</p>
                    <p className="text-sm mt-2">Create your first BNSL plan to start earning</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full" data-testid="bnsl-plans-table">
                      <thead>
                        <tr className="bg-muted/50 border-b border-border">
                          <th className="text-left py-3 px-4 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Created</th>
                          <th className="text-left py-3 px-4 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Plan Details</th>
                          <th className="text-right py-3 px-4 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Gold Locked</th>
                          <th className="text-right py-3 px-4 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Margin Rate</th>
                          <th className="text-right py-3 px-4 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Total Value</th>
                          <th className="text-center py-3 px-4 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {plans.map((plan, index) => (
                          <tr 
                            key={plan.id} 
                            className={`hover:bg-muted/30 transition-colors ${index % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}
                            data-testid={`bnsl-plan-${plan.id}`}
                          >
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-foreground">
                                {format(new Date(plan.createdAt), 'MMM dd, yyyy')}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {format(new Date(plan.createdAt), 'HH:mm')}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                                  <TrendingUp className="w-4 h-4 text-purple-600" />
                                </div>
                                <div>
                                  <div className="font-medium text-foreground text-sm">
                                    {plan.tenorMonths} Month Plan
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Maturity: {format(new Date(plan.maturityDate), 'MMM dd, yyyy')}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right font-mono">
                              <span className="font-medium text-foreground">
                                {parseFloat(plan.goldSoldGrams).toFixed(4)}g
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-mono">
                              <span className="text-green-600 font-medium">
                                {parseFloat(plan.agreedMarginAnnualPercent).toFixed(2)}%
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-mono">
                              <span className="font-medium text-foreground">
                                USD {parseFloat(plan.totalSaleProceedsUsd).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center justify-center gap-1.5">
                                {getStatusIcon(plan.status)}
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(plan.status)}`}>
                                  {plan.status}
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
