import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { Database, DollarSign, TrendingUp, LineChart, Globe, Coins, Loader2 } from 'lucide-react';
import { useDashboardData } from '@/hooks/useDashboardData';

import KpiCard from '@/components/dashboard/KpiCard';
import ChartCard from '@/components/dashboard/ChartCard';
import TransactionsTable from '@/components/dashboard/TransactionsTable';
import ReferralCard from '@/components/dashboard/ReferralCard';
import WalletCard from '@/components/dashboard/WalletCard';
import FinaPayCard from '@/components/dashboard/FinaPayCard';
import DashboardSlider from '@/components/dashboard/DashboardSlider';
import QuickActionsTop from '@/components/dashboard/QuickActionsTop';

function formatNumber(num: number, decimals = 2): string {
  return num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function formatGrams(grams: number): string {
  if (grams >= 1000) {
    return `${formatNumber(grams / 1000, 3)} kg`;
  }
  return `${formatNumber(grams, 3)} g`;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { totals, wallet, transactions, goldPrice, isLoading } = useDashboardData();

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8">

        {/* 1. Header Section */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard Overview</h1>
          <p className="text-muted-foreground">Welcome back to your financial command center.</p>
        </div>

        {/* 1.5 Quick Actions Horizontal */}
        <section>
          <QuickActionsTop />
        </section>
        
        {/* 2. Top KPI Cards Grid */}
        <section>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-secondary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <KpiCard 
                title="Gold Storage (Vault)" 
                value={formatGrams(totals.vaultGoldGrams)}
                definition="Total physical gold stored in FinaVault"
                icon={<Database className="w-5 h-5" />}
                delay={0}
              />
              <KpiCard 
                title="Vault Value (USD)" 
                value={`$${formatNumber(totals.vaultGoldValueUsd)}`}
                definition="Current market value of your vault holdings in USD"
                icon={<DollarSign className="w-5 h-5" />}
                delay={1}
              />
              <KpiCard 
                title="Vault Value (AED)" 
                value={`AED ${formatNumber(totals.vaultGoldValueAed)}`}
                definition="Current market value of your vault holdings in AED"
                icon={<Globe className="w-5 h-5" />}
                delay={2}
              />
              <KpiCard 
                title="Total Portfolio" 
                value={`$${formatNumber(totals.totalPortfolioUsd)}`}
                subValue={`Gold @ $${formatNumber(goldPrice, 2)}/g`}
                definition="Combined value of vault holdings, wallet balance, and cash"
                icon={<Coins className="w-5 h-5" />}
                delay={3}
              />
              <KpiCard 
                title="BNSL Locked" 
                value={formatGrams(totals.bnslLockedGrams)}
                subValue="Locked in BNSL Plans"
                definition="Gold locked in Buy Now Sell Later agreements"
                icon={<TrendingUp className="w-5 h-5" />}
                delay={4}
              />
              <KpiCard 
                title="BNSL Earnings" 
                value={`$${formatNumber(totals.bnslTotalProfit)}`}
                subValue="Total margin received"
                definition="Total margin payments received from BNSL plans"
                icon={<LineChart className="w-5 h-5" />}
                delay={5}
              />
            </div>
          )}
        </section>

        {/* 3. Gold Live Spot Chart + Transactions */}
        <section className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ChartCard />
          </div>
          <div className="lg:col-span-1">
            <TransactionsTable transactions={transactions} goldPrice={goldPrice} />
          </div>
        </section>

        {/* 4. Referral + Wallet + FinaCard */}
        <section className="grid md:grid-cols-3 gap-6">
          <ReferralCard />
          <WalletCard 
            goldGrams={totals.walletGoldGrams} 
            usdBalance={totals.walletUsdBalance}
            goldPrice={goldPrice}
          />
          <FinaPayCard />
        </section>

        {/* 5. Dashboard Slider */}
        <section>
          <div className="flex items-center justify-between mb-4">
             <h3 className="text-lg font-bold text-foreground">Quick Access</h3>
             <div className="h-px flex-1 bg-border ml-6" />
          </div>
          <DashboardSlider />
        </section>

      </div>
    </DashboardLayout>
  );
}
