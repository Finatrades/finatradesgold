import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Transaction } from '@/types/finapay';
import { ArrowDownLeft, ArrowUpRight, ShoppingCart, Banknote, RefreshCcw, History } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface TransactionHistoryProps {
  transactions: Transaction[];
}

export default function TransactionHistory({ transactions }: TransactionHistoryProps) {
  
  const getIcon = (type: string) => {
    switch (type) {
      case 'Buy': return <ShoppingCart className="w-4 h-4" />;
      case 'Sell': return <Banknote className="w-4 h-4" />;
      case 'Send': return <ArrowUpRight className="w-4 h-4" />;
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

  return (
    <Card className="bg-white/5 border-white/10 backdrop-blur-sm h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-medium text-white flex items-center gap-2">
          <History className="w-5 h-5 text-[#D4AF37]" />
          Recent Transactions
        </CardTitle>
        <Button variant="ghost" size="sm" className="text-xs text-[#D4AF37] hover:text-[#D4AF37] hover:bg-[#D4AF37]/10">
          View All
        </Button>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-[300px] px-6 pb-6">
          <div className="space-y-4">
            {transactions.length === 0 ? (
               <div className="text-center py-8 text-white/40 text-sm">No transactions yet</div>
            ) : (
              transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${getColor(tx.type)}`}>
                      {getIcon(tx.type)}
                    </div>
                    <div>
                      <p className="font-medium text-white text-sm">{tx.type} Gold</p>
                      <p className="text-xs text-white/40">{new Date(tx.timestamp).toLocaleDateString()}</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-bold text-white text-sm">{tx.amountGrams.toFixed(3)} g</p>
                    <p className="text-xs text-white/40">${tx.amountUsd.toFixed(2)}</p>
                  </div>

                  <div className="hidden sm:block">
                     <Badge variant="outline" className={`text-[10px] h-5 px-2 ${getStatusColor(tx.status)}`}>
                       {tx.status}
                     </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
