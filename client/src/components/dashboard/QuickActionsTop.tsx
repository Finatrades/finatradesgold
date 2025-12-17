import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, ShoppingCart, Database, Send, ArrowDownLeft, Lock, TrendingUp } from 'lucide-react';
import { useLocation } from 'wouter';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import DepositModal from '@/components/finapay/modals/DepositModal';
import SendGoldModal from '@/components/finapay/modals/SendGoldModal';
import RequestGoldModal from '@/components/finapay/modals/RequestGoldModal';

const actions = [
  {
    title: 'Add Fund',
    path: '',
    icon: <Plus className="w-4 h-4" />,
    gradient: 'from-emerald-500 to-green-600',
    hoverGradient: 'hover:from-emerald-600 hover:to-green-700',
    requiresKyc: true,
    isModal: true
  },
  {
    title: 'Buy Gold',
    path: '/finapay?highlight=buy',
    icon: <ShoppingCart className="w-4 h-4" />,
    gradient: 'from-amber-400 to-yellow-500',
    hoverGradient: 'hover:from-amber-500 hover:to-yellow-600',
    requiresKyc: true,
    isModal: false
  },
  {
    title: 'Deposit Gold',
    path: '/finavault?tab=new-request&highlight=deposit',
    icon: <Database className="w-4 h-4" />,
    gradient: 'from-teal-500 to-cyan-600',
    hoverGradient: 'hover:from-teal-600 hover:to-cyan-700',
    requiresKyc: true,
    isModal: false
  },
  {
    title: 'Send Payment',
    path: '',
    icon: <Send className="w-4 h-4" />,
    gradient: 'from-orange-500 to-red-500',
    hoverGradient: 'hover:from-orange-600 hover:to-red-600',
    requiresKyc: true,
    isModal: true
  },
  {
    title: 'Request Payment',
    path: '',
    icon: <ArrowDownLeft className="w-4 h-4" />,
    gradient: 'from-pink-500 to-rose-500',
    hoverGradient: 'hover:from-pink-600 hover:to-rose-600',
    requiresKyc: true,
    isModal: true
  },
  {
    title: 'BNSL',
    path: '/bnsl?step=configure',
    icon: <TrendingUp className="w-4 h-4" />,
    gradient: 'from-violet-500 to-purple-600',
    hoverGradient: 'hover:from-violet-600 hover:to-purple-700',
    requiresKyc: true,
    isModal: false
  }
];

export default function QuickActionsTop() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  
  const isKycApproved = user?.kycStatus === 'Approved';
  const kycPending = user?.kycStatus === 'In Progress';

  const { data: walletData } = useQuery({
    queryKey: ['/api/wallet', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const res = await apiRequest('GET', `/api/wallet/${user.id}`);
      return res.json();
    },
    enabled: !!user?.id,
  });

  const walletBalance = parseFloat(walletData?.wallet?.usdBalance || '0');
  const goldBalance = parseFloat(walletData?.wallet?.goldGrams || '0');

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
    
    if (action.isModal) {
      if (action.title === 'Add Fund') {
        setDepositModalOpen(true);
        return;
      }
      if (action.title === 'Send Payment') {
        setSendModalOpen(true);
        return;
      }
      if (action.title === 'Request Payment') {
        setRequestModalOpen(true);
        return;
      }
    }
    
    setLocation(action.path);
  };

  return (
    <>
      <div className="flex flex-wrap gap-3">
        {actions.map((action, index) => {
          const isLocked = action.requiresKyc && !isKycApproved;
          
          return (
            <motion.button
              key={action.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: isLocked ? 1 : 1.02 }}
              whileTap={{ scale: isLocked ? 1 : 0.98 }}
              onClick={() => handleAction(action)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-white font-medium text-sm shadow-md transition-all relative ${
                isLocked 
                  ? 'bg-gray-400 cursor-not-allowed opacity-60' 
                  : `bg-gradient-to-r ${action.gradient} ${action.hoverGradient}`
              }`}
              data-testid={`button-action-${action.title.toLowerCase().replace(' ', '-')}`}
            >
              <span className="flex items-center justify-center w-5 h-5 bg-white/20 rounded">
                {action.icon}
              </span>
              <span className="whitespace-nowrap">{action.title}</span>
              {isLocked && (
                <Lock className="w-3 h-3 ml-1 opacity-70" />
              )}
            </motion.button>
          );
        })}
      </div>
      
      <DepositModal 
        isOpen={depositModalOpen} 
        onClose={() => setDepositModalOpen(false)} 
      />
      
      <SendGoldModal 
        isOpen={sendModalOpen} 
        onClose={() => setSendModalOpen(false)}
        walletBalance={walletBalance}
        goldBalance={goldBalance}
        onConfirm={() => setSendModalOpen(false)}
      />
      
      <RequestGoldModal 
        isOpen={requestModalOpen} 
        onClose={() => setRequestModalOpen(false)}
        onConfirm={() => setRequestModalOpen(false)}
      />
    </>
  );
}
