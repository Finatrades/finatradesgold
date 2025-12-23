import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, ShoppingCart, Coins, ArrowUpRight, Send, ArrowDownLeft, Lock } from 'lucide-react';
import { useLocation } from 'wouter';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import DepositModal from '@/components/finapay/modals/DepositModal';
import SendGoldModal from '@/components/finapay/modals/SendGoldModal';
import RequestGoldModal from '@/components/finapay/modals/RequestGoldModal';
import BuyGoldWingoldModal from '@/components/finapay/modals/BuyGoldWingoldModal';

const actions = [
  {
    title: 'Add Funds',
    path: '',
    icon: Plus,
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    cardStyle: 'white',
    requiresKyc: true,
    isModal: true
  },
  {
    title: 'Buy Gold Bar',
    path: '',
    icon: ShoppingCart,
    iconBg: 'bg-white/20',
    iconColor: 'text-white',
    cardStyle: 'green',
    requiresKyc: true,
    isModal: true
  },
  {
    title: 'Sell Gold',
    path: '/finapay?action=sell',
    icon: Coins,
    iconBg: 'bg-pink-100',
    iconColor: 'text-pink-600',
    cardStyle: 'white',
    requiresKyc: true,
    isModal: false
  },
  {
    title: 'Withdrawals',
    path: '/finapay?action=withdraw',
    icon: ArrowUpRight,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    cardStyle: 'white',
    requiresKyc: true,
    isModal: false
  },
  {
    title: 'Send Funds',
    path: '',
    icon: Send,
    iconBg: 'bg-cyan-100',
    iconColor: 'text-cyan-600',
    cardStyle: 'white',
    requiresKyc: true,
    isModal: true
  },
  {
    title: 'Request Funds',
    path: '',
    icon: ArrowDownLeft,
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
    cardStyle: 'white',
    requiresKyc: true,
    isModal: true
  }
];

export default function QuickActionsTop() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [buyGoldModalOpen, setBuyGoldModalOpen] = useState(false);
  
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
      if (action.title === 'Add Funds') {
        setDepositModalOpen(true);
        return;
      }
      if (action.title === 'Buy Gold Bar') {
        setBuyGoldModalOpen(true);
        return;
      }
      if (action.title === 'Send Funds') {
        setSendModalOpen(true);
        return;
      }
      if (action.title === 'Request Funds') {
        setRequestModalOpen(true);
        return;
      }
    }
    
    setLocation(action.path);
  };

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {actions.map((action, index) => {
          const isLocked = action.requiresKyc && !isKycApproved;
          const IconComponent = action.icon;
          const isGreen = action.cardStyle === 'green';
          
          return (
            <motion.button
              key={action.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: isLocked ? 1 : 1.02, y: isLocked ? 0 : -2 }}
              whileTap={{ scale: isLocked ? 1 : 0.98 }}
              onClick={() => handleAction(action)}
              className={`relative flex flex-col items-center justify-center gap-3 p-6 rounded-2xl font-medium text-sm shadow-sm border transition-all ${
                isLocked 
                  ? 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-60' 
                  : isGreen
                    ? 'bg-gradient-to-br from-green-500 to-emerald-600 border-green-400 text-white shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/30'
                    : 'bg-white border-gray-100 text-gray-700 hover:border-purple-200 hover:shadow-md'
              }`}
              data-testid={`button-action-${action.title.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <div className={`flex items-center justify-center w-12 h-12 rounded-full ${isGreen ? 'bg-white/20' : action.iconBg}`}>
                <IconComponent className={`w-5 h-5 ${isGreen ? 'text-white' : action.iconColor}`} />
              </div>
              <span className={`whitespace-nowrap font-semibold ${isGreen ? 'text-white' : 'text-gray-700'}`}>
                {action.title}
              </span>
              {isLocked && (
                <div className="absolute top-2 right-2">
                  <Lock className="w-3.5 h-3.5 text-gray-400" />
                </div>
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
      
      <BuyGoldWingoldModal
        isOpen={buyGoldModalOpen}
        onClose={() => setBuyGoldModalOpen(false)}
        onSuccess={() => setBuyGoldModalOpen(false)}
      />
    </>
  );
}
