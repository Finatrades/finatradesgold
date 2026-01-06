import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from './AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  ArrowRightLeft,
  Eye,
  Shield,
  Database,
  Settings,
  CreditCard,
  FileText,
  Users,
  Megaphone,
  BookOpen,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

interface SyncCategory {
  id: string;
  name: string;
  description: string;
  tables: string[];
}

interface PreviewData {
  category: string;
  tables: string[];
  preview: Record<string, { dev: number; prod: number }>;
  action: string;
}

const categoryIcons: Record<string, React.ReactNode> = {
  platform_config: <Settings className="h-6 w-6" />,
  payment_gateways: <CreditCard className="h-6 w-6" />,
  bnsl_templates: <FileText className="h-6 w-6" />,
  settings: <Shield className="h-6 w-6" />,
  roles_permissions: <Users className="h-6 w-6" />,
  announcements: <Megaphone className="h-6 w-6" />,
  knowledge_base: <BookOpen className="h-6 w-6" />,
};

export default function DevProdSync() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<SyncCategory | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  const { data: categoriesData, isLoading } = useQuery({
    queryKey: ['dev-prod-sync-categories'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/dev-prod-sync/categories');
      return res.json();
    },
  });

  const categories: SyncCategory[] = categoriesData?.categories || [];

  const previewMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      const res = await apiRequest('GET', `/api/admin/dev-prod-sync/preview/${categoryId}`);
      return res.json();
    },
    onSuccess: (data) => {
      setPreviewData(data);
      setShowPreviewDialog(true);
    },
    onError: (error: any) => {
      toast({ title: 'Preview failed', description: error.message, variant: 'destructive' });
    },
  });

  const requestOtpMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      const res = await apiRequest('POST', '/api/admin/dev-prod-sync/request-otp', { category: categoryId });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'OTP Sent', description: 'Check your email for the verification code' });
      setOtpSent(true);
    },
    onError: (error: any) => {
      toast({ title: 'Failed to send OTP', description: error.message, variant: 'destructive' });
    },
  });

  const applySyncMutation = useMutation({
    mutationFn: async ({ categoryId, otpCode }: { categoryId: string; otpCode: string }) => {
      const res = await apiRequest('POST', `/api/admin/dev-prod-sync/apply/${categoryId}`, { otpCode });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: 'Sync Complete', 
        description: `Successfully synced ${data.category} to production`,
      });
      setShowSyncDialog(false);
      setShowPreviewDialog(false);
      setOtpCode('');
      setOtpSent(false);
      setSelectedCategory(null);
      setPreviewData(null);
    },
    onError: (error: any) => {
      toast({ title: 'Sync failed', description: error.message, variant: 'destructive' });
    },
  });

  const handlePreview = (category: SyncCategory) => {
    setSelectedCategory(category);
    previewMutation.mutate(category.id);
  };

  const handleStartSync = () => {
    setShowPreviewDialog(false);
    setShowSyncDialog(true);
    setOtpSent(false);
    setOtpCode('');
  };

  const handleRequestOtp = () => {
    if (selectedCategory) {
      requestOtpMutation.mutate(selectedCategory.id);
    }
  };

  const handleApplySync = () => {
    if (selectedCategory && otpCode) {
      applySyncMutation.mutate({ categoryId: selectedCategory.id, otpCode });
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" />
              Development to Production Sync
            </CardTitle>
            <CardDescription>
              Sync admin configuration data from Development to Production database.
              Each category requires OTP verification for safety.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 p-4 bg-warning-muted rounded-lg mb-6">
              <AlertTriangle className="h-6 w-6 text-warning" />
              <div>
                <p className="font-medium text-warning">Full Replace Strategy</p>
                <p className="text-sm text-muted-foreground">
                  All production data in the selected category will be replaced with development data.
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((category) => (
                <Card key={category.id} className="hover:border-primary transition-colors">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        {categoryIcons[category.id] || <Database className="h-6 w-6" />}
                      </div>
                      <div>
                        <CardTitle className="text-base">{category.name}</CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">{category.description}</p>
                    <div className="flex flex-wrap gap-1 mb-4">
                      {category.tables.map((table) => (
                        <Badge key={table} variant="secondary" className="text-xs">
                          {table}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      className="w-full" 
                      onClick={() => handlePreview(category)}
                      disabled={previewMutation.isPending && selectedCategory?.id === category.id}
                      data-testid={`button-preview-${category.id}`}
                    >
                      {previewMutation.isPending && selectedCategory?.id === category.id ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Eye className="h-4 w-4 mr-2" />
                      )}
                      Preview & Sync
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Preview: {previewData?.category}
              </DialogTitle>
              <DialogDescription>
                Review the data comparison before syncing
              </DialogDescription>
            </DialogHeader>
            
            {previewData && (
              <div className="space-y-4">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium text-warning">{previewData.action}</p>
                </div>
                
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-4 py-2 text-left">Table</th>
                        <th className="px-4 py-2 text-center">DEV Rows</th>
                        <th className="px-4 py-2 text-center">PROD Rows</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(previewData.preview).map(([table, counts]) => (
                        <tr key={table} className="border-t">
                          <td className="px-4 py-2 font-mono text-xs">{table}</td>
                          <td className="px-4 py-2 text-center">
                            <Badge variant="outline">{counts.dev}</Badge>
                          </td>
                          <td className="px-4 py-2 text-center">
                            <Badge variant="secondary">{counts.prod}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleStartSync} data-testid="button-start-sync">
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Start Sync
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showSyncDialog} onOpenChange={setShowSyncDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                OTP Verification Required
              </DialogTitle>
              <DialogDescription>
                Sync {selectedCategory?.name} to Production
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                <p className="text-sm text-destructive font-medium">
                  Warning: This will replace all production data for {selectedCategory?.name}
                </p>
              </div>
              
              {!otpSent ? (
                <Button 
                  className="w-full" 
                  onClick={handleRequestOtp}
                  disabled={requestOtpMutation.isPending}
                  data-testid="button-request-otp"
                >
                  {requestOtpMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Shield className="h-4 w-4 mr-2" />
                  )}
                  Send OTP to Email
                </Button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground text-center">
                    Enter the 6-digit code sent to your email
                  </p>
                  <Input
                    placeholder="Enter OTP code"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    maxLength={6}
                    className="text-center text-2xl tracking-widest"
                    data-testid="input-otp-code"
                  />
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={handleRequestOtp}
                      disabled={requestOtpMutation.isPending}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Resend
                    </Button>
                    <Button 
                      className="flex-1"
                      onClick={handleApplySync}
                      disabled={!otpCode || otpCode.length !== 6 || applySyncMutation.isPending}
                      data-testid="button-apply-sync"
                    >
                      {applySyncMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      )}
                      Apply Sync
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
