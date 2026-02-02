import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useCMSPage } from '@/context/CMSContext';
import { useNotifications } from '@/context/NotificationContext';
import { usePlatform } from '@/context/PlatformContext';
import { useFinaPay } from '@/context/FinaPayContext';
import { normalizeStatus, getTransactionLabel } from '@/lib/transactionUtils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Wallet as WalletIcon, RefreshCw, Loader2, AlertCircle, Lock, TrendingUp, ShoppingCart, Send, ArrowDownLeft, Plus, ArrowUpRight, Coins, BarChart3, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Wallet, Transaction } from '@/types/finapay';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiRequest } from '@/lib/queryClient';
import { toast as sonnerToast } from 'sonner';

import TransactionHistory from '@/components/finapay/TransactionHistory';
import PendingTransfers from '@/components/finapay/PendingTransfers';

import SellGoldModal from '@/components/finapay/modals/SellGoldModal';
import SendGoldModal from '@/components/finapay/modals/SendGoldModal';
import RequestGoldModal from '@/components/finapay/modals/RequestGoldModal';
import DepositModal from '@/components/finapay/modals/DepositModal';
import WithdrawalModal from '@/components/finapay/modals/WithdrawalModal';

import DualWalletDisplay from "@/components/finapay/DualWalletDisplay";
import { useLocation, useSearch } from 'wouter';
import { ShieldAlert } from 'lucide-react';
import { useIsMobile } from '@/hooks/useIsMobile';
import MobileFinaPay from '@/components/mobile/MobileFinaPay';

function LockGoldPriceCard({ userId }: { userId?: string }) {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [isActive, setIsActive] = useState(() => {
    const saved = localStorage.getItem('lockGoldBannerActive');
    return saved !== 'false';
  });
  const [lockAmount, setLockAmount] = useState('');
  const [isLocking, setIsLocking] = useState(false);

  // Listen for localStorage changes (when Settings page updates the state)
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('lockGoldBannerActive');
      setIsActive(saved !== 'false');
    };
    window.addEventListener('storage', handleStorageChange);
    // Also check on focus (for same-tab updates)
    const handleFocus = () => {
      const saved = localStorage.getItem('lockGoldBannerActive');
      setIsActive(saved !== 'false');
    };
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const { data: walletData } = useQuery<{
    mpgw: { availableGrams: number };
    goldPricePerGram: number;
  }>({
    queryKey: ['dual-wallet', 'balance', userId],
    queryFn: async () => {
      const res = await fetch(`/api/dual-wallet/${userId}/balance`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch wallet');
      return res.json();
    },
    enabled: !!userId,
  });

  const availableGrams = walletData?.mpgw?.availableGrams || 0;
  const currentPrice = walletData?.goldPricePerGram || 0;
  const lockAmountNum = parseFloat(lockAmount) || 0;
  const lockValueUsd = lockAmountNum * currentPrice;

  const handleInactiveClick = () => {
    // Redirect to Settings page Lock Gold section to activate
    window.location.href = '/settings#lock-gold-section';
  };

  const handleLockGold = async () => {
    if (!userId || lockAmountNum <= 0 || lockAmountNum > availableGrams) {
      sonnerToast.error('Invalid amount');
      return;
    }
    
    setIsLocking(true);
    try {
      const res = await apiRequest('POST', '/api/dual-wallet/transfer', {
        userId,
        goldGrams: lockAmountNum,
        fromWalletType: 'LGPW',
        toWalletType: 'FGPW',
        notes: `Locked at $${currentPrice.toFixed(2)}/gram`
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Transfer failed');
      }
      
      sonnerToast.success(`Locked ${lockAmountNum.toFixed(4)}g at $${currentPrice.toFixed(2)}/gram!`);
      setLockAmount('');
      queryClient.invalidateQueries({ queryKey: ['dual-wallet'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
    } catch (err: any) {
      sonnerToast.error(err.message || 'Failed to lock gold');
    } finally {
      setIsLocking(false);
    }
  };

  // INACTIVE STATE: Show only header, click redirects to Settings
  if (!isActive) {
    return (
      <div 
        className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-xl shadow-sm cursor-pointer hover:bg-amber-100/30 transition-colors"
        onClick={handleInactiveClick}
        data-testid="lock-gold-inactive"
      >
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Lock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-amber-800">Lock Gold Price (FGPW)</h3>
              <p className="text-sm text-amber-600">Protect your gold from market drops</p>
            </div>
          </div>
          <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-gray-100 text-gray-500">
            Inactive
          </span>
        </div>
      </div>
    );
  }

  // ACTIVE STATE: Show full card content
  return (
    <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-amber-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
            <Lock className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold text-amber-800">Lock Gold Price (FGPW)</h3>
            <p className="text-sm text-amber-600">Protect your gold from market drops</p>
          </div>
        </div>
        <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-green-100 text-green-700">
          Active
        </span>
      </div>

      {/* Full Content */}
      <div className="p-4 space-y-4">
        {/* Balance & Price */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="p-3 rounded-lg bg-white border">
            <span className="text-muted-foreground text-xs">Available (LGPW)</span>
            <p className="font-semibold">{availableGrams.toFixed(4)}g</p>
          </div>
          <div className="p-3 rounded-lg bg-white border">
            <span className="text-muted-foreground text-xs">Current Price</span>
            <p className="font-semibold text-green-600">${currentPrice.toFixed(2)}/g</p>
          </div>
        </div>

        {/* Lock Input */}
        <div className="space-y-2">
          <Label className="text-sm">Amount to Lock (grams)</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              step="0.0001"
              min="0"
              max={availableGrams}
              placeholder="Enter grams"
              value={lockAmount}
              onChange={(e) => setLockAmount(e.target.value)}
              className="bg-white"
              data-testid="input-lock-amount"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLockAmount(availableGrams.toFixed(4))}
              data-testid="button-lock-max"
            >
              Max
            </Button>
          </div>
          {lockAmountNum > 0 && (
            <p className="text-xs text-muted-foreground">
              ≈ ${lockValueUsd.toFixed(2)} USD locked at ${currentPrice.toFixed(2)}/gram
            </p>
          )}
        </div>

        {/* Lock Button */}
        <Button
          className="w-full bg-amber-600 hover:bg-amber-700"
          disabled={isLocking || lockAmountNum <= 0 || lockAmountNum > availableGrams}
          onClick={handleLockGold}
          data-testid="button-lock-gold"
        >
          {isLocking ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Locking...</>
          ) : (
            <><Lock className="w-4 h-4 mr-2" /> Lock Gold at Current Price</>
          )}
        </Button>

        {/* Note */}
        <p className="text-xs text-amber-700 p-2 bg-blue-50 rounded border border-blue-200">
          <strong>Note:</strong> Locked gold is protected from market drops. To withdraw, sell, or transfer, you must first UNLOCK your gold (transfer FGPW → LGPW). All transactions happen from Live Gold (LGPW) only.
        </p>
      </div>
    </div>
  );
}

export default function FinaPay() {
  const { user } = useAuth();
  const { settings } = usePlatform();
  const { toast } = useToast();
  const { getContent } = useCMSPage('finapay');
  const { addNotification } = useNotifications();
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  
  // KYC verification check - only allow actions if KYC is approved
  const isKycApproved = user?.kycStatus === 'Approved';
  
  const handleKycRequired = () => {
    toast({
      title: "KYC Verification Required",
      description: "Please complete your KYC verification to access this feature.",
      variant: "destructive",
    });
    setLocation('/kyc');
  };
  
  const [depositCallbackStatus, setDepositCallbackStatus] = useState<'success' | 'cancelled' | 'checking' | null>(null);
  const [depositCallbackDetails, setDepositCallbackDetails] = useState<{ amount?: string; orderRef?: string } | null>(null);
  const [highlightSection, setHighlightSection] = useState(false);

  // Handle highlight from dashboard navigation
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const highlight = params.get('highlight');
    if (highlight === 'buy') {
      setHighlightSection(true);
      setTimeout(() => {
        const walletSection = document.getElementById('finapay-wallet-section');
        if (walletSection) {
          walletSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
      setTimeout(() => setHighlightSection(false), 1500);
      window.history.replaceState({}, '', '/finapay');
    }
  }, [searchString]);

  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const isCallback = params.get('deposit_callback');
    const isCancelled = params.get('deposit_cancelled');
    const orderRef = params.get('ref');
    
    if (isCancelled === '1') {
      setDepositCallbackStatus('cancelled');
      window.history.replaceState({}, '', '/finapay');
    } else if (isCallback === '1' && orderRef) {
      setDepositCallbackStatus('checking');
      checkDepositStatus(orderRef);
      window.history.replaceState({}, '', '/finapay');
    }
  }, [searchString]);

  const checkDepositStatus = async (orderRef: string) => {
    try {
      const response = await fetch(`/api/ngenius/order/${orderRef}`);
      const data = await response.json();
      
      if (data.status === 'Captured' || data.status === 'Authorised') {
        setDepositCallbackStatus('success');
        setDepositCallbackDetails({
          amount: data.amountUsd ? `$${parseFloat(data.amountUsd).toFixed(2)}` : undefined,
          orderRef: orderRef,
        });
        refreshWallet();
        refreshTransactions();
      } else if (data.status === 'Failed' || data.status === 'Cancelled') {
        setDepositCallbackStatus('cancelled');
        setDepositCallbackDetails({ orderRef });
      } else {
        setDepositCallbackStatus('checking');
        setTimeout(() => checkDepositStatus(orderRef), 3000);
      }
    } catch (error) {
      setDepositCallbackStatus('cancelled');
    }
  };

  const closeDepositCallback = () => {
    setDepositCallbackStatus(null);
    setDepositCallbackDetails(null);
  };

  const { 
    wallet: rawWallet, 
    transactions: rawTransactions, 
    currentGoldPriceUsdPerGram, 
    createTransaction,
    refreshWallet,
    refreshTransactions,
    loading 
  } = useFinaPay();

  const parseNumericValue = (value: any): number => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return isNaN(value) ? 0 : value;
    const parsed = parseFloat(String(value));
    return isNaN(parsed) ? 0 : parsed;
  };

  const goldGrams = rawWallet ? parseNumericValue(rawWallet.goldGrams) : 0;
  const usdBalance = rawWallet ? parseNumericValue(rawWallet.usdBalance) : 0;
  const goldValueUsd = goldGrams * currentGoldPriceUsdPerGram;
  const totalAvailableUsd = usdBalance + goldValueUsd;

  const wallet: Wallet = {
    goldBalanceGrams: goldGrams,
    usdBalance: usdBalance,
    goldPriceUsdPerGram: currentGoldPriceUsdPerGram,
    usdAedRate: 3.67,
    // GOLD-ONLY: Locked balances in grams (primary)
    bnslLockedGrams: 0,
    finaBridgeLockedGrams: 0,
    // @deprecated - kept for backwards compatibility
    bnslLockedUsd: 0,
    finaBridgeLockedUsd: 0
  };

  const formatReferenceId = (id: any): string => {
    if (!id) return 'N/A';
    const idStr = String(id);
    return idStr.length >= 10 ? idStr.substring(0, 10).toUpperCase() : idStr.toUpperCase();
  };

  // Use FinaPay context transactions (enriched with fees, counterparties, etc.)
  // Apply status normalization for consistency
  const { transactions: contextTransactions } = useFinaPay();
  
  const transactions: Transaction[] = contextTransactions.map((tx: any) => ({
    id: tx.id || String(Math.random()),
    type: getTransactionLabel(tx.type || tx.actionType || 'Transfer'),
    amountGrams: tx.amountGold != null ? parseNumericValue(tx.amountGold) : (tx.amountGrams != null ? parseNumericValue(tx.amountGrams) : undefined),
    amountUsd: parseNumericValue(tx.amountUsd),
    feeUsd: parseNumericValue(tx.feeUsd || tx.fee || 0),
    timestamp: tx.createdAt,
    referenceId: formatReferenceId(tx.id || tx.referenceId),
    status: normalizeStatus(tx.status),
    assetType: (tx.amountGold != null || tx.amountGrams != null) ? 'GOLD' : 'USD',
    description: tx.description || ''
  }));

  // Check if user has any wallet activity (completed transactions OR positive balance OR ledger entries)
  const hasWalletActivity = transactions.some(tx => tx.status === 'Completed') || goldGrams > 0;

  // Fetch vault ledger entries for chain-of-custody display
  const { data: ledgerData } = useQuery({
    queryKey: ['vaultLedger', user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/vault/ledger/${user?.id}?limit=100`);
      if (!res.ok) throw new Error('Failed to fetch ledger');
      return res.json();
    },
    enabled: !!user?.id
  });
  const ledgerEntries = ledgerData?.entries || [];

  const [activeModal, setActiveModal] = useState<string | null>(null);

  // Auto-open deposit modal when coming from dashboard with action=deposit
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const action = params.get('action');
    if (action === 'deposit') {
      setActiveModal('deposit');
      // Clear the query param from URL
      window.history.replaceState({}, '', '/finapay');
    }
  }, [searchString]);

  const handleSellConfirm = async (grams: number, payout: number, pinToken: string) => {
    if (grams > goldGrams) {
      toast({ title: "Insufficient Gold", description: "You don't have enough gold to sell.", variant: "destructive" });
      return;
    }
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'x-pin-token': pinToken,
        },
        credentials: 'include',
        body: JSON.stringify({
          type: 'Sell',
          userId: user?.id,
          amountUsd: payout.toFixed(2),
          amountGold: grams.toFixed(6),
          description: 'Gold sale via FinaPay'
        }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to submit sell order');
      }
      
      refreshWallet();
      refreshTransactions();
      setActiveModal(null);
      toast({ title: "Sell Order Submitted", description: `Your order to sell ${grams.toFixed(4)}g has been submitted.` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to submit sell order.", variant: "destructive" });
    }
  };

  const handleSendConfirm = async (recipient: string, amount: number, asset: 'USD' | 'GOLD') => {
    if (asset === 'USD' && amount > usdBalance) {
      toast({ title: "Insufficient USD", description: "You don't have enough USD balance.", variant: "destructive" });
      return;
    }
    if (asset === 'GOLD' && amount > goldGrams) {
      toast({ title: "Insufficient Gold", description: "You don't have enough gold balance.", variant: "destructive" });
      return;
    }
    try {
      await createTransaction({
        type: 'Send',
        amountUsd: asset === 'USD' ? amount.toFixed(2) : (amount * currentGoldPriceUsdPerGram).toFixed(2),
        amountGold: asset === 'GOLD' ? amount.toFixed(6) : null,
        recipientEmail: recipient,
        description: `Transfer to ${recipient}`
      });
      setActiveModal(null);
      toast({ title: "Transfer Submitted", description: `Transfer submitted for processing.` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to submit transfer.", variant: "destructive" });
    }
  };

  const handleRequestConfirm = async (from: string, amount: number, asset: 'USD' | 'GOLD') => {
    try {
      await createTransaction({
        type: 'Receive',
        amountUsd: asset === 'USD' ? amount.toFixed(2) : (amount * currentGoldPriceUsdPerGram).toFixed(2),
        amountGold: asset === 'GOLD' ? amount.toFixed(6) : null,
        description: `Request from ${from}`
      });
      setActiveModal(null);
      toast({ title: "Request Sent", description: `Your request has been sent.` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to submit request.", variant: "destructive" });
    }
  };

  const handleModalClose = () => {
    setActiveModal(null);
    refreshWallet();
    refreshTransactions();
  };

  const isMobile = useIsMobile();

  if (!user) return null;

  if (loading && !rawWallet) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Loading your wallet...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (isMobile) {
    return (
      <DashboardLayout>
        <MobileFinaPay />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6 pb-12">

        {/* Lock Gold Price Feature Card */}
        <LockGoldPriceCard userId={user?.id} />

        {/* Quick Actions - Horizontal Pill Tabs - TOP */}
        <div className="bg-white rounded-2xl border border-border p-3 shadow-sm overflow-x-auto">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => isKycApproved ? setActiveModal('deposit') : handleKycRequired()}
              className={`whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium border transition-all flex items-center ${
                isKycApproved 
                  ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-500 hover:text-white hover:border-green-500 hover:shadow-md' 
                  : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
              }`}
              data-testid="button-add-funds"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add Funds
              {!isKycApproved && <Lock className="w-3 h-3 ml-1.5" />}
            </button>

            <button
              onClick={() => isKycApproved ? setActiveModal('buyWingold') : handleKycRequired()}
              className={`whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium border transition-all flex items-center ${
                isKycApproved 
                  ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-500 hover:text-white hover:border-amber-500 hover:shadow-md' 
                  : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
              }`}
              data-testid="button-buy-gold"
            >
              <ShoppingCart className="w-4 h-4 mr-1.5" />
              Buy Gold Bar
              {!isKycApproved && <Lock className="w-3 h-3 ml-1.5" />}
            </button>

            <button
              onClick={() => isKycApproved ? setActiveModal('sell') : handleKycRequired()}
              className={`whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium border transition-all flex items-center ${
                isKycApproved 
                  ? 'border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-500 hover:text-white hover:border-purple-500 hover:shadow-md' 
                  : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
              }`}
              data-testid="button-sell-gold"
            >
              <Coins className="w-4 h-4 mr-1.5" />
              Sell Gold
              {!isKycApproved && <Lock className="w-3 h-3 ml-1.5" />}
            </button>

            <button
              onClick={() => isKycApproved ? setActiveModal('withdraw') : handleKycRequired()}
              className={`whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium border transition-all flex items-center ${
                isKycApproved 
                  ? 'border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-500 hover:text-white hover:border-orange-500 hover:shadow-md' 
                  : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
              }`}
              data-testid="button-withdrawals"
            >
              <ArrowUpRight className="w-4 h-4 mr-1.5" />
              Withdraw Gold
              {!isKycApproved && <Lock className="w-3 h-3 ml-1.5" />}
            </button>

            <button
              onClick={() => isKycApproved ? setActiveModal('send') : handleKycRequired()}
              className={`whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium border transition-all flex items-center ${
                isKycApproved 
                  ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-500 hover:text-white hover:border-blue-500 hover:shadow-md' 
                  : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
              }`}
              data-testid="button-send-funds"
            >
              <Send className="w-4 h-4 mr-1.5" />
              Send Gold
              {!isKycApproved && <Lock className="w-3 h-3 ml-1.5" />}
            </button>

            <button
              onClick={() => isKycApproved ? setActiveModal('request') : handleKycRequired()}
              className={`whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium border transition-all flex items-center ${
                isKycApproved 
                  ? 'border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-500 hover:text-white hover:border-teal-500 hover:shadow-md' 
                  : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
              }`}
              data-testid="button-request-funds"
            >
              <ArrowDownLeft className="w-4 h-4 mr-1.5" />
              Request Gold
              {!isKycApproved && <Lock className="w-3 h-3 ml-1.5" />}
            </button>
          </div>
        </div>
        
        {/* FinaPay Wallet Card - Only show when user has wallet activity */}
        {hasWalletActivity && (
          <div id="finapay-wallet-section" className={`bg-white rounded-2xl border border-border p-6 shadow-sm transition-all duration-500 ${highlightSection ? 'ring-2 ring-primary ring-offset-2 bg-purple-50' : ''}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg shrink-0">
                  <WalletIcon className="w-5 h-5 text-fuchsia-600" />
                </div>
                <h2 className="text-lg font-bold text-foreground" data-testid="text-finapay-title">{getContent('hero', 'title', 'FinaPay Wallet')}</h2>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              <div className="relative p-5 rounded-xl border border-border bg-gradient-to-br from-white to-gray-50 overflow-hidden">
                <div className="absolute right-2 bottom-2 opacity-5">
                  <WalletIcon className="w-20 h-20 text-purple-500" />
                </div>
                <div className="relative z-10">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Available Balance</p>
                  <p className="text-3xl font-bold text-foreground mb-1">
                    {goldGrams.toFixed(4)} g
                  </p>
                  <p className="text-sm text-muted-foreground">≈ ${totalAvailableUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  <p className="text-xs text-muted-foreground mt-3">Gold balance. USD is approximate at current price.</p>
                </div>
              </div>

              <div className="relative p-5 rounded-xl border border-border bg-gradient-to-br from-white to-gray-50 overflow-hidden">
                <div className="absolute right-2 bottom-2 opacity-5">
                  <Lock className="w-20 h-20 text-purple-500" />
                </div>
                <div className="relative z-10">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Locked Assets</p>
                  <p className="text-3xl font-bold text-purple-500 mb-1">0.0000 g</p>
                  <p className="text-sm text-purple-500/70">≈ $0.00</p>
                  <p className="text-xs text-muted-foreground mt-3">
                    <Lock className="w-3 h-3 inline mr-1" />
                    Assets locked in active plans and trades.
                  </p>
                </div>
              </div>

              <div className="relative p-5 rounded-xl border border-border bg-gradient-to-br from-white to-gray-50 overflow-hidden">
                <div className="absolute right-2 bottom-2 opacity-5">
                  <TrendingUp className="w-20 h-20 text-purple-500" />
                </div>
                <div className="relative z-10">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Total Wallet Value</p>
                  <p className="text-3xl font-bold text-purple-500 mb-1">
                    {goldGrams.toFixed(4)} g
                  </p>
                  <p className="text-sm text-muted-foreground">≈ ${totalAvailableUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Dual Wallet Display - LGPW/FGPW - Only show when user has wallet activity */}
        {hasWalletActivity && user && <DualWalletDisplay userId={user.id} />}

        {/* KYC Warning Banner */}
        {!isKycApproved && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-3 flex-1">
              <div className="p-2 bg-amber-100 rounded-full shrink-0">
                <ShieldAlert className="w-5 h-5 text-amber-600" />
              </div>
              <div className="min-w-0">
                <h4 className="font-semibold text-amber-800">KYC Verification Required</h4>
                <p className="text-sm text-amber-700">Complete your identity verification to access all FinaPay features.</p>
              </div>
            </div>
            <Button onClick={() => setLocation('/kyc')} className="bg-amber-500 hover:bg-amber-600 text-white w-full sm:w-auto shrink-0">
              Verify Now
            </Button>
          </div>
        )}

        {/* Pending Transfers */}
        <PendingTransfers />

        {/* Transaction History */}
        <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
          <h3 className="text-lg font-bold text-foreground mb-4">Recent Transactions</h3>
          {transactions.length === 0 && ledgerEntries.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
              <h4 className="text-lg font-semibold mb-2">No Transactions Yet</h4>
              <p className="text-muted-foreground mb-4">Your transaction history will appear here.</p>
              <Button onClick={() => setActiveModal('buyWingold')} className="bg-purple-500 hover:bg-fuchsia-600">
                Make Your First Purchase
              </Button>
            </div>
          ) : (
            <TransactionHistory transactions={transactions} goldPrice={currentGoldPriceUsdPerGram} ledgerEntries={ledgerEntries} />
          )}
        </div>

        {/* Modals */}
        <SellGoldModal 
          isOpen={activeModal === 'sell'} 
          onClose={handleModalClose}
          goldPrice={currentGoldPriceUsdPerGram}
          walletBalance={goldGrams}
          spreadPercent={settings.sellSpreadPercent}
          onConfirm={handleSellConfirm}
        />
        <SendGoldModal 
          isOpen={activeModal === 'send'} 
          onClose={handleModalClose}
          walletBalance={usdBalance}
          goldBalance={goldGrams}
          onConfirm={handleSendConfirm}
        />
        <RequestGoldModal 
          isOpen={activeModal === 'request'} 
          onClose={handleModalClose}
          onConfirm={handleRequestConfirm}
        />
        <DepositModal 
          isOpen={activeModal === 'deposit'} 
          onClose={handleModalClose}
        />
        <WithdrawalModal 
          isOpen={activeModal === 'withdraw'} 
          onClose={handleModalClose}
          walletBalance={usdBalance}
        />
        {/* Deposit Callback Modal */}
        <Dialog open={depositCallbackStatus !== null} onOpenChange={closeDepositCallback}>
          <DialogContent className="bg-white border-border text-foreground w-[95vw] max-w-md max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                {depositCallbackStatus === 'success' && (
                  <>
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                    <span>Deposit Successful</span>
                  </>
                )}
                {depositCallbackStatus === 'cancelled' && (
                  <>
                    <XCircle className="w-6 h-6 text-red-600" />
                    <span>Deposit Cancelled</span>
                  </>
                )}
                {depositCallbackStatus === 'checking' && (
                  <>
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                    <span>Processing Payment</span>
                  </>
                )}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {depositCallbackStatus === 'success' && "Your card payment was successful."}
                {depositCallbackStatus === 'cancelled' && "Your card payment was cancelled or failed."}
                {depositCallbackStatus === 'checking' && "Please wait while we confirm your payment..."}
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-6">
              {depositCallbackStatus === 'success' && (
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-10 h-10 text-green-600" />
                  </div>
                  {depositCallbackDetails?.amount && (
                    <div>
                      <p className="text-3xl font-bold text-green-600">{depositCallbackDetails.amount}</p>
                      <p className="text-sm text-muted-foreground mt-1">has been added to your wallet</p>
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Your updated balance is now available. You can start using your funds immediately.
                  </p>
                </div>
              )}
              
              {depositCallbackStatus === 'cancelled' && (
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                    <XCircle className="w-10 h-10 text-red-600" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    The payment was not completed. No funds have been deducted from your card.
                    You can try again whenever you're ready.
                  </p>
                </div>
              )}
              
              {depositCallbackStatus === 'checking' && (
                <div className="text-center space-y-4">
                  <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto" />
                  <p className="text-sm text-muted-foreground">
                    Confirming your payment with the payment provider...
                  </p>
                </div>
              )}
            </div>
            
            {depositCallbackStatus !== 'checking' && (
              <DialogFooter>
                <Button onClick={closeDepositCallback} data-testid="button-close-callback">
                  {depositCallbackStatus === 'success' ? 'Done' : 'Close'}
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>

      </div>
    </DashboardLayout>
  );
}
