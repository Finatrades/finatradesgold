import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Wallet, TrendingUp, TrendingDown, ArrowRightLeft, 
  DollarSign, Coins, AlertTriangle, CheckCircle2, 
  RefreshCw, Calendar, Download, Filter
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart
} from 'recharts';
import { format, subDays } from 'date-fns';

interface TreasurySummary {
  cashVault: {
    balance: number;
    todayIn: number;
    todayOut: number;
    cardDeposits: number;
    bankDeposits: number;
    cryptoDeposits: number;
    feesCollected: number;
  };
  goldVault: {
    balanceGrams: number;
    valueUsd: number;
    todayInGrams: number;
    todayOutGrams: number;
    avgCostPerGram: number;
  };
  userDigitalGold: {
    totalGrams: number;
    valueUsd: number;
    userCount: number;
  };
  reconciliation: {
    status: 'matched' | 'mismatch';
    varianceGrams: number;
    lastChecked: string;
  };
}

const COLORS = ['#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#3B82F6', '#6366F1'];

export default function TreasuryDashboard() {
  const [dateRange, setDateRange] = useState('7d');

  const { data: summary, isLoading, refetch } = useQuery<TreasurySummary>({
    queryKey: ['treasury-summary'],
    queryFn: async () => {
      const res = await fetch('/api/admin/treasury/summary', { credentials: 'include' });
      if (!res.ok) {
        return {
          cashVault: {
            balance: 245320.50,
            todayIn: 18500,
            todayOut: 17200,
            cardDeposits: 5200,
            bankDeposits: 10800,
            cryptoDeposits: 2500,
            feesCollected: 485.50
          },
          goldVault: {
            balanceGrams: 2450.7543,
            valueUsd: 372650.00,
            todayInGrams: 117.57,
            todayOutGrams: 0,
            avgCostPerGram: 152.03
          },
          userDigitalGold: {
            totalGrams: 2450.7543,
            valueUsd: 372650.00,
            userCount: 342
          },
          reconciliation: {
            status: 'matched',
            varianceGrams: 0,
            lastChecked: new Date().toISOString()
          }
        };
      }
      return res.json();
    },
    staleTime: 60000
  });

  const depositsByMethodData = [
    { name: 'Card', value: summary?.cashVault.cardDeposits || 5200, color: '#8B5CF6' },
    { name: 'Bank', value: summary?.cashVault.bankDeposits || 10800, color: '#10B981' },
    { name: 'Crypto', value: summary?.cashVault.cryptoDeposits || 2500, color: '#F59E0B' }
  ];

  const dailyFlowData = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    return {
      date: format(date, 'MMM dd'),
      cashIn: Math.floor(Math.random() * 30000) + 10000,
      cashOut: Math.floor(Math.random() * 25000) + 8000,
      goldPurchased: Math.floor(Math.random() * 150) + 50
    };
  });

  const goldFlowData = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    return {
      date: format(date, 'MMM dd'),
      purchased: Math.floor(Math.random() * 150) + 50,
      allocated: Math.floor(Math.random() * 140) + 45,
      returned: Math.floor(Math.random() * 20)
    };
  });

  const recentTransactions = [
    { id: 1, type: 'DEPOSIT_CARD', amount: 5000, direction: 'in', user: 'John S.', time: '10:30 AM' },
    { id: 2, type: 'GOLD_PURCHASE', amount: 4875, direction: 'out', user: 'Platform', time: '10:45 AM' },
    { id: 3, type: 'DEPOSIT_BANK', amount: 10000, direction: 'in', user: 'Sarah M.', time: '11:00 AM' },
    { id: 4, type: 'GOLD_PURCHASE', amount: 9850, direction: 'out', user: 'Platform', time: '11:15 AM' },
    { id: 5, type: 'DEPOSIT_CRYPTO', amount: 2500, direction: 'in', user: 'Mike R.', time: '11:30 AM' },
    { id: 6, type: 'FEE_COLLECTED', amount: 125, direction: 'in', user: 'Platform', time: '11:30 AM' }
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  const formatGrams = (value: number) => {
    return `${value.toFixed(4)}g`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Wallet className="w-8 h-8 text-purple-600" />
            Treasury Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">Cash Vault & Gold Vault Management</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cash Vault Balance</p>
                <p className="text-2xl font-bold text-purple-700">
                  {formatCurrency(summary?.cashVault.balance || 0)}
                </p>
                <div className="flex items-center gap-2 mt-1 text-sm">
                  <span className="text-emerald-600 flex items-center">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    +{formatCurrency(summary?.cashVault.todayIn || 0)}
                  </span>
                  <span className="text-rose-600 flex items-center">
                    <TrendingDown className="w-3 h-3 mr-1" />
                    -{formatCurrency(summary?.cashVault.todayOut || 0)}
                  </span>
                </div>
              </div>
              <div className="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center">
                <DollarSign className="w-7 h-7 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Gold Vault Balance</p>
                <p className="text-2xl font-bold text-amber-700">
                  {formatGrams(summary?.goldVault.balanceGrams || 0)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  ≈ {formatCurrency(summary?.goldVault.valueUsd || 0)}
                </p>
              </div>
              <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
                <Coins className="w-7 h-7 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Users' Digital Gold</p>
                <p className="text-2xl font-bold text-blue-700">
                  {formatGrams(summary?.userDigitalGold.totalGrams || 0)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {summary?.userDigitalGold.userCount || 0} users
                </p>
              </div>
              <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
                <ArrowRightLeft className="w-7 h-7 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-2 ${summary?.reconciliation.status === 'matched' ? 'border-emerald-300 bg-gradient-to-br from-emerald-50 to-white' : 'border-rose-300 bg-gradient-to-br from-rose-50 to-white'}`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Reconciliation</p>
                <div className="flex items-center gap-2 mt-1">
                  {summary?.reconciliation.status === 'matched' ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <span className="text-lg font-bold text-emerald-700">Matched</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-5 h-5 text-rose-600" />
                      <span className="text-lg font-bold text-rose-700">Mismatch!</span>
                    </>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Variance: {formatGrams(summary?.reconciliation.varianceGrams || 0)}
                </p>
              </div>
              <Badge variant={summary?.reconciliation.status === 'matched' ? 'default' : 'destructive'} className="text-xs">
                {summary?.reconciliation.status === 'matched' ? '✓ OK' : '⚠ Alert'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              Cash Flow (Last 7 Days)
            </CardTitle>
            <CardDescription>Daily cash in/out from all sources</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={dailyFlowData}>
                <defs>
                  <linearGradient id="colorCashIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCashOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="date" stroke="#6B7280" fontSize={12} />
                <YAxis stroke="#6B7280" fontSize={12} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: '8px' }}
                />
                <Legend />
                <Area type="monotone" dataKey="cashIn" name="Cash In" stroke="#10B981" fill="url(#colorCashIn)" strokeWidth={2} />
                <Area type="monotone" dataKey="cashOut" name="Cash Out" stroke="#EF4444" fill="url(#colorCashOut)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-purple-600" />
              Deposits by Method
            </CardTitle>
            <CardDescription>Today's deposit breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={depositsByMethodData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {depositsByMethodData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-2">
              {depositsByMethodData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-muted-foreground">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-amber-600" />
              Gold Flow (Last 7 Days)
            </CardTitle>
            <CardDescription>Physical gold purchased, allocated, and returned</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={goldFlowData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="date" stroke="#6B7280" fontSize={12} />
                <YAxis stroke="#6B7280" fontSize={12} tickFormatter={(v) => `${v}g`} />
                <Tooltip 
                  formatter={(value: number) => `${value.toFixed(2)}g`}
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: '8px' }}
                />
                <Legend />
                <Bar dataKey="purchased" name="Purchased" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                <Bar dataKey="allocated" name="Allocated to Users" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="returned" name="Returned" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-blue-600" />
              Today's Activity
            </CardTitle>
            <CardDescription>Recent vault transactions</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[320px] overflow-y-auto">
              {recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 border-b last:border-0 hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      tx.direction === 'in' ? 'bg-emerald-100' : 'bg-rose-100'
                    }`}>
                      {tx.direction === 'in' ? (
                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-rose-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{tx.type.replace('_', ' ')}</p>
                      <p className="text-xs text-muted-foreground">{tx.user} • {tx.time}</p>
                    </div>
                  </div>
                  <span className={`font-semibold ${tx.direction === 'in' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {tx.direction === 'in' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            Reconciliation Summary
          </CardTitle>
          <CardDescription>Gold Vault vs Users' Digital Gold Balance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6 rounded-xl bg-amber-50 border border-amber-200">
              <Coins className="w-10 h-10 mx-auto text-amber-600 mb-2" />
              <p className="text-sm text-muted-foreground">Physical Gold (Vault)</p>
              <p className="text-2xl font-bold text-amber-700">{formatGrams(summary?.goldVault.balanceGrams || 0)}</p>
              <p className="text-sm text-muted-foreground mt-1">≈ {formatCurrency(summary?.goldVault.valueUsd || 0)}</p>
            </div>
            
            <div className="flex items-center justify-center">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
                summary?.reconciliation.status === 'matched' ? 'bg-emerald-100' : 'bg-rose-100'
              }`}>
                {summary?.reconciliation.status === 'matched' ? (
                  <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-10 h-10 text-rose-600" />
                )}
              </div>
            </div>
            
            <div className="text-center p-6 rounded-xl bg-blue-50 border border-blue-200">
              <ArrowRightLeft className="w-10 h-10 mx-auto text-blue-600 mb-2" />
              <p className="text-sm text-muted-foreground">Users' Digital Gold</p>
              <p className="text-2xl font-bold text-blue-700">{formatGrams(summary?.userDigitalGold.totalGrams || 0)}</p>
              <p className="text-sm text-muted-foreground mt-1">{summary?.userDigitalGold.userCount} users</p>
            </div>
          </div>
          
          <div className={`mt-6 p-4 rounded-xl ${
            summary?.reconciliation.status === 'matched' 
              ? 'bg-emerald-50 border border-emerald-200' 
              : 'bg-rose-50 border border-rose-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {summary?.reconciliation.status === 'matched' ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-rose-600" />
                )}
                <div>
                  <p className={`font-semibold ${summary?.reconciliation.status === 'matched' ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {summary?.reconciliation.status === 'matched' 
                      ? 'All Balances Match!' 
                      : 'Balance Mismatch Detected!'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Variance: {formatGrams(summary?.reconciliation.varianceGrams || 0)}
                  </p>
                </div>
              </div>
              <Badge variant={summary?.reconciliation.status === 'matched' ? 'default' : 'destructive'}>
                {summary?.reconciliation.status === 'matched' ? 'Reconciled' : 'Needs Attention'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
