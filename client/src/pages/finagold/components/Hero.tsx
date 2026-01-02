import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Phone, Shield, CheckCircle, X } from 'lucide-react';
import { Link } from 'wouter';
import { useMode } from '../context/ModeContext';
import finatradesLogo from '@/assets/finatrades-logo.png';

const content = {
  personal: {
    badge: 'Swiss-Regulated Platform',
    headline: 'FinaGold',
    subheadline: 'Your Digital Gold for Financial Transactions',
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
  const [showRegulatory, setShowRegulatory] = useState(false);

  return (
    <>
      {/* Regulatory Information Modal */}
      <AnimatePresence>
        {showRegulatory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowRegulatory(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Trusted & Regulated</h3>
                    <p className="text-xs text-gray-500">Complete Regulatory and Legal Information</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowRegulatory(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>
              <div className="p-6 space-y-6">
                {/* Company Information */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 text-base">About Finatrades Finance SA</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-gray-500 text-xs">Full Legal Name</p>
                        <p className="text-gray-900 font-medium">Finatrades Finance SA</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Website</p>
                        <p className="text-gray-900 font-medium">finatrades.com</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-gray-500 text-xs">Registered Office</p>
                        <p className="text-gray-900 font-medium">Rue Robert-CÉARD 6, 1204, GENEVA</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Canton</p>
                        <p className="text-gray-900 font-medium">GENEVA</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Company Number (UID)</p>
                        <p className="text-gray-900 font-medium">CHE-422.960.092</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Date of Formation</p>
                        <p className="text-gray-900 font-medium">29.01.2019</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Type of Corporation</p>
                        <p className="text-gray-900 font-medium">Société Anonyme LLC</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* License Confirmation */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="px-2 py-1 bg-red-100 rounded text-red-700 text-xs font-semibold">FINMA</div>
                    <h4 className="font-semibold text-gray-900 text-base">License Confirmation</h4>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <p className="text-xs text-purple-800 font-medium mb-2">SO-FIT Member No.: 1186</p>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      Finatrades Finance SA ("Finatrades") is an authorized member of d'Organisme de Surveillance pour Intermédiaires Financiers & Trustees (SO-FIT), and as such is subject to supervision by SO-FIT, a supervisory body officially recognized by the Swiss Financial Market Supervisory Authority (FINMA).
                    </p>
                    <p className="text-sm text-gray-700 leading-relaxed mt-3">
                      Finatrades' activities, including provision of its digital barter and payment platform, are carried out in compliance with the Swiss Federal Anti-Money Laundering Act (AMLA) and other applicable Swiss and international financial regulations.
                    </p>
                  </div>
                </div>

                {/* AML Compliance */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 text-base">Anti-Money Laundering (AML)</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Finatrades Finance SA is subject to the Swiss Federal Anti-Money Laundering Act (AMLA) and operates in full alignment with the Financial Action Task Force (FATF) Recommendations.
                  </p>
                  <div className="space-y-3">
                    {[
                      { title: 'Customer Due Diligence (CDD)', desc: 'Mandatory identity verification of all customers and beneficial owners, including documentation of source of funds.' },
                      { title: 'Enhanced Due Diligence (EDD)', desc: 'Additional scrutiny for Politically Exposed Persons (PEPs), high-risk jurisdictions, and complex structures.' },
                      { title: 'Ongoing Monitoring', desc: 'Continuous review of transactions to detect and report unusual or suspicious activity.' },
                      { title: 'Record Retention', desc: 'Secure storage of customer and transaction records for the statutory retention period.' },
                      { title: 'Employee Training', desc: 'Regular AML/CFT training for all relevant employees.' },
                      { title: 'Risk-Based Approach', desc: 'Application of the Wolfsberg Principles and international best practices.' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{item.title}</p>
                          <p className="text-xs text-gray-600">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Contact */}
                <div className="bg-gray-50 rounded-lg p-4 mt-4">
                  <p className="text-sm text-gray-700 font-medium mb-1">Compliance Contact</p>
                  <p className="text-xs text-gray-600">For compliance-related inquiries: support@finatrades.com</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    <section id="home" className="relative min-h-[auto] lg:min-h-screen pt-20 lg:pt-28 pb-12 lg:pb-20 overflow-x-hidden" data-testid="hero-section">
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center lg:min-h-[calc(100vh-200px)]">
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Red regulatory badge - opens modal */}
              <motion.div variants={itemVariants}>
                <button 
                  onClick={() => setShowRegulatory(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-600 border border-red-700 hover:bg-red-700 transition-all cursor-pointer"
                >
                  <span className="text-white text-sm font-bold">+</span>
                  <span className="text-white text-sm font-medium">{c.badge}</span>
                  <span className="text-white/70 text-xs">○</span>
                </button>
              </motion.div>

              {/* Pink/Magenta gradient title */}
              <motion.h1 variants={itemVariants} className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.1]">
                <span className="bg-gradient-to-r from-[#8A2BE2] via-[#FF2FBF] to-[#FF2FBF] bg-clip-text text-transparent">Finatrades</span>
              </motion.h1>

              {/* Dark subtitle */}
              <motion.h2 variants={itemVariants} className="text-xl sm:text-2xl md:text-3xl text-[#0D0D0D] font-semibold leading-tight text-balance">
                {c.subheadline.split(',').map((part, i) => (
                  <span key={i}>{part}{i === 0 ? ',' : ''}<br className="hidden md:block" /></span>
                ))}
              </motion.h2>

              {/* Gray paragraph */}
              <motion.p variants={itemVariants} className="text-[#4A4A4A] text-sm sm:text-base leading-relaxed max-w-xl whitespace-pre-line">
                {c.paragraph}
              </motion.p>

              {/* CTA Buttons - Sign In outline, Get Started orange */}
              <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
                <Link href="/sign-in" className="group flex items-center justify-center gap-2 border border-gray-300 text-[#0D0D0D] bg-white px-8 py-4 min-h-[52px] rounded-full text-base font-semibold hover:bg-gray-50 hover:border-gray-400 active:scale-[0.98] transition-all w-full sm:w-auto" data-testid="btn-sign-in">
                  {c.secondaryCta}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link href="/get-started" className="group flex items-center justify-center gap-2 bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white px-8 py-4 min-h-[52px] rounded-full text-base font-semibold hover:from-[#EA580C] hover:to-[#DC2626] active:scale-[0.98] transition-all shadow-lg shadow-[#F97316]/25 w-full sm:w-auto" data-testid="btn-get-started">
                  {c.primaryCta}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
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
                  animate={{ 
                    y: [0, -12, 0],
                    rotate: [0, 0.5, 0, -0.5, 0]
                  }}
                  transition={{ 
                    y: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
                    rotate: { duration: 6, repeat: Infinity, ease: 'easeInOut' }
                  }}
                  whileHover={{ 
                    scale: 1.03,
                    y: -15,
                    transition: { duration: 0.3 }
                  }}
                  className="relative lg:-mt-8 cursor-pointer"
                >
                  {/* Professional premium card - exact replica */}
                  <div className={`w-[400px] h-[260px] mx-auto rounded-3xl bg-gradient-to-br from-[#3D1A5C] via-[#2A0055] to-[#1a0a30] border-2 ${isPersonal ? 'border-[#8A2BE2]/60 hover:border-[#A342FF]' : 'border-[#A342FF]/70 hover:border-[#FF2FBF]'} p-5 shadow-2xl shadow-[#8A2BE2]/40 hover:shadow-[#8A2BE2]/60 relative overflow-hidden transition-all duration-300`}>
                    {/* Animated shimmer effect */}
                    <motion.div
                      animate={{ x: ['-100%', '300%'] }}
                      transition={{ duration: 3, repeat: Infinity, repeatDelay: 5, ease: 'easeInOut' }}
                      className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-white/8 to-transparent skew-x-12"
                    />
                    
                    {/* Header row: Logo + Active badge */}
                    <div className="flex justify-between items-center mb-4 relative z-10">
                      <div className="flex items-center gap-2">
                        <span className="text-[#A342FF] text-lg">✦</span>
                        <span className="text-white font-bold text-lg tracking-wide">FINA<span className="text-[#A342FF]">TRADES</span></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-green-400 font-bold uppercase px-3 py-1 bg-green-400/15 rounded-full border border-green-400/30">Active</span>
                        <span className="text-[#A342FF]">📶</span>
                      </div>
                    </div>
                    
                    {/* Chip + Card type row */}
                    <div className="flex items-center gap-4 mb-5 relative z-10">
                      {/* Gold chip */}
                      <div className="w-12 h-9 rounded-md bg-gradient-to-br from-purple-400 via-purple-500 to-pink-500 shadow-lg relative overflow-hidden">
                        <div className="absolute inset-0 flex flex-col justify-center gap-[2px] py-2">
                          <div className="h-[2px] bg-purple-700/60 mx-1.5" />
                          <div className="h-[2px] bg-purple-700/60 mx-1.5" />
                          <div className="h-[2px] bg-purple-700/60 mx-1.5" />
                          <div className="h-[2px] bg-purple-700/60 mx-1.5" />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-[#A342FF]" />
                          <span className="text-white font-semibold text-sm tracking-wide">{isPersonal ? 'PERSONAL GOLD' : 'ENTERPRISE GOLD'}</span>
                        </div>
                        <p className="text-gray-400 text-[10px] tracking-wider mt-0.5">GOLD-BACKED DIGITAL</p>
                      </div>
                    </div>
                    
                    {/* Card number */}
                    <div className="mb-5 relative z-10">
                      <p className="text-white text-2xl tracking-[0.15em] font-medium">
                        {isPersonal ? '4789' : '5892'} <span className="text-white/60">••••</span> <span className="text-white/60">••••</span> {isPersonal ? '3456' : '7821'}
                      </p>
                    </div>
                    
                    {/* Bottom row: Card holder + Valid thru + Secured */}
                    <div className="flex justify-between items-end relative z-10">
                      <div className="flex gap-8">
                        <div>
                          <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">Card Holder</p>
                          <p className="text-white text-sm font-semibold">{isPersonal ? 'FINATRADES USER' : 'FINATRADES CORPORATE'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">Valid Thru</p>
                          <p className="text-white text-sm font-semibold">12/28</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-full border border-white/20">
                        <span className="text-white/80 text-[10px]">🔒</span>
                        <span className="text-white text-[10px] font-semibold tracking-wide">SECURED</span>
                      </div>
                    </div>
                  </div>

                  {/* Swiss-Regulated Platform badge - opens modal */}
                  <motion.button
                    onClick={() => setShowRegulatory(true)}
                    whileHover={{ scale: 1.02 }}
                    className="absolute -top-4 right-4 sm:right-8 flex items-center gap-2 px-4 py-2.5 rounded-full bg-red-600 border border-red-700 backdrop-blur-md shadow-lg cursor-pointer hover:bg-red-700 transition-colors"
                  >
                    <span className="text-white text-sm font-bold">+</span>
                    <span className="text-white text-xs font-medium">Swiss-Regulated Platform</span>
                    <span className="text-white/70 text-xs">○</span>
                  </motion.button>

                </motion.div>

                <div className="absolute inset-0 -z-10">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-400/5 rounded-full blur-[100px]" />
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </section>
    </>
  );
}
