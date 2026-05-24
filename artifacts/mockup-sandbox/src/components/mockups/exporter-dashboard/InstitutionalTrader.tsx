import React, { useState } from "react";
import {
  RadialBarChart,
  RadialBar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Ship,
  Wallet,
  Settings2,
  RefreshCw,
  PlusCircle,
  ShoppingCart,
  Send,
  Upload,
  Globe,
} from "lucide-react";

// --- BRAND TOKENS ---
const COLORS = {
  redbrick: "#C73B22",
  coral: "#E86A4F",
  cream: "#FAFAF8",
  dark: "#1A1A1A",
  muted: "#888880",
  border: "#E8E2DC",
  success: "#059669",
  warning: "#D97706",
  info: "#2563EB",
  gold: "#D4AF37",
  bgWidget: "#ffffff",
};

// --- MOCK DATA ---
const commodityTicker = [
  { id: 1, name: "Cocoa", price: "$9,450/MT", delta: "+2.4%", up: true, trend: [40, 45, 42, 50, 48, 55, 60] },
  { id: 2, name: "Cotton", price: "$82.40/lb", delta: "-0.8%", up: false, trend: [60, 58, 62, 55, 52, 50, 48] },
  { id: 3, name: "Coffee", price: "$4,120/MT", delta: "+1.2%", up: true, trend: [30, 32, 35, 34, 38, 40, 42] },
  { id: 4, name: "Gold", price: "$2,340/oz", delta: "+0.5%", up: true, trend: [70, 72, 71, 75, 74, 76, 78] },
  { id: 5, name: "Lithium", price: "$14,200/MT", delta: "-1.5%", up: false, trend: [50, 48, 45, 46, 42, 40, 38] },
];

const kpiRadialData = [
  { name: "Active Consignments", value: 66, label: "8 / 12", color: COLORS.info },
  { name: "Verified Inventory", value: 62, label: "1,240 MT", color: COLORS.coral },
  { name: "Open RFQs", value: 85, label: "12 (+3)", color: COLORS.warning },
  { name: "Escrow Locked", value: 70, label: "$4.2M", color: COLORS.success },
];

const healthScoreData = [
  { name: "Score", value: 87, fill: COLORS.success },
];

const walletData = [
  { currency: "USD", available: 1200000, locked: 2800000, pending: 400000 },
  { currency: "EUR", available: 450000, locked: 850000, pending: 100000 },
  { currency: "GBP", available: 120000, locked: 0, pending: 50000 },
];

const activeDeals = [
  {
    ref: "TC-2024-881", commodity: "Cocoa", cp: "FT-IMP-0992", rating: 4.8,
    escrow: "$1,250,000", action: "Upload BL",
    milestone: { stage: 2, total: 3 }, // 0: setup, 1: LC, 2: Shipped, 3: Received
    accrual: [10, 20, 40, 80, 100]
  },
  {
    ref: "TC-2024-882", commodity: "Cotton", cp: "FT-IMP-1045", rating: 4.5,
    escrow: "$840,000", action: "Review LC",
    milestone: { stage: 1, total: 3 },
    accrual: [5, 10, 20, 25, 30]
  },
  {
    ref: "TC-2024-883", commodity: "Gold", cp: "FT-IMP-0211", rating: 5.0,
    escrow: "$2,100,000", action: "Awaiting Receipt",
    milestone: { stage: 2, total: 3 },
    accrual: [50, 60, 75, 90, 100]
  },
];

const commodityMix = [
  { name: "Cocoa", value: 38, color: COLORS.redbrick },
  { name: "Cotton", value: 24, color: COLORS.coral },
  { name: "Coffee", value: 18, color: COLORS.muted },
  { name: "Lithium", value: 12, color: COLORS.info },
  { name: "Gold", value: 8, color: COLORS.gold },
];

const revenueTrend = Array.from({ length: 12 }).map((_, i) => ({
  week: `W${i + 1}`,
  revenue: 100000 + Math.random() * 50000 + (i * 20000),
  volume: 50 + Math.random() * 20 + (i * 5),
}));

const rfqVolume = Array.from({ length: 7 }).map((_, i) => ({
  day: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i],
  rfqs: Math.floor(Math.random() * 15) + 2,
}));

// --- COMPONENTS ---

const RadialGauge = ({ title, data, size = 120 }: any) => {
  return (
    <div className="flex flex-col items-center justify-center p-4 border border-[#E8E2DC] rounded-lg bg-white">
      <div className="relative" style={{ width: size, height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%" cy="50%"
            innerRadius="70%" outerRadius="100%"
            barSize={8}
            data={[{ name: "bg", value: 100, fill: "#F3F4F6" }, { ...data, fill: data.color }]}
            startAngle={90} endAngle={-270}
          >
            <RadialBar dataKey="value" cornerRadius={4} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-semibold text-[#1A1A1A] tabular-nums">{data.label}</span>
        </div>
      </div>
      <span className="text-xs font-medium text-[#888880] mt-3 uppercase tracking-wider text-center">{title}</span>
    </div>
  );
};

const Speedometer = ({ score }: { score: number }) => {
  return (
    <div className="border border-[#E8E2DC] rounded-lg bg-white p-5 flex flex-col">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-sm font-semibold text-[#1A1A1A] uppercase tracking-wider">Trade Health Score</h3>
          <p className="text-xs text-[#888880]">Overall platform standing</p>
        </div>
        <div className="text-2xl font-bold text-[#059669]">{score}/100</div>
      </div>
      
      <div className="relative h-32 w-full mt-2 overflow-hidden flex justify-center">
         <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={[{value: 100}]}
                cx="50%" cy="100%"
                startAngle={180} endAngle={0}
                innerRadius={80} outerRadius={100}
                fill="#F3F4F6" stroke="none"
                dataKey="value"
              />
              <Pie
                data={[{value: score}, {value: 100 - score}]}
                cx="50%" cy="100%"
                startAngle={180} endAngle={0}
                innerRadius={80} outerRadius={100}
                stroke="none"
                dataKey="value"
              >
                <Cell fill={COLORS.success} />
                <Cell fill="transparent" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute bottom-0 text-center w-full pb-2 text-xs font-medium text-[#888880]">Excellent</div>
      </div>
      
      <div className="mt-6 space-y-3">
        {[
          { label: "On-time Delivery", val: 92, col: COLORS.success },
          { label: "Compliance", val: 98, col: COLORS.success },
          { label: "Counterparty Rating", val: 84, col: COLORS.warning },
          { label: "Doc Completeness", val: 75, col: COLORS.warning },
        ].map((m, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs font-medium text-[#1A1A1A]">
              <span>{m.label}</span>
              <span>{m.val}%</span>
            </div>
            <div className="h-1.5 w-full bg-[#F3F4F6] rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${m.val}%`, backgroundColor: m.col }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function InstitutionalTrader() {
  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#1A1A1A] font-sans selection:bg-[#E86A4F] selection:text-white pb-20">
      
      {/* Ticker Tape */}
      <div className="w-full bg-[#1A1A1A] text-white border-b border-[#333] overflow-hidden flex items-center h-12 text-sm uppercase tracking-wider font-mono">
        <div className="flex items-center px-4 shrink-0 bg-[#C73B22] h-full font-bold">
          <Activity className="w-4 h-4 mr-2" /> LIVE
        </div>
        <div className="flex-1 flex items-center overflow-x-auto no-scrollbar gap-8 px-6">
          {commodityTicker.map((item) => (
            <div key={item.id} className="flex items-center gap-3 shrink-0">
              <span className="text-[#888880]">{item.name}</span>
              <span className="font-semibold">{item.price}</span>
              <span className={`flex items-center text-xs ${item.up ? 'text-[#059669]' : 'text-[#C73B22]'}`}>
                {item.up ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                {item.delta}
              </span>
              <div className="w-16 h-6 opacity-70">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={item.trend.map((v, i) => ({ i, v }))}>
                    <Line type="monotone" dataKey="v" stroke={item.up ? COLORS.success : COLORS.redbrick} strokeWidth={1.5} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-6 py-8">
        
        {/* Header */}
        <header className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#1A1A1A] mb-1">Welcome back, Charan</h1>
            <div className="flex items-center gap-3 text-sm text-[#888880]">
              <span>Exporter</span>
              <span>&bull;</span>
              <span>Raminvest Holding DIFC</span>
              <span>&bull;</span>
              <span className="font-mono text-xs bg-[#E8E2DC] px-2 py-0.5 rounded text-[#1A1A1A]">FT-EXP-04821</span>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#059669]/10 text-[#059669] rounded-full text-sm font-medium border border-[#059669]/20">
            <CheckCircle2 className="w-4 h-4" />
            Corporate KYC Approved
          </div>
        </header>

        {/* 4-col Radial Strip */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {kpiRadialData.map((kpi, i) => (
            <RadialGauge key={i} title={kpi.name} data={kpi} />
          ))}
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-12 gap-6">
          
          {/* Left Column - Main Content (8 cols) */}
          <div className="col-span-8 space-y-6">
            
            {/* Active Trade Cases Table */}
            <div className="bg-white border border-[#E8E2DC] rounded-lg overflow-hidden">
              <div className="flex justify-between items-center p-4 border-b border-[#E8E2DC]">
                <h3 className="text-sm font-semibold uppercase tracking-wider">Active Trade Cases</h3>
                <button className="text-xs text-[#2563EB] font-medium hover:underline">View All</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-[#888880] uppercase bg-[#FAFAF8] border-b border-[#E8E2DC]">
                    <tr>
                      <th className="px-4 py-3 font-medium">Deal Ref</th>
                      <th className="px-4 py-3 font-medium">Commodity</th>
                      <th className="px-4 py-3 font-medium">Counterparty</th>
                      <th className="px-4 py-3 font-medium w-48">Milestone Progress</th>
                      <th className="px-4 py-3 font-medium text-right">Escrow</th>
                      <th className="px-4 py-3 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E2DC]">
                    {activeDeals.map((deal, i) => (
                      <tr key={i} className="hover:bg-[#FAFAF8]/50 transition-colors">
                        <td className="px-4 py-4 font-mono text-xs">{deal.ref}</td>
                        <td className="px-4 py-4 font-medium">{deal.commodity}</td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs">{deal.cp}</span>
                            <span className="text-[#D97706] text-xs flex items-center">★{deal.rating}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex h-2 gap-1 w-full max-w-[140px]">
                            <div className={`h-full rounded-l-full flex-1 ${deal.milestone.stage >= 1 ? 'bg-[#059669]' : 'bg-[#E8E2DC]'}`} />
                            <div className={`h-full flex-1 ${deal.milestone.stage >= 2 ? 'bg-[#059669]' : 'bg-[#E8E2DC]'}`} />
                            <div className={`h-full rounded-r-full flex-1 ${deal.milestone.stage >= 3 ? 'bg-[#059669]' : 'bg-[#E8E2DC]'}`} />
                          </div>
                          <div className="text-[10px] text-[#888880] mt-1.5 flex justify-between max-w-[140px]">
                            <span>LC</span>
                            <span>Ship</span>
                            <span>Recv</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right font-medium tabular-nums">{deal.escrow}</td>
                        <td className="px-4 py-4 text-right">
                          <span className="inline-block px-2.5 py-1 bg-[#FAFAF8] border border-[#E8E2DC] rounded text-xs font-medium text-[#1A1A1A] cursor-pointer hover:bg-[#E8E2DC] transition-colors">
                            {deal.action}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Revenue Trend Area Chart */}
            <div className="bg-white border border-[#E8E2DC] rounded-lg p-5">
               <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider mb-1">Revenue & Volume Trend</h3>
                  <p className="text-xs text-[#888880]">Last 12 weeks</p>
                </div>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueTrend} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.coral} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={COLORS.coral} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E2DC" />
                    <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888880' }} dy={10} />
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888880' }} tickFormatter={(val) => `$${val/1000}k`} />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888880' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1A1A1A', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Area yAxisId="left" type="monotone" dataKey="revenue" stroke={COLORS.coral} strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
                    <Line yAxisId="right" type="monotone" dataKey="volume" stroke={COLORS.info} strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            {/* Split: Incoming RFQs + Logistics */}
            <div className="grid grid-cols-2 gap-6">
              {/* RFQs */}
              <div className="bg-white border border-[#E8E2DC] rounded-lg p-5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wider">Incoming RFQs</h3>
                  <span className="text-xs bg-[#C73B22] text-white px-2 py-0.5 rounded-full font-medium">3 New</span>
                </div>
                <div className="space-y-3">
                  {[
                    { cmdty: "Cocoa", qty: "500 MT", id: "FT-IMP-882", age: "2h" },
                    { cmdty: "Gold", qty: "50 oz", id: "FT-IMP-112", age: "5h" },
                    { cmdty: "Cotton", qty: "1,200 MT", id: "FT-IMP-441", age: "1d" }
                  ].map((rfq, i) => (
                    <div key={i} className="flex justify-between items-center p-3 border border-[#E8E2DC] rounded bg-[#FAFAF8]">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm">{rfq.cmdty}</span>
                          <span className="text-xs text-[#888880]">&bull; {rfq.qty}</span>
                        </div>
                        <div className="text-xs font-mono text-[#888880]">{rfq.id} <span className="text-[#D97706] tracking-tighter">★★★★</span></div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="text-[10px] text-[#888880] uppercase flex items-center"><Clock className="w-3 h-3 mr-1" />{rfq.age}</span>
                        <div className="flex gap-1.5">
                          <button className="text-xs bg-[#059669] text-white px-2 py-1 rounded">Accept</button>
                          <button className="text-xs bg-white border border-[#E8E2DC] px-2 py-1 rounded">Counter</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Inbox/Logistics */}
              <div className="space-y-6">
                <div className="bg-white border border-[#E8E2DC] rounded-lg p-5">
                  <h3 className="text-sm font-semibold uppercase tracking-wider mb-4">Compliance Inbox</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="font-medium flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5 text-[#D97706]"/> KYB Annual Renewal</span>
                        <span className="text-[#888880]">80%</span>
                      </div>
                      <div className="w-full bg-[#E8E2DC] h-1.5 rounded-full overflow-hidden">
                        <div className="bg-[#D97706] h-full" style={{ width: '80%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="font-medium flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-[#2563EB]"/> Phyto Cert (TC-881)</span>
                        <span className="text-[#888880]">40%</span>
                      </div>
                      <div className="w-full bg-[#E8E2DC] h-1.5 rounded-full overflow-hidden">
                        <div className="bg-[#2563EB] h-full" style={{ width: '40%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-[#E8E2DC] rounded-lg p-5">
                  <h3 className="text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Ship className="w-4 h-4 text-[#888880]" /> Active Logistics
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs mb-2">
                        <span className="font-medium">Abidjan</span>
                        <span className="text-[#888880]">Rotterdam</span>
                      </div>
                      <div className="relative w-full h-1 bg-[#E8E2DC] rounded-full mb-1">
                        <div className="absolute top-0 left-0 h-full bg-[#1A1A1A] rounded-full" style={{ width: '65%' }}></div>
                        <div className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-[#C73B22] rounded-full border-2 border-white shadow-sm" style={{ left: '65%' }}></div>
                      </div>
                      <div className="text-[10px] text-right text-[#888880]">ETA: 4 days</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column - Side Rail (4 cols) */}
          <div className="col-span-4 space-y-6">
            
            <Speedometer score={87} />

            {/* Quick Actions */}
            <div className="bg-[#1A1A1A] text-white rounded-lg p-1">
               <div className="grid grid-cols-2 gap-px bg-[#333]">
                 <button className="flex flex-col items-center justify-center p-4 bg-[#1A1A1A] hover:bg-[#2A2A2A] transition-colors rounded-tl-md">
                   <PlusCircle className="w-5 h-5 mb-2 text-[#E86A4F]" />
                   <span className="text-xs font-medium text-center">Create<br/>Consignment</span>
                 </button>
                 <button className="flex flex-col items-center justify-center p-4 bg-[#1A1A1A] hover:bg-[#2A2A2A] transition-colors rounded-tr-md">
                   <ShoppingCart className="w-5 h-5 mb-2 text-[#E86A4F]" />
                   <span className="text-xs font-medium text-center">List on<br/>Marketplace</span>
                 </button>
                 <button className="flex flex-col items-center justify-center p-4 bg-[#1A1A1A] hover:bg-[#2A2A2A] transition-colors rounded-bl-md">
                   <Upload className="w-5 h-5 mb-2 text-[#E86A4F]" />
                   <span className="text-xs font-medium text-center">Upload<br/>Document</span>
                 </button>
                 <button className="flex flex-col items-center justify-center p-4 bg-[#1A1A1A] hover:bg-[#2A2A2A] transition-colors rounded-br-md">
                   <Wallet className="w-5 h-5 mb-2 text-[#E86A4F]" />
                   <span className="text-xs font-medium text-center">View<br/>Escrow</span>
                 </button>
               </div>
            </div>

            {/* Wallet Stacked Meters */}
            <div className="bg-white border border-[#E8E2DC] rounded-lg p-5">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[#888880]" /> Multi-Currency Wallet
                </h3>
              </div>
              <div className="space-y-5">
                {walletData.map((w, i) => {
                  const total = w.available + w.locked + w.pending;
                  const pAvail = (w.available / total) * 100;
                  const pLock = (w.locked / total) * 100;
                  const pPend = (w.pending / total) * 100;
                  return (
                    <div key={i}>
                      <div className="flex justify-between items-end mb-2">
                        <span className="font-semibold text-sm">{w.currency}</span>
                        <span className="text-xs font-mono text-[#1A1A1A] font-medium">{total.toLocaleString()}</span>
                      </div>
                      <div className="flex h-2 w-full gap-0.5 rounded overflow-hidden">
                        {pAvail > 0 && <div className="h-full bg-[#059669]" style={{ width: `${pAvail}%` }} title={`Available: ${w.available}`} />}
                        {pLock > 0 && <div className="h-full bg-[#888880]" style={{ width: `${pLock}%` }} title={`Locked: ${w.locked}`} />}
                        {pPend > 0 && <div className="h-full bg-[#D97706]" style={{ width: `${pPend}%` }} title={`Pending: ${w.pending}`} />}
                      </div>
                    </div>
                  )
                })}
                <div className="flex gap-4 text-[10px] text-[#888880] mt-4 pt-4 border-t border-[#E8E2DC]">
                   <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#059669]"></div> Available</div>
                   <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#888880]"></div> Escrow</div>
                   <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#D97706]"></div> Pending</div>
                </div>
              </div>
            </div>

            {/* Commodity Mix Donut */}
            <div className="bg-white border border-[#E8E2DC] rounded-lg p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wider mb-2">Commodity Mix</h3>
              <div className="relative h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={commodityMix}
                      cx="50%" cy="50%"
                      innerRadius={50} outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      {commodityMix.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1A1A1A', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                      itemStyle={{ color: '#fff' }}
                      formatter={(val) => `${val}%`}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-lg font-bold text-[#1A1A1A]">1,240</span>
                  <span className="text-[10px] text-[#888880] uppercase tracking-wider">MT Total</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2 justify-center">
                 {commodityMix.map((c, i) => (
                   <div key={i} className="flex items-center gap-1.5 text-xs text-[#1A1A1A]">
                     <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }}></div>
                     {c.name}
                   </div>
                 ))}
              </div>
            </div>

             {/* Mini Bar Chart - Weekly RFQs */}
             <div className="bg-white border border-[#E8E2DC] rounded-lg p-5">
               <h3 className="text-sm font-semibold uppercase tracking-wider mb-4">Weekly RFQ Volume</h3>
               <div className="h-32 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={rfqVolume} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E2DC" />
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888880' }} dy={5} />
                      <Tooltip 
                        cursor={{ fill: '#FAFAF8' }}
                        contentStyle={{ backgroundColor: '#1A1A1A', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                      />
                      <Bar dataKey="rfqs" fill={COLORS.redbrick} radius={[2, 2, 0, 0]} maxBarSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
               </div>
             </div>

          </div>

        </div>
      </div>
    </div>
  );
}
