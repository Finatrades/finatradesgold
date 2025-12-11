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
  goldPriceUsdPerGram: 85.22,
  usdAedRate: 3.67,
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
  },
  {
    id: 'tx-003',
    type: 'Send',
    amountGrams: 2.500,
    amountUsd: 213.05,
    feeUsd: 0,
    timestamp: '2024-12-05T18:00:00Z',
    referenceId: 'REF-6651',
    status: 'Completed',
    description: 'Gift for Sarah',
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
    // Credit gold
    setWallet(prev => ({ ...prev, goldBalanceGrams: prev.goldBalanceGrams + grams }));
    
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
    };
    setTransactions(prev => [newTx, ...prev]);
    
    setActiveModal(null);
    toast({ title: "Purchase Successful", description: `You bought ${grams.toFixed(4)}g of gold.` });
  };

  const handleSellConfirm = (grams: number, payout: number) => {
    // Debit gold
    setWallet(prev => ({ ...prev, goldBalanceGrams: prev.goldBalanceGrams - grams }));

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
    };
    setTransactions(prev => [newTx, ...prev]);

    setActiveModal(null);
    toast({ title: "Sell Order Executed", description: `Sold ${grams.toFixed(4)}g for $${payout.toFixed(2)}.` });
  };

  const handleSendConfirm = (recipient: string, grams: number) => {
    // Debit gold
    setWallet(prev => ({ ...prev, goldBalanceGrams: prev.goldBalanceGrams - grams }));

    // Add Transaction
    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      type: 'Send',
      amountGrams: grams,
      amountUsd: grams * wallet.goldPriceUsdPerGram,
      feeUsd: 0,
      timestamp: new Date().toISOString(),
      referenceId: `REF-${Math.floor(Math.random() * 10000)}`,
      status: 'Completed',
      description: `Sent to ${recipient}`,
    };
    setTransactions(prev => [newTx, ...prev]);

    setActiveModal(null);
    toast({ title: "Transfer Successful", description: `Sent ${grams.toFixed(4)}g to ${recipient}.` });
  };

  const handleRequestConfirm = (from: string, grams: number) => {
    // Add Pending Transaction
    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      type: 'Request',
      amountGrams: grams,
      amountUsd: grams * wallet.goldPriceUsdPerGram,
      feeUsd: 0,
      timestamp: new Date().toISOString(),
      referenceId: `REF-${Math.floor(Math.random() * 10000)}`,
      status: 'Pending',
      description: `Requested from ${from}`,
    };
    setTransactions(prev => [newTx, ...prev]);

    setActiveModal(null);
    toast({ title: "Request Sent", description: `Payment request sent to ${from}.` });
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-[#8A2BE2]/10 rounded-lg border border-[#8A2BE2]/20 text-[#8A2BE2]">
                <WalletIcon className="w-6 h-6" />
             </div>
             <div>
               <h1 className="text-2xl font-bold text-white">FinaPay Wallet</h1>
               <p className="text-white/60 text-sm">Digital gold wallet for buying, selling and sending gold.</p>
             </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:block text-right">
               <p className="text-xs text-white/40 uppercase tracking-wider">Live Gold Spot</p>
               <p className="text-[#D4AF37] font-bold font-mono">${wallet.goldPriceUsdPerGram.toFixed(2)} <span className="text-xs text-white/40">/g</span></p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" className="text-white/60 hover:text-white hover:bg-white/10 rounded-full">
                 <RefreshCw className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-white/60 hover:text-white hover:bg-white/10 rounded-full">
                 <Bell className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-white/60 hover:text-white hover:bg-white/10 rounded-full">
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
        <section>
          <div className="flex items-center justify-between mb-3">
             <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider">Quick Actions</h3>
          </div>
          <QuickActions onAction={handleQuickAction} />
        </section>

        {/* 3. Charts & History */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           <div className="lg:col-span-2 h-[400px]">
             <LiveGoldChart />
           </div>
           <div className="lg:col-span-1 h-[400px]">
             <TransactionHistory transactions={transactions} />
           </div>
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
          walletBalance={wallet.goldBalanceGrams}
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
