import { useState, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import finatradesLogo from '@/assets/finatrades-logo-purple.png';
import { ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Copy, Check, Package, CreditCard, Send, Download, TrendingUp, TrendingDown, Search, ChevronRight, Plus, Eye, EyeOff, Zap, Sparkles, Shield, Vault, Landmark, Lock, Gift, Users } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useUnifiedTransactions } from '@/hooks/useUnifiedTransactions';
import { useFpgwLocks } from '@/hooks/useDualWallet';
import { usePendingItems } from '@/hooks/usePendingItems';
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
import { motion, AnimatePresence } from 'framer-motion';
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
    transition: { staggerChildren: 0.09, delayChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 22, scale: 0.98 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: 'spring', stiffness: 280, damping: 28, mass: 0.9 }
  }
};

const cardHoverProps = {
  whileHover: { y: -5, scale: 1.012, transition: { type: 'spring', stiffness: 400, damping: 22 } },
  whileTap: { scale: 0.98, transition: { duration: 0.12 } },
};

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
  // usePendingItems is React Query backed; same query keys → shared cache, no duplicate fetch
  const { total: pendingTotal } = usePendingItems();
  const isMobile = useIsMobile();
  
  const [walletView, setWalletView] = useState<'currency' | 'weight'>('currency');
  const [weightUnit, setWeightUnit] = useState<'g' | 'oz' | 'kg'>('g');
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
      return <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center"><Lock className="w-4 h-4 text-amber-600" /></div>;
    }
    if (m === 'finabridge' || t.includes('bridge') || t.includes('trade')) {
      return <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100 flex items-center justify-center"><Landmark className="w-4 h-4 text-indigo-600" /></div>;
    }
    if (t.includes('buy') || t.includes('deposit') || t.includes('add') || t.includes('receive') || t.includes('credit')) {
      return <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center"><ArrowDownLeft className="w-4 h-4 text-emerald-600" /></div>;
    }
    if (t.includes('sell') || t.includes('withdraw')) {
      return <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center"><ArrowUpRight className="w-4 h-4 text-red-500" /></div>;
    }
    if (t.includes('send') || t.includes('transfer')) {
      return <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center"><Send className="w-4 h-4 text-blue-600" /></div>;
    }
    if (t.includes('swap') || t.includes('price protection')) {
      return <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-50 to-violet-100 flex items-center justify-center"><ArrowLeftRight className="w-4 h-4 text-violet-600" /></div>;
    }
    if (t.includes('card')) {
      return <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center"><CreditCard className="w-4 h-4 text-purple-600" /></div>;
    }
    return <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center"><ArrowUpRight className="w-4 h-4 text-gray-500" /></div>;
  };

  const getStatusBadge = (status: string) => {
    const s = status?.toLowerCase() || '';
    if (s === 'completed' || s === 'complete') {
      return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Completed</span>;
    }
    if (s === 'pending') {
      return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />Pending</span>;
    }
    if (s === 'processing' || s === 'in progress') {
      return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />Processing</span>;
    }
    if (s === 'failed' || s === 'rejected') {
      return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-100"><span className="w-1.5 h-1.5 rounded-full bg-red-500" />Failed</span>;
    }
    return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-50 text-gray-600 border border-gray-100"><span className="w-1.5 h-1.5 rounded-full bg-gray-400" />{status}</span>;
  };

  return (
    <DashboardLayout>
      <motion.div
        className="max-w-[1400px] mx-auto space-y-6 pb-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >

        <AnimatePresence>
          {pendingPhysicalDeposits.length > 0 && (
            <motion.div
              key="physical-deposit-alert"
              layout
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <Alert className="border-amber-200/60 rounded-2xl shadow-sm" style={{ background: 'rgba(255,251,235,0.82)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }} data-testid="alert-physical-deposit">
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
        </AnimatePresence>

        <motion.section variants={itemVariants} className="flex items-center justify-between">
          <div>
            <h1 className="text-[30px] font-bold" style={{ letterSpacing: '-0.025em', lineHeight: '1.15' }} data-testid="text-welcome">
              <span className="text-gray-800">{getGreeting()}, </span>
              <span className="gradient-text-purple font-extrabold">{userName}</span>
            </h1>
            <p className="text-gray-500 text-[14px] mt-1 font-medium" style={{ letterSpacing: '-0.01em' }}>Your gold portfolio at a glance</p>
          </div>
          <motion.div
            whileHover={{ scale: 1.03 }}
            className="flex items-center gap-2.5 bg-white/80 backdrop-blur-sm px-4 py-2.5 rounded-2xl border border-gray-200/60 shadow-sm cursor-default"
          >
            <span className="text-[12px] text-gray-400 uppercase tracking-widest font-bold">ID</span>
            <span className="text-sm font-bold text-gray-800 font-mono tracking-wide">{finatradesId}</span>
            <button onClick={copyFinatradesId} className="p-1.5 hover:bg-purple-50 rounded-lg transition-all" title="Copy ID" aria-label="Copy Finatrades ID" data-testid="button-copy-id">
              {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
            </button>
          </motion.div>
        </motion.section>

        <motion.div
          variants={itemVariants}
          className="flex flex-wrap items-center gap-2 px-4 py-3 rounded-2xl"
          style={{ background: 'rgba(255,255,255,0.60)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.75)', boxShadow: '0 4px 20px rgba(124,58,237,0.08)' }}
          data-testid="quick-actions"
        >
          <span className="text-[13px] font-bold text-gray-600 whitespace-nowrap tracking-wide uppercase">Quick Access</span>
          <span className="w-px h-4 bg-gray-200 mx-1" />
          <motion.button whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.96 }} onClick={() => setActiveModal('buybar')}
            className="qa-btn-base qa-btn-purple focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
            data-testid="button-buy-gold">
            <Package className="w-3.5 h-3.5" /> Buy Gold Bar
          </motion.button>
          <motion.button whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.96 }} onClick={() => setActiveModal('sell')}
            className="qa-btn-base qa-btn-rose focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
            data-testid="button-sell-gold">
            <TrendingUp className="w-3.5 h-3.5" /> Sell Gold
          </motion.button>
          <motion.button whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.96 }} onClick={() => setActiveModal('withdraw')}
            className="qa-btn-base qa-btn-default"
            data-testid="button-withdraw-gold">
            <ArrowUpRight className="w-3.5 h-3.5 text-orange-500" /> Withdraw Gold
          </motion.button>
          <motion.button whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.96 }} onClick={() => setActiveModal('send')}
            className="qa-btn-base qa-btn-default"
            data-testid="button-send-gold">
            <Send className="w-3.5 h-3.5 text-blue-500" /> Send Gold
          </motion.button>
          <motion.button whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.96 }} onClick={() => setActiveModal('request')}
            className="qa-btn-base qa-btn-default"
            data-testid="button-request-gold">
            <ArrowDownLeft className="w-3.5 h-3.5 text-cyan-500" /> Request Gold
          </motion.button>
          <motion.button whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.96 }} onClick={() => setActiveModal('lock')}
            className="qa-btn-base qa-btn-default"
            data-testid="button-lock-gold">
            <Shield className="w-3.5 h-3.5 text-emerald-500" /> Lock Gold Price
          </motion.button>
          <motion.button whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.96 }} onClick={() => setDepositGoldModalOpen(true)}
            className="qa-btn-base qa-btn-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            data-testid="button-deposit-gold-quick">
            <Vault className="w-3.5 h-3.5" /> Deposit Gold
          </motion.button>
          {isBusinessUser && (
            <motion.button whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.96 }} onClick={() => setShowTradeModal(true)}
              className="qa-btn-base qa-btn-default"
              data-testid="button-create-trade-quick">
              <Landmark className="w-3.5 h-3.5 text-indigo-500" /> Create Trade
            </motion.button>
          )}
        </motion.div>


        <div className="grid grid-cols-12 gap-5">

          {/* ═══ LEFT COLUMN — Balance Hero + Wallets + Usage ═══ */}
          <motion.div layout className="col-span-12 xl:col-span-5 space-y-5">

            {/* Hero Balance Card */}
            <motion.div
              variants={itemVariants}
              layout
              {...cardHoverProps}
              className="relative rounded-[28px] overflow-hidden glass-panel-hero card-3d"
              data-testid="card-total-balance"
            >
              {/* Light mesh orbs */}
              <div className="absolute inset-0 mesh-light pointer-events-none" />
              <div className="absolute top-0 right-0 w-64 h-64 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.10), transparent)', transform: 'translate(30%, -30%)' }} />
              <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.09), transparent)', transform: 'translate(-20%, 25%)' }} />
              {/* Top accent stripe */}
              <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: 'linear-gradient(90deg, #7c3aed, #a855f7, #D4AF37, #a855f7, #7c3aed)', backgroundSize: '200% 100%', animation: 'shimmer 4s ease-in-out infinite' }} />

              <div className="relative z-10 p-7">
                <div className="flex items-start justify-between mb-2">
                  {/* Left: balance info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.12), rgba(168,85,247,0.08))', border: '1px solid rgba(124,58,237,0.18)' }}>
                        <Sparkles className="w-4 h-4 text-purple-600" />
                      </div>
                      <span className="text-[13px] text-gray-500 font-semibold tracking-wide">Wallet Balance</span>
                      <button onClick={() => setBalanceVisible(!balanceVisible)} className="ml-auto p-1.5 hover:bg-purple-50 rounded-lg transition-colors" aria-label={balanceVisible ? 'Hide balance' : 'Show balance'} data-testid="button-toggle-balance">
                        {balanceVisible ? <Eye className="w-4 h-4 text-gray-400" /> : <EyeOff className="w-4 h-4 text-gray-400" />}
                      </button>
                    </div>
                    <motion.p
                      className="text-[38px] font-extrabold leading-none num-hero"
                      style={{ background: 'linear-gradient(135deg, #5b21b6, #7c3aed, #9333ea)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.6, delay: 0.2 }}
                      data-testid="text-total-balance"
                    >
                      {showBalance ? `$${formatNumber(walletGoldValue)}` : hiddenValue}
                    </motion.p>
                    <div className="flex items-center gap-2 mt-2.5">
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-full" style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.20)' }}>
                        <TrendingUp className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-700 text-[11px] font-bold">{formatNumber(totals.walletGoldGrams || 0, 2)}g</span>
                      </div>
                      <span className="text-gray-400 text-[11px] font-medium">available in wallet</span>
                    </div>
                  </div>

                  {/* Right: Gold ARC gauge — wallet grams only (matches balance shown) */}
                  {(() => {
                    const arcGrams = totals.walletGoldGrams || 0;
                    const maxGrams = 500;
                    const clampedGrams = Math.min(arcGrams, maxGrams);
                    const pct = maxGrams > 0 ? clampedGrams / maxGrams : 0;
                    const r = 54;
                    const cx = 76;
                    const cy = 62;
                    const circumference = Math.PI * r;
                    const filled = pct * circumference;
                    const startX = cx - r;
                    const startY = cy;
                    const endX = cx + r;
                    const endY = cy;
                    const arcD = `M ${startX} ${startY} A ${r} ${r} 0 0 1 ${endX} ${endY}`;
                    return (
                      <div className="flex-shrink-0 ml-4 flex flex-col items-center">
                        <svg width="152" height="76" viewBox="0 0 152 76" fill="none">
                          <defs>
                            <linearGradient id="goldArc" x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor="#B8860B" />
                              <stop offset="50%" stopColor="#D4AF37" />
                              <stop offset="100%" stopColor="#F59E0B" />
                            </linearGradient>
                          </defs>
                          {/* Track — purple tint, visible on light card */}
                          <path
                            d={arcD}
                            stroke="rgba(124,58,237,0.12)"
                            strokeWidth="10"
                            strokeLinecap="round"
                            fill="none"
                          />
                          {/* Filled arc */}
                          {pct > 0 && (
                            <path
                              d={arcD}
                              stroke="url(#goldArc)"
                              strokeWidth="10"
                              strokeLinecap="round"
                              strokeDasharray={`${circumference}`}
                              strokeDashoffset={circumference - filled}
                              fill="none"
                            />
                          )}
                          {/* Grams label — dark amber on light card */}
                          <text x={cx} y={cy - 6} textAnchor="middle" fontSize="15" fontWeight="800" fill="#92400e">
                            {showBalance ? `${formatNumber(arcGrams, 2)}g` : '••••'}
                          </text>
                          <text x={cx} y={cy + 10} textAnchor="middle" fontSize="9.5" fill="#9ca3af">
                            Total Gold
                          </text>
                        </svg>
                        <div className="flex items-center gap-1 mt-1">
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-bold tracking-wider" style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(180,130,20,0.30)', color: '#92400e' }}>
                            🥇 GOLD
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="flex gap-3 mt-6">
                  <button onClick={() => setActiveModal('deposit')} className="flex-1 flex items-center justify-center gap-2 text-white py-3 px-4 rounded-2xl text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98]" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #9333ea 50%, #a855f7 100%)', boxShadow: '0 4px 20px rgba(124,58,237,0.30), 0 1px 0 rgba(255,255,255,0.15) inset' }} data-testid="button-add-funds">
                    <Plus className="w-4 h-4" />
                    Add Funds
                  </button>
                  <button onClick={() => setShowTransferModal(true)} className="flex-1 flex items-center justify-center gap-2 text-purple-700 py-3 px-4 rounded-2xl text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98]" style={{ background: 'rgba(124,58,237,0.08)', border: '1.5px solid rgba(124,58,237,0.22)', backdropFilter: 'blur(12px)' }} data-testid="button-int-transfer">
                    <Send className="w-4 h-4" />
                    Int. Transfer
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Pending Actions Strip — fully removed from DOM when count is zero */}
            <AnimatePresence mode="popLayout">
              {pendingTotal > 0 && (
                <motion.div
                  key="pending-strip"
                  variants={itemVariants}
                  layout
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  style={{ overflow: 'hidden' }}
                >
                  <PendingItemsStrip />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Gold Wallet Conversion Card */}
            <motion.div variants={itemVariants} layout {...cardHoverProps} className="glass-panel card-3d-subtle rounded-[20px] p-6">
              {/* Header row */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-[13px] text-gray-700 font-bold">Gold Wallet</span>
                  <span className="text-[12px] text-gray-400 font-medium ml-1.5">Conversion</span>
                </div>
                {/* Currency ↔ Weight toggle */}
                <div className="flex items-center bg-gray-100 rounded-xl p-0.5 gap-0.5">
                  <button
                    onClick={() => setWalletView('currency')}
                    className={`px-2.5 py-1 rounded-[10px] text-[12px] font-bold transition-all ${walletView === 'currency' ? 'bg-white shadow text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}
                    data-testid="toggle-wallet-currency"
                  >
                    $ Currency
                  </button>
                  <button
                    onClick={() => setWalletView('weight')}
                    className={`px-2.5 py-1 rounded-[10px] text-[12px] font-bold transition-all ${walletView === 'weight' ? 'bg-white shadow text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}
                    data-testid="toggle-wallet-weight"
                  >
                    ⚖ Weight
                  </button>
                </div>
              </div>

              {walletView === 'currency' ? (
                /* ── Currency mode ── */
                <div className="grid grid-cols-3 gap-3">
                  <motion.div whileHover={{ y: -3 }} className="rounded-2xl p-3.5 relative border border-blue-100/60 hover:shadow-lg transition-all cursor-default overflow-hidden" style={{ background: 'linear-gradient(135deg, #eff6ff, #dbeafe)' }} data-testid="wallet-usd">
                    <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-blue-400/10 blur-xl" />
                    <div className="relative z-10">
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-[11px]">🇺🇸</span>
                        <span className="text-[11px] font-bold text-blue-700">USD</span>
                      </div>
                      <p className="text-[15px] font-extrabold text-blue-900 num-metric">{showBalance ? `$${formatNumber(walletGoldValue)}` : '••••'}</p>
                      <Badge className="mt-2 bg-blue-200/50 text-blue-700 border-0 text-[11px] px-1.5 py-0 font-bold">Active</Badge>
                    </div>
                  </motion.div>
                  <motion.div whileHover={{ y: -3 }} className="rounded-2xl p-3.5 relative border border-amber-100/60 hover:shadow-lg transition-all cursor-default overflow-hidden" style={{ background: 'linear-gradient(135deg, #fffbeb, #fef3c7)' }} data-testid="wallet-aed">
                    <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-amber-400/10 blur-xl" />
                    <div className="relative z-10">
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-[11px]">🇦🇪</span>
                        <span className="text-[11px] font-bold text-amber-700">AED</span>
                      </div>
                      <p className="text-[15px] font-extrabold text-amber-900 num-metric flex items-center gap-[3px]">
                        <DirhamSymbol size="0.95em" />
                        {showBalance ? formatNumber(walletGoldValue * 3.67) : '••••'}
                      </p>
                      <Badge className="mt-2 bg-amber-200/50 text-amber-700 border-0 text-[11px] px-1.5 py-0 font-bold">Active</Badge>
                    </div>
                  </motion.div>
                  <motion.div whileHover={{ y: -3 }} className="rounded-2xl p-3.5 relative border border-indigo-100/60 hover:shadow-lg transition-all cursor-default overflow-hidden" style={{ background: 'linear-gradient(135deg, #eef2ff, #e0e7ff)' }} data-testid="wallet-eur">
                    <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-indigo-400/10 blur-xl" />
                    <div className="relative z-10">
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-[11px]">🇪🇺</span>
                        <span className="text-[11px] font-bold text-indigo-700">EUR</span>
                      </div>
                      <p className="text-[15px] font-extrabold text-indigo-900 num-metric">€{showBalance ? formatNumber(walletGoldValue * 0.92) : '••••'}</p>
                      <Badge className="mt-2 bg-indigo-200/50 text-indigo-700 border-0 text-[11px] px-1.5 py-0 font-bold">Active</Badge>
                    </div>
                  </motion.div>
                </div>
              ) : (
                /* ── Weight mode ── */
                <>
                  {/* Unit sub-toggle */}
                  <div className="flex items-center gap-1.5 mb-3">
                    <span className="text-[12px] text-gray-400 font-medium mr-0.5">Unit:</span>
                    {(['g', 'oz', 'kg'] as const).map(unit => (
                      <button
                        key={unit}
                        onClick={() => setWeightUnit(unit)}
                        className={`px-2.5 py-1 rounded-lg text-[12px] font-bold transition-all border ${weightUnit === unit ? 'bg-amber-500 text-white border-amber-500' : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-amber-300'}`}
                        data-testid={`toggle-unit-${unit}`}
                      >
                        {unit === 'g' ? 'Gram' : unit === 'oz' ? 'Ounce' : 'Kilogram'}
                      </button>
                    ))}
                  </div>
                  {/* Weight tiles */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Wallet Gold', icon: '🥇', color: { bg: 'linear-gradient(135deg, #fef9c3, #fef08a)', border: 'border-yellow-200/60', text: 'text-yellow-800', sub: 'text-yellow-700' } },
                      { label: 'FinaCard', icon: '💳', color: { bg: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', border: 'border-emerald-100/60', text: 'text-emerald-900', sub: 'text-emerald-700' } },
                      { label: 'Total', icon: '📊', color: { bg: 'linear-gradient(135deg, #eef2ff, #e0e7ff)', border: 'border-indigo-100/60', text: 'text-indigo-900', sub: 'text-indigo-700' } },
                    ].map(({ label, icon, color }) => {
                      const grams = label === 'Wallet Gold' ? (totals.walletGoldGrams || 0)
                        : label === 'FinaCard' ? (totals.finacardGoldGrams || 0)
                        : (totals.walletGoldGrams || 0) + (totals.finacardGoldGrams || 0);
                      const converted = weightUnit === 'g' ? grams
                        : weightUnit === 'oz' ? grams / 31.1035
                        : grams / 1000;
                      const suffix = weightUnit;
                      return (
                        <motion.div key={label} whileHover={{ y: -3 }} className={`rounded-2xl p-3.5 relative border ${color.border} hover:shadow-lg transition-all cursor-default overflow-hidden`} style={{ background: color.bg }}>
                          <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full opacity-20 blur-xl bg-yellow-400" />
                          <div className="relative z-10">
                            <div className="flex items-center gap-1 mb-2">
                              <span className="text-[11px]">{icon}</span>
                              <span className={`text-[12px] font-bold ${color.sub}`}>{label}</span>
                            </div>
                            <p className={`text-[14px] font-extrabold ${color.text} leading-tight`}>
                              {showBalance ? `${formatNumber(converted, weightUnit === 'kg' ? 4 : 3)}` : '••••'}
                            </p>
                            <p className={`text-[11px] font-bold ${color.sub} mt-0.5`}>{suffix}</p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </>
              )}
            </motion.div>

          </motion.div>

          {/* ═══ CENTRE COLUMN — Gold Price Lock ═══ */}
          <motion.div layout className="col-span-12 xl:col-span-4 flex flex-col gap-5 self-start">

            {/* Gold Price Lock Status */}
            <motion.div variants={itemVariants} layout {...cardHoverProps} className="glass-panel rounded-[20px] p-6" data-testid="card-price-lock-status">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-100 to-purple-50 flex items-center justify-center">
                  <Lock className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-[13px] font-bold text-gray-900">Gold Price Lock</h3>
                  <p className="text-[12px] text-gray-400">Protect your buying rate</p>
                </div>
              </div>
              <AnimatePresence mode="wait">
                {activeFpgwLocks.length > 0 ? (
                  <motion.div
                    key="active-locks"
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                    className="space-y-1.5 mb-3"
                  >
                    {activeFpgwLocks.map((lock) => (
                      <div key={lock.id} className="flex items-center justify-between p-3 rounded-xl bg-purple-50 border border-purple-100">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-purple-500" />
                          <div>
                            <span className="text-[11px] font-bold text-purple-800">{lock.goldGrams.toFixed(4)} g</span>
                            <span className="text-[12px] text-purple-600 ml-1">@ ${lock.lockedPriceUsd.toFixed(2)}/g</span>
                          </div>
                        </div>
                        <span className="text-[11px] font-bold text-purple-700">${lock.lockedValueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    ))}
                  </motion.div>
                ) : (
                  <motion.div
                    key="no-lock"
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                    className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100 mb-3"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-gray-300" />
                      <span className="text-[11px] text-gray-500 font-medium">No active lock</span>
                    </div>
                    <span className="text-[12px] text-gray-400">Lock price for 24–72h</span>
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="flex items-center justify-between text-[12px] text-gray-500 mb-3 font-medium">
                <span>Current rate</span>
                <span className="font-bold text-gray-800 num-metric">${formatNumber(goldPrice, 2)}/g</span>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveModal('lock')}
                className="w-full py-2.5 rounded-xl text-[12px] font-bold text-white transition-all"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
                data-testid="button-lock-price-card"
              >
                Lock Gold Price →
              </motion.button>
            </motion.div>

            {/* ── Deposit Gold for Sale Card ── */}
            <motion.div variants={itemVariants} layout {...cardHoverProps} className="glass-panel rounded-[20px] p-6 relative overflow-hidden" data-testid="card-deposit-gold-sale">
              {/* Subtle gold mesh accent */}
              <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 80% 10%, rgba(251,191,36,0.10) 0%, transparent 65%)' }} />
              <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-[20px]" style={{ background: 'linear-gradient(90deg, #d97706, #f59e0b, #fbbf24)' }} />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)' }}>
                      <Vault className="w-4 h-4 text-amber-700" />
                    </div>
                    <div>
                      <h3 className="text-[13px] font-bold text-gray-900">Deposit Physical Gold</h3>
                      <p className="text-[12px] text-gray-400">Submit physical gold to vault</p>
                    </div>
                  </div>
                  <Link href="/physical-gold-deposit">
                    <button className="text-[11px] font-semibold text-amber-700 hover:text-amber-900 px-2.5 py-1 rounded-lg hover:bg-amber-50 border border-amber-200/60 transition-all" data-testid="link-deposit-gold-view-all">
                      View all
                    </button>
                  </Link>
                </div>

                {/* Live spot price + vault balance */}
                <div className="grid grid-cols-2 gap-2.5 mb-4">
                  <div className="rounded-xl px-3 py-2.5" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.20)' }}>
                    <p className="label-caps text-amber-700/70">Spot Price</p>
                    <p className="text-[15px] font-extrabold text-amber-900 num-metric mt-0.5">${formatNumber(goldPrice, 2)}<span className="text-[11px] font-semibold text-amber-600">/g</span></p>
                  </div>
                  <div className="rounded-xl px-3 py-2.5" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.20)' }}>
                    <p className="label-caps text-amber-700/70">Gold Vault Balance</p>
                    <p className="text-[15px] font-extrabold text-amber-900 num-metric mt-0.5">{formatNumber(totals.vaultGoldGrams || 0, 3)}<span className="text-[11px] font-semibold text-amber-600">g</span></p>
                  </div>
                </div>

                {/* Description */}
                <p className="text-[12px] text-gray-500 mb-4 leading-relaxed">
                  Deposit physical gold bars, coins, or raw gold into our secure vault. Receive digital gold credits upon verification.
                </p>

                {/* Primary CTA */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setDepositGoldModalOpen(true)}
                  className="w-full py-2.5 rounded-xl text-[12px] font-bold text-white transition-all"
                  style={{ background: 'linear-gradient(135deg, #d97706, #f59e0b)', boxShadow: '0 4px 16px rgba(217,119,6,0.25)' }}
                  data-testid="button-deposit-gold-card"
                >
                  Deposit Gold →
                </motion.button>
              </div>
            </motion.div>

          </motion.div>

          {/* ═══ RIGHT COLUMN — FinaCard + Referral ═══ */}
          <motion.div layout className="col-span-12 xl:col-span-3 flex flex-col gap-5 self-start">

            {/* FinaCard — Premium dark card with holographic effect */}
            <Link href="/finacard">
              <motion.div
                variants={itemVariants}
                layout
                whileHover={{ scale: 1.02, y: -5, transition: { type: 'spring', stiffness: 400, damping: 22 } }}
                whileTap={{ scale: 0.98, transition: { duration: 0.12 } }}
                className="glass-panel-dark relative w-full aspect-[1.586/1] rounded-[20px] overflow-hidden cursor-pointer"
                data-testid="card-dashboard-finacard"
              >
                <div className="absolute inset-0 holo-shimmer" />
                <div className="absolute inset-0 bg-gradient-to-tr from-purple-900/20 via-transparent to-amber-900/10" />
                <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-purple-600/10 blur-3xl" />
                <div className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full bg-amber-400/8 blur-2xl" />
                <div className="relative z-10 p-6 h-full flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2.5">
                      <img src={finatradesLogo} alt="Finatrades" className="h-10 brightness-0 invert" />
                    </div>
                    <div className="flex items-center gap-1.5 bg-white/8 rounded-full px-3 py-1 border border-white/8">
                      <CreditCard className="w-3 h-3 text-white/60" />
                      <span className="text-white/60 text-[12px] font-bold">GOLD CARD</span>
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
                        <p className="text-[11px] uppercase font-bold text-white/30 tracking-widest mb-0.5">Card Holder</p>
                        <p className="text-white/90 text-xs font-bold uppercase tracking-wide">
                          {user?.firstName || ''} {user?.lastName || ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] uppercase font-bold text-white/30 tracking-widest mb-0.5">Balance</p>
                        <p className="text-white/90 text-sm font-extrabold">
                          {showBalance ? `${formatNumber(totals.finacardGoldGrams || 0, 3)}g` : '•••••'}
                        </p>
                        <p className="text-white/30 text-[11px] font-medium">
                          {showBalance ? `≈ $${formatNumber(finacardValue)}` : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </Link>

            {/* Referral Card */}
            <motion.div variants={itemVariants} layout {...cardHoverProps} className="relative rounded-[20px] p-6 overflow-hidden glass-panel card-3d-subtle" data-testid="card-referral">
              <div className="absolute inset-0 mesh-indigo pointer-events-none" />
              <div className="absolute top-0 right-0 w-28 h-28 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.10), transparent)', transform: 'translate(30%, -30%)' }} />
              <div className="absolute bottom-0 left-0 w-20 h-20 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.08), transparent)', transform: 'translate(-20%, 25%)' }} />
              {/* Top accent */}
              <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-[20px]" style={{ background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #a855f7)' }} />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))', border: '1px solid rgba(99,102,241,0.20)' }}>
                      <Gift className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-[12px] font-bold text-gray-800">Refer & Earn</p>
                      <p className="text-[11px] text-gray-400 font-medium">Invite friends, earn rewards</p>
                    </div>
                  </div>
                  <Link href="/referrals">
                    <button className="text-[12px] text-indigo-600 hover:text-indigo-800 transition-colors font-bold flex items-center gap-0.5" data-testid="link-referral-full">
                      View all <ChevronRight className="w-3 h-3" />
                    </button>
                  </Link>
                </div>
                {referralData?.referralCode ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0 rounded-xl px-3 py-2.5" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.14)' }}>
                        <p className="text-[11px] text-gray-400 font-medium mb-0.5">Your referral code</p>
                        <p className="text-[13px] font-extrabold text-indigo-800 tracking-widest truncate" data-testid="text-referral-code">{referralData.referralCode}</p>
                      </div>
                      <button
                        onClick={async () => {
                          const link = `${window.location.origin}/register?ref=${referralData.referralCode}`;
                          await navigator.clipboard.writeText(link);
                          setCopiedRef(true);
                          setTimeout(() => setCopiedRef(false), 2000);
                        }}
                        className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors shrink-0"
                        style={{ background: 'rgba(99,102,241,0.09)', border: '1px solid rgba(99,102,241,0.18)' }}
                        data-testid="button-copy-referral"
                      >
                        {copiedRef ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-indigo-500" />}
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1 rounded-xl px-3 py-2.5 text-center" style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.10)' }}>
                        <div className="flex items-center gap-1 mb-0.5 justify-center">
                          <Users className="w-3 h-3 text-indigo-500" />
                          <p className="text-[11px] text-gray-400 font-medium">Referred</p>
                        </div>
                        <p className="text-[16px] font-extrabold text-indigo-800">{referralData.stats?.totalReferrals ?? 0}</p>
                      </div>
                      <div className="flex-1 rounded-xl px-3 py-2.5 text-center" style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.12)' }}>
                        <div className="flex items-center gap-1 mb-0.5 justify-center">
                          <TrendingUp className="w-3 h-3 text-emerald-600" />
                          <p className="text-[11px] text-gray-400 font-medium">Earned</p>
                        </div>
                        <p className="text-[16px] font-extrabold text-emerald-700">${formatNumber(referralData.stats?.totalBonusEarned ?? 0)}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-2">
                    <p className="text-[11px] text-gray-400">No referral code yet</p>
                    <Link href="/referrals">
                      <button className="mt-2 px-4 py-1.5 rounded-xl text-white text-[11px] font-bold transition-colors" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                        Get your code
                      </button>
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>

          </motion.div>
        </div>

        {/* ═══ ZONE 2 — BUSINESS MODULES (business users only) ═══ */}
        {isBusinessUser && (
          <motion.section variants={itemVariants}>
            {/* Section label */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-blue-600/10 border border-blue-200 flex items-center justify-center">
                  <Landmark className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <span className="text-[12px] font-bold text-gray-500 uppercase tracking-widest">Business Modules</span>
              </div>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            {/* Cards row — BNSL (left) + FinaBridge Quick Trade (right) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">

              {/* ── BNSL card — Quick Join or Yield Summary ── */}
              {totals.activeBnslPlans === 0 ? (
                <motion.div variants={itemVariants} layout {...cardHoverProps} className="relative rounded-[20px] p-6 overflow-hidden h-full glass-panel card-3d-subtle" data-testid="card-quick-bnsl">
                  <div className="absolute inset-0 mesh-teal pointer-events-none" />
                  <div className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(13,148,136,0.12), transparent)', transform: 'translate(30%, -30%)' }} />
                  <div className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.09), transparent)', transform: 'translate(0,0)' }} />
                  {/* Top accent */}
                  <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-[20px]" style={{ background: 'linear-gradient(90deg, #0d9488, #10b981, #D4AF37)' }} />
                  <div className="relative z-10 h-full flex flex-col">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(13,148,136,0.14), rgba(16,185,129,0.08))', border: '1px solid rgba(13,148,136,0.22)' }}>
                            <Zap className="w-3.5 h-3.5 text-teal-600" />
                          </div>
                          <p className="text-[13px] font-extrabold text-gray-800">Gold Yield Plan</p>
                        </div>
                        <p className="text-[12px] text-gray-500 font-medium">Earn passive income on your gold</p>
                      </div>
                      <div className="px-2.5 py-1 rounded-full" style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.28)' }}>
                        <span className="text-[11px] font-extrabold text-amber-700">Up to 8%</span>
                      </div>
                    </div>
                    <div className="space-y-1.5 mb-4 flex-1">
                      {[
                        { icon: '✦', text: 'Earn margin yield on locked gold' },
                        { icon: '✦', text: 'Fixed rate for plan duration' },
                        { icon: '✦', text: 'Flexible 3 – 12 month terms' },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-teal-500 text-[12px]">{item.icon}</span>
                          <span className="text-[11px] text-gray-600 font-medium">{item.text}</span>
                        </div>
                      ))}
                    </div>
                    {bnslPlans.length > 0 ? (
                      <Link href="/bnsl">
                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full py-2.5 rounded-xl text-[12px] font-bold text-teal-800 bg-white hover:bg-amber-50 transition-colors flex items-center justify-center gap-1.5" data-testid="button-quick-join-bnsl">
                          Manage My Plans <ChevronRight className="w-3.5 h-3.5" />
                        </motion.button>
                      </Link>
                    ) : (
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setShowBnslModal(true)} className="w-full py-2.5 rounded-xl text-[12px] font-bold text-teal-800 bg-white hover:bg-amber-50 transition-colors flex items-center justify-center gap-1.5" data-testid="button-quick-join-bnsl">
                        Join Plan Now <ChevronRight className="w-3.5 h-3.5" />
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              ) : (
                <Link href="/bnsl">
                  <motion.div variants={itemVariants} layout {...cardHoverProps} className="relative rounded-[20px] p-6 overflow-hidden cursor-pointer group h-full glass-panel card-3d-subtle" data-testid="card-bnsl-summary">
                    <div className="absolute inset-0 mesh-teal pointer-events-none" />
                    <div className="absolute top-0 right-0 w-28 h-28 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(13,148,136,0.12), transparent)', transform: 'translate(30%, -30%)' }} />
                    {/* Top accent */}
                    <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-[20px]" style={{ background: 'linear-gradient(90deg, #0d9488, #10b981, #D4AF37)' }} />
                    <div className="relative z-10 h-full flex flex-col">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[12px] text-teal-800 font-bold tracking-wide">BNSL Yield Plans</span>
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full" style={{ background: 'rgba(13,148,136,0.10)', border: '1px solid rgba(13,148,136,0.20)' }}>
                          <Zap className="w-3 h-3 text-teal-600" />
                          <span className="text-[12px] font-bold text-teal-700">{totals.activeBnslPlans || 0} Active</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mb-4">
                        <div className="relative flex-shrink-0 flex flex-col items-center">
                          <svg width="76" height="44" viewBox="0 0 76 44">
                            <path d="M 6 40 A 32 32 0 0 1 70 40" fill="none" stroke="rgba(13,148,136,0.30)" strokeWidth="7" strokeLinecap="round" />
                            <path d="M 6 40 A 32 32 0 0 1 70 40" fill="none" stroke="#D4AF37" strokeWidth="7" strokeLinecap="round"
                              strokeDasharray={`${bnslArcDash} ${ARC_LEN}`}
                              strokeDashoffset="0"
                            />
                          </svg>
                          <div className="absolute top-[18px] left-0 right-0 flex flex-col items-center">
                            <span className="text-[13px] font-extrabold text-teal-800 leading-none">{Math.round(bnslPlanProgress)}%</span>
                            <span className="text-[11px] text-gray-400 font-medium leading-none mt-0.5">complete</span>
                          </div>
                        </div>
                        <div className="flex-1 grid grid-cols-2 gap-x-3 gap-y-2">
                          <div>
                            <span className="label-caps">Locked Gold</span>
                            <p className="text-[15px] font-extrabold text-gray-800 leading-tight num-metric mt-0.5">{formatNumber(totals.bnslLockedGrams || 0, 3)}g</p>
                          </div>
                          <div>
                            <span className="label-caps">Total Earned</span>
                            <p className="text-[15px] font-extrabold text-amber-700 leading-tight num-metric mt-0.5">${formatNumber(totals.bnslTotalProfit || 0)}</p>
                          </div>
                          <div>
                            <span className="label-caps">Yield Rate</span>
                            <p className="text-[13px] font-bold text-emerald-700 leading-tight num-metric mt-0.5">
                              {firstActivePlan ? parseFloat(firstActivePlan.agreedMarginAnnualPercent || '0').toFixed(1) : '0'}% p.a.
                            </p>
                          </div>
                          <div>
                            <span className="label-caps">Next Payout</span>
                            <p className="text-[13px] font-bold text-gray-800 leading-tight num-metric mt-0.5">{bnslDaysToNextPayout}d</p>
                          </div>
                        </div>
                      </div>
                      <div className="mb-3 flex-1">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[12px] text-gray-500 font-medium">Q{bnslCurrentQuarter} Payout Progress</span>
                          <span className="text-[12px] text-amber-700 font-bold">${formatNumber(bnslQuarterlyPayout)} due</span>
                        </div>
                        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(13,148,136,0.12)' }}>
                          <motion.div
                            className="h-full rounded-full"
                            style={{ background: 'linear-gradient(90deg, #0d9488, #D4AF37)' }}
                            initial={{ width: 0 }}
                            animate={{ width: `${bnslQuarterProgress}%` }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                          />
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1">{bnslDaysIntoQuarter} / 90 days into this quarter</p>
                      </div>
                      <div className="flex items-center gap-1.5 text-teal-600 group-hover:text-teal-800 transition-colors">
                        <span className="text-[11px] font-semibold">View plans</span>
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </motion.div>
                </Link>
              )}

              {/* ── FinaBridge Quick Trade Card ── */}
              <motion.div variants={itemVariants} layout {...cardHoverProps} data-testid="card-quick-trade" className="h-full">
                <div className="relative rounded-[20px] p-5 overflow-hidden h-full glass-panel card-3d-subtle">
                  <div className="absolute inset-0 mesh-indigo pointer-events-none" />
                  <div className="absolute top-0 right-0 w-28 h-28 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.10), transparent)', transform: 'translate(30%, -30%)' }} />
                  {/* Top accent */}
                  <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-[20px]" style={{ background: 'linear-gradient(90deg, #3b82f6, #6366f1, #8b5cf6)' }} />
                  <div className="relative z-10 h-full flex flex-col">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(99,102,241,0.08))', border: '1px solid rgba(59,130,246,0.20)' }}>
                          <ArrowLeftRight className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-gray-800 font-extrabold text-[14px] leading-tight">Trade Finance</h3>
                          <p className="text-blue-500 text-[12px] font-medium">FinaBridge Platform</p>
                        </div>
                      </div>
                      {finaBridge.activeCases > 0 && (
                        <div className="text-right">
                          <span className="text-[22px] font-extrabold text-blue-700 leading-none">{finaBridge.activeCases}</span>
                          <p className="text-[12px] text-gray-400 leading-tight">active trades</p>
                        </div>
                      )}
                    </div>
                    {finaBridge.activeCases === 0 ? (
                      <ul className="space-y-1.5 mb-4 flex-1">
                        {[
                          'Settle international trades in physical gold',
                          'Global buyer-seller matching network',
                          'Secure gold escrow & deal room',
                        ].map(txt => (
                          <li key={txt} className="flex items-center gap-2 text-[11px] text-gray-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                            {txt}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 mb-4 flex-1">
                        <div className="rounded-lg px-2.5 py-2" style={{ background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.12)' }}>
                          <p className="text-[12px] text-gray-400 font-medium">Volume</p>
                          <p className="text-[14px] font-extrabold text-blue-800">${formatNumber(finaBridge.tradeVolume)}</p>
                        </div>
                        <div className="rounded-lg px-2.5 py-2" style={{ background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.12)' }}>
                          <p className="text-[12px] text-gray-400 font-medium">Gold Locked</p>
                          <p className="text-[14px] font-extrabold text-blue-800">{formatNumber(finaBridge.goldGrams)}g</p>
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2 mt-auto">
                      {finaBridge.activeCases === 0 ? (
                        <button
                          onClick={() => setShowTradeModal(true)}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-[12px] font-bold text-white transition-all hover:scale-[1.02] active:scale-95"
                          style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)', boxShadow: '0 3px 14px rgba(59,130,246,0.28)' }}
                          data-testid="button-quick-trade-create"
                        >
                          <Landmark className="w-3.5 h-3.5" />
                          Create Trade
                        </button>
                      ) : (
                        <Link href="/finabridge" className="flex-1">
                          <button
                            className="w-full flex items-center justify-center gap-1.5 rounded-xl py-2 text-[12px] font-bold text-white transition-all hover:scale-[1.02] active:scale-95"
                            style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)', boxShadow: '0 3px 14px rgba(59,130,246,0.28)' }}
                            data-testid="button-quick-trade-view"
                          >
                            <ArrowLeftRight className="w-3.5 h-3.5" />
                            View My Trades
                          </button>
                        </Link>
                      )}
                      <Link href="/finabridge">
                        <button
                          className="flex items-center justify-center gap-1 rounded-xl px-3 py-2 text-[11px] font-semibold text-blue-600 transition-all hover:scale-[1.02]"
                          style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.18)' }}
                          data-testid="button-quick-trade-manage"
                        >
                          Manage
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
              </motion.div>

            </div>

            {/* FinaBridge Trade Stats — full-width below, only when active trades */}
            {finaBridge && (finaBridge.activeCases > 0 || finaBridge.tradeVolume > 0) && (
              <Link href="/finabridge">
                <motion.div variants={itemVariants} className="relative rounded-[20px] p-5 overflow-hidden cursor-pointer group" style={{ background: 'linear-gradient(135deg, #1e40af, #3b82f6, #60a5fa)' }} data-testid="card-finabridge-summary">
                  <div className="absolute inset-0 holo-shimmer" />
                  <div className="relative z-10 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[12px] text-white/80 font-semibold tracking-wide">FinaBridge</span>
                        <Landmark className="w-4 h-4 text-white/60" />
                      </div>
                      <div className="flex items-center gap-8">
                        <div>
                          <span className="text-[12px] text-white/50 font-medium">Active Cases</span>
                          <p className="text-[24px] font-extrabold text-white leading-none">{finaBridge.activeCases}</p>
                        </div>
                        <div>
                          <span className="text-[12px] text-white/50 font-medium">Trade Volume</span>
                          <p className="text-[20px] font-extrabold text-white leading-none">${formatNumber(finaBridge.tradeVolume)}</p>
                        </div>
                        <div>
                          <span className="text-[12px] text-white/50 font-medium">Gold Escrowed</span>
                          <p className="text-[20px] font-extrabold text-white leading-none">{formatNumber(finaBridge.goldGrams)}g</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-white/60 group-hover:text-white transition-colors">
                      <span className="text-[12px] font-medium">View trades</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </motion.div>
              </Link>
            )}
          </motion.section>
        )}

        {/* ═══ WALLET BREAKDOWN CARDS (2-panel) ═══ */}
        {(() => {
          const mpgwAvail = totals.mpgwAvailableGrams || 0;
          const mpgwPend = totals.mpgwPendingGrams || 0;
          const mpgwReserved = totals.mpgwReservedTradeGrams || 0;
          const fpgwAvail = totals.fpgwAvailableGrams || 0;
          const fpgwPend = totals.fpgwPendingGrams || 0;
          const fpgwReserved = totals.fpgwReservedTradeGrams || 0;
          const fpgwAvgPrice = totals.fpgwWeightedAvgPriceUsd || 0;
          const bnslWallet = totals.bnslWalletGoldGrams || 0;
          const finabridgeGrams = finaBridge?.goldGrams || 0;
          const bnslLocked = totals.bnslLockedGrams || 0;
          const tradeSettled = (mpgwReserved || 0) + (fpgwReserved || 0);

          const allWalletZero = mpgwAvail === 0 && mpgwPend === 0 && mpgwReserved === 0 && fpgwAvail === 0 && fpgwPend === 0 && fpgwReserved === 0 && bnslWallet === 0 && finabridgeGrams === 0;
          const allLockedZero = bnslLocked === 0 && tradeSettled === 0;

          if (allWalletZero && allLockedZero) return null;

          const totalLockedGrams = bnslLocked + tradeSettled;

          const WALLET_ROWS = [
            {
              key: 'mpgw',
              label: 'FinaPay Live (MPGW)',
              color: '#7c3aed',
              bg: 'rgba(124,58,237,0.18)',
              grams: mpgwAvail,
              usd: mpgwAvail * goldPrice,
              sublabels: [
                mpgwPend > 0 ? `${formatNumber(mpgwPend, 4)}g pending` : null,
                mpgwReserved > 0 ? `${formatNumber(mpgwReserved, 4)}g reserved` : null,
              ].filter(Boolean) as string[],
              extra: null,
            },
            {
              key: 'fpgw',
              label: 'FinaPay Fixed / Hedged (FPGW)',
              color: '#f59e0b',
              bg: 'rgba(245,158,11,0.18)',
              grams: fpgwAvail,
              usd: fpgwAvail * goldPrice,
              sublabels: [
                fpgwPend > 0 ? `${formatNumber(fpgwPend, 4)}g pending` : null,
                fpgwReserved > 0 ? `${formatNumber(fpgwReserved, 4)}g reserved` : null,
              ].filter(Boolean) as string[],
              extra: fpgwAvgPrice > 0 ? `Avg $${formatNumber(fpgwAvgPrice, 2)}/g` : null,
            },
            {
              key: 'bnsl-wallet',
              label: 'BNSL Wallet',
              color: '#06b6d4',
              bg: 'rgba(6,182,212,0.18)',
              grams: bnslWallet,
              usd: bnslWallet * goldPrice,
              sublabels: [],
              extra: null,
            },
            {
              key: 'finabridge',
              label: 'Finabridge Wallet',
              color: '#22c55e',
              bg: 'rgba(34,197,94,0.18)',
              grams: finabridgeGrams,
              usd: finabridgeGrams * goldPrice,
              sublabels: [],
              extra: null,
            },
          ];

          const LOCKED_ROWS = [
            {
              key: 'bnsl-locked',
              label: 'BNSL Plan Locked',
              color: '#06b6d4',
              bg: 'rgba(6,182,212,0.18)',
              grams: bnslLocked,
              usd: bnslLocked * goldPrice,
            },
            {
              key: 'trade-settled',
              label: 'Trades Settled (Locked)',
              color: '#7c3aed',
              bg: 'rgba(124,58,237,0.18)',
              grams: tradeSettled,
              usd: tradeSettled * goldPrice,
            },
          ];

          return (
            <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gold Wallets card — concentric ring chart */}
              {!allWalletZero && (() => {
                const walletTotal = WALLET_ROWS.reduce((s, r) => s + r.grams, 0);
                const wSize = 200;
                const wCx = wSize / 2;
                const wCy = wSize / 2;
                const wRingW = 8;
                const wGap = 8;
                const wInnerR = 30;
                const wRings = WALLET_ROWS.map((row, idx) => {
                  const r = wInnerR + idx * (wRingW + wGap);
                  const pct = walletTotal > 0 ? row.grams / walletTotal : 0;
                  const circ = 2 * Math.PI * r;
                  const filled = pct * circ;
                  return { ...row, r, pct, circ, filled, idx };
                });
                return (
                  <motion.div
                    variants={itemVariants}
                    layout
                    {...cardHoverProps}
                    className="glass-panel rounded-[20px] p-5"
                    data-testid="card-gold-wallets"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-[15px] font-bold text-gray-900">Gold Wallets</h3>
                        <p className="text-[11px] text-gray-400 mt-0.5">Breakdown across wallet types</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-extrabold text-gray-900">{showBalance ? `${formatNumber(walletTotal, 3)}g` : hiddenValue}</span>
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-100 to-purple-50 flex items-center justify-center">
                          <Vault className="w-4 h-4 text-purple-600" />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-center mb-4">
                      <svg width={wSize} height={wSize} viewBox={`0 0 ${wSize} ${wSize}`}>
                        {[...wRings].reverse().map((ring) => (
                          <g key={ring.key} transform={`rotate(-90 ${wCx} ${wCy})`}>
                            <circle cx={wCx} cy={wCy} r={ring.r} fill="none" stroke={ring.bg} strokeWidth={wRingW} />
                            {ring.pct > 0 && (
                              <circle
                                cx={wCx} cy={wCy} r={ring.r}
                                fill="none" stroke={ring.color} strokeWidth={wRingW} strokeLinecap="round"
                                strokeDasharray={`${ring.filled} ${ring.circ - ring.filled}`}
                                strokeDashoffset={0}
                                className="portfolio-ring"
                                style={{
                                  animationName: `wallet-ring-${ring.idx}`,
                                  animationDuration: '1s',
                                  animationTimingFunction: 'ease-out',
                                  animationDelay: `${0.3 + ring.idx * 0.12}s`,
                                  animationFillMode: 'backwards',
                                }}
                              />
                            )}
                          </g>
                        ))}
                        <circle cx={wCx} cy={wCy} r={wInnerR - 8} fill="white" />
                        <circle cx={wCx} cy={wCy} r={wInnerR - 8} fill="none" stroke="rgba(124,58,237,0.18)" strokeWidth={2} />
                        <text x={wCx} y={wCy - 4} textAnchor="middle" fill="#9ca3af" style={{ fontSize: 7, fontWeight: 600, letterSpacing: '0.06em' }}>TOTAL</text>
                        <text x={wCx} y={wCy + 8} textAnchor="middle" fill="#111827" style={{ fontSize: 11, fontWeight: 800 }}>
                          {showBalance ? `${formatNumber(walletTotal, 2)}g` : '••••'}
                        </text>
                      </svg>
                    </div>

                    <style>{`
                      ${wRings.map(r => `
                        @keyframes wallet-ring-${r.idx} {
                          from { stroke-dasharray: 0 ${r.circ}; }
                          to { stroke-dasharray: ${r.filled} ${r.circ - r.filled}; }
                        }
                      `).join('')}
                    `}</style>

                    <div className="space-y-3">
                      {WALLET_ROWS.map((row, idx) => {
                        const isZero = row.grams === 0 && row.usd === 0;
                        const pct = walletTotal > 0 ? (row.grams / walletTotal * 100) : 0;
                        return (
                          <div key={row.key} className="flex items-center gap-3 group" data-testid={`wallet-row-${row.key}`}>
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110" style={{ background: row.bg }}>
                              <div className="w-2.5 h-2.5 rounded-full" style={{ background: row.color }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[12px] font-semibold text-gray-700">{row.label}</span>
                                <span className="text-[12px] font-bold text-gray-900">
                                  {isZero ? '—' : showBalance ? `${formatNumber(row.grams, 4)}g` : '••••'}
                                </span>
                              </div>
                              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <motion.div
                                  className="h-full rounded-full"
                                  style={{ background: row.color }}
                                  initial={{ width: 0 }}
                                  animate={{ width: `${pct}%` }}
                                  transition={{ duration: 1.2, ease: 'easeOut', delay: 0.4 + idx * 0.1 }}
                                />
                              </div>
                              {row.sublabels.length > 0 && (
                                <p className="text-[12px] text-gray-400 mt-0.5">{row.sublabels.join(' · ')}</p>
                              )}
                              {row.extra && (
                                <p className="text-[12px] font-medium mt-0.5" style={{ color: row.color }}>{row.extra}</p>
                              )}
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
              })()}

              {/* Locked Positions card — concentric ring chart */}
              {!allLockedZero && (() => {
                const lockedTotal = totalLockedGrams;
                const lSize = 200;
                const lCx = lSize / 2;
                const lCy = lSize / 2;
                const lRingW = 10;
                const lGap = 12;
                const lInnerR = 38;
                const lRings = LOCKED_ROWS.map((row, idx) => {
                  const r = lInnerR + idx * (lRingW + lGap);
                  const pct = lockedTotal > 0 ? row.grams / lockedTotal : 0;
                  const circ = 2 * Math.PI * r;
                  const filled = pct * circ;
                  return { ...row, r, pct, circ, filled, idx };
                });
                return (
                  <motion.div
                    variants={itemVariants}
                    layout
                    {...cardHoverProps}
                    className="glass-panel rounded-[20px] p-5"
                    data-testid="card-locked-positions"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-[15px] font-bold text-gray-900">Locked Positions</h3>
                        <p className="text-[11px] text-gray-400 mt-0.5">Gold locked in plans &amp; escrow</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-extrabold text-gray-900">{showBalance ? `${formatNumber(lockedTotal, 3)}g` : hiddenValue}</span>
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-100 to-cyan-50 flex items-center justify-center">
                          <Lock className="w-4 h-4 text-cyan-600" />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-center mb-4">
                      <svg width={lSize} height={lSize} viewBox={`0 0 ${lSize} ${lSize}`}>
                        {[...lRings].reverse().map((ring) => (
                          <g key={ring.key} transform={`rotate(-90 ${lCx} ${lCy})`}>
                            <circle cx={lCx} cy={lCy} r={ring.r} fill="none" stroke={ring.bg} strokeWidth={lRingW} />
                            {ring.pct > 0 && (
                              <circle
                                cx={lCx} cy={lCy} r={ring.r}
                                fill="none" stroke={ring.color} strokeWidth={lRingW} strokeLinecap="round"
                                strokeDasharray={`${ring.filled} ${ring.circ - ring.filled}`}
                                strokeDashoffset={0}
                                className="portfolio-ring"
                                style={{
                                  animationName: `locked-ring-${ring.idx}`,
                                  animationDuration: '1s',
                                  animationTimingFunction: 'ease-out',
                                  animationDelay: `${0.3 + ring.idx * 0.12}s`,
                                  animationFillMode: 'backwards',
                                }}
                              />
                            )}
                          </g>
                        ))}
                        <circle cx={lCx} cy={lCy} r={lInnerR - 10} fill="white" />
                        <circle cx={lCx} cy={lCy} r={lInnerR - 10} fill="none" stroke="rgba(6,182,212,0.20)" strokeWidth={2} />
                        <text x={lCx} y={lCy - 4} textAnchor="middle" fill="#9ca3af" style={{ fontSize: 7, fontWeight: 600, letterSpacing: '0.06em' }}>LOCKED</text>
                        <text x={lCx} y={lCy + 8} textAnchor="middle" fill="#111827" style={{ fontSize: 11, fontWeight: 800 }}>
                          {showBalance ? `${formatNumber(lockedTotal, 2)}g` : '••••'}
                        </text>
                      </svg>
                    </div>

                    <style>{`
                      ${lRings.map(r => `
                        @keyframes locked-ring-${r.idx} {
                          from { stroke-dasharray: 0 ${r.circ}; }
                          to { stroke-dasharray: ${r.filled} ${r.circ - r.filled}; }
                        }
                      `).join('')}
                    `}</style>

                    <div className="space-y-3">
                      {LOCKED_ROWS.map((row, idx) => {
                        const isZero = row.grams === 0;
                        const pct = lockedTotal > 0 ? (row.grams / lockedTotal * 100) : 0;
                        return (
                          <div key={row.key} className="flex items-center gap-3 group" data-testid={`locked-row-${row.key}`}>
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110" style={{ background: row.bg }}>
                              <div className="w-2.5 h-2.5 rounded-full" style={{ background: row.color }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[12px] font-semibold text-gray-700">{row.label}</span>
                                <span className="text-[12px] font-bold text-gray-900">
                                  {isZero ? '—' : showBalance ? `${formatNumber(row.grams, 4)}g` : '••••'}
                                </span>
                              </div>
                              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <motion.div
                                  className="h-full rounded-full"
                                  style={{ background: row.color }}
                                  initial={{ width: 0 }}
                                  animate={{ width: `${pct}%` }}
                                  transition={{ duration: 1.2, ease: 'easeOut', delay: 0.4 + idx * 0.1 }}
                                />
                              </div>
                              {!isZero && (
                                <p className="text-[12px] text-gray-400 mt-0.5">
                                  {showBalance ? `$${formatNumber(row.usd)}` : ''}
                                </p>
                              )}
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
              })()}
            </motion.div>
          );
        })()}

        {/* ═══ GOLD PRICE TREND CHART (full-width) ═══ */}
        <motion.div variants={itemVariants} layout {...cardHoverProps} className="glass-panel rounded-[20px] p-5" data-testid="card-gold-price-chart">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[15px] font-bold text-gray-900">Gold Price Trend</h3>
              <p className="text-[11px] text-gray-400 mt-0.5">XAU/USD · Per gram</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                {(['7D', '30D', '90D'] as const).map(p => (
                  <button key={p} onClick={() => setChartPeriod(p)}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${chartPeriod === p ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                    {p}
                  </button>
                ))}
              </div>
              <div className="text-right">
                <p className="text-[15px] font-extrabold text-gray-900">${formatNumber(goldPrice, 2)}</p>
                <p className="text-[12px] text-gray-400">/gram now</p>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={goldPriceHistory} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} tickFormatter={(v) => `$${v.toFixed(0)}`} />
              <Tooltip
                contentStyle={{ background: 'rgba(255,255,255,0.95)', border: '1px solid #e5e7eb', borderRadius: '12px', fontSize: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
                formatter={(v: any) => [`$${Number(v).toFixed(2)}/g`, 'Gold Price']}
              />
              <ReferenceLine y={avgBuyPrice} stroke="#D4AF37" strokeDasharray="4 3" strokeWidth={1.5}
                label={{ value: `Avg Buy $${avgBuyPrice.toFixed(0)}`, position: 'insideTopRight', fontSize: 10, fill: '#D4AF37' }} />
              <Area type="monotone" dataKey="price" stroke="#7c3aed" strokeWidth={2} fill="url(#goldGradient)" dot={false} activeDot={{ r: 4, fill: '#7c3aed', strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-purple-600 rounded" />
              <span className="text-[11px] text-gray-500">Market Price</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-amber-400 rounded border-dashed" style={{ borderTop: '2px dashed #D4AF37', background: 'transparent' }} />
              <span className="text-[11px] text-gray-500">Your Avg Buy</span>
            </div>
            <div className="ml-auto flex items-center gap-1">
              {unrealizedGain >= 0
                ? <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                : <TrendingDown className="w-3.5 h-3.5 text-rose-500" />}
              <span className={`text-[11px] font-bold ${unrealizedGain >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {unrealizedGain >= 0 ? '+' : ''}{unrealizedGainPct.toFixed(2)}% vs avg buy
              </span>
            </div>
          </div>
        </motion.div>

        {/* ═══ RECENT TRANSACTIONS + CERTIFICATES (2-panel) ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Panel 1 — Recent Transactions */}
          <motion.div
            variants={itemVariants}
            layout
            {...cardHoverProps}
            className="glass-panel rounded-[20px] overflow-hidden cursor-default"
            data-testid="card-recent-activities"
          >
            <div className="flex items-center justify-between px-6 pt-5 pb-4">
              <h3 className="text-[15px] font-bold text-gray-900">Recent Transactions</h3>
              <Link href="/transactions">
                <span className="text-[12px] font-semibold text-purple-600 hover:text-purple-700 transition-colors cursor-pointer" data-testid="button-view-all-activities">View All</span>
              </Link>
            </div>

            <div className="px-4 pb-4 space-y-1">
              {filteredActivities.length > 0 ? filteredActivities.map((tx, i) => {
                const isPositive = tx.type === 'Buy' || tx.type === 'Receive' || tx.type === 'Deposit' || tx.type === 'Gold Credited' || tx.type === 'Refund' || tx.type === 'BNSL Payout' || tx.type === 'Trade Profit';
                const isNeutral = tx.type === 'Swap' || tx.type === 'Price Protection Activated' || tx.type === 'Price Protection Removed';
                const grams = tx.amountGold ? `${isPositive ? '+' : isNeutral ? '' : ''}${Number(tx.amountGold).toFixed(4)}g` : null;
                const usd = tx.amountUsd ? `$${Number(tx.amountUsd).toFixed(2)}` : null;
                const displayName = getTxDisplayName(tx);
                const statusColor = tx.status === 'Completed' || tx.status === 'completed'
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                  : tx.status === 'Pending' || tx.status === 'pending'
                  ? 'bg-amber-50 text-amber-600 border-amber-100'
                  : 'bg-rose-50 text-rose-600 border-rose-100';
                return (
                  <motion.div
                    key={tx.id}
                    className="flex items-center gap-3 px-2 py-3 rounded-xl hover:bg-purple-100/60 hover:shadow-sm transition-all duration-200 cursor-pointer group"
                    data-testid={`row-activity-${i}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.06 }}
                    onClick={() => setSelectedTransaction({
                      id: tx.id,
                      type: tx.type,
                      amountGrams: tx.amountGold ?? undefined,
                      amountUsd: tx.amountUsd ?? 0,
                      timestamp: tx.createdAt ?? '',
                      referenceId: tx.id,
                      status: tx.status,
                      description: tx.description,
                    })}
                  >
                    <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-purple-50 border border-purple-100 group-hover:scale-105 transition-transform">
                      {getActivityIcon(tx.type, tx.sourceModule)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-gray-800 truncate">{displayName}</p>
                      <p className="text-[11px] text-gray-400">
                        {tx.createdAt && isValid(new Date(tx.createdAt)) ? format(new Date(tx.createdAt), 'MMM dd, yyyy') : '-'}
                        {tx.sourceModule && <span className="ml-1.5 text-[10px] text-purple-400 font-medium uppercase">{tx.sourceModule}</span>}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      {grams && <p className={`text-[13px] font-bold ${isPositive ? 'text-purple-600' : isNeutral ? 'text-gray-600' : 'text-gray-800'}`}>{grams}</p>}
                      {usd && <p className="text-[11px] text-gray-400">{usd}</p>}
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[12px] font-bold border shrink-0 ${statusColor}`}>
                      {tx.status}
                    </span>
                  </motion.div>
                );
              }) : (
                <div className="py-10 text-center text-gray-400 text-[13px]">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
                      <Search className="w-5 h-5 text-gray-300" />
                    </div>
                    <span>No recent transactions found</span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Panel 2 — Certificates */}
          <motion.div
            variants={itemVariants}
            layout
            {...cardHoverProps}
            className="glass-panel rounded-[20px] overflow-hidden cursor-default"
            data-testid="card-certificates"
          >
            <div className="flex items-center justify-between px-6 pt-5 pb-4">
              <h3 className="text-[15px] font-bold text-gray-900">Certificates</h3>
              <Link href="/finavault">
                <span className="text-[12px] font-semibold text-purple-600 hover:text-purple-700 transition-colors cursor-pointer">View All</span>
              </Link>
            </div>
            <div className="px-4 pb-4 space-y-1">
              {recentCertsList.length > 0 ? recentCertsList.map((cert, i) => (
                  <motion.div
                    key={cert.id}
                    className="flex items-center gap-3 px-2 py-3 rounded-xl hover:bg-purple-100/60 hover:shadow-sm transition-all duration-200 cursor-pointer group"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    data-testid={`cert-row-${i}`}
                    onClick={() => setSelectedCert(cert)}
                  >
                    <div className="w-9 h-9 rounded-full bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Shield className="w-4 h-4 text-purple-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-gray-800 truncate">
                        {cert.type === 'DIGITAL_OWNERSHIP' || cert.type === 'Digital Ownership' ? 'Digital Ownership'
                          : cert.type === 'PHYSICAL_STORAGE' || cert.type === 'Physical Storage' ? 'Physical Storage'
                          : cert.type}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {cert.issuedAt && isValid(new Date(cert.issuedAt)) ? format(new Date(cert.issuedAt), 'MMM dd, yyyy') : '—'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[13px] font-bold text-gray-800">{Number(cert.goldGrams || 0).toFixed(2)}g</p>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[12px] font-bold border shrink-0 ${
                      cert.status === 'Active' || cert.status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                        : cert.status === 'Locked'
                        ? 'bg-amber-50 text-amber-600 border-amber-100'
                        : cert.status === 'Superseded'
                        ? 'bg-gray-100 text-gray-400 border-gray-200'
                        : 'bg-gray-100 text-gray-500 border-gray-200'
                    }`}>
                      {cert.status === 'Active' || cert.status === 'ACTIVE' ? 'Active' : cert.status}
                    </span>
                  </motion.div>
              )) : (
                <div className="py-10 text-center text-gray-400 text-[13px]">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-gray-300" />
                    </div>
                    <span>No certificates yet</span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

        </div>
      </motion.div>

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
