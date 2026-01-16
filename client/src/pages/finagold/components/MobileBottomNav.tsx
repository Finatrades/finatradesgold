import React from 'react';
import { Link, useLocation } from 'wouter';
import { CreditCard, Shield, TrendingUp, LogIn, Landmark } from 'lucide-react';
import { motion } from 'framer-motion';
import { useMode } from '../context/ModeContext';

interface NavItem {
  icon: React.ReactNode;
  label: string;
  path: string;
}

export default function MobileBottomNav() {
  const [location] = useLocation();
  const { isPersonal } = useMode();

  const personalNavItems: NavItem[] = [
    { icon: <CreditCard className="w-5 h-5" />, label: 'FinaPay', path: '/finagold/finapay' },
    { icon: <Shield className="w-5 h-5" />, label: 'FinaVault', path: '/finagold/finavault' },
    { icon: <TrendingUp className="w-5 h-5" />, label: 'BNSL', path: '/finagold/bnsl' },
    { icon: <LogIn className="w-5 h-5" />, label: 'Login', path: '/sign-in' },
  ];

  const businessNavItems: NavItem[] = [
    { icon: <CreditCard className="w-5 h-5" />, label: 'FinaPay', path: '/finagold/finapay' },
    { icon: <Shield className="w-5 h-5" />, label: 'FinaVault', path: '/finagold/finavault' },
    { icon: <LogIn className="w-5 h-5" />, label: 'Login', path: '/sign-in' },
    { icon: <Landmark className="w-5 h-5" />, label: 'FinaBridge', path: '/finagold/finabridge' },
    { icon: <TrendingUp className="w-5 h-5" />, label: 'BNSL', path: '/finagold/bnsl' },
  ];

  const navItems = isPersonal ? personalNavItems : businessNavItems;

  const isActive = (path: string) => location === path || location.startsWith(path);

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 bg-[#1a0a30] border-t border-purple-900/50 lg:hidden" 
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center justify-around h-16 px-1">
        {navItems.map((item) => {
          const active = isActive(item.path);

          return (
            <Link
              key={item.path}
              href={item.path}
            >
              <motion.div
                whileTap={{ scale: 0.95 }}
                className={`flex flex-col items-center justify-center min-w-[56px] py-1.5 rounded-lg transition-colors ${
                  active ? 'text-amber-400' : 'text-gray-400'
                }`}
                data-testid={`nav-bottom-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <div className={`p-1 rounded-lg transition-all ${active ? 'bg-amber-400/10' : ''}`}>
                  {item.icon}
                </div>
                <span className={`text-[10px] mt-0.5 font-medium ${active ? 'text-amber-400' : 'text-gray-400'}`}>
                  {item.label}
                </span>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
