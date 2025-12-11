import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet as WalletType } from '@/types/finapay';
import { Wallet, DollarSign, Lock, Briefcase, TrendingUp, ArrowUpRight } from 'lucide-react';

interface WalletBalanceCardsProps {
  wallet: WalletType;
}

export default function WalletBalanceCards({ wallet }: WalletBalanceCardsProps) {
  const goldValueUsd = wallet.goldBalanceGrams * wallet.goldPriceUsdPerGram;
  
  // Total Available (Liquid) = USD Balance + Liquid Gold
  const totalAvailableUsd = wallet.usdBalance + goldValueUsd;
  
  // Total Locked = BNSL + FinaBridge
  const totalLockedUsd = wallet.bnslLockedUsd + wallet.finaBridgeLockedUsd;
  const totalLockedGrams = totalLockedUsd / wallet.goldPriceUsdPerGram;

  // Grand Total
  const grandTotalUsd = totalAvailableUsd + totalLockedUsd;
  const grandTotalGrams = grandTotalUsd / wallet.goldPriceUsdPerGram;

  return (
    <Card className="bg-white shadow-sm border border-border overflow-hidden relative">
      <div className="absolute top-0 right-0 p-4 opacity-5">
        <Wallet className="w-32 h-32 text-primary" />
      </div>
      
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Wallet className="w-5 h-5" />
            </div>
            FinaPay Wallet
          </CardTitle>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Available Balance */}
          <div className="bg-muted p-4 rounded-xl border border-border">
            <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Available Balance</p>
            <div className="text-2xl font-bold text-foreground">
              ${totalAvailableUsd.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </div>
            <div className="flex flex-col gap-1 mt-1">
              <p className="text-sm text-muted-foreground">
                <span className="text-secondary font-semibold">{wallet.goldBalanceGrams.toFixed(3)} g</span> Gold
              </p>
              <p className="text-sm text-muted-foreground">
                <span className="text-foreground font-semibold">${wallet.usdBalance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span> USD
              </p>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              Funds available for trading, spending, or transfer.
            </p>
          </div>

          {/* Locked Funds */}
          <div className="bg-muted p-4 rounded-xl border border-border">
            <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">
              Locked Assets
            </p>
            <div className="text-2xl font-bold text-amber-500">
              ${totalLockedUsd.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </div>
             <p className="text-xs text-amber-500/60 mb-2">
                ≈ {totalLockedGrams.toFixed(3)} g Gold
             </p>
            <div className="flex flex-col gap-1 mt-1">
               <div className="flex justify-between items-center text-sm text-amber-500/80">
                 <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> BNSL:</span>
                 <span>${wallet.bnslLockedUsd.toLocaleString()} <span className="text-xs opacity-70">({(wallet.bnslLockedUsd / wallet.goldPriceUsdPerGram).toFixed(2)} g)</span></span>
               </div>
               <div className="flex justify-between items-center text-sm text-amber-500/80">
                 <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" /> Trade:</span>
                 <span>${wallet.finaBridgeLockedUsd.toLocaleString()} <span className="text-xs opacity-70">({(wallet.finaBridgeLockedUsd / wallet.goldPriceUsdPerGram).toFixed(2)} g)</span></span>
               </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              Capital currently deployed in active financial products.
            </p>
          </div>

          {/* Total Value */}
          <div className="bg-muted p-4 rounded-xl border border-border">
             <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Total Net Worth</p>
             <div className="text-2xl font-bold text-secondary">
               ${grandTotalUsd.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
             </div>
             <p className="text-sm text-muted-foreground mt-1">
               <span className="text-secondary font-semibold">{grandTotalGrams.toFixed(3)} g</span> Total Gold Value
             </p>
             <p className="text-[10px] text-muted-foreground mt-2">
               Combined value of all available and locked assets across the platform.
             </p>
          </div>

        </div>
      </CardContent>
    </Card>
  );
}
