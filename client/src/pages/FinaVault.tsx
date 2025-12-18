import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useCMSPage } from '@/context/CMSContext';
import { Database, TrendingUp, History, PlusCircle, Bell, Settings, Banknote, Briefcase, Loader2, Lock, Clock, Award } from 'lucide-react';
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

  // Fetch vault deposit requests
  const { data: depositData, isLoading: depositsLoading } = useQuery({
    queryKey: ['vault-deposits', user?.id],
    queryFn: async () => {
      if (!user?.id) return { requests: [] };
      const res = await fetch(`/api/vault/deposits/${user.id}`);
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
      const res = await fetch(`/api/vault/withdrawals/${user.id}`);
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
      const res = await fetch(`/api/vault/${user.id}`);
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
      const res = await fetch(`/api/vault/ownership/${user.id}`);
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
      const res = await fetch(`/api/vault/ledger/${user.id}?limit=50`);
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
      const res = await fetch(`/api/transactions/${user.id}`);
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
      const res = await fetch(`/api/deposit-requests/${user.id}`);
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
        fetch(`/api/finabridge/wallet/${user.id}`),
        fetch(`/api/finabridge/settlement-holds/${user.id}`)
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
      const res = await fetch(`/api/wallet/${user.id}`);
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
      const res = await fetch(`/api/bnsl/plans/${user.id}`);
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
      const res = await fetch(`/api/certificates/${user.id}`);
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
  const certificates = certificatesData?.certificates || [];
  const certificateRecords = certificates
    .filter((cert: any) => ['Trade Release', 'Physical Storage', 'Digital Ownership'].includes(cert.type))
    .map((cert: any) => ({
      id: cert.id,
      createdAt: cert.issuedAt,
      action: cert.type === 'Trade Release' ? 'Trade Release Received' : cert.type,
      status: cert.status === 'Active' ? 'Completed' : cert.status,
      fromWallet: cert.type === 'Trade Release' ? 'FinaBridge Trade' : 'Vault Deposit',
      toWallet: cert.type === 'Trade Release' ? 'FinaBridge Wallet' : 'FinaVault',
      fromStatus: null,
      toStatus: 'Available',
      goldGrams: cert.goldGrams || '0',
      valueUsd: cert.totalValueUsd || '0',
      balanceAfterGrams: '0',
      isCertificate: true,
      certificateNumber: cert.certificateNumber,
    }));
  
  // Combine all records and sort by date (newest first)
  const allRecords = [...transactionRecords, ...depositRecords, ...certificateRecords].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  
  // Use ledger entries if available, otherwise show combined records
  const displayRecords = ledgerEntries.length > 0 ? ledgerEntries : allRecords;

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
      setActiveTab('my-deposits');
      
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
             <div className="p-2 bg-secondary/10 rounded-lg border border-secondary/20 text-secondary">
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
              <div className="p-2 bg-amber-100 rounded-lg">
                <Database className="w-5 h-5 text-amber-600" />
              </div>
              <h2 className="text-lg font-bold text-foreground">FinaVault Wallet</h2>
            </div>
            <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white" onClick={() => setActiveTab('new-request')}>
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
                <Clock className="w-20 h-20 text-orange-500" />
              </div>
              <div className="relative z-10">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Locked in BNSL</p>
                <p className="text-3xl font-bold text-orange-600 mb-1">
                  ${(bnslLockedGrams * goldPricePerGram).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-sm text-orange-600/70">
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
                <Briefcase className="w-20 h-20 text-amber-500" />
              </div>
              <div className="relative z-10">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Locked in Trades</p>
                <p className="text-3xl font-bold text-amber-500 mb-1">
                  ${(finabridgeLockedGrams * goldPricePerGram).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-sm text-amber-500/70">
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
                <TrendingUp className="w-20 h-20 text-amber-500" />
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
                    className="flex-1 md:flex-none data-[state=active]:bg-secondary data-[state=active]:text-white"
                    data-testid="tab-vault-activity"
                  >
                    <History className="w-4 h-4 mr-2" />
                    Vault Activity
                  </TabsTrigger>
                  <TabsTrigger 
                    value="my-deposits"
                    className="flex-1 md:flex-none data-[state=active]:bg-secondary data-[state=active]:text-white"
                  >
                    <Database className="w-4 h-4 mr-2" />
                    Deposit Requests
                  </TabsTrigger>
                  <TabsTrigger 
                    value="new-request"
                    className="flex-1 md:flex-none data-[state=active]:bg-secondary data-[state=active]:text-white"
                  >
                    <PlusCircle className="w-4 h-4 mr-2" />
                    New Deposit
                  </TabsTrigger>
                  <TabsTrigger 
                    value="cash-out"
                    className="flex-1 md:flex-none data-[state=active]:bg-secondary data-[state=active]:text-white"
                  >
                    <Banknote className="w-4 h-4 mr-2" />
                    Cash Out
                  </TabsTrigger>
                  <TabsTrigger 
                    value="ownership-ledger"
                    className="flex-1 md:flex-none data-[state=active]:bg-secondary data-[state=active]:text-white"
                    data-testid="tab-ownership-ledger"
                  >
                    <Lock className="w-4 h-4 mr-2" />
                    Ownership Ledger
                  </TabsTrigger>
                  <TabsTrigger 
                    value="certificates"
                    className="flex-1 md:flex-none data-[state=active]:bg-secondary data-[state=active]:text-white"
                    data-testid="tab-certificates"
                  >
                    <Award className="w-4 h-4 mr-2" />
                    Certificates
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="vault-activity" className="mt-0">
                  <VaultActivityList />
                </TabsContent>

                <TabsContent value="my-deposits" className="mt-0">
                  {depositsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : apiRequests.length === 0 ? (
                    <Card className="bg-white border">
                      <CardContent className="p-12 text-center">
                        <Database className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                        <h3 className="text-lg font-bold mb-2">No Deposit Requests</h3>
                        <p className="text-muted-foreground mb-4">
                          You haven't submitted any gold deposit requests yet. Start by creating a new deposit request to store your physical gold in our secure vaults.
                        </p>
                        <Button onClick={() => setActiveTab('new-request')} data-testid="button-first-deposit">
                          <PlusCircle className="w-4 h-4 mr-2" /> Create New Deposit Request
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <DepositList 
                      requests={apiRequests} 
                      onSelectRequest={setSelectedRequest}
                      onNewRequest={() => setActiveTab('new-request')}
                    />
                  )}
                </TabsContent>

                <TabsContent value="new-request" id="finavault-deposit-section" className={`transition-all duration-500 ${highlightSection ? 'ring-2 ring-primary ring-offset-2 rounded-lg bg-orange-50' : ''}`}>
                  <NewDepositForm 
                    onSubmit={handleNewRequest}
                    onCancel={() => setActiveTab('my-deposits')}
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
                        {displayRecords.length === 0 ? (
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
                                  <th className="text-left p-4 font-medium">Date</th>
                                  <th className="text-left p-4 font-medium">Action</th>
                                  <th className="text-left p-4 font-medium">Status</th>
                                  <th className="text-left p-4 font-medium">From</th>
                                  <th className="text-left p-4 font-medium">To</th>
                                  <th className="text-right p-4 font-medium">Gold (g)</th>
                                  <th className="text-right p-4 font-medium">Value</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y">
                                {displayRecords.map((entry: any) => (
                                  <tr key={entry.id} className="hover:bg-gray-50">
                                    <td className="p-4 text-muted-foreground">
                                      {new Date(entry.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="p-4">
                                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                        entry.action === 'Buy' || entry.action.includes('Deposit') || entry.action.includes('Receive') || entry.action.includes('Credit') 
                                          ? 'bg-green-100 text-green-700'
                                          : entry.action.includes('Lock') || entry.action.includes('Reserve')
                                          ? 'bg-orange-100 text-orange-700'
                                          : entry.action === 'Sell' || entry.action.includes('Withdrawal') || entry.action.includes('Send') || entry.action.includes('Fee')
                                          ? 'bg-red-100 text-red-700'
                                          : 'bg-blue-100 text-blue-700'
                                      }`}>
                                        {entry.action === 'Buy' ? 'Add Funds' : entry.action.replace(/_/g, ' ')}
                                      </span>
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
                                ))}
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
              </Tabs>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </DashboardLayout>
  );
}
