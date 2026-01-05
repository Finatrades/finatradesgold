import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useAccountType } from '@/context/AccountTypeContext';
import { useLocation } from 'wouter';
import { Send, Loader2, Clock, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface TradeProposal {
  id: string;
  tradeRequestId: string;
  exporterUserId: string;
  quotePrice: string;
  timelineDays: number;
  notes: string | null;
  status: string;
  createdAt: string;
  exporter?: { finatradesId: string | null };
  tradeRequest?: {
    tradeRefId: string;
    goodsName: string;
    tradeValueUsd: string;
    status: string;
  };
}

export default function FinaBridgeProposals() {
  const { user } = useAuth();
  const { accountType } = useAccountType();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [myProposals, setMyProposals] = useState<TradeProposal[]>([]);
  const [receivedProposals, setReceivedProposals] = useState<TradeProposal[]>([]);
  const [selectedProposal, setSelectedProposal] = useState<TradeProposal | null>(null);

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
      const [myPropRes, receivedPropRes] = await Promise.all([
        apiRequest('GET', `/api/finabridge/exporter/proposals/${user.id}`),
        apiRequest('GET', `/api/finabridge/importer/forwarded-proposals/${user.id}`),
      ]);
      const myPropData = await myPropRes.json();
      const receivedPropData = await receivedPropRes.json();
      const activeMyProposals = (myPropData.proposals || []).filter(
        (p: TradeProposal) => !['Completed', 'Cancelled'].includes(p.tradeRequest?.status || '')
      );
      const activeReceivedProposals = (receivedPropData.proposals || []).filter(
        (p: TradeProposal) => !['Completed', 'Cancelled'].includes(p.tradeRequest?.status || '')
      );
      setMyProposals(activeMyProposals);
      setReceivedProposals(activeReceivedProposals);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load proposals', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'accepted':
      case 'approved':
        return 'bg-green-100 text-green-700';
      case 'pending':
      case 'forwarded':
        return 'bg-purple-100 text-fuchsia-700';
      case 'rejected':
      case 'declined':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'accepted':
      case 'approved':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending':
      case 'forwarded':
        return <Clock className="w-4 h-4" />;
      case 'rejected':
      case 'declined':
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
              <Send className="w-8 h-8 text-[#D4AF37]" />
              Trade Proposals
            </h1>
            <p className="text-muted-foreground">View and manage your trade proposals.</p>
          </div>
          <Button 
            onClick={() => setLocation('/finabridge/requests')}
            variant="outline"
            data-testid="button-view-requests"
          >
            View Requests
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="w-5 h-5 text-[#D4AF37]" />
                My Submitted Proposals
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37]" />
                </div>
              ) : myProposals.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Send className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No proposals submitted yet</p>
                  <p className="text-sm">Browse open requests to submit proposals.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myProposals.map((proposal) => (
                    <div 
                      key={proposal.id}
                      className="p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                      onClick={() => setSelectedProposal(proposal)}
                      data-testid={`my-proposal-${proposal.id}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-foreground">
                            {proposal.tradeRequest?.goodsName || 'Trade Proposal'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {proposal.tradeRequest?.tradeRefId}
                          </p>
                        </div>
                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(proposal.status)}`}>
                          {getStatusIcon(proposal.status)}
                          <span className="capitalize">{proposal.status}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-[#D4AF37]">
                          Quote: ${parseFloat(proposal.quotePrice).toLocaleString()}
                        </span>
                        <span className="text-muted-foreground">
                          {proposal.timelineDays} days
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
                <CheckCircle className="w-5 h-5 text-[#D4AF37]" />
                Received Proposals (Importer)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37]" />
                </div>
              ) : receivedProposals.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No proposals received yet</p>
                  <p className="text-sm">Proposals for your requests will appear here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {receivedProposals.map((proposal) => (
                    <div 
                      key={proposal.id}
                      className="p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                      onClick={() => setSelectedProposal(proposal)}
                      data-testid={`received-proposal-${proposal.id}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-foreground">
                            {proposal.tradeRequest?.goodsName || 'Trade Proposal'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            From: {proposal.exporter?.finatradesId || 'Exporter'}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="text-xs text-red-600 border-red-200 hover:bg-red-50">
                            Decline
                          </Button>
                          <Button size="sm" className="text-xs bg-green-600 hover:bg-green-700">
                            Accept
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-[#D4AF37]">
                          Quote: ${parseFloat(proposal.quotePrice).toLocaleString()}
                        </span>
                        <span className="text-muted-foreground">
                          {proposal.timelineDays} days delivery
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Dialog open={!!selectedProposal} onOpenChange={() => setSelectedProposal(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Proposal Details</DialogTitle>
            </DialogHeader>
            {selectedProposal && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Trade Reference</p>
                    <p className="font-medium">{selectedProposal.tradeRequest?.tradeRefId || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className="font-medium capitalize">{selectedProposal.status}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Quote Price</p>
                    <p className="font-medium">${parseFloat(selectedProposal.quotePrice).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Timeline</p>
                    <p className="font-medium">{selectedProposal.timelineDays} days</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Submitted</p>
                    <p className="font-medium">{format(new Date(selectedProposal.createdAt), 'MMM dd, yyyy')}</p>
                  </div>
                </div>
                {selectedProposal.notes && (
                  <div>
                    <p className="text-sm text-muted-foreground">Notes</p>
                    <p className="font-medium">{selectedProposal.notes}</p>
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
