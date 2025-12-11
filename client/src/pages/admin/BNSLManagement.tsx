import React, { useState } from 'react';
import AdminLayout from '@/pages/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, AlertTriangle, FileText, CheckCircle, Clock } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import BnslPlanDetailAdmin from '@/components/bnsl/admin/BnslPlanDetailAdmin';
import { BnslPlan, BnslEarlyTerminationRequest, AuditLogEntry, BnslMarginPayout, BnslPlanStatus } from '@/types/bnsl';
import { Progress } from '@/components/ui/progress';

// --- MOCK DATA ---
const CURRENT_MARKET_PRICE = 75.50; // USD per gram

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

export default function BNSLManagement() {
  const [plans, setPlans] = useState<BnslPlan[]>(MOCK_PLANS);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(MOCK_AUDIT);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const selectedPlan = plans.find(p => p.id === selectedPlanId);

  const handleOpenPlan = (id: string) => {
    setSelectedPlanId(id);
    setDetailOpen(true);
  };

  const updatePlanStatus = (id: string, newStatus: BnslPlanStatus) => {
    setPlans(plans.map(p => p.id === id ? { ...p, status: newStatus } : p));
  };

  const addAuditLog = (entry: AuditLogEntry) => {
    setAuditLogs([entry, ...auditLogs]);
  };

  const updatePayout = (planId: string, payoutId: string, updates: Partial<BnslMarginPayout>) => {
    setPlans(plans.map(p => {
      if (p.id !== planId) return p;
      const updatedPayouts = p.payouts.map(pay => pay.id === payoutId ? { ...pay, ...updates } : pay);
      
      // Update totals if paid
      let newPaidUsd = p.paidMarginUsd;
      let newPaidGrams = p.paidMarginGrams;
      let newRemainingUsd = p.remainingMarginUsd;

      if (updates.status === 'Paid' && updates.monetaryAmountUsd && updates.gramsCredited) {
         // This logic assumes we are marking it paid for the first time
         // In a real app, handle re-processing or un-marking carefully
         // For mock, we'll just increment
         // Actually, better to re-calculate from all paid payouts
         const paidPayouts = updatedPayouts.filter(x => x.status === 'Paid');
         newPaidUsd = paidPayouts.reduce((sum, x) => sum + x.monetaryAmountUsd, 0);
         newPaidGrams = paidPayouts.reduce((sum, x) => sum + (x.gramsCredited || 0), 0);
         newRemainingUsd = p.totalMarginComponentUsd - newPaidUsd;
      }

      return { ...p, payouts: updatedPayouts, paidMarginUsd: newPaidUsd, paidMarginGrams: newPaidGrams, remainingMarginUsd: newRemainingUsd };
    }));
  };

  const updateEarlyTermination = (planId: string, request: BnslEarlyTerminationRequest) => {
    setPlans(plans.map(p => p.id === planId ? { ...p, earlyTermination: request } : p));
  };

  // KPIs
  const totalBaseLiability = plans.reduce((sum, p) => sum + p.basePriceComponentUsd, 0);
  const totalMarginLiability = plans.reduce((sum, p) => sum + p.totalMarginComponentUsd, 0);
  const activePlans = plans.filter(p => p.status === 'Active').length;
  const terminationRequests = plans.filter(p => p.status === 'Early Termination Requested').length;

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">BNSL Management</h1>
          <p className="text-gray-500">Buy Now Sell Later – Admin Panel & Risk Monitoring</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
           <Card className="bg-blue-50 border-blue-100">
             <CardContent className="p-6">
               <div className="flex items-center gap-4">
                 <div className="p-3 bg-blue-100 text-blue-700 rounded-lg">
                   <TrendingUp className="w-6 h-6" />
                 </div>
                 <div>
                   <p className="text-sm font-medium text-blue-900">Active Plans</p>
                   <h3 className="text-2xl font-bold text-blue-700">{activePlans}</h3>
                 </div>
               </div>
             </CardContent>
           </Card>

           <Card className="bg-amber-50 border-amber-100">
             <CardContent className="p-6">
               <div className="flex items-center gap-4">
                 <div className="p-3 bg-amber-100 text-amber-700 rounded-lg">
                   <FileText className="w-6 h-6" />
                 </div>
                 <div>
                   <p className="text-sm font-medium text-amber-900">Base Liability</p>
                   <h3 className="text-2xl font-bold text-amber-700">${totalBaseLiability.toLocaleString()}</h3>
                 </div>
               </div>
             </CardContent>
           </Card>

           <Card className="bg-green-50 border-green-100">
             <CardContent className="p-6">
               <div className="flex items-center gap-4">
                 <div className="p-3 bg-green-100 text-green-700 rounded-lg">
                   <TrendingUp className="w-6 h-6" />
                 </div>
                 <div>
                   <p className="text-sm font-medium text-green-900">Margin Liability</p>
                   <h3 className="text-2xl font-bold text-green-700">${totalMarginLiability.toLocaleString()}</h3>
                 </div>
               </div>
             </CardContent>
           </Card>

           <Card className="bg-red-50 border-red-100">
             <CardContent className="p-6">
               <div className="flex items-center gap-4">
                 <div className="p-3 bg-red-100 text-red-700 rounded-lg">
                   <AlertTriangle className="w-6 h-6" />
                 </div>
                 <div>
                   <p className="text-sm font-medium text-red-900">Term. Requests</p>
                   <h3 className="text-2xl font-bold text-red-700">{terminationRequests}</h3>
                 </div>
               </div>
             </CardContent>
           </Card>
        </div>

        <Tabs defaultValue="plans" className="w-full">
           <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent space-x-6">
             <TabsTrigger value="plans" className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 py-3 px-1">
               All Plans
             </TabsTrigger>
             <TabsTrigger value="risk" className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 py-3 px-1">
               Risk & Exposure
             </TabsTrigger>
             <TabsTrigger value="audit" className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 py-3 px-1">
               Global Audit Log
             </TabsTrigger>
           </TabsList>

           <div className="mt-6">
             <TabsContent value="plans">
                <Card>
                  <CardHeader>
                    <CardTitle>BNSL Plans</CardTitle>
                    <CardDescription>Manage active plans, payouts, and terminations.</CardDescription>
                  </CardHeader>
                  <CardContent>
                     <div className="space-y-4">
                       {plans.map((plan) => (
                         <div key={plan.id} onClick={() => handleOpenPlan(plan.id)} className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-gray-100 rounded-lg bg-white hover:bg-gray-50 transition-colors cursor-pointer group">
                             <div className="flex items-center gap-4 mb-4 md:mb-0">
                               <div className={`p-2 rounded border ${plan.status === 'Active' ? 'bg-green-50 border-green-100 text-green-600' : 'bg-gray-50 border-gray-100 text-gray-600'}`}>
                                   <FileText className="w-6 h-6" />
                               </div>
                               <div>
                                   <div className="flex items-center gap-2">
                                     <h4 className="font-bold text-gray-900 group-hover:text-orange-600 transition-colors">{plan.contractId}</h4>
                                     <Badge variant="outline" className="text-xs">{plan.status}</Badge>
                                     {plan.earlyTermination?.status === 'Requested' && <Badge variant="destructive" className="text-xs animate-pulse">Termination Requested</Badge>}
                                   </div>
                                   <p className="text-sm text-gray-600">
                                     {plan.participant.name} • {plan.tenorMonths} Months @ {plan.agreedMarginAnnualPercent}%
                                   </p>
                                   <p className="text-xs text-gray-500 mt-1">
                                      Gold Sold: {plan.goldSoldGrams}g • Base: ${plan.basePriceComponentUsd.toLocaleString()}
                                   </p>
                               </div>
                             </div>
                             <div className="flex gap-2">
                               <Button variant="outline" size="sm">
                                 View Plan
                               </Button>
                             </div>
                         </div>
                       ))}
                     </div>
                  </CardContent>
                </Card>
             </TabsContent>
             
             {/* Other tabs placeholders */}
             <TabsContent value="risk">
                <Card>
                  <CardContent className="p-8 text-center text-gray-500">
                    Risk dashboard implementation coming next.
                  </CardContent>
                </Card>
             </TabsContent>

             <TabsContent value="audit">
               <Card>
                 <CardHeader>
                   <CardTitle>Global Audit Log</CardTitle>
                 </CardHeader>
                 <CardContent>
                    <div className="space-y-0">
                       {auditLogs.map((log) => (
                         <div key={log.id} className="flex gap-4 p-3 border-b last:border-0 hover:bg-gray-50">
                            <div className="text-xs text-gray-500 w-32 shrink-0">
                               {new Date(log.timestamp).toLocaleString()}
                            </div>
                            <div>
                               <p className="font-medium text-sm text-gray-900">
                                 <span className="font-bold">{log.actor}</span> ({log.actorRole}) - {log.actionType}
                               </p>
                               <p className="text-sm text-gray-600">{log.details}</p>
                            </div>
                         </div>
                       ))}
                    </div>
                 </CardContent>
               </Card>
             </TabsContent>
           </div>
        </Tabs>

        {/* Detail Modal */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-[95vw] w-[1200px] h-[90vh] p-0 overflow-hidden">
             {selectedPlan ? (
               <BnslPlanDetailAdmin 
                 plan={selectedPlan}
                 auditLogs={auditLogs.filter(l => l.planId === selectedPlan.id)}
                 currentMarketPrice={CURRENT_MARKET_PRICE}
                 onClose={() => setDetailOpen(false)}
                 onUpdatePlanStatus={updatePlanStatus}
                 onAddAuditLog={addAuditLog}
                 onUpdatePayout={updatePayout}
                 onUpdateEarlyTermination={updateEarlyTermination}
               />
             ) : (
               <div className="p-10 text-center">Loading...</div>
             )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
