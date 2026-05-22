import React from 'react';
import { 
  TrendingUp, 
  Shield, 
  Award, 
  BarChart3, 
  CheckCircle2, 
  Star,
  CreditCard,
  Lock,
  Warehouse,
  Handshake,
  ArrowRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

export function RiskScorecard() {
  const conditions = [
    { name: "Unverified inventory position", consequence: "Transaction suspended — no sale initiated" },
    { name: "Unconfirmed or insufficient buyer funds", consequence: "Inventory lock withheld — no reservation" },
    { name: "Escrow conditions not satisfied", consequence: "Warehouse release blocked — no dispatch" },
    { name: "Delivery milestone unverified", consequence: "Final payout deferred — funds held in escrow" },
    { name: "Incomplete or unsigned trade documentation", consequence: "Audit trail void — settlement rejected" },
  ];

  const protocolSteps = [
    { 
      id: "BFV",
      icon: CreditCard, 
      name: "Buyer Fund Verification", 
      score: 245, 
      max: 250, 
      metric: "Real-time Verification" 
    },
    { 
      id: "ECB",
      icon: Lock, 
      name: "Escrow Custody", 
      score: 242, 
      max: 250, 
      metric: "Bilateral Lock" 
    },
    { 
      id: "CWR",
      icon: Warehouse, 
      name: "Warehouse Release", 
      score: 228, 
      max: 250, 
      metric: "Milestone Verified" 
    },
    { 
      id: "SDA",
      icon: Handshake, 
      name: "Seller Disbursement", 
      score: 225, 
      max: 250, 
      metric: "Immutable Closure" 
    },
  ];

  return (
    <div className="min-h-screen w-full bg-white text-[#1A1A1A] font-sans">
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&display=swap');
          
          .font-serif {
            font-family: 'Playfair Display', serif;
          }

          @keyframes dash {
            to {
              stroke-dashoffset: 0;
            }
          }

          .animate-dash {
            stroke-dasharray: 440;
            stroke-dashoffset: 440;
            animation: dash 2s ease-out forwards;
          }
          
          .score-gradient {
            background: linear-gradient(180deg, #FFFFFF 0%, #F8F9FA 100%);
          }
        `}
      </style>

      {/* Header / Report Info */}
      <header className="max-w-7xl mx-auto px-8 py-10 flex justify-between items-start border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-[#0F1E3C] flex items-center justify-center rounded-sm">
              <div className="w-4 h-4 border-t-2 border-r-2 border-[#C73B22]"></div>
            </div>
            <span className="text-xl font-black tracking-tighter text-[#0F1E3C]">FINATRADES<span className="text-[#C73B22]">.</span></span>
          </div>
          <h1 className="text-sm font-bold uppercase tracking-[0.3em] text-[#666660]">Settlement Risk Assessment Report</h1>
          <p className="text-xs text-gray-400 mt-1">Ref: FT-SEC-2024-0092 | Issued: Oct 2024</p>
        </div>
        <div className="text-right">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 text-green-700 border border-green-100 text-[10px] font-bold uppercase tracking-wider">
            <ShieldCheck className="w-3 h-3" />
            Protocol Level: High Assurance
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-12">
        {/* Hero: Score Section */}
        <section className="flex flex-col items-center justify-center mb-20">
          <div className="relative flex flex-col items-center">
            {/* SVG Arc Meter */}
            <svg className="w-80 h-48" viewBox="0 0 200 120">
              <path
                d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none"
                stroke="#F1F5F9"
                strokeWidth="12"
                strokeLinecap="round"
              />
              <path
                d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none"
                stroke="#16A34A"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray="251.32"
                strokeDashoffset={251.32 * (1 - 940/1000)}
                className="animate-dash"
              />
              <text x="100" y="90" textAnchor="middle" className="font-serif text-5xl fill-[#0F1E3C]">940</text>
              <text x="100" y="110" textAnchor="middle" className="text-[10px] font-bold uppercase tracking-widest fill-gray-400">/ 1000 Score</text>
            </svg>
            
            <div className="absolute -bottom-4 bg-white px-8 py-2 border border-gray-100 shadow-xl rounded-xl flex flex-col items-center">
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-1">Integrity Rating</span>
              <span className="text-4xl font-serif text-[#16A34A]">AAA</span>
            </div>
          </div>
          
          <div className="mt-12 text-center max-w-2xl">
            <h2 className="text-2xl font-serif text-[#0F1E3C] mb-4">Finatrades Settlement Integrity Rating</h2>
            <p className="text-sm text-[#666660] leading-relaxed">
              Based on real-time execution of the 5-layer condition matrix and bilateral protocol enforcement. 
              This rating signifies a "Virtually Zero" risk of settlement failure or capital loss.
            </p>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left Column: Condition Compliance Matrix */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#0F1E3C] flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#C73B22]" />
                Condition Compliance Matrix
              </h3>
              <span className="text-[10px] text-gray-400 font-mono">Real-time Node Status</span>
            </div>

            <div className="border border-gray-100 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Settlement Condition</th>
                    {protocolSteps.map(step => (
                      <th key={step.id} className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">{step.id}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {conditions.map((condition, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4">
                        <div className="text-[11px] font-medium text-gray-700 leading-tight pr-4">{condition.name}</div>
                      </td>
                      {protocolSteps.map((_, sIdx) => (
                        <td key={sIdx} className="p-4 text-center">
                          <div className={`mx-auto w-2 h-2 rounded-full ${idx >= sIdx ? 'bg-green-500' : 'bg-gray-100'}`}></div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="bg-gray-50 p-3 border-t border-gray-100 flex gap-4 text-[9px] font-bold uppercase text-gray-400">
                <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> Verified</span>
                <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-gray-200"></div> Pending</span>
              </div>
            </div>

            <div className="p-4 bg-amber-50 rounded-lg border border-amber-100 flex gap-4">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
              <div>
                <h4 className="text-[11px] font-bold text-amber-900 uppercase tracking-wider mb-1">Violation Guardrail</h4>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Failure in any cell triggers immediate protocol suspension. System consequences are hard-coded into the execution logic.
                </p>
              </div>
            </div>
          </section>

          {/* Right Column: Protocol Pillar Scores */}
          <section className="space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#0F1E3C] flex items-center gap-2">
              <Award className="w-4 h-4 text-[#C73B22]" />
              Protocol Pillar Scores
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {protocolSteps.map((step, idx) => (
                <div key={idx} className="bg-white p-5 border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-shadow group">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-[#C73B22]/5 transition-colors">
                      <step.icon className="w-5 h-5 text-[#666660] group-hover:text-[#C73B22]" />
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-serif text-[#0F1E3C]">{step.score}<span className="text-[10px] text-gray-400 font-sans ml-0.5">/ {step.max}</span></div>
                    </div>
                  </div>
                  
                  <h4 className="text-[11px] font-bold text-[#1A1A1A] uppercase tracking-wider mb-3 leading-tight h-8 flex items-center">{step.name}</h4>
                  
                  <div className="w-full bg-gray-100 h-1 rounded-full mb-3 overflow-hidden">
                    <div 
                      className="bg-[#16A34A] h-full rounded-full transition-all duration-1000"
                      style={{ width: `${(step.score / step.max) * 100}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-tighter">
                    <span className="text-gray-400">Metric</span>
                    <span className="text-[#16A34A]">{step.metric}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-[#0F1E3C] p-6 rounded-xl text-white relative overflow-hidden">
              <div className="absolute right-0 top-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12"></div>
              <div className="flex items-center justify-between mb-4">
                <TrendingUp className="w-5 h-5 text-[#C73B22]" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Market Stability Index</span>
              </div>
              <p className="text-sm font-serif mb-2">Institutional Confidence Rating</p>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-serif">98.4%</span>
                <span className="text-[10px] text-green-400 font-bold mb-1 flex items-center gap-1">
                  <Star className="w-2.5 h-2.5 fill-current" /> +1.2% High-Net Flow
                </span>
              </div>
            </div>
          </section>
        </div>

        {/* Bottom: Comparison Bar */}
        <section className="mt-20 pt-12 border-t border-gray-100">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="shrink-0">
              <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-2">Benchmarking</h3>
              <div className="text-lg font-serif text-[#0F1E3C]">Finatrades AAA vs Industry Average</div>
            </div>
            
            <div className="flex-1 w-full max-w-2xl relative pt-6 pb-2">
              {/* Scale */}
              <div className="absolute top-0 left-0 right-0 flex justify-between text-[9px] font-bold text-gray-300 px-1">
                <span>D</span>
                <span>C</span>
                <span>B</span>
                <span>BB</span>
                <span>BBB</span>
                <span>A</span>
                <span>AA</span>
                <span>AAA</span>
              </div>
              
              <div className="w-full h-2 bg-gray-100 rounded-full relative">
                {/* Industry Average Pointer */}
                <div className="absolute left-[60%] top-1/2 -translate-y-1/2 h-6 w-[1px] bg-gray-300">
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-bold text-gray-400 uppercase">Industry Avg (BBB+)</div>
                </div>
                
                {/* Finatrades Progress */}
                <div className="absolute left-0 top-0 h-full w-[95%] bg-gradient-to-r from-gray-200 to-[#16A34A] rounded-full">
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-white border-2 border-[#16A34A] shadow-md flex items-center justify-center">
                    <div className="w-1 h-1 bg-[#16A34A] rounded-full"></div>
                  </div>
                  <div className="absolute -top-5 right-0 whitespace-nowrap text-[9px] font-black text-[#16A34A] uppercase tracking-tighter">Finatrades Protocol</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer / Disclaimer */}
      <footer className="max-w-7xl mx-auto px-8 py-12 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6 opacity-50">
        <div className="flex items-center gap-6 text-[10px] font-bold uppercase tracking-widest text-[#666660]">
          <span>Institutional Analysis</span>
          <span>© 2024 FINATRADES</span>
          <span>Security Protocol v4.0.1</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-gray-400 italic">
          Disclaimer: Ratings based on historical protocol compliance and verified on-chain execution data.
        </div>
      </footer>
    </div>
  );
}
