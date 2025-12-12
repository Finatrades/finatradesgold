import React from 'react';
import { motion } from 'framer-motion';
import { Plus, ShoppingCart, Database, Send, ArrowDownLeft, Lock } from 'lucide-react';
import { useLocation } from 'wouter';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

const actions = [
  {
    title: 'Add Fund',
    path: '/finapay',
    icon: <Plus className="w-5 h-5" />,
    color: 'text-primary',
    bg: 'bg-primary/10 hover:bg-primary/20',
    border: 'border-primary/20',
    requiresKyc: true
  },
  {
    title: 'Buy Gold',
    path: '/finapay',
    icon: <ShoppingCart className="w-5 h-5" />,
    color: 'text-secondary',
    bg: 'bg-secondary/10 hover:bg-secondary/20',
    border: 'border-secondary/30',
    requiresKyc: true
  },
  {
    title: 'Deposit Gold',
    path: '/finavault?tab=new-request',
    icon: <Database className="w-5 h-5" />,
    color: 'text-secondary',
    bg: 'bg-secondary/10 hover:bg-secondary/20',
    border: 'border-secondary/30',
    requiresKyc: true
  },
  {
    title: 'Send Payment',
    path: '/finapay',
    icon: <Send className="w-5 h-5" />,
    color: 'text-orange-600',
    bg: 'bg-orange-500/10 hover:bg-orange-500/20',
    border: 'border-orange-500/30',
    requiresKyc: true
  },
  {
    title: 'Request Payment',
    path: '/finapay',
    icon: <ArrowDownLeft className="w-5 h-5" />,
    color: 'text-accent',
    bg: 'bg-accent/10 hover:bg-accent/20',
    border: 'border-accent/30',
    requiresKyc: true
  }
];

export default function QuickActionsTop() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  
  const isKycApproved = user?.kycStatus === 'Approved';
  const kycPending = user?.kycStatus === 'In Progress';

  const handleAction = (action: typeof actions[0]) => {
    if (action.requiresKyc && !isKycApproved) {
      if (kycPending) {
        toast.error('Approval Pending', {
          description: 'Your verification is under review. You will be notified once approved.',
        });
      } else {
        toast.error('KYC Required', {
          description: 'Please complete your KYC verification to access this feature.',
          action: {
            label: 'Complete KYC',
            onClick: () => setLocation('/kyc')
          }
        });
      }
      return;
    }
    setLocation(action.path);
  };

  return (
    <div className="w-full overflow-x-auto pb-2 custom-scrollbar">
      <div className="flex gap-4 min-w-max">
        {actions.map((action, index) => {
          const isLocked = action.requiresKyc && !isKycApproved;
          
          return (
            <motion.button
              key={action.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: isLocked ? 1 : 1.02, y: isLocked ? 0 : -2 }}
              whileTap={{ scale: isLocked ? 1 : 0.98 }}
              onClick={() => handleAction(action)}
              className={`flex items-center gap-3 px-6 py-4 rounded-xl border backdrop-blur-sm transition-all min-w-[180px] bg-white shadow-sm relative ${
                isLocked 
                  ? 'opacity-60 cursor-not-allowed bg-gray-50 border-gray-200' 
                  : `${action.bg} ${action.border}`
              }`}
              data-testid={`button-action-${action.title.toLowerCase().replace(' ', '-')}`}
            >
              <div className={`p-2 rounded-lg bg-white/50 ${isLocked ? 'text-gray-400' : action.color}`}>
                {action.icon}
              </div>
              <span className={`font-semibold text-sm whitespace-nowrap ${isLocked ? 'text-gray-400' : 'text-foreground'}`}>
                {action.title}
              </span>
              {isLocked && (
                <div className="absolute top-2 right-2">
                  <Lock className="w-3 h-3 text-gray-400" />
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
