import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CreditCard, Wallet, Building, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
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
  const [amountMode, setAmountMode] = useState<'usd' | 'grams'>('usd');
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setAmount('');
      setMethod('card');
      setIsLoading(false);
    }
  }, [isOpen]);

  const numericAmount = parseFloat(amount) || 0;
  
  const calculatedGrams = amountMode === 'usd' ? numericAmount / goldPrice : numericAmount;
  const calculatedCost = amountMode === 'usd' ? numericAmount : numericAmount * goldPrice;

  const handleConfirm = () => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      onConfirm(calculatedGrams, calculatedCost);
      // Let parent handle close/success toast
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

            {/* Amount Input */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label>Amount</Label>
                <div className="flex bg-black/20 rounded-md p-0.5 border border-white/10">
                  <button 
                    onClick={() => setAmountMode('usd')}
                    className={`px-3 py-1 text-xs rounded-sm transition-colors ${amountMode === 'usd' ? 'bg-[#D4AF37] text-black font-bold' : 'text-white/60 hover:text-white'}`}
                  >
                    USD
                  </button>
                  <button 
                    onClick={() => setAmountMode('grams')}
                    className={`px-3 py-1 text-xs rounded-sm transition-colors ${amountMode === 'grams' ? 'bg-[#D4AF37] text-black font-bold' : 'text-white/60 hover:text-white'}`}
                  >
                    Grams
                  </button>
                </div>
              </div>

              <div className="relative">
                <Input 
                  type="number" 
                  placeholder="0.00" 
                  className="h-14 text-2xl font-bold bg-black/20 border-white/10 pr-16"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 font-medium">
                  {amountMode === 'usd' ? 'USD' : 'g'}
                </div>
              </div>

              {/* Conversion Preview */}
              <div className="bg-white/5 rounded-lg p-3 flex justify-between items-center border border-white/5">
                <span className="text-sm text-white/60">
                  {amountMode === 'usd' ? 'You receive:' : 'You pay:'}
                </span>
                <span className="text-lg font-bold text-[#D4AF37]">
                  {amountMode === 'usd' 
                    ? `${calculatedGrams.toLocaleString(undefined, { maximumFractionDigits: 4 })} g`
                    : `$${calculatedCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                  }
                </span>
              </div>
            </div>

            <Button 
              className="w-full h-12 bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 font-bold"
              disabled={numericAmount <= 0}
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
                 <span className="text-white font-medium">{calculatedGrams.toFixed(4)} g</span>
               </div>
               <div className="flex justify-between">
                 <span className="text-white/60">Price / g</span>
                 <span className="text-white font-medium">${goldPrice.toFixed(2)}</span>
               </div>
               <div className="flex justify-between">
                 <span className="text-white/60">Fee (0.5%)</span>
                 <span className="text-white font-medium">${(calculatedCost * 0.005).toFixed(2)}</span>
               </div>
               <Separator className="bg-white/10" />
               <div className="flex justify-between items-end">
                 <span className="text-white/80">Total Cost</span>
                 <span className="text-2xl font-bold text-[#D4AF37]">${(calculatedCost * 1.005).toFixed(2)}</span>
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
