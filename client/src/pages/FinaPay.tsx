import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Wallet, Transaction } from '@/types/finapay';

// Components
import TopMetricsRow from '@/components/finapay/TopMetricsRow';
import WalletCardsRow from '@/components/finapay/WalletCardsRow';
import QuickActionsSidebar from '@/components/finapay/QuickActionsSidebar';
import LiveGoldChart from '@/components/finapay/LiveGoldChart';

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
      <div className="max-w-[1400px] mx-auto space-y-6 pb-12 pt-4 px-4 md:px-6">
        
        {/* Row 2: Wallet Cards */}
        <section className="pt-6">
           <WalletCardsRow wallet={wallet} />
        </section>

        {/* Row 3: Main Chart Area & Sidebar */}
        <section className="grid grid-cols-1 lg:grid-cols-4 gap-6">
           {/* Chart - Left 3/4 */}
           <div className="lg:col-span-3 h-[400px]">
             <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 h-full">
               <div className="flex justify-between items-center mb-4">
                 <h3 className="font-bold text-gray-900">Gold Price Chart</h3>
                 <div className="flex gap-2">
                    <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-600 rounded">1H</span>
                    <span className="px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 rounded cursor-pointer">4H</span>
                    <span className="px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 rounded cursor-pointer">1D</span>
                 </div>
               </div>
               <div className="h-[300px] w-full">
                 <LiveGoldChart />
               </div>
             </div>
           </div>

           {/* Sidebar - Right 1/4 */}
           <div className="lg:col-span-1 h-full">
             <QuickActionsSidebar onAction={handleQuickAction} />
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
