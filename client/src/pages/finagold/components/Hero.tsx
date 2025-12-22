import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Phone, Shield, CheckCircle } from 'lucide-react';
import { Link } from 'wouter';
import { useMode } from '../context/ModeContext';

const content = {
  personal: {
    badge: 'Swiss-Regulated Platform',
    headline: 'Digital Gold, Designed for Everyday People',
    subheadline: 'Save, store, and use real gold value through a secure, modern online account.',
    paragraph: 'Finatrades gives you a simple, transparent way to own and manage real physical gold without complexity. Whether you buy or deposit gold, we store it in regulated vaults and give you a clean digital interface to track your grams, certificates, and estimated value — anytime, anywhere.',
    primaryCta: 'Open Personal Account',
    secondaryCta: 'Explore Personal Platform',
    cardTitle: 'Personal Gold',
    cardType: 'Individual Account',
  },
  business: {
    badge: 'Swiss-Regulated Business Platform',
    headline: 'Gold-Backed Infrastructure for Real-World Trade',
    subheadline: 'Designed for corporates, importers, exporters, trading houses, and institutional partners.',
    paragraph: 'Finatrades enables businesses to store gold reserves, access standardized vault certificates, and integrate gold value into structured commercial and trade operations. The platform strengthens treasury, compliance, and settlement processes with a secure, auditable infrastructure backed by real physical gold.',
    primaryCta: 'Open Corporate Account',
    secondaryCta: 'Schedule a Business Call',
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
      <div className="absolute inset-0 bg-gradient-to-b from-black via-[#050505] to-[#0A0A0A]" />
      
      <div className="absolute inset-0 opacity-15">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(234, 194, 107, 0.2) 1px, transparent 0)`,
          backgroundSize: '50px 50px'
        }} />
      </div>

      <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-[#EAC26B]/5 rounded-full blur-[150px]" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[#EAC26B]/3 rounded-full blur-[120px]" />

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
              <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-[#EAC26B]/20">
                <Shield className="w-4 h-4 text-[#EAC26B]" />
                <span className="text-[#EAC26B] text-sm font-medium">{c.badge}</span>
              </motion.div>

              <motion.h1 variants={itemVariants} className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.1]">
                {c.headline.split(' ').map((word, i) => (
                  <span key={i}>
                    {word.includes('Gold') || word.includes('Infrastructure') ? (
                      <span className="bg-gradient-to-r from-[#EAC26B] to-[#d4af5a] bg-clip-text text-transparent">{word} </span>
                    ) : (
                      <span>{word} </span>
                    )}
                  </span>
                ))}
              </motion.h1>

              <motion.p variants={itemVariants} className="text-xl text-[#EAC26B]/80 font-medium">
                {c.subheadline}
              </motion.p>

              <motion.p variants={itemVariants} className="text-gray-400 leading-relaxed max-w-xl">
                {c.paragraph}
              </motion.p>

              <motion.div variants={itemVariants} className="flex flex-wrap gap-4 pt-4">
                <Link href="/register">
                  <a
                    className="group flex items-center gap-2 bg-[#EAC26B] text-black px-8 py-4 rounded-full text-sm font-semibold hover:bg-[#d4af5a] transition-all shadow-lg shadow-[#EAC26B]/25"
                    data-testid="btn-primary-cta"
                  >
                    {c.primaryCta}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </a>
                </Link>
                <Link href="/dashboard">
                  <a
                    className="group flex items-center gap-2 border border-[#EAC26B]/40 text-white px-8 py-4 rounded-full text-sm font-semibold hover:bg-white/5 hover:border-[#EAC26B]/60 transition-all"
                    data-testid="btn-secondary-cta"
                  >
                    {isPersonal ? (
                      <ArrowRight className="w-4 h-4" />
                    ) : (
                      <Phone className="w-4 h-4" />
                    )}
                    {c.secondaryCta}
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
                  <div className={`w-[340px] h-52 mx-auto rounded-3xl bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d] border ${isPersonal ? 'border-[#EAC26B]/40' : 'border-[#EAC26B]/60'} p-6 shadow-2xl shadow-[#EAC26B]/15 relative overflow-hidden`}>
                    <motion.div
                      animate={{ x: ['-100%', '250%'] }}
                      transition={{ duration: 4, repeat: Infinity, repeatDelay: 4, ease: 'easeInOut' }}
                      className="absolute inset-0 w-1/4 bg-gradient-to-r from-transparent via-[#EAC26B]/25 to-transparent skew-x-12"
                    />
                    
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <p className="text-[#EAC26B] text-xs font-bold tracking-wider">FINATRADES</p>
                        <p className="text-gray-500 text-[10px] mt-0.5">{c.cardTitle}</p>
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
