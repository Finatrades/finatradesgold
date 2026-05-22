import React, { useEffect } from 'react';
import { CreditCard, Lock, Warehouse, Handshake } from 'lucide-react';

export function NarrativeEditorial() {
  useEffect(() => {
    const link1 = document.createElement('link');
    link1.rel = 'preconnect';
    link1.href = 'https://fonts.googleapis.com';
    document.head.appendChild(link1);

    const link2 = document.createElement('link');
    link2.rel = 'stylesheet';
    link2.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&display=swap';
    document.head.appendChild(link2);

    return () => {
      document.head.removeChild(link1);
      document.head.removeChild(link2);
    };
  }, []);

  const steps = [
    {
      number: "01",
      icon: <CreditCard className="w-8 h-8 text-[#C73B22]" />,
      title: "Buyer Fund Verification & Payment Confirmation",
      description: "Prior to any inventory reservation, buyer funds undergo institutional-grade verification and are confirmed as available, cleared, and allocated against the specific trade order."
    },
    {
      number: "02",
      icon: <Lock className="w-8 h-8 text-[#C73B22]" />,
      title: "Escrow Custody & Bilateral Lock Enforcement",
      description: "Upon payment confirmation, the corresponding inventory is placed under escrow custody and locked against the purchase order. Neither party may unilaterally alter or release the position."
    },
    {
      number: "03",
      icon: <Warehouse className="w-8 h-8 text-[#C73B22]" />,
      title: "Conditional Warehouse Release Authorisation",
      description: "Warehouse release instructions are issued exclusively upon verification of delivery milestones, logistics handover, quality inspection sign-off, and all contractually mandated trade documents."
    },
    {
      number: "04",
      icon: <Handshake className="w-8 h-8 text-[#C73B22]" />,
      title: "Seller Disbursement & Immutable Audit Closure",
      description: "Once all settlement conditions are independently verified, escrowed funds are released to the seller's designated account with an immutable, timestamped audit trail."
    }
  ];

  const conditions = [
    { rule: "Unverified inventory position", consequence: "Transaction suspended — no sale initiated" },
    { rule: "Unconfirmed or insufficient buyer funds", consequence: "Inventory lock withheld — no reservation" },
    { rule: "Escrow conditions not satisfied", consequence: "Warehouse release blocked — no dispatch" },
    { rule: "Delivery milestone unverified", consequence: "Final payout deferred — funds held in escrow" },
    { rule: "Incomplete or unsigned trade documentation", consequence: "Audit trail void — settlement rejected" }
  ];

  return (
    <div className="min-h-screen w-full bg-[#F8F7F4] text-[#1A1A1A] font-sans selection:bg-[#C73B22] selection:text-white pb-24">
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
          .font-playfair { font-family: 'Playfair Display', serif; }
          .font-inter { font-family: 'Inter', sans-serif; }
        `}
      </style>

      {/* Top Section */}
      <header className="max-w-4xl mx-auto pt-24 pb-16 px-6 text-center">
        <span className="block text-[#C73B22] uppercase tracking-[0.2em] text-xs font-semibold mb-6">
          Structured Trade Finance & Escrow Governance
        </span>
        <h1 className="font-playfair text-5xl md:text-6xl lg:text-7xl font-black leading-tight mb-8">
          End-to-End Settlement Integrity from Inventory Lock to Verified Seller Payout
        </h1>
        <div className="max-w-2xl mx-auto">
          <p className="text-[#666660] text-lg md:text-xl leading-relaxed font-inter">
            Finatrades enforces a sequenced, condition-based settlement protocol that binds buyer payment confirmation, escrow custody, warehouse release authorisation, logistics verification, and final seller disbursement into a single governed transaction flow — with immutable audit visibility at every stage.
          </p>
        </div>
      </header>

      {/* Middle Section: Story Cards */}
      <section className="max-w-6xl mx-auto px-4 mb-24">
        <div className="flex flex-col">
          {steps.map((step, index) => (
            <div 
              key={index}
              className={`flex flex-col md:flex-row items-center p-12 md:p-16 border-b border-[#E5E3DE] last:border-0 ${
                index % 2 === 0 ? 'bg-white' : 'bg-[#F2F1ED]'
              }`}
            >
              {/* Massive Decorative Number */}
              <div className="flex-shrink-0 mb-8 md:mb-0 md:mr-16">
                <span className="font-playfair text-[#C73B22] text-[120px] md:text-[140px] font-black leading-none opacity-90 select-none">
                  {step.number}
                </span>
              </div>

              {/* Vertical Separator */}
              <div className="hidden md:block w-px h-32 bg-[#E5E3DE] mr-16" />

              {/* Content */}
              <div className="flex-grow">
                <div className="flex items-center gap-3 mb-4">
                  {step.icon}
                  <h3 className="font-playfair text-2xl md:text-3xl font-bold">
                    {step.title}
                  </h3>
                </div>
                <p className="text-[#666660] text-lg leading-relaxed font-inter max-w-2xl">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom Section: Non-Negotiable Conditions */}
      <section className="max-w-6xl mx-auto px-6">
        <h2 className="font-playfair text-3xl font-bold mb-12 text-center">Non-Negotiable Settlement Conditions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {conditions.map((condition, index) => (
            <div 
              key={index}
              className="bg-white p-6 border-l-4 border-[#C73B22] shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              <div className="mb-4">
                <p className="font-bold text-lg md:text-xl leading-snug">
                  {condition.rule}
                </p>
              </div>
              <div>
                <span className="inline-block px-3 py-1 bg-[#F2F1ED] text-[#666660] text-sm font-medium rounded-full">
                  {condition.consequence}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer Decoration */}
      <footer className="mt-24 border-t border-[#E5E3DE] pt-12 text-center text-[#666660] text-sm uppercase tracking-widest pb-12">
        <div className="flex justify-center items-center gap-4">
          <div className="h-px w-12 bg-[#E5E3DE]" />
          <span>Established Governance Protocol</span>
          <div className="h-px w-12 bg-[#E5E3DE]" />
        </div>
      </footer>
    </div>
  );
}
