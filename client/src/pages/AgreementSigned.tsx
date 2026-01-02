import React, { useEffect, useState } from 'react';
import { useLocation, useSearch } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Clock, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

type SigningStatus = 'loading' | 'success' | 'declined' | 'error' | 'pending';

export default function AgreementSigned() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const { refreshUser } = useAuth();
  const [status, setStatus] = useState<SigningStatus>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const kycId = params.get('kycId');
    const kycType = params.get('kycType');
    const event = params.get('event');

    if (!kycId || !kycType) {
      setStatus('error');
      setMessage('Invalid callback parameters');
      return;
    }

    if (event === 'signing_complete') {
      handleSigningComplete(kycId, kycType);
    } else if (event === 'decline') {
      setStatus('declined');
      setMessage('You have declined to sign the agreement. You can sign it later from your KYC status page.');
    } else if (event === 'cancel') {
      setStatus('pending');
      setMessage('Signing was cancelled. You can continue signing later.');
    } else if (event === 'ttl_expired') {
      setStatus('pending');
      setMessage('Your signing session expired. You can request a new signing link.');
    } else {
      checkAgreementStatus(kycId, kycType);
    }
  }, [searchString]);

  const handleSigningComplete = async (kycId: string, kycType: string) => {
    try {
      const response = await fetch(`/api/docusign/kyc/${kycId}/agreement-status?kycType=${kycType}`, {
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'completed') {
          setStatus('success');
          setMessage('Your agreement has been signed successfully! Your KYC verification is now pending admin review.');
          toast.success('Agreement signed successfully!');
          await refreshUser();
        } else {
          setStatus('pending');
          setMessage('Your signature is being processed. This may take a few moments.');
        }
      } else {
        setStatus('error');
        setMessage('Failed to verify signing status');
      }
    } catch (error) {
      console.error('Error checking signing status:', error);
      setStatus('error');
      setMessage('An error occurred while verifying your signature');
    }
  };

  const checkAgreementStatus = async (kycId: string, kycType: string) => {
    try {
      const response = await fetch(`/api/docusign/kyc/${kycId}/agreement-status?kycType=${kycType}`, {
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'completed') {
          setStatus('success');
          setMessage('Your agreement has been signed successfully!');
        } else if (data.status === 'sent') {
          setStatus('pending');
          setMessage('Your agreement is awaiting signature.');
        } else {
          setStatus('pending');
          setMessage('Agreement status: ' + data.status);
        }
      } else {
        setStatus('error');
        setMessage('Failed to check agreement status');
      }
    } catch (error) {
      setStatus('error');
      setMessage('An error occurred');
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return <Clock className="w-16 h-16 text-primary animate-pulse" />;
      case 'success':
        return <CheckCircle2 className="w-16 h-16 text-green-500" />;
      case 'declined':
        return <XCircle className="w-16 h-16 text-red-500" />;
      case 'error':
        return <XCircle className="w-16 h-16 text-red-500" />;
      case 'pending':
        return <FileText className="w-16 h-16 text-yellow-500" />;
    }
  };

  const getStatusTitle = () => {
    switch (status) {
      case 'loading':
        return 'Processing...';
      case 'success':
        return 'Agreement Signed!';
      case 'declined':
        return 'Agreement Declined';
      case 'error':
        return 'Error';
      case 'pending':
        return 'Signature Pending';
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {getStatusIcon()}
          </div>
          <CardTitle className="text-2xl">{getStatusTitle()}</CardTitle>
          <CardDescription className="mt-2">{message}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'success' && (
            <div className="text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                Your KYC verification is now complete and pending admin approval.
              </p>
              <Button 
                onClick={() => setLocation('/dashboard')}
                className="w-full"
                data-testid="button-go-dashboard"
              >
                Go to Dashboard
              </Button>
            </div>
          )}
          
          {status === 'declined' && (
            <div className="text-center space-y-3">
              <Button 
                onClick={() => setLocation('/kyc')}
                className="w-full"
                data-testid="button-back-kyc"
              >
                Back to KYC
              </Button>
            </div>
          )}
          
          {status === 'pending' && (
            <div className="text-center space-y-3">
              <Button 
                onClick={() => setLocation('/dashboard')}
                className="w-full"
                data-testid="button-go-dashboard"
              >
                Go to Dashboard
              </Button>
              <Button 
                variant="outline"
                onClick={() => setLocation('/kyc')}
                className="w-full"
                data-testid="button-back-kyc"
              >
                Back to KYC
              </Button>
            </div>
          )}
          
          {status === 'error' && (
            <div className="text-center space-y-3">
              <Button 
                onClick={() => setLocation('/kyc')}
                className="w-full"
                data-testid="button-back-kyc"
              >
                Back to KYC
              </Button>
            </div>
          )}
          
          {status === 'loading' && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Please wait while we verify your signature...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
