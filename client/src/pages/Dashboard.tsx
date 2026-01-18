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
import { useIsMobile } from '@/hooks/useIsMobile';
import MobileDashboard from '@/components/mobile/MobileDashboard';

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
  const isMobile = useIsMobile();
  
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

  if (isMobile) {
    return (
      <DashboardLayout>
        <MobileDashboard />
        {showOnboarding && (
          <OnboardingTour onComplete={completeOnboarding} />
        )}
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

        {/* Mobile: Hero Balance Card */}
        <section className="md:hidden">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 via-fuchsia-600 to-pink-500 p-5 shadow-lg">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full blur-2xl -ml-10 -mb-10"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-white/80 text-xs font-medium">Welcome back</p>
                  <h1 className="text-white text-xl font-bold">{userName}</h1>
                </div>
                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                  <Coins className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-white/70 text-xs mb-1">Total Portfolio Value</p>
                <p className="text-white text-3xl font-bold tracking-tight">
                  {showBalance ? `$${formatNumber(totalPortfolioValue)}` : hiddenValue}
                </p>
                <p className="text-white/60 text-xs mt-1">
                  {showBalance ? `≈ ${formatNumber(totalGoldGrams, 4)}g gold` : ''}
                </p>
              </div>
              <div className="flex gap-4 mt-4 pt-3 border-t border-white/20">
                <div className="flex-1">
                  <p className="text-white/60 text-[10px]">USD</p>
                  <p className="text-white font-semibold text-sm">${formatNumber(totalGoldGrams * goldPrice)}</p>
                </div>
                <div className="flex-1">
                  <p className="text-white/60 text-[10px]">AED</p>
                  <p className="text-white font-semibold text-sm">Dh {formatNumber(totalGoldGrams * goldPrice * 3.67)}</p>
                </div>
                <div className="flex-1">
                  <p className="text-white/60 text-[10px]">Storage</p>
                  <p className="text-white font-semibold text-sm">{formatNumber((totals.vaultGoldGrams || 0) / 1000, 4)} kg</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Desktop: Welcome Header - Modern Design */}
        <section className="hidden md:block pb-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-500 bg-clip-text text-transparent">
                Welcome back, {userName}
              </h1>
              <p className="text-gray-500 text-sm mt-1">Your portfolio overview • Last updated just now</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200/50 rounded-xl">
                <p className="text-xs text-emerald-600 font-medium">Gold Price</p>
                <p className="text-lg font-bold text-emerald-700 flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  ${goldPrice.toFixed(2)}/g
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Actions - Colorful buttons */}
        <section>
          <QuickActionsTop />
        </section>

        {/* Stats Cards + Metal Card Layout */}
        <section className="flex flex-col lg:flex-row gap-4 md:gap-6">
          {/* Left side - Stats Cards */}
          <div className="flex-1 space-y-3 md:space-y-4">
            {/* Mobile: Compact 2x2 grid for secondary stats */}
            <div className="grid grid-cols-2 gap-2 md:hidden">
              <Card className="p-3 bg-gradient-to-br from-purple-50 to-white border border-purple-100 rounded-xl shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-500 flex items-center justify-center shadow-sm">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-[11px] text-gray-600 font-medium">BNSL</p>
                </div>
                <p className="text-lg font-bold text-gray-900">{formatNumber(totals.bnslLockedGrams || 0, 1)}g</p>
                <p className="text-[10px] text-green-600 font-medium">+${formatNumber(totals.bnslTotalProfit || 0)}</p>
              </Card>
              
              <Card className="p-3 bg-gradient-to-br from-amber-50 to-white border border-amber-100 rounded-xl shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center shadow-sm">
                    <Database className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-[11px] text-gray-600 font-medium">Vault</p>
                </div>
                <p className="text-lg font-bold text-gray-900">{formatNumber((totals.vaultGoldGrams || 0), 2)}g</p>
                <p className="text-[10px] text-gray-500">FinaVault</p>
              </Card>
              
              <Card className="p-3 bg-gradient-to-br from-emerald-50 to-white border border-emerald-100 rounded-xl shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shadow-sm">
                    <ArrowUpRight className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-[11px] text-gray-600 font-medium">Profit</p>
                </div>
                <p className="text-lg font-bold text-emerald-600">+${formatNumber(totals.bnslTotalProfit || 0)}</p>
                <p className="text-[10px] text-gray-500">Total ROI</p>
              </Card>
              
              <Card className="p-3 bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-xl shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center shadow-sm">
                    <TrendingUp className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-[11px] text-gray-600 font-medium">Growth</p>
                </div>
                <p className="text-lg font-bold text-gray-900">{formatNumber(totals.walletGoldGrams || 0, 2)}g</p>
                <p className="text-[10px] text-gray-500">Wallet</p>
              </Card>
            </div>

            {/* Desktop: Premium Gradient KPI Cards */}
            <div className="hidden md:grid grid-cols-3 gap-5">
              {/* Gold Storage - Purple Gradient */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 p-5 shadow-lg hover:shadow-xl transition-shadow">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-purple-200">Gold Storage</p>
                    <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <Database className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-white tracking-tight">
                    {showBalance ? `${formatNumber((totals.vaultGoldGrams || 0) / 1000, 4)} kg` : hiddenValue}
                  </p>
                  <p className="text-sm text-purple-200 mt-2">Deposited in FinaVault</p>
                </div>
              </div>
              
              {/* Gold Value USD - Emerald Gradient */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 p-5 shadow-lg hover:shadow-xl transition-shadow">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-emerald-100">Gold Value (USD)</p>
                    <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <span className="text-white text-lg font-bold">$</span>
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-white tracking-tight">
                    {showBalance ? `$${formatNumber(totalGoldGrams * goldPrice)}` : hiddenValue}
                  </p>
                  <p className="text-sm text-emerald-100 mt-2">Worth in USD</p>
                </div>
              </div>
              
              {/* Gold Value AED - Blue Gradient */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 p-5 shadow-lg hover:shadow-xl transition-shadow">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-blue-100">Gold Value (AED)</p>
                    <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <span className="text-white text-xs font-bold">AED</span>
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-white tracking-tight">
                    {showBalance ? formatNumber(totalGoldGrams * goldPrice * 3.67) : hiddenValue}
                  </p>
                  <p className="text-sm text-blue-100 mt-2">Worth in AED</p>
                </div>
              </div>
            </div>
            
            {/* Desktop Row 2 - Premium Gradient Cards */}
            <div className="hidden md:grid grid-cols-3 gap-5">
              {/* Total Portfolio - Indigo/Violet Gradient */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-600 to-purple-700 p-5 shadow-lg hover:shadow-xl transition-shadow">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-indigo-100">Total Portfolio</p>
                    <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-white tracking-tight">
                    {showBalance ? `$${formatNumber(totalPortfolioValue)}` : hiddenValue}
                  </p>
                  <p className="text-sm text-indigo-100 mt-2">Overall Investment</p>
                </div>
              </div>
              
              {/* BNSL Invested - Fuchsia/Pink Gradient */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-fuchsia-500 via-pink-600 to-rose-700 p-5 shadow-lg hover:shadow-xl transition-shadow">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-fuchsia-100">BNSL Invested</p>
                    <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-white tracking-tight">
                    {showBalance ? `${formatNumber(totals.bnslLockedGrams || 0, 1)}g` : hiddenValue}
                  </p>
                  <p className="text-sm text-fuchsia-100 mt-2">In active plans</p>
                </div>
              </div>
              
              {/* Total Profit - Green Gradient */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500 via-emerald-600 to-teal-700 p-5 shadow-lg hover:shadow-xl transition-shadow">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-green-100">Total Profit</p>
                    <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <ArrowUpRight className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-white tracking-tight">
                    {showBalance ? `+$${formatNumber(totals.bnslTotalProfit || 0)}` : hiddenValue}
                  </p>
                  <p className="text-sm text-green-100 mt-2">ROI from BNSL</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right side - Metal Card */}
          <div className="hidden lg:flex items-center justify-center">
            <MetalCard />
          </div>
        </section>

        {/* Dual Wallet Section - PhonePe Style */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* LGPW Card */}
          <div className="relative overflow-hidden rounded-2xl md:rounded-3xl bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 p-5 md:p-7 shadow-xl hover:shadow-2xl transition-shadow">
            <div className="absolute top-0 right-0 w-32 md:w-40 h-32 md:h-40 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-400/20 rounded-full blur-2xl"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4 md:mb-5">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Wallet className="w-6 h-6 md:w-7 md:h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base md:text-lg">LGPW</h3>
                    <p className="text-xs md:text-sm text-purple-200">Live Gold Price</p>
                  </div>
                </div>
                <Badge className="bg-white/20 text-white border-0 text-xs md:text-sm px-3 py-1 font-medium">Live</Badge>
              </div>
              
              <div className="mb-4 md:mb-5">
                <p className="text-sm md:text-base text-purple-200 mb-1 md:mb-2 font-medium">Available</p>
                <p className="text-3xl md:text-5xl font-bold text-white tracking-tight">
                  {showBalance ? `${formatNumber(totals.mpgwAvailableGrams || 0, 4)}g` : hiddenValue}
                </p>
                <p className="text-sm md:text-base text-purple-200 mt-1 md:mt-2">
                  {showBalance ? `≈ ${formatCurrency((totals.mpgwAvailableGrams || 0) * goldPrice)}` : ''}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-3 md:gap-4 pt-4 md:pt-5 border-t border-white/20">
                <div>
                  <p className="text-xs md:text-sm text-purple-200 mb-1">Pending</p>
                  <p className="text-lg md:text-xl font-semibold text-white">{formatNumber(totals.mpgwPendingGrams || 0, 4)}g</p>
                </div>
                <div>
                  <p className="text-xs md:text-sm text-purple-200 mb-1">Locked</p>
                  <p className="text-lg md:text-xl font-semibold text-white">{formatNumber(totals.mpgwLockedBnslGrams || 0, 4)}g</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* FGPW Card */}
          <div className="relative overflow-hidden rounded-2xl md:rounded-3xl bg-gradient-to-br from-amber-500 via-amber-600 to-orange-700 p-5 md:p-7 shadow-xl hover:shadow-2xl transition-shadow">
            <div className="absolute top-0 right-0 w-32 md:w-40 h-32 md:h-40 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-amber-400/20 rounded-full blur-2xl"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4 md:mb-5">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Database className="w-6 h-6 md:w-7 md:h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base md:text-lg">FGPW</h3>
                    <p className="text-xs md:text-sm text-amber-100">Fixed Gold Price</p>
                  </div>
                </div>
                <Badge className="bg-white/20 text-white border-0 text-xs md:text-sm px-3 py-1 font-medium">Fixed</Badge>
              </div>
              
              <div className="mb-4 md:mb-5">
                <p className="text-sm md:text-base text-amber-100 mb-1 md:mb-2 font-medium">Available</p>
                <p className="text-3xl md:text-5xl font-bold text-white tracking-tight">
                  {showBalance ? `${formatNumber(totals.fpgwAvailableGrams || 0, 4)}g` : hiddenValue}
                </p>
                <p className="text-sm md:text-base text-amber-100 mt-1 md:mt-2">
                  {showBalance && totals.fpgwWeightedAvgPriceUsd ? `Cost: $${formatNumber(totals.fpgwWeightedAvgPriceUsd, 2)}/g` : 'No holdings'}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-3 md:gap-4 pt-4 md:pt-5 border-t border-white/20">
                <div>
                  <p className="text-xs md:text-sm text-amber-100 mb-1">Pending</p>
                  <p className="text-lg md:text-xl font-semibold text-white">{formatNumber(totals.fpgwPendingGrams || 0, 4)}g</p>
                </div>
                <div>
                  <p className="text-xs md:text-sm text-amber-100 mb-1">Locked</p>
                  <p className="text-lg md:text-xl font-semibold text-white">{formatNumber(totals.fpgwLockedBnslGrams || 0, 4)}g</p>
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
            <Link href="/finavault">
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
