import React from 'react';
import { Wallet } from '@/types/finapay';
import { TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface WalletAnalyticsProps {
  wallet: Wallet;
}

export default function WalletAnalytics({ wallet }: WalletAnalyticsProps) {
  const goldValue = wallet.goldBalanceGrams * wallet.goldPriceUsdPerGram;
  const totalValue = goldValue + wallet.usdBalance;

  const goldPercentage = totalValue > 0 ? (goldValue / totalValue) * 100 : 0;
  const cashPercentage = totalValue > 0 ? (wallet.usdBalance / totalValue) * 100 : 0;

  return (
    <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">Portfolio Overview</h3>
        <div className="p-2 bg-muted rounded-lg">
          <TrendingUp className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>

      <div className="space-y-4">
        {/* Gold Allocation */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-amber-500 to-orange-500" />
              <span className="text-sm font-medium text-foreground">Gold Holdings</span>
            </div>
            <span className="text-sm font-bold text-amber-600">{goldPercentage.toFixed(1)}%</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-foreground">
              ${goldValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-sm text-muted-foreground">
              {wallet.goldBalanceGrams.toFixed(4)} g
            </span>
          </div>
          <div className="mt-2 h-2 bg-amber-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
              style={{ width: `${goldPercentage}%` }}
            />
          </div>
        </div>

        {/* Cash Allocation */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-green-500 to-emerald-500" />
              <span className="text-sm font-medium text-foreground">USD Cash</span>
            </div>
            <span className="text-sm font-bold text-green-600">{cashPercentage.toFixed(1)}%</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-foreground">
              ${wallet.usdBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-sm text-muted-foreground">Available</span>
          </div>
          <div className="mt-2 h-2 bg-green-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${cashPercentage}%` }}
            />
          </div>
        </div>

        {/* Gold Price Info */}
        <div className="pt-4 border-t border-border">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Current Gold Price</span>
            <div className="flex items-center gap-1">
              <span className="font-semibold">${wallet.goldPriceUsdPerGram.toFixed(2)}/g</span>
              <ArrowUpRight className="w-4 h-4 text-green-500" />
            </div>
          </div>
          <div className="flex items-center justify-between text-sm mt-2">
            <span className="text-muted-foreground">Per Troy Ounce</span>
            <span className="font-semibold">${(wallet.goldPriceUsdPerGram * 31.1035).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
