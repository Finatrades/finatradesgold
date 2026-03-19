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
  Settings,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useAccountType } from '@/context/AccountTypeContext';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import finatradesLogo from '@/assets/finatrades-logo-purple.png';

interface MenuItem {
  icon: React.ReactNode;
  label: string;
  href: string;
  variant?: 'default' | 'danger';
}

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}

export default function Sidebar({ isOpen, setIsOpen, collapsed, setCollapsed }: SidebarProps) {
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

  const isActive = (path: string) => location === path || (path !== '/dashboard' && location.startsWith(path + '/'));

  const renderMenuItem = (item: MenuItem) => {
    const isDanger = item.variant === 'danger';
    const active = isActive(item.href);
    
    const menuContent = (
      <Link key={item.href} href={item.href}>
        <div 
          className={`relative flex items-center gap-3 ${collapsed ? 'px-4 lg:justify-center lg:px-2' : 'px-4'} py-2.5 rounded-xl transition-all cursor-pointer ${
            active 
              ? isDanger 
                ? 'bg-red-600 text-white shadow-md' 
                : 'bg-[#7C3AED] text-white shadow-lg shadow-violet-500/25'
              : isDanger
                ? 'text-red-600 hover:bg-red-50 hover:text-red-700 font-semibold'
                : 'text-gray-500 hover:bg-violet-50 hover:text-violet-700'
          }`}
          onClick={() => setIsOpen(false)}
          data-testid={`sidebar-link-${item.href.replace(/\//g, '-').slice(1)}`}
        >
          {active && !isDanger && !collapsed && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-r-full" />
          )}
          <div className={`flex-shrink-0 ${active ? 'text-white' : isDanger ? 'text-red-600' : ''}`}>
            {item.icon}
          </div>
          <span className={`font-medium text-sm whitespace-nowrap ${collapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
        </div>
      </Link>
    );

    if (collapsed) {
      return (
        <TooltipProvider key={item.href} delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              {menuContent}
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs font-medium">
              {item.label}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return menuContent;
  };

  const sidebarWidth = collapsed ? 'w-72 lg:w-[72px]' : 'w-72';

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
        className={`fixed top-0 left-0 h-full ${sidebarWidth} bg-white border-r border-gray-200 z-50 transition-all duration-300 lg:translate-x-0 shadow-xl lg:shadow-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        data-testid="sidebar"
      >
        <div className="flex flex-col h-full">
          
          <div className={`h-16 flex items-center ${collapsed ? 'justify-between px-3 lg:justify-center lg:px-2' : 'justify-between px-3'} border-b border-gray-200 bg-gradient-to-r from-[#0D001E] via-[#2A0055] to-[#4B0082]`}>
            <Link href="/">
              <div className="flex items-center cursor-pointer" data-testid="sidebar-logo">
                <img 
                  src={finatradesLogo} 
                  alt="Finatrades" 
                  className={`h-14 w-auto object-contain brightness-0 invert ${collapsed ? 'lg:hidden' : ''}`}
                />
                <img 
                  src="/favicon.png" 
                  alt="Finatrades" 
                  className={`w-10 h-10 rounded-lg object-contain hidden ${collapsed ? 'lg:block' : ''}`}
                />
              </div>
            </Link>
            <button 
              className="lg:hidden p-2 text-white/70 hover:text-white"
              onClick={() => setIsOpen(false)}
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className={`flex-1 overflow-y-auto py-5 ${collapsed ? 'px-3 lg:px-2' : 'px-3'} space-y-5 custom-scrollbar`}>
            <div className="space-y-1">
              <p className={`px-4 text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3 ${collapsed ? 'lg:hidden' : ''}`}>
                Main Menu
              </p>
              {mainMenuItems.map(renderMenuItem)}
            </div>

            {businessMenuItems.length > 0 && (
              <div className="space-y-1">
                <p className={`px-4 text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3 ${collapsed ? 'lg:hidden' : ''}`}>
                  Business
                </p>
                {businessMenuItems.map(renderMenuItem)}
              </div>
            )}

            <div className="space-y-1">
              <p className={`px-4 text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3 ${collapsed ? 'lg:hidden' : ''}`}>
                Account
              </p>
              {accountMenuItems.map(renderMenuItem)}
            </div>
          </div>

          <div className={`border-t border-gray-200 ${collapsed ? 'p-4 lg:p-2' : 'p-4'}`}>
            <div className={`mb-3 p-3 rounded-xl bg-violet-50 border border-violet-100 ${collapsed ? 'lg:hidden' : ''}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#7C3AED] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-violet-600 capitalize font-medium">
                    {accountType} Account
                  </p>
                </div>
              </div>
            </div>

            <div className={`hidden ${collapsed ? 'lg:block' : ''}`}>
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="w-full flex items-center justify-center p-2.5 rounded-xl text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                      onClick={logout}
                      data-testid="button-logout-collapsed"
                      aria-label="Log Out"
                    >
                      <LogOut className="w-5 h-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-xs font-medium">Log Out</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className={collapsed ? 'lg:hidden' : ''}>
              <Button 
                variant="ghost" 
                className="w-full justify-start text-gray-500 hover:text-red-600 hover:bg-red-50"
                onClick={logout}
                data-testid="button-logout"
              >
                <LogOut className="w-5 h-5 mr-3" />
                Log Out
              </Button>
            </div>

            <div className="mt-2 hidden lg:block">
              {collapsed ? (
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setCollapsed(false)}
                        className="w-full flex items-center justify-center p-2.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                        aria-label="Expand sidebar"
                        data-testid="button-expand-sidebar"
                      >
                        <PanelLeftOpen className="w-5 h-5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="text-xs font-medium">Expand sidebar</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <button
                  onClick={() => setCollapsed(true)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                  aria-label="Collapse sidebar"
                  data-testid="button-collapse-sidebar"
                >
                  <PanelLeftClose className="w-5 h-5" />
                  <span className="font-medium text-sm">Hide Sidebar</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
