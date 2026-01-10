import React, { useState } from 'react';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { 
  Search, RefreshCw, Terminal, AlertCircle, Info, AlertTriangle, 
  Bug, Server, Activity, Clock
} from 'lucide-react';

interface SystemLog {
  id: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  source: string;
  requestId: string | null;
  route: string | null;
  action: string | null;
  message: string;
  details: string | null;
  errorStack: string | null;
  durationMs: number | null;
  userId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export default function ApiLogs() {
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<SystemLog | null>(null);

  const { data, isLoading, refetch, isRefetching } = useQuery<{ logs: SystemLog[] }>({
    queryKey: ['/api/admin/system-logs', levelFilter, sourceFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (levelFilter !== 'all') params.set('level', levelFilter);
      if (sourceFilter !== 'all') params.set('source', sourceFilter);
      const res = await fetch(`/api/admin/system-logs?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch system logs');
      return res.json();
    },
    refetchInterval: 30000,
  });

  const logs = data?.logs || [];

  const filteredLogs = logs.filter(log =>
    log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (log.route && log.route.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (log.requestId && log.requestId.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const sources = Array.from(new Set(logs.map(l => l.source)));

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'info':
        return <Badge className="bg-info-muted text-info-muted-foreground"><Info className="w-3 h-3 mr-1" />Info</Badge>;
      case 'warn':
        return <Badge className="bg-warning-muted text-warning-muted-foreground"><AlertTriangle className="w-3 h-3 mr-1" />Warn</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Error</Badge>;
      case 'debug':
        return <Badge variant="secondary"><Bug className="w-3 h-3 mr-1" />Debug</Badge>;
      default:
        return <Badge variant="secondary">{level}</Badge>;
    }
  };

  const stats = {
    total: logs.length,
    errors: logs.filter(l => l.level === 'error').length,
    warnings: logs.filter(l => l.level === 'warn').length,
    avgDuration: logs.filter(l => l.durationMs).reduce((acc, l) => acc + (l.durationMs || 0), 0) / (logs.filter(l => l.durationMs).length || 1),
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground" data-testid="text-logs-title">API & Error Logs</h1>
            <p className="text-muted-foreground mt-1">System logs, API requests, and error tracking</p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()} 
            disabled={isRefetching}
            data-testid="button-refresh"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
            {isRefetching ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Terminal className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total Logs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-destructive/10 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-destructive">{stats.errors}</p>
                  <p className="text-sm text-muted-foreground">Errors</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-warning-muted rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-warning-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.warnings}</p>
                  <p className="text-sm text-muted-foreground">Warnings</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-info-muted rounded-lg">
                  <Clock className="w-6 h-6 text-info-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.avgDuration.toFixed(0)}ms</p>
                  <p className="text-sm text-muted-foreground">Avg Duration</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-logs"
                />
              </div>
              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger className="w-[150px]" data-testid="select-level">
                  <SelectValue placeholder="Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warn">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="debug">Debug</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-[150px]" data-testid="select-source">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  {sources.map(source => (
                    <SelectItem key={source} value={source}>{source}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Terminal className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No logs found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.slice(0, 100).map((log) => (
                    <TableRow 
                      key={log.id} 
                      className={`cursor-pointer ${log.level === 'error' ? 'bg-error-muted/50' : ''}`}
                      onClick={() => setSelectedLog(log)}
                    >
                      <TableCell className="text-sm font-mono">
                        {format(new Date(log.createdAt), 'HH:mm:ss.SSS')}
                      </TableCell>
                      <TableCell>{getLevelBadge(log.level)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.source}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm max-w-[150px] truncate">
                        {log.route || '-'}
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate">
                        {log.message}
                      </TableCell>
                      <TableCell>
                        {log.durationMs ? `${log.durationMs}ms` : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          <Terminal className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {filteredLogs.length > 100 && (
              <p className="text-center text-sm text-muted-foreground mt-4">
                Showing first 100 of {filteredLogs.length} results
              </p>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedLog && getLevelBadge(selectedLog.level)}
                Log Details
              </DialogTitle>
            </DialogHeader>
            {selectedLog && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Timestamp</p>
                    <p className="font-mono">{format(new Date(selectedLog.createdAt), 'PPpp')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Source</p>
                    <Badge variant="outline">{selectedLog.source}</Badge>
                  </div>
                  {selectedLog.route && (
                    <div>
                      <p className="text-sm text-muted-foreground">Route</p>
                      <p className="font-mono text-sm">{selectedLog.route}</p>
                    </div>
                  )}
                  {selectedLog.action && (
                    <div>
                      <p className="text-sm text-muted-foreground">Action</p>
                      <p>{selectedLog.action}</p>
                    </div>
                  )}
                  {selectedLog.durationMs && (
                    <div>
                      <p className="text-sm text-muted-foreground">Duration</p>
                      <p>{selectedLog.durationMs}ms</p>
                    </div>
                  )}
                  {selectedLog.requestId && (
                    <div>
                      <p className="text-sm text-muted-foreground">Request ID</p>
                      <p className="font-mono text-sm">{selectedLog.requestId}</p>
                    </div>
                  )}
                  {selectedLog.userId && (
                    <div>
                      <p className="text-sm text-muted-foreground">User ID</p>
                      <p className="font-mono text-sm">{selectedLog.userId}</p>
                    </div>
                  )}
                  {selectedLog.ipAddress && (
                    <div>
                      <p className="text-sm text-muted-foreground">IP Address</p>
                      <p className="font-mono text-sm">{selectedLog.ipAddress}</p>
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Message</p>
                  <p className="bg-muted p-3 rounded-lg">{selectedLog.message}</p>
                </div>

                {selectedLog.details && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Details</p>
                    <ScrollArea className="h-32 bg-muted p-3 rounded-lg">
                      <pre className="text-xs">{selectedLog.details}</pre>
                    </ScrollArea>
                  </div>
                )}

                {selectedLog.errorStack && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Stack Trace</p>
                    <ScrollArea className="h-48 bg-error-muted p-3 rounded-lg">
                      <pre className="text-xs text-destructive">{selectedLog.errorStack}</pre>
                    </ScrollArea>
                  </div>
                )}

                {selectedLog.userAgent && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">User Agent</p>
                    <p className="text-xs bg-muted p-2 rounded">{selectedLog.userAgent}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
