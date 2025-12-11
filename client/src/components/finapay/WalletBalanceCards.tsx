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
      {/* 1. Total Available Balance */}
      <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:scale-[1.02] hover:border-[#D4AF37] transition-all duration-200 group relative overflow-hidden">
        <div className="absolute top-0 right-0 p-3 opacity-10">
           <DollarSign className="w-24 h-24 text-white" />
        </div>
        <CardContent className="p-6 relative z-10">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-green-500/10 rounded-xl text-green-500 group-hover:bg-green-500 group-hover:text-black transition-colors">
              <DollarSign className="w-6 h-6" />
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-white/60">Total Available Balance</p>
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-bold text-white mb-1">
              ${totalAvailableUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <div className="flex items-center gap-2 mt-2 text-sm text-white/40">
               <span className="text-green-500 flex items-center font-medium bg-green-500/10 px-2 py-0.5 rounded">
                 <ArrowUpRight className="w-3 h-3 mr-1" />
                 Ready to Trade
               </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Locked Funds in BNSL */}
      <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:scale-[1.02] hover:border-[#FF2FBF] transition-all duration-200 group relative overflow-hidden">
        <div className="absolute top-0 right-0 p-3 opacity-10">
           <TrendingUp className="w-24 h-24 text-[#FF2FBF]" />
        </div>
        <CardContent className="p-6 relative z-10">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-[#FF2FBF]/10 rounded-xl text-[#FF2FBF] group-hover:bg-[#FF2FBF] group-hover:text-white transition-colors">
              <Lock className="w-6 h-6" />
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-white/60">Locked in BNSL</p>
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-bold text-[#FF2FBF] mb-1">
              ${wallet.bnslLockedUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-sm text-white/40 mt-2">Earning Yield</p>
          </div>
        </CardContent>
      </Card>

      {/* 3. Locked Funds in FinaBridge */}
      <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:scale-[1.02] hover:border-[#4CAF50] transition-all duration-200 group relative overflow-hidden">
        <div className="absolute top-0 right-0 p-3 opacity-10">
           <Briefcase className="w-24 h-24 text-[#4CAF50]" />
        </div>
        <CardContent className="p-6 relative z-10">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-[#4CAF50]/10 rounded-xl text-[#4CAF50] group-hover:bg-[#4CAF50] group-hover:text-white transition-colors">
              <Briefcase className="w-6 h-6" />
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-white/60">Locked in FinaBridge</p>
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-bold text-[#4CAF50] mb-1">
              ${wallet.finaBridgeLockedUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-sm text-white/40 mt-2">Active Trade Finance</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
