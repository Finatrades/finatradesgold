import React from 'react';
import { ShoppingCart, Send, ArrowDownLeft, TrendingUp, Plus, ArrowUpRight, Coins, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';

interface QuickActionsProps {
  onAction: (action: string) => void;
  goldPrice: number;
}

export default function QuickActions({ onAction, goldPrice }: QuickActionsProps) {
  const primaryActions = [
    { 
      id: 'buy', 
      label: 'Buy Gold', 
      icon: <ShoppingCart className="w-5 h-5" />, 
      gradient: 'from-green-500 to-emerald-600',
      description: 'Purchase digital gold'
    },
    { 
      id: 'sell', 
      label: 'Sell Gold', 
      icon: <Coins className="w-5 h-5" />, 
      gradient: 'from-orange-500 to-amber-600',
      description: 'Convert to USD'
    },
    { 
      id: 'send', 
      label: 'Send', 
      icon: <Send className="w-5 h-5" />, 
      gradient: 'from-blue-500 to-indigo-600',
      description: 'Transfer to others'
    },
    { 
      id: 'request', 
      label: 'Request', 
      icon: <ArrowDownLeft className="w-5 h-5" />, 
      gradient: 'from-purple-500 to-violet-600',
      description: 'Request payment'
    },
  ];

  const secondaryActions = [
    { id: 'add_fund', label: 'Deposit USD', icon: <Plus className="w-4 h-4" /> },
    { id: 'withdraw', label: 'Withdraw', icon: <ArrowUpRight className="w-4 h-4" /> },
    { id: 'deposit_gold', label: 'Deposit Gold', icon: <Coins className="w-4 h-4" /> },
    { id: 'bnsl', label: 'BNSL Plans', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'trade', label: 'Trade Finance', icon: <BarChart3 className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-4">
      {/* Primary Actions - Large Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {primaryActions.map((action, index) => (
          <motion.button
            key={action.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onAction(action.id)}
            className={`relative overflow-hidden rounded-xl p-4 text-white bg-gradient-to-br ${action.gradient} shadow-lg hover:shadow-xl transition-shadow`}
            data-testid={`button-${action.id}`}
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10 flex flex-col items-start gap-2">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                {action.icon}
              </div>
              <div>
                <p className="font-semibold text-left">{action.label}</p>
                <p className="text-xs text-white/70 text-left">{action.description}</p>
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Secondary Actions - Compact Row */}
      <div className="flex flex-wrap gap-2">
        {secondaryActions.map((action) => (
          <motion.button
            key={action.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onAction(action.id)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border border-border hover:border-primary/30 hover:bg-primary/5 transition-all text-sm font-medium text-foreground shadow-sm"
            data-testid={`button-${action.id}`}
          >
            <span className="text-muted-foreground">{action.icon}</span>
            {action.label}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
