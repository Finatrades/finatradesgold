import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, X } from 'lucide-react';

interface MobileFullScreenPageProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  headerColor?: 'purple' | 'red' | 'green' | 'amber' | 'blue';
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const headerColors = {
  purple: 'bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-700',
  red: 'bg-gradient-to-br from-red-500 via-rose-500 to-pink-600',
  green: 'bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600',
  amber: 'bg-gradient-to-br from-amber-500 via-orange-500 to-yellow-600',
  blue: 'bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-600',
};

export default function MobileFullScreenPage({
  isOpen,
  onClose,
  title,
  subtitle,
  headerColor = 'purple',
  children,
  footer,
}: MobileFullScreenPageProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 400 }}
          className="fixed inset-0 z-[55] bg-gray-50 flex flex-col"
          style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
        >
          <header
            className={`${headerColors[headerColor]} text-white px-4 py-5 flex items-center gap-3 shadow-xl relative overflow-hidden`}
            style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.25rem)' }}
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -ml-16 -mb-16" />
            
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="relative z-10 w-11 h-11 rounded-xl bg-white/15 backdrop-blur-lg border border-white/20 flex items-center justify-center shadow-lg active:bg-white/25 transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
            <div className="flex-1 relative z-10">
              <motion.h1 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-xl font-bold"
              >
                {title}
              </motion.h1>
              {subtitle && (
                <motion.p 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 }}
                  className="text-sm text-white/80"
                >
                  {subtitle}
                </motion.p>
              )}
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="relative z-10 w-11 h-11 rounded-xl bg-white/15 backdrop-blur-lg border border-white/20 flex items-center justify-center shadow-lg active:bg-white/25 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </motion.button>
          </header>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-50 to-white"
            style={{
              WebkitOverflowScrolling: 'touch',
              paddingBottom: footer ? '100px' : 'env(safe-area-inset-bottom, 0px)',
            }}
          >
            {children}
          </motion.div>

          {footer && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="fixed bottom-0 left-0 right-0 z-[60] bg-white/95 backdrop-blur-xl border-t border-gray-200/50 px-4 py-4 shadow-2xl"
              style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}
            >
              {footer}
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
