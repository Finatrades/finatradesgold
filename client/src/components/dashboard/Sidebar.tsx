import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Wallet, 
  Database, 
  TrendingUp, 
  BarChart3, 
  CreditCard,
  User, 
  Shield, 
  LogOut,
  ShieldCheck,
  ChevronDown,
  ArrowLeftRight,
  Receipt,
  Coins,
  History,
  Compass,
  FileText,
  Briefcase,
  Send
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useAccountType } from '@/context/AccountTypeContext';
import { Button } from '@/components/ui/button';

interface MenuItem {
  icon: React.ReactNode;
  label: string;
  href: string;
}

interface MenuGroup {
  title: string;
  items: MenuItem[];
  defaultOpen?: boolean;
}

export default function Sidebar({ isOpen, setIsOpen }: { isOpen: boolean, setIsOpen: (v: boolean) => void }) {
  const [location] = useLocation();
  const { logout, user } = useAuth();
  const { accountType } = useAccountType();

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    'Overview': true,
    'Money Movement': true,
    'FinaVault': true,
    'BNSL': true,
    'FinaBridge': true,
    'Account': false
  });

  const toggleGroup = (title: string) => {
    setExpandedGroups(prev => ({ ...prev, [title]: !prev[title] }));
  };

  const menuGroups: MenuGroup[] = [
    {
      title: 'Overview',
      defaultOpen: true,
      items: [
        { icon: <LayoutDashboard className="w-5 h-5" />, label: 'Dashboard', href: '/dashboard' },
      ]
    },
    {
      title: 'Money Movement',
      defaultOpen: true,
      items: [
        { icon: <Wallet className="w-5 h-5" />, label: 'FinaPay', href: '/finapay' },
        { icon: <Receipt className="w-5 h-5" />, label: 'Transactions', href: '/finapay/transactions' },
      ]
    },
    {
      title: 'FinaVault',
      defaultOpen: true,
      items: [
        { icon: <Database className="w-5 h-5" />, label: 'My Holdings', href: '/finavault' },
        { icon: <History className="w-5 h-5" />, label: 'Vault History', href: '/finavault/history' },
      ]
    },
    {
      title: 'BNSL',
      defaultOpen: true,
      items: [
        { icon: <TrendingUp className="w-5 h-5" />, label: 'My Plans', href: '/bnsl' },
        { icon: <Compass className="w-5 h-5" />, label: 'Explore Plans', href: '/bnsl/explore' },
      ]
    },
    ...(accountType === 'business' ? [{
      title: 'FinaBridge',
      defaultOpen: true,
      items: [
        { icon: <BarChart3 className="w-5 h-5" />, label: 'Overview', href: '/finabridge' },
        { icon: <FileText className="w-5 h-5" />, label: 'Trade Requests', href: '/finabridge/requests' },
        { icon: <Send className="w-5 h-5" />, label: 'Proposals', href: '/finabridge/proposals' },
      ]
    }] : []),
    {
      title: 'Account',
      defaultOpen: false,
      items: [
        { icon: <CreditCard className="w-5 h-5" />, label: 'FinaCard', href: '/finacard' },
        { icon: <User className="w-5 h-5" />, label: 'Profile', href: '/profile' },
        { icon: <Shield className="w-5 h-5" />, label: 'Security', href: '/security' },
      ]
    }
  ];

  if (user?.kycStatus === 'Not Started') {
    menuGroups[0].items.push({ 
      icon: <ShieldCheck className="w-5 h-5" />, 
      label: 'Complete Verification', 
      href: '/kyc' 
    });
  }

  const isActive = (path: string) => location === path;

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
          data-testid="sidebar-overlay"
        />
      )}

      <aside 
        className={`fixed top-0 left-0 h-full w-64 bg-gradient-to-b from-[#0D001E] via-[#2A0055] to-[#4B0082] z-50 transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        data-testid="sidebar"
      >
        <div className="flex flex-col h-full">
          
          <div className="h-20 flex items-center px-6 border-b border-white/10">
            <Link href="/">
              <div className="flex items-center gap-2 cursor-pointer group" data-testid="sidebar-logo">
                <div className="w-10 h-10 bg-gradient-to-br from-[#D4AF37] to-[#F4E4BC] rounded-xl group-hover:scale-105 transition-transform" />
                <span className="text-xl font-bold tracking-tight text-white">Finatrades</span>
              </div>
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto py-4 px-3 space-y-2 custom-scrollbar">
            {menuGroups.map((group) => (
              <div key={group.title} className="space-y-1">
                <button
                  onClick={() => toggleGroup(group.title)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider text-white/40 hover:text-white/60 transition-colors"
                  data-testid={`sidebar-group-${group.title.toLowerCase().replace(' ', '-')}`}
                >
                  <span>{group.title}</span>
                  <ChevronDown 
                    className={`w-4 h-4 transition-transform duration-200 ${
                      expandedGroups[group.title] ? 'rotate-180' : ''
                    }`} 
                  />
                </button>
                
                <AnimatePresence initial={false}>
                  {expandedGroups[group.title] && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      {group.items.map((item) => (
                        <Link key={item.href} href={item.href}>
                          <div 
                            className={`relative flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all cursor-pointer group ${
                              isActive(item.href) 
                                ? 'bg-white/15 text-[#D4AF37]' 
                                : 'text-white/70 hover:text-white hover:bg-white/10'
                            }`}
                            onClick={() => setIsOpen(false)}
                            data-testid={`sidebar-link-${item.href.replace(/\//g, '-').slice(1)}`}
                          >
                            <div className={`${isActive(item.href) ? 'text-[#D4AF37]' : 'text-white/60 group-hover:text-white'}`}>
                              {item.icon}
                            </div>
                            <span className="font-medium text-sm">{item.label}</span>
                            {isActive(item.href) && (
                              <motion.div 
                                layoutId="sidebar-active"
                                className="absolute left-0 w-1 h-6 bg-gradient-to-b from-[#D4AF37] to-[#F4E4BC] rounded-r-full"
                              />
                            )}
                          </div>
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-white/10">
            <div className="mb-4 p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#F4E4BC] flex items-center justify-center text-[#0D001E] font-bold">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{user?.firstName} {user?.lastName}</p>
                  <p className="text-xs text-white/50 capitalize">{accountType} Account</p>
                </div>
              </div>
            </div>
            <Button 
              variant="ghost" 
              className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10"
              onClick={logout}
              data-testid="button-logout"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Log Out
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
