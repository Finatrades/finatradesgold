import React from 'react';
import { 
  ShieldCheck, Upload, AlertCircle, ArrowUpRight, ArrowDownRight, 
  CheckCircle2, Clock, DollarSign, FileText, Package, 
  Plus, Ship, Wallet, Check, ChevronRight, Activity, Bell, MessageSquare,
  Search, MoreHorizontal, ArrowRight, Anchor, Globe
} from 'lucide-react';

const COLORS = {
  primary: '#C73B22',
  bg: '#FAFAF8',
  dark: '#1A1A1A',
  muted: '#888880',
  border: '#E8E2DC',
  success: '#059669',
  gold: '#D4AF37',
  info: '#2563EB'
};

export default function OperationsCockpit() {
  return (
    <div style={{ backgroundColor: COLORS.bg, color: COLORS.dark, fontFamily: 'Inter, sans-serif' }} className="min-h-screen w-full flex flex-col items-center overflow-auto pb-20">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      
      <div className="w-[1280px] max-w-full mx-auto flex flex-col h-full bg-white shadow-xl border-x" style={{ borderColor: COLORS.border }}>
        
        {/* Ticker */}
        <div className="flex items-center text-[11px] font-medium py-1.5 px-6 border-b uppercase tracking-wider" style={{ borderColor: COLORS.border, backgroundColor: COLORS.dark, color: COLORS.bg }}>
          <div className="flex items-center gap-2 mr-6 text-red-400">
            <Activity size={12} className="animate-pulse" />
            <span className="font-bold">LIVE MARKETS</span>
          </div>
          <div className="flex items-center gap-8 overflow-hidden whitespace-nowrap opacity-90">
            <span className="flex items-center gap-1.5">Cocoa <span className="text-white tabular-nums">$3,420/MT</span> <span className="text-emerald-400">▲ 1.2%</span></span>
            <span className="flex items-center gap-1.5">Cotton <span className="text-white tabular-nums">$0.74/lb</span> <span className="text-red-400">▼ 0.3%</span></span>
            <span className="flex items-center gap-1.5">Coffee <span className="text-white tabular-nums">$1.89/lb</span> <span className="text-emerald-400">▲ 0.5%</span></span>
            <span className="flex items-center gap-1.5">Gold <span className="text-[#D4AF37] tabular-nums">$2,341/oz</span> <span className="text-emerald-400">▲ 0.4%</span></span>
            <span className="flex items-center gap-1.5">Lithium <span className="text-white tabular-nums">$13,500/MT</span> <span className="text-slate-400">▬ 0.0%</span></span>
          </div>
        </div>

        {/* Header & Slim KPIs */}
        <div className="px-8 py-6 border-b" style={{ borderColor: COLORS.border, backgroundColor: COLORS.bg }}>
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold tracking-tight">Welcome back, Charan</h1>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#Ecfdf5', color: COLORS.success, border: `1px solid #A7f3d0` }}>
                  <ShieldCheck size={12} />
                  Corporate KYC Approved
                </div>
              </div>
              <p className="text-sm" style={{ color: COLORS.muted }}>
                Exporter · Raminvest Holding DIFC · FT-ID <span className="font-medium font-mono text-xs" style={{ color: COLORS.dark }}>FT-EXP-04821</span>
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <button className="p-2 rounded-md border bg-white hover:bg-gray-50 transition-colors" style={{ borderColor: COLORS.border }}>
                <Search size={18} style={{ color: COLORS.dark }} />
              </button>
              <button className="p-2 rounded-md border bg-white hover:bg-gray-50 transition-colors relative" style={{ borderColor: COLORS.border }}>
                <Bell size={18} style={{ color: COLORS.dark }} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.primary }}></span>
              </button>
              <button className="flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm text-white transition-colors" style={{ backgroundColor: COLORS.primary }}>
                <Plus size={16} />
                Create Consignment
              </button>
            </div>
          </div>

          {/* Slim KPIs */}
          <div className="flex gap-4">
            <div className="flex-1 flex items-center justify-between px-4 py-3 rounded-lg border bg-white" style={{ borderColor: COLORS.border }}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md" style={{ backgroundColor: '#FEF2F2', color: COLORS.primary }}>
                  <Package size={16} />
                </div>
                <span className="text-sm font-medium" style={{ color: COLORS.muted }}>Active Consignments</span>
              </div>
              <span className="text-lg font-bold tabular-nums">8</span>
            </div>
            <div className="flex-1 flex items-center justify-between px-4 py-3 rounded-lg border bg-white" style={{ borderColor: COLORS.border }}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md" style={{ backgroundColor: '#FEF9C3', color: '#B45309' }}>
                  <CheckCircle2 size={16} />
                </div>
                <span className="text-sm font-medium" style={{ color: COLORS.muted }}>Verified Inventory</span>
              </div>
              <span className="text-lg font-bold tabular-nums">1,240 <span className="text-xs font-normal">MT</span></span>
            </div>
            <div className="flex-1 flex items-center justify-between px-4 py-3 rounded-lg border bg-white" style={{ borderColor: COLORS.border }}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md" style={{ backgroundColor: '#EFF6FF', color: COLORS.info }}>
                  <MessageSquare size={16} />
                </div>
                <span className="text-sm font-medium" style={{ color: COLORS.muted }}>Open RFQs</span>
              </div>
              <span className="text-lg font-bold tabular-nums">12</span>
            </div>
            <div className="flex-[1.5] flex items-center justify-between px-4 py-3 rounded-lg border bg-white relative overflow-hidden" style={{ borderColor: COLORS.border }}>
              <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: COLORS.success }}></div>
              <div className="flex items-center gap-3 pl-2">
                <div className="p-2 rounded-md" style={{ backgroundColor: '#ECFDF5', color: COLORS.success }}>
                  <ShieldCheck size={16} />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium leading-none mb-1" style={{ color: COLORS.muted }}>Active Trade Cases</span>
                  <span className="text-xs font-medium" style={{ color: COLORS.success }}>$4.2M locked in escrow</span>
                </div>
              </div>
              <span className="text-lg font-bold tabular-nums">5</span>
            </div>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Main Column */}
          <div className="flex-1 flex flex-col border-r" style={{ borderColor: COLORS.border }}>
            
            {/* ACTION CENTER */}
            <div className="p-8 pb-6 border-b" style={{ borderColor: COLORS.border }}>
              <h2 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: COLORS.dark }}>Action Center</h2>
              
              <div className="flex flex-col gap-3">
                {/* Action Item 1 */}
                <div className="flex items-center justify-between p-4 rounded-lg border shadow-sm group hover:border-red-300 transition-colors bg-white relative overflow-hidden" style={{ borderColor: COLORS.border }}>
                  <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: COLORS.primary }}></div>
                  <div className="flex items-start gap-4 pl-2">
                    <div className="mt-0.5 p-1.5 rounded-full" style={{ backgroundColor: '#FEF2F2', color: COLORS.primary }}>
                      <AlertCircle size={16} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold mb-1" style={{ color: COLORS.dark }}>Phytosanitary Certificate Required</h3>
                      <p className="text-xs mb-2" style={{ color: COLORS.muted }}>Consignment <span className="font-mono text-[10px] text-gray-700">CN-554</span> is pending export clearance. Upload required document.</p>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: '#FEF2F2', color: COLORS.primary }}>High Priority</span>
                    </div>
                  </div>
                  <button className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors border" style={{ borderColor: COLORS.border, color: COLORS.dark }}>
                    <Upload size={14} />
                    Upload Doc
                  </button>
                </div>

                {/* Action Item 2 */}
                <div className="flex items-center justify-between p-4 rounded-lg border shadow-sm bg-white hover:border-gray-300 transition-colors" style={{ borderColor: COLORS.border }}>
                  <div className="flex items-start gap-4">
                    <div className="mt-0.5 p-1.5 rounded-full" style={{ backgroundColor: '#EFF6FF', color: COLORS.info }}>
                      <Clock size={16} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold mb-1" style={{ color: COLORS.dark }}>RFQ Response Overdue</h3>
                      <p className="text-xs mb-2" style={{ color: COLORS.muted }}>Importer <span className="font-mono text-[10px] text-gray-700">FT-IMP-09127</span> is waiting for your quote on 240 MT Cocoa Beans.</p>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: '#F3F4F6', color: COLORS.muted }}>Due 2h ago</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors border" style={{ borderColor: COLORS.border, color: COLORS.dark }}>
                      Counter
                    </button>
                    <button className="px-3 py-1.5 rounded-md text-xs font-medium text-white transition-colors" style={{ backgroundColor: COLORS.info }}>
                      Accept & Quote
                    </button>
                  </div>
                </div>

                {/* Action Item 3 */}
                <div className="flex items-center justify-between p-4 rounded-lg border shadow-sm bg-white hover:border-gray-300 transition-colors" style={{ borderColor: COLORS.border }}>
                  <div className="flex items-start gap-4">
                    <div className="mt-0.5 p-1.5 rounded-full" style={{ backgroundColor: '#ECFDF5', color: COLORS.success }}>
                      <FileText size={16} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold mb-1" style={{ color: COLORS.dark }}>Bill of Lading Request</h3>
                      <p className="text-xs mb-1" style={{ color: COLORS.muted }}>Trade Case <span className="font-mono text-[10px] text-gray-700">TC-2026-0339</span> requires BoL to trigger escrow release.</p>
                    </div>
                  </div>
                  <button className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors border" style={{ borderColor: COLORS.border, color: COLORS.dark }}>
                    <Upload size={14} />
                    Upload BoL
                  </button>
                </div>
              </div>
            </div>

            {/* KANBAN PIPELINE */}
            <div className="flex-1 p-8 pb-12" style={{ backgroundColor: '#F8F9FA' }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: COLORS.dark }}>Current Trades Pipeline</h2>
                <button className="text-xs font-medium flex items-center gap-1" style={{ color: COLORS.info }}>
                  View All Cases <ArrowRight size={14} />
                </button>
              </div>

              <div className="flex gap-4 h-full overflow-x-auto pb-4 hide-scrollbar">
                
                {/* Column: Consignments */}
                <div className="w-72 shrink-0 flex flex-col">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <span className="text-xs font-semibold" style={{ color: COLORS.muted }}>1. CONSIGNMENT</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-200" style={{ color: COLORS.dark }}>2</span>
                  </div>
                  <div className="flex flex-col gap-3">
                    <div className="bg-white p-3.5 rounded-lg border shadow-sm cursor-grab" style={{ borderColor: COLORS.border }}>
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-mono text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100" style={{ color: COLORS.dark }}>CN-881</span>
                        <MoreHorizontal size={14} className="text-gray-400" />
                      </div>
                      <h4 className="text-sm font-semibold mb-1" style={{ color: COLORS.dark }}>Raw Cotton</h4>
                      <p className="text-xs font-medium mb-3 tabular-nums" style={{ color: COLORS.muted }}>1,200 MT</p>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t" style={{ borderColor: COLORS.border }}>
                        <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Pending Quality</span>
                        <div className="w-5 h-5 rounded-full bg-gray-100 border border-white -ml-2 z-10"></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Column: In Transit */}
                <div className="w-72 shrink-0 flex flex-col">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <span className="text-xs font-semibold" style={{ color: COLORS.muted }}>2. IN TRANSIT</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-200" style={{ color: COLORS.dark }}>2</span>
                  </div>
                  <div className="flex flex-col gap-3">
                    <div className="bg-white p-3.5 rounded-lg border shadow-sm cursor-grab" style={{ borderColor: COLORS.border }}>
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-mono text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100" style={{ color: COLORS.dark }}>CN-742</span>
                        <Ship size={14} className="text-blue-500" />
                      </div>
                      <h4 className="text-sm font-semibold mb-1" style={{ color: COLORS.dark }}>Robusta Coffee</h4>
                      <p className="text-xs font-medium mb-3 tabular-nums" style={{ color: COLORS.muted }}>450 MT</p>
                      <div className="w-full bg-gray-100 rounded-full h-1.5 mb-3">
                        <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '60%' }}></div>
                      </div>
                      <div className="flex items-center justify-between mt-1 pt-2 border-t" style={{ borderColor: COLORS.border }}>
                        <span className="text-[10px] font-medium text-gray-500">Vessel: MSC Romy</span>
                        <span className="text-[10px] font-medium text-blue-600">ETA: 2 Days</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Column: On Marketplace */}
                <div className="w-72 shrink-0 flex flex-col">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <span className="text-xs font-semibold" style={{ color: COLORS.muted }}>3. MARKETPLACE</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-200" style={{ color: COLORS.dark }}>1</span>
                  </div>
                  <div className="flex flex-col gap-3">
                    <div className="bg-white p-3.5 rounded-lg border shadow-sm cursor-grab" style={{ borderColor: COLORS.border }}>
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-mono text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100" style={{ color: COLORS.dark }}>MK-901</span>
                        <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">Listed</span>
                      </div>
                      <h4 className="text-sm font-semibold mb-1" style={{ color: COLORS.dark }}>Lithium Spodumene</h4>
                      <div className="flex gap-3 mb-3">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-gray-500">Qty</span>
                          <span className="text-xs font-medium tabular-nums" style={{ color: COLORS.dark }}>100 MT</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-gray-500">Ask Price</span>
                          <span className="text-xs font-medium tabular-nums" style={{ color: COLORS.dark }}>$1,350k</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t" style={{ borderColor: COLORS.border }}>
                        <span className="text-[10px] font-medium text-gray-500">3 Open RFQs</span>
                        <button className="text-[10px] font-medium text-blue-600 hover:underline">Review</button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Column: In Escrow */}
                <div className="w-72 shrink-0 flex flex-col">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <span className="text-xs font-semibold" style={{ color: COLORS.primary }}>4. TRADE FINANCE / ESCROW</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: COLORS.primary }}>3</span>
                  </div>
                  <div className="flex flex-col gap-3">
                    {/* Active Trade Case */}
                    <div className="bg-white p-3.5 rounded-lg border-2 shadow-sm cursor-grab relative" style={{ borderColor: COLORS.primary }}>
                      <div className="absolute -top-2.5 -right-2.5 bg-red-100 border border-red-200 text-red-600 rounded-full p-1 shadow-sm">
                        <AlertCircle size={12} strokeWidth={3} />
                      </div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#FEF2F2', color: COLORS.primary }}>TC-2026-0341</span>
                        <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 flex items-center gap-1"><Check size={10}/> LC Issued</span>
                      </div>
                      <h4 className="text-sm font-semibold mb-1" style={{ color: COLORS.dark }}>Cocoa Beans</h4>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-medium tabular-nums" style={{ color: COLORS.muted }}>240 MT</span>
                        <span className="text-xs font-bold tabular-nums" style={{ color: COLORS.dark }}>€1,180,000</span>
                      </div>
                      <div className="p-2 rounded bg-gray-50 border border-gray-100 mb-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] text-gray-500">Counterparty</span>
                          <span className="text-[10px] text-amber-500 flex items-center">★ 4.8</span>
                        </div>
                        <span className="font-mono text-xs font-medium text-gray-700">FT-IMP-09127</span>
                      </div>
                      <div className="flex items-center justify-between mt-1 pt-2 border-t" style={{ borderColor: COLORS.border }}>
                        <span className="text-[10px] font-medium text-gray-500">Next: Shipment Dispatch</span>
                        <button className="text-[10px] font-medium text-white px-2 py-1 rounded" style={{ backgroundColor: COLORS.primary }}>Update</button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Column: Settling */}
                <div className="w-72 shrink-0 flex flex-col">
                  <div className="flex items-center justify-between mb-3 px-1 opacity-60">
                    <span className="text-xs font-semibold" style={{ color: COLORS.muted }}>5. SETTLEMENT</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-200" style={{ color: COLORS.dark }}>0</span>
                  </div>
                  <div className="flex flex-col gap-3 opacity-60">
                    <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center h-32" style={{ borderColor: COLORS.border }}>
                      <CheckCircle2 size={20} className="text-gray-300 mb-2" />
                      <span className="text-xs text-gray-400 font-medium">No active settlements</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>

          {/* Right Sidebar */}
          <div className="w-80 shrink-0 bg-white flex flex-col overflow-y-auto hide-scrollbar">
            
            {/* Quick Actions */}
            <div className="p-6 border-b" style={{ borderColor: COLORS.border }}>
              <h2 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: COLORS.muted }}>Quick Actions</h2>
              <div className="flex flex-col gap-2">
                <button className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors text-left border border-transparent hover:border-gray-200" style={{ color: COLORS.dark }}>
                  <Package size={16} className="text-gray-400" />
                  Create Consignment
                </button>
                <button className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors text-left border border-transparent hover:border-gray-200" style={{ color: COLORS.dark }}>
                  <Globe size={16} className="text-gray-400" />
                  List on Marketplace
                </button>
                <button className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors text-left border border-transparent hover:border-gray-200" style={{ color: COLORS.dark }}>
                  <MessageSquare size={16} className="text-gray-400" />
                  Submit RFQ Response
                </button>
                <button className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors text-left border border-transparent hover:border-gray-200" style={{ color: COLORS.dark }}>
                  <ShieldCheck size={16} className="text-gray-400" />
                  View Escrow Cases
                </button>
                <button className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors text-left border border-transparent hover:border-gray-200" style={{ color: COLORS.dark }}>
                  <FileText size={16} className="text-gray-400" />
                  Upload Shipment Doc
                </button>
              </div>
            </div>

            {/* Wallet Snapshot */}
            <div className="p-6 border-b" style={{ borderColor: COLORS.border }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: COLORS.muted }}>Wallet Snapshot</h2>
                <Wallet size={14} style={{ color: COLORS.muted }} />
              </div>
              
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-5 text-white mb-4 shadow-md relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-10">
                  <Wallet size={80} />
                </div>
                <p className="text-xs text-gray-400 font-medium mb-1">Total Available Balance (USD Eq)</p>
                <h3 className="text-2xl font-bold tabular-nums mb-4">$842,000.00</h3>
                
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center text-sm border-t border-gray-700 pt-2">
                    <span className="text-gray-300">EUR</span>
                    <span className="font-medium tabular-nums">€310,000.00</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-300">GBP</span>
                    <span className="font-medium tabular-nums">£45,000.00</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border bg-gray-50 mb-4" style={{ borderColor: COLORS.border }}>
                <div className="flex items-center gap-2">
                  <ShieldCheck size={14} className="text-gray-500" />
                  <span className="text-xs font-medium text-gray-600">Locked in escrow</span>
                </div>
                <span className="text-xs font-bold text-gray-900 tabular-nums">$4.2M</span>
              </div>

              <button className="w-full py-2.5 rounded-md text-sm font-semibold border text-center transition-colors hover:bg-gray-50" style={{ borderColor: COLORS.border, color: COLORS.dark }}>
                Open Wallet
              </button>
            </div>

            {/* Logistics Mini-Panel */}
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: COLORS.muted }}>Active Logistics</h2>
                <Ship size={14} style={{ color: COLORS.muted }} />
              </div>

              <div className="flex flex-col gap-3">
                <div className="p-3 border rounded-lg hover:border-blue-200 transition-colors cursor-pointer" style={{ borderColor: COLORS.border }}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold" style={{ color: COLORS.dark }}>MSC Romy</span>
                    <span className="text-[10px] font-medium bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100">In Transit</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                    <div className="flex items-center gap-1"><Anchor size={10} /> Abidjan</div>
                    <ArrowRight size={10} className="text-gray-300" />
                    <div className="flex items-center gap-1"><Anchor size={10} /> Rotterdam</div>
                  </div>
                  <div className="text-[10px] font-medium text-gray-400 mt-2 pt-2 border-t" style={{ borderColor: COLORS.border }}>
                    ETA: 12 Oct 2026
                  </div>
                </div>

                <div className="p-3 border rounded-lg hover:border-blue-200 transition-colors cursor-pointer" style={{ borderColor: COLORS.border }}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold" style={{ color: COLORS.dark }}>CMA CGM Lisa</span>
                    <span className="text-[10px] font-medium bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded border border-amber-100">Customs Hold</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                    <div className="flex items-center gap-1"><Anchor size={10} /> Mombasa</div>
                    <ArrowRight size={10} className="text-gray-300" />
                    <div className="flex items-center gap-1"><Anchor size={10} /> Hamburg</div>
                  </div>
                  <div className="text-[10px] font-medium text-gray-400 mt-2 pt-2 border-t" style={{ borderColor: COLORS.border }}>
                    ETA: Pending Clearance
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
