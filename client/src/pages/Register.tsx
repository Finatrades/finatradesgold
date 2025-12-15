import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAccountType } from '@/context/AccountTypeContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Building, User, Eye, EyeOff, Camera, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Link, useLocation } from 'wouter';

type AccountType = 'personal' | 'business';

export default function Register() {
  const { setAccountType: setContextAccountType } = useAccountType();
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  
  const [accountType, setAccountType] = useState<AccountType>('personal');
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
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setIsCameraReady(true);
        };
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      setCameraError(err.name === 'NotAllowedError' 
        ? 'Camera access denied. Please allow camera access.'
        : 'Unable to access camera. Please check your device settings.');
    }
  }, []);

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
    if (isCameraReady && !profilePhoto && countdown === null) {
      setCountdown(5);
    }
  }, [isCameraReady, profilePhoto, countdown]);

  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      countdownRef.current = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    } else if (countdown === 0 && isCameraReady) {
      capturePhoto();
    }
    return () => {
      if (countdownRef.current) {
        clearTimeout(countdownRef.current);
      }
    };
  }, [countdown, isCameraReady, capturePhoto]);

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
    if (!profilePhoto) {
      errors.photo = "Please capture your selfie";
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
      setContextAccountType(accountType);

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phoneNumber: formData.phone,
          password: formData.password,
          accountType: accountType,
          profilePhoto: profilePhoto,
          role: 'user',
          kycStatus: 'Not Started',
          ...(accountType === 'business' && {
            companyName: formData.companyName,
            registrationNumber: formData.registrationNumber,
          }),
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

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
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Create Your Account</h1>
          <p className="text-muted-foreground">Join Finatrades today</p>
        </div>

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex rounded-lg border overflow-hidden" data-testid="account-type-toggle">
              <button
                type="button"
                onClick={() => setAccountType('personal')}
                className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 transition-colors ${
                  accountType === 'personal' 
                    ? 'bg-primary text-white' 
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
                data-testid="toggle-personal"
              >
                <User className="w-5 h-5" />
                <span className="font-medium">Personal</span>
              </button>
              <button
                type="button"
                onClick={() => setAccountType('business')}
                className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 transition-colors ${
                  accountType === 'business' 
                    ? 'bg-primary text-white' 
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
                data-testid="toggle-business"
              >
                <Building className="w-5 h-5" />
                <span className="font-medium">Corporate</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className={fieldErrors.firstName ? 'border-red-500' : ''}
                  data-testid="input-firstname"
                />
                {fieldErrors.firstName && <p className="text-red-500 text-xs mt-1">{fieldErrors.firstName}</p>}
              </div>
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className={fieldErrors.lastName ? 'border-red-500' : ''}
                  data-testid="input-lastname"
                />
                {fieldErrors.lastName && <p className="text-red-500 text-xs mt-1">{fieldErrors.lastName}</p>}
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={fieldErrors.email ? 'border-red-500' : ''}
                data-testid="input-email"
              />
              {fieldErrors.email && <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>}
            </div>

            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                data-testid="input-phone"
              />
            </div>

            {accountType === 'business' && (
              <>
                <div>
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className={fieldErrors.companyName ? 'border-red-500' : ''}
                    data-testid="input-company"
                  />
                  {fieldErrors.companyName && <p className="text-red-500 text-xs mt-1">{fieldErrors.companyName}</p>}
                </div>
                <div>
                  <Label htmlFor="registrationNumber">Registration Number</Label>
                  <Input
                    id="registrationNumber"
                    value={formData.registrationNumber}
                    onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                    data-testid="input-registration"
                  />
                </div>
              </>
            )}

            <div>
              <Label htmlFor="password">Password *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={fieldErrors.password ? 'border-red-500 pr-10' : 'pr-10'}
                  data-testid="input-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.password && <p className="text-red-500 text-xs mt-1">{fieldErrors.password}</p>}
              <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
                <span className={passwordStrength.length ? 'text-green-600' : 'text-gray-400'}>✓ 8+ characters</span>
                <span className={passwordStrength.uppercase ? 'text-green-600' : 'text-gray-400'}>✓ Uppercase</span>
                <span className={passwordStrength.number ? 'text-green-600' : 'text-gray-400'}>✓ Number</span>
                <span className={passwordStrength.special ? 'text-green-600' : 'text-gray-400'}>✓ Special char</span>
              </div>
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className={fieldErrors.confirmPassword ? 'border-red-500' : ''}
                data-testid="input-confirm-password"
              />
              {fieldErrors.confirmPassword && <p className="text-red-500 text-xs mt-1">{fieldErrors.confirmPassword}</p>}
            </div>

            <div className="border rounded-lg p-4">
              <Label className="mb-3 block">Profile Selfie *</Label>
              {fieldErrors.photo && <p className="text-red-500 text-xs mb-2">{fieldErrors.photo}</p>}
              
              {!profilePhoto && !cameraStream && (
                <div className="text-center">
                  <Button
                    type="button"
                    onClick={startCamera}
                    variant="outline"
                    className="gap-2"
                    data-testid="button-start-camera"
                  >
                    <Camera className="w-5 h-5" />
                    Open Camera
                  </Button>
                </div>
              )}

              {cameraError && (
                <div className="text-center text-red-500 py-4">
                  <p>{cameraError}</p>
                  <Button type="button" onClick={startCamera} variant="outline" className="mt-2">
                    Try Again
                  </Button>
                </div>
              )}

              {cameraStream && !profilePhoto && (
                <div className="relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full rounded-lg bg-black"
                    style={{ transform: 'scaleX(-1)' }}
                  />
                  <canvas ref={canvasRef} className="hidden" />
                  
                  {countdown !== null && countdown > 0 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-black/50 text-white text-6xl font-bold rounded-full w-24 h-24 flex items-center justify-center">
                        {countdown}
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-3 flex justify-center gap-3">
                    <Button
                      type="button"
                      onClick={capturePhoto}
                      disabled={!isCameraReady}
                      className="gap-2"
                      data-testid="button-capture"
                    >
                      <Camera className="w-5 h-5" />
                      Capture Now
                    </Button>
                    <Button
                      type="button"
                      onClick={stopCamera}
                      variant="outline"
                      data-testid="button-cancel-camera"
                    >
                      Cancel
                    </Button>
                  </div>
                  <p className="text-center text-sm text-muted-foreground mt-2">
                    Auto-capture in {countdown || 0} seconds
                  </p>
                </div>
              )}

              {profilePhoto && (
                <div className="text-center">
                  <img
                    src={profilePhoto}
                    alt="Profile selfie"
                    className="w-40 h-40 mx-auto rounded-full object-cover border-4 border-primary"
                  />
                  <Button
                    type="button"
                    onClick={retakePhoto}
                    variant="outline"
                    className="mt-3 gap-2"
                    data-testid="button-retake"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Retake Photo
                  </Button>
                </div>
              )}
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="terms"
                checked={formData.agreedToTerms}
                onCheckedChange={(checked) => setFormData({ ...formData, agreedToTerms: checked as boolean })}
                data-testid="checkbox-terms"
              />
              <Label htmlFor="terms" className="text-sm text-muted-foreground leading-relaxed">
                I agree to the <Link href="/terms" className="text-primary hover:underline">Terms and Conditions</Link> and <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
              </Label>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white py-6"
              data-testid="button-submit"
            >
              {isSubmitting ? 'Creating Account...' : 'Create Account'}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="text-primary font-semibold hover:underline">
                Sign In
              </Link>
            </p>
          </form>
        </Card>
      </div>
    </div>
  );
}
