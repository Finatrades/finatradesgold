import React, { useState, useEffect } from 'react';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Search, RefreshCw, FileText, Filter, User, Calendar, Activity, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  performedBy?: string;
  previousData?: Record<string, any>;
  newData?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<Record<string, User>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/audit-logs');
      const data = await response.json();
      setLogs(data.logs || []);
      
      const usersResponse = await fetch('/api/admin/users');
      const usersData = await usersResponse.json();
      const usersMap: Record<string, User> = {};
      (usersData.users || []).forEach((user: User) => {
        usersMap[user.id] = user;
      });
      setUsers(usersMap);
    } catch (error) {
      toast.error("Failed to load audit logs");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchLogs, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleViewDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setIsDetailModalOpen(true);
  };

  const getActionBadge = (action: string) => {
    const styles: Record<string, string> = {
      'create': 'bg-green-100 text-green-800',
      'update': 'bg-blue-100 text-blue-800',
      'delete': 'bg-red-100 text-red-800',
      'approve': 'bg-emerald-100 text-emerald-800',
      'reject': 'bg-orange-100 text-orange-800',
      'login': 'bg-purple-100 text-purple-800',
      'logout': 'bg-gray-100 text-gray-800',
    };
    const actionKey = action.toLowerCase().split('_')[0];
    return <Badge className={styles[actionKey] || 'bg-gray-100'}>{action}</Badge>;
  };

  const getEntityIcon = (entityType: string) => {
    const icons: Record<string, React.ReactNode> = {
      'user': <User className="h-4 w-4" />,
      'transaction': <Activity className="h-4 w-4" />,
      'kyc': <FileText className="h-4 w-4" />,
    };
    return icons[entityType.toLowerCase()] || <FileText className="h-4 w-4" />;
  };

  const uniqueEntityTypes = Array.from(new Set(logs.map(log => log.entityType)));
  const uniqueActions = Array.from(new Set(logs.map(log => log.action)));

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.entityId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entityType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.performedBy && users[log.performedBy]?.email.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesEntity = entityFilter === 'all' || log.entityType === entityFilter;
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    
    return matchesSearch && matchesEntity && matchesAction;
  });

  const stats = {
    total: logs.length,
    today: logs.filter(l => {
      const date = new Date(l.createdAt);
      const today = new Date();
      return date.toDateString() === today.toDateString();
    }).length,
    uniqueUsers: new Set(logs.map(l => l.performedBy).filter(Boolean)).size,
    entityTypes: uniqueEntityTypes.length,
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white" data-testid="page-title">
              Audit Logs
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Track all system activities and changes
            </p>
          </div>
          <Button onClick={fetchLogs} variant="outline" data-testid="btn-refresh">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card data-testid="stat-total">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-orange-100 dark:bg-orange-900/30">
                  <FileText className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Logs</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card data-testid="stat-today">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Today</p>
                  <p className="text-2xl font-bold">{stats.today}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card data-testid="stat-users">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                  <User className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Unique Users</p>
                  <p className="text-2xl font-bold">{stats.uniqueUsers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card data-testid="stat-entities">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/30">
                  <Activity className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Entity Types</p>
                  <p className="text-2xl font-bold">{stats.entityTypes}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4 justify-between">
              <CardTitle>Activity Log</CardTitle>
              <div className="flex flex-wrap gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search logs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-64"
                    data-testid="input-search"
                  />
                </div>
                <Select value={entityFilter} onValueChange={setEntityFilter}>
                  <SelectTrigger className="w-40" data-testid="select-entity-filter">
                    <SelectValue placeholder="Entity Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Entities</SelectItem>
                    {uniqueEntityTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="w-40" data-testid="select-action-filter">
                    <SelectValue placeholder="Action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    {uniqueActions.map(action => (
                      <SelectItem key={action} value={action}>{action}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No audit logs found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="audit-logs-table">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Timestamp</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Entity</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Action</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Performed By</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Entity ID</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log) => {
                      const performer = log.performedBy ? users[log.performedBy] : null;
                      
                      return (
                        <tr key={log.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800" data-testid={`row-log-${log.id}`}>
                          <td className="py-3 px-4 text-sm text-gray-500">
                            {format(new Date(log.createdAt), 'MMM d, yyyy HH:mm:ss')}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {getEntityIcon(log.entityType)}
                              <span className="font-medium">{log.entityType}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {getActionBadge(log.action)}
                          </td>
                          <td className="py-3 px-4">
                            {performer ? (
                              <div>
                                <p className="font-medium text-sm">{performer.firstName} {performer.lastName}</p>
                                <p className="text-xs text-gray-500">{performer.email}</p>
                              </div>
                            ) : (
                              <span className="text-gray-400">System</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs font-mono">
                              {log.entityId.substring(0, 12)}...
                            </code>
                          </td>
                          <td className="py-3 px-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetails(log)}
                              data-testid={`btn-view-${log.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Audit Log Details</DialogTitle>
            </DialogHeader>
            {selectedLog && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Timestamp</p>
                    <p className="font-medium">{format(new Date(selectedLog.createdAt), 'MMM d, yyyy HH:mm:ss')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Action</p>
                    {getActionBadge(selectedLog.action)}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Entity Type</p>
                    <p className="font-medium">{selectedLog.entityType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Entity ID</p>
                    <code className="text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{selectedLog.entityId}</code>
                  </div>
                  {selectedLog.performedBy && users[selectedLog.performedBy] && (
                    <div>
                      <p className="text-sm text-gray-500">Performed By</p>
                      <p className="font-medium">{users[selectedLog.performedBy].firstName} {users[selectedLog.performedBy].lastName}</p>
                      <p className="text-sm text-gray-500">{users[selectedLog.performedBy].email}</p>
                    </div>
                  )}
                  {selectedLog.ipAddress && (
                    <div>
                      <p className="text-sm text-gray-500">IP Address</p>
                      <p className="font-medium">{selectedLog.ipAddress}</p>
                    </div>
                  )}
                </div>
                
                {selectedLog.previousData && Object.keys(selectedLog.previousData).length > 0 && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Previous Data</p>
                    <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded text-xs overflow-auto max-h-40">
                      {JSON.stringify(selectedLog.previousData, null, 2)}
                    </pre>
                  </div>
                )}
                
                {selectedLog.newData && Object.keys(selectedLog.newData).length > 0 && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">New Data</p>
                    <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded text-xs overflow-auto max-h-40">
                      {JSON.stringify(selectedLog.newData, null, 2)}
                    </pre>
                  </div>
                )}
                
                {selectedLog.userAgent && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">User Agent</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 break-all">{selectedLog.userAgent}</p>
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
