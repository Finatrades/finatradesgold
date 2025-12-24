import { motion } from 'framer-motion';
import { 
  Wallet, ArrowRight, Shield, Lock, Globe, CreditCard, 
  ArrowUpRight, ArrowDownLeft, RefreshCw, Fingerprint,
  CheckCircle, Zap, Users, TrendingUp, Scan, Building2
} from 'lucide-react';
import { Link } from 'wouter';
import finatradesLogo from '@/assets/finatrades-logo.png';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { ModeProvider } from './context/ModeContext';
import FloatingAgentChat from '@/components/FloatingAgentChat';

function FloatingParticles({ count = 30 }: { count?: number }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-purple-400/40"
          initial={{
            x: `${Math.random() * 100}%`,
            y: `${Math.random() * 100}%`,
            scale: Math.random() * 0.5 + 0.5,
          }}
          animate={{
            x: [null, `${Math.random() * 100}%`],
            y: [null, '-20%', '120%'],
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

function AnimatedWalletCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, rotateY: -15 }}
      animate={{ opacity: 1, y: 0, rotateY: 0 }}
      transition={{ duration: 1, ease: 'easeOut' }}
      className="relative w-80 h-48 mx-auto perspective-1000"
    >
      <motion.div
        animate={{ 
          rotateY: [0, 5, 0, -5, 0],
          y: [0, -10, 0]
        }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="relative w-full h-full rounded-2xl bg-gradient-to-br from-purple-600 via-purple-700 to-pink-600 border border-purple-300/30 p-6 shadow-2xl shadow-purple-500/20"
        style={{ transformStyle: 'preserve-3d' }}
      >
        <motion.div
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
        />
        
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-purple-100 text-xs mb-1">Available Balance</p>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-baseline gap-2"
              >
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-3xl font-bold text-white"
                >
                  $12,450
                </motion.span>
                <span className="text-pink-200 text-sm">≈ 5.23g</span>
              </motion.div>
            </div>
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-6 rounded bg-gradient-to-br from-pink-300 to-purple-300" />
            <span className="text-purple-100 text-sm tracking-widest">•••• •••• •••• 4829</span>
          </div>
        </div>
        
        {Array.from({ length: 8 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-pink-300"
            style={{ 
              left: `${Math.random() * 100}%`, 
              top: `${Math.random() * 100}%` 
            }}
            animate={{
              scale: [0, 1, 0],
              opacity: [0, 0.8, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.3,
            }}
          />
        ))}
      </motion.div>
    </motion.div>
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
                <Wallet className="w-3 h-3 text-white" />
              </div>
              <span className="text-sm font-medium text-purple-700">Digital Gold Wallet</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight"
            >
              Fina<span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">Pay</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-xl md:text-2xl text-gray-900"
            >
              Your Digital Gold Wallet for{' '}
              <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
                Payments, Storage & Transfers
              </span>
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-gray-600 leading-relaxed max-w-lg"
            >
              Send, receive, store, and manage gold value instantly. 
              Every wallet balance is backed by your physical gold stored 
              securely in FinaVault.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-wrap gap-4 pt-4"
            >
              <Link href="/finapay" className="group flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white px-8 py-4 rounded-full text-base font-semibold hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-purple-500/30">
                <Wallet className="w-5 h-5" />
                Open Wallet
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a
                href="#transactions"
                className="flex items-center gap-2 border border-purple-300 text-purple-700 px-6 py-4 rounded-full text-base font-semibold hover:bg-purple-50 hover:border-purple-400 transition-all"
              >
                <RefreshCw className="w-5 h-5" />
                View Transactions
              </a>
            </motion.div>
          </motion.div>

          {/* Wallet Card Preview */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="hidden lg:block"
          >
            <div className="relative p-6 rounded-3xl bg-white/80 backdrop-blur-sm border border-gray-200 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-gray-900 font-semibold">FinaPay</span>
                </div>
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                  className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center"
                >
                  <RefreshCw className="w-4 h-4 text-purple-600" />
                </motion.div>
              </div>
              
              <div className="text-center py-6">
                <p className="text-gray-500 text-sm mb-2">Gold Balance</p>
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="text-4xl font-bold text-gray-900"
                >
                  $24,750.85 <span className="text-lg font-normal text-gray-500">USD</span>
                </motion.div>
                <p className="text-purple-600 text-sm mt-1">≈ 12.45 oz Gold</p>
              </div>

              <div className="flex justify-center gap-3 pt-4">
                {['Send', 'Receive', 'Convert'].map((action) => (
                  <motion.button
                    key={action}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:border-purple-300 hover:text-purple-600 transition-all"
                  >
                    {action}
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function WalletFeaturesSection() {
  const features = [
    { icon: Wallet, title: 'Gold-Backed Wallet', description: 'Every balance unit represents real gold in secure vaults' },
    { icon: Zap, title: 'Instant Transfers', description: 'Send and receive gold value in seconds globally' },
    { icon: RefreshCw, title: 'Multi-Currency Value', description: 'View balance in USD, grams, or troy ounces' },
    { icon: Building2, title: 'Vault-Linked', description: 'Directly connected to your FinaVault holdings' },
    { icon: TrendingUp, title: 'Real-Time Pricing', description: 'Live gold rates updated every second' },
    { icon: Lock, title: 'Secure & Encrypted', description: 'Bank-level security with end-to-end encryption' },
  ];

  return (
    <section className="relative py-24 bg-gradient-to-b from-[#F8F9FC] via-white to-[#FAFBFF] overflow-hidden">
      <div className="relative max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Wallet{' '}
            <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
              Features
            </span>
          </h2>
          <p className="text-gray-600 text-lg">A complete digital wallet experience powered by real gold</p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -5 }}
              className="relative p-6 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-lg hover:border-purple-200 transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-purple-100 to-pink-100 flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function WalletPhoneMockupSection() {
  return (
    <section className="relative py-24 bg-gradient-to-b from-[#FAFBFF] via-white to-[#F8F9FC] overflow-hidden">
      <FloatingParticles count={20} />
      
      <div className="relative max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            A Wallet Built on{' '}
            <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
              Real Gold
            </span>
          </h2>
          <p className="text-gray-600 text-lg">Intuitive interface designed for seamless gold transactions</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex justify-center"
        >
          {/* Phone Mockup */}
          <div className="relative w-80 rounded-[3rem] bg-white border-8 border-gray-800 shadow-2xl overflow-hidden">
            {/* Phone notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-gray-800 rounded-b-2xl z-10" />
            
            {/* Screen content */}
            <div className="pt-8 pb-6 px-6 bg-gradient-to-b from-gray-50 to-white min-h-[500px]">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-gray-900 font-bold">FinaPay</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                  <RefreshCw className="w-4 h-4 text-purple-600" />
                </div>
              </div>
              
              {/* Balance */}
              <div className="text-center py-4 mb-4">
                <p className="text-gray-500 text-sm mb-1">Gold Balance</p>
                <motion.p
                  animate={{ scale: [1, 1.02, 1] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent"
                >
                  $24,750.85
                </motion.p>
                
                {/* Currency Toggle */}
                <div className="flex justify-center gap-2 mt-4">
                  {['USD', 'Grams', 'Oz'].map((unit, i) => (
                    <button
                      key={unit}
                      className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                        i === 0 
                          ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white' 
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {unit}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex justify-center gap-6 mb-6">
                {[
                  { icon: ArrowUpRight, label: 'Send' },
                  { icon: ArrowDownLeft, label: 'Receive' },
                  { icon: RefreshCw, label: 'Convert' },
                ].map((action) => (
                  <div key={action.label} className="flex flex-col items-center gap-1">
                    <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                      <action.icon className="w-5 h-5 text-purple-600" />
                    </div>
                    <span className="text-xs text-gray-600">{action.label}</span>
                  </div>
                ))}
              </div>
              
              {/* Recent Activity */}
              <div className="border-t border-gray-100 pt-4">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-gray-900 font-semibold text-sm">Recent Activity</span>
                  <span className="text-purple-600 text-xs font-medium">View All</span>
                </div>
                
                {[
                  { name: 'John Smith', time: '2 min ago', amount: '+$2,500.00', type: 'receive' },
                  { name: 'Trade Partner', time: '1 hour ago', amount: '-$1,200.00', type: 'send' },
                  { name: 'Deposit Synced', time: '3 hours ago', amount: '+5.2 g', type: 'sync' },
                ].map((tx, i) => (
                  <div key={i} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        tx.type === 'receive' ? 'bg-green-100' :
                        tx.type === 'send' ? 'bg-pink-100' : 'bg-purple-100'
                      }`}>
                        {tx.type === 'receive' ? <ArrowDownLeft className="w-4 h-4 text-green-600" /> :
                         tx.type === 'send' ? <ArrowUpRight className="w-4 h-4 text-pink-600" /> :
                         <Building2 className="w-4 h-4 text-purple-600" />}
                      </div>
                      <div>
                        <p className="text-gray-900 text-sm font-medium">{tx.name}</p>
                        <p className="text-gray-400 text-xs">{tx.time}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-semibold ${
                      tx.amount.startsWith('+') ? 'text-green-500' : 'text-pink-500'
                    }`}>
                      {tx.amount}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function GoldCardSection() {
  return (
    <section className="relative py-24 bg-gradient-to-b from-[#F8F9FC] via-white to-[#FAFBFF] overflow-hidden">
      <div className="relative max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 border border-purple-200/50"
            >
              <CreditCard className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-700">Coming Soon</span>
            </motion.div>

            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              A Premium Gold Card{' '}
              <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
                Experience
              </span>
            </h2>

            <p className="text-gray-600 leading-relaxed">
              Spend your gold value anywhere with the FinaPay premium debit card. 
              Seamlessly convert gold to fiat at the point of sale.
            </p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <button className="group flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white px-8 py-4 rounded-full text-base font-semibold hover:opacity-90 transition-all shadow-lg shadow-purple-500/30">
                Join Waitlist
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          </motion.div>

          {/* Card Visual */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex justify-center"
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="relative w-[380px] h-[240px] rounded-2xl bg-gradient-to-br from-gray-800 via-gray-900 to-black p-6 shadow-2xl"
            >
              {/* Card content */}
              <div className="flex justify-between items-start mb-8">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-gradient-to-br from-purple-500 to-pink-500" />
                  <span className="text-white font-bold text-sm">FINATRADES</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-green-400 text-xs">ACTIVE</span>
                  </div>
                  <svg className="w-5 h-5 text-white/60" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 3C8.5 3 5.5 4.5 3.5 7H20.5C18.5 4.5 15.5 3 12 3Z"/>
                    <path d="M3.5 17C5.5 19.5 8.5 21 12 21C15.5 21 18.5 19.5 20.5 17H3.5Z" opacity="0.5"/>
                  </svg>
                </div>
              </div>

              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-8 rounded bg-gradient-to-r from-amber-400 to-yellow-500" />
                <div>
                  <span className="text-gray-400 text-xs">DEBIT</span>
                  <span className="text-amber-400 text-xs ml-2">GOLD-BACKED</span>
                </div>
              </div>

              <div className="text-white text-2xl tracking-[0.2em] font-mono mb-6">
                4789 •••• •••• 4892
              </div>

              <div className="flex justify-between items-end">
                <div>
                  <div className="text-gray-500 text-xs mb-1">CARD HOLDER</div>
                  <div className="text-white text-sm font-medium">GOLD MEMBER</div>
                </div>
                <div>
                  <div className="text-gray-500 text-xs mb-1">EXPIRES</div>
                  <div className="text-white text-sm font-medium">12/28</div>
                </div>
                <div className="px-3 py-1 rounded-full bg-white/10 border border-white/20">
                  <span className="text-white/70 text-xs">◎ Secured</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function WalletUIDemoSection() {
  return (
    <section className="relative py-32 bg-gradient-to-b from-[#FAFBFF] via-white to-[#F8F9FC] overflow-hidden">
      <FloatingParticles count={20} />
      
      <div className="relative max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            A Wallet Built on{' '}
            <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
              Real Gold
            </span>
          </h2>
          <p className="text-gray-600 text-lg">Experience seamless gold transactions</p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <div className="p-6 rounded-2xl bg-white border border-gray-100 shadow-lg">
              <div className="flex justify-between items-center mb-6">
                <span className="text-gray-600">Total Balance</span>
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="px-3 py-1 rounded-full bg-green-100 text-green-600 text-sm"
                >
                  +2.4% today
                </motion.div>
              </div>
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                className="text-4xl font-bold text-gray-900 mb-2"
              >
                $24,580.00
              </motion.div>
              <p className="text-purple-600">≈ 10.32 grams gold</p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {[
                { icon: ArrowUpRight, label: 'Send', color: 'text-blue-500' },
                { icon: ArrowDownLeft, label: 'Receive', color: 'text-green-500' },
                { icon: RefreshCw, label: 'Convert', color: 'text-purple-500' },
              ].map((action, i) => (
                <motion.button
                  key={action.label}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-4 rounded-xl bg-white border border-gray-100 shadow-md hover:border-purple-200 transition-all flex flex-col items-center gap-2"
                >
                  <action.icon className={`w-6 h-6 ${action.color}`} />
                  <span className="text-sm text-gray-600">{action.label}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            {[
              { type: 'Received', amount: '+$1,200.00', time: '2 mins ago', icon: ArrowDownLeft },
              { type: 'Sent', amount: '-$450.00', time: '1 hour ago', icon: ArrowUpRight },
              { type: 'Vault Sync', amount: '+$2,500.00', time: '3 hours ago', icon: RefreshCw },
            ].map((tx, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="p-4 rounded-xl bg-white border border-gray-100 shadow-md flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    tx.type === 'Received' ? 'bg-green-100' : 
                    tx.type === 'Sent' ? 'bg-red-100' : 'bg-purple-100'
                  }`}>
                    <tx.icon className={`w-5 h-5 ${
                      tx.type === 'Received' ? 'text-green-500' : 
                      tx.type === 'Sent' ? 'text-red-500' : 'text-purple-600'
                    }`} />
                  </div>
                  <div>
                    <p className="text-gray-900 font-medium">{tx.type}</p>
                    <p className="text-gray-500 text-sm">{tx.time}</p>
                  </div>
                </div>
                <span className={`font-semibold ${
                  tx.amount.startsWith('+') ? 'text-green-500' : 'text-red-500'
                }`}>
                  {tx.amount}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function GoldTransferSection() {
  return (
    <section className="relative py-32 bg-gradient-to-b from-[#F8F9FC] via-white to-[#FAFBFF] overflow-hidden">
      <div className="relative max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Instant Gold{' '}
            <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
              Transfers
            </span>
          </h2>
          <p className="text-gray-600 text-lg">Move your gold value instantly between accounts or to other users</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative p-8 rounded-2xl bg-white border border-gray-100 shadow-lg"
        >
          <div className="flex flex-col md:flex-row items-center justify-center gap-8">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-32 h-32 rounded-2xl bg-gradient-to-r from-purple-100 to-pink-100 border-2 border-purple-200 flex flex-col items-center justify-center gap-2"
            >
              <Building2 className="w-10 h-10 text-purple-600" />
              <span className="text-gray-900 font-medium">FinaVault</span>
            </motion.div>

            <div className="relative w-48 h-16">
              <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-center">
                <div className="w-full h-px bg-gradient-to-r from-purple-200 via-purple-500 to-purple-200" />
              </div>
              {[0, 1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-gradient-to-r from-purple-600 to-pink-500"
                  animate={{ x: [0, 180], opacity: [0, 1, 1, 0] }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.5 }}
                />
              ))}
            </div>

            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity, delay: 1 }}
              className="w-32 h-32 rounded-2xl bg-gradient-to-r from-purple-100 to-pink-100 border-2 border-purple-200 flex flex-col items-center justify-center gap-2"
            >
              <Wallet className="w-10 h-10 text-purple-600" />
              <span className="text-gray-900 font-medium">FinaPay</span>
            </motion.div>
          </div>

          <div className="mt-8 text-center">
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 text-green-600 text-sm"
            >
              <CheckCircle className="w-4 h-4" />
              Transfer Complete
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function GlobalPaymentSection() {
  const hubs = [
    { name: 'London', position: { top: '30%', left: '45%' } },
    { name: 'Dubai', position: { top: '45%', left: '58%' } },
    { name: 'Singapore', position: { top: '55%', left: '75%' } },
    { name: 'New York', position: { top: '35%', left: '25%' } },
    { name: 'Zurich', position: { top: '32%', left: '48%' } },
  ];

  return (
    <section className="relative py-32 bg-gradient-to-b from-[#FAFBFF] via-white to-[#F8F9FC] overflow-hidden">
      <div className="relative max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Instant Cross-Border{' '}
            <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
              Gold Payments
            </span>
          </h2>
          <p className="text-gray-600 text-lg">Send gold value anywhere in the world</p>
        </motion.div>

        <div className="relative aspect-[2/1] rounded-2xl bg-white border border-gray-100 shadow-lg overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, rgb(147, 51, 234, 0.3) 1px, transparent 0)`,
              backgroundSize: '30px 30px',
            }} />
          </div>
          
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {[[25, 35, 45, 30], [45, 30, 48, 32], [48, 32, 58, 45], [58, 45, 75, 55]].map(([x1, y1, x2, y2], i) => (
              <motion.line
                key={i}
                x1={`${x1}%`} y1={`${y1}%`} x2={`${x2}%`} y2={`${y2}%`}
                stroke="rgb(147, 51, 234)" strokeWidth="2" strokeOpacity="0.4"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                transition={{ duration: 1, delay: 0.3 + i * 0.2 }}
              />
            ))}
          </svg>
          
          {hubs.map((hub, i) => (
            <motion.div
              key={hub.name}
              initial={{ opacity: 0, scale: 0 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 + i * 0.15 }}
              className="absolute"
              style={hub.position}
            >
              <motion.div
                animate={{ scale: [1, 1.8, 1], opacity: [0.3, 0.7, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                className="absolute inset-0 w-6 h-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-300/30"
              />
              <div className="relative w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-purple-600 to-pink-500 shadow-lg shadow-purple-500/50" />
              <div className="absolute top-4 left-1/2 -translate-x-1/2 whitespace-nowrap">
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/90 border border-purple-200 text-purple-700 shadow-sm">
                  {hub.name}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TransactionHistorySection() {
  const transactions = [
    { icon: ArrowDownLeft, title: 'Gold Received', amount: '+$2,500.00', desc: 'From John D.', color: 'green' },
    { icon: CheckCircle, title: 'Transfer Completed', amount: '-$1,200.00', desc: 'To Sarah M.', color: 'blue' },
    { icon: RefreshCw, title: 'Vault Deposit Synced', amount: '+$5,000.00', desc: 'From FinaVault', color: 'purple' },
  ];

  return (
    <section id="transactions" className="relative py-32 bg-gradient-to-b from-[#F8F9FC] via-white to-[#FAFBFF] overflow-hidden">
      <FloatingParticles count={15} />
      
      <div className="relative max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Transparent, Real-Time{' '}
            <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
              Transaction Records
            </span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {transactions.map((tx, i) => (
            <motion.div
              key={tx.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              whileHover={{ y: -8, rotateY: 5 }}
              className="p-6 rounded-2xl bg-white border border-gray-100 shadow-lg backdrop-blur-sm hover:border-purple-200 transition-all"
            >
              <motion.div
                animate={{ scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                className={`w-12 h-12 rounded-xl mb-4 flex items-center justify-center ${
                  tx.color === 'green' ? 'bg-green-100' :
                  tx.color === 'blue' ? 'bg-blue-100' : 'bg-purple-100'
                }`}
              >
                <tx.icon className={`w-6 h-6 ${
                  tx.color === 'green' ? 'text-green-500' :
                  tx.color === 'blue' ? 'text-blue-500' : 'text-purple-600'
                }`} />
              </motion.div>
              <h3 className="text-gray-900 font-semibold mb-1">{tx.title}</h3>
              <p className="text-gray-500 text-sm mb-3">{tx.desc}</p>
              <p className={`text-xl font-bold ${
                tx.amount.startsWith('+') ? 'text-green-500' : 'text-gray-900'
              }`}>
                {tx.amount}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SecuritySection() {
  const features = [
    'Bank-Level Encryption',
    'Device-Level Authentication',
    'Ledger-Based Verification',
    'Safe, Compliant, Secure',
  ];

  return (
    <section className="relative py-32 bg-gradient-to-b from-[#FAFBFF] via-white to-[#F8F9FC] overflow-hidden">
      <div className="relative max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative order-2 lg:order-1"
          >
            <motion.div
              animate={{ 
                boxShadow: [
                  '0 0 60px rgba(147, 51, 234, 0.1)',
                  '0 0 100px rgba(147, 51, 234, 0.2)',
                  '0 0 60px rgba(147, 51, 234, 0.1)',
                ]
              }}
              transition={{ duration: 4, repeat: Infinity }}
              className="relative w-64 h-64 mx-auto"
            >
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="absolute inset-0 rounded-full border-2 border-purple-200"
              />
              
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-4 rounded-full border border-dashed border-purple-300"
              />
              
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-12 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 border-2 border-purple-300 flex items-center justify-center"
              >
                <Fingerprint className="w-16 h-16 text-purple-600" />
              </motion.div>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-8 order-1 lg:order-2"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900">
              High-Tech{' '}
              <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
                Gold Security
              </span>
            </h2>
            
            <div className="space-y-4">
              {features.map((feature, i) => (
                <motion.div
                  key={feature}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-4 p-4 rounded-xl bg-white border border-gray-100 shadow-md"
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-purple-100 to-pink-100 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-purple-600" />
                  </div>
                  <span className="text-gray-900 font-medium">{feature}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function FinaPayCardSection() {
  return (
    <section className="relative py-32 bg-gradient-to-b from-[#F8F9FC] via-white to-[#FAFBFF] overflow-hidden">
      <div className="relative max-w-5xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="space-y-8"
        >
          <span className="inline-block px-4 py-2 rounded-full text-sm font-medium bg-gradient-to-r from-purple-100 to-pink-100 border border-purple-200/50 text-purple-700">
            Coming Soon
          </span>
          
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900">
            A Premium{' '}
            <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
              Gold Card
            </span>{' '}
            Experience
          </h2>

          <motion.div
            initial={{ opacity: 0, rotateY: -20 }}
            whileInView={{ opacity: 1, rotateY: 0 }}
            viewport={{ once: true }}
            className="relative w-80 h-48 mx-auto"
          >
            <motion.div
              animate={{ rotateY: [0, 10, 0, -10, 0] }}
              transition={{ duration: 8, repeat: Infinity }}
              className="relative w-full h-full rounded-2xl overflow-hidden"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-purple-700 to-pink-600 border-2 border-purple-300/40 rounded-2xl">
                <motion.div
                  animate={{ x: ['-200%', '200%'] }}
                  transition={{ duration: 4, repeat: Infinity, repeatDelay: 1 }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
                />
                
                <div className="absolute top-6 left-6">
                  <CreditCard className="w-10 h-10 text-white" />
                </div>
                
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-7 rounded bg-gradient-to-br from-pink-300 to-purple-300" />
                    <span className="text-purple-100 text-sm tracking-widest">•••• •••• •••• 4829</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-purple-200 text-xs">Card Holder</p>
                      <p className="text-white text-sm">FINAPAY PREMIUM</p>
                    </div>
                    <div className="text-right">
                      <p className="text-purple-200 text-xs">Expires</p>
                      <p className="text-white text-sm">12/28</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function FinalCTASection() {
  return (
    <section className="relative py-32 bg-gradient-to-b from-[#FAFBFF] via-white to-[#F8F9FC] overflow-hidden">
      <FloatingParticles count={30} />
      
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.1, 0.25, 0.1] }}
          transition={{ duration: 5, repeat: Infinity }}
          className="w-[700px] h-[700px] rounded-full bg-purple-100/30 blur-[120px]"
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
            Your Gold. Your Wallet.{' '}
            <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
              Instantly Accessible.
            </span>
          </h2>
          
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Empowering global payments backed by your own gold.
          </p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="pt-8"
          >
            <Link href="/finapay" className="group inline-flex items-center gap-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white px-12 py-6 rounded-full text-lg font-semibold hover:from-purple-700 hover:to-pink-600 transition-all shadow-lg shadow-purple-500/30">
              Open FinaPay Wallet
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}


export default function FinaPayLanding() {
  return (
    <ModeProvider>
      <div className="finapay-landing min-h-screen bg-gradient-to-b from-[#FAFBFF] via-white to-[#F8F9FC] text-gray-900" data-testid="finapay-landing">
        <style>{`
          .finapay-landing {
            --purple-deep: #8A2BE2;
            --purple-magenta: #FF2FBF;
            --purple-light: #A342FF;
            --purple-violet: #4B0082;
            --primary: #8A2BE2;
            --primary-foreground: #ffffff;
            --ring: #8A2BE2;
            --accent: #9333EA;
            --accent-foreground: #ffffff;
            --muted: #F8F9FC;
            --muted-foreground: rgba(75,85,99,0.7);
            --input: #E5E7EB;
            --border: #E5E7EB;
            --background: #FAFBFF;
            --foreground: #111827;
            --card: #ffffff;
            --card-foreground: #111827;
            --popover: #ffffff;
            --popover-foreground: #111827;
          }
        `}</style>
        <Navbar variant="products" />
        <HeroSection />
        <WalletFeaturesSection />
        <WalletPhoneMockupSection />
        <GoldCardSection />
        <FinalCTASection />
        <Footer />
        <FloatingAgentChat />
      </div>
    </ModeProvider>
  );
}
