import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Shield, Search, RefreshCw, AlertTriangle, Ban, Clock, Activity } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { formatDistanceToNow } from 'date-fns';

interface RateLimitEntry {
  id: string;
  identifier: string;
  type: 'ip' | 'user' | 'api_key';
  endpoint: string;
  requestCount: number;
  limit: number;
  windowStart: string;
  windowEnd: string;
  isBlocked: boolean;
  blockedUntil: string | null;
}

interface RateLimitConfig {
  endpoint: string;
  limit: number;
  windowMs: number;
  description: string;
}

export default function RateLimitMonitor() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'blocked' | 'near_limit'>('all');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['rate-limits'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/rate-limits');
      return res.json();
    },
    refetchInterval: 10000,
  });

  const entries: RateLimitEntry[] = data?.entries || [];
  const configs: RateLimitConfig[] = data?.configs || [];

  const filtered = entries.filter(e => {
    if (search && !e.identifier.includes(search) && !e.endpoint.includes(search)) return false;
    if (filter === 'blocked' && !e.isBlocked) return false;
    if (filter === 'near_limit' && (e.requestCount / e.limit) < 0.8) return false;
    return true;
  });

  const stats = {
    total: entries.length,
    blocked: entries.filter(e => e.isBlocked).length,
    nearLimit: entries.filter(e => (e.requestCount / e.limit) >= 0.8).length,
    avgUsage: entries.length > 0 
      ? Math.round(entries.reduce((sum, e) => sum + (e.requestCount / e.limit) * 100, 0) / entries.length)
      : 0,
  };

  const getUsageColor = (usage: number) => {
    if (usage >= 100) return 'bg-red-500';
    if (usage >= 80) return 'bg-yellow-500';
    if (usage >= 50) return 'bg-blue-500';
    return 'bg-green-500';
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Rate Limit Monitor</h1>
            <p className="text-muted-foreground">Monitor API rate limiting and throttled requests</p>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Activity className="w-8 h-8 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Active Limits</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Ban className="w-8 h-8 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.blocked}</p>
                  <p className="text-sm text-muted-foreground">Blocked</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.nearLimit}</p>
                  <p className="text-sm text-muted-foreground">Near Limit</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Shield className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.avgUsage}%</p>
                  <p className="text-sm text-muted-foreground">Avg Usage</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Rate Limit Configurations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {configs.length > 0 ? configs.map((config, i) => (
                <div key={i} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <code className="text-sm bg-muted px-2 py-0.5 rounded">{config.endpoint}</code>
                    <Badge variant="outline">{config.limit} req</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{config.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Window: {Math.round(config.windowMs / 60000)} minutes
                  </p>
                </div>
              )) : (
                <div className="col-span-full text-center py-4 text-muted-foreground">
                  <p>Default rate limits applied</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Current Rate Limit Status</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search by IP or endpoint..." 
                    className="pl-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="flex gap-1">
                  <Button 
                    variant={filter === 'all' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setFilter('all')}
                  >
                    All
                  </Button>
                  <Button 
                    variant={filter === 'blocked' ? 'destructive' : 'outline'} 
                    size="sm"
                    onClick={() => setFilter('blocked')}
                  >
                    Blocked
                  </Button>
                  <Button 
                    variant={filter === 'near_limit' ? 'secondary' : 'outline'} 
                    size="sm"
                    onClick={() => setFilter('near_limit')}
                  >
                    Near Limit
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No rate limit entries found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((entry) => {
                  const usage = Math.round((entry.requestCount / entry.limit) * 100);
                  return (
                    <div key={entry.id} className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <code className="text-sm bg-muted px-2 py-0.5 rounded">{entry.identifier}</code>
                          <Badge variant="outline">{entry.type}</Badge>
                          {entry.isBlocked && <Badge variant="destructive">Blocked</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">{entry.endpoint}</p>
                      </div>
                      <div className="w-48">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span>{entry.requestCount} / {entry.limit}</span>
                          <span className={usage >= 80 ? 'text-destructive font-medium' : ''}>{usage}%</span>
                        </div>
                        <Progress value={Math.min(usage, 100)} className={getUsageColor(usage)} />
                      </div>
                      {entry.isBlocked && entry.blockedUntil && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span>Unblocks {formatDistanceToNow(new Date(entry.blockedUntil), { addSuffix: true })}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
