import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { Database, DollarSign, TrendingUp, Coins, Loader2, BarChart3 } from 'lucide-react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { Card } from '@/components/ui/card';

import QuickActionsTop from '@/components/dashboard/QuickActionsTop';
import DashboardWalletCards from '@/components/dashboard/DashboardWalletCards';
import CreditCardPreview from '@/components/dashboard/CreditCardPreview';
import TransactionsTable from '@/components/dashboard/TransactionsTable';
import CertificatesCard from '@/components/dashboard/CertificatesCard';

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
  icon: React.ReactNode;
  iconBg?: string;
  valueColor?: string;
}

function KpiBox({ title, value, subtitle, icon, iconBg = 'bg-gray-100', valueColor = 'text-gray-900' }: KpiBoxProps) {
  return (
    <Card className="p-4 bg-white border border-orange-200 shadow-sm rounded-lg">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs text-gray-500 mb-2">{title}</p>
          <p className={`text-xl font-bold ${valueColor} mb-1`}>{value}</p>
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
  const { totals, wallet, transactions, goldPrice, isLoading } = useDashboardData();

  if (!user) return null;

  const userName = user.firstName || user.email?.split('@')[0] || 'User';
  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || userName;
  const isBusinessUser = user.accountType === 'business';

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">

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
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* KPI Cards - 3x2 grid */}
              <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Row 1 */}
                <KpiBox
                  title="Gold Storage"
                  value={formatGrams(totals.vaultGoldGrams)}
                  subtitle="Deposited in FinaVault"
                  icon={<Database className="w-5 h-5 text-orange-600" />}
                  iconBg="bg-orange-50"
                  valueColor="text-orange-600"
                />
                <KpiBox
                  title="Gold Value (USD)"
                  value={`$${formatNumber(totals.vaultGoldValueUsd + (totals.walletGoldGrams * goldPrice))}`}
                  subtitle="Worth in USD"
                  icon={<DollarSign className="w-5 h-5 text-green-600" />}
                  iconBg="bg-green-50"
                />
                <KpiBox
                  title="Gold Value (AED)"
                  value={`د.إ ${formatNumber(totals.vaultGoldValueAed)}`}
                  subtitle="Worth in AED"
                  icon={<span className="text-lg font-bold text-blue-600">د.إ</span>}
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
          )}
        </section>

        {/* Wallet Cards Section */}
        {!isLoading && (
          <section>
            <DashboardWalletCards
              finaPayWallet={{
                goldGrams: totals.walletGoldGrams || 0,
                usdValue: (totals.walletGoldGrams || 0) * goldPrice,
                pending: 0,
                transactions: transactions?.length || 0
              }}
              bnslData={{
                goldGrams: totals.bnslLockedGrams || 0,
                usdValue: (totals.bnslLockedGrams || 0) * goldPrice,
                lockedGrams: totals.bnslLockedGrams || 0,
                activePlans: totals.activeBnslPlans || 0
              }}
              userName={userName}
              isBusinessUser={isBusinessUser}
            />
          </section>
        )}

        {/* Recent Transactions & Certificates */}
        {!isLoading && (
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TransactionsTable transactions={transactions} goldPrice={goldPrice} />
            <CertificatesCard />
          </section>
        )}

      </div>
    </DashboardLayout>
  );
}
