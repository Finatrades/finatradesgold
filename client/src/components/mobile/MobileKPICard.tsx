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
    bg: 'from-purple-50 to-white',
    border: 'border-purple-100',
    iconBg: 'bg-purple-500',
    iconColor: 'text-white',
    subColor: 'text-purple-600',
  },
  amber: {
    bg: 'from-amber-50 to-white',
    border: 'border-amber-100',
    iconBg: 'bg-amber-500',
    iconColor: 'text-white',
    subColor: 'text-amber-600',
  },
  emerald: {
    bg: 'from-emerald-50 to-white',
    border: 'border-emerald-100',
    iconBg: 'bg-emerald-500',
    iconColor: 'text-white',
    subColor: 'text-emerald-600',
  },
  blue: {
    bg: 'from-blue-50 to-white',
    border: 'border-blue-100',
    iconBg: 'bg-blue-500',
    iconColor: 'text-white',
    subColor: 'text-blue-600',
  },
  pink: {
    bg: 'from-pink-50 to-white',
    border: 'border-pink-100',
    iconBg: 'bg-pink-500',
    iconColor: 'text-white',
    subColor: 'text-pink-600',
  },
  teal: {
    bg: 'from-teal-50 to-white',
    border: 'border-teal-100',
    iconBg: 'bg-teal-500',
    iconColor: 'text-white',
    subColor: 'text-teal-600',
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.1 }}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      onClick={onClick}
      className={`relative overflow-hidden p-4 bg-gradient-to-br ${style.bg} border ${style.border} rounded-2xl shadow-sm mobile-card ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-center gap-2.5 mb-2">
        <div className={`w-10 h-10 rounded-xl ${style.iconBg} flex items-center justify-center shadow-sm`}>
          <Icon className={`w-5 h-5 ${style.iconColor}`} />
        </div>
        <p className="text-xs text-gray-600 font-medium">{label}</p>
      </div>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      {subValue && (
        <p className={`text-[11px] font-medium ${style.subColor}`}>{subValue}</p>
      )}
    </motion.div>
  );
}
