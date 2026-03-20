import { useState, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { ArrowUpRight, ArrowDownLeft, Copy, Check, Package, CreditCard, Send, Download, TrendingUp, MoreVertical, Search, SlidersHorizontal, ChevronRight, Plus, Eye, EyeOff, Zap, Sparkles, Shield, Vault, BarChart3, Landmark } from 'lucide-react';
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

const RING_MODULES = [
  { key: 'finapay',    label: 'FinaPay',    color: '#8A2BE2', bg: 'rgba(138,43,226,0.10)' },
  { key: 'finacard',   label: 'FinaCard',   color: '#D4AF37', bg: 'rgba(212,175,55,0.10)' },
  { key: 'bnsl',       label: 'BNSL',       color: '#3b82f6', bg: 'rgba(59,130,246,0.10)' },
  { key: 'finabridge', label: 'FinaBridge', color: '#10b981', bg: 'rgba(16,185,129,0.10)' },
];

interface PortfolioChartsProps {
  walletGoldGrams: number;
  finacardGoldGrams: number;
  bnslGoldGrams: number;
  finaBridgeGoldGrams: number;
  totalGoldGrams: number;
  showBalance: boolean;
  hiddenValue: string;
  formatNumber: (n: number | null | undefined, d?: number) => string;
}

function PortfolioRingChart({ walletGoldGrams, finacardGoldGrams, bnslGoldGrams, finaBridgeGoldGrams, totalGoldGrams, showBalance, hiddenValue, formatNumber }: PortfolioChartsProps) {
  const modules = useMemo(() => [
    { ...RING_MODULES[0], value: walletGoldGrams },
    { ...RING_MODULES[1], value: finacardGoldGrams },
    { ...RING_MODULES[2], value: bnslGoldGrams },
    { ...RING_MODULES[3], value: finaBridgeGoldGrams },
  ], [walletGoldGrams, finacardGoldGrams, bnslGoldGrams, finaBridgeGoldGrams]);

  const total = modules.reduce((s, d) => s + d.value, 0);

  const size = 260;
  const cx = size / 2;
  const cy = size / 2;
  const ringW = 10;
  const gap = 10;
  const innerR = 38;

  const rings = useMemo(() => modules.map((mod, idx) => {
    const r = innerR + idx * (ringW + gap);
    const pct = total > 0 ? mod.value / total : 0;
    const circ = 2 * Math.PI * r;
    const filled = pct * circ;
    return { ...mod, r, pct, circ, filled, idx };
  }), [modules, total]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="glass-card-elevated rounded-[20px] p-5 h-full glow-border-hover"
      data-testid="card-portfolio-chart"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[15px] font-bold text-gray-900">Portfolio Allocation</h3>
          <p className="text-[11px] text-gray-400 mt-0.5">Gold distribution across modules</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-extrabold text-gray-900">{showBalance ? `${formatNumber(totalGoldGrams, 3)}g` : hiddenValue}</span>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-100 to-purple-50 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-purple-600" />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center mb-4">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {[...rings].reverse().map((ring) => (
            <g key={ring.key} transform={`rotate(-90 ${cx} ${cy})`}>
              <circle
                cx={cx} cy={cy} r={ring.r}
                fill="none"
                stroke={ring.bg}
                strokeWidth={ringW}
              />
              {ring.pct > 0 && (
                <circle
                  cx={cx} cy={cy} r={ring.r}
                  fill="none"
                  stroke={ring.color}
                  strokeWidth={ringW}
                  strokeLinecap="round"
                  strokeDasharray={`${ring.filled} ${ring.circ - ring.filled}`}
                  strokeDashoffset={0}
                  className="portfolio-ring"
                  style={{
                    animationName: `ring-reveal-${ring.idx}`,
                    animationDuration: '1s',
                    animationTimingFunction: 'ease-out',
                    animationDelay: `${0.3 + ring.idx * 0.12}s`,
                    animationFillMode: 'backwards',
                  }}
                />
              )}
            </g>
          ))}
          <circle cx={cx} cy={cy} r={innerR - 10} fill="white" />
          <circle cx={cx} cy={cy} r={innerR - 10} fill="none" stroke="rgba(138,43,226,0.06)" strokeWidth={1.5} />
          <text x={cx} y={cy - 5} textAnchor="middle" fill="#9ca3af" style={{ fontSize: 8, fontWeight: 600, letterSpacing: '0.06em' }}>TOTAL</text>
          <text x={cx} y={cy + 9} textAnchor="middle" fill="#111827" style={{ fontSize: 13, fontWeight: 800 }}>
            {showBalance ? `${formatNumber(totalGoldGrams, 3)}g` : '••••'}
          </text>
        </svg>
      </div>

      <style>{`
        ${rings.map(r => `
          @keyframes ring-reveal-${r.idx} {
            from { stroke-dasharray: 0 ${r.circ}; }
            to { stroke-dasharray: ${r.filled} ${r.circ - r.filled}; }
          }
        `).join('')}
      `}</style>

      <div className="space-y-3">
        {modules.map((item, idx) => {
          const pct = total > 0 ? (item.value / total) * 100 : 0;
          return (
            <div key={item.key} className="flex items-center gap-3 group" data-testid={`progress-${item.key}`}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110" style={{ background: item.bg }}>
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12px] font-semibold text-gray-700">{item.label}</span>
                  <span className="text-[12px] font-bold text-gray-900">
                    {showBalance ? `${formatNumber(item.value, 3)}g` : '••••'}
                  </span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: item.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 1.2, ease: 'easeOut', delay: 0.4 + idx * 0.1 }}
                  />
                </div>
              </div>
              <span className="text-[11px] text-gray-400 font-semibold w-10 text-right flex-shrink-0">
                {pct > 0 ? `${pct.toFixed(0)}%` : '0%'}
              </span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } }
};

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
  const totalGoldGrams = (totals.walletGoldGrams || 0) + (totals.finacardGoldGrams || 0) + (totals.bnslWalletGoldGrams || 0) + (finaBridge?.goldGrams || 0);
  const totalPortfolioValue = totals.totalPortfolioUsd || 0;
  const walletGoldValue = (totals.walletGoldGrams || 0) * goldPrice;
  const finacardGoldValue = (totals.finacardGoldGrams || 0) * goldPrice;
  const bnslValue = (totals.bnslWalletGoldGrams || 0) * goldPrice;
  const finacardValue = totals.finacardValueUsd || 0;
  const finaBridgeValue = finaBridge?.usdValue || 0;

  const filteredActivities = useMemo(() => {
    if (!activitySearch) return transactions.slice(0, 5);
    return transactions.filter(t => 
      t.type?.toLowerCase().includes(activitySearch.toLowerCase()) ||
      t.id?.toLowerCase().includes(activitySearch.toLowerCase())
    ).slice(0, 5);
  }, [transactions, activitySearch]);

  const monthlySpend = useMemo(() => {
    const now = new Date();
    const outgoingTypes = ['sell', 'withdraw', 'send', 'transfer', 'payment', 'spend', 'fee'];
    return transactions
      .filter(tx => {
        if (!tx.createdAt) return false;
        const d = new Date(tx.createdAt);
        const isThisMonth = d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        const isOutgoing = outgoingTypes.some(t => (tx.type || '').toLowerCase().includes(t));
        return isThisMonth && isOutgoing;
      })
      .reduce((sum, tx) => sum + Math.abs(parseFloat(tx.amountUsd || '0')), 0);
  }, [transactions]);

  const MONTHLY_LIMIT = 50000;
  const progressPercent = Math.max(Math.min((monthlySpend / MONTHLY_LIMIT) * 100, 100), monthlySpend > 0 ? 2 : 0.5);

  const getTransactionAmount = (tx: { amountUsd: string | null; amountGold: string | null }) => {
    const usdAmt = parseFloat(tx.amountUsd || '0');
    if (usdAmt !== 0) return `$${formatNumber(Math.abs(usdAmt))}`;
    const goldAmt = parseFloat(tx.amountGold || '0');
    if (goldAmt !== 0) return `$${formatNumber(Math.abs(goldAmt) * goldPrice)}`;
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
      return <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center"><ArrowDownLeft className="w-4 h-4 text-emerald-600" /></div>;
    }
    if (t.includes('sell') || t.includes('withdraw')) {
      return <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center"><ArrowUpRight className="w-4 h-4 text-red-500" /></div>;
    }
    if (t.includes('send') || t.includes('transfer')) {
      return <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center"><Send className="w-4 h-4 text-blue-600" /></div>;
    }
    if (t.includes('card')) {
      return <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center"><CreditCard className="w-4 h-4 text-purple-600" /></div>;
    }
    return <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center"><ArrowUpRight className="w-4 h-4 text-gray-500" /></div>;
  };

  const getStatusBadge = (status: string) => {
    const s = status?.toLowerCase() || '';
    if (s === 'completed' || s === 'complete') {
      return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Completed</span>;
    }
    if (s === 'pending') {
      return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-100"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />Pending</span>;
    }
    if (s === 'processing' || s === 'in progress') {
      return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-100"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />Processing</span>;
    }
    if (s === 'failed' || s === 'rejected') {
      return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-100"><span className="w-1.5 h-1.5 rounded-full bg-red-500" />Failed</span>;
    }
    return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-gray-50 text-gray-600 border border-gray-100"><span className="w-1.5 h-1.5 rounded-full bg-gray-400" />{status}</span>;
  };

  return (
    <DashboardLayout>
      <motion.div
        className="max-w-[1400px] mx-auto space-y-6 pb-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >

        {pendingPhysicalDeposits.length > 0 && (
          <motion.div variants={itemVariants}>
            <Alert className="bg-gradient-to-r from-amber-50 via-amber-50/80 to-orange-50 border-amber-200/60 rounded-2xl shadow-sm" data-testid="alert-physical-deposit">
              <Package className="h-4 w-4 text-amber-600" />
              <AlertDescription className="flex items-center justify-between">
                <span className="text-amber-800" data-testid="text-physical-deposit-count">
                  You have <strong>{pendingPhysicalDeposits.length}</strong> physical gold deposit{pendingPhysicalDeposits.length > 1 ? 's' : ''} in progress
                </span>
                <Link href="/finavault">
                  <Button variant="outline" size="sm" className="border-amber-300 text-amber-700 hover:bg-amber-100 rounded-xl font-semibold" data-testid="button-view-physical-status">
                    View Status
                  </Button>
                </Link>
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        <motion.section variants={itemVariants} className="flex items-center justify-between">
          <div>
            <h1 className="text-[28px] font-bold tracking-tight" data-testid="text-welcome">
              <span className="text-gray-900">{getGreeting()}, </span>
              <span className="gradient-text-purple font-extrabold">{userName}</span>
            </h1>
            <p className="text-gray-500 text-[14px] mt-1">Your gold portfolio at a glance</p>
          </div>
          <motion.div
            whileHover={{ scale: 1.03 }}
            className="flex items-center gap-2.5 bg-white/80 backdrop-blur-sm px-4 py-2.5 rounded-2xl border border-gray-200/60 shadow-sm cursor-default"
          >
            <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">ID</span>
            <span className="text-sm font-bold text-gray-800 font-mono tracking-wide">{finatradesId}</span>
            <button onClick={copyFinatradesId} className="p-1.5 hover:bg-purple-50 rounded-lg transition-all" title="Copy ID" aria-label="Copy Finatrades ID" data-testid="button-copy-id">
              {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
            </button>
          </motion.div>
        </motion.section>

        <div className="grid grid-cols-12 gap-5">

          {/* ═══ LEFT COLUMN — Balance Hero + Wallets + Usage ═══ */}
          <div className="col-span-12 xl:col-span-5 space-y-5">

            {/* Hero Balance Card */}
            <motion.div
              variants={itemVariants}
              className="relative rounded-[24px] overflow-hidden"
              data-testid="card-total-balance"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#1a0533] via-[#2d1054] to-[#0f0a2e]" />
              <div className="absolute inset-0 mesh-gradient opacity-30" />
              <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #8A2BE2, transparent)', transform: 'translate(30%, -30%)' }} />
              <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #D4AF37, transparent)', transform: 'translate(-20%, 20%)' }} />
              <div className="holo-shimmer absolute inset-0" />

              <div className="relative z-10 p-7">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/10">
                      <Sparkles className="w-4 h-4 text-amber-300" />
                    </div>
                    <span className="text-[13px] text-white/70 font-medium">Total Portfolio</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setBalanceVisible(!balanceVisible)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors" aria-label={balanceVisible ? 'Hide balance' : 'Show balance'} data-testid="button-toggle-balance">
                      {balanceVisible ? <Eye className="w-4 h-4 text-white/50" /> : <EyeOff className="w-4 h-4 text-white/50" />}
                    </button>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/10 rounded-full border border-white/10 text-[10px] font-bold text-amber-300 tracking-wider">
                      <span>🥇</span> GOLD
                    </div>
                  </div>
                </div>
                <motion.p
                  className="text-[36px] font-extrabold text-white tracking-tight leading-none mt-3"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  data-testid="text-total-balance"
                >
                  {showBalance ? `$${formatNumber(totalPortfolioValue)}` : hiddenValue}
                </motion.p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/20 rounded-full border border-emerald-400/20">
                    <TrendingUp className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-300 text-[11px] font-bold">{formatNumber(totalGoldGrams, 2)}g</span>
                  </div>
                  <span className="text-white/40 text-[11px]">total gold held</span>
                </div>

                <div className="flex gap-3 mt-6">
                  <Link href="/finapay" className="flex-1 flex items-center justify-center gap-2 text-white py-3 px-4 rounded-2xl text-sm font-bold transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] bg-gradient-to-r from-purple-600 to-purple-500 border border-white/10" data-testid="button-transfer">
                    <Send className="w-4 h-4" />
                    Transfer
                  </Link>
                  <Link href="/finapay" className="flex-1 flex items-center justify-center gap-2 text-white/90 py-3 px-4 rounded-2xl text-sm font-bold border border-white/15 bg-white/10 backdrop-blur-sm transition-all hover:bg-white/15 hover:shadow-lg active:scale-[0.98]" data-testid="button-request">
                    <Download className="w-4 h-4" />
                    Request
                  </Link>
                </div>
              </div>
            </motion.div>

            {/* Wallet Cards */}
            <motion.div variants={itemVariants} className="glass-card-elevated rounded-[20px] p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[13px] text-gray-500 font-semibold">Multi-Currency Wallets</span>
                <span className="text-[11px] text-gray-400 font-medium">3 active</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <motion.div whileHover={{ y: -3 }} className="rounded-2xl p-3.5 relative border border-blue-100/60 hover:shadow-lg transition-all cursor-default overflow-hidden" style={{ background: 'linear-gradient(135deg, #eff6ff, #dbeafe)' }} data-testid="wallet-usd">
                  <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-blue-400/10 blur-xl" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-[11px]">🇺🇸</span>
                      <span className="text-[11px] font-bold text-blue-700">USD</span>
                    </div>
                    <p className="text-[15px] font-extrabold text-blue-900">${showBalance ? formatNumber(walletGoldValue) : '••••'}</p>
                    <Badge className="mt-2 bg-blue-200/50 text-blue-700 border-0 text-[9px] px-1.5 py-0 font-bold">Active</Badge>
                  </div>
                </motion.div>
                <motion.div whileHover={{ y: -3 }} className="rounded-2xl p-3.5 relative border border-amber-100/60 hover:shadow-lg transition-all cursor-default overflow-hidden" style={{ background: 'linear-gradient(135deg, #fffbeb, #fef3c7)' }} data-testid="wallet-aed">
                  <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-amber-400/10 blur-xl" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-[11px]">🇦🇪</span>
                      <span className="text-[11px] font-bold text-amber-700">AED</span>
                    </div>
                    <p className="text-[15px] font-extrabold text-amber-900 flex items-center gap-[3px]">
                      <DirhamSymbol size="0.95em" />
                      {showBalance ? formatNumber(walletGoldValue * 3.67) : '••••'}
                    </p>
                    <Badge className="mt-2 bg-amber-200/50 text-amber-700 border-0 text-[9px] px-1.5 py-0 font-bold">Active</Badge>
                  </div>
                </motion.div>
                <motion.div whileHover={{ y: -3 }} className="rounded-2xl p-3.5 relative border border-indigo-100/60 hover:shadow-lg transition-all cursor-default overflow-hidden" style={{ background: 'linear-gradient(135deg, #eef2ff, #e0e7ff)' }} data-testid="wallet-eur">
                  <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-indigo-400/10 blur-xl" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-[11px]">🇪🇺</span>
                      <span className="text-[11px] font-bold text-indigo-700">EUR</span>
                    </div>
                    <p className="text-[15px] font-extrabold text-indigo-900">€{showBalance ? formatNumber(walletGoldValue * 0.92) : '••••'}</p>
                    <Badge className="mt-2 bg-indigo-200/50 text-indigo-700 border-0 text-[9px] px-1.5 py-0 font-bold">Active</Badge>
                  </div>
                </motion.div>
              </div>
            </motion.div>

            {/* Monthly Usage Bar */}
            <motion.div variants={itemVariants} className="glass-card-elevated rounded-[20px] p-5 glow-border-hover" data-testid="card-spending-limit">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[14px] font-bold text-gray-900">Monthly Usage</h3>
                <span className="text-[11px] font-bold text-gray-400">{progressPercent.toFixed(0)}%</span>
              </div>
              <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  className="absolute h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg, #8A2BE2, #a855f7, #c084fc)' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                />
                <div className="absolute inset-0 rounded-full" style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)', backgroundSize: '200% 100%' }} />
              </div>
              <div className="flex justify-between mt-2.5">
                <span className="text-[12px] text-gray-500">This month</span>
                <span className="text-[12px] font-bold text-gray-700">${formatNumber(monthlySpend)} <span className="text-gray-400 font-medium">/ $50k</span></span>
              </div>
            </motion.div>
          </div>

          {/* ═══ MIDDLE COLUMN — Earnings + FinaCard Balance + Vault/BNSL ═══ */}
          <div className="col-span-12 xl:col-span-3 space-y-5">

            {/* Gold Earnings — Premium gradient card */}
            <motion.div
              variants={itemVariants}
              className="relative rounded-[20px] p-5 text-white overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #8A2BE2, #a855f7)' }}
              data-testid="card-total-earnings"
            >
              <div className="absolute inset-0 holo-shimmer" />
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, white, transparent)', transform: 'translate(30%, -30%)' }} />
              <div className="absolute bottom-0 left-0 w-20 h-20 rounded-full opacity-10 bg-amber-400 blur-xl" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-5">
                  <span className="text-[12px] text-white/80 font-semibold tracking-wide">Gold Earnings</span>
                  <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/10">
                    <TrendingUp className="w-4 h-4 text-white" />
                  </div>
                </div>
                <p className="text-[28px] font-extrabold tracking-tight leading-none" data-testid="text-earnings">
                  {showBalance ? `$${formatNumber(totals.bnslTotalProfit || 0)}` : hiddenValue}
                </p>
                <p className="text-[11px] text-white/60 font-medium mt-2">Paid BNSL margin earnings</p>
              </div>
            </motion.div>

            {/* FinaCard Balance */}
            <motion.div
              variants={itemVariants}
              className="glass-card-elevated rounded-[20px] p-5 glow-border-hover"
              data-testid="card-total-spending"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-[13px] text-gray-500 font-semibold">FinaCard Balance</span>
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-100 to-purple-50 flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-purple-600" />
                </div>
              </div>
              <p className="text-[26px] font-extrabold text-gray-900" data-testid="text-spending">
                {showBalance ? `$${formatNumber(finacardValue)}` : hiddenValue}
              </p>
              <p className="text-[11px] text-gray-400 font-medium mt-1">Gold loaded on card</p>
            </motion.div>

            {/* Vault + BNSL Grid */}
            <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4">
              <div className="glass-card-elevated rounded-[20px] p-4 glow-border-hover group" data-testid="card-vault-value">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-100 to-amber-50 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Landmark className="w-4 h-4 text-amber-600" />
                </div>
                <span className="text-[11px] text-gray-500 font-semibold">FinaVault</span>
                <p className="text-[18px] font-extrabold text-gray-900 mt-1">
                  {showBalance ? `$${formatNumber(walletGoldValue)}` : hiddenValue}
                </p>
                <p className="text-[10px] text-gray-400 mt-1 font-medium">{formatNumber(totals.walletGoldGrams || 0, 3)}g secured</p>
              </div>
              <div className="glass-card-elevated rounded-[20px] p-4 glow-border-hover group" data-testid="card-bnsl-value">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-[11px] text-gray-500 font-semibold">BNSL Value</span>
                <p className="text-[18px] font-extrabold text-gray-900 mt-1">
                  {showBalance ? `$${formatNumber(bnslValue)}` : hiddenValue}
                </p>
                <p className="text-[10px] text-gray-400 mt-1 font-medium">{formatNumber(totals.bnslWalletGoldGrams || 0, 3)}g in BNSL</p>
              </div>
            </motion.div>
          </div>

          {/* ═══ RIGHT COLUMN — FinaCard + Donut ═══ */}
          <div className="col-span-12 xl:col-span-4 flex flex-col gap-5">
            {/* FinaCard — Premium dark card with holographic effect */}
            <Link href="/finacard">
              <motion.div
                variants={itemVariants}
                whileHover={{ scale: 1.015, y: -4 }}
                transition={{ duration: 0.35 }}
                className="relative w-full aspect-[1.85/1] rounded-[22px] shadow-2xl overflow-hidden border border-white/[0.06] cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #0f0a1e 0%, #1a0e35 30%, #0d0820 70%, #1a0e35 100%)' }}
                data-testid="card-dashboard-finacard"
              >
                <div className="absolute inset-0 holo-shimmer" />
                <div className="absolute inset-0 bg-gradient-to-tr from-purple-900/20 via-transparent to-amber-900/10" />
                <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-purple-600/10 blur-3xl" />
                <div className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full bg-amber-400/8 blur-2xl" />

                <div className="relative z-10 p-5 h-full flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                        <Sparkles className="w-3.5 h-3.5 text-white" />
                      </div>
                      <span className="text-white text-sm font-extrabold tracking-tight">Finatrades</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-white/8 rounded-full px-3 py-1 border border-white/8">
                      <CreditCard className="w-3 h-3 text-white/60" />
                      <span className="text-white/60 text-[10px] font-bold">GOLD CARD</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-7 bg-gradient-to-r from-yellow-200 to-yellow-500 rounded-[4px] opacity-80 flex items-center justify-center">
                        <div className="w-5 h-4 border border-yellow-700/30 rounded-[2px]" />
                      </div>
                      <Zap className="w-4 h-4 text-white/20 rotate-90" />
                    </div>
                    <p className="font-mono text-base text-white/80 tracking-[0.25em]">•••• •••• •••• ••••</p>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-[8px] uppercase font-bold text-white/30 tracking-widest mb-0.5">Card Holder</p>
                        <p className="text-white/90 text-xs font-bold uppercase tracking-wide">
                          {user?.firstName || ''} {user?.lastName || ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[8px] uppercase font-bold text-white/30 tracking-widest mb-0.5">Balance</p>
                        <p className="text-white/90 text-sm font-extrabold">
                          {showBalance ? `${formatNumber(totals.finacardGoldGrams || 0, 3)}g` : '•••••'}
                        </p>
                        <p className="text-white/30 text-[9px] font-medium">
                          {showBalance ? `≈ $${formatNumber(finacardValue)}` : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </Link>

            <PortfolioRingChart
              walletGoldGrams={totals.walletGoldGrams || 0}
              finacardGoldGrams={totals.finacardGoldGrams || 0}
              bnslGoldGrams={totals.bnslWalletGoldGrams || 0}
              finaBridgeGoldGrams={finaBridge?.goldGrams || 0}
              totalGoldGrams={totalGoldGrams}
              showBalance={showBalance}
              hiddenValue={hiddenValue}
              formatNumber={formatNumber}
            />
          </div>
        </div>

        {/* ═══ ACTIVITIES TABLE ═══ */}
        <motion.div
          variants={itemVariants}
          className="glass-card-elevated rounded-[20px] overflow-hidden"
          data-testid="card-recent-activities"
        >
          <div className="flex items-center justify-between p-6 pb-4">
            <div>
              <h3 className="text-[16px] font-bold text-gray-900">Recent Activities</h3>
              <p className="text-[11px] text-gray-400 mt-0.5">Your latest transactions</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={activitySearch}
                  onChange={(e) => setActivitySearch(e.target.value)}
                  className="pl-9 pr-3 py-2 text-[13px] bg-gray-50/80 border border-gray-200/60 rounded-xl w-[180px] focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-300 transition-all backdrop-blur-sm"
                  aria-label="Search activities"
                  data-testid="input-activity-search"
                />
              </div>
              <button className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-semibold text-gray-600 bg-gray-50/80 border border-gray-200/60 rounded-xl hover:bg-gray-100 transition-all" data-testid="button-filter">
                Filter
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-t border-gray-100/60">
                  <th className="text-left py-3 px-6 text-[10px] text-gray-400 font-bold uppercase tracking-wider">Order ID</th>
                  <th className="text-left py-3 px-6 text-[10px] text-gray-400 font-bold uppercase tracking-wider">Activity</th>
                  <th className="text-left py-3 px-6 text-[10px] text-gray-400 font-bold uppercase tracking-wider">Amount</th>
                  <th className="text-left py-3 px-6 text-[10px] text-gray-400 font-bold uppercase tracking-wider">Status</th>
                  <th className="text-left py-3 px-6 text-[10px] text-gray-400 font-bold uppercase tracking-wider">Date</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {filteredActivities.length > 0 ? filteredActivities.map((tx, i) => (
                  <motion.tr
                    key={tx.id}
                    className="border-t border-gray-50/60 hover:bg-purple-50/30 transition-all duration-200 group cursor-default"
                    data-testid={`row-activity-${i}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.06 }}
                  >
                    <td className="py-4 px-6 relative">
                      <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-purple-500 opacity-0 group-hover:opacity-100 transition-all duration-300" />
                      <span className="text-[13px] font-semibold text-gray-700 font-mono">{tx.id.slice(0, 12).toUpperCase()}</span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        {getActivityIcon(tx.type)}
                        <span className="text-[13px] font-semibold text-gray-800">{tx.type}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-[13px] font-bold text-gray-900">{getTransactionAmount(tx)}</span>
                    </td>
                    <td className="py-4 px-6">
                      {getStatusBadge(tx.status)}
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-[12px] text-gray-500 font-medium">
                        {tx.createdAt && isValid(new Date(tx.createdAt)) ? format(new Date(tx.createdAt), 'dd MMM, yyyy hh:mm a') : '-'}
                      </span>
                    </td>
                    <td className="py-4 px-2">
                      <button className="text-gray-300 hover:text-gray-500 p-1 rounded-lg hover:bg-gray-100 transition-all" aria-label="Activity options"><MoreVertical className="w-4 h-4" /></button>
                    </td>
                  </motion.tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400 text-[13px]">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
                          <Search className="w-5 h-5 text-gray-300" />
                        </div>
                        <span>No recent activities found</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {transactions.length > 5 && (
            <div className="p-5 border-t border-gray-100/60 text-center">
              <Link href="/transactions" className="inline-flex items-center gap-1.5 text-[13px] text-purple-600 hover:text-purple-700 font-bold transition-colors" data-testid="button-view-all-activities">
                View All Activities
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </motion.div>
      </motion.div>

      {showOnboarding && (
        <OnboardingTour onComplete={completeOnboarding} />
      )}
    </DashboardLayout>
  );
}
