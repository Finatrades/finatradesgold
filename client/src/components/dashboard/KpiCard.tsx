import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface KpiCardProps {
  title: string;
  value: string;
  definition?: string;
  subValue?: string;
  icon?: React.ReactNode;
  delay?: number;
}

export default function KpiCard({ title, value, definition, subValue, icon, delay = 0 }: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: delay * 0.05 }}
      whileHover={{ scale: 1.02 }}
    >
      <Card className="h-full p-4 bg-white/5 border border-white/10 backdrop-blur-sm hover:border-[#D4AF37]/50 transition-colors group relative overflow-hidden">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-white/60">{title}</h3>
            {definition && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-3.5 h-3.5 text-white/30 hover:text-white/60 transition-colors" />
                  </TooltipTrigger>
                  <TooltipContent className="bg-[#1A0A2E] border-white/10 text-white text-xs max-w-xs">
                    <p>{definition}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          {icon && <div className="text-[#D4AF37] opacity-80">{icon}</div>}
        </div>
        
        <div className="space-y-1">
          <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
          {subValue && (
            <p className="text-xs text-[#D4AF37] font-medium">{subValue}</p>
          )}
        </div>
        
        {/* Glow effect on hover */}
        <div className="absolute inset-0 bg-gradient-to-tr from-[#D4AF37]/0 via-[#D4AF37]/0 to-[#D4AF37]/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      </Card>
    </motion.div>
  );
}
