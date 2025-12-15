import React, { useState } from 'react';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle2, XCircle, FileText, User, Building, RefreshCw, Clock, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import AdminOtpModal, { checkOtpRequired } from '@/components/admin/AdminOtpModal';
import { useAdminOtp } from '@/hooks/useAdminOtp';

export default function KYCReview() {
  const { user: adminUser } = useAuth();
  const queryClient = useQueryClient();
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showBulkRejectDialog, setShowBulkRejectDialog] = useState(false);
  const [bulkRejectionReason, setBulkRejectionReason] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { isOtpModalOpen, pendingAction, requestOtp, handleVerified, closeOtpModal } = useAdminOtp();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-kyc-submissions'],
    queryFn: async () => {
      const res = await fetch('/api/admin/kyc');
      if (!res.ok) throw new Error('Failed to fetch KYC submissions');
      return res.json();
    },
    refetchInterval: 30000,
  });

  const submissions = data?.submissions || [];
  const pendingSubmissions = submissions.filter((s: any) => s.status === 'In Progress');
  const approvedSubmissions = submissions.filter((s: any) => s.status === 'Approved');
  const rejectedSubmissions = submissions.filter((s: any) => s.status === 'Rejected');

  const approveMutation = useMutation({
    mutationFn: async (submissionId: string) => {
      const res = await fetch(`/api/kyc/${submissionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'Approved',
          reviewedBy: adminUser?.id,
          reviewedAt: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error('Failed to approve');
      return res.json();
    },
    onSuccess: () => {
      toast.success('KYC Approved', { description: 'User now has full platform access.' });
      setSelectedApplication(null);
      queryClient.invalidateQueries({ queryKey: ['admin-kyc-submissions'] });
    },
    onError: () => {
      toast.error('Failed to approve KYC');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ submissionId, reason }: { submissionId: string; reason: string }) => {
      const res = await fetch(`/api/kyc/${submissionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'Rejected',
          rejectionReason: reason,
          reviewedBy: adminUser?.id,
          reviewedAt: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error('Failed to reject');
      return res.json();
    },
    onSuccess: () => {
      toast.error('KYC Rejected', { description: 'User has been notified.' });
      setSelectedApplication(null);
      setShowRejectDialog(false);
      setRejectionReason('');
      queryClient.invalidateQueries({ queryKey: ['admin-kyc-submissions'] });
    },
    onError: () => {
      toast.error('Failed to reject KYC');
    },
  });

  const performApproval = (submissionId: string) => {
    approveMutation.mutate(submissionId);
  };

  const performRejection = (submissionId: string, reason: string) => {
    rejectMutation.mutate({ submissionId, reason });
  };

  const bulkApproveMutation = useMutation({
    mutationFn: async (submissionIds: string[]) => {
      const results = await Promise.all(
        submissionIds.map(async (id) => {
          const res = await fetch(`/api/kyc/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              status: 'Approved',
              reviewedBy: adminUser?.id,
              reviewedAt: new Date().toISOString(),
            }),
          });
          return { id, success: res.ok };
        })
      );
      return results;
    },
    onSuccess: (results) => {
      const successCount = results.filter(r => r.success).length;
      toast.success(`Bulk Approved`, { description: `${successCount} KYC applications approved.` });
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['admin-kyc-submissions'] });
    },
    onError: () => {
      toast.error('Failed to bulk approve KYC applications');
    },
  });

  const bulkRejectMutation = useMutation({
    mutationFn: async ({ submissionIds, reason }: { submissionIds: string[]; reason: string }) => {
      const results = await Promise.all(
        submissionIds.map(async (id) => {
          const res = await fetch(`/api/kyc/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              status: 'Rejected',
              rejectionReason: reason,
              reviewedBy: adminUser?.id,
              reviewedAt: new Date().toISOString(),
            }),
          });
          return { id, success: res.ok };
        })
      );
      return results;
    },
    onSuccess: (results) => {
      const successCount = results.filter(r => r.success).length;
      toast.error(`Bulk Rejected`, { description: `${successCount} KYC applications rejected.` });
      setSelectedIds(new Set());
      setShowBulkRejectDialog(false);
      setBulkRejectionReason('');
      queryClient.invalidateQueries({ queryKey: ['admin-kyc-submissions'] });
    },
    onError: () => {
      toast.error('Failed to bulk reject KYC applications');
    },
  });

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === pendingSubmissions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingSubmissions.map((s: any) => s.id)));
    }
  };

  const handleBulkApprove = () => {
    if (selectedIds.size === 0) return;
    bulkApproveMutation.mutate(Array.from(selectedIds));
  };

  const handleBulkReject = () => {
    if (selectedIds.size === 0 || !bulkRejectionReason.trim()) return;
    bulkRejectMutation.mutate({ submissionIds: Array.from(selectedIds), reason: bulkRejectionReason });
  };

  const handleApprove = async () => {
    if (!selectedApplication || !adminUser?.id) return;
    
    const otpRequired = await checkOtpRequired('kyc_approval', adminUser.id);
    if (otpRequired) {
      requestOtp({
        actionType: 'kyc_approval',
        targetId: selectedApplication.id,
        targetType: 'kyc_submission',
        onComplete: () => performApproval(selectedApplication.id),
      });
    } else {
      performApproval(selectedApplication.id);
    }
  };

  const handleReject = async () => {
    if (!selectedApplication || !rejectionReason.trim() || !adminUser?.id) return;
    
    const otpRequired = await checkOtpRequired('kyc_rejection', adminUser.id);
    if (otpRequired) {
      requestOtp({
        actionType: 'kyc_rejection',
        targetId: selectedApplication.id,
        targetType: 'kyc_submission',
        actionData: { reason: rejectionReason },
        onComplete: () => performRejection(selectedApplication.id, rejectionReason),
      });
    } else {
      performRejection(selectedApplication.id, rejectionReason);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return <Badge className="bg-green-100 text-green-700"><CheckCircle2 className="w-3 h-3 mr-1" /> Approved</Badge>;
      case 'Rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" /> Pending Review</Badge>;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">KYC Reviews</h1>
            <p className="text-gray-500">Review and approve customer identity verifications.</p>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingSubmissions.length}</p>
                <p className="text-sm text-gray-500">Pending Review</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{approvedSubmissions.length}</p>
                <p className="text-sm text-gray-500">Approved</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{rejectedSubmissions.length}</p>
                <p className="text-sm text-gray-500">Rejected</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Applications */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Pending Applications ({pendingSubmissions.length})</CardTitle>
            {pendingSubmissions.length > 0 && (
              <div className="flex items-center gap-2">
                {selectedIds.size > 0 && (
                  <span className="text-sm text-gray-500 mr-2">{selectedIds.size} selected</span>
                )}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleBulkApprove}
                  disabled={selectedIds.size === 0 || bulkApproveMutation.isPending}
                  className="text-green-600 hover:bg-green-50"
                  data-testid="button-bulk-approve"
                >
                  {bulkApproveMutation.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                  Bulk Approve
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => selectedIds.size > 0 && setShowBulkRejectDialog(true)}
                  disabled={selectedIds.size === 0}
                  className="text-red-600 hover:bg-red-50"
                  data-testid="button-bulk-reject"
                >
                  <XCircle className="w-4 h-4 mr-2" /> Bulk Reject
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : pendingSubmissions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-400" />
                <p>No pending applications</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border">
                  <Checkbox 
                    checked={selectedIds.size === pendingSubmissions.length && pendingSubmissions.length > 0}
                    onCheckedChange={toggleSelectAll}
                    data-testid="checkbox-select-all"
                  />
                  <span className="text-sm text-gray-600">Select All</span>
                </div>
                {pendingSubmissions.map((app: any) => (
                  <div key={app.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors" data-testid={`kyc-submission-${app.id}`}>
                    <div className="flex items-center gap-4">
                      <Checkbox 
                        checked={selectedIds.has(app.id)}
                        onCheckedChange={() => toggleSelection(app.id)}
                        data-testid={`checkbox-kyc-${app.id}`}
                      />
                      <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                        {app.accountType === 'business' ? <Building className="w-6 h-6" /> : <User className="w-6 h-6" />}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{app.fullName || 'Name not provided'}</h3>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <span className="capitalize">{app.accountType} Account</span>
                          <span>•</span>
                          <span>Submitted {new Date(app.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      {getStatusBadge(app.status)}
                      <Button onClick={() => setSelectedApplication(app)} data-testid={`button-review-${app.id}`}>
                        Review Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* All Applications */}
        <Card>
          <CardHeader>
            <CardTitle>All Applications ({submissions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {submissions.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No KYC submissions yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
                <table className="w-full">
                  <thead className="text-xs text-gray-600 uppercase bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                    <tr>
                      <th className="px-4 py-4 text-left font-semibold tracking-wide">Applicant</th>
                      <th className="px-4 py-4 text-left font-semibold tracking-wide">Account Type</th>
                      <th className="px-4 py-4 text-left font-semibold tracking-wide">Status</th>
                      <th className="px-4 py-4 text-left font-semibold tracking-wide">Submitted</th>
                      <th className="px-4 py-4 text-right font-semibold tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {submissions.map((app: any, index: number) => (
                      <tr key={app.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-orange-50/50 transition-colors duration-150`}>
                        <td className="px-4 py-3 font-medium">{app.fullName || 'Not provided'}</td>
                        <td className="px-4 py-3 capitalize">{app.accountType}</td>
                        <td className="px-4 py-3">{getStatusBadge(app.status)}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{new Date(app.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-right">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedApplication(app)}>
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Review Dialog */}
        <Dialog open={!!selectedApplication && !showRejectDialog} onOpenChange={(open) => !open && setSelectedApplication(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>KYC Application Review</DialogTitle>
              <DialogDescription>
                Review documents for {selectedApplication?.fullName} ({selectedApplication?.accountType} Account)
              </DialogDescription>
            </DialogHeader>

            <div className="grid md:grid-cols-2 gap-6 py-4">
              <div className="space-y-4">
                <h4 className="font-medium border-b pb-2">Applicant Details</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-gray-500">Full Name:</span>
                  <span className="font-medium">{selectedApplication?.fullName || 'Not provided'}</span>
                  <span className="text-gray-500">Account Type:</span>
                  <span className="font-medium capitalize">{selectedApplication?.accountType}</span>
                  <span className="text-gray-500">Country:</span>
                  <span className="font-medium">{selectedApplication?.country || 'Not provided'}</span>
                  <span className="text-gray-500">Nationality:</span>
                  <span className="font-medium">{selectedApplication?.nationality || 'Not provided'}</span>
                  <span className="text-gray-500">Submitted:</span>
                  <span className="font-medium">{selectedApplication?.createdAt ? new Date(selectedApplication.createdAt).toLocaleString() : '-'}</span>
                </div>
                
                {selectedApplication?.accountType === 'business' && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="font-medium mb-2">Business Details</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <span className="text-gray-500">Company Name:</span>
                      <span className="font-medium">{selectedApplication?.companyName || 'Not provided'}</span>
                      <span className="text-gray-500">Registration Number:</span>
                      <span className="font-medium">{selectedApplication?.registrationNumber || 'Not provided'}</span>
                      <span className="text-gray-500">Tax ID:</span>
                      <span className="font-medium">{selectedApplication?.taxId || 'Not provided'}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h4 className="font-medium border-b pb-2">Documents Status</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">ID Document</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedApplication?.documents?.idProof ? (
                        <>
                          <Badge className="bg-green-100 text-green-700">Uploaded</Badge>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => window.open(selectedApplication.documents.idProof.url, '_blank')}
                            data-testid="button-view-id-doc"
                          >
                            View
                          </Button>
                        </>
                      ) : (
                        <Badge variant="outline">Not Uploaded</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">Selfie</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedApplication?.documents?.selfie ? (
                        <>
                          <Badge className="bg-green-100 text-green-700">Uploaded</Badge>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => window.open(selectedApplication.documents.selfie.url, '_blank')}
                            data-testid="button-view-selfie"
                          >
                            View
                          </Button>
                        </>
                      ) : (
                        <Badge variant="outline">Not Uploaded</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">Proof of Address</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedApplication?.documents?.proofOfAddress ? (
                        <>
                          <Badge className="bg-green-100 text-green-700">Uploaded</Badge>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => window.open(selectedApplication.documents.proofOfAddress.url, '_blank')}
                            data-testid="button-view-address-proof"
                          >
                            View
                          </Button>
                        </>
                      ) : (
                        <Badge variant="outline">Not Uploaded</Badge>
                      )}
                    </div>
                  </div>
                </div>

                {selectedApplication?.rejectionReason && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm font-medium text-red-800">Rejection Reason:</p>
                    <p className="text-sm text-red-700">{selectedApplication.rejectionReason}</p>
                  </div>
                )}
              </div>
            </div>

            {selectedApplication?.status === 'In Progress' && (
              <DialogFooter className="gap-2 sm:gap-0">
                <Button 
                  variant="destructive" 
                  onClick={() => setShowRejectDialog(true)}
                  disabled={rejectMutation.isPending}
                  data-testid="button-reject-kyc"
                >
                  <XCircle className="w-4 h-4 mr-2" /> Reject
                </Button>
                <Button 
                  className="bg-green-600 hover:bg-green-700" 
                  onClick={handleApprove}
                  disabled={approveMutation.isPending}
                  data-testid="button-approve-kyc"
                >
                  {approveMutation.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                  Approve & Verify
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>

        {/* Reject Reason Dialog */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject KYC Application</DialogTitle>
              <DialogDescription>
                Please provide a reason for rejecting this application.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Textarea 
                placeholder="Enter rejection reason..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="min-h-[100px]"
                data-testid="input-rejection-reason"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Cancel</Button>
              <Button 
                variant="destructive" 
                onClick={handleReject}
                disabled={!rejectionReason.trim() || rejectMutation.isPending}
              >
                {rejectMutation.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
                Reject Application
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Reject Dialog */}
        <Dialog open={showBulkRejectDialog} onOpenChange={setShowBulkRejectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Bulk Reject KYC Applications</DialogTitle>
              <DialogDescription>
                You are about to reject {selectedIds.size} KYC application(s). Please provide a reason.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Textarea 
                placeholder="Enter rejection reason for all selected applications..."
                value={bulkRejectionReason}
                onChange={(e) => setBulkRejectionReason(e.target.value)}
                className="min-h-[100px]"
                data-testid="input-bulk-rejection-reason"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBulkRejectDialog(false)}>Cancel</Button>
              <Button 
                variant="destructive" 
                onClick={handleBulkReject}
                disabled={!bulkRejectionReason.trim() || bulkRejectMutation.isPending}
                data-testid="button-confirm-bulk-reject"
              >
                {bulkRejectMutation.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
                Reject {selectedIds.size} Application(s)
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Admin OTP Verification Modal */}
        {pendingAction && adminUser?.id && (
          <AdminOtpModal
            isOpen={isOtpModalOpen}
            onClose={closeOtpModal}
            onVerified={handleVerified}
            actionType={pendingAction.actionType}
            targetId={pendingAction.targetId}
            targetType={pendingAction.targetType}
            actionData={pendingAction.actionData}
            adminUserId={adminUser.id}
          />
        )}
      </div>
    </AdminLayout>
  );
}
