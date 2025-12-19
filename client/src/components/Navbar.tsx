import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useAccountType } from '@/context/AccountTypeContext';
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
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, LayoutDashboard, Menu, X, ChevronRight, User, Globe, ChevronDown } from 'lucide-react';
import FinatradesLogo from '@/components/FinatradesLogo';

export default function Navbar() {
  const { t, language, setLanguage } = useLanguage();
  const { user, logout } = useAuth();
  const { accountType, setAccountType } = useAccountType();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    <header 
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-gradient-to-r from-[#0D001E] via-[#2A0055] to-[#4B0082]"
      data-testid="navbar"
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/">
            <button className="flex items-center group" data-testid="link-home-logo">
              <FinatradesLogo variant="white" size="md" />
            </button>
          </Link>

          {/* Center Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => {
              const active = isActive(link.href) || (link.id === 'home' && location === '/');
              return (
                <button
                  key={link.id}
                  onClick={() => {
                    if (!scrollToSection(link.href)) {
                      window.location.href = link.href;
                    }
                  }}
                  className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
                    active
                      ? 'bg-[#8A2BE2] text-white'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                  data-testid={`link-nav-${link.id}`}
                >
                  {link.label}
                </button>
              );
            })}
          </nav>

          {/* Right Side Controls */}
          <div className="flex items-center gap-3">
            {/* Language Selector - Compact */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="hidden md:flex items-center gap-1 px-3 py-1.5 text-sm text-white/80 hover:text-white border border-white/20 rounded-full transition-colors" data-testid="button-language">
                  <Globe className="w-4 h-4" />
                  <span className="uppercase">{language}</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white border-gray-200">
                <DropdownMenuItem onClick={() => setLanguage('en')} className="cursor-pointer">English</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage('ar')} className="cursor-pointer">العربية</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Personal/Business Toggle */}
            <div className="hidden md:flex items-center bg-white/10 rounded-full p-0.5 border border-white/20">
              <button
                onClick={() => setAccountType('personal')}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
                  accountType === 'personal'
                    ? 'bg-[#8A2BE2] text-white'
                    : 'text-white/70 hover:text-white'
                }`}
                data-testid="button-personal"
              >
                Personal
              </button>
              <button
                onClick={() => setAccountType('business')}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
                  accountType === 'business'
                    ? 'bg-[#8A2BE2] text-white'
                    : 'text-white/70 hover:text-white'
                }`}
                data-testid="button-business"
              >
                Business
              </button>
            </div>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 hover:bg-white/10" data-testid="button-user-menu">
                    <Avatar className="h-10 w-10 border-2 border-white/30">
                      <AvatarImage src={user.profilePhoto || ''} alt={user.firstName} />
                      <AvatarFallback className="bg-[#8A2BE2] text-white font-bold text-sm">
                        {user.firstName[0]}{user.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-white border-gray-200" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium text-gray-900">{user.firstName} {user.lastName}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-gray-100" />
                  <DropdownMenuItem onClick={() => window.location.href = user.role === 'admin' ? '/admin/dashboard' : '/dashboard'} className="hover:bg-purple-50 cursor-pointer" data-testid="menu-item-dashboard">
                    <LayoutDashboard className="mr-2 h-4 w-4 text-[#8A2BE2]" />
                    <span>{user.role === 'admin' ? 'Admin Panel' : 'Dashboard'}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => window.location.href = '/profile'} className="hover:bg-purple-50 cursor-pointer" data-testid="menu-item-profile">
                    <User className="mr-2 h-4 w-4 text-[#8A2BE2]" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-gray-100" />
                  <DropdownMenuItem onClick={logout} className="hover:bg-red-50 cursor-pointer text-red-600" data-testid="menu-item-logout">
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
                    className="rounded-full border-white/30 text-white bg-transparent hover:bg-white/10 px-5 font-medium"
                    data-testid="button-login"
                  >
                    Sign In
                  </Button>
                </Link>
                <Link href="/register">
                  <Button 
                    className="bg-gradient-to-r from-[#8A2BE2] to-[#FF2FBF] hover:opacity-90 text-white rounded-full px-5 font-semibold"
                    data-testid="button-register"
                  >
                    Get Started
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button 
              className="lg:hidden p-2.5 rounded-xl text-white bg-white/10 border border-white/20 hover:bg-white/20 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="button-mobile-menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="lg:hidden overflow-hidden bg-[#1a0a2e] border-t border-white/10"
          >
            <div className="container mx-auto px-6 py-6 space-y-3">
              {/* Mobile Personal/Business Toggle */}
              <div className="flex items-center justify-center bg-white/10 rounded-full p-1 mb-4">
                <button
                  onClick={() => setAccountType('personal')}
                  className={`flex-1 py-2 text-sm font-medium rounded-full transition-all ${
                    accountType === 'personal'
                      ? 'bg-[#8A2BE2] text-white'
                      : 'text-white/70'
                  }`}
                >
                  Personal
                </button>
                <button
                  onClick={() => setAccountType('business')}
                  className={`flex-1 py-2 text-sm font-medium rounded-full transition-all ${
                    accountType === 'business'
                      ? 'bg-[#8A2BE2] text-white'
                      : 'text-white/70'
                  }`}
                >
                  Business
                </button>
              </div>

              {navLinks.map((link, index) => (
                <motion.button
                  key={link.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => {
                    if (!scrollToSection(link.href)) {
                      window.location.href = link.href;
                    }
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-5 py-4 rounded-xl text-sm font-medium flex items-center justify-between transition-all ${
                    isActive(link.href) || (link.id === 'home' && location === '/')
                      ? 'bg-[#8A2BE2] text-white'
                      : 'text-white/80 hover:bg-white/10'
                  }`}
                  data-testid={`mobile-link-${link.id}`}
                >
                  {link.label}
                  <ChevronRight className="w-4 h-4 opacity-50" />
                </motion.button>
              ))}
              
              {!user && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="pt-4 border-t border-white/10"
                >
                  <div className="flex gap-3">
                    <Link href="/login" className="flex-1">
                      <Button 
                        variant="outline" 
                        className="w-full rounded-full border-white/30 text-white bg-transparent hover:bg-white/10 py-5"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Sign In
                      </Button>
                    </Link>
                    <Link href="/register" className="flex-1">
                      <Button 
                        className="w-full bg-gradient-to-r from-[#8A2BE2] to-[#FF2FBF] text-white rounded-full py-5 font-semibold"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Get Started
                      </Button>
                    </Link>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
