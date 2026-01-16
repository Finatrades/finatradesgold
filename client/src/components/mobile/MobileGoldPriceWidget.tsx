import React from 'react';
import { TrendingUp, TrendingDown, Sparkles, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

interface MobileGoldPriceWidgetProps {
  pricePerGram: number;
  pricePerOunce?: number;
  isLive?: boolean;
  lastUpdated?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export default function MobileGoldPriceWidget({
  pricePerGram,
  pricePerOunce,
  isLive = true,
  lastUpdated,
  onRefresh,
  isRefreshing = false,
}: MobileGoldPriceWidgetProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 via-fuchsia-600 to-pink-500 p-4 shadow-lg"
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-6 -mt-6"></div>
      <div className="absolute bottom-0 left-0 w-20 h-20 bg-black/10 rounded-full blur-xl -ml-6 -mb-6"></div>
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm">LGPW</h3>
              <p className="text-white/60 text-[10px]">Live Gold Price</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isLive && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-white/20 backdrop-blur rounded-full">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                <span className="text-white text-[10px] font-medium">Live</span>
              </span>
            )}
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-white ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
        </div>
        
        <div className="space-y-3">
          <div>
            <p className="text-white/70 text-xs mb-1">Available</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white tracking-tight">
                0.0000<span className="text-lg">g</span>
              </span>
            </div>
            <p className="text-white/60 text-xs mt-1">≈ $0.00</p>
          </div>
          
          <div className="flex gap-4 pt-3 border-t border-white/20">
            <div className="flex-1">
              <p className="text-white/60 text-[10px]">Pending</p>
              <p className="text-white font-semibold text-sm">0.0000g</p>
            </div>
            <div className="flex-1">
              <p className="text-white/60 text-[10px]">Locked</p>
              <p className="text-white font-semibold text-sm">0.0000g</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
