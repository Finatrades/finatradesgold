import React, { useState, useEffect } from 'react';
import AdminLayout from '@/pages/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Briefcase, CheckCircle, XCircle, TrendingUp, 
  Loader2, RefreshCw, Eye, Send, ArrowRight, Package, FileCheck, AlertCircle,
  ChevronDown, ChevronUp, Ship, Building, Phone, Mail, Calendar, Edit3
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';

interface TradeRequest {
  id: string;
  tradeRefId: string;
  importerUserId: string;
  goodsName: string;
  description: string | null;
  quantity: string | null;
  incoterms: string | null;
  destination: string | null;
  expectedShipDate: string | null;
  tradeValueUsd: string;
  settlementGoldGrams: string;
  currency: string;
  status: string;
  createdAt: string;
  importer?: {
    id: string;
    finatradesId: string | null;
    fullName: string;
    email: string;
    companyName: string | null;
  };
  proposalCount: number;
}

interface TradeProposal {
  id: string;
  tradeRequestId: string;
  exporterUserId: string;
  quotePrice: string;
  timelineDays: number;
  notes: string | null;
  status: string;
  createdAt: string;
  portOfLoading: string | null;
  shippingMethod: string | null;
  incoterms: string | null;
  paymentTerms: string | null;
  estimatedDeliveryDate: string | null;
  insuranceIncluded: boolean | null;
  certificationsAvailable: string | null;
  companyName: string | null;
  companyRegistration: string | null;
  contactPerson: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  modificationRequest: string | null;
  exporter?: {
    id: string;
    finatradesId: string | null;
    fullName: string;
    email: string;
    companyName: string | null;
  };
}

interface DisclaimerUser {
  id: string;
  finatradesId: string | null;
  fullName: string;
  email: string;
  companyName: string | null;
  finabridgeDisclaimerAcceptedAt: string | null;
}

export default function FinaBridgeManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<TradeRequest[]>([]);
  const [proposals, setProposals] = useState<TradeProposal[]>([]);
  const [disclaimerUsers, setDisclaimerUsers] = useState<DisclaimerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<TradeRequest | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [selectedProposals, setSelectedProposals] = useState<string[]>([]);
  const [expandedProposal, setExpandedProposal] = useState<string | null>(null);
  const [modificationDialog, setModificationDialog] = useState<TradeProposal | null>(null);
  const [modificationText, setModificationText] = useState('');

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('GET', '/api/admin/finabridge/requests');
      const data = await res.json();
      setRequests(data.requests || []);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load trade requests', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchProposals = async (requestId: string) => {
    try {
      const res = await apiRequest('GET', `/api/admin/finabridge/requests/${requestId}/proposals`);
      const data = await res.json();
      setProposals(data.proposals || []);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load proposals', variant: 'destructive' });
    }
  };

  const fetchDisclaimerUsers = async () => {
    try {
      const res = await apiRequest('GET', '/api/admin/finabridge/disclaimer-acceptances');
      const data = await res.json();
      setDisclaimerUsers(data.users || []);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load disclaimer acceptances', variant: 'destructive' });
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchDisclaimerUsers();
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchRequests();
      fetchDisclaimerUsers();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenRequest = async (request: TradeRequest) => {
    setSelectedRequest(request);
    setSelectedProposals([]);
    await fetchProposals(request.id);
    setDetailOpen(true);
  };

  const handleShortlist = async (proposalId: string) => {
    setUpdating(true);
    try {
      await apiRequest('POST', `/api/admin/finabridge/proposals/${proposalId}/shortlist`);
      toast({ title: 'Success', description: 'Proposal shortlisted' });
      if (selectedRequest) {
        await fetchProposals(selectedRequest.id);
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to shortlist proposal', variant: 'destructive' });
    } finally {
      setUpdating(false);
    }
  };

  const handleReject = async (proposalId: string) => {
    setUpdating(true);
    try {
      await apiRequest('POST', `/api/admin/finabridge/proposals/${proposalId}/reject`);
      toast({ title: 'Success', description: 'Proposal rejected' });
      if (selectedRequest) {
        await fetchProposals(selectedRequest.id);
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to reject proposal', variant: 'destructive' });
    } finally {
      setUpdating(false);
    }
  };

  const handleForwardProposals = async () => {
    if (!selectedRequest || !user || selectedProposals.length === 0) return;
    setUpdating(true);
    try {
      await apiRequest('POST', `/api/admin/finabridge/requests/${selectedRequest.id}/forward-proposals`, {
        proposalIds: selectedProposals,
        adminId: user.id,
      });
      toast({ title: 'Success', description: `${selectedProposals.length} proposals forwarded to importer` });
      setDetailOpen(false);
      fetchRequests();
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to forward proposals', variant: 'destructive' });
    } finally {
      setUpdating(false);
    }
  };

  const toggleProposalSelection = (proposalId: string) => {
    if (selectedProposals.includes(proposalId)) {
      setSelectedProposals(selectedProposals.filter(id => id !== proposalId));
    } else {
      setSelectedProposals([...selectedProposals, proposalId]);
    }
  };

  const handleRequestModification = async () => {
    if (!modificationDialog || !modificationText.trim()) return;
    setUpdating(true);
    try {
      await apiRequest('POST', `/api/admin/finabridge/proposals/${modificationDialog.id}/request-modification`, {
        modificationRequest: modificationText.trim()
      });
      toast({ title: 'Success', description: 'Modification request sent to exporter' });
      setModificationDialog(null);
      setModificationText('');
      if (selectedRequest) {
        await fetchProposals(selectedRequest.id);
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to send modification request', variant: 'destructive' });
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft': return 'bg-gray-100 text-gray-700';
      case 'Open': return 'bg-blue-100 text-blue-700';
      case 'Proposal Review': return 'bg-amber-100 text-amber-700';
      case 'Awaiting Importer': return 'bg-purple-100 text-purple-700';
      case 'Active Trade': return 'bg-green-100 text-green-700';
      case 'Completed': return 'bg-emerald-100 text-emerald-700';
      case 'Cancelled': return 'bg-red-100 text-red-700';
      case 'Submitted': return 'bg-blue-100 text-blue-700';
      case 'Shortlisted': return 'bg-amber-100 text-amber-700';
      case 'Forwarded': return 'bg-purple-100 text-purple-700';
      case 'Accepted': return 'bg-green-100 text-green-700';
      case 'Rejected': return 'bg-red-100 text-red-700';
      case 'Declined': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const stats = {
    total: requests.length,
    open: requests.filter(r => r.status === 'Open' || r.status === 'Proposal Review').length,
    awaitingImporter: requests.filter(r => r.status === 'Awaiting Importer').length,
    activeTrades: requests.filter(r => r.status === 'Active Trade').length,
    completed: requests.filter(r => r.status === 'Completed').length,
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-secondary/10 rounded-lg">
              <Briefcase className="w-6 h-6 text-secondary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">FinaBridge Management</h1>
              <p className="text-muted-foreground">Trade request matching and proposal moderation</p>
            </div>
          </div>
          <Button onClick={fetchRequests} variant="outline" disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Requests</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.open}</p>
              <p className="text-xs text-muted-foreground">Open / Review</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-purple-600">{stats.awaitingImporter}</p>
              <p className="text-xs text-muted-foreground">Awaiting Importer</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{stats.activeTrades}</p>
              <p className="text-xs text-muted-foreground">Active Trades</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-emerald-600">{stats.completed}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all">All Requests</TabsTrigger>
            <TabsTrigger value="review">Needs Review</TabsTrigger>
            <TabsTrigger value="active">Active Trades</TabsTrigger>
            <TabsTrigger value="disclaimer">Disclaimer Acceptance</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            {loading ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
                  <p className="mt-4 text-muted-foreground">Loading trade requests...</p>
                </CardContent>
              </Card>
            ) : requests.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center text-muted-foreground">
                  <Package className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p>No trade requests found.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {requests.map((request) => (
                  <Card key={request.id} className="hover:border-secondary/50 transition-colors cursor-pointer" onClick={() => handleOpenRequest(request)}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-secondary/10 rounded-lg">
                            <Package className="w-5 h-5 text-secondary" />
                          </div>
                          <div>
                            <h3 className="font-bold">{request.tradeRefId}</h3>
                            <p className="text-sm text-muted-foreground">{request.goodsName}</p>
                            <p className="text-xs text-muted-foreground">
                              Importer: {request.importer?.fullName || 'Unknown'} ({request.importer?.finatradesId || 'N/A'})
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-bold">${parseFloat(request.tradeValueUsd).toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">{request.proposalCount} proposals</p>
                          </div>
                          <Badge className={getStatusColor(request.status)}>{request.status}</Badge>
                          <Button size="sm" variant="ghost">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="review" className="mt-4">
            <div className="space-y-3">
              {requests.filter(r => r.status === 'Open' || r.status === 'Proposal Review').map((request) => (
                <Card key={request.id} className="hover:border-secondary/50 transition-colors cursor-pointer" onClick={() => handleOpenRequest(request)}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-amber-100 rounded-lg">
                          <TrendingUp className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                          <h3 className="font-bold">{request.tradeRefId}</h3>
                          <p className="text-sm text-muted-foreground">{request.goodsName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="font-bold">{request.proposalCount} proposals</p>
                        <Badge className={getStatusColor(request.status)}>{request.status}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {requests.filter(r => r.status === 'Open' || r.status === 'Proposal Review').length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    No requests pending review.
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="active" className="mt-4">
            <div className="space-y-3">
              {requests.filter(r => r.status === 'Active Trade').map((request) => (
                <Card key={request.id} className="hover:border-secondary/50 transition-colors cursor-pointer" onClick={() => handleOpenRequest(request)}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <h3 className="font-bold">{request.tradeRefId}</h3>
                          <p className="text-sm text-muted-foreground">{request.goodsName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="font-bold">${parseFloat(request.tradeValueUsd).toLocaleString()}</p>
                        <Badge className={getStatusColor(request.status)}>{request.status}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {requests.filter(r => r.status === 'Active Trade').length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    No active trades.
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="disclaimer" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileCheck className="w-5 h-5" />
                  Business User Disclaimer Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {disclaimerUsers.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    No business users found.
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-5 gap-4 p-3 bg-muted rounded-lg font-medium text-sm">
                      <div>User</div>
                      <div>Company</div>
                      <div>Email</div>
                      <div>Finatrades ID</div>
                      <div>Disclaimer Status</div>
                    </div>
                    {disclaimerUsers.map((u) => (
                      <div key={u.id} className="grid grid-cols-5 gap-4 p-3 border rounded-lg items-center">
                        <div className="font-medium">{u.fullName}</div>
                        <div className="text-sm text-muted-foreground">{u.companyName || '-'}</div>
                        <div className="text-sm text-muted-foreground">{u.email}</div>
                        <div className="text-sm font-mono">{u.finatradesId || '-'}</div>
                        <div>
                          {u.finabridgeDisclaimerAcceptedAt ? (
                            <Badge className="bg-green-100 text-green-700 flex items-center gap-1 w-fit">
                              <CheckCircle className="w-3 h-3" />
                              Accepted {new Date(u.finabridgeDisclaimerAcceptedAt).toLocaleDateString()}
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-700 flex items-center gap-1 w-fit">
                              <AlertCircle className="w-3 h-3" />
                              Not Accepted
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Trade Request: {selectedRequest?.tradeRefId}
              </DialogTitle>
            </DialogHeader>
            
            {selectedRequest && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Goods</p>
                    <p className="font-medium">{selectedRequest.goodsName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Trade Value</p>
                    <p className="font-medium text-green-600">${parseFloat(selectedRequest.tradeValueUsd).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Settlement Gold</p>
                    <p className="font-medium text-amber-600">{parseFloat(selectedRequest.settlementGoldGrams).toFixed(3)}g</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge className={getStatusColor(selectedRequest.status)}>{selectedRequest.status}</Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Quantity</p>
                    <p className="font-medium">{selectedRequest.quantity || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Incoterms</p>
                    <p className="font-medium">{selectedRequest.incoterms || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Destination</p>
                    <p className="font-medium">{selectedRequest.destination || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Expected Ship Date</p>
                    <p className="font-medium">{selectedRequest.expectedShipDate || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Created</p>
                    <p className="font-medium">{new Date(selectedRequest.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="p-4 bg-muted/30 rounded-lg border">
                  <p className="text-xs text-muted-foreground mb-1">Importer Details</p>
                  <p className="font-medium">{selectedRequest.importer?.fullName}</p>
                  <p className="text-sm text-muted-foreground">{selectedRequest.importer?.email}</p>
                  {selectedRequest.importer?.companyName && (
                    <p className="text-sm text-muted-foreground">Company: {selectedRequest.importer.companyName}</p>
                  )}
                  {selectedRequest.importer?.finatradesId && (
                    <p className="text-xs text-muted-foreground font-mono">ID: {selectedRequest.importer.finatradesId}</p>
                  )}
                </div>

                {selectedRequest.description && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="text-xs font-medium text-blue-800 mb-1">Description</p>
                    <p className="text-sm text-blue-700">{selectedRequest.description}</p>
                  </div>
                )}

                <div className="border-t pt-4">
                  <h3 className="font-bold mb-4">Proposals ({proposals.length})</h3>
                  
                  {proposals.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No proposals submitted yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {proposals.map((proposal) => (
                        <Card key={proposal.id} className={`border ${selectedProposals.includes(proposal.id) ? 'border-secondary ring-2 ring-secondary/20' : ''}`}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                {proposal.status === 'Shortlisted' && (
                                  <input
                                    type="checkbox"
                                    checked={selectedProposals.includes(proposal.id)}
                                    onChange={() => toggleProposalSelection(proposal.id)}
                                    className="w-5 h-5"
                                    data-testid={`checkbox-proposal-${proposal.id}`}
                                  />
                                )}
                                <div>
                                  <p className="font-bold">Exporter: {proposal.exporter?.fullName || 'Unknown'}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {proposal.exporter?.finatradesId} | {proposal.exporter?.email}
                                  </p>
                                  <p className="text-sm mt-1">
                                    Quote: <strong>${parseFloat(proposal.quotePrice).toLocaleString()}</strong> | 
                                    Timeline: <strong>{proposal.timelineDays} days</strong>
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className={getStatusColor(proposal.status)}>{proposal.status}</Badge>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => { e.stopPropagation(); setExpandedProposal(expandedProposal === proposal.id ? null : proposal.id); }}
                                  data-testid={`button-expand-${proposal.id}`}
                                >
                                  {expandedProposal === proposal.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </Button>
                              </div>
                            </div>
                            
                            {expandedProposal === proposal.id && (
                              <div className="mt-4 pt-4 border-t space-y-4">
                                {proposal.modificationRequest && (
                                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                    <p className="text-xs font-medium text-amber-800 mb-1">Modification Requested:</p>
                                    <p className="text-sm text-amber-700">{proposal.modificationRequest}</p>
                                  </div>
                                )}
                                
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                  <div className="flex items-start gap-2">
                                    <Building className="w-4 h-4 text-muted-foreground mt-0.5" />
                                    <div>
                                      <p className="text-xs text-muted-foreground">Company</p>
                                      <p className="font-medium">{proposal.companyName || 'N/A'}</p>
                                      {proposal.companyRegistration && <p className="text-xs text-muted-foreground">Reg: {proposal.companyRegistration}</p>}
                                    </div>
                                  </div>
                                  <div className="flex items-start gap-2">
                                    <Phone className="w-4 h-4 text-muted-foreground mt-0.5" />
                                    <div>
                                      <p className="text-xs text-muted-foreground">Contact Person</p>
                                      <p className="font-medium">{proposal.contactPerson || 'N/A'}</p>
                                      {proposal.contactPhone && <p className="text-xs text-muted-foreground">{proposal.contactPhone}</p>}
                                    </div>
                                  </div>
                                  <div className="flex items-start gap-2">
                                    <Mail className="w-4 h-4 text-muted-foreground mt-0.5" />
                                    <div>
                                      <p className="text-xs text-muted-foreground">Contact Email</p>
                                      <p className="font-medium break-all">{proposal.contactEmail || 'N/A'}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-start gap-2">
                                    <Ship className="w-4 h-4 text-muted-foreground mt-0.5" />
                                    <div>
                                      <p className="text-xs text-muted-foreground">Shipping</p>
                                      <p className="font-medium">{proposal.shippingMethod || 'N/A'}</p>
                                      {proposal.portOfLoading && <p className="text-xs text-muted-foreground">Port: {proposal.portOfLoading}</p>}
                                    </div>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Incoterms</p>
                                    <p className="font-medium">{proposal.incoterms || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Payment Terms</p>
                                    <p className="font-medium">{proposal.paymentTerms || 'N/A'}</p>
                                  </div>
                                  <div className="flex items-start gap-2">
                                    <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
                                    <div>
                                      <p className="text-xs text-muted-foreground">Est. Delivery</p>
                                      <p className="font-medium">{proposal.estimatedDeliveryDate ? new Date(proposal.estimatedDeliveryDate).toLocaleDateString() : 'N/A'}</p>
                                    </div>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Insurance</p>
                                    <p className="font-medium">{proposal.insuranceIncluded ? 'Included' : 'Not Included'}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Certifications</p>
                                    <p className="font-medium">{proposal.certificationsAvailable || 'N/A'}</p>
                                  </div>
                                </div>
                                
                                {proposal.notes && (
                                  <div className="p-3 bg-muted/50 rounded-lg">
                                    <p className="text-xs font-medium text-muted-foreground mb-1">Additional Notes:</p>
                                    <p className="text-sm">{proposal.notes}</p>
                                  </div>
                                )}
                                
                                <div className="flex flex-wrap gap-2 pt-2">
                                  {(proposal.status === 'Submitted' || proposal.status === 'Shortlisted') && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => { e.stopPropagation(); setModificationDialog(proposal); setModificationText(proposal.modificationRequest || ''); }}
                                      data-testid={`button-request-mod-${proposal.id}`}
                                    >
                                      <Edit3 className="w-4 h-4 mr-1" /> Request Modification
                                    </Button>
                                  )}
                                  {proposal.status === 'Submitted' && (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={(e) => { e.stopPropagation(); handleReject(proposal.id); }}
                                        disabled={updating}
                                        data-testid={`button-reject-${proposal.id}`}
                                      >
                                        <XCircle className="w-4 h-4 mr-1" /> Reject
                                      </Button>
                                      <Button
                                        size="sm"
                                        onClick={(e) => { e.stopPropagation(); handleShortlist(proposal.id); }}
                                        disabled={updating}
                                        data-testid={`button-shortlist-${proposal.id}`}
                                      >
                                        <CheckCircle className="w-4 h-4 mr-1" /> Shortlist
                                      </Button>
                                    </>
                                  )}
                                  {proposal.status === 'Modification Requested' && (
                                    <Badge className="bg-amber-100 text-amber-700">Awaiting Exporter Response</Badge>
                                  )}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {proposals.some(p => p.status === 'Shortlisted') && (
                  <div className="border-t pt-4">
                    <p className="text-sm text-muted-foreground mb-2">
                      Select shortlisted proposals to forward to the importer for final selection.
                    </p>
                    <Button
                      onClick={handleForwardProposals}
                      disabled={updating || selectedProposals.length === 0}
                      className="w-full"
                      data-testid="button-forward-proposals"
                    >
                      {updating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      <Send className="w-4 h-4 mr-2" />
                      Forward {selectedProposals.length} Proposal(s) to Importer
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!modificationDialog} onOpenChange={(open) => { if (!open) { setModificationDialog(null); setModificationText(''); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit3 className="w-5 h-5" />
                Request Modification
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Send a modification request to the exporter. They will be notified and can update their proposal.
              </p>
              <div>
                <label className="text-sm font-medium">Modification Details *</label>
                <textarea
                  value={modificationText}
                  onChange={(e) => setModificationText(e.target.value)}
                  className="w-full mt-1 p-3 border rounded-lg min-h-[120px]"
                  placeholder="Describe what changes you need from the exporter (e.g., 'Please provide better pricing or include insurance in your quote')"
                  data-testid="input-modification-text"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setModificationDialog(null); setModificationText(''); }}>
                Cancel
              </Button>
              <Button 
                onClick={handleRequestModification} 
                disabled={updating || !modificationText.trim()}
                data-testid="button-send-modification"
              >
                {updating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Send className="w-4 h-4 mr-2" />
                Send Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
