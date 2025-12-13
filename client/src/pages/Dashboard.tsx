import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { Database, DollarSign, TrendingUp, Coins, Loader2, Wallet, ArrowRight } from 'lucide-react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

import KpiCard from '@/components/dashboard/KpiCard';
import ChartCard from '@/components/dashboard/ChartCard';
import TransactionsTable from '@/components/dashboard/TransactionsTable';

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
      <div className="max-w-6xl mx-auto space-y-8 pb-12">

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Welcome back, {user.firstName}</h1>
            <p className="text-muted-foreground text-sm">Here's your portfolio overview</p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Gold Spot:</span>
            <span className="font-bold text-amber-600">${formatNumber(goldPrice, 2)}/g</span>
          </div>
        </div>
        
        <section>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-secondary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard 
                title="Total Portfolio" 
                value={`$${formatNumber(totals.totalPortfolioUsd)}`}
                definition="Combined value of all your holdings"
                icon={<Coins className="w-5 h-5" />}
                delay={0}
              />
              <KpiCard 
                title="Gold Holdings" 
                value={formatGrams(totals.vaultGoldGrams + totals.walletGoldGrams)}
                subValue={`$${formatNumber(totals.vaultGoldValueUsd)}`}
                definition="Total gold in vault and wallet"
                icon={<Database className="w-5 h-5" />}
                delay={1}
              />
              <KpiCard 
                title="USD Balance" 
                value={`$${formatNumber(totals.walletUsdBalance)}`}
                definition="Available cash balance"
                icon={<DollarSign className="w-5 h-5" />}
                delay={2}
              />
              <KpiCard 
                title="BNSL Locked" 
                value={formatGrams(totals.bnslLockedGrams)}
                subValue={`$${formatNumber(totals.bnslTotalProfit)} earned`}
                definition="Gold locked in BNSL plans"
                icon={<TrendingUp className="w-5 h-5" />}
                delay={3}
              />
            </div>
          )}
        </section>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/finapay">
            <Card className="group cursor-pointer hover:border-amber-500/50 transition-all hover:shadow-md">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <span className="font-medium">FinaPay</span>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-amber-600 transition-colors" />
              </CardContent>
            </Card>
          </Link>
          <Link href="/finavault">
            <Card className="group cursor-pointer hover:border-amber-500/50 transition-all hover:shadow-md">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600">
                    <Database className="w-5 h-5" />
                  </div>
                  <span className="font-medium">FinaVault</span>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-purple-600 transition-colors" />
              </CardContent>
            </Card>
          </Link>
          <Link href="/bnsl">
            <Card className="group cursor-pointer hover:border-amber-500/50 transition-all hover:shadow-md">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <span className="font-medium">BNSL</span>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-blue-600 transition-colors" />
              </CardContent>
            </Card>
          </Link>
          <Link href="/finabridge">
            <Card className="group cursor-pointer hover:border-amber-500/50 transition-all hover:shadow-md">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10 text-green-600">
                    <Coins className="w-5 h-5" />
                  </div>
                  <span className="font-medium">FinaBridge</span>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-green-600 transition-colors" />
              </CardContent>
            </Card>
          </Link>
        </section>

        <section className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ChartCard />
          </div>
          <div className="lg:col-span-1">
            <TransactionsTable transactions={transactions} goldPrice={goldPrice} />
          </div>
        </section>

      </div>
    </DashboardLayout>
  );
}
