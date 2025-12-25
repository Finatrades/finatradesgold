import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { RefreshCw, LockKeyhole, AlertCircle, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { useLocation } from 'wouter';

interface TransactionPinPromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  action: string;
  onSuccess: (token: string) => void;
  onCancel?: () => void;
  title?: string;
  description?: string;
}

export default function TransactionPinPrompt({
  open,
  onOpenChange,
  userId,
  action,
  onSuccess,
  onCancel,
  title = "Enter Transaction PIN",
  description = "Enter your 6-digit PIN to authorize this transaction."
}: TransactionPinPromptProps) {
  const [, setLocation] = useLocation();
  const [pin, setPin] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [lockedUntil, setLockedUntil] = useState<Date | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [hasPin, setHasPin] = useState<boolean | null>(null);

  useEffect(() => {
    if (open) {
      setPin('');
      setError(null);
      checkPinStatus();
    }
  }, [open, userId]);

  const checkPinStatus = async () => {
    try {
      const res = await fetch(`/api/transaction-pin/status/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setHasPin(data.hasPin);
        setIsLocked(data.isLocked);
        if (data.lockedUntil) {
          setLockedUntil(new Date(data.lockedUntil));
        }
      }
    } catch (error) {
      console.error('Failed to check PIN status:', error);
    }
  };

  const handleVerify = async () => {
    if (pin.length !== 6) return;
    
    setIsVerifying(true);
    setError(null);
    
    try {
      const res = await fetch('/api/transaction-pin/verify', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ userId, pin, action }),
      });
      
      const data = await res.json();
      
      if (res.status === 423) {
        setIsLocked(true);
        setLockedUntil(new Date(data.lockedUntil));
        setError(data.message);
        setPin('');
        return;
      }
      
      if (!res.ok) {
        setError(data.message);
        setPin('');
        if (data.remainingAttempts !== undefined) {
          setRemainingAttempts(data.remainingAttempts);
        }
        return;
      }
      
      toast.success('PIN verified successfully');
      onSuccess(data.token);
      onOpenChange(false);
    } catch (error) {
      setError('Failed to verify PIN. Please try again.');
      setPin('');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCancel = () => {
    setPin('');
    setError(null);
    onOpenChange(false);
    onCancel?.();
  };

  const goToSecuritySettings = () => {
    onOpenChange(false);
    setLocation('/security');
  };

  if (hasPin === false) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-amber-600" />
              Transaction PIN Required
            </DialogTitle>
            <DialogDescription>
              You need to set up a transaction PIN before you can perform this action.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg border border-amber-100">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-sm text-amber-800">No PIN Set</h4>
                <p className="text-sm text-amber-700 mt-1">
                  Set up a 6-digit PIN in your security settings to authorize transactions.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>Cancel</Button>
            <Button onClick={goToSecuritySettings} data-testid="button-go-to-security">
              Set Up PIN
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LockKeyhole className="w-5 h-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {isLocked && lockedUntil ? (
            <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-100">
              <LockKeyhole className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-sm text-red-800">PIN Locked</h4>
                <p className="text-sm text-red-700 mt-1">
                  Too many failed attempts. Your PIN is locked until{' '}
                  {lockedUntil.toLocaleTimeString()}.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <InputOTP 
                maxLength={6} 
                value={pin}
                onChange={setPin}
                disabled={isVerifying}
                data-testid="input-transaction-pin"
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
              
              {error && (
                <p className="text-sm text-red-500 text-center">{error}</p>
              )}
              
              {remainingAttempts !== null && remainingAttempts > 0 && (
                <p className="text-xs text-muted-foreground">
                  {remainingAttempts} attempts remaining
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isVerifying}>
            Cancel
          </Button>
          <Button 
            onClick={handleVerify} 
            disabled={pin.length !== 6 || isVerifying || isLocked}
            data-testid="button-verify-pin"
          >
            {isVerifying ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify PIN'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function useTransactionPin() {
  const [pinPromptOpen, setPinPromptOpen] = useState(false);
  const [pinVerificationToken, setPinVerificationToken] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    userId: string;
    action: string;
    onSuccess: (token: string) => void;
    onCancel?: () => void;
    title?: string;
    description?: string;
  } | null>(null);

  const requirePin = (options: {
    userId: string;
    action: string;
    title?: string;
    description?: string;
  }): Promise<string> => {
    return new Promise((resolve, reject) => {
      setPendingAction({
        userId: options.userId,
        action: options.action,
        title: options.title,
        description: options.description,
        onSuccess: (token) => {
          setPinVerificationToken(token);
          resolve(token);
        },
        onCancel: () => {
          reject(new Error('PIN verification cancelled'));
        }
      });
      setPinPromptOpen(true);
    });
  };

  const clearPinToken = () => {
    setPinVerificationToken(null);
  };

  return {
    pinPromptOpen,
    setPinPromptOpen,
    pendingAction,
    requirePin,
    pinVerificationToken,
    clearPinToken,
    TransactionPinPromptComponent: pendingAction ? (
      <TransactionPinPrompt
        open={pinPromptOpen}
        onOpenChange={setPinPromptOpen}
        userId={pendingAction.userId}
        action={pendingAction.action}
        onSuccess={pendingAction.onSuccess}
        onCancel={pendingAction.onCancel}
        title={pendingAction.title}
        description={pendingAction.description}
      />
    ) : null
  };
}
