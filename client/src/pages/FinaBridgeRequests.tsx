import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useAccountType } from '@/context/AccountTypeContext';
import { useLocation } from 'wouter';
import { FileText, PlusCircle, Eye, Loader2, Package, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
  importer?: { finatradesId: string | null };
}

export default function FinaBridgeRequests() {
  const { user } = useAuth();
  const { accountType } = useAccountType();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [myRequests, setMyRequests] = useState<TradeRequest[]>([]);
  const [openRequests, setOpenRequests] = useState<TradeRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<TradeRequest | null>(null);

  useEffect(() => {
    if (accountType !== 'business') {
      setLocation('/dashboard');
    }
  }, [accountType, setLocation]);

  useEffect(() => {
    if (user && accountType === 'business') {
      fetchData();
    }
  }, [user, accountType]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [myReqRes, openReqRes] = await Promise.all([
        apiRequest('GET', `/api/finabridge/importer/requests/${user.id}`),
        apiRequest('GET', `/api/finabridge/exporter/open-requests/${user.id}`),
      ]);
      const myReqData = await myReqRes.json();
      const openReqData = await openReqRes.json();
      setMyRequests(myReqData.requests || []);
      setOpenRequests(openReqData.requests || []);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load trade requests', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'approved':
        return 'bg-green-100 text-green-700';
      case 'pending':
      case 'open':
        return 'bg-purple-100 text-fuchsia-700';
      case 'rejected':
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'approved':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending':
      case 'open':
        return <Clock className="w-4 h-4" />;
      case 'rejected':
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  if (accountType !== 'business') {
    return null;
  }

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
              <FileText className="w-8 h-8 text-[#D4AF37]" />
              Trade Requests
            </h1>
            <p className="text-muted-foreground">Manage your import trade requests and view available opportunities.</p>
          </div>
          <Button 
            onClick={() => setLocation('/finabridge')}
            className="bg-gradient-to-r from-[#D4AF37] to-[#F4E4BC] text-[#0D001E] hover:opacity-90"
            data-testid="button-new-request"
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            New Request
          </Button>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-[#D4AF37]" />
                My Trade Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37]" />
                </div>
              ) : myRequests.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No trade requests yet</p>
                  <p className="text-sm">Create your first import request to get started.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myRequests.map((request) => (
                    <div 
                      key={request.id}
                      className="p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                      onClick={() => setSelectedRequest(request)}
                      data-testid={`trade-request-${request.id}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-foreground">{request.goodsName}</p>
                          <p className="text-sm text-muted-foreground">{request.tradeRefId}</p>
                        </div>
                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                          {getStatusIcon(request.status)}
                          <span className="capitalize">{request.status}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          ${parseFloat(request.tradeValueUsd).toLocaleString()}
                        </span>
                        <span className="text-muted-foreground">
                          {format(new Date(request.createdAt), 'MMM dd, yyyy')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-[#D4AF37]" />
                Open Requests (Exporter View)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37]" />
                </div>
              ) : openRequests.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No open requests available</p>
                  <p className="text-sm">Check back later for new opportunities.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {openRequests.map((request) => (
                    <div 
                      key={request.id}
                      className="p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                      onClick={() => setSelectedRequest(request)}
                      data-testid={`open-request-${request.id}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-foreground">{request.goodsName}</p>
                          <p className="text-sm text-muted-foreground">
                            {request.destination && `To: ${request.destination}`}
                          </p>
                        </div>
                        <Button size="sm" variant="outline" className="text-xs">
                          Submit Proposal
                        </Button>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-[#D4AF37]">
                          ${parseFloat(request.tradeValueUsd).toLocaleString()}
                        </span>
                        <span className="text-muted-foreground">
                          {request.quantity && `Qty: ${request.quantity}`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Trade Request Details</DialogTitle>
            </DialogHeader>
            {selectedRequest && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Reference</p>
                    <p className="font-medium">{selectedRequest.tradeRefId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className="font-medium capitalize">{selectedRequest.status}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Goods</p>
                    <p className="font-medium">{selectedRequest.goodsName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Value</p>
                    <p className="font-medium">${parseFloat(selectedRequest.tradeValueUsd).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Settlement Gold</p>
                    <p className="font-medium">{parseFloat(selectedRequest.settlementGoldGrams).toFixed(3)} g</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Destination</p>
                    <p className="font-medium">{selectedRequest.destination || 'N/A'}</p>
                  </div>
                </div>
                {selectedRequest.description && (
                  <div>
                    <p className="text-sm text-muted-foreground">Description</p>
                    <p className="font-medium">{selectedRequest.description}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
