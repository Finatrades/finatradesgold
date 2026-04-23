import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Wallet, Lock, AlertTriangle, ShieldCheck, ShieldOff, Info, Unlock, ChevronDown, ChevronUp, Clock, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useDualWalletBalance, useInternalTransfer, useFpgwLocks } from '@/hooks/useDualWallet';
import GoldBackedDisclosure from '@/components/common/GoldBackedDisclosure';
import { PriceProtectionBatches } from '@/components/finapay/PriceProtectionBatches';
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
  const [transferDirection] = useState<'LGPW_to_FGPW' | 'FGPW_to_LGPW'>(initialDirection || 'LGPW_to_FGPW');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [removeConfirm, setRemoveConfirm] = useState<{ id: string; goldGrams: number; lockedPriceUsd: number } | null>(null);

  useImperativeHandle(ref, () => ({
    openLockDialog: () => {
      setTransferAmount('');
      setAgreedToTerms(false);
      setShowTransferModal(true);
    },
    openUnlockDialog: () => {
      toast({
        title: 'How to Unlock',
        description: 'Tap the "Remove Protection" button next to each active price protection lock below.',
      });
    }
  }));

  useEffect(() => {
    if (openOnMount) {
      setShowTransferModal(true);
    }
  }, [openOnMount]);

  if (isLoading) {
    return (
      <div className="bg-card rounded-2xl border border-border p-6 shadow-sm flex items-center justify-center min-h-[200px]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (error || !balance) {
    return (
      <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
          <AlertTriangle className="w-5 h-5" />
          <span>Unable to load wallet balance</span>
        </div>
      </div>
    );
  }

  const handleUnlockLock = async (lockId: string, goldGrams: number) => {
    try {
      await internalTransfer.mutateAsync({
        userId,
        goldGrams,
        fromWalletType: 'FGPW',
        toWalletType: 'LGPW',
        lockId
      });
      toast({
        title: 'Price Protection Removed',
        description: `${goldGrams.toFixed(4)}g returned to live market price.`
      });
    } catch (err: any) {
      toast({
        title: 'Unlock Failed',
        description: err.message || 'Failed to remove this price protection lock',
        variant: 'destructive'
      });
    }
  };

  const handleLockGold = async () => {
    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: 'Invalid Amount', description: 'Please enter a valid gold amount greater than 0', variant: 'destructive' });
      return;
    }

    try {
      await internalTransfer.mutateAsync({
        userId,
        goldGrams: amount,
        fromWalletType: 'LGPW',
        toWalletType: 'FGPW',
      });
      toast({
        title: 'Price Protection Activated',
        description: `${amount.toFixed(6)}g locked at $${balance.goldPricePerGram.toFixed(2)}/g.`,
      });
      setShowTransferModal(false);
      setTransferAmount('');
      setAgreedToTerms(false);
    } catch (err: any) {
      toast({
        title: 'Price Lock Failed',
        description: err.message || 'Failed to complete operation',
        variant: 'destructive'
      });
    }
  };

  const totalGrams = balance.total.totalGrams;
  const lgpwGrams = balance.mpgw.totalGrams;
  const fpgwGrams = balance.fpgw.totalGrams;
  const lgpwPct = totalGrams > 0 ? (lgpwGrams / totalGrams) * 100 : 100;
  const fpgwPct = totalGrams > 0 ? (fpgwGrams / totalGrams) * 100 : 0;

  const pendingGrams = balance.mpgw.pendingGrams + balance.fpgw.pendingGrams;
  const hasBnslLocked = (balance.mpgw.lockedBnslGrams + balance.fpgw.lockedBnslGrams) > 0;
  const hasTradeLocked = (balance.mpgw.reservedTradeGrams + balance.fpgw.reservedTradeGrams) > 0;
  const totalBnsl = balance.mpgw.lockedBnslGrams + balance.fpgw.lockedBnslGrams;
  const totalTrade = balance.mpgw.reservedTradeGrams + balance.fpgw.reservedTradeGrams;

  const availableToUse = balance.total.availableGrams ?? (totalGrams - totalBnsl - totalTrade - pendingGrams);

  return (
    <TooltipProvider>
    <div className="space-y-4">
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden" data-testid="dual-wallet-card">

      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-border/60">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <Wallet className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground" data-testid="dual-wallet-title">Gold Wallet</h2>
              <p className="text-xs text-muted-foreground">One pool of gold, two protection modes</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-xs border-indigo-300 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:bg-indigo-950/20"
              onClick={() => { setTransferAmount(''); setAgreedToTerms(false); setShowTransferModal(true); }}
              data-testid="btn-lock-gold-price"
            >
              <ShieldCheck className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Activate Price Protection</span>
              <span className="sm:hidden">Lock Price</span>
            </Button>
            {onTransferFromVault && (
              <Button
                size="sm"
                className="bg-purple-50 dark:bg-purple-950/200 hover:bg-fuchsia-600 text-white text-xs sm:text-sm"
                onClick={onTransferFromVault}
                data-testid="btn-transfer-vault"
              >
                <span className="hidden sm:inline">Transfer from FinaVault</span>
                <span className="sm:hidden">From Vault</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Unified Total Balance */}
      <div className="px-6 py-5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Your Gold</p>
        <div className="flex items-end gap-4 flex-wrap">
          <p className="text-4xl font-bold text-foreground" data-testid="total-gold">
            {totalGrams.toFixed(4)}<span className="text-xl ml-1 font-semibold">g</span>
          </p>
          <div className="pb-1">
            <p className="text-lg font-semibold text-foreground" data-testid="total-value-usd">
              ≈ ${balance.totalValueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground">at ${balance.goldPricePerGram.toFixed(2)}/g live price</p>
          </div>
        </div>

        {/* Pending Gold Line */}
        {pendingGrams > 0 && (
          <div className="mt-3 flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm" data-testid="pending-gold-line">
            <Clock className="w-4 h-4 shrink-0" />
            <span className="font-medium">{pendingGrams.toFixed(4)}g awaiting verification</span>
            <a href="/finapay?section=deposits" className="text-xs underline text-amber-500 flex items-center gap-0.5">
              View <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {/* Proportional Split Bar */}
        {totalGrams > 0 && (
          <div className="mt-4 space-y-2">
            <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
              {lgpwPct > 0.5 && (
                <div
                  className="bg-amber-400 rounded-l-full transition-all duration-500"
                  style={{ width: `${lgpwPct}%` }}
                  title={`At market price: ${lgpwGrams.toFixed(4)}g`}
                />
              )}
              {fpgwPct > 0.5 && (
                <div
                  className="bg-indigo-400 rounded-r-full transition-all duration-500"
                  style={{ width: `${fpgwPct}%` }}
                  title={`Price protected: ${fpgwGrams.toFixed(4)}g`}
                />
              )}
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                {lgpwGrams.toFixed(4)}g at market price
              </span>
              {fpgwGrams > 0 && (
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 inline-block" />
                  {fpgwGrams.toFixed(4)}g price-protected
                </span>
              )}
            </div>
          </div>
        )}

        {/* Available to use */}
        <div className="mt-4 pt-4 border-t border-border/50">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground" data-testid="available-to-use">
              {availableToUse.toFixed(4)}g available to send/trade
            </span>
            <span className="text-xs text-muted-foreground">
              ≈ ${(availableToUse * balance.goldPricePerGram).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          {(hasBnslLocked || hasTradeLocked) && (
            <p className="text-xs text-muted-foreground mt-1">
              {hasBnslLocked && `${totalBnsl.toFixed(4)}g in BNSL`}
              {hasBnslLocked && hasTradeLocked && ' · '}
              {hasTradeLocked && `${totalTrade.toFixed(4)}g in trades`}
              {' '}excluded
            </p>
          )}
        </div>
      </div>

      {/* Explainer & Disclosure */}
      <div className="px-6 pb-6">
        <div className="p-4 rounded-xl bg-muted/40 border border-border text-xs text-muted-foreground leading-relaxed">
          <p className="font-semibold text-foreground mb-1 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-amber-500" /> How Price Protection Works
          </p>
          <p>
            Your gold is always stored at live market price by default. If you want to freeze the USD value of some gold at today's price,
            activate Price Protection. Even if the gold market price drops, your protected gold's USD value stays the same.
            You can remove protection at any time and get the same grams back at the new live price.
          </p>
        </div>
        <GoldBackedDisclosure className="mt-3" />
      </div>

      {/* Lock Price Dialog */}
      <Dialog open={showTransferModal} onOpenChange={(open) => { setShowTransferModal(open); if (!open) { setAgreedToTerms(false); setTransferAmount(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Activate Price Protection</DialogTitle>
            <DialogDescription>
              Choose how many grams to protect. The current gold price will be locked for those grams — your USD value won't drop even if gold prices fall.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-1">Current Protection Price</p>
              <p className="text-lg font-bold text-amber-800 dark:text-amber-200">${balance.goldPricePerGram.toFixed(2)}/g</p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Available to protect: {balance.mpgw.availableGrams.toFixed(4)} g</p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Gold Amount (grams)</Label>
                <span className="text-xs text-muted-foreground">Max: {balance.mpgw.availableGrams.toFixed(6)} g</span>
              </div>
              <Input
                type="number"
                step="0.000001"
                min="0"
                max={balance.mpgw.availableGrams}
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                placeholder="Enter gold amount in grams"
                data-testid="input-transfer-amount"
              />
              <Button
                variant="link"
                className="text-xs p-0 h-auto"
                onClick={() => setTransferAmount(balance.mpgw.availableGrams.toFixed(6))}
                data-testid="btn-use-max-amount"
              >
                Use Max Amount
              </Button>
            </div>

            {transferAmount && parseFloat(transferAmount) > 0 && (
              <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/40">
                <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-200 mb-1">Protection Summary</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-indigo-600 dark:text-indigo-400">Gold to protect:</span>
                    <span className="font-semibold text-indigo-800 dark:text-indigo-200">{parseFloat(transferAmount).toFixed(6)} g</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-indigo-600 dark:text-indigo-400">Lock price:</span>
                    <span className="font-semibold text-indigo-800 dark:text-indigo-200">${balance.goldPricePerGram.toFixed(2)}/g</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-indigo-200 dark:border-indigo-800/40 pt-1 mt-1">
                    <span className="text-indigo-700 dark:text-indigo-300 font-semibold">Protected USD value:</span>
                    <span className="font-bold text-indigo-800 dark:text-indigo-200">${(parseFloat(transferAmount) * balance.goldPricePerGram).toFixed(2)}</span>
                  </div>
                </div>
                <p className="text-xs text-indigo-500 mt-2">This value will be preserved even if the gold price drops.</p>
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
                <label htmlFor="transfer-terms" className="text-sm font-medium leading-none cursor-pointer">
                  I understand and agree
                </label>
                <p className="text-xs text-muted-foreground">
                  I understand that price-protected gold will not benefit from future gold price increases while protection is active.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransferModal(false)}>Cancel</Button>
            <Button
              onClick={handleLockGold}
              disabled={internalTransfer.isPending || !transferAmount || parseFloat(transferAmount) <= 0 || parseFloat(transferAmount) > balance.mpgw.availableGrams || !agreedToTerms}
              className="bg-indigo-600 hover:bg-indigo-700"
              data-testid="btn-confirm-transfer"
            >
              {internalTransfer.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</>
              ) : (
                <><ShieldCheck className="w-4 h-4 mr-2" />Activate Price Protection</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Protection Confirmation Dialog */}
      <Dialog open={!!removeConfirm} onOpenChange={(open) => { if (!open) setRemoveConfirm(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
              <ShieldOff className="w-5 h-5" />
              Remove Price Protection?
            </DialogTitle>
            <DialogDescription>
              Please review what will happen before confirming.
            </DialogDescription>
          </DialogHeader>

          {removeConfirm && (
            <div className="space-y-4 py-2">
              {/* What changes */}
              <div className="rounded-xl border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-950/20 p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-amber-700 dark:text-amber-300 font-medium">Gold amount</span>
                  <span className="font-bold text-amber-900">{removeConfirm.goldGrams.toFixed(4)} g</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-amber-700 dark:text-amber-300 font-medium">Your locked price</span>
                  <span className="font-bold text-amber-900">${removeConfirm.lockedPriceUsd.toFixed(2)}/g</span>
                </div>
                <div className="flex justify-between text-sm border-t border-amber-200 dark:border-amber-800/40 pt-2">
                  <span className="text-amber-700 dark:text-amber-300 font-medium">Live market price</span>
                  <span className="font-bold text-amber-900">${(balance?.goldPricePerGram ?? 0).toFixed(2)}/g</span>
                </div>
                <div className="flex justify-between text-sm border-t border-amber-200 dark:border-amber-800/40 pt-2">
                  <span className="text-amber-700 dark:text-amber-300 font-semibold">Value after removal</span>
                  <span className="font-bold text-lg text-amber-900">
                    ${(removeConfirm.goldGrams * (balance?.goldPricePerGram ?? 0)).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Warning notice */}
              <div className="rounded-xl border border-orange-200 dark:border-orange-800/40 bg-orange-50 dark:bg-orange-950/20 p-3 flex gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                <p className="text-xs text-orange-700 dark:text-orange-300 leading-relaxed">
                  Once removed, your <span className="font-semibold">{removeConfirm.goldGrams.toFixed(4)} g</span> will
                  be moved back to your <span className="font-semibold">at-market-price</span> balance and valued at the
                  current live market rate of <span className="font-semibold">${(balance?.goldPricePerGram ?? 0).toFixed(2)}/g</span>.
                  The original locked price of <span className="font-semibold">${removeConfirm.lockedPriceUsd.toFixed(2)}/g</span> will
                  no longer apply. This action cannot be undone.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setRemoveConfirm(null)}
              data-testid="btn-cancel-remove-protection"
            >
              Keep Protection
            </Button>
            <Button
              variant="destructive"
              className="bg-amber-600 hover:bg-amber-700 text-white"
              disabled={internalTransfer.isPending}
              onClick={async () => {
                if (!removeConfirm) return;
                await handleUnlockLock(removeConfirm.id, removeConfirm.goldGrams);
                setRemoveConfirm(null);
              }}
              data-testid="btn-confirm-remove-protection"
            >
              {internalTransfer.isPending ? (
                <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Processing…</>
              ) : (
                <><ShieldOff className="w-4 h-4 mr-1" /> Confirm Remove</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>

    {/* Price Protection Section — delegated to PriceProtectionBatches component */}
    <PriceProtectionBatches
      activeLocks={activeLocks}
      balance={balance}
      fpgwGrams={fpgwGrams}
      isTransferPending={internalTransfer.isPending}
      onRemoveLock={(lock) => setRemoveConfirm(lock)}
    />
    </div>
    </TooltipProvider>
  );
});

export default DualWalletDisplay;
