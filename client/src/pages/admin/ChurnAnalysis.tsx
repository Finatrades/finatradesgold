import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { UserMinus, TrendingDown, Users, AlertTriangle, RefreshCw, Clock } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

export default function ChurnAnalysis() {
  const [period, setPeriod] = useState('90d');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['churn-analysis', period],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/admin/churn-analysis?period=${period}`);
      return res.json();
    },
  });

  const stats = data?.stats || {
    churnRate: 0, churnedUsers: 0, atRiskUsers: 0, retentionRate: 0,
    avgLifetimeDays: 0, avgTransactionsBeforeChurn: 0,
  };

  const churnTrend = data?.churnTrend || [];
  const churnReasons = data?.churnReasons || [];
  const cohortRetention = data?.cohortRetention || [];
  const riskSegments = data?.riskSegments || [];

  const COLORS = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6'];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Churn Analysis</h1>
            <p className="text-muted-foreground">Understand why users leave and identify at-risk accounts</p>
          </div>
          <div className="flex gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="90d">Last 90 Days</SelectItem>
                <SelectItem value="180d">Last 180 Days</SelectItem>
                <SelectItem value="365d">Last Year</SelectItem>
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
                <TrendingDown className="w-8 h-8 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.churnRate}%</p>
                  <p className="text-sm text-muted-foreground">Churn Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <UserMinus className="w-8 h-8 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.churnedUsers.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Churned Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.atRiskUsers.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">At Risk</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.retentionRate}%</p>
                  <p className="text-sm text-muted-foreground">Retention Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Churn Rate Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={churnTrend}>
                  <defs>
                    <linearGradient id="colorChurn" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                  <Area type="monotone" dataKey="rate" stroke="#EF4444" fillOpacity={1} fill="url(#colorChurn)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Churn Reasons</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={churnReasons}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {churnReasons.map((entry: any, index: number) => (
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
            <CardTitle>Cohort Retention</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={cohortRetention}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="week" className="text-xs" label={{ value: 'Weeks Since Signup', position: 'bottom' }} />
                <YAxis className="text-xs" label={{ value: 'Retention %', angle: -90, position: 'left' }} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                <Legend />
                <Line type="monotone" dataKey="cohort1" stroke="#8B5CF6" name="Jan 2026" strokeWidth={2} />
                <Line type="monotone" dataKey="cohort2" stroke="#EC4899" name="Dec 2025" strokeWidth={2} />
                <Line type="monotone" dataKey="cohort3" stroke="#3B82F6" name="Nov 2025" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Risk Segments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {riskSegments.map((segment: any, index: number) => (
                  <div key={segment.name} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{segment.name}</span>
                      <span className={`text-lg font-bold ${
                        segment.risk === 'high' ? 'text-red-500' : 
                        segment.risk === 'medium' ? 'text-yellow-500' : 'text-green-500'
                      }`}>
                        {segment.users.toLocaleString()} users
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{segment.description}</p>
                    <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${
                          segment.risk === 'high' ? 'bg-red-500' : 
                          segment.risk === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${segment.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Key Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">Average Lifetime</span>
                  </div>
                  <p className="text-2xl font-bold">{stats.avgLifetimeDays} days</p>
                  <p className="text-sm text-muted-foreground">Before user becomes inactive</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">Transactions Before Churn</span>
                  </div>
                  <p className="text-2xl font-bold">{stats.avgTransactionsBeforeChurn}</p>
                  <p className="text-sm text-muted-foreground">Average transactions before leaving</p>
                </div>
                <div className="p-4 border border-orange-200 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                  <p className="font-medium text-orange-700 dark:text-orange-400">Recommendation</p>
                  <p className="text-sm mt-1">Users with less than 3 transactions are 4x more likely to churn. Focus on activation campaigns.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
