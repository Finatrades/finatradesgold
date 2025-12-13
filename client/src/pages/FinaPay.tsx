import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { usePlatform } from '@/context/PlatformContext';
import { useFinaPay } from '@/context/FinaPayContext';
import { Wallet as WalletIcon, RefreshCw, Loader2, AlertCircle, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Wallet, Transaction } from '@/types/finapay';

import WalletBalanceCards from '@/components/finapay/WalletBalanceCards';
import TransactionHistory from '@/components/finapay/TransactionHistory';
import QuickActions from '@/components/finapay/QuickActions';

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
      toast({ title: "Purchase Order Submitted", description: `Your order for ${grams.toFixed(4)}g of gold has been submitted for processing.` });
      addNotification({
        title: "Buy Order Submitted",
        message: `Purchase of ${grams.toFixed(4)}g gold submitted for approval.`,
        type: 'success'
      });
    } catch (error) {
      toast({ title: "Error", description: "Failed to submit buy order. Please try again.", variant: "destructive" });
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
      toast({ title: "Sell Order Submitted", description: `Your order to sell ${grams.toFixed(4)}g has been submitted for processing.` });
      addNotification({
        title: "Sell Order Submitted",
        message: `Sale of ${grams.toFixed(4)}g gold submitted for approval.`,
        type: 'success'
      });
    } catch (error) {
      toast({ title: "Error", description: "Failed to submit sell order. Please try again.", variant: "destructive" });
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
      const amountDisplay = asset === 'USD' ? `$${amount.toFixed(2)}` : `${amount.toFixed(4)}g Gold`;
      toast({ title: "Transfer Submitted", description: `Transfer of ${amountDisplay} to ${recipient} submitted for processing.` });
      addNotification({
        title: "Transfer Submitted",
        message: `You initiated a transfer of ${amountDisplay} to ${recipient}.`,
        type: 'transaction'
      });
    } catch (error) {
      toast({ title: "Error", description: "Failed to submit transfer. Please try again.", variant: "destructive" });
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
      const amountDisplay = asset === 'USD' ? `$${amount.toFixed(2)}` : `${amount.toFixed(4)}g Gold`;
      toast({ title: "Request Sent", description: `Your request for ${amountDisplay} from ${from} has been sent.` });
      addNotification({
        title: "Payment Requested",
        message: `You requested ${amountDisplay} from ${from}.`,
        type: 'info'
      });
    } catch (error) {
      toast({ title: "Error", description: "Failed to submit request. Please try again.", variant: "destructive" });
    }
  };

  const handleQuickAction = (action: string) => {
    switch(action) {
      case 'buy': setActiveModal('buy'); break;
      case 'sell': setActiveModal('sell'); break;
      case 'send': setActiveModal('send'); break;
      case 'request': setActiveModal('request'); break;
      case 'add_fund': setActiveModal('deposit'); break;
      case 'withdraw': setActiveModal('withdraw'); break;
      case 'deposit_gold':
        toast({ title: "Coming Soon", description: "Physical gold deposit will be available through FinaVault." });
        break;
      case 'bnsl': 
        setLocation('/bnsl');
        break;
      case 'trade':
        setLocation('/finabridge');
        break;
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
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl text-white shadow-lg">
              <WalletIcon className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">FinaPay</h1>
              <p className="text-muted-foreground text-sm">Your digital gold wallet</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Live Gold Price Badge */}
            <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-full">
              <TrendingUp className="w-4 h-4 text-amber-600" />
              <div className="text-sm">
                <span className="text-muted-foreground">Gold: </span>
                <span className="font-bold text-amber-700">${currentGoldPriceUsdPerGram.toFixed(2)}</span>
                <span className="text-muted-foreground text-xs">/g</span>
              </div>
            </div>
            
            <Button 
              variant="outline" 
              size="icon" 
              className="rounded-full"
              onClick={handleRefresh}
              disabled={loading}
              data-testid="button-refresh-wallet"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Wallet Balance Cards */}
        <section>
          <WalletBalanceCards wallet={wallet} />
        </section>

        {/* Quick Actions */}
        <section>
          <QuickActions onAction={handleQuickAction} goldPrice={currentGoldPriceUsdPerGram} />
        </section>

        {/* Transaction History */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Recent Transactions</h2>
          </div>
          {transactions.length === 0 ? (
            <div className="bg-white border border-border rounded-2xl p-12 text-center shadow-sm">
              <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Transactions Yet</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Your transaction history will appear here once you buy, sell, or transfer gold.
              </p>
              <Button onClick={() => setActiveModal('buy')} data-testid="button-first-buy" className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700">
                Make Your First Purchase
              </Button>
            </div>
          ) : (
            <TransactionHistory transactions={transactions} />
          )}
        </section>

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
