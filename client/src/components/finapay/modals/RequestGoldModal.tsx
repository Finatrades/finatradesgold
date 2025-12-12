import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ArrowDownLeft, QrCode, Copy, Share2, Mail, Hash, CheckCircle2, Clock } from 'lucide-react';
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
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [targetIdentifier, setTargetIdentifier] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'direct' | 'qr'>('direct');
  const [step, setStep] = useState<'create' | 'success'>('create');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [myQrCode, setMyQrCode] = useState('');
  const [myFinatradesId, setMyFinatradesId] = useState('');

  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setMemo('');
      setTargetIdentifier('');
      setIsLoading(false);
      setActiveTab('direct');
      setStep('create');
      setQrCodeDataUrl('');
      setReferenceNumber('');
      
      // Fetch user's QR code for receiving payments
      if (user?.id) {
        fetchMyQrCode();
      }
    }
  }, [isOpen, user?.id]);

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

  const numericAmount = parseFloat(amount) || 0;

  const handleCreateRequest = async () => {
    if (!user || numericAmount <= 0) return;
    
    setIsLoading(true);
    
    try {
      const res = await apiRequest('POST', '/api/finapay/request', {
        requesterId: user.id,
        targetIdentifier: targetIdentifier || null,
        amountUsd: numericAmount.toFixed(2),
        channel: targetIdentifier ? 'email' : 'qr_code',
        memo: memo || null,
      });
      
      const data = await res.json();
      setQrCodeDataUrl(data.qrCodeDataUrl);
      setReferenceNumber(data.request.referenceNumber);
      setStep('success');
      toast.success("Payment request created!");
      onConfirm(targetIdentifier || 'Anyone', numericAmount, 'USD');
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
      <DialogContent className="bg-white border-border text-foreground sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <ArrowDownLeft className="w-5 h-5 text-purple-500" />
            <span>Request Money</span>
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {step === 'create' && "Request payment from another user or generate a QR code"}
            {step === 'success' && "Share this QR code or link to receive payment"}
          </DialogDescription>
        </DialogHeader>

        {step === 'create' && (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-2 bg-muted border border-border mb-4">
              <TabsTrigger value="direct">Request from User</TabsTrigger>
              <TabsTrigger value="qr">My QR Code</TabsTrigger>
            </TabsList>

            <TabsContent value="direct" className="space-y-4">
              <div className="space-y-2">
                <Label>Request From (Optional)</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="Email or Finatrades ID (leave empty for open request)" 
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
                <Label>Amount (USD)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">$</span>
                  <Input 
                    type="number" 
                    placeholder="0.00" 
                    className="bg-background border-input pl-8 text-lg font-medium"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
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

              <Button 
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold"
                disabled={numericAmount <= 0 || isLoading}
                onClick={handleCreateRequest}
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <ArrowDownLeft className="w-5 h-5 mr-2" />}
                Create Request
              </Button>
            </TabsContent>

            <TabsContent value="qr" className="space-y-4">
              <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  Share your QR code to receive payments from anyone
                </p>
                
                {myQrCode ? (
                  <div className="bg-white p-4 rounded-xl border border-border inline-block mx-auto">
                    <img src={myQrCode} alt="Your payment QR Code" className="w-48 h-48" />
                  </div>
                ) : (
                  <div className="w-48 h-48 mx-auto bg-muted rounded-xl flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                )}

                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Your Finatrades ID</p>
                  <div className="flex items-center justify-center gap-2">
                    <code className="font-mono font-bold text-lg text-foreground">{myFinatradesId || user?.finatradesId}</code>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => copyToClipboard(myFinatradesId || user?.finatradesId || '', 'Finatrades ID')}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
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
