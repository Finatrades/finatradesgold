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
import { Menu, Clock, LogOut, User, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import FloatingAgentChat from '@/components/FloatingAgentChat';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import ThemeToggle from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Link, useLocation } from 'wouter';
import { format } from 'date-fns';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { accountType, setAccountType } = useAccountType();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [, setLocation] = useLocation();
  
  const { showWarning, remainingSeconds, stayActive, logout: idleLogout } = useIdleTimeout({
    timeoutMinutes: 30,
    warningMinutes: 2,
  });

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-muted text-foreground font-sans selection:bg-primary selection:text-primary-foreground relative">
      
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      <div className="lg:ml-72 min-h-screen flex flex-col transition-all duration-300">
        
        <header className={`sticky top-0 z-30 h-16 transition-all duration-300 ${scrolled ? 'bg-background/95 backdrop-blur-md border-b border-border shadow-sm' : 'bg-background border-b border-border'}`}>
          <div className="h-full px-6 flex items-center justify-between">
            
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

              <ThemeToggle />

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

      </div>
    </div>
  );
}
