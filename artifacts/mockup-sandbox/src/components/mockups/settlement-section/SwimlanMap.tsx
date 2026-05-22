import React from 'react';
import { 
  ArrowRight, 
  Users, 
  Building2, 
  Warehouse, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle2,
  Lock,
  ShieldCheck,
  CreditCard,
  Handshake,
  FileCheck
} from 'lucide-react';

export function SwimlanMap() {
  const actors = [
    { id: 'buyer', name: 'Buyer', color: '#1B4FDB', icon: Users },
    { id: 'escrow', name: 'Escrow System', color: '#C73B22', icon: ShieldCheck },
    { id: 'warehouse', name: 'Warehouse', color: '#2D6A4F', icon: Warehouse },
    { id: 'seller', name: 'Seller', color: '#7B3F00', icon: Building2 },
  ];

  const phases = ['Pre-Trade', 'Payment', 'Lock', 'Release', 'Payout'];

  const conditions = [
    { 
      id: 1, 
      name: "Unverified inventory position", 
      consequence: "Transaction suspended — no sale initiated",
      phase: 0, // Pre-Trade -> Payment
      impact: "Buyer blocked from starting transaction"
    },
    { 
      id: 2, 
      name: "Unconfirmed or insufficient buyer funds", 
      consequence: "Inventory lock withheld — no reservation",
      phase: 1, // Payment -> Lock
      impact: "Escrow system denies inventory lock"
    },
    { 
      id: 3, 
      name: "Escrow conditions not satisfied", 
      consequence: "Warehouse release blocked — no dispatch",
      phase: 2, // Lock -> Release
      impact: "Warehouse release authorisation withheld"
    },
    { 
      id: 4, 
      name: "Delivery milestone unverified", 
      consequence: "Final payout deferred — funds held in escrow",
      phase: 3, // Release -> Payout
      impact: "Seller payout delayed in escrow"
    },
    { 
      id: 5, 
      name: "Incomplete or unsigned trade documentation", 
      consequence: "Audit trail void — settlement rejected",
      phase: 4, // Final check
      impact: "Entire settlement rejected"
    },
  ];

  // Map of actions [actor_id][phase_index]
  const actions: Record<string, (string | React.ReactNode | null)[]> = {
    buyer: [
      "Submit Purchase Order & KYC",
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1 text-[10px] font-bold text-[#1B4FDB]"><CreditCard className="w-3 h-3"/> PAYMENT</div>
        <span>Initiate Fund Transfer</span>
      </div>,
      "Receive Lock Confirmation",
      "Verify Shipping Docs",
      "Final Acceptance"
    ],
    escrow: [
      "Verify Inventory Availability",
      "Validate Buyer Funds",
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1 text-[10px] font-bold text-[#C73B22]"><Lock className="w-3 h-3"/> CUSTODY</div>
        <span>Enforce Bilateral Lock</span>
      </div>,
      "Validate Release Conditions",
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1 text-[10px] font-bold text-[#C73B22]"><Handshake className="w-3 h-3"/> PAYOUT</div>
        <span>Execute Seller Payout</span>
      </div>
    ],
    warehouse: [
      "Confirm Physical Stock",
      null,
      "Segment & Secure Batch",
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1 text-[10px] font-bold text-[#2D6A4F]"><Warehouse className="w-3 h-3"/> RELEASE</div>
        <span>Authorise Goods Release</span>
      </div>,
      "Update Inventory Ledger"
    ],
    seller: [
      "Upload Batch Certificate",
      "Review Escrow Deposit",
      "Sign Allocation Agreement",
      "Approve Release",
      "Receive Verified Funds"
    ]
  };

  return (
    <div className="min-h-screen w-full bg-[#FAFAFA] text-[#1A1A1A] p-4 md:p-8 font-sans">
      <style>
        {`
          @keyframes slideIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-slide-in {
            animation: slideIn 0.5s ease-out forwards;
          }
        `}
      </style>

      {/* Header */}
      <div className="max-w-[1400px] mx-auto mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#1A1A1A]">Multi-Party Settlement Choreography</h1>
          <div className="flex items-center gap-3 mt-2 text-sm font-semibold uppercase tracking-wider text-[#666660]">
            <span className="flex items-center gap-1.5"><Users className="w-4 h-4" /> 4 Parties</span>
            <span className="text-gray-300">•</span>
            <span>9 Handoffs</span>
            <span className="text-gray-300">•</span>
            <span className="text-[#C73B22]">Zero Counterparty Risk</span>
          </div>
        </div>
        <div className="flex items-center gap-4 bg-white border border-gray-200 px-4 py-2 rounded-lg shadow-sm">
          <div className="flex -space-x-2">
            {actors.map(actor => (
              <div key={actor.id} className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-white" style={{ backgroundColor: actor.color }}>
                <actor.icon className="w-4 h-4" />
              </div>
            ))}
          </div>
          <span className="text-xs font-bold text-gray-500 uppercase tracking-tighter">Verified Protocol participants</span>
        </div>
      </div>

      {/* Main Swimlane Map */}
      <div className="max-w-[1400px] mx-auto bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[1000px] relative">
            
            {/* Phase Headers */}
            <div className="grid grid-cols-[200px_repeat(5,1fr)] bg-gray-50 border-b border-gray-200">
              <div className="p-4 border-r border-gray-200 font-bold text-xs uppercase tracking-widest text-gray-400 self-center">
                Stakeholders
              </div>
              {phases.map((phase, idx) => (
                <div key={phase} className="p-4 text-center border-r border-gray-200 last:border-r-0">
                  <div className="text-xs font-black uppercase tracking-[0.2em] text-[#1A1A1A] mb-1">{phase}</div>
                  <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-[#C73B22]" style={{ width: `${(idx + 1) * 20}%` }}></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Actor Lanes */}
            {actors.map((actor) => (
              <div key={actor.id} className="grid grid-cols-[200px_repeat(5,1fr)] border-b border-gray-100 last:border-b-0 group">
                {/* Actor Header */}
                <div className="p-6 border-r border-gray-200 flex items-center gap-3 relative overflow-hidden bg-gray-50/30 group-hover:bg-gray-50 transition-colors">
                  <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: actor.color }}></div>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-sm shrink-0" style={{ backgroundColor: actor.color }}>
                    <actor.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[#1A1A1A] leading-tight">{actor.name}</div>
                    <div className="text-[10px] text-gray-400 uppercase font-mono mt-1">Authorized</div>
                  </div>
                </div>

                {/* Cells */}
                {phases.map((_, pIdx) => (
                  <div key={pIdx} className="p-4 border-r border-gray-100 last:border-r-0 relative flex items-center justify-center min-h-[120px]">
                    {actions[actor.id][pIdx] ? (
                      <div className="w-full h-full p-3 rounded-lg border border-gray-100 bg-white shadow-sm hover:shadow-md hover:border-gray-200 transition-all animate-slide-in flex flex-col justify-center">
                        <p className="text-xs font-medium leading-relaxed text-gray-700">
                          {actions[actor.id][pIdx]}
                        </p>
                      </div>
                    ) : (
                      <div className="w-8 h-[1px] bg-gray-100"></div>
                    )}

                    {/* Handoff Arrows (Simplified Visuals) */}
                    {pIdx < phases.length - 1 && actions[actor.id][pIdx] && (
                      <div className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 hidden lg:block">
                         <ArrowRight className="w-5 h-5 text-gray-300" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}

            {/* Condition Gates at Transitions */}
            <div className="absolute top-[68px] bottom-0 left-[200px] right-0 pointer-events-none grid grid-cols-5">
              {[0, 1, 2, 3, 4].map(idx => (
                <div key={idx} className="relative h-full">
                  {idx < 4 && (
                    <div className="absolute right-0 top-0 bottom-0 w-px bg-gray-200 flex flex-col items-center justify-center gap-12 z-20">
                      <div className="group pointer-events-auto cursor-help bg-white border border-[#C73B22] rounded-full p-1.5 shadow-lg transform -translate-x-1/2 hover:scale-110 transition-transform">
                        <AlertTriangle className="w-3.5 h-3.5 text-[#C73B22]" />
                        <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-48 bg-[#1A1A1A] text-white p-3 rounded-lg text-[11px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 shadow-2xl">
                          <div className="font-bold text-[#C73B22] mb-1">CONDITION GATE #{idx + 1}</div>
                          <div className="font-medium text-gray-200 mb-1">{conditions[idx].name}</div>
                          <div className="text-gray-400 leading-normal">{conditions[idx].consequence}</div>
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-[#1A1A1A]"></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Failure Impact */}
      <div className="max-w-[1400px] mx-auto mt-8">
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-[#C73B22]" />
          Systemic Integrity: Failure Impact Analysis
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {conditions.map((cond, idx) => (
            <div key={cond.id} className="bg-white border-l-4 border-l-[#C73B22]/30 p-4 rounded-r-lg border-y border-r border-gray-200 shadow-sm hover:border-l-[#C73B22] transition-colors">
              <div className="text-[10px] font-bold text-[#C73B22] uppercase mb-1">Protocol Gate {idx+1}</div>
              <div className="text-xs font-bold text-[#1A1A1A] mb-2 leading-tight h-8 line-clamp-2">{cond.name}</div>
              <div className="flex items-start gap-2 pt-2 border-t border-gray-50">
                <div className="mt-0.5"><div className="w-1.5 h-1.5 rounded-full bg-red-500"></div></div>
                <div className="text-[10px] text-gray-500 font-medium leading-relaxed">{cond.impact}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Meta */}
      <div className="max-w-[1400px] mx-auto mt-12 pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-[#1A1A1A] flex items-center justify-center rounded-sm">
             <div className="w-3 h-3 border-t-2 border-r-2 border-[#C73B22]"></div>
          </div>
          <span className="text-lg font-black tracking-tighter text-[#1A1A1A]">FINATRADES<span className="text-[#C73B22]">.</span></span>
        </div>
        <div className="flex items-center gap-6 text-[10px] font-bold text-[#666660] uppercase tracking-widest">
          <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-green-600" /> ISO 20022 COMPLIANT</span>
          <span className="flex items-center gap-1.5"><Lock className="w-3 h-3 text-[#C73B22]" /> AES-256 ENCRYPTED AUDIT</span>
          <span className="flex items-center gap-1.5"><DollarSign className="w-3 h-3 text-blue-600" /> MULTI-SIG CUSTODY</span>
        </div>
      </div>
    </div>
  );
}
