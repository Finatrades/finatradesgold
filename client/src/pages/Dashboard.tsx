import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { Database, TrendingUp, Coins, CheckCircle2, Wallet, ArrowUpRight, Shield, Clock, ChevronRight, Sparkles, Briefcase, Copy, Check, Info, Package } from 'lucide-react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useUnifiedTransactions } from '@/hooks/useUnifiedTransactions';
import { normalizeStatus, getTransactionLabel } from '@/lib/transactionUtils';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

import QuickActionsTop from '@/components/dashboard/QuickActionsTop';
import TransactionsTable from '@/components/dashboard/TransactionsTable';
import CertificatesCard from '@/components/dashboard/CertificatesCard';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import OnboardingTour, { useOnboarding } from '@/components/OnboardingTour';
import MetalCard from '@/components/dashboard/MetalCard';
import DashboardWalletCards from '@/components/dashboard/DashboardWalletCards';
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
  
  const [copiedId, setCopiedId] = useState(false);
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

  const finatradesId = user?.customFinatradesId || user?.finatradesId || `FT-${user?.id?.slice(0, 8).toUpperCase() || "XXXXXXXX"}`;
  const copyFinatradesId = async () => {
    await navigator.clipboard.writeText(finatradesId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

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

  const { data: physicalDepositsData } = useQuery<{ deposits: Array<{ id: string; status: string; goldType: string; estimatedGrams: string; createdAt: string }> }>({
    queryKey: ['physical-deposits', user?.id],
    queryFn: async () => {
      const res = await fetch('/api/physical-deposits/deposits');
      if (!res.ok) return { deposits: [] };
      return res.json();
    },
    enabled: !!user?.id,
    staleTime: 60000,
  });

  const { data: pendingDepositsData } = useQuery<{ requests: Array<{ id: string; status: string; expectedGoldGrams: number }> }>({
    queryKey: ['pending-deposit-requests', user?.id],
    queryFn: async () => {
      const res = await fetch('/api/deposit-requests/pending');
      if (!res.ok) return { requests: [] };
      return res.json();
    },
    enabled: !!user?.id,
    staleTime: 60000,
  });

  const pendingDepositGrams = (pendingDepositsData?.requests || []).reduce(
    (sum, req) => sum + (req.expectedGoldGrams || 0), 0
  );

  const pendingPhysicalDeposits = (physicalDepositsData?.deposits || []).filter(
    d => ['SUBMITTED', 'UNDER_REVIEW', 'RECEIVED', 'INSPECTION', 'NEGOTIATION', 'AGREED', 'READY_FOR_PAYMENT', 'APPROVED'].includes(d.status)
  );

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

        {/* Physical Gold Deposit Notification */}
        {pendingPhysicalDeposits.length > 0 && (
          <Alert className="bg-yellow-50 border-yellow-200" data-testid="alert-physical-deposit">
            <Package className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="flex items-center justify-between">
              <span className="text-yellow-800" data-testid="text-physical-deposit-count">
                You have <strong>{pendingPhysicalDeposits.length}</strong> physical gold deposit{pendingPhysicalDeposits.length > 1 ? 's' : ''} in progress
              </span>
              <Link href="/finavault">
                <Button variant="outline" size="sm" className="border-yellow-300 text-yellow-700 hover:bg-yellow-100" data-testid="button-view-physical-status">
                  View Status
                </Button>
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {/* Mobile: Hero Balance Card */}
        <section className="md:hidden">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-violet-800 p-5 shadow-lg">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full blur-2xl -ml-10 -mb-10"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-white/80 text-[12px] font-medium">Welcome back</p>
                  <h1 className="text-white text-[20px] font-bold">{userName}</h1>
                </div>
                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                  <Coins className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-white/70 text-[12px] mb-1">Total Portfolio Value</p>
                <p className="text-white text-3xl font-bold tracking-tight">
                  {showBalance ? `$${formatNumber(totalPortfolioValue)}` : hiddenValue}
                </p>
                <p className="text-white/60 text-[12px] mt-1">
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

        {/* Desktop: Welcome Header */}
        <section className="hidden md:block pb-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[20px] font-bold text-gray-900">
                Welcome back, {userName}
              </h1>
              <p className="text-gray-500 text-[12px] mt-0.5">Here's an overview of your portfolio performance</p>
            </div>
            <div className="flex items-center gap-2 bg-violet-50 px-3 py-2 rounded-lg border border-violet-200">
              <span className="text-[12px] text-gray-500">FINATRADES ID:</span>
              <span className="text-sm font-semibold text-violet-700">{finatradesId}</span>
              <button onClick={copyFinatradesId} className="p-1 hover:bg-violet-100 rounded transition-colors" title="Copy ID" data-testid="button-copy-id">
                {copiedId ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-violet-600" />}
              </button>
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        <section>
          <QuickActionsTop />
        </section>

        {/* Stats Cards + Metal Card Layout */}
        <section className="space-y-4">
          {/* Desktop: KPI Cards Row 1 - Gold-related = amber/yellow tones */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Gold Balance - Amber */}
            <Card className="p-4 bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-200 rounded-xl shadow-sm hover:shadow-md hover:border-amber-300 hover:-translate-y-0.5 transition-all duration-200" data-testid="card-gold-balance">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[14px] text-gray-700 font-medium">Gold Balance</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="w-7 h-7 rounded-full bg-amber-200 flex items-center justify-center cursor-pointer hover:bg-amber-300 transition-colors">
                        <Info className="w-4 h-4 text-amber-700" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[250px] text-sm">
                      <p>Your total gold holdings across all wallets (LGPW + FGPW).</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-[24px] font-bold text-gray-900">
                {showBalance ? `${formatNumber(totalGoldGrams, 4)}g` : hiddenValue}
              </p>
              <p className="text-[12px] text-gray-400 mt-1">Total gold you own across all wallets</p>
            </Card>
            
            {/* Gold Value USD - Amber */}
            <Card className="p-4 bg-gradient-to-br from-amber-50/70 to-orange-50 border-2 border-amber-200 rounded-xl shadow-sm hover:shadow-md hover:border-amber-300 hover:-translate-y-0.5 transition-all duration-200" data-testid="card-gold-usd">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[14px] text-gray-700 font-medium">Gold Value (USD)</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="w-7 h-7 rounded-full bg-amber-200 flex items-center justify-center cursor-pointer hover:bg-amber-300 transition-colors">
                        <Info className="w-4 h-4 text-amber-700" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[250px] text-sm">
                      <p>Current market value of your total gold holdings in US Dollars based on live gold price.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-[24px] font-bold text-gray-900">
                {showBalance ? `$${formatNumber(totalGoldGrams * goldPrice)}` : hiddenValue}
              </p>
              <p className="text-[12px] text-gray-400 mt-1">Market value at current gold price</p>
            </Card>
            
            {/* Gold Value AED - Amber */}
            <Card className="p-4 bg-gradient-to-br from-yellow-50 to-amber-50/70 border-2 border-amber-200 rounded-xl shadow-sm hover:shadow-md hover:border-amber-300 hover:-translate-y-0.5 transition-all duration-200" data-testid="card-gold-aed">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[14px] text-gray-700 font-medium">Gold Value (AED)</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="w-7 h-7 rounded-full bg-amber-200 flex items-center justify-center cursor-pointer hover:bg-amber-300 transition-colors">
                        <Info className="w-4 h-4 text-amber-700" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[250px] text-sm">
                      <p>Current market value of your total gold holdings in UAE Dirhams (AED).</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-[24px] font-bold text-gray-900">
                {showBalance ? formatNumber(totalGoldGrams * goldPrice * 3.67) : hiddenValue}
              </p>
              <p className="text-[12px] text-gray-400 mt-1">Worth in UAE Dirhams</p>
            </Card>
          </div>
          
          {/* Desktop: KPI Cards Row 2 - Mixed color system */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card Wallet - Green tones */}
            <Link href="/finacard">
              <Card className="relative p-5 overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 border-0 rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer" data-testid="card-wallet">
                <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-purple-500/20 to-transparent rounded-full blur-2xl -mr-16 -mt-16" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-indigo-500/15 to-transparent rounded-full blur-xl -ml-10 -mb-10" />
                <div className="absolute top-3 right-3 w-12 h-8 rounded-md bg-gradient-to-br from-amber-300 to-yellow-500 opacity-70" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur flex items-center justify-center">
                      <Wallet className="w-4 h-4 text-white/80" />
                    </div>
                    <p className="text-white/70 text-[14px] font-medium tracking-wide uppercase">Card Wallet</p>
                    <div className="ml-auto">
                      <ArrowUpRight className="w-4 h-4 text-white/40" />
                    </div>
                  </div>
                  <p className="text-[24px] font-bold text-white tracking-tight">
                    {showBalance ? `${formatNumber(totals.finacardGoldGrams || 0, 4)}g` : hiddenValue}
                  </p>
                  <p className="text-white/50 text-[12px] mt-2 font-medium">
                    {showBalance ? `≈ $${formatNumber(totals.finacardValueUsd || 0)}` : ''}
                  </p>
                  <p className="text-white/40 text-[11px] mt-1">Gold loaded on your FinaCard for spending</p>
                </div>
              </Card>
            </Link>
            
            {/* BNSL Invested - Purple tones */}
            <Card className="p-4 bg-gradient-to-br from-violet-50 to-purple-50 border-2 border-violet-200 rounded-xl shadow-sm hover:shadow-md hover:border-violet-300 hover:-translate-y-0.5 transition-all duration-200" data-testid="card-bnsl">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[14px] text-gray-700 font-medium">BNSL Invested</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="w-7 h-7 rounded-full bg-violet-200 flex items-center justify-center cursor-pointer hover:bg-violet-300 transition-colors">
                        <Info className="w-4 h-4 text-violet-700" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[250px] text-sm">
                      <p>Gold locked in Buy Now Sell Later (BNSL) investment plans earning returns over time.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-[24px] font-bold text-gray-900">
                {showBalance ? `${formatNumber(totals.bnslLockedGrams || 0, 1)}g` : hiddenValue}
              </p>
              <p className="text-[12px] text-gray-400 mt-1">Gold locked in active investment plans</p>
            </Card>
            
            {/* Total Profit - Green tones */}
            <Card className="p-4 bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-xl shadow-sm hover:shadow-md hover:border-emerald-300 hover:-translate-y-0.5 transition-all duration-200" data-testid="card-profit">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[14px] text-gray-700 font-medium">Total Profit</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="w-7 h-7 rounded-full bg-emerald-200 flex items-center justify-center cursor-pointer hover:bg-emerald-300 transition-colors">
                        <Info className="w-4 h-4 text-emerald-700" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[250px] text-sm">
                      <p>Total return on investment earned from your BNSL plans.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-[24px] font-bold text-emerald-600">
                {showBalance ? `+$${formatNumber(totals.bnslTotalProfit || 0)}` : hiddenValue}
              </p>
              <p className="text-[12px] text-gray-400 mt-1">Total earnings from BNSL investments</p>
            </Card>
          </div>
        </section>

        {/* Virtual Card - Dedicated Section */}
        <section className="hidden lg:block">
          <div className="flex items-center justify-center">
            <MetalCard />
          </div>
        </section>

        {/* Wallet Cards Section - 3 Cards */}
        <section className="hidden md:block">
          <DashboardWalletCards 
            finaPayWallet={{
              goldGrams: totals.mpgwAvailableGrams || 0,
              usdValue: (totals.mpgwAvailableGrams || 0) * goldPrice,
              pending: pendingDepositGrams || totals.mpgwPendingGrams || 0,
              transactions: transactions.length
            }}
            bnslData={{
              goldGrams: totals.bnslLockedGrams || 0,
              usdValue: (totals.bnslLockedGrams || 0) * goldPrice,
              lockedGrams: totals.bnslLockedGrams || 0,
              activePlans: totals.activeBnslPlans || 0
            }}
            finaBridgeData={finaBridge}
            userName={userName}
            isBusinessUser={isBusinessUser}
          />
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
