import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Funnel, FunnelChart, LabelList } from 'recharts';
import { Users, UserPlus, TrendingUp, Target, RefreshCw, ArrowRight } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

export default function CustomerAcquisition() {
  const [period, setPeriod] = useState('30d');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['customer-acquisition', period],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/admin/customer-acquisition?period=${period}`);
      return res.json();
    },
  });

  const stats = data?.stats || {
    totalSignups: 0, signupGrowth: 0,
    kycCompleted: 0, kycConversion: 0,
    firstTransaction: 0, activationRate: 0,
    referralSignups: 0, referralRate: 0,
  };

  const signupTrend = data?.signupTrend || [];
  const acquisitionChannels = data?.channels || [];
  const conversionFunnel = data?.funnel || [];
  const geoDistribution = data?.geoDistribution || [];

  const COLORS = ['#8B5CF6', '#EC4899', '#3B82F6', '#10B981', '#F59E0B', '#6366F1'];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Customer Acquisition</h1>
            <p className="text-muted-foreground">Track signup funnels and conversion metrics</p>
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
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <UserPlus className="w-8 h-8 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalSignups.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Total Signups</p>
                  <p className={`text-xs ${stats.signupGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {stats.signupGrowth >= 0 ? '+' : ''}{stats.signupGrowth}% vs prev period
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.kycCompleted.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">KYC Completed</p>
                  <p className="text-xs text-muted-foreground">{stats.kycConversion}% conversion</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.firstTransaction.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">First Transaction</p>
                  <p className="text-xs text-muted-foreground">{stats.activationRate}% activation</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Target className="w-8 h-8 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.referralSignups.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Referral Signups</p>
                  <p className="text-xs text-muted-foreground">{stats.referralRate}% of total</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Signup Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={signupTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                  <Legend />
                  <Line type="monotone" dataKey="signups" stroke="#8B5CF6" name="Signups" strokeWidth={2} />
                  <Line type="monotone" dataKey="activated" stroke="#10B981" name="Activated" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Acquisition Channels</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={acquisitionChannels}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {acquisitionChannels.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Conversion Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center gap-2 py-8">
              {conversionFunnel.map((step: any, index: number) => (
                <div key={step.name} className="flex items-center">
                  <div className="text-center">
                    <div 
                      className="mx-auto rounded-lg flex items-center justify-center text-white font-bold"
                      style={{ 
                        width: Math.max(80, 160 - index * 20),
                        height: 60,
                        backgroundColor: COLORS[index % COLORS.length]
                      }}
                    >
                      {step.value.toLocaleString()}
                    </div>
                    <p className="mt-2 text-sm font-medium">{step.name}</p>
                    {step.rate && (
                      <p className="text-xs text-muted-foreground">{step.rate}%</p>
                    )}
                  </div>
                  {index < conversionFunnel.length - 1 && (
                    <ArrowRight className="w-6 h-6 text-muted-foreground mx-2" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Geographic Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={geoDistribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" className="text-xs" />
                <YAxis type="category" dataKey="country" className="text-xs" width={100} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                <Bar dataKey="users" fill="#8B5CF6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
