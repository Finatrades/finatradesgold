import { useState, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { ArrowUpRight, ArrowDownLeft, Copy, Check, Package, CreditCard, Send, Download, TrendingUp, MoreVertical, Search, SlidersHorizontal, ChevronRight, Plus, Eye, EyeOff } from 'lucide-react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useUnifiedTransactions } from '@/hooks/useUnifiedTransactions';
import { normalizeStatus, getTransactionLabel } from '@/lib/transactionUtils';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import OnboardingTour, { useOnboarding } from '@/components/OnboardingTour';
import { useIsMobile } from '@/hooks/useIsMobile';
import MobileDashboard from '@/components/mobile/MobileDashboard';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { format, isValid } from 'date-fns';

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

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Dashboard() {
  const { user } = useAuth();
  const { totals, goldPrice, isLoading } = useDashboardData();
  const { transactions: unifiedTx } = useUnifiedTransactions({ limit: 10 });
  const { showOnboarding, completeOnboarding } = useOnboarding();
  const isMobile = useIsMobile();
  
  const [copiedId, setCopiedId] = useState(false);
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [activitySearch, setActivitySearch] = useState('');

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
  const showBalance = (prefs?.showBalance !== false) && balanceVisible;
  const hiddenValue = '••••••';

  const userName = user?.firstName || user?.email?.split('@')[0] || 'User';
  const isBusinessUser = user?.accountType === 'business' || !!user?.finabridgeRole;
  const totalGoldGrams = (totals.walletGoldGrams || 0) + (totals.vaultGoldGrams || 0);
  const totalPortfolioValue = totals.totalPortfolioUsd || 0;
  const walletGoldValue = (totals.walletGoldGrams || 0) * goldPrice;
  const vaultGoldValue = (totals.vaultGoldGrams || 0) * goldPrice;
  const bnslValue = (totals.bnslLockedGrams || 0) * goldPrice;
  const finacardValue = totals.finacardValueUsd || 0;

  const chartData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
    const base = (totalGoldGrams * goldPrice) / 8;
    const inflowMultipliers = [0.4, 0.5, 0.55, 0.85, 0.9, 1.0, 0.95, 1.1];
    const outflowMultipliers = [0.1, 0.15, 0.12, 0.2, 0.25, 0.18, 0.22, 0.3];
    return months.map((m, i) => ({
      name: m,
      income: Math.round(base * inflowMultipliers[i]),
      expense: Math.round(base * outflowMultipliers[i]),
    }));
  }, [totalGoldGrams, goldPrice]);

  const filteredActivities = useMemo(() => {
    if (!activitySearch) return transactions.slice(0, 5);
    return transactions.filter(t => 
      t.type?.toLowerCase().includes(activitySearch.toLowerCase()) ||
      t.id?.toLowerCase().includes(activitySearch.toLowerCase())
    ).slice(0, 5);
  }, [transactions, activitySearch]);

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

  const getActivityIcon = (type: string) => {
    const t = type?.toLowerCase() || '';
    if (t.includes('buy') || t.includes('deposit') || t.includes('add')) {
      return <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center"><ArrowDownLeft className="w-4 h-4 text-green-600" /></div>;
    }
    if (t.includes('sell') || t.includes('withdraw')) {
      return <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center"><ArrowUpRight className="w-4 h-4 text-red-600" /></div>;
    }
    if (t.includes('send') || t.includes('transfer')) {
      return <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center"><Send className="w-4 h-4 text-blue-600" /></div>;
    }
    if (t.includes('card')) {
      return <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center"><CreditCard className="w-4 h-4 text-purple-600" /></div>;
    }
    return <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center"><ArrowUpRight className="w-4 h-4 text-gray-600" /></div>;
  };

  const getStatusDot = (status: string) => {
    const s = status?.toLowerCase() || '';
    if (s === 'completed' || s === 'complete') return 'bg-green-500';
    if (s === 'pending') return 'bg-orange-500';
    if (s === 'processing' || s === 'in progress') return 'bg-blue-500';
    if (s === 'failed' || s === 'rejected') return 'bg-red-500';
    return 'bg-gray-400';
  };

  return (
    <DashboardLayout>
      <div className="max-w-[1400px] mx-auto space-y-6 pb-8">

        {pendingPhysicalDeposits.length > 0 && (
          <Alert className="bg-amber-50 border-amber-200 rounded-xl" data-testid="alert-physical-deposit">
            <Package className="h-4 w-4 text-amber-600" />
            <AlertDescription className="flex items-center justify-between">
              <span className="text-amber-800" data-testid="text-physical-deposit-count">
                You have <strong>{pendingPhysicalDeposits.length}</strong> physical gold deposit{pendingPhysicalDeposits.length > 1 ? 's' : ''} in progress
              </span>
              <Link href="/finavault">
                <Button variant="outline" size="sm" className="border-amber-300 text-amber-700 hover:bg-amber-100 rounded-lg" data-testid="button-view-physical-status">
                  View Status
                </Button>
              </Link>
            </AlertDescription>
          </Alert>
        )}

        <section className="flex items-center justify-between">
          <div>
            <h1 className="text-[28px] font-bold text-gray-900 tracking-tight" data-testid="text-welcome">
              {getGreeting()}, {userName}
            </h1>
            <p className="text-gray-500 text-[14px] mt-1">Stay on top of your gold portfolio, monitor progress, and track status.</p>
          </div>
          <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-200">
            <span className="text-[11px] text-gray-400 uppercase tracking-wider font-medium">ID:</span>
            <span className="text-sm font-semibold text-gray-800">{finatradesId}</span>
            <button onClick={copyFinatradesId} className="p-1 hover:bg-gray-200 rounded-lg transition-colors" title="Copy ID" aria-label="Copy Finatrades ID" data-testid="button-copy-id">
              {copiedId ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5 text-gray-500" />}
            </button>
          </div>
        </section>

        <div className="grid grid-cols-12 gap-5">

          <div className="col-span-12 xl:col-span-5 space-y-5">

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" data-testid="card-total-balance">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[14px] text-gray-500 font-medium">Total Balance</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setBalanceVisible(!balanceVisible)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors" aria-label={balanceVisible ? 'Hide balance' : 'Show balance'} data-testid="button-toggle-balance">
                    {balanceVisible ? <Eye className="w-4 h-4 text-gray-400" /> : <EyeOff className="w-4 h-4 text-gray-400" />}
                  </button>
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded-lg border border-gray-200 text-xs font-medium text-gray-700">
                    <span className="text-[10px]">🥇</span> GOLD
                  </div>
                </div>
              </div>
              <p className="text-[32px] font-bold text-gray-900 tracking-tight" data-testid="text-total-balance">
                {showBalance ? `$${formatNumber(totalPortfolioValue)}` : hiddenValue}
              </p>
              <div className="flex items-center gap-1.5 mt-1 mb-5">
                <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                <span className="text-green-600 text-[12px] font-semibold">↑ {formatNumber(totalGoldGrams, 2)}g</span>
                <span className="text-gray-400 text-[12px]">total gold</span>
              </div>

              <div className="flex gap-3">
                <Link href="/finapay" className="flex-1 flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white py-2.5 px-4 rounded-xl text-sm font-medium transition-colors" data-testid="button-transfer">
                  <Send className="w-4 h-4" />
                  Transfer
                </Link>
                <Link href="/finapay" className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-900 py-2.5 px-4 rounded-xl text-sm font-medium border border-gray-200 transition-colors" data-testid="button-request">
                  <Download className="w-4 h-4" />
                  Request
                </Link>
              </div>

              <div className="mt-5 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[13px] text-gray-500 font-medium">Wallets <span className="text-gray-300">|</span> <span className="text-gray-400">Total 3 wallets</span></span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 relative" data-testid="wallet-usd">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px]">🇺🇸</span>
                        <span className="text-[11px] font-semibold text-gray-600">USD</span>
                      </div>
                      <button className="text-gray-400 hover:text-gray-600" aria-label="USD wallet options"><MoreVertical className="w-3 h-3" /></button>
                    </div>
                    <p className="text-[14px] font-bold text-gray-900">${showBalance ? formatNumber(walletGoldValue) : '••••'}</p>

                    <Badge className="mt-2 bg-green-100 text-green-700 border-0 text-[9px] px-1.5 py-0 font-medium">Active</Badge>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 relative" data-testid="wallet-aed">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px]">🇦🇪</span>
                        <span className="text-[11px] font-semibold text-gray-600">AED</span>
                      </div>
                      <button className="text-gray-400 hover:text-gray-600" aria-label="AED wallet options"><MoreVertical className="w-3 h-3" /></button>
                    </div>
                    <p className="text-[14px] font-bold text-gray-900">~~ {showBalance ? formatNumber(walletGoldValue * 3.67) : '••••'}</p>
                    <Badge className="mt-2 bg-green-100 text-green-700 border-0 text-[9px] px-1.5 py-0 font-medium">Active</Badge>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 relative" data-testid="wallet-eur">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px]">🇪🇺</span>
                        <span className="text-[11px] font-semibold text-gray-600">EUR</span>
                      </div>
                      <button className="text-gray-400 hover:text-gray-600" aria-label="EUR wallet options"><MoreVertical className="w-3 h-3" /></button>
                    </div>
                    <p className="text-[14px] font-bold text-gray-900">€{showBalance ? formatNumber(walletGoldValue * 0.92) : '••••'}</p>
                    <Badge className="mt-2 bg-green-100 text-green-700 border-0 text-[9px] px-1.5 py-0 font-medium">Active</Badge>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5" data-testid="card-spending-limit">
              <h3 className="text-[14px] font-semibold text-gray-900 mb-3">Monthly Transaction Usage</h3>
              <div className="relative h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="absolute h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(((walletGoldValue > 0 ? walletGoldValue * 0.25 : 1400) / 50000) * 100, 100)}%` }}
                />
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-[12px] text-gray-500">This month's usage</span>
                <span className="text-[12px] font-semibold text-gray-700">${formatNumber(walletGoldValue > 0 ? walletGoldValue * 0.25 : 1400)}</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5" data-testid="card-my-cards">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-gray-500" />
                  <h3 className="text-[14px] font-semibold text-gray-900">My Cards</h3>
                </div>
                <Link href="/finacard" className="flex items-center gap-1 text-[12px] text-orange-600 hover:text-orange-700 font-medium" data-testid="button-add-card">
                  <Plus className="w-3.5 h-3.5" />
                  Add new
                </Link>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
                <div className="relative min-w-[200px] h-[125px] rounded-xl bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800 p-4 flex flex-col justify-between overflow-hidden flex-shrink-0" data-testid="card-finacard-1">
                  <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-orange-500/80" />
                  <div className="absolute top-3 right-6 w-8 h-8 rounded-full bg-red-500/60" />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <div className="w-6 h-4 bg-amber-400/90 rounded-sm" />
                    </div>
                    <Badge className="bg-green-500/20 text-green-300 border-0 text-[8px] px-1.5">Active</Badge>
                  </div>
                  <div>
                    <p className="text-[9px] text-gray-400 mb-0.5">Card Number</p>
                    <div className="flex items-center gap-3 text-white text-[11px] font-mono tracking-wider">
                      <span>****</span><span>****</span><span>{showBalance ? finatradesId.slice(-4) : '****'}</span>
                    </div>
                    <div className="flex gap-4 mt-1.5">
                      <div>
                        <p className="text-[8px] text-gray-500">EXP</p>
                        <p className="text-[10px] text-white font-medium">12/28</p>
                      </div>
                      <div>
                        <p className="text-[8px] text-gray-500">CVV</p>
                        <p className="text-[10px] text-white font-medium">{showBalance ? '***' : '***'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative min-w-[200px] h-[125px] rounded-xl bg-gradient-to-br from-orange-600 via-orange-700 to-red-700 p-4 flex flex-col justify-between overflow-hidden flex-shrink-0" data-testid="card-finacard-2">
                  <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-orange-400/60" />
                  <div className="absolute top-3 right-6 w-8 h-8 rounded-full bg-yellow-400/40" />
                  <div className="flex items-center justify-between">
                    <div className="w-6 h-4 bg-amber-300/90 rounded-sm" />
                    <Badge className="bg-green-500/20 text-green-300 border-0 text-[8px] px-1.5">Active</Badge>
                  </div>
                  <div>
                    <p className="text-[9px] text-orange-200/70 mb-0.5">Card Number</p>
                    <div className="flex items-center gap-3 text-white text-[11px] font-mono tracking-wider">
                      <span>****</span><span>****</span><span>{showBalance ? (user.id?.slice(-4) || '0000') : '****'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-12 xl:col-span-3 space-y-5">

            <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl p-5 text-white shadow-sm" data-testid="card-total-earnings">
              <div className="flex items-center justify-between mb-6">
                <span className="text-[13px] text-white/90 font-medium">Gold Earnings</span>
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
              </div>
              <p className="text-[28px] font-bold tracking-tight" data-testid="text-earnings">
                {showBalance ? `$${formatNumber(totals.bnslTotalProfit || walletGoldValue * 0.05)}` : hiddenValue}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className="w-3 h-3 text-white/80" />
                <span className="text-[11px] text-white/80 font-medium">↑ 7% This month</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5" data-testid="card-total-spending">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[13px] text-gray-500 font-medium">Gold Spent</span>
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <ArrowUpRight className="w-4 h-4 text-gray-500" />
                </div>
              </div>
              <p className="text-[24px] font-bold text-gray-900" data-testid="text-spending">
                {showBalance ? `$${formatNumber(finacardValue || walletGoldValue * 0.03)}` : hiddenValue}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className="w-3 h-3 text-green-500" />
                <span className="text-[11px] text-green-600 font-medium">↑ 5% This month</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4" data-testid="card-vault-value">
                <span className="text-[12px] text-gray-500 font-medium">Vault Value</span>
                <p className="text-[18px] font-bold text-gray-900 mt-2">
                  {showBalance ? `$${formatNumber(vaultGoldValue || walletGoldValue * 0.4)}` : hiddenValue}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3 text-green-500" />
                  <span className="text-[10px] text-green-600 font-medium">↑ 8% This month</span>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4" data-testid="card-bnsl-value">
                <span className="text-[12px] text-gray-500 font-medium">BNSL Value</span>
                <p className="text-[18px] font-bold text-gray-900 mt-2">
                  {showBalance ? `$${formatNumber(bnslValue || walletGoldValue * 0.15)}` : hiddenValue}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3 text-green-500" />
                  <span className="text-[10px] text-green-600 font-medium">↑ 4% This month</span>
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-12 xl:col-span-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 h-full" data-testid="card-portfolio-chart">
              <div className="mb-1">
                <h3 className="text-[16px] font-bold text-gray-900">Portfolio Overview</h3>
                <p className="text-[12px] text-gray-400 mt-0.5">View your portfolio in a certain period of time</p>
              </div>
              <div className="flex items-center justify-between mt-3 mb-4">
                <span className="text-[12px] font-semibold text-gray-700">Inflow & Outflow</span>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                    <span className="text-[10px] text-gray-500">Inflow</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-gray-900" />
                    <span className="text-[10px] text-gray-500">Outflow</span>
                  </div>
                </div>
              </div>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} barGap={2} barSize={14}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '12px', border: '1px solid #f0f0f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: '12px' }}
                      formatter={(value: number) => [`$${formatNumber(value)}`, '']}
                    />
                    <Bar dataKey="income" fill="#f97316" radius={[4, 4, 0, 0]} name="Inflow" />
                    <Bar dataKey="expense" fill="#1f2937" radius={[4, 4, 0, 0]} name="Outflow" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm" data-testid="card-recent-activities">
          <div className="flex items-center justify-between p-5 pb-3">
            <h3 className="text-[16px] font-bold text-gray-900">Recent Activities</h3>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search"
                  value={activitySearch}
                  onChange={(e) => setActivitySearch(e.target.value)}
                  className="pl-9 pr-3 py-2 text-[13px] bg-gray-50 border border-gray-200 rounded-xl w-[180px] focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-300 transition-all"
                  aria-label="Search activities"
                  data-testid="input-activity-search"
                />
              </div>
              <button className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors" data-testid="button-filter">
                Filter
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-t border-gray-100">
                  <th className="text-left py-3 px-5 text-[11px] text-gray-400 font-semibold uppercase tracking-wider">Order ID</th>
                  <th className="text-left py-3 px-5 text-[11px] text-gray-400 font-semibold uppercase tracking-wider">Activity</th>
                  <th className="text-left py-3 px-5 text-[11px] text-gray-400 font-semibold uppercase tracking-wider">Amount</th>
                  <th className="text-left py-3 px-5 text-[11px] text-gray-400 font-semibold uppercase tracking-wider">Status</th>
                  <th className="text-left py-3 px-5 text-[11px] text-gray-400 font-semibold uppercase tracking-wider">Date</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {filteredActivities.length > 0 ? filteredActivities.map((tx, i) => (
                  <tr key={tx.id} className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors" data-testid={`row-activity-${i}`}>
                    <td className="py-3.5 px-5">
                      <span className="text-[13px] font-medium text-gray-700">{tx.id.slice(0, 12).toUpperCase()}</span>
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-2.5">
                        {getActivityIcon(tx.type)}
                        <span className="text-[13px] font-medium text-gray-800">{tx.type}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="text-[13px] font-semibold text-gray-900">
                        ${formatNumber(Math.abs(parseFloat(tx.amountUsd || '0')))}
                      </span>
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${getStatusDot(tx.status)}`} />
                        <span className="text-[12px] text-gray-600 capitalize">{tx.status}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="text-[12px] text-gray-500">
                        {tx.createdAt && isValid(new Date(tx.createdAt)) ? format(new Date(tx.createdAt), 'dd MMM, yyyy hh:mm a') : '-'}
                      </span>
                    </td>
                    <td className="py-3.5 px-2">
                      <button className="text-gray-400 hover:text-gray-600 p-1" aria-label="Activity options"><MoreVertical className="w-4 h-4" /></button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-gray-400 text-[13px]">No recent activities found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {transactions.length > 5 && (
            <div className="p-4 border-t border-gray-100 text-center">
              <Link href="/transactions" className="text-[13px] text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1 mx-auto" data-testid="button-view-all-activities">
                View All Activities
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {showOnboarding && (
        <OnboardingTour onComplete={completeOnboarding} />
      )}
    </DashboardLayout>
  );
}
