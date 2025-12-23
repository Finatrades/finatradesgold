import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { Database, DollarSign, TrendingUp, Coins, BarChart3, AlertTriangle, CheckCircle2, Wallet, ShieldCheck } from 'lucide-react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { Card } from '@/components/ui/card';
import { AEDAmount } from '@/components/ui/DirhamSymbol';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

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
  value: React.ReactNode;
  subtitle: string;
  secondaryValue?: string;
  tertiaryValue?: string;
  icon: React.ReactNode;
  iconBg?: string;
  valueColor?: string;
}

function KpiBox({ title, value, subtitle, secondaryValue, tertiaryValue, icon, iconBg = 'bg-gray-100', valueColor = 'text-gray-900' }: KpiBoxProps) {
  return (
    <Card className="p-4 bg-white border border-purple-200 shadow-sm rounded-lg">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs text-gray-500 mb-2">{title}</p>
          <div className={`text-xl font-bold ${valueColor} mb-1`}>{value}</div>
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
  const [showAssuranceDialog, setShowAssuranceDialog] = useState(false);

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

        {/* Settlement Assurance Rotating Banner */}
        <div 
          className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 border border-amber-300 cursor-pointer hover:shadow-md transition-all group"
          onClick={() => setShowAssuranceDialog(true)}
          data-testid="banner-settlement-assurance"
        >
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-sm">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="animate-marquee whitespace-nowrap">
              <span className="text-sm font-semibold text-amber-800">
                Guarantee of Settlement Assurance
              </span>
              <span className="mx-4 text-amber-400">•</span>
              <span className="text-sm text-amber-700">
                Backed by USD 42.134 Billion in verified geological gold reserves
              </span>
              <span className="mx-4 text-amber-400">•</span>
              <span className="text-sm text-amber-600">
                Click to learn more
              </span>
            </div>
          </div>
          <div className="flex-shrink-0 text-amber-600 group-hover:text-amber-800 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>

        {/* Gold Price Status Banner */}
        {goldPriceSource && (
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm ${
            isGoldPriceLive 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-purple-50 text-fuchsia-700 border border-purple-200'
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome back, {userName}</h1>
            <p className="text-gray-500 text-sm">Here's an overview of your portfolio performance</p>
          </div>
          {user.finatradesId && (
            <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-50 to-fuchsia-50 border border-purple-200 rounded-xl">
              <span className="text-xs text-gray-500 uppercase tracking-wide">Finatrades ID</span>
              <span className="text-sm font-bold text-purple-700 font-mono">{user.finatradesId}</span>
            </div>
          )}
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
                  const availableGoldGrams = totals.walletGoldGrams || 0;
                  const availableGoldValueUsd = availableGoldGrams * goldPrice;
                  const availableGoldValueAed = availableGoldValueUsd * 3.67;
                  return (
                    <>
                      <KpiBox
                        title="Gold Storage"
                        value={`${formatNumber(availableGoldGrams, 4)} g`}
                        secondaryValue={`${formatNumber(availableGoldGrams / 1000, 6)} KG`}
                        tertiaryValue={`${formatNumber(availableGoldGrams / 31.1035, 4)} OZ`}
                        subtitle="Available for withdrawal or transfer"
                        icon={<Database className="w-5 h-5 text-purple-600" />}
                        iconBg="bg-purple-50"
                        valueColor="text-purple-600"
                      />
                      <KpiBox
                        title="Total Gold Value"
                        value={<AEDAmount amount={availableGoldValueAed} />}
                        subtitle="Worth in AED"
                        icon={<Coins className="w-5 h-5 text-green-600" />}
                        iconBg="bg-green-50"
                        valueColor="text-green-600"
                      />
                    </>
                  );
                })()}
                
                {/* Row 2 */}
                <KpiBox
                  title="Total Portfolio"
                  value={<AEDAmount amount={totals.totalPortfolioUsd * 3.67} />}
                  subtitle="Overall investment"
                  icon={<BarChart3 className="w-5 h-5 text-purple-600" />}
                  iconBg="bg-purple-50"
                  valueColor="text-purple-600"
                />
                <KpiBox
                  title="BNSL Invested"
                  value={formatGrams(totals.bnslLockedGrams)}
                  subtitle="In active plans"
                  icon={<TrendingUp className="w-5 h-5 text-teal-600" />}
                  iconBg="bg-teal-50"
                  valueColor="text-purple-600"
                />
                <KpiBox
                  title="Total Profit"
                  value={<><span className="text-green-600">+</span><AEDAmount amount={totals.bnslTotalProfit * 3.67} /></>}
                  subtitle="ROI from BNSL"
                  icon={<Coins className="w-5 h-5 text-purple-600" />}
                  iconBg="bg-purple-50"
                  valueColor="text-green-600"
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

      {/* Settlement Assurance Dialog */}
      <Dialog open={showAssuranceDialog} onOpenChange={setShowAssuranceDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-md">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <DialogTitle className="text-xl font-bold text-amber-800">
                Guarantee of Settlement Assurance
              </DialogTitle>
            </div>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg border border-amber-200">
              <p className="text-gray-700 leading-relaxed text-sm">
                Raminvest Holding Ltd (DIFC Registration No. 7030), as the governing entity of the Group ecosystem that includes Wingold & Metals DMCC, provides a limited settlement assurance mechanism supported by verified geological gold reserves held through Boudadiya Services SARL under Mining Permit No. 2265 B2-WOMPOU.
              </p>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-green-700 font-semibold">Verified Reserve Value</span>
              </div>
              <p className="text-2xl font-bold text-green-800">USD 42.134 Billion</p>
              <p className="text-sm text-green-600 mt-1">
                (USD 42,134,363,570) as of 15 July 2025, based on a gold spot price of USD 3,327.93 per ounce
              </p>
              <p className="text-xs text-green-500 mt-2">
                Source: Independent MKDG Geological Audit Report - Proven Reserves
              </p>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-gray-700 leading-relaxed text-sm">
                This assurance, formally recognized under DIFC procedures (SR Reference No. SR-646772), serves solely as an internal group mechanism under which, in the unlikely event Wingold & Metals DMCC cannot meet a specific settlement obligation under this Plan, Raminvest may authorize monetization of corresponding reserves exclusively to discharge that single obligation.
              </p>
            </div>
            
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-amber-800 font-medium text-sm mb-2">Important Notice:</p>
              <p className="text-gray-700 leading-relaxed text-sm">
                It is not a banking guarantee, financial insurance, or customer protection product, and no continuing or residual liability remains with Raminvest thereafter. By participating, you acknowledge this mechanism as a risk-mitigation feature of the ecosystem, while your sole contractual counterparty for all Plan obligations remains Wingold & Metals DMCC.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
