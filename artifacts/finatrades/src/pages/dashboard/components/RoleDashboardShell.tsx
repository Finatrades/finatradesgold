import React, { useState, useRef } from 'react';
import { Link } from 'wouter';
import {
  CheckCircle2, AlertCircle, TrendingUp, TrendingDown,
  ArrowUpRight, ShieldCheck, ChevronRight, Activity,
  Wallet, Anchor, ArrowRight, Eye,
  Clock, FileCheck, Info, CircleDot, Circle,
  AlertTriangle, Scale, FileSearch,
} from 'lucide-react';
import {
  Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Line, ComposedChart,
} from 'recharts';
import {
  motion, AnimatePresence, useReducedMotion, useSpring, useTransform, useMotionValue,
} from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { getRoleLabel } from '@/lib/roleMenus';

const theme = {
  primary: '#C73B22',
  primaryHover: '#A82F1B',
  coral: '#E86A4F',
  bg: '#FAFAF8',
  surface: 'rgba(255,255,255,0.10)',
  text: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.78)',
  textMuted: 'rgba(255,255,255,0.55)',
  border: 'rgba(255, 255, 255, 0.18)',
  subtle: 'rgba(255, 255, 255, 0.08)',
  gridline: 'rgba(255,255,255,0.10)',
  success: '#059669',
  warning: '#D97706',
  info: '#2563EB',
  gold: '#D4AF37',
  shadowCard: '0 1px 0 rgba(255,255,255,0.9) inset, 0 12px 32px -12px rgba(26,26,26,0.12), 0 4px 12px -4px rgba(199,59,34,0.06)',
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as any } },
};

// --- Subcomponents ---

const TiltCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  hero?: boolean;
  style?: React.CSSProperties;
}> = ({ children, className = '', hero = false, style = {} }) => {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseXSpring = useSpring(x, { stiffness: 150, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 150, damping: 20 });
  const prefersReducedMotion = useReducedMotion();

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], (prefersReducedMotion ? ['0deg', '0deg'] : ['4deg', '-4deg']) as string[]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], (prefersReducedMotion ? ['0deg', '0deg'] : ['-4deg', '4deg']) as string[]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current || prefersReducedMotion) return;
    const rect = ref.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    x.set(mouseX / rect.width - 0.5);
    y.set(mouseY / rect.height - 0.5);
  };
  const handleMouseLeave = () => { x.set(0); y.set(0); };

  const glassStyle: React.CSSProperties = {
    backdropFilter: hero ? 'blur(28px) saturate(180%)' : 'blur(22px) saturate(180%)',
    WebkitBackdropFilter: hero ? 'blur(28px) saturate(180%)' : 'blur(22px) saturate(180%)',
    background: hero
      ? 'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 100%)'
      : 'linear-gradient(135deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.05) 100%)',
    border: '1px solid rgba(255,255,255,0.22)',
    boxShadow: [
      '0 1px 0 rgba(255,255,255,0.35) inset',
      '0 -1px 0 rgba(255,255,255,0.06) inset',
      '0 18px 40px -16px rgba(40,8,4,0.45)',
      '0 4px 12px -4px rgba(40,8,4,0.25)',
    ].join(', '),
    ...style,
  };

  return (
    <div style={{ perspective: 1200, transformStyle: 'preserve-3d' }} className="w-full h-full">
      <motion.div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ rotateX, rotateY, ...glassStyle } as any}
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

export interface RadialGaugeConfig {
  value: number;
  max: number;
  label: string;
  subLabel: string;
  delta: string;
  color?: string;
}

const RadialGauge: React.FC<RadialGaugeConfig> = ({ value, max, label, subLabel, delta, color = theme.primary }) => {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const percent = max ? (value / max) : (value > 0 ? 1 : 0);
  const targetOffset = circumference - percent * circumference;
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="relative w-[88px] h-[88px] flex items-center justify-center mb-3">
        <svg className="absolute inset-0 w-full h-full transform -rotate-90" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.05))' }}>
          <circle cx="44" cy="44" r={radius} stroke="rgba(255,255,255,0.22)" strokeWidth="10" fill="none" />
          <motion.circle
            cx="44" cy="44" r={radius}
            stroke={color}
            strokeWidth="10"
            fill="none"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: prefersReducedMotion ? targetOffset : circumference }}
            animate={{ strokeDashoffset: targetOffset }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            strokeLinecap="round"
          />
        </svg>
        <div className="flex flex-col items-center z-10 text-center">
          <span className="text-[20px] font-bold text-white tabular-nums leading-none mb-0.5">{value}</span>
        </div>
      </div>
      <div className="flex flex-col items-center text-center">
        <span className="text-[13px] font-semibold text-white mb-0.5">{label}</span>
        <span className="text-[12px] text-white/75 font-medium mb-1.5">{subLabel}</span>
        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-[11px] font-medium">
          {delta.startsWith('+') ? <TrendingUp size={12} color={theme.success} /> : <span className="w-1" />}
          <span style={{ color: delta.startsWith('+') ? theme.success : theme.textSecondary }}>{delta}</span>
        </div>
      </div>
    </div>
  );
};

const Speedometer: React.FC<{ value: number; label?: string }> = ({ value, label = 'Excellent' }) => {
  const radius = 60;
  const circumference = Math.PI * radius;
  const percent = value / 100;
  const targetOffset = circumference - percent * circumference;
  const targetAngle = -90 + (percent * 180);
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="relative w-[140px] h-[80px] overflow-hidden flex flex-col items-center">
      <svg className="w-full h-full absolute inset-0 z-0" viewBox="0 0 140 80" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.05))' }}>
        <path d="M 10 70 A 60 60 0 0 1 130 70" stroke="rgba(255,255,255,0.22)" strokeWidth="14" fill="none" strokeLinecap="round" />
        <motion.path
          d="M 10 70 A 60 60 0 0 1 130 70"
          stroke={theme.success}
          strokeWidth="14"
          fill="none"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: prefersReducedMotion ? targetOffset : circumference }}
          animate={{ strokeDashoffset: targetOffset }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          strokeLinecap="round"
        />
      </svg>
      <motion.div
        className="absolute bottom-1 w-[2px] h-[50px] bg-[#1A1A1A] origin-bottom rounded-full shadow-sm z-10"
        style={{ left: '69px', top: '20px' }}
        initial={{ rotate: prefersReducedMotion ? targetAngle : -90 }}
        animate={{ rotate: targetAngle }}
        transition={{ type: 'spring', stiffness: 60, damping: 14, duration: 0.9 }}
      >
        <div className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 rounded-full bg-[#1A1A1A] border-2 border-white shadow-sm" />
      </motion.div>
      <div className="absolute bottom-0 flex flex-col items-center z-20 translate-y-full pt-2">
        <span className="text-[32px] font-bold text-white tabular-nums leading-none">{value}</span>
        <span className="text-[11px] font-semibold text-white/75 uppercase tracking-wider mt-1">{label}</span>
      </div>
    </div>
  );
};

export interface ProgressMeterConfig {
  label: string;
  value: number;
  color: string;
}

const ProgressMeter: React.FC<ProgressMeterConfig> = ({ label, value, color }) => {
  const prefersReducedMotion = useReducedMotion();
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="flex justify-between items-center text-[13px]">
        <span className="text-white font-medium">{label}</span>
        <span className="text-white font-semibold tabular-nums">{value}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden shadow-inner border border-white/15">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: prefersReducedMotion ? `${value}%` : '0%' }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
};

export interface WalletMeterConfig {
  currency: string;
  total: number;
  available: number;
  locked: number;
  pending: number;
}

const WalletMeter: React.FC<WalletMeterConfig & { delay?: number }> = ({
  currency, total, available, locked, pending, delay = 0,
}) => {
  const totalVal = available + locked + pending || 1;
  const avPct = (available / totalVal) * 100;
  const lkPct = (locked / totalVal) * 100;
  const pdPct = (pending / totalVal) * 100;
  const prefersReducedMotion = useReducedMotion();

  const sym = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '';

  return (
    <div className="flex flex-col gap-2.5 mb-5">
      <div className="flex justify-between items-baseline">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-[12px] font-bold text-white shadow-sm">
            {currency}
          </div>
          <span className="text-[16px] font-bold text-white tabular-nums">
            {sym}{total.toLocaleString()}
          </span>
        </div>
      </div>
      <div className="h-2 w-full flex rounded-full overflow-hidden shadow-inner border border-white/15 bg-white/10">
        <motion.div
          initial={{ width: prefersReducedMotion ? `${avPct}%` : '0%' }}
          animate={{ width: `${avPct}%` }}
          transition={{ duration: 0.7, delay, ease: 'easeOut' }}
          style={{ backgroundColor: theme.primary }}
          className="h-full border-r border-white/30"
        />
        <motion.div
          initial={{ width: prefersReducedMotion ? `${lkPct}%` : '0%' }}
          animate={{ width: `${lkPct}%` }}
          transition={{ duration: 0.7, delay: delay + 0.1, ease: 'easeOut' }}
          style={{ backgroundColor: theme.coral }}
          className="h-full border-r border-white/30"
        />
        <motion.div
          initial={{ width: prefersReducedMotion ? `${pdPct}%` : '0%' }}
          animate={{ width: `${pdPct}%` }}
          transition={{ duration: 0.7, delay: delay + 0.2, ease: 'easeOut' }}
          style={{ backgroundColor: theme.textMuted }}
          className="h-full"
        />
      </div>
      <div className="flex justify-between text-[11px] font-medium uppercase tracking-wider">
        <span className="text-white flex items-center gap-1.5"><div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: theme.primary }} /> Avail: {avPct.toFixed(0)}%</span>
        <span className="text-white flex items-center gap-1.5"><div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: theme.coral }} /> Lock: {lkPct.toFixed(0)}%</span>
        <span className="text-white/75 flex items-center gap-1.5"><div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: theme.textMuted }} /> Pend: {pdPct.toFixed(0)}%</span>
      </div>
    </div>
  );
};

// --- Types for config ---

export interface TabConfig { id: string; label: string }
export interface TradeCase {
  ref: string;
  item: string;
  qty: string;
  party: string;
  rating: number;
  status: 'in-progress' | 'pending' | 'done' | 'disputed';
  step: number;
  escrow: string;
  action: string;
  tag: string;
}
export interface TickerItem { name: string; price: string; delta: string; up: boolean }
export interface CommoditySlice { name: string; value: number; color: string }
export interface RevenuePoint { week: string; rev: number; vol: number }
export interface RfqItem { item: string; qty: string; party: string; age: string; rating: number }
export interface LogisticsItem { route: string; vessel: string; progress: number; eta: string; status: string; color: string }
export interface QuickActionConfig {
  icon: React.ComponentType<{ size?: number | string }>;
  label: string;
  href: string;
}

export interface RoleDashboardConfig {
  roleLabel?: string;
  subtitle?: string;
  kpis: RadialGaugeConfig[];
  tradeHealth: {
    title?: string;
    score: number;
    scoreLabel?: string;
    metrics: ProgressMeterConfig[];
  };
  wallet: {
    title?: string;
    items: WalletMeterConfig[];
    primaryCta?: { label: string; href: string };
    secondaryCta?: { label: string; href: string };
  };
  cases: TradeCase[];
  tabs: TabConfig[];
  casesTitle?: string;
  commodityMix: CommoditySlice[];
  commodityTotalLabel?: string;
  commodityTitle?: string;
  revenueTrend: RevenuePoint[];
  revenueTitle?: string;
  revenueHeadline?: string;
  revenueDelta?: string;
  revenueSeriesLabel?: string;
  volumeSeriesLabel?: string;
  ticker: TickerItem[];
  rfqs: RfqItem[];
  rfqsTitle?: string;
  compliance: ProgressMeterConfig[];
  complianceTitle?: string;
  logistics: LogisticsItem[];
  logisticsTitle?: string;
  quickActions: QuickActionConfig[];
}

// --- Main Shell ---

export default function RoleDashboardShell({ config }: { config: RoleDashboardConfig }) {
  const { user } = useAuth();
  const prefersReducedMotion = useReducedMotion();
  const [activeTab, setActiveTab] = useState(config.tabs[0]?.id || 'All');

  const u = user as any;
  const userName = u?.fullName?.split(' ')[0] || u?.email?.split('@')[0] || 'User';
  const roleLabel = config.roleLabel || getRoleLabel(user);
  const orgName = u?.companyName || u?.organizationName || u?.businessName || null;
  const ftId = u?.customFinatradesId || u?.finatradesId || null;
  const subtitleParts = [orgName, ftId].filter(Boolean) as string[];
  const subtitle = subtitleParts.length > 0 ? subtitleParts.join(' · ') : config.subtitle;

  const filteredCases = config.cases.filter(c => activeTab === 'All' || c.tag === activeTab);
  const counts = config.cases.reduce((acc: Record<string, number>, c) => {
    acc[c.tag] = (acc[c.tag] || 0) + 1;
    acc['All'] = (acc['All'] || 0) + 1;
    return acc;
  }, {});

  const commodityTotal = config.commodityMix.reduce((s, c) => s + c.value, 0);
  const awaitingCount = counts[config.tabs[1]?.id || 'awaiting_action'] || 0;
  const casesTitle = config.casesTitle || 'Active Trade Cases';
  const rfqsTitle = config.rfqsTitle || 'Incoming RFQs';
  const complianceTitle = config.complianceTitle || 'Compliance Inbox';
  const logisticsTitle = config.logisticsTitle || 'Active Logistics';
  const commodityTitle = config.commodityTitle || 'Commodity Mix';
  const revenueTitle = config.revenueTitle || 'Revenue & Volume';

  return (
    <div
      className="relative text-white font-sans selection:bg-white selection:text-[#C73B22]"
      style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
    >

      <div className="relative z-10">
        {/* Welcome row (replaces sticky header) */}
        <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
          <div className="flex flex-col">
            <h1 className="text-[16px] font-semibold text-white leading-tight">Welcome back, {userName}</h1>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-[13px] text-white/75 font-medium">{roleLabel}</span>
              <span className="text-white/55">•</span>
              <span className="text-[13px] text-white/75 font-medium">{subtitle}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#059669]/10 text-[#059669] rounded-full border border-[#059669]/20 shadow-sm">
              <ShieldCheck size={14} />
              <span className="text-[11px] font-semibold uppercase tracking-wider">KYC Approved</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 border border-white/15 px-3 py-1.5 rounded-full shadow-sm">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#059669] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#059669]"></span>
              </span>
              <span className="text-[13px] font-medium text-white">Platform Active</span>
            </div>
          </div>
        </div>

        <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col">
          {/* Ticker */}
          <motion.div variants={itemVariants} className="mb-6">
            <TiltCard className="flex items-center gap-6 px-4 py-3" style={{ borderRadius: '16px' }}>
              <div className="flex items-center gap-2 border-r border-black/10 pr-4 shrink-0">
                <motion.div
                  animate={prefersReducedMotion ? {} : { opacity: [0.8, 1, 0.8] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Activity size={16} color={theme.coral} />
                </motion.div>
                <span className="text-[12px] font-bold text-white uppercase tracking-wider">Live Markets</span>
              </div>
              <div className="flex gap-8 overflow-x-auto no-scrollbar">
                {config.ticker.map((tick, i) => (
                  <div key={i} className="flex items-center gap-3 shrink-0">
                    <span className="text-[13px] font-medium text-white">{tick.name}</span>
                    <span className="text-[14px] font-bold font-mono text-white">{tick.price}</span>
                    <span className={`text-[13px] font-medium flex items-center ${tick.up ? 'text-[#059669]' : 'text-[#D97706]'}`}>
                      {tick.up ? <ArrowUpRight size={14} className="mr-0.5" /> : <TrendingDown size={14} className="mr-0.5" />}
                      {tick.delta}
                    </span>
                  </div>
                ))}
              </div>
            </TiltCard>
          </motion.div>

          {/* Hero panel */}
          <motion.div variants={itemVariants} className="mb-6 z-20">
            <TiltCard hero>
              <div className="p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center relative z-10">
                <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                  {config.kpis.map((k, i) => <RadialGauge key={i} {...k} />)}
                </div>
                <div className="lg:col-span-4 lg:pl-8 lg:border-l border-black/10 lg:h-[280px] flex flex-col justify-center">
                  <div className="flex flex-col items-center w-full">
                    <div className="w-full flex justify-between items-center mb-8 lg:mb-10">
                      <h2 className="text-[14px] font-semibold text-white uppercase tracking-wider">
                        {config.tradeHealth.title || 'Trade Health Score'}
                      </h2>
                      <button className="text-white/75 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C73B22]/40 rounded-full">
                        <Info size={16} />
                      </button>
                    </div>
                    <Speedometer value={config.tradeHealth.score} label={config.tradeHealth.scoreLabel} />
                    <div className="w-full grid grid-cols-2 gap-x-8 gap-y-4 mt-12">
                      {config.tradeHealth.metrics.map((m, i) => <ProgressMeter key={i} {...m} />)}
                    </div>
                  </div>
                </div>
              </div>
            </TiltCard>
          </motion.div>

          {/* Mid grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
            <div className="lg:col-span-8 flex flex-col gap-6">
              {/* Cases */}
              <motion.div variants={itemVariants} className="h-full">
                <TiltCard className="p-6 flex flex-col h-full z-10">
                  <div className="flex justify-between items-end mb-4 flex-wrap gap-3">
                    <div>
                      <h2 className="text-[14px] font-semibold text-white/75 uppercase tracking-wider mb-2">{casesTitle}</h2>
                      <div className="text-[20px] lg:text-[24px] font-bold text-white">
                        {awaitingCount} {awaitingCount === 1 ? 'Case' : 'Cases'} Requiring Action
                      </div>
                    </div>
                    <button className="h-[40px] px-4 text-[14px] font-semibold text-[#C73B22] flex items-center gap-1.5 hover:bg-white/20/[0.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C73B22]/40 rounded-xl transition-colors border border-transparent hover:border-white/15">
                      View all <ArrowRight size={16} />
                    </button>
                  </div>

                  <div role="tablist" aria-label="Cases pipeline" className="flex items-center gap-2 border-b border-black/10 mb-6 overflow-x-auto no-scrollbar">
                    {config.tabs.map((tab) => {
                      const isActive = activeTab === tab.id;
                      const isDisputed = tab.id === 'disputed';
                      const count = counts[tab.id] || 0;
                      return (
                        <button
                          key={tab.id}
                          role="tab"
                          aria-selected={isActive}
                          onClick={() => setActiveTab(tab.id)}
                          className={`relative flex items-center gap-2 h-[40px] px-2 whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C73B22]/40 rounded-t-lg ${
                            isActive ? 'text-white' : 'text-white/75 hover:bg-white/20/40'
                          }`}
                        >
                          <span className={`text-[13px] ${isActive ? 'font-bold' : 'font-semibold'}`}>{tab.label}</span>
                          <div className={`flex items-center justify-center px-1.5 min-w-[20px] h-[20px] rounded-full text-[11px] font-bold tabular-nums shadow-sm border ${
                            isDisputed && count > 0
                              ? 'bg-[#D97706]/20 text-[#D97706] border-[#D97706]/20'
                              : isActive
                                ? 'bg-[#C73B22]/20 text-[#C73B22] border-[#C73B22]/20'
                                : 'bg-white/10 text-white/75 border-white/15'
                          }`}>
                            {isDisputed && count > 0 && <AlertTriangle size={10} className="mr-1" />}
                            {count}
                          </div>
                          {isActive && (
                            <motion.div
                              layoutId="tabUnderline"
                              className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#C73B22]"
                              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div role="tabpanel" className="flex flex-col gap-4">
                    <AnimatePresence mode="popLayout">
                      {filteredCases.length > 0 ? (
                        filteredCases.map((c) => (
                          <motion.div
                            key={c.ref}
                            layout
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.2 } }}
                            whileHover={prefersReducedMotion ? {} : { y: -2, scale: 1.005 }}
                            transition={{ duration: 0.15 }}
                            className="group flex flex-col md:flex-row md:items-center justify-between p-5 rounded-2xl border border-white/15 bg-white/10 hover:bg-white/20 transition-all relative overflow-hidden"
                            style={{ boxShadow: '0 2px 8px rgba(26,26,26,0.04), 0 1px 0 rgba(255,255,255,0.9) inset' }}
                          >
                            {c.tag === 'disputed' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#D97706]" />}

                            <div className="flex flex-col gap-1 w-full md:w-[22%] mb-4 md:mb-0 pl-2 md:pl-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[13px] font-bold font-mono text-white/75">{c.ref}</span>
                                {c.status === 'done' && <CheckCircle2 size={14} className="text-[#059669]" />}
                                {c.status === 'in-progress' && <CircleDot size={14} className="text-[#2563EB]" />}
                                {c.status === 'pending' && <Circle size={14} className="text-[#D97706]" />}
                                {c.status === 'disputed' && <AlertCircle size={14} className="text-[#D97706]" />}
                              </div>
                              <span className="text-[14px] font-bold text-white leading-tight">{c.item}</span>
                              <span className="text-[13px] text-white/75 font-medium">{c.qty}</span>
                            </div>

                            <div className="flex flex-col gap-1 w-full md:w-[20%] mb-4 md:mb-0">
                              <span className="text-[11px] font-semibold text-white/75 uppercase tracking-wider">Counterparty</span>
                              <span className="text-[14px] font-mono font-bold text-white">{c.party}</span>
                              <span className="text-[12px] font-bold text-[#D97706]">★ {c.rating}/5.0</span>
                            </div>

                            <div className="flex flex-col gap-2 w-full md:w-[24%] mb-4 md:mb-0">
                              <span className="text-[11px] font-semibold text-white/75 uppercase tracking-wider">Milestone</span>
                              <div className="flex items-center gap-1 mt-0.5 shadow-inner rounded-full p-0.5 bg-white/10 border border-white/15">
                                <div className={`h-2 flex-1 rounded-l-full ${c.step >= 1 ? 'bg-[#059669]' : 'bg-white/10'}`} />
                                <div className={`h-2 flex-1 ${c.step >= 2 ? 'bg-[#059669]' : 'bg-white/10'}`} />
                                <div className={`h-2 flex-1 rounded-r-full ${c.step >= 3 ? 'bg-[#059669]' : 'bg-white/10'}`} />
                              </div>
                              <div className="flex justify-between items-center text-[11px] font-bold">
                                <span className={c.step >= 1 ? 'text-white' : 'text-white/75'}>Contract</span>
                                <span className={c.step >= 2 ? 'text-white' : 'text-white/75'}>Docs</span>
                                <span className={c.step >= 3 ? 'text-white' : 'text-white/75'}>Settled</span>
                              </div>
                            </div>

                            <div className="flex flex-col w-full md:w-[15%] text-left md:text-right pr-4 mb-4 md:mb-0">
                              <span className="text-[11px] font-semibold text-white/75 uppercase tracking-wider mb-1">Escrow</span>
                              <span className="text-[16px] font-bold text-white tabular-nums">{c.escrow}</span>
                            </div>

                            <div className="flex w-full md:w-auto items-center justify-end gap-3">
                              <button aria-label="View deal" className="h-[40px] w-[40px] flex items-center justify-center rounded-xl border border-white/15 bg-white/10 shadow-sm text-white hover:bg-white/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C73B22]/40">
                                <Eye size={18} />
                              </button>
                              <motion.button
                                whileTap={prefersReducedMotion ? {} : { scale: 0.97 }}
                                className={`h-[40px] px-5 rounded-xl text-[14px] font-semibold transition-colors shadow-sm border focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${
                                  c.tag === 'disputed'
                                    ? 'bg-[#D97706] hover:bg-[#B45309] text-white border-[#B45309] focus-visible:ring-[#D97706]/40'
                                    : c.tag === 'completed'
                                      ? 'bg-white/10 border-white text-white hover:bg-white/20 focus-visible:ring-white/40'
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
                          className="flex flex-col items-center justify-center py-10 px-4 text-center rounded-2xl border border-dashed border-black/10 bg-white/10 h-[120px]"
                        >
                          {activeTab === 'disputed' ? (
                            <Scale size={24} className="text-white/75 mb-3" />
                          ) : activeTab === 'completed' ? (
                            <FileCheck size={24} className="text-white/75 mb-3" />
                          ) : (
                            <FileSearch size={24} className="text-white/75 mb-3" />
                          )}
                          <h3 className="text-[14px] font-bold text-white">
                            {activeTab === 'disputed' ? 'No disputed items — nice work' : 'No items in this stage'}
                          </h3>
                          <p className="text-[13px] text-white/75 font-medium mt-1">
                            {activeTab === 'disputed' ? 'All your transactions are running smoothly.' : 'There are currently no items matching this filter.'}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </TiltCard>
              </motion.div>

              {/* Revenue chart */}
              <motion.div variants={itemVariants}>
                <TiltCard className="p-6">
                  <div className="flex justify-between items-start mb-6 flex-wrap gap-3">
                    <div>
                      <h2 className="text-[14px] font-semibold text-white/75 uppercase tracking-wider mb-2">{revenueTitle}</h2>
                      <div className="flex items-baseline gap-3">
                        <span className="text-[28px] font-bold text-white tabular-nums">
                          {config.revenueHeadline || '$3.4M'}
                        </span>
                        {config.revenueDelta && (
                          <div className="flex items-center gap-1 text-[14px] font-bold text-[#059669] bg-[#059669]/10 px-2 py-1 rounded-md border border-[#059669]/20 shadow-sm">
                            <TrendingUp size={16} /> {config.revenueDelta}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex items-center gap-2 text-[13px] font-bold text-white">
                        <div className="w-3 h-3 rounded-full bg-[#C73B22] shadow-sm" /> {config.revenueSeriesLabel || 'Revenue ($)'}
                      </div>
                      <div className="flex items-center gap-2 text-[13px] font-bold text-white">
                        <div className="w-3 h-3 rounded-full bg-[#2563EB] shadow-sm" /> {config.volumeSeriesLabel || 'Volume (MT)'}
                      </div>
                    </div>
                  </div>
                  <div className="h-[280px] w-full bg-white/10 rounded-2xl p-4 border border-black/5 shadow-inner">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={config.revenueTrend} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={theme.primary} stopOpacity={0.15} />
                            <stop offset="95%" stopColor={theme.primary} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.gridline} />
                        <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: theme.textSecondary, fontWeight: 600 }} dy={10} />
                        <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: theme.textSecondary, fontWeight: 600 }} tickFormatter={(val) => `$${val / 1000000}M`} />
                        <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: theme.textSecondary, fontWeight: 600 }} tickFormatter={(val) => `${val}`} />
                        <Tooltip
                          contentStyle={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(40,8,4,0.92)', backdropFilter: 'blur(12px)', boxShadow: '0 8px 24px rgba(0,0,0,0.35)', fontSize: '13px', fontFamily: 'Inter', padding: '12px', color: '#FFFFFF' }}
                          itemStyle={{ fontWeight: 600, paddingTop: '4px' }}
                          labelStyle={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700, textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}
                          formatter={(val: number, name: string) => [name === 'rev' ? `$${val.toLocaleString()}` : `${val} MT`, name === 'rev' ? 'Revenue' : 'Volume']}
                        />
                        <Area yAxisId="left" type="monotone" dataKey="rev" name="Revenue" stroke={theme.primary} strokeWidth={3} fill="url(#colorRev)" animationDuration={1000} />
                        <Line yAxisId="right" type="monotone" dataKey="vol" name="Volume" stroke={theme.info} strokeWidth={2} dot={false} animationDuration={1000} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </TiltCard>
              </motion.div>
            </div>

            {/* Right rail */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              {/* Wallet */}
              <motion.div variants={itemVariants}>
                <TiltCard className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-[14px] font-semibold text-white/75 uppercase tracking-wider">{config.wallet.title || 'Treasury Wallets'}</h2>
                    <Wallet size={18} className="text-white" />
                  </div>
                  <div className="flex flex-col gap-2">
                    {config.wallet.items.map((w, i) => (
                      <WalletMeter key={w.currency} {...w} delay={0.1 + i * 0.1} />
                    ))}
                  </div>
                  <div className="mt-6 flex flex-col gap-3">
                    {config.wallet.primaryCta && (
                      <Link href={config.wallet.primaryCta.href}>
                        <a className="h-[44px] w-full bg-[#C73B22] hover:bg-[#A82F1B] text-white rounded-xl text-[14px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C73B22]/40 shadow-sm border border-[#A82F1B] flex items-center justify-center">
                          {config.wallet.primaryCta.label}
                        </a>
                      </Link>
                    )}
                    {config.wallet.secondaryCta && (
                      <Link href={config.wallet.secondaryCta.href}>
                        <a className="h-[44px] w-full bg-white/10 border border-white/15 hover:bg-white/20 text-white rounded-xl text-[14px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C73B22]/40 shadow-sm flex items-center justify-center">
                          {config.wallet.secondaryCta.label}
                        </a>
                      </Link>
                    )}
                  </div>
                </TiltCard>
              </motion.div>

              {/* Commodity mix */}
              <motion.div variants={itemVariants}>
                <TiltCard className="p-6">
                  <h2 className="text-[14px] font-semibold text-white/75 uppercase tracking-wider mb-6">{commodityTitle}</h2>
                  <div className="relative h-[200px] w-full flex items-center justify-center bg-white/10 rounded-2xl border border-black/5 shadow-inner">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={config.commodityMix} cx="50%" cy="50%" innerRadius={70} outerRadius={95} paddingAngle={4} dataKey="value" stroke="none" animationDuration={1000}>
                          {config.commodityMix.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(40,8,4,0.92)', backdropFilter: 'blur(12px)', boxShadow: '0 8px 24px rgba(0,0,0,0.35)', fontSize: '13px', color: '#FFFFFF' }}
                          itemStyle={{ color: '#FFFFFF', fontWeight: 600 }}
                          formatter={(val) => `${val} MT`}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[24px] font-bold text-white">{commodityTotal.toLocaleString()}</span>
                      <span className="text-[12px] font-bold text-white/75">{config.commodityTotalLabel || 'TOTAL MT'}</span>
                    </div>
                  </div>
                  <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-3">
                    {config.commodityMix.map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-[13px]">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full shadow-sm border border-white/15" style={{ backgroundColor: item.color }} />
                          <span className="text-white font-bold">{item.name}</span>
                        </div>
                        <span className="font-bold text-white tabular-nums">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </TiltCard>
              </motion.div>

              {/* Quick actions */}
              <motion.div variants={itemVariants}>
                <TiltCard className="p-6">
                  <h2 className="text-[14px] font-semibold text-white/75 uppercase tracking-wider mb-4">Quick Actions</h2>
                  <div className="flex flex-col gap-1">
                    {config.quickActions.map((action, i) => {
                      const Icon = action.icon;
                      return (
                        <Link key={i} href={action.href}>
                          <a className="group flex items-center justify-between h-[44px] px-3 rounded-xl bg-white/10 hover:bg-white/20 border border-transparent hover:border-white/15 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C73B22]/40 text-left shadow-sm hover:shadow">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-white/10 border border-white/15 shadow-sm flex items-center justify-center text-white group-hover:text-[#C73B22] group-hover:bg-[#C73B22]/10 transition-colors">
                                <Icon size={16} />
                              </div>
                              <span className="text-[14px] font-bold text-white">{action.label}</span>
                            </div>
                            <ChevronRight size={16} className="text-white/75 group-hover:text-white transition-colors" />
                          </a>
                        </Link>
                      );
                    })}
                  </div>
                </TiltCard>
              </motion.div>
            </div>
          </div>

          {/* Bottom grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <motion.div variants={itemVariants} className="lg:col-span-7 flex flex-col h-full">
              <TiltCard className="p-6 flex-grow">
                <h2 className="text-[14px] font-semibold text-white/75 uppercase tracking-wider mb-6">{rfqsTitle}</h2>
                <div className="flex flex-col gap-3">
                  {config.rfqs.map((rfq, i) => (
                    <motion.div
                      key={i}
                      whileHover={prefersReducedMotion ? {} : { y: -2, scale: 1.005 }}
                      transition={{ duration: 0.15 }}
                      className="flex items-center justify-between p-4 rounded-xl border border-white/15 bg-white/10 hover:bg-white/20 transition-all shadow-sm flex-wrap gap-3"
                    >
                      <div className="flex flex-col w-[35%] min-w-[140px]">
                        <span className="text-[14px] font-bold text-white mb-1">{rfq.item}</span>
                        <span className="text-[13px] text-white/75 font-medium">{rfq.qty}</span>
                      </div>
                      <div className="flex flex-col w-[35%] min-w-[140px]">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[13px] font-mono font-bold text-white">{rfq.party}</span>
                          <span className="text-[11px] font-bold text-[#D97706]">★ {rfq.rating}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[12px] font-medium text-white/75">
                          <Clock size={12} /> {rfq.age}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button className="h-[40px] px-4 rounded-xl border border-white/15 bg-white/10 text-white hover:bg-white/20 shadow-sm text-[13px] font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C73B22]/40">
                          Counter
                        </button>
                        <button className="h-[40px] px-4 rounded-xl border border-[#059669]/20 bg-[#059669]/10 text-[#059669] hover:bg-[#059669]/20 shadow-sm text-[13px] font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#059669]/40">
                          Accept
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </TiltCard>
            </motion.div>

            <div className="lg:col-span-5 flex flex-col gap-6 h-full">
              <motion.div variants={itemVariants}>
                <TiltCard className="p-6">
                  <h2 className="text-[14px] font-semibold text-white/75 uppercase tracking-wider mb-6">{complianceTitle}</h2>
                  <div className="flex flex-col gap-5">
                    {config.compliance.map((c, i) => <ProgressMeter key={i} {...c} />)}
                  </div>
                </TiltCard>
              </motion.div>

              <motion.div variants={itemVariants} className="flex-grow">
                <TiltCard className="p-6 h-full">
                  <h2 className="text-[14px] font-semibold text-white/75 uppercase tracking-wider mb-6">{logisticsTitle}</h2>
                  <div className="flex flex-col gap-5">
                    {config.logistics.map((log, i) => (
                      <div key={i} className="flex flex-col gap-3">
                        <div className="flex justify-between items-start flex-wrap gap-2">
                          <div className="flex flex-col gap-1">
                            <span className="text-[14px] font-bold text-white">{log.route}</span>
                            <span className="text-[13px] text-white/75 font-medium flex items-center gap-1.5"><Anchor size={14} className="text-white" /> {log.vessel}</span>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider shadow-sm border" style={{ backgroundColor: `${log.color}15`, color: log.color, borderColor: `${log.color}30` }}>
                              {log.status}
                            </span>
                            <span className="text-[12px] font-bold text-white/75">ETA {log.eta}</span>
                          </div>
                        </div>
                        <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden shadow-inner border border-white/15">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: log.color }}
                            initial={{ width: prefersReducedMotion ? `${log.progress}%` : '0%' }}
                            animate={{ width: `${log.progress}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
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
      </div>
    </div>
  );
}

export const dashboardTheme = theme;
