import React from 'react';
import { Link, useLocation } from 'wouter';
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
  History,
  FileText,
  Send,
  X,
  Gift,
  HelpCircle,
  Settings
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useAccountType } from '@/context/AccountTypeContext';
import { Button } from '@/components/ui/button';
import finatradesLogo from '@/assets/finatrades-logo-purple.png';

interface MenuItem {
  icon: React.ReactNode;
  label: string;
  href: string;
  variant?: 'default' | 'danger';
}

export default function Sidebar({ isOpen, setIsOpen }: { isOpen: boolean, setIsOpen: (v: boolean) => void }) {
  const [location] = useLocation();
  const { logout, user } = useAuth();
  const { accountType } = useAccountType();

  const mainMenuItems: MenuItem[] = [
    { icon: <LayoutDashboard className="w-5 h-5" />, label: 'Dashboard', href: '/dashboard' },
    { icon: <Wallet className="w-5 h-5" />, label: 'Wallet', href: '/finapay' },
    { icon: <Database className="w-5 h-5" />, label: 'Gold Storage', href: '/finavault' },
    { icon: <TrendingUp className="w-5 h-5" />, label: 'Buy Now, Sell Later', href: '/bnsl' },
  ];

  const businessMenuItems: MenuItem[] = accountType === 'business' ? [
    { icon: <BarChart3 className="w-5 h-5" />, label: 'Trade Finance', href: '/finabridge' },
    { icon: <FileText className="w-5 h-5" />, label: 'Trade Requests', href: '/finabridge/requests' },
    { icon: <Send className="w-5 h-5" />, label: 'Proposals', href: '/finabridge/proposals' },
    { icon: <History className="w-5 h-5" />, label: 'Trade History', href: '/finabridge/history' },
  ] : [];

  const accountMenuItems: MenuItem[] = [
    { icon: <CreditCard className="w-5 h-5" />, label: 'FinaCard', href: '/finacard' },
    { icon: <Gift className="w-5 h-5" />, label: 'Referral', href: '/referral' },
    { icon: <User className="w-5 h-5" />, label: 'Profile', href: '/profile' },
    { icon: <Shield className="w-5 h-5" />, label: 'Security', href: '/security' },
    { icon: <Settings className="w-5 h-5" />, label: 'Settings', href: '/settings' },
    { icon: <HelpCircle className="w-5 h-5" />, label: 'Help Center', href: '/help' },
  ];

  if (user?.kycStatus === 'Not Started' || user?.kycStatus === 'Rejected') {
    mainMenuItems.splice(1, 0, { 
      icon: <ShieldCheck className="w-5 h-5" />, 
      label: 'Verify Identity', 
      href: '/kyc',
      variant: 'danger'
    });
  }

  const isActive = (path: string) => location === path;

  const renderMenuItem = (item: MenuItem) => {
    const isDanger = item.variant === 'danger';
    return (
      <Link key={item.href} href={item.href}>
        <div 
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer ${
            isActive(item.href) 
              ? isDanger 
                ? 'bg-red-600 text-white shadow-md' 
                : 'bg-primary text-primary-foreground shadow-md'
              : isDanger
                ? 'text-red-600 hover:bg-red-50 hover:text-red-700 font-semibold'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
          }`}
          onClick={() => setIsOpen(false)}
          data-testid={`sidebar-link-${item.href.replace(/\//g, '-').slice(1)}`}
        >
          <div className={isActive(item.href) ? 'text-inherit' : isDanger ? 'text-red-600' : ''}>
            {item.icon}
          </div>
          <span className="font-medium">{item.label}</span>
        </div>
      </Link>
    );
  };

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
          data-testid="sidebar-overlay"
        />
      )}

      <aside 
        className={`fixed top-0 left-0 h-full w-72 bg-background border-r border-border z-50 transition-transform duration-300 lg:translate-x-0 shadow-xl lg:shadow-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        data-testid="sidebar"
      >
        <div className="flex flex-col h-full">
          
          <div className="h-16 flex items-center justify-between px-3 border-b border-border bg-gradient-to-r from-[#1a1a2e] via-[#2a2a3e] to-[#1a1a2e]">
            <Link href="/">
              <div className="flex items-center gap-2.5 cursor-pointer" data-testid="sidebar-logo">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-lg shadow-green-500/20">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="3" y="3" width="18" height="18" rx="3" fill="white" fillOpacity="0.9"/>
                    <path d="M7 12h10M12 7v10" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className="flex flex-col">
                  <span className="text-white font-bold text-base tracking-wide leading-tight">FINATRADES</span>
                  <span className="text-[10px] font-semibold tracking-widest text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded-sm leading-none mt-0.5 w-fit">GOLD MEMBER</span>
                </div>
              </div>
            </Link>
            <button 
              className="lg:hidden p-2 text-white/70 hover:text-white"
              onClick={() => setIsOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-6 px-4 space-y-6 custom-scrollbar">
            <div className="space-y-1">
              <p className="px-4 text-xs font-semibold text-primary uppercase tracking-wider mb-3">
                Main Menu
              </p>
              {mainMenuItems.map(renderMenuItem)}
            </div>

            {businessMenuItems.length > 0 && (
              <div className="space-y-1">
                <p className="px-4 text-xs font-semibold text-primary uppercase tracking-wider mb-3">
                  Business
                </p>
                {businessMenuItems.map(renderMenuItem)}
              </div>
            )}

            <div className="space-y-1">
              <p className="px-4 text-xs font-semibold text-primary uppercase tracking-wider mb-3">
                Account
              </p>
              {accountMenuItems.map(renderMenuItem)}
            </div>
          </div>

          <div className="p-4 border-t border-border">
            <div className="mb-4 p-4 rounded-xl bg-secondary border border-primary/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-primary capitalize font-medium">
                    {accountType} Account
                  </p>
                </div>
              </div>
            </div>
            <Button 
              variant="ghost" 
              className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
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
