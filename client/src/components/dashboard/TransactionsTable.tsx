import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ArrowUpRight, ArrowDownLeft, RefreshCw, Search, Filter, Download, ArrowLeftRight, ChevronDown, ChevronRight } from 'lucide-react';
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
    return <Badge className="bg-green-100 text-green-700 border-green-200 text-xs px-2 py-0.5">Completed</Badge>;
  }
  if (s === 'pending' || s === 'under review') {
    return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 text-xs px-2 py-0.5">Pending</Badge>;
  }
  if (s === 'failed' || s === 'rejected') {
    return <Badge className="bg-red-100 text-red-700 border-red-200 text-xs px-2 py-0.5">Failed</Badge>;
  }
  return <Badge className="bg-gray-100 text-gray-700 border-gray-200 text-xs px-2 py-0.5">{status}</Badge>;
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
  if (description?.includes('Crypto deposit')) return 'Acquire Gold';
  if (description?.includes('FinaVault') || description?.includes('physical gold')) return 'Deposit Physical Gold';
  
  const t = type?.toLowerCase() || '';
  if (t === 'deposit' || t === 'buy') return 'Acquire Gold';
  if (t === 'send') return 'Send Gold';
  if (t === 'receive') return 'Receive Gold';
  if (t === 'sell') return 'Sell Gold';
  return `${type} Gold`;
};

const getShortDescription = (type: string, description: string | null, goldAmount: number, usdAmount: number) => {
  if (description?.includes('LGPW to FGPW')) {
    return `LGPW to FGPW conversion: ${goldAmount.toFixed(2)}g`;
  }
  if (description?.includes('FGPW to LGPW')) {
    return `FGPW to LGPW conversion: ${goldAmount.toFixed(2)}g`;
  }
  if (description?.includes('Crypto deposit')) {
    return `Crypto deposit - $${usdAmount.toFixed(2)} (${goldAmount.toFixed(2)}g)`;
  }
  return description || '-';
};

export default function TransactionsTable({ transactions = [], goldPrice = 85 }: TransactionsTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const recentTransactions = transactions.slice(0, 10);
  
  const filteredTransactions = recentTransactions.filter(tx => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return tx.description?.toLowerCase().includes(query) || 
           tx.type.toLowerCase().includes(query) ||
           tx.id.toLowerCase().includes(query);
  });

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

  let runningBalanceUsd = 0;
  const transactionsWithBalance = filteredTransactions.map(tx => {
    const goldAmount = parseFloat(tx.amountGold || '0');
    const usdAmount = parseFloat(tx.amountUsd || '0') || goldAmount * goldPrice;
    const isSwap = isSwapType(tx.description);
    const isCredit = isCreditType(tx.type, tx.description);
    const isDebit = isDebitType(tx.type, tx.description);
    const isCompleted = tx.status?.toLowerCase() === 'completed' || tx.status?.toLowerCase() === 'complete';
    
    // Only include COMPLETED transactions in running balance
    if (isCompleted) {
      if (isCredit) {
        runningBalanceUsd += usdAmount;
      } else if (isDebit) {
        runningBalanceUsd -= usdAmount;
      }
    }
    
    return { ...tx, goldAmount, usdAmount, isSwap, isCredit, isDebit, balanceUsd: isCompleted ? runningBalanceUsd : null };
  });

  return (
    <Card className="p-6 bg-white/70 backdrop-blur-xl shadow-lg shadow-black/5 border border-white/50 min-h-[300px] flex flex-col rounded-2xl">
      <div className="flex flex-col sm:flex-row justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-base sm:text-lg font-bold text-foreground">Transaction History</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 sm:flex-none sm:w-32">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 h-8 text-xs w-full"
              data-testid="input-search-transactions"
            />
          </div>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1" data-testid="button-filter">
            <Filter className="w-3 h-3" />
            <span className="hidden sm:inline">All</span>
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1" data-testid="button-export">
            <Download className="w-3 h-3" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </div>
      </div>

      {/* Banking-style Table Header - Hidden on Mobile */}
      <div className="hidden md:grid grid-cols-14 gap-2 px-3 py-2 bg-muted/40 border-b text-xs font-medium text-muted-foreground uppercase tracking-wider rounded-t-lg">
        <div className="col-span-2">Date</div>
        <div className="col-span-3">Description</div>
        <div className="col-span-2 text-right">Debit</div>
        <div className="col-span-2 text-right">Credit</div>
        <div className="col-span-2 text-right">Balance USD</div>
        <div className="col-span-2 text-center">Status</div>
        <div className="col-span-1 text-center">Action</div>
      </div>

      <div className="overflow-y-auto flex-1 custom-scrollbar">
        {transactionsWithBalance.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <RefreshCw className="w-6 h-6 mb-2 opacity-50" />
            <p className="text-sm">No transactions yet</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {transactionsWithBalance.map((tx) => {
              const isExpanded = expandedRows.has(tx.id);
              
              return (
                <div key={tx.id} data-testid={`transaction-row-${tx.id}`}>
                  {/* Mobile Card Layout */}
                  <div 
                    onClick={() => tx.isSwap ? toggleRowExpand(tx.id) : null}
                    className={`md:hidden px-3 py-3 hover:bg-muted/30 transition-colors ${tx.isSwap ? 'cursor-pointer' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-full shrink-0 ${
                        tx.isSwap ? 'bg-purple-100' : tx.isCredit ? 'bg-green-100' : tx.isDebit ? 'bg-gray-100' : 'bg-purple-100'
                      }`}>
                        {tx.isSwap ? (
                          <ArrowLeftRight className="w-4 h-4 text-purple-600" />
                        ) : tx.isCredit ? (
                          <ArrowDownLeft className="w-4 h-4 text-green-600" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4 text-gray-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-foreground text-sm truncate">
                              {getTransactionLabel(tx.type, tx.description)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(tx.createdAt), 'MMM dd')} · {format(new Date(tx.createdAt), 'hh:mm a')}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            {tx.isSwap ? (
                              <p className="font-semibold text-amber-600 text-sm">{tx.goldAmount.toFixed(4)}g</p>
                            ) : tx.isCredit && tx.goldAmount > 0 ? (
                              <p className="font-semibold text-green-600 text-sm">+{tx.goldAmount.toFixed(4)}g</p>
                            ) : tx.isDebit && tx.goldAmount > 0 ? (
                              <p className="font-semibold text-foreground text-sm">-{tx.goldAmount.toFixed(4)}g</p>
                            ) : (
                              <p className="text-sm text-muted-foreground">—</p>
                            )}
                            {tx.usdAmount > 0 && (
                              <p className="text-xs text-muted-foreground">${tx.usdAmount.toFixed(2)}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          {getStatusBadge(tx.status)}
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <span>Bal: {tx.balanceUsd !== null ? `$${Math.abs(tx.balanceUsd).toFixed(2)}` : '--'}</span>
                            {tx.isSwap && (isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Desktop Table Row */}
                  <div 
                    onClick={() => tx.isSwap ? toggleRowExpand(tx.id) : null}
                    className={`hidden md:grid grid-cols-14 gap-2 px-3 py-3 hover:bg-muted/30 transition-colors items-center ${tx.isSwap ? 'cursor-pointer' : ''}`}
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
                    <div className="col-span-3 flex items-center gap-2">
                      <div className={`p-1.5 rounded-full ${
                        tx.isSwap ? 'bg-purple-100' : tx.isCredit ? 'bg-green-100' : tx.isDebit ? 'bg-gray-100' : 'bg-purple-100'
                      }`}>
                        {tx.isSwap ? (
                          <ArrowLeftRight className="w-3.5 h-3.5 text-purple-600" />
                        ) : tx.isCredit ? (
                          <ArrowDownLeft className="w-3.5 h-3.5 text-green-600" />
                        ) : (
                          <ArrowUpRight className="w-3.5 h-3.5 text-gray-600" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <p className="font-semibold text-sm text-foreground truncate">
                            {getTransactionLabel(tx.type, tx.description)}
                          </p>
                          {tx.isSwap && (
                            isExpanded ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {getShortDescription(tx.type, tx.description, tx.goldAmount, tx.usdAmount)}
                        </p>
                      </div>
                    </div>
                    
                    {/* DEBIT Column */}
                    <div className="col-span-2 text-right">
                      {tx.isSwap ? (
                        <>
                          <p className="font-semibold text-amber-600 text-sm">{tx.goldAmount.toFixed(4)} g</p>
                          <p className="text-xs text-muted-foreground">from LGPW</p>
                        </>
                      ) : tx.isDebit && tx.goldAmount > 0 ? (
                        <>
                          <p className="font-semibold text-foreground text-sm">{tx.goldAmount.toFixed(4)} g</p>
                          {tx.usdAmount > 0 && (
                            <p className="text-xs text-muted-foreground">${tx.usdAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">—</p>
                      )}
                    </div>
                    
                    {/* CREDIT Column */}
                    <div className="col-span-2 text-right">
                      {tx.isSwap ? (
                        <>
                          <p className="font-semibold text-green-600 text-sm">{tx.goldAmount.toFixed(4)} g</p>
                          <p className="text-xs text-muted-foreground">to FGPW</p>
                        </>
                      ) : tx.isCredit && tx.goldAmount > 0 ? (
                        <>
                          <p className="font-semibold text-green-600 text-sm">{tx.goldAmount.toFixed(4)} g</p>
                          {tx.usdAmount > 0 && (
                            <p className="text-xs text-muted-foreground">${tx.usdAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">—</p>
                      )}
                    </div>
                    
                    {/* BALANCE USD Column */}
                    <div className="col-span-2 text-right">
                      {tx.balanceUsd !== null ? (
                        <>
                          <p className="font-semibold text-foreground text-sm">
                            ${Math.abs(tx.balanceUsd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                          <p className="text-xs text-muted-foreground">≈ {(tx.balanceUsd / goldPrice).toFixed(2)}g</p>
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
                      <Link href="/transactions">
                        <button className="p-1 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-foreground">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <circle cx="10" cy="4" r="1.5" />
                            <circle cx="10" cy="10" r="1.5" />
                            <circle cx="10" cy="16" r="1.5" />
                          </svg>
                        </button>
                      </Link>
                    </div>
                  </div>
                  
                  {/* Expanded Swap Details */}
                  {tx.isSwap && isExpanded && (
                    <div className="px-4 pb-4 bg-purple-50/50 border-t border-dashed border-purple-200">
                      <div className="grid grid-cols-2 gap-4 p-4">
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <ArrowUpRight className="w-4 h-4 text-amber-600" />
                            <span className="font-semibold text-amber-700 text-sm">From LGPW (Market Price)</span>
                          </div>
                          <p className="text-lg font-bold text-amber-600">{tx.goldAmount.toFixed(6)} g</p>
                          <p className="text-xs text-muted-foreground">Sold at market price</p>
                        </div>
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <ArrowDownLeft className="w-4 h-4 text-green-600" />
                            <span className="font-semibold text-green-700 text-sm">To FGPW (Fixed Price)</span>
                          </div>
                          <p className="text-lg font-bold text-green-600">{tx.goldAmount.toFixed(6)} g</p>
                          <p className="text-xs text-muted-foreground">Locked at ${(tx.usdAmount / tx.goldAmount).toFixed(2)}/g</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-center gap-2 text-xs text-purple-600">
                        <Badge className="bg-purple-100 text-purple-700 text-xs">Internal Conversion</Badge>
                        <span>Gold transferred between wallets • No external movement</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      <div className="pt-3 border-t mt-auto">
        <Link href="/transactions">
          <Button variant="link" className="text-[#D4AF37] h-auto p-0 hover:text-[#D4AF37]/80 text-sm" data-testid="link-view-all-transactions">
            View all transactions →
          </Button>
        </Link>
      </div>
    </Card>
  );
}
