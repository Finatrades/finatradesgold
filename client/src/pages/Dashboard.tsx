import React from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { useAccountType } from '@/context/AccountTypeContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { 
  Wallet, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock, 
  CreditCard,
  Building,
  FileText,
  ShieldCheck,
  Gem
} from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const { accountType } = useAccountType();

  if (!user) return null;

  return (
    <Layout>
      <div className="min-h-screen pt-24 pb-12 bg-[#0D001E]">
        <div className="container mx-auto px-6">
          
          {/* Welcome Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">
                Welcome back, {user.firstName}
              </h1>
              <p className="text-white/60">
                {accountType === 'personal' ? 'Personal Gem Portfolio' : `${user.companyName || 'Corporate'} Trade Dashboard`}
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="border-white/10 hover:bg-white/5 text-white">
                <FileText className="w-4 h-4 mr-2" /> Statements
              </Button>
              <Button className="bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 font-semibold">
                <Wallet className="w-4 h-4 mr-2" /> Deposit Funds
              </Button>
            </div>
          </div>

          {/* Main Grid */}
          <div className="grid lg:grid-cols-3 gap-8">
            
            {/* Left Column: Assets */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Total Balance Card */}
              <Card className="p-8 bg-gradient-to-br from-[#1A0033] to-[#0D001E] border-white/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4AF37]/10 blur-[80px] rounded-full pointer-events-none" />
                
                <div className="relative z-10">
                  <p className="text-white/60 mb-2">Total Balance</p>
                  <h2 className="text-5xl font-bold text-white mb-6">$0.00</h2>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                    <div>
                      <p className="text-xs text-white/40 mb-1 uppercase tracking-wider">Gem Holdings</p>
                      <p className="text-xl font-semibold text-[#D4AF37]">0.00g</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/40 mb-1 uppercase tracking-wider">Fiat Balance</p>
                      <p className="text-xl font-semibold text-white">$0.00</p>
                    </div>
                    {accountType === 'business' && (
                      <div>
                        <p className="text-xs text-white/40 mb-1 uppercase tracking-wider">Active Trades</p>
                        <p className="text-xl font-semibold text-[#8A2BE2]">0</p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              {/* Quick Actions */}
              <div className="grid sm:grid-cols-3 gap-4">
                <ActionCard 
                  icon={<TrendingUp className="w-6 h-6 text-[#D4AF37]" />}
                  title="Buy Gem"
                  desc="Live rate: $85.40/g"
                />
                <ActionCard 
                  icon={<ArrowUpRight className="w-6 h-6 text-[#FF2FBF]" />}
                  title="Send Money"
                  desc="Instant transfers"
                />
                <ActionCard 
                  icon={<CreditCard className="w-6 h-6 text-[#8A2BE2]" />}
                  title={accountType === 'personal' ? 'FinaCard' : 'Corporate Card'}
                  desc="Manage cards"
                />
              </div>

              {/* Recent Activity */}
              <Card className="bg-white/5 border-white/10 p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-semibold text-white">Recent Activity</h3>
                  <Button variant="link" className="text-[#D4AF37] h-auto p-0">View All</Button>
                </div>
                
                <div className="text-center py-12 text-white/40">
                  <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No recent transactions</p>
                </div>
              </Card>
            </div>

            {/* Right Column: Status & Info */}
            <div className="space-y-6">
              
              {/* Verification Status */}
              <Card className="p-6 bg-white/5 border-white/10">
                <h3 className="font-semibold text-white mb-4">Account Status</h3>
                <div className="space-y-4">
                  <StatusItem 
                    icon={<ShieldCheck className="w-5 h-5" />} 
                    label="Identity Verification" 
                    status="Pending" 
                    color="text-yellow-500"
                  />
                  <StatusItem 
                    icon={<FileText className="w-5 h-5" />} 
                    label="Documents" 
                    status="Under Review" 
                    color="text-yellow-500"
                  />
                  <div className="pt-4 border-t border-white/10">
                    <p className="text-xs text-white/40 leading-relaxed">
                      Your account is currently under review. Full features will be enabled once verification is complete (usually 24-48h).
                    </p>
                  </div>
                </div>
              </Card>

              {/* Market Widget */}
              <Card className="p-6 bg-white/5 border-white/10">
                <h3 className="font-semibold text-white mb-4">Gem Market</h3>
                <div className="flex items-end justify-between mb-2">
                  <span className="text-3xl font-bold text-white">$2,654.20</span>
                  <span className="text-[#4CAF50] font-medium flex items-center mb-1">
                    <TrendingUp className="w-4 h-4 mr-1" /> +1.2%
                  </span>
                </div>
                <p className="text-xs text-white/40">Per troy ounce • Live Data</p>
                
                <div className="h-24 mt-6 flex items-end justify-between gap-1">
                  {[40, 65, 45, 70, 50, 80, 60].map((h, i) => (
                    <div key={i} className="w-full bg-[#D4AF37]/20 rounded-sm hover:bg-[#D4AF37] transition-colors" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </Card>

            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
}

function ActionCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <motion.button 
      whileHover={{ y: -2 }}
      className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 text-left transition-all"
    >
      <div className="mb-3 p-2 bg-white/5 rounded-lg w-fit">
        {icon}
      </div>
      <h4 className="font-semibold text-white mb-1">{title}</h4>
      <p className="text-xs text-white/40">{desc}</p>
    </motion.button>
  );
}

function StatusItem({ icon, label, status, color }: { icon: React.ReactNode, label: string, status: string, color: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3 text-white/80">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <span className={`text-xs font-medium px-2 py-1 rounded-full bg-white/5 ${color}`}>
        {status}
      </span>
    </div>
  );
}
