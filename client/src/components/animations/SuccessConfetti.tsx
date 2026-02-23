import { motion, AnimatePresence } from 'framer-motion';
import { useMemo } from 'react';

interface SuccessConfettiProps {
  show: boolean;
  duration?: number;
}

const colors = ['#8A2BE2', '#FF2FBF', '#FFD700', '#22C55E', '#F97316', '#3B82F6'];

export default function SuccessConfetti({ show, duration = 3000 }: SuccessConfettiProps) {
  const confetti = useMemo(() => 
    Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 8 + 4,
      rotation: Math.random() * 360,
      delay: Math.random() * 0.5,
      shape: Math.random() > 0.5 ? 'circle' : 'square',
    })),
    [show]
  );

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, delay: duration / 1000 - 0.5 }}
          className="fixed inset-0 pointer-events-none z-[9999]"
        >
          {confetti.map((c) => (
            <motion.div
              key={c.id}
              className="absolute"
              style={{
                left: `${c.x}%`,
                top: '-5%',
                width: c.size,
                height: c.shape === 'square' ? c.size : c.size,
                borderRadius: c.shape === 'circle' ? '50%' : '2px',
                background: c.color,
              }}
              initial={{ y: 0, rotate: 0, opacity: 1 }}
              animate={{
                y: ['0vh', '110vh'],
                rotate: [c.rotation, c.rotation + 720],
                opacity: [1, 1, 0],
                x: [0, (Math.random() - 0.5) * 200],
              }}
              transition={{
                duration: Math.random() * 2 + 2,
                delay: c.delay,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
