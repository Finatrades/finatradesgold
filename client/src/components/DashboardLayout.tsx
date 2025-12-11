import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/dashboard/Sidebar';
import { useAuth } from '@/context/AuthContext';
import { useAccountType } from '@/context/AccountTypeContext';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, Menu, Search } from 'lucide-react';
import { motion } from 'framer-motion';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { accountType } = useAccountType();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary selection:text-white">
      
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
              <button className="w-10 h-10 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 border border-background" />
              </button>
              
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

      </div>
    </div>
  );
}
