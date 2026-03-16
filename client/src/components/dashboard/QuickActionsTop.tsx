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
    icon: <Plus className="w-6 h-6" strokeWidth={2} />,
    color: '#7C3AED',
    requiresKyc: true,
    isModal: true
  },
  {
    title: 'Buy Gold Bar',
    path: '',
    icon: <ShoppingCart className="w-6 h-6" strokeWidth={2} />,
    color: '#D97706',
    requiresKyc: true,
    isModal: true
  },
  {
    title: 'Deposit Gold',
    path: '',
    icon: <Database className="w-6 h-6" strokeWidth={2} />,
    color: '#0D9488',
    requiresKyc: true,
    isModal: true
  },
  {
    title: 'Send Payment',
    path: '',
    icon: <Send className="w-6 h-6" strokeWidth={2} />,
    color: '#4F46E5',
    requiresKyc: true,
    isModal: true
  },
  {
    title: 'Request Payment',
    path: '',
    icon: <ArrowDownLeft className="w-6 h-6" strokeWidth={2} />,
    color: '#DC2626',
    requiresKyc: true,
    isModal: true
  },
  {
    title: 'BNSL',
    path: '/bnsl?step=configure',
    icon: <TrendingUp className="w-6 h-6" strokeWidth={2} />,
    color: '#7C3AED',
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
      {/* Mobile: Horizontally scrollable */}
      <div className="md:hidden overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide" data-testid="quick-actions-mobile">
        <div className="flex gap-3 min-w-max">
          {actions.map((action, index) => {
            const isLocked = action.requiresKyc && !isKycApproved;
            
            return (
              <motion.button
                key={action.title}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.03 }}
                whileTap={{ scale: isLocked ? 1 : 0.93 }}
                onClick={() => handleAction(action)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full font-semibold text-sm transition-all border-2 whitespace-nowrap relative"
                style={{
                  backgroundColor: isLocked ? '#f3f4f6' : `${action.color}10`,
                  borderColor: isLocked ? '#e5e7eb' : `${action.color}30`,
                  color: isLocked ? '#9ca3af' : action.color,
                }}
                data-testid={`button-action-mobile-${action.title.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <span className="w-6 h-6 flex items-center justify-center shrink-0">
                  {action.icon}
                </span>
                <span className="text-xs font-semibold">{action.title}</span>
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

      {/* Desktop: Uniform pill buttons */}
      <div className="hidden md:flex flex-wrap gap-3" data-testid="quick-actions-container">
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
              whileHover={{ scale: isLocked ? 1 : 1.03, y: isLocked ? 0 : -1 }}
              whileTap={{ scale: isLocked ? 1 : 0.97 }}
              onClick={() => handleAction(action)}
              className="group flex items-center gap-2.5 px-5 py-2.5 rounded-full font-semibold text-sm transition-all duration-200 border-2 cursor-pointer"
              style={{
                backgroundColor: isLocked ? '#f9fafb' : `${action.color}08`,
                borderColor: isLocked ? '#e5e7eb' : `${action.color}25`,
                color: isLocked ? '#9ca3af' : action.color,
              }}
              onMouseEnter={(e) => {
                if (!isLocked) {
                  e.currentTarget.style.backgroundColor = `${action.color}14`;
                  e.currentTarget.style.borderColor = `${action.color}40`;
                  e.currentTarget.style.boxShadow = `0 4px 12px ${action.color}15`;
                }
              }}
              onMouseLeave={(e) => {
                if (!isLocked) {
                  e.currentTarget.style.backgroundColor = `${action.color}08`;
                  e.currentTarget.style.borderColor = `${action.color}25`;
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
              data-testid={`button-action-${action.title.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <span className="w-6 h-6 flex items-center justify-center shrink-0">
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
