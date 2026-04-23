import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { toast } from 'sonner';
import { Loader2, Mail, RefreshCw, Shield, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

export type AdminActionType = 
  | 'kyc_approval' | 'kyc_rejection'
  | 'deposit_approval' | 'deposit_rejection'
  | 'withdrawal_approval' | 'withdrawal_rejection'
  | 'bnsl_approval' | 'bnsl_rejection'
  | 'trade_case_approval' | 'trade_case_rejection'
  | 'user_suspension' | 'user_activation';

const ACTION_LABELS: Record<AdminActionType, string> = {
  'kyc_approval': 'KYC Approval',
  'kyc_rejection': 'KYC Rejection',
  'deposit_approval': 'Deposit Approval',
  'deposit_rejection': 'Deposit Rejection',
  'withdrawal_approval': 'Withdrawal Approval',
  'withdrawal_rejection': 'Withdrawal Rejection',
  'bnsl_approval': 'BNSL Plan Approval',
  'bnsl_rejection': 'BNSL Plan Rejection',
  'trade_case_approval': 'Trade Case Approval',
  'trade_case_rejection': 'Trade Case Rejection',
  'user_suspension': 'User Suspension',
  'user_activation': 'User Activation',
};

interface AdminOtpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: (actionData?: Record<string, any>) => void;
  actionType: AdminActionType;
  targetId: string;
  targetType: string;
  actionData?: Record<string, any>;
  adminUserId: string;
}

type Step = 'sending' | 'input' | 'verifying' | 'success' | 'error';

export default function AdminOtpModal({
  isOpen,
  onClose,
  onVerified,
  actionType,
  targetId,
  targetType,
  actionData,
  adminUserId,
}: AdminOtpModalProps) {
  const [step, setStep] = useState<Step>('sending');
  const [otpId, setOtpId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [resending, setResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  useEffect(() => {
    if (isOpen) {
      setStep('sending');
      setCode('');
      setOtpId(null);
      setExpiresAt(null);
      setErrorMessage('');
      sendOtp();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!expiresAt) return;
    
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
      setTimeRemaining(remaining);
      
      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const sendOtp = async () => {
    try {
      setStep('sending');
      const res = await apiRequest('POST', '/api/admin/action-otp/send', {
        actionType,
        targetId,
        targetType,
        actionData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to send verification code');
      }

      if (data.required === false) {
        onVerified(actionData);
        onClose();
        return;
      }

      setOtpId(data.otpId);
      setExpiresAt(new Date(data.expiresAt));
      setStep('input');
      toast.success('Verification code sent to your email');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to send verification code');
      setStep('error');
    }
  };

  const handleVerify = async () => {
    if (!otpId || code.length !== 6) return;

    try {
      setStep('verifying');
      const res = await apiRequest('POST', '/api/admin/action-otp/verify', {
        otpId,
        code,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Invalid verification code');
      }

      setStep('success');
      toast.success('Verification successful');
      
      setTimeout(() => {
        onVerified(data.actionData);
        onClose();
      }, 1000);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Verification failed');
      setStep('input');
      setCode('');
      toast.error(error instanceof Error ? error.message : 'Verification failed');
    }
  };

  const handleResend = async () => {
    if (!otpId) return;
    
    setResending(true);
    try {
      const res = await apiRequest('POST', '/api/admin/action-otp/resend', { otpId });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to resend code');
      }

      setExpiresAt(new Date(data.expiresAt));
      setCode('');
      toast.success('New verification code sent');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to resend code');
    } finally {
      setResending(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleClose = () => {
    if (step !== 'verifying' && step !== 'sending') {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" data-testid="admin-otp-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-purple-500" />
            Admin Verification Required
          </DialogTitle>
          <DialogDescription>
            Confirm your identity to perform: <strong>{ACTION_LABELS[actionType]}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          {step === 'sending' && (
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-purple-500" />
              <p className="text-sm text-muted-foreground">Sending verification code...</p>
            </div>
          )}

          {step === 'input' && (
            <div className="flex flex-col items-center space-y-6">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-5 w-5" />
                <span className="text-sm">Check your email for the verification code</span>
              </div>

              <InputOTP
                maxLength={6}
                value={code}
                onChange={setCode}
                data-testid="input-admin-otp"
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>

              {timeRemaining > 0 && (
                <p className="text-xs text-muted-foreground">
                  Code expires in <span className="font-medium">{formatTime(timeRemaining)}</span>
                </p>
              )}

              {timeRemaining === 0 && expiresAt && (
                <p className="text-xs text-red-500">
                  Code has expired. Please request a new one.
                </p>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={handleResend}
                disabled={resending}
                className="text-sm"
                data-testid="button-resend-otp"
              >
                {resending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Resend code
              </Button>
            </div>
          )}

          {step === 'verifying' && (
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-purple-500" />
              <p className="text-sm text-muted-foreground">Verifying code...</p>
            </div>
          )}

          {step === 'success' && (
            <div className="flex flex-col items-center space-y-4">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <p className="text-sm font-medium text-green-700">Verification successful!</p>
            </div>
          )}

          {step === 'error' && (
            <div className="flex flex-col items-center space-y-4">
              <AlertCircle className="h-12 w-12 text-red-500" />
              <p className="text-sm text-red-600">{errorMessage}</p>
              <Button variant="outline" onClick={sendOtp} data-testid="button-retry-send">
                Try Again
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          {step === 'input' && (
            <>
              <Button variant="outline" onClick={onClose} data-testid="button-cancel-otp">
                Cancel
              </Button>
              <Button
                onClick={handleVerify}
                disabled={code.length !== 6}
                className="bg-purple-500 hover:bg-purple-600"
                data-testid="button-verify-otp"
              >
                Verify & Continue
              </Button>
            </>
          )}

          {step === 'error' && (
            <Button variant="outline" onClick={onClose} data-testid="button-close-error">
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export async function checkOtpRequired(
  actionType: AdminActionType,
  adminUserId: string
): Promise<boolean> {
  try {
    const res = await apiRequest('GET', `/api/admin/action-otp/required/${actionType}`);
    const data = await res.json();
    return data.required === true;
  } catch {
    return false;
  }
}
