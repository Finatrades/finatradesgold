import React from 'react';
import { Wifi } from 'lucide-react';

interface CreditCardPreviewProps {
  userName?: string;
  cardNumber?: string;
  expiry?: string;
}

export default function CreditCardPreview({ 
  userName = 'CARD HOLDER', 
  cardNumber = '4532  ••••  ••••  0003',
  expiry = '12/28'
}: CreditCardPreviewProps) {
  return (
    <div className="relative w-full h-full min-h-[200px] rounded-2xl overflow-hidden shadow-2xl">
      {/* Premium gold gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500 via-yellow-500 to-purple-600" />
      
      {/* Metallic shine overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent" />
      
      {/* Decorative circles pattern */}
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-gradient-to-br from-white/30 to-transparent" />
      <div className="absolute -bottom-20 -left-10 w-48 h-48 rounded-full bg-gradient-to-tr from-fuchsia-700/40 to-transparent" />
      <div className="absolute top-1/2 right-1/4 w-32 h-32 rounded-full bg-gradient-to-bl from-white/10 to-transparent blur-sm" />
      
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
        backgroundSize: '20px 20px'
      }} />
      
      {/* Card content */}
      <div className="relative z-10 h-full p-5 flex flex-col justify-between text-white">
        {/* Top row - Brand and Chip */}
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-wide drop-shadow-md">FinaCard</span>
            <span className="text-[10px] font-medium tracking-widest opacity-80 mt-0.5">GOLD EXCLUSIVE</span>
          </div>
          
          {/* Contactless + Chip */}
          <div className="flex items-center gap-2">
            <Wifi className="w-5 h-5 rotate-90 opacity-80" />
          </div>
        </div>
        
        {/* EMV Chip */}
        <div className="flex items-center gap-4 my-2">
          <div className="w-11 h-8 rounded-md bg-gradient-to-br from-yellow-200 via-yellow-100 to-yellow-300 shadow-inner flex items-center justify-center overflow-hidden">
            <div className="w-full h-full grid grid-cols-3 grid-rows-2 gap-[1px] p-1">
              <div className="bg-gradient-to-br from-purple-300 to-fuchsia-400 rounded-[2px]" />
              <div className="bg-gradient-to-br from-purple-300 to-fuchsia-400 rounded-[2px]" />
              <div className="bg-gradient-to-br from-purple-300 to-fuchsia-400 rounded-[2px]" />
              <div className="bg-gradient-to-br from-purple-300 to-fuchsia-400 rounded-[2px]" />
              <div className="bg-gradient-to-br from-purple-300 to-fuchsia-400 rounded-[2px]" />
              <div className="bg-gradient-to-br from-purple-300 to-fuchsia-400 rounded-[2px]" />
            </div>
          </div>
        </div>
        
        {/* Card number */}
        <div className="py-1">
          <p className="font-mono text-xl tracking-[0.2em] font-semibold drop-shadow-md">{cardNumber}</p>
        </div>
        
        {/* Bottom row - Name, expiry and brand */}
        <div className="flex justify-between items-end">
          <div className="flex gap-6">
            <div>
              <p className="text-[9px] uppercase tracking-wider opacity-70 mb-1">Card Holder</p>
              <p className="text-sm font-semibold uppercase tracking-wider drop-shadow-sm">{userName}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-wider opacity-70 mb-1">Valid Thru</p>
              <p className="text-sm font-mono font-semibold drop-shadow-sm">{expiry}</p>
            </div>
          </div>
          
          {/* Mastercard logo */}
          <div className="flex items-center">
            <div className="flex -space-x-3">
              <div className="w-8 h-8 rounded-full bg-red-600 shadow-lg" />
              <div className="w-8 h-8 rounded-full bg-purple-500 shadow-lg opacity-90" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Edge highlight */}
      <div className="absolute inset-0 rounded-2xl ring-1 ring-white/30 ring-inset pointer-events-none" />
    </div>
  );
}
