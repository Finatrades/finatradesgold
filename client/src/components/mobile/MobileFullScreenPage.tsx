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
  purple: 'bg-gradient-to-r from-purple-600 to-purple-700',
  red: 'bg-gradient-to-r from-red-500 to-red-600',
  green: 'bg-gradient-to-r from-emerald-500 to-emerald-600',
  amber: 'bg-gradient-to-r from-amber-500 to-amber-600',
  blue: 'bg-gradient-to-r from-blue-500 to-blue-600',
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
          transition={{ type: 'spring', damping: 28, stiffness: 350 }}
          className="fixed inset-0 z-[55] bg-gray-50 flex flex-col"
          style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
        >
          <header
            className={`${headerColors[headerColor]} text-white px-4 py-4 flex items-center gap-3 shadow-lg`}
            style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
          >
            <button
              onClick={onClose}
              className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center touch-target haptic-press active:bg-white/30 transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold">{title}</h1>
              {subtitle && (
                <p className="text-sm text-white/80">{subtitle}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center touch-target haptic-press active:bg-white/30 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </header>

          <div
            className="flex-1 overflow-y-auto"
            style={{
              WebkitOverflowScrolling: 'touch',
              paddingBottom: footer ? '100px' : 'env(safe-area-inset-bottom, 0px)',
            }}
          >
            {children}
          </div>

          {footer && (
            <div
              className="fixed bottom-0 left-0 right-0 z-[60] bg-white border-t border-gray-200 px-4 py-4 shadow-lg"
              style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}
            >
              {footer}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
