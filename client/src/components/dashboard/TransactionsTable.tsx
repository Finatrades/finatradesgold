import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowUpRight, ArrowDownLeft, RefreshCw, ShoppingCart, DollarSign, Loader2, Clock } from 'lucide-react';
import { Link } from 'wouter';

interface Transaction {
  id: string;
  type: string;
  status: string;
  amountGold: string | null;
  amountUsd: string | null;
  description: string | null;
  createdAt: string;
  sourceModule: string | null;
}

interface TransactionsTableProps {
  transactions?: Transaction[];
  goldPrice?: number;
}

const getIcon = (type: string) => {
  const t = type?.toLowerCase() || '';
  if (t === 'buy') return <ShoppingCart className="w-4 h-4 text-emerald-600" />;
  if (t === 'deposit') return <ArrowDownLeft className="w-4 h-4 text-emerald-600" />;
  if (t === 'sell') return <DollarSign className="w-4 h-4 text-rose-600" />;
  if (t === 'send') return <ArrowUpRight className="w-4 h-4 text-fuchsia-600" />;
  if (t === 'receive') return <ArrowDownLeft className="w-4 h-4 text-sky-600" />;
  return <RefreshCw className="w-4 h-4 text-[#D4AF37]" />;
};

const getBgColor = (type: string) => {
  const t = type?.toLowerCase() || '';
  if (t === 'buy') return 'bg-gradient-to-br from-emerald-500/15 to-emerald-600/5';
  if (t === 'deposit') return 'bg-gradient-to-br from-emerald-500/15 to-emerald-600/5';
  if (t === 'sell') return 'bg-gradient-to-br from-rose-500/15 to-rose-600/5';
  if (t === 'send') return 'bg-gradient-to-br from-purple-500/15 to-fuchsia-600/5';
  if (t === 'receive') return 'bg-gradient-to-br from-sky-500/15 to-sky-600/5';
  return 'bg-gradient-to-br from-[#D4AF37]/15 to-[#F4E4BC]/10';
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return `Today, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
  } else if (diffDays === 1) {
    return `Yesterday, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}

export default function TransactionsTable({ transactions = [], goldPrice = 85 }: TransactionsTableProps) {
  const recentTransactions = transactions.slice(0, 10);

  return (
    <Card className="p-6 bg-white/70 backdrop-blur-xl shadow-lg shadow-black/5 border border-white/50 min-h-[300px] max-h-[450px] flex flex-col rounded-2xl">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-foreground">Recent Transactions</h3>
        <Link href="/transactions">
          <Button variant="link" className="text-[#D4AF37] h-auto p-0 hover:text-[#D4AF37]/80" data-testid="link-view-all-transactions">
            View all
          </Button>
        </Link>
      </div>

      <div className="overflow-y-auto flex-1 pr-2 space-y-3 custom-scrollbar">
        {recentTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <RefreshCw className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">No transactions yet</p>
          </div>
        ) : (
          recentTransactions.map((tx) => {
            const goldAmount = parseFloat(tx.amountGold || '0');
            const usdAmount = parseFloat(tx.amountUsd || '0') || goldAmount * goldPrice;
            const isPositive = tx.type === 'Receive' || tx.type === 'Buy' || tx.type === 'Deposit';
            const isPending = tx.status === 'Pending' || tx.status === 'Under Review';
            const hasNoAmount = usdAmount === 0 && goldAmount === 0;
            
            return (
              <Link key={tx.id} href="/transactions">
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/60 transition-all duration-200 group hover:scale-[1.01] border border-transparent hover:border-border/50 cursor-pointer" data-testid={`transaction-row-${tx.id}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getBgColor(tx.type)} ring-2 ring-white/50`}>
                      {getIcon(tx.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{
                          // Deposit Physical Gold for FinaVault physical deposits
                          tx.description?.includes('FinaVault') || tx.description?.includes('physical gold') 
                            ? 'Deposit Physical Gold'
                            // Acquire Gold for bank/card/crypto deposits that result in gold
                            : (tx.type === 'Deposit' || tx.type === 'Buy') && parseFloat(tx.amountGold || '0') > 0 
                            ? 'Acquire Gold' 
                            : `${tx.type} Gold`
                        }{tx.sourceModule === 'bnsl' ? ' (BNSL)' : tx.sourceModule === 'Wingold' ? ' Bar' : ''}</p>
                        {isPending && (
                          <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 bg-warning-muted text-warning-muted-foreground border-warning/30">
                            <Clock className="w-3 h-3 mr-1" />
                            {tx.status}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{formatDate(tx.createdAt)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {hasNoAmount && isPending ? (
                      <p className="text-sm font-medium text-muted-foreground">Awaiting Review</p>
                    ) : (
                      <>
                        {/* Gold-first: Show gold grams as primary */}
                        <p className={`text-sm font-bold ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {isPositive ? '+' : '-'}{goldAmount > 0 ? goldAmount.toFixed(4) : (usdAmount / goldPrice).toFixed(4)}g
                        </p>
                        {/* USD as computed equivalent */}
                        <p className="text-xs text-muted-foreground">
                          ≈ ${Math.abs(usdAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </Card>
  );
}
