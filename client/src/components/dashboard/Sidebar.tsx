import React from 'react';
import { Link, useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Wallet, 
  Database, 
  TrendingUp, 
  BarChart3, 
  CreditCard,
  User, 
  Settings, 
  LogOut,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useAccountType } from '@/context/AccountTypeContext';
import { Button } from '@/components/ui/button';

export default function Sidebar({ isOpen, setIsOpen }: { isOpen: boolean, setIsOpen: (v: boolean) => void }) {
  const [location] = useLocation();
  const { logout, user } = useAuth();
  const { accountType } = useAccountType();

  const menuItems = [
    { icon: <LayoutDashboard className="w-5 h-5" />, label: 'Dashboard', href: '/dashboard' },
    { icon: <Wallet className="w-5 h-5" />, label: 'FinaPay Wallet', href: '/finapay' },
    { icon: <Database className="w-5 h-5" />, label: 'FinaVault', href: '/finavault' },
    { icon: <TrendingUp className="w-5 h-5" />, label: 'BNSL Plans', href: '/bnsl' },
    ...(accountType === 'business' ? [{ icon: <BarChart3 className="w-5 h-5" />, label: 'FinaBridge', href: '/finabridge' }] : []),
    { icon: <CreditCard className="w-5 h-5" />, label: 'FinaCard', href: '/finacard' },
    { icon: <User className="w-5 h-5" />, label: 'Profile', href: '/profile' },
    { icon: <Settings className="w-5 h-5" />, label: 'Settings', href: '/dashboard/settings' },
  ];

  if (user?.kycStatus === 'Not Started' || user?.kycStatus === 'In Progress') {
    menuItems.splice(1, 0, { 
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

          <div className="flex-1 overflow-y-auto py-6 px-3 space-y-1 custom-scrollbar">
            {menuItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <div 
                  className={`relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer group ${
                    isActive(item.href) 
                      ? 'bg-white/15 text-[#D4AF37]' 
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                  onClick={() => setIsOpen(false)}
                  data-testid={`sidebar-link-${item.href.replace('/', '')}`}
                >
                  <div className={`${isActive(item.href) ? 'text-[#D4AF37]' : 'text-white/60 group-hover:text-white'}`}>
                    {item.icon}
                  </div>
                  <span className="font-medium text-sm">{item.label}</span>
                  {isActive(item.href) && (
                    <motion.div 
                      layoutId="sidebar-active"
                      className="absolute left-0 w-1 h-8 bg-gradient-to-b from-[#D4AF37] to-[#F4E4BC] rounded-r-full"
                    />
                  )}
                </div>
              </Link>
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
