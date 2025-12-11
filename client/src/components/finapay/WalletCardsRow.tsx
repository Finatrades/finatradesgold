import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet } from '@/types/finapay';
import { ArrowRight, Wallet as WalletIcon, ArrowLeftRight, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

interface WalletCardsRowProps {
  wallet: Wallet;
}

export default function WalletCardsRow({ wallet }: WalletCardsRowProps) {
  
  const wallets = [
    {
      title: 'FinaPay Wallet',
      icon: <WalletIcon className="w-4 h-4" />,
      color: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-l-4 border-l-green-500',
      availableLabel: 'Available Balance',
      availableValue: `${wallet.goldBalanceGrams.toFixed(2)} g`,
      availableSub: `≈ $${(wallet.goldBalanceGrams * wallet.goldPriceUsdPerGram).toLocaleString()}`,
      metric1Label: "Today's P/L",
      metric1Value: "+$0.00",
      metric1Color: "text-green-600",
      metric2Label: "Transactions",
      metric2Value: "0"
    },
    {
      title: 'FinaBridge Wallet',
      icon: <ArrowLeftRight className="w-4 h-4" />,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      border: 'border-l-4 border-l-purple-500',
      availableLabel: 'Available Balance',
      availableValue: '0.00 g',
      availableSub: '≈ $0.00 USD',
      metric1Label: "Locked",
      metric1Value: `${(wallet.finaBridgeLockedUsd / wallet.goldPriceUsdPerGram).toFixed(2)}g`,
      metric1Color: "text-purple-600",
      metric2Label: "Active Cases",
      metric2Value: "2"
    },
    {
      title: 'BNSL Wallet',
      icon: <TrendingUp className="w-4 h-4" />,
      color: 'text-gray-800',
      bg: 'bg-gray-50',
      border: 'border-l-4 border-l-gray-800',
      availableLabel: 'Available Balance',
      availableValue: '0.00 g',
      availableSub: '≈ $0.00 USD',
      metric1Label: "Locked",
      metric1Value: `${(wallet.bnslLockedUsd / wallet.goldPriceUsdPerGram).toFixed(2)}g`,
      metric1Color: "text-gray-800",
      metric2Label: "Active Plans",
      metric2Value: "1"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {wallets.map((w, idx) => (
        <motion.div
           key={idx}
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.2 + (idx * 0.1) }}
        >
          <Card className={`overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow ${w.border}`}>
            <CardHeader className="pb-2 pt-4 px-5 flex flex-row items-center justify-between space-y-0">
               <div className="flex items-center gap-2">
                 <div className={`p-1.5 rounded-md ${w.bg} ${w.color}`}>
                   {w.icon}
                 </div>
                 <CardTitle className="text-base font-bold text-gray-900">{w.title}</CardTitle>
               </div>
               <Button variant="ghost" size="sm" className={`h-6 text-xs ${w.color} hover:${w.bg} hover:${w.color}`}>
                 View <ArrowRight className="w-3 h-3 ml-1" />
               </Button>
            </CardHeader>
            <CardContent className="px-5 pb-5 pt-2">
               <div className={`p-4 rounded-xl ${w.bg} mb-4`}>
                  <p className="text-xs text-gray-500 font-medium mb-1">{w.availableLabel}</p>
                  <p className="text-2xl font-bold text-gray-900">{w.availableValue}</p>
                  <p className="text-xs text-gray-400">{w.availableSub}</p>
               </div>
               
               <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-1">{w.metric1Label}</p>
                    <p className={`text-sm font-bold ${w.metric1Color}`}>{w.metric1Value}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-1">{w.metric2Label}</p>
                    <p className="text-sm font-bold text-gray-900">{w.metric2Value}</p>
                  </div>
               </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
