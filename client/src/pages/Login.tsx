import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, EyeOff, ArrowRight, Lock, Shield, ArrowLeft } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Link, useLocation } from 'wouter';
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

export default function Login() {
  const { login, verifyMfa, user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // MFA state
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaChallengeToken, setMfaChallengeToken] = useState('');
  const [mfaCode, setMfaCode] = useState('');

  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        setLocation('/admin');
      } else {
        setLocation('/dashboard');
      }
    }
  }, [user, setLocation]);

  // Show loading while auth is being checked
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter your email and password");
      return;
    }

    setIsLoading(true);

    try {
      const mfaChallenge = await login(email, password);
      
      if (mfaChallenge?.requiresMfa) {
        setMfaRequired(true);
        setMfaChallengeToken(mfaChallenge.challengeToken);
        toast.info("Two-factor authentication required", {
          description: "Please enter the code from your authenticator app."
        });
      } else {
        toast.success("Welcome back!", {
          description: "You have successfully logged in."
        });
      }
    } catch (error) {
      toast.error("Invalid Credentials", {
        description: error instanceof Error ? error.message : "Please check your email and password."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mfaCode.length < 6) {
      toast.error("Please enter a complete 6-digit code");
      return;
    }

    setIsLoading(true);

    try {
      await verifyMfa(mfaChallengeToken, mfaCode);
      toast.success("Welcome back!", {
        description: "You have successfully logged in."
      });
    } catch (error) {
      toast.error("Invalid Code", {
        description: error instanceof Error ? error.message : "The code you entered is incorrect. Please try again."
      });
      setMfaCode('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setMfaRequired(false);
    setMfaChallengeToken('');
    setMfaCode('');
  };

  if (mfaRequired) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="min-h-screen py-12 bg-background flex items-center justify-center">
          <div className="container mx-auto px-6 max-w-md">
            
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Two-Factor Authentication</h1>
              <p className="text-muted-foreground">Enter the 6-digit code from your authenticator app.</p>
            </div>

            <Card className="p-8 bg-white border-border shadow-md backdrop-blur-sm">
              <form onSubmit={handleMfaVerify} className="space-y-6">
                
                <div className="flex flex-col items-center space-y-4">
                  <Label>Verification Code</Label>
                  <InputOTP 
                    maxLength={6} 
                    value={mfaCode}
                    onChange={setMfaCode}
                    data-testid="input-mfa-code"
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
                  <p className="text-xs text-muted-foreground text-center">
                    You can also use a backup code if you don't have access to your authenticator.
                  </p>
                </div>

                <Button 
                  type="submit"
                  disabled={isLoading || mfaCode.length < 6}
                  className="w-full bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90 h-12 text-lg font-bold rounded-xl shadow-lg shadow-orange-500/20 transition-all"
                  data-testid="button-verify-mfa"
                >
                  {isLoading ? "Verifying..." : (
                    <>Verify & Sign In <ArrowRight className="w-5 h-5 ml-2" /></>
                  )}
                </Button>

                <Button 
                  type="button"
                  variant="ghost"
                  onClick={handleBackToLogin}
                  className="w-full"
                  data-testid="button-back-to-login"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back to Login
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="min-h-screen py-12 bg-background flex items-center justify-center">
        <div className="container mx-auto px-6 max-w-md">
          
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Welcome Back</h1>
            <p className="text-muted-foreground">Sign in to access your FinaTrades dashboard.</p>
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

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password">Password</Label>
                  <Link href="/forgot-password">
                    <span className="text-xs text-secondary hover:underline cursor-pointer font-medium">Forgot password?</span>
                  </Link>
                </div>
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
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox id="remember" className="border-input data-[state=checked]:bg-secondary data-[state=checked]:border-secondary" />
                <label
                  htmlFor="remember"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-muted-foreground"
                >
                  Remember me for 30 days
                </label>
              </div>

              <Button 
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90 h-12 text-lg font-bold rounded-xl shadow-lg shadow-orange-500/20 transition-all"
                data-testid="button-login"
              >
                {isLoading ? "Signing in..." : (
                  <>Sign In <ArrowRight className="w-5 h-5 ml-2" /></>
                )}
              </Button>
            </form>

            <div className="mt-8 text-center text-sm">
              <span className="text-muted-foreground">Don't have an account? </span>
              <Link href="/register">
                <span className="text-secondary font-bold hover:underline cursor-pointer">Create Account</span>
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
