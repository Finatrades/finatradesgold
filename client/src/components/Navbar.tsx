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
import { motion } from 'framer-motion';
import { User, Building2, LogOut, LayoutDashboard, Menu, X } from 'lucide-react';

export default function Navbar() {
  const { t } = useLanguage();
  const { accountType, setAccountType } = useAccountType();
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isHome = location === '/';

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isActive = (path: string) => location === path;

  const navLinks = [
    { href: '/', label: t('nav.home') },
    { href: '/finavault', label: t('nav.finavault') },
    { href: '/finapay', label: t('nav.finapay') },
    { href: '/bnsl', label: t('nav.bnsl') },
    ...(accountType === 'business' ? [{ href: '/finabridge', label: t('nav.finabridge') }] : [])
  ];

  const navBg = isHome 
    ? scrolled 
      ? 'bg-gradient-to-r from-[#0D001E] via-[#2A0055] to-[#4B0082] shadow-[0_4px_20px_rgba(212,175,55,0.2)]' 
      : 'bg-gradient-to-r from-[#0D001E]/90 via-[#2A0055]/90 to-[#4B0082]/90 backdrop-blur-md'
    : 'bg-background/95 backdrop-blur-md border-b border-border';

  const textColor = isHome ? 'text-white' : 'text-foreground';
  const mutedTextColor = isHome ? 'text-white/70' : 'text-muted-foreground';

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${navBg}`} data-testid="navbar">
      <div className="container mx-auto px-6 h-20 flex items-center justify-between">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer group" data-testid="link-home-logo">
            <div className="w-8 h-8 bg-gradient-to-br from-[#D4AF37] to-[#F4E4BC] rounded-lg group-hover:scale-105 transition-transform" />
            <span className={`text-xl font-bold tracking-tight ${textColor}`}>Finatrades</span>
          </div>
        </Link>

        <div className="hidden lg:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <button
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                  isActive(link.href)
                    ? isHome ? 'text-white bg-white/20' : 'text-primary bg-primary/10'
                    : isHome ? 'text-white/80 hover:text-white hover:bg-white/10' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
                data-testid={`link-nav-${link.href.replace('/', '') || 'home'}`}
              >
                {link.label}
              </button>
            </Link>
          ))}
          {user && (
            <Link href="/dashboard">
              <button
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                  isActive('/dashboard')
                    ? isHome ? 'text-white bg-white/20' : 'text-primary bg-primary/10'
                    : isHome ? 'text-white/80 hover:text-white hover:bg-white/10' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
                data-testid="link-nav-dashboard"
              >
                Dashboard
              </button>
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3">
          <LanguageSwitcher variant={isHome ? 'light' : 'default'} />

          {!user && (
            <div className={`hidden md:flex relative items-center p-1 rounded-full border backdrop-blur-sm ${
              isHome ? 'bg-white/10 border-white/20' : 'bg-muted border-border'
            }`}>
              <motion.div 
                className={`absolute top-1 bottom-1 rounded-full shadow-lg ${isHome ? 'bg-white' : 'bg-primary'}`}
                animate={{ 
                  left: accountType === 'personal' ? 4 : '50%',
                  width: 'calc(50% - 4px)'
                }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
              <button
                onClick={() => setAccountType('personal')}
                className={`relative z-10 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  accountType === 'personal' 
                    ? isHome ? 'text-[#4B0082]' : 'text-white'
                    : isHome ? 'text-white/80 hover:text-white' : 'text-muted-foreground hover:text-foreground'
                }`}
                data-testid="button-account-personal"
              >
                <User className="w-3.5 h-3.5" />
                {t('nav.personal')}
              </button>
              <button
                onClick={() => setAccountType('business')}
                className={`relative z-10 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  accountType === 'business' 
                    ? isHome ? 'text-[#4B0082]' : 'text-white'
                    : isHome ? 'text-white/80 hover:text-white' : 'text-muted-foreground hover:text-foreground'
                }`}
                data-testid="button-account-business"
              >
                <Building2 className="w-3.5 h-3.5" />
                {t('nav.business')}
              </button>
            </div>
          )}

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full" data-testid="button-user-menu">
                  <Avatar className={`h-10 w-10 border-2 ${isHome ? 'border-[#D4AF37]' : 'border-primary'}`}>
                    <AvatarImage src="" alt={user.firstName} />
                    <AvatarFallback className="bg-gradient-to-br from-[#D4AF37] to-[#F4E4BC] text-[#0D001E] font-semibold">
                      {user.firstName[0]}{user.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-background border-border text-foreground" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.firstName} {user.lastName}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem className="focus:bg-muted focus:text-foreground cursor-pointer" onClick={() => window.location.href = '/dashboard'} data-testid="menu-item-dashboard">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  <span>Dashboard</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="focus:bg-muted focus:text-foreground cursor-pointer" data-testid="menu-item-profile">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem className="focus:bg-muted focus:text-foreground cursor-pointer" onClick={logout} data-testid="menu-item-logout">
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
                  className={`rounded-full ${isHome ? 'text-white hover:bg-white/10' : 'text-foreground hover:bg-muted'}`}
                  data-testid="button-login"
                >
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button 
                  className="bg-gradient-to-r from-[#D4AF37] to-[#F4E4BC] hover:opacity-90 text-[#0D001E] font-semibold rounded-full shadow-[0_0_20px_rgba(212,175,55,0.3)]"
                  data-testid="button-register"
                >
                  {t('common.getStarted')}
                </Button>
              </Link>
            </div>
          )}

          <button 
            className={`lg:hidden p-2 rounded-lg ${isHome ? 'text-white hover:bg-white/10' : 'text-foreground hover:bg-muted'}`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            data-testid="button-mobile-menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={`lg:hidden absolute top-20 left-0 right-0 ${
            isHome ? 'bg-gradient-to-b from-[#2A0055] to-[#4B0082]' : 'bg-background border-b border-border'
          } shadow-lg`}
        >
          <div className="container mx-auto px-6 py-4 space-y-2">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium ${
                    isActive(link.href)
                      ? isHome ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'
                      : isHome ? 'text-white/80 hover:bg-white/10' : 'text-muted-foreground hover:bg-muted'
                  }`}
                  data-testid={`mobile-link-${link.href.replace('/', '') || 'home'}`}
                >
                  {link.label}
                </button>
              </Link>
            ))}
            {user && (
              <Link href="/dashboard">
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium ${
                    isActive('/dashboard')
                      ? isHome ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'
                      : isHome ? 'text-white/80 hover:bg-white/10' : 'text-muted-foreground hover:bg-muted'
                  }`}
                  data-testid="mobile-link-dashboard"
                >
                  Dashboard
                </button>
              </Link>
            )}
            
            {!user && (
              <>
                <div className={`flex items-center justify-center p-2 rounded-xl ${isHome ? 'bg-white/10' : 'bg-muted'}`}>
                  <button
                    onClick={() => setAccountType('personal')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium ${
                      accountType === 'personal' 
                        ? isHome ? 'bg-white text-[#4B0082]' : 'bg-primary text-white'
                        : isHome ? 'text-white/70' : 'text-muted-foreground'
                    }`}
                    data-testid="mobile-button-personal"
                  >
                    <User className="w-4 h-4" />
                    Personal
                  </button>
                  <button
                    onClick={() => setAccountType('business')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium ${
                      accountType === 'business' 
                        ? isHome ? 'bg-white text-[#4B0082]' : 'bg-primary text-white'
                        : isHome ? 'text-white/70' : 'text-muted-foreground'
                    }`}
                    data-testid="mobile-button-business"
                  >
                    <Building2 className="w-4 h-4" />
                    Business
                  </button>
                </div>
                <div className="flex gap-2 pt-2">
                  <Link href="/login" className="flex-1">
                    <Button 
                      variant="outline" 
                      className={`w-full rounded-full ${isHome ? 'border-white/30 text-white hover:bg-white/10' : ''}`}
                      onClick={() => setMobileMenuOpen(false)}
                      data-testid="mobile-button-login"
                    >
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/register" className="flex-1">
                    <Button 
                      className="w-full bg-gradient-to-r from-[#D4AF37] to-[#F4E4BC] text-[#0D001E] font-semibold rounded-full"
                      onClick={() => setMobileMenuOpen(false)}
                      data-testid="mobile-button-register"
                    >
                      Get Started
                    </Button>
                  </Link>
                </div>
              </>
            )}
          </div>
        </motion.div>
      )}
    </nav>
  );
}
