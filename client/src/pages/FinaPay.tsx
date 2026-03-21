import React, { useState, useEffect, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useCMSPage } from '@/context/CMSContext';
import { useNotifications } from '@/context/NotificationContext';
import { usePlatform } from '@/context/PlatformContext';
import { useFinaPay } from '@/context/FinaPayContext';
import { normalizeStatus, getTransactionLabel } from '@/lib/transactionUtils';
import { useQuery } from '@tanstack/react-query';
import { Wallet as WalletIcon, RefreshCw, Loader2, AlertCircle, Lock, TrendingUp, ShoppingCart, Send, ArrowDownLeft, Plus, ArrowUpRight, Coins, BarChart3, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Wallet, Transaction } from '@/types/finapay';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

import TransactionHistory from '@/components/finapay/TransactionHistory';
import PendingTransfers from '@/components/finapay/PendingTransfers';

import SellGoldModal from '@/components/finapay/modals/SellGoldModal';
import SendGoldModal from '@/components/finapay/modals/SendGoldModal';
import RequestGoldModal from '@/components/finapay/modals/RequestGoldModal';
import DepositModal from '@/components/finapay/modals/DepositModal';
import WithdrawalModal from '@/components/finapay/modals/WithdrawalModal';
import BuyGoldBarModal from '@/components/finapay/modals/BuyGoldBarModal';

import DualWalletDisplay, { type DualWalletDisplayHandle } from "@/components/finapay/DualWalletDisplay";
import { useLocation, useSearch } from 'wouter';
import { ShieldAlert } from 'lucide-react';
import { useIsMobile } from '@/hooks/useIsMobile';
import MobileFinaPay from '@/components/mobile/MobileFinaPay';

export default function FinaPay() {
  const { user } = useAuth();
  const { settings } = usePlatform();
  const { toast } = useToast();
  const { getContent } = useCMSPage('finapay');
  const { addNotification } = useNotifications();
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const dualWalletRef = useRef<DualWalletDisplayHandle>(null);
  
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

  // Handle highlight and section deep-links from dashboard navigation
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const highlight = params.get('highlight');
    const section = params.get('section');

    if (highlight === 'buy') {
      setHighlightSection(true);
      setTimeout(() => {
        const walletSection = document.getElementById('finapay-wallet-section');
        if (walletSection) walletSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
      setTimeout(() => setHighlightSection(false), 1500);
      window.history.replaceState({}, '', '/finapay');
    }

    if (section === 'transfers' || section === 'requests' || section === 'deposits') {
      const anchorMap: Record<string, string> = {
        transfers: 'finapay-pending-incoming',
        requests: 'finapay-pending-requests',
        deposits: 'finapay-pending-deposits',
      };
      const anchorId = anchorMap[section] ?? 'finapay-pending-transfers';
      setTimeout(() => {
        const target = document.getElementById(anchorId) ?? document.getElementById('finapay-pending-transfers');
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
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
  
  const transactions: Transaction[] = contextTransactions.map((tx: any) => {
    const rawType = tx.type || tx.actionType || 'Transfer';
    const desc = tx.description || '';
    const sourceModule = tx.sourceModule || '';
    const isDualWalletSwap = rawType === 'Swap' && sourceModule === 'dual-wallet';
    const isLockAction = isDualWalletSwap && (
      desc.includes('LGPW to FGPW') || desc.includes('LGPW To FGPW') || desc.startsWith('LGPW to FGPW') ||
      desc.includes('LGPW → FGPW') || desc.includes('LGPW → FPGW')
    );
    const isUnlockAction = isDualWalletSwap && (
      desc.includes('FGPW to LGPW') || desc.includes('FGPW To LGPW') || desc.includes('FGPW to LGPW unlock') ||
      desc.includes('FGPW → LGPW') || desc.includes('FPGW → LGPW')
    );
    
    let displayType: string;
    if (isLockAction) {
      displayType = 'Swap';
    } else if (isUnlockAction) {
      displayType = 'Swap';
    } else {
      displayType = getTransactionLabel(rawType);
    }
    
    return {
      id: tx.id || String(Math.random()),
      type: displayType,
      amountGrams: tx.amountGold != null ? parseNumericValue(tx.amountGold) : (tx.amountGrams != null ? parseNumericValue(tx.amountGrams) : undefined),
      amountUsd: parseNumericValue(tx.amountUsd),
      feeUsd: parseNumericValue(tx.feeUsd || tx.fee || 0),
      timestamp: tx.createdAt,
      referenceId: formatReferenceId(tx.id || tx.referenceId),
      status: normalizeStatus(tx.status),
      assetType: (tx.amountGold != null || tx.amountGrams != null) ? 'GOLD' : 'USD',
      description: desc
    };
  });

  // Check if user has any wallet activity (completed transactions OR positive balance OR ledger entries)
  const hasWalletActivity = transactions.some(tx => tx.status === 'Completed') || goldGrams > 0;

  const completedTxCount = transactions.filter(tx => tx.status === 'Completed').length;
  const totalGoldVolume = transactions
    .filter(tx => tx.status === 'Completed')
    .reduce((sum, tx) => sum + (tx.amountGrams || 0), 0);

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

            <button
              onClick={() => {
                if (!isKycApproved) { handleKycRequired(); return; }
                if (dualWalletRef.current) {
                  dualWalletRef.current.openLockDialog();
                  setTimeout(() => {
                    const el = document.getElementById('dual-wallet-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }, 50);
                }
              }}
              className={`whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium border transition-all flex items-center ${
                isKycApproved 
                  ? 'border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-500 hover:text-white hover:border-violet-500 hover:shadow-md' 
                  : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
              }`}
              data-testid="button-lock-gold-price"
            >
              <ShieldCheck className="w-4 h-4 mr-1.5" />
              Lock Gold Price
              {!isKycApproved && <Lock className="w-3 h-3 ml-1.5" />}
            </button>
          </div>
        </div>
        
        {/* Two-panel layout: FinaPay Wallet (left) + Gold Wallet / Dual Wallet (right) */}
        {hasWalletActivity && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">

            {/* LEFT PANEL — Digital Gold Payments summary */}
            <div id="finapay-wallet-section" className={`bg-white rounded-2xl border border-border p-6 shadow-sm transition-all duration-500 flex flex-col ${highlightSection ? 'ring-2 ring-primary ring-offset-2 bg-purple-50' : ''}`}>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-purple-100 rounded-lg shrink-0">
                  <WalletIcon className="w-5 h-5 text-fuchsia-600" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-foreground" data-testid="text-finapay-title">{getContent('hero', 'title', 'Digital Gold Payments')}</h2>
                  <p className="text-xs text-muted-foreground">Send, receive and trade digital gold</p>
                </div>
              </div>

              <div className="flex flex-col flex-1 gap-4">

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

                <div className="grid grid-cols-2 gap-4">
                  <div className="relative p-5 rounded-xl border border-border bg-gradient-to-br from-white to-gray-50 overflow-hidden">
                    <div className="absolute right-2 bottom-2 opacity-5">
                      <Lock className="w-16 h-16 text-purple-500" />
                    </div>
                    <div className="relative z-10">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Locked Assets</p>
                      <p className="text-2xl font-bold text-purple-500 mb-1">0.0000 g</p>
                      <p className="text-sm text-purple-500/70">≈ $0.00</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        <Lock className="w-3 h-3 inline mr-1" />
                        In active plans &amp; trades
                      </p>
                    </div>
                  </div>

                  <div className="relative p-5 rounded-xl border border-border bg-gradient-to-br from-white to-gray-50 overflow-hidden">
                    <div className="absolute right-2 bottom-2 opacity-5">
                      <TrendingUp className="w-16 h-16 text-purple-500" />
                    </div>
                    <div className="relative z-10">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Total Value</p>
                      <p className="text-2xl font-bold text-purple-500 mb-1">
                        {goldGrams.toFixed(4)} g
                      </p>
                      <p className="text-sm text-muted-foreground">≈ ${totalAvailableUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                </div>

                {/* Live Gold Rate */}
                <div className="relative p-5 rounded-xl border border-amber-100 bg-gradient-to-br from-amber-50/50 to-yellow-50/20 overflow-hidden">
                  <div className="absolute right-2 bottom-2 opacity-5">
                    <BarChart3 className="w-20 h-20 text-amber-500" />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Live Gold Rate</p>
                      <span className="text-[10px] font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                        Live
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-amber-700 mb-1">
                      ${currentGoldPriceUsdPerGram.toFixed(2)}
                      <span className="text-sm font-normal text-muted-foreground ml-1">/ g</span>
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-sm text-amber-700/70">≈ AED {(currentGoldPriceUsdPerGram * 3.67).toFixed(2)}/g</p>
                      <span className="text-muted-foreground/40 text-xs">•</span>
                      <p className="text-sm text-amber-700/70">≈ AED {(currentGoldPriceUsdPerGram * 3.67 * 31.1035).toFixed(0)}/troy oz</p>
                    </div>
                  </div>
                </div>

                {/* Account Activity Summary */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative p-4 rounded-xl border border-border bg-gradient-to-br from-white to-gray-50 overflow-hidden">
                    <div className="absolute right-2 bottom-2 opacity-5">
                      <CheckCircle2 className="w-14 h-14 text-green-500" />
                    </div>
                    <div className="relative z-10">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Completed Txns</p>
                      <p className="text-2xl font-bold text-green-600" data-testid="text-completed-tx-count">{completedTxCount}</p>
                      <p className="text-xs text-muted-foreground mt-1">All-time</p>
                    </div>
                  </div>
                  <div className="relative p-4 rounded-xl border border-border bg-gradient-to-br from-white to-gray-50 overflow-hidden">
                    <div className="absolute right-2 bottom-2 opacity-5">
                      <Coins className="w-14 h-14 text-amber-500" />
                    </div>
                    <div className="relative z-10">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Total Volume</p>
                      <p className="text-2xl font-bold text-amber-700" data-testid="text-total-volume">{totalGoldVolume.toFixed(2)} g</p>
                      <p className="text-xs text-muted-foreground mt-1">Gold transacted</p>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* RIGHT PANEL — Gold Wallet (Dual Wallet Display) */}
            {user && (
              <div id="dual-wallet-section" className="h-full">
                <DualWalletDisplay ref={dualWalletRef} userId={user.id} />
              </div>
            )}

          </div>
        )}

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
        <div id="finapay-pending-transfers">
          <PendingTransfers />
        </div>

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
        <BuyGoldBarModal
          isOpen={activeModal === 'buyWingold'}
          onClose={handleModalClose}
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
