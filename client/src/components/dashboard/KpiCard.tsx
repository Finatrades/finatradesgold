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
      <Card className="h-full p-4 bg-white shadow-sm border border-border hover:border-secondary/50 transition-colors group relative overflow-hidden">
        <div className="flex justify-between items-start mb-2">
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
          {icon && <div className="text-secondary opacity-80">{icon}</div>}
        </div>
        
        <div className="space-y-1">
          <p className="text-2xl font-bold text-foreground tracking-tight">{value}</p>
          {subValue && (
            <p className="text-xs text-secondary font-medium">{subValue}</p>
          )}
        </div>
        
        {/* Glow effect on hover */}
        <div className="absolute inset-0 bg-gradient-to-tr from-secondary/0 via-secondary/0 to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      </Card>
    </motion.div>
  );
}
