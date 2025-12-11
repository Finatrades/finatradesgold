import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Wallet } from '@/types/finapay';
import { Database, DollarSign, Globe, TrendingUp, TrendingDown, ArrowUpRight } from 'lucide-react';

interface WalletBalanceCardsProps {
  wallet: Wallet;
}

export default function WalletBalanceCards({ wallet }: WalletBalanceCardsProps) {
  const goldValueUsd = wallet.goldBalanceGrams * wallet.goldPriceUsdPerGram;
  const goldValueAed = goldValueUsd * wallet.usdAedRate;

  // Mock PnL - in real app, calculate from average buy price
  const pnlUsd = goldValueUsd * 0.12; 
  const pnlPercent = 12.4;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* 1. Gold Balance */}
      <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:scale-[1.02] hover:border-[#D4AF37] transition-all duration-200 group">
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-[#D4AF37]/10 rounded-xl text-[#D4AF37] group-hover:bg-[#D4AF37] group-hover:text-black transition-colors">
              <Database className="w-6 h-6" />
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-white/60">Holdings</p>
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-bold text-white mb-1">
              {wallet.goldBalanceGrams.toLocaleString(undefined, { minimumFractionDigits: 3 })} <span className="text-lg text-white/40 font-normal">g</span>
            </h3>
            <div className="flex items-center gap-2 mt-2">
               <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-white/60">999.9 Fine Gold</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Value USD + PnL */}
      <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:scale-[1.02] hover:border-[#D4AF37] transition-all duration-200 group">
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-green-500/10 rounded-xl text-green-500 group-hover:bg-green-500 group-hover:text-black transition-colors">
              <DollarSign className="w-6 h-6" />
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-white/60">Portfolio Value</p>
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-bold text-[#D4AF37] mb-1">
              ${goldValueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <div className="flex items-center gap-2 text-sm mt-1">
               <span className="text-green-500 flex items-center font-medium">
                 <ArrowUpRight className="w-3 h-3 mr-1" />
                 +${pnlUsd.toFixed(2)} ({pnlPercent}%)
               </span>
               <span className="text-white/20">All Time</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Value AED */}
      <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:scale-[1.02] hover:border-[#D4AF37] transition-all duration-200 group">
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500 group-hover:bg-blue-500 group-hover:text-black transition-colors">
              <Globe className="w-6 h-6" />
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-white/60">Local Equivalent</p>
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-bold text-white mb-1">
              AED {goldValueAed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-sm text-white/40">@ 3.67 AED/USD Peg</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
