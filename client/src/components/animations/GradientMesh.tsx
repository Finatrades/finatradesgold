import { motion } from 'framer-motion';

interface GradientMeshProps {
  className?: string;
}

export default function GradientMesh({ className = '' }: GradientMeshProps) {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full blur-[120px]"
        style={{ background: 'rgba(138, 43, 226, 0.08)', top: '10%', left: '10%' }}
        animate={{
          x: [0, 100, 50, -50, 0],
          y: [0, -50, 100, 50, 0],
          scale: [1, 1.2, 0.9, 1.1, 1],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full blur-[100px]"
        style={{ background: 'rgba(255, 47, 191, 0.06)', bottom: '10%', right: '10%' }}
        animate={{
          x: [0, -80, 60, -30, 0],
          y: [0, 60, -40, 80, 0],
          scale: [1, 0.9, 1.3, 1, 1],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute w-[400px] h-[400px] rounded-full blur-[80px]"
        style={{ background: 'rgba(255, 215, 0, 0.04)', top: '40%', right: '20%' }}
        animate={{
          x: [0, 50, -70, 30, 0],
          y: [0, -80, 30, -40, 0],
          scale: [1, 1.1, 1, 1.2, 1],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}
