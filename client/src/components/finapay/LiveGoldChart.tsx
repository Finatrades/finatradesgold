import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp, ArrowUpRight, Maximize2, BarChart2, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';

const generateData = (points: number, startValue: number, volatility: number) => {
  let currentValue = startValue;
  return Array.from({ length: points }, (_, i) => {
    const change = (Math.random() - 0.5) * volatility;
    currentValue += change;
    return {
      time: i,
      value: currentValue,
      volume: Math.random() * 1000
    };
  });
};

const DATA_24H = generateData(24, 2340, 5);
const DATA_7D = generateData(7, 2320, 15);
const DATA_30D = generateData(30, 2300, 30);

export default function LiveGoldChart() {
  const [range, setRange] = useState('24H');
  const [chartType, setChartType] = useState<'area' | 'candle'>('area');
  
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
    <Card className="bg-white shadow-sm border border-border h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border">
        <div className="flex items-center gap-4">
           <CardTitle className="text-lg font-medium text-foreground flex items-center gap-2">
             <TrendingUp className="w-5 h-5 text-secondary" />
             XAU/USD
           </CardTitle>
           <div className="flex bg-muted rounded p-0.5 border border-border">
              <button 
                onClick={() => setChartType('area')}
                className={`p-1.5 rounded ${chartType === 'area' ? 'bg-white shadow-sm text-secondary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Activity className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setChartType('candle')}
                className={`p-1.5 rounded ${chartType === 'candle' ? 'bg-white shadow-sm text-secondary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <BarChart2 className="w-4 h-4" />
              </button>
           </div>
        </div>
        
        <div className="flex gap-2">
          <Tabs value={range} onValueChange={setRange} className="w-auto">
            <TabsList className="bg-muted border border-border h-8">
              <TabsTrigger value="24H" className="text-xs h-6 px-3">1D</TabsTrigger>
              <TabsTrigger value="7D" className="text-xs h-6 px-3">1W</TabsTrigger>
              <TabsTrigger value="30D" className="text-xs h-6 px-3">1M</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
             <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 pt-6">
        <div className="flex justify-between items-end mb-6">
          <div>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-bold text-foreground tracking-tight">${lastValue.toFixed(2)}</span>
              <span className={`text-sm font-medium px-2 py-0.5 rounded ${isPositive ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                {isPositive ? '+' : ''}{change.toFixed(2)}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Global Spot Price • Real-time</p>
          </div>
          
          <div className="hidden sm:flex gap-4 text-right">
             <div>
               <p className="text-[10px] text-muted-foreground uppercase">High (24h)</p>
               <p className="text-sm font-medium text-foreground">${(lastValue * 1.01).toFixed(2)}</p>
             </div>
             <div>
               <p className="text-[10px] text-muted-foreground uppercase">Low (24h)</p>
               <p className="text-sm font-medium text-foreground">${(lastValue * 0.99).toFixed(2)}</p>
             </div>
             <div>
               <p className="text-[10px] text-muted-foreground uppercase">Vol</p>
               <p className="text-sm font-medium text-foreground">12.5M</p>
             </div>
          </div>
        </div>

        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={currentData}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
              <XAxis dataKey="time" hide />
              <YAxis 
                domain={['auto', 'auto']} 
                orientation="right" 
                tick={{fill: 'rgba(0,0,0,0.4)', fontSize: 10}}
                tickFormatter={(val) => `$${val.toFixed(0)}`}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', borderColor: 'rgba(0,0,0,0.1)', color: '#000' }}
                itemStyle={{ color: '#D4AF37' }}
                formatter={(value: number) => [`$${value.toFixed(2)}`, 'Price']}
                labelFormatter={() => ''}
                cursor={{ stroke: 'rgba(0,0,0,0.1)', strokeWidth: 1 }}
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#D4AF37" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorValue)" 
                animationDuration={1000}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
