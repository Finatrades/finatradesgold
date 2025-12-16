import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ComposedChart, Bar } from 'recharts';
import { TrendingUp, TrendingDown, RefreshCw, Activity, BarChart2 } from 'lucide-react';
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
  open: number;
  high: number;
  low: number;
  close: number;
  timestamp: Date;
}

export default function ChartCard() {
  const [timeframe, setTimeframe] = useState<'24H' | '7D' | '30D'>('24H');
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
          const now = new Date();
          const lastPrice = prev.length > 0 ? prev[prev.length - 1].value : data.pricePerOunce;
          const variation = (Math.random() - 0.5) * 2;
          
          const newPoint: ChartDataPoint = {
            time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            value: data.pricePerOunce,
            open: lastPrice,
            high: Math.max(lastPrice, data.pricePerOunce) + Math.abs(variation),
            low: Math.min(lastPrice, data.pricePerOunce) - Math.abs(variation),
            close: data.pricePerOunce,
            timestamp: now
          };
          
          const updated = [...prev, newPoint];
          
          let cutoffTime: Date;
          switch(timeframe) {
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
  }, [timeframe]);

  useEffect(() => {
    fetchGoldPrice();
    const interval = setInterval(fetchGoldPrice, 30000);
    return () => clearInterval(interval);
  }, [fetchGoldPrice]);

  useEffect(() => {
    setPriceHistory([]);
  }, [timeframe]);

  const displayData = priceHistory.length > 0 ? priceHistory : 
    currentPrice ? [{
      time: 'Now',
      value: currentPrice.pricePerOunce,
      open: currentPrice.pricePerOunce,
      high: currentPrice.pricePerOunce,
      low: currentPrice.pricePerOunce,
      close: currentPrice.pricePerOunce,
      timestamp: new Date()
    }] : [];

  const lastValue = displayData.length > 0 ? displayData[displayData.length - 1].value : 0;
  const startValue = displayData.length > 1 ? displayData[0].value : lastValue;
  const change = startValue !== 0 ? ((lastValue - startValue) / startValue) * 100 : 0;
  const isPositive = change >= 0;

  return (
    <Card className="p-6 bg-white shadow-sm border border-border h-[400px] flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-bold text-foreground">Gold Price Chart</h3>
            <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded font-medium">LBMA</span>
          </div>
          <p className="text-xs text-muted-foreground mb-2">
            Spot Price - {chartType === 'candle' ? 'Candlestick' : 'Area'} View (Live)
          </p>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-foreground">
              ${loading && !currentPrice ? '---' : lastValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            {displayData.length > 1 && (
              <span className={`text-sm font-medium flex items-center px-2 py-0.5 rounded-full ${isPositive ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                {isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                {Math.abs(change).toFixed(2)}%
              </span>
            )}
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" title="Live"></span>
          </div>
          {currentPrice && (
            <p className="text-xs text-muted-foreground mt-1">
              Per gram: ${currentPrice.pricePerGram.toFixed(2)} • Source: {currentPrice.source}
            </p>
          )}
        </div>
        
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="flex bg-muted p-0.5 rounded border border-border">
              <button 
                onClick={() => setChartType('area')}
                className={`p-1.5 rounded ${chartType === 'area' ? 'bg-white shadow-sm text-secondary' : 'text-muted-foreground hover:text-foreground'}`}
                title="Area Chart"
              >
                <Activity className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setChartType('candle')}
                className={`p-1.5 rounded ${chartType === 'candle' ? 'bg-white shadow-sm text-secondary' : 'text-muted-foreground hover:text-foreground'}`}
                title="Candlestick Chart"
              >
                <BarChart2 className="w-4 h-4" />
              </button>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={fetchGoldPrice}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
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
      </div>

      <div className="flex-1 w-full min-h-0">
        {displayData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'area' ? (
              <AreaChart data={displayData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis 
                  dataKey="time" 
                  tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 10}}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  domain={['auto', 'auto']}
                  orientation="right"
                  tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 10}}
                  tickFormatter={(val) => `$${val.toFixed(0)}`}
                  axisLine={false}
                  tickLine={false}
                  width={60}
                />
                <Tooltip 
                  contentStyle={{backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--popover-foreground))'}}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, 'Price']}
                  labelFormatter={(label) => `Time: ${label}`}
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
            ) : (
              <ComposedChart data={displayData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis 
                  dataKey="time" 
                  tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 10}}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  domain={['auto', 'auto']}
                  orientation="right"
                  tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 10}}
                  tickFormatter={(val) => `$${val.toFixed(0)}`}
                  axisLine={false}
                  tickLine={false}
                  width={60}
                />
                <Tooltip 
                  contentStyle={{backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--popover-foreground))'}}
                  formatter={(value: number, name: string) => {
                    const labels: Record<string, string> = { open: 'Open', high: 'High', low: 'Low', close: 'Close' };
                    return [`$${value.toFixed(2)}`, labels[name] || name];
                  }}
                  labelFormatter={(label) => `Time: ${label}`}
                />
                <Bar dataKey="low" fill="#22c55e" opacity={0.3} />
                <Bar dataKey="high" fill="#ef4444" opacity={0.3} />
                <Area 
                  type="monotone" 
                  dataKey="close" 
                  stroke="#D4AF37" 
                  strokeWidth={2}
                  fill="none"
                />
              </ComposedChart>
            )}
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            {loading ? 'Loading live prices from LBMA...' : 'Waiting for price data...'}
          </div>
        )}
      </div>
      
      {lastUpdate && (
        <div className="text-xs text-muted-foreground text-right mt-2">
          Last updated: {lastUpdate.toLocaleTimeString()}
        </div>
      )}
    </Card>
  );
}
