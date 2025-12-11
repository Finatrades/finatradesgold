import React, { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useAccountType } from '@/context/AccountTypeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Building, User, FileText, Upload, ShieldCheck, ArrowRight, ArrowLeft } from 'lucide-react';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

type Step = 'account-type' | 'basic-info' | 'business-details' | 'kyc-documents' | 'review';

export default function Onboarding() {
  const { t } = useLanguage();
  const { accountType: contextAccountType, setAccountType: setContextAccountType } = useAccountType();
  
  const [currentStep, setCurrentStep] = useState<Step>('account-type');
  const [accountType, setAccountType] = useState<'personal' | 'business'>('personal');
  const [businessRole, setBusinessRole] = useState<'importer' | 'exporter' | 'both'>('importer');
  
  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    companyName: '',
    registrationNumber: '',
    jurisdiction: '',
  });

  const handleNext = () => {
    if (currentStep === 'account-type') {
      setContextAccountType(accountType);
      setCurrentStep('basic-info');
    } else if (currentStep === 'basic-info') {
      if (accountType === 'business') {
        setCurrentStep('business-details');
      } else {
        setCurrentStep('kyc-documents');
      }
    } else if (currentStep === 'business-details') {
      setCurrentStep('kyc-documents');
    } else if (currentStep === 'kyc-documents') {
      setCurrentStep('review');
    }
  };

  const handleBack = () => {
    if (currentStep === 'basic-info') setCurrentStep('account-type');
    else if (currentStep === 'business-details') setCurrentStep('basic-info');
    else if (currentStep === 'kyc-documents') {
      setCurrentStep(accountType === 'business' ? 'business-details' : 'basic-info');
    } else if (currentStep === 'review') setCurrentStep('kyc-documents');
  };

  const handleSubmit = () => {
    toast.success("Application Submitted Successfully!", {
      description: "Our compliance team will review your documents within 24-48 hours."
    });
    // Here you would redirect to dashboard or success page
  };

  return (
    <Layout>
      <div className="min-h-screen pt-12 pb-24 bg-[#0D001E]">
        <div className="container mx-auto px-6 max-w-4xl">
          
          {/* Progress Bar */}
          <div className="mb-12">
            <div className="flex justify-between mb-4">
              <span className={`text-sm font-medium ${currentStep === 'account-type' ? 'text-[#8A2BE2]' : 'text-white/40'}`}>Account Type</span>
              <span className={`text-sm font-medium ${currentStep === 'basic-info' ? 'text-[#8A2BE2]' : 'text-white/40'}`}>Details</span>
              {accountType === 'business' && (
                <span className={`text-sm font-medium ${currentStep === 'business-details' ? 'text-[#8A2BE2]' : 'text-white/40'}`}>Business</span>
              )}
              <span className={`text-sm font-medium ${currentStep === 'kyc-documents' ? 'text-[#8A2BE2]' : 'text-white/40'}`}>KYC</span>
              <span className={`text-sm font-medium ${currentStep === 'review' ? 'text-[#8A2BE2]' : 'text-white/40'}`}>Review</span>
            </div>
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-gradient-to-r from-[#8A2BE2] to-[#FF2FBF]"
                initial={{ width: '0%' }}
                animate={{ 
                  width: currentStep === 'account-type' ? '20%' : 
                         currentStep === 'basic-info' ? '40%' :
                         currentStep === 'business-details' ? '60%' :
                         currentStep === 'kyc-documents' ? '80%' : '100%'
                }}
              />
            </div>
          </div>

          <Card className="p-8 bg-white/5 border-white/10 backdrop-blur-sm min-h-[500px] flex flex-col">
            <AnimatePresence mode="wait">
              
              {/* STEP 1: ACCOUNT TYPE */}
              {currentStep === 'account-type' && (
                <motion.div 
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex-1"
                >
                  <h2 className="text-3xl font-bold text-white mb-2">Choose Account Type</h2>
                  <p className="text-white/60 mb-8">Select how you want to use Finatrades.</p>

                  <RadioGroup value={accountType} onValueChange={(v: any) => setAccountType(v)} className="grid md:grid-cols-2 gap-6">
                    <div className={`cursor-pointer rounded-2xl border-2 p-6 transition-all ${accountType === 'personal' ? 'border-[#8A2BE2] bg-[#8A2BE2]/10' : 'border-white/10 hover:border-white/20'}`}>
                      <RadioGroupItem value="personal" id="personal" className="hidden" />
                      <label htmlFor="personal" className="cursor-pointer block">
                        <User className={`w-12 h-12 mb-4 ${accountType === 'personal' ? 'text-[#8A2BE2]' : 'text-white/40'}`} />
                        <h3 className="text-xl font-bold text-white mb-2">Personal Account</h3>
                        <p className="text-sm text-white/60">For individuals who want to buy, store, and manage personal gold wealth. Access FinaVault and FinaPay.</p>
                      </label>
                    </div>

                    <div className={`cursor-pointer rounded-2xl border-2 p-6 transition-all ${accountType === 'business' ? 'border-[#D4AF37] bg-[#D4AF37]/10' : 'border-white/10 hover:border-white/20'}`}>
                      <RadioGroupItem value="business" id="business" className="hidden" />
                      <label htmlFor="business" className="cursor-pointer block">
                        <Building className={`w-12 h-12 mb-4 ${accountType === 'business' ? 'text-[#D4AF37]' : 'text-white/40'}`} />
                        <h3 className="text-xl font-bold text-white mb-2">Corporate Account</h3>
                        <p className="text-sm text-white/60">For companies involved in trade, import/export, or corporate treasury. Access FinaBridge and B2B tools.</p>
                      </label>
                    </div>
                  </RadioGroup>
                </motion.div>
              )}

              {/* STEP 2: BASIC INFO */}
              {currentStep === 'basic-info' && (
                <motion.div 
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex-1 max-w-2xl mx-auto w-full"
                >
                  <h2 className="text-3xl font-bold text-white mb-2">Basic Information</h2>
                  <p className="text-white/60 mb-8">Tell us about yourself.</p>

                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>First Name</Label>
                        <Input 
                          value={formData.firstName}
                          onChange={e => setFormData({...formData, firstName: e.target.value})}
                          className="bg-white/5 border-white/10 text-white" 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Last Name</Label>
                        <Input 
                          value={formData.lastName}
                          onChange={e => setFormData({...formData, lastName: e.target.value})}
                          className="bg-white/5 border-white/10 text-white" 
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
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Phone Number</Label>
                      <Input 
                        type="tel"
                        value={formData.phone}
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                        className="bg-white/5 border-white/10 text-white" 
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 3: BUSINESS DETAILS (Conditional) */}
              {currentStep === 'business-details' && (
                <motion.div 
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex-1 max-w-2xl mx-auto w-full"
                >
                  <h2 className="text-3xl font-bold text-white mb-2">Business Details</h2>
                  <p className="text-white/60 mb-8">Tell us about your company.</p>

                  <div className="space-y-6">
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
                      <p className="text-xs text-white/40 mt-1">This helps us tailor FinaBridge for your trade needs.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
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
                  </div>
                </motion.div>
              )}

              {/* STEP 4: KYC */}
              {currentStep === 'kyc-documents' && (
                <motion.div 
                  key="step4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex-1 max-w-2xl mx-auto w-full"
                >
                  <h2 className="text-3xl font-bold text-white mb-2">Identity Verification</h2>
                  <p className="text-white/60 mb-8">
                    {accountType === 'personal' ? 'Please upload your ID documents.' : 'Please upload your company registration documents.'}
                  </p>

                  <div className="space-y-6">
                    {/* Document Upload Box */}
                    <div className="border-2 border-dashed border-white/20 rounded-2xl p-8 text-center hover:bg-white/5 transition-colors cursor-pointer">
                      <Upload className="w-12 h-12 text-white/40 mx-auto mb-4" />
                      <h4 className="font-bold text-white mb-1">
                        {accountType === 'personal' ? 'Upload Passport or ID' : 'Upload Certificate of Incorporation'}
                      </h4>
                      <p className="text-sm text-white/40 mb-4">Drag and drop or click to browse</p>
                      <Button variant="secondary" size="sm">Choose File</Button>
                    </div>

                    {accountType === 'business' && (
                       <div className="border-2 border-dashed border-white/20 rounded-2xl p-8 text-center hover:bg-white/5 transition-colors cursor-pointer">
                        <Upload className="w-12 h-12 text-white/40 mx-auto mb-4" />
                        <h4 className="font-bold text-white mb-1">Upload Articles of Association</h4>
                        <p className="text-sm text-white/40 mb-4">Drag and drop or click to browse</p>
                        <Button variant="secondary" size="sm">Choose File</Button>
                      </div>
                    )}

                    <div className="bg-[#8A2BE2]/10 p-4 rounded-xl flex gap-4 items-start border border-[#8A2BE2]/30">
                      <ShieldCheck className="w-6 h-6 text-[#8A2BE2] flex-shrink-0 mt-1" />
                      <div>
                        <h4 className="font-bold text-white text-sm">Secure Verification</h4>
                        <p className="text-xs text-white/60">Your documents are encrypted and processed securely according to Swiss data protection laws.</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 5: REVIEW */}
              {currentStep === 'review' && (
                <motion.div 
                  key="step5"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex-1 max-w-2xl mx-auto w-full"
                >
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-[#8A2BE2]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="w-8 h-8 text-[#8A2BE2]" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2">Review & Submit</h2>
                    <p className="text-white/60">Please review your information before submitting.</p>
                  </div>

                  <div className="bg-white/5 rounded-2xl p-6 space-y-4 mb-8">
                     <ReviewRow label="Account Type" value={accountType === 'personal' ? 'Personal' : 'Corporate'} />
                     <ReviewRow label="Name" value={`${formData.firstName} ${formData.lastName}`} />
                     <ReviewRow label="Email" value={formData.email} />
                     
                     {accountType === 'business' && (
                       <>
                         <div className="h-px bg-white/10 my-4" />
                         <ReviewRow label="Company" value={formData.companyName} />
                         <ReviewRow label="Role" value={businessRole.toUpperCase()} />
                         <ReviewRow label="Jurisdiction" value={formData.jurisdiction} />
                       </>
                     )}
                  </div>
                </motion.div>
              )}

            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-8 border-t border-white/10">
              <Button 
                variant="ghost" 
                onClick={handleBack}
                disabled={currentStep === 'account-type'}
                className="text-white/60 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>

              {currentStep === 'review' ? (
                <Button 
                  onClick={handleSubmit}
                  className="bg-gradient-to-r from-[#8A2BE2] to-[#FF2FBF] text-white hover:opacity-90 px-8"
                >
                  Submit Application <CheckCircle2 className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button 
                  onClick={handleNext}
                  className="bg-white text-black hover:bg-gray-200 px-8"
                >
                  Next Step <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}

function ReviewRow({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-white/40 text-sm">{label}</span>
      <span className="text-white font-medium">{value || '-'}</span>
    </div>
  );
}
