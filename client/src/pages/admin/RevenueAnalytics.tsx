import React, { useState } from 'react';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { 
  DollarSign, TrendingUp, TrendingDown, BarChart3, PieChart, 
  RefreshCw, Download, ArrowUpRight, ArrowDownRight, Wallet
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RePieChart, Pie, Cell
} from 'recharts';

interface RevenueData {
  summary: {
    totalRevenue: number;
    totalFees: number;
    totalSpreadRevenue: number;
    revenueChange: number;
    averageDaily: number;
  };
  byModule: { module: string; revenue: number; count: number }[];
  byType: { type: string; amount: number }[];
  daily: { date: string; revenue: number; fees: number; spread: number }[];
  topTransactions: { id: string; amount: number; module: string; date: string }[];
}

const COLORS = ['#8A2BE2', '#FF2FBF', '#4B0082', '#A342FF', '#6B21A8', '#9333EA'];

export default function RevenueAnalytics() {
  const [period, setPeriod] = useState('30d');

  const { data, isLoading, refetch } = useQuery<RevenueData>({
    queryKey: ['/api/admin/revenue-analytics', period],
    queryFn: async () => {
      const res = await fetch(`/api/admin/revenue-analytics?period=${period}`);
      if (!res.ok) throw new Error('Failed to fetch revenue data');
      return res.json();
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground" data-testid="text-revenue-title">Revenue Analytics</h1>
            <p className="text-muted-foreground mt-1">Platform revenue, fees, and financial performance</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[150px]" data-testid="select-period">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="90d">Last 90 Days</SelectItem>
                <SelectItem value="365d">Last Year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => refetch()} data-testid="button-refresh">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" data-testid="button-export">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-3xl font-bold mt-1">
                    {isLoading ? '...' : formatCurrency(data?.summary.totalRevenue || 0)}
                  </p>
                  {data?.summary.revenueChange !== undefined && (
                    <div className={`flex items-center mt-1 text-sm ${data.summary.revenueChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {data.summary.revenueChange >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                      {formatPercent(data.summary.revenueChange)} vs previous
                    </div>
                  )}
                </div>
                <div className="p-4 bg-primary/20 rounded-full">
                  <DollarSign className="w-8 h-8 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Fee Revenue</p>
                  <p className="text-3xl font-bold mt-1">
                    {isLoading ? '...' : formatCurrency(data?.summary.totalFees || 0)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Transaction fees collected</p>
                </div>
                <div className="p-4 bg-info-muted rounded-full">
                  <Wallet className="w-8 h-8 text-info-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Spread Revenue</p>
                  <p className="text-3xl font-bold mt-1">
                    {isLoading ? '...' : formatCurrency(data?.summary.totalSpreadRevenue || 0)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Buy/sell spread earnings</p>
                </div>
                <div className="p-4 bg-success-muted rounded-full">
                  <TrendingUp className="w-8 h-8 text-success-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Daily Average</p>
                  <p className="text-3xl font-bold mt-1">
                    {isLoading ? '...' : formatCurrency(data?.summary.averageDaily || 0)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Average daily revenue</p>
                </div>
                <div className="p-4 bg-warning-muted rounded-full">
                  <BarChart3 className="w-8 h-8 text-warning-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="trend" className="space-y-4">
          <TabsList>
            <TabsTrigger value="trend">Revenue Trend</TabsTrigger>
            <TabsTrigger value="breakdown">Module Breakdown</TabsTrigger>
            <TabsTrigger value="composition">Revenue Composition</TabsTrigger>
          </TabsList>

          <TabsContent value="trend">
            <Card>
              <CardHeader>
                <CardTitle>Daily Revenue Trend</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center h-[400px]">
                    <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={data?.daily || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="date" tickFormatter={(val) => format(new Date(val), 'MMM d')} />
                      <YAxis tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`} />
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        labelFormatter={(label) => format(new Date(label), 'PPP')}
                      />
                      <Legend />
                      <Area type="monotone" dataKey="revenue" name="Total Revenue" stroke="#8A2BE2" fill="#8A2BE2" fillOpacity={0.3} />
                      <Area type="monotone" dataKey="fees" name="Fee Revenue" stroke="#FF2FBF" fill="#FF2FBF" fillOpacity={0.3} />
                      <Area type="monotone" dataKey="spread" name="Spread Revenue" stroke="#4B0082" fill="#4B0082" fillOpacity={0.3} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="breakdown">
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Module</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center h-[400px]">
                    <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={data?.byModule || []} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="module" width={100} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Bar dataKey="revenue" fill="#8A2BE2" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="composition">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Composition</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center h-[300px]">
                      <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <RePieChart>
                        <Pie
                          data={data?.byType || []}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="amount"
                          nameKey="type"
                          label={({ type, percent }) => `${type}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {(data?.byType || []).map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      </RePieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Revenue Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(data?.topTransactions || []).slice(0, 5).map((tx, i) => (
                      <div key={tx.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                            {i + 1}
                          </div>
                          <div>
                            <p className="font-medium">{tx.module}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(tx.date), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="font-mono">
                          {formatCurrency(tx.amount)}
                        </Badge>
                      </div>
                    ))}
                    {(!data?.topTransactions || data.topTransactions.length === 0) && (
                      <p className="text-center text-muted-foreground py-8">No transactions found</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
