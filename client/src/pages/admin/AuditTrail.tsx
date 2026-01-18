import React, { useState } from 'react';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Search, RefreshCw, Eye, Download, FileText, Filter, Calendar, User, Activity } from 'lucide-react';
import { exportToCSV, exportToPDF } from '@/lib/exportUtils';
import { apiRequest } from '@/lib/queryClient';

interface AuditLogEntry {
  id: string;
  entityType: string;
  entityId: string | null;
  actor: string;
  actorRole: string;
  actionType: string;
  details: string | null;
  oldValue: string | null;
  newValue: string | null;
  timestamp: string;
}

interface UserInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export default function AuditTrail() {
  const [searchQuery, setSearchQuery] = useState('');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  const { data: usersData } = useQuery<{ users: UserInfo[] }>({
    queryKey: ['/api/admin/users'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    },
  });

  const usersMap = React.useMemo(() => {
    const map: Record<string, UserInfo> = {};
    (usersData?.users || []).forEach(user => {
      map[user.id] = user;
    });
    return map;
  }, [usersData]);

  const getActorName = (actorId: string) => {
    const user = usersMap[actorId];
    if (user) {
      return `${user.firstName} ${user.lastName}`.trim() || user.email;
    }
    return actorId;
  };

  const { data, isLoading, refetch } = useQuery<{ logs: AuditLogEntry[] }>({
    queryKey: ['/api/admin/audit-logs', entityFilter, actionFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (entityFilter !== 'all') params.set('entityType', entityFilter);
      if (actionFilter !== 'all') params.set('actionType', actionFilter);
      const res = await apiRequest('GET', `/api/admin/audit-logs?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch audit logs');
      return res.json();
    },
  });

  const logs = data?.logs || [];

  const filteredLogs = logs.filter(log => {
    const actorName = getActorName(log.actor).toLowerCase();
    return (
      actorName.includes(searchQuery.toLowerCase()) ||
      log.actor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entityType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.actionType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.entityId && log.entityId.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  const entityTypes = [...new Set(logs.map(l => l.entityType))];
  const actionTypes = [...new Set(logs.map(l => l.actionType))];

  const getActionBadge = (action: string) => {
    if (action.includes('create') || action.includes('add')) {
      return <Badge className="bg-success-muted text-success-muted-foreground">{action}</Badge>;
    }
    if (action.includes('delete') || action.includes('remove')) {
      return <Badge variant="destructive">{action}</Badge>;
    }
    if (action.includes('update') || action.includes('edit')) {
      return <Badge className="bg-info-muted text-info-muted-foreground">{action}</Badge>;
    }
    if (action.includes('approve')) {
      return <Badge className="bg-success-muted text-success-muted-foreground">{action}</Badge>;
    }
    if (action.includes('reject')) {
      return <Badge variant="destructive">{action}</Badge>;
    }
    return <Badge variant="secondary">{action}</Badge>;
  };

  const handleExportCSV = () => {
    exportToCSV(filteredLogs.map(log => ({
      Timestamp: format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss'),
      Actor: getActorName(log.actor),
      Role: log.actorRole,
      Entity: log.entityType,
      EntityID: log.entityId || '-',
      Action: log.actionType,
      Details: log.details || '-',
    })), 'audit-trail');
  };

  const handleExportPDF = () => {
    exportToPDF(
      'Audit Trail Report',
      ['Timestamp', 'Actor', 'Role', 'Entity', 'Action'],
      filteredLogs.map(log => [
        format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm'),
        getActorName(log.actor),
        log.actorRole,
        log.entityType,
        log.actionType,
      ])
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground" data-testid="text-audit-title">Audit Trail</h1>
            <p className="text-muted-foreground mt-1">Complete history of all platform actions and changes</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} data-testid="button-refresh-audit">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCSV} data-testid="button-export-csv">
              <FileText className="w-4 h-4 mr-2" />
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF} data-testid="button-export-pdf">
              <Download className="w-4 h-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Activity className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{logs.length}</p>
                  <p className="text-sm text-muted-foreground">Total Actions</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-info-muted rounded-lg">
                  <User className="w-6 h-6 text-info-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{new Set(logs.map(l => l.actor)).size}</p>
                  <p className="text-sm text-muted-foreground">Active Actors</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-warning-muted rounded-lg">
                  <Filter className="w-6 h-6 text-warning-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{entityTypes.length}</p>
                  <p className="text-sm text-muted-foreground">Entity Types</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-success-muted rounded-lg">
                  <Calendar className="w-6 h-6 text-success-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {logs.filter(l => new Date(l.timestamp) > new Date(Date.now() - 86400000)).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Last 24 Hours</p>
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
                  placeholder="Search by actor, entity, action..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-audit"
                />
              </div>
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="w-[180px]" data-testid="select-entity-filter">
                  <SelectValue placeholder="Entity Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entities</SelectItem>
                  {entityTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-[180px]" data-testid="select-action-filter">
                  <SelectValue placeholder="Action Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {actionTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
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
                <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No audit logs found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.slice(0, 100).map((log) => (
                    <TableRow key={log.id} data-testid={`row-audit-${log.id}`}>
                      <TableCell className="text-sm">
                        {format(new Date(log.timestamp), 'MMM d, HH:mm:ss')}
                      </TableCell>
                      <TableCell className="font-medium">{getActorName(log.actor)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.actorRole}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{log.entityType}</span>
                          {log.entityId && (
                            <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                              {log.entityId}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getActionBadge(log.actionType)}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {log.details || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLog(log)}
                          data-testid={`button-view-audit-${log.id}`}
                        >
                          <Eye className="w-4 h-4" />
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
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Audit Log Details</DialogTitle>
            </DialogHeader>
            {selectedLog && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Timestamp</p>
                    <p className="font-medium">{format(new Date(selectedLog.timestamp), 'PPpp')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Actor</p>
                    <p className="font-medium">{getActorName(selectedLog.actor)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Role</p>
                    <Badge variant="outline">{selectedLog.actorRole}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Action</p>
                    {getActionBadge(selectedLog.actionType)}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Entity Type</p>
                    <p className="font-medium">{selectedLog.entityType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Entity ID</p>
                    <p className="font-mono text-sm">{selectedLog.entityId || '-'}</p>
                  </div>
                </div>
                {selectedLog.details && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Details</p>
                    <p className="text-sm bg-muted p-3 rounded-lg">{selectedLog.details}</p>
                  </div>
                )}
                {(selectedLog.oldValue || selectedLog.newValue) && (
                  <div className="grid grid-cols-2 gap-4">
                    {selectedLog.oldValue && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Previous Value</p>
                        <ScrollArea className="h-32 bg-error-muted p-3 rounded-lg">
                          <pre className="text-xs">{selectedLog.oldValue}</pre>
                        </ScrollArea>
                      </div>
                    )}
                    {selectedLog.newValue && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">New Value</p>
                        <ScrollArea className="h-32 bg-success-muted p-3 rounded-lg">
                          <pre className="text-xs">{selectedLog.newValue}</pre>
                        </ScrollArea>
                      </div>
                    )}
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
