import React from 'react';
import { 
  CheckCircle2, AlertTriangle, XCircle, Activity, 
  TrendingUp, TrendingDown, Clock, ShieldCheck, Star, 
  Plus, ArrowUpRight, FileText, Anchor, Search, MoreVertical,
  Check, CircleDashed, Loader2, ArrowRight
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid
} from 'recharts';

const BRAND_COLORS = {
  primary: '#C73B22',
  primaryHover: '#A82F1B',
  coral: '#E86A4F',
  cream: '#FAFAF8',
  white: '#FFFFFF',
  dark: '#1A1A1A',
  secondary: '#4A4A48',
  muted: '#888880',
  border: '#E8E2DC',
  bgSubtle: '#F5F0EB',
  gridline: '#F0EBE5',
  success: '#059669',
  warning: '#D97706',
  info: '#2563EB',
  gold: '#D4AF37'
};

const REV_DATA = [
  { week: 'W1', revenue: 120000, volume: 400 },
  { week: 'W2', revenue: 135000, volume: 450 },
  { week: 'W3', revenue: 125000, volume: 420 },
  { week: 'W4', revenue: 150000, volume: 500 },
  { week: 'W5', revenue: 180000, volume: 600 },
  { week: 'W6', revenue: 170000, volume: 550 },
  { week: 'W7', revenue: 195000, volume: 650 },
  { week: 'W8', revenue: 210000, volume: 700 },
  { week: 'W9', revenue: 205000, volume: 680 },
  { week: 'W10', revenue: 230000, volume: 750 },
  { week: 'W11', revenue: 250000, volume: 820 },
  { week: 'W12', revenue: 280000, volume: 900 },
];

const COMMODITY_DATA = [
  { name: 'Cocoa', value: 450, color: '#C73B22' },
  { name: 'Coffee', value: 380, color: '#E86A4F' },
  { name: 'Cotton', value: 250, color: '#4A4A48' },
  { name: 'Cashew', value: 160, color: '#888880' },
];

const TICKER_DATA = [
  { name: 'Cocoa', price: 9245.50, change: 2.4, history: [8900, 9000, 9150, 9100, 9245] },
  { name: 'Coffee', price: 184.20, change: -0.8, history: [190, 188, 185, 186, 184.2] },
  { name: 'Cotton', price: 82.45, change: 1.2, history: [80, 81, 80.5, 81.5, 82.45] },
  { name: 'Gold', price: 2345.10, change: 0.5, history: [2330, 2335, 2340, 2338, 2345.1] }
];

export function OperationsCockpit() {
  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#1A1A1A] font-sans p-6 pb-24" style={{ minWidth: 1280, maxWidth: 1280, margin: '0 auto' }}>
      
      {/* Header */}
      <header className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1A1A1A] mb-1">Welcome back, Charan</h1>
          <p className="text-[13px] text-[#4A4A48] flex items-center gap-2">
            Exporter &middot; Raminvest Holding DIFC &middot; <span className="font-mono text-[#888880]">FT-EXP-04821</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#059669]/10 text-[#059669] text-[11px] font-medium tracking-wide uppercase ml-2">
              <CheckCircle2 size={12} /> Corporate KYC Approved
            </span>
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-[12px] text-[#4A4A48] bg-white px-3 py-1.5 rounded-full border border-[#E8E2DC] shadow-[0_1px_2px_rgba(26,26,26,0.04)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#059669] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#059669]"></span>
            </span>
            Platform Active
          </div>
          <button className="h-10 px-4 bg-[#C73B22] hover:bg-[#A82F1B] text-white text-[13px] font-medium rounded-xl transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-[#C73B22]/40">
            Create Consignment
          </button>
        </div>
      </header>

      {/* Top Hero: Health + KPIs */}
      <div className="grid grid-cols-12 gap-6 mb-6">
        
        {/* Trade Health Speedometer */}
        <div className="col-span-3 bg-white rounded-2xl border border-[#E8E2DC] p-5 shadow-[0_1px_2px_rgba(26,26,26,0.04)] flex flex-col justify-between">
          <h2 className="text-[14px] font-semibold uppercase tracking-wider text-[#888880] mb-4">Trade Health Score</h2>
          <div className="relative flex flex-col items-center justify-center pt-2 pb-4">
            <svg width="180" height="90" viewBox="0 0 180 90" className="overflow-visible">
              <path d="M 10 90 A 80 80 0 0 1 170 90" fill="none" stroke="#F5F0EB" strokeWidth="16" strokeLinecap="round" />
              <path d="M 10 90 A 80 80 0 0 1 170 90" fill="none" stroke="#059669" strokeWidth="16" strokeLinecap="round" strokeDasharray="251.2" strokeDashoffset="32.6" className="transition-all duration-1000 ease-out" />
            </svg>
            <div className="absolute bottom-2 flex flex-col items-center">
              <span className="text-[32px] font-bold text-[#1A1A1A]">87</span>
              <span className="text-[12px] text-[#4A4A48]">Out of 100</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 mt-2">
            <div>
              <div className="flex justify-between text-[11px] mb-1"><span className="text-[#4A4A48]">On-time</span><span className="font-medium text-[#1A1A1A]">92%</span></div>
              <div className="h-1.5 bg-[#F5F0EB] rounded-full overflow-hidden"><div className="h-full bg-[#059669] w-[92%] rounded-full" /></div>
            </div>
            <div>
              <div className="flex justify-between text-[11px] mb-1"><span className="text-[#4A4A48]">Compliance</span><span className="font-medium text-[#1A1A1A]">95%</span></div>
              <div className="h-1.5 bg-[#F5F0EB] rounded-full overflow-hidden"><div className="h-full bg-[#059669] w-[95%] rounded-full" /></div>
            </div>
            <div>
              <div className="flex justify-between text-[11px] mb-1"><span className="text-[#4A4A48]">Rating</span><span className="font-medium text-[#1A1A1A]">4.7</span></div>
              <div className="h-1.5 bg-[#F5F0EB] rounded-full overflow-hidden"><div className="h-full bg-[#2563EB] w-[94%] rounded-full" /></div>
            </div>
            <div>
              <div className="flex justify-between text-[11px] mb-1"><span className="text-[#4A4A48]">Docs</span><span className="font-medium text-[#1A1A1A]">78%</span></div>
              <div className="h-1.5 bg-[#F5F0EB] rounded-full overflow-hidden"><div className="h-full bg-[#D97706] w-[78%] rounded-full" /></div>
            </div>
          </div>
        </div>

        {/* 4 Radial KPIs */}
        <div className="col-span-9 grid grid-cols-4 gap-6">
          <KPIRingCard title="Active Consignments" value="8" total="12" sub="vol" delta="+2 this week" color="#C73B22" progress={66} />
          <KPIRingCard title="Verified Inventory" value="1,240" total="2,000 MT" sub="" delta="62% Util" color="#2563EB" progress={62} />
          <KPIRingCard title="Open RFQs" value="12" total="" sub="reqs" delta="+3 today" color="#E86A4F" progress={80} />
          <KPIRingCard title="Escrow Locked" value="$4.2M" total="$6M committed" sub="" delta="70% Util" color="#D4AF37" progress={70} />
        </div>
      </div>

      {/* Main Grid: Swimlanes + Right Rail */}
      <div className="grid grid-cols-12 gap-6">
        
        {/* Left: Action Center & Kanban */}
        <div className="col-span-8 flex flex-col gap-6">
          
          {/* Action Center Scroller */}
          <div className="bg-white rounded-2xl border border-[#E8E2DC] p-5 shadow-[0_1px_2px_rgba(26,26,26,0.04)]">
            <h2 className="text-[14px] font-semibold uppercase tracking-wider text-[#888880] mb-4">Priority Actions</h2>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              <ActionCard title="Upload BoL" desc="Ref FT-CON-8291" status="overdue" progress={80} />
              <ActionCard title="KYB Renewal" desc="Expires in 12 days" status="warning" progress={65} />
              <ActionCard title="Accept RFQ" desc="FT-ID-8842 · Cocoa" status="info" progress={0} />
              <ActionCard title="Verify Delivery" desc="Ref FT-CON-7731" status="info" progress={40} />
            </div>
          </div>

          {/* Kanban Swimlanes (Condensed) */}
          <div className="bg-white rounded-2xl border border-[#E8E2DC] p-5 shadow-[0_1px_2px_rgba(26,26,26,0.04)] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[14px] font-semibold uppercase tracking-wider text-[#888880]">Active Pipeline</h2>
              <button className="text-[13px] text-[#2563EB] font-medium hover:underline focus:outline-none focus:ring-2 focus:ring-[#2563EB]/40 rounded">View All</button>
            </div>
            
            <div className="grid grid-cols-5 gap-4 flex-1">
              <Swimlane title="Consignments" count={2}>
                <DealCard refId="FT-CON-901" commodity="Cocoa" qty="400 MT" partner="FT-ID-102" step={1} />
                <DealCard refId="FT-CON-904" commodity="Coffee" qty="150 MT" partner="FT-ID-442" step={1} />
              </Swimlane>
              <Swimlane title="In Transit" count={1}>
                <DealCard refId="FT-CON-882" commodity="Cotton" qty="200 MT" partner="FT-ID-911" step={2} />
              </Swimlane>
              <Swimlane title="Marketplace" count={0} />
              <Swimlane title="Escrow" count={2}>
                <DealCard refId="FT-CON-821" commodity="Cocoa" qty="500 MT" partner="FT-ID-223" step={4} />
                <DealCard refId="FT-CON-819" commodity="Cashew" qty="100 MT" partner="FT-ID-405" step={4} />
              </Swimlane>
              <Swimlane title="Settling" count={1}>
                <DealCard refId="FT-CON-799" commodity="Coffee" qty="250 MT" partner="FT-ID-881" step={5} />
              </Swimlane>
            </div>
          </div>

          {/* Revenue Chart */}
          <div className="bg-white rounded-2xl border border-[#E8E2DC] p-5 shadow-[0_1px_2px_rgba(26,26,26,0.04)]">
             <div className="flex items-center justify-between mb-4">
                <h2 className="text-[14px] font-semibold uppercase tracking-wider text-[#888880]">Revenue & Volume (12W)</h2>
                <div className="flex items-center gap-4 text-[12px]">
                  <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#C73B22]"></div><span className="text-[#4A4A48]">Revenue ($)</span></div>
                  <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#E8E2DC]"></div><span className="text-[#4A4A48]">Volume (MT)</span></div>
                </div>
             </div>
             <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={REV_DATA} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#C73B22" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#C73B22" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0EBE5" />
                    <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#888880' }} dy={10} />
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#888880' }} tickFormatter={(val) => `$${val/1000}k`} />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#888880' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1A1A1A', border: 'none', borderRadius: '8px', color: '#FAFAF8', fontSize: '12px' }}
                      itemStyle={{ color: '#FAFAF8' }}
                      formatter={(val: number, name: string) => [name === 'revenue' ? `$${val.toLocaleString()}` : `${val} MT`, name === 'revenue' ? 'Revenue' : 'Volume']}
                    />
                    <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="#C73B22" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
                    <Line yAxisId="right" type="monotone" dataKey="volume" stroke="#E8E2DC" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
             </div>
          </div>

        </div>

        {/* Right Rail: Ticker, Wallet, Mix */}
        <div className="col-span-4 flex flex-col gap-6">
          
          {/* Ticker */}
          <div className="bg-white rounded-2xl border border-[#E8E2DC] shadow-[0_1px_2px_rgba(26,26,26,0.04)] overflow-hidden">
            <div className="bg-[#1A1A1A] px-4 py-3 flex items-center justify-between">
              <h2 className="text-[12px] font-semibold uppercase tracking-wider text-[#FAFAF8] flex items-center gap-2">
                <Activity size={14} className="text-[#E86A4F]" /> Live Markets
              </h2>
            </div>
            <div className="divide-y divide-[#F5F0EB]">
              {TICKER_DATA.map((t) => (
                <div key={t.name} className="p-3 flex items-center justify-between hover:bg-[#FDFCFA] transition-colors cursor-pointer focus:outline-none focus:bg-[#FDFCFA]" tabIndex={0}>
                  <div>
                    <div className="text-[13px] font-medium text-[#1A1A1A]">{t.name}</div>
                    <div className="font-mono text-[12px] text-[#4A4A48]">${t.price.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                  </div>
                  <div className="w-16 h-8">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={t.history.map((v, i) => ({v, i}))}>
                        <Line type="monotone" dataKey="v" stroke={t.change >= 0 ? '#059669' : '#C73B22'} strokeWidth={1.5} dot={false} isAnimationActive={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className={`text-[12px] font-medium flex items-center gap-0.5 ${t.change >= 0 ? 'text-[#059669]' : 'text-[#C73B22]'}`}>
                    {t.change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {Math.abs(t.change)}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Wallet */}
          <div className="bg-white rounded-2xl border border-[#E8E2DC] p-5 shadow-[0_1px_2px_rgba(26,26,26,0.04)]">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[14px] font-semibold uppercase tracking-wider text-[#888880]">Wallets</h2>
              <button className="text-[12px] text-[#4A4A48] hover:text-[#1A1A1A] font-medium flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-[#C73B22]/40 rounded">
                View All <ArrowUpRight size={14} />
              </button>
            </div>
            <div className="space-y-4">
              <WalletBar currency="USD" avail={1250000} locked={4200000} />
              <WalletBar currency="EUR" avail={340000} locked={80000} />
              <WalletBar currency="GBP" avail={0} locked={120000} />
            </div>
            <button className="w-full h-10 mt-5 border border-[#E8E2DC] text-[#1A1A1A] text-[13px] font-medium rounded-xl hover:bg-[#F5F0EB] transition-colors focus:outline-none focus:ring-2 focus:ring-[#C73B22]/40 shadow-sm">
              Deposit Funds
            </button>
          </div>

          {/* Mix Donut */}
          <div className="bg-white rounded-2xl border border-[#E8E2DC] p-5 shadow-[0_1px_2px_rgba(26,26,26,0.04)]">
            <h2 className="text-[14px] font-semibold uppercase tracking-wider text-[#888880] mb-2">Commodity Mix</h2>
            <div className="relative h-48 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={COMMODITY_DATA} innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value" stroke="none">
                    {COMMODITY_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px', border: '1px solid #E8E2DC' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[20px] font-bold text-[#1A1A1A]">1,240</span>
                <span className="text-[11px] text-[#888880] uppercase tracking-wider">Total MT</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-y-2 mt-2">
              {COMMODITY_DATA.map((c) => (
                <div key={c.name} className="flex items-center gap-2 text-[12px]">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                  <span className="text-[#4A4A48] flex-1">{c.name}</span>
                  <span className="font-mono text-[#1A1A1A]">{c.value}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// Subcomponents

function KPIRingCard({ title, value, total, sub, delta, color, progress }: any) {
  const r = 36;
  const c = 50;
  const dash = 2 * Math.PI * r;
  const offset = dash - (progress / 100) * dash;

  return (
    <div className="bg-white rounded-2xl border border-[#E8E2DC] p-4 shadow-[0_1px_2px_rgba(26,26,26,0.04)] hover:shadow-md hover:border-[#DDD5CC] transition-all flex flex-col justify-between group cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#C73B22]/40" tabIndex={0}>
      <h3 className="text-[12px] font-semibold uppercase tracking-wider text-[#888880] mb-3">{title}</h3>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-baseline gap-1">
            <span className="text-[24px] font-bold text-[#1A1A1A] tabular-nums">{value}</span>
            {total && <span className="text-[12px] text-[#888880]">/{total}</span>}
          </div>
          <div className="text-[11px] text-[#4A4A48] mt-1 bg-[#F5F0EB] self-start inline-block px-1.5 py-0.5 rounded font-medium">{delta}</div>
        </div>
        <div className="relative w-[70px] h-[70px] flex-shrink-0">
          <svg width="70" height="70" viewBox="0 0 100 100" className="-rotate-90 transform origin-center">
            <circle cx="50" cy="50" r={r} fill="none" stroke="#F5F0EB" strokeWidth="12" />
            <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="12" strokeDasharray={dash} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function ActionCard({ title, desc, status, progress }: any) {
  return (
    <div className="flex-shrink-0 w-[240px] p-3 rounded-xl border border-[#E8E2DC] bg-[#FAFAF8] flex items-center gap-3 hover:bg-white hover:border-[#DDD5CC] transition-colors cursor-pointer group focus:outline-none focus:ring-2 focus:ring-[#C73B22]/40" tabIndex={0}>
      <div className="relative w-10 h-10 flex-shrink-0">
         <svg width="40" height="40" viewBox="0 0 40 40" className="-rotate-90 transform origin-center">
            <circle cx="20" cy="20" r="16" fill="none" stroke="#E8E2DC" strokeWidth="4" />
            <circle cx="20" cy="20" r="16" fill="none" stroke={status === 'overdue' ? '#C73B22' : status === 'warning' ? '#D97706' : '#2563EB'} strokeWidth="4" strokeDasharray="100.5" strokeDashoffset={100.5 - (progress / 100) * 100.5} strokeLinecap="round" />
         </svg>
         <div className={`absolute inset-0 flex items-center justify-center ${status === 'overdue' ? 'text-[#C73B22]' : status === 'warning' ? 'text-[#D97706]' : 'text-[#2563EB]'}`}>
            {status === 'overdue' ? <AlertTriangle size={14} /> : status === 'warning' ? <Clock size={14} /> : <CheckCircle2 size={14} />}
         </div>
      </div>
      <div>
        <h4 className="text-[13px] font-medium text-[#1A1A1A] group-hover:text-[#C73B22] transition-colors truncate w-36">{title}</h4>
        <p className="text-[11px] text-[#888880] mt-0.5 truncate w-36">{desc}</p>
      </div>
    </div>
  );
}

function Swimlane({ title, count, children }: any) {
  return (
    <div className="flex flex-col gap-3 bg-[#FAFAF8] p-3 rounded-xl border border-[#E8E2DC] min-h-[160px]">
      <div className="flex items-center justify-between px-1">
        <span className="text-[12px] font-semibold text-[#4A4A48] uppercase tracking-wider">{title}</span>
        <span className="text-[11px] font-medium bg-[#E8E2DC] text-[#4A4A48] px-1.5 rounded">{count}</span>
      </div>
      <div className="flex flex-col gap-2">
        {children}
      </div>
    </div>
  );
}

function DealCard({ refId, commodity, qty, partner, step }: any) {
  return (
    <div className="bg-white p-3 rounded-xl border border-[#E8E2DC] shadow-sm hover:shadow hover:border-[#DDD5CC] transition-all cursor-pointer relative overflow-hidden group focus:outline-none focus:ring-2 focus:ring-[#C73B22]/40" tabIndex={0}>
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#C73B22] opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="flex justify-between items-start mb-2">
        <span className="font-mono text-[11px] text-[#4A4A48] px-1 py-0.5 bg-[#F5F0EB] rounded">{refId}</span>
        <ArrowRight size={14} className="text-[#E8E2DC] group-hover:text-[#4A4A48] transition-colors" />
      </div>
      <div className="text-[13px] font-bold text-[#1A1A1A] mb-1">{commodity} <span className="font-normal text-[#888880]">· {qty}</span></div>
      <div className="text-[11px] text-[#4A4A48] flex items-center gap-1 mb-3">
        {partner}
      </div>
      
      {/* Milestone Segmented Bar */}
      <div className="flex gap-1 h-1.5 mb-1">
        <div className={`flex-1 rounded-full ${step >= 1 ? 'bg-[#059669]' : 'bg-[#F0EBE5]'}`} />
        <div className={`flex-1 rounded-full ${step >= 2 ? 'bg-[#059669]' : 'bg-[#F0EBE5]'}`} />
        <div className={`flex-1 rounded-full ${step >= 3 ? 'bg-[#059669]' : 'bg-[#F0EBE5]'}`} />
        <div className={`flex-1 rounded-full ${step >= 4 ? 'bg-[#059669]' : 'bg-[#F0EBE5]'}`} />
        <div className={`flex-1 rounded-full ${step >= 5 ? 'bg-[#059669]' : 'bg-[#F0EBE5]'}`} />
      </div>
    </div>
  );
}

function WalletBar({ currency, avail, locked }: any) {
  const total = avail + locked;
  const availPct = total > 0 ? (avail / total) * 100 : 0;
  const lockedPct = total > 0 ? (locked / total) * 100 : 0;

  return (
    <div>
      <div className="flex justify-between text-[13px] mb-1.5">
        <span className="font-semibold text-[#1A1A1A]">{currency}</span>
        <div className="font-mono text-[#1A1A1A]">
          {total.toLocaleString()} <span className="text-[#888880] text-[11px]">TOT</span>
        </div>
      </div>
      <div className="h-2 bg-[#F5F0EB] rounded-full overflow-hidden flex">
        <div className="h-full bg-[#059669]" style={{ width: `${availPct}%` }} />
        <div className="h-full bg-[#D4AF37]" style={{ width: `${lockedPct}%` }} />
      </div>
      <div className="flex justify-between text-[11px] mt-1.5 text-[#4A4A48]">
        <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-[#059669]" /> {avail.toLocaleString()} Avail</span>
        <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" /> {locked.toLocaleString()} Lock</span>
      </div>
    </div>
  );
}
