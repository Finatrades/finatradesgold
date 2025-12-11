import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { TrendingUp, Info, Briefcase, PlusCircle, BarChart3, Clock, Calendar, Plus } from 'lucide-react';
import { BnslPlan, BnslPlanStatus, BnslMarginPayout } from '@/types/bnsl';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useBnsl } from '@/context/BnslContext'; // Import Context

// Components
import BnslStatsCard from '@/components/bnsl/BnslStatsCard';
import BnslWalletCard from '@/components/bnsl/BnslWalletCard';
import BnslPlanList from '@/components/bnsl/BnslPlanList';
import BnslPlanDetail from '@/components/bnsl/BnslPlanDetail';
import CreateBnslPlan from '@/components/bnsl/CreateBnslPlan';
import { Card, CardContent } from '@/components/ui/card';

import { useLocation } from 'wouter';

export default function BNSL() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { addNotification } = useNotifications();
  const [, setLocation] = useLocation();

  // Use Context
  const { plans, currentGoldPrice, addPlan, updatePayout, updatePlanStatus } = useBnsl();

  // State
  const [activeTab, setActiveTab] = useState('plans');
  const [selectedPlan, setSelectedPlan] = useState<BnslPlan | null>(null);
  
  // Wallet State (Mock)
  const [finaPayGoldBalance, setFinaPayGoldBalance] = useState(500.00); 
  const [bnslWalletBalance, setBnslWalletBalance] = useState(0.00);

  // Aggregated Stats
  const activePlansCount = plans.filter(p => p.status === 'Active').length;
  const totalDeferredBase = plans.reduce((sum, p) => p.status === 'Active' ? sum + p.basePriceComponentUsd : sum, 0);
  
  // Weighted Avg Rate (approx)
  const weightedRate = activePlansCount > 0 
    ? (plans.reduce((sum, p) => p.status === 'Active' ? sum + (p.agreedMarginAnnualPercent * p.basePriceComponentUsd) : sum, 0) / totalDeferredBase)
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
    const payouts: BnslMarginPayout[] = [];
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
      contractId: planId, // Added contractId mapping
      status: 'Active',
      startDate: startDate.toISOString(),
      maturityDate: maturityDate.toISOString(),
      payouts: payouts,
      paidMarginUsd: 0, // Mapped from totalPaidMarginUsd
      paidMarginGrams: 0, // Mapped from totalPaidMarginGrams
      remainingMarginUsd: newPlanData.totalMarginComponentUsd || 0, // Added remainingMarginUsd
      planRiskLevel: 'Low', // Default risk level
      participant: { // Default participant
        id: user?.email || 'U-001',
        name: user?.firstName ? `${user.firstName} ${user.lastName}` : 'Current User',
        country: 'Switzerland',
        kycStatus: 'Approved',
        riskLevel: 'Low'
      },
      agreedMarginAnnualPercent: (newPlanData as any).marginRateAnnualPercent || 8, // Map legacy field name if needed
    };

    addPlan(newPlan); // Use Context
    setActiveTab('plans');
    
    addNotification({
      title: "BNSL Plan Activated",
      message: `Plan ${planId} successfully created. ${newPlanData.goldSoldGrams}g deducted from wallet.`,
      type: 'success'
    });
  };

  const handleSimulatePayout = (payoutId: string, currentPrice: number) => {
     // Use Context to update payout
     if (!selectedPlan) return;
     
     const payout = selectedPlan.payouts.find(p => p.id === payoutId);
     if (!payout) return;

     const gramsCredited = payout.monetaryAmountUsd / currentPrice;

     updatePayout(selectedPlan.id, payoutId, {
        status: 'Paid',
        marketPriceUsdPerGram: currentPrice,
        gramsCredited: gramsCredited
     });
     
     toast({
       title: "Payout Simulated",
       description: "Margin payout marked as paid. Grams credited to wallet (simulated).",
     });
     addNotification({
       title: "Margin Payout Received",
       message: `Quarterly margin payout received for plan.`,
       type: 'success'
     });
  };

  // Sync selectedPlan with plans state from context
  const displayedPlan = selectedPlan ? plans.find(p => p.id === selectedPlan.id) || selectedPlan : null;

  const handleTerminatePlan = (planId: string) => {
    updatePlanStatus(planId, 'Early Termination Requested'); // Or 'Early Terminated' depending on flow
    toast({ title: "Plan Terminated", description: "Plan status set to Early Terminated." });
    addNotification({
      title: "BNSL Plan Terminated",
      message: `Plan ${planId} was terminated early. Penalties may apply.`,
      type: 'warning'
    });
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
        <div className="flex justify-end -mt-4">
            <Button variant="link" size="sm" className="text-muted-foreground hover:text-primary" onClick={() => setLocation('/finapay')}>
                Need more funds? Go to FinaPay Wallet &rarr;
            </Button>
        </div>

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
                      {plans.reduce((sum, p) => p.status !== 'Pending Activation' ? sum + p.goldSoldGrams : sum, 0).toFixed(2)} g
                    </p>
                  </div>
                  <div>
                     <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Margin Received</p>
                     <p className="text-xl font-bold text-secondary">
                       {plans.reduce((sum, p) => sum + p.paidMarginGrams, 0).toFixed(3)} g
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
