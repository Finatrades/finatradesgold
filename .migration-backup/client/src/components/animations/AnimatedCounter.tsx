import { motion, useMotionValue, useTransform, animate, useInView } from 'framer-motion';
import { useEffect, useRef } from 'react';

interface AnimatedCounterProps {
  from?: number;
  to: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  className?: string;
}

export default function AnimatedCounter({ 
  from = 0, 
  to, 
  duration = 2, 
  suffix = '', 
  prefix = '',
  decimals = 0,
  className = '' 
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const count = useMotionValue(from);
  const rounded = useTransform(count, (v) => {
    if (decimals > 0) return v.toFixed(decimals);
    return Math.round(v).toLocaleString();
  });

  useEffect(() => {
    if (isInView) {
      const controls = animate(count, to, { 
        duration,
        ease: [0.25, 0.46, 0.45, 0.94],
      });
      return controls.stop;
    }
  }, [isInView, to, duration, count]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      <motion.span>{rounded}</motion.span>
      {suffix}
    </span>
  );
}
