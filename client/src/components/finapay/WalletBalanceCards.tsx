import React from 'react';
import { Wallet as WalletType } from '@/types/finapay';
import { Wallet, Lock, TrendingUp, ArrowRightLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import GoldBackedDisclosure from '@/components/common/GoldBackedDisclosure';

interface WalletBalanceCardsProps {
  wallet: WalletType;
  onTransfer?: () => void;
}

export default function WalletBalanceCards({ wallet, onTransfer }: WalletBalanceCardsProps) {
  const goldValueUsd = wallet.goldBalanceGrams * wallet.goldPriceUsdPerGram;
  const totalAvailableUsd = wallet.usdBalance + goldValueUsd;
  const totalLockedUsd = wallet.bnslLockedUsd + wallet.finaBridgeLockedUsd;
  const totalLockedGrams = wallet.goldPriceUsdPerGram > 0 ? totalLockedUsd / wallet.goldPriceUsdPerGram : 0;
  const grandTotalUsd = totalAvailableUsd + totalLockedUsd;
  const grandTotalGoldGrams = wallet.goldBalanceGrams + totalLockedGrams;

  return (
    <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-lg">
            <Wallet className="w-5 h-5 text-amber-600" />
          </div>
          <h2 className="text-lg font-bold text-foreground">FinaPay Wallet</h2>
        </div>
        {onTransfer && (
          <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white" onClick={onTransfer}>
            <ArrowRightLeft className="w-4 h-4 mr-2" />
            Transfer from FinaVault
          </Button>
        )}
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Available Balance */}
        <div className="relative p-5 rounded-xl border border-border bg-gradient-to-br from-white to-gray-50 overflow-hidden">
          <div className="absolute right-2 bottom-2 opacity-5">
            <Wallet className="w-20 h-20 text-amber-500" />
          </div>
          <div className="relative z-10">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Available Balance</p>
            <div className="space-y-1 mb-2">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-foreground">
                  ${totalAvailableUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-muted-foreground">Gold Owned:</span>
                <span className="text-lg font-semibold text-amber-600">
                  {wallet.goldBalanceGrams.toFixed(4)} g
                </span>
                {wallet.usdBalance > 0 && (
                  <span className="text-xs text-muted-foreground ml-1">
                    + ${wallet.usdBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} cash
                  </span>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Funds available for trading and transfers.
            </p>
          </div>
        </div>

        {/* Locked Assets */}
        <div className="relative p-5 rounded-xl border border-border bg-gradient-to-br from-white to-gray-50 overflow-hidden">
          <div className="absolute right-2 bottom-2 opacity-5">
            <Lock className="w-20 h-20 text-amber-500" />
          </div>
          <div className="relative z-10">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Locked Assets</p>
            <div className="space-y-1 mb-2">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-amber-500">
                  ${totalLockedUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-muted-foreground">Gold Locked:</span>
                <span className="text-lg font-semibold text-amber-500/80">
                  {totalLockedGrams.toFixed(4)} g
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              <Lock className="w-3 h-3 inline mr-1" />
              Assets locked in active plans and trades.
            </p>
          </div>
        </div>

        {/* Total Value */}
        <div className="relative p-5 rounded-xl border border-border bg-gradient-to-br from-white to-gray-50 overflow-hidden">
          <div className="absolute right-2 bottom-2 opacity-5">
            <TrendingUp className="w-20 h-20 text-amber-500" />
          </div>
          <div className="relative z-10">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Total Wallet Value</p>
            <div className="space-y-1 mb-2">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-amber-500">
                  ${grandTotalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-muted-foreground">Total Gold:</span>
                <span className="text-lg font-semibold text-foreground">
                  {grandTotalGoldGrams.toFixed(4)} g
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>
      
      {/* Gold-Backed Disclosure */}
      <GoldBackedDisclosure className="mt-4" />
    </div>
  );
}
