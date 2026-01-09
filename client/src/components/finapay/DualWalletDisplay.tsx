import React, { useState } from 'react';
import { Wallet, Lock, TrendingUp, ArrowRightLeft, BarChart3, Layers, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useDualWalletBalance, useInternalTransfer } from '@/hooks/useDualWallet';
import GoldBackedDisclosure from '@/components/common/GoldBackedDisclosure';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface DualWalletDisplayProps {
  userId: string;
  onTransferFromVault?: () => void;
}

export default function DualWalletDisplay({ userId, onTransferFromVault }: DualWalletDisplayProps) {
  const { data: balance, isLoading, error } = useDualWalletBalance(userId);
  const internalTransfer = useInternalTransfer();
  const { toast } = useToast();
  
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDirection, setTransferDirection] = useState<'MPGW_to_FPGW' | 'FPGW_to_MPGW'>('MPGW_to_FPGW');

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

    const fromType = transferDirection === 'MPGW_to_FPGW' ? 'MPGW' : 'FPGW';
    const toType = transferDirection === 'MPGW_to_FPGW' ? 'FPGW' : 'MPGW';

    try {
      await internalTransfer.mutateAsync({
        userId,
        goldGrams: amount,
        fromWalletType: fromType,
        toWalletType: toType
      });

      toast({
        title: 'Transfer Successful',
        description: `Transferred ${amount.toFixed(6)}g from ${fromType} to ${toType}`,
      });
      setShowTransferModal(false);
      setTransferAmount('');
    } catch (err: any) {
      toast({
        title: 'Transfer Failed',
        description: err.message || 'Failed to complete transfer',
        variant: 'destructive'
      });
    }
  };

  const maxTransferAmount = transferDirection === 'MPGW_to_FPGW' 
    ? balance.mpgw.availableGrams 
    : balance.fpgw.availableGrams;

  return (
    <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Layers className="w-5 h-5 text-fuchsia-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground" data-testid="dual-wallet-title">Dual Gold Wallet</h2>
            <p className="text-xs text-muted-foreground">MPGW (Market Price) & FPGW (Fixed Price)</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => setShowTransferModal(true)}
            data-testid="btn-transfer-wallets"
            className="text-xs sm:text-sm"
          >
            <ArrowRightLeft className="w-4 h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Transfer Between Wallets</span>
            <span className="sm:hidden">Transfer</span>
          </Button>
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
        <div className="p-5 rounded-xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-amber-800">MPGW - Market Price Gold</h3>
          </div>
          <p className="text-xs text-amber-700 mb-4">Value fluctuates with live gold market price</p>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Available</span>
              <div className="text-right">
                <span className="text-xl font-bold text-amber-600" data-testid="mpgw-available">
                  {balance.mpgw.availableGrams.toFixed(4)} g
                </span>
                <p className="text-xs text-muted-foreground">
                  ≈ ${(balance.mpgw.availableGrams * balance.goldPricePerGram).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

        <div className="p-5 rounded-xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-purple-600" />
            <h3 className="font-bold text-purple-800">FPGW - Fixed Price Gold</h3>
          </div>
          <p className="text-xs text-purple-700 mb-4">
            Value locked at purchase price 
            {balance.fpgw.weightedAvgPrice > 0 && (
              <span className="ml-1 font-semibold">
                (Avg: ${balance.fpgw.weightedAvgPrice.toFixed(2)}/g)
              </span>
            )}
          </p>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Available</span>
              <div className="text-right">
                <span className="text-xl font-bold text-purple-600" data-testid="fpgw-available">
                  {balance.fpgw.availableGrams.toFixed(4)} g
                </span>
                <p className="text-xs text-muted-foreground">
                  ≈ ${(balance.fpgw.availableGrams * balance.fpgw.weightedAvgPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
            
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
                    ≈ ${balance.fpgwValueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

      <Dialog open={showTransferModal} onOpenChange={setShowTransferModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Between Wallets</DialogTitle>
            <DialogDescription>
              Move gold between your Market Price (MPGW) and Fixed Price (FPGW) wallets.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <Label>Transfer Direction</Label>
              <RadioGroup 
                value={transferDirection} 
                onValueChange={(v) => setTransferDirection(v as 'MPGW_to_FPGW' | 'FPGW_to_MPGW')}
              >
                <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-amber-50 cursor-pointer">
                  <RadioGroupItem value="MPGW_to_FPGW" id="mpgw-to-fpgw" />
                  <Label htmlFor="mpgw-to-fpgw" className="flex-1 cursor-pointer">
                    <span className="font-semibold text-amber-700">MPGW</span>
                    <span className="mx-2">→</span>
                    <span className="font-semibold text-purple-700">FPGW</span>
                    <p className="text-xs text-muted-foreground mt-1">
                      Lock at current market price (${balance.goldPricePerGram.toFixed(2)}/g)
                    </p>
                  </Label>
                </div>
                {balance.fpgw.availableGrams > 0.000001 && (
                  <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-purple-50 cursor-pointer">
                    <RadioGroupItem value="FPGW_to_MPGW" id="fpgw-to-mpgw" />
                    <Label htmlFor="fpgw-to-mpgw" className="flex-1 cursor-pointer">
                      <span className="font-semibold text-purple-700">FPGW</span>
                      <span className="mx-2">→</span>
                      <span className="font-semibold text-amber-700">MPGW</span>
                      <p className="text-xs text-muted-foreground mt-1">
                        Convert to market price valuation (FIFO consumption)
                      </p>
                    </Label>
                  </div>
                )}
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
                placeholder="Enter gold amount"
                data-testid="input-transfer-amount"
              />
              <Button 
                variant="link" 
                className="text-xs p-0 h-auto"
                onClick={() => setTransferAmount(maxTransferAmount.toFixed(6))}
              >
                Use Max Amount
              </Button>
            </div>

            {transferDirection === 'MPGW_to_FPGW' && transferAmount && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                <p className="text-sm text-amber-800">
                  <strong>{parseFloat(transferAmount).toFixed(6)} g</strong> will be locked at current price of 
                  <strong> ${balance.goldPricePerGram.toFixed(2)}/g</strong>
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  Value: ≈ ${(parseFloat(transferAmount) * balance.goldPricePerGram).toFixed(2)}
                </p>
              </div>
            )}
            
            {transferDirection === 'FPGW_to_MPGW' && transferAmount && (
              <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
                <p className="text-sm text-purple-800">
                  <strong>{parseFloat(transferAmount).toFixed(6)} g</strong> will be converted to market valuation
                </p>
                <p className="text-xs text-purple-600 mt-1">
                  FPGW batches will be consumed in FIFO order
                </p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransferModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleTransfer}
              disabled={internalTransfer.isPending || !transferAmount || parseFloat(transferAmount) <= 0}
              className="bg-purple-500 hover:bg-purple-600"
              data-testid="btn-confirm-transfer"
            >
              {internalTransfer.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <ArrowRightLeft className="w-4 h-4 mr-2" />
                  Confirm Transfer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
