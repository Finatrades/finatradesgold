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
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: delay * 0.05 }}
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 min-w-[60px]"
      data-testid={`button-quick-${label.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className={`w-12 h-12 rounded-xl ${gradient} shadow-md flex items-center justify-center`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <span className="text-[10px] font-medium text-gray-600">{label}</span>
    </motion.button>
  );
}
