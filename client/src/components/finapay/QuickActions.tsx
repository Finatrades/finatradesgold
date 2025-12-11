import React from 'react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { ShoppingCart, Banknote, Send, ArrowDownLeft, TrendingUp, Briefcase } from 'lucide-react';

interface QuickActionsProps {
  onAction: (action: string) => void;
}

export default function QuickActions({ onAction }: QuickActionsProps) {
  const actions = [
    { id: 'buy', label: 'Buy Gold', icon: <ShoppingCart className="w-5 h-5" />, color: 'bg-[#D4AF37]/10 text-[#D4AF37]', border: 'border-[#D4AF37]/20' },
    { id: 'sell', label: 'Sell Gold', icon: <Banknote className="w-5 h-5" />, color: 'bg-red-500/10 text-red-500', border: 'border-red-500/20' },
    { id: 'send', label: 'Send USD', icon: <Send className="w-5 h-5" />, color: 'bg-green-500/10 text-green-500', border: 'border-green-500/20' },
    { id: 'request', label: 'Request', icon: <ArrowDownLeft className="w-5 h-5" />, color: 'bg-blue-500/10 text-blue-500', border: 'border-blue-500/20' },
    { id: 'bnsl', label: 'BNSL Plans', icon: <TrendingUp className="w-5 h-5" />, color: 'bg-[#FF2FBF]/10 text-[#FF2FBF]', border: 'border-[#FF2FBF]/20' },
    { id: 'trade', label: 'FinaBridge', icon: <Briefcase className="w-5 h-5" />, color: 'bg-[#4CAF50]/10 text-[#4CAF50]', border: 'border-[#4CAF50]/20' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {actions.map((action, index) => (
        <motion.button
          key={action.id}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          onClick={() => onAction(action.id)}
          className={`flex flex-col items-center justify-center p-5 rounded-xl border bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all group ${action.border} h-full`}
        >
          <div className={`p-4 rounded-full mb-3 ${action.color} group-hover:scale-110 transition-transform`}>
            {action.icon}
          </div>
          <span className="text-sm font-medium text-white/80 group-hover:text-white">{action.label}</span>
        </motion.button>
      ))}
    </div>
  );
}
