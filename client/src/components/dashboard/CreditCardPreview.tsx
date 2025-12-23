import React from 'react';

interface CreditCardPreviewProps {
  userName?: string;
  cardNumber?: string;
  expiry?: string;
  cardType?: 'personal' | 'business';
}

export default function CreditCardPreview({ 
  userName = 'FINATRADES USER', 
  cardNumber = '4789  ••••  ••••  3456',
  expiry = '12/28',
  cardType = 'personal'
}: CreditCardPreviewProps) {
  const isPersonal = cardType === 'personal';
  
  return (
    <div className={`relative w-full h-full min-h-[220px] rounded-3xl bg-gradient-to-br from-[#3D1A5C] via-[#2A0055] to-[#1a0a30] border-2 ${isPersonal ? 'border-[#8A2BE2]/60' : 'border-[#A342FF]/70'} p-5 shadow-2xl shadow-[#8A2BE2]/40 overflow-hidden`}>
      {/* Animated shimmer effect */}
      <div className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12 animate-pulse" />
      
      {/* Header row: Logo + Active badge */}
      <div className="flex justify-between items-center mb-4 relative z-10">
        <div className="flex items-center gap-2">
          <span className="text-[#A342FF] text-lg">✦</span>
          <span className="text-white font-bold text-lg tracking-wide">FINA<span className="text-[#A342FF]">TRADES</span></span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-green-400 font-bold uppercase px-3 py-1 bg-green-400/15 rounded-full border border-green-400/30">Active</span>
          <span className="text-[#A342FF]">📶</span>
        </div>
      </div>
      
      {/* Chip + Card type row */}
      <div className="flex items-center gap-4 mb-5 relative z-10">
        {/* Gold chip */}
        <div className="w-12 h-9 rounded-md bg-gradient-to-br from-[#EAC26B] via-[#F5D98A] to-[#d4af5a] shadow-lg relative overflow-hidden">
          <div className="absolute inset-0 flex flex-col justify-center gap-[2px] py-2">
            <div className="h-[2px] bg-[#b8942d]/60 mx-1.5" />
            <div className="h-[2px] bg-[#b8942d]/60 mx-1.5" />
            <div className="h-[2px] bg-[#b8942d]/60 mx-1.5" />
            <div className="h-[2px] bg-[#b8942d]/60 mx-1.5" />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#A342FF]" />
            <span className="text-white font-semibold text-sm tracking-wide">{isPersonal ? 'PERSONAL GOLD' : 'ENTERPRISE GOLD'}</span>
          </div>
          <p className="text-gray-400 text-[10px] tracking-wider mt-0.5">GOLD-BACKED DIGITAL</p>
        </div>
      </div>
      
      {/* Card number */}
      <div className="mb-5 relative z-10">
        <p className="text-white text-xl tracking-[0.15em] font-medium">
          {cardNumber}
        </p>
      </div>
      
      {/* Bottom row: Card holder + Valid thru + Secured */}
      <div className="flex justify-between items-end relative z-10">
        <div className="flex gap-6">
          <div>
            <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">Card Holder</p>
            <p className="text-white text-sm font-semibold">{userName}</p>
          </div>
          <div>
            <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">Valid Thru</p>
            <p className="text-white text-sm font-semibold">{expiry}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-full border border-white/20">
          <span className="text-white/80 text-[10px]">🔒</span>
          <span className="text-white text-[10px] font-semibold tracking-wide">SECURED</span>
        </div>
      </div>
      
      {/* Edge highlight */}
      <div className="absolute inset-0 rounded-3xl ring-1 ring-white/10 ring-inset pointer-events-none" />
    </div>
  );
}
