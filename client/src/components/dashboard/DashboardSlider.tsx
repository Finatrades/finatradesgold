import React from 'react';
import { motion } from 'framer-motion';
import { Wallet, CreditCard, TrendingUp, ArrowRight } from 'lucide-react';
import { Link } from 'wouter';
import { Card } from '@/components/ui/card';
import { useDashboardData } from '@/hooks/useDashboardData';

export default function DashboardSlider() {
  const { totals, transactions, bnslPlans } = useDashboardData();
  
  const pendingTransactions = transactions.filter(t => t.status === 'Pending');
  const pendingGoldGrams = pendingTransactions.reduce((sum, t) => {
    return sum + parseFloat(t.amountGold || '0');
  }, 0);
  const activeBnslPlans = bnslPlans.filter((p: any) => p.status === 'Active').length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* FinaPay Wallet */}
      <motion.div
        whileHover={{ scale: 1.01 }}
        transition={{ duration: 0.2 }}
      >
        <Card className="p-5 bg-white border-l-4 border-l-emerald-500 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Wallet className="w-4 h-4 text-emerald-600" />
              </div>
              <h4 className="font-semibold text-foreground">FinaPay Wallet</h4>
            </div>
            <Link href="/finapay">
              <span className="text-xs text-emerald-600 font-medium hover:underline cursor-pointer flex items-center gap-1" data-testid="link-finapay-view">
                View <ArrowRight className="w-3 h-3" />
              </span>
            </Link>
          </div>
          
          <div className="mb-4">
            <p className="text-xs text-muted-foreground mb-1">Available Balance</p>
            <p className="text-2xl font-bold text-foreground" data-testid="text-finapay-balance">
              {totals.walletGoldGrams.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-base font-normal text-muted-foreground">g</span>
            </p>
            <p className="text-xs text-muted-foreground">
              ≈ ${(totals.walletGoldGrams * 85).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
            </p>
          </div>
          
          <div className="flex gap-6 pt-3 border-t border-border">
            <div>
              <p className="text-xs text-muted-foreground">Pending</p>
              <p className="text-sm font-semibold text-emerald-600" data-testid="text-finapay-pending">{pendingGoldGrams.toFixed(2)}g</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Transactions</p>
              <p className="text-sm font-semibold text-foreground" data-testid="text-finapay-transactions">{transactions.length}</p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* FinaCard */}
      <motion.div
        whileHover={{ scale: 1.01 }}
        transition={{ duration: 0.2 }}
      >
        <Card className="p-5 bg-white border-l-4 border-l-amber-500 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-amber-600" />
              </div>
              <h4 className="font-semibold text-foreground">FinaCard</h4>
            </div>
            <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded-full">
              Coming Soon
            </span>
          </div>
          
          <div className="mb-4">
            <p className="text-xs text-muted-foreground mb-1">Available Balance</p>
            <p className="text-2xl font-bold text-foreground">
              0.00 <span className="text-base font-normal text-muted-foreground">g</span>
            </p>
            <p className="text-xs text-muted-foreground">≈ $0.00 USD</p>
          </div>
          
          <div className="flex gap-6 pt-3 border-t border-border">
            <div>
              <p className="text-xs text-muted-foreground">Card Status</p>
              <p className="text-sm font-semibold text-amber-600">Not Activated</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Rewards</p>
              <p className="text-sm font-semibold text-foreground">0 pts</p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* BNSL Wallet */}
      <motion.div
        whileHover={{ scale: 1.01 }}
        transition={{ duration: 0.2 }}
      >
        <Card className="p-5 bg-white border-l-4 border-l-emerald-500 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <h4 className="font-semibold text-foreground">BNSL Wallet</h4>
            </div>
            <Link href="/bnsl">
              <span className="text-xs text-emerald-600 font-medium hover:underline cursor-pointer flex items-center gap-1" data-testid="link-bnsl-view">
                View <ArrowRight className="w-3 h-3" />
              </span>
            </Link>
          </div>
          
          <div className="mb-4">
            <p className="text-xs text-muted-foreground mb-1">Available Balance</p>
            <p className="text-2xl font-bold text-foreground" data-testid="text-bnsl-balance">
              {totals.bnslLockedGrams.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-base font-normal text-muted-foreground">g</span>
            </p>
            <p className="text-xs text-muted-foreground">
              ≈ ${(totals.bnslLockedGrams * 85).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
            </p>
          </div>
          
          <div className="flex gap-6 pt-3 border-t border-border">
            <div>
              <p className="text-xs text-muted-foreground">Locked</p>
              <p className="text-sm font-semibold text-emerald-600" data-testid="text-bnsl-locked">
                {totals.bnslLockedGrams.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}g
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Active Plans</p>
              <p className="text-sm font-semibold text-foreground" data-testid="text-bnsl-plans">{activeBnslPlans}</p>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
