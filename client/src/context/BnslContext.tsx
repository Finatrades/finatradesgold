import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { BnslPlan, BnslPlanStatus, BnslMarginPayout, BnslEarlyTerminationRequest, AuditLogEntry } from '@/types/bnsl';
import { toast } from 'sonner';
import { useAuth } from './AuthContext';
import { apiRequest } from '@/lib/queryClient';

interface BnslContextType {
  plans: BnslPlan[];
  allPlans: BnslPlan[];
  auditLogs: AuditLogEntry[];
  currentGoldPrice: number;
  isLoading: boolean;
  error: string | null;
  setCurrentGoldPrice: (price: number) => void;
  addPlan: (plan: Omit<BnslPlan, 'id' | 'contractId' | 'payouts'>) => Promise<BnslPlan | null>;
  updatePlanStatus: (id: string, newStatus: BnslPlanStatus) => Promise<void>;
  addAuditLog: (entry: AuditLogEntry) => void;
  updatePayout: (planId: string, payoutId: string, updates: Partial<BnslMarginPayout>) => Promise<void>;
  updateEarlyTermination: (planId: string, request: BnslEarlyTerminationRequest) => Promise<void>;
  refreshPlans: () => Promise<void>;
  refreshAllPlans: () => Promise<void>;
}

const BnslContext = createContext<BnslContextType | undefined>(undefined);

function transformDbPlanToFrontend(dbPlan: any, payouts: any[] = [], earlyTermination?: any, user?: any): BnslPlan {
  const tenorMonths = parseInt(dbPlan.tenorMonths) as 12 | 24 | 36;
  const goldSoldGrams = parseFloat(dbPlan.goldSoldGrams || '0');
  const enrollmentPriceUsdPerGram = parseFloat(dbPlan.enrollmentPriceUsdPerGram || '0');
  const basePriceComponentUsd = parseFloat(dbPlan.basePriceComponentUsd || '0');
  const totalMarginComponentUsd = parseFloat(dbPlan.totalMarginComponentUsd || '0');
  const quarterlyMarginUsd = parseFloat(dbPlan.quarterlyMarginUsd || '0');
  const totalSaleProceedsUsd = parseFloat(dbPlan.totalSaleProceedsUsd || '0');
  const paidMarginUsd = parseFloat(dbPlan.paidMarginUsd || '0');
  const paidMarginGrams = parseFloat(dbPlan.paidMarginGrams || '0');
  const agreedMarginAnnualPercent = parseFloat(dbPlan.agreedMarginAnnualPercent || '0');

  const transformedPayouts: BnslMarginPayout[] = payouts.map(p => ({
    id: p.id,
    planId: p.planId,
    sequence: p.sequence,
    scheduledDate: p.scheduledDate,
    monetaryAmountUsd: parseFloat(p.monetaryAmountUsd || '0'),
    marketPriceUsdPerGram: p.marketPriceUsdPerGram ? parseFloat(p.marketPriceUsdPerGram) : undefined,
    gramsCredited: p.gramsCredited ? parseFloat(p.gramsCredited) : undefined,
    status: p.status,
    paidAt: p.paidAt
  }));

  let transformedEarlyTermination: BnslEarlyTerminationRequest | undefined;
  if (earlyTermination) {
    transformedEarlyTermination = {
      id: earlyTermination.id,
      planId: earlyTermination.planId,
      requestedAt: earlyTermination.requestedAt,
      reason: earlyTermination.reason,
      currentMarketPriceUsdPerGram: parseFloat(earlyTermination.currentMarketPriceUsdPerGram || '0'),
      adminFeePercent: parseFloat(earlyTermination.adminFeePercent || '0'),
      penaltyPercent: parseFloat(earlyTermination.penaltyPercent || '0'),
      totalDisbursedMarginUsd: parseFloat(earlyTermination.totalDisbursedMarginUsd || '0'),
      basePriceComponentValueUsd: parseFloat(earlyTermination.basePriceComponentValueUsd || '0'),
      totalSaleProceedsUsd: parseFloat(earlyTermination.totalSaleProceedsUsd || '0'),
      totalDeductionsUsd: parseFloat(earlyTermination.totalDeductionsUsd || '0'),
      netValueUsd: parseFloat(earlyTermination.netValueUsd || '0'),
      finalGoldGrams: parseFloat(earlyTermination.finalGoldGrams || '0'),
      status: earlyTermination.status,
      decidedBy: earlyTermination.decidedBy,
      decidedAt: earlyTermination.decidedAt,
      decisionNotes: earlyTermination.decisionNotes
    };
  }

  return {
    id: dbPlan.id,
    contractId: dbPlan.contractId,
    participant: {
      id: user?.id || dbPlan.userId,
      name: user ? `${user.firstName} ${user.lastName}` : 'Unknown User',
      country: user?.country || 'Unknown',
      kycStatus: user?.kycStatus || 'Not Started',
      riskLevel: 'Low'
    },
    tenorMonths,
    agreedMarginAnnualPercent,
    goldSoldGrams,
    enrollmentPriceUsdPerGram,
    basePriceComponentUsd,
    totalMarginComponentUsd,
    quarterlyMarginUsd,
    totalSaleProceedsUsd,
    startDate: dbPlan.startDate,
    maturityDate: dbPlan.maturityDate,
    status: dbPlan.status as BnslPlanStatus,
    planRiskLevel: 'Low',
    paidMarginUsd,
    paidMarginGrams,
    remainingMarginUsd: totalMarginComponentUsd - paidMarginUsd,
    payouts: transformedPayouts,
    earlyTermination: transformedEarlyTermination
  };
}

export function BnslProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [plans, setPlans] = useState<BnslPlan[]>([]);
  const [allPlans, setAllPlans] = useState<BnslPlan[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [currentGoldPrice, setCurrentGoldPrice] = useState(71.55);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshPlans = useCallback(async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiRequest('GET', `/api/bnsl/plans/${user.id}`);
      const data = await response.json();
      
      if (data.plans) {
        const transformedPlans = await Promise.all(data.plans.map(async (plan: any) => {
          let payouts: any[] = [];
          let earlyTermination: any = undefined;
          
          try {
            const payoutsRes = await apiRequest('GET', `/api/bnsl/payouts/${plan.id}`);
            const payoutsData = await payoutsRes.json();
            payouts = payoutsData.payouts || [];
          } catch (e) {
            console.error('Failed to fetch payouts for plan', plan.id);
          }
          
          return transformDbPlanToFrontend(plan, payouts, earlyTermination, user);
        }));
        
        setPlans(transformedPlans);
      }
    } catch (err) {
      console.error('Failed to fetch BNSL plans:', err);
      setError('Failed to load BNSL plans');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const refreshAllPlans = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiRequest('GET', '/api/admin/bnsl/plans');
      const data = await response.json();
      
      if (data.plans) {
        const transformedPlans = await Promise.all(data.plans.map(async (plan: any) => {
          let payouts: any[] = [];
          
          try {
            const payoutsRes = await apiRequest('GET', `/api/bnsl/payouts/${plan.id}`);
            const payoutsData = await payoutsRes.json();
            payouts = payoutsData.payouts || [];
          } catch (e) {
            console.error('Failed to fetch payouts for plan', plan.id);
          }
          
          let planUser = plan.user;
          if (!planUser) {
            try {
              const userRes = await apiRequest('GET', `/api/users/${plan.userId}`);
              planUser = await userRes.json();
            } catch (e) {
              console.error('Failed to fetch user for plan', plan.id);
            }
          }
          
          return transformDbPlanToFrontend(plan, payouts, undefined, planUser);
        }));
        
        setAllPlans(transformedPlans);
      }
    } catch (err) {
      console.error('Failed to fetch all BNSL plans:', err);
      setError('Failed to load BNSL plans');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.id) {
      refreshPlans();
    }
  }, [user?.id, refreshPlans]);

  const addPlan = async (planData: Omit<BnslPlan, 'id' | 'contractId' | 'payouts'>): Promise<BnslPlan | null> => {
    // Use participant.id if available (admin creating for other user), otherwise use current user
    const targetUserId = planData.participant?.id || user?.id;
    const isAdminCreating = planData.participant?.id && planData.participant.id !== user?.id;
    
    if (!targetUserId) {
      toast.error('Please login to create a plan');
      return null;
    }

    try {
      const response = await apiRequest('POST', '/api/bnsl/plans', {
        userId: targetUserId,
        tenorMonths: planData.tenorMonths,
        agreedMarginAnnualPercent: planData.agreedMarginAnnualPercent.toString(),
        goldSoldGrams: planData.goldSoldGrams.toString(),
        enrollmentPriceUsdPerGram: planData.enrollmentPriceUsdPerGram.toString(),
        basePriceComponentUsd: planData.basePriceComponentUsd.toString(),
        totalMarginComponentUsd: planData.totalMarginComponentUsd.toString(),
        quarterlyMarginUsd: planData.quarterlyMarginUsd.toString(),
        totalSaleProceedsUsd: planData.totalSaleProceedsUsd.toString(),
        startDate: planData.startDate,
        maturityDate: planData.maturityDate,
        status: planData.status
      });
      
      const data = await response.json();
      
      if (data.plan) {
        toast.success(`Plan ${data.plan.contractId} created successfully`);
        
        // Refresh the appropriate dataset based on who created the plan
        if (isAdminCreating) {
          await refreshAllPlans();
        } else {
          await refreshPlans();
        }
        
        return transformDbPlanToFrontend(data.plan, [], undefined, planData.participant || user);
      }
      return null;
    } catch (err) {
      console.error('Failed to create BNSL plan:', err);
      toast.error('Failed to create plan');
      return null;
    }
  };

  const updatePlanStatus = async (id: string, newStatus: BnslPlanStatus) => {
    try {
      await apiRequest('PATCH', `/api/bnsl/plans/${id}`, { status: newStatus });
      
      setPlans(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
      setAllPlans(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
      
      toast.success('Plan status updated');
    } catch (err) {
      console.error('Failed to update plan status:', err);
      toast.error('Failed to update plan status');
    }
  };

  const addAuditLog = (entry: AuditLogEntry) => {
    setAuditLogs(prev => [entry, ...prev]);
  };

  const updatePayout = async (planId: string, payoutId: string, updates: Partial<BnslMarginPayout>) => {
    try {
      await apiRequest('PATCH', `/api/bnsl/payouts/${payoutId}`, updates);
      
      setPlans(prev => prev.map(p => {
        if (p.id !== planId) return p;
        const updatedPayouts = p.payouts.map(pay => pay.id === payoutId ? { ...pay, ...updates } : pay);
        
        let newPaidUsd = p.paidMarginUsd;
        let newPaidGrams = p.paidMarginGrams;
        let newRemainingUsd = p.remainingMarginUsd;

        if (updates.status === 'Paid' && updates.monetaryAmountUsd && updates.gramsCredited) {
          const paidPayouts = updatedPayouts.filter(x => x.status === 'Paid');
          newPaidUsd = paidPayouts.reduce((sum, x) => sum + x.monetaryAmountUsd, 0);
          newPaidGrams = paidPayouts.reduce((sum, x) => sum + (x.gramsCredited || 0), 0);
          newRemainingUsd = p.totalMarginComponentUsd - newPaidUsd;
        }

        return { ...p, payouts: updatedPayouts, paidMarginUsd: newPaidUsd, paidMarginGrams: newPaidGrams, remainingMarginUsd: newRemainingUsd };
      }));
      
      toast.success('Payout updated');
    } catch (err) {
      console.error('Failed to update payout:', err);
      toast.error('Failed to update payout');
    }
  };

  const updateEarlyTermination = async (planId: string, request: BnslEarlyTerminationRequest) => {
    try {
      const { planId: _planId, ...requestData } = request;
      await apiRequest('POST', '/api/bnsl/early-termination', {
        planId,
        ...requestData
      });
      
      setPlans(prev => prev.map(p => p.id === planId ? { ...p, earlyTermination: request } : p));
      setAllPlans(prev => prev.map(p => p.id === planId ? { ...p, earlyTermination: request } : p));
      
      toast.success('Early termination request submitted');
    } catch (err) {
      console.error('Failed to submit early termination:', err);
      toast.error('Failed to submit early termination request');
    }
  };

  return (
    <BnslContext.Provider value={{
      plans,
      allPlans,
      auditLogs,
      currentGoldPrice,
      isLoading,
      error,
      setCurrentGoldPrice,
      addPlan,
      updatePlanStatus,
      addAuditLog,
      updatePayout,
      updateEarlyTermination,
      refreshPlans,
      refreshAllPlans
    }}>
      {children}
    </BnslContext.Provider>
  );
}

export function useBnsl() {
  const context = useContext(BnslContext);
  if (context === undefined) {
    throw new Error('useBnsl must be used within a BnslProvider');
  }
  return context;
}
