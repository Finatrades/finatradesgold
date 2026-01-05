import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, ArrowRightLeft, Lock, ArrowDownToLine, TrendingUp } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import GoldBackedDisclosure from '@/components/common/GoldBackedDisclosure';
import { AEDAmount, AED_SYMBOL } from '@/components/ui/DirhamSymbol';

interface BnslWalletCardProps {
  bnslBalanceGold: number;
  availableValueUsd?: number;
  lockedBalanceGold: number;
  lockedValueUsd?: number;
  finaPayBalanceGold: number;
  onTransferFromFinaPay: (amount: number) => Promise<boolean>;
  onWithdrawToFinaPay?: (amount: number) => Promise<boolean>;
  currentGoldPrice: number;
}

export default function BnslWalletCard({ 
  bnslBalanceGold, 
  availableValueUsd,
  lockedBalanceGold,
  lockedValueUsd, 
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
            
            {/* Available Balance - USD Value is LOCKED at transfer time */}
            <div className="bg-muted p-4 rounded-xl border border-border relative overflow-hidden">
              <div className="absolute top-2 right-2">
                <Lock className="w-4 h-4 text-muted-foreground/50" />
              </div>
              <p className="text-muted-foreground text-xs uppercase tracking-wider mb-2">Available to Invest</p>
              <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs text-muted-foreground">{availableValueUsd != null ? 'USD Value (Locked):' : 'USD Value (Current):'}</span>
                  <span className="text-xl font-bold text-foreground">
                    ${(availableValueUsd ?? (bnslBalanceGold * currentGoldPrice)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xs text-muted-foreground">Gold Quantity:</span>
                  <span className="text-base font-semibold text-fuchsia-600">
                    {bnslBalanceGold.toFixed(4)} g
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                {availableValueUsd != null 
                  ? 'Price locked at transfer time. Withdrawal pays market price.'
                  : 'Current market value. Withdrawal pays market price.'}
              </p>
            </div>

            {/* Locked Funds - USD Value is FIXED at enrollment price */}
            <div className="bg-muted p-4 rounded-xl border border-border relative overflow-hidden">
              <div className="absolute top-2 right-2">
                <Lock className="w-4 h-4 text-purple-400" />
              </div>
              <p className="text-muted-foreground text-xs uppercase tracking-wider mb-2">Locked in Plans</p>
              <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs text-muted-foreground">USD Value (Locked):</span>
                  <span className="text-xl font-bold text-purple-500">
                    ${(lockedValueUsd ?? (lockedBalanceGold * currentGoldPrice)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xs text-muted-foreground">Gold Sold:</span>
                  <span className="text-base font-semibold text-purple-500/80">
                    {lockedBalanceGold.toFixed(4)} g
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Value locked at enrollment price (not live price).
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

          {/* Price Lock Explanation */}
          <div className="bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200 rounded-lg p-3 text-sm">
            <div className="flex items-start gap-2">
              <Lock className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-purple-700 mb-1">Locking in Today's Price</p>
                <p className="text-purple-600 text-xs leading-relaxed">
                  When you move gold into BNSL, you secure today's USD price. This protects you from price drops, 
                  but you won't gain if prices rise while the gold is in BNSL.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4 py-4">
             {/* USD Reference Price Display */}
             <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
               <p className="text-xs text-green-600 uppercase tracking-wider mb-2 font-medium">USD Reference Price (Will Be Locked)</p>
               <div className="flex justify-between items-baseline">
                 <span className="text-sm text-muted-foreground">Gold Price per Gram:</span>
                 <span className="text-lg font-bold text-green-700">${currentGoldPrice.toFixed(2)}</span>
               </div>
               {isValidAmount && !isInsufficientBalance && (
                 <div className="flex justify-between items-baseline mt-2 pt-2 border-t border-green-200">
                   <span className="text-sm text-muted-foreground">Total USD Value to Lock:</span>
                   <span className="text-xl font-bold text-green-700">
                     ${(currency === 'Grams' 
                       ? parseFloat(transferAmount) * currentGoldPrice 
                       : parseFloat(transferAmount)
                     ).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                   </span>
                 </div>
               )}
             </div>

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

          {/* Price Lock Explanation */}
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-lg p-3 text-sm">
            <div className="flex items-start gap-2">
              <TrendingUp className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-amber-700 mb-1">Unlocking Your Gold</p>
                <p className="text-amber-600 text-xs leading-relaxed">
                  Withdrawing gold returns it to FinaPay at today's market price. 
                  You'll receive current market value, which may be higher or lower than your original locked price.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4 py-4">
             {/* USD Reference Price Comparison */}
             <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
               <p className="text-xs text-blue-600 uppercase tracking-wider mb-2 font-medium">USD Reference Price Comparison</p>
               <div className="space-y-2">
                 {availableValueUsd != null && bnslBalanceGold > 0 && (
                   <div className="flex justify-between items-baseline">
                     <span className="text-sm text-muted-foreground">Locked Reference (per gram):</span>
                     <span className="text-base font-bold text-purple-600">${(availableValueUsd / bnslBalanceGold).toFixed(2)}</span>
                   </div>
                 )}
                 <div className="flex justify-between items-baseline">
                   <span className="text-sm text-muted-foreground">Current Market (per gram):</span>
                   <span className="text-base font-bold text-green-600">${currentGoldPrice.toFixed(2)}</span>
                 </div>
                 {availableValueUsd != null && bnslBalanceGold > 0 && (
                   <div className="flex justify-between items-baseline pt-2 border-t border-blue-200">
                     <span className="text-sm text-muted-foreground">Price Change:</span>
                     <span className={`text-base font-bold ${currentGoldPrice >= (availableValueUsd / bnslBalanceGold) ? 'text-green-600' : 'text-red-600'}`}>
                       {currentGoldPrice >= (availableValueUsd / bnslBalanceGold) ? '+' : ''}
                       ${(currentGoldPrice - (availableValueUsd / bnslBalanceGold)).toFixed(2)} 
                       ({((currentGoldPrice - (availableValueUsd / bnslBalanceGold)) / (availableValueUsd / bnslBalanceGold) * 100).toFixed(1)}%)
                     </span>
                   </div>
                 )}
               </div>
             </div>

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
