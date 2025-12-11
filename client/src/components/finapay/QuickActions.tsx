import React from 'react';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Banknote, Send, ArrowDownLeft, TrendingUp, Briefcase } from 'lucide-react';
import { motion } from 'framer-motion';

interface QuickActionsProps {
  onAction: (action: string) => void;
}

export default function QuickActions({ onAction }: QuickActionsProps) {
  
  const actions = [
    { id: 'add_fund', label: 'Add Funds', icon: <ShoppingCart className="w-4 h-4" />, color: 'text-green-400', bg: 'bg-green-400/10' },
    { id: 'buy_gold', label: 'Buy Gold', icon: <Briefcase className="w-4 h-4" />, color: 'text-[#D4AF37]', bg: 'bg-[#D4AF37]/10' },
    { id: 'sell', label: 'Sell Gold', icon: <Banknote className="w-4 h-4" />, color: 'text-red-400', bg: 'bg-red-400/10' },
    { id: 'send', label: 'Send Gold', icon: <Send className="w-4 h-4" />, color: 'text-orange-400', bg: 'bg-orange-400/10' },
    { id: 'request', label: 'Request', icon: <ArrowDownLeft className="w-4 h-4" />, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { id: 'bnsl', label: 'BNSL Invest', icon: <TrendingUp className="w-4 h-4" />, color: 'text-[#FF2FBF]', bg: 'bg-[#FF2FBF]/10' },
    { id: 'trade', label: 'Trade Finance', icon: <Briefcase className="w-4 h-4" />, color: 'text-[#D4AF37]', bg: 'bg-[#D4AF37]/10' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
      {actions.map((action) => (
        <motion.button
          key={action.id}
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onAction(action.id)}
          className="flex flex-col items-center justify-center p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all gap-2 group"
        >
          <div className={`p-3 rounded-full ${action.bg} ${action.color} group-hover:scale-110 transition-transform`}>
            {action.icon}
          </div>
          <span className="text-xs font-medium text-white/80 group-hover:text-white transition-colors">
            {action.label}
          </span>
        </motion.button>
      ))}
    </div>
  );
}
