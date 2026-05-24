import React from "react";
import {
  RadialBarChart,
  RadialBar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  Bell,
  CheckCircle2,
  Clock,
  FileText,
  Plus,
  Shield,
  Star,
  Wallet,
  Globe,
  Package,
  Activity
} from "lucide-react";

// --- Brand Tokens ---
const colors = {
  primary: "#C73B22",
  coral: "#E86A4F",
  cream: "#FAFAF8",
  dark: "#1A1A1A",
  muted: "#888880",
  border: "#E8E2DC",
  success: "#059669",
  warning: "#D97706",
  info: "#2563EB",
  gold: "#D4AF37",
};

// --- Dummy Data ---
const kpiData = [
  { name: "Escrow Utilization", value: 68, fill: colors.primary },
  { name: "On-time Delivery", value: 87, fill: colors.success },
  { name: "Compliance", value: 92, fill: colors.info },
];

const alertData = [{ name: "Alerts", value: 3, fill: colors.warning }];

const mixData = [
  { name: "Cocoa", value: 38, fill: "#8B5A2B" },
  { name: "Cotton", value: 24, fill: "#F0E6D2" },
  { name: "Coffee", value: 18, fill: "#6F4E37" },
  { name: "Lithium", value: 12, fill: "#B0C4DE" },
  { name: "Gold", value: 8, fill: colors.gold },
];

const kanbanStages = [
  "Consignments",
  "In Transit",
  "Marketplace",
  "Escrow",
  "Settling",
];

const kanbanCards = [
  {
    id: "DL-9012",
    stage: "Consignments",
    commodity: "Cocoa",
    qty: "400 MT",
    counterparty: "FT-IMP-8821",
    rating: 4.8,
    progress: 30,
    sparkData: [{ p: 10 }, { p: 15 }, { p: 12 }, { p: 20 }, { p: 18 }],
  },
  {
    id: "DL-8834",
    stage: "In Transit",
    commodity: "Coffee",
    qty: "250 MT",
    counterparty: "FT-IMP-1029",
    rating: 4.5,
    progress: 50,
    sparkData: [{ p: 20 }, { p: 18 }, { p: 22 }, { p: 25 }, { p: 24 }],
  },
  {
    id: "DL-7721",
    stage: "Escrow",
    commodity: "Gold",
    qty: "50 kg",
    counterparty: "FT-IMP-5542",
    rating: 5.0,
    progress: 80,
    sparkData: [{ p: 100 }, { p: 105 }, { p: 110 }, { p: 108 }, { p: 115 }],
  },
];

const walletData = [
  { currency: "USD", available: 1200000, locked: 3000000, pending: 400000 },
  { currency: "EUR", available: 450000, locked: 800000, pending: 100000 },
  { currency: "GBP", available: 150000, locked: 0, pending: 50000 },
];

const areaData = Array.from({ length: 12 }, (_, i) => ({
  week: `W${i + 1}`,
  revenue: 100 + i * 20 + Math.random() * 30,
  volume: 50 + i * 10 + Math.random() * 15,
}));

export function OperationsCockpit() {
  return (
    <div
      className="min-h-screen font-sans w-full"
      style={{ backgroundColor: colors.cream, color: colors.dark, fontFamily: "Inter, sans-serif" }}
    >
      {/* Ticker Strip */}
      <div className="flex items-center text-[11px] font-medium py-1.5 px-6 border-b uppercase tracking-wider bg-black text-white">
        <div className="flex items-center gap-2 mr-6 text-red-400">
          <Activity size={12} className="animate-pulse" />
          <span className="font-bold">LIVE PULSE</span>
        </div>
        <div className="flex items-center gap-8 overflow-hidden whitespace-nowrap opacity-90">
          <span className="flex items-center gap-1.5">Cocoa <span className="tabular-nums font-bold">$3,420/MT</span> <span className="text-emerald-400">▲ 1.2%</span></span>
          <span className="flex items-center gap-1.5">Cotton <span className="tabular-nums font-bold">$0.74/lb</span> <span className="text-red-400">▼ 0.3%</span></span>
          <span className="flex items-center gap-1.5">Coffee <span className="tabular-nums font-bold">$1.89/lb</span> <span className="text-emerald-400">▲ 0.5%</span></span>
          <span className="flex items-center gap-1.5">Gold <span className="tabular-nums font-bold text-yellow-400">$2,341/oz</span> <span className="text-emerald-400">▲ 0.4%</span></span>
        </div>
      </div>

      {/* Header */}
      <header
        className="px-8 py-6 border-b flex justify-between items-start sticky top-0 z-10"
        style={{ backgroundColor: "rgba(250, 250, 248, 0.95)", backdropFilter: "blur(8px)", borderColor: colors.border }}
      >
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold tracking-tight">Welcome back, Charan</h1>
            <span
              className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border"
              style={{ backgroundColor: `${colors.success}10`, color: colors.success, borderColor: `${colors.success}30` }}
            >
              <Shield size={12} /> Corporate KYC Approved
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm" style={{ color: colors.muted }}>
            <span>Exporter &middot; Raminvest Holding DIFC</span>
            <span className="px-2 py-0.5 rounded font-mono text-xs" style={{ backgroundColor: "#E8E2DC" }}>FT-ID FT-EXP-04821</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="p-2.5 rounded-lg border bg-white hover:bg-gray-50 transition-colors relative" style={{ borderColor: colors.border }}>
            <Bell size={18} style={{ color: colors.dark }} />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full" style={{ backgroundColor: colors.primary }} />
          </button>
          <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center font-bold text-gray-600 border" style={{ borderColor: colors.border }}>
            CH
          </div>
        </div>
      </header>

      <div className="p-8 max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          
          {/* Top Strip: Meters */}
          <div className="grid grid-cols-5 gap-4">
            {/* Speedometer (Span 2) */}
            <div className="col-span-2 p-5 rounded-xl border flex flex-col items-center justify-center relative bg-white" style={{ borderColor: colors.border }}>
              <h3 className="text-sm font-bold absolute top-5 left-5">Trade Health Score</h3>
              <div className="w-48 h-24 mt-8 relative">
                <ResponsiveContainer width="100%" height="200%">
                  <PieChart>
                    <Pie
                      data={[{ value: 87 }, { value: 13 }]}
                      cx="50%"
                      cy="50%"
                      startAngle={180}
                      endAngle={0}
                      innerRadius={65}
                      outerRadius={85}
                      dataKey="value"
                      stroke="none"
                    >
                      <Cell fill={colors.success} />
                      <Cell fill="#f3f4f6" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute top-[60%] left-1/2 -translate-x-1/2 text-center">
                  <span className="text-3xl font-bold tabular-nums tracking-tighter" style={{ color: colors.success }}>87</span>
                </div>
              </div>
              <div className="w-full mt-2 grid grid-cols-3 gap-2 px-2">
                 <div className="flex flex-col gap-1"><span className="text-[10px] text-gray-500">Delivery</span><div className="h-1 bg-green-500 rounded" style={{width: '90%'}}></div></div>
                 <div className="flex flex-col gap-1"><span className="text-[10px] text-gray-500">Docs</span><div className="h-1 bg-green-500 rounded" style={{width: '80%'}}></div></div>
                 <div className="flex flex-col gap-1"><span className="text-[10px] text-gray-500">Compliance</span><div className="h-1 bg-amber-500 rounded" style={{width: '60%'}}></div></div>
              </div>
            </div>

            {/* KPI Rings (Span 2) */}
            <div className="col-span-2 p-5 rounded-xl border grid grid-cols-3 gap-2 bg-white" style={{ borderColor: colors.border }}>
               {kpiData.map((kpi, i) => (
                 <div key={i} className="flex flex-col items-center justify-center text-center">
                   <div className="w-16 h-16 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart cx="50%" cy="50%" innerRadius="75%" outerRadius="100%" barSize={6} data={[kpi]} startAngle={90} endAngle={-270}>
                        <RadialBar background dataKey="value" cornerRadius={10} />
                      </RadialBarChart>
                    </ResponsiveContainer>
                   </div>
                   <span className="text-[10px] font-semibold mt-2 leading-tight h-8 text-gray-600">{kpi.name}</span>
                   <span className="text-sm font-bold tabular-nums" style={{ color: kpi.fill }}>{kpi.value}%</span>
                 </div>
               ))}
            </div>

            {/* Alert Ring (Span 1) */}
            <div className="col-span-1 p-5 rounded-xl border flex flex-col items-center justify-center bg-white" style={{ borderColor: colors.border }}>
                <h3 className="text-xs font-bold mb-3 text-gray-500">Pending Actions</h3>
                <div className="w-16 h-16 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart cx="50%" cy="50%" innerRadius="80%" outerRadius="100%" barSize={8} data={alertData} startAngle={90} endAngle={-270}>
                      <RadialBar background dataKey="value" cornerRadius={10} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold tabular-nums" style={{ color: colors.warning }}>3</span>
                  </div>
                </div>
            </div>
          </div>

          {/* Action Center Scroller */}
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2 text-gray-500">
              <CheckCircle2 size={16} /> Action Center
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
              {[
                { title: "Upload Bill of Lading", ref: "CN-554", val: 60, color: colors.primary },
                { title: "KYB Renewal", ref: "Corp Doc", val: 80, color: colors.warning },
                { title: "Approve RFQ Counter", ref: "RQ-4412", val: 0, color: colors.info },
              ].map((act, i) => (
                <div key={i} className="min-w-[260px] p-4 rounded-xl border flex items-center gap-4 bg-white shadow-sm hover:border-gray-400 transition-colors" style={{ borderColor: colors.border }}>
                  <div className="w-12 h-12 flex-shrink-0 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={[{ value: act.val }, { value: 100 - act.val }]} cx="50%" cy="50%" innerRadius={18} outerRadius={24} dataKey="value" stroke="none">
                          <Cell fill={act.color} />
                          <Cell fill="#f3f4f6" />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-gray-600">{act.val}%</div>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold truncate w-36 mb-0.5">{act.title}</h4>
                    <p className="text-xs font-mono" style={{ color: colors.muted }}>{act.ref}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Kanban Pipeline */}
          <div className="flex-1 flex flex-col">
            <h2 className="text-sm font-bold uppercase tracking-wider mb-3 text-gray-500">Live Pipeline</h2>
            <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
              {kanbanStages.map((stage) => (
                <div key={stage} className="w-[280px] flex-shrink-0 flex flex-col">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-xs uppercase tracking-wide text-gray-700">{stage}</h3>
                    <span className="text-[10px] font-bold bg-gray-200 px-2 py-0.5 rounded-full tabular-nums">
                      {kanbanCards.filter(c => c.stage === stage).length}
                    </span>
                  </div>
                  <div className="flex flex-col gap-3">
                    {kanbanCards.filter(c => c.stage === stage).map(card => (
                      <div key={card.id} className="p-4 rounded-xl border bg-white shadow-sm" style={{ borderColor: colors.border }}>
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100" style={{ color: colors.primary }}>{card.id}</span>
                          <span className="flex items-center text-[10px] text-amber-500 font-bold">
                            <Star size={10} className="mr-0.5 fill-current" /> {card.rating}
                          </span>
                        </div>
                        <div className="font-bold text-sm mb-1">{card.commodity} <span className="font-normal text-gray-500">&middot; {card.qty}</span></div>
                        <div className="text-xs mb-3 font-mono text-gray-500">{card.counterparty}</div>
                        
                        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden flex mb-2">
                           <div className="h-full bg-emerald-500" style={{ width: `${card.progress}%` }} />
                        </div>
                        
                        <div className="flex justify-between items-center mt-3 pt-3 border-t" style={{ borderColor: colors.border }}>
                          <span className="text-[10px] font-semibold text-gray-500">Price Trend</span>
                          <div className="h-4 w-16">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={card.sparkData}>
                                <Line type="monotone" dataKey="p" stroke={colors.primary} strokeWidth={1.5} dot={false} isAnimationActive={false} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>
                    ))}
                    {kanbanCards.filter(c => c.stage === stage).length === 0 && (
                      <div className="h-24 border-2 border-dashed rounded-xl flex items-center justify-center text-gray-400 text-xs font-medium" style={{ borderColor: colors.border }}>
                        Empty
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Rail */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Wallet Stacked Meters */}
          <div className="p-6 rounded-xl border bg-white shadow-sm" style={{ borderColor: colors.border }}>
            <h2 className="text-sm font-bold uppercase tracking-wider mb-5 flex justify-between items-center text-gray-700">
              <span className="flex items-center gap-2"><Wallet size={16} /> Wallet Distribution</span>
            </h2>
            <div className="flex flex-col gap-5">
              {walletData.map(w => {
                const total = w.available + w.locked + w.pending;
                const pAvail = (w.available / total) * 100;
                const pLock = (w.locked / total) * 100;
                const pPend = (w.pending / total) * 100;
                return (
                  <div key={w.currency}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-bold">{w.currency}</span>
                      <span className="tabular-nums font-mono text-xs font-semibold">{(total/1000).toLocaleString()}k</span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden flex">
                      <div className="h-full bg-emerald-500" style={{ width: `${pAvail}%` }} />
                      <div className="h-full bg-blue-500" style={{ width: `${pLock}%` }} />
                      <div className="h-full bg-amber-500" style={{ width: `${pPend}%` }} />
                    </div>
                  </div>
                )
              })}
              <div className="flex gap-4 text-[10px] mt-2 font-semibold text-gray-500 uppercase justify-between px-2">
                 <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Available</span>
                 <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500" /> Escrow</span>
                 <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500" /> Pending</span>
              </div>
            </div>
            <button className="w-full mt-5 py-2.5 rounded-lg border text-sm font-semibold hover:bg-gray-50 transition-colors" style={{ borderColor: colors.border }}>
              Open Wallet
            </button>
          </div>

          {/* Commodity Mix Donut */}
          <div className="p-6 rounded-xl border bg-white shadow-sm" style={{ borderColor: colors.border }}>
             <h2 className="text-sm font-bold uppercase tracking-wider mb-2 text-gray-700">Commodity Mix</h2>
             <p className="text-xs mb-4 text-gray-500">By tonnage (MT)</p>
             <div className="h-48 relative">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie data={mixData} cx="50%" cy="50%" innerRadius={65} outerRadius={85} paddingAngle={2} dataKey="value" stroke="none">
                     {mixData.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={entry.fill} />
                     ))}
                   </Pie>
                   <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                 </PieChart>
               </ResponsiveContainer>
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                 <span className="block text-2xl font-bold tracking-tighter">1,240</span>
                 <span className="block text-[10px] uppercase font-bold text-gray-400">Total MT</span>
               </div>
             </div>
          </div>

          {/* Revenue Trend Area Chart */}
          <div className="p-6 rounded-xl border bg-white shadow-sm" style={{ borderColor: colors.border }}>
             <h2 className="text-sm font-bold uppercase tracking-wider mb-4 flex justify-between items-center text-gray-700">
               <span>Revenue Trend</span>
               <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full">12 Weeks</span>
             </h2>
             <div className="h-32">
               <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={areaData}>
                   <defs>
                     <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="5%" stopColor={colors.primary} stopOpacity={0.2}/>
                       <stop offset="95%" stopColor={colors.primary} stopOpacity={0}/>
                     </linearGradient>
                   </defs>
                   <Area type="monotone" dataKey="revenue" stroke={colors.primary} strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
                 </AreaChart>
               </ResponsiveContainer>
             </div>
          </div>

          {/* Quick Actions List */}
          <div className="p-6 rounded-xl border bg-white shadow-sm" style={{ borderColor: colors.border }}>
            <h2 className="text-sm font-bold uppercase tracking-wider mb-4 text-gray-700">Quick Actions</h2>
            <div className="flex flex-col gap-2">
              {[
                { icon: <Plus size={16} />, label: "Create Consignment" },
                { icon: <Globe size={16} />, label: "List on Marketplace" },
                { icon: <FileText size={16} />, label: "Submit RFQ Response" },
                { icon: <Shield size={16} />, label: "View Escrow" },
              ].map((act, i) => (
                <button key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors text-left border border-transparent hover:border-gray-200" style={{ color: colors.dark }}>
                  <span className="text-gray-400">{act.icon}</span>
                  {act.label}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
