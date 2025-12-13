import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { useFinaPay } from '@/context/FinaPayContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  BarChart3, PlusCircle, Briefcase, Loader2, RefreshCw, 
  ArrowLeftRight, Package, Send, Eye, Check, X, Wallet,
  CreditCard, Truck, Ship, Plane, Train, Shield, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
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

interface FinabridgeWallet {
  id: string;
  userId: string;
  availableGoldGrams: string;
  lockedGoldGrams: string;
}

export default function FinaBridge() {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const { toast } = useToast();
  const { currentGoldPriceUsdPerGram } = useFinaPay();
  
  const [role, setRole] = useState<'importer' | 'exporter'>('importer');
  const [activeTab, setActiveTab] = useState('requests');
  const [loading, setLoading] = useState(true);
  
  const [myRequests, setMyRequests] = useState<TradeRequest[]>([]);
  const [openRequests, setOpenRequests] = useState<TradeRequest[]>([]);
  const [myProposals, setMyProposals] = useState<TradeProposal[]>([]);
  const [forwardedProposals, setForwardedProposals] = useState<TradeProposal[]>([]);
  const [wallet, setWallet] = useState<FinabridgeWallet | null>(null);
  const [mainWallet, setMainWallet] = useState<{ goldGrams: string } | null>(null);
  
  const [selectedRequest, setSelectedRequest] = useState<TradeRequest | null>(null);
  const [showProposalDialog, setShowProposalDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showFundDialog, setShowFundDialog] = useState(false);
  const [fundAmount, setFundAmount] = useState('');
  const [insufficientFundsError, setInsufficientFundsError] = useState<string | null>(null);
  
  const [requestForm, setRequestForm] = useState({
    financeType: 'LC',
    currency: 'USD',
    paymentTerms: '',
    goodsName: '',
    description: '',
    quantity: '',
    incoterms: 'FOB',
    destination: '',
    expectedShipDate: '',
    tradeValueUsd: '',
    settlementGoldGrams: '',
    modeOfTransport: 'Sea',
    portOfLoading: '',
    portOfDischarge: '',
    partialShipment: false,
    transshipment: false,
    insuranceCoverage: '',
    insuranceProvider: '',
    suggestExporter: true,
    exporterCompanyName: '',
    exporterContactName: '',
    exporterEmail: '',
    exporterPhone: '',
    proposedQuotePrice: '',
    proposedTimelineDays: '',
    proposalNotes: '',
    requiredDocs: {
      certificateOfOrigin: false,
      inspectionCertificate: false,
      billOfLading: false,
      commercialInvoice: false,
      packingList: false,
      insuranceCertificate: false,
      agreementsCopy: false,
      other: false,
    },
    otherDocNote: '',
  });
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  
  const [proposalForm, setProposalForm] = useState({
    quotePrice: '',
    timelineDays: '',
    notes: '',
  });

  const fetchImporterData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [requestsRes, walletRes] = await Promise.all([
        apiRequest('GET', `/api/finabridge/importer/requests/${user.id}`),
        apiRequest('GET', `/api/finabridge/wallet/${user.id}`),
      ]);
      const requestsData = await requestsRes.json();
      const walletData = await walletRes.json();
      setMyRequests(requestsData.requests || []);
      setWallet(walletData.wallet);
      
      try {
        const mainWalletRes = await apiRequest('GET', `/api/wallet/${user.id}`);
        const mainWalletData = await mainWalletRes.json();
        setMainWallet(mainWalletData.wallet || { goldGrams: '0' });
      } catch {
        setMainWallet({ goldGrams: '0' });
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load importer data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchExporterData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [openRes, proposalsRes, walletRes] = await Promise.all([
        apiRequest('GET', '/api/finabridge/exporter/open-requests'),
        apiRequest('GET', `/api/finabridge/exporter/proposals/${user.id}`),
        apiRequest('GET', `/api/finabridge/wallet/${user.id}`),
      ]);
      const openData = await openRes.json();
      const proposalsData = await proposalsRes.json();
      const walletData = await walletRes.json();
      setOpenRequests(openData.requests || []);
      setMyProposals(proposalsData.proposals || []);
      setWallet(walletData.wallet);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load exporter data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchForwardedProposals = async (requestId: string) => {
    try {
      const res = await apiRequest('GET', `/api/finabridge/importer/requests/${requestId}/forwarded-proposals`);
      const data = await res.json();
      setForwardedProposals(data.proposals || []);
    } catch (err) {
      console.error('Failed to fetch forwarded proposals');
    }
  };

  useEffect(() => {
    if (role === 'importer') {
      fetchImporterData();
    } else {
      fetchExporterData();
    }
  }, [user, role]);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (!requestForm.goodsName || !requestForm.tradeValueUsd || !requestForm.settlementGoldGrams) {
      toast({ title: 'Missing Fields', description: 'Please fill in required fields', variant: 'destructive' });
      return;
    }

    if (!requestForm.suggestExporter) {
      if (!requestForm.exporterCompanyName || !requestForm.exporterEmail || !requestForm.proposedQuotePrice || !requestForm.proposedTimelineDays) {
        toast({ title: 'Missing Exporter Details', description: 'Please fill in exporter company, email, quote price, and timeline', variant: 'destructive' });
        return;
      }
    }

    const requiredGold = parseFloat(requestForm.settlementGoldGrams);
    const availableInFinaBridge = parseFloat(wallet?.availableGoldGrams || '0');
    
    if (requiredGold > availableInFinaBridge) {
      const deficit = requiredGold - availableInFinaBridge;
      const mainWalletBalance = parseFloat(mainWallet?.goldGrams || '0');
      
      setInsufficientFundsError(
        `Insufficient funds in FinaBridge wallet. You need ${requiredGold.toFixed(3)}g but only have ${availableInFinaBridge.toFixed(3)}g available. ` +
        `Please fund your FinaBridge wallet with at least ${deficit.toFixed(3)}g from FinaPay (available: ${mainWalletBalance.toFixed(3)}g).`
      );
      
      const suggestedAmount = Math.min(deficit, mainWalletBalance);
      setFundAmount(suggestedAmount > 0 ? suggestedAmount.toFixed(3) : '');
      setShowFundDialog(true);
      return;
    }
    
    setInsufficientFundsError(null);

    setSubmitting(true);
    try {
      const payload = {
        importerUserId: user.id,
        ...requestForm,
        status: 'Draft',
      };

      const res = await apiRequest('POST', '/api/finabridge/importer/requests', payload);
      const data = await res.json();
      
      toast({ title: 'Trade Request Created', description: `Reference: ${data.tradeRequest.tradeRefId}` });
      addNotification({
        title: 'Trade Request Created',
        message: `Trade request ${data.tradeRequest.tradeRefId} created successfully`,
        type: 'success'
      });
      
      setRequestForm({
        financeType: 'LC',
        currency: 'USD',
        paymentTerms: '',
        goodsName: '',
        description: '',
        quantity: '',
        incoterms: 'FOB',
        destination: '',
        expectedShipDate: '',
        tradeValueUsd: '',
        settlementGoldGrams: '',
        modeOfTransport: 'Sea',
        portOfLoading: '',
        portOfDischarge: '',
        partialShipment: false,
        transshipment: false,
        insuranceCoverage: '',
        insuranceProvider: '',
        suggestExporter: true,
        exporterCompanyName: '',
        exporterContactName: '',
        exporterEmail: '',
        exporterPhone: '',
        proposedQuotePrice: '',
        proposedTimelineDays: '',
        proposalNotes: '',
        requiredDocs: {
          certificateOfOrigin: false,
          inspectionCertificate: false,
          billOfLading: false,
          commercialInvoice: false,
          packingList: false,
          insuranceCertificate: false,
          agreementsCopy: false,
          other: false,
        },
        otherDocNote: '',
      });
      setUploadedFiles([]);
      setActiveTab('requests');
      fetchImporterData();
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to create trade request', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitRequest = async (requestId: string) => {
    setSubmitting(true);
    try {
      await apiRequest('POST', `/api/finabridge/importer/requests/${requestId}/submit`);
      toast({ title: 'Success', description: 'Trade request submitted for matching' });
      fetchImporterData();
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to submit trade request', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedRequest) return;
    
    setSubmitting(true);
    try {
      const payload = {
        tradeRequestId: selectedRequest.id,
        exporterUserId: user.id,
        quotePrice: proposalForm.quotePrice,
        timelineDays: parseInt(proposalForm.timelineDays),
        notes: proposalForm.notes || null,
      };

      await apiRequest('POST', '/api/finabridge/exporter/proposals', payload);
      
      toast({ title: 'Proposal Submitted', description: 'Your proposal has been submitted for review' });
      setShowProposalDialog(false);
      setProposalForm({ quotePrice: '', timelineDays: '', notes: '' });
      fetchExporterData();
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to submit proposal', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptProposal = async (proposalId: string) => {
    setSubmitting(true);
    try {
      await apiRequest('POST', `/api/finabridge/importer/proposals/${proposalId}/accept`);
      toast({ title: 'Proposal Accepted', description: 'Gold has been locked in escrow. Trade is now active.' });
      fetchImporterData();
      setForwardedProposals([]);
    } catch (err: any) {
      const message = err?.message || 'Failed to accept proposal';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeclineProposal = async (proposalId: string) => {
    setSubmitting(true);
    try {
      await apiRequest('POST', `/api/finabridge/importer/proposals/${proposalId}/decline`);
      toast({ title: 'Proposal Declined', description: 'The proposal has been declined.' });
      setForwardedProposals(prev => prev.filter(p => p.id !== proposalId));
    } catch (err: any) {
      const message = err?.message || 'Failed to decline proposal';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleFundWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !fundAmount) return;
    
    const amount = parseFloat(fundAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: 'Invalid Amount', description: 'Please enter a valid positive amount', variant: 'destructive' });
      return;
    }
    
    const mainBalance = parseFloat(mainWallet?.goldGrams || '0');
    if (amount > mainBalance) {
      toast({ title: 'Insufficient Balance', description: `You only have ${mainBalance.toFixed(3)}g in your FinaPay wallet`, variant: 'destructive' });
      return;
    }
    
    setSubmitting(true);
    try {
      await apiRequest('POST', `/api/finabridge/wallet/${user.id}/fund`, { amountGrams: fundAmount });
      toast({ title: 'Success', description: `${fundAmount}g transferred to FinaBridge wallet` });
      setShowFundDialog(false);
      setFundAmount('');
      setInsufficientFundsError(null);
      if (role === 'importer') {
        fetchImporterData();
      } else {
        fetchExporterData();
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to fund wallet', variant: 'destructive' });
    } finally {
      setSubmitting(false);
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

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8 pb-12">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-secondary/10 rounded-lg border border-secondary/20 text-secondary">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">FinaBridge Trade Finance</h1>
              <p className="text-muted-foreground text-sm">Gold-backed trade matching for importers and exporters.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 p-1 bg-muted rounded-lg">
              <Button
                variant={role === 'importer' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setRole('importer')}
                data-testid="button-role-importer"
              >
                <Package className="w-4 h-4 mr-2" />
                Importer
              </Button>
              <Button
                variant={role === 'exporter' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setRole('exporter')}
                data-testid="button-role-exporter"
              >
                <Send className="w-4 h-4 mr-2" />
                Exporter
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={() => role === 'importer' ? fetchImporterData() : fetchExporterData()} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Professional Wallet Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Available Balance - Primary Card */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 p-6 text-white shadow-lg">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium text-white/80">Available Balance</span>
                </div>
              </div>
              
              <div className="mb-1">
                <span className="text-4xl font-bold tracking-tight">
                  ${(parseFloat(wallet?.availableGoldGrams || '0') * currentGoldPriceUsdPerGram).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              
              <div className="text-white/70 text-sm font-medium">
                {parseFloat(wallet?.availableGoldGrams || '0').toFixed(4)} g Gold
              </div>
              
              <div className="mt-4 pt-4 border-t border-white/20">
                <Button 
                  size="sm" 
                  variant="secondary"
                  className="bg-white/20 hover:bg-white/30 text-white border-0"
                  onClick={() => setShowFundDialog(true)} 
                  data-testid="button-fund-wallet"
                >
                  Fund Wallet
                </Button>
              </div>
            </div>
          </div>

          {/* Locked in Escrow */}
          <div className="relative overflow-hidden rounded-2xl bg-white border border-border p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <ArrowLeftRight className="w-5 h-5 text-amber-600" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">Locked in Escrow</span>
              </div>
            </div>
            
            <div className="mb-1">
              <span className="text-3xl font-bold text-amber-600 tracking-tight">
                ${(parseFloat(wallet?.lockedGoldGrams || '0') * currentGoldPriceUsdPerGram).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            
            <div className="text-muted-foreground text-sm font-medium">
              {parseFloat(wallet?.lockedGoldGrams || '0').toFixed(4)} g Gold
            </div>
            
            <div className="mt-4 pt-4 border-t border-border text-sm text-muted-foreground">
              Gold secured for active trades
            </div>
          </div>

          {/* Total Balance */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 p-6 text-white shadow-lg">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium text-white/70">Total Balance</span>
                </div>
              </div>
              
              <div className="mb-1">
                <span className="text-3xl font-bold tracking-tight">
                  ${((parseFloat(wallet?.availableGoldGrams || '0') + parseFloat(wallet?.lockedGoldGrams || '0')) * currentGoldPriceUsdPerGram).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              
              <div className="text-white/60 text-sm font-medium">
                {(parseFloat(wallet?.availableGoldGrams || '0') + parseFloat(wallet?.lockedGoldGrams || '0')).toFixed(4)} g Gold
              </div>
              
              <div className="mt-4 pt-4 border-t border-white/20 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-white/60">Available</span>
                  <span className="font-medium text-green-400">${(parseFloat(wallet?.availableGoldGrams || '0') * currentGoldPriceUsdPerGram).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-white/60">Locked</span>
                  <span className="font-medium text-amber-400">${(parseFloat(wallet?.lockedGoldGrams || '0') * currentGoldPriceUsdPerGram).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>
          
        </div>

        {role === 'importer' ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-muted border border-border p-1 mb-6 w-full md:w-auto flex">
              <TabsTrigger value="requests" className="flex-1 md:flex-none data-[state=active]:bg-secondary data-[state=active]:text-white">
                <Briefcase className="w-4 h-4 mr-2" /> My Trade Requests
              </TabsTrigger>
              <TabsTrigger value="create" className="flex-1 md:flex-none data-[state=active]:bg-secondary data-[state=active]:text-white">
                <PlusCircle className="w-4 h-4 mr-2" /> Create Request
              </TabsTrigger>
              <TabsTrigger value="proposals" className="flex-1 md:flex-none data-[state=active]:bg-secondary data-[state=active]:text-white">
                <Eye className="w-4 h-4 mr-2" /> Forwarded Proposals
              </TabsTrigger>
            </TabsList>

            <TabsContent value="requests" className="mt-0">
              {loading ? (
                <Card className="bg-white border">
                  <CardContent className="p-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
                    <p className="mt-4 text-muted-foreground">Loading trade requests...</p>
                  </CardContent>
                </Card>
              ) : myRequests.length === 0 ? (
                <Card className="bg-white border">
                  <CardContent className="p-12 text-center">
                    <Briefcase className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                    <h3 className="text-lg font-bold mb-2">No Trade Requests Yet</h3>
                    <p className="text-muted-foreground mb-4">Create your first trade request to find exporters.</p>
                    <Button onClick={() => setActiveTab('create')}>
                      <PlusCircle className="w-4 h-4 mr-2" /> Create Trade Request
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {myRequests.map((request) => (
                    <Card key={request.id} className="bg-white border hover:border-secondary/50 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-2 bg-secondary/10 rounded-lg">
                              <Package className="w-5 h-5 text-secondary" />
                            </div>
                            <div>
                              <h3 className="font-bold">{request.tradeRefId}</h3>
                              <p className="text-sm text-muted-foreground">{request.goodsName}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="font-bold">${parseFloat(request.tradeValueUsd).toLocaleString()}</p>
                              <p className="text-xs text-muted-foreground">{parseFloat(request.settlementGoldGrams).toFixed(3)}g gold</p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(request.status)}`}>
                              {request.status}
                            </span>
                            {request.status === 'Draft' && (
                              <Button size="sm" onClick={() => handleSubmitRequest(request.id)} disabled={submitting}>
                                Submit
                              </Button>
                            )}
                            {request.status === 'Awaiting Importer' && (
                              <Button size="sm" onClick={() => { setSelectedRequest(request); fetchForwardedProposals(request.id); setActiveTab('proposals'); }}>
                                View Proposals
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="create">
              <Card className="bg-white border">
                <CardContent className="p-6">
                  <form onSubmit={handleCreateRequest} className="space-y-6">
                    <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg border">
                      <input
                        type="checkbox"
                        id="suggestExporter"
                        checked={requestForm.suggestExporter}
                        onChange={(e) => setRequestForm({ ...requestForm, suggestExporter: e.target.checked })}
                        data-testid="checkbox-suggest-exporter"
                      />
                      <label htmlFor="suggestExporter" className="text-sm font-medium">
                        Suggest matching exporters (allow Finatrades to find exporters for me)
                      </label>
                    </div>

                    {!requestForm.suggestExporter && (
                      <div className="p-4 border rounded-lg bg-orange-50/50 border-orange-200">
                        <h4 className="font-medium mb-4 flex items-center gap-2 text-orange-800">
                          <Send className="w-4 h-4" />
                          My Exporter Details & Proposal
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Exporter Company Name *</label>
                            <input
                              type="text"
                              value={requestForm.exporterCompanyName}
                              onChange={(e) => setRequestForm({ ...requestForm, exporterCompanyName: e.target.value })}
                              className="w-full p-3 border rounded-lg"
                              placeholder="e.g., ABC Trading Ltd."
                              data-testid="input-exporter-company"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Contact Person Name</label>
                            <input
                              type="text"
                              value={requestForm.exporterContactName}
                              onChange={(e) => setRequestForm({ ...requestForm, exporterContactName: e.target.value })}
                              className="w-full p-3 border rounded-lg"
                              placeholder="e.g., John Smith"
                              data-testid="input-exporter-contact"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Exporter Email *</label>
                            <input
                              type="email"
                              value={requestForm.exporterEmail}
                              onChange={(e) => setRequestForm({ ...requestForm, exporterEmail: e.target.value })}
                              className="w-full p-3 border rounded-lg"
                              placeholder="exporter@company.com"
                              data-testid="input-exporter-email"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Exporter Phone</label>
                            <input
                              type="tel"
                              value={requestForm.exporterPhone}
                              onChange={(e) => setRequestForm({ ...requestForm, exporterPhone: e.target.value })}
                              className="w-full p-3 border rounded-lg"
                              placeholder="+1 234 567 8900"
                              data-testid="input-exporter-phone"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Quote Price (USD) *</label>
                            <input
                              type="number"
                              value={requestForm.proposedQuotePrice}
                              onChange={(e) => setRequestForm({ ...requestForm, proposedQuotePrice: e.target.value })}
                              className="w-full p-3 border rounded-lg"
                              placeholder="0.00"
                              data-testid="input-quote-price"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Timeline (Days) *</label>
                            <input
                              type="number"
                              value={requestForm.proposedTimelineDays}
                              onChange={(e) => setRequestForm({ ...requestForm, proposedTimelineDays: e.target.value })}
                              className="w-full p-3 border rounded-lg"
                              placeholder="30"
                              data-testid="input-timeline-days"
                            />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-medium">Notes / Terms</label>
                            <textarea
                              value={requestForm.proposalNotes}
                              onChange={(e) => setRequestForm({ ...requestForm, proposalNotes: e.target.value })}
                              className="w-full p-3 border rounded-lg"
                              rows={2}
                              placeholder="Additional terms or notes about this proposal..."
                              data-testid="input-proposal-notes"
                            />
                          </div>
                        </div>

                        <div className="mt-6 pt-4 border-t">
                          <h4 className="font-medium mb-3 text-orange-800">Required Exporter Documents</h4>
                          <p className="text-sm text-muted-foreground mb-4">Exporter should upload all the necessary documents</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {[
                              { key: 'certificateOfOrigin', label: 'Certificate of Origin' },
                              { key: 'inspectionCertificate', label: 'Inspection / Quality Certificate' },
                              { key: 'billOfLading', label: 'Bill of Lading (B/L)' },
                              { key: 'commercialInvoice', label: 'Commercial Invoice' },
                              { key: 'packingList', label: 'Packing List' },
                              { key: 'insuranceCertificate', label: 'Insurance Certificate' },
                              { key: 'agreementsCopy', label: 'Agreements / Contract Copy' },
                              { key: 'other', label: 'Other' },
                            ].map(({ key, label }) => (
                              <label key={key} className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={requestForm.requiredDocs[key as keyof typeof requestForm.requiredDocs]}
                                  onChange={(e) => setRequestForm({
                                    ...requestForm,
                                    requiredDocs: { ...requestForm.requiredDocs, [key]: e.target.checked }
                                  })}
                                  className="rounded border-gray-300"
                                  data-testid={`checkbox-doc-${key}`}
                                />
                                <span className="text-sm">{label}</span>
                              </label>
                            ))}
                          </div>
                          
                          {requestForm.requiredDocs.other && (
                            <div className="mt-3">
                              <label className="text-sm font-medium">Please specify other document(s)</label>
                              <textarea
                                value={requestForm.otherDocNote}
                                onChange={(e) => setRequestForm({ ...requestForm, otherDocNote: e.target.value })}
                                className="w-full p-3 border rounded-lg mt-1"
                                rows={2}
                                placeholder="Describe the other document(s) required..."
                                data-testid="input-other-doc-note"
                              />
                            </div>
                          )}

                          <div className="mt-4 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                            <label className="cursor-pointer">
                              <span className="text-primary font-medium">Click to upload</span>
                              <input
                                type="file"
                                multiple
                                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files) {
                                    setUploadedFiles([...uploadedFiles, ...Array.from(e.target.files)]);
                                  }
                                }}
                                data-testid="input-file-upload"
                              />
                            </label>
                            <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG, DOC, DOCX, XLS, XLSX (Max 10MB each)</p>
                            <p className="text-xs text-muted-foreground">{uploadedFiles.length} file(s) uploaded</p>
                            {uploadedFiles.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-2 justify-center">
                                {uploadedFiles.map((file, idx) => (
                                  <span key={idx} className="text-xs bg-gray-100 px-2 py-1 rounded flex items-center gap-1">
                                    {file.name}
                                    <button
                                      type="button"
                                      onClick={() => setUploadedFiles(uploadedFiles.filter((_, i) => i !== idx))}
                                      className="text-red-500 hover:text-red-700"
                                    >
                                      ×
                                    </button>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="p-4 border rounded-lg bg-blue-50/50 border-blue-200">
                      <h4 className="font-medium mb-4 flex items-center gap-2 text-blue-800">
                        <CreditCard className="w-4 h-4" />
                        Trade Finance Type & Payment
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Finance Type *</label>
                          <select
                            value={requestForm.financeType}
                            onChange={(e) => setRequestForm({ ...requestForm, financeType: e.target.value })}
                            className="w-full p-3 border rounded-lg bg-white"
                            data-testid="select-finance-type"
                          >
                            <option value="LC">Letter of Credit (LC)</option>
                            <option value="SBLC">Standby Letter of Credit (SBLC)</option>
                            <option value="BG">Bank Guarantee (BG)</option>
                            <option value="Invoice Finance">Invoice Finance</option>
                            <option value="Supply Chain Finance">Supply Chain Finance</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Currency</label>
                          <select
                            value={requestForm.currency}
                            onChange={(e) => setRequestForm({ ...requestForm, currency: e.target.value })}
                            className="w-full p-3 border rounded-lg bg-white"
                            data-testid="select-currency"
                          >
                            <option value="USD">USD - US Dollar</option>
                            <option value="EUR">EUR - Euro</option>
                            <option value="GBP">GBP - British Pound</option>
                            <option value="AED">AED - UAE Dirham</option>
                            <option value="CNY">CNY - Chinese Yuan</option>
                            <option value="JPY">JPY - Japanese Yen</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Payment Terms</label>
                          <input
                            type="text"
                            value={requestForm.paymentTerms}
                            onChange={(e) => setRequestForm({ ...requestForm, paymentTerms: e.target.value })}
                            className="w-full p-3 border rounded-lg"
                            placeholder="e.g., 30 days from B/L date"
                            data-testid="input-payment-terms"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg bg-green-50/50 border-green-200">
                      <h4 className="font-medium mb-4 flex items-center gap-2 text-green-800">
                        <Package className="w-4 h-4" />
                        Trade Details & Gold Settlement
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Goods Name *</label>
                          <input
                            type="text"
                            value={requestForm.goodsName}
                            onChange={(e) => setRequestForm({ ...requestForm, goodsName: e.target.value })}
                            className="w-full p-3 border rounded-lg"
                            placeholder="e.g., Electronic Components"
                            data-testid="input-goods-name"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Quantity</label>
                          <input
                            type="text"
                            value={requestForm.quantity}
                            onChange={(e) => setRequestForm({ ...requestForm, quantity: e.target.value })}
                            className="w-full p-3 border rounded-lg"
                            placeholder="e.g., 1000 units"
                            data-testid="input-quantity"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Trade Value ({requestForm.currency}) *</label>
                          <input
                            type="number"
                            value={requestForm.tradeValueUsd}
                            onChange={(e) => {
                              const usdValue = e.target.value;
                              const goldGrams = usdValue && currentGoldPriceUsdPerGram > 0
                                ? (parseFloat(usdValue) / currentGoldPriceUsdPerGram).toFixed(3)
                                : '';
                              setRequestForm({ 
                                ...requestForm, 
                                tradeValueUsd: usdValue,
                                settlementGoldGrams: goldGrams
                              });
                              setInsufficientFundsError(null);
                            }}
                            className="w-full p-3 border rounded-lg"
                            placeholder="0.00"
                            data-testid="input-trade-value"
                          />
                          <p className="text-xs text-muted-foreground">
                            Current gold price: ${currentGoldPriceUsdPerGram.toFixed(2)}/gram
                          </p>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Settlement Gold (grams) *</label>
                          <input
                            type="number"
                            step="0.001"
                            value={requestForm.settlementGoldGrams}
                            onChange={(e) => {
                              setRequestForm({ ...requestForm, settlementGoldGrams: e.target.value });
                              setInsufficientFundsError(null);
                            }}
                            className={`w-full p-3 border rounded-lg ${
                              requestForm.settlementGoldGrams && 
                              parseFloat(requestForm.settlementGoldGrams) > parseFloat(wallet?.availableGoldGrams || '0')
                                ? 'border-red-400 bg-red-50/50'
                                : ''
                            }`}
                            placeholder="0.000"
                            data-testid="input-settlement-gold"
                          />
                          <div className="flex flex-wrap gap-4 text-xs mt-1">
                            <span className="text-muted-foreground">
                              FinaBridge Balance: <span className={`font-medium ${
                                requestForm.settlementGoldGrams && 
                                parseFloat(requestForm.settlementGoldGrams) > parseFloat(wallet?.availableGoldGrams || '0')
                                  ? 'text-red-600'
                                  : 'text-green-600'
                              }`}>{parseFloat(wallet?.availableGoldGrams || '0').toFixed(3)}g</span>
                            </span>
                            <span className="text-muted-foreground">
                              FinaPay Balance: <span className="font-medium text-blue-600">{parseFloat(mainWallet?.goldGrams || '0').toFixed(3)}g</span>
                            </span>
                          </div>
                          
                          {requestForm.settlementGoldGrams && 
                           parseFloat(requestForm.settlementGoldGrams) > parseFloat(wallet?.availableGoldGrams || '0') && (
                            <div className="mt-2 p-3 bg-amber-50 border border-amber-300 rounded-lg">
                              <div className="flex items-start gap-2">
                                <Wallet className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                  <p className="text-amber-800 text-sm font-medium">Insufficient FinaBridge Balance</p>
                                  <p className="text-amber-700 text-xs mt-1">
                                    You need <span className="font-bold">{parseFloat(requestForm.settlementGoldGrams).toFixed(3)}g</span> but only have{' '}
                                    <span className="font-bold">{parseFloat(wallet?.availableGoldGrams || '0').toFixed(3)}g</span> in FinaBridge.
                                    Transfer <span className="font-bold">
                                      {(parseFloat(requestForm.settlementGoldGrams) - parseFloat(wallet?.availableGoldGrams || '0')).toFixed(3)}g
                                    </span> from FinaPay to continue.
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const deficit = parseFloat(requestForm.settlementGoldGrams) - parseFloat(wallet?.availableGoldGrams || '0');
                                      const mainBalance = parseFloat(mainWallet?.goldGrams || '0');
                                      setFundAmount(Math.min(deficit, mainBalance).toFixed(3));
                                      setShowFundDialog(true);
                                    }}
                                    className="mt-2 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium rounded-lg transition-colors"
                                    data-testid="button-transfer-finapay"
                                  >
                                    Transfer from FinaPay
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {requestForm.settlementGoldGrams && 
                           parseFloat(requestForm.settlementGoldGrams) <= parseFloat(wallet?.availableGoldGrams || '0') &&
                           parseFloat(requestForm.settlementGoldGrams) > 0 && (
                            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                              <p className="text-green-700 text-xs flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                Sufficient balance available in FinaBridge wallet
                              </p>
                            </div>
                          )}
                          
                          {insufficientFundsError && (
                            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                              {insufficientFundsError}
                            </div>
                          )}
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <label className="text-sm font-medium">Description</label>
                          <textarea
                            value={requestForm.description}
                            onChange={(e) => setRequestForm({ ...requestForm, description: e.target.value })}
                            className="w-full p-3 border rounded-lg"
                            rows={2}
                            placeholder="Additional details about your trade request..."
                            data-testid="input-description"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg bg-purple-50/50 border-purple-200">
                      <h4 className="font-medium mb-4 flex items-center gap-2 text-purple-800">
                        <Truck className="w-4 h-4" />
                        Shipping & Logistics
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Mode of Transport</label>
                          <select
                            value={requestForm.modeOfTransport}
                            onChange={(e) => setRequestForm({ ...requestForm, modeOfTransport: e.target.value })}
                            className="w-full p-3 border rounded-lg bg-white"
                            data-testid="select-transport-mode"
                          >
                            <option value="Sea">Sea Freight</option>
                            <option value="Air">Air Freight</option>
                            <option value="Road">Road Transport</option>
                            <option value="Rail">Rail Freight</option>
                            <option value="Multimodal">Multimodal</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Incoterms</label>
                          <select
                            value={requestForm.incoterms}
                            onChange={(e) => setRequestForm({ ...requestForm, incoterms: e.target.value })}
                            className="w-full p-3 border rounded-lg bg-white"
                            data-testid="select-incoterms"
                          >
                            <option value="FOB">FOB - Free on Board</option>
                            <option value="CIF">CIF - Cost, Insurance & Freight</option>
                            <option value="EXW">EXW - Ex Works</option>
                            <option value="DDP">DDP - Delivered Duty Paid</option>
                            <option value="FCA">FCA - Free Carrier</option>
                            <option value="CFR">CFR - Cost and Freight</option>
                            <option value="DAP">DAP - Delivered at Place</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Expected Ship Date</label>
                          <input
                            type="date"
                            value={requestForm.expectedShipDate}
                            onChange={(e) => setRequestForm({ ...requestForm, expectedShipDate: e.target.value })}
                            className="w-full p-3 border rounded-lg"
                            data-testid="input-ship-date"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Port of Loading</label>
                          <input
                            type="text"
                            value={requestForm.portOfLoading}
                            onChange={(e) => setRequestForm({ ...requestForm, portOfLoading: e.target.value })}
                            className="w-full p-3 border rounded-lg"
                            placeholder="e.g., Shanghai Port, China"
                            data-testid="input-port-loading"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Port of Discharge / Destination</label>
                          <input
                            type="text"
                            value={requestForm.destination}
                            onChange={(e) => setRequestForm({ ...requestForm, destination: e.target.value })}
                            className="w-full p-3 border rounded-lg"
                            placeholder="e.g., Jebel Ali Port, UAE"
                            data-testid="input-destination"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Final Destination (if different)</label>
                          <input
                            type="text"
                            value={requestForm.portOfDischarge}
                            onChange={(e) => setRequestForm({ ...requestForm, portOfDischarge: e.target.value })}
                            className="w-full p-3 border rounded-lg"
                            placeholder="e.g., Dubai, UAE"
                            data-testid="input-port-discharge"
                          />
                        </div>
                        <div className="flex items-center gap-6 md:col-span-3">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={requestForm.partialShipment}
                              onChange={(e) => setRequestForm({ ...requestForm, partialShipment: e.target.checked })}
                              className="rounded border-gray-300"
                              data-testid="checkbox-partial-shipment"
                            />
                            <span className="text-sm">Partial Shipment Allowed</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={requestForm.transshipment}
                              onChange={(e) => setRequestForm({ ...requestForm, transshipment: e.target.checked })}
                              className="rounded border-gray-300"
                              data-testid="checkbox-transshipment"
                            />
                            <span className="text-sm">Transshipment Allowed</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg bg-teal-50/50 border-teal-200">
                      <h4 className="font-medium mb-4 flex items-center gap-2 text-teal-800">
                        <Shield className="w-4 h-4" />
                        Insurance (Optional)
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Insurance Coverage Type</label>
                          <select
                            value={requestForm.insuranceCoverage}
                            onChange={(e) => setRequestForm({ ...requestForm, insuranceCoverage: e.target.value })}
                            className="w-full p-3 border rounded-lg bg-white"
                            data-testid="select-insurance-coverage"
                          >
                            <option value="">Select coverage type...</option>
                            <option value="All Risks">All Risks (Institute Cargo Clauses A)</option>
                            <option value="Named Perils">Named Perils (Institute Cargo Clauses B)</option>
                            <option value="FPA">Free of Particular Average (FPA - Clauses C)</option>
                            <option value="War Risk">War Risk Coverage</option>
                            <option value="Strike Risk">Strike, Riot & Civil Commotion</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Insurance Provider (if known)</label>
                          <input
                            type="text"
                            value={requestForm.insuranceProvider}
                            onChange={(e) => setRequestForm({ ...requestForm, insuranceProvider: e.target.value })}
                            className="w-full p-3 border rounded-lg"
                            placeholder="e.g., Lloyd's of London, AIG, etc."
                            data-testid="input-insurance-provider"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-4 pt-4">
                      <Button type="button" variant="outline" onClick={() => setActiveTab('requests')}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={submitting} data-testid="button-submit-request">
                        {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Create Trade Request
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="proposals">
              <Card className="bg-white border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="w-5 h-5" />
                    Forwarded Proposals
                    {selectedRequest && (
                      <span className="text-sm font-normal text-muted-foreground ml-2">
                        for {selectedRequest.tradeRefId}
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {forwardedProposals.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No proposals have been forwarded yet.</p>
                      <p className="text-sm mt-2">Admin will review and forward shortlisted proposals for your review.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {forwardedProposals.map((proposal) => (
                        <Card key={proposal.id} className="border">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-bold">Exporter: {proposal.exporter?.finatradesId || 'Unknown'}</p>
                                <p className="text-sm text-muted-foreground">Quote: ${parseFloat(proposal.quotePrice).toLocaleString()}</p>
                                <p className="text-sm text-muted-foreground">Timeline: {proposal.timelineDays} days</p>
                                {proposal.notes && (
                                  <p className="text-sm mt-2">{proposal.notes}</p>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeclineProposal(proposal.id)}
                                  disabled={submitting}
                                  data-testid={`button-decline-${proposal.id}`}
                                >
                                  <X className="w-4 h-4 mr-1" /> Decline
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleAcceptProposal(proposal.id)}
                                  disabled={submitting}
                                  data-testid={`button-accept-${proposal.id}`}
                                >
                                  <Check className="w-4 h-4 mr-1" /> Accept
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-muted border border-border p-1 mb-6 w-full md:w-auto flex">
              <TabsTrigger value="requests" className="flex-1 md:flex-none data-[state=active]:bg-secondary data-[state=active]:text-white">
                <Briefcase className="w-4 h-4 mr-2" /> Open Trade Requests
              </TabsTrigger>
              <TabsTrigger value="proposals" className="flex-1 md:flex-none data-[state=active]:bg-secondary data-[state=active]:text-white">
                <Send className="w-4 h-4 mr-2" /> My Proposals
              </TabsTrigger>
            </TabsList>

            <TabsContent value="requests" className="mt-0">
              {loading ? (
                <Card className="bg-white border">
                  <CardContent className="p-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
                    <p className="mt-4 text-muted-foreground">Loading open trade requests...</p>
                  </CardContent>
                </Card>
              ) : openRequests.length === 0 ? (
                <Card className="bg-white border">
                  <CardContent className="p-12 text-center">
                    <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                    <h3 className="text-lg font-bold mb-2">No Open Trade Requests</h3>
                    <p className="text-muted-foreground">Check back later for new trade opportunities.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {openRequests.map((request) => (
                    <Card key={request.id} className="bg-white border hover:border-secondary/50 transition-colors">
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
                                Importer: {request.importer?.finatradesId || 'N/A'} | {request.destination || 'Destination TBD'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="font-bold">${parseFloat(request.tradeValueUsd).toLocaleString()}</p>
                              <p className="text-xs text-muted-foreground">{parseFloat(request.settlementGoldGrams).toFixed(3)}g gold</p>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => { setSelectedRequest(request); setShowProposalDialog(true); }}
                              data-testid={`button-submit-proposal-${request.id}`}
                            >
                              Submit Proposal
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="proposals" className="mt-0">
              {loading ? (
                <Card className="bg-white border">
                  <CardContent className="p-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
                    <p className="mt-4 text-muted-foreground">Loading your proposals...</p>
                  </CardContent>
                </Card>
              ) : myProposals.length === 0 ? (
                <Card className="bg-white border">
                  <CardContent className="p-12 text-center">
                    <Send className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                    <h3 className="text-lg font-bold mb-2">No Proposals Yet</h3>
                    <p className="text-muted-foreground mb-4">Browse open trade requests to submit your proposals.</p>
                    <Button onClick={() => setActiveTab('requests')}>
                      <Briefcase className="w-4 h-4 mr-2" /> View Open Requests
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {myProposals.map((proposal) => (
                    <Card key={proposal.id} className="bg-white border">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-2 bg-secondary/10 rounded-lg">
                              <Send className="w-5 h-5 text-secondary" />
                            </div>
                            <div>
                              <h3 className="font-bold">{proposal.tradeRequest?.tradeRefId}</h3>
                              <p className="text-sm text-muted-foreground">{proposal.tradeRequest?.goodsName}</p>
                              <p className="text-xs text-muted-foreground">
                                Quote: ${parseFloat(proposal.quotePrice).toLocaleString()} | Timeline: {proposal.timelineDays} days
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(proposal.status)}`}>
                              {proposal.status}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        <Dialog open={showProposalDialog} onOpenChange={setShowProposalDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Submit Proposal for {selectedRequest?.tradeRefId}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmitProposal} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Quote Price (USD) *</label>
                <input
                  type="number"
                  value={proposalForm.quotePrice}
                  onChange={(e) => setProposalForm({ ...proposalForm, quotePrice: e.target.value })}
                  className="w-full p-3 border rounded-lg"
                  placeholder="0.00"
                  required
                  data-testid="input-quote-price"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Timeline (Days) *</label>
                <input
                  type="number"
                  value={proposalForm.timelineDays}
                  onChange={(e) => setProposalForm({ ...proposalForm, timelineDays: e.target.value })}
                  className="w-full p-3 border rounded-lg"
                  placeholder="30"
                  required
                  data-testid="input-timeline-days"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Notes</label>
                <textarea
                  value={proposalForm.notes}
                  onChange={(e) => setProposalForm({ ...proposalForm, notes: e.target.value })}
                  className="w-full p-3 border rounded-lg"
                  rows={3}
                  placeholder="Additional details about your proposal..."
                  data-testid="input-proposal-notes"
                />
              </div>
              <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" onClick={() => setShowProposalDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} data-testid="button-confirm-proposal">
                  {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Submit Proposal
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={showFundDialog} onOpenChange={setShowFundDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Fund FinaBridge Wallet</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleFundWallet} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Transfer gold from your main FinaPay wallet to your FinaBridge wallet for trade settlements.
              </p>
              
              <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">FinaPay Balance</p>
                  <p className="font-semibold text-blue-600">{parseFloat(mainWallet?.goldGrams || '0').toFixed(3)}g</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">FinaBridge Balance</p>
                  <p className="font-semibold text-green-600">{parseFloat(wallet?.availableGoldGrams || '0').toFixed(3)}g</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Amount to Transfer (grams) *</label>
                <input
                  type="number"
                  step="0.001"
                  max={parseFloat(mainWallet?.goldGrams || '0')}
                  value={fundAmount}
                  onChange={(e) => setFundAmount(e.target.value)}
                  className="w-full p-3 border rounded-lg"
                  placeholder="0.000"
                  required
                  data-testid="input-fund-amount"
                />
                <p className="text-xs text-muted-foreground">Maximum: {parseFloat(mainWallet?.goldGrams || '0').toFixed(3)}g</p>
              </div>
              <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" onClick={() => setShowFundDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={submitting || parseFloat(fundAmount || '0') > parseFloat(mainWallet?.goldGrams || '0')} 
                  data-testid="button-confirm-fund"
                >
                  {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Transfer Gold
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

      </div>
    </DashboardLayout>
  );
}
