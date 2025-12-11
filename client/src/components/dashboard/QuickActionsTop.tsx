import React from 'react';
import { motion } from 'framer-motion';
import { Plus, ShoppingCart, Database, Send, ArrowDownLeft } from 'lucide-react';
import { useLocation } from 'wouter';

const actions = [
  {
    title: 'Add Fund',
    path: '/finapay',
    icon: <Plus className="w-5 h-5" />,
    color: 'text-white',
    bg: 'bg-white/10 hover:bg-white/20',
    border: 'border-white/20'
  },
  {
    title: 'Buy Gold',
    path: '/finapay',
    icon: <ShoppingCart className="w-5 h-5" />,
    color: 'text-[#D4AF37]',
    bg: 'bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20',
    border: 'border-[#D4AF37]/30'
  },
  {
    title: 'Deposit Gold',
    path: '/finavault?tab=new-request',
    icon: <Database className="w-5 h-5" />,
    color: 'text-[#D4AF37]',
    bg: 'bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20',
    border: 'border-[#D4AF37]/30'
  },
  {
    title: 'Send Payment',
    path: '/finapay',
    icon: <Send className="w-5 h-5" />,
    color: 'text-[#8A2BE2]',
    bg: 'bg-[#8A2BE2]/10 hover:bg-[#8A2BE2]/20',
    border: 'border-[#8A2BE2]/30'
  },
  {
    title: 'Request Payment',
    path: '/finapay',
    icon: <ArrowDownLeft className="w-5 h-5" />,
    color: 'text-[#FF2FBF]',
    bg: 'bg-[#FF2FBF]/10 hover:bg-[#FF2FBF]/20',
    border: 'border-[#FF2FBF]/30'
  }
];

export default function QuickActionsTop() {
  const [, setLocation] = useLocation();

  return (
    <div className="w-full overflow-x-auto pb-2 custom-scrollbar">
      <div className="flex gap-4 min-w-max">
        {actions.map((action, index) => (
          <motion.button
            key={action.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setLocation(action.path)}
            className={`flex items-center gap-3 px-6 py-4 rounded-xl border backdrop-blur-sm transition-all ${action.bg} ${action.border} min-w-[180px]`}
          >
            <div className={`p-2 rounded-lg bg-black/20 ${action.color}`}>
              {action.icon}
            </div>
            <span className="font-semibold text-white text-sm whitespace-nowrap">
              {action.title}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
