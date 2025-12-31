import React, { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, CreditCard, Lock, AlertCircle, ExternalLink } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/queryClient';

interface IframeCardPaymentProps {
  amount: number;
  onSuccess: (result: { goldGrams: string; amountUsd: number }) => void;
  onError: (error: string) => void;
  onCancel: () => void;
}

export default function IframeCardPayment({ amount, onSuccess, onError, onCancel }: IframeCardPaymentProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [orderRef, setOrderRef] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    createOrder();
    
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const createOrder = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const returnUrl = `${window.location.origin}/api/ngenius/iframe-callback`;
      const cancelUrl = `${window.location.origin}/api/ngenius/iframe-cancel`;
      
      const res = await apiRequest('POST', '/api/ngenius/create-order', {
        userId: user.id,
        amount,
        currency: 'USD',
        returnUrl,
        cancelUrl,
        description: `FinaPay wallet deposit - $${amount.toFixed(2)}`,
      });
      
      const data = await res.json();
      
      if (data.paymentUrl) {
        setPaymentUrl(data.paymentUrl);
        setOrderRef(data.orderReference);
        startPolling(data.orderReference);
      } else {
        throw new Error("No payment URL received");
      }
    } catch (err: any) {
      setError(err.message || "Failed to create payment order");
    } finally {
      setLoading(false);
    }
  };

  const startPolling = (ref: string) => {
    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/ngenius/order/${ref}`);
        const data = await res.json();
        
        const status = data.ngeniusStatus || data.status;
        
        if (status === 'CAPTURED' || status === 'Captured' || status === 'PURCHASED') {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
          }
          onSuccess({
            goldGrams: data.amountGold || '0',
            amountUsd: amount
          });
        } else if (status === 'FAILED' || status === 'Failed' || status === 'CANCELLED' || status === 'Cancelled') {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
          }
          onError('Payment was not completed');
        }
      } catch (err) {
        console.log('Polling check failed, will retry...');
      }
    }, 3000);
  };

  if (loading) {
    return (
      <div className="py-12 text-center space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground">Setting up secure payment...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
        <div>
          <h3 className="text-lg font-bold text-foreground">Payment Error</h3>
          <p className="text-sm text-muted-foreground mt-2">{error}</p>
        </div>
        <div className="flex gap-3 justify-center">
          <Button onClick={onCancel} variant="outline">
            Go Back
          </Button>
          <Button onClick={createOrder}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center pb-2 border-b">
        <p className="text-2xl font-bold text-foreground">${amount.toFixed(2)} USD</p>
        <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
          <Lock className="w-3 h-3" />
          Secure card payment
        </p>
      </div>

      {paymentUrl && (
        <div className="relative">
          <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
            <CreditCard className="w-4 h-4" />
            <span>Enter your card details below</span>
          </div>
          
          <div className="border rounded-lg overflow-hidden bg-white" style={{ height: 'min(70vh, 600px)' }}>
            <iframe
              ref={iframeRef}
              src={paymentUrl}
              className="w-full h-full border-0"
              title="Secure Card Payment"
              sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-top-navigation"
              style={{ minHeight: '500px' }}
            />
          </div>
          
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
            <Lock className="w-3 h-3" />
            Payment processed by NGenius - your card details are secured
          </p>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button
          variant="outline"
          onClick={onCancel}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          variant="outline"
          onClick={() => window.open(paymentUrl || '', '_blank')}
          className="flex items-center gap-2"
        >
          <ExternalLink className="w-4 h-4" />
          Open in New Tab
        </Button>
      </div>
    </div>
  );
}
