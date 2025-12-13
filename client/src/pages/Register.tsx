import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAccountType } from '@/context/AccountTypeContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Building, User, ShieldCheck, Eye, EyeOff, Camera, ArrowRight, ArrowLeft, X, Upload } from 'lucide-react';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Link, useLocation } from 'wouter';

type AccountType = 'personal' | 'business';
type Step = 'select' | 'details' | 'selfie' | 'verification';

export default function Register() {
  const { setAccountType: setContextAccountType } = useAccountType();
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  
  const [step, setStep] = useState<Step>('select');
  const [accountType, setAccountType] = useState<AccountType | null>(null);
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    uppercase: false,
    number: false,
    special: false
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image too large. Please choose an image under 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePhoto(reader.result as string);
        toast.success('Photo uploaded successfully!');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSelectAccountType = (type: AccountType) => {
    setAccountType(type);
    setStep('details');
  };

  const validateDetailsStep = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.firstName.trim()) {
      errors.firstName = "First name is required";
    }
    if (!formData.lastName.trim()) {
      errors.lastName = "Last name is required";
    }
    if (!formData.email.trim()) {
      errors.email = "Email is required";
    }
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

  const handleNextToSelfie = () => {
    if (validateDetailsStep()) {
      setStep('selfie');
    }
  };

  const handleSubmit = async () => {
    if (!formData.agreedToTerms) {
      toast.error("Please agree to the Terms and Conditions");
      return;
    }
    if (!profilePhoto) {
      toast.error("Please take a selfie for identity verification");
      return;
    }

    setIsSubmitting(true);
    try {
      setContextAccountType(accountType!);

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

  const handleDemoAccess = async () => {
    setContextAccountType('personal');
    try {
      await login("demo@finatrades.com", "password");
      toast.success("Demo Access Granted");
    } catch (error) {
      toast.error("Demo access failed");
    }
  };

  return (
    <Layout>
      <div className="min-h-screen pt-20 pb-24 bg-background">
        <div className="container mx-auto px-6 max-w-2xl">
          
          <AnimatePresence mode="wait">
            {step === 'select' && (
              <motion.div
                key="select"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center"
              >
                <h1 className="text-4xl font-bold text-foreground mb-4">Create Your Account</h1>
                <p className="text-muted-foreground mb-8">Choose your account type to get started</p>
                
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  <Card 
                    onClick={() => handleSelectAccountType('personal')}
                    className="p-8 cursor-pointer border-2 hover:border-primary hover:shadow-lg transition-all group"
                    data-testid="card-personal-account"
                  >
                    <div className="w-20 h-20 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <User className="w-10 h-10 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2">Personal Account</h3>
                    <p className="text-sm text-muted-foreground">For individuals looking to buy, sell, and store gold digitally</p>
                  </Card>

                  <Card 
                    onClick={() => handleSelectAccountType('business')}
                    className="p-8 cursor-pointer border-2 hover:border-secondary hover:shadow-lg transition-all group"
                    data-testid="card-corporate-account"
                  >
                    <div className="w-20 h-20 mx-auto mb-4 bg-secondary/10 rounded-full flex items-center justify-center group-hover:bg-secondary/20 transition-colors">
                      <Building className="w-10 h-10 text-secondary" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2">Corporate Account</h3>
                    <p className="text-sm text-muted-foreground">For businesses needing trade finance and gold-backed solutions</p>
                  </Card>
                </div>

                <div className="flex flex-col items-center gap-4">
                  <Button 
                    variant="outline" 
                    onClick={handleDemoAccess}
                    className="border-muted-foreground/30"
                  >
                    Try Demo Account <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    Already have an account?{' '}
                    <Link href="/login">
                      <span className="text-primary font-semibold hover:underline cursor-pointer">Sign In</span>
                    </Link>
                  </p>
                </div>
              </motion.div>
            )}

            {step === 'details' && (
              <motion.div
                key="details"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
              >
                <div className="flex items-center gap-4 mb-6">
                  <Button variant="ghost" size="icon" onClick={() => setStep('select')}>
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <div>
                    <h1 className="text-2xl font-bold text-foreground">
                      {accountType === 'personal' ? 'Personal Account' : 'Corporate Account'}
                    </h1>
                    <p className="text-sm text-muted-foreground">Step 1 of 2: Enter your details</p>
                  </div>
                </div>

                <Card className="p-6 bg-white border-border shadow-md">
                  <div className="space-y-5">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>First Name *</Label>
                        <Input 
                          value={formData.firstName}
                          onChange={e => { setFormData({...formData, firstName: e.target.value}); setFieldErrors(prev => ({...prev, firstName: ''})); }}
                          placeholder="John"
                          className={fieldErrors.firstName ? "border-red-500 focus-visible:ring-red-500" : ""}
                          data-testid="input-first-name"
                        />
                        {fieldErrors.firstName && <p className="text-red-500 text-xs">{fieldErrors.firstName}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label>Last Name *</Label>
                        <Input 
                          value={formData.lastName}
                          onChange={e => { setFormData({...formData, lastName: e.target.value}); setFieldErrors(prev => ({...prev, lastName: ''})); }}
                          placeholder="Doe"
                          className={fieldErrors.lastName ? "border-red-500 focus-visible:ring-red-500" : ""}
                          data-testid="input-last-name"
                        />
                        {fieldErrors.lastName && <p className="text-red-500 text-xs">{fieldErrors.lastName}</p>}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Email Address *</Label>
                      <Input 
                        type="email"
                        value={formData.email}
                        onChange={e => { setFormData({...formData, email: e.target.value}); setFieldErrors(prev => ({...prev, email: ''})); }}
                        placeholder="john@example.com"
                        className={fieldErrors.email ? "border-red-500 focus-visible:ring-red-500" : ""}
                        data-testid="input-email"
                      />
                      {fieldErrors.email && <p className="text-red-500 text-xs">{fieldErrors.email}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label>Phone Number</Label>
                      <Input 
                        type="tel"
                        value={formData.phone}
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                        placeholder="+1 234 567 8900"
                        data-testid="input-phone"
                      />
                    </div>

                    {accountType === 'business' && (
                      <>
                        <div className="space-y-2">
                          <Label>Company Name *</Label>
                          <Input 
                            value={formData.companyName}
                            onChange={e => { setFormData({...formData, companyName: e.target.value}); setFieldErrors(prev => ({...prev, companyName: ''})); }}
                            placeholder="Acme Corporation"
                            className={fieldErrors.companyName ? "border-red-500 focus-visible:ring-red-500" : ""}
                            data-testid="input-company-name"
                          />
                          {fieldErrors.companyName && <p className="text-red-500 text-xs">{fieldErrors.companyName}</p>}
                        </div>
                        <div className="space-y-2">
                          <Label>Registration Number</Label>
                          <Input 
                            value={formData.registrationNumber}
                            onChange={e => setFormData({...formData, registrationNumber: e.target.value})}
                            placeholder="Company registration number"
                            data-testid="input-registration-number"
                          />
                        </div>
                      </>
                    )}

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Password *</Label>
                        <div className="relative">
                          <Input 
                            type={showPassword ? "text" : "password"}
                            value={formData.password}
                            onChange={e => { setFormData({...formData, password: e.target.value}); setFieldErrors(prev => ({...prev, password: ''})); }}
                            placeholder="••••••••"
                            className={`pr-10 ${fieldErrors.password ? "border-red-500 focus-visible:ring-red-500" : ""}`}
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
                        {fieldErrors.password && <p className="text-red-500 text-xs">{fieldErrors.password}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label>Confirm Password *</Label>
                        <Input 
                          type="password"
                          value={formData.confirmPassword}
                          onChange={e => { setFormData({...formData, confirmPassword: e.target.value}); setFieldErrors(prev => ({...prev, confirmPassword: ''})); }}
                          placeholder="••••••••"
                          className={fieldErrors.confirmPassword ? "border-red-500 focus-visible:ring-red-500" : ""}
                          data-testid="input-confirm-password"
                        />
                        {fieldErrors.confirmPassword && <p className="text-red-500 text-xs">{fieldErrors.confirmPassword}</p>}
                      </div>
                    </div>
                    
                    <div className="bg-muted/30 p-4 rounded-xl border border-border text-sm">
                      <p className="text-muted-foreground mb-2 font-medium">Password Requirements:</p>
                      <div className="grid grid-cols-2 gap-2">
                        <PasswordRequirement met={passwordStrength.length} text="At least 8 characters" />
                        <PasswordRequirement met={passwordStrength.uppercase} text="One uppercase letter" />
                        <PasswordRequirement met={passwordStrength.number} text="One number" />
                        <PasswordRequirement met={passwordStrength.special} text="One special character" />
                      </div>
                    </div>

                    <Button 
                      onClick={handleNextToSelfie}
                      className="w-full bg-gradient-to-r from-primary to-secondary text-white h-12 text-lg font-semibold"
                      data-testid="button-next-selfie"
                    >
                      Continue to Photo Verification <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </div>
                </Card>
              </motion.div>
            )}

            {step === 'selfie' && (
              <motion.div
                key="selfie"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
              >
                <div className="flex items-center gap-4 mb-6">
                  <Button variant="ghost" size="icon" onClick={() => setStep('details')}>
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <div>
                    <h1 className="text-2xl font-bold text-foreground">Photo Verification</h1>
                    <p className="text-sm text-muted-foreground">Step 2 of 2: Upload a selfie for identity verification</p>
                  </div>
                </div>

                <Card className="p-6 bg-white border-border shadow-md">
                  <div className="space-y-6">
                    <div className="text-center">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                        data-testid="input-photo-upload"
                      />
                      
                      {!profilePhoto && (
                        <div className="space-y-4">
                          <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="w-48 h-48 mx-auto bg-muted rounded-full flex items-center justify-center border-2 border-dashed border-muted-foreground/30 cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                          >
                            <Upload className="w-16 h-16 text-muted-foreground/50" />
                          </div>
                          <p className="text-muted-foreground">Upload a clear selfie photo for identity verification</p>
                          <Button onClick={() => fileInputRef.current?.click()} className="bg-primary" data-testid="button-upload-photo">
                            <Upload className="w-4 h-4 mr-2" /> Upload Photo
                          </Button>
                        </div>
                      )}

                      {profilePhoto && (
                        <div className="space-y-4">
                          <div className="relative w-48 h-48 mx-auto">
                            <img 
                              src={profilePhoto} 
                              alt="Profile" 
                              className="w-full h-full rounded-full object-cover border-4 border-green-500"
                            />
                            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                              <CheckCircle2 className="w-6 h-6 text-white" />
                            </div>
                          </div>
                          <p className="text-green-600 font-medium">Photo uploaded successfully!</p>
                          <Button 
                            variant="outline" 
                            onClick={() => { setProfilePhoto(null); fileInputRef.current?.click(); }}
                            data-testid="button-change-photo"
                          >
                            <Upload className="w-4 h-4 mr-2" /> Change Photo
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="border-t pt-6 space-y-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="terms" 
                          checked={formData.agreedToTerms}
                          onCheckedChange={(c: any) => setFormData({...formData, agreedToTerms: c})}
                          data-testid="checkbox-terms"
                        />
                        <label htmlFor="terms" className="text-sm text-muted-foreground">
                          I agree to the <span className="text-primary hover:underline cursor-pointer">Terms of Service</span> and <span className="text-primary hover:underline cursor-pointer">Privacy Policy</span>
                        </label>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
                        <ShieldCheck className="w-4 h-4 text-primary" />
                        Your data is encrypted and stored securely.
                      </div>

                      <Button 
                        onClick={handleSubmit}
                        disabled={!profilePhoto || !formData.agreedToTerms || isSubmitting}
                        className="w-full bg-gradient-to-r from-primary to-secondary text-white h-12 text-lg font-semibold disabled:opacity-50"
                        data-testid="button-create-account"
                      >
                        {isSubmitting ? 'Creating Account...' : 'Create Account'} <CheckCircle2 className="w-5 h-5 ml-2" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </Layout>
  );
}

function PasswordRequirement({ met, text }: { met: boolean, text: string }) {
  return (
    <div className={`flex items-center gap-2 text-xs transition-colors ${met ? 'text-green-500' : 'text-muted-foreground'}`}>
      {met ? <CheckCircle2 className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-current" />}
      {text}
    </div>
  );
}
