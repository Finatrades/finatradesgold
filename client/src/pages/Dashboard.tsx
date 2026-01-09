import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { Database, DollarSign, TrendingUp, Coins, BarChart3, AlertTriangle, CheckCircle2, Wallet, EyeOff } from 'lucide-react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { Card } from '@/components/ui/card';
import { AEDAmount } from '@/components/ui/DirhamSymbol';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';

import QuickActionsTop from '@/components/dashboard/QuickActionsTop';
import DashboardWalletCards from '@/components/dashboard/DashboardWalletCards';
import CreditCardPreview from '@/components/dashboard/CreditCardPreview';
import TransactionsTable from '@/components/dashboard/TransactionsTable';
import CertificatesCard from '@/components/dashboard/CertificatesCard';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import OnboardingTour, { useOnboarding } from '@/components/OnboardingTour';
import { useDashboardTour } from '@/hooks/useDashboardTour';
import { TourButton } from '@/components/tour/TourProvider';
import { HelpCircle } from 'lucide-react';

interface UserPreferences {
  showBalance: boolean;
  twoFactorReminder: boolean;
  compactMode: boolean;
  displayCurrency: string;
}

function formatNumber(num: number | null | undefined, decimals = 2): string {
  if (num === null || num === undefined || isNaN(num)) {
    return '0.00';
  }
  return num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function formatGrams(grams: number | null | undefined): string {
  if (grams === null || grams === undefined || isNaN(grams)) {
    return '0.0000 g';
  }
  if (grams >= 1000) {
    return `${formatNumber(grams / 1000, 4)} kg`;
  }
  return `${formatNumber(grams, 4)} g`;
}

interface KpiBoxProps {
  title: string;
  value: React.ReactNode;
  subtitle: string;
  secondaryValue?: string;
  tertiaryValue?: string;
  icon: React.ReactNode;
  iconBg?: string;
  valueColor?: string;
  compact?: boolean;
}

function KpiBox({ title, value, subtitle, secondaryValue, tertiaryValue, icon, iconBg = 'bg-gray-100', valueColor = 'text-gray-900', compact = false }: KpiBoxProps) {
  return (
    <Card className={`${compact ? 'p-3' : 'p-4'} bg-white border border-purple-200 shadow-sm rounded-lg hover-lift glass-card`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className={`text-xs text-gray-500 ${compact ? 'mb-1' : 'mb-2'}`}>{title}</p>
          <div className={`${compact ? 'text-lg' : 'text-xl'} font-bold ${valueColor} mb-1 animate-count`}>{value}</div>
          {secondaryValue && (
            <p className={`${compact ? 'text-xs' : 'text-sm'} font-medium text-gray-600 mb-1`}>{secondaryValue}</p>
          )}
          {tertiaryValue && (
            <p className={`${compact ? 'text-xs' : 'text-sm'} font-medium text-gray-600 mb-1`}>{tertiaryValue}</p>
          )}
          <p className="text-xs text-gray-400">{subtitle}</p>
        </div>
        <div className={`${compact ? 'w-8 h-8' : 'w-10 h-10'} rounded-lg ${iconBg} flex items-center justify-center icon-btn`}>
          {icon}
        </div>
      </div>
    </Card>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { totals, wallet, transactions, goldPrice, goldPriceSource, isLoading, tradeCounts, finaBridge } = useDashboardData();
  const { showOnboarding, completeOnboarding } = useOnboarding();
  const { startTour, tourId } = useDashboardTour();

  const { data: prefsData } = useQuery<{ preferences: UserPreferences }>({
    queryKey: ['preferences', user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/users/${user?.id}/preferences`);
      if (!res.ok) throw new Error('Failed to fetch preferences');
      return res.json();
    },
    enabled: !!user?.id,
    staleTime: 300000,
  });

  const prefs = prefsData?.preferences;
  const showBalance = prefs?.showBalance !== false;
  const twoFactorReminder = prefs?.twoFactorReminder !== false;
  const compactMode = prefs?.compactMode === true;
  const displayCurrency = prefs?.displayCurrency || 'USD';

  const formatCurrency = (usdAmount: number) => {
    if (displayCurrency === 'AED') {
      return `Dh ${formatNumber(usdAmount * 3.67)}`;
    } else if (displayCurrency === 'EUR') {
      return `€${formatNumber(usdAmount * 0.92)}`;
    }
    return `$${formatNumber(usdAmount)}`;
  };

  const hiddenValue = '••••••';

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
      <div className={`max-w-7xl mx-auto ${compactMode ? 'space-y-3' : 'space-y-6'}`}>

        {/* Balance Hidden Indicator */}
        {!showBalance && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted text-muted-foreground text-sm">
            <EyeOff className="w-4 h-4" />
            <span>Balances are hidden. Go to Settings to show them.</span>
          </div>
        )}

        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome back, {userName}</h1>
            <p className="text-gray-500 text-sm">Here's an overview of your portfolio performance</p>
          </div>
          <div className="flex items-center gap-3">
            <TourButton tourId={tourId} className="border-purple-200 text-purple-700 hover:bg-purple-50" />
            {user.finatradesId && (
              <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-50 to-fuchsia-50 border border-purple-200 rounded-xl">
                <span className="text-xs text-gray-500 uppercase tracking-wide">Finatrades ID</span>
                <span className="text-sm font-bold text-purple-700 font-mono">{user.finatradesId}</span>
              </div>
            )}
          </div>
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
                {(() => {
                  const storedGoldGrams = totals.vaultGoldGrams || 0;
                  const storedGoldValueUsd = totals.vaultGoldValueUsd || 0;
                  return (
                    <>
                      <KpiBox
                        title="Gold Storage"
                        value={showBalance ? `${formatNumber(storedGoldGrams, 4)} g` : hiddenValue}
                        secondaryValue={showBalance ? `${formatNumber(storedGoldGrams / 1000, 6)} KG` : undefined}
                        tertiaryValue={showBalance ? `${formatNumber(storedGoldGrams / 31.1035, 4)} OZ` : undefined}
                        subtitle="Stored in FinaVault"
                        icon={<Database className="w-5 h-5 text-purple-600" />}
                        iconBg="bg-purple-50"
                        valueColor="text-purple-600"
                        compact={compactMode}
                      />
                      <KpiBox
                        title={`Total Gold Value (${displayCurrency})`}
                        value={showBalance ? formatCurrency(storedGoldValueUsd) : hiddenValue}
                        subtitle={`Worth in ${displayCurrency}`}
                        icon={<DollarSign className="w-5 h-5 text-green-600" />}
                        iconBg="bg-green-50"
                        compact={compactMode}
                      />
                      <KpiBox
                        title="Total Gold Value (AED)"
                        value={showBalance ? <AEDAmount amount={storedGoldValueUsd * 3.67} /> : hiddenValue}
                        subtitle="Worth in AED"
                        icon={<DollarSign className="w-5 h-5 text-blue-600" />}
                        iconBg="bg-blue-50"
                        compact={compactMode}
                      />
                    </>
                  );
                })()}
                
                {/* Row 2 */}
                <KpiBox
                  title="Total Portfolio"
                  value={showBalance ? formatCurrency(totals.totalPortfolioUsd) : hiddenValue}
                  subtitle="Overall investment"
                  icon={<BarChart3 className="w-5 h-5 text-purple-600" />}
                  iconBg="bg-purple-50"
                  valueColor="text-purple-600"
                  compact={compactMode}
                />
                <KpiBox
                  title="BNSL Invested"
                  value={showBalance ? formatGrams(totals.bnslLockedGrams) : hiddenValue}
                  subtitle="In active plans"
                  icon={<TrendingUp className="w-5 h-5 text-teal-600" />}
                  iconBg="bg-teal-50"
                  valueColor="text-purple-600"
                  compact={compactMode}
                />
                <KpiBox
                  title="Total Profit"
                  value={showBalance ? `+${formatCurrency(totals.bnslTotalProfit)}` : hiddenValue}
                  subtitle="ROI from BNSL"
                  icon={<Coins className="w-5 h-5 text-purple-600" />}
                  iconBg="bg-purple-50"
                  valueColor="text-green-600"
                  compact={compactMode}
                />
              </div>
              
              {/* Credit Card Preview - Spanning 2 rows */}
              <div className="lg:col-span-1 lg:row-span-2 flex items-stretch">
                <div className="w-full">
                  <CreditCardPreview 
                    userName={fullName.toUpperCase()}
                    cardNumber="4789  ••••  ••••  3456"
                    expiry="12/28"
                    cardType={isBusinessUser ? 'business' : 'personal'}
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
                mpgwGrams: totals.mpgwAvailableGrams || 0,
                fpgwGrams: totals.fpgwAvailableGrams || 0,
                pending: totals.pendingGoldGrams || 0,
                transactions: transactions?.length || 0
              }}
              bnslData={{
                goldGrams: ((totals as any).bnslWalletGoldGrams || 0) + (totals.bnslLockedGrams || 0),
                usdValue: (((totals as any).bnslWalletGoldGrams || 0) + (totals.bnslLockedGrams || 0)) * goldPrice,
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

      {showOnboarding && (
        <OnboardingTour onComplete={completeOnboarding} />
      )}
    </DashboardLayout>
  );
}
