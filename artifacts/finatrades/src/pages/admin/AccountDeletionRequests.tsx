import React, { useState } from 'react';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Trash2, Clock, CheckCircle, XCircle, AlertTriangle, 
  Loader2, Search, RefreshCw, User, Calendar, MessageSquare, Play
} from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DeletionRequest {
  id: string;
  userId: string;
  reason: string;
  additionalComments?: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled' | 'Completed';
  requestedAt: string;
  scheduledDeletionDate: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  cancelledAt?: string;
  completedAt?: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  reviewer?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export default function AccountDeletionRequests() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<DeletionRequest | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const [reviewNotes, setReviewNotes] = useState('');
  const [showExecuteDialog, setShowExecuteDialog] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-deletion-requests'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/account-deletion-requests');
      if (!res.ok) throw new Error('Failed to fetch deletion requests');
      return res.json();
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, action, notes }: { id: string; action: string; notes: string }) => {
      return apiRequest('POST', `/api/admin/account-deletion-requests/${id}/review`, {
        action,
        reviewNotes: notes,
      });
    },
    onSuccess: () => {
      toast.success(`Request ${reviewAction}d successfully`);
      setShowReviewDialog(false);
      setSelectedRequest(null);
      setReviewNotes('');
      refetch();
    },
    onError: (error: Error) => {
      toast.error('Failed to review request', { description: error.message });
    },
  });

  const executeMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('POST', `/api/admin/account-deletion-requests/${id}/execute`, {});
    },
    onSuccess: () => {
      toast.success('Account deleted successfully');
      setShowExecuteDialog(false);
      setSelectedRequest(null);
      refetch();
    },
    onError: (error: Error) => {
      toast.error('Failed to delete account', { description: error.message });
    },
  });

  const requests: DeletionRequest[] = data?.requests || [];

  const filteredRequests = requests.filter(request => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      request.user?.email?.toLowerCase().includes(query) ||
      request.user?.firstName?.toLowerCase().includes(query) ||
      request.user?.lastName?.toLowerCase().includes(query) ||
      request.reason.toLowerCase().includes(query)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
      case 'Approved':
        return <Badge variant="destructive">Approved</Badge>;
      case 'Rejected':
        return <Badge variant="secondary">Rejected</Badge>;
      case 'Cancelled':
        return <Badge variant="secondary">Cancelled</Badge>;
      case 'Completed':
        return <Badge className="bg-gray-700">Completed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const canExecute = (request: DeletionRequest) => {
    if (request.status !== 'Approved') return false;
    return new Date() >= new Date(request.scheduledDeletionDate);
  };

  const openReviewDialog = (request: DeletionRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setReviewAction(action);
    setReviewNotes('');
    setShowReviewDialog(true);
  };

  const openExecuteDialog = (request: DeletionRequest) => {
    setSelectedRequest(request);
    setShowExecuteDialog(true);
  };

  const pendingCount = requests.filter(r => r.status === 'Pending').length;
  const approvedCount = requests.filter(r => r.status === 'Approved').length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Account Deletion Requests</h1>
            <p className="text-muted-foreground">Review and manage user account deletion requests</p>
          </div>
          <Button onClick={() => refetch()} variant="outline" size="sm" data-testid="button-refresh-requests">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{requests.length}</div>
              <p className="text-sm text-muted-foreground">Total Requests</p>
            </CardContent>
          </Card>
          <Card className="border-yellow-200">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
              <p className="text-sm text-muted-foreground">Pending Review</p>
            </CardContent>
          </Card>
          <Card className="border-red-200">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600">{approvedCount}</div>
              <p className="text-sm text-muted-foreground">Approved (Awaiting Deletion)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{requests.filter(r => r.status === 'Completed').length}</div>
              <p className="text-sm text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Deletion Requests</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by user or reason..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-requests"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Trash2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No deletion requests found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Scheduled Deletion</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((request) => (
                    <TableRow key={request.id} data-testid={`row-deletion-request-${request.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{request.user?.firstName} {request.user?.lastName}</p>
                            <p className="text-sm text-muted-foreground">{request.user?.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <p className="truncate" title={request.reason}>{request.reason}</p>
                        {request.additionalComments && (
                          <p className="text-sm text-muted-foreground truncate" title={request.additionalComments}>
                            {request.additionalComments}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="w-3 h-3" />
                          {new Date(request.requestedAt).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="w-3 h-3" />
                          {new Date(request.scheduledDeletionDate).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {request.status === 'Pending' && (
                            <>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => openReviewDialog(request, 'approve')}
                                data-testid={`button-approve-${request.id}`}
                              >
                                <CheckCircle className="w-4 h-4 mr-1 text-green-600" />
                                Approve
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => openReviewDialog(request, 'reject')}
                                data-testid={`button-reject-${request.id}`}
                              >
                                <XCircle className="w-4 h-4 mr-1 text-red-600" />
                                Reject
                              </Button>
                            </>
                          )}
                          {request.status === 'Approved' && canExecute(request) && (
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => openExecuteDialog(request)}
                              data-testid={`button-execute-${request.id}`}
                            >
                              <Play className="w-4 h-4 mr-1" />
                              Delete Now
                            </Button>
                          )}
                          {request.status === 'Approved' && !canExecute(request) && (
                            <span className="text-sm text-muted-foreground">
                              Waiting until {new Date(request.scheduledDeletionDate).toLocaleDateString()}
                            </span>
                          )}
                          {request.reviewer && (
                            <div className="text-xs text-muted-foreground">
                              by {request.reviewer.firstName}
                            </div>
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
      </div>

      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {reviewAction === 'approve' ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              {reviewAction === 'approve' ? 'Approve' : 'Reject'} Deletion Request
            </DialogTitle>
            <DialogDescription>
              {reviewAction === 'approve' 
                ? 'Approving this request will schedule the account for deletion on the specified date.'
                : 'Rejecting this request will keep the user account active.'
              }
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="bg-muted p-3 rounded-lg space-y-2 text-sm">
                <p><strong>User:</strong> {selectedRequest.user?.email}</p>
                <p><strong>Reason:</strong> {selectedRequest.reason}</p>
                {selectedRequest.additionalComments && (
                  <p><strong>Comments:</strong> {selectedRequest.additionalComments}</p>
                )}
                <p><strong>Scheduled Date:</strong> {new Date(selectedRequest.scheduledDeletionDate).toLocaleDateString()}</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="review-notes">Review Notes (optional)</Label>
                <Textarea
                  id="review-notes"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder={reviewAction === 'approve' 
                    ? 'Any notes for the user about the approval...'
                    : 'Please provide a reason for rejection...'
                  }
                  rows={3}
                  data-testid="input-review-notes"
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReviewDialog(false)}>
              Cancel
            </Button>
            <Button
              variant={reviewAction === 'approve' ? 'default' : 'destructive'}
              onClick={() => selectedRequest && reviewMutation.mutate({
                id: selectedRequest.id,
                action: reviewAction,
                notes: reviewNotes,
              })}
              disabled={reviewMutation.isPending}
              data-testid="button-confirm-review"
            >
              {reviewMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {reviewAction === 'approve' ? 'Approve Request' : 'Reject Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showExecuteDialog} onOpenChange={setShowExecuteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Delete User Account?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The user account and all associated data will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {selectedRequest && (
            <div className="bg-red-50 border border-red-200 p-3 rounded-lg text-sm">
              <p><strong>User:</strong> {selectedRequest.user?.email}</p>
              <p><strong>Name:</strong> {selectedRequest.user?.firstName} {selectedRequest.user?.lastName}</p>
            </div>
          )}
          
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedRequest && executeMutation.mutate(selectedRequest.id)}
              disabled={executeMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-execute"
            >
              {executeMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
