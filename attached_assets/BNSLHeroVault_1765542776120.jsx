import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { Shield, Lock, TrendingUp, ArrowRight, ChevronDown } from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';

// Floating gold particles
function FloatingParticles() {
  const particles = [...Array(40)].map((_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 1 + Math.random() * 3,
    duration: 5 + Math.random() * 8,
    delay: Math.random() * 5
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: 'radial-gradient(circle, #F7D878 0%, #D4AF37 100%)'
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, 10, 0],
            opacity: [0, 0.6, 0],
            scale: [0.5, 1, 0.5]
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );
}

// Sparkle burst effect for locked state
function SparklesBurst({ active }) {
  if (!active) return null;
  
  return (
    <div className="absolute inset-0 pointer-events-none">
      {[...Array(12)].map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const distance = 80 + Math.random() * 40;
        return (
          <motion.div
            key={i}
            className="absolute left-1/2 top-1/2 w-2 h-2 rounded-full"
            style={{
              background: 'radial-gradient(circle, #FFD700 0%, #D4AF37 50%, transparent 100%)',
              boxShadow: '0 0 10px #FFD700'
            }}
            initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
            animate={{
              x: Math.cos(angle) * distance,
              y: Math.sin(angle) * distance,
              scale: [0, 1.5, 0],
              opacity: [0, 1, 0]
            }}
            transition={{
              duration: 1.2,
              delay: i * 0.05,
              ease: "easeOut"
            }}
          />
        );
      })}
    </div>
  );
}

// Animated Gold Vault Component
function AnimatedGoldVault() {
  const [stage, setStage] = useState(0);
  const [showSparkles, setShowSparkles] = useState(false);
  const stages = ['initial', 'entering', 'closing', 'locked'];
  const { t } = useLanguage();
  
  const stageLabels = [
    t('bnsl.vault.stage1'),
    t('bnsl.vault.stage2'),
    t('bnsl.vault.stage3'),
    t('bnsl.vault.stage4')
  ];

  // Auto-advance through stages
  useEffect(() => {
    const timings = [3000, 2500, 2000, 4000];
    const timer = setTimeout(() => {
      const nextStage = (stage + 1) % 4;
      if (nextStage === 3) {
        setShowSparkles(true);
        setTimeout(() => setShowSparkles(false), 1500);
      }
      setStage(nextStage);
    }, timings[stage]);
    return () => clearTimeout(timer);
  }, [stage]);

  const isInitial = stage === 0;
  const isEntering = stage === 1;
  const isClosing = stage === 2;
  const isLocked = stage === 3;

  return (
    <div className="relative w-full max-w-lg mx-auto">
      {/* Multi-layer ambient glow */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-[#8A2BE2]/20 to-[#FF2FBF]/10 rounded-full blur-[120px]"
        animate={{ 
          scale: isLocked ? [1, 1.2, 1] : [1, 1.05, 1],
          opacity: isLocked ? [0.4, 0.7, 0.4] : [0.2, 0.3, 0.2]
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute inset-10 bg-gradient-to-tr from-[#D4AF37]/30 to-transparent rounded-full blur-[80px]"
        animate={{ 
          scale: isEntering ? [1, 1.3, 1] : 1,
          opacity: isEntering ? [0.5, 0.8, 0.5] : 0.3
        }}
        transition={{ duration: 2, repeat: isEntering ? Infinity : 0 }}
      />

      {/* Sparkles burst on lock */}
      <SparklesBurst active={showSparkles} />

      {/* Orbiting particles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1.5 h-1.5 rounded-full"
          style={{
            background: i % 2 === 0 ? '#D4AF37' : '#8A2BE2',
            boxShadow: `0 0 8px ${i % 2 === 0 ? '#D4AF37' : '#8A2BE2'}`,
            left: '50%',
            top: '50%'
          }}
          animate={{
            x: [
              Math.cos((i / 6) * Math.PI * 2) * 160,
              Math.cos((i / 6 + 0.5) * Math.PI * 2) * 160,
              Math.cos((i / 6 + 1) * Math.PI * 2) * 160
            ],
            y: [
              Math.sin((i / 6) * Math.PI * 2) * 160,
              Math.sin((i / 6 + 0.5) * Math.PI * 2) * 160,
              Math.sin((i / 6 + 1) * Math.PI * 2) * 160
            ],
            opacity: [0.3, 0.8, 0.3],
            scale: [0.8, 1.2, 0.8]
          }}
          transition={{
            duration: 8 + i,
            repeat: Infinity,
            ease: "linear",
            delay: i * 0.5
          }}
        />
      ))}

      {/* Main vault container */}
      <div className="relative">
        {/* Vault platform/base with 3D effect */}
        <motion.div
          className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-80 h-8 rounded-[50%]"
          style={{
            background: 'linear-gradient(180deg, rgba(26,26,26,0.8) 0%, rgba(10,10,10,0.4) 100%)',
            boxShadow: '0 10px 40px rgba(0,0,0,0.5), inset 0 2px 10px rgba(212,175,55,0.1)'
          }}
          animate={{
            boxShadow: isLocked 
              ? ['0 10px 40px rgba(0,0,0,0.5), inset 0 2px 10px rgba(212,175,55,0.1)', '0 10px 60px rgba(212,175,55,0.3), inset 0 2px 10px rgba(212,175,55,0.3)', '0 10px 40px rgba(0,0,0,0.5), inset 0 2px 10px rgba(212,175,55,0.1)']
              : '0 10px 40px rgba(0,0,0,0.5), inset 0 2px 10px rgba(212,175,55,0.1)'
          }}
          transition={{ duration: 2, repeat: isLocked ? Infinity : 0 }}
        />

        {/* Vault body */}
        <motion.div
          className="relative w-72 h-80 mx-auto rounded-3xl overflow-hidden"
          style={{
            background: 'linear-gradient(145deg, #1A1A1A 0%, #0A0A0A 50%, #1A1A1A 100%)',
            boxShadow: '0 0 60px rgba(138,43,226,0.15), inset 0 2px 20px rgba(255,255,255,0.05)'
          }}
          animate={{
            boxShadow: isLocked 
              ? ['0 0 60px rgba(212,175,55,0.2), inset 0 2px 20px rgba(255,255,255,0.05)', '0 0 100px rgba(212,175,55,0.4), inset 0 2px 20px rgba(255,255,255,0.1)', '0 0 60px rgba(212,175,55,0.2), inset 0 2px 20px rgba(255,255,255,0.05)']
              : '0 0 60px rgba(138,43,226,0.15), inset 0 2px 20px rgba(255,255,255,0.05)'
          }}
          transition={{ duration: 2, repeat: isLocked ? Infinity : 0 }}
        >
          {/* Vault frame border with animated gradient */}
          <motion.div 
            className="absolute inset-0 rounded-3xl border-2"
            style={{
              borderImage: isLocked 
                ? 'linear-gradient(135deg, #D4AF37, #8A2BE2, #D4AF37) 1'
                : 'linear-gradient(135deg, rgba(212,175,55,0.3), rgba(138,43,226,0.3)) 1'
            }}
            animate={{
              opacity: isLocked ? [0.8, 1, 0.8] : 1
            }}
            transition={{ duration: 1.5, repeat: isLocked ? Infinity : 0 }}
          />
          
          {/* Interior glow - brightest when entering */}
          <motion.div
            className="absolute inset-4 rounded-2xl"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(247,216,120,0.4) 0%, rgba(138,43,226,0.15) 40%, transparent 70%)'
            }}
            animate={{
              opacity: isEntering ? [0.5, 1, 0.5] : isInitial ? 0.5 : isLocked ? [0.3, 0.5, 0.3] : 0.4,
              scale: isEntering ? [1, 1.05, 1] : 1
            }}
            transition={{ duration: isEntering ? 1.5 : 2, repeat: Infinity }}
          />

          {/* Energy field lines inside vault */}
          {isLocked && (
            <div className="absolute inset-6 overflow-hidden rounded-2xl">
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute h-px w-full"
                  style={{
                    top: `${20 + i * 15}%`,
                    background: 'linear-gradient(90deg, transparent 0%, rgba(212,175,55,0.5) 50%, transparent 100%)'
                  }}
                  animate={{
                    x: ['-100%', '100%'],
                    opacity: [0, 0.8, 0]
                  }}
                  transition={{
                    duration: 2,
                    delay: i * 0.3,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                />
              ))}
            </div>
          )}

          {/* Vault interior - gold bars storage */}
          <div className="absolute inset-8 flex items-center justify-center">
            {/* Stored gold bars (visible when locked) */}
            <AnimatePresence>
              {(isClosing || isLocked) && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="absolute w-20 h-10 rounded-sm"
                      style={{
                        background: 'linear-gradient(135deg, #F7D878 0%, #D4AF37 50%, #B8860B 100%)',
                        transform: `translateY(${(i - 1) * 14}px) translateX(${(i - 1) * 5}px)`,
                        boxShadow: '0 4px 15px rgba(212,175,55,0.4)'
                      }}
                      initial={{ opacity: 0, scale: 0.5, y: 30 }}
                      animate={{ 
                        opacity: 0.85 - i * 0.1, 
                        scale: 1, 
                        y: 0,
                        boxShadow: isLocked 
                          ? ['0 4px 15px rgba(212,175,55,0.4)', '0 4px 25px rgba(212,175,55,0.6)', '0 4px 15px rgba(212,175,55,0.4)']
                          : '0 4px 15px rgba(212,175,55,0.4)'
                      }}
                      transition={{ 
                        delay: i * 0.15,
                        boxShadow: { duration: 2, repeat: Infinity }
                      }}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Vault door */}
          <motion.div
            className="absolute inset-0 rounded-3xl origin-left"
            style={{
              background: 'linear-gradient(145deg, #2A2A2A 0%, #1A1A1A 50%, #0F0F0F 100%)',
              boxShadow: 'inset 0 0 30px rgba(0,0,0,0.5), 0 0 20px rgba(0,0,0,0.3)'
            }}
            animate={{
              rotateY: isInitial ? -35 : isEntering ? -25 : isClosing ? -12 : 0,
              x: isInitial ? 50 : isEntering ? 35 : isClosing ? 15 : 0,
              boxShadow: isLocked 
                ? 'inset 0 0 30px rgba(0,0,0,0.5), 0 0 30px rgba(212,175,55,0.2)'
                : 'inset 0 0 30px rgba(0,0,0,0.5), 0 0 20px rgba(0,0,0,0.3)'
            }}
            transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
          >
            {/* Door border */}
            <div className="absolute inset-0 rounded-3xl border-2 border-[#D4AF37]/20" />
            
            {/* Door metallic sheen */}
            <motion.div
              className="absolute inset-0 rounded-3xl"
              style={{
                background: 'linear-gradient(135deg, transparent 30%, rgba(255,255,255,0.05) 50%, transparent 70%)'
              }}
              animate={{
                opacity: [0.3, 0.6, 0.3]
              }}
              transition={{ duration: 3, repeat: Infinity }}
            />
            
            {/* Locking mechanism - circular rings */}
            <div className="absolute inset-0 flex items-center justify-center">
              {/* Outer ring with tick marks */}
              <motion.div
                className="absolute w-36 h-36 rounded-full border-4 border-[#D4AF37]/40"
                style={{
                  background: 'radial-gradient(circle, transparent 60%, rgba(212,175,55,0.05) 100%)'
                }}
                animate={{
                  rotate: isLocked ? 360 : isClosing ? 180 : 0,
                  borderColor: isLocked ? 'rgba(212,175,55,0.9)' : 'rgba(212,175,55,0.4)',
                  boxShadow: isLocked ? '0 0 30px rgba(212,175,55,0.3), inset 0 0 20px rgba(212,175,55,0.2)' : 'none'
                }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              >
                {/* Tick marks */}
                {[...Array(12)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-0.5 h-2 bg-[#D4AF37]/50 rounded-full"
                    style={{
                      top: '2px',
                      left: '50%',
                      transformOrigin: '50% 68px',
                      transform: `translateX(-50%) rotate(${i * 30}deg)`
                    }}
                  />
                ))}
              </motion.div>
              
              {/* Middle ring */}
              <motion.div
                className="absolute w-26 h-26 rounded-full border-[3px] border-[#B8860B]/50"
                style={{ width: 104, height: 104 }}
                animate={{
                  rotate: isLocked ? -270 : isClosing ? -90 : 0,
                  borderColor: isLocked ? 'rgba(184,134,11,1)' : 'rgba(184,134,11,0.5)',
                  boxShadow: isLocked ? '0 0 20px rgba(184,134,11,0.4)' : 'none'
                }}
                transition={{ duration: 1.2, delay: 0.2, ease: "easeOut" }}
              />
              
              {/* Inner circle with lock icon */}
              <motion.div
                className="absolute w-18 h-18 rounded-full flex items-center justify-center"
                style={{
                  width: 72,
                  height: 72,
                  background: isLocked 
                    ? 'linear-gradient(135deg, #F7D878 0%, #D4AF37 50%, #B8860B 100%)'
                    : 'linear-gradient(135deg, #333 0%, #1A1A1A 100%)'
                }}
                animate={{
                  scale: isLocked ? [1, 1.15, 1] : 1,
                  boxShadow: isLocked 
                    ? ['0 0 30px rgba(212,175,55,0.5)', '0 0 50px rgba(212,175,55,0.8)', '0 0 30px rgba(212,175,55,0.5)']
                    : '0 0 10px rgba(0,0,0,0.5)'
                }}
                transition={{ duration: 1.5, repeat: isLocked ? Infinity : 0 }}
              >
                <motion.div
                  animate={{
                    rotate: isLocked ? [0, 10, -10, 0] : 0
                  }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                >
                  <Lock 
                    className={`w-7 h-7 transition-colors duration-500 ${
                      isLocked ? 'text-black' : 'text-gray-500'
                    }`} 
                  />
                </motion.div>
              </motion.div>
            </div>

            {/* Locking bolts - enhanced with glow */}
            {[0, 1, 2, 3].map((i) => (
              <motion.div
                key={i}
                className="absolute w-3 h-10 rounded-full"
                style={{
                  background: 'linear-gradient(180deg, #F7D878 0%, #D4AF37 50%, #B8860B 100%)',
                  top: i < 2 ? '18%' : '62%',
                  right: i % 2 === 0 ? '6%' : 'auto',
                  left: i % 2 === 1 ? '6%' : 'auto'
                }}
                animate={{
                  x: isLocked 
                    ? (i % 2 === 0 ? -12 : 12) 
                    : 0,
                  opacity: isLocked ? 1 : 0.3,
                  boxShadow: isLocked 
                    ? '0 0 15px rgba(212,175,55,0.6)' 
                    : 'none'
                }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
              />
            ))}
          </motion.div>
        </motion.div>

        {/* Gold bar - animates into vault with trail effect */}
        <AnimatePresence>
          {(isInitial || isEntering) && (
            <motion.div
              className="absolute bottom-20 left-1/2 z-20"
              initial={{ x: '-50%', y: 0, opacity: 1 }}
              animate={{
                x: '-50%',
                y: isEntering ? -100 : 0,
                opacity: isEntering ? 0 : 1,
                scale: isEntering ? 0.7 : 1,
                rotateX: isEntering ? 15 : 0
              }}
              exit={{ opacity: 0, y: -120, scale: 0.5 }}
              transition={{ duration: 1.8, ease: [0.4, 0, 0.2, 1] }}
            >
              {/* Trail particles when entering */}
              {isEntering && [...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1.5 h-1.5 rounded-full bg-[#D4AF37]"
                  style={{
                    left: `${20 + Math.random() * 60}%`,
                    top: '100%'
                  }}
                  initial={{ opacity: 0, y: 0 }}
                  animate={{ opacity: [0, 1, 0], y: [0, 30 + i * 10] }}
                  transition={{ duration: 0.8, delay: i * 0.1 }}
                />
              ))}
              
              {/* Gold bar */}
              <motion.div
                className="relative w-32 h-16 rounded-lg overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, #F7D878 0%, #D4AF37 30%, #B8860B 70%, #8B6914 100%)',
                  boxShadow: '0 15px 50px rgba(212,175,55,0.6), 0 0 30px rgba(247,216,120,0.4)'
                }}
                animate={{
                  y: isEntering ? 0 : [0, -8, 0],
                  rotateZ: isEntering ? [0, 3, -3, 0] : [0, 1, -1, 0],
                  boxShadow: isEntering 
                    ? '0 5px 20px rgba(212,175,55,0.3)' 
                    : ['0 15px 50px rgba(212,175,55,0.5)', '0 20px 60px rgba(212,175,55,0.7)', '0 15px 50px rgba(212,175,55,0.5)']
                }}
                transition={{ 
                  y: { duration: 2.5, repeat: isEntering ? 0 : Infinity, ease: "easeInOut" },
                  rotateZ: { duration: isEntering ? 0.6 : 4, repeat: isEntering ? 0 : Infinity },
                  boxShadow: { duration: 2, repeat: Infinity }
                }}
              >
                {/* Shine effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent"
                  animate={{ x: ['-150%', '250%'] }}
                  transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1.5 }}
                />
                {/* Top face highlight */}
                <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/30 to-transparent rounded-t-lg" />
                {/* Inner border */}
                <div className="absolute inset-1.5 border border-[#F7D878]/60 rounded-md" />
                {/* Embossed pattern */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] text-black/30 font-bold tracking-widest">
                  FINE GOLD
                </div>
                {/* Serial */}
                <div className="absolute bottom-1.5 right-2.5 text-[8px] text-black/50 font-mono font-medium">
                  AU.999.9
                </div>
                {/* Weight */}
                <div className="absolute bottom-1.5 left-2.5 text-[8px] text-black/50 font-mono">
                  1 OZ
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* "Locked & Secured" badge */}
        <AnimatePresence>
          {isLocked && (
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              transition={{ duration: 0.5, ease: "backOut" }}
              className="absolute -bottom-6 left-1/2 -translate-x-1/2 z-30"
            >
              <motion.div
                className="px-6 py-3 rounded-full bg-gradient-to-r from-[#D4AF37] via-[#F7D878] to-[#D4AF37] shadow-[0_0_40px_rgba(212,175,55,0.6)]"
                animate={{
                  boxShadow: [
                    '0 0 30px rgba(212,175,55,0.5)',
                    '0 0 60px rgba(212,175,55,0.8)',
                    '0 0 30px rgba(212,175,55,0.5)'
                  ],
                  backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                }}
                transition={{ duration: 3, repeat: Infinity }}
                style={{ backgroundSize: '200% 100%' }}
              >
                <motion.div 
                  className="flex items-center gap-2"
                  animate={{ scale: [1, 1.02, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Shield className="w-5 h-5 text-black" />
                  <span className="text-sm font-semibold text-black whitespace-nowrap">
                    {t('bnsl.vault.locked')}
                  </span>
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Stage label */}
      <AnimatePresence mode="wait">
        <motion.div
          key={stage}
          initial={{ opacity: 0, y: 15, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -15, scale: 0.95 }}
          transition={{ duration: 0.4 }}
          className="absolute -top-14 left-1/2 -translate-x-1/2 z-20"
        >
          <motion.div 
            className="px-5 py-2.5 rounded-full bg-gradient-to-r from-[#1A1A1A]/95 to-[#2A2A2A]/95 border border-[#D4AF37]/40 backdrop-blur-md shadow-lg"
            animate={{
              borderColor: isLocked ? ['rgba(212,175,55,0.4)', 'rgba(212,175,55,0.8)', 'rgba(212,175,55,0.4)'] : 'rgba(212,175,55,0.4)'
            }}
            transition={{ duration: 2, repeat: isLocked ? Infinity : 0 }}
          >
            <span className="text-sm font-medium bg-gradient-to-r from-[#D4AF37] to-[#F7D878] bg-clip-text text-transparent">
              {stageLabels[stage]}
            </span>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Progress dots */}
      <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 flex gap-3">
        {[0, 1, 2, 3].map((i) => (
          <motion.button
            key={i}
            onClick={() => setStage(i)}
            className="relative w-3 h-3 rounded-full cursor-pointer"
            style={{
              background: i === stage 
                ? 'linear-gradient(135deg, #F7D878, #D4AF37)' 
                : i < stage 
                  ? '#D4AF37' 
                  : '#333'
            }}
            animate={{
              scale: i === stage ? 1.4 : 1,
              boxShadow: i === stage ? '0 0 15px rgba(212,175,55,0.6)' : 'none'
            }}
            whileHover={{ scale: 1.3 }}
            transition={{ duration: 0.3 }}
          >
            {i === stage && (
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-[#D4AF37]"
                animate={{ scale: [1, 1.8, 1], opacity: [1, 0, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

export default function BNSLHeroVault() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const { t } = useLanguage();

  const badges = [
    { icon: Shield, text: t('bnsl.badge1') },
    { icon: Lock, text: t('bnsl.badge2') },
    { icon: TrendingUp, text: t('bnsl.badge3') }
  ];

  return (
    <section ref={ref} className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-[#FAFBFF] via-[#F4F6FC] to-[#FFFFFF]">
      {/* Background gradients */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_30%,_rgba(212,175,55,0.08)_0%,_transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_70%,_rgba(184,134,11,0.05)_0%,_transparent_40%)]" />
      </div>

      <FloatingParticles />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-24 w-full">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <div className="text-center lg:text-left order-2 lg:order-1">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#8A2BE2]/30 bg-[#8A2BE2]/5 backdrop-blur-sm mb-6"
            >
              <span className="text-sm text-[#8A2BE2] tracking-wide">{t('bnsl.badge')}</span>
            </motion.div>

            {/* Main headline */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#0D0D0D] mb-6 leading-tight"
            >
              {t('bnsl.title')}{' '}
              <span className="bg-gradient-to-r from-[#8A2BE2] via-[#FF66D8] to-[#FF2FBF] bg-clip-text text-transparent">
                {t('bnsl.titleHighlight')}
              </span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-xl text-[#8A2BE2] mb-4"
            >
              {t('bnsl.subtitle')}
            </motion.p>

            {/* Supporting text */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-[#4A4A4A] mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed"
            >
              {t('bnsl.description')}
            </motion.p>

            {/* Badges */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-wrap gap-3 justify-center lg:justify-start mb-8"
            >
              {badges.map((badge, i) => (
                <motion.div
                  key={i}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#8A2BE2]/20 backdrop-blur-sm shadow-sm"
                  whileHover={{ borderColor: 'rgba(212,175,55,0.5)' }}
                >
                  <badge.icon className="w-3.5 h-3.5 text-[#8A2BE2]" />
                  <span className="text-xs text-[#4A4A4A]">{badge.text}</span>
                </motion.div>
              ))}
            </motion.div>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
            >
              <Link to={createPageUrl("Home")} onClick={() => window.scrollTo(0, 0)}>
                <motion.button
                  className="group w-full sm:w-auto px-8 py-4 rounded-full bg-gradient-to-r from-[#8A2BE2] to-[#FF2FBF] text-white font-medium hover:shadow-[0_0_40px_rgba(138,43,226,0.4)] transition-all flex items-center gap-2 justify-center"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {t('bnsl.startPlan')}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </motion.button>
              </Link>
              <motion.button
                className="w-full sm:w-auto px-8 py-4 rounded-full border border-[#8A2BE2]/40 text-[#8A2BE2] hover:bg-[#8A2BE2]/10 transition-all flex items-center gap-2 justify-center"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                {t('bnsl.viewHow')}
                <ChevronDown className="w-4 h-4" />
              </motion.button>
            </motion.div>
          </div>

          {/* Right Visual - Animated Vault */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="order-1 lg:order-2 flex items-center justify-center py-12 lg:py-0"
          >
            <AnimatedGoldVault />
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 8, 0], opacity: [0.3, 0.8, 0.3] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="w-6 h-10 rounded-full border border-[#D4AF37]/30 flex items-start justify-center p-2">
          <motion.div
            className="w-1 h-2 rounded-full bg-[#D4AF37]"
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </div>
      </motion.div>
    </section>
  );
}