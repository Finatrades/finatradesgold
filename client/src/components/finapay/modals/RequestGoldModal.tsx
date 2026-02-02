import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import WalletTypeSelector, { type GoldWalletType } from '../WalletTypeSelector';
import { Loader2, ArrowDownLeft, QrCode, Copy, Share2, Mail, Hash, CheckCircle2, Clock, Paperclip, X, FileText } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/queryClient';
import { toast } from 'sonner';

interface RequestGoldModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (from: string, amount: number, asset: 'USD' | 'GOLD') => void;
}

export default function RequestGoldModal({ isOpen, onClose, onConfirm }: RequestGoldModalProps) {
  const { user } = useAuth();
  const [inputMode, setInputMode] = useState<'usd' | 'grams'>('usd');
  const [inputValue, setInputValue] = useState('');
  const [memo, setMemo] = useState('');
  const [targetIdentifier, setTargetIdentifier] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'direct' | 'qr'>('direct');
  const [step, setStep] = useState<'create' | 'success'>('create');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [myQrCode, setMyQrCode] = useState('');
  const [myFinatradesId, setMyFinatradesId] = useState('');
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Terms and conditions
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsContent, setTermsContent] = useState<{ title: string; terms: string; enabled: boolean } | null>(null);
  
  // Gold price for summary
  const [currentGoldPrice, setCurrentGoldPrice] = useState(0);

  const [selectedWalletType, setSelectedWalletType] = useState<GoldWalletType>('LGPW');
  useEffect(() => {
    if (isOpen) {
      setInputMode('usd');
      setInputValue('');
      setMemo('');
      setTargetIdentifier('');
      setIsLoading(false);
      setActiveTab('direct');
      setStep('create');
      setQrCodeDataUrl('');
      setReferenceNumber('');
      setInvoiceFile(null);
      setTermsAccepted(false);
      
      setSelectedWalletType('LGPW');
      // Fetch user's QR code for receiving payments
      if (user?.id) {
        fetchMyQrCode();
      }
      
      // Fetch terms
      fetch('/api/terms/transfer')
        .then(res => res.json())
        .then(data => setTermsContent(data))
        .catch(() => console.error('Failed to load terms'));
      
      // Fetch current gold price
      fetch('/api/gold-price')
        .then(res => res.json())
        .then(data => setCurrentGoldPrice(data.pricePerGram || 0))
        .catch(() => console.error('Failed to load gold price'));
    }
  }, [isOpen, user?.id]);

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB");
        return;
      }
      setInvoiceFile(file);
    }
  };

  const removeFile = () => {
    setInvoiceFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const fetchMyQrCode = async () => {
    try {
      const res = await apiRequest('GET', `/api/finapay/qr/${user?.id}`);
      const data = await res.json();
      setMyQrCode(data.qrCodeDataUrl);
      setMyFinatradesId(data.finatradesId);
    } catch (error) {
      console.error('Failed to fetch QR code');
    }
  };

  const numericInput = parseFloat(inputValue) || 0;
  const numericAmount = inputMode === 'usd' ? numericInput : numericInput * currentGoldPrice;
  const gramsAmount = inputMode === 'grams' ? numericInput : (currentGoldPrice > 0 ? numericInput / currentGoldPrice : 0);
  const goldEquivalent = gramsAmount.toFixed(4);

  const handleCreateRequest = async () => {
    if (!user || numericAmount <= 0) return;
    
    setIsLoading(true);
    
    try {
      const isFinatradesId = targetIdentifier && targetIdentifier.toUpperCase().startsWith('FT');
      
      let attachmentData = null;
      let attachmentName = null;
      let attachmentMime = null;
      let attachmentSize = null;
      
      if (invoiceFile) {
        attachmentName = invoiceFile.name;
        attachmentMime = invoiceFile.type;
        attachmentSize = invoiceFile.size;
        attachmentData = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(invoiceFile);
        });
      }
      
      const res = await apiRequest('POST', '/api/finapay/request', {
        requesterId: user.id,
        targetIdentifier: targetIdentifier || null,
        amountUsd: numericAmount.toFixed(2),
        channel: !targetIdentifier ? 'qr_code' : (isFinatradesId ? 'finatrades_id' : 'email'),
        memo: memo || null,
        attachmentData,
        attachmentName,
        attachmentMime,
        attachmentSize,
        goldWalletType: selectedWalletType,
      });
      
      const data = await res.json();
      setQrCodeDataUrl(data.qrCodeDataUrl);
      setReferenceNumber(data.request.referenceNumber);
      setStep('success');
      toast.success("Payment request created!");
    } catch (error: any) {
      toast.error(error.message || "Failed to create request");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const handleClose = () => {
    setStep('create');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-white border-border text-foreground w-[95vw] max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <ArrowDownLeft className="w-5 h-5 text-purple-500" />
            <span>Request Funds</span>
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {step === 'create' && "Request payment from another user or share your QR code"}
            {step === 'success' && "Share this QR code or link to receive payment"}
          </DialogDescription>
        </DialogHeader>

        {step === 'create' && (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-2 bg-muted border border-border mb-4">
              <TabsTrigger value="direct">Request from User</TabsTrigger>
              <TabsTrigger value="qr">My QR Code</TabsTrigger>
            </TabsList>

            <TabsContent value="direct">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Panel - Form Fields */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Request From (Optional)</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        placeholder="Email or Finatrades ID" 
                        className="bg-background border-input pl-9"
                        value={targetIdentifier}
                        onChange={(e) => setTargetIdentifier(e.target.value)}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Leave empty to create a request anyone can pay via QR code
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label>Amount</Label>
                      <div className="flex bg-gray-100 rounded-md p-0.5">
                        <button type="button" onClick={() => { setInputMode('usd'); setInputValue(''); }} className={`px-2 py-0.5 text-xs rounded ${inputMode === 'usd' ? 'bg-purple-500 text-white' : 'text-gray-600'}`}>USD</button>
                        <button type="button" onClick={() => { setInputMode('grams'); setInputValue(''); }} className={`px-2 py-0.5 text-xs rounded ${inputMode === 'grams' ? 'bg-purple-500 text-white' : 'text-gray-600'}`}>Grams</button>
                      </div>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">{inputMode === 'usd' ? '$' : 'g'}</span>
                      <Input 
                        type="number" 
                        placeholder={inputMode === 'usd' ? '0.00' : '0.0000'}
                        step={inputMode === 'usd' ? '0.01' : '0.0001'}
                        className="bg-background border-input pl-8 text-lg font-medium"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                      />
                    </div>
                    {numericInput > 0 && (
                      <p className="text-xs text-purple-600">{inputMode === 'usd' ? `≈ ${gramsAmount.toFixed(4)}g` : `≈ $${numericAmount.toFixed(2)}`}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Note (Optional)</Label>
                    <Textarea 
                      placeholder="What's this payment for?" 
                      className="bg-background border-input resize-none h-16"
                      value={memo}
                      onChange={(e) => setMemo(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Attach Invoice (Optional)</Label>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileAttach}
                      accept=".pdf,.png,.jpg,.jpeg"
                      className="hidden"
                      data-testid="input-invoice-file"
                    />
                    {invoiceFile ? (
                      <div className="flex items-center gap-2 bg-muted/50 p-3 rounded-lg border border-border">
                        <FileText className="w-5 h-5 text-purple-500" />
                        <span className="flex-1 text-sm truncate">{invoiceFile.name}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={removeFile}
                          data-testid="button-remove-invoice"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full justify-start text-muted-foreground"
                        onClick={() => fileInputRef.current?.click()}
                        data-testid="button-attach-invoice"
                      >
                        <Paperclip className="w-4 h-4 mr-2" />
                        Attach PDF or Image
                      </Button>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Max 5MB. Accepted: PDF, PNG, JPG
                    </p>
                  </div>
                </div>

                {/* Right Panel - Request Summary */}
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-purple-50 to-purple-50 border border-purple-200 rounded-lg p-4 space-y-4">
                    <div className="flex items-center gap-2 text-purple-700 font-semibold">
                      <ArrowDownLeft className="w-4 h-4" />
                      <span>Request Summary</span>
                    </div>

                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between items-center py-2 border-b border-purple-200/50">
                        <span className="text-muted-foreground">Request Amount:</span>
                        <span className="font-semibold text-foreground">${numericAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-purple-200/50">
                        <span className="text-muted-foreground">Transaction Fee:</span>
                        <span className="font-semibold text-green-600">$0.00</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-purple-200/50">
                        <span className="text-muted-foreground font-medium">You'll Receive:</span>
                        <span className="font-bold text-foreground">${numericAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-muted-foreground">Gold Equivalent:</span>
                        <span className="font-bold text-primary">{goldEquivalent}g</span>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground bg-white/50 p-2 rounded-md">
                      Based on current gold price: ${currentGoldPrice.toFixed(2)}/gram
                    </div>
                  </div>

                  {/* Request From Visual */}
                  <div className="bg-muted/30 border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-10 h-10 border-2 border-muted">
                          <AvatarFallback className="bg-muted text-muted-foreground text-xs font-bold">
                            {targetIdentifier ? targetIdentifier.slice(0, 2).toUpperCase() : '??'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{targetIdentifier || 'Anyone'}</span>
                      </div>
                      <div className="flex-1 flex items-center justify-center">
                        <div className="h-px flex-1 bg-border"></div>
                        <ArrowDownLeft className="w-5 h-5 text-primary mx-2" />
                        <div className="h-px flex-1 bg-border"></div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">You</span>
                        <Avatar className="w-10 h-10 border-2 border-primary">
                          <AvatarFallback className="bg-primary text-white text-xs font-bold">
                            {user?.firstName?.[0]}{user?.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </div>
                  </div>

                  {/* Terms and Conditions Checkbox */}
                  {termsContent?.enabled && (
                    <div className="border border-border rounded-lg p-3 bg-muted/30">
                      <div className="flex items-start gap-3">
                        <Checkbox 
                          id="request-terms"
                          checked={termsAccepted}
                          onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                          className="mt-0.5"
                          data-testid="checkbox-request-terms"
                        />
                        <div className="flex-1">
                          <label htmlFor="request-terms" className="text-sm font-medium cursor-pointer flex items-center gap-2">
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

                  <Button 
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold h-12"
                    disabled={numericAmount <= 0 || isLoading || (termsContent?.enabled && !termsAccepted)}
                    onClick={handleCreateRequest}
                  >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <ArrowDownLeft className="w-5 h-5 mr-2" />}
                    Create Request
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="qr" className="space-y-4">
              <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  Share your QR code to receive payments from anyone
                </p>
                
                {myQrCode ? (
                  <div className="bg-white p-4 rounded-xl border border-border inline-block mx-auto">
                    <img src={myQrCode} alt="Your payment QR Code" className="w-48 h-48" data-testid="img-my-qr-code" />
                  </div>
                ) : (
                  <div className="w-48 h-48 mx-auto bg-muted rounded-xl flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                )}

                <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Your Email</p>
                    <div className="flex items-center justify-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground" data-testid="text-my-email">{user?.email}</span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6"
                        onClick={() => copyToClipboard(user?.email || '', 'Email')}
                        data-testid="button-copy-email"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="border-t border-border pt-3">
                    <p className="text-xs text-muted-foreground mb-1">Your Finatrades ID</p>
                    <div className="flex items-center justify-center gap-2">
                      <Hash className="w-4 h-4 text-muted-foreground" />
                      <code className="font-mono font-bold text-lg text-foreground" data-testid="text-my-finatrades-id">{myFinatradesId || user?.customFinatradesId || user?.finatradesId}</code>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => copyToClipboard(myFinatradesId || user?.customFinatradesId || user?.finatradesId || '', 'Finatrades ID')}
                        data-testid="button-copy-finatrades-id"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Senders scan this code or enter your ID to send you money
                </p>
              </div>
            </TabsContent>
          </Tabs>
        )}

        {step === 'success' && (
          <div className="space-y-6 py-4 text-center">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-purple-500" />
              </div>
            </div>
            
            <div>
              <p className="text-xl font-bold text-foreground">Request Created!</p>
              <p className="text-muted-foreground mt-1">
                Requesting ${numericAmount.toFixed(2)}
              </p>
            </div>

            {qrCodeDataUrl && (
              <div className="bg-white p-4 rounded-xl border border-border inline-block mx-auto">
                <img src={qrCodeDataUrl} alt="Payment Request QR Code" className="w-48 h-48" />
              </div>
            )}

            <div className="bg-muted/30 p-4 rounded-lg text-sm space-y-2">
              <div>
                <p className="text-muted-foreground">Reference Number</p>
                <div className="flex items-center justify-center gap-2">
                  <p className="font-mono font-bold text-foreground">{referenceNumber}</p>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6"
                    onClick={() => copyToClipboard(referenceNumber, 'Reference number')}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>Expires in 7 days</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep('create')}>
                New Request
              </Button>
              <Button className="flex-1 bg-purple-600 hover:bg-purple-700 text-white" onClick={handleClose}>
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
