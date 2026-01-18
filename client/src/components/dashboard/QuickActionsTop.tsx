import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, ShoppingCart, Database, Send, ArrowDownLeft, Lock, TrendingUp, ExternalLink } from 'lucide-react';
import { useLocation } from 'wouter';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import DepositModal from '@/components/finapay/modals/DepositModal';
import SendGoldModal from '@/components/finapay/modals/SendGoldModal';
import RequestGoldModal from '@/components/finapay/modals/RequestGoldModal';
import BuyGoldWingoldModal from '@/components/finapay/modals/BuyGoldWingoldModal';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import PhysicalGoldDeposit from '@/pages/PhysicalGoldDeposit';

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
    title: 'Buy Gold Bar',
    path: '',
    icon: <ShoppingCart className="w-4 h-4" />,
    gradient: 'from-fuchsia-400 to-yellow-500',
    hoverGradient: 'hover:from-purple-500 hover:to-yellow-600',
    requiresKyc: true,
    isModal: true
  },
  {
    title: 'Deposit Gold',
    path: '',
    icon: <Database className="w-4 h-4" />,
    gradient: 'from-teal-500 to-cyan-600',
    hoverGradient: 'hover:from-teal-600 hover:to-cyan-700',
    requiresKyc: true,
    isModal: true
  },
  {
    title: 'Send Payment',
    path: '',
    icon: <Send className="w-4 h-4" />,
    gradient: 'from-purple-500 to-red-500',
    hoverGradient: 'hover:from-purple-600 hover:to-red-600',
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
  },
  {
    title: 'Wingold Portal',
    path: '',
    icon: <ExternalLink className="w-4 h-4" />,
    gradient: 'from-amber-500 to-yellow-600',
    hoverGradient: 'hover:from-amber-600 hover:to-yellow-700',
    requiresKyc: true,
    isModal: true,
    isExternalSSO: true
  }
];

export default function QuickActionsTop() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [buyGoldModalOpen, setBuyGoldModalOpen] = useState(false);
  const [depositGoldModalOpen, setDepositGoldModalOpen] = useState(false);
  
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

  const handleWingoldSSO = async () => {
    try {
      toast.info('Connecting to Wingold Portal...');
      const res = await apiRequest('GET', '/api/sso/wingold');
      const data = await res.json();
      
      if (data.redirectUrl) {
        window.open(data.redirectUrl, '_blank');
      } else {
        throw new Error('No redirect URL received');
      }
    } catch (error: any) {
      console.error('SSO error:', error);
      toast.error('Connection Failed', {
        description: 'Unable to connect to Wingold Portal. Please try again.',
      });
    }
  };

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
      if (action.title === 'Buy Gold Bar') {
        setBuyGoldModalOpen(true);
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
      if (action.title === 'Wingold Portal') {
        handleWingoldSSO();
        return;
      }
      if (action.title === 'Deposit Gold') {
        setDepositGoldModalOpen(true);
        return;
      }
    }
    
    setLocation(action.path);
  };

  return (
    <>
      {/* Mobile: Horizontal scrollable compact buttons */}
      <div className="md:hidden overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide" data-testid="quick-actions-mobile">
        <div className="flex gap-2 min-w-max">
          {actions.map((action, index) => {
            const isLocked = action.requiresKyc && !isKycApproved;
            
            return (
              <motion.button
                key={action.title}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.03 }}
                whileTap={{ scale: isLocked ? 1 : 0.95 }}
                onClick={() => handleAction(action)}
                className={`flex flex-col items-center justify-center w-16 h-16 rounded-xl text-white font-medium shadow-md transition-all relative ${
                  isLocked 
                    ? 'bg-gray-400 cursor-not-allowed opacity-60' 
                    : `bg-gradient-to-br ${action.gradient}`
                }`}
                data-testid={`button-action-mobile-${action.title.toLowerCase().replace(' ', '-')}`}
              >
                <span className="flex items-center justify-center w-7 h-7 bg-white/20 rounded-lg mb-1">
                  {action.icon}
                </span>
                <span className="text-[10px] leading-tight text-center px-1 truncate w-full">
                  {action.title.split(' ')[0]}
                </span>
                {isLocked && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-gray-600 rounded-full flex items-center justify-center">
                    <Lock className="w-2.5 h-2.5" />
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Desktop: Modern Premium Quick Actions */}
      <div className="hidden md:flex flex-wrap gap-3" data-testid="quick-actions-container">
        {actions.map((action, index) => {
          const isLocked = action.requiresKyc && !isKycApproved;
          
          return (
            <motion.button
              key={action.title}
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ 
                delay: index * 0.05,
                type: "spring",
                stiffness: 300,
                damping: 25
              }}
              whileHover={{ scale: isLocked ? 1 : 1.05, y: isLocked ? 0 : -2 }}
              whileTap={{ scale: isLocked ? 1 : 0.95 }}
              onClick={() => handleAction(action)}
              className={`group flex items-center gap-2.5 px-5 py-3 rounded-xl text-white font-semibold text-sm shadow-lg transition-all duration-300 relative overflow-hidden ${
                isLocked 
                  ? 'bg-gray-400 cursor-not-allowed opacity-60' 
                  : `bg-gradient-to-r ${action.gradient} hover:shadow-xl`
              }`}
              data-testid={`button-action-${action.title.toLowerCase().replace(' ', '-')}`}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-white/10" />
              <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/10 rounded-t-xl" />
              <span className="relative z-10 flex items-center justify-center w-7 h-7 bg-white/25 backdrop-blur-sm rounded-lg shadow-sm group-hover:bg-white/30 transition-colors">
                {action.icon}
              </span>
              <span className="relative z-10 whitespace-nowrap">{action.title}</span>
              {isLocked && (
                <Lock className="relative z-10 w-3.5 h-3.5 ml-1 opacity-80" />
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
      
      <Dialog open={depositGoldModalOpen} onOpenChange={setDepositGoldModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          <PhysicalGoldDeposit />
        </DialogContent>
      </Dialog>
    </>
  );
}
