import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Link, useLocation } from 'wouter';
import { ArrowRight, Lock, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);
  const [tokenError, setTokenError] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      setTokenError(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.message?.includes('expired') || data.message?.includes('invalid')) {
          setTokenError(true);
        }
        throw new Error(data.message || 'Failed to reset password');
      }

      setResetComplete(true);
      toast.success("Password reset successful!", {
        description: "You can now log in with your new password."
      });
    } catch (error) {
      toast.error("Error", {
        description: error instanceof Error ? error.message : "Failed to reset password. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (tokenError) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="min-h-screen py-12 bg-background flex items-center justify-center">
          <div className="container mx-auto px-6 max-w-md">
            
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Invalid or Expired Link</h1>
              <p className="text-muted-foreground">This password reset link is invalid or has expired.</p>
            </div>

            <Card className="p-8 bg-white border-border shadow-md backdrop-blur-sm">
              <div className="space-y-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Password reset links expire after 1 hour for security reasons. Please request a new link.
                </p>
                
                <Link href="/forgot-password">
                  <Button 
                    className="w-full bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90"
                    data-testid="button-request-new-link"
                  >
                    Request New Reset Link
                  </Button>
                </Link>

                <Link href="/login">
                  <Button 
                    variant="ghost"
                    className="w-full mt-2"
                    data-testid="link-back-to-login"
                  >
                    Back to Login
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (resetComplete) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="min-h-screen py-12 bg-background flex items-center justify-center">
          <div className="container mx-auto px-6 max-w-md">
            
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Password Reset Complete</h1>
              <p className="text-muted-foreground">Your password has been successfully updated.</p>
            </div>

            <Card className="p-8 bg-white border-border shadow-md backdrop-blur-sm">
              <div className="space-y-4 text-center">
                <p className="text-sm text-muted-foreground">
                  You can now log in with your new password.
                </p>
                
                <Link href="/login">
                  <Button 
                    className="w-full bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90 h-12 text-lg font-bold rounded-xl"
                    data-testid="button-go-to-login"
                  >
                    Go to Login <ArrowRight className="w-5 h-5 ml-2" />
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
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Reset Your Password</h1>
            <p className="text-muted-foreground">Enter your new password below.</p>
          </div>

          <Card className="p-8 bg-white border-border shadow-md backdrop-blur-sm">
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Input 
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="bg-background border-input text-foreground pr-10" 
                    placeholder="••••••••"
                    data-testid="input-password"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">Must be at least 8 characters</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input 
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="bg-background border-input text-foreground pr-10" 
                    placeholder="••••••••"
                    data-testid="input-confirm-password"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button 
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90 h-12 text-lg font-bold rounded-xl shadow-lg shadow-orange-500/20 transition-all"
                data-testid="button-reset-password"
              >
                {isLoading ? "Resetting..." : (
                  <>Reset Password <ArrowRight className="w-5 h-5 ml-2" /></>
                )}
              </Button>
            </form>
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
