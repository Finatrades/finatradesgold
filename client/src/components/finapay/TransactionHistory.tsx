import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Transaction } from '@/types/finapay';
import { ArrowDownLeft, ArrowUpRight, ShoppingCart, Banknote, RefreshCcw, History, Filter, Download, Search, MoreHorizontal, DollarSign } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import TransactionDetailsModal from './modals/TransactionDetailsModal';

interface TransactionHistoryProps {
  transactions: Transaction[];
}

export default function TransactionHistory({ transactions }: TransactionHistoryProps) {
  const [filter, setFilter] = useState('All');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  
  const getIcon = (type: string, asset: string = 'USD') => {
    switch (type) {
      case 'Buy': return <ShoppingCart className="w-4 h-4" />;
      case 'Sell': return <Banknote className="w-4 h-4" />;
      case 'Send': return asset === 'GOLD' ? <ArrowUpRight className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />;
      case 'Receive': return <ArrowDownLeft className="w-4 h-4" />;
      case 'Request': return <RefreshCcw className="w-4 h-4" />;
      default: return <History className="w-4 h-4" />;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'Buy': return 'bg-green-500/10 text-green-500';
      case 'Sell': return 'bg-red-500/10 text-red-500';
      case 'Send': return 'bg-orange-500/10 text-orange-500';
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
            
            <div className="flex gap-2">
               <div className="relative">
                 <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                 <Input placeholder="Search ref..." className="h-8 w-[140px] pl-8 bg-background border-input text-xs" />
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
                   <DropdownMenuItem onClick={() => setFilter('Buy')}>Buy</DropdownMenuItem>
                   <DropdownMenuItem onClick={() => setFilter('Sell')}>Sell</DropdownMenuItem>
                   <DropdownMenuItem onClick={() => setFilter('Send')}>Send</DropdownMenuItem>
                 </DropdownMenuContent>
               </DropdownMenu>

               <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                 <Download className="w-4 h-4" />
               </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-[400px] px-6 py-4">
            <div className="space-y-1">
              <div className="grid grid-cols-12 text-xs text-muted-foreground uppercase tracking-wider font-medium px-4 pb-2">
                 <div className="col-span-5">Transaction</div>
                 <div className="col-span-3 text-right">Amount</div>
                 <div className="col-span-2 text-right">Status</div>
                 <div className="col-span-2 text-right">Action</div>
              </div>

              {filteredTransactions.length === 0 ? (
                 <div className="text-center py-12 text-muted-foreground text-sm">No transactions found</div>
              ) : (
                filteredTransactions.map((tx) => (
                  <div 
                    key={tx.id} 
                    onClick={() => setSelectedTx(tx)}
                    className="grid grid-cols-12 items-center p-3 rounded-lg hover:bg-muted/50 transition-colors group border border-transparent hover:border-border cursor-pointer"
                  >
                    
                    {/* Type & Date */}
                    <div className="col-span-5 flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${getColor(tx.type)} bg-opacity-10`}>
                        {getIcon(tx.type, tx.assetType)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-foreground text-sm">{tx.type} {tx.assetType === 'GOLD' ? 'Gold' : 'USD'}</p>
                          {tx.status === 'Completed' && (tx.type === 'Send' || tx.type === 'Receive') && (
                             <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">P2P</span>
                          )}
                        </div>
                        {tx.description && <p className="text-xs text-muted-foreground font-medium truncate max-w-[150px]">{tx.description}</p>}
                        <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{new Date(tx.timestamp).toLocaleDateString()} • {new Date(tx.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                      </div>
                    </div>
                    
                    {/* Amount */}
                    <div className="col-span-3 text-right">
                      {tx.assetType === 'GOLD' ? (
                         <>
                           <p className="font-bold text-foreground text-sm">{tx.amountGrams?.toFixed(3)} g</p>
                           <p className="text-[10px] text-muted-foreground">${tx.amountUsd.toFixed(2)}</p>
                         </>
                      ) : (
                         <p className="font-bold text-foreground text-sm">${tx.amountUsd.toFixed(2)}</p>
                      )}
                    </div>

                    {/* Status */}
                    <div className="col-span-2 flex justify-end">
                       <Badge variant="outline" className={`text-[10px] h-5 px-2 font-normal ${getStatusColor(tx.status)}`}>
                         {tx.status}
                       </Badge>
                    </div>

                    {/* Actions */}
                    <div className="col-span-2 flex justify-end">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <TransactionDetailsModal 
        isOpen={!!selectedTx} 
        transaction={selectedTx} 
        onClose={() => setSelectedTx(null)} 
      />
    </>
  );
}

