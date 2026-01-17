import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import WalletTypeSelector, { type GoldWalletType } from '../WalletTypeSelector';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, CheckCircle2, Building, Wallet, ArrowRightLeft, AlertCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { usePlatform } from '@/context/PlatformContext';
import { useAuth } from '@/context/AuthContext';
import { useTransactionPin } from '@/components/TransactionPinPrompt';
import MobileFullScreenPage from '@/components/mobile/MobileFullScreenPage';
import { useMediaQuery } from '@/hooks/use-media-query';

interface SellGoldModalProps {
  isOpen: boolean;
  onClose: () => void;
  goldPrice: number;
  walletBalance: number;
  spreadPercent: number;
  onConfirm: (grams: number, payout: number, pinToken: string) => void;
}

export default function SellGoldModal({ isOpen, onClose, goldPrice, walletBalance, spreadPercent, onConfirm }: SellGoldModalProps) {
  const { settings: platformSettings } = usePlatform();
  const { user } = useAuth();
  const [method, setMethod] = useState('bank');
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  const [grams, setGrams] = useState('');
  const [usd, setUsd] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  
  const [selectedWalletType, setSelectedWalletType] = useState<GoldWalletType>('LGPW');
  const { requirePin, TransactionPinPromptComponent } = useTransactionPin();

  useEffect(() => {
    if (isOpen) {
      setGrams('');
      setUsd('');
      setMethod('bank');
      setIsLoading(false);
      setSelectedWalletType('LGPW');
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

  const handleConfirm = async () => {
    if (!user) return;
    
    let pinToken: string;
    try {
      pinToken = await requirePin({
        userId: user.id,
        action: 'sell_gold',
        title: 'Authorize Gold Sale',
        description: `Enter your 6-digit PIN to sell ${numericGrams.toFixed(4)}g of gold for $${netPayout.toFixed(2)}`,
      });
    } catch (error) {
      return;
    }
    
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onConfirm(numericGrams, netPayout, pinToken);
    }, 1500);
  };

  const formContent = (
    <div className="space-y-6">
      <WalletTypeSelector
        value={selectedWalletType}
        onChange={setSelectedWalletType}
      />

      <div className="space-y-4">
        <div className="flex justify-end">
          <span className="text-sm text-purple-600 font-medium cursor-pointer active:opacity-70" onClick={() => handleGramsChange(safeBalance.toString())}>
            Max Available: {safeBalance.toFixed(3)} g
          </span>
        </div>
        
        <div className="relative">
          <Label className="mb-2 block text-gray-700 font-medium">Amount to Sell (Gold Grams)</Label>
          <div className="relative">
            <Input 
              type="number" 
              placeholder="0.000" 
              className="h-14 text-lg font-bold bg-white border-gray-200 rounded-xl pr-16"
              value={grams}
              onChange={(e) => handleGramsChange(e.target.value)}
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-purple-600 font-semibold">
              g
            </div>
          </div>
        </div>

        <div className="flex justify-center -my-2 relative z-10">
           <div className="bg-white border border-gray-200 p-2 rounded-full text-gray-400 shadow-sm">
              <ArrowRightLeft className="w-5 h-5 rotate-90" />
           </div>
        </div>

        <div className="relative">
          <Label className="mb-2 block text-gray-700 font-medium">Value (USD)</Label>
          <div className="relative">
            <Input 
              type="number" 
              placeholder="0.00" 
              className="h-14 text-lg font-bold bg-white border-gray-200 rounded-xl pr-16"
              value={usd}
              onChange={(e) => handleUsdChange(e.target.value)}
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
              USD
            </div>
          </div>
        </div>

        {numericGrams > safeBalance && (
          <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-xl">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>Insufficient gold balance. You only have {safeBalance.toFixed(4)}g available.</span>
          </div>
        )}

        {isBelowMinimum && (
          <div className="flex items-center gap-2 text-purple-600 text-sm bg-purple-50 p-3 rounded-xl">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>Minimum trade amount is ${minTradeAmount}</span>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <Label className="text-gray-700 font-medium">Payout Method</Label>
        <RadioGroup value={method} onValueChange={setMethod} className="space-y-3">
          <div className="flex items-center space-x-3 bg-white shadow-sm p-4 rounded-xl border border-gray-200 mobile-list-item">
            <RadioGroupItem value="bank" id="bank" className="border-purple-300 text-purple-600" />
            <Label htmlFor="bank" className="flex-1 flex items-center cursor-pointer">
              <Building className="w-5 h-5 mr-3 text-gray-500" />
              <span className="flex-1 font-medium">Bank Transfer</span>
              <span className="text-sm text-gray-500">2-3 days</span>
            </Label>
          </div>
          <div className="flex items-center space-x-3 bg-white shadow-sm p-4 rounded-xl border border-gray-200 mobile-list-item">
            <RadioGroupItem value="crypto" id="crypto" className="border-purple-300 text-purple-600" />
            <Label htmlFor="crypto" className="flex-1 flex items-center cursor-pointer">
              <Wallet className="w-5 h-5 mr-3 text-gray-500" />
              <span className="flex-1 font-medium">Crypto Payout</span>
              <span className="text-sm text-gray-500">Instant</span>
            </Label>
          </div>
        </RadioGroup>
      </div>

      {numericGrams > 0 && (
         <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Rate</span>
              <span className="text-gray-900 font-semibold">${goldPrice.toFixed(2)} / g</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Fee ({spreadPercent}%)</span>
              <span className="text-red-500 font-medium">-${fee.toFixed(2)}</span>
            </div>
            <Separator className="bg-gray-200" />
            <div className="flex justify-between items-center">
              <span className="text-gray-900 font-semibold">Net Payout</span>
              <span className="text-2xl font-bold text-gray-900">${netPayout.toFixed(2)}</span>
            </div>
         </div>
      )}
    </div>
  );

  const confirmButton = (
    <Button 
      className="w-full h-14 bg-red-500 text-white hover:bg-red-600 font-bold text-base rounded-xl shadow-lg"
      disabled={numericGrams <= 0 || numericGrams > safeBalance || isBelowMinimum || isLoading}
      onClick={handleConfirm}
    >
      {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
      Confirm Sell
    </Button>
  );

  if (isMobile) {
    return (
      <>
        <MobileFullScreenPage
          isOpen={isOpen}
          onClose={onClose}
          title="Sell Gold"
          subtitle="Cash out your digital gold to fiat"
          headerColor="red"
          footer={confirmButton}
        >
          <div className="p-4">
            {formContent}
          </div>
        </MobileFullScreenPage>
        {TransactionPinPromptComponent}
      </>
    );
  }

  return (
    <>
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

        <div className="py-4">
          {formContent}
          <div className="mt-6">
            {confirmButton}
          </div>
        </div>
      </DialogContent>
    </Dialog>
    {TransactionPinPromptComponent}
    </>
  );
}
