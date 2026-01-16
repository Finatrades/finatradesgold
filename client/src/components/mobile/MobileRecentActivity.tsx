import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, ArrowDownLeft, Clock, ChevronRight, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { Link } from 'wouter';

interface Transaction {
  id: string | number;
  type: string;
  status: string;
  amountGold?: number;
  amountUsd?: number;
  description?: string;
  createdAt: string;
}

interface MobileRecentActivityProps {
  transactions: Transaction[];
  goldPrice: number;
  maxItems?: number;
}

function formatNumber(num: number | null | undefined, decimals = 2): string {
  if (num === null || num === undefined || isNaN(num)) return '0.00';
  return num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getStatusIcon(status: string) {
  switch (status.toLowerCase()) {
    case 'completed':
    case 'approved':
      return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    case 'pending':
    case 'processing':
      return <Clock className="w-4 h-4 text-amber-500" />;
    case 'failed':
    case 'rejected':
      return <XCircle className="w-4 h-4 text-red-500" />;
    default:
      return <AlertCircle className="w-4 h-4 text-gray-400" />;
  }
}

function getTransactionIcon(type: string) {
  const lowerType = type.toLowerCase();
  if (lowerType.includes('deposit') || lowerType.includes('buy') || lowerType.includes('receive')) {
    return <ArrowDownLeft className="w-4 h-4 text-emerald-500" />;
  }
  return <ArrowUpRight className="w-4 h-4 text-purple-500" />;
}

export default function MobileRecentActivity({ transactions, goldPrice, maxItems = 5 }: MobileRecentActivityProps) {
  const displayTx = transactions.slice(0, maxItems);
  
  if (displayTx.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 text-sm">Recent Activity</h3>
          <Link href="/activity">
            <span className="text-purple-600 text-xs font-medium flex items-center">
              View All <ChevronRight className="w-3 h-3 ml-0.5" />
            </span>
          </Link>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
            <Clock className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-gray-500 text-sm">No transactions yet</p>
          <p className="text-gray-400 text-xs mt-1">Your activity will appear here</p>
        </div>
      </div>
    );
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-gray-100 overflow-hidden"
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-50">
        <h3 className="font-semibold text-gray-900 text-sm">Recent Activity</h3>
        <Link href="/activity">
          <span className="text-purple-600 text-xs font-medium flex items-center">
            View All <ChevronRight className="w-3 h-3 ml-0.5" />
          </span>
        </Link>
      </div>
      
      <div className="divide-y divide-gray-50">
        <AnimatePresence>
          {displayTx.map((tx, index) => (
            <motion.div
              key={tx.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                {getTransactionIcon(tx.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900 truncate">{tx.type}</p>
                  {getStatusIcon(tx.status)}
                </div>
                <p className="text-xs text-gray-500 truncate">
                  {tx.description || formatTimeAgo(tx.createdAt)}
                </p>
              </div>
              
              <div className="text-right">
                {tx.amountGold !== undefined && tx.amountGold !== null && (
                  <p className="text-sm font-semibold text-gray-900">
                    {tx.amountGold > 0 ? '+' : ''}{formatNumber(tx.amountGold, 4)}g
                  </p>
                )}
                {tx.amountUsd !== undefined && tx.amountUsd !== null && (
                  <p className="text-[10px] text-gray-500">
                    ${formatNumber(tx.amountUsd)}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
