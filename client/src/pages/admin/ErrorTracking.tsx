import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertTriangle, Bug, Search, RefreshCw, Clock, Users, TrendingUp, XCircle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { format, formatDistanceToNow } from 'date-fns';

interface ErrorEntry {
  id: string;
  message: string;
  stack: string;
  type: string;
  endpoint: string;
  method: string;
  statusCode: number;
  userId: string | null;
  userAgent: string;
  ipAddress: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
  resolved: boolean;
}

export default function ErrorTracking() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'resolved'>('unresolved');
  const [period, setPeriod] = useState('24h');
  const [selectedError, setSelectedError] = useState<ErrorEntry | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['error-tracking', period],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/admin/errors?period=${period}`);
      return res.json();
    },
    refetchInterval: 60000,
  });

  const errors: ErrorEntry[] = data?.errors || [];
  const filtered = errors.filter(e => {
    if (search && !e.message.toLowerCase().includes(search.toLowerCase()) && !e.endpoint.includes(search)) return false;
    if (filter === 'unresolved' && e.resolved) return false;
    if (filter === 'resolved' && !e.resolved) return false;
    return true;
  });

  const stats = {
    total: errors.length,
    unresolved: errors.filter(e => !e.resolved).length,
    totalOccurrences: errors.reduce((sum, e) => sum + e.count, 0),
    affectedUsers: new Set(errors.filter(e => e.userId).map(e => e.userId)).size,
  };

  const getSeverityColor = (count: number) => {
    if (count > 100) return 'bg-red-100 text-red-700 border-red-200';
    if (count > 50) return 'bg-orange-100 text-orange-700 border-orange-200';
    if (count > 10) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    return 'bg-blue-100 text-blue-700 border-blue-200';
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Error Tracking</h1>
            <p className="text-muted-foreground">Monitor and debug application errors</p>
          </div>
          <div className="flex gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">Last Hour</SelectItem>
                <SelectItem value="24h">Last 24h</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
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
                <Bug className="w-8 h-8 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Unique Errors</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <XCircle className="w-8 h-8 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.unresolved}</p>
                  <p className="text-sm text-muted-foreground">Unresolved</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalOccurrences.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Total Occurrences</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.affectedUsers}</p>
                  <p className="text-sm text-muted-foreground">Affected Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Error Log</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search errors..." 
                    className="pl-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="flex gap-1">
                  {(['all', 'unresolved', 'resolved'] as const).map((f) => (
                    <Button 
                      key={f}
                      variant={filter === f ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => setFilter(f)}
                    >
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading errors...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bug className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No errors found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((error) => (
                  <div 
                    key={error.id} 
                    className={`p-4 border rounded-lg cursor-pointer hover:bg-muted/50 ${getSeverityColor(error.count)}`}
                    onClick={() => setSelectedError(error)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="font-mono text-sm font-medium">{error.type}</span>
                          <Badge variant="outline">{error.method} {error.endpoint}</Badge>
                          <Badge variant={error.statusCode >= 500 ? 'destructive' : 'secondary'}>
                            {error.statusCode}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium">{error.message}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            First: {format(new Date(error.firstSeen), 'MMM d, HH:mm')}
                          </span>
                          <span>Last: {formatDistanceToNow(new Date(error.lastSeen), { addSuffix: true })}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">{error.count}</p>
                        <p className="text-xs text-muted-foreground">occurrences</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selectedError} onOpenChange={() => setSelectedError(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bug className="w-5 h-5 text-red-500" />
              Error Details
            </DialogTitle>
          </DialogHeader>
          {selectedError && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Type</label>
                  <p className="font-mono">{selectedError.type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Endpoint</label>
                  <p className="font-mono">{selectedError.method} {selectedError.endpoint}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Occurrences</label>
                  <p>{selectedError.count}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status Code</label>
                  <p>{selectedError.statusCode}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Message</label>
                <p className="font-medium">{selectedError.message}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Stack Trace</label>
                <pre className="mt-1 p-3 bg-muted rounded-lg text-xs overflow-x-auto">
                  {selectedError.stack || 'No stack trace available'}
                </pre>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">User Agent</label>
                  <p className="text-sm">{selectedError.userAgent || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">IP Address</label>
                  <p className="font-mono text-sm">{selectedError.ipAddress || 'N/A'}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
