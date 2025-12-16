import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp, Maximize2, BarChart2, Activity, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GoldPriceData {
  pricePerGram: number;
  pricePerOunce: number;
  currency: string;
  timestamp: string;
  source: string;
}

interface ChartDataPoint {
  time: string;
  value: number;
  timestamp: Date;
}

export default function LiveGoldChart() {
  const [range, setRange] = useState('24H');
  const [chartType, setChartType] = useState<'area' | 'candle'>('area');
  const [currentPrice, setCurrentPrice] = useState<GoldPriceData | null>(null);
  const [priceHistory, setPriceHistory] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchGoldPrice = useCallback(async () => {
    try {
      const response = await fetch('/api/gold-price');
      if (response.ok) {
        const data: GoldPriceData = await response.json();
        setCurrentPrice(data);
        setLastUpdate(new Date());
        
        setPriceHistory(prev => {
          const newPoint: ChartDataPoint = {
            time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            value: data.pricePerOunce,
            timestamp: new Date()
          };
          
          const updated = [...prev, newPoint];
          
          const now = new Date();
          let cutoffTime: Date;
          
          switch(range) {
            case '24H':
              cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
              break;
            case '7D':
              cutoffTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              break;
            case '30D':
              cutoffTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
              break;
            default:
              cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          }
          
          return updated.filter(p => p.timestamp >= cutoffTime).slice(-100);
        });
      }
    } catch (error) {
      console.error('Failed to fetch gold price:', error);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchGoldPrice();
    
    const interval = setInterval(fetchGoldPrice, 30000);
    
    return () => clearInterval(interval);
  }, [fetchGoldPrice]);

  useEffect(() => {
    setPriceHistory([]);
  }, [range]);

  const displayData = priceHistory.length > 0 ? priceHistory : 
    currentPrice ? [{ time: 'Now', value: currentPrice.pricePerOunce, timestamp: new Date() }] : [];

  const lastValue = displayData.length > 0 ? displayData[displayData.length - 1].value : 0;
  const startValue = displayData.length > 1 ? displayData[0].value : lastValue;
  const change = startValue !== 0 ? ((lastValue - startValue) / startValue) * 100 : 0;
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
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={fetchGoldPrice}
            disabled={loading}
          >
             <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
             <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 pt-6">
        <div className="flex justify-between items-end mb-6">
          <div>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-bold text-foreground tracking-tight">
                ${loading && !currentPrice ? '---' : lastValue.toFixed(2)}
              </span>
              {displayData.length > 1 && (
                <span className={`text-sm font-medium px-2 py-0.5 rounded ${isPositive ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                  {isPositive ? '+' : ''}{change.toFixed(2)}%
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-muted-foreground">
                {currentPrice?.source ? `Source: ${currentPrice.source}` : 'Global Spot Price'} • 
                {lastUpdate ? ` Updated ${lastUpdate.toLocaleTimeString()}` : ' Loading...'}
              </p>
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" title="Live"></span>
            </div>
          </div>
          
          <div className="hidden sm:flex gap-4 text-right">
             <div>
               <p className="text-[10px] text-muted-foreground uppercase">Per Gram</p>
               <p className="text-sm font-medium text-foreground">
                 ${currentPrice?.pricePerGram?.toFixed(2) || '---'}
               </p>
             </div>
             <div>
               <p className="text-[10px] text-muted-foreground uppercase">Per Ounce</p>
               <p className="text-sm font-medium text-foreground">
                 ${currentPrice?.pricePerOunce?.toFixed(2) || '---'}
               </p>
             </div>
             <div>
               <p className="text-[10px] text-muted-foreground uppercase">Currency</p>
               <p className="text-sm font-medium text-foreground">{currentPrice?.currency || 'USD'}</p>
             </div>
          </div>
        </div>

        <div className="h-[250px] w-full">
          {displayData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={displayData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F97316" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#F97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                <XAxis 
                  dataKey="time" 
                  tick={{fill: 'rgba(0,0,0,0.4)', fontSize: 10}}
                  axisLine={false}
                  tickLine={false}
                />
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
                  itemStyle={{ color: '#F97316' }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, 'Price']}
                  labelFormatter={(label) => `Time: ${label}`}
                  cursor={{ stroke: 'rgba(0,0,0,0.1)', strokeWidth: 1 }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#F97316" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorValue)" 
                  animationDuration={1000}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              {loading ? 'Loading live prices...' : 'Waiting for price data...'}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
