import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, ArrowUpRight } from 'lucide-react';

const generateData = (points: number, startValue: number, volatility: number) => {
  let currentValue = startValue;
  return Array.from({ length: points }, (_, i) => {
    const change = (Math.random() - 0.5) * volatility;
    currentValue += change;
    return {
      time: i,
      value: currentValue
    };
  });
};

const DATA_24H = generateData(24, 2340, 5);
const DATA_7D = generateData(7, 2320, 15);
const DATA_30D = generateData(30, 2300, 30);

export default function LiveGoldChart() {
  const [range, setRange] = useState('24H');
  
  const getData = () => {
    switch(range) {
      case '24H': return DATA_24H;
      case '7D': return DATA_7D;
      case '30D': return DATA_30D;
      default: return DATA_24H;
    }
  };

  const currentData = getData();
  const lastValue = currentData[currentData.length - 1].value;
  const startValue = currentData[0].value;
  const change = ((lastValue - startValue) / startValue) * 100;
  const isPositive = change >= 0;

  return (
    <Card className="bg-white/5 border-white/10 backdrop-blur-sm h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-medium text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[#D4AF37]" />
          Live Gold Spot
        </CardTitle>
        <Tabs value={range} onValueChange={setRange} className="w-auto">
          <TabsList className="bg-black/20 border border-white/10 h-8">
            <TabsTrigger value="24H" className="text-xs h-6">24H</TabsTrigger>
            <TabsTrigger value="7D" className="text-xs h-6">7D</TabsTrigger>
            <TabsTrigger value="30D" className="text-xs h-6">30D</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">${lastValue.toFixed(2)}</span>
            <span className="text-sm text-white/40">USD/oz</span>
          </div>
          <div className={`flex items-center text-sm font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
            <ArrowUpRight className={`w-4 h-4 mr-1 ${isPositive ? '' : 'rotate-90'}`} />
            {isPositive ? '+' : ''}{change.toFixed(2)}%
          </div>
        </div>

        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={currentData}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="time" hide />
              <YAxis domain={['auto', 'auto']} hide />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0D0515', borderColor: 'rgba(255,255,255,0.1)', color: '#fff' }}
                itemStyle={{ color: '#D4AF37' }}
                formatter={(value: number) => [`$${value.toFixed(2)}`, 'Price']}
                labelFormatter={() => ''}
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#D4AF37" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorValue)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
