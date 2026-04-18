import { useState, useMemo, useRef, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import finatradesLogo from '@/assets/finatrades-logo-purple.png';
import { ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Copy, Check, Package, CreditCard, Send, Download, TrendingUp, TrendingDown, Search, ChevronRight, Plus, Eye, EyeOff, Zap, Sparkles, Shield, Vault, Landmark, Lock, Gift, Users } from 'lucide-react';
import { NumberTicker } from '@/components/ui/number-ticker';
import { GlareCard } from '@/components/ui/glare-card';
import { AnimatedList } from '@/components/ui/animated-list';
import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useUnifiedTransactions } from '@/hooks/useUnifiedTransactions';
import { useFpgwLocks } from '@/hooks/useDualWallet';
import { normalizeStatus, getTransactionLabel } from '@/lib/transactionUtils';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { Badge } from '@/components/ui/badge';
import { CertificateDetailModal } from '@/components/finavault/CertificatesView';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import OnboardingTour, { useOnboarding } from '@/components/OnboardingTour';
import { useIsMobile } from '@/hooks/useIsMobile';
import MobileDashboard from '@/components/mobile/MobileDashboard';
import { format, isValid } from 'date-fns';
import { DirhamSymbol } from '@/components/ui/DirhamSymbol';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import DepositModal from '@/components/finapay/modals/DepositModal';
import BuyGoldBarModal from '@/components/finapay/modals/BuyGoldBarModal';
import SellGoldModal from '@/components/finapay/modals/SellGoldModal';
import WithdrawGoldModal from '@/components/finapay/modals/WithdrawGoldModal';
import SendGoldModal from '@/components/finapay/modals/SendGoldModal';
import RequestGoldModal from '@/components/finapay/modals/RequestGoldModal';
import LockGoldPriceModal from '@/components/finapay/modals/LockGoldPriceModal';
import TransactionDetailsModal from '@/components/finapay/modals/TransactionDetailsModal';
import QuickBnslModal from '@/components/dashboard/QuickBnslModal';
import QuickTradeModal from '@/components/dashboard/QuickTradeModal';
import InternalTransferModal from '@/components/dashboard/InternalTransferModal';
import PhysicalGoldDeposit from '@/pages/PhysicalGoldDeposit';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import PendingItemsStrip from '@/components/dashboard/PendingItemsStrip';
import type { Transaction } from '@/types/finapay';

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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.08 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 22, scale: 0.97 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: 'spring', stiffness: 320, damping: 26, mass: 0.8 }
  }
};

const cardHoverVariants = {
  rest: { y: 0, scale: 1, transition: { type: 'spring', stiffness: 400, damping: 30 } },
  hover: { y: -5, scale: 1.012, transition: { type: 'spring', stiffness: 400, damping: 22 } },
};

/* ── Mouse-tracking 3D tilt hook ── */
function useTilt(intensity = 10) {
  const ref = useRef<HTMLDivElement>(null);
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const springConfig = { stiffness: 280, damping: 28, mass: 0.6 };
  const rotateX = useSpring(useTransform(rawY, [-0.5, 0.5], [intensity, -intensity]), springConfig);
  const rotateY = useSpring(useTransform(rawX, [-0.5, 0.5], [-intensity, intensity]), springConfig);
  const scale   = useSpring(1, { stiffness: 320, damping: 26 });
  const glare   = useTransform(rawX, [-0.5, 0.5], [0, 0.18]);

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    rawX.set((e.clientX - rect.left) / rect.width - 0.5);
    rawY.set((e.clientY - rect.top)  / rect.height - 0.5);
    scale.set(1.03);
  }, [rawX, rawY, scale]);

  const onMouseLeave = useCallback(() => {
    rawX.set(0); rawY.set(0); scale.set(1);
  }, [rawX, rawY, scale]);

  return { ref, motionStyle: { rotateX, rotateY, scale, transformStyle: 'preserve-3d' as const }, glare, onMouseMove, onMouseLeave };
}

export default function Dashboard() {
  const { user } = useAuth();
  const dashData = useDashboardData();
  const { totals, goldPrice, finaBridge, isLoading } = dashData;
  const bnslPlans = dashData.bnslPlans || [];
  const notifications = dashData.notifications || [];
  const { transactions: unifiedTx } = useUnifiedTransactions({ limit: 10 });
  // Direct certificate fetch from the certificates model
  const { data: certsData } = useQuery<{ certificates: any[] }>({
    queryKey: ['certificates-dashboard', user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/certificates/${user?.id}`, { credentials: 'include' });
      if (!res.ok) return { certificates: [] };
      return res.json();
    },
    enabled: !!user?.id,
    staleTime: 30000,
  });
  const { data: fpgwLocksData } = useFpgwLocks(user?.id);
  const activeFpgwLocks = fpgwLocksData?.locks ?? [];
  const { showOnboarding, completeOnboarding } = useOnboarding();
  const isMobile = useIsMobile();
  
  const [copiedId, setCopiedId] = useState(false);
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [activitySearch, setActivitySearch] = useState('');
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [selectedCert, setSelectedCert] = useState<any | null>(null);
  const [chartPeriod, setChartPeriod] = useState<'7D' | '30D' | '90D'>('30D');
  const [savingsGoal] = useState(500);
  const [showBnslModal, setShowBnslModal] = useState(false);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [depositGoldModalOpen, setDepositGoldModalOpen] = useState(false);

  /* 3D tilt instances — one per major glass card */
  const tiltHero          = useTilt(9);
  const tiltPriceLock     = useTilt(8);
  const tiltDepositGold   = useTilt(8);
  const tiltReferral      = useTilt(7);
  const tiltBNSL          = useTilt(7);
  const tiltBNSLSummary   = useTilt(7);
  const tiltTrade         = useTilt(7);
  const tiltFinaBridge    = useTilt(6);
  const tiltGoldWallets   = useTilt(6);
  const tiltLocked        = useTilt(6);
  const tiltGoldChart     = useTilt(5);
  const tiltFinaCard      = useTilt(8);

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

  const { data: referralData } = useQuery<{ referralCode: string | null; stats: { totalReferrals: number; totalBonusEarned: number } }>({
    queryKey: ['referrals-dashboard', user?.id],
    queryFn: async () => {
      const res = await fetch('/api/referrals/dashboard');
      if (!res.ok) return { referralCode: null, stats: { totalReferrals: 0, totalBonusEarned: 0 } };
      return res.json();
    },
    enabled: !!user?.id,
    staleTime: 120000,
  });
  const [copiedRef, setCopiedRef] = useState(false);

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

  // ── BNSL arc-chart / quarterly-payout analytics ──
  const firstActivePlan = bnslPlans.find((p: { status: string }) => p.status === 'Active') || bnslPlans[0] || null;
  const bnslPlanProgress = firstActivePlan
    ? Math.min(100, Math.max(0, ((Date.now() - new Date(firstActivePlan.startDate).getTime()) / (new Date(firstActivePlan.maturityDate).getTime() - new Date(firstActivePlan.startDate).getTime())) * 100))
    : 0;
  const bnslDaysSinceStart = firstActivePlan
    ? Math.floor((Date.now() - new Date(firstActivePlan.startDate).getTime()) / 86400000)
    : 0;
  const bnslDaysIntoQuarter = bnslDaysSinceStart % 90;
  const bnslDaysToNextPayout = 90 - bnslDaysIntoQuarter;
  const bnslQuarterProgress = (bnslDaysIntoQuarter / 90) * 100;
  const bnslCurrentQuarter = Math.floor(bnslDaysSinceStart / 90) + 1;
  const bnslQuarterlyPayout = firstActivePlan ? parseFloat(firstActivePlan.quarterlyMarginUsd || '0') : 0;
  // SVG arc constants: radius 30, path length = π × 30 ≈ 94.25
  const ARC_LEN = 94.25;
  const bnslArcDash = (bnslPlanProgress / 100) * ARC_LEN;

  // ── Average buy price from completed buy transactions ──
  const avgBuyPrice = useMemo(() => {
    const buys = unifiedTx.filter(tx =>
      (tx.status === 'completed' || tx.status === 'Completed') &&
      ['Buy Gold', 'Gold Bar Purchase', 'Deposit', 'Physical Deposit'].some(k => (tx.actionType || '').toLowerCase().includes(k.toLowerCase())) &&
      Number(tx.grams) > 0 && Number(tx.usd) > 0
    );
    if (buys.length === 0) return goldPrice;
    const totalGrams = buys.reduce((s, t) => s + Number(t.grams || 0), 0);
    const totalUsd = buys.reduce((s, t) => s + Number(t.usd || 0), 0);
    return totalGrams > 0 ? totalUsd / totalGrams : goldPrice;
  }, [unifiedTx, goldPrice]);

  // ── Gold price history (simulated from current price with realistic variation) ──
  const goldPriceHistory = useMemo(() => {
    const days = chartPeriod === '7D' ? 7 : chartPeriod === '30D' ? 30 : 90;
    const basePrice = goldPrice;
    const seed = [0, -0.4, -0.7, -0.3, 0.5, 0.8, 0.2, -0.5, -1.1, -0.6, 0.4, 1.2, 0.9, 0.3, -0.2, 0.6, 1.0, 0.7, -0.3, -0.8, 0.5, 0.2, -0.4, 0.8, 1.1, 0.6, -0.1, -0.6, 0.3, 0.8, 0.4, -0.2, 0.7, 1.3, 0.5, -0.3, -0.9, 0.4, 0.9, 0.2, -0.5, 0.3, 0.8, -0.2, 0.6, 1.1, 0.4, -0.3, 0.2, 0.7, -0.4, 0.3, -0.6, 0.5, 1.0, 0.3, -0.4, 0.7, 0.2, -0.5, 0.4, 0.9, 0.1, -0.3, 0.6, 1.2, 0.5, -0.2, 0.3, 0.8, -0.1, 0.5, 1.0, 0.3, -0.4, 0.7, 0.2, -0.6, 0.4, 0.9, -0.2, 0.3, 0.8, 0.5, -0.3, 0.6, 1.1, 0.4, -0.2, 0.3];
    let price = basePrice * (1 - (seed.slice(0, days).reduce((a, b) => a + b, 0) / 100));
    const data = [];
    for (let i = days; i >= 0; i--) {
      const variation = (seed[i % seed.length] || 0) / 100;
      price = price * (1 + variation);
      const date = new Date();
      date.setDate(date.getDate() - i);
      data.push({
        date: i === 0 ? 'Now' : format(date, days <= 7 ? 'EEE' : 'MMM d'),
        price: parseFloat(price.toFixed(2)),
      });
    }
    data[data.length - 1].price = basePrice;
    return data;
  }, [goldPrice, chartPeriod]);

  // ── Unrealized gain/loss ──
  const currentPortfolioValue = totalGoldGrams * goldPrice;
  const costBasis = totalGoldGrams * avgBuyPrice;
  const unrealizedGain = currentPortfolioValue - costBasis;
  const unrealizedGainPct = costBasis > 0 ? (unrealizedGain / costBasis) * 100 : 0;

  // ── Pending crypto deposits ──
  const pendingDeposits = (pendingDepositsData?.requests || []).filter(r => r.status === 'Pending');

  const getTxDisplayName = (tx: { type: string; description?: string | null }) => {
    if (tx.type === 'Swap') {
      const d = tx.description || '';
      if (d.includes('LGPW to FGPW') || d.includes('LGPW To FGPW')) return 'Price Protection Activated';
      if (d.includes('FGPW to LGPW') || d.includes('FGPW To LGPW')) return 'Price Protection Removed';
      return 'Gold Wallet Transfer';
    }
    const map: Record<string, string> = {
      Buy: 'Buy Gold', Sell: 'Sell Gold', Send: 'Send Gold', Receive: 'Receive Gold',
      Deposit: 'Gold Credited', Withdrawal: 'Cash Out', 'Vault Deposit': 'Gold Vault Deposit',
    };
    return map[tx.type] ?? tx.type;
  };

  const filteredActivities = useMemo(() => {
    if (!activitySearch) return transactions.slice(0, 10);
    return transactions.filter(t =>
      getTxDisplayName(t).toLowerCase().includes(activitySearch.toLowerCase()) ||
      t.type?.toLowerCase().includes(activitySearch.toLowerCase()) ||
      t.id?.toLowerCase().includes(activitySearch.toLowerCase()) ||
      t.sourceModule?.toLowerCase().includes(activitySearch.toLowerCase())
    ).slice(0, 10);
  }, [transactions, activitySearch]);

  const recentCertsList = useMemo(() => {
    const EXCLUDED_CERT_TYPES = ['Conversion'];
    return [...(certsData?.certificates || [])]
      .filter(c => !EXCLUDED_CERT_TYPES.includes(c.type))
      .sort((a, b) => new Date(b.issuedAt || b.createdAt).getTime() - new Date(a.issuedAt || a.createdAt).getTime())
      .slice(0, 5);
  }, [certsData]);


  const getTransactionAmount = (tx: { amountUsd: string | null; amountGold: string | null }) => {
    const goldAmt = parseFloat(tx.amountGold || '0');
    if (goldAmt !== 0) return `${formatNumber(Math.abs(goldAmt), 4)}g`;
    const usdAmt = parseFloat(tx.amountUsd || '0');
    if (usdAmt !== 0) return `${formatNumber(Math.abs(usdAmt) / goldPrice, 4)}g`;
    return '0.0000g';
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

  const getActivityIcon = (type: string, module?: string) => {
    const t = type?.toLowerCase() || '';
    const m = module?.toLowerCase() || '';
    if (m === 'bnsl' || t.includes('bnsl') || t.includes('margin')) {
      return <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center"><Lock className="w-4 h-4 text-amber-600 dark:text-amber-400" /></div>;
    }
    if (m === 'finabridge' || t.includes('bridge') || t.includes('trade')) {
      return <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100 flex items-center justify-center"><Landmark className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /></div>;
    }
    if (t.includes('buy') || t.includes('deposit') || t.includes('add') || t.includes('receive') || t.includes('credit')) {
      return <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center"><ArrowDownLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /></div>;
    }
    if (t.includes('sell') || t.includes('withdraw')) {
      return <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center"><ArrowUpRight className="w-4 h-4 text-red-500" /></div>;
    }
    if (t.includes('send') || t.includes('transfer')) {
      return <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center"><Send className="w-4 h-4 text-blue-600 dark:text-blue-400" /></div>;
    }
    if (t.includes('swap') || t.includes('price protection')) {
      return <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-50 to-violet-100 flex items-center justify-center"><ArrowLeftRight className="w-4 h-4 text-violet-600 dark:text-violet-400" /></div>;
    }
    if (t.includes('card')) {
      return <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center"><CreditCard className="w-4 h-4 text-purple-600 dark:text-purple-400" /></div>;
    }
    return <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center"><ArrowUpRight className="w-4 h-4 text-muted-foreground" /></div>;
  };

  const getStatusBadge = (status: string) => {
    const s = status?.toLowerCase() || '';
    if (s === 'completed' || s === 'complete') {
      return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 border border-emerald-100"><span className="w-1.5 h-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/200" />Completed</span>;
    }
    if (s === 'pending') {
      return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 border border-amber-100"><span className="w-1.5 h-1.5 rounded-full bg-amber-50 dark:bg-amber-950/200 animate-pulse" />Pending</span>;
    }
    if (s === 'processing' || s === 'in progress') {
      return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 border border-blue-100"><span className="w-1.5 h-1.5 rounded-full bg-blue-50 dark:bg-blue-950/200 animate-pulse" />Processing</span>;
    }
    if (s === 'failed' || s === 'rejected') {
      return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 border border-red-100"><span className="w-1.5 h-1.5 rounded-full bg-red-50 dark:bg-red-950/200" />Failed</span>;
    }
    return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-muted/50 text-muted-foreground border border-border/60"><span className="w-1.5 h-1.5 rounded-full bg-gray-400" />{status}</span>;
  };
  return (
    <DashboardLayout>
      <motion.div
        className="max-w-[1400px] mx-auto pb-10 space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >

        <AnimatePresence>
          {pendingPhysicalDeposits.length > 0 && (
            <motion.div
              key="physical-deposit-alert"
              layout
              initial={{ opacity: 0, y: -10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 340, damping: 26 } }}
              exit={{ opacity: 0, y: -10, scale: 0.96, transition: { duration: 0.22 } }}
            >
              <Alert className="bg-gradient-to-r from-amber-50 via-amber-50/80 to-orange-50 dark:from-amber-950/30 dark:via-amber-950/20 dark:to-orange-950/30 border-amber-200/60 dark:border-amber-800/40 rounded-2xl shadow-sm" data-testid="alert-physical-deposit">
                <Package className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <AlertDescription className="flex items-center justify-between">
                  <span className="text-amber-800 dark:text-amber-200" data-testid="text-physical-deposit-count">
                    You have <strong>{pendingPhysicalDeposits.length}</strong> physical gold deposit{pendingPhysicalDeposits.length > 1 ? 's' : ''} in progress
                  </span>
                  <Link href="/finavault">
                    <Button variant="outline" size="sm" className="border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:bg-amber-900/30 dark:hover:bg-amber-900/40 rounded-xl font-semibold" data-testid="button-view-physical-status">
                      View Status
                    </Button>
                  </Link>
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ───────────────── PAGE TITLE ───────────────── */}
        <motion.section variants={itemVariants} className="flex items-center justify-between">
          <div>
            <h1 className="text-display-md font-display" data-testid="text-welcome">
              <span className="text-foreground">{getGreeting()}, </span>
              <span className="gradient-text-purple">{userName}</span>
            </h1>
            <p className="text-muted-foreground text-[14px] mt-1.5">Quick Action</p>
          </div>
          <motion.div whileHover={{ scale: 1.02 }} className="flex items-center gap-2.5 bg-card/70 dark:bg-card/50 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-border/60 shadow-sm cursor-default">
            <span className="kpi-label">ID</span>
            <span className="text-sm font-semibold text-foreground font-mono-ui tracking-tight">{finatradesId}</span>
            <button onClick={copyFinatradesId} className="p-1.5 hover:bg-primary/10 rounded-lg transition-all" title="Copy ID" aria-label="Copy Finatrades ID" data-testid="button-copy-id">
              {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground/70" />}
            </button>
          </motion.div>
        </motion.section>

        {/* ═══════════════════ TOP ROW: Quick Action + Card | Holdings | Performance ═══════════════════ */}
        <div className="grid grid-cols-12 gap-4">

          {/* ── COL 1 (5/12): Quick Action pills + FinaCard visual ── */}
          <motion.div variants={itemVariants} className="col-span-12 lg:col-span-5 space-y-4">
            {/* Quick Action pill row */}
            <div className="flex flex-wrap gap-2" data-testid="quick-actions">
              <button onClick={() => setActiveModal('deposit')} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[13px] font-semibold bg-card border border-border hover:border-primary/40 hover:bg-primary/5 transition-all" data-testid="button-add-funds">
                <Plus className="w-3.5 h-3.5" /> Add Funds
              </button>
              <button onClick={() => setShowTransferModal(true)} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[13px] font-semibold bg-card border border-border hover:border-primary/40 hover:bg-primary/5 transition-all" data-testid="button-pay-bill">
                <Send className="w-3.5 h-3.5" /> Pay Bill
              </button>
              <Link href="/transactions"><a className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[13px] font-semibold bg-card border border-border hover:border-primary/40 hover:bg-primary/5 transition-all" data-testid="button-reports"><ArrowUpRight className="w-3.5 h-3.5" /> Reports</a></Link>
              <button onClick={() => setActiveModal('buybar')} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[13px] font-semibold text-white transition-all hover:scale-[1.02]" style={{ background: 'linear-gradient(135deg,#7c3aed,#9333ea)', boxShadow: '0 2px 10px rgba(124,58,237,0.30)' }} data-testid="button-buy-gold">
                <Package className="w-3.5 h-3.5" /> Buy Gold
              </button>
            </div>

            {/* FinaCard credit card visual — Hynex style with GlareCard tilt */}
            <GlareCard
              className="relative h-[310px] rounded-3xl cursor-pointer"
              glareColor="rgba(255, 215, 0, 0.28)"
            >
            <motion.div
              whileHover={{ y: -4, scale: 1.008 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="relative h-full rounded-3xl overflow-hidden cursor-pointer"
              style={{
                background: 'linear-gradient(135deg,#1c1c26 0%,#0d0d14 60%,#16161e 100%)',
                boxShadow: '0 24px 60px -18px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.05) inset, 0 1px 0 rgba(255,255,255,0.06) inset',
              }}
              data-testid="card-finacard-visual"
              onClick={() => window.location.href = '/finacard'}
            >
              {/* big gold glow bottom-left */}
              <div className="absolute -bottom-24 -left-16 w-[340px] h-[340px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(255,184,0,0.55) 0%, rgba(212,175,55,0.30) 40%, transparent 70%)', filter: 'blur(12px)' }} />
              {/* purple accent top-right */}
              <div className="absolute -top-12 -right-12 w-56 h-56 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.30), transparent 70%)', filter: 'blur(10px)' }} />
              {/* top sparkle line */}
              <div className="absolute top-12 left-6 w-12 h-0.5 rounded-full" style={{ background: 'linear-gradient(90deg, rgba(255,215,0,0.8), transparent)' }} />
              {/* diagonal sheen */}
              <div className="absolute inset-0 opacity-50 pointer-events-none" style={{ background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.06) 50%, transparent 70%)' }} />

              <div className="relative z-10 p-6 h-full flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <span className="text-white text-[20px] font-bold italic tracking-wider" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>VISA</span>
                  <div className="text-right">
                    <span className="text-white/55 text-[11px] font-mono-ui tracking-[0.18em] block">**** **** **** {finatradesId.slice(-4)}</span>
                    <span className="text-white/35 text-[10px] font-mono-ui mt-1 inline-block">12/27</span>
                  </div>
                </div>

                {/* "6 Cards" badge — golden gradient like Hynex */}
                <div className="flex">
                  <div
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255,215,0,0.30) 0%, rgba(255,184,0,0.18) 100%)',
                      border: '1px solid rgba(255,215,0,0.35)',
                      boxShadow: '0 4px 12px rgba(255,184,0,0.25)',
                    }}
                  >
                    <Sparkles className="w-3 h-3 text-amber-200" />
                    <span className="text-[11px] font-bold text-amber-100 tracking-tight">FinaCard</span>
                  </div>
                </div>

                <div className="flex items-end justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[11px] text-white/65 font-medium">Wallet Balance</span>
                      {totals.totalPortfolioUsd > 0 && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-400/15 text-emerald-400 text-[10px] font-bold">
                          <TrendingUp className="w-2.5 h-2.5" /> +{((unrealizedGainPct || 0)).toFixed(1)}%
                        </span>
                      )}
                    </div>
                    <p className="kpi-value text-white text-[36px] leading-none" data-testid="text-total-balance" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.4)' }}>
                      {showBalance ? `$${formatNumber(totalPortfolioValue)}` : hiddenValue}
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setBalanceVisible(!balanceVisible); }}
                    className="w-8 h-8 rounded-full bg-foreground/5 hover:bg-foreground/10 flex items-center justify-center transition-colors"
                    aria-label="Toggle balance visibility"
                    data-testid="button-toggle-balance"
                  >
                    {showBalance ? <Eye className="w-3.5 h-3.5 text-white/70" /> : <EyeOff className="w-3.5 h-3.5 text-white/70" />}
                  </button>
                </div>
              </div>
            </motion.div>
            </GlareCard>
          </motion.div>

          {/* ── COL 2 (4/12): Gold Holdings & Metrics ── */}
          <motion.div variants={itemVariants} className="col-span-12 lg:col-span-4">
            <div className="hynex-card h-full p-6 flex flex-col" data-testid="card-gold-holdings">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-[15px] font-semibold text-foreground">Gold Holdings & Metrics</h3>
                </div>
                <button className="p-1.5 hover:bg-muted rounded-lg" aria-label="More options"><span className="text-muted-foreground text-lg leading-none">⋯</span></button>
              </div>

              {/* primary value */}
              <div className="flex items-baseline gap-3 mb-1">
                {showBalance ? (
                  <span data-testid="text-gold-balance-usd" className="inline-block">
                    <NumberTicker
                      value={walletGoldValue}
                      decimalPlaces={2}
                      prefix="$"
                      className="kpi-value text-[36px] text-foreground"
                    />
                  </span>
                ) : (
                  <span className="kpi-value text-[36px] text-foreground" data-testid="text-gold-balance-usd">{hiddenValue}</span>
                )}
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/200/15 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">
                  <TrendingUp className="w-2.5 h-2.5" />
                  {totals.walletGoldGrams > 0 ? `${formatNumber(totals.walletGoldGrams, 3)}g` : '0g'}
                </span>
              </div>
              <p className="text-[12px] text-muted-foreground mb-1">Wallet Balance</p>
              <p className="text-[11px] text-muted-foreground/70">Gold-backed savings &amp; trade settlements</p>

              {/* sub metrics grid */}
              <div className="mt-5 pt-5 border-t border-border/40 grid grid-cols-2 gap-4">
                <div data-testid="metric-vault">
                  <p className="kpi-value text-[22px] text-foreground">
                    {showBalance ? `$${formatNumber(finacardValue)}` : hiddenValue}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">FinaCard Balance</p>
                </div>
                <div data-testid="metric-bnsl">
                  <p className="kpi-value text-[22px] text-foreground">
                    {showBalance ? `$${formatNumber(bnslValue)}` : hiddenValue}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">BNSL Savings</p>
                </div>
              </div>

              {/* avatar stack + actions */}
              <div className="mt-auto pt-5 flex items-center justify-between">
                <div className="flex -space-x-2">
                  {[0,1,2,3].map(i => (
                    <div key={i} className="w-7 h-7 rounded-full ring-2 ring-card flex items-center justify-center text-[10px] font-bold text-white" style={{ background: ['#7c3aed','#f59e0b','#10b981','#3b82f6'][i] }}>
                      {['F','B','V','C'][i]}
                    </div>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => setActiveModal('deposit')} className="w-7 h-7 rounded-full bg-muted hover:bg-primary/10 flex items-center justify-center" aria-label="Add" data-testid="button-add-deposit">
                    <Plus className="w-3.5 h-3.5 text-foreground" />
                  </button>
                  <button onClick={() => setActiveModal('withdraw')} className="w-7 h-7 rounded-full bg-muted hover:bg-primary/10 flex items-center justify-center" aria-label="Remove" data-testid="button-withdraw-quick">
                    <span className="text-foreground text-base leading-none">−</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ── COL 3 (3/12): Smart Gold Performance — Donut + Area chart ── */}
          <motion.div variants={itemVariants} className="col-span-12 lg:col-span-3">
            <div className="hynex-card h-full p-5 flex flex-col" data-testid="card-gold-performance">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-[14px] font-semibold text-foreground">Gold Performance</h3>
                <select value={chartPeriod} onChange={e => setChartPeriod(e.target.value as any)} className="text-[11px] font-semibold bg-muted/60 border border-border/60 rounded-full px-2.5 py-1 cursor-pointer focus:outline-none" data-testid="select-chart-period">
                  <option value="7D">Weekly</option>
                  <option value="30D">Monthly</option>
                  <option value="90D">Quarterly</option>
                </select>
              </div>

              {/* 3-ring donut with side labels (Hynex-style) */}
              {(() => {
                const tot = Math.max(totalPortfolioValue, 1);
                const pctWallet = (walletGoldValue / tot) * 100;
                const pctCard = (finacardValue / tot) * 100;
                const pctBnsl = (bnslValue / tot) * 100;
                return (
                  <div className="relative flex items-center justify-between gap-3 mb-2">
                    {/* left label */}
                    <div className="text-right">
                      <p className="kpi-value text-[22px] text-foreground leading-none font-bold tabular-nums">{Math.round(pctWallet)}%</p>
                      <p className="text-[11px] text-muted-foreground mt-1">Wallet</p>
                    </div>

                    <div className="relative" style={{ width: 170, height: 170 }}>
                      <svg width="170" height="170" viewBox="0 0 170 170">
                        {/* outer ring — cyan (Wallet) */}
                        <circle cx="85" cy="85" r="72" fill="none" stroke="rgba(34,211,238,0.10)" strokeWidth="9" />
                        <circle cx="85" cy="85" r="72" fill="none" stroke="url(#perfCyan)" strokeWidth="9" strokeLinecap="round"
                          strokeDasharray={`${(pctWallet / 100) * 452} 452`} transform="rotate(-90 85 85)" />
                        {/* mid ring — green (FinaCard) */}
                        <circle cx="85" cy="85" r="58" fill="none" stroke="rgba(16,185,129,0.10)" strokeWidth="9" />
                        <circle cx="85" cy="85" r="58" fill="none" stroke="url(#perfGreen)" strokeWidth="9" strokeLinecap="round"
                          strokeDasharray={`${(pctCard / 100) * 364} 364`} transform="rotate(-90 85 85)" />
                        {/* inner ring — amber (BNSL) */}
                        <circle cx="85" cy="85" r="44" fill="none" stroke="rgba(245,158,11,0.10)" strokeWidth="9" />
                        <circle cx="85" cy="85" r="44" fill="none" stroke="url(#perfGold)" strokeWidth="9" strokeLinecap="round"
                          strokeDasharray={`${(pctBnsl / 100) * 276} 276`} transform="rotate(-90 85 85)" />
                        <defs>
                          <linearGradient id="perfCyan" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#22d3ee" /><stop offset="100%" stopColor="#06b6d4" /></linearGradient>
                          <linearGradient id="perfGreen" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#34d399" /><stop offset="100%" stopColor="#10b981" /></linearGradient>
                          <linearGradient id="perfGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#fbbf24" /><stop offset="100%" stopColor="#f59e0b" /></linearGradient>
                        </defs>
                      </svg>
                    </div>

                    {/* right labels */}
                    <div className="text-left space-y-3">
                      <div>
                        <p className="kpi-value text-[20px] text-foreground leading-none font-bold tabular-nums">{Math.round(pctCard)}%</p>
                        <p className="text-[11px] text-muted-foreground mt-1">FinaCard</p>
                      </div>
                      <div>
                        <p className="kpi-value text-[20px] text-foreground leading-none font-bold tabular-nums">{Math.round(pctBnsl)}%</p>
                        <p className="text-[11px] text-muted-foreground mt-1">BNSL</p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Area chart */}
              <div className="flex-1 -mx-1" style={{ minHeight: 70 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={goldPriceHistory} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="perfArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="price" stroke="#22d3ee" strokeWidth={2} fill="url(#perfArea)" />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 11 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <p className="text-[10px] text-muted-foreground mt-1 text-center">
                ${formatNumber(goldPrice)}/g · <span className="text-emerald-500 font-semibold">+{(unrealizedGainPct || 0).toFixed(1)}%</span> growth
              </p>
            </div>
          </motion.div>
        </div>

        {/* ═══════════════════ BOTTOM ROW: Tracking + Schedule ═══════════════════ */}
        <div className="grid grid-cols-12 gap-4">

          {/* ── Portfolio Allocation Tracking + Transactions (8/12) ── */}
          <motion.div variants={itemVariants} className="col-span-12 lg:col-span-8">
            <div className="hynex-card p-6" data-testid="card-portfolio-tracking">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[16px] font-semibold text-foreground">Portfolio Allocation Tracking</h2>
              </div>

              {/* 4 progress segments — Hynex style: bigger %, taller bars */}
              {(() => {
                const segs = [
                  { label: 'Wallet',    value: walletGoldValue,    color: '#22d3ee' },
                  { label: 'FinaCard',  value: finacardValue,      color: '#34d399' },
                  { label: 'BNSL',      value: bnslValue,          color: '#fbbf24' },
                  { label: 'FinaBridge',value: finaBridgeValue,    color: '#e5e7eb' },
                ];
                const total = Math.max(segs.reduce((s, x) => s + x.value, 0), 1);
                return (
                  <div className="space-y-3.5 mb-6">
                    <div className="grid grid-cols-4 gap-4">
                      {segs.map(s => (
                        <div key={s.label}>
                          <p className="kpi-value text-[28px] text-foreground leading-none">{Math.round((s.value / total) * 100)}%</p>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-4 gap-4">
                      {segs.map(s => (
                        <div key={s.label} className="h-3 rounded-full overflow-hidden bg-muted/60">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.max((s.value / total) * 100, 3)}%`,
                              background: `linear-gradient(90deg, ${s.color}, ${s.color}cc)`,
                              boxShadow: `0 0 14px ${s.color}66`,
                            }}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-4 gap-4">
                      {segs.map(s => (
                        <div key={s.label} className="flex items-center gap-2 text-[12px] text-muted-foreground">
                          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: s.color }} /> {s.label}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Search */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  value={activitySearch}
                  onChange={e => setActivitySearch(e.target.value)}
                  placeholder="Search transactions..."
                  className="w-full pl-9 pr-9 py-2.5 text-[13px] bg-muted/40 border border-border/60 rounded-full focus:outline-none focus:border-primary/40 placeholder:text-muted-foreground/50"
                  data-testid="input-search-transactions"
                />
                <button className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-card border border-border flex items-center justify-center" aria-label="Filter">
                  <ChevronRight className="w-3 h-3 text-muted-foreground" />
                </button>
              </div>

              {/* Transactions table */}
              <div className="overflow-hidden rounded-2xl border border-border/40">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground bg-muted/30">
                      <th className="px-4 py-2.5">Transaction</th>
                      <th className="px-4 py-2.5">Module</th>
                      <th className="px-4 py-2.5">Date</th>
                      <th className="px-4 py-2.5 text-right">Amount</th>
                      <th className="px-4 py-2.5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {filteredActivities.length > 0 ? filteredActivities.slice(0, 5).map((tx) => (
                      <tr key={tx.id} className="hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => setSelectedTransaction(tx as any)} data-testid={`row-tx-${tx.id}`}>
                        <td className="px-4 py-3">
                          <span className="text-[13px] font-medium text-foreground">{getTxDisplayName(tx)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[12px] text-muted-foreground capitalize">{tx.sourceModule || '—'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[12px] text-muted-foreground font-mono-ui">{tx.createdAt && isValid(new Date(tx.createdAt)) ? format(new Date(tx.createdAt), 'MMM d') : '—'}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-[13px] font-semibold text-foreground font-mono-ui">{getTransactionAmount(tx as any)}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {getStatusBadge(tx.status)}
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-[12px] text-muted-foreground">
                          No transactions yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>

          {/* ── Wallet Insights Schedule timeline (4/12) ── */}
          <motion.div variants={itemVariants} className="col-span-12 lg:col-span-4">
            <div className="hynex-card h-full p-6 flex flex-col" data-testid="card-schedule">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[16px] font-semibold text-foreground">Wallet Insights Schedule</h2>
                <button className="p-1 hover:bg-muted rounded-lg" aria-label="More"><span className="text-muted-foreground leading-none">⋯</span></button>
              </div>

              <AnimatedList className="space-y-3.5 flex-1" stagger={0.07}>
                {(() => {
                  const today = new Date();
                  const items = [
                    {
                      d: new Date(today.getFullYear(), today.getMonth(), 15),
                      title: 'Spending Breakdown',
                      sub: `${transactions.length} txns · $${formatNumber(walletGoldValue)} this period`,
                    },
                    {
                      d: new Date(today.getFullYear(), today.getMonth(), 20),
                      title: 'Gold Price Lock Renewal',
                      sub: `${activeFpgwLocks.length} active lock${activeFpgwLocks.length === 1 ? '' : 's'}`,
                    },
                    {
                      d: new Date(today.getFullYear(), today.getMonth(), 25),
                      title: 'BNSL Quarterly Payout',
                      sub: `Q${bnslCurrentQuarter} · $${formatNumber(bnslQuarterlyPayout)}`,
                    },
                    {
                      d: new Date(today.getFullYear(), today.getMonth(), 30),
                      title: 'Monthly Statement',
                      sub: `Total Portfolio: $${formatNumber(totalPortfolioValue)}`,
                    },
                    {
                      d: new Date(today.getFullYear(), today.getMonth() + 1, 1),
                      title: 'Scheduled Vault Audit',
                      sub: `${(certsData?.certificates || []).length} certificates on file`,
                    },
                  ];
                  return items.map((it, i) => (
                    <div key={i} className="flex items-center gap-4 group cursor-pointer hover:bg-muted/30 -mx-2 px-2 py-2 rounded-xl transition-colors" data-testid={`schedule-item-${i}`}>
                      <div className="flex flex-col items-center justify-center w-12 shrink-0">
                        <span className="kpi-value text-[26px] text-foreground leading-none group-hover:text-primary transition-colors">{format(it.d, 'd')}</span>
                        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground mt-1">{format(it.d, 'MMM')}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-foreground truncate leading-tight">{it.title}</p>
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">{it.sub}</p>
                      </div>
                    </div>
                  ));
                })()}
              </AnimatedList>

              <Link href="/transactions">
                <a className="mt-5 block text-center py-2.5 rounded-full text-[12px] font-semibold text-foreground bg-muted/40 hover:bg-muted transition-colors" data-testid="link-view-all-schedule">
                  View All
                </a>
              </Link>
            </div>
          </motion.div>
        </div>

      </motion.div>

      {showOnboarding && (
        <OnboardingTour onComplete={completeOnboarding} />
      )}

      {showOnboarding && (
        <OnboardingTour onComplete={completeOnboarding} />
      )}

      <DepositModal isOpen={activeModal === 'deposit'} onClose={() => setActiveModal(null)} />
      <BuyGoldBarModal isOpen={activeModal === 'buybar'} onClose={() => setActiveModal(null)} />
      <SellGoldModal
        isOpen={activeModal === 'sell'}
        onClose={() => setActiveModal(null)}
        goldPrice={goldPrice}
        walletBalance={totals.walletGoldGrams || 0}
        spreadPercent={1.5}
        onConfirm={() => setActiveModal(null)}
      />
      <WithdrawGoldModal isOpen={activeModal === 'withdraw'} onClose={() => setActiveModal(null)} />
      <SendGoldModal
        isOpen={activeModal === 'send'}
        onClose={() => setActiveModal(null)}
        walletBalance={(totals.walletGoldGrams || 0) * goldPrice}
        goldBalance={totals.walletGoldGrams || 0}
        onConfirm={() => setActiveModal(null)}
      />
      <RequestGoldModal
        isOpen={activeModal === 'request'}
        onClose={() => setActiveModal(null)}
        onConfirm={() => setActiveModal(null)}
      />
      <LockGoldPriceModal isOpen={activeModal === 'lock'} onClose={() => setActiveModal(null)} userId={user?.id || ''} />
      <TransactionDetailsModal
        isOpen={!!selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        transaction={selectedTransaction}
        goldPrice={goldPrice}
      />

      {/* Certificate Detail Modal — same as FinaVault */}
      <CertificateDetailModal
        certificate={selectedCert}
        open={!!selectedCert}
        onOpenChange={(open) => { if (!open) setSelectedCert(null); }}
      />

      <QuickBnslModal
        open={showBnslModal}
        onOpenChange={setShowBnslModal}
        bnslWalletBalance={totals.bnslWalletGoldGrams || 0}
        currentGoldPrice={goldPrice}
      />
      <QuickTradeModal
        open={showTradeModal}
        onOpenChange={setShowTradeModal}
        currentGoldPrice={goldPrice}
      />
      <InternalTransferModal
        open={showTransferModal}
        onOpenChange={setShowTransferModal}
        availableGoldGrams={totals.walletGoldGrams || 0}
        currentGoldPrice={goldPrice}
        isBusinessUser={isBusinessUser}
      />

      {/* Deposit Gold Modal — embeds PhysicalGoldDeposit form */}
      <Dialog open={depositGoldModalOpen} onOpenChange={setDepositGoldModalOpen}>
        <DialogContent className="max-w-3xl w-[95vw] max-h-[88vh] overflow-y-auto p-6 rounded-2xl">
          <PhysicalGoldDeposit embedded={true} onSuccess={() => setDepositGoldModalOpen(false)} />
        </DialogContent>
      </Dialog>

    </DashboardLayout>
  );
}
