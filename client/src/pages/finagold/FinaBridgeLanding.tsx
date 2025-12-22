import { motion, useInView } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import { 
  Globe, FileText, Shield, ArrowRight, CheckCircle, Users, 
  Ship, Package, Coins, Lock, Zap, MessageSquare, MapPin,
  FileCheck, RefreshCw, Eye, Building2, ChevronRight
} from 'lucide-react';
import { Link } from 'wouter';
import finatradesLogo from '@/assets/finatrades-logo.png';
import Navbar from './components/Navbar';
import { ModeProvider } from './context/ModeContext';

const GOLD_COLOR = '#EAC26B';

function FloatingParticles({ count = 30 }: { count?: number }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full"
          style={{ backgroundColor: `${GOLD_COLOR}40` }}
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

function AnimatedBridge() {
  return (
    <div className="relative w-full h-64 overflow-hidden">
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 150" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="bridgeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={GOLD_COLOR} stopOpacity="0" />
            <stop offset="50%" stopColor={GOLD_COLOR} stopOpacity="1" />
            <stop offset="100%" stopColor={GOLD_COLOR} stopOpacity="0" />
          </linearGradient>
          <filter id="bridgeGlow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        
        <motion.path
          d="M 0 120 Q 100 40, 200 75 T 400 120"
          fill="none"
          stroke="url(#bridgeGradient)"
          strokeWidth="3"
          filter="url(#bridgeGlow)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, ease: 'easeOut' }}
        />
        
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.circle
            key={i}
            r="4"
            fill={GOLD_COLOR}
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0, 1, 1, 0],
              cx: [50 + i * 80, 350],
              cy: [120 - Math.sin((i * 80) / 100) * 60, 120],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              delay: i * 0.5,
              ease: 'linear',
            }}
          />
        ))}
        
        <motion.circle cx="50" cy="120" r="8" fill={GOLD_COLOR} opacity="0.5"
          animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <motion.circle cx="350" cy="120" r="8" fill={GOLD_COLOR} opacity="0.5"
          animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, delay: 1 }}
        />
      </svg>
      
      <div className="absolute left-4 bottom-4 flex items-center gap-2">
        <Building2 className="w-6 h-6 text-[#EAC26B]" />
        <span className="text-xs text-gray-400">Exporter</span>
      </div>
      <div className="absolute right-4 bottom-4 flex items-center gap-2">
        <span className="text-xs text-gray-400">Importer</span>
        <Building2 className="w-6 h-6 text-[#EAC26B]" />
      </div>
    </div>
  );
}

function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center py-32 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-[#0a0a0a] to-black" />
      <FloatingParticles count={50} />
      
      <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full bg-[#EAC26B]/5 blur-[180px]" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-[#EAC26B]/5 blur-[150px]" />

      <div className="relative z-10 max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center space-y-8"
        >
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {['Cross-Border Trade', 'Gold-Backed Settlement', 'Real-Time Tracking'].map((badge, i) => (
              <motion.span
                key={badge}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="px-4 py-2 rounded-full text-sm font-medium bg-[#EAC26B]/10 border border-[#EAC26B]/30 text-[#EAC26B]"
              >
                {badge}
              </motion.span>
            ))}
          </div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-5xl md:text-7xl font-bold text-white leading-tight"
          >
            Fina
            <span className="bg-gradient-to-r from-[#EAC26B] to-[#d4af5a] bg-clip-text text-transparent">
              Bridge
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-xl md:text-2xl text-gray-300"
          >
            Global Trade Financing, Simplified
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-gray-400 max-w-3xl mx-auto leading-relaxed"
          >
            A futuristic trade finance platform that connects importers and exporters, enabling gold-backed 
            settlements, secure document flows, and real-time tracking across global routes.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-wrap justify-center gap-4 pt-8"
          >
            <Link href="/finabridge">
              <motion.a
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="group flex items-center gap-2 bg-[#EAC26B] text-black px-8 py-4 rounded-full text-base font-semibold hover:bg-[#d4af5a] transition-all shadow-lg shadow-[#EAC26B]/30"
              >
                Start a Trade Deal
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </motion.a>
            </Link>
            <a
              href="#features"
              className="flex items-center gap-2 border border-[#EAC26B]/40 text-white px-8 py-4 rounded-full text-base font-semibold hover:bg-white/5 hover:border-[#EAC26B]/60 transition-all"
            >
              <Eye className="w-5 h-5" />
              Watch Demo
            </a>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 1 }}
          className="mt-16"
        >
          <AnimatedBridge />
        </motion.div>
      </div>
    </section>
  );
}

function ValuePillarsSection() {
  const pillars = [
    { 
      icon: RefreshCw, 
      title: 'End-to-End Trade Lifecycle', 
      description: 'Manage every stage from deal initiation to final settlement.',
    },
    { 
      icon: Coins, 
      title: 'Gold-Backed Settlement Option', 
      description: 'Settle trades using secure, vault-backed gold value.',
    },
    { 
      icon: FileText, 
      title: 'Smart Document Infrastructure', 
      description: 'Automated document flows with real-time verification.',
    },
    { 
      icon: Users, 
      title: 'Buyer–Seller Deal Room', 
      description: 'Secure collaborative space for trade negotiations.',
    },
  ];

  return (
    <section className="relative py-32 bg-gradient-to-b from-black via-[#050505] to-black overflow-hidden">
      <div className="relative max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Value Pillars</h2>
          <p className="text-gray-400 text-lg">The foundation of modern trade finance</p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {pillars.map((pillar, i) => (
            <motion.div
              key={pillar.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -8, boxShadow: '0 20px 60px rgba(234, 194, 107, 0.15)' }}
              className="relative p-6 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-[#EAC26B]/40 transition-all group"
            >
              <motion.div
                animate={{ rotate: [0, 5, 0, -5, 0] }}
                transition={{ duration: 4, repeat: Infinity, delay: i * 0.5 }}
                className="w-16 h-16 rounded-xl bg-[#EAC26B]/10 flex items-center justify-center mb-4 group-hover:bg-[#EAC26B]/20 transition-colors"
              >
                <pillar.icon className="w-8 h-8 text-[#EAC26B]" />
              </motion.div>
              <h3 className="text-lg font-semibold text-white mb-2">{pillar.title}</h3>
              <p className="text-sm text-gray-400">{pillar.description}</p>
              
              <motion.div
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 + 0.3 }}
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#EAC26B]/50 to-transparent origin-left"
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesShowcaseSection() {
  const features = [
    { icon: Globe, title: 'Real-Time Shipment Tracking', description: 'Monitor your cargo across global trade routes.' },
    { icon: FileCheck, title: 'Document Approval Timeline', description: 'Track approval status for all trade documents.' },
    { icon: Coins, title: 'Gold Settlement Toggle', description: 'Switch between fiat and gold-backed settlements.' },
    { icon: Lock, title: 'Escrow Release Control', description: 'Secure fund release upon milestone completion.' },
    { icon: MessageSquare, title: 'Integrated Deal Chat', description: 'Communicate directly within each trade.' },
  ];

  return (
    <section id="features" className="relative py-32 bg-black overflow-hidden">
      <FloatingParticles count={20} />
      
      <div className="relative max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Platform Features</h2>
          <p className="text-gray-400 text-lg">Powerful tools for global trade operations</p>
        </motion.div>

        <div className="space-y-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, x: i % 2 === 0 ? -50 : 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`flex items-center gap-8 ${i % 2 === 1 ? 'flex-row-reverse' : ''}`}
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="flex-1 p-8 rounded-2xl bg-gradient-to-br from-white/[0.03] to-transparent border border-white/10 hover:border-[#EAC26B]/30 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-[#EAC26B]/10 flex items-center justify-center shrink-0">
                    <feature.icon className="w-7 h-7 text-[#EAC26B]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                    <p className="text-gray-400">{feature.description}</p>
                  </div>
                </div>
              </motion.div>
              
              <div className="hidden lg:block w-32">
                <motion.div
                  animate={{ x: i % 2 === 0 ? [0, 10, 0] : [0, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="flex items-center justify-center"
                >
                  <ChevronRight className={`w-8 h-8 text-[#EAC26B]/50 ${i % 2 === 1 ? 'rotate-180' : ''}`} />
                </motion.div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DealRoomSection() {
  return (
    <section className="relative py-32 bg-gradient-to-b from-black via-[#050505] to-black overflow-hidden">
      <div className="relative max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">The Deal Room</h2>
          <p className="text-gray-400 text-lg">Where buyers and sellers connect securely</p>
        </motion.div>

        <div className="relative flex flex-col lg:flex-row items-center justify-center gap-8">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="w-full lg:w-64 p-6 rounded-2xl bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/30"
          >
            <div className="flex items-center gap-3 mb-4">
              <Building2 className="w-8 h-8 text-blue-400" />
              <span className="text-white font-semibold">Buyer Panel</span>
            </div>
            <div className="space-y-3">
              {['Purchase Order', 'Payment Terms', 'Delivery Schedule'].map((item, i) => (
                <motion.div
                  key={item}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="flex items-center gap-2 text-sm text-gray-400"
                >
                  <CheckCircle className="w-4 h-4 text-blue-400" />
                  {item}
                </motion.div>
              ))}
            </div>
          </motion.div>

          <div className="relative flex-1 max-w-xs">
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="space-y-4"
            >
              {['Invoice', 'Bill of Lading', 'Inspection Report'].map((doc, i) => (
                <motion.div
                  key={doc}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + i * 0.15 }}
                  className="p-4 rounded-xl bg-white/[0.03] border border-[#EAC26B]/20 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-[#EAC26B]" />
                    <span className="text-white text-sm">{doc}</span>
                  </div>
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.3 }}
                  >
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  </motion.div>
                </motion.div>
              ))}
            </motion.div>
            
            <div className="absolute top-1/2 left-0 right-0 -z-10">
              <motion.div
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="h-px bg-gradient-to-r from-blue-500/50 via-[#EAC26B] to-green-500/50"
              />
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="w-full lg:w-64 p-6 rounded-2xl bg-gradient-to-br from-green-500/10 to-transparent border border-green-500/30"
          >
            <div className="flex items-center gap-3 mb-4">
              <Building2 className="w-8 h-8 text-green-400" />
              <span className="text-white font-semibold">Seller Panel</span>
            </div>
            <div className="space-y-3">
              {['Proforma Invoice', 'Shipping Details', 'Bank Info'].map((item, i) => (
                <motion.div
                  key={item}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="flex items-center gap-2 text-sm text-gray-400"
                >
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  {item}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function GlobalTradeMapSection() {
  const hubs = [
    { name: 'London', position: { top: '30%', left: '45%' } },
    { name: 'Dubai', position: { top: '45%', left: '58%' } },
    { name: 'Geneva', position: { top: '35%', left: '48%' } },
    { name: 'Mumbai', position: { top: '50%', left: '65%' } },
    { name: 'Singapore', position: { top: '58%', left: '75%' } },
  ];

  return (
    <section className="relative py-32 bg-black overflow-hidden">
      <div className="relative max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Global Trade Routes</h2>
          <p className="text-gray-400 text-lg">Connected hubs across major trading centers</p>
        </motion.div>

        <div className="relative aspect-[2/1] rounded-2xl bg-white/[0.02] border border-white/10 overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, ${GOLD_COLOR}20 1px, transparent 0)`,
              backgroundSize: '30px 30px',
            }} />
          </div>
          
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {[[45, 30, 48, 35], [48, 35, 58, 45], [58, 45, 65, 50], [65, 50, 75, 58]].map(([x1, y1, x2, y2], i) => (
              <motion.line
                key={i}
                x1={`${x1}%`} y1={`${y1}%`} x2={`${x2}%`} y2={`${y2}%`}
                stroke={GOLD_COLOR} strokeWidth="2" strokeOpacity="0.4"
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
                className="absolute inset-0 w-6 h-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#EAC26B]/20"
              />
              <div className="relative w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#EAC26B] shadow-lg shadow-[#EAC26B]/50">
                <Ship className="absolute -top-6 left-1/2 -translate-x-1/2 w-4 h-4 text-[#EAC26B]" />
              </div>
              <div className="absolute top-4 left-1/2 -translate-x-1/2 whitespace-nowrap">
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-black/70 border border-[#EAC26B]/30 text-[#EAC26B]">
                  {hub.name}
                </span>
              </div>
            </motion.div>
          ))}
          
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-[#EAC26B]"
              style={{ top: '40%', left: '45%' }}
              animate={{
                left: ['45%', '75%'],
                top: ['30%', '58%'],
                opacity: [0, 1, 1, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                delay: i * 1.3,
                ease: 'linear',
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function DocumentManagementSection() {
  const documents = [
    { name: 'Invoice', status: 'Verified' },
    { name: 'Purchase Order', status: 'Pending' },
    { name: 'Bill of Lading', status: 'Verified' },
    { name: 'Inspection Report', status: 'Verified' },
  ];

  return (
    <section className="relative py-32 bg-gradient-to-b from-black via-[#050505] to-black overflow-hidden">
      <FloatingParticles count={15} />
      
      <div className="relative max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white">
              Automated, Verifiable &{' '}
              <span className="bg-gradient-to-r from-[#EAC26B] to-[#d4af5a] bg-clip-text text-transparent">
                Secure
              </span>
            </h2>
            <p className="text-gray-400 text-lg leading-relaxed">
              Track every invoice, PO, BL, and inspection report with instant validation. 
              All documents are securely stored and instantly verifiable.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            {documents.map((doc, i) => (
              <motion.div
                key={doc.name}
                initial={{ opacity: 0, y: 20, rotateX: -10 }}
                whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -4, rotateY: 3 }}
                className="p-5 rounded-xl bg-white/[0.02] border border-white/10 hover:border-[#EAC26B]/30 transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-[#EAC26B]/10 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-[#EAC26B]" />
                  </div>
                  <span className="text-white font-medium">{doc.name}</span>
                </div>
                <motion.div
                  animate={doc.status === 'Verified' ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                  className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                    doc.status === 'Verified' 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}
                >
                  <CheckCircle className="w-4 h-4" />
                  {doc.status}
                </motion.div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function SecuritySection() {
  const features = [
    'Bank-level encryption',
    'Vault-backed settlement',
    'Immutable audit trail',
    'Enterprise-grade compliance',
  ];

  return (
    <section className="relative py-32 bg-black overflow-hidden">
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
                  '0 0 60px rgba(234, 194, 107, 0.1)',
                  '0 0 100px rgba(234, 194, 107, 0.2)',
                  '0 0 60px rgba(234, 194, 107, 0.1)',
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
                className="absolute inset-0 rounded-full border-2 border-[#EAC26B]/30"
              />
              
              {Array.from({ length: 20 }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ 
                    opacity: [0, 1, 0],
                    scale: [0.5, 1, 0.5],
                    x: [0, Math.cos(i * 18 * Math.PI / 180) * 80],
                    y: [0, Math.sin(i * 18 * Math.PI / 180) * 80],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    delay: i * 0.15,
                  }}
                  className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full bg-[#EAC26B]"
                  style={{ transform: 'translate(-50%, -50%)' }}
                />
              ))}
              
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-8 rounded-full bg-[#EAC26B]/10 border-2 border-[#EAC26B]/50 flex items-center justify-center"
              >
                <Shield className="w-20 h-20 text-[#EAC26B]" />
              </motion.div>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-8 order-1 lg:order-2"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white">
              Enterprise-Grade{' '}
              <span className="bg-gradient-to-r from-[#EAC26B] to-[#d4af5a] bg-clip-text text-transparent">
                Security
              </span>
            </h2>
            <p className="text-gray-400 text-lg">
              Your trade data is protected by multiple layers of security and compliance measures.
            </p>
            
            <div className="space-y-4">
              {features.map((feature, i) => (
                <motion.div
                  key={feature}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/10"
                >
                  <div className="w-10 h-10 rounded-lg bg-[#EAC26B]/10 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-[#EAC26B]" />
                  </div>
                  <span className="text-white font-medium">{feature}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function GoldSettlementSection() {
  return (
    <section className="relative py-32 bg-gradient-to-b from-black via-[#050505] to-black overflow-hidden">
      <div className="relative max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Settle Faster with{' '}
            <span className="bg-gradient-to-r from-[#EAC26B] to-[#d4af5a] bg-clip-text text-transparent">
              Gold
            </span>
          </h2>
          <p className="text-gray-400 text-lg">Unlock liquidity with secure, instant gold-based settlement</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="p-8 rounded-2xl bg-gradient-to-br from-[#EAC26B]/10 to-transparent border border-[#EAC26B]/30"
        >
          <div className="grid md:grid-cols-3 gap-8 items-center">
            <div className="text-center">
              <motion.div
                animate={{ rotateY: [0, 360] }}
                transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                className="w-24 h-24 mx-auto mb-4 rounded-xl bg-gradient-to-br from-[#EAC26B] via-[#d4af5a] to-[#b8963f] flex items-center justify-center shadow-xl shadow-[#EAC26B]/30"
              >
                <Coins className="w-12 h-12 text-black" />
              </motion.div>
              <p className="text-white font-semibold">Gold-Backed Value</p>
            </div>
            
            <div className="flex flex-col items-center gap-4">
              <motion.div
                animate={{ x: [0, 20, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="flex items-center gap-2"
              >
                <div className="w-16 h-px bg-gradient-to-r from-transparent to-[#EAC26B]" />
                <Zap className="w-6 h-6 text-[#EAC26B]" />
                <div className="w-16 h-px bg-gradient-to-r from-[#EAC26B] to-transparent" />
              </motion.div>
              <p className="text-gray-400 text-sm">Instant Settlement</p>
            </div>
            
            <div className="text-center">
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-24 h-24 mx-auto mb-4 rounded-xl bg-green-500/20 border-2 border-green-500/50 flex items-center justify-center"
              >
                <CheckCircle className="w-12 h-12 text-green-400" />
              </motion.div>
              <p className="text-white font-semibold">Deal Completed</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function FinalCTASection() {
  return (
    <section className="relative py-32 bg-black overflow-hidden">
      <FloatingParticles count={30} />
      
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.1, 0.25, 0.1] }}
          transition={{ duration: 5, repeat: Infinity }}
          className="w-[700px] h-[700px] rounded-full bg-[#EAC26B]/10 blur-[120px]"
        />
      </div>

      <div className="relative max-w-4xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="space-y-8"
        >
          <h2 className="text-4xl md:text-6xl font-bold text-white">
            Start Your First Global{' '}
            <span className="bg-gradient-to-r from-[#EAC26B] to-[#d4af5a] bg-clip-text text-transparent">
              Trade Deal
            </span>
          </h2>
          
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Execute cross-border transactions with complete confidence.
          </p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="pt-8"
          >
            <Link href="/finabridge">
              <motion.a
                animate={{ boxShadow: ['0 0 0 0 rgba(234, 194, 107, 0)', '0 0 50px 15px rgba(234, 194, 107, 0.25)', '0 0 0 0 rgba(234, 194, 107, 0)'] }}
                transition={{ duration: 2.5, repeat: Infinity }}
                className="group inline-flex items-center gap-3 bg-[#EAC26B] text-black px-12 py-6 rounded-full text-lg font-semibold hover:bg-[#d4af5a] transition-all"
              >
                Get Started
                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </motion.a>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="relative py-12 bg-[#050505] border-t border-white/5">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <Link href="/">
            <a>
              <img src={finatradesLogo} alt="Finatrades" className="h-8 w-auto" />
            </a>
          </Link>
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Finatrades. All rights reserved.
          </p>
          <Link href="/">
            <a className="text-sm text-gray-400 hover:text-white transition-colors">
              Back to Home
            </a>
          </Link>
        </div>
      </div>
    </footer>
  );
}

export default function FinaBridgeLanding() {
  return (
    <ModeProvider>
      <div className="min-h-screen bg-black text-white" data-testid="finabridge-landing">
        <Navbar />
        <HeroSection />
        <ValuePillarsSection />
        <FeaturesShowcaseSection />
        <DealRoomSection />
        <GlobalTradeMapSection />
        <DocumentManagementSection />
        <SecuritySection />
        <GoldSettlementSection />
        <FinalCTASection />
        <Footer />
      </div>
    </ModeProvider>
  );
}
