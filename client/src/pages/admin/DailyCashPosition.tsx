import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { DollarSign, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, RefreshCw, Download } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';

export default function DailyCashPosition() {
  const [period, setPeriod] = useState('7d');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['cash-position', period],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/admin/cash-position?period=${period}`);
      return res.json();
    },
  });

  const today = data?.today || {
    openingBalance: 0, closingBalance: 0, totalInflows: 0, totalOutflows: 0, netCashFlow: 0,
  };
  const cashFlowData = data?.cashFlowData || [];
  const inflowBreakdown = data?.inflowBreakdown || [];
  const outflowBreakdown = data?.outflowBreakdown || [];

  const formatCurrency = (value: number) => `$${Math.abs(value).toLocaleString()}`;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Daily Cash Position</h1>
            <p className="text-muted-foreground">Net cash inflows vs outflows summary</p>
          </div>
          <div className="flex gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="90d">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" /> Refresh
            </Button>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" /> Export
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <DollarSign className="w-8 h-8 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(today.openingBalance)}</p>
                  <p className="text-sm text-muted-foreground">Opening Balance</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <ArrowUpRight className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold text-green-600">+{formatCurrency(today.totalInflows)}</p>
                  <p className="text-sm text-muted-foreground">Total Inflows</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <ArrowDownRight className="w-8 h-8 text-red-500" />
                <div>
                  <p className="text-2xl font-bold text-red-600">-{formatCurrency(today.totalOutflows)}</p>
                  <p className="text-sm text-muted-foreground">Total Outflows</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                {today.netCashFlow >= 0 ? (
                  <TrendingUp className="w-8 h-8 text-green-500" />
                ) : (
                  <TrendingDown className="w-8 h-8 text-red-500" />
                )}
                <div>
                  <p className={`text-2xl font-bold ${today.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {today.netCashFlow >= 0 ? '+' : '-'}{formatCurrency(today.netCashFlow)}
                  </p>
                  <p className="text-sm text-muted-foreground">Net Cash Flow</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <DollarSign className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(today.closingBalance)}</p>
                  <p className="text-sm text-muted-foreground">Closing Balance</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Cash Flow Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={cashFlowData}>
                <defs>
                  <linearGradient id="colorInflow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorOutflow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend />
                <Area type="monotone" dataKey="inflows" stroke="#10B981" fillOpacity={1} fill="url(#colorInflow)" name="Inflows" />
                <Area type="monotone" dataKey="outflows" stroke="#EF4444" fillOpacity={1} fill="url(#colorOutflow)" name="Outflows" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-green-600">Inflow Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={inflowBreakdown} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="source" className="text-xs" width={100} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Bar dataKey="amount" fill="#10B981" />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {inflowBreakdown.map((item: any) => (
                  <div key={item.source} className="flex justify-between text-sm">
                    <span>{item.source}</span>
                    <span className="font-medium text-green-600">+{formatCurrency(item.amount)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">Outflow Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={outflowBreakdown} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="source" className="text-xs" width={100} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Bar dataKey="amount" fill="#EF4444" />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {outflowBreakdown.map((item: any) => (
                  <div key={item.source} className="flex justify-between text-sm">
                    <span>{item.source}</span>
                    <span className="font-medium text-red-600">-{formatCurrency(item.amount)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Daily Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium">Date</th>
                    <th className="text-right py-3 px-2 font-medium">Opening</th>
                    <th className="text-right py-3 px-2 font-medium">Inflows</th>
                    <th className="text-right py-3 px-2 font-medium">Outflows</th>
                    <th className="text-right py-3 px-2 font-medium">Net Flow</th>
                    <th className="text-right py-3 px-2 font-medium">Closing</th>
                  </tr>
                </thead>
                <tbody>
                  {cashFlowData.slice(0, 7).map((day: any) => (
                    <tr key={day.date} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-2 font-medium">{day.date}</td>
                      <td className="py-3 px-2 text-right">{formatCurrency(day.opening)}</td>
                      <td className="py-3 px-2 text-right text-green-600">+{formatCurrency(day.inflows)}</td>
                      <td className="py-3 px-2 text-right text-red-600">-{formatCurrency(day.outflows)}</td>
                      <td className={`py-3 px-2 text-right font-medium ${day.netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {day.netFlow >= 0 ? '+' : '-'}{formatCurrency(day.netFlow)}
                      </td>
                      <td className="py-3 px-2 text-right font-medium">{formatCurrency(day.closing)}</td>
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
