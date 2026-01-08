import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { 
  Search, RefreshCw, ArrowUpRight, ArrowDownLeft, Lock, Unlock, 
  Plus, Wallet, Shield, TrendingUp, CheckCircle2, Clock, XCircle,
  ChevronRight, Filter, Calendar, AlertCircle
} from 'lucide-react';

interface UnifiedTransaction {
  id: string;
  userId: string;
  module: string;
  actionType: string;
  grams: string | null;
  usd: string | null;
  usdPerGram: string | null;
  status: string;
  referenceId: string | null;
  description: string | null;
  counterpartyUserId: string | null;
  createdAt: string;
  completedAt: string | null;
  sourceType: string;
  goldWalletType?: 'MPGW' | 'FPGW' | null;
}

interface Totals {
  totalGrams: number;
  totalUSD: number;
  count: number;
}

// Helper to convert action types to user-friendly display labels
const getActionLabel = (actionType: string, module: string, description?: string | null): string => {
  const action = actionType?.toUpperCase() || '';
  // Physical gold deposits from FinaVault
  if (action === 'DEPOSIT_PHYSICAL_GOLD') {
    return 'Deposit Physical Gold';
  }
  // ADD_FUNDS via bank/card/crypto should be "Acquire Gold"
  if (action === 'ADD_FUNDS') {
    return 'Acquire Gold';
  }
  // Default: convert underscores to spaces and title case
  return actionType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

export default function AllTransactions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedModule, setSelectedModule] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTx, setSelectedTx] = useState<UnifiedTransaction | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [syncStatus, setSyncStatus] = useState<'syncing' | 'updated' | 'error'>('updated');

  const { data, isLoading, isFetching, refetch, error } = useQuery<{
    transactions: UnifiedTransaction[];
    totals: Totals;
    nextCursor: string | null;
  }>({
    queryKey: ['unified-transactions', user?.id, selectedModule, statusFilter, typeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedModule !== 'all') params.set('module', selectedModule);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (typeFilter !== 'all') params.set('type', typeFilter);
      
      const res = await fetch(`/api/unified-transactions/${user?.id}?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch transactions');
      return res.json();
    },
    enabled: !!user?.id,
    staleTime: 15000,
    refetchOnWindowFocus: true,
    refetchInterval: 30000,
  });

  const { data: goldPriceData } = useQuery<{ pricePerGram: number }>({
    queryKey: ['gold-price'],
    queryFn: async () => {
      const res = await fetch('/api/gold-price');
      if (!res.ok) throw new Error('Failed to fetch gold price');
      return res.json();
    },
    staleTime: 30000,
  });
  const currentGoldPrice = goldPriceData?.pricePerGram || 85;

  useEffect(() => {
    if (isFetching) {
      setSyncStatus('syncing');
    } else if (error) {
      setSyncStatus('error');
    } else {
      setSyncStatus('updated');
      setLastUpdated(new Date());
    }
  }, [isFetching, error]);

  const transactions = data?.transactions || [];
  const totals = data?.totals || { totalGrams: 0, totalUSD: 0, count: 0 };

  const filteredTransactions = transactions.filter(tx => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      tx.referenceId?.toLowerCase().includes(query) ||
      tx.description?.toLowerCase().includes(query) ||
      tx.actionType.toLowerCase().includes(query)
    );
  });

  const getModuleIcon = (module: string) => {
    switch (module) {
      case 'finapay': return <Wallet className="w-4 h-4" />;
      case 'finavault': return <Shield className="w-4 h-4" />;
      case 'bnsl': return <TrendingUp className="w-4 h-4" />;
      case 'finabridge': return <ArrowUpRight className="w-4 h-4" />;
      default: return <Wallet className="w-4 h-4" />;
    }
  };

  const getModuleColor = (module: string) => {
    switch (module) {
      case 'finapay': return 'bg-blue-100 text-blue-700';
      case 'finavault': return 'bg-purple-100 text-fuchsia-700';
      case 'bnsl': return 'bg-purple-100 text-purple-700';
      case 'finabridge': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'ADD_FUNDS':
      case 'Deposit': return <Plus className="w-4 h-4 text-green-500" />;
      case 'SEND':
      case 'Send': return <ArrowUpRight className="w-4 h-4 text-red-500" />;
      case 'RECEIVE':
      case 'Receive': return <ArrowDownLeft className="w-4 h-4 text-green-500" />;
      case 'LOCK':
      case 'Buy': return <Lock className="w-4 h-4 text-purple-500" />;
      case 'UNLOCK':
      case 'Sell': return <Unlock className="w-4 h-4 text-blue-500" />;
      case 'BUY_GOLD_BAR': return <Plus className="w-4 h-4 text-purple-500" />;
      default: return <Wallet className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'COMPLETED':
        return <Badge className="bg-green-100 text-green-700"><CheckCircle2 className="w-3 h-3 mr-1" /> Completed</Badge>;
      case 'PENDING':
        return <Badge className="bg-purple-100 text-fuchsia-700"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case 'LOCKED':
        return <Badge className="bg-blue-100 text-blue-700"><Lock className="w-3 h-3 mr-1" /> Locked</Badge>;
      case 'FAILED':
        return <Badge className="bg-red-100 text-red-700"><XCircle className="w-3 h-3 mr-1" /> Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSyncStatusIndicator = () => {
    switch (syncStatus) {
      case 'syncing':
        return <span className="flex items-center gap-1.5 text-xs text-blue-600"><RefreshCw className="w-3 h-3 animate-spin" /> Syncing...</span>;
      case 'error':
        return <span className="flex items-center gap-1.5 text-xs text-red-600"><AlertCircle className="w-3 h-3" /> Error</span>;
      default:
        return <span className="flex items-center gap-1.5 text-xs text-green-600"><CheckCircle2 className="w-3 h-3" /> Updated {format(lastUpdated, 'HH:mm:ss')}</span>;
    }
  };

  const formatModuleName = (module: string) => {
    switch (module) {
      case 'finapay': return 'FinaPay';
      case 'finavault': return 'FinaVault';
      case 'bnsl': return 'BNSL';
      case 'finabridge': return 'FinaBridge';
      default: return module;
    }
  };

  // Get transfer badges for Send/Receive transactions
  const getTransferBadges = (tx: UnifiedTransaction) => {
    const action = tx.actionType?.toUpperCase() || '';
    const description = tx.description?.toLowerCase() || '';
    
    // For Send transactions, show "Sent" badge and destination module
    if (action === 'SEND') {
      let destModule = '';
      if (description.includes('to bnsl')) destModule = 'bnsl';
      else if (description.includes('to finabridge')) destModule = 'finabridge';
      else if (description.includes('to finavault')) destModule = 'finavault';
      else if (description.includes('to finapay')) destModule = 'finapay';
      
      return (
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="text-xs bg-red-50 text-red-600 border-red-200">
            <ArrowUpRight className="w-3 h-3 mr-0.5" />
            Sent
          </Badge>
          {destModule && (
            <Badge variant="outline" className={`text-xs ${getModuleColor(destModule)}`}>
              {getModuleIcon(destModule)}
              <span className="ml-1">{formatModuleName(destModule)}</span>
            </Badge>
          )}
        </div>
      );
    }
    
    // For Receive transactions, show "Received" badge and source module
    if (action === 'RECEIVE') {
      let srcModule = '';
      if (description.includes('from bnsl')) srcModule = 'bnsl';
      else if (description.includes('from finabridge')) srcModule = 'finabridge';
      else if (description.includes('from finavault')) srcModule = 'finavault';
      else if (description.includes('from finapay')) srcModule = 'finapay';
      
      return (
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="text-xs bg-green-50 text-green-600 border-green-200">
            <ArrowDownLeft className="w-3 h-3 mr-0.5" />
            Received
          </Badge>
          {srcModule && (
            <Badge variant="outline" className={`text-xs ${getModuleColor(srcModule)}`}>
              {getModuleIcon(srcModule)}
              <span className="ml-1">{formatModuleName(srcModule)}</span>
            </Badge>
          )}
        </div>
      );
    }
    
    // Default: show module badge only
    return (
      <Badge variant="outline" className={`text-xs ${getModuleColor(tx.module)}`}>
        {getModuleIcon(tx.module)}
        <span className="ml-1">{formatModuleName(tx.module)}</span>
      </Badge>
    );
  };

  return (
    <DashboardLayout>
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-page-title">All Transactions</h1>
          <p className="text-sm text-muted-foreground">View all your transactions across all modules</p>
        </div>
        <div className="flex items-center gap-4">
          {getSyncStatusIndicator()}
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            data-testid="button-refresh"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Card className="shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <Tabs value={selectedModule} onValueChange={setSelectedModule} className="w-full lg:w-auto">
              <TabsList className="grid grid-cols-5 w-full lg:w-auto" data-testid="tabs-module">
                <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
                <TabsTrigger value="finapay" data-testid="tab-finapay">FinaPay</TabsTrigger>
                <TabsTrigger value="finavault" data-testid="tab-finavault">FinaVault</TabsTrigger>
                <TabsTrigger value="bnsl" data-testid="tab-bnsl">BNSL</TabsTrigger>
                <TabsTrigger value="finabridge" data-testid="tab-finabridge">FinaBridge</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                  data-testid="input-search"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px] h-9" data-testid="select-status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="LOCKED">Locked</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[130px] h-9" data-testid="select-type">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="ADD_FUNDS">Add Funds</SelectItem>
                  <SelectItem value="SEND">Send</SelectItem>
                  <SelectItem value="RECEIVE">Receive</SelectItem>
                  <SelectItem value="LOCK">Lock</SelectItem>
                  <SelectItem value="UNLOCK">Unlock</SelectItem>
                  <SelectItem value="Buy">Buy</SelectItem>
                  <SelectItem value="Sell">Sell</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <AlertCircle className="w-12 h-12 mb-4 text-muted-foreground/40" />
                <h3 className="text-lg font-semibold mb-2">No Transactions Found</h3>
                <p className="text-muted-foreground text-sm max-w-sm">
                  {searchQuery || selectedModule !== 'all' || statusFilter !== 'all' || typeFilter !== 'all'
                    ? 'Try adjusting your filters to see more results.'
                    : 'Your transaction history will appear here once you make your first transaction.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    onClick={() => setSelectedTx(tx)}
                    className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors cursor-pointer group"
                    data-testid={`row-tx-${tx.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2.5 rounded-xl ${getModuleColor(tx.module)}`}>
                        {getActionIcon(tx.actionType)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-semibold text-foreground">{getActionLabel(tx.actionType, tx.module)}</span>
                          {getTransferBadges(tx)}
                          {tx.goldWalletType && (
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                tx.goldWalletType === 'MPGW' 
                                  ? 'bg-blue-50 text-blue-600 border-blue-200' 
                                  : 'bg-amber-50 text-amber-600 border-amber-200'
                              }`}
                            >
                              {tx.goldWalletType}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{tx.description || tx.referenceId || 'No description'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        {tx.grams ? (
                          <p className="font-semibold text-foreground">{parseFloat(tx.grams).toFixed(4)}g</p>
                        ) : tx.usd && currentGoldPrice > 0 ? (
                          <p className="font-semibold text-foreground">~{(parseFloat(tx.usd) / currentGoldPrice).toFixed(2)}g</p>
                        ) : null}
                        {tx.usd && (
                          <p className="text-sm text-muted-foreground">${parseFloat(tx.usd).toFixed(2)}</p>
                        )}
                        {!tx.grams && !tx.usd && (
                          <p className="text-sm text-muted-foreground">-</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {getStatusBadge(tx.status)}
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(tx.createdAt), 'MMM d, yyyy HH:mm')}
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={!!selectedTx} onOpenChange={() => setSelectedTx(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
            <DialogDescription>Full details for this transaction</DialogDescription>
          </DialogHeader>
          {selectedTx && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${getModuleColor(selectedTx.module)}`}>
                    {getActionIcon(selectedTx.actionType)}
                  </div>
                  <div>
                    <p className="font-semibold">{getActionLabel(selectedTx.actionType, selectedTx.module)}</p>
                    <Badge variant="outline" className={`text-xs ${getModuleColor(selectedTx.module)}`}>
                      {formatModuleName(selectedTx.module)}
                    </Badge>
                  </div>
                </div>
                {getStatusBadge(selectedTx.status)}
              </div>

              {selectedTx.status === 'Pending' && !selectedTx.grams && selectedTx.usd && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm">
                  <p className="font-medium text-fuchsia-800 mb-1">Important Notice:</p>
                  <p className="text-fuchsia-700 text-xs leading-relaxed">
                    Gold price shown is tentative. Final rate will be recalculated upon fund receipt. 
                    After verification, gold will be deposited to your FinaPay wallet at the final confirmed rate.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {selectedTx.grams ? (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Gold Amount</p>
                    <p className="font-semibold text-fuchsia-600">{parseFloat(selectedTx.grams).toFixed(6)}g</p>
                  </div>
                ) : selectedTx.usd && currentGoldPrice > 0 ? (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Gold Amount (Est.)</p>
                    <p className="font-semibold text-fuchsia-600">~{(parseFloat(selectedTx.usd) / currentGoldPrice).toFixed(4)}g</p>
                  </div>
                ) : null}
                {selectedTx.usd && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">USD Value</p>
                    <p className="font-semibold text-green-600">${parseFloat(selectedTx.usd).toFixed(2)}</p>
                  </div>
                )}
                {selectedTx.usdPerGram && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Gold Price</p>
                    <p className="font-semibold">${parseFloat(selectedTx.usdPerGram).toFixed(2)}/g</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Date</p>
                  <p className="font-semibold">{format(new Date(selectedTx.createdAt), 'MMM d, yyyy HH:mm')}</p>
                </div>
              </div>

              {selectedTx.referenceId && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Reference ID</p>
                  <p className="font-mono text-sm bg-muted p-2 rounded">{selectedTx.referenceId}</p>
                </div>
              )}

              {selectedTx.description && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Description</p>
                  <p className="text-sm">{selectedTx.description}</p>
                </div>
              )}

              {selectedTx.completedAt && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Completed At</p>
                  <p className="text-sm">{format(new Date(selectedTx.completedAt), 'MMM d, yyyy HH:mm:ss')}</p>
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
