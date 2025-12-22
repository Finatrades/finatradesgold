import React from 'react';
import { Wallet as WalletType } from '@/types/finapay';
import { Wallet, Lock, TrendingUp, ArrowRightLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import GoldBackedDisclosure from '@/components/common/GoldBackedDisclosure';

interface WalletBalanceCardsProps {
  wallet: WalletType;
  onTransfer?: () => void;
}

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

export default function WalletBalanceCards({ wallet, onTransfer }: WalletBalanceCardsProps) {
  const goldValueUsd = wallet.goldBalanceGrams * wallet.goldPriceUsdPerGram;
  const totalAvailableUsd = wallet.usdBalance + goldValueUsd;
  const totalLockedUsd = wallet.bnslLockedUsd + wallet.finaBridgeLockedUsd;
  const totalLockedGrams = wallet.goldPriceUsdPerGram > 0 ? totalLockedUsd / wallet.goldPriceUsdPerGram : 0;
  const grandTotalUsd = totalAvailableUsd + totalLockedUsd;
  const grandTotalGoldGrams = wallet.goldBalanceGrams + totalLockedGrams;

  // Gold bar breakdown for available balance
  const availableBars = calculateGoldBars(wallet.goldBalanceGrams);
  const hasAvailableBars = availableBars.kg > 0 || availableBars.g100 > 0 || availableBars.g10 > 0 || availableBars.g1 > 0;

  return (
    <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Wallet className="w-5 h-5 text-fuchsia-600" />
          </div>
          <h2 className="text-lg font-bold text-foreground">FinaPay Wallet</h2>
        </div>
        {onTransfer && (
          <Button size="sm" className="bg-purple-500 hover:bg-fuchsia-600 text-white" onClick={onTransfer}>
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
            <Wallet className="w-20 h-20 text-purple-500" />
          </div>
          <div className="relative z-10">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Available Balance</p>
            <div className="space-y-1 mb-2">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-foreground">
                  {totalAvailableUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} د.إ
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-muted-foreground">Gold Owned:</span>
                <span className="text-lg font-semibold text-fuchsia-600">
                  {wallet.goldBalanceGrams.toFixed(4)} g
                </span>
                {wallet.usdBalance > 0 && (
                  <span className="text-xs text-muted-foreground ml-1">
                    + {wallet.usdBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} د.إ cash
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
            <Lock className="w-20 h-20 text-purple-500" />
          </div>
          <div className="relative z-10">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Locked Assets</p>
            <div className="space-y-1 mb-2">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-purple-500">
                  {totalLockedUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} د.إ
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-muted-foreground">Gold Locked:</span>
                <span className="text-lg font-semibold text-purple-500/80">
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
            <TrendingUp className="w-20 h-20 text-purple-500" />
          </div>
          <div className="relative z-10">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Total Wallet Value</p>
            <div className="space-y-1 mb-2">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-purple-500">
                  {grandTotalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} د.إ
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

      {/* Gold Bar Breakdown */}
      {hasAvailableBars && (
        <div className="mt-4 p-4 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl border border-amber-200">
          <p className="text-sm font-semibold text-amber-800 mb-3">Your Gold Bar Holdings:</p>
          <div className="grid grid-cols-4 gap-3 text-center">
            {availableBars.kg > 0 && (
              <div className="bg-white rounded-lg p-3 border border-amber-300 shadow-sm">
                <span className="text-2xl font-bold text-amber-700">{availableBars.kg}</span>
                <p className="text-xs text-amber-600 font-medium mt-1">1 KG Bar</p>
              </div>
            )}
            {availableBars.g100 > 0 && (
              <div className="bg-white rounded-lg p-3 border border-amber-300 shadow-sm">
                <span className="text-2xl font-bold text-amber-700">{availableBars.g100}</span>
                <p className="text-xs text-amber-600 font-medium mt-1">100g Bar</p>
              </div>
            )}
            {availableBars.g10 > 0 && (
              <div className="bg-white rounded-lg p-3 border border-amber-300 shadow-sm">
                <span className="text-2xl font-bold text-amber-700">{availableBars.g10}</span>
                <p className="text-xs text-amber-600 font-medium mt-1">10g Bar</p>
              </div>
            )}
            {availableBars.g1 > 0 && (
              <div className="bg-white rounded-lg p-3 border border-amber-300 shadow-sm">
                <span className="text-2xl font-bold text-amber-700">{availableBars.g1}</span>
                <p className="text-xs text-amber-600 font-medium mt-1">1g Bar</p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Gold-Backed Disclosure */}
      <GoldBackedDisclosure className="mt-4" />
    </div>
  );
}
