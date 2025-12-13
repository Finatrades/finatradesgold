import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { usePlatform } from '@/context/PlatformContext';
import { useFinaPay } from '@/context/FinaPayContext';
import { Wallet as WalletIcon, RefreshCw, Bell, Settings, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Wallet, Transaction } from '@/types/finapay';

import WalletBalanceCards from '@/components/finapay/WalletBalanceCards';
import WalletAnalytics from '@/components/finapay/WalletAnalytics';
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
      <div className="max-w-5xl mx-auto space-y-8 pb-12">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-primary/10 rounded-lg border border-primary/20 text-primary">
                <WalletIcon className="w-6 h-6" />
             </div>
             <div>
               <h1 className="text-2xl font-bold text-foreground">FinaPay Wallet</h1>
               <p className="text-muted-foreground text-sm">USD & Gold wallet for digital finance.</p>
             </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:block text-right">
               <p className="text-xs text-muted-foreground uppercase tracking-wider">Live Gold Spot</p>
               <p className="text-secondary font-bold font-mono">${currentGoldPriceUsdPerGram.toFixed(2)} <span className="text-xs text-muted-foreground">/g</span></p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-full"
                onClick={handleRefresh}
                disabled={loading}
                data-testid="button-refresh-wallet"
              >
                 <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-full">
                 <Bell className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-full">
                 <Settings className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        <section>
          <WalletBalanceCards wallet={wallet} />
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
             <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Quick Actions</h3>
          </div>
          <QuickActions onAction={handleQuickAction} goldPrice={currentGoldPriceUsdPerGram} />
        </section>

        <section>
          <WalletAnalytics wallet={wallet} />
        </section>

        <section>
          {transactions.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
              <h3 className="text-lg font-semibold mb-2">No Transactions Yet</h3>
              <p className="text-muted-foreground mb-4">
                Your transaction history will appear here once you buy, sell, or transfer gold.
              </p>
              <Button onClick={() => setActiveModal('buy')} data-testid="button-first-buy">
                Make Your First Purchase
              </Button>
            </div>
          ) : (
            <TransactionHistory transactions={transactions} />
          )}
        </section>

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
