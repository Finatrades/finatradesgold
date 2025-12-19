import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, CheckCircle2, Building, Wallet, ArrowRightLeft, AlertCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { usePlatform } from '@/context/PlatformContext';

interface SellGoldModalProps {
  isOpen: boolean;
  onClose: () => void;
  goldPrice: number;
  walletBalance: number;
  spreadPercent: number;
  onConfirm: (grams: number, payout: number) => void;
}

export default function SellGoldModal({ isOpen, onClose, goldPrice, walletBalance, spreadPercent, onConfirm }: SellGoldModalProps) {
  const { settings: platformSettings } = usePlatform();
  const [method, setMethod] = useState('bank');
  
  // Dual inputs
  const [grams, setGrams] = useState('');
  const [usd, setUsd] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setGrams('');
      setUsd('');
      setMethod('bank');
      setIsLoading(false);
    }
  }, [isOpen]);

  const safeBalance = walletBalance || 0;

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
  const grossPayout = numericGrams * goldPrice;
  const fee = grossPayout * (spreadPercent / 100); 
  const netPayout = grossPayout - fee;
  const minTradeAmount = platformSettings.minTradeAmount || 10;
  const isBelowMinimum = grossPayout > 0 && grossPayout < minTradeAmount;

  const handleConfirm = () => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      onConfirm(numericGrams, netPayout);
    }, 1500);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white border-border text-foreground w-[95vw] max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <span className="text-red-500">Sell Gold</span>
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Cash out your digital gold to fiat.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          
          {/* Amount Inputs */}
          <div className="space-y-4">
            <div className="flex justify-end">
              <span className="text-xs text-secondary cursor-pointer hover:underline" onClick={() => handleGramsChange(safeBalance.toString())}>
                Max Available: {safeBalance.toFixed(3)} g
              </span>
            </div>
            
            <div className="relative">
              <Label className="mb-2 block">Amount to Sell (Gold Grams)</Label>
              <div className="relative">
                <Input 
                  type="number" 
                  placeholder="0.000" 
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
              <Label className="mb-2 block">Value (USD)</Label>
              <div className="relative">
                <Input 
                  type="number" 
                  placeholder="0.00" 
                  className="h-12 text-lg font-bold bg-background border-input pr-16"
                  value={usd}
                  onChange={(e) => handleUsdChange(e.target.value)}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                  USD
                </div>
              </div>
            </div>

            {numericGrams > safeBalance && (
              <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-2 rounded-md">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>Insufficient gold balance. You only have {safeBalance.toFixed(4)}g available.</span>
              </div>
            )}

            {isBelowMinimum && (
              <div className="flex items-center gap-2 text-fuchsia-600 text-sm bg-purple-50 p-2 rounded-md">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>Minimum trade amount is ${minTradeAmount}</span>
              </div>
            )}
          </div>

          {/* Method Selection */}
          <div className="space-y-3">
            <Label>Payout Method</Label>
            <RadioGroup value={method} onValueChange={setMethod} className="space-y-2">
              <div className="flex items-center space-x-2 bg-white shadow-sm p-3 rounded-lg border border-border">
                <RadioGroupItem value="bank" id="bank" className="border-border text-secondary" />
                <Label htmlFor="bank" className="flex-1 flex items-center cursor-pointer">
                  <Building className="w-4 h-4 mr-3 text-muted-foreground" />
                  <span className="flex-1">Bank Transfer</span>
                  <span className="text-xs text-muted-foreground">2-3 days</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2 bg-white shadow-sm p-3 rounded-lg border border-border">
                <RadioGroupItem value="crypto" id="crypto" className="border-border text-secondary" />
                <Label htmlFor="crypto" className="flex-1 flex items-center cursor-pointer">
                  <Wallet className="w-4 h-4 mr-3 text-muted-foreground" />
                  <span className="flex-1">Crypto Payout</span>
                  <span className="text-xs text-muted-foreground">Instant</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Summary Section Inline */}
          {numericGrams > 0 && (
             <div className="bg-muted/30 rounded-xl border border-border p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rate</span>
                  <span className="text-foreground font-medium">${goldPrice.toFixed(2)} / g</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fee ({spreadPercent}%)</span>
                  <span className="text-red-500">-${fee.toFixed(2)}</span>
                </div>
                <Separator className="bg-border my-2" />
                <div className="flex justify-between items-center">
                  <span className="text-foreground font-medium">Net Payout</span>
                  <span className="text-xl font-bold text-foreground">${netPayout.toFixed(2)}</span>
                </div>
             </div>
          )}

          <Button 
            className="w-full h-12 bg-red-500 text-white hover:bg-red-600 font-bold"
            disabled={numericGrams <= 0 || numericGrams > safeBalance || isBelowMinimum || isLoading}
            onClick={handleConfirm}
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
            Confirm Sell
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}
