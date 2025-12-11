import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { usePlatform } from '@/context/PlatformContext';
import { useFinaPay } from '@/context/FinaPayContext';
import { Wallet as WalletIcon, RefreshCw, Bell, Settings, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

import WalletBalanceCards from '@/components/finapay/WalletBalanceCards';
import LiveGoldChart from '@/components/finapay/LiveGoldChart';
import WalletAnalytics from '@/components/finapay/WalletAnalytics';
import TransactionHistory from '@/components/finapay/TransactionHistory';
import QuickActions from '@/components/finapay/QuickActions';

import BuyGoldModal from '@/components/finapay/modals/BuyGoldModal';
import SellGoldModal from '@/components/finapay/modals/SellGoldModal';
import SendGoldModal from '@/components/finapay/modals/SendGoldModal';
import RequestGoldModal from '@/components/finapay/modals/RequestGoldModal';
import DepositModal from '@/components/finapay/modals/DepositModal';

export default function FinaPay() {
  const { user } = useAuth();
  const { settings } = usePlatform();
  const { toast } = useToast();
  const { addNotification } = useNotifications();
  const [, setLocation] = useLocation();
  
  const { 
    wallet, 
    transactions, 
    currentGoldPriceUsdPerGram, 
    createTransaction, 
    refreshWallet,
    refreshTransactions,
    loading 
  } = useFinaPay();

  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const goldBalance = wallet ? parseFloat(wallet.goldGrams) : 0;
  const usdBalance = wallet ? parseFloat(wallet.usdBalance) : 0;

  const walletData = {
    goldBalanceGrams: goldBalance,
    usdBalance: usdBalance,
    goldPriceUsdPerGram: currentGoldPriceUsdPerGram,
    usdAedRate: 3.67,
    bnslLockedUsd: 0,
    finaBridgeLockedUsd: 0
  };

  const handleBuyConfirm = async (grams: number, cost: number) => {
    if (usdBalance < cost) {
      toast({ title: "Insufficient Funds", description: "You don't have enough USD.", variant: "destructive" });
      return;
    }
    
    try {
      setProcessing(true);
      await createTransaction({
        type: 'Buy',
        amountGold: grams.toFixed(6),
        amountUsd: cost.toFixed(2),
        goldPriceUsdPerGram: currentGoldPriceUsdPerGram.toFixed(2),
        description: 'Spot Market Purchase',
      });
      
      setActiveModal(null);
      toast({ title: "Purchase Successful", description: `You bought ${grams.toFixed(4)}g of gold.` });
      addNotification({
        title: "Gold Purchase Successful",
        message: `You bought ${grams.toFixed(4)}g of gold for $${cost.toFixed(2)}.`,
        type: 'success'
      });
    } catch (error) {
      toast({ title: "Transaction Failed", description: error instanceof Error ? error.message : "An error occurred", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleSellConfirm = async (grams: number, payout: number) => {
    if (goldBalance < grams) {
      toast({ title: "Insufficient Gold", description: "You don't have enough gold.", variant: "destructive" });
      return;
    }
    
    try {
      setProcessing(true);
      await createTransaction({
        type: 'Sell',
        amountGold: grams.toFixed(6),
        amountUsd: payout.toFixed(2),
        goldPriceUsdPerGram: currentGoldPriceUsdPerGram.toFixed(2),
        description: 'Liquidated to USD',
      });

      setActiveModal(null);
      toast({ title: "Sell Order Executed", description: `Sold ${grams.toFixed(4)}g for $${payout.toFixed(2)}.` });
      addNotification({
        title: "Gold Sold Successfully",
        message: `Sold ${grams.toFixed(4)}g of gold. $${payout.toFixed(2)} credited to USD balance.`,
        type: 'success'
      });
    } catch (error) {
      toast({ title: "Transaction Failed", description: error instanceof Error ? error.message : "An error occurred", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleSendConfirm = async (recipient: string, amount: number, asset: 'USD' | 'GOLD') => {
    try {
      setProcessing(true);
      await createTransaction({
        type: 'Send',
        amountGold: asset === 'GOLD' ? amount.toFixed(6) : '0',
        amountUsd: asset === 'USD' ? amount.toFixed(2) : '0',
        recipientEmail: recipient,
        description: `Sent to ${recipient}`,
      });

      setActiveModal(null);
      const amountDisplay = asset === 'USD' ? `$${amount.toFixed(2)}` : `${amount.toFixed(4)}g Gold`;
      toast({ title: "Transfer Successful", description: `Sent ${amountDisplay} to ${recipient}.` });
      addNotification({
        title: "Funds Sent",
        message: `You sent ${amountDisplay} to ${recipient}.`,
        type: 'transaction'
      });
    } catch (error) {
      toast({ title: "Transfer Failed", description: error instanceof Error ? error.message : "An error occurred", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleRequestConfirm = (from: string, amount: number, asset: 'USD' | 'GOLD') => {
    setActiveModal(null);
    const amountDisplay = asset === 'USD' ? `$${amount.toFixed(2)}` : `${amount.toFixed(4)}g Gold`;
    toast({ title: "Request Sent", description: `Request for ${amountDisplay} sent to ${from}.` });
    addNotification({
      title: "Payment Requested",
      message: `You requested ${amountDisplay} from ${from}.`,
      type: 'info'
    });
  };

  const handleDepositConfirm = async (amount: number) => {
    try {
      setProcessing(true);
      await createTransaction({
        type: 'Deposit',
        amountGold: '0',
        amountUsd: amount.toFixed(2),
        description: 'USD Deposit',
      });

      setActiveModal(null);
      toast({ title: "Deposit Successful", description: `$${amount.toFixed(2)} added to your wallet.` });
      addNotification({
        title: "Deposit Completed",
        message: `$${amount.toFixed(2)} has been added to your USD balance.`,
        type: 'success'
      });
    } catch (error) {
      toast({ title: "Deposit Failed", description: error instanceof Error ? error.message : "An error occurred", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleQuickAction = (action: string) => {
    switch(action) {
      case 'buy': setActiveModal('buy'); break;
      case 'sell': setActiveModal('sell'); break;
      case 'send': setActiveModal('send'); break;
      case 'request': setActiveModal('request'); break;
      case 'add_fund': setActiveModal('deposit'); break;
      case 'deposit_gold':
        toast({ title: "Coming Soon", description: "Gold Deposit functionality will be available shortly." });
        break;
      case 'bnsl': 
        setLocation('/bnsl');
        break;
      case 'trade':
        setLocation('/finabridge');
        break;
    }
  };

  const handleRefresh = async () => {
    await refreshWallet();
    await refreshTransactions();
    toast({ title: "Refreshed", description: "Wallet data has been updated." });
  };

  const mappedTransactions = transactions.map(tx => ({
    id: tx.id,
    type: tx.type as 'Buy' | 'Sell' | 'Send' | 'Receive' | 'Deposit' | 'Withdrawal',
    amountGrams: tx.amountGold ? parseFloat(tx.amountGold) : undefined,
    amountUsd: tx.amountUsd ? parseFloat(tx.amountUsd) : 0,
    feeUsd: 0,
    timestamp: tx.createdAt,
    referenceId: tx.referenceId || tx.id.slice(0, 8).toUpperCase(),
    status: tx.status as 'Completed' | 'Pending' | 'Failed',
    description: tx.description || '',
    assetType: (tx.amountGold && parseFloat(tx.amountGold) > 0) ? 'GOLD' : 'USD' as 'GOLD' | 'USD'
  }));

  if (!user) return null;

  if (loading && !wallet) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
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
          <WalletBalanceCards wallet={walletData} />
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
             <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Quick Actions</h3>
          </div>
          <QuickActions onAction={handleQuickAction} goldPrice={currentGoldPriceUsdPerGram} />
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           <div className="lg:col-span-2 h-[450px]">
             <LiveGoldChart />
           </div>
           <div className="lg:col-span-1 h-[450px]">
             <WalletAnalytics wallet={walletData} />
           </div>
        </section>

        <section>
           <TransactionHistory transactions={mappedTransactions} />
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
          walletBalance={goldBalance}
          spreadPercent={settings.sellSpreadPercent}
          onConfirm={handleSellConfirm}
        />
        <SendGoldModal 
          isOpen={activeModal === 'send'} 
          onClose={() => setActiveModal(null)}
          walletBalance={usdBalance}
          goldBalance={goldBalance}
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

      </div>
    </DashboardLayout>
  );
}
