import React, { useState, useEffect } from 'react';
import AdminLayout from '@/pages/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CreditCard, CheckCircle, XCircle, Clock, Loader2, RefreshCw, Eye, ShieldCheck, Ban } from 'lucide-react';
import { toast } from 'sonner';
import { apiRequest } from '@/lib/queryClient';

interface CardApplication {
  card: {
    id: string;
    userId: string;
    cardType: string;
    cardStatus: string;
    last4Digits: string;
    expiryMonth: number;
    expiryYear: number;
    dailyLimitGrams: string;
    monthlyLimitGrams: string;
    isFrozen: boolean;
    adminNotes: string | null;
    appliedAt: string;
    reviewedAt: string | null;
    reviewedBy: string | null;
    issuedAt: string | null;
    activatedAt: string | null;
    cancelledAt: string | null;
  };
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface SpendingRecord {
  id: string;
  merchantName: string;
  merchantCategory: string | null;
  amountLocal: string;
  currencyLocal: string;
  goldGramsDeducted: string;
  goldPriceAtTime: string;
  usdEquivalent: string;
  status: string;
  createdAt: string;
}

function statusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case 'applied':
    case 'under_review':
      return 'secondary';
    case 'approved':
      return 'outline';
    case 'active':
      return 'default';
    case 'frozen':
    case 'cancelled':
      return 'destructive';
    default:
      return 'secondary';
  }
}

export default function FinaCardAdmin() {
  const [applications, setApplications] = useState<CardApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<CardApplication | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [spendingHistory, setSpendingHistory] = useState<SpendingRecord[]>([]);
  const [spendingLoading, setSpendingLoading] = useState(false);

  const fetchApplications = async (statusFilter?: string) => {
    setLoading(true);
    try {
      const url = statusFilter && statusFilter !== 'all'
        ? `/api/admin/finacard/applications?status=${statusFilter}`
        : '/api/admin/finacard/applications';
      const res = await apiRequest('GET', url);
      const data = await res.json();
      setApplications(data.applications || []);
    } catch (err: any) {
      if (err?.message?.includes('Access Denied')) {
        toast.error("Access Denied: You do not have permission for this action.");
      } else {
        toast.error('Failed to load card applications');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchSpendingHistory = async (userId: string) => {
    setSpendingLoading(true);
    try {
      const res = await apiRequest('GET', `/api/finacard/spending/${userId}`);
      const data = await res.json();
      setSpendingHistory(data.spending || []);
    } catch {
      setSpendingHistory([]);
    } finally {
      setSpendingLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications(activeTab);
  }, [activeTab]);

  const handleApprove = async () => {
    if (!selectedCard) return;
    setActionLoading(true);
    try {
      await apiRequest('POST', `/api/admin/finacard/approve/${selectedCard.card.id}`);
      toast.success(`Card application for ${selectedCard.user.firstName} ${selectedCard.user.lastName} approved`);
      setApproveDialogOpen(false);
      setSelectedCard(null);
      fetchApplications(activeTab);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to approve application');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedCard || !rejectReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    setActionLoading(true);
    try {
      await apiRequest('POST', `/api/admin/finacard/reject/${selectedCard.card.id}`, {
        reason: rejectReason.trim(),
      });
      toast.success(`Card application for ${selectedCard.user.firstName} ${selectedCard.user.lastName} rejected`);
      setRejectDialogOpen(false);
      setSelectedCard(null);
      setRejectReason('');
      fetchApplications(activeTab);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to reject application');
    } finally {
      setActionLoading(false);
    }
  };

  const openDetailDialog = (app: CardApplication) => {
    setSelectedCard(app);
    setDetailDialogOpen(true);
    if (app.card.cardStatus === 'active') {
      fetchSpendingHistory(app.card.userId);
    }
  };

  const statusCounts = {
    all: applications.length,
    applied: applications.filter(a => a.card.cardStatus === 'applied').length,
    approved: applications.filter(a => a.card.cardStatus === 'approved').length,
    active: applications.filter(a => a.card.cardStatus === 'active').length,
    frozen: applications.filter(a => a.card.cardStatus === 'frozen').length,
    cancelled: applications.filter(a => a.card.cardStatus === 'cancelled').length,
  };

  const filteredApplications = activeTab === 'all'
    ? applications
    : applications.filter(a => a.card.cardStatus === activeTab);

  return (
    <AdminLayout>
      <div className="p-4 lg:p-6 space-y-6" data-testid="finacard-admin-page">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-finacard-admin-title">FinaCard Management</h1>
            <p className="text-muted-foreground">Manage card applications, approvals, and spending</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchApplications(activeTab)}
            disabled={loading}
            data-testid="button-refresh-applications"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card data-testid="stat-total-applications">
            <CardContent className="p-4 text-center">
              <CreditCard className="w-6 h-6 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold">{applications.length}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card data-testid="stat-applied">
            <CardContent className="p-4 text-center">
              <Clock className="w-6 h-6 mx-auto mb-1 text-yellow-500" />
              <p className="text-2xl font-bold">{statusCounts.applied}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          <Card data-testid="stat-approved">
            <CardContent className="p-4 text-center">
              <ShieldCheck className="w-6 h-6 mx-auto mb-1 text-blue-500" />
              <p className="text-2xl font-bold">{statusCounts.approved}</p>
              <p className="text-xs text-muted-foreground">Approved</p>
            </CardContent>
          </Card>
          <Card data-testid="stat-active">
            <CardContent className="p-4 text-center">
              <CheckCircle className="w-6 h-6 mx-auto mb-1 text-green-500" />
              <p className="text-2xl font-bold">{statusCounts.active}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </CardContent>
          </Card>
          <Card data-testid="stat-cancelled">
            <CardContent className="p-4 text-center">
              <Ban className="w-6 h-6 mx-auto mb-1 text-red-500" />
              <p className="text-2xl font-bold">{statusCounts.cancelled + statusCounts.frozen}</p>
              <p className="text-xs text-muted-foreground">Cancelled/Frozen</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList data-testid="tabs-status-filter">
            <TabsTrigger value="all" data-testid="tab-all">All ({statusCounts.all})</TabsTrigger>
            <TabsTrigger value="applied" data-testid="tab-applied">Applied ({statusCounts.applied})</TabsTrigger>
            <TabsTrigger value="approved" data-testid="tab-approved">Approved ({statusCounts.approved})</TabsTrigger>
            <TabsTrigger value="active" data-testid="tab-active">Active ({statusCounts.active})</TabsTrigger>
            <TabsTrigger value="frozen" data-testid="tab-frozen">Frozen ({statusCounts.frozen})</TabsTrigger>
            <TabsTrigger value="cancelled" data-testid="tab-cancelled">Cancelled ({statusCounts.cancelled})</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex items-center justify-center py-12" data-testid="loading-applications">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <span className="ml-2 text-muted-foreground">Loading applications...</span>
                  </div>
                ) : filteredApplications.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground" data-testid="empty-applications">
                    No card applications found
                  </div>
                ) : (
                  <Table data-testid="table-applications">
                    <TableHeader>
                      <TableRow>
                        <TableHead>User Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Card Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Applied Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredApplications.map((app) => (
                        <TableRow key={app.card.id} data-testid={`row-application-${app.card.id}`}>
                          <TableCell className="font-medium" data-testid={`text-user-name-${app.card.id}`}>
                            {app.user.firstName} {app.user.lastName}
                          </TableCell>
                          <TableCell data-testid={`text-user-email-${app.card.id}`}>
                            {app.user.email}
                          </TableCell>
                          <TableCell data-testid={`text-card-type-${app.card.id}`}>
                            <Badge variant="outline" className="capitalize">{app.card.cardType}</Badge>
                          </TableCell>
                          <TableCell data-testid={`text-card-status-${app.card.id}`}>
                            <Badge variant={statusBadgeVariant(app.card.cardStatus)} className="capitalize">
                              {app.card.cardStatus.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell data-testid={`text-applied-date-${app.card.id}`}>
                            {new Date(app.card.appliedAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openDetailDialog(app)}
                                data-testid={`button-view-${app.card.id}`}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              {(app.card.cardStatus === 'applied' || app.card.cardStatus === 'under_review') && (
                                <>
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => { setSelectedCard(app); setApproveDialogOpen(true); }}
                                    data-testid={`button-approve-${app.card.id}`}
                                  >
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    Approve
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => { setSelectedCard(app); setRejectDialogOpen(true); }}
                                    data-testid={`button-reject-${app.card.id}`}
                                  >
                                    <XCircle className="w-4 h-4 mr-1" />
                                    Reject
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
          <DialogContent data-testid="dialog-approve">
            <DialogHeader>
              <DialogTitle>Approve Card Application</DialogTitle>
              <DialogDescription>
                Are you sure you want to approve the card application for{' '}
                <strong>{selectedCard?.user.firstName} {selectedCard?.user.lastName}</strong>?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setApproveDialogOpen(false)} data-testid="button-cancel-approve">
                Cancel
              </Button>
              <Button onClick={handleApprove} disabled={actionLoading} data-testid="button-confirm-approve">
                {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Approve
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogContent data-testid="dialog-reject">
            <DialogHeader>
              <DialogTitle>Reject Card Application</DialogTitle>
              <DialogDescription>
                Provide a reason for rejecting the application for{' '}
                <strong>{selectedCard?.user.firstName} {selectedCard?.user.lastName}</strong>.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="reject-reason">Reason</Label>
              <Textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter rejection reason..."
                data-testid="input-reject-reason"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setRejectDialogOpen(false); setRejectReason(''); }} data-testid="button-cancel-reject">
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleReject} disabled={actionLoading || !rejectReason.trim()} data-testid="button-confirm-reject">
                {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Reject
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="dialog-card-details">
            <DialogHeader>
              <DialogTitle>Card Details</DialogTitle>
              <DialogDescription>
                {selectedCard?.user.firstName} {selectedCard?.user.lastName} ({selectedCard?.user.email})
              </DialogDescription>
            </DialogHeader>
            {selectedCard && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Card Type</p>
                    <p className="font-medium capitalize" data-testid="detail-card-type">{selectedCard.card.cardType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant={statusBadgeVariant(selectedCard.card.cardStatus)} className="capitalize" data-testid="detail-card-status">
                      {selectedCard.card.cardStatus.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Last 4 Digits</p>
                    <p className="font-medium font-mono" data-testid="detail-last4">{selectedCard.card.last4Digits}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Expiry</p>
                    <p className="font-medium" data-testid="detail-expiry">{String(selectedCard.card.expiryMonth).padStart(2, '0')}/{selectedCard.card.expiryYear}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Daily Limit</p>
                    <p className="font-medium" data-testid="detail-daily-limit">{selectedCard.card.dailyLimitGrams}g</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Monthly Limit</p>
                    <p className="font-medium" data-testid="detail-monthly-limit">{selectedCard.card.monthlyLimitGrams}g</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Applied</p>
                    <p className="font-medium" data-testid="detail-applied-date">{new Date(selectedCard.card.appliedAt).toLocaleString()}</p>
                  </div>
                  {selectedCard.card.reviewedAt && (
                    <div>
                      <p className="text-sm text-muted-foreground">Reviewed</p>
                      <p className="font-medium" data-testid="detail-reviewed-date">{new Date(selectedCard.card.reviewedAt).toLocaleString()}</p>
                    </div>
                  )}
                  {selectedCard.card.activatedAt && (
                    <div>
                      <p className="text-sm text-muted-foreground">Activated</p>
                      <p className="font-medium" data-testid="detail-activated-date">{new Date(selectedCard.card.activatedAt).toLocaleString()}</p>
                    </div>
                  )}
                  {selectedCard.card.adminNotes && (
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">Admin Notes</p>
                      <p className="font-medium" data-testid="detail-admin-notes">{selectedCard.card.adminNotes}</p>
                    </div>
                  )}
                </div>

                {selectedCard.card.cardStatus === 'active' && (
                  <div className="space-y-3 pt-4 border-t">
                    <h3 className="font-semibold">Spending History</h3>
                    {spendingLoading ? (
                      <div className="flex items-center gap-2 py-4">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">Loading spending...</span>
                      </div>
                    ) : spendingHistory.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4" data-testid="text-no-spending">No spending transactions yet</p>
                    ) : (
                      <Table data-testid="table-spending-history">
                        <TableHeader>
                          <TableRow>
                            <TableHead>Merchant</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Gold Deducted</TableHead>
                            <TableHead>Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {spendingHistory.map((s) => (
                            <TableRow key={s.id} data-testid={`row-spending-${s.id}`}>
                              <TableCell className="font-medium">{s.merchantName}</TableCell>
                              <TableCell>{s.merchantCategory || '-'}</TableCell>
                              <TableCell>{parseFloat(s.amountLocal).toFixed(2)} {s.currencyLocal}</TableCell>
                              <TableCell>{parseFloat(s.goldGramsDeducted).toFixed(4)}g</TableCell>
                              <TableCell>{new Date(s.createdAt).toLocaleDateString()}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
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