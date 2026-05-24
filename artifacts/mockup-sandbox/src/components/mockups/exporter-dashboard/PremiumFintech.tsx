import React, { useState } from 'react';
import { 
  CheckCircle2, AlertCircle, XCircle, TrendingUp, TrendingDown, 
  ArrowUpRight, ShieldCheck, ChevronRight, Activity, 
  Package, DollarSign, Wallet, FileText, Anchor, Settings, Plus,
  List, Send, FileSearch, ArrowRight, Eye, ShieldAlert,
  Clock, Lock, Globe, FileCheck, Info, Check, CircleDot, Circle
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, Legend 
} from 'recharts';

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
  border: '#E8E2DC',
  subtle: '#F5F0EB',
  gridline: '#F0EBE5',
  success: '#059669',
  warning: '#D97706',
  info: '#2563EB',
  gold: '#D4AF37',
  shadowCard: '0 1px 2px rgba(26,26,26,0.04), 0 4px 12px rgba(26,26,26,0.04)',
  shadowHover: '0 4px 6px rgba(26,26,26,0.04), 0 12px 24px rgba(26,26,26,0.06)',
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
  { ref: 'FT-TRD-082', item: 'Cocoa Beans (Grade A)', qty: '200 MT', party: 'FT-IMP-104', rating: 4.8, status: 'in-progress', step: 2, escrow: '$450,000', action: 'Approve Doc' },
  { ref: 'FT-TRD-091', item: 'Raw Cotton', qty: '150 MT', party: 'FT-IMP-201', rating: 4.5, status: 'pending', step: 1, escrow: '$210,000', action: 'Sign Contract' },
  { ref: 'FT-TRD-103', item: 'Arabica Coffee', qty: '80 MT', party: 'FT-IMP-099', rating: 4.9, status: 'done', step: 3, escrow: '$180,000', action: 'Release Funds' },
];

const tickerData = [
  { name: 'Cocoa', price: '$8,420', delta: '+1.2%', up: true },
  { name: 'Coffee', price: '$214.50', delta: '-0.8%', up: false },
  { name: 'Cotton', price: '$88.20', delta: '+0.5%', up: true },
  { name: 'Gold', price: '$2,340', delta: '+2.1%', up: true },
];

// --- Subcomponents ---

const RadialGauge = ({ value, max, label, subLabel, delta, color = theme.primary }) => {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const percent = max ? (value / max) : (value > 0 ? 1 : 0);
  const offset = circumference - percent * circumference;

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="relative w-[88px] h-[88px] flex items-center justify-center mb-3">
        <svg className="absolute inset-0 w-full h-full transform -rotate-90">
          <circle cx="44" cy="44" r={radius} stroke={theme.subtle} strokeWidth="10" fill="none" />
          <circle 
            cx="44" cy="44" r={radius} 
            stroke={color} 
            strokeWidth="10" 
            fill="none" 
            strokeDasharray={circumference} 
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="flex flex-col items-center z-10 text-center">
          <span className="text-[20px] font-bold text-[#1A1A1A] tabular-nums leading-none mb-0.5">{value}</span>
        </div>
      </div>
      <div className="flex flex-col items-center">
        <span className="text-[13px] font-semibold text-[#1A1A1A] mb-0.5">{label}</span>
        <span className="text-[12px] text-[#4A4A48] font-medium mb-1.5">{subLabel}</span>
        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FAFAF8] border border-[#E8E2DC] text-[11px] font-medium">
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
  const offset = circumference - percent * circumference;

  return (
    <div className="relative w-[140px] h-[80px] overflow-hidden flex flex-col items-center">
      <svg className="w-full h-full" viewBox="0 0 140 80">
        <path d="M 10 70 A 60 60 0 0 1 130 70" stroke={theme.subtle} strokeWidth="14" fill="none" strokeLinecap="round" />
        <path 
          d="M 10 70 A 60 60 0 0 1 130 70" 
          stroke={theme.success} 
          strokeWidth="14" 
          fill="none" 
          strokeDasharray={circumference} 
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute bottom-1 flex flex-col items-center">
        <span className="text-[32px] font-bold text-[#1A1A1A] tabular-nums leading-none">{value}</span>
        <span className="text-[11px] font-semibold text-[#888880] uppercase tracking-wider mt-1">Excellent</span>
      </div>
    </div>
  );
};

const ProgressMeter = ({ label, value, color }) => (
  <div className="flex flex-col gap-1.5 w-full">
    <div className="flex justify-between items-center text-[13px]">
      <span className="text-[#4A4A48] font-medium">{label}</span>
      <span className="text-[#1A1A1A] font-semibold tabular-nums">{value}%</span>
    </div>
    <div className="h-1.5 w-full rounded-full bg-[#F0EBE5] overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${value}%`, backgroundColor: color }} />
    </div>
  </div>
);

const WalletMeter = ({ currency, total, available, locked, pending }) => {
  const totalVal = available + locked + pending;
  const avPct = (available / totalVal) * 100;
  const lkPct = (locked / totalVal) * 100;
  const pdPct = (pending / totalVal) * 100;

  return (
    <div className="flex flex-col gap-2.5 mb-5">
      <div className="flex justify-between items-baseline">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[#F5F0EB] border border-[#E8E2DC] flex items-center justify-center text-[12px] font-bold text-[#1A1A1A]">
            {currency}
          </div>
          <span className="text-[16px] font-bold text-[#1A1A1A] tabular-nums">
            {currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '£'}
            {total.toLocaleString()}
          </span>
        </div>
      </div>
      <div className="h-2 w-full flex rounded-full overflow-hidden">
        <div style={{ width: `${avPct}%`, backgroundColor: theme.primary }} className="h-full border-r border-[#FFFFFF]" />
        <div style={{ width: `${lkPct}%`, backgroundColor: theme.coral }} className="h-full border-r border-[#FFFFFF]" />
        <div style={{ width: `${pdPct}%`, backgroundColor: theme.subtle }} className="h-full" />
      </div>
      <div className="flex justify-between text-[11px] font-medium uppercase tracking-wider">
        <span className="text-[#4A4A48] flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{backgroundColor: theme.primary}}/> Avail: {avPct.toFixed(0)}%</span>
        <span className="text-[#4A4A48] flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{backgroundColor: theme.coral}}/> Lock: {lkPct.toFixed(0)}%</span>
        <span className="text-[#888880] flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{backgroundColor: theme.subtle}}/> Pend: {pdPct.toFixed(0)}%</span>
      </div>
    </div>
  );
};

// --- Main Dashboard Component ---

export default function PremiumFintech() {
  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#1A1A1A] font-sans selection:bg-[#C73B22] selection:text-white" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 bg-[#FFFFFF]/90 backdrop-blur-md border-b border-[#E8E2DC] px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <h1 className="text-[16px] font-semibold text-[#1A1A1A] leading-tight">Welcome back, Charan</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[13px] text-[#4A4A48]">Exporter</span>
              <span className="text-[#E8E2DC]">•</span>
              <span className="text-[13px] text-[#4A4A48]">Raminvest Holding DIFC</span>
              <span className="text-[#E8E2DC]">•</span>
              <span className="text-[12px] text-[#888880] font-mono tracking-tight">FT-EXP-04821</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#059669]/10 text-[#059669] rounded-full border border-[#059669]/20">
            <ShieldCheck size={14} />
            <span className="text-[11px] font-semibold uppercase tracking-wider">Corporate KYC Approved</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#059669] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#059669]"></span>
            </span>
            <span className="text-[13px] font-medium text-[#4A4A48]">Platform Active</span>
          </div>
          <button aria-label="Settings" className="p-2 w-10 h-10 flex items-center justify-center text-[#4A4A48] hover:text-[#1A1A1A] hover:bg-[#F5F0EB] rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#C73B22]/40">
            <Settings size={20} />
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <main className="max-w-[1280px] mx-auto px-6 py-6 pb-24">
        
        {/* Ticker Strip */}
        <div className="flex items-center gap-6 mb-6 bg-[#FFFFFF] border border-[#E8E2DC] rounded-2xl px-4 py-2" style={{ boxShadow: theme.shadowCard }}>
          <div className="flex items-center gap-2 border-r border-[#E8E2DC] pr-4 shrink-0">
            <Activity size={16} color={theme.coral} />
            <span className="text-[12px] font-bold text-[#1A1A1A] uppercase tracking-wider">Live Markets</span>
          </div>
          <div className="flex gap-8 overflow-x-auto no-scrollbar shrink-0">
            {tickerData.map((tick, i) => (
              <div key={i} className="flex items-center gap-3 shrink-0">
                <span className="text-[13px] font-medium text-[#4A4A48]">{tick.name}</span>
                <span className="text-[14px] font-bold font-mono text-[#1A1A1A]">{tick.price}</span>
                <span className={`text-[13px] font-medium flex items-center ${tick.up ? 'text-[#059669]' : 'text-[#D97706]'}`}>
                  {tick.up ? <ArrowUpRight size={14} className="mr-0.5" /> : <TrendingDown size={14} className="mr-0.5" />}
                  {tick.delta}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Composite Hero Panel */}
        <section className="bg-gradient-to-br from-[#FFFFFF] to-[#FAFAF8] rounded-3xl border border-[#E8E2DC] p-8 mb-6 relative overflow-hidden" style={{ boxShadow: theme.shadowCard }}>
          <div className="absolute inset-0 bg-[#C73B22] opacity-[0.02] pointer-events-none mix-blend-multiply" />
          <div className="grid grid-cols-12 gap-8 items-center relative z-10">
            
            {/* KPI Rings */}
            <div className="col-span-8 grid grid-cols-4 gap-4">
              <RadialGauge value={8} max={12} label="Consignments" subLabel="8/12 Active" delta="+2 this week" color={theme.primary} />
              <RadialGauge value={1240} max={2000} label="Verified Inventory" subLabel="1,240/2k MT" delta="62%" color={theme.info} />
              <RadialGauge value={12} max={0} label="Open RFQs" subLabel="12 Active" delta="+3 today" color={theme.warning} />
              <RadialGauge value={4.2} max={6.0} label="Escrow Locked" subLabel="$4.2M/$6M Comm" delta="70%" color={theme.success} />
            </div>

            {/* Trade Health */}
            <div className="col-span-4 pl-8 border-l border-[#E8E2DC] h-full flex flex-col justify-center">
              <div className="flex flex-col items-center">
                <div className="w-full flex justify-between items-center mb-6">
                  <h2 className="text-[14px] font-semibold text-[#888880] uppercase tracking-wider">Trade Health Score</h2>
                  <Info size={16} className="text-[#888880] cursor-pointer" />
                </div>
                <Speedometer value={87} />
                
                <div className="w-full grid grid-cols-2 gap-x-8 gap-y-4 mt-6">
                  <ProgressMeter label="On-time delivery" value={92} color={theme.success} />
                  <ProgressMeter label="Compliance" value={95} color={theme.success} />
                  <ProgressMeter label="Counterparty rating" value={94} color={theme.primary} />
                  <ProgressMeter label="Doc completeness" value={78} color={theme.warning} />
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* Mid Section Grid */}
        <div className="grid grid-cols-12 gap-6 mb-6">
          
          {/* Main Content Area */}
          <div className="col-span-8 flex flex-col gap-6">
            
            {/* Active Trade Cases */}
            <section className="bg-[#FFFFFF] rounded-3xl border border-[#E8E2DC] p-6 flex flex-col" style={{ boxShadow: theme.shadowCard }}>
              <div className="flex justify-between items-end mb-6">
                <div>
                  <h2 className="text-[14px] font-semibold text-[#888880] uppercase tracking-wider mb-2">Active Trade Cases</h2>
                  <div className="text-[24px] font-bold text-[#1A1A1A]">3 Cases Requiring Action</div>
                </div>
                <button className="h-[40px] px-4 text-[14px] font-semibold text-[#C73B22] flex items-center gap-1.5 hover:bg-[#F5F0EB] focus:outline-none focus:ring-2 focus:ring-[#C73B22]/40 rounded-xl transition-colors border border-transparent hover:border-[#E8E2DC]">
                  View all <ArrowRight size={16} />
                </button>
              </div>

              <div className="flex flex-col gap-4">
                {cases.map((c, i) => (
                  <div key={i} className="group flex flex-col md:flex-row md:items-center justify-between p-5 rounded-2xl border border-[#E8E2DC] bg-[#FAFAF8] hover:bg-[#FFFFFF] hover:border-[#DDD5CC] transition-all" style={{ boxShadow: '0 2px 8px rgba(26,26,26,0.02)' }}>
                    
                    <div className="flex flex-col gap-1 w-full md:w-[22%] mb-4 md:mb-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[13px] font-medium font-mono text-[#888880]">{c.ref}</span>
                        {c.status === 'done' && <CheckCircle2 size={14} className="text-[#059669]" />}
                        {c.status === 'in-progress' && <CircleDot size={14} className="text-[#2563EB]" />}
                        {c.status === 'pending' && <Circle size={14} className="text-[#D97706]" />}
                      </div>
                      <span className="text-[14px] font-bold text-[#1A1A1A] leading-tight">{c.item}</span>
                      <span className="text-[13px] text-[#4A4A48]">{c.qty}</span>
                    </div>

                    <div className="flex flex-col gap-1 w-full md:w-[20%] mb-4 md:mb-0">
                      <span className="text-[11px] font-semibold text-[#888880] uppercase tracking-wider">Counterparty</span>
                      <span className="text-[14px] font-mono font-medium text-[#1A1A1A]">{c.party}</span>
                      <span className="text-[12px] font-medium text-[#D97706]">★ {c.rating}/5.0</span>
                    </div>

                    <div className="flex flex-col gap-2 w-full md:w-[24%] mb-4 md:mb-0">
                      <span className="text-[11px] font-semibold text-[#888880] uppercase tracking-wider">Milestone</span>
                      <div className="flex items-center gap-1 mt-0.5">
                        <div className={`h-2 flex-1 rounded-l-full ${c.step >= 1 ? 'bg-[#059669]' : 'bg-[#E8E2DC]'}`} />
                        <div className={`h-2 flex-1 ${c.step >= 2 ? 'bg-[#059669]' : 'bg-[#E8E2DC]'}`} />
                        <div className={`h-2 flex-1 rounded-r-full ${c.step >= 3 ? 'bg-[#059669]' : 'bg-[#E8E2DC]'}`} />
                      </div>
                      <div className="flex justify-between items-center text-[11px] font-semibold">
                        <span className={c.step >= 1 ? 'text-[#1A1A1A]' : 'text-[#888880]'}>Contract</span>
                        <span className={c.step >= 2 ? 'text-[#1A1A1A]' : 'text-[#888880]'}>Docs</span>
                        <span className={c.step >= 3 ? 'text-[#1A1A1A]' : 'text-[#888880]'}>Settled</span>
                      </div>
                    </div>

                    <div className="flex flex-col w-full md:w-[15%] text-left md:text-right pr-4 mb-4 md:mb-0">
                      <span className="text-[11px] font-semibold text-[#888880] uppercase tracking-wider mb-1">Escrow</span>
                      <span className="text-[16px] font-bold text-[#1A1A1A] tabular-nums">{c.escrow}</span>
                    </div>

                    <div className="flex w-full md:w-auto items-center justify-end gap-3">
                      <button aria-label="View deal" className="h-[40px] w-[40px] flex items-center justify-center rounded-xl border border-[#E8E2DC] text-[#4A4A48] hover:bg-[#F5F0EB] hover:text-[#1A1A1A] transition-colors focus:outline-none focus:ring-2 focus:ring-[#C73B22]/40">
                        <Eye size={18} />
                      </button>
                      <button className="h-[40px] px-5 rounded-xl bg-[#C73B22] hover:bg-[#A82F1B] text-white text-[14px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#C73B22]/40 focus:ring-offset-2">
                        {c.action}
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            </section>

            {/* Revenue & Volume Chart */}
            <section className="bg-[#FFFFFF] rounded-3xl border border-[#E8E2DC] p-6" style={{ boxShadow: theme.shadowCard }}>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-[14px] font-semibold text-[#888880] uppercase tracking-wider mb-2">Revenue & Volume</h2>
                  <div className="flex items-baseline gap-3">
                    <span className="text-[28px] font-bold text-[#1A1A1A] tabular-nums">$3.4M</span>
                    <div className="flex items-center gap-1 text-[14px] font-semibold text-[#059669] bg-[#059669]/10 px-2 py-1 rounded-md">
                      <TrendingUp size={16} /> +12%
                    </div>
                  </div>
                </div>
                <div className="flex gap-4">
                   <div className="flex items-center gap-2 text-[13px] font-medium text-[#4A4A48]">
                     <div className="w-3 h-3 rounded-full bg-[#C73B22]" /> Revenue ($)
                   </div>
                   <div className="flex items-center gap-2 text-[13px] font-medium text-[#4A4A48]">
                     <div className="w-3 h-3 rounded-full bg-[#2563EB]" /> Volume (MT)
                   </div>
                </div>
              </div>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={theme.primary} stopOpacity={0.15}/>
                        <stop offset="95%" stopColor={theme.primary} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.gridline} />
                    <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: theme.textMuted, fontWeight: 500 }} dy={10} />
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: theme.textMuted, fontWeight: 500 }} tickFormatter={(val) => `$${val/1000000}M`} />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: theme.textMuted, fontWeight: 500 }} tickFormatter={(val) => `${val}`} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: '1px solid #E8E2DC', boxShadow: theme.shadowCard, fontSize: '13px', fontFamily: 'Inter', padding: '12px' }}
                      itemStyle={{ fontWeight: 600, paddingTop: '4px' }}
                      labelStyle={{ color: '#888880', fontWeight: 600, textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}
                      formatter={(val, name) => [name === 'rev' ? `$${val.toLocaleString()}` : `${val} MT`, name === 'rev' ? 'Revenue' : 'Volume']}
                    />
                    <Area yAxisId="left" type="monotone" dataKey="rev" name="Revenue" stroke={theme.primary} strokeWidth={3} fill="url(#colorRev)" animationDuration={500} />
                    <Line yAxisId="right" type="monotone" dataKey="vol" name="Volume" stroke={theme.info} strokeWidth={2} dot={false} animationDuration={500} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>

          </div>

          {/* Right Rail */}
          <div className="col-span-4 flex flex-col gap-6">
            
            {/* Multi-currency Wallet */}
            <section className="bg-[#FFFFFF] rounded-3xl border border-[#E8E2DC] p-6" style={{ boxShadow: theme.shadowCard }}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-[14px] font-semibold text-[#888880] uppercase tracking-wider">Treasury Wallets</h2>
                <Wallet size={18} className="text-[#888880]" />
              </div>
              
              <div className="flex flex-col gap-2">
                <WalletMeter currency="USD" total={4200500} available={1200000} locked={2800000} pending={200500} />
                <WalletMeter currency="EUR" total={1850000} available={850000} locked={900000} pending={100000} />
              </div>
              
              <div className="mt-6 flex flex-col gap-3">
                <button className="h-[44px] w-full bg-[#C73B22] hover:bg-[#A82F1B] text-white rounded-xl text-[14px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#C73B22]/40">
                  Open wallet
                </button>
                <button className="h-[44px] w-full bg-transparent border border-[#E8E2DC] hover:bg-[#FAFAF8] text-[#1A1A1A] rounded-xl text-[14px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#C73B22]/40">
                  View FX rates
                </button>
              </div>
            </section>

            {/* Commodity Mix */}
            <section className="bg-[#FFFFFF] rounded-3xl border border-[#E8E2DC] p-6" style={{ boxShadow: theme.shadowCard }}>
              <h2 className="text-[14px] font-semibold text-[#888880] uppercase tracking-wider mb-6">Commodity Mix</h2>
              <div className="relative h-[200px] w-full flex items-center justify-center">
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
                      animationDuration={500}
                    >
                      {commodityMix.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: '1px solid #E8E2DC', boxShadow: theme.shadowCard, fontSize: '13px' }}
                      itemStyle={{ color: '#1A1A1A', fontWeight: 600 }}
                      formatter={(val) => `${val} MT`}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[24px] font-bold text-[#1A1A1A]">1,240</span>
                  <span className="text-[12px] font-semibold text-[#888880]">TOTAL MT</span>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-3">
                {commodityMix.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-[13px]">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-[#4A4A48] font-medium">{item.name}</span>
                    </div>
                    <span className="font-semibold text-[#1A1A1A] tabular-nums">{item.value}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Quick Actions */}
            <section className="bg-[#FFFFFF] rounded-3xl border border-[#E8E2DC] p-6" style={{ boxShadow: theme.shadowCard }}>
              <h2 className="text-[14px] font-semibold text-[#888880] uppercase tracking-wider mb-4">Quick Actions</h2>
              <div className="flex flex-col gap-1">
                {[
                  { icon: Plus, label: 'Create Consignment' },
                  { icon: List, label: 'List on Marketplace' },
                  { icon: Send, label: 'Submit RFQ Response' },
                  { icon: Lock, label: 'View Escrow' },
                  { icon: FileCheck, label: 'Upload Shipment Doc' }
                ].map((action, i) => (
                  <button key={i} className="group flex items-center justify-between h-[44px] px-3 rounded-xl hover:bg-[#FAFAF8] transition-colors focus:outline-none focus:ring-2 focus:ring-[#C73B22]/40 text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#F5F0EB] flex items-center justify-center text-[#4A4A48] group-hover:text-[#C73B22] group-hover:bg-[#C73B22]/10 transition-colors">
                        <action.icon size={16} />
                      </div>
                      <span className="text-[14px] font-medium text-[#1A1A1A]">{action.label}</span>
                    </div>
                    <ChevronRight size={16} className="text-[#888880] group-hover:text-[#1A1A1A] transition-colors" />
                  </button>
                ))}
              </div>
            </section>

          </div>
        </div>

        {/* Bottom Section - RFQs & Compliance */}
        <div className="grid grid-cols-12 gap-6">
          
          {/* Incoming RFQs */}
          <div className="col-span-7 flex flex-col h-full">
            <section className="bg-[#FFFFFF] rounded-3xl border border-[#E8E2DC] p-6 flex-grow" style={{ boxShadow: theme.shadowCard }}>
              <h2 className="text-[14px] font-semibold text-[#888880] uppercase tracking-wider mb-6">Incoming RFQs</h2>
              <div className="flex flex-col gap-3">
                {[
                  { item: 'Arabica Coffee', qty: '50 MT', party: 'FT-IMP-882', age: '2h ago', rating: 4.9 },
                  { item: 'Cocoa Beans', qty: '120 MT', party: 'FT-IMP-105', age: '5h ago', rating: 4.8 },
                  { item: 'Raw Cotton', qty: '80 MT', party: 'FT-IMP-304', age: '1d ago', rating: 4.5 },
                ].map((rfq, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-[#E8E2DC] bg-[#FAFAF8] hover:bg-[#FFFFFF] transition-colors">
                    <div className="flex flex-col w-[35%]">
                      <span className="text-[14px] font-semibold text-[#1A1A1A] mb-1">{rfq.item}</span>
                      <span className="text-[13px] text-[#4A4A48]">{rfq.qty}</span>
                    </div>
                    <div className="flex flex-col w-[35%]">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[13px] font-mono font-medium text-[#1A1A1A]">{rfq.party}</span>
                        <span className="text-[11px] font-medium text-[#D97706]">★ {rfq.rating}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[12px] text-[#888880]">
                        <Clock size={12} /> {rfq.age}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="h-[40px] px-4 rounded-xl border border-[#E8E2DC] text-[#1A1A1A] hover:bg-[#F5F0EB] text-[13px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#C73B22]/40">
                        Counter
                      </button>
                      <button className="h-[40px] px-4 rounded-xl bg-[#059669]/10 text-[#059669] hover:bg-[#059669]/20 text-[13px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#059669]/40">
                        Accept
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Compliance & Logistics */}
          <div className="col-span-5 flex flex-col gap-6 h-full">
            <section className="bg-[#FFFFFF] rounded-3xl border border-[#E8E2DC] p-6" style={{ boxShadow: theme.shadowCard }}>
              <h2 className="text-[14px] font-semibold text-[#888880] uppercase tracking-wider mb-6">Compliance Inbox</h2>
              <div className="flex flex-col gap-5">
                <ProgressMeter label="KYB renewal" value={80} color={theme.warning} />
                <ProgressMeter label="Phyto cert" value={40} color={theme.primary} />
                <ProgressMeter label="BoL upload" value={0} color={theme.subtle} />
              </div>
            </section>
            
            <section className="bg-[#FFFFFF] rounded-3xl border border-[#E8E2DC] p-6 flex-grow" style={{ boxShadow: theme.shadowCard }}>
              <h2 className="text-[14px] font-semibold text-[#888880] uppercase tracking-wider mb-6">Active Logistics</h2>
              <div className="flex flex-col gap-5">
                {[
                  { route: 'Abidjan → Rotterdam', vessel: 'MSC Rachele', progress: 65, eta: 'Oct 12', status: 'In Transit', color: theme.info },
                  { route: 'Tema → Antwerp', vessel: 'CMA CGM Jade', progress: 10, eta: 'Oct 15', status: 'Customs', color: theme.warning }
                ].map((log, i) => (
                  <div key={i} className="flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                       <div className="flex flex-col gap-1">
                          <span className="text-[14px] font-semibold text-[#1A1A1A]">{log.route}</span>
                          <span className="text-[13px] text-[#4A4A48] flex items-center gap-1.5"><Anchor size={14} className="text-[#888880]" /> {log.vessel}</span>
                       </div>
                       <div className="flex flex-col items-end gap-1">
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md uppercase tracking-wider" style={{ backgroundColor: `${log.color}15`, color: log.color }}>
                            {log.status}
                          </span>
                          <span className="text-[12px] font-medium text-[#888880]">ETA {log.eta}</span>
                       </div>
                    </div>
                    <div className="h-2 w-full rounded-full bg-[#F0EBE5] overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${log.progress}%`, backgroundColor: log.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

        </div>

      </main>
    </div>
  );
}
