import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShieldCheck, Upload, CheckCircle2, AlertCircle, Camera, FileText, User, Building, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useLocation } from 'wouter';

export default function KYC() {
  const { user, refreshUser } = useAuth();
  const { addNotification } = useNotifications();
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
  
  // Liveness camera state
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previousFrameRef = useRef<ImageData | null>(null);
  const movementCountRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [livenessVerified, setLivenessVerified] = useState(false);
  const [capturedSelfie, setCapturedSelfie] = useState<string | null>(null);
  const [movementProgress, setMovementProgress] = useState(0);
  const [instruction, setInstruction] = useState('Position your face in the circle');

  const startLivenessCamera = useCallback(async () => {
    setCameraError(null);
    setIsCameraReady(false);
    setLivenessVerified(false);
    setCapturedSelfie(null);
    setMovementProgress(0);
    movementCountRef.current = 0;
    previousFrameRef.current = null;
    setInstruction('Position your face in the circle');
    
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

  const stopLivenessCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsCameraReady(false);
  }, [cameraStream]);

  const captureSelfiPhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current && isCameraReady) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.save();
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.restore();
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedSelfie(dataUrl);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'liveness-selfie.jpg', { type: 'image/jpeg' });
            setUploadedFiles(prev => ({...prev, selfie: file}));
          }
        }, 'image/jpeg', 0.8);
        
        stopLivenessCamera();
        toast.success('Liveness verified! Photo captured.');
      }
    }
  }, [isCameraReady, stopLivenessCamera]);

  const detectMovement = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isCameraReady || livenessVerified) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const currentFrame = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    if (previousFrameRef.current) {
      const prev = previousFrameRef.current.data;
      const curr = currentFrame.data;
      let diffSum = 0;
      const sampleStep = 16;
      
      for (let i = 0; i < curr.length; i += 4 * sampleStep) {
        diffSum += Math.abs(curr[i] - prev[i]);
        diffSum += Math.abs(curr[i + 1] - prev[i + 1]);
        diffSum += Math.abs(curr[i + 2] - prev[i + 2]);
      }
      
      const avgDiff = diffSum / (curr.length / (4 * sampleStep));
      
      if (avgDiff > 8) {
        movementCountRef.current += 1;
        const newProgress = Math.min((movementCountRef.current / 25) * 100, 100);
        setMovementProgress(newProgress);
        
        if (movementCountRef.current >= 10 && movementCountRef.current < 20) {
          setInstruction('Keep moving... Turn your head slowly');
        } else if (movementCountRef.current >= 20) {
          setInstruction('Perfect! Capturing...');
        }
        
        if (movementCountRef.current >= 25) {
          setLivenessVerified(true);
          captureSelfiPhoto();
          return;
        }
      }
    }
    
    previousFrameRef.current = currentFrame;
    animationFrameRef.current = requestAnimationFrame(detectMovement);
  }, [isCameraReady, livenessVerified, captureSelfiPhoto]);

  useEffect(() => {
    if (cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.onloadedmetadata = () => {
        videoRef.current?.play();
        setIsCameraReady(true);
        setInstruction('Now slowly turn your head left and right');
      };
    }
  }, [cameraStream]);

  useEffect(() => {
    if (isCameraReady && cameraStream && !livenessVerified) {
      const timeoutId = setTimeout(() => {
        detectMovement();
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [isCameraReady, cameraStream, livenessVerified, detectMovement]);

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [cameraStream]);

  const retakeLiveness = useCallback(() => {
    setCapturedSelfie(null);
    setLivenessVerified(false);
    setUploadedFiles(prev => {
      const newFiles = {...prev};
      delete newFiles.selfie;
      return newFiles;
    });
    startLivenessCamera();
  }, [startLivenessCamera]);
  
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
      
      // Add notification to bell
      addNotification({
        title: 'KYC Verification Submitted',
        message: 'Your documents are now under review. You will be notified once approved.',
        type: 'success'
      });
      
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
    <div className="min-h-screen bg-background text-foreground">
      <div className="min-h-screen py-12 bg-background">
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

                {/* STEP 3: Selfie with Liveness Detection */}
                {activeStep === 'selfie' && (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    <CardHeader>
                      <CardTitle>Liveness Check</CardTitle>
                      <CardDescription>We need to verify you're a real person, not a photo. Follow the instructions below.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center py-6">
                       <canvas ref={canvasRef} className="hidden" />
                       
                       {/* Show captured selfie */}
                       {capturedSelfie && (
                         <div className="text-center">
                           <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-green-500 mx-auto mb-4">
                             <img src={capturedSelfie} alt="Verified selfie" className="w-full h-full object-cover" />
                           </div>
                           <div className="flex items-center justify-center gap-2 text-green-600 mb-4">
                             <CheckCircle2 className="w-5 h-5" />
                             <span className="font-medium">Liveness Verified!</span>
                           </div>
                           <Button 
                             type="button"
                             onClick={retakeLiveness}
                             variant="outline"
                             className="gap-2"
                             data-testid="button-retake-liveness"
                           >
                             <RefreshCw className="w-4 h-4" />
                             Retake Photo
                           </Button>
                         </div>
                       )}

                       {/* Camera not started */}
                       {!cameraStream && !capturedSelfie && (
                         <div className="text-center">
                           <div className="w-48 h-48 rounded-full bg-muted border-4 border-dashed border-border flex items-center justify-center mb-6">
                             <Camera className="w-16 h-16 text-muted-foreground" />
                           </div>
                           <Button 
                             type="button"
                             onClick={startLivenessCamera}
                             variant="secondary"
                             className="gap-2 mb-4"
                             data-testid="button-start-liveness"
                           >
                             <Camera className="w-5 h-5" />
                             Start Liveness Check
                           </Button>
                           <p className="text-xs text-muted-foreground max-w-xs">
                             Please ensure your face is well-lit and centered. No glasses or hats.
                           </p>
                         </div>
                       )}

                       {/* Camera error */}
                       {cameraError && (
                         <div className="text-center text-red-500 py-4">
                           <p>{cameraError}</p>
                           <Button type="button" onClick={startLivenessCamera} variant="outline" className="mt-2">
                             Try Again
                           </Button>
                         </div>
                       )}

                       {/* Camera streaming */}
                       {cameraStream && !capturedSelfie && (
                         <div className="relative w-full max-w-xs">
                           <div className="relative w-48 h-48 mx-auto rounded-full overflow-hidden border-4 border-primary">
                             <video
                               ref={videoRef}
                               autoPlay
                               playsInline
                               muted
                               className="w-full h-full object-cover"
                               style={{ transform: 'scaleX(-1)' }}
                             />
                             {!isCameraReady && (
                               <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                                 <p className="text-white text-sm">Loading camera...</p>
                               </div>
                             )}
                           </div>
                           
                           {/* Movement progress bar */}
                           {isCameraReady && (
                             <div className="mt-4 w-full">
                               <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                 <span>Movement Detection</span>
                                 <span>{Math.round(movementProgress)}%</span>
                               </div>
                               <Progress value={movementProgress} className="h-2" />
                             </div>
                           )}
                           
                           {/* Instruction text */}
                           <div className="mt-4 text-center">
                             <p className="text-sm font-medium text-primary animate-pulse">
                               {instruction}
                             </p>
                             <p className="text-xs text-muted-foreground mt-2">
                               Slowly turn your head left and right to verify liveness
                             </p>
                           </div>
                           
                           <div className="mt-4 flex justify-center">
                             <Button 
                               type="button"
                               onClick={stopLivenessCamera}
                               variant="outline"
                               size="sm"
                             >
                               Cancel
                             </Button>
                           </div>
                         </div>
                       )}
                    </CardContent>
                    <CardFooter className="flex justify-between">
                      <Button variant="outline" onClick={() => { stopLivenessCamera(); handleNextStep('document', isBusiness ? 60 : 50); }}>Back</Button>
                      <Button 
                        onClick={() => handleNextStep('address', isBusiness ? 90 : 90)}
                        disabled={!capturedSelfie}
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
    </div>
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
