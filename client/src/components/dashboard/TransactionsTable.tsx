import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowUpRight, ArrowDownLeft, RefreshCw, ArrowLeftRight } from 'lucide-react';
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
    return <Badge className="bg-green-100 text-green-700 border-0 text-xs px-2 py-0.5">Completed</Badge>;
  }
  if (s === 'pending' || s === 'under review') {
    return <Badge className="bg-yellow-100 text-yellow-700 border-0 text-xs px-2 py-0.5">Pending</Badge>;
  }
  if (s === 'locked') {
    return <Badge className="bg-gray-200 text-gray-700 border-0 text-xs px-2 py-0.5">Locked</Badge>;
  }
  if (s === 'failed' || s === 'rejected') {
    return <Badge className="bg-red-100 text-red-700 border-0 text-xs px-2 py-0.5">Failed</Badge>;
  }
  return <Badge className="bg-gray-100 text-gray-600 border-0 text-xs px-2 py-0.5">{status}</Badge>;
};

const isSwapType = (description: string | null) => {
  return description?.includes('LGPW to FGPW') || description?.includes('FGPW to LGPW');
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

const getTransactionLabel = (type: string, description: string | null) => {
  if (isSwapType(description)) return 'Swap Gold';
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

export default function TransactionsTable({ transactions = [], goldPrice = 85 }: TransactionsTableProps) {
  const recentTransactions = transactions.slice(0, 8);

  return (
    <Card className="p-5 bg-gradient-to-br from-white to-gray-50 border border-gray-100 rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.15)] transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900">Recent Transactions</h3>
        <Link href="/transactions">
          <Button variant="ghost" size="sm" className="text-purple-600 text-xs h-7 px-2">
            View All
          </Button>
        </Link>
      </div>

      <div className="space-y-1">
        {recentTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-400">
            <RefreshCw className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">No transactions yet</p>
          </div>
        ) : (
          recentTransactions.map((tx) => {
            const goldAmount = parseFloat(tx.amountGold || '0');
            const usdAmount = parseFloat(tx.amountUsd || '0') || goldAmount * goldPrice;
            const isSwap = isSwapType(tx.description);
            const isCredit = isCreditType(tx.type, tx.description);
            const isDebit = isDebitType(tx.type, tx.description);
            
            return (
              <div 
                key={tx.id} 
                className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0"
                data-testid={`transaction-row-${tx.id}`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                  isSwap ? 'bg-purple-100' : isCredit ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  {isSwap ? (
                    <ArrowLeftRight className="w-4 h-4 text-purple-600" />
                  ) : isCredit ? (
                    <ArrowDownLeft className="w-4 h-4 text-green-600" />
                  ) : (
                    <ArrowUpRight className="w-4 h-4 text-gray-600" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {getTransactionLabel(tx.type, tx.description)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {format(new Date(tx.createdAt), 'MMM dd, yyyy')}
                  </p>
                </div>
                
                <div className="text-right shrink-0">
                  {goldAmount > 0 ? (
                    <p className={`text-sm font-semibold ${
                      isSwap ? 'text-purple-600' : isCredit ? 'text-green-600' : 'text-gray-900'
                    }`}>
                      {isCredit ? '+' : isDebit ? '-' : ''}{goldAmount.toFixed(2)}g
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400">—</p>
                  )}
                  {usdAmount > 0 && (
                    <p className="text-xs text-gray-500">${usdAmount.toFixed(2)}</p>
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
