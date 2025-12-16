import React, { useEffect } from 'react';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, DollarSign, Activity, ShieldCheck, ArrowUpRight, ArrowDownRight, Clock, Loader2, AlertCircle, TrendingUp, Wallet, BarChart3, Vault, CreditCard, Building2, ArrowRightLeft, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { toast } from 'sonner';

interface AdminStats {
  totalUsers: number;
  pendingKycCount: number;
  totalVolume: number;
  totalVolumeAed: number;
  revenue: number;
  revenueAed: number;
  pendingDeposits: number;
  pendingWithdrawals: number;
  pendingTransactions: number;
  pendingKycRequests: Array<{
    id: string;
    userId: string;
    name: string;
    type: string;
    status: string;
    createdAt: string;
  }>;
}

function formatAed(amount: number): string {
  if (amount >= 1000000) {
    return `AED ${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `AED ${(amount / 1000).toFixed(1)}k`;
  }
  return `AED ${amount.toFixed(0)}`;
}

function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}k`;
  }
  return `$${amount.toFixed(0)}`;
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

export default function AdminDashboard() {
  const { data: stats, isLoading, error } = useQuery<AdminStats>({
    queryKey: ['/api/admin/stats'],
    queryFn: async () => {
      const res = await fetch('/api/admin/stats');
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
    refetchInterval: 30000
  });

  useEffect(() => {
    if (error) {
      toast.error('Failed to load dashboard stats', {
        description: 'Please try refreshing the page.'
      });
    }
  }, [error]);

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent" data-testid="text-admin-title">Dashboard Overview</h1>
            <p className="text-gray-500 mt-1">Welcome back! Here's what's happening with your platform today.</p>
          </div>
          <div className="hidden md:flex items-center gap-2 text-sm text-gray-500">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>Live data</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <GlassStatsCard 
            title="Total Users" 
            value={isLoading ? '...' : stats?.totalUsers?.toLocaleString() || '0'}
            subtitle="Registered accounts"
            icon={<Users className="w-6 h-6" />} 
            gradient="from-blue-500 to-indigo-600"
            loading={isLoading}
          />
          <GlassStatsCard 
            title="Total Volume" 
            value={isLoading ? '...' : formatCurrency(stats?.totalVolume || 0)}
            subtitle={isLoading ? 'All-time transactions' : `${formatAed(stats?.totalVolumeAed || 0)}`}
            icon={<BarChart3 className="w-6 h-6" />} 
            gradient="from-purple-500 to-pink-600"
            loading={isLoading}
          />
          <GlassStatsCard 
            title="Pending KYC" 
            value={isLoading ? '...' : stats?.pendingKycCount?.toString() || '0'}
            subtitle="Awaiting review"
            icon={<ShieldCheck className="w-6 h-6" />} 
            gradient="from-orange-500 to-red-500"
            loading={isLoading}
          />
          <GlassStatsCard 
            title="Revenue" 
            value={isLoading ? '...' : formatCurrency(stats?.revenue || 0)}
            subtitle={isLoading ? 'Platform earnings' : `${formatAed(stats?.revenueAed || 0)}`}
            icon={<TrendingUp className="w-6 h-6" />} 
            gradient="from-emerald-500 to-teal-600"
            loading={isLoading}
          />
        </div>

        {/* Pending Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <PendingCard
            title="Pending Deposits"
            count={stats?.pendingDeposits || 0}
            icon={<ArrowDownRight className="w-5 h-5" />}
            color="green"
            loading={isLoading}
          />
          <PendingCard
            title="Pending Withdrawals"
            count={stats?.pendingWithdrawals || 0}
            icon={<ArrowUpRight className="w-5 h-5" />}
            color="orange"
            loading={isLoading}
          />
          <PendingCard
            title="Pending Transactions"
            count={stats?.pendingTransactions || 0}
            icon={<Clock className="w-5 h-5" />}
            color="yellow"
            loading={isLoading}
          />
        </div>

        {/* Product Cards */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Products & Services</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <ProductCard
              title="FinaPay"
              description="Digital gold wallet management"
              icon={<Wallet className="w-8 h-8" />}
              href="/admin/transactions"
              color="bg-black"
            />
            <ProductCard
              title="FinaVault"
              description="Gold storage & custody"
              icon={<Vault className="w-8 h-8" />}
              href="/admin/vault"
              color="bg-black"
            />
            <ProductCard
              title="FinaBridge"
              description="Trade finance management"
              icon={<Building2 className="w-8 h-8" />}
              href="/admin/finabridge"
              color="bg-black"
            />
            <ProductCard
              title="BNSL"
              description="Buy Now Sell Later plans"
              icon={<ArrowRightLeft className="w-8 h-8" />}
              href="/admin/bnsl"
              color="bg-black"
            />
            <ProductCard
              title="FinaCard"
              description="Debit card management"
              icon={<CreditCard className="w-8 h-8" />}
              href="/admin/settings"
              color="bg-black"
            />
            <ProductCard
              title="KYC Review"
              description="Verification submissions"
              icon={<ShieldCheck className="w-8 h-8" />}
              href="/admin/kyc"
              color="bg-black"
            />
            <ProductCard
              title="Users"
              description="User management"
              icon={<Users className="w-8 h-8" />}
              href="/admin/users"
              color="bg-black"
            />
            <ProductCard
              title="Compliance"
              description="AML & compliance settings"
              icon={<Activity className="w-8 h-8" />}
              href="/admin/compliance"
              color="bg-black"
            />
          </div>
        </div>

        {/* Recent Activity & KYC Requests */}
        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Recent KYC Requests */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Pending KYC Requests</CardTitle>
              <Link href="/admin/kyc">
                <Button variant="outline" size="sm" data-testid="button-view-all-kyc">View All</Button>
              </Link>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : stats?.pendingKycRequests && stats.pendingKycRequests.length > 0 ? (
                <div className="space-y-4">
                  {stats.pendingKycRequests.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors" data-testid={`row-kyc-${item.id}`}>
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600">
                          {item.name[0]}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{item.name}</p>
                          <p className="text-xs text-gray-500">{item.type} Account • {formatTimeAgo(item.createdAt)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-none">
                          <Clock className="w-3 h-3 mr-1" /> {item.status}
                        </Badge>
                        <Link href={`/admin/users/${item.userId}`}>
                          <Button size="sm" variant="ghost" data-testid={`button-review-${item.userId}`}>Review</Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <ShieldCheck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No pending KYC requests</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* System Status */}
          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <StatusItem label="FinaVault Storage" status="Operational" color="green" />
              <StatusItem label="Payment Gateway" status="Operational" color="green" />
              <StatusItem label="KYC Verification API" status="Operational" color="green" />
              <StatusItem label="Email Service" status="Operational" color="green" />
              
              <div className="mt-8 p-4 bg-slate-50 rounded-lg border border-slate-100">
                <h4 className="font-medium text-sm mb-2 text-slate-900">Admin Notices</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  All systems operational. Platform is running smoothly.
                </p>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </AdminLayout>
  );
}

function GlassStatsCard({ title, value, subtitle, icon, gradient, loading }: { 
  title: string; 
  value: string; 
  subtitle: string; 
  icon: React.ReactNode; 
  gradient: string; 
  loading: boolean;
}) {
  return (
    <div className="relative group">
      <div className={`absolute inset-0 bg-gradient-to-r ${gradient} rounded-2xl blur-xl opacity-25 group-hover:opacity-40 transition-opacity duration-500`} />
      <Card className="relative overflow-hidden border-0 shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
              <h3 className="text-3xl font-bold text-gray-900 tracking-tight" data-testid={`text-stat-${title.toLowerCase().replace(/\s+/g, '-')}`}>
                {loading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                  </div>
                ) : value}
              </h3>
              <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
            </div>
            <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient} text-white shadow-lg`}>
              {icon}
            </div>
          </div>
          <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient}`} />
        </CardContent>
      </Card>
    </div>
  );
}

function StatusItem({ label, status, color }: any) {
  const colors = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500'
  };
  
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${(colors as any)[color]}`} />
        <span className="text-xs text-gray-500">{status}</span>
      </div>
    </div>
  );
}

function ProductCard({ title, description, icon, href, color }: {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  color: string;
}) {
  return (
    <Link href={href}>
      <Card className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-2 border-black" data-testid={`card-product-${title.toLowerCase().replace(/\s+/g, '-')}`}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className={`p-3 rounded-xl ${color} text-white`}>
              {icon}
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>
          <div className="mt-4">
            <h3 className="font-bold text-lg text-black">{title}</h3>
            <p className="text-sm text-gray-600 mt-1">{description}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function PendingCard({ title, count, icon, color, loading }: {
  title: string;
  count: number;
  icon: React.ReactNode;
  color: 'green' | 'orange' | 'yellow';
  loading?: boolean;
}) {
  const colorClasses = {
    green: { bg: 'bg-green-50', icon: 'bg-green-100 text-green-600', text: 'text-green-700' },
    orange: { bg: 'bg-orange-50', icon: 'bg-orange-100 text-orange-600', text: 'text-orange-700' },
    yellow: { bg: 'bg-yellow-50', icon: 'bg-yellow-100 text-yellow-600', text: 'text-yellow-700' },
  };
  
  const colors = colorClasses[color];
  
  return (
    <Card className={`${colors.bg} border-0 shadow-sm`} data-testid={`card-pending-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${colors.icon}`}>
            {icon}
          </div>
          <div>
            <p className="text-sm text-gray-600">{title}</p>
            <p className={`text-2xl font-bold ${colors.text}`}>
              {loading ? '...' : count}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
