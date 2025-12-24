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

const GOLD_COLOR = '#EAC26B';

function FloatingParticles({ count = 30 }: { count?: number }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full"
          style={{ backgroundColor: `${GOLD_COLOR}40` }}
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

function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center py-32 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-[#0a0a0a] to-black" />
      <FloatingParticles count={40} />
      
      <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] rounded-full bg-[#EAC26B]/5 blur-[150px]" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-[#EAC26B]/5 blur-[120px]" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-8"
        >
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {['Swiss-Regulated Framework', 'Physical Gold • In-Kind Settlement', 'Quarterly Payouts'].map((badge, i) => (
              <motion.span
                key={badge}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="px-4 py-2 rounded-full text-sm font-medium bg-[#EAC26B]/10 border border-[#EAC26B]/30 text-[#EAC26B]"
              >
                {badge}
              </motion.span>
            ))}
          </div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-5xl md:text-7xl font-bold text-white leading-tight"
          >
            BNSL – Buy Now{' '}
            <span className="bg-gradient-to-r from-[#EAC26B] to-[#d4af5a] bg-clip-text text-transparent">
              Sell Later
            </span>{' '}
            Plan
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto"
          >
            A structured gold holding program with fixed pricing, quarterly payouts, and in-kind settlement.
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-gray-400 max-w-2xl mx-auto leading-relaxed"
          >
            Lock physical gold at a fixed price and receive quarterly payouts in additional gold units. 
            Your entire plan follows the Locked-In Price mechanism established on your start date.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-wrap justify-center gap-4 pt-8"
          >
            <Link href="/bnsl" className="group flex items-center gap-2 bg-[#EAC26B] text-black px-8 py-4 rounded-full text-base font-semibold hover:bg-[#d4af5a] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-[#EAC26B]/30">
              Start BNSL Plan
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href="#calculator"
              className="flex items-center gap-2 border border-[#EAC26B]/40 text-white px-8 py-4 rounded-full text-base font-semibold hover:bg-white/5 hover:border-[#EAC26B]/60 transition-all"
            >
              <BarChart3 className="w-5 h-5" />
              Projection Calculator
            </a>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8, duration: 1 }}
          className="relative mt-20"
        >
          <div className="relative w-64 h-48 mx-auto">
            <motion.div
              animate={{ 
                rotateY: [0, 10, 0, -10, 0],
                y: [0, -10, 0],
              }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="relative">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 + i * 0.2 }}
                    className="absolute w-32 h-16 rounded-lg bg-gradient-to-br from-[#EAC26B] via-[#d4af5a] to-[#b8963f] shadow-xl"
                    style={{
                      transform: `translateY(${i * -12}px) translateX(${i * 8}px) rotateX(20deg) rotateY(-15deg)`,
                      boxShadow: '0 20px 40px rgba(234, 194, 107, 0.3)',
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent rounded-lg" />
                  </motion.div>
                ))}
              </div>
            </motion.div>
            
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 border border-[#EAC26B]/20 rounded-full"
              style={{ transform: 'scale(1.5)' }}
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 border border-[#EAC26B]/10 rounded-full"
              style={{ transform: 'scale(2)' }}
            />
          </div>
        </motion.div>
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
    <section className="relative py-32 bg-black overflow-hidden">
      <FloatingParticles count={20} />
      
      <div ref={ref} className="relative max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <motion.div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#EAC26B]/10 border border-[#EAC26B]/20 mb-6">
            <div className="w-2 h-2 rounded-full bg-[#EAC26B] animate-pulse" />
            <span className="text-[#EAC26B] text-sm font-medium">Step-by-Step Guide</span>
          </motion.div>
          
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">How BNSL Works</h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Follow the golden path to structured gold ownership
          </p>
        </motion.div>

        <div className="relative">
          <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2">
            <motion.div
              initial={{ scaleY: 0 }}
              animate={{ scaleY: isInView ? 1 : 0 }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
              className="w-full h-full bg-gradient-to-b from-[#EAC26B] via-[#EAC26B]/50 to-[#EAC26B]/20 origin-top"
            />
            
            {steps.map((_, index) => (
              <motion.div
                key={index}
                initial={{ scale: 0 }}
                animate={{ scale: activeStep >= index ? 1 : 0 }}
                transition={{ duration: 0.4 }}
                className="absolute left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-[#EAC26B] shadow-lg shadow-[#EAC26B]/50"
                style={{ top: `${(index / (steps.length - 1)) * 100}%` }}
              >
                <motion.div
                  animate={{ scale: activeStep === index ? [1, 1.5, 1] : 1 }}
                  transition={{ duration: 1, repeat: activeStep === index ? Infinity : 0 }}
                  className="absolute inset-0 rounded-full bg-[#EAC26B]/30"
                />
              </motion.div>
            ))}
          </div>

          <div className="space-y-12">
            {steps.map((step, index) => {
              const isLeft = index % 2 === 0;
              const isActive = activeStep === index;
              const isCompleted = activeStep > index;

              return (
                <div
                  key={step.number}
                  className={`flex ${isLeft ? 'justify-start pr-[52%]' : 'justify-end pl-[52%]'}`}
                >
                  <motion.div
                    initial={{ opacity: 0, x: isLeft ? -50 : 50 }}
                    animate={{ 
                      opacity: isActive || isCompleted ? 1 : 0.3,
                      x: 0,
                    }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    className={`relative flex items-center gap-6 ${isLeft ? 'flex-row' : 'flex-row-reverse'}`}
                  >
                    <motion.div
                      animate={{
                        scale: isActive ? [1, 1.1, 1] : 1,
                        boxShadow: isActive 
                          ? ['0 0 0 0 rgba(234, 194, 107, 0)', '0 0 30px 10px rgba(234, 194, 107, 0.3)', '0 0 20px 5px rgba(234, 194, 107, 0.2)']
                          : '0 0 0 0 rgba(234, 194, 107, 0)',
                      }}
                      transition={{ duration: 0.8, repeat: isActive ? Infinity : 0, repeatDelay: 2 }}
                      className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center shrink-0 transition-all duration-500 ${
                        isActive || isCompleted
                          ? 'bg-gradient-to-br from-[#EAC26B]/20 to-[#EAC26B]/5 border-2 border-[#EAC26B]'
                          : 'bg-white/5 border border-white/10'
                      }`}
                    >
                      <step.icon className={`w-7 h-7 transition-colors duration-500 ${
                        isActive || isCompleted ? 'text-[#EAC26B]' : 'text-gray-500'
                      }`} />
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ 
                        opacity: isActive || isCompleted ? 1 : 0.5,
                        y: 0,
                      }}
                      transition={{ duration: 0.5, delay: index * 0.1 + 0.2 }}
                      className={`flex-1 p-5 rounded-xl backdrop-blur-sm transition-all duration-500 ${
                        isActive
                          ? 'bg-gradient-to-br from-[#EAC26B]/10 to-transparent border border-[#EAC26B]/40'
                          : 'bg-white/[0.03] border border-white/10'
                      }`}
                    >
                      <span className={`text-sm font-bold ${isActive ? 'text-[#EAC26B]' : 'text-gray-500'}`}>
                        Step {step.number}
                      </span>
                      <h3 className={`text-lg font-semibold mt-1 ${isActive || isCompleted ? 'text-white' : 'text-gray-400'}`}>
                        {step.title}
                      </h3>
                      <p className={`text-sm mt-2 ${isActive ? 'text-gray-300' : 'text-gray-500'}`}>
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
            className="inline-flex items-center gap-2 bg-[#EAC26B] text-black px-8 py-4 rounded-full text-base font-semibold hover:bg-[#d4af5a] transition-all shadow-lg shadow-[#EAC26B]/30"
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
  
  const rates = { 12: 8, 24: 11, 36: 14 };
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
    setPlanValue(Math.min(Math.max(value, 500), 500000));
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
                  min="500"
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

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">BNSL Plan Value</span>
                  <div className="p-1.5 rounded-lg bg-purple-100">
                    <Lock className="w-3.5 h-3.5 text-purple-600" />
                  </div>
                </div>
                <p className="text-3xl font-black text-gray-900">{formatCurrency(calculations.planValue)}</p>
                <p className="text-xs text-gray-500 mt-1">Value of your BNSL plan</p>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Guaranteed Buy Back Margin *</span>
                  <Sparkles className="w-4 h-4 text-yellow-500" />
                </div>
                <p className="text-3xl font-black text-green-600">+{formatCurrency(calculations.guaranteedMargin)}</p>
                <p className="text-xs text-gray-500 mt-1">Guaranteed margin on buy back</p>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Gold Value at Maturity *</span>
                  <div className="p-1.5 rounded-lg bg-blue-100">
                    <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                </div>
                <p className="text-3xl font-black text-gray-900">{formatCurrency(calculations.totalValueAtMaturity)}</p>
                <p className="text-xs text-gray-500 mt-1">Combined purchased and additional gold</p>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Quarterly Paid Margin *</span>
                  <div className="p-1.5 rounded-lg bg-orange-100">
                    <Sparkles className="w-3.5 h-3.5 text-orange-600" />
                  </div>
                </div>
                <p className="text-3xl font-black text-gray-900">{formatCurrency(calculations.quarterlyMargin)}</p>
                <p className="text-xs text-gray-500 mt-1">Margin paid every quarter + Principal paid after locking period.</p>
              </div>
            </div>

            <p className="text-xs text-gray-500 italic flex items-center gap-1">
              <ExternalLink className="w-3 h-3" />
              *Terms and Conditions
            </p>

            <Link href="/dashboard/bnsl/create">
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

              <Link href="/dashboard/bnsl/create">
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
    { icon: Shield, title: 'Physical Gold Security', description: 'Your investment stays backed by real physical gold in regulated vaults.' },
    { icon: Lock, title: 'Fixed Price Stability', description: 'Your gold value stays anchored to the Locked-In Price for the entire plan.' },
    { icon: Calendar, title: 'Quarterly Gold Rewards', description: 'Every 3 months your wallet receives payout in additional gold units.' },
    { icon: Vault, title: 'In-Kind Settlement', description: 'Your principal is returned exactly in gold units at maturity.' },
  ];

  return (
    <section className="relative py-32 bg-gradient-to-b from-black via-[#050505] to-black overflow-hidden">
      <div className="relative max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Why Users Choose the BNSL Plan</h2>
          <p className="text-gray-400 text-lg">Built for stability, transparency, and real gold ownership</p>
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
              className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-[#EAC26B]/30 transition-all"
            >
              <div className="w-14 h-14 rounded-xl bg-[#EAC26B]/10 flex items-center justify-center mb-4">
                <benefit.icon className="w-7 h-7 text-[#EAC26B]" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{benefit.title}</h3>
              <p className="text-sm text-gray-400">{benefit.description}</p>
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
    <section className="relative py-32 bg-black overflow-hidden">
      <div className="relative max-w-3xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Frequently Asked Questions</h2>
          <p className="text-gray-400 text-lg">Everything you need to know about BNSL</p>
        </motion.div>

        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="border border-white/10 rounded-xl overflow-hidden hover:border-[#EAC26B]/30 transition-colors"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between p-5 text-left"
                data-testid={`faq-${i}`}
              >
                <span className="font-medium text-white">{faq.q}</span>
                {openIndex === i ? (
                  <ChevronUp className="w-5 h-5 text-[#EAC26B]" />
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
                    <p className="px-5 pb-5 text-gray-400">{faq.a}</p>
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
    <section className="relative py-20 bg-gradient-to-b from-black to-[#050505]">
      <div className="relative max-w-4xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="p-8 rounded-2xl bg-[#1a1510] border border-[#EAC26B]/20"
        >
          <div className="flex items-start gap-4 mb-6">
            <AlertTriangle className="w-8 h-8 text-[#EAC26B] shrink-0" />
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">Important Risk Disclosures</h3>
              <p className="text-sm text-gray-400">Please review these risks before participating in any BNSL plan.</p>
            </div>
          </div>
          
          <ul className="space-y-3">
            {risks.map((risk, i) => (
              <li key={i} className="flex items-start gap-3 text-gray-400">
                <span className="w-1.5 h-1.5 rounded-full bg-[#EAC26B]/50 mt-2 shrink-0" />
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
      <section className="relative py-16 bg-[#050505]">
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 text-[#EAC26B] hover:text-[#d4af5a] transition-colors"
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-2xl bg-[#0a0a0a] border border-[#EAC26B]/20"
            >
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <h3 className="text-xl font-semibold text-white">BNSL Terms & Conditions</h3>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[60vh] custom-scrollbar">
                <div className="prose prose-invert prose-sm max-w-none">
                  <h4 className="text-[#EAC26B]">1. Plan Overview</h4>
                  <p className="text-gray-400">The BNSL (Buy Now Sell Later) Plan is a structured gold holding program that allows participants to lock physical gold at a fixed price and receive quarterly payouts in additional gold units.</p>
                  
                  <h4 className="text-[#EAC26B]">2. Locked-In Price</h4>
                  <p className="text-gray-400">The Locked-In Price is established at the time of plan activation and remains fixed for the entire duration. All calculations, payouts, and settlements are based on this price.</p>
                  
                  <h4 className="text-[#EAC26B]">3. Quarterly Payouts</h4>
                  <p className="text-gray-400">Payouts are distributed every three months based on the indicative annual profit rate divided into quarterly installments. All payouts are made in gold units, not fiat currency.</p>
                  
                  <h4 className="text-[#EAC26B]">4. Early Termination</h4>
                  <p className="text-gray-400">Early exit from the plan results in penalties, forfeiture of all future payouts, and settlement at current market price rather than the Locked-In Price.</p>
                  
                  <h4 className="text-[#EAC26B]">5. Settlement</h4>
                  <p className="text-gray-400">At maturity, your original gold principal plus accumulated payouts are settled in-kind to your Finatrades wallet within 3 business days.</p>
                  
                  <h4 className="text-[#EAC26B]">6. Risk Acknowledgment</h4>
                  <p className="text-gray-400">By participating, you acknowledge that projections are indicative, returns are not guaranteed, and the plan is subject to counterparty performance.</p>
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
    <section className="relative py-32 bg-black overflow-hidden">
      <FloatingParticles count={25} />
      
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 4, repeat: Infinity }}
          className="w-[600px] h-[600px] rounded-full bg-[#EAC26B]/10 blur-[100px]"
        />
      </div>

      <div className="relative max-w-4xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="space-y-8"
        >
          <h2 className="text-4xl md:text-6xl font-bold text-white">
            Start Your BNSL Gold Plan{' '}
            <span className="bg-gradient-to-r from-[#EAC26B] to-[#d4af5a] bg-clip-text text-transparent">
              Today
            </span>
          </h2>
          
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Lock your gold at a fixed price and begin earning quarterly payouts.
          </p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap justify-center gap-4 pt-4"
          >
            <Link href="/bnsl" className="group flex items-center gap-2 bg-[#EAC26B] text-black px-10 py-5 rounded-full text-lg font-semibold hover:bg-[#d4af5a] transition-all shadow-lg shadow-[#EAC26B]/30">
              Start BNSL Plan
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a href="#contact" className="flex items-center gap-2 border border-[#8A2BE2]/40 text-white px-10 py-5 rounded-full text-lg font-semibold hover:bg-white/5 hover:border-[#8A2BE2]/60 transition-all">
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
      <div className="bnsl-landing min-h-screen bg-black text-white" data-testid="bnsl-landing">
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
