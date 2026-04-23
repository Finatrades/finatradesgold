import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

export default function GoldPriceTicker() {
  const { data: goldData } = useQuery({
    queryKey: ['gold-price-ticker'],
    queryFn: async () => {
      const res = await fetch('/api/gold-price');
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 60000,
    refetchInterval: 60000,
  });

  const price = goldData?.pricePerGram || goldData?.price || goldData?.goldPricePerGram;
  const priceOz = goldData?.pricePerOunce || (price ? price * 31.1035 : null);
  const pricePerOz = priceOz ? Number(priceOz).toFixed(2) : null;

  if (!price) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-[#0D001E] via-[#1A002F] to-[#0D001E] border-b border-purple-800/30"
    >
      <div className="max-w-7xl mx-auto px-6 overflow-hidden">
        <motion.div
          className="flex items-center gap-8 py-1.5"
          animate={{ x: [0, -200, 0] }}
          transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
        >
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-6 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-purple-400 font-medium uppercase tracking-wider">XAU/USD</span>
                <span className="text-xs text-white font-bold">${pricePerOz}</span>
                <TrendingUp className="w-3 h-3 text-green-400" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-purple-400 font-medium uppercase tracking-wider">Gold/g</span>
                <span className="text-xs text-white font-bold">${Number(price).toFixed(2)}</span>
              </div>
              <div className="w-px h-3 bg-purple-700/40" />
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-[10px] text-green-400 font-medium">LIVE</span>
              </div>
              <div className="w-px h-3 bg-purple-700/40" />
            </div>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}
