import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { usePlatform } from '@/context/PlatformContext';
import { useFinaPay } from '@/context/FinaPayContext';
import { Wallet as WalletIcon, RefreshCw, Loader2, AlertCircle, Lock, TrendingUp, ShoppingCart, Send, ArrowDownLeft, Plus, ArrowUpRight, Coins, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Wallet, Transaction } from '@/types/finapay';

import TransactionHistory from '@/components/finapay/TransactionHistory';

import BuyGoldModal from '@/components/finapay/modals/BuyGoldModal';
import SellGoldModal from '@/components/finapay/modals/SellGoldModal';
import SendGoldModal from '@/components/finapay/modals/SendGoldModal';
import RequestGoldModal from '@/components/finapay/modals/RequestGoldModal';
import DepositModal from '@/components/finapay/modals/DepositModal';
import WithdrawalModal from '@/components/finapay/modals/WithdrawalModal';

import { useLocation } from 'wouter';

export default function FinaPay() {
  const { user } = useAuth();
  const { settings } = usePlatform();
  const { toast } = useToast();
  const { addNotification } = useNotifications();
  const [, setLocation] = useLocation();

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
    bnslLockedUsd: 0,
    finaBridgeLockedUsd: 0
  };

  const formatReferenceId = (id: any): string => {
    if (!id) return 'N/A';
    const idStr = String(id);
    return idStr.length >= 10 ? idStr.substring(0, 10).toUpperCase() : idStr.toUpperCase();
  };

  const transactions: Transaction[] = (rawTransactions || []).map((tx: any) => ({
    id: tx.id || String(Math.random()),
    type: tx.type || 'Transfer',
    amountGrams: tx.amountGold != null ? parseNumericValue(tx.amountGold) : undefined,
    amountUsd: parseNumericValue(tx.amountUsd),
    feeUsd: 0,
    timestamp: tx.createdAt,
    referenceId: formatReferenceId(tx.id),
    status: tx.status || 'Pending',
    assetType: tx.amountGold != null ? 'GOLD' : 'USD',
    description: tx.description || ''
  }));

  const [activeModal, setActiveModal] = useState<string | null>(null);

  const handleBuyConfirm = async (grams: number, cost: number) => {
    if (usdBalance < cost) {
      toast({ title: "Insufficient Funds", description: "You don't have enough USD balance.", variant: "destructive" });
      return;
    }
    try {
      await createTransaction({
        type: 'Buy',
        amountUsd: cost.toFixed(2),
        amountGold: grams.toFixed(6),
        description: 'Gold purchase via FinaPay'
      });
      setActiveModal(null);
      toast({ title: "Purchase Order Submitted", description: `Your order for ${grams.toFixed(4)}g of gold has been submitted.` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to submit buy order.", variant: "destructive" });
    }
  };

  const handleSellConfirm = async (grams: number, payout: number) => {
    if (grams > goldGrams) {
      toast({ title: "Insufficient Gold", description: "You don't have enough gold to sell.", variant: "destructive" });
      return;
    }
    try {
      await createTransaction({
        type: 'Sell',
        amountUsd: payout.toFixed(2),
        amountGold: grams.toFixed(6),
        description: 'Gold sale via FinaPay'
      });
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

  const handleRefresh = () => {
    refreshWallet();
    refreshTransactions();
    toast({ title: "Refreshing", description: "Updating your wallet data..." });
  };

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

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6 pb-12">
        
        {/* FinaPay Wallet Card */}
        <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <WalletIcon className="w-5 h-5 text-amber-600" />
              </div>
              <h2 className="text-lg font-bold text-foreground">FinaPay Wallet</h2>
            </div>
            <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white" onClick={() => setActiveModal('deposit')}>
              <Plus className="w-4 h-4 mr-2" />
              Deposit Funds
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div className="relative p-5 rounded-xl border border-border bg-gradient-to-br from-white to-gray-50 overflow-hidden">
              <div className="absolute right-2 bottom-2 opacity-5">
                <WalletIcon className="w-20 h-20 text-amber-500" />
              </div>
              <div className="relative z-10">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Available Balance</p>
                <p className="text-3xl font-bold text-foreground mb-1">
                  ${totalAvailableUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-sm text-muted-foreground">{goldGrams.toFixed(3)} g</p>
                <p className="text-xs text-muted-foreground mt-3">Funds available for trading and transfers.</p>
              </div>
            </div>

            <div className="relative p-5 rounded-xl border border-border bg-gradient-to-br from-white to-gray-50 overflow-hidden">
              <div className="absolute right-2 bottom-2 opacity-5">
                <Lock className="w-20 h-20 text-amber-500" />
              </div>
              <div className="relative z-10">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Locked Assets</p>
                <p className="text-3xl font-bold text-amber-500 mb-1">$0.00</p>
                <p className="text-sm text-amber-500/70">0.000 g</p>
                <p className="text-xs text-muted-foreground mt-3">
                  <Lock className="w-3 h-3 inline mr-1" />
                  Assets locked in active plans and trades.
                </p>
              </div>
            </div>

            <div className="relative p-5 rounded-xl border border-border bg-gradient-to-br from-white to-gray-50 overflow-hidden">
              <div className="absolute right-2 bottom-2 opacity-5">
                <TrendingUp className="w-20 h-20 text-amber-500" />
              </div>
              <div className="relative z-10">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Total Wallet Value</p>
                <p className="text-3xl font-bold text-amber-500 mb-1">
                  ${totalAvailableUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-sm text-muted-foreground">{goldGrams.toFixed(3)} g Total</p>
              </div>
            </div>

          </div>

          <div className="mt-4 text-center">
            <button onClick={handleRefresh} className="text-sm text-amber-600 hover:text-amber-700 hover:underline">
              {loading ? 'Refreshing...' : 'Refresh Balance'}
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => setActiveModal('deposit')}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white border border-border hover:border-amber-300 hover:bg-amber-50 transition-all"
            data-testid="button-add-funds"
          >
            <div className="p-3 bg-green-100 rounded-full">
              <Plus className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-sm font-medium">Add Funds</span>
          </button>

          <button
            onClick={() => setActiveModal('withdraw')}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white border border-border hover:border-amber-300 hover:bg-amber-50 transition-all"
            data-testid="button-withdrawals"
          >
            <div className="p-3 bg-orange-100 rounded-full">
              <ArrowUpRight className="w-5 h-5 text-orange-600" />
            </div>
            <span className="text-sm font-medium">Withdrawals</span>
          </button>

          <button
            onClick={() => setActiveModal('send')}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white border border-border hover:border-amber-300 hover:bg-amber-50 transition-all"
            data-testid="button-send-funds"
          >
            <div className="p-3 bg-blue-100 rounded-full">
              <Send className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm font-medium">Send Funds</span>
          </button>

          <button
            onClick={() => setActiveModal('request')}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white border border-border hover:border-amber-300 hover:bg-amber-50 transition-all"
            data-testid="button-request-funds"
          >
            <div className="p-3 bg-purple-100 rounded-full">
              <ArrowDownLeft className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-sm font-medium">Request Funds</span>
          </button>
        </div>

        {/* Secondary Actions */}
        <div className="flex flex-wrap gap-2 justify-center">
          <button onClick={() => setActiveModal('buy')} className="px-4 py-2 text-sm rounded-full border border-border hover:bg-muted transition-colors">
            <ShoppingCart className="w-4 h-4 inline mr-1" /> Buy Gold
          </button>
          <button onClick={() => setActiveModal('sell')} className="px-4 py-2 text-sm rounded-full border border-border hover:bg-muted transition-colors">
            <Coins className="w-4 h-4 inline mr-1" /> Sell Gold
          </button>
          <button onClick={() => setLocation('/bnsl')} className="px-4 py-2 text-sm rounded-full border border-border hover:bg-muted transition-colors">
            <TrendingUp className="w-4 h-4 inline mr-1" /> BNSL Plans
          </button>
          <button onClick={() => setLocation('/finabridge')} className="px-4 py-2 text-sm rounded-full border border-border hover:bg-muted transition-colors">
            <BarChart3 className="w-4 h-4 inline mr-1" /> Trade Finance
          </button>
        </div>

        {/* Transaction History */}
        <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
          <h3 className="text-lg font-bold text-foreground mb-4">Recent Transactions</h3>
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
              <h4 className="text-lg font-semibold mb-2">No Transactions Yet</h4>
              <p className="text-muted-foreground mb-4">Your transaction history will appear here.</p>
              <Button onClick={() => setActiveModal('buy')} className="bg-amber-500 hover:bg-amber-600">
                Make Your First Purchase
              </Button>
            </div>
          ) : (
            <TransactionHistory transactions={transactions} />
          )}
        </div>

        {/* Modals */}
        <BuyGoldModal 
          isOpen={activeModal === 'buy'} 
          onClose={() => setActiveModal(null)}
          goldPrice={currentGoldPriceUsdPerGram}
          spreadPercent={settings.buySpreadPercent}
          onConfirm={handleBuyConfirm}
        />
        <SellGoldModal 
          isOpen={activeModal === 'sell'} 
          onClose={() => setActiveModal(null)}
          goldPrice={currentGoldPriceUsdPerGram}
          walletBalance={goldGrams}
          spreadPercent={settings.sellSpreadPercent}
          onConfirm={handleSellConfirm}
        />
        <SendGoldModal 
          isOpen={activeModal === 'send'} 
          onClose={() => setActiveModal(null)}
          walletBalance={usdBalance}
          goldBalance={goldGrams}
          onConfirm={handleSendConfirm}
        />
        <RequestGoldModal 
          isOpen={activeModal === 'request'} 
          onClose={() => setActiveModal(null)}
          onConfirm={handleRequestConfirm}
        />
        <DepositModal 
          isOpen={activeModal === 'deposit'} 
          onClose={() => setActiveModal(null)}
        />
        <WithdrawalModal 
          isOpen={activeModal === 'withdraw'} 
          onClose={() => setActiveModal(null)}
          walletBalance={usdBalance}
        />

      </div>
    </DashboardLayout>
  );
}
