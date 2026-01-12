import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { Database, TrendingUp, Coins, CheckCircle2, Wallet, ArrowUpRight, Shield, Clock, ChevronRight, Sparkles, Briefcase } from 'lucide-react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useUnifiedTransactions } from '@/hooks/useUnifiedTransactions';
import { normalizeStatus, getTransactionLabel } from '@/lib/transactionUtils';
import { Card } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { Badge } from '@/components/ui/badge';

import QuickActionsTop from '@/components/dashboard/QuickActionsTop';
import TransactionsTable from '@/components/dashboard/TransactionsTable';
import CertificatesCard from '@/components/dashboard/CertificatesCard';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import OnboardingTour, { useOnboarding } from '@/components/OnboardingTour';
import MetalCard from '@/components/dashboard/MetalCard';

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

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Welcome Header */}
        <section>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Welcome back, {userName}</h1>
          <p className="text-gray-500 text-sm mt-1">Here's an overview of your portfolio performance</p>
        </section>

        {/* Quick Actions - Colorful buttons */}
        <section>
          <QuickActionsTop />
        </section>

        {/* Stats Cards + Metal Card Layout */}
        <section className="flex flex-col lg:flex-row gap-6">
          {/* Left side - Stats Cards */}
          <div className="flex-1 space-y-4">
            {/* Row 1 - Gold Storage, Gold Value USD, Gold Value AED */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4 bg-white border border-gray-100 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-500">Gold Storage</p>
                  <div className="w-6 h-6 rounded bg-purple-100 flex items-center justify-center">
                    <Database className="w-3.5 h-3.5 text-purple-600" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {showBalance ? `${formatNumber((totals.vaultGoldGrams || 0) / 1000, 4)} kg` : hiddenValue}
                </p>
                <p className="text-xs text-gray-400 mt-1">Deposited in FinaVault</p>
              </Card>
              
              <Card className="p-4 bg-white border border-gray-100 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-500">Gold Value (USD)</p>
                  <div className="w-6 h-6 rounded bg-yellow-100 flex items-center justify-center">
                    <span className="text-yellow-600 text-sm font-bold">$</span>
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {showBalance ? `$${formatNumber(totalGoldGrams * goldPrice)}` : hiddenValue}
                </p>
                <p className="text-xs text-gray-400 mt-1">Worth in USD</p>
              </Card>
              
              <Card className="p-4 bg-white border border-gray-100 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-500">Gold Value (AED)</p>
                  <div className="w-6 h-6 rounded bg-green-100 flex items-center justify-center">
                    <span className="text-green-600 text-xs font-bold">Dh</span>
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {showBalance ? formatNumber(totalGoldGrams * goldPrice * 3.67) : hiddenValue}
                </p>
                <p className="text-xs text-gray-400 mt-1">Worth in AED</p>
              </Card>
            </div>
            
            {/* Row 2 - Total Portfolio, BNSL Invested, Total Profit */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4 bg-white border border-gray-100 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-500">Total Portfolio</p>
                  <div className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center">
                    <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {showBalance ? `$${formatNumber(totalPortfolioValue)}` : hiddenValue}
                </p>
                <p className="text-xs text-gray-400 mt-1">Overall Investment</p>
              </Card>
              
              <Card className="p-4 bg-white border border-gray-100 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-500">BNSL Invested</p>
                  <div className="w-6 h-6 rounded bg-purple-100 flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {showBalance ? `${formatNumber(totals.bnslLockedGrams || 0, 1)}g` : hiddenValue}
                </p>
                <p className="text-xs text-gray-400 mt-1">In active plans</p>
              </Card>
              
              <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-500">Total Profit</p>
                  <div className="w-6 h-6 rounded bg-green-100 flex items-center justify-center">
                    <ArrowUpRight className="w-3.5 h-3.5 text-green-600" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-green-600">
                  {showBalance ? `+$${formatNumber(totals.bnslTotalProfit || 0)}` : hiddenValue}
                </p>
                <p className="text-xs text-gray-400 mt-1">ROI from BNSL</p>
              </Card>
            </div>
          </div>
          
          {/* Right side - Metal Card */}
          <div className="hidden lg:flex items-center justify-center">
            <MetalCard />
          </div>
        </section>

        {/* Dual Wallet Section */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* LGPW Card */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 p-6">
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
                <p className="text-4xl font-bold text-white">
                  {showBalance ? `${formatNumber(totals.mpgwAvailableGrams || 0, 4)}g` : hiddenValue}
                </p>
                <p className="text-sm text-purple-200 mt-1">
                  {showBalance ? `≈ ${formatCurrency((totals.mpgwAvailableGrams || 0) * goldPrice)}` : ''}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/20">
                <div>
                  <p className="text-xs text-purple-200">Pending</p>
                  <p className="text-lg font-semibold text-white">{formatNumber(totals.mpgwPendingGrams || 0, 4)}g</p>
                </div>
                <div>
                  <p className="text-xs text-purple-200">Locked (BNSL)</p>
                  <p className="text-lg font-semibold text-white">{formatNumber(totals.mpgwLockedBnslGrams || 0, 4)}g</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* FGPW Card */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-amber-600 to-orange-700 p-6">
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
                <p className="text-4xl font-bold text-white">
                  {showBalance ? `${formatNumber(totals.fpgwAvailableGrams || 0, 4)}g` : hiddenValue}
                </p>
                <p className="text-sm text-amber-100 mt-1">
                  {showBalance && totals.fpgwWeightedAvgPriceUsd ? `Cost: $${formatNumber(totals.fpgwWeightedAvgPriceUsd, 2)}/g` : 'No holdings'}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/20">
                <div>
                  <p className="text-xs text-amber-100">Pending</p>
                  <p className="text-lg font-semibold text-white">{formatNumber(totals.fpgwPendingGrams || 0, 4)}g</p>
                </div>
                <div>
                  <p className="text-xs text-amber-100">Locked</p>
                  <p className="text-lg font-semibold text-white">{formatNumber(totals.fpgwLockedBnslGrams || 0, 4)}g</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FinaBridge Card for Business Users */}
        {isBusinessUser && (
          <section>
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-6">
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
                    <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                      View <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </div>
                
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-blue-200 mb-1">Available Gold</p>
                    <p className="text-2xl font-bold text-white">
                      {showBalance ? `${formatNumber(finaBridge?.goldGrams || 0, 4)}g` : hiddenValue}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-blue-200 mb-1">Active Cases</p>
                    <p className="text-2xl font-bold text-white">{finaBridge?.activeCases || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-blue-200 mb-1">Trade Volume</p>
                    <p className="text-2xl font-bold text-white">${formatNumber(finaBridge?.tradeVolume || 0)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-blue-200 mb-1">USD Value</p>
                    <p className="text-2xl font-bold text-white">{showBalance ? formatCurrency(finaBridge?.usdValue || 0) : hiddenValue}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Insights Row */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* BNSL Summary */}
          <Card className="p-5 bg-gradient-to-br from-teal-50 to-emerald-50 border-teal-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">BNSL Program</h3>
                <p className="text-xs text-gray-500">Buy Now, Sell Later</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Invested</span>
                <span className="font-semibold text-gray-900">{formatNumber(totals.bnslLockedGrams || 0, 4)}g</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Active Plans</span>
                <span className="font-semibold text-teal-600">{totals.activeBnslPlans || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Profit</span>
                <span className="font-semibold text-emerald-600">+{formatCurrency(totals.bnslTotalProfit || 0)}</span>
              </div>
            </div>
            <Link href="/bnsl">
              <Button variant="outline" className="w-full mt-4 border-teal-300 text-teal-700 hover:bg-teal-100">
                View Plans <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </Card>
          
          {/* Pending Deposits */}
          <Card className="p-5 bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Pending</h3>
                <p className="text-xs text-gray-500">Awaiting verification</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Gold Pending</span>
                <span className="font-semibold text-orange-600">{formatNumber(totals.pendingGoldGrams || 0, 4)}g</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">USD Pending</span>
                <span className="font-semibold text-gray-900">${formatNumber(totals.pendingDepositUsd || 0)}</span>
              </div>
            </div>
            <Link href="/finapay">
              <Button variant="outline" className="w-full mt-4 border-orange-300 text-orange-700 hover:bg-orange-100">
                View Details <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </Card>
          
          {/* Certificates */}
          <Card className="p-5 bg-gradient-to-br from-purple-50 to-fuchsia-50 border-purple-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Certificates</h3>
                <p className="text-xs text-gray-500">Ownership proof</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total</span>
                <span className="font-semibold text-gray-900">{certificates?.summary?.total || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Active</span>
                <span className="font-semibold text-purple-600">{certificates?.summary?.active || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Physical Storage</span>
                <span className="font-semibold text-emerald-600">{certificates?.summary?.physicalStorage || 0}</span>
              </div>
            </div>
            <Link href="/vault">
              <Button variant="outline" className="w-full mt-4 border-purple-300 text-purple-700 hover:bg-purple-100">
                View All <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </Card>
        </section>

        {/* Recent Transactions & Certificates */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TransactionsTable transactions={transactions} goldPrice={goldPrice} />
          <CertificatesCard certificates={certificates?.recent || []} isLoading={isLoading} />
        </section>

      </div>

      {showOnboarding && (
        <OnboardingTour onComplete={completeOnboarding} />
      )}
    </DashboardLayout>
  );
}
