import { motion, useInView, useAnimation } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
import { UserPlus, ShieldCheck, Coins, Lock, BarChart3, Clock, ArrowRight, Building2, FileCheck, Users, Warehouse, Award, Globe, FileText } from 'lucide-react';
import { Link } from 'wouter';
import { useMode } from '../context/ModeContext';

const content = {
  personal: {
    title: 'How It Works',
    subtitle: 'Your journey to owning real gold',
    steps: [
      { icon: UserPlus, number: '01', title: 'Create Your Account', description: 'Register as an Individual and start your personal gold account.' },
      { icon: ShieldCheck, number: '02', title: 'Verify Your Identity', description: 'Complete Swiss-aligned KYC verification securely.' },
      { icon: Coins, number: '03', title: 'Deposit or Buy Gold', description: 'Deposit physical gold via partners or buy new gold on-platform (where available).' },
      { icon: Lock, number: '04', title: 'Secure Vault Storage', description: 'Your gold is stored in approved, regulated vaults with full documentation.' },
      { icon: BarChart3, number: '05', title: 'Track Your Gold 24/7', description: 'See grams, estimated value, and certificates in real time.' },
      { icon: Clock, number: '06', title: 'Optional: Join Holding Plans (BNSL)', description: 'Lock gold into structured holding plans for defined durations.' },
    ],
    cta: 'Explore Personal Platform',
    ctaHref: '/sign-in',
  },
  business: {
    title: 'How It Works',
    subtitle: 'Enterprise-grade gold infrastructure with governance controls',
    steps: [
      { icon: Building2, number: '01', title: 'Register a Corporate Profile', description: 'Submit company details, authorized signatories, and compliance documents.' },
      { icon: FileCheck, number: '02', title: 'KYB & Compliance Review', description: 'Finatrades performs a Swiss-aligned corporate verification process.' },
      { icon: Users, number: '03', title: 'Establish Gold Reserve Account', description: 'Set user roles, permissions, and operational limits for your organization.' },
      { icon: Warehouse, number: '04', title: 'Deposit Physical Gold', description: 'Deposit existing bars through verified channels into approved vaults.' },
      { icon: Award, number: '05', title: 'Receive Vault Certificates', description: 'Each deposit generates standardized vault documentation.' },
      { icon: Globe, number: '06', title: 'Use Gold Value for Trade & Treasury', description: 'Integrate gold value into trade flows, settlements, or collateral structures.' },
      { icon: FileText, number: '07', title: 'Reporting & Audit Controls', description: 'Access detailed reports for accounting, governance, and external audits.' },
    ],
    cta: 'Explore Business Platform',
    ctaHref: '/sign-in',
  },
};

function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-purple-400/30"
          initial={{
            x: Math.random() * 100 + '%',
            y: Math.random() * 100 + '%',
            scale: Math.random() * 0.5 + 0.5,
          }}
          animate={{
            y: [null, '-20%', '120%'],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: Math.random() * 10 + 10,
            repeat: Infinity,
            delay: Math.random() * 5,
            ease: 'linear',
          }}
        />
      ))}
    </div>
  );
}

function SnakePath({ activeStep, totalSteps }: { activeStep: number; totalSteps: number }) {
  const pathProgress = activeStep / (totalSteps - 1);
  
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      preserveAspectRatio="none"
      viewBox="0 0 100 100"
    >
      <defs>
        <linearGradient id="snakeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#8A2BE2" stopOpacity="0.1" />
          <stop offset="50%" stopColor="#8A2BE2" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#8A2BE2" stopOpacity="0.1" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      
      <motion.path
        d="M 5 16 Q 30 16, 50 16 T 95 16 Q 95 33, 50 33 T 5 33 Q 5 50, 50 50 T 95 50 Q 95 67, 50 67 T 5 67 Q 5 84, 50 84 T 95 84"
        fill="none"
        stroke="url(#snakeGradient)"
        strokeWidth="0.3"
        filter="url(#glow)"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: pathProgress }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
    </svg>
  );
}

function StepNode({ 
  step, 
  index, 
  isActive, 
  isCompleted,
  totalSteps 
}: { 
  step: typeof content.personal.steps[0];
  index: number;
  isActive: boolean;
  isCompleted: boolean;
  totalSteps: number;
}) {
  const isLeft = index % 2 === 0;
  
  return (
    <motion.div
      initial={{ opacity: 0, x: 0, y: 20 }}
      animate={{ 
        opacity: isActive || isCompleted ? 1 : 0.3,
        x: 0,
        y: 0,
      }}
      transition={{ duration: 0.6, delay: index * 0.15 }}
      className="relative flex flex-col md:flex-row items-start gap-3 md:gap-6"
    >
      <motion.div
        animate={{
          scale: isActive ? [1, 1.1, 1] : 1,
          boxShadow: isActive 
            ? ['0 0 0 0 rgba(234, 194, 107, 0)', '0 0 30px 10px rgba(234, 194, 107, 0.3)', '0 0 20px 5px rgba(234, 194, 107, 0.2)']
            : '0 0 0 0 rgba(234, 194, 107, 0)',
        }}
        transition={{ duration: 0.8, repeat: isActive ? Infinity : 0, repeatDelay: 2 }}
        className={`relative z-10 w-12 h-12 md:w-20 md:h-20 rounded-full flex items-center justify-center shrink-0 transition-all duration-500 ${
          isActive || isCompleted
            ? 'bg-gradient-to-br from-[#8A2BE2]/20 to-[#FF2FBF]/10 border-2 border-[#8A2BE2]'
            : 'bg-white border border-[#8A2BE2]/10'
        }`}
      >
        <step.icon className={`w-6 h-6 md:w-8 md:h-8 transition-colors duration-500 ${
          isActive || isCompleted ? 'text-[#8A2BE2]' : 'text-gray-400'
        }`} />
        
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: isActive ? 1 : 0 }}
          className="absolute -top-1 -right-1 w-5 h-5 md:w-6 md:h-6 rounded-full bg-[#8A2BE2] flex items-center justify-center"
        >
          <span className="text-white text-[10px] md:text-xs font-bold">{step.number}</span>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ 
          opacity: isActive || isCompleted ? 1 : 0.5,
          y: 0,
        }}
        transition={{ duration: 0.5, delay: index * 0.15 + 0.2 }}
        className={`flex-1 p-4 md:p-6 rounded-xl md:rounded-2xl backdrop-blur-sm transition-all duration-500 ${
          isActive
            ? 'bg-white border-2 border-[#8A2BE2]/40 shadow-lg shadow-[#8A2BE2]/10'
            : isCompleted
            ? 'bg-white border border-[#8A2BE2]/20'
            : 'bg-white/70 border border-[#8A2BE2]/10'
        }`}
      >
        <div className="flex items-center gap-2 md:gap-3 mb-2">
          <span className={`text-xs md:text-sm font-bold transition-colors duration-500 ${
            isActive ? 'text-[#8A2BE2]' : 'text-gray-500'
          }`}>
            Step {step.number}
          </span>
          {isCompleted && !isActive && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-green-500 text-xs"
            >
              ✓
            </motion.span>
          )}
        </div>
        <h3 className={`text-base md:text-lg font-semibold mb-1 md:mb-2 transition-colors duration-500 ${
          isActive || isCompleted ? 'text-[#0D0D0D]' : 'text-gray-500'
        }`}>
          {step.title}
        </h3>
        <p className={`text-xs md:text-sm leading-relaxed transition-colors duration-500 ${
          isActive ? 'text-gray-600' : 'text-gray-500'
        }`}>
          {step.description}
        </p>
      </motion.div>
    </motion.div>
  );
}

export default function HowItWorks() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const { mode } = useMode();
  const c = content[mode];
  const [activeStep, setActiveStep] = useState(-1);

  useEffect(() => {
    if (isInView && activeStep < c.steps.length - 1) {
      const timer = setTimeout(() => {
        setActiveStep(prev => prev + 1);
      }, activeStep === -1 ? 500 : 800);
      return () => clearTimeout(timer);
    }
  }, [isInView, activeStep, c.steps.length]);

  useEffect(() => {
    setActiveStep(-1);
  }, [mode]);

  return (
    <section id="how-it-works" className="relative py-12 lg:py-32 bg-gradient-to-b from-[#FAFBFF] via-[#F4F6FC] to-[#EDE9FE] overflow-x-hidden" data-testid="how-it-works-section">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(138, 43, 226, 0.08) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} />
      </div>

      <div className="absolute top-1/4 left-0 w-[600px] h-[600px] bg-[#8A2BE2]/5 rounded-full blur-[200px]" />
      <div className="absolute bottom-1/4 right-0 w-[500px] h-[500px] bg-[#FF2FBF]/5 rounded-full blur-[180px]" />

      <div ref={ref} className="relative max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[#8A2BE2]/20 mb-6 shadow-sm"
          >
            <div className="w-2 h-2 rounded-full bg-[#8A2BE2] animate-pulse" />
            <span className="text-[#8A2BE2] text-sm font-medium">Step-by-Step Guide</span>
          </motion.div>
          
          <motion.h2
            key={mode}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-4xl md:text-5xl font-bold text-[#0D0D0D] mb-4"
          >
            {c.title}
          </motion.h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            {c.subtitle}
          </p>
        </motion.div>

        <div className="relative">
          {/* Timeline line - hidden on mobile, center on desktop */}
          <div className="hidden md:block absolute md:left-1/2 top-0 bottom-0 w-px md:-translate-x-1/2">
            <motion.div
              initial={{ scaleY: 0 }}
              animate={{ scaleY: isInView ? 1 : 0 }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
              className="w-full h-full bg-gradient-to-b from-[#8A2BE2] via-[#8A2BE2]/50 to-[#8A2BE2]/20 origin-top"
            />
            
            {c.steps.map((_, index) => (
              <motion.div
                key={index}
                initial={{ scale: 0 }}
                animate={{ scale: activeStep >= index ? 1 : 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="absolute left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-[#8A2BE2] shadow-lg shadow-[#8A2BE2]/50"
                style={{ top: `${(index / (c.steps.length - 1)) * 100}%` }}
              >
                <motion.div
                  animate={{ scale: activeStep === index ? [1, 1.5, 1] : 1 }}
                  transition={{ duration: 1, repeat: activeStep === index ? Infinity : 0 }}
                  className="absolute inset-0 rounded-full bg-[#8A2BE2]/30"
                />
              </motion.div>
            ))}
          </div>

          {/* Steps container - stacked on mobile, alternating on desktop */}
          <div className="space-y-4 md:space-y-12">
            {c.steps.map((step, index) => {
              const isLeft = index % 2 === 0;
              return (
                <div
                  key={`${mode}-${step.number}`}
                  className={`flex md:w-[calc(50%-2rem)] ${isLeft ? 'md:mr-auto md:pr-8' : 'md:ml-auto md:pl-8'}`}
                >
                  <StepNode
                    step={step}
                    index={index}
                    isActive={activeStep === index}
                    isCompleted={activeStep > index}
                    totalSteps={c.steps.length}
                  />
                </div>
              );
            })}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: activeStep >= c.steps.length - 1 ? 1 : 0, y: activeStep >= c.steps.length - 1 ? 0 : 30 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center mt-20"
        >
          <motion.div
            animate={{
              boxShadow: activeStep >= c.steps.length - 1 
                ? ['0 0 0 0 rgba(249, 115, 22, 0)', '0 0 60px 20px rgba(249, 115, 22, 0.2)', '0 0 40px 10px rgba(249, 115, 22, 0.1)']
                : '0 0 0 0 rgba(249, 115, 22, 0)',
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className="inline-block rounded-full"
          >
            <Link href={c.ctaHref} className="group inline-flex items-center gap-3 bg-[#F97316] text-white px-10 py-5 rounded-full text-base font-semibold hover:bg-[#EA580C] transition-all shadow-lg shadow-[#F97316]/30">
              {c.cta}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
