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
  const [awaiting3DS, setAwaiting3DS] = useState(false);
  const [threeDSOrderRef, setThreeDSOrderRef] = useState<string | null>(null);
  const [pendingPaymentResponse, setPendingPaymentResponse] = useState<any>(null);
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
        headers: { 
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include',
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
            main: { 
              margin: '0', 
              padding: '16px',
              backgroundColor: '#ffffff',
              boxSizing: 'border-box',
              maxWidth: '100%',
              width: '100%',
              overflow: 'hidden',
            },
            base: {
              color: '#1f2937',
              fontSize: '15px',
              fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
              fontWeight: '500',
              lineHeight: '1.5',
              boxSizing: 'border-box',
              '::placeholder': { 
                color: '#9ca3af',
                fontWeight: '400',
              },
            },
            invalid: { 
              color: '#dc2626',
              borderColor: '#dc2626',
            },
            valid: {
              color: '#059669',
              borderColor: '#10b981',
            },
            input: {
              padding: '14px',
              height: '48px',
              borderRadius: '10px',
              borderColor: '#d1d5db',
              borderWidth: '1.5px',
              backgroundColor: '#f9fafb',
              marginBottom: '12px',
              boxSizing: 'border-box',
              width: '100%',
              maxWidth: '100%',
            },
            cardNumber: {
              marginBottom: '16px',
              width: '100%',
            },
            expiry: {
              marginRight: '8px',
              flex: '1',
              minWidth: '0',
            },
            cvv: {
              flex: '1',
              minWidth: '0',
            },
            label: {
              fontSize: '12px',
              fontWeight: '600',
              color: '#4b5563',
              marginBottom: '6px',
              display: 'block',
            },
            row: {
              display: 'flex',
              gap: '12px',
              width: '100%',
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

  useEffect(() => {
    if (!awaiting3DS || !pendingPaymentResponse) return;

    const handle3DSChallenge = async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const container = document.getElementById('threeds-challenge-container');
      if (!container) {
        console.error('[NGenius] 3DS container not found');
        setError('3D Secure setup failed. Please try again.');
        setAwaiting3DS(false);
        setPendingPaymentResponse(null);
        return;
      }

      const NI = (window as any).NI;
      if (!NI?.handlePaymentResponse) {
        console.error('[NGenius] handlePaymentResponse not available');
        setError('3D Secure not supported. Please try again.');
        setAwaiting3DS(false);
        setPendingPaymentResponse(null);
        return;
      }

      try {
        console.log('[NGenius] Calling handlePaymentResponse...');
        const outcomePromise = NI.handlePaymentResponse(
          pendingPaymentResponse,
          {
            mountId: 'threeds-challenge-container',
            style: {
              width: 400,
              height: 500
            }
          }
        );

        const outcome = await outcomePromise;
        console.log('[NGenius] 3DS outcome:', outcome);

        if (outcome?.status === 'SUCCESS' || outcome?.status === 'CAPTURED' || outcome?.status === 'AUTHORISED') {
          try {
            const finalizeRes = await fetch(`/api/ngenius/order/${threeDSOrderRef}`);
            const finalData = await finalizeRes.json();
            console.log('[NGenius] Payment finalized:', finalData);
          } catch (err) {
            console.error('[NGenius] Finalize call failed:', err);
          }
          
          setSuccess(true);
          setTimeout(() => {
            onSuccess({
              goldGrams: '0',
              amountUsd: amount,
            });
          }, 1500);
        } else if (outcome?.status === 'FAILED' || outcome?.status === 'CANCELLED' || outcome?.status === 'ERROR') {
          setError('3D Secure verification failed. Please try again.');
          setAwaiting3DS(false);
          setPendingPaymentResponse(null);
        } else {
          if (threeDSOrderRef) {
            startPolling(threeDSOrderRef);
          }
          setError('Please wait while we confirm your payment...');
        }
      } catch (err: any) {
        console.error('[NGenius] 3DS error:', err);
        setError(err?.message || '3D Secure verification failed');
        setAwaiting3DS(false);
        setPendingPaymentResponse(null);
      }
    };

    handle3DSChallenge();
  }, [awaiting3DS, pendingPaymentResponse]);

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
      let sessionId: string;
      try {
        console.log('[NGenius] Generating session ID...');
        const sessionResult = await NI.generateSessionId();
        console.log('[NGenius] Session result:', sessionResult);
        // NGenius SDK returns an object with sessionId property
        sessionId = typeof sessionResult === 'string' ? sessionResult : sessionResult?.sessionId || sessionResult?.session_id || sessionResult;
        console.log('[NGenius] Session ID extracted:', sessionId);
        if (!sessionId || typeof sessionId !== 'string') {
          throw new Error('Invalid session ID received from payment system');
        }
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
        headers: { 
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include',
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
      } else if (result.requires3DS && result.paymentResponse) {
        console.log('[NGenius] 3DS authentication required, setting up SDK handler...');
        setThreeDSOrderRef(result.orderReference);
        setPendingPaymentResponse(result.paymentResponse);
        setAwaiting3DS(true);
        toast.info('Please complete 3D Secure verification');
        return;
      } else if (result.requires3DS && result.threeDSUrl) {
        console.log('[NGenius] 3DS URL fallback...');
        toast.info('Please complete 3D Secure verification in the new window');
        setThreeDSOrderRef(result.orderReference);
        const popup = window.open(result.threeDSUrl, '_blank', 'width=500,height=600,scrollbars=yes');
        if (!popup) {
          window.location.href = result.threeDSUrl;
        }
        startPolling(result.orderReference);
        setError('Please complete 3D Secure verification in the popup window. Once completed, your payment will be processed.');
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
        <CheckCircle2 className="w-16 h-16 text-success mx-auto" />
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
              <Lock className="w-4 h-4 text-success ml-auto" />
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
          <Button disabled className="flex-1 bg-primary opacity-50">
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
      <div className="flex flex-col gap-4 w-full max-w-full overflow-hidden">
        <div className="text-center pb-2">
          <p className="text-xl font-bold text-foreground">${amount.toFixed(2)} USD</p>
          <p className="text-sm text-muted-foreground">Enter your card details below</p>
        </div>

        <div className="border rounded-lg overflow-hidden bg-white w-full" style={{ height: '380px', maxWidth: '100%' }}>
          <iframe
            src={paymentUrl}
            className="w-full h-full border-0"
            title="Secure Payment"
            allow="payment"
            style={{ maxWidth: '100%' }}
          />
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel} className="flex-1 h-11">
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={() => window.open(paymentUrl, '_blank')}
            className="flex-1 h-11"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Open in New Tab
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
          <Lock className="w-3 h-3" />
          Complete the payment above. Your wallet will be credited automatically.
        </p>
      </div>
    );
  }

  if (awaiting3DS) {
    return (
      <div className="space-y-4">
        <div className="text-center pb-2">
          <p className="text-xl font-bold text-foreground">${amount.toFixed(2)} USD</p>
          <p className="text-sm text-muted-foreground">Complete 3D Secure verification</p>
        </div>

        <Card className="border-2">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Lock className="w-5 h-5 text-primary" />
              <span className="font-medium">3D Secure Verification</span>
            </div>
            
            <div 
              id="threeds-challenge-container" 
              className="border rounded-lg bg-white overflow-hidden flex items-center justify-center"
              style={{ minHeight: '500px' }}
            >
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>

            {error && (
              <p className="text-sm text-warning mt-2">{error}</p>
            )}

            <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
              <Lock className="w-3 h-3" />
              Complete the verification in the window above
            </p>
          </CardContent>
        </Card>

        <Button
          variant="outline"
          onClick={onCancel}
          className="w-full"
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full max-w-full overflow-hidden">
      {/* Card Form - Enlarged with Modern Styling */}
      <Card className="border-2 shadow-xl bg-card w-full overflow-hidden">
        <CardContent className="p-4 sm:p-6 md:p-8 overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-lg sm:text-xl block">Card Details</span>
              <p className="text-xs sm:text-sm text-muted-foreground">Enter your payment information</p>
            </div>
            <div className="flex items-center gap-1.5 bg-success-muted px-2 sm:px-3 py-1 sm:py-1.5 rounded-full shrink-0">
              <Lock className="w-3 h-3 sm:w-4 sm:h-4 text-success" />
              <span className="text-xs sm:text-sm font-medium text-success">Secure</span>
            </div>
          </div>
          
          <div 
            ref={containerRef}
            id="hybrid-card-input" 
            className="border-2 border-border rounded-2xl bg-white shadow-lg overflow-hidden"
            style={{ minHeight: '200px', maxWidth: '100%', width: '100%' }}
          >
            {!cardMounted && (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <div className="text-center space-y-2">
                  <p className="text-sm font-medium text-foreground">Loading secure payment form...</p>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    Please wait while we set up your secure payment. Do not refresh or leave this page.
                  </p>
                </div>
              </div>
            )}
          </div>

          {error && cardMounted && (
            <p className="text-sm text-destructive mt-4">{error}</p>
          )}

          <p className="text-xs sm:text-sm text-muted-foreground mt-4 flex items-center gap-2">
            <Lock className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
            <span>Your card details are encrypted with 256-bit SSL and processed securely</span>
          </p>
        </CardContent>
      </Card>

      {/* Modern Slider-Style Order Summary */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-muted-foreground">Order Summary</span>
          <div className="flex items-center gap-1.5">
            <Lock className="w-3 h-3 text-success" />
            <span className="text-xs text-muted-foreground">SSL Protected</span>
          </div>
        </div>
        
        {/* Modern Progress Slider Bar */}
        <div className="relative h-2 bg-muted rounded-full overflow-hidden mb-4">
          <div 
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-500"
            style={{ width: formValid ? '100%' : '60%' }}
          />
          <div className="absolute inset-y-0 right-0 w-3 h-3 -mt-0.5 bg-primary rounded-full shadow-lg border-2 border-white" 
               style={{ right: formValid ? '0%' : '40%' }} />
        </div>
        
        {/* Summary Chips */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-full">
            <span className="text-xs text-muted-foreground">Amount</span>
            <span className="text-sm font-semibold">${amount.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-full">
            <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-sm font-medium">Card</span>
          </div>
          <div className="ml-auto">
            <span className="text-xl font-bold text-primary">${amount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={processing}
          className="flex-1 h-12"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!formValid || processing}
          className="flex-1 h-12 bg-primary text-base font-semibold"
        >
          {processing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="w-5 h-5 mr-2" />
              Pay ${amount.toFixed(2)}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
