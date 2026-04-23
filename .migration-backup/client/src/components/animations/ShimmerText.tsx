import { motion } from 'framer-motion';

interface ShimmerTextProps {
  children: React.ReactNode;
  className?: string;
  shimmerColor?: string;
}

export default function ShimmerText({ children, className = '', shimmerColor = 'rgba(255, 215, 0, 0.4)' }: ShimmerTextProps) {
  return (
    <span className={`relative inline-block ${className}`}>
      {children}
      <motion.span
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${shimmerColor} 50%, transparent 100%)`,
          backgroundSize: '200% 100%',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          mixBlendMode: 'overlay',
        }}
        animate={{
          backgroundPosition: ['200% 0%', '-200% 0%'],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          repeatDelay: 4,
          ease: 'easeInOut',
        }}
      />
    </span>
  );
}
