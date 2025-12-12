import React, { useRef, useState } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { Vault, CheckCircle, Download, ArrowRight, Sparkles } from 'lucide-react';

function VaultDoorAnimation({ isComplete }) {
  return (
    <div className="relative w-48 h-48 mx-auto">
      {/* Vault frame */}
      <div className="absolute inset-0 rounded-2xl border-4 border-[#D4AF37]/40 bg-[#0A0A0A]" />
      
      {/* Vault door */}
      <motion.div
        className="absolute inset-2 rounded-xl bg-gradient-to-br from-[#1A1A1A] to-[#0F0F0F] border-2 border-[#D4AF37]/30 origin-left overflow-hidden"
        animate={isComplete ? { rotateY: -90, opacity: 0.5 } : { rotateY: 0 }}
        transition={{ duration: 2, ease: "easeInOut" }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Door handle */}
        <div className="absolute top-1/2 right-4 -translate-y-1/2 w-8 h-8 rounded-full border-2 border-[#D4AF37] flex items-center justify-center">
          <div className="w-4 h-1 bg-[#D4AF37] rounded-full" />
        </div>
        
        {/* Door dial */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border-2 border-[#D4AF37]/50"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </motion.div>

      {/* Light beams from inside */}
      <AnimatePresence>
        {isComplete && (
          <>
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute top-1/2 left-1/2 w-1 h-32 bg-gradient-to-t from-[#D4AF37] to-transparent origin-bottom"
                style={{ rotate: i * 45 }}
                initial={{ scaleY: 0, opacity: 0 }}
                animate={{ scaleY: 1, opacity: [0, 0.8, 0] }}
                transition={{ duration: 2, delay: 1 + i * 0.1 }}
              />
            ))}
            
            {/* Golden glow */}
            <motion.div
              className="absolute inset-0 rounded-2xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ 
                background: 'radial-gradient(circle at center, rgba(212,175,55,0.4) 0%, transparent 70%)',
                boxShadow: '0 0 100px rgba(212,175,55,0.5)'
              }}
            />
          </>
        )}
      </AnimatePresence>

      {/* Gold inside */}
      <AnimatePresence>
        {isComplete && (
          <motion.div
            className="absolute inset-4 flex items-center justify-center"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 2 }}
          >
            <div className="w-20 h-10 rounded bg-gradient-to-br from-[#F5E6A3] via-[#D4AF37] to-[#B8860B] shadow-lg" 
              style={{ boxShadow: '0 0 30px rgba(212,175,55,0.6)' }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TimelineProgress({ isComplete }) {
  return (
    <div className="relative h-2 bg-[#1A1A1A] rounded-full overflow-hidden mb-8">
      <motion.div
        className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#D4AF37] to-[#F7D878]"
        initial={{ width: 0 }}
        animate={isComplete ? { width: '100%' } : {}}
        transition={{ duration: 3, ease: "easeOut" }}
        style={{ boxShadow: '0 0 20px rgba(212,175,55,0.6)' }}
      />
    </div>
  );
}

function ValueCounter({ value, isComplete }) {
  const [displayValue, setDisplayValue] = React.useState(0);

  React.useEffect(() => {
    if (isComplete) {
      const duration = 2000;
      const steps = 60;
      const stepDuration = duration / steps;
      const increment = value / steps;
      let currentStep = 0;

      const timer = setInterval(() => {
        currentStep++;
        if (currentStep >= steps) {
          setDisplayValue(value);
          clearInterval(timer);
        } else {
          setDisplayValue(prev => prev + increment);
        }
      }, stepDuration);

      return () => clearInterval(timer);
    }
  }, [isComplete, value]);

  return (
    <motion.div
      className="text-4xl md:text-5xl font-light text-[#D4AF37]"
      initial={{ opacity: 0 }}
      animate={isComplete ? { opacity: 1 } : {}}
      transition={{ delay: 2.5 }}
      style={{ textShadow: '0 0 30px rgba(212,175,55,0.5)' }}
    >
      ${displayValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </motion.div>
  );
}

export default function BNSLMaturityAnimation() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [isComplete, setIsComplete] = useState(false);

  React.useEffect(() => {
    if (isInView) {
      const timer = setTimeout(() => setIsComplete(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [isInView]);

  return (
    <section ref={ref} className="relative py-32 bg-gradient-to-b from-[#050505] to-black overflow-hidden">
      {/* Background sparkles */}
      <AnimatePresence>
        {isComplete && [...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`
            }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ 
              opacity: [0, 1, 0],
              scale: [0, 1, 0]
            }}
            transition={{ duration: 2, delay: 3 + Math.random() * 2 }}
          >
            <Sparkles className="w-4 h-4 text-[#D4AF37]" />
          </motion.div>
        ))}
      </AnimatePresence>

      <div className="relative z-10 max-w-4xl mx-auto px-6">
        {/* Header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
        >
          <p className="text-[#D4AF37] text-sm tracking-[0.3em] uppercase mb-4">Plan Completion</p>
          <h2 className="text-4xl md:text-5xl font-extralight text-white mb-4">
            Maturity <span className="text-[#D4AF37]">Settlement</span>
          </h2>
        </motion.div>

        {/* Timeline */}
        <TimelineProgress isComplete={isComplete} />

        {/* Vault Animation */}
        <div className="mb-12">
          <VaultDoorAnimation isComplete={isComplete} />
        </div>

        {/* Value Display */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0 }}
          animate={isComplete ? { opacity: 1 } : {}}
          transition={{ delay: 2 }}
        >
          <p className="text-gray-400 mb-2">Principal Gold Worth Returned</p>
          <ValueCounter value={12500.00} isComplete={isComplete} />
          <p className="text-sm text-gray-500 mt-2">at Locked-In Price</p>
        </motion.div>

        {/* Checkmark */}
        <AnimatePresence>
          {isComplete && (
            <motion.div
              className="flex justify-center mb-8"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 3.5, type: "spring", stiffness: 200 }}
            >
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#B8860B] flex items-center justify-center"
                style={{ boxShadow: '0 0 40px rgba(212,175,55,0.5)' }}
              >
                <CheckCircle className="w-10 h-10 text-black" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Confirmation Card */}
        <AnimatePresence>
          {isComplete && (
            <motion.div
              className="bg-[#0A0A0A]/80 backdrop-blur-sm rounded-3xl border border-[#D4AF37]/30 p-8 text-center"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 4, duration: 0.6 }}
              style={{ boxShadow: '0 0 60px rgba(212,175,55,0.1)' }}
            >
              <h3 className="text-xl font-light text-white mb-4">
                Your BNSL plan has matured
              </h3>
              <p className="text-gray-400 mb-8">
                Your gold worth will be credited within 3 business days.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <motion.button
                  className="px-6 py-3 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-black font-medium flex items-center gap-2"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                >
                  View Settlement Details
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
                
                <motion.button
                  className="px-6 py-3 rounded-full border border-[#D4AF37]/40 text-[#D4AF37] font-medium flex items-center gap-2 hover:bg-[#D4AF37]/10 transition-colors"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Download className="w-4 h-4" />
                  Download Statement
                </motion.button>
                
                <motion.button
                  className="px-6 py-3 rounded-full border border-[#D4AF37]/40 text-[#D4AF37] font-medium flex items-center gap-2 hover:bg-[#D4AF37]/10 transition-colors"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Join Another Plan
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}