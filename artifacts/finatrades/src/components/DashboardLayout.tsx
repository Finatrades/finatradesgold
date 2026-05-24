import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/dashboard/Sidebar';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { useLocation, Link } from 'wouter';
import { useIsMobile } from '@/hooks/useIsMobile';
import {
  Menu, Search, ChevronDown, LogOut, User, Settings,
  ShieldCheck, TrendingUp, X,
} from 'lucide-react';
import NotificationCenter from '@/components/dashboard/NotificationCenter';
import { getRoleLabel } from '@/lib/roleMenus';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import finatradesLogo from '@/assets/finatrades-logo-purple.png';
import MobileShell from '@/components/mobile/MobileShell';
import MobileHeader from '@/components/mobile/MobileHeader';

const ROUTE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/transactions': 'Transactions',
  '/notifications': 'Notifications',
  '/consignments': 'Consignments',
  '/inventory': 'Warehouse & Inventory',
  '/marketplace': 'Marketplace',
  '/orders': 'RFQ & Orders',
  '/finabridge': 'Trade Finance',
  '/escrow': 'Escrow & Settlement',
  '/certificates': 'Warehouse Receipts',
  '/barter': 'Barter Workflow',
  '/sovereign': 'Sovereign Programs',
  '/profile': 'Profile',
  '/kyc': 'KYC / Compliance',
  '/security': 'Security',
  '/help': 'Help & Support',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebar-collapsed') === 'true';
    }
    return false;
  });
  const [searchOpen, setSearchOpen] = useState(false);

  const handleSetCollapsed = (v: boolean) => {
    setSidebarCollapsed(v);
    localStorage.setItem('sidebar-collapsed', String(v));
  };

  const { data: goldPriceData } = useQuery({
    queryKey: ['/api/gold-price'],
    queryFn: async () => {
      const res = await fetch('/api/gold-price');
      if (!res.ok) return null;
      return res.json();
    },
    refetchInterval: 30000,
  });

  const goldPrice = goldPriceData?.pricePerGram?.toFixed(2) || '—';
  const isLive = goldPriceData?.source && !goldPriceData.source.includes('fallback');

  const pageTitle = ROUTE_TITLES[location] || 'Dashboard';
  const sidebarW = sidebarCollapsed ? 68 : 240;

  if (!user) return null;

  if (isMobile) {
    return (
      <MobileShell>
        <MobileHeader />
        <main className="px-4 py-3 pb-24">
          {children}
        </main>
      </MobileShell>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#FAFAF8' }}>
      <Sidebar
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        collapsed={sidebarCollapsed}
        setCollapsed={handleSetCollapsed}
      />

      {/* Main area */}
      <div
        className="flex-1 flex flex-col min-w-0 transition-all duration-200"
        style={{ marginLeft: `${sidebarW}px` }}
      >
        {/* Top header */}
        <header
          className="sticky top-0 z-30 flex items-center gap-4 px-6"
          style={{
            height: '60px',
            background: '#FFFFFF',
            borderBottom: '1px solid #E8E2DC',
          }}
        >
          {/* Mobile menu toggle */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg"
            style={{ color: '#888880' }}
          >
            <Menu size={20} />
          </button>

          {/* Page title */}
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold truncate" style={{ color: '#1A1A1A' }}>
              {pageTitle}
            </h1>
          </div>

          {/* Gold price ticker */}
          <div
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{
              background: '#FAFAF8',
              border: '1px solid #E8E2DC',
              color: '#1A1A1A',
            }}
          >
            <TrendingUp size={13} style={{ color: '#C73B22' }} />
            <span style={{ color: '#888880' }}>XAU/g</span>
            <span className="font-bold">${goldPrice}</span>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
              style={{
                background: isLive ? 'rgba(5,150,105,0.10)' : 'rgba(199,59,34,0.08)',
                color: isLive ? '#059669' : '#C73B22',
              }}
            >
              {isLive ? 'LIVE' : 'CACHED'}
            </span>
          </div>

          {/* Search */}
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
            style={{ background: '#FAFAF8', border: '1px solid #E8E2DC', color: '#888880' }}
          >
            <Search size={14} />
            <span className="hidden md:block text-xs">Search…</span>
            <kbd className="hidden md:block text-[10px] px-1 rounded" style={{ background: '#E8E2DC' }}>⌘K</kbd>
          </button>

          {/* Notifications */}
          <NotificationCenter />

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-xl transition-colors outline-none"
                style={{ border: '1px solid #E8E2DC', background: '#FAFAF8' }}>
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: '#C73B22' }}
                >
                  {((user as any)?.fullName || (user as any)?.email || 'U')[0].toUpperCase()}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-xs font-semibold leading-tight" style={{ color: '#1A1A1A' }}>
                    {(user as any)?.fullName || (user as any)?.email?.split('@')[0]}
                  </p>
                  <p className="text-[10px] leading-tight" style={{ color: '#888880' }}>
                    {getRoleLabel(user)}
                  </p>
                </div>
                <ChevronDown size={13} style={{ color: '#888880' }} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
                {(user as any)?.email}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile">
                  <a className="flex items-center gap-2 cursor-pointer w-full">
                    <User size={14} /> Profile
                  </a>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/kyc">
                  <a className="flex items-center gap-2 cursor-pointer w-full">
                    <ShieldCheck size={14} /> KYC / Compliance
                  </a>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/security">
                  <a className="flex items-center gap-2 cursor-pointer w-full">
                    <Settings size={14} /> Security
                  </a>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => logout()}
                className="text-red-600 focus:text-red-600 cursor-pointer"
              >
                <LogOut size={14} className="mr-2" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>

      {/* Search modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={() => setSearchOpen(false)}>
          <div className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
            style={{ background: '#FFFFFF', border: '1px solid #E8E2DC' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: '1px solid #E8E2DC' }}>
              <Search size={16} style={{ color: '#888880' }} />
              <input
                autoFocus
                placeholder="Search consignments, orders, inventory…"
                className="flex-1 text-sm outline-none bg-transparent"
                style={{ color: '#1A1A1A' }}
              />
              <button onClick={() => setSearchOpen(false)} style={{ color: '#888880' }}>
                <X size={16} />
              </button>
            </div>
            <div className="px-4 py-8 text-center text-sm" style={{ color: '#888880' }}>
              Start typing to search across the platform
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
