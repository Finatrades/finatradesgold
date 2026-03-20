import { useState } from 'react';
import { Lock, Unlock, AlertTriangle, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
  const [transferDirection, setTransferDirection] = useState<'LGPW_to_FGPW' | 'FGPW_to_LGPW'>('LGPW_to_FGPW');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const handleClose = () => {
    setTransferAmount('');
    setTransferDirection('LGPW_to_FGPW');
    setAgreedToTerms(false);
    onClose();
  };

  if (!balance) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="bg-white border-border text-foreground w-[95vw] max-w-md">
          <div className="flex items-center justify-center py-10">
            {isLoading ? <Loader2 className="w-8 h-8 animate-spin text-purple-500" /> : <p className="text-muted-foreground">Unable to load wallet data</p>}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const isLocking = transferDirection === 'LGPW_to_FGPW';
  const maxTransferAmount = isLocking ? balance.mpgw.availableGrams : balance.fpgw.availableGrams;

  const handleTransfer = async () => {
    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: 'Invalid Amount', description: 'Please enter a valid gold amount greater than 0', variant: 'destructive' });
      return;
    }

    const fromType = isLocking ? 'LGPW' : 'FGPW';
    const toType = isLocking ? 'FGPW' : 'LGPW';

    try {
      await internalTransfer.mutateAsync({ userId, goldGrams: amount, fromWalletType: fromType, toWalletType: toType });
      const actionLabel = isLocking
        ? `Locked ${amount.toFixed(6)}g at $${balance.goldPricePerGram.toFixed(2)}/g (MPGW → FPGW)`
        : `Unlocked ${amount.toFixed(6)}g back to market price (FPGW → MPGW)`;
      toast({ title: isLocking ? 'Gold Price Locked' : 'Gold Price Unlocked', description: actionLabel });
      handleClose();
    } catch (err: any) {
      toast({ title: isLocking ? 'Lock Failed' : 'Unlock Failed', description: err.message || 'Failed to complete operation', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="bg-white border-border text-foreground w-[95vw] max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isLocking ? <Lock className="w-5 h-5 text-amber-600" /> : <Unlock className="w-5 h-5 text-purple-600" />}
            {isLocking ? 'Lock Gold at Current Price' : 'Unlock Gold to Market Price'}
          </DialogTitle>
          <DialogDescription>
            {isLocking
              ? 'Move gold from your Market Price Wallet (MPGW) into a Fixed Price Wallet (FPGW) to lock the USD value at today\'s price.'
              : 'Move gold from your Fixed Price Wallet (FPGW) back to your Market Price Wallet (MPGW). Your gold will be valued at the live market price again.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Operation</Label>
            <RadioGroup value={transferDirection} onValueChange={(v) => { setTransferDirection(v as 'LGPW_to_FGPW' | 'FGPW_to_LGPW'); setTransferAmount(''); }}>
              <div className={`flex items-center space-x-2 p-3 rounded-xl border cursor-pointer transition-colors ${transferDirection === 'LGPW_to_FGPW' ? 'border-amber-400 bg-amber-50' : 'hover:bg-amber-50/50'}`}>
                <RadioGroupItem value="LGPW_to_FGPW" id="dash-mpgw-to-fpgw" />
                <Label htmlFor="dash-mpgw-to-fpgw" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-amber-700">MPGW</span>
                    <span className="mx-1 text-muted-foreground">→</span>
                    <span className="font-semibold text-purple-700">FPGW</span>
                    <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-lg">Lock Price</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Lock at current price: <strong>${balance.goldPricePerGram.toFixed(2)}/g</strong>
                  </p>
                  <p className="text-xs text-muted-foreground">Available: {balance.mpgw.availableGrams.toFixed(4)} g</p>
                </Label>
              </div>
              <div className={`flex items-center space-x-2 p-3 rounded-xl border cursor-pointer transition-colors ${transferDirection === 'FGPW_to_LGPW' ? 'border-purple-400 bg-purple-50' : 'hover:bg-purple-50/50'} ${balance.fpgw.availableGrams <= 0.000001 ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <RadioGroupItem value="FGPW_to_LGPW" id="dash-fpgw-to-mpgw" disabled={balance.fpgw.availableGrams <= 0.000001} />
                <Label htmlFor="dash-fpgw-to-mpgw" className={`flex-1 ${balance.fpgw.availableGrams <= 0.000001 ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-purple-700">FPGW</span>
                    <span className="mx-1 text-muted-foreground">→</span>
                    <span className="font-semibold text-amber-700">MPGW</span>
                    <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-lg">Unlock</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Return gold to market price valuation. You receive the same gram count back.</p>
                  <p className="text-xs text-muted-foreground">Available: {balance.fpgw.availableGrams.toFixed(4)} g</p>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Gold Amount (grams)</Label>
              <span className="text-xs text-muted-foreground">Max: {maxTransferAmount.toFixed(6)} g</span>
            </div>
            <Input
              type="number" step="0.000001" min="0" max={maxTransferAmount}
              value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)}
              placeholder="Enter gold amount in grams"
              data-testid="input-lock-amount"
            />
            <Button variant="link" className="text-xs p-0 h-auto" onClick={() => setTransferAmount(maxTransferAmount.toFixed(6))} data-testid="btn-lock-use-max">
              Use Max Amount
            </Button>
          </div>

          {isLocking && transferAmount && parseFloat(transferAmount) > 0 && (
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

          {!isLocking && transferAmount && parseFloat(transferAmount) > 0 && (
            <div className="p-3 rounded-xl bg-orange-50 border border-orange-200">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-orange-800 mb-1">Unlock Warning</p>
                  <p className="text-sm text-orange-700">
                    After unlocking, <strong>{parseFloat(transferAmount).toFixed(6)} g</strong> will be valued at the live market price.
                  </p>
                  {balance.fpgw.weightedAvgPrice > 0 && (
                    <p className="text-xs text-orange-600 mt-1">
                      Locked price: ${balance.fpgw.weightedAvgPrice.toFixed(2)}/g. Current: ${balance.goldPricePerGram.toFixed(2)}/g.
                      {balance.goldPricePerGram < balance.fpgw.weightedAvgPrice
                        ? ' ⚠ Unlocking now means your USD value may decrease.'
                        : ' Your gold has appreciated since locking.'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-start space-x-2 pt-2 border-t">
            <Checkbox id="dash-lock-terms" checked={agreedToTerms} onCheckedChange={(checked) => setAgreedToTerms(checked === true)} data-testid="checkbox-lock-terms" />
            <div className="grid gap-1.5 leading-none">
              <label htmlFor="dash-lock-terms" className="text-sm font-medium leading-none cursor-pointer">
                I understand and agree
              </label>
              <p className="text-xs text-muted-foreground">
                {isLocking
                  ? 'I understand that by locking, my gold\'s USD value is frozen at the current price and will not benefit from future gold price increases while in FPGW.'
                  : 'I understand that by unlocking, my gold will be valued at the live market price and the locked USD protection will be removed.'}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button
            onClick={handleTransfer}
            disabled={internalTransfer.isPending || !transferAmount || parseFloat(transferAmount) <= 0 || parseFloat(transferAmount) > maxTransferAmount || !agreedToTerms}
            className={isLocking ? 'bg-amber-600 hover:bg-amber-700' : 'bg-purple-600 hover:bg-purple-700'}
            data-testid="btn-confirm-lock"
          >
            {internalTransfer.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
            ) : isLocking ? (
              <><Lock className="w-4 h-4 mr-2" /> Lock Gold Price</>
            ) : (
              <><Unlock className="w-4 h-4 mr-2" /> Unlock to Market Price</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
