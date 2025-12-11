import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/pages/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Briefcase, Eye, CheckCircle, XCircle, AlertTriangle, TrendingUp, Lock, FileText, Plus, RefreshCw, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

const CURRENT_GOLD_PRICE = 78.50;

interface DbTradeCase {
  id: string;
  caseNumber: string;
  userId: string;
  companyName: string;
  tradeType: string;
  commodityType: string;
  tradeValueUsd: string;
  buyerName: string | null;
  buyerCountry: string | null;
  sellerName: string | null;
  sellerCountry: string | null;
  paymentTerms: string | null;
  shipmentDetails: string | null;
  status: string;
  riskLevel: string;
  opsApproval: boolean | null;
  opsApprovedBy: string | null;
  opsApprovedAt: string | null;
  complianceApproval: boolean | null;
  complianceApprovedBy: string | null;
  complianceApprovedAt: string | null;
  riskApproval: boolean | null;
  riskApprovedBy: string | null;
  riskApprovedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function FinaBridgeManagement() {
  const queryClient = useQueryClient();
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  
  const [newCaseData, setNewCaseData] = useState({
    userId: '',
    companyName: '',
    tradeType: 'Import',
    commodityType: '',
    tradeValueUsd: '',
    buyerName: '',
    buyerCountry: '',
    sellerName: '',
    sellerCountry: '',
    paymentTerms: '',
    shipmentDetails: '',
    riskLevel: 'Low',
    notes: ''
  });

  const { data: casesData, isLoading, refetch } = useQuery<{ cases: DbTradeCase[] }>({
    queryKey: ['/api/admin/trade/cases'],
    queryFn: async () => {
      const response = await fetch('/api/admin/trade/cases');
      if (!response.ok) throw new Error('Failed to fetch trade cases');
      return response.json();
    }
  });

  const { data: usersData } = useQuery<{ users: any[] }>({
    queryKey: ['/api/admin/users'],
    queryFn: async () => {
      const response = await fetch('/api/admin/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/trade/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create trade case');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/trade/cases'] });
      toast.success('Trade case created successfully');
      setCreateOpen(false);
      resetNewCaseForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const response = await fetch(`/api/trade/cases/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error('Failed to update trade case');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/trade/cases'] });
      toast.success('Trade case updated');
    }
  });

  const resetNewCaseForm = () => {
    setNewCaseData({
      userId: '',
      companyName: '',
      tradeType: 'Import',
      commodityType: '',
      tradeValueUsd: '',
      buyerName: '',
      buyerCountry: '',
      sellerName: '',
      sellerCountry: '',
      paymentTerms: '',
      shipmentDetails: '',
      riskLevel: 'Low',
      notes: ''
    });
  };

  const handleCreateCase = () => {
    if (!newCaseData.userId || !newCaseData.companyName || !newCaseData.commodityType || !newCaseData.tradeValueUsd) {
      toast.error('Please fill in all required fields');
      return;
    }

    const valueUsd = parseFloat(newCaseData.tradeValueUsd);
    if (isNaN(valueUsd) || valueUsd <= 0) {
      toast.error('Please enter a valid trade value');
      return;
    }

    createMutation.mutate({
      userId: newCaseData.userId,
      companyName: newCaseData.companyName,
      tradeType: newCaseData.tradeType,
      commodityType: newCaseData.commodityType,
      tradeValueUsd: valueUsd.toString(),
      buyerName: newCaseData.buyerName || null,
      buyerCountry: newCaseData.buyerCountry || null,
      sellerName: newCaseData.sellerName || null,
      sellerCountry: newCaseData.sellerCountry || null,
      paymentTerms: newCaseData.paymentTerms || null,
      shipmentDetails: newCaseData.shipmentDetails || null,
      status: 'Draft',
      riskLevel: newCaseData.riskLevel,
      notes: newCaseData.notes || null
    });
  };

  const handleUpdateStatus = (id: string, status: string) => {
    updateMutation.mutate({ id, updates: { status } });
  };

  const handleApproval = (id: string, approvalType: string, approved: boolean) => {
    const updates: any = {};
    if (approvalType === 'ops') {
      updates.opsApproval = approved;
      updates.opsApprovedAt = new Date().toISOString();
    } else if (approvalType === 'compliance') {
      updates.complianceApproval = approved;
      updates.complianceApprovedAt = new Date().toISOString();
    } else if (approvalType === 'risk') {
      updates.riskApproval = approved;
      updates.riskApprovedAt = new Date().toISOString();
    }
    updateMutation.mutate({ id, updates });
  };

  const cases = casesData?.cases || [];
  const users = usersData?.users || [];

  const safeParseFloat = (val: any) => {
    const num = parseFloat(val);
    return isNaN(num) ? 0 : num;
  };

  const totalValueUsd = cases.reduce((sum, c) => sum + safeParseFloat(c.tradeValueUsd), 0);
  const pendingCases = cases.filter(c => c.status === 'Under Review' || c.status === 'Submitted').length;
  const highRiskCases = cases.filter(c => c.riskLevel === 'High' || c.riskLevel === 'Critical').length;
  const activeCases = cases.filter(c => c.status !== 'Settled' && c.status !== 'Rejected' && c.status !== 'Cancelled').length;

  const selectedCase = cases.find(c => c.id === selectedCaseId);

  const getStatusColor = (status: string) => {
    if (status === 'Approved' || status === 'Active' || status === 'Settled') return 'bg-green-100 text-green-800';
    if (status === 'Rejected' || status === 'Cancelled') return 'bg-red-100 text-red-800';
    if (status === 'Under Review' || status === 'Submitted') return 'bg-yellow-100 text-yellow-800';
    if (status === 'Draft') return 'bg-gray-100 text-gray-800';
    return 'bg-blue-100 text-blue-800';
  };

  const getRiskColor = (risk: string) => {
    if (risk === 'High' || risk === 'Critical') return 'bg-red-600 text-white';
    if (risk === 'Medium') return 'bg-yellow-600 text-white';
    return 'bg-green-600 text-white';
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900" data-testid="text-finabridge-title">FinaBridge – Trade Finance Admin</h1>
            <p className="text-gray-500">Manage gold-backed trade cases, documents, and settlements.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()} data-testid="button-refresh-cases">
              <RefreshCw className="w-4 h-4 mr-2" /> Refresh
            </Button>
            <Button onClick={() => setCreateOpen(true)} className="bg-orange-600 hover:bg-orange-700" data-testid="button-create-case">
              <Plus className="w-4 h-4 mr-2" /> New Trade Case
            </Button>
          </div>
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
                  <h3 className="text-2xl font-bold text-blue-700" data-testid="text-active-cases">{activeCases}</h3>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-amber-50 border-amber-100">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-100 text-amber-700 rounded-lg">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-amber-900">Total Trade Value</p>
                  <h3 className="text-2xl font-bold text-amber-700">${totalValueUsd.toLocaleString()}</h3>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-50 border-green-100">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 text-green-700 rounded-lg">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-green-900">Pending Review</p>
                  <h3 className="text-2xl font-bold text-green-700">{pendingCases}</h3>
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
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : (
          <Tabs defaultValue="cases" className="w-full">
            <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent space-x-6">
              <TabsTrigger value="cases" className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 py-3 px-1">
                Trade Cases ({cases.length})
              </TabsTrigger>
              <TabsTrigger value="compliance" className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 py-3 px-1">
                Compliance & Risk
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
                    {cases.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-30" />
                        <p>No trade cases found.</p>
                        <Button onClick={() => setCreateOpen(true)} variant="outline" className="mt-4">
                          <Plus className="w-4 h-4 mr-2" /> Create First Trade Case
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {cases.map((tradeCase) => (
                          <div 
                            key={tradeCase.id} 
                            onClick={() => { setSelectedCaseId(tradeCase.id); setDetailOpen(true); }}
                            className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-gray-100 rounded-lg bg-white hover:bg-gray-50 transition-colors cursor-pointer group"
                            data-testid={`card-trade-case-${tradeCase.id}`}
                          >
                            <div className="flex items-center gap-4 mb-4 md:mb-0">
                              <div className={`p-2 rounded border ${tradeCase.status === 'Approved' || tradeCase.status === 'Active' || tradeCase.status === 'Settled' ? 'bg-green-50 border-green-100 text-green-600' : 'bg-blue-50 border-blue-100 text-blue-600'}`}>
                                <Briefcase className="w-6 h-6" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="font-bold text-gray-900 group-hover:text-orange-600 transition-colors">{tradeCase.caseNumber}</h4>
                                  <Badge className={getStatusColor(tradeCase.status)}>{tradeCase.status}</Badge>
                                  {(tradeCase.riskLevel === 'High' || tradeCase.riskLevel === 'Critical') && 
                                    <Badge className="bg-red-600 text-white">High Risk</Badge>
                                  }
                                </div>
                                <p className="text-sm text-gray-600">
                                  {tradeCase.companyName} • {tradeCase.tradeType}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  Value: ${safeParseFloat(tradeCase.tradeValueUsd).toLocaleString()} • 
                                  Commodity: {tradeCase.commodityType}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" data-testid={`button-view-case-${tradeCase.id}`}>
                                <Eye className="w-4 h-4 mr-1" /> View Details
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="compliance">
                <Card>
                  <CardHeader>
                    <CardTitle>Compliance & Risk Monitor</CardTitle>
                    <CardDescription>High risk cases and approval status.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {cases.map((c) => (
                        <div key={c.id} className="p-4 border rounded-lg flex justify-between items-center">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold">{c.caseNumber}</h4>
                              <Badge className={getRiskColor(c.riskLevel)}>{c.riskLevel} Risk</Badge>
                              <Badge className={getStatusColor(c.status)}>{c.status}</Badge>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {c.companyName} • {c.tradeType} • {c.commodityType}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Value: ${safeParseFloat(c.tradeValueUsd).toLocaleString()}
                            </p>
                            <div className="flex gap-2 mt-2">
                              <Badge variant="outline" className={c.opsApproval ? 'border-green-300 bg-green-50' : 'border-gray-300'}>
                                Ops: {c.opsApproval ? 'Approved' : 'Pending'}
                              </Badge>
                              <Badge variant="outline" className={c.complianceApproval ? 'border-green-300 bg-green-50' : 'border-gray-300'}>
                                Compliance: {c.complianceApproval ? 'Approved' : 'Pending'}
                              </Badge>
                              <Badge variant="outline" className={c.riskApproval ? 'border-green-300 bg-green-50' : 'border-gray-300'}>
                                Risk: {c.riskApproval ? 'Approved' : 'Pending'}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {c.status === 'Under Review' || c.status === 'Submitted' ? (
                              <>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="border-red-200 text-red-700 hover:bg-red-50"
                                  onClick={(e) => { e.stopPropagation(); handleUpdateStatus(c.id, 'Rejected'); }}
                                >
                                  <XCircle className="w-4 h-4 mr-1" /> Reject
                                </Button>
                                <Button 
                                  size="sm" 
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={(e) => { e.stopPropagation(); handleUpdateStatus(c.id, 'Approved'); }}
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" /> Approve
                                </Button>
                              </>
                            ) : (
                              <Button variant="outline" size="sm" onClick={() => { setSelectedCaseId(c.id); setDetailOpen(true); }}>
                                Review
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        )}

        {/* Detail Modal */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Trade Case Details</DialogTitle>
              <DialogDescription>
                {selectedCase?.caseNumber} - {selectedCase?.companyName}
              </DialogDescription>
            </DialogHeader>
            {selectedCase && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-500">Status</Label>
                    <Badge className={`mt-1 ${getStatusColor(selectedCase.status)}`}>{selectedCase.status}</Badge>
                  </div>
                  <div>
                    <Label className="text-gray-500">Risk Level</Label>
                    <Badge className={`mt-1 ${getRiskColor(selectedCase.riskLevel)}`}>{selectedCase.riskLevel}</Badge>
                  </div>
                  <div>
                    <Label className="text-gray-500">Trade Type</Label>
                    <p className="font-medium">{selectedCase.tradeType}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Commodity</Label>
                    <p className="font-medium">{selectedCase.commodityType}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Trade Value (USD)</Label>
                    <p className="font-medium">${safeParseFloat(selectedCase.tradeValueUsd).toLocaleString()}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Gold Equivalent</Label>
                    <p className="font-medium">{(safeParseFloat(selectedCase.tradeValueUsd) / CURRENT_GOLD_PRICE).toFixed(2)}g</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-500">Buyer</Label>
                    <p className="font-medium">{selectedCase.buyerName || 'Not specified'}</p>
                    <p className="text-sm text-gray-500">{selectedCase.buyerCountry || ''}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Seller</Label>
                    <p className="font-medium">{selectedCase.sellerName || 'Not specified'}</p>
                    <p className="text-sm text-gray-500">{selectedCase.sellerCountry || ''}</p>
                  </div>
                </div>

                {selectedCase.paymentTerms && (
                  <div>
                    <Label className="text-gray-500">Payment Terms</Label>
                    <p className="font-medium">{selectedCase.paymentTerms}</p>
                  </div>
                )}

                {selectedCase.shipmentDetails && (
                  <div>
                    <Label className="text-gray-500">Shipment Details</Label>
                    <p className="font-medium">{selectedCase.shipmentDetails}</p>
                  </div>
                )}

                {selectedCase.notes && (
                  <div>
                    <Label className="text-gray-500">Notes</Label>
                    <p className="mt-1 text-sm text-gray-700 bg-gray-50 p-3 rounded">{selectedCase.notes}</p>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <Label className="text-gray-500 block mb-2">Approval Status</Label>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 border rounded">
                      <p className="text-xs text-gray-500">Operations</p>
                      <Badge className={selectedCase.opsApproval ? 'bg-green-600' : 'bg-gray-400'}>
                        {selectedCase.opsApproval ? 'Approved' : 'Pending'}
                      </Badge>
                      {!selectedCase.opsApproval && selectedCase.status !== 'Rejected' && (
                        <Button size="sm" variant="outline" className="mt-2 w-full" onClick={() => handleApproval(selectedCase.id, 'ops', true)}>
                          Approve
                        </Button>
                      )}
                    </div>
                    <div className="text-center p-3 border rounded">
                      <p className="text-xs text-gray-500">Compliance</p>
                      <Badge className={selectedCase.complianceApproval ? 'bg-green-600' : 'bg-gray-400'}>
                        {selectedCase.complianceApproval ? 'Approved' : 'Pending'}
                      </Badge>
                      {!selectedCase.complianceApproval && selectedCase.status !== 'Rejected' && (
                        <Button size="sm" variant="outline" className="mt-2 w-full" onClick={() => handleApproval(selectedCase.id, 'compliance', true)}>
                          Approve
                        </Button>
                      )}
                    </div>
                    <div className="text-center p-3 border rounded">
                      <p className="text-xs text-gray-500">Risk</p>
                      <Badge className={selectedCase.riskApproval ? 'bg-green-600' : 'bg-gray-400'}>
                        {selectedCase.riskApproval ? 'Approved' : 'Pending'}
                      </Badge>
                      {!selectedCase.riskApproval && selectedCase.status !== 'Rejected' && (
                        <Button size="sm" variant="outline" className="mt-2 w-full" onClick={() => handleApproval(selectedCase.id, 'risk', true)}>
                          Approve
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  {(selectedCase.status === 'Under Review' || selectedCase.status === 'Submitted') && (
                    <>
                      <Button 
                        variant="outline"
                        className="border-red-200 text-red-700 hover:bg-red-50"
                        onClick={() => { handleUpdateStatus(selectedCase.id, 'Rejected'); setDetailOpen(false); }}
                      >
                        <XCircle className="w-4 h-4 mr-2" /> Reject
                      </Button>
                      <Button 
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => { handleUpdateStatus(selectedCase.id, 'Approved'); setDetailOpen(false); }}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" /> Approve
                      </Button>
                    </>
                  )}
                  {selectedCase.status === 'Draft' && (
                    <Button 
                      className="bg-orange-600 hover:bg-orange-700"
                      onClick={() => { handleUpdateStatus(selectedCase.id, 'Submitted'); setDetailOpen(false); }}
                    >
                      Submit for Review
                    </Button>
                  )}
                  {selectedCase.status === 'Approved' && (
                    <Button 
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() => { handleUpdateStatus(selectedCase.id, 'Active'); setDetailOpen(false); }}
                    >
                      Mark Active
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => setDetailOpen(false)}>Close</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Create Trade Case Modal */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Trade Case</DialogTitle>
              <DialogDescription>Set up a new trade finance case for a corporate client.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Client (User) *</Label>
                  <Select value={newCaseData.userId} onValueChange={(v) => setNewCaseData({...newCaseData, userId: v})}>
                    <SelectTrigger data-testid="select-client">
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map(u => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.firstName} {u.lastName} ({u.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Company Name *</Label>
                  <Input 
                    value={newCaseData.companyName}
                    onChange={(e) => setNewCaseData({...newCaseData, companyName: e.target.value})}
                    placeholder="e.g., Acme Trading Co."
                    data-testid="input-company-name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Trade Type *</Label>
                  <Select value={newCaseData.tradeType} onValueChange={(v) => setNewCaseData({...newCaseData, tradeType: v})}>
                    <SelectTrigger data-testid="select-trade-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Import">Import</SelectItem>
                      <SelectItem value="Export">Export</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Commodity Type *</Label>
                  <Input 
                    value={newCaseData.commodityType}
                    onChange={(e) => setNewCaseData({...newCaseData, commodityType: e.target.value})}
                    placeholder="e.g., Electronics, Raw Materials"
                    data-testid="input-commodity-type"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Trade Value (USD) *</Label>
                  <Input 
                    type="number"
                    value={newCaseData.tradeValueUsd}
                    onChange={(e) => setNewCaseData({...newCaseData, tradeValueUsd: e.target.value})}
                    placeholder="e.g., 150000"
                    data-testid="input-value-usd"
                  />
                </div>
                <div>
                  <Label>Risk Level</Label>
                  <Select value={newCaseData.riskLevel} onValueChange={(v) => setNewCaseData({...newCaseData, riskLevel: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Buyer Name</Label>
                  <Input 
                    value={newCaseData.buyerName}
                    onChange={(e) => setNewCaseData({...newCaseData, buyerName: e.target.value})}
                    placeholder="Buyer company name"
                    data-testid="input-buyer-name"
                  />
                </div>
                <div>
                  <Label>Buyer Country</Label>
                  <Input 
                    value={newCaseData.buyerCountry}
                    onChange={(e) => setNewCaseData({...newCaseData, buyerCountry: e.target.value})}
                    placeholder="e.g., USA"
                    data-testid="input-buyer-country"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Seller Name</Label>
                  <Input 
                    value={newCaseData.sellerName}
                    onChange={(e) => setNewCaseData({...newCaseData, sellerName: e.target.value})}
                    placeholder="Seller company name"
                    data-testid="input-seller-name"
                  />
                </div>
                <div>
                  <Label>Seller Country</Label>
                  <Input 
                    value={newCaseData.sellerCountry}
                    onChange={(e) => setNewCaseData({...newCaseData, sellerCountry: e.target.value})}
                    placeholder="e.g., China"
                    data-testid="input-seller-country"
                  />
                </div>
              </div>

              <div>
                <Label>Payment Terms</Label>
                <Input 
                  value={newCaseData.paymentTerms}
                  onChange={(e) => setNewCaseData({...newCaseData, paymentTerms: e.target.value})}
                  placeholder="e.g., LC at Sight, Net 30"
                  data-testid="input-payment-terms"
                />
              </div>

              <div>
                <Label>Shipment Details</Label>
                <Textarea 
                  value={newCaseData.shipmentDetails}
                  onChange={(e) => setNewCaseData({...newCaseData, shipmentDetails: e.target.value})}
                  placeholder="Describe shipment method, timeline, etc."
                  data-testid="input-shipment-details"
                />
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea 
                  value={newCaseData.notes}
                  onChange={(e) => setNewCaseData({...newCaseData, notes: e.target.value})}
                  placeholder="Additional notes..."
                  data-testid="input-notes"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateCase} className="bg-orange-600 hover:bg-orange-700" disabled={createMutation.isPending} data-testid="button-submit-case">
                {createMutation.isPending ? 'Creating...' : 'Create Trade Case'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
