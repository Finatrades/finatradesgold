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
          ? 'bg-black/90 backdrop-blur-xl border-b border-[#EAC26B]/10' 
          : 'bg-black/50 backdrop-blur-md'
      }`}
      data-testid="finagold-navbar"
    >
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link href="/">
            <a className="flex items-center">
              <img 
                src={finatradesLogo} 
                alt="Finatrades" 
                className="h-10 w-auto"
                data-testid="logo-finatrades"
              />
            </a>
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
                <Link key={link.href} href={link.href}>
                  <a
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive(link.href)
                        ? 'bg-white/10 text-white border border-white/20'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                    data-testid={`nav-link-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {link.label}
                  </a>
                </Link>
              )
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-4">
            <div className="flex bg-white/5 rounded-full p-1 border border-white/10">
              <button
                onClick={() => setMode('personal')}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                  isPersonal
                    ? 'bg-[#EAC26B] text-black shadow-lg shadow-[#EAC26B]/20'
                    : 'text-gray-400 hover:text-white'
                }`}
                data-testid="toggle-personal"
              >
                Personal
              </button>
              <button
                onClick={() => setMode('business')}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                  !isPersonal
                    ? 'bg-[#EAC26B] text-black shadow-lg shadow-[#EAC26B]/20'
                    : 'text-gray-400 hover:text-white'
                }`}
                data-testid="toggle-business"
              >
                Business
              </button>
            </div>
            <Link href="/login">
              <a
                className="text-gray-300 hover:text-white px-4 py-2.5 text-sm font-medium transition-colors"
                data-testid="btn-sign-in"
              >
                Sign In
              </a>
            </Link>
            <Link href="/register">
              <a
                className="bg-[#EAC26B] text-black px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-[#d4af5a] transition-colors shadow-lg shadow-[#EAC26B]/20"
                data-testid="btn-get-started"
              >
                Get Started
              </a>
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
                    <Link key={link.href} href={link.href}>
                      <a
                        className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                          isActive(link.href)
                            ? 'bg-white/10 text-white border border-white/20'
                            : 'text-gray-400 hover:text-white'
                        }`}
                        onClick={() => setMobileOpen(false)}
                      >
                        {link.label}
                      </a>
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
                <Link href="/login">
                  <a className="block border border-white/20 text-white px-6 py-3 rounded-full text-sm font-semibold w-full mt-2 text-center">
                    Sign In
                  </a>
                </Link>
                <Link href="/register">
                  <a className="block bg-[#EAC26B] text-black px-6 py-3 rounded-full text-sm font-semibold w-full text-center">
                    Get Started
                  </a>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
}
