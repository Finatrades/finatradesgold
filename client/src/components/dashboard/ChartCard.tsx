import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

const generateData = (days: number) => {
  const data = [];
  let value = 2350;
  for (let i = 0; i < days; i++) {
    const change = (Math.random() - 0.45) * 30;
    value += change;
    data.push({
      date: `Day ${i + 1}`,
      value: Number(value.toFixed(2))
    });
  }
  return data;
};

const data24h = generateData(24);
const data7d = generateData(7);
const data30d = generateData(30);

export default function ChartCard() {
  const [timeframe, setTimeframe] = useState<'24H' | '7D' | '30D'>('24H');
  
  const currentData = timeframe === '24H' ? data24h : timeframe === '7D' ? data7d : data30d;
  const lastValue = currentData[currentData.length - 1].value;
  const prevValue = currentData[0].value;
  const change = ((lastValue - prevValue) / prevValue) * 100;
  const isPositive = change >= 0;

  return (
    <Card className="p-6 bg-white shadow-sm border border-border h-[400px] flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h3 className="text-lg font-bold text-foreground mb-1">Gold Live Spot</h3>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-foreground">${lastValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className={`text-sm font-medium flex items-center px-2 py-0.5 rounded-full ${isPositive ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
              {isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
              {Math.abs(change).toFixed(2)}%
            </span>
          </div>
        </div>
        
        <div className="flex bg-muted p-1 rounded-lg border border-border">
          {(['24H', '7D', '30D'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                timeframe === t 
                  ? 'bg-secondary text-white shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={currentData}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--secondary))" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(var(--secondary))" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis 
              dataKey="date" 
              hide={true}
            />
            <YAxis 
              domain={['auto', 'auto']}
              orientation="right"
              tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 10}}
              tickFormatter={(val) => `$${val}`}
              axisLine={false}
              tickLine={false}
              width={50}
            />
            <Tooltip 
              contentStyle={{backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--popover-foreground))'}}
              itemStyle={{color: 'hsl(var(--secondary))'}}
              labelStyle={{color: 'hsl(var(--foreground))', marginBottom: '4px'}}
            />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke="hsl(var(--secondary))" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorValue)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
