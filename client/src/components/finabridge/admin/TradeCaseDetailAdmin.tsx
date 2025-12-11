import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, AlertTriangle, FileText, Upload } from 'lucide-react';
import { TradeCase, TradeDocument, ApprovalStep, AuditLogEntry } from '@/types/finabridge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface TradeCaseDetailAdminProps {
  tradeCase: TradeCase;
  documents: TradeDocument[];
  approvals: ApprovalStep[];
  auditLogs: AuditLogEntry[];
  onClose: () => void;
  onUpdateStatus: (id: string, newStatus: any) => void;
  onAddAuditLog: (entry: AuditLogEntry) => void;
  onUpdateDocumentStatus: (docId: string, status: any) => void;
  onUpdateApproval: (stepId: string, status: any, notes?: string) => void;
  onUpdateParty: (partyId: string, updates: Partial<any>) => void;
}

export default function TradeCaseDetailAdmin({ 
  tradeCase, 
  documents, 
  approvals, 
  auditLogs, 
  onClose,
  onUpdateStatus,
  onAddAuditLog,
  onUpdateDocumentStatus,
  onUpdateApproval,
  onUpdateParty
}: TradeCaseDetailAdminProps) {
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showReleaseDialog, setShowReleaseDialog] = useState(false);

  const handleFlagParty = (partyId: string, currentFlag: boolean, role: string) => {
    onUpdateParty(partyId, { 
      sanctionsFlag: !currentFlag,
      riskLevel: !currentFlag ? 'Critical' : 'Medium' // Auto-escalate risk if flagged
    });
    
    onAddAuditLog({
      id: crypto.randomUUID(),
      caseId: tradeCase.id,
      actorName: 'Admin User',
      actorRole: 'Admin',
      actionType: 'RiskUpdate',
      timestamp: new Date().toISOString(),
      details: `${role} ${!currentFlag ? 'flagged as suspicious' : 'flag cleared'}`,
      oldValue: currentFlag ? 'Flagged' : 'Clear',
      newValue: !currentFlag ? 'Flagged' : 'Clear'
    });
    
    toast.warning(`${role} ${!currentFlag ? 'Flagged as Suspicious' : 'Flag Cleared'}`);
  };

  const handleRiskChange = (partyId: string, newRisk: string, role: string) => {
    onUpdateParty(partyId, { riskLevel: newRisk });
    onAddAuditLog({
      id: crypto.randomUUID(),
      caseId: tradeCase.id,
      actorName: 'Admin User',
      actorRole: 'Admin',
      actionType: 'RiskUpdate',
      timestamp: new Date().toISOString(),
      details: `${role} risk level changed`,
      newValue: newRisk
    });
    toast.success(`${role} Risk Level Updated`);
  };
    onUpdateStatus(tradeCase.id, 'Approved – Ready to Release');
    onAddAuditLog({
      id: crypto.randomUUID(),
      caseId: tradeCase.id,
      actorName: 'Admin User',
      actorRole: 'Admin',
      actionType: 'StatusChange',
      timestamp: new Date().toISOString(),
      details: 'Case approved for settlement release',
      oldValue: tradeCase.status,
      newValue: 'Approved – Ready to Release'
    });
    toast.success('Case Approved');
  };

  const handleRejectCase = () => {
    onUpdateStatus(tradeCase.id, 'Rejected');
    onAddAuditLog({
      id: crypto.randomUUID(),
      caseId: tradeCase.id,
      actorName: 'Admin User',
      actorRole: 'Admin',
      actionType: 'StatusChange',
      timestamp: new Date().toISOString(),
      details: `Case rejected. Reason: ${rejectReason}`,
      oldValue: tradeCase.status,
      newValue: 'Rejected'
    });
    setShowRejectDialog(false);
    toast.error('Case Rejected');
  };

  const handleReleaseSettlement = () => {
    onUpdateStatus(tradeCase.id, 'Released');
    onAddAuditLog({
      id: crypto.randomUUID(),
      caseId: tradeCase.id,
      actorName: 'Admin User',
      actorRole: 'Admin',
      actionType: 'ReleaseFunds',
      timestamp: new Date().toISOString(),
      details: `Settlement of ${tradeCase.lockedGoldGrams}g Gold released to Exporter`,
      oldValue: 'Approved – Ready to Release',
      newValue: 'Released'
    });
    setShowReleaseDialog(false);
    toast.success('Settlement Released Successfully');
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-xl overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b bg-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-gray-900">{tradeCase.reference}</h2>
            <Badge variant="outline" className="bg-white">{tradeCase.status}</Badge>
            <Badge className={
              tradeCase.jurisdictionRisk === 'Critical' ? 'bg-red-600' :
              tradeCase.jurisdictionRisk === 'High' ? 'bg-orange-600' :
              tradeCase.jurisdictionRisk === 'Medium' ? 'bg-yellow-600' : 'bg-green-600'
            }>
              {tradeCase.jurisdictionRisk} Risk
            </Badge>
          </div>
          <p className="text-gray-500 mt-1">Created on {new Date(tradeCase.createdAt).toLocaleDateString()}</p>
        </div>
        
        <div className="flex gap-2">
           <Button variant="outline" onClick={onClose}>Close</Button>
           
           {tradeCase.status === 'Approved – Ready to Release' && (
             <Button className="bg-amber-500 hover:bg-amber-600 text-white border-amber-600" onClick={() => setShowReleaseDialog(true)}>
               Release Settlement
             </Button>
           )}
           
           {(tradeCase.status !== 'Approved – Ready to Release' && tradeCase.status !== 'Released' && tradeCase.status !== 'Rejected') && (
             <>
               <Button variant="destructive" onClick={() => setShowRejectDialog(true)}>Reject</Button>
               <Button className="bg-green-600 hover:bg-green-700" onClick={handleApproveCase}>Approve Case</Button>
             </>
           )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="approvals">Approvals</TabsTrigger>
            <TabsTrigger value="kyc">KYC & Risk</TabsTrigger>
            <TabsTrigger value="audit">Audit Trail</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Parties */}
              <Card>
                <CardHeader>
                  <CardTitle>Counterparties</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                   <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                      <h4 className="text-xs font-semibold text-blue-800 uppercase mb-2">Importer (Buyer)</h4>
                      <p className="font-bold text-lg">{tradeCase.importer.name}</p>
                      <p className="text-sm text-gray-600">{tradeCase.importer.country}</p>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline" className="bg-white">{tradeCase.importer.kycStatus}</Badge>
                        <Badge variant={tradeCase.importer.riskLevel === 'Low' ? 'default' : 'destructive'} className="bg-white text-gray-800 border-gray-200">
                          {tradeCase.importer.riskLevel} Risk
                        </Badge>
                      </div>
                   </div>
                   
                   <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                      <h4 className="text-xs font-semibold text-purple-800 uppercase mb-2">Exporter (Seller)</h4>
                      <p className="font-bold text-lg">{tradeCase.exporter.name}</p>
                      <p className="text-sm text-gray-600">{tradeCase.exporter.country}</p>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline" className="bg-white">{tradeCase.exporter.kycStatus}</Badge>
                        <Badge variant={tradeCase.exporter.riskLevel === 'Low' ? 'default' : 'destructive'} className="bg-white text-gray-800 border-gray-200">
                          {tradeCase.exporter.riskLevel} Risk
                        </Badge>
                      </div>
                   </div>
                </CardContent>
              </Card>

              {/* Trade Info */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Trade Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-gray-500">Value (USD)</Label>
                        <p className="text-xl font-bold">${tradeCase.valueUsd.toLocaleString()}</p>
                      </div>
                      <div>
                        <Label className="text-gray-500">Value (Gold)</Label>
                        <p className="text-xl font-bold text-amber-600">{tradeCase.valueGoldGrams}g</p>
                      </div>
                    </div>
                    <Separator />
                    <div>
                      <Label className="text-gray-500">Commodity</Label>
                      <p className="font-medium">{tradeCase.commodityDescription}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-gray-500">Incoterm</Label>
                        <p className="font-medium">{tradeCase.incoterm}</p>
                      </div>
                      <div>
                        <Label className="text-gray-500">Method</Label>
                        <p className="font-medium">{tradeCase.shipmentMethod}</p>
                      </div>
                    </div>
                    <div>
                      <Label className="text-gray-500">Expected Delivery</Label>
                      <p className="font-medium">{new Date(tradeCase.expectedDeliveryDate).toLocaleDateString()}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-amber-50 border-amber-200">
                  <CardHeader>
                    <CardTitle className="text-amber-800">Settlement Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3 mb-4">
                       <div className="p-2 bg-amber-100 rounded-full text-amber-700">
                         <CheckCircle className="w-6 h-6" />
                       </div>
                       <div>
                         <p className="text-sm font-medium text-amber-900">Locked in FinaVault</p>
                         <p className="text-2xl font-bold text-amber-700">{tradeCase.lockedGoldGrams}g</p>
                       </div>
                    </div>
                    <p className="text-sm text-amber-800 bg-amber-100 p-3 rounded">
                      This gold is reserved for settlement and is not transferable until released by FinaBridge Admin.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
             <Card>
               <CardHeader>
                 <CardTitle>Required Documents</CardTitle>
                 <CardDescription>Review and approve trade documentation.</CardDescription>
               </CardHeader>
               <CardContent>
                 <div className="space-y-4">
                   {documents.map(doc => (
                     <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center gap-4">
                           <div className="p-2 bg-gray-100 rounded text-gray-600">
                             <FileText className="w-5 h-5" />
                           </div>
                           <div>
                             <p className="font-bold text-gray-900">{doc.type}</p>
                             <p className="text-sm text-gray-500">{doc.fileName || 'No file uploaded'}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-4">
                           <Badge variant={
                             doc.status === 'Approved' ? 'default' : 
                             doc.status === 'Rejected' ? 'destructive' : 
                             doc.status === 'Missing' ? 'secondary' : 'outline'
                           } className={doc.status === 'Approved' ? 'bg-green-600' : ''}>
                             {doc.status}
                           </Badge>
                           
                           {doc.status === 'Under Review' && (
                             <div className="flex gap-2">
                               <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => onUpdateDocumentStatus(doc.id, 'Rejected')}>Reject</Button>
                               <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => onUpdateDocumentStatus(doc.id, 'Approved')}>Approve</Button>
                             </div>
                           )}
                           {doc.status !== 'Missing' && doc.status !== 'Under Review' && (
                             <Button size="sm" variant="ghost">View</Button>
                           )}
                        </div>
                     </div>
                   ))}
                 </div>
               </CardContent>
             </Card>
          </TabsContent>

          <TabsContent value="approvals" className="space-y-4">
             <Card>
               <CardHeader>
                 <CardTitle>Approval Workflow</CardTitle>
                 <CardDescription>Mandatory sign-offs required for settlement release.</CardDescription>
               </CardHeader>
               <CardContent>
                  <div className="relative border-l-2 border-gray-200 ml-4 space-y-8 pl-8 py-4">
                     {approvals.map((step, idx) => (
                       <div key={step.id} className="relative">
                          <div className={`absolute -left-[41px] top-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            step.status === 'Approved' ? 'bg-green-600 border-green-600 text-white' : 
                            step.status === 'Rejected' ? 'bg-red-600 border-red-600 text-white' :
                            step.status === 'In Review' ? 'bg-blue-600 border-blue-600 text-white' :
                            'bg-white border-gray-300 text-gray-300'
                          }`}>
                            {step.status === 'Approved' ? <CheckCircle className="w-4 h-4" /> : 
                             step.status === 'Rejected' ? <XCircle className="w-4 h-4" /> :
                             <span className="text-xs font-bold">{idx + 1}</span>}
                          </div>
                          
                          <div className="flex flex-col md:flex-row md:items-start justify-between bg-gray-50 p-4 rounded-lg border">
                             <div>
                                <h4 className="font-bold text-gray-900">{step.name}</h4>
                                <p className="text-sm text-gray-500">{step.role}</p>
                                {step.notes && <p className="text-sm text-gray-600 mt-2 bg-white p-2 rounded border italic">"{step.notes}"</p>}
                             </div>
                             
                             <div className="flex flex-col items-end gap-2 mt-4 md:mt-0">
                                <Badge variant="outline">{step.status}</Badge>
                                {step.approverName && <span className="text-xs text-gray-400">By {step.approverName}</span>}
                                {step.decisionAt && <span className="text-xs text-gray-400">{new Date(step.decisionAt).toLocaleDateString()}</span>}
                                
                                {step.status === 'Pending' || step.status === 'In Review' ? (
                                   <div className="flex gap-2 mt-2">
                                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onUpdateApproval(step.id, 'Rejected', 'Rejected by Admin')}>Reject</Button>
                                      <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700" onClick={() => onUpdateApproval(step.id, 'Approved', 'Approved by Admin')}>Approve</Button>
                                   </div>
                                ) : null}
                             </div>
                          </div>
                       </div>
                     ))}
                  </div>
               </CardContent>
             </Card>
          </TabsContent>

          <TabsContent value="kyc" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <Card>
                 <CardHeader>
                   <CardTitle className="flex items-center justify-between">
                     Importer KYC
                     <Badge>{tradeCase.importer.kycStatus}</Badge>
                   </CardTitle>
                 </CardHeader>
                 <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                       <span className="text-gray-500">Legal Name</span>
                       <span className="font-medium">{tradeCase.importer.name}</span>
                       <span className="text-gray-500">Country</span>
                       <span className="font-medium">{tradeCase.importer.country}</span>
                       <span className="text-gray-500">Sanctions Check</span>
                       <div className="flex items-center gap-2">
                         <span className={tradeCase.importer.sanctionsFlag ? 'text-red-600 font-bold' : 'text-green-600'}>
                           {tradeCase.importer.sanctionsFlag ? 'FLAGGED' : 'Clear'}
                         </span>
                         <Button 
                           size="sm" 
                           variant={tradeCase.importer.sanctionsFlag ? "outline" : "ghost"} 
                           className={tradeCase.importer.sanctionsFlag ? "text-green-600 border-green-200 hover:bg-green-50" : "text-red-600 hover:bg-red-50 hover:text-red-700"}
                           onClick={() => handleFlagParty(tradeCase.importer.id, tradeCase.importer.sanctionsFlag, 'Importer')}
                         >
                           {tradeCase.importer.sanctionsFlag ? 'Clear Flag' : 'Flag Suspicious'}
                         </Button>
                       </div>
                    </div>
                    <Separator />
                    <div>
                       <Label className="mb-2 block">Risk Assessment</Label>
                       <Select 
                         defaultValue={tradeCase.importer.riskLevel} 
                         onValueChange={(val) => handleRiskChange(tradeCase.importer.id, val, 'Importer')}
                       >
                          <SelectTrigger>
                             <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                             <SelectItem value="Low">Low Risk</SelectItem>
                             <SelectItem value="Medium">Medium Risk</SelectItem>
                             <SelectItem value="High">High Risk</SelectItem>
                             <SelectItem value="Critical">Critical Risk</SelectItem>
                          </SelectContent>
                       </Select>
                    </div>
                 </CardContent>
               </Card>

               <Card>
                 <CardHeader>
                   <CardTitle className="flex items-center justify-between">
                     Exporter KYC
                     <Badge>{tradeCase.exporter.kycStatus}</Badge>
                   </CardTitle>
                 </CardHeader>
                 <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                       <span className="text-gray-500">Legal Name</span>
                       <span className="font-medium">{tradeCase.exporter.name}</span>
                       <span className="text-gray-500">Country</span>
                       <span className="font-medium">{tradeCase.exporter.country}</span>
                       <span className="text-gray-500">Sanctions Check</span>
                       <div className="flex items-center gap-2">
                         <span className={tradeCase.exporter.sanctionsFlag ? 'text-red-600 font-bold' : 'text-green-600'}>
                           {tradeCase.exporter.sanctionsFlag ? 'FLAGGED' : 'Clear'}
                         </span>
                         <Button 
                           size="sm" 
                           variant={tradeCase.exporter.sanctionsFlag ? "outline" : "ghost"} 
                           className={tradeCase.exporter.sanctionsFlag ? "text-green-600 border-green-200 hover:bg-green-50" : "text-red-600 hover:bg-red-50 hover:text-red-700"}
                           onClick={() => handleFlagParty(tradeCase.exporter.id, tradeCase.exporter.sanctionsFlag, 'Exporter')}
                         >
                           {tradeCase.exporter.sanctionsFlag ? 'Clear Flag' : 'Flag Suspicious'}
                         </Button>
                       </div>
                    </div>
                    <Separator />
                    <div>
                       <Label className="mb-2 block">Risk Assessment</Label>
                       <Select 
                         defaultValue={tradeCase.exporter.riskLevel}
                         onValueChange={(val) => handleRiskChange(tradeCase.exporter.id, val, 'Exporter')}
                       >
                          <SelectTrigger>
                             <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                             <SelectItem value="Low">Low Risk</SelectItem>
                             <SelectItem value="Medium">Medium Risk</SelectItem>
                             <SelectItem value="High">High Risk</SelectItem>
                             <SelectItem value="Critical">Critical Risk</SelectItem>
                          </SelectContent>
                       </Select>
                    </div>
                 </CardContent>
               </Card>
            </div>
          </TabsContent>

          <TabsContent value="audit" className="space-y-4">
            <Card>
               <CardHeader>
                 <CardTitle>Case Audit Log</CardTitle>
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
                               <span className="font-bold">{log.actorName}</span> ({log.actorRole}) - {log.actionType}
                             </p>
                             <p className="text-sm text-gray-600">{log.details}</p>
                             {log.oldValue && log.newValue && (
                               <p className="text-xs text-gray-400 mt-1">
                                 Changed from <span className="font-mono">{log.oldValue}</span> to <span className="font-mono">{log.newValue}</span>
                               </p>
                             )}
                          </div>
                       </div>
                     ))}
                  </div>
               </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Trade Case</DialogTitle>
            <DialogDescription>Please provide a reason for rejection. This will be logged in the audit trail.</DialogDescription>
          </DialogHeader>
          <Textarea 
            placeholder="Reason for rejection..." 
            value={rejectReason} 
            onChange={(e) => setRejectReason(e.target.value)} 
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleRejectCase}>Confirm Rejection</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showReleaseDialog} onOpenChange={setShowReleaseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Release Settlement</DialogTitle>
            <DialogDescription>
              Are you sure you want to release the settlement funds?
            </DialogDescription>
          </DialogHeader>
          <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 my-4">
             <div className="flex justify-between items-center mb-2">
               <span className="text-amber-800 font-medium">Transfer Amount:</span>
               <span className="text-amber-900 font-bold text-lg">{tradeCase.lockedGoldGrams}g Gold</span>
             </div>
             <div className="flex justify-between items-center text-sm">
               <span className="text-amber-700">From: FinaVault Escrow</span>
               <span className="text-amber-700">To: {tradeCase.exporter.name}</span>
             </div>
          </div>
          <p className="text-sm text-gray-500">
             This action is irreversible. The gold will be immediately credited to the exporter's account.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReleaseDialog(false)}>Cancel</Button>
            <Button className="bg-amber-500 hover:bg-amber-600 text-white" onClick={handleReleaseSettlement}>Confirm Release</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
