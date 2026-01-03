import React, { useState } from 'react';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { 
  FileText, Download, RefreshCw, Plus, Eye, Send, 
  CheckCircle, Clock, Archive, Search, Calendar
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { exportToPDF } from '@/lib/exportUtils';

interface RegulatoryReport {
  id: string;
  reportType: string;
  reportPeriodStart: string;
  reportPeriodEnd: string;
  title: string;
  description: string | null;
  reportData: any;
  summary: string | null;
  status: 'draft' | 'generated' | 'reviewed' | 'submitted' | 'archived';
  generatedBy: string | null;
  generatedAt: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  submittedTo: string | null;
  submittedAt: string | null;
  fileUrl: string | null;
  createdAt: string;
}

const REPORT_TYPES = [
  { value: 'daily_summary', label: 'Daily Summary' },
  { value: 'weekly_summary', label: 'Weekly Summary' },
  { value: 'monthly_summary', label: 'Monthly Summary' },
  { value: 'aml_report', label: 'AML Report' },
  { value: 'kyc_report', label: 'KYC Report' },
  { value: 'transaction_report', label: 'Transaction Report' },
  { value: 'customer_due_diligence', label: 'Customer Due Diligence' },
  { value: 'risk_assessment', label: 'Risk Assessment' },
  { value: 'audit_report', label: 'Audit Report' },
];

export default function RegulatoryReports() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedReport, setSelectedReport] = useState<RegulatoryReport | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newReport, setNewReport] = useState({
    reportType: '',
    reportPeriodStart: '',
    reportPeriodEnd: '',
    title: '',
    description: '',
  });

  const { data, isLoading, refetch } = useQuery<{ reports: RegulatoryReport[] }>({
    queryKey: ['/api/admin/regulatory-reports', typeFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await fetch(`/api/admin/regulatory-reports?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch reports');
      return res.json();
    },
  });

  const generateMutation = useMutation({
    mutationFn: (data: typeof newReport) => apiRequest('POST', '/api/admin/regulatory-reports/generate', data),
    onSuccess: () => {
      toast.success('Report generated');
      setShowCreateDialog(false);
      setNewReport({ reportType: '', reportPeriodStart: '', reportPeriodEnd: '', title: '', description: '' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/regulatory-reports'] });
    },
    onError: () => toast.error('Failed to generate report'),
  });

  const submitMutation = useMutation({
    mutationFn: ({ id, submittedTo }: { id: string; submittedTo: string }) =>
      apiRequest('POST', `/api/admin/regulatory-reports/${id}/submit`, { submittedTo }),
    onSuccess: () => {
      toast.success('Report submitted');
      setSelectedReport(null);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/regulatory-reports'] });
    },
    onError: () => toast.error('Failed to submit report'),
  });

  const reports = data?.reports || [];

  const filteredReports = reports.filter(r =>
    r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.reportType.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Draft</Badge>;
      case 'generated':
        return <Badge className="bg-info-muted text-info-muted-foreground"><FileText className="w-3 h-3 mr-1" />Generated</Badge>;
      case 'reviewed':
        return <Badge className="bg-warning-muted text-warning-muted-foreground"><CheckCircle className="w-3 h-3 mr-1" />Reviewed</Badge>;
      case 'submitted':
        return <Badge className="bg-success-muted text-success-muted-foreground"><Send className="w-3 h-3 mr-1" />Submitted</Badge>;
      case 'archived':
        return <Badge variant="outline"><Archive className="w-3 h-3 mr-1" />Archived</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getReportTypeLabel = (type: string) => {
    return REPORT_TYPES.find(t => t.value === type)?.label || type;
  };

  const handleExport = (report: RegulatoryReport) => {
    exportToPDF(
      report.title,
      ['Period', 'Type', 'Status', 'Generated', 'Summary'],
      [[
        `${format(new Date(report.reportPeriodStart), 'PP')} - ${format(new Date(report.reportPeriodEnd), 'PP')}`,
        getReportTypeLabel(report.reportType),
        report.status,
        report.generatedAt ? format(new Date(report.generatedAt), 'PPp') : '-',
        report.summary || '-',
      ]]
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground" data-testid="text-regulatory-title">Regulatory Reports</h1>
            <p className="text-muted-foreground mt-1">Compliance documentation and regulatory submissions</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} data-testid="button-refresh">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={() => setShowCreateDialog(true)} data-testid="button-generate">
              <Plus className="w-4 h-4 mr-2" />
              Generate Report
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{reports.length}</p>
                  <p className="text-sm text-muted-foreground">Total Reports</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-warning-muted rounded-lg">
                  <Clock className="w-6 h-6 text-warning-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{reports.filter(r => r.status === 'draft' || r.status === 'generated').length}</p>
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
                  <p className="text-2xl font-bold">{reports.filter(r => r.status === 'submitted').length}</p>
                  <p className="text-sm text-muted-foreground">Submitted</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-info-muted rounded-lg">
                  <Calendar className="w-6 h-6 text-info-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {reports.filter(r => new Date(r.createdAt) > new Date(Date.now() - 30 * 86400000)).length}
                  </p>
                  <p className="text-sm text-muted-foreground">This Month</p>
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
                  placeholder="Search reports..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Report Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {REPORT_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="generated">Generated</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No reports found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Generated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">{report.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{getReportTypeLabel(report.reportType)}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(report.reportPeriodStart), 'MMM d')} - {format(new Date(report.reportPeriodEnd), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>{getStatusBadge(report.status)}</TableCell>
                      <TableCell className="text-sm">
                        {report.generatedAt ? format(new Date(report.generatedAt), 'MMM d, yyyy') : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedReport(report)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleExport(report)}>
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedReport?.title}</DialogTitle>
            </DialogHeader>
            {selectedReport && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Report Type</p>
                    <Badge variant="outline">{getReportTypeLabel(selectedReport.reportType)}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    {getStatusBadge(selectedReport.status)}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Period</p>
                    <p className="font-medium">
                      {format(new Date(selectedReport.reportPeriodStart), 'PPP')} - {format(new Date(selectedReport.reportPeriodEnd), 'PPP')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Generated</p>
                    <p className="font-medium">
                      {selectedReport.generatedAt ? format(new Date(selectedReport.generatedAt), 'PPp') : 'Not generated'}
                    </p>
                  </div>
                </div>

                {selectedReport.description && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Description</p>
                    <p className="text-sm">{selectedReport.description}</p>
                  </div>
                )}

                {selectedReport.summary && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Summary</p>
                    <p className="text-sm bg-muted p-3 rounded-lg">{selectedReport.summary}</p>
                  </div>
                )}

                {selectedReport.submittedAt && (
                  <div className="p-3 bg-success-muted rounded-lg">
                    <p className="text-sm">
                      Submitted to {selectedReport.submittedTo} on {format(new Date(selectedReport.submittedAt), 'PPp')}
                    </p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => selectedReport && handleExport(selectedReport)}>
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
              {selectedReport && (selectedReport.status === 'generated' || selectedReport.status === 'reviewed') && (
                <Button 
                  onClick={() => submitMutation.mutate({ id: selectedReport.id, submittedTo: 'DFSA' })}
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
              <DialogTitle>Generate Regulatory Report</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Report Type</Label>
                <Select value={newReport.reportType} onValueChange={(v) => setNewReport({ ...newReport, reportType: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {REPORT_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Title</Label>
                <Input
                  value={newReport.title}
                  onChange={(e) => setNewReport({ ...newReport, title: e.target.value })}
                  placeholder="Report title"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Period Start</Label>
                  <Input
                    type="date"
                    value={newReport.reportPeriodStart}
                    onChange={(e) => setNewReport({ ...newReport, reportPeriodStart: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Period End</Label>
                  <Input
                    type="date"
                    value={newReport.reportPeriodEnd}
                    onChange={(e) => setNewReport({ ...newReport, reportPeriodEnd: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Description (Optional)</Label>
                <Textarea
                  value={newReport.description}
                  onChange={(e) => setNewReport({ ...newReport, description: e.target.value })}
                  placeholder="Report description..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
              <Button 
                onClick={() => generateMutation.mutate(newReport)}
                disabled={generateMutation.isPending || !newReport.reportType || !newReport.title || !newReport.reportPeriodStart || !newReport.reportPeriodEnd}
              >
                {generateMutation.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
                Generate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
