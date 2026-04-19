import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/dashboard/Sidebar';
import { AuroraBackground } from '@/components/ui/aurora-background';
import { useAuth } from '@/context/AuthContext';
import { useAccountType } from '@/context/AccountTypeContext';
import NotificationCenter from '@/components/dashboard/NotificationCenter';
import ThemeToggle from '@/components/ThemeToggle';
import IdleTimeoutWarning from '@/components/IdleTimeoutWarning';
import KycStatusPill from '@/components/KycStatusPill';
import { useIdleTimeout } from '@/hooks/useIdleTimeout';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Menu, Clock, LogOut, User, Settings, CheckCircle2, ShieldCheck, Shield, RotateCcw, Calendar, Search, Sparkles, Bell, History, Coins, ArrowDownToLine, Send, Lock } from 'lucide-react';
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
    <div className="min-h-screen bg-background text-foreground font-['Inter',sans-serif] selection:bg-primary selection:text-primary-foreground relative isolate">
      
      <AuroraBackground />
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} collapsed={sidebarCollapsed} setCollapsed={handleSetCollapsed} />

      <div className={`du-stage ${sidebarCollapsed ? 'lg:ml-[100px]' : 'lg:ml-[304px]'} min-h-screen flex flex-col transition-all duration-300`}>
        
        <header className={`sticky top-0 z-30 transition-all duration-300 px-4 pt-4 pb-2 ${scrolled ? '' : ''}`}>

          {/* ── UNIFIED rounded card wrapping both rows (status strip + main bar) ── */}
          {/* NOTE: no `overflow-hidden` on wrapper — would clip notification/theme/user dropdowns. Inner row uses rounded-t to clip its own gradient. */}
          <div className="rounded-2xl border border-border/60 bg-background/95 backdrop-blur-md shadow-[0_4px_16px_-4px_rgba(16,24,40,0.08),_0_2px_4px_-2px_rgba(16,24,40,0.04)]">

            {/* ── Row 1: Top status strip (gold price · assurance · 2FA) ── */}
            <div className="h-9 px-5 flex items-center justify-between text-[12px] bg-gradient-to-r from-violet-50/60 via-transparent to-violet-50/60 dark:from-violet-950/15 dark:via-transparent dark:to-violet-950/15 border-b border-border/40 rounded-t-2xl">
              <div className="flex items-center gap-2 text-foreground/80" data-testid="strip-gold-price">
                <span className="font-medium text-muted-foreground">Gold Price:</span>
                <span className="font-semibold text-foreground tabular-nums">
                  ${goldPrice ? goldPrice.toFixed(2) : '156.59'}/gram
                </span>
                <span className="relative flex h-2 w-2 ml-1">
                  {isGoldPriceLive && (
                    <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
                  )}
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
              </div>

              <button
                onClick={() => setShowAssuranceDialog(true)}
                className="hidden md:flex items-center gap-2 text-foreground/75 hover:text-foreground transition-colors"
                data-testid="strip-settlement-assurance"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="font-medium">Settlement Assurance</span>
                <span className="text-muted-foreground">Backed by USD 42.134 Billion</span>
              </button>

              {!user.mfaEnabled ? (
                <Link href="/security">
                  <button
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors text-[11.5px] font-medium"
                    data-testid="button-enable-2fa"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    Enable 2FA
                  </button>
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[11.5px] text-emerald-600 dark:text-emerald-400 font-medium" data-testid="badge-2fa-on">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  2FA Enabled
                </span>
              )}
            </div>

            {/* ── Row 2: Main bar (console pill · date pill · search · action icons · user) ── */}
            <div className="h-16 px-4 flex items-center gap-2.5">

              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0"
                data-testid="button-mobile-sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Portfolio Console pill */}
              <Link href="/dashboard">
                <button className="hynex-pill shrink-0" data-testid="header-pill-console">
                  <Sparkles className="w-3.5 h-3.5 text-violet-500" />
                  <span className="font-medium">Portfolio Console</span>
                </button>
              </Link>

              {/* Date pill */}
              <div className="hynex-pill shrink-0" data-testid="header-pill-date">
                <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                <span>{format(new Date(), 'EEE d, MMM')}</span>
              </div>

              {/* Search bar — fills remaining space */}
              <div className="flex-1 min-w-0">
                <div className="hynex-pill w-full" data-testid="header-search-wrap">
                  <Search className="w-4 h-4 text-muted-foreground/70 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search wallet, trade, vault status, or documents"
                    className="bg-transparent outline-none border-0 text-[13px] flex-1 min-w-0 placeholder:text-muted-foreground/60"
                    data-testid="input-header-search"
                  />
                </div>
              </div>

              {/* Right cluster — action icons */}
              <Link href="/transactions">
                <button
                  className="h-9 w-9 rounded-full bg-muted/60 hover:bg-muted border border-border/60 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  title="Recent activity"
                  data-testid="button-recent"
                >
                  <History className="w-4 h-4" />
                </button>
              </Link>

              <KycStatusPill kycStatus={user.kycStatus} />

              <NotificationCenter />

              <ThemeToggle />

              <div className="h-7 w-px bg-border/60 mx-1 shrink-0" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity pl-1" data-testid="button-user-menu">
                  <div className="hidden sm:flex flex-col items-end leading-tight">
                    <span className="text-[13px] font-semibold text-foreground">{user.firstName} {user.lastName}</span>
                    <span className="text-[11px] text-violet-500 font-medium">Personal Account</span>
                  </div>
                  {/* Header avatar = clean letter initials in solid violet circle (premium look).
                      Profile photo (if any) appears full-size on /profile page, not in chrome. */}
                  <Avatar className="h-10 w-10 border border-border/60 shadow-sm">
                    <AvatarFallback className="bg-violet-600 text-white font-bold text-sm tracking-wide">
                      {(user.firstName?.[0] || '').toUpperCase()}{(user.lastName?.[0] || '').toUpperCase()}
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
                        <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1 mt-1">
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
                    className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:text-red-400 focus:bg-red-50 dark:bg-red-950/20"
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
                <DialogTitle className="text-xl font-bold text-green-800 dark:text-green-200">
                  Guarantee of Settlement Assurance
                </DialogTitle>
              </div>
              <DialogDescription className="sr-only">
                Learn about our settlement assurance backed by verified gold reserves
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200 dark:border-green-800/40">
                <p className="text-foreground/85 leading-relaxed text-sm">
                  Raminvest Holding Ltd (DIFC Registration No. 7030), as the governing entity of the Group ecosystem that includes Wingold & Metals DMCC, provides a limited settlement assurance mechanism supported by verified geological gold reserves held through Boudadiya Services SARL under Mining Permit No. 2265 B2-WOMPOU.
                </p>
              </div>
              
              <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800/40">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-green-700 dark:text-green-300 font-semibold">Verified Reserve Value</span>
                </div>
                <p className="text-2xl font-bold text-green-800 dark:text-green-200">USD 42.134 Billion</p>
                <p className="text-sm text-green-600 dark:text-green-400 mt-1">
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
              
              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800/40">
                <p className="text-amber-800 dark:text-amber-200 font-medium text-sm mb-2">Important Notice:</p>
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
