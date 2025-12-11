import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, QrCode, Scan, Paperclip, X } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface SendGoldModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletBalance: number;
  goldPrice: number;
  onConfirm: (recipient: string, grams: number) => void;
}

export default function SendGoldModal({ isOpen, onClose, walletBalance, goldPrice, onConfirm }: SendGoldModalProps) {
  const [recipient, setRecipient] = useState('');
  const [grams, setGrams] = useState('');
  const [usdAmount, setUsdAmount] = useState('');
  const [note, setNote] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('direct');
  const [attachment, setAttachment] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setRecipient('');
      setGrams('');
      setUsdAmount('');
      setNote('');
      setOtp('');
      setIsLoading(false);
      setActiveTab('direct');
      setAttachment(null);
    }
  }, [isOpen]);

  const handleGramsChange = (val: string) => {
    setGrams(val);
    if (val === '') {
      setUsdAmount('');
      return;
    }
    const g = parseFloat(val);
    if (!isNaN(g)) {
      setUsdAmount((g * goldPrice).toFixed(2));
    }
  };

  const handleUsdChange = (val: string) => {
    setUsdAmount(val);
    if (val === '') {
      setGrams('');
      return;
    }
    const u = parseFloat(val);
    if (!isNaN(u)) {
      setGrams((u / goldPrice).toFixed(4));
    }
  };

  const numericGrams = parseFloat(grams) || 0;

  const handleSendOtp = () => {
    setStep(2);
    // Simulate sending OTP
  };

  const handleConfirm = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onConfirm(recipient, numericGrams);
    }, 1500);
  };

  const handleAttachment = () => {
    // In a real app, this would trigger a file picker
    setAttachment('invoice_123.pdf');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#1A0A2E] border-white/10 text-white sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <span className="text-orange-400">Send Gold</span>
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Transfer gold instantly to another FinaPay user.
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-black/20 border border-white/10 mb-4">
              <TabsTrigger value="direct">Direct Send</TabsTrigger>
              <TabsTrigger value="scan">Scan QR</TabsTrigger>
            </TabsList>

            <TabsContent value="direct" className="space-y-4">
              <div className="space-y-2">
                <Label>Recipient ID / Email</Label>
                <Input 
                  placeholder="user@example.com" 
                  className="bg-black/20 border-white/10"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount (g)</Label>
                  <div className="relative">
                    <Input 
                      type="number" 
                      placeholder="0.000" 
                      className="bg-black/20 border-white/10 pr-8"
                      value={grams}
                      onChange={(e) => handleGramsChange(e.target.value)}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/40">g</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Amount (USD)</Label>
                  <div className="relative">
                    <Input 
                      type="number" 
                      placeholder="0.00" 
                      className="bg-black/20 border-white/10 pr-8"
                      value={usdAmount}
                      onChange={(e) => handleUsdChange(e.target.value)}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/40">$</span>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end -mt-2">
                <span className="text-xs text-white/40">Available: {walletBalance.toFixed(3)} g</span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                   <Label>Note (Optional)</Label>
                   <Button 
                     variant="ghost" 
                     size="sm" 
                     className="h-6 px-2 text-xs text-white/40 hover:text-white"
                     onClick={handleAttachment}
                   >
                     <Paperclip className="w-3 h-3 mr-1" />
                     Attach File
                   </Button>
                </div>
                
                {attachment ? (
                  <div className="flex items-center justify-between bg-white/5 p-2 rounded border border-white/10 text-sm">
                    <div className="flex items-center text-white/80">
                      <Paperclip className="w-3 h-3 mr-2" />
                      {attachment}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 text-white/40 hover:text-red-400"
                      onClick={() => setAttachment(null)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <Textarea 
                    placeholder="What's this for?" 
                    className="bg-black/20 border-white/10 resize-none h-20"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                )}
              </div>

              <Button 
                className="w-full bg-orange-500 text-white hover:bg-orange-600 font-bold"
                disabled={!recipient || numericGrams <= 0 || numericGrams > walletBalance}
                onClick={handleSendOtp}
              >
                Next
              </Button>
            </TabsContent>

            <TabsContent value="scan" className="space-y-4">
              <div className="bg-black/40 border-2 border-dashed border-white/20 rounded-xl h-[250px] flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer hover:border-orange-500/50 transition-colors">
                 <div className="absolute inset-0 bg-gradient-to-b from-transparent via-orange-500/5 to-transparent animate-pulse pointer-events-none" />
                 <Scan className="w-12 h-12 text-white/40 mb-3 group-hover:text-orange-500 transition-colors" />
                 <p className="text-white/60 text-sm font-medium">Click to Activate Camera</p>
              </div>
              
              <Button 
                className="w-full bg-white/10 text-white hover:bg-white/20"
                onClick={() => {
                   setRecipient('scanned-user-id');
                   setActiveTab('direct');
                }}
              >
                Simulate Scan
              </Button>
            </TabsContent>
          </Tabs>
        )}

        {step === 2 && (
          <div className="space-y-4 py-4">
            <div className="bg-white/5 p-4 rounded-lg border border-white/10 text-center space-y-2">
               <p className="text-white/60 text-sm">Transferring</p>
               <p className="text-2xl font-bold text-white">{numericGrams.toFixed(3)} g</p>
               <p className="text-white/60 text-sm">to <span className="text-white">{recipient}</span></p>
            </div>

            <div className="space-y-2">
              <Label>Enter Security Code (OTP)</Label>
              <Input 
                placeholder="123456" 
                className="bg-black/20 border-white/10 text-center tracking-widest text-lg"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
              />
              <p className="text-xs text-white/40">We sent a code to your registered device.</p>
            </div>

            <Button 
              className="w-full bg-orange-500 text-white hover:bg-orange-600 font-bold"
              disabled={otp.length < 4 || isLoading}
              onClick={handleConfirm}
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Confirm Transfer
            </Button>
            
            <p className="text-xs text-center text-white/40">
              // FinaVault: debit sender, credit receiver.
            </p>
          </div>
        )}

      </DialogContent>
    </Dialog>
  );
}
