import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useAccountType } from '@/context/AccountTypeContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Building, User, Upload, ShieldCheck, Eye, EyeOff, Camera, ArrowRight } from 'lucide-react';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Link, useLocation } from 'wouter';

export default function Register() {
  const { t } = useLanguage();
  const { setAccountType: setContextAccountType } = useAccountType();
  const { login, register } = useAuth();
  const [, setLocation] = useLocation();
  
  const [accountType, setAccountType] = useState<'personal' | 'business'>('personal');
  const [businessRole, setBusinessRole] = useState<'importer' | 'exporter' | 'both'>('importer');
  const [showPassword, setShowPassword] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    companyName: '',
    registrationNumber: '',
    jurisdiction: '',
    agreedToTerms: false
  });

  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    uppercase: false,
    number: false,
    special: false
  });

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

  const handleSubmit = async () => {
    if (!formData.email || !formData.password || !formData.firstName || !formData.lastName) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (!isPasswordValid) {
        toast.error("Please ensure your password meets all security requirements");
        return;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (!formData.agreedToTerms) {
      toast.error("Please agree to the Terms and Conditions");
      return;
    }

    try {
      // Update global context
      setContextAccountType(accountType);

      // Register via API
      await register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        accountType: accountType,
        role: 'user',
        kycStatus: 'Not Started',
      });

      toast.success("Account Created Successfully!", {
        description: "Identity verification is mandatory to access the platform."
      });
    } catch (error) {
      toast.error("Registration Failed", {
        description: error instanceof Error ? error.message : "Please try again."
      });
    }
  };

  const handleDemoAccess = async () => {
    setContextAccountType('personal');
    try {
      await login("demo@finatrades.com", "password");
      toast.success("Demo Access Granted", {
        description: "Welcome. Please complete KYC to unlock full access."
      });
    } catch (error) {
      toast.error("Demo access failed", {
        description: "Please try registering a new account."
      });
    }
  };

  return (
    <Layout>
      <div className="min-h-screen pt-20 pb-24 bg-background">
        <div className="container mx-auto px-6 max-w-3xl">
          
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold text-foreground mb-4">Create your Account</h1>
            <p className="text-muted-foreground mb-6">Join the future of gold-backed digital finance.</p>
            
            {/* Demo Access Button */}
            <Button 
              variant="outline" 
              onClick={handleDemoAccess}
              className="border-secondary text-secondary hover:bg-secondary/10"
            >
              Skip to Dashboard (Demo) <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          <Card className="p-8 bg-white border-border shadow-md backdrop-blur-sm">
            
            {/* Account Type Toggle */}
            <div className="grid grid-cols-2 gap-4 p-1 bg-muted/50 rounded-xl mb-8">
              <button
                onClick={() => setAccountType('personal')}
                className={`flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all ${
                  accountType === 'personal' 
                    ? 'bg-primary text-white shadow-lg' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                }`}
              >
                <User className="w-4 h-4" /> Personal
              </button>
              <button
                onClick={() => setAccountType('business')}
                className={`flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all ${
                  accountType === 'business' 
                    ? 'bg-secondary text-white shadow-lg' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                }`}
              >
                <Building className="w-4 h-4" /> Corporate
              </button>
            </div>

            <div className="space-y-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">
                  1. Account Information
                </h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>First Name</Label>
                    <Input 
                      value={formData.firstName}
                      onChange={e => setFormData({...formData, firstName: e.target.value})}
                      className="bg-background border-input text-foreground" 
                      placeholder="John"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Last Name</Label>
                    <Input 
                      value={formData.lastName}
                      onChange={e => setFormData({...formData, lastName: e.target.value})}
                      className="bg-background border-input text-foreground" 
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input 
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="bg-background border-input text-foreground" 
                    placeholder="john@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input 
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="bg-background border-input text-foreground" 
                    placeholder="+41 79 123 45 67"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <div className="relative">
                      <Input 
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={e => setFormData({...formData, password: e.target.value})}
                        className="bg-background border-input text-foreground pr-10" 
                        placeholder="••••••••"
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
                  <div className="space-y-2">
                    <Label>Confirm Password</Label>
                    <Input 
                      type="password"
                      value={formData.confirmPassword}
                      onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                      className="bg-background border-input text-foreground" 
                      placeholder="••••••••"
                    />
                  </div>
                </div>
                
                {/* Password Strength Indicator */}
                <div className="bg-muted/30 p-4 rounded-xl border border-border text-sm">
                  <p className="text-muted-foreground mb-2 font-medium">Password Requirements:</p>
                  <div className="grid grid-cols-2 gap-2">
                    <PasswordRequirement met={passwordStrength.length} text="At least 8 characters" />
                    <PasswordRequirement met={passwordStrength.uppercase} text="One uppercase letter" />
                    <PasswordRequirement met={passwordStrength.number} text="One number" />
                    <PasswordRequirement met={passwordStrength.special} text="One special character" />
                  </div>
                </div>

              </div>

              {/* Business Details (Conditional) */}
              <AnimatePresence>
                {accountType === 'business' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4 overflow-hidden"
                  >
                    <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2 pt-4">
                      2. Company Details
                    </h3>
                    
                    <div className="space-y-2">
                      <Label>Company Name</Label>
                      <Input 
                        value={formData.companyName}
                        onChange={e => setFormData({...formData, companyName: e.target.value})}
                        className="bg-background border-input text-foreground" 
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Business Role</Label>
                      <Select value={businessRole} onValueChange={(v: any) => setBusinessRole(v)}>
                        <SelectTrigger className="bg-background border-input text-foreground">
                          <SelectValue placeholder="Select Role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="importer">Importer</SelectItem>
                          <SelectItem value="exporter">Exporter</SelectItem>
                          <SelectItem value="both">Both (Import & Export)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">This helps us tailor FinaBridge for your trade needs.</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Registration Number</Label>
                        <Input 
                          value={formData.registrationNumber}
                          onChange={e => setFormData({...formData, registrationNumber: e.target.value})}
                          className="bg-background border-input text-foreground" 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Jurisdiction</Label>
                        <Input 
                          value={formData.jurisdiction}
                          onChange={e => setFormData({...formData, jurisdiction: e.target.value})}
                          placeholder="e.g. Switzerland"
                          className="bg-background border-input text-foreground" 
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* KYC Upload (Simplified) */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2 pt-4">
                  {accountType === 'business' ? '3. Verification Documents' : '2. Verification Documents'}
                </h3>
                
                <div className={`grid gap-4 ${accountType === 'business' ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
                  {/* Standard ID / Certificate */}
                  <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:bg-muted/50 transition-colors cursor-pointer group flex flex-col items-center justify-center">
                    <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2 group-hover:text-primary transition-colors" />
                    <h4 className="font-medium text-foreground text-sm mb-1">
                      {accountType === 'personal' ? 'Passport / ID Card' : 'Certificate of Incorporation'}
                    </h4>
                    <p className="text-xs text-muted-foreground">Click to upload</p>
                  </div>

                  {/* Business Only: Articles */}
                  {accountType === 'business' && (
                    <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:bg-muted/50 transition-colors cursor-pointer group flex flex-col items-center justify-center">
                      <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2 group-hover:text-secondary transition-colors" />
                      <h4 className="font-medium text-foreground text-sm mb-1">
                        Articles of Association
                      </h4>
                      <p className="text-xs text-muted-foreground">Click to upload</p>
                    </div>
                  )}

                  {/* Selfie Option (Both) */}
                  <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:bg-muted/50 transition-colors cursor-pointer group flex flex-col items-center justify-center">
                    <Camera className="w-8 h-8 text-muted-foreground mx-auto mb-2 group-hover:text-accent transition-colors" />
                    <h4 className="font-medium text-foreground text-sm mb-1">
                      Take a Selfie
                    </h4>
                    <p className="text-xs text-muted-foreground">For identity verification</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  Your data is encrypted and stored securely in Switzerland.
                </div>
              </div>

              {/* Terms and Submit */}
              <div className="pt-6 border-t border-border space-y-6">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="terms" 
                    checked={formData.agreedToTerms}
                    onCheckedChange={(c: any) => setFormData({...formData, agreedToTerms: c})}
                    className="border-input data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <label
                    htmlFor="terms"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-muted-foreground"
                  >
                    I agree to the <span className="text-primary hover:underline cursor-pointer">Terms of Service</span> and <span className="text-primary hover:underline cursor-pointer">Privacy Policy</span>
                  </label>
                </div>

                <Button 
                  onClick={handleSubmit}
                  className="w-full bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90 h-12 text-lg font-bold rounded-xl shadow-lg shadow-orange-500/20"
                >
                  Create Account <CheckCircle2 className="w-5 h-5 ml-2" />
                </Button>

                <div className="text-center text-sm">
                   <span className="text-muted-foreground">Already have an account? </span>
                   <Link href="/login">
                     <span className="text-secondary font-bold hover:underline cursor-pointer">Sign In</span>
                   </Link>
                </div>
              </div>

            </div>
          </Card>
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
