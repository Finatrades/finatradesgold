import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, ArrowRight, Lock, Shield, ArrowLeft } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { useLocation } from 'wouter';
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import GeoRestrictionNotice from '@/pages/finagold/components/GeoRestrictionNotice';

export default function AdminLogin() {
  const { adminLogin, verifyMfa, user, loading, adminPortal } = useAuth();
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaChallengeToken, setMfaChallengeToken] = useState('');
  const [mfaCode, setMfaCode] = useState('');

  useEffect(() => {
    if (user) {
      if (user.role === 'admin' && adminPortal) {
        // Admin already logged in via admin portal - redirect to dashboard
        setLocation('/admin/dashboard');
      } else if (user.role !== 'admin') {
        // Non-admin trying to access admin login
        toast.error("Access Denied", {
          description: "This login is for administrators only."
        });
        setLocation('/dashboard');
      }
      // Admin logged in via regular login visiting this page - let them re-login for admin access
    }
  }, [user, adminPortal, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
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
      const mfaChallenge = await adminLogin(email, password);
      
      if (mfaChallenge?.requiresMfa) {
        setMfaRequired(true);
        setMfaChallengeToken(mfaChallenge.challengeToken);
        toast.info("Two-factor authentication required", {
          description: "Please enter the code from your authenticator app."
        });
      } else {
        toast.success("Welcome back, Admin!", {
          description: "You have successfully logged in to the admin portal."
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
      toast.success("Welcome back, Admin!", {
        description: "You have successfully logged in to the admin portal."
      });
    } catch (error) {
      toast.error("Invalid Code", {
        description: error instanceof Error ? error.message : "The code you entered is incorrect."
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
      <div className="min-h-screen bg-slate-900">
        <div className="min-h-screen py-12 flex items-center justify-center">
          <div className="container mx-auto px-6 max-w-md">
            
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">Two-Factor Authentication</h1>
              <p className="text-slate-400">Enter the 6-digit code from your authenticator app.</p>
            </div>

            <Card className="p-8 bg-slate-800 border-slate-700 shadow-xl">
              <form onSubmit={handleMfaVerify} className="space-y-6">
                
                <div className="flex flex-col items-center space-y-4">
                  <Label className="text-slate-300">Verification Code</Label>
                  <InputOTP 
                    maxLength={6} 
                    value={mfaCode}
                    onChange={setMfaCode}
                    data-testid="input-admin-mfa-code"
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} className="bg-slate-700 border-slate-600 text-white" />
                      <InputOTPSlot index={1} className="bg-slate-700 border-slate-600 text-white" />
                      <InputOTPSlot index={2} className="bg-slate-700 border-slate-600 text-white" />
                      <InputOTPSlot index={3} className="bg-slate-700 border-slate-600 text-white" />
                      <InputOTPSlot index={4} className="bg-slate-700 border-slate-600 text-white" />
                      <InputOTPSlot index={5} className="bg-slate-700 border-slate-600 text-white" />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <Button 
                  type="submit"
                  disabled={isLoading || mfaCode.length < 6}
                  className="w-full bg-gradient-to-r from-purple-500 to-fuchsia-600 text-white hover:opacity-90 h-12 text-lg font-bold rounded-xl"
                  data-testid="button-admin-verify-mfa"
                >
                  {isLoading ? "Verifying..." : (
                    <>Verify & Sign In <ArrowRight className="w-5 h-5 ml-2" /></>
                  )}
                </Button>

                <Button 
                  type="button"
                  variant="ghost"
                  onClick={handleBackToLogin}
                  className="w-full text-slate-400 hover:text-white hover:bg-slate-700"
                  data-testid="button-admin-back-to-login"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back to Login
                </Button>
              </form>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <GeoRestrictionNotice />
      <div className="min-h-screen bg-slate-900">
        <div className="min-h-screen py-12 flex items-center justify-center">
          <div className="container mx-auto px-6 max-w-md">
            
            <div className="text-center mb-8">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                <Shield className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">Admin Portal</h1>
              <p className="text-slate-400">Sign in to access the administration dashboard</p>
            </div>

          <Card className="p-8 bg-slate-800 border-slate-700 shadow-xl">
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@finatrades.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 focus:border-purple-500 focus:ring-purple-500"
                  data-testid="input-admin-email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 pr-12 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 focus:border-purple-500 focus:ring-purple-500"
                    data-testid="input-admin-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    data-testid="button-toggle-password"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <Button 
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-purple-500 to-fuchsia-600 text-white hover:opacity-90 h-12 text-lg font-bold rounded-xl shadow-lg shadow-purple-500/20"
                data-testid="button-admin-login"
              >
                {isLoading ? "Signing in..." : (
                  <>Sign In <ArrowRight className="w-5 h-5 ml-2" /></>
                )}
              </Button>
            </form>
          </Card>

          <div className="mt-8 text-center text-xs text-slate-500">
            <p className="flex justify-center items-center gap-2">
              <Lock className="w-3 h-3" />
              Secured Admin Portal - FinaTrades
            </p>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
