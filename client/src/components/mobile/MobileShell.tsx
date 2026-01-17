import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import MobileBottomNav from './MobileBottomNav';
import BottomSheet from './BottomSheet';
import MobileQuickActions from './MobileQuickActions';
import DepositModal from '@/components/finapay/modals/DepositModal';
import SendGoldModal from '@/components/finapay/modals/SendGoldModal';
import RequestGoldModal from '@/components/finapay/modals/RequestGoldModal';
import BuyGoldWingoldModal from '@/components/finapay/modals/BuyGoldWingoldModal';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/queryClient';

interface MobileShellProps {
  children: React.ReactNode;
  hideNav?: boolean;
}

export default function MobileShell({ children, hideNav = false }: MobileShellProps) {
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [buyGoldModalOpen, setBuyGoldModalOpen] = useState(false);
  
  const { user } = useAuth();

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

  const [location] = useLocation();
  
  return (
    <div className="min-h-screen bg-gray-50 page-container" style={{ paddingTop: 'var(--safe-area-top)' }}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={location}
          initial={{ opacity: 0, x: 15 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -15 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          {children}
        </motion.div>
      </AnimatePresence>

      {!hideNav && (
        <MobileBottomNav onQuickActionClick={() => setQuickActionsOpen(true)} />
      )}

      <BottomSheet
        isOpen={quickActionsOpen}
        onClose={() => setQuickActionsOpen(false)}
        title="Quick Actions"
      >
        <MobileQuickActions
          onClose={() => setQuickActionsOpen(false)}
          onOpenDeposit={() => setDepositModalOpen(true)}
          onOpenSend={() => setSendModalOpen(true)}
          onOpenRequest={() => setRequestModalOpen(true)}
          onOpenBuyGold={() => setBuyGoldModalOpen(true)}
        />
      </BottomSheet>

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
    </div>
  );
}
