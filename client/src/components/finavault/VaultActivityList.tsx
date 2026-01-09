import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/context/AuthContext';
import { RefreshCw, Search, TrendingUp, ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Send, Coins, Award, Eye, Printer, Share2, FileText, X, ShieldCheck, Box, Download } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

interface VaultTransaction {
  id: string;
  type: 'Buy' | 'Sell' | 'Send' | 'Receive' | 'Deposit' | 'Withdrawal' | 'Vault Deposit' | 'Vault Withdrawal' | 'Bank Deposit' | 'Swap';
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
  goldWalletType?: 'MPGW' | 'FPGW' | null;
  certificates: {
    id: string;
    certificateNumber: string;
    type: string;
    status: string;
    goldGrams: string;
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
}

export default function VaultActivityList() {
  const { user } = useAuth();
  const [data, setData] = useState<VaultActivityData | null>(null);
  const [depositRequests, setDepositRequests] = useState<DepositRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedTx, setSelectedTx] = useState<VaultTransaction | null>(null);
  const [viewingCerts, setViewingCerts] = useState<{
    id: string;
    certificateNumber: string;
    type: string;
    status: string;
    goldGrams: string;
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
      // Fetch both vault activity and bank deposit requests in parallel
      const [vaultResponse, depositResponse] = await Promise.all([
        fetch(`/api/vault/activity/${user.id}`),
        fetch(`/api/deposit-requests/${user.id}`)
      ]);
      
      if (vaultResponse.ok) {
        const result = await vaultResponse.json();
        setData(result);
      }
      
      if (depositResponse.ok) {
        const depositResult = await depositResponse.json();
        setDepositRequests(depositResult.requests || []);
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
      default: return <Coins className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Buy': return 'bg-green-100 text-green-700';
      case 'Sell': return 'bg-red-100 text-red-700';
      case 'Send': return 'bg-purple-100 text-purple-700';
      case 'Receive': return 'bg-purple-100 text-purple-700';
      case 'Deposit': return 'bg-emerald-100 text-emerald-700';
      case 'Withdrawal': return 'bg-purple-100 text-fuchsia-700';
      case 'Swap': return 'bg-amber-100 text-amber-700';
      case 'Vault Deposit': return 'bg-[#D4AF37]/20 text-[#B8860B]';
      case 'Vault Withdrawal': return 'bg-purple-100 text-purple-700';
      case 'Bank Deposit': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };
  
  const isGoldIncoming = (type: string) => {
    return ['Buy', 'Receive', 'Vault Deposit'].includes(type);
  };
  
  const isUsdIncoming = (type: string) => {
    return type === 'Deposit';
  };

  const getStatusBadge = (status: string, rejectionReason?: string | null) => {
    switch (status) {
      case 'Completed':
        return <Badge className="bg-green-100 text-green-700 border-green-200">Completed</Badge>;
      case 'Pending':
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Pending</Badge>;
      case 'Cancelled':
        return (
          <div className="flex items-center gap-1">
            <Badge className="bg-red-100 text-red-700 border-red-200">Rejected</Badge>
            {rejectionReason && (
              <span className="text-xs text-red-500" title={rejectionReason}>ⓘ</span>
            )}
          </div>
        );
      case 'Rejected':
        return (
          <div className="flex items-center gap-1">
            <Badge className="bg-red-100 text-red-700 border-red-200">Rejected</Badge>
            {rejectionReason && (
              <span className="text-xs text-red-500" title={rejectionReason}>ⓘ</span>
            )}
          </div>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const transactions = data?.transactions || [];
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
      return true;
    })
    .map(dep => ({
      id: `deposit-${dep.id}`,
      type: 'Bank Deposit' as const,
      status: dep.status === 'Rejected' ? 'Cancelled' : 'Pending',
      amountGold: null, // Deposit requests don't have gold data until approved
      amountUsd: dep.amountUsd,
      goldPriceUsdPerGram: null, // Will be set when deposit is approved
      recipientEmail: null,
      senderEmail: null,
      description: `Bank Deposit via ${dep.paymentMethod}`,
      referenceId: dep.referenceNumber,
      createdAt: dep.createdAt,
      completedAt: dep.processedAt || null,
      rejectionReason: dep.rejectionReason || null,
      certificates: [],
    }));
  
  // Combine and sort by date (newest first)
  const allActivities = [...filteredTxs, ...certificateActivities, ...bankDepositActivities]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  const filteredTransactions = allActivities.filter(tx => {
    const matchesSearch = tx.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.recipientEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.senderEmail?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || tx.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <Card className="bg-white shadow-sm border border-border overflow-hidden">
      <CardHeader className="border-b border-border bg-muted/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle className="text-lg font-semibold">Vault Activity History</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-48"
                data-testid="input-search-vault"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-36" data-testid="select-type-filter">
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
                <SelectItem value="Swap">Swap (MPGW↔FPGW)</SelectItem>
                <SelectItem value="Vault Deposit">Vault Deposit</SelectItem>
                <SelectItem value="Vault Withdrawal">Vault Withdrawal</SelectItem>
                <SelectItem value="Bank Deposit">Bank Deposit</SelectItem>
              </SelectContent>
            </Select>
            <Button size="icon" variant="outline" onClick={fetchActivity} data-testid="button-refresh-vault">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex justify-center py-12">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Coins className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No vault activity found</p>
            <p className="text-sm">Transactions will appear here once you buy, sell, send, or receive gold.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredTransactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => setSelectedTx(tx)}
                data-testid={`row-vault-tx-${tx.id}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getTypeColor(tx.type)}`}>
                    {getTypeIcon(tx.type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{
                        // Swap Gold for MPGW<->FPGW conversions
                        tx.type === 'Swap' || tx.description?.includes('MPGW to FPGW') || tx.description?.includes('FPGW to MPGW')
                          ? 'Swap Gold'
                          // Deposit Physical Gold for actual physical vault deposits
                          : tx.description?.includes('Physical Gold Deposit') || tx.description?.includes('FinaVault')
                          ? 'Deposit Physical Gold'
                          // Physical deposits with 1 cert (only Physical Storage, no Digital Ownership pair from purchase)
                          : tx.type === 'Vault Deposit' && tx.certificates.length === 1 && tx.certificates[0]?.type === 'Physical Storage'
                          ? 'Deposit Physical Gold'
                          // Acquire Gold for bank/card/crypto purchases shown as Vault Deposit (have both cert types)
                          : tx.type === 'Vault Deposit' && tx.description === 'Gold Purchase'
                          ? 'Acquire Gold'
                          : tx.type
                      }</span>
                      {/* Show wallet type badges - for Swap show direction based on description */}
                      {tx.type === 'Swap' ? (
                        tx.description?.includes('MPGW to FPGW') ? (
                          <Badge 
                            variant="outline" 
                            className="text-xs bg-gradient-to-r from-blue-100 to-amber-100 text-amber-700 border-amber-300"
                          >
                            MPGW → FPGW
                          </Badge>
                        ) : tx.description?.includes('FPGW to MPGW') ? (
                          <Badge 
                            variant="outline" 
                            className="text-xs bg-gradient-to-r from-amber-100 to-blue-100 text-blue-700 border-blue-300"
                          >
                            FPGW → MPGW
                          </Badge>
                        ) : (
                          <Badge 
                            variant="outline" 
                            className="text-xs bg-amber-100 text-amber-700 border-amber-300"
                          >
                            Swap
                          </Badge>
                        )
                      ) : tx.goldWalletType && (
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            tx.goldWalletType === 'MPGW' 
                              ? 'bg-blue-100 text-blue-700 border-blue-300' 
                              : 'bg-amber-100 text-amber-700 border-amber-300'
                          }`}
                        >
                          {tx.goldWalletType}
                        </Badge>
                      )}
                      {tx.certificates.length > 0 && (
                        <Badge variant="outline" className="text-xs bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/30">
                          <Award className="w-3 h-3 mr-1" />
                          {tx.certificates.length} Cert
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {tx.description || (tx.recipientEmail ? `To: ${tx.recipientEmail}` : tx.senderEmail ? `From: ${tx.senderEmail}` : new Date(tx.createdAt).toLocaleString())}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    {/* Swap transactions: show conversion amount */}
                    {tx.type === 'Swap' && tx.amountGold && parseFloat(tx.amountGold) > 0 ? (
                      <>
                        <p className="font-bold text-amber-600">
                          {parseFloat(tx.amountGold).toFixed(4)}g
                        </p>
                        {tx.amountUsd && (
                          <p className="text-sm text-muted-foreground">
                            Locked @ ${(parseFloat(tx.amountUsd) / parseFloat(tx.amountGold)).toFixed(2)}/g
                          </p>
                        )}
                      </>
                    ) : tx.type === 'Deposit' && tx.amountUsd && parseFloat(tx.amountUsd) > 0 ? (
                      <>
                        <p className="font-bold text-green-600">
                          +${parseFloat(tx.amountUsd).toFixed(2)}
                        </p>
                        {tx.amountGold && parseFloat(tx.amountGold) > 0 && (
                          <p className="text-sm text-fuchsia-600 font-medium">
                            {parseFloat(tx.amountGold).toFixed(4)}g gold
                          </p>
                        )}
                      </>
                    ) : tx.amountGold && parseFloat(tx.amountGold) > 0 ? (
                      <>
                        <p className={`font-bold ${isGoldIncoming(tx.type) ? 'text-green-600' : 'text-red-600'}`}>
                          {isGoldIncoming(tx.type) ? '+' : '-'}
                          {parseFloat(tx.amountGold).toFixed(4)}g
                        </p>
                        {tx.amountUsd && (
                          <p className="text-sm text-muted-foreground">
                            ${parseFloat(tx.amountUsd).toFixed(2)}
                          </p>
                        )}
                      </>
                    ) : tx.amountUsd && parseFloat(tx.amountUsd) > 0 ? (
                      <p className={`font-bold ${isUsdIncoming(tx.type) ? 'text-green-600' : 'text-red-600'}`}>
                        {isUsdIncoming(tx.type) ? '+' : '-'}
                        ${parseFloat(tx.amountUsd).toFixed(2)}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">--</p>
                    )}
                  </div>
                  <div className="text-right">
                    {getStatusBadge(tx.status, tx.rejectionReason)}
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button size="icon" variant="ghost">
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </div>
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
                          <Badge className={cert.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                            {cert.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                          <div>
                            <p className="text-muted-foreground text-xs">Gold Amount</p>
                            <p className="font-bold">{parseFloat(cert.goldGrams).toFixed(4)}g</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Issuer</p>
                            <p className="font-medium text-xs">{cert.type === 'Digital Ownership' ? 'Finatrades' : 'Wingold & Metals DMCC'}</p>
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
