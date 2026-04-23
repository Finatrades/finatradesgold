import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Mail, 
  Bell, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Search,
  RefreshCw,
  Filter,
  AlertCircle,
  FileText,
  Eye,
  Edit,
  Save,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { apiRequest } from '@/lib/queryClient';

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

interface EmailTemplate {
  id: string;
  slug: string;
  name: string;
  type: string;
  module: string | null;
  subject: string | null;
  body: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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
  const [templateSearch, setTemplateSearch] = useState('');

  // Template editing state
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);

  const { data: settingsData, isLoading: settingsLoading, refetch: refetchSettings } = useQuery({
    queryKey: ['email-notification-settings'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/email-notifications');
      if (!res.ok) throw new Error('Failed to fetch settings');
      return res.json();
    },
  });

  const { data: logsData, isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ['email-logs'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/email-logs');
      if (!res.ok) throw new Error('Failed to fetch logs');
      return res.json();
    },
  });

  const { data: templatesData, isLoading: templatesLoading, refetch: refetchTemplates } = useQuery({
    queryKey: ['email-templates'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/email-templates');
      if (!res.ok) throw new Error('Failed to fetch templates');
      return res.json();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ type, isEnabled }: { type: string; isEnabled: boolean }) => {
      const res = await apiRequest('PATCH', `/api/admin/email-notifications/${type}/toggle`, { isEnabled });
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
      const res = await apiRequest('POST', '/api/admin/email-notifications/seed');
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

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, subject, body }: { id: string; subject: string; body: string }) => {
      const res = await apiRequest('PATCH', `/api/admin/email-templates/${id}`, { subject, body });
      if (!res.ok) throw new Error('Failed to update template');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast.success('Template updated successfully');
      setEditingTemplate(null);
    },
    onError: () => {
      toast.error('Failed to update template');
    },
  });

  const settings: EmailNotificationSetting[] = settingsData?.settings || [];
  const logs: EmailLog[] = logsData?.logs || [];
  const templates: EmailTemplate[] = templatesData?.templates || [];

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

  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
    t.slug.toLowerCase().includes(templateSearch.toLowerCase()) ||
    (t.subject || '').toLowerCase().includes(templateSearch.toLowerCase())
  );

  const uniqueNotificationTypes = Array.from(new Set(logs.map(log => log.notificationType)));

  const totalSent = logs.filter(l => l.status === 'Sent').length;
  const totalFailed = logs.filter(l => l.status === 'Failed').length;
  const totalPending = logs.filter(l => l.status === 'Queued' || l.status === 'Sending').length;

  function openEdit(template: EmailTemplate) {
    setEditingTemplate(template);
    setEditSubject(template.subject || '');
    setEditBody(template.body || '');
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" data-testid="page-title">Email Notifications</h1>
            <p className="text-muted-foreground">Manage email notification settings, templates, and sent email history</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => { refetchSettings(); refetchLogs(); refetchTemplates(); }}
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
            <TabsTrigger value="templates" data-testid="tab-templates">
              <FileText className="w-4 h-4 mr-2" />
              Email Templates
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

          <TabsContent value="templates" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle>Email Templates</CardTitle>
                    <CardDescription>
                      View and edit the subject lines and HTML body of platform email templates.
                      Use <code className="text-xs bg-muted px-1 rounded">{"{{variable}}"}</code> syntax for dynamic content.
                    </CardDescription>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search templates..."
                      value={templateSearch}
                      onChange={(e) => setTemplateSearch(e.target.value)}
                      className="pl-9 w-full md:w-64"
                      data-testid="input-template-search"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {templatesLoading ? (
                  <div className="flex justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredTemplates.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No templates found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Template Name</TableHead>
                          <TableHead>Slug</TableHead>
                          <TableHead>Subject</TableHead>
                          <TableHead>Module</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTemplates.map((template) => (
                          <TableRow key={template.id} data-testid={`template-${template.slug}`}>
                            <TableCell>
                              <p className="font-medium">{template.name}</p>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs font-mono">
                                {template.slug}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <p className="max-w-xs truncate text-sm text-muted-foreground">
                                {template.subject || <span className="italic">No subject</span>}
                              </p>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-xs capitalize">
                                {template.module || 'general'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={template.isActive ? 'bg-green-100 text-green-800' : 'bg-muted text-foreground'}>
                                {template.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setPreviewTemplate(template)}
                                  title="Preview template"
                                  data-testid={`btn-preview-${template.slug}`}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openEdit(template)}
                                  title="Edit template"
                                  data-testid={`btn-edit-${template.slug}`}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
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

      {/* Template Edit Dialog */}
      <Dialog open={!!editingTemplate} onOpenChange={(open) => !open && setEditingTemplate(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Email Template</DialogTitle>
            <DialogDescription>
              Update the subject line and HTML body of <strong>{editingTemplate?.name}</strong>.
              Use <code className="bg-muted px-1 rounded text-xs">{"{{variable_name}}"}</code> for dynamic content.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template-slug">Template Slug (read-only)</Label>
              <Input id="template-slug" value={editingTemplate?.slug || ''} disabled className="font-mono text-xs" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-subject">Subject Line</Label>
              <Input
                id="template-subject"
                value={editSubject}
                onChange={(e) => setEditSubject(e.target.value)}
                placeholder="Email subject..."
                data-testid="input-template-subject"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-body">HTML Body</Label>
              <Textarea
                id="template-body"
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                placeholder="HTML email body..."
                rows={20}
                className="font-mono text-xs"
                data-testid="textarea-template-body"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditingTemplate(null)} data-testid="btn-cancel-edit">
              <X className="w-4 h-4 mr-1" />
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editingTemplate) {
                  updateTemplateMutation.mutate({ id: editingTemplate.id, subject: editSubject, body: editBody });
                }
              }}
              disabled={updateTemplateMutation.isPending}
              data-testid="btn-save-template"
            >
              <Save className="w-4 h-4 mr-1" />
              {updateTemplateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={(open) => !open && setPreviewTemplate(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview: {previewTemplate?.name}</DialogTitle>
            <DialogDescription>
              Subject: <strong>{previewTemplate?.subject || '(no subject)'}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="border rounded-lg overflow-hidden">
            {previewTemplate?.body ? (
              <iframe
                srcDoc={previewTemplate.body}
                title="Template Preview"
                className="w-full min-h-96 border-0"
                sandbox="allow-same-origin"
                data-testid="iframe-template-preview"
              />
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No body content available for this template</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPreviewTemplate(null); openEdit(previewTemplate!); }}>
              <Edit className="w-4 h-4 mr-1" />
              Edit Template
            </Button>
            <Button onClick={() => setPreviewTemplate(null)} data-testid="btn-close-preview">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
