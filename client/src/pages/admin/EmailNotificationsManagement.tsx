import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from './AdminLayout';
import { apiFetch } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Mail, 
  Bell, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Search,
  RefreshCw,
  Filter,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface EmailNotificationSetting {
  id: string;
  notificationType: string;
  displayName: string;
  description: string | null;
  category: string;
  isEnabled: boolean;
  templateSlug: string | null;
  displayOrder: number;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

interface EmailLog {
  id: string;
  userId: string | null;
  recipientEmail: string;
  recipientName: string | null;
  notificationType: string;
  templateSlug: string | null;
  subject: string;
  status: 'Queued' | 'Sending' | 'Sent' | 'Failed' | 'Bounced';
  messageId: string | null;
  errorMessage: string | null;
  metadata: Record<string, any> | null;
  sentAt: string | null;
  createdAt: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  auth: 'Authentication',
  transactions: 'Transactions',
  kyc: 'KYC & Verification',
  bnsl: 'BNSL',
  trade_finance: 'Trade Finance',
  documents: 'Documents',
  system: 'System',
};

const STATUS_COLORS: Record<string, string> = {
  Queued: 'bg-yellow-100 text-yellow-800',
  Sending: 'bg-blue-100 text-blue-800',
  Sent: 'bg-green-100 text-green-800',
  Failed: 'bg-red-100 text-red-800',
  Bounced: 'bg-purple-100 text-purple-800',
};

export default function EmailNotificationsManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const { data: settingsData, isLoading: settingsLoading, refetch: refetchSettings } = useQuery({
    queryKey: ['email-notification-settings'],
    queryFn: async () => {
      const res = await apiFetch('/api/admin/email-notifications', {
        headers: { 'X-Admin-User-Id': user?.id || '' },
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch settings');
      return res.json();
    },
  });

  const { data: logsData, isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ['email-logs'],
    queryFn: async () => {
      const res = await apiFetch('/api/admin/email-logs', {
        headers: { 'X-Admin-User-Id': user?.id || '' },
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch logs');
      return res.json();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ type, isEnabled }: { type: string; isEnabled: boolean }) => {
      const res = await apiFetch(`/api/admin/email-notifications/${type}/toggle`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-Admin-User-Id': user?.id || '' 
        },
        credentials: 'include',
        body: JSON.stringify({ isEnabled }),
      });
      if (!res.ok) throw new Error('Failed to toggle notification');
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['email-notification-settings'] });
      toast.success(`${data.setting.displayName} ${data.setting.isEnabled ? 'enabled' : 'disabled'}`);
    },
    onError: () => {
      toast.error('Failed to update notification setting');
    },
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch('/api/admin/email-notifications/seed', {
        method: 'POST',
        headers: { 
          'X-Requested-With': 'XMLHttpRequest',
          'X-Admin-User-Id': user?.id || '' 
        },
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to seed settings');
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['email-notification-settings'] });
      toast.success(`Seeded ${data.count} notification settings`);
    },
    onError: () => {
      toast.error('Failed to seed notification settings');
    },
  });

  const settings: EmailNotificationSetting[] = settingsData?.settings || [];
  const logs: EmailLog[] = logsData?.logs || [];

  const groupedSettings = settings.reduce((acc, setting) => {
    if (!acc[setting.category]) {
      acc[setting.category] = [];
    }
    acc[setting.category].push(setting);
    return acc;
  }, {} as Record<string, EmailNotificationSetting[]>);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.recipientEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.notificationType.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    const matchesType = typeFilter === 'all' || log.notificationType === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const uniqueNotificationTypes = Array.from(new Set(logs.map(log => log.notificationType)));

  const totalSent = logs.filter(l => l.status === 'Sent').length;
  const totalFailed = logs.filter(l => l.status === 'Failed').length;
  const totalPending = logs.filter(l => l.status === 'Queued' || l.status === 'Sending').length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" data-testid="page-title">Email Notifications</h1>
            <p className="text-muted-foreground">Manage email notification settings and view sent email history</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => { refetchSettings(); refetchLogs(); }}
              data-testid="btn-refresh"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Mail className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{logs.length}</p>
                  <p className="text-sm text-muted-foreground">Total Emails</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalSent}</p>
                  <p className="text-sm text-muted-foreground">Sent</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-100 rounded-lg">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalFailed}</p>
                  <p className="text-sm text-muted-foreground">Failed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalPending}</p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="settings" className="w-full">
          <TabsList>
            <TabsTrigger value="settings" data-testid="tab-settings">
              <Bell className="w-4 h-4 mr-2" />
              Notification Settings
            </TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-history">
              <Mail className="w-4 h-4 mr-2" />
              Sent Email History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="mt-4">
            {settings.length === 0 && !settingsLoading && (
              <Card>
                <CardContent className="py-8 text-center">
                  <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">No notification settings found</p>
                  <Button onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>
                    {seedMutation.isPending ? 'Seeding...' : 'Seed Default Settings'}
                  </Button>
                </CardContent>
              </Card>
            )}

            {settingsLoading ? (
              <div className="flex justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedSettings).map(([category, categorySettings]) => (
                  <Card key={category}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Bell className="w-5 h-5" />
                        {CATEGORY_LABELS[category] || category}
                      </CardTitle>
                      <CardDescription>
                        {categorySettings.length} notification type{categorySettings.length !== 1 ? 's' : ''}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {categorySettings.map((setting) => (
                          <div 
                            key={setting.id} 
                            className="flex items-center justify-between p-4 border rounded-lg"
                            data-testid={`setting-${setting.notificationType}`}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{setting.displayName}</h4>
                                <Badge variant="outline" className="text-xs">
                                  {setting.notificationType}
                                </Badge>
                              </div>
                              {setting.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {setting.description}
                                </p>
                              )}
                            </div>
                            <Switch
                              checked={setting.isEnabled}
                              onCheckedChange={(checked) => 
                                toggleMutation.mutate({ type: setting.notificationType, isEnabled: checked })
                              }
                              disabled={toggleMutation.isPending}
                              data-testid={`toggle-${setting.notificationType}`}
                            />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle>Sent Email History</CardTitle>
                    <CardDescription>View all emails sent from the platform</CardDescription>
                  </div>
                  <div className="flex flex-col md:flex-row gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search emails..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 w-full md:w-64"
                        data-testid="input-search"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-full md:w-32" data-testid="select-status">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="Sent">Sent</SelectItem>
                        <SelectItem value="Failed">Failed</SelectItem>
                        <SelectItem value="Queued">Queued</SelectItem>
                        <SelectItem value="Bounced">Bounced</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="w-full md:w-40" data-testid="select-type">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {uniqueNotificationTypes.map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {logsLoading ? (
                  <div className="flex justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredLogs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No emails found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Recipient</TableHead>
                          <TableHead>Subject</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Sent At</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredLogs.slice(0, 100).map((log) => (
                          <TableRow key={log.id} data-testid={`log-${log.id}`}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{log.recipientEmail}</p>
                                {log.recipientName && (
                                  <p className="text-xs text-muted-foreground">{log.recipientName}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <p className="max-w-xs truncate">{log.subject}</p>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {log.notificationType}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={STATUS_COLORS[log.status]}>
                                {log.status}
                              </Badge>
                              {log.errorMessage && (
                                <p className="text-xs text-red-500 mt-1 max-w-xs truncate" title={log.errorMessage}>
                                  {log.errorMessage}
                                </p>
                              )}
                            </TableCell>
                            <TableCell>
                              {log.sentAt ? (
                                format(new Date(log.sentAt), 'MMM d, yyyy HH:mm')
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {filteredLogs.length > 100 && (
                      <p className="text-center text-sm text-muted-foreground mt-4">
                        Showing first 100 of {filteredLogs.length} emails
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
