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
  Menu,
  X,
  ShieldCheck,
  Gift,
  LayoutGrid,
  Building2
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
    { icon: <LayoutGrid className="w-5 h-5" />, label: 'My Dashboard', href: '/my-dashboard' },
    { icon: <Wallet className="w-5 h-5" />, label: 'FinaPay Wallet', href: '/finapay' },
    { icon: <Database className="w-5 h-5" />, label: 'FinaVault', href: '/finavault' },
    { icon: <TrendingUp className="w-5 h-5" />, label: 'BNSL Plans', href: '/bnsl' },
    { icon: <BarChart3 className="w-5 h-5" />, label: 'FinaBridge', href: '/finabridge' },
    { icon: <CreditCard className="w-5 h-5" />, label: 'FinaCard', href: '/finacard' },
    { icon: <Building2 className="w-5 h-5" />, label: 'Bank Accounts', href: '/bank-accounts' },
    { icon: <Gift className="w-5 h-5" />, label: 'Referral Program', href: '/referrals' },
    { icon: <User className="w-5 h-5" />, label: 'Profile', href: '/dashboard/profile' },
    { icon: <Settings className="w-5 h-5" />, label: 'Settings', href: '/dashboard/settings' },
  ];

  // Add KYC menu item if not completed
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
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className={`fixed top-0 left-0 h-full w-64 bg-background border-r border-border z-50 transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          
          {/* Logo Area */}
          <div className="h-20 flex items-center px-6 border-b border-border">
            <Link href="/">
              <div className="flex items-center gap-2 cursor-pointer">
                <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-lg" />
                <span className="text-xl font-bold tracking-tight text-foreground">Finatrades</span>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2 custom-scrollbar">
            {menuItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <div 
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer group ${
                    isActive(item.href) 
                      ? 'bg-secondary/10 text-secondary' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <div className={`${isActive(item.href) ? 'text-secondary' : 'text-muted-foreground group-hover:text-foreground'}`}>
                    {item.icon}
                  </div>
                  <span className="font-medium">{item.label}</span>
                  {isActive(item.href) && (
                    <motion.div 
                      layoutId="sidebar-active"
                      className="absolute left-0 w-1 h-8 bg-secondary rounded-r-full"
                    />
                  )}
                </div>
              </Link>
            ))}
          </div>

          {/* Footer / Logout */}
          <div className="p-4 border-t border-border">
            <Button 
              variant="ghost" 
              className="w-full justify-start text-destructive hover:text-destructive/80 hover:bg-destructive/10"
              onClick={logout}
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
