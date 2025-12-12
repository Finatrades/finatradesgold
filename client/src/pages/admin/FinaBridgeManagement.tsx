import React, { useState, useEffect } from 'react';
import AdminLayout from '@/pages/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Briefcase, CheckCircle, XCircle, AlertTriangle, TrendingUp, Lock, Loader2, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  opsApproval: boolean;
  opsApprovedBy: string | null;
  opsApprovedAt: string | null;
  complianceApproval: boolean;
  complianceApprovedBy: string | null;
  complianceApprovedAt: string | null;
  riskApproval: boolean;
  riskApprovedBy: string | null;
  riskApprovedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

const CURRENT_GOLD_PRICE = 85.22;

export default function FinaBridgeManagement() {
  const { toast } = useToast();
  const [cases, setCases] = useState<DbTradeCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState<DbTradeCase | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');

  const fetchCases = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('GET', '/api/admin/trade/cases');
      const data = await res.json();
      setCases(data.cases || []);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load trade cases', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  const handleOpenCase = (tradeCase: DbTradeCase) => {
    setSelectedCase(tradeCase);
    setAdminNotes(tradeCase.notes || '');
    setDetailOpen(true);
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedCase) return;
    setUpdating(true);
    try {
      const res = await apiRequest('PATCH', `/api/trade/cases/${selectedCase.id}`, {
        status: newStatus,
        notes: adminNotes
      });
      const data = await res.json();
      setCases(cases.map(c => c.id === selectedCase.id ? data.tradeCase : c));
      setSelectedCase(data.tradeCase);
      toast({ title: 'Status Updated', description: `Case status changed to ${newStatus}` });
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
    } finally {
      setUpdating(false);
    }
  };

  const handleApproval = async (type: 'ops' | 'compliance' | 'risk', approved: boolean) => {
    if (!selectedCase) return;
    setUpdating(true);
    try {
      const updates: any = { notes: adminNotes };
      if (type === 'ops') updates.opsApproval = approved;
      if (type === 'compliance') updates.complianceApproval = approved;
      if (type === 'risk') updates.riskApproval = approved;

      const res = await apiRequest('PATCH', `/api/trade/cases/${selectedCase.id}`, updates);
      const data = await res.json();
      setCases(cases.map(c => c.id === selectedCase.id ? data.tradeCase : c));
      setSelectedCase(data.tradeCase);
      toast({ title: 'Approval Updated', description: `${type} approval ${approved ? 'granted' : 'revoked'}` });
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to update approval', variant: 'destructive' });
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateRiskLevel = async (riskLevel: string) => {
    if (!selectedCase) return;
    setUpdating(true);
    try {
      const res = await apiRequest('PATCH', `/api/trade/cases/${selectedCase.id}`, {
        riskLevel,
        notes: adminNotes
      });
      const data = await res.json();
      setCases(cases.map(c => c.id === selectedCase.id ? data.tradeCase : c));
      setSelectedCase(data.tradeCase);
      toast({ title: 'Risk Level Updated', description: `Risk level set to ${riskLevel}` });
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to update risk level', variant: 'destructive' });
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft': return 'bg-gray-100 text-gray-700';
      case 'Submitted': return 'bg-blue-100 text-blue-700';
      case 'Under Review': return 'bg-amber-100 text-amber-700';
      case 'Approved': return 'bg-green-100 text-green-700';
      case 'Active': return 'bg-purple-100 text-purple-700';
      case 'Settled': return 'bg-emerald-100 text-emerald-700';
      case 'Cancelled': return 'bg-red-100 text-red-700';
      case 'Rejected': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Low': return 'bg-green-600';
      case 'Medium': return 'bg-yellow-600';
      case 'High': return 'bg-red-600';
      default: return 'bg-gray-600';
    }
  };

  const totalValueUsd = cases.reduce((sum, c) => sum + parseFloat(c.tradeValueUsd || '0'), 0);
  const totalValueGold = totalValueUsd / CURRENT_GOLD_PRICE;
  const pendingCases = cases.filter(c => c.status === 'Under Review' || c.status === 'Submitted').length;
  const highRiskCases = cases.filter(c => c.riskLevel === 'High').length;
  const activeCases = cases.filter(c => c.status !== 'Settled' && c.status !== 'Rejected' && c.status !== 'Cancelled').length;

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">FinaBridge – Trade Finance Admin</h1>
            <p className="text-gray-500">Manage gold-backed trade cases, documents, and settlements.</p>
          </div>
          <Button variant="outline" onClick={fetchCases} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-blue-50 border-blue-100">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 text-blue-700 rounded-lg">
                  <Briefcase className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-900">Active Trade Cases</p>
                  <h3 className="text-2xl font-bold text-blue-700">{activeCases}</h3>
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
                  <TrendingUp className="w-6 h-6" />
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

        <Tabs defaultValue="cases" className="w-full">
          <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent space-x-6">
            <TabsTrigger value="cases" className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 py-3 px-1">
              All Trade Cases
            </TabsTrigger>
            <TabsTrigger value="pending" className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 py-3 px-1">
              Pending Approval
            </TabsTrigger>
            <TabsTrigger value="risk" className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 py-3 px-1">
              Risk Monitor
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="cases">
              <Card>
                <CardHeader>
                  <CardTitle>Trade Case Management</CardTitle>
                  <CardDescription>View and manage all corporate trade deals.</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="p-12 text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
                      <p className="mt-4 text-gray-500">Loading trade cases...</p>
                    </div>
                  ) : cases.length === 0 ? (
                    <div className="p-12 text-center">
                      <Briefcase className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <h3 className="text-lg font-bold text-gray-900 mb-2">No Trade Cases</h3>
                      <p className="text-gray-500">Trade cases will appear here when users create them.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {cases.map((tradeCase) => (
                        <div 
                          key={tradeCase.id} 
                          onClick={() => handleOpenCase(tradeCase)} 
                          className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-gray-100 rounded-lg bg-white hover:bg-gray-50 transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center gap-4 mb-4 md:mb-0">
                            <div className={`p-2 rounded border ${tradeCase.status === 'Approved' || tradeCase.status === 'Settled' ? 'bg-green-50 border-green-100 text-green-600' : 'bg-blue-50 border-blue-100 text-blue-600'}`}>
                              <Briefcase className="w-6 h-6" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-gray-900 group-hover:text-orange-600 transition-colors">{tradeCase.caseNumber}</h4>
                                <Badge className={getStatusColor(tradeCase.status)}>{tradeCase.status}</Badge>
                                {tradeCase.riskLevel === 'High' && <Badge className="bg-red-600 text-white">High Risk</Badge>}
                              </div>
                              <p className="text-sm text-gray-600">{tradeCase.companyName} - {tradeCase.tradeType}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                Value: ${parseFloat(tradeCase.tradeValueUsd).toLocaleString()} | {tradeCase.commodityType}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1">
                              <span className={`px-2 py-1 rounded text-xs ${tradeCase.opsApproval ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                Ops
                              </span>
                              <span className={`px-2 py-1 rounded text-xs ${tradeCase.complianceApproval ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                Comp
                              </span>
                              <span className={`px-2 py-1 rounded text-xs ${tradeCase.riskApproval ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                Risk
                              </span>
                            </div>
                            <Button variant="outline" size="sm">
                              Review
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pending">
              <Card>
                <CardHeader>
                  <CardTitle>Pending Approvals</CardTitle>
                  <CardDescription>Cases awaiting review and approval.</CardDescription>
                </CardHeader>
                <CardContent>
                  {cases.filter(c => c.status === 'Submitted' || c.status === 'Under Review').length === 0 ? (
                    <div className="p-12 text-center">
                      <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-300" />
                      <h3 className="text-lg font-bold text-gray-900 mb-2">All Caught Up</h3>
                      <p className="text-gray-500">No pending approvals at this time.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {cases.filter(c => c.status === 'Submitted' || c.status === 'Under Review').map((tradeCase) => (
                        <div 
                          key={tradeCase.id} 
                          onClick={() => handleOpenCase(tradeCase)} 
                          className="flex items-center justify-between p-4 border border-amber-100 rounded-lg bg-amber-50 hover:bg-amber-100 transition-colors cursor-pointer"
                        >
                          <div>
                            <h4 className="font-bold">{tradeCase.caseNumber}</h4>
                            <p className="text-sm text-gray-600">{tradeCase.companyName} - ${parseFloat(tradeCase.tradeValueUsd).toLocaleString()}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" className="bg-green-600 hover:bg-green-700">
                              <CheckCircle className="w-4 h-4 mr-1" /> Approve
                            </Button>
                            <Button size="sm" variant="destructive">
                              <XCircle className="w-4 h-4 mr-1" /> Reject
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="risk">
              <Card>
                <CardHeader>
                  <CardTitle>Risk Monitor</CardTitle>
                  <CardDescription>High risk cases requiring attention.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {cases.map((c) => (
                      <div key={c.id} className="p-4 border rounded-lg flex justify-between items-center">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold">{c.caseNumber}</h4>
                            <Badge className={getRiskColor(c.riskLevel)}>{c.riskLevel} Risk</Badge>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{c.companyName} ({c.tradeType})</p>
                          <p className="text-xs text-gray-500">
                            {c.buyerName || 'TBD'} ({c.buyerCountry || '-'}) → {c.sellerName || 'TBD'} ({c.sellerCountry || '-'})
                          </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleOpenCase(c)}>Review</Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>

        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-[800px] max-h-[90vh] overflow-y-auto">
            {selectedCase && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3">
                    <span>{selectedCase.caseNumber}</span>
                    <Badge className={getStatusColor(selectedCase.status)}>{selectedCase.status}</Badge>
                  </DialogTitle>
                  <DialogDescription>
                    {selectedCase.companyName} - {selectedCase.tradeType} - {selectedCase.commodityType}
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-6 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Trade Value</p>
                      <p className="text-xl font-bold">${parseFloat(selectedCase.tradeValueUsd).toLocaleString()}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Risk Level</p>
                      <Select value={selectedCase.riskLevel} onValueChange={handleUpdateRiskLevel} disabled={updating}>
                        <SelectTrigger className="w-full mt-1">
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

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <h4 className="font-semibold border-b pb-2">Buyer Details</h4>
                      <p><span className="text-gray-500">Name:</span> {selectedCase.buyerName || 'Not specified'}</p>
                      <p><span className="text-gray-500">Country:</span> {selectedCase.buyerCountry || 'Not specified'}</p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold border-b pb-2">Seller Details</h4>
                      <p><span className="text-gray-500">Name:</span> {selectedCase.sellerName || 'Not specified'}</p>
                      <p><span className="text-gray-500">Country:</span> {selectedCase.sellerCountry || 'Not specified'}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold border-b pb-2">Additional Info</h4>
                    <p><span className="text-gray-500">Payment Terms:</span> {selectedCase.paymentTerms || 'Not specified'}</p>
                    <p><span className="text-gray-500">Shipment Details:</span> {selectedCase.shipmentDetails || 'Not specified'}</p>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold border-b pb-2">Approval Status</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className={`p-4 rounded-lg border ${selectedCase.opsApproval ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">Operations</span>
                          {selectedCase.opsApproval ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <XCircle className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                        <Button 
                          size="sm" 
                          variant={selectedCase.opsApproval ? "destructive" : "default"}
                          className="w-full"
                          onClick={() => handleApproval('ops', !selectedCase.opsApproval)}
                          disabled={updating}
                        >
                          {selectedCase.opsApproval ? 'Revoke' : 'Approve'}
                        </Button>
                      </div>
                      <div className={`p-4 rounded-lg border ${selectedCase.complianceApproval ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">Compliance</span>
                          {selectedCase.complianceApproval ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <XCircle className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                        <Button 
                          size="sm" 
                          variant={selectedCase.complianceApproval ? "destructive" : "default"}
                          className="w-full"
                          onClick={() => handleApproval('compliance', !selectedCase.complianceApproval)}
                          disabled={updating}
                        >
                          {selectedCase.complianceApproval ? 'Revoke' : 'Approve'}
                        </Button>
                      </div>
                      <div className={`p-4 rounded-lg border ${selectedCase.riskApproval ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">Risk</span>
                          {selectedCase.riskApproval ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <XCircle className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                        <Button 
                          size="sm" 
                          variant={selectedCase.riskApproval ? "destructive" : "default"}
                          className="w-full"
                          onClick={() => handleApproval('risk', !selectedCase.riskApproval)}
                          disabled={updating}
                        >
                          {selectedCase.riskApproval ? 'Revoke' : 'Approve'}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="font-semibold">Admin Notes</label>
                    <Textarea 
                      value={adminNotes} 
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Add notes about this case..."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="font-semibold">Update Status</label>
                    <div className="flex flex-wrap gap-2">
                      {['Submitted', 'Under Review', 'Approved', 'Active', 'Settled', 'Rejected', 'Cancelled'].map((status) => (
                        <Button
                          key={status}
                          size="sm"
                          variant={selectedCase.status === status ? 'default' : 'outline'}
                          onClick={() => handleUpdateStatus(status)}
                          disabled={updating || selectedCase.status === status}
                        >
                          {status}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setDetailOpen(false)}>Close</Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
