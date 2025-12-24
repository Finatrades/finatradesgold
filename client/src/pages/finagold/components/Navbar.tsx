import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ChevronDown } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useMode } from '../context/ModeContext';
import finatradesLogo from '@/assets/finatrades-logo.png';

type NavLink = {
  label: string;
  href: string;
  isAnchor?: boolean;
  businessOnly?: boolean;
};

const universalLinks: NavLink[] = [
  { label: 'Home', href: '/' },
  { label: 'Products', href: '#products', isAnchor: true },
  { label: 'How It Works', href: '#how-it-works', isAnchor: true },
  { label: 'About', href: '#who-its-for', isAnchor: true },
  { label: 'Contact', href: '#contact', isAnchor: true },
];

const productLinks: NavLink[] = [
  { label: 'Home', href: '/' },
  { label: 'FinaVault', href: '/finavault-landing' },
  { label: 'FinaPay', href: '/finapay-landing' },
  { label: 'BNSL', href: '/bnsl-landing' },
  { label: 'FinaBridge', href: '/finabridge-landing', businessOnly: true },
];

interface NavbarProps {
  variant?: 'universal' | 'products';
}

export default function Navbar({ variant = 'universal' }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { mode, setMode, isPersonal } = useMode();
  const [location] = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const baseLinks = variant === 'products' ? productLinks : universalLinks;
  const visibleLinks = baseLinks.filter(link => 
    !link.businessOnly || !isPersonal
  );

  const isActive = (href: string) => {
    if (href.startsWith('#')) return false;
    if (href === '/') return location === '/';
    return location.startsWith(href);
  };

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-gradient-to-r from-[#0D001E] via-[#2A0055] to-[#4B0082] backdrop-blur-xl border-b border-[#8A2BE2]/20' 
          : 'bg-gradient-to-r from-[#0D001E] via-[#2A0055] to-[#4B0082]'
      }`}
      data-testid="finagold-navbar"
    >
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <img 
              src={finatradesLogo} 
              alt="Finatrades" 
              className="h-10 w-auto brightness-0 invert"
              data-testid="logo-finatrades"
            />
          </Link>

          <div className="hidden lg:flex items-center gap-1">
            {visibleLinks.map((link) => (
              link.isAnchor ? (
                <a
                  key={link.href}
                  href={link.href}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-200"
                  data-testid={`nav-link-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {link.label}
                </a>
              ) : (
                <Link 
                  key={link.href} 
                  href={link.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive(link.href)
                      ? 'bg-white/10 text-white border border-white/20'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                  data-testid={`nav-link-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {link.label}
                </Link>
              )
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-4">
            <div className="flex bg-white/10 rounded-full p-1 border border-white/20">
              <button
                onClick={() => setMode('personal')}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                  isPersonal
                    ? 'bg-[#F97316] text-white shadow-lg shadow-[#F97316]/30'
                    : 'text-white/70 hover:text-white'
                }`}
                data-testid="toggle-personal"
              >
                <span className="text-xs">👤</span> Personal
              </button>
              <button
                onClick={() => setMode('business')}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                  !isPersonal
                    ? 'bg-white text-[#4B0082] shadow-lg'
                    : 'text-white/70 hover:text-white'
                }`}
                data-testid="toggle-business"
              >
                <span className="text-xs">💼</span> Business
              </button>
            </div>
            <Link 
              href="/login"
              className="text-white/80 hover:text-white px-4 py-2.5 text-sm font-medium transition-colors"
              data-testid="btn-sign-in"
            >
              Sign In
            </Link>
            <Link 
              href="/register"
              className="bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:from-[#EA580C] hover:to-[#DC2626] transition-colors shadow-lg shadow-[#F97316]/30"
              data-testid="btn-get-started"
            >
              Get Started
            </Link>
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden text-white p-2"
            data-testid="mobile-menu-toggle"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden mt-4 pb-4 border-t border-white/10 pt-4"
            >
              <div className="flex flex-col gap-2">
                {visibleLinks.map((link) => (
                  link.isAnchor ? (
                    <a
                      key={link.href}
                      href={link.href}
                      className="px-4 py-3 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-all"
                      onClick={() => setMobileOpen(false)}
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link 
                      key={link.href} 
                      href={link.href}
                      className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                        isActive(link.href)
                          ? 'bg-white/10 text-white border border-white/20'
                          : 'text-gray-400 hover:text-white'
                      }`}
                      onClick={() => setMobileOpen(false)}
                    >
                      {link.label}
                    </Link>
                  )
                ))}
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => setMode('personal')}
                    className={`flex-1 px-4 py-2.5 rounded-full text-sm font-medium transition-all ${
                      isPersonal
                        ? 'bg-[#EAC26B] text-black'
                        : 'bg-white/5 text-gray-400 border border-white/10'
                    }`}
                  >
                    Personal
                  </button>
                  <button
                    onClick={() => setMode('business')}
                    className={`flex-1 px-4 py-2.5 rounded-full text-sm font-medium transition-all ${
                      !isPersonal
                        ? 'bg-[#EAC26B] text-black'
                        : 'bg-white/5 text-gray-400 border border-white/10'
                    }`}
                  >
                    Business
                  </button>
                </div>
                <Link 
                  href="/login"
                  className="block border border-white/20 text-white px-6 py-3 rounded-full text-sm font-semibold w-full mt-2 text-center"
                >
                  Sign In
                </Link>
                <Link 
                  href="/register"
                  className="block bg-[#EAC26B] text-black px-6 py-3 rounded-full text-sm font-semibold w-full text-center"
                >
                  Get Started
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
}
