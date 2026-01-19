import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Building, User, Eye, EyeOff, Camera, RefreshCw, Check, ArrowLeft, ChevronRight, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Link, useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import finatradesLogo from '@/assets/finatrades-logo-purple.png';

type AccountType = 'personal' | 'business';

interface MobileRegisterProps {
  initialReferralCode?: string;
  domainMode: 'personal' | 'business';
}

export default function MobileRegister({ initialReferralCode = '', domainMode }: MobileRegisterProps) {
  const [, setLocation] = useLocation();
  
  const [accountType, setAccountType] = useState<AccountType>(domainMode);
  const [referralCode, setReferralCode] = useState(initialReferralCode);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    companyName: '',
    registrationNumber: '',
    agreedToTerms: false
  });

  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    uppercase: false,
    number: false,
    special: false
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const startCamera = useCallback(async () => {
    setCameraError(null);
    setIsCameraReady(false);
    setCountdown(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      });
      setCameraStream(stream);
    } catch (err: any) {
      console.error('Camera error:', err);
      setCameraError(err.name === 'NotAllowedError' 
        ? 'Camera access denied. Please allow camera access.'
        : 'Unable to access camera. Please check your device settings.');
    }
  }, []);

  useEffect(() => {
    if (cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.onloadedmetadata = () => {
        videoRef.current?.play();
        setIsCameraReady(true);
      };
    }
  }, [cameraStream]);

  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
      setIsCameraReady(false);
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setCountdown(null);
  }, [cameraStream]);

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current && isCameraReady) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setProfilePhoto(dataUrl);
        stopCamera();
        toast.success('Photo captured!');
      }
    }
  }, [isCameraReady, stopCamera]);

  useEffect(() => {
    if (isCameraReady && cameraStream && !profilePhoto && countdown === null) {
      setCountdown(5);
    }
  }, [isCameraReady, cameraStream, profilePhoto, countdown]);

  useEffect(() => {
    if (countdown !== null && countdown > 0 && cameraStream) {
      countdownRef.current = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    } else if (countdown === 0 && isCameraReady && cameraStream) {
      capturePhoto();
    }
    return () => {
      if (countdownRef.current) {
        clearTimeout(countdownRef.current);
      }
    };
  }, [countdown, isCameraReady, cameraStream, capturePhoto]);

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
      if (countdownRef.current) {
        clearTimeout(countdownRef.current);
      }
    };
  }, [cameraStream]);

  const retakePhoto = useCallback(() => {
    setProfilePhoto(null);
    startCamera();
  }, [startCamera]);

  useEffect(() => {
    const p = formData.password;
    setPasswordStrength({
      length: p.length >= 8,
      uppercase: /[A-Z]/.test(p),
      number: /[0-9]/.test(p),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(p)
    });
  }, [formData.password]);

  const isPasswordValid = Object.values(passwordStrength).every(Boolean);

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.firstName.trim()) errors.firstName = "First name is required";
    if (!formData.lastName.trim()) errors.lastName = "Last name is required";
    if (!formData.email.trim()) errors.email = "Email is required";
    if (!formData.password) {
      errors.password = "Password is required";
    } else if (!isPasswordValid) {
      errors.password = "Password doesn't meet requirements";
    }
    if (!formData.confirmPassword) {
      errors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }
    if (accountType === 'business' && !formData.companyName.trim()) {
      errors.companyName = "Company name is required";
    }
    
    setFieldErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      toast.error("Please fill in all required fields");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    if (!formData.agreedToTerms) {
      toast.error("Please agree to the Terms and Conditions");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiRequest('POST', '/api/auth/register', {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phoneNumber: formData.phone,
        password: formData.password,
        accountType: accountType,
        profilePhoto: profilePhoto,
        role: 'user',
        kycStatus: 'Not Started',
        ...(referralCode && { referralCode }),
        ...(accountType === 'business' && {
          companyName: formData.companyName,
          registrationNumber: formData.registrationNumber,
        }),
      });

      sessionStorage.setItem('verificationEmail', formData.email);
      
      toast.success("Account Created!", {
        description: "Please check your email for the verification code."
      });
      
      setLocation('/verify-email');
    } catch (error) {
      toast.error("Registration Failed", {
        description: error instanceof Error ? error.message : "Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-purple-50">
      <div className="px-5 py-6 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <img 
            src={finatradesLogo} 
            alt="Finatrades" 
            className="h-16 mx-auto mb-4"
            style={{ filter: 'brightness(0) saturate(100%) invert(21%) sepia(85%) saturate(4429%) hue-rotate(265deg) brightness(93%) contrast(99%)' }}
            data-testid="img-logo"
          />
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Join Finatrades today</h1>
          <p className="text-gray-500 text-sm">Create your account to get started</p>
        </motion.div>

        <div className="bg-white rounded-3xl shadow-xl shadow-purple-100/50 p-5 border border-purple-100/50">
          <form onSubmit={handleSubmit} className="space-y-5">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="flex rounded-xl border border-gray-200 overflow-hidden bg-gray-50 p-1"
            data-testid="account-type-toggle"
          >
            <button
              type="button"
              onClick={() => setAccountType('personal')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-lg transition-all text-sm font-medium ${
                accountType === 'personal' 
                  ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-md' 
                  : 'text-gray-600'
              }`}
              data-testid="toggle-personal"
            >
              <User className="w-4 h-4" />
              <span>Personal Account</span>
            </button>
            <button
              type="button"
              onClick={() => setAccountType('business')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-lg transition-all text-sm font-medium ${
                accountType === 'business' 
                  ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-md' 
                  : 'text-gray-600'
              }`}
              data-testid="toggle-business"
            >
              <Building className="w-4 h-4" />
              <span>Business Account</span>
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="firstName" className="text-gray-700 text-sm font-medium">First Name *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className={`mt-1.5 h-12 rounded-xl border-gray-200 bg-white ${fieldErrors.firstName ? 'border-red-400 focus:border-red-500' : 'focus:border-purple-500'}`}
                placeholder="Enter your first name"
                data-testid="input-firstname"
              />
              {fieldErrors.firstName && <p className="text-red-500 text-xs mt-1">{fieldErrors.firstName}</p>}
            </div>

            <div>
              <Label htmlFor="lastName" className="text-gray-700 text-sm font-medium">Last Name *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className={`mt-1.5 h-12 rounded-xl border-gray-200 bg-white ${fieldErrors.lastName ? 'border-red-400 focus:border-red-500' : 'focus:border-purple-500'}`}
                placeholder="Enter your last name"
                data-testid="input-lastname"
              />
              {fieldErrors.lastName && <p className="text-red-500 text-xs mt-1">{fieldErrors.lastName}</p>}
            </div>

            <div>
              <Label htmlFor="email" className="text-gray-700 text-sm font-medium">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={`mt-1.5 h-12 rounded-xl border-gray-200 bg-white ${fieldErrors.email ? 'border-red-400 focus:border-red-500' : 'focus:border-purple-500'}`}
                placeholder="you@example.com"
                data-testid="input-email"
              />
              {fieldErrors.email && <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>}
            </div>

            <div>
              <Label htmlFor="phone" className="text-gray-700 text-sm font-medium">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="mt-1.5 h-12 rounded-xl border-gray-200 bg-white focus:border-purple-500"
                placeholder="+1 (555) 000-0000"
                data-testid="input-phone"
              />
            </div>

            {accountType === 'business' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4"
              >
                <div>
                  <Label htmlFor="companyName" className="text-gray-700 text-sm font-medium">Company Name *</Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className={`mt-1.5 h-12 rounded-xl border-gray-200 bg-white ${fieldErrors.companyName ? 'border-red-400' : 'focus:border-purple-500'}`}
                    placeholder="Your company name"
                    data-testid="input-company"
                  />
                  {fieldErrors.companyName && <p className="text-red-500 text-xs mt-1">{fieldErrors.companyName}</p>}
                </div>
                <div>
                  <Label htmlFor="registrationNumber" className="text-gray-700 text-sm font-medium">Registration Number</Label>
                  <Input
                    id="registrationNumber"
                    value={formData.registrationNumber}
                    onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                    className="mt-1.5 h-12 rounded-xl border-gray-200 bg-white focus:border-purple-500"
                    placeholder="Company registration number"
                    data-testid="input-registration"
                  />
                </div>
              </motion.div>
            )}

            <div>
              <Label htmlFor="password" className="text-gray-700 text-sm font-medium">Password *</Label>
              <div className="relative mt-1.5">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={`h-12 rounded-xl border-gray-200 bg-white pr-12 ${fieldErrors.password ? 'border-red-400' : 'focus:border-purple-500'}`}
                  placeholder="Create a strong password"
                  data-testid="input-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 p-1"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {fieldErrors.password && <p className="text-red-500 text-xs mt-1">{fieldErrors.password}</p>}
              <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
                <span className={`text-xs flex items-center gap-1 ${passwordStrength.length ? 'text-green-600' : 'text-gray-400'}`}>
                  <Check className={`w-3 h-3 ${passwordStrength.length ? 'opacity-100' : 'opacity-40'}`} /> 8+ characters
                </span>
                <span className={`text-xs flex items-center gap-1 ${passwordStrength.uppercase ? 'text-green-600' : 'text-gray-400'}`}>
                  <Check className={`w-3 h-3 ${passwordStrength.uppercase ? 'opacity-100' : 'opacity-40'}`} /> Uppercase
                </span>
                <span className={`text-xs flex items-center gap-1 ${passwordStrength.number ? 'text-green-600' : 'text-gray-400'}`}>
                  <Check className={`w-3 h-3 ${passwordStrength.number ? 'opacity-100' : 'opacity-40'}`} /> Number
                </span>
                <span className={`text-xs flex items-center gap-1 ${passwordStrength.special ? 'text-green-600' : 'text-gray-400'}`}>
                  <Check className={`w-3 h-3 ${passwordStrength.special ? 'opacity-100' : 'opacity-40'}`} /> Special char
                </span>
              </div>
            </div>

            <div>
              <Label htmlFor="confirmPassword" className="text-gray-700 text-sm font-medium">Confirm Password *</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className={`mt-1.5 h-12 rounded-xl border-gray-200 bg-white ${fieldErrors.confirmPassword ? 'border-red-400' : 'focus:border-purple-500'}`}
                placeholder="Re-enter your password"
                data-testid="input-confirm-password"
              />
              {fieldErrors.confirmPassword && <p className="text-red-500 text-xs mt-1">{fieldErrors.confirmPassword}</p>}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-gray-50 rounded-xl p-4 border border-gray-100"
          >
            <Label className="text-gray-700 text-sm font-medium mb-3 block">Profile Selfie</Label>
            
            {!profilePhoto && !cameraStream && (
              <div className="text-center py-4">
                <Button
                  type="button"
                  onClick={startCamera}
                  variant="outline"
                  className="gap-2 h-12 rounded-xl border-gray-300 hover:bg-gray-100"
                  data-testid="button-start-camera"
                >
                  <Camera className="w-5 h-5" />
                  Open Camera
                </Button>
              </div>
            )}

            {cameraError && (
              <div className="text-center text-red-500 py-4">
                <p className="text-sm">{cameraError}</p>
                <Button type="button" onClick={startCamera} variant="outline" className="mt-2 h-10 rounded-xl">
                  Try Again
                </Button>
              </div>
            )}

            {cameraStream && !profilePhoto && (
              <div className="relative rounded-xl overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full aspect-[4/3] bg-gray-900 object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                />
                <canvas ref={canvasRef} className="hidden" />
                
                {!isCameraReady && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                    <p className="text-white text-sm">Loading camera...</p>
                  </div>
                )}
                
                {countdown !== null && countdown > 0 && isCameraReady && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-black/60 text-white text-5xl font-bold rounded-full w-20 h-20 flex items-center justify-center">
                      {countdown}
                    </div>
                  </div>
                )}
                
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-3">
                  <Button
                    type="button"
                    onClick={stopCamera}
                    variant="secondary"
                    className="h-10 rounded-full px-4 bg-white/90"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={capturePhoto}
                    disabled={!isCameraReady}
                    className="h-10 rounded-full px-4 bg-purple-600 hover:bg-purple-700"
                  >
                    Capture Now
                  </Button>
                </div>
              </div>
            )}

            {profilePhoto && (
              <div className="relative">
                <img 
                  src={profilePhoto} 
                  alt="Profile" 
                  className="w-full aspect-[4/3] object-cover rounded-xl"
                />
                <Button
                  type="button"
                  onClick={retakePhoto}
                  variant="secondary"
                  size="sm"
                  className="absolute bottom-3 right-3 gap-1 h-9 rounded-full bg-white/90"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retake
                </Button>
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Label htmlFor="referralCode" className="text-gray-700 text-sm font-medium">Referral Code (optional)</Label>
            <Input
              id="referralCode"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value)}
              className="mt-1.5 h-12 rounded-xl border-gray-200 bg-white focus:border-purple-500"
              placeholder="Enter referral code if you have one"
              data-testid="input-referral"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="flex items-start gap-3 py-2"
          >
            <Checkbox
              id="terms"
              checked={formData.agreedToTerms}
              onCheckedChange={(checked) => setFormData({ ...formData, agreedToTerms: checked as boolean })}
              className="mt-0.5 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
              data-testid="checkbox-terms"
            />
            <Label htmlFor="terms" className="text-sm text-gray-600 leading-relaxed">
              I agree to the{' '}
              <Link href="/finagold/terms" className="text-purple-600 font-medium">Terms of Service</Link>
              {' '}and{' '}
              <Link href="/finagold/privacy" className="text-purple-600 font-medium">Privacy Policy</Link>
            </Label>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-3 pt-2"
          >
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-14 rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold text-base shadow-lg shadow-purple-500/25"
              data-testid="button-submit"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Creating Account...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Create Account
                  <ChevronRight className="w-5 h-5" />
                </span>
              )}
            </Button>

            <p className="text-center text-sm text-gray-500">
              Already have an account?{' '}
              <Link href="/sign-in" className="text-purple-600 font-medium">Sign In</Link>
            </p>
          </motion.div>
          </form>
        </div>
        
        <div className="mt-6 text-center">
          <p className="flex justify-center items-center gap-2 text-xs text-gray-400">
            <Lock className="w-3 h-3" />
            Secured by FinaTrades Switzerland
          </p>
        </div>
      </div>
    </div>
  );
}
