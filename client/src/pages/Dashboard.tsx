import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { Database, DollarSign, TrendingUp, Coins, BarChart3, AlertTriangle, CheckCircle2, Wallet } from 'lucide-react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { Card } from '@/components/ui/card';

import QuickActionsTop from '@/components/dashboard/QuickActionsTop';
import DashboardWalletCards from '@/components/dashboard/DashboardWalletCards';
import CreditCardPreview from '@/components/dashboard/CreditCardPreview';
import TransactionsTable from '@/components/dashboard/TransactionsTable';
import CertificatesCard from '@/components/dashboard/CertificatesCard';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';

function formatNumber(num: number, decimals = 2): string {
  return num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function formatGrams(grams: number): string {
  if (grams >= 1000) {
    return `${formatNumber(grams / 1000, 4)} kg`;
  }
  return `${formatNumber(grams, 4)} g`;
}

interface KpiBoxProps {
  title: string;
  value: string;
  subtitle: string;
  secondaryValue?: string;
  tertiaryValue?: string;
  icon: React.ReactNode;
  iconBg?: string;
  valueColor?: string;
}

function KpiBox({ title, value, subtitle, secondaryValue, tertiaryValue, icon, iconBg = 'bg-gray-100', valueColor = 'text-gray-900' }: KpiBoxProps) {
  return (
    <Card className="p-4 bg-white border border-orange-200 shadow-sm rounded-lg">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs text-gray-500 mb-2">{title}</p>
          <p className={`text-xl font-bold ${valueColor} mb-1`}>{value}</p>
          {secondaryValue && (
            <p className="text-sm font-medium text-gray-600 mb-1">{secondaryValue}</p>
          )}
          {tertiaryValue && (
            <p className="text-sm font-medium text-gray-600 mb-1">{tertiaryValue}</p>
          )}
          <p className="text-xs text-gray-400">{subtitle}</p>
        </div>
        <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center`}>
          {icon}
        </div>
      </div>
    </Card>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { totals, wallet, transactions, goldPrice, goldPriceSource, isLoading, tradeCounts, finaBridge } = useDashboardData();

  if (!user) return null;
  
  if (isLoading) {
    return (
      <DashboardLayout>
        <DashboardSkeleton />
      </DashboardLayout>
    );
  }

  const userName = user.firstName || user.email?.split('@')[0] || 'User';
  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || userName;
  const isBusinessUser = user.accountType === 'business' || !!user.finabridgeRole;
  const isGoldPriceLive = goldPriceSource && !goldPriceSource.includes('fallback');

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Gold Price Status Banner */}
        {goldPriceSource && (
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm ${
            isGoldPriceLive 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-amber-50 text-amber-700 border border-amber-200'
          }`}>
            {isGoldPriceLive ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Gold Price: <strong>${goldPrice.toFixed(2)}/gram</strong></span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4" />
                <span>Gold Price: <strong>${goldPrice.toFixed(2)}/gram</strong> - Using estimated price</span>
              </>
            )}
          </div>
        )}

        {/* Header Section */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back, {userName}</h1>
          <p className="text-gray-500 text-sm">Here's an overview of your portfolio performance</p>
        </div>

        {/* Quick Actions */}
        <section>
          <QuickActionsTop />
        </section>
        
        {/* KPI Cards Grid - 3x3 with Credit Card */}
        <section>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* KPI Cards - 3x2 grid */}
              <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Row 1 */}
                <KpiBox
                  title="Gold Storage"
                  value={`${formatNumber(totals.vaultGoldGrams, 4)} g`}
                  secondaryValue={`${formatNumber(totals.vaultGoldGrams / 1000, 6)} KG`}
                  tertiaryValue={`${formatNumber(totals.vaultGoldGrams / 31.1035, 4)} OZ`}
                  subtitle="Physical gold in vault"
                  icon={<Database className="w-5 h-5 text-orange-600" />}
                  iconBg="bg-orange-50"
                  valueColor="text-orange-600"
                />
                                <KpiBox
                  title="Total Gold Value (USD)"
                  value={`$${formatNumber(totals.vaultGoldGrams * goldPrice)}`}
                  subtitle="Worth in USD"
                  icon={<DollarSign className="w-5 h-5 text-green-600" />}
                  iconBg="bg-green-50"
                />
                <KpiBox
                  title="Total Gold Value (AED)"
                  value={`د.إ ${formatNumber((totals.vaultGoldGrams * goldPrice) * 3.67)}`}
                  subtitle="Worth in AED"
                  icon={<DollarSign className="w-5 h-5 text-blue-600" />}
                  iconBg="bg-blue-50"
                />
                
                {/* Row 2 */}
                <KpiBox
                  title="Total Portfolio"
                  value={`$${formatNumber(totals.totalPortfolioUsd)}`}
                  subtitle="Overall investment"
                  icon={<BarChart3 className="w-5 h-5 text-purple-600" />}
                  iconBg="bg-purple-50"
                  valueColor="text-orange-600"
                />
                <KpiBox
                  title="BNSL Invested"
                  value={formatGrams(totals.bnslLockedGrams)}
                  subtitle="In active plans"
                  icon={<TrendingUp className="w-5 h-5 text-teal-600" />}
                  iconBg="bg-teal-50"
                  valueColor="text-orange-600"
                />
                <KpiBox
                  title="Total Profit"
                  value={`+$${formatNumber(totals.bnslTotalProfit)}`}
                  subtitle="ROI from BNSL"
                  icon={<Coins className="w-5 h-5 text-orange-600" />}
                  iconBg="bg-orange-50"
                  valueColor="text-green-600"
                />
              </div>
              
              {/* Credit Card Preview - Spanning 2 rows */}
              <div className="lg:col-span-1 lg:row-span-2 flex items-stretch">
                <div className="w-full">
                  <CreditCardPreview 
                    userName={fullName.toUpperCase()}
                    cardNumber="4532  ••••  ••••  0003"
                    expiry="12/28"
                  />
                </div>
              </div>
            </div>
        </section>

        {/* Wallet Cards Section */}
        <section>
          <DashboardWalletCards
              finaPayWallet={{
                goldGrams: totals.walletGoldGrams || 0,
                usdValue: (totals.walletGoldGrams || 0) * goldPrice,
                pending: totals.pendingGoldGrams || 0,
                transactions: transactions?.length || 0
              }}
              bnslData={{
                goldGrams: totals.bnslLockedGrams || 0,
                usdValue: (totals.bnslLockedGrams || 0) * goldPrice,
                lockedGrams: totals.bnslLockedGrams || 0,
                activePlans: totals.activeBnslPlans || 0
              }}
              finaBridgeData={{
                goldGrams: finaBridge?.goldGrams || 0,
                usdValue: finaBridge?.usdValue || 0,
                activeCases: finaBridge?.activeCases || 0,
                tradeVolume: finaBridge?.tradeVolume || 0
              }}
              userName={userName}
              isBusinessUser={isBusinessUser}
            />
        </section>

        {/* Recent Transactions & Certificates */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TransactionsTable transactions={transactions} goldPrice={goldPrice} />
          <CertificatesCard />
        </section>

      </div>
    </DashboardLayout>
  );
}
