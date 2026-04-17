import { useState } from 'react';
import { Lock, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useDualWalletBalance, useInternalTransfer } from '@/hooks/useDualWallet';
import { useToast } from '@/hooks/use-toast';

interface LockGoldPriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export default function LockGoldPriceModal({ isOpen, onClose, userId }: LockGoldPriceModalProps) {
  const { data: balance, isLoading } = useDualWalletBalance(userId);
  const internalTransfer = useInternalTransfer();
  const { toast } = useToast();

  const [transferAmount, setTransferAmount] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const handleClose = () => {
    setTransferAmount('');
    setAgreedToTerms(false);
    onClose();
  };

  if (!balance) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="bg-card border-border text-foreground w-[95vw] max-w-md">
          <div className="flex items-center justify-center py-10">
            {isLoading ? <Loader2 className="w-8 h-8 animate-spin text-purple-500" /> : <p className="text-muted-foreground">Unable to load wallet data</p>}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const maxLockAmount = balance.mpgw.availableGrams;

  const handleLock = async () => {
    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: 'Invalid Amount', description: 'Please enter a valid gold amount greater than 0', variant: 'destructive' });
      return;
    }

    try {
      await internalTransfer.mutateAsync({ userId, goldGrams: amount, fromWalletType: 'LGPW', toWalletType: 'FGPW' });
      toast({ title: 'Gold Price Locked', description: `Locked ${amount.toFixed(4)}g at $${balance.goldPricePerGram.toFixed(2)}/g (LGPW → FPGW)` });
      handleClose();
    } catch (err: any) {
      toast({ title: 'Lock Failed', description: err.message || 'Failed to lock gold price', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="bg-card border-border text-foreground w-[95vw] max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-amber-600" />
            Lock Gold at Current Price
          </DialogTitle>
          <DialogDescription>
            Move gold from your Live Gold Price Wallet (LGPW) into a Fixed Price Wallet (FPGW) to lock the USD value at today's price. To unlock, use the Unlock button next to each active lock in the FPGW section.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-amber-700">LGPW</span>
              <span className="mx-1 text-muted-foreground">→</span>
              <span className="font-semibold text-purple-700">FPGW</span>
              <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-lg">Lock Price</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Lock at current price: <strong>${balance.goldPricePerGram.toFixed(2)}/g</strong>
            </p>
            <p className="text-xs text-muted-foreground">Available LGPW: {maxLockAmount.toFixed(4)} g</p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Gold Amount (grams)</Label>
              <span className="text-xs text-muted-foreground">Max: {maxLockAmount.toFixed(6)} g</span>
            </div>
            <Input
              type="number" step="0.000001" min="0" max={maxLockAmount}
              value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)}
              placeholder="Enter gold amount in grams"
              data-testid="input-lock-amount"
            />
            <Button variant="link" className="text-xs p-0 h-auto" onClick={() => setTransferAmount(maxLockAmount.toFixed(6))} data-testid="btn-lock-use-max">
              Use Max Amount
            </Button>
          </div>

          {transferAmount && parseFloat(transferAmount) > 0 && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
              <p className="text-sm font-semibold text-amber-800 mb-1">Price Lock Summary</p>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-amber-700">Gold to lock:</span>
                  <span className="font-semibold text-amber-800">{parseFloat(transferAmount).toFixed(6)} g</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-amber-700">Lock price:</span>
                  <span className="font-semibold text-amber-800">${balance.goldPricePerGram.toFixed(2)}/g</span>
                </div>
                <div className="flex justify-between text-sm border-t border-amber-200 pt-1 mt-1">
                  <span className="text-amber-700 font-semibold">Locked USD value:</span>
                  <span className="font-bold text-amber-800">${(parseFloat(transferAmount) * balance.goldPricePerGram).toFixed(2)}</span>
                </div>
              </div>
              <p className="text-xs text-amber-600 mt-2">This USD value will be preserved regardless of future gold price movements.</p>
            </div>
          )}

          <div className="flex items-start space-x-2 pt-2 border-t">
            <Checkbox id="dash-lock-terms" checked={agreedToTerms} onCheckedChange={(checked) => setAgreedToTerms(checked === true)} data-testid="checkbox-lock-terms" />
            <div className="grid gap-1.5 leading-none">
              <label htmlFor="dash-lock-terms" className="text-sm font-medium leading-none cursor-pointer">
                I understand and agree
              </label>
              <p className="text-xs text-muted-foreground">
                I understand that by locking, my gold's USD value is frozen at the current price and will not benefit from future gold price increases while in FPGW.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button
            onClick={handleLock}
            disabled={internalTransfer.isPending || !transferAmount || parseFloat(transferAmount) <= 0 || parseFloat(transferAmount) > maxLockAmount || !agreedToTerms}
            className="bg-amber-600 hover:bg-amber-700"
            data-testid="btn-confirm-lock"
          >
            {internalTransfer.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
            ) : (
              <><Lock className="w-4 h-4 mr-2" /> Lock Gold Price</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
