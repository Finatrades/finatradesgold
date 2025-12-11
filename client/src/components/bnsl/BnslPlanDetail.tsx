import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BnslPlan } from '@/types/bnsl';
import { ArrowLeft, CheckCircle2, AlertTriangle, PlayCircle, Clock, Hourglass, TrendingUp } from 'lucide-react';
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

  // --- Daily Accrual Logic ---
  const dailyMarginUsd = plan.quarterlyMarginUsd / 90;
  
  // Find start of current period
  // If no payouts paid yet, start date. If paid, use the scheduled date of the last paid one as the start of new period.
  const paidPayouts = plan.payouts.filter(p => p.status === 'Paid');
  const lastPayout = paidPayouts.length > 0 
    ? paidPayouts[paidPayouts.length - 1] 
    : null;
    
  const currentPeriodStart = lastPayout 
    ? new Date(lastPayout.scheduledDate) 
    : new Date(plan.startDate);
    
  const now = new Date();
  // Ensure we don't calculate negative if start date is future (shouldn't happen for active)
  const diffTime = Math.max(0, now.getTime() - currentPeriodStart.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); 
  
  // Cap accrued at the quarterly amount (e.g. if we are overdue)
  const accruedMargin = Math.min(diffDays * dailyMarginUsd, plan.quarterlyMarginUsd);
  // ---------------------------

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <Button variant="ghost" onClick={onBack} className="pl-0 text-muted-foreground hover:text-foreground hover:bg-transparent">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Plans
        </Button>
        <div className="flex gap-2">
           <Button 
             variant="destructive" 
             className="bg-red-500/10 text-red-600 hover:bg-red-500/20 border border-red-500/20"
             onClick={() => setIsSimulatorOpen(true)}
             disabled={plan.status !== 'Active'}
           >
             Early Termination
           </Button>
        </div>
      </div>

      {/* Overview Card */}
      <Card className="bg-white shadow-sm border border-border">
        <CardHeader className="border-b border-border pb-4">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-xl font-bold text-foreground mb-1">
                {plan.tenorMonths}-Month BNSL Plan
              </CardTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{plan.id}</span>
                <span>•</span>
                <span>Started {new Date(plan.startDate).toLocaleDateString()}</span>
              </div>
            </div>
            <Badge className="bg-green-500/20 text-green-600 hover:bg-green-500/30 border-green-500/20">
              {plan.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Gold Sold</p>
              <p className="text-2xl font-bold text-foreground">{plan.goldSoldGrams.toFixed(2)} g</p>
              <p className="text-xs text-muted-foreground mt-1">@ ${plan.enrollmentPriceUsdPerGram.toFixed(2)}/g</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Deferred Base (USD)</p>
              <p className="text-2xl font-bold text-foreground">${plan.basePriceComponentUsd.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">Paid at Maturity</p>
            </div>
            
            {/* New Daily Accrual Card */}
            <div className="bg-secondary/10 -m-2 p-2 rounded-lg border border-secondary/20">
              <div className="flex items-center gap-2 mb-1">
                 <Hourglass className="w-3 h-3 text-secondary animate-pulse" />
                 <p className="text-xs text-secondary uppercase tracking-wider">Accrued Margin</p>
              </div>
              <p className="text-2xl font-bold text-foreground">${accruedMargin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <p className="text-xs text-muted-foreground mt-1">
                 Daily: ${dailyMarginUsd.toFixed(2)}
                 <span className="ml-1 text-muted-foreground/50">|</span>
                 <span className="ml-1 text-secondary">Unpaid</span>
              </p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Paid Margin</p>
              <p className="text-2xl font-bold text-secondary">{plan.paidMarginGrams.toFixed(3)} g</p>
              <p className="text-xs text-muted-foreground mt-1">${plan.paidMarginUsd.toLocaleString()} Value</p>
            </div>
          </div>

          <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-start gap-3">
             <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
             <div>
               <h4 className="font-bold text-blue-600 text-sm">Contract Type: Deferred Price Sale</h4>
               <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                 You have sold this gold to Wingold. You no longer own it. You hold a contractual right to receive 
                 (1) Quarterly Margin in gold grams and (2) Base Price Component settlement at maturity.
                 <br/><br/>
                 <span className="text-secondary font-medium">Note:</span> Margin accrues daily but is disbursed only on the scheduled quarterly dates.
               </p>
             </div>
          </div>
        </CardContent>
      </Card>

      {/* Payout Schedule */}
      <Card className="bg-white shadow-sm border border-border">
        <CardHeader className="border-b border-border pb-4">
           <div className="flex justify-between items-center">
             <CardTitle className="text-lg font-bold text-foreground">Payout Schedule</CardTitle>
             {nextPayout && (
               <Button 
                 size="sm" 
                 className="bg-secondary text-white hover:bg-secondary/90"
                 onClick={() => onSimulatePayout(nextPayout.id, currentGoldPrice)}
               >
                 <PlayCircle className="w-4 h-4 mr-2" /> Simulate Next Payout
               </Button>
             )}
           </div>
        </CardHeader>
        <CardContent className="p-0">
           <table className="w-full text-sm text-left">
             <thead className="bg-muted text-muted-foreground font-medium">
               <tr>
                 <th className="p-4 pl-6">#</th>
                 <th className="p-4">Scheduled Date</th>
                 <th className="p-4">Margin (USD)</th>
                 <th className="p-4">Spot Price (USD/g)</th>
                 <th className="p-4">Gold Credited</th>
                 <th className="p-4 pr-6 text-right">Status</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-border">
               {plan.payouts.map((payout) => (
                 <tr key={payout.id} className="hover:bg-muted/50 transition-colors">
                   <td className="p-4 pl-6 text-muted-foreground">{payout.sequence}</td>
                   <td className="p-4 font-medium text-foreground">
                     {new Date(payout.scheduledDate).toLocaleDateString()}
                   </td>
                   <td className="p-4 text-foreground">${payout.monetaryAmountUsd.toLocaleString()}</td>
                   <td className="p-4 text-muted-foreground">
                     {payout.marketPriceUsdPerGram 
                       ? `$${payout.marketPriceUsdPerGram.toFixed(2)}` 
                       : '-'}
                   </td>
                   <td className="p-4 font-bold text-secondary">
                     {payout.gramsCredited ? `${payout.gramsCredited.toFixed(4)} g` : '-'}
                   </td>
                   <td className="p-4 pr-6 text-right">
                     <span className={`px-2 py-1 rounded text-xs font-bold ${
                       payout.status === 'Paid' 
                         ? 'bg-green-500/10 text-green-600' 
                         : payout.status === 'Cancelled'
                         ? 'bg-red-500/10 text-red-600'
                         : 'bg-muted text-muted-foreground'
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
