import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Database, Clock, AlertTriangle, Search, RefreshCw, Zap, Activity } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { formatDistanceToNow } from 'date-fns';

interface SlowQuery {
  id: string;
  query: string;
  duration: number;
  rows: number;
  table: string;
  operation: string;
  timestamp: string;
  caller: string;
}

interface DBStats {
  totalQueries: number;
  avgDuration: number;
  slowQueries: number;
  activeConnections: number;
  maxConnections: number;
  cacheHitRatio: number;
}

export default function DBQueryMonitor() {
  const [search, setSearch] = useState('');
  const [threshold, setThreshold] = useState('100');
  const [selectedQuery, setSelectedQuery] = useState<SlowQuery | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['db-queries', threshold],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/admin/db/queries?threshold=${threshold}`);
      return res.json();
    },
    refetchInterval: 30000,
  });

  const stats: DBStats = data?.stats || {
    totalQueries: 0, avgDuration: 0, slowQueries: 0,
    activeConnections: 0, maxConnections: 0, cacheHitRatio: 0,
  };
  const queries: SlowQuery[] = data?.queries || [];
  
  const filtered = queries.filter(q => 
    !search || 
    q.query.toLowerCase().includes(search.toLowerCase()) ||
    q.table.toLowerCase().includes(search.toLowerCase())
  );

  const getDurationColor = (duration: number) => {
    if (duration > 1000) return 'text-red-600';
    if (duration > 500) return 'text-orange-600';
    if (duration > 100) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getOperationBadge = (operation: string) => {
    const colors: Record<string, string> = {
      SELECT: 'bg-blue-100 text-blue-700',
      INSERT: 'bg-green-100 text-green-700',
      UPDATE: 'bg-yellow-100 text-yellow-700',
      DELETE: 'bg-red-100 text-red-700',
    };
    return <Badge className={colors[operation] || 'bg-gray-100 text-gray-700'}>{operation}</Badge>;
  };

  const connectionPercent = stats.maxConnections > 0 
    ? (stats.activeConnections / stats.maxConnections) * 100 
    : 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Database Query Monitor</h1>
            <p className="text-muted-foreground">Detect slow queries and optimize performance</p>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Database className="w-8 h-8 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalQueries.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Total Queries (24h)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.avgDuration.toFixed(1)}ms</p>
                  <p className="text-sm text-muted-foreground">Avg Duration</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.slowQueries}</p>
                  <p className="text-sm text-muted-foreground">Slow Queries</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Zap className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.cacheHitRatio.toFixed(1)}%</p>
                  <p className="text-sm text-muted-foreground">Cache Hit Ratio</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Connection Pool</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Active: {stats.activeConnections}</span>
                <span>Max: {stats.maxConnections}</span>
              </div>
              <Progress 
                value={connectionPercent} 
                className={connectionPercent > 80 ? 'bg-red-100' : ''} 
              />
              <p className="text-sm text-muted-foreground text-center">
                {connectionPercent.toFixed(0)}% connection pool usage
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Slow Queries</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search queries..." 
                    className="pl-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Select value={threshold} onValueChange={setThreshold}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50">&gt; 50ms</SelectItem>
                    <SelectItem value="100">&gt; 100ms</SelectItem>
                    <SelectItem value="500">&gt; 500ms</SelectItem>
                    <SelectItem value="1000">&gt; 1000ms</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Database className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No slow queries found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.slice(0, 50).map((query) => (
                  <div 
                    key={query.id} 
                    className="p-4 border rounded-lg cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedQuery(query)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getOperationBadge(query.operation)}
                        <code className="text-sm bg-muted px-2 py-0.5 rounded">{query.table}</code>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`font-mono font-bold ${getDurationColor(query.duration)}`}>
                          {query.duration.toFixed(0)}ms
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {query.rows} rows
                        </span>
                      </div>
                    </div>
                    <p className="text-sm font-mono text-muted-foreground truncate">{query.query}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>Caller: {query.caller}</span>
                      <span>{formatDistanceToNow(new Date(query.timestamp), { addSuffix: true })}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selectedQuery} onOpenChange={() => setSelectedQuery(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Query Details</DialogTitle>
          </DialogHeader>
          {selectedQuery && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Duration</label>
                  <p className={`text-lg font-bold ${getDurationColor(selectedQuery.duration)}`}>
                    {selectedQuery.duration.toFixed(2)}ms
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Rows Affected</label>
                  <p className="text-lg font-bold">{selectedQuery.rows}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Full Query</label>
                <pre className="mt-1 p-3 bg-muted rounded-lg text-xs overflow-x-auto whitespace-pre-wrap">
                  {selectedQuery.query}
                </pre>
              </div>
              <div className="p-3 border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                <p className="font-medium text-yellow-700 dark:text-yellow-400">Optimization Tips</p>
                <ul className="text-sm mt-2 space-y-1">
                  <li>• Consider adding an index on frequently queried columns</li>
                  <li>• Use EXPLAIN ANALYZE to identify bottlenecks</li>
                  <li>• Limit result sets with pagination</li>
                  <li>• Cache frequently accessed data</li>
                </ul>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
