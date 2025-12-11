import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, ArrowRightLeft, Lock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface BnslWalletCardProps {
  bnslBalanceGold: number;
  lockedBalanceGold: number;
  finaPayBalanceGold: number;
  onTransferFromFinaPay: (amount: number) => void;
  currentGoldPrice: number;
}

export default function BnslWalletCard({ 
  bnslBalanceGold, 
  lockedBalanceGold, 
  finaPayBalanceGold, 
  onTransferFromFinaPay,
  currentGoldPrice 
}: BnslWalletCardProps) {
  const { toast } = useToast();
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferAmount, setTransferAmount] = useState('');
  const [currency, setCurrency] = useState<'Grams' | 'USD'>('Grams');

  const handleTransfer = () => {
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
    
    onTransferFromFinaPay(amountGrams);
    setIsTransferModalOpen(false);
    setTransferAmount('');
    toast({ title: "Transfer Successful", description: `Transferred ${amountGrams.toFixed(3)}g from FinaPay to BNSL Wallet.` });
  };

  const getMaxAmount = () => {
    return currency === 'Grams' 
      ? finaPayBalanceGold.toString() 
      : (finaPayBalanceGold * currentGoldPrice).toFixed(2);
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
            <Button 
              size="sm" 
              className="bg-secondary text-white hover:bg-secondary/90 font-bold"
              onClick={() => setIsTransferModalOpen(true)}
            >
              <ArrowRightLeft className="w-4 h-4 mr-2" /> Transfer from FinaPay
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Available Balance */}
            <div className="bg-muted p-4 rounded-xl border border-border">
              <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Available to Invest</p>
              <div className="text-2xl font-bold text-foreground">
                ${(bnslBalanceGold * currentGoldPrice).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {bnslBalanceGold.toFixed(3)} g
              </p>
              <p className="text-[10px] text-muted-foreground mt-2">
                Funds available for creating new BNSL plans.
              </p>
            </div>

            {/* Locked Funds */}
            <div className="bg-muted p-4 rounded-xl border border-border">
              <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">
                Locked in Plans
              </p>
              <div className="text-2xl font-bold text-amber-500">
                ${(lockedBalanceGold * currentGoldPrice).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
              </div>
              <p className="text-sm text-amber-500/80 mt-1">
                {lockedBalanceGold.toFixed(3)} g
              </p>
              <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Active plans currently earning structured rewards.
              </p>
            </div>

            {/* Total Value */}
            <div className="bg-muted p-4 rounded-xl border border-border">
               <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Total BNSL Value</p>
               <div className="text-2xl font-bold text-secondary">
                 ${((bnslBalanceGold + lockedBalanceGold) * currentGoldPrice).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
               </div>
               <p className="text-sm text-muted-foreground mt-1">
                 {(bnslBalanceGold + lockedBalanceGold).toFixed(3)} g Total
               </p>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* Transfer Modal */}
      <Dialog open={isTransferModalOpen} onOpenChange={setIsTransferModalOpen}>
        <DialogContent className="bg-white border-border text-foreground sm:max-w-[425px]">
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
                 <span className="text-secondary font-bold">{finaPayBalanceGold.toFixed(3)} g</span>
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
                   className={`flex-1 ${currency === 'Grams' ? 'bg-secondary hover:bg-secondary/90' : ''}`}
                 >
                   Grams (g)
                 </Button>
                 <Button 
                   size="sm" 
                   variant={currency === 'USD' ? 'default' : 'outline'} 
                   onClick={() => setCurrency('USD')}
                   className={`flex-1 ${currency === 'USD' ? 'bg-secondary hover:bg-secondary/90' : ''}`}
                 >
                   USD ($)
                 </Button>
               </div>
               <div className="relative">
                 <Input 
                   type="number" 
                   placeholder="0.00" 
                   className="bg-background border-input pl-4 pr-20 text-lg text-foreground"
                   value={transferAmount}
                   onChange={(e) => setTransferAmount(e.target.value)}
                 />
                 <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                   <span className="text-muted-foreground text-sm font-bold">{currency === 'Grams' ? 'g' : '$'}</span>
                   <Button 
                     size="sm" 
                     variant="ghost" 
                     className="h-7 px-2 text-xs font-bold text-secondary hover:text-secondary/80 hover:bg-secondary/10"
                     onClick={() => setTransferAmount(getMaxAmount())}
                   >
                     MAX
                   </Button>
                 </div>
               </div>
               <p className="text-xs text-muted-foreground mt-1">
                 {currency === 'Grams' && transferAmount && !isNaN(parseFloat(transferAmount)) && (
                   <>≈ ${(parseFloat(transferAmount) * currentGoldPrice).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</>
                 )}
                 {currency === 'USD' && transferAmount && !isNaN(parseFloat(transferAmount)) && (
                   <>≈ {(parseFloat(transferAmount) / currentGoldPrice).toFixed(3)} g</>
                 )}
               </p>
             </div>

             <Button 
               className="w-full bg-secondary text-white hover:bg-secondary/90 font-bold"
               onClick={handleTransfer}
             >
               Confirm Transfer
             </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
