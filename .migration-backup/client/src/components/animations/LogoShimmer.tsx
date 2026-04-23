import { motion } from 'framer-motion';

interface LogoShimmerProps {
  children: React.ReactNode;
  className?: string;
}

export default function LogoShimmer({ children, className = '' }: LogoShimmerProps) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {children}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(105deg, transparent 40%, rgba(255, 215, 0, 0.15) 45%, rgba(255, 215, 0, 0.25) 50%, rgba(255, 215, 0, 0.15) 55%, transparent 60%)',
        }}
        animate={{
          x: ['-100%', '200%'],
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          repeatDelay: 5,
          ease: 'easeInOut',
        }}
      />
    </div>
  );
}
