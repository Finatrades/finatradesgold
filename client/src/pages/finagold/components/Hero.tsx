import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Phone, Shield, CheckCircle } from 'lucide-react';
import { Link } from 'wouter';
import { useMode } from '../context/ModeContext';

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
                  {/* Dark purple card */}
                  <div className={`w-[340px] h-52 mx-auto rounded-3xl bg-gradient-to-br from-[#2A0055] to-[#0D001E] border ${isPersonal ? 'border-[#8A2BE2]/40' : 'border-[#8A2BE2]/60'} p-6 shadow-2xl shadow-[#8A2BE2]/20 relative overflow-hidden`}>
                    <motion.div
                      animate={{ x: ['-100%', '250%'] }}
                      transition={{ duration: 4, repeat: Infinity, repeatDelay: 4, ease: 'easeInOut' }}
                      className="absolute inset-0 w-1/4 bg-gradient-to-r from-transparent via-[#8A2BE2]/25 to-transparent skew-x-12"
                    />
                    
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <p className="text-[#A342FF] text-xs font-bold tracking-wider">✦ FINATRADES</p>
                        <p className="text-gray-400 text-[10px] mt-0.5">{c.cardTitle}</p>
                      </div>
                      <div className="w-12 h-9 rounded-md bg-gradient-to-br from-[#EAC26B] to-[#d4af5a] shadow-lg" />
                    </div>
                    
                    <div className="space-y-4">
                      <p className="text-white/70 text-sm tracking-[0.25em] font-mono">•••• •••• •••• 4289</p>
                      <div className="flex gap-10">
                        <div>
                          <p className="text-gray-500 text-[10px] uppercase tracking-wider">Valid Thru</p>
                          <p className="text-white text-sm font-medium">12/28</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-[10px] uppercase tracking-wider">{isPersonal ? 'Account Holder' : 'Authorized'}</p>
                          <p className="text-white text-sm font-medium">{isPersonal ? 'J. Smith' : 'Corp Admin'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="absolute bottom-4 right-4 text-[10px] text-gray-600 font-medium">
                      {c.cardType}
                    </div>
                  </div>

                  <div className="absolute -top-3 right-4 flex items-center gap-2 px-4 py-2 rounded-full bg-black/90 border border-[#EAC26B]/30 backdrop-blur-sm shadow-xl">
                    <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                    <span className="text-white text-xs font-medium">Swiss-Regulated</span>
                    <span className="text-[10px] text-green-400 font-bold uppercase">Active</span>
                  </div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="absolute -bottom-4 left-4 right-4 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-gray-500 text-[10px] uppercase tracking-wider">Gold Balance</p>
                        <p className="text-white text-lg font-bold">142.85 <span className="text-[#EAC26B] text-sm">grams</span></p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-500 text-[10px] uppercase tracking-wider">Est. Value</p>
                        <p className="text-[#EAC26B] text-lg font-bold">$10,247</p>
                      </div>
                    </div>
                  </motion.div>
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
