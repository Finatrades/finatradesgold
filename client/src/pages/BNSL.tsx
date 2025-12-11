import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { TrendingUp, Info, Briefcase, PlusCircle, BarChart3, Clock, Calendar, Plus } from 'lucide-react';
import { BnslPlan, BnslPlanStatus, BnslPayout } from '@/types/bnsl';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

// Components
import BnslStatsCard from '@/components/bnsl/BnslStatsCard';
import BnslWalletCard from '@/components/bnsl/BnslWalletCard';
import BnslPlanList from '@/components/bnsl/BnslPlanList';
import BnslPlanDetail from '@/components/bnsl/BnslPlanDetail';
import CreateBnslPlan from '@/components/bnsl/CreateBnslPlan';
import { Card, CardContent } from '@/components/ui/card';

// Mock Data
const MOCK_PLANS: BnslPlan[] = [
  {
    id: 'BNSL-2024-001',
    tenorMonths: 12,
    marginRateAnnualPercent: 0.08,
    goldSoldGrams: 100,
    enrollmentPriceUsdPerGram: 80.50,
    basePriceComponentUsd: 8050,
    totalMarginComponentUsd: 644, // 8050 * 0.08 * 1
    quarterlyMarginUsd: 161, // 644 / 4
    startDate: '2024-01-15T10:00:00Z',
    maturityDate: '2025-01-15T10:00:00Z',
    status: 'Active',
    totalPaidMarginUsd: 483, // 3 payouts done
    totalPaidMarginGrams: 5.85, // approx
    earlyTerminationAllowed: true,
    payouts: [
      { id: 'p1', planId: 'BNSL-2024-001', sequence: 1, scheduledDate: '2024-04-15', monetaryAmountUsd: 161, marketPriceUsdPerGramAtPayout: 82.00, gramsCredited: 1.9634, status: 'Paid' },
      { id: 'p2', planId: 'BNSL-2024-001', sequence: 2, scheduledDate: '2024-07-15', monetaryAmountUsd: 161, marketPriceUsdPerGramAtPayout: 83.50, gramsCredited: 1.9281, status: 'Paid' },
      { id: 'p3', planId: 'BNSL-2024-001', sequence: 3, scheduledDate: '2024-10-15', monetaryAmountUsd: 161, marketPriceUsdPerGramAtPayout: 82.10, gramsCredited: 1.9610, status: 'Paid' },
      { id: 'p4', planId: 'BNSL-2024-001', sequence: 4, scheduledDate: '2025-01-15', monetaryAmountUsd: 161, status: 'Scheduled' },
    ]
  }
];

export default function BNSL() {
  const { user } = useAuth();
  const { toast } = useToast();

  // State
  const [activeTab, setActiveTab] = useState('plans');
  const [plans, setPlans] = useState<BnslPlan[]>(MOCK_PLANS);
  const [selectedPlan, setSelectedPlan] = useState<BnslPlan | null>(null);
  
  // Wallet State
  const [finaPayGoldBalance, setFinaPayGoldBalance] = useState(500.00); 
  const [bnslWalletBalance, setBnslWalletBalance] = useState(0.00);
  const [currentGoldPrice, setCurrentGoldPrice] = useState(85.22); // Mock spot

  // Aggregated Stats
  const activePlansCount = plans.filter(p => p.status === 'Active').length;
  const totalDeferredBase = plans.reduce((sum, p) => p.status === 'Active' ? sum + p.basePriceComponentUsd : sum, 0);
  
  // Weighted Avg Rate (approx)
  const weightedRate = activePlansCount > 0 
    ? (plans.reduce((sum, p) => p.status === 'Active' ? sum + (p.marginRateAnnualPercent * p.basePriceComponentUsd) : sum, 0) / totalDeferredBase) * 100
    : 0;
  
  // Calculate total locked gold in BNSL (Active plans)
  const totalLockedGold = plans.reduce((sum, p) => p.status === 'Active' ? sum + p.goldSoldGrams : sum, 0);

  // Next Payout Finder
  const getNextPayout = (): { date: string; amount: number; planId: string } | null => {
    let next: { date: string; amount: number; planId: string } | null = null;
    plans.forEach(plan => {
      if (plan.status !== 'Active') return;
      const upcoming = plan.payouts.find(p => p.status === 'Scheduled');
      if (upcoming) {
        if (!next || new Date(upcoming.scheduledDate) < new Date(next.date)) {
           next = { date: upcoming.scheduledDate, amount: upcoming.monetaryAmountUsd, planId: plan.id };
        }
      }
    });
    return next;
  };
  const nextPayout = getNextPayout();

  // Actions
  const handleTransferFromFinaPay = (amount: number) => {
    setFinaPayGoldBalance(prev => prev - amount);
    setBnslWalletBalance(prev => prev + amount);
  };

  const handleCreatePlan = (newPlanData: Partial<BnslPlan>) => {
    // 1. Deduct Gold from BNSL Wallet
    if (newPlanData.goldSoldGrams) {
      setBnslWalletBalance(prev => prev - newPlanData.goldSoldGrams!);
    }

    // 2. Create Plan Object
    const planId = `BNSL-2025-${Math.floor(Math.random() * 1000).toString().padStart(4, '0')}`;
    const startDate = new Date();
    const maturityDate = new Date();
    maturityDate.setMonth(startDate.getMonth() + (newPlanData.tenorMonths || 12));

    // Generate Payouts
    const payouts: BnslPayout[] = [];
    const numPayouts = (newPlanData.tenorMonths || 12) / 3;
    for(let i=1; i<=numPayouts; i++) {
       const d = new Date(startDate);
       d.setMonth(d.getMonth() + (i * 3));
       payouts.push({
         id: `p-${planId}-${i}`,
         planId: planId,
         sequence: i,
         scheduledDate: d.toISOString(),
         monetaryAmountUsd: newPlanData.quarterlyMarginUsd || 0,
         status: 'Scheduled'
       });
    }

    const newPlan: BnslPlan = {
      ...newPlanData as BnslPlan,
      id: planId,
      status: 'Active',
      startDate: startDate.toISOString(),
      maturityDate: maturityDate.toISOString(),
      payouts: payouts,
      totalPaidMarginUsd: 0,
      totalPaidMarginGrams: 0,
      earlyTerminationAllowed: true
    };

    setPlans(prev => [newPlan, ...prev]);
    setActiveTab('plans');
    toast({
      title: "BNSL Plan Started",
      description: `Plan ${planId} activated. Gold deducted from BNSL Wallet.`,
    });
  };

  const handleSimulatePayout = (payoutId: string, currentPrice: number) => {
     setPlans(prev => prev.map(plan => {
       const payoutIndex = plan.payouts.findIndex(p => p.id === payoutId);
       if (payoutIndex === -1) return plan;

       const updatedPayouts = [...plan.payouts];
       const payout = updatedPayouts[payoutIndex];
       
       const gramsCredited = payout.monetaryAmountUsd / currentPrice;
       
       updatedPayouts[payoutIndex] = {
         ...payout,
         status: 'Paid',
         marketPriceUsdPerGramAtPayout: currentPrice,
         gramsCredited: gramsCredited
       };

       // Update Plan Totals
       return {
         ...plan,
         payouts: updatedPayouts,
         totalPaidMarginUsd: plan.totalPaidMarginUsd + payout.monetaryAmountUsd,
         totalPaidMarginGrams: plan.totalPaidMarginGrams + gramsCredited
       };
     }));

     // Conceptually credit FinaPay (though margin goes to FinaPay wallet)
     // In a real app, this would be a backend tx.
     // Here we just update the local plan state for display.
     
     toast({
       title: "Payout Simulated",
       description: "Margin payout marked as paid. Grams credited to wallet (simulated).",
     });
     
     // Update selected plan view if open
     if (selectedPlan) {
        // Need to find the updated plan to set selected
        // We do this via useEffect or just by finding it again, 
        // but since setPlans is async, we'll just let the list re-render logic handle it if we passed the ID.
        // For now, simpler to just close detail or rely on finding it again.
        // Actually, let's just update selectedPlan locally for immediate feedback if we can find it.
     }
  };

  // Sync selectedPlan with plans state
  const displayedPlan = selectedPlan ? plans.find(p => p.id === selectedPlan.id) || selectedPlan : null;

  const handleTerminatePlan = (planId: string) => {
    setPlans(prev => prev.map(p => p.id === planId ? { ...p, status: 'Early Terminated' as BnslPlanStatus } : p));
    toast({ title: "Plan Terminated", description: "Plan status set to Early Terminated." });
  };

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8 pb-12">
        
        {/* TOP BAR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-secondary/10 rounded-lg border border-secondary/20 text-secondary">
                <TrendingUp className="w-6 h-6" />
             </div>
             <div>
               <h1 className="text-2xl font-bold text-foreground">BNSL – Buy Now Sell Later</h1>
               <p className="text-muted-foreground text-sm">Deferred price gold sale with quarterly margin payouts.</p>
             </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Button 
              className="bg-secondary text-white hover:bg-secondary/90 shadow-sm hidden md:flex items-center gap-2"
              onClick={() => setActiveTab('create')}
            >
              <Plus className="w-4 h-4" /> Start New Plan
            </Button>

            <div className="hidden md:block text-right border-l border-border pl-4">
               <p className="text-xs text-muted-foreground uppercase tracking-wider">Seller</p>
               <p className="text-foreground font-bold">You</p>
            </div>
            <div className="hidden md:block text-right border-l border-border pl-4">
               <p className="text-xs text-muted-foreground uppercase tracking-wider">Gold Spot</p>
               <p className="text-secondary font-bold font-mono">${currentGoldPrice.toFixed(2)} <span className="text-xs text-muted-foreground">/g</span></p>
            </div>
            <div className="p-2 bg-muted rounded-full hover:bg-muted/80 cursor-pointer">
               <Info className="w-5 h-5 text-muted-foreground" />
            </div>
          </div>
        </div>

        {/* WALLET STRIP */}
        <BnslWalletCard 
          bnslBalanceGold={bnslWalletBalance}
          lockedBalanceGold={totalLockedGold}
          finaPayBalanceGold={finaPayGoldBalance}
          onTransferFromFinaPay={handleTransferFromFinaPay}
          currentGoldPrice={currentGoldPrice}
        />

        {/* SUMMARY STRIP */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
           <BnslStatsCard 
             label="Active Plans" 
             value={activePlansCount.toString()} 
             icon={Briefcase} 
             accentColor="text-blue-600"
           />
           <BnslStatsCard 
             label="Deferred Base Value" 
             value={`$${totalDeferredBase.toLocaleString()}`} 
             icon={BarChart3} 
             accentColor="text-foreground"
             tooltip="Total Base Price Component you are entitled to at maturity."
           />
           <BnslStatsCard 
             label="Avg. Margin Rate" 
             value={`${weightedRate.toFixed(2)}% p.a.`} 
             icon={TrendingUp} 
             accentColor="text-secondary"
           />
           <BnslStatsCard 
             label="Next Payout" 
             value={nextPayout ? `$${nextPayout.amount.toLocaleString()}` : 'None'} 
             subValue={nextPayout ? new Date(nextPayout.date).toLocaleDateString() : ''}
             icon={Calendar} 
             accentColor="text-green-600"
           />
        </div>

        {/* MAIN CONTENT */}
        {displayedPlan ? (
           <BnslPlanDetail 
             plan={displayedPlan} 
             onBack={() => setSelectedPlan(null)}
             onSimulatePayout={handleSimulatePayout}
             onTerminate={handleTerminatePlan}
             currentGoldPrice={currentGoldPrice}
           />
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-muted border border-border p-1 mb-8 w-full md:w-auto flex">
              <TabsTrigger value="plans" className="flex-1 md:flex-none data-[state=active]:bg-secondary data-[state=active]:text-white">
                <Briefcase className="w-4 h-4 mr-2" /> My BNSL Plans
              </TabsTrigger>
              <TabsTrigger value="create" className="flex-1 md:flex-none data-[state=active]:bg-secondary data-[state=active]:text-white">
                <PlusCircle className="w-4 h-4 mr-2" /> Start New Plan
              </TabsTrigger>
              <TabsTrigger value="terms" className="flex-1 md:flex-none data-[state=active]:bg-secondary data-[state=active]:text-white">
                <Info className="w-4 h-4 mr-2" /> Terms & Info
              </TabsTrigger>
            </TabsList>

            <TabsContent value="plans" className="mt-0 animate-in fade-in slide-in-from-bottom-2">
               <BnslPlanList 
                 plans={plans} 
                 onViewPlan={(plan) => setSelectedPlan(plan)}
               />
               
               {/* Mini Summary Footer */}
               <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-white shadow-sm rounded-xl border border-border">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Gold Sold</p>
                    <p className="text-xl font-bold text-foreground">
                      {plans.reduce((sum, p) => p.status !== 'Pending Acceptance' ? sum + p.goldSoldGrams : sum, 0).toFixed(2)} g
                    </p>
                  </div>
                  <div>
                     <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Margin Received</p>
                     <p className="text-xl font-bold text-secondary">
                       {plans.reduce((sum, p) => sum + p.totalPaidMarginGrams, 0).toFixed(3)} g
                     </p>
                  </div>
                  <div>
                     <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Deferred Base</p>
                     <p className="text-xl font-bold text-foreground">
                       ${totalDeferredBase.toLocaleString()}
                     </p>
                  </div>
               </div>
            </TabsContent>

            <TabsContent value="create" className="mt-0 animate-in fade-in slide-in-from-bottom-2">
               <CreateBnslPlan 
                 bnslWalletBalance={bnslWalletBalance} 
                 currentGoldPrice={currentGoldPrice}
                 onSuccess={handleCreatePlan}
               />
            </TabsContent>

            <TabsContent value="terms" className="mt-0 animate-in fade-in slide-in-from-bottom-2">
               <Card className="bg-white shadow-sm border border-border">
                 <CardContent className="p-12 text-center text-muted-foreground">
                    <Info className="w-16 h-16 mx-auto mb-4 opacity-20 text-foreground" />
                    <h3 className="text-lg font-bold text-foreground mb-2">BNSL Master Agreement</h3>
                    <p className="max-w-md mx-auto">
                      Full terms and conditions of the Buy Now Sell Later program, including risk disclosures, legal title transfer details, and dispute resolution mechanisms.
                    </p>
                 </CardContent>
               </Card>
            </TabsContent>
          </Tabs>
        )}

      </div>
    </DashboardLayout>
  );
}
