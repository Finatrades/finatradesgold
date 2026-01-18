import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, ShoppingCart, Landmark, Send, Download, Clock, 
  Coins, TrendingUp, Database, ArrowUpRight, Sparkles, RefreshCw
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useUnifiedTransactions } from '@/hooks/useUnifiedTransactions';
import { normalizeStatus, getTransactionLabel } from '@/lib/transactionUtils';
import { Badge } from '@/components/ui/badge';
import { useLocation } from 'wouter';
import MobileKPICard from './MobileKPICard';
import MobileQuickActionButton from './MobileQuickActionButton';
import MobileRecentActivity from './MobileRecentActivity';
import BuyGoldWingoldModal from '@/components/finapay/modals/BuyGoldWingoldModal';

function formatNumber(num: number | null | undefined, decimals = 2): string {
  if (num === null || num === undefined || isNaN(num)) return '0.00';
  return num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export default function MobileDashboard() {
  const { user } = useAuth();
  const { totals, goldPrice, goldPriceSource, isLoading, refetch } = useDashboardData();
  const { transactions: unifiedTx } = useUnifiedTransactions({ limit: 5 });
  const [, setLocation] = useLocation();
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const transactions = unifiedTx.map(tx => ({
    id: tx.id,
    type: getTransactionLabel(tx.actionType),
    status: normalizeStatus(tx.status),
    amountGold: tx.grams ? parseFloat(tx.grams) : undefined,
    amountUsd: tx.usd ? parseFloat(tx.usd) : undefined,
    description: tx.description || undefined,
    createdAt: tx.createdAt,
  }));

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  if (!user) return null;
  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-48 bg-gray-200 rounded-2xl"></div>
        <div className="h-16 bg-gray-200 rounded-xl"></div>
        <div className="grid grid-cols-2 gap-2">
          <div className="h-24 bg-gray-200 rounded-xl"></div>
          <div className="h-24 bg-gray-200 rounded-xl"></div>
          <div className="h-24 bg-gray-200 rounded-xl"></div>
          <div className="h-24 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  const userName = user.firstName || user.email?.split('@')[0] || 'User';
  const isGoldPriceLive = goldPriceSource && !goldPriceSource.includes('fallback');
  const totalGoldGrams = (totals.walletGoldGrams || 0) + (totals.vaultGoldGrams || 0);
  const totalPortfolioValue = totals.totalPortfolioUsd || 0;

  const quickActions = [
    { icon: Plus, label: 'Add', gradient: 'bg-gradient-to-br from-emerald-400 to-emerald-600', onClick: () => setLocation('/finapay') },
    { icon: ShoppingCart, label: 'Buy', gradient: 'bg-gradient-to-br from-purple-500 to-purple-700', onClick: () => setShowBuyModal(true) },
    { icon: Landmark, label: 'Deposit', gradient: 'bg-gradient-to-br from-amber-400 to-amber-600', onClick: () => setLocation('/finavault') },
    { icon: Send, label: 'Send', gradient: 'bg-gradient-to-br from-blue-400 to-blue-600', onClick: () => setLocation('/finapay') },
    { icon: Download, label: 'Request', gradient: 'bg-gradient-to-br from-pink-400 to-pink-600', onClick: () => setLocation('/finapay') },
    { icon: Clock, label: 'BNSL', gradient: 'bg-gradient-to-br from-fuchsia-500 to-fuchsia-700', onClick: () => setLocation('/bnsl') },
  ];

  return (
    <div className="space-y-4 pb-4">
      {/* Hero Balance Card - Premium Glassmorphism */}
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-600 via-fuchsia-500 to-pink-500 p-6 shadow-2xl"
      >
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/20 rounded-full blur-3xl -mr-16 -mt-16" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-pink-400/30 rounded-full blur-3xl -ml-16 -mb-16" />
        <div className="absolute top-1/2 left-1/2 w-32 h-32 bg-yellow-400/10 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2" />
        
        <motion.div 
          className="absolute top-4 right-4 w-20 h-20 rounded-full border border-white/10"
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <motion.p 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="text-white/80 text-xs font-medium tracking-wide"
              >
                Welcome back
              </motion.p>
              <motion.h1 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
                className="text-white text-2xl font-bold"
              >
                {userName}
              </motion.h1>
            </div>
            <div className="flex items-center gap-2">
              <motion.button
                whileTap={{ scale: 0.9, rotate: 180 }}
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-lg border border-white/20 flex items-center justify-center shadow-lg"
              >
                <RefreshCw className={`w-4 h-4 text-white ${isRefreshing ? 'animate-spin' : ''}`} />
              </motion.button>
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg"
              >
                <Coins className="w-5 h-5 text-white" />
              </motion.div>
            </div>
          </div>
          
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-5"
          >
            <p className="text-white/70 text-xs mb-1 uppercase tracking-wider font-medium">Total Portfolio</p>
            <div className="flex items-baseline gap-2">
              <motion.p 
                key={totalPortfolioValue}
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
                className="text-white text-4xl font-bold tracking-tight"
              >
                ${formatNumber(totalPortfolioValue)}
              </motion.p>
              <span className="text-emerald-300 text-sm font-semibold flex items-center gap-0.5">
                <TrendingUp className="w-3 h-3" />
              </span>
            </div>
            <p className="text-white/60 text-sm mt-1 font-medium">
              ≈ {formatNumber(totalGoldGrams, 4)}g gold
            </p>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-white/20"
          >
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2.5 text-center">
              <p className="text-white/60 text-[10px] uppercase tracking-wider mb-0.5">USD</p>
              <p className="text-white font-bold text-sm">${formatNumber(totalGoldGrams * goldPrice)}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2.5 text-center">
              <p className="text-white/60 text-[10px] uppercase tracking-wider mb-0.5">AED</p>
              <p className="text-white font-bold text-sm">{formatNumber(totalGoldGrams * goldPrice * 3.67)}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2.5 text-center">
              <p className="text-white/60 text-[10px] uppercase tracking-wider mb-0.5">Vault</p>
              <p className="text-white font-bold text-sm">{formatNumber((totals.vaultGoldGrams || 0), 2)}g</p>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Quick Actions - Horizontal Scroll */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="overflow-x-auto scrollbar-hide -mx-4 px-4"
      >
        <div className="flex gap-3 pb-2" style={{ width: 'max-content' }}>
          {quickActions.map((action, idx) => (
            <MobileQuickActionButton
              key={action.label}
              icon={action.icon}
              label={action.label}
              gradient={action.gradient}
              onClick={action.onClick}
              delay={idx}
            />
          ))}
        </div>
      </motion.div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-2">
        <MobileKPICard
          icon={Sparkles}
          label="BNSL"
          value={`${formatNumber(totals.bnslLockedGrams || 0, 1)}g`}
          subValue={`+$${formatNumber(totals.bnslTotalProfit || 0)}`}
          gradient="purple"
          delay={0}
          onClick={() => setLocation('/bnsl')}
        />
        <MobileKPICard
          icon={Database}
          label="Vault"
          value={`${formatNumber(totals.vaultGoldGrams || 0, 2)}g`}
          subValue="FinaVault"
          gradient="amber"
          delay={1}
          onClick={() => setLocation('/finavault')}
        />
        <MobileKPICard
          icon={ArrowUpRight}
          label="Profit"
          value={`+$${formatNumber(totals.bnslTotalProfit || 0)}`}
          subValue="Total ROI"
          gradient="emerald"
          delay={2}
        />
        <MobileKPICard
          icon={TrendingUp}
          label="Growth"
          value={`${formatNumber(totals.walletGoldGrams || 0, 2)}g`}
          subValue="Wallet"
          gradient="blue"
          delay={3}
          onClick={() => setLocation('/finapay')}
        />
      </div>

      {/* LGPW & FGPW Cards */}
      <div className="grid grid-cols-1 gap-3">
        {/* LGPW Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 p-4"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Coins className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">LGPW</h3>
                  <p className="text-[10px] text-purple-200">Live Gold Price</p>
                </div>
              </div>
              <Badge className="bg-white/20 text-white border-0 text-[10px] px-2 py-0.5">
                {isGoldPriceLive ? 'Live' : 'Cached'}
              </Badge>
            </div>
            
            <div className="mb-3">
              <p className="text-xs text-purple-200 mb-0.5">Available</p>
              <p className="text-2xl font-bold text-white">
                {formatNumber(totals.mpgwAvailableGrams || 0, 4)}g
              </p>
              <p className="text-xs text-purple-200 mt-0.5">
                ≈ ${formatNumber((totals.mpgwAvailableGrams || 0) * goldPrice)}
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/20">
              <div>
                <p className="text-[10px] text-purple-200">Pending</p>
                <p className="text-sm font-semibold text-white">{formatNumber(totals.mpgwPendingGrams || 0, 4)}g</p>
              </div>
              <div>
                <p className="text-[10px] text-purple-200">Locked</p>
                <p className="text-sm font-semibold text-white">{formatNumber(totals.mpgwLockedBnslGrams || 0, 4)}g</p>
              </div>
            </div>
          </div>
        </motion.div>
        
        {/* FGPW Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-500 via-amber-600 to-orange-700 p-4"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Database className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">FGPW</h3>
                  <p className="text-[10px] text-amber-100">Fixed Gold Price</p>
                </div>
              </div>
              <Badge className="bg-white/20 text-white border-0 text-[10px] px-2 py-0.5">Fixed</Badge>
            </div>
            
            <div className="mb-3">
              <p className="text-xs text-amber-100 mb-0.5">Available</p>
              <p className="text-2xl font-bold text-white">
                {formatNumber(totals.fpgwAvailableGrams || 0, 4)}g
              </p>
              <p className="text-xs text-amber-100 mt-0.5">
                {totals.fpgwWeightedAvgPriceUsd ? `Cost: $${formatNumber(totals.fpgwWeightedAvgPriceUsd, 2)}/g` : 'No holdings'}
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/20">
              <div>
                <p className="text-[10px] text-amber-100">Pending</p>
                <p className="text-sm font-semibold text-white">{formatNumber(totals.fpgwPendingGrams || 0, 4)}g</p>
              </div>
              <div>
                <p className="text-[10px] text-amber-100">Locked</p>
                <p className="text-sm font-semibold text-white">{formatNumber(totals.fpgwLockedBnslGrams || 0, 4)}g</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Recent Activity */}
      <MobileRecentActivity 
        transactions={transactions} 
        goldPrice={goldPrice}
        maxItems={5}
      />

      {/* Modals */}
      <BuyGoldWingoldModal
        isOpen={showBuyModal}
        onClose={() => setShowBuyModal(false)}
        onSuccess={() => {
          setShowBuyModal(false);
          handleRefresh();
        }}
      />
    </div>
  );
}
