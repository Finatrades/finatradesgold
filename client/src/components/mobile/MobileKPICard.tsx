import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface MobileKPICardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  subValue?: string;
  gradient: 'purple' | 'amber' | 'emerald' | 'blue' | 'pink' | 'teal';
  delay?: number;
  onClick?: () => void;
}

const gradientStyles = {
  purple: {
    bg: 'bg-white/80 backdrop-blur-xl',
    border: 'border-purple-200/50',
    iconBg: 'bg-gradient-to-br from-purple-500 to-violet-600',
    iconColor: 'text-white',
    subColor: 'text-purple-600',
    glow: 'shadow-purple-200/50',
  },
  amber: {
    bg: 'bg-white/80 backdrop-blur-xl',
    border: 'border-amber-200/50',
    iconBg: 'bg-gradient-to-br from-amber-400 to-orange-500',
    iconColor: 'text-white',
    subColor: 'text-amber-600',
    glow: 'shadow-amber-200/50',
  },
  emerald: {
    bg: 'bg-white/80 backdrop-blur-xl',
    border: 'border-emerald-200/50',
    iconBg: 'bg-gradient-to-br from-emerald-400 to-green-600',
    iconColor: 'text-white',
    subColor: 'text-emerald-600',
    glow: 'shadow-emerald-200/50',
  },
  blue: {
    bg: 'bg-white/80 backdrop-blur-xl',
    border: 'border-blue-200/50',
    iconBg: 'bg-gradient-to-br from-blue-400 to-indigo-600',
    iconColor: 'text-white',
    subColor: 'text-blue-600',
    glow: 'shadow-blue-200/50',
  },
  pink: {
    bg: 'bg-white/80 backdrop-blur-xl',
    border: 'border-pink-200/50',
    iconBg: 'bg-gradient-to-br from-pink-400 to-rose-600',
    iconColor: 'text-white',
    subColor: 'text-pink-600',
    glow: 'shadow-pink-200/50',
  },
  teal: {
    bg: 'bg-white/80 backdrop-blur-xl',
    border: 'border-teal-200/50',
    iconBg: 'bg-gradient-to-br from-teal-400 to-cyan-600',
    iconColor: 'text-white',
    subColor: 'text-teal-600',
    glow: 'shadow-teal-200/50',
  },
};

export default function MobileKPICard({
  icon: Icon,
  label,
  value,
  subValue,
  gradient,
  delay = 0,
  onClick,
}: MobileKPICardProps) {
  const style = gradientStyles[gradient];
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        delay: delay * 0.08, 
        type: "spring", 
        stiffness: 300, 
        damping: 25 
      }}
      whileTap={onClick ? { scale: 0.96 } : undefined}
      whileHover={onClick ? { y: -2 } : undefined}
      onClick={onClick}
      className={`relative overflow-hidden p-4 ${style.bg} border ${style.border} rounded-2xl shadow-lg ${style.glow} mobile-card ${onClick ? 'cursor-pointer active:shadow-md' : ''} transition-shadow duration-200`}
    >
      <div className="absolute -top-6 -right-6 w-20 h-20 bg-gradient-to-br from-white/40 to-transparent rounded-full blur-2xl" />
      <div className="relative z-10">
        <div className="flex items-center gap-2.5 mb-2">
          <motion.div 
            className={`w-10 h-10 rounded-xl ${style.iconBg} flex items-center justify-center shadow-lg`}
            whileHover={{ rotate: [0, -10, 10, 0] }}
            transition={{ duration: 0.4 }}
          >
            <Icon className={`w-5 h-5 ${style.iconColor}`} />
          </motion.div>
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">{label}</p>
        </div>
        <p className="text-xl font-bold text-gray-900 tracking-tight">{value}</p>
        {subValue && (
          <p className={`text-[11px] font-semibold ${style.subColor} mt-0.5`}>{subValue}</p>
        )}
      </div>
    </motion.div>
  );
}
