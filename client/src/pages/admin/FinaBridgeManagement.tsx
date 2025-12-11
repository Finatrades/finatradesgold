import React, { useState } from 'react';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Briefcase, Eye, CheckCircle, XCircle } from 'lucide-react';
import { useTradeFinance } from '@/context/TradeFinanceContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { TradeCase } from '@/types/finabridge';

export default function FinaBridgeManagement() {
  const { cases, updateCaseStatus } = useTradeFinance();
  const [selectedCase, setSelectedCase] = useState<TradeCase | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const handleViewCase = (tradeCase: TradeCase) => {
    setSelectedCase(tradeCase);
    setIsDetailOpen(true);
  };

  const handleApprove = () => {
    if (selectedCase) {
      updateCaseStatus(selectedCase.id, 'Approved – Ready to Release');
      setIsDetailOpen(false);
    }
  };

  const handleReject = () => {
    if (selectedCase) {
      updateCaseStatus(selectedCase.id, 'Rejected');
      setIsDetailOpen(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">FinaBridge Management</h1>
          <p className="text-gray-500">Corporate Trade Finance & Supply Chain Operations</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <Card>
             <CardContent className="p-6">
               <div className="flex items-center gap-4">
                 <div className="p-3 bg-blue-100 text-blue-700 rounded-lg">
                   <Briefcase className="w-6 h-6" />
                 </div>
                 <div>
                   <p className="text-sm font-medium text-gray-500">Active Deals</p>
                   <h3 className="text-2xl font-bold text-gray-900">{cases.length}</h3>
                 </div>
               </div>
             </CardContent>
           </Card>
           <Card>
             <CardContent className="p-6">
               <div className="flex items-center gap-4">
                 <div className="p-3 bg-yellow-100 text-yellow-700 rounded-lg">
                   <Briefcase className="w-6 h-6" />
                 </div>
                 <div>
                   <p className="text-sm font-medium text-gray-500">Pending Review</p>
                   <h3 className="text-2xl font-bold text-gray-900">{cases.filter(c => c.status === 'Under Review' || c.status === 'Funded – Docs Pending').length}</h3>
                 </div>
               </div>
             </CardContent>
           </Card>
           <Card>
             <CardContent className="p-6">
               <div className="flex items-center gap-4">
                 <div className="p-3 bg-green-100 text-green-700 rounded-lg">
                   <Briefcase className="w-6 h-6" />
                 </div>
                 <div>
                   <p className="text-sm font-medium text-gray-500">Total Value</p>
                   <h3 className="text-2xl font-bold text-gray-900">CHF {(cases.reduce((acc, c) => acc + (c.valueUsd || 0), 0) / 1000000).toFixed(1)}M</h3>
                 </div>
               </div>
             </CardContent>
           </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Trade Finance Requests</CardTitle>
            <CardDescription>Review and approve new corporate trade applications.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {cases.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No active trade cases found.</p>
              ) : (
                cases.map((tradeCase) => (
                  <div key={tradeCase.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-gray-100 rounded-lg bg-white hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-4 mb-4 md:mb-0">
                        <div className={`p-2 rounded border ${tradeCase.status.includes('Approved') || tradeCase.status === 'Released' ? 'bg-green-50 border-green-100 text-green-600' : 'bg-blue-50 border-blue-100 text-blue-600'}`}>
                            <Briefcase className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-gray-900">{tradeCase.name}</h4>
                              <Badge variant="outline" className="text-xs">{tradeCase.status}</Badge>
                            </div>
                            <p className="text-sm text-gray-600">
                              Requesting ${(tradeCase.valueUsd || 0).toLocaleString()} • {tradeCase.buyer.company}
                            </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleViewCase(tradeCase)}>
                          <Eye className="w-4 h-4 mr-2" /> Review Deal
                        </Button>
                      </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Trade Case Detail Modal - Same as before */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Trade Case Review: {selectedCase?.id}</DialogTitle>
              <DialogDescription>Review details and approve financing.</DialogDescription>
            </DialogHeader>
            
            {selectedCase && (
              <div className="space-y-6 py-4">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                       <p className="text-xs text-muted-foreground uppercase">Buyer</p>
                       <p className="font-bold">{selectedCase.buyer.company}</p>
                       <p className="text-sm">{selectedCase.buyer.country}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                       <p className="text-xs text-muted-foreground uppercase">Value</p>
                       <p className="font-bold">${selectedCase.valueUsd.toLocaleString()}</p>
                       <p className="text-sm">{selectedCase.valueGoldGrams}g Gold</p>
                    </div>
                 </div>

                 <div className="space-y-2">
                    <h4 className="font-medium text-sm border-b pb-1">Commodity Details</h4>
                    <p className="text-sm text-gray-700">{selectedCase.commodityDescription}</p>
                    <div className="flex gap-4 text-sm mt-2">
                       <Badge variant="outline">{selectedCase.paymentTerms}</Badge>
                       <Badge variant="outline">{selectedCase.deliveryTerms}</Badge>
                    </div>
                 </div>

                 <div className="space-y-2">
                    <h4 className="font-medium text-sm border-b pb-1">Collateral Status</h4>
                    <div className="flex items-center justify-between bg-yellow-50 p-3 rounded border border-yellow-100">
                       <div className="flex items-center gap-2 text-yellow-800">
                          <CheckCircle className="w-4 h-4" />
                          <span className="font-medium">Gold Locked: {selectedCase.lockedGoldGrams}g</span>
                       </div>
                       <Badge className="bg-yellow-600 hover:bg-yellow-700">Verified</Badge>
                    </div>
                 </div>

                 <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => setIsDetailOpen(false)}>Cancel</Button>
                    <div className="flex gap-2 w-full sm:w-auto justify-end">
                       <Button variant="destructive" onClick={handleReject}>
                          <XCircle className="w-4 h-4 mr-2" /> Reject
                       </Button>
                       <Button className="bg-green-600 hover:bg-green-700" onClick={handleApprove}>
                          <CheckCircle className="w-4 h-4 mr-2" /> Approve Financing
                       </Button>
                    </div>
                 </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}