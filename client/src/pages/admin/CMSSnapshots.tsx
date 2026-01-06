import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from './AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  Plus, 
  Trash2,
  Archive,
  Download,
  Upload,
  RefreshCw,
  CheckCircle,
  Clock,
  AlertTriangle,
  Shield,
  FileText,
  Layers,
  Tag,
  Eye,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

interface CMSSnapshot {
  id: string;
  version: string;
  description: string;
  environment: string;
  pagesCount: number;
  blocksCount: number;
  labelsCount: number;
  checksum: string;
  status: string;
  createdAt: string;
  createdByEmail: string;
  appliedAt: string | null;
  appliedByEmail: string | null;
  payload?: {
    pages: any[];
    blocks: any[];
    labels: any[];
  };
}

export default function CMSSnapshots() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState<CMSSnapshot | null>(null);
  const [description, setDescription] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  const { data: snapshotsData, isLoading } = useQuery({
    queryKey: ['cms-snapshots'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/cms/snapshots');
      return res.json();
    },
  });

  const snapshots = snapshotsData?.snapshots || [];

  const createSnapshotMutation = useMutation({
    mutationFn: async (description: string) => {
      const res = await apiRequest('POST', '/api/admin/cms/snapshots', { description });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Snapshot created', description: 'CMS snapshot created successfully' });
      queryClient.invalidateQueries({ queryKey: ['cms-snapshots'] });
      setShowCreateDialog(false);
      setDescription('');
    },
    onError: (error: any) => {
      toast({ title: 'Failed to create snapshot', description: error.message, variant: 'destructive' });
    },
  });

  const requestOtpMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/admin/cms/snapshots/request-otp', {});
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'OTP Sent', description: 'Check your email for the OTP code' });
      setOtpSent(true);
    },
    onError: (error: any) => {
      toast({ title: 'Failed to send OTP', description: error.message, variant: 'destructive' });
    },
  });

  const applySnapshotMutation = useMutation({
    mutationFn: async ({ id, otpCode }: { id: string; otpCode: string }) => {
      const res = await apiRequest('POST', `/api/admin/cms/snapshots/${id}/apply`, { otpCode });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: 'Snapshot applied', 
        description: `Successfully applied ${data.counts.pages} pages, ${data.counts.blocks} blocks, ${data.counts.labels} labels`,
      });
      queryClient.invalidateQueries({ queryKey: ['cms-snapshots'] });
      queryClient.invalidateQueries({ queryKey: ['cms'] });
      setShowApplyDialog(false);
      setOtpCode('');
      setOtpSent(false);
      setSelectedSnapshot(null);
    },
    onError: (error: any) => {
      toast({ title: 'Failed to apply snapshot', description: error.message, variant: 'destructive' });
    },
  });

  const deleteSnapshotMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('DELETE', `/api/admin/cms/snapshots/${id}`, {});
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Snapshot deleted' });
      queryClient.invalidateQueries({ queryKey: ['cms-snapshots'] });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to delete snapshot', description: error.message, variant: 'destructive' });
    },
  });

  const fetchSnapshotDetails = async (id: string) => {
    const res = await apiRequest('GET', `/api/admin/cms/snapshots/${id}`);
    const data = await res.json();
    return data.snapshot;
  };

  const handlePreview = async (snapshot: CMSSnapshot) => {
    const details = await fetchSnapshotDetails(snapshot.id);
    setSelectedSnapshot(details);
    setShowPreviewDialog(true);
  };

  const handleApplyClick = (snapshot: CMSSnapshot) => {
    setSelectedSnapshot(snapshot);
    setShowApplyDialog(true);
    setOtpCode('');
    setOtpSent(false);
  };

  return (
    <AdminLayout>
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Archive className="w-8 h-8 text-primary" />
              CMS Snapshots
            </h1>
            <p className="text-muted-foreground mt-1">
              Create and manage CMS content snapshots for safe DEV-PROD synchronization
            </p>
          </div>
          
          <Button onClick={() => setShowCreateDialog(true)} data-testid="btn-create-snapshot">
            <Plus className="w-4 h-4 mr-2" />
            Create Snapshot
          </Button>
        </div>

        <div className="grid gap-6">
          <Card className="border-warning-muted bg-warning-muted/30">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-warning-muted-foreground mt-0.5" />
                <div>
                  <h4 className="font-semibold text-warning-muted-foreground">Safe Sync System</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Snapshots capture CMS content (pages, blocks, labels) for safe transfer between environments. 
                    Apply operations require OTP verification and only affect content tables, never user data.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : snapshots.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Archive className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold">No Snapshots Yet</h3>
                <p className="text-muted-foreground mt-2">
                  Create your first CMS snapshot to capture the current content state.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {snapshots.map((snapshot: CMSSnapshot) => (
                <Card key={snapshot.id} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{snapshot.version}</h3>
                          <Badge variant={snapshot.status === 'applied' ? 'default' : 'secondary'}>
                            {snapshot.status === 'applied' ? (
                              <><CheckCircle className="w-3 h-3 mr-1" /> Applied</>
                            ) : (
                              <><Clock className="w-3 h-3 mr-1" /> Created</>
                            )}
                          </Badge>
                          <Badge variant="outline">{snapshot.environment}</Badge>
                        </div>
                        
                        <p className="text-muted-foreground text-sm mb-3">{snapshot.description}</p>
                        
                        <div className="flex flex-wrap items-center gap-4 text-sm">
                          <div className="flex items-center gap-1.5">
                            <FileText className="w-4 h-4 text-primary" />
                            <span>{snapshot.pagesCount} pages</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Layers className="w-4 h-4 text-primary" />
                            <span>{snapshot.blocksCount} blocks</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Tag className="w-4 h-4 text-primary" />
                            <span>{snapshot.labelsCount} labels</span>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-muted-foreground">
                          <span>Created by {snapshot.createdByEmail}</span>
                          <span>{formatDistanceToNow(new Date(snapshot.createdAt), { addSuffix: true })}</span>
                          {snapshot.appliedAt && (
                            <span className="text-success-muted-foreground">
                              Applied by {snapshot.appliedByEmail} {formatDistanceToNow(new Date(snapshot.appliedAt), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handlePreview(snapshot)}
                          data-testid={`btn-preview-${snapshot.id}`}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Preview
                        </Button>
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={() => handleApplyClick(snapshot)}
                          data-testid={`btn-apply-${snapshot.id}`}
                        >
                          <Upload className="w-4 h-4 mr-1" />
                          Apply
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this snapshot?')) {
                              deleteSnapshotMutation.mutate(snapshot.id);
                            }
                          }}
                          data-testid={`btn-delete-${snapshot.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                Create CMS Snapshot
              </DialogTitle>
              <DialogDescription>
                This will capture all CMS pages, blocks, and labels in their current state.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="e.g., Pre-launch content finalization"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-2"
                data-testid="input-snapshot-description"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
              <Button 
                onClick={() => createSnapshotMutation.mutate(description)}
                disabled={createSnapshotMutation.isPending}
                data-testid="btn-confirm-create"
              >
                {createSnapshotMutation.isPending ? 'Creating...' : 'Create Snapshot'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showApplyDialog} onOpenChange={(open) => {
          setShowApplyDialog(open);
          if (!open) {
            setOtpCode('');
            setOtpSent(false);
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-warning-muted-foreground" />
                Apply Snapshot - OTP Required
              </DialogTitle>
              <DialogDescription>
                This action will replace all CMS content with the snapshot data. This requires OTP verification for safety.
              </DialogDescription>
            </DialogHeader>
            
            {selectedSnapshot && (
              <div className="py-4 space-y-4">
                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-semibold">{selectedSnapshot.version}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{selectedSnapshot.description}</p>
                  <div className="flex gap-4 mt-2 text-sm">
                    <span>{selectedSnapshot.pagesCount} pages</span>
                    <span>{selectedSnapshot.blocksCount} blocks</span>
                    <span>{selectedSnapshot.labelsCount} labels</span>
                  </div>
                </div>
                
                {!otpSent ? (
                  <Button 
                    onClick={() => requestOtpMutation.mutate()} 
                    disabled={requestOtpMutation.isPending}
                    className="w-full"
                    data-testid="btn-request-otp"
                  >
                    {requestOtpMutation.isPending ? 'Sending...' : 'Send OTP to my email'}
                  </Button>
                ) : (
                  <div>
                    <Label htmlFor="otpCode">Enter OTP Code</Label>
                    <Input
                      id="otpCode"
                      placeholder="Enter 6-digit code"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      className="mt-2"
                      maxLength={6}
                      data-testid="input-otp-code"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Check your email for the verification code
                    </p>
                  </div>
                )}
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowApplyDialog(false)}>Cancel</Button>
              <Button 
                onClick={() => selectedSnapshot && applySnapshotMutation.mutate({ id: selectedSnapshot.id, otpCode })}
                disabled={!otpSent || otpCode.length < 6 || applySnapshotMutation.isPending}
                variant="destructive"
                data-testid="btn-confirm-apply"
              >
                {applySnapshotMutation.isPending ? 'Applying...' : 'Apply Snapshot'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Snapshot Preview: {selectedSnapshot?.version}
              </DialogTitle>
            </DialogHeader>
            
            {selectedSnapshot?.payload && (
              <div className="overflow-y-auto max-h-[60vh] space-y-6 py-4">
                <div>
                  <h4 className="font-semibold flex items-center gap-2 mb-3">
                    <FileText className="w-4 h-4" />
                    Pages ({selectedSnapshot.payload.pages?.length || 0})
                  </h4>
                  <div className="space-y-2">
                    {selectedSnapshot.payload.pages?.map((page: any) => (
                      <div key={page.id} className="p-3 bg-muted rounded-lg text-sm">
                        <div className="font-medium">{page.title}</div>
                        <div className="text-muted-foreground">/{page.slug}</div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold flex items-center gap-2 mb-3">
                    <Layers className="w-4 h-4" />
                    Blocks ({selectedSnapshot.payload.blocks?.length || 0})
                  </h4>
                  <div className="space-y-2">
                    {selectedSnapshot.payload.blocks?.slice(0, 10).map((block: any) => (
                      <div key={block.id} className="p-3 bg-muted rounded-lg text-sm">
                        <div className="font-medium">{block.type}</div>
                        <div className="text-muted-foreground text-xs">Page ID: {block.pageId}</div>
                      </div>
                    ))}
                    {(selectedSnapshot.payload.blocks?.length || 0) > 10 && (
                      <p className="text-sm text-muted-foreground">
                        ... and {selectedSnapshot.payload.blocks.length - 10} more blocks
                      </p>
                    )}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold flex items-center gap-2 mb-3">
                    <Tag className="w-4 h-4" />
                    Labels ({selectedSnapshot.payload.labels?.length || 0})
                  </h4>
                  <div className="space-y-2">
                    {selectedSnapshot.payload.labels?.slice(0, 10).map((label: any) => (
                      <div key={label.id} className="p-3 bg-muted rounded-lg text-sm flex justify-between">
                        <span className="font-mono">{label.key}</span>
                        <span className="text-muted-foreground">{label.value}</span>
                      </div>
                    ))}
                    {(selectedSnapshot.payload.labels?.length || 0) > 10 && (
                      <p className="text-sm text-muted-foreground">
                        ... and {selectedSnapshot.payload.labels.length - 10} more labels
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
