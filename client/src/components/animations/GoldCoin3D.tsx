import { motion } from 'framer-motion';

interface GoldCoin3DProps {
  size?: number;
  className?: string;
}

export default function GoldCoin3D({ size = 120, className = '' }: GoldCoin3DProps) {
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size, perspective: '600px' }}>
      <motion.div
        animate={{ rotateY: [0, 360] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
        style={{
          width: size,
          height: size,
          transformStyle: 'preserve-3d',
          position: 'relative',
        }}
      >
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'linear-gradient(135deg, #FFD700, #DAA520, #B8860B, #FFD700)',
            boxShadow: 'inset 0 0 30px rgba(184, 134, 11, 0.5), 0 0 40px rgba(255, 215, 0, 0.3)',
            backfaceVisibility: 'hidden',
          }}
        >
          <div className="absolute inset-3 rounded-full border-2 border-[#B8860B]/40 flex items-center justify-center">
            <span className="text-[#8B6914] font-bold" style={{ fontSize: size * 0.3 }}>FT</span>
          </div>
          <div 
            className="absolute inset-0 rounded-full"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)',
            }}
          />
        </div>

        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'linear-gradient(135deg, #B8860B, #DAA520, #FFD700, #B8860B)',
            boxShadow: 'inset 0 0 30px rgba(184, 134, 11, 0.5)',
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          <div className="absolute inset-3 rounded-full border-2 border-[#B8860B]/40 flex items-center justify-center">
            <span className="text-[#8B6914]" style={{ fontSize: size * 0.35 }}>✦</span>
          </div>
        </div>
      </motion.div>

      <motion.div
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -inset-4 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(255, 215, 0, 0.2) 0%, transparent 70%)',
          filter: 'blur(8px)',
        }}
      />
    </div>
  );
}
