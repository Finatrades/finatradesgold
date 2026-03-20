import { useState, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { ArrowUpRight, ArrowDownLeft, Copy, Check, Package, CreditCard, Send, Download, TrendingUp, MoreVertical, Search, SlidersHorizontal, ChevronRight, Plus, Eye, EyeOff, Zap } from 'lucide-react';
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
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';
import { format, isValid } from 'date-fns';
import { DirhamSymbol } from '@/components/ui/DirhamSymbol';
import { motion } from 'framer-motion';

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

const DONUT_MODULES = [
  { key: 'finapay',    label: 'FinaPay',    color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
  { key: 'finavault',  label: 'FinaVault',  color: '#7c3aed', bg: 'rgba(124,58,237,0.12)' },
  { key: 'bnsl',       label: 'BNSL',       color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  { key: 'finabridge', label: 'FinaBridge', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
];

interface DonutCardProps {
  walletGoldValue: number;
  vaultGoldValue: number;
  bnslValue: number;
  finaBridgeValue: number;
  totalPortfolioValue: number;
  showBalance: boolean;
  hiddenValue: string;
  formatNumber: (n: number | null | undefined, d?: number) => string;
}

function PortfolioDonutCard({ walletGoldValue, vaultGoldValue, bnslValue, finaBridgeValue, totalPortfolioValue, showBalance, hiddenValue, formatNumber }: DonutCardProps) {
  const rawData = [
    { ...DONUT_MODULES[0], value: walletGoldValue },
    { ...DONUT_MODULES[1], value: vaultGoldValue },
    { ...DONUT_MODULES[2], value: bnslValue },
    { ...DONUT_MODULES[3], value: finaBridgeValue },
  ];

  const total = rawData.reduce((s, d) => s + d.value, 0);
  const hasData = total > 0;
  const donutData = hasData
    ? rawData.filter(d => d.value > 0)
    : [{ ...DONUT_MODULES[0], value: 1, color: '#e5e7eb', bg: '' }];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 h-full" data-testid="card-portfolio-chart">
      <div className="mb-4">
        <h3 className="text-[16px] font-bold text-gray-900">Portfolio Overview</h3>
        <p className="text-[12px] text-gray-400 mt-0.5">Gold allocation across all modules</p>
      </div>

      <div className="relative flex items-center justify-center" style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={donutData}
              cx="50%"
              cy="50%"
              innerRadius={68}
              outerRadius={100}
              paddingAngle={hasData ? 3 : 0}
              dataKey="value"
              strokeWidth={0}
              animationBegin={0}
              animationDuration={900}
            >
              {donutData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <RechartsTooltip
              contentStyle={{ borderRadius: '12px', border: '1px solid #f0f0f0', boxShadow: '0 4px 16px rgba(0,0,0,0.10)', fontSize: '12px', padding: '8px 12px' }}
              formatter={(value: number, name: string) => [
                showBalance ? `$${formatNumber(value)}` : '••••••',
                name
              ]}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[11px] text-gray-400 font-medium">Total</span>
          <span className="text-[22px] font-bold text-gray-900 leading-tight">
            {showBalance ? `$${formatNumber(totalPortfolioValue)}` : hiddenValue}
          </span>
          {hasData && (
            <span className="text-[10px] text-gray-400 mt-0.5">
              {rawData.filter(d => d.value > 0).length} modules
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-2.5">
        {rawData.map((item) => {
          const pct = total > 0 ? (item.value / total) * 100 : 0;
          return (
            <div key={item.key} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: item.bg }}>
                <div className="w-3 h-3 rounded-full" style={{ background: item.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12px] font-semibold text-gray-700">{item.label}</span>
                  <span className="text-[12px] font-bold text-gray-900">
                    {showBalance ? `$${formatNumber(item.value)}` : '••••'}
                  </span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: item.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                  />
                </div>
              </div>
              <span className="text-[11px] text-gray-400 font-medium w-10 text-right flex-shrink-0">
                {pct > 0 ? `${pct.toFixed(0)}%` : '0%'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { totals, goldPrice, finaBridge, isLoading } = useDashboardData();
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
  const walletGoldValue = ((totals.walletGoldGrams || 0) + (totals.finacardGoldGrams || 0)) * goldPrice;
  const vaultGoldValue = (totals.vaultGoldGrams || 0) * goldPrice;
  const bnslValue = (totals.bnslWalletGoldGrams || 0) * goldPrice;
  const finacardValue = totals.finacardValueUsd || 0;
  const finaBridgeValue = finaBridge?.usdValue || 0;

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

  const monthlySpend = useMemo(() => {
    const now = new Date();
    return transactions
      .filter(tx => {
        if (!tx.createdAt) return false;
        const d = new Date(tx.createdAt);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((sum, tx) => sum + Math.abs(parseFloat(tx.amountUsd || '0')), 0);
  }, [transactions]);

  const MONTHLY_LIMIT = 50000;
  const progressPercent = Math.max(Math.min((monthlySpend / MONTHLY_LIMIT) * 100, 100), monthlySpend > 0 ? 2 : 0.5);

  const getTransactionAmount = (tx: { amountUsd: string | null; amountGold: string | null }) => {
    const usdAmt = parseFloat(tx.amountUsd || '0');
    if (usdAmt > 0) return `$${formatNumber(usdAmt)}`;
    const goldAmt = parseFloat(tx.amountGold || '0');
    if (goldAmt > 0) return `$${formatNumber(goldAmt * goldPrice)}`;
    return '$0.00';
  };

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
            <h1 className="text-[28px] font-bold tracking-tight" data-testid="text-welcome">
              <span className="text-gray-900">{getGreeting()}, </span>
              <span style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{userName}</span>
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
                <Link href="/finapay" className="flex-1 flex items-center justify-center gap-2 text-white py-2.5 px-4 rounded-xl text-sm font-medium transition-all hover:shadow-lg hover:scale-[1.02]" style={{ background: 'linear-gradient(135deg, #d97706, #f59e0b, #fbbf24)' }} data-testid="button-transfer">
                  <Send className="w-4 h-4" />
                  Transfer
                </Link>
                <Link href="/finapay" className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-900 py-2.5 px-4 rounded-xl text-sm font-medium border border-gray-200 transition-all hover:shadow-sm" data-testid="button-request">
                  <Download className="w-4 h-4" />
                  Request
                </Link>
              </div>

              <div className="mt-5 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[13px] text-gray-500 font-medium">Wallets <span className="text-gray-300">|</span> <span className="text-gray-400">Total 3 wallets</span></span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl p-3 relative border border-blue-100 hover:shadow-md transition-all cursor-default" style={{ background: 'linear-gradient(135deg, #eff6ff, #dbeafe)' }} data-testid="wallet-usd">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px]">🇺🇸</span>
                        <span className="text-[11px] font-semibold text-blue-700">USD</span>
                      </div>
                      <button className="text-blue-300 hover:text-blue-500" aria-label="USD wallet options"><MoreVertical className="w-3 h-3" /></button>
                    </div>
                    <p className="text-[14px] font-bold text-blue-900">${showBalance ? formatNumber(walletGoldValue) : '••••'}</p>
                    <Badge className="mt-2 bg-blue-100 text-blue-700 border-0 text-[9px] px-1.5 py-0 font-medium">Active</Badge>
                  </div>
                  <div className="rounded-xl p-3 relative border border-amber-100 hover:shadow-md transition-all cursor-default" style={{ background: 'linear-gradient(135deg, #fffbeb, #fef3c7)' }} data-testid="wallet-aed">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px]">🇦🇪</span>
                        <span className="text-[11px] font-semibold text-amber-700">AED</span>
                      </div>
                      <button className="text-amber-300 hover:text-amber-500" aria-label="AED wallet options"><MoreVertical className="w-3 h-3" /></button>
                    </div>
                    <p className="text-[14px] font-bold text-amber-900 flex items-center gap-[3px]">
                      <DirhamSymbol size="0.95em" />
                      {showBalance ? formatNumber(walletGoldValue * 3.67) : '••••'}
                    </p>
                    <Badge className="mt-2 bg-amber-100 text-amber-700 border-0 text-[9px] px-1.5 py-0 font-medium">Active</Badge>
                  </div>
                  <div className="rounded-xl p-3 relative border border-indigo-100 hover:shadow-md transition-all cursor-default" style={{ background: 'linear-gradient(135deg, #eef2ff, #e0e7ff)' }} data-testid="wallet-eur">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px]">🇪🇺</span>
                        <span className="text-[11px] font-semibold text-indigo-700">EUR</span>
                      </div>
                      <button className="text-indigo-300 hover:text-indigo-500" aria-label="EUR wallet options"><MoreVertical className="w-3 h-3" /></button>
                    </div>
                    <p className="text-[14px] font-bold text-indigo-900">€{showBalance ? formatNumber(walletGoldValue * 0.92) : '••••'}</p>
                    <Badge className="mt-2 bg-indigo-100 text-indigo-700 border-0 text-[9px] px-1.5 py-0 font-medium">Active</Badge>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5" data-testid="card-spending-limit">
              <h3 className="text-[14px] font-semibold text-gray-900 mb-3">Monthly Transaction Usage</h3>
              <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  className="absolute h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg, #f97316, #fb923c, #fbbf24)' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                />
                <div className="absolute inset-0 rounded-full" style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)', backgroundSize: '200% 100%' }} />
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-[12px] text-gray-500">This month's usage</span>
                <span className="text-[12px] font-semibold text-gray-700">${formatNumber(monthlySpend)} <span className="text-gray-400 font-normal">/ $50k</span></span>
              </div>
            </div>
          </div>

          <div className="col-span-12 xl:col-span-3 space-y-5">

            <motion.div 
              className="rounded-2xl p-5 text-white relative overflow-hidden" 
              style={{ background: 'linear-gradient(135deg, #ea580c, #f97316, #ef4444)' }}
              animate={{ boxShadow: ['0 0 0 0 rgba(249,115,22,0)', '0 0 20px 4px rgba(249,115,22,0.35)', '0 0 0 0 rgba(249,115,22,0)'] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              data-testid="card-total-earnings"
            >
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, white, transparent)', transform: 'translate(30%, -30%)' }} />
              <div className="flex items-center justify-between mb-6">
                <span className="text-[13px] text-white/90 font-medium">Gold Earnings</span>
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
              </div>
              <p className="text-[28px] font-bold tracking-tight" data-testid="text-earnings">
                {showBalance ? `$${formatNumber(totals.bnslTotalProfit || 0)}` : hiddenValue}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-[11px] text-white/70 font-medium">Paid BNSL margin earnings</span>
              </div>
            </motion.div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5" data-testid="card-total-spending">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[13px] text-gray-500 font-medium">FinaCard Balance</span>
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-gray-500" />
                </div>
              </div>
              <p className="text-[24px] font-bold text-gray-900" data-testid="text-spending">
                {showBalance ? `$${formatNumber(finacardValue)}` : hiddenValue}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-[11px] text-gray-400 font-medium">Gold loaded on card</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4" data-testid="card-vault-value">
                <span className="text-[12px] text-gray-500 font-medium">Vault Value</span>
                <p className="text-[18px] font-bold text-gray-900 mt-2">
                  {showBalance ? `$${formatNumber(vaultGoldValue)}` : hiddenValue}
                </p>
                <p className="text-[10px] text-gray-400 mt-1">{formatNumber(totals.vaultGoldGrams || 0, 3)}g stored</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4" data-testid="card-bnsl-value">
                <span className="text-[12px] text-gray-500 font-medium">BNSL Value</span>
                <p className="text-[18px] font-bold text-gray-900 mt-2">
                  {showBalance ? `$${formatNumber(bnslValue)}` : hiddenValue}
                </p>
                <p className="text-[10px] text-gray-400 mt-1">{formatNumber(totals.bnslLockedGrams || 0, 3)}g locked</p>
              </div>
            </div>
          </div>

          <div className="col-span-12 xl:col-span-4 flex flex-col gap-4">
            {/* My FinaCard */}
            <Link href="/finacard">
              <motion.div
                whileHover={{ scale: 1.01 }}
                transition={{ duration: 0.3 }}
                className="relative w-full aspect-[1.9/1] rounded-2xl bg-gradient-to-br from-zinc-900 via-black to-zinc-800 shadow-xl p-5 flex flex-col justify-between overflow-hidden border border-white/10 cursor-pointer"
                data-testid="card-dashboard-finacard"
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-purple-900/20 via-transparent to-amber-900/10 pointer-events-none" />
                <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-purple-600/10 blur-2xl pointer-events-none" />
                <div className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full bg-amber-400/10 blur-2xl pointer-events-none" />

                <div className="relative z-10 flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded bg-gradient-to-br from-purple-500 to-pink-600" />
                    <span className="text-white text-sm font-bold tracking-tight">Finatrades</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-2.5 py-1">
                    <CreditCard className="w-3 h-3 text-white/70" />
                    <span className="text-white/70 text-[10px] font-medium">My Card</span>
                  </div>
                </div>

                <div className="relative z-10 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-6 bg-gradient-to-r from-yellow-200 to-yellow-500 rounded-sm opacity-80" />
                    <Zap className="w-4 h-4 text-white/30 rotate-90" />
                  </div>
                  <p className="font-mono text-base text-white tracking-widest">•••• •••• •••• ••••</p>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[9px] uppercase font-bold text-white/40 mb-0.5">Card Holder</p>
                      <p className="text-white/90 text-xs font-semibold uppercase tracking-wide">
                        {user?.firstName || ''} {user?.lastName || ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] uppercase font-bold text-white/40 mb-0.5">Balance</p>
                      <p className="text-white/90 text-xs font-semibold">
                        {showBalance ? `${formatNumber(totals.finacardGoldGrams || 0, 3)}g` : '•••••'}
                      </p>
                      <p className="text-white/40 text-[9px]">
                        {showBalance ? `≈ $${formatNumber(finacardValue)}` : ''}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </Link>

            <PortfolioDonutCard
              walletGoldValue={walletGoldValue}
              vaultGoldValue={vaultGoldValue}
              bnslValue={bnslValue}
              finaBridgeValue={finaBridgeValue}
              totalPortfolioValue={totalPortfolioValue}
              showBalance={showBalance}
              hiddenValue={hiddenValue}
              formatNumber={formatNumber}
            />
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
                  <motion.tr 
                    key={tx.id} 
                    className="border-t border-gray-50 hover:bg-orange-50/30 transition-colors group cursor-default" 
                    data-testid={`row-activity-${i}`}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25, delay: i * 0.06 }}
                  >
                    <td className="py-3.5 px-5 relative">
                      <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-r-full bg-orange-400 opacity-0 group-hover:opacity-100 transition-opacity" />
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
                        {getTransactionAmount(tx)}
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
                  </motion.tr>
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
