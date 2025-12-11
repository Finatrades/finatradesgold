import React from 'react';
import { motion } from 'framer-motion';
import { Plus, ShoppingCart, Database, Send, ArrowDownLeft } from 'lucide-react';
import { useLocation } from 'wouter';

const actions = [
  {
    title: 'Add Fund',
    path: '/finapay',
    icon: <Plus className="w-5 h-5" />,
    color: 'text-primary',
    bg: 'bg-primary/10 hover:bg-primary/20',
    border: 'border-primary/20'
  },
  {
    title: 'Buy Gold',
    path: '/finapay',
    icon: <ShoppingCart className="w-5 h-5" />,
    color: 'text-secondary',
    bg: 'bg-secondary/10 hover:bg-secondary/20',
    border: 'border-secondary/30'
  },
  {
    title: 'Deposit Gold',
    path: '/finavault?tab=new-request',
    icon: <Database className="w-5 h-5" />,
    color: 'text-secondary',
    bg: 'bg-secondary/10 hover:bg-secondary/20',
    border: 'border-secondary/30'
  },
  {
    title: 'Send Payment',
    path: '/finapay',
    icon: <Send className="w-5 h-5" />,
    color: 'text-orange-600',
    bg: 'bg-orange-500/10 hover:bg-orange-500/20',
    border: 'border-orange-500/30'
  },
  {
    title: 'Request Payment',
    path: '/finapay',
    icon: <ArrowDownLeft className="w-5 h-5" />,
    color: 'text-accent',
    bg: 'bg-accent/10 hover:bg-accent/20',
    border: 'border-accent/30'
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
            className={`flex items-center gap-3 px-6 py-4 rounded-xl border backdrop-blur-sm transition-all ${action.bg} ${action.border} min-w-[180px] bg-white shadow-sm`}
          >
            <div className={`p-2 rounded-lg bg-white/50 ${action.color}`}>
              {action.icon}
            </div>
            <span className="font-semibold text-foreground text-sm whitespace-nowrap">
              {action.title}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
