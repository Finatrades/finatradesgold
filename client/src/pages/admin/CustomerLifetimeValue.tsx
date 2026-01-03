import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ScatterChart, Scatter } from 'recharts';
import { DollarSign, Users, TrendingUp, Star, RefreshCw, Crown, Medal, Award } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

export default function CustomerLifetimeValue() {
  const [period, setPeriod] = useState('all');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['customer-ltv', period],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/admin/customer-ltv?period=${period}`);
      return res.json();
    },
  });

  const stats = data?.stats || {
    avgLTV: 0, medianLTV: 0, topUserLTV: 0, totalLTV: 0,
    avgOrderValue: 0, avgPurchaseFrequency: 0, avgCustomerLifespan: 0,
  };

  const ltvDistribution = data?.ltvDistribution || [];
  const ltvBySegment = data?.ltvBySegment || [];
  const topCustomers = data?.topCustomers || [];
  const ltvTrend = data?.ltvTrend || [];

  const COLORS = ['#8B5CF6', '#EC4899', '#3B82F6', '#10B981', '#F59E0B'];

  const formatCurrency = (value: number) => `$${value.toLocaleString()}`;

  const getTierIcon = (index: number) => {
    if (index === 0) return <Crown className="w-5 h-5 text-yellow-500" />;
    if (index === 1) return <Medal className="w-5 h-5 text-gray-400" />;
    if (index === 2) return <Award className="w-5 h-5 text-orange-500" />;
    return <Star className="w-5 h-5 text-muted-foreground" />;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Customer Lifetime Value</h1>
            <p className="text-muted-foreground">Identify and analyze high-value customers</p>
          </div>
          <div className="flex gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="365d">Last Year</SelectItem>
                <SelectItem value="90d">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" /> Refresh
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <DollarSign className="w-8 h-8 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(stats.avgLTV)}</p>
                  <p className="text-sm text-muted-foreground">Average LTV</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(stats.topUserLTV)}</p>
                  <p className="text-sm text-muted-foreground">Top Customer LTV</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(stats.avgOrderValue)}</p>
                  <p className="text-sm text-muted-foreground">Avg Order Value</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Star className="w-8 h-8 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.avgPurchaseFrequency.toFixed(1)}</p>
                  <p className="text-sm text-muted-foreground">Avg Purchases/Year</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>LTV Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={ltvDistribution}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="range" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                  <Bar dataKey="count" fill="#8B5CF6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>LTV by Segment</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={ltvBySegment}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {ltvBySegment.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>LTV Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={ltvTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="avgLTV" stroke="#8B5CF6" name="Average LTV" strokeWidth={2} />
                  <Line type="monotone" dataKey="newUserLTV" stroke="#10B981" name="New User LTV" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>LTV Formula</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground mb-2">Customer Lifetime Value</p>
                  <p className="font-mono text-lg">AOV × Frequency × Lifespan</p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 bg-purple-100 dark:bg-purple-950/20 rounded">
                    <p className="text-xs text-muted-foreground">AOV</p>
                    <p className="font-bold">{formatCurrency(stats.avgOrderValue)}</p>
                  </div>
                  <div className="p-2 bg-blue-100 dark:bg-blue-950/20 rounded">
                    <p className="text-xs text-muted-foreground">Freq/yr</p>
                    <p className="font-bold">{stats.avgPurchaseFrequency.toFixed(1)}</p>
                  </div>
                  <div className="p-2 bg-green-100 dark:bg-green-950/20 rounded">
                    <p className="text-xs text-muted-foreground">Years</p>
                    <p className="font-bold">{(stats.avgCustomerLifespan / 365).toFixed(1)}</p>
                  </div>
                </div>
                <div className="p-3 border-2 border-primary rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Calculated LTV</p>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(stats.avgLTV)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Top Customers by LTV</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium">Rank</th>
                    <th className="text-left py-3 px-2 font-medium">Customer</th>
                    <th className="text-right py-3 px-2 font-medium">Total LTV</th>
                    <th className="text-right py-3 px-2 font-medium">Transactions</th>
                    <th className="text-right py-3 px-2 font-medium">Avg Order</th>
                    <th className="text-left py-3 px-2 font-medium">Segment</th>
                  </tr>
                </thead>
                <tbody>
                  {topCustomers.map((customer: any, index: number) => (
                    <tr key={customer.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          {getTierIcon(index)}
                          <span className="font-medium">#{index + 1}</span>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <div>
                          <p className="font-medium">{customer.name}</p>
                          <p className="text-sm text-muted-foreground">{customer.email}</p>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <span className="font-bold text-green-600">{formatCurrency(customer.ltv)}</span>
                      </td>
                      <td className="py-3 px-2 text-right">{customer.transactions}</td>
                      <td className="py-3 px-2 text-right">{formatCurrency(customer.avgOrder)}</td>
                      <td className="py-3 px-2">
                        <Badge variant={
                          customer.segment === 'VIP' ? 'default' :
                          customer.segment === 'High Value' ? 'secondary' : 'outline'
                        }>
                          {customer.segment}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
