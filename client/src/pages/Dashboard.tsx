import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { Database, TrendingUp, Wallet, ArrowUpRight, ArrowDownRight, Shield, Clock, ChevronRight, Sparkles, Briefcase, Search, Download, Plus, Send, ArrowRightLeft, RotateCcw, BarChart3 } from 'lucide-react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useUnifiedTransactions } from '@/hooks/useUnifiedTransactions';
import { normalizeStatus, getTransactionLabel } from '@/lib/transactionUtils';
import { Card } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import OnboardingTour, { useOnboarding } from '@/components/OnboardingTour';
import { useState } from 'react';

interface UserPreferences {
  showBalance: boolean;
  twoFactorReminder: boolean;
  compactMode: boolean;
  displayCurrency: string;
}

function formatNumber(num: number | null | undefined, decimals = 2): string {
  if (num === null || num === undefined || isNaN(num)) {
    return '0.00';
  }
  return num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function StatCard({ title, value, change, positive, icon: Icon, testId }: { 
  title: string; 
  value: string; 
  change?: string;
  positive?: boolean;
  icon: any;
  testId: string;
}) {
  return (
    <div data-testid={testId} className="bg-[#1a1a2e] rounded-xl p-5 border border-[#2a2a4a]">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-400">{title}</p>
        <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
          <Icon className="w-4 h-4 text-purple-400" />
        </div>
      </div>
      <p data-testid={`${testId}-value`} className="text-2xl font-bold text-white mb-1">{value}</p>
      {change && (
        <div className={`flex items-center gap-1 text-sm ${positive ? 'text-green-400' : 'text-red-400'}`}>
          {positive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
          <span data-testid={`${testId}-change`}>{change}</span>
        </div>
      )}
    </div>
  );
}

function TransactionRow({ id, txId, user, amount, date, status }: {
  id: string;
  txId: string;
  user: string;
  amount: string;
  date: string;
  status: string;
}) {
  const statusColors: Record<string, string> = {
    completed: 'bg-green-500/20 text-green-400',
    pending: 'bg-yellow-500/20 text-yellow-400',
    failed: 'bg-red-500/20 text-red-400',
    processing: 'bg-blue-500/20 text-blue-400',
  };

  return (
    <tr data-testid={`row-transaction-${id}`} className="border-b border-[#2a2a4a] hover:bg-[#1f1f3a] transition-colors">
      <td className="py-4 px-4">
        <input type="checkbox" data-testid={`checkbox-transaction-${id}`} className="rounded border-gray-600 bg-transparent" />
      </td>
      <td className="py-4 px-4">
        <span data-testid={`text-txid-${id}`} className="text-gray-300 font-mono text-sm">{txId}</span>
      </td>
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-purple-500/30 flex items-center justify-center">
            <span className="text-purple-300 text-xs font-semibold">{user.charAt(0)}</span>
          </div>
          <span data-testid={`text-type-${id}`} className="text-white">{user}</span>
        </div>
      </td>
      <td className="py-4 px-4">
        <span data-testid={`text-amount-${id}`} className="text-gray-300">{amount}</span>
      </td>
      <td className="py-4 px-4">
        <span data-testid={`text-date-${id}`} className="text-gray-400">{date}</span>
      </td>
      <td className="py-4 px-4">
        <span data-testid={`status-${id}`} className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[status.toLowerCase()] || 'bg-gray-500/20 text-gray-400'}`}>
          {status}
        </span>
      </td>
    </tr>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { totals, goldPrice, goldPriceSource, isLoading, finaBridge, certificates } = useDashboardData();
  const { transactions: unifiedTx } = useUnifiedTransactions({ limit: 10 });
  const { showOnboarding, completeOnboarding } = useOnboarding();
    
  const transactions = unifiedTx.map(tx => ({
    id: tx.id,
    type: getTransactionLabel(tx.actionType),
    status: normalizeStatus(tx.status),
    amountGold: tx.grams,
    amountUsd: tx.usd,
    description: tx.description,
    createdAt: tx.createdAt,
    sourceModule: tx.module,
  }));

  const { data: prefsData } = useQuery<{ preferences: UserPreferences }>({
    queryKey: ['preferences', user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/users/${user?.id}/preferences`);
      if (!res.ok) throw new Error('Failed to fetch preferences');
      return res.json();
    },
    enabled: !!user?.id,
    staleTime: 300000,
  });

  const prefs = prefsData?.preferences;
  const showBalance = prefs?.showBalance !== false;
  const displayCurrency = prefs?.displayCurrency || 'USD';

  const formatCurrency = (usdAmount: number) => {
    if (displayCurrency === 'AED') {
      return `Dh ${formatNumber(usdAmount * 3.67)}`;
    } else if (displayCurrency === 'EUR') {
      return `€${formatNumber(usdAmount * 0.92)}`;
    }
    return `$${formatNumber(usdAmount)}`;
  };

  const hiddenValue = '••••••';

  if (!user) return null;
  
  if (isLoading) {
    return (
      <DashboardLayout>
        <DashboardSkeleton />
      </DashboardLayout>
    );
  }

  const userName = user.firstName || user.email?.split('@')[0] || 'User';
  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || userName;
  const isBusinessUser = user.accountType === 'business' || !!user.finabridgeRole;
  const isGoldPriceLive = goldPriceSource && !goldPriceSource.includes('fallback');
  
  const totalGoldGrams = (totals.walletGoldGrams || 0) + (totals.vaultGoldGrams || 0);
  const totalPortfolioValue = totals.totalPortfolioUsd || 0;

  const hasTransactionHistory = transactions.length > 0;
  
  const chartData = hasTransactionHistory 
    ? transactions.slice(0, 12).reverse().map(tx => Math.abs(Number(tx.amountUsd) || 0))
    : [];
  const maxValue = chartData.length > 0 ? Math.max(...chartData, 1) : 1;

  return (
    <DashboardLayout>
      <div data-testid="dashboard-container" className="min-h-screen bg-[#0f0f1a]">
        <div className="flex">
          {/* Main Content */}
          <div className="flex-1 p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 data-testid="text-welcome" className="text-2xl font-bold text-white">Welcome back, {userName}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-gray-500 text-sm">Here's an overview of your portfolio</p>
                  <span data-testid="badge-gold-price" className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${isGoldPriceLive ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isGoldPriceLive ? 'bg-green-400' : 'bg-yellow-400'}`} />
                    {isGoldPriceLive ? 'Live Price' : 'Cached Price'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Link href="/finapay">
                  <Button data-testid="button-manage-balance" variant="outline" className="bg-transparent border-[#2a2a4a] text-gray-300 hover:bg-[#1a1a2e] hover:text-white">
                    <Wallet className="w-4 h-4 mr-2" />
                    Manage Balance
                  </Button>
                </Link>
                <Button data-testid="button-export" variant="outline" className="bg-transparent border-[#2a2a4a] text-gray-300 hover:bg-[#1a1a2e] hover:text-white">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <Link href="/finapay">
                  <Button data-testid="button-add-funds" className="bg-purple-600 hover:bg-purple-700 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Funds
                  </Button>
                </Link>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <StatCard 
                testId="card-gold-storage"
                title="Gold Storage" 
                value={showBalance ? `${formatNumber(totalGoldGrams, 4)}g` : hiddenValue}
                icon={Database}
              />
              <StatCard 
                testId="card-portfolio-value"
                title="Portfolio Value" 
                value={showBalance ? `$${formatNumber(totalPortfolioValue)}` : hiddenValue}
                icon={TrendingUp}
              />
              <StatCard 
                testId="card-bnsl-profit"
                title="BNSL Profit" 
                value={showBalance ? `$${formatNumber(totals.bnslTotalProfit || 0)}` : hiddenValue}
                change={(totals.bnslTotalProfit || 0) > 0 ? `+${formatNumber(totals.bnslTotalProfit || 0, 0)}` : undefined}
                positive={(totals.bnslTotalProfit || 0) > 0}
                icon={ArrowUpRight}
              />
            </div>

            {/* Dual Wallet Section */}
            <div data-testid="section-wallets" className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* LGPW Card */}
              <div data-testid="card-lgpw" className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 p-6">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <Wallet className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white">LGPW</h3>
                        <p className="text-xs text-purple-200">Live Gold Price Wallet</p>
                      </div>
                    </div>
                    <Badge className="bg-white/20 text-white border-0">Live Price</Badge>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-sm text-purple-200 mb-1">Available Balance</p>
                    <p data-testid="text-lgpw-balance" className="text-4xl font-bold text-white">
                      {showBalance ? `${formatNumber(totals.mpgwAvailableGrams || 0, 4)}g` : hiddenValue}
                    </p>
                    <p data-testid="text-lgpw-value" className="text-sm text-purple-200 mt-1">
                      {showBalance ? `≈ ${formatCurrency((totals.mpgwAvailableGrams || 0) * goldPrice)}` : ''}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/20">
                    <div>
                      <p className="text-xs text-purple-200">Pending</p>
                      <p data-testid="text-lgpw-pending" className="text-lg font-semibold text-white">{formatNumber(totals.mpgwPendingGrams || 0, 4)}g</p>
                    </div>
                    <div>
                      <p className="text-xs text-purple-200">Locked (BNSL)</p>
                      <p data-testid="text-lgpw-locked" className="text-lg font-semibold text-white">{formatNumber(totals.mpgwLockedBnslGrams || 0, 4)}g</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* FGPW Card */}
              <div data-testid="card-fgpw" className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-amber-600 to-orange-700 p-6">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <Database className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white">FGPW</h3>
                        <p className="text-xs text-amber-100">Fixed Gold Price Wallet</p>
                      </div>
                    </div>
                    <Badge className="bg-white/20 text-white border-0">Fixed Price</Badge>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-sm text-amber-100 mb-1">Available Balance</p>
                    <p data-testid="text-fgpw-balance" className="text-4xl font-bold text-white">
                      {showBalance ? `${formatNumber(totals.fpgwAvailableGrams || 0, 4)}g` : hiddenValue}
                    </p>
                    <p data-testid="text-fgpw-cost" className="text-sm text-amber-100 mt-1">
                      {showBalance && totals.fpgwWeightedAvgPriceUsd ? `Cost: $${formatNumber(totals.fpgwWeightedAvgPriceUsd, 2)}/g` : 'No holdings'}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/20">
                    <div>
                      <p className="text-xs text-amber-100">Pending</p>
                      <p data-testid="text-fgpw-pending" className="text-lg font-semibold text-white">{formatNumber(totals.fpgwPendingGrams || 0, 4)}g</p>
                    </div>
                    <div>
                      <p className="text-xs text-amber-100">Locked</p>
                      <p data-testid="text-fgpw-locked" className="text-lg font-semibold text-white">{formatNumber(totals.fpgwLockedBnslGrams || 0, 4)}g</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* FinaBridge Card for Business Users */}
            {isBusinessUser && (
              <div data-testid="card-finabridge" className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-6 mb-6">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <Briefcase className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white">FinaBridge</h3>
                        <p className="text-xs text-blue-200">Trade Finance</p>
                      </div>
                    </div>
                    <Link href="/finabridge">
                      <Button data-testid="button-finabridge-view" variant="ghost" size="sm" className="text-white hover:bg-white/10">
                        View <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </Link>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-blue-200 mb-1">Available Gold</p>
                      <p data-testid="text-finabridge-gold" className="text-2xl font-bold text-white">
                        {showBalance ? `${formatNumber(finaBridge?.goldGrams || 0, 4)}g` : hiddenValue}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-blue-200 mb-1">Active Cases</p>
                      <p data-testid="text-finabridge-cases" className="text-2xl font-bold text-white">{finaBridge?.activeCases || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-blue-200 mb-1">Trade Volume</p>
                      <p data-testid="text-finabridge-volume" className="text-2xl font-bold text-white">${formatNumber(finaBridge?.tradeVolume || 0)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-blue-200 mb-1">USD Value</p>
                      <p data-testid="text-finabridge-usd" className="text-2xl font-bold text-white">{showBalance ? formatCurrency(finaBridge?.usdValue || 0) : hiddenValue}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Transaction Activity Section */}
            <div data-testid="section-chart" className="bg-[#1a1a2e] rounded-xl p-6 border border-[#2a2a4a] mb-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-gray-400 text-sm mb-1">Transaction Activity</h3>
                  <p data-testid="text-portfolio-total" className="text-3xl font-bold text-white">
                    {showBalance ? `$${formatNumber(totalPortfolioValue)}` : hiddenValue}
                  </p>
                  <p className="text-gray-500 text-xs mt-1">Current portfolio value</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge data-testid="badge-transactions-count" className="bg-purple-500/20 text-purple-300 border-0">
                    {transactions.length} recent
                  </Badge>
                  <Link href="/transactions">
                    <Button data-testid="button-view-history" variant="outline" size="sm" className="bg-transparent border-[#2a2a4a] text-gray-300 hover:bg-[#2a2a4a]">
                      View History
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Bar Chart - Shows USD amounts from recent transactions */}
              <div className="relative h-48">
                {hasTransactionHistory ? (
                  <>
                    <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-gray-500 pr-4 w-16">
                      <span>${formatNumber(maxValue, 0)}</span>
                      <span>${formatNumber(maxValue * 0.66, 0)}</span>
                      <span>${formatNumber(maxValue * 0.33, 0)}</span>
                      <span>$0</span>
                    </div>
                    <div className="ml-16 h-full flex items-end gap-2">
                      {chartData.map((value, index) => (
                        <div key={index} className="flex-1 flex flex-col items-center group relative">
                          <div 
                            data-testid={`chart-bar-${index}`}
                            className={`w-full rounded-t-md transition-all cursor-pointer ${
                              index === chartData.length - 1 
                                ? 'bg-gradient-to-t from-purple-600 to-purple-400' 
                                : 'bg-[#2a2a4a] hover:bg-purple-500/50'
                            }`}
                            style={{ height: `${Math.max((value / maxValue) * 100, 5)}%` }}
                            title={`$${formatNumber(value)}`}
                          />
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <BarChart3 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-400 text-sm">No transaction history yet</p>
                      <p className="text-gray-500 text-xs mt-1">Your activity will appear here as you transact</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Transactions Table */}
            <div data-testid="section-transactions" className="bg-[#1a1a2e] rounded-xl border border-[#2a2a4a] overflow-hidden">
              <div className="p-4 flex items-center justify-between border-b border-[#2a2a4a]">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input 
                    data-testid="input-search-transactions"
                    placeholder="Search Anything..." 
                    className="pl-10 bg-[#0f0f1a] border-[#2a2a4a] text-gray-300 placeholder:text-gray-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button data-testid="button-export-table" variant="outline" size="sm" className="bg-transparent border-[#2a2a4a] text-gray-300">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#0f0f1a]">
                    <tr className="text-left text-gray-400 text-sm">
                      <th className="py-3 px-4 font-medium">
                        <input type="checkbox" data-testid="checkbox-select-all" className="rounded border-gray-600 bg-transparent" />
                      </th>
                      <th className="py-3 px-4 font-medium">Transaction ID</th>
                      <th className="py-3 px-4 font-medium">Type</th>
                      <th className="py-3 px-4 font-medium">Amount</th>
                      <th className="py-3 px-4 font-medium">Date</th>
                      <th className="py-3 px-4 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.length > 0 ? (
                      transactions.slice(0, 5).map((tx) => (
                        <TransactionRow
                          key={tx.id}
                          id={tx.id}
                          txId={`TXN-${tx.id.slice(0, 8).toUpperCase()}`}
                          user={tx.type}
                          amount={tx.amountGold ? `${formatNumber(Number(tx.amountGold), 4)}g` : `$${formatNumber(Number(tx.amountUsd) || 0)}`}
                          date={new Date(tx.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          status={tx.status}
                        />
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-gray-500">
                          No transactions yet. Start by adding funds to your wallet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="p-4 border-t border-[#2a2a4a]">
                <Link href="/transactions">
                  <Button data-testid="button-view-all-transactions" variant="ghost" className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10">
                    View All Transactions <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div data-testid="sidebar-right" className="w-80 p-6 border-l border-[#2a2a4a] hidden xl:block">
            {/* Search */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input 
                data-testid="input-sidebar-search"
                placeholder="Search Anything..." 
                className="pl-10 bg-[#1a1a2e] border-[#2a2a4a] text-gray-300 placeholder:text-gray-500"
              />
            </div>

            {/* Wallet Card */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <button data-testid="button-wallet-gold" className="flex-1 py-2 px-4 bg-purple-600 text-white rounded-lg text-sm font-medium">
                  Gold
                </button>
                <button data-testid="button-wallet-usd" className="flex-1 py-2 px-4 bg-[#1a1a2e] text-gray-400 rounded-lg text-sm font-medium border border-[#2a2a4a]">
                  USD
                </button>
                <Link href="/finapay">
                  <button data-testid="button-add-card" className="py-2 px-4 bg-purple-600 text-white rounded-lg text-sm font-medium">
                    <Plus className="w-4 h-4" />
                  </button>
                </Link>
              </div>

              {/* Card Display */}
              <div data-testid="card-wallet-display" className="bg-gradient-to-br from-[#1a1a2e] to-[#2a2a4a] rounded-2xl p-5 border border-[#3a3a5a] relative overflow-hidden">
                <div className="absolute top-4 right-4">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-purple-400/50" />
                    <div className="w-3 h-3 rounded-full bg-purple-600/50 -ml-1" />
                  </div>
                </div>
                <div className="mb-8">
                  <p className="text-gray-400 text-xs mb-1">Total Gold Balance</p>
                  <p data-testid="text-sidebar-gold-balance" className="text-white text-2xl font-bold">
                    {showBalance ? `${formatNumber(totalGoldGrams, 4)}g` : hiddenValue}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-xs">Account Holder</p>
                    <p data-testid="text-account-holder" className="text-white font-medium">{fullName}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="text-purple-400 text-xl font-bold">FINA</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mb-6">
              <h3 className="text-white font-semibold mb-4">Quick Action</h3>
              <div className="flex flex-wrap gap-2">
                <Link href="/finapay">
                  <Button data-testid="button-quick-topup" size="sm" variant="outline" className="bg-[#1a1a2e] border-[#2a2a4a] text-gray-300 hover:bg-[#2a2a4a]">
                    <Plus className="w-4 h-4 mr-1" />
                    Top up
                  </Button>
                </Link>
                <Link href="/finapay">
                  <Button data-testid="button-quick-transfer" size="sm" variant="outline" className="bg-[#1a1a2e] border-[#2a2a4a] text-gray-300 hover:bg-[#2a2a4a]">
                    <ArrowRightLeft className="w-4 h-4 mr-1" />
                    Transfers
                  </Button>
                </Link>
                <Link href="/finapay">
                  <Button data-testid="button-quick-request" size="sm" variant="outline" className="bg-[#1a1a2e] border-[#2a2a4a] text-gray-300 hover:bg-[#2a2a4a]">
                    <Send className="w-4 h-4 mr-1" />
                    Request
                  </Button>
                </Link>
                <Button data-testid="button-quick-refresh" size="sm" variant="outline" className="bg-[#1a1a2e] border-[#2a2a4a] text-gray-300 hover:bg-[#2a2a4a]">
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Insights Row */}
            <div className="space-y-4 mb-6">
              {/* BNSL Summary */}
              <div data-testid="card-bnsl-summary" className="bg-[#1a1a2e] rounded-xl p-4 border border-[#2a2a4a]">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-500/20 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-teal-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm">BNSL Program</h3>
                    <p className="text-xs text-gray-500">Buy Now, Sell Later</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Invested</span>
                    <span data-testid="text-bnsl-invested" className="font-semibold text-white">{formatNumber(totals.bnslLockedGrams || 0, 4)}g</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Active Plans</span>
                    <span data-testid="text-bnsl-plans" className="font-semibold text-teal-400">{totals.activeBnslPlans || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Profit</span>
                    <span data-testid="text-bnsl-total-profit" className="font-semibold text-emerald-400">+{formatCurrency(totals.bnslTotalProfit || 0)}</span>
                  </div>
                </div>
                <Link href="/bnsl">
                  <Button data-testid="button-view-bnsl" variant="outline" size="sm" className="w-full mt-3 border-teal-600/30 text-teal-400 hover:bg-teal-500/10">
                    View Plans <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
              
              {/* Pending Deposits */}
              <div data-testid="card-pending" className="bg-[#1a1a2e] rounded-xl p-4 border border-[#2a2a4a]">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-orange-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm">Pending</h3>
                    <p className="text-xs text-gray-500">Awaiting verification</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Gold Pending</span>
                    <span data-testid="text-pending-gold" className="font-semibold text-orange-400">{formatNumber(totals.pendingGoldGrams || 0, 4)}g</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">USD Pending</span>
                    <span data-testid="text-pending-usd" className="font-semibold text-white">${formatNumber(totals.pendingDepositUsd || 0)}</span>
                  </div>
                </div>
                <Link href="/finapay">
                  <Button data-testid="button-view-pending" variant="outline" size="sm" className="w-full mt-3 border-orange-600/30 text-orange-400 hover:bg-orange-500/10">
                    View Details <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Recent Certificates */}
            <div data-testid="card-certificates" className="bg-[#1a1a2e] rounded-xl p-4 border border-[#2a2a4a]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                  </div>
                  <h3 className="text-white font-semibold text-sm">Certificates</h3>
                </div>
                <Link href="/finavault">
                  <Button data-testid="button-add-certificate" size="sm" variant="ghost" className="text-purple-400 hover:text-purple-300 p-0 h-auto">
                    <Plus className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
              
              <div className="space-y-2 text-sm mb-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total</span>
                  <span data-testid="text-certs-total" className="font-semibold text-white">{certificates?.summary?.total || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Active</span>
                  <span data-testid="text-certs-active" className="font-semibold text-purple-400">{certificates?.summary?.active || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Physical Storage</span>
                  <span data-testid="text-certs-physical" className="font-semibold text-emerald-400">{certificates?.summary?.physicalStorage || 0}</span>
                </div>
              </div>
              
              {(certificates?.recent?.length ?? 0) > 0 && (
                <div className="space-y-2 border-t border-[#2a2a4a] pt-3">
                  {certificates?.recent?.slice(0, 2).map((cert: any) => (
                    <div key={cert.id} data-testid={`card-cert-${cert.id}`} className="flex items-center justify-between p-2 bg-[#0f0f1a] rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                          <Shield className="w-4 h-4 text-purple-400" />
                        </div>
                        <div>
                          <p className="text-white text-xs font-medium">{cert.type || 'Gold Certificate'}</p>
                          <p className="text-gray-500 text-xs">{new Date(cert.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-500" />
                    </div>
                  ))}
                </div>
              )}
              
              <Link href="/finavault">
                <Button data-testid="button-view-all-certs" variant="ghost" className="w-full mt-3 text-gray-400 hover:text-white border border-[#2a2a4a] hover:bg-[#2a2a4a]">
                  View All
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {showOnboarding && (
        <OnboardingTour onComplete={completeOnboarding} />
      )}
    </DashboardLayout>
  );
}
