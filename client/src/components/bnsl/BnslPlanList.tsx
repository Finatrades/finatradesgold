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
      <Card className="bg-white shadow-sm border border-border p-12 text-center">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="p-4 bg-muted rounded-full">
            <Clock className="w-12 h-12 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-bold text-foreground">No Active BNSL Plans</h3>
          <p className="text-muted-foreground max-w-md">
            You haven't started any Buy Now Sell Later plans yet. Start a new plan to begin earning gold-denominated margin.
          </p>
        </div>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'Maturing': return 'bg-teal-500/10 text-teal-600 border-teal-500/20';
      case 'Completed': return 'bg-secondary/10 text-secondary border-secondary/20';
      case 'Early Terminated': return 'bg-red-500/10 text-red-600 border-red-500/20';
      default: return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        {plans.map((plan) => (
          <Card key={plan.id} className="bg-white shadow-sm border border-border hover:border-secondary/50 transition-colors">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                
                <div className="space-y-1 min-w-[200px]">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-muted-foreground">{plan.id}</span>
                    <Badge variant="outline" className={`${getStatusColor(plan.status)} border`}>
                      {plan.status}
                    </Badge>
                  </div>
                  <h3 className="text-lg font-bold text-foreground">
                    {plan.tenorMonths} Months @ {plan.agreedMarginAnnualPercent}% p.a.
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Started: {new Date(plan.startDate).toLocaleDateString()} • Matures: {new Date(plan.maturityDate).toLocaleDateString()}
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 flex-1">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Gold Sold</p>
                    <p className="font-bold text-foreground">{plan.goldSoldGrams.toFixed(2)} g</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Deferred Base</p>
                    <p className="font-bold text-foreground">${plan.basePriceComponentUsd.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Margin</p>
                    <p className="font-bold text-secondary">${plan.totalMarginComponentUsd.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Received (g)</p>
                    <p className="font-bold text-secondary">{plan.paidMarginGrams.toFixed(3)} g</p>
                  </div>
                </div>

                <div>
                  <Button 
                    variant="outline" 
                    className="border-border hover:bg-muted text-foreground"
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
