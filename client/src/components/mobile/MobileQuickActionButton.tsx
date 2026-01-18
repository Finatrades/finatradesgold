import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface MobileQuickActionButtonProps {
  icon: LucideIcon;
  label: string;
  gradient: string;
  onClick?: () => void;
  delay?: number;
}

export default function MobileQuickActionButton({
  icon: Icon,
  label,
  gradient,
  onClick,
  delay = 0,
}: MobileQuickActionButtonProps) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 20, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        delay: delay * 0.06, 
        type: "spring", 
        stiffness: 400, 
        damping: 20 
      }}
      whileTap={{ scale: 0.88 }}
      whileHover={{ y: -3 }}
      onClick={onClick}
      className="flex flex-col items-center gap-2 min-w-[68px] group"
      data-testid={`button-quick-${label.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="relative">
        <motion.div 
          className={`w-14 h-14 rounded-2xl ${gradient} shadow-xl flex items-center justify-center relative overflow-hidden`}
          whileHover={{ boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)" }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-white/20" />
          <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/20 rounded-t-2xl" />
          <Icon className="w-6 h-6 text-white relative z-10 drop-shadow-sm" />
        </motion.div>
        <motion.div 
          className="absolute -inset-1 bg-gradient-to-r from-purple-400/30 to-pink-400/30 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 -z-10 transition-opacity duration-300"
        />
      </div>
      <span className="text-[11px] font-semibold text-gray-700 group-hover:text-gray-900 transition-colors">{label}</span>
    </motion.button>
  );
}
