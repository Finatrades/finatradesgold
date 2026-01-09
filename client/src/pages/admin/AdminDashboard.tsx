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
  totalDeposits: number;
  totalWithdrawals: number;
  totalRequests: number;
  openReviewCount: number;
  activeBnslPlans: number;
  bnslBaseLiability: number;
  bnslMarginLiability: number;
  pendingBnslTermRequests: number;
  openTradeCases: number;
  pendingReviewCases: number;
  // Percentage changes (real data)
  volumeChange: number;
  revenueChange: number;
  userGrowthChange: number;
  currentMonthVolume: number;
  lastMonthVolume: number;
  recentCriticalEvents: Array<{
    id: string;
    action: string;
    actorEmail: string;
    actorRole: string;
    targetType: string;
    targetId: string;
    createdAt: string;
    details: any;
  }>;
  pendingKycRequests: Array<{
    id: string;
    userId: string;
    name: string;
    type: string;
    status: string;
    createdAt: string;
  }>;
  recentTransactions: Array<{
    id: number;
    userId: number;
    type: string;
    status: string;
    amountGold: string | null;
    amountUsd: string | null;
    description: string | null;
    sourceModule: string | null;
    createdAt: string;
  }>;
}

function formatAed(amount: number): string {
  if (amount >= 1000000) {
    return `Dh ${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `Dh ${(amount / 1000).toFixed(1)}k`;
  }
  return `Dh ${amount.toFixed(0)}`;
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
            percentChange={stats?.userGrowthChange ?? 0}
            href="/admin/users"
          />
          <GlassStatsCard 
            title="Total Volume" 
            value={isLoading ? '...' : formatCurrency(stats?.totalVolume || 0)}
            subtitle={isLoading ? 'All-time transactions' : `${formatAed(stats?.totalVolumeAed || 0)}`}
            icon={<BarChart3 className="w-6 h-6" />} 
            gradient="from-purple-500 to-pink-600"
            loading={isLoading}
            percentChange={stats?.volumeChange ?? 0}
            href="/admin/transactions"
          />
          <GlassStatsCard 
            title="Pending KYC" 
            value={isLoading ? '...' : stats?.pendingKycCount?.toString() || '0'}
            subtitle="Awaiting review"
            icon={<ShieldCheck className="w-6 h-6" />} 
            gradient="from-purple-500 to-red-500"
            loading={isLoading}
            href="/admin/kyc"
          />
          <GlassStatsCard 
            title="Revenue" 
            value={isLoading ? '...' : formatCurrency(stats?.revenue || 0)}
            subtitle={isLoading ? 'Platform earnings' : `${formatAed(stats?.revenueAed || 0)}`}
            icon={<TrendingUp className="w-6 h-6" />} 
            gradient="from-emerald-500 to-teal-600"
            loading={isLoading}
            percentChange={stats?.revenueChange ?? 0}
            href="/admin/financial-reports"
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
            href="/admin/payment-operations"
          />
          <PendingCard
            title="Pending Withdrawals"
            count={stats?.pendingWithdrawals || 0}
            icon={<ArrowUpRight className="w-5 h-5" />}
            color="orange"
            loading={isLoading}
            href="/admin/payment-operations"
          />
          <PendingCard
            title="Pending Transactions"
            count={stats?.pendingTransactions || 0}
            icon={<Clock className="w-5 h-5" />}
            color="yellow"
            loading={isLoading}
            href="/admin/transactions"
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
              href="/admin/payment-operations"
            />
            <MetricCard
              title="Pending Withdrawals"
              value={stats?.pendingWithdrawals || 0}
              icon={<ArrowUpRight className="w-5 h-5" />}
              color="orange"
              loading={isLoading}
              href="/admin/payment-operations"
            />
            <MetricCard
              title="Total Deposits"
              value={stats?.totalDeposits || 0}
              icon={<ArrowDownRight className="w-5 h-5" />}
              color="blue"
              loading={isLoading}
              href="/admin/transactions"
            />
            <MetricCard
              title="Total Withdrawals"
              value={stats?.totalWithdrawals || 0}
              icon={<ArrowUpRight className="w-5 h-5" />}
              color="purple"
              loading={isLoading}
              href="/admin/transactions"
            />
            <MetricCard
              title="Total Requests"
              value={stats?.totalRequests || 0}
              icon={<Activity className="w-5 h-5" />}
              color="slate"
              loading={isLoading}
              href="/admin/transactions"
            />
            <MetricCard
              title="Open / Review"
              value={stats?.openReviewCount || 0}
              icon={<Clock className="w-5 h-5" />}
              color="yellow"
              loading={isLoading}
              href="/admin/kyc"
            />
            <MetricCard
              title="Active BNSL Plans"
              value={stats?.activeBnslPlans || 0}
              icon={<TrendingUp className="w-5 h-5" />}
              color="teal"
              loading={isLoading}
              href="/admin/bnsl"
            />
            <MetricCard
              title="Base Liability"
              value={formatCurrency(stats?.bnslBaseLiability || 0)}
              icon={<DollarSign className="w-5 h-5" />}
              color="red"
              loading={isLoading}
              href="/admin/bnsl"
            />
            <MetricCard
              title="Margin Liability"
              value={formatCurrency(stats?.bnslMarginLiability || 0)}
              icon={<BarChart3 className="w-5 h-5" />}
              color="pink"
              loading={isLoading}
              href="/admin/bnsl"
            />
            <MetricCard
              title="Term Requests"
              value={stats?.pendingBnslTermRequests || 0}
              icon={<Clock className="w-5 h-5" />}
              color="indigo"
              loading={isLoading}
              href="/admin/bnsl"
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

        {/* Recent Transactions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Transactions</CardTitle>
            <Link href="/admin/transactions">
              <Button variant="outline" size="sm" data-testid="button-view-all-transactions">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : stats?.recentTransactions && stats.recentTransactions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">ID</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Type</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Status</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Amount</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Source</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Time</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentTransactions.map((tx) => (
                      <tr key={tx.id} className="border-b border-border/50 hover:bg-muted/50" data-testid={`row-transaction-${tx.id}`}>
                        <td className="py-3 px-2 font-mono text-xs">#{tx.id}</td>
                        <td className="py-3 px-2">
                          <Badge variant="secondary" className={
                            tx.type === 'Deposit' ? 'bg-success-muted text-success' :
                            tx.type === 'Withdrawal' ? 'bg-error-muted text-error-muted-foreground' :
                            tx.type === 'Transfer' ? 'bg-info-muted text-info-muted-foreground' :
                            'bg-muted text-muted-foreground'
                          }>
                            {tx.type}
                          </Badge>
                        </td>
                        <td className="py-3 px-2">
                          <Badge variant="secondary" className={
                            tx.status === 'Completed' ? 'bg-success-muted text-success' :
                            tx.status === 'Pending' ? 'bg-warning-muted text-warning-muted-foreground' :
                            tx.status === 'Failed' ? 'bg-error-muted text-error-muted-foreground' :
                            'bg-muted text-muted-foreground'
                          }>
                            {tx.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-2">
                          {tx.amountGold ? (
                            <span className="font-medium">{parseFloat(tx.amountGold).toFixed(4)}g</span>
                          ) : tx.amountUsd ? (
                            <span className="font-medium">${parseFloat(tx.amountUsd).toFixed(2)}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-xs text-muted-foreground">
                          {tx.sourceModule || '-'}
                        </td>
                        <td className="py-3 px-2 text-xs text-muted-foreground">
                          {formatTimeAgo(tx.createdAt)}
                        </td>
                        <td className="py-3 px-2">
                          <Link href={`/admin/transactions?id=${tx.id}`}>
                            <Button size="sm" variant="ghost" data-testid={`button-view-tx-${tx.id}`}>View</Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No recent transactions</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

function GlassStatsCard({ title, value, subtitle, icon, gradient, loading, percentChange, href }: { 
  title: string; 
  value: string; 
  subtitle: string; 
  icon: React.ReactNode; 
  gradient: string; 
  loading: boolean;
  percentChange?: number;
  href?: string;
}) {
  const content = (
    <div className="relative group">
      <div className={`absolute inset-0 bg-gradient-to-r ${gradient} rounded-2xl blur-xl opacity-25 group-hover:opacity-40 transition-opacity duration-500`} />
      <Card className={`relative overflow-hidden border-0 shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300 ${href ? 'cursor-pointer' : ''}`}>
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
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-gray-400">{subtitle}</p>
                {!loading && percentChange !== undefined && (
                  <span className={`text-xs font-medium flex items-center gap-0.5 ${
                    percentChange > 0 ? 'text-green-600' : percentChange < 0 ? 'text-red-600' : 'text-gray-400'
                  }`}>
                    {percentChange > 0 ? (
                      <ArrowUpRight className="w-3 h-3" />
                    ) : percentChange < 0 ? (
                      <ArrowDownRight className="w-3 h-3" />
                    ) : null}
                    {percentChange > 0 ? '+' : ''}{percentChange}%
                  </span>
                )}
              </div>
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

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
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

function MetricCard({ title, value, icon, color, loading, href }: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: 'emerald' | 'orange' | 'blue' | 'purple' | 'slate' | 'yellow' | 'teal' | 'red' | 'pink' | 'indigo';
  loading?: boolean;
  href?: string;
}) {
  const colorClasses = {
    emerald: { bg: 'bg-emerald-50', icon: 'bg-emerald-100 text-emerald-600', text: 'text-emerald-700' },
    orange: { bg: 'bg-purple-50', icon: 'bg-purple-100 text-purple-600', text: 'text-purple-700' },
    blue: { bg: 'bg-blue-50', icon: 'bg-blue-100 text-blue-600', text: 'text-blue-700' },
    purple: { bg: 'bg-purple-50', icon: 'bg-purple-100 text-purple-600', text: 'text-purple-700' },
    slate: { bg: 'bg-slate-50', icon: 'bg-slate-100 text-slate-600', text: 'text-slate-700' },
    yellow: { bg: 'bg-yellow-50', icon: 'bg-yellow-100 text-yellow-600', text: 'text-yellow-700' },
    teal: { bg: 'bg-teal-50', icon: 'bg-teal-100 text-teal-600', text: 'text-teal-700' },
    red: { bg: 'bg-red-50', icon: 'bg-red-100 text-red-600', text: 'text-red-700' },
    pink: { bg: 'bg-pink-50', icon: 'bg-pink-100 text-pink-600', text: 'text-pink-700' },
    indigo: { bg: 'bg-indigo-50', icon: 'bg-indigo-100 text-indigo-600', text: 'text-indigo-700' },
  };
  
  const colors = colorClasses[color];
  
  const cardContent = (
    <Card className={`${colors.bg} border-0 shadow-sm ${href ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`} data-testid={`card-metric-${title.toLowerCase().replace(/\s+/g, '-')}`}>
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
  
  if (href) {
    return <Link href={href}>{cardContent}</Link>;
  }
  
  return cardContent;
}

function PendingCard({ title, count, icon, color, loading, href }: {
  title: string;
  count: number;
  icon: React.ReactNode;
  color: 'green' | 'orange' | 'yellow';
  loading?: boolean;
  href?: string;
}) {
  const colorClasses = {
    green: { bg: 'bg-green-50', icon: 'bg-green-100 text-green-600', text: 'text-green-700' },
    orange: { bg: 'bg-purple-50', icon: 'bg-purple-100 text-purple-600', text: 'text-purple-700' },
    yellow: { bg: 'bg-yellow-50', icon: 'bg-yellow-100 text-yellow-600', text: 'text-yellow-700' },
  };
  
  const colors = colorClasses[color];
  
  const cardContent = (
    <Card className={`${colors.bg} border-0 shadow-sm ${href ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`} data-testid={`card-pending-${title.toLowerCase().replace(/\s+/g, '-')}`}>
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
  
  if (href) {
    return <Link href={href}>{cardContent}</Link>;
  }
  
  return cardContent;
}
