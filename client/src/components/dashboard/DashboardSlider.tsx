import React from 'react';
import { motion } from 'framer-motion';
import { Wallet, Database, TrendingUp, BarChart3, ArrowRight } from 'lucide-react';
import { useLocation } from 'wouter';

const sliderItems = [
  {
    id: 'finapay',
    title: 'FinaPay Wallet',
    path: '/finapay',
    desc: 'Buy, sell, send, and receive digital gold value.',
    icon: <Wallet className="w-6 h-6" />,
    color: 'text-primary',
    bg: 'bg-primary/10',
    border: 'border-primary/20'
  },
  {
    id: 'finavault',
    title: 'FinaVault',
    path: '/finavault',
    desc: 'Track and manage your stored physical gold.',
    icon: <Database className="w-6 h-6" />,
    color: 'text-secondary',
    bg: 'bg-secondary/10',
    border: 'border-secondary/20'
  },
  {
    id: 'bnsl',
    title: 'BNSL',
    path: '/bnsl',
    desc: 'Lock gold to earn structured rewards over time.',
    icon: <TrendingUp className="w-6 h-6" />,
    color: 'text-accent',
    bg: 'bg-accent/10',
    border: 'border-accent/20'
  },
  {
    id: 'margins',
    title: 'BNSL Margins',
    path: '/bnsl',
    desc: 'View margins and projections on your BNSL positions.',
    icon: <BarChart3 className="w-6 h-6" />,
    color: 'text-green-600',
    bg: 'bg-green-500/10',
    border: 'border-green-500/20'
  }
];

export default function DashboardSlider() {
  const [, setLocation] = useLocation();

  return (
    <div className="w-full overflow-x-auto pb-4 pt-2 custom-scrollbar">
      <div className="flex gap-4 min-w-max px-1">
        {sliderItems.map((item) => (
          <motion.div
            key={item.id}
            whileHover={{ scale: 1.02, y: -2 }}
            className={`w-[280px] p-5 rounded-2xl bg-white shadow-sm border border-border cursor-pointer hover:border-secondary/50 transition-colors group`}
            onClick={() => setLocation(item.path)}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${item.bg} ${item.color}`}>
              {item.icon}
            </div>
            <h4 className="text-lg font-bold text-foreground mb-2 group-hover:text-secondary transition-colors">{item.title}</h4>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4 min-h-[40px]">
              {item.desc}
            </p>
            <div className="flex items-center text-xs font-medium text-muted-foreground/60 group-hover:text-foreground transition-colors">
              Access Module <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
