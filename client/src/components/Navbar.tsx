import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
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
import { LogOut, LayoutDashboard, Menu, X, ChevronRight, User } from 'lucide-react';
import FinatradesLogo from '@/components/FinatradesLogo';

export default function Navbar() {
  const { t, language } = useLanguage();
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
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
    <motion.nav 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`fixed top-0 w-full z-50 transition-all duration-500 ${
        scrolled 
          ? 'bg-white/95 backdrop-blur-xl shadow-lg shadow-purple-100/50 border-b border-purple-100' 
          : 'bg-white/90 backdrop-blur-md'
      }`} 
      data-testid="navbar"
    >
      <div className="container mx-auto px-6">
        <div className="h-20 flex items-center justify-between">
          <Link href="/">
            <motion.div 
              className="cursor-pointer"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              data-testid="link-home-logo"
            >
              <FinatradesLogo variant="color" size="md" />
            </motion.div>
          </Link>

          <div className="hidden lg:flex items-center gap-2">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => {
                  if (!scrollToSection(link.href)) {
                    window.location.href = link.href;
                  }
                }}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                  isActive(link.href) || (link.href === '/' && location === '/')
                    ? 'text-purple-600 bg-purple-50'
                    : 'text-gray-600 hover:text-purple-600 hover:bg-purple-50/50'
                }`}
                data-testid={`link-nav-${link.id}`}
              >
                {link.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:block">
              <LanguageSwitcher />
            </div>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-11 w-11 rounded-full p-0 hover:bg-transparent" data-testid="button-user-menu">
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Avatar className="h-11 w-11 border-2 border-purple-200 shadow-lg shadow-purple-100">
                        <AvatarImage src={user.profilePhoto || ''} alt={user.firstName} />
                        <AvatarFallback className="bg-gradient-to-br from-purple-500 to-purple-500 text-white font-bold text-sm">
                          {user.firstName[0]}{user.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                    </motion.div>
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
                    <LayoutDashboard className="mr-2 h-4 w-4 text-purple-500" />
                    <span>{user.role === 'admin' ? 'Admin Panel' : 'Dashboard'}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => window.location.href = '/profile'} className="hover:bg-purple-50 cursor-pointer" data-testid="menu-item-profile">
                    <User className="mr-2 h-4 w-4 text-purple-500" />
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
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="hidden md:flex items-center gap-3"
              >
                <Link href="/login">
                  <Button 
                    variant="ghost" 
                    className="rounded-full text-gray-700 hover:bg-gray-100 hover:text-gray-900 px-5 font-medium"
                    data-testid="button-login"
                  >
                    Sign In
                  </Button>
                </Link>
                <Link href="/register">
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button 
                      className="bg-gradient-to-r from-purple-500 to-purple-500 hover:shadow-lg hover:shadow-purple-200 text-white rounded-full px-6 font-semibold transition-all duration-300"
                      data-testid="button-register"
                    >
                      Get Started
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </motion.div>
                </Link>
              </motion.div>
            )}

            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="lg:hidden p-2.5 rounded-xl text-gray-700 bg-gray-100 border border-gray-200 hover:border-purple-300 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="button-mobile-menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </motion.button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="lg:hidden overflow-hidden bg-white border-t border-gray-100"
          >
            <div className="container mx-auto px-6 py-6 space-y-3">
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
                    isActive(link.href)
                      ? 'bg-purple-50 text-purple-600 border border-purple-200'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
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
                  className="pt-4 border-t border-gray-100"
                >
                  <div className="flex gap-3">
                    <Link href="/login" className="flex-1">
                      <Button 
                        variant="outline" 
                        className="w-full rounded-full border-gray-300 text-gray-700 bg-white hover:bg-gray-50 py-5"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Sign In
                      </Button>
                    </Link>
                    <Link href="/register" className="flex-1">
                      <Button 
                        className="w-full bg-gradient-to-r from-purple-500 to-purple-500 text-white rounded-full py-5 font-semibold"
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
    </motion.nav>
  );
}
