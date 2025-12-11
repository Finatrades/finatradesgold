import React from 'react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { ShoppingCart, Banknote, Send, ArrowDownLeft, TrendingUp, Briefcase } from 'lucide-react';

interface QuickActionsProps {
  onAction: (action: string) => void;
}

export default function QuickActions({ onAction }: QuickActionsProps) {
  const actions = [
    { id: 'buy', label: 'Buy Gold', icon: <ShoppingCart className="w-6 h-6" />, color: 'text-[#D4AF37]', shadow: 'shadow-[0_0_20px_rgba(212,175,55,0.4)]', bg: 'bg-[#D4AF37]/20', border: 'border-[#D4AF37]/50' },
    { id: 'sell', label: 'Sell Gold', icon: <Banknote className="w-6 h-6" />, color: 'text-red-500', shadow: 'shadow-[0_0_20px_rgba(239,68,68,0.4)]', bg: 'bg-red-500/20', border: 'border-red-500/50' },
    { id: 'send', label: 'Send USD', icon: <Send className="w-6 h-6" />, color: 'text-green-500', shadow: 'shadow-[0_0_20px_rgba(34,197,94,0.4)]', bg: 'bg-green-500/20', border: 'border-green-500/50' },
    { id: 'request', label: 'Request', icon: <ArrowDownLeft className="w-6 h-6" />, color: 'text-blue-500', shadow: 'shadow-[0_0_20px_rgba(59,130,246,0.4)]', bg: 'bg-blue-500/20', border: 'border-blue-500/50' },
    { id: 'bnsl', label: 'BNSL Plans', icon: <TrendingUp className="w-6 h-6" />, color: 'text-[#FF2FBF]', shadow: 'shadow-[0_0_20px_rgba(255,47,191,0.4)]', bg: 'bg-[#FF2FBF]/20', border: 'border-[#FF2FBF]/50' },
    { id: 'trade', label: 'FinaBridge', icon: <Briefcase className="w-6 h-6" />, color: 'text-[#4CAF50]', shadow: 'shadow-[0_0_20px_rgba(76,175,80,0.4)]', bg: 'bg-[#4CAF50]/20', border: 'border-[#4CAF50]/50' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {actions.map((action, index) => (
        <motion.button
          key={action.id}
          whileHover={{ scale: 1.05, y: -5 }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05, type: 'spring', stiffness: 300 }}
          onClick={() => onAction(action.id)}
          className="relative group h-32 w-full rounded-2xl overflow-hidden bg-white/5 border border-white/10 backdrop-blur-md hover:border-white/30 transition-all duration-300"
        >
          {/* Hover Glow Background */}
          <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-b from-transparent to-${action.bg.split('/')[0].replace('bg-', '')}/10`} />
          
          <div className="relative z-10 h-full flex flex-col items-center justify-center gap-3">
             <div className={`p-3 rounded-xl ${action.bg} ${action.border} border ${action.color} ${action.shadow} group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
               {action.icon}
             </div>
             <span className="text-sm font-semibold text-white/70 group-hover:text-white tracking-wide">{action.label}</span>
          </div>
        </motion.button>
      ))}
    </div>
  );
}
