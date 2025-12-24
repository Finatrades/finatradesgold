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
import Footer from './components/Footer';
import { ModeProvider, useMode } from './context/ModeContext';
import FloatingAgentChat from '@/components/FloatingAgentChat';

const PRIMARY_COLOR = '#9333ea';
const PINK_COLOR = '#ec4899';

function FloatingParticles({ count = 30 }: { count?: number }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full"
          style={{ backgroundColor: i % 2 === 0 ? `${PRIMARY_COLOR}40` : `${PINK_COLOR}40` }}
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

function TradeFlowAnimation() {
  return (
    <section className="relative py-24 overflow-hidden bg-gradient-to-b from-[#0D001E] via-[#1a0a30] to-[#0D001E]">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="text-sm font-semibold text-purple-400 uppercase tracking-wider mb-4 block">
            Trade Flow Visualization
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Seamless{' '}
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Global Trade
            </span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Watch how FinaBridge facilitates secure transactions between importers and exporters
          </p>
        </motion.div>

        <div className="relative h-[400px] w-full">
          <svg 
            className="absolute inset-0 w-full h-full" 
            viewBox="0 0 800 300" 
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <linearGradient id="topPathGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#8A2BE2" stopOpacity="0.2" />
                <stop offset="50%" stopColor="#EC4899" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#8A2BE2" stopOpacity="0.2" />
              </linearGradient>
              <linearGradient id="bottomPathGradient" x1="100%" y1="0%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#EC4899" stopOpacity="0.2" />
                <stop offset="50%" stopColor="#8A2BE2" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#EC4899" stopOpacity="0.2" />
              </linearGradient>
              <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FCD34D" />
                <stop offset="50%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#D97706" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="goldGlow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            
            {/* Top curved path - Importer to Exporter (Gold flow) */}
            <motion.path
              d="M 80 150 Q 250 30, 400 70 Q 550 110, 720 150"
              fill="none"
              stroke="url(#topPathGradient)"
              strokeWidth="3"
              filter="url(#glow)"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 2, ease: 'easeOut' }}
            />
            
            {/* Bottom curved path - Exporter to Importer (Ship flow) */}
            <motion.path
              d="M 720 150 Q 550 270, 400 230 Q 250 190, 80 150"
              fill="none"
              stroke="url(#bottomPathGradient)"
              strokeWidth="3"
              filter="url(#glow)"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 2, ease: 'easeOut', delay: 0.5 }}
            />
            
            {/* Animated gold bars moving along top path (Importer -> Exporter) */}
            {[0, 1, 2].map((i) => (
              <motion.g
                key={`gold-${i}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 + i * 0.3 }}
              >
                <motion.g
                  animate={{
                    x: [0, 640],
                    y: [0, -80, -80, 0],
                  }}
                  transition={{
                    duration: 5,
                    repeat: Infinity,
                    delay: i * 1.5,
                    ease: 'linear',
                  }}
                >
                  {/* Gold bar icon */}
                  <motion.rect
                    x="70"
                    y="145"
                    width="24"
                    height="12"
                    rx="2"
                    fill="url(#goldGradient)"
                    filter="url(#goldGlow)"
                    animate={{ opacity: [0, 1, 1, 0] }}
                    transition={{
                      duration: 5,
                      repeat: Infinity,
                      delay: i * 1.5,
                      times: [0, 0.1, 0.9, 1],
                    }}
                  />
                  <motion.rect
                    x="74"
                    y="148"
                    width="16"
                    height="6"
                    rx="1"
                    fill="#FEF3C7"
                    opacity="0.3"
                    animate={{ opacity: [0, 0.3, 0.3, 0] }}
                    transition={{
                      duration: 5,
                      repeat: Infinity,
                      delay: i * 1.5,
                      times: [0, 0.1, 0.9, 1],
                    }}
                  />
                </motion.g>
              </motion.g>
            ))}
            
            {/* Animated ships moving along bottom path (Exporter -> Importer) */}
            {[0, 1, 2].map((i) => (
              <motion.g
                key={`ship-${i}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 + i * 0.3 }}
              >
                <motion.g
                  animate={{
                    x: [0, -640],
                    y: [0, 80, 80, 0],
                  }}
                  transition={{
                    duration: 5,
                    repeat: Infinity,
                    delay: i * 1.5 + 0.5,
                    ease: 'linear',
                  }}
                >
                  {/* Ship icon */}
                  <motion.path
                    d="M 710 145 L 730 145 L 735 155 L 705 155 Z"
                    fill="#60A5FA"
                    filter="url(#glow)"
                    animate={{ opacity: [0, 1, 1, 0] }}
                    transition={{
                      duration: 5,
                      repeat: Infinity,
                      delay: i * 1.5 + 0.5,
                      times: [0, 0.1, 0.9, 1],
                    }}
                  />
                  <motion.path
                    d="M 715 145 L 715 135 L 725 135 L 725 145"
                    fill="none"
                    stroke="#60A5FA"
                    strokeWidth="2"
                    animate={{ opacity: [0, 1, 1, 0] }}
                    transition={{
                      duration: 5,
                      repeat: Infinity,
                      delay: i * 1.5 + 0.5,
                      times: [0, 0.1, 0.9, 1],
                    }}
                  />
                  <motion.rect
                    x="718"
                    y="128"
                    width="10"
                    height="8"
                    fill="#93C5FD"
                    animate={{ opacity: [0, 1, 1, 0] }}
                    transition={{
                      duration: 5,
                      repeat: Infinity,
                      delay: i * 1.5 + 0.5,
                      times: [0, 0.1, 0.9, 1],
                    }}
                  />
                </motion.g>
              </motion.g>
            ))}
            
            {/* Importer node (left) */}
            <motion.g
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <motion.circle
                cx="80"
                cy="150"
                r="35"
                fill="#1a0a30"
                stroke="url(#topPathGradient)"
                strokeWidth="2"
                animate={{ 
                  boxShadow: ['0 0 20px rgba(138, 43, 226, 0.3)', '0 0 40px rgba(138, 43, 226, 0.6)', '0 0 20px rgba(138, 43, 226, 0.3)']
                }}
              />
              <motion.circle
                cx="80"
                cy="150"
                r="38"
                fill="none"
                stroke="#8A2BE2"
                strokeWidth="1"
                opacity="0.3"
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.1, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </motion.g>
            
            {/* FinaBridge hub (center) */}
            <motion.g
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <motion.circle
                cx="400"
                cy="150"
                r="50"
                fill="url(#topPathGradient)"
                opacity="0.2"
              />
              <motion.circle
                cx="400"
                cy="150"
                r="45"
                fill="#1a0a30"
                stroke="url(#topPathGradient)"
                strokeWidth="3"
              />
              <motion.circle
                cx="400"
                cy="150"
                r="55"
                fill="none"
                stroke="url(#topPathGradient)"
                strokeWidth="2"
                opacity="0.5"
                animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.2, 0.5] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
              <motion.circle
                cx="400"
                cy="150"
                r="65"
                fill="none"
                stroke="url(#bottomPathGradient)"
                strokeWidth="1"
                opacity="0.3"
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.1, 0.3] }}
                transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
              />
            </motion.g>
            
            {/* Exporter node (right) */}
            <motion.g
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <motion.circle
                cx="720"
                cy="150"
                r="35"
                fill="#1a0a30"
                stroke="url(#bottomPathGradient)"
                strokeWidth="2"
              />
              <motion.circle
                cx="720"
                cy="150"
                r="38"
                fill="none"
                stroke="#EC4899"
                strokeWidth="1"
                opacity="0.3"
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.1, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, delay: 1 }}
              />
            </motion.g>
          </svg>
          
          {/* Labels */}
          <div className="absolute left-[5%] top-1/2 -translate-y-1/2 text-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 }}
              className="flex flex-col items-center gap-2"
            >
              <div className="w-12 h-12 rounded-xl bg-purple-900/50 border border-purple-500/50 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-purple-400" />
              </div>
              <span className="text-purple-300 text-sm font-medium">Importer</span>
              <span className="text-gray-500 text-xs">Receives Goods</span>
            </motion.div>
          </div>
          
          <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 text-center z-10">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1 }}
              className="flex flex-col items-center gap-2"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
                <Globe className="w-8 h-8 text-white" />
              </div>
              <span className="text-white text-base font-bold">FinaBridge</span>
              <span className="text-gray-400 text-xs">Trade Finance Hub</span>
            </motion.div>
          </div>
          
          <div className="absolute right-[5%] top-1/2 -translate-y-1/2 text-center">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 }}
              className="flex flex-col items-center gap-2"
            >
              <div className="w-12 h-12 rounded-xl bg-pink-900/50 border border-pink-500/50 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-pink-400" />
              </div>
              <span className="text-pink-300 text-sm font-medium">Exporter</span>
              <span className="text-gray-500 text-xs">Ships Goods</span>
            </motion.div>
          </div>
          
          {/* Flow labels */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="absolute top-[15%] left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full bg-amber-900/30 border border-amber-500/30"
          >
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="text-amber-300 text-xs font-medium">Gold Payment Flow</span>
            <ArrowRight className="w-4 h-4 text-amber-400" />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.7 }}
            className="absolute bottom-[15%] left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full bg-blue-900/30 border border-blue-500/30"
          >
            <ArrowRight className="w-4 h-4 text-blue-400 rotate-180" />
            <span className="text-blue-300 text-xs font-medium">Goods Shipment Flow</span>
            <Ship className="w-4 h-4 text-blue-400" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function AnimatedBridge() {
  return (
    <div className="relative w-full h-64 overflow-hidden">
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 150" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="bridgeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={PRIMARY_COLOR} stopOpacity="0" />
            <stop offset="50%" stopColor={PINK_COLOR} stopOpacity="1" />
            <stop offset="100%" stopColor={PRIMARY_COLOR} stopOpacity="0" />
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
            fill={i % 2 === 0 ? PRIMARY_COLOR : PINK_COLOR}
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
        
        <motion.circle cx="50" cy="120" r="8" fill={PRIMARY_COLOR} opacity="0.5"
          animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <motion.circle cx="350" cy="120" r="8" fill={PINK_COLOR} opacity="0.5"
          animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, delay: 1 }}
        />
      </svg>
      
      <div className="absolute left-4 bottom-4 flex items-center gap-2">
        <Building2 className="w-6 h-6 text-purple-600" />
        <span className="text-xs text-gray-500">Exporter</span>
      </div>
      <div className="absolute right-4 bottom-4 flex items-center gap-2">
        <span className="text-xs text-gray-500">Importer</span>
        <Building2 className="w-6 h-6 text-pink-500" />
      </div>
    </div>
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
                <RefreshCw className="w-3 h-3 text-white" />
              </div>
              <span className="text-sm font-medium text-purple-700">FinaBridge Trade Platform</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight"
            >
              Gold-Backed{' '}
              <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
                Trade
              </span>
              <br />
              <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
                Infrastructure
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-lg text-gray-700 font-medium"
            >
              Structured trade support for global importers and exporters
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-gray-600 leading-relaxed max-w-lg"
            >
              Connect buyers and sellers through verified gold-backed value, transparent 
              documentation, and streamlined settlement processes for international 
              trade operations.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-wrap gap-3"
            >
              {[
                { icon: Coins, label: 'Gold-Backed Trade Support' },
                { icon: Globe, label: 'Global Settlement Layer' },
                { icon: FileCheck, label: 'Verified Documentation' },
              ].map((badge, i) => (
                <span
                  key={badge.label}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm bg-white border border-gray-200 text-gray-600"
                >
                  <badge.icon className="w-4 h-4 text-purple-500" />
                  {badge.label}
                </span>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex flex-wrap gap-4 pt-4"
            >
              <Link href="/finabridge" className="group flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white px-8 py-4 rounded-full text-base font-semibold hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-purple-500/30">
                Get Started
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <button className="flex items-center gap-2 border border-purple-300 text-purple-700 px-6 py-4 rounded-full text-base font-semibold hover:bg-purple-50 hover:border-purple-400 transition-all">
                <MessageSquare className="w-5 h-5" />
                Contact Sales
              </button>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="hidden lg:block"
          >
            <div className="relative p-8 rounded-3xl bg-white/80 backdrop-blur-sm border border-gray-200 shadow-xl">
              <div className="absolute -top-3 -right-3 w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center shadow-lg">
                <RefreshCw className="w-8 h-8 text-white" />
              </div>
              
              <div className="flex items-center justify-between gap-6 py-8">
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="flex flex-col items-center gap-2"
                >
                  <div className="px-4 py-2 rounded-lg border-2 border-purple-200 text-purple-600 font-medium text-sm">
                    Import
                  </div>
                </motion.div>
                
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="flex flex-col items-center gap-2"
                >
                  <div className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-500 text-white font-medium text-sm shadow-lg">
                    Bridge
                  </div>
                </motion.div>
                
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                  className="flex flex-col items-center gap-2"
                >
                  <div className="px-4 py-2 rounded-lg border-2 border-pink-200 text-pink-600 font-medium text-sm">
                    Export
                  </div>
                </motion.div>
              </div>

              <div className="absolute bottom-4 left-4 right-4 flex justify-between">
                <motion.div
                  animate={{ x: [-2, 2, -2] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="w-2 h-2 rounded-full bg-purple-300"
                />
                <motion.div
                  animate={{ x: [2, -2, 2] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="w-2 h-2 rounded-full bg-pink-300"
                />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function WhatIsFinaBridgeSection() {
  return (
    <section className="relative py-24 bg-gradient-to-b from-[#F8F9FC] via-white to-[#FAFBFF] overflow-hidden">
      <div className="relative max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <span className="text-sm font-semibold text-purple-600 uppercase tracking-wider">
              Understanding the Platform
            </span>
            
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              What is{' '}
              <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
                FinaBridge
              </span>
              ?
            </h2>
            
            <p className="text-gray-700 leading-relaxed">
              FinaBridge is a <strong>gold-backed trade support module</strong> designed for businesses 
              engaged in international import and export operations.
            </p>
            
            <p className="text-gray-600 leading-relaxed">
              It provides a <strong>stable reference</strong> for real-world trade by using the verified worth 
              of physical gold as an anchor point for contracts, negotiations, and 
              settlements.
            </p>
            
            <p className="text-gray-600 leading-relaxed">
              Unlike traditional trade finance that relies solely on bank letters of credit or 
              advance payments, FinaBridge introduces a <strong>tangible, documented value 
              layer</strong> that both parties can verify and trust.
            </p>
            
            <div className="w-16 h-1 bg-gradient-to-r from-purple-600 to-pink-500 rounded-full" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="hidden lg:block"
          >
            <div className="relative p-8 rounded-3xl bg-white border border-gray-100 shadow-xl">
              <div className="flex items-center justify-between mb-8">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-14 h-14 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center">
                    <Building2 className="w-7 h-7 text-purple-600" />
                  </div>
                  <span className="text-sm font-semibold text-gray-900">Importer</span>
                  <span className="text-xs text-gray-500">Buyer</span>
                </div>
                
                <div className="flex-1 relative mx-4">
                  <svg className="w-full h-16" viewBox="0 0 200 60" preserveAspectRatio="xMidYMid meet">
                    <defs>
                      <linearGradient id="bridgePathGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#9333ea" />
                        <stop offset="50%" stopColor="#ec4899" />
                        <stop offset="100%" stopColor="#9333ea" />
                      </linearGradient>
                    </defs>
                    <motion.path
                      d="M 0 50 Q 50 10, 100 30 Q 150 50, 200 10"
                      fill="none"
                      stroke="url(#bridgePathGradient)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      initial={{ pathLength: 0 }}
                      whileInView={{ pathLength: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.5 }}
                    />
                  </svg>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.8 }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-1 rounded-full bg-purple-100 border border-purple-200 text-xs font-medium text-purple-700"
                  >
                    Worth of Gold
                  </motion.div>
                </div>
                
                <div className="flex flex-col items-center gap-2">
                  <div className="w-14 h-14 rounded-xl bg-pink-100 border border-pink-200 flex items-center justify-center">
                    <Building2 className="w-7 h-7 text-pink-600" />
                  </div>
                  <span className="text-sm font-semibold text-gray-900">Exporter</span>
                  <span className="text-xs text-gray-500">Seller</span>
                </div>
              </div>
              
              <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
                <div className="text-center">
                  <div className="text-purple-600 font-semibold text-sm">Documentation</div>
                  <div className="text-gray-500 text-xs">Verified</div>
                </div>
                <div className="text-center">
                  <div className="text-pink-600 font-semibold text-sm">Value Anchor</div>
                  <div className="text-gray-500 text-xs">Stable</div>
                </div>
                <div className="text-center">
                  <div className="text-purple-600 font-semibold text-sm">Settlement</div>
                  <div className="text-gray-500 text-xs">Trusted</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function WhyUseFinaBridgeSection() {
  const exporterBenefits = [
    { icon: CheckCircle, title: 'Verified Worth of Gold from Buyer', description: 'Confirm the importer has allocated documented gold value before shipment.' },
    { icon: RefreshCw, title: 'Higher Confidence Before Shipment', description: 'Reduce uncertainty by verifying buyer\'s commitment through gold allocation.' },
    { icon: Shield, title: 'Reduced Risk of Non-Payment', description: 'Gold worth acts as a tangible assurance layer against payment defaults.' },
    { icon: Coins, title: 'Stable Value Anchor in Contracts', description: 'Use gold worth as a reference point for stable pricing agreements.' },
  ];

  const importerBenefits = [
    { icon: CheckCircle, title: 'Proof of Ability to Pay', description: 'Demonstrate financial capability through documented gold holdings.' },
    { icon: Coins, title: 'Less Upfront Cash Pressure', description: 'Allocate gold worth instead of tying up operational cash reserves.' },
    { icon: Globe, title: 'Lower Currency Volatility Risk', description: 'Gold value provides stability against fluctuating exchange rates.' },
    { icon: Users, title: 'Better Terms with Sellers', description: 'Negotiate favorable conditions with verified gold-backed assurance.' },
  ];

  return (
    <section className="relative py-24 bg-gradient-to-b from-[#FAFBFF] via-white to-[#F8F9FC] overflow-hidden">
      <div className="relative max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-sm font-semibold text-purple-600 uppercase tracking-wider mb-4 block">
            Trade with Confidence
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            Why Use FinaBridge for{' '}
            <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
              Trade
            </span>
            ?
          </h2>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center">
                <Ship className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">For Exporters</h3>
                <p className="text-sm text-gray-500">Sellers & Shippers</p>
              </div>
            </div>
            
            {exporterBenefits.map((benefit, i) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-4 rounded-xl bg-white border border-gray-100 shadow-sm hover:border-purple-200 hover:shadow-md transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                    <benefit.icon className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm">{benefit.title}</h4>
                    <p className="text-gray-600 text-xs mt-1">{benefit.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">For Importers</h3>
                <p className="text-sm text-gray-500">Buyers & Receivers</p>
              </div>
            </div>
            
            {importerBenefits.map((benefit, i) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-4 rounded-xl bg-white border border-gray-100 shadow-sm hover:border-pink-200 hover:shadow-md transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center shrink-0">
                    <benefit.icon className="w-4 h-4 text-pink-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm">{benefit.title}</h4>
                    <p className="text-gray-600 text-xs mt-1">{benefit.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function RiskManagementSection() {
  const features = [
    'Swiss-aligned operational framework',
    'Corporate KYB verification',
    'Vault-level physical security',
    'Full transaction and document audit trails',
    'Clear, verifiable ownership records',
  ];

  return (
    <section className="relative py-24 bg-gradient-to-b from-[#F8F9FC] via-white to-[#FAFBFF] overflow-hidden">
      <div className="relative max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-pink-100 border border-pink-200">
              <div className="w-6 h-6 rounded-full bg-pink-200 flex items-center justify-center">
                <Shield className="w-3 h-3 text-pink-600" />
              </div>
              <span className="text-sm font-semibold text-pink-700 uppercase tracking-wider">
                Important Positioning
              </span>
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              Risk Management,
              <br />
              <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
                Not Risk Elimination
              </span>
            </h2>
            
            <p className="text-gray-700 leading-relaxed">
              FinaBridge <strong>complements</strong> traditional trade finance instruments like 
              bank letters of credit, advance payments, and trade insurance.
            </p>
            
            <p className="text-gray-600 leading-relaxed">
              It provides <strong>documentation, assurance, and a stable value reference</strong> that strengthens—but does not replace—existing risk mitigation tools.
            </p>
            
            <p className="text-gray-700">
              We <span className="text-purple-600 font-semibold">reduce</span> trade risk; we do not <strong>remove</strong> it entirely.
            </p>
            
            <div className="w-16 h-1 bg-gradient-to-r from-purple-600 to-pink-500 rounded-full" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="hidden lg:block"
          >
            <div className="relative p-8 rounded-3xl bg-white border border-gray-100 shadow-xl">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center shadow-lg">
                <Shield className="w-8 h-8 text-white" />
              </div>
              
              <div className="pt-8 space-y-3">
                {features.map((feature, i) => (
                  <motion.div
                    key={feature}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100"
                  >
                    <div className="w-6 h-6 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                      <CheckCircle className="w-4 h-4 text-purple-600" />
                    </div>
                    <span className="text-gray-700 text-sm">{feature}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
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
    <section className="relative py-32 bg-gradient-to-b from-[#F8F9FC] via-white to-[#FAFBFF] overflow-hidden">
      <div className="relative max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Value Pillars</h2>
          <p className="text-gray-600 text-lg">The foundation of modern trade finance</p>
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
                animate={{ rotate: [0, 5, 0, -5, 0] }}
                transition={{ duration: 4, repeat: Infinity, delay: i * 0.5 }}
                className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center mb-4 group-hover:from-purple-200 group-hover:to-pink-200 transition-colors"
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

function FeaturesShowcaseSection() {
  const features = [
    { icon: Globe, title: 'Real-Time Shipment Tracking', description: 'Monitor your cargo across global trade routes.' },
    { icon: FileCheck, title: 'Document Approval Timeline', description: 'Track approval status for all trade documents.' },
    { icon: Coins, title: 'Gold Settlement Toggle', description: 'Switch between fiat and gold-backed settlements.' },
    { icon: Lock, title: 'Escrow Release Control', description: 'Secure fund release upon milestone completion.' },
    { icon: MessageSquare, title: 'Integrated Deal Chat', description: 'Communicate directly within each trade.' },
  ];

  return (
    <section id="features" className="relative py-32 bg-gradient-to-b from-[#FAFBFF] via-white to-[#F8F9FC] overflow-hidden">
      <FloatingParticles count={20} />
      
      <div className="relative max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Platform Features</h2>
          <p className="text-gray-600 text-lg">Powerful tools for global trade operations</p>
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
                className="flex-1 p-8 rounded-2xl bg-white border border-gray-100 shadow-lg hover:border-purple-200 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center shrink-0">
                    <feature.icon className="w-7 h-7 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                    <p className="text-gray-600">{feature.description}</p>
                  </div>
                </div>
              </motion.div>
              
              <div className="hidden lg:block w-32">
                <motion.div
                  animate={{ x: i % 2 === 0 ? [0, 10, 0] : [0, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="flex items-center justify-center"
                >
                  <ChevronRight className={`w-8 h-8 text-purple-400/50 ${i % 2 === 1 ? 'rotate-180' : ''}`} />
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
    <section className="relative py-32 bg-gradient-to-b from-[#F8F9FC] via-white to-[#FAFBFF] overflow-hidden">
      <div className="relative max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">The Deal Room</h2>
          <p className="text-gray-600 text-lg">Where buyers and sellers connect securely</p>
        </motion.div>

        <div className="relative flex flex-col lg:flex-row items-center justify-center gap-8">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="w-full lg:w-64 p-6 rounded-2xl bg-white border border-blue-200 shadow-lg"
          >
            <div className="flex items-center gap-3 mb-4">
              <Building2 className="w-8 h-8 text-blue-500" />
              <span className="text-gray-900 font-semibold">Buyer Panel</span>
            </div>
            <div className="space-y-3">
              {['Purchase Order', 'Payment Terms', 'Delivery Schedule'].map((item, i) => (
                <motion.div
                  key={item}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="flex items-center gap-2 text-sm text-gray-600"
                >
                  <CheckCircle className="w-4 h-4 text-blue-500" />
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
                  className="p-4 rounded-xl bg-white border border-purple-200 shadow-lg flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-purple-600" />
                    <span className="text-gray-900 text-sm">{doc}</span>
                  </div>
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.3 }}
                  >
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </motion.div>
                </motion.div>
              ))}
            </motion.div>
            
            <div className="absolute top-1/2 left-0 right-0 -z-10">
              <motion.div
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="h-px bg-gradient-to-r from-blue-400/50 via-purple-500 to-green-400/50"
              />
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="w-full lg:w-64 p-6 rounded-2xl bg-white border border-green-200 shadow-lg"
          >
            <div className="flex items-center gap-3 mb-4">
              <Building2 className="w-8 h-8 text-green-500" />
              <span className="text-gray-900 font-semibold">Seller Panel</span>
            </div>
            <div className="space-y-3">
              {['Proforma Invoice', 'Shipping Details', 'Bank Info'].map((item, i) => (
                <motion.div
                  key={item}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="flex items-center gap-2 text-sm text-gray-600"
                >
                  <CheckCircle className="w-4 h-4 text-green-500" />
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
    <section className="relative py-32 bg-gradient-to-b from-[#FAFBFF] via-white to-[#F8F9FC] overflow-hidden">
      <div className="relative max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Global Trade Routes</h2>
          <p className="text-gray-600 text-lg">Connected hubs across major trading centers</p>
        </motion.div>

        <div className="relative aspect-[2/1] rounded-2xl bg-white border border-gray-100 shadow-lg overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, ${PRIMARY_COLOR}20 1px, transparent 0)`,
              backgroundSize: '30px 30px',
            }} />
          </div>
          
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {[[45, 30, 48, 35], [48, 35, 58, 45], [58, 45, 65, 50], [65, 50, 75, 58]].map(([x1, y1, x2, y2], i) => (
              <motion.line
                key={i}
                x1={`${x1}%`} y1={`${y1}%`} x2={`${x2}%`} y2={`${y2}%`}
                stroke={PRIMARY_COLOR} strokeWidth="2" strokeOpacity="0.4"
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
                className="absolute inset-0 w-6 h-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-300/40"
              />
              <div className="relative w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-purple-600 to-pink-500 shadow-lg shadow-purple-500/50">
                <Ship className="absolute -top-6 left-1/2 -translate-x-1/2 w-4 h-4 text-purple-600" />
              </div>
              <div className="absolute top-4 left-1/2 -translate-x-1/2 whitespace-nowrap">
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/90 border border-purple-200 text-purple-700 shadow-sm">
                  {hub.name}
                </span>
              </div>
            </motion.div>
          ))}
          
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-gradient-to-r from-purple-600 to-pink-500"
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
    <section className="relative py-32 bg-gradient-to-b from-[#F8F9FC] via-white to-[#FAFBFF] overflow-hidden">
      <FloatingParticles count={15} />
      
      <div className="relative max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900">
              Automated, Verifiable &{' '}
              <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
                Secure
              </span>
            </h2>
            <p className="text-gray-600 text-lg leading-relaxed">
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
                className="p-5 rounded-xl bg-white border border-gray-100 shadow-lg hover:border-purple-200 transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-purple-600" />
                  </div>
                  <span className="text-gray-900 font-medium">{doc.name}</span>
                </div>
                <motion.div
                  animate={doc.status === 'Verified' ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                  className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                    doc.status === 'Verified' 
                      ? 'bg-green-100 text-green-600' 
                      : 'bg-yellow-100 text-yellow-600'
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
                className="absolute inset-0 rounded-full border-2 border-purple-300"
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
                  className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full bg-gradient-to-r from-purple-600 to-pink-500"
                  style={{ transform: 'translate(-50%, -50%)' }}
                />
              ))}
              
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-8 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 border-2 border-purple-300 flex items-center justify-center"
              >
                <Shield className="w-20 h-20 text-purple-600" />
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
              Enterprise-Grade{' '}
              <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
                Security
              </span>
            </h2>
            <p className="text-gray-600 text-lg">
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
                  className="flex items-center gap-4 p-4 rounded-xl bg-white border border-gray-100 shadow-lg"
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-purple-600" />
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

function GoldSettlementSection() {
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
            Settle Faster with{' '}
            <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
              Gold
            </span>
          </h2>
          <p className="text-gray-600 text-lg">Unlock liquidity with secure, instant gold-based settlement</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="p-8 rounded-2xl bg-white border border-purple-200 shadow-lg"
        >
          <div className="grid md:grid-cols-3 gap-8 items-center">
            <div className="text-center">
              <motion.div
                animate={{ rotateY: [0, 360] }}
                transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                className="w-24 h-24 mx-auto mb-4 rounded-xl bg-gradient-to-br from-purple-600 via-pink-500 to-purple-600 flex items-center justify-center shadow-xl shadow-purple-500/30"
              >
                <Coins className="w-12 h-12 text-white" />
              </motion.div>
              <p className="text-gray-900 font-semibold">Gold-Backed Value</p>
            </div>
            
            <div className="flex flex-col items-center gap-4">
              <motion.div
                animate={{ x: [0, 20, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="flex items-center gap-2"
              >
                <div className="w-16 h-px bg-gradient-to-r from-transparent to-purple-500" />
                <Zap className="w-6 h-6 text-purple-600" />
                <div className="w-16 h-px bg-gradient-to-r from-pink-500 to-transparent" />
              </motion.div>
              <p className="text-gray-600 text-sm">Instant Settlement</p>
            </div>
            
            <div className="text-center">
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-24 h-24 mx-auto mb-4 rounded-xl bg-green-100 border-2 border-green-300 flex items-center justify-center"
              >
                <CheckCircle className="w-12 h-12 text-green-500" />
              </motion.div>
              <p className="text-gray-900 font-semibold">Deal Completed</p>
            </div>
          </div>
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
            Start Your First Global{' '}
            <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
              Trade Deal
            </span>
          </h2>
          
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Execute cross-border transactions with complete confidence.
          </p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="pt-8"
          >
            <Link href="/finabridge" className="group inline-flex items-center gap-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white px-12 py-6 rounded-full text-lg font-semibold hover:opacity-90 transition-all shadow-lg shadow-purple-500/30">
              Get Started
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}


function FinaBridgeContent() {
  const { isPersonal, setMode } = useMode();
  
  if (isPersonal) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FAFBFF] via-white to-[#F8F9FC]">
        <Navbar variant="products" />
        <div className="flex items-center justify-center px-6 py-32" style={{ minHeight: 'calc(100vh - 180px)' }}>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-lg text-center"
          >
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center mx-auto mb-6">
              <Building2 className="w-10 h-10 text-purple-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              FinaBridge is for{' '}
              <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
                Business
              </span>{' '}
              Users
            </h1>
            <p className="text-gray-600 mb-8">
              FinaBridge provides trade finance solutions for importers and exporters. 
              Switch to Business mode to access cross-border trade financing, gold-backed settlements, 
              and document management features.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <button
                onClick={() => setMode('business')}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white px-8 py-4 rounded-full font-semibold hover:opacity-90 transition-all shadow-lg shadow-purple-200"
              >
                Switch to Business Mode
                <ArrowRight className="w-5 h-5" />
              </button>
              <Link
                href="/"
                className="inline-flex items-center gap-2 border-2 border-gray-200 text-gray-700 px-8 py-4 rounded-full font-semibold hover:bg-gray-50 transition-all"
              >
                Back to Home
              </Link>
            </div>
          </motion.div>
        </div>
        <Footer />
      </div>
    );
  }
  
  return (
    <div className="finabridge-landing min-h-screen bg-gradient-to-b from-[#FAFBFF] via-white to-[#F8F9FC] text-gray-900" data-testid="finabridge-landing">
      <style>{`
        .finabridge-landing {
          --purple-600: #9333ea;
          --pink-500: #ec4899;
          --purple-100: #f3e8ff;
          --pink-100: #fce7f3;
          --primary: #9333ea;
          --primary-foreground: #ffffff;
          --ring: #9333ea;
          --accent: #ec4899;
          --accent-foreground: #ffffff;
          --muted: #f3f4f6;
          --muted-foreground: #6b7280;
          --input: #f9fafb;
          --border: #e5e7eb;
          --background: #ffffff;
          --foreground: #111827;
          --card: #ffffff;
          --card-foreground: #111827;
          --popover: #ffffff;
          --popover-foreground: #111827;
        }
      `}</style>
      <Navbar variant="products" />
      <HeroSection />
      <WhatIsFinaBridgeSection />
      <WhyUseFinaBridgeSection />
      <RiskManagementSection />
      <FeaturesShowcaseSection />
      <DealRoomSection />
      <GlobalTradeMapSection />
      <DocumentManagementSection />
      <SecuritySection />
      <GoldSettlementSection />
      <FinalCTASection />
      <Footer />
      <FloatingAgentChat />
    </div>
  );
}

export default function FinaBridgeLanding() {
  return (
    <ModeProvider>
      <FinaBridgeContent />
    </ModeProvider>
  );
}
