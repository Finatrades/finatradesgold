import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export default function WingoldCallback() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<'loading' | 'success' | 'cancelled' | 'failed'>('loading');
  const [orderDetails, setOrderDetails] = useState<{
    orderId: string;
    referenceNumber: string;
    grams: string;
    usd: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const statusParam = params.get('status');
    
    if (statusParam === 'success') {
      setStatus('success');
      setOrderDetails({
        orderId: params.get('orderId') || '',
        referenceNumber: params.get('referenceNumber') || '',
        grams: params.get('grams') || '0',
        usd: params.get('usd') || '0',
      });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    } else if (statusParam === 'cancelled') {
      setStatus('cancelled');
    } else if (statusParam === 'failed') {
      setStatus('failed');
      setErrorMessage(params.get('error') || 'Payment processing failed');
    } else {
      setStatus('loading');
      setTimeout(() => {
        setLocation('/dashboard');
      }, 2000);
    }
  }, [queryClient, setLocation]);

  const handleGoToDashboard = () => {
    setLocation('/dashboard');
  };

  const handleTryAgain = () => {
    setLocation('/finapay');
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-white" data-testid="wingold-callback-loading">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-purple-600 mb-4" />
            <p className="text-gray-600">Processing your order...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-white p-4" data-testid="wingold-callback-success">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-700">Payment Successful!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-center text-gray-600">
              Your gold purchase has been completed successfully.
            </p>
            
            {orderDetails && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">Order ID</span>
                  <span className="font-medium text-sm">{orderDetails.orderId.substring(0, 8)}...</span>
                </div>
                {orderDetails.referenceNumber && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Reference</span>
                    <span className="font-medium">{orderDetails.referenceNumber}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Gold Amount</span>
                  <span className="font-medium text-amber-600">{orderDetails.grams}g</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Paid</span>
                  <span className="font-medium">${parseFloat(orderDetails.usd).toLocaleString()}</span>
                </div>
              </div>
            )}

            <p className="text-sm text-gray-500 text-center">
              Your gold will be credited to your wallet shortly. You will receive a confirmation email.
            </p>

            <Button 
              onClick={handleGoToDashboard} 
              className="w-full bg-purple-600 hover:bg-purple-700"
              data-testid="button-go-to-dashboard"
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'cancelled') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-white p-4" data-testid="wingold-callback-cancelled">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertCircle className="h-10 w-10 text-amber-600" />
            </div>
            <CardTitle className="text-2xl text-amber-700">Payment Cancelled</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-center text-gray-600">
              Your gold purchase was cancelled. No charges have been made.
            </p>

            <div className="flex gap-3">
              <Button 
                onClick={handleGoToDashboard} 
                variant="outline"
                className="flex-1"
                data-testid="button-back-to-dashboard"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
              <Button 
                onClick={handleTryAgain} 
                className="flex-1 bg-purple-600 hover:bg-purple-700"
                data-testid="button-try-again"
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-white p-4" data-testid="wingold-callback-failed">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
            <XCircle className="h-10 w-10 text-red-600" />
          </div>
          <CardTitle className="text-2xl text-red-700">Payment Failed</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-center text-gray-600">
            {errorMessage || 'There was an issue processing your payment. Please try again.'}
          </p>

          <div className="flex gap-3">
            <Button 
              onClick={handleGoToDashboard} 
              variant="outline"
              className="flex-1"
              data-testid="button-back-to-dashboard-failed"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
            <Button 
              onClick={handleTryAgain} 
              className="flex-1 bg-purple-600 hover:bg-purple-700"
              data-testid="button-retry-payment"
            >
              Try Again
            </Button>
          </div>

          <p className="text-xs text-gray-400 text-center">
            If you continue to experience issues, please contact support.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
