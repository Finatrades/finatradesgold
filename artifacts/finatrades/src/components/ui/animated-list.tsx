import { ReactNode, Children } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AnimatedListProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  stagger?: number;
}

export function AnimatedList({
  children,
  className,
  delay = 0,
  stagger = 0.06,
}: AnimatedListProps) {
  const items = Children.toArray(children);
  return (
    <div className={cn('flex flex-col', className)}>
      {items.map((child, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: delay + i * stagger,
            duration: 0.32,
            ease: [0.2, 0.7, 0.2, 1],
          }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  );
}
