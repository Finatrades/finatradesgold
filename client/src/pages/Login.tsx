import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, EyeOff, ArrowRight, Lock, Shield, ArrowLeft, Fingerprint } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Link, useLocation } from 'wouter';
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import BiometricService from '@/lib/biometric-service';
import { useIsMobile } from '@/hooks/useIsMobile';
import MobileLogin from '@/components/mobile/MobileLogin';

export default function Login() {
  const isMobile = useIsMobile();
  
  if (isMobile) {
    return <MobileLogin />;
  }
  
  return <DesktopLogin />;
}

function DesktopLogin() {
  const { login, verifyMfa, user, loading, setUser } = useAuth();
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // MFA state
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaChallengeToken, setMfaChallengeToken] = useState('');
  const [mfaCode, setMfaCode] = useState('');

  // Biometric state
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometryType, setBiometryType] = useState('');
  const [savedBiometricEmail, setSavedBiometricEmail] = useState<string | null>(null);
  const [biometricLoading, setBiometricLoading] = useState(false);

  useEffect(() => {
    if (user) {
      // Regular login page always goes to user dashboard
      // Admins must use /admin/login to access admin portal
      setLocation('/dashboard');
    }
  }, [user, setLocation]);

  // Check biometric availability on mount
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

      // Get stored credentials
      const credentials = await BiometricService.getCredentials();
      if (!credentials) {
        toast.error("Could not retrieve credentials");
        setBiometricLoading(false);
        return;
      }

      // Call biometric login API
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
      // Check if this is an admin redirect error
      const err = error as Error & { redirectTo?: string };
      const errorMessage = error instanceof Error ? error.message : "";
      
      if (err.redirectTo) {
        toast.error("Admin Account Detected", {
          description: err.message,
          action: {
            label: "Go to Admin Login",
            onClick: () => setLocation(err.redirectTo!)
          }
        });
        // Also auto-redirect after 2 seconds
        setTimeout(() => setLocation(err.redirectTo!), 2000);
      } else if (errorMessage.toLowerCase().includes("verify your email")) {
        // Store email and redirect to verification page
        sessionStorage.setItem('verificationEmail', email);
        toast.error("Email Verification Required", {
          description: "Please enter the 6-digit code sent to your email.",
          action: {
            label: "Enter Code",
            onClick: () => setLocation('/verify-email')
          }
        });
        // Auto-redirect after 2 seconds
        setTimeout(() => setLocation('/verify-email'), 2000);
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
      <div className="min-h-screen bg-background text-foreground">
        <div className="min-h-screen py-12 bg-background flex items-center justify-center">
          <div className="container mx-auto px-6 max-w-md">
            
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary flex items-center justify-center">
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
                  className="w-full bg-primary text-white hover:bg-primary/90 h-12 text-lg font-bold rounded-xl shadow-lg shadow-purple-500/20 transition-all"
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
            <div className="flex justify-center mb-4">
              <img 
                src="/finatrades-logo.png" 
                alt="Finatrades" 
                className="h-16 w-auto"
                style={{ filter: 'hue-rotate(280deg) saturate(1.5)' }}
              />
            </div>
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
                    <span className="text-xs text-primary hover:underline cursor-pointer font-medium">Forgot password?</span>
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
                className="w-full bg-primary text-white hover:bg-primary/90 h-12 text-lg font-bold rounded-xl shadow-lg shadow-purple-500/20 transition-all"
                data-testid="button-login"
              >
                {isLoading ? "Signing in..." : (
                  <>Sign In <ArrowRight className="w-5 h-5 ml-2" /></>
                )}
              </Button>

              {/* Biometric Login Button */}
              {biometricAvailable && savedBiometricEmail && (
                <>
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-muted-foreground">Or continue with</span>
                    </div>
                  </div>

                  <Button 
                    type="button"
                    variant="outline"
                    onClick={handleBiometricLogin}
                    disabled={biometricLoading}
                    className="w-full h-12 text-lg font-medium border-2"
                    data-testid="button-biometric-login"
                  >
                    <Fingerprint className="w-5 h-5 mr-2" />
                    {biometricLoading ? "Authenticating..." : `Sign in with ${biometryType}`}
                  </Button>
                  <p className="text-xs text-center text-muted-foreground mt-2">
                    Quick login as {savedBiometricEmail}
                  </p>
                </>
              )}
            </form>

            <div className="mt-8 text-center text-sm">
              <span className="text-muted-foreground">Don't have an account? </span>
              <Link href="/register">
                <span className="text-purple-500 font-bold hover:text-purple-600 hover:underline cursor-pointer transition-colors">Create Account</span>
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
