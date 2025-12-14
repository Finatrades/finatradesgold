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
      whileHover={{ scale: 1.03, y: -4 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card className="h-full p-5 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl shadow-lg shadow-black/5 dark:shadow-black/20 border border-white/50 dark:border-zinc-800/50 hover:border-[#D4AF37]/40 hover:shadow-xl hover:shadow-[#D4AF37]/10 transition-all duration-300 group relative overflow-hidden rounded-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37]/5 via-transparent to-[#F4E4BC]/10 dark:from-[#D4AF37]/10 dark:to-[#F4E4BC]/5 pointer-events-none" />
        
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
              {definition && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-3.5 h-3.5 text-muted-foreground/50 hover:text-muted-foreground transition-colors" />
                    </TooltipTrigger>
                    <TooltipContent className="bg-popover border-border text-popover-foreground text-xs max-w-xs">
                      <p>{definition}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            {icon && (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37]/20 to-[#F4E4BC]/30 dark:from-[#D4AF37]/30 dark:to-[#F4E4BC]/20 flex items-center justify-center text-[#D4AF37] group-hover:scale-110 transition-transform duration-300">
                {icon}
              </div>
            )}
          </div>
          
          <div className="space-y-1">
            <p className="text-2xl font-bold text-foreground tracking-tight">{value}</p>
            {subValue && (
              <p className="text-xs text-amber-700 dark:text-[#D4AF37] font-medium">{subValue}</p>
            )}
          </div>
        </div>
        
        <div className="absolute -bottom-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br from-[#D4AF37]/10 to-[#F4E4BC]/20 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      </Card>
    </motion.div>
  );
}
