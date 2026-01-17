import React from 'react';
import { motion } from 'framer-motion';
import { Plus, ShoppingCart, Send, ArrowDownLeft, TrendingUp, Database, ExternalLink, CreditCard } from 'lucide-react';
import { useLocation } from 'wouter';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { apiRequest } from '@/lib/queryClient';

interface QuickAction {
  icon: React.ReactNode;
  label: string;
  description: string;
  gradient: string;
  onClick: () => void;
}

interface MobileQuickActionsProps {
  onClose: () => void;
  onOpenDeposit?: () => void;
  onOpenSend?: () => void;
  onOpenRequest?: () => void;
  onOpenBuyGold?: () => void;
}

export default function MobileQuickActions({ 
  onClose, 
  onOpenDeposit,
  onOpenSend,
  onOpenRequest,
  onOpenBuyGold
}: MobileQuickActionsProps) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  
  const isKycApproved = user?.kycStatus === 'Approved';

  const handleWingoldSSO = async () => {
    try {
      toast.info('Connecting to Wingold Portal...');
      const res = await apiRequest('GET', '/api/sso/wingold');
      const data = await res.json();
      
      if (data.redirectUrl) {
        window.open(data.redirectUrl, '_blank');
      }
    } catch (error) {
      toast.error('Unable to connect to Wingold Portal');
    }
    onClose();
  };

  const handleAction = (action: () => void, requiresKyc: boolean = true) => {
    if (requiresKyc && !isKycApproved) {
      toast.error('Please complete KYC verification first');
      setLocation('/kyc');
      onClose();
      return;
    }
    action();
  };

  const actions: QuickAction[] = [
    {
      icon: <Plus className="w-6 h-6" />,
      label: 'Add Funds',
      description: 'Deposit money to your wallet',
      gradient: 'from-emerald-500 to-green-600',
      onClick: () => handleAction(() => { onOpenDeposit?.(); onClose(); }),
    },
    {
      icon: <ShoppingCart className="w-6 h-6" />,
      label: 'Buy Gold',
      description: 'Purchase gold bars',
      gradient: 'from-amber-500 to-yellow-600',
      onClick: () => handleAction(() => { onOpenBuyGold?.(); onClose(); }),
    },
    {
      icon: <Send className="w-6 h-6" />,
      label: 'Send',
      description: 'Transfer gold to others',
      gradient: 'from-purple-500 to-fuchsia-600',
      onClick: () => handleAction(() => { onOpenSend?.(); onClose(); }),
    },
    {
      icon: <ArrowDownLeft className="w-6 h-6" />,
      label: 'Request',
      description: 'Request payment',
      gradient: 'from-pink-500 to-rose-600',
      onClick: () => handleAction(() => { onOpenRequest?.(); onClose(); }),
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      label: 'BNSL',
      description: 'Buy Now Sell Later',
      gradient: 'from-violet-500 to-purple-600',
      onClick: () => handleAction(() => { setLocation('/bnsl'); onClose(); }),
    },
    {
      icon: <Database className="w-6 h-6" />,
      label: 'Vault',
      description: 'FinaVault storage',
      gradient: 'from-teal-500 to-cyan-600',
      onClick: () => handleAction(() => { setLocation('/finavault'); onClose(); }),
    },
    {
      icon: <CreditCard className="w-6 h-6" />,
      label: 'FinaCard',
      description: 'Gold-backed card',
      gradient: 'from-gray-500 to-slate-600',
      onClick: () => handleAction(() => { setLocation('/finacard'); onClose(); }),
    },
    {
      icon: <ExternalLink className="w-6 h-6" />,
      label: 'Wingold',
      description: 'Partner portal',
      gradient: 'from-orange-500 to-amber-600',
      onClick: () => handleAction(handleWingoldSSO),
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-4 py-2">
      {actions.map((action, index) => (
        <motion.button
          key={action.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.04 }}
          whileTap={{ scale: 0.92 }}
          onClick={action.onClick}
          className="flex flex-col items-center gap-2.5 p-2 touch-target"
          data-testid={`button-quick-${action.label.toLowerCase().replace(' ', '-')}`}
        >
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${action.gradient} flex items-center justify-center text-white shadow-lg haptic-press`}>
            {action.icon}
          </div>
          <span className="text-[11px] font-semibold text-gray-700 text-center leading-tight">{action.label}</span>
        </motion.button>
      ))}
    </div>
  );
}
