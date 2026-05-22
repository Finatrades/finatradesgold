import React, { useState } from 'react';
import { 
  Lock, 
  Unlock, 
  CreditCard, 
  Warehouse, 
  Handshake, 
  ChevronDown, 
  AlertOctagon, 
  Shield,
  ArrowRight,
  Activity,
  CheckCircle2
} from 'lucide-react';

export function GatePipeline() {
  const [activeGate, setActiveGate] = useState<number | null>(null);
  const [clearedGates, setClearedGates] = useState<number[]>([]);

  const conditions = [
    { 
      id: 1, 
      name: "Inventory Position", 
      fullName: "Unverified inventory position",
      consequence: "Transaction suspended — no sale initiated",
      icon: Shield
    },
    { 
      id: 2, 
      name: "Buyer Funds", 
      fullName: "Unconfirmed or insufficient buyer funds",
      consequence: "Inventory lock withheld — no reservation",
      icon: CreditCard
    },
    { 
      id: 3, 
      name: "Escrow Terms", 
      fullName: "Escrow conditions not satisfied",
      consequence: "Warehouse release blocked — no dispatch",
      icon: Lock
    },
    { 
      id: 4, 
      name: "Delivery Milestone", 
      fullName: "Delivery milestone unverified",
      consequence: "Final payout deferred — funds held in escrow",
      icon: Warehouse
    },
    { 
      id: 5, 
      name: "Trade Documentation", 
      fullName: "Incomplete or unsigned trade documentation",
      consequence: "Audit trail void — settlement rejected",
      icon: AlertOctagon
    },
  ];

  const protocolSteps = [
    { icon: CreditCard, title: "Buyer Fund Verification", subtitle: "Payment Confirmation" },
    { icon: Lock, title: "Escrow Custody", subtitle: "Bilateral Lock Enforcement" },
    { icon: Warehouse, title: "Warehouse Release", subtitle: "Conditional Authorisation" },
    { icon: Handshake, title: "Seller Disbursement", subtitle: "Immutable Audit Closure" },
  ];

  const toggleGate = (id: number) => {
    setActiveGate(activeGate === id ? null : id);
  };

  const progress = (clearedGates.length / conditions.length) * 100;

  return (
    <div className="min-h-screen w-full bg-[#F0EFE9] p-4 md:p-8 font-sans text-[#1A1A1A]">
      <style>
        {`
          @keyframes flow {
            0% { background-position: 0% 50%; }
            100% { background-position: 100% 50%; }
          }
          .animate-flow {
            background: linear-gradient(90deg, #C73B22, #666660, #C73B22);
            background-size: 200% 100%;
            animation: flow 3s linear infinite;
          }
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-1px); }
            75% { transform: translateX(1px); }
          }
          .animate-lock-shake {
            animation: shake 0.5s ease-in-out infinite;
          }
          .pipeline-shadow {
            box-shadow: inset 0 2px 10px rgba(0,0,0,0.5);
          }
          .gate-card-shadow {
            box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3);
          }
        `}
      </style>

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-300 pb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[#C73B22]">
              <Activity className="w-5 h-5 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-widest">System Status: Active</span>
            </div>
            <h1 className="text-4xl font-black uppercase tracking-tighter text-[#1A1A1A]">
              Settlement Gate <span className="text-[#C73B22]">Protocol</span>
            </h1>
          </div>
          <div className="text-right font-mono text-sm text-[#666660]">
            PROTOCOL_VERSION: 2.4.0-STABLE<br />
            HASH_KEY: 0x8F2...A921
          </div>
        </div>

        {/* Pipeline Section */}
        <div className="bg-[#1E1E2E] rounded-3xl p-8 md:p-12 border border-[#2D2D3F] relative overflow-hidden">
          {/* Subtle grid background for industrial feel */}
          <div className="absolute inset-0 opacity-5 pointer-events-none" 
               style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
          
          <div className="relative z-10 flex flex-col gap-12">
            {/* Gate Row */}
            <div className="flex flex-wrap lg:flex-nowrap items-center justify-between gap-4 relative">
              {conditions.map((gate, index) => (
                <React.Fragment key={gate.id}>
                  {/* Gate Card */}
                  <div 
                    onClick={() => toggleGate(gate.id)}
                    className={`
                      relative flex-1 min-w-[180px] p-5 rounded-xl border-2 transition-all duration-300 cursor-pointer group
                      ${activeGate === gate.id 
                        ? 'bg-[#C73B22] border-[#C73B22] scale-105 gate-card-shadow' 
                        : 'bg-[#1A1A1A] border-[#3F3F5F] hover:border-[#C73B22]/50'}
                    `}
                    data-testid={`gate-card-${gate.id}`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <span className={`text-[10px] font-bold font-mono ${activeGate === gate.id ? 'text-white/70' : 'text-[#666660]'}`}>
                        GATE_{gate.id.toString().padStart(2, '0')}
                      </span>
                      {clearedGates.includes(gate.id) ? (
                        <Unlock className="w-4 h-4 text-green-400" />
                      ) : (
                        <Lock className={`w-4 h-4 ${activeGate === gate.id ? 'text-white' : 'text-[#C73B22]'} ${!clearedGates.includes(gate.id) ? 'animate-lock-shake' : ''}`} />
                      )}
                    </div>
                    
                    <h3 className={`text-sm font-bold leading-tight mb-2 ${activeGate === gate.id ? 'text-white' : 'text-gray-300'}`}>
                      {gate.name}
                    </h3>

                    <div className={`
                      flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-bold uppercase w-fit
                      ${clearedGates.includes(gate.id) 
                        ? 'bg-green-500/20 text-green-400' 
                        : (activeGate === gate.id ? 'bg-white/20 text-white' : 'bg-[#C73B22]/20 text-[#C73B22]')}
                    `}>
                      {clearedGates.includes(gate.id) ? 'Cleared' : 'Required'}
                    </div>

                    {/* Industrial Bolt visual */}
                    <div className="absolute -top-1 -left-1 w-2 h-2 rounded-full bg-[#3F3F5F]"></div>
                    <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#3F3F5F]"></div>
                    <div className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-[#3F3F5F]"></div>
                    <div className="absolute -bottom-1 -right-1 w-2 h-2 rounded-full bg-[#3F3F5F]"></div>
                  </div>

                  {/* Connecting Pipe */}
                  {index < conditions.length - 1 && (
                    <div className="hidden lg:block flex-shrink-0 w-8 h-4 bg-[#2D2D3F] rounded-full pipeline-shadow relative">
                      {clearedGates.includes(gate.id) && (
                        <div className="absolute inset-0 rounded-full animate-flow opacity-60"></div>
                      )}
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Expansion Panel */}
            <div className={`
              overflow-hidden transition-all duration-500 ease-in-out
              ${activeGate ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'}
            `}>
              {activeGate && (
                <div className="bg-[#1A1A1A] border-t-4 border-[#C73B22] p-8 rounded-2xl flex flex-col md:flex-row items-center gap-8">
                  <div className="bg-[#C73B22]/10 p-4 rounded-full">
                    {React.createElement(conditions.find(g => g.id === activeGate)!.icon, {
                      className: "w-12 h-12 text-[#C73B22]"
                    })}
                  </div>
                  <div className="flex-1 space-y-2 text-center md:text-left">
                    <h2 className="text-xl font-bold text-white uppercase tracking-tight">
                      {conditions.find(g => g.id === activeGate)!.fullName}
                    </h2>
                    <p className="text-gray-400 max-w-2xl font-light">
                      This gate represents a critical security checkpoint. Failure to verify this condition will trigger: 
                      <span className="text-[#C73B22] font-bold ml-2">
                        {conditions.find(g => g.id === activeGate)!.consequence}
                      </span>
                    </p>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      const id = activeGate!;
                      setClearedGates(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
                    }}
                    className={`
                      px-6 py-3 rounded font-bold uppercase tracking-widest text-xs transition-all
                      ${clearedGates.includes(activeGate) 
                        ? 'bg-green-600 hover:bg-green-700 text-white' 
                        : 'bg-[#C73B22] hover:bg-[#A6311D] text-white shadow-[0_0_15px_rgba(199,59,34,0.3)]'}
                    `}
                    data-testid={`button-clear-gate-${activeGate}`}
                  >
                    {clearedGates.includes(activeGate) ? 'Revoke Clearance' : 'Simulate Clearance'}
                  </button>
                </div>
              )}
            </div>

            {/* Protocol Phases (Post-Gate) */}
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-[#2D2D3F]"></div>
                <span className="text-[10px] font-bold text-[#666660] uppercase tracking-[0.3em]">Sequential Settlement Phases</span>
                <div className="h-px flex-1 bg-[#2D2D3F]"></div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {protocolSteps.map((step, idx) => (
                  <div key={idx} className="flex items-center gap-4 group">
                    <div className="relative">
                      <div className="w-12 h-12 rounded bg-[#1A1A1A] border border-[#2D2D3F] flex items-center justify-center text-gray-500 group-hover:border-[#C73B22]/50 transition-colors">
                        <step.icon className="w-5 h-5" />
                      </div>
                      {idx < protocolSteps.length - 1 && (
                        <div className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 hidden lg:block">
                          <ArrowRight className="w-4 h-4 text-[#2D2D3F]" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-300 uppercase leading-none mb-1 group-hover:text-white">{step.title}</h4>
                      <p className="text-[10px] text-[#666660] font-medium leading-tight">{step.subtitle}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Progress Tracker */}
        <div className="bg-white border border-gray-300 rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-end mb-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-[#666660] uppercase tracking-wider">Clearance Status</span>
              <h3 className="text-2xl font-black text-[#1A1A1A]">
                {clearedGates.length} <span className="text-[#666660] font-light">of</span> {conditions.length} <span className="text-[#666660] font-light text-sm uppercase">gates cleared</span>
              </h3>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-[#F0EFE9] rounded-full border border-gray-200">
              <CheckCircle2 className={`w-4 h-4 ${clearedGates.length === 5 ? 'text-green-500' : 'text-gray-400'}`} />
              <span className="text-[10px] font-bold uppercase">{clearedGates.length === 5 ? 'Settlement Ready' : 'Protocol Incomplete'}</span>
            </div>
          </div>
          
          <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden border border-gray-200">
            <div 
              className="h-full bg-[#C73B22] transition-all duration-1000 ease-out relative"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-flow opacity-50"></div>
            </div>
          </div>
          
          <div className="mt-4 flex justify-between items-center text-[10px] font-bold text-[#666660] uppercase tracking-widest">
            <span>Entry Protocol Initiated</span>
            <span>Immutable Ledger Lock Verified</span>
          </div>
        </div>

        {/* Bottom Branding */}
        <div className="pt-12 flex flex-col items-center gap-6">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-[#1A1A1A] flex items-center justify-center rounded">
                <div className="w-5 h-5 border-t-2 border-r-2 border-[#C73B22]"></div>
             </div>
             <span className="text-2xl font-black tracking-tighter text-[#1A1A1A]">FINATRADES<span className="text-[#C73B22]">.</span></span>
          </div>
          <p className="text-[10px] font-bold text-[#666660] uppercase tracking-[0.4em]">Zero-Trust Security • Real-Time Settlement • Physical Integrity</p>
        </div>
      </div>
    </div>
  );
}
