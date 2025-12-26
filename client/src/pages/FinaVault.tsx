import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useCMSPage } from '@/context/CMSContext';
import { Database, TrendingUp, History, PlusCircle, Bell, Settings, Banknote, Briefcase, Loader2, Lock, Clock, Award, FileText, DollarSign, Package, Shield, Truck, Download, CheckCircle, AlertCircle, XCircle, Box, X, ChevronDown, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import DepositList from '@/components/finavault/DepositList';
import NewDepositForm from '@/components/finavault/NewDepositForm';
import RequestDetails from '@/components/finavault/RequestDetails';
import CashOutForm from '@/components/finavault/CashOutForm';
import VaultActivityList from '@/components/finavault/VaultActivityList';
import CertificatesView from '@/components/finavault/CertificatesView';
import { DepositRequest, DepositRequestStatus } from '@/types/finavault';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocation } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';


export default function FinaVault() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { getContent } = useCMSPage('finavault');
  const [location] = useLocation();
  const queryClient = useQueryClient();
  
  // State
  const [activeTab, setActiveTab] = useState('vault-activity');
  const [selectedRequest, setSelectedRequest] = useState<DepositRequest | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [expandedLedgerRows, setExpandedLedgerRows] = useState<Set<string>>(new Set());

  // Fetch vault deposit requests
  const { data: depositData, isLoading: depositsLoading } = useQuery({
    queryKey: ['vault-deposits', user?.id],
    queryFn: async () => {
      if (!user?.id) return { requests: [] };
      const res = await fetch(`/api/vault/deposits/${user.id}`, { credentials: 'include' });
      if (!res.ok) return { requests: [] };
      return res.json();
    },
    enabled: !!user?.id
  });

  // Fetch vault withdrawal requests
  const { data: withdrawalData } = useQuery({
    queryKey: ['vault-withdrawals', user?.id],
    queryFn: async () => {
      if (!user?.id) return { requests: [] };
      const res = await fetch(`/api/vault/withdrawals/${user.id}`, { credentials: 'include' });
      if (!res.ok) return { requests: [] };
      return res.json();
    },
    enabled: !!user?.id
  });

  // Fetch vault holdings for balance calculation
  const { data: holdingsData } = useQuery({
    queryKey: ['vault-holdings', user?.id],
    queryFn: async () => {
      if (!user?.id) return { holdings: [] };
      const res = await fetch(`/api/vault/${user.id}`, { credentials: 'include' });
      if (!res.ok) return { holdings: [] };
      return res.json();
    },
    enabled: !!user?.id
  });

  // Fetch vault ownership summary (central ledger)
  const { data: ownershipData } = useQuery({
    queryKey: ['vault-ownership', user?.id],
    queryFn: async () => {
      if (!user?.id) return { ownership: null };
      const res = await fetch(`/api/vault/ownership/${user.id}`, { credentials: 'include' });
      if (!res.ok) return { ownership: null };
      return res.json();
    },
    enabled: !!user?.id
  });

  // Fetch vault ledger history
  const { data: ledgerData } = useQuery({
    queryKey: ['vault-ledger', user?.id],
    queryFn: async () => {
      if (!user?.id) return { entries: [] };
      const res = await fetch(`/api/vault/ledger/${user.id}?limit=50`, { credentials: 'include' });
      if (!res.ok) return { entries: [] };
      return res.json();
    },
    enabled: !!user?.id
  });

  // Fetch user transactions for history display
  const { data: transactionsData } = useQuery({
    queryKey: ['user-transactions', user?.id],
    queryFn: async () => {
      if (!user?.id) return { transactions: [] };
      const res = await fetch(`/api/transactions/${user.id}`, { credentials: 'include' });
      if (!res.ok) return { transactions: [] };
      return res.json();
    },
    enabled: !!user?.id
  });

  // Fetch deposit requests (bank transfer deposits)
  const { data: depositRequestsData } = useQuery({
    queryKey: ['deposit-requests', user?.id],
    queryFn: async () => {
      if (!user?.id) return { requests: [] };
      const res = await fetch(`/api/deposit-requests/${user.id}`, { credentials: 'include' });
      if (!res.ok) return { requests: [] };
      return res.json();
    },
    enabled: !!user?.id
  });

  // Fetch FinaBridge wallet data for locked gold display
  const { data: finabridgeData } = useQuery({
    queryKey: ['finabridge-wallet', user?.id],
    queryFn: async () => {
      if (!user?.id) return { wallet: null, holds: [] };
      const [walletRes, holdsRes] = await Promise.all([
        fetch(`/api/finabridge/wallet/${user.id}`, { credentials: 'include' }),
        fetch(`/api/finabridge/settlement-holds/${user.id}`, { credentials: 'include' })
      ]);
      const wallet = walletRes.ok ? (await walletRes.json()).wallet : null;
      const holds = holdsRes.ok ? (await holdsRes.json()).holds : [];
      return { wallet, holds };
    },
    enabled: !!user?.id
  });

  // Fetch wallet for USD balance
  const { data: walletData } = useQuery({
    queryKey: ['wallet', user?.id],
    queryFn: async () => {
      if (!user?.id) return { wallet: null };
      const res = await fetch(`/api/wallet/${user.id}`, { credentials: 'include' });
      if (!res.ok) return { wallet: null };
      return res.json();
    },
    enabled: !!user?.id
  });

  // Fetch BNSL plans for locked gold calculation
  const { data: bnslData } = useQuery({
    queryKey: ['bnsl-plans', user?.id],
    queryFn: async () => {
      if (!user?.id) return { plans: [] };
      const res = await fetch(`/api/bnsl/plans/${user.id}`, { credentials: 'include' });
      if (!res.ok) return { plans: [] };
      return res.json();
    },
    enabled: !!user?.id
  });

  // Fetch user certificates for history display
  const { data: certificatesData } = useQuery({
    queryKey: ['certificates', user?.id],
    queryFn: async () => {
      if (!user?.id) return { certificates: [] };
      const res = await fetch(`/api/certificates/${user.id}`, { credentials: 'include' });
      if (!res.ok) return { certificates: [] };
      return res.json();
    },
    enabled: !!user?.id
  });

  // Fetch current gold price
  const { data: goldPriceData } = useQuery({
    queryKey: ['gold-price'],
    queryFn: async () => {
      const res = await fetch('/api/gold-price');
      if (!res.ok) return { pricePerGram: 85 };
      return res.json();
    }
  });

  // Fetch storage fees for the user
  const { data: storageFeesData } = useQuery({
    queryKey: ['storage-fees', user?.id],
    queryFn: async () => {
      if (!user?.id) return { fees: [] };
      const res = await fetch(`/api/vault/storage-fees/${user.id}`, { credentials: 'include' });
      if (!res.ok) return { fees: [] };
      return res.json();
    },
    enabled: !!user?.id
  });

  // Fetch allocated gold bars for the user
  const { data: goldBarsData } = useQuery({
    queryKey: ['gold-bars', user?.id],
    queryFn: async () => {
      if (!user?.id) return { bars: [] };
      const res = await fetch(`/api/vault/gold-bars/${user.id}`, { credentials: 'include' });
      if (!res.ok) return { bars: [] };
      return res.json();
    },
    enabled: !!user?.id
  });

  // Fetch insurance certificates for the user
  const { data: insuranceData } = useQuery({
    queryKey: ['insurance', user?.id],
    queryFn: async () => {
      if (!user?.id) return { certificates: [] };
      const res = await fetch(`/api/vault/insurance/${user.id}`, { credentials: 'include' });
      if (!res.ok) return { certificates: [] };
      return res.json();
    },
    enabled: !!user?.id
  });

  // Fetch physical delivery requests for the user
  const { data: physicalDeliveriesData } = useQuery({
    queryKey: ['physical-deliveries', user?.id],
    queryFn: async () => {
      if (!user?.id) return { requests: [] };
      const res = await fetch(`/api/vault/physical-deliveries/${user.id}`, { credentials: 'include' });
      if (!res.ok) return { requests: [] };
      return res.json();
    },
    enabled: !!user?.id
  });

  // Transform API deposit requests to match frontend type
  const apiRequests = (depositData?.requests || []).map((req: any) => ({
    id: req.referenceNumber,
    requestId: req.id,
    userId: req.userId,
    vaultLocation: req.vaultLocation,
    depositType: req.depositType,
    totalDeclaredWeightGrams: parseFloat(req.totalDeclaredWeightGrams),
    items: req.items || [],
    deliveryMethod: req.deliveryMethod,
    pickupDetails: req.pickupDetails,
    documents: req.documents || [],
    status: req.status as DepositRequestStatus,
    submittedAt: req.createdAt,
    vaultInternalReference: req.vaultInternalReference,
    rejectionReason: req.rejectionReason,
  }));

  const goldPricePerGram = goldPriceData?.pricePerGram || 85;
  
  // Safe parse function to handle null/undefined values
  const safeParseFloat = (val: any) => {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
  };
  
  // Use ownership summary from central ledger if available, otherwise fallback to individual wallet data
  const ownership = ownershipData?.ownership;
  
  // Get values from central ledger or calculate from individual wallets
  const totalVaultGold = ownership 
    ? safeParseFloat(ownership.totalGoldGrams)
    : (holdingsData?.holdings || []).reduce((sum: number, h: any) => sum + safeParseFloat(h.goldGrams), 0);
  
  const availableGold = ownership 
    ? safeParseFloat(ownership.availableGrams)
    : Math.max(0, totalVaultGold - safeParseFloat(finabridgeData?.wallet?.lockedGoldGrams) - 
        (bnslData?.plans || []).filter((plan: any) => ['Active', 'Pending Activation', 'Maturing'].includes(plan.status))
          .reduce((sum: number, plan: any) => sum + safeParseFloat(plan.goldSoldGrams), 0));
  
  const bnslLockedGrams = ownership 
    ? safeParseFloat(ownership.lockedBnslGrams)
    : (bnslData?.plans || []).filter((plan: any) => ['Active', 'Pending Activation', 'Maturing'].includes(plan.status))
        .reduce((sum: number, plan: any) => sum + safeParseFloat(plan.goldSoldGrams), 0);
  
  const finabridgeLockedGrams = ownership 
    ? safeParseFloat(ownership.reservedTradeGrams)
    : safeParseFloat(finabridgeData?.wallet?.lockedGoldGrams);
  
  // Wallet breakdown from central ledger
  const finaPayGrams = ownership ? safeParseFloat(ownership.finaPayGrams) : 0;
  const bnslAvailableGrams = ownership ? safeParseFloat(ownership.bnslAvailableGrams) : 0;
  const finaBridgeAvailableGrams = ownership ? safeParseFloat(ownership.finaBridgeAvailableGrams) : 0;
  
  // USD balance from wallet
  const usdBalance = safeParseFloat(walletData?.wallet?.usdBalance);
  
  // Calculate total available value in USD (gold value + cash)
  const availableGoldValueUsd = availableGold * goldPricePerGram;
  const totalAvailableUsd = availableGoldValueUsd + usdBalance;
  
  // Total vault value including USD
  const totalVaultValueUsd = (totalVaultGold * goldPricePerGram) + usdBalance;
  
  // Ledger entries for history display - combine ledger entries with transactions
  const ledgerEntries = ledgerData?.entries || [];
  const transactions = transactionsData?.transactions || [];
  const depositRequests = depositRequestsData?.requests || [];
  
  // Convert transactions to ledger-like format for display
  const transactionRecords = transactions.map((tx: any) => ({
    id: tx.id,
    createdAt: tx.createdAt,
    action: tx.type,
    status: tx.status,
    fromWallet: tx.type === 'Receive' || tx.type === 'Deposit' || tx.type === 'Buy' ? 'External' : 'FinaPay',
    toWallet: tx.type === 'Send' || tx.type === 'Withdrawal' || tx.type === 'Sell' ? 'External' : 'FinaPay',
    fromStatus: tx.type === 'Receive' || tx.type === 'Deposit' || tx.type === 'Buy' ? null : 'Available',
    toStatus: tx.type === 'Send' || tx.type === 'Withdrawal' || tx.type === 'Sell' ? null : 'Available',
    goldGrams: tx.amountGold || tx.goldGrams || '0',
    valueUsd: tx.amountUsd || '0',
    balanceAfterGrams: tx.balanceAfterGrams || '0',
    isTransaction: true,
    transactionId: tx.id,
  }));

  // Convert deposit requests (bank deposits) to ledger-like format
  const depositRecords = depositRequests.map((dep: any) => ({
    id: dep.id,
    createdAt: dep.createdAt,
    action: 'Bank Deposit',
    status: dep.status,
    fromWallet: 'Bank Transfer',
    toWallet: 'FinaPay',
    fromStatus: null,
    toStatus: 'Available',
    goldGrams: '0',
    valueUsd: dep.amountUsd || '0',
    balanceAfterGrams: '0',
    isDepositRequest: true,
    referenceNumber: dep.referenceNumber,
  }));

  // Convert certificates to ledger-like format
  // Check if there are FinaBridge transactions to avoid duplicate entries from Trade Release certificates
  const hasFinaBridgeTransactions = transactions.some((tx: any) => tx.sourceModule === 'FinaBridge');
  
  const certificates = certificatesData?.certificates || [];
  const certificateRecords = certificates
    .filter((cert: any) => {
      // Include Physical Storage and Digital Ownership certificates
      if (['Physical Storage', 'Digital Ownership'].includes(cert.type)) return true;
      // Only include Trade Release if there's no corresponding transaction
      if (cert.type === 'Trade Release' && !hasFinaBridgeTransactions) return true;
      return false;
    })
    .map((cert: any) => ({
      id: cert.id,
      createdAt: cert.issuedAt,
      action: cert.type === 'Trade Release' ? 'Trade Release Received' : cert.type,
      status: cert.status === 'Active' ? 'Completed' : cert.status,
      fromWallet: cert.type === 'Trade Release' ? 'FinaBridge Trade' : (cert.type === 'Physical Storage' ? 'Wingold & Metals' : 'Vault Deposit'),
      toWallet: cert.type === 'Trade Release' ? 'FinaBridge Wallet' : 'FinaVault',
      fromStatus: null,
      toStatus: 'Available',
      goldGrams: cert.goldGrams || '0',
      valueUsd: cert.totalValueUsd || '0',
      balanceAfterGrams: '0',
      isCertificate: true,
      certificateNumber: cert.certificateNumber,
      transactionId: cert.transactionId || cert.transaction_id || cert.ledgerTransactionId,
    }));
  
  // Combine all records and sort by date (newest first)
  const allRecords = [...transactionRecords, ...depositRecords, ...certificateRecords].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  
  // Always include certificate records, plus ledger entries or other records
  // Normalize ledger entries to have consistent transactionId field
  const normalizedLedgerEntries = ledgerEntries.map((entry: any) => ({
    ...entry,
    transactionId: entry.transactionId || entry.transaction_id || entry.ledgerTransactionId,
  }));
  
  // Use ledger entries if available, otherwise use transaction/deposit records
  const baseRecords = normalizedLedgerEntries.length > 0 ? normalizedLedgerEntries : [...transactionRecords, ...depositRecords];
  
  // Create a map of certificate number to certificate for deduplication
  const certByNumber = new Map<string, any>();
  for (const cert of certificateRecords) {
    if (cert.certificateNumber) {
      certByNumber.set(cert.certificateNumber, cert);
    }
  }
  
  // All certificates (normalized, from API data)
  const allCertificates = certificateRecords;

  // Group entries: main transaction entries are parents, certificates are children
  // Certificates (Physical Storage, Digital Ownership) should ONLY appear as children, never as top-level
  const groupedRecords = React.useMemo(() => {
    const isCertEntry = (e: any) => 
      e.isCertificate || e.action === 'Physical Storage' || e.action === 'Digital Ownership';
    
    // Filter out certificate entries from base records - they will be added as children
    const nonCertBaseRecords = baseRecords.filter((r: any) => !isCertEntry(r));
    
    // Build a map of transactionId -> certificates (deduplicated by certificateNumber + transactionId)
    const certsByTxId = new Map<string, any[]>();
    const seenCertKeys = new Set<string>();
    
    // Helper to add certificate with deduplication
    const addCert = (txId: string, cert: any) => {
      // Prefer certificateNumber for deduplication, fall back to id
      const dedupeKey = cert.certificateNumber || cert.id;
      const certKey = `${dedupeKey}-${txId}`;
      if (seenCertKeys.has(certKey)) return;
      seenCertKeys.add(certKey);
      
      if (!certsByTxId.has(txId)) {
        certsByTxId.set(txId, []);
      }
      certsByTxId.get(txId)!.push(cert);
    };
    
    // Collect certificates from base records first (ledger feed is authoritative)
    for (const record of baseRecords) {
      if (isCertEntry(record) && record.transactionId) {
        addCert(record.transactionId, record);
      }
    }
    
    // Then add from API data (only if not already present)
    for (const cert of allCertificates) {
      const txId = cert.transactionId;
      if (txId) {
        addCert(txId, cert);
      }
    }
    
    const groups: { parent: any; children: any[] }[] = [];
    const usedTxIds = new Set<string>();
    
    // Create groups from non-certificate records
    for (const record of nonCertBaseRecords) {
      const txId = record.transactionId;
      const children = txId ? (certsByTxId.get(txId) || []) : [];
      if (txId) usedTxIds.add(txId);
      groups.push({
        parent: record,
        children
      });
    }
    
    // Handle certificate-only groups (no parent transaction) - create descriptive parent
    for (const [txId, certs] of Array.from(certsByTxId.entries())) {
      if (!usedTxIds.has(txId) && certs.length > 0) {
        // Create a descriptive parent for orphaned certificates using transactionId metadata
        const firstCert = certs[0];
        const totalGold = certs.reduce((sum: number, c: any) => sum + safeParseFloat(c.goldGrams), 0);
        const totalValue = certs.reduce((sum: number, c: any) => sum + safeParseFloat(c.valueUsd), 0);
        
        // Determine action label based on certificate types present
        const hasPhysical = certs.some((c: any) => c.action === 'Physical Storage');
        const hasDigital = certs.some((c: any) => c.action === 'Digital Ownership');
        let actionLabel = 'Vault Deposit';
        if (hasPhysical && hasDigital) actionLabel = 'Vault Deposit';
        else if (hasPhysical) actionLabel = 'Physical Storage Deposit';
        else if (hasDigital) actionLabel = 'Digital Storage Deposit';
        
        groups.push({
          parent: {
            id: `synthetic-${txId}`,
            createdAt: firstCert.createdAt,
            action: actionLabel,
            status: 'Completed',
            fromWallet: 'Vault Deposit',
            toWallet: 'FinaVault',
            goldGrams: totalGold.toString(),
            valueUsd: totalValue.toString(),
            transactionId: txId,
            isSynthetic: true,
          },
          children: certs
        });
      }
    }
    
    // Sort groups by parent date (newest first)
    return groups.sort((a, b) => 
      new Date(b.parent.createdAt).getTime() - new Date(a.parent.createdAt).getTime()
    );
  }, [baseRecords, allCertificates]);

  // Toggle expand/collapse for ledger rows
  const toggleLedgerRow = (id: string) => {
    setExpandedLedgerRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const [highlightSection, setHighlightSection] = useState(false);
  
  // Check query params for initial tab and highlight
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const tabParam = searchParams.get('tab');
    const highlight = searchParams.get('highlight');
    
    if (tabParam === 'new-request') {
      setActiveTab('new-request');
    }
    
    if (highlight === 'deposit') {
      setHighlightSection(true);
      setTimeout(() => {
        const depositSection = document.getElementById('finavault-deposit-section');
        if (depositSection) {
          depositSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
      setTimeout(() => setHighlightSection(false), 1500);
      window.history.replaceState({}, '', '/finavault?tab=new-request');
    }
  }, [location]);

  // Handlers
  const handleNewRequest = async (data: Omit<DepositRequest, 'id' | 'status' | 'submittedAt'>) => {
    if (!user) return;
    setSubmitting(true);
    
    try {
      const res = await apiRequest('POST', '/api/vault/deposit', {
        userId: user.id,
        vaultLocation: data.vaultLocation,
        depositType: data.depositType,
        totalDeclaredWeightGrams: data.totalDeclaredWeightGrams,
        items: data.items,
        deliveryMethod: data.deliveryMethod,
        pickupDetails: data.pickupDetails,
        documents: data.documents,
      });
      
      const result = await res.json();
      
      queryClient.invalidateQueries({ queryKey: ['vault-deposits'] });
      setActiveTab('vault-activity');
      
      toast({
        title: "Request Submitted",
        description: `Deposit request #${result.request.referenceNumber} created. Your FinaPay gold balance will be credited once the physical metal is received and verified at the vault.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit deposit request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRequest = async (id: string) => {
    toast({
      title: "Request Cancellation",
      description: "Please contact support to cancel your deposit request.",
    });
  };

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-purple-100 rounded-lg border border-purple-200 text-primary">
                <Database className="w-6 h-6" />
             </div>
             <h1 className="text-2xl font-bold text-foreground" data-testid="text-finavault-title">
               {getContent('hero', 'title', 'FinaVault')} — <span className="text-muted-foreground font-normal">Gold Deposit</span>
             </h1>
          </div>
          
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-full">
               <Bell className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-full">
               <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>
        
        {/* FinaVault Wallet Card */}
        <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Database className="w-5 h-5 text-fuchsia-600" />
              </div>
              <h2 className="text-lg font-bold text-foreground">FinaVault Wallet</h2>
            </div>
            <Button size="sm" className="bg-purple-500 hover:bg-fuchsia-600 text-white" onClick={() => setActiveTab('new-request')}>
              <Database className="w-4 h-4 mr-2" />
              Deposit Gold
            </Button>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Available Balance */}
            <div className="relative p-5 rounded-xl border border-border bg-gradient-to-br from-white to-gray-50 overflow-hidden" data-testid="card-available-balance">
              <div className="absolute right-2 bottom-2 opacity-5">
                <Database className="w-20 h-20 text-green-500" />
              </div>
              <div className="relative z-10">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Available Balance</p>
                <p className="text-3xl font-bold text-green-600 mb-1">
                  ${availableGoldValueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-sm text-green-600/70">
                  {availableGold.toFixed(4)}g Gold
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Available for withdrawal or transfer.
                </p>
              </div>
            </div>

            {/* Locked in BNSL */}
            <div className="relative p-5 rounded-xl border border-border bg-gradient-to-br from-white to-gray-50 overflow-hidden" data-testid="card-bnsl-locked">
              <div className="absolute right-2 bottom-2 opacity-5">
                <Clock className="w-20 h-20 text-purple-500" />
              </div>
              <div className="relative z-10">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Locked in BNSL</p>
                <p className="text-3xl font-bold text-purple-600 mb-1">
                  ${(bnslLockedGrams * goldPricePerGram).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-sm text-purple-600/70">
                  {bnslLockedGrams.toFixed(3)} g
                </p>
                <p className="text-xs text-muted-foreground mt-3">
                  <Clock className="w-3 h-3 inline mr-1" />
                  Gold in Buy Now Sell Later plans.
                </p>
              </div>
            </div>

            {/* Locked in Trade Finance */}
            <div className="relative p-5 rounded-xl border border-border bg-gradient-to-br from-white to-gray-50 overflow-hidden" data-testid="card-trade-locked">
              <div className="absolute right-2 bottom-2 opacity-5">
                <Briefcase className="w-20 h-20 text-purple-500" />
              </div>
              <div className="relative z-10">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Locked in Trades</p>
                <p className="text-3xl font-bold text-purple-500 mb-1">
                  ${(finabridgeLockedGrams * goldPricePerGram).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-sm text-purple-500/70">
                  {finabridgeLockedGrams.toFixed(3)} g
                </p>
                <p className="text-xs text-muted-foreground mt-3">
                  <Briefcase className="w-3 h-3 inline mr-1" />
                  Gold secured in trade finance.
                </p>
              </div>
            </div>

            {/* Total Value */}
            <div className="relative p-5 rounded-xl border border-border bg-gradient-to-br from-white to-gray-50 overflow-hidden" data-testid="card-total-value">
              <div className="absolute right-2 bottom-2 opacity-5">
                <TrendingUp className="w-20 h-20 text-purple-500" />
              </div>
              <div className="relative z-10">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Total Vault Value</p>
                <p className="text-3xl font-bold text-foreground mb-1">
                  ${(totalVaultGold * goldPricePerGram).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {totalVaultGold.toFixed(4)}g Gold
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Main Content */}
        <AnimatePresence mode="wait">
          {selectedRequest ? (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <RequestDetails 
                request={selectedRequest} 
                onClose={() => setSelectedRequest(null)}
                onCancel={handleCancelRequest}
              />
            </motion.div>
          ) : (
            <motion.div
              key="tabs"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-muted border border-border p-1 mb-8 w-full md:w-auto flex flex-wrap">
                  <TabsTrigger 
                    value="vault-activity"
                    className="flex-1 md:flex-none data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md"
                    data-testid="tab-vault-activity"
                  >
                    <History className="w-4 h-4 mr-2" />
                    Vault Activity
                  </TabsTrigger>
                  <TabsTrigger 
                    value="new-request"
                    className="flex-1 md:flex-none data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md"
                  >
                    <PlusCircle className="w-4 h-4 mr-2" />
                    New Deposit
                  </TabsTrigger>
                  <TabsTrigger 
                    value="cash-out"
                    className="flex-1 md:flex-none data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md"
                  >
                    <Banknote className="w-4 h-4 mr-2" />
                    Cash Out
                  </TabsTrigger>
                  <TabsTrigger 
                    value="ownership-ledger"
                    className="flex-1 md:flex-none data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md"
                    data-testid="tab-ownership-ledger"
                  >
                    <Lock className="w-4 h-4 mr-2" />
                    Ownership Ledger
                  </TabsTrigger>
                  <TabsTrigger 
                    value="certificates"
                    className="flex-1 md:flex-none data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md"
                    data-testid="tab-certificates"
                  >
                    <Award className="w-4 h-4 mr-2" />
                    Certificates
                  </TabsTrigger>
                  <TabsTrigger 
                    value="storage-fees"
                    className="flex-1 md:flex-none data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md"
                    data-testid="tab-storage-fees"
                  >
                    <DollarSign className="w-4 h-4 mr-2" />
                    Storage Fees
                  </TabsTrigger>
                  <TabsTrigger 
                    value="gold-bars"
                    className="flex-1 md:flex-none data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md"
                    data-testid="tab-gold-bars"
                  >
                    <Package className="w-4 h-4 mr-2" />
                    My Gold Bars
                  </TabsTrigger>
                  <TabsTrigger 
                    value="deliveries"
                    className="flex-1 md:flex-none data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md"
                    data-testid="tab-deliveries"
                  >
                    <Truck className="w-4 h-4 mr-2" />
                    Deliveries
                  </TabsTrigger>
                  <TabsTrigger 
                    value="insurance"
                    className="flex-1 md:flex-none data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md"
                    data-testid="tab-insurance"
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Insurance
                  </TabsTrigger>
                  <TabsTrigger 
                    value="terms"
                    className="flex-1 md:flex-none data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md"
                    data-testid="tab-terms"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Terms & Conditions
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="vault-activity" className="mt-0">
                  <VaultActivityList />
                </TabsContent>

                <TabsContent value="new-request" id="finavault-deposit-section" className={`transition-all duration-500 ${highlightSection ? 'ring-2 ring-primary ring-offset-2 rounded-lg bg-purple-50' : ''}`}>
                  <NewDepositForm 
                    onSubmit={handleNewRequest}
                    onCancel={() => setActiveTab('vault-activity')}
                  />
                </TabsContent>

                <TabsContent value="cash-out">
                  <CashOutForm vaultBalance={totalVaultGold} />
                </TabsContent>

                <TabsContent value="ownership-ledger" className="mt-0">
                  <div className="space-y-6">
                    {/* Wallet Breakdown */}
                    <Card className="bg-white border">
                      <CardHeader className="border-b">
                        <CardTitle className="text-lg">Wallet Breakdown</CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="p-4 rounded-lg bg-gray-50 border">
                            <p className="text-xs font-medium text-muted-foreground uppercase mb-1">FinaPay Wallet</p>
                            <p className="text-xl font-bold">{finaPayGrams.toFixed(4)} g</p>
                            <p className="text-sm text-muted-foreground">${(finaPayGrams * goldPricePerGram).toFixed(2)}</p>
                          </div>
                          <div className="p-4 rounded-lg bg-gray-50 border">
                            <p className="text-xs font-medium text-muted-foreground uppercase mb-1">BNSL Wallet</p>
                            <p className="text-xl font-bold">{(bnslAvailableGrams + bnslLockedGrams).toFixed(4)} g</p>
                            <p className="text-sm text-muted-foreground">
                              {bnslAvailableGrams.toFixed(4)} g available, {bnslLockedGrams.toFixed(4)} g locked
                            </p>
                          </div>
                          <div className="p-4 rounded-lg bg-gray-50 border">
                            <p className="text-xs font-medium text-muted-foreground uppercase mb-1">FinaBridge Wallet</p>
                            <p className="text-xl font-bold">{(finaBridgeAvailableGrams + finabridgeLockedGrams).toFixed(4)} g</p>
                            <p className="text-sm text-muted-foreground">
                              {finaBridgeAvailableGrams.toFixed(4)} g available, {finabridgeLockedGrams.toFixed(4)} g reserved
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Ledger History */}
                    <Card className="bg-white border">
                      <CardHeader className="border-b">
                        <CardTitle className="text-lg">Ownership Ledger History</CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        {groupedRecords.length === 0 ? (
                          <div className="p-12 text-center">
                            <Lock className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                            <h3 className="text-lg font-bold mb-2">No Transaction Records</h3>
                            <p className="text-muted-foreground">
                              Your transaction history will appear here once you start transacting.
                            </p>
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-gray-50 border-b">
                                <tr>
                                  <th className="text-left p-4 font-medium w-8"></th>
                                  <th className="text-left p-4 font-medium">Date</th>
                                  <th className="text-left p-4 font-medium">Ref ID</th>
                                  <th className="text-left p-4 font-medium">Action</th>
                                  <th className="text-left p-4 font-medium">Status</th>
                                  <th className="text-left p-4 font-medium">From</th>
                                  <th className="text-left p-4 font-medium">To</th>
                                  <th className="text-right p-4 font-medium">Gold (g)</th>
                                  <th className="text-right p-4 font-medium">Value</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y">
                                {groupedRecords.map((group) => {
                                  const entry = group.parent;
                                  const hasChildren = group.children.length > 0;
                                  const isExpanded = expandedLedgerRows.has(entry.id);
                                  
                                  return (
                                    <React.Fragment key={entry.id}>
                                      {/* Parent Row */}
                                      <tr 
                                        className={`hover:bg-gray-50 ${hasChildren ? 'cursor-pointer' : ''}`}
                                        onClick={() => hasChildren && toggleLedgerRow(entry.id)}
                                      >
                                        <td className="p-4 w-8">
                                          {hasChildren && (
                                            <span className="text-muted-foreground">
                                              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                            </span>
                                          )}
                                        </td>
                                        <td className="p-4 text-muted-foreground">
                                          {new Date(entry.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="p-4">
                                          <span className="font-mono text-xs text-muted-foreground bg-gray-100 px-2 py-1 rounded">
                                            {entry.transactionId 
                                              ? entry.transactionId.substring(0, 8).toUpperCase()
                                              : entry.certificateId 
                                              ? entry.certificateId.substring(0, 8).toUpperCase()
                                              : entry.id.substring(0, 8).toUpperCase()}
                                          </span>
                                        </td>
                                        <td className="p-4">
                                          <div className="flex items-center gap-2">
                                            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                              entry.action === 'Buy' || entry.action?.includes('Deposit') || entry.action?.includes('Receive') || entry.action?.includes('Credit') 
                                                ? 'bg-green-100 text-green-700'
                                                : entry.action?.includes('Lock') || entry.action?.includes('Reserve')
                                                ? 'bg-purple-100 text-purple-700'
                                                : entry.action === 'Sell' || entry.action?.includes('Withdrawal') || entry.action?.includes('Send') || entry.action?.includes('Fee')
                                                ? 'bg-red-100 text-red-700'
                                                : 'bg-blue-100 text-blue-700'
                                            }`}>
                                              {entry.action === 'Buy' ? 'Add Funds' : (entry.action || '').replace(/_/g, ' ')}
                                            </span>
                                            {hasChildren && (
                                              <span className="text-xs text-muted-foreground bg-gray-200 px-1.5 py-0.5 rounded">
                                                +{group.children.length}
                                              </span>
                                            )}
                                          </div>
                                        </td>
                                        <td className="p-4">
                                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                            entry.status === 'Completed' ? 'bg-green-100 text-green-700'
                                            : entry.status === 'Pending' ? 'bg-yellow-100 text-yellow-700'
                                            : entry.status === 'Processing' ? 'bg-blue-100 text-blue-700'
                                            : entry.status === 'Failed' || entry.status === 'Cancelled' ? 'bg-red-100 text-red-700'
                                            : 'bg-gray-100 text-gray-700'
                                          }`}>
                                            {entry.status || 'Recorded'}
                                          </span>
                                        </td>
                                        <td className="p-4">
                                          {entry.fromWallet && (
                                            <span className="text-muted-foreground">
                                              {entry.fromWallet}
                                            </span>
                                          )}
                                        </td>
                                        <td className="p-4">
                                          {entry.toWallet && (
                                            <span className="text-muted-foreground">
                                              {entry.toWallet}
                                            </span>
                                          )}
                                        </td>
                                        <td className="p-4 text-right font-medium">
                                          {safeParseFloat(entry.goldGrams).toFixed(4)}
                                        </td>
                                        <td className="p-4 text-right text-muted-foreground">
                                          {entry.valueUsd ? `$${safeParseFloat(entry.valueUsd).toFixed(2)}` : '-'}
                                        </td>
                                      </tr>
                                      
                                      {/* Child Rows (Certificates) - shown when expanded */}
                                      {isExpanded && group.children.map((child: any) => (
                                        <tr key={child.id} className="bg-gray-50/50 border-l-4 border-l-primary/20">
                                          <td className="p-4 w-8"></td>
                                          <td className="p-4 text-muted-foreground text-xs">
                                            {new Date(child.createdAt).toLocaleDateString()}
                                          </td>
                                          <td className="p-4">
                                            <span className="font-mono text-xs text-muted-foreground bg-gray-100 px-2 py-1 rounded">
                                              {child.certificateNumber 
                                                ? child.certificateNumber.substring(0, 8).toUpperCase()
                                                : child.id.substring(0, 8).toUpperCase()}
                                            </span>
                                          </td>
                                          <td className="p-4">
                                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-600">
                                              {child.action?.replace(/_/g, ' ')}
                                            </span>
                                          </td>
                                          <td className="p-4">
                                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-50 text-green-600">
                                              {child.status}
                                            </span>
                                          </td>
                                          <td className="p-4 text-muted-foreground text-xs">
                                            {child.fromWallet}
                                          </td>
                                          <td className="p-4 text-muted-foreground text-xs">
                                            {child.toWallet}
                                          </td>
                                          <td className="p-4 text-right text-xs text-muted-foreground">
                                            {safeParseFloat(child.goldGrams).toFixed(4)}
                                          </td>
                                          <td className="p-4 text-right text-xs text-muted-foreground">
                                            {child.valueUsd ? `$${safeParseFloat(child.valueUsd).toFixed(2)}` : '-'}
                                          </td>
                                        </tr>
                                      ))}
                                    </React.Fragment>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="certificates" className="mt-0">
                  <CertificatesView />
                </TabsContent>

                {/* Storage Fees Tab */}
                <TabsContent value="storage-fees" className="mt-0 space-y-6">
                  {/* Storage Fees Summary Cards */}
                  {(() => {
                    const fees = storageFeesData?.fees || [];
                    const totalPaid = fees.filter((f: any) => f.status === 'Paid').reduce((sum: number, f: any) => sum + parseFloat(f.feeAmountUsd || 0), 0);
                    const pendingFees = fees.filter((f: any) => f.status === 'Pending').reduce((sum: number, f: any) => sum + parseFloat(f.feeAmountUsd || 0), 0);
                    const currentRate = fees.length > 0 ? parseFloat(fees[0]?.feeRatePercent || 0) : 0.5;
                    
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-800">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                                <CheckCircle className="w-5 h-5 text-green-600" />
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Fees Paid</p>
                                <p className="text-xl font-bold text-green-700 dark:text-green-400">${totalPaid.toFixed(2)}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        
                        <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 border-amber-200 dark:border-amber-800">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                                <Clock className="w-5 h-5 text-amber-600" />
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wider">Pending Fees</p>
                                <p className="text-xl font-bold text-amber-700 dark:text-amber-400">${pendingFees.toFixed(2)}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        
                        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/30 border-purple-200 dark:border-purple-800">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                                <DollarSign className="w-5 h-5 text-purple-600" />
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wider">Current Annual Rate</p>
                                <p className="text-xl font-bold text-purple-700 dark:text-purple-400">{currentRate.toFixed(2)}%</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    );
                  })()}
                  
                  <Card className="bg-white dark:bg-card border">
                    <CardHeader className="border-b">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-primary" />
                        Storage Fee History
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">View your vault storage fees and payment history</p>
                    </CardHeader>
                    <CardContent className="p-0">
                      {(storageFeesData?.fees || []).length === 0 ? (
                        <div className="p-12 text-center">
                          <DollarSign className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                          <h3 className="text-lg font-bold mb-2">No Storage Fees Yet</h3>
                          <p className="text-muted-foreground">
                            Storage fees are calculated monthly based on your vault holdings. You'll see your fee history here once fees are applied.
                          </p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b">
                              <tr>
                                <th className="text-left p-4 font-medium">Billing Period</th>
                                <th className="text-left p-4 font-medium">Gold Balance</th>
                                <th className="text-left p-4 font-medium">Fee Rate</th>
                                <th className="text-right p-4 font-medium">Fee Amount</th>
                                <th className="text-center p-4 font-medium">Status</th>
                                <th className="text-left p-4 font-medium">Paid Date</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {(storageFeesData?.fees || []).map((fee: any) => (
                                <tr key={fee.id} className="hover:bg-gray-50">
                                  <td className="p-4">
                                    {new Date(fee.billingPeriodStart).toLocaleDateString()} - {new Date(fee.billingPeriodEnd).toLocaleDateString()}
                                  </td>
                                  <td className="p-4 font-medium">
                                    {parseFloat(fee.goldGramsAtBilling || 0).toFixed(4)} g
                                  </td>
                                  <td className="p-4 text-muted-foreground">
                                    {parseFloat(fee.feeRatePercent || 0).toFixed(2)}% annual
                                  </td>
                                  <td className="p-4 text-right font-bold">
                                    ${parseFloat(fee.feeAmountUsd || 0).toFixed(2)}
                                  </td>
                                  <td className="p-4 text-center">
                                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                      fee.status === 'Paid' ? 'bg-success-muted text-success-muted-foreground' : 
                                      fee.status === 'Pending' ? 'bg-warning-muted text-warning-muted-foreground' : 
                                      'bg-muted text-muted-foreground'
                                    }`}>
                                      {fee.status === 'Paid' && <CheckCircle className="w-3 h-3 mr-1" />}
                                      {fee.status === 'Pending' && <Clock className="w-3 h-3 mr-1" />}
                                      {fee.status}
                                    </span>
                                  </td>
                                  <td className="p-4 text-muted-foreground">
                                    {fee.paidAt ? new Date(fee.paidAt).toLocaleDateString() : '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Gold Bars Tab */}
                <TabsContent value="gold-bars" className="mt-0">
                  <Card className="bg-white border">
                    <CardHeader className="border-b">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Package className="w-5 h-5 text-primary" />
                        My Allocated Gold Bars
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">View details of gold bars allocated to your account</p>
                    </CardHeader>
                    <CardContent className="p-0">
                      {(goldBarsData?.bars || []).length === 0 ? (
                        <div className="p-12 text-center">
                          <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                          <h3 className="text-lg font-bold mb-2">No Gold Bars Allocated</h3>
                          <p className="text-muted-foreground">
                            Once you deposit physical gold into the vault, specific gold bars will be allocated to your account with their serial numbers and details.
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
                          {(goldBarsData?.bars || []).map((bar: any) => (
                            <div key={bar.id} className="p-4 rounded-lg border bg-gradient-to-br from-amber-50 to-yellow-50">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <p className="text-xs text-muted-foreground uppercase">Serial Number</p>
                                  <p className="font-mono font-bold">{bar.serialNumber}</p>
                                </div>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  bar.status === 'Allocated' ? 'bg-green-100 text-green-700' : 
                                  bar.status === 'Available' ? 'bg-blue-100 text-blue-700' : 
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {bar.status}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                  <p className="text-xs text-muted-foreground">Weight</p>
                                  <p className="font-semibold">{parseFloat(bar.weightGrams || 0).toFixed(2)} g</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Purity</p>
                                  <p className="font-semibold">{bar.purity || '999.9'}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Refinery</p>
                                  <p className="font-semibold">{bar.refinery || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Vault Location</p>
                                  <p className="font-semibold">{bar.vaultLocation || 'Dubai'}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Deliveries Tab */}
                <TabsContent value="deliveries" className="mt-0 space-y-6">
                  {/* Delivery Tracking Cards */}
                  {(physicalDeliveriesData?.requests || []).length === 0 ? (
                    <Card className="bg-white dark:bg-card border">
                      <CardContent className="p-12 text-center">
                        <Truck className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                        <h3 className="text-lg font-bold mb-2">No Delivery Requests</h3>
                        <p className="text-muted-foreground">
                          You haven't requested any physical gold deliveries yet. Contact support to request physical delivery of your gold.
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    (physicalDeliveriesData?.requests || []).map((delivery: any) => {
                      const deliverySteps = [
                        { key: 'Pending', label: 'Request Submitted', description: 'Your delivery request has been received', icon: Clock },
                        { key: 'Processing', label: 'Processing', description: 'Preparing your gold for shipment', icon: Box },
                        { key: 'Shipped', label: 'Shipped', description: 'Your gold is on its way', icon: Truck },
                        { key: 'In Transit', label: 'In Transit', description: 'Package is being delivered', icon: Truck },
                        { key: 'Delivered', label: 'Delivered', description: 'Successfully delivered', icon: CheckCircle },
                      ];
                      const statusIndex = deliverySteps.findIndex(s => s.key === delivery.status);
                      const isCancelled = delivery.status === 'Cancelled' || delivery.status === 'Failed';
                      
                      return (
                        <Card key={delivery.id} className="bg-white dark:bg-card border overflow-hidden">
                          <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/30">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div>
                                <CardTitle className="text-lg flex items-center gap-2">
                                  <Truck className="w-5 h-5 text-primary" />
                                  Delivery #{delivery.referenceNumber || delivery.id.substring(0, 8).toUpperCase()}
                                </CardTitle>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {parseFloat(delivery.goldGrams || 0).toFixed(4)}g Gold • {delivery.city}, {delivery.country}
                                </p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium ${
                                  delivery.status === 'Delivered' ? 'bg-success-muted text-success-muted-foreground' : 
                                  delivery.status === 'Shipped' || delivery.status === 'In Transit' ? 'bg-info-muted text-info-muted-foreground' : 
                                  delivery.status === 'Processing' ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300' : 
                                  delivery.status === 'Pending' ? 'bg-warning-muted text-warning-muted-foreground' : 
                                  'bg-error-muted text-error-muted-foreground'
                                }`}>
                                  {delivery.status === 'Delivered' && <CheckCircle className="w-3 h-3 mr-1" />}
                                  {(delivery.status === 'Shipped' || delivery.status === 'In Transit') && <Truck className="w-3 h-3 mr-1" />}
                                  {delivery.status === 'Pending' && <Clock className="w-3 h-3 mr-1" />}
                                  {delivery.status}
                                </span>
                                {delivery.trackingNumber && (
                                  <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                    {delivery.trackingNumber}
                                  </span>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="p-6">
                            {/* Step-by-step visual tracking */}
                            {isCancelled ? (
                              <div className="text-center py-4">
                                <div className="w-12 h-12 rounded-full bg-error-muted mx-auto mb-3 flex items-center justify-center">
                                  <X className="w-6 h-6 text-destructive" />
                                </div>
                                <p className="font-medium text-destructive">Delivery {delivery.status}</p>
                                <p className="text-sm text-muted-foreground">Please contact support for more information</p>
                              </div>
                            ) : (
                              <div className="relative">
                                {/* Progress line */}
                                <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200 dark:bg-gray-700" />
                                <div 
                                  className="absolute top-5 left-0 h-0.5 bg-primary transition-all duration-500" 
                                  style={{ width: `${Math.max(0, (statusIndex / (deliverySteps.length - 1)) * 100)}%` }}
                                />
                                
                                {/* Steps */}
                                <div className="relative flex justify-between">
                                  {deliverySteps.map((step, index) => {
                                    const isComplete = index <= statusIndex;
                                    const isCurrent = index === statusIndex;
                                    const StepIcon = step.icon;
                                    
                                    return (
                                      <div key={step.key} className="flex flex-col items-center text-center w-24">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                                          isComplete ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700 text-muted-foreground'
                                        } ${isCurrent ? 'ring-4 ring-primary/20' : ''}`}>
                                          <StepIcon className="w-5 h-5" />
                                        </div>
                                        <p className={`text-xs font-medium mt-2 ${isComplete ? 'text-foreground' : 'text-muted-foreground'}`}>
                                          {step.label}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground mt-0.5 hidden md:block">
                                          {step.description}
                                        </p>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                            
                            {/* Delivery details */}
                            <div className="mt-6 pt-6 border-t grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Delivery Address</p>
                                <p className="font-medium">{delivery.deliveryAddress}</p>
                                <p className="text-muted-foreground">{delivery.city}, {delivery.country} {delivery.postalCode}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Courier</p>
                                <p className="font-medium">{delivery.courierName || 'To be assigned'}</p>
                                {delivery.estimatedDeliveryDays && (
                                  <p className="text-muted-foreground">Est. {delivery.estimatedDeliveryDays} days</p>
                                )}
                              </div>
                              <div>
                                <p className="text-muted-foreground">Dates</p>
                                <p className="font-medium">Created: {new Date(delivery.createdAt).toLocaleDateString()}</p>
                                {delivery.shippedAt && <p className="text-muted-foreground">Shipped: {new Date(delivery.shippedAt).toLocaleDateString()}</p>}
                                {delivery.deliveredAt && <p className="text-success-muted-foreground font-medium">Delivered: {new Date(delivery.deliveredAt).toLocaleDateString()}</p>}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </TabsContent>

                {/* Insurance Tab */}
                <TabsContent value="insurance" className="mt-0">
                  <Card className="bg-white border">
                    <CardHeader className="border-b">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Shield className="w-5 h-5 text-primary" />
                        Insurance Coverage
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">View your gold insurance certificates and coverage details</p>
                    </CardHeader>
                    <CardContent className="p-6">
                      {(insuranceData?.certificates || []).length === 0 ? (
                        <div className="text-center py-8">
                          <Shield className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                          <h3 className="text-lg font-bold mb-2">Insurance Coverage</h3>
                          <p className="text-muted-foreground max-w-md mx-auto mb-6">
                            All gold stored in FinaVault is covered by comprehensive insurance through our partnership with Wingold and Metals DMCC.
                          </p>
                          <div className="bg-green-50 border border-green-200 rounded-lg p-4 max-w-md mx-auto">
                            <div className="flex items-center gap-2 text-green-700 mb-2">
                              <CheckCircle className="w-5 h-5" />
                              <span className="font-semibold">Your Gold is Insured</span>
                            </div>
                            <p className="text-sm text-green-600">
                              Coverage includes theft, fire, natural disasters, and transit damage. Individual certificates are issued upon request.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {(insuranceData?.certificates || []).map((cert: any) => (
                            <div key={cert.id} className="p-4 rounded-lg border bg-gradient-to-br from-green-50 to-emerald-50">
                              <div className="flex items-start justify-between mb-4">
                                <div>
                                  <p className="text-xs text-muted-foreground uppercase">Certificate Number</p>
                                  <p className="font-mono font-bold">{cert.certificateNumber}</p>
                                </div>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  cert.status === 'Active' ? 'bg-green-100 text-green-700' : 
                                  cert.status === 'Expired' ? 'bg-red-100 text-red-700' : 
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {cert.status}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <p className="text-xs text-muted-foreground">Provider</p>
                                  <p className="font-semibold">{cert.provider || 'Wingold'}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Coverage Amount</p>
                                  <p className="font-semibold">${parseFloat(cert.coverageAmountUsd || 0).toLocaleString()}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Valid From</p>
                                  <p className="font-semibold">{new Date(cert.validFrom).toLocaleDateString()}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Valid Until</p>
                                  <p className="font-semibold">{new Date(cert.validUntil).toLocaleDateString()}</p>
                                </div>
                              </div>
                              <div className="mt-4 flex justify-end">
                                <Button variant="outline" size="sm" className="gap-2">
                                  <Download className="w-4 h-4" />
                                  Download Certificate
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="terms" className="mt-0">
                  <Card className="bg-white border border-border">
                    <CardHeader className="border-b border-border">
                      <CardTitle className="text-xl font-bold text-foreground flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <FileText className="w-5 h-5 text-primary" />
                        </div>
                        Vault Storage & Account Terms & Conditions
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-2">
                        Finatrades Platform – in Partnership with Wingold and Metals DMCC
                      </p>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="prose prose-sm max-w-none space-y-6 text-foreground">
                        
                        <section className="bg-muted/50 p-4 rounded-lg border border-border">
                          <h3 className="text-lg font-semibold mb-3">Preamble</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            These Terms govern the custody, accounting, and management of gold recorded on the Finatrades platform ("Finatrades," "Platform," "we," "us"), operated in partnership with its subsidiary Wingold and Metals DMCC ("Wingold"), which acts as the physical gold custodian and vault operator. By accepting these Terms, the Customer expressly understands and agrees that they are engaging in a gold-backed digital vault ledger and account service (FinaVault) and not a physical gold trading or investment service.
                          </p>
                        </section>

                        <section>
                          <h3 className="text-lg font-semibold mb-3 text-primary">1. Gold Storage, Custody & Ownership</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            The Customer acquires and holds gold through the Finatrades platform, with physical custody and vault operations performed exclusively by Wingold. Legal title to the gold shall at all times remain vested in the Customer, subject to these Terms. Finatrades shall maintain detailed allocated account records within FinaVault, including gold weight, purity, transaction history, and balance statements, representing the Customer's undivided proportional interest in the total pooled gold holdings.
                          </p>
                        </section>

                        <section>
                          <h3 className="text-lg font-semibold mb-3 text-primary">2. Operational Rights & Gold Pooling Mechanism</h3>
                          <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                            <p><strong>2.1</strong> The Customer hereby irrevocably grants Finatrades and Wingold full right, authority, and discretion to hold, pool, allocate, re-allocate, and administratively manage all customer gold within their integrated vaulting, custody, and accounting infrastructure, including recording, settlement, and reconciliation through FinaVault.</p>
                            <p><strong>2.2</strong> Operational use may include, without limitation, internal vault management, settlement of customer gold sale instructions, liquidity balancing, collateral support for internal credit arrangements, financing, leasing, or other lawful commercial or operational activities undertaken by Wingold in its capacity as gold custodian and bullion operator, without affecting the Customer's equivalent gold entitlement.</p>
                            <p><strong>2.3</strong> Finatrades and Wingold shall at all times maintain a book-entry obligation, reflected within FinaVault, recognizing the Customer's entitlement to an equivalent quantity of gold (by weight) and equivalent purity (by fineness). The Customer's rights are strictly limited to gold value and account-based entitlement and do not extend to any claim over specific gold bars, serial numbers, refinery batches, or physical delivery.</p>
                            <p><strong>2.4</strong> The Customer unconditionally waives and releases Finatrades and Wingold from any and all claims arising from the pooling, commingling, reallocation, or internal operational management of customer gold, including any allegation of conversion or misuse, provided that the Customer's equivalent gold balance continues to be accurately recorded within FinaVault.</p>
                            <p><strong>2.5</strong> The gold pooling and operational structure described herein is fundamental to the commercial model, pricing, and functionality of FinaVault. No additional consent shall be required from the Customer for such operational use.</p>
                          </div>
                        </section>

                        <section>
                          <h3 className="text-lg font-semibold mb-3 text-primary">3. Cash-Out, Gold Sale & Settlement (No Physical Gold Withdrawal)</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            The Customer expressly acknowledges and agrees that physical withdrawal or delivery of gold is not available under FinaVault. Any exit, redemption, or realization of value shall occur solely through the sale of gold via the Finatrades platform at prevailing market prices. Upon execution of a sale instruction, the corresponding quantity of gold shall be debited from the Customer's FinaVault balance, and the net cash proceeds, after applicable fees and charges, shall be credited or transferred according to the Customer's instructions.
                          </p>
                        </section>

                        <section>
                          <h3 className="text-lg font-semibold mb-3 text-primary">4. Gold Vaulting, Custodianship & Internal Movement</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            Physical gold corresponding to aggregated customer balances is held under the custody and control of Wingold in approved gold vaults or bonded facilities selected at Wingold's discretion. Internal movement, relocation, rebalancing, or substitution of physical gold may occur at any time for operational, security, liquidity, or commercial reasons. Such activities shall not affect customer gold balances recorded within FinaVault.
                          </p>
                        </section>

                        <section>
                          <h3 className="text-lg font-semibold mb-3 text-primary">5. Statements & Gold Account Records</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            Finatrades shall provide periodic electronic account statements through FinaVault reflecting the Customer's gold balance, transactions, fees, and valuation. The Customer is responsible for reviewing statements and notifying Finatrades of any discrepancies within thirty (30) days of issuance. Failure to do so shall constitute final and binding acceptance of the gold account records.
                          </p>
                        </section>

                        <section>
                          <h3 className="text-lg font-semibold mb-3 text-primary">6. Compliance, AML/CFT & Platform Controls</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            All services relating to gold custody and sale are subject to applicable UAE AML/CFT laws and regulations. The Customer shall provide all required information, documentation, and ongoing updates as requested. Finatrades may, without liability, suspend access to FinaVault, restrict gold transactions, delay cash settlement, or terminate the relationship where any compliance, regulatory, or reputational risk is identified.
                          </p>
                        </section>

                        <section>
                          <h3 className="text-lg font-semibold mb-3 text-primary">7. Gold Storage Fees, Platform Charges & Deductions</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            Fees applicable to gold vault storage, custody, and platform services shall be determined and displayed on the Finatrades platform at the time of selection. By proceeding, the Customer expressly acknowledges, accepts, and agrees to such fees. Fees shall be automatically settled through deduction from the Customer's account, resulting in a proportional reduction of the gold balance recorded in FinaVault, reflecting the value of the fees applied.
                          </p>
                        </section>

                        <section>
                          <h3 className="text-lg font-semibold mb-3 text-primary">8. Liability & Indemnity</h3>
                          <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                            <p><strong>8.1</strong> Wingold's aggregate liability for any and all claims arising out of or relating to these Terms shall be limited strictly to the direct market value of the Stored Gold affected.</p>
                            <p><strong>8.2</strong> In no event shall Wingold be liable for any indirect, incidental, consequential, special, or punitive damages, including loss of profit, opportunity, or market value.</p>
                            <p><strong>8.3</strong> Wingold shall not be liable for any delay, loss, or damage resulting from force majeure events, acts of government or regulators, war, terrorism, inherent vice of the gold, market volatility, or the acts or omissions of any third-party custodian, carrier, or service provider.</p>
                            <p><strong>8.4</strong> The Customer shall fully indemnify and hold Wingold harmless against all claims, liabilities, losses, and expenses arising from the Customer's breach of these Terms or the provision of inaccurate or misleading information.</p>
                          </div>
                        </section>

                        <section className="bg-warning-muted p-4 rounded-lg border border-warning/20">
                          <h3 className="text-lg font-semibold mb-3 text-warning-muted-foreground">9. Risk Disclosure & Customer Acknowledgement</h3>
                          <p className="text-sm text-warning-muted-foreground leading-relaxed mb-3">
                            The Customer expressly acknowledges and accepts that:
                          </p>
                          <ul className="list-disc list-inside space-y-2 text-sm text-warning-muted-foreground">
                            <li>(a) Gold is held within a pooled custodial structure;</li>
                            <li>(b) No physical gold delivery or withdrawal rights exist;</li>
                            <li>(c) Value realization occurs solely through the sale of gold via the Platform;</li>
                            <li>(d) Finatrades relies on Wingold as its gold custodian and bullion operator; and</li>
                            <li>(e) The market value of gold is volatile and subject to fluctuation.</li>
                          </ul>
                        </section>

                        <section>
                          <h3 className="text-lg font-semibold mb-3 text-primary">10. Duration & Termination</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            This Agreement shall remain in effect until terminated. The Customer may terminate by requesting final withdrawal and settling all outstanding fees. Wingold may terminate this Agreement upon thirty (30) days' written notice, or immediately for cause, including fee non-payment or compliance-related concerns.
                          </p>
                        </section>

                        <section className="bg-muted/50 p-4 rounded-lg border border-border">
                          <h3 className="text-lg font-semibold mb-3">11. Governing Law & Jurisdiction</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            These Terms shall be governed by and construed in accordance with the laws of the United Arab Emirates as applied in the Emirate of Dubai. The Courts of the Dubai International Financial Centre (DIFC) shall have exclusive jurisdiction to resolve any dispute arising herefrom.
                          </p>
                        </section>

                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </DashboardLayout>
  );
}
