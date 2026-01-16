import React from 'react';
import { useLocation } from 'wouter';
import { Home, Wallet, History, User, Plus, Shield, Clock, Building2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAccountType } from '@/context/AccountTypeContext';

interface NavItem {
  icon: React.ReactNode;
  label: string;
  path: string;
  isCenter?: boolean;
}

interface MobileBottomNavProps {
  onQuickActionClick?: () => void;
}

export default function MobileBottomNav({ onQuickActionClick }: MobileBottomNavProps) {
  const [location, setLocation] = useLocation();
  const { accountType } = useAccountType();

  const personalNavItems: NavItem[] = [
    { icon: <Home className="w-5 h-5" />, label: 'Home', path: '/dashboard' },
    { icon: <Wallet className="w-5 h-5" />, label: 'Wallet', path: '/finapay' },
    { icon: <Plus className="w-6 h-6" />, label: '', path: '', isCenter: true },
    { icon: <Shield className="w-5 h-5" />, label: 'Storage', path: '/finavault' },
    { icon: <Clock className="w-5 h-5" />, label: 'BNSL', path: '/bnsl' },
  ];

  const businessNavItems: NavItem[] = [
    { icon: <Home className="w-5 h-5" />, label: 'Home', path: '/dashboard' },
    { icon: <Building2 className="w-5 h-5" />, label: 'Bridge', path: '/finabridge' },
    { icon: <Plus className="w-6 h-6" />, label: '', path: '', isCenter: true },
    { icon: <History className="w-5 h-5" />, label: 'Activity', path: '/activity' },
    { icon: <User className="w-5 h-5" />, label: 'Profile', path: '/profile' },
  ];

  const navItems = accountType === 'business' ? businessNavItems : personalNavItems;

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location === '/dashboard' || location === '/';
    }
    return location.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg" 
         style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item, index) => {
          if (item.isCenter) {
            return (
              <motion.button
                key="quick-action"
                whileTap={{ scale: 0.9 }}
                onClick={onQuickActionClick}
                className="relative -mt-6 w-14 h-14 rounded-full bg-gradient-to-br from-purple-600 to-fuchsia-600 shadow-lg flex items-center justify-center text-white"
                data-testid="button-mobile-quick-action"
              >
                <Plus className="w-7 h-7" />
                <div className="absolute inset-0 rounded-full bg-white/20 animate-ping opacity-30"></div>
              </motion.button>
            );
          }

          const active = isActive(item.path);

          return (
            <motion.button
              key={item.path}
              whileTap={{ scale: 0.95 }}
              onClick={() => setLocation(item.path)}
              className={`flex flex-col items-center justify-center min-w-[60px] py-1 rounded-lg transition-colors ${
                active ? 'text-purple-600' : 'text-gray-500'
              }`}
              data-testid={`button-nav-${item.label.toLowerCase()}`}
            >
              <div className={`p-1.5 rounded-xl transition-all ${active ? 'bg-purple-100' : ''}`}>
                {item.icon}
              </div>
              <span className={`text-[10px] mt-0.5 font-medium ${active ? 'text-purple-600' : 'text-gray-500'}`}>
                {item.label}
              </span>
              {active && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 w-1 h-1 bg-purple-600 rounded-full"
                  initial={false}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
