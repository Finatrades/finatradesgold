import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Wallet } from '@/types/finapay';
import { Database, DollarSign, Globe, TrendingUp } from 'lucide-react';

interface WalletBalanceCardsProps {
  wallet: Wallet;
}

export default function WalletBalanceCards({ wallet }: WalletBalanceCardsProps) {
  const goldValueUsd = wallet.goldBalanceGrams * wallet.goldPriceUsdPerGram;
  const goldValueAed = goldValueUsd * wallet.usdAedRate;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* 1. Gold Balance */}
      <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:scale-[1.02] hover:border-[#D4AF37] transition-all duration-200">
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-[#D4AF37]/10 rounded-xl text-[#D4AF37]">
              <Database className="w-6 h-6" />
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-white/60">Balance</p>
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-bold text-white mb-1">
              {wallet.goldBalanceGrams.toLocaleString(undefined, { minimumFractionDigits: 3 })} <span className="text-lg text-white/40 font-normal">g</span>
            </h3>
            <p className="text-sm text-white/40">Gold held in FinaPay Wallet</p>
          </div>
        </CardContent>
      </Card>

      {/* 2. Value USD */}
      <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:scale-[1.02] hover:border-[#D4AF37] transition-all duration-200">
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-green-500/10 rounded-xl text-green-500">
              <DollarSign className="w-6 h-6" />
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-white/60">Value (USD)</p>
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-bold text-[#D4AF37] mb-1">
              ${goldValueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-sm text-white/40">@ ${wallet.goldPriceUsdPerGram.toFixed(2)} / g</p>
          </div>
        </CardContent>
      </Card>

      {/* 3. Value AED */}
      <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:scale-[1.02] hover:border-[#D4AF37] transition-all duration-200">
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500">
              <Globe className="w-6 h-6" />
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-white/60">Value (AED)</p>
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-bold text-white mb-1">
              AED {goldValueAed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-sm text-white/40">Local currency view</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
