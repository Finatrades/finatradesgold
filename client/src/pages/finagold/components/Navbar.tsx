import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountType, setAccountType] = useState<'personal' | 'business'>('personal');

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = ['Home', 'Products', 'How it Works', 'About', 'Contact'];

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-black/80 backdrop-blur-xl border-b border-[#EAC26B]/10' 
          : 'bg-transparent'
      }`}
      data-testid="finagold-navbar"
    >
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-white tracking-tight">FINAGOLD</span>
            <span className="text-xs text-gray-500 hidden sm:block">Powered by Finatrades</span>
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
                onClick={() => setAccountType('personal')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  accountType === 'personal'
                    ? 'bg-[#EAC26B] text-black'
                    : 'text-gray-400 hover:text-white'
                }`}
                data-testid="toggle-personal"
              >
                Personal
              </button>
              <button
                onClick={() => setAccountType('business')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  accountType === 'business'
                    ? 'bg-[#EAC26B] text-black'
                    : 'text-gray-400 hover:text-white'
                }`}
                data-testid="toggle-business"
              >
                Business
              </button>
            </div>
            <button
              className="bg-[#EAC26B] text-black px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-[#d4af5a] transition-colors"
              data-testid="btn-open-account"
            >
              Open Account
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
                  onClick={() => setAccountType('personal')}
                  className={`flex-1 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    accountType === 'personal'
                      ? 'bg-[#EAC26B] text-black'
                      : 'bg-white/5 text-gray-400 border border-white/10'
                  }`}
                >
                  Personal
                </button>
                <button
                  onClick={() => setAccountType('business')}
                  className={`flex-1 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    accountType === 'business'
                      ? 'bg-[#EAC26B] text-black'
                      : 'bg-white/5 text-gray-400 border border-white/10'
                  }`}
                >
                  Business
                </button>
              </div>
              <button className="bg-[#EAC26B] text-black px-6 py-3 rounded-full text-sm font-semibold w-full">
                Open Account
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </motion.nav>
  );
}
