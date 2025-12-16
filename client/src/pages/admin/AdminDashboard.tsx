import React, { useEffect } from 'react';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, DollarSign, Activity, ShieldCheck, ArrowUpRight, ArrowDownRight, Clock, Loader2, TrendingUp, BarChart3 } from 'lucide-react';
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
            <h1 className="text-3xl font-bold text-foreground" data-testid="text-admin-title">Dashboard Overview</h1>
            <p className="text-muted-foreground mt-1">Welcome back! Here's what's happening with your platform today.</p>
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

        {/* Operations Overview */}
        <div>
          <h2 className="text-xl font-semibold mb-4 text-foreground">Operations Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <MetricCard
              title="Pending Deposits"
              value={stats?.pendingDeposits || 0}
              icon={<ArrowDownRight className="w-5 h-5" />}
              color="emerald"
              loading={isLoading}
            />
            <MetricCard
              title="Pending Withdrawals"
              value={stats?.pendingWithdrawals || 0}
              icon={<ArrowUpRight className="w-5 h-5" />}
              color="orange"
              loading={isLoading}
            />
            <MetricCard
              title="Total Deposits"
              value={45}
              icon={<ArrowDownRight className="w-5 h-5" />}
              color="blue"
              loading={isLoading}
            />
            <MetricCard
              title="Total Withdrawals"
              value={28}
              icon={<ArrowUpRight className="w-5 h-5" />}
              color="purple"
              loading={isLoading}
            />
            <MetricCard
              title="Total Requests"
              value={73}
              icon={<Activity className="w-5 h-5" />}
              color="slate"
              loading={isLoading}
            />
            <MetricCard
              title="Open / Review"
              value={12}
              icon={<Clock className="w-5 h-5" />}
              color="yellow"
              loading={isLoading}
            />
            <MetricCard
              title="Active Plans"
              value={34}
              icon={<TrendingUp className="w-5 h-5" />}
              color="teal"
              loading={isLoading}
            />
            <MetricCard
              title="Base Liability"
              value="$125k"
              icon={<DollarSign className="w-5 h-5" />}
              color="red"
              loading={isLoading}
            />
            <MetricCard
              title="Margin Liability"
              value="$45k"
              icon={<BarChart3 className="w-5 h-5" />}
              color="pink"
              loading={isLoading}
            />
            <MetricCard
              title="Term Requests"
              value={8}
              icon={<Clock className="w-5 h-5" />}
              color="indigo"
              loading={isLoading}
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

function MetricCard({ title, value, icon, color, loading }: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: 'emerald' | 'orange' | 'blue' | 'purple' | 'slate' | 'yellow' | 'teal' | 'red' | 'pink' | 'indigo';
  loading?: boolean;
}) {
  const colorClasses = {
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', icon: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400', text: 'text-emerald-700 dark:text-emerald-300' },
    orange: { bg: 'bg-orange-50 dark:bg-orange-950/30', icon: 'bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400', text: 'text-orange-700 dark:text-orange-300' },
    blue: { bg: 'bg-blue-50 dark:bg-blue-950/30', icon: 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400', text: 'text-blue-700 dark:text-blue-300' },
    purple: { bg: 'bg-purple-50 dark:bg-purple-950/30', icon: 'bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400', text: 'text-purple-700 dark:text-purple-300' },
    slate: { bg: 'bg-slate-50 dark:bg-slate-950/30', icon: 'bg-slate-100 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400', text: 'text-slate-700 dark:text-slate-300' },
    yellow: { bg: 'bg-yellow-50 dark:bg-yellow-950/30', icon: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-600 dark:text-yellow-400', text: 'text-yellow-700 dark:text-yellow-300' },
    teal: { bg: 'bg-teal-50 dark:bg-teal-950/30', icon: 'bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-400', text: 'text-teal-700 dark:text-teal-300' },
    red: { bg: 'bg-red-50 dark:bg-red-950/30', icon: 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400', text: 'text-red-700 dark:text-red-300' },
    pink: { bg: 'bg-pink-50 dark:bg-pink-950/30', icon: 'bg-pink-100 dark:bg-pink-900/50 text-pink-600 dark:text-pink-400', text: 'text-pink-700 dark:text-pink-300' },
    indigo: { bg: 'bg-indigo-50 dark:bg-indigo-950/30', icon: 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400', text: 'text-indigo-700 dark:text-indigo-300' },
  };
  
  const colors = colorClasses[color];
  
  return (
    <Card className={`${colors.bg} border-0 shadow-sm`} data-testid={`card-metric-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${colors.icon}`}>
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground truncate">{title}</p>
            <p className={`text-xl font-bold ${colors.text}`}>
              {loading ? '...' : value}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
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
