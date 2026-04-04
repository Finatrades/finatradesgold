import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/queryClient';
import { io, Socket } from 'socket.io-client';
import {
  Send, Paperclip, ArrowLeft, MessageCircle, Users,
  FileText, Image, Download, Loader2, Check, CheckCheck,
  Shield, Lock, AlertTriangle, XCircle, Video,
  CheckCircle, Clock, AlertCircle, ChevronDown, ChevronUp,
  Upload, Eye, ClipboardList, Flag, Plus, RotateCcw, ArrowRight,
  ShieldAlert, ShieldCheck, Info, Layers, Warehouse, Ship,
  ChevronRight, Star,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';

// --- Types ---

interface DealRoomMessage {
  id: string;
  dealRoomId: string;
  senderUserId: string;
  senderRole: 'importer' | 'exporter' | 'admin';
  content: string | null;
  attachmentUrl: string | null;
  attachmentName: string | null;
  attachmentType: string | null;
  isRead: boolean;
  createdAt: string;
  sender?: { id: string; finatradesId: string | null; email: string } | null;
}

interface DealRoomData {
  id: string;
  tradeRequestId: string;
  acceptedProposalId: string;
  importerUserId: string;
  exporterUserId: string;
  assignedAdminId: string | null;
  status: string;
  isClosed: boolean;
  closedAt: string | null;
  closedBy: string | null;
  closureNotes: string | null;
  adminDisclaimer: string | null;
  adminDisclaimerUpdatedAt: string | null;
  adminDisclaimerUpdatedBy: string | null;
  lcLifecycleStatus: string | null;
  createdAt: string;
  updatedAt: string;
  tradeRequest?: { tradeRefId: string; goodsName: string; tradeValueUsd: string; status: string };
  importer?: { id: string; finatradesId: string | null; email: string; profilePhoto?: string | null; firstName?: string | null; lastName?: string | null; accountType?: string | null } | null;
  exporter?: { id: string; finatradesId: string | null; email: string; profilePhoto?: string | null; firstName?: string | null; lastName?: string | null; accountType?: string | null } | null;
  assignedAdmin?: { id: string; finatradesId: string | null; email: string; profilePhoto?: string | null; firstName?: string | null; lastName?: string | null; accountType?: string | null } | null;
}

interface AgreementAcceptance {
  id: string;
  dealRoomId: string;
  userId: string;
  role: 'importer' | 'exporter' | 'admin';
  agreementVersion: string;
  acceptedAt: string;
  ipAddress?: string | null;
}

interface DealRoomDocument {
  id: string;
  dealRoomId: string;
  uploadedByUserId: string;
  uploaderRole: string;
  documentType: string;
  fileName: string;
  fileUrl: string;
  fileSize: number | null;
  description: string | null;
  status: string;
  verifiedBy: string | null;
  verifiedAt: string | null;
  verificationNotes: string | null;
  versionNumber: number | null;
  parentDocumentId: string | null;
  createdAt: string;
}

interface DealMilestone {
  id: string;
  dealRoomId: string;
  milestoneName: string;
  completedByUserId: string | null;
  completedByRole: string | null;
  notes: string | null;
  completedAt: string;
  completedByUser?: {
    finatradesId: string | null;
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
}

interface DealDiscrepancy {
  id: string;
  dealRoomId: string;
  documentId: string | null;
  raisedByUserId: string;
  reasonType: string;
  description: string | null;
  status: string;
  resolvedAt: string | null;
  resolvedByUserId: string | null;
  resolutionNotes: string | null;
  createdAt: string;
}

interface LcTermsData {
  id: string;
  dealRoomId: string;
  lcType: string;
  expiryDate: string | null;
  expiryPlace: string | null;
  amount: string | null;
  currency: string | null;
  partialShipment: boolean | null;
  transshipment: boolean | null;
  requiredDocuments: string[] | null;
}

interface PartyRisk {
  userId: string;
  email: string;
  name: string;
  kycStatus: string;
  country: string;
  amlRiskLevel: string;
  riskScore?: number;
  isSanctioned: boolean;
  isPep: boolean;
  sanctionsStatus: string;
  jurisdictionRisk: string;
  kycCompletion: number;
}

interface DealRoomProps {
  dealRoomId: string;
  userRole: 'importer' | 'exporter' | 'admin';
  onClose?: () => void;
}

// --- Constants ---

const LC_STAGES = [
  'Draft',
  'LC Issued',
  'Docs Submitted',
  'Docs Under Review',
  'Discrepancy Raised',
  'Discrepancy Resolved',
  'Approved',
  'Payment Triggered',
  'Closed',
] as const;

type LcStage = typeof LC_STAGES[number];

// Stage actor labels
const STAGE_ACTOR: Record<LcStage, { actor: string; color: string; description: string }> = {
  'Draft':                { actor: 'Admin',    color: 'blue',   description: 'Admin will issue the Letter of Credit' },
  'LC Issued':            { actor: 'Exporter', color: 'green',  description: 'Exporter must submit trade documents' },
  'Docs Submitted':       { actor: 'Admin',    color: 'blue',   description: 'Admin will begin document review' },
  'Docs Under Review':    { actor: 'Admin',    color: 'amber',  description: 'Admin is reviewing all documents' },
  'Discrepancy Raised':   { actor: 'Exporter', color: 'red',    description: 'Exporter must resolve flagged discrepancies' },
  'Discrepancy Resolved': { actor: 'Admin',    color: 'purple', description: 'Admin will re-review resolved documents' },
  'Approved':             { actor: 'Importer', color: 'teal',   description: 'Importer must trigger payment release' },
  'Payment Triggered':    { actor: 'Admin',    color: 'blue',   description: 'Admin will confirm payment and close deal' },
  'Closed':               { actor: 'Done',     color: 'gray',   description: 'Trade completed and deal room closed' },
};

// Role-based allowed transitions
const STAGE_TRANSITIONS: Record<string, { role: 'admin' | 'exporter' | 'importer' | 'admin_exporter' | 'admin_importer'; toStage: LcStage; label: string; variant?: string }[]> = {
  'Draft':                [{ role: 'admin', toStage: 'LC Issued', label: 'Issue LC' }],
  'LC Issued':            [{ role: 'exporter', toStage: 'Docs Submitted', label: 'Submit Documents' }],
  'Docs Submitted':       [{ role: 'admin', toStage: 'Docs Under Review', label: 'Begin Review' }],
  'Docs Under Review':    [
    { role: 'admin', toStage: 'Approved', label: 'Approve All Docs', variant: 'success' },
    { role: 'admin', toStage: 'Discrepancy Raised', label: 'Raise Discrepancy', variant: 'destructive' },
  ],
  'Discrepancy Raised':   [{ role: 'admin_exporter', toStage: 'Discrepancy Resolved', label: 'Mark Resolved' }],
  'Discrepancy Resolved': [
    { role: 'admin', toStage: 'Approved', label: 'Approve', variant: 'success' },
    { role: 'admin', toStage: 'Docs Under Review', label: 'Re-review Docs' },
  ],
  'Approved':             [{ role: 'admin_importer', toStage: 'Payment Triggered', label: 'Trigger Payment' }],
  'Payment Triggered':    [{ role: 'admin', toStage: 'Closed', label: 'Confirm & Close' }],
};

interface RequiredDocument {
  type: string;
  label: string;
  responsible: 'exporter' | 'importer' | 'third_party';
  responsibleLabel: string;
}

const REQUIRED_DOCUMENTS: RequiredDocument[] = [
  { type: 'Invoice', label: 'Commercial Invoice', responsible: 'exporter', responsibleLabel: 'Exporter' },
  { type: 'Bill of Lading', label: 'Bill of Lading (BL/AWB/CMR)', responsible: 'exporter', responsibleLabel: 'Exporter' },
  { type: 'Packing List', label: 'Packing List', responsible: 'exporter', responsibleLabel: 'Exporter' },
  { type: 'Certificate of Origin', label: 'Certificate of Origin', responsible: 'exporter', responsibleLabel: 'Exporter' },
  { type: 'Insurance Certificate', label: 'Insurance Certificate', responsible: 'exporter', responsibleLabel: 'Exporter' },
  { type: 'Inspection Report', label: 'Inspection Report', responsible: 'third_party', responsibleLabel: 'Third Party (SGS/BV)' },
  { type: 'LC Draft', label: 'LC Draft (MT700)', responsible: 'importer', responsibleLabel: 'Importer' },
  { type: 'Proof of Lading', label: 'Proof of Lading (POL)', responsible: 'exporter', responsibleLabel: 'Exporter' },
  { type: 'Warehouse Receipt', label: 'Warehouse Receipt (WR)', responsible: 'exporter', responsibleLabel: 'Exporter' },
];

const DISCREPANCY_REASONS = [
  'Amount Mismatch', 'Date Discrepancy', 'Port of Loading Wrong',
  'Missing Signature', 'Description Mismatch', 'Document Expired',
  'Incorrect Document Type', 'Other',
] as const;

// --- Helpers ---

function userDisplayName(u: { finatradesId: string | null; email: string; firstName: string | null; lastName: string | null } | null | undefined): string {
  if (!u) return 'Unknown';
  if (u.firstName && u.lastName) return `${u.firstName} ${u.lastName}`;
  return u.finatradesId || u.email;
}

function getRoleColor(role: string) {
  if (role === 'importer') return 'bg-blue-500';
  if (role === 'exporter') return 'bg-green-500';
  if (role === 'admin') return 'bg-purple-500';
  return 'bg-gray-500';
}

// --- LC Milestone Strip ---
function LcMilestoneStrip({ currentStage, isClosed }: { currentStage: string | null; isClosed: boolean }) {
  const normalizedStage = currentStage || 'Draft';
  const stage = normalizedStage as LcStage;
  const currentIndex = LC_STAGES.indexOf(stage);
  return (
    <div className="border-b bg-muted/30 px-4 py-3" data-testid="lc-milestone-strip">
      <div className="flex items-center gap-0.5 overflow-x-auto pb-1">
        {LC_STAGES.map((s, i) => {
          const isCompleted = i < currentIndex || (isClosed && i <= currentIndex);
          const isActive = i === currentIndex && !isClosed;
          return (
            <React.Fragment key={s}>
              <div className="flex flex-col items-center gap-1 min-w-fit">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 flex-shrink-0 ${
                  isCompleted ? 'bg-emerald-500 border-emerald-500 text-white'
                    : isActive ? 'bg-purple-500 border-purple-500 text-white'
                    : 'bg-background border-border text-muted-foreground'
                }`}>
                  {isCompleted ? <Check className="w-3 h-3" /> : i + 1}
                </div>
                <span className={`text-[9px] font-medium whitespace-nowrap max-w-[58px] text-center leading-tight ${
                  isCompleted ? 'text-emerald-600' : isActive ? 'text-purple-600' : 'text-muted-foreground'
                }`}>
                  {s}
                </span>
              </div>
              {i < LC_STAGES.length - 1 && (
                <div className={`h-0.5 flex-1 min-w-[8px] mt-[-10px] ${isCompleted ? 'bg-emerald-400' : 'bg-border'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// --- Status Banner ---
function StageBanner({ stage, userRole, isClosed }: { stage: LcStage; userRole: 'importer' | 'exporter' | 'admin'; isClosed: boolean }) {
  if (isClosed) return null;
  const info = STAGE_ACTOR[stage];
  const isMyTurn = info.actor === 'Admin' && userRole === 'admin'
    || info.actor === 'Exporter' && userRole === 'exporter'
    || info.actor === 'Importer' && userRole === 'importer'
    || info.actor === 'Done';
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    teal: 'bg-teal-50 border-teal-200 text-teal-700',
    gray: 'bg-gray-50 border-gray-200 text-gray-700',
  };
  const cls = colorMap[info.color] || colorMap.blue;
  return (
    <div className={`px-4 py-2 border-b flex items-center gap-2 text-sm ${cls}`} data-testid="stage-banner">
      {isMyTurn ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <Clock className="w-4 h-4 flex-shrink-0" />}
      <span>
        <strong>{isMyTurn ? 'Your turn:' : `Waiting for ${info.actor}:`}</strong>{' '}
        {info.description}
      </span>
    </div>
  );
}

// --- DocumentStatusBadge ---
function DocumentStatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; className: string }> = {
    Missing:        { label: 'Missing',      className: 'bg-gray-100 text-gray-500 border-gray-200' },
    Pending:        { label: 'Uploaded',     className: 'bg-blue-50 text-blue-600 border-blue-200' },
    'Under Review': { label: 'Under Review', className: 'bg-amber-50 text-amber-600 border-amber-200' },
    Approved:       { label: 'Approved',     className: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
    Verified:       { label: 'Approved',     className: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
    Rejected:       { label: 'Rejected',     className: 'bg-red-50 text-red-600 border-red-200' },
    Expired:        { label: 'Expired',      className: 'bg-orange-50 text-orange-600 border-orange-200' },
  };
  const c = cfg[status] || cfg['Missing'];
  return <Badge variant="outline" className={`text-xs font-medium ${c.className}`}>{c.label}</Badge>;
}

// --- Risk Level Badge ---
function RiskBadge({ level }: { level: string }) {
  const cfg: Record<string, string> = {
    Low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Medium: 'bg-amber-50 text-amber-700 border-amber-200',
    High: 'bg-red-50 text-red-700 border-red-200',
    Critical: 'bg-red-100 text-red-900 border-red-300',
    Unknown: 'bg-gray-50 text-gray-500 border-gray-200',
  };
  return <Badge variant="outline" className={`text-xs ${cfg[level] || cfg.Unknown}`}>{level}</Badge>;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function DealRoom({ dealRoomId, userRole, onClose }: DealRoomProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [room, setRoom] = useState<DealRoomData | null>(null);
  const [messages, setMessages] = useState<DealRoomMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const checklistFileInputRef = useRef<HTMLInputElement>(null);
  const wrFileInputRef = useRef<HTMLInputElement>(null);
  const polFileInputRef = useRef<HTMLInputElement>(null);

  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [allAcceptances, setAllAcceptances] = useState<AgreementAcceptance[]>([]);
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [acceptingTerms, setAcceptingTerms] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [closureNotes, setClosureNotes] = useState('');
  const [closingRoom, setClosingRoom] = useState(false);
  const [adminDisclaimer, setAdminDisclaimer] = useState('');
  const [savingDisclaimer, setSavingDisclaimer] = useState(false);
  const [showDisclaimerSection, setShowDisclaimerSection] = useState(false);
  const [selectedAcceptance, setSelectedAcceptance] = useState<AgreementAcceptance | null>(null);

  const [documents, setDocuments] = useState<DealRoomDocument[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [reviewDocId, setReviewDocId] = useState<string | null>(null);
  const [reviewStatus, setReviewStatus] = useState<'Approved' | 'Rejected' | 'Under Review'>('Under Review');
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [expandedVersions, setExpandedVersions] = useState<string[]>([]);
  const [uploadingDocType, setUploadingDocType] = useState<string | null>(null);
  const [uploadParentId, setUploadParentId] = useState<string | null>(null);

  const [milestones, setMilestones] = useState<DealMilestone[]>([]);
  const [milestonesLoading, setMilestonesLoading] = useState(false);
  const [lcUpdateDialog, setLcUpdateDialog] = useState(false);
  const [lcTargetStage, setLcTargetStage] = useState<LcStage | null>(null);
  const [lcNotes, setLcNotes] = useState('');
  const [updatingLc, setUpdatingLc] = useState(false);

  const [discrepancies, setDiscrepancies] = useState<DealDiscrepancy[]>([]);
  const [discrepanciesLoading, setDiscrepanciesLoading] = useState(false);
  const [raiseDiscrepancyDialog, setRaiseDiscrepancyDialog] = useState(false);
  const [discrepancyDocId, setDiscrepancyDocId] = useState<string>('none');
  const [discrepancyReason, setDiscrepancyReason] = useState<string>('');
  const [discrepancyDescription, setDiscrepancyDescription] = useState('');
  const [raisingDiscrepancy, setRaisingDiscrepancy] = useState(false);
  const [resolveDiscrepancyId, setResolveDiscrepancyId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolvingDiscrepancy, setResolvingDiscrepancy] = useState(false);

  // LC Wizard state
  const [lcTermsData, setLcTermsData] = useState<LcTermsData | null>(null);
  const [showLcWizard, setShowLcWizard] = useState(false);
  const [lcWizardStep, setLcWizardStep] = useState(1);
  const [lcWizardForm, setLcWizardForm] = useState({
    lcType: 'Irrevocable',
    expiryDate: '',
    expiryPlace: '',
    amount: '',
    currency: 'USD',
    partialShipment: false,
    transshipment: false,
    requiredDocuments: REQUIRED_DOCUMENTS.map(d => d.type),
  });
  const [savingLcTerms, setSavingLcTerms] = useState(false);

  // Counterparty Risk state
  const [importerRisk, setImporterRisk] = useState<PartyRisk | null>(null);
  const [exporterRisk, setExporterRisk] = useState<PartyRisk | null>(null);
  const [riskLoading, setRiskLoading] = useState(false);

  // WR / POL structured upload state
  const [showWrForm, setShowWrForm] = useState(false);
  const [showPolForm, setShowPolForm] = useState(false);
  const [wrForm, setWrForm] = useState({ warehouseName: '', wrNumber: '', goldQuantityGrams: '', issuanceDate: '', expiryDate: '' });
  const [polForm, setPolForm] = useState({ carrierName: '', blNumber: '', portOfLoading: '', portOfDischarge: '', estimatedDeparture: '', estimatedArrival: '' });
  const [uploadingWr, setUploadingWr] = useState(false);
  const [uploadingPol, setUploadingPol] = useState(false);
  const [pendingWrFile, setPendingWrFile] = useState<File | null>(null);
  const [pendingPolFile, setPendingPolFile] = useState<File | null>(null);

  const [activeTab, setActiveTab] = useState('chat');

  const currentLcStage = ((room?.lcLifecycleStatus) || 'Draft') as LcStage;
  const currentLcIndex = LC_STAGES.indexOf(currentLcStage);
  const validCurrentIndex = currentLcIndex < 0 ? 0 : currentLcIndex;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const fetchRoom = useCallback(async () => {
    try {
      const response = await apiRequest('GET', `/api/deal-rooms/${dealRoomId}`);
      if (response.ok) {
        const data = await response.json();
        setRoom(data.room);
        setAdminDisclaimer(data.room.adminDisclaimer || '');
      }
    } catch {}
  }, [dealRoomId]);

  const fetchAgreementStatus = useCallback(async () => {
    if (!user) return;
    try {
      const response = await apiRequest('GET', `/api/deal-rooms/${dealRoomId}/agreement`);
      if (response.ok) {
        const data = await response.json();
        setHasAcceptedTerms(data.hasAccepted);
        setAllAcceptances(data.allAcceptances || []);
        if (!data.hasAccepted && !room?.isClosed) setShowTermsDialog(true);
      }
    } catch {}
  }, [dealRoomId, user, room?.isClosed]);

  const fetchMessages = useCallback(async () => {
    if (!user) return;
    try {
      const response = await apiRequest('GET', `/api/deal-rooms/${dealRoomId}/messages?userId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages);
        scrollToBottom();
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [dealRoomId, scrollToBottom, user]);

  const fetchDocuments = useCallback(async () => {
    setDocsLoading(true);
    try {
      const response = await apiRequest('GET', `/api/deal-rooms/${dealRoomId}/documents`);
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      }
    } catch {} finally {
      setDocsLoading(false);
    }
  }, [dealRoomId]);

  const fetchMilestones = useCallback(async () => {
    setMilestonesLoading(true);
    try {
      const response = await apiRequest('GET', `/api/deal-rooms/${dealRoomId}/milestones`);
      if (response.ok) {
        const data = await response.json();
        setMilestones(data.milestones || []);
      }
    } catch {} finally {
      setMilestonesLoading(false);
    }
  }, [dealRoomId]);

  const fetchDiscrepancies = useCallback(async () => {
    setDiscrepanciesLoading(true);
    try {
      const response = await apiRequest('GET', `/api/deal-rooms/${dealRoomId}/discrepancies`);
      if (response.ok) {
        const data = await response.json();
        setDiscrepancies(data.discrepancies || []);
      }
    } catch {} finally {
      setDiscrepanciesLoading(false);
    }
  }, [dealRoomId]);

  const fetchLcTerms = useCallback(async () => {
    try {
      const response = await apiRequest('GET', `/api/deal-rooms/${dealRoomId}/lc-terms`);
      if (response.ok) {
        const data = await response.json();
        setLcTermsData(data.lcTerms);
        // Show wizard if no terms exist and user is importer or admin
        if (!data.lcTerms && (userRole === 'importer' || userRole === 'admin')) {
          setShowLcWizard(true);
        }
      }
    } catch {}
  }, [dealRoomId, userRole]);

  const fetchRisk = useCallback(async () => {
    setRiskLoading(true);
    try {
      const response = await apiRequest('GET', `/api/deal-rooms/${dealRoomId}/counterparty-risk`);
      if (response.ok) {
        const data = await response.json();
        setImporterRisk(data.importerRisk);
        setExporterRisk(data.exporterRisk);
      }
    } catch {} finally {
      setRiskLoading(false);
    }
  }, [dealRoomId]);

  useEffect(() => {
    fetchRoom();
    fetchMessages();
    fetchAgreementStatus();
    fetchDocuments();
    fetchMilestones();
    fetchDiscrepancies();
    fetchLcTerms();
  }, [fetchRoom, fetchMessages, fetchAgreementStatus, fetchDocuments, fetchMilestones, fetchDiscrepancies, fetchLcTerms]);

  useEffect(() => {
    if (activeTab === 'documents') fetchDocuments();
    else if (activeTab === 'timeline') fetchMilestones();
    else if (activeTab === 'discrepancies') fetchDiscrepancies();
    else if (activeTab === 'risk') fetchRisk();
  }, [activeTab, fetchDocuments, fetchMilestones, fetchDiscrepancies, fetchRisk]);

  // Socket
  useEffect(() => {
    if (!user || !dealRoomId) return;
    const socket = io({ transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    socket.on('connect', () => socket.emit('dealroom:join', { dealRoomId, userId: user.id }));
    socket.on('dealroom:message', (message: DealRoomMessage) => {
      setMessages(prev => [...prev, message]);
      scrollToBottom();
    });
    socket.on('dealroom:user-joined', ({ userId }) => setOnlineUsers(prev => prev.includes(userId) ? prev : [...prev, userId]));
    socket.on('dealroom:user-left', ({ userId }) => setOnlineUsers(prev => prev.filter(id => id !== userId)));
    socket.on('dealroom:typing', ({ userId, isTyping }) => {
      if (isTyping) setTypingUsers(prev => prev.includes(userId) ? prev : [...prev, userId]);
      else setTypingUsers(prev => prev.filter(id => id !== userId));
    });
    socket.on('dealroom:read', ({ userId }) => {
      if (userId !== user.id) setMessages(prev => prev.map(msg => ({ ...msg, isRead: true })));
    });
    socket.on('dealroom:error', ({ message }) => toast({ title: 'Error', description: message, variant: 'destructive' }));
    return () => {
      socket.emit('dealroom:leave', { dealRoomId, userId: user.id });
      socket.disconnect();
    };
  }, [user, dealRoomId, scrollToBottom, toast]);

  useEffect(() => {
    if (!user || !socketRef.current) return;
    socketRef.current.emit('dealroom:read', { dealRoomId, userId: user.id });
  }, [messages, user, dealRoomId]);

  const handleTyping = useCallback(() => {
    if (!socketRef.current || !user) return;
    socketRef.current.emit('dealroom:typing', { dealRoomId, userId: user.id, isTyping: true });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit('dealroom:typing', { dealRoomId, userId: user.id, isTyping: false });
    }, 2000);
  }, [dealRoomId, user]);

  const sendMessage = async (content?: string, attachmentUrl?: string, attachmentName?: string, attachmentType?: string) => {
    if (!user || (!content?.trim() && !attachmentUrl)) return;
    setSending(true);
    try {
      if (socketRef.current?.connected) {
        socketRef.current.emit('dealroom:message', {
          dealRoomId, senderUserId: user.id, senderRole: userRole,
          content: content?.trim() || null, attachmentUrl, attachmentName, attachmentType,
        });
        setNewMessage('');
      } else {
        const response = await apiRequest('POST', `/api/deal-rooms/${dealRoomId}/messages`, {
          senderUserId: user.id, senderRole: userRole, content: content?.trim() || null,
          attachmentUrl, attachmentName, attachmentType,
        });
        if (response.ok) {
          const data = await response.json();
          setMessages(prev => [...prev, data.message]);
          setNewMessage('');
          scrollToBottom();
        }
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to send message', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetch('/api/documents/upload', {
        method: 'POST', headers: { 'X-Requested-With': 'XMLHttpRequest' },
        body: formData, credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        await sendMessage(undefined, data.url, file.name, file.type);
      } else {
        toast({ title: 'Error', description: 'Failed to upload file', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to upload file', variant: 'destructive' });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(newMessage); }
  };

  const acceptTerms = async () => {
    if (!termsAgreed) return;
    setAcceptingTerms(true);
    try {
      const response = await apiRequest('POST', `/api/deal-rooms/${dealRoomId}/agreement/accept`, {});
      if (response.ok) {
        setHasAcceptedTerms(true);
        setShowTermsDialog(false);
        toast({ title: 'Terms Accepted', description: 'You can now access the deal room' });
        await fetchAgreementStatus();
      } else {
        const error = await response.json();
        toast({ title: 'Error', description: error.message || 'Failed to accept terms', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to accept terms', variant: 'destructive' });
    } finally {
      setAcceptingTerms(false);
    }
  };

  const closeDealRoom = async () => {
    setClosingRoom(true);
    try {
      const response = await apiRequest('POST', `/api/admin/deal-rooms/${dealRoomId}/close`, { closureNotes });
      if (response.ok) {
        toast({ title: 'Deal Room Closed' });
        setShowCloseDialog(false);
        await fetchRoom();
      } else {
        const error = await response.json();
        toast({ title: 'Error', description: error.message || 'Failed to close', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to close deal room', variant: 'destructive' });
    } finally {
      setClosingRoom(false);
    }
  };

  const saveAdminDisclaimer = async () => {
    setSavingDisclaimer(true);
    try {
      await apiRequest('POST', `/api/admin/deal-rooms/${dealRoomId}/disclaimer`, { disclaimer: adminDisclaimer });
      toast({ title: 'Disclaimer Saved' });
      await fetchRoom();
    } catch {
      toast({ title: 'Error', description: 'Failed to save disclaimer', variant: 'destructive' });
    } finally {
      setSavingDisclaimer(false);
    }
  };

  const handleChecklistUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingDocType) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const uploadRes = await fetch('/api/documents/upload', {
        method: 'POST', headers: { 'X-Requested-With': 'XMLHttpRequest' },
        body: formData, credentials: 'include',
      });
      if (!uploadRes.ok) throw new Error('Upload failed');
      const uploadData = await uploadRes.json();
      const body: Record<string, unknown> = {
        documentType: uploadingDocType,
        fileName: file.name,
        fileUrl: uploadData.url,
        fileSize: file.size,
      };
      if (uploadParentId) body.parentDocumentId = uploadParentId;
      const docRes = await apiRequest('POST', `/api/deal-rooms/${dealRoomId}/documents`, body);
      if (docRes.ok) {
        toast({ title: 'Document uploaded', description: `${uploadingDocType} submitted for review` });
        await fetchDocuments();
      } else {
        throw new Error('Failed to register document');
      }
    } catch {
      toast({ title: 'Upload failed', description: 'Please try again', variant: 'destructive' });
    }
    setUploadingDocType(null);
    setUploadParentId(null);
    if (checklistFileInputRef.current) checklistFileInputRef.current.value = '';
  };

  const submitDocumentReview = async () => {
    if (!reviewDocId) return;
    setReviewSubmitting(true);
    try {
      const res = await apiRequest('PATCH', `/api/deal-rooms/${dealRoomId}/documents/${reviewDocId}/review`, {
        status: reviewStatus, verificationNotes: reviewNotes,
      });
      if (res.ok) {
        toast({ title: `Document ${reviewStatus}` });
        setReviewDocId(null);
        setReviewNotes('');
        await fetchDocuments();
        await fetchDiscrepancies();
      } else {
        const err = await res.json();
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Review failed', variant: 'destructive' });
    } finally {
      setReviewSubmitting(false);
    }
  };

  const triggerLcTransition = async (targetStage: LcStage, notes?: string) => {
    setUpdatingLc(true);
    try {
      const res = await apiRequest('PATCH', `/api/deal-rooms/${dealRoomId}/lc-status`, {
        lcLifecycleStatus: targetStage, notes: notes || lcNotes,
      });
      if (res.ok) {
        toast({ title: 'Stage updated', description: `→ ${targetStage}` });
        setLcUpdateDialog(false);
        setLcTargetStage(null);
        setLcNotes('');
        await fetchRoom();
        await fetchMilestones();
      } else {
        const err = await res.json();
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to update stage', variant: 'destructive' });
    } finally {
      setUpdatingLc(false);
    }
  };

  const raiseDiscrepancy = async () => {
    if (!discrepancyReason) return;
    setRaisingDiscrepancy(true);
    try {
      const res = await apiRequest('POST', `/api/deal-rooms/${dealRoomId}/discrepancies`, {
        documentId: (discrepancyDocId && discrepancyDocId !== 'none') ? discrepancyDocId : null,
        reasonType: discrepancyReason,
        description: discrepancyDescription,
      });
      if (res.ok) {
        toast({ title: 'Discrepancy raised' });
        setRaiseDiscrepancyDialog(false);
        setDiscrepancyDocId('none');
        setDiscrepancyReason('');
        setDiscrepancyDescription('');
        await fetchDiscrepancies();
      } else {
        const err = await res.json();
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to raise discrepancy', variant: 'destructive' });
    } finally {
      setRaisingDiscrepancy(false);
    }
  };

  const resolveDiscrepancy = async () => {
    if (!resolveDiscrepancyId) return;
    setResolvingDiscrepancy(true);
    try {
      const res = await apiRequest('PATCH', `/api/deal-rooms/${dealRoomId}/discrepancies/${resolveDiscrepancyId}/resolve`, {
        resolutionNotes,
      });
      if (res.ok) {
        toast({ title: 'Discrepancy resolved' });
        setResolveDiscrepancyId(null);
        setResolutionNotes('');
        await fetchDiscrepancies();
      } else {
        const err = await res.json();
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to resolve', variant: 'destructive' });
    } finally {
      setResolvingDiscrepancy(false);
    }
  };

  const saveLcTerms = async () => {
    setSavingLcTerms(true);
    try {
      const res = await apiRequest('POST', `/api/deal-rooms/${dealRoomId}/lc-terms`, {
        ...lcWizardForm,
        amount: lcWizardForm.amount || null,
      });
      if (res.ok) {
        const data = await res.json();
        setLcTermsData(data.lcTerms);
        setShowLcWizard(false);
        toast({ title: 'LC Terms saved', description: 'Letter of Credit terms recorded' });
      } else {
        const err = await res.json();
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to save LC terms', variant: 'destructive' });
    } finally {
      setSavingLcTerms(false);
    }
  };

  // WR Upload
  const handleWrFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setPendingWrFile(file);
    if (wrFileInputRef.current) wrFileInputRef.current.value = '';
  };

  const handlePolFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setPendingPolFile(file);
    if (polFileInputRef.current) polFileInputRef.current.value = '';
  };

  const submitWrUpload = async () => {
    if (!pendingWrFile) { toast({ title: 'Select a file first', variant: 'destructive' }); return; }
    setUploadingWr(true);
    try {
      const formData = new FormData();
      formData.append('file', pendingWrFile);
      const uploadRes = await fetch('/api/documents/upload', {
        method: 'POST', headers: { 'X-Requested-With': 'XMLHttpRequest' },
        body: formData, credentials: 'include',
      });
      if (!uploadRes.ok) throw new Error('Upload failed');
      const uploadData = await uploadRes.json();
      const docRes = await apiRequest('POST', `/api/deal-rooms/${dealRoomId}/documents`, {
        documentType: 'Warehouse Receipt',
        fileName: pendingWrFile.name,
        fileUrl: uploadData.url,
        fileSize: pendingWrFile.size,
      });
      if (!docRes.ok) throw new Error('Failed to register document');
      const docData = await docRes.json();
      await apiRequest('POST', `/api/deal-rooms/${dealRoomId}/documents/${docData.document.id}/metadata`, {
        warehouseName: wrForm.warehouseName || null,
        wrNumber: wrForm.wrNumber || null,
        goldQuantityGrams: wrForm.goldQuantityGrams || null,
        issuanceDate: wrForm.issuanceDate || null,
        expiryDate: wrForm.expiryDate || null,
      });
      toast({ title: 'Warehouse Receipt uploaded', description: 'WR submitted for review' });
      setShowWrForm(false);
      setPendingWrFile(null);
      setWrForm({ warehouseName: '', wrNumber: '', goldQuantityGrams: '', issuanceDate: '', expiryDate: '' });
      await fetchDocuments();
    } catch {
      toast({ title: 'Upload failed', description: 'Please try again', variant: 'destructive' });
    } finally {
      setUploadingWr(false);
    }
  };

  const submitPolUpload = async () => {
    if (!pendingPolFile) { toast({ title: 'Select a file first', variant: 'destructive' }); return; }
    setUploadingPol(true);
    try {
      const formData = new FormData();
      formData.append('file', pendingPolFile);
      const uploadRes = await fetch('/api/documents/upload', {
        method: 'POST', headers: { 'X-Requested-With': 'XMLHttpRequest' },
        body: formData, credentials: 'include',
      });
      if (!uploadRes.ok) throw new Error('Upload failed');
      const uploadData = await uploadRes.json();
      const docRes = await apiRequest('POST', `/api/deal-rooms/${dealRoomId}/documents`, {
        documentType: 'Proof of Lading',
        fileName: pendingPolFile.name,
        fileUrl: uploadData.url,
        fileSize: pendingPolFile.size,
      });
      if (!docRes.ok) throw new Error('Failed to register document');
      const docData = await docRes.json();
      await apiRequest('POST', `/api/deal-rooms/${dealRoomId}/documents/${docData.document.id}/metadata`, {
        carrierName: polForm.carrierName || null,
        blNumber: polForm.blNumber || null,
        portOfLoading: polForm.portOfLoading || null,
        portOfDischarge: polForm.portOfDischarge || null,
        estimatedDeparture: polForm.estimatedDeparture || null,
        estimatedArrival: polForm.estimatedArrival || null,
      });
      toast({ title: 'Proof of Lading uploaded', description: 'POL submitted for review' });
      setShowPolForm(false);
      setPendingPolFile(null);
      setPolForm({ carrierName: '', blNumber: '', portOfLoading: '', portOfDischarge: '', estimatedDeparture: '', estimatedArrival: '' });
      await fetchDocuments();
    } catch {
      toast({ title: 'Upload failed', description: 'Please try again', variant: 'destructive' });
    } finally {
      setUploadingPol(false);
    }
  };

  const getLatestDocByType = (docType: string): DealRoomDocument | undefined => {
    const byType = documents.filter(d => d.documentType === docType);
    if (!byType.length) return undefined;
    return byType.sort((a, b) => {
      const diff = (b.versionNumber ?? 1) - (a.versionNumber ?? 1);
      return diff !== 0 ? diff : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })[0];
  };

  const getDocVersionHistory = (docType: string): DealRoomDocument[] =>
    documents.filter(d => d.documentType === docType)
      .sort((a, b) => (b.versionNumber ?? 1) - (a.versionNumber ?? 1));

  const canUpload = (responsible: string): boolean => {
    if (userRole === 'admin') return true;
    if (responsible === 'exporter' && userRole === 'exporter') return true;
    if (responsible === 'importer' && userRole === 'importer') return true;
    return false;
  };

  // Role-based action gate check
  const getAllowedTransitions = () => {
    const transitions = STAGE_TRANSITIONS[currentLcStage] || [];
    return transitions.filter(t => {
      if (t.role === 'admin') return userRole === 'admin';
      if (t.role === 'exporter') return userRole === 'exporter';
      if (t.role === 'importer') return userRole === 'importer';
      if (t.role === 'admin_exporter') return userRole === 'admin' || userRole === 'exporter';
      if (t.role === 'admin_importer') return userRole === 'admin' || userRole === 'importer';
      return false;
    });
  };

  // Check if importer can proceed (all docs approved + LC in Approved)
  const allDocsApproved = REQUIRED_DOCUMENTS.every(rd => {
    const doc = getLatestDocByType(rd.type);
    return doc && ['Approved', 'Verified'].includes(doc.status);
  });
  const canTriggerPayment = currentLcStage === 'Approved' && allDocsApproved && (userRole === 'importer' || userRole === 'admin');

  const canCloseRoom = userRole === 'admin' && room && !room.isClosed &&
    room.tradeRequest && ['Settled', 'Completed', 'Cancelled'].includes(room.tradeRequest.status);

  const openDiscrepancies = discrepancies.filter(d => d.status === 'open');
  const allowedTransitions = getAllowedTransitions();

  const termsContent = `FINABRIDGE TRADE FINANCE - TERMS AND CONDITIONS

By accepting these terms, you agree to the following:

1. CONFIDENTIALITY
All information shared within this Deal Room is strictly confidential. You agree not to disclose any trade details, communications, or documentation to third parties without prior written consent from all parties involved.

2. COMPLIANCE
You confirm that all goods, transactions, and activities conducted through FinaBridge comply with applicable local and international trade regulations, including but not limited to anti-money laundering (AML) and know-your-customer (KYC) requirements.

3. DISPUTE RESOLUTION
Any disputes arising from transactions facilitated through FinaBridge shall be resolved through binding arbitration in accordance with the rules of the Dubai International Arbitration Centre (DIAC).

4. GOLD-BACKED SETTLEMENT
You acknowledge that settlements are conducted using gold-backed digital assets. The value of settlements is determined by prevailing market rates at the time of settlement confirmation.

5. PLATFORM FEES
You agree to pay all applicable platform fees as disclosed prior to transaction confirmation. Fees are non-refundable once a transaction is initiated.

6. LIABILITY
FinaBridge acts as a facilitator and does not guarantee the performance of any counterparty. Users assume full responsibility for conducting due diligence on trading partners.

7. DOCUMENT AUTHENTICITY
You warrant that all documents uploaded to this Deal Room are authentic and have not been altered or falsified in any way.

8. DATA PROTECTION
Your personal and business information will be processed in accordance with our Privacy Policy.

9. TERMINATION
FinaBridge reserves the right to terminate access to this Deal Room if any party is found to be in violation of these terms or applicable laws.

10. GOVERNING LAW
These terms are governed by the laws of the United Arab Emirates.

Version 1.0 - Effective Date: January 2025`.trim();

  if (loading) {
    return (
      <Card className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  // ============ LC WIZARD MODAL ============
  const lcWizardModal = (
    <Dialog open={showLcWizard} onOpenChange={setShowLcWizard}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-500" />
            LC Wizard — Step {lcWizardStep} of 4
          </DialogTitle>
          <DialogDescription>
            Set the Letter of Credit terms for this trade deal.
          </DialogDescription>
        </DialogHeader>

        {/* Progress */}
        <div className="flex gap-1 mb-4">
          {[1,2,3,4].map(s => (
            <div key={s} className={`flex-1 h-1.5 rounded-full ${s <= lcWizardStep ? 'bg-purple-500' : 'bg-border'}`} />
          ))}
        </div>

        {lcWizardStep === 1 && (
          <div className="space-y-4">
            <p className="text-sm font-medium">LC Type</p>
            <div className="grid grid-cols-3 gap-3">
              {['Irrevocable', 'Transferable', 'Standby'].map(t => (
                <button key={t} onClick={() => setLcWizardForm(f => ({ ...f, lcType: t }))}
                  className={`p-3 rounded-lg border-2 text-sm font-medium text-center transition-colors ${lcWizardForm.lcType === t ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-border hover:border-purple-300'}`}
                  data-testid={`lc-type-${t.toLowerCase()}`}>
                  {t}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {lcWizardForm.lcType === 'Irrevocable' ? 'Cannot be changed without consent of all parties. Most secure.' 
                : lcWizardForm.lcType === 'Transferable' ? 'Can be transferred to secondary beneficiaries.'
                : 'Used as payment guarantee. Does not require document presentation.'}
            </p>
          </div>
        )}

        {lcWizardStep === 2 && (
          <div className="space-y-4">
            <p className="text-sm font-medium">Expiry & Amount</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Expiry Date</label>
                <Input type="date" value={lcWizardForm.expiryDate}
                  onChange={e => setLcWizardForm(f => ({ ...f, expiryDate: e.target.value }))}
                  data-testid="input-lc-expiry-date" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Expiry Place</label>
                <Input placeholder="e.g. Dubai" value={lcWizardForm.expiryPlace}
                  onChange={e => setLcWizardForm(f => ({ ...f, expiryPlace: e.target.value }))}
                  data-testid="input-lc-expiry-place" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Amount</label>
                <Input type="number" placeholder="e.g. 500000" value={lcWizardForm.amount}
                  onChange={e => setLcWizardForm(f => ({ ...f, amount: e.target.value }))}
                  data-testid="input-lc-amount" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Currency</label>
                <Select value={lcWizardForm.currency} onValueChange={v => setLcWizardForm(f => ({ ...f, currency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['USD', 'EUR', 'GBP', 'AED', 'CHF'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {lcWizardStep === 3 && (
          <div className="space-y-3">
            <p className="text-sm font-medium">Required Documents</p>
            <p className="text-xs text-muted-foreground">Select which documents are required under this LC.</p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {REQUIRED_DOCUMENTS.map(d => {
                const checked = lcWizardForm.requiredDocuments.includes(d.type);
                return (
                  <div key={d.type} className="flex items-center gap-3 p-2 rounded border hover:bg-muted/30">
                    <Checkbox checked={checked}
                      onCheckedChange={c => setLcWizardForm(f => ({
                        ...f,
                        requiredDocuments: c ? [...f.requiredDocuments, d.type] : f.requiredDocuments.filter(x => x !== d.type),
                      }))}
                      data-testid={`checkbox-doc-${d.type.toLowerCase().replace(/\s+/g, '-')}`} />
                    <div>
                      <p className="text-sm font-medium">{d.label}</p>
                      <p className="text-xs text-muted-foreground">{d.responsibleLabel}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {lcWizardStep === 4 && (
          <div className="space-y-4">
            <p className="text-sm font-medium">Shipment Terms</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-sm font-medium">Partial Shipment</p>
                  <p className="text-xs text-muted-foreground">Allow goods to be shipped in multiple instalments</p>
                </div>
                <button onClick={() => setLcWizardForm(f => ({ ...f, partialShipment: !f.partialShipment }))}
                  className={`w-12 h-6 rounded-full transition-colors ${lcWizardForm.partialShipment ? 'bg-purple-500' : 'bg-border'}`}
                  data-testid="toggle-partial-shipment">
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${lcWizardForm.partialShipment ? 'translate-x-6' : ''}`} />
                </button>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-sm font-medium">Transshipment</p>
                  <p className="text-xs text-muted-foreground">Allow goods to be transshipped via intermediate ports</p>
                </div>
                <button onClick={() => setLcWizardForm(f => ({ ...f, transshipment: !f.transshipment }))}
                  className={`w-12 h-6 rounded-full transition-colors ${lcWizardForm.transshipment ? 'bg-purple-500' : 'bg-border'}`}
                  data-testid="toggle-transshipment">
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${lcWizardForm.transshipment ? 'translate-x-6' : ''}`} />
                </button>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex items-center justify-between gap-2">
          <div className="flex gap-2">
            {lcWizardStep > 1 && (
              <Button variant="outline" onClick={() => setLcWizardStep(s => s - 1)}>Back</Button>
            )}
            <Button variant="ghost" onClick={() => setShowLcWizard(false)}>Skip for now</Button>
          </div>
          {lcWizardStep < 4 ? (
            <Button onClick={() => setLcWizardStep(s => s + 1)} data-testid="btn-lc-wizard-next">
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={saveLcTerms} disabled={savingLcTerms} data-testid="btn-lc-wizard-save">
              {savingLcTerms ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
              Save LC Terms
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <>
      {/* LC Wizard */}
      {lcWizardModal}

      {/* Terms Dialog */}
      <AlertDialog open={showTermsDialog && !hasAcceptedTerms && !room?.isClosed} onOpenChange={setShowTermsDialog}>
        <AlertDialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-500" />FinaBridge Terms & Conditions
            </AlertDialogTitle>
            <AlertDialogDescription>Please read and accept the following terms before accessing the Deal Room.</AlertDialogDescription>
          </AlertDialogHeader>
          <ScrollArea className="h-[300px] border rounded-md p-4 my-4">
            <pre className="whitespace-pre-wrap text-sm font-sans">{termsContent}</pre>
          </ScrollArea>
          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
            <Checkbox id="terms-agree" checked={termsAgreed} onCheckedChange={(c) => setTermsAgreed(c === true)} data-testid="checkbox-agree-terms" />
            <label htmlFor="terms-agree" className="text-sm cursor-pointer">
              I have read, understood, and agree to the FinaBridge Terms & Conditions. I acknowledge that my acceptance is legally binding.
            </label>
          </div>
          <AlertDialogFooter>
            {onClose && <AlertDialogCancel onClick={onClose} data-testid="button-decline-terms">Decline & Exit</AlertDialogCancel>}
            <AlertDialogAction onClick={acceptTerms} disabled={!termsAgreed || acceptingTerms} data-testid="button-accept-terms">
              {acceptingTerms ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Accepting...</> : <><Check className="w-4 h-4 mr-2" />Accept Terms</>}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Close Room Dialog */}
      <AlertDialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><Lock className="w-5 h-5 text-destructive" />Close Deal Room</AlertDialogTitle>
            <AlertDialogDescription>Once closed, this Deal Room will become read-only. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Closure Notes (Optional)</label>
            <Textarea placeholder="Add closure notes..." value={closureNotes} onChange={(e) => setClosureNotes(e.target.value)} data-testid="input-closure-notes" />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-close">Cancel</AlertDialogCancel>
            <Button variant="destructive" onClick={closeDealRoom} disabled={closingRoom} data-testid="button-confirm-close">
              {closingRoom ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Closing...</> : <><XCircle className="w-4 h-4 mr-2" />Close Deal Room</>}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Acceptance Details Dialog */}
      <Dialog open={!!selectedAcceptance} onOpenChange={(open) => !open && setSelectedAcceptance(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Shield className="w-5 h-5 text-success" />Terms Acceptance Details</DialogTitle>
          </DialogHeader>
          {selectedAcceptance && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-muted-foreground">Role</p><p className="font-medium capitalize">{selectedAcceptance.role}</p></div>
                <div><p className="text-xs text-muted-foreground">Version</p><p className="font-medium">v{selectedAcceptance.agreementVersion}</p></div>
              </div>
              <div><p className="text-xs text-muted-foreground">Date & Time</p><p className="font-medium">{format(new Date(selectedAcceptance.acceptedAt), 'MMMM d, yyyy h:mm:ss a')}</p></div>
              {selectedAcceptance.ipAddress && <div><p className="text-xs text-muted-foreground">IP Address</p><p className="font-medium font-mono text-sm">{selectedAcceptance.ipAddress}</p></div>}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Document Review Dialog */}
      <Dialog open={!!reviewDocId} onOpenChange={(open) => !open && setReviewDocId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Review Document</DialogTitle>
            <DialogDescription>Set the review status and add notes for the uploader.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Decision</label>
              <div className="flex gap-2">
                {(['Under Review', 'Approved', 'Rejected'] as const).map(s => (
                  <Button key={s} size="sm" variant={reviewStatus === s ? 'default' : 'outline'}
                    onClick={() => setReviewStatus(s)}
                    className={reviewStatus === s && s === 'Approved' ? 'bg-emerald-600 hover:bg-emerald-700' : reviewStatus === s && s === 'Rejected' ? 'bg-red-600 hover:bg-red-700' : ''}
                    data-testid={`btn-review-${s.toLowerCase().replace(' ', '-')}`}>{s}</Button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Notes {reviewStatus === 'Rejected' ? '(Required)' : '(Optional)'}</label>
              <Textarea placeholder="Add review notes..." value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} data-testid="textarea-review-notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDocId(null)}>Cancel</Button>
            <Button onClick={submitDocumentReview}
              disabled={reviewSubmitting || (reviewStatus === 'Rejected' && !reviewNotes.trim())}
              data-testid="btn-submit-review">
              {reviewSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Submit Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* LC Stage Transition Dialog */}
      <Dialog open={lcUpdateDialog} onOpenChange={setLcUpdateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Stage Transition</DialogTitle>
            <DialogDescription>This action will advance the LC lifecycle to the next stage.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Current</p>
                <Badge variant="outline" className="text-xs">{currentLcStage}</Badge>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Next</p>
                <Badge className="text-xs bg-purple-600">{lcTargetStage}</Badge>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Notes (Optional)</label>
              <Textarea placeholder="Add notes about this stage transition..." value={lcNotes} onChange={(e) => setLcNotes(e.target.value)} data-testid="textarea-lc-notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setLcUpdateDialog(false); setLcTargetStage(null); }}>Cancel</Button>
            <Button onClick={() => lcTargetStage && triggerLcTransition(lcTargetStage)} disabled={updatingLc || !lcTargetStage}
              data-testid="btn-confirm-lc-transition">
              {updatingLc && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              <Check className="w-4 h-4 mr-1" />Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Raise Discrepancy Dialog */}
      <Dialog open={raiseDiscrepancyDialog} onOpenChange={setRaiseDiscrepancyDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Flag className="w-4 h-4 text-red-500" />Raise Discrepancy</DialogTitle>
            <DialogDescription>Flag a document or deal issue for resolution.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Related Document (Optional)</label>
              <Select value={discrepancyDocId} onValueChange={setDiscrepancyDocId}>
                <SelectTrigger data-testid="select-discrepancy-doc"><SelectValue placeholder="Select document..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific document</SelectItem>
                  {documents.map(d => <SelectItem key={d.id} value={d.id}>{d.documentType} — {d.fileName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Reason *</label>
              <Select value={discrepancyReason} onValueChange={setDiscrepancyReason}>
                <SelectTrigger data-testid="select-discrepancy-reason"><SelectValue placeholder="Select reason..." /></SelectTrigger>
                <SelectContent>
                  {DISCREPANCY_REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Description *</label>
              <Textarea placeholder="Describe the discrepancy in detail..." value={discrepancyDescription} onChange={(e) => setDiscrepancyDescription(e.target.value)} data-testid="textarea-discrepancy-desc" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRaiseDiscrepancyDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={raiseDiscrepancy}
              disabled={raisingDiscrepancy || !discrepancyReason || !discrepancyDescription.trim()}
              data-testid="btn-raise-discrepancy">
              {raisingDiscrepancy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Flag className="w-4 h-4 mr-2" />}
              Raise Discrepancy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resolve Discrepancy Dialog */}
      <Dialog open={!!resolveDiscrepancyId} onOpenChange={(open) => !open && setResolveDiscrepancyId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" />Resolve Discrepancy</DialogTitle>
            <DialogDescription>Mark this discrepancy as resolved and add resolution notes.</DialogDescription>
          </DialogHeader>
          <div>
            <label className="text-sm font-medium mb-2 block">Resolution Notes</label>
            <Textarea placeholder="Describe how this discrepancy was resolved..." value={resolutionNotes} onChange={(e) => setResolutionNotes(e.target.value)} data-testid="textarea-resolution-notes" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDiscrepancyId(null)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={resolveDiscrepancy} disabled={resolvingDiscrepancy} data-testid="btn-resolve-discrepancy">
              {resolvingDiscrepancy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}Mark Resolved
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hidden file inputs */}
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc" />
      <input type="file" ref={checklistFileInputRef} onChange={handleChecklistUpload} className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
      <input type="file" ref={wrFileInputRef} onChange={handleWrFileSelect} className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
      <input type="file" ref={polFileInputRef} onChange={handlePolFileSelect} className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />

      <Card className="h-full flex flex-col" data-testid="deal-room-container">
        {/* Closed banner */}
        {room?.isClosed && (
          <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-3 flex items-center gap-2 text-destructive">
            <Lock className="w-4 h-4" />
            <span className="font-medium">
              {room.tradeRequest?.status === 'Completed' ? 'Trade Completed — Deal Room Closed'
                : room.tradeRequest?.status === 'Cancelled' ? 'Trade Cancelled — Deal Room Closed'
                : room.tradeRequest?.status === 'Settled' ? 'Trade Settled — Deal Room Closed'
                : 'This Deal Room is closed'}
            </span>
            {room.closedAt && <span className="text-sm opacity-75">— Closed on {format(new Date(room.closedAt), 'MMM d, yyyy h:mm a')}</span>}
          </div>
        )}

        {/* Acceptances strip */}
        {(allAcceptances.length > 0 || userRole === 'admin') && (
          <div className="bg-success-muted border-b px-4 py-2">
            <div className="flex items-center gap-2 text-sm flex-wrap">
              {allAcceptances.length > 0 && (
                <>
                  <Shield className="w-4 h-4 text-success" />
                  <span className="font-medium text-success">Terms Accepted:</span>
                  {allAcceptances.map((a) => (
                    <Badge key={a.id} variant="outline" className="text-xs cursor-pointer hover:bg-success/10"
                      onClick={() => setSelectedAcceptance(a)} data-testid={`badge-acceptance-${a.role}`}>
                      {a.role.charAt(0).toUpperCase() + a.role.slice(1)} — {format(new Date(a.acceptedAt), 'MMM d, yyyy')}
                    </Badge>
                  ))}
                </>
              )}
              {userRole === 'admin' && (
                <Button variant="ghost" size="sm"
                  onClick={() => setShowDisclaimerSection(!showDisclaimerSection)}
                  className={allAcceptances.length > 0 ? 'ml-auto text-xs' : 'text-xs'}
                  data-testid="button-toggle-disclaimer">
                  <FileText className="w-3 h-3 mr-1" />{showDisclaimerSection ? 'Hide' : 'Add/View'} Disclaimer
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Admin disclaimer section */}
        {userRole === 'admin' && showDisclaimerSection && (
          <div className="border-b px-4 py-3 bg-muted/30">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-primary" />
              <span className="font-medium text-sm">Admin Disclaimer</span>
              {room?.adminDisclaimerUpdatedAt && <span className="text-xs text-muted-foreground">Last updated: {format(new Date(room.adminDisclaimerUpdatedAt), 'MMM d, yyyy h:mm a')}</span>}
            </div>
            <Textarea value={adminDisclaimer} onChange={(e) => setAdminDisclaimer(e.target.value)}
              placeholder="Enter admin disclaimer..." className="mb-2 text-sm" rows={3} data-testid="textarea-admin-disclaimer" />
            <Button size="sm" onClick={saveAdminDisclaimer} disabled={savingDisclaimer} data-testid="button-save-disclaimer">
              {savingDisclaimer ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Saving...</> : <><Check className="w-3 h-3 mr-1" />Save</>}
            </Button>
          </div>
        )}

        {/* Header */}
        <CardHeader className="border-b pb-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {onClose && (
                <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-dealroom">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              )}
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-purple-500" />
                  Deal Room
                  {room?.isClosed && <Badge variant="destructive">Closed</Badge>}
                  {openDiscrepancies.length > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      <Flag className="w-3 h-3 mr-1" />{openDiscrepancies.length} open
                    </Badge>
                  )}
                </CardTitle>
                {room?.tradeRequest && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {room.tradeRequest.tradeRefId} — {room.tradeRequest.goodsName}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {(userRole === 'importer' || userRole === 'admin') && (
                <Button variant="outline" size="sm" onClick={() => { setLcWizardStep(1); setShowLcWizard(true); }}
                  data-testid="button-lc-wizard">
                  <FileText className="w-4 h-4 mr-1" />
                  {lcTermsData ? 'LC Terms' : 'LC Wizard'}
                </Button>
              )}
              {canCloseRoom && (
                <Button variant="outline" size="sm" onClick={() => setShowCloseDialog(true)}
                  className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                  data-testid="button-open-close-dialog">
                  <Lock className="w-4 h-4 mr-1" />Close Room
                </Button>
              )}
              <Button variant="outline" size="sm" disabled title="Video conferencing — coming soon"
                data-testid="button-video-call-coming-soon" className="opacity-60 cursor-not-allowed">
                <Video className="w-4 h-4 mr-1" />Video Call
                <Badge variant="secondary" className="ml-1 text-xs py-0 px-1">Soon</Badge>
              </Button>
              <Badge variant="outline" className="flex items-center gap-1">
                <Users className="w-3 h-3" /><span>{onlineUsers.length + 1} online</span>
              </Badge>
            </div>
          </div>

          {/* Participants */}
          <div className="flex gap-3 mt-3 flex-wrap">
            {[
              { user: room?.importer, label: 'Importer', color: 'border-primary' },
              { user: room?.exporter, label: 'Exporter', color: 'border-primary' },
              { user: room?.assignedAdmin, label: 'Deal Manager', color: 'border-purple-500' },
            ].filter(p => p.user).map(({ user: u, label, color }) => u && (
              <div key={u.id} className="flex items-center gap-2 p-2 rounded-lg border bg-card" data-testid={`participant-${label.toLowerCase().replace(' ', '-')}`}>
                <Avatar className={`w-9 h-9 border-2 ${color}`}>
                  {u.profilePhoto && <AvatarImage src={u.profilePhoto} alt={label} />}
                  <AvatarFallback className={`text-white text-sm font-medium ${label === 'Deal Manager' ? 'bg-purple-500' : 'bg-primary'}`}>
                    {(u.firstName?.charAt(0) || u.email.charAt(0)).toUpperCase()}
                    {(u.lastName?.charAt(0) || '').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium leading-tight">
                    {u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.finatradesId || u.email}
                  </p>
                  <p className={`text-xs leading-tight ${label === 'Deal Manager' ? 'text-purple-600' : 'text-primary'}`}>{label}</p>
                </div>
              </div>
            ))}
          </div>
        </CardHeader>

        {/* LC Milestone Strip */}
        <LcMilestoneStrip currentStage={room?.lcLifecycleStatus ?? null} isClosed={room?.isClosed ?? false} />

        {/* Stage Status Banner */}
        <StageBanner stage={currentLcStage} userRole={userRole} isClosed={room?.isClosed ?? false} />

        {/* Role-based action buttons */}
        {!room?.isClosed && allowedTransitions.length > 0 && (
          <div className="border-b px-4 py-2 bg-purple-50/50 flex items-center gap-2 flex-wrap" data-testid="action-buttons-bar">
            <span className="text-xs font-medium text-purple-700 mr-1">Your Actions:</span>
            {allowedTransitions.map((t, idx) => (
              <Button key={idx} size="sm"
                variant={t.variant === 'destructive' ? 'destructive' : t.variant === 'success' ? 'default' : 'outline'}
                className={t.variant === 'success' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
                onClick={() => {
                  setLcTargetStage(t.toStage);
                  setLcNotes('');
                  setLcUpdateDialog(true);
                }}
                data-testid={`btn-transition-${t.toStage.toLowerCase().replace(/\s+/g, '-')}`}>
                <ChevronRight className="w-3 h-3 mr-1" />{t.label}
              </Button>
            ))}
          </div>
        )}

        {/* Payment gate banner for importer */}
        {currentLcStage === 'Approved' && userRole === 'importer' && !allDocsApproved && (
          <div className="border-b px-4 py-2 bg-amber-50 flex items-center gap-2 text-amber-700 text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>Some documents still need admin approval before you can trigger payment.</span>
          </div>
        )}

        {/* TABS */}
        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="w-full rounded-none border-b bg-background px-4 h-10 justify-start gap-0 flex-shrink-0">
              <TabsTrigger value="chat" className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-500 data-[state=active]:bg-transparent px-4" data-testid="tab-chat">
                <MessageCircle className="w-4 h-4 mr-2" />Chat
              </TabsTrigger>
              <TabsTrigger value="documents" className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-500 data-[state=active]:bg-transparent px-4" data-testid="tab-documents">
                <ClipboardList className="w-4 h-4 mr-2" />Documents
                {documents.filter(d => d.status === 'Pending').length > 0 && (
                  <Badge className="ml-1 bg-amber-500 text-white text-xs py-0 px-1">{documents.filter(d => d.status === 'Pending').length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="timeline" className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-500 data-[state=active]:bg-transparent px-4" data-testid="tab-timeline">
                <Clock className="w-4 h-4 mr-2" />Timeline
              </TabsTrigger>
              <TabsTrigger value="discrepancies" className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-500 data-[state=active]:bg-transparent px-4" data-testid="tab-discrepancies">
                <Flag className="w-4 h-4 mr-2" />Discrepancies
                {openDiscrepancies.length > 0 && (
                  <Badge className="ml-1 bg-red-500 text-white text-xs py-0 px-1">{openDiscrepancies.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="risk" className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-500 data-[state=active]:bg-transparent px-4" data-testid="tab-risk">
                <ShieldAlert className="w-4 h-4 mr-2" />Risk
              </TabsTrigger>
            </TabsList>

            {/* Chat Tab */}
            <TabsContent value="chat" className="flex-1 flex flex-col overflow-hidden m-0 data-[state=inactive]:hidden" data-testid="tab-content-chat">
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center text-muted-foreground py-12">
                      <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isOwn = msg.senderUserId === user?.id;
                      return (
                        <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`} data-testid={`message-${msg.id}`}>
                          <div className={`flex gap-2 max-w-[80%] ${isOwn ? 'flex-row-reverse' : ''}`}>
                            <Avatar className="w-8 h-8">
                              <AvatarFallback className={`text-white text-xs ${getRoleColor(msg.senderRole)}`}>
                                {msg.senderRole.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium">{msg.sender?.finatradesId || msg.senderRole}</span>
                                <Badge variant="outline" className="text-[10px] px-1 py-0">{msg.senderRole}</Badge>
                              </div>
                              <div className={`rounded-lg px-3 py-2 ${isOwn ? 'bg-purple-500 text-white' : 'bg-muted'}`}>
                                {msg.content && <p className="text-sm whitespace-pre-wrap">{msg.content}</p>}
                                {msg.attachmentUrl && (
                                  <a href={msg.attachmentUrl} target="_blank" rel="noopener noreferrer"
                                    className={`flex items-center gap-2 mt-2 p-2 rounded border ${isOwn ? 'border-white/30 hover:bg-white/10' : 'border-border hover:bg-muted/50'}`}>
                                    <FileText className="w-4 h-4" />
                                    <span className="text-xs truncate max-w-[150px]">{msg.attachmentName || 'Attachment'}</span>
                                    <Download className="w-3 h-3 ml-auto" />
                                  </a>
                                )}
                              </div>
                              <div className="flex items-center gap-1 mt-1">
                                <span className="text-[10px] text-muted-foreground">{format(new Date(msg.createdAt), 'HH:mm')}</span>
                                {isOwn && (msg.isRead ? <CheckCheck className="w-3 h-3 text-blue-500" /> : <Check className="w-3 h-3 text-muted-foreground" />)}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  {typingUsers.length > 0 && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="flex gap-1">
                        <span className="animate-bounce">.</span>
                        <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>.</span>
                        <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>.</span>
                      </span>
                      Someone is typing
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
              <Separator />
              {room?.isClosed ? (
                <div className="p-4 bg-muted/50 text-center">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Lock className="w-4 h-4" />
                    <span>This deal room is closed. No new messages can be sent.</span>
                  </div>
                  {room.closureNotes && <p className="text-sm text-muted-foreground mt-2 italic">"{room.closureNotes}"</p>}
                </div>
              ) : !hasAcceptedTerms ? (
                <div className="p-4 text-center">
                  <div className="flex items-center justify-center gap-2 text-amber-600">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Please accept the Terms & Conditions to participate.</span>
                  </div>
                  <Button variant="outline" size="sm" className="mt-2" onClick={() => setShowTermsDialog(true)} data-testid="button-view-terms">
                    View Terms & Conditions
                  </Button>
                </div>
              ) : (
                <div className="p-4">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} data-testid="button-attach-file">
                      <Paperclip className="w-4 h-4" />
                    </Button>
                    <Input value={newMessage} onChange={(e) => { setNewMessage(e.target.value); handleTyping(); }}
                      onKeyPress={handleKeyPress} placeholder="Type a message..." className="flex-1" data-testid="input-message" />
                    <Button onClick={() => sendMessage(newMessage)} disabled={!newMessage.trim() || sending} data-testid="button-send-message">
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents" className="flex-1 overflow-auto m-0 p-4 data-[state=inactive]:hidden" data-testid="tab-content-documents">
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold">Trade Document Checklist</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Required per UCP 600 / ISBP 745 standards</p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {documents.filter(d => ['Approved', 'Verified'].includes(d.status)).length} / {REQUIRED_DOCUMENTS.length} approved
                  </div>
                </div>

                {docsLoading ? (
                  <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                ) : (
                  REQUIRED_DOCUMENTS.map((reqDoc) => {
                    const isWrOrPol = reqDoc.type === 'Warehouse Receipt' || reqDoc.type === 'Proof of Lading';
                    const primaryDoc = getLatestDocByType(reqDoc.type);
                    const status = primaryDoc?.status || 'Missing';
                    const versionHistory = getDocVersionHistory(reqDoc.type);
                    const isVersionExpanded = primaryDoc ? expandedVersions.includes(primaryDoc.id) : false;
                    const canUploadThis = canUpload(reqDoc.responsible) && !room?.isClosed && hasAcceptedTerms;
                    const isApproved = ['Approved', 'Verified'].includes(status);
                    const isRejected = status === 'Rejected';

                    return (
                      <div key={reqDoc.type}
                        className={`border rounded-lg overflow-hidden ${isApproved ? 'border-emerald-200 bg-emerald-50/30' : isRejected ? 'border-red-200 bg-red-50/30' : status === 'Missing' ? 'border-dashed' : ''}`}
                        data-testid={`doc-row-${reqDoc.type.toLowerCase().replace(/[^a-z]/g, '-')}`}>
                        <div className="p-3 flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            isApproved ? 'bg-emerald-100' : isRejected ? 'bg-red-100'
                              : status === 'Missing' ? 'bg-muted' : status === 'Under Review' ? 'bg-amber-100' : 'bg-blue-100'
                          }`}>
                            {reqDoc.type === 'Warehouse Receipt' ? <Warehouse className={`w-4 h-4 ${isApproved ? 'text-emerald-600' : isRejected ? 'text-red-600' : 'text-muted-foreground'}`} />
                              : reqDoc.type === 'Proof of Lading' ? <Ship className={`w-4 h-4 ${isApproved ? 'text-emerald-600' : isRejected ? 'text-red-600' : 'text-muted-foreground'}`} />
                              : isApproved ? <CheckCircle className="w-4 h-4 text-emerald-600" />
                              : isRejected ? <XCircle className="w-4 h-4 text-red-600" />
                              : status === 'Missing' ? <FileText className="w-4 h-4 text-muted-foreground" />
                              : status === 'Under Review' ? <Eye className="w-4 h-4 text-amber-600" />
                              : <Upload className="w-4 h-4 text-blue-600" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">{reqDoc.label}</span>
                              <Badge variant="outline" className="text-[10px] px-1 py-0 text-muted-foreground">{reqDoc.responsibleLabel}</Badge>
                              {isWrOrPol && <Badge variant="outline" className="text-[10px] px-1 py-0 text-purple-600 border-purple-300">Gold-backed</Badge>}
                            </div>
                            {primaryDoc && (
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                {primaryDoc.fileName}
                                {primaryDoc.versionNumber && primaryDoc.versionNumber > 1 ? ` · v${primaryDoc.versionNumber}` : ''}
                                {` · ${format(new Date(primaryDoc.createdAt), 'MMM d, HH:mm')}`}
                              </p>
                            )}
                            {primaryDoc?.verificationNotes && (
                              <p className={`text-xs mt-1 ${isRejected ? 'text-red-600' : 'text-muted-foreground'}`}>
                                {isRejected ? '↳ Rejected: ' : '↳ '}{primaryDoc.verificationNotes}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <DocumentStatusBadge status={status} />
                            {primaryDoc && (
                              <a href={primaryDoc.fileUrl} target="_blank" rel="noopener noreferrer">
                                <Button variant="ghost" size="icon" className="w-7 h-7" data-testid={`btn-view-doc-${primaryDoc.id}`}>
                                  <Download className="w-3.5 h-3.5" />
                                </Button>
                              </a>
                            )}
                            {userRole === 'admin' && primaryDoc && !isApproved && (
                              <Button size="sm" variant="outline" className="text-xs h-7 px-2"
                                onClick={() => { setReviewDocId(primaryDoc.id); setReviewStatus('Approved'); setReviewNotes(''); }}
                                data-testid={`btn-review-doc-${primaryDoc.id}`}>
                                <Eye className="w-3 h-3 mr-1" />Review
                              </Button>
                            )}
                            {canUploadThis && !isWrOrPol && (
                              <Button size="sm"
                                variant={status === 'Missing' ? 'default' : 'outline'}
                                className={`text-xs h-7 px-2 ${status === 'Missing' ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
                                onClick={() => {
                                  setUploadingDocType(reqDoc.type);
                                  setUploadParentId(isRejected && primaryDoc ? primaryDoc.id : null);
                                  checklistFileInputRef.current?.click();
                                }}
                                data-testid={`btn-upload-${reqDoc.type.toLowerCase().replace(/[^a-z]/g, '-')}`}>
                                {status === 'Missing' ? <><Upload className="w-3 h-3 mr-1" />Upload</>
                                  : isRejected ? <><RotateCcw className="w-3 h-3 mr-1" />Re-upload</>
                                  : <><Upload className="w-3 h-3 mr-1" />Update</>}
                              </Button>
                            )}
                            {canUploadThis && isWrOrPol && (
                              <Button size="sm"
                                variant={status === 'Missing' ? 'default' : 'outline'}
                                className={`text-xs h-7 px-2 ${status === 'Missing' ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
                                onClick={() => {
                                  if (reqDoc.type === 'Warehouse Receipt') setShowWrForm(true);
                                  else setShowPolForm(true);
                                }}
                                data-testid={`btn-upload-structured-${reqDoc.type === 'Warehouse Receipt' ? 'wr' : 'pol'}`}>
                                {status === 'Missing' ? <><Upload className="w-3 h-3 mr-1" />Upload WR</>
                                  : isRejected ? <><RotateCcw className="w-3 h-3 mr-1" />Re-upload</>
                                  : <><Upload className="w-3 h-3 mr-1" />Update</>}
                              </Button>
                            )}
                            {versionHistory.length > 1 && (
                              <Button variant="ghost" size="icon" className="w-7 h-7"
                                onClick={() => setExpandedVersions(prev =>
                                  isVersionExpanded ? prev.filter(id => id !== primaryDoc!.id) : [...prev, primaryDoc!.id]
                                )}
                                data-testid={`btn-version-toggle-${primaryDoc!.id}`}>
                                {isVersionExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </Button>
                            )}
                          </div>
                        </div>

                        {isVersionExpanded && versionHistory.length > 1 && (
                          <div className="border-t bg-muted/20 px-4 py-2 space-y-1">
                            <p className="text-xs font-medium text-muted-foreground mb-2">Version History</p>
                            {versionHistory.map(ver => (
                              <div key={ver.id} className="flex items-center gap-3 text-xs">
                                <span className="text-muted-foreground w-6">v{ver.versionNumber ?? 1}</span>
                                <span className="font-medium truncate flex-1">{ver.fileName}</span>
                                <DocumentStatusBadge status={ver.status} />
                                <span className="text-muted-foreground">{format(new Date(ver.createdAt), 'MMM d, HH:mm')}</span>
                                <a href={ver.fileUrl} target="_blank" rel="noopener noreferrer">
                                  <Download className="w-3 h-3 text-primary" />
                                </a>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}

                {/* WR Structured Upload Form */}
                {showWrForm && (
                  <div className="border-2 border-purple-200 rounded-lg p-4 bg-purple-50/30 mt-4" data-testid="wr-upload-form">
                    <div className="flex items-center gap-2 mb-4">
                      <Warehouse className="w-5 h-5 text-purple-600" />
                      <h4 className="font-semibold text-purple-700">Warehouse Receipt — Structured Upload</h4>
                      <Button variant="ghost" size="icon" className="ml-auto w-7 h-7" onClick={() => { setShowWrForm(false); setPendingWrFile(null); }}>
                        <XCircle className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Warehouse Name *</label>
                        <Input placeholder="e.g. Dubai Gold Vault" value={wrForm.warehouseName}
                          onChange={e => setWrForm(f => ({ ...f, warehouseName: e.target.value }))}
                          data-testid="input-wr-warehouse-name" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">WR Number *</label>
                        <Input placeholder="e.g. WR-2025-00123" value={wrForm.wrNumber}
                          onChange={e => setWrForm(f => ({ ...f, wrNumber: e.target.value }))}
                          data-testid="input-wr-number" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Gold Quantity (grams)</label>
                        <Input type="number" placeholder="e.g. 1000.00" value={wrForm.goldQuantityGrams}
                          onChange={e => setWrForm(f => ({ ...f, goldQuantityGrams: e.target.value }))}
                          data-testid="input-wr-gold-grams" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Issuance Date</label>
                        <Input type="date" value={wrForm.issuanceDate}
                          onChange={e => setWrForm(f => ({ ...f, issuanceDate: e.target.value }))}
                          data-testid="input-wr-issuance-date" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Expiry Date</label>
                        <Input type="date" value={wrForm.expiryDate}
                          onChange={e => setWrForm(f => ({ ...f, expiryDate: e.target.value }))}
                          data-testid="input-wr-expiry-date" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">WR Document *</label>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" className="text-xs"
                            onClick={() => wrFileInputRef.current?.click()}
                            data-testid="btn-select-wr-file">
                            <Upload className="w-3 h-3 mr-1" />Select File
                          </Button>
                          {pendingWrFile && <span className="text-xs text-muted-foreground truncate max-w-[120px]">{pendingWrFile.name}</span>}
                        </div>
                      </div>
                    </div>
                    <Button onClick={submitWrUpload} disabled={uploadingWr} className="bg-purple-600 hover:bg-purple-700" data-testid="btn-submit-wr">
                      {uploadingWr ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                      Submit Warehouse Receipt
                    </Button>
                  </div>
                )}

                {/* POL Structured Upload Form */}
                {showPolForm && (
                  <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50/30 mt-4" data-testid="pol-upload-form">
                    <div className="flex items-center gap-2 mb-4">
                      <Ship className="w-5 h-5 text-blue-600" />
                      <h4 className="font-semibold text-blue-700">Proof of Lading — Structured Upload</h4>
                      <Button variant="ghost" size="icon" className="ml-auto w-7 h-7" onClick={() => { setShowPolForm(false); setPendingPolFile(null); }}>
                        <XCircle className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Carrier Name *</label>
                        <Input placeholder="e.g. Maersk Line" value={polForm.carrierName}
                          onChange={e => setPolForm(f => ({ ...f, carrierName: e.target.value }))}
                          data-testid="input-pol-carrier" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">BL/AWB Number *</label>
                        <Input placeholder="e.g. MSKU1234567890" value={polForm.blNumber}
                          onChange={e => setPolForm(f => ({ ...f, blNumber: e.target.value }))}
                          data-testid="input-pol-bl-number" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Port of Loading *</label>
                        <Input placeholder="e.g. Port of Dubai" value={polForm.portOfLoading}
                          onChange={e => setPolForm(f => ({ ...f, portOfLoading: e.target.value }))}
                          data-testid="input-pol-loading-port" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Port of Discharge *</label>
                        <Input placeholder="e.g. Port of Shanghai" value={polForm.portOfDischarge}
                          onChange={e => setPolForm(f => ({ ...f, portOfDischarge: e.target.value }))}
                          data-testid="input-pol-discharge-port" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Estimated Departure</label>
                        <Input type="date" value={polForm.estimatedDeparture}
                          onChange={e => setPolForm(f => ({ ...f, estimatedDeparture: e.target.value }))}
                          data-testid="input-pol-departure" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Estimated Arrival</label>
                        <Input type="date" value={polForm.estimatedArrival}
                          onChange={e => setPolForm(f => ({ ...f, estimatedArrival: e.target.value }))}
                          data-testid="input-pol-arrival" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">POL Document *</label>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" className="text-xs"
                            onClick={() => polFileInputRef.current?.click()}
                            data-testid="btn-select-pol-file">
                            <Upload className="w-3 h-3 mr-1" />Select File
                          </Button>
                          {pendingPolFile && <span className="text-xs text-muted-foreground truncate max-w-[120px]">{pendingPolFile.name}</span>}
                        </div>
                      </div>
                    </div>
                    <Button onClick={submitPolUpload} disabled={uploadingPol} className="bg-blue-600 hover:bg-blue-700" data-testid="btn-submit-pol">
                      {uploadingPol ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                      Submit Proof of Lading
                    </Button>
                  </div>
                )}

                {/* Other (non-checklist) documents */}
                {documents.filter(d => !REQUIRED_DOCUMENTS.find(r => r.type === d.documentType)).length > 0 && (
                  <div className="mt-6">
                    <p className="text-sm font-medium text-muted-foreground mb-3">Other Documents</p>
                    {documents.filter(d => !REQUIRED_DOCUMENTS.find(r => r.type === d.documentType)).map(doc => (
                      <div key={doc.id} className="border rounded-lg p-3 flex items-center gap-3 mb-2">
                        <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium">{doc.documentType}</span>
                          <span className="text-xs text-muted-foreground ml-2">{doc.fileName}</span>
                        </div>
                        <DocumentStatusBadge status={doc.status} />
                        <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="icon" className="w-7 h-7"><Download className="w-3.5 h-3.5" /></Button>
                        </a>
                        {userRole === 'admin' && !['Approved', 'Verified'].includes(doc.status) && (
                          <Button size="sm" variant="outline" className="text-xs h-7 px-2"
                            onClick={() => { setReviewDocId(doc.id); setReviewStatus('Approved'); setReviewNotes(''); }}>
                            <Eye className="w-3 h-3 mr-1" />Review
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Timeline Tab */}
            <TabsContent value="timeline" className="flex-1 overflow-auto m-0 p-4 data-[state=inactive]:hidden" data-testid="tab-content-timeline">
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold">Deal Timeline</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Stage transition history</p>
                  </div>
                </div>

                <div className="p-4 border rounded-lg bg-purple-50 border-purple-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Current LC Stage</p>
                      <p className="font-bold text-purple-700">{currentLcStage}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">Stage {validCurrentIndex + 1} of {LC_STAGES.length}</p>
                  </div>
                </div>

                {milestonesLoading ? (
                  <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                ) : milestones.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No stage transitions recorded yet.</p>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />
                    <div className="space-y-4">
                      {milestones.map((m, i) => {
                        const isLatest = i === milestones.length - 1;
                        const displayName = userDisplayName(m.completedByUser);
                        return (
                          <div key={m.id} className="flex gap-4 relative" data-testid={`milestone-${m.id}`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10 border-2 ${
                              isLatest ? 'bg-purple-500 border-purple-500 text-white' : 'bg-emerald-500 border-emerald-500 text-white'
                            }`}>
                              {isLatest ? <Clock className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                            </div>
                            <div className="flex-1 pb-4">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-sm">{m.milestoneName}</span>
                                {m.completedByRole && (
                                  <Badge variant="outline" className="text-xs capitalize">{m.completedByRole}</Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {format(new Date(m.completedAt), 'MMMM d, yyyy HH:mm')}
                                {m.completedByUser && ` · ${displayName}`}
                              </p>
                              {m.notes && <p className="text-sm text-muted-foreground mt-1 italic">"{m.notes}"</p>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Discrepancies Tab */}
            <TabsContent value="discrepancies" className="flex-1 overflow-auto m-0 p-4 data-[state=inactive]:hidden" data-testid="tab-content-discrepancies">
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold">Discrepancy Management</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Track and resolve document or deal discrepancies</p>
                  </div>
                  {userRole === 'admin' && !room?.isClosed && (
                    <Button size="sm" variant="destructive"
                      onClick={() => { setDiscrepancyDocId('none'); setDiscrepancyReason(''); setDiscrepancyDescription(''); setRaiseDiscrepancyDialog(true); }}
                      data-testid="btn-open-raise-discrepancy">
                      <Flag className="w-4 h-4 mr-1" />Raise Discrepancy
                    </Button>
                  )}
                </div>

                {discrepanciesLoading ? (
                  <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                ) : discrepancies.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 text-emerald-300" />
                    <p className="font-medium">No Discrepancies</p>
                    <p className="text-sm mt-1">All documents appear to be in order.</p>
                  </div>
                ) : (
                  <>
                    {openDiscrepancies.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold text-red-600 mb-3 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />Open ({openDiscrepancies.length})
                        </p>
                        <div className="space-y-3">
                          {openDiscrepancies.map(d => {
                            const relatedDoc = d.documentId ? documents.find(doc => doc.id === d.documentId) : null;
                            return (
                              <div key={d.id} className="border border-red-200 rounded-lg p-4 bg-red-50/30" data-testid={`discrepancy-${d.id}`}>
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">{d.reasonType}</Badge>
                                      {relatedDoc && <span className="text-xs text-muted-foreground">on {relatedDoc.documentType}</span>}
                                    </div>
                                    {d.description && <p className="text-sm mt-2">{d.description}</p>}
                                    <p className="text-xs text-muted-foreground mt-2">Raised: {format(new Date(d.createdAt), 'MMM d, yyyy HH:mm')}</p>
                                    {relatedDoc && (
                                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                                        <a href={relatedDoc.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                                          <Download className="w-3 h-3" />{relatedDoc.fileName}
                                        </a>
                                        {userRole === 'exporter' && relatedDoc.status === 'Rejected' && (
                                          <Button size="sm" variant="outline" className="text-xs h-6 px-2"
                                            onClick={() => { setUploadingDocType(relatedDoc.documentType); setUploadParentId(relatedDoc.id); checklistFileInputRef.current?.click(); }}
                                            data-testid={`btn-reupload-${relatedDoc.id}`}>
                                            <RotateCcw className="w-3 h-3 mr-1" />Re-upload
                                          </Button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  {(userRole === 'admin' || userRole === 'exporter') && (
                                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white flex-shrink-0"
                                      onClick={() => { setResolveDiscrepancyId(d.id); setResolutionNotes(''); }}
                                      data-testid={`btn-resolve-${d.id}`}>
                                      <CheckCircle className="w-3 h-3 mr-1" />Resolve
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {discrepancies.filter(d => d.status === 'resolved').length > 0 && (
                      <div className="mt-6">
                        <p className="text-sm font-semibold text-emerald-600 mb-3 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />Resolved ({discrepancies.filter(d => d.status === 'resolved').length})
                        </p>
                        <div className="space-y-3">
                          {discrepancies.filter(d => d.status === 'resolved').map(d => (
                            <div key={d.id} className="border border-emerald-200 rounded-lg p-4 bg-emerald-50/30 opacity-75" data-testid={`discrepancy-resolved-${d.id}`}>
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">{d.reasonType}</Badge>
                                <CheckCircle className="w-3 h-3 text-emerald-500" />
                                <span className="text-xs text-muted-foreground">Resolved {d.resolvedAt ? format(new Date(d.resolvedAt), 'MMM d, HH:mm') : ''}</span>
                              </div>
                              {d.description && <p className="text-xs text-muted-foreground mt-1">{d.description}</p>}
                              {d.resolutionNotes && <p className="text-xs text-emerald-700 mt-1 italic">Resolution: {d.resolutionNotes}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </TabsContent>

            {/* Risk Tab */}
            <TabsContent value="risk" className="flex-1 overflow-auto m-0 p-4 data-[state=inactive]:hidden" data-testid="tab-content-risk">
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold">Counterparty Risk Assessment</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">AML/KYC risk profile for all deal parties</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={fetchRisk} disabled={riskLoading} data-testid="btn-refresh-risk">
                    {riskLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4 mr-1" />}
                    Refresh
                  </Button>
                </div>

                {riskLoading ? (
                  <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                ) : !importerRisk && !exporterRisk ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <ShieldAlert className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p className="font-medium">Risk data unavailable</p>
                    <p className="text-sm mt-1">Click Refresh to load counterparty risk profiles.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {[
                      { label: 'Importer', data: importerRisk },
                      { label: 'Exporter', data: exporterRisk },
                    ].map(({ label, data }) => data && (
                      <div key={label} className="border rounded-lg p-4" data-testid={`risk-card-${label.toLowerCase()}`}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${label === 'Importer' ? 'bg-blue-100' : 'bg-green-100'}`}>
                              <Shield className={`w-5 h-5 ${label === 'Importer' ? 'text-blue-600' : 'text-green-600'}`} />
                            </div>
                            <div>
                              <p className="font-semibold text-sm">{data.name}</p>
                              <p className="text-xs text-muted-foreground">{label} · {data.email}</p>
                            </div>
                          </div>
                          <RiskBadge level={data.amlRiskLevel} />
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">KYC Status</p>
                            <Badge variant="outline" className={`text-xs ${data.kycStatus === 'Approved' ? 'border-emerald-300 text-emerald-700' : 'border-amber-300 text-amber-700'}`}>
                              {data.kycStatus}
                            </Badge>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Country / Jurisdiction</p>
                            <p className="text-sm font-medium">{data.country}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Sanctions Status</p>
                            <div className="flex items-center gap-1.5">
                              {data.sanctionsStatus === 'Clear' ? (
                                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                              ) : (
                                <ShieldAlert className="w-4 h-4 text-red-500" />
                              )}
                              <span className={`text-sm font-medium ${data.sanctionsStatus === 'Clear' ? 'text-emerald-700' : 'text-red-700'}`}>
                                {data.sanctionsStatus}
                              </span>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Jurisdiction Risk</p>
                            <RiskBadge level={data.jurisdictionRisk} />
                          </div>
                          {data.isPep && (
                            <div className="col-span-2">
                              <Badge className="bg-amber-100 text-amber-700 border-amber-300 text-xs">PEP — Politically Exposed Person</Badge>
                            </div>
                          )}
                          {userRole === 'admin' && data.riskScore !== undefined && (
                            <div className="col-span-2 space-y-1">
                              <p className="text-xs text-muted-foreground">Overall Risk Score (Admin Only)</p>
                              <div className="flex items-center gap-3">
                                <Progress value={data.riskScore} className="flex-1 h-2" />
                                <span className="text-sm font-bold">{data.riskScore}/100</span>
                              </div>
                            </div>
                          )}
                          <div className="col-span-2 space-y-1">
                            <p className="text-xs text-muted-foreground">KYC Completion</p>
                            <div className="flex items-center gap-3">
                              <Progress value={data.kycCompletion} className="flex-1 h-2" />
                              <span className="text-sm font-medium">{data.kycCompletion}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="p-3 bg-muted/30 rounded-lg border">
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5" />
                        Risk data is derived from KYC submissions and AML screening results. Risk scores are visible to admin only.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </>
  );
}
