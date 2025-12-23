import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Phone, Shield, CheckCircle } from 'lucide-react';
import { Link } from 'wouter';
import { useMode } from '../context/ModeContext';
import finatradesLogo from '@/assets/finatrades-logo.png';

const content = {
  personal: {
    badge: 'Swiss-Regulated Platform',
    headline: 'Finatrades',
    subheadline: 'Your Digital Gold, Simplified',
    paragraph: "Save, store, and use real gold value through a secure, modern online account. Finatrades gives you the power of gold — send, receive, spend anywhere, and earn more through BNSL plans.",
    primaryCta: 'Get Started',
    secondaryCta: 'Sign In',
    cardTitle: 'Personal Gold',
    cardType: 'Individual Account',
  },
  business: {
    badge: 'Swiss-Regulated Platform',
    headline: 'Finatrades',
    subheadline: 'Regulated Gold-Backed Solutions',
    paragraph: 'Designed for corporates, importers, exporters, trading houses, and institutional partners.\n\nThrough a strategic partnership with Wingold & Metals DMCC, Finatrades converts physical gold holdings into digitally recorded, settlement-ready balances within its regulated infrastructure.',
    primaryCta: 'Get Started',
    secondaryCta: 'Sign In',
    cardTitle: 'Corporate Gold',
    cardType: 'Business Reserve',
  },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }
  }
};

export default function Hero() {
  const { mode, isPersonal } = useMode();
  const c = content[mode];

  return (
    <section id="home" className="relative min-h-screen pt-28 pb-20 overflow-hidden" data-testid="hero-section">
      {/* Light gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#FAFBFF] via-[#F4F6FC] to-[#EDE9FE]" />
      
      {/* Subtle dot pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(138, 43, 226, 0.1) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} />
      </div>

      {/* Purple glow effects */}
      <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-[#8A2BE2]/5 rounded-full blur-[150px]" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[#FF2FBF]/5 rounded-full blur-[120px]" />

      <div className="relative max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center min-h-[calc(100vh-200px)]">
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Pink badge */}
              <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[#FF2FBF]/30">
                <span className="text-[#FF2FBF] text-xs">✦</span>
                <span className="text-[#FF2FBF] text-sm font-medium">{c.badge}</span>
                <span className="text-[#FF2FBF] text-xs">○</span>
              </motion.div>

              {/* Pink/Magenta gradient title */}
              <motion.h1 variants={itemVariants} className="text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.1]">
                <span className="bg-gradient-to-r from-[#8A2BE2] via-[#FF2FBF] to-[#FF2FBF] bg-clip-text text-transparent">Finatrades</span>
              </motion.h1>

              {/* Dark subtitle */}
              <motion.h2 variants={itemVariants} className="text-2xl md:text-3xl text-[#0D0D0D] font-semibold leading-tight">
                {c.subheadline.split(',').map((part, i) => (
                  <span key={i}>{part}{i === 0 ? ',' : ''}<br className="hidden md:block" /></span>
                ))}
              </motion.h2>

              {/* Gray paragraph */}
              <motion.p variants={itemVariants} className="text-[#4A4A4A] leading-relaxed max-w-xl whitespace-pre-line">
                {c.paragraph}
              </motion.p>

              {/* CTA Buttons - Sign In outline, Get Started orange */}
              <motion.div variants={itemVariants} className="flex flex-wrap gap-4 pt-4">
                <Link href="/login">
                  <a
                    className="group flex items-center gap-2 border border-gray-300 text-[#0D0D0D] bg-white px-8 py-4 rounded-full text-sm font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all"
                    data-testid="btn-sign-in"
                  >
                    {c.secondaryCta}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </a>
                </Link>
                <Link href="/register">
                  <a
                    className="group flex items-center gap-2 bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white px-8 py-4 rounded-full text-sm font-semibold hover:from-[#EA580C] hover:to-[#DC2626] transition-all shadow-lg shadow-[#F97316]/25"
                    data-testid="btn-get-started"
                  >
                    {c.primaryCta}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </a>
                </Link>
              </motion.div>
            </motion.div>
          </AnimatePresence>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative hidden lg:block"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, scale: 0.95, rotateY: -10 }}
                animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                exit={{ opacity: 0, scale: 0.95, rotateY: 10 }}
                transition={{ duration: 0.5 }}
                className="relative"
              >
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                  className="relative"
                >
                  {/* Professional premium card */}
                  <div className={`w-[380px] h-[240px] mx-auto rounded-3xl bg-gradient-to-br from-[#1a0a30] via-[#2A0055] to-[#0D001E] border ${isPersonal ? 'border-[#8A2BE2]/30' : 'border-[#A342FF]/40'} p-6 shadow-2xl shadow-[#8A2BE2]/25 relative overflow-hidden`}>
                    {/* Animated shimmer effect */}
                    <motion.div
                      animate={{ x: ['-100%', '300%'] }}
                      transition={{ duration: 3, repeat: Infinity, repeatDelay: 5, ease: 'easeInOut' }}
                      className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12"
                    />
                    
                    {/* Decorative circles */}
                    <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-[#8A2BE2]/10 blur-2xl" />
                    <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-[#FF2FBF]/10 blur-2xl" />
                    
                    {/* Header with logo and chip */}
                    <div className="flex justify-between items-start mb-8 relative z-10">
                      <div className="flex items-center gap-3">
                        {/* Logo image */}
                        <img src={finatradesLogo} alt="Finatrades" className="h-8 w-auto brightness-0 invert" />
                        <span className="text-[#A342FF] text-sm">✦</span>
                      </div>
                      {/* Gold chip */}
                      <div className="w-14 h-10 rounded-lg bg-gradient-to-br from-[#EAC26B] via-[#F5D98A] to-[#d4af5a] shadow-lg relative overflow-hidden">
                        <div className="absolute inset-0 flex flex-col justify-center">
                          <div className="h-[2px] bg-[#b8942d]/50 mx-1" />
                          <div className="h-[2px] bg-[#b8942d]/50 mx-1 mt-1" />
                          <div className="h-[2px] bg-[#b8942d]/50 mx-1 mt-1" />
                        </div>
                      </div>
                    </div>
                    
                    {/* Card number */}
                    <div className="mb-6 relative z-10">
                      <p className="text-white/90 text-lg tracking-[0.3em] font-light">•••• •••• •••• 4289</p>
                    </div>
                    
                    {/* Card details */}
                    <div className="flex justify-between items-end relative z-10">
                      <div className="flex gap-8">
                        <div>
                          <p className="text-[#A342FF] text-[10px] uppercase tracking-wider font-medium mb-1">Valid Thru</p>
                          <p className="text-white text-sm font-semibold">12/28</p>
                        </div>
                        <div>
                          <p className="text-[#A342FF] text-[10px] uppercase tracking-wider font-medium mb-1">{isPersonal ? 'Card Holder' : 'Authorized'}</p>
                          <p className="text-white text-sm font-semibold">{isPersonal ? 'J. SMITH' : 'CORP ADMIN'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[#EAC26B] text-xs font-bold tracking-wide">{c.cardType}</p>
                      </div>
                    </div>
                  </div>

                  {/* Swiss-Regulated badge */}
                  <Link href="/regulatory-information">
                    <motion.a
                      whileHover={{ scale: 1.02 }}
                      className="absolute -top-4 right-4 flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-[#0D001E] to-[#1a0a30] border border-[#8A2BE2]/40 backdrop-blur-md shadow-xl cursor-pointer hover:border-[#A342FF]/60 transition-colors"
                    >
                      <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                      <span className="text-white text-xs font-medium">Swiss-Regulated</span>
                      <span className="text-[10px] text-green-400 font-bold uppercase px-2 py-0.5 bg-green-400/10 rounded-full">Active</span>
                    </motion.a>
                  </Link>

                </motion.div>

                <div className="absolute inset-0 -z-10">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#EAC26B]/5 rounded-full blur-[100px]" />
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
