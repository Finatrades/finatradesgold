import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Transaction } from '@/types/finapay';
import { ArrowDownLeft, ArrowUpRight, ShoppingCart, Banknote, RefreshCcw, CheckCircle2, XCircle, Clock, Share2, Download, Printer, Copy } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

interface TransactionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
}

export default function TransactionDetailsModal({ isOpen, onClose, transaction }: TransactionDetailsModalProps) {
  if (!transaction) return null;

  const getIcon = (type: string, asset: string = 'USD') => {
    switch (type) {
      case 'Buy': return <ShoppingCart className="w-6 h-6" />;
      case 'Sell': return <Banknote className="w-6 h-6" />;
      case 'Send': return asset === 'GOLD' ? <ArrowUpRight className="w-6 h-6" /> : <ArrowUpRight className="w-6 h-6" />;
      case 'Receive': return <ArrowDownLeft className="w-6 h-6" />;
      case 'Request': return <RefreshCcw className="w-6 h-6" />;
      default: return <Clock className="w-6 h-6" />;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'Buy': return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'Sell': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'Send': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      case 'Receive': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      case 'Request': return 'text-purple-500 bg-purple-500/10 border-purple-500/20';
      default: return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'Completed': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'Failed': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'Pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      default: return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white border-border text-foreground sm:max-w-[450px] p-0 overflow-hidden gap-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="sr-only">Transaction Details</DialogTitle>
          <div className="flex flex-col items-center justify-center space-y-4 pt-2">
            <div className={`p-4 rounded-full border-2 ${getColor(transaction.type)}`}>
               {getIcon(transaction.type, transaction.assetType)}
            </div>
            <div className="text-center">
              <h2 className={`text-2xl font-bold ${transaction.type === 'Buy' || transaction.type === 'Receive' ? 'text-green-600' : 'text-foreground'}`}>
                {transaction.type === 'Buy' || transaction.type === 'Receive' ? '+' : '-'} 
                {transaction.assetType === 'GOLD' 
                  ? `${transaction.amountGrams?.toFixed(4)} g` 
                  : `$${transaction.amountUsd.toFixed(2)}`
                }
              </h2>
              {transaction.assetType === 'GOLD' && (
                <p className="text-sm text-muted-foreground mt-1">
                  ≈ ${transaction.amountUsd.toFixed(2)} USD
                </p>
              )}
              <div className="flex items-center justify-center gap-2 mt-2">
                <Badge variant="outline" className="bg-muted/50 border-border text-muted-foreground font-normal">
                  {getStatusIcon(transaction.status)}
                  <span className="ml-1.5">{transaction.status}</span>
                </Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6">
          <div className="bg-muted/30 rounded-xl border border-border p-4 space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Transaction Type</span>
              <span className="font-medium">{transaction.type} {transaction.assetType === 'GOLD' ? 'Gold' : 'USD'}</span>
            </div>
            <Separator className="bg-border" />
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Date & Time</span>
              <span className="font-medium">
                {new Date(transaction.timestamp).toLocaleDateString()} at {new Date(transaction.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
            </div>
            <Separator className="bg-border" />
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Reference ID</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs bg-muted px-2 py-1 rounded text-muted-foreground">{transaction.referenceId}</span>
                <Copy className="w-3 h-3 text-muted-foreground hover:text-foreground cursor-pointer" />
              </div>
            </div>
            {transaction.description && (
              <>
                <Separator className="bg-border" />
                <div className="flex justify-between items-start text-sm">
                  <span className="text-muted-foreground">Description</span>
                  <span className="font-medium text-right max-w-[200px]">{transaction.description}</span>
                </div>
              </>
            )}
             <Separator className="bg-border" />
             <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Network Fee</span>
              <span className="font-medium text-muted-foreground">${transaction.feeUsd.toFixed(2)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
             <Button variant="outline" className="border-border hover:bg-muted text-muted-foreground hover:text-foreground w-full">
               <Share2 className="w-4 h-4 mr-2" /> Share
             </Button>
             <Button variant="outline" className="border-border hover:bg-muted text-muted-foreground hover:text-foreground w-full">
               <Download className="w-4 h-4 mr-2" /> Receipt
             </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
