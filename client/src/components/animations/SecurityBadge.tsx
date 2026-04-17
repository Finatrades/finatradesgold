import { motion } from 'framer-motion';
import { Shield, Lock, CheckCircle } from 'lucide-react';

interface SecurityBadgeProps {
  type?: 'shield' | 'lock' | 'verified';
  label: string;
  className?: string;
}

const icons = {
  shield: Shield,
  lock: Lock,
  verified: CheckCircle,
};

export default function SecurityBadge({ type = 'shield', label, className = '' }: SecurityBadgeProps) {
  const Icon = icons[type];

  return (
    <motion.div
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/80 backdrop-blur-sm border border-green-200 shadow-sm ${className}`}
      whileHover={{ scale: 1.05, boxShadow: '0 4px 20px rgba(34, 197, 94, 0.15)' }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      <motion.div
        animate={{ 
          scale: [1, 1.15, 1],
        }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Icon className="w-4 h-4 text-green-600" />
      </motion.div>
      <span className="text-xs font-medium text-green-700">{label}</span>
    </motion.div>
  );
}
