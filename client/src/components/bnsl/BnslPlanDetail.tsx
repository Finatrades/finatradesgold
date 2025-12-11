import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BnslPlan, BnslPayout } from '@/types/bnsl';
import { ArrowLeft, CheckCircle2, AlertTriangle, PlayCircle, Clock } from 'lucide-react';
import EarlyTerminationSimulator from './EarlyTerminationSimulator';

interface BnslPlanDetailProps {
  plan: BnslPlan;
  onBack: () => void;
  onSimulatePayout: (payoutId: string, currentPrice: number) => void;
  onTerminate: (planId: string) => void;
  currentGoldPrice: number;
}

export default function BnslPlanDetail({ 
  plan, 
  onBack, 
  onSimulatePayout, 
  onTerminate,
  currentGoldPrice 
}: BnslPlanDetailProps) {
  
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);

  // Find next scheduled payout
  const nextPayout = plan.payouts.find(p => p.status === 'Scheduled');

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <Button variant="ghost" onClick={onBack} className="pl-0 text-white/60 hover:text-white hover:bg-transparent">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Plans
        </Button>
        <div className="flex gap-2">
           <Button 
             variant="destructive" 
             className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20"
             onClick={() => setIsSimulatorOpen(true)}
             disabled={plan.status !== 'Active'}
           >
             Early Termination
           </Button>
        </div>
      </div>

      {/* Overview Card */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="border-b border-white/10 pb-4">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-xl font-bold text-white mb-1">
                {plan.tenorMonths}-Month BNSL Plan
              </CardTitle>
              <div className="flex items-center gap-2 text-sm text-white/60">
                <span>{plan.id}</span>
                <span>•</span>
                <span>Started {new Date(plan.startDate).toLocaleDateString()}</span>
              </div>
            </div>
            <Badge className="bg-green-500/20 text-green-500 hover:bg-green-500/30 border-green-500/20">
              {plan.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Gold Sold</p>
              <p className="text-2xl font-bold text-white">{plan.goldSoldGrams.toFixed(2)} g</p>
              <p className="text-xs text-white/40 mt-1">@ ${plan.enrollmentPriceUsdPerGram.toFixed(2)}/g</p>
            </div>
            <div>
              <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Deferred Base (USD)</p>
              <p className="text-2xl font-bold text-white">${plan.basePriceComponentUsd.toLocaleString()}</p>
              <p className="text-xs text-white/40 mt-1">Paid at Maturity</p>
            </div>
            <div>
              <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Total Margin</p>
              <p className="text-2xl font-bold text-[#D4AF37]">${plan.totalMarginComponentUsd.toLocaleString()}</p>
              <p className="text-xs text-white/40 mt-1">Paid Quarterly in Gold</p>
            </div>
            <div>
              <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Margin Received</p>
              <p className="text-2xl font-bold text-[#D4AF37]">{plan.totalPaidMarginGrams.toFixed(3)} g</p>
              <p className="text-xs text-white/40 mt-1">${plan.totalPaidMarginUsd.toLocaleString()}</p>
            </div>
          </div>

          <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-start gap-3">
             <Clock className="w-5 h-5 text-blue-400 mt-0.5" />
             <div>
               <h4 className="font-bold text-blue-400 text-sm">Contract Type: Deferred Price Sale</h4>
               <p className="text-xs text-white/60 mt-1 leading-relaxed">
                 You have sold this gold to Wingold. You no longer own it. You hold a contractual right to receive 
                 (1) Quarterly Margin in gold grams and (2) Base Price Component settlement at maturity.
               </p>
             </div>
          </div>
        </CardContent>
      </Card>

      {/* Payout Schedule */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="border-b border-white/10 pb-4">
           <div className="flex justify-between items-center">
             <CardTitle className="text-lg font-bold text-white">Payout Schedule</CardTitle>
             {nextPayout && (
               <Button 
                 size="sm" 
                 className="bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90"
                 onClick={() => onSimulatePayout(nextPayout.id, currentGoldPrice)}
               >
                 <PlayCircle className="w-4 h-4 mr-2" /> Simulate Next Payout
               </Button>
             )}
           </div>
        </CardHeader>
        <CardContent className="p-0">
           <table className="w-full text-sm text-left">
             <thead className="bg-white/5 text-white/60 font-medium">
               <tr>
                 <th className="p-4 pl-6">#</th>
                 <th className="p-4">Scheduled Date</th>
                 <th className="p-4">Margin (USD)</th>
                 <th className="p-4">Spot Price (USD/g)</th>
                 <th className="p-4">Gold Credited</th>
                 <th className="p-4 pr-6 text-right">Status</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-white/5">
               {plan.payouts.map((payout) => (
                 <tr key={payout.id} className="hover:bg-white/5 transition-colors">
                   <td className="p-4 pl-6 text-white/60">{payout.sequence}</td>
                   <td className="p-4 font-medium text-white">
                     {new Date(payout.scheduledDate).toLocaleDateString()}
                   </td>
                   <td className="p-4 text-white">${payout.monetaryAmountUsd.toLocaleString()}</td>
                   <td className="p-4 text-white/60">
                     {payout.marketPriceUsdPerGramAtPayout 
                       ? `$${payout.marketPriceUsdPerGramAtPayout.toFixed(2)}` 
                       : '-'}
                   </td>
                   <td className="p-4 font-bold text-[#D4AF37]">
                     {payout.gramsCredited ? `${payout.gramsCredited.toFixed(4)} g` : '-'}
                   </td>
                   <td className="p-4 pr-6 text-right">
                     <span className={`px-2 py-1 rounded text-xs font-bold ${
                       payout.status === 'Paid' 
                         ? 'bg-green-500/10 text-green-500' 
                         : payout.status === 'Cancelled'
                         ? 'bg-red-500/10 text-red-500'
                         : 'bg-white/10 text-white/60'
                     }`}>
                       {payout.status}
                     </span>
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
        </CardContent>
      </Card>

      <EarlyTerminationSimulator 
        plan={plan} 
        currentGoldPrice={currentGoldPrice} 
        isOpen={isSimulatorOpen} 
        onClose={() => setIsSimulatorOpen(false)}
        onConfirmTermination={() => {
          onTerminate(plan.id);
          setIsSimulatorOpen(false);
          onBack();
        }}
      />

    </div>
  );
}
