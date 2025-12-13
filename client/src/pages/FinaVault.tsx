import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { Database, TrendingUp, History, PlusCircle, Bell, Settings, Banknote, Briefcase, Loader2 } from 'lucide-react';
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
        
        {/* Professional Wallet Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Total Vault Holdings - Primary Card */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 p-6 text-white shadow-lg">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <Database className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium text-white/80">Total Vault Holdings</span>
                </div>
              </div>
              
              <div className="mb-1">
                <span className="text-4xl font-bold tracking-tight">
                  ${(totalVaultGold * goldPricePerGram).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              
              <div className="text-white/70 text-sm font-medium">
                {totalVaultGold.toFixed(4)} g Gold
              </div>
              
              <div className="mt-4 pt-4 border-t border-white/20 flex items-center justify-between text-sm">
                <div>
                  <span className="text-white/60">Troy Ounces</span>
                  <p className="font-semibold">{(totalVaultGold / 31.1035).toFixed(4)} oz</p>
                </div>
                <div className="text-right">
                  <span className="text-white/60">Price/g</span>
                  <p className="font-semibold">${goldPricePerGram.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Locked Assets */}
          <div className="relative overflow-hidden rounded-2xl bg-white border border-border p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Briefcase className="w-5 h-5 text-amber-600" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">Locked Assets</span>
              </div>
            </div>
            
            <div className="mb-1">
              <span className="text-3xl font-bold text-amber-600 tracking-tight">
                ${(finabridgeLockedGrams * goldPricePerGram).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            
            <div className="text-muted-foreground text-sm font-medium">
              {finabridgeLockedGrams.toFixed(4)} g Gold
            </div>
            
            <div className="mt-4 pt-4 border-t border-border space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">BNSL Locked</span>
                <span className="font-medium">$0.00</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Trade Finance</span>
                <span className="font-medium">${(finabridgeLockedGrams * goldPricePerGram).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Available Balance */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 p-6 text-white shadow-lg">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium text-white/70">Available Balance</span>
                </div>
              </div>
              
              <div className="mb-1">
                <span className="text-3xl font-bold tracking-tight">
                  ${((totalVaultGold - finabridgeLockedGrams) * goldPricePerGram).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              
              <div className="text-white/60 text-sm font-medium">
                {(totalVaultGold - finabridgeLockedGrams).toFixed(4)} g Gold
              </div>
              
              <div className="mt-4 pt-4 border-t border-white/20 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-white/60">In AED</span>
                  <span className="font-medium">{((totalVaultGold - finabridgeLockedGrams) * goldPricePerGram * 3.67).toLocaleString(undefined, { minimumFractionDigits: 2 })} AED</span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-white/60">Rate</span>
                  <span className="font-medium text-green-400">1 USD = 3.67 AED</span>
                </div>
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
