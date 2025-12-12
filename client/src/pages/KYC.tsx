import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Layout from '@/components/Layout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShieldCheck, Upload, CheckCircle2, AlertCircle, Camera, FileText, User, Building } from 'lucide-react';
import { toast } from 'sonner';
import { useLocation } from 'wouter';

export default function KYC() {
  const { user, refreshUser } = useAuth();
  const [, setLocation] = useLocation();
  const [activeStep, setActiveStep] = useState('personal');
  const [progress, setProgress] = useState(25);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form States
  const [idType, setIdType] = useState('passport');
  const [uploadedFiles, setUploadedFiles] = useState<{front?: File, back?: File, selfie?: File, utility?: File, company_doc?: File}>({});
  
  // Required form fields
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [nationality, setNationality] = useState('');
  const [fullAddress, setFullAddress] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [jurisdiction, setJurisdiction] = useState('');
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'front' | 'back' | 'selfie' | 'utility' | 'company_doc') => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFiles(prev => ({...prev, [type]: e.target.files![0]}));
      toast.success(`${type.replace('_', ' ').charAt(0).toUpperCase() + type.replace('_', ' ').slice(1)} uploaded successfully`);
    }
  };

  const validatePersonalStep = () => {
    const isBusiness = user?.accountType === 'business';
    if (isBusiness) {
      if (!registrationNumber.trim()) {
        toast.error("Registration number is required");
        return false;
      }
      if (!jurisdiction.trim()) {
        toast.error("Jurisdiction is required");
        return false;
      }
    } else {
      if (!dateOfBirth) {
        toast.error("Date of birth is required");
        return false;
      }
      if (!nationality.trim()) {
        toast.error("Nationality is required");
        return false;
      }
    }
    return true;
  };

  const validateAddressStep = () => {
    if (!fullAddress.trim()) {
      toast.error("Full address is required");
      return false;
    }
    if (!uploadedFiles.utility) {
      toast.error("Proof of address document is required");
      return false;
    }
    return true;
  };

  const handleNextStep = (next: string, progressValue: number, validate?: () => boolean) => {
    if (validate && !validate()) {
      return;
    }
    setActiveStep(next);
    setProgress(progressValue);
  };

  const handleComplete = async () => {
    if (!user) return;
    
    // Validate address step before submitting
    if (!validateAddressStep()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const isBusiness = user.accountType === 'business';
      const response = await fetch('/api/kyc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          accountType: user.accountType,
          fullName: `${user.firstName} ${user.lastName}`,
          country: nationality || user.country || 'Not specified',
          dateOfBirth: dateOfBirth || null,
          address: fullAddress,
          companyName: user.companyName,
          registrationNumber: isBusiness ? registrationNumber : user.registrationNumber,
          jurisdiction: isBusiness ? jurisdiction : null,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit KYC');
      }
      
      await refreshUser();
      
      toast.success("KYC Verification Submitted", {
        description: "Your documents are now under review. You will be notified once approved."
      });
      
      setLocation('/dashboard');
    } catch (error) {
      toast.error("Submission Failed", {
        description: "Please try again later."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    setLocation('/login');
    return null;
  }

  const isBusiness = user.accountType === 'business';

  return (
    <Layout>
      <div className="min-h-screen pt-24 pb-12 bg-background">
        <div className="container mx-auto px-6 max-w-4xl">
          
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-foreground mb-2">Identity Verification</h1>
            <p className="text-muted-foreground">Complete your {isBusiness ? 'Corporate' : 'Personal'} KYC to unlock full platform features.</p>
          </div>

          <div className="mb-8">
            <div className="flex justify-between text-sm font-medium text-muted-foreground mb-2">
            <span>Progress</span>
            <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2 bg-muted" />
          </div>

          <div className="grid md:grid-cols-12 gap-8">
            
            {/* Sidebar Steps */}
            <div className="md:col-span-4 space-y-4">
              <StepItem 
                title={isBusiness ? "Company Info" : "Personal Info"}
                description="Review details" 
                icon={isBusiness ? <Building className="w-5 h-5" /> : <User className="w-5 h-5" />} 
                isActive={activeStep === 'personal'} 
                isCompleted={progress > 25}
              />
              {isBusiness && (
                <StepItem 
                  title="Corporate Docs" 
                  description="Registration & Articles" 
                  icon={<FileText className="w-5 h-5" />} 
                  isActive={activeStep === 'company_docs'} 
                  isCompleted={progress > 40}
                />
              )}
              <StepItem 
                title={isBusiness ? "Representative ID" : "ID Verification"}
                description="Upload Passport/ID" 
                icon={<User className="w-5 h-5" />} 
                isActive={activeStep === 'document'} 
                isCompleted={progress > (isBusiness ? 60 : 50)}
              />
              <StepItem 
                title="Liveness Check" 
                description="Take a selfie" 
                icon={<Camera className="w-5 h-5" />} 
                isActive={activeStep === 'selfie'} 
                isCompleted={progress > (isBusiness ? 80 : 75)}
              />
              <StepItem 
                title="Proof of Address" 
                description="Utility Bill / Bank Statement" 
                icon={<AlertCircle className="w-5 h-5" />} 
                isActive={activeStep === 'address'} 
                isCompleted={progress === 100}
              />
            </div>

            {/* Main Content */}
            <div className="md:col-span-8">
              <Card className="border-border shadow-sm">
                
                {/* STEP 1: Personal / Company Info */}
                {activeStep === 'personal' && (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    <CardHeader>
                      <CardTitle>{isBusiness ? "Confirm Company Details" : "Confirm Personal Details"}</CardTitle>
                      <CardDescription>Please ensure details match your {isBusiness ? "registration documents" : "government ID"}.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {isBusiness ? (
                        <>
                          <div className="space-y-2">
                            <Label>Company Name</Label>
                            <Input value={user.companyName || ''} disabled className="bg-muted" />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Registration Number <span className="text-red-500">*</span></Label>
                              <Input 
                                value={registrationNumber} 
                                onChange={(e) => setRegistrationNumber(e.target.value)}
                                placeholder="CHE-123.456.789" 
                                className="bg-background" 
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Jurisdiction <span className="text-red-500">*</span></Label>
                              <Input 
                                value={jurisdiction}
                                onChange={(e) => setJurisdiction(e.target.value)}
                                placeholder="Switzerland" 
                                className="bg-background" 
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Authorized Representative</Label>
                            <Input value={`${user.firstName} ${user.lastName}`} disabled className="bg-muted" />
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>First Name</Label>
                              <Input value={user.firstName} disabled className="bg-muted" />
                            </div>
                            <div className="space-y-2">
                              <Label>Last Name</Label>
                              <Input value={user.lastName} disabled className="bg-muted" />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Email Address</Label>
                            <Input value={user.email} disabled className="bg-muted" />
                          </div>
                          <div className="space-y-2">
                             <Label>Date of Birth <span className="text-red-500">*</span></Label>
                             <Input 
                               type="date" 
                               value={dateOfBirth}
                               onChange={(e) => setDateOfBirth(e.target.value)}
                               className="bg-background" 
                             />
                          </div>
                          <div className="space-y-2">
                             <Label>Nationality <span className="text-red-500">*</span></Label>
                             <Input 
                               value={nationality}
                               onChange={(e) => setNationality(e.target.value)}
                               placeholder="Enter your nationality" 
                               className="bg-background" 
                             />
                          </div>
                        </>
                      )}
                    </CardContent>
                    <CardFooter className="flex justify-end">
                      <Button 
                        onClick={() => handleNextStep(isBusiness ? 'company_docs' : 'document', isBusiness ? 40 : 50, validatePersonalStep)}
                        className="bg-primary text-white hover:bg-primary/90"
                      >
                        Confirm & Continue
                      </Button>
                    </CardFooter>
                  </div>
                )}

                {/* STEP 1.5: Company Docs (Business Only) */}
                {activeStep === 'company_docs' && isBusiness && (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    <CardHeader>
                      <CardTitle>Corporate Documents</CardTitle>
                      <CardDescription>Upload Certificate of Incorporation or Extract from Registry.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:bg-muted/30 transition-colors">
                         <input type="file" id="company-doc-upload" className="hidden" onChange={(e) => handleFileUpload(e, 'company_doc')} />
                         <label htmlFor="company-doc-upload" className="cursor-pointer flex flex-col items-center">
                           <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${uploadedFiles.company_doc ? 'bg-green-100 text-green-600' : 'bg-secondary/10 text-secondary'}`}>
                             {uploadedFiles.company_doc ? <CheckCircle2 className="w-6 h-6" /> : <Upload className="w-6 h-6" />}
                           </div>
                           <span className="font-medium text-foreground">
                             {uploadedFiles.company_doc ? uploadedFiles.company_doc.name : 'Upload Certificate of Incorporation'}
                           </span>
                           <span className="text-xs text-muted-foreground mt-1">PDF, JPG or PNG (Max 10MB)</span>
                         </label>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                      <Button variant="outline" onClick={() => handleNextStep('personal', 25)}>Back</Button>
                      <Button 
                        onClick={() => handleNextStep('document', 60)}
                        disabled={!uploadedFiles.company_doc}
                        className="bg-primary text-white hover:bg-primary/90"
                      >
                        Continue
                      </Button>
                    </CardFooter>
                  </div>
                )}

                {/* STEP 2: Document Upload */}
                {activeStep === 'document' && (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    <CardHeader>
                      <CardTitle>{isBusiness ? "Authorized Representative ID" : "Document Verification"}</CardTitle>
                      <CardDescription>Upload a valid government-issued ID{isBusiness ? " for the account manager" : ""}.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <Tabs defaultValue="passport" className="w-full" onValueChange={setIdType}>
                        <TabsList className="grid w-full grid-cols-3 bg-muted">
                          <TabsTrigger value="passport">Passport</TabsTrigger>
                          <TabsTrigger value="id_card">National ID</TabsTrigger>
                          <TabsTrigger value="license">License</TabsTrigger>
                        </TabsList>
                      </Tabs>

                      <div className="grid gap-6">
                        <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:bg-muted/30 transition-colors">
                           <input type="file" id="front-upload" className="hidden" onChange={(e) => handleFileUpload(e, 'front')} />
                           <label htmlFor="front-upload" className="cursor-pointer flex flex-col items-center">
                             <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${uploadedFiles.front ? 'bg-green-100 text-green-600' : 'bg-secondary/10 text-secondary'}`}>
                               {uploadedFiles.front ? <CheckCircle2 className="w-6 h-6" /> : <Upload className="w-6 h-6" />}
                             </div>
                             <span className="font-medium text-foreground">
                               {uploadedFiles.front ? uploadedFiles.front.name : `Upload ${idType === 'passport' ? 'Passport Page' : 'Front of ID'}`}
                             </span>
                             <span className="text-xs text-muted-foreground mt-1">JPG, PNG or PDF (Max 5MB)</span>
                           </label>
                        </div>

                        {idType !== 'passport' && (
                          <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:bg-muted/30 transition-colors">
                             <input type="file" id="back-upload" className="hidden" onChange={(e) => handleFileUpload(e, 'back')} />
                             <label htmlFor="back-upload" className="cursor-pointer flex flex-col items-center">
                               <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${uploadedFiles.back ? 'bg-green-100 text-green-600' : 'bg-secondary/10 text-secondary'}`}>
                                 {uploadedFiles.back ? <CheckCircle2 className="w-6 h-6" /> : <Upload className="w-6 h-6" />}
                               </div>
                               <span className="font-medium text-foreground">
                                 {uploadedFiles.back ? uploadedFiles.back.name : 'Upload Back of ID'}
                               </span>
                               <span className="text-xs text-muted-foreground mt-1">JPG, PNG or PDF (Max 5MB)</span>
                             </label>
                          </div>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                      <Button variant="outline" onClick={() => handleNextStep(isBusiness ? 'company_docs' : 'personal', isBusiness ? 40 : 25)}>Back</Button>
                      <Button 
                        onClick={() => handleNextStep('selfie', isBusiness ? 80 : 75)}
                        disabled={!uploadedFiles.front || (idType !== 'passport' && !uploadedFiles.back)}
                        className="bg-primary text-white hover:bg-primary/90"
                      >
                        Continue
                      </Button>
                    </CardFooter>
                  </div>
                )}

                {/* STEP 3: Selfie */}
                {activeStep === 'selfie' && (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    <CardHeader>
                      <CardTitle>Liveness Check</CardTitle>
                      <CardDescription>Take a selfie to verify that it's really you.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center py-8">
                       <div className="w-48 h-48 rounded-full bg-muted border-4 border-dashed border-border flex items-center justify-center mb-6 overflow-hidden relative">
                         {uploadedFiles.selfie ? (
                            <div className="w-full h-full bg-green-100 flex items-center justify-center text-green-600">
                              <CheckCircle2 className="w-16 h-16" />
                            </div>
                         ) : (
                            <Camera className="w-16 h-16 text-muted-foreground" />
                         )}
                       </div>
                       
                       <input type="file" id="selfie-upload" className="hidden" accept="image/*" capture="user" onChange={(e) => handleFileUpload(e, 'selfie')} />
                       <Button asChild variant="secondary" className="mb-4">
                         <label htmlFor="selfie-upload" className="cursor-pointer">
                           {uploadedFiles.selfie ? 'Retake Photo' : 'Open Camera'}
                         </label>
                       </Button>
                       <p className="text-xs text-muted-foreground max-w-xs text-center">
                         Please ensure your face is well-lit and centered. No glasses or hats.
                       </p>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                      <Button variant="outline" onClick={() => handleNextStep('document', isBusiness ? 60 : 50)}>Back</Button>
                      <Button 
                        onClick={() => handleNextStep('address', isBusiness ? 90 : 90)}
                        disabled={!uploadedFiles.selfie}
                        className="bg-primary text-white hover:bg-primary/90"
                      >
                        Continue
                      </Button>
                    </CardFooter>
                  </div>
                )}

                {/* STEP 4: Address */}
                {activeStep === 'address' && (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    <CardHeader>
                      <CardTitle>{isBusiness ? "Proof of Business Address" : "Proof of Address"}</CardTitle>
                      <CardDescription>Upload a recent utility bill or bank statement (max 3 months old).</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                       <div className="space-y-2">
                          <Label>Full {isBusiness ? "Business " : ""}Address <span className="text-red-500">*</span></Label>
                          <Input 
                            value={fullAddress}
                            onChange={(e) => setFullAddress(e.target.value)}
                            placeholder="Street Address, City, Zip Code" 
                            className="bg-background" 
                          />
                       </div>

                       <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:bg-muted/30 transition-colors mt-4">
                          <input type="file" id="utility-upload" className="hidden" onChange={(e) => handleFileUpload(e, 'utility')} />
                          <label htmlFor="utility-upload" className="cursor-pointer flex flex-col items-center">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${uploadedFiles.utility ? 'bg-green-100 text-green-600' : 'bg-secondary/10 text-secondary'}`}>
                              {uploadedFiles.utility ? <CheckCircle2 className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                            </div>
                            <span className="font-medium text-foreground">
                              {uploadedFiles.utility ? uploadedFiles.utility.name : 'Upload Document'}
                            </span>
                            <span className="text-xs text-muted-foreground mt-1">PDF, JPG or PNG (Max 10MB)</span>
                          </label>
                       </div>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                      <Button variant="outline" onClick={() => handleNextStep('selfie', isBusiness ? 80 : 75)}>Back</Button>
                      <Button 
                        onClick={handleComplete}
                        disabled={isSubmitting}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold w-32"
                      >
                        {isSubmitting ? 'Submitting...' : 'Submit'}
                      </Button>
                    </CardFooter>
                  </div>
                )}

              </Card>

              <div className="mt-6 flex items-start gap-3 p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/20">
                <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-blue-900 dark:text-blue-200">Bank-Grade Security</h4>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    Your data is encrypted using AES-256 and stored in compliant Swiss data centers. We never share your personal information without consent.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function StepItem({ title, description, icon, isActive, isCompleted }: { title: string, description: string, icon: React.ReactNode, isActive: boolean, isCompleted: boolean }) {
  return (
    <div className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 ${
      isActive 
        ? 'bg-white border-primary shadow-sm ring-1 ring-primary/20' 
        : isCompleted 
          ? 'bg-muted/50 border-transparent opacity-80' 
          : 'bg-transparent border-transparent opacity-50'
    }`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${
        isActive ? 'bg-primary text-white' : isCompleted ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'
      }`}>
        {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : icon}
      </div>
      <div>
        <h3 className={`text-sm font-bold ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
