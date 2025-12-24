import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, ArrowRightLeft, Lock, ArrowDownToLine } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import GoldBackedDisclosure from '@/components/common/GoldBackedDisclosure';
import { AEDAmount, AED_SYMBOL } from '@/components/ui/DirhamSymbol';

interface BnslWalletCardProps {
  bnslBalanceGold: number;
  lockedBalanceGold: number;
  finaPayBalanceGold: number;
  onTransferFromFinaPay: (amount: number) => Promise<boolean>;
  onWithdrawToFinaPay?: (amount: number) => Promise<boolean>;
  currentGoldPrice: number;
}

export default function BnslWalletCard({ 
  bnslBalanceGold, 
  lockedBalanceGold, 
  finaPayBalanceGold, 
  onTransferFromFinaPay,
  onWithdrawToFinaPay,
  currentGoldPrice 
}: BnslWalletCardProps) {
  const { toast } = useToast();
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [transferAmount, setTransferAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [currency, setCurrency] = useState<'Grams' | 'USD'>('Grams');
  const [withdrawCurrency, setWithdrawCurrency] = useState<'Grams' | 'USD'>('Grams');

  const [isTransferring, setIsTransferring] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const handleTransfer = async () => {
    let amountGrams = parseFloat(transferAmount);
    
    if (currency === 'USD') {
      amountGrams = amountGrams / currentGoldPrice;
    }

    if (isNaN(amountGrams) || amountGrams <= 0) {
      toast({ title: "Invalid Amount", description: "Please enter a valid positive number.", variant: "destructive" });
      return;
    }
    if (amountGrams > finaPayBalanceGold) {
      toast({ title: "Insufficient Balance", description: "Not enough gold in FinaPay wallet.", variant: "destructive" });
      return;
    }
    
    setIsTransferring(true);
    try {
      const success = await onTransferFromFinaPay(amountGrams);
      if (success) {
        setIsTransferModalOpen(false);
        setTransferAmount('');
      }
    } finally {
      setIsTransferring(false);
    }
  };

  const handleWithdraw = async () => {
    if (!onWithdrawToFinaPay) return;
    
    let amountGrams = parseFloat(withdrawAmount);
    
    if (withdrawCurrency === 'USD') {
      amountGrams = amountGrams / currentGoldPrice;
    }

    if (isNaN(amountGrams) || amountGrams <= 0) {
      toast({ title: "Invalid Amount", description: "Please enter a valid positive number.", variant: "destructive" });
      return;
    }
    if (amountGrams > bnslBalanceGold) {
      toast({ title: "Insufficient Balance", description: "Not enough gold in BNSL wallet.", variant: "destructive" });
      return;
    }
    
    setIsWithdrawing(true);
    try {
      const success = await onWithdrawToFinaPay(amountGrams);
      if (success) {
        setIsWithdrawModalOpen(false);
        setWithdrawAmount('');
      }
    } finally {
      setIsWithdrawing(false);
    }
  };

  const getMaxAmount = () => {
    return currency === 'Grams' 
      ? finaPayBalanceGold.toString() 
      : (finaPayBalanceGold * currentGoldPrice).toFixed(2);
  };

  const getMaxWithdrawAmount = () => {
    return withdrawCurrency === 'Grams' 
      ? bnslBalanceGold.toString() 
      : (bnslBalanceGold * currentGoldPrice).toFixed(2);
  };

  const getAmountInGrams = (): number => {
    const amount = parseFloat(transferAmount);
    if (isNaN(amount)) return 0;
    return currency === 'USD' ? amount / currentGoldPrice : amount;
  };

  const getWithdrawAmountInGrams = (): number => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount)) return 0;
    return withdrawCurrency === 'USD' ? amount / currentGoldPrice : amount;
  };

  const isInsufficientBalance = getAmountInGrams() > finaPayBalanceGold && transferAmount !== '';
  const isValidAmount = !isNaN(parseFloat(transferAmount)) && parseFloat(transferAmount) > 0;
  const isInsufficientWithdrawBalance = getWithdrawAmountInGrams() > bnslBalanceGold && withdrawAmount !== '';
  const isValidWithdrawAmount = !isNaN(parseFloat(withdrawAmount)) && parseFloat(withdrawAmount) > 0;

  // Calculate gold bar breakdown
  const calculateGoldBars = (grams: number): { kg: number; g100: number; g10: number; g1: number } => {
    if (isNaN(grams) || grams <= 0) return { kg: 0, g100: 0, g10: 0, g1: 0 };
    
    let remaining = grams;
    const kg = Math.floor(remaining / 1000);
    remaining = remaining % 1000;
    const g100 = Math.floor(remaining / 100);
    remaining = remaining % 100;
    const g10 = Math.floor(remaining / 10);
    remaining = remaining % 10;
    const g1 = Math.floor(remaining);
    
    return { kg, g100, g10, g1 };
  };

  const transferBars = calculateGoldBars(getAmountInGrams());
  const withdrawBars = calculateGoldBars(getWithdrawAmountInGrams());

  const GoldBarSummary = ({ bars, show }: { bars: { kg: number; g100: number; g10: number; g1: number }, show: boolean }) => {
    if (!show) return null;
    const hasAnyBars = bars.kg > 0 || bars.g100 > 0 || bars.g10 > 0 || bars.g1 > 0;
    if (!hasAnyBars) return null;
    
    return (
      <div className="p-3 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg border border-amber-200 mt-3">
        <p className="text-xs font-semibold text-amber-800 mb-2">Gold Bar Breakdown:</p>
        <div className="grid grid-cols-4 gap-2 text-center">
          {bars.kg > 0 && (
            <div className="bg-white rounded-lg p-2 border border-amber-300 shadow-sm">
              <span className="text-lg font-bold text-amber-700">{bars.kg}</span>
              <p className="text-[10px] text-amber-600 font-medium">1 KG</p>
            </div>
          )}
          {bars.g100 > 0 && (
            <div className="bg-white rounded-lg p-2 border border-amber-300 shadow-sm">
              <span className="text-lg font-bold text-amber-700">{bars.g100}</span>
              <p className="text-[10px] text-amber-600 font-medium">100g</p>
            </div>
          )}
          {bars.g10 > 0 && (
            <div className="bg-white rounded-lg p-2 border border-amber-300 shadow-sm">
              <span className="text-lg font-bold text-amber-700">{bars.g10}</span>
              <p className="text-[10px] text-amber-600 font-medium">10g</p>
            </div>
          )}
          {bars.g1 > 0 && (
            <div className="bg-white rounded-lg p-2 border border-amber-300 shadow-sm">
              <span className="text-lg font-bold text-amber-700">{bars.g1}</span>
              <p className="text-[10px] text-amber-600 font-medium">1g</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <Card className="bg-white shadow-sm border border-border overflow-hidden relative">
        <div className="absolute top-0 right-0 p-4 opacity-5">
          <Wallet className="w-32 h-32 text-secondary" />
        </div>
        
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
              <div className="p-2 rounded-lg bg-secondary/10 text-secondary">
                <Wallet className="w-5 h-5" />
              </div>
              BNSL Wallet
            </CardTitle>
            <div className="flex gap-2">
              {onWithdrawToFinaPay && bnslBalanceGold > 0 && (
                <Button 
                  size="sm" 
                  variant="outline"
                  className="border-primary text-primary hover:bg-primary/10 font-bold"
                  onClick={() => setIsWithdrawModalOpen(true)}
                  data-testid="button-withdraw-to-finapay"
                >
                  <ArrowDownToLine className="w-4 h-4 mr-2" /> Withdraw to FinaPay
                </Button>
              )}
              <Button 
                size="sm" 
                className="bg-primary text-white hover:bg-primary/90 font-bold"
                onClick={() => setIsTransferModalOpen(true)}
                data-testid="button-transfer-from-finapay"
              >
                <ArrowRightLeft className="w-4 h-4 mr-2" /> Transfer from FinaPay
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Available Balance */}
            <div className="bg-muted p-4 rounded-xl border border-border">
              <p className="text-muted-foreground text-xs uppercase tracking-wider mb-2">Available to Invest</p>
              <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs text-muted-foreground">USD Value:</span>
                  <span className="text-xl font-bold text-foreground">
                    ${(bnslBalanceGold * currentGoldPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xs text-muted-foreground">Gold Backing:</span>
                  <span className="text-base font-semibold text-fuchsia-600">
                    {bnslBalanceGold.toFixed(4)} g
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                Funds available for creating new BNSL plans.
              </p>
            </div>

            {/* Locked Funds */}
            <div className="bg-muted p-4 rounded-xl border border-border">
              <p className="text-muted-foreground text-xs uppercase tracking-wider mb-2">Locked in Plans</p>
              <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs text-muted-foreground">USD Value:</span>
                  <span className="text-xl font-bold text-purple-500">
                    ${(lockedBalanceGold * currentGoldPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xs text-muted-foreground">Gold Backing:</span>
                  <span className="text-base font-semibold text-purple-500/80">
                    {lockedBalanceGold.toFixed(4)} g
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Active plans currently earning structured rewards.
              </p>
            </div>

            {/* Total Value */}
            <div className="bg-muted p-4 rounded-xl border border-border">
               <p className="text-muted-foreground text-xs uppercase tracking-wider mb-2">Total BNSL Value</p>
               <div className="space-y-1">
                 <div className="flex items-baseline gap-2">
                   <span className="text-xs text-muted-foreground">USD Value:</span>
                   <span className="text-xl font-bold text-green-600">
                     ${((bnslBalanceGold + lockedBalanceGold) * currentGoldPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                   </span>
                 </div>
                 <div className="flex items-baseline gap-2">
                   <span className="text-xs text-muted-foreground">Gold Backing:</span>
                   <span className="text-base font-semibold text-foreground">
                     {(bnslBalanceGold + lockedBalanceGold).toFixed(4)} g
                   </span>
                 </div>
               </div>
            </div>

          </div>
          
          {/* Gold-Backed Disclosure */}
          <GoldBackedDisclosure className="mt-4" />
        </CardContent>
      </Card>

      {/* Transfer Modal */}
      <Dialog open={isTransferModalOpen} onOpenChange={setIsTransferModalOpen}>
        <DialogContent className="bg-white border-border text-foreground w-[95vw] max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transfer Gold from FinaPay</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Move gold from your main FinaPay wallet to your BNSL wallet to start new plans.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
             <div className="p-4 bg-muted rounded-lg border border-border space-y-2">
               <div className="flex justify-between text-sm">
                 <span className="text-muted-foreground">Available in FinaPay:</span>
                 <span className="text-primary font-bold">{finaPayBalanceGold.toFixed(3)} g</span>
               </div>
               <div className="flex justify-between text-sm">
                 <span className="text-muted-foreground">Current BNSL Wallet:</span>
                 <span className="text-foreground font-bold">{bnslBalanceGold.toFixed(3)} g</span>
               </div>
             </div>

             <div className="space-y-2">
               <Label>Amount to Transfer</Label>
               <div className="flex gap-2 mb-2">
                 <Button 
                   size="sm" 
                   variant={currency === 'Grams' ? 'default' : 'outline'} 
                   onClick={() => setCurrency('Grams')}
                   className="flex-1"
                 >
                   Grams (g)
                 </Button>
                 <Button 
                   size="sm" 
                   variant={currency === 'USD' ? 'default' : 'outline'} 
                   onClick={() => setCurrency('USD')}
                   className="flex-1"
                 >
                   USD ($)
                 </Button>
               </div>
               <div className="relative">
                 <Input 
                   type="number" 
                   placeholder="0.00" 
                   className={`bg-background pl-4 pr-20 text-lg text-foreground ${isInsufficientBalance ? 'border-destructive focus-visible:ring-destructive' : 'border-input'}`}
                   value={transferAmount}
                   onChange={(e) => setTransferAmount(e.target.value)}
                 />
                 <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                   <span className="text-muted-foreground text-sm font-bold">{currency === 'Grams' ? 'g' : '$'}</span>
                   <Button 
                     size="sm" 
                     variant="ghost" 
                     className="h-7 px-2 text-xs font-bold text-primary hover:text-primary/80 hover:bg-primary/10"
                     onClick={() => setTransferAmount(getMaxAmount())}
                   >
                     MAX
                   </Button>
                 </div>
               </div>
               {isInsufficientBalance ? (
                 <p className="text-xs text-destructive mt-1 font-medium">
                   Insufficient balance. Maximum available: {finaPayBalanceGold.toFixed(3)} g (≈ ${(finaPayBalanceGold * currentGoldPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                 </p>
               ) : (
                 <p className="text-xs text-muted-foreground mt-1">
                   {currency === 'Grams' && transferAmount && !isNaN(parseFloat(transferAmount)) && (
                     <>≈ ${(parseFloat(transferAmount) * currentGoldPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>
                   )}
                   {currency === 'USD' && transferAmount && !isNaN(parseFloat(transferAmount)) && (
                     <>≈ {(parseFloat(transferAmount) / currentGoldPrice).toFixed(3)} g</>
                   )}
                 </p>
               )}
               
               <GoldBarSummary bars={transferBars} show={isValidAmount && !isInsufficientBalance} />
             </div>

             <Button 
               className="w-full bg-primary text-white hover:bg-primary/90 font-bold"
               onClick={handleTransfer}
               disabled={isTransferring || isInsufficientBalance || !isValidAmount}
             >
               {isTransferring ? 'Transferring...' : 'Confirm Transfer'}
             </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Withdraw Modal */}
      <Dialog open={isWithdrawModalOpen} onOpenChange={setIsWithdrawModalOpen}>
        <DialogContent className="bg-white border-border text-foreground w-[95vw] max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Withdraw Gold to FinaPay</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Move gold from your BNSL wallet back to your main FinaPay wallet.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
             <div className="p-4 bg-muted rounded-lg border border-border space-y-2">
               <div className="flex justify-between text-sm">
                 <span className="text-muted-foreground">Available in BNSL:</span>
                 <span className="text-primary font-bold">{bnslBalanceGold.toFixed(3)} g</span>
               </div>
               <div className="flex justify-between text-sm">
                 <span className="text-muted-foreground">Current FinaPay Wallet:</span>
                 <span className="text-foreground font-bold">{finaPayBalanceGold.toFixed(3)} g</span>
               </div>
             </div>

             <div className="space-y-2">
               <Label>Amount to Withdraw</Label>
               <div className="flex gap-2 mb-2">
                 <Button 
                   size="sm" 
                   variant={withdrawCurrency === 'Grams' ? 'default' : 'outline'} 
                   onClick={() => setWithdrawCurrency('Grams')}
                   className="flex-1"
                 >
                   Grams (g)
                 </Button>
                 <Button 
                   size="sm" 
                   variant={withdrawCurrency === 'USD' ? 'default' : 'outline'} 
                   onClick={() => setWithdrawCurrency('USD')}
                   className="flex-1"
                 >
                   USD ($)
                 </Button>
               </div>
               <div className="relative">
                 <Input 
                   type="number" 
                   placeholder="0.00" 
                   className={`bg-background pl-4 pr-20 text-lg text-foreground ${isInsufficientWithdrawBalance ? 'border-destructive focus-visible:ring-destructive' : 'border-input'}`}
                   value={withdrawAmount}
                   onChange={(e) => setWithdrawAmount(e.target.value)}
                   data-testid="input-withdraw-amount"
                 />
                 <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                   <span className="text-muted-foreground text-sm font-bold">{withdrawCurrency === 'Grams' ? 'g' : '$'}</span>
                   <Button 
                     size="sm" 
                     variant="ghost" 
                     className="h-7 px-2 text-xs font-bold text-primary hover:text-primary/80 hover:bg-primary/10"
                     onClick={() => setWithdrawAmount(getMaxWithdrawAmount())}
                     data-testid="button-max-withdraw"
                   >
                     MAX
                   </Button>
                 </div>
               </div>
               {isInsufficientWithdrawBalance ? (
                 <p className="text-xs text-destructive mt-1 font-medium">
                   Insufficient balance. Maximum available: {bnslBalanceGold.toFixed(3)} g (≈ ${(bnslBalanceGold * currentGoldPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                 </p>
               ) : (
                 <p className="text-xs text-muted-foreground mt-1">
                   {withdrawCurrency === 'Grams' && withdrawAmount && !isNaN(parseFloat(withdrawAmount)) && (
                     <>≈ ${(parseFloat(withdrawAmount) * currentGoldPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>
                   )}
                   {withdrawCurrency === 'USD' && withdrawAmount && !isNaN(parseFloat(withdrawAmount)) && (
                     <>≈ {(parseFloat(withdrawAmount) / currentGoldPrice).toFixed(3)} g</>
                   )}
                 </p>
               )}
               
               <GoldBarSummary bars={withdrawBars} show={isValidWithdrawAmount && !isInsufficientWithdrawBalance} />
             </div>

             <Button 
               className="w-full bg-primary text-white hover:bg-primary/90 font-bold"
               onClick={handleWithdraw}
               disabled={isWithdrawing || isInsufficientWithdrawBalance || !isValidWithdrawAmount}
               data-testid="button-confirm-withdraw"
             >
               {isWithdrawing ? 'Withdrawing...' : 'Confirm Withdrawal'}
             </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
