import React, { useState } from 'react';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { 
  Scale, CheckCircle, AlertTriangle, XCircle, RefreshCw, 
  Download, Eye, Play, TrendingUp, TrendingDown, Coins
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface ReconciliationReport {
  id: string;
  reportDate: string;
  totalGoldGrams: string;
  totalUsdValue: string;
  transactionCount: number;
  depositCount: number;
  withdrawalCount: number;
  goldInflow: string;
  goldOutflow: string;
  netGoldChange: string;
  discrepancies: any[] | null;
  status: 'balanced' | 'discrepancy_found' | 'pending_review' | 'resolved';
  generatedBy: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

interface ReconciliationSummary {
  totalGoldInSystem: number;
  totalGoldInWallets: number;
  totalGoldInVault: number;
  totalGoldInBnsl: number;
  totalGoldInTrades: number;
  difference: number;
  lastReconciliation: string | null;
  pendingReviews: number;
}

export default function DailyReconciliation() {
  const queryClient = useQueryClient();
  const [selectedReport, setSelectedReport] = useState<ReconciliationReport | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  const { data: summary, isLoading: summaryLoading } = useQuery<ReconciliationSummary>({
    queryKey: ['/api/admin/reconciliation/summary'],
  });

  const { data: reports, isLoading: reportsLoading, refetch } = useQuery<{ reports: ReconciliationReport[] }>({
    queryKey: ['/api/admin/reconciliation/reports'],
  });

  const generateMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/admin/reconciliation/generate'),
    onSuccess: () => {
      toast.success('Reconciliation report generated');
      queryClient.invalidateQueries({ queryKey: ['/api/admin/reconciliation'] });
      refetch();
    },
    onError: () => toast.error('Failed to generate report'),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, action, notes }: { id: string; action: 'approve' | 'resolve'; notes: string }) =>
      apiRequest('POST', `/api/admin/reconciliation/${id}/review`, { action, notes }),
    onSuccess: () => {
      toast.success('Report reviewed');
      setSelectedReport(null);
      setReviewNotes('');
      queryClient.invalidateQueries({ queryKey: ['/api/admin/reconciliation'] });
    },
    onError: () => toast.error('Failed to review report'),
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'balanced':
        return <Badge className="bg-success-muted text-success-muted-foreground"><CheckCircle className="w-3 h-3 mr-1" />Balanced</Badge>;
      case 'discrepancy_found':
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Discrepancy</Badge>;
      case 'pending_review':
        return <Badge className="bg-warning-muted text-warning-muted-foreground"><RefreshCw className="w-3 h-3 mr-1" />Pending Review</Badge>;
      case 'resolved':
        return <Badge className="bg-info-muted text-info-muted-foreground"><CheckCircle className="w-3 h-3 mr-1" />Resolved</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatGold = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return `${num.toFixed(4)}g`;
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground" data-testid="text-reconciliation-title">Daily Reconciliation</h1>
            <p className="text-muted-foreground mt-1">Gold vs digital balance matching and verification</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} data-testid="button-refresh">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button 
              onClick={() => generateMutation.mutate()} 
              disabled={generateMutation.isPending}
              data-testid="button-generate-report"
            >
              {generateMutation.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
              Generate Report
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Gold in System</p>
                  <p className="text-2xl font-bold mt-1">
                    {summaryLoading ? '...' : formatGold(summary?.totalGoldInSystem || 0)}
                  </p>
                </div>
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Coins className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Wallets Balance</p>
                  <p className="text-2xl font-bold mt-1">
                    {summaryLoading ? '...' : formatGold(summary?.totalGoldInWallets || 0)}
                  </p>
                </div>
                <div className="p-3 bg-info-muted rounded-lg">
                  <Scale className="w-6 h-6 text-info-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Vault Holdings</p>
                  <p className="text-2xl font-bold mt-1">
                    {summaryLoading ? '...' : formatGold(summary?.totalGoldInVault || 0)}
                  </p>
                </div>
                <div className="p-3 bg-success-muted rounded-lg">
                  <TrendingUp className="w-6 h-6 text-success-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={summary?.difference !== 0 ? 'border-destructive' : ''}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Discrepancy</p>
                  <p className={`text-2xl font-bold mt-1 ${summary?.difference !== 0 ? 'text-destructive' : 'text-green-600'}`}>
                    {summaryLoading ? '...' : formatGold(summary?.difference || 0)}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${summary?.difference !== 0 ? 'bg-destructive/10' : 'bg-success-muted'}`}>
                  {summary?.difference !== 0 ? (
                    <AlertTriangle className="w-6 h-6 text-destructive" />
                  ) : (
                    <CheckCircle className="w-6 h-6 text-success-muted-foreground" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Gold Reconciliation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Physical Gold (Asset)</div>
                <div className="flex items-center justify-between bg-green-50 p-2 rounded">
                  <span className="text-sm font-medium text-green-700">Vault Storage</span>
                  <span className="font-mono font-bold text-green-700">{formatGold(summary?.totalGoldInVault || 0)}</span>
                </div>
                <hr />
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Digital Claims (Liabilities)</div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">User Wallets (LGPW+FPGW)</span>
                  <span className="font-mono">{formatGold(summary?.totalGoldInWallets || 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">BNSL Locked</span>
                  <span className="font-mono">{formatGold(summary?.totalGoldInBnsl || 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Trade Finance</span>
                  <span className="font-mono">{formatGold(summary?.totalGoldInTrades || 0)}</span>
                </div>
                <div className="flex items-center justify-between bg-blue-50 p-2 rounded">
                  <span className="text-sm font-medium text-blue-700">Total Claims</span>
                  <span className="font-mono font-bold text-blue-700">{formatGold((summary?.totalGoldInWallets || 0) + (summary?.totalGoldInBnsl || 0) + (summary?.totalGoldInTrades || 0))}</span>
                </div>
                <hr />
                <div className={`flex items-center justify-between p-2 rounded ${(summary?.difference || 0) === 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                  <span className={`text-sm font-bold ${(summary?.difference || 0) === 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {(summary?.difference || 0) >= 0 ? 'Surplus' : 'Shortfall'}
                  </span>
                  <span className={`font-mono font-bold ${(summary?.difference || 0) === 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {formatGold(summary?.difference || 0)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Recent Reports</CardTitle>
            </CardHeader>
            <CardContent>
              {reportsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Total Gold</TableHead>
                      <TableHead>Transactions</TableHead>
                      <TableHead>Net Change</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(reports?.reports || []).slice(0, 10).map((report) => (
                      <TableRow key={report.id}>
                        <TableCell>{format(new Date(report.reportDate), 'MMM d, yyyy')}</TableCell>
                        <TableCell className="font-mono">{formatGold(report.totalGoldGrams)}</TableCell>
                        <TableCell>{report.transactionCount}</TableCell>
                        <TableCell className={parseFloat(report.netGoldChange) >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {parseFloat(report.netGoldChange) >= 0 ? '+' : ''}{formatGold(report.netGoldChange)}
                        </TableCell>
                        <TableCell>{getStatusBadge(report.status)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedReport(report)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!reports?.reports || reports.reports.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No reports generated yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Reconciliation Report - {selectedReport && format(new Date(selectedReport.reportDate), 'PPP')}</DialogTitle>
            </DialogHeader>
            {selectedReport && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Total Gold</p>
                    <p className="text-xl font-bold">{formatGold(selectedReport.totalGoldGrams)}</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">USD Value</p>
                    <p className="text-xl font-bold">{formatCurrency(selectedReport.totalUsdValue)}</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Status</p>
                    <div className="mt-1">{getStatusBadge(selectedReport.status)}</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Transactions</p>
                    <p className="font-bold">{selectedReport.transactionCount}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Deposits</p>
                    <p className="font-bold text-green-600">+{selectedReport.depositCount}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Withdrawals</p>
                    <p className="font-bold text-red-600">-{selectedReport.withdrawalCount}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Gold Inflow</p>
                    <p className="font-mono text-green-600">+{formatGold(selectedReport.goldInflow)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Gold Outflow</p>
                    <p className="font-mono text-red-600">-{formatGold(selectedReport.goldOutflow)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Net Change</p>
                    <p className={`font-mono font-bold ${parseFloat(selectedReport.netGoldChange) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {parseFloat(selectedReport.netGoldChange) >= 0 ? '+' : ''}{formatGold(selectedReport.netGoldChange)}
                    </p>
                  </div>
                </div>

                {selectedReport.discrepancies && selectedReport.discrepancies.length > 0 && (
                  <div className="p-3 bg-error-muted rounded-lg">
                    <p className="text-sm font-medium text-destructive mb-2">Discrepancies Found</p>
                    <ul className="text-sm space-y-1">
                      {selectedReport.discrepancies.map((d, i) => (
                        <li key={i}>{JSON.stringify(d)}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {(selectedReport.status === 'pending_review' || selectedReport.status === 'discrepancy_found') && (
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Review notes..."
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => reviewMutation.mutate({ id: selectedReport.id, action: 'resolve', notes: reviewNotes })}
                        disabled={reviewMutation.isPending}
                      >
                        Mark Resolved
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => reviewMutation.mutate({ id: selectedReport.id, action: 'approve', notes: reviewNotes })}
                        disabled={reviewMutation.isPending}
                      >
                        Approve
                      </Button>
                    </div>
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
