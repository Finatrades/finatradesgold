import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet } from '@/types/finapay';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Info } from 'lucide-react';

interface WalletAnalyticsProps {
  wallet: Wallet;
}

export default function WalletAnalytics({ wallet }: WalletAnalyticsProps) {
  
  const goldValue = wallet.goldBalanceGrams * wallet.goldPriceUsdPerGram;
  // Mock other assets for "Portfolio" feel
  const cashValue = 2500; 
  const cryptoValue = 1200;
  
  const data = [
    { name: 'Gold', value: goldValue, color: '#D4AF37' },
    { name: 'USD Cash', value: cashValue, color: '#22c55e' },
    { name: 'Crypto', value: cryptoValue, color: '#8b5cf6' },
  ];

  const totalValue = goldValue + cashValue + cryptoValue;

  return (
    <Card className="bg-white/5 border-white/10 backdrop-blur-sm h-full">
      <CardHeader className="pb-2 border-b border-white/5">
        <CardTitle className="text-lg font-medium text-white flex items-center justify-between">
          <span>Asset Allocation</span>
          <Info className="w-4 h-4 text-white/40 cursor-help" />
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          
          <div className="h-[160px] w-[160px] relative">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie
                   data={data}
                   innerRadius={60}
                   outerRadius={80}
                   paddingAngle={5}
                   dataKey="value"
                   stroke="none"
                 >
                   {data.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={entry.color} />
                   ))}
                 </Pie>
                 <Tooltip 
                    formatter={(value: number) => `$${value.toLocaleString()}`}
                    contentStyle={{ backgroundColor: '#0D0515', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                 />
               </PieChart>
             </ResponsiveContainer>
             {/* Center Text */}
             <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xs text-white/40">Total</span>
                <span className="text-sm font-bold text-white">${(totalValue / 1000).toFixed(1)}k</span>
             </div>
          </div>

          <div className="flex-1 space-y-3 w-full">
            {data.map((item) => (
              <div key={item.name} className="flex items-center justify-between group cursor-pointer">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-white/80 group-hover:text-white transition-colors">{item.name}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-white">${item.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                  <p className="text-xs text-white/40">{((item.value / totalValue) * 100).toFixed(1)}%</p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </CardContent>
    </Card>
  );
}
