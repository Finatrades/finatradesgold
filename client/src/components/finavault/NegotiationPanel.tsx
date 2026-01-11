import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  MessageSquare, 
  Check, 
  X, 
  RefreshCw, 
  Clock, 
  DollarSign,
  Scale,
  AlertCircle,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { format } from 'date-fns';

interface NegotiationMessage {
  id: string;
  depositRequestId: string;
  messageType: string;
  senderId: number;
  senderRole: 'user' | 'admin';
  proposedGrams?: string;
  proposedPurity?: string;
  proposedFees?: string;
  goldPriceAtTime?: string;
  message?: string;
  createdAt: string;
  isLatest: boolean;
}

interface NegotiationPanelProps {
  depositId: string;
  depositStatus: string;
  requiresNegotiation: boolean;
  usdEstimateFromUser?: string;
  usdCounterFromAdmin?: string;
  usdAgreedValue?: string;
  onNegotiationUpdate?: () => void;
}

export default function NegotiationPanel({
  depositId,
  depositStatus,
  requiresNegotiation,
  usdEstimateFromUser,
  usdCounterFromAdmin,
  usdAgreedValue,
  onNegotiationUpdate,
}: NegotiationPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [counterGrams, setCounterGrams] = useState('');
  const [counterFees, setCounterFees] = useState('');
  const [responseMessage, setResponseMessage] = useState('');
  const [showCounterForm, setShowCounterForm] = useState(false);

  const { data: messagesData, isLoading } = useQuery({
    queryKey: ['negotiation-messages', depositId],
    queryFn: async () => {
      const res = await fetch(`/api/physical-deposits/deposits/${depositId}/negotiation`, {
        credentials: 'include',
      });
      if (!res.ok) return { messages: [] };
      return res.json();
    },
    enabled: requiresNegotiation && ['NEGOTIATION', 'AGREED'].includes(depositStatus),
  });

  const respondMutation = useMutation({
    mutationFn: async (data: { action: string; counterGrams?: number; counterFees?: number; message?: string }) => {
      const res = await fetch(`/api/physical-deposits/deposits/${depositId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to respond');
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.action === 'ACCEPT' ? 'Offer Accepted' : data.action === 'REJECT' ? 'Offer Rejected' : 'Counter Sent',
        description: data.action === 'ACCEPT' 
          ? 'The agreed value has been confirmed.' 
          : data.action === 'REJECT'
            ? 'Your deposit request has been cancelled.'
            : 'Your counter-offer has been sent to the admin.',
      });
      queryClient.invalidateQueries({ queryKey: ['negotiation-messages', depositId] });
      queryClient.invalidateQueries({ queryKey: ['physical-deposits'] });
      setShowCounterForm(false);
      setCounterGrams('');
      setCounterFees('');
      setResponseMessage('');
      onNegotiationUpdate?.();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const messages: NegotiationMessage[] = messagesData?.messages || [];
  const latestMessage = messages.find(m => m.isLatest);
  const isUserTurn = latestMessage?.senderRole === 'admin';
  const isAgreed = depositStatus === 'AGREED';

  const handleAccept = () => {
    respondMutation.mutate({ action: 'ACCEPT', message: responseMessage });
  };

  const handleReject = () => {
    if (window.confirm('Are you sure you want to reject this offer? Your deposit request will be cancelled.')) {
      respondMutation.mutate({ action: 'REJECT', message: responseMessage });
    }
  };

  const handleCounter = () => {
    if (!counterGrams) {
      toast({ title: 'Missing Information', description: 'Please enter your counter-offer in grams', variant: 'destructive' });
      return;
    }
    respondMutation.mutate({
      action: 'COUNTER',
      counterGrams: parseFloat(counterGrams),
      counterFees: counterFees ? parseFloat(counterFees) : undefined,
      message: responseMessage,
    });
  };

  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'ADMIN_OFFER': return <DollarSign className="w-4 h-4 text-purple-500" />;
      case 'USER_ACCEPT': case 'ADMIN_ACCEPT': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'USER_REJECT': return <X className="w-4 h-4 text-red-500" />;
      case 'USER_COUNTER': return <RefreshCw className="w-4 h-4 text-amber-500" />;
      default: return <MessageSquare className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatMessageType = (type: string) => {
    switch (type) {
      case 'ADMIN_OFFER': return 'Valuation Offer';
      case 'USER_ACCEPT': return 'Accepted';
      case 'USER_COUNTER': return 'Counter-Offer';
      case 'USER_REJECT': return 'Rejected';
      case 'ADMIN_ACCEPT': return 'Admin Accepted';
      default: return type;
    }
  };

  if (!requiresNegotiation) {
    return null;
  }

  if (!['NEGOTIATION', 'AGREED'].includes(depositStatus)) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-amber-600" />
            <div>
              <p className="font-medium text-amber-800">Awaiting Inspection</p>
              <p className="text-sm text-amber-700">
                Your gold will be inspected and assayed. After that, you'll receive a valuation offer.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={isAgreed ? "border-green-200" : "border-purple-200"}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Scale className="w-5 h-5" />
            Price Negotiation
          </CardTitle>
          <Badge variant={isAgreed ? "default" : "outline"} className={isAgreed ? "bg-green-500" : ""}>
            {isAgreed ? 'Agreed' : isUserTurn ? 'Your Turn' : 'Awaiting Response'}
          </Badge>
        </div>
        {usdAgreedValue && (
          <CardDescription className="text-green-700 font-medium">
            Agreed Value: ${parseFloat(usdAgreedValue).toLocaleString()}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {usdEstimateFromUser && (
          <div className="p-3 bg-gray-50 rounded-lg text-sm">
            <span className="text-gray-600">Your initial estimate:</span>
            <span className="ml-2 font-medium">${parseFloat(usdEstimateFromUser).toLocaleString()}</span>
          </div>
        )}

        {usdCounterFromAdmin && !isAgreed && (
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-purple-800 font-medium">Current Offer:</span>
              <span className="text-xl font-bold text-purple-900">${parseFloat(usdCounterFromAdmin).toLocaleString()}</span>
            </div>
          </div>
        )}

        <Separator />

        <div className="space-y-3">
          <Label className="text-sm font-medium text-gray-700">Negotiation History</Label>
          {isLoading ? (
            <div className="text-center py-4 text-gray-500">Loading...</div>
          ) : messages.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              No messages yet. Awaiting admin valuation.
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3 rounded-lg ${
                    msg.senderRole === 'admin' 
                      ? 'bg-purple-50 border-l-4 border-purple-400' 
                      : 'bg-gray-50 border-l-4 border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {getMessageIcon(msg.messageType)}
                      <span className="font-medium text-sm">
                        {msg.senderRole === 'admin' ? 'Admin' : 'You'}: {formatMessageType(msg.messageType)}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {format(new Date(msg.createdAt), 'MMM d, h:mm a')}
                    </span>
                  </div>
                  
                  {(msg.proposedGrams || msg.proposedFees) && (
                    <div className="text-sm text-gray-700 mt-1">
                      {msg.proposedGrams && <span className="mr-3">Gold: {msg.proposedGrams}g</span>}
                      {msg.proposedFees && <span>Fees: {msg.proposedFees}%</span>}
                    </div>
                  )}
                  
                  {msg.message && (
                    <p className="text-sm text-gray-600 mt-1 italic">"{msg.message}"</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {isUserTurn && !isAgreed && latestMessage?.messageType === 'ADMIN_OFFER' && (
          <>
            <Separator />
            
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-purple-700">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Action Required: Respond to the offer</span>
              </div>

              {!showCounterForm ? (
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    onClick={handleAccept} 
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    disabled={respondMutation.isPending}
                    data-testid="button-accept-offer"
                  >
                    <Check className="w-4 h-4 mr-2" /> Accept Offer
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setShowCounterForm(true)}
                    className="flex-1"
                    disabled={respondMutation.isPending}
                    data-testid="button-show-counter"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" /> Counter
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={handleReject}
                    disabled={respondMutation.isPending}
                    data-testid="button-reject-offer"
                  >
                    <X className="w-4 h-4 mr-2" /> Reject
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium">Your Counter-Offer</h4>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Gold (grams)</Label>
                      <Input
                        type="number"
                        step="0.0001"
                        value={counterGrams}
                        onChange={(e) => setCounterGrams(e.target.value)}
                        placeholder="e.g., 100.5"
                        data-testid="input-counter-grams"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Processing Fee (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={counterFees}
                        onChange={(e) => setCounterFees(e.target.value)}
                        placeholder="e.g., 1.5"
                        data-testid="input-counter-fees"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <Label className="text-xs">Message (optional)</Label>
                    <Textarea
                      value={responseMessage}
                      onChange={(e) => setResponseMessage(e.target.value)}
                      placeholder="Add a note to support your counter-offer..."
                      rows={2}
                      data-testid="input-counter-message"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      onClick={handleCounter}
                      disabled={respondMutation.isPending}
                      className="flex-1"
                      data-testid="button-submit-counter"
                    >
                      <ArrowRight className="w-4 h-4 mr-2" />
                      {respondMutation.isPending ? 'Sending...' : 'Send Counter-Offer'}
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => setShowCounterForm(false)}
                      disabled={respondMutation.isPending}
                      data-testid="button-cancel-counter"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {isAgreed && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">Negotiation Complete</span>
            </div>
            <p className="text-sm text-green-600 mt-1">
              Both parties have agreed on the valuation. Your deposit is being processed.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
