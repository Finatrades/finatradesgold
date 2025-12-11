import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CreditCard, Building, Loader2, CheckCircle2, DollarSign } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface AddFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (amount: number) => void;
}

export default function AddFundsModal({ isOpen, onClose, onConfirm }: AddFundsModalProps) {
  const [step, setStep] = useState(1);
  const [method, setMethod] = useState('card');
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setAmount('');
      setMethod('card');
      setIsLoading(false);
    }
  }, [isOpen]);

  const numericAmount = parseFloat(amount) || 0;
  const fee = method === 'card' ? numericAmount * 0.029 : 0; // 2.9% card fee, 0% bank
  const totalCharge = numericAmount + fee;

  const handleConfirm = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onConfirm(numericAmount);
    }, 1500);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#1A0A2E] border-white/10 text-white sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <span className="text-green-400">Add Funds</span>
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Deposit USD into your FinaPay wallet.
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-6 py-4">
            
            {/* Method Selection */}
            <div className="space-y-3">
              <Label>Deposit Method</Label>
              <RadioGroup value={method} onValueChange={setMethod} className="grid grid-cols-2 gap-2">
                <div>
                  <RadioGroupItem value="card" id="card" className="peer sr-only" />
                  <Label htmlFor="card" className="flex flex-col items-center justify-center p-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 cursor-pointer peer-data-[state=checked]:border-green-400 peer-data-[state=checked]:text-green-400 transition-all text-xs text-center h-20">
                    <CreditCard className="w-5 h-5 mb-1" />
                    Credit/Debit Card
                    <span className="text-[10px] text-white/40 mt-1">Instant • 2.9% Fee</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="bank" id="bank" className="peer sr-only" />
                  <Label htmlFor="bank" className="flex flex-col items-center justify-center p-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 cursor-pointer peer-data-[state=checked]:border-green-400 peer-data-[state=checked]:text-green-400 transition-all text-xs text-center h-20">
                    <Building className="w-5 h-5 mb-1" />
                    Bank Transfer
                    <span className="text-[10px] text-white/40 mt-1">1-3 Days • No Fee</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Amount Input */}
            <div className="space-y-3">
              <Label>Amount (USD)</Label>
              <div className="relative">
                <Input 
                  type="number" 
                  placeholder="0.00" 
                  className="h-14 text-2xl font-bold bg-black/20 border-white/10 pl-10"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 font-medium">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
            </div>

            <Button 
              className="w-full h-12 bg-green-500 text-white hover:bg-green-600 font-bold"
              disabled={numericAmount <= 0}
              onClick={() => setStep(2)}
            >
              Review Deposit
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 py-4">
            <div className="bg-white/5 rounded-xl border border-white/10 p-4 space-y-4">
               <div className="flex justify-between">
                 <span className="text-white/60">Deposit Amount</span>
                 <span className="text-white font-medium">${numericAmount.toFixed(2)}</span>
               </div>
               <div className="flex justify-between">
                 <span className="text-white/60">Processing Fee</span>
                 <span className="text-white font-medium">${fee.toFixed(2)}</span>
               </div>
               <Separator className="bg-white/10" />
               <div className="flex justify-between items-end">
                 <span className="text-white/80">Total Charge</span>
                 <span className="text-2xl font-bold text-green-400">${totalCharge.toFixed(2)}</span>
               </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 border-white/10 hover:bg-white/5 text-white" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button 
                className="flex-[2] bg-green-500 text-white hover:bg-green-600 font-bold"
                onClick={handleConfirm}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Confirm Deposit
              </Button>
            </div>
          </div>
        )}

      </DialogContent>
    </Dialog>
  );
}
