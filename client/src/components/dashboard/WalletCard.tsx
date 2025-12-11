import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, Plus, ArrowRight } from 'lucide-react';

export default function WalletCard() {
  return (
    <Card className="p-6 bg-gradient-to-br from-[#0D001E] to-[#1A0033] border border-white/10 relative overflow-hidden group">
       <div className="absolute bottom-0 left-0 w-40 h-40 bg-[#8A2BE2]/5 blur-[60px] rounded-full pointer-events-none group-hover:bg-[#8A2BE2]/10 transition-colors duration-500" />

       <div className="relative z-10 flex flex-col h-full justify-between">
         <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-white mb-1">FinaPay Wallet</h3>
              <p className="text-xs text-[#8A2BE2] font-medium uppercase tracking-wider">Available Balance</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#8A2BE2]/10 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-[#8A2BE2]" />
            </div>
         </div>

         <div className="mb-8">
           <p className="text-3xl font-bold text-white mb-2">120.50 <span className="text-lg text-[#D4AF37]">g</span></p>
           <div className="flex gap-4 text-sm text-white/60">
             <span>≈ $7,800.00</span>
             <span>≈ AED 28,600.00</span>
           </div>
         </div>

         <div className="flex gap-3">
           <Button className="flex-1 bg-white/10 hover:bg-white/20 text-white border border-white/10">
             <Plus className="w-4 h-4 mr-2" /> Add Funds
           </Button>
           <Button className="flex-1 bg-[#8A2BE2] hover:bg-[#8A2BE2]/90 text-white">
             Open Wallet <ArrowRight className="w-4 h-4 ml-2" />
           </Button>
         </div>
       </div>
    </Card>
  );
}
