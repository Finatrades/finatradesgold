import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Play, Shield, TrendingUp, Clock, ChevronDown, Sparkles, Coins } from 'lucide-react';
import { useLocation } from 'wouter';

const floatingElements = [
  { icon: '✨', delay: 0, duration: 3, x: 20, y: -30 },
  { icon: '💎', delay: 0.5, duration: 4, x: -40, y: 20 },
  { icon: '🪙', delay: 1, duration: 3.5, x: 60, y: -10 },
  { icon: '⭐', delay: 1.5, duration: 4.5, x: -20, y: 40 },
];

const stats = [
  { value: '99.99%', label: 'Pure Gold', icon: Shield },
  { value: '2.5%', label: 'Monthly Bonus', icon: TrendingUp },
  { value: '12', label: 'Month Plans', icon: Clock },
];

export default function BNSLHeroVault() {
  const [, setLocation] = useLocation();
  const [currentWord, setCurrentWord] = useState(0);
  const words = ['Secure', 'Smart', 'Simple'];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentWord((prev) => (prev + 1) % words.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative min-h-[90vh] overflow-hidden bg-gradient-to-br from-[#FAFBFF] via-[#F4F6FC] to-[#FFFFFF]">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Gradient Orbs */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute top-20 left-20 w-96 h-96 rounded-full bg-gradient-to-r from-amber-200/30 to-yellow-300/30 blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.4, 0.6, 0.4],
          }}
          transition={{ duration: 10, repeat: Infinity }}
          className="absolute bottom-20 right-20 w-[500px] h-[500px] rounded-full bg-gradient-to-r from-purple-200/30 to-pink-200/30 blur-3xl"
        />

        {/* Floating Gold Coins */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ y: 0, rotate: 0, opacity: 0.6 }}
            animate={{
              y: [-20, 20, -20],
              rotate: [0, 180, 360],
              opacity: [0.4, 0.8, 0.4],
            }}
            transition={{
              duration: 6 + i,
              repeat: Infinity,
              delay: i * 0.5,
              ease: 'easeInOut',
            }}
            className="absolute"
            style={{
              left: `${10 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
            }}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-300 to-yellow-500 shadow-lg shadow-amber-200/50 flex items-center justify-center">
              <Coins className="w-4 h-4 text-amber-800" />
            </div>
          </motion.div>
        ))}

        {/* Grid Pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #6366f1 1px, transparent 0)`,
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12 lg:py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[70vh]">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-8"
          >
            {/* Trust Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200/50 shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-800">
                Trusted by 50,000+ Gold Investors
              </span>
            </motion.div>

            {/* Main Heading */}
            <div className="space-y-4">
              <h1 className="text-5xl lg:text-7xl font-bold text-gray-900 leading-tight">
                <span className="block">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={currentWord}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="inline-block bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 bg-clip-text text-transparent"
                    >
                      {words[currentWord]}
                    </motion.span>
                  </AnimatePresence>
                </span>
                <span className="block mt-2">Gold Investment</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-lg leading-relaxed">
                Lock in today's gold price, collect monthly bonuses, and sell at your convenience. 
                Your path to financial security starts here.
              </p>
            </div>

            {/* Stats Row */}
            <div className="flex flex-wrap gap-6">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/80 backdrop-blur-sm border border-gray-100 shadow-sm"
                >
                  <div className="p-2 rounded-xl bg-gradient-to-br from-amber-100 to-yellow-100">
                    <stat.icon className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-xs text-gray-500">{stat.label}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4">
              <motion.button
                whileHover={{ scale: 1.02, boxShadow: '0 20px 40px rgba(245, 158, 11, 0.3)' }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setLocation('/register')}
                className="px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-white font-semibold text-lg shadow-lg shadow-amber-200/50 flex items-center gap-2 group"
                data-testid="button-start-investing"
              >
                Start Investing
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => scrollToSection('how-it-works')}
                className="px-8 py-4 rounded-2xl bg-white border-2 border-gray-200 text-gray-700 font-semibold text-lg flex items-center gap-2 hover:border-amber-300 transition-colors"
                data-testid="button-watch-demo"
              >
                <Play className="w-5 h-5 text-amber-600" />
                Watch Demo
              </motion.button>
            </div>
          </motion.div>

          {/* Right Content - 3D Gold Vault */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className="relative w-full aspect-square max-w-lg mx-auto">
              {/* Glowing Ring */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 rounded-full border-2 border-dashed border-amber-300/30"
              />

              {/* Main Vault Container */}
              <motion.div
                animate={{
                  y: [0, -15, 0],
                  rotateY: [0, 5, 0, -5, 0],
                }}
                transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-8 rounded-3xl bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 shadow-2xl overflow-hidden"
                style={{ perspective: '1000px' }}
              >
                {/* Vault Door */}
                <div className="absolute inset-4 rounded-2xl bg-gradient-to-br from-slate-600 to-slate-800 border-4 border-slate-500/50">
                  {/* Lock Mechanism */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <motion.div
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                      className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 shadow-lg shadow-amber-400/50 flex items-center justify-center"
                    >
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
                        <Shield className="w-8 h-8 text-amber-400" />
                      </div>
                    </motion.div>
                  </div>

                  {/* Gold Bars Preview */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1 }}
                    className="absolute bottom-4 left-4 right-4 flex justify-center gap-2"
                  >
                    {[...Array(3)].map((_, i) => (
                      <motion.div
                        key={i}
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                        className="w-12 h-8 rounded bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500 shadow-lg"
                      />
                    ))}
                  </motion.div>

                  {/* Decorative Elements */}
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-3 h-3 rounded-full bg-slate-400/30"
                      style={{
                        top: i < 4 ? '10%' : '90%',
                        left: `${15 + (i % 4) * 25}%`,
                      }}
                    />
                  ))}
                </div>

                {/* Vault Shine Effect */}
                <motion.div
                  animate={{
                    x: ['-100%', '200%'],
                  }}
                  transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12"
                />
              </motion.div>

              {/* Floating Gold Coins around vault */}
              {floatingElements.map((el, index) => (
                <motion.div
                  key={index}
                  animate={{
                    y: [0, el.y, 0],
                    x: [0, el.x / 2, 0],
                    rotate: [0, 360],
                  }}
                  transition={{
                    duration: el.duration,
                    repeat: Infinity,
                    delay: el.delay,
                    ease: 'easeInOut',
                  }}
                  className="absolute text-3xl"
                  style={{
                    top: `${30 + index * 15}%`,
                    left: index % 2 === 0 ? '5%' : '85%',
                  }}
                >
                  {el.icon}
                </motion.div>
              ))}

              {/* Glow Effect */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-t from-amber-400/20 via-transparent to-transparent blur-2xl" />
            </div>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
        >
          <motion.button
            onClick={() => scrollToSection('how-it-works')}
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="p-3 rounded-full bg-white/80 backdrop-blur-sm border border-gray-200 shadow-lg hover:shadow-xl transition-shadow"
            data-testid="button-scroll-down"
          >
            <ChevronDown className="w-6 h-6 text-gray-600" />
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
}
