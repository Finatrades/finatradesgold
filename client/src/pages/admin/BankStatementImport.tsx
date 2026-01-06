import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Upload, FileText, CheckCircle, XCircle, AlertTriangle, RefreshCw, Download, Link } from 'lucide-react';
import { toast } from 'sonner';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';

interface ImportJob {
  id: string;
  filename: string;
  bank: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalRows: number;
  matchedRows: number;
  unmatchedRows: number;
  createdAt: string;
  completedAt: string | null;
  error: string | null;
}

interface UnmatchedTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  reference: string;
  suggestedMatch: { userId: string; userName: string; depositId: string } | null;
}

export default function BankStatementImport() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [matchDialogOpen, setMatchDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<ImportJob | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['bank-imports'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/bank-imports');
      return res.json();
    },
  });

  const { data: unmatchedData } = useQuery({
    queryKey: ['unmatched-transactions', selectedJob?.id],
    queryFn: async () => {
      if (!selectedJob) return { transactions: [] };
      const res = await apiRequest('GET', `/api/admin/bank-imports/${selectedJob.id}/unmatched`);
      return res.json();
    },
    enabled: !!selectedJob && matchDialogOpen,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/admin/bank-imports/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-imports'] });
      toast.success('Statement uploaded and processing started');
      setUploading(false);
    },
    onError: () => {
      toast.error('Failed to upload statement');
      setUploading(false);
    },
  });

  const matchMutation = useMutation({
    mutationFn: async ({ transactionId, depositId }: { transactionId: string; depositId: string }) => {
      const res = await apiRequest('POST', `/api/admin/bank-imports/match`, { transactionId, depositId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unmatched-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['bank-imports'] });
      toast.success('Transaction matched');
    },
  });

  const imports: ImportJob[] = data?.imports || [];
  const stats = data?.stats || {
    totalImports: 0, totalMatched: 0, pendingMatches: 0, lastImport: null,
  };

  const unmatched: UnmatchedTransaction[] = unmatchedData?.transactions || [];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploading(true);
      uploadMutation.mutate(file);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { variant: any; icon: any }> = {
      pending: { variant: 'secondary', icon: RefreshCw },
      processing: { variant: 'default', icon: RefreshCw },
      completed: { variant: 'default', icon: CheckCircle },
      failed: { variant: 'destructive', icon: XCircle },
    };
    const config = styles[status] || styles.pending;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className={`w-3 h-3 ${status === 'processing' ? 'animate-spin' : ''}`} />
        {status}
      </Badge>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Bank Statement Import</h1>
            <p className="text-muted-foreground">Upload and match bank transactions with deposits</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" /> Refresh
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".csv,.xlsx"
              className="hidden"
            />
            <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              <Upload className="w-4 h-4 mr-2" /> 
              {uploading ? 'Uploading...' : 'Upload Statement'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalImports}</p>
                  <p className="text-sm text-muted-foreground">Total Imports</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalMatched.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Matched</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.pendingMatches}</p>
                  <p className="text-sm text-muted-foreground">Pending Matches</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Upload className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {stats.lastImport ? format(new Date(stats.lastImport), 'MMM d') : 'N/A'}
                  </p>
                  <p className="text-sm text-muted-foreground">Last Import</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Import History</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : imports.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Upload className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No imports yet. Upload your first bank statement.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-medium">File</th>
                      <th className="text-left py-3 px-2 font-medium">Bank</th>
                      <th className="text-left py-3 px-2 font-medium">Status</th>
                      <th className="text-right py-3 px-2 font-medium">Total Rows</th>
                      <th className="text-right py-3 px-2 font-medium">Matched</th>
                      <th className="text-right py-3 px-2 font-medium">Unmatched</th>
                      <th className="text-left py-3 px-2 font-medium">Date</th>
                      <th className="text-right py-3 px-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {imports.map((imp) => (
                      <tr key={imp.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{imp.filename}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2">{imp.bank}</td>
                        <td className="py-3 px-2">{getStatusBadge(imp.status)}</td>
                        <td className="py-3 px-2 text-right">{imp.totalRows}</td>
                        <td className="py-3 px-2 text-right text-green-600">{imp.matchedRows}</td>
                        <td className="py-3 px-2 text-right text-orange-600">{imp.unmatchedRows}</td>
                        <td className="py-3 px-2 text-sm text-muted-foreground">
                          {format(new Date(imp.createdAt), 'MMM d, yyyy')}
                        </td>
                        <td className="py-3 px-2 text-right">
                          {imp.unmatchedRows > 0 && imp.status === 'completed' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => { setSelectedJob(imp); setMatchDialogOpen(true); }}
                            >
                              <Link className="w-4 h-4 mr-1" /> Match
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Supported Formats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium">CSV Format</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Date, Description, Amount, Reference columns
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium">Excel (XLSX)</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Standard bank export format
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium">Auto-Detection</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Emirates NBD, ADCB, FAB formats supported
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={matchDialogOpen} onOpenChange={setMatchDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Match Unmatched Transactions</DialogTitle>
          </DialogHeader>
          {unmatched.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
              <p>All transactions have been matched!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {unmatched.map((tx) => (
                <div key={tx.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">${tx.amount.toLocaleString()}</span>
                        <Badge variant="outline">{tx.reference}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{tx.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Date: {format(new Date(tx.date), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <div className="text-right">
                      {tx.suggestedMatch ? (
                        <div>
                          <p className="text-sm text-muted-foreground">Suggested Match:</p>
                          <p className="font-medium">{tx.suggestedMatch.userName}</p>
                          <Button 
                            size="sm" 
                            className="mt-2"
                            onClick={() => matchMutation.mutate({ 
                              transactionId: tx.id, 
                              depositId: tx.suggestedMatch!.depositId 
                            })}
                          >
                            Accept Match
                          </Button>
                        </div>
                      ) : (
                        <Badge variant="secondary">No match found</Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
