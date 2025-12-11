import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BnslPlan } from '@/types/bnsl';
import { ArrowRight, Clock, Ban, CheckCircle2 } from 'lucide-react';

interface BnslPlanListProps {
  plans: BnslPlan[];
  onViewPlan: (plan: BnslPlan) => void;
}

export default function BnslPlanList({ plans, onViewPlan }: BnslPlanListProps) {
  if (plans.length === 0) {
    return (
      <Card className="bg-white/5 border-white/10 p-12 text-center">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="p-4 bg-white/5 rounded-full">
            <Clock className="w-12 h-12 text-white/20" />
          </div>
          <h3 className="text-xl font-bold text-white">No Active BNSL Plans</h3>
          <p className="text-white/60 max-w-md">
            You haven't started any Buy Now Sell Later plans yet. Start a new plan to begin earning gold-denominated margin.
          </p>
        </div>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'Maturing': return 'bg-teal-500/10 text-teal-500 border-teal-500/20';
      case 'Completed': return 'bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/20';
      case 'Early Terminated': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        {plans.map((plan) => (
          <Card key={plan.id} className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                
                <div className="space-y-1 min-w-[200px]">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-white/40">{plan.id}</span>
                    <Badge variant="outline" className={`${getStatusColor(plan.status)} border`}>
                      {plan.status}
                    </Badge>
                  </div>
                  <h3 className="text-lg font-bold text-white">
                    {plan.tenorMonths} Months @ {plan.marginRateAnnualPercent * 100}% p.a.
                  </h3>
                  <p className="text-sm text-white/60">
                    Started: {new Date(plan.startDate).toLocaleDateString()} • Matures: {new Date(plan.maturityDate).toLocaleDateString()}
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 flex-1">
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Gold Sold</p>
                    <p className="font-bold text-white">{plan.goldSoldGrams.toFixed(2)} g</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Deferred Base</p>
                    <p className="font-bold text-white">${plan.basePriceComponentUsd.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Total Margin</p>
                    <p className="font-bold text-[#D4AF37]">${plan.totalMarginComponentUsd.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Received (g)</p>
                    <p className="font-bold text-[#D4AF37]">{plan.totalPaidMarginGrams.toFixed(3)} g</p>
                  </div>
                </div>

                <div>
                  <Button 
                    variant="outline" 
                    className="border-white/10 hover:bg-white/10 text-white"
                    onClick={() => onViewPlan(plan)}
                  >
                    View Details <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>

              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
