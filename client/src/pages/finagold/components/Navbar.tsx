import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { useMode } from '../context/ModeContext';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { mode, setMode, isPersonal } = useMode();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = ['Home', 'How It Works', 'Products', 'Certificates', 'Contact'];

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
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#EAC26B] to-[#d4af5a] flex items-center justify-center">
              <span className="text-black font-bold text-lg">F</span>
            </div>
            <div>
              <span className="text-xl font-bold text-white tracking-tight">FINATRADES</span>
              <p className="text-[10px] text-gray-500 -mt-1">Swiss-Regulated Platform</p>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link}
                href={`#${link.toLowerCase().replace(/\s+/g, '-')}`}
                className="text-gray-400 hover:text-white transition-colors text-sm font-medium"
                data-testid={`nav-link-${link.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {link}
              </a>
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
            <button
              className="text-gray-300 hover:text-white px-4 py-2.5 text-sm font-medium transition-colors"
              data-testid="btn-sign-in"
            >
              Sign In
            </button>
            <button
              className="bg-[#EAC26B] text-black px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-[#d4af5a] transition-colors shadow-lg shadow-[#EAC26B]/20"
              data-testid="btn-get-started"
            >
              Get Started
            </button>
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
              <div className="flex flex-col gap-4">
                {navLinks.map((link) => (
                  <a
                    key={link}
                    href={`#${link.toLowerCase().replace(/\s+/g, '-')}`}
                    className="text-gray-400 hover:text-white transition-colors text-sm font-medium"
                    onClick={() => setMobileOpen(false)}
                  >
                    {link}
                  </a>
                ))}
                <div className="flex gap-2 mt-2">
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
                <button className="border border-white/20 text-white px-6 py-3 rounded-full text-sm font-semibold w-full mt-2">
                  Sign In
                </button>
                <button className="bg-[#EAC26B] text-black px-6 py-3 rounded-full text-sm font-semibold w-full">
                  Get Started
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
}
