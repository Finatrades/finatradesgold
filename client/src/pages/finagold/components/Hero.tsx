import { motion } from 'framer-motion';
import { Send, CreditCard, Wallet, TrendingUp, ArrowRight, Globe } from 'lucide-react';

const features = [
  { icon: Send, label: 'Money Transfer', desc: 'Send & Receive' },
  { icon: Wallet, label: 'Digital Payments', desc: 'Pay anywhere' },
  { icon: CreditCard, label: 'Card Payments & Withdrawals', desc: 'Tap, swipe, withdraw' },
  { icon: TrendingUp, label: 'BNSL Earnings', desc: 'Grow your wealth' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }
  }
};

export default function Hero() {
  return (
    <section className="relative min-h-screen pt-32 pb-20 overflow-hidden" data-testid="hero-section">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-[#0A0A0A] to-black" />
      
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(234, 194, 107, 0.15) 1px, transparent 0)`,
          backgroundSize: '60px 60px'
        }} />
      </div>

      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#EAC26B]/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#EAC26B]/3 rounded-full blur-[100px]" />

      <div className="relative max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-8"
          >
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-[#EAC26B]/20">
              <span className="text-[#EAC26B] text-sm font-medium">Finagold</span>
              <span className="text-gray-500 text-sm">— Powered by Finatrades</span>
            </motion.div>

            <motion.h1 variants={itemVariants} className="text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight">
              Everyday Money,<br />
              <span className="bg-gradient-to-r from-[#EAC26B] to-[#d4af5a] bg-clip-text text-transparent">Made Simple</span>
            </motion.h1>

            <motion.p variants={itemVariants} className="text-xl text-gray-400 max-w-lg leading-relaxed">
              Send money, pay digitally, use your card, and earn with BNSL — all from one secure personal account.
            </motion.p>

            <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4">
              {features.map((feature) => (
                <div
                  key={feature.label}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-[#EAC26B]/30 transition-colors group"
                  data-testid={`feature-${feature.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <div className="w-10 h-10 rounded-lg bg-[#EAC26B]/10 flex items-center justify-center group-hover:bg-[#EAC26B]/20 transition-colors">
                    <feature.icon className="w-5 h-5 text-[#EAC26B]" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{feature.label}</p>
                    <p className="text-gray-500 text-xs">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </motion.div>

            <motion.div variants={itemVariants} className="flex flex-wrap gap-4 pt-4">
              <button
                className="group flex items-center gap-2 bg-[#EAC26B] text-black px-8 py-4 rounded-full text-sm font-semibold hover:bg-[#d4af5a] transition-all shadow-lg shadow-[#EAC26B]/20"
                data-testid="btn-open-personal"
              >
                Open Personal Account
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                className="group flex items-center gap-2 border border-[#EAC26B]/30 text-white px-8 py-4 rounded-full text-sm font-semibold hover:bg-white/5 transition-all"
                data-testid="btn-explore-platform"
              >
                <Globe className="w-4 h-4" />
                Explore Personal Platform
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative hidden lg:block"
          >
            <div className="relative">
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="relative"
              >
                <div className="w-80 h-48 mx-auto rounded-3xl bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d] border border-[#EAC26B]/30 p-6 shadow-2xl shadow-[#EAC26B]/10 relative overflow-hidden">
                  <motion.div
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 3, repeat: Infinity, repeatDelay: 5, ease: 'easeInOut' }}
                    className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-[#EAC26B]/20 to-transparent skew-x-12"
                  />
                  
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <p className="text-[#EAC26B] text-xs font-medium tracking-wider">FINAGOLD</p>
                      <p className="text-gray-500 text-[10px]">Personal Gold</p>
                    </div>
                    <div className="w-10 h-8 rounded bg-gradient-to-br from-[#EAC26B] to-[#d4af5a]" />
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-white/60 text-sm tracking-[0.3em]">•••• •••• •••• 4289</p>
                    <div className="flex gap-8 pt-2">
                      <div>
                        <p className="text-gray-500 text-[10px]">VALID THRU</p>
                        <p className="text-white text-xs">12/28</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-[10px]">CARD HOLDER</p>
                        <p className="text-white text-xs">J. SMITH</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="absolute -top-4 right-0 flex items-center gap-2 px-4 py-2 rounded-full bg-black/80 border border-[#EAC26B]/20 backdrop-blur-sm">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-white text-xs font-medium">Swiss-Regulated Platform</span>
                  <span className="text-[10px] text-green-400 font-medium">ACTIVE</span>
                </div>
              </motion.div>

              <div className="absolute inset-0 -z-10">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#EAC26B]/5 rounded-full blur-[80px]" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
