import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useFinaPay } from '@/context/FinaPayContext';
import { Receipt, RefreshCw, ArrowLeft, Loader2, AlertCircle, Filter, Search, Download, ShoppingCart, Banknote, ArrowUpRight, ArrowDownLeft, DollarSign, MoreHorizontal, FileSpreadsheet, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import { Transaction } from '@/types/finapay';
import TransactionDetailsModal from '@/components/finapay/modals/TransactionDetailsModal';
import { exportToCSV, exportToPDF } from '@/lib/exportUtils';

export default function FinaPayTransactions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { 
    transactions: rawTransactions, 
    currentGoldPriceUsdPerGram, 
    refreshTransactions,
    loading 
  } = useFinaPay();

  const [filter, setFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const parseNumericValue = (value: any): number => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return isNaN(value) ? 0 : value;
    const parsed = parseFloat(String(value));
    return isNaN(parsed) ? 0 : parsed;
  };

  const formatReferenceId = (id: any): string => {
    if (!id) return 'N/A';
    const idStr = String(id);
    return idStr.length >= 10 ? idStr.substring(0, 10).toUpperCase() : idStr.toUpperCase();
  };

  const transactions: Transaction[] = (rawTransactions || []).map((tx: any) => ({
    id: tx.id || String(Math.random()),
    type: tx.type || 'Transfer',
    amountGrams: tx.amountGold != null ? parseNumericValue(tx.amountGold) : undefined,
    amountUsd: parseNumericValue(tx.amountUsd),
    feeUsd: 0,
    timestamp: tx.createdAt,
    referenceId: formatReferenceId(tx.id),
    status: tx.status || 'Pending',
    assetType: tx.amountGold != null ? 'GOLD' : 'USD',
    description: tx.description || ''
  }));

  const getIcon = (type: string, asset: string = 'USD') => {
    switch (type) {
      case 'Buy': return <ShoppingCart className="w-4 h-4" />;
      case 'Sell': return <Banknote className="w-4 h-4" />;
      case 'Send': return asset === 'GOLD' ? <ArrowUpRight className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />;
      case 'Receive': return <ArrowDownLeft className="w-4 h-4" />;
      default: return <Receipt className="w-4 h-4" />;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'Buy': return 'bg-green-500/10 text-green-500';
      case 'Sell': return 'bg-red-500/10 text-red-500';
      case 'Send': return 'bg-purple-500/10 text-purple-500';
      case 'Receive': return 'bg-blue-500/10 text-blue-500';
      default: return 'bg-gray-500/10 text-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Completed': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'Pending': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'Failed': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'Declined': return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
      default: return 'bg-white/5 text-white/60';
    }
  };

  let filteredTransactions = transactions;
  
  if (filter !== 'All') {
    filteredTransactions = filteredTransactions.filter(t => t.type === filter);
  }
  
  if (statusFilter !== 'All') {
    filteredTransactions = filteredTransactions.filter(t => t.status === statusFilter);
  }
  
  if (searchQuery) {
    filteredTransactions = filteredTransactions.filter(t => 
      t.referenceId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  const handleRefresh = () => {
    refreshTransactions();
    toast({ title: "Refreshing", description: "Updating transactions..." });
  };

  if (!user) return null;

  if (loading && transactions.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Loading transactions...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6 pb-12">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/finapay">
              <Button variant="ghost" size="icon" className="mr-2" data-testid="button-back-finapay">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="p-2 bg-primary/10 rounded-lg border border-primary/20 text-primary">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Transaction History</h1>
              <p className="text-muted-foreground text-sm">View and manage all your FinaPay transactions</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
              data-testid="button-refresh-transactions"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        <Card className="bg-card border border-border">
          <CardHeader className="pb-4 border-b border-border">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{filteredTransactions.length} transactions</span>
                {filter !== 'All' && <Badge variant="secondary">{filter}</Badge>}
                {statusFilter !== 'All' && <Badge variant="secondary">{statusFilter}</Badge>}
              </div>
              
              <div className="flex flex-wrap gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search by reference or description..." 
                    className="h-9 w-[220px] pl-9 bg-background" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    data-testid="input-search-transactions"
                  />
                </div>
                
                <Select value={filter} onValueChange={setFilter}>
                  <SelectTrigger className="h-9 w-[130px]" data-testid="select-filter-type">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Types</SelectItem>
                    <SelectItem value="Buy">Buy</SelectItem>
                    <SelectItem value="Sell">Sell</SelectItem>
                    <SelectItem value="Send">Send</SelectItem>
                    <SelectItem value="Receive">Receive</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 w-[130px]" data-testid="select-filter-status">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Status</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Failed">Failed</SelectItem>
                  </SelectContent>
                </Select>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9" data-testid="button-export">
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem 
                      onClick={() => exportToCSV(filteredTransactions.map(tx => ({
                        id: tx.id,
                        type: tx.type,
                        status: tx.status,
                        amountGold: tx.amountGrams,
                        amountUsd: tx.amountUsd,
                        description: tx.description,
                        referenceId: tx.referenceId,
                        timestamp: tx.timestamp,
                        assetType: tx.assetType
                      })), 'finapay_transactions')}
                      data-testid="button-export-csv"
                    >
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                      Export to CSV
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => exportToPDF(filteredTransactions.map(tx => ({
                        id: tx.id,
                        type: tx.type,
                        status: tx.status,
                        amountGold: tx.amountGrams,
                        amountUsd: tx.amountUsd,
                        description: tx.description,
                        referenceId: tx.referenceId,
                        timestamp: tx.timestamp,
                        assetType: tx.assetType
                      })), 'FinaPay Transaction History')}
                      data-testid="button-export-pdf"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Export to PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              <div className="p-4 space-y-1">
                <div className="grid grid-cols-12 text-xs text-muted-foreground uppercase tracking-wider font-medium px-4 pb-3 border-b border-border">
                  <div className="col-span-4">Transaction</div>
                  <div className="col-span-2">Reference</div>
                  <div className="col-span-2 text-right">Amount</div>
                  <div className="col-span-2 text-center">Status</div>
                  <div className="col-span-2 text-right">Date</div>
                </div>

                {filteredTransactions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <AlertCircle className="w-12 h-12 mb-4 text-muted-foreground/40" />
                    <h3 className="text-lg font-semibold mb-2">No Transactions Found</h3>
                    <p className="text-muted-foreground text-sm max-w-sm">
                      {searchQuery || filter !== 'All' || statusFilter !== 'All' 
                        ? 'Try adjusting your filters to see more results.'
                        : 'Your transaction history will appear here once you make your first transaction.'}
                    </p>
                  </div>
                ) : (
                  filteredTransactions.map((tx) => (
                    <div 
                      key={tx.id} 
                      onClick={() => setSelectedTx(tx)}
                      className="grid grid-cols-12 items-center p-4 rounded-lg hover:bg-muted/50 transition-colors group border border-transparent hover:border-border cursor-pointer"
                      data-testid={`transaction-row-${tx.id}`}
                    >
                      <div className="col-span-4 flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${getColor(tx.type)}`}>
                          {getIcon(tx.type, tx.assetType)}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{tx.type} {tx.assetType === 'GOLD' ? 'Gold' : 'USD'}</p>
                          {tx.description && <p className="text-xs text-muted-foreground truncate max-w-[180px]">{tx.description}</p>}
                        </div>
                      </div>
                      
                      <div className="col-span-2">
                        <p className="text-sm font-mono text-muted-foreground">{tx.referenceId}</p>
                      </div>
                      
                      <div className="col-span-2 text-right">
                        {tx.assetType === 'GOLD' ? (
                          <>
                            <p className="font-semibold text-foreground">{tx.amountGrams?.toFixed(3)} g</p>
                            <p className="text-xs text-muted-foreground">${tx.amountUsd.toFixed(2)}</p>
                          </>
                        ) : (
                          <p className="font-semibold text-foreground">${tx.amountUsd.toFixed(2)}</p>
                        )}
                      </div>

                      <div className="col-span-2 flex justify-center">
                        <Badge variant="outline" className={`text-xs px-2 ${getStatusColor(tx.status)}`}>
                          {tx.status}
                        </Badge>
                      </div>

                      <div className="col-span-2 text-right">
                        <p className="text-sm text-foreground">{new Date(tx.timestamp).toLocaleDateString()}</p>
                        <p className="text-xs text-muted-foreground">{new Date(tx.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <TransactionDetailsModal 
        isOpen={!!selectedTx} 
        transaction={selectedTx} 
        onClose={() => setSelectedTx(null)} 
      />
    </DashboardLayout>
  );
}
