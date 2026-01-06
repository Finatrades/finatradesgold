import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Upload, ExternalLink, AlertCircle, CheckCircle2, FileText, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';

interface BuyGoldWingoldModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const COMPLIANCE_NOTICE = `Finatrades Finance SA operates in partnership with Wingold & Metals DMCC for use of the Finatrades digital platform to facilitate the sale, purchase, allocation, and other structured buy-and-sell plans related to physical gold. All gold transactions executed by Wingold & Metals DMCC through the Platform are processed, recorded, and maintained within the Finatrades system, and the Platform serves solely as a technology and execution infrastructure for such gold-based services.`;

const WINGOLD_URL = 'https://wingoldandmetals.com/';

export default function BuyGoldWingoldModal({ isOpen, onClose, onSuccess }: BuyGoldWingoldModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [step, setStep] = useState<'browse' | 'upload' | 'submitted'>('browse');
  const [iframeBlocked, setIframeBlocked] = useState(true);
  const [amountUsd, setAmountUsd] = useState('');
  const [wingoldReferenceId, setWingoldReferenceId] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  
  // Terms and conditions
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsContent, setTermsContent] = useState<{ title: string; terms: string; enabled: boolean } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setStep('browse');
      setAmountUsd('');
      setWingoldReferenceId('');
      setReceiptFile(null);
      setRequestId(null);
      setIframeBlocked(true);
      setTermsAccepted(false);
      
      // Fetch terms
      fetch('/api/terms/buy_gold')
        .then(res => res.json())
        .then(data => setTermsContent(data))
        .catch(() => setTermsContent(null));
    }
  }, [isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: 'Invalid File Type',
        description: 'Please upload a PDF, JPG, or PNG file.',
        variant: 'destructive',
      });
      return;
    }
    
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: 'File Too Large',
        description: 'File size must be less than 10MB.',
        variant: 'destructive',
      });
      return;
    }
    
    setReceiptFile(file);
  };

  const handleRemoveFile = () => {
    setReceiptFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleProceedToUpload = () => {
    setStep('upload');
  };

  const handleSubmit = async () => {
    if (!receiptFile) {
      toast({
        title: 'Receipt Required',
        description: 'Please upload your Wingold & Metals transaction receipt.',
        variant: 'destructive',
      });
      return;
    }

    if (!user) return;

    setIsSubmitting(true);
    
    try {
      const formData = new FormData();
      formData.append('file', receiptFile);
      formData.append('uploadType', 'buy_gold_receipt');
      formData.append('userId', user.id);
      
      const uploadResponse = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'include',
        body: formData,
      });
      
      if (!uploadResponse.ok) {
        throw new Error('Failed to upload receipt');
      }
      
      const { url: receiptFileUrl, filename: receiptFileName } = await uploadResponse.json();
      
      const submitResponse = await fetch('/api/buy-gold/submit', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include',
        body: JSON.stringify({
          userId: user.id,
          amountUsd: amountUsd || null,
          wingoldReferenceId: wingoldReferenceId || null,
          receiptFileUrl,
          receiptFileName,
        }),
      });
      
      if (!submitResponse.ok) {
        const error = await submitResponse.json();
        throw new Error(error.message || 'Failed to submit request');
      }
      
      const { request } = await submitResponse.json();
      setRequestId(request.id);
      setStep('submitted');
      
      toast({
        title: 'Request Submitted',
        description: 'Your buy gold request is pending admin review.',
      });
      
    } catch (error: any) {
      toast({
        title: 'Submission Failed',
        description: error.message || 'Failed to submit buy gold request.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (step === 'submitted') {
      onSuccess();
    }
    onClose();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      handleClose();
    }
  };

  const isKycApproved = user?.kycStatus === 'Approved';

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="modal-buy-gold-wingold">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-fuchsia-600">Buy Gold Bar</span>
            <span className="text-sm font-normal text-muted-foreground">(Wingold & Metals)</span>
          </DialogTitle>
          <DialogDescription>
            Purchase gold bar through our partner Wingold & Metals DMCC
          </DialogDescription>
        </DialogHeader>

        {!isKycApproved ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Your KYC verification must be approved before you can submit buy gold requests.
              Please complete your KYC verification first.
            </AlertDescription>
          </Alert>
        ) : step === 'submitted' ? (
          <div className="py-8 text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold">Request Submitted Successfully!</h3>
            <p className="text-muted-foreground">
              Your buy gold request has been submitted and is pending admin review.
            </p>
            {requestId && (
              <p className="text-sm">
                Request ID: <span className="font-mono font-medium">{requestId.slice(0, 8)}...</span>
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Status: <span className="text-fuchsia-600 font-medium">Pending Review</span>
            </p>
            <Button onClick={handleClose} className="mt-4" data-testid="button-close-success">
              Close
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert className="bg-purple-50 border-purple-200">
              <AlertCircle className="h-4 w-4 text-fuchsia-600" />
              <AlertDescription className="text-sm text-fuchsia-800">
                {COMPLIANCE_NOTICE}
              </AlertDescription>
            </Alert>

            {step === 'browse' && (
              <>
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-muted/50 p-4 text-center">
                    <p className="text-sm text-muted-foreground mb-3">
                      Visit Wingold & Metals to complete your gold purchase, then return here to upload your receipt.
                    </p>
                    <Button
                      onClick={() => window.open(WINGOLD_URL, '_blank')}
                      className="bg-fuchsia-600 hover:bg-fuchsia-700"
                      data-testid="button-open-wingold"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open Wingold & Metals Website
                    </Button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button 
                    onClick={handleProceedToUpload}
                    data-testid="button-proceed-upload"
                  >
                    I've Made My Purchase - Upload Receipt
                  </Button>
                </div>
              </>
            )}

            {step === 'upload' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="amountUsd">Amount (USD)</Label>
                  <Input
                    id="amountUsd"
                    type="number"
                    placeholder="Enter amount in USD"
                    value={amountUsd}
                    onChange={(e) => setAmountUsd(e.target.value)}
                    data-testid="input-amount-usd"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the USD amount from your Wingold transaction if known.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="referenceId">Wingold Reference ID</Label>
                  <Input
                    id="referenceId"
                    placeholder="Enter Wingold transaction reference"
                    value={wingoldReferenceId}
                    onChange={(e) => setWingoldReferenceId(e.target.value)}
                    data-testid="input-reference-id"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    Upload Transaction Receipt
                    <span className="text-destructive">*</span>
                  </Label>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    className="hidden"
                    data-testid="input-receipt-file"
                  />
                  
                  {receiptFile ? (
                    <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-fuchsia-600" />
                        <div>
                          <p className="text-sm font-medium">{receiptFile.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(receiptFile.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveFile}
                        data-testid="button-remove-file"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full h-24 border-dashed"
                      onClick={() => fileInputRef.current?.click()}
                      data-testid="button-upload-receipt"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="w-6 h-6 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          Click to upload receipt (PDF, JPG, PNG - Max 10MB)
                        </span>
                      </div>
                    </Button>
                  )}
                </div>

                {/* Terms and Conditions Checkbox */}
                {termsContent?.enabled && (
                  <div className="border border-border rounded-lg p-3 bg-muted/30">
                    <div className="flex items-start gap-3">
                      <Checkbox 
                        id="buy-gold-wingold-terms"
                        checked={termsAccepted}
                        onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                        className="mt-0.5"
                        data-testid="checkbox-buy-gold-wingold-terms"
                      />
                      <div className="flex-1">
                        <label htmlFor="buy-gold-wingold-terms" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                          <FileText className="w-4 h-4 text-primary" />
                          I accept the Terms & Conditions
                        </label>
                        <details className="mt-2">
                          <summary className="text-xs text-primary cursor-pointer hover:underline">View Terms</summary>
                          <div className="mt-2 text-xs text-muted-foreground whitespace-pre-line bg-white p-2 rounded border max-h-32 overflow-y-auto">
                            {termsContent.terms}
                          </div>
                        </details>
                      </div>
                    </div>
                  </div>
                )}

                <DialogFooter className="gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setStep('browse')}
                    data-testid="button-back"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={!receiptFile || isSubmitting || (termsContent?.enabled && !termsAccepted)}
                    className="bg-fuchsia-600 hover:bg-fuchsia-700"
                    data-testid="button-submit-request"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      'Submit Buy Gold Request'
                    )}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
