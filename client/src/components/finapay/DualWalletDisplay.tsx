import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Wallet, Lock, TrendingUp, ArrowRightLeft, BarChart3, Layers, AlertTriangle, ShieldCheck, Info, Unlock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useDualWalletBalance, useInternalTransfer, useFpgwLocks } from '@/hooks/useDualWallet';
import GoldBackedDisclosure from '@/components/common/GoldBackedDisclosure';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export interface DualWalletDisplayHandle {
  openLockDialog: () => void;
  openUnlockDialog: () => void;
}

interface DualWalletDisplayProps {
  userId: string;
  onTransferFromVault?: () => void;
  initialDirection?: 'LGPW_to_FGPW' | 'FGPW_to_LGPW';
  openOnMount?: boolean;
}

const DualWalletDisplay = forwardRef<DualWalletDisplayHandle, DualWalletDisplayProps>(
  function DualWalletDisplay({ userId, onTransferFromVault, initialDirection, openOnMount }, ref) {
  const { data: balance, isLoading, error } = useDualWalletBalance(userId);
  const { data: locksData } = useFpgwLocks(userId);
  const internalTransfer = useInternalTransfer();
  const { toast } = useToast();
  const activeLocks = locksData?.locks ?? [];
  
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDirection, setTransferDirection] = useState<'LGPW_to_FGPW' | 'FGPW_to_LGPW'>(initialDirection || 'LGPW_to_FGPW');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  useImperativeHandle(ref, () => ({
    openLockDialog: () => {
      setTransferDirection('LGPW_to_FGPW');
      setTransferAmount('');
      setAgreedToTerms(false);
      setShowTransferModal(true);
    },
    openUnlockDialog: () => {
      setTransferDirection('FGPW_to_LGPW');
      setTransferAmount('');
      setAgreedToTerms(false);
      setShowTransferModal(true);
    }
  }));

  useEffect(() => {
    if (openOnMount) {
      setShowTransferModal(true);
    }
  }, [openOnMount]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-border p-6 shadow-sm flex items-center justify-center min-h-[200px]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (error || !balance) {
    return (
      <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
        <div className="flex items-center gap-2 text-amber-600">
          <AlertTriangle className="w-5 h-5" />
          <span>Unable to load dual wallet balance</span>
        </div>
      </div>
    );
  }

  const handleTransfer = async () => {
    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid gold amount greater than 0',
        variant: 'destructive'
      });
      return;
    }

    const fromType = transferDirection === 'LGPW_to_FGPW' ? 'LGPW' : 'FGPW';
    const toType = transferDirection === 'LGPW_to_FGPW' ? 'FGPW' : 'LGPW';

    try {
      await internalTransfer.mutateAsync({
        userId,
        goldGrams: amount,
        fromWalletType: fromType,
        toWalletType: toType
      });

      const actionLabel = transferDirection === 'LGPW_to_FGPW'
        ? `Locked ${amount.toFixed(6)}g at $${balance.goldPricePerGram.toFixed(2)}/g (MPGW → FPGW)`
        : `Unlocked ${amount.toFixed(6)}g back to market price (FPGW → MPGW)`;

      toast({
        title: transferDirection === 'LGPW_to_FGPW' ? 'Gold Price Locked' : 'Gold Price Unlocked',
        description: actionLabel,
      });
      setShowTransferModal(false);
      setTransferAmount('');
      setAgreedToTerms(false);
    } catch (err: any) {
      toast({
        title: transferDirection === 'LGPW_to_FGPW' ? 'Lock Failed' : 'Unlock Failed',
        description: err.message || 'Failed to complete operation',
        variant: 'destructive'
      });
    }
  };

  const maxTransferAmount = transferDirection === 'LGPW_to_FGPW' 
    ? balance.mpgw.availableGrams 
    : balance.fpgw.availableGrams;

  const isLocking = transferDirection === 'LGPW_to_FGPW';

  return (
    <TooltipProvider>
    <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Layers className="w-5 h-5 text-fuchsia-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground" data-testid="dual-wallet-title">Gold Wallet Breakdown</h2>
            <p className="text-xs text-muted-foreground">MPGW (Market Price) & FPGW (Fixed/Locked Price)</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            size="sm" 
            variant="outline"
            className="text-xs sm:text-sm border-amber-300 text-amber-700 hover:bg-amber-50"
            onClick={() => { setTransferDirection('LGPW_to_FGPW'); setTransferAmount(''); setAgreedToTerms(false); setShowTransferModal(true); }}
            data-testid="btn-lock-gold-price"
          >
            <Lock className="w-4 h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Lock Gold Price</span>
            <span className="sm:hidden">Lock</span>
          </Button>
          {balance.fpgw.availableGrams > 0.000001 && (
            <Button 
              size="sm" 
              variant="outline"
              className="text-xs sm:text-sm border-purple-300 text-purple-700 hover:bg-purple-50"
              onClick={() => { setTransferDirection('FGPW_to_LGPW'); setTransferAmount(''); setAgreedToTerms(false); setShowTransferModal(true); }}
              data-testid="btn-unlock-gold-price"
            >
              <Unlock className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Unlock to Market Price</span>
              <span className="sm:hidden">Unlock</span>
            </Button>
          )}
          {onTransferFromVault && (
            <Button 
              size="sm" 
              className="bg-purple-500 hover:bg-fuchsia-600 text-white text-xs sm:text-sm" 
              onClick={onTransferFromVault}
              data-testid="btn-transfer-vault"
            >
              <span className="hidden sm:inline">Transfer from FinaVault</span>
              <span className="sm:hidden">From Vault</span>
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* MPGW - Market Price Gold Wallet */}
        <div className="p-5 rounded-xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-amber-800">MPGW</h3>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-amber-500 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm font-semibold mb-1">Market Price Gold Wallet (MPGW)</p>
                <p className="text-xs">Your gold is valued at the live market price. If gold prices rise, your USD value rises. If gold prices fall, your USD value falls. This is the standard gold wallet.</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="text-xs text-amber-700 mb-1 font-medium">Market Price Gold Wallet</p>
          <p className="text-xs text-amber-600 mb-4">USD value fluctuates with the live gold market price</p>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Available</span>
              <div className="text-right">
                <span className="text-xl font-bold text-amber-600" data-testid="mpgw-available">
                  {balance.mpgw.availableGrams.toFixed(4)} g
                </span>
                <p className="text-xs text-muted-foreground">
                  ≈ ${(balance.mpgw.availableGrams * balance.goldPricePerGram).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} at ${balance.goldPricePerGram.toFixed(2)}/g
                </p>
              </div>
            </div>
            
            {balance.mpgw.lockedBnslGrams > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Lock className="w-3 h-3" /> BNSL Locked
                </span>
                <span className="text-sm font-semibold text-purple-600" data-testid="mpgw-locked-bnsl">
                  {balance.mpgw.lockedBnslGrams.toFixed(4)} g
                </span>
              </div>
            )}
            
            {balance.mpgw.reservedTradeGrams > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Trade Reserved
                </span>
                <span className="text-sm font-semibold text-blue-600" data-testid="mpgw-reserved">
                  {balance.mpgw.reservedTradeGrams.toFixed(4)} g
                </span>
              </div>
            )}
            
            <div className="pt-2 border-t border-amber-200">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-amber-800">Total MPGW</span>
                <div className="text-right">
                  <span className="text-lg font-bold text-amber-700" data-testid="mpgw-total">
                    {balance.mpgw.totalGrams.toFixed(4)} g
                  </span>
                  <p className="text-xs text-muted-foreground">
                    ≈ ${balance.mpgwValueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FPGW - Fixed Price Gold Wallet */}
        <div className="p-5 rounded-xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5 text-purple-600" />
            <h3 className="font-bold text-purple-800">FPGW</h3>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-purple-500 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm font-semibold mb-1">Fixed Price Gold Wallet (FPGW)</p>
                <p className="text-xs">Your gold USD value is locked at the price when you converted it. Even if the gold market price drops, your locked USD value stays the same. This protects you from short-term gold price drops.</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="text-xs text-purple-700 mb-1 font-medium">Fixed Price Gold Wallet</p>
          <p className="text-xs text-purple-600 mb-4">
            USD value is locked at the price when you chose to lock. You get the same grams back on unlock.
          </p>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Available (locked)</span>
              <div className="text-right">
                <span className="text-xl font-bold text-purple-600" data-testid="fpgw-available">
                  {balance.fpgw.availableGrams.toFixed(4)} g
                </span>
                <p className="text-xs text-muted-foreground">
                  ≈ ${(balance.fpgw.availableGrams * (balance.fpgw.weightedAvgPrice || balance.goldPricePerGram)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (locked value)
                </p>
              </div>
            </div>

            {activeLocks.length > 0 && (
              <div className="mt-2 space-y-1.5">
                <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Active Locks</p>
                {activeLocks.map((lock) => (
                  <div key={lock.id} className="flex justify-between items-center bg-purple-50 px-2.5 py-1.5 rounded-lg border border-purple-100" data-testid={`lock-row-${lock.id}`}>
                    <div>
                      <span className="text-sm font-semibold text-purple-800">{lock.goldGrams.toFixed(4)} g</span>
                      <span className="text-xs text-purple-600 ml-1">@ ${lock.lockedPriceUsd.toFixed(2)}/g</span>
                    </div>
                    <span className="text-xs font-semibold text-purple-700">${lock.lockedValueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                ))}
              </div>
            )}
            
            {balance.fpgw.lockedBnslGrams > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Lock className="w-3 h-3" /> BNSL Locked
                </span>
                <span className="text-sm font-semibold text-purple-600" data-testid="fpgw-locked-bnsl">
                  {balance.fpgw.lockedBnslGrams.toFixed(4)} g
                </span>
              </div>
            )}
            
            {balance.fpgw.reservedTradeGrams > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Trade Reserved
                </span>
                <span className="text-sm font-semibold text-blue-600" data-testid="fpgw-reserved">
                  {balance.fpgw.reservedTradeGrams.toFixed(4)} g
                </span>
              </div>
            )}
            
            <div className="pt-2 border-t border-purple-200">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-purple-800">Total FPGW</span>
                <div className="text-right">
                  <span className="text-lg font-bold text-purple-700" data-testid="fpgw-total">
                    {balance.fpgw.totalGrams.toFixed(4)} g
                  </span>
                  <p className="text-xs text-muted-foreground">
                    ≈ ${balance.fpgwValueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (at locked price)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-gradient-to-r from-amber-100 via-yellow-50 to-purple-100 border border-amber-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wallet className="w-6 h-6 text-amber-600" />
            <div>
              <p className="text-xs font-semibold text-amber-800 uppercase">Total Gold Portfolio</p>
              <p className="text-2xl font-bold text-amber-700" data-testid="total-gold">
                {balance.total.totalGrams.toFixed(4)} g
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Combined Value</p>
            <p className="text-xl font-bold text-foreground" data-testid="total-value-usd">
              ≈ ${balance.totalValueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>
      
      <GoldBackedDisclosure className="mt-4" />

      <Dialog open={showTransferModal} onOpenChange={(open) => { setShowTransferModal(open); if (!open) { setAgreedToTerms(false); setTransferAmount(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isLocking ? 'Lock Gold at Current Price (MPGW → FPGW)' : 'Unlock Gold to Market Price (FPGW → MPGW)'}
            </DialogTitle>
            <DialogDescription>
              {isLocking
                ? 'Move gold from your Market Price Wallet (MPGW) into a Fixed Price Wallet (FPGW) to lock the USD value at today\'s price.'
                : 'Move gold from your Fixed Price Wallet (FPGW) back to your Market Price Wallet (MPGW). Your gold will be valued at the live market price again.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-5 py-4">
            <div className="space-y-3">
              <Label>Operation</Label>
              <RadioGroup 
                value={transferDirection} 
                onValueChange={(v) => { setTransferDirection(v as 'LGPW_to_FGPW' | 'FGPW_to_LGPW'); setTransferAmount(''); }}
              >
                <div className={`flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-colors ${transferDirection === 'LGPW_to_FGPW' ? 'border-amber-400 bg-amber-50' : 'hover:bg-amber-50'}`}>
                  <RadioGroupItem value="LGPW_to_FGPW" id="mpgw-to-fpgw" />
                  <Label htmlFor="mpgw-to-fpgw" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-amber-700">MPGW</span>
                      <span className="mx-1 text-muted-foreground">→</span>
                      <span className="font-semibold text-purple-700">FPGW</span>
                      <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Lock Price</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Lock your gold's USD value at the current market price: <strong>${balance.goldPricePerGram.toFixed(2)}/g</strong>
                    </p>
                    <p className="text-xs text-muted-foreground">Available MPGW: {balance.mpgw.availableGrams.toFixed(4)} g</p>
                  </Label>
                </div>
                <div className={`flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-colors ${transferDirection === 'FGPW_to_LGPW' ? 'border-purple-400 bg-purple-50' : 'hover:bg-purple-50'} ${balance.fpgw.availableGrams <= 0.000001 ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <RadioGroupItem value="FGPW_to_LGPW" id="fpgw-to-mpgw" disabled={balance.fpgw.availableGrams <= 0.000001} />
                  <Label htmlFor="fpgw-to-mpgw" className={`flex-1 ${balance.fpgw.availableGrams <= 0.000001 ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-purple-700">FPGW</span>
                      <span className="mx-1 text-muted-foreground">→</span>
                      <span className="font-semibold text-amber-700">MPGW</span>
                      <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">Unlock Price</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Return gold to market price valuation. You receive the same gram count back.
                    </p>
                    <p className="text-xs text-muted-foreground">Available FPGW: {balance.fpgw.availableGrams.toFixed(4)} g</p>
                  </Label>
                </div>
              </RadioGroup>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Gold Amount (grams)</Label>
                <span className="text-xs text-muted-foreground">
                  Max: {maxTransferAmount.toFixed(6)} g
                </span>
              </div>
              <Input
                type="number"
                step="0.000001"
                min="0"
                max={maxTransferAmount}
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                placeholder="Enter gold amount in grams"
                data-testid="input-transfer-amount"
              />
              <Button 
                variant="link" 
                className="text-xs p-0 h-auto"
                onClick={() => setTransferAmount(maxTransferAmount.toFixed(6))}
                data-testid="btn-use-max-amount"
              >
                Use Max Amount
              </Button>
            </div>

            {isLocking && transferAmount && parseFloat(transferAmount) > 0 && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
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
              <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-orange-800 mb-1">Unlock Warning</p>
                    <p className="text-sm text-orange-700">
                      After unlocking, <strong>{parseFloat(transferAmount).toFixed(6)} g</strong> will be valued at the live market price again.
                    </p>
                    {balance.fpgw.weightedAvgPrice > 0 && (
                      <p className="text-xs text-orange-600 mt-1">
                        Your locked price was ${balance.fpgw.weightedAvgPrice.toFixed(2)}/g. Current market price is ${balance.goldPricePerGram.toFixed(2)}/g.
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
              <Checkbox 
                id="transfer-terms" 
                checked={agreedToTerms}
                onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                data-testid="checkbox-transfer-terms"
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="transfer-terms"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
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
            <Button variant="outline" onClick={() => setShowTransferModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleTransfer}
              disabled={internalTransfer.isPending || !transferAmount || parseFloat(transferAmount) <= 0 || parseFloat(transferAmount) > maxTransferAmount || !agreedToTerms}
              className={isLocking ? 'bg-amber-600 hover:bg-amber-700' : 'bg-purple-600 hover:bg-purple-700'}
              data-testid="btn-confirm-transfer"
            >
              {internalTransfer.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : isLocking ? (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Lock Gold Price
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4 mr-2" />
                  Unlock to Market Price
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </TooltipProvider>
  );
});

export default DualWalletDisplay;
