import React from 'react';
import { apiFetch } from '@/lib/queryClient';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { 
  DollarSign, TrendingUp, TrendingDown, RefreshCw, 
  Coins, Wallet, AlertTriangle, CheckCircle, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend
} from 'recharts';

interface LiquidityData {
  current: {
    totalGoldGrams: number;
    totalGoldValueUsd: number;
    totalCashUsd: number;
    totalCashAed: number;
    pendingWithdrawalsUsd: number;
    pendingDepositsUsd: number;
    bnslObligationsUsd: number;
    tradeFinanceLockedUsd: number;
    availableLiquidityUsd: number;
    liquidityRatio: number;
  };
  history: {
    date: string;
    availableLiquidity: number;
    pendingObligations: number;
    liquidityRatio: number;
  }[];
  alerts: { type: string; message: string; severity: string }[];
  recommendations: string[];
}

export default function LiquidityDashboard() {
  const { data, isLoading, refetch } = useQuery<LiquidityData>({
    queryKey: ['/api/admin/liquidity'],
    queryFn: async () => {
      const res = await apiFetch('/api/admin/liquidity');
      if (!res.ok) throw new Error('Failed to fetch liquidity data');
      return res.json();
    },
    refetchInterval: 60000,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  };

  const formatGold = (value: number) => `${value.toFixed(2)}g`;

  const liquidityRatio = data?.current?.liquidityRatio || 0;
  const isHealthy = liquidityRatio >= 1.2;
  const isWarning = liquidityRatio >= 1 && liquidityRatio < 1.2;
  const isCritical = liquidityRatio < 1;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground" data-testid="text-liquidity-title">Liquidity Dashboard</h1>
            <p className="text-muted-foreground mt-1">Cash flow management and liquidity monitoring</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} data-testid="button-refresh">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {data?.alerts && data.alerts.length > 0 && (
          <div className="space-y-2">
            {data.alerts.map((alert, i) => (
              <div 
                key={i}
                className={`p-4 rounded-lg flex items-center gap-3 ${
                  alert.severity === 'critical' ? 'bg-destructive/10 border border-destructive' :
                  alert.severity === 'warning' ? 'bg-warning-muted' :
                  'bg-info-muted'
                }`}
              >
                <AlertTriangle className={`w-5 h-5 ${alert.severity === 'critical' ? 'text-destructive' : 'text-warning-muted-foreground'}`} />
                <span className="font-medium">{alert.message}</span>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className={isCritical ? 'border-destructive' : isWarning ? 'border-warning' : ''}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">Liquidity Ratio</p>
                  <p className={`text-3xl font-bold mt-1 ${isCritical ? 'text-destructive' : isWarning ? 'text-yellow-600' : 'text-green-600'}`}>
                    {(liquidityRatio * 100).toFixed(1)}%
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${isCritical ? 'bg-destructive/10' : isWarning ? 'bg-warning-muted' : 'bg-success-muted'}`}>
                  {isCritical ? (
                    <AlertTriangle className="w-6 h-6 text-destructive" />
                  ) : isWarning ? (
                    <AlertTriangle className="w-6 h-6 text-yellow-600" />
                  ) : (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  )}
                </div>
              </div>
              <Progress value={Math.min(liquidityRatio * 100, 100)} className="mb-2" />
              <p className="text-xs text-muted-foreground">
                {isCritical ? 'Critical - Below 100%' : isWarning ? 'Warning - Below 120%' : 'Healthy - Above 120%'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Available Liquidity</p>
                  <p className="text-2xl font-bold mt-1">
                    {isLoading ? '...' : formatCurrency(data?.current?.availableLiquidityUsd || 0)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Free cash + gold value</p>
                </div>
                <div className="p-3 bg-primary/10 rounded-lg">
                  <DollarSign className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Gold Holdings</p>
                  <p className="text-2xl font-bold mt-1">
                    {isLoading ? '...' : formatGold(data?.current?.totalGoldGrams || 0)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatCurrency(data?.current?.totalGoldValueUsd || 0)}
                  </p>
                </div>
                <div className="p-3 bg-warning-muted rounded-lg">
                  <Coins className="w-6 h-6 text-warning-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Cash Reserves</p>
                  <p className="text-2xl font-bold mt-1">
                    {isLoading ? '...' : formatCurrency(data?.current?.totalCashUsd || 0)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    AED {(data?.current?.totalCashAed || 0).toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-success-muted rounded-lg">
                  <Wallet className="w-6 h-6 text-success-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Liquidity Trend</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-[300px]">
                  <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={data?.history || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={(v) => format(new Date(v), 'MMM d')} />
                    <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} labelFormatter={(l) => format(new Date(l), 'PPP')} />
                    <Legend />
                    <Area type="monotone" dataKey="availableLiquidity" name="Available Liquidity" stroke="#8A2BE2" fill="#8A2BE2" fillOpacity={0.3} />
                    <Area type="monotone" dataKey="pendingObligations" name="Pending Obligations" stroke="#FF2FBF" fill="#FF2FBF" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Obligations Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Pending Withdrawals</span>
                    <span className="text-sm font-medium">{formatCurrency(data?.current?.pendingWithdrawalsUsd || 0)}</span>
                  </div>
                  <Progress 
                    value={((data?.current?.pendingWithdrawalsUsd || 0) / (data?.current?.availableLiquidityUsd || 1)) * 100} 
                    className="h-2"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">BNSL Obligations</span>
                    <span className="text-sm font-medium">{formatCurrency(data?.current?.bnslObligationsUsd || 0)}</span>
                  </div>
                  <Progress 
                    value={((data?.current?.bnslObligationsUsd || 0) / (data?.current?.availableLiquidityUsd || 1)) * 100} 
                    className="h-2"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Trade Finance Locked</span>
                    <span className="text-sm font-medium">{formatCurrency(data?.current?.tradeFinanceLockedUsd || 0)}</span>
                  </div>
                  <Progress 
                    value={((data?.current?.tradeFinanceLockedUsd || 0) / (data?.current?.availableLiquidityUsd || 1)) * 100} 
                    className="h-2"
                  />
                </div>
                <hr />
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-green-600">Pending Deposits</span>
                    <span className="text-sm font-medium text-green-600">+{formatCurrency(data?.current?.pendingDepositsUsd || 0)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {data?.recommendations && data.recommendations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {data.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{rec}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
