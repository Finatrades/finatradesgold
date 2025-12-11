import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Wallet } from '@/types/finapay';
import { DollarSign, Lock, Briefcase, TrendingUp, ArrowUpRight } from 'lucide-react';

interface WalletBalanceCardsProps {
  wallet: Wallet;
}

export default function WalletBalanceCards({ wallet }: WalletBalanceCardsProps) {
  const goldValueUsd = wallet.goldBalanceGrams * wallet.goldPriceUsdPerGram;
  
  // Total Available (Liquid) = USD Balance + Liquid Gold
  const totalAvailableUsd = wallet.usdBalance + goldValueUsd;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* 1. Total Available Balance - Premium Gold/Green Gradient */}
      <Card className="relative overflow-hidden border-0 group h-full">
        {/* Background Gradient Mesh */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a472a] via-[#0d2e1a] to-black opacity-90 z-0"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none group-hover:bg-green-400/30 transition-all duration-500"></div>
        
        <CardContent className="p-6 relative z-10 h-full flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 shadow-[0_0_15px_rgba(74,222,128,0.3)] group-hover:scale-110 transition-transform duration-300">
              <DollarSign className="w-6 h-6 text-green-400" />
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-green-400 uppercase tracking-widest mb-1">Liquid Capital</p>
              <p className="text-sm font-medium text-white/40">Available Balance</p>
            </div>
          </div>
          
          <div className="mt-8">
            <h3 className="text-4xl font-bold text-white mb-2 tracking-tight group-hover:translate-x-1 transition-transform duration-300">
              ${totalAvailableUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <div className="flex items-center gap-2">
               <span className="inline-flex items-center text-xs font-bold text-black bg-green-400 px-2 py-1 rounded-full shadow-[0_0_10px_rgba(74,222,128,0.5)]">
                 <ArrowUpRight className="w-3 h-3 mr-1" strokeWidth={3} />
                 READY TO TRADE
               </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Locked Funds in BNSL - Cyberpunk Pink/Purple */}
      <Card className="relative overflow-hidden border-0 group h-full">
        <div className="absolute inset-0 bg-gradient-to-br from-[#4a0d33] via-[#24081c] to-black opacity-90 z-0"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#FF2FBF]/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none group-hover:bg-[#FF2FBF]/30 transition-all duration-500"></div>

        <CardContent className="p-6 relative z-10 h-full flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 shadow-[0_0_15px_rgba(255,47,191,0.3)] group-hover:scale-110 transition-transform duration-300">
              <TrendingUp className="w-6 h-6 text-[#FF2FBF]" />
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-[#FF2FBF] uppercase tracking-widest mb-1">Staked Assets</p>
              <p className="text-sm font-medium text-white/40">Locked in BNSL</p>
            </div>
          </div>
          
          <div className="mt-8">
            <h3 className="text-4xl font-bold text-white mb-2 tracking-tight group-hover:translate-x-1 transition-transform duration-300">
              ${wallet.bnslLockedUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <div className="flex items-center gap-2">
               <span className="inline-flex items-center text-xs font-medium text-[#FF2FBF] bg-[#FF2FBF]/10 px-3 py-1 rounded-full border border-[#FF2FBF]/20">
                 <Lock className="w-3 h-3 mr-1.5" />
                 Earning Yield
               </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Locked Funds in FinaBridge - Deep Tech Blue/Teal */}
      <Card className="relative overflow-hidden border-0 group h-full">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0d2a4a] via-[#051324] to-black opacity-90 z-0"></div>
        <div className="absolute top-1/2 left-1/2 w-full h-full bg-blue-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none group-hover:bg-blue-400/20 transition-all duration-500"></div>

        <CardContent className="p-6 relative z-10 h-full flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 shadow-[0_0_15px_rgba(59,130,246,0.3)] group-hover:scale-110 transition-transform duration-300">
              <Briefcase className="w-6 h-6 text-blue-400" />
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">Trade Finance</p>
              <p className="text-sm font-medium text-white/40">FinaBridge Capital</p>
            </div>
          </div>
          
          <div className="mt-8">
            <h3 className="text-4xl font-bold text-white mb-2 tracking-tight group-hover:translate-x-1 transition-transform duration-300">
              ${wallet.finaBridgeLockedUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <div className="flex items-center gap-2">
               <span className="inline-flex items-center text-xs font-medium text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
                 <Briefcase className="w-3 h-3 mr-1.5" />
                 Active Deals
               </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
