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
          ? 'bg-white/95 backdrop-blur-xl border-b border-gray-200 shadow-sm' 
          : 'bg-white/80 backdrop-blur-md'
      }`}
      data-testid="finagold-navbar"
    >
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <img 
              src={finatradesLogo} 
              alt="Finatrades" 
              className="h-10 w-auto"
              data-testid="logo-finatrades"
            />
          </Link>

          <div className="hidden lg:flex items-center gap-1">
            {visibleLinks.map((link) => (
              link.isAnchor ? (
                <a
                  key={link.href}
                  href={link.href}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200"
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
                      ? 'bg-purple-100 text-purple-700 border border-purple-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                  data-testid={`nav-link-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {link.label}
                </Link>
              )
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-4">
            <div className="flex bg-gray-100 rounded-full p-1 border border-gray-200">
              <button
                onClick={() => setMode('personal')}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                  isPersonal
                    ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-lg shadow-purple-200'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                data-testid="toggle-personal"
              >
                <span className="text-xs">👤</span> Personal
              </button>
              <button
                onClick={() => setMode('business')}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                  !isPersonal
                    ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-lg shadow-purple-200'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                data-testid="toggle-business"
              >
                <span className="text-xs">💼</span> Business
              </button>
            </div>
            <Link 
              href="/login"
              className="text-gray-600 hover:text-gray-900 px-4 py-2.5 text-sm font-medium transition-colors"
              data-testid="btn-sign-in"
            >
              Sign In
            </Link>
            <Link 
              href="/register"
              className="bg-gradient-to-r from-purple-600 to-pink-500 text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:from-purple-700 hover:to-pink-600 transition-colors shadow-lg shadow-purple-200"
              data-testid="btn-get-started"
            >
              Get Started
            </Link>
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden text-gray-700 p-2"
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
              className="lg:hidden mt-4 pb-4 border-t border-gray-200 pt-4"
            >
              <div className="flex flex-col gap-2">
                {visibleLinks.map((link) => (
                  link.isAnchor ? (
                    <a
                      key={link.href}
                      href={link.href}
                      className="px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all"
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
                          ? 'bg-purple-100 text-purple-700 border border-purple-200'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
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
                        ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white'
                        : 'bg-gray-100 text-gray-600 border border-gray-200'
                    }`}
                  >
                    Personal
                  </button>
                  <button
                    onClick={() => setMode('business')}
                    className={`flex-1 px-4 py-2.5 rounded-full text-sm font-medium transition-all ${
                      !isPersonal
                        ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white'
                        : 'bg-gray-100 text-gray-600 border border-gray-200'
                    }`}
                  >
                    Business
                  </button>
                </div>
                <Link 
                  href="/login"
                  className="block border border-gray-200 text-gray-700 px-6 py-3 rounded-full text-sm font-semibold w-full mt-2 text-center hover:bg-gray-50"
                >
                  Sign In
                </Link>
                <Link 
                  href="/register"
                  className="block bg-gradient-to-r from-purple-600 to-pink-500 text-white px-6 py-3 rounded-full text-sm font-semibold w-full text-center"
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
