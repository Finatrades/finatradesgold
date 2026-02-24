import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Database, Send, ArrowDownLeft, Lock, TrendingUp, ShoppingCart } from 'lucide-react';
import { useLocation } from 'wouter';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import DepositModal from '@/components/finapay/modals/DepositModal';
import SendGoldModal from '@/components/finapay/modals/SendGoldModal';
import RequestGoldModal from '@/components/finapay/modals/RequestGoldModal';
import BuyGoldBarModal from '@/components/finapay/modals/BuyGoldBarModal';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import PhysicalGoldDeposit from '@/pages/PhysicalGoldDeposit';

const actions = [
  {
    title: 'Add Fund',
    path: '',
    icon: <Plus className="w-[18px] h-[18px]" strokeWidth={2.5} />,
    color: '#8A2BE2',
    bgLight: 'rgba(138, 43, 226, 0.08)',
    bgHover: 'rgba(138, 43, 226, 0.14)',
    requiresKyc: true,
    isModal: true
  },
  {
    title: 'Buy Gold Bar',
    path: '',
    icon: <ShoppingCart className="w-[18px] h-[18px]" strokeWidth={2.5} />,
    color: '#D4A017',
    bgLight: 'rgba(212, 160, 23, 0.08)',
    bgHover: 'rgba(212, 160, 23, 0.14)',
    requiresKyc: true,
    isModal: true
  },
  {
    title: 'Deposit Gold',
    path: '',
    icon: <Database className="w-[18px] h-[18px]" strokeWidth={2.5} />,
    color: '#0D9488',
    bgLight: 'rgba(13, 148, 136, 0.08)',
    bgHover: 'rgba(13, 148, 136, 0.14)',
    requiresKyc: true,
    isModal: true
  },
  {
    title: 'Send Payment',
    path: '',
    icon: <Send className="w-[18px] h-[18px]" strokeWidth={2.5} />,
    color: '#6366F1',
    bgLight: 'rgba(99, 102, 241, 0.08)',
    bgHover: 'rgba(99, 102, 241, 0.14)',
    requiresKyc: true,
    isModal: true
  },
  {
    title: 'Request Payment',
    path: '',
    icon: <ArrowDownLeft className="w-[18px] h-[18px]" strokeWidth={2.5} />,
    color: '#E11D48',
    bgLight: 'rgba(225, 29, 72, 0.08)',
    bgHover: 'rgba(225, 29, 72, 0.14)',
    requiresKyc: true,
    isModal: true
  },
  {
    title: 'BNSL',
    path: '/bnsl?step=configure',
    icon: <TrendingUp className="w-[18px] h-[18px]" strokeWidth={2.5} />,
    color: '#7C3AED',
    bgLight: 'rgba(124, 58, 237, 0.08)',
    bgHover: 'rgba(124, 58, 237, 0.14)',
    requiresKyc: true,
    isModal: false
  },
];

export default function QuickActionsTop() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [depositGoldModalOpen, setDepositGoldModalOpen] = useState(false);
  const [buyGoldBarModalOpen, setBuyGoldBarModalOpen] = useState(false);
  
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
      if (action.title === 'Deposit Gold') {
        setDepositGoldModalOpen(true);
        return;
      }
      if (action.title === 'Buy Gold Bar') {
        setBuyGoldBarModalOpen(true);
        return;
      }
    }
    
    setLocation(action.path);
  };

  return (
    <>
      <div className="md:hidden overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide" data-testid="quick-actions-mobile">
        <div className="flex gap-2.5 min-w-max">
          {actions.map((action, index) => {
            const isLocked = action.requiresKyc && !isKycApproved;
            
            return (
              <motion.button
                key={action.title}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.03 }}
                whileTap={{ scale: isLocked ? 1 : 0.94, y: isLocked ? 0 : 1 }}
                onClick={() => handleAction(action)}
                className="flex flex-col items-center justify-center w-[68px] h-[68px] rounded-2xl font-medium transition-all relative border active:shadow-inner"
                style={{
                  backgroundColor: isLocked ? '#f3f4f6' : action.bgLight,
                  borderColor: isLocked ? '#e5e7eb' : `${action.color}20`,
                  color: isLocked ? '#9ca3af' : action.color,
                }}
                data-testid={`button-action-mobile-${action.title.toLowerCase().replace(' ', '-')}`}
              >
                <span className="flex items-center justify-center w-8 h-8 rounded-xl mb-0.5"
                  style={{ backgroundColor: isLocked ? '#e5e7eb' : `${action.color}15` }}>
                  {action.icon}
                </span>
                <span className="text-[10px] leading-tight text-center font-semibold tracking-tight">
                  {action.title.split(' ')[0]}
                </span>
                {isLocked && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-gray-400 rounded-full flex items-center justify-center">
                    <Lock className="w-2.5 h-2.5 text-white" />
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="hidden md:flex flex-wrap gap-2.5" data-testid="quick-actions-container">
        {actions.map((action, index) => {
          const isLocked = action.requiresKyc && !isKycApproved;
          
          return (
            <motion.button
              key={action.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                delay: index * 0.04,
                type: "spring",
                stiffness: 400,
                damping: 28
              }}
              whileHover={{ scale: isLocked ? 1 : 1.02, y: isLocked ? 0 : -1 }}
              whileTap={{ scale: isLocked ? 1 : 0.96, y: isLocked ? 0 : 0.5 }}
              onClick={() => handleAction(action)}
              className="group flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 border cursor-pointer"
              style={{
                backgroundColor: isLocked ? '#f9fafb' : action.bgLight,
                borderColor: isLocked ? '#e5e7eb' : `${action.color}20`,
                color: isLocked ? '#9ca3af' : action.color,
              }}
              onMouseEnter={(e) => {
                if (!isLocked) {
                  e.currentTarget.style.backgroundColor = action.bgHover;
                  e.currentTarget.style.borderColor = `${action.color}35`;
                  e.currentTarget.style.boxShadow = `0 4px 12px ${action.color}15`;
                }
              }}
              onMouseLeave={(e) => {
                if (!isLocked) {
                  e.currentTarget.style.backgroundColor = action.bgLight;
                  e.currentTarget.style.borderColor = `${action.color}20`;
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
              data-testid={`button-action-${action.title.toLowerCase().replace(' ', '-')}`}
            >
              <span className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors duration-200"
                style={{ backgroundColor: isLocked ? '#e5e7eb' : `${action.color}12` }}>
                {action.icon}
              </span>
              <span className="whitespace-nowrap tracking-tight">{action.title}</span>
              {isLocked && (
                <Lock className="w-3.5 h-3.5 ml-0.5 opacity-60" />
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
      
      <Dialog open={depositGoldModalOpen} onOpenChange={setDepositGoldModalOpen}>
        <DialogContent className="max-w-3xl w-[95vw] max-h-[85vh] overflow-y-auto p-6 rounded-2xl">
          <PhysicalGoldDeposit embedded={true} onSuccess={() => setDepositGoldModalOpen(false)} />
        </DialogContent>
      </Dialog>
      
      <BuyGoldBarModal
        isOpen={buyGoldBarModalOpen}
        onClose={() => setBuyGoldBarModalOpen(false)}
      />
    </>
  );
}
