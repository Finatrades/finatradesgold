import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, EyeOff, ArrowRight, Lock, Shield, ArrowLeft, Fingerprint } from 'lucide-react';
import { toast } from 'sonner';
import { Link, useLocation } from 'wouter';
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import BiometricService from '@/lib/biometric-service';
import finatradesLogo from '@/assets/finatrades-logo-purple.png';

export default function MobileLogin() {
  const { login, verifyMfa, user, loading, setUser } = useAuth();
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaChallengeToken, setMfaChallengeToken] = useState('');
  const [mfaCode, setMfaCode] = useState('');

  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometryType, setBiometryType] = useState('');
  const [savedBiometricEmail, setSavedBiometricEmail] = useState<string | null>(null);
  const [biometricLoading, setBiometricLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setLocation('/dashboard');
    }
  }, [user, setLocation]);

  useEffect(() => {
    const checkBiometric = async () => {
      const status = await BiometricService.checkAvailability();
      setBiometricAvailable(status.isAvailable);
      setBiometryType(status.biometryType);
      
      if (status.isAvailable) {
        const savedEmail = await BiometricService.getSavedUserEmail();
        setSavedBiometricEmail(savedEmail);
      }
    };
    checkBiometric();
  }, []);

  const handleBiometricLogin = async () => {
    if (!savedBiometricEmail) {
      toast.error("No biometric credentials found", {
        description: "Please log in with your password first, then enable biometric login in your profile settings."
      });
      return;
    }

    setBiometricLoading(true);
    try {
      const authenticated = await BiometricService.authenticate(
        `Sign in as ${savedBiometricEmail}`
      );

      if (!authenticated) {
        toast.error("Biometric authentication failed");
        setBiometricLoading(false);
        return;
      }

      const credentials = await BiometricService.getCredentials();
      if (!credentials) {
        toast.error("Could not retrieve credentials");
        setBiometricLoading(false);
        return;
      }

      const response = await fetch('/api/biometric/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: credentials.email }),
      });

      if (response.ok) {
        const data = await response.json();
        if (setUser) {
          setUser(data.user);
        }
        localStorage.setItem('fina_user_id', data.user.id);
        toast.success("Welcome back!", {
          description: `Signed in with ${biometryType}`
        });
      } else {
        const error = await response.json();
        toast.error(error.message || "Biometric login failed");
      }
    } catch (error) {
      console.error("Biometric login error:", error);
      toast.error("An error occurred during biometric login");
    } finally {
      setBiometricLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
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
      const err = error as Error & { redirectTo?: string };
      if (err.redirectTo) {
        toast.error("Admin Account Detected", {
          description: err.message,
          action: {
            label: "Go to Admin Login",
            onClick: () => setLocation(err.redirectTo!)
          }
        });
        setTimeout(() => setLocation(err.redirectTo!), 2000);
      } else {
        toast.error("Invalid Credentials", {
          description: error instanceof Error ? error.message : "Please check your email and password."
        });
      }
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
      <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-purple-50 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
          <div className="w-full max-w-sm">
            <div className="text-center mb-8">
              <img 
                src={finatradesLogo} 
                alt="Finatrades" 
                className="h-12 mx-auto mb-6"
                style={{ filter: 'brightness(0) saturate(100%) invert(21%) sepia(85%) saturate(4429%) hue-rotate(265deg) brightness(93%) contrast(99%)' }}
                data-testid="img-logo"
              />
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shadow-lg shadow-purple-200">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Two-Factor Authentication</h1>
              <p className="text-gray-500 text-sm">Enter the 6-digit code from your authenticator app</p>
            </div>

            <div className="bg-white rounded-3xl shadow-xl shadow-purple-100/50 p-6 border border-purple-100/50">
              <form onSubmit={handleMfaVerify} className="space-y-6">
                <div className="flex flex-col items-center space-y-4">
                  <Label className="text-gray-700 font-medium">Verification Code</Label>
                  <InputOTP 
                    maxLength={6} 
                    value={mfaCode}
                    onChange={setMfaCode}
                    data-testid="input-mfa-code"
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} className="rounded-xl h-12 w-10" />
                      <InputOTPSlot index={1} className="rounded-xl h-12 w-10" />
                      <InputOTPSlot index={2} className="rounded-xl h-12 w-10" />
                      <InputOTPSlot index={3} className="rounded-xl h-12 w-10" />
                      <InputOTPSlot index={4} className="rounded-xl h-12 w-10" />
                      <InputOTPSlot index={5} className="rounded-xl h-12 w-10" />
                    </InputOTPGroup>
                  </InputOTP>
                  <p className="text-xs text-gray-400 text-center">
                    You can also use a backup code
                  </p>
                </div>

                <Button 
                  type="submit"
                  disabled={isLoading || mfaCode.length < 6}
                  className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800 h-14 text-base font-semibold rounded-2xl shadow-lg shadow-purple-200 transition-all"
                  data-testid="button-verify-mfa"
                >
                  {isLoading ? "Verifying..." : (
                    <>Verify & Sign In <ArrowRight className="w-5 h-5 ml-2" /></>
                  )}
                </Button>

                <button 
                  type="button"
                  onClick={handleBackToLogin}
                  className="w-full flex items-center justify-center gap-2 text-gray-500 hover:text-gray-700 py-3 text-sm font-medium transition-colors"
                  data-testid="button-back-to-login"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Login
                </button>
              </form>
            </div>
            
            <div className="mt-8 text-center">
              <p className="flex justify-center items-center gap-2 text-xs text-gray-400">
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
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-purple-50 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <img 
              src={finatradesLogo} 
              alt="Finatrades" 
              className="h-12 mx-auto mb-6"
              style={{ filter: 'brightness(0) saturate(100%) invert(21%) sepia(85%) saturate(4429%) hue-rotate(265deg) brightness(93%) contrast(99%)' }}
              data-testid="img-logo"
            />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back</h1>
            <p className="text-gray-500 text-sm">Sign in to access your FinaTrades dashboard</p>
          </div>

          <div className="bg-white rounded-3xl shadow-xl shadow-purple-100/50 p-6 border border-purple-100/50">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700 font-medium">Email Address</Label>
                <Input 
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="h-12 rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-purple-300 focus:ring-purple-200 transition-all" 
                  placeholder="john@example.com"
                  data-testid="input-email"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password" className="text-gray-700 font-medium">Password</Label>
                  <Link href="/forgot-password">
                    <span className="text-xs text-purple-600 hover:text-purple-700 cursor-pointer font-medium">Forgot password?</span>
                  </Link>
                </div>
                <div className="relative">
                  <Input 
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="h-12 rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-purple-300 focus:ring-purple-200 pr-12 transition-all" 
                    placeholder="••••••••"
                    data-testid="input-password"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Checkbox 
                  id="remember" 
                  className="rounded-md border-gray-300 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600" 
                />
                <label
                  htmlFor="remember"
                  className="text-sm text-gray-500"
                >
                  Remember me for 30 days
                </label>
              </div>

              <Button 
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800 h-14 text-base font-semibold rounded-2xl shadow-lg shadow-purple-200 transition-all"
                data-testid="button-login"
              >
                {isLoading ? "Signing in..." : (
                  <>Sign In <ArrowRight className="w-5 h-5 ml-2" /></>
                )}
              </Button>

              {biometricAvailable && savedBiometricEmail && (
                <>
                  <div className="relative my-2">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-gray-200" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-3 text-gray-400">Or continue with</span>
                    </div>
                  </div>

                  <Button 
                    type="button"
                    variant="outline"
                    onClick={handleBiometricLogin}
                    disabled={biometricLoading}
                    className="w-full h-14 text-base font-medium border-2 border-gray-200 rounded-2xl hover:bg-gray-50 hover:border-purple-200 transition-all"
                    data-testid="button-biometric-login"
                  >
                    <Fingerprint className="w-5 h-5 mr-2 text-purple-600" />
                    {biometricLoading ? "Authenticating..." : `Sign in with ${biometryType}`}
                  </Button>
                  <p className="text-xs text-center text-gray-400">
                    Quick login as {savedBiometricEmail}
                  </p>
                </>
              )}
            </form>

            <div className="mt-6 pt-6 border-t border-gray-100 text-center text-sm">
              <span className="text-gray-500">Don't have an account? </span>
              <Link href="/register">
                <span className="text-purple-600 font-semibold hover:text-purple-700 cursor-pointer">Create Account</span>
              </Link>
            </div>
          </div>
          
          <div className="mt-8 text-center">
            <p className="flex justify-center items-center gap-2 text-xs text-gray-400">
              <Lock className="w-3 h-3" />
              Secured by FinaTrades Switzerland
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
