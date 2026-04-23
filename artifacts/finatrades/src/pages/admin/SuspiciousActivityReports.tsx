import React, { useState } from 'react';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { 
  AlertTriangle, FileText, Search, RefreshCw, Plus, Eye, 
  Send, Clock, CheckCircle, XCircle, User, Shield
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface SarReport {
  id: string;
  userId: string;
  reportNumber: string;
  incidentDate: string;
  incidentType: string;
  description: string;
  amountInvolved: string | null;
  status: 'draft' | 'pending_review' | 'submitted' | 'acknowledged';
  createdBy: string;
  reviewedBy: string | null;
  submittedAt: string | null;
  submittedTo: string | null;
  createdAt: string;
  user?: { firstName: string; lastName: string; email: string };
}

interface FraudAlert {
  id: string;
  userId: string;
  alertType: string;
  severity: string;
  description: string;
  riskScore: number | null;
  status: string;
  detectedAt: string;
  user?: { firstName: string; lastName: string; email: string };
}

export default function SuspiciousActivityReports() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedSar, setSelectedSar] = useState<SarReport | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newSar, setNewSar] = useState({
    userId: '',
    incidentType: '',
    incidentDate: '',
    description: '',
    amountInvolved: '',
  });

  const { data: sarData, isLoading: sarLoading, refetch: refetchSar } = useQuery<{ reports: SarReport[] }>({
    queryKey: ['/api/admin/sar-reports', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await apiRequest('GET', `/api/admin/sar-reports?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch SAR reports');
      return res.json();
    },
  });

  const { data: alertsData, isLoading: alertsLoading } = useQuery<{ alerts: FraudAlert[] }>({
    queryKey: ['/api/admin/fraud-alerts'],
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof newSar) => apiRequest('POST', '/api/admin/sar-reports', data),
    onSuccess: () => {
      toast.success('SAR report created');
      setShowCreateDialog(false);
      setNewSar({ userId: '', incidentType: '', incidentDate: '', description: '', amountInvolved: '' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sar-reports'] });
    },
    onError: () => toast.error('Failed to create SAR report'),
  });

  const submitMutation = useMutation({
    mutationFn: (id: string) => apiRequest('POST', `/api/admin/sar-reports/${id}/submit`),
    onSuccess: () => {
      toast.success('SAR report submitted to regulator');
      setSelectedSar(null);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sar-reports'] });
    },
    onError: () => toast.error('Failed to submit SAR report'),
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Draft</Badge>;
      case 'pending_review':
        return <Badge className="bg-warning-muted text-warning-muted-foreground"><RefreshCw className="w-3 h-3 mr-1" />Pending Review</Badge>;
      case 'submitted':
        return <Badge className="bg-info-muted text-info-muted-foreground"><Send className="w-3 h-3 mr-1" />Submitted</Badge>;
      case 'acknowledged':
        return <Badge className="bg-success-muted text-success-muted-foreground"><CheckCircle className="w-3 h-3 mr-1" />Acknowledged</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'low':
        return <Badge className="bg-success-muted text-success-muted-foreground">Low</Badge>;
      case 'medium':
        return <Badge className="bg-warning-muted text-warning-muted-foreground">Medium</Badge>;
      case 'high':
        return <Badge variant="destructive">High</Badge>;
      case 'critical':
        return <Badge variant="destructive" className="animate-pulse">Critical</Badge>;
      default:
        return <Badge variant="secondary">{severity}</Badge>;
    }
  };

  const filteredSars = (sarData?.reports || []).filter(sar =>
    sar.reportNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sar.incidentType.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (sar.user && `${sar.user.firstName} ${sar.user.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground" data-testid="text-sar-title">Suspicious Activity Reports</h1>
            <p className="text-muted-foreground mt-1">AML compliance and fraud detection management</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetchSar()} data-testid="button-refresh">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={() => setShowCreateDialog(true)} data-testid="button-create-sar">
              <Plus className="w-4 h-4 mr-2" />
              Create SAR
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-warning-muted rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-warning-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{alertsData?.alerts?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Active Alerts</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-info-muted rounded-lg">
                  <FileText className="w-6 h-6 text-info-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{sarData?.reports?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Total SARs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Clock className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {sarData?.reports?.filter(s => s.status === 'pending_review').length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Pending Review</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-success-muted rounded-lg">
                  <Send className="w-6 h-6 text-success-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {sarData?.reports?.filter(s => s.status === 'submitted' || s.status === 'acknowledged').length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Submitted</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="sars" className="space-y-4">
          <TabsList>
            <TabsTrigger value="sars">SAR Reports</TabsTrigger>
            <TabsTrigger value="alerts">Fraud Alerts</TabsTrigger>
          </TabsList>

          <TabsContent value="sars">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Search reports..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="pending_review">Pending Review</SelectItem>
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="acknowledged">Acknowledged</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {sarLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Report #</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Incident Type</TableHead>
                        <TableHead>Incident Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSars.map((sar) => (
                        <TableRow key={sar.id}>
                          <TableCell className="font-mono">{sar.reportNumber}</TableCell>
                          <TableCell>
                            {sar.user ? `${sar.user.firstName} ${sar.user.lastName}` : sar.userId}
                          </TableCell>
                          <TableCell>{sar.incidentType}</TableCell>
                          <TableCell>{format(new Date(sar.incidentDate), 'MMM d, yyyy')}</TableCell>
                          <TableCell>{sar.amountInvolved ? `$${parseFloat(sar.amountInvolved).toLocaleString()}` : '-'}</TableCell>
                          <TableCell>{getStatusBadge(sar.status)}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => setSelectedSar(sar)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredSars.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                            No SAR reports found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alerts">
            <Card>
              <CardHeader>
                <CardTitle>Active Fraud Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                {alertsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Alert Type</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Risk Score</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Detected</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(alertsData?.alerts || []).map((alert) => (
                        <TableRow key={alert.id}>
                          <TableCell>
                            {alert.user ? `${alert.user.firstName} ${alert.user.lastName}` : alert.userId}
                          </TableCell>
                          <TableCell>{alert.alertType.replace(/_/g, ' ')}</TableCell>
                          <TableCell>{getSeverityBadge(alert.severity)}</TableCell>
                          <TableCell>{alert.riskScore || '-'}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{alert.description}</TableCell>
                          <TableCell>{format(new Date(alert.detectedAt), 'MMM d, HH:mm')}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{alert.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!alertsData?.alerts || alertsData.alerts.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                            No fraud alerts
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={!!selectedSar} onOpenChange={() => setSelectedSar(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>SAR Report - {selectedSar?.reportNumber}</DialogTitle>
            </DialogHeader>
            {selectedSar && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">User</p>
                    <p className="font-medium">
                      {selectedSar.user ? `${selectedSar.user.firstName} ${selectedSar.user.lastName}` : selectedSar.userId}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    {getStatusBadge(selectedSar.status)}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Incident Type</p>
                    <p className="font-medium">{selectedSar.incidentType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Incident Date</p>
                    <p className="font-medium">{format(new Date(selectedSar.incidentDate), 'PPP')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Amount Involved</p>
                    <p className="font-medium">
                      {selectedSar.amountInvolved ? `$${parseFloat(selectedSar.amountInvolved).toLocaleString()}` : 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Created</p>
                    <p className="font-medium">{format(new Date(selectedSar.createdAt), 'PPP')}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Description</p>
                  <p className="text-sm bg-muted p-3 rounded-lg">{selectedSar.description}</p>
                </div>
                {selectedSar.submittedAt && (
                  <div className="p-3 bg-success-muted rounded-lg">
                    <p className="text-sm">
                      Submitted to {selectedSar.submittedTo} on {format(new Date(selectedSar.submittedAt), 'PPP')}
                    </p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              {selectedSar && (selectedSar.status === 'draft' || selectedSar.status === 'pending_review') && (
                <Button 
                  onClick={() => submitMutation.mutate(selectedSar.id)}
                  disabled={submitMutation.isPending}
                >
                  {submitMutation.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                  Submit to Regulator
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create SAR Report</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">User ID</label>
                <Input
                  value={newSar.userId}
                  onChange={(e) => setNewSar({ ...newSar, userId: e.target.value })}
                  placeholder="User ID"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Incident Type</label>
                <Select value={newSar.incidentType} onValueChange={(v) => setNewSar({ ...newSar, incidentType: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="money_laundering">Money Laundering</SelectItem>
                    <SelectItem value="fraud">Fraud</SelectItem>
                    <SelectItem value="terrorist_financing">Terrorist Financing</SelectItem>
                    <SelectItem value="structuring">Structuring</SelectItem>
                    <SelectItem value="identity_theft">Identity Theft</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Incident Date</label>
                <Input
                  type="date"
                  value={newSar.incidentDate}
                  onChange={(e) => setNewSar({ ...newSar, incidentDate: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Amount Involved (USD)</label>
                <Input
                  type="number"
                  value={newSar.amountInvolved}
                  onChange={(e) => setNewSar({ ...newSar, amountInvolved: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={newSar.description}
                  onChange={(e) => setNewSar({ ...newSar, description: e.target.value })}
                  placeholder="Describe the suspicious activity..."
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
              <Button 
                onClick={() => createMutation.mutate(newSar)}
                disabled={createMutation.isPending || !newSar.userId || !newSar.incidentType || !newSar.description}
              >
                {createMutation.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
                Create Report
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
