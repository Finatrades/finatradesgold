import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Gift } from 'lucide-react';

export default function ReferralCard() {
  return (
    <Card className="p-6 bg-gradient-to-br from-[#1A0A2E] to-[#0D0515] border border-white/10 relative overflow-hidden group">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-[#D4AF37]/5 blur-[60px] rounded-full pointer-events-none group-hover:bg-[#D4AF37]/10 transition-colors duration-500" />
      
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-white mb-1">Referral Plan</h3>
            <p className="text-xs text-[#D4AF37] font-medium uppercase tracking-wider">Single-level reward</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-[#D4AF37]/10 flex items-center justify-center">
            <Gift className="w-5 h-5 text-[#D4AF37]" />
          </div>
        </div>

        <p className="text-sm text-white/60 mb-6 leading-relaxed">
          single level, if any user introduced any New user and then user deposit funds then first user recive xxxx Amount of GOLD
        </p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white/5 p-3 rounded-lg border border-white/5">
            <p className="text-xs text-white/40 mb-1">Total Earned</p>
            <p className="text-lg font-bold text-[#D4AF37]">3.00 g</p>
          </div>
          <div className="bg-white/5 p-3 rounded-lg border border-white/5">
            <p className="text-xs text-white/40 mb-1">Referrals</p>
            <p className="text-lg font-bold text-white">12</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="text-xs text-white/40">
            Current Reward: <span className="text-white">0.25 g / user</span>
          </div>
          <Button size="sm" className="bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 font-semibold">
            <Users className="w-4 h-4 mr-2" /> Invite Friend
          </Button>
        </div>
      </div>
    </Card>
  );
}
