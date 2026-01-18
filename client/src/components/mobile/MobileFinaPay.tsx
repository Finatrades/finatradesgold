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
      {/* Hero Balance Card - Premium Glassmorphism */}
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-600 via-violet-500 to-indigo-600 p-6 text-white shadow-2xl"
      >
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/20 rounded-full blur-3xl -mr-16 -mt-16" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-violet-400/30 rounded-full blur-3xl -ml-16 -mb-16" />
        <div className="absolute top-1/2 left-1/3 w-32 h-32 bg-cyan-400/10 rounded-full blur-2xl" />
        
        <motion.div 
          className="absolute bottom-6 right-6 w-24 h-24 rounded-full border border-white/10"
          animate={{ rotate: 360 }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              <div className="p-2.5 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl shadow-lg">
                <Wallet className="w-5 h-5" />
              </div>
              <span className="font-semibold text-white text-lg">FinaPay</span>
            </motion.div>
            <div className="flex items-center gap-2">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowBalance(!showBalance)}
                className="w-10 h-10 bg-white/15 backdrop-blur-lg border border-white/20 rounded-xl flex items-center justify-center shadow-lg"
              >
                {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.9, rotate: 180 }}
                onClick={handleRefresh}
                className="w-10 h-10 bg-white/15 backdrop-blur-lg border border-white/20 rounded-xl flex items-center justify-center shadow-lg"
                disabled={isRefreshing}
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </motion.button>
            </div>
          </div>
          
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-2"
          >
            <p className="text-xs text-white/70 uppercase tracking-wider mb-1 font-medium">Total Portfolio</p>
            <motion.h2 
              key={totalValueUsd}
              initial={{ scale: 1.05 }}
              animate={{ scale: 1 }}
              className="text-4xl font-bold tracking-tight"
            >
              {showBalance ? `$${totalValueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '••••••'}
            </motion.h2>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="flex items-center gap-3 mt-4"
          >
            <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm px-4 py-2 rounded-xl text-sm border border-white/10 shadow-lg">
              <Coins className="w-4 h-4 text-amber-300" />
              <span className="font-semibold">{showBalance ? `${goldGrams.toFixed(4)}g` : '••••'}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-emerald-500/20 backdrop-blur-sm px-3 py-2 rounded-xl text-sm">
              <TrendingUp className="w-4 h-4 text-emerald-300" />
              <span className="font-medium text-emerald-200">${currentGoldPriceUsdPerGram.toFixed(2)}/g</span>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Quick Actions - Premium Style */}
      <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
        <div className="flex gap-3 min-w-max pb-2">
          {quickActions.map((action, index) => (
            <motion.button
              key={action.label}
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ 
                delay: index * 0.06, 
                type: "spring", 
                stiffness: 400, 
                damping: 20 
              }}
              whileTap={{ scale: 0.88 }}
              whileHover={{ y: -3 }}
              onClick={action.action}
              className="flex flex-col items-center gap-2 min-w-[72px] group"
              data-testid={`btn-quick-${action.label.toLowerCase()}`}
            >
              <div className="relative">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${action.gradient} shadow-xl flex items-center justify-center relative overflow-hidden`}>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-white/20" />
                  <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/20 rounded-t-2xl" />
                  <action.icon className="w-6 h-6 text-white relative z-10 drop-shadow-sm" />
                </div>
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-400/30 to-pink-400/30 rounded-2xl blur-lg opacity-0 group-active:opacity-100 -z-10 transition-opacity" />
              </div>
              <span className="text-[11px] font-semibold text-gray-700">{action.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Wallet Cards - Premium Glassmorphism */}
      <div className="space-y-3">
        {/* LGPW Card */}
        <motion.div
          initial={{ opacity: 0, x: -20, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.1 }}
          whileTap={{ scale: 0.98 }}
          className="relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-xl border border-amber-200/50 p-5 shadow-lg shadow-amber-100/50"
        >
          <div className="absolute -top-6 -right-6 w-24 h-24 bg-gradient-to-br from-amber-200/40 to-orange-200/40 rounded-full blur-2xl" />
          <div className="absolute right-4 bottom-4 opacity-5">
            <Coins className="w-20 h-20 text-amber-600" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2.5 mb-3">
              <motion.div 
                className="p-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl shadow-lg"
                whileHover={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 0.4 }}
              >
                <Coins className="w-4 h-4 text-white" />
              </motion.div>
              <span className="text-sm font-bold text-amber-800 uppercase tracking-wide">LGPW - Liquid Gold</span>
            </div>
            <motion.p 
              key={goldGrams}
              initial={{ scale: 1.05 }}
              animate={{ scale: 1 }}
              className="text-2xl font-bold text-amber-900 tracking-tight"
            >
              {showBalance ? `${goldGrams.toFixed(4)} g` : '••••••'}
            </motion.p>
            <p className="text-sm text-amber-700/70 mt-1 font-medium">
              ≈ ${showBalance ? goldValueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '••••'}
            </p>
          </div>
        </motion.div>

        {/* FGPW Card */}
        <motion.div
          initial={{ opacity: 0, x: 20, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.15 }}
          whileTap={{ scale: 0.98 }}
          className="relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-xl border border-emerald-200/50 p-5 shadow-lg shadow-emerald-100/50"
        >
          <div className="absolute -top-6 -right-6 w-24 h-24 bg-gradient-to-br from-emerald-200/40 to-green-200/40 rounded-full blur-2xl" />
          <div className="absolute right-4 bottom-4 opacity-5">
            <Wallet className="w-20 h-20 text-emerald-600" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2.5 mb-3">
              <motion.div 
                className="p-2 bg-gradient-to-br from-emerald-400 to-green-600 rounded-xl shadow-lg"
                whileHover={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 0.4 }}
              >
                <Wallet className="w-4 h-4 text-white" />
              </motion.div>
              <span className="text-sm font-bold text-emerald-800 uppercase tracking-wide">FGPW - Fiat Balance</span>
            </div>
            <motion.p 
              key={usdBalance}
              initial={{ scale: 1.05 }}
              animate={{ scale: 1 }}
              className="text-2xl font-bold text-emerald-900 tracking-tight"
            >
              {showBalance ? `$${usdBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '••••••'}
            </motion.p>
            <p className="text-sm text-emerald-700/70 mt-1 font-medium">Available for purchases</p>
          </div>
        </motion.div>
      </div>

      {/* Recent Activity - Modern Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 300, damping: 25 }}
        className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-lg overflow-hidden"
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100/80 bg-gradient-to-r from-gray-50/50 to-white">
          <h3 className="font-bold text-gray-900">Recent Activity</h3>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-purple-600 text-sm font-semibold hover:text-purple-700 hover:bg-purple-50"
            onClick={() => setLocation('/finapay')}
          >
            View All
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
        
        {transactions.length === 0 ? (
          <div className="p-10 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center">
              <Coins className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium">No transactions yet</p>
            <p className="text-gray-400 text-sm mt-1">Your activity will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100/80">
            {transactions.map((tx, index) => (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                whileTap={{ backgroundColor: "rgba(0,0,0,0.02)" }}
                className="flex items-center justify-between p-4 active:bg-gray-50/50 transition-colors"
                data-testid={`tx-item-${tx.id}`}
              >
                <div className="flex items-center gap-3">
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-sm ${
                      tx.type.toLowerCase().includes('buy') ? 'bg-gradient-to-br from-purple-100 to-violet-100 text-purple-600' :
                      tx.type.toLowerCase().includes('sell') ? 'bg-gradient-to-br from-amber-100 to-orange-100 text-amber-600' :
                      tx.type.toLowerCase().includes('send') ? 'bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-600' :
                      tx.type.toLowerCase().includes('receive') ? 'bg-gradient-to-br from-green-100 to-emerald-100 text-green-600' :
                      'bg-gradient-to-br from-gray-100 to-slate-100 text-gray-600'
                    }`}
                  >
                    {tx.type.toLowerCase().includes('buy') ? <ShoppingCart className="w-5 h-5" /> :
                     tx.type.toLowerCase().includes('sell') ? <Coins className="w-5 h-5" /> :
                     tx.type.toLowerCase().includes('send') ? <Send className="w-5 h-5" /> :
                     tx.type.toLowerCase().includes('receive') ? <ArrowDownLeft className="w-5 h-5" /> :
                     <ArrowUpRight className="w-5 h-5" />}
                  </motion.div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{tx.type}</p>
                    <p className="text-xs text-gray-500">
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
