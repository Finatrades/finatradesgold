import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { Database, TrendingUp, DollarSign, Globe, History, PlusCircle, Bell, Settings, Banknote, Briefcase, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import DepositList from '@/components/finavault/DepositList';
import NewDepositForm from '@/components/finavault/NewDepositForm';
import RequestDetails from '@/components/finavault/RequestDetails';
import CashOutForm from '@/components/finavault/CashOutForm';
import VaultActivityList from '@/components/finavault/VaultActivityList';
import { DepositRequest, DepositRequestStatus } from '@/types/finavault';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocation } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

// Legacy Mock Data for fallback display
const MOCK_REQUESTS: DepositRequest[] = [
  {
    id: 'FD-2024-0042',
    userId: 'user-1',
    vaultLocation: 'Swiss Vault',
    depositType: 'Bars',
    totalDeclaredWeightGrams: 125.4,
    items: [
      { id: '1', itemType: 'Bar', quantity: 1, weightPerUnitGrams: 100, totalWeightGrams: 100, purity: '999.9', brand: 'PAMP' },
      { id: '2', itemType: 'Coin', quantity: 1, weightPerUnitGrams: 25.4, totalWeightGrams: 25.4, purity: '999.9', brand: 'Sovereign' }
    ],
    deliveryMethod: 'Courier',
    documents: [],
    status: 'Stored in Vault',
    submittedAt: '2024-11-15T10:00:00Z',
    vaultInternalReference: 'CH-ZH-99281'
  },
  {
    id: 'FP-BUY-2024-001',
    userId: 'user-1',
    vaultLocation: 'Swiss Vault',
    depositType: 'Mixed',
    totalDeclaredWeightGrams: 50,
    items: [
      { id: '1', itemType: 'Bar', quantity: 5, weightPerUnitGrams: 10, totalWeightGrams: 50, purity: '999.9', brand: 'FinaTrades Allocation' }
    ],
    deliveryMethod: 'Pickup', // Internal transfer essentially
    pickupDetails: {
      address: 'FinaPay Digital Purchase',
      contactName: 'System',
      contactMobile: 'N/A',
      date: '2024-12-10',
      timeSlot: 'Instant'
    },
    documents: [],
    status: 'Stored in Vault',
    submittedAt: '2024-12-10T09:30:00Z',
    vaultInternalReference: 'FP-DIG-8821'
  },
  {
    id: 'TR-OUT-2024-882',
    userId: 'user-1',
    vaultLocation: 'Swiss Vault',
    depositType: 'Bars',
    totalDeclaredWeightGrams: 100,
    items: [
      { id: '1', itemType: 'Bar', quantity: 1, weightPerUnitGrams: 100, totalWeightGrams: 100, purity: '999.9', brand: 'PAMP' }
    ],
    deliveryMethod: 'Pickup', // Internal transfer essentially
    pickupDetails: {
      address: 'Internal Transfer to User: @alex_crypto',
      contactName: 'Alex Johnson',
      contactMobile: 'ID: 99281-22',
      date: '2024-12-11',
      timeSlot: 'Completed'
    },
    documents: [],
    status: 'Transferred',
    submittedAt: '2024-12-11T11:20:00Z',
    vaultInternalReference: 'TR-INT-99282'
  },
  {
    id: 'TR-IN-2024-991',
    userId: 'user-1',
    vaultLocation: 'Singapore Vault',
    depositType: 'Coins',
    totalDeclaredWeightGrams: 31.1,
    items: [
      { id: '1', itemType: 'Coin', quantity: 1, weightPerUnitGrams: 31.1, totalWeightGrams: 31.1, purity: '999.9', brand: 'Buffalo' }
    ],
    deliveryMethod: 'Courier',
    pickupDetails: {
      address: 'Received from User: @sarah_gold',
      contactName: 'Sarah Smith',
      contactMobile: 'ID: 7721-11',
      date: '2024-12-11',
      timeSlot: 'Completed'
    },
    documents: [],
    status: 'Received', 
    submittedAt: '2024-12-11T10:05:00Z',
    vaultInternalReference: 'TR-INT-99283'
  },
  {
    id: 'DIG-IN-2024-771',
    userId: 'user-1',
    vaultLocation: 'London Vault (Pool)',
    depositType: 'Digital Allocation',
    totalDeclaredWeightGrams: 2.500,
    items: [
      { id: '1', itemType: 'Digital Gold', quantity: 1, weightPerUnitGrams: 2.500, totalWeightGrams: 2.500, purity: '999.9', brand: 'FinaTrades Pool' }
    ],
    deliveryMethod: 'Pickup', // Virtual
    pickupDetails: {
      address: 'Digital Transfer from User: @sarah_gold',
      contactName: 'Sarah Smith',
      contactMobile: 'ID: 7721-11',
      date: '2024-12-04',
      timeSlot: 'Instant'
    },
    documents: [],
    status: 'Received',
    submittedAt: '2024-12-04T11:20:00Z',
    vaultInternalReference: 'DIG-TR-5512'
  },
  {
    id: 'TR-P2P-2024-998',
    userId: 'user-1',
    vaultLocation: 'Swiss Vault (Allocated)',
    depositType: 'Digital Allocation',
    totalDeclaredWeightGrams: 50.000,
    items: [
      { id: '1', itemType: 'Digital Gold', quantity: 1, weightPerUnitGrams: 50.000, totalWeightGrams: 50.000, purity: '999.9', brand: 'PAMP' }
    ],
    deliveryMethod: 'Pickup', // Virtual Transfer
    pickupDetails: {
      address: 'Ownership Changed: Charan -> Farah',
      contactName: 'Farah',
      contactMobile: 'ID: 8821-22',
      date: '2024-12-11',
      timeSlot: 'Completed'
    },
    documents: [],
    status: 'Received',
    submittedAt: '2024-12-11T12:00:00Z',
    vaultInternalReference: 'TR-P2P-9982'
  },
  {
    id: 'FD-2024-0089',
    userId: 'user-1',
    vaultLocation: 'Dubai Vault',
    depositType: 'Mixed',
    totalDeclaredWeightGrams: 250,
    items: [
      { id: '1', itemType: 'Bar', quantity: 2, weightPerUnitGrams: 100, totalWeightGrams: 200, purity: '999.9', brand: 'Valcambi' },
      { id: '2', itemType: 'Coin', quantity: 5, weightPerUnitGrams: 10, totalWeightGrams: 50, purity: '999.9', brand: 'Maple Leaf' }
    ],
    deliveryMethod: 'Walk-in',
    documents: [],
    status: 'Approved – Awaiting Delivery',
    submittedAt: '2024-12-05T14:30:00Z'
  },
  {
     id: 'FD-2024-0091',
     userId: 'user-1',
     vaultLocation: 'Dubai Vault',
     depositType: 'Coins',
     totalDeclaredWeightGrams: 250,
     items: [
       { id: '1', itemType: 'Coin', quantity: 25, weightPerUnitGrams: 10, totalWeightGrams: 250, purity: '999.9', brand: 'Britannia' }
     ],
     deliveryMethod: 'Pickup',
     pickupDetails: {
        address: 'Downtown Dubai',
        contactName: 'John Doe',
        contactMobile: '+971500000000',
        date: '2024-12-10',
        timeSlot: '10:00 - 12:00'
     },
     documents: [],
     status: 'Under Review',
     submittedAt: '2024-12-03T09:15:00Z'
   }
];

export default function FinaVault() {
  const { user } = useAuth();
  const { toast } = useToast();
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

  const finabridgeLockedGrams = parseFloat(finabridgeData?.wallet?.lockedGoldGrams || '0');
  const goldPricePerGram = 85.22;
  
  // Calculate total vault holdings
  const totalVaultGold = (holdingsData?.holdings || []).reduce((sum: number, h: any) => sum + parseFloat(h.goldGrams || '0'), 0);

  // Check query params for initial tab
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const tabParam = searchParams.get('tab');
    if (tabParam === 'new-request') {
      setActiveTab('new-request');
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
             <h1 className="text-2xl font-bold text-foreground">
               FinaVault — <span className="text-muted-foreground font-normal">Gold Deposit</span>
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
        
        {/* KPI Cards Strip */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
           {/* Card 1: Total Gold - Custom Style */}
           <div className="p-6 rounded-2xl bg-secondary/10 border border-secondary/20 text-foreground relative overflow-hidden group">
              <div className="flex justify-between items-start mb-2">
                 <span className="text-sm font-medium opacity-60">Total Gold Value</span>
                 <div className="p-2 bg-secondary/20 rounded-lg text-secondary">
                    <Database className="w-4 h-4" />
                 </div>
              </div>
              <div className="text-3xl font-bold mb-1 text-secondary">${(totalVaultGold * goldPricePerGram).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
              <div className="text-sm opacity-50 font-medium">{totalVaultGold.toFixed(3)} g • {(totalVaultGold / 31.1035).toFixed(2)} oz</div>
           </div>

           {/* Card 2: Locked Gold */}
           <div className="p-6 rounded-2xl bg-white shadow-sm border border-border text-foreground relative overflow-hidden">
              <div className="flex justify-between items-start mb-2">
                 <span className="text-sm font-medium opacity-60">Locked Value</span>
                 <div className="p-2 bg-amber-400/20 rounded-lg text-amber-500">
                    <TrendingUp className="w-4 h-4" />
                 </div>
              </div>
              <div className="text-3xl font-bold mb-1">${(finabridgeLockedGrams * goldPricePerGram).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
              <div className="text-sm opacity-50 font-medium space-y-0.5">
                <div>0.00 g in BNSL</div>
                {finabridgeLockedGrams > 0 && (
                  <div className="flex items-center gap-1 text-amber-600">
                    <Briefcase className="w-3 h-3" />
                    {finabridgeLockedGrams.toFixed(3)} g in FinaBridge
                  </div>
                )}
              </div>
           </div>

           {/* Card 3: Value USD */}
           <div className="p-6 rounded-2xl bg-white shadow-sm border border-border text-foreground relative overflow-hidden">
              <div className="flex justify-between items-start mb-2">
                 <span className="text-sm font-medium opacity-60">Available Value (USD)</span>
                 <div className="p-2 bg-green-500/20 rounded-lg text-green-600">
                    <DollarSign className="w-4 h-4" />
                 </div>
              </div>
              <div className="text-3xl font-bold text-secondary mb-1">${((totalVaultGold - finabridgeLockedGrams) * goldPricePerGram).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
              <div className="text-sm opacity-50 font-medium">@ ${goldPricePerGram}/g</div>
           </div>

           {/* Card 4: Value AED */}
           <div className="p-6 rounded-2xl bg-white shadow-sm border border-border text-foreground relative overflow-hidden">
              <div className="flex justify-between items-start mb-2">
                 <span className="text-sm font-medium opacity-60">Available Value (AED)</span>
                 <div className="p-2 bg-blue-500/20 rounded-lg text-blue-600">
                    <Globe className="w-4 h-4" />
                 </div>
              </div>
              <div className="text-3xl font-bold text-foreground mb-1">{((totalVaultGold - finabridgeLockedGrams) * goldPricePerGram * 3.67).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
              <div className="text-sm opacity-50 font-medium">@ {(goldPricePerGram * 3.67).toFixed(2)}/g</div>
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
                </TabsList>

                <TabsContent value="vault-activity" className="mt-0">
                  <VaultActivityList />
                </TabsContent>

                <TabsContent value="my-deposits" className="mt-0">
                  {depositsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <DepositList 
                      requests={apiRequests.length > 0 ? apiRequests : MOCK_REQUESTS} 
                      onSelectRequest={setSelectedRequest}
                      onNewRequest={() => setActiveTab('new-request')}
                    />
                  )}
                </TabsContent>

                <TabsContent value="new-request">
                  <NewDepositForm 
                    onSubmit={handleNewRequest}
                    onCancel={() => setActiveTab('my-deposits')}
                  />
                </TabsContent>

                <TabsContent value="cash-out">
                  <CashOutForm vaultBalance={totalVaultGold} />
                </TabsContent>
              </Tabs>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </DashboardLayout>
  );
}
