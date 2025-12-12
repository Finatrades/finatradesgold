import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { Database, DollarSign, TrendingUp, LineChart, Globe, Coins, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';

// Components
import KpiCard from '@/components/dashboard/KpiCard';
import ChartCard from '@/components/dashboard/ChartCard';
import TransactionsTable from '@/components/dashboard/TransactionsTable';
import ReferralCard from '@/components/dashboard/ReferralCard';
import WalletCard from '@/components/dashboard/WalletCard';
import FinaPayCard from '@/components/dashboard/FinaPayCard';
import DashboardSlider from '@/components/dashboard/DashboardSlider';
import QuickActionsTop from '@/components/dashboard/QuickActionsTop';

export default function Dashboard() {
  const { user } = useAuth();

  if (!user) return null;

  const isKycApproved = user.kycStatus === 'Approved';
  const isKycPending = user.kycStatus === 'In Progress';

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* KYC Verification Banner */}
        {!isKycApproved && (
          <div className={`rounded-xl p-4 border ${isKycPending ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200'}`} data-testid="banner-kyc">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                {isKycPending ? (
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-blue-600" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  </div>
                )}
                <div>
                  <h3 className={`font-semibold ${isKycPending ? 'text-blue-900' : 'text-amber-900'}`}>
                    {isKycPending ? 'KYC Verification Under Review' : 'Complete Your KYC Verification'}
                  </h3>
                  <p className={`text-sm ${isKycPending ? 'text-blue-700' : 'text-amber-700'}`}>
                    {isKycPending 
                      ? 'Your documents are being reviewed. You will be notified once approved.'
                      : 'To access all platform features, please complete your identity verification.'}
                  </p>
                </div>
              </div>
              {!isKycPending && (
                <Link href="/kyc">
                  <Button className="bg-amber-600 hover:bg-amber-700 text-white" data-testid="button-complete-kyc">
                    Complete KYC <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <KpiCard 
              title="Gold Storage (KG)" 
              value="12.500 kg" 
              definition="Gold Storage Meaning You have Deposited Gold in FinaVault"
              icon={<Database className="w-5 h-5" />}
              delay={0}
            />
            <KpiCard 
              title="Gold Value (USD)" 
              value="$1,067,500.00" 
              definition="Gold Value Meaning You have Deposited worth of Gold in FinaVault in USD"
              icon={<DollarSign className="w-5 h-5" />}
              delay={1}
            />
            <KpiCard 
              title="Gold Value (AED)" 
              value="AED 3,921,000.00" 
              definition="Gold Value Meaning You have Deposited worth of Gold in FinaVault in AED"
              icon={<Globe className="w-5 h-5" />}
              delay={2}
            />
            <KpiCard 
              title="Total Portfolio" 
              value="$1,150,000.00" 
              subValue="+2.4% this month"
              definition="total Portfolio means overall investment in platform."
              icon={<Coins className="w-5 h-5" />}
              delay={3}
            />
            <KpiCard 
              title="BNSL Invested" 
              value="850.00 g" 
              subValue="Locked in BNSL"
              definition="total Staking means overall Staking Gold Quality."
              icon={<TrendingUp className="w-5 h-5" />}
              delay={4}
            />
            <KpiCard 
              title="Total Profit" 
              value="18.75 g" 
              subValue="ROI (Daily)"
              definition="total profit means what ever gold has been Staked we Shown ROI on day basis in profit section"
              icon={<LineChart className="w-5 h-5" />}
              delay={5}
            />
          </div>
        </section>

        {/* 3. Gold Live Spot Chart + Transactions */}
        <section className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ChartCard />
          </div>
          <div className="lg:col-span-1">
            <TransactionsTable />
          </div>
        </section>

        {/* 4. Referral + Wallet + FinaCard */}
        <section className="grid md:grid-cols-3 gap-6">
          <ReferralCard />
          <WalletCard />
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
