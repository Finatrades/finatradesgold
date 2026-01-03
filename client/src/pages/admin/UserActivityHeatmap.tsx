import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Clock, Users, TrendingUp, RefreshCw, Calendar } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

export default function UserActivityHeatmap() {
  const [period, setPeriod] = useState('7d');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['user-activity-heatmap', period],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/admin/user-activity-heatmap?period=${period}`);
      return res.json();
    },
  });

  const heatmapData = data?.heatmap || [];
  const hourlyData = data?.hourly || [];
  const dailyData = data?.daily || [];
  const stats = data?.stats || {
    peakHour: 0, peakDay: '', avgActiveUsers: 0, totalSessions: 0,
  };

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getHeatColor = (value: number, max: number) => {
    if (value === 0) return 'bg-gray-100 dark:bg-gray-800';
    const intensity = value / max;
    if (intensity > 0.8) return 'bg-purple-600';
    if (intensity > 0.6) return 'bg-purple-500';
    if (intensity > 0.4) return 'bg-purple-400';
    if (intensity > 0.2) return 'bg-purple-300';
    return 'bg-purple-200';
  };

  const maxValue = Math.max(...heatmapData.map((row: any) => Math.max(...(row.values || [0]))), 1);

  const formatHour = (hour: number) => {
    if (hour === 0) return '12am';
    if (hour === 12) return '12pm';
    return hour > 12 ? `${hour - 12}pm` : `${hour}am`;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">User Activity Heatmap</h1>
            <p className="text-muted-foreground">Visualize peak usage times and patterns</p>
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
                <Clock className="w-8 h-8 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{formatHour(stats.peakHour)}</p>
                  <p className="text-sm text-muted-foreground">Peak Hour</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Calendar className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.peakDay}</p>
                  <p className="text-sm text-muted-foreground">Peak Day</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.avgActiveUsers.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Avg Active Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Activity className="w-8 h-8 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalSessions.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Total Sessions</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Weekly Activity Heatmap</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="inline-block min-w-full">
                <div className="flex">
                  <div className="w-12" />
                  {hours.map((hour) => (
                    <div 
                      key={hour} 
                      className="w-8 text-center text-xs text-muted-foreground"
                    >
                      {hour % 4 === 0 ? formatHour(hour) : ''}
                    </div>
                  ))}
                </div>
                {days.map((day, dayIndex) => (
                  <div key={day} className="flex items-center">
                    <div className="w-12 text-sm text-muted-foreground">{day}</div>
                    {hours.map((hour) => {
                      const value = heatmapData[dayIndex]?.values?.[hour] || 0;
                      return (
                        <div 
                          key={hour}
                          className={`w-8 h-6 ${getHeatColor(value, maxValue)} border border-white dark:border-gray-900 rounded-sm`}
                          title={`${day} ${formatHour(hour)}: ${value} active users`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-center gap-2 mt-4">
                <span className="text-xs text-muted-foreground">Less</span>
                <div className="flex gap-1">
                  {['bg-gray-100 dark:bg-gray-800', 'bg-purple-200', 'bg-purple-300', 'bg-purple-400', 'bg-purple-500', 'bg-purple-600'].map((color, i) => (
                    <div key={i} className={`w-4 h-4 ${color} rounded-sm`} />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">More</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Hourly Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="hour" 
                    className="text-xs" 
                    tickFormatter={formatHour}
                  />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                    labelFormatter={(hour) => formatHour(hour as number)}
                  />
                  <Bar dataKey="users" fill="#8B5CF6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Daily Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                  <Line type="monotone" dataKey="activeUsers" stroke="#8B5CF6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
