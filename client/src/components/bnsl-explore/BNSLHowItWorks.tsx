import React, { useState, useEffect, useRef } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart,
  Calendar,
  Coins,
  TrendingUp,
  Play,
  Pause,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Shield,
  Clock,
  Gift,
  CheckCircle2,
  BadgeCheck,
} from 'lucide-react';

interface Step {
  id: number;
  icon: React.ElementType;
  title: string;
  shortTitle: string;
  description: string;
  details: string[];
  highlight: string;
  color: string;
  gradient: string;
}

const steps: Step[] = [
  {
    id: 1,
    icon: ShoppingCart,
    title: 'Purchase Gold',
    shortTitle: 'Buy',
    description: "Lock in today's gold price and secure your investment with just a few clicks.",
    details: [
      'Choose from 1g, 5g, 10g, or custom weight',
      'Lock current gold price instantly',
      'Flexible payment options available',
      'Digital ownership certificate issued',
    ],
    highlight: 'No minimum investment required',
    color: 'amber',
    gradient: 'from-amber-500 to-yellow-500',
  },
  {
    id: 2,
    icon: Calendar,
    title: 'Select Your Plan',
    shortTitle: 'Plan',
    description: 'Choose a holding period that matches your financial goals.',
    details: [
      '3, 6, 9, or 12-month options',
      'Higher bonuses for longer terms',
      'Auto-renewal available',
      'Change plan before maturity',
    ],
    highlight: 'Plans starting from 3 months',
    color: 'purple',
    gradient: 'from-purple-500 to-indigo-500',
  },
  {
    id: 3,
    icon: Coins,
    title: 'Earn Monthly Bonuses',
    shortTitle: 'Earn',
    description: 'Receive bonus gold added to your vault every month automatically.',
    details: [
      'Up to 2.5% monthly bonus rate',
      'Compounding bonus options',
      'Real-time bonus tracking',
      'Bonus paid in pure gold grams',
    ],
    highlight: 'Bonuses credited on the 1st of each month',
    color: 'emerald',
    gradient: 'from-emerald-500 to-teal-500',
  },
  {
    id: 4,
    icon: TrendingUp,
    title: 'Sell When Ready',
    shortTitle: 'Sell',
    description: 'Sell your gold at market price anytime after your plan matures.',
    details: [
      'Sell at live market prices',
      'Instant fund transfers',
      'No hidden selling fees',
      'Partial selling option',
    ],
    highlight: 'Keep your gold or convert to cash',
    color: 'blue',
    gradient: 'from-blue-500 to-cyan-500',
  },
];

interface BNSLHowItWorksProps {
  onOpenCalculator: () => void;
}

export default function BNSLHowItWorks({ onOpenCalculator }: BNSLHowItWorksProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: false, amount: 0.3 });

  useEffect(() => {
    if (!isAutoPlaying || !isInView) return;

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setActiveStep((step) => (step + 1) % steps.length);
          return 0;
        }
        return prev + 2;
      });
    }, 100);

    return () => clearInterval(progressInterval);
  }, [isAutoPlaying, isInView]);

  const handleStepClick = (index: number) => {
    setActiveStep(index);
    setProgress(0);
    setIsAutoPlaying(false);
  };

  const toggleAutoPlay = () => {
    setIsAutoPlaying(!isAutoPlaying);
    if (!isAutoPlaying) setProgress(0);
  };

  return (
    <section
      ref={sectionRef}
      id="how-it-works"
      className="py-24 bg-gradient-to-b from-white via-gray-50/50 to-white relative overflow-hidden"
    >
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
          className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 rounded-full border border-dashed border-amber-200/30"
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 80, repeat: Infinity, ease: 'linear' }}
          className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 rounded-full border border-dashed border-purple-200/30"
        />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200/50 mb-6"
          >
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-800">Simple 4-Step Process</span>
          </motion.div>

          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            How{' '}
            <span className="bg-gradient-to-r from-amber-500 to-yellow-500 bg-clip-text text-transparent">
              BNSL
            </span>{' '}
            Works
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Start your gold investment journey in four simple steps
          </p>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-12 items-start max-w-6xl mx-auto">
          {/* Left: Step Navigation */}
          <div className="space-y-4">
            {/* Autoplay Control */}
            <div className="flex items-center justify-between mb-6">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleAutoPlay}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                  isAutoPlaying
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {isAutoPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span className="text-sm font-medium">{isAutoPlaying ? 'Auto-playing' : 'Paused'}</span>
              </motion.button>

              <div className="flex items-center gap-2">
                {steps.map((_, index) => (
                  <motion.div
                    key={index}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      index === activeStep ? 'w-8' : 'w-3'
                    }`}
                    style={{
                      background:
                        index === activeStep
                          ? `linear-gradient(90deg, ${index === activeStep ? '#F59E0B' : '#D1D5DB'} ${progress}%, #E5E7EB ${progress}%)`
                          : index < activeStep
                            ? '#F59E0B'
                            : '#E5E7EB',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Step Cards */}
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === activeStep;

              return (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <motion.button
                    onClick={() => handleStepClick(index)}
                    whileHover={{ x: 4 }}
                    className={`w-full text-left p-5 rounded-2xl border-2 transition-all duration-300 ${
                      isActive
                        ? 'bg-white border-amber-300 shadow-lg shadow-amber-100/50'
                        : 'bg-white/60 border-gray-100 hover:border-gray-200 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Step Number & Icon */}
                      <div className="relative">
                        <motion.div
                          animate={isActive ? { scale: [1, 1.1, 1] } : {}}
                          transition={{ duration: 1, repeat: isActive ? Infinity : 0 }}
                          className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${step.gradient} flex items-center justify-center shadow-lg`}
                        >
                          <Icon className="w-7 h-7 text-white" />
                        </motion.div>
                        <div
                          className={`absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            isActive ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          {step.id}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h3
                          className={`text-lg font-bold mb-1 transition-colors ${
                            isActive ? 'text-gray-900' : 'text-gray-700'
                          }`}
                        >
                          {step.title}
                        </h3>
                        <p
                          className={`text-sm line-clamp-2 transition-colors ${
                            isActive ? 'text-gray-600' : 'text-gray-500'
                          }`}
                        >
                          {step.description}
                        </p>
                      </div>

                      {/* Arrow Indicator */}
                      <motion.div
                        animate={{ x: isActive ? [0, 5, 0] : 0 }}
                        transition={{ duration: 1, repeat: isActive ? Infinity : 0 }}
                      >
                        <ChevronRight
                          className={`w-5 h-5 ${isActive ? 'text-amber-500' : 'text-gray-300'}`}
                        />
                      </motion.div>
                    </div>

                    {/* Progress Bar for Active Step */}
                    {isActive && isAutoPlaying && (
                      <div className="mt-4 h-1 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-amber-400 to-yellow-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    )}
                  </motion.button>
                </motion.div>
              );
            })}
          </div>

          {/* Right: Active Step Details */}
          <div className="lg:sticky lg:top-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeStep}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden"
              >
                {/* Header with Gradient */}
                <div className={`p-8 bg-gradient-to-r ${steps[activeStep].gradient}`}>
                  <div className="flex items-center gap-4">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1, rotate: 360 }}
                      transition={{ type: 'spring', duration: 0.6 }}
                      className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center"
                    >
                      {React.createElement(steps[activeStep].icon, {
                        className: 'w-8 h-8 text-white',
                      })}
                    </motion.div>
                    <div>
                      <div className="text-white/80 text-sm font-medium mb-1">
                        Step {steps[activeStep].id} of 4
                      </div>
                      <h3 className="text-2xl font-bold text-white">{steps[activeStep].title}</h3>
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div className="p-8">
                  <p className="text-gray-600 text-lg mb-6">{steps[activeStep].description}</p>

                  {/* Feature List */}
                  <div className="space-y-4 mb-8">
                    {steps[activeStep].details.map((detail, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="flex items-center gap-3"
                      >
                        <div
                          className={`w-6 h-6 rounded-full bg-gradient-to-r ${steps[activeStep].gradient} flex items-center justify-center`}
                        >
                          <CheckCircle2 className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-gray-700">{detail}</span>
                      </motion.div>
                    ))}
                  </div>

                  {/* Highlight Box */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="p-4 rounded-xl bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200/50"
                  >
                    <div className="flex items-center gap-3">
                      <BadgeCheck className="w-5 h-5 text-amber-600" />
                      <span className="font-medium text-amber-800">{steps[activeStep].highlight}</span>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-6 flex gap-4"
            >
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onOpenCalculator}
                className="flex-1 py-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-amber-200/50"
                data-testid="button-calculate-returns"
              >
                Calculate Your Returns
                <ArrowRight className="w-5 h-5" />
              </motion.button>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
