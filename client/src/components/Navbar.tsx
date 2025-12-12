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
import { User, Building2, LogOut, LayoutDashboard, Menu, X, Globe, ChevronDown } from 'lucide-react';

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

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
      scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100' : 'bg-transparent'
    }`} data-testid="navbar">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer" data-testid="link-home-logo">
            <div className="w-8 h-8 bg-gradient-to-br from-[#D4AF37] to-[#F4E4BC] rounded-lg" />
            <span className="text-lg font-bold tracking-tight text-gray-900">FINATRADES</span>
          </div>
        </Link>

        <div className="hidden lg:flex items-center">
          <div className="flex items-center bg-[#1a1a2e] rounded-full p-1">
            {navLinks.map((link) => (
              <Link key={link.id} href={link.href}>
                <button
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    isActive(link.href) || (link.href === '/' && location === '/')
                      ? 'bg-[#6B21A8] text-white'
                      : 'text-gray-300 hover:text-white'
                  }`}
                  data-testid={`link-nav-${link.id}`}
                >
                  {link.label}
                </button>
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />

          {!user && (
            <div className="hidden md:flex items-center p-1 rounded-full border border-gray-200 bg-white">
              <button
                onClick={() => setAccountType('personal')}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                  accountType === 'personal' 
                    ? 'bg-white text-gray-800 shadow-sm border border-gray-200'
                    : 'text-gray-500 hover:text-gray-700'
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
                    ? 'bg-[#6B21A8] text-white'
                    : 'text-gray-500 hover:text-gray-700'
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
                  <Avatar className="h-10 w-10 border-2 border-[#D4AF37]/30">
                    <AvatarImage src="" alt={user.firstName} />
                    <AvatarFallback className="bg-gradient-to-br from-[#D4AF37] to-[#F4E4BC] text-[#1a1a2e] font-semibold">
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
                  variant="outline" 
                  className="rounded-full border-gray-300 text-gray-700"
                  data-testid="button-login"
                >
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button 
                  className="bg-gradient-to-r from-[#FF6B2F] to-[#FF8F5F] hover:opacity-90 text-white rounded-full"
                  data-testid="button-register"
                >
                  Get Started
                </Button>
              </Link>
            </div>
          )}

          <button 
            className="lg:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100"
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
          className="lg:hidden absolute top-16 left-0 right-0 bg-white border-b border-gray-100 shadow-lg"
        >
          <div className="container mx-auto px-6 py-4 space-y-2">
            {navLinks.map((link) => (
              <Link key={link.id} href={link.href}>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium ${
                    isActive(link.href)
                      ? 'bg-[#6B21A8] text-white'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                  data-testid={`mobile-link-${link.id}`}
                >
                  {link.label}
                </button>
              </Link>
            ))}
            
            {!user && (
              <div className="flex gap-2 pt-4 border-t border-gray-100">
                <Link href="/login" className="flex-1">
                  <Button variant="outline" className="w-full rounded-full" onClick={() => setMobileMenuOpen(false)}>
                    Sign In
                  </Button>
                </Link>
                <Link href="/register" className="flex-1">
                  <Button className="w-full bg-gradient-to-r from-[#FF6B2F] to-[#FF8F5F] text-white rounded-full" onClick={() => setMobileMenuOpen(false)}>
                    Get Started
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </nav>
  );
}
