import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import MobileBottomNav from './MobileBottomNav';

interface MobileShellProps {
  children: React.ReactNode;
  hideNav?: boolean;
}

export default function MobileShell({ children, hideNav = false }: MobileShellProps) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-muted/40 page-container" style={{ paddingTop: 'var(--safe-area-top)' }}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={location}
          initial={{ opacity: 0, x: 15 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -15 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          {children}
        </motion.div>
      </AnimatePresence>

      {!hideNav && <MobileBottomNav />}
    </div>
  );
}
