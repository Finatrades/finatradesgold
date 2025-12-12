import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Coins, Lock, Calendar, Gift, Shield, Vault, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';

const getSteps = (t) => [
  {
    number: "01",
    icon: Coins,
    title: t('bnslHowItWorks.step1.title'),
    description: t('bnslHowItWorks.step1.desc')
  },
  {
    number: "02",
    icon: Lock,
    title: t('bnslHowItWorks.step2.title'),
    description: t('bnslHowItWorks.step2.desc')
  },
  {
    number: "03",
    icon: Calendar,
    title: t('bnslHowItWorks.step3.title'),
    description: t('bnslHowItWorks.step3.desc')
  },
  {
    number: "04",
    icon: Gift,
    title: t('bnslHowItWorks.step4.title'),
    description: t('bnslHowItWorks.step4.desc')
  },
  {
    number: "05",
    icon: Shield,
    title: t('bnslHowItWorks.step5.title'),
    description: t('bnslHowItWorks.step5.desc')
  },
  {
    number: "06",
    icon: Vault,
    title: t('bnslHowItWorks.step6.title'),
    description: t('bnslHowItWorks.step6.desc')
  }
];

// Snake path with animated glow
function SnakePath({ activeStep, isInView, steps }) {
  return (
    <div className="absolute left-8 md:left-1/2 top-0 bottom-0 md:-translate-x-1/2 w-1">
      {/* Base path */}
      <div className="absolute inset-0 bg-[#8A2BE2]/10 rounded-full" />
      
      {/* Animated glowing path */}
      <motion.div
        className="absolute top-0 left-0 right-0 bg-gradient-to-b from-[#8A2BE2] via-[#FF66D8] to-[#FF2FBF] rounded-full"
        initial={{ height: 0 }}
        animate={isInView ? { height: `${(activeStep / steps.length) * 100}%` } : {}}
        transition={{ duration: 2, ease: "easeOut" }}
        style={{ boxShadow: '0 0 20px rgba(138,43,226,0.6)' }}
      />
      
      {/* Traveling pulse */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-[#FF2FBF]"
        animate={isInView ? {
          top: ['0%', '100%'],
          opacity: [1, 0.5, 1],
          scale: [1, 1.5, 1]
        } : {}}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        style={{ boxShadow: '0 0 15px rgba(255,47,191,0.8)' }}
      />
    </div>
  );
}

// Step node component
function StepNode({ step, index, isActive, isPassed, isInView }) {
  const Icon = step.icon;
  
  return (
    <motion.div
      className={`relative flex items-start gap-6 md:gap-12 ${index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'} mb-16 last:mb-0`}
      initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
      animate={isInView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.2 }}
    >
      {/* Node circle */}
      <motion.div
        className="relative z-10 flex-shrink-0"
        animate={isActive ? { scale: [1, 1.1, 1] } : {}}
        transition={{ duration: 1, repeat: isActive ? Infinity : 0 }}
      >
        <div className={`w-16 h-16 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
          isPassed || isActive 
            ? 'bg-gradient-to-br from-[#8A2BE2] to-[#FF2FBF] border-[#8A2BE2]' 
            : 'bg-white border-[#8A2BE2]/30'
        }`}
        style={isPassed || isActive ? { boxShadow: '0 0 30px rgba(138,43,226,0.4)' } : {}}
        >
          <Icon className={`w-7 h-7 ${isPassed || isActive ? 'text-white' : 'text-[#8A2BE2]'}`} />
        </div>
        
        {/* Pulse ring */}
        {isActive && (
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-[#8A2BE2]"
            animate={{ scale: [1, 1.5], opacity: [0.8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
      </motion.div>

      {/* Content card */}
      <motion.div
        className={`flex-1 max-w-md ${index % 2 === 0 ? 'md:text-left' : 'md:text-right'}`}
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5, delay: index * 0.2 + 0.2 }}
      >
        <div className={`p-6 rounded-2xl bg-white border backdrop-blur-sm transition-all duration-500 shadow-[0_4px_20px_rgba(138,43,226,0.06)] ${
          isPassed || isActive ? 'border-[#8A2BE2]/40' : 'border-[#8A2BE2]/10'
        }`}
        style={isPassed || isActive ? { boxShadow: '0 0 40px rgba(138,43,226,0.1)' } : {}}
        >
          <div className={`text-[#8A2BE2] text-sm tracking-widest mb-2 ${index % 2 === 0 ? '' : 'md:text-right'}`}>
            STEP {step.number}
          </div>
          <h3 className="text-xl font-bold text-[#0D0D0D] mb-2">{step.title}</h3>
          <p className="text-[#4A4A4A]">{step.description}</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function BNSLHowItWorks({ onOpenCalculator }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [activeStep, setActiveStep] = React.useState(0);
  const { t } = useLanguage();
  const steps = getSteps(t);

  React.useEffect(() => {
    if (isInView) {
      const interval = setInterval(() => {
        setActiveStep(prev => (prev < steps.length ? prev + 1 : prev));
      }, 600);
      return () => clearInterval(interval);
    }
  }, [isInView, steps.length]);

  return (
    <section ref={ref} className="relative py-32 bg-gradient-to-b from-[#FAFBFF] via-[#F4F6FC] to-[#FAFBFF] overflow-hidden">
      {/* Background particles */}
      <div className="absolute inset-0">
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-[#8A2BE2]/30"
            style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }}
            animate={{ opacity: [0.2, 0.6, 0.2], scale: [0.8, 1.2, 0.8] }}
            transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 2 }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6">
        {/* Header */}
        <motion.div
          className="text-center mb-20"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
        >
          <p className="text-[#8A2BE2] text-sm tracking-[0.3em] uppercase mb-4">{t('bnslHowItWorks.badge')}</p>
          <h2 className="text-4xl md:text-5xl font-bold text-[#0D0D0D] mb-4">
            {t('bnslHowItWorks.title')} <span className="bg-gradient-to-r from-[#8A2BE2] to-[#FF2FBF] bg-clip-text text-transparent">{t('bnslHowItWorks.titleHighlight')}</span> {t('bnslHowItWorks.titleEnd')}
          </h2>
          <div className="w-24 h-0.5 bg-gradient-to-r from-[#8A2BE2] to-[#FF2FBF] mx-auto" />
        </motion.div>

        {/* Snake timeline */}
        <div className="relative pl-20 md:pl-0">
          <SnakePath activeStep={activeStep} isInView={isInView} steps={steps} />
          
          {steps.map((step, i) => (
            <StepNode
              key={i}
              step={step}
              index={i}
              isActive={activeStep === i + 1}
              isPassed={activeStep > i + 1}
              isInView={isInView}
            />
          ))}
        </div>

        {/* CTA */}
        <motion.div
          className="text-center mt-16"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 1.5 }}
        >
          <motion.button
            onClick={onOpenCalculator}
            className="group inline-flex items-center gap-3 px-8 py-4 rounded-full bg-gradient-to-r from-[#8A2BE2] to-[#FF2FBF] text-white font-medium"
            whileHover={{ scale: 1.03, boxShadow: '0 0 30px rgba(138,43,226,0.4)' }}
            whileTap={{ scale: 0.98 }}
          >
            {t('bnslHowItWorks.cta')}
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
}