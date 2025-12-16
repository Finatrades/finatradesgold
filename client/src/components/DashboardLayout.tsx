import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/dashboard/Sidebar';
import { useAuth } from '@/context/AuthContext';
import { useAccountType } from '@/context/AccountTypeContext';
import { NotificationProvider } from '@/context/NotificationContext';
import NotificationCenter from '@/components/dashboard/NotificationCenter';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Menu, AlertTriangle, ArrowRight, Clock, LogOut, User, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import FloatingAgentChat from '@/components/FloatingAgentChat';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import ThemeToggle from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Link, useLocation } from 'wouter';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { accountType, setAccountType } = useAccountType();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!user) return null;

  const kycNotStarted = user.kycStatus === 'Not Started';
  const kycPending = user.kycStatus === 'In Progress';

  return (
    <div className="min-h-screen bg-muted text-foreground font-sans selection:bg-primary selection:text-primary-foreground relative">
      
      {/* Block access completely only for users who haven't started KYC */}
      {kycNotStarted && (
        <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-md flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border shadow-2xl rounded-2xl p-8 max-w-md w-full text-center space-y-6 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary/80" />
            
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-primary" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-card-foreground">Verification Required</h2>
              <p className="text-muted-foreground">
                To ensure compliance and security, all accounts must be verified before accessing the platform features.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <Link href="/kyc">
                <Button className="w-full h-12 text-lg font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:scale-[1.02]" data-testid="button-verify-kyc">
                  Verify Identity Now <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Button 
                variant="ghost" 
                className="w-full text-muted-foreground hover:text-foreground"
                onClick={() => setLocation('/')}
                data-testid="button-return-home"
              >
                Return to Home
              </Button>
            </div>
          </motion.div>
        </div>
      )}

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
                      <AvatarImage src="" alt={user.firstName} />
                      <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                        {user.firstName[0]}{user.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{user.firstName} {user.lastName}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setLocation('/profile')} className="cursor-pointer" data-testid="menu-item-profile">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation('/settings')} className="cursor-pointer" data-testid="menu-item-settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
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

        <main className="flex-1 p-6 overflow-x-hidden bg-muted">
          {/* Show pending approval banner for users who have submitted KYC */}
          {kycPending && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 bg-secondary border border-primary/20 rounded-xl p-4 flex items-center gap-4"
            >
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">Verification Pending</h3>
                <p className="text-sm text-muted-foreground">
                  Your documents are under review. You can view all features, but some actions are restricted until approved.
                </p>
              </div>
            </motion.div>
          )}
          {children}
        </main>
        
        <FloatingAgentChat />

      </div>
    </div>
  );
}
