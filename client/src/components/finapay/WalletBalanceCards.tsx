import React from 'react';
import { Wallet as WalletType } from '@/types/finapay';
import { Wallet, TrendingUp, Lock, ArrowUpRight } from 'lucide-react';

interface WalletBalanceCardsProps {
  wallet: WalletType;
}

export default function WalletBalanceCards({ wallet }: WalletBalanceCardsProps) {
  const goldValueUsd = wallet.goldBalanceGrams * wallet.goldPriceUsdPerGram;
  const totalAvailableUsd = wallet.usdBalance + goldValueUsd;
  const totalLockedUsd = wallet.bnslLockedUsd + wallet.finaBridgeLockedUsd;
  const totalLockedGrams = totalLockedUsd / wallet.goldPriceUsdPerGram;
  const grandTotalUsd = totalAvailableUsd + totalLockedUsd;
  const grandTotalGrams = grandTotalUsd / wallet.goldPriceUsdPerGram;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      
      {/* Available Balance - Primary Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 p-6 text-white shadow-lg">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Wallet className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-white/80">Available Balance</span>
            </div>
            <ArrowUpRight className="w-5 h-5 text-white/60" />
          </div>
          
          <div className="mb-1">
            <span className="text-4xl font-bold tracking-tight">
              ${totalAvailableUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          
          <div className="text-white/70 text-sm font-medium">
            {wallet.goldBalanceGrams.toFixed(4)} g Gold
          </div>
          
          <div className="mt-4 pt-4 border-t border-white/20 flex items-center justify-between text-sm">
            <div>
              <span className="text-white/60">Cash</span>
              <p className="font-semibold">${wallet.usdBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="text-right">
              <span className="text-white/60">Gold Value</span>
              <p className="font-semibold">${goldValueUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Locked Assets */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-border p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Lock className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Locked Assets</span>
          </div>
        </div>
        
        <div className="mb-1">
          <span className="text-3xl font-bold text-amber-600 tracking-tight">
            ${totalLockedUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        
        <div className="text-muted-foreground text-sm font-medium">
          {totalLockedGrams.toFixed(4)} g Gold
        </div>
        
        <div className="mt-4 pt-4 border-t border-border space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">BNSL Locked</span>
            <span className="font-medium">${wallet.bnslLockedUsd.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Trade Finance</span>
            <span className="font-medium">${wallet.finaBridgeLockedUsd.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Total Net Worth */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 p-6 text-white shadow-lg">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                <TrendingUp className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-white/70">Total Net Worth</span>
            </div>
          </div>
          
          <div className="mb-1">
            <span className="text-3xl font-bold tracking-tight">
              ${grandTotalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          
          <div className="text-white/60 text-sm font-medium">
            {grandTotalGrams.toFixed(4)} g Gold
          </div>
          
          <div className="mt-4 pt-4 border-t border-white/20 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-white/60">Available</span>
              <span className="font-medium text-green-400">${totalAvailableUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-white/60">Locked</span>
              <span className="font-medium text-amber-400">${totalLockedUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </div>
      
    </div>
  );
}
