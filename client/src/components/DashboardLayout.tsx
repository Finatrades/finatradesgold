import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/dashboard/Sidebar';
import { useAuth } from '@/context/AuthContext';
import { useAccountType } from '@/context/AccountTypeContext';
import NotificationCenter from '@/components/dashboard/NotificationCenter';
import ThemeToggle from '@/components/ThemeToggle';
import IdleTimeoutWarning from '@/components/IdleTimeoutWarning';
import KycStatusBanner from '@/components/KycStatusBanner';
import { useIdleTimeout } from '@/hooks/useIdleTimeout';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Menu, Clock, LogOut, User, Settings, CheckCircle2, ShieldCheck, Shield, RotateCcw, Calendar, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import FloatingAgentChat from '@/components/FloatingAgentChat';

import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Link, useLocation } from 'wouter';
import { format } from 'date-fns';
import { useIsMobile } from '@/hooks/useIsMobile';
import MobileShell from '@/components/mobile/MobileShell';
import MobileHeader from '@/components/mobile/MobileHeader';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { accountType, setAccountType } = useAccountType();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebar-collapsed') === 'true';
    }
    return false;
  });
  const [scrolled, setScrolled] = useState(false);
  const [showAssuranceDialog, setShowAssuranceDialog] = useState(false);
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();

  const handleSetCollapsed = (v: boolean) => {
    setSidebarCollapsed(v);
    localStorage.setItem('sidebar-collapsed', String(v));
  };
  
  const { showWarning, remainingSeconds, stayActive, logout: idleLogout } = useIdleTimeout({
    timeoutMinutes: 30,
    warningMinutes: 2,
  });

  const { data: goldPriceData } = useQuery({
    queryKey: ['/api/gold-price'],
    queryFn: async () => {
      const res = await fetch('/api/gold-price');
      if (!res.ok) return null;
      return res.json();
    },
    refetchInterval: 30000,
  });

  const goldPrice = goldPriceData?.pricePerGram || 0;
  const goldPriceSource = goldPriceData?.source || '';
  const isGoldPriceLive = goldPriceSource && !goldPriceSource.includes('fallback');

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!user) return null;

  if (isMobile) {
    return (
      <MobileShell>
        <MobileHeader />
        <KycStatusBanner kycStatus={user.kycStatus} />
        <main className="px-4 py-3 pb-24">
          {children}
        </main>
        <IdleTimeoutWarning
          open={showWarning}
          remainingSeconds={remainingSeconds}
          onStayActive={stayActive}
          onLogout={idleLogout}
        />
      </MobileShell>
    );
  }

  return (
    <div className="min-h-screen bg-muted text-foreground font-['Inter',sans-serif] selection:bg-primary selection:text-primary-foreground relative">
      
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} collapsed={sidebarCollapsed} setCollapsed={handleSetCollapsed} />

      <div className={`du-stage ${sidebarCollapsed ? 'lg:ml-[100px]' : 'lg:ml-[304px]'} min-h-screen flex flex-col transition-all duration-300`}>
        
        <header className={`sticky top-0 z-30 transition-all duration-300 ${scrolled ? 'shadow-sm' : ''}`}>
          {/* Hynex-style pill bar */}
          <div className="h-16 px-6 flex items-center justify-between border-b border-border/40 bg-background">

            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                data-testid="button-mobile-sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-2.5">

              {/* Reports pill */}
              <Link href="/transactions">
                <button className="hynex-pill" data-testid="header-pill-reports">
                  <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Reports</span>
                </button>
              </Link>

              {/* Date pill */}
              <div className="hynex-pill" data-testid="header-pill-date">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                <span>{format(new Date(), 'EEE d, MMM')}</span>
              </div>

              {/* Search pill */}
              <div className="hynex-pill min-w-[260px]" data-testid="header-pill-search">
                <Search className="w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search transactions, certificates..."
                  className="bg-transparent outline-none border-0 text-[13px] flex-1 placeholder:text-muted-foreground/60"
                  data-testid="input-header-search"
                />
              </div>

              <ThemeToggle />

              <NotificationCenter />

              <div className="h-7 w-px bg-border/60 mx-1" />
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity" data-testid="button-user-menu">
                    <Avatar className="h-9 w-9 border border-border/60">
                      <AvatarImage 
                        src={user.profilePhoto || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.firstName + ' ' + user.lastName)}&backgroundColor=7C3AED&textColor=ffffff`} 
                        alt={user.firstName} 
                      />
                      <AvatarFallback className="bg-violet-600 text-white font-bold">
                        {user.firstName[0]}{user.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{user.firstName} {user.lastName}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                      {user.lastLoginAt && (
                        <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3" />
                          Signed in: {format(new Date(user.lastLoginAt), 'MMM d, h:mm a')}
                        </p>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setLocation('/profile')} className="cursor-pointer" data-testid="menu-item-profile">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation('/security')} className="cursor-pointer" data-testid="menu-item-settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Security
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => {
                      logout();
                      setLocation('/');
                    }} 
                    className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                    data-testid="menu-item-signout"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden bg-background relative">
          {/* ── Decorative colour orbs — give backdrop-filter something to blur ── */}
          <div aria-hidden="true" className="decorative-orbs pointer-events-none fixed inset-0 overflow-hidden" style={{ zIndex: 0 }}>
            {/* Violet — top-left */}
            <div style={{
              position: 'absolute', top: '-10%', left: '4%',
              width: 560, height: 560,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(139,92,246,0.28) 0%, rgba(124,58,237,0.14) 40%, transparent 70%)',
              filter: 'blur(80px)',
            }} />
            {/* Gold — top-right */}
            <div style={{
              position: 'absolute', top: '5%', right: '2%',
              width: 420, height: 420,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(212,175,55,0.22) 0%, rgba(245,158,11,0.10) 45%, transparent 70%)',
              filter: 'blur(72px)',
            }} />
            {/* Indigo — centre-right */}
            <div style={{
              position: 'absolute', top: '38%', right: '8%',
              width: 380, height: 380,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(99,102,241,0.22) 0%, rgba(79,70,229,0.10) 50%, transparent 72%)',
              filter: 'blur(70px)',
            }} />
            {/* Teal — bottom-left */}
            <div style={{
              position: 'absolute', bottom: '5%', left: '6%',
              width: 440, height: 440,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(13,148,136,0.20) 0%, rgba(5,150,105,0.10) 48%, transparent 70%)',
              filter: 'blur(75px)',
            }} />
            {/* Rose — bottom-right accent */}
            <div style={{
              position: 'absolute', bottom: '10%', right: '14%',
              width: 300, height: 300,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(244,63,94,0.12) 0%, rgba(239,68,68,0.06) 55%, transparent 72%)',
              filter: 'blur(64px)',
            }} />
          </div>

          <div className="relative" style={{ zIndex: 1 }}>
            <KycStatusBanner kycStatus={user.kycStatus} />
            <div className="p-6">
              {children}
            </div>
          </div>
        </main>
        
        <FloatingAgentChat />
        
        <IdleTimeoutWarning
          open={showWarning}
          remainingSeconds={remainingSeconds}
          onStayActive={stayActive}
          onLogout={idleLogout}
        />

        {/* Settlement Assurance Dialog */}
        <Dialog open={showAssuranceDialog} onOpenChange={setShowAssuranceDialog}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6 text-white" />
                </div>
                <DialogTitle className="text-xl font-bold text-green-800">
                  Guarantee of Settlement Assurance
                </DialogTitle>
              </div>
              <DialogDescription className="sr-only">
                Learn about our settlement assurance backed by verified gold reserves
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                <p className="text-foreground/85 leading-relaxed text-sm">
                  Raminvest Holding Ltd (DIFC Registration No. 7030), as the governing entity of the Group ecosystem that includes Wingold & Metals DMCC, provides a limited settlement assurance mechanism supported by verified geological gold reserves held through Boudadiya Services SARL under Mining Permit No. 2265 B2-WOMPOU.
                </p>
              </div>
              
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-green-700 font-semibold">Verified Reserve Value</span>
                </div>
                <p className="text-2xl font-bold text-green-800">USD 42.134 Billion</p>
                <p className="text-sm text-green-600 mt-1">
                  (USD 42,134,363,570) as of 15 July 2025, based on a gold spot price of USD 3,327.93 per ounce
                </p>
                <p className="text-xs text-green-500 mt-2">
                  Source: Independent MKDG Geological Audit Report - Proven Reserves
                </p>
              </div>
              
              <div className="p-4 bg-muted/40 rounded-lg border border-border">
                <p className="text-foreground/85 leading-relaxed text-sm">
                  This assurance, formally recognized under DIFC procedures (SR Reference No. SR-646772), serves solely as an internal group mechanism under which, in the unlikely event Wingold & Metals DMCC cannot meet a specific settlement obligation under this Plan, Raminvest may authorize monetization of corresponding reserves exclusively to discharge that single obligation.
                </p>
              </div>
              
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-amber-800 font-medium text-sm mb-2">Important Notice:</p>
                <p className="text-foreground/85 leading-relaxed text-sm">
                  It is not a banking guarantee, financial insurance, or customer protection product, and no continuing or residual liability remains with Raminvest thereafter. By participating, you acknowledge this mechanism as a risk-mitigation feature of the ecosystem, while your sole contractual counterparty for all Plan obligations remains Wingold & Metals DMCC.
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}
