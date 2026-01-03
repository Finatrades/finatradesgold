import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Database, Trash2, RefreshCw, Search, HardDrive, Zap, Clock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { apiRequest } from '@/lib/queryClient';

interface CacheStats {
  provider: string;
  connected: boolean;
  memoryUsed: number;
  memoryTotal: number;
  keys: number;
  hitRate: number;
  missRate: number;
  uptime: number;
}

interface CacheEntry {
  key: string;
  type: string;
  size: number;
  ttl: number;
  createdAt: string;
}

export default function CacheManagement() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [clearAllOpen, setClearAllOpen] = useState(false);
  const [clearPatternOpen, setClearPatternOpen] = useState(false);
  const [pattern, setPattern] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['cache-stats'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/cache/stats');
      return res.json();
    },
    refetchInterval: 30000,
  });

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/admin/cache/clear-all');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cache-stats'] });
      setClearAllOpen(false);
      toast.success('Cache cleared successfully');
    },
  });

  const clearPatternMutation = useMutation({
    mutationFn: async (pattern: string) => {
      const res = await apiRequest('POST', '/api/admin/cache/clear-pattern', { pattern });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cache-stats'] });
      setClearPatternOpen(false);
      setPattern('');
      toast.success(`Cleared ${data.deleted || 0} keys`);
    },
  });

  const stats: CacheStats = data?.stats || {
    provider: 'Redis',
    connected: true,
    memoryUsed: 0,
    memoryTotal: 0,
    keys: 0,
    hitRate: 0,
    missRate: 0,
    uptime: 0,
  };

  const entries: CacheEntry[] = data?.entries || [];
  const filtered = entries.filter(e => e.key.toLowerCase().includes(search.toLowerCase()));

  const memoryPercent = stats.memoryTotal > 0 ? (stats.memoryUsed / stats.memoryTotal) * 100 : 0;
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Cache Management</h1>
            <p className="text-muted-foreground">Monitor and manage Redis cache</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" /> Refresh
            </Button>
            <Button variant="outline" onClick={() => setClearPatternOpen(true)}>
              <Search className="w-4 h-4 mr-2" /> Clear by Pattern
            </Button>
            <Button variant="destructive" onClick={() => setClearAllOpen(true)}>
              <Trash2 className="w-4 h-4 mr-2" /> Clear All
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Database className={`w-8 h-8 ${stats.connected ? 'text-green-500' : 'text-red-500'}`} />
                <div>
                  <p className="text-2xl font-bold">{stats.provider}</p>
                  <p className="text-sm text-muted-foreground">
                    {stats.connected ? 'Connected' : 'Disconnected'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <HardDrive className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.keys.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Cached Keys</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Zap className="w-8 h-8 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.hitRate.toFixed(1)}%</p>
                  <p className="text-sm text-muted-foreground">Hit Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{formatUptime(stats.uptime)}</p>
                  <p className="text-sm text-muted-foreground">Uptime</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Memory Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{formatBytes(stats.memoryUsed)} used</span>
                <span>{formatBytes(stats.memoryTotal)} total</span>
              </div>
              <Progress value={memoryPercent} />
              <p className="text-sm text-muted-foreground text-center">
                {memoryPercent.toFixed(1)}% memory used
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Cache Keys</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search keys..." 
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Database className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No cache entries found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-medium">Key</th>
                      <th className="text-left py-3 px-2 font-medium">Type</th>
                      <th className="text-left py-3 px-2 font-medium">Size</th>
                      <th className="text-left py-3 px-2 font-medium">TTL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.slice(0, 50).map((entry, i) => (
                      <tr key={i} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-2">
                          <code className="text-sm bg-muted px-2 py-0.5 rounded">{entry.key}</code>
                        </td>
                        <td className="py-3 px-2">
                          <Badge variant="outline">{entry.type}</Badge>
                        </td>
                        <td className="py-3 px-2 text-sm">{formatBytes(entry.size)}</td>
                        <td className="py-3 px-2 text-sm">
                          {entry.ttl > 0 ? `${Math.round(entry.ttl / 60)}m` : 'No expiry'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filtered.length > 50 && (
                  <p className="text-center text-sm text-muted-foreground mt-4">
                    Showing 50 of {filtered.length} entries
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={clearAllOpen} onOpenChange={setClearAllOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Clear All Cache
            </DialogTitle>
            <DialogDescription>
              This will clear all cached data. Users may experience slower load times until the cache is rebuilt.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearAllOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => clearAllMutation.mutate()}>
              Clear All Cache
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={clearPatternOpen} onOpenChange={setClearPatternOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear by Pattern</DialogTitle>
            <DialogDescription>
              Enter a pattern to match cache keys. Use * as wildcard.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input 
              placeholder="e.g., user:* or session:*" 
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearPatternOpen(false)}>Cancel</Button>
            <Button onClick={() => clearPatternMutation.mutate(pattern)}>
              Clear Matching Keys
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
