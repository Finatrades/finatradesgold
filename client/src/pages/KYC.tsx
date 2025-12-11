import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Layout from '@/components/Layout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShieldCheck, Upload, CheckCircle2, AlertCircle, Camera, FileText, User } from 'lucide-react';
import { toast } from 'sonner';
import { useLocation } from 'wouter';

export default function KYC() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [activeStep, setActiveStep] = useState('personal');
  const [progress, setProgress] = useState(25);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form States
  const [idType, setIdType] = useState('passport');
  const [uploadedFiles, setUploadedFiles] = useState<{front?: File, back?: File, selfie?: File, utility?: File}>({});
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'front' | 'back' | 'selfie' | 'utility') => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFiles(prev => ({...prev, [type]: e.target.files![0]}));
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} uploaded successfully`);
    }
  };

  const handleNextStep = (next: string, progressValue: number) => {
    setActiveStep(next);
    setProgress(progressValue);
  };

  const handleComplete = () => {
    setIsSubmitting(true);
    
    // Simulate API submission
    setTimeout(() => {
      setIsSubmitting(false);
      toast.success("KYC Verification Submitted", {
        description: "Your documents are under review. You will be notified shortly."
      });
      setLocation('/dashboard');
    }, 2000);
  };

  if (!user) {
    setLocation('/login');
    return null;
  }

  return (
    <Layout>
      <div className="min-h-screen pt-24 pb-12 bg-background">
        <div className="container mx-auto px-6 max-w-4xl">
          
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-foreground mb-2">Identity Verification</h1>
            <p className="text-muted-foreground">Complete your KYC to unlock full platform features.</p>
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
                title="Personal Info" 
                description="Review your details" 
                icon={<User className="w-5 h-5" />} 
                isActive={activeStep === 'personal'} 
                isCompleted={progress > 25}
              />
              <StepItem 
                title="ID Verification" 
                description="Upload Passport/ID" 
                icon={<FileText className="w-5 h-5" />} 
                isActive={activeStep === 'document'} 
                isCompleted={progress > 50}
              />
              <StepItem 
                title="Liveness Check" 
                description="Take a selfie" 
                icon={<Camera className="w-5 h-5" />} 
                isActive={activeStep === 'selfie'} 
                isCompleted={progress > 75}
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
                
                {/* STEP 1: Personal Info */}
                {activeStep === 'personal' && (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    <CardHeader>
                      <CardTitle>Confirm Personal Details</CardTitle>
                      <CardDescription>Please ensure your details match your government ID.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
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
                         <Label>Date of Birth</Label>
                         <Input type="date" className="bg-background" />
                      </div>
                      <div className="space-y-2">
                         <Label>Nationality</Label>
                         <Input placeholder="Select Nationality" className="bg-background" />
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-end">
                      <Button 
                        onClick={() => handleNextStep('document', 50)}
                        className="bg-primary text-white hover:bg-primary/90"
                      >
                        Confirm & Continue
                      </Button>
                    </CardFooter>
                  </div>
                )}

                {/* STEP 2: Document Upload */}
                {activeStep === 'document' && (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    <CardHeader>
                      <CardTitle>Document Verification</CardTitle>
                      <CardDescription>Upload a valid government-issued ID.</CardDescription>
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
                      <Button variant="outline" onClick={() => handleNextStep('personal', 25)}>Back</Button>
                      <Button 
                        onClick={() => handleNextStep('selfie', 75)}
                        disabled={!uploadedFiles.front}
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
                      <Button variant="outline" onClick={() => handleNextStep('document', 50)}>Back</Button>
                      <Button 
                        onClick={() => handleNextStep('address', 90)}
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
                      <CardTitle>Proof of Address</CardTitle>
                      <CardDescription>Upload a recent utility bill or bank statement (max 3 months old).</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                       <div className="space-y-2">
                          <Label>Full Address</Label>
                          <Input placeholder="Street Address, City, Zip Code" className="bg-background" />
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
                      <Button variant="outline" onClick={() => handleNextStep('selfie', 75)}>Back</Button>
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
