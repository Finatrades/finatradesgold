import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Transaction } from '@/types/finapay';
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, ShoppingCart, Banknote, RefreshCcw, History, Filter, Download, Search, MoreHorizontal, DollarSign, FileText, FileSpreadsheet } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import TransactionDetailsModal from './modals/TransactionDetailsModal';
import { exportToCSV, exportToPDF } from '@/lib/exportUtils';

interface TransactionHistoryProps {
  transactions: Transaction[];
  goldPrice?: number;
}

export default function TransactionHistory({ transactions, goldPrice = 85 }: TransactionHistoryProps) {
  const [filter, setFilter] = useState('All');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  
  const getIcon = (type: string, asset: string = 'USD', isSwap: boolean = false) => {
    if (isSwap) return <ArrowLeftRight className="w-4 h-4" />;
    switch (type) {
      case 'Buy': return <ShoppingCart className="w-4 h-4" />;
      case 'Deposit': return <ArrowDownLeft className="w-4 h-4" />;
      case 'Sell': return <Banknote className="w-4 h-4" />;
      case 'Send': return asset === 'GOLD' ? <ArrowUpRight className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />;
      case 'Receive': return <ArrowDownLeft className="w-4 h-4" />;
      case 'Request': return <RefreshCcw className="w-4 h-4" />;
      default: return <History className="w-4 h-4" />;
    }
  };

  const getColor = (type: string, isSwap: boolean = false) => {
    if (isSwap) return 'bg-purple-500/10 text-purple-600';
    switch (type) {
      case 'Buy': return 'bg-green-500/10 text-green-500';
      case 'Deposit': return 'bg-green-500/10 text-green-500';
      case 'Sell': return 'bg-red-500/10 text-red-500';
      case 'Send': return 'bg-purple-500/10 text-purple-500';
      case 'Receive': return 'bg-blue-500/10 text-blue-500';
      case 'Request': return 'bg-purple-500/10 text-purple-500';
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

  const filteredTransactions = filter === 'All' 
    ? transactions 
    : transactions.filter(t => t.type === filter);

  return (
    <>
      <Card className="bg-white shadow-sm border border-border h-full flex flex-col">
        <CardHeader className="pb-4 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-lg font-medium text-foreground flex items-center gap-2">
              <History className="w-5 h-5 text-secondary" />
              Transaction History
            </CardTitle>
            
            <div className="flex flex-wrap gap-2">
               <div className="relative flex-1 sm:flex-none">
                 <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                 <Input placeholder="Search ref..." className="h-8 w-full sm:w-[140px] pl-8 bg-background border-input text-xs" />
               </div>
               
               <DropdownMenu>
                 <DropdownMenuTrigger asChild>
                   <Button variant="outline" size="sm" className="h-8 bg-background border-border text-muted-foreground">
                     <Filter className="w-3.5 h-3.5 mr-2" />
                     {filter}
                   </Button>
                 </DropdownMenuTrigger>
                 <DropdownMenuContent className="bg-popover border-border text-foreground">
                   <DropdownMenuItem onClick={() => setFilter('All')}>All</DropdownMenuItem>
                   <DropdownMenuItem onClick={() => setFilter('Deposit')}>Deposit</DropdownMenuItem>
                   <DropdownMenuItem onClick={() => setFilter('Buy')}>Buy</DropdownMenuItem>
                   <DropdownMenuItem onClick={() => setFilter('Sell')}>Sell</DropdownMenuItem>
                   <DropdownMenuItem onClick={() => setFilter('Send')}>Send</DropdownMenuItem>
                 </DropdownMenuContent>
               </DropdownMenu>

               <DropdownMenu>
                 <DropdownMenuTrigger asChild>
                   <Button variant="outline" size="sm" className="h-8 bg-background border-border text-muted-foreground" data-testid="button-export-dropdown">
                     <Download className="w-3.5 h-3.5 mr-2" />
                     Export
                   </Button>
                 </DropdownMenuTrigger>
                 <DropdownMenuContent className="bg-popover border-border text-foreground">
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
        
        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-[400px]">
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">No transactions found</div>
            ) : (
              <div>
                {/* Mobile Card Layout */}
                <div className="md:hidden divide-y divide-border">
                  {(() => {
                    let runningBalance = 0;
                    return filteredTransactions.map((tx, index) => {
                      const isSwap = tx.type === 'Swap' || tx.description?.includes('LGPW to FGPW') || tx.description?.includes('FGPW to LGPW');
                      const isDebit = !isSwap && (tx.type === 'Send' || tx.type === 'Sell' || tx.type === 'Withdrawal');
                      const isCredit = !isSwap && (tx.type === 'Receive' || tx.type === 'Buy' || tx.type === 'Deposit');
                      const isCompleted = tx.status?.toLowerCase() === 'completed';
                      
                      // Only include COMPLETED transactions in running balance
                      if (isCompleted) {
                        if (isCredit) runningBalance += tx.amountUsd;
                        else if (isDebit) runningBalance -= tx.amountUsd;
                      }
                      const currentBalance = isCompleted ? runningBalance : null;
                      
                      const transactionLabel = isSwap
                        ? 'Swap Gold'
                        : tx.description?.includes('FinaVault') || tx.description?.includes('physical gold')
                        ? 'Deposit Physical Gold'
                        : (tx.type === 'Deposit' || tx.type === 'Buy')
                        ? 'Acquire Gold' 
                        : `${tx.type} ${tx.assetType === 'GOLD' || (tx.amountGrams && tx.amountGrams > 0) ? 'Gold' : 'USD'}`;
                      
                      return (
                        <div 
                          key={tx.id}
                          onClick={() => setSelectedTx(tx)}
                          className="px-4 py-4 hover:bg-muted/30 transition-colors cursor-pointer"
                          data-testid={`transaction-card-${tx.id}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getColor(tx.type, isSwap)}`}>
                              {getIcon(tx.type, tx.assetType, isSwap)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium text-foreground text-sm truncate">{transactionLabel}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(tx.timestamp).toLocaleDateString('en-US', { month: 'short', day: '2-digit' })} · {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                                <div className="text-right shrink-0">
                                  {isSwap ? (
                                    <p className="font-semibold text-amber-600 text-sm">{tx.amountGrams?.toFixed(4)}g</p>
                                  ) : isCredit ? (
                                    <p className="font-semibold text-green-600 text-sm">+{tx.amountGrams?.toFixed(4) || `$${tx.amountUsd.toFixed(2)}`}{tx.amountGrams ? 'g' : ''}</p>
                                  ) : isDebit ? (
                                    <p className="font-semibold text-red-600 text-sm">-{tx.amountGrams?.toFixed(4) || `$${tx.amountUsd.toFixed(2)}`}{tx.amountGrams ? 'g' : ''}</p>
                                  ) : (
                                    <p className="text-sm text-muted-foreground">—</p>
                                  )}
                                  {tx.amountGrams && tx.amountGrams > 0 && (
                                    <p className="text-xs text-muted-foreground">${tx.amountUsd.toFixed(2)}</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center justify-between mt-2">
                                <Badge variant="outline" className={`text-[10px] h-5 px-2 font-normal ${getStatusColor(tx.status)}`}>
                                  {tx.status}
                                </Badge>
                                <span className="text-xs text-muted-foreground">Bal: {currentBalance !== null ? `$${Math.abs(currentBalance).toFixed(2)}` : '--'}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>

                {/* Desktop Table - Hidden on mobile */}
                <table className="w-full hidden md:table" data-testid="finapay-transactions-table">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-muted/50 border-b border-border">
                      <th className="text-left py-3 px-4 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Date</th>
                      <th className="text-left py-3 px-4 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Description</th>
                      <th className="text-right py-3 px-4 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Debit</th>
                      <th className="text-right py-3 px-4 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Credit</th>
                      <th className="text-right py-3 px-4 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Balance USD</th>
                      <th className="text-center py-3 px-4 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                      <th className="text-center py-3 px-4 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(() => {
                      let runningBalance = 0;
                      return filteredTransactions.map((tx, index) => {
                      const isSwap = tx.type === 'Swap' || tx.description?.includes('LGPW to FGPW') || tx.description?.includes('FGPW to LGPW');
                      const isDebit = !isSwap && (tx.type === 'Send' || tx.type === 'Sell' || tx.type === 'Withdrawal');
                      const isCredit = !isSwap && (tx.type === 'Receive' || tx.type === 'Buy' || tx.type === 'Deposit');
                      const isCompleted = tx.status?.toLowerCase() === 'completed';
                      
                      // Only include COMPLETED transactions in running balance
                      if (isCompleted) {
                        if (isCredit) runningBalance += tx.amountUsd;
                        else if (isDebit) runningBalance -= tx.amountUsd;
                      }
                      const currentBalance = isCompleted ? runningBalance : null;
                      
                      const transactionLabel = isSwap
                        ? 'Swap Gold'
                        : tx.description?.includes('FinaVault') || tx.description?.includes('physical gold')
                        ? 'Deposit Physical Gold'
                        : (tx.type === 'Deposit' || tx.type === 'Buy')
                        ? 'Acquire Gold' 
                        : `${tx.type} ${tx.assetType === 'GOLD' || (tx.amountGrams && tx.amountGrams > 0) ? 'Gold' : 'USD'}`;
                      
                      return (
                        <tr 
                          key={tx.id} 
                          onClick={() => setSelectedTx(tx)}
                          className={`hover:bg-muted/30 transition-colors cursor-pointer ${index % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}
                          data-testid={`transaction-row-${tx.id}`}
                        >
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-foreground">
                              {new Date(tx.timestamp).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${getColor(tx.type, isSwap)}`}>
                                {getIcon(tx.type, tx.assetType, isSwap)}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-foreground text-sm">{transactionLabel}</span>
                                  {tx.status === 'Completed' && (tx.type === 'Send' || tx.type === 'Receive') && (
                                    <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">P2P</span>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground truncate max-w-[180px]">
                                  {tx.description || tx.referenceId}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right font-mono">
                            {isSwap ? (
                              <div>
                                <span className="text-amber-600 font-medium">
                                  {tx.amountGrams && tx.amountGrams > 0 ? `${tx.amountGrams.toFixed(4)} g` : `$${tx.amountUsd.toFixed(2)}`}
                                </span>
                                <div className="text-xs text-muted-foreground">from LGPW</div>
                              </div>
                            ) : isDebit ? (
                              <div>
                                <span className="text-red-600 font-medium">
                                  {tx.amountGrams && tx.amountGrams > 0 ? `${tx.amountGrams.toFixed(4)} g` : `$${tx.amountUsd.toFixed(2)}`}
                                </span>
                                {tx.amountGrams && tx.amountGrams > 0 && (
                                  <div className="text-xs text-muted-foreground">${tx.amountUsd.toFixed(2)}</div>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-mono">
                            {isSwap ? (
                              <div>
                                <span className="text-green-600 font-medium">
                                  {tx.amountGrams && tx.amountGrams > 0 ? `${tx.amountGrams.toFixed(4)} g` : `$${tx.amountUsd.toFixed(2)}`}
                                </span>
                                <div className="text-xs text-muted-foreground">to FGPW</div>
                              </div>
                            ) : isCredit ? (
                              <div>
                                <span className="text-green-600 font-medium">
                                  {tx.amountGrams && tx.amountGrams > 0 ? `${tx.amountGrams.toFixed(4)} g` : `$${tx.amountUsd.toFixed(2)}`}
                                </span>
                                {tx.amountGrams && tx.amountGrams > 0 && (
                                  <div className="text-xs text-muted-foreground">${tx.amountUsd.toFixed(2)}</div>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-mono">
                            {currentBalance !== null ? (
                              <div>
                                <span className="font-medium text-foreground">
                                  ${Math.abs(currentBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                <div className="text-xs text-muted-foreground">≈ {(currentBalance / goldPrice).toFixed(2)}g</div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">--</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex justify-center">
                              <Badge variant="outline" className={`text-[10px] h-5 px-2 font-normal ${getStatusColor(tx.status)}`}>
                                {tx.status}
                              </Badge>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex justify-center">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    });
                    })()}
                  </tbody>
                </table>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <TransactionDetailsModal 
        isOpen={!!selectedTx} 
        transaction={selectedTx} 
        onClose={() => setSelectedTx(null)}
        goldPrice={goldPrice}
      />
    </>
  );
}

