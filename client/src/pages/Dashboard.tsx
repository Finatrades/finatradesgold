import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { Database, TrendingUp, Wallet, ArrowUpRight, ArrowDownRight, ChevronRight, Clock, Plus, Send, ArrowRightLeft, Zap, Droplets, Wifi, CreditCard, DollarSign, ShoppingBag, PiggyBank } from 'lucide-react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useUnifiedTransactions } from '@/hooks/useUnifiedTransactions';
import { normalizeStatus, getTransactionLabel } from '@/lib/transactionUtils';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import OnboardingTour, { useOnboarding } from '@/components/OnboardingTour';
import { useQuery } from '@tanstack/react-query';

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

function QuickActionButton({ icon: Icon, label, href, testId }: { 
  icon: any; 
  label: string; 
  href: string;
  testId: string;
}) {
  return (
    <Link href={href}>
      <button data-testid={testId} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white border border-gray-100 hover:border-purple-200 hover:shadow-md transition-all group">
        <div className="w-12 h-12 rounded-xl bg-gray-50 group-hover:bg-purple-50 flex items-center justify-center transition-colors">
          <Icon className="w-5 h-5 text-gray-600 group-hover:text-purple-600" />
        </div>
        <span className="text-sm text-gray-700 font-medium">{label}</span>
      </button>
    </Link>
  );
}

function TransactionItem({ id, icon: Icon, name, date, amount, status, iconBg }: {
  id: string;
  icon: any;
  name: string;
  date: string;
  amount: string;
  status?: string;
  iconBg: string;
}) {
  return (
    <div data-testid={`transaction-${id}`} className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-800">{name}</p>
          <p className="text-xs text-gray-400">{date}</p>
        </div>
      </div>
      <div className="text-right">
        {status && (
          <Badge data-testid={`status-${id}`} className="mb-1 text-xs bg-yellow-100 text-yellow-700 border-0">
            {status}
          </Badge>
        )}
        <p data-testid={`amount-${id}`} className="text-sm font-semibold text-green-600">{amount}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { totals, goldPrice, goldPriceSource, isLoading, finaBridge, certificates } = useDashboardData();
  const { transactions: unifiedTx } = useUnifiedTransactions({ limit: 10 });
  const { showOnboarding, completeOnboarding } = useOnboarding();
    
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

  const formatCurrency = (usdAmount: number) => {
    return `$${formatNumber(usdAmount)}`;
  };

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
  const isBusinessUser = user.accountType === 'business' || !!user.finabridgeRole;
  const isGoldPriceLive = goldPriceSource && !goldPriceSource.includes('fallback');
  
  const totalGoldGrams = (totals.walletGoldGrams || 0) + (totals.vaultGoldGrams || 0) + (totals.mpgwAvailableGrams || 0);
  const totalPortfolioValue = totals.totalPortfolioUsd || (totalGoldGrams * goldPrice);

  const hasTransactionHistory = transactions.length > 0;

  const incomeTotal = transactions
    .filter(tx => tx.type.toLowerCase().includes('deposit') || tx.type.toLowerCase().includes('credit'))
    .reduce((sum, tx) => sum + Math.abs(Number(tx.amountUsd) || 0), 0);
  
  const expenseTotal = transactions
    .filter(tx => tx.type.toLowerCase().includes('withdraw') || tx.type.toLowerCase().includes('debit') || tx.type.toLowerCase().includes('sell'))
    .reduce((sum, tx) => sum + Math.abs(Number(tx.amountUsd) || 0), 0);

  const chartMonths = ['Sep', 'Oct', 'Nov', 'Dec'];
  const balanceChartData = [8000, 12000, 18000, totalPortfolioValue || 15000];
  const maxChartValue = Math.max(...balanceChartData, 20000);

  return (
    <DashboardLayout>
      <div data-testid="dashboard-container" className="min-h-screen bg-gray-50">
        <div className="flex">
          {/* Main Content */}
          <div className="flex-1 p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 data-testid="text-title" className="text-2xl font-bold text-gray-900">Dashboard</h1>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Input 
                    data-testid="input-search"
                    placeholder="Search" 
                    className="w-64 pl-10 bg-white border-gray-200 text-gray-700 placeholder:text-gray-400 rounded-xl"
                  />
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <span data-testid="badge-gold-price" className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${isGoldPriceLive ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  <span className={`w-2 h-2 rounded-full ${isGoldPriceLive ? 'bg-green-500' : 'bg-yellow-500'}`} />
                  {isGoldPriceLive ? 'Live' : 'Cached'}
                </span>
              </div>
            </div>

            {/* Recently Used Actions */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Recently used</h2>
                <Link href="/finapay">
                  <Button data-testid="button-view-all" variant="outline" size="sm" className="text-gray-600 border-gray-200 hover:bg-gray-50">
                    View All
                  </Button>
                </Link>
              </div>
              <div className="grid grid-cols-6 gap-4">
                <QuickActionButton icon={Send} label="Transfer" href="/finapay" testId="button-action-transfer" />
                <QuickActionButton icon={Plus} label="Add Funds" href="/finapay" testId="button-action-topup" />
                <QuickActionButton icon={Zap} label="Buy Gold" href="/finapay" testId="button-action-buy" />
                <QuickActionButton icon={ArrowDownRight} label="Sell Gold" href="/finapay" testId="button-action-sell" />
                <QuickActionButton icon={Droplets} label="BNSL" href="/bnsl" testId="button-action-bnsl" />
                <QuickActionButton icon={Wifi} label="FinaVault" href="/finavault" testId="button-action-vault" />
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-2 gap-6 mb-8">
              {/* Total Balance Chart */}
              <div data-testid="card-balance-chart" className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Total balance</p>
                    <p data-testid="text-total-balance" className="text-3xl font-bold text-gray-900">
                      {showBalance ? formatCurrency(totalPortfolioValue) : hiddenValue}
                    </p>
                  </div>
                  <select data-testid="select-period" className="px-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-600">
                    <option>Sep-Dec</option>
                    <option>Jan-Mar</option>
                  </select>
                </div>
                
                {/* Line Chart */}
                <div className="relative h-48">
                  <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-gray-400 pr-2">
                    <span>$20k</span>
                    <span>$15k</span>
                    <span>$10k</span>
                    <span>$5k</span>
                  </div>
                  <div className="ml-8 h-full relative">
                    <svg className="w-full h-full" viewBox="0 0 400 180" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="rgb(147, 51, 234)" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="rgb(147, 51, 234)" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path
                        d={`M 0 ${180 - (balanceChartData[0] / maxChartValue) * 160} 
                            C 50 ${180 - (balanceChartData[0] / maxChartValue) * 160}, 
                              100 ${180 - (balanceChartData[1] / maxChartValue) * 160}, 
                              133 ${180 - (balanceChartData[1] / maxChartValue) * 160}
                            C 166 ${180 - (balanceChartData[1] / maxChartValue) * 160}, 
                              200 ${180 - (balanceChartData[2] / maxChartValue) * 160}, 
                              266 ${180 - (balanceChartData[2] / maxChartValue) * 160}
                            C 333 ${180 - (balanceChartData[2] / maxChartValue) * 160}, 
                              366 ${180 - (balanceChartData[3] / maxChartValue) * 160}, 
                              400 ${180 - (balanceChartData[3] / maxChartValue) * 160}
                            L 400 180 L 0 180 Z`}
                        fill="url(#chartGradient)"
                      />
                      <path
                        d={`M 0 ${180 - (balanceChartData[0] / maxChartValue) * 160} 
                            C 50 ${180 - (balanceChartData[0] / maxChartValue) * 160}, 
                              100 ${180 - (balanceChartData[1] / maxChartValue) * 160}, 
                              133 ${180 - (balanceChartData[1] / maxChartValue) * 160}
                            C 166 ${180 - (balanceChartData[1] / maxChartValue) * 160}, 
                              200 ${180 - (balanceChartData[2] / maxChartValue) * 160}, 
                              266 ${180 - (balanceChartData[2] / maxChartValue) * 160}
                            C 333 ${180 - (balanceChartData[2] / maxChartValue) * 160}, 
                              366 ${180 - (balanceChartData[3] / maxChartValue) * 160}, 
                              400 ${180 - (balanceChartData[3] / maxChartValue) * 160}`}
                        fill="none"
                        stroke="rgb(147, 51, 234)"
                        strokeWidth="3"
                      />
                      <circle cx="266" cy={180 - (balanceChartData[2] / maxChartValue) * 160} r="6" fill="rgb(147, 51, 234)" />
                    </svg>
                    {/* Tooltip */}
                    <div className="absolute" style={{ left: '66%', top: `${20}%` }}>
                      <div className="bg-purple-600 text-white text-xs px-2 py-1 rounded-md shadow-lg">
                        ${formatNumber(balanceChartData[2] / 1000, 1)}k
                      </div>
                    </div>
                  </div>
                  <div className="ml-8 flex justify-between text-xs text-gray-400 mt-2">
                    {chartMonths.map((month, i) => (
                      <span key={month} className={i === 2 ? 'text-purple-600 font-medium' : ''}>{month}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Analysis Chart */}
              <div data-testid="card-analysis-chart" className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-lg font-semibold text-gray-900">Analysis</p>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                      <span className="text-xs text-gray-500">Income</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-pink-400"></span>
                      <span className="text-xs text-gray-500">Expense</span>
                    </div>
                  </div>
                </div>
                
                {/* Bar Chart */}
                <div className="relative h-48">
                  <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-gray-400 pr-2">
                    <span>$20k</span>
                    <span>$15k</span>
                    <span>$10k</span>
                    <span>$5k</span>
                  </div>
                  <div className="ml-8 h-full flex items-end justify-around gap-4">
                    {chartMonths.map((month, i) => {
                      const incomeHeights = [40, 60, 90, 70];
                      const expenseHeights = [30, 45, 75, 55];
                      return (
                        <div key={month} className="flex flex-col items-center gap-1 flex-1">
                          <div className="flex gap-1 items-end h-36">
                            <div 
                              data-testid={`bar-income-${i}`}
                              className="w-4 bg-purple-500 rounded-t-md transition-all"
                              style={{ height: `${incomeHeights[i]}%` }}
                            />
                            <div 
                              data-testid={`bar-expense-${i}`}
                              className="w-4 bg-pink-400 rounded-t-md transition-all"
                              style={{ height: `${expenseHeights[i]}%` }}
                            />
                          </div>
                          <span className={`text-xs ${i === 2 ? 'text-purple-600 font-medium' : 'text-gray-400'}`}>{month}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Overview Cards Row */}
            <div className="grid grid-cols-2 gap-6 mb-8">
              {/* Income Overview */}
              <div data-testid="card-income-overview" className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-lg font-semibold text-gray-900">Income Overview</p>
                  <Link href="/transactions">
                    <Button data-testid="button-income-detail" variant="outline" size="sm" className="text-purple-600 border-purple-200 hover:bg-purple-50">
                      View Detail
                    </Button>
                  </Link>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                        <ShoppingBag className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">70% from Gold Sales</p>
                        <p data-testid="text-income-gold" className="text-lg font-bold text-purple-600">${formatNumber(incomeTotal * 0.7)}</p>
                      </div>
                    </div>
                    <div className="w-12 h-12">
                      <svg viewBox="0 0 36 36" className="w-full h-full">
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="#E5E7EB"
                          strokeWidth="3"
                        />
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="#9333EA"
                          strokeWidth="3"
                          strokeDasharray="70, 100"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-pink-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">30% from Deposits</p>
                        <p data-testid="text-income-deposits" className="text-lg font-bold text-pink-600">${formatNumber(incomeTotal * 0.3)}</p>
                      </div>
                    </div>
                    <div className="w-12 h-12">
                      <svg viewBox="0 0 36 36" className="w-full h-full">
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="#E5E7EB"
                          strokeWidth="3"
                        />
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="#EC4899"
                          strokeWidth="3"
                          strokeDasharray="30, 100"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expense Overview */}
              <div data-testid="card-expense-overview" className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-lg font-semibold text-gray-900">Expense Overview</p>
                  <Link href="/transactions">
                    <Button data-testid="button-expense-detail" variant="outline" size="sm" className="text-purple-600 border-purple-200 hover:bg-purple-50">
                      View Detail
                    </Button>
                  </Link>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                        <ArrowDownRight className="w-5 h-5 text-red-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">60% Gold Purchases</p>
                        <p data-testid="text-expense-gold" className="text-lg font-bold text-red-600">${formatNumber(expenseTotal * 0.6)}</p>
                      </div>
                    </div>
                    <div className="w-12 h-12">
                      <svg viewBox="0 0 36 36" className="w-full h-full">
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="#E5E7EB"
                          strokeWidth="3"
                        />
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="#EF4444"
                          strokeWidth="3"
                          strokeDasharray="60, 100"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                        <PiggyBank className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">40% Withdrawals</p>
                        <p data-testid="text-expense-withdrawals" className="text-lg font-bold text-orange-600">${formatNumber(expenseTotal * 0.4)}</p>
                      </div>
                    </div>
                    <div className="w-12 h-12">
                      <svg viewBox="0 0 36 36" className="w-full h-full">
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="#E5E7EB"
                          strokeWidth="3"
                        />
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="#F97316"
                          strokeWidth="3"
                          strokeDasharray="40, 100"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Wallets Section - Business Cards */}
            {isBusinessUser && (
              <div data-testid="card-finabridge" className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-lg">FinaBridge</h3>
                      <p className="text-sm text-blue-200">Trade Finance</p>
                    </div>
                  </div>
                  <Link href="/finabridge">
                    <Button data-testid="button-finabridge-view" variant="ghost" size="sm" className="text-white hover:bg-white/10">
                      View <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-blue-200 mb-1">Available Gold</p>
                    <p data-testid="text-finabridge-gold" className="text-2xl font-bold text-white">
                      {showBalance ? `${formatNumber(finaBridge?.goldGrams || 0, 4)}g` : hiddenValue}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-blue-200 mb-1">Active Cases</p>
                    <p data-testid="text-finabridge-cases" className="text-2xl font-bold text-white">{finaBridge?.activeCases || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-blue-200 mb-1">Trade Volume</p>
                    <p data-testid="text-finabridge-volume" className="text-2xl font-bold text-white">${formatNumber(finaBridge?.tradeVolume || 0)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-blue-200 mb-1">USD Value</p>
                    <p data-testid="text-finabridge-usd" className="text-2xl font-bold text-white">{showBalance ? formatCurrency(finaBridge?.usdValue || 0) : hiddenValue}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div data-testid="sidebar-right" className="w-96 bg-white border-l border-gray-100 p-6 hidden xl:block">
            {/* My Cards Section */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">My cards</h3>
                <Link href="/finapay">
                  <Button data-testid="button-add-card" size="sm" className="bg-purple-600 hover:bg-purple-700 text-white text-xs">
                    + Add New
                  </Button>
                </Link>
              </div>
              
              {/* Card Display */}
              <div data-testid="card-wallet-display" className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl p-5 relative overflow-hidden">
                <div className="absolute top-4 right-4 flex items-center gap-1">
                  <CreditCard className="w-8 h-8 text-white/50" />
                </div>
                <div className="mb-6">
                  <p className="text-purple-200 text-xs mb-2">Gold Balance</p>
                  <p data-testid="text-card-number" className="text-white text-lg font-mono tracking-wider">
                    {showBalance ? `${formatNumber(totalGoldGrams, 4)}g` : '•••• •••• •••• ••••'}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-200 text-xs">Card Holder</p>
                    <p data-testid="text-card-holder" className="text-white font-medium">{fullName}</p>
                  </div>
                  <div>
                    <p className="text-purple-200 text-xs">Value</p>
                    <p data-testid="text-card-value" className="text-white font-medium">{showBalance ? formatCurrency(totalPortfolioValue) : '••••'}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-8 h-8 rounded-full bg-yellow-400/80" />
                    <div className="w-8 h-8 rounded-full bg-yellow-600/60 -ml-3" />
                  </div>
                </div>
              </div>
            </div>

            {/* Transactions Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Transactions</h3>
                <Link href="/transactions">
                  <Button data-testid="button-report" variant="outline" size="sm" className="text-purple-600 border-purple-200 hover:bg-purple-50">
                    Report
                  </Button>
                </Link>
              </div>
              
              <div className="divide-y divide-gray-100">
                {hasTransactionHistory ? (
                  transactions.slice(0, 5).map((tx) => (
                    <TransactionItem
                      key={tx.id}
                      id={tx.id}
                      icon={tx.type.includes('Deposit') ? ArrowUpRight : tx.type.includes('Withdraw') ? ArrowDownRight : Wallet}
                      name={tx.type}
                      date={new Date(tx.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      amount={tx.amountGold ? `${formatNumber(Number(tx.amountGold), 4)}g` : `$${formatNumber(Number(tx.amountUsd) || 0)}`}
                      status={tx.status !== 'completed' ? tx.status : undefined}
                      iconBg={tx.type.includes('Deposit') ? 'bg-green-100 text-green-600' : tx.type.includes('Withdraw') ? 'bg-red-100 text-red-600' : 'bg-purple-100 text-purple-600'}
                    />
                  ))
                ) : (
                  <div className="py-8 text-center">
                    <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No transactions yet</p>
                    <p className="text-gray-400 text-xs mt-1">Start by adding funds</p>
                  </div>
                )}
              </div>

              {hasTransactionHistory && (
                <Link href="/transactions">
                  <Button data-testid="button-view-all-transactions" variant="ghost" className="w-full mt-4 text-purple-600 hover:bg-purple-50">
                    View All Transactions <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              )}
            </div>

            {/* Upgrade Banner */}
            <div className="mt-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-4 border border-purple-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Upgrade to Pro</p>
                  <p className="text-xs text-gray-500">Get the best value</p>
                </div>
              </div>
              <Link href="/bnsl">
                <Button data-testid="button-upgrade" className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                  Upgrade
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
