import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CreditCard, Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface EmbeddedCardFormProps {
  amount: number;
  onSuccess: (result: { goldGrams: string; amountUsd: number }) => void;
  onError: (error: string) => void;
  onCancel: () => void;
}

declare global {
  interface Window {
    NI?: {
      mountCardInput: (
        elementId: string,
        config: {
          style?: any;
          apiKey: string;
          outletRef: string;
          onSuccess?: () => void;
          onFail?: (error: any) => void;
          onChangeValidStatus?: (status: {
            isCVVValid: boolean;
            isExpiryValid: boolean;
            isNameValid: boolean;
            isPanValid: boolean;
          }) => void;
        }
      ) => void;
      generateSessionId: () => Promise<string>;
      unmountCardInput?: () => void;
    };
  }
}

export default function EmbeddedCardForm({ amount, onSuccess, onError, onCancel }: EmbeddedCardFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [cardMounted, setCardMounted] = useState(false);
  const [sdkConfig, setSdkConfig] = useState<{
    apiKey: string;
    outletRef: string;
    sdkUrl: string;
  } | null>(null);
  const [formValid, setFormValid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const mountAttempted = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const configRes = await fetch('/api/ngenius/sdk-config');
        const config = await configRes.json();

        if (!config.enabled) {
          throw new Error('Card payments not available');
        }

        setSdkConfig(config);

        if (!document.querySelector(`script[src="${config.sdkUrl}"]`)) {
          const script = document.createElement('script');
          script.src = config.sdkUrl;
          script.async = true;
          script.onload = () => {
            setSdkLoaded(true);
          };
          script.onerror = () => setError('Failed to load payment SDK');
          document.body.appendChild(script);
        } else {
          setSdkLoaded(true);
        }

        setLoading(false);
      } catch (err: any) {
        setError(err.message || 'Failed to initialize payment');
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  useEffect(() => {
    if (!sdkLoaded || !sdkConfig || mountAttempted.current || !containerRef.current) return;

    const mountCardForm = () => {
      if (!window.NI) {
        setTimeout(mountCardForm, 200);
        return;
      }

      mountAttempted.current = true;

      try {
        window.NI.mountCardInput('ngenius-card-input', {
          apiKey: sdkConfig.apiKey,
          outletRef: sdkConfig.outletRef,
          style: {
            main: {
              margin: '0',
              padding: '0',
            },
            base: {
              color: '#1f2937',
              fontSize: '16px',
              fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              '::placeholder': {
                color: '#9ca3af',
              },
            },
            invalid: {
              color: '#dc2626',
            },
            input: {
              padding: '12px',
              borderRadius: '8px',
              borderColor: '#e5e7eb',
              backgroundColor: '#ffffff',
            },
          },
          onSuccess: () => {
            setCardMounted(true);
          },
          onFail: (err: any) => {
            console.error('Card mount failed:', err);
            if (!cardMounted) {
              setError('Failed to load card form. Please try again.');
            }
          },
          onChangeValidStatus: (status) => {
            const isValid = status.isPanValid && status.isExpiryValid && status.isCVVValid;
            setFormValid(isValid);
          },
        });
      } catch (err: any) {
        console.error('Mount error:', err);
      }
    };

    const timer = setTimeout(mountCardForm, 100);
    return () => clearTimeout(timer);
  }, [sdkLoaded, sdkConfig, cardMounted]);

  const handleSubmit = useCallback(async () => {
    if (!formValid || processing || !window.NI) return;

    setProcessing(true);
    setError(null);

    try {
      const sessionId = await window.NI.generateSessionId();
      
      const res = await fetch('/api/ngenius/process-hosted-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          sessionId,
          amount,
        }),
      });

      const result = await res.json();

      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess({
            goldGrams: result.goldGrams,
            amountUsd: result.amountUsd,
          });
        }, 1500);
      } else {
        throw new Error(result.message || 'Payment failed');
      }
    } catch (err: any) {
      const errorMsg = err?.message || 'Payment failed. Please try again.';
      setError(errorMsg);
      onError(errorMsg);
    } finally {
      setProcessing(false);
    }
  }, [formValid, processing, user?.id, amount, onSuccess, onError]);

  if (loading) {
    return (
      <div className="py-12 text-center space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground">Initializing secure payment...</p>
      </div>
    );
  }

  if (error && !processing && !cardMounted) {
    return (
      <div className="py-8 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
        <div>
          <h3 className="text-lg font-bold text-foreground">Payment Error</h3>
          <p className="text-sm text-muted-foreground mt-2">{error}</p>
        </div>
        <Button onClick={onCancel} variant="outline">
          Go Back
        </Button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="py-12 text-center space-y-4">
        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
        <div>
          <h3 className="text-lg font-bold text-foreground">Payment Successful!</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Your gold has been credited to your wallet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center pb-4 border-b">
        <p className="text-2xl font-bold text-foreground">${amount.toFixed(2)} USD</p>
        <p className="text-sm text-muted-foreground">Secure card payment</p>
      </div>

      <Card className="border-2">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-5 h-5 text-primary" />
            <span className="font-medium">Card Details</span>
            <Lock className="w-4 h-4 text-green-600 ml-auto" />
          </div>
          
          <div 
            ref={containerRef}
            id="ngenius-card-input" 
            className="min-h-[200px] border rounded-lg p-4 bg-background"
          >
            {!cardMounted && sdkLoaded && (
              <div className="flex items-center justify-center h-full min-h-[180px]">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>

          {error && cardMounted && (
            <p className="text-sm text-destructive mt-2">{error}</p>
          )}

          <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
            <Lock className="w-3 h-3" />
            Your card details are encrypted and processed securely
          </p>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={processing}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!formValid || processing}
          className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600"
        >
          {processing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4 mr-2" />
              Pay ${amount.toFixed(2)}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
