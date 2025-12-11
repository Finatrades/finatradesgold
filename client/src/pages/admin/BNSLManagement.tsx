import React, { useState } from 'react';
import AdminLayout from '@/pages/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, AlertTriangle, FileText, CheckCircle, Clock, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

import BnslPlanDetailAdmin from '@/components/bnsl/admin/BnslPlanDetailAdmin';
import { BnslPlan, BnslEarlyTerminationRequest, AuditLogEntry, BnslMarginPayout, BnslPlanStatus, BnslTenor } from '@/types/bnsl';
import { useBnsl } from '@/context/BnslContext';

export default function BNSLManagement() {
  const { plans, auditLogs, currentGoldPrice, updatePlanStatus, addAuditLog, updatePayout, updateEarlyTermination, addPlan } = useBnsl();
  
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  
  // Create Plan State
  const [createOpen, setCreateOpen] = useState(false);
  const [newPlanData, setNewPlanData] = useState({
    participantName: '',
    country: 'Switzerland',
    tenorMonths: '12',
    goldSoldGrams: '',
    enrollmentPrice: currentGoldPrice.toString()
  });

  const selectedPlan = plans.find(p => p.id === selectedPlanId);

  const handleOpenPlan = (id: string) => {
    setSelectedPlanId(id);
    setDetailOpen(true);
  };

  const handleCreatePlan = () => {
    if (!newPlanData.participantName || !newPlanData.goldSoldGrams || !newPlanData.enrollmentPrice) {
      toast.error("Please fill in all fields");
      return;
    }

    const tenor = parseInt(newPlanData.tenorMonths) as BnslTenor;
    const goldGrams = parseFloat(newPlanData.goldSoldGrams);
    const price = parseFloat(newPlanData.enrollmentPrice);
    
    // Rates from prompt: 12m=8%, 24m=10%, 36m=12%
    let rate = 8;
    if (tenor === 24) rate = 10;
    if (tenor === 36) rate = 12;

    const basePriceUsd = goldGrams * price;
    const totalMarginUsd = basePriceUsd * (rate / 100) * (tenor / 12);
    const quarterlyMarginUsd = totalMarginUsd / (tenor / 3); // 4 payouts per year

    const planId = `BNSL-2025-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    const startDate = new Date();
    const maturityDate = new Date();
    maturityDate.setMonth(startDate.getMonth() + tenor);

    // Generate Payouts
    const payouts: BnslMarginPayout[] = [];
    const numPayouts = tenor / 3;
    for(let i=1; i<=numPayouts; i++) {
       const d = new Date(startDate);
       d.setMonth(d.getMonth() + (i * 3));
       payouts.push({
         id: `p-${planId}-${i}`,
         planId: planId,
         sequence: i,
         scheduledDate: d.toISOString(),
         monetaryAmountUsd: quarterlyMarginUsd,
         status: 'Scheduled'
       });
    }

    const newPlan: BnslPlan = {
      id: planId,
      contractId: planId,
      participant: {
        id: `U-${Math.floor(Math.random()*1000)}`,
        name: newPlanData.participantName,
        country: newPlanData.country,
        kycStatus: 'Approved',
        riskLevel: 'Low'
      },
      tenorMonths: tenor,
      agreedMarginAnnualPercent: rate,
      goldSoldGrams: goldGrams,
      enrollmentPriceUsdPerGram: price,
      basePriceComponentUsd: basePriceUsd,
      totalMarginComponentUsd: totalMarginUsd,
      quarterlyMarginUsd: quarterlyMarginUsd,
      totalSaleProceedsUsd: basePriceUsd + totalMarginUsd,
      startDate: startDate.toISOString(),
      maturityDate: maturityDate.toISOString(),
      status: 'Active',
      payouts: payouts,
      paidMarginUsd: 0,
      paidMarginGrams: 0,
      remainingMarginUsd: totalMarginUsd,
      planRiskLevel: 'Low'
    };

    addPlan(newPlan);
    addAuditLog({
      id: crypto.randomUUID(),
      planId: planId,
      actor: 'Admin User',
      actorRole: 'Admin',
      actionType: 'PlanCreated',
      timestamp: new Date().toISOString(),
      details: `Created new ${tenor}-month plan for ${newPlanData.participantName}`
    });

    setCreateOpen(false);
    setNewPlanData({
      participantName: '',
      country: 'Switzerland',
      tenorMonths: '12',
      goldSoldGrams: '',
      enrollmentPrice: currentGoldPrice.toString()
    });
  };

  // KPIs
  const totalBaseLiability = plans.reduce((sum, p) => sum + p.basePriceComponentUsd, 0);
  const totalMarginLiability = plans.reduce((sum, p) => sum + p.totalMarginComponentUsd, 0);
  const activePlans = plans.filter(p => p.status === 'Active').length;
  const terminationRequests = plans.filter(p => p.status === 'Early Termination Requested').length;

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">BNSL Management</h1>
            <p className="text-gray-500">Buy Now Sell Later – Admin Panel & Risk Monitoring</p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="bg-orange-600 hover:bg-orange-700">
            <Plus className="w-4 h-4 mr-2" /> Create New Plan
          </Button>
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
                       {plans.length === 0 ? (
                         <div className="text-center py-8 text-gray-500">No active plans found. Create one to get started.</div>
                       ) : (
                         plans.map((plan) => (
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
                         ))
                       )}
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

        {/* Create Plan Dialog */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
           <DialogContent>
             <DialogHeader>
               <DialogTitle>Create New BNSL Plan</DialogTitle>
               <DialogDescription>Manually enroll a participant into a new BNSL agreement.</DialogDescription>
             </DialogHeader>
             <div className="space-y-4 py-4">
                <div>
                   <Label>Participant Name</Label>
                   <Input 
                      value={newPlanData.participantName} 
                      onChange={(e) => setNewPlanData({...newPlanData, participantName: e.target.value})} 
                      placeholder="e.g. John Doe Corp"
                   />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <Label>Country</Label>
                      <Input 
                        value={newPlanData.country} 
                        onChange={(e) => setNewPlanData({...newPlanData, country: e.target.value})} 
                      />
                   </div>
                   <div>
                      <Label>Tenor</Label>
                      <Select value={newPlanData.tenorMonths} onValueChange={(v) => setNewPlanData({...newPlanData, tenorMonths: v})}>
                         <SelectTrigger>
                            <SelectValue />
                         </SelectTrigger>
                         <SelectContent>
                            <SelectItem value="12">12 Months (8%)</SelectItem>
                            <SelectItem value="24">24 Months (10%)</SelectItem>
                            <SelectItem value="36">36 Months (12%)</SelectItem>
                         </SelectContent>
                      </Select>
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <Label>Gold To Sell (g)</Label>
                      <Input 
                        type="number"
                        value={newPlanData.goldSoldGrams} 
                        onChange={(e) => setNewPlanData({...newPlanData, goldSoldGrams: e.target.value})} 
                        placeholder="1000"
                      />
                   </div>
                   <div>
                      <Label>Enrollment Price (USD/g)</Label>
                      <Input 
                        type="number"
                        value={newPlanData.enrollmentPrice} 
                        onChange={(e) => setNewPlanData({...newPlanData, enrollmentPrice: e.target.value})} 
                      />
                   </div>
                </div>
             </div>
             <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button className="bg-orange-600 hover:bg-orange-700" onClick={handleCreatePlan}>Create Plan</Button>
             </DialogFooter>
           </DialogContent>
        </Dialog>

        {/* Detail Modal */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-[95vw] w-[1200px] h-[90vh] p-0 overflow-hidden">
             {selectedPlan ? (
               <BnslPlanDetailAdmin 
                 plan={selectedPlan}
                 auditLogs={auditLogs.filter(l => l.planId === selectedPlan.id)}
                 currentMarketPrice={currentGoldPrice}
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
