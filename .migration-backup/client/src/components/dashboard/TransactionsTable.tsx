import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowUpRight, ArrowDownLeft, RefreshCw, ShieldCheck, Calendar } from 'lucide-react';
import { Link } from 'wouter';
import { format } from 'date-fns';

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

const getStatusBadge = (status: string) => {
  const s = status?.toLowerCase() || '';
  if (s === 'completed' || s === 'complete') {
    return <Badge className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-0 text-xs px-2 py-0.5">Completed</Badge>;
  }
  if (s === 'pending' || s === 'under review') {
    return <Badge className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-0 text-xs px-2 py-0.5">Pending</Badge>;
  }
  if (s === 'locked') {
    return <Badge className="bg-muted text-foreground/85 border-0 text-xs px-2 py-0.5">Locked</Badge>;
  }
  if (s === 'failed' || s === 'rejected') {
    return <Badge className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-0 text-xs px-2 py-0.5">Failed</Badge>;
  }
  return <Badge className="bg-muted text-muted-foreground border-0 text-xs px-2 py-0.5">{status}</Badge>;
};

const isSwapType = (description: string | null) => {
  return description?.includes('LGPW to FGPW') || description?.includes('FGPW to LGPW') ||
         description?.includes('LGPW → FGPW') || description?.includes('FGPW → LGPW') ||
         description?.includes('LGPW → FPGW') || description?.includes('FPGW → LGPW');
};

const isDebitType = (type: string, description: string | null) => {
  if (isSwapType(description)) return false;
  const t = type?.toLowerCase() || '';
  return t === 'send' || t === 'sell' || t === 'withdraw' || t === 'lock';
};

const isCreditType = (type: string, description: string | null) => {
  if (isSwapType(description)) return false;
  const t = type?.toLowerCase() || '';
  return t === 'receive' || t === 'buy' || t === 'deposit' || t === 'unlock' || t === 'add_funds' ||
         description?.includes('Crypto deposit');
};

const isPriceProtectionSwap = (description: string | null) => {
  return description?.includes('LGPW to FGPW') || description?.includes('FGPW to LGPW') ||
         description?.includes('LGPW To FGPW') || description?.includes('FGPW To LGPW') ||
         description?.includes('LGPW → FGPW') || description?.includes('FGPW → LGPW') ||
         description?.includes('LGPW → FPGW') || description?.includes('FPGW → LGPW');
};

const isActivatingProtection = (description: string | null) => {
  return description?.includes('LGPW to FGPW') || description?.includes('LGPW To FGPW') ||
         description?.includes('LGPW → FGPW') || description?.includes('LGPW → FPGW');
};

const getTransactionLabel = (type: string, description: string | null) => {
  if (isPriceProtectionSwap(description)) {
    return 'Price Protection';
  }
  if (description?.includes('Crypto deposit')) return 'Buy Gold';
  if (description?.includes('FinaVault') || description?.includes('physical gold')) return 'Deposit';
  if (description?.includes('BNSL')) return 'Lock Gold';
  
  const t = type?.toLowerCase() || '';
  if (t === 'deposit' || t === 'buy') return 'Buy Gold';
  if (t === 'send') return 'Send';
  if (t === 'receive') return 'Receive';
  if (t === 'sell') return 'Sell Gold';
  if (t === 'withdraw') return 'Withdraw';
  return type || 'Transaction';
};

const getFilterCategory = (type: string, description: string | null) => {
  if (isSwapType(description) || type?.toLowerCase().includes('swap')) return 'swap';
  if (description?.includes('BNSL') || type?.toLowerCase() === 'lock' || type?.toLowerCase().includes('lock')) return 'lock';
  const t = type?.toLowerCase() || '';
  if (t === 'deposit' || t === 'buy' || t.includes('buy') || t.includes('deposit') || t.includes('add_funds') || description?.includes('Crypto deposit')) return 'buy';
  return 'other';
};

export default function TransactionsTable({ transactions = [], goldPrice = 85 }: TransactionsTableProps) {
  const [filter, setFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');

  const filteredTransactions = useMemo(() => {
    let filtered = transactions;

    if (filter !== 'all') {
      filtered = filtered.filter(tx => getFilterCategory(tx.type, tx.description) === filter);
    }

    if (dateRange !== 'all') {
      const now = new Date();
      let cutoff: Date;
      switch (dateRange) {
        case '7d':
          cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          cutoff = new Date(0);
      }
      filtered = filtered.filter(tx => new Date(tx.createdAt) >= cutoff);
    }

    return filtered.slice(0, 8);
  }, [transactions, filter, dateRange]);

  return (
    <Card className="p-5 bg-card border border-border rounded-xl shadow-sm" data-testid="transactions-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[20px] font-bold text-foreground">Recent Transactions</h3>
        <Link href="/transactions">
          <Button variant="ghost" size="sm" className="text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:text-violet-300 text-xs h-7 px-2 font-semibold" data-testid="button-view-all-transactions">
            View All
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[130px] h-8 text-xs" data-testid="select-transaction-filter">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="buy">Buy Gold</SelectItem>
            <SelectItem value="swap">Swap</SelectItem>
            <SelectItem value="lock">Lock</SelectItem>
          </SelectContent>
        </Select>

        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[130px] h-8 text-xs" data-testid="select-date-range">
            <Calendar className="w-3 h-3 mr-1" />
            <SelectValue placeholder="Date range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
            <SelectItem value="90d">Last 90 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-0.5">
        {filteredTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground/70">
            <RefreshCw className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">No transactions found</p>
          </div>
        ) : (
          filteredTransactions.map((tx) => {
            const goldAmount = parseFloat(tx.amountGold || '0');
            const usdAmount = parseFloat(tx.amountUsd || '0') || goldAmount * goldPrice;
            const isSwap = isSwapType(tx.description);
            const isPpSwap = isPriceProtectionSwap(tx.description);
            const isCredit = isCreditType(tx.type, tx.description);
            const isDebit = isDebitType(tx.type, tx.description);
            
            return (
              <div 
                key={tx.id} 
                className="flex items-center gap-3 py-3 px-2 rounded-lg border-b border-gray-50 last:border-0 hover:bg-muted/40 transition-colors"
                data-testid={`transaction-row-${tx.id}`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                  isPpSwap ? 'bg-green-100 dark:bg-green-900/30' : isCredit ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted'
                }`}>
                  {isPpSwap ? (
                    <ShieldCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
                  ) : isCredit ? (
                    <ArrowDownLeft className="w-4 h-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium text-foreground truncate">
                    {getTransactionLabel(tx.type, tx.description)}
                  </p>
                  <p className="text-[12px] text-muted-foreground">
                    {format(new Date(tx.createdAt), 'MMM dd, yyyy')}
                  </p>
                </div>
                
                <div className="text-right shrink-0">
                  {goldAmount > 0 ? (
                    <p className={`text-[14px] font-semibold ${
                      isPpSwap ? 'text-muted-foreground' : isCredit ? 'text-green-600 dark:text-green-400' : 'text-foreground'
                    }`}>
                      {isCredit ? '+' : isDebit ? '-' : ''}{goldAmount.toFixed(2)}g
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground/70">&mdash;</p>
                  )}
                  {usdAmount > 0 && (
                    <p className="text-[12px] text-muted-foreground">${usdAmount.toFixed(2)}</p>
                  )}
                </div>
                
                <div className="shrink-0 ml-2">
                  {getStatusBadge(tx.status)}
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}
