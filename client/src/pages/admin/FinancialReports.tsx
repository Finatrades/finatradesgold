import React, { useState } from 'react';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { 
  DollarSign, TrendingUp, TrendingDown, Users, Wallet, 
  Building2, Clock, FileText, Download, RefreshCcw,
  PiggyBank, CreditCard, Vault, BarChart3, PieChart,
  ArrowUpRight, ArrowDownRight, AlertTriangle, CheckCircle2,
  Loader2, Calendar
} from 'lucide-react';
import { format } from 'date-fns';

interface FinancialOverview {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  totalAUM: number;
  goldHoldingsGrams: number;
  goldValueUsd: number;
  fiatBalancesUsd: number;
  totalLiabilities: number;
  goldLiabilityGrams: number;
  pendingPayoutsUsd: number;
}

interface ProductMetrics {
  finapay: {
    activeWallets: number;
    transactionCount: number;
    volumeUsd: number;
    feesCollectedUsd: number;
  };
  finavault: {
    totalHoldings: number;
    goldStoredGrams: number;
    storageFeesUsd: number;
    activeUsers: number;
  };
  bnsl: {
    activePlans: number;
    totalPrincipalUsd: number;
    interestEarnedUsd: number;
    expectedPayoutsUsd: number;
    delinquentPlans: number;
  };
}

interface UserFinancialData {
  id: string;
  name: string;
  email: string;
  accountType: string;
  walletBalanceUsd: number;
  goldHoldingsGrams: number;
  bnslPlansCount: number;
  totalTransactions: number;
  lastActivity: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

function formatGrams(grams: number): string {
  return `${grams.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}g`;
}

export default function FinancialReports() {
  const [dateRange, setDateRange] = useState('30d');
  const [activeTab, setActiveTab] = useState('overview');

  const { data: overview, isLoading: loadingOverview, refetch: refetchOverview } = useQuery<FinancialOverview>({
    queryKey: ['/api/admin/financial/overview', dateRange],
    queryFn: async () => {
      const res = await fetch(`/api/admin/financial/overview?range=${dateRange}`);
      if (!res.ok) throw new Error('Failed to fetch financial overview');
      return res.json();
    }
  });

  const { data: metrics, isLoading: loadingMetrics } = useQuery<ProductMetrics>({
    queryKey: ['/api/admin/financial/metrics', dateRange],
    queryFn: async () => {
      const res = await fetch(`/api/admin/financial/metrics?range=${dateRange}`);
      if (!res.ok) throw new Error('Failed to fetch product metrics');
      return res.json();
    }
  });

  const { data: userFinancials, isLoading: loadingUsers } = useQuery<UserFinancialData[]>({
    queryKey: ['/api/admin/financial/users'],
    queryFn: async () => {
      const res = await fetch('/api/admin/financial/users');
      if (!res.ok) throw new Error('Failed to fetch user financials');
      return res.json();
    }
  });

  const isLoading = loadingOverview || loadingMetrics;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900" data-testid="text-financial-reports-title">
              Financial Reports
            </h1>
            <p className="text-gray-500">
              Comprehensive view of platform earnings, liabilities, and product performance
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-40" data-testid="select-date-range">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="90d">Last 90 Days</SelectItem>
                <SelectItem value="ytd">Year to Date</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => refetchOverview()} data-testid="button-refresh-reports">
              <RefreshCcw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button data-testid="button-export-reports">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 w-full max-w-4xl">
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="revenue" data-testid="tab-revenue">Revenue</TabsTrigger>
            <TabsTrigger value="finapay" data-testid="tab-finapay">FinaPay</TabsTrigger>
            <TabsTrigger value="finavault" data-testid="tab-finavault">FinaVault</TabsTrigger>
            <TabsTrigger value="bnsl" data-testid="tab-bnsl">BNSL</TabsTrigger>
            <TabsTrigger value="liabilities" data-testid="tab-liabilities">Liabilities</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <OverviewSection overview={overview} isLoading={isLoading} metrics={metrics} />
          </TabsContent>

          <TabsContent value="revenue" className="space-y-6">
            <RevenueSection overview={overview} metrics={metrics} isLoading={isLoading} />
          </TabsContent>

          <TabsContent value="finapay" className="space-y-6">
            <FinaPaySection metrics={metrics?.finapay} isLoading={loadingMetrics} userFinancials={userFinancials} />
          </TabsContent>

          <TabsContent value="finavault" className="space-y-6">
            <FinaVaultSection metrics={metrics?.finavault} isLoading={loadingMetrics} userFinancials={userFinancials} />
          </TabsContent>

          <TabsContent value="bnsl" className="space-y-6">
            <BNSLSection metrics={metrics?.bnsl} isLoading={loadingMetrics} />
          </TabsContent>

          <TabsContent value="liabilities" className="space-y-6">
            <LiabilitiesSection overview={overview} metrics={metrics} isLoading={isLoading} />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

function OverviewSection({ overview, isLoading, metrics }: { overview?: FinancialOverview; isLoading: boolean; metrics?: ProductMetrics }) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(overview?.totalRevenue || 0)}
          icon={<DollarSign className="w-5 h-5 text-green-600" />}
          bg="bg-green-50"
          trend="up"
          change="+12.5%"
          loading={isLoading}
        />
        <MetricCard
          title="Assets Under Management"
          value={formatCurrency(overview?.totalAUM || 0)}
          icon={<PiggyBank className="w-5 h-5 text-blue-600" />}
          bg="bg-blue-50"
          loading={isLoading}
        />
        <MetricCard
          title="Total Liabilities"
          value={formatCurrency(overview?.totalLiabilities || 0)}
          icon={<AlertTriangle className="w-5 h-5 text-orange-600" />}
          bg="bg-orange-50"
          loading={isLoading}
        />
        <MetricCard
          title="Net Position"
          value={formatCurrency((overview?.totalAUM || 0) - (overview?.totalLiabilities || 0))}
          icon={<TrendingUp className="w-5 h-5 text-purple-600" />}
          bg="bg-purple-50"
          trend="up"
          loading={isLoading}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Gold Holdings Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-amber-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Total Gold Stored</p>
                <p className="text-2xl font-bold text-amber-700">
                  {isLoading ? '...' : formatGrams(overview?.goldHoldingsGrams || 0)}
                </p>
              </div>
              <Vault className="w-10 h-10 text-amber-500" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-gray-500">Gold Value (USD)</p>
                <p className="text-xl font-semibold">{formatCurrency(overview?.goldValueUsd || 0)}</p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-gray-500">Fiat Balances</p>
                <p className="text-xl font-semibold">{formatCurrency(overview?.fiatBalancesUsd || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              Product Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ProductPerformanceRow
              name="FinaPay"
              volume={formatCurrency(metrics?.finapay?.volumeUsd || 0)}
              fees={formatCurrency(metrics?.finapay?.feesCollectedUsd || 0)}
              color="blue"
            />
            <ProductPerformanceRow
              name="FinaVault"
              volume={formatGrams(metrics?.finavault?.goldStoredGrams || 0)}
              fees={formatCurrency(metrics?.finavault?.storageFeesUsd || 0)}
              color="amber"
            />
            <ProductPerformanceRow
              name="BNSL"
              volume={formatCurrency(metrics?.bnsl?.totalPrincipalUsd || 0)}
              fees={formatCurrency(metrics?.bnsl?.interestEarnedUsd || 0)}
              color="purple"
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function RevenueSection({ overview, metrics, isLoading }: { overview?: FinancialOverview; metrics?: ProductMetrics; isLoading: boolean }) {
  const revenueBreakdown = [
    { 
      source: 'FinaPay Transaction Fees', 
      amount: metrics?.finapay?.feesCollectedUsd || 0,
      percentage: 35,
      icon: <Wallet className="w-4 h-4" />,
      color: 'bg-blue-500'
    },
    { 
      source: 'FinaVault Storage Fees', 
      amount: metrics?.finavault?.storageFeesUsd || 0,
      percentage: 25,
      icon: <Vault className="w-4 h-4" />,
      color: 'bg-amber-500'
    },
    { 
      source: 'BNSL Interest Income', 
      amount: metrics?.bnsl?.interestEarnedUsd || 0,
      percentage: 30,
      icon: <Clock className="w-4 h-4" />,
      color: 'bg-purple-500'
    },
    { 
      source: 'Buy/Sell Spread', 
      amount: (overview?.totalRevenue || 0) * 0.1,
      percentage: 10,
      icon: <TrendingUp className="w-4 h-4" />,
      color: 'bg-green-500'
    },
  ];

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(overview?.totalRevenue || 0)}
          icon={<DollarSign className="w-5 h-5 text-green-600" />}
          bg="bg-green-50"
          trend="up"
          change="+12.5%"
          loading={isLoading}
        />
        <MetricCard
          title="Total Expenses"
          value={formatCurrency(overview?.totalExpenses || 0)}
          icon={<TrendingDown className="w-5 h-5 text-red-600" />}
          bg="bg-red-50"
          loading={isLoading}
        />
        <MetricCard
          title="Net Profit"
          value={formatCurrency(overview?.netProfit || 0)}
          icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
          bg="bg-emerald-50"
          trend="up"
          loading={isLoading}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue Breakdown by Source</CardTitle>
          <CardDescription>Where Finatrades earns money</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {revenueBreakdown.map((item, idx) => (
              <div key={idx} className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${item.color.replace('bg-', 'bg-').replace('-500', '-100')}`}>
                  {item.icon}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium">{item.source}</span>
                    <span className="font-semibold">{formatCurrency(item.amount)}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${item.color}`} 
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function FinaPaySection({ metrics, isLoading, userFinancials }: { metrics?: ProductMetrics['finapay']; isLoading: boolean; userFinancials?: UserFinancialData[] }) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard
          title="Active Wallets"
          value={metrics?.activeWallets?.toString() || '0'}
          icon={<Wallet className="w-5 h-5 text-blue-600" />}
          bg="bg-blue-50"
          loading={isLoading}
        />
        <MetricCard
          title="Transaction Count"
          value={metrics?.transactionCount?.toLocaleString() || '0'}
          icon={<CreditCard className="w-5 h-5 text-purple-600" />}
          bg="bg-purple-50"
          loading={isLoading}
        />
        <MetricCard
          title="Total Volume"
          value={formatCurrency(metrics?.volumeUsd || 0)}
          icon={<TrendingUp className="w-5 h-5 text-green-600" />}
          bg="bg-green-50"
          loading={isLoading}
        />
        <MetricCard
          title="Fees Collected"
          value={formatCurrency(metrics?.feesCollectedUsd || 0)}
          icon={<DollarSign className="w-5 h-5 text-amber-600" />}
          bg="bg-amber-50"
          loading={isLoading}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Wallet Holders</CardTitle>
          <CardDescription>Users with highest wallet balances</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
            <table className="w-full">
              <thead className="text-xs text-gray-600 uppercase bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                <tr>
                  <th className="text-left py-4 px-4 font-semibold tracking-wide">User</th>
                  <th className="text-left py-4 px-4 font-semibold tracking-wide">Account Type</th>
                  <th className="text-right py-4 px-4 font-semibold tracking-wide">Wallet Balance</th>
                  <th className="text-right py-4 px-4 font-semibold tracking-wide">Transactions</th>
                  <th className="text-left py-4 px-4 font-semibold tracking-wide">Last Activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {userFinancials?.slice(0, 10).map((user, index) => (
                  <tr key={user.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-orange-50/50 transition-colors duration-150`} data-testid={`row-user-${user.id}`}>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={user.accountType === 'business' ? 'default' : 'secondary'}>
                        {user.accountType}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold">
                      {formatCurrency(user.walletBalanceUsd)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {user.totalTransactions}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500">
                      {user.lastActivity ? format(new Date(user.lastActivity), 'MMM d, yyyy') : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function FinaVaultSection({ metrics, isLoading, userFinancials }: { metrics?: ProductMetrics['finavault']; isLoading: boolean; userFinancials?: UserFinancialData[] }) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard
          title="Total Holdings"
          value={metrics?.totalHoldings?.toString() || '0'}
          icon={<Building2 className="w-5 h-5 text-amber-600" />}
          bg="bg-amber-50"
          loading={isLoading}
        />
        <MetricCard
          title="Gold Stored"
          value={formatGrams(metrics?.goldStoredGrams || 0)}
          icon={<Vault className="w-5 h-5 text-yellow-600" />}
          bg="bg-yellow-50"
          loading={isLoading}
        />
        <MetricCard
          title="Storage Fees"
          value={formatCurrency(metrics?.storageFeesUsd || 0)}
          icon={<DollarSign className="w-5 h-5 text-green-600" />}
          bg="bg-green-50"
          loading={isLoading}
        />
        <MetricCard
          title="Active Users"
          value={metrics?.activeUsers?.toString() || '0'}
          icon={<Users className="w-5 h-5 text-blue-600" />}
          bg="bg-blue-50"
          loading={isLoading}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vault Holdings by User</CardTitle>
          <CardDescription>Gold stored per user in the vault</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
            <table className="w-full">
              <thead className="text-xs text-gray-600 uppercase bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                <tr>
                  <th className="text-left py-4 px-4 font-semibold tracking-wide">User</th>
                  <th className="text-left py-4 px-4 font-semibold tracking-wide">Account Type</th>
                  <th className="text-right py-4 px-4 font-semibold tracking-wide">Gold Holdings</th>
                  <th className="text-right py-4 px-4 font-semibold tracking-wide">Est. Value</th>
                  <th className="text-right py-4 px-4 font-semibold tracking-wide">Storage Fee (Annual)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {userFinancials?.filter(u => u.goldHoldingsGrams > 0).slice(0, 10).map((user, index) => (
                  <tr key={user.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-orange-50/50 transition-colors duration-150`}>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={user.accountType === 'business' ? 'default' : 'secondary'}>
                        {user.accountType}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-amber-600">
                      {formatGrams(user.goldHoldingsGrams)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {formatCurrency(user.goldHoldingsGrams * 93.5)}
                    </td>
                    <td className="py-3 px-4 text-right text-green-600">
                      {formatCurrency(user.goldHoldingsGrams * 93.5 * 0.005)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function BNSLSection({ metrics, isLoading }: { metrics?: ProductMetrics['bnsl']; isLoading: boolean }) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <MetricCard
          title="Active Plans"
          value={metrics?.activePlans?.toString() || '0'}
          icon={<FileText className="w-5 h-5 text-purple-600" />}
          bg="bg-purple-50"
          loading={isLoading}
        />
        <MetricCard
          title="Total Principal"
          value={formatCurrency(metrics?.totalPrincipalUsd || 0)}
          icon={<DollarSign className="w-5 h-5 text-blue-600" />}
          bg="bg-blue-50"
          loading={isLoading}
        />
        <MetricCard
          title="Interest Earned"
          value={formatCurrency(metrics?.interestEarnedUsd || 0)}
          icon={<TrendingUp className="w-5 h-5 text-green-600" />}
          bg="bg-green-50"
          loading={isLoading}
        />
        <MetricCard
          title="Expected Payouts"
          value={formatCurrency(metrics?.expectedPayoutsUsd || 0)}
          icon={<Clock className="w-5 h-5 text-orange-600" />}
          bg="bg-orange-50"
          loading={isLoading}
        />
        <MetricCard
          title="Delinquent Plans"
          value={metrics?.delinquentPlans?.toString() || '0'}
          icon={<AlertTriangle className="w-5 h-5 text-red-600" />}
          bg="bg-red-50"
          loading={isLoading}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Plan Status Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <StatusBar label="Active" count={metrics?.activePlans || 0} total={100} color="bg-green-500" />
            <StatusBar label="Maturing" count={15} total={100} color="bg-blue-500" />
            <StatusBar label="Completed" count={45} total={100} color="bg-gray-400" />
            <StatusBar label="Defaulted" count={metrics?.delinquentPlans || 0} total={100} color="bg-red-500" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Payouts</CardTitle>
            <CardDescription>Next 30 days payout schedule</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <PayoutRow date="Dec 15, 2025" amount={5200} plans={3} />
            <PayoutRow date="Dec 20, 2025" amount={8750} plans={5} />
            <PayoutRow date="Dec 25, 2025" amount={3400} plans={2} />
            <PayoutRow date="Jan 1, 2026" amount={12000} plans={7} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function LiabilitiesSection({ overview, metrics, isLoading }: { overview?: FinancialOverview; metrics?: ProductMetrics; isLoading: boolean }) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard
          title="Total Liabilities"
          value={formatCurrency(overview?.totalLiabilities || 0)}
          icon={<AlertTriangle className="w-5 h-5 text-red-600" />}
          bg="bg-red-50"
          loading={isLoading}
        />
        <MetricCard
          title="Gold Owed to Users"
          value={formatGrams(overview?.goldLiabilityGrams || 0)}
          icon={<Vault className="w-5 h-5 text-amber-600" />}
          bg="bg-amber-50"
          loading={isLoading}
        />
        <MetricCard
          title="Pending Withdrawals"
          value={formatCurrency(overview?.pendingPayoutsUsd || 0)}
          icon={<Clock className="w-5 h-5 text-orange-600" />}
          bg="bg-orange-50"
          loading={isLoading}
        />
        <MetricCard
          title="BNSL Obligations"
          value={formatCurrency(metrics?.bnsl?.expectedPayoutsUsd || 0)}
          icon={<FileText className="w-5 h-5 text-purple-600" />}
          bg="bg-purple-50"
          loading={isLoading}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liability Breakdown</CardTitle>
          <CardDescription>What Finatrades owes to users and partners</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Vault className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Gold Liability</h4>
                    <p className="text-sm text-gray-500">Gold held on behalf of users</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-amber-600">{formatGrams(overview?.goldLiabilityGrams || 0)}</p>
                  <p className="text-sm text-gray-500">{formatCurrency((overview?.goldLiabilityGrams || 0) * 93.5)}</p>
                </div>
              </div>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Wallet className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Fiat Balances Owed</h4>
                    <p className="text-sm text-gray-500">User wallet balances (USD/EUR)</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-blue-600">{formatCurrency(overview?.fiatBalancesUsd || 0)}</p>
                </div>
              </div>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Clock className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold">BNSL Future Payouts</h4>
                    <p className="text-sm text-gray-500">Scheduled payouts for active plans</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-purple-600">{formatCurrency(metrics?.bnsl?.expectedPayoutsUsd || 0)}</p>
                </div>
              </div>
            </div>

            <div className="p-4 border rounded-lg bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-200 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg">Total Liabilities</h4>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{formatCurrency(overview?.totalLiabilities || 0)}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function MetricCard({ title, value, icon, bg, trend, change, loading }: {
  title: string;
  value: string;
  icon: React.ReactNode;
  bg: string;
  trend?: 'up' | 'down';
  change?: string;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-xl ${bg}`}>
            {icon}
          </div>
          {loading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
        </div>
        <div>
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <div className="flex items-end gap-2">
            <h3 className="text-2xl font-bold text-gray-900" data-testid={`text-metric-${title.toLowerCase().replace(/\s+/g, '-')}`}>
              {loading ? '...' : value}
            </h3>
            {change && (
              <span className={`text-sm font-medium flex items-center ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {change}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ProductPerformanceRow({ name, volume, fees, color }: { name: string; volume: string; fees: string; color: string }) {
  const bgColors: Record<string, string> = {
    blue: 'bg-blue-100',
    amber: 'bg-amber-100',
    purple: 'bg-purple-100'
  };
  const textColors: Record<string, string> = {
    blue: 'text-blue-600',
    amber: 'text-amber-600',
    purple: 'text-purple-600'
  };

  return (
    <div className={`p-4 rounded-lg ${bgColors[color]}`}>
      <div className="flex items-center justify-between">
        <span className={`font-semibold ${textColors[color]}`}>{name}</span>
        <div className="text-right">
          <p className="font-bold">{volume}</p>
          <p className="text-sm text-gray-600">Fees: {fees}</p>
        </div>
      </div>
    </div>
  );
}

function StatusBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const percentage = (count / total) * 100;
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm text-gray-500">{count}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

function PayoutRow({ date, amount, plans }: { date: string; amount: number; plans: number }) {
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-purple-100 rounded-lg">
          <Calendar className="w-4 h-4 text-purple-600" />
        </div>
        <div>
          <p className="font-medium">{date}</p>
          <p className="text-sm text-gray-500">{plans} plans</p>
        </div>
      </div>
      <p className="font-bold text-purple-600">{formatCurrency(amount)}</p>
    </div>
  );
}
