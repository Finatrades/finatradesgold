import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ChevronDown } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useMode } from '../context/ModeContext';
import finatradesLogo from '@/assets/finatrades-logo-purple.png';

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
  { label: 'FinaVault', href: '/finagold/finavault' },
  { label: 'FinaPay', href: '/finagold/finapay' },
  { label: 'BNSL', href: '/finagold/bnsl' },
  { label: 'FinaBridge', href: '/finagold/finabridge', businessOnly: true },
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
    if (href === '/') return location === '/' || location === '/finagold';
    return location.startsWith(href);
  };

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-gradient-to-r from-[#0D001E] via-[#2A0055] to-[#4B0082] shadow-lg shadow-purple-900/20' 
          : 'bg-gradient-to-r from-[#0D001E] via-[#2A0055] to-[#4B0082]'
      }`}
      data-testid="finagold-navbar"
    >
      <div className="max-w-7xl mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <img 
              src={finatradesLogo} 
              alt="Finatrades" 
              className="h-12 w-auto brightness-[2] saturate-[1.5]"
              data-testid="logo-finatrades"
            />
          </Link>

          <div className="hidden lg:flex items-center gap-1">
            {visibleLinks.map((link) => (
              link.isAnchor ? (
                <a
                  key={link.href}
                  href={link.href}
                  className="px-4 py-2 rounded-full text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200"
                  data-testid={`nav-link-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {link.label}
                </a>
              ) : (
                <Link 
                  key={link.href} 
                  href={link.href}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    isActive(link.href)
                      ? 'bg-purple-600 text-white'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                  data-testid={`nav-link-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {link.label}
                </Link>
              )
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-3">
            {/* Personal/Business Toggle */}
            <div className="flex bg-white/10 rounded-full p-0.5 border border-white/20">
              <button
                onClick={() => setMode('personal')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                  isPersonal
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                    : 'text-white/70 hover:text-white'
                }`}
                data-testid="toggle-personal"
              >
                <span className="text-xs">👤</span> Personal
              </button>
              <button
                onClick={() => setMode('business')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                  !isPersonal
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                    : 'text-white/70 hover:text-white'
                }`}
                data-testid="toggle-business"
              >
                <span className="text-xs">💼</span> Business
              </button>
            </div>

            <Link 
              href="/sign-in"
              className="text-white hover:text-white/80 px-4 py-2 text-sm font-medium transition-colors border border-white/30 rounded-full hover:bg-white/10"
              data-testid="btn-sign-in"
            >
              Sign In
            </Link>
            <Link 
              href="/get-started"
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-5 py-2 rounded-full text-sm font-semibold hover:from-purple-600 hover:to-pink-600 transition-all"
              data-testid="btn-get-started"
            >
              Get Started
            </Link>
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden text-white p-3 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg active:bg-white/10 transition-colors"
            data-testid="mobile-menu-toggle"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
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
              className="lg:hidden mt-4 pb-6 border-t border-white/20 pt-4 max-h-[calc(100dvh-80px)] overflow-y-auto"
            >
              <div className="flex flex-col gap-1">
                {visibleLinks.map((link) => (
                  link.isAnchor ? (
                    <a
                      key={link.href}
                      href={link.href}
                      className="px-4 py-4 min-h-[48px] rounded-lg text-base font-medium text-white/80 hover:text-white active:bg-white/10 transition-all flex items-center"
                      onClick={() => setMobileOpen(false)}
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link 
                      key={link.href} 
                      href={link.href}
                      className={`px-4 py-4 min-h-[48px] rounded-lg text-base font-medium transition-all flex items-center ${
                        isActive(link.href)
                          ? 'bg-purple-600 text-white'
                          : 'text-white/80 hover:text-white active:bg-white/10'
                      }`}
                      onClick={() => setMobileOpen(false)}
                    >
                      {link.label}
                    </Link>
                  )
                ))}
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => setMode('personal')}
                    className={`flex-1 px-4 py-3 min-h-[48px] rounded-full text-sm font-medium transition-all active:scale-95 ${
                      isPersonal
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                        : 'bg-white/10 text-white/70 border border-white/20'
                    }`}
                  >
                    Personal
                  </button>
                  <button
                    onClick={() => setMode('business')}
                    className={`flex-1 px-4 py-3 min-h-[48px] rounded-full text-sm font-medium transition-all active:scale-95 ${
                      !isPersonal
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                        : 'bg-white/10 text-white/70 border border-white/20'
                    }`}
                  >
                    Business
                  </button>
                </div>
                <Link 
                  href="/sign-in"
                  className="block border border-white/30 text-white px-6 py-4 min-h-[52px] rounded-full text-base font-semibold w-full mt-3 text-center active:bg-white/10 transition-all flex items-center justify-center"
                >
                  Sign In
                </Link>
                <Link 
                  href="/get-started"
                  className="block bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-4 min-h-[52px] rounded-full text-base font-semibold w-full text-center active:scale-[0.98] transition-all flex items-center justify-center"
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
