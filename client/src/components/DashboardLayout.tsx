import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/dashboard/Sidebar';
import { useAuth } from '@/context/AuthContext';
import { useAccountType } from '@/context/AccountTypeContext';
import { NotificationProvider } from '@/context/NotificationContext';
import NotificationCenter from '@/components/dashboard/NotificationCenter';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Menu, Search, Briefcase, User as UserIcon, AlertTriangle, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import FloatingAgentChat from '@/components/FloatingAgentChat';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { Button } from '@/components/ui/button';
import { Link, useLocation } from 'wouter';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { accountType, toggleAccountType } = useAccountType();
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

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary selection:text-white relative">
      
      {/* KYC Blocking Overlay */}
      {user.kycStatus === 'pending' && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-zinc-900 border border-border shadow-2xl rounded-2xl p-8 max-w-md w-full text-center space-y-6 relative overflow-hidden"
          >
            {/* Decorative background glow */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 to-red-500" />
            
            <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-orange-600 dark:text-orange-500" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">Verification Required</h2>
              <p className="text-muted-foreground">
                To ensure compliance and security, all accounts must be verified before accessing the platform features.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <Link href="/kyc">
                <Button className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-lg shadow-orange-500/20 transition-all hover:scale-[1.02]">
                  Verify Identity Now <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Button 
                variant="ghost" 
                className="w-full text-muted-foreground hover:text-foreground"
                onClick={() => window.location.href = '/'} // Logout logic or back to home
              >
                Return to Home
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      {/* Main Content Area */}
      <div className="lg:ml-64 min-h-screen flex flex-col transition-all duration-300">
        
        {/* Top Header Bar */}
        <header className={`sticky top-0 z-30 h-20 transition-all duration-300 ${scrolled ? 'bg-background/90 backdrop-blur-md border-b border-border shadow-sm' : 'bg-transparent'}`}>
          <div className="container mx-auto px-6 h-full flex items-center justify-between">
            
            {/* Left: Mobile Menu Trigger & Title */}
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <Menu className="w-5 h-5" />
              </button>
              
              <div className="hidden sm:flex items-center bg-muted border border-border rounded-full px-4 py-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse" />
                  <span className="text-xs text-muted-foreground font-medium">Gold Spot: <span className="text-secondary">2,350.40 USD/oz</span></span>
              </div>
            </div>

            {/* Right: User & Actions */}
            <div className="flex items-center gap-4">
              
              {/* Account Type Switcher */}
              <div className="hidden md:flex items-center bg-muted/50 p-1 rounded-full border border-border">
                 <button 
                   onClick={() => accountType !== 'personal' && toggleAccountType()}
                   className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                     accountType === 'personal' 
                       ? 'bg-background shadow-sm text-foreground' 
                       : 'text-muted-foreground hover:text-foreground'
                   }`}
                 >
                   <UserIcon className="w-3 h-3" /> Personal
                 </button>
                 <button 
                   onClick={() => accountType !== 'business' && toggleAccountType()}
                   className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                     accountType === 'business' 
                       ? 'bg-background shadow-sm text-foreground' 
                       : 'text-muted-foreground hover:text-foreground'
                   }`}
                 >
                   <Briefcase className="w-3 h-3" /> Business
                 </button>
              </div>

              {/* Language */}
              <div className="hidden md:block">
                 <LanguageSwitcher variant="light" />
              </div>

              <NotificationCenter />
              
              <div className="flex items-center gap-3 pl-4 border-l border-border">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-foreground">{user.firstName} {user.lastName}</p>
                  <p className="text-xs text-muted-foreground capitalize">{accountType} Account</p>
                </div>
                <Avatar className="h-10 w-10 border border-secondary/30 ring-2 ring-secondary/10">
                  <AvatarImage src="" alt={user.firstName} />
                  <AvatarFallback className="bg-secondary text-white font-bold">
                    {user.firstName[0]}{user.lastName[0]}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-x-hidden">
          {children}
        </main>
        
        <FloatingAgentChat />

      </div>
    </div>
  );
}
