import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAuth } from '@/context/AuthContext';
import { normalizeStatus as normalizeStatusUtil } from '@/lib/transactionUtils';
import { RefreshCw, Search, TrendingUp, ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Send, Coins, Award, Eye, Printer, Share2, FileText, X, ShieldCheck, Box, Download, ChevronDown, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

interface VaultTransaction {
  id: string;
  type: 'Buy' | 'Sell' | 'Send' | 'Receive' | 'Deposit' | 'Withdrawal' | 'Vault Deposit' | 'Vault Withdrawal' | 'Bank Deposit' | 'Crypto Deposit' | 'Swap';
  status: string;
  amountGold: string | null;
  amountUsd: string | null;
  goldPriceUsdPerGram: string | null;
  recipientEmail: string | null;
  senderEmail: string | null;
  description: string | null;
  referenceId?: string | null;
  createdAt: string;
  completedAt: string | null;
  rejectionReason?: string | null;
  goldWalletType?: 'LGPW' | 'FGPW' | null;
  isExpectedValue?: boolean;
  certificates: {
    id: string;
    certificateNumber: string;
    type: string;
    status: string;
    goldGrams: string;
    goldWalletType?: 'LGPW' | 'FGPW' | null;
    fromGoldWalletType?: 'LGPW' | 'FGPW' | null;
    toGoldWalletType?: 'LGPW' | 'FGPW' | null;
    issuer?: string;
  }[];
}

interface VaultActivityData {
  transactions: VaultTransaction[];
  holdings: any[];
  certificates: any[];
  currentBalance: {
    goldGrams: string;
    usdBalance: string;
  };
}

interface DepositRequest {
  id: string;
  userId: string;
  amountUsd: string;
  goldGrams?: string;
  goldPriceAtRequest?: string;
  paymentMethod: string;
  status: string;
  referenceNumber: string;
  createdAt: string;
  processedAt?: string;
  rejectionReason?: string;
  expectedGoldGrams?: string;
  priceSnapshotUsdPerGram?: string;
  feePercentSnapshot?: string;
}

interface CryptoPaymentRequest {
  id: string;
  userId: string;
  amountUsd: string;
  goldGrams: string;
  goldPriceAtTime: string;
  status: string;
  createdAt: string;
  completedAt?: string;
  rejectionReason?: string;
  networkLabel?: string;
}

interface VaultLedgerEntry {
  id: string;
  userId: string;
  action: string;
  goldGrams: string;
  goldPriceUsdPerGram?: string;
  valueUsd?: string;
  fromWallet?: string;
  toWallet?: string;
  fromStatus?: string;
  toStatus?: string;
  balanceAfterGrams: string;
  transactionId?: string;
  certificateId?: string;
  notes?: string;
  createdAt: string;
  createdBy?: string;
}

export default function VaultActivityList() {
  const { user } = useAuth();
  const [data, setData] = useState<VaultActivityData | null>(null);
  const [depositRequests, setDepositRequests] = useState<DepositRequest[]>([]);
  const [cryptoPaymentRequests, setCryptoPaymentRequests] = useState<CryptoPaymentRequest[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<VaultLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  
  const [selectedTx, setSelectedTx] = useState<VaultTransaction | null>(null);
  const [viewingCerts, setViewingCerts] = useState<{
    id: string;
    certificateNumber: string;
    type: string;
    status: string;
    goldGrams: string;
    goldWalletType?: 'LGPW' | 'FGPW' | null;
    fromGoldWalletType?: 'LGPW' | 'FGPW' | null;
    toGoldWalletType?: 'LGPW' | 'FGPW' | null;
  }[] | null>(null);
  const [certTab, setCertTab] = useState('ownership');

  const handlePrint = () => {
    const printContent = document.getElementById('certificate-print-area');
    if (!printContent) return;
    
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      alert('Please allow pop-ups to print the certificate');
      return;
    }
    
    const isOwnership = certTab === 'ownership';
    const bgColor = isOwnership ? '#0D0515' : '#ffffff';
    const textColor = isOwnership ? '#ffffff' : '#000000';
    const accentColor = isOwnership ? '#D4AF37' : '#000000';
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Certificate - Finatrades</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Inter:wght@400;500;700&display=swap');
            
            * { margin: 0; padding: 0; box-sizing: border-box; }
            
            @page {
              size: A4 portrait;
              margin: 0.5in;
            }
            
            body {
              font-family: 'Inter', sans-serif;
              background: ${bgColor};
              color: ${textColor};
              padding: 40px;
              min-height: 100vh;
            }
            
            .certificate-container {
              max-width: 700px;
              margin: 0 auto;
              border: ${isOwnership ? '8px double rgba(212, 175, 55, 0.3)' : '1px solid rgba(0,0,0,0.2)'};
              padding: 48px;
              position: relative;
            }
            
            .header {
              text-align: center;
              margin-bottom: 48px;
            }
            
            .icon-circle {
              width: 64px;
              height: 64px;
              border-radius: 50%;
              background: ${isOwnership ? 'rgba(212, 175, 55, 0.1)' : '#000'};
              border: 1px solid ${accentColor};
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0 auto 16px;
              color: ${isOwnership ? '#D4AF37' : '#fff'};
              font-size: 24px;
            }
            
            .title {
              font-family: 'Playfair Display', serif;
              font-size: 36px;
              color: ${accentColor};
              text-transform: uppercase;
              letter-spacing: 4px;
              margin-bottom: 8px;
            }
            
            .subtitle {
              font-size: 16px;
              color: ${isOwnership ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.6)'};
              text-transform: uppercase;
              letter-spacing: 3px;
            }
            
            .cert-id {
              font-family: monospace;
              font-size: 12px;
              color: ${isOwnership ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.5)'};
              margin-top: 8px;
            }
            
            .description {
              font-size: 14px;
              line-height: 1.8;
              text-align: center;
              margin-bottom: 32px;
              color: ${isOwnership ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)'};
            }
            
            .details-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 24px;
              border-top: 1px solid ${isOwnership ? 'rgba(212, 175, 55, 0.2)' : 'rgba(0,0,0,0.2)'};
              border-bottom: 1px solid ${isOwnership ? 'rgba(212, 175, 55, 0.2)' : 'rgba(0,0,0,0.2)'};
              padding: 24px 0;
              margin-bottom: 32px;
            }
            
            .detail-item {
              text-align: center;
            }
            
            .detail-label {
              font-size: 10px;
              color: ${accentColor};
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-bottom: 4px;
            }
            
            .detail-value {
              font-size: 18px;
              font-weight: bold;
            }
            
            .footer {
              display: flex;
              justify-content: space-between;
              margin-top: 48px;
              padding-top: 24px;
            }
            
            .footer-item {
              text-align: center;
            }
            
            .footer-label {
              font-size: 10px;
              color: ${accentColor};
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            
            .footer-value {
              font-weight: 500;
              margin-bottom: 8px;
            }
            
            .divider {
              width: 150px;
              height: 1px;
              background: ${isOwnership ? 'rgba(212, 175, 55, 0.4)' : 'rgba(0,0,0,0.4)'};
              margin: 8px auto;
            }
            
            .disclaimer {
              font-size: 9px;
              color: ${isOwnership ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.4)'};
              text-align: justify;
              margin-top: 32px;
              line-height: 1.6;
            }
            
            /* Storage certificate specific */
            .storage-header {
              display: flex;
              justify-content: space-between;
              border-bottom: 2px solid #000;
              padding-bottom: 24px;
              margin-bottom: 24px;
            }
            
            .storage-logo {
              display: flex;
              align-items: center;
              gap: 16px;
            }
            
            .storage-icon {
              width: 64px;
              height: 64px;
              background: #000;
              color: #fff;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 24px;
            }
            
            .storage-title {
              font-size: 20px;
              font-weight: bold;
              text-transform: uppercase;
            }
            
            .storage-subtitle {
              font-size: 11px;
              color: rgba(0,0,0,0.6);
              text-transform: uppercase;
              letter-spacing: 2px;
            }
            
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 24px 0;
            }
            
            th {
              background: #000;
              color: #fff;
              padding: 12px;
              text-align: left;
              font-size: 11px;
              text-transform: uppercase;
            }
            
            td {
              padding: 12px;
              border: 1px solid #000;
            }
            
            .total-row {
              background: rgba(0,0,0,0.05);
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handleShare = async (certs: typeof viewingCerts) => {
    if (!certs || certs.length === 0) return;
    const cert = certs[0];
    const shareText = `Finatrades Gold Certificate\nGold Amount: ${parseFloat(cert.goldGrams).toFixed(4)}g\nCertificate #: ${cert.certificateNumber}\nStatus: ${cert.status}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Gold Certificate`,
          text: shareText,
        });
      } catch (err) {
        navigator.clipboard.writeText(shareText);
        alert('Certificate details copied to clipboard!');
      }
    } else {
      navigator.clipboard.writeText(shareText);
      alert('Certificate details copied to clipboard!');
    }
  };

  const fetchActivity = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch vault activity, bank deposit requests, crypto payment requests, and vault ledger in parallel
      const [vaultResponse, depositResponse, cryptoResponse, ledgerResponse] = await Promise.all([
        fetch(`/api/vault/activity/${user.id}`),
        fetch(`/api/deposit-requests/${user.id}`),
        fetch(`/api/crypto-payments/user/${user.id}`),
        fetch(`/api/vault/ledger/${user.id}?limit=50`)
      ]);
      
      if (vaultResponse.ok) {
        const result = await vaultResponse.json();
        setData(result);
      }
      
      if (depositResponse.ok) {
        const depositResult = await depositResponse.json();
        setDepositRequests(depositResult.requests || []);
      }
      
      if (cryptoResponse.ok) {
        const cryptoResult = await cryptoResponse.json();
        setCryptoPaymentRequests(cryptoResult.requests || []);
      }
      
      if (ledgerResponse.ok) {
        const ledgerResult = await ledgerResponse.json();
        setLedgerEntries(ledgerResult.entries || []);
      }
    } catch (error) {
      console.error('Failed to fetch vault activity:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivity();
  }, [user]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Buy': return <TrendingUp className="w-4 h-4" />;
      case 'Sell': return <ArrowUpRight className="w-4 h-4" />;
      case 'Send': return <Send className="w-4 h-4" />;
      case 'Receive': return <ArrowDownLeft className="w-4 h-4" />;
      case 'Deposit': return <ArrowDownLeft className="w-4 h-4" />;
      case 'Withdrawal': return <ArrowUpRight className="w-4 h-4" />;
      case 'Swap': return <ArrowLeftRight className="w-4 h-4" />;
      case 'Vault Deposit': return <Box className="w-4 h-4" />;
      case 'Vault Withdrawal': return <ArrowUpRight className="w-4 h-4" />;
      case 'Bank Deposit': return <ArrowDownLeft className="w-4 h-4" />;
      case 'Crypto Deposit': return <ArrowDownLeft className="w-4 h-4" />;
      default: return <Coins className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Buy': return 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/50';
      case 'Sell': return 'bg-rose-50 text-rose-600 ring-1 ring-rose-200/50';
      case 'Send': return 'bg-violet-50 text-violet-600 ring-1 ring-violet-200/50';
      case 'Receive': return 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200/50';
      case 'Deposit': return 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/50';
      case 'Withdrawal': return 'bg-fuchsia-50 text-fuchsia-600 ring-1 ring-fuchsia-200/50';
      case 'Swap': return 'bg-amber-50 text-amber-600 ring-1 ring-amber-200/50';
      case 'Vault Deposit': return 'bg-[#D4AF37]/10 text-[#B8860B] ring-1 ring-[#D4AF37]/20';
      case 'Vault Withdrawal': return 'bg-purple-50 text-purple-600 ring-1 ring-purple-200/50';
      case 'Bank Deposit': return 'bg-blue-50 text-blue-600 ring-1 ring-blue-200/50';
      case 'Crypto Deposit': return 'bg-cyan-50 text-cyan-600 ring-1 ring-cyan-200/50';
      default: return 'bg-gray-50 text-gray-600 ring-1 ring-gray-200/50';
    }
  };
  
  const isGoldIncoming = (type: string) => {
    return ['Buy', 'Receive', 'Vault Deposit', 'Deposit', 'Bank Deposit', 'Crypto Deposit'].includes(type);
  };
  
  const isUsdIncoming = (type: string) => {
    return ['Deposit', 'Bank Deposit', 'Crypto Deposit'].includes(type);
  };

  const getStatusBadge = (status: string, rejectionReason?: string | null) => {
    const statusConfig: Record<string, { dot: string; text: string; bg: string; label: string }> = {
      'Completed': { dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100', label: 'Completed' },
      'Pending': { dot: 'bg-amber-400', text: 'text-amber-700', bg: 'bg-amber-50 border-amber-100', label: 'Pending' },
      'Cancelled': { dot: 'bg-red-400', text: 'text-red-700', bg: 'bg-red-50 border-red-100', label: 'Rejected' },
      'Rejected': { dot: 'bg-red-400', text: 'text-red-700', bg: 'bg-red-50 border-red-100', label: 'Rejected' },
    };
    const config = statusConfig[status] || { dot: 'bg-gray-400', text: 'text-gray-600', bg: 'bg-gray-50 border-gray-100', label: status };
    return (
      <div className="flex items-center gap-1.5">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${config.bg} ${config.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
          {config.label}
        </span>
        {rejectionReason && (status === 'Cancelled' || status === 'Rejected') && (
          <span className="text-xs text-red-400 cursor-help" title={rejectionReason}>ⓘ</span>
        )}
      </div>
    );
  };

  // Use original vault activity data which has full metadata (certificates, counterparty emails, etc.)
  // Apply status normalization using shared utilities for consistency
  const rawTransactions = data?.transactions || [];
  const transactions: VaultTransaction[] = rawTransactions.map((tx: any) => {
    const normalizedStatus = normalizeStatusUtil(tx.status);
    return {
      ...tx,
      status: normalizedStatus === 'Failed' ? 'Cancelled' : normalizedStatus,
      isExpectedValue: normalizedStatus !== 'Completed',
    };
  });
  const certificates = data?.certificates || [];
  
  // Check if there are FinaBridge transactions to avoid duplicate entries from Trade Release certificates
  const hasFinaBridgeTransactions = transactions.some((tx: any) => tx.sourceModule === 'FinaBridge');
  
  // Group certificates by transactionId (for purchases) or vaultHoldingId (for physical deposits)
  // Each purchase creates both Digital Ownership and Physical Storage certificates
  const certificatesByTransaction = new Map<string, any[]>();
  certificates.forEach((cert: any) => {
    if (cert.type === 'Digital Ownership' || cert.type === 'Physical Storage') {
      // Use transactionId first, then vaultHoldingId for physical deposits, then cert.id as fallback
      const groupKey = cert.transactionId || (cert.vaultHoldingId ? `vault-${cert.vaultHoldingId}` : cert.id);
      if (!certificatesByTransaction.has(groupKey)) {
        certificatesByTransaction.set(groupKey, []);
      }
      certificatesByTransaction.get(groupKey)!.push(cert);
    } else if (cert.type === 'Trade Release' && !hasFinaBridgeTransactions) {
      // Trade Release certificates are standalone
      certificatesByTransaction.set(cert.id, [cert]);
    }
  });
  
  // Get all transaction IDs from the transactions array to avoid duplicate certificate entries
  const existingTransactionIds = new Set(transactions.map((tx: any) => tx.id));
  
  // Create one Vault Deposit entry per certificate group (combining both cert types)
  // Skip certificates without transactionId that have vaultHoldingId - these are physical deposits
  // that already appear in the transactions array with their certificates attached
  const certificateActivities: VaultTransaction[] = Array.from(certificatesByTransaction.values())
    .filter((certGroup: any[]) => {
      // Skip physical vault deposit certificates (no transactionId, but have vaultHoldingId)
      // These are already shown from the transactions array with certificates attached
      const firstCert = certGroup[0];
      if (!firstCert.transactionId && firstCert.vaultHoldingId) {
        return false;
      }
      // Skip certificates that belong to transactions already in the transactions array
      // This prevents duplicate entries for Send/Receive transactions that have certificates attached
      if (firstCert.transactionId && existingTransactionIds.has(firstCert.transactionId)) {
        return false;
      }
      return true;
    })
    .map((certGroup: any[]) => {
      const ownershipCert = certGroup.find(c => c.type === 'Digital Ownership');
      const storageCert = certGroup.find(c => c.type === 'Physical Storage');
      const primaryCert = ownershipCert || certGroup[0];
      const isTradeRelease = primaryCert.type === 'Trade Release';
      
      return {
        id: primaryCert.id,
        type: isTradeRelease ? 'Receive' as const : 'Vault Deposit' as const,
        status: primaryCert.status === 'Active' ? 'Completed' : primaryCert.status,
        amountGold: primaryCert.goldGrams,
        amountUsd: primaryCert.totalValueUsd,
        goldPriceUsdPerGram: primaryCert.goldPriceUsdPerGram,
        recipientEmail: null,
        senderEmail: null,
        description: isTradeRelease 
          ? `Trade Release - ${primaryCert.certificateNumber}`
          : `Gold Purchase`,
        referenceId: primaryCert.certificateNumber,
        createdAt: primaryCert.issuedAt,
        completedAt: primaryCert.issuedAt,
        certificates: certGroup.map(c => ({
          id: c.id,
          certificateNumber: c.certificateNumber,
          type: c.type,
          status: c.status,
          goldGrams: c.goldGrams,
          issuer: c.issuer,
        })),
      };
    });
  
  // Transactions already have certificates attached from the server response
  // Just use all transactions directly - no filtering needed
  const filteredTxs = transactions;
  
  // Convert bank deposit requests to VaultTransaction format
  // Only show deposits that don't already have a corresponding Buy transaction
  const existingDepositRefs = new Set(
    transactions
      .filter((tx: any) => tx.type === 'Buy' && tx.referenceId?.startsWith('DEP-'))
      .map((tx: any) => tx.referenceId)
  );
  
  const bankDepositActivities: VaultTransaction[] = depositRequests
    .filter(dep => {
      // Exclude confirmed/approved deposits - they have a transaction record with gold data
      if (dep.status === 'Confirmed' || dep.status === 'Approved') return false;
      // Also exclude if there's already a matching transaction
      if (existingDepositRefs.has(dep.referenceNumber)) return false;
      // Exclude Crypto payment method - shown separately as Crypto Deposit from crypto_payment_requests
      if (dep.paymentMethod === 'Crypto') return false;
      return true;
    })
    .map(dep => ({
      id: `deposit-${dep.id}`,
      type: 'Bank Deposit' as const,
      status: dep.status === 'Rejected' ? 'Cancelled' : 'Pending',
      amountGold: dep.expectedGoldGrams || null,
      amountUsd: dep.amountUsd,
      goldPriceUsdPerGram: dep.priceSnapshotUsdPerGram || null,
      recipientEmail: null,
      senderEmail: null,
      description: `Bank Deposit via ${dep.paymentMethod}`,
      referenceId: dep.referenceNumber,
      createdAt: dep.createdAt,
      completedAt: dep.processedAt || null,
      rejectionReason: dep.rejectionReason || null,
      certificates: [],
      isExpectedValue: !!dep.expectedGoldGrams,
    }));
  
  // Convert crypto payment requests to VaultTransaction format
  const cryptoDepositActivities: VaultTransaction[] = cryptoPaymentRequests
    .filter(crypto => {
      // Exclude confirmed/approved - they have a transaction record
      if (crypto.status === 'Confirmed' || crypto.status === 'Approved') return false;
      return true;
    })
    .map(crypto => ({
      id: `crypto-${crypto.id}`,
      type: 'Crypto Deposit' as const,
      status: crypto.status === 'Rejected' ? 'Cancelled' : crypto.status,
      amountGold: crypto.goldGrams,
      amountUsd: crypto.amountUsd,
      goldPriceUsdPerGram: crypto.goldPriceAtTime,
      recipientEmail: null,
      senderEmail: null,
      description: `Crypto Deposit${crypto.networkLabel ? ` via ${crypto.networkLabel}` : ''}`,
      referenceId: null,
      createdAt: crypto.createdAt,
      completedAt: crypto.completedAt || null,
      rejectionReason: crypto.rejectionReason || null,
      certificates: [],
    }));
  
  // Convert vault ledger entries to VaultTransaction format
  // Group entries by transactionId for accordion display (e.g., Vault_Transfer + Deposit for same transaction)
  const ledgerTransactionGroups = new Map<string, VaultLedgerEntry[]>();
  ledgerEntries.forEach(entry => {
    const groupKey = entry.transactionId || entry.id;
    if (!ledgerTransactionGroups.has(groupKey)) {
      ledgerTransactionGroups.set(groupKey, []);
    }
    ledgerTransactionGroups.get(groupKey)!.push(entry);
  });
  
  // Helper to map ledger action to display type
  const mapLedgerActionToType = (action: string): VaultTransaction['type'] => {
    switch (action) {
      case 'Deposit':
      case 'Vault_Transfer':
        return 'Deposit';
      case 'Withdrawal':
        return 'Withdrawal';
      case 'Transfer_Send':
      case 'Gift_Send':
        return 'Send';
      case 'Transfer_Receive':
      case 'Gift_Receive':
        return 'Receive';
      case 'FinaPay_To_BNSL':
      case 'BNSL_To_FinaPay':
      case 'LGPW_To_FGPW':
      case 'FGPW_To_LGPW':
        return 'Swap';
      default:
        return 'Deposit';
    }
  };
  
  // Create transactions from ledger groups
  const ledgerActivities: VaultTransaction[] = Array.from(ledgerTransactionGroups.entries())
    .filter(([groupKey, entries]) => {
      // Skip if we already have a transaction with this ID in other sources
      const firstEntry = entries[0];
      if (firstEntry.transactionId) {
        const existsInTxs = transactions.some(tx => tx.id === firstEntry.transactionId);
        if (existsInTxs) return false;
      }
      // Skip ledger entries that have a transactionId - they were created as part of a processed 
      // unified_tally_transaction and the deposit is already shown via that system
      if (firstEntry.transactionId) {
        return false;
      }
      return true;
    })
    .map(([groupKey, entries]) => {
      // Sort entries: Vault_Transfer first (Step 1: Physical Storage), then Deposit (Step 2: Recorded)
      const sortedEntries = [...entries].sort((a, b) => {
        const priority = (action: string) => {
          if (action === 'Vault_Transfer') return 0;
          if (action === 'Deposit') return 1;
          return 2;
        };
        return priority(a.action) - priority(b.action);
      });
      
      const primaryEntry = sortedEntries[0];
      const depositEntry = sortedEntries.find(e => e.action === 'Deposit') || primaryEntry;
      const totalGold = parseFloat(depositEntry.goldGrams);
      const pricePerGram = depositEntry.goldPriceUsdPerGram ? parseFloat(depositEntry.goldPriceUsdPerGram) : null;
      const valueUsd = depositEntry.valueUsd ? parseFloat(depositEntry.valueUsd) : (pricePerGram ? totalGold * pricePerGram : null);
      
      return {
        id: `ledger-${groupKey}`,
        type: mapLedgerActionToType(depositEntry.action),
        status: 'Completed',
        amountGold: depositEntry.goldGrams,
        amountUsd: valueUsd?.toFixed(2) || null,
        goldPriceUsdPerGram: depositEntry.goldPriceUsdPerGram || null,
        recipientEmail: null,
        senderEmail: null,
        description: sortedEntries.length > 1 
          ? `Chain of Custody: ${sortedEntries.map(e => e.action.replace('_', ' ')).join(' → ')}`
          : depositEntry.notes || `${depositEntry.action.replace('_', ' ')}`,
        referenceId: depositEntry.certificateId || null,
        createdAt: primaryEntry.createdAt,
        completedAt: depositEntry.createdAt,
        rejectionReason: null,
        certificates: [],
        isExpectedValue: false,
        goldWalletType: depositEntry.toWallet?.includes('LGPW') ? 'LGPW' as const : 
                        depositEntry.toWallet?.includes('FGPW') ? 'FGPW' as const : null,
      };
    });
  
  // Combine and sort by date (newest first)
  const allActivities = [...filteredTxs, ...certificateActivities, ...bankDepositActivities, ...cryptoDepositActivities, ...ledgerActivities]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  const filteredTransactions = allActivities.filter(tx => {
    const matchesSearch = tx.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.recipientEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.senderEmail?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || tx.type === typeFilter;
    return matchesSearch && matchesType;
  });

  // Group related transactions by gold amount and time proximity (within 60 seconds)
  const groupedTransactions = useMemo(() => {
    const groups: { primary: VaultTransaction; related: VaultTransaction[] }[] = [];
    const processedIds = new Set<string>();
    
    // Priority order for determining the "primary" transaction in a group
    const getPriority = (tx: VaultTransaction): number => {
      if (tx.type === 'Deposit' || tx.id.startsWith('bank-') || tx.id.startsWith('crypto-')) return 1;
      if (tx.type === 'Buy' || tx.type === 'Sell') return 2;
      if (tx.type === 'Vault Deposit' && tx.description === 'Gold Purchase') return 3;
      if (tx.type === 'Vault Deposit') return 4;
      return 5;
    };
    
    // Check if two transactions are related (same gold amount, within time window)
    const areRelated = (tx1: VaultTransaction, tx2: VaultTransaction): boolean => {
      if (!tx1.amountGold || !tx2.amountGold) return false;
      const gold1 = Math.abs(parseFloat(tx1.amountGold));
      const gold2 = Math.abs(parseFloat(tx2.amountGold));
      const goldMatch = Math.abs(gold1 - gold2) < 0.01 || gold1 === gold2;
      
      const time1 = new Date(tx1.createdAt).getTime();
      const time2 = new Date(tx2.createdAt).getTime();
      const timeMatch = Math.abs(time1 - time2) < 120000; // 2 minutes
      
      return goldMatch && timeMatch;
    };
    
    for (const tx of filteredTransactions) {
      if (processedIds.has(tx.id)) continue;
      
      // Find all related transactions
      const relatedTxs = filteredTransactions.filter(
        other => other.id !== tx.id && !processedIds.has(other.id) && areRelated(tx, other)
      );
      
      // Combine tx with related ones and sort by priority
      const allRelated = [tx, ...relatedTxs].sort((a, b) => getPriority(a) - getPriority(b));
      const primary = allRelated[0];
      const related = allRelated.slice(1);
      
      // Mark all as processed
      allRelated.forEach(t => processedIds.add(t.id));
      
      groups.push({ primary, related });
    }
    
    return groups;
  }, [filteredTransactions]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  // Helper to get display name for transaction type
  const getDisplayName = (tx: VaultTransaction): string => {
    if (tx.type === 'Swap' || tx.description?.includes('LGPW to FGPW') || tx.description?.includes('FGPW to LGPW')) {
      return 'Swap Gold';
    }
    if (tx.description?.includes('Physical Gold Deposit') || tx.description?.includes('FinaVault')) {
      return 'Deposit Physical Gold';
    }
    if (tx.type === 'Vault Deposit' && tx.certificates.length === 1 && tx.certificates[0]?.type === 'Physical Storage') {
      return 'Deposit Physical Gold';
    }
    if (tx.type === 'Vault Deposit' && tx.description === 'Gold Purchase') {
      return 'Acquire Gold';
    }
    return tx.type;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
  };

  const renderTransactionRow = (tx: VaultTransaction, isNested: boolean = false) => (
    <div
      key={tx.id}
      className={`group flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 transition-all duration-200 cursor-pointer ${
        isNested 
          ? 'bg-gray-50/50 border-l-2 border-purple-200 pl-8' 
          : 'hover:bg-gray-50/80'
      }`}
      onClick={(e) => { e.stopPropagation(); setSelectedTx(tx); }}
      data-testid={`row-vault-tx-${tx.id}`}
    >
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        <div className={`${isNested ? 'w-9 h-9' : 'w-11 h-11'} flex-shrink-0 rounded-xl flex items-center justify-center ${getTypeColor(tx.type)} transition-transform duration-200 group-hover:scale-105`}>
          {getTypeIcon(tx.type)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`font-semibold text-gray-800 ${isNested ? 'text-[13px] text-gray-500' : 'text-sm'}`}>{getDisplayName(tx)}</span>
            {tx.type === 'Swap' ? (
              tx.description?.includes('LGPW to FGPW') ? (
                <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded bg-gradient-to-r from-blue-50 to-amber-50 text-amber-700 border border-amber-200/50">
                  LGPW → FGPW
                </span>
              ) : tx.description?.includes('FGPW to LGPW') ? (
                <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded bg-gradient-to-r from-amber-50 to-blue-50 text-blue-700 border border-blue-200/50">
                  FGPW → LGPW
                </span>
              ) : (
                <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200/50">Swap</span>
              )
            ) : tx.goldWalletType && (
              <span className={`inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded border ${tx.goldWalletType === 'LGPW' ? 'bg-blue-50 text-blue-600 border-blue-200/50' : 'bg-amber-50 text-amber-600 border-amber-200/50'}`}>
                {tx.goldWalletType}
              </span>
            )}
            {tx.certificates.length > 0 && (
              <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#D4AF37]/10 text-[#B8860B] border border-[#D4AF37]/20">
                <Award className="w-2.5 h-2.5 mr-0.5" />
                {tx.certificates.length}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 truncate max-w-[220px] sm:max-w-none mt-0.5">
            {tx.description || (tx.recipientEmail ? `To: ${tx.recipientEmail}` : tx.senderEmail ? `From: ${tx.senderEmail}` : formatDate(tx.createdAt))}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-5 ml-14 sm:ml-0">
        <div className="text-left sm:text-right min-w-[100px]">
          {tx.type === 'Swap' && tx.amountGold && parseFloat(tx.amountGold) > 0 ? (
            <>
              <p className="font-bold text-amber-600 tabular-nums text-sm">{parseFloat(tx.amountGold).toFixed(4)}g</p>
              {tx.goldPriceUsdPerGram && (
                <p className="text-[11px] text-amber-500 font-medium whitespace-nowrap mt-0.5">
                  ${parseFloat(tx.goldPriceUsdPerGram).toFixed(2)}/g
                </p>
              )}
            </>
          ) : tx.type === 'Deposit' && tx.amountUsd && parseFloat(tx.amountUsd) > 0 ? (
            <>
              <p className="font-bold text-emerald-600 tabular-nums text-sm">+${parseFloat(tx.amountUsd).toFixed(2)}</p>
              {tx.amountGold && parseFloat(tx.amountGold) > 0 && (
                <p className="text-[11px] text-gray-400 font-medium mt-0.5">{parseFloat(tx.amountGold).toFixed(4)}g</p>
              )}
            </>
          ) : tx.type === 'Bank Deposit' && tx.isExpectedValue && tx.amountGold ? (
            <>
              <p className="font-bold text-emerald-600 tabular-nums text-sm">≈{parseFloat(tx.amountGold).toFixed(4)}g</p>
              {tx.amountUsd && <p className="text-[11px] text-gray-500 mt-0.5">${parseFloat(tx.amountUsd).toFixed(2)}</p>}
            </>
          ) : tx.type === 'Bank Deposit' && !tx.amountGold && tx.amountUsd ? (
            <>
              <p className="font-bold text-emerald-600 tabular-nums text-sm">${parseFloat(tx.amountUsd).toFixed(2)}</p>
            </>
          ) : tx.amountGold && parseFloat(tx.amountGold) > 0 ? (
            <>
              <p className={`font-bold tabular-nums text-sm ${isGoldIncoming(tx.type) ? 'text-emerald-600' : 'text-rose-600'}`}>
                {isGoldIncoming(tx.type) ? '+' : '-'}{parseFloat(tx.amountGold).toFixed(4)}g
              </p>
              {tx.amountUsd && <p className="text-[11px] text-gray-500 mt-0.5">${parseFloat(tx.amountUsd).toFixed(2)}</p>}
            </>
          ) : tx.amountUsd && parseFloat(tx.amountUsd) > 0 ? (
            <p className={`font-bold tabular-nums text-sm ${isUsdIncoming(tx.type) ? 'text-emerald-600' : 'text-rose-600'}`}>
              {isUsdIncoming(tx.type) ? '+' : '-'}${parseFloat(tx.amountUsd).toFixed(2)}
            </p>
          ) : (
            <p className="text-sm text-gray-300">--</p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            {getStatusBadge(tx.status, tx.rejectionReason)}
            <p className="text-[11px] text-gray-500 mt-1 hidden sm:block">{formatDate(tx.createdAt)}</p>
          </div>
          {!isNested && (
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-300 group-hover:text-gray-500 group-hover:bg-gray-100 transition-all hidden sm:flex">
              <Eye className="w-4 h-4" />
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <Card className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <CardHeader className="border-b border-gray-100 bg-white px-5 py-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold text-gray-800">Activity History</CardTitle>
            <p className="text-xs text-gray-400 mt-0.5">{filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-44 h-9 text-sm rounded-lg border-gray-200 bg-gray-50/80 focus:bg-white"
                data-testid="input-search-vault"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-32 h-9 text-sm rounded-lg border-gray-200 bg-gray-50/80" data-testid="select-type-filter">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Buy">Buy</SelectItem>
                <SelectItem value="Sell">Sell</SelectItem>
                <SelectItem value="Send">Send</SelectItem>
                <SelectItem value="Receive">Receive</SelectItem>
                <SelectItem value="Deposit">Deposit</SelectItem>
                <SelectItem value="Withdrawal">Withdrawal</SelectItem>
                <SelectItem value="Swap">Swap</SelectItem>
                <SelectItem value="Vault Deposit">Vault Deposit</SelectItem>
                <SelectItem value="Vault Withdrawal">Vault Withdrawal</SelectItem>
                <SelectItem value="Bank Deposit">Bank Deposit</SelectItem>
                <SelectItem value="Crypto Deposit">Crypto Deposit</SelectItem>
              </SelectContent>
            </Select>
            <button 
              onClick={fetchActivity} 
              aria-label="Refresh vault activity"
              className="w-9 h-9 rounded-lg border border-gray-200 bg-gray-50/80 hover:bg-gray-100 flex items-center justify-center transition-colors"
              data-testid="button-refresh-vault"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <RefreshCw className="w-5 h-5 animate-spin text-purple-400 mb-3" />
            <p className="text-sm text-gray-400">Loading activity...</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
              <Coins className="w-7 h-7 text-gray-300" />
            </div>
            <p className="font-medium text-gray-500 mb-1">No activity yet</p>
            <p className="text-sm text-gray-400">Transactions will appear here once you start trading gold.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {groupedTransactions.map(({ primary, related }) => (
              related.length > 0 ? (
                <Collapsible
                  key={primary.id}
                  open={expandedGroups.has(primary.id)}
                  onOpenChange={() => toggleGroup(primary.id)}
                >
                  <div className="relative">
                    <CollapsibleTrigger asChild>
                      <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10 cursor-pointer p-1 hover:bg-gray-100 rounded-md transition-colors">
                        {expandedGroups.has(primary.id) ? (
                          <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                        )}
                      </div>
                    </CollapsibleTrigger>
                    <div className="pl-6">
                      {renderTransactionRow(primary)}
                    </div>
                    <span 
                      className="absolute right-32 top-1/2 -translate-y-1/2 text-[10px] font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full cursor-pointer hover:bg-purple-100 transition-colors z-10 border border-purple-100"
                      onClick={(e) => { e.stopPropagation(); toggleGroup(primary.id); }}
                    >
                      +{related.length}
                    </span>
                  </div>
                  <CollapsibleContent>
                    <div className="ml-6">
                      {related.map(tx => renderTransactionRow(tx, true))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ) : (
                renderTransactionRow(primary)
              )
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={!!selectedTx} onOpenChange={() => setSelectedTx(null)}>
        <DialogContent className="w-[95vw] max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
          </DialogHeader>
          {selectedTx && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Transaction ID</p>
                  <p className="font-mono text-xs">{selectedTx.id}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Type</p>
                  <Badge className={getTypeColor(selectedTx.type)}>{selectedTx.type}</Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  {getStatusBadge(selectedTx.status, selectedTx.rejectionReason)}
                </div>
                {selectedTx.rejectionReason && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Rejection Reason</p>
                    <p className="text-red-600">{selectedTx.rejectionReason}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground">Gold Amount</p>
                  <p className="font-bold">{selectedTx.amountGold ? parseFloat(selectedTx.amountGold).toFixed(6) : '0'}g</p>
                </div>
                <div>
                  <p className="text-muted-foreground">USD Value</p>
                  <p className="font-bold">${selectedTx.amountUsd ? parseFloat(selectedTx.amountUsd).toFixed(2) : '0.00'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Gold Price</p>
                  <p>${selectedTx.goldPriceUsdPerGram ? parseFloat(selectedTx.goldPriceUsdPerGram).toFixed(2) : '0'}/g</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p>{new Date(selectedTx.createdAt).toLocaleString()}</p>
                </div>
                {selectedTx.completedAt && (
                  <div>
                    <p className="text-muted-foreground">Completed</p>
                    <p>{new Date(selectedTx.completedAt).toLocaleString()}</p>
                  </div>
                )}
                {selectedTx.recipientEmail && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Recipient</p>
                    <p>{selectedTx.recipientEmail}</p>
                  </div>
                )}
                {selectedTx.senderEmail && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Sender</p>
                    <p>{selectedTx.senderEmail}</p>
                  </div>
                )}
                {selectedTx.description && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Description</p>
                    <p>{selectedTx.description}</p>
                  </div>
                )}
              </div>
              
              {selectedTx.certificates.length > 0 && (
                <div className="border-t pt-4">
                  <p className="font-medium mb-3 flex items-center gap-2">
                    <Award className="w-5 h-5 text-[#D4AF37]" />
                    Your Certificates
                  </p>
                  <div className="space-y-3">
                    {selectedTx.certificates.map((cert) => (
                      <div key={cert.id} className="p-4 bg-gradient-to-r from-[#D4AF37]/10 to-[#B8860B]/5 rounded-lg border border-[#D4AF37]/30" data-testid={`cert-card-${cert.id}`}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-[#D4AF37]" />
                            <div>
                              <p className="font-bold text-[#8B6914]">{cert.type}</p>
                              <p className="font-mono text-xs text-muted-foreground">{cert.certificateNumber}</p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge className={cert.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                              {cert.status}
                            </Badge>
                            {cert.type === 'Conversion' && cert.fromGoldWalletType && cert.toGoldWalletType ? (
                              <div className="flex items-center gap-1">
                                <Badge variant="outline" className={`text-xs ${cert.fromGoldWalletType === 'FGPW' ? 'border-blue-400 text-blue-600 bg-blue-50' : 'border-amber-400 text-amber-600 bg-amber-50'}`}>
                                  {cert.fromGoldWalletType === 'FGPW' ? '🔒' : '📈'}
                                </Badge>
                                <span className="text-xs text-muted-foreground">→</span>
                                <Badge variant="outline" className={`text-xs ${cert.toGoldWalletType === 'FGPW' ? 'border-blue-400 text-blue-600 bg-blue-50' : 'border-amber-400 text-amber-600 bg-amber-50'}`}>
                                  {cert.toGoldWalletType === 'FGPW' ? '🔒' : '📈'}
                                </Badge>
                              </div>
                            ) : cert.goldWalletType && (
                              <Badge variant="outline" className={`text-xs ${cert.goldWalletType === 'FGPW' ? 'border-blue-400 text-blue-600 bg-blue-50' : 'border-amber-400 text-amber-600 bg-amber-50'}`}>
                                {cert.goldWalletType === 'FGPW' ? '🔒 Fixed' : '📈 Market'}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                          <div>
                            <p className="text-muted-foreground text-xs">Gold Amount</p>
                            <p className="font-bold">{parseFloat(cert.goldGrams).toFixed(4)}g</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Issuer</p>
                            <p className="font-medium text-xs">{cert.issuer || 'Wingold Metals DMCC'}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            className="flex-1 bg-[#D4AF37] hover:bg-[#B8860B] text-black"
                            onClick={(e) => {
                              e.stopPropagation();
                              const tabMap: Record<string, string> = {
                                'Transfer': 'transfer',
                                'Digital Ownership': 'ownership',
                                'Physical Storage': 'storage'
                              };
                              setCertTab(tabMap[cert.type] || 'ownership');
                              setViewingCerts(selectedTx?.certificates || []);
                            }}
                            data-testid={`button-view-cert-${cert.id}`}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </Button>
                          <Button 
                            size="sm" 
                            variant="default"
                            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`/verify-certificate?cert=${encodeURIComponent(cert.certificateNumber)}`, '_blank');
                            }}
                            data-testid={`button-verify-cert-${cert.id}`}
                          >
                            <ShieldCheck className="w-4 h-4 mr-2" />
                            Verify
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Certificate Viewing Modal - Both Certificates with Tabs */}
      <Dialog open={!!viewingCerts && viewingCerts.length > 0} onOpenChange={() => setViewingCerts(null)}>
        <DialogContent className="w-[95vw] max-w-4xl bg-[#0D0515] border-white/10 p-0 overflow-hidden flex flex-col max-h-[85vh]">
          
          {/* Tabs for switching certificates */}
          <div className="bg-black/40 border-b border-white/10 p-4 flex justify-center sticky top-0 z-20">
            {viewingCerts && (() => {
              const hasTransfer = viewingCerts.some(c => c.type === 'Transfer');
              const hasOwnership = viewingCerts.some(c => c.type === 'Digital Ownership');
              const hasStorage = viewingCerts.some(c => c.type === 'Physical Storage');
              const tabCount = [hasTransfer, hasOwnership, hasStorage].filter(Boolean).length;
              
              return (
                <Tabs value={certTab} onValueChange={setCertTab} className="w-full max-w-lg">
                  <TabsList className={`grid w-full bg-white/5 ${tabCount === 3 ? 'grid-cols-3' : tabCount === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {hasTransfer && (
                      <TabsTrigger value="transfer" className="data-[state=active]:bg-[#22c55e] data-[state=active]:text-black text-xs">
                        <Send className="w-3 h-3 mr-1" />
                        Transfer
                      </TabsTrigger>
                    )}
                    {hasOwnership && (
                      <TabsTrigger value="ownership" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black text-xs">
                        <Award className="w-3 h-3 mr-1" />
                        Ownership
                      </TabsTrigger>
                    )}
                    {hasStorage && (
                      <TabsTrigger value="storage" className="data-[state=active]:bg-[#C0C0C0] data-[state=active]:text-black text-xs">
                        <Box className="w-3 h-3 mr-1" />
                        Storage
                      </TabsTrigger>
                    )}
                  </TabsList>
                </Tabs>
              );
            })()}
          </div>

          <div className="overflow-y-auto p-4 md:p-8">
            {viewingCerts && viewingCerts.length > 0 && (() => {
              const transferCert = viewingCerts.find(c => c.type === 'Transfer');
              const ownershipCert = viewingCerts.find(c => c.type === 'Digital Ownership');
              const storageCert = viewingCerts.find(c => c.type === 'Physical Storage');
              const issueDate = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });

              return (
                <div id="certificate-print-area">
                  {/* DIGITAL OWNERSHIP CERTIFICATE */}
                  {certTab === 'ownership' && ownershipCert && (
                    <div className="certificate-container relative p-8 md:p-12 border-8 border-double border-[#D4AF37]/30 m-2 bg-[#0D0515] shadow-2xl animate-in fade-in zoom-in-95 duration-300">
                      
                      {/* Watermark Background */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
                        <Award className="w-96 h-96" />
                      </div>

                      {/* Header */}
                      <div className="text-center space-y-4 mb-12 relative z-10">
                        <div className="flex justify-center mb-4">
                          <div className="w-16 h-16 rounded-full bg-[#D4AF37]/10 flex items-center justify-center border border-[#D4AF37]">
                            <ShieldCheck className="w-8 h-8 text-[#D4AF37]" />
                          </div>
                        </div>
                        <h2 className="text-3xl md:text-5xl font-serif text-[#D4AF37] tracking-wider uppercase">Certificate</h2>
                        <h3 className="text-lg md:text-xl text-white/80 font-serif tracking-widest uppercase">of Digital Ownership</h3>
                        <p className="text-white/40 text-sm font-mono mt-2">ID: {ownershipCert?.certificateNumber || 'N/A'}</p>
                      </div>

                      {/* Content */}
                      <div className="space-y-8 text-center relative z-10">
                        <p className="text-lg text-white/80 leading-relaxed max-w-2xl mx-auto">
                          This certifies that the holder is the beneficial owner of the following precious metal assets, securely stored and insured at <strong>Dubai - Wingold & Metals DMCC</strong>.
                        </p>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 border-y border-[#D4AF37]/20 py-8 my-8">
                          <div>
                            <p className="text-xs text-[#D4AF37] uppercase tracking-wider mb-1">Asset Type</p>
                            <p className="text-xl font-bold text-white">Gold</p>
                          </div>
                          <div>
                            <p className="text-xs text-[#D4AF37] uppercase tracking-wider mb-1">Total Weight</p>
                            <p className="text-xl font-bold text-white">{parseFloat(ownershipCert?.goldGrams || '0').toFixed(4)}g</p>
                          </div>
                          <div>
                            <p className="text-xs text-[#D4AF37] uppercase tracking-wider mb-1">Purity</p>
                            <p className="text-xl font-bold text-white">999.9</p>
                          </div>
                          <div>
                            <p className="text-xs text-[#D4AF37] uppercase tracking-wider mb-1">Status</p>
                            <p className="text-xl font-bold text-white">{ownershipCert?.status || 'Active'}</p>
                          </div>
                        </div>

                        <div className="flex flex-col md:flex-row justify-center items-center md:items-end px-8 md:px-16 mt-16 gap-8">
                          <div className="text-center">
                            <p className="text-white font-medium mb-2">{issueDate}</p>
                            <Separator className="bg-[#D4AF37]/40 w-48 mb-2 mx-auto" />
                            <p className="text-xs text-[#D4AF37] uppercase tracking-wider">Date of Issue</p>
                            <p className="text-10 text-white/40">Dubai - Wingold & Metals DMCC</p>
                          </div>
                        </div>

                        <div className="mt-8 text-[10px] text-white/30 text-justify leading-relaxed px-4 md:px-0">
                          <p>
                            This Gold Ownership Certificate is valid solely until the occurrence of the next transaction affecting the Holder's gold balance. Upon execution of any new purchase, sale, transfer, allocation, redemption, or adjustment, this Certificate shall automatically become null and void.
                          </p>
                        </div>
                      </div>
                      
                      {/* Footer Actions */}
                      <div className="mt-12 flex justify-center gap-4 relative z-10 print:hidden">
                        <Button className="bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 font-bold" onClick={handlePrint}>
                          <Printer className="w-4 h-4 mr-2" /> Print
                        </Button>
                        <Button variant="outline" className="border-[#D4AF37]/20 text-[#D4AF37] hover:bg-[#D4AF37]/10" onClick={() => handleShare(viewingCerts)}>
                          <Share2 className="w-4 h-4 mr-2" /> Share
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* TRANSFER CERTIFICATE */}
                  {certTab === 'transfer' && transferCert && (
                    <div className="certificate-container relative p-8 md:p-12 border-8 border-double border-[#22c55e]/30 m-2 bg-[#0D0515] shadow-2xl animate-in fade-in zoom-in-95 duration-300">
                      
                      {/* Watermark Background */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
                        <Send className="w-96 h-96" />
                      </div>

                      {/* Header */}
                      <div className="text-center space-y-4 mb-12 relative z-10">
                        <div className="flex justify-center mb-4">
                          <div className="w-16 h-16 rounded-full bg-[#22c55e]/10 flex items-center justify-center border border-[#22c55e]">
                            <Send className="w-8 h-8 text-[#22c55e]" />
                          </div>
                        </div>
                        <h2 className="text-3xl md:text-5xl font-serif text-[#22c55e] tracking-wider uppercase">Certificate</h2>
                        <h3 className="text-lg md:text-xl text-white/80 font-serif tracking-widest uppercase">of Gold Transfer</h3>
                        <p className="text-white/40 text-sm font-mono mt-2">ID: {transferCert.certificateNumber}</p>
                      </div>

                      {/* Content */}
                      <div className="space-y-8 text-center relative z-10">
                        <p className="text-lg text-white/80 leading-relaxed max-w-2xl mx-auto">
                          This certifies that the following gold transfer has been successfully executed and recorded on the Finatrades platform.
                        </p>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 border-y border-[#22c55e]/20 py-8 my-8">
                          <div>
                            <p className="text-xs text-[#22c55e] uppercase tracking-wider mb-1">Transaction</p>
                            <p className="text-xl font-bold text-white">Transfer</p>
                          </div>
                          <div>
                            <p className="text-xs text-[#22c55e] uppercase tracking-wider mb-1">Gold Amount</p>
                            <p className="text-xl font-bold text-white">{parseFloat(transferCert.goldGrams).toFixed(4)}g</p>
                          </div>
                          <div>
                            <p className="text-xs text-[#22c55e] uppercase tracking-wider mb-1">Purity</p>
                            <p className="text-xl font-bold text-white">999.9</p>
                          </div>
                          <div>
                            <p className="text-xs text-[#22c55e] uppercase tracking-wider mb-1">Status</p>
                            <p className="text-xl font-bold text-white">{transferCert.status}</p>
                          </div>
                        </div>

                        <div className="flex flex-col md:flex-row justify-center items-center md:items-end px-8 md:px-16 mt-16 gap-8">
                          <div className="text-center">
                            <p className="text-white font-medium mb-2">{issueDate}</p>
                            <Separator className="bg-[#22c55e]/40 w-48 mb-2 mx-auto" />
                            <p className="text-xs text-[#22c55e] uppercase tracking-wider">Date of Transfer</p>
                            <p className="text-10 text-white/40">Finatrades Platform</p>
                          </div>
                        </div>

                        <div className="mt-8 text-[10px] text-white/30 text-justify leading-relaxed px-4 md:px-0">
                          <p>
                            This Transfer Certificate confirms the successful transfer of digital gold between Finatrades users. The transaction is permanent and recorded on the platform ledger.
                          </p>
                        </div>
                      </div>
                      
                      {/* Footer Actions */}
                      <div className="mt-12 flex justify-center gap-4 relative z-10 print:hidden">
                        <Button className="bg-[#22c55e] text-black hover:bg-[#22c55e]/90 font-bold" onClick={handlePrint}>
                          <Printer className="w-4 h-4 mr-2" /> Print
                        </Button>
                        <Button variant="outline" className="border-[#22c55e]/20 text-[#22c55e] hover:bg-[#22c55e]/10" onClick={() => handleShare(viewingCerts)}>
                          <Share2 className="w-4 h-4 mr-2" /> Share
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* STORAGE CERTIFICATE (WinGold Style) */}
                  {certTab === 'storage' && storageCert && (
                    <div className="certificate-container relative p-8 md:p-12 border-[1px] border-white/20 m-2 bg-white text-black shadow-2xl animate-in fade-in zoom-in-95 duration-300">
                      
                      {/* Watermark Background */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-[0.05] pointer-events-none select-none">
                        <Box className="w-96 h-96 text-black" />
                      </div>

                      {/* Header */}
                      <div className="flex justify-between items-start mb-12 relative z-10 border-b-2 border-black pb-6">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-black text-white flex items-center justify-center">
                            <Box className="w-10 h-10" />
                          </div>
                          <div>
                            <h2 className="text-2xl font-bold tracking-tight uppercase">WinGold & Metals Vault</h2>
                            <p className="text-xs text-black/60 font-mono tracking-widest uppercase">Secure Logistics & Storage</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <h3 className="text-xl font-bold uppercase tracking-widest text-black/80">Certificate of Deposit</h3>
                          <p className="text-sm font-mono mt-1">REF: {storageCert.certificateNumber}</p>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="space-y-6 text-left relative z-10 font-mono text-sm">
                        <div className="grid grid-cols-2 gap-8 mb-8">
                          <div>
                            <p className="text-xs uppercase text-black/50 mb-1">Depositor / Owner</p>
                            <p className="font-bold text-lg">FINATRADES CLIENT</p>
                            <p>Via FinaTrades Custody Account</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs uppercase text-black/50 mb-1">Storage Location</p>
                            <p className="font-bold text-lg">DUBAI DMCC VAULT</p>
                            <p>High Security Zone A-14</p>
                          </div>
                        </div>

                        <div className="border border-black p-0">
                          <table className="w-full text-left">
                            <thead className="bg-black text-white uppercase text-xs">
                              <tr>
                                <th className="p-3 border-r border-white/20">Description</th>
                                <th className="p-3 border-r border-white/20 text-right">Weight (g)</th>
                                <th className="p-3 text-right">Purity</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-black">
                              <tr>
                                <td className="p-3 border-r border-black">Gold - Allocated Storage</td>
                                <td className="p-3 border-r border-black text-right">{parseFloat(storageCert.goldGrams).toFixed(6)}</td>
                                <td className="p-3 text-right">999.9</td>
                              </tr>
                              <tr className="bg-black/5 font-bold">
                                <td className="p-3 border-r border-black">TOTAL NET WEIGHT</td>
                                <td className="p-3 border-r border-black text-right">{parseFloat(storageCert.goldGrams).toFixed(6)}</td>
                                <td className="p-3 text-right">Au</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        <div className="text-xs text-black/60 leading-relaxed mt-8 text-justify">
                          This certificate acknowledges the receipt and storage of the above-mentioned precious metals. The assets are held in a segregated account and are fully insured against all risks. Release of the assets is subject to the standard withdrawal procedures and fee settlement.
                        </div>

                        <div className="flex justify-between items-end mt-16 pt-8 border-t border-black/20">
                          <div>
                            <p className="font-bold uppercase">Vault Manager</p>
                            <p className="text-xs text-black/50">Authorized Officer</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{issueDate}</p>
                            <p className="text-xs text-black/50 uppercase">Date of Issue</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Footer Actions */}
                      <div className="mt-12 flex justify-center gap-4 relative z-10 print:hidden">
                        <Button className="bg-black text-white hover:bg-black/80 font-bold" onClick={handlePrint}>
                          <Printer className="w-4 h-4 mr-2" /> Print
                        </Button>
                        <Button variant="outline" className="border-black/20 text-black hover:bg-black/5" onClick={() => handleShare(viewingCerts)}>
                          <Share2 className="w-4 h-4 mr-2" /> Share
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
