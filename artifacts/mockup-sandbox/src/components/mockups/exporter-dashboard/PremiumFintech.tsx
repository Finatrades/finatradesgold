import React from 'react';
import {
  RadialBarChart, RadialBar, PieChart, Pie, Cell, AreaChart, Area,
  BarChart, Bar, LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { ShieldCheck, Search, Bell, Settings, ArrowRight, PlaySquare, CheckCircle2, Circle, TrendingUp, ArrowUpRight, ArrowDownRight, Ship, FileCheck, Box, Tag, FileText } from 'lucide-react';

const COLORS = {
  primary: '#C73B22',
  coral: '#E86A4F',
  cream: '#FAFAF8',
  dark: '#1A1A1A',
  muted: '#888880',
  border: '#E8E2DC',
  success: '#059669',
  warning: '#D97706',
  info: '#2563EB',
  gold: '#D4AF37'
};

const KPI_DATA = [
  { name: 'Active Consignments', value: 8, total: 12, unit: '', fill: COLORS.primary },
  { name: 'Verified Inventory', value: 1240, total: 2000, unit: ' MT', fill: COLORS.coral },
  { name: 'Open RFQs', value: 12, total: null, delta: '+3', fill: COLORS.info },
  { name: 'Escrow Locked', value: 4.2, total: 6.0, unit: 'M', fill: COLORS.warning }
];

const HEALTH_SCORE = 87;

const COMMODITY_MIX = [
  { name: 'Cocoa', value: 38, fill: '#8D5524' },
  { name: 'Cotton', value: 24, fill: '#E5E5E5' },
  { name: 'Coffee', value: 18, fill: '#6F4E37' },
  { name: 'Lithium', value: 12, fill: '#B0B0B0' },
  { name: 'Gold', value: 8, fill: COLORS.gold }
];

const REVENUE_TREND = [
  { week: 'W1', revenue: 120, volume: 80 },
  { week: 'W2', revenue: 132, volume: 85 },
  { week: 'W3', revenue: 145, volume: 92 },
  { week: 'W4', revenue: 138, volume: 88 },
  { week: 'W5', revenue: 160, volume: 105 },
  { week: 'W6', revenue: 175, volume: 110 },
  { week: 'W7', revenue: 182, volume: 115 },
  { week: 'W8', revenue: 170, volume: 108 },
  { week: 'W9', revenue: 195, volume: 125 },
  { week: 'W10', revenue: 210, volume: 135 },
  { week: 'W11', revenue: 225, volume: 142 },
  { week: 'W12', revenue: 240, volume: 150 },
];

const COMMODITY_TICKERS = [
  { name: 'Cocoa', price: '$9,840.50', delta: '+2.4%', up: true, data: [4,5,4,6,7,6,8,9,8,10] },
  { name: 'Cotton', price: '$82.45', delta: '-0.8%', up: false, data: [8,7,8,6,5,6,4,5,4,3] },
  { name: 'Coffee', price: '$4,210.00', delta: '+1.2%', up: true, data: [3,4,3,5,4,6,5,7,8,7] },
  { name: 'Gold', price: '$2,345.80', delta: '+0.5%', up: true, data: [5,6,5,7,8,7,9,8,10,9] },
];

const TRADE_CASES = [
  { ref: 'TRD-2024-089', commodity: 'Cocoa Beans', counterparty: 'FT-IMP-8832', rating: 4.8, progress: 70, status: 'shipment', amount: '1.2M', currency: 'USD' },
  { ref: 'TRD-2024-092', commodity: 'Raw Cotton', counterparty: 'FT-IMP-1145', rating: 4.5, progress: 30, status: 'lc_issued', amount: '850K', currency: 'EUR' },
  { ref: 'TRD-2024-095', commodity: 'Arabica Coffee', counterparty: 'FT-IMP-6621', rating: 4.9, progress: 100, status: 'completed', amount: '2.1M', currency: 'USD' }
];

const WALLET_BALANCES = [
  { currency: 'USD', available: 1250000, escrow: 4200000, pending: 850000 },
  { currency: 'EUR', available: 450000, escrow: 1200000, pending: 320000 },
  { currency: 'GBP', available: 85000, escrow: 250000, pending: 0 }
];

export default function PremiumFintech() {
  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#1A1A1A] font-sans selection:bg-[#E86A4F] selection:text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#FAFAF8]/90 backdrop-blur-md border-b border-[#E8E2DC] px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C73B22] to-[#E86A4F] flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-[#C73B22]/20">
            F
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-[#1A1A1A]">Welcome back, Charan</h1>
            <div className="flex items-center gap-2 text-sm text-[#888880]">
              <span>Exporter</span>
              <span className="w-1 h-1 rounded-full bg-[#E8E2DC]" />
              <span>Raminvest Holding DIFC</span>
              <span className="w-1 h-1 rounded-full bg-[#E8E2DC]" />
              <span className="font-mono text-xs bg-[#E8E2DC]/50 px-1.5 py-0.5 rounded">FT-EXP-04821</span>
              <span className="w-1 h-1 rounded-full bg-[#E8E2DC]" />
              <span className="flex items-center gap-1 text-[#059669] bg-[#059669]/10 px-2 py-0.5 rounded-full text-xs font-medium">
                <ShieldCheck className="w-3 h-3" />
                Corporate KYC Approved
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button className="p-2 text-[#888880] hover:text-[#1A1A1A] hover:bg-[#E8E2DC]/50 rounded-full transition-colors relative">
            <Search className="w-5 h-5" />
          </button>
          <button className="p-2 text-[#888880] hover:text-[#1A1A1A] hover:bg-[#E8E2DC]/50 rounded-full transition-colors relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#C73B22] rounded-full border-2 border-[#FAFAF8]" />
          </button>
          <button className="p-2 text-[#888880] hover:text-[#1A1A1A] hover:bg-[#E8E2DC]/50 rounded-full transition-colors">
            <Settings className="w-5 h-5" />
          </button>
          <div className="w-px h-6 bg-[#E8E2DC] mx-2" />
          <img src="https://i.pravatar.cc/150?u=charan" alt="Profile" className="w-10 h-10 rounded-full border border-[#E8E2DC]" />
        </div>
      </header>

      <main className="max-w-[1280px] mx-auto p-8 grid grid-cols-12 gap-8">
        
        {/* LEFT COLUMN (8/12) */}
        <div className="col-span-8 space-y-8">
          
          {/* Hero KPI Band */}
          <section className="bg-gradient-to-br from-white to-[#FAFAF8] rounded-3xl p-6 shadow-sm border border-[#E8E2DC] relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#E86A4F]/5 to-transparent pointer-events-none" />
            
            <div className="flex items-center justify-between mb-6 relative z-10">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <ActivityIcon /> Operating Metrics
              </h2>
              <button className="text-sm font-medium text-[#C73B22] hover:text-[#E86A4F] flex items-center gap-1 transition-colors">
                Detailed Report <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-4 relative z-10">
              {KPI_DATA.map((kpi, i) => {
                const percentage = kpi.total ? (kpi.value / kpi.total) * 100 : (i===2 ? 65 : 0); // Faked percentage for Open RFQs
                return (
                  <div key={i} className="flex flex-col items-center justify-center p-4 bg-white/50 rounded-2xl border border-[#E8E2DC]/50 backdrop-blur-sm">
                    <div className="h-24 w-full relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadialBarChart 
                          cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" 
                          barSize={10} data={[{ name: 'L1', value: 100, fill: '#E8E2DC' }, { name: 'L2', value: percentage, fill: kpi.fill }]} 
                          startAngle={90} endAngle={-270}
                        >
                          <RadialBar background={false} dataKey="value" cornerRadius={10} />
                        </RadialBarChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-xl font-bold tabular-nums">
                          {kpi.value}{kpi.unit}
                        </span>
                        {kpi.delta && (
                          <span className="text-xs font-medium text-[#059669] bg-[#059669]/10 px-1.5 rounded mt-1">{kpi.delta}</span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs font-medium text-[#888880] mt-2 text-center leading-tight">
                      {kpi.name}
                    </span>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Active Trade Cases */}
          <section className="bg-white rounded-3xl p-6 shadow-sm border border-[#E8E2DC]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <PlaySquare className="w-5 h-5 text-[#888880]" /> Active Trade Cases
              </h2>
              <button className="text-sm font-medium text-[#1A1A1A] hover:bg-[#E8E2DC]/50 px-3 py-1.5 rounded-lg transition-colors border border-[#E8E2DC]">
                View All
              </button>
            </div>

            <div className="space-y-4">
              {TRADE_CASES.map((trade, i) => (
                <div key={i} className="group p-4 rounded-2xl border border-[#E8E2DC] hover:border-[#E86A4F]/50 hover:shadow-md transition-all bg-[#FAFAF8]/50">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm font-medium">{trade.ref}</span>
                        <span className="w-1 h-1 rounded-full bg-[#E8E2DC]" />
                        <span className="font-medium text-[#C73B22]">{trade.commodity}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-[#888880]">
                        <span>Buyer: <span className="font-mono text-[#1A1A1A]">{trade.counterparty}</span></span>
                        <span className="flex items-center text-[#D97706]"><StarIcon /> {trade.rating}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold tabular-nums text-lg">{trade.currency} {trade.amount}</div>
                      <div className="text-xs text-[#888880]">Escrow Value</div>
                    </div>
                  </div>

                  {/* Segmented Progress Bar */}
                  <div className="relative pt-2 pb-6">
                    <div className="h-2 w-full bg-[#E8E2DC] rounded-full overflow-hidden flex">
                      <div className={`h-full ${trade.progress >= 30 ? 'bg-[#059669]' : 'bg-transparent'} transition-all duration-1000`} style={{ width: '30%' }} />
                      <div className={`h-full ${trade.progress >= 70 ? 'bg-[#2563EB]' : trade.progress > 30 ? 'bg-[#2563EB]/40' : 'bg-transparent'} transition-all duration-1000 border-l border-white/20`} style={{ width: '40%' }} />
                      <div className={`h-full ${trade.progress === 100 ? 'bg-[#D4AF37]' : trade.progress > 70 ? 'bg-[#D4AF37]/40' : 'bg-transparent'} transition-all duration-1000 border-l border-white/20`} style={{ width: '30%' }} />
                    </div>
                    
                    <div className="absolute top-6 left-0 w-full flex justify-between text-[10px] font-medium text-[#888880]">
                      <span className={`flex items-center gap-1 ${trade.progress >= 30 ? 'text-[#059669]' : ''}`}><CheckCircle2 className="w-3 h-3" /> LC Issued</span>
                      <span className={`flex items-center gap-1 ${trade.progress >= 70 ? 'text-[#2563EB]' : ''}`}>{trade.progress >= 70 ? <CheckCircle2 className="w-3 h-3" /> : <Circle className="w-3 h-3" />} Shipment</span>
                      <span className={`flex items-center gap-1 ${trade.progress === 100 ? 'text-[#D4AF37]' : ''}`}>{trade.progress === 100 ? <CheckCircle2 className="w-3 h-3" /> : <Circle className="w-3 h-3" />} Goods Received</span>
                    </div>
                  </div>
                  
                  <div className="mt-2 flex justify-end">
                    <button className="text-xs font-medium px-3 py-1.5 rounded-lg bg-white border border-[#E8E2DC] shadow-sm hover:border-[#C73B22] hover:text-[#C73B22] transition-colors flex items-center gap-1">
                      {trade.progress === 100 ? 'View Settlement' : 'Upload BL Doc'} <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Revenue & Volume Trend */}
          <section className="bg-white rounded-3xl p-6 shadow-sm border border-[#E8E2DC]">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#888880]" /> Revenue & Volume
                </h2>
                <p className="text-sm text-[#888880]">12-week rolling trend</p>
              </div>
              <div className="flex gap-4 text-sm font-medium">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-[#C73B22]" /> Revenue ($M)</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-[#E8E2DC]" /> Volume (MT)</div>
              </div>
            </div>
            
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={REVENUE_TREND} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C73B22" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#C73B22" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E2DC" />
                  <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888880' }} dy={10} />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888880' }} />
                  <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888880' }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: '1px solid #E8E2DC', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    itemStyle={{ color: '#1A1A1A', fontWeight: 600 }}
                  />
                  <Bar yAxisId="right" dataKey="volume" fill="#FAFAF8" stroke="#E8E2DC" radius={[4, 4, 0, 0]} barSize={20} />
                  <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="#C73B22" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Incoming RFQs Mini-list */}
          <section className="bg-white rounded-3xl p-6 shadow-sm border border-[#E8E2DC]">
            <h2 className="text-lg font-semibold mb-4">Incoming RFQs</h2>
            <div className="space-y-3">
               {[
                  { comm: 'Coffee Beans', qty: '50 MT', cp: 'FT-IMP-08812', rating: '4.9', age: '2h ago' },
                  { comm: 'Cotton', qty: '120 MT', cp: 'FT-IMP-01124', rating: '4.5', age: '5h ago' },
                  { comm: 'Cocoa', qty: '80 MT', cp: 'FT-IMP-05531', rating: '4.7', age: '1d ago' }
                ].map((rfq, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-[#E8E2DC] bg-[#FAFAF8]/50">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[#1A1A1A]">{rfq.comm} · {rfq.qty}</span>
                        <span className="text-xs text-[#888880]">{rfq.age}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-mono text-xs bg-white text-[#1A1A1A] px-2 py-0.5 rounded border border-[#E8E2DC]">{rfq.cp}</span>
                        <span className="flex items-center text-xs text-[#D97706]"><StarIcon /> {rfq.rating}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="text-xs font-medium px-3 py-1.5 rounded-lg border border-[#E8E2DC] bg-white text-[#1A1A1A] hover:bg-[#E8E2DC]/50 transition-colors">Counter</button>
                      <button className="text-xs font-medium px-3 py-1.5 rounded-lg bg-[#059669] text-white hover:bg-[#047857] transition-colors">Accept</button>
                    </div>
                  </div>
                ))}
            </div>
          </section>

          {/* Active Logistics & Compliance */}
          <div className="grid grid-cols-2 gap-6">
            <section className="bg-white rounded-3xl p-6 shadow-sm border border-[#E8E2DC]">
               <h2 className="text-lg font-semibold mb-4">Active Logistics</h2>
                <div className="space-y-4">
                  {[
                    { route: 'Abidjan → Rotterdam', vessel: 'MSC Rachele', progress: 65, eta: 'Oct 12' },
                    { route: 'Tema → Antwerp', vessel: 'CMA CGM Jade', progress: 30, eta: 'Oct 15' }
                  ].map((log, i) => (
                    <div key={i} className="p-3 rounded-xl bg-[#FAFAF8] border border-[#E8E2DC]">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <Ship className="w-4 h-4 text-[#2563EB]" />
                          <div className="text-sm font-medium">{log.vessel}</div>
                        </div>
                        <span className="text-xs font-medium text-[#888880]">ETA {log.eta}</span>
                      </div>
                      <div className="text-xs text-[#888880] mb-2">{log.route}</div>
                      <div className="h-1.5 w-full bg-[#E8E2DC] rounded-full overflow-hidden">
                         <div className="h-full bg-[#2563EB]" style={{ width: `${log.progress}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
            </section>
            <section className="bg-white rounded-3xl p-6 shadow-sm border border-[#E8E2DC]">
               <h2 className="text-lg font-semibold mb-4">Compliance Inbox</h2>
                <div className="space-y-4">
                  {[
                    { doc: 'KYB Renewal', progress: 80, color: 'bg-[#059669]' },
                    { doc: 'Phytosanitary Cert - TC-0339', progress: 40, color: 'bg-[#D97706]' }
                  ].map((doc, i) => (
                    <div key={i} className="p-3 rounded-xl bg-[#FAFAF8] border border-[#E8E2DC]">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <FileCheck className="w-4 h-4 text-[#C73B22]" />
                          <div className="text-sm font-medium">{doc.doc}</div>
                        </div>
                        <span className="text-xs font-medium text-[#888880]">{doc.progress}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-[#E8E2DC] rounded-full overflow-hidden">
                         <div className={`h-full ${doc.color}`} style={{ width: `${doc.progress}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
            </section>
          </div>

        </div>


        {/* RIGHT COLUMN (4/12) */}
        <div className="col-span-4 space-y-8">
          
          {/* Health Score Speedometer */}
          <section className="bg-[#1A1A1A] rounded-3xl p-6 shadow-xl text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-[#C73B22]/20 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
            
            <h2 className="text-lg font-semibold text-white/90 mb-6">Trade Health Score</h2>
            
            <div className="flex justify-center mb-4">
              <div className="w-48 h-24 relative overflow-hidden">
                 <ResponsiveContainer width="100%" height="200%">
                    <PieChart>
                      <Pie
                        data={[{ value: HEALTH_SCORE }, { value: 100 - HEALTH_SCORE }]}
                        cx="50%"
                        cy="50%"
                        startAngle={180}
                        endAngle={0}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                      >
                        <Cell fill="#059669" />
                        <Cell fill="#333333" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center">
                    <span className="text-4xl font-bold tracking-tighter">{HEALTH_SCORE}</span>
                    <span className="text-xs text-white/60 font-medium tracking-wide uppercase">EXCELLENT</span>
                  </div>
              </div>
            </div>

            <div className="space-y-3 mt-6">
              {[
                { label: 'On-time Delivery', val: 92, color: 'bg-[#059669]' },
                { label: 'Compliance', val: 100, color: 'bg-[#059669]' },
                { label: 'Counterparty Rating', val: 95, color: 'bg-[#059669]' },
                { label: 'Doc Completeness', val: 78, color: 'bg-[#D97706]' }
              ].map((item, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs font-medium mb-1">
                    <span className="text-white/70">{item.label}</span>
                    <span>{item.val}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div className={`h-full ${item.color}`} style={{ width: `${item.val}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Multi-currency Wallet */}
          <section className="bg-white rounded-3xl p-6 shadow-sm border border-[#E8E2DC]">
             <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Wallet Balances</h2>
              <button className="text-sm font-medium text-[#C73B22] hover:text-[#E86A4F] transition-colors">
                Open Wallet
              </button>
            </div>

            <div className="space-y-6">
              {WALLET_BALANCES.map((wallet, i) => {
                const total = wallet.available + wallet.escrow + wallet.pending;
                const pAvail = (wallet.available / total) * 100;
                const pEscrow = (wallet.escrow / total) * 100;
                const pPend = (wallet.pending / total) * 100;

                return (
                  <div key={i}>
                    <div className="flex justify-between items-baseline mb-2">
                      <span className="font-bold text-lg">{wallet.currency}</span>
                      <span className="font-mono text-sm text-[#888880]">Total: {(total/1000).toFixed(1)}K</span>
                    </div>
                    
                    {/* Stacked Horizontal Meter */}
                    <div className="h-3 w-full rounded-full overflow-hidden flex mb-2 bg-[#FAFAF8]">
                      <div className="bg-[#059669] transition-all" style={{ width: `${pAvail}%` }} title="Available" />
                      <div className="bg-[#D97706] transition-all border-l border-white/50" style={{ width: `${pEscrow}%` }} title="Escrow" />
                      <div className="bg-[#E8E2DC] transition-all border-l border-white/50" style={{ width: `${pPend}%` }} title="Pending" />
                    </div>
                    
                    <div className="flex justify-between text-[10px] font-medium text-[#888880] uppercase tracking-wider">
                      <span className="text-[#059669]">Avail {(wallet.available/1000).toFixed(0)}K</span>
                      <span className="text-[#D97706]">Escrow {(wallet.escrow/1000).toFixed(0)}K</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Commodity Mix Donut */}
          <section className="bg-white rounded-3xl p-6 shadow-sm border border-[#E8E2DC]">
            <h2 className="text-lg font-semibold mb-2">Commodity Mix</h2>
            <p className="text-sm text-[#888880] mb-6">By current inventory tonnage</p>
            
            <div className="h-48 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={COMMODITY_MIX}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {COMMODITY_MIX.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    itemStyle={{ color: '#1A1A1A', fontWeight: 500, fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-bold text-[#1A1A1A]">1,240</span>
                <span className="text-xs font-medium text-[#888880]">MT Total</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mt-4 justify-center">
               {COMMODITY_MIX.map((item, i) => (
                 <div key={i} className="flex items-center gap-1.5 text-xs font-medium text-[#1A1A1A]">
                   <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                   {item.name} <span className="text-[#888880]">{item.value}%</span>
                 </div>
               ))}
            </div>
          </section>

           {/* Live Ticker */}
           <section className="bg-white rounded-3xl p-6 shadow-sm border border-[#E8E2DC]">
             <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Live Market</h2>
              <span className="flex items-center gap-1.5 text-xs font-medium text-[#C73B22] bg-[#C73B22]/10 px-2 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C73B22] animate-pulse" /> LIVE
              </span>
            </div>
            
            <div className="space-y-3">
              {COMMODITY_TICKERS.map((ticker, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-[#FAFAF8] transition-colors cursor-pointer group">
                  <div className="font-medium text-sm w-20">{ticker.name}</div>
                  <div className="h-8 w-24 opacity-60 group-hover:opacity-100 transition-opacity">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={ticker.data.map((v, i) => ({ val: v, i }))}>
                        <Line type="monotone" dataKey="val" stroke={ticker.up ? '#059669' : '#C73B22'} strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm font-semibold">{ticker.price}</div>
                    <div className={`text-[10px] font-medium ${ticker.up ? 'text-[#059669]' : 'text-[#C73B22]'}`}>
                      {ticker.delta}
                    </div>
                  </div>
                </div>
              ))}
            </div>
           </section>

           {/* Quick Actions */}
           <section className="bg-white rounded-3xl p-6 shadow-sm border border-[#E8E2DC]">
            <h2 className="text-xs font-semibold text-[#888880] uppercase tracking-wider mb-4">Quick Actions</h2>
            <div className="flex flex-col gap-2">
              {[
                { icon: <Box className="w-4 h-4" />, label: 'Create Consignment' },
                { icon: <Tag className="w-4 h-4" />, label: 'List on Marketplace' },
                { icon: <FileText className="w-4 h-4" />, label: 'Submit RFQ Response' },
                { icon: <ShieldCheck className="w-4 h-4" />, label: 'View Escrow' },
                { icon: <FileCheck className="w-4 h-4" />, label: 'Upload Shipment Doc' }
              ].map((action, i) => (
                <button key={i} className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-[#FAFAF8] text-[#1A1A1A] transition-colors text-left border border-transparent hover:border-[#E8E2DC]">
                  <div className="text-[#888880]">{action.icon}</div>
                  <span className="text-sm font-medium">{action.label}</span>
                </button>
              ))}
            </div>
           </section>

        </div>

      </main>
    </div>
  );
}

// Minimal Icons
function ActivityIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#888880]">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  )
}

function StarIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-[#D97706] inline-block mr-0.5">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}