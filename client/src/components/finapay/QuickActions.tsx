import React from 'react';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Send, ArrowDownLeft, TrendingUp, Plus, ArrowDown } from 'lucide-react';
import { motion } from 'framer-motion';

interface QuickActionsProps {
  onAction: (action: string) => void;
  goldPrice: number;
}

export default function QuickActions({ onAction, goldPrice }: QuickActionsProps) {
  
  // Calculate estimated rates
  const buyRate = goldPrice * 1.005;  // +0.5%

  const actions = [
    { 
      id: 'add_fund', 
      label: 'Add Fund', 
      icon: <Plus className="w-4 h-4" />, 
      color: 'text-blue-500', 
      bg: 'bg-blue-500/10' 
    },
    { 
      id: 'buy', 
      label: 'Buy Gold', 
      subLabel: `@ $${buyRate.toFixed(2)}`,
      icon: <ShoppingCart className="w-4 h-4" />, 
      color: 'text-green-500', 
      bg: 'bg-green-500/10' 
    },
    { 
      id: 'deposit_gold', 
      label: 'Deposit Gold', 
      icon: <ArrowDown className="w-4 h-4" />, 
      color: 'text-amber-500', 
      bg: 'bg-amber-500/10' 
    },
    { 
      id: 'send', 
      label: 'Send Payment', 
      icon: <Send className="w-4 h-4" />, 
      color: 'text-orange-500', 
      bg: 'bg-orange-500/10' 
    },
    { 
      id: 'request', 
      label: 'Request Payment', 
      icon: <ArrowDownLeft className="w-4 h-4" />, 
      color: 'text-purple-500', 
      bg: 'bg-purple-500/10' 
    },
    { 
      id: 'bnsl', 
      label: 'BNSL', 
      icon: <TrendingUp className="w-4 h-4" />, 
      color: 'text-[#FF2FBF]', 
      bg: 'bg-[#FF2FBF]/10' 
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
      {actions.map((action) => (
        <motion.button
          key={action.id}
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onAction(action.id)}
          className="flex flex-col items-center justify-center p-3 rounded-xl bg-white shadow-sm border border-border hover:bg-muted/50 hover:border-secondary/20 transition-all gap-1.5 group min-h-[100px]"
        >
          <div className={`p-2.5 rounded-full ${action.bg} ${action.color} group-hover:scale-110 transition-transform`}>
            {action.icon}
          </div>
          <div className="text-center">
             <span className="text-xs font-medium text-foreground group-hover:text-secondary transition-colors block">
               {action.label}
             </span>
             {action.subLabel && (
               <span className="text-[10px] text-muted-foreground block mt-0.5 font-mono">
                 {action.subLabel}
               </span>
             )}
          </div>
        </motion.button>
      ))}
    </div>
  );
}
