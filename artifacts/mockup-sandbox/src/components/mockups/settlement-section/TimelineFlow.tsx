import React from 'react';
import { CreditCard, Lock, Warehouse, Handshake, ShieldAlert, AlertCircle } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: CreditCard,
    title: 'Buyer Fund Verification & Payment Confirmation',
    description: 'Prior to any inventory reservation, buyer funds undergo institutional-grade verification and are confirmed as available, cleared, and allocated against the specific trade order.'
  },
  {
    number: '02',
    icon: Lock,
    title: 'Escrow Custody & Bilateral Lock Enforcement',
    description: 'Upon payment confirmation, the corresponding inventory is placed under escrow custody and locked against the purchase order. Neither party may unilaterally alter or release the position.'
  },
  {
    number: '03',
    icon: Warehouse,
    title: 'Conditional Warehouse Release Authorisation',
    description: 'Warehouse release instructions are issued exclusively upon verification of delivery milestones, logistics handover, quality inspection sign-off, and all contractually mandated trade documents.'
  },
  {
    number: '04',
    icon: Handshake,
    title: 'Seller Disbursement & Immutable Audit Closure',
    description: 'Once all settlement conditions are independently verified, escrowed funds are released to the seller\'s designated account with an immutable, timestamped audit trail.'
  }
];

const conditions = [
  { condition: "Unverified inventory position", consequence: "Transaction suspended — no sale initiated" },
  { condition: "Unconfirmed or insufficient buyer funds", consequence: "Inventory lock withheld — no reservation" },
  { condition: "Escrow conditions not satisfied", consequence: "Warehouse release blocked — no dispatch" },
  { condition: "Delivery milestone unverified", consequence: "Final payout deferred — funds held in escrow" },
  { condition: "Incomplete or unsigned trade documentation", consequence: "Audit trail void — settlement rejected" }
];

export function TimelineFlow() {
  return (
    <div className="min-h-screen w-full bg-[#0A0A0A] text-[#F8F7F4] font-sans selection:bg-[#C73B22]/30 overflow-x-hidden">
      <style>
        {`
          @keyframes glow {
            0%, 100% { opacity: 0.5; filter: blur(20px); }
            50% { opacity: 1; filter: blur(35px); }
          }
          .accent-glow {
            background: radial-gradient(circle, #C73B22 0%, transparent 70%);
            animation: glow 8s infinite ease-in-out;
          }
          .timeline-line {
            background: linear-gradient(to bottom, transparent, #C73B22, #C73B22, transparent);
            box-shadow: 0 0 15px #C73B22;
          }
        `}
      </style>

      {/* Header Section */}
      <header className="relative pt-24 pb-16 px-6 text-center z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 accent-glow -z-10 opacity-20" />
        <div className="inline-flex items-center px-4 py-1.5 rounded-full border border-[#C73B22]/30 bg-[#C73B22]/10 text-[#C73B22] text-xs font-bold tracking-widest uppercase mb-6">
          <ShieldAlert className="w-4 h-4 mr-2" />
          Structured Trade Finance & Escrow Governance
        </div>
        <h1 className="text-4xl md:text-6xl font-black tracking-tight max-w-5xl mx-auto mb-8 leading-[1.1]">
          End-to-End Settlement Integrity from <span className="text-[#C73B22]">Inventory Lock</span> to Verified Seller Payout
        </h1>
        <p className="text-lg md:text-xl text-[#666660] max-w-3xl mx-auto leading-relaxed">
          Finatrades enforces a sequenced, condition-based settlement protocol that binds buyer payment confirmation, escrow custody, warehouse release authorisation, logistics verification, and final seller disbursement into a single governed transaction flow — with immutable audit visibility at every stage.
        </p>
      </header>

      {/* Timeline Section */}
      <section className="relative max-w-7xl mx-auto px-6 py-20">
        {/* Central Vertical Line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px timeline-line hidden md:block" />

        <div className="space-y-12 md:space-y-0 relative">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isEven = index % 2 === 1;

            return (
              <div key={step.number} className={`flex flex-col md:flex-row items-center justify-center w-full mb-12 md:mb-24 ${isEven ? 'md:flex-row-reverse' : ''}`}>
                {/* Content Card */}
                <div className="w-full md:w-[45%]">
                  <div className={`relative p-8 rounded-2xl bg-[#1A1A1A]/50 border border-white/5 backdrop-blur-sm hover:border-[#C73B22]/50 transition-all duration-500 group`}>
                    <div className="absolute -top-4 -right-4 text-6xl font-black text-white/5 group-hover:text-[#C73B22]/10 transition-colors duration-500 select-none">
                      {step.number}
                    </div>
                    <div className="flex items-center mb-6">
                      <div className="p-3 rounded-lg bg-[#C73B22]/10 text-[#C73B22] mr-4 border border-[#C73B22]/20">
                        <Icon size={24} />
                      </div>
                      <h3 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                        {step.title}
                      </h3>
                    </div>
                    <p className="text-[#666660] leading-relaxed text-base md:text-lg">
                      {step.description}
                    </p>
                  </div>
                </div>

                {/* Central Node */}
                <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center justify-center w-12 h-12 rounded-full bg-[#0A0A0A] border-4 border-[#C73B22] shadow-[0_0_20px_#C73B22] z-20">
                  <span className="text-xs font-bold text-white">{step.number}</span>
                </div>

                {/* Empty Space for alignment */}
                <div className="hidden md:block w-[45%]" />
              </div>
            );
          })}
        </div>
      </section>

      {/* Non-Negotiable Conditions Section */}
      <section className="max-w-7xl mx-auto px-6 py-32">
        <div className="mb-12 text-center md:text-left">
          <h2 className="text-3xl font-black tracking-tight text-white mb-4 uppercase">
            Non-Negotiable Settlement Conditions
          </h2>
          <div className="h-1 w-24 bg-[#C73B22] mx-auto md:mx-0" />
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/5 bg-[#1A1A1A]/30">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#1A1A1A]">
              <tr>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#666660] border-b border-white/5">Risk Parameter</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#666660] border-b border-white/5">Protocol Action / Consequence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {conditions.map((item, idx) => (
                <tr key={idx} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-6 text-base text-white/90 font-medium">
                    {item.condition}
                  </td>
                  <td className="px-6 py-6">
                    <div className="inline-flex items-center px-3 py-1 rounded bg-[#C73B22]/10 border border-[#C73B22]/20 text-[#C73B22] text-sm font-bold uppercase tracking-tight">
                      <AlertCircle className="w-4 h-4 mr-2" />
                      {item.consequence}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="mt-12 p-8 rounded-2xl border border-[#C73B22]/20 bg-[#C73B22]/5 text-center">
          <p className="text-[#F8F7F4] text-sm font-semibold tracking-wide flex items-center justify-center uppercase">
            <ShieldAlert className="w-5 h-5 mr-3 text-[#C73B22]" />
            Any failure to satisfy these conditions results in immediate protocol suspension and escrow hold.
          </p>
        </div>
      </section>

      {/* Footer Decoration */}
      <div className="h-32 w-full bg-gradient-to-t from-[#C73B22]/10 to-transparent opacity-30" />
    </div>
  );
}
