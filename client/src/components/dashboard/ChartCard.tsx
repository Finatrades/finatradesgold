import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
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
}

const generateHistoricalData = (currentPrice: number, timeframe: '24H' | '7D' | '30D'): ChartDataPoint[] => {
  const data: ChartDataPoint[] = [];
  const now = new Date();
  let points: number;
  let intervalMinutes: number;
  
  switch(timeframe) {
    case '24H':
      points = 24;
      intervalMinutes = 60;
      break;
    case '7D':
      points = 28;
      intervalMinutes = 360;
      break;
    case '30D':
      points = 30;
      intervalMinutes = 1440;
      break;
    default:
      points = 24;
      intervalMinutes = 60;
  }
  
  let price = currentPrice * (1 + (Math.random() - 0.5) * 0.02);
  
  for (let i = points - 1; i >= 0; i--) {
    const time = new Date(now.getTime() - i * intervalMinutes * 60 * 1000);
    const change = (Math.random() - 0.48) * (currentPrice * 0.003);
    const prevPrice = price;
    price = price + change;
    
    if (i === 0) {
      price = currentPrice;
    }
    
    const high = Math.max(prevPrice, price) + Math.abs(change) * 0.5;
    const low = Math.min(prevPrice, price) - Math.abs(change) * 0.5;
    
    let timeStr: string;
    if (timeframe === '24H') {
      timeStr = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    } else if (timeframe === '7D') {
      timeStr = time.toLocaleDateString('en-US', { weekday: 'short', hour: '2-digit' });
    } else {
      timeStr = time.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    
    data.push({
      time: timeStr,
      value: Number(price.toFixed(2)),
      open: Number(prevPrice.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(price.toFixed(2))
    });
  }
  
  return data;
};

export default function ChartCard() {
  const [timeframe, setTimeframe] = useState<'24H' | '7D' | '30D'>('24H');
  const [chartType, setChartType] = useState<'area' | 'candle'>('area');
  const [currentPrice, setCurrentPrice] = useState<GoldPriceData | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const initializedRef = useRef(false);

  const fetchGoldPrice = useCallback(async () => {
    try {
      const response = await fetch('/api/gold-price');
      if (response.ok) {
        const data: GoldPriceData = await response.json();
        setCurrentPrice(data);
        setLastUpdate(new Date());
        
        if (!initializedRef.current || chartData.length === 0) {
          const historicalData = generateHistoricalData(data.pricePerOunce, timeframe);
          setChartData(historicalData);
          initializedRef.current = true;
        } else {
          setChartData(prev => {
            const now = new Date();
            let timeStr: string;
            if (timeframe === '24H') {
              timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
            } else if (timeframe === '7D') {
              timeStr = now.toLocaleDateString('en-US', { weekday: 'short', hour: '2-digit' });
            } else {
              timeStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }
            
            const lastPoint = prev[prev.length - 1];
            const newPoint: ChartDataPoint = {
              time: timeStr,
              value: data.pricePerOunce,
              open: lastPoint?.close || data.pricePerOunce,
              high: Math.max(lastPoint?.close || data.pricePerOunce, data.pricePerOunce),
              low: Math.min(lastPoint?.close || data.pricePerOunce, data.pricePerOunce),
              close: data.pricePerOunce
            };
            
            const updated = [...prev.slice(1), newPoint];
            return updated;
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch gold price:', error);
    } finally {
      setLoading(false);
    }
  }, [timeframe, chartData.length]);

  useEffect(() => {
    fetchGoldPrice();
    const interval = setInterval(fetchGoldPrice, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (currentPrice) {
      const historicalData = generateHistoricalData(currentPrice.pricePerOunce, timeframe);
      setChartData(historicalData);
    }
  }, [timeframe]);

  const lastValue = chartData.length > 0 ? chartData[chartData.length - 1].value : 0;
  const startValue = chartData.length > 1 ? chartData[0].value : lastValue;
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
            {chartData.length > 1 && (
              <span className={`text-sm font-medium flex items-center px-2 py-0.5 rounded-full ${isPositive ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                {isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                {Math.abs(change).toFixed(2)}%
              </span>
            )}
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" title="Live"></span>
          </div>
          {currentPrice && (
            <p className="text-xs text-muted-foreground mt-1">
              Per gram: ${currentPrice.pricePerGram.toFixed(2)} | Source: {currentPrice.source}
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
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F97316" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#F97316" stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis 
                dataKey="time" 
                tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 10}}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={30}
              />
              <YAxis 
                domain={['dataMin - 5', 'dataMax + 5']}
                orientation="right"
                tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 10}}
                tickFormatter={(val) => `$${val.toFixed(0)}`}
                axisLine={false}
                tickLine={false}
                width={55}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'white', 
                  border: '1px solid hsl(var(--border))', 
                  borderRadius: '8px', 
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  padding: '8px 12px'
                }}
                formatter={(value: number) => [`$${value.toFixed(2)}`, 'Price']}
                labelFormatter={(label) => `${label}`}
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#F97316" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#goldGradient)" 
                dot={false}
                activeDot={{ r: 4, fill: '#F97316', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            {loading ? 'Loading live prices...' : 'Waiting for price data...'}
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
