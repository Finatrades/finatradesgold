import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CreditCard, Wallet, Building, Loader2, CheckCircle2, ArrowRightLeft } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface BuyGoldModalProps {
  isOpen: boolean;
  onClose: () => void;
  goldPrice: number;
  onConfirm: (grams: number, cost: number) => void;
}

export default function BuyGoldModal({ isOpen, onClose, goldPrice, onConfirm }: BuyGoldModalProps) {
  const [step, setStep] = useState(1);
  const [method, setMethod] = useState('card');
  
  // Dual inputs state
  const [grams, setGrams] = useState('');
  const [usd, setUsd] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setGrams('');
      setUsd('');
      setMethod('card');
      setIsLoading(false);
    }
  }, [isOpen]);

  const handleGramsChange = (val: string) => {
    setGrams(val);
    if (!val) {
      setUsd('');
      return;
    }
    const numGrams = parseFloat(val);
    if (!isNaN(numGrams)) {
      setUsd((numGrams * goldPrice).toFixed(2));
    }
  };

  const handleUsdChange = (val: string) => {
    setUsd(val);
    if (!val) {
      setGrams('');
      return;
    }
    const numUsd = parseFloat(val);
    if (!isNaN(numUsd)) {
      setGrams((numUsd / goldPrice).toFixed(4));
    }
  };

  const numericGrams = parseFloat(grams) || 0;
  const numericUsd = parseFloat(usd) || 0;

  const handleConfirm = () => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      onConfirm(numericGrams, numericUsd);
    }, 1500);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#1A0A2E] border-white/10 text-white sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <span className="text-[#D4AF37]">Buy Gold</span>
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Convert fiat to digital gold instantly.
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-6 py-4">
            
            {/* Method Selection */}
            <div className="space-y-3">
              <Label>Payment Method</Label>
              <RadioGroup value={method} onValueChange={setMethod} className="grid grid-cols-3 gap-2">
                <div>
                  <RadioGroupItem value="card" id="card" className="peer sr-only" />
                  <Label htmlFor="card" className="flex flex-col items-center justify-center p-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 cursor-pointer peer-data-[state=checked]:border-[#D4AF37] peer-data-[state=checked]:text-[#D4AF37] transition-all text-xs text-center h-20">
                    <CreditCard className="w-5 h-5 mb-1" />
                    Card
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="crypto" id="crypto" className="peer sr-only" />
                  <Label htmlFor="crypto" className="flex flex-col items-center justify-center p-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 cursor-pointer peer-data-[state=checked]:border-[#D4AF37] peer-data-[state=checked]:text-[#D4AF37] transition-all text-xs text-center h-20">
                    <Wallet className="w-5 h-5 mb-1" />
                    Crypto
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="bank" id="bank" className="peer sr-only" />
                  <Label htmlFor="bank" className="flex flex-col items-center justify-center p-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 cursor-pointer peer-data-[state=checked]:border-[#D4AF37] peer-data-[state=checked]:text-[#D4AF37] transition-all text-xs text-center h-20">
                    <Building className="w-5 h-5 mb-1" />
                    Bank
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Dual Inputs */}
            <div className="space-y-4">
              <div className="relative">
                <Label className="mb-2 block">Amount (Gold Grams)</Label>
                <div className="relative">
                  <Input 
                    type="number" 
                    placeholder="0.0000" 
                    className="h-12 text-lg font-bold bg-black/20 border-white/10 pr-16"
                    value={grams}
                    onChange={(e) => handleGramsChange(e.target.value)}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[#D4AF37] font-medium">
                    g
                  </div>
                </div>
              </div>

              <div className="flex justify-center -my-2 relative z-10">
                 <div className="bg-[#1A0A2E] border border-white/10 p-1.5 rounded-full text-white/40">
                    <ArrowRightLeft className="w-4 h-4 rotate-90" />
                 </div>
              </div>

              <div className="relative">
                <Label className="mb-2 block">Amount (USD Equivalent)</Label>
                <div className="relative">
                  <Input 
                    type="number" 
                    placeholder="0.00" 
                    className="h-12 text-lg font-bold bg-black/20 border-white/10 pr-16"
                    value={usd}
                    onChange={(e) => handleUsdChange(e.target.value)}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-green-400 font-medium">
                    USD
                  </div>
                </div>
              </div>
            </div>

            <Button 
              className="w-full h-12 bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 font-bold"
              disabled={numericGrams <= 0}
              onClick={() => setStep(2)}
            >
              Review Purchase
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 py-4">
            <div className="bg-white/5 rounded-xl border border-white/10 p-4 space-y-4">
               <div className="flex justify-between">
                 <span className="text-white/60">Amount</span>
                 <span className="text-white font-medium">{numericGrams.toFixed(4)} g</span>
               </div>
               <div className="flex justify-between">
                 <span className="text-white/60">Price / g</span>
                 <span className="text-white font-medium">${goldPrice.toFixed(2)}</span>
               </div>
               <div className="flex justify-between">
                 <span className="text-white/60">Fee (0.5%)</span>
                 <span className="text-white font-medium">${(numericUsd * 0.005).toFixed(2)}</span>
               </div>
               <Separator className="bg-white/10" />
               <div className="flex justify-between items-end">
                 <span className="text-white/80">Total Cost</span>
                 <span className="text-2xl font-bold text-[#D4AF37]">${(numericUsd * 1.005).toFixed(2)}</span>
               </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 border-white/10 hover:bg-white/5 text-white" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button 
                className="flex-[2] bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 font-bold"
                onClick={handleConfirm}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Confirm Payment
              </Button>
            </div>
            
            <p className="text-xs text-center text-white/40">
              // This mocks calling FinaVault API to credit gold ownership.
            </p>
          </div>
        )}

      </DialogContent>
    </Dialog>
  );
}
