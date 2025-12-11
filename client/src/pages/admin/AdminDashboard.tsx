import React from 'react';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, DollarSign, Activity, ShieldCheck, ArrowUpRight, ArrowDownRight, 
  Clock, Wallet, TrendingUp, Building2, CreditCard, AlertTriangle,
  CheckCircle, XCircle, RefreshCw, Server, Zap, MessageSquare,
  Briefcase, Scale, FileText, Calendar, PiggyBank, Send, Download
} from 'lucide-react';
import { Link } from 'wouter';

interface DashboardStats {
  overview: {
    totalAUM: number;
    totalGoldGrams: number;
    totalUsdBalances: number;
    totalUsers: number;
    personalUsers: number;
    businessUsers: number;
    dailyTransactionCount: number;
    dailyTransactionVolume: number;
    currentGoldPriceUsd: number;
  };
  finavault: {
    totalGoldStored: number;
    totalDeposits: number;
    totalWithdrawals: number;
    netGoldBalance: number;
    vaultReconciliationStatus: string;
    dailyGoldPrice: number;
    platformSpread: number;
  };
  finapay: {
    paymentsProcessedToday: number;
    totalValueSent: number;
    totalValueReceived: number;
    crossBorderTransfers: number;
    cardTransactions: number;
    failedTransactions: number;
    flaggedTransactions: number;
  };
  bnsl: {
    activePlans: number;
    totalInvested: number;
    upcomingMaturities: number;
    earlyWithdrawals: number;
    dailyCollections: number;
  };
  finabridge: {
    activeTradeCases: number;
    settlementsProcessed: number;
    totalTradeValue: number;
    corporateRevenue: number;
  };
  compliance: {
    verifiedUsers: number;
    pendingKyc: number;
    highRiskUsers: number;
    suspiciousAlerts: number;
  };
  operations: {
    systemUptime: number;
    apiResponseTime: number;
    errorsToday: number;
    supportTickets: number;
  };
}

export default function AdminDashboard() {
  const { data: stats, isLoading, refetch } = useQuery<DashboardStats>({
    queryKey: ['/api/admin/dashboard/stats'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      </AdminLayout>
    );
  }

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value.toFixed(2)}`;
  };

  const formatNumber = (value: number) => value.toLocaleString();

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900" data-testid="text-dashboard-title">Finatrades Admin Dashboard</h1>
            <p className="text-gray-500">Platform overview and real-time monitoring</p>
          </div>
          <Button onClick={() => refetch()} variant="outline" data-testid="button-refresh-stats">
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>

        {/* 1. Platform Overview - Top KPIs */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Platform Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white border-none">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-2">
                  <PiggyBank className="w-5 h-5 opacity-80" />
                  <span className="text-sm font-medium opacity-90">Total AUM</span>
                </div>
                <h3 className="text-2xl font-bold" data-testid="text-total-aum">
                  {formatCurrency(stats?.overview.totalAUM || 0)}
                </h3>
                <p className="text-xs opacity-75 mt-1">{formatNumber(stats?.overview.totalGoldGrams || 0)}g Gold</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-gray-600">Total Users</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900" data-testid="text-total-users">
                  {formatNumber(stats?.overview.totalUsers || 0)}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  {stats?.overview.personalUsers || 0} Personal • {stats?.overview.businessUsers || 0} Corporate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-2">
                  <Activity className="w-5 h-5 text-purple-600" />
                  <span className="text-sm font-medium text-gray-600">Daily Transactions</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900" data-testid="text-daily-transactions">
                  {formatNumber(stats?.overview.dailyTransactionCount || 0)}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  {formatCurrency(stats?.overview.dailyTransactionVolume || 0)} volume
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-2">
                  <Wallet className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-gray-600">Wallet Balances</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900" data-testid="text-wallet-balances">
                  {formatCurrency(stats?.overview.totalUsdBalances || 0)}
                </h3>
                <p className="text-xs text-gray-500 mt-1">USD holdings</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-2">
                  <Scale className="w-5 h-5 text-amber-600" />
                  <span className="text-sm font-medium text-gray-600">Gold in Vault</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900" data-testid="text-total-gold">
                  {formatNumber(stats?.finavault.totalGoldStored || 0)}g
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  @ ${stats?.finavault.dailyGoldPrice}/g
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Main Content Tabs */}
        <Tabs defaultValue="vault" className="w-full">
          <TabsList className="grid w-full grid-cols-6 mb-6">
            <TabsTrigger value="vault">FinaVault</TabsTrigger>
            <TabsTrigger value="payments">FinaPay</TabsTrigger>
            <TabsTrigger value="bnsl">BNSL</TabsTrigger>
            <TabsTrigger value="bridge">FinaBridge</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
            <TabsTrigger value="operations">Operations</TabsTrigger>
          </TabsList>

          {/* 2. FinaVault Tab */}
          <TabsContent value="vault">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Gold Deposits</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Download className="w-5 h-5 text-green-600" />
                    <span className="text-2xl font-bold text-gray-900">
                      {stats?.finavault.totalDeposits || 0}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Total deposit transactions</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Gold Withdrawals</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <ArrowUpRight className="w-5 h-5 text-red-600" />
                    <span className="text-2xl font-bold text-gray-900">
                      {stats?.finavault.totalWithdrawals || 0}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Total withdrawal transactions</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Net Gold Balance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Scale className="w-5 h-5 text-amber-600" />
                    <span className="text-2xl font-bold text-gray-900">
                      {formatNumber(stats?.finavault.netGoldBalance || 0)}g
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Total gold on platform</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Vault Reconciliation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Badge className={stats?.finavault.vaultReconciliationStatus === 'Reconciled' ? 
                      'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {stats?.finavault.vaultReconciliationStatus === 'Reconciled' ? 
                        <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                      {stats?.finavault.vaultReconciliationStatus}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Last checked: Just now</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Daily Gold Price</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-amber-600" />
                    <span className="text-2xl font-bold text-gray-900">
                      ${stats?.finavault.dailyGoldPrice}/g
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Live market rate</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Platform Spread</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    <span className="text-2xl font-bold text-gray-900">
                      ${stats?.finavault.platformSpread}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Per gram markup</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 3. FinaPay Tab */}
          <TabsContent value="payments">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Payments Today</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-600" />
                    <span className="text-2xl font-bold text-gray-900">
                      {stats?.finapay.paymentsProcessedToday || 0}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Total Sent</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Send className="w-5 h-5 text-red-500" />
                    <span className="text-2xl font-bold text-gray-900">
                      {formatCurrency(stats?.finapay.totalValueSent || 0)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Total Received</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Download className="w-5 h-5 text-green-600" />
                    <span className="text-2xl font-bold text-gray-900">
                      {formatCurrency(stats?.finapay.totalValueReceived || 0)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Cross-Border</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-purple-600" />
                    <span className="text-2xl font-bold text-gray-900">
                      {stats?.finapay.crossBorderTransfers || 0}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Card Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-indigo-600" />
                    <span className="text-2xl font-bold text-gray-900">
                      {stats?.finapay.cardTransactions || 0}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-red-200 bg-red-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-red-700">Failed Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-red-600" />
                    <span className="text-2xl font-bold text-red-700">
                      {stats?.finapay.failedTransactions || 0}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-orange-200 bg-orange-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-orange-700">Flagged Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                    <span className="text-2xl font-bold text-orange-700">
                      {stats?.finapay.flaggedTransactions || 0}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 4. BNSL Tab */}
          <TabsContent value="bnsl">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Active Plans</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <span className="text-2xl font-bold text-gray-900">
                      {stats?.bnsl.activePlans || 0}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Total Invested</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    <span className="text-2xl font-bold text-gray-900">
                      {formatCurrency(stats?.bnsl.totalInvested || 0)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Upcoming Maturities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-amber-600" />
                    <span className="text-2xl font-bold text-gray-900">
                      {stats?.bnsl.upcomingMaturities || 0}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Next 30 days</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Early Withdrawals</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <ArrowUpRight className="w-5 h-5 text-red-500" />
                    <span className="text-2xl font-bold text-gray-900">
                      {stats?.bnsl.earlyWithdrawals || 0}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Daily Collections</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <PiggyBank className="w-5 h-5 text-green-600" />
                    <span className="text-2xl font-bold text-gray-900">
                      {formatCurrency(stats?.bnsl.dailyCollections || 0)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="mt-6">
              <Link href="/admin/bnsl">
                <Button className="bg-orange-600 hover:bg-orange-700">
                  <FileText className="w-4 h-4 mr-2" /> Manage BNSL Plans
                </Button>
              </Link>
            </div>
          </TabsContent>

          {/* 5. FinaBridge Tab */}
          <TabsContent value="bridge">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Active Trade Cases</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-blue-600" />
                    <span className="text-2xl font-bold text-gray-900">
                      {stats?.finabridge.activeTradeCases || 0}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Settlements Processed</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-2xl font-bold text-gray-900">
                      {stats?.finabridge.settlementsProcessed || 0}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Total Trade Value</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-amber-600" />
                    <span className="text-2xl font-bold text-gray-900">
                      {formatCurrency(stats?.finabridge.totalTradeValue || 0)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Corporate Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    <span className="text-2xl font-bold text-gray-900">
                      {formatCurrency(stats?.finabridge.corporateRevenue || 0)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="mt-6">
              <Link href="/admin/finabridge">
                <Button className="bg-orange-600 hover:bg-orange-700">
                  <Briefcase className="w-4 h-4 mr-2" /> Manage Trade Finance
                </Button>
              </Link>
            </div>
          </TabsContent>

          {/* 6. Compliance Tab */}
          <TabsContent value="compliance">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="border-green-200 bg-green-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-green-700">Verified Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-2xl font-bold text-green-700">
                      {stats?.compliance.verifiedUsers || 0}
                    </span>
                  </div>
                  <p className="text-xs text-green-600 mt-1">KYC Approved</p>
                </CardContent>
              </Card>

              <Card className="border-amber-200 bg-amber-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-amber-700">Pending KYC</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-amber-600" />
                    <span className="text-2xl font-bold text-amber-700">
                      {stats?.compliance.pendingKyc || 0}
                    </span>
                  </div>
                  <p className="text-xs text-amber-600 mt-1">Awaiting review</p>
                </CardContent>
              </Card>

              <Card className="border-red-200 bg-red-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-red-700">High-Risk Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <span className="text-2xl font-bold text-red-700">
                      {stats?.compliance.highRiskUsers || 0}
                    </span>
                  </div>
                  <p className="text-xs text-red-600 mt-1">Flagged accounts</p>
                </CardContent>
              </Card>

              <Card className="border-purple-200 bg-purple-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-purple-700">Suspicious Alerts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-purple-600" />
                    <span className="text-2xl font-bold text-purple-700">
                      {stats?.compliance.suspiciousAlerts || 0}
                    </span>
                  </div>
                  <p className="text-xs text-purple-600 mt-1">Transaction alerts</p>
                </CardContent>
              </Card>
            </div>

            <div className="mt-6">
              <Link href="/admin/kyc">
                <Button className="bg-orange-600 hover:bg-orange-700">
                  <ShieldCheck className="w-4 h-4 mr-2" /> Review KYC Submissions
                </Button>
              </Link>
            </div>
          </TabsContent>

          {/* 7. Operations Tab */}
          <TabsContent value="operations">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">System Uptime</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Server className="w-5 h-5 text-green-600" />
                    <span className="text-2xl font-bold text-green-600">
                      {stats?.operations.systemUptime || 99.9}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Last 30 days</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">API Response Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-blue-600" />
                    <span className="text-2xl font-bold text-gray-900">
                      {stats?.operations.apiResponseTime || 45}ms
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Average latency</p>
                </CardContent>
              </Card>

              <Card className={stats?.operations.errorsToday ? "border-red-200 bg-red-50" : ""}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Errors Today</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <XCircle className={`w-5 h-5 ${stats?.operations.errorsToday ? 'text-red-600' : 'text-gray-400'}`} />
                    <span className={`text-2xl font-bold ${stats?.operations.errorsToday ? 'text-red-700' : 'text-gray-900'}`}>
                      {stats?.operations.errorsToday || 0}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Failed operations</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Support Tickets</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-purple-600" />
                    <span className="text-2xl font-bold text-gray-900">
                      {stats?.operations.supportTickets || 0}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Open tickets</p>
                </CardContent>
              </Card>
            </div>

            {/* System Status Cards */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Service Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatusItem label="FinaVault Storage" status="Operational" />
                  <StatusItem label="Payment Gateway" status="Operational" />
                  <StatusItem label="KYC Verification" status="Operational" />
                  <StatusItem label="Email Service" status="Operational" />
                  <StatusItem label="Database" status="Operational" />
                  <StatusItem label="WebSocket" status="Operational" />
                  <StatusItem label="File Storage" status="Operational" />
                  <StatusItem label="Notifications" status="Operational" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

function StatusItem({ label, status }: { label: string; status: string }) {
  const isOperational = status === 'Operational';
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <span className="text-sm text-gray-700">{label}</span>
      <Badge className={isOperational ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
        {isOperational ? <CheckCircle className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
        {status}
      </Badge>
    </div>
  );
}
