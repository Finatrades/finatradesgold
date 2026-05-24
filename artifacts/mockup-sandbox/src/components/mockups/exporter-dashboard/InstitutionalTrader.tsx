import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import {
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Package,
  Ship,
  FileText,
  Star,
  ChevronRight,
  Download,
  Wallet,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  PlusCircle,
  ShoppingCart,
  Upload,
  Globe
} from 'lucide-react';

// --- Theme & Tokens ---
const theme = {
  primary: '#C73B22',
  primaryHover: '#A82F1B',
  coral: '#E86A4F',
  cream: '#FAFAF8',
  white: '#FFFFFF',
  dark: '#1A1A1A',
  secondary: '#4A4A48',
  muted: '#888880',
  hairline: '#E8E2DC',
  subtle: '#F5F0EB',
  gridline: '#F0EBE5',
  success: '#059669',
  warning: '#D97706',
  info: '#2563EB',
  gold: '#D4AF37',
  elevation: '0 1px 2px rgba(26,26,26,0.04), 0 4px 12px rgba(26,26,26,0.04)',
};

// --- Mock Data ---
const TICKER_DATA = [
  { symbol: 'COCOA', price: '$9,420.50', delta: '+2.4%', up: true, data: [40, 45, 42, 50, 55, 48, 60] },
  { symbol: 'COTTON', price: '$84.20', delta: '-0.8%', up: false, data: [80, 78, 82, 75, 70, 72, 68] },
  { symbol: 'COFFEE', price: '$210.15', delta: '+1.2%', up: true, data: [200, 205, 202, 210, 215, 212, 220] },
  { symbol: 'GOLD', price: '$2,340.00', delta: '+0.5%', up: true, data: [150, 155, 160, 158, 165, 170, 175] },
  { symbol: 'LITHIUM', price: '$14,200.00', delta: '-1.5%', up: false, data: [50, 48, 45, 46, 42, 40, 38] },
];

const REVENUE_DATA = [
  { week: 'W1', rev: 120, vol: 40 },
  { week: 'W2', rev: 135, vol: 45 },
  { week: 'W3', rev: 125, vol: 42 },
  { week: 'W4', rev: 150, vol: 50 },
  { week: 'W5', rev: 180, vol: 60 },
  { week: 'W6', rev: 170, vol: 55 },
  { week: 'W7', rev: 210, vol: 70 },
  { week: 'W8', rev: 230, vol: 75 },
  { week: 'W9', rev: 220, vol: 72 },
  { week: 'W10', rev: 250, vol: 80 },
  { week: 'W11', rev: 280, vol: 90 },
  { week: 'W12', rev: 310, vol: 100 },
];

const MIX_DATA = [
  { name: 'Cocoa', value: 450, color: '#C73B22' },
  { name: 'Coffee', value: 380, color: '#D97706' },
  { name: 'Cotton', value: 250, color: '#2563EB' },
  { name: 'Gold', value: 160, color: '#D4AF37' },
];

const TRADE_CASES = [
  { id: 'FT-TC-8821', commodity: 'Cocoa Beans', qty: '200 MT', partner: 'FT-IMP-902', rating: 4.8, status: 2, amount: '$1.8M', action: 'Upload BoL', trend: [20, 25, 22, 30, 28, 35, 32] },
  { id: 'FT-TC-8822', commodity: 'Arabica Coffee', qty: '150 MT', partner: 'FT-IMP-441', rating: 4.5, status: 1, amount: '$850K', action: 'Approve Quality', trend: [10, 15, 12, 18, 16, 20, 22] },
  { id: 'FT-TC-8823', commodity: 'Raw Cotton', qty: '500 MT', partner: 'FT-IMP-112', rating: 4.9, status: 3, amount: '$2.1M', action: 'Release Escrow', trend: [30, 35, 38, 36, 40, 42, 45] },
  { id: 'FT-TC-8824', commodity: 'Gold Dore', qty: '50 kg', partner: 'FT-IMP-776', rating: 5.0, status: 1, amount: '$3.2M', action: 'Sign Contract', trend: [50, 48, 52, 55, 53, 58, 60] },
];

const RFQ_DATA = [
  { id: 'RFQ-992', commodity: 'Cocoa Beans', qty: '100 MT', partner: 'FT-IMP-882', age: '2h ago' },
  { id: 'RFQ-993', commodity: 'Coffee', qty: '50 MT', partner: 'FT-IMP-331', age: '5h ago' },
  { id: 'RFQ-994', commodity: 'Cotton', qty: '200 MT', partner: 'FT-IMP-005', age: '1d ago' },
];

// --- Subcomponents ---

const Card = ({ children, className = '', noPadding = false }: { children: React.ReactNode, className?: string, noPadding?: boolean }) => (
  <div 
    className={`bg-white border rounded-lg transition-colors duration-150 group ${className}`}
    style={{ borderColor: theme.hairline, boxShadow: theme.elevation }}
  >
    <div className={`h-full ${noPadding ? '' : 'p-[20px]'} group-hover:bg-[#FDFCFA] transition-colors duration-150 rounded-lg`}>
      {children}
    </div>
  </div>
);

const SectionTitle = ({ title, action }: { title: string, action?: React.ReactNode }) => (
  <div className="flex items-center justify-between mb-4">
    <h2 className="text-[14px] font-semibold uppercase tracking-wider text-[#888880]">{title}</h2>
    {action && <div>{action}</div>}
  </div>
);

const RadialKPI = ({ label, value, sub, progress, color }: { label: string, value: string, sub: string, progress: number, color: string }) => {
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <Card className="flex flex-col items-center justify-center p-4 text-center">
      <div className="relative w-[56px] h-[56px] mb-3">
        <svg className="w-full h-full transform -rotate-90">
          <circle cx="28" cy="28" r={radius} stroke={theme.subtle} strokeWidth="6" fill="none" />
          <circle cx="28" cy="28" r={radius} stroke={color} strokeWidth="6" fill="none" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-500 ease-out" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[12px] font-bold text-[#1A1A1A] tabular-nums">{progress}%</span>
        </div>
      </div>
      <div className="text-[20px] font-bold text-[#1A1A1A] tabular-nums leading-none mb-1.5">{value}</div>
      <div className="text-[11px] uppercase tracking-wider text-[#888880] font-medium leading-tight">{label}</div>
      <div className="text-[11px] text-[#4A4A48] mt-1">{sub}</div>
    </Card>
  );
};

const Speedometer = ({ score }: { score: number }) => {
  const radius = 56;
  const circumference = Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <Card className="flex flex-col h-full">
      <SectionTitle title="Trade Health" />
      <div className="flex-1 flex flex-col justify-center">
        <div className="relative w-full flex justify-center mb-6">
          <svg width="132" height="66" viewBox="0 0 132 66" className="overflow-visible">
            <path d="M 10 66 A 56 56 0 0 1 122 66" fill="none" stroke={theme.subtle} strokeWidth="10" strokeLinecap="round" />
            <path d="M 10 66 A 56 56 0 0 1 122 66" fill="none" stroke={theme.success} strokeWidth="10" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} className="transition-all duration-500 ease-out" />
          </svg>
          <div className="absolute bottom-0 flex flex-col items-center">
            <span className="text-[28px] font-bold text-[#1A1A1A] leading-none tabular-nums">{score}</span>
            <span className="text-[11px] text-[#059669] font-medium flex items-center gap-1 mt-1"><CheckCircle2 size={10} /> Excellent</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          {[
            { l: 'Delivery', v: '92%' },
            { l: 'Compliance', v: '95%' },
            { l: 'Rating', v: '4.7/5' },
            { l: 'Docs', v: '78%' }
          ].map((m, i) => (
            <div key={i}>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-[#4A4A48]">{m.l}</span>
                <span className="text-[#1A1A1A] font-semibold tabular-nums">{m.v}</span>
              </div>
              <div className="h-[4px] bg-[#F5F0EB] rounded-full overflow-hidden">
                <div className="h-full bg-[#1A1A1A] rounded-full" style={{ width: m.v.includes('/') ? `${(parseFloat(m.v)/5)*100}%` : m.v }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};

const MilestoneBar = ({ status }: { status: number }) => (
  <div className="flex items-center gap-1 w-[100px]">
    {[1, 2, 3].map((step) => {
      let color = theme.hairline;
      let icon = <div className="w-[4px] h-[4px] rounded-full bg-[#E8E2DC]" />;
      if (step < status) {
        color = theme.success;
        icon = <CheckCircle2 size={8} className="text-white" />;
      } else if (step === status) {
        color = theme.info;
        icon = <div className="w-[4px] h-[4px] rounded-full bg-white animate-pulse" />;
      }
      
      return (
        <div key={step} className="flex-1 h-[12px] rounded-sm flex items-center justify-center transition-colors duration-300" style={{ backgroundColor: step <= status ? color : theme.subtle }}>
          {icon}
        </div>
      );
    })}
  </div>
);

// --- Main Dashboard ---

export default function InstitutionalTrader() {
  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#1A1A1A] font-sans antialiased">
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');
        .font-sans { font-family: 'Inter', sans-serif; }
        .font-mono-jb { font-family: 'JetBrains Mono', monospace; }
        .tabular-nums { font-variant-numeric: tabular-nums; }
      `}} />

      {/* Ticker (Dense, Mono) */}
      <div className="w-full bg-[#1A1A1A] text-white border-b border-[#333] flex items-center h-[40px] px-6 overflow-hidden gap-8 select-none">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[#888880] shrink-0">
          <div className="w-2 h-2 rounded-full bg-[#059669] animate-pulse" />
          Live
        </div>
        <div className="flex gap-8 overflow-x-auto hide-scrollbar font-mono-jb text-[12px] flex-nowrap shrink-0 items-center">
          {TICKER_DATA.map((t, i) => (
            <div key={i} className="flex items-center gap-3 shrink-0">
              <span className="text-[#888880]">{t.symbol}</span>
              <span className="font-semibold">{t.price}</span>
              <span className={`flex items-center ${t.up ? 'text-[#059669]' : 'text-[#C73B22]'}`}>
                {t.up ? <ArrowUpRight size={12} className="mr-0.5" /> : <ArrowDownRight size={12} className="mr-0.5" />}
                {t.delta}
              </span>
              <div className="w-[48px] h-[20px] opacity-70">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={t.data.map(v => ({v}))}>
                    <Line type="monotone" dataKey="v" stroke={t.up ? '#059669' : '#C73B22'} strokeWidth={1.5} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-6 py-6">
        
        {/* Header */}
        <div className="flex justify-between items-end mb-6">
          <div>
            <h1 className="text-[24px] font-bold leading-tight">Welcome back, Charan</h1>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-[13px] text-[#4A4A48]">Exporter · Raminvest Holding DIFC · <span className="font-mono-jb text-[#1A1A1A]">FT-EXP-04821</span></span>
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#F5F0EB] border border-[#E8E2DC] rounded text-[#059669] text-[11px] font-semibold uppercase tracking-wider">
                <ShieldCheck size={12} />
                Corporate KYC Approved
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button className="h-[40px] px-4 rounded-lg border border-[#E8E2DC] bg-white text-[#1A1A1A] text-[13px] font-medium hover:bg-[#F5F0EB] transition-colors focus:outline-none focus:ring-2 focus:ring-[#C73B22]/40 shadow-sm flex items-center gap-2">
              <Download size={16} /> Report
            </button>
            <button className="h-[40px] px-4 rounded-lg bg-[#C73B22] text-white text-[13px] font-medium hover:bg-[#A82F1B] transition-colors flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#C73B22]/40 shadow-sm">
              <Wallet size={16} /> Open Wallet
            </button>
          </div>
        </div>

        {/* 5-col Top Strip */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-5">
          <RadialKPI label="Active Consignments" value="8/12" sub="+2 this week" progress={66} color={theme.info} />
          <RadialKPI label="Verified Inventory" value="1,240 MT" sub="62% capacity" progress={62} color={theme.gold} />
          <RadialKPI label="Open RFQs" value="12" sub="+3 today" progress={45} color={theme.coral} />
          <RadialKPI label="Escrow Locked" value="$4.2M" sub="70% committed" progress={70} color={theme.success} />
          <Speedometer score={87} />
        </div>

        {/* 12-col logical grid for main content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Main Content (8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-5">
            
            {/* Active Trade Cases Table */}
            <Card noPadding>
              <div className="p-5 border-b border-[#E8E2DC] flex justify-between items-center">
                <SectionTitle title="Active Trade Cases" />
                <button className="text-[13px] text-[#C73B22] font-medium hover:text-[#A82F1B] transition-colors h-[40px] px-2 -mr-2 rounded focus:outline-none focus:ring-2 focus:ring-[#C73B22]/40">View All Deals</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#FDFCFA] border-b border-[#E8E2DC]">
                      <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#888880]">Reference</th>
                      <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#888880]">Commodity & Qty</th>
                      <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#888880]">Counterparty</th>
                      <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#888880]">Progress</th>
                      <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#888880]">Trend</th>
                      <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#888880]">Escrow</th>
                      <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#888880] text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {TRADE_CASES.map((tc, idx) => (
                      <tr key={idx} className="border-b border-[#F0EBE5] last:border-0 hover:bg-[#F5F0EB] transition-colors group">
                        <td className="px-5 py-4 font-mono-jb text-[12px] text-[#1A1A1A] font-medium">{tc.id}</td>
                        <td className="px-5 py-4">
                          <div className="text-[13px] font-medium text-[#1A1A1A]">{tc.commodity}</div>
                          <div className="text-[12px] text-[#888880] tabular-nums mt-0.5">{tc.qty}</div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-mono-jb text-[12px] text-[#1A1A1A]">{tc.partner}</div>
                          <div className="flex items-center gap-1 text-[11px] text-[#D97706] mt-0.5 font-medium tabular-nums">
                            <Star size={10} fill="currentColor" /> {tc.rating}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <MilestoneBar status={tc.status} />
                          <div className="text-[10px] text-[#888880] mt-1.5 uppercase tracking-wider">Step {tc.status} of 3</div>
                        </td>
                        <td className="px-5 py-4">
                           <div className="w-[48px] h-[24px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={tc.trend.map(v => ({v}))}>
                                <Line type="monotone" dataKey="v" stroke="#1A1A1A" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </td>
                        <td className="px-5 py-4 font-mono-jb text-[13px] text-[#1A1A1A] font-medium tabular-nums">{tc.amount}</td>
                        <td className="px-5 py-4 text-right">
                          <button className="h-[32px] px-3 rounded border border-[#E8E2DC] bg-white text-[#1A1A1A] text-[12px] font-medium hover:bg-[#FDFCFA] hover:border-[#C73B22] transition-colors group-hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[#C73B22]/40">
                            {tc.action}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Revenue & Volume Chart */}
            <Card>
              <SectionTitle title="Revenue & Volume Metrics" action={
                <div className="flex items-center gap-4 text-[12px] font-medium">
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-[#1A1A1A]" /> Revenue ($M)</div>
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-[#E8E2DC]" /> Volume (MT)</div>
                </div>
              } />
              <div className="h-[240px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={REVENUE_DATA} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1A1A1A" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#1A1A1A" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.gridline} />
                    <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#888880' }} dy={10} />
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#888880', fontVariantNumeric: 'tabular-nums' }} tickFormatter={(v) => `$${v}K`} />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#888880', fontVariantNumeric: 'tabular-nums' }} tickFormatter={(v) => `${v}MT`} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: `1px solid ${theme.hairline}`, boxShadow: theme.elevation, fontSize: '12px', padding: '8px 12px' }}
                      itemStyle={{ color: '#1A1A1A', fontWeight: 600 }}
                      labelStyle={{ color: '#888880', marginBottom: '4px' }}
                    />
                    <Area yAxisId="left" type="monotone" dataKey="rev" stroke="#1A1A1A" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" animationDuration={400} />
                    <Bar yAxisId="right" dataKey="vol" fill="#E8E2DC" radius={[2,2,0,0]} barSize={24} animationDuration={400} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
            
          </div>

          {/* Right Rail (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-5">
            
            {/* Multi-currency wallet */}
            <Card>
              <SectionTitle title="Multi-Currency Wallet" action={<span className="text-[11px] text-[#2563EB] font-medium cursor-pointer">FX Rates</span>} />
              <div className="space-y-5 mt-4">
                {[
                  { c: 'USD', total: '$1,240,500', a: 60, l: 30, p: 10 },
                  { c: 'EUR', total: '€450,000', a: 80, l: 15, p: 5 },
                  { c: 'GBP', total: '£120,000', a: 40, l: 60, p: 0 }
                ].map(w => (
                  <div key={w.c}>
                    <div className="flex justify-between items-baseline mb-2">
                      <span className="text-[13px] font-bold text-[#1A1A1A]">{w.c}</span>
                      <span className="font-mono-jb text-[13px] font-medium tabular-nums">{w.total}</span>
                    </div>
                    <div className="h-[6px] flex rounded-sm overflow-hidden bg-[#F5F0EB]">
                      <div className="bg-[#059669]" style={{ width: `${w.a}%` }} title="Available" />
                      <div className="bg-[#D97706]" style={{ width: `${w.l}%` }} title="Locked" />
                      <div className="bg-[#2563EB]" style={{ width: `${w.p}%` }} title="Pending" />
                    </div>
                    <div className="flex gap-3 mt-1.5 text-[11px] text-[#888880] tabular-nums">
                      <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-[#059669]" />{w.a}% Avail</span>
                      <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />{w.l}% Lock</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Commodity Mix Donut */}
            <Card>
              <SectionTitle title="Inventory Mix" />
              <div className="flex items-center mt-2">
                <div className="w-[120px] h-[120px] relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={MIX_DATA} cx="50%" cy="50%" innerRadius={42} outerRadius={56} paddingAngle={2} dataKey="value" stroke="none" isAnimationActive={false}>
                        {MIX_DATA.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '8px', border: `1px solid ${theme.hairline}`, boxShadow: theme.elevation, fontSize: '12px', padding: '6px 10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[14px] font-bold text-[#1A1A1A] leading-tight tabular-nums">1,240</span>
                    <span className="text-[10px] text-[#888880] font-medium uppercase">MT</span>
                  </div>
                </div>
                <div className="flex-1 pl-4 space-y-2">
                  {MIX_DATA.map(d => (
                    <div key={d.name} className="flex justify-between items-center text-[12px]">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                        <span className="text-[#4A4A48]">{d.name}</span>
                      </div>
                      <span className="font-semibold text-[#1A1A1A] tabular-nums">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Incoming RFQs */}
            <Card noPadding>
              <div className="p-4 border-b border-[#E8E2DC]">
                <SectionTitle title="Incoming RFQs" />
              </div>
              <div className="p-1 space-y-1">
                {RFQ_DATA.map((rfq, i) => (
                  <div key={i} className="p-3 hover:bg-[#F5F0EB] rounded-md transition-colors group">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="text-[13px] font-bold text-[#1A1A1A]">{rfq.commodity}</div>
                        <div className="text-[12px] text-[#4A4A48] tabular-nums mt-0.5">{rfq.qty} · <span className="font-mono-jb text-[11px]">{rfq.partner}</span></div>
                      </div>
                      <div className="text-[11px] text-[#888880] flex items-center gap-1">
                        <Clock size={10} /> {rfq.age}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="flex-1 h-[32px] rounded bg-[#C73B22] text-white text-[12px] font-medium hover:bg-[#A82F1B] transition-colors focus:outline-none focus:ring-2 focus:ring-[#C73B22]/40">Accept</button>
                      <button className="flex-1 h-[32px] rounded border border-[#E8E2DC] bg-white text-[#1A1A1A] text-[12px] font-medium hover:bg-[#FDFCFA] transition-colors focus:outline-none focus:ring-2 focus:ring-[#C73B22]/40">Counter</button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Compliance & Logistics */}
            <div className="flex flex-col gap-4">
               <Card>
                <SectionTitle title="Compliance Inbox" />
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-[12px] mb-1.5">
                      <span className="font-medium flex items-center gap-1.5 text-[#1A1A1A]"><AlertCircle size={14} className="text-[#D97706]"/> KYB Renewal</span>
                      <span className="text-[#888880] tabular-nums">80%</span>
                    </div>
                    <div className="w-full bg-[#F5F0EB] h-[4px] rounded-full overflow-hidden">
                      <div className="bg-[#D97706] h-full" style={{ width: '80%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[12px] mb-1.5">
                      <span className="font-medium flex items-center gap-1.5 text-[#1A1A1A]"><FileText size={14} className="text-[#2563EB]"/> Phyto Cert (TC-881)</span>
                      <span className="text-[#888880] tabular-nums">40%</span>
                    </div>
                    <div className="w-full bg-[#F5F0EB] h-[4px] rounded-full overflow-hidden">
                      <div className="bg-[#2563EB] h-full" style={{ width: '40%' }}></div>
                    </div>
                  </div>
                </div>
              </Card>

               <Card>
                  <SectionTitle title="Active Logistics" />
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-[12px] mb-2 text-[#1A1A1A] font-medium">
                        <span>Abidjan</span>
                        <span>Rotterdam</span>
                      </div>
                      <div className="relative w-full h-[4px] bg-[#F5F0EB] rounded-full mb-1">
                        <div className="absolute top-0 left-0 h-full bg-[#1A1A1A] rounded-full" style={{ width: '65%' }}></div>
                        <div className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-[#C73B22] rounded-full border-2 border-white shadow-sm" style={{ left: '65%' }}></div>
                      </div>
                      <div className="flex justify-between items-center text-[11px] mt-1.5">
                        <span className="text-[#059669] flex items-center gap-1 font-medium"><CheckCircle2 size={10} /> Cleared</span>
                        <span className="text-[#888880]">ETA: 4 days</span>
                      </div>
                    </div>
                  </div>
                </Card>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}