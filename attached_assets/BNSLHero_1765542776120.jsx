import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Coins, Calendar, ArrowRight, Calculator } from 'lucide-react';

// Floating gold particles
function GoldParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(50)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: Math.random() * 4 + 1,
            height: Math.random() * 4 + 1,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            background: `radial-gradient(circle, rgba(247,216,120,${0.3 + Math.random() * 0.5}) 0%, rgba(212,175,55,0) 70%)`
          }}
          animate={{
            y: [0, -80 - Math.random() * 40],
            x: [0, (Math.random() - 0.5) * 30],
            opacity: [0, 0.8, 0],
            scale: [0.5, 1.2, 0.5]
          }}
          transition={{
            duration: 4 + Math.random() * 3,
            delay: Math.random() * 5,
            repeat: Infinity,
            ease: "easeOut"
          }}
        />
      ))}
    </div>
  );
}

// 3D Gold bars visualization
function FloatingGoldBars() {
  return (
    <div className="relative w-full h-full flex items-center justify-center" style={{ perspective: '1000px' }}>
      {/* Light rays behind vault */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(212,175,55,0.15) 0%, transparent 60%)'
        }}
        animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 4, repeat: Infinity }}
      />
      
      {/* Vault outline */}
      <motion.div
        className="absolute w-48 h-48 rounded-2xl border-2 border-[#D4AF37]/30"
        animate={{ 
          boxShadow: ['0 0 20px rgba(212,175,55,0.2)', '0 0 60px rgba(212,175,55,0.4)', '0 0 20px rgba(212,175,55,0.2)']
        }}
        transition={{ duration: 3, repeat: Infinity }}
      />

      {/* Gold bars stack */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{ 
            transformStyle: 'preserve-3d',
            zIndex: 3 - i
          }}
          animate={{
            y: [i * 15 - 20, i * 15 - 30, i * 15 - 20],
            rotateX: [10, 15, 10],
            rotateY: [-10 + i * 5, 10 + i * 5, -10 + i * 5]
          }}
          transition={{ duration: 5, delay: i * 0.3, repeat: Infinity, ease: "easeInOut" }}
        >
          <div 
            className="w-24 h-10 rounded-sm"
            style={{
              background: `linear-gradient(135deg, #F5E6A3 0%, #D4AF37 30%, #B8860B 70%, #D4AF37 100%)`,
              boxShadow: '0 4px 20px rgba(212,175,55,0.4), inset 0 1px 0 rgba(255,255,255,0.3)'
            }}
          />
        </motion.div>
      ))}

      {/* Sparkles */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-[#F7D878] rounded-full"
          style={{
            top: `${30 + Math.random() * 40}%`,
            left: `${30 + Math.random() * 40}%`
          }}
          animate={{
            scale: [0, 1.5, 0],
            opacity: [0, 1, 0]
          }}
          transition={{
            duration: 2,
            delay: i * 0.4,
            repeat: Infinity
          }}
        />
      ))}
    </div>
  );
}

export default function BNSLHero({ onOpenCalculator }) {
  const badges = [
    { icon: Shield, text: "Swiss-Regulated Framework" },
    { icon: Coins, text: "Physical Gold • No Tokens" },
    { icon: Calendar, text: "Quarterly Growth Credits" }
  ];

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-black">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-[#0A0A0A] to-black" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,_rgba(212,175,55,0.08)_0%,_transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_80%,_rgba(184,134,11,0.05)_0%,_transparent_40%)]" />
      
      <GoldParticles />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-32">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <div>
            {/* Badges */}
            <motion.div
              className="flex flex-wrap gap-3 mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              {badges.map((badge, i) => (
                <motion.div
                  key={i}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#D4AF37]/5 border border-[#D4AF37]/20 backdrop-blur-sm"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                >
                  <badge.icon className="w-4 h-4 text-[#D4AF37]" />
                  <span className="text-xs text-[#D4AF37] tracking-wide">{badge.text}</span>
                </motion.div>
              ))}
            </motion.div>

            {/* Headline */}
            <motion.h1
              className="text-5xl md:text-6xl lg:text-7xl font-extralight text-white mb-6 tracking-tight"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              <span className="bg-gradient-to-r from-[#D4AF37] via-[#F5E6A3] to-[#B8860B] bg-clip-text text-transparent">
                BNSL
              </span>
              <span className="block text-3xl md:text-4xl mt-2 font-light">
                Buy Now Sell Later Plan
              </span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              className="text-xl md:text-2xl text-gray-300 mb-4 font-light leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              A structured gold holding program with fixed pricing, quarterly growth credits, and in-kind settlement.
            </motion.p>

            {/* Supporting text */}
            <motion.p
              className="text-lg text-gray-400 mb-10 leading-relaxed max-w-xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              Lock your physical gold at a fixed price and receive quarterly increases to your gold worth. Your entire plan follows the Locked-In Price established on your start date.
            </motion.p>

            {/* CTAs */}
            <motion.div
              className="flex flex-col sm:flex-row gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <motion.button
                className="group px-8 py-4 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-black font-medium flex items-center justify-center gap-2"
                whileHover={{ scale: 1.03, boxShadow: '0 0 40px rgba(212,175,55,0.4)' }}
                whileTap={{ scale: 0.98 }}
              >
                Start BNSL Plan
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </motion.button>
              
              <motion.button
                onClick={onOpenCalculator}
                className="px-8 py-4 rounded-full border border-[#D4AF37]/40 text-[#D4AF37] font-medium flex items-center justify-center gap-2 hover:bg-[#D4AF37]/10 transition-colors"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
              >
                <Calculator className="w-4 h-4" />
                Open Projection Calculator
              </motion.button>
            </motion.div>
          </div>

          {/* Right Visual */}
          <motion.div
            className="hidden lg:block h-[500px]"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, delay: 0.4 }}
          >
            <FloatingGoldBars />
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="w-6 h-10 rounded-full border-2 border-[#D4AF37]/30 flex justify-center pt-2">
          <motion.div
            className="w-1.5 h-3 rounded-full bg-[#D4AF37]"
            animate={{ y: [0, 12, 0], opacity: [1, 0, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
      </motion.div>
    </section>
  );
}