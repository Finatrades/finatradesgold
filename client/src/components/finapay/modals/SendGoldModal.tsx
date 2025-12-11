import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send } from 'lucide-react';

interface SendGoldModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletBalance: number;
  onConfirm: (recipient: string, grams: number) => void;
}

export default function SendGoldModal({ isOpen, onClose, walletBalance, onConfirm }: SendGoldModalProps) {
  const [recipient, setRecipient] = useState('');
  const [grams, setGrams] = useState('');
  const [note, setNote] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setRecipient('');
      setGrams('');
      setNote('');
      setOtp('');
      setIsLoading(false);
    }
  }, [isOpen]);

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
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Recipient ID / Email</Label>
              <Input 
                placeholder="user@example.com" 
                className="bg-black/20 border-white/10"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Amount (g)</Label>
                <span className="text-xs text-white/40">Available: {walletBalance.toFixed(3)} g</span>
              </div>
              <Input 
                type="number" 
                placeholder="0.000" 
                className="bg-black/20 border-white/10"
                value={grams}
                onChange={(e) => setGrams(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Note (Optional)</Label>
              <Textarea 
                placeholder="What's this for?" 
                className="bg-black/20 border-white/10 resize-none h-20"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            <Button 
              className="w-full bg-orange-500 text-white hover:bg-orange-600 font-bold"
              disabled={!recipient || numericGrams <= 0 || numericGrams > walletBalance}
              onClick={handleSendOtp}
            >
              Next
            </Button>
          </div>
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
