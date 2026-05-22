import React, { useState } from 'react';
import { 
  CreditCard, 
  Lock, 
  Warehouse, 
  Handshake, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  Activity,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  FileCheck,
  History,
  Info
} from 'lucide-react';

export function DashboardControl() {
  const [openStep, setOpenStep] = useState<number | null>(0);

  const conditions = [
    { name: "Unverified inventory position", consequence: "Transaction suspended — no sale initiated" },
    { name: "Unconfirmed or insufficient buyer funds", consequence: "Inventory lock withheld — no reservation" },
    { name: "Escrow conditions not satisfied", consequence: "Warehouse release blocked — no dispatch" },
    { name: "Delivery milestone unverified", consequence: "Final payout deferred — funds held in escrow" },
    { name: "Incomplete or unsigned trade documentation", consequence: "Audit trail void — settlement rejected" },
  ];

  const protocolSteps = [
    {
      icon: CreditCard,
      title: "Buyer Fund Verification & Payment Confirmation",
      description: "Prior to any inventory reservation, buyer funds undergo institutional-grade verification and are confirmed as available, cleared, and allocated against the specific trade order."
    },
    {
      icon: Lock,
      title: "Escrow Custody & Bilateral Lock Enforcement",
      description: "Upon payment confirmation, the corresponding inventory is placed under escrow custody and locked against the purchase order. Neither party may unilaterally alter or release the position."
    },
    {
      icon: Warehouse,
      title: "Conditional Warehouse Release Authorisation",
      description: "Warehouse release instructions are issued exclusively upon verification of delivery milestones, logistics handover, quality inspection sign-off, and all contractually mandated trade documents."
    },
    {
      icon: Handshake,
      title: "Seller Disbursement & Immutable Audit Closure",
      description: "Once all settlement conditions are independently verified, escrowed funds are released to the seller's designated account with an immutable, timestamped audit trail."
    }
  ];

  const metrics = [
    { label: "Escrow Protected", icon: ShieldCheck, value: "100% of active trades" },
    { label: "Inventory Locked", icon: Lock, value: "94.2k Tons Allocated" },
    { label: "Warehouse Controlled", icon: Warehouse, value: "48 Global Hubs" },
    { label: "Audit Immutable", icon: History, value: "Real-time Verification" }
  ];

  return (
    <div className="min-h-screen w-full bg-[#F8F7F4] text-[#1A1A1A] font-sans selection:bg-[#C73B22]/10 selection:text-[#C73B22]">
      <style>
        {`
          @keyframes pulse-slow {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          .animate-pulse-slow {
            animation: pulse-slow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }
          .custom-scrollbar::-webkit-scrollbar {
            width: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #E5E7EB;
            border-radius: 10px;
          }
        `}
      </style>

      {/* Header */}
      <header className="border-b border-gray-200 bg-white px-8 py-6 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#C73B22]/10 text-[#C73B22] border border-[#C73B22]/20">
              Structured Trade Finance & Escrow Governance
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-[#1A1A1A]">
              End-to-End Settlement Integrity from Inventory Lock to Verified Seller Payout
            </h1>
          </div>
          <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 px-4 py-2 rounded-lg">
            <div className="relative">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="absolute inset-0 w-2 h-2 bg-green-500 rounded-full animate-ping opacity-75"></div>
            </div>
            <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Protocol Active</span>
            <div className="h-4 w-[1px] bg-gray-300 mx-1"></div>
            <Activity className="w-4 h-4 text-gray-400" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-10 space-y-8">
        {/* Intro Body */}
        <p className="text-lg text-[#666660] leading-relaxed max-w-4xl border-l-2 border-[#C73B22] pl-6 italic">
          "Finatrades enforces a sequenced, condition-based settlement protocol that binds buyer payment confirmation, escrow custody, warehouse release authorisation, logistics verification, and final seller disbursement into a single governed transaction flow — with immutable audit visibility at every stage."
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Side: Settlement Conditions Monitor */}
          <div className="lg:col-span-7 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-[#C73B22]" />
                <h2 className="font-bold text-sm uppercase tracking-widest text-gray-900">Settlement Conditions Monitor</h2>
              </div>
              <div className="text-[10px] text-gray-400 font-mono">ID: SETL-PR-00923</div>
            </div>
            
            <div className="flex-1 overflow-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/30 border-b border-gray-100">
                    <th className="px-6 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Operational Condition</th>
                    <th className="px-6 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Protocol Status</th>
                    <th className="px-6 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-right">System Consequence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {conditions.map((item, idx) => (
                    <tr key={idx} className="group hover:bg-gray-50/80 transition-colors duration-150">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-gray-300 group-hover:bg-[#C73B22] transition-colors"></div>
                          <span className="text-sm font-medium text-gray-700">{item.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/50 uppercase">
                          REQUIRED
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="inline-flex items-center px-2 py-1 rounded text-[11px] font-medium bg-red-50 text-[#C73B22] border border-red-100 opacity-90 group-hover:opacity-100 transition-opacity">
                          {item.consequence}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center gap-2 text-xs text-[#666660]">
              <Info className="w-3.5 h-3.5" />
              <span>Failure to meet any condition triggers immediate protocol suspension and manual compliance review.</span>
            </div>
          </div>

          {/* Right Side: Protocol Progress */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="bg-[#1A1A1A] rounded-xl p-6 text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#C73B22]/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
              
              <div className="relative z-10 flex items-center justify-between mb-8">
                <h2 className="font-bold text-sm uppercase tracking-widest text-gray-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#C73B22]" />
                  Protocol Progress
                </h2>
                <div className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[10px] font-mono">
                  LIVE STREAM
                </div>
              </div>

              <div className="relative space-y-8 pl-4">
                {/* Connecting Line */}
                <div className="absolute left-10 top-2 bottom-2 w-0.5 bg-gradient-to-b from-[#C73B22] via-[#C73B22]/40 to-white/5"></div>

                {protocolSteps.map((step, idx) => (
                  <div key={idx} className="relative z-10">
                    <div 
                      className={`flex items-start gap-6 cursor-pointer group transition-all duration-300 ${openStep === idx ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}
                      onClick={() => setOpenStep(openStep === idx ? null : idx)}
                    >
                      <div className={`relative flex-shrink-0 w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${openStep === idx ? 'bg-[#C73B22] border-[#C73B22] shadow-[0_0_15px_rgba(199,59,34,0.4)]' : 'bg-[#1A1A1A] border-white/20 group-hover:border-white/40'}`}>
                        <step.icon className={`w-5 h-5 ${openStep === idx ? 'text-white' : 'text-gray-400'}`} />
                        <div className="absolute -right-1 -top-1 w-5 h-5 rounded-full bg-[#1A1A1A] border border-white/10 flex items-center justify-center text-[10px] font-bold">
                          {idx + 1}
                        </div>
                      </div>

                      <div className="flex-1 pt-1">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className={`text-sm font-bold leading-tight transition-colors duration-300 ${openStep === idx ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>
                            {step.title}
                          </h3>
                          {openStep === idx ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                        </div>
                        
                        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openStep === idx ? 'max-h-32 mt-3 opacity-100' : 'max-h-0 opacity-0'}`}>
                          <p className="text-xs text-gray-400 leading-relaxed font-light">
                            {step.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Quick Audit Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-gray-50 rounded-lg">
                  <FileCheck className="w-6 h-6 text-[#C73B22]" />
                </div>
                <div>
                  <div className="text-xs text-[#666660] font-medium uppercase tracking-wider">Audit Integrity</div>
                  <div className="text-sm font-bold text-[#1A1A1A]">Ledger-Verified Hash</div>
                </div>
              </div>
              <div className="font-mono text-[11px] text-gray-400">
                0x7A...4F2E
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Strip: Metric Badges */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((metric, idx) => (
            <div key={idx} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-[#C73B22]/30 transition-all group">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-gray-50 group-hover:bg-[#C73B22]/5 transition-colors">
                  <metric.icon className="w-6 h-6 text-[#666660] group-hover:text-[#C73B22] transition-colors" />
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-bold text-[#666660] uppercase tracking-widest">{metric.label}</p>
                  <p className="text-lg font-bold text-[#1A1A1A] tabular-nums">{metric.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer Branding */}
      <footer className="max-w-7xl mx-auto px-8 py-12 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#1A1A1A] flex items-center justify-center rounded-sm">
            <div className="w-4 h-4 border-t-2 border-r-2 border-[#C73B22]"></div>
          </div>
          <span className="text-xl font-black tracking-tighter text-[#1A1A1A]">FINATRADES<span className="text-[#C73B22]">.</span></span>
        </div>
        <div className="flex items-center gap-8 text-[11px] font-bold text-[#666660] uppercase tracking-[0.2em]">
          <span>Institutional Grade</span>
          <span>•</span>
          <span>Bilateral Security</span>
          <span>•</span>
          <span>Zero-Trust Protocol</span>
        </div>
      </footer>
    </div>
  );
}
