import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { Wallet as WalletIcon, RefreshCw, Bell, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Wallet, Transaction } from '@/types/finapay';

// Components
import WalletBalanceCards from '@/components/finapay/WalletBalanceCards';
import LiveGoldChart from '@/components/finapay/LiveGoldChart';
import WalletAnalytics from '@/components/finapay/WalletAnalytics';
import TransactionHistory from '@/components/finapay/TransactionHistory';
import QuickActions from '@/components/finapay/QuickActions';

// Modals
import BuyGoldModal from '@/components/finapay/modals/BuyGoldModal';
import SellGoldModal from '@/components/finapay/modals/SellGoldModal';
import SendGoldModal from '@/components/finapay/modals/SendGoldModal';
import RequestGoldModal from '@/components/finapay/modals/RequestGoldModal';

// Mock Initial State
const INITIAL_WALLET: Wallet = {
  goldBalanceGrams: 125.400,
  usdBalance: 15420.50,
  goldPriceUsdPerGram: 85.22,
  usdAedRate: 3.67,
  bnslLockedUsd: 5000.00,
  finaBridgeLockedUsd: 12500.00
};

const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-001',
    type: 'Buy',
    amountGrams: 10.000,
    amountUsd: 852.20,
    feeUsd: 4.26,
    timestamp: '2024-12-10T14:30:00Z',
    referenceId: 'REF-8821',
    status: 'Completed',
    assetType: 'GOLD'
  },
  {
    id: 'tx-002',
    type: 'Sell',
    amountGrams: 5.000,
    amountUsd: 426.10,
    feeUsd: 6.39,
    timestamp: '2024-12-08T09:15:00Z',
    referenceId: 'REF-7732',
    status: 'Completed',
    assetType: 'GOLD'
  },
  {
    id: 'tx-003',
    type: 'Send',
    amountUsd: 500.00,
    feeUsd: 0,
    timestamp: '2024-12-05T18:00:00Z',
    referenceId: 'REF-6651',
    status: 'Completed',
    description: 'Rent Split',
    assetType: 'USD'
  }
];

export default function FinaPay() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [wallet, setWallet] = useState<Wallet>(INITIAL_WALLET);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);

  // Modals State
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // --- Actions ---

  const handleBuyConfirm = (grams: number, cost: number) => {
    if (wallet.usdBalance < cost) {
       toast({ title: "Insufficient Funds", description: "You don't have enough USD.", variant: "destructive" });
       return;
    }
    // Credit gold, Debit USD
    setWallet(prev => ({ 
      ...prev, 
      goldBalanceGrams: prev.goldBalanceGrams + grams,
      usdBalance: prev.usdBalance - cost
    }));
    
    // Add Transaction
    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      type: 'Buy',
      amountGrams: grams,
      amountUsd: cost,
      feeUsd: cost * 0.005,
      timestamp: new Date().toISOString(),
      referenceId: `REF-${Math.floor(Math.random() * 10000)}`,
      status: 'Completed',
      assetType: 'GOLD'
    };
    setTransactions(prev => [newTx, ...prev]);
    
    setActiveModal(null);
    toast({ title: "Purchase Successful", description: `You bought ${grams.toFixed(4)}g of gold.` });
  };

  const handleSellConfirm = (grams: number, payout: number) => {
    // Debit gold, Credit USD
    setWallet(prev => ({ 
      ...prev, 
      goldBalanceGrams: prev.goldBalanceGrams - grams,
      usdBalance: prev.usdBalance + payout
    }));

    // Add Transaction
    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      type: 'Sell',
      amountGrams: grams,
      amountUsd: payout,
      feeUsd: payout * 0.015,
      timestamp: new Date().toISOString(),
      referenceId: `REF-${Math.floor(Math.random() * 10000)}`,
      status: 'Completed',
      assetType: 'GOLD'
    };
    setTransactions(prev => [newTx, ...prev]);

    setActiveModal(null);
    toast({ title: "Sell Order Executed", description: `Sold ${grams.toFixed(4)}g for $${payout.toFixed(2)}.` });
  };

  const handleSendConfirm = (recipient: string, amount: number) => {
    // Debit USD
    setWallet(prev => ({ ...prev, usdBalance: prev.usdBalance - amount }));

    // Add Transaction
    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      type: 'Send',
      amountUsd: amount,
      feeUsd: 0,
      timestamp: new Date().toISOString(),
      referenceId: `REF-${Math.floor(Math.random() * 10000)}`,
      status: 'Completed',
      description: `Sent to ${recipient}`,
      assetType: 'USD'
    };
    setTransactions(prev => [newTx, ...prev]);

    setActiveModal(null);
    toast({ title: "Transfer Successful", description: `Sent $${amount.toFixed(2)} to ${recipient}.` });
  };

  const handleRequestConfirm = (from: string, amount: number) => {
    // Add Pending Transaction
    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      type: 'Request',
      amountUsd: amount,
      feeUsd: 0,
      timestamp: new Date().toISOString(),
      referenceId: `REF-${Math.floor(Math.random() * 10000)}`,
      status: 'Pending',
      description: `Requested from ${from}`,
      assetType: 'USD'
    };
    setTransactions(prev => [newTx, ...prev]);

    setActiveModal(null);
    toast({ title: "Request Sent", description: `Payment request of $${amount.toFixed(2)} sent to ${from}.` });
  };

  const handleQuickAction = (action: string) => {
    switch(action) {
      case 'buy': setActiveModal('buy'); break;
      case 'sell': setActiveModal('sell'); break;
      case 'send': setActiveModal('send'); break;
      case 'request': setActiveModal('request'); break;
      case 'bnsl': 
        toast({ title: "Navigate to BNSL", description: "Redirecting to Staking Module..." });
        break;
      case 'trade':
        toast({ title: "Navigate to FinaBridge", description: "Redirecting to Trade Finance Module..." });
        break;
    }
  };

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8 pb-12">
        
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-gradient-to-r from-[#8A2BE2]/10 via-transparent to-transparent p-6 rounded-2xl border border-white/5">
          <div className="flex items-center gap-4">
             <div className="p-3 bg-[#8A2BE2]/20 rounded-xl border border-[#8A2BE2]/30 text-[#8A2BE2] shadow-[0_0_15px_rgba(138,43,226,0.2)]">
                <WalletIcon className="w-8 h-8" />
             </div>
             <div>
               <h1 className="text-3xl font-bold text-white tracking-tight">FinaPay Wallet</h1>
               <p className="text-white/60 text-base">USD & Gold wallet for digital finance.</p>
             </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="text-left sm:text-right bg-black/20 px-4 py-2 rounded-lg border border-white/5 backdrop-blur-md">
               <p className="text-xs text-white/40 uppercase tracking-wider mb-0.5">Live Gold Spot</p>
               <div className="flex items-baseline gap-2">
                 <p className="text-[#D4AF37] text-2xl font-bold font-mono tracking-tight">${wallet.goldPriceUsdPerGram.toFixed(2)}</p>
                 <span className="text-xs text-white/40">/g</span>
               </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" className="h-10 w-10 border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 text-white/70 hover:text-white rounded-xl transition-all">
                 <RefreshCw className="w-5 h-5" />
              </Button>
              <Button variant="outline" size="icon" className="h-10 w-10 border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 text-white/70 hover:text-white rounded-xl transition-all">
                 <Bell className="w-5 h-5" />
              </Button>
              <Button variant="outline" size="icon" className="h-10 w-10 border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 text-white/70 hover:text-white rounded-xl transition-all">
                 <Settings className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* 1. Balance & Valuation */}
        <section>
          <WalletBalanceCards wallet={wallet} />
        </section>

        {/* 2. Quick Actions */}
        <section className="bg-white/5 rounded-2xl p-6 border border-white/5 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
             <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <span className="w-1 h-6 bg-gradient-to-b from-[#8A2BE2] to-transparent rounded-full"></span>
                Quick Actions
             </h3>
          </div>
          <QuickActions onAction={handleQuickAction} />
        </section>

        {/* 3. Charts & Analytics Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           <div className="lg:col-span-2 h-[450px]">
             <LiveGoldChart />
           </div>
           <div className="lg:col-span-1 h-[450px]">
             <WalletAnalytics wallet={wallet} />
           </div>
        </section>

        {/* 4. Transactions Table */}
        <section>
           <TransactionHistory transactions={transactions} />
        </section>

        {/* Modals */}
        <BuyGoldModal 
          isOpen={activeModal === 'buy'} 
          onClose={() => setActiveModal(null)}
          goldPrice={wallet.goldPriceUsdPerGram}
          onConfirm={handleBuyConfirm}
        />
        <SellGoldModal 
          isOpen={activeModal === 'sell'} 
          onClose={() => setActiveModal(null)}
          goldPrice={wallet.goldPriceUsdPerGram}
          walletBalance={wallet.goldBalanceGrams}
          onConfirm={handleSellConfirm}
        />
        <SendGoldModal 
          isOpen={activeModal === 'send'} 
          onClose={() => setActiveModal(null)}
          walletBalance={wallet.usdBalance}
          onConfirm={handleSendConfirm}
        />
        <RequestGoldModal 
          isOpen={activeModal === 'request'} 
          onClose={() => setActiveModal(null)}
          onConfirm={handleRequestConfirm}
        />

      </div>
    </DashboardLayout>
  );
}
