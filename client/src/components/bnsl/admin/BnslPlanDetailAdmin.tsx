import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, AlertTriangle, FileText, TrendingUp, DollarSign, Calendar, Loader2 } from 'lucide-react';
import { BnslPlan, BnslEarlyTerminationRequest, AuditLogEntry, BnslMarginPayout } from '@/types/bnsl';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface BnslPlanDetailAdminProps {
  plan: BnslPlan;
  auditLogs: AuditLogEntry[];
  currentMarketPrice: number;
  onClose: () => void;
  onUpdatePlanStatus: (id: string, newStatus: any) => void;
  onAddAuditLog: (entry: AuditLogEntry) => void;
  onUpdatePayout: (planId: string, payoutId: string, updates: Partial<BnslMarginPayout>) => void;
  onUpdateEarlyTermination: (planId: string, request: BnslEarlyTerminationRequest) => void;
}

export default function BnslPlanDetailAdmin({ 
  plan, 
  auditLogs, 
  currentMarketPrice,
  onClose,
  onUpdatePlanStatus,
  onAddAuditLog,
  onUpdatePayout,
  onUpdateEarlyTermination
}: BnslPlanDetailAdminProps) {
  const [payoutToProcess, setPayoutToProcess] = useState<BnslMarginPayout | null>(null);
  const [payoutPrice, setPayoutPrice] = useState(currentMarketPrice.toString());
  
  const [showSimulateDialog, setShowSimulateDialog] = useState(false);
  const [simulationPrice, setSimulationPrice] = useState(currentMarketPrice.toString());
  
  // Early Termination Simulation Logic
  const calculateEarlyTermination = (marketPrice: number) => {
    // Logic from prompt
    const basePriceComponentValueUsd = marketPrice < plan.enrollmentPriceUsdPerGram 
      ? plan.goldSoldGrams * marketPrice 
      : plan.basePriceComponentUsd;
      
    const totalSaleProceedsUsd = plan.basePriceComponentUsd + plan.totalMarginComponentUsd;
    
    // Using mock fixed percentages for demo if not in existing request
    const adminFeePercent = plan.earlyTermination?.adminFeePercent || 2.0; 
    const penaltyPercent = plan.earlyTermination?.penaltyPercent || 5.0;
    
    const adminFeeUsd = totalSaleProceedsUsd * (adminFeePercent / 100);
    const earlyPenaltyUsd = totalSaleProceedsUsd * (penaltyPercent / 100);
    const reimburseMarginUsd = plan.paidMarginUsd; // Reimburse all paid margin
    
    const totalDeductionsUsd = adminFeeUsd + earlyPenaltyUsd + reimburseMarginUsd;
    const netValueUsd = basePriceComponentValueUsd - totalDeductionsUsd;
    const finalGoldGrams = netValueUsd / marketPrice;
    
    return {
      basePriceComponentValueUsd,
      totalSaleProceedsUsd,
      adminFeePercent,
      penaltyPercent,
      adminFeeUsd,
      earlyPenaltyUsd,
      reimburseMarginUsd,
      totalDeductionsUsd,
      netValueUsd,
      finalGoldGrams
    };
  };

  const simulation = calculateEarlyTermination(parseFloat(simulationPrice) || currentMarketPrice);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
  const [isCompletingMaturity, setIsCompletingMaturity] = useState(false);

  const handleProcessPayout = async () => {
    if (!payoutToProcess) return;
    
    const price = parseFloat(payoutPrice);
    if (isNaN(price) || price <= 0) {
      toast.error("Invalid market price");
      return;
    }

    setIsProcessing(true);
    try {
      const { apiRequest } = await import('@/lib/queryClient');
      const res = await apiRequest('POST', `/api/admin/bnsl/payouts/${payoutToProcess.id}/process`, {
        marketPriceUsdPerGram: price
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success(data.message || "Payout processed and gold credited to user's wallet");
        setPayoutToProcess(null);
        // Trigger refresh via parent callback
        onUpdatePayout(plan.id, payoutToProcess.id, {
          status: 'Paid',
          marketPriceUsdPerGram: price,
          gramsCredited: data.gramsCredited,
          paidAt: new Date().toISOString()
        });
      } else {
        toast.error(data.message || "Failed to process payout");
      }
    } catch (error) {
      console.error('Payout processing error:', error);
      toast.error("Failed to process payout");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCompleteMaturity = async () => {
    const price = currentMarketPrice;
    if (price <= 0) {
      toast.error("Invalid market price");
      return;
    }

    setIsCompletingMaturity(true);
    try {
      const { apiRequest } = await import('@/lib/queryClient');
      const res = await apiRequest('POST', `/api/admin/bnsl/plans/${plan.id}/complete-maturity`, {
        marketPriceUsdPerGram: price
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success(data.message || "Plan completed and gold credited to user's wallet");
        onUpdatePlanStatus(plan.id, 'Completed');
      } else {
        toast.error(data.message || "Failed to complete maturity");
      }
    } catch (error) {
      console.error('Maturity completion error:', error);
      toast.error("Failed to complete maturity");
    } finally {
      setIsCompletingMaturity(false);
    }
  };

  const handleSettleTermination = async () => {
    if (!plan.earlyTermination) return;
    
    const price = currentMarketPrice;
    if (price <= 0) {
      toast.error("Invalid market price");
      return;
    }

    setIsSettling(true);
    try {
      const { apiRequest } = await import('@/lib/queryClient');
      const res = await apiRequest('POST', `/api/admin/bnsl/early-termination/${plan.id}/settle`, {
        marketPriceUsdPerGram: price
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success(data.message || "Early termination settled and gold credited");
        onUpdatePlanStatus(plan.id, 'Early Terminated');
      } else {
        toast.error(data.message || "Failed to settle termination");
      }
    } catch (error) {
      console.error('Settlement error:', error);
      toast.error("Failed to settle early termination");
    } finally {
      setIsSettling(false);
    }
  };

  const handleCreateSimulation = () => {
    // Create a new Early Termination Request in "Requested" state (simulated)
    const newRequest: BnslEarlyTerminationRequest = {
      id: crypto.randomUUID(),
      planId: plan.id,
      requestedAt: new Date().toISOString(),
      reason: "Admin initiated simulation",
      currentMarketPriceUsdPerGram: parseFloat(simulationPrice),
      adminFeePercent: simulation.adminFeePercent,
      penaltyPercent: simulation.penaltyPercent,
      totalDisbursedMarginUsd: plan.paidMarginUsd,
      basePriceComponentValueUsd: simulation.basePriceComponentValueUsd,
      totalSaleProceedsUsd: simulation.totalSaleProceedsUsd,
      totalDeductionsUsd: simulation.totalDeductionsUsd,
      netValueUsd: simulation.netValueUsd,
      finalGoldGrams: simulation.finalGoldGrams,
      status: 'Requested'
    };
    
    onUpdateEarlyTermination(plan.id, newRequest);
    onUpdatePlanStatus(plan.id, 'Early Termination Requested');
    setShowSimulateDialog(false);
    toast.success("Early Termination Simulation Created");
  };

  const handleApproveTermination = () => {
    if (!plan.earlyTermination) return;
    
    const updatedRequest = { ...plan.earlyTermination, status: 'Approved' as const, decidedBy: 'Admin User', decidedAt: new Date().toISOString() };
    onUpdateEarlyTermination(plan.id, updatedRequest);
    onUpdatePlanStatus(plan.id, 'Early Terminated');
    
    onAddAuditLog({
      id: crypto.randomUUID(),
      planId: plan.id,
      actor: 'Admin User',
      actorRole: 'Admin',
      actionType: 'EarlyTerminationApproved',
      timestamp: new Date().toISOString(),
      details: `Early termination approved. Final settlement: ${plan.earlyTermination.finalGoldGrams.toFixed(4)}g Gold.`
    });
    
    toast.success("Early Termination Approved");
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-xl overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b bg-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-gray-900">{plan.contractId}</h2>
            <Badge variant="outline" className="bg-white">{plan.status}</Badge>
            <Badge className={
              plan.planRiskLevel === 'Critical' ? 'bg-red-600' :
              plan.planRiskLevel === 'High' ? 'bg-purple-600' :
              plan.planRiskLevel === 'Medium' ? 'bg-yellow-600' : 'bg-green-600'
            }>
              {plan.planRiskLevel} Risk
            </Badge>
          </div>
          <p className="text-gray-500 mt-1">{plan.participant.name} • {plan.participant.country}</p>
        </div>
        
        <div className="flex gap-2">
           <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="payouts">Payout Schedule</TabsTrigger>
            <TabsTrigger value="termination">Early Termination</TabsTrigger>
            <TabsTrigger value="audit">Audit Log</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Contract Structure */}
              <Card>
                <CardHeader>
                  <CardTitle>Contract Structure</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                   <div>
                     <h4 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider">Original Sale</h4>
                     <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                        <div>
                          <p className="text-xs text-gray-500">Gold Sold</p>
                          <p className="font-bold">{plan.goldSoldGrams}g</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Enrollment Price</p>
                          <p className="font-bold">${plan.enrollmentPriceUsdPerGram}/g</p>
                        </div>
                        <div className="col-span-2 border-t pt-2 mt-1">
                          <p className="text-xs text-gray-500">Base Price Component (Deferred)</p>
                          <p className="text-xl font-bold text-blue-700">${plan.basePriceComponentUsd.toLocaleString()}</p>
                        </div>
                     </div>
                   </div>
                   
                   <div>
                     <h4 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider">Margin Component</h4>
                     <div className="grid grid-cols-2 gap-4 bg-purple-50 p-4 rounded-lg">
                        <div>
                          <p className="text-xs text-fuchsia-800">Annual Rate</p>
                          <p className="font-bold text-fuchsia-900">{plan.agreedMarginAnnualPercent}% p.a.</p>
                        </div>
                        <div>
                          <p className="text-xs text-fuchsia-800">Tenor</p>
                          <p className="font-bold text-fuchsia-900">{plan.tenorMonths} Months</p>
                        </div>
                        <div className="col-span-2 border-t border-purple-200 pt-2 mt-1">
                          <p className="text-xs text-fuchsia-800">Total Margin Component</p>
                          <p className="text-xl font-bold text-fuchsia-700">${plan.totalMarginComponentUsd.toLocaleString()}</p>
                        </div>
                     </div>
                   </div>

                   <div className="bg-gray-900 text-white p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Total Sale Proceeds</span>
                        <span className="text-2xl font-bold">${plan.totalSaleProceedsUsd.toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Total amount Wingold owes under this agreement.</p>
                   </div>
                </CardContent>
              </Card>

              {/* Lifecycle */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Lifecycle & Status</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                     <div className="grid grid-cols-2 gap-4">
                       <div>
                         <Label className="text-gray-500">Start Date</Label>
                         <div className="flex items-center gap-2">
                           <Calendar className="w-4 h-4 text-gray-400" />
                           <p className="font-medium">{new Date(plan.startDate).toLocaleDateString()}</p>
                         </div>
                       </div>
                       <div>
                         <Label className="text-gray-500">Maturity Date</Label>
                         <div className="flex items-center gap-2">
                           <Clock className="w-4 h-4 text-gray-400" />
                           <p className="font-medium">{new Date(plan.maturityDate).toLocaleDateString()}</p>
                         </div>
                       </div>
                     </div>
                     
                     <div className="mt-6 pt-6 border-t">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-gray-600">Margin Paid Progress</span>
                          <span className="text-sm font-bold">{((plan.paidMarginUsd / plan.totalMarginComponentUsd) * 100).toFixed(1)}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                           <div 
                             className="h-full bg-green-500 rounded-full" 
                             style={{ width: `${(plan.paidMarginUsd / plan.totalMarginComponentUsd) * 100}%` }}
                           />
                        </div>
                        <div className="flex justify-between mt-2 text-xs text-gray-500">
                           <span>Paid: ${plan.paidMarginUsd.toLocaleString()}</span>
                           <span>Remaining: ${plan.remainingMarginUsd.toLocaleString()}</span>
                        </div>
                     </div>
                     
                     {(plan.status === 'Active' || plan.status === 'Maturing') && new Date(plan.maturityDate) <= new Date() && (
                       <div className="mt-6 pt-6 border-t">
                         <Button 
                           className="w-full bg-green-600 hover:bg-green-700" 
                           onClick={handleCompleteMaturity}
                           disabled={isCompletingMaturity}
                         >
                           {isCompletingMaturity ? (
                             <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                           ) : (
                             <>Complete Maturity & Credit Base Price</>
                           )}
                         </Button>
                         <p className="text-xs text-gray-500 mt-2 text-center">
                           This will credit ${plan.basePriceComponentUsd.toLocaleString()} worth of gold to user's wallet at current market price
                         </p>
                       </div>
                     )}
                  </CardContent>
                </Card>

                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                     <div className="flex gap-3">
                        <AlertTriangle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-bold text-blue-800 text-sm">Legal Reminder</h4>
                          <p className="text-xs text-blue-700 mt-1">
                            This is an immediate sale of gold to Wingold. Participant no longer owns the sold gold. 
                            Rights are contractual: deferred Base Price Component + Margin Component disbursements.
                          </p>
                        </div>
                     </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="payouts" className="space-y-4">
             <Card>
               <CardHeader>
                 <CardTitle>Margin Disbursement Schedule</CardTitle>
                 <CardDescription>Quarterly fixed margin payouts converted to gold.</CardDescription>
               </CardHeader>
               <CardContent>
                 <div className="rounded-md border">
                   <table className="w-full text-sm text-left">
                     <thead className="bg-gray-50 text-gray-500">
                       <tr>
                         <th className="p-3">#</th>
                         <th className="p-3">Date</th>
                         <th className="p-3">Amount (USD)</th>
                         <th className="p-3">Market Price</th>
                         <th className="p-3">Gold Credited</th>
                         <th className="p-3">Status</th>
                         <th className="p-3 text-right">Action</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y">
                       {plan.payouts.map((payout) => (
                         <tr key={payout.id} className="hover:bg-gray-50">
                           <td className="p-3 font-medium">{payout.sequence}</td>
                           <td className="p-3">{new Date(payout.scheduledDate).toLocaleDateString()}</td>
                           <td className="p-3 font-mono">${payout.monetaryAmountUsd.toLocaleString()}</td>
                           <td className="p-3 text-gray-500">
                             {payout.marketPriceUsdPerGram ? `$${payout.marketPriceUsdPerGram}/g` : '-'}
                           </td>
                           <td className="p-3 font-bold text-fuchsia-600">
                             {payout.gramsCredited ? `${payout.gramsCredited.toFixed(4)}g` : '-'}
                           </td>
                           <td className="p-3">
                             <Badge variant={payout.status === 'Paid' ? 'default' : 'secondary'} className={payout.status === 'Paid' ? 'bg-green-600' : ''}>
                               {payout.status}
                             </Badge>
                           </td>
                           <td className="p-3 text-right">
                             {(payout.status === 'Scheduled' || payout.status === 'Processing') && (
                               <Button 
                                 size="sm" 
                                 variant={payout.status === 'Processing' ? 'default' : 'outline'}
                                 className={payout.status === 'Processing' ? 'bg-orange-500 hover:bg-orange-600' : ''}
                                 onClick={() => { setPayoutToProcess(payout); setPayoutPrice(currentMarketPrice.toString()); }}
                               >
                                 {payout.status === 'Processing' ? 'Complete Payout' : 'Process Payout'}
                               </Button>
                             )}
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               </CardContent>
             </Card>
          </TabsContent>

          <TabsContent value="termination" className="space-y-6">
             {!plan.earlyTermination ? (
               <Card className={plan.status === 'Early Termination Requested' ? "border-2 border-orange-300 bg-orange-50" : "border-dashed border-2"}>
                 <CardContent className="flex flex-col items-center justify-center py-12">
                    <div className={`p-4 rounded-full mb-4 ${plan.status === 'Early Termination Requested' ? 'bg-orange-100' : 'bg-gray-100'}`}>
                      <AlertTriangle className={`w-8 h-8 ${plan.status === 'Early Termination Requested' ? 'text-orange-500' : 'text-gray-400'}`} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {plan.status === 'Early Termination Requested' 
                        ? 'Early Termination Pending Review' 
                        : 'No Early Termination Requested'}
                    </h3>
                    <p className="text-gray-500 mb-6 text-center max-w-md">
                      {plan.status === 'Early Termination Requested' 
                        ? 'User has requested early termination. Run simulation to calculate settlement and process the request.'
                        : 'The plan is proceeding according to schedule. You can simulate an early termination to see the financial impact.'}
                    </p>
                    <Button 
                      onClick={() => { setSimulationPrice(currentMarketPrice.toString()); setShowSimulateDialog(true); }}
                      className={plan.status === 'Early Termination Requested' ? 'bg-orange-500 hover:bg-orange-600' : ''}
                    >
                      {plan.status === 'Early Termination Requested' 
                        ? 'Process Termination Request' 
                        : 'Run Early Termination Simulation'}
                    </Button>
                 </CardContent>
               </Card>
             ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* Request Details */}
                 <Card>
                   <CardHeader>
                     <CardTitle className="flex items-center justify-between">
                       Termination Request
                       <Badge variant="outline">{plan.earlyTermination.status}</Badge>
                     </CardTitle>
                   </CardHeader>
                   <CardContent className="space-y-4">
                      <div>
                        <Label className="text-gray-500">Reason</Label>
                        <p className="text-sm bg-gray-50 p-3 rounded border mt-1">{plan.earlyTermination.reason}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                         <div>
                           <Label className="text-gray-500">Requested At</Label>
                           <p className="font-medium">{new Date(plan.earlyTermination.requestedAt).toLocaleDateString()}</p>
                         </div>
                         <div>
                           <Label className="text-gray-500">Market Price Used</Label>
                           <p className="font-medium">${plan.earlyTermination.currentMarketPriceUsdPerGram}/g</p>
                         </div>
                      </div>
                      
                      {plan.earlyTermination.status === 'Requested' && (
                        <div className="flex gap-2 mt-6 pt-6 border-t">
                           <Button variant="destructive" className="w-full">Reject Request</Button>
                           <Button className="w-full bg-green-600 hover:bg-green-700" onClick={handleApproveTermination}>Approve Termination</Button>
                        </div>
                      )}
                      
                      {(plan.earlyTermination.status === 'Approved' || plan.earlyTermination.status === 'Under Review') && (
                        <div className="mt-6 pt-6 border-t">
                           <Button 
                             className="w-full bg-purple-600 hover:bg-purple-700" 
                             onClick={handleSettleTermination}
                             disabled={isSettling}
                           >
                             {isSettling ? (
                               <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing Settlement...</>
                             ) : (
                               <>Settle & Credit Gold to User</>
                             )}
                           </Button>
                           <p className="text-xs text-gray-500 mt-2 text-center">
                             This will credit {plan.earlyTermination.finalGoldGrams.toFixed(4)}g to user's wallet
                           </p>
                        </div>
                      )}
                   </CardContent>
                 </Card>

                 {/* Financial Simulation Result */}
                 <Card className="bg-gray-50 border-gray-200">
                   <CardHeader>
                     <CardTitle>Settlement Simulation</CardTitle>
                     <CardDescription>Based on Terms Section 5 (Early Termination)</CardDescription>
                   </CardHeader>
                   <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Base Price Component Value</span>
                          <span className="font-mono">${plan.earlyTermination.basePriceComponentValueUsd.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Total Sale Proceeds</span>
                          <span className="font-mono">${plan.earlyTermination.totalSaleProceedsUsd.toLocaleString()}</span>
                        </div>
                      </div>
                      
                      <Separator className="bg-gray-300" />
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm text-red-600">
                          <span>Admin Fee ({plan.earlyTermination.adminFeePercent}%)</span>
                          <span>- ${((plan.earlyTermination.totalSaleProceedsUsd * plan.earlyTermination.adminFeePercent) / 100).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm text-red-600">
                          <span>Penalty ({plan.earlyTermination.penaltyPercent}%)</span>
                          <span>- ${((plan.earlyTermination.totalSaleProceedsUsd * plan.earlyTermination.penaltyPercent) / 100).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm text-red-600">
                          <span>Margin Reimbursement</span>
                          <span>- ${plan.earlyTermination.totalDisbursedMarginUsd.toLocaleString()}</span>
                        </div>
                      </div>

                      <Separator className="bg-gray-300" />

                      <div className="flex justify-between font-bold text-gray-900">
                         <span>Net Value (USD)</span>
                         <span>${plan.earlyTermination.netValueUsd.toLocaleString()}</span>
                      </div>
                      
                      <div className="mt-4 bg-purple-100 p-4 rounded-lg border border-purple-200 text-center">
                         <p className="text-sm text-fuchsia-800 uppercase font-semibold mb-1">Final Gold Settlement</p>
                         <p className="text-3xl font-bold text-fuchsia-900">{plan.earlyTermination.finalGoldGrams.toFixed(4)}g</p>
                         <p className="text-xs text-fuchsia-700 mt-2">
                           Loss: {(plan.goldSoldGrams - plan.earlyTermination.finalGoldGrams).toFixed(2)}g ({((plan.goldSoldGrams - plan.earlyTermination.finalGoldGrams) / plan.goldSoldGrams * 100).toFixed(1)}%)
                         </p>
                      </div>
                   </CardContent>
                 </Card>
               </div>
             )}
          </TabsContent>

          <TabsContent value="audit" className="space-y-4">
            <Card>
               <CardHeader>
                 <CardTitle>Plan Audit Log</CardTitle>
               </CardHeader>
               <CardContent>
                  <div className="space-y-4">
                     {auditLogs.map((log) => (
                       <div key={log.id} className="flex gap-4 p-3 border-b last:border-0">
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
        </Tabs>
      </div>

      {/* Process Payout Dialog */}
      <Dialog open={!!payoutToProcess} onOpenChange={(open) => !open && setPayoutToProcess(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Quarterly Payout #{payoutToProcess?.sequence}</DialogTitle>
            <DialogDescription>
              Confirm the market price to convert the fixed USD margin into gold grams.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
             <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded border">
                   <p className="text-xs text-gray-500">Scheduled Amount</p>
                   <p className="font-bold font-mono">${payoutToProcess?.monetaryAmountUsd.toLocaleString()}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded border">
                   <p className="text-xs text-gray-500">Current Market Price</p>
                   <p className="font-bold font-mono">${currentMarketPrice}/g</p>
                </div>
             </div>
             
             <div className="space-y-2">
                <Label>Execution Price (USD/g)</Label>
                <Input 
                  type="number" 
                  value={payoutPrice} 
                  onChange={(e) => setPayoutPrice(e.target.value)} 
                />
             </div>
             
             <div className="bg-green-50 p-4 rounded border border-green-200 text-center">
                <p className="text-sm text-green-800 mb-1">Gold to Credit</p>
                <p className="text-2xl font-bold text-green-900">
                  {payoutToProcess && !isNaN(parseFloat(payoutPrice)) && parseFloat(payoutPrice) > 0
                    ? (payoutToProcess.monetaryAmountUsd / parseFloat(payoutPrice)).toFixed(4)
                    : '---'}g
                </p>
             </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayoutToProcess(null)} disabled={isProcessing}>Cancel</Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={handleProcessPayout} disabled={isProcessing}>
              {isProcessing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
              ) : (
                <>Confirm & Credit Gold</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Simulate Early Termination Dialog */}
      <Dialog open={showSimulateDialog} onOpenChange={setShowSimulateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Simulate Early Termination</DialogTitle>
            <DialogDescription>
              Calculate settlement values based on Terms Section 5 logic.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
             <div className="grid grid-cols-3 gap-4">
                <div>
                   <Label>Market Price (USD/g)</Label>
                   <Input 
                      type="number" 
                      value={simulationPrice} 
                      onChange={(e) => setSimulationPrice(e.target.value)} 
                      className="mt-1"
                   />
                </div>
                <div>
                   <Label>Admin Fee (%)</Label>
                   <Input value="2.0" disabled className="mt-1 bg-gray-100" />
                </div>
                <div>
                   <Label>Penalty (%)</Label>
                   <Input value="5.0" disabled className="mt-1 bg-gray-100" />
                </div>
             </div>

             <div className="space-y-2 bg-gray-50 p-4 rounded border">
                <div className="flex justify-between text-sm">
                   <span>Base Price Value</span>
                   <span className="font-mono">${simulation.basePriceComponentValueUsd.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm text-red-600">
                   <span>Total Deductions</span>
                   <span className="font-mono">-${simulation.totalDeductionsUsd.toLocaleString()}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between font-bold">
                   <span>Net Value (USD)</span>
                   <span>${simulation.netValueUsd.toLocaleString()}</span>
                </div>
             </div>

             <div className="bg-purple-100 p-4 rounded-lg border border-purple-200 text-center">
                <p className="text-sm text-fuchsia-800 uppercase font-semibold mb-1">Simulated Settlement</p>
                <p className="text-3xl font-bold text-fuchsia-900">{simulation.finalGoldGrams.toFixed(4)}g</p>
             </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSimulateDialog(false)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleCreateSimulation}>
              {plan.status === 'Early Termination Requested' ? 'Approve & Process' : 'Create Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
