import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CreditCard, Lock, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

interface HybridCardPaymentProps {
  amount: number;
  onSuccess: (result: { goldGrams: string; amountUsd: number }) => void;
  onError: (error: string) => void;
  onCancel: () => void;
}


export default function HybridCardPayment({ amount, onSuccess, onError, onCancel }: HybridCardPaymentProps) {
  const { user } = useAuth();
  const [mode, setMode] = useState<'checking' | 'embedded' | 'iframe'>('checking');
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [orderRef, setOrderRef] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [cardMounted, setCardMounted] = useState(false);
  const [formValid, setFormValid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [sdkConfig, setSdkConfig] = useState<any>(null);
  const mountAttempted = useRef(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      // Cleanup NGenius SDK on unmount
      if ((window as any).NI?.unmountCardInput) {
        try {
          (window as any).NI.unmountCardInput();
        } catch (e) {
          // Ignore unmount errors
        }
      }
    };
  }, []);

  useEffect(() => {
    const checkSDK = async () => {
      const timeout = setTimeout(() => {
        if (!cardMounted && mode === 'checking') {
          switchToIframe();
        }
      }, 2000);

      try {
        const configRes = await fetch('/api/ngenius/sdk-config');
        const config = await configRes.json();
        
        if (!config.enabled) {
          clearTimeout(timeout);
          switchToIframe();
          return;
        }

        setSdkConfig(config);

        if (window.NI) {
          clearTimeout(timeout);
          setMode('embedded');
        } else {
          const checkInterval = setInterval(() => {
            if (window.NI) {
              clearInterval(checkInterval);
              clearTimeout(timeout);
              setMode('embedded');
            }
          }, 100);

          setTimeout(() => {
            clearInterval(checkInterval);
            if (!window.NI && mode === 'checking') {
              clearTimeout(timeout);
              switchToIframe();
            }
          }, 2000);
        }
      } catch (err) {
        clearTimeout(timeout);
        switchToIframe();
      }
    };

    checkSDK();
  }, []);

  const switchToIframe = async () => {
    setMode('iframe');
    toast.info('Loading payment page...', { duration: 2000 });
    
    try {
      const res = await fetch('/api/ngenius/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          amount,
          currency: 'USD',
        }),
      });
      
      const data = await res.json();
      
      if (data.paymentUrl) {
        setPaymentUrl(data.paymentUrl);
        setOrderRef(data.orderReference);
        startPolling(data.orderReference);
      } else {
        throw new Error("Failed to create payment");
      }
    } catch (err: any) {
      setError(err.message || "Failed to create payment order");
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
          setSuccess(true);
          setTimeout(() => {
            onSuccess({
              goldGrams: data.amountGold || '0',
              amountUsd: amount
            });
          }, 1500);
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

  useEffect(() => {
    if (mode !== 'embedded' || !sdkConfig || mountAttempted.current || !containerRef.current) return;

    const mountCardForm = () => {
      const NI = (window as any).NI;
      if (!NI) {
        setTimeout(mountCardForm, 100);
        return;
      }

      mountAttempted.current = true;

      // Unmount any existing card input first
      if (NI.unmountCardInput) {
        try {
          NI.unmountCardInput();
        } catch (e) {
          // Ignore unmount errors
        }
      }

      try {
        NI.mountCardInput('hybrid-card-input', {
          apiKey: sdkConfig.apiKey,
          outletRef: sdkConfig.outletRef,
          style: {
            main: { margin: '0', padding: '0' },
            base: {
              color: '#1f2937',
              fontSize: '16px',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              '::placeholder': { color: '#9ca3af' },
            },
            invalid: { color: '#dc2626' },
            input: {
              padding: '12px',
              borderRadius: '8px',
              borderColor: '#e5e7eb',
              backgroundColor: '#ffffff',
            },
          },
          onSuccess: () => setCardMounted(true),
          onFail: () => switchToIframe(),
          onChangeValidStatus: (status: any) => {
            console.log('[NGenius] Validation status:', status);
            setFormValid(status.isPanValid && status.isExpiryValid && status.isCVVValid);
          },
        });
      } catch (err) {
        switchToIframe();
      }
    };

    setTimeout(mountCardForm, 50);
  }, [mode, sdkConfig]);

  const handleSubmit = useCallback(async () => {
    const NI = (window as any).NI;
    if (!NI) {
      toast.error('Payment system not ready. Please wait...');
      return;
    }
    
    if (!formValid) {
      toast.error('Please complete all card fields correctly');
      return;
    }
    
    if (processing) return;

    setProcessing(true);
    setError(null);

    try {
      let sessionId;
      try {
        console.log('[NGenius] Generating session ID...');
        sessionId = await NI.generateSessionId();
        console.log('[NGenius] Session ID generated:', sessionId ? 'success' : 'empty');
      } catch (sessionError: any) {
        console.error('[NGenius] Session generation failed:', sessionError);
        const errorMsg = sessionError?.message || sessionError?.toString() || 'Card validation failed';
        console.error('[NGenius] Error message:', errorMsg);
        
        // Try to get more info from the SDK
        if (NI.getCardInfo) {
          try {
            const cardInfo = NI.getCardInfo();
            console.log('[NGenius] Card info:', cardInfo);
          } catch (e) {
            console.log('[NGenius] Could not get card info');
          }
        }
        
        if (errorMsg.includes('invalid values') || errorMsg.includes('validation') || errorMsg.includes('Invalid')) {
          throw new Error('Card validation failed. Please ensure all fields are filled correctly.');
        }
        throw new Error(errorMsg);
      }
      
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
      const errorMessage = err?.message || 'Payment failed. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setProcessing(false);
    }
  }, [formValid, processing, user?.id, amount, onSuccess, onError]);

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

  if (mode === 'checking') {
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
            
            <div className="space-y-4 animate-pulse">
              <div>
                <div className="h-4 w-24 bg-gray-200 rounded mb-2"></div>
                <div className="h-12 bg-gray-100 rounded-lg border"></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="h-4 w-16 bg-gray-200 rounded mb-2"></div>
                  <div className="h-12 bg-gray-100 rounded-lg border"></div>
                </div>
                <div>
                  <div className="h-4 w-12 bg-gray-200 rounded mb-2"></div>
                  <div className="h-12 bg-gray-100 rounded-lg border"></div>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Preparing secure payment...
            </p>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button disabled className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 opacity-50">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Loading...
          </Button>
        </div>
      </div>
    );
  }

  if (mode === 'iframe') {
    if (error) {
      return (
        <div className="py-8 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
          <div>
            <h3 className="text-lg font-bold text-foreground">Payment Error</h3>
            <p className="text-sm text-muted-foreground mt-2">{error}</p>
          </div>
          <Button onClick={onCancel} variant="outline">Go Back</Button>
        </div>
      );
    }

    if (!paymentUrl) {
      return (
        <div className="py-12 text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Creating payment...</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="text-center pb-2">
          <p className="text-xl font-bold text-foreground">${amount.toFixed(2)} USD</p>
          <p className="text-sm text-muted-foreground">Enter your card details below</p>
        </div>

        <div className="border rounded-lg overflow-hidden bg-white" style={{ height: '400px' }}>
          <iframe
            src={paymentUrl}
            className="w-full h-full border-0"
            title="Secure Payment"
            allow="payment"
          />
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={() => window.open(paymentUrl, '_blank')}
            className="flex-1"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Open in New Tab
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Complete the payment above. Your wallet will be credited automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Left Panel - Order Summary */}
      <div className="space-y-4">
        <Card className="border-2 bg-gradient-to-br from-orange-50 to-amber-50">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-lg mb-4">Order Summary</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-medium">${amount.toFixed(2)} USD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment Method</span>
                <span className="font-medium flex items-center gap-1">
                  <CreditCard className="w-4 h-4" />
                  Card
                </span>
              </div>
              <div className="border-t pt-3 mt-3">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">${amount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Lock className="w-4 h-4 text-green-600" />
          <span>256-bit SSL Encrypted</span>
        </div>
      </div>

      {/* Right Panel - Card Form */}
      <div className="space-y-4">
        <Card className="border-2">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-5 h-5 text-primary" />
              <span className="font-medium">Card Details</span>
              <Lock className="w-4 h-4 text-green-600 ml-auto" />
            </div>
            
            <div 
              ref={containerRef}
              id="hybrid-card-input" 
              className="border rounded-lg bg-white overflow-hidden"
              style={{ minHeight: cardMounted ? 'auto' : '120px' }}
            >
              {!cardMounted && (
                <div className="flex items-center justify-center py-12">
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
    </div>
  );
}
