import React, { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useAccountType } from '@/context/AccountTypeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Building, User, Upload, ShieldCheck, Eye, EyeOff, Camera } from 'lucide-react';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

export default function Onboarding() {
  const { t } = useLanguage();
  const { setAccountType: setContextAccountType } = useAccountType();
  
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

  const handleSubmit = () => {
    if (!formData.email || !formData.password || !formData.firstName || !formData.lastName) {
      toast.error("Please fill in all required fields");
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

    // Update global context
    setContextAccountType(accountType);

    toast.success("Account Created Successfully!", {
      description: "Please check your email to verify your account."
    });
  };

  return (
    <Layout>
      <div className="min-h-screen pt-20 pb-24 bg-[#0D001E]">
        <div className="container mx-auto px-6 max-w-3xl">
          
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold text-white mb-4">Create your Account</h1>
            <p className="text-white/60">Join the future of gold-backed digital finance.</p>
          </div>

          <Card className="p-8 bg-white/5 border-white/10 backdrop-blur-sm">
            
            {/* Account Type Toggle */}
            <div className="grid grid-cols-2 gap-4 p-1 bg-white/5 rounded-xl mb-8">
              <button
                onClick={() => setAccountType('personal')}
                className={`flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all ${
                  accountType === 'personal' 
                    ? 'bg-[#8A2BE2] text-white shadow-lg' 
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <User className="w-4 h-4" /> Personal
              </button>
              <button
                onClick={() => setAccountType('business')}
                className={`flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all ${
                  accountType === 'business' 
                    ? 'bg-[#D4AF37] text-black shadow-lg' 
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Building className="w-4 h-4" /> Corporate
              </button>
            </div>

            <div className="space-y-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-white/10 pb-2">
                  1. Account Information
                </h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>First Name</Label>
                    <Input 
                      value={formData.firstName}
                      onChange={e => setFormData({...formData, firstName: e.target.value})}
                      className="bg-white/5 border-white/10 text-white" 
                      placeholder="John"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Last Name</Label>
                    <Input 
                      value={formData.lastName}
                      onChange={e => setFormData({...formData, lastName: e.target.value})}
                      className="bg-white/5 border-white/10 text-white" 
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
                    className="bg-white/5 border-white/10 text-white" 
                    placeholder="john@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input 
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="bg-white/5 border-white/10 text-white" 
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
                        className="bg-white/5 border-white/10 text-white pr-10" 
                        placeholder="••••••••"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
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
                      className="bg-white/5 border-white/10 text-white" 
                      placeholder="••••••••"
                    />
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
                    <h3 className="text-lg font-semibold text-white border-b border-white/10 pb-2 pt-4">
                      2. Company Details
                    </h3>
                    
                    <div className="space-y-2">
                      <Label>Company Name</Label>
                      <Input 
                        value={formData.companyName}
                        onChange={e => setFormData({...formData, companyName: e.target.value})}
                        className="bg-white/5 border-white/10 text-white" 
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Business Role</Label>
                      <Select value={businessRole} onValueChange={(v: any) => setBusinessRole(v)}>
                        <SelectTrigger className="bg-white/5 border-white/10 text-white">
                          <SelectValue placeholder="Select Role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="importer">Importer</SelectItem>
                          <SelectItem value="exporter">Exporter</SelectItem>
                          <SelectItem value="both">Both (Import & Export)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-white/40">This helps us tailor FinaBridge for your trade needs.</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Registration Number</Label>
                        <Input 
                          value={formData.registrationNumber}
                          onChange={e => setFormData({...formData, registrationNumber: e.target.value})}
                          className="bg-white/5 border-white/10 text-white" 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Jurisdiction</Label>
                        <Input 
                          value={formData.jurisdiction}
                          onChange={e => setFormData({...formData, jurisdiction: e.target.value})}
                          placeholder="e.g. Switzerland"
                          className="bg-white/5 border-white/10 text-white" 
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* KYC Upload (Simplified) */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-white/10 pb-2 pt-4">
                  {accountType === 'business' ? '3. Verification Documents' : '2. Verification Documents'}
                </h3>
                
                <div className={`grid gap-4 ${accountType === 'business' ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
                  {/* Standard ID / Certificate */}
                  <div className="border-2 border-dashed border-white/20 rounded-xl p-6 text-center hover:bg-white/5 transition-colors cursor-pointer group flex flex-col items-center justify-center">
                    <Upload className="w-8 h-8 text-white/40 mx-auto mb-2 group-hover:text-[#8A2BE2] transition-colors" />
                    <h4 className="font-medium text-white text-sm mb-1">
                      {accountType === 'personal' ? 'Passport / ID Card' : 'Certificate of Incorporation'}
                    </h4>
                    <p className="text-xs text-white/40">Click to upload</p>
                  </div>

                  {/* Business Only: Articles */}
                  {accountType === 'business' && (
                    <div className="border-2 border-dashed border-white/20 rounded-xl p-6 text-center hover:bg-white/5 transition-colors cursor-pointer group flex flex-col items-center justify-center">
                      <Upload className="w-8 h-8 text-white/40 mx-auto mb-2 group-hover:text-[#D4AF37] transition-colors" />
                      <h4 className="font-medium text-white text-sm mb-1">
                        Articles of Association
                      </h4>
                      <p className="text-xs text-white/40">Click to upload</p>
                    </div>
                  )}

                  {/* Selfie Option (Both) */}
                  <div className="border-2 border-dashed border-white/20 rounded-xl p-6 text-center hover:bg-white/5 transition-colors cursor-pointer group flex flex-col items-center justify-center">
                    <Camera className="w-8 h-8 text-white/40 mx-auto mb-2 group-hover:text-[#FF2FBF] transition-colors" />
                    <h4 className="font-medium text-white text-sm mb-1">
                      Take a Selfie
                    </h4>
                    <p className="text-xs text-white/40">For identity verification</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-xs text-white/40 bg-white/5 p-3 rounded-lg">
                  <ShieldCheck className="w-4 h-4 text-[#8A2BE2]" />
                  Your data is encrypted and stored securely in Switzerland.
                </div>
              </div>

              {/* Terms and Submit */}
              <div className="pt-6 border-t border-white/10 space-y-6">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="terms" 
                    checked={formData.agreedToTerms}
                    onCheckedChange={(c: any) => setFormData({...formData, agreedToTerms: c})}
                    className="border-white/20 data-[state=checked]:bg-[#8A2BE2] data-[state=checked]:border-[#8A2BE2]"
                  />
                  <label
                    htmlFor="terms"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-white/80"
                  >
                    I agree to the <span className="text-[#8A2BE2] hover:underline cursor-pointer">Terms of Service</span> and <span className="text-[#8A2BE2] hover:underline cursor-pointer">Privacy Policy</span>
                  </label>
                </div>

                <Button 
                  onClick={handleSubmit}
                  className="w-full bg-gradient-to-r from-[#8A2BE2] to-[#FF2FBF] text-white hover:opacity-90 h-12 text-lg font-bold rounded-xl"
                >
                  Create Account <CheckCircle2 className="w-5 h-5 ml-2" />
                </Button>
              </div>

            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
