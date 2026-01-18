import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useFinaPay } from '@/context/FinaPayContext';
import { usePlatform } from '@/context/PlatformContext';
import { normalizeStatus, getTransactionLabel } from '@/lib/transactionUtils';
import { 
  Wallet, RefreshCw, Loader2, ShoppingCart, Send, 
  ArrowDownLeft, Plus, Coins, Eye, EyeOff, 
  ChevronRight, TrendingUp, ArrowUpRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';

import BuyGoldWingoldModal from '@/components/finapay/modals/BuyGoldWingoldModal';
import SellGoldModal from '@/components/finapay/modals/SellGoldModal';
import SendGoldModal from '@/components/finapay/modals/SendGoldModal';
import RequestGoldModal from '@/components/finapay/modals/RequestGoldModal';
import DepositModal from '@/components/finapay/modals/DepositModal';
import WithdrawalModal from '@/components/finapay/modals/WithdrawalModal';

const parseNumericValue = (value: any): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  const parsed = parseFloat(String(value));
  return isNaN(parsed) ? 0 : parsed;
};

export default function MobileFinaPay() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { settings } = usePlatform();
  
  const [showBalance, setShowBalance] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  
  const isKycApproved = user?.kycStatus === 'Approved';
  
  const handleKycRequired = () => {
    toast({
      title: "KYC Verification Required",
      description: "Please complete your KYC verification to access this feature.",
      variant: "destructive",
    });
    setLocation('/kyc');
  };
  
  const { 
    wallet: rawWallet, 
    transactions: contextTransactions, 
    currentGoldPriceUsdPerGram, 
    refreshWallet,
    refreshTransactions,
    loading 
  } = useFinaPay();

  const goldGrams = rawWallet ? parseNumericValue(rawWallet.goldGrams) : 0;
  const usdBalance = rawWallet ? parseNumericValue(rawWallet.usdBalance) : 0;
  const goldValueUsd = goldGrams * currentGoldPriceUsdPerGram;
  const totalValueUsd = usdBalance + goldValueUsd;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refreshWallet(), refreshTransactions()]);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const transactions = contextTransactions.slice(0, 5).map((tx: any) => ({
    id: tx.id || String(Math.random()),
    type: getTransactionLabel(tx.type || tx.actionType || 'Transfer'),
    amountGrams: tx.amountGold != null ? parseNumericValue(tx.amountGold) : (tx.amountGrams != null ? parseNumericValue(tx.amountGrams) : undefined),
    amountUsd: parseNumericValue(tx.amountUsd),
    timestamp: tx.createdAt,
    status: normalizeStatus(tx.status),
    description: tx.description || ''
  }));

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
      
      handleRefresh();
      setShowSellModal(false);
      toast({ title: "Sell Order Submitted", description: `Your order to sell ${grams.toFixed(4)}g has been submitted.` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to submit sell order.", variant: "destructive" });
    }
  };

  const handleSendConfirm = async (recipient: string, amount: number, asset: 'USD' | 'GOLD') => {
    setShowSendModal(false);
    handleRefresh();
  };

  const handleRequestConfirm = async (from: string, amount: number, asset: 'USD' | 'GOLD') => {
    setShowRequestModal(false);
    handleRefresh();
  };

  const quickActions = [
    { icon: Plus, label: 'Add', gradient: 'from-green-500 to-emerald-600', action: () => isKycApproved ? setShowDepositModal(true) : handleKycRequired() },
    { icon: ShoppingCart, label: 'Buy', gradient: 'from-purple-500 to-violet-600', action: () => isKycApproved ? setShowBuyModal(true) : handleKycRequired() },
    { icon: Coins, label: 'Sell', gradient: 'from-amber-500 to-orange-600', action: () => isKycApproved ? setShowSellModal(true) : handleKycRequired() },
    { icon: Send, label: 'Send', gradient: 'from-blue-500 to-indigo-600', action: () => isKycApproved ? setShowSendModal(true) : handleKycRequired() },
    { icon: ArrowDownLeft, label: 'Request', gradient: 'from-pink-500 to-rose-600', action: () => isKycApproved ? setShowRequestModal(true) : handleKycRequired() },
    { icon: ArrowUpRight, label: 'Withdraw', gradient: 'from-slate-500 to-gray-600', action: () => isKycApproved ? setShowWithdrawalModal(true) : handleKycRequired() },
  ];

  return (
    <div className="space-y-4 pb-24">
      {/* Hero Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-700 p-6 text-white shadow-xl"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full blur-xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                <Wallet className="w-5 h-5" />
              </div>
              <span className="font-medium text-white/90">FinaPay Wallet</span>
            </div>
            <div className="flex items-center gap-2">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowBalance(!showBalance)}
                className="p-2 bg-white/10 rounded-full backdrop-blur-sm"
              >
                {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.9, rotate: 180 }}
                onClick={handleRefresh}
                className="p-2 bg-white/10 rounded-full backdrop-blur-sm"
                disabled={isRefreshing}
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </motion.button>
            </div>
          </div>
          
          <div className="mb-1">
            <p className="text-xs text-white/70 uppercase tracking-wider mb-1">Total Portfolio Value</p>
            <h2 className="text-4xl font-bold tracking-tight">
              {showBalance ? `$${totalValueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '••••••'}
            </h2>
          </div>
          
          <div className="flex items-center gap-3 mt-3">
            <div className="flex items-center gap-1 bg-white/10 px-3 py-1.5 rounded-full text-sm backdrop-blur-sm">
              <Coins className="w-3.5 h-3.5 text-amber-300" />
              <span>{showBalance ? `${goldGrams.toFixed(4)}g` : '••••'}</span>
            </div>
            <div className="flex items-center gap-1 text-white/70 text-sm">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>${currentGoldPriceUsdPerGram.toFixed(2)}/g</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
        <div className="flex gap-3 min-w-max pb-2">
          {quickActions.map((action, index) => (
            <motion.button
              key={action.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={action.action}
              className="flex flex-col items-center gap-2 min-w-[70px]"
              data-testid={`btn-quick-${action.label.toLowerCase()}`}
            >
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${action.gradient} flex items-center justify-center shadow-lg`}>
                <action.icon className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-medium text-foreground">{action.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Wallet Cards */}
      <div className="space-y-3">
        {/* LGPW Card */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/50 p-5"
        >
          <div className="absolute right-3 bottom-3 opacity-10">
            <Coins className="w-16 h-16 text-amber-600" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-amber-100 rounded-lg">
                <Coins className="w-4 h-4 text-amber-600" />
              </div>
              <span className="text-sm font-semibold text-amber-800">LGPW - Liquid Gold</span>
            </div>
            <p className="text-2xl font-bold text-amber-900">
              {showBalance ? `${goldGrams.toFixed(4)} g` : '••••••'}
            </p>
            <p className="text-sm text-amber-700/70 mt-1">
              ≈ ${showBalance ? goldValueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '••••'}
            </p>
          </div>
        </motion.div>

        {/* FGPW Card */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200/50 p-5"
        >
          <div className="absolute right-3 bottom-3 opacity-10">
            <Wallet className="w-16 h-16 text-green-600" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-green-100 rounded-lg">
                <Wallet className="w-4 h-4 text-green-600" />
              </div>
              <span className="text-sm font-semibold text-green-800">FGPW - Fiat Balance</span>
            </div>
            <p className="text-2xl font-bold text-green-900">
              {showBalance ? `$${usdBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '••••••'}
            </p>
            <p className="text-sm text-green-700/70 mt-1">Available for purchases</p>
          </div>
        </motion.div>
      </div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-border shadow-sm"
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Recent Activity</h3>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-primary text-sm"
            onClick={() => setLocation('/finapay')}
          >
            View All
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
        
        {transactions.length === 0 ? (
          <div className="p-8 text-center">
            <Coins className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground text-sm">No transactions yet</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {transactions.map((tx, index) => (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-4 hover:bg-muted/30 active:bg-muted/50 transition-colors"
                data-testid={`tx-item-${tx.id}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    tx.type.toLowerCase().includes('buy') ? 'bg-purple-100 text-purple-600' :
                    tx.type.toLowerCase().includes('sell') ? 'bg-amber-100 text-amber-600' :
                    tx.type.toLowerCase().includes('send') ? 'bg-blue-100 text-blue-600' :
                    tx.type.toLowerCase().includes('receive') ? 'bg-green-100 text-green-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {tx.type.toLowerCase().includes('buy') ? <ShoppingCart className="w-4 h-4" /> :
                     tx.type.toLowerCase().includes('sell') ? <Coins className="w-4 h-4" /> :
                     tx.type.toLowerCase().includes('send') ? <Send className="w-4 h-4" /> :
                     tx.type.toLowerCase().includes('receive') ? <ArrowDownLeft className="w-4 h-4" /> :
                     <ArrowUpRight className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="font-medium text-sm text-foreground">{tx.type}</p>
                    <p className="text-xs text-muted-foreground">
                      {tx.timestamp ? new Date(tx.timestamp).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  {tx.amountGrams !== undefined ? (
                    <p className="font-semibold text-sm text-foreground">{tx.amountGrams.toFixed(4)} g</p>
                  ) : (
                    <p className="font-semibold text-sm text-foreground">${tx.amountUsd.toFixed(2)}</p>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    tx.status === 'completed' ? 'bg-green-100 text-green-700' :
                    tx.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {tx.status}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Modals */}
      <BuyGoldWingoldModal
        isOpen={showBuyModal}
        onClose={() => setShowBuyModal(false)}
        onSuccess={() => {
          setShowBuyModal(false);
          handleRefresh();
        }}
      />
      <SellGoldModal
        isOpen={showSellModal}
        onClose={() => setShowSellModal(false)}
        goldPrice={currentGoldPriceUsdPerGram}
        walletBalance={goldGrams}
        spreadPercent={settings?.sellSpreadPercent || 1}
        onConfirm={handleSellConfirm}
      />
      <SendGoldModal
        isOpen={showSendModal}
        onClose={() => setShowSendModal(false)}
        walletBalance={usdBalance}
        goldBalance={goldGrams}
        onConfirm={handleSendConfirm}
      />
      <RequestGoldModal
        isOpen={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        onConfirm={handleRequestConfirm}
      />
      <DepositModal
        isOpen={showDepositModal}
        onClose={() => {
          setShowDepositModal(false);
          handleRefresh();
        }}
      />
      <WithdrawalModal
        isOpen={showWithdrawalModal}
        onClose={() => {
          setShowWithdrawalModal(false);
          handleRefresh();
        }}
        walletBalance={usdBalance}
      />
    </div>
  );
}
