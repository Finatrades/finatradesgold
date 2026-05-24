import { motion, AnimatePresence, type Variants, type Transition } from 'framer-motion';
import { useLocation } from 'wouter';

interface PageTransitionProps {
  children: React.ReactNode;
}

const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 8,
  },
  in: {
    opacity: 1,
    y: 0,
  },
  out: {
    opacity: 0,
    y: -8,
  },
};

const pageTransition: Transition = {
  type: 'tween',
  ease: [0.25, 0.46, 0.45, 0.94] as const,
  duration: 0.3,
};

export default function PageTransition({ children }: PageTransitionProps) {
  const [location] = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location}
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
