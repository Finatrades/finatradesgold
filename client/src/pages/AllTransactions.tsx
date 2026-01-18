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
  ChevronRight, ChevronDown, Filter, Calendar, AlertCircle, ArrowLeftRight
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
  goldWalletType?: 'LGPW' | 'FGPW' | null;
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
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [syncStatus, setSyncStatus] = useState<'syncing' | 'updated' | 'error'>('updated');

  const toggleRowExpand = (txId: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(txId)) {
        next.delete(txId);
      } else {
        next.add(txId);
      }
      return next;
    });
  };

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center justify-between sm:justify-start gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground" data-testid="text-page-title">Transaction History</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Complete history of all your transactions</p>
          </div>
          {getSyncStatusIndicator()}
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          data-testid="button-refresh"
          className="w-full sm:w-auto"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <Tabs value={selectedModule} onValueChange={setSelectedModule} className="w-full lg:w-auto">
              <TabsList className="flex flex-wrap h-auto gap-1 p-1 w-full lg:w-auto" data-testid="tabs-module">
                <TabsTrigger value="all" className="text-xs sm:text-sm px-2 sm:px-3" data-testid="tab-all">All</TabsTrigger>
                <TabsTrigger value="finapay" className="text-xs sm:text-sm px-2 sm:px-3" data-testid="tab-finapay">FinaPay</TabsTrigger>
                <TabsTrigger value="finavault" className="text-xs sm:text-sm px-2 sm:px-3" data-testid="tab-finavault">FinaVault</TabsTrigger>
                <TabsTrigger value="bnsl" className="text-xs sm:text-sm px-2 sm:px-3" data-testid="tab-bnsl">BNSL</TabsTrigger>
                <TabsTrigger value="finabridge" className="text-xs sm:text-sm px-2 sm:px-3" data-testid="tab-finabridge">FinaBridge</TabsTrigger>
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
                <SelectTrigger className="w-full sm:w-[130px] h-9" data-testid="select-status">
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
                <SelectTrigger className="w-full sm:w-[130px] h-9" data-testid="select-type">
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
              <div>
                {/* Banking-style Table Header - Hidden on mobile */}
                <div className="hidden md:grid grid-cols-14 gap-3 px-4 py-3 bg-muted/40 border-b text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <div className="col-span-2">Date</div>
                  <div className="col-span-3">Description</div>
                  <div className="col-span-2 text-right">Debit</div>
                  <div className="col-span-2 text-right">Credit</div>
                  <div className="col-span-2 text-right">Balance USD</div>
                  <div className="col-span-2 text-center">Status</div>
                  <div className="col-span-1 text-center">Action</div>
                </div>
                
                {/* Transaction Rows */}
                <div className="divide-y divide-border">
                {(() => {
                  let runningBalance = 0;
                  return filteredTransactions.map((tx) => {
                  const isSwap = tx.description?.includes('LGPW to FGPW') || tx.description?.includes('FGPW to LGPW');
                  const isDebit = !isSwap && ['SEND', 'Send', 'WITHDRAW', 'Withdrawal', 'SELL', 'Sell', 'LOCK'].includes(tx.actionType);
                  const isCredit = !isSwap && (['ADD_FUNDS', 'Deposit', 'RECEIVE', 'Receive', 'BUY', 'Buy', 'UNLOCK'].includes(tx.actionType) ||
                                   tx.actionType === 'ADD_FUNDS' ||
                                   tx.description?.includes('Crypto deposit'));
                  
                  const goldAmount = tx.grams ? parseFloat(tx.grams) : (tx.usd && currentGoldPrice > 0 ? parseFloat(tx.usd) / currentGoldPrice : 0);
                  const usdAmount = tx.usd ? parseFloat(tx.usd) : 0;
                  const isCompleted = tx.status?.toUpperCase() === 'COMPLETED';
                  
                  // Only include COMPLETED transactions in running balance
                  if (isCompleted) {
                    if (isCredit) runningBalance += usdAmount;
                    else if (isDebit) runningBalance -= usdAmount;
                  }
                  const currentBalance = isCompleted ? runningBalance : null;
                  
                  return (
                  <div key={tx.id} data-testid={`row-tx-${tx.id}`}>
                    {/* Mobile Card Layout */}
                    <div
                      onClick={() => toggleRowExpand(tx.id)}
                      className="md:hidden px-4 py-4 hover:bg-muted/30 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-full shrink-0 ${
                          isSwap ? 'bg-purple-100' : isCredit ? 'bg-green-100' : isDebit ? 'bg-gray-100' : 'bg-purple-100'
                        }`}>
                          {isSwap ? (
                            <ArrowLeftRight className="w-4 h-4 text-purple-600" />
                          ) : isCredit ? (
                            <ArrowDownLeft className="w-4 h-4 text-green-600" />
                          ) : isDebit ? (
                            <ArrowUpRight className="w-4 h-4 text-gray-600" />
                          ) : (
                            getActionIcon(tx.actionType)
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-foreground text-sm truncate">
                                {isSwap ? 'Swap Gold' : getActionLabel(tx.actionType, tx.module)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(tx.createdAt), 'MMM dd, yyyy')} · {format(new Date(tx.createdAt), 'hh:mm a')}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              {isSwap ? (
                                <p className="font-semibold text-amber-600 text-sm">{goldAmount.toFixed(4)}g</p>
                              ) : isCredit && goldAmount > 0 ? (
                                <p className="font-semibold text-green-600 text-sm">+{goldAmount.toFixed(4)}g</p>
                              ) : isDebit && goldAmount > 0 ? (
                                <p className="font-semibold text-foreground text-sm">-{goldAmount.toFixed(4)}g</p>
                              ) : (
                                <p className="text-sm text-muted-foreground">—</p>
                              )}
                              {usdAmount > 0 && (
                                <p className="text-xs text-muted-foreground">${usdAmount.toFixed(2)}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            {getStatusBadge(tx.status)}
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <span>Balance: {currentBalance !== null ? `$${Math.abs(currentBalance).toFixed(2)}` : '--'}</span>
                              {expandedRows.has(tx.id) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Desktop Table Row Layout */}
                    <div
                      onClick={() => toggleRowExpand(tx.id)}
                      className="hidden md:grid grid-cols-14 gap-3 px-4 py-4 hover:bg-muted/30 transition-colors cursor-pointer items-center"
                    >
                      {/* DATE Column */}
                      <div className="col-span-2">
                        <p className="text-sm font-medium text-foreground">
                          {format(new Date(tx.createdAt), 'MMM dd, yyyy')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(tx.createdAt), 'hh:mm a')}
                        </p>
                      </div>
                      
                      {/* DESCRIPTION Column */}
                      <div className="col-span-3 flex items-center gap-3">
                        <div className={`p-2 rounded-full ${
                          isSwap ? 'bg-purple-100' : isCredit ? 'bg-green-100' : isDebit ? 'bg-gray-100' : 'bg-purple-100'
                        }`}>
                          {isSwap ? (
                            <ArrowLeftRight className="w-4 h-4 text-purple-600" />
                          ) : isCredit ? (
                            <ArrowDownLeft className="w-4 h-4 text-green-600" />
                          ) : isDebit ? (
                            <ArrowUpRight className="w-4 h-4 text-gray-600" />
                          ) : (
                            getActionIcon(tx.actionType)
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <p className="font-semibold text-foreground truncate">
                              {isSwap ? 'Swap Gold' : getActionLabel(tx.actionType, tx.module)}
                            </p>
                            {expandedRows.has(tx.id) ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {isSwap 
                              ? `LGPW to FGPW conversion: ${goldAmount.toFixed(2)}g` 
                              : tx.description?.includes('Crypto deposit')
                                ? `Crypto deposit - $${usdAmount.toFixed(2)} (${goldAmount.toFixed(2)}g)`
                                : tx.description || tx.referenceId || '-'}
                          </p>
                        </div>
                      </div>
                      
                      {/* DEBIT Column */}
                      <div className="col-span-2 text-right">
                        {isSwap ? (
                          <>
                            <p className="font-semibold text-amber-600">{goldAmount.toFixed(4)} g</p>
                            <p className="text-xs text-muted-foreground">from LGPW</p>
                          </>
                        ) : isDebit && goldAmount > 0 ? (
                          <>
                            <p className="font-semibold text-foreground">{goldAmount.toFixed(4)} g</p>
                            {usdAmount > 0 && (
                              <p className="text-xs text-muted-foreground">${usdAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            )}
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground">—</p>
                        )}
                      </div>
                      
                      {/* CREDIT Column */}
                      <div className="col-span-2 text-right">
                        {isSwap ? (
                          <>
                            <p className="font-semibold text-green-600">{goldAmount.toFixed(4)} g</p>
                            <p className="text-xs text-muted-foreground">to FGPW</p>
                          </>
                        ) : isCredit && goldAmount > 0 ? (
                          <>
                            <p className="font-semibold text-green-600">{goldAmount.toFixed(4)} g</p>
                            {usdAmount > 0 && (
                              <p className="text-xs text-muted-foreground">${usdAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            )}
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground">—</p>
                        )}
                      </div>
                      
                      {/* BALANCE USD Column */}
                      <div className="col-span-2 text-right">
                        {currentBalance !== null ? (
                          <>
                            <p className="font-semibold text-foreground">
                              ${Math.abs(currentBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            <p className="text-xs text-muted-foreground">≈ {(currentBalance / currentGoldPrice).toFixed(2)}g</p>
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground">--</p>
                        )}
                      </div>
                      
                      {/* STATUS Column */}
                      <div className="col-span-2 flex justify-center">
                        {getStatusBadge(tx.status)}
                      </div>
                      
                      {/* ACTION Column */}
                      <div className="col-span-1 flex justify-center">
                        <button 
                          className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                          onClick={(e) => { e.stopPropagation(); toggleRowExpand(tx.id); }}
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <circle cx="10" cy="4" r="1.5" />
                            <circle cx="10" cy="10" r="1.5" />
                            <circle cx="10" cy="16" r="1.5" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    
                    {/* Expanded Details Row */}
                    {expandedRows.has(tx.id) && (
                      <div className="px-4 pb-4 pt-0 bg-muted/30 border-t border-dashed">
                        {/* Special display for LGPW to FGPW conversions */}
                        {tx.description?.includes('LGPW to FGPW') ? (
                          <div className="space-y-3 mt-2">
                            {/* Full Reference ID */}
                            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Full Reference ID</p>
                              <p className="text-xs sm:text-sm font-mono text-foreground break-all">{tx.referenceId || tx.id}</p>
                              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-2 text-xs sm:text-sm">
                                <span className="text-muted-foreground">Date & Time:</span>
                                <span className="font-medium">{format(new Date(tx.createdAt), 'MM/dd/yyyy, h:mm:ss a')}</span>
                              </div>
                            </div>
                            
                            {/* Sell Gold from LGPW */}
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <ArrowUpRight className="w-4 h-4 text-red-600" />
                                <span className="font-semibold text-red-700">Sell Gold (from LGPW)</span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                                <div>
                                  <p className="text-xs text-muted-foreground">Gold Amount</p>
                                  <p className="font-semibold text-red-600">{tx.grams ? parseFloat(tx.grams).toFixed(6) : '0'}g</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Market Price</p>
                                  <p className="font-semibold">${tx.usdPerGram ? parseFloat(tx.usdPerGram).toFixed(2) : '0'}/g</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Value</p>
                                  <p className="font-semibold">${tx.usd ? parseFloat(tx.usd).toFixed(2) : '0'}</p>
                                </div>
                              </div>
                            </div>
                            
                            {/* Credit Gold to FGPW */}
                            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <ArrowDownLeft className="w-4 h-4 text-green-600" />
                                <span className="font-semibold text-green-700 text-sm">Credit Gold (to FGPW)</span>
                                <Badge className="bg-amber-100 text-amber-700 text-xs">Digital Gold Lock</Badge>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                                <div>
                                  <p className="text-xs text-muted-foreground">Gold Amount</p>
                                  <p className="font-semibold text-green-600">{tx.grams ? parseFloat(tx.grams).toFixed(6) : '0'}g</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Locked Price</p>
                                  <p className="font-semibold text-amber-600">${tx.usdPerGram ? parseFloat(tx.usdPerGram).toFixed(2) : '0'}/g</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Locked Value</p>
                                  <p className="font-semibold text-amber-600">${tx.usd ? parseFloat(tx.usd).toFixed(2) : '0'}</p>
                                </div>
                              </div>
                              <p className="text-xs text-green-600 mt-2">
                                Digital Ownership Certificate generated for this lock
                              </p>
                            </div>
                          </div>
                        ) : (
                          /* Standard expanded details for other transactions */
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-white rounded-lg border mt-2">
                            <div>
                              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Full Reference ID</p>
                              <p className="text-sm font-mono text-foreground break-all">{tx.referenceId || tx.id}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Date & Time</p>
                              <p className="text-sm text-foreground">{format(new Date(tx.createdAt), 'MM/dd/yyyy, h:mm:ss a')}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Gold Price at Transaction</p>
                              <p className="text-sm font-semibold text-foreground">
                                {tx.usdPerGram ? `$${parseFloat(tx.usdPerGram).toFixed(2)}/g` : 'N/A'}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Wallet Type</p>
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${
                                  (tx.goldWalletType || 'LGPW') === 'LGPW' 
                                    ? 'bg-blue-50 text-blue-600 border-blue-200' 
                                    : 'bg-amber-50 text-amber-600 border-amber-200'
                                }`}
                              >
                                {tx.goldWalletType === 'FGPW' ? 'FGPW (Fixed Price)' : 'LGPW (Market Price)'}
                              </Badge>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  );
                });
                })()}
                </div>
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
