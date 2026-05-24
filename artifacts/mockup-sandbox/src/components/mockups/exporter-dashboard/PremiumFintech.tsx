import React from 'react';
import { 
  ArrowRight, ShieldCheck, Wallet, TrendingUp, TrendingDown, Clock, 
  CheckCircle2, AlertCircle, FileText, ArrowUpRight, ArrowDownRight, 
  Ship, Box, Tag, Zap, DollarSign, Activity, FileCheck, Check
} from 'lucide-react';

const COLORS = {
  primary: '#C73B22',
  bg: '#FAFAF8',
  text: '#1A1A1A',
  muted: '#888880',
  border: '#E8E2DC',
  success: '#059669',
  gold: '#D4AF37',
  blue: '#2563EB',
};

export default function PremiumFintech() {
  return (
    <div style={{ backgroundColor: COLORS.bg, color: COLORS.text, fontFamily: '"Inter", sans-serif', minHeight: '100vh', padding: '32px' }} className="w-full flex justify-center">
      <div className="w-full max-w-[1280px] grid grid-cols-12 gap-8">
        
        {/* Main Content Area */}
        <div className="col-span-9 flex flex-col gap-8">
          
          {/* Hero Section */}
          <div className="relative overflow-hidden rounded-[2rem] p-8 text-white shadow-sm" style={{ background: 'linear-gradient(135deg, #C73B22 0%, #E86A53 100%)' }}>
            {/* Subtle glow / noise overlay */}
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 100% 100%, rgba(255,255,255,0.4) 0%, transparent 50%)' }}></div>
            
            <div className="relative z-10 flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-light tracking-tight mb-2">Welcome back, Charan</h1>
                <div className="flex items-center gap-3 text-white/80 text-sm">
                  <span>Exporter · Raminvest Holding DIFC · FT-ID FT-EXP-04821</span>
                  <span className="w-1 h-1 rounded-full bg-white/50"></span>
                  <span className="inline-flex items-center gap-1 bg-white/10 px-2 py-1 rounded-full border border-white/20">
                    <ShieldCheck size={14} className="text-[#059669]" />
                    <span className="text-[#FAFAF8] text-xs font-medium">Corporate KYC Approved</span>
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-white/80 text-sm mb-1">Available Balance</div>
                <div className="text-4xl font-light tracking-tight font-[tabular-nums]">$842,000<span className="text-white/60 text-2xl">.00</span></div>
                <div className="text-sm mt-1 text-white/70">€310K EUR · £45K GBP</div>
              </div>
            </div>

            {/* KPI Tiles (Glassmorphic inside Hero) */}
            <div className="grid grid-cols-4 gap-4 mt-10 relative z-10">
              {[
                { label: 'Active Consignments', val: '8', icon: <Box size={16} /> },
                { label: 'Verified Inventory', val: '1,240 MT', icon: <CheckCircle2 size={16} /> },
                { label: 'Open RFQs', val: '12', icon: <Tag size={16} /> },
                { label: 'Active Trade Cases', val: '5', sub: '$4.2M locked', icon: <Activity size={16} /> }
              ].map((kpi, i) => (
                <div key={i} className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4 text-white/80">
                    <span className="text-xs font-medium uppercase tracking-wider">{kpi.label}</span>
                    {kpi.icon}
                  </div>
                  <div>
                    <div className="text-2xl font-light">{kpi.val}</div>
                    {kpi.sub && <div className="text-xs text-white/60 mt-1">{kpi.sub}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Workflow Progress */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border" style={{ borderColor: COLORS.border }}>
            <h3 className="text-sm font-medium text-[#888880] uppercase tracking-wider mb-6">Platform Workflow</h3>
            <div className="flex items-center justify-between relative">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-[2px] bg-[#E8E2DC] z-0"></div>
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[80%] h-[2px] bg-[#2563EB] z-0"></div>
              
              {['KYC', 'Consignment', 'Logistics', 'Inventory', 'Marketplace', 'Order', 'Barter', 'Trade Finance', 'Settlement'].map((step, i) => {
                const isActive = step === 'Trade Finance';
                const isPast = i < 7;
                return (
                  <div key={step} className="relative z-10 flex flex-col items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${isActive ? 'bg-[#2563EB] border-[#2563EB] text-white shadow-[0_0_0_4px_rgba(37,99,235,0.1)]' : isPast ? 'bg-[#2563EB] border-[#2563EB] text-white' : 'bg-white border-[#E8E2DC] text-[#888880]'}`}>
                      {isPast ? <Check size={14} /> : <span className="text-xs font-medium">{i+1}</span>}
                    </div>
                    <span className={`text-[10px] font-medium uppercase tracking-wider ${isActive ? 'text-[#2563EB]' : isPast ? 'text-[#1A1A1A]' : 'text-[#888880]'}`}>{step}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8">
            {/* Active Trade Cases */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border flex flex-col col-span-2" style={{ borderColor: COLORS.border }}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-medium text-[#1A1A1A]">Active Trade Cases</h2>
                <button className="text-sm font-medium text-[#2563EB] hover:underline">View All</button>
              </div>
              <div className="flex flex-col gap-4">
                {[
                  { ref: 'TC-2026-0341', commodity: 'Cocoa Beans, 240 MT', cp: 'FT-IMP-09127', rating: '4.8', trades: 23, amt: '€1,180,000', badges: ['LC Issued', 'Shipment Dispatched'], action: 'Acknowledge Receipt' },
                  { ref: 'TC-2026-0339', commodity: 'Gold, 5 kg', cp: 'FT-IMP-04421', rating: '5.0', trades: 89, amt: '$420,000', badges: ['Escrow Locked'], action: 'Upload BoL' },
                  { ref: 'TC-2026-0322', commodity: 'Lithium Ore, 1000 MT', cp: 'FT-IMP-02111', rating: '4.2', trades: 12, amt: '€2,400,000', badges: ['LC Issued', 'Goods Received'], action: 'Authorize Payout' }
                ].map((tc, i) => (
                  <div key={i} className="group p-4 rounded-2xl border border-transparent hover:border-[#E8E2DC] hover:bg-[#FAFAF8] transition-all flex items-center justify-between">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-[#1A1A1A]">{tc.ref}</span>
                        <span className="text-sm text-[#888880]">{tc.commodity}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-[#F3F4F6] text-[#4B5563] px-2 py-1 rounded-md font-medium border border-[#E5E7EB]">{tc.cp}</span>
                        <span className="text-xs text-[#D4AF37]">★ {tc.rating}</span>
                        <span className="text-xs text-[#888880]">· {tc.trades} trades</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="text-lg font-light tabular-nums">{tc.amt}</div>
                      <div className="flex gap-2">
                        {tc.badges.map(b => (
                          <span key={b} className="text-[10px] uppercase tracking-wider font-semibold text-[#059669] bg-[#059669]/10 px-2 py-1 rounded-full">{b}</span>
                        ))}
                      </div>
                    </div>
                    <div className="pl-4 border-l border-[#E8E2DC] ml-4 flex items-center">
                      <button className="bg-[#2563EB] text-white text-sm font-medium px-4 py-2 rounded-xl shadow-sm hover:bg-[#1D4ED8] transition-colors whitespace-nowrap">
                        {tc.action}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Incoming RFQs */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border flex flex-col" style={{ borderColor: COLORS.border }}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-medium text-[#1A1A1A]">Recent Incoming RFQs</h2>
              </div>
              <div className="flex flex-col gap-4">
                {[
                  { comm: 'Coffee Beans', qty: '50 MT', hub: 'Rotterdam', cp: 'FT-IMP-08812', rating: '4.9', age: '2h ago' },
                  { comm: 'Cotton', qty: '120 MT', hub: 'Dubai', cp: 'FT-IMP-01124', rating: '4.5', age: '5h ago' },
                  { comm: 'Cocoa', qty: '80 MT', hub: 'Antwerp', cp: 'FT-IMP-05531', rating: '4.7', age: '1d ago' }
                ].map((rfq, i) => (
                  <div key={i} className="flex flex-col gap-3 p-4 rounded-2xl border border-[#E8E2DC] bg-[#FAFAF8]/50">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-[#1A1A1A]">{rfq.comm} · {rfq.qty}</div>
                        <div className="text-sm text-[#888880] mt-1">Target: {rfq.hub}</div>
                      </div>
                      <span className="text-xs text-[#888880]">{rfq.age}</span>
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-3 border-t border-[#E8E2DC]">
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-white text-[#4B5563] px-2 py-1 rounded-md font-medium border border-[#E5E7EB]">{rfq.cp}</span>
                        <span className="text-xs text-[#D4AF37]">★ {rfq.rating}</span>
                      </div>
                      <div className="flex gap-2">
                        <button className="text-xs font-medium px-3 py-1.5 rounded-lg border border-[#E8E2DC] bg-white text-[#1A1A1A] hover:bg-gray-50">Counter</button>
                        <button className="text-xs font-medium px-3 py-1.5 rounded-lg bg-[#059669] text-white hover:bg-[#047857]">Accept</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Logistics & Compliance Mini-Panels */}
            <div className="flex flex-col gap-6">
              <div className="bg-white rounded-3xl p-6 shadow-sm border" style={{ borderColor: COLORS.border }}>
                <h2 className="text-lg font-medium text-[#1A1A1A] mb-4">Logistics Tracker</h2>
                <div className="flex flex-col gap-3">
                  {[
                    { vessel: 'MSC Rachele', eta: 'Oct 12', route: 'Abidjan → Rotterdam', status: 'Customs Cleared' },
                    { vessel: 'CMA CGM Jade', eta: 'Oct 15', route: 'Tema → Antwerp', status: 'In Transit' }
                  ].map((log, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-[#FAFAF8] border border-[#E8E2DC]">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#E0E7FF] flex items-center justify-center text-[#2563EB]">
                          <Ship size={14} />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-[#1A1A1A]">{log.vessel}</div>
                          <div className="text-xs text-[#888880]">{log.route} · ETA {log.eta}</div>
                        </div>
                      </div>
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-[#059669]">{log.status}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-3xl p-6 shadow-sm border" style={{ borderColor: COLORS.border }}>
                <h2 className="text-lg font-medium text-[#1A1A1A] mb-4">Compliance Inbox</h2>
                <div className="flex flex-col gap-3">
                  {[
                    { doc: 'Phytosanitary Cert', ref: 'CN-554', type: 'pending' },
                    { doc: 'BoL Upload', ref: 'TC-2026-0339', type: 'action_required' }
                  ].map((doc, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-[#E8E2DC]">
                      <div className="flex items-center gap-3">
                        <FileCheck size={16} className={doc.type === 'action_required' ? 'text-[#C73B22]' : 'text-[#D4AF37]'} />
                        <div>
                          <div className="text-sm font-medium text-[#1A1A1A]">{doc.doc}</div>
                          <div className="text-xs text-[#888880]">{doc.ref}</div>
                        </div>
                      </div>
                      <button className="text-xs font-medium text-[#2563EB]">Upload</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
          </div>
        </div>

        {/* Sidebar */}
        <div className="col-span-3 flex flex-col gap-6">
          {/* Market Ticker */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border flex flex-col gap-4" style={{ borderColor: COLORS.border }}>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-[#888880] uppercase tracking-wider">Live Markets</h3>
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#059669] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#059669]"></span>
                </span>
                <span className="text-[10px] font-bold text-[#059669]">LIVE</span>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {[
                { name: 'Cocoa', price: '$3,420/MT', dir: 'up', pct: '1.2%' },
                { name: 'Cotton', price: '$0.74/lb', dir: 'down', pct: '0.3%' },
                { name: 'Coffee', price: '$1.89/lb', dir: 'up', pct: '0.5%' },
                { name: 'Gold', price: '$2,341/oz', dir: 'up', pct: '0.4%' },
              ].map(tick => (
                <div key={tick.name} className="flex justify-between items-center tabular-nums">
                  <span className="text-sm text-[#888880]">{tick.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[#1A1A1A]">{tick.price}</span>
                    <span className={`text-xs flex items-center ${tick.dir === 'up' ? 'text-[#059669]' : 'text-[#C73B22]'}`}>
                      {tick.dir === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                      {tick.pct}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border" style={{ borderColor: COLORS.border }}>
            <h3 className="text-xs font-semibold text-[#888880] uppercase tracking-wider mb-4">Quick Actions</h3>
            <div className="flex flex-col gap-2">
              {[
                { icon: <Box size={16} />, label: 'Create Consignment' },
                { icon: <Tag size={16} />, label: 'List on Marketplace' },
                { icon: <FileText size={16} />, label: 'Submit RFQ Response' },
                { icon: <ShieldCheck size={16} />, label: 'View Escrow' },
                { icon: <FileCheck size={16} />, label: 'Upload Shipment Doc' }
              ].map((action, i) => (
                <button key={i} className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-[#FAFAF8] text-[#1A1A1A] transition-colors text-left border border-transparent hover:border-[#E8E2DC]">
                  <div className="text-[#888880]">{action.icon}</div>
                  <span className="text-sm font-medium">{action.label}</span>
                </button>
              ))}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
