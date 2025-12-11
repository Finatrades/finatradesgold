import React, { useState } from 'react';
import AdminLayout from '@/pages/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Briefcase, Eye, CheckCircle, XCircle, AlertTriangle, TrendingUp, Lock } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import TradeCaseDetailAdmin from '@/components/finabridge/admin/TradeCaseDetailAdmin';
import { TradeCase, TradeDocument, ApprovalStep, AuditLogEntry, TradeCaseStatus, TradeRole } from '@/types/finabridge';

// --- MOCK DATA ---
const MOCK_CASES: TradeCase[] = [
  {
    id: '1',
    reference: 'TF-2025-0007',
    name: 'Electronics Import',
    role: 'Importer',
    importer: { 
      id: 'IMP-001', name: 'TechGlobal Ltd', role: 'Importer', country: 'Switzerland', kycStatus: 'Approved', riskLevel: 'Low', sanctionsFlag: false 
    },
    exporter: { 
      id: 'EXP-001', name: 'Shenzhen Electronics', role: 'Exporter', country: 'China', kycStatus: 'Approved', riskLevel: 'Medium', sanctionsFlag: false 
    },
    commodityDescription: 'Consumer Electronics Components',
    valueUsd: 150000,
    valueGoldGrams: 2000,
    lockedGoldGrams: 2000,
    status: 'Funded – Docs Pending',
    createdAt: '2025-03-01T10:00:00Z',
    updatedAt: '2025-03-05T14:30:00Z',
    incoterm: 'FOB',
    shipmentMethod: 'Air Freight',
    expectedDeliveryDate: '2025-04-15',
    jurisdictionRisk: 'Medium',
    amlFlags: [],
    paymentTerms: 'LC at Sight',
    deliveryTerms: 'FOB Shenzhen'
  },
  {
    id: '2',
    reference: 'TF-2025-0008',
    name: 'Coffee Beans Shipment',
    role: 'Importer',
    importer: { 
      id: 'IMP-002', name: 'Alpine Coffee Roasters', role: 'Importer', country: 'Switzerland', kycStatus: 'Approved', riskLevel: 'Low', sanctionsFlag: false 
    },
    exporter: { 
      id: 'EXP-002', name: 'Colombian Growers Co-op', role: 'Exporter', country: 'Colombia', kycStatus: 'In Progress', riskLevel: 'Medium', sanctionsFlag: false 
    },
    commodityDescription: 'Premium Arabica Coffee Beans',
    valueUsd: 45000,
    valueGoldGrams: 600,
    lockedGoldGrams: 600,
    status: 'Approved – Ready to Release',
    createdAt: '2025-03-02T09:15:00Z',
    updatedAt: '2025-03-10T11:20:00Z',
    incoterm: 'CIF',
    shipmentMethod: 'Sea Freight',
    expectedDeliveryDate: '2025-05-01',
    jurisdictionRisk: 'Low',
    amlFlags: [],
    paymentTerms: 'Net 30',
    deliveryTerms: 'CIF Hamburg'
  },
  {
    id: '3',
    reference: 'TF-2025-0009',
    name: 'Heavy Machinery',
    role: 'Importer',
    importer: { 
      id: 'IMP-003', name: 'BuildRight Construction', role: 'Importer', country: 'UAE', kycStatus: 'Approved', riskLevel: 'High', sanctionsFlag: false 
    },
    exporter: { 
      id: 'EXP-003', name: 'German Engineering GmbH', role: 'Exporter', country: 'Germany', kycStatus: 'Approved', riskLevel: 'Low', sanctionsFlag: false 
    },
    commodityDescription: 'Industrial Excavators',
    valueUsd: 850000,
    valueGoldGrams: 11500,
    lockedGoldGrams: 11500,
    status: 'Under Review',
    createdAt: '2025-03-08T16:45:00Z',
    updatedAt: '2025-03-09T09:00:00Z',
    incoterm: 'EXW',
    shipmentMethod: 'Land/Sea',
    expectedDeliveryDate: '2025-06-20',
    jurisdictionRisk: 'High',
    amlFlags: ['High Transaction Value', 'High Risk Jurisdiction'],
    paymentTerms: '50% Advance',
    deliveryTerms: 'EXW Munich'
  }
];

const MOCK_DOCS: TradeDocument[] = [
  { id: 'DOC-1', caseId: '1', type: 'Commercial Invoice', fileName: 'inv_2025_001.pdf', status: 'Approved', uploadedBy: 'TechGlobal Ltd', uploadedAt: '2025-03-02' },
  { id: 'DOC-2', caseId: '1', type: 'Bill of Lading', fileName: 'bl_air_882.pdf', status: 'Under Review', uploadedBy: 'Shenzhen Electronics', uploadedAt: '2025-03-05' },
  { id: 'DOC-3', caseId: '2', type: 'Commercial Invoice', fileName: 'inv_coffee_99.pdf', status: 'Approved', uploadedBy: 'Alpine Coffee', uploadedAt: '2025-03-03' },
  { id: 'DOC-4', caseId: '2', type: 'Certificate of Origin', fileName: 'co_colombia.pdf', status: 'Approved', uploadedBy: 'Colombian Growers', uploadedAt: '2025-03-04' },
];

const MOCK_APPROVALS: ApprovalStep[] = [
  { id: 'APP-1', caseId: '1', name: 'Importer Verification', role: 'Ops', status: 'Approved', approverName: 'Alice Admin', decisionAt: '2025-03-01' },
  { id: 'APP-2', caseId: '1', name: 'Compliance Review', role: 'Compliance', status: 'In Review' },
  { id: 'APP-3', caseId: '1', name: 'Final Approval', role: 'Risk', status: 'Pending' },
  
  { id: 'APP-4', caseId: '2', name: 'Importer Verification', role: 'Ops', status: 'Approved', approverName: 'Alice Admin', decisionAt: '2025-03-02' },
  { id: 'APP-5', caseId: '2', name: 'Compliance Review', role: 'Compliance', status: 'Approved', approverName: 'Bob Risk', decisionAt: '2025-03-05' },
  { id: 'APP-6', caseId: '2', name: 'Final Approval', role: 'Risk', status: 'Approved', approverName: 'Charlie Chief', decisionAt: '2025-03-10' },
];

const MOCK_AUDIT: AuditLogEntry[] = [
  { id: 'LOG-1', caseId: '1', actorName: 'System', actorRole: 'System', actionType: 'Create Case', timestamp: '2025-03-01T10:00:00Z', details: 'Case created via API' },
  { id: 'LOG-2', caseId: '1', actorName: 'TechGlobal', actorRole: 'Importer', actionType: 'Upload Document', timestamp: '2025-03-02T11:00:00Z', details: 'Uploaded Commercial Invoice' },
  { id: 'LOG-3', caseId: '2', actorName: 'Charlie Chief', actorRole: 'Risk', actionType: 'StatusChange', timestamp: '2025-03-10T11:20:00Z', details: 'Approved for release', oldValue: 'Under Review', newValue: 'Approved – Ready to Release' },
];

export default function FinaBridgeManagement() {
  const [cases, setCases] = useState<TradeCase[]>(MOCK_CASES);
  const [documents, setDocuments] = useState<TradeDocument[]>(MOCK_DOCS);
  const [approvals, setApprovals] = useState<ApprovalStep[]>(MOCK_APPROVALS);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(MOCK_AUDIT);
  
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const selectedCase = cases.find(c => c.id === selectedCaseId);

  const handleOpenCase = (id: string) => {
    setSelectedCaseId(id);
    setDetailOpen(true);
  };

  const updateCaseStatus = (id: string, newStatus: TradeCaseStatus) => {
    setCases(cases.map(c => c.id === id ? { ...c, status: newStatus } : c));
  };

  const addAuditLog = (entry: AuditLogEntry) => {
    setAuditLogs([entry, ...auditLogs]);
  };

  const updateDocumentStatus = (docId: string, status: any) => {
    setDocuments(documents.map(d => d.id === docId ? { ...d, status } : d));
  };

  const updateApproval = (stepId: string, status: any, notes?: string) => {
    setApprovals(approvals.map(a => a.id === stepId ? { ...a, status, notes: notes || a.notes } : a));
  };

  // KPI Calculations
  const totalLocked = cases.reduce((sum, c) => sum + c.lockedGoldGrams, 0);
  const pendingCases = cases.filter(c => c.status === 'Under Review' || c.status === 'Funded – Docs Pending').length;
  const highRiskCases = cases.filter(c => c.jurisdictionRisk === 'High' || c.jurisdictionRisk === 'Critical').length;

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">FinaBridge – Admin Console</h1>
          <p className="text-gray-500">Monitor gold-backed trade cases, KYC, and settlements.</p>
        </div>

        {/* Overview KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
           <Card className="bg-blue-50 border-blue-100">
             <CardContent className="p-6">
               <div className="flex items-center gap-4">
                 <div className="p-3 bg-blue-100 text-blue-700 rounded-lg">
                   <Briefcase className="w-6 h-6" />
                 </div>
                 <div>
                   <p className="text-sm font-medium text-blue-900">Active Trade Cases</p>
                   <h3 className="text-2xl font-bold text-blue-700">{cases.length}</h3>
                 </div>
               </div>
             </CardContent>
           </Card>
           
           <Card className="bg-yellow-50 border-yellow-100">
             <CardContent className="p-6">
               <div className="flex items-center gap-4">
                 <div className="p-3 bg-yellow-100 text-yellow-700 rounded-lg">
                   <Eye className="w-6 h-6" />
                 </div>
                 <div>
                   <p className="text-sm font-medium text-yellow-900">Pending Review</p>
                   <h3 className="text-2xl font-bold text-yellow-700">{pendingCases}</h3>
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
                   <p className="text-sm font-medium text-red-900">High Risk Cases</p>
                   <h3 className="text-2xl font-bold text-red-700">{highRiskCases}</h3>
                 </div>
               </div>
             </CardContent>
           </Card>

           <Card className="bg-amber-50 border-amber-100">
             <CardContent className="p-6">
               <div className="flex items-center gap-4">
                 <div className="p-3 bg-amber-100 text-amber-700 rounded-lg">
                   <Lock className="w-6 h-6" />
                 </div>
                 <div>
                   <p className="text-sm font-medium text-amber-900">Total Locked Gold</p>
                   <h3 className="text-2xl font-bold text-amber-700">{totalLocked.toLocaleString()}g</h3>
                 </div>
               </div>
             </CardContent>
           </Card>
        </div>

        <Tabs defaultValue="cases" className="w-full">
           <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent space-x-6">
             <TabsTrigger value="cases" className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 py-3 px-1">
               Trade Cases
             </TabsTrigger>
             <TabsTrigger value="locked" className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 py-3 px-1">
               Locked Funds
             </TabsTrigger>
             <TabsTrigger value="audit" className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 py-3 px-1">
               Audit & Logs
             </TabsTrigger>
           </TabsList>

           <div className="mt-6">
             <TabsContent value="cases">
                <Card>
                  <CardHeader>
                    <CardTitle>Trade Case Management</CardTitle>
                    <CardDescription>Filter and manage all corporate trade deals.</CardDescription>
                  </CardHeader>
                  <CardContent>
                     <div className="space-y-4">
                       {cases.map((tradeCase) => (
                         <div key={tradeCase.id} onClick={() => handleOpenCase(tradeCase.id)} className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-gray-100 rounded-lg bg-white hover:bg-gray-50 transition-colors cursor-pointer group">
                             <div className="flex items-center gap-4 mb-4 md:mb-0">
                               <div className={`p-2 rounded border ${tradeCase.status.includes('Approved') || tradeCase.status === 'Released' ? 'bg-green-50 border-green-100 text-green-600' : 'bg-blue-50 border-blue-100 text-blue-600'}`}>
                                   <Briefcase className="w-6 h-6" />
                               </div>
                               <div>
                                   <div className="flex items-center gap-2">
                                     <h4 className="font-bold text-gray-900 group-hover:text-orange-600 transition-colors">{tradeCase.reference}</h4>
                                     <Badge variant="outline" className="text-xs">{tradeCase.status}</Badge>
                                     {tradeCase.jurisdictionRisk === 'High' && <Badge variant="destructive" className="text-xs">High Risk</Badge>}
                                   </div>
                                   <p className="text-sm text-gray-600">
                                     {tradeCase.importer.name} <span className="text-gray-400 mx-1">→</span> {tradeCase.exporter.name}
                                   </p>
                                   <p className="text-xs text-gray-500 mt-1">
                                      Value: ${tradeCase.valueUsd.toLocaleString()} • Locked: {tradeCase.lockedGoldGrams}g Gold
                                   </p>
                               </div>
                             </div>
                             <div className="flex gap-2">
                               <Button variant="outline" size="sm">
                                 View Details
                               </Button>
                             </div>
                         </div>
                       ))}
                     </div>
                  </CardContent>
                </Card>
             </TabsContent>

             <TabsContent value="locked">
                <Card>
                  <CardHeader>
                    <CardTitle>Locked Settlement Funds</CardTitle>
                    <CardDescription>Global view of gold reserved for trade settlement.</CardDescription>
                  </CardHeader>
                  <CardContent>
                     <div className="space-y-4">
                       {cases.filter(c => c.lockedGoldGrams > 0).map((tradeCase) => (
                         <div key={tradeCase.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg">
                            <div className="flex items-center gap-4">
                               <div className="p-2 bg-amber-100 rounded text-amber-700">
                                 <Lock className="w-5 h-5" />
                               </div>
                               <div>
                                 <h4 className="font-bold text-gray-900">{tradeCase.lockedGoldGrams}g Gold</h4>
                                 <p className="text-sm text-gray-500">{tradeCase.reference} • {tradeCase.importer.name}</p>
                               </div>
                            </div>
                            <Badge variant="outline">{tradeCase.status}</Badge>
                         </div>
                       ))}
                     </div>
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
                                 <span className="font-bold">{log.actorName}</span> ({log.actorRole}) - {log.actionType}
                               </p>
                               <p className="text-sm text-gray-600">{log.details}</p>
                               {log.caseId && <p className="text-xs text-blue-500 mt-1">Case: {cases.find(c => c.id === log.caseId)?.reference || log.caseId}</p>}
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
             {selectedCase ? (
               <TradeCaseDetailAdmin 
                 tradeCase={selectedCase}
                 documents={documents.filter(d => d.caseId === selectedCase.id)}
                 approvals={approvals.filter(a => a.caseId === selectedCase.id)}
                 auditLogs={auditLogs.filter(a => a.caseId === selectedCase.id)}
                 onClose={() => setDetailOpen(false)}
                 onUpdateStatus={updateCaseStatus}
                 onAddAuditLog={addAuditLog}
                 onUpdateDocumentStatus={updateDocumentStatus}
                 onUpdateApproval={updateApproval}
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
