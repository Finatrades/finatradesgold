import React, { useState, useRef, useEffect } from 'react';
import { 
  CheckCircle2, AlertCircle, XCircle, TrendingUp, TrendingDown, 
  ArrowUpRight, ShieldCheck, ChevronRight, Activity, 
  Package, DollarSign, Wallet, FileText, Anchor, Settings, Plus,
  List, Send, FileSearch, ArrowRight, Eye, ShieldAlert,
  Clock, Lock, Globe, FileCheck, Info, Check, CircleDot, Circle,
  AlertTriangle, Scale
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, Legend 
} from 'recharts';
import { 
  motion, AnimatePresence, useReducedMotion, useSpring, useTransform, useMotionValue, useMotionTemplate
} from 'framer-motion';

// --- Brand Tokens (Directly Mapped) ---
const theme = {
  primary: '#C73B22',
  primaryHover: '#A82F1B',
  coral: '#E86A4F',
  bg: '#FAFAF8',
  surface: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#4A4A48',
  textMuted: '#888880',
  border: 'rgba(255, 255, 255, 0.6)',
  subtle: 'rgba(255, 255, 255, 0.5)',
  gridline: '#F0EBE5',
  success: '#059669',
  warning: '#D97706',
  info: '#2563EB',
  gold: '#D4AF37',
  shadowCard: '0 1px 0 rgba(255,255,255,0.9) inset, 0 12px 32px -12px rgba(26,26,26,0.12), 0 4px 12px -4px rgba(199,59,34,0.06)',
};

// --- Mock Data ---
const revenueData = [
  { week: 'W1', rev: 1200000, vol: 150 },
  { week: 'W2', rev: 1400000, vol: 180 },
  { week: 'W3', rev: 1100000, vol: 140 },
  { week: 'W4', rev: 1800000, vol: 210 },
  { week: 'W5', rev: 1500000, vol: 190 },
  { week: 'W6', rev: 2100000, vol: 260 },
  { week: 'W7', rev: 1900000, vol: 240 },
  { week: 'W8', rev: 2500000, vol: 300 },
  { week: 'W9', rev: 2300000, vol: 280 },
  { week: 'W10', rev: 2800000, vol: 330 },
  { week: 'W11', rev: 3100000, vol: 370 },
  { week: 'W12', rev: 3400000, vol: 410 },
];

const commodityMix = [
  { name: 'Cocoa', value: 450, color: '#C73B22' },
  { name: 'Coffee', value: 380, color: '#D97706' },
  { name: 'Cotton', value: 260, color: '#2563EB' },
  { name: 'Gold', value: 150, color: '#D4AF37' },
];

const cases = [
  { ref: 'FT-TRD-082', item: 'Cocoa Beans (Grade A)', qty: '200 MT', party: 'FT-IMP-104', rating: 4.8, status: 'in-progress', step: 2, escrow: '$450,000', action: 'Approve Doc', tag: 'awaiting_action' },
  { ref: 'FT-TRD-091', item: 'Raw Cotton', qty: '150 MT', party: 'FT-IMP-201', rating: 4.5, status: 'pending', step: 1, escrow: '$210,000', action: 'Sign Contract', tag: 'awaiting_action' },
  { ref: 'FT-TRD-103', item: 'Arabica Coffee', qty: '80 MT', party: 'FT-IMP-099', rating: 4.9, status: 'in-progress', step: 2, escrow: '€180,000', action: 'View Escrow', tag: 'in_escrow' },
  { ref: 'FT-TRD-108', item: 'Refined Gold (99.9%)', qty: '50 KG', party: 'FT-IMP-305', rating: 5.0, status: 'in-progress', step: 2, escrow: '$3,200,000', action: 'Track Shipment', tag: 'shipping' },
  { ref: 'FT-TRD-112', item: 'Robusta Coffee', qty: '120 MT', party: 'FT-IMP-112', rating: 4.7, status: 'done', step: 3, escrow: '$340,000', action: 'View Receipt', tag: 'completed' },
  { ref: 'FT-TRD-115', item: 'Cocoa Butter', qty: '60 MT', party: 'FT-IMP-155', rating: 4.6, status: 'done', step: 3, escrow: '£150,000', action: 'View Receipt', tag: 'completed' },
  { ref: 'FT-TRD-095', item: 'Raw Cotton', qty: '300 MT', party: 'FT-IMP-205', rating: 4.3, status: 'disputed', step: 2, escrow: '$420,000', action: 'Resolve Dispute', tag: 'disputed' },
  { ref: 'FT-TRD-118', item: 'Arabica Coffee', qty: '40 MT', party: 'FT-IMP-088', rating: 4.8, status: 'pending', step: 1, escrow: '€90,000', action: 'Upload BoL', tag: 'awaiting_action' },
];

const tickerData = [
  { name: 'Cocoa', price: '$8,420', delta: '+1.2%', up: true },
  { name: 'Coffee', price: '$214.50', delta: '-0.8%', up: false },
  { name: 'Cotton', price: '$88.20', delta: '+0.5%', up: true },
  { name: 'Gold', price: '$2,340', delta: '+2.1%', up: true },
];

// --- Animation Variants ---
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } }
};

// --- Subcomponents ---

const TiltCard = ({ children, className = '', hero = false, style = {} }) => {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseXSpring = useSpring(x, { stiffness: 150, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 150, damping: 20 });
  const prefersReducedMotion = useReducedMotion();

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], prefersReducedMotion ? [0, 0] : ["4deg", "-4deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], prefersReducedMotion ? [0, 0] : ["-4deg", "4deg"]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current || prefersReducedMotion) return;
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const glassStyle = {
    backdropFilter: hero ? 'blur(28px) saturate(160%)' : 'blur(20px) saturate(160%)',
    backgroundColor: hero ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.72)',
    border: theme.border,
    boxShadow: theme.shadowCard,
    ...style
  };

  return (
    <div style={{ perspective: 1200, transformStyle: "preserve-3d" }} className="w-full h-full">
      <motion.div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
          ...glassStyle
        }}
        className={`relative rounded-3xl ${className}`}
      >
        {hero && (
          <>
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/80 to-transparent z-20 pointer-events-none rounded-t-3xl" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.4)_0%,transparent_60%)] pointer-events-none rounded-3xl" />
          </>
        )}
        {children}
      </motion.div>
    </div>
  );
};

const RadialGauge = ({ value, max, label, subLabel, delta, color = theme.primary }) => {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const percent = max ? (value / max) : (value > 0 ? 1 : 0);
  const targetOffset = circumference - percent * circumference;
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="relative w-[88px] h-[88px] flex items-center justify-center mb-3">
        <svg className="absolute inset-0 w-full h-full transform -rotate-90" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.05))' }}>
          <circle cx="44" cy="44" r={radius} stroke="rgba(255,255,255,0.6)" strokeWidth="10" fill="none" />
          <motion.circle 
            cx="44" cy="44" r={radius} 
            stroke={color} 
            strokeWidth="10" 
            fill="none" 
            strokeDasharray={circumference} 
            initial={{ strokeDashoffset: prefersReducedMotion ? targetOffset : circumference }}
            animate={{ strokeDashoffset: targetOffset }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            strokeLinecap="round"
          />
        </svg>
        <div className="flex flex-col items-center z-10 text-center">
          <span className="text-[20px] font-bold text-[#1A1A1A] tabular-nums leading-none mb-0.5" style={{ textShadow: '0 1px 0 rgba(255,255,255,0.8)' }}>{value}</span>
        </div>
      </div>
      <div className="flex flex-col items-center">
        <span className="text-[13px] font-semibold text-[#1A1A1A] mb-0.5">{label}</span>
        <span className="text-[12px] text-[#4A4A48] font-medium mb-1.5">{subLabel}</span>
        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[rgba(255,255,255,0.5)] border border-[rgba(255,255,255,0.8)] text-[11px] font-medium">
          {delta.startsWith('+') ? <TrendingUp size={12} color={theme.success} /> : <span className="w-1" />}
          <span style={{ color: delta.startsWith('+') ? theme.success : theme.textSecondary }}>{delta}</span>
        </div>
      </div>
    </div>
  );
};

const Speedometer = ({ value }) => {
  const radius = 60;
  const circumference = Math.PI * radius;
  const percent = value / 100;
  const targetOffset = circumference - percent * circumference;
  const targetAngle = -90 + (percent * 180);
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="relative w-[140px] h-[80px] overflow-hidden flex flex-col items-center">
      <svg className="w-full h-full absolute inset-0 z-0" viewBox="0 0 140 80" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.05))' }}>
        <path d="M 10 70 A 60 60 0 0 1 130 70" stroke="rgba(255,255,255,0.6)" strokeWidth="14" fill="none" strokeLinecap="round" />
        <motion.path 
          d="M 10 70 A 60 60 0 0 1 130 70" 
          stroke={theme.success} 
          strokeWidth="14" 
          fill="none" 
          strokeDasharray={circumference} 
          initial={{ strokeDashoffset: prefersReducedMotion ? targetOffset : circumference }}
          animate={{ strokeDashoffset: targetOffset }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          strokeLinecap="round"
        />
      </svg>
      {/* Needle */}
      <motion.div 
        className="absolute bottom-1 w-[2px] h-[50px] bg-[#1A1A1A] origin-bottom rounded-full shadow-sm z-10"
        style={{ left: '69px', top: '20px' }}
        initial={{ rotate: prefersReducedMotion ? targetAngle : -90 }}
        animate={{ rotate: targetAngle }}
        transition={{ type: "spring", stiffness: 60, damping: 14, duration: 0.9 }}
      >
        <div className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 rounded-full bg-[#1A1A1A] border-2 border-white shadow-sm" />
      </motion.div>

      <div className="absolute bottom-0 flex flex-col items-center z-20 translate-y-full pt-2">
        <span className="text-[32px] font-bold text-[#1A1A1A] tabular-nums leading-none" style={{ textShadow: '0 1px 0 rgba(255,255,255,0.8)' }}>{value}</span>
        <span className="text-[11px] font-semibold text-[#4A4A48] uppercase tracking-wider mt-1">Excellent</span>
      </div>
    </div>
  );
};

const ProgressMeter = ({ label, value, color }) => {
  const prefersReducedMotion = useReducedMotion();
  
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="flex justify-between items-center text-[13px]">
        <span className="text-[#1A1A1A] font-medium">{label}</span>
        <span className="text-[#1A1A1A] font-semibold tabular-nums" style={{ textShadow: '0 1px 0 rgba(255,255,255,0.8)' }}>{value}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-[rgba(255,255,255,0.6)] overflow-hidden shadow-inner border border-white/20">
        <motion.div 
          className="h-full rounded-full" 
          style={{ backgroundColor: color }} 
          initial={{ width: prefersReducedMotion ? `${value}%` : "0%" }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />
      </div>
    </div>
  );
};

const WalletMeter = ({ currency, total, available, locked, pending, delay = 0 }) => {
  const totalVal = available + locked + pending;
  const avPct = (available / totalVal) * 100;
  const lkPct = (locked / totalVal) * 100;
  const pdPct = (pending / totalVal) * 100;
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="flex flex-col gap-2.5 mb-5">
      <div className="flex justify-between items-baseline">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[rgba(255,255,255,0.8)] border border-white flex items-center justify-center text-[12px] font-bold text-[#1A1A1A] shadow-sm">
            {currency}
          </div>
          <span className="text-[16px] font-bold text-[#1A1A1A] tabular-nums" style={{ textShadow: '0 1px 0 rgba(255,255,255,0.8)' }}>
            {currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '£'}
            {total.toLocaleString()}
          </span>
        </div>
      </div>
      <div className="h-2 w-full flex rounded-full overflow-hidden shadow-inner border border-white/40 bg-[rgba(255,255,255,0.4)]">
        <motion.div 
          initial={{ width: prefersReducedMotion ? `${avPct}%` : "0%" }}
          animate={{ width: `${avPct}%` }}
          transition={{ duration: 0.7, delay, ease: "easeOut" }}
          style={{ backgroundColor: theme.primary }} 
          className="h-full border-r border-[#FFFFFF]" 
        />
        <motion.div 
          initial={{ width: prefersReducedMotion ? `${lkPct}%` : "0%" }}
          animate={{ width: `${lkPct}%` }}
          transition={{ duration: 0.7, delay: delay + 0.1, ease: "easeOut" }}
          style={{ backgroundColor: theme.coral }} 
          className="h-full border-r border-[#FFFFFF]" 
        />
        <motion.div 
          initial={{ width: prefersReducedMotion ? `${pdPct}%` : "0%" }}
          animate={{ width: `${pdPct}%` }}
          transition={{ duration: 0.7, delay: delay + 0.2, ease: "easeOut" }}
          style={{ backgroundColor: theme.textMuted }} 
          className="h-full" 
        />
      </div>
      <div className="flex justify-between text-[11px] font-medium uppercase tracking-wider">
        <span className="text-[#1A1A1A] flex items-center gap-1.5"><div className="w-2 h-2 rounded-full shadow-sm" style={{backgroundColor: theme.primary}}/> Avail: {avPct.toFixed(0)}%</span>
        <span className="text-[#1A1A1A] flex items-center gap-1.5"><div className="w-2 h-2 rounded-full shadow-sm" style={{backgroundColor: theme.coral}}/> Lock: {lkPct.toFixed(0)}%</span>
        <span className="text-[#4A4A48] flex items-center gap-1.5"><div className="w-2 h-2 rounded-full shadow-sm" style={{backgroundColor: theme.textMuted}}/> Pend: {pdPct.toFixed(0)}%</span>
      </div>
    </div>
  );
};

// --- Main Dashboard Component ---

export default function PremiumFintech() {
  const [activeTab, setActiveTab] = useState('All');
  const prefersReducedMotion = useReducedMotion();

  const tabs = [
    { id: 'All', label: 'All' },
    { id: 'awaiting_action', label: 'Awaiting Action' },
    { id: 'in_escrow', label: 'In Escrow' },
    { id: 'shipping', label: 'Shipping' },
    { id: 'completed', label: 'Completed' },
    { id: 'disputed', label: 'Disputed' }
  ];

  const filteredCases = cases.filter(c => activeTab === 'All' || c.tag === activeTab);
  
  const counts = cases.reduce((acc: any, c) => {
    acc[c.tag] = (acc[c.tag] || 0) + 1;
    acc['All'] = (acc['All'] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen relative text-[#1A1A1A] font-sans selection:bg-[#C73B22] selection:text-white overflow-hidden" style={{ backgroundColor: theme.bg, fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* Background Mesh & Blobs */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0" style={{
          background: `radial-gradient(circle at bottom left, rgba(199,59,34,0.06), transparent 50%),
                       radial-gradient(circle at top right, rgba(212,175,55,0.05), transparent 50%)`,
        }} />
        <div className="absolute top-[20%] right-[10%] w-[600px] h-[600px] rounded-full mix-blend-multiply" style={{
          backgroundColor: 'rgba(232,106,79,0.35)', // coral-ish
          filter: 'blur(120px)'
        }} />
        <div className="absolute bottom-[10%] left-[5%] w-[500px] h-[500px] rounded-full mix-blend-multiply" style={{
          backgroundColor: 'rgba(199,59,34,0.35)', // redbrick
          filter: 'blur(120px)'
        }} />
      </div>

      <div className="relative z-10 min-h-screen">
        {/* Top Navbar */}
        <header className="sticky top-0 z-50 bg-[rgba(255,255,255,0.7)] backdrop-blur-xl saturate-150 border-b border-white/60 px-6 h-16 flex items-center justify-between" style={{ boxShadow: '0 1px 0 rgba(255,255,255,0.5) inset' }}>
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <h1 className="text-[16px] font-semibold text-[#1A1A1A] leading-tight">Welcome back, Charan</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[13px] text-[#4A4A48] font-medium">Exporter</span>
                <span className="text-[#888880]">•</span>
                <span className="text-[13px] text-[#4A4A48] font-medium">Raminvest Holding DIFC</span>
                <span className="text-[#888880]">•</span>
                <span className="text-[12px] text-[#888880] font-mono tracking-tight font-medium">FT-EXP-04821</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#059669]/10 text-[#059669] rounded-full border border-[#059669]/20 shadow-sm">
              <ShieldCheck size={14} />
              <span className="text-[11px] font-semibold uppercase tracking-wider">Corporate KYC Approved</span>
            </div>
            <div className="flex items-center gap-2 bg-[rgba(255,255,255,0.5)] border border-white px-3 py-1.5 rounded-full shadow-sm">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#059669] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#059669]"></span>
              </span>
              <span className="text-[13px] font-medium text-[#1A1A1A]">Platform Active</span>
            </div>
            <button aria-label="Settings" className="p-2 w-10 h-10 flex items-center justify-center text-[#1A1A1A] hover:bg-white/50 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C73B22]/40 shadow-sm border border-transparent hover:border-white">
              <Settings size={20} />
            </button>
          </div>
        </header>

        {/* Main Layout */}
        <main className="max-w-[1280px] mx-auto px-6 py-6 pb-24">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="flex flex-col"
          >
            {/* Ticker Strip */}
            <motion.div variants={itemVariants} className="mb-6">
              <TiltCard className="flex items-center gap-6 px-4 py-3" style={{ borderRadius: '16px' }}>
                <div className="flex items-center gap-2 border-r border-black/10 pr-4 shrink-0">
                  <motion.div 
                    animate={prefersReducedMotion ? {} : { opacity: [0.8, 1, 0.8] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Activity size={16} color={theme.coral} />
                  </motion.div>
                  <span className="text-[12px] font-bold text-[#1A1A1A] uppercase tracking-wider" style={{ textShadow: '0 1px 0 rgba(255,255,255,0.8)' }}>Live Markets</span>
                </div>
                <div className="flex gap-8 overflow-x-auto no-scrollbar shrink-0">
                  {tickerData.map((tick, i) => (
                    <div key={i} className="flex items-center gap-3 shrink-0">
                      <span className="text-[13px] font-medium text-[#1A1A1A]">{tick.name}</span>
                      <span className="text-[14px] font-bold font-mono text-[#1A1A1A]" style={{ textShadow: '0 1px 0 rgba(255,255,255,0.8)' }}>{tick.price}</span>
                      <span className={`text-[13px] font-medium flex items-center ${tick.up ? 'text-[#059669]' : 'text-[#D97706]'}`}>
                        {tick.up ? <ArrowUpRight size={14} className="mr-0.5" /> : <TrendingDown size={14} className="mr-0.5" />}
                        {tick.delta}
                      </span>
                    </div>
                  ))}
                </div>
              </TiltCard>
            </motion.div>

            {/* Composite Hero Panel */}
            <motion.div variants={itemVariants} className="mb-6 z-20">
              <TiltCard hero>
                <div className="p-8 grid grid-cols-12 gap-8 items-center relative z-10">
                  
                  {/* KPI Rings */}
                  <div className="col-span-8 grid grid-cols-4 gap-4">
                    <RadialGauge value={8} max={12} label="Consignments" subLabel="8/12 Active" delta="+2 this week" color={theme.primary} />
                    <RadialGauge value={1240} max={2000} label="Verified Inventory" subLabel="1,240/2k MT" delta="62%" color={theme.info} />
                    <RadialGauge value={12} max={0} label="Open RFQs" subLabel="12 Active" delta="+3 today" color={theme.warning} />
                    <RadialGauge value={4.2} max={6.0} label="Escrow Locked" subLabel="$4.2M/$6M Comm" delta="70%" color={theme.success} />
                  </div>

                  {/* Trade Health */}
                  <div className="col-span-4 pl-8 border-l border-black/10 h-[280px] flex flex-col justify-center">
                    <div className="flex flex-col items-center w-full">
                      <div className="w-full flex justify-between items-center mb-10">
                        <h2 className="text-[14px] font-semibold text-[#1A1A1A] uppercase tracking-wider">Trade Health Score</h2>
                        <button className="text-[#4A4A48] hover:text-[#1A1A1A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C73B22]/40 rounded-full">
                          <Info size={16} />
                        </button>
                      </div>
                      <Speedometer value={87} />
                      
                      <div className="w-full grid grid-cols-2 gap-x-8 gap-y-4 mt-12">
                        <ProgressMeter label="On-time delivery" value={92} color={theme.success} />
                        <ProgressMeter label="Compliance" value={95} color={theme.success} />
                        <ProgressMeter label="Counterparty rating" value={94} color={theme.primary} />
                        <ProgressMeter label="Doc completeness" value={78} color={theme.warning} />
                      </div>
                    </div>
                  </div>

                </div>
              </TiltCard>
            </motion.div>

            {/* Mid Section Grid */}
            <div className="grid grid-cols-12 gap-6 mb-6">
              
              {/* Main Content Area */}
              <div className="col-span-8 flex flex-col gap-6">
                
                {/* Active Trade Cases */}
                <motion.div variants={itemVariants} className="h-full">
                  <TiltCard className="p-6 flex flex-col h-full z-10">
                    <div className="flex justify-between items-end mb-4">
                      <div>
                        <h2 className="text-[14px] font-semibold text-[#4A4A48] uppercase tracking-wider mb-2">Active Trade Cases</h2>
                        <div className="text-[24px] font-bold text-[#1A1A1A]" style={{ textShadow: '0 1px 0 rgba(255,255,255,0.8)' }}>
                          {counts['awaiting_action'] || 0} Cases Requiring Action
                        </div>
                      </div>
                      <button className="h-[40px] px-4 text-[14px] font-semibold text-[#C73B22] flex items-center gap-1.5 hover:bg-[rgba(255,255,255,0.5)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C73B22]/40 rounded-xl transition-colors border border-transparent hover:border-white">
                        View all <ArrowRight size={16} />
                      </button>
                    </div>

                    {/* Tabs */}
                    <div 
                      role="tablist" 
                      aria-label="Trade Cases Pipeline"
                      className="flex items-center gap-2 border-b border-black/10 mb-6 overflow-x-auto no-scrollbar"
                    >
                      {tabs.map((tab) => {
                        const isActive = activeTab === tab.id;
                        const isDisputed = tab.id === 'disputed';
                        const count = counts[tab.id] || 0;
                        
                        return (
                          <button
                            key={tab.id}
                            role="tab"
                            aria-selected={isActive}
                            aria-controls={`panel-${tab.id}`}
                            id={`tab-${tab.id}`}
                            onClick={() => setActiveTab(tab.id)}
                            className={`relative flex items-center gap-2 h-[40px] px-2 whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C73B22]/40 rounded-t-lg ${
                              isActive ? 'text-[#1A1A1A]' : 'text-[#4A4A48] hover:bg-white/40'
                            }`}
                          >
                            <span className={`text-[13px] ${isActive ? 'font-bold' : 'font-semibold'}`}>
                              {tab.label}
                            </span>
                            
                            <div className={`flex items-center justify-center px-1.5 min-w-[20px] h-[20px] rounded-full text-[11px] font-bold tabular-nums shadow-sm border ${
                              isDisputed && count > 0 
                                ? 'bg-[#D97706]/20 text-[#D97706] border-[#D97706]/20' 
                                : isActive 
                                  ? 'bg-[#C73B22]/20 text-[#C73B22] border-[#C73B22]/20' 
                                  : 'bg-[rgba(255,255,255,0.6)] text-[#4A4A48] border-white'
                            }`}>
                              {isDisputed && count > 0 && <AlertTriangle size={10} className="mr-1" />}
                              {count}
                            </div>

                            {isActive && (
                              <motion.div 
                                layoutId="tabUnderline"
                                className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#C73B22]"
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div 
                      role="tabpanel"
                      id={`panel-${activeTab}`}
                      aria-labelledby={`tab-${activeTab}`}
                      className="flex flex-col gap-4"
                    >
                      <AnimatePresence mode="popLayout">
                        {filteredCases.length > 0 ? (
                          filteredCases.map((c, i) => (
                            <motion.div 
                              key={c.ref}
                              layout
                              initial={{ opacity: 0, scale: 0.98 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.2 } }}
                              whileHover={prefersReducedMotion ? {} : { y: -2, scale: 1.005 }}
                              transition={{ duration: 0.15 }}
                              className="group flex flex-col md:flex-row md:items-center justify-between p-5 rounded-2xl border border-white/60 bg-[rgba(255,255,255,0.4)] hover:bg-[rgba(255,255,255,0.8)] transition-all relative overflow-hidden" 
                              style={{ boxShadow: '0 2px 8px rgba(26,26,26,0.04), 0 1px 0 rgba(255,255,255,0.9) inset' }}
                            >
                              
                              {c.tag === 'disputed' && (
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#D97706]" />
                              )}

                              <div className="flex flex-col gap-1 w-full md:w-[22%] mb-4 md:mb-0 pl-2 md:pl-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-[13px] font-bold font-mono text-[#4A4A48]">{c.ref}</span>
                                  {c.status === 'done' && <CheckCircle2 size={14} className="text-[#059669]" />}
                                  {c.status === 'in-progress' && <CircleDot size={14} className="text-[#2563EB]" />}
                                  {c.status === 'pending' && <Circle size={14} className="text-[#D97706]" />}
                                  {c.status === 'disputed' && <AlertCircle size={14} className="text-[#D97706]" />}
                                  {c.tag === 'completed' && <span className="text-[10px] font-bold text-[#059669] bg-[#059669]/10 px-1.5 py-0.5 rounded uppercase tracking-wider border border-[#059669]/20 shadow-sm">30 Days</span>}
                                </div>
                                <span className="text-[14px] font-bold text-[#1A1A1A] leading-tight" style={{ textShadow: '0 1px 0 rgba(255,255,255,0.8)' }}>{c.item}</span>
                                <span className="text-[13px] text-[#4A4A48] font-medium">{c.qty}</span>
                              </div>

                              <div className="flex flex-col gap-1 w-full md:w-[20%] mb-4 md:mb-0">
                                <span className="text-[11px] font-semibold text-[#4A4A48] uppercase tracking-wider">Counterparty</span>
                                <span className="text-[14px] font-mono font-bold text-[#1A1A1A]" style={{ textShadow: '0 1px 0 rgba(255,255,255,0.8)' }}>{c.party}</span>
                                <span className="text-[12px] font-bold text-[#D97706]">★ {c.rating}/5.0</span>
                              </div>

                              <div className="flex flex-col gap-2 w-full md:w-[24%] mb-4 md:mb-0">
                                <span className="text-[11px] font-semibold text-[#4A4A48] uppercase tracking-wider">Milestone</span>
                                <div className="flex items-center gap-1 mt-0.5 shadow-inner rounded-full p-0.5 bg-[rgba(255,255,255,0.3)] border border-white/30">
                                  <div className={`h-2 flex-1 rounded-l-full ${c.step >= 1 ? 'bg-[#059669]' : 'bg-[rgba(255,255,255,0.5)]'}`} />
                                  <div className={`h-2 flex-1 ${c.step >= 2 ? 'bg-[#059669]' : 'bg-[rgba(255,255,255,0.5)]'}`} />
                                  <div className={`h-2 flex-1 rounded-r-full ${c.step >= 3 ? 'bg-[#059669]' : 'bg-[rgba(255,255,255,0.5)]'}`} />
                                </div>
                                <div className="flex justify-between items-center text-[11px] font-bold">
                                  <span className={c.step >= 1 ? 'text-[#1A1A1A]' : 'text-[#4A4A48]'}>Contract</span>
                                  <span className={c.step >= 2 ? 'text-[#1A1A1A]' : 'text-[#4A4A48]'}>Docs</span>
                                  <span className={c.step >= 3 ? 'text-[#1A1A1A]' : 'text-[#4A4A48]'}>Settled</span>
                                </div>
                              </div>

                              <div className="flex flex-col w-full md:w-[15%] text-left md:text-right pr-4 mb-4 md:mb-0">
                                <span className="text-[11px] font-semibold text-[#4A4A48] uppercase tracking-wider mb-1">Escrow</span>
                                <span className="text-[16px] font-bold text-[#1A1A1A] tabular-nums" style={{ textShadow: '0 1px 0 rgba(255,255,255,0.8)' }}>{c.escrow}</span>
                              </div>

                              <div className="flex w-full md:w-auto items-center justify-end gap-3">
                                <button aria-label="View deal" className="h-[40px] w-[40px] flex items-center justify-center rounded-xl border border-white bg-[rgba(255,255,255,0.6)] shadow-sm text-[#1A1A1A] hover:bg-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C73B22]/40">
                                  <Eye size={18} />
                                </button>
                                <motion.button 
                                  whileTap={prefersReducedMotion ? {} : { scale: 0.97 }}
                                  className={`h-[40px] px-5 rounded-xl text-[14px] font-semibold transition-colors shadow-sm border focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${
                                    c.tag === 'disputed' 
                                      ? 'bg-[#D97706] hover:bg-[#B45309] text-white border-[#B45309] focus-visible:ring-[#D97706]/40' 
                                      : c.tag === 'completed'
                                        ? 'bg-[rgba(255,255,255,0.6)] border-white text-[#1A1A1A] hover:bg-white focus-visible:ring-white/40'
                                        : 'bg-[#C73B22] hover:bg-[#A82F1B] text-white border-[#A82F1B] focus-visible:ring-[#C73B22]/40'
                                  }`}
                                >
                                  {c.action}
                                </motion.button>
                              </div>

                            </motion.div>
                          ))
                        ) : (
                          <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            className="flex flex-col items-center justify-center py-10 px-4 text-center rounded-2xl border border-dashed border-black/10 bg-[rgba(255,255,255,0.4)] h-[120px]"
                          >
                            {activeTab === 'disputed' ? (
                              <Scale size={24} className="text-[#4A4A48] mb-3" />
                            ) : activeTab === 'completed' ? (
                              <FileCheck size={24} className="text-[#4A4A48] mb-3" />
                            ) : (
                              <FileSearch size={24} className="text-[#4A4A48] mb-3" />
                            )}
                            <h3 className="text-[14px] font-bold text-[#1A1A1A]">
                              {activeTab === 'disputed' ? 'No disputed deals — nice work' : 'No cases in this stage'}
                            </h3>
                            <p className="text-[13px] text-[#4A4A48] font-medium mt-1">
                              {activeTab === 'disputed' ? 'All your transactions are running smoothly.' : 'There are currently no trade cases matching this filter.'}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </TiltCard>
                </motion.div>

                {/* Revenue & Volume Chart */}
                <motion.div variants={itemVariants}>
                  <TiltCard className="p-6">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h2 className="text-[14px] font-semibold text-[#4A4A48] uppercase tracking-wider mb-2">Revenue & Volume</h2>
                        <div className="flex items-baseline gap-3">
                          <span className="text-[28px] font-bold text-[#1A1A1A] tabular-nums" style={{ textShadow: '0 1px 0 rgba(255,255,255,0.8)' }}>$3.4M</span>
                          <div className="flex items-center gap-1 text-[14px] font-bold text-[#059669] bg-[#059669]/10 px-2 py-1 rounded-md border border-[#059669]/20 shadow-sm">
                            <TrendingUp size={16} /> +12%
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-4">
                         <div className="flex items-center gap-2 text-[13px] font-bold text-[#1A1A1A]">
                           <div className="w-3 h-3 rounded-full bg-[#C73B22] shadow-sm" /> Revenue ($)
                         </div>
                         <div className="flex items-center gap-2 text-[13px] font-bold text-[#1A1A1A]">
                           <div className="w-3 h-3 rounded-full bg-[#2563EB] shadow-sm" /> Volume (MT)
                         </div>
                      </div>
                    </div>
                    {/* Plain solid #FFFFFF for chart readability inside the glass card */}
                    <div className="h-[280px] w-full bg-[#FFFFFF] rounded-2xl p-4 border border-black/5 shadow-inner">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={revenueData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={theme.primary} stopOpacity={0.15}/>
                              <stop offset="95%" stopColor={theme.primary} stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.gridline} />
                          <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: theme.textSecondary, fontWeight: 600 }} dy={10} />
                          <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: theme.textSecondary, fontWeight: 600 }} tickFormatter={(val) => `$${val/1000000}M`} />
                          <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: theme.textSecondary, fontWeight: 600 }} tickFormatter={(val) => `${val}`} />
                          <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: '1px solid #E8E2DC', boxShadow: '0 4px 12px rgba(26,26,26,0.08)', fontSize: '13px', fontFamily: 'Inter', padding: '12px' }}
                            itemStyle={{ fontWeight: 600, paddingTop: '4px' }}
                            labelStyle={{ color: '#4A4A48', fontWeight: 700, textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}
                            formatter={(val: number, name: string) => [name === 'rev' ? `$${val.toLocaleString()}` : `${val} MT`, name === 'rev' ? 'Revenue' : 'Volume']}
                          />
                          <Area yAxisId="left" type="monotone" dataKey="rev" name="Revenue" stroke={theme.primary} strokeWidth={3} fill="url(#colorRev)" animationDuration={1000} />
                          <Line yAxisId="right" type="monotone" dataKey="vol" name="Volume" stroke={theme.info} strokeWidth={2} dot={false} animationDuration={1000} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </TiltCard>
                </motion.div>

              </div>

              {/* Right Rail */}
              <div className="col-span-4 flex flex-col gap-6">
                
                {/* Multi-currency Wallet */}
                <motion.div variants={itemVariants}>
                  <TiltCard className="p-6">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-[14px] font-semibold text-[#4A4A48] uppercase tracking-wider">Treasury Wallets</h2>
                      <Wallet size={18} className="text-[#1A1A1A]" />
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <WalletMeter currency="USD" total={4200500} available={1200000} locked={2800000} pending={200500} delay={0.1} />
                      <WalletMeter currency="EUR" total={1850000} available={850000} locked={900000} pending={100000} delay={0.2} />
                    </div>
                    
                    <div className="mt-6 flex flex-col gap-3">
                      <motion.button 
                        whileTap={prefersReducedMotion ? {} : { scale: 0.97 }}
                        className="h-[44px] w-full bg-[#C73B22] hover:bg-[#A82F1B] text-white rounded-xl text-[14px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C73B22]/40 shadow-sm border border-[#A82F1B]"
                      >
                        Open wallet
                      </motion.button>
                      <motion.button 
                        whileTap={prefersReducedMotion ? {} : { scale: 0.97 }}
                        className="h-[44px] w-full bg-[rgba(255,255,255,0.6)] border border-white hover:bg-white text-[#1A1A1A] rounded-xl text-[14px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C73B22]/40 shadow-sm"
                      >
                        View FX rates
                      </motion.button>
                    </div>
                  </TiltCard>
                </motion.div>

                {/* Commodity Mix */}
                <motion.div variants={itemVariants}>
                  <TiltCard className="p-6">
                    <h2 className="text-[14px] font-semibold text-[#4A4A48] uppercase tracking-wider mb-6">Commodity Mix</h2>
                    <div className="relative h-[200px] w-full flex items-center justify-center bg-[#FFFFFF] rounded-2xl border border-black/5 shadow-inner">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={commodityMix}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={95}
                            paddingAngle={4}
                            dataKey="value"
                            stroke="none"
                            animationDuration={1000}
                          >
                            {commodityMix.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: '1px solid #E8E2DC', boxShadow: '0 4px 12px rgba(26,26,26,0.08)', fontSize: '13px' }}
                            itemStyle={{ color: '#1A1A1A', fontWeight: 600 }}
                            formatter={(val) => `${val} MT`}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-[24px] font-bold text-[#1A1A1A]">1,240</span>
                        <span className="text-[12px] font-bold text-[#4A4A48]">TOTAL MT</span>
                      </div>
                    </div>
                    <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-3">
                      {commodityMix.map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-[13px]">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full shadow-sm border border-white/20" style={{ backgroundColor: item.color }} />
                            <span className="text-[#1A1A1A] font-bold">{item.name}</span>
                          </div>
                          <span className="font-bold text-[#1A1A1A] tabular-nums">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </TiltCard>
                </motion.div>

                {/* Quick Actions */}
                <motion.div variants={itemVariants}>
                  <TiltCard className="p-6">
                    <h2 className="text-[14px] font-semibold text-[#4A4A48] uppercase tracking-wider mb-4">Quick Actions</h2>
                    <div className="flex flex-col gap-1">
                      {[
                        { icon: Plus, label: 'Create Consignment' },
                        { icon: List, label: 'List on Marketplace' },
                        { icon: Send, label: 'Submit RFQ Response' },
                        { icon: Lock, label: 'View Escrow' },
                        { icon: FileCheck, label: 'Upload Shipment Doc' }
                      ].map((action, i) => (
                        <motion.button 
                          key={i} 
                          whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                          className="group flex items-center justify-between h-[44px] px-3 rounded-xl bg-[rgba(255,255,255,0.4)] hover:bg-white border border-transparent hover:border-white/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C73B22]/40 text-left shadow-sm hover:shadow"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[rgba(255,255,255,0.8)] border border-white shadow-sm flex items-center justify-center text-[#1A1A1A] group-hover:text-[#C73B22] group-hover:bg-[#C73B22]/10 transition-colors">
                              <action.icon size={16} />
                            </div>
                            <span className="text-[14px] font-bold text-[#1A1A1A]">{action.label}</span>
                          </div>
                          <ChevronRight size={16} className="text-[#4A4A48] group-hover:text-[#1A1A1A] transition-colors" />
                        </motion.button>
                      ))}
                    </div>
                  </TiltCard>
                </motion.div>

              </div>
            </div>

            {/* Bottom Section - RFQs & Compliance */}
            <div className="grid grid-cols-12 gap-6">
              
              {/* Incoming RFQs */}
              <motion.div variants={itemVariants} className="col-span-7 flex flex-col h-full">
                <TiltCard className="p-6 flex-grow">
                  <h2 className="text-[14px] font-semibold text-[#4A4A48] uppercase tracking-wider mb-6">Incoming RFQs</h2>
                  <div className="flex flex-col gap-3">
                    {[
                      { item: 'Arabica Coffee', qty: '50 MT', party: 'FT-IMP-882', age: '2h ago', rating: 4.9 },
                      { item: 'Cocoa Beans', qty: '120 MT', party: 'FT-IMP-105', age: '5h ago', rating: 4.8 },
                      { item: 'Raw Cotton', qty: '80 MT', party: 'FT-IMP-304', age: '1d ago', rating: 4.5 },
                    ].map((rfq, i) => (
                      <motion.div 
                        key={i} 
                        whileHover={prefersReducedMotion ? {} : { y: -2, scale: 1.005 }}
                        transition={{ duration: 0.15 }}
                        className="flex items-center justify-between p-4 rounded-xl border border-white/60 bg-[rgba(255,255,255,0.4)] hover:bg-[rgba(255,255,255,0.8)] transition-all shadow-sm"
                      >
                        <div className="flex flex-col w-[35%]">
                          <span className="text-[14px] font-bold text-[#1A1A1A] mb-1" style={{ textShadow: '0 1px 0 rgba(255,255,255,0.8)' }}>{rfq.item}</span>
                          <span className="text-[13px] text-[#4A4A48] font-medium">{rfq.qty}</span>
                        </div>
                        <div className="flex flex-col w-[35%]">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[13px] font-mono font-bold text-[#1A1A1A]" style={{ textShadow: '0 1px 0 rgba(255,255,255,0.8)' }}>{rfq.party}</span>
                            <span className="text-[11px] font-bold text-[#D97706]">★ {rfq.rating}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[12px] font-medium text-[#4A4A48]">
                            <Clock size={12} /> {rfq.age}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <motion.button 
                            whileTap={prefersReducedMotion ? {} : { scale: 0.97 }}
                            className="h-[40px] px-4 rounded-xl border border-white bg-[rgba(255,255,255,0.6)] text-[#1A1A1A] hover:bg-white shadow-sm text-[13px] font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C73B22]/40"
                          >
                            Counter
                          </motion.button>
                          <motion.button 
                            whileTap={prefersReducedMotion ? {} : { scale: 0.97 }}
                            className="h-[40px] px-4 rounded-xl border border-[#059669]/20 bg-[#059669]/10 text-[#059669] hover:bg-[#059669]/20 shadow-sm text-[13px] font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#059669]/40"
                          >
                            Accept
                          </motion.button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </TiltCard>
              </motion.div>

              {/* Compliance & Logistics */}
              <div className="col-span-5 flex flex-col gap-6 h-full">
                <motion.div variants={itemVariants}>
                  <TiltCard className="p-6">
                    <h2 className="text-[14px] font-semibold text-[#4A4A48] uppercase tracking-wider mb-6">Compliance Inbox</h2>
                    <div className="flex flex-col gap-5">
                      <ProgressMeter label="KYB renewal" value={80} color={theme.warning} />
                      <ProgressMeter label="Phyto cert" value={40} color={theme.primary} />
                      <ProgressMeter label="BoL upload" value={0} color="#888880" />
                    </div>
                  </TiltCard>
                </motion.div>
                
                <motion.div variants={itemVariants} className="flex-grow">
                  <TiltCard className="p-6 h-full">
                    <h2 className="text-[14px] font-semibold text-[#4A4A48] uppercase tracking-wider mb-6">Active Logistics</h2>
                    <div className="flex flex-col gap-5">
                      {[
                        { route: 'Abidjan → Rotterdam', vessel: 'MSC Rachele', progress: 65, eta: 'Oct 12', status: 'In Transit', color: theme.info },
                        { route: 'Tema → Antwerp', vessel: 'CMA CGM Jade', progress: 10, eta: 'Oct 15', status: 'Customs', color: theme.warning }
                      ].map((log, i) => (
                        <div key={i} className="flex flex-col gap-3">
                          <div className="flex justify-between items-start">
                             <div className="flex flex-col gap-1">
                                <span className="text-[14px] font-bold text-[#1A1A1A]" style={{ textShadow: '0 1px 0 rgba(255,255,255,0.8)' }}>{log.route}</span>
                                <span className="text-[13px] text-[#4A4A48] font-medium flex items-center gap-1.5"><Anchor size={14} className="text-[#1A1A1A]" /> {log.vessel}</span>
                             </div>
                             <div className="flex flex-col items-end gap-1">
                                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider shadow-sm border" style={{ backgroundColor: `${log.color}15`, color: log.color, borderColor: `${log.color}30` }}>
                                  {log.status}
                                </span>
                                <span className="text-[12px] font-bold text-[#4A4A48]">ETA {log.eta}</span>
                             </div>
                          </div>
                          <div className="h-2 w-full rounded-full bg-[rgba(255,255,255,0.6)] overflow-hidden shadow-inner border border-white/20">
                            <motion.div 
                              className="h-full rounded-full" 
                              style={{ backgroundColor: log.color }} 
                              initial={{ width: prefersReducedMotion ? `${log.progress}%` : "0%" }}
                              animate={{ width: `${log.progress}%` }}
                              transition={{ duration: 0.8, ease: "easeOut" }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </TiltCard>
                </motion.div>
              </div>

            </div>

          </motion.div>
        </main>
      </div>
    </div>
  );
}
