import React, { useState, useEffect } from 'react';
import AdminLayout from '@/pages/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Briefcase, CheckCircle, XCircle, TrendingUp, 
  Loader2, RefreshCw, Eye, Send, ArrowRight, Package, FileCheck, AlertCircle,
  ChevronDown, ChevronUp, Ship, Building, Phone, Mail, Calendar, Edit3, MessageCircle,
  Shield, ShieldAlert, ShieldCheck, ShieldX, Brain, Bot, User, Award, ExternalLink, FileText,
  BarChart3, Activity, Clock, StickyNote, Flag, UserCheck
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import DealRoom from '@/components/finabridge/DealRoom';
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
  // Option D fields
  paymentInstrumentType?: string | null;
  supportingDocumentUrl?: string | null;
  aiVerificationStatus?: string | null;
  aiFraudScore?: string | null;
  aiExtractedData?: string | null;
  aiRejectionReason?: string | null;
  tier1Status?: string | null;
  tier1Notes?: string | null;
  tier1ReviewedBy?: string | null;
  tier2Status?: string | null;
  tier2Notes?: string | null;
  tier2ReviewedBy?: string | null;
  tier3Status?: string | null;
  tier3Notes?: string | null;
  tier3ReviewedBy?: string | null;
  publishedToExporters?: boolean | null;
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

interface AdminDealRoom {
  id: string;
  tradeRequestId: string;
  acceptedProposalId: string;
  importerUserId: string;
  exporterUserId: string;
  assignedAdminId: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  lcLifecycleStatus?: string | null;
  isClosed?: boolean | null;
  tradeRequest?: {
    tradeRefId: string;
    goodsName: string;
    tradeValueUsd: string;
    status: string;
  } | null;
  importer?: { id: string; finatradesId: string | null; email: string } | null;
  exporter?: { id: string; finatradesId: string | null; email: string } | null;
  unreadCount?: number;
  docsTotal?: number;
  docsApproved?: number;
}

interface SettlementHold {
  id: string;
  tradeRequestId: string;
  proposalId: string;
  importerUserId: string;
  exporterUserId: string;
  lockedGoldGrams: string;
  status: string;
  createdAt: string;
}

interface FraudCheckResult {
  checkName: string;
  passed: boolean;
  score: number;
  maxScore: number;
  detail: string;
}

interface AiExtractedData {
  extracted: Record<string, unknown>;
  fraudResult: {
    totalScore: number;
    checks: FraudCheckResult[];
    recommendation: 'pass' | 'reject';
    summary: string;
  };
}

interface TradeDocumentWithAi {
  id: string;
  caseId: string;
  documentType: string;
  documentUrl: string;
  fileName: string;
  status: string;
  uploadedAt: string;
  aiVerificationStatus: string | null;
  aiFraudScore: number | null;
  aiExtractedData: AiExtractedData | null;
  aiRejectionReason: string | null;
  aiVerifiedAt: string | null;
  aiRetryCount: number | null;
}

interface TradeCaseWithDocs {
  id: string;
  caseNumber: string;
  userId: string;
  companyName: string;
  tradeType: string;
  commodityType: string;
  tradeValueUsd: string;
  buyerName: string | null;
  sellerName: string | null;
  status: string;
  createdAt: string;
  documents?: TradeDocumentWithAi[];
}

interface AiCaseCardProps {
  tradeCase: TradeCaseWithDocs;
  expandedAiDoc: string | null;
  setExpandedAiDoc: (id: string | null) => void;
  getStatusColor: (s: string) => string;
  getFraudScoreBadgeColor: (s: number | null) => string;
  getFraudScoreLabel: (s: number | null) => string;
}

function AiCaseCard({ tradeCase, expandedAiDoc, setExpandedAiDoc, getStatusColor, getFraudScoreBadgeColor, getFraudScoreLabel }: AiCaseCardProps) {
  return (
    <div className="border rounded-lg overflow-hidden" data-testid={`ai-case-${tradeCase.id}`}>
      <div className="p-4 bg-muted/30 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold">{tradeCase.caseNumber}</h3>
            <p className="text-sm text-muted-foreground">{tradeCase.companyName} · {tradeCase.tradeType} · {tradeCase.commodityType}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Trade Value: <strong>${parseFloat(tradeCase.tradeValueUsd).toLocaleString()}</strong>
            </p>
          </div>
          <Badge className={getStatusColor(tradeCase.status)}>{tradeCase.status}</Badge>
        </div>
      </div>
      {tradeCase.documents && tradeCase.documents.length > 0 && (
        <div className="divide-y">
          {tradeCase.documents.map((doc) => (
            <div key={doc.id} className="p-4" data-testid={`ai-doc-${doc.id}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {doc.aiFraudScore !== null && doc.aiFraudScore >= 50 ? (
                    <ShieldX className="w-5 h-5 text-red-500" />
                  ) : doc.aiFraudScore !== null ? (
                    <ShieldCheck className="w-5 h-5 text-green-500" />
                  ) : (
                    <ShieldAlert className="w-5 h-5 text-amber-500" />
                  )}
                  <div>
                    <p className="font-medium text-sm">{doc.documentType}</p>
                    <p className="text-xs text-muted-foreground">{doc.fileName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {doc.aiFraudScore !== null && (
                    <Badge className={getFraudScoreBadgeColor(doc.aiFraudScore)} data-testid={`fraud-score-${doc.id}`}>
                      {getFraudScoreLabel(doc.aiFraudScore)}
                    </Badge>
                  )}
                  <Badge className={getStatusColor(doc.status)}>{doc.status}</Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setExpandedAiDoc(expandedAiDoc === doc.id ? null : doc.id)}
                    data-testid={`button-expand-ai-${doc.id}`}
                  >
                    {expandedAiDoc === doc.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {expandedAiDoc === doc.id && (
                <div className="mt-4 space-y-4" data-testid={`ai-report-${doc.id}`}>
                  {doc.aiRejectionReason && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-xs font-semibold text-red-800 mb-1 flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> AI Rejection Reason
                      </p>
                      <p className="text-sm text-red-700">{doc.aiRejectionReason}</p>
                    </div>
                  )}

                  {doc.aiExtractedData?.fraudResult && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fraud Check Results</p>
                      <div className="divide-y border rounded-lg overflow-hidden">
                        {doc.aiExtractedData.fraudResult.checks.map((check, idx) => (
                          <div key={idx} className="flex items-start justify-between p-3 text-sm" data-testid={`fraud-check-${doc.id}-${idx}`}>
                            <div className="flex items-start gap-2">
                              {check.passed ? (
                                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                              )}
                              <div>
                                <p className="font-medium">{check.checkName}</p>
                                <p className="text-xs text-muted-foreground">{check.detail}</p>
                              </div>
                            </div>
                            <span className="text-xs font-mono shrink-0 ml-4">{check.score}/{check.maxScore}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {doc.aiExtractedData?.extracted && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Extracted Document Fields</p>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(doc.aiExtractedData.extracted)
                          .filter(([k, v]) => v !== null && v !== undefined && !Array.isArray(v) && k !== 'anomalies' && k !== 'document_appears_authentic')
                          .map(([key, value]) => (
                            <div key={key} className="p-2 bg-muted/30 rounded text-xs" data-testid={`extracted-field-${doc.id}-${key}`}>
                              <p className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</p>
                              <p className="font-medium">{String(value)}</p>
                            </div>
                          ))}
                      </div>
                      {((doc.aiExtractedData.extracted.anomalies as string[] | undefined)?.length ?? 0) > 0 && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <p className="text-xs font-semibold text-amber-800 mb-1">Flagged Anomalies</p>
                          <ul className="text-xs text-amber-700 list-disc list-inside space-y-1">
                            {(doc.aiExtractedData.extracted.anomalies as string[]).map((anomaly, i) => (
                              <li key={i}>{anomaly}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                    <span>Verified: {doc.aiVerifiedAt ? new Date(doc.aiVerifiedAt).toLocaleString() : 'Not yet'}</span>
                    <span>Retries: {doc.aiRetryCount ?? 0}/3</span>
                    <a href={doc.documentUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                      View Original Document
                    </a>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
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
  const [requestedDocuments, setRequestedDocuments] = useState<string[]>([]);
  const [customDocumentNotes, setCustomDocumentNotes] = useState('');
  const [customDocumentInput, setCustomDocumentInput] = useState('');
  const [dealRooms, setDealRooms] = useState<AdminDealRoom[]>([]);
  const [selectedDealRoom, setSelectedDealRoom] = useState<string | null>(null);
  const [settlementHolds, setSettlementHolds] = useState<SettlementHold[]>([]);
  const [completingTrade, setCompletingTrade] = useState<string | null>(null);
  const [releaseConfirmDialog, setReleaseConfirmDialog] = useState<{
    hold: SettlementHold;
    request: TradeRequest;
  } | null>(null);
  const [aiCases, setAiCases] = useState<TradeCaseWithDocs[]>([]);
  const [aiCasesLoading, setAiCasesLoading] = useState(false);
  const [expandedAiDoc, setExpandedAiDoc] = useState<string | null>(null);

  // Option D — Tier Review State
  const [tierRequests, setTierRequests] = useState<TradeRequest[]>([]);
  const [tierReviewLoading, setTierReviewLoading] = useState(false);
  const [tierActionDialog, setTierActionDialog] = useState<{
    request: TradeRequest;
    tier: 1 | 2 | 3;
    action: 'approve' | 'reject';
  } | null>(null);
  const [tierNotes, setTierNotes] = useState('');
  const [tierActioning, setTierActioning] = useState(false);
  const [expandedTierRequest, setExpandedTierRequest] = useState<string | null>(null);
  const [docViewRequest, setDocViewRequest] = useState<TradeRequest | null>(null);

  // Deal Manager Portal state
  const [dealManagerRooms, setDealManagerRooms] = useState<AdminDealRoom[]>([]);
  const [dealManagerLoading, setDealManagerLoading] = useState(false);
  const [internalNotes, setInternalNotes] = useState<Record<string, { id: string; note: string; createdAt: string; authorName: string; isEscalated?: boolean }[]>>({});
  const [newNote, setNewNote] = useState<Record<string, string>>({});
  const [savingNote, setSavingNote] = useState<string | null>(null);
  const [assigningManager, setAssigningManager] = useState<string | null>(null);
  const [assignManagerEmail, setAssignManagerEmail] = useState<Record<string, string>>({});
  const [loadingNotes, setLoadingNotes] = useState<Record<string, boolean>>({});

  // Analytics state
  const [analyticsData, setAnalyticsData] = useState<{
    activeVsClosed: { month: string; active: number; closed: number }[];
    docRejectionRates: { type: string; rejectionRate: number; total: number; rejected: number }[];
    discrepancyReasons: { reason: string; count: number }[];
    avgCompletionTime: { month: string; avgDays: number }[];
    summary: { totalRooms: number; activeRooms: number; closedRooms: number; totalDocuments: number; totalDiscrepancies: number };
  } | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const STANDARD_DOCUMENTS = [
    { key: 'company_registration', label: 'Company Registration Certificate' },
    { key: 'trade_license', label: 'Trade License' },
    { key: 'export_license', label: 'Export License' },
    { key: 'product_certification', label: 'Product Certification' },
    { key: 'quality_certificate', label: 'Quality Certificate' },
    { key: 'bank_reference', label: 'Bank Reference Letter' },
    { key: 'financial_statement', label: 'Financial Statements' },
    { key: 'insurance_certificate', label: 'Insurance Certificate' },
    { key: 'packing_list', label: 'Packing List Sample' },
    { key: 'product_photos', label: 'Product Photos' },
  ];

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

  const fetchTierRequests = async () => {
    setTierReviewLoading(true);
    try {
      const res = await apiRequest('GET', '/api/admin/finabridge/tier-review');
      const data = await res.json();
      setTierRequests(data.requests || []);
    } catch (err) {
      console.error('Failed to load tier review requests:', err);
    } finally {
      setTierReviewLoading(false);
    }
  };

  const handleTierAction = async () => {
    if (!tierActionDialog) return;
    const { request, tier, action } = tierActionDialog;
    setTierActioning(true);
    try {
      const endpoint = `/api/admin/finabridge/requests/${request.id}/tier${tier}-${action}`;
      await apiRequest('POST', endpoint, { notes: tierNotes, reviewedBy: user?.firstName || undefined });
      toast({
        title: action === 'approve' ? 'Approved ✓' : 'Rejected',
        description: action === 'approve'
          ? tier === 3 ? 'Trade is now live on the exporter marketplace' : `Escalated to Tier ${tier + 1} reviewer`
          : 'Importer has been notified',
      });
      setTierActionDialog(null);
      setTierNotes('');
      fetchTierRequests();
      fetchRequests();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Action failed', variant: 'destructive' });
    } finally {
      setTierActioning(false);
    }
  };

  const fetchDealRooms = async () => {
    if (!user?.id) return;
    try {
      const res = await apiRequest('GET', '/api/admin/deal-rooms');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setDealRooms(data.rooms || []);
    } catch (err) {
      console.error('Failed to load deal rooms:', err);
    }
  };

  const fetchSettlementHolds = async () => {
    try {
      const res = await apiRequest('GET', '/api/admin/finabridge/settlement-holds');
      const data = await res.json();
      setSettlementHolds(data.holds || []);
    } catch (err) {
      console.error('Failed to load settlement holds:', err);
    }
  };

  const fetchAiCases = async () => {
    setAiCasesLoading(true);
    try {
      const res = await apiRequest('GET', '/api/admin/finabridge/ai-cases');
      const data = await res.json();
      setAiCases(data.cases || []);
    } catch (err) {
      console.error('Failed to load AI cases:', err);
    } finally {
      setAiCasesLoading(false);
    }
  };

  const fetchDealManagerRooms = async () => {
    setDealManagerLoading(true);
    try {
      const res = await apiRequest('GET', '/api/admin/deal-rooms');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setDealManagerRooms(data.rooms || []);
    } catch (err) {
      console.error('Failed to load deal manager rooms:', err);
    } finally {
      setDealManagerLoading(false);
    }
  };

  const fetchInternalNotes = async (roomId: string) => {
    setLoadingNotes(prev => ({ ...prev, [roomId]: true }));
    try {
      const res = await apiRequest('GET', `/api/admin/deal-rooms/${roomId}/internal-notes`);
      if (res.ok) {
        const data = await res.json();
        setInternalNotes(prev => ({ ...prev, [roomId]: data.notes || [] }));
      }
    } catch (err) {
      console.error('Failed to fetch notes:', err);
    } finally {
      setLoadingNotes(prev => ({ ...prev, [roomId]: false }));
    }
  };

  const saveInternalNote = async (roomId: string) => {
    const note = newNote[roomId]?.trim();
    if (!note) return;
    setSavingNote(roomId);
    try {
      const res = await apiRequest('POST', `/api/admin/deal-rooms/${roomId}/internal-notes`, { note });
      if (res.ok) {
        setNewNote(prev => ({ ...prev, [roomId]: '' }));
        await fetchInternalNotes(roomId);
        toast({ title: 'Note saved' });
      }
    } catch (err) {
      toast({ title: 'Failed to save note', variant: 'destructive' });
    } finally {
      setSavingNote(null);
    }
  };

  const assignDealManager = async (roomId: string) => {
    const email = assignManagerEmail[roomId]?.trim();
    if (!email) return;
    setAssigningManager(roomId);
    try {
      const res = await apiRequest('POST', `/api/admin/deal-rooms/${roomId}/assign-manager`, { adminEmail: email });
      if (res.ok) {
        toast({ title: 'Deal Manager assigned' });
        setAssignManagerEmail(prev => ({ ...prev, [roomId]: '' }));
        await fetchDealManagerRooms();
      } else {
        const err = await res.json();
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Failed to assign manager', variant: 'destructive' });
    } finally {
      setAssigningManager(null);
    }
  };

  const escalateDealRoom = async (roomId: string) => {
    const reason = window.prompt('Enter escalation reason (optional):');
    if (reason === null) return;
    try {
      const res = await apiRequest('PATCH', `/api/admin/deal-rooms/${roomId}/escalate`, { reason: reason.trim() || 'Flagged for senior review' });
      if (res.ok) {
        toast({ title: 'Deal escalated', description: 'Senior admin has been notified.' });
        await fetchDealManagerRooms();
      } else {
        const err = await res.json();
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Failed to escalate', variant: 'destructive' });
    }
  };

  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const res = await apiRequest('GET', '/api/admin/finabridge/deal-analytics');
      if (res.ok) {
        const data = await res.json();
        setAnalyticsData(data);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const openReleaseDialog = (hold: SettlementHold, request: TradeRequest) => {
    setReleaseConfirmDialog({ hold, request });
  };

  const handleConfirmRelease = async () => {
    if (!releaseConfirmDialog) return;
    
    const { hold } = releaseConfirmDialog;
    setCompletingTrade(hold.id);
    setReleaseConfirmDialog(null);
    
    try {
      await apiRequest('POST', `/api/admin/finabridge/settlement-holds/${hold.id}/release`);
      toast({ title: 'Success', description: 'Trade completed! Gold has been released to the exporter.' });
      fetchRequests();
      fetchSettlementHolds();
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to complete trade', variant: 'destructive' });
    } finally {
      setCompletingTrade(null);
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchDisclaimerUsers();
    fetchDealRooms();
    fetchSettlementHolds();
    fetchTierRequests();
    fetchAiCases();
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchRequests();
      fetchDisclaimerUsers();
      fetchDealRooms();
      fetchSettlementHolds();
      fetchTierRequests();
      fetchAiCases();
    }, 30000);
    return () => clearInterval(interval);
  }, [user?.id]);

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
    if (!modificationDialog || (requestedDocuments.length === 0 && !modificationText.trim() && !customDocumentNotes.trim())) {
      toast({ title: 'Error', description: 'Please select documents or provide instructions', variant: 'destructive' });
      return;
    }
    setUpdating(true);
    try {
      await apiRequest('POST', `/api/admin/finabridge/proposals/${modificationDialog.id}/request-modification`, {
        modificationRequest: modificationText.trim(),
        requestedDocuments: requestedDocuments,
        customDocumentNotes: customDocumentNotes.trim(),
      });
      toast({ title: 'Success', description: 'Modification request sent to exporter' });
      setModificationDialog(null);
      setModificationText('');
      setRequestedDocuments([]);
      setCustomDocumentNotes('');
      setCustomDocumentInput('');
      if (selectedRequest) {
        await fetchProposals(selectedRequest.id);
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to send modification request', variant: 'destructive' });
    } finally {
      setUpdating(false);
    }
  };

  const toggleDocumentSelection = (docKey: string) => {
    if (requestedDocuments.includes(docKey)) {
      setRequestedDocuments(requestedDocuments.filter(d => d !== docKey));
    } else {
      setRequestedDocuments([...requestedDocuments, docKey]);
    }
  };

  const addCustomDocument = () => {
    if (customDocumentInput.trim() && !requestedDocuments.includes(`custom:${customDocumentInput.trim()}`)) {
      setRequestedDocuments([...requestedDocuments, `custom:${customDocumentInput.trim()}`]);
      setCustomDocumentInput('');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft': return 'bg-gray-100 text-gray-700';
      case 'Open': return 'bg-blue-100 text-blue-700';
      case 'Proposal Review': return 'bg-purple-100 text-fuchsia-700';
      case 'Awaiting Importer': return 'bg-purple-100 text-purple-700';
      case 'Active Trade': return 'bg-green-100 text-green-700';
      case 'Completed': return 'bg-emerald-100 text-emerald-700';
      case 'Cancelled': return 'bg-red-100 text-red-700';
      case 'Submitted': return 'bg-blue-100 text-blue-700';
      case 'Shortlisted': return 'bg-purple-100 text-fuchsia-700';
      case 'Forwarded': return 'bg-purple-100 text-purple-700';
      case 'Accepted': return 'bg-green-100 text-green-700';
      case 'Rejected': return 'bg-red-100 text-red-700';
      case 'Declined': return 'bg-gray-100 text-gray-700';
      case 'AI Review': return 'bg-blue-100 text-blue-800';
      case 'AI Rejected': return 'bg-red-100 text-red-800';
      case 'Tier 1 Review': return 'bg-amber-100 text-amber-800';
      case 'Tier 2 Review': return 'bg-orange-100 text-orange-800';
      case 'Tier 3 Review': return 'bg-yellow-100 text-yellow-900';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getFraudScoreTextColor = (score: string | null | undefined) => {
    if (!score) return 'text-gray-500';
    const n = parseFloat(score);
    if (n <= 20) return 'text-green-600';
    if (n <= 50) return 'text-amber-600';
    return 'text-red-600';
  };

  const getFraudScoreBadgeColor = (score: number | null) => {
    if (score === null) return 'bg-gray-100 text-gray-700';
    if (score < 25) return 'bg-green-100 text-green-800';
    if (score < 50) return 'bg-amber-100 text-amber-800';
    return 'bg-red-100 text-red-800';
  };

  const getFraudScoreLabel = (score: number | null) => {
    if (score === null) return 'Pending';
    if (score < 25) return `${score}/100 — Low Fraud Risk`;
    if (score < 50) return `${score}/100 — Medium Fraud Risk`;
    return `${score}/100 — High Fraud Risk`;
  };

  const parseTierAiData = (aiExtractedData: string | null | undefined) => {
    if (!aiExtractedData) return null;
    try { return JSON.parse(aiExtractedData); } catch { return null; }
  };

  const stats = {
    total: requests.length,
    open: requests.filter(r => r.status === 'Open' || r.status === 'Proposal Review').length,
    awaitingImporter: requests.filter(r => r.status === 'Awaiting Importer').length,
    activeTrades: requests.filter(r => r.status === 'Active Trade').length,
    completed: requests.filter(r => r.status === 'Completed').length,
    tierPending: tierRequests.filter(r => ['Tier 1 Review', 'Tier 2 Review', 'Tier 3 Review', 'AI Review'].includes(r.status)).length,
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Briefcase className="w-6 h-6 text-primary" />
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

        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
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
          <Card className={stats.tierPending > 0 ? 'border-amber-300 bg-amber-50' : ''}>
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${stats.tierPending > 0 ? 'text-amber-600' : 'text-gray-400'}`}>{stats.tierPending}</p>
              <p className="text-xs text-muted-foreground">Pending Review</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="all">All Requests</TabsTrigger>
            <TabsTrigger value="review">Needs Review</TabsTrigger>
            <TabsTrigger value="active">Active Trades</TabsTrigger>
            <TabsTrigger value="dealrooms">Deal Rooms ({dealRooms.length})</TabsTrigger>
            <TabsTrigger value="tier1" className="relative">
              Tier 1 — Macy
              {tierRequests.filter(r => r.status === 'Tier 1 Review').length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-xs bg-amber-500 text-white rounded-full">
                  {tierRequests.filter(r => r.status === 'Tier 1 Review').length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="tier2" className="relative">
              Tier 2 — Farah
              {tierRequests.filter(r => r.status === 'Tier 2 Review').length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-xs bg-orange-500 text-white rounded-full">
                  {tierRequests.filter(r => r.status === 'Tier 2 Review').length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="tier3" className="relative">
              Final — Reda
              {tierRequests.filter(r => r.status === 'Tier 3 Review').length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-xs bg-yellow-600 text-white rounded-full">
                  {tierRequests.filter(r => r.status === 'Tier 3 Review').length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="aiverification" data-testid="tab-ai-verification">
              <Brain className="w-4 h-4 mr-1" />
              AI Verification
            </TabsTrigger>
            <TabsTrigger value="disclaimer">Disclaimer</TabsTrigger>
            <TabsTrigger value="dealmanager" data-testid="tab-deal-manager" onClick={() => { fetchDealManagerRooms(); }}>
              <UserCheck className="w-4 h-4 mr-1" />
              Deal Manager
            </TabsTrigger>
            <TabsTrigger value="analytics" data-testid="tab-analytics" onClick={() => fetchAnalytics()}>
              <BarChart3 className="w-4 h-4 mr-1" />
              Analytics
            </TabsTrigger>
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
                          <div className="p-2 bg-purple-100 rounded-lg">
                            <Package className="w-5 h-5 text-primary" />
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
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <TrendingUp className="w-5 h-5 text-fuchsia-600" />
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
              {requests.filter(r => r.status === 'Active Trade').map((request) => {
                const hold = settlementHolds.find(h => h.tradeRequestId === request.id && h.status === 'Held');
                return (
                  <Card key={request.id} className="hover:border-secondary/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 cursor-pointer" onClick={() => handleOpenRequest(request)}>
                          <div className="p-2 bg-green-100 rounded-lg">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <h3 className="font-bold">{request.tradeRefId}</h3>
                            <p className="text-sm text-muted-foreground">{request.goodsName}</p>
                            {hold && (
                              <p className="text-xs text-green-600 mt-1">
                                {parseFloat(hold.lockedGoldGrams).toFixed(3)}g gold locked for settlement
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-bold">${parseFloat(request.tradeValueUsd).toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">{parseFloat(request.settlementGoldGrams).toFixed(3)}g gold</p>
                          </div>
                          <Badge className={getStatusColor(request.status)}>{request.status}</Badge>
                          {hold && (
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={(e) => {
                                e.stopPropagation();
                                openReleaseDialog(hold, request);
                              }}
                              disabled={completingTrade === hold.id}
                            >
                              {completingTrade === hold.id ? 'Releasing...' : 'Complete Trade'}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {requests.filter(r => r.status === 'Active Trade').length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    No active trades.
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="aiverification" className="mt-4">
            {aiCasesLoading ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
                  <p className="mt-4 text-muted-foreground">Loading AI verification queues...</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Tier 1 Review Queue */}
                {(() => {
                  const tier1Cases = aiCases
                    .map(tc => ({ ...tc, documents: (tc.documents || []).filter(d => d.status === 'Tier 1 Review') }))
                    .filter(tc => tc.documents.length > 0);
                  return (
                    <div data-testid="tier1-review-queue">
                      <div className="flex items-center gap-2 mb-3">
                        <ShieldAlert className="w-5 h-5 text-amber-500" />
                        <h2 className="text-lg font-bold">Tier 1 Review Queue</h2>
                        <Badge className="bg-amber-100 text-amber-700">{tier1Cases.reduce((n, tc) => n + tc.documents.length, 0)} documents</Badge>
                      </div>
                      {tier1Cases.length === 0 ? (
                        <Card>
                          <CardContent className="p-8 text-center text-muted-foreground">
                            <ShieldCheck className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p className="text-sm">No documents awaiting Tier 1 Review</p>
                          </CardContent>
                        </Card>
                      ) : (
                        <div className="space-y-3">
                          {tier1Cases.map(tradeCase => (
                            <AiCaseCard
                              key={tradeCase.id}
                              tradeCase={tradeCase}
                              expandedAiDoc={expandedAiDoc}
                              setExpandedAiDoc={setExpandedAiDoc}
                              getStatusColor={getStatusColor}
                              getFraudScoreBadgeColor={getFraudScoreBadgeColor}
                              getFraudScoreLabel={getFraudScoreLabel}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* AI Rejected Queue */}
                {(() => {
                  const rejectedCases = aiCases
                    .map(tc => ({ ...tc, documents: (tc.documents || []).filter(d => d.status === 'AI Rejected') }))
                    .filter(tc => tc.documents.length > 0);
                  return (
                    <div data-testid="ai-rejected-queue">
                      <div className="flex items-center gap-2 mb-3">
                        <ShieldX className="w-5 h-5 text-red-500" />
                        <h2 className="text-lg font-bold">AI Rejected</h2>
                        <Badge className="bg-red-100 text-red-700">{rejectedCases.reduce((n, tc) => n + tc.documents.length, 0)} documents</Badge>
                      </div>
                      {rejectedCases.length === 0 ? (
                        <Card>
                          <CardContent className="p-8 text-center text-muted-foreground">
                            <Shield className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p className="text-sm">No AI-rejected documents</p>
                          </CardContent>
                        </Card>
                      ) : (
                        <div className="space-y-3">
                          {rejectedCases.map(tradeCase => (
                            <AiCaseCard
                              key={tradeCase.id}
                              tradeCase={tradeCase}
                              expandedAiDoc={expandedAiDoc}
                              setExpandedAiDoc={setExpandedAiDoc}
                              getStatusColor={getStatusColor}
                              getFraudScoreBadgeColor={getFraudScoreBadgeColor}
                              getFraudScoreLabel={getFraudScoreLabel}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
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
                            <Badge className="bg-purple-100 text-fuchsia-700 flex items-center gap-1 w-fit">
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

          <TabsContent value="dealrooms" className="mt-4">
            {selectedDealRoom ? (
              <DealRoom 
                dealRoomId={selectedDealRoom} 
                userRole="admin" 
                onClose={() => setSelectedDealRoom(null)} 
              />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5" />
                    Active Deal Rooms
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {dealRooms.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-20" />
                      <p className="font-medium">No active deal rooms</p>
                      <p className="text-sm">Deal rooms are created when a trade proposal is accepted.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {dealRooms.map((room) => (
                        <Card 
                          key={room.id} 
                          className="hover:border-secondary/50 transition-colors cursor-pointer"
                          onClick={() => setSelectedDealRoom(room.id)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="p-2 bg-purple-100 rounded-lg">
                                  <MessageCircle className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                  <h3 className="font-bold">{room.tradeRequest?.tradeRefId || 'Unknown'}</h3>
                                  <p className="text-sm text-muted-foreground">{room.tradeRequest?.goodsName}</p>
                                  <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                                    <span>Importer: {room.importer?.finatradesId || room.importer?.email}</span>
                                    <span>Exporter: {room.exporter?.finatradesId || room.exporter?.email}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <p className="font-bold">${parseFloat(room.tradeRequest?.tradeValueUsd || '0').toLocaleString()}</p>
                                  {room.unreadCount && Number(room.unreadCount) > 0 && (
                                    <span className="bg-purple-600 text-white text-[11px] font-semibold rounded-full px-2 py-0.5">{room.unreadCount} unread</span>
                                  )}
                                </div>
                                <Badge className={room.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                                  {room.status}
                                </Badge>
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
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ——————————————————————————————————————————————
              OPTION D — TIER 1 REVIEW (Macy)
          —————————————————————————————————————————————— */}
          <TabsContent value="tier1" className="mt-4">
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <ShieldCheck className="w-5 h-5 text-amber-600" />
                <div>
                  <p className="font-semibold text-amber-900">Tier 1 Compliance Review — Macy</p>
                  <p className="text-sm text-amber-700">Review AI verification results and supporting documents. Approve to escalate to Farah (Tier 2) or reject to notify the importer.</p>
                </div>
              </div>

              {tierReviewLoading ? (
                <Card><CardContent className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></CardContent></Card>
              ) : tierRequests.filter(r => r.status === 'Tier 1 Review').length === 0 ? (
                <Card><CardContent className="p-8 text-center text-muted-foreground">
                  <ShieldCheck className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No applications awaiting Tier 1 review.</p>
                </CardContent></Card>
              ) : tierRequests.filter(r => r.status === 'Tier 1 Review').map((request) => {
                const aiData = parseTierAiData(request.aiExtractedData);
                const isExpanded = expandedTierRequest === request.id;
                return (
                  <Card key={request.id} className="border-amber-200">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge className="bg-amber-100 text-amber-800 font-mono">{request.tradeRefId}</Badge>
                            <Badge className={getStatusColor(request.status)}>{request.status}</Badge>
                            {request.paymentInstrumentType && (
                              <Badge variant="outline" className="text-xs">{request.paymentInstrumentType}</Badge>
                            )}
                          </div>
                          <h3 className="font-bold text-lg">{request.goodsName}</h3>
                          <p className="text-sm text-muted-foreground">{request.importer?.companyName || request.importer?.fullName}</p>
                          <div className="flex gap-6 mt-2 text-sm">
                            <span className="font-semibold">${parseFloat(request.tradeValueUsd).toLocaleString()}</span>
                            <span className="text-muted-foreground">{parseFloat(request.settlementGoldGrams).toFixed(3)}g gold</span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          {request.aiFraudScore && (
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground">Fraud Score</p>
                              <p className={`text-xl font-bold ${getFraudScoreTextColor(request.aiFraudScore)}`}>
                                {parseFloat(request.aiFraudScore).toFixed(0)}/100
                              </p>
                            </div>
                          )}
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => setExpandedTierRequest(isExpanded ? null : request.id)}>
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              {isExpanded ? 'Less' : 'AI Report'}
                            </Button>
                            {request.supportingDocumentUrl && (
                              <Button size="sm" variant="outline" onClick={() => setDocViewRequest(request)}>
                                <FileText className="w-4 h-4 mr-1" /> View Doc
                              </Button>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" className="bg-green-600 hover:bg-green-700"
                              onClick={() => setTierActionDialog({ request, tier: 1, action: 'approve' })}>
                              <CheckCircle className="w-4 h-4 mr-1" /> Approve
                            </Button>
                            <Button size="sm" variant="destructive"
                              onClick={() => setTierActionDialog({ request, tier: 1, action: 'reject' })}>
                              <XCircle className="w-4 h-4 mr-1" /> Reject
                            </Button>
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t space-y-3">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-blue-50 rounded-lg">
                              <p className="text-xs font-semibold text-blue-700 mb-1 flex items-center gap-1"><Bot className="w-3 h-3" /> AI Verification</p>
                              <p className="text-sm text-blue-900 font-bold">{request.aiVerificationStatus || 'Pending'}</p>
                              {request.aiRejectionReason && <p className="text-xs text-red-600 mt-1">{request.aiRejectionReason}</p>}
                            </div>
                            {request.aiFraudScore && (
                              <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-xs font-semibold text-gray-600 mb-1">Fraud Risk Score</p>
                                <p className={`text-2xl font-bold ${getFraudScoreTextColor(request.aiFraudScore)}`}>
                                  {parseFloat(request.aiFraudScore).toFixed(1)} / 100
                                </p>
                                <p className="text-xs text-gray-500">{parseFloat(request.aiFraudScore) <= 20 ? 'Low risk' : parseFloat(request.aiFraudScore) <= 50 ? 'Medium risk' : 'High risk'}</p>
                              </div>
                            )}
                          </div>
                          {aiData && (
                            <div className="p-3 bg-gray-50 rounded-lg">
                              <p className="text-xs font-semibold text-gray-600 mb-2">AI Extracted Document Data</p>
                              <pre className="text-xs text-gray-700 whitespace-pre-wrap overflow-auto max-h-40">{JSON.stringify(aiData, null, 2)}</pre>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* ——————————————————————————————————————————————
              OPTION D — TIER 2 REVIEW (Farah)
          —————————————————————————————————————————————— */}
          <TabsContent value="tier2" className="mt-4">
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <ShieldCheck className="w-5 h-5 text-orange-600" />
                <div>
                  <p className="font-semibold text-orange-900">Tier 2 Senior Compliance Review — Farah Hashim</p>
                  <p className="text-sm text-orange-700">These applications passed Macy's Tier 1 review. Review all documentation and Tier 1 notes before approving for Director sign-off.</p>
                </div>
              </div>

              {tierReviewLoading ? (
                <Card><CardContent className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></CardContent></Card>
              ) : tierRequests.filter(r => r.status === 'Tier 2 Review').length === 0 ? (
                <Card><CardContent className="p-8 text-center text-muted-foreground">
                  <ShieldCheck className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No applications awaiting Tier 2 review.</p>
                </CardContent></Card>
              ) : tierRequests.filter(r => r.status === 'Tier 2 Review').map((request) => {
                const aiData = parseTierAiData(request.aiExtractedData);
                const isExpanded = expandedTierRequest === request.id;
                return (
                  <Card key={request.id} className="border-orange-200">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge className="bg-orange-100 text-orange-800 font-mono">{request.tradeRefId}</Badge>
                            <Badge className={getStatusColor(request.status)}>{request.status}</Badge>
                            {request.paymentInstrumentType && <Badge variant="outline" className="text-xs">{request.paymentInstrumentType}</Badge>}
                          </div>
                          <h3 className="font-bold text-lg">{request.goodsName}</h3>
                          <p className="text-sm text-muted-foreground">{request.importer?.companyName || request.importer?.fullName}</p>
                          <div className="flex gap-6 mt-2 text-sm">
                            <span className="font-semibold">${parseFloat(request.tradeValueUsd).toLocaleString()}</span>
                            <span className="text-muted-foreground">{parseFloat(request.settlementGoldGrams).toFixed(3)}g gold</span>
                          </div>
                          {request.tier1Notes && (
                            <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs">
                              <span className="font-semibold text-amber-800">Macy's Notes (Tier 1):</span>{' '}
                              <span className="text-amber-700">{request.tier1Notes}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          {request.aiFraudScore && (
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground">Fraud Score</p>
                              <p className={`text-xl font-bold ${getFraudScoreTextColor(request.aiFraudScore)}`}>
                                {parseFloat(request.aiFraudScore).toFixed(0)}/100
                              </p>
                            </div>
                          )}
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => setExpandedTierRequest(isExpanded ? null : request.id)}>
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              {isExpanded ? 'Less' : 'Full Report'}
                            </Button>
                            {request.supportingDocumentUrl && (
                              <Button size="sm" variant="outline" onClick={() => setDocViewRequest(request)}>
                                <FileText className="w-4 h-4 mr-1" /> View Doc
                              </Button>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" className="bg-green-600 hover:bg-green-700"
                              onClick={() => setTierActionDialog({ request, tier: 2, action: 'approve' })}>
                              <CheckCircle className="w-4 h-4 mr-1" /> Approve → Reda
                            </Button>
                            <Button size="sm" variant="destructive"
                              onClick={() => setTierActionDialog({ request, tier: 2, action: 'reject' })}>
                              <XCircle className="w-4 h-4 mr-1" /> Reject
                            </Button>
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t space-y-3">
                          <div className="grid grid-cols-3 gap-3">
                            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-center">
                              <p className="text-xs text-green-700 font-semibold">Tier 1 (Macy)</p>
                              <p className="text-sm font-bold text-green-800">✓ {request.tier1Status || 'Approved'}</p>
                            </div>
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
                              <p className="text-xs text-blue-700 font-semibold">AI Status</p>
                              <p className="text-sm font-bold text-blue-800">{request.aiVerificationStatus || '—'}</p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg text-center">
                              <p className="text-xs text-gray-600 font-semibold">Fraud Score</p>
                              <p className={`text-xl font-bold ${getFraudScoreTextColor(request.aiFraudScore)}`}>
                                {request.aiFraudScore ? `${parseFloat(request.aiFraudScore).toFixed(1)}/100` : '—'}
                              </p>
                            </div>
                          </div>
                          {aiData && (
                            <div className="p-3 bg-gray-50 rounded-lg">
                              <p className="text-xs font-semibold text-gray-600 mb-2">AI Extracted Data</p>
                              <pre className="text-xs text-gray-700 whitespace-pre-wrap overflow-auto max-h-40">{JSON.stringify(aiData, null, 2)}</pre>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* ——————————————————————————————————————————————
              OPTION D — TIER 3 / DIRECTOR FINAL APPROVAL (Reda)
          —————————————————————————————————————————————— */}
          <TabsContent value="tier3" className="mt-4">
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-300 rounded-lg">
                <Award className="w-5 h-5 text-yellow-700" />
                <div>
                  <p className="font-semibold text-yellow-900">Director Final Approval — Reda</p>
                  <p className="text-sm text-yellow-700">These applications cleared both Tier 1 and Tier 2 reviews. Your approval publishes the trade to the exporter marketplace and notifies the importer.</p>
                </div>
              </div>

              {tierReviewLoading ? (
                <Card><CardContent className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></CardContent></Card>
              ) : tierRequests.filter(r => r.status === 'Tier 3 Review').length === 0 ? (
                <Card><CardContent className="p-8 text-center text-muted-foreground">
                  <Award className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No applications awaiting Director approval.</p>
                </CardContent></Card>
              ) : tierRequests.filter(r => r.status === 'Tier 3 Review').map((request) => {
                const aiData = parseTierAiData(request.aiExtractedData);
                const isExpanded = expandedTierRequest === request.id;
                return (
                  <Card key={request.id} className="border-yellow-300">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge className="bg-yellow-100 text-yellow-900 font-mono">{request.tradeRefId}</Badge>
                            <Badge className={getStatusColor(request.status)}>{request.status}</Badge>
                            {request.paymentInstrumentType && <Badge variant="outline" className="text-xs">{request.paymentInstrumentType}</Badge>}
                          </div>
                          <h3 className="font-bold text-lg">{request.goodsName}</h3>
                          <p className="text-sm text-muted-foreground">{request.importer?.companyName || request.importer?.fullName}</p>
                          <div className="flex gap-6 mt-2 text-sm">
                            <span className="font-bold text-lg">${parseFloat(request.tradeValueUsd).toLocaleString()}</span>
                            <span className="text-muted-foreground">{parseFloat(request.settlementGoldGrams).toFixed(3)}g gold</span>
                          </div>

                          <div className="flex gap-2 mt-3">
                            <div className="px-2 py-1 bg-green-100 border border-green-200 rounded text-xs text-green-800">
                              ✓ Tier 1: {request.tier1ReviewedBy || 'Macy'}
                            </div>
                            <div className="px-2 py-1 bg-green-100 border border-green-200 rounded text-xs text-green-800">
                              ✓ Tier 2: {request.tier2ReviewedBy || 'Farah'}
                            </div>
                          </div>

                          {(request.tier1Notes || request.tier2Notes) && (
                            <div className="mt-2 space-y-1">
                              {request.tier1Notes && (
                                <div className="p-2 bg-amber-50 border border-amber-200 rounded text-xs">
                                  <span className="font-semibold text-amber-800">Tier 1 Notes:</span>{' '}
                                  <span className="text-amber-700">{request.tier1Notes}</span>
                                </div>
                              )}
                              {request.tier2Notes && (
                                <div className="p-2 bg-orange-50 border border-orange-200 rounded text-xs">
                                  <span className="font-semibold text-orange-800">Tier 2 Notes:</span>{' '}
                                  <span className="text-orange-700">{request.tier2Notes}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          {request.aiFraudScore && (
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground">Fraud Score</p>
                              <p className={`text-xl font-bold ${getFraudScoreTextColor(request.aiFraudScore)}`}>
                                {parseFloat(request.aiFraudScore).toFixed(0)}/100
                              </p>
                            </div>
                          )}
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => setExpandedTierRequest(isExpanded ? null : request.id)}>
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              Full Report
                            </Button>
                            {request.supportingDocumentUrl && (
                              <Button size="sm" variant="outline" onClick={() => setDocViewRequest(request)}>
                                <FileText className="w-4 h-4 mr-1" /> View Doc
                              </Button>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" className="bg-yellow-600 hover:bg-yellow-700 text-white"
                              onClick={() => setTierActionDialog({ request, tier: 3, action: 'approve' })}>
                              <Award className="w-4 h-4 mr-1" /> Approve & Publish
                            </Button>
                            <Button size="sm" variant="destructive"
                              onClick={() => setTierActionDialog({ request, tier: 3, action: 'reject' })}>
                              <XCircle className="w-4 h-4 mr-1" /> Reject
                            </Button>
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t space-y-3">
                          <div className="grid grid-cols-4 gap-3">
                            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-center">
                              <p className="text-xs text-green-700 font-semibold">Tier 1</p>
                              <p className="text-sm font-bold text-green-800">✓ Approved</p>
                            </div>
                            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-center">
                              <p className="text-xs text-green-700 font-semibold">Tier 2</p>
                              <p className="text-sm font-bold text-green-800">✓ Approved</p>
                            </div>
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
                              <p className="text-xs text-blue-700 font-semibold">AI Status</p>
                              <p className="text-sm font-bold text-blue-800">{request.aiVerificationStatus || '—'}</p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg text-center">
                              <p className="text-xs text-gray-600 font-semibold">Fraud Score</p>
                              <p className={`text-xl font-bold ${getFraudScoreTextColor(request.aiFraudScore)}`}>
                                {request.aiFraudScore ? `${parseFloat(request.aiFraudScore).toFixed(1)}/100` : '—'}
                              </p>
                            </div>
                          </div>
                          {aiData && (
                            <div className="p-3 bg-gray-50 rounded-lg">
                              <p className="text-xs font-semibold text-gray-600 mb-2">AI Extracted Data</p>
                              <pre className="text-xs text-gray-700 whitespace-pre-wrap overflow-auto max-h-40">{JSON.stringify(aiData, null, 2)}</pre>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Deal Manager Portal Tab */}
          <TabsContent value="dealmanager" className="mt-4" data-testid="tab-content-deal-manager">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-purple-500" />Deal Manager Portal
                </h2>
                <Button variant="outline" size="sm" onClick={fetchDealManagerRooms} disabled={dealManagerLoading} data-testid="btn-refresh-deal-manager">
                  {dealManagerLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                </Button>
              </div>
              {dealManagerLoading ? (
                <Card><CardContent className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" /></CardContent></Card>
              ) : dealManagerRooms.length === 0 ? (
                <Card><CardContent className="p-12 text-center text-muted-foreground"><MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-20" /><p>No deal rooms found.</p></CardContent></Card>
              ) : (
                <>
                  {/* SLA Table */}
                  <Card data-testid="deal-manager-sla-table">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">SLA Overview</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-muted/40">
                              <th className="text-left px-4 py-2 font-medium">Deal ID</th>
                              <th className="text-left px-4 py-2 font-medium">Importer</th>
                              <th className="text-left px-4 py-2 font-medium">Exporter</th>
                              <th className="text-left px-4 py-2 font-medium">LC Stage</th>
                              <th className="text-right px-4 py-2 font-medium">Days Open</th>
                              <th className="text-left px-4 py-2 font-medium">Last Activity</th>
                              <th className="text-center px-4 py-2 font-medium">Docs Status</th>
                              <th className="text-center px-4 py-2 font-medium">SLA</th>
                              <th className="text-center px-4 py-2 font-medium">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dealManagerRooms.map(room => {
                              const daysOpen = Math.floor((Date.now() - new Date(room.createdAt).getTime()) / (1000 * 60 * 60 * 24));
                              const docsApproved = room.docsApproved ?? 0;
                              const docsTotal = room.docsTotal ?? 0;
                              const lastActivity = room.updatedAt ? new Date(room.updatedAt) : new Date(room.createdAt);
                              const daysSinceActivity = Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
                              const slaBadge = daysOpen <= 7 ? { label: 'On Track', cls: 'bg-emerald-100 text-emerald-700' }
                                : daysOpen <= 14 ? { label: 'At Risk', cls: 'bg-amber-100 text-amber-700' }
                                : { label: 'Overdue', cls: 'bg-red-100 text-red-700' };
                              const lcStage = room.lcLifecycleStatus || 'Draft';
                              const lcStageCls = lcStage === 'Active' ? 'bg-emerald-100 text-emerald-700'
                                : lcStage === 'Expired' ? 'bg-red-100 text-red-700'
                                : 'bg-slate-100 text-slate-600';
                              return (
                                <tr key={room.id} className="border-b hover:bg-muted/20 transition-colors" data-testid={`sla-row-${room.id}`}>
                                  <td className="px-4 py-2 font-mono text-xs">{room.tradeRequest?.tradeRefId || room.id.slice(0, 8)}</td>
                                  <td className="px-4 py-2 text-xs max-w-[120px] truncate" data-testid={`sla-importer-${room.id}`}>{room.importer?.email || '—'}</td>
                                  <td className="px-4 py-2 text-xs max-w-[120px] truncate" data-testid={`sla-exporter-${room.id}`}>{room.exporter?.email || '—'}</td>
                                  <td className="px-4 py-2">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${lcStageCls}`} data-testid={`sla-lc-stage-${room.id}`}>{lcStage}</span>
                                  </td>
                                  <td className="px-4 py-2 text-right font-medium" data-testid={`sla-days-${room.id}`}>{daysOpen}d</td>
                                  <td className="px-4 py-2 text-xs text-muted-foreground">{daysSinceActivity === 0 ? 'Today' : `${daysSinceActivity}d ago`}</td>
                                  <td className="px-4 py-2 text-center text-xs" data-testid={`sla-docs-${room.id}`}>{docsApproved}/{docsTotal} approved</td>
                                  <td className="px-4 py-2 text-center">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${slaBadge.cls}`} data-testid={`sla-badge-${room.id}`}>
                                      {slaBadge.label}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedDealRoom(room.id)} data-testid={`btn-open-sla-${room.id}`}>
                                        <Eye className="w-3 h-3" />
                                      </Button>
                                      <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500" onClick={() => escalateDealRoom(room.id)} data-testid={`btn-escalate-sla-${room.id}`}>
                                        <Flag className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Expanded deal cards for notes/assignment */}
                  {dealManagerRooms.map(room => (
                    <Card key={room.id} className="overflow-hidden" data-testid={`deal-manager-room-${room.id}`}>
                      <CardHeader className="pb-3 bg-muted/30">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-base flex items-center gap-2">
                              <MessageCircle className="w-4 h-4 text-purple-500" />
                              {room.tradeRequest?.tradeRefId || room.id.slice(0, 8)} — {room.tradeRequest?.goodsName || 'Unknown Goods'}
                            </CardTitle>
                            <p className="text-xs text-muted-foreground mt-1">
                              Importer: {room.importer?.email || 'N/A'} · Exporter: {room.exporter?.email || 'N/A'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={room.status === 'open' ? 'default' : 'secondary'} className="capitalize">{room.status}</Badge>
                            {room.tradeRequest?.tradeValueUsd && (
                              <Badge variant="outline">${parseFloat(room.tradeRequest.tradeValueUsd).toLocaleString()}</Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 space-y-4">
                        {/* Assign Deal Manager */}
                        <div className="space-y-2">
                          <p className="text-sm font-medium flex items-center gap-1.5"><UserCheck className="w-4 h-4 text-purple-500" />Assign Deal Manager</p>
                          <div className="flex gap-2">
                            <Input placeholder="Admin email (e.g. demo1@finatrades.com)"
                              value={assignManagerEmail[room.id] || ''}
                              onChange={e => setAssignManagerEmail(prev => ({ ...prev, [room.id]: e.target.value }))}
                              className="text-sm" data-testid={`input-assign-manager-${room.id}`} />
                            <Button size="sm" onClick={() => assignDealManager(room.id)} disabled={assigningManager === room.id || !assignManagerEmail[room.id]?.trim()}
                              data-testid={`btn-assign-manager-${room.id}`}>
                              {assigningManager === room.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4 mr-1" />}Assign
                            </Button>
                          </div>
                          {room.assignedAdminId && (
                            <p className="text-xs text-emerald-600 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />Deal Manager assigned
                            </p>
                          )}
                        </div>

                        {/* Internal Notes */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium flex items-center gap-1.5"><StickyNote className="w-4 h-4 text-amber-500" />Internal Notes (Admin-only)</p>
                            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => fetchInternalNotes(room.id)} disabled={loadingNotes[room.id]}
                              data-testid={`btn-load-notes-${room.id}`}>
                              {loadingNotes[room.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Load Notes'}
                            </Button>
                          </div>
                          {internalNotes[room.id] && (
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                              {internalNotes[room.id].length === 0 ? (
                                <p className="text-xs text-muted-foreground italic">No notes yet.</p>
                              ) : internalNotes[room.id].map(note => (
                                <div key={note.id} className={`p-2 border rounded text-xs ${note.isEscalated ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`} data-testid={`note-item-${note.id}`}>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium text-amber-700">{note.authorName}</span>
                                    {note.isEscalated && <span className="text-red-600 text-[10px] font-bold">ESCALATED</span>}
                                    <span className="text-muted-foreground">{new Date(note.createdAt).toLocaleDateString()}</span>
                                  </div>
                                  <p>{note.note}</p>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="flex gap-2">
                            <Textarea placeholder="Add internal note..." value={newNote[room.id] || ''} rows={2}
                              onChange={e => setNewNote(prev => ({ ...prev, [room.id]: e.target.value }))}
                              className="text-sm" data-testid={`input-note-${room.id}`} />
                            <Button size="sm" className="self-end" onClick={() => saveInternalNote(room.id)}
                              disabled={savingNote === room.id || !newNote[room.id]?.trim()}
                              data-testid={`btn-save-note-${room.id}`}>
                              {savingNote === room.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            </Button>
                          </div>
                        </div>

                        {/* Escalate button */}
                        <div className="flex items-center gap-2 pt-1 border-t">
                          <Button variant="outline" size="sm" className="text-xs text-red-600 border-red-300 hover:bg-red-50"
                            onClick={() => { setSelectedDealRoom(room.id); }}
                            data-testid={`btn-open-dealroom-${room.id}`}>
                            <Eye className="w-3 h-3 mr-1" />Open Deal Room
                          </Button>
                          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground ml-auto"
                            data-testid={`btn-escalate-${room.id}`}
                            onClick={() => escalateDealRoom(room.id)}>
                            <Flag className="w-3 h-3 mr-1" />Escalate
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </>
              )}
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="mt-4" data-testid="tab-content-analytics">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-500" />Deal Room Analytics
                </h2>
                <Button variant="outline" size="sm" onClick={fetchAnalytics} disabled={analyticsLoading} data-testid="btn-refresh-analytics">
                  {analyticsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                </Button>
              </div>

              {analyticsLoading ? (
                <Card><CardContent className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" /></CardContent></Card>
              ) : !analyticsData ? (
                <Card><CardContent className="p-12 text-center text-muted-foreground">
                  <Activity className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>Click the refresh button to load analytics.</p>
                </CardContent></Card>
              ) : (
                <>
                  {/* Summary KPIs */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {[
                      { label: 'Total Deal Rooms', value: analyticsData.summary.totalRooms, color: 'text-foreground' },
                      { label: 'Active', value: analyticsData.summary.activeRooms, color: 'text-purple-600' },
                      { label: 'Closed', value: analyticsData.summary.closedRooms, color: 'text-emerald-600' },
                      { label: 'Total Documents', value: analyticsData.summary.totalDocuments, color: 'text-amber-600' },
                      { label: 'Discrepancies', value: analyticsData.summary.totalDiscrepancies, color: 'text-red-600' },
                    ].map(kpi => (
                      <Card key={kpi.label} data-testid={`kpi-${kpi.label.toLowerCase().replace(/\s+/g, '-')}`}>
                        <CardContent className="p-4 text-center">
                          <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
                          <p className="text-xs text-muted-foreground">{kpi.label}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Charts grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Active vs Closed — Line chart */}
                    <Card data-testid="chart-active-vs-closed">
                      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Activity className="w-4 h-4 text-purple-500" />Active vs Closed by Month</CardTitle></CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={200}>
                          <LineChart data={analyticsData.activeVsClosed} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="active" stroke="#7c3aed" strokeWidth={2} dot={{ r: 3 }} name="Active" />
                            <Line type="monotone" dataKey="closed" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="Closed" />
                          </LineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    {/* Document Rejection Rate — Pie chart */}
                    <Card data-testid="chart-doc-rejection">
                      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><XCircle className="w-4 h-4 text-red-500" />Document Rejection Rate (%)</CardTitle></CardHeader>
                      <CardContent>
                        {analyticsData.docRejectionRates.length === 0 ? (
                          <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">No documents found</div>
                        ) : (
                          <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                              <Pie
                                data={analyticsData.docRejectionRates}
                                dataKey="rejectionRate"
                                nameKey="type"
                                cx="50%"
                                cy="50%"
                                outerRadius={70}
                                label={({ type, rejectionRate }: { type: string; rejectionRate: number; total: number; rejected: number }) => `${type.split('_')[0]}: ${rejectionRate}%`}
                                labelLine={false}
                              >
                                {analyticsData.docRejectionRates.map((_entry, idx: number) => (
                                  <Cell key={idx} fill={['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#7c3aed', '#ec4899', '#14b8a6'][idx % 7]} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(v: number) => `${v}%`} />
                            </PieChart>
                          </ResponsiveContainer>
                        )}
                      </CardContent>
                    </Card>

                    {/* Discrepancy Reasons — Bar chart */}
                    <Card data-testid="chart-discrepancy-reasons">
                      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Flag className="w-4 h-4 text-amber-500" />Discrepancy Reasons</CardTitle></CardHeader>
                      <CardContent>
                        {analyticsData.discrepancyReasons.length === 0 ? (
                          <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">No discrepancies recorded</div>
                        ) : (
                          <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={analyticsData.discrepancyReasons} layout="vertical" margin={{ top: 5, right: 5, left: 40, bottom: 5 }}>
                              <XAxis type="number" tick={{ fontSize: 10 }} />
                              <YAxis type="category" dataKey="reason" tick={{ fontSize: 9 }} width={80} />
                              <Tooltip />
                              <Bar dataKey="count" fill="#f59e0b" radius={[0, 3, 3, 0]} name="Count" />
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </CardContent>
                    </Card>

                    {/* Avg Completion Time — Bar chart */}
                    <Card data-testid="chart-completion-time">
                      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Clock className="w-4 h-4 text-blue-500" />Avg Deal Completion Time (days)</CardTitle></CardHeader>
                      <CardContent>
                        {analyticsData.avgCompletionTime.every(m => m.avgDays === 0) ? (
                          <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">No completed deals yet</div>
                        ) : (
                          <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={analyticsData.avgCompletionTime} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                              <YAxis tick={{ fontSize: 10 }} />
                              <Tooltip formatter={(v: number) => `${v} days`} />
                              <Bar dataKey="avgDays" fill="#3b82f6" radius={[3, 3, 0, 0]} name="Avg Days" />
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}
            </div>
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
                    <p className="font-medium text-fuchsia-600">{parseFloat(selectedRequest.settlementGoldGrams).toFixed(3)}g</p>
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
                                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                                    <p className="text-xs font-medium text-fuchsia-800 mb-1">Modification Requested:</p>
                                    <p className="text-sm text-fuchsia-700">{proposal.modificationRequest}</p>
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
                                    <Badge className="bg-purple-100 text-fuchsia-700">Awaiting Exporter Response</Badge>
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

        <Dialog open={!!modificationDialog} onOpenChange={(open) => { if (!open) { setModificationDialog(null); setModificationText(''); setRequestedDocuments([]); setCustomDocumentNotes(''); setCustomDocumentInput(''); } }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit3 className="w-5 h-5" />
                Request Modification & Documents
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Select the documents you need from the exporter and provide any additional instructions.
              </p>

              <div className="space-y-2">
                <label className="text-sm font-medium">Required Documents</label>
                <div className="grid grid-cols-2 gap-2 p-3 bg-muted/30 rounded-lg max-h-[200px] overflow-y-auto">
                  {STANDARD_DOCUMENTS.map((doc) => (
                    <label key={doc.key} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-muted rounded">
                      <input
                        type="checkbox"
                        checked={requestedDocuments.includes(doc.key)}
                        onChange={() => toggleDocumentSelection(doc.key)}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-sm">{doc.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Custom Document Request</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customDocumentInput}
                    onChange={(e) => setCustomDocumentInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomDocument(); } }}
                    className="flex-1 p-2 border rounded-lg text-sm"
                    placeholder="Enter document name and press Enter"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={addCustomDocument}>
                    Add
                  </Button>
                </div>
                {requestedDocuments.filter(d => d.startsWith('custom:')).length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {requestedDocuments.filter(d => d.startsWith('custom:')).map((doc) => (
                      <span key={doc} className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                        {doc.replace('custom:', '')}
                        <button
                          type="button"
                          onClick={() => setRequestedDocuments(requestedDocuments.filter(d => d !== doc))}
                          className="hover:text-red-600"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Additional Notes for Exporter</label>
                <textarea
                  value={customDocumentNotes}
                  onChange={(e) => setCustomDocumentNotes(e.target.value)}
                  className="w-full p-3 border rounded-lg text-sm"
                  rows={2}
                  placeholder="Specific requirements for documents (e.g., 'Certificates must be less than 6 months old')"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">General Instructions</label>
                <textarea
                  value={modificationText}
                  onChange={(e) => setModificationText(e.target.value)}
                  className="w-full p-3 border rounded-lg text-sm"
                  rows={2}
                  placeholder="Other changes needed (pricing, timeline, shipping details, etc.)"
                  data-testid="input-modification-text"
                />
              </div>

              {requestedDocuments.length > 0 && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <p className="text-xs font-medium text-fuchsia-800 mb-1">Documents to be requested ({requestedDocuments.length}):</p>
                  <p className="text-xs text-fuchsia-700">
                    {requestedDocuments.map(d => d.startsWith('custom:') ? d.replace('custom:', '') : STANDARD_DOCUMENTS.find(sd => sd.key === d)?.label || d).join(', ')}
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setModificationDialog(null); setModificationText(''); setRequestedDocuments([]); setCustomDocumentNotes(''); setCustomDocumentInput(''); }}>
                Cancel
              </Button>
              <Button 
                onClick={handleRequestModification} 
                disabled={updating || (requestedDocuments.length === 0 && !modificationText.trim() && !customDocumentNotes.trim())}
                data-testid="button-send-modification"
              >
                {updating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Send className="w-4 h-4 mr-2" />
                Send Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Settlement Release Confirmation Dialog */}
        <Dialog open={!!releaseConfirmDialog} onOpenChange={(open) => !open && setReleaseConfirmDialog(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-fuchsia-600">
                <AlertCircle className="w-5 h-5" />
                Release Settlement Gold
              </DialogTitle>
            </DialogHeader>
            
            {releaseConfirmDialog && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  You are about to complete this trade and release the settlement gold to the exporter. 
                  Please review the details below:
                </p>
                
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-fuchsia-800 font-medium">Trade Reference:</span>
                    <span className="text-fuchsia-900 font-bold">{releaseConfirmDialog.request.tradeRefId}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-fuchsia-800 font-medium">Goods:</span>
                    <span className="text-fuchsia-900">{releaseConfirmDialog.request.goodsName}</span>
                  </div>
                  
                  <div className="border-t border-purple-200 pt-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-fuchsia-800 font-medium">Settlement Gold:</span>
                      <span className="text-fuchsia-900 font-bold text-lg">
                        {parseFloat(releaseConfirmDialog.hold.lockedGoldGrams).toFixed(3)}g
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-fuchsia-700">Trade Value:</span>
                      <span className="text-fuchsia-700">${parseFloat(releaseConfirmDialog.request.tradeValueUsd).toLocaleString()} USD</span>
                    </div>
                  </div>
                  
                  <div className="border-t border-purple-200 pt-3 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-fuchsia-700">From:</span>
                      <span className="text-fuchsia-800">Importer's Escrow</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-fuchsia-700">To:</span>
                      <span className="text-fuchsia-800">Exporter's Wallet</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800 font-medium">
                    This action cannot be undone.
                  </p>
                  <p className="text-xs text-red-700 mt-1">
                    The locked gold will be immediately credited to the exporter's FinaBridge wallet 
                    and the trade will be marked as completed.
                  </p>
                </div>
              </div>
            )}
            
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setReleaseConfirmDialog(null)}>
                Cancel
              </Button>
              <Button 
                className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white" 
                onClick={handleConfirmRelease}
              >
                Confirm Release
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Document + AI Side-by-Side Panel */}
        <Dialog open={!!docViewRequest} onOpenChange={(open) => { if (!open) setDocViewRequest(null); }}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0">
            <DialogHeader className="px-6 pt-5 pb-3 border-b">
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Document Review — {docViewRequest?.tradeRefId}
                {docViewRequest?.paymentInstrumentType && (
                  <Badge variant="outline" className="ml-2 text-xs">{docViewRequest.paymentInstrumentType}</Badge>
                )}
              </DialogTitle>
            </DialogHeader>
            {docViewRequest && (
              <div className="flex h-[75vh] overflow-hidden">
                {/* Left: Document Viewer */}
                <div className="w-1/2 border-r flex flex-col">
                  <div className="px-4 py-2 bg-gray-50 border-b">
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Supporting Document</p>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    {docViewRequest.supportingDocumentUrl ? (
                      (() => {
                        const url = docViewRequest.supportingDocumentUrl;
                        const isPdf = url.toLowerCase().includes('.pdf') || url.toLowerCase().includes('pdf');
                        const isImage = /\.(jpg|jpeg|png|gif|webp)/i.test(url);
                        if (isPdf) {
                          return (
                            <iframe
                              src={url}
                              className="w-full h-full border-none"
                              title="Supporting Document"
                              data-testid="iframe-supporting-document"
                            />
                          );
                        } else if (isImage) {
                          return (
                            <div className="w-full h-full overflow-auto p-4">
                              <img
                                src={url}
                                alt="Supporting Document"
                                className="max-w-full h-auto"
                                data-testid="img-supporting-document"
                              />
                            </div>
                          );
                        } else {
                          return (
                            <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
                              <FileText className="w-16 h-16 text-muted-foreground opacity-30" />
                              <p className="text-muted-foreground text-center text-sm">Preview not available for this file type.</p>
                              <Button asChild size="sm" variant="outline">
                                <a href={url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="w-4 h-4 mr-2" /> Open Document
                                </a>
                              </Button>
                            </div>
                          );
                        }
                      })()
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full gap-3 p-6">
                        <FileText className="w-16 h-16 text-muted-foreground opacity-20" />
                        <p className="text-muted-foreground">No document uploaded</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: AI Report + Reviewer History */}
                <div className="w-1/2 flex flex-col overflow-hidden">
                  <div className="px-4 py-2 bg-gray-50 border-b">
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">AI Report & Review History</p>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Trade Summary */}
                    <div className="p-3 bg-gray-50 rounded-lg border text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Goods</span>
                        <span className="font-medium">{docViewRequest.goodsName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Value</span>
                        <span className="font-bold">${parseFloat(docViewRequest.tradeValueUsd).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Importer</span>
                        <span>{docViewRequest.importer?.companyName || docViewRequest.importer?.fullName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status</span>
                        <Badge className={getStatusColor(docViewRequest.status)} data-testid={`status-trade-${docViewRequest.id}`}>{docViewRequest.status}</Badge>
                      </div>
                    </div>

                    {/* AI Verification */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                        <Bot className="w-3 h-3" /> AI Verification
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
                          <p className="text-xs text-blue-600 font-medium mb-1">Status</p>
                          <p className="text-sm font-bold text-blue-900">{docViewRequest.aiVerificationStatus || 'Pending'}</p>
                        </div>
                        <div className="p-3 rounded-lg border text-center" style={{ background: parseFloat(docViewRequest.aiFraudScore || '0') <= 20 ? '#f0fdf4' : parseFloat(docViewRequest.aiFraudScore || '0') <= 50 ? '#fffbeb' : '#fef2f2' }}>
                          <p className="text-xs font-medium mb-1" style={{ color: parseFloat(docViewRequest.aiFraudScore || '0') <= 20 ? '#166534' : parseFloat(docViewRequest.aiFraudScore || '0') <= 50 ? '#92400e' : '#991b1b' }}>Fraud Score</p>
                          <p className={`text-xl font-bold ${getFraudScoreColor(docViewRequest.aiFraudScore)}`} data-testid={`text-fraud-score-${docViewRequest.id}`}>
                            {docViewRequest.aiFraudScore ? `${parseFloat(docViewRequest.aiFraudScore).toFixed(1)}/100` : 'N/A'}
                          </p>
                          <p className="text-xs mt-1" style={{ color: parseFloat(docViewRequest.aiFraudScore || '0') <= 20 ? '#166534' : parseFloat(docViewRequest.aiFraudScore || '0') <= 50 ? '#92400e' : '#991b1b' }}>
                            {!docViewRequest.aiFraudScore ? '' : parseFloat(docViewRequest.aiFraudScore) <= 20 ? 'Low Risk' : parseFloat(docViewRequest.aiFraudScore) <= 50 ? 'Medium Risk' : 'High Risk'}
                          </p>
                        </div>
                      </div>
                      {docViewRequest.aiRejectionReason && (
                        <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                          <span className="font-semibold">AI Flag:</span> {docViewRequest.aiRejectionReason}
                        </div>
                      )}
                    </div>

                    {/* AI Extracted Fields */}
                    {docViewRequest.aiExtractedData && (() => {
                      const aiData = parseTierAiData(docViewRequest.aiExtractedData);
                      if (!aiData) return null;
                      const fields = typeof aiData === 'object' && !Array.isArray(aiData) ? aiData : null;
                      return (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">AI Extracted Fields</p>
                          {fields ? (
                            <div className="space-y-1">
                              {Object.entries(fields).map(([key, val]) => (
                                <div key={key} className="flex justify-between text-xs p-2 bg-gray-50 rounded border">
                                  <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
                                  <span className="font-medium text-right max-w-[60%] break-words">{String(val)}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <pre className="text-xs text-gray-700 whitespace-pre-wrap overflow-auto max-h-32 p-2 bg-gray-50 rounded">{JSON.stringify(aiData, null, 2)}</pre>
                          )}
                        </div>
                      );
                    })()}

                    {/* Reviewer History — all previous tier notes stacked in order */}
                    {(docViewRequest.tier1Notes || docViewRequest.tier2Notes || docViewRequest.tier3Notes) && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                          <User className="w-3 h-3" /> Reviewer History
                        </p>
                        {docViewRequest.tier1Notes && (
                          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm" data-testid={`text-tier1-notes-${docViewRequest.id}`}>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className="bg-amber-200 text-amber-900 text-xs">Tier 1 — Macy</Badge>
                              <span className="text-xs text-muted-foreground">{docViewRequest.tier1ReviewedBy}</span>
                              <Badge className={`text-xs ${docViewRequest.tier1Status === 'Approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{docViewRequest.tier1Status}</Badge>
                            </div>
                            <p className="text-amber-800">{docViewRequest.tier1Notes}</p>
                          </div>
                        )}
                        {docViewRequest.tier2Notes && (
                          <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm" data-testid={`text-tier2-notes-${docViewRequest.id}`}>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className="bg-orange-200 text-orange-900 text-xs">Tier 2 — Farah</Badge>
                              <span className="text-xs text-muted-foreground">{docViewRequest.tier2ReviewedBy}</span>
                              <Badge className={`text-xs ${docViewRequest.tier2Status === 'Approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{docViewRequest.tier2Status}</Badge>
                            </div>
                            <p className="text-orange-800">{docViewRequest.tier2Notes}</p>
                          </div>
                        )}
                        {docViewRequest.tier3Notes && (
                          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm" data-testid={`text-tier3-notes-${docViewRequest.id}`}>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className="bg-yellow-200 text-yellow-900 text-xs">Tier 3 — Reda</Badge>
                              <span className="text-xs text-muted-foreground">{docViewRequest.tier3ReviewedBy}</span>
                              <Badge className={`text-xs ${docViewRequest.tier3Status === 'Approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{docViewRequest.tier3Status}</Badge>
                            </div>
                            <p className="text-yellow-900">{docViewRequest.tier3Notes}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Tier Action Dialog — Approve or Reject */}
        <Dialog open={!!tierActionDialog} onOpenChange={(open) => { if (!open) { setTierActionDialog(null); setTierNotes(''); } }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className={`flex items-center gap-2 ${tierActionDialog?.action === 'approve' ? 'text-green-700' : 'text-red-700'}`}>
                {tierActionDialog?.action === 'approve'
                  ? <><ShieldCheck className="w-5 h-5" /> Tier {tierActionDialog?.tier} Approval</>
                  : <><ShieldAlert className="w-5 h-5" /> Reject Application</>
                }
              </DialogTitle>
            </DialogHeader>

            {tierActionDialog && (
              <div className="space-y-4">
                <div className="p-3 bg-gray-50 rounded-lg border text-sm space-y-1">
                  <div className="flex justify-between"><span className="text-muted-foreground">Trade Ref:</span><span className="font-mono font-bold">{tierActionDialog.request.tradeRefId}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Importer:</span><span>{tierActionDialog.request.importer?.companyName || tierActionDialog.request.importer?.fullName}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Value:</span><span className="font-bold">${parseFloat(tierActionDialog.request.tradeValueUsd).toLocaleString()}</span></div>
                </div>

                {tierActionDialog.action === 'approve' && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                    {tierActionDialog.tier === 3
                      ? 'This will publish the trade to the exporter marketplace and notify the importer that their trade is live.'
                      : `This will escalate the application to Tier ${tierActionDialog.tier + 1} for review. The next reviewer will be notified by email.`
                    }
                  </div>
                )}

                {tierActionDialog.action === 'reject' && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                    The importer will be notified by email with the reason provided below.
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {tierActionDialog.action === 'approve' ? 'Approval Notes (Required)' : 'Rejection Reason (Required)'}
                  </label>
                  <Textarea
                    value={tierNotes}
                    onChange={(e) => setTierNotes(e.target.value)}
                    placeholder={tierActionDialog.action === 'approve'
                      ? 'Provide notes for the next reviewer before approving...'
                      : 'Explain why this application is being rejected...'}
                    rows={3}
                    data-testid="input-tier-notes"
                  />
                  {!tierNotes.trim() && (
                    <p className="text-xs text-muted-foreground">Notes are required before submitting this action.</p>
                  )}
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => { setTierActionDialog(null); setTierNotes(''); }}>
                Cancel
              </Button>
              <Button
                className={tierActionDialog?.action === 'approve' ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}
                onClick={handleTierAction}
                disabled={tierActioning || !tierNotes.trim()}
                data-testid="button-tier-action-confirm"
              >
                {tierActioning && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {tierActionDialog?.action === 'approve'
                  ? tierActionDialog?.tier === 3 ? 'Approve & Publish Trade' : `Approve → Tier ${(tierActionDialog?.tier || 0) + 1}`
                  : 'Reject & Notify Importer'
                }
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
