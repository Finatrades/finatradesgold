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
import { Clock, ArrowDownLeft, CheckCircle, XCircle, Loader2, User, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface PendingTransfer {
  id: string;
  referenceNumber: string;
  senderId: string;
  recipientId: string;
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
}

interface UserInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export default function PendingTransfers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedTransfer, setSelectedTransfer] = useState<PendingTransfer | null>(null);
  const [actionType, setActionType] = useState<'accept' | 'reject' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [senderInfoMap, setSenderInfoMap] = useState<Record<string, UserInfo>>({});

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
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
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

  const handleAction = (transfer: PendingTransfer, action: 'accept' | 'reject') => {
    setSelectedTransfer(transfer);
    setActionType(action);
  };

  const confirmAction = () => {
    if (!selectedTransfer) return;
    
    if (actionType === 'accept') {
      acceptMutation.mutate(selectedTransfer.id);
    } else if (actionType === 'reject') {
      rejectMutation.mutate({
        transferId: selectedTransfer.id,
        reason: rejectionReason || undefined,
      });
    }
  };

  const incomingTransfers = incomingData?.transfers || [];
  const outgoingTransfers = outgoingData?.transfers || [];

  if (loadingIncoming && loadingOutgoing) {
    return (
      <Card className="border-border">
        <CardContent className="py-8 text-center">
          <Loader2 className="w-6 h-6 mx-auto animate-spin text-purple-500" />
          <p className="text-sm text-muted-foreground mt-2">Loading pending transfers...</p>
        </CardContent>
      </Card>
    );
  }

  if (incomingTransfers.length === 0 && outgoingTransfers.length === 0) {
    return null;
  }

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

  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-bold flex items-center gap-2 text-amber-700">
          <Clock className="w-5 h-5" />
          Pending Transfers
          <Badge variant="secondary" className="ml-2 bg-amber-200 text-amber-800">
            {incomingTransfers.length + outgoingTransfers.length}
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
              
              return (
                <div
                  key={transfer.id}
                  className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm opacity-80"
                  data-testid={`pending-transfer-outgoing-${transfer.id}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-100 rounded-full">
                      <Clock className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-lg text-blue-700">{amount.primary}</p>
                      {amount.secondary && (
                        <p className="text-sm text-muted-foreground">{amount.secondary}</p>
                      )}
                      <p className="text-sm text-muted-foreground mt-1">
                        Sent to {transfer.recipientIdentifier}
                      </p>
                      {transfer.memo && (
                        <p className="text-sm text-muted-foreground italic mt-1">"{transfer.memo}"</p>
                      )}
                      <Badge variant="outline" className="mt-2 text-amber-600 border-amber-300">
                        Awaiting recipient approval
                      </Badge>
                      {timeRemaining && (
                        <p className={`text-xs mt-1 ${timeRemaining === 'Expired' ? 'text-red-600' : 'text-muted-foreground'}`}>
                          <Clock className="w-3 h-3 inline mr-1" />
                          {timeRemaining}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={!!selectedTransfer && !!actionType} onOpenChange={() => {
        setSelectedTransfer(null);
        setActionType(null);
        setRejectionReason('');
      }}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === 'accept' ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Accept Transfer
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-red-600" />
                  Reject Transfer
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'accept'
                ? 'Are you sure you want to accept this transfer? The funds will be added to your wallet.'
                : 'Are you sure you want to reject this transfer? The sender will be refunded.'}
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

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedTransfer(null);
                setActionType(null);
                setRejectionReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmAction}
              disabled={acceptMutation.isPending || rejectMutation.isPending}
              className={actionType === 'accept' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
              data-testid={`button-confirm-${actionType}`}
            >
              {(acceptMutation.isPending || rejectMutation.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {actionType === 'accept' ? 'Accept Transfer' : 'Reject Transfer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
