import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Mail, CheckCircle2, RefreshCw, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { apiRequest } from '@/lib/queryClient';

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const storedEmail = sessionStorage.getItem('verificationEmail');
    if (!storedEmail) {
      setLocation('/register');
      return;
    }
    setEmail(storedEmail);
  }, [setLocation]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newCode = [...code];
    pastedData.split('').forEach((char, i) => {
      if (i < 6) newCode[i] = char;
    });
    setCode(newCode);
    if (pastedData.length === 6) {
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerify = async () => {
    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      toast.error("Please enter the complete 6-digit code");
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiRequest('POST', '/api/auth/verify-email', {
        email,
        code: fullCode
      });
      
      const data = await response.json();
      
      toast.success("Email Verified!", {
        description: "Your email has been verified successfully. You can now log in."
      });
      
      sessionStorage.removeItem('verificationEmail');
      setLocation('/login');
    } catch (error) {
      toast.error("Verification Failed", {
        description: error instanceof Error ? error.message : "Invalid or expired code. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      await apiRequest('POST', '/api/auth/send-verification', { email });
      
      toast.success("Code Sent!", {
        description: "A new verification code has been sent to your email."
      });
      setCountdown(60);
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (error) {
      toast.error("Failed to resend code", {
        description: "Please try again later."
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="min-h-screen py-12 bg-background flex items-center justify-center">
        <div className="container mx-auto px-6 max-w-md">
          
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Verify Your Email</h1>
            <p className="text-muted-foreground">
              We've sent a 6-digit verification code to
            </p>
            <p className="text-foreground font-medium mt-1">{email}</p>
          </div>

          <Card className="p-8 bg-white border-border shadow-md">
            <div className="space-y-6">
              <div className="flex justify-center gap-2" onPaste={handlePaste}>
                {code.map((digit, index) => (
                  <Input
                    key={index}
                    ref={(el) => { inputRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-12 h-14 text-center text-2xl font-bold bg-background border-input"
                    data-testid={`input-code-${index}`}
                  />
                ))}
              </div>

              <Button
                onClick={handleVerify}
                disabled={isLoading || code.join('').length !== 6}
                className="w-full bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90 h-12 text-lg font-bold rounded-xl"
                data-testid="button-verify"
              >
                {isLoading ? (
                  "Verifying..."
                ) : (
                  <>
                    Verify Email <CheckCircle2 className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>

              <div className="text-center space-y-3">
                <p className="text-sm text-muted-foreground">
                  Didn't receive the code?
                </p>
                <Button
                  variant="ghost"
                  onClick={handleResend}
                  disabled={isResending || countdown > 0}
                  className="text-secondary hover:text-secondary/80"
                  data-testid="button-resend"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isResending ? 'animate-spin' : ''}`} />
                  {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}
                </Button>
              </div>

              <div className="pt-4 border-t border-border">
                <Button
                  variant="ghost"
                  onClick={() => {
                    sessionStorage.removeItem('verificationEmail');
                    setLocation('/register');
                  }}
                  className="w-full text-muted-foreground"
                  data-testid="button-back"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Registration
                </Button>
              </div>
            </div>
          </Card>

          <div className="mt-6 text-center text-xs text-muted-foreground">
            <p>Check your spam folder if you don't see the email.</p>
            <p className="mt-1">The code expires in 10 minutes.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
