import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Link } from 'wouter';
import { ArrowLeft, ArrowRight, Lock, Mail, CheckCircle } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send reset email');
      }

      setEmailSent(true);
      toast.success("Reset link sent!", {
        description: "Check your email for instructions to reset your password."
      });
    } catch (error) {
      toast.error("Error", {
        description: error instanceof Error ? error.message : "Failed to send reset email. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="min-h-screen py-12 bg-background flex items-center justify-center">
          <div className="container mx-auto px-6 max-w-md">
            
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Check Your Email</h1>
              <p className="text-muted-foreground">We've sent password reset instructions to:</p>
              <p className="font-medium text-foreground mt-2">{email}</p>
            </div>

            <Card className="p-8 bg-white border-border shadow-md backdrop-blur-sm">
              <div className="space-y-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Click the link in the email to reset your password. If you don't see the email, check your spam folder.
                </p>
                
                <div className="pt-4">
                  <Button 
                    variant="outline"
                    onClick={() => setEmailSent(false)}
                    className="w-full"
                    data-testid="button-try-different-email"
                  >
                    Try a different email
                  </Button>
                </div>

                <Link href="/login">
                  <Button 
                    variant="ghost"
                    className="w-full mt-2"
                    data-testid="link-back-to-login"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Login
                  </Button>
                </Link>
              </div>
            </Card>
            
            <div className="mt-8 text-center text-xs text-muted-foreground">
              <p className="flex justify-center items-center gap-2">
                <Lock className="w-3 h-3" />
                Secured by FinaTrades Switzerland
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="min-h-screen py-12 bg-background flex items-center justify-center">
        <div className="container mx-auto px-6 max-w-md">
          
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Forgot Password?</h1>
            <p className="text-muted-foreground">Enter your email address and we'll send you instructions to reset your password.</p>
          </div>

          <Card className="p-8 bg-white border-border shadow-md backdrop-blur-sm">
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input 
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="bg-background border-input text-foreground" 
                  placeholder="john@example.com"
                  data-testid="input-email"
                />
              </div>

              <Button 
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90 h-12 text-lg font-bold rounded-xl shadow-lg shadow-purple-500/20 transition-all"
                data-testid="button-send-reset-link"
              >
                {isLoading ? "Sending..." : (
                  <>Send Reset Link <ArrowRight className="w-5 h-5 ml-2" /></>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link href="/login">
                <span className="text-sm text-secondary font-medium hover:underline cursor-pointer flex items-center justify-center gap-2">
                  <ArrowLeft className="w-4 h-4" /> Back to Login
                </span>
              </Link>
            </div>
          </Card>
          
          <div className="mt-8 text-center text-xs text-muted-foreground">
            <p className="flex justify-center items-center gap-2">
              <Lock className="w-3 h-3" />
              Secured by FinaTrades Switzerland
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
