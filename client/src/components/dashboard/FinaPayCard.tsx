import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wifi, Copy, Eye, EyeOff, CreditCard, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export default function FinaPayCard() {
  const { user } = useAuth();
  const [showNumber, setShowNumber] = useState(false);

  const copyCardNumber = () => {
    navigator.clipboard.writeText("4532 1234 5678 9012");
    toast.success("Card number copied");
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-[#1A0A2E] to-[#0D0515] border border-white/10 relative overflow-hidden group h-full flex flex-col justify-between">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-bold text-white mb-1">FinaCard Metal</h3>
          <p className="text-xs text-[#D4AF37] font-medium uppercase tracking-wider">Premium Debit</p>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-white/40 hover:text-white">
          <Settings className="w-4 h-4" />
        </Button>
      </div>

      {/* Card Visual */}
      <div className="relative w-full aspect-[1.586/1] rounded-xl bg-gradient-to-br from-[#D4AF37] via-[#FCEda8] to-[#B8860B] shadow-lg p-5 flex flex-col justify-between mb-6 group-hover:scale-[1.02] transition-transform duration-300">
        {/* Card Noise Texture */}
        <div className="absolute inset-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay rounded-xl" />
        
        <div className="relative z-10 flex justify-between items-start">
          <CreditCard className="w-8 h-8 text-black/60" />
          <Wifi className="w-6 h-6 text-black/60 rotate-90" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="font-mono text-lg md:text-xl font-bold text-black tracking-widest">
              {showNumber ? "4532 1234 5678 9012" : "•••• •••• •••• 9012"}
            </span>
            <button 
              onClick={() => setShowNumber(!showNumber)}
              className="text-black/40 hover:text-black/70 transition-colors"
            >
              {showNumber ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button 
              onClick={copyCardNumber}
              className="text-black/40 hover:text-black/70 transition-colors"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>

          <div className="flex justify-between items-end">
            <div>
              <p className="text-[10px] text-black/50 uppercase font-bold mb-0.5">Card Holder</p>
              <p className="text-sm font-bold text-black tracking-wide uppercase">
                {user?.firstName} {user?.lastName}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-black/50 uppercase font-bold mb-0.5">Expires</p>
              <p className="text-sm font-bold text-black tracking-wide">12/28</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" className="border-white/10 hover:bg-white/5 text-white">
          Freeze Card
        </Button>
        <Button className="bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 font-semibold">
          View Details
        </Button>
      </div>
    </Card>
  );
}
