import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CreditCard, Shield, Globe, Zap, ArrowDownToLine, ArrowUpFromLine,
  Wallet, History, Sparkles, Check, RefreshCw, Clock, CheckCircle2,
  XCircle, Snowflake, ShoppingBag, Utensils, Plane, ShoppingCart,
  Film, Fuel, MoreHorizontal, Store, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface FinacardTransfer {
  id: string;
  userId: string;
  type: 'fund' | 'withdraw';
  goldGrams: string;
  goldPriceUsdPerGram: string | null;
  usdEquivalent: string | null;
  note: string | null;
  createdAt: string;
}

interface FinacardCardData {
  id: string;
  userId: string;
  cardType: string;
  cardStatus: 'applied' | 'under_review' | 'approved' | 'active' | 'frozen' | 'cancelled';
  last4Digits: string | null;
  expiryMonth: number | null;
  expiryYear: number | null;
  dailyLimitGrams: string;
  monthlyLimitGrams: string;
  isFrozen: boolean;
  frozenReason: string | null;
  adminNotes: string | null;
  appliedAt: string;
  reviewedAt: string | null;
  issuedAt: string | null;
  activatedAt: string | null;
  cancelledAt: string | null;
}

interface SpendingRecord {
  id: string;
  merchantName: string;
  merchantCategory: string | null;
  merchantCountry: string | null;
  amountLocal: string;
  currencyLocal: string;
  goldGramsDeducted: string;
  goldPriceAtTime: string;
  usdEquivalent: string;
  status: string;
  createdAt: string;
}

const MERCHANT_CATEGORIES = [
  { value: 'Groceries', label: 'Groceries', icon: ShoppingCart },
  { value: 'Dining', label: 'Dining', icon: Utensils },
  { value: 'Travel', label: 'Travel', icon: Plane },
  { value: 'Shopping', label: 'Shopping', icon: ShoppingBag },
  { value: 'Entertainment', label: 'Entertainment', icon: Film },
  { value: 'Gas', label: 'Gas', icon: Fuel },
  { value: 'Other', label: 'Other', icon: MoreHorizontal },
];

const CURRENCIES = [
  { value: 'USD', label: 'USD', symbol: '$' },
  { value: 'AED', label: 'AED', symbol: 'د.إ' },
  { value: 'EUR', label: 'EUR', symbol: '€' },
  { value: 'GBP', label: 'GBP', symbol: '£' },
];

function getCategoryIcon(category: string | null) {
  const found = MERCHANT_CATEGORIES.find(c => c.value === category);
  return found ? found.icon : Store;
}

export default function FinaCard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [fundAmount, setFundAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [showFundDialog, setShowFundDialog] = useState(false);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);

  const [merchantName, setMerchantName] = useState('');
  const [merchantCategory, setMerchantCategory] = useState('');
  const [spendAmount, setSpendAmount] = useState('');
  const [spendCurrency, setSpendCurrency] = useState('USD');

  const { data: goldPriceData } = useQuery({
    queryKey: ['/api/gold-price'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/gold-price');
      return res.json();
    },
    refetchInterval: 30000,
  });

  const goldPrice = goldPriceData?.pricePerGram || 0;

  const { data: balanceData, isLoading: balanceLoading } = useQuery({
    queryKey: ['/api/finacard/balance', user?.id],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/finacard/balance/${user?.id}`);
      return res.json();
    },
    enabled: !!user?.id,
    refetchInterval: 15000,
  });

  const { data: transfersData } = useQuery<{ transfers: FinacardTransfer[] }>({
    queryKey: ['/api/finacard/transfers', user?.id],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/finacard/transfers/${user?.id}`);
      return res.json();
    },
    enabled: !!user?.id,
  });

  const { data: cardData, isLoading: cardLoading } = useQuery<{ card: FinacardCardData | null; allCards: FinacardCardData[] }>({
    queryKey: ['/api/finacard/card', user?.id],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/finacard/card/${user?.id}`);
      return res.json();
    },
    enabled: !!user?.id,
  });

  const { data: spendingData } = useQuery<{ spending: SpendingRecord[] }>({
    queryKey: ['/api/finacard/spending', user?.id],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/finacard/spending/${user?.id}`);
      return res.json();
    },
    enabled: !!user?.id,
  });

  const activeCard = cardData?.card || null;

  const applyMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/finacard/apply', { cardType: 'virtual' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to apply for FinaCard');
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Application submitted successfully!');
      queryClient.invalidateQueries({ queryKey: ['/api/finacard/card'] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const activateMutation = useMutation({
    mutationFn: async (cardId: string) => {
      const res = await apiRequest('POST', '/api/finacard/activate', { cardId });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to activate card');
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Card activated successfully!');
      queryClient.invalidateQueries({ queryKey: ['/api/finacard/card'] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const fundMutation = useMutation({
    mutationFn: async (grams: number) => {
      const res = await apiRequest('POST', '/api/finacard/fund', { goldGrams: grams, goldPricePerGram: goldPrice });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to fund FinaCard');
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ['/api/finacard/balance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/finacard/transfers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wallet'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      setFundAmount('');
      setShowFundDialog(false);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: async (grams: number) => {
      const res = await apiRequest('POST', '/api/finacard/withdraw', { goldGrams: grams, goldPricePerGram: goldPrice });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to withdraw from FinaCard');
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ['/api/finacard/balance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/finacard/transfers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wallet'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      setWithdrawAmount('');
      setShowWithdrawDialog(false);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const spendMutation = useMutation({
    mutationFn: async (payload: { merchantName: string; merchantCategory: string; amountLocal: number; currencyLocal: string }) => {
      const res = await apiRequest('POST', '/api/finacard/spend', payload);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Spending transaction failed');
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Payment successful!');
      queryClient.invalidateQueries({ queryKey: ['/api/finacard/balance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/finacard/spending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/finacard/transfers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wallet'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      setMerchantName('');
      setMerchantCategory('');
      setSpendAmount('');
      setSpendCurrency('USD');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  if (!user) return null;

  const finacardGrams = parseFloat(balanceData?.finacardGoldGrams || '0');
  const walletGrams = parseFloat(balanceData?.walletGoldGrams || '0');
  const finacardUsd = finacardGrams * goldPrice;
  const transfers = transfersData?.transfers || [];
  const spendingHistory = spendingData?.spending || [];

  const fundAmountNum = parseFloat(fundAmount || '0');
  const withdrawAmountNum = parseFloat(withdrawAmount || '0');
  const spendAmountNum = parseFloat(spendAmount || '0');

  const fxRates: Record<string, number> = { USD: 1, AED: 0.2723, EUR: 1.08, GBP: 1.27 };
  const spendUsdEquiv = spendCurrency === 'USD' ? spendAmountNum : spendAmountNum * (fxRates[spendCurrency] || 1);
  const spendGoldPreview = goldPrice > 0 ? spendUsdEquiv / goldPrice : 0;

  const cardStatus = activeCard?.cardStatus;

  if (cardLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-5xl mx-auto flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600 dark:text-purple-400" />
        </div>
      </DashboardLayout>
    );
  }

  if (!activeCard || cardStatus === 'cancelled') {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto space-y-8 pb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Card className="p-8 md:p-12 bg-gradient-to-br from-zinc-900 via-purple-950 to-black border-0 text-white rounded-3xl overflow-hidden relative" data-testid="card-apply-finacard">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-500/20 via-transparent to-transparent pointer-events-none" />
              <div className="relative z-10 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold">FinaCard</h1>
                    <p className="text-white/60 text-sm">Spend gold anywhere in the world</p>
                  </div>
                </div>

                <p className="text-white/80 text-lg leading-relaxed max-w-xl">
                  Turn your gold into spending power. Use FinaCard at 40M+ merchants worldwide with 0% FX fees and instant gold-to-spend conversion.
                </p>

                <div className="grid grid-cols-3 gap-4 pt-2">
                  <div className="flex flex-col items-center text-center gap-2 p-4 rounded-xl bg-card/5 backdrop-blur">
                    <Globe className="w-6 h-6 text-blue-400" />
                    <span className="text-xs text-white/70 font-medium">40M+ Merchants</span>
                  </div>
                  <div className="flex flex-col items-center text-center gap-2 p-4 rounded-xl bg-card/5 backdrop-blur">
                    <Sparkles className="w-6 h-6 text-yellow-400" />
                    <span className="text-xs text-white/70 font-medium">0% FX Fee</span>
                  </div>
                  <div className="flex flex-col items-center text-center gap-2 p-4 rounded-xl bg-card/5 backdrop-blur">
                    <Zap className="w-6 h-6 text-green-400" />
                    <span className="text-xs text-white/70 font-medium">Instant Conversion</span>
                  </div>
                </div>

                <Button
                  onClick={() => applyMutation.mutate()}
                  disabled={applyMutation.isPending}
                  className="w-full h-14 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl text-base font-bold shadow-lg shadow-purple-500/25"
                  data-testid="button-apply-finacard"
                >
                  {applyMutation.isPending ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Submitting...</>
                  ) : (
                    <><CreditCard className="w-5 h-5 mr-2" /> Apply for FinaCard</>
                  )}
                </Button>
              </div>
            </Card>
          </motion.div>

          {cardStatus === 'cancelled' && activeCard?.adminNotes && (
            <Card className="p-5 border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-950/20 rounded-2xl" data-testid="card-cancelled-reason">
              <div className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-red-800 dark:text-red-200 text-sm">Previous Application Rejected</p>
                  <p className="text-red-600 dark:text-red-400 text-sm mt-1">{activeCard.adminNotes}</p>
                  <p className="text-red-400 text-xs mt-2">You may apply again with updated information.</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </DashboardLayout>
    );
  }

  if (cardStatus === 'applied' || cardStatus === 'under_review') {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto space-y-6 pb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="p-8 text-center rounded-2xl" data-testid="card-application-status">
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-amber-100 to-yellow-200 flex items-center justify-center mb-6"
              >
                <Clock className="w-10 h-10 text-amber-600 dark:text-amber-400" />
              </motion.div>
              <h2 className="text-2xl font-bold text-foreground mb-2" data-testid="text-application-title">
                {cardStatus === 'applied' ? 'Application Submitted' : 'Under Review'}
              </h2>
              <p className="text-muted-foreground max-w-md mx-auto mb-6">
                {cardStatus === 'applied'
                  ? 'Your FinaCard application has been submitted and is waiting to be reviewed by our team.'
                  : 'Your application is currently being reviewed. We\'ll notify you once a decision is made.'}
              </p>

              <div className="flex items-center justify-center gap-2 mb-6">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-green-50 dark:bg-green-950/200" />
                  <span className="text-xs text-muted-foreground">Submitted</span>
                </div>
                <div className="w-12 h-0.5 bg-muted relative overflow-hidden">
                  <motion.div
                    className="absolute inset-0 bg-amber-400"
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                  />
                </div>
                <div className="flex items-center gap-1">
                  <div className={`w-3 h-3 rounded-full ${cardStatus === 'under_review' ? 'bg-amber-400' : 'bg-gray-300'}`} />
                  <span className="text-xs text-muted-foreground">Reviewing</span>
                </div>
                <div className="w-12 h-0.5 bg-muted" />
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-gray-300" />
                  <span className="text-xs text-muted-foreground">Approved</span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground/70">
                Applied {formatDistanceToNow(new Date(activeCard.appliedAt), { addSuffix: true })}
              </p>
            </Card>
          </motion.div>
        </div>
      </DashboardLayout>
    );
  }

  if (cardStatus === 'approved') {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto space-y-6 pb-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="p-8 text-center rounded-2xl border-green-200 dark:border-green-800/40 bg-gradient-to-b from-green-50 to-white" data-testid="card-activate-finacard">
              <div className="w-20 h-20 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-6">
                <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Your Card is Approved!</h2>
              <p className="text-muted-foreground max-w-md mx-auto mb-2">
                Congratulations! Your FinaCard application has been approved. Activate your card to start spending gold worldwide.
              </p>
              {activeCard.last4Digits && (
                <p className="text-sm text-muted-foreground/70 mb-6">
                  Card ending in •••• {activeCard.last4Digits}
                </p>
              )}
              <Button
                onClick={() => activateMutation.mutate(activeCard.id)}
                disabled={activateMutation.isPending}
                className="h-14 px-10 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl text-base font-bold shadow-lg shadow-green-500/25"
                data-testid="button-activate-finacard"
              >
                {activateMutation.isPending ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Activating...</>
                ) : (
                  <><Zap className="w-5 h-5 mr-2" /> Activate Your Card</>
                )}
              </Button>
            </Card>
          </motion.div>
        </div>
      </DashboardLayout>
    );
  }

  if (cardStatus === 'frozen') {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto space-y-6 pb-12">
          <Card className="p-8 text-center rounded-2xl border-blue-200 dark:border-blue-800/40 bg-blue-50 dark:bg-blue-950/20" data-testid="card-frozen-finacard">
            <div className="w-20 h-20 mx-auto rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-6">
              <Snowflake className="w-10 h-10 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Card Frozen</h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-4">
              Your FinaCard has been temporarily frozen. Spending is disabled until the card is unfrozen.
            </p>
            {activeCard.frozenReason && (
              <p className="text-sm text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 rounded-lg p-3 inline-block" data-testid="text-frozen-reason">
                Reason: {activeCard.frozenReason}
              </p>
            )}
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8 pb-12">

        <div className="grid md:grid-cols-2 gap-8 items-start">

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="relative w-full aspect-[1.586/1] rounded-2xl bg-gradient-to-br from-zinc-900 via-black to-zinc-900 shadow-2xl p-6 md:p-8 flex flex-col justify-between overflow-hidden border border-white/10 group hover:scale-[1.01] transition-transform duration-500" data-testid="card-visual-finacard">
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
              <div className="relative z-10 flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-gradient-to-br from-purple-500 to-pink-600" />
                  <span className="text-white font-bold tracking-tight">Finatrades</span>
                </div>
                <CreditCard className="w-8 h-8 text-white/80" />
              </div>
              <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-8 bg-gradient-to-r from-yellow-200 to-yellow-500 rounded-md opacity-80" />
                  <Zap className="w-6 h-6 text-white/50 rotate-90" />
                </div>
                <p className="font-mono text-xl md:text-2xl text-white tracking-widest" data-testid="text-card-number">
                  •••• •••• •••• {activeCard.last4Digits || '0000'}
                </p>
                <div className="flex justify-between items-end text-white/90">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-white/50 mb-1">Card Holder</p>
                    <p className="font-medium tracking-wide uppercase text-sm" data-testid="text-card-holder">{user.firstName} {user.lastName}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-white/50 mb-1">Expires</p>
                    <p className="font-medium tracking-wide text-sm" data-testid="text-card-expiry">
                      {activeCard.expiryMonth ? `${String(activeCard.expiryMonth).padStart(2, '0')}/${String(activeCard.expiryYear).slice(-2)}` : '--/--'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-8 left-4 right-4 h-8 bg-black/15 blur-xl rounded-full" />
          </motion.div>

          <div className="space-y-4">
            <Card className="p-6 bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 border-0 text-white rounded-2xl" data-testid="card-finacard-balance">
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="w-4 h-4 text-white/60" />
                <p className="text-white/60 text-xs font-medium uppercase tracking-wider">FinaCard Balance</p>
              </div>
              <p className="text-4xl font-bold tracking-tight" data-testid="text-finacard-gold">
                {balanceLoading ? '...' : `${finacardGrams.toFixed(4)}g`}
              </p>
              <p className="text-white/50 text-sm mt-1" data-testid="text-finacard-usd">
                ≈ ${finacardUsd.toFixed(2)} USD
              </p>
              <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2 text-white/40 text-xs">
                <Wallet className="w-3 h-3" />
                <span>FinaPay Wallet: {walletGrams.toFixed(4)}g available</span>
              </div>
            </Card>

            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => setShowFundDialog(true)}
                className="h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold"
                disabled={walletGrams <= 0}
                data-testid="button-fund-finacard"
              >
                <ArrowDownToLine className="w-4 h-4 mr-2" />
                Fund Card
              </Button>
              <Button
                onClick={() => setShowWithdrawDialog(true)}
                className="h-14 bg-card text-foreground hover:bg-muted border border-border rounded-xl text-sm font-semibold"
                disabled={finacardGrams <= 0}
                data-testid="button-withdraw-finacard"
              >
                <ArrowUpFromLine className="w-4 h-4 mr-2" />
                Return Gold
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Card className="p-3 text-center bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/40">
                <Globe className="w-5 h-5 mx-auto text-blue-600 dark:text-blue-400 mb-1" />
                <p className="text-[10px] font-medium text-blue-700 dark:text-blue-300">40M+ Merchants</p>
              </Card>
              <Card className="p-3 text-center bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800/40">
                <Shield className="w-5 h-5 mx-auto text-green-600 dark:text-green-400 mb-1" />
                <p className="text-[10px] font-medium text-green-700 dark:text-green-300">Bank-Grade Security</p>
              </Card>
              <Card className="p-3 text-center bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800/40">
                <Sparkles className="w-5 h-5 mx-auto text-purple-600 dark:text-purple-400 mb-1" />
                <p className="text-[10px] font-medium text-purple-700 dark:text-purple-300">0% FX Fee</p>
              </Card>
            </div>
          </div>
        </div>

        <Card className="p-6 rounded-2xl" data-testid="card-simulate-spending">
          <h3 className="font-bold text-lg text-foreground mb-4 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            Simulate Spending
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground/85 mb-1.5 block">Merchant Name</label>
                <Input
                  placeholder="e.g. Amazon, Starbucks, Emirates"
                  value={merchantName}
                  onChange={(e) => setMerchantName(e.target.value)}
                  data-testid="input-merchant-name"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground/85 mb-1.5 block">Category</label>
                <Select value={merchantCategory} onValueChange={setMerchantCategory}>
                  <SelectTrigger data-testid="select-merchant-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {MERCHANT_CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value} data-testid={`option-category-${cat.value.toLowerCase()}`}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-sm font-medium text-foreground/85 mb-1.5 block">Amount</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="100.00"
                    value={spendAmount}
                    onChange={(e) => setSpendAmount(e.target.value)}
                    data-testid="input-spend-amount"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground/85 mb-1.5 block">Currency</label>
                  <Select value={spendCurrency} onValueChange={setSpendCurrency}>
                    <SelectTrigger data-testid="select-spend-currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map(c => (
                        <SelectItem key={c.value} value={c.value} data-testid={`option-currency-${c.value.toLowerCase()}`}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {spendAmountNum > 0 && goldPrice > 0 && (
                <div className="bg-gradient-to-br from-gray-50 to-purple-50 rounded-xl p-5 space-y-3" data-testid="card-spend-preview">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Transaction Preview</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-semibold">{CURRENCIES.find(c => c.value === spendCurrency)?.symbol}{spendAmountNum.toFixed(2)} {spendCurrency}</span>
                  </div>
                  {spendCurrency !== 'USD' && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">USD Equivalent</span>
                      <span className="font-medium">${spendUsdEquiv.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Gold Price</span>
                    <span className="font-medium">${goldPrice.toFixed(2)}/g</span>
                  </div>
                  <div className="border-t border-border pt-3 flex justify-between">
                    <span className="text-foreground/85 font-medium">Gold to Deduct</span>
                    <span className="font-bold text-purple-700 dark:text-purple-300" data-testid="text-spend-gold-preview">{spendGoldPreview.toFixed(4)}g</span>
                  </div>
                  {spendGoldPreview > finacardGrams && (
                    <p className="text-xs text-red-500 font-medium" data-testid="text-insufficient-balance">
                      ⚠ Insufficient balance. You have {finacardGrams.toFixed(4)}g available.
                    </p>
                  )}
                </div>
              )}

              <Button
                onClick={() => spendMutation.mutate({
                  merchantName,
                  merchantCategory,
                  amountLocal: spendAmountNum,
                  currencyLocal: spendCurrency,
                })}
                disabled={
                  !merchantName.trim() ||
                  !merchantCategory ||
                  spendAmountNum <= 0 ||
                  spendGoldPreview > finacardGrams ||
                  spendMutation.isPending
                }
                className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold"
                data-testid="button-spend"
              >
                {spendMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                ) : (
                  <><CreditCard className="w-4 h-4 mr-2" /> Pay {spendAmountNum > 0 ? `${CURRENCIES.find(c => c.value === spendCurrency)?.symbol}${spendAmountNum.toFixed(2)}` : ''}</>
                )}
              </Button>
            </div>
          </div>
        </Card>

        {spendingHistory.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-muted-foreground/70" />
                Recent Spending
              </h3>
            </div>
            <Card className="divide-y divide-border/60 overflow-hidden" data-testid="card-spending-history">
              {spendingHistory.map((s) => {
                const CategoryIcon = getCategoryIcon(s.merchantCategory);
                return (
                  <div key={s.id} className="flex items-center justify-between p-4 hover:bg-muted/40 transition-colors" data-testid={`row-spending-${s.id}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                        <CategoryIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-foreground" data-testid={`text-merchant-${s.id}`}>{s.merchantName}</p>
                        <p className="text-xs text-muted-foreground/70">
                          {s.merchantCategory && <span>{s.merchantCategory} · </span>}
                          {formatDistanceToNow(new Date(s.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm text-red-600 dark:text-red-400" data-testid={`text-spend-amount-${s.id}`}>
                        -{Number(s.goldGramsDeducted).toFixed(4)}g
                      </p>
                      <p className="text-xs text-muted-foreground/70">
                        {s.currencyLocal !== 'USD' ? `${Number(s.amountLocal).toFixed(2)} ${s.currencyLocal} · ` : ''}
                        ${Number(s.usdEquivalent).toFixed(2)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </Card>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
              <History className="w-5 h-5 text-muted-foreground/70" />
              Transfer History
            </h3>
          </div>
          {transfers.length === 0 ? (
            <Card className="p-8 text-center">
              <RefreshCw className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground font-medium">No transfers yet</p>
              <p className="text-muted-foreground/70 text-sm mt-1">Fund your FinaCard to start using it</p>
            </Card>
          ) : (
            <Card className="divide-y divide-border/60 overflow-hidden">
              {transfers.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-4 hover:bg-muted/40 transition-colors" data-testid={`row-transfer-${t.id}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center ${t.type === 'fund' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-orange-100 dark:bg-orange-900/30'}`}>
                      {t.type === 'fund' ? (
                        <ArrowDownToLine className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <ArrowUpFromLine className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm text-foreground">
                        {t.type === 'fund' ? 'Funded FinaCard' : 'Returned to Wallet'}
                      </p>
                      <p className="text-xs text-muted-foreground/70">
                        {formatDistanceToNow(new Date(t.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold text-sm ${t.type === 'fund' ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-600 dark:text-orange-400'}`}>
                      {t.type === 'fund' ? '+' : '-'}{Number(t.goldGrams).toFixed(4)}g
                    </p>
                    {t.usdEquivalent && (
                      <p className="text-xs text-muted-foreground/70">≈ ${Number(t.usdEquivalent).toFixed(2)}</p>
                    )}
                  </div>
                </div>
              ))}
            </Card>
          )}
        </div>

        <Dialog open={showFundDialog} onOpenChange={setShowFundDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ArrowDownToLine className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Fund FinaCard
              </DialogTitle>
              <DialogDescription>
                Transfer gold from your FinaPay wallet to your FinaCard.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <label className="text-sm font-medium text-foreground/85 mb-1.5 block">Amount (grams)</label>
                <Input
                  type="number"
                  step="0.0001"
                  min="0.001"
                  max={walletGrams}
                  placeholder="e.g. 1.0000"
                  value={fundAmount}
                  onChange={(e) => setFundAmount(e.target.value)}
                  data-testid="input-fund-amount"
                />
                <div className="flex justify-between mt-1.5">
                  <p className="text-xs text-muted-foreground/70">Available: {walletGrams.toFixed(4)}g</p>
                  <button
                    className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:text-purple-200 font-medium"
                    onClick={() => setFundAmount(walletGrams.toFixed(6))}
                    data-testid="button-fund-max"
                  >
                    Use Max
                  </button>
                </div>
              </div>
              {fundAmountNum > 0 && (
                <div className="bg-muted/40 rounded-lg p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gold to transfer</span>
                    <span className="font-medium">{fundAmountNum.toFixed(4)}g</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-muted-foreground">≈ USD value</span>
                    <span className="font-medium">${(fundAmountNum * goldPrice).toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowFundDialog(false)}>Cancel</Button>
              <Button
                onClick={() => fundMutation.mutate(fundAmountNum)}
                disabled={fundAmountNum <= 0 || fundAmountNum > walletGrams || fundMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
                data-testid="button-confirm-fund"
              >
                {fundMutation.isPending ? 'Transferring...' : 'Fund FinaCard'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ArrowUpFromLine className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                Return Gold to Wallet
              </DialogTitle>
              <DialogDescription>
                Move gold from your FinaCard back to your FinaPay wallet.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <label className="text-sm font-medium text-foreground/85 mb-1.5 block">Amount (grams)</label>
                <Input
                  type="number"
                  step="0.0001"
                  min="0.001"
                  max={finacardGrams}
                  placeholder="e.g. 1.0000"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  data-testid="input-withdraw-amount"
                />
                <div className="flex justify-between mt-1.5">
                  <p className="text-xs text-muted-foreground/70">FinaCard Balance: {finacardGrams.toFixed(4)}g</p>
                  <button
                    className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:text-purple-200 font-medium"
                    onClick={() => setWithdrawAmount(finacardGrams.toFixed(6))}
                    data-testid="button-withdraw-max"
                  >
                    Use Max
                  </button>
                </div>
              </div>
              {withdrawAmountNum > 0 && (
                <div className="bg-muted/40 rounded-lg p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gold to return</span>
                    <span className="font-medium">{withdrawAmountNum.toFixed(4)}g</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-muted-foreground">≈ USD value</span>
                    <span className="font-medium">${(withdrawAmountNum * goldPrice).toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowWithdrawDialog(false)}>Cancel</Button>
              <Button
                onClick={() => withdrawMutation.mutate(withdrawAmountNum)}
                disabled={withdrawAmountNum <= 0 || withdrawAmountNum > finacardGrams || withdrawMutation.isPending}
                className="bg-orange-600 hover:bg-orange-700"
                data-testid="button-confirm-withdraw"
              >
                {withdrawMutation.isPending ? 'Transferring...' : 'Return to Wallet'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </DashboardLayout>
  );
}
