import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useCMSPage } from '@/context/CMSContext';
import { useNotifications } from '@/context/NotificationContext';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { TrendingUp, Info, Briefcase, PlusCircle, BarChart3, Clock, Calendar, Plus, Loader2, Coins, FileText, Eye, Download, CheckCircle } from 'lucide-react';
import { BnslPlan, BnslPlanStatus, BnslMarginPayout } from '@/types/bnsl';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useBnsl } from '@/context/BnslContext';
import { generateBnslAgreement } from '@/utils/generateBnslPdf';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

// Components - import early for use in SignedAgreementsSection
import BnslStatsCard from '@/components/bnsl/BnslStatsCard';
import BnslWalletCard from '@/components/bnsl/BnslWalletCard';
import BnslPlanList from '@/components/bnsl/BnslPlanList';
import BnslPlanDetail from '@/components/bnsl/BnslPlanDetail';
import CreateBnslPlan, { FULL_TERMS_AND_CONDITIONS } from '@/components/bnsl/CreateBnslPlan';
import { Card, CardContent } from '@/components/ui/card';

// Signed Agreements Section Component
function SignedAgreementsSection({ userId, plans }: { userId?: number; plans: BnslPlan[] }) {
  const [agreements, setAgreements] = useState<any[]>([]);
  const [selectedAgreement, setSelectedAgreement] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    
    async function fetchAgreements() {
      try {
        const response = await fetch(`/api/bnsl/agreements/user/${userId}`);
        if (response.ok) {
          const data = await response.json();
          setAgreements(data.agreements || []);
        }
      } catch (error) {
        console.error('Failed to fetch agreements:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchAgreements();
  }, [userId]);

  const activePlansWithAgreements = plans.filter(p => 
    p.status === 'Active' || p.status === 'Matured' || p.status === 'Early Terminated'
  );

  const getAgreementForPlan = (planId: number) => {
    return agreements.find(a => a.planId === planId);
  };

  const handleDownloadPdf = async (plan: BnslPlan, agreement: any) => {
    try {
      const pdfBlob = await generateBnslAgreement({
        planId: plan.id,
        goldGrams: plan.goldSoldGrams,
        lockInMonths: plan.lockInMonths,
        lockedPrice: plan.lockedPricePerGram,
        marginRate: plan.marginRate,
        startDate: new Date(plan.startDate),
        maturityDate: new Date(plan.maturityDate),
        totalSaleValue: plan.totalSaleValueUsd,
        baseComponent: plan.basePriceComponentUsd,
        marginComponent: plan.totalMarginComponentUsd,
        userName: agreement?.signerName || 'User',
        signedDate: agreement?.signedAt ? new Date(agreement.signedAt) : new Date()
      });
      
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BNSL-Agreement-Plan-${plan.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-white shadow-sm border border-border">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white shadow-sm border border-border">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground">Your Signed Agreements</h3>
            <p className="text-sm text-muted-foreground">View and download your BNSL plan agreements</p>
          </div>
        </div>

        {activePlansWithAgreements.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">No signed agreements yet</p>
            <p className="text-sm text-muted-foreground mt-1">Create a BNSL plan to generate your first agreement</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activePlansWithAgreements.map(plan => {
              const agreement = getAgreementForPlan(plan.id);
              return (
                <div 
                  key={plan.id}
                  className="border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-success-muted flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-success" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground">
                          Plan #{plan.id} - {plan.goldSoldGrams.toFixed(2)}g Gold
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {plan.lockInMonths} months | {plan.marginRate}% margin | 
                          Signed: {agreement?.signedAt 
                            ? new Date(agreement.signedAt).toLocaleDateString() 
                            : new Date(plan.startDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedAgreement({ plan, agreement })}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                          <DialogHeader>
                            <DialogTitle>BNSL Agreement - Plan #{plan.id}</DialogTitle>
                          </DialogHeader>
                          <div className="flex-1 overflow-y-auto">
                            <div className="bg-muted/30 rounded-lg border border-border p-4 mb-4">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Gold Sold:</span>
                                  <span className="ml-2 font-semibold">{plan.goldSoldGrams.toFixed(4)} g</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Lock-in Period:</span>
                                  <span className="ml-2 font-semibold">{plan.lockInMonths} months</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Margin Rate:</span>
                                  <span className="ml-2 font-semibold">{plan.marginRate}%</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Locked Price:</span>
                                  <span className="ml-2 font-semibold">${plan.lockedPricePerGram.toFixed(2)}/g</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Start Date:</span>
                                  <span className="ml-2 font-semibold">{new Date(plan.startDate).toLocaleDateString()}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Maturity Date:</span>
                                  <span className="ml-2 font-semibold">{new Date(plan.maturityDate).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>
                            
                            {agreement?.signerName && (
                              <div className="bg-success-muted/50 rounded-lg border border-success/20 p-4 mb-4">
                                <p className="text-sm font-medium text-success-muted-foreground">
                                  Signed by: <span className="font-bold">{agreement.signerName}</span>
                                </p>
                                <p className="text-xs text-success-muted-foreground mt-1">
                                  Date: {new Date(agreement.signedAt).toLocaleString()} | Version: {agreement.termsVersion || 'V3-2025-12-09'}
                                </p>
                              </div>
                            )}

                            <div className="bg-muted/30 rounded-lg border border-border p-6 max-h-[50vh] overflow-y-auto">
                              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
                                {agreement?.termsAndConditions || FULL_TERMS_AND_CONDITIONS}
                              </pre>
                            </div>
                          </div>
                          <div className="pt-4 border-t border-border">
                            <Button onClick={() => handleDownloadPdf(plan, agreement)}>
                              <Download className="w-4 h-4 mr-2" />
                              Download PDF
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDownloadPdf(plan, agreement)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Master Agreement Reference:</strong> Version V3-2025-12-09 | 
            All agreements are governed by the terms accepted at the time of plan creation.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper: Calculate daily margin for a plan
function calculateDailyMargin(plan: BnslPlan): number {
  if (plan.status !== 'Active') return 0;
  const startDate = new Date(plan.startDate);
  const maturityDate = new Date(plan.maturityDate);
  const totalDays = Math.max(1, Math.ceil((maturityDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
  return plan.totalMarginComponentUsd / totalDays;
}

// Helper: Calculate accrued margin to date
function calculateAccruedMargin(plan: BnslPlan): number {
  if (plan.status !== 'Active') return 0;
  const startDate = new Date(plan.startDate);
  const today = new Date();
  const daysSinceStart = Math.max(0, Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
  const dailyMargin = calculateDailyMargin(plan);
  return Math.min(dailyMargin * daysSinceStart, plan.totalMarginComponentUsd);
}

import { useLocation, useSearch } from 'wouter';

export default function BNSL() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { getContent } = useCMSPage('bnsl');
  const { addNotification } = useNotifications();
  const [, setLocation] = useLocation();
  const searchString = useSearch();

  // Use Context with real data
  const { plans, currentGoldPrice, addPlan, updatePayout, updatePlanStatus, refreshPlans, isLoading } = useBnsl();
  
  useEffect(() => {
    refreshPlans();
  }, [refreshPlans]);

  // Check URL for step parameter to auto-navigate to create tab
  const urlParams = new URLSearchParams(searchString);
  const stepParam = urlParams.get('step');
  
  // State - default to 'create' tab if step=configure is in URL
  const [activeTab, setActiveTab] = useState(stepParam === 'configure' ? 'create' : 'plans');
  const [highlightCreate, setHighlightCreate] = useState(false);
  
  // Auto-scroll and highlight create section when coming from dashboard with step=configure
  useEffect(() => {
    if (stepParam === 'configure') {
      // Small delay to ensure the tab content is rendered
      setTimeout(() => {
        const createSection = document.getElementById('bnsl-create-section');
        if (createSection) {
          createSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          // Highlight effect
          setHighlightCreate(true);
          setTimeout(() => setHighlightCreate(false), 1500);
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 100);
    }
  }, [stepParam]);
  const [selectedPlan, setSelectedPlan] = useState<BnslPlan | null>(null);
  
  // Real Wallet State from API
  const [finaPayGoldBalance, setFinaPayGoldBalance] = useState(0);
  const [bnslWalletBalance, setBnslWalletBalance] = useState(0);
  const [lockedBnslBalance, setLockedBnslBalance] = useState(0);

  // Fetch wallet balances
  const fetchWallets = async () => {
    if (!user?.id) return;
    try {
      const { apiRequest } = await import('@/lib/queryClient');
      
      // Fetch FinaPay wallet
      const finapayRes = await apiRequest('GET', `/api/wallet/${user.id}`);
      const finapayData = await finapayRes.json();
      if (finapayData.wallet) {
        setFinaPayGoldBalance(parseFloat(finapayData.wallet.goldGrams || '0'));
      }
      
      // Fetch BNSL wallet
      const bnslRes = await apiRequest('GET', `/api/bnsl/wallet/${user.id}`);
      const bnslData = await bnslRes.json();
      if (bnslData.wallet) {
        setBnslWalletBalance(parseFloat(bnslData.wallet.availableGoldGrams || '0'));
        setLockedBnslBalance(parseFloat(bnslData.wallet.lockedGoldGrams || '0'));
      }
    } catch (err) {
      console.error('Failed to fetch wallets:', err);
    }
  };

  useEffect(() => {
    fetchWallets();
  }, [user?.id]);

  // Aggregated Stats
  const activePlansCount = plans.filter(p => p.status === 'Active').length;
  const totalDeferredBase = plans.reduce((sum, p) => p.status === 'Active' ? sum + p.basePriceComponentUsd : sum, 0);
  
  // Weighted Avg Rate (approx)
  const weightedRate = activePlansCount > 0 
    ? (plans.reduce((sum, p) => p.status === 'Active' ? sum + (p.agreedMarginAnnualPercent * p.basePriceComponentUsd) : sum, 0) / totalDeferredBase)
    : 0;
  
  // Use real locked balance from BNSL wallet, fallback to calculated from plans
  const totalLockedGold = lockedBnslBalance > 0 ? lockedBnslBalance : plans.reduce((sum, p) => p.status === 'Active' ? sum + p.goldSoldGrams : sum, 0);

  // Daily margin calculations
  const totalDailyMargin = plans.reduce((sum, p) => sum + calculateDailyMargin(p), 0);
  const totalAccruedMargin = plans.reduce((sum, p) => sum + calculateAccruedMargin(p), 0);
  const totalPaidMargin = plans.reduce((sum, p) => sum + p.paidMarginUsd, 0);
  const unpaidAccruedMargin = Math.max(0, totalAccruedMargin - totalPaidMargin);

  // Daily margin notification - show once when user loads BNSL page with active plans
  const [hasShownDailyNotification, setHasShownDailyNotification] = useState(false);
  useEffect(() => {
    if (!hasShownDailyNotification && activePlansCount > 0 && totalDailyMargin > 0) {
      addNotification({
        title: "Daily Margin Update",
        message: `You're earning $${totalDailyMargin.toFixed(2)} in margin today across ${activePlansCount} active plan${activePlansCount > 1 ? 's' : ''}. Payouts are made quarterly.`,
        type: 'info'
      });
      setHasShownDailyNotification(true);
    }
  }, [activePlansCount, totalDailyMargin, hasShownDailyNotification, addNotification]);

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
  const handleTransferFromFinaPay = async (amount: number): Promise<boolean> => {
    if (!user?.id) return false;
    try {
      const { apiRequest } = await import('@/lib/queryClient');
      const res = await apiRequest('POST', '/api/bnsl/wallet/transfer', {
        userId: user.id,
        goldGrams: amount.toFixed(6)
      });
      const data = await res.json();
      
      if (data.success) {
        await fetchWallets();
        toast({
          title: "Transfer Successful",
          description: `Transferred ${amount.toFixed(3)}g from FinaPay to BNSL wallet.`
        });
        return true;
      } else {
        throw new Error(data.message || 'Transfer failed');
      }
    } catch (err) {
      toast({
        title: "Transfer Failed",
        description: err instanceof Error ? err.message : "Could not complete transfer",
        variant: "destructive"
      });
      return false;
    }
  };

  const handleWithdrawToFinaPay = async (amount: number): Promise<boolean> => {
    if (!user?.id) return false;
    try {
      const { apiRequest } = await import('@/lib/queryClient');
      const res = await apiRequest('POST', '/api/bnsl/wallet/withdraw', {
        userId: user.id,
        goldGrams: amount.toFixed(6)
      });
      const data = await res.json();
      
      if (data.success) {
        await fetchWallets();
        toast({
          title: "Withdrawal Successful",
          description: `Withdrawn ${amount.toFixed(3)}g from BNSL wallet to FinaPay.`
        });
        return true;
      } else {
        throw new Error(data.message || 'Withdrawal failed');
      }
    } catch (err) {
      toast({
        title: "Withdrawal Failed",
        description: err instanceof Error ? err.message : "Could not complete withdrawal",
        variant: "destructive"
      });
      return false;
    }
  };

  const handleCreatePlan = async (newPlanData: Partial<BnslPlan>, signatureData?: { signatureName: string; signedAt: string }) => {
    const startDate = new Date();
    const maturityDate = new Date();
    const tenorMonths = newPlanData.tenorMonths || 12;
    maturityDate.setMonth(startDate.getMonth() + tenorMonths);
    
    // Get rate based on tenor
    let rate = 8;
    if (tenorMonths === 24) rate = 10;
    if (tenorMonths === 36) rate = 12;
    
    const goldSoldGrams = newPlanData.goldSoldGrams || 0;
    const enrollmentPriceUsdPerGram = currentGoldPrice;
    const basePriceComponentUsd = goldSoldGrams * enrollmentPriceUsdPerGram;
    const totalMarginComponentUsd = basePriceComponentUsd * (rate / 100) * (tenorMonths / 12);
    const quarterlyMarginUsd = totalMarginComponentUsd / (tenorMonths / 3);
    const totalSaleProceedsUsd = basePriceComponentUsd + totalMarginComponentUsd;

    const planDataForApi: Omit<BnslPlan, 'id' | 'contractId' | 'payouts'> = {
      participant: {
        id: user?.id || '',
        name: user?.firstName ? `${user.firstName} ${user.lastName}` : 'User',
        country: 'Switzerland',
        kycStatus: 'Approved',
        riskLevel: 'Low'
      },
      tenorMonths: tenorMonths as 12 | 24 | 36,
      agreedMarginAnnualPercent: rate,
      goldSoldGrams,
      enrollmentPriceUsdPerGram,
      basePriceComponentUsd,
      totalMarginComponentUsd,
      quarterlyMarginUsd,
      totalSaleProceedsUsd,
      startDate: startDate.toISOString(),
      maturityDate: maturityDate.toISOString(),
      status: 'Active',
      paidMarginUsd: 0,
      paidMarginGrams: 0,
      remainingMarginUsd: totalMarginComponentUsd,
      planRiskLevel: 'Low'
    };

    const createdPlan = await addPlan(planDataForApi);
    
    if (createdPlan) {
      // Store agreement with signature if provided
      if (signatureData) {
        try {
          const { apiRequest } = await import('@/lib/queryClient');
          const agreementRes = await apiRequest('POST', '/api/bnsl/agreements', {
            planId: createdPlan.id,
            userId: user?.id,
            templateVersion: 'V3-2025-12-09',
            signatureName: signatureData.signatureName,
            signedAt: signatureData.signedAt,
            termsAndConditions: FULL_TERMS_AND_CONDITIONS,
            planDetails: {
              tenorMonths,
              goldSoldGrams,
              enrollmentPriceUsdPerGram,
              basePriceComponentUsd,
              totalMarginComponentUsd,
              quarterlyMarginUsd,
              totalSaleProceedsUsd,
              marginRate: rate,
              startDate: startDate.toISOString(),
              maturityDate: maturityDate.toISOString(),
            }
          });
          const agreementData = await agreementRes.json();
          
          // Generate PDF with signature and send email
          if (agreementData.agreement) {
            const planForPdf = {
              id: createdPlan.id,
              tenorMonths: tenorMonths as 12 | 24 | 36,
              goldSoldGrams,
              enrollmentPriceUsdPerGram,
              basePriceComponentUsd,
              totalMarginComponentUsd,
              quarterlyMarginUsd,
              marginRateAnnualPercent: rate / 100,
            };
            
            const userForPdf = {
              name: user?.firstName ? `${user.firstName} ${user.lastName}` : 'User',
              email: user?.email || 'N/A',
            };
            
            // Generate signed PDF
            const doc = generateBnslAgreement(planForPdf, userForPdf, signatureData);
            const pdfBase64 = doc.output('datauristring').split(',')[1];
            
            // Send email with PDF attachment
            try {
              await apiRequest('POST', `/api/bnsl/agreements/${agreementData.agreement.id}/send-email`, {
                pdfBase64
              });
              toast({
                title: "Agreement Email Sent",
                description: "A copy of your signed agreement has been sent to your email.",
              });
            } catch (emailErr) {
              console.error('Failed to send agreement email:', emailErr);
            }
          }
        } catch (err) {
          console.error('Failed to save agreement:', err);
        }
      }
      
      setActiveTab('plans');
      // Refresh wallet balances after locking gold
      await fetchWallets();
      addNotification({
        title: "BNSL Plan Activated",
        message: `Plan ${createdPlan.contractId} successfully created. ${goldSoldGrams}g locked for ${tenorMonths} months.`,
        type: 'success'
      });
    }
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
               <h1 className="text-2xl font-bold text-foreground" data-testid="text-bnsl-title">{getContent('hero', 'title', 'BNSL – Buy Now Sell Later')}</h1>
               <p className="text-muted-foreground text-sm">Deferred price gold sale with quarterly margin payouts.</p>
             </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Button 
              className="bg-primary text-white hover:bg-primary/90 shadow-sm hidden md:flex items-center gap-2"
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
          onWithdrawToFinaPay={handleWithdrawToFinaPay}
          currentGoldPrice={currentGoldPrice}
        />
        <div className="flex justify-end -mt-4">
            <Button variant="link" size="sm" className="text-muted-foreground hover:text-primary" onClick={() => setLocation('/finapay')}>
                Need more funds? Go to FinaPay Wallet &rarr;
            </Button>
        </div>

        {/* SUMMARY STRIP */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
        </div>

        {/* DAILY MARGIN STRIP */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
           <BnslStatsCard 
             label="Today's Margin Accrual" 
             value={`$${totalDailyMargin.toFixed(2)}`} 
             subValue="Earning daily, paid quarterly"
             icon={Coins} 
             accentColor="text-fuchsia-600"
             tooltip="Amount of margin accruing today across all active plans."
           />
           <BnslStatsCard 
             label="Total Accrued (Unpaid)" 
             value={`$${unpaidAccruedMargin.toFixed(2)}`} 
             subValue="Pending next quarterly payout"
             icon={TrendingUp} 
             accentColor="text-purple-600"
             tooltip="Total margin earned but not yet paid out."
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
            <TabsList className="bg-muted border border-border p-1.5 mb-8 w-full md:w-auto flex">
              <TabsTrigger value="plans" className="flex-1 md:flex-none font-semibold text-foreground data-[state=active]:bg-primary data-[state=active]:text-white px-4 py-2">
                <Briefcase className="w-4 h-4 mr-2" /> My BNSL Plans
              </TabsTrigger>
              <TabsTrigger value="create" className="flex-1 md:flex-none font-semibold text-foreground data-[state=active]:bg-primary data-[state=active]:text-white px-4 py-2">
                <PlusCircle className="w-4 h-4 mr-2" /> Start New Plan
              </TabsTrigger>
              <TabsTrigger value="terms" className="flex-1 md:flex-none font-semibold text-foreground data-[state=active]:bg-primary data-[state=active]:text-white px-4 py-2">
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
                     <p className="text-xl font-bold text-primary">
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

            <TabsContent value="create" id="bnsl-create-section" className={`mt-0 animate-in fade-in slide-in-from-bottom-2 transition-all duration-500 ${highlightCreate ? 'ring-2 ring-primary ring-offset-2 rounded-lg bg-purple-50' : ''}`}>
               <CreateBnslPlan 
                 bnslWalletBalance={bnslWalletBalance} 
                 currentGoldPrice={currentGoldPrice}
                 onSuccess={handleCreatePlan}
               />
            </TabsContent>

            <TabsContent value="terms" className="mt-0 animate-in fade-in slide-in-from-bottom-2">
               <SignedAgreementsSection userId={user?.id} plans={plans} />
            </TabsContent>
          </Tabs>
        )}

      </div>
    </DashboardLayout>
  );
}
