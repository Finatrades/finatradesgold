import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useAccountType } from '@/context/AccountTypeContext';
import { useAuth } from '@/context/AuthContext';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Building2, LogOut, LayoutDashboard, Menu, X, Check } from 'lucide-react';

export default function Navbar() {
  const { t, language } = useLanguage();
  const { accountType, setAccountType } = useAccountType();
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isActive = (path: string) => location === path;

  const navLinks = [
    { href: '/', label: 'Home', id: 'home' },
    { href: '/#products', label: 'Products', id: 'products' },
    { href: '/#how-it-works', label: 'How It Works', id: 'how-it-works' },
    { href: '/#about', label: 'About', id: 'about' },
    { href: '/#contact', label: 'Contact', id: 'contact' },
  ];

  const scrollToSection = (href: string) => {
    if (href.startsWith('/#')) {
      const sectionId = href.substring(2);
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
        setMobileMenuOpen(false);
        return true;
      }
    }
    return false;
  };

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
      scrolled ? 'bg-[#0D001E]/95 backdrop-blur-md shadow-lg' : 'bg-[#0D001E]'
    }`} data-testid="navbar">
      <div className="container mx-auto px-6 h-20 flex items-center justify-between">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer" data-testid="link-home-logo">
            <div className="w-8 h-8 bg-gradient-to-br from-[#E91E8C] to-[#9333EA] rounded-lg flex items-center justify-center">
              <Check className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">FINATRADES</span>
          </div>
        </Link>

        <div className="hidden lg:flex items-center">
          <div className="flex items-center bg-[#1a0a2e] rounded-full p-1">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => {
                  if (!scrollToSection(link.href)) {
                    window.location.href = link.href;
                  }
                }}
                className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                  isActive(link.href) || (link.href === '/' && location === '/')
                    ? 'bg-[#7C3AED] text-white'
                    : 'text-gray-300 hover:text-white hover:bg-[#2d1a4a]'
                }`}
                data-testid={`link-nav-${link.id}`}
              >
                {link.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />

          {!user && (
            <div className="hidden md:flex items-center p-1 rounded-full border border-gray-600 bg-[#1a0a2e]">
              <button
                onClick={() => setAccountType('personal')}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                  accountType === 'personal' 
                    ? 'bg-white text-gray-800'
                    : 'text-gray-400 hover:text-white'
                }`}
                data-testid="button-account-personal"
              >
                <User className="w-3.5 h-3.5" />
                Personal
              </button>
              <button
                onClick={() => setAccountType('business')}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                  accountType === 'business' 
                    ? 'bg-gradient-to-r from-[#E91E8C] to-[#9333EA] text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
                data-testid="button-account-business"
              >
                <Building2 className="w-3.5 h-3.5" />
                Business
              </button>
            </div>
          )}

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full" data-testid="button-user-menu">
                  <Avatar className="h-10 w-10 border-2 border-[#E91E8C]/30">
                    <AvatarImage src="" alt={user.firstName} />
                    <AvatarFallback className="bg-gradient-to-br from-[#E91E8C] to-[#9333EA] text-white font-semibold">
                      {user.firstName[0]}{user.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{user.firstName} {user.lastName}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => window.location.href = '/dashboard'} data-testid="menu-item-dashboard">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  <span>Dashboard</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.location.href = '/profile'} data-testid="menu-item-profile">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} data-testid="menu-item-logout">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <Link href="/login">
                <Button 
                  variant="ghost" 
                  className="rounded-full text-white hover:bg-[#1a0a2e] border border-gray-600"
                  data-testid="button-login"
                >
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button 
                  className="bg-gradient-to-r from-[#E91E8C] to-[#9333EA] hover:opacity-90 text-white rounded-full px-6"
                  data-testid="button-register"
                >
                  Get Started
                </Button>
              </Link>
            </div>
          )}

          <button 
            className="lg:hidden p-2 rounded-lg text-white hover:bg-[#1a0a2e]"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            data-testid="button-mobile-menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="lg:hidden absolute top-20 left-0 right-0 bg-[#0D001E] border-t border-[#1a0a2e]"
          >
            <div className="container mx-auto px-6 py-4 space-y-2">
              {navLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => {
                    if (!scrollToSection(link.href)) {
                      window.location.href = link.href;
                    }
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium ${
                    isActive(link.href)
                      ? 'bg-[#7C3AED] text-white'
                      : 'text-gray-300 hover:bg-[#1a0a2e]'
                  }`}
                  data-testid={`mobile-link-${link.id}`}
                >
                  {link.label}
                </button>
              ))}
              
              {!user && (
                <>
                  <div className="flex items-center p-1 rounded-full border border-gray-600 bg-[#1a0a2e] mt-4">
                    <button
                      onClick={() => setAccountType('personal')}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-all ${
                        accountType === 'personal' 
                          ? 'bg-white text-gray-800'
                          : 'text-gray-400'
                      }`}
                    >
                      <User className="w-3.5 h-3.5" />
                      Personal
                    </button>
                    <button
                      onClick={() => setAccountType('business')}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-all ${
                        accountType === 'business' 
                          ? 'bg-gradient-to-r from-[#E91E8C] to-[#9333EA] text-white'
                          : 'text-gray-400'
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      Business
                    </button>
                  </div>
                  <div className="flex gap-2 pt-4 border-t border-[#1a0a2e]">
                    <Link href="/login" className="flex-1">
                      <Button variant="outline" className="w-full rounded-full border-gray-600 text-white hover:bg-[#1a0a2e]" onClick={() => setMobileMenuOpen(false)}>
                        Sign In
                      </Button>
                    </Link>
                    <Link href="/register" className="flex-1">
                      <Button className="w-full bg-gradient-to-r from-[#E91E8C] to-[#9333EA] text-white rounded-full" onClick={() => setMobileMenuOpen(false)}>
                        Get Started
                      </Button>
                    </Link>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
