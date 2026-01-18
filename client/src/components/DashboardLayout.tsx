import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/dashboard/Sidebar';
import { useAuth } from '@/context/AuthContext';
import { useAccountType } from '@/context/AccountTypeContext';
import NotificationCenter from '@/components/dashboard/NotificationCenter';
import SyncStatusIndicator from '@/components/SyncStatusIndicator';
import IdleTimeoutWarning from '@/components/IdleTimeoutWarning';
import KycStatusBanner from '@/components/KycStatusBanner';
import { useIdleTimeout } from '@/hooks/useIdleTimeout';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Menu, Clock, LogOut, User, Settings, CheckCircle2, ShieldCheck, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import FloatingAgentChat from '@/components/FloatingAgentChat';
import LanguageSwitcher from '@/components/LanguageSwitcher';
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
  const [scrolled, setScrolled] = useState(false);
  const [showAssuranceDialog, setShowAssuranceDialog] = useState(false);
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();
  
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
    <div className="min-h-screen bg-muted text-foreground font-sans selection:bg-primary selection:text-primary-foreground relative">
      
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      <div className="lg:ml-72 min-h-screen flex flex-col transition-all duration-300">
        
        <header className={`sticky top-0 z-30 transition-all duration-300 ${scrolled ? 'bg-background/95 backdrop-blur-md border-b border-border shadow-sm' : 'bg-background border-b border-border'}`}>
          {/* Top Info Bar with Gold Price, Settlement Assurance, 2FA */}
          <div className="h-8 bg-gradient-to-r from-green-50 via-emerald-50 to-purple-50 border-b border-green-200 flex items-center justify-between px-4 text-xs">
            {/* Gold Price */}
            <div className="flex items-center gap-1.5 text-green-700 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Gold Price: <strong>${goldPrice.toFixed(2)}/gram</strong></span>
            </div>
            
            {/* Settlement Assurance with animation */}
            <div 
              className="flex items-center gap-1.5 text-green-700 cursor-pointer hover:text-green-900 transition-colors group"
              onClick={() => setShowAssuranceDialog(true)}
            >
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
              </motion.div>
              <span className="hidden sm:inline">Settlement Assurance</span>
              <motion.span 
                className="hidden md:inline text-green-600 font-medium"
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                • Backed by USD 42.134 Billion
              </motion.span>
            </div>
            
            {/* 2FA Reminder */}
            {!user.mfaEnabled && (
              <Link href="/security">
                <div className="flex items-center gap-1.5 text-red-600 hover:text-red-800 cursor-pointer transition-colors">
                  <Shield className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Enable 2FA</span>
                </div>
              </Link>
            )}
          </div>
          
          {/* Main Header */}
          <div className="h-14 px-6 flex items-center justify-between">
            
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                data-testid="button-mobile-sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>
              
            </div>

            <div className="flex items-center gap-3">
              
              <SyncStatusIndicator />

              <div className="hidden md:block">
                <LanguageSwitcher />
              </div>

              <NotificationCenter />
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="flex items-center gap-3 pl-3 border-l border-border cursor-pointer hover:opacity-80 transition-opacity" data-testid="button-user-menu">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-medium text-foreground">{user.firstName} {user.lastName}</p>
                      <p className="text-xs text-primary capitalize font-medium">{accountType} Account</p>
                    </div>
                    <Avatar className="h-10 w-10 border-2 border-primary/30 ring-2 ring-primary/10">
                      <AvatarImage 
                        src={user.profilePhoto || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.firstName + ' ' + user.lastName)}&backgroundColor=8A2BE2&textColor=ffffff`} 
                        alt={user.firstName} 
                      />
                      <AvatarFallback className="bg-primary text-primary-foreground font-bold">
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

        <main className="flex-1 overflow-x-hidden bg-muted">
          <KycStatusBanner kycStatus={user.kycStatus} />
          <div className="p-6">
            {children}
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
                <p className="text-gray-700 leading-relaxed text-sm">
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
              
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-gray-700 leading-relaxed text-sm">
                  This assurance, formally recognized under DIFC procedures (SR Reference No. SR-646772), serves solely as an internal group mechanism under which, in the unlikely event Wingold & Metals DMCC cannot meet a specific settlement obligation under this Plan, Raminvest may authorize monetization of corresponding reserves exclusively to discharge that single obligation.
                </p>
              </div>
              
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-amber-800 font-medium text-sm mb-2">Important Notice:</p>
                <p className="text-gray-700 leading-relaxed text-sm">
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
