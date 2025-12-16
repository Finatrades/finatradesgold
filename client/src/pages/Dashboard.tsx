import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { Database, DollarSign, TrendingUp, LineChart, Globe, Coins, Loader2, Copy, Check } from 'lucide-react';
import { useDashboardData } from '@/hooks/useDashboardData';

import KpiCard from '@/components/dashboard/KpiCard';
import ChartCard from '@/components/dashboard/ChartCard';
import TransactionsTable from '@/components/dashboard/TransactionsTable';
import ReferralCard from '@/components/dashboard/ReferralCard';
import WalletCard from '@/components/dashboard/WalletCard';
import FinaPayCard from '@/components/dashboard/FinaPayCard';
import DashboardSlider from '@/components/dashboard/DashboardSlider';
import QuickActionsTop from '@/components/dashboard/QuickActionsTop';
import ReportsSection from '@/components/dashboard/ReportsSection';

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
  const [copied, setCopied] = React.useState(false);

  const copyFinatradesId = () => {
    if (user?.finatradesId) {
      navigator.clipboard.writeText(user.finatradesId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8">

        {/* 1. Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard Overview</h1>
            <p className="text-muted-foreground">Welcome back to your financial command center.</p>
          </div>
          {user.finatradesId && (
            <div className="flex items-center gap-2 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border border-orange-200 dark:border-orange-800 rounded-lg px-4 py-2 shadow-sm">
              <span className="text-sm text-muted-foreground">Your ID:</span>
              <span className="font-mono font-bold text-orange-600 dark:text-orange-400" data-testid="text-user-finatrades-id">
                {user.finatradesId}
              </span>
              <button
                onClick={copyFinatradesId}
                className="p-1 hover:bg-orange-100 dark:hover:bg-orange-900/50 rounded transition-colors"
                title="Copy Finatrades ID"
                data-testid="button-copy-finatrades-id"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                )}
              </button>
            </div>
          )}
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
                title="Gold Holdings" 
                value={formatGrams(totals.vaultGoldGrams + totals.walletGoldGrams)}
                subValue={totals.vaultGoldGrams > 0 || totals.walletGoldGrams > 0 ? `Vault: ${formatGrams(totals.vaultGoldGrams)} | Wallet: ${formatGrams(totals.walletGoldGrams)}` : "No gold yet"}
                definition="How much physical gold you own in grams. This includes gold stored in your secure Vault plus gold in your digital Wallet ready for transactions."
                icon={<Database className="w-5 h-5" />}
                delay={0}
              />
              <KpiCard 
                title="Gold Value (USD)" 
                value={`$${formatNumber(totals.vaultGoldValueUsd + (totals.walletGoldGrams * goldPrice))}`}
                subValue={totals.walletUsdBalance > 0 ? `+ $${formatNumber(totals.walletUsdBalance)} Cash` : undefined}
                definition="What your gold is worth today in US dollars at the current market price. The 'Cash' shown below is your separate dollar balance that can be used to buy more gold."
                icon={<DollarSign className="w-5 h-5" />}
                delay={1}
              />
              <KpiCard 
                title="Vault Value (AED)" 
                value={`AED ${formatNumber(totals.vaultGoldValueAed)}`}
                definition="The value of your Vault gold shown in UAE Dirhams (AED). This is the same gold, just displayed in a different currency."
                icon={<Globe className="w-5 h-5" />}
                delay={2}
              />
              <KpiCard 
                title="Total Portfolio" 
                value={`$${formatNumber(totals.totalPortfolioUsd)}`}
                subValue={totals.walletUsdBalance > 0 ? `$${formatNumber(totals.walletUsdBalance)} Cash` : `Gold @ $${formatNumber(goldPrice, 2)}/g`}
                definition="Your complete account value: the dollar value of all your gold PLUS any cash balance you have. This is everything you own on Finatrades added together."
                icon={<Coins className="w-5 h-5" />}
                delay={3}
              />
              <KpiCard 
                title="BNSL Locked" 
                value={formatGrams(totals.bnslLockedGrams)}
                subValue="Locked in BNSL Plans"
                definition="Gold that is currently committed to 'Buy Now Sell Later' agreements. This gold cannot be moved until the agreement ends, when you'll receive your agreed sale price."
                icon={<TrendingUp className="w-5 h-5" />}
                delay={4}
              />
              <KpiCard 
                title="BNSL Earnings" 
                value={`$${formatNumber(totals.bnslTotalProfit)}`}
                subValue="Total margin received"
                definition="The upfront payments you've received from BNSL agreements. When you lock gold in a BNSL plan, you receive an immediate cash payment (margin) as part of the deal."
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

        {/* 5. Wallet Cards */}
        <section>
          <div className="flex items-center justify-between mb-4">
             <h3 className="text-lg font-bold text-foreground">Wallets</h3>
             <div className="h-px flex-1 bg-border ml-6" />
          </div>
          <DashboardSlider />
        </section>

        {/* 6. Reports Section */}
        <section className="grid md:grid-cols-2 gap-6">
          <ReportsSection />
        </section>

      </div>
    </DashboardLayout>
  );
}
