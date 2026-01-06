import { motion, useInView, AnimatePresence } from 'framer-motion';
import { useRef, useState, useEffect, useMemo } from 'react';
import { 
  Coins, Lock, Clock, Calendar, Shield, Vault, ArrowRight, 
  ChevronDown, ChevronUp, AlertTriangle, FileText, ExternalLink,
  Sparkles, Award, BarChart3, HelpCircle, X
} from 'lucide-react';
import { Link } from 'wouter';
import finatradesLogo from '@/assets/finatrades-logo.png';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { ModeProvider } from './context/ModeContext';
import FloatingAgentChat from '@/components/FloatingAgentChat';

const PURPLE_COLOR = '#8A2BE2';

function FloatingParticles({ count = 30 }: { count?: number }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full"
          style={{ backgroundColor: `${PURPLE_COLOR}40` }}
          initial={{
            x: `${Math.random() * 100}%`,
            y: `${Math.random() * 100}%`,
            scale: Math.random() * 0.5 + 0.5,
          }}
          animate={{
            y: [null, '-30%', '130%'],
            opacity: [0, 0.8, 0],
          }}
          transition={{
            duration: Math.random() * 15 + 10,
            repeat: Infinity,
            delay: Math.random() * 8,
            ease: 'linear',
          }}
        />
      ))}
    </div>
  );
}

function AnimatedVaultSequence() {
  const [phase, setPhase] = useState<'opening' | 'depositing' | 'locking' | 'locked'>('opening');
  const [cycleCount, setCycleCount] = useState(0);

  useEffect(() => {
    const sequence = [
      { phase: 'opening' as const, duration: 1500 },
      { phase: 'depositing' as const, duration: 2000 },
      { phase: 'locking' as const, duration: 1500 },
      { phase: 'locked' as const, duration: 2000 },
    ];

    let timeoutId: NodeJS.Timeout;
    let currentIndex = 0;

    const runSequence = () => {
      setPhase(sequence[currentIndex].phase);
      timeoutId = setTimeout(() => {
        currentIndex = (currentIndex + 1) % sequence.length;
        if (currentIndex === 0) {
          setCycleCount(prev => prev + 1);
        }
        runSequence();
      }, sequence[currentIndex].duration);
    };

    runSequence();
    return () => clearTimeout(timeoutId);
  }, []);

  const phaseLabels = {
    opening: 'Opening vault...',
    depositing: 'Depositing gold...',
    locking: 'Securing vault...',
    locked: 'Gold Worth Locked & Secured',
  };

  const phaseIndex = ['opening', 'depositing', 'locking', 'locked'].indexOf(phase);

  return (
    <div className="relative">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="absolute -top-8 right-0 px-4 py-2 rounded-xl bg-gray-900 text-white text-sm shadow-lg z-10"
      >
        <div className="flex items-center gap-2">
          <span>Principal gold worth locked</span>
        </div>
        <span className="text-gray-400 text-xs">until maturity</span>
        <div className="absolute -bottom-2 right-8 w-4 h-4 bg-gray-900 rotate-45" />
      </motion.div>

      <div className="relative w-72 h-80">
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 4, repeat: Infinity }}
          className="relative w-full h-full"
        >
          {/* Vault Back (inside) */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 shadow-2xl overflow-hidden">
            <div className="absolute inset-4 rounded-xl bg-gradient-to-b from-gray-700 to-gray-800 border border-gray-600/30">
              {/* Gold bars inside vault */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
                {[0, 1, 2].map((row) => (
                  <motion.div
                    key={row}
                    initial={{ opacity: 0, scale: 0.8, y: -30 }}
                    animate={{
                      opacity: phase === 'depositing' || phase === 'locking' || phase === 'locked' 
                        ? (row <= (phase === 'depositing' ? Math.min(cycleCount % 3, row) : 2) ? 1 : 0)
                        : 0,
                      scale: phase !== 'opening' ? 1 : 0.8,
                      y: phase !== 'opening' ? 0 : -30,
                    }}
                    transition={{ 
                      duration: 0.5, 
                      delay: phase === 'depositing' ? row * 0.4 : 0 
                    }}
                    className="flex gap-1"
                  >
                    {[0, 1, 2].map((col) => (
                      <div
                        key={col}
                        className="w-8 h-4 rounded-sm bg-gradient-to-b from-amber-400 via-yellow-500 to-amber-600 shadow-md"
                        style={{
                          boxShadow: '0 2px 4px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.3)'
                        }}
                      />
                    ))}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Vault Door */}
          <motion.div
            animate={{
              rotateY: phase === 'opening' ? -70 : phase === 'depositing' ? -70 : 0,
              x: phase === 'opening' || phase === 'depositing' ? -20 : 0,
            }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
            style={{ transformOrigin: 'left center', transformStyle: 'preserve-3d' }}
            className="absolute inset-0 rounded-2xl bg-gradient-to-br from-gray-800 via-gray-900 to-black shadow-2xl"
          >
            {/* Door hinges */}
            <div className="absolute -left-2 top-1/4 flex flex-col gap-8">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-4 h-8 rounded bg-gradient-to-b from-gray-600 to-gray-700 shadow-md"
                />
              ))}
            </div>

            {/* Handle bars on right side */}
            <div className="absolute -right-2 top-1/4 flex flex-col gap-2">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{
                    x: phase === 'locking' || phase === 'locked' ? 0 : 4,
                  }}
                  transition={{ duration: 0.3, delay: i * 0.1 }}
                  className="w-5 h-8 rounded bg-gradient-to-b from-amber-400 to-amber-600 shadow-lg border border-amber-300/50"
                />
              ))}
            </div>

            {/* Vault door lines */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 w-3/4 h-1 bg-gray-700 rounded" />
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-3/4 h-1 bg-gray-700 rounded" />

            {/* Lock mechanism */}
            <div className="flex flex-col items-center justify-center h-full">
              <motion.div
                animate={{
                  scale: phase === 'locked' ? [1, 1.1, 1] : 1,
                  rotate: phase === 'locking' ? [0, -10, 0] : 0,
                }}
                transition={{
                  scale: { duration: 0.5, repeat: phase === 'locked' ? Infinity : 0, repeatDelay: 2 },
                  rotate: { duration: 0.5 },
                }}
                className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-xl border-4 border-amber-400"
              >
                <AnimatePresence mode="wait">
                  {(phase === 'locked' || phase === 'locking') ? (
                    <motion.div
                      key="locked"
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0, rotate: 180 }}
                      transition={{ duration: 0.4 }}
                    >
                      <Lock className="w-12 h-12 text-amber-900" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="unlocked"
                      initial={{ scale: 0, rotate: 180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0, rotate: -180 }}
                      transition={{ duration: 0.4 }}
                    >
                      <Vault className="w-12 h-12 text-amber-900" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>

            {/* Glow effect when locked */}
            <motion.div
              animate={{
                opacity: phase === 'locked' ? [0.3, 0.6, 0.3] : 0,
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-400/20 to-transparent pointer-events-none"
            />
          </motion.div>

          {/* Floating gold bar during deposit */}
          <AnimatePresence>
            {phase === 'depositing' && (
              <motion.div
                key="floating-gold"
                initial={{ opacity: 0, y: -100, x: 50, rotate: -15 }}
                animate={{ opacity: 1, y: 20, x: 0, rotate: 0 }}
                exit={{ opacity: 0, y: 80, scale: 0.5 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="absolute top-0 left-1/2 -translate-x-1/2 z-20"
              >
                <div className="w-16 h-8 rounded bg-gradient-to-b from-amber-300 via-yellow-400 to-amber-500 shadow-xl border-2 border-amber-200/50"
                  style={{
                    boxShadow: '0 4px 20px rgba(251, 191, 36, 0.5), 0 2px 8px rgba(0,0,0,0.3)'
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Bottom badge with phase indicator */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="absolute -bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-100 to-amber-200 border border-amber-300 shadow-lg"
      >
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ rotate: phase === 'locking' ? 360 : 0 }}
            transition={{ duration: 0.5 }}
          >
            <Lock className="w-4 h-4 text-amber-600" />
          </motion.div>
          <motion.span
            key={phase}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-amber-800 text-sm font-medium"
          >
            {phaseLabels[phase]}
          </motion.span>
        </div>
      </motion.div>

      {/* Phase indicator dots */}
      <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 flex gap-2">
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            animate={{
              scale: phaseIndex === i ? 1.2 : 1,
              backgroundColor: phaseIndex === i ? '#f59e0b' : '#d1d5db',
            }}
            className="w-2 h-2 rounded-full"
          />
        ))}
      </div>
    </div>
  );
}

function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center py-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#FAFBFF] via-white to-[#F8F9FC]" />
      <FloatingParticles count={30} />
      
      <div className="absolute top-1/4 left-0 w-[500px] h-[500px] rounded-full bg-purple-100/40 blur-[150px]" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-pink-100/30 blur-[120px]" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 w-full">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 border border-purple-200/50"
            >
              <div className="w-5 h-5 rounded-full bg-gradient-to-r from-purple-600 to-pink-500 flex items-center justify-center">
                <Coins className="w-3 h-3 text-white" />
              </div>
              <span className="text-sm font-medium text-purple-700">Buy 'N' SeLL Gold Plans</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight"
            >
              BNSL –{' '}
              <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
                Buy Now
              </span>
              <br />
              <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
                Sell Later
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-lg text-gray-700 font-medium"
            >
              Lock the worth of your physical gold into a structured plan 
              with fixed pricing and secure buy back margin.
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-gray-600 leading-relaxed max-w-lg"
            >
              Finatrades BNSL lets you place the worth of your gold into a defined term, 
              receive quarterly growth, and keep your principal safely stored in regulated 
              vaults until maturity.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-wrap gap-3"
            >
              {[
                { icon: Shield, label: 'Swiss-Regulated Framework' },
                { icon: Lock, label: 'Physical Gold • Vault Custody' },
                { icon: Sparkles, label: 'Fixed Price • Quarterly Growth' },
              ].map((badge, i) => (
                <span
                  key={badge.label}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm bg-white border border-gray-200 text-gray-600"
                >
                  <badge.icon className="w-4 h-4 text-purple-500" />
                  {badge.label}
                </span>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex flex-wrap gap-4 pt-4"
            >
              <Link href="/get-started" className="group flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white px-8 py-4 rounded-full text-base font-semibold hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-purple-500/30">
                Start BNSL Plan
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a
                href="#how-it-works"
                className="flex items-center gap-2 border border-purple-300 text-purple-700 px-6 py-4 rounded-full text-base font-semibold hover:bg-purple-50 hover:border-purple-400 transition-all"
              >
                View How It Works
                <ChevronDown className="w-5 h-5" />
              </a>
            </motion.div>
          </motion.div>

          {/* Animated Vault Visual */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="hidden lg:flex justify-center"
          >
            <AnimatedVaultSequence />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const [activeStep, setActiveStep] = useState(-1);

  const steps = [
    { icon: Coins, number: '01', title: 'Purchase Gold', description: 'You purchase physical gold which becomes your principal.' },
    { icon: Lock, number: '02', title: 'Locked-In Price Established', description: 'Your gold price becomes fixed for the entire plan duration.' },
    { icon: Clock, number: '03', title: 'Select Tenure', description: 'Choose from 12, 24, or 36 months.' },
    { icon: Calendar, number: '04', title: 'Quarterly Payouts', description: 'Receive projected payouts in gold units every 3 months.' },
    { icon: Shield, number: '05', title: 'Hold Till Maturity', description: 'Your principal stays locked and protected until the maturity date.' },
    { icon: Vault, number: '06', title: 'In-Kind Settlement', description: 'Your principal gold units are returned to your Fina wallet.' },
  ];

  useEffect(() => {
    if (isInView && activeStep < steps.length - 1) {
      const timer = setTimeout(() => {
        setActiveStep(prev => prev + 1);
      }, activeStep === -1 ? 500 : 600);
      return () => clearTimeout(timer);
    }
  }, [isInView, activeStep, steps.length]);

  return (
    <section className="relative py-32 bg-gradient-to-b from-[#F8F9FC] via-white to-[#FAFBFF] overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-72 h-72 rounded-full bg-purple-100/30 blur-3xl" />
        <div className="absolute bottom-20 left-10 w-96 h-96 rounded-full bg-pink-100/20 blur-3xl" />
      </div>
      
      <div ref={ref} className="relative max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <motion.div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 border border-purple-200/50 mb-6">
            <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
            <span className="text-purple-700 text-sm font-medium">Step-by-Step Guide</span>
          </motion.div>
          
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            How{' '}
            <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">BNSL</span>{' '}
            Works
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Follow the golden path to structured gold ownership
          </p>
        </motion.div>

        <div className="relative">
          {/* Desktop: Center timeline */}
          <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2">
            <motion.div
              initial={{ scaleY: 0 }}
              animate={{ scaleY: isInView ? 1 : 0 }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
              className="w-full h-full bg-gradient-to-b from-purple-500 via-purple-400/50 to-purple-300/20 origin-top"
            />
            
            {steps.map((_, index) => (
              <motion.div
                key={index}
                initial={{ scale: 0 }}
                animate={{ scale: activeStep >= index ? 1 : 0 }}
                transition={{ duration: 0.4 }}
                className="absolute left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg shadow-purple-200"
                style={{ top: `${(index / (steps.length - 1)) * 100}%` }}
              >
                <motion.div
                  animate={{ scale: activeStep === index ? [1, 1.5, 1] : 1 }}
                  transition={{ duration: 1, repeat: activeStep === index ? Infinity : 0 }}
                  className="absolute inset-0 rounded-full bg-purple-400/30"
                />
              </motion.div>
            ))}
          </div>

          {/* Mobile: Left timeline */}
          <div className="lg:hidden absolute left-6 top-0 bottom-0 w-px">
            <motion.div
              initial={{ scaleY: 0 }}
              animate={{ scaleY: isInView ? 1 : 0 }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
              className="w-full h-full bg-gradient-to-b from-purple-500 via-purple-400/50 to-purple-300/20 origin-top"
            />
          </div>

          <div className="space-y-8 lg:space-y-12">
            {steps.map((step, index) => {
              const isLeft = index % 2 === 0;
              const isActive = activeStep === index;
              const isCompleted = activeStep > index;

              return (
                <div
                  key={step.number}
                  className={`flex justify-start pl-14 lg:pl-0 ${isLeft ? 'lg:justify-start lg:pr-[52%]' : 'lg:justify-end lg:pl-[52%]'}`}
                >
                  <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ 
                      opacity: isActive || isCompleted ? 1 : 0.3,
                      x: 0,
                    }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    className={`relative flex items-start lg:items-center gap-4 lg:gap-6 flex-row ${isLeft ? '' : 'lg:flex-row-reverse'}`}
                  >
                    {/* Mobile: Left-aligned dot indicator */}
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: activeStep >= index ? 1 : 0 }}
                      transition={{ duration: 0.4 }}
                      className="lg:hidden absolute -left-[38px] top-2 w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg shadow-purple-200"
                    />
                    
                    <motion.div
                      animate={{
                        scale: isActive ? [1, 1.1, 1] : 1,
                        boxShadow: isActive 
                          ? ['0 0 0 0 rgba(138, 43, 226, 0)', '0 0 30px 10px rgba(138, 43, 226, 0.2)', '0 0 20px 5px rgba(138, 43, 226, 0.1)']
                          : '0 0 0 0 rgba(138, 43, 226, 0)',
                      }}
                      transition={{ duration: 0.8, repeat: isActive ? Infinity : 0, repeatDelay: 2 }}
                      className={`relative z-10 w-12 h-12 lg:w-16 lg:h-16 rounded-full flex items-center justify-center shrink-0 transition-all duration-500 ${
                        isActive || isCompleted
                          ? 'bg-gradient-to-br from-purple-100 to-pink-100 border-2 border-purple-400'
                          : 'bg-gray-100 border border-gray-200'
                      }`}
                    >
                      <step.icon className={`w-5 h-5 lg:w-7 lg:h-7 transition-colors duration-500 ${
                        isActive || isCompleted ? 'text-purple-600' : 'text-gray-400'
                      }`} />
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ 
                        opacity: isActive || isCompleted ? 1 : 0.5,
                        y: 0,
                      }}
                      transition={{ duration: 0.5, delay: index * 0.1 + 0.2 }}
                      className={`flex-1 p-4 lg:p-5 rounded-xl backdrop-blur-sm transition-all duration-500 ${
                        isActive
                          ? 'bg-white border-2 border-purple-300 shadow-lg shadow-purple-100'
                          : 'bg-white border border-gray-100 shadow-sm'
                      }`}
                    >
                      <span className={`text-xs lg:text-sm font-bold ${isActive ? 'text-purple-600' : 'text-gray-400'}`}>
                        Step {step.number}
                      </span>
                      <h3 className={`text-base lg:text-lg font-semibold mt-1 ${isActive || isCompleted ? 'text-gray-900' : 'text-gray-500'}`}>
                        {step.title}
                      </h3>
                      <p className={`text-xs lg:text-sm mt-2 ${isActive ? 'text-gray-600' : 'text-gray-400'}`}>
                        {step.description}
                      </p>
                    </motion.div>
                  </motion.div>
                </div>
              );
            })}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: activeStep >= steps.length - 1 ? 1 : 0, y: activeStep >= steps.length - 1 ? 0 : 30 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center mt-16"
        >
          <a
            href="#calculator"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white px-8 py-4 rounded-full text-base font-semibold hover:from-purple-700 hover:to-pink-600 transition-all shadow-lg shadow-purple-200"
          >
            Estimate Your Returns
            <ArrowRight className="w-5 h-5" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}

function CalculatorSection() {
  const [planValue, setPlanValue] = useState(10000);
  const [tenure, setTenure] = useState<12 | 24 | 36>(24);
  const goldPrice = 144.05;
  
  const rates = { 12: 10, 24: 11, 36: 12 };
  const rate = rates[tenure];

  const calculations = useMemo(() => {
    const totalYears = tenure / 12;
    const annualRate = rate / 100;
    const totalGoldAddition = planValue * annualRate * totalYears;
    const totalValueAtMaturity = planValue + totalGoldAddition;
    const guaranteedMargin = totalGoldAddition;
    const quarterlyMargin = totalGoldAddition / (tenure / 3);

    return { 
      planValue, 
      guaranteedMargin, 
      totalValueAtMaturity, 
      quarterlyMargin,
      annualRate: rate,
    };
  }, [planValue, tenure, rate]);

  const handleValueChange = (value: number) => {
    setPlanValue(Math.min(Math.max(value, 0), 500000));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  return (
    <section id="calculator" className="relative py-32 bg-gradient-to-b from-[#FAFBFF] via-white to-[#F8F9FC] overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-purple-100/30 blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-pink-100/20 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #8A2BE2 1px, transparent 0)`,
            backgroundSize: '40px 40px',
          }}
        />
      </div>
      
      <div className="relative max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 border border-purple-200/50 mb-6"
          >
            <Lock className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-semibold text-purple-800">BNSL Gold Buy Back Planner</span>
          </motion.div>

          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            BNSL Gold Buy Back{' '}
            <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
              Planner
            </span>
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Plan your gold buy back and projected margins over time.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-white rounded-3xl border border-gray-100 p-8 shadow-xl"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-100 to-pink-100">
                <Sparkles className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">BNSL Gold Buy Back Planner</h3>
                <p className="text-sm text-gray-500">Plan your gold buy back and projected margins over time.</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">BNSL Plan Value</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-semibold text-gray-400">
                    $
                  </span>
                  <input
                    type="number"
                    value={planValue}
                    onChange={(e) => handleValueChange(Number(e.target.value))}
                    className="w-full pl-10 pr-4 py-4 text-2xl font-bold text-gray-900 bg-gray-50 rounded-xl border border-gray-200 focus:border-purple-400 focus:ring-4 focus:ring-purple-100 outline-none transition-all"
                    data-testid="input-plan-value"
                  />
                </div>
                <input
                  type="range"
                  min="0"
                  max="500000"
                  step="500"
                  value={planValue}
                  onChange={(e) => handleValueChange(Number(e.target.value))}
                  className="w-full h-2 mt-4 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  data-testid="slider-plan-value"
                />
                <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-500">
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Total value of physical gold you buy and store in our vault.</span>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Locked-In Gold Price (per gram)</span>
                  <span className="text-xs font-medium text-purple-600 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                    Live Price
                  </span>
                </div>
                <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div className="p-2 rounded-lg bg-gray-200/70">
                    <Lock className="w-4 h-4 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <span className="text-2xl font-bold text-gray-900">{goldPrice.toFixed(2)}</span>
                    <span className="text-gray-500 ml-1">/gram</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-500">
                  <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                  <span className="text-yellow-600">Live market price — locked at plan start</span>
                </div>
              </div>

              <div className="pt-2">
                <label className="block text-sm font-medium text-gray-700 mb-3">Plan Tenure</label>
                <div className="grid grid-cols-3 gap-3">
                  {([12, 24, 36] as const).map((t) => (
                    <motion.button
                      key={t}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setTenure(t)}
                      className={`py-3 px-4 rounded-xl text-sm font-semibold transition-all ${
                        tenure === t
                          ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-lg shadow-purple-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                      }`}
                      data-testid={`btn-tenure-${t}`}
                    >
                      {t} Months
                    </motion.button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <label className="block text-sm font-medium text-gray-700 mb-3">Estimated Gold Addition Rate</label>
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-5 border border-purple-100">
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-black bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
                      {calculations.annualRate}%
                    </span>
                    <span className="text-gray-600 font-medium">per annum</span>
                  </div>
                  <p className="text-sm text-purple-700 mt-1">
                    Fixed rate for {tenure}-month plan
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-5"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-green-100 to-emerald-100">
                <BarChart3 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Gold Buy Back Projection</h3>
                <p className="text-sm text-gray-500">Based on your selected parameters</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:gap-4">
              <div className="bg-white rounded-2xl p-4 lg:p-5 border border-gray-100 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] lg:text-xs font-semibold text-gray-500 uppercase tracking-wide">BNSL Plan Value</span>
                  <div className="p-1 lg:p-1.5 rounded-lg bg-purple-100">
                    <Lock className="w-3 h-3 lg:w-3.5 lg:h-3.5 text-purple-600" />
                  </div>
                </div>
                <p className="text-lg sm:text-xl lg:text-3xl font-black text-gray-900 truncate">{formatCurrency(calculations.planValue)}</p>
                <p className="text-[10px] lg:text-xs text-gray-500 mt-1">Value of your BNSL plan</p>
              </div>

              <div className="bg-white rounded-2xl p-4 lg:p-5 border border-gray-100 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] lg:text-xs font-semibold text-gray-500 uppercase tracking-wide">Guaranteed Buy Back Margin *</span>
                  <Sparkles className="w-3 h-3 lg:w-4 lg:h-4 text-yellow-500" />
                </div>
                <p className="text-lg sm:text-xl lg:text-3xl font-black text-green-600 truncate">+{formatCurrency(calculations.guaranteedMargin)}</p>
                <p className="text-[10px] lg:text-xs text-gray-500 mt-1">Guaranteed margin on buy back</p>
              </div>

              <div className="bg-white rounded-2xl p-4 lg:p-5 border border-gray-100 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] lg:text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Gold Value at Maturity *</span>
                  <div className="p-1 lg:p-1.5 rounded-lg bg-blue-100">
                    <BarChart3 className="w-3 h-3 lg:w-3.5 lg:h-3.5 text-blue-600" />
                  </div>
                </div>
                <p className="text-lg sm:text-xl lg:text-3xl font-black text-gray-900 truncate">{formatCurrency(calculations.totalValueAtMaturity)}</p>
                <p className="text-[10px] lg:text-xs text-gray-500 mt-1">Combined purchased and additional gold</p>
              </div>

              <div className="bg-white rounded-2xl p-4 lg:p-5 border border-gray-100 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] lg:text-xs font-semibold text-gray-500 uppercase tracking-wide">Quarterly Paid Margin *</span>
                  <div className="p-1 lg:p-1.5 rounded-lg bg-orange-100">
                    <Sparkles className="w-3 h-3 lg:w-3.5 lg:h-3.5 text-orange-600" />
                  </div>
                </div>
                <p className="text-lg sm:text-xl lg:text-3xl font-black text-gray-900 truncate">{formatCurrency(calculations.quarterlyMargin)}</p>
                <p className="text-[10px] lg:text-xs text-gray-500 mt-1">Margin paid every quarter + Principal paid after locking period.</p>
              </div>
            </div>

            <p className="text-xs text-gray-500 italic flex items-center gap-1">
              <ExternalLink className="w-3 h-3" />
              *Terms and Conditions
            </p>

            <Link href="/get-started">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-xl font-semibold text-lg shadow-lg shadow-purple-200 hover:shadow-xl hover:shadow-purple-300 transition-all flex items-center justify-center gap-2"
                data-testid="button-start-bnsl-plan"
              >
                Start BNSL Plan
                <ArrowRight className="w-5 h-5" />
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function PlanComparisonSection() {
  const plans = [
    { 
      tenure: 12, 
      rate: 10, 
      category: 'SHORT TERM',
      description: 'Shorter duration',
      quarters: 4,
      features: [
        'Indicative ~10% growth p.a.',
        '4 quarterly growth cycles',
        'Returned worth based on Locked-In Price',
        'Ideal for near-term goals',
      ],
    },
    { 
      tenure: 24, 
      rate: 11, 
      category: 'BALANCED',
      description: 'Medium duration',
      quarters: 8,
      featured: true,
      features: [
        'Indicative ~11% growth p.a.',
        '8 quarterly growth cycles',
        'Ideal for stable medium-term goals',
        'Most popular choice',
      ],
    },
    { 
      tenure: 36, 
      rate: 12, 
      category: 'LONG TERM',
      description: 'Highest projected growth',
      quarters: 12,
      features: [
        'Indicative ~12% growth p.a.',
        '12 quarterly growth cycles',
        'Designed for long-term accumulation',
        'Maximum growth potential',
      ],
    },
  ];

  return (
    <section className="relative py-32 bg-gradient-to-b from-[#F8F9FC] via-white to-[#FAFBFF] overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-72 h-72 rounded-full bg-purple-100/30 blur-3xl" />
        <div className="absolute bottom-20 left-10 w-96 h-96 rounded-full bg-pink-100/20 blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-sm font-semibold text-purple-600 uppercase tracking-wider mb-4 block">
            Plan Options
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Choose Your{' '}
            <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
              BNSL Plan
            </span>
          </h2>
          <p className="text-gray-600 text-lg">Select the tenure that aligns with your gold accumulation goals.</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.tenure}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -8 }}
              className={`relative bg-white p-8 rounded-3xl border transition-all duration-300 shadow-lg ${
                plan.featured
                  ? 'border-purple-300 shadow-purple-100'
                  : 'border-gray-100 hover:border-purple-200'
              }`}
            >
              {plan.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-gradient-to-r from-purple-600 to-pink-500 rounded-full text-white text-xs font-bold uppercase tracking-wide">
                  Most Popular
                </div>
              )}

              <div className="text-center mb-6">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  {plan.category}
                </span>
              </div>

              <div className="flex justify-center mb-4">
                <div className={`w-24 h-24 rounded-full flex items-center justify-center border-4 ${
                  plan.featured 
                    ? 'border-purple-400 bg-gradient-to-br from-purple-50 to-pink-50' 
                    : 'border-purple-200 bg-purple-50'
                }`}>
                  <span className={`text-4xl font-bold ${plan.featured ? 'text-purple-600' : 'text-purple-500'}`}>
                    {plan.tenure}
                  </span>
                </div>
              </div>

              <p className="text-center text-gray-600 mb-6">{plan.description}</p>

              <div className="text-center mb-4">
                <div className="text-5xl font-black bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
                  ~{plan.rate}%
                </div>
                <p className="text-gray-500 text-sm">p.a. growth in gold worth</p>
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                  <span>Growth Cycles</span>
                  <span className="font-semibold">{plan.quarters} quarters</span>
                </div>
                <div className="flex gap-1">
                  {Array.from({ length: 12 }).map((_, j) => (
                    <div 
                      key={j} 
                      className={`h-2 flex-1 rounded-full ${
                        j < plan.quarters 
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500' 
                          : 'bg-gray-200'
                      }`} 
                    />
                  ))}
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm text-gray-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Link href="/get-started">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full py-3.5 rounded-xl text-center font-semibold transition-all flex items-center justify-center gap-2 ${
                    plan.featured
                      ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-lg shadow-purple-200'
                      : 'border-2 border-purple-200 text-purple-600 hover:bg-purple-50'
                  }`}
                  data-testid={`btn-select-${plan.tenure}`}
                >
                  Select {plan.tenure}-Month Plan
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BenefitsSection() {
  const benefits = [
    { 
      icon: Vault, 
      title: 'Physical Gold Security', 
      description: 'Your investment remains fully backed by physical gold held in regulated vaults.' 
    },
    { 
      icon: Lock, 
      title: 'Fixed Price Stability', 
      description: 'The Locked-In Price safeguards your valuation throughout the plan.' 
    },
    { 
      icon: Calendar, 
      title: 'Quarterly Gold Growth Credits', 
      description: 'Your gold worth increases every 3 months based on the agreed rate.' 
    },
    { 
      icon: Shield, 
      title: 'In-Kind Settlement', 
      description: 'At maturity, your principal worth is returned in gold, not cash.' 
    },
  ];

  return (
    <section className="relative py-32 bg-gradient-to-b from-[#FAFBFF] via-white to-[#F8F9FC] overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-1/4 w-96 h-96 rounded-full bg-purple-100/20 blur-3xl" />
        <div className="absolute bottom-10 right-1/4 w-72 h-72 rounded-full bg-pink-100/20 blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-sm font-semibold text-purple-600 uppercase tracking-wider mb-4 block">
            Key Benefits
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Why Users Prefer the{' '}
            <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
              BNSL Plan
            </span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((benefit, i) => (
            <motion.div
              key={benefit.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -4 }}
              className="bg-white p-6 rounded-2xl border border-gray-100 shadow-lg hover:shadow-xl hover:border-purple-200 transition-all"
            >
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center mb-5">
                <benefit.icon className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{benefit.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{benefit.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    { q: 'What is the Locked-In Price?', a: 'The price at which your gold is valued at the start of your BNSL plan. All returns and settlement values use this fixed price.' },
    { q: 'How are payouts calculated?', a: 'Payouts are based on your principal gold units multiplied by the indicative annual profit rate, divided into quarterly distributions.' },
    { q: 'What happens at maturity?', a: 'Your original gold principal is returned in-kind to your Fina wallet within 3 business days.' },
    { q: 'What if I exit early?', a: 'Early exit results in penalties, forfeiture of future payouts, and valuation at market price.' },
    { q: 'Are payouts always in gold units?', a: 'Yes. All projections, returns, and final settlements are made entirely in gold units.' },
  ];

  return (
    <section className="relative py-32 bg-gradient-to-b from-[#F8F9FC] via-white to-[#FAFBFF] overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-purple-100/30 blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-pink-100/20 blur-3xl" />
      </div>

      <div className="relative max-w-3xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-sm font-semibold text-purple-600 uppercase tracking-wider mb-4 block">
            FAQ
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Frequently Asked{' '}
            <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
              Questions
            </span>
          </h2>
          <p className="text-gray-600 text-lg">Everything you need to know about BNSL</p>
        </motion.div>

        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="bg-white border border-gray-100 rounded-xl overflow-hidden hover:border-purple-200 shadow-sm hover:shadow-md transition-all"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between p-5 text-left"
                data-testid={`faq-${i}`}
              >
                <span className="font-medium text-gray-900">{faq.q}</span>
                {openIndex === i ? (
                  <ChevronUp className="w-5 h-5 text-purple-600" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>
              <AnimatePresence>
                {openIndex === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <p className="px-5 pb-5 text-gray-600">{faq.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function RiskDisclosureSection() {
  const risks = [
    'Early termination can reduce principal.',
    'Rising gold prices do NOT increase your return.',
    'Settlement for early exit uses current market price.',
    'All future payouts are forfeited upon early exit.',
    'Dependent on counterparty performance.',
  ];

  return (
    <section className="relative py-20 bg-gradient-to-b from-[#FAFBFF] to-[#F8F9FC]">
      <div className="relative max-w-4xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="p-8 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200"
        >
          <div className="flex items-start gap-4 mb-6">
            <div className="p-2 rounded-lg bg-amber-100">
              <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Important Risk Disclosures</h3>
              <p className="text-sm text-gray-600">Please review these risks before participating in any BNSL plan.</p>
            </div>
          </div>
          
          <ul className="space-y-3">
            {risks.map((risk, i) => (
              <li key={i} className="flex items-start gap-3 text-gray-700">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0" />
                {risk}
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </section>
  );
}

function TermsSection() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <section className="relative py-16 bg-[#F8F9FC]">
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 transition-colors"
            data-testid="btn-view-terms"
          >
            <FileText className="w-5 h-5" />
            View Full BNSL Terms & Conditions
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </section>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-2xl bg-white border border-gray-200 shadow-2xl"
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h3 className="text-xl font-semibold text-gray-900">BNSL Terms & Conditions</h3>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <div className="prose prose-sm max-w-none">
                  <h4 className="text-purple-600 font-semibold">1. Plan Overview</h4>
                  <p className="text-gray-600">The BNSL (Buy Now Sell Later) Plan is a structured gold holding program that allows participants to lock physical gold at a fixed price and receive quarterly payouts in additional gold units.</p>
                  
                  <h4 className="text-purple-600 font-semibold mt-4">2. Locked-In Price</h4>
                  <p className="text-gray-600">The Locked-In Price is established at the time of plan activation and remains fixed for the entire duration. All calculations, payouts, and settlements are based on this price.</p>
                  
                  <h4 className="text-purple-600 font-semibold mt-4">3. Quarterly Payouts</h4>
                  <p className="text-gray-600">Payouts are distributed every three months based on the indicative annual profit rate divided into quarterly installments. All payouts are made in gold units, not fiat currency.</p>
                  
                  <h4 className="text-purple-600 font-semibold mt-4">4. Early Termination</h4>
                  <p className="text-gray-600">Early exit from the plan results in penalties, forfeiture of all future payouts, and settlement at current market price rather than the Locked-In Price.</p>
                  
                  <h4 className="text-purple-600 font-semibold mt-4">5. Settlement</h4>
                  <p className="text-gray-600">At maturity, your original gold principal plus accumulated payouts are settled in-kind to your Finatrades wallet within 3 business days.</p>
                  
                  <h4 className="text-purple-600 font-semibold mt-4">6. Risk Acknowledgment</h4>
                  <p className="text-gray-600">By participating, you acknowledge that projections are indicative, returns are not guaranteed, and the plan is subject to counterparty performance.</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function FinalCTASection() {
  return (
    <section className="relative py-32 bg-gradient-to-b from-[#FAFBFF] via-purple-50/30 to-[#F8F9FC] overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-1/4 w-96 h-96 rounded-full bg-purple-100/40 blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-[500px] h-[500px] rounded-full bg-pink-100/30 blur-3xl" />
      </div>
      
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 4, repeat: Infinity }}
          className="w-[600px] h-[600px] rounded-full bg-purple-200/30 blur-[100px]"
        />
      </div>

      <div className="relative max-w-4xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="space-y-8"
        >
          <h2 className="text-4xl md:text-6xl font-bold text-gray-900">
            Start Your BNSL Gold Plan{' '}
            <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
              Today
            </span>
          </h2>
          
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Lock your gold at a fixed price and begin earning quarterly payouts.
          </p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap justify-center gap-4 pt-4"
          >
            <Link href="/get-started" className="group flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white px-10 py-5 rounded-full text-lg font-semibold hover:from-purple-700 hover:to-pink-600 transition-all shadow-lg shadow-purple-200">
              Start BNSL Plan
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a href="/finagold#contact" className="flex items-center gap-2 border-2 border-purple-200 text-purple-600 px-10 py-5 rounded-full text-lg font-semibold hover:bg-purple-50 hover:border-purple-300 transition-all">
              Speak with Support
            </a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}


export default function BNSLLanding() {
  return (
    <ModeProvider>
      <div className="bnsl-landing min-h-screen bg-[#FAFBFF]" data-testid="bnsl-landing">
        <style>{`
          .bnsl-landing {
            --gold: #D4AF37;
            --gold-bright: #FFD500;
            --gold-light: #F7D878;
            --gold-dark: #B8860B;
            --purple-deep: #8A2BE2;
            --purple-magenta: #FF2FBF;
            --purple-light: #A342FF;
            --purple-violet: #4B0082;
            --primary: #8A2BE2;
            --primary-foreground: #ffffff;
            --ring: #8A2BE2;
            --accent: #D4AF37;
            --accent-foreground: #000000;
            --muted: #1A002F;
            --muted-foreground: rgba(255,255,255,0.7);
            --input: #2A0055;
            --border: #4B0082;
            --background: #0D001E;
            --foreground: #ffffff;
            --card: #1A002F;
            --card-foreground: #ffffff;
            --popover: #1A002F;
            --popover-foreground: #ffffff;
          }
        `}</style>
        <Navbar variant="products" />
        <HeroSection />
        <HowItWorksSection />
        <CalculatorSection />
        <PlanComparisonSection />
        <BenefitsSection />
        <FAQSection />
        <RiskDisclosureSection />
        <TermsSection />
        <FinalCTASection />
        <Footer />
        <FloatingAgentChat />
      </div>
    </ModeProvider>
  );
}
