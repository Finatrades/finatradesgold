import { motion, useInView, AnimatePresence } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import { 
  Shield, Lock, Wallet, ArrowRight, CheckCircle, Fingerprint, 
  Globe, BarChart3, FileCheck, Scan, QrCode, Building2,
  CircleDot, ChevronRight, Sparkles, MapPin
} from 'lucide-react';
import { Link } from 'wouter';
import finatradesLogo from '@/assets/finatrades-logo.png';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import MobileBottomNav from './components/MobileBottomNav';
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

function VaultDoor() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1, delay: 0.5 }}
      className="relative w-80 h-80 mx-auto"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
        className="absolute inset-0 rounded-full border-2 border-purple-300/30"
      />
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 45, repeat: Infinity, ease: 'linear' }}
        className="absolute inset-4 rounded-full border border-purple-400/40"
      />
      
      <motion.div
        animate={{ 
          boxShadow: [
            '0 0 30px rgba(147, 51, 234, 0.2)',
            '0 0 60px rgba(147, 51, 234, 0.4)',
            '0 0 30px rgba(147, 51, 234, 0.2)',
          ]
        }}
        transition={{ duration: 3, repeat: Infinity }}
        className="absolute inset-8 rounded-full bg-gradient-to-br from-white to-purple-50 border-4 border-purple-300/50 flex items-center justify-center shadow-xl"
      >
        <motion.div
          animate={{ rotate: [0, 10, 0, -10, 0] }}
          transition={{ duration: 8, repeat: Infinity }}
          className="relative"
        >
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-100 to-pink-50 border-2 border-purple-300 flex items-center justify-center">
            <Lock className="w-12 h-12 text-purple-600" />
          </div>
          
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            className="absolute -inset-4"
          >
            {[0, 60, 120, 180, 240, 300].map((deg) => (
              <div
                key={deg}
                className="absolute w-2 h-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                style={{
                  top: '50%',
                  left: '50%',
                  transform: `rotate(${deg}deg) translateX(70px) translateY(-50%)`,
                }}
              />
            ))}
          </motion.div>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.5, 0] }}
        transition={{ duration: 3, repeat: Infinity, delay: 1 }}
        className="absolute inset-0 rounded-full"
        style={{
          background: 'conic-gradient(from 0deg, transparent, rgba(147, 51, 234, 0.3), transparent)',
        }}
      />
    </motion.div>
  );
}

function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center py-32 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#FAFBFF] via-white to-[#F8F9FC]" />
      <FloatingParticles count={40} />
      
      <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] rounded-full bg-purple-100/30 blur-[150px]" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-pink-100/20 blur-[120px]" />

      <div className="relative z-10 max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-8"
          >
            <div className="flex flex-wrap gap-3">
              {['Swiss-Regulated Custody', 'Physical Gold Storage', 'Real-Time Tracking'].map((badge, i) => (
                <motion.span
                  key={badge}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  className="px-4 py-2 rounded-full text-sm font-medium bg-gradient-to-r from-purple-100 to-pink-100 border border-purple-200/50 text-purple-700"
                >
                  {badge}
                </motion.span>
              ))}
            </div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-5xl md:text-7xl font-bold text-gray-900 leading-tight"
            >
              Fina
              <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
                Vault
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-xl md:text-2xl text-gray-700"
            >
              Your Digital Gold Reserve Vault
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-gray-600 leading-relaxed max-w-xl"
            >
              Store, track, verify and manage physical gold with secure, real-time vaulting technology. 
              Backed by world-class vault providers and fully integrated with your FinaWallet.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex flex-wrap gap-4 pt-4"
            >
              <Link href="/get-started" className="group flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white px-8 py-4 rounded-full text-base font-semibold hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-purple-500/30">
                Open Vault
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="/sign-in" className="flex items-center gap-2 border border-purple-300 text-gray-700 px-8 py-4 rounded-full text-base font-semibold hover:bg-purple-50 hover:border-purple-400 transition-all">
                <FileCheck className="w-5 h-5 text-purple-600" />
                View Certificate
              </Link>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <VaultDoor />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function ValuePillarsSection() {
  const pillars = [
    { 
      icon: Sparkles, 
      title: 'Real Physical Gold Custody', 
      description: 'Every gram is backed by allocated physical gold bars stored in secure vaults.',
      animation: 'rotate'
    },
    { 
      icon: BarChart3, 
      title: 'Digital Ownership Ledger', 
      description: 'Track your holdings in real-time with transparent digital records.',
      animation: 'ticker'
    },
    { 
      icon: Scan, 
      title: 'Assay & Purity Verification', 
      description: 'Each bar undergoes rigorous assay testing with documented purity certification.',
      animation: 'scan'
    },
    { 
      icon: Wallet, 
      title: 'Instant Wallet Integration', 
      description: 'Seamlessly connect your vault holdings to your FinaWallet for transactions.',
      animation: 'fill'
    },
  ];

  return (
    <section className="relative py-32 bg-gradient-to-b from-[#F8F9FC] via-white to-[#FAFBFF] overflow-hidden">
      <div className="relative max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Core Value Pillars</h2>
          <p className="text-gray-600 text-lg">The foundation of secure gold custody</p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {pillars.map((pillar, i) => (
            <motion.div
              key={pillar.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -8, boxShadow: '0 20px 60px rgba(147, 51, 234, 0.15)' }}
              className="relative p-6 rounded-2xl bg-white border border-gray-100 shadow-lg hover:border-purple-200 transition-all group"
            >
              <motion.div
                animate={pillar.animation === 'rotate' ? { rotateY: [0, 360] } : {}}
                transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-100 to-pink-50 flex items-center justify-center mb-4 group-hover:from-purple-200 group-hover:to-pink-100 transition-colors"
              >
                <pillar.icon className="w-8 h-8 text-purple-600" />
              </motion.div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{pillar.title}</h3>
              <p className="text-sm text-gray-600">{pillar.description}</p>
              
              <motion.div
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 + 0.3 }}
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-purple-400/50 to-transparent origin-left"
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CertificateSection() {
  return (
    <section className="relative py-32 bg-gradient-to-b from-[#FAFBFF] via-white to-[#F8F9FC] overflow-hidden">
      <FloatingParticles count={20} />
      
      <div className="relative max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900">
              Full Transparency,{' '}
              <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
                Every Gram Verified
              </span>
            </h2>
            <p className="text-gray-600 text-lg leading-relaxed">
              Real certificates, live batch data, bar numbers, and storage details — all digitally accessible. 
              Every piece of gold in your vault comes with complete documentation.
            </p>
            
            <div className="space-y-4 pt-4">
              {[
                { label: 'Assay Certificate', desc: 'Purity verification from accredited refiners' },
                { label: 'Vault Certificate', desc: 'Proof of secure storage location' },
                { label: 'Serial Numbers', desc: 'Unique bar identification codes' },
                { label: 'QR Verification', desc: 'Instant mobile verification' },
              ].map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-start gap-4"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{item.label}</p>
                    <p className="text-sm text-gray-500">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            <motion.div
              animate={{ y: [0, -10, 0], rotateY: [0, 5, 0] }}
              transition={{ duration: 6, repeat: Infinity }}
              className="relative p-8 rounded-2xl bg-white border border-gray-100 shadow-xl"
            >
              <div className="absolute top-4 right-4">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <QrCode className="w-16 h-16 text-purple-300" />
                </motion.div>
              </div>
              
              <div className="space-y-6">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Certificate ID</p>
                  <p className="text-lg font-mono bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">FV-2024-1234567</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Purity</p>
                    <motion.p
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      className="text-2xl font-bold text-gray-900"
                    >
                      999.9
                    </motion.p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Weight</p>
                    <motion.p
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      className="text-2xl font-bold text-gray-900"
                    >
                      1 KG
                    </motion.p>
                  </div>
                </div>
                
                <div>
                  <p className="text-xs text-gray-500">Serial Number</p>
                  <p className="font-mono text-gray-700">AU-2024-CH-0089321</p>
                </div>
                
                <div>
                  <p className="text-xs text-gray-500">Vault Location</p>
                  <p className="text-gray-700">Geneva Secure Vault</p>
                </div>
                
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">Verified & Secured</span>
                  </div>
                </div>
              </div>
            </motion.div>
            
            <motion.div
              animate={{ y: [0, 10, 0], rotateY: [0, -3, 0] }}
              transition={{ duration: 5, repeat: Infinity, delay: 0.5 }}
              className="absolute -bottom-6 -right-6 w-48 h-32 rounded-xl bg-white border border-gray-100 shadow-lg p-4"
            >
              <p className="text-xs text-gray-500">Assay Report</p>
              <p className="text-sm text-gray-900 mt-1">LBMA Certified</p>
              <div className="mt-2 h-1 bg-purple-100 rounded-full overflow-hidden">
                <motion.div
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="h-full w-1/2 bg-gradient-to-r from-purple-500 to-pink-500"
                />
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function VaultOperationsSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const [activeStep, setActiveStep] = useState(-1);

  const steps = [
    { icon: Sparkles, title: 'Deposit Gold', description: 'Gold bar slides into vault tray.' },
    { icon: Scan, title: 'Verification & Assay', description: 'Scanner line moves across bar.' },
    { icon: FileCheck, title: 'Ledger Recording', description: 'Digital record appears with glowing checkmark.' },
    { icon: Wallet, title: 'Gold Added to FinaWallet', description: 'Wallet icon fills with gold particles.' },
  ];

  useEffect(() => {
    if (isInView && activeStep < steps.length - 1) {
      const timer = setTimeout(() => {
        setActiveStep(prev => prev + 1);
      }, activeStep === -1 ? 500 : 800);
      return () => clearTimeout(timer);
    }
  }, [isInView, activeStep, steps.length]);

  return (
    <section className="relative py-32 bg-gradient-to-b from-[#F8F9FC] via-white to-[#FAFBFF] overflow-hidden">
      <div ref={ref} className="relative max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Vault Operations</h2>
          <p className="text-gray-600 text-lg">A seamless 4-step vaulting process</p>
        </motion.div>

        <div className="relative">
          <div className="absolute top-1/2 left-0 right-0 h-1 -translate-y-1/2 hidden md:block">
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: isInView ? 1 : 0 }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-purple-200 via-purple-500 to-pink-300 origin-left"
            />
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {steps.map((step, i) => {
              const isActive = activeStep === i;
              const isCompleted = activeStep > i;

              return (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: isActive || isCompleted ? 1 : 0.4, y: 0 }}
                  transition={{ duration: 0.5, delay: i * 0.15 }}
                  className="relative text-center"
                >
                  <motion.div
                    animate={{
                      scale: isActive ? [1, 1.1, 1] : 1,
                      boxShadow: isActive 
                        ? ['0 0 0 0 rgba(147, 51, 234, 0)', '0 0 40px 15px rgba(147, 51, 234, 0.3)', '0 0 20px 5px rgba(147, 51, 234, 0.2)']
                        : '0 0 0 0 rgba(147, 51, 234, 0)',
                    }}
                    transition={{ duration: 1, repeat: isActive ? Infinity : 0, repeatDelay: 1 }}
                    className={`relative z-10 w-20 h-20 mx-auto rounded-full flex items-center justify-center transition-all duration-500 ${
                      isActive || isCompleted
                        ? 'bg-gradient-to-br from-purple-100 to-pink-100 border-2 border-purple-500'
                        : 'bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <step.icon className={`w-8 h-8 transition-colors ${
                      isActive || isCompleted ? 'text-purple-600' : 'text-gray-400'
                    }`} />
                    
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: isCompleted ? 1 : 0 }}
                      className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center"
                    >
                      <CheckCircle className="w-4 h-4 text-white" />
                    </motion.div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: isActive || isCompleted ? 1 : 0.5, y: 0 }}
                    transition={{ delay: i * 0.15 + 0.2 }}
                    className="mt-6"
                  >
                    <span className={`text-xs font-bold ${isActive ? 'text-purple-600' : 'text-gray-400'}`}>
                      Step {i + 1}
                    </span>
                    <h3 className={`text-lg font-semibold mt-1 ${isActive || isCompleted ? 'text-gray-900' : 'text-gray-500'}`}>
                      {step.title}
                    </h3>
                    <p className={`text-sm mt-2 ${isActive ? 'text-gray-600' : 'text-gray-400'}`}>
                      {step.description}
                    </p>
                  </motion.div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function SecuritySection() {
  const features = [
    { icon: Lock, title: 'Secure Physical Vaults' },
    { icon: Shield, title: 'Tamper-Proof Digital Ledger' },
    { icon: Fingerprint, title: 'Multi-Layer Encryption' },
    { icon: FileCheck, title: 'Compliance-Ready Architecture' },
  ];

  return (
    <section className="relative py-32 bg-gradient-to-b from-[#FAFBFF] via-white to-[#F8F9FC] overflow-hidden">
      <div className="relative max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative"
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
              className="relative w-64 h-64 mx-auto rounded-full bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 flex items-center justify-center"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-4 rounded-full border border-dashed border-purple-300"
              />
              
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 border-2 border-purple-400 flex items-center justify-center"
              >
                <Shield className="w-16 h-16 text-purple-600" />
              </motion.div>
              
              {features.map((f, i) => (
                <motion.div
                  key={f.title}
                  animate={{ 
                    opacity: [0.5, 1, 0.5],
                    scale: [0.9, 1, 0.9],
                  }}
                  transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}
                  className="absolute w-12 h-12 rounded-full bg-white shadow-md border border-purple-200 flex items-center justify-center"
                  style={{
                    top: `${50 + 45 * Math.sin((i * Math.PI * 2) / 4)}%`,
                    left: `${50 + 45 * Math.cos((i * Math.PI * 2) / 4)}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <f.icon className="w-5 h-5 text-purple-600" />
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900">
              Bank-Grade{' '}
              <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
                Security
              </span>
            </h2>
            <p className="text-gray-600 text-lg">
              Your gold is protected by multiple layers of physical and digital security measures.
            </p>
            
            <div className="grid sm:grid-cols-2 gap-4">
              {features.map((feature, i) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-3 p-4 rounded-xl bg-white border border-gray-100 shadow-lg hover:border-purple-200 transition-all"
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                    <feature.icon className="w-5 h-5 text-purple-600" />
                  </div>
                  <span className="text-gray-900 font-medium">{feature.title}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function GlobalNetworkSection() {
  const locations = [
    { name: 'Dubai Vault', position: { top: '45%', left: '58%' } },
    { name: 'Geneva Vault', position: { top: '35%', left: '48%' } },
    { name: 'Singapore Hub', position: { top: '55%', left: '75%' } },
    { name: 'Mauritania Mine', position: { top: '48%', left: '42%' } },
  ];

  return (
    <section className="relative py-32 bg-gradient-to-b from-[#F8F9FC] via-white to-[#FAFBFF] overflow-hidden">
      <div className="relative max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">A Global Network for Gold Storage</h2>
          <p className="text-gray-600 text-lg">Secure vault locations worldwide</p>
        </motion.div>

        <div className="relative aspect-[2/1] rounded-2xl bg-white border border-gray-100 shadow-lg overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, rgba(147, 51, 234, 0.2) 1px, transparent 0)`,
              backgroundSize: '40px 40px',
            }} />
          </div>
          
          {locations.map((loc, i) => (
            <motion.div
              key={loc.name}
              initial={{ opacity: 0, scale: 0 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.2 }}
              className="absolute"
              style={loc.position}
            >
              <motion.div
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                className="absolute inset-0 w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-300/50"
              />
              <div className="relative w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg shadow-purple-500/50">
                <MapPin className="absolute -top-6 left-1/2 -translate-x-1/2 w-4 h-4 text-purple-600" />
              </div>
              <div className="absolute top-4 left-1/2 -translate-x-1/2 whitespace-nowrap">
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-white shadow-md border border-purple-200 text-purple-700">
                  {loc.name}
                </span>
              </div>
            </motion.div>
          ))}
          
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <motion.line
              x1="48%" y1="35%" x2="58%" y2="45%"
              stroke="rgb(147, 51, 234)" strokeWidth="1" strokeOpacity="0.3"
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              transition={{ duration: 1, delay: 0.5 }}
            />
            <motion.line
              x1="58%" y1="45%" x2="75%" y2="55%"
              stroke="rgb(147, 51, 234)" strokeWidth="1" strokeOpacity="0.3"
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              transition={{ duration: 1, delay: 0.7 }}
            />
            <motion.line
              x1="42%" y1="48%" x2="48%" y2="35%"
              stroke="rgb(147, 51, 234)" strokeWidth="1" strokeOpacity="0.3"
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              transition={{ duration: 1, delay: 0.9 }}
            />
          </svg>
        </div>
      </div>
    </section>
  );
}

function LiveBalanceSection() {
  const [balance, setBalance] = useState(0);
  const targetBalance = 1234.5678;

  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const increment = targetBalance / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= targetBalance) {
        setBalance(targetBalance);
        clearInterval(timer);
      } else {
        setBalance(current);
      }
    }, duration / steps);
    
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative py-32 bg-gradient-to-b from-[#FAFBFF] via-white to-[#F8F9FC] overflow-hidden">
      <div className="relative max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Real-Time Gold Balance</h2>
          <p className="text-gray-600 text-lg">Track your holdings with precision</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="p-8 rounded-2xl bg-white border border-gray-100 shadow-xl"
        >
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center md:text-left">
              <p className="text-sm text-gray-500 mb-2">Your Gold Storage</p>
              <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent font-mono">
                {balance.toFixed(4)}
              </div>
              <p className="text-gray-500 mt-1">Grams</p>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-2">Estimated Value</p>
              <div className="text-3xl font-bold text-gray-900">
                ${(balance * 85.23).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-green-600 text-sm mt-1">+2.34% today</p>
            </div>
            
            <div className="text-center md:text-right">
              <p className="text-sm text-gray-500 mb-2">Total Bars</p>
              <div className="text-3xl font-bold text-gray-900">3</div>
              <p className="text-gray-500 mt-1">Stored in vaults</p>
            </div>
          </div>
          
          <div className="mt-8 h-32 rounded-xl bg-gray-50 p-4">
            <div className="flex items-end justify-between h-full gap-2">
              {[40, 55, 45, 60, 50, 70, 65, 80, 75, 90, 85, 95].map((h, i) => (
                <motion.div
                  key={i}
                  initial={{ height: 0 }}
                  whileInView={{ height: `${h}%` }}
                  transition={{ delay: i * 0.05, duration: 0.5 }}
                  className="flex-1 bg-gradient-to-t from-purple-400 to-pink-400 rounded-t"
                />
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function IntegrationSection() {
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
            FinaVault → FinaPay Integration
          </h2>
          <p className="text-gray-600 text-lg">Deposit physical gold → Instantly usable in your wallet</p>
        </motion.div>

        <div className="flex flex-col md:flex-row items-center justify-center gap-8">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="w-40 h-40 rounded-2xl bg-white border border-gray-100 shadow-lg hover:border-purple-200 flex flex-col items-center justify-center transition-all"
          >
            <Lock className="w-12 h-12 text-purple-600 mb-2" />
            <span className="text-gray-900 font-semibold">FinaVault</span>
          </motion.div>

          <div className="relative w-32 h-8 md:w-48 md:h-8">
            <motion.div
              animate={{ x: [0, 20, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <ChevronRight className="w-8 h-8 text-purple-500" />
            </motion.div>
            <motion.div
              animate={{ scaleX: [0.5, 1, 0.5], opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-y-0 left-0 right-0 my-auto h-0.5 bg-gradient-to-r from-transparent via-purple-500 to-transparent"
            />
            
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ x: ['-50%', '150%'], opacity: [0, 1, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
                className="absolute top-1/2 left-0 w-2 h-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 -translate-y-1/2"
              />
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="w-40 h-40 rounded-2xl bg-white border border-gray-100 shadow-lg hover:border-purple-200 flex flex-col items-center justify-center transition-all"
          >
            <Wallet className="w-12 h-12 text-purple-600 mb-2" />
            <span className="text-gray-900 font-semibold">FinaPay</span>
          </motion.div>
        </div>
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
            Secure Your Gold with{' '}
            <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
              Confidence
            </span>
          </h2>
          
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Manage physical gold on the world's most advanced digital vaulting platform.
          </p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="pt-8"
          >
            <Link href="/get-started" className="group inline-flex items-center gap-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white px-12 py-6 rounded-full text-lg font-semibold hover:opacity-90 transition-all shadow-lg shadow-purple-500/30">
              Open Your Vault
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}


export default function FinaVaultLanding() {
  return (
    <ModeProvider>
      <div className="finavault-landing min-h-screen bg-gradient-to-b from-[#FAFBFF] via-white to-[#F8F9FC] text-gray-900" data-testid="finavault-landing">
        <style>{`
          .finavault-landing {
            --purple-deep: #8A2BE2;
            --purple-magenta: #FF2FBF;
            --purple-light: #A342FF;
            --purple-violet: #4B0082;
            --pink-500: #EC4899;
            --primary: #8A2BE2;
            --primary-foreground: #ffffff;
            --ring: #8A2BE2;
            --accent: #EC4899;
            --accent-foreground: #ffffff;
            --muted: #F3F4F6;
            --muted-foreground: rgba(107, 114, 128, 1);
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
        <ValuePillarsSection />
        <CertificateSection />
        <VaultOperationsSection />
        <SecuritySection />
        <GlobalNetworkSection />
        <LiveBalanceSection />
        <IntegrationSection />
        <FinalCTASection />
        <Footer />
        <FloatingAgentChat />
        <MobileBottomNav />
        <div className="lg:hidden h-16" />
      </div>
    </ModeProvider>
  );
}
