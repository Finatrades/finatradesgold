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

  const finatradesId = user?.finatradesId || `FT-${user?.id?.slice(0, 8).toUpperCase() || "XXXXXXXX"}`;
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

  // Fetch user's pending physical deposit requests
  const { data: physicalDeposits } = useQuery<Array<{ id: string; status: string; goldType: string; estimatedGrams: string; createdAt: string }>>({
    queryKey: ['physical-deposits', user?.id],
    queryFn: async () => {
      const res = await fetch('/api/physical-deposits/deposits');
      if (!res.ok) return [];
      const data = await res.json();
      return data.deposits || [];
    },
    enabled: !!user?.id,
    staleTime: 60000,
  });

  // Filter for pending physical deposits (not yet completed/rejected/cancelled)
  const pendingPhysicalDeposits = physicalDeposits?.filter(
    d => ['SUBMITTED', 'UNDER_REVIEW', 'RECEIVED', 'INSPECTION', 'NEGOTIATION', 'AGREED', 'READY_FOR_PAYMENT', 'APPROVED'].includes(d.status)
  ) || [];

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

        {/* Desktop: Welcome Header - Clean Design */}
        <section className="hidden md:block pb-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome back, {userName}
              </h1>
              <p className="text-gray-500 text-sm mt-0.5">Here's an overview of your portfolio performance</p>
            </div>
            <div className="flex items-center gap-2 bg-purple-50 px-3 py-2 rounded-lg border border-purple-200">
              <span className="text-xs text-gray-500">FINATRADES ID:</span>
              <span className="text-sm font-semibold text-purple-700">{finatradesId}</span>
              <button onClick={copyFinatradesId} className="p-1 hover:bg-purple-100 rounded transition-colors" title="Copy ID">
                {copiedId ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-purple-600" />}
              </button>
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

            {/* Desktop: White KPI Cards Row 1 */}
            <div className="hidden md:grid grid-cols-3 gap-4">
              {/* Gold Balance */}
              <Card className="p-4 bg-gradient-to-br from-white to-gray-50 border border-gray-100 rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_30px_-4px_rgba(139,92,246,0.3)] hover:border-purple-300 hover:-translate-y-1 transition-all duration-300">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-500 font-medium">Gold Balance</p>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center cursor-pointer hover:bg-purple-200 transition-colors">
                          <Info className="w-4 h-4 text-purple-600" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[250px] text-sm">
                        <p>Your total gold holdings across all wallets (LGPW + FGPW).</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {showBalance ? `${formatNumber(totalGoldGrams, 4)}g` : hiddenValue}
                </p>
                <p className="text-xs text-gray-500 mt-1">Total Gold Holdings</p>
              </Card>
              
              {/* Gold Value USD */}
              <Card className="p-4 bg-gradient-to-br from-white to-gray-50 border border-gray-100 rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_30px_-4px_rgba(139,92,246,0.3)] hover:border-purple-300 hover:-translate-y-1 transition-all duration-300">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-500 font-medium">Gold Value (USD)</p>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center cursor-pointer hover:bg-purple-200 transition-colors">
                          <Info className="w-4 h-4 text-purple-600" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[250px] text-sm">
                        <p>Current market value of your total gold holdings in US Dollars based on live gold price.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {showBalance ? `$${formatNumber(totalGoldGrams * goldPrice)}` : hiddenValue}
                </p>
                <p className="text-xs text-gray-500 mt-1">Worth in USD</p>
              </Card>
              
              {/* Gold Value AED */}
              <Card className="p-4 bg-gradient-to-br from-white to-gray-50 border border-gray-100 rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_30px_-4px_rgba(139,92,246,0.3)] hover:border-purple-300 hover:-translate-y-1 transition-all duration-300">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-500 font-medium">Gold Value (AED)</p>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center cursor-pointer hover:bg-purple-200 transition-colors">
                          <Info className="w-4 h-4 text-purple-600" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[250px] text-sm">
                        <p>Current market value of your total gold holdings in UAE Dirhams (AED).</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {showBalance ? formatNumber(totalGoldGrams * goldPrice * 3.67) : hiddenValue}
                </p>
                <p className="text-xs text-gray-500 mt-1">Worth in AED</p>
              </Card>
            </div>
            
            {/* Desktop: White KPI Cards Row 2 */}
            <div className="hidden md:grid grid-cols-3 gap-4">
              {/* Total Portfolio */}
              <Card className="p-4 bg-gradient-to-br from-white to-gray-50 border border-gray-100 rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_30px_-4px_rgba(139,92,246,0.3)] hover:border-purple-300 hover:-translate-y-1 transition-all duration-300">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-500 font-medium">Total Portfolio</p>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center cursor-pointer hover:bg-purple-200 transition-colors">
                          <Info className="w-4 h-4 text-purple-600" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[250px] text-sm">
                        <p>Combined value of all your investments including wallet gold, vault storage, and BNSL plans.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {showBalance ? `$${formatNumber(totalPortfolioValue)}` : hiddenValue}
                </p>
                <p className="text-xs text-gray-500 mt-1">Overall Investment</p>
              </Card>
              
              {/* BNSL Invested */}
              <Card className="p-4 bg-gradient-to-br from-white to-gray-50 border border-gray-100 rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_30px_-4px_rgba(139,92,246,0.3)] hover:border-purple-300 hover:-translate-y-1 transition-all duration-300">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-500 font-medium">BNSL Invested</p>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center cursor-pointer hover:bg-purple-200 transition-colors">
                          <Info className="w-4 h-4 text-purple-600" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[250px] text-sm">
                        <p>Gold locked in Buy Now Sell Later (BNSL) investment plans earning returns over time.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {showBalance ? `${formatNumber(totals.bnslLockedGrams || 0, 1)}g` : hiddenValue}
                </p>
                <p className="text-xs text-gray-500 mt-1">In active plans</p>
              </Card>
              
              {/* Total Profit */}
              <Card className="p-4 bg-gradient-to-br from-white to-gray-50 border border-gray-100 rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_30px_-4px_rgba(139,92,246,0.3)] hover:border-purple-300 hover:-translate-y-1 transition-all duration-300">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-500 font-medium">Total Profit</p>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center cursor-pointer hover:bg-purple-200 transition-colors">
                          <Info className="w-4 h-4 text-purple-600" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[250px] text-sm">
                        <p>Total return on investment earned from your BNSL plans.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="text-2xl font-bold text-green-600">
                  {showBalance ? `+$${formatNumber(totals.bnslTotalProfit || 0)}` : hiddenValue}
                </p>
                <p className="text-xs text-gray-500 mt-1">ROI from BNSL</p>
              </Card>
            </div>
          </div>
          
          {/* Right side - Metal Card */}
          <div className="hidden lg:flex items-center justify-center">
            <MetalCard />
          </div>
        </section>

        {/* Wallet Cards Section - 3 Cards */}
        <section className="hidden md:block">
          <DashboardWalletCards 
            finaPayWallet={{
              goldGrams: totals.mpgwAvailableGrams || 0,
              usdValue: (totals.mpgwAvailableGrams || 0) * goldPrice,
              pending: totals.mpgwPendingGrams || 0,
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
