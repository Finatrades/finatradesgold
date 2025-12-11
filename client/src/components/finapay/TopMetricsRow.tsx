import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Wallet } from '@/types/finapay';
import { Lock, BarChart3, TrendingUp, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';

interface TopMetricsRowProps {
  wallet: Wallet;
}

export default function TopMetricsRow({ wallet }: TopMetricsRowProps) {
  const goldValueUsd = wallet.goldBalanceGrams * wallet.goldPriceUsdPerGram;
  const goldValueAed = goldValueUsd * wallet.usdAedRate;
  const totalPortfolio = wallet.usdBalance + goldValueUsd + wallet.bnslLockedUsd + wallet.finaBridgeLockedUsd;
  
  // Mock data for display
  const totalProfit = 1250.50;

  const metrics = [
    {
      label: 'Gold Storage',
      value: `${wallet.goldBalanceGrams.toFixed(4)} kg`, // Displaying as kg based on image but using grams value logic
      subtext: 'Deposited in FinaVault',
      icon: <Lock className="w-4 h-4 text-orange-400" />,
      bg: 'bg-orange-50',
      border: 'border-orange-100',
      textColor: 'text-gray-900'
    },
    {
      label: 'Gold Value (USD)',
      value: `$${goldValueUsd.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
      subtext: 'Worth in USD',
      icon: <DollarSign className="w-4 h-4 text-green-500" />,
      bg: 'bg-white',
      border: 'border-gray-200',
      textColor: 'text-gray-900'
    },
    {
      label: 'Gold Value (AED)',
      value: `${goldValueAed.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
      subtext: 'Worth in AED',
      icon: <DollarSign className="w-4 h-4 text-blue-500" />,
      bg: 'bg-white',
      border: 'border-gray-200',
      textColor: 'text-gray-900'
    },
    {
      label: 'Total Portfolio',
      value: `$${totalPortfolio.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
      subtext: 'Overall investment',
      icon: <BarChart3 className="w-4 h-4 text-purple-500" />,
      bg: 'bg-white',
      border: 'border-gray-200',
      textColor: 'text-gray-900'
    },
    {
      label: 'BNSL Invested',
      value: `${(wallet.bnslLockedUsd / wallet.goldPriceUsdPerGram).toFixed(1)}g`,
      subtext: 'In active plans',
      icon: <TrendingUp className="w-4 h-4 text-indigo-500" />,
      bg: 'bg-white',
      border: 'border-gray-200',
      textColor: 'text-gray-900'
    },
    {
      label: 'Total Profit',
      value: `+$${totalProfit.toFixed(2)}`,
      subtext: 'ROI from BNSL',
      icon: <TrendingUp className="w-4 h-4 text-green-500" />,
      bg: 'bg-green-50',
      border: 'border-green-100',
      textColor: 'text-green-600'
    }
  ];

  return (
    <div className="flex flex-col xl:flex-row gap-6">
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 flex-1">
        {metrics.map((metric, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <Card className={`${metric.bg} border ${metric.border} shadow-sm hover:shadow-md transition-all`}>
              <CardContent className="p-4 flex justify-between items-start">
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">{metric.label}</p>
                  <h3 className={`text-xl font-bold ${metric.textColor}`}>{metric.value}</h3>
                  <p className="text-[10px] text-gray-400 mt-1">{metric.subtext}</p>
                </div>
                <div className={`p-2 rounded-full bg-white border border-gray-100 shadow-sm`}>
                  {metric.icon}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Credit Card Visual */}
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-full xl:w-[320px] shrink-0"
      >
        <div className="relative w-full h-[180px] rounded-2xl overflow-hidden shadow-xl transform transition-transform hover:scale-105 duration-300 group">
            {/* Card Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] via-[#000000] to-[#333333]"></div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4AF37]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            
            {/* Card Content */}
            <div className="relative z-10 p-6 flex flex-col justify-between h-full text-white">
                <div className="flex justify-between items-start">
                    <div className="w-10 h-8 bg-gradient-to-r from-[#FFD700] to-[#FDB931] rounded-md shadow-sm"></div>
                    <div className="text-right">
                        <p className="text-[10px] font-bold tracking-widest text-[#D4AF37]">FINATRADES</p>
                        <p className="text-[8px] text-white/60 tracking-wider">GOLD MEMBER</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <p className="font-mono text-lg tracking-widest shadow-black drop-shadow-md">4532  ••••  ••••  0039</p>
                    <div className="flex justify-between items-end">
                        <div>
                            <p className="text-[8px] text-white/40 mb-0.5">CARD HOLDER</p>
                            <p className="text-xs font-medium tracking-wide">HASHIM V A K</p>
                        </div>
                        <div className="flex flex-col items-end">
                             <div className="flex gap-2">
                                 <div>
                                     <p className="text-[6px] text-white/40">VALID THRU</p>
                                     <p className="text-[10px] font-mono">12/28</p>
                                 </div>
                                 <div>
                                     <p className="text-[6px] text-white/40">CVV</p>
                                     <p className="text-[10px] font-mono">•••</p>
                                 </div>
                             </div>
                             <div className="mt-2">
                                {/* Mastercard circles mock */}
                                <div className="flex -space-x-3 relative">
                                    <div className="w-6 h-6 rounded-full bg-red-500/80"></div>
                                    <div className="w-6 h-6 rounded-full bg-yellow-500/80"></div>
                                </div>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </motion.div>
    </div>
  );
}
