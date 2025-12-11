import React, { createContext, useContext, useState, ReactNode } from 'react';
import { BnslPlan, BnslPlanStatus, BnslMarginPayout, BnslEarlyTerminationRequest, AuditLogEntry } from '@/types/bnsl';
import { toast } from 'sonner';

// Mock Data
const MOCK_PLANS: BnslPlan[] = [
  {
    id: '1',
    contractId: 'BNSL-2025-0012',
    participant: { id: 'P1', name: 'Alice Freeman', country: 'Switzerland', kycStatus: 'Approved', riskLevel: 'Low' },
    tenorMonths: 12,
    agreedMarginAnnualPercent: 8,
    goldSoldGrams: 100,
    enrollmentPriceUsdPerGram: 70.00,
    basePriceComponentUsd: 7000,
    totalMarginComponentUsd: 560, // 7000 * 0.08 * 1
    quarterlyMarginUsd: 140,
    totalSaleProceedsUsd: 7560,
    startDate: '2025-01-01T00:00:00Z',
    maturityDate: '2026-01-01T00:00:00Z',
    status: 'Active',
    planRiskLevel: 'Low',
    paidMarginUsd: 140,
    paidMarginGrams: 1.85,
    remainingMarginUsd: 420,
    payouts: [
      { id: 'PAY-1', planId: '1', sequence: 1, scheduledDate: '2025-04-01T00:00:00Z', monetaryAmountUsd: 140, status: 'Paid', marketPriceUsdPerGram: 75.60, gramsCredited: 1.8518, paidAt: '2025-04-01T10:00:00Z' },
      { id: 'PAY-2', planId: '1', sequence: 2, scheduledDate: '2025-07-01T00:00:00Z', monetaryAmountUsd: 140, status: 'Scheduled' },
      { id: 'PAY-3', planId: '1', sequence: 3, scheduledDate: '2025-10-01T00:00:00Z', monetaryAmountUsd: 140, status: 'Scheduled' },
      { id: 'PAY-4', planId: '1', sequence: 4, scheduledDate: '2026-01-01T00:00:00Z', monetaryAmountUsd: 140, status: 'Scheduled' },
    ]
  },
  {
    id: '2',
    contractId: 'BNSL-2025-0015',
    participant: { id: 'P2', name: 'Bob Smith', country: 'UK', kycStatus: 'Approved', riskLevel: 'Medium' },
    tenorMonths: 24,
    agreedMarginAnnualPercent: 10,
    goldSoldGrams: 500,
    enrollmentPriceUsdPerGram: 72.00,
    basePriceComponentUsd: 36000,
    totalMarginComponentUsd: 7200, // 36000 * 0.10 * 2
    quarterlyMarginUsd: 900,
    totalSaleProceedsUsd: 43200,
    startDate: '2025-02-01T00:00:00Z',
    maturityDate: '2027-02-01T00:00:00Z',
    status: 'Early Termination Requested',
    planRiskLevel: 'Medium',
    paidMarginUsd: 0,
    paidMarginGrams: 0,
    remainingMarginUsd: 7200,
    earlyTermination: {
      id: 'REQ-1',
      planId: '2',
      requestedAt: '2025-03-10T14:00:00Z',
      reason: 'Need liquidity for real estate purchase',
      currentMarketPriceUsdPerGram: 75.50,
      adminFeePercent: 2.0,
      penaltyPercent: 5.0,
      totalDisbursedMarginUsd: 0,
      basePriceComponentValueUsd: 36000, // Market price > Enrollment, so Face Value
      totalSaleProceedsUsd: 43200,
      totalDeductionsUsd: 3024, // (43200 * 0.07)
      netValueUsd: 32976,
      finalGoldGrams: 436.7682,
      status: 'Requested'
    },
    payouts: Array.from({ length: 8 }).map((_, i) => ({
      id: `PAY-2-${i}`, planId: '2', sequence: i+1, scheduledDate: new Date(2025, 4 + (i*3), 1).toISOString(), monetaryAmountUsd: 900, status: 'Scheduled'
    })) as BnslMarginPayout[]
  }
];

const MOCK_AUDIT: AuditLogEntry[] = [
  { id: 'LOG-1', planId: '1', actor: 'System', actorRole: 'System', actionType: 'PlanActivated', timestamp: '2025-01-01T00:00:00Z', details: 'Plan active' },
  { id: 'LOG-2', planId: '1', actor: 'Alice Admin', actorRole: 'Ops', actionType: 'PayoutPaid', timestamp: '2025-04-01T10:00:00Z', details: 'Processed Q1 payout' },
  { id: 'LOG-3', planId: '2', actor: 'Bob Smith', actorRole: 'User', actionType: 'EarlyTerminationRequested', timestamp: '2025-03-10T14:00:00Z', details: 'User requested early termination' },
];

interface BnslContextType {
  plans: BnslPlan[];
  auditLogs: AuditLogEntry[];
  currentGoldPrice: number;
  setCurrentGoldPrice: (price: number) => void;
  addPlan: (plan: BnslPlan) => void;
  updatePlanStatus: (id: string, newStatus: BnslPlanStatus) => void;
  addAuditLog: (entry: AuditLogEntry) => void;
  updatePayout: (planId: string, payoutId: string, updates: Partial<BnslMarginPayout>) => void;
  updateEarlyTermination: (planId: string, request: BnslEarlyTerminationRequest) => void;
}

const BnslContext = createContext<BnslContextType | undefined>(undefined);

export function BnslProvider({ children }: { children: ReactNode }) {
  const [plans, setPlans] = useState<BnslPlan[]>(MOCK_PLANS);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(MOCK_AUDIT);
  const [currentGoldPrice, setCurrentGoldPrice] = useState(75.50);

  const addPlan = (plan: BnslPlan) => {
    setPlans(prev => [plan, ...prev]);
    toast.success(`Plan ${plan.contractId} created successfully`);
  };

  const updatePlanStatus = (id: string, newStatus: BnslPlanStatus) => {
    setPlans(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
  };

  const addAuditLog = (entry: AuditLogEntry) => {
    setAuditLogs(prev => [entry, ...prev]);
  };

  const updatePayout = (planId: string, payoutId: string, updates: Partial<BnslMarginPayout>) => {
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
  };

  const updateEarlyTermination = (planId: string, request: BnslEarlyTerminationRequest) => {
    setPlans(prev => prev.map(p => p.id === planId ? { ...p, earlyTermination: request } : p));
  };

  return (
    <BnslContext.Provider value={{
      plans,
      auditLogs,
      currentGoldPrice,
      setCurrentGoldPrice,
      addPlan,
      updatePlanStatus,
      addAuditLog,
      updatePayout,
      updateEarlyTermination
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
