import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { Database, TrendingUp, Coins, Wallet, ArrowUpRight, ArrowDownRight, Shield, Clock, ChevronRight, Sparkles, Briefcase, Search, Download, Plus, CreditCard, Send, ArrowRightLeft, RotateCcw, BarChart3 } from 'lucide-react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useUnifiedTransactions } from '@/hooks/useUnifiedTransactions';
import { normalizeStatus, getTransactionLabel } from '@/lib/transactionUtils';
import { Card } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import OnboardingTour, { useOnboarding } from '@/components/OnboardingTour';
import { useState } from 'react';

interface UserPreferences {
  showBalance: boolean;
  twoFactorReminder: boolean;
  compactMode: boolean;
  displayCurrency: string;
}

function formatNumber(num: number | null | undefined, decimals = 2): string {
  if (num === null || num === undefined || isNaN(num)) {
    return '0.00';
  }
  return num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function StatCard({ title, value, change, positive, icon: Icon }: { 
  title: string; 
  value: string; 
  change?: string;
  positive?: boolean;
  icon: any;
}) {
  return (
    <div className="bg-[#1a1a2e] rounded-xl p-5 border border-[#2a2a4a]">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-400">{title}</p>
        <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
          <Icon className="w-4 h-4 text-purple-400" />
        </div>
      </div>
      <p className="text-2xl font-bold text-white mb-1">{value}</p>
      {change && (
        <div className={`flex items-center gap-1 text-sm ${positive ? 'text-green-400' : 'text-red-400'}`}>
          {positive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
          <span>{change}</span>
        </div>
      )}
    </div>
  );
}

function TransactionRow({ id, user, amount, date, status }: {
  id: string;
  user: string;
  amount: string;
  date: string;
  status: string;
}) {
  const statusColors: Record<string, string> = {
    completed: 'bg-green-500/20 text-green-400',
    pending: 'bg-yellow-500/20 text-yellow-400',
    failed: 'bg-red-500/20 text-red-400',
    processing: 'bg-blue-500/20 text-blue-400',
  };

  return (
    <tr className="border-b border-[#2a2a4a] hover:bg-[#1f1f3a] transition-colors">
      <td className="py-4 px-4">
        <input type="checkbox" className="rounded border-gray-600 bg-transparent" />
      </td>
      <td className="py-4 px-4">
        <span className="text-gray-300 font-mono text-sm">{id}</span>
      </td>
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-purple-500/30 flex items-center justify-center">
            <span className="text-purple-300 text-xs font-semibold">{user.charAt(0)}</span>
          </div>
          <span className="text-white">{user}</span>
        </div>
      </td>
      <td className="py-4 px-4 text-gray-300">{amount}</td>
      <td className="py-4 px-4 text-gray-400">{date}</td>
      <td className="py-4 px-4">
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[status.toLowerCase()] || 'bg-gray-500/20 text-gray-400'}`}>
          {status}
        </span>
      </td>
    </tr>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { totals, goldPrice, goldPriceSource, isLoading, finaBridge, certificates } = useDashboardData();
  const { transactions: unifiedTx } = useUnifiedTransactions({ limit: 10 });
  const { showOnboarding, completeOnboarding } = useOnboarding();
  const [chartPeriod, setChartPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [chartType, setChartType] = useState<'income' | 'expense' | 'saving'>('income');
  
  const transactions = unifiedTx.map(tx => ({
    id: tx.id,
    type: getTransactionLabel(tx.actionType),
    status: normalizeStatus(tx.status),
    amountGold: tx.grams,
    amountUsd: tx.usd,
    description: tx.description,
    createdAt: tx.createdAt,
    sourceModule: tx.module,
  }));

  const { data: prefsData } = useQuery<{ preferences: UserPreferences }>({
    queryKey: ['preferences', user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/users/${user?.id}/preferences`);
      if (!res.ok) throw new Error('Failed to fetch preferences');
      return res.json();
    },
    enabled: !!user?.id,
    staleTime: 300000,
  });

  const prefs = prefsData?.preferences;
  const showBalance = prefs?.showBalance !== false;

  const hiddenValue = '••••••';

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
  const totalGoldGrams = (totals.walletGoldGrams || 0) + (totals.vaultGoldGrams || 0);
  const totalPortfolioValue = totals.totalPortfolioUsd || 0;

  const chartData = [4, 6, 5, 8, 7, 9, 6, 10, 8, 12, 9, 15];
  const maxValue = Math.max(...chartData);

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[#0f0f1a]">
        <div className="flex">
          {/* Main Content */}
          <div className="flex-1 p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-white">Dashboard</h1>
              <div className="flex items-center gap-3">
                <Button variant="outline" className="bg-transparent border-[#2a2a4a] text-gray-300 hover:bg-[#1a1a2e] hover:text-white">
                  <Wallet className="w-4 h-4 mr-2" />
                  Manage Balance
                </Button>
                <Button variant="outline" className="bg-transparent border-[#2a2a4a] text-gray-300 hover:bg-[#1a1a2e] hover:text-white">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <Link href="/finapay">
                  <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Funds
                  </Button>
                </Link>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <StatCard 
                title="Gold Storage" 
                value={showBalance ? `${formatNumber(totalGoldGrams, 4)}g` : hiddenValue}
                change="+8%"
                positive={true}
                icon={Database}
              />
              <StatCard 
                title="Portfolio Value" 
                value={showBalance ? `$${formatNumber(totalPortfolioValue)}` : hiddenValue}
                change="+8%"
                positive={true}
                icon={TrendingUp}
              />
              <StatCard 
                title="BNSL Profit" 
                value={showBalance ? `$${formatNumber(totals.bnslTotalProfit || 0)}` : hiddenValue}
                change="+12%"
                positive={true}
                icon={ArrowUpRight}
              />
            </div>

            {/* Cash Flow Section */}
            <div className="bg-[#1a1a2e] rounded-xl p-6 border border-[#2a2a4a] mb-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-gray-400 text-sm mb-1">Portfolio History</h3>
                  <p className="text-3xl font-bold text-white">
                    {showBalance ? `$${formatNumber(totalPortfolioValue)}` : hiddenValue}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex bg-[#0f0f1a] rounded-lg p-1">
                    {['income', 'expense', 'saving'].map((type) => (
                      <button
                        key={type}
                        onClick={() => setChartType(type as any)}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          chartType === type 
                            ? 'bg-[#2a2a4a] text-white' 
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </button>
                    ))}
                  </div>
                  <select 
                    value={chartPeriod}
                    onChange={(e) => setChartPeriod(e.target.value as any)}
                    className="bg-[#0f0f1a] border border-[#2a2a4a] text-gray-300 rounded-lg px-4 py-2 text-sm"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                  <button className="p-2 rounded-lg bg-[#0f0f1a] border border-[#2a2a4a] text-gray-400 hover:text-white">
                    <BarChart3 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Bar Chart */}
              <div className="relative h-48">
                <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-gray-500 pr-4">
                  <span>$15</span>
                  <span>$10</span>
                  <span>$5</span>
                  <span>$0</span>
                </div>
                <div className="ml-10 h-full flex items-end gap-2">
                  {chartData.map((value, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div 
                        className={`w-full rounded-t-md transition-all ${
                          index === chartData.length - 3 
                            ? 'bg-gradient-to-t from-purple-600 to-purple-400' 
                            : 'bg-[#2a2a4a] hover:bg-[#3a3a5a]'
                        }`}
                        style={{ height: `${(value / maxValue) * 100}%` }}
                      />
                      {index === chartData.length - 3 && (
                        <div className="absolute -top-8 bg-purple-500 text-white text-xs px-2 py-1 rounded">
                          ${formatNumber(totalPortfolioValue / 1000, 3)}k
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-[#1a1a2e] rounded-xl border border-[#2a2a4a] overflow-hidden">
              <div className="p-4 flex items-center justify-between border-b border-[#2a2a4a]">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input 
                    placeholder="Search Anything..." 
                    className="pl-10 bg-[#0f0f1a] border-[#2a2a4a] text-gray-300 placeholder:text-gray-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="bg-transparent border-[#2a2a4a] text-gray-300">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#0f0f1a]">
                    <tr className="text-left text-gray-400 text-sm">
                      <th className="py-3 px-4 font-medium">
                        <input type="checkbox" className="rounded border-gray-600 bg-transparent" />
                      </th>
                      <th className="py-3 px-4 font-medium">Transaction ID</th>
                      <th className="py-3 px-4 font-medium">Type</th>
                      <th className="py-3 px-4 font-medium">Amount</th>
                      <th className="py-3 px-4 font-medium">Date</th>
                      <th className="py-3 px-4 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.length > 0 ? (
                      transactions.slice(0, 5).map((tx) => (
                        <TransactionRow
                          key={tx.id}
                          id={`TXN-${tx.id.slice(0, 8).toUpperCase()}`}
                          user={tx.type}
                          amount={tx.amountGold ? `${formatNumber(Number(tx.amountGold), 4)}g` : `$${formatNumber(Number(tx.amountUsd) || 0)}`}
                          date={new Date(tx.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          status={tx.status}
                        />
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-gray-500">
                          No transactions yet. Start by adding funds to your wallet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="p-4 border-t border-[#2a2a4a]">
                <Link href="/transactions">
                  <Button variant="ghost" className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10">
                    View All Transactions <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="w-80 p-6 border-l border-[#2a2a4a] hidden xl:block">
            {/* Search */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input 
                placeholder="Search Anything..." 
                className="pl-10 bg-[#1a1a2e] border-[#2a2a4a] text-gray-300 placeholder:text-gray-500"
              />
            </div>

            {/* Wallet Card */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <button className="flex-1 py-2 px-4 bg-purple-600 text-white rounded-lg text-sm font-medium">
                  Gold
                </button>
                <button className="flex-1 py-2 px-4 bg-[#1a1a2e] text-gray-400 rounded-lg text-sm font-medium border border-[#2a2a4a]">
                  USD
                </button>
                <button className="py-2 px-4 bg-purple-600 text-white rounded-lg text-sm font-medium">
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Card Display */}
              <div className="bg-gradient-to-br from-[#1a1a2e] to-[#2a2a4a] rounded-2xl p-5 border border-[#3a3a5a] relative overflow-hidden">
                <div className="absolute top-4 right-4">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-purple-400/50" />
                    <div className="w-3 h-3 rounded-full bg-purple-600/50 -ml-1" />
                  </div>
                </div>
                <div className="mb-8">
                  <p className="text-gray-400 text-xs mb-1">Total Gold Balance</p>
                  <p className="text-white text-2xl font-bold">
                    {showBalance ? `${formatNumber(totalGoldGrams, 4)}g` : hiddenValue}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-xs">Account Holder</p>
                    <p className="text-white font-medium">{fullName}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="text-purple-400 text-xl font-bold">FINA</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mb-6">
              <h3 className="text-white font-semibold mb-4">Quick Action</h3>
              <div className="flex flex-wrap gap-2">
                <Link href="/finapay">
                  <Button size="sm" variant="outline" className="bg-[#1a1a2e] border-[#2a2a4a] text-gray-300 hover:bg-[#2a2a4a]">
                    <Plus className="w-4 h-4 mr-1" />
                    Top up
                  </Button>
                </Link>
                <Link href="/finapay">
                  <Button size="sm" variant="outline" className="bg-[#1a1a2e] border-[#2a2a4a] text-gray-300 hover:bg-[#2a2a4a]">
                    <ArrowRightLeft className="w-4 h-4 mr-1" />
                    Transfers
                  </Button>
                </Link>
                <Link href="/finapay">
                  <Button size="sm" variant="outline" className="bg-[#1a1a2e] border-[#2a2a4a] text-gray-300 hover:bg-[#2a2a4a]">
                    <Send className="w-4 h-4 mr-1" />
                    Request
                  </Button>
                </Link>
                <Button size="sm" variant="outline" className="bg-[#1a1a2e] border-[#2a2a4a] text-gray-300 hover:bg-[#2a2a4a]">
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Daily Limit */}
            <div className="mb-6 bg-[#1a1a2e] rounded-xl p-4 border border-[#2a2a4a]">
              <h3 className="text-white font-semibold mb-2">Daily Limit</h3>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-2xl font-bold text-white">
                  ${formatNumber((totals.mpgwAvailableGrams || 0) * goldPrice * 0.1)}
                </span>
                <span className="text-gray-400 text-sm">used from $2,000 limit</span>
              </div>
              <div className="w-full h-2 bg-[#0f0f1a] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full" style={{ width: '30%' }} />
              </div>
            </div>

            {/* Portfolio Breakdown */}
            <div className="mb-6 bg-[#1a1a2e] rounded-xl p-4 border border-[#2a2a4a]">
              <h3 className="text-white font-semibold mb-4">Portfolio Breakdown</h3>
              <div className="flex gap-2 mb-4">
                <div className="flex-1 h-2 bg-purple-500 rounded-full" />
                <div className="flex-1 h-2 bg-purple-400 rounded-full" />
                <div className="flex-1 h-2 bg-purple-300 rounded-full" />
                <div className="flex-1 h-2 bg-gray-500 rounded-full" />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500" />
                  <span className="text-gray-400">LGPW (45%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-400" />
                  <span className="text-gray-400">FGPW (25%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-300" />
                  <span className="text-gray-400">BNSL (20%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-gray-500" />
                  <span className="text-gray-400">Vault (10%)</span>
                </div>
              </div>
            </div>

            {/* Recent Certificates */}
            <div className="bg-[#1a1a2e] rounded-xl p-4 border border-[#2a2a4a]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold">Certificates</h3>
                <Link href="/finavault">
                  <Button size="sm" variant="ghost" className="text-purple-400 hover:text-purple-300 p-0 h-auto">
                    <Plus className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
              
              {(certificates?.recent?.length ?? 0) > 0 ? (
                <div className="space-y-3">
                  {certificates?.recent?.slice(0, 2).map((cert: any) => (
                    <div key={cert.id} className="flex items-center justify-between p-3 bg-[#0f0f1a] rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                          <Shield className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">{cert.type || 'Gold Certificate'}</p>
                          <p className="text-gray-400 text-xs">{new Date(cert.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-500" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm text-center py-4">No certificates yet</p>
              )}
              
              <Link href="/finavault">
                <Button variant="ghost" className="w-full mt-3 text-gray-400 hover:text-white border border-[#2a2a4a] hover:bg-[#2a2a4a]">
                  View All
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {showOnboarding && (
        <OnboardingTour onComplete={completeOnboarding} />
      )}
    </DashboardLayout>
  );
}
