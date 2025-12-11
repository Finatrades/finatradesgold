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
  spreadPercent: number;
  onConfirm: (grams: number, cost: number) => void;
}

export default function BuyGoldModal({ isOpen, onClose, goldPrice, spreadPercent, onConfirm }: BuyGoldModalProps) {
  const [method, setMethod] = useState('card');
  
  // Dual inputs state
  const [grams, setGrams] = useState('');
  const [usd, setUsd] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
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
  const fee = numericUsd * (spreadPercent / 100);
  const totalCost = numericUsd + fee;

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
      <DialogContent className="bg-white border-border text-foreground sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <span className="text-secondary">Buy Gold</span>
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Convert fiat to digital gold instantly.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          
          {/* Method Selection */}
          <div className="space-y-3">
            <Label>Payment Method</Label>
            <RadioGroup value={method} onValueChange={setMethod} className="grid grid-cols-3 gap-2">
              <div>
                <RadioGroupItem value="card" id="card" className="peer sr-only" />
                <Label htmlFor="card" className="flex flex-col items-center justify-center p-3 rounded-lg border border-border bg-white shadow-sm hover:bg-muted/50 cursor-pointer peer-data-[state=checked]:border-secondary peer-data-[state=checked]:text-secondary transition-all text-xs text-center h-20 text-muted-foreground">
                  <CreditCard className="w-5 h-5 mb-1" />
                  Card
                </Label>
              </div>
              <div>
                <RadioGroupItem value="crypto" id="crypto" className="peer sr-only" />
                <Label htmlFor="crypto" className="flex flex-col items-center justify-center p-3 rounded-lg border border-border bg-white shadow-sm hover:bg-muted/50 cursor-pointer peer-data-[state=checked]:border-secondary peer-data-[state=checked]:text-secondary transition-all text-xs text-center h-20 text-muted-foreground">
                  <Wallet className="w-5 h-5 mb-1" />
                  Crypto
                </Label>
              </div>
              <div>
                <RadioGroupItem value="bank" id="bank" className="peer sr-only" />
                <Label htmlFor="bank" className="flex flex-col items-center justify-center p-3 rounded-lg border border-border bg-white shadow-sm hover:bg-muted/50 cursor-pointer peer-data-[state=checked]:border-secondary peer-data-[state=checked]:text-secondary transition-all text-xs text-center h-20 text-muted-foreground">
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
                  className="h-12 text-lg font-bold bg-background border-input pr-16"
                  value={grams}
                  onChange={(e) => handleGramsChange(e.target.value)}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary font-medium">
                  g
                </div>
              </div>
            </div>

            <div className="flex justify-center -my-2 relative z-10">
               <div className="bg-white border border-border p-1.5 rounded-full text-muted-foreground shadow-sm">
                  <ArrowRightLeft className="w-4 h-4 rotate-90" />
               </div>
            </div>

            <div className="relative">
              <Label className="mb-2 block">Amount (USD Equivalent)</Label>
              <div className="relative">
                <Input 
                  type="number" 
                  placeholder="0.00" 
                  className="h-12 text-lg font-bold bg-background border-input pr-16"
                  value={usd}
                  onChange={(e) => handleUsdChange(e.target.value)}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-green-600 font-medium">
                  USD
                </div>
              </div>
            </div>
          </div>

          {/* Summary Section Inline */}
          {numericGrams > 0 && (
             <div className="bg-muted/30 rounded-xl border border-border p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Price / g</span>
                  <span className="text-foreground font-medium">${goldPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fee ({spreadPercent}%)</span>
                  <span className="text-foreground font-medium">${fee.toFixed(2)}</span>
                </div>
                <Separator className="bg-border my-2" />
                <div className="flex justify-between items-center">
                  <span className="text-foreground font-medium">Total Cost</span>
                  <span className="text-xl font-bold text-secondary">${totalCost.toFixed(2)}</span>
                </div>
             </div>
          )}

          <Button 
            className="w-full h-12 bg-secondary text-white hover:bg-secondary/90 font-bold"
            disabled={numericGrams <= 0 || isLoading}
            onClick={handleConfirm}
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
            Confirm Purchase
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}
