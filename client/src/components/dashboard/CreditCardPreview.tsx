import React from 'react';

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
    <div className="relative w-full h-full min-h-[180px] rounded-xl bg-gradient-to-br from-gray-800 via-gray-900 to-black p-5 text-white overflow-hidden shadow-lg">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-orange-500 rounded-full blur-3xl" />
      </div>
      
      {/* Card content */}
      <div className="relative z-10 h-full flex flex-col justify-between">
        {/* Top row - Logo */}
        <div className="flex justify-between items-start">
          <div className="text-xs font-medium tracking-wider opacity-70">FINATRADES</div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-orange-400 font-medium">GOLD MEMBER</span>
          </div>
        </div>
        
        {/* Card number */}
        <div className="py-4">
          <p className="font-mono text-lg tracking-widest">{cardNumber}</p>
        </div>
        
        {/* Bottom row - Name and expiry */}
        <div className="flex justify-between items-end">
          <div>
            <p className="text-[10px] opacity-60 mb-1">CARD HOLDER</p>
            <p className="text-sm font-medium uppercase tracking-wide">{userName}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[10px] opacity-60 mb-1">VALID THRU</p>
              <p className="text-sm font-mono">{expiry}</p>
            </div>
            {/* Mastercard circles */}
            <div className="flex -space-x-2">
              <div className="w-6 h-6 rounded-full bg-red-500 opacity-80" />
              <div className="w-6 h-6 rounded-full bg-orange-400 opacity-80" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
