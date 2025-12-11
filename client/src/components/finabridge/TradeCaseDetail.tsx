import React, { useState } from 'react';
import { TradeCase, TradeDocument, ApprovalStep, AuditLogEntry } from '@/types/finabridge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Lock, CheckCircle2, FileText, Upload, ShieldCheck, History, Download, Eye, PenTool } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TradeCaseDetailProps {
  tradeCase: TradeCase;
  onBack: () => void;
  onUpdateCase: (updatedCase: TradeCase) => void;
  onReleaseFunds: () => void;
  currentRole: 'Importer' | 'Exporter';
}

export default function TradeCaseDetail({ tradeCase, onBack, onUpdateCase, onReleaseFunds, currentRole }: TradeCaseDetailProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');

  // Mock State for DMS
  const [documents, setDocuments] = useState<TradeDocument[]>([
    { id: 'd1', caseId: tradeCase.id, type: 'Invoice', fileName: 'inv-001.pdf', version: 1, uploadedBy: 'Exporter', uploadedAt: new Date().toISOString(), digitalSignatureStatus: 'Signed' }
  ]);

  // Mock State for Approvals
  const [approvals, setApprovals] = useState<ApprovalStep[]>([
    { id: 'ap1', caseId: tradeCase.id, name: 'Exporter Doc Upload', role: 'Exporter', status: 'Approved', approverName: 'John Exporter', decisionAt: new Date().toISOString() },
    { id: 'ap2', caseId: tradeCase.id, name: 'Importer Verification', role: 'Importer', status: 'Pending' },
    { id: 'ap3', caseId: tradeCase.id, name: 'Compliance Review', role: 'Compliance', status: 'Pending' },
  ]);

  // Mock Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([
    { id: 'log1', caseId: tradeCase.id, actorName: 'System', actorRole: 'System', actionType: 'Create Case', timestamp: tradeCase.createdAt, details: 'Case created via FinaBridge' }
  ]);

  const handleFileUpload = () => {
    toast({ title: "File Uploaded", description: "Document added to case DMS." });
    // Add logic to update state
  };

  const handleApproveStep = (stepId: string) => {
    setApprovals(prev => prev.map(step => 
      step.id === stepId ? { ...step, status: 'Approved', approverName: 'Me', decisionAt: new Date().toISOString() } : step
    ));
    toast({ title: "Step Approved", description: "Approval recorded on blockchain ledger." });
    
    // Check if all approved to update status
    // Simplified logic for demo
    if (stepId === 'ap2') {
       onUpdateCase({ ...tradeCase, status: 'Under Review' }); 
    }
  };

  const handleRelease = () => {
    onReleaseFunds();
    toast({ title: "Funds Released", description: "Gold ownership transferred to Exporter." });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="text-white/60 hover:text-white">
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              {tradeCase.id} 
              <Badge variant="outline" className="text-sm font-normal border-white/20 text-white/60">{tradeCase.status}</Badge>
            </h2>
            <p className="text-white/40 text-sm">{tradeCase.name}</p>
          </div>
        </div>
        
        {currentRole === 'Importer' && tradeCase.status === 'Approved – Ready to Release' && (
           <Button 
             className="bg-green-500 hover:bg-green-600 text-white font-bold animate-pulse shadow-[0_0_20px_rgba(34,197,94,0.3)]"
             onClick={handleRelease}
           >
             <CheckCircle2 className="w-5 h-5 mr-2" /> Release Settlement to Exporter
           </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-white/5 border border-white/10 w-full justify-start rounded-lg p-1">
           <TabsTrigger value="overview" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black">Overview</TabsTrigger>
           <TabsTrigger value="documents" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black">Documents (DMS)</TabsTrigger>
           <TabsTrigger value="approvals" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black">Approvals</TabsTrigger>
           <TabsTrigger value="audit" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black">Ledger & Audit</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="mt-6 space-y-6">
           <div className="grid grid-cols-3 gap-6">
             {/* Left Column - Details */}
             <Card className="col-span-2 bg-white/5 border-white/10">
               <CardHeader><CardTitle className="text-lg">Trade Details</CardTitle></CardHeader>
               <CardContent className="space-y-6">
                 <div className="grid grid-cols-2 gap-8">
                   <div>
                     <Label className="text-white/40">Buyer</Label>
                     <p className="font-bold text-white">{tradeCase.buyer.company}</p>
                     <p className="text-sm text-white/60">{tradeCase.buyer.country}</p>
                   </div>
                   <div>
                     <Label className="text-white/40">Seller</Label>
                     <p className="font-bold text-white">{tradeCase.seller.company}</p>
                     <p className="text-sm text-white/60">{tradeCase.seller.country}</p>
                   </div>
                 </div>
                 
                 <Separator className="bg-white/10" />

                 <div className="grid grid-cols-2 gap-6">
                   <div>
                     <Label className="text-white/40">Commodity</Label>
                     <p className="text-white">{tradeCase.commodityDescription}</p>
                   </div>
                   <div>
                     <Label className="text-white/40">Incoterms</Label>
                     <p className="text-white">{tradeCase.deliveryTerms}</p>
                   </div>
                 </div>
               </CardContent>
             </Card>

             {/* Right Column - Finance */}
             <Card className="col-span-1 bg-white/5 border-white/10">
               <CardHeader><CardTitle className="text-lg">Financials</CardTitle></CardHeader>
               <CardContent className="space-y-6">
                 <div className="bg-black/20 p-4 rounded-lg border border-white/5">
                   <Label className="text-white/40">Contract Value</Label>
                   <p className="text-2xl font-bold text-white">${tradeCase.valueUsd.toLocaleString()}</p>
                   <p className="text-sm text-[#D4AF37]">{tradeCase.valueGoldGrams.toFixed(3)} g Gold</p>
                 </div>

                 <div className="bg-black/20 p-4 rounded-lg border border-white/5">
                   <Label className="text-white/40">Locked Collateral</Label>
                   <div className="flex items-center gap-2 mt-1">
                     <Lock className="w-4 h-4 text-amber-500" />
                     <p className="text-xl font-bold text-amber-500">{tradeCase.lockedGoldGrams.toFixed(3)} g</p>
                   </div>
                   {currentRole === 'Exporter' && tradeCase.status !== 'Released' && (
                     <p className="text-xs text-blue-400 mt-2">Locked by Importer. Awaiting release.</p>
                   )}
                 </div>
               </CardContent>
             </Card>
           </div>
        </TabsContent>

        {/* DOCUMENTS TAB */}
        <TabsContent value="documents" className="mt-6">
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Document Management System</CardTitle>
              <Button size="sm" onClick={handleFileUpload} className="bg-white/10 hover:bg-white/20 text-white">
                <Upload className="w-4 h-4 mr-2" /> Upload Document
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {documents.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-4 bg-black/20 rounded-lg border border-white/5 hover:border-white/20 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-500/10 rounded text-blue-500">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-bold text-white">{doc.type}</p>
                        <p className="text-sm text-white/40">{doc.fileName} • v{doc.version}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {doc.digitalSignatureStatus === 'Signed' ? (
                        <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 flex gap-1">
                          <ShieldCheck className="w-3 h-3" /> Signed
                        </Badge>
                      ) : (
                        <Button size="sm" variant="outline" className="h-7 text-xs border-white/10 text-white/60">
                           <PenTool className="w-3 h-3 mr-1" /> Sign
                        </Button>
                      )}
                      <div className="flex gap-2">
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-white/40 hover:text-white"><Eye className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-white/40 hover:text-white"><Download className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* APPROVALS TAB */}
        <TabsContent value="approvals" className="mt-6">
           <Card className="bg-white/5 border-white/10">
             <CardHeader><CardTitle>Approval Workflow</CardTitle></CardHeader>
             <CardContent>
               <div className="space-y-6 relative">
                 {/* Vertical Line */}
                 <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-white/10" />
                 
                 {approvals.map((step, idx) => (
                   <div key={step.id} className="relative flex gap-6 items-start">
                     {/* Status Indicator */}
                     <div className={`relative z-10 w-12 h-12 rounded-full border-4 border-[#1A0A2E] flex items-center justify-center shrink-0 
                       ${step.status === 'Approved' ? 'bg-green-500 text-black' : 
                         step.status === 'In Review' ? 'bg-yellow-500 text-black' : 'bg-gray-700 text-white'}`}
                     >
                       {step.status === 'Approved' ? <CheckCircle2 className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                     </div>

                     <div className="flex-1 bg-black/20 p-4 rounded-lg border border-white/5">
                        <div className="flex justify-between items-start mb-2">
                           <div>
                             <h4 className="font-bold text-white">{step.name}</h4>
                             <p className="text-sm text-white/40">Assigned to: {step.role}</p>
                           </div>
                           <Badge variant="outline" className={`
                             ${step.status === 'Approved' ? 'text-green-500 border-green-500/20 bg-green-500/10' : 'text-white/40 border-white/10'}
                           `}>{step.status}</Badge>
                        </div>
                        
                        {step.status === 'Approved' && (
                          <p className="text-xs text-green-400 mt-2">
                            Approved by {step.approverName} on {new Date(step.decisionAt!).toLocaleDateString()}
                          </p>
                        )}

                        {step.status === 'Pending' && currentRole === step.role && (
                           <div className="mt-4 flex gap-2">
                             <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white" onClick={() => handleApproveStep(step.id)}>Approve</Button>
                             <Button size="sm" variant="destructive">Reject</Button>
                           </div>
                        )}
                     </div>
                   </div>
                 ))}
               </div>
             </CardContent>
           </Card>
        </TabsContent>

        {/* AUDIT TAB */}
        <TabsContent value="audit" className="mt-6">
           <Card className="bg-white/5 border-white/10">
             <CardHeader><CardTitle className="flex items-center gap-2"><History className="w-5 h-5" /> Immutable Audit Ledger</CardTitle></CardHeader>
             <CardContent>
               <ScrollArea className="h-[400px]">
                 <div className="space-y-0">
                   {auditLogs.map((log) => (
                     <div key={log.id} className="grid grid-cols-12 gap-4 py-3 border-b border-white/5 text-sm hover:bg-white/5 px-2">
                        <div className="col-span-3 text-white/40 font-mono text-xs">{new Date(log.timestamp).toLocaleString()}</div>
                        <div className="col-span-3 text-white">
                          <span className="font-bold">{log.actorName}</span> <span className="text-white/40 text-xs">({log.actorRole})</span>
                        </div>
                        <div className="col-span-2 text-[#D4AF37] font-medium">{log.actionType}</div>
                        <div className="col-span-4 text-white/60 truncate">{log.details}</div>
                     </div>
                   ))}
                 </div>
               </ScrollArea>
             </CardContent>
           </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
