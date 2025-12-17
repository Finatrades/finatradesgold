import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Transaction } from '@/types/finapay';
import { ArrowDownLeft, ArrowUpRight, ShoppingCart, Banknote, RefreshCcw, CheckCircle2, XCircle, Clock, Share2, Download, Printer, Copy } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { jsPDF } from 'jspdf';

interface TransactionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
}

export default function TransactionDetailsModal({ isOpen, onClose, transaction }: TransactionDetailsModalProps) {
  const { toast } = useToast();
  
  if (!transaction) return null;

  const handleShare = async () => {
    const shareText = `Finatrades Transaction Receipt\n\nType: ${transaction.type}\nAmount: ${transaction.assetType === 'GOLD' ? `${transaction.amountGrams?.toFixed(4)} g` : `$${transaction.amountUsd.toFixed(2)}`}\nStatus: ${transaction.status}\nReference: ${transaction.referenceId}\nDate: ${new Date(transaction.timestamp).toLocaleDateString()}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Finatrades Transaction',
          text: shareText,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          await navigator.clipboard.writeText(shareText);
          toast({ title: 'Copied to clipboard', description: 'Transaction details copied' });
        }
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      toast({ title: 'Copied to clipboard', description: 'Transaction details copied' });
    }
  };

  const handleDownloadReceipt = () => {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    
    pdf.setFillColor(249, 115, 22);
    pdf.rect(0, 0, pageWidth, 35, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(22);
    pdf.text('FINATRADES', pageWidth / 2, 20, { align: 'center' });
    pdf.setFontSize(10);
    pdf.text('Transaction Receipt', pageWidth / 2, 28, { align: 'center' });
    
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(16);
    const amount = transaction.assetType === 'GOLD' 
      ? `${transaction.amountGrams?.toFixed(4)} g` 
      : `$${transaction.amountUsd.toFixed(2)}`;
    const prefix = (transaction.type === 'Buy' || transaction.type === 'Receive' || transaction.type === 'Deposit') ? '+' : '-';
    pdf.text(`${prefix} ${amount}`, pageWidth / 2, 55, { align: 'center' });
    
    if (transaction.assetType === 'GOLD') {
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`≈ $${transaction.amountUsd.toFixed(2)} USD`, pageWidth / 2, 63, { align: 'center' });
    }
    
    pdf.setDrawColor(230, 230, 230);
    pdf.line(20, 75, pageWidth - 20, 75);
    
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(10);
    let yPos = 90;
    const addRow = (label: string, value: string) => {
      pdf.setTextColor(100, 100, 100);
      pdf.text(label, 25, yPos);
      pdf.setTextColor(0, 0, 0);
      pdf.text(value, pageWidth - 25, yPos, { align: 'right' });
      yPos += 12;
    };
    
    addRow('Transaction Type', `${transaction.type} ${transaction.assetType === 'GOLD' ? 'Gold' : 'USD'}`);
    addRow('Status', transaction.status);
    addRow('Reference ID', transaction.referenceId);
    addRow('Date & Time', new Date(transaction.timestamp).toLocaleString());
    if (transaction.description) {
      addRow('Description', transaction.description);
    }
    addRow('Network Fee', `$${(transaction.feeUsd || 0).toFixed(2)}`);
    
    pdf.line(20, yPos + 5, pageWidth - 20, yPos + 5);
    
    pdf.setFontSize(9);
    pdf.setTextColor(150, 150, 150);
    pdf.text('Thank you for using Finatrades', pageWidth / 2, 280, { align: 'center' });
    pdf.text(new Date().toLocaleDateString(), pageWidth / 2, 287, { align: 'center' });
    
    pdf.save(`finatrades-receipt-${transaction.referenceId}.pdf`);
    
    toast({ title: 'Receipt Downloaded', description: 'Your transaction receipt has been saved as PDF' });
  };

  const getIcon = (type: string, asset: string = 'USD') => {
    switch (type) {
      case 'Buy': return <ShoppingCart className="w-6 h-6" />;
      case 'Sell': return <Banknote className="w-6 h-6" />;
      case 'Send': return asset === 'GOLD' ? <ArrowUpRight className="w-6 h-6" /> : <ArrowUpRight className="w-6 h-6" />;
      case 'Receive': return <ArrowDownLeft className="w-6 h-6" />;
      case 'Deposit': return <ArrowDownLeft className="w-6 h-6" />;
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
      case 'Deposit': return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'Request': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
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
      <DialogContent className="bg-white border-border text-foreground w-[95vw] max-w-md max-h-[85vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="sr-only">Transaction Details</DialogTitle>
          <div className="flex flex-col items-center justify-center space-y-4 pt-2">
            <div className={`p-4 rounded-full border-2 ${getColor(transaction.type)}`}>
               {getIcon(transaction.type, transaction.assetType)}
            </div>
            <div className="text-center">
              <h2 className={`text-2xl font-bold ${transaction.type === 'Buy' || transaction.type === 'Receive' || transaction.type === 'Deposit' ? 'text-green-600' : 'text-foreground'}`}>
                {transaction.type === 'Buy' || transaction.type === 'Receive' || transaction.type === 'Deposit' ? '+' : '-'} 
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
              <span className="font-medium text-muted-foreground">${(transaction.feeUsd || 0).toFixed(2)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
             <Button 
               variant="outline" 
               className="border-border hover:bg-muted text-muted-foreground hover:text-foreground w-full"
               onClick={handleShare}
               data-testid="button-share-transaction"
             >
               <Share2 className="w-4 h-4 mr-2" /> Share
             </Button>
             <Button 
               variant="outline" 
               className="border-border hover:bg-muted text-muted-foreground hover:text-foreground w-full"
               onClick={handleDownloadReceipt}
               data-testid="button-download-receipt"
             >
               <Download className="w-4 h-4 mr-2" /> Receipt
             </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
