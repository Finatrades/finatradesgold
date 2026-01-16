import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { 
  FileText, 
  Download, 
  Loader2, 
  CalendarIcon, 
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  FileSpreadsheet,
  FileType
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Report {
  id: string;
  userId: string;
  reportType: 'transaction_history' | 'tax_report' | 'portfolio_summary';
  format: 'pdf' | 'csv';
  status: 'pending' | 'generating' | 'completed' | 'failed';
  fileUrl?: string | null;
  fileSizeBytes?: number | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  completedAt?: string | null;
  errorMessage?: string | null;
}

interface ReportsResponse {
  reports: Report[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const reportTypeLabels: Record<string, string> = {
  transaction_history: 'Transaction History',
  tax_report: 'Tax Report',
  portfolio_summary: 'Portfolio Summary',
};

const statusConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  pending: { icon: <Clock className="h-4 w-4" />, color: 'bg-yellow-100 text-yellow-700 border-yellow-200', label: 'Pending' },
  generating: { icon: <Loader2 className="h-4 w-4 animate-spin" />, color: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Generating' },
  completed: { icon: <CheckCircle2 className="h-4 w-4" />, color: 'bg-green-100 text-green-700 border-green-200', label: 'Completed' },
  failed: { icon: <XCircle className="h-4 w-4" />, color: 'bg-red-100 text-red-700 border-red-200', label: 'Failed' },
};

function formatFileSize(bytes?: number | null): string {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function ReportsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [reportType, setReportType] = useState<string>('transaction_history');
  const [reportFormat, setReportFormat] = useState<string>('pdf');
  const [fromDate, setFromDate] = useState<Date>();
  const [toDate, setToDate] = useState<Date>();

  const { data, isLoading, error, refetch } = useQuery<ReportsResponse>({
    queryKey: ['/api/reports'],
    queryFn: async () => {
      const res = await fetch('/api/reports');
      if (!res.ok) throw new Error('Failed to fetch reports');
      return res.json();
    },
    refetchInterval: (query) => {
      const responseData = query.state.data as ReportsResponse | undefined;
      const hasPendingOrGenerating = responseData?.reports?.some(
        r => r.status === 'pending' || r.status === 'generating'
      );
      return hasPendingOrGenerating ? 5000 : false;
    },
  });
  const reports = data?.reports || [];

  const generateMutation = useMutation({
    mutationFn: async (data: { reportType: string; format: string; fromDate: string; toDate: string }) => {
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to generate report');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Report Requested',
        description: 'Your report is being generated. This may take a few moments.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/reports'] });
      setFromDate(undefined);
      setToDate(undefined);
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Generate Report',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleGenerateReport = () => {
    if (!fromDate || !toDate) {
      toast({
        title: 'Date Range Required',
        description: 'Please select both from and to dates.',
        variant: 'destructive',
      });
      return;
    }
    if (fromDate > toDate) {
      toast({
        title: 'Invalid Date Range',
        description: 'From date must be before to date.',
        variant: 'destructive',
      });
      return;
    }
    generateMutation.mutate({
      reportType,
      format: reportFormat,
      fromDate: format(fromDate, 'yyyy-MM-dd'),
      toDate: format(toDate, 'yyyy-MM-dd'),
    });
  };

  const handleDownload = async (reportId: string) => {
    try {
      const res = await fetch(`/api/reports/${reportId}/download`);
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const contentDisposition = res.headers.get('Content-Disposition');
      const fileName = contentDisposition?.match(/filename="(.+)"/)?.[1] || `report-${reportId}`;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: 'Download Failed',
        description: 'Unable to download the report. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 lg:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">
              Reports
            </h1>
            <p className="text-muted-foreground mt-1">
              Generate and download your account reports
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            data-testid="button-refresh-reports"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        <Card className="border-purple-100 shadow-md">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-violet-50 border-b border-purple-100">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-purple-600" />
              Generate New Report
            </CardTitle>
            <CardDescription>
              Create a new report by selecting the type, format, and date range
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label>Report Type</Label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger data-testid="select-report-type">
                    <SelectValue placeholder="Select report type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transaction_history">Transaction History</SelectItem>
                    <SelectItem value="tax_report">Tax Report</SelectItem>
                    <SelectItem value="portfolio_summary">Portfolio Summary</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Format</Label>
                <Select value={reportFormat} onValueChange={setReportFormat}>
                  <SelectTrigger data-testid="select-report-format">
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">
                      <div className="flex items-center gap-2">
                        <FileType className="h-4 w-4" />
                        PDF
                      </div>
                    </SelectItem>
                    <SelectItem value="csv">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4" />
                        CSV
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>From Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !fromDate && "text-muted-foreground"
                      )}
                      data-testid="button-from-date"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {fromDate ? format(fromDate, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={fromDate}
                      onSelect={setFromDate}
                      disabled={(date) => date > new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>To Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !toDate && "text-muted-foreground"
                      )}
                      data-testid="button-to-date"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {toDate ? format(toDate, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={toDate}
                      onSelect={setToDate}
                      disabled={(date) => date > new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <Button
              className="mt-6 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700"
              onClick={handleGenerateReport}
              disabled={generateMutation.isPending}
              data-testid="button-generate-report"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Generate Report
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-600" />
              Report History
            </CardTitle>
            <CardDescription>
              View and download your previously generated reports
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
                <p className="text-muted-foreground">Failed to load reports</p>
                <Button variant="outline" className="mt-4" onClick={() => refetch()}>
                  Try Again
                </Button>
              </div>
            ) : reports.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No reports generated yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Generate your first report using the form above
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {reports.map((report) => {
                  const config = statusConfig[report.status];
                  const isExpired = report.expiresAt && new Date(report.expiresAt) < new Date();
                  
                  return (
                    <div
                      key={report.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors gap-4"
                      data-testid={`report-item-${report.id}`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={cn(
                          "p-2 rounded-lg",
                          report.format === 'pdf' ? 'bg-red-100' : 'bg-green-100'
                        )}>
                          {report.format === 'pdf' ? (
                            <FileType className="h-5 w-5 text-red-600" />
                          ) : (
                            <FileSpreadsheet className="h-5 w-5 text-green-600" />
                          )}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">
                              {reportTypeLabels[report.reportType] || report.reportType}
                            </span>
                            <Badge variant="outline" className={config.color}>
                              <span className="flex items-center gap-1">
                                {config.icon}
                                {config.label}
                              </span>
                            </Badge>
                            {isExpired && report.status === 'completed' && (
                              <Badge variant="secondary" className="text-orange-600">
                                Expired
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground space-x-4">
                            <span>
                              {report.dateFrom && report.dateTo ? 
                                `${format(new Date(report.dateFrom), 'MMM d, yyyy')} - ${format(new Date(report.dateTo), 'MMM d, yyyy')}` : 
                                'All time'
                              }
                            </span>
                            {report.fileSizeBytes && (
                              <span>• {formatFileSize(report.fileSizeBytes)}</span>
                            )}
                            {report.expiresAt && !isExpired && (
                              <span>• Expires {format(new Date(report.expiresAt), 'MMM d, yyyy')}</span>
                            )}
                          </div>
                          {report.errorMessage && (
                            <p className="text-sm text-red-500">{report.errorMessage}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Created {format(new Date(report.createdAt), 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {report.status === 'completed' && !isExpired && (
                          <Button
                            size="sm"
                            onClick={() => handleDownload(report.id)}
                            className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700"
                            data-testid={`button-download-${report.id}`}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        )}
                        {(report.status === 'pending' || report.status === 'generating') && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Processing...
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
