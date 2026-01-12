import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Clock, ArrowDownLeft, CheckCircle, XCircle, Loader2, User, AlertTriangle, DollarSign, Send, Mail, Timer, Paperclip, Download } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface PendingTransfer {
  id: string;
  referenceNumber: string;
  senderId: string;
  recipientId: string | null;
  amountUsd: string;
  amountGold?: string | null;
  goldPriceUsdPerGram?: string | null;
  channel: string;
  recipientIdentifier: string;
  memo?: string | null;
  status: string;
  requiresApproval: boolean;
  expiresAt?: string | null;
  createdAt: string;
  senderName?: string;
  senderEmail?: string;
  isInvite?: boolean;
}

interface GoldRequest {
  id: string;
  referenceNumber: string;
  requesterId: string;
  payerId: string | null;
  payerEmail: string | null;
  goldGrams: string;
  amountUsd: string | null;
  goldPriceAtRequest: string | null;
  reason: string | null;
  memo: string | null;
  status: string;
  expiresAt: string | null;
  createdAt: string;
  requesterName?: string;
  requesterEmail?: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentMime?: string | null;
  attachmentSize?: number | null;
}

interface UserInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface DepositRequest {
  id: string;
  referenceNumber: string;
  amountUsd: string;
  expectedGoldGrams?: string;
  priceSnapshotUsdPerGram?: string;
  paymentMethod: string;
  status: string;
  createdAt: string;
  goldWalletType?: string;
}

export default function PendingTransfers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedTransfer, setSelectedTransfer] = useState<PendingTransfer | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<GoldRequest | null>(null);
  const [actionType, setActionType] = useState<'accept' | 'reject' | 'pay' | 'decline' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [declineReason, setDeclineReason] = useState('');
  const [senderInfoMap, setSenderInfoMap] = useState<Record<string, UserInfo>>({});
  const [requesterInfoMap, setRequesterInfoMap] = useState<Record<string, UserInfo>>({});

  const { data: incomingData, isLoading: loadingIncoming, refetch: refetchIncoming } = useQuery({
    queryKey: ['pendingTransfers', 'incoming', user?.id],
    queryFn: async () => {
      if (!user?.id) return { transfers: [] };
      const response = await apiRequest('GET', `/api/finapay/pending/incoming/${user.id}`);
      return await response.json();
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  const { data: outgoingData, isLoading: loadingOutgoing, refetch: refetchOutgoing } = useQuery({
    queryKey: ['pendingTransfers', 'outgoing', user?.id],
    queryFn: async () => {
      if (!user?.id) return { transfers: [] };
      const response = await apiRequest('GET', `/api/finapay/pending/outgoing/${user.id}`);
      return await response.json();
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  const { data: receivedRequestsData, isLoading: loadingRequests, refetch: refetchRequests } = useQuery({
    queryKey: ['paymentRequests', 'received', user?.id],
    queryFn: async () => {
      if (!user?.id) return { requests: [] };
      const response = await apiRequest('GET', `/api/finapay/requests/received/${user.id}`);
      return await response.json();
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  const { data: depositRequestsData, isLoading: loadingDeposits } = useQuery({
    queryKey: ['depositRequests', 'pending', user?.id],
    queryFn: async () => {
      if (!user?.id) return { requests: [] };
      const response = await apiRequest('GET', `/api/deposit-requests/${user.id}`);
      return await response.json();
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  useEffect(() => {
    const fetchSenderInfo = async () => {
      const transfers = incomingData?.transfers || [];
      const senderIdSet = new Set(transfers.map((t: PendingTransfer) => t.senderId));
      const senderIds = Array.from(senderIdSet) as string[];
      
      for (const senderId of senderIds) {
        if (!senderInfoMap[senderId as string]) {
          try {
            const response = await fetch(`/api/users/${senderId}`);
            if (response.ok) {
              const data = await response.json();
              setSenderInfoMap(prev => ({
                ...prev,
                [senderId as string]: data.user || data
              }));
            }
          } catch (error) {
            console.error('Failed to fetch sender info:', error);
          }
        }
      }
    };
    
    fetchSenderInfo();
  }, [incomingData?.transfers]);

  useEffect(() => {
    const fetchRequesterInfo = async () => {
      const requests = receivedRequestsData?.requests || [];
      const requesterIdSet = new Set(requests.map((r: GoldRequest) => r.requesterId));
      const requesterIds = Array.from(requesterIdSet) as string[];
      
      for (const requesterId of requesterIds) {
        if (!requesterInfoMap[requesterId as string]) {
          try {
            const response = await apiRequest('GET', `/api/users/${requesterId}`);
            if (response.ok) {
              const data = await response.json();
              setRequesterInfoMap(prev => ({
                ...prev,
                [requesterId as string]: data.user || data
              }));
            }
          } catch (error) {
            console.error('Failed to fetch requester info:', error);
          }
        }
      }
    };
    
    fetchRequesterInfo();
  }, [receivedRequestsData?.requests]);

  const acceptMutation = useMutation({
    mutationFn: async (transferId: string) => {
      const response = await apiRequest('POST', `/api/finapay/pending/${transferId}/accept`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to accept transfer');
      }
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Transfer Accepted',
        description: data.message,
      });
      refetchIncoming();
      refetchOutgoing();
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setSelectedTransfer(null);
      setActionType(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ transferId, reason }: { transferId: string; reason?: string }) => {
      const response = await apiRequest('POST', `/api/finapay/pending/${transferId}/reject`, {
        reason,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to reject transfer');
      }
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Transfer Rejected',
        description: data.message,
      });
      refetchIncoming();
      refetchOutgoing();
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setSelectedTransfer(null);
      setActionType(null);
      setRejectionReason('');
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const payRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const response = await apiRequest('POST', `/api/finapay/requests/${requestId}/pay`, {
        payerId: user?.id,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to pay request');
      }
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Payment Sent',
        description: data.message || 'Payment request fulfilled successfully',
      });
      refetchRequests();
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setSelectedRequest(null);
      setActionType(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const declineRequestMutation = useMutation({
    mutationFn: async ({ requestId, reason }: { requestId: string; reason?: string }) => {
      const response = await apiRequest('POST', `/api/finapay/requests/${requestId}/decline`, {
        reason,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to decline request');
      }
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Request Declined',
        description: data.message || 'Payment request declined',
      });
      refetchRequests();
      setSelectedRequest(null);
      setActionType(null);
      setDeclineReason('');
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleAction = (transfer: PendingTransfer, action: 'accept' | 'reject') => {
    setSelectedTransfer(transfer);
    setActionType(action);
  };

  const handleRequestAction = (request: GoldRequest, action: 'pay' | 'decline') => {
    setSelectedRequest(request);
    setActionType(action);
  };

  const confirmAction = () => {
    if (selectedTransfer) {
      if (actionType === 'accept') {
        acceptMutation.mutate(selectedTransfer.id);
      } else if (actionType === 'reject') {
        rejectMutation.mutate({
          transferId: selectedTransfer.id,
          reason: rejectionReason || undefined,
        });
      }
    } else if (selectedRequest) {
      if (actionType === 'pay') {
        payRequestMutation.mutate(selectedRequest.id);
      } else if (actionType === 'decline') {
        declineRequestMutation.mutate({
          requestId: selectedRequest.id,
          reason: declineReason || undefined,
        });
      }
    }
  };

  const incomingTransfers = incomingData?.transfers || [];
  const outgoingTransfers = outgoingData?.transfers || [];
  const receivedRequests = (receivedRequestsData?.requests || []).filter(
    (r: GoldRequest) => r.status === 'Pending'
  );
  const pendingDeposits = (depositRequestsData?.requests || []).filter(
    (d: DepositRequest) => d.status === 'Pending'
  );

  if (loadingIncoming && loadingOutgoing && loadingRequests && loadingDeposits) {
    return (
      <Card className="border-border">
        <CardContent className="py-8 text-center">
          <Loader2 className="w-6 h-6 mx-auto animate-spin text-purple-500" />
          <p className="text-sm text-muted-foreground mt-2">Loading pending items...</p>
        </CardContent>
      </Card>
    );
  }

  if (incomingTransfers.length === 0 && outgoingTransfers.length === 0 && receivedRequests.length === 0 && pendingDeposits.length === 0) {
    return null;
  }

  const formatRequestAmount = (request: GoldRequest) => {
    const goldGrams = parseFloat(request.goldGrams);
    const usdValue = request.amountUsd ? parseFloat(request.amountUsd) : 0;
    return {
      primary: `${goldGrams.toFixed(4)}g Gold`,
      secondary: usdValue > 0 ? `≈ $${usdValue.toFixed(2)}` : null,
    };
  };

  const formatAmount = (transfer: PendingTransfer) => {
    const isGold = transfer.amountGold && parseFloat(transfer.amountGold) > 0;
    if (isGold) {
      const goldGrams = parseFloat(transfer.amountGold!);
      const usdValue = parseFloat(transfer.amountUsd);
      return {
        primary: `${goldGrams.toFixed(4)}g Gold`,
        secondary: `≈ $${usdValue.toFixed(2)}`,
      };
    }
    return {
      primary: `$${parseFloat(transfer.amountUsd).toFixed(2)}`,
      secondary: null,
    };
  };

  const getTimeRemaining = (expiresAt: string | null | undefined) => {
    if (!expiresAt) return null;
    const expires = new Date(expiresAt);
    if (expires < new Date()) return 'Expired';
    return `Expires ${formatDistanceToNow(expires, { addSuffix: true })}`;
  };

  const totalPendingItems = incomingTransfers.length + outgoingTransfers.length + receivedRequests.length + pendingDeposits.length;

  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-bold flex items-center gap-2 text-amber-700">
          <Clock className="w-5 h-5" />
          Pending Items
          <Badge variant="secondary" className="ml-2 bg-amber-200 text-amber-800">
            {totalPendingItems}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {incomingTransfers.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Incoming - Action Required</p>
            {incomingTransfers.map((transfer: PendingTransfer) => {
              const amount = formatAmount(transfer);
              const senderInfo = senderInfoMap[transfer.senderId];
              const senderName = senderInfo 
                ? `${senderInfo.firstName} ${senderInfo.lastName}` 
                : 'Loading...';
              const timeRemaining = getTimeRemaining(transfer.expiresAt);
              
              return (
                <div
                  key={transfer.id}
                  className="p-4 bg-white rounded-lg border border-amber-200 shadow-sm"
                  data-testid={`pending-transfer-incoming-${transfer.id}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-green-100 rounded-full">
                        <ArrowDownLeft className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-lg text-green-700">{amount.primary}</p>
                        {amount.secondary && (
                          <p className="text-sm text-muted-foreground">{amount.secondary}</p>
                        )}
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <User className="w-3 h-3" />
                          from {senderName}
                        </p>
                        {transfer.memo && (
                          <p className="text-sm text-muted-foreground italic mt-1">"{transfer.memo}"</p>
                        )}
                        {timeRemaining && (
                          <p className={`text-xs mt-1 ${timeRemaining === 'Expired' ? 'text-red-600' : 'text-amber-600'}`}>
                            <Clock className="w-3 h-3 inline mr-1" />
                            {timeRemaining}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleAction(transfer, 'accept')}
                        disabled={acceptMutation.isPending}
                        data-testid={`button-accept-${transfer.id}`}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-200 text-red-600 hover:bg-red-50"
                        onClick={() => handleAction(transfer, 'reject')}
                        disabled={rejectMutation.isPending}
                        data-testid={`button-reject-${transfer.id}`}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {outgoingTransfers.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Outgoing - Awaiting Approval</p>
            {outgoingTransfers.map((transfer: PendingTransfer) => {
              const amount = formatAmount(transfer);
              const timeRemaining = getTimeRemaining(transfer.expiresAt);
              const isInvitation = transfer.isInvite && !transfer.recipientId;
              
              return (
                <div
                  key={transfer.id}
                  className={`p-4 bg-white rounded-lg shadow-sm ${
                    isInvitation 
                      ? 'border-2 border-purple-300' 
                      : 'border border-gray-200 opacity-80'
                  }`}
                  data-testid={`pending-transfer-outgoing-${transfer.id}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-full ${
                      isInvitation ? 'bg-purple-100' : 'bg-blue-100'
                    }`}>
                      {isInvitation 
                        ? <Mail className="w-4 h-4 text-purple-600" />
                        : <Clock className="w-4 h-4 text-blue-600" />
                      }
                    </div>
                    <div className="flex-1">
                      <p className={`font-semibold text-lg ${
                        isInvitation ? 'text-purple-700' : 'text-blue-700'
                      }`}>{amount.primary}</p>
                      {amount.secondary && (
                        <p className="text-sm text-muted-foreground">{amount.secondary}</p>
                      )}
                      <p className="text-sm text-muted-foreground mt-1">
                        {isInvitation ? 'Invitation sent to' : 'Sent to'} {transfer.recipientIdentifier}
                      </p>
                      {transfer.memo && (
                        <p className="text-sm text-muted-foreground italic mt-1">"{transfer.memo}"</p>
                      )}
                      {isInvitation ? (
                        <Badge className="mt-2 bg-purple-100 text-purple-700 border border-purple-300">
                          <Mail className="w-3 h-3 mr-1" />
                          Awaiting registration
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="mt-2 text-amber-600 border-amber-300">
                          Awaiting recipient approval
                        </Badge>
                      )}
                      {timeRemaining && (
                        <div className={`flex items-center gap-1 text-xs mt-2 ${
                          timeRemaining === 'Expired' 
                            ? 'text-red-600' 
                            : isInvitation 
                              ? 'text-purple-600' 
                              : 'text-muted-foreground'
                        }`}>
                          <Timer className="w-3 h-3" />
                          {isInvitation && timeRemaining !== 'Expired' 
                            ? `24h invitation window - ${timeRemaining}`
                            : timeRemaining
                          }
                        </div>
                      )}
                      {isInvitation && timeRemaining !== 'Expired' && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Gold will be refunded if not claimed within 24 hours
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {pendingDeposits.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-emerald-700 flex items-center gap-2">
              <ArrowDownLeft className="w-4 h-4" />
              Add Funds - Awaiting Approval
            </p>
            {pendingDeposits.map((deposit: DepositRequest) => {
              const goldGrams = deposit.expectedGoldGrams ? parseFloat(deposit.expectedGoldGrams) : 0;
              const usdValue = parseFloat(deposit.amountUsd);
              
              return (
                <div
                  key={deposit.id}
                  className="p-4 bg-white rounded-lg border border-emerald-200 shadow-sm"
                  data-testid={`pending-deposit-${deposit.id}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-emerald-100 rounded-full">
                      <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-lg text-emerald-700">
                        {goldGrams > 0 ? `${goldGrams.toFixed(4)}g Gold` : `$${usdValue.toFixed(2)}`}
                      </p>
                      {goldGrams > 0 && (
                        <p className="text-sm text-muted-foreground">≈ ${usdValue.toFixed(2)}</p>
                      )}
                      <p className="text-sm text-muted-foreground mt-1">
                        via {deposit.paymentMethod} • {deposit.goldWalletType || 'LGPW'} Wallet
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Ref: {deposit.referenceNumber}
                      </p>
                      <Badge variant="outline" className="mt-2 text-amber-600 border-amber-300">
                        <Clock className="w-3 h-3 mr-1" />
                        Awaiting admin approval
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-2">
                        Submitted {formatDistanceToNow(new Date(deposit.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {receivedRequests.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-purple-700 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Payment Requests - Action Required
            </p>
            {receivedRequests.map((request: GoldRequest) => {
              const amount = formatRequestAmount(request);
              const requesterInfo = requesterInfoMap[request.requesterId];
              const requesterName = requesterInfo 
                ? `${requesterInfo.firstName} ${requesterInfo.lastName}` 
                : 'Loading...';
              const timeRemaining = getTimeRemaining(request.expiresAt);
              
              return (
                <div
                  key={request.id}
                  className="p-4 bg-white rounded-lg border border-purple-200 shadow-sm"
                  data-testid={`payment-request-${request.id}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-purple-100 rounded-full">
                        <DollarSign className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-lg text-purple-700">{amount.primary}</p>
                        {amount.secondary && (
                          <p className="text-sm text-muted-foreground">{amount.secondary}</p>
                        )}
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <User className="w-3 h-3" />
                          requested by {requesterName}
                        </p>
                        {request.reason && (
                          <p className="text-sm text-muted-foreground mt-1">
                            <span className="font-medium">Reason:</span> {request.reason}
                          </p>
                        )}
                        {request.memo && (
                          <p className="text-sm text-muted-foreground italic mt-1">"{request.memo}"</p>
                        )}
                        {request.attachmentName && (
                          <div className="mt-2">
                            <a
                              href={request.attachmentUrl || '#'}
                              download={request.attachmentName}
                              className="inline-flex items-center gap-1.5 text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-md hover:bg-purple-100 transition-colors"
                              onClick={(e) => {
                                if (request.attachmentUrl) {
                                  e.preventDefault();
                                  const link = document.createElement('a');
                                  link.href = request.attachmentUrl;
                                  link.download = request.attachmentName || 'attachment';
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                }
                              }}
                              data-testid={`link-attachment-${request.id}`}
                            >
                              <Paperclip className="w-3 h-3" />
                              <span className="max-w-32 truncate">{request.attachmentName}</span>
                              <Download className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                        {timeRemaining && (
                          <p className={`text-xs mt-1 ${timeRemaining === 'Expired' ? 'text-red-600' : 'text-amber-600'}`}>
                            <Clock className="w-3 h-3 inline mr-1" />
                            {timeRemaining}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700"
                        onClick={() => handleRequestAction(request, 'pay')}
                        disabled={payRequestMutation.isPending}
                        data-testid={`button-pay-${request.id}`}
                      >
                        <Send className="w-4 h-4 mr-1" />
                        Pay
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-200 text-red-600 hover:bg-red-50"
                        onClick={() => handleRequestAction(request, 'decline')}
                        disabled={declineRequestMutation.isPending}
                        data-testid={`button-decline-${request.id}`}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Decline
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={(!!selectedTransfer || !!selectedRequest) && !!actionType} onOpenChange={() => {
        setSelectedTransfer(null);
        setSelectedRequest(null);
        setActionType(null);
        setRejectionReason('');
        setDeclineReason('');
      }}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === 'accept' && (
                <>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Accept Transfer
                </>
              )}
              {actionType === 'reject' && (
                <>
                  <XCircle className="w-5 h-5 text-red-600" />
                  Reject Transfer
                </>
              )}
              {actionType === 'pay' && (
                <>
                  <Send className="w-5 h-5 text-purple-600" />
                  Pay Request
                </>
              )}
              {actionType === 'decline' && (
                <>
                  <XCircle className="w-5 h-5 text-red-600" />
                  Decline Request
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'accept' && 'Are you sure you want to accept this transfer? The funds will be added to your wallet.'}
              {actionType === 'reject' && 'Are you sure you want to reject this transfer? The sender will be refunded.'}
              {actionType === 'pay' && 'Are you sure you want to pay this request? The gold will be deducted from your wallet.'}
              {actionType === 'decline' && 'Are you sure you want to decline this request? The requester will be notified.'}
            </DialogDescription>
          </DialogHeader>

          {selectedTransfer && (
            <div className="py-4">
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <p className="font-semibold text-lg">
                  {formatAmount(selectedTransfer).primary}
                </p>
                {formatAmount(selectedTransfer).secondary && (
                  <p className="text-sm text-muted-foreground">
                    {formatAmount(selectedTransfer).secondary}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  From: {senderInfoMap[selectedTransfer.senderId]
                    ? `${senderInfoMap[selectedTransfer.senderId].firstName} ${senderInfoMap[selectedTransfer.senderId].lastName}`
                    : selectedTransfer.senderId}
                </p>
                {selectedTransfer.memo && (
                  <p className="text-sm italic text-muted-foreground">"{selectedTransfer.memo}"</p>
                )}
              </div>

              {actionType === 'reject' && (
                <div className="mt-4">
                  <label className="text-sm font-medium text-muted-foreground">
                    Reason for rejection (optional)
                  </label>
                  <Textarea
                    placeholder="Let the sender know why you're rejecting..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="mt-1"
                    data-testid="input-rejection-reason"
                  />
                </div>
              )}

              {actionType === 'accept' && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-green-800">
                    By accepting, you agree to receive these funds into your Finatrades wallet.
                  </p>
                </div>
              )}

              {actionType === 'reject' && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800">
                    The sender will be automatically refunded when you reject this transfer.
                  </p>
                </div>
              )}
            </div>
          )}

          {selectedRequest && (
            <div className="py-4">
              <div className="bg-purple-50 p-4 rounded-lg space-y-2">
                <p className="font-semibold text-lg text-purple-700">
                  {formatRequestAmount(selectedRequest).primary}
                </p>
                {formatRequestAmount(selectedRequest).secondary && (
                  <p className="text-sm text-muted-foreground">
                    {formatRequestAmount(selectedRequest).secondary}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  Requested by: {requesterInfoMap[selectedRequest.requesterId]
                    ? `${requesterInfoMap[selectedRequest.requesterId].firstName} ${requesterInfoMap[selectedRequest.requesterId].lastName}`
                    : 'Loading...'}
                </p>
                {selectedRequest.reason && (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">Reason:</span> {selectedRequest.reason}
                  </p>
                )}
                {selectedRequest.memo && (
                  <p className="text-sm italic text-muted-foreground">"{selectedRequest.memo}"</p>
                )}
              </div>

              {actionType === 'decline' && (
                <div className="mt-4">
                  <label className="text-sm font-medium text-muted-foreground">
                    Reason for declining (optional)
                  </label>
                  <Textarea
                    placeholder="Let the requester know why you're declining..."
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                    className="mt-1"
                    data-testid="input-decline-reason"
                  />
                </div>
              )}

              {actionType === 'pay' && (
                <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg flex items-start gap-2">
                  <Send className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-purple-800">
                    By paying, you agree to send gold from your Finatrades wallet to fulfill this request.
                  </p>
                </div>
              )}

              {actionType === 'decline' && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800">
                    The requester will be notified that you declined their payment request.
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedTransfer(null);
                setSelectedRequest(null);
                setActionType(null);
                setRejectionReason('');
                setDeclineReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmAction}
              disabled={acceptMutation.isPending || rejectMutation.isPending || payRequestMutation.isPending || declineRequestMutation.isPending}
              className={
                actionType === 'accept' ? 'bg-green-600 hover:bg-green-700' :
                actionType === 'pay' ? 'bg-purple-600 hover:bg-purple-700' :
                'bg-red-600 hover:bg-red-700'
              }
              data-testid={`button-confirm-${actionType}`}
            >
              {(acceptMutation.isPending || rejectMutation.isPending || payRequestMutation.isPending || declineRequestMutation.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {actionType === 'accept' && 'Accept Transfer'}
              {actionType === 'reject' && 'Reject Transfer'}
              {actionType === 'pay' && 'Pay Request'}
              {actionType === 'decline' && 'Decline Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
