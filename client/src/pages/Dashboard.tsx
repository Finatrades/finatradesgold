import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Database, 
  DollarSign, 
  TrendingUp, 
  Globe, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  CreditCard, 
  Briefcase, 
  ShieldCheck,
  Clock,
  ChevronRight,
  Bell
} from 'lucide-react';
import { Link } from 'wouter';
import { useFinaPay } from '@/context/FinaPayContext';

export default function Dashboard() {
  const { user } = useAuth();
  // We can try to use FinaPay context if available, or fall back to mock data for the dashboard overview
  // Ideally, the dashboard aggregates data from all contexts. For now, we'll mock the aggregation or use what's available.
  
  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8 pb-12">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Command Center</h1>
            <p className="text-gray-500">Welcome back, {user.firstName}. Here is your financial overview.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2">
              <Bell className="w-4 h-4" />
              Alerts
            </Button>
            <Link href="/finapay">
              <Button className="bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0">
                <Wallet className="w-4 h-4 mr-2" />
                Open Wallet
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick Access Pillars - Mirroring Admin's modular approach */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
           <Link href="/finapay">
             <Card className="hover:border-amber-500 transition-colors cursor-pointer h-full group">
               <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                 <div className="p-3 bg-amber-100 text-amber-700 rounded-full group-hover:bg-amber-600 group-hover:text-white transition-colors">
                   <Wallet className="w-6 h-6" />
                 </div>
                 <div>
                   <h3 className="font-bold text-gray-900">FinaPay</h3>
                   <p className="text-xs text-gray-500">Digital Gold Wallet</p>
                 </div>
               </CardContent>
             </Card>
           </Link>
           <Link href="/finavault">
             <Card className="hover:border-blue-500 transition-colors cursor-pointer h-full group">
               <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                 <div className="p-3 bg-blue-100 text-blue-700 rounded-full group-hover:bg-blue-600 group-hover:text-white transition-colors">
                   <Database className="w-6 h-6" />
                 </div>
                 <div>
                   <h3 className="font-bold text-gray-900">FinaVault</h3>
                   <p className="text-xs text-gray-500">Physical Storage</p>
                 </div>
               </CardContent>
             </Card>
           </Link>
           <Link href="/bnsl">
             <Card className="hover:border-green-500 transition-colors cursor-pointer h-full group">
               <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                 <div className="p-3 bg-green-100 text-green-700 rounded-full group-hover:bg-green-600 group-hover:text-white transition-colors">
                   <TrendingUp className="w-6 h-6" />
                 </div>
                 <div>
                   <h3 className="font-bold text-gray-900">BNSL Plans</h3>
                   <p className="text-xs text-gray-500">Yield & Staking</p>
                 </div>
               </CardContent>
             </Card>
           </Link>
           <Link href="/finabridge">
             <Card className="hover:border-purple-500 transition-colors cursor-pointer h-full group">
               <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                 <div className="p-3 bg-purple-100 text-purple-700 rounded-full group-hover:bg-purple-600 group-hover:text-white transition-colors">
                   <Briefcase className="w-6 h-6" />
                 </div>
                 <div>
                   <h3 className="font-bold text-gray-900">FinaBridge</h3>
                   <p className="text-xs text-gray-500">Trade Finance</p>
                 </div>
               </CardContent>
             </Card>
           </Link>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard 
            title="Total Gold Holdings" 
            value="1,250.50 g" 
            subValue="≈ $94,412.75"
            change="+2.5%" 
            trend="up" 
            icon={<Database className="w-5 h-5 text-amber-600" />} 
            bg="bg-amber-50"
          />
          <StatsCard 
            title="Portfolio Value" 
            value="$1,150,000" 
            subValue="Combined Assets"
            change="+8.2%" 
            trend="up" 
            icon={<DollarSign className="w-5 h-5 text-green-600" />} 
            bg="bg-green-50"
          />
          <StatsCard 
            title="Active BNSL Plans" 
            value="3 Active" 
            subValue="850g Locked"
            change="Stable" 
            trend="neutral" 
            icon={<TrendingUp className="w-5 h-5 text-blue-600" />} 
            bg="bg-blue-50"
          />
          <StatsCard 
            title="Rewards Earned" 
            value="18.75 g" 
            subValue="Lifetime Profit"
            change="+15.3%" 
            trend="up" 
            icon={<Globe className="w-5 h-5 text-purple-600" />} 
            bg="bg-purple-50"
          />
        </div>

        {/* Content Section */}
        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Recent Activity */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Your latest transactions across all modules.</CardDescription>
              </div>
              <Link href="/finapay">
                <Button variant="outline" size="sm">View All</Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { title: 'Bought Gold', subtitle: 'FinaPay • Card Purchase', amount: '+50.00 g', date: '2 mins ago', status: 'Completed', type: 'in' },
                  { title: 'BNSL Plan Started', subtitle: 'BNSL • 12 Month Plan', amount: '-200.00 g', date: '2 hours ago', status: 'Active', type: 'locked' },
                  { title: 'Trade Settlement', subtitle: 'FinaBridge • Case TF-2025-001', amount: 'Locked', date: '1 day ago', status: 'Pending', type: 'locked' },
                  { title: 'Sent Gold', subtitle: 'FinaPay • Transfer to John', amount: '-10.00 g', date: '3 days ago', status: 'Completed', type: 'out' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                        item.type === 'in' ? 'bg-green-100 text-green-600' :
                        item.type === 'out' ? 'bg-red-100 text-red-600' :
                        'bg-blue-100 text-blue-600'
                      }`}>
                        {item.type === 'in' ? <ArrowDownRight className="w-5 h-5" /> : 
                         item.type === 'out' ? <ArrowUpRight className="w-5 h-5" /> :
                         <Briefcase className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{item.title}</p>
                        <p className="text-xs text-gray-500">{item.subtitle}</p>
                      </div>
                    </div>
                    <div className="text-right">
                       <p className={`font-bold text-sm ${
                          item.type === 'in' ? 'text-green-600' : 'text-gray-900'
                       }`}>
                          {item.amount}
                       </p>
                       <p className="text-xs text-gray-400">{item.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Account Status & Verification */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Account Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <StatusItem 
                  label="Identity Verification" 
                  status={user.kycStatus === 'verified' || (user.kycStatus as any) === 'approved' ? 'Verified' : 'Pending'} 
                  color={user.kycStatus === 'verified' || (user.kycStatus as any) === 'approved' ? 'green' : 'yellow'} 
                  icon={<ShieldCheck className="w-4 h-4" />}
                />
                <StatusItem label="FinaCard Status" status="Active" color="green" icon={<CreditCard className="w-4 h-4" />} />
                <StatusItem label="2FA Security" status="Enabled" color="green" icon={<Database className="w-4 h-4" />} />
                
                <div className="mt-8 p-4 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="bg-white">Gold Tier</Badge>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    You are enjoying Gold Tier benefits including lower transaction fees and priority support.
                  </p>
                  <Button variant="link" className="p-0 h-auto text-xs mt-2 text-amber-600">View Benefits</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-gray-900 to-gray-800 text-white border-none">
               <CardContent className="p-6">
                  <h3 className="font-bold text-lg mb-2">Need Help?</h3>
                  <p className="text-sm text-gray-400 mb-4">Our concierge team is available 24/7 to assist with your gold portfolio.</p>
                  <Button variant="secondary" className="w-full">Contact Support</Button>
               </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}

function StatsCard({ title, value, subValue, change, trend, icon, bg }: any) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-xl ${bg}`}>
            {icon}
          </div>
          {trend !== 'neutral' && (
            <div className={`flex items-center gap-1 text-xs font-medium ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
              {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {change}
            </div>
          )}
          {trend === 'neutral' && (
             <Badge variant="secondary" className="text-xs">{change}</Badge>
          )}
        </div>
        <div>
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
          {subValue && <p className="text-xs text-gray-400 mt-1">{subValue}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function StatusItem({ label, status, color, icon }: any) {
  const colors = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500'
  };
  
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
         <div className="text-gray-400">{icon}</div>
         <span className="text-sm font-medium text-gray-700">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${(colors as any)[color]}`} />
        <span className="text-xs text-gray-500">{status}</span>
      </div>
    </div>
  );
}
