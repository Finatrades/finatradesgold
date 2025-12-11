import React, { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { useAccountType } from '@/context/AccountTypeContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, Search, Database, DollarSign, TrendingUp, Wallet, ArrowUpRight, BarChart3, LineChart } from 'lucide-react';

// Components
import KpiCard from '@/components/dashboard/KpiCard';
import ChartCard from '@/components/dashboard/ChartCard';
import TransactionsTable from '@/components/dashboard/TransactionsTable';
import ReferralCard from '@/components/dashboard/ReferralCard';
import WalletCard from '@/components/dashboard/WalletCard';
import DashboardSlider from '@/components/dashboard/DashboardSlider';

export default function Dashboard() {
  const { user } = useAuth();
  const { accountType } = useAccountType();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!user) return null;

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-[#000000] via-[#0D0515] to-[#1A0A2E] pb-24">
        
        {/* 1. Top App Bar (Sticky) */}
        <div className={`fixed top-0 left-0 right-0 z-30 transition-all duration-300 ${scrolled ? 'bg-[#0D001E]/90 backdrop-blur-md border-b border-white/10 shadow-lg' : 'bg-transparent pt-4'} h-20`}>
           <div className="container mx-auto px-6 h-full flex items-center justify-between">
             {/* Left: Title (Only visible when scrolled past hero or simplified) */}
             <div className="flex items-center gap-4">
                <h1 className="text-xl font-bold text-white hidden md:block">Dashboard</h1>
                <div className="hidden md:flex items-center bg-white/5 border border-white/10 rounded-full px-4 py-1.5">
                   <div className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse" />
                   <span className="text-xs text-white/80 font-medium">Gold Spot: <span className="text-[#D4AF37]">2,350.40 USD/oz</span></span>
                </div>
             </div>

             {/* Right: User & Actions */}
             <div className="flex items-center gap-4">
               <button className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors relative">
                 <Bell className="w-5 h-5" />
                 <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 border border-[#0D001E]" />
               </button>
               
               <div className="flex items-center gap-3 pl-4 border-l border-white/10">
                 <div className="text-right hidden sm:block">
                   <p className="text-sm font-medium text-white">{user.firstName} {user.lastName}</p>
                   <p className="text-xs text-white/40">{accountType === 'personal' ? 'Personal' : 'Corporate'} Account</p>
                 </div>
                 <Avatar className="h-10 w-10 border border-[#D4AF37]/30 ring-2 ring-[#D4AF37]/10">
                    <AvatarImage src="" alt={user.firstName} />
                    <AvatarFallback className="bg-[#D4AF37] text-black font-bold">
                      {user.firstName[0]}{user.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
               </div>
             </div>
           </div>
        </div>

        {/* Main Content Container */}
        <div className="container mx-auto px-6 pt-24 md:pt-28 max-w-7xl space-y-8">
          
          {/* 2. Top KPI Cards Grid */}
          <section>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard 
                title="Gold Storage" 
                value="12.500 kg" 
                subValue="≈ $1,067,500.00"
                definition="Total physical gold you have deposited in FinaVault."
                icon={<Database className="w-5 h-5" />}
                delay={0}
              />
              <KpiCard 
                title="Total Portfolio" 
                value="$880,000.00" 
                subValue="+2.4% this month"
                definition="Overall investment on the platform (vault + wallet + staking)."
                icon={<DollarSign className="w-5 h-5" />}
                delay={1}
              />
              <KpiCard 
                title="Total Staking" 
                value="850.00 g" 
                subValue="Locked in BNSL"
                definition="Total quantity of gold currently locked in BNSL and other staking plans."
                icon={<TrendingUp className="w-5 h-5" />}
                delay={2}
              />
              <KpiCard 
                title="Total Profit" 
                value="18.75 g" 
                subValue="≈ $1,600.00 Earned"
                definition="Rewards/ROI you have earned from staking."
                icon={<LineChart className="w-5 h-5" />}
                delay={3}
              />
            </div>
            {/* Additional KPIs Row (Optional - keeping it cleaner for now, or could expand) */}
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

          {/* 4. Referral + Wallet */}
          <section className="grid md:grid-cols-2 gap-6">
            <ReferralCard />
            <WalletCard />
          </section>

          {/* 5. Dashboard Slider */}
          <section>
            <div className="flex items-center justify-between mb-4">
               <h3 className="text-lg font-bold text-white">Quick Access</h3>
               <div className="h-px flex-1 bg-white/10 ml-6" />
            </div>
            <DashboardSlider />
          </section>

        </div>
      </div>
    </Layout>
  );
}
