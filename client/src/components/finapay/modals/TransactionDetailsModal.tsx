import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Transaction } from '@/types/finapay';
import { ArrowDownLeft, ArrowUpRight, ShoppingCart, Banknote, RefreshCcw, CheckCircle2, XCircle, Clock, Share2, Download, Copy, Lock, Unlock, User, Building2, ExternalLink, Award } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { jsPDF } from 'jspdf';

interface TransactionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  goldPrice?: number;
  onViewCertificate?: (certNumber: string) => void;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function maskEmail(email: string | undefined | null) {
  if (!email) return null;
  const [local, domain] = email.split('@');
  if (!domain) return email;
  return local.substring(0, 2) + '***@' + domain;
}

function initials(name: string | undefined | null) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
}

function InfoRow({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex justify-between items-start gap-4 py-2 border-b border-border/50 last:border-0">
      <span className="text-muted-foreground text-sm shrink-0">{label}</span>
      <span className={`text-sm font-medium text-right ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 overflow-hidden">
      <div className="px-4 py-2.5 bg-muted/50 border-b border-border">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      </div>
      <div className="px-4 py-1">{children}</div>
    </div>
  );
}

export default function TransactionDetailsModal({ isOpen, onClose, transaction, goldPrice = 85, onViewCertificate }: TransactionDetailsModalProps) {
  const { toast } = useToast();
  const [copying, setCopying] = useState(false);

  if (!transaction) return null;

  const isDeposit = transaction.type === 'Deposit' || transaction.description?.includes('Bank Deposit');
  const isActivating = transaction.type === 'Swap' && (transaction.description?.includes('LGPW to FGPW') || transaction.description?.includes('LGPW To FGPW'));
  const isRemoving = transaction.type === 'Swap' && (transaction.description?.includes('FGPW to LGPW') || transaction.description?.includes('FGPW To LGPW'));
  const isConversion = isActivating || isRemoving;
  const isBnsl = transaction.type === 'Deposit' && (transaction.description?.toLowerCase().includes('bnsl') || transaction.description?.toLowerCase().includes('bnsl lock'));
  const isSend = transaction.type === 'Send';
  const isReceive = transaction.type === 'Receive';
  const isBuy = transaction.type === 'Buy' || (transaction.description?.includes('Bank Deposit') || transaction.description?.includes('Bank Transfer'));

  const calculatedFee = isDeposit && !transaction.feeUsd ? Number(transaction.amountUsd || 0) * 0.005 : Number(transaction.feeUsd || 0);
  const displayGoldGrams = Number(transaction.amountGrams) || (goldPrice > 0 ? Number(transaction.amountUsd || 0) / goldPrice : 0);

  const parseDescription = (): { memo?: string; recipientName?: string; senderName?: string; companyName?: string; email?: string; planName?: string; maturityDate?: string; certNumber?: string; vaultLocation?: string; method?: string; bankName?: string; exchangeRate?: string; priceLocked?: string } => {
    if (!transaction.description) return {};
    try {
      const parsed = JSON.parse(transaction.description);
      if (parsed && typeof parsed === 'object') {
        return {
          memo: parsed.memo || parsed.originalMemo || parsed.note,
          recipientName: parsed.recipientName || parsed.toName,
          senderName: parsed.senderName || parsed.fromName,
          companyName: parsed.companyName || parsed.company,
          email: parsed.email || parsed.recipientEmail || parsed.senderEmail,
          planName: parsed.planName || parsed.templateName,
          maturityDate: parsed.maturityDate,
          certNumber: parsed.certNumber || parsed.certificateNumber,
          vaultLocation: parsed.vaultLocation,
          method: parsed.method || parsed.paymentMethod,
          bankName: parsed.bankName || parsed.bank,
          exchangeRate: parsed.exchangeRate,
          priceLocked: parsed.priceLocked || parsed.lockedPrice,
        };
      }
    } catch {
      return { memo: transaction.description };
    }
    return { memo: transaction.description };
  };

  const desc = parseDescription();

  const txLabel = isActivating ? 'Price Protection Activated'
    : isRemoving ? 'Price Protection Removed'
    : isBnsl ? 'BNSL Gold Lock'
    : isBuy ? 'Buy Gold'
    : `${transaction.type} ${transaction.assetType === 'GOLD' || (transaction.amountGrams && transaction.amountGrams > 0) ? 'Gold' : 'USD'}`;

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopying(true);
      toast({ title: `${label} copied`, description: text });
      setTimeout(() => setCopying(false), 1500);
    } catch {
      toast({ title: 'Copy failed', variant: 'destructive' });
    }
  };

  const handleShare = async () => {
    const shareText = `Finatrades Transaction Receipt\n\nType: ${txLabel}\nAmount: ${transaction.assetType === 'GOLD' ? `${Number(transaction.amountGrams || 0).toFixed(4)} g` : `$${Number(transaction.amountUsd || 0).toFixed(2)}`}\nStatus: ${transaction.status}\nReference: ${transaction.referenceId}\nDate: ${new Date(transaction.timestamp).toLocaleDateString()}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Finatrades Transaction', text: shareText });
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
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;

    pdf.setFillColor(74, 0, 130);
    pdf.rect(0, 0, pageWidth, 38, 'F');
    pdf.setFillColor(212, 175, 55);
    pdf.rect(0, 38, pageWidth, 3, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('FINATRADES', pageWidth / 2, 18, { align: 'center' });
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');

    const receiptTitle = isBnsl ? 'BNSL Lock Receipt'
      : isSend || isReceive ? `Gold ${transaction.type} Receipt`
      : isConversion ? (isActivating ? 'Price Protection Activated Receipt' : 'Price Protection Removed Receipt')
      : isBuy ? 'Gold Purchase Receipt'
      : 'Official Transaction Receipt';
    pdf.text(receiptTitle, pageWidth / 2, 30, { align: 'center' });

    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(22);
    pdf.setFont('helvetica', 'bold');
    const goldAmount = transaction.amountGrams ? Number(transaction.amountGrams).toFixed(4) : '0.0000';
    const usdAmount = transaction.amountUsd ? Number(transaction.amountUsd).toFixed(2) : '0.00';
    let amountDisplay: string;
    let amountColor: [number, number, number];
    if (isConversion) {
      amountDisplay = goldAmount + ' g';
      amountColor = [212, 175, 55];
    } else if (transaction.assetType === 'GOLD' || (transaction.amountGrams && transaction.amountGrams > 0)) {
      const prefix = (transaction.type === 'Buy' || transaction.type === 'Receive' || transaction.type === 'Deposit') ? '+ ' : '- ';
      amountDisplay = prefix + goldAmount + ' g';
      amountColor = (transaction.type === 'Buy' || transaction.type === 'Receive' || transaction.type === 'Deposit') ? [34, 139, 34] : [220, 20, 60];
    } else {
      const prefix = (transaction.type === 'Buy' || transaction.type === 'Receive' || transaction.type === 'Deposit') ? '+ ' : '- ';
      amountDisplay = prefix + 'USD ' + usdAmount;
      amountColor = (transaction.type === 'Buy' || transaction.type === 'Receive' || transaction.type === 'Deposit') ? [34, 139, 34] : [220, 20, 60];
    }
    pdf.setTextColor(...amountColor);
    pdf.text(amountDisplay, pageWidth / 2, 60, { align: 'center' });
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 100, 100);
    if (transaction.assetType === 'GOLD' && !isConversion) {
      pdf.text('USD equivalent: ' + usdAmount, pageWidth / 2, 69, { align: 'center' });
    }
    pdf.setDrawColor(220, 220, 220);
    pdf.line(margin, 78, pageWidth - margin, 78);

    let yPos = 92;
    const addRow = (label: string, value: string) => {
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(120, 120, 120);
      pdf.text(label, margin, yPos);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(30, 30, 30);
      const safeValue = String(value).replace(/[^\x00-\x7F]/g, '');
      pdf.text(safeValue, pageWidth - margin, yPos, { align: 'right' });
      pdf.setDrawColor(240, 240, 240);
      pdf.line(margin, yPos + 3, pageWidth - margin, yPos + 3);
      yPos += 13;
    };
    const addSection = (title: string) => {
      pdf.setFillColor(245, 245, 250);
      pdf.rect(margin - 2, yPos - 5, contentWidth + 4, 10, 'F');
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(80, 40, 120);
      pdf.text(title.toUpperCase(), margin, yPos + 2);
      pdf.setFontSize(10);
      yPos += 14;
    };

    addRow('Transaction Type', txLabel);
    addRow('Status', transaction.status);
    addRow('Reference ID', transaction.referenceId || '—');
    addRow('Date & Time', new Date(transaction.timestamp).toLocaleString());

    if (isBnsl) {
      if (yPos < 200) { addSection('Lock Details'); }
      if (desc.planName) addRow('Plan', desc.planName);
      if (desc.maturityDate) addRow('Matures On', formatDate(desc.maturityDate));
      if (desc.certNumber) addRow('Certificate (BLC)', desc.certNumber);
      addRow('Gold Locked', goldAmount + ' g');
    } else if (isSend || isReceive) {
      addSection('Counterparty');
      if (isSend) {
        addRow('Sent To', desc.recipientName || transaction.description?.substring(0, 40) || '—');
        if (desc.companyName) addRow('Company', desc.companyName);
        if (desc.email) addRow('Email', maskEmail(desc.email) || '—');
      } else {
        addRow('Received From', desc.senderName || transaction.description?.substring(0, 40) || '—');
        if (desc.companyName) addRow('Company', desc.companyName);
      }
      addSection('Transaction');
      addRow('Gold Amount', goldAmount + ' g');
      addRow('USD Value', '$' + usdAmount);
      const fee = calculatedFee;
      addRow('Fee', fee > 0 ? `$${fee.toFixed(2)}` : 'No fee');
      if (desc.memo) addRow('Memo', desc.memo.substring(0, 40));
    } else if (isBuy) {
      addSection('Payment Details');
      if (desc.bankName) addRow('Bank', desc.bankName);
      addRow('Amount Paid', '$' + usdAmount);
      if (desc.exchangeRate) addRow('Exchange Rate', desc.exchangeRate);
      addRow('Gold Credited', goldAmount + ' g');
      if (desc.certNumber) { addSection('Certificate'); addRow('DOC Certificate', desc.certNumber); }
    } else if (isConversion) {
      addSection('Conversion Details');
      addRow('Direction', isActivating ? 'Live Price (LGPW) → Fixed Price (FPGW)' : 'Fixed Price (FPGW) → Live Price (LGPW)');
      addRow('Gold Converted', goldAmount + ' g');
      if (desc.priceLocked) addRow('Price Locked At', '$' + desc.priceLocked + '/g');
      if (desc.certNumber) addRow('CONV Certificate', desc.certNumber);
    } else {
      addRow(isConversion ? 'Fee' : isDeposit ? 'Deposit Fee (0.5%)' : 'Network Fee',
        isConversion ? 'No fee' : 'USD ' + calculatedFee.toFixed(2));
    }

    pdf.setFillColor(248, 248, 248);
    pdf.rect(0, 268, pageWidth, 30, 'F');
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(150, 150, 150);
    pdf.text('This receipt is electronically generated and verified by Finatrades.', pageWidth / 2, 278, { align: 'center' });
    pdf.text('Finatrades Finance SA  |  finatrades.com', pageWidth / 2, 284, { align: 'center' });
    pdf.text(new Date().toLocaleDateString(), pageWidth / 2, 290, { align: 'center' });

    pdf.save('finatrades-receipt-' + (transaction.referenceId || 'receipt') + '.pdf');
    toast({ title: 'Receipt Downloaded', description: 'Your transaction receipt has been saved as PDF' });
  };

  const getIcon = (type: string) => {
    if (isConversion) return <RefreshCcw className="w-6 h-6" />;
    if (isBnsl) return <Lock className="w-6 h-6" />;
    switch (type) {
      case 'Buy': return <ShoppingCart className="w-6 h-6" />;
      case 'Sell': return <Banknote className="w-6 h-6" />;
      case 'Send': return <ArrowUpRight className="w-6 h-6" />;
      case 'Receive': return <ArrowDownLeft className="w-6 h-6" />;
      case 'Deposit': return <ArrowDownLeft className="w-6 h-6" />;
      case 'Request': return <RefreshCcw className="w-6 h-6" />;
      default: return <Clock className="w-6 h-6" />;
    }
  };

  const getColor = (type: string) => {
    if (isConversion) return 'text-amber-500 bg-amber-50 dark:bg-amber-950/200/10 border-amber-500/20';
    if (isBnsl) return 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/200/10 border-indigo-500/20';
    switch (type) {
      case 'Buy': return 'text-green-500 bg-green-50 dark:bg-green-950/200/10 border-green-500/20';
      case 'Sell': return 'text-red-500 bg-red-50 dark:bg-red-950/200/10 border-red-500/20';
      case 'Send': return 'text-purple-500 bg-purple-50 dark:bg-purple-950/200/10 border-purple-500/20';
      case 'Receive': return 'text-blue-500 bg-blue-50 dark:bg-blue-950/200/10 border-blue-500/20';
      case 'Deposit': return 'text-green-500 bg-green-50 dark:bg-green-950/200/10 border-green-500/20';
      default: return 'text-muted-foreground bg-gray-500/10 border-gray-500/20';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-green-50 dark:bg-green-950/200/10 text-green-600 dark:text-green-400 border-green-500/20';
      case 'Pending': return 'bg-yellow-50 dark:bg-yellow-950/200/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20';
      case 'Failed': return 'bg-red-50 dark:bg-red-950/200/10 text-red-600 dark:text-red-400 border-red-500/20';
      case 'Declined': return 'bg-gray-500/10 text-muted-foreground border-gray-500/20';
      default: return 'bg-muted/50 text-muted-foreground border-border';
    }
  };

  const isCredit = transaction.type === 'Buy' || transaction.type === 'Receive' || transaction.type === 'Deposit';
  const amountSign = isConversion ? '' : isCredit ? '+' : '-';
  const amountClass = isConversion ? 'text-amber-600 dark:text-amber-400' : isCredit ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border text-foreground w-[95vw] max-w-md max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="p-0">
          <DialogTitle className="sr-only">Transaction Details</DialogTitle>

          {/* Download button top-right */}
          <div className="absolute top-3 right-10 z-10">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1"
              onClick={handleDownloadReceipt}
              data-testid="button-download-receipt-top"
            >
              <Download className="w-3.5 h-3.5" />
              PDF
            </Button>
          </div>

          {/* Header with amount */}
          <div className="flex flex-col items-center justify-center space-y-3 pt-8 pb-4 px-6">
            <div className={`p-4 rounded-full border-2 ${getColor(transaction.type)}`}>
              {getIcon(transaction.type)}
            </div>
            <div className="text-center">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{txLabel}</p>
              <h2 className={`text-3xl font-bold ${amountClass}`}>
                {amountSign}{transaction.assetType === 'GOLD' || (transaction.amountGrams && transaction.amountGrams > 0)
                  ? `${Number(transaction.amountGrams || 0).toFixed(4)} g`
                  : `$${Number(transaction.amountUsd || 0).toFixed(2)}`}
              </h2>
              {(transaction.assetType === 'GOLD' || (transaction.amountGrams && transaction.amountGrams > 0)) && (
                <p className="text-sm text-muted-foreground mt-1">≈ ${Number(transaction.amountUsd || 0).toFixed(2)} USD</p>
              )}
              <div className="flex items-center justify-center mt-3">
                <Badge variant="outline" className={`text-xs px-3 py-1 font-medium ${getStatusBadgeClass(transaction.status)}`}>
                  {transaction.status === 'Completed' && <CheckCircle2 className="w-3 h-3 mr-1.5" />}
                  {transaction.status === 'Failed' && <XCircle className="w-3 h-3 mr-1.5" />}
                  {transaction.status === 'Pending' && <Clock className="w-3 h-3 mr-1.5" />}
                  {transaction.status}
                </Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="px-4 pb-6 space-y-3">

          {/* BNSL Lock Details */}
          {isBnsl && (
            <SectionCard title="Lock Details">
              {desc.planName && <InfoRow label="Plan" value={desc.planName} />}
              {desc.maturityDate && <InfoRow label="Matures On" value={formatDate(desc.maturityDate)} />}
              <InfoRow label="Gold Locked" value={`${Number(transaction.amountGrams || 0).toFixed(4)} g`} />
              <InfoRow label="USD Value" value={`$${Number(transaction.amountUsd || 0).toFixed(2)}`} />
            </SectionCard>
          )}

          {/* BNSL Certificate */}
          {isBnsl && desc.certNumber && (
            <SectionCard title="Certificate Issued">
              <div className="py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-indigo-500" />
                  <span className="font-mono text-sm font-medium">{desc.certNumber}</span>
                </div>
                {onViewCertificate && (
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onViewCertificate(desc.certNumber!)}>
                    <ExternalLink className="w-3 h-3 mr-1" /> View Certificate
                  </Button>
                )}
              </div>
            </SectionCard>
          )}

          {/* Send / Receive — Counterparty */}
          {(isSend || isReceive) && (
            <SectionCard title="Counterparty">
              <div className="py-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                  {desc.companyName ? <Building2 className="w-5 h-5 text-purple-600 dark:text-purple-400" /> : <span className="text-sm font-bold text-purple-600 dark:text-purple-400">{initials(isSend ? desc.recipientName : desc.senderName)}</span>}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{isSend ? (desc.recipientName || 'Recipient') : (desc.senderName || 'Sender')}</p>
                  {desc.companyName && <p className="text-xs text-muted-foreground truncate">{desc.companyName}</p>}
                  {desc.email && <p className="text-xs text-muted-foreground font-mono">{maskEmail(desc.email)}</p>}
                </div>
              </div>
            </SectionCard>
          )}

          {/* Send / Receive — Transaction Details */}
          {(isSend || isReceive) && (
            <SectionCard title="Transaction">
              <InfoRow label="Gold Amount" value={`${Number(transaction.amountGrams || 0).toFixed(4)} g`} />
              <InfoRow label="USD Value" value={`$${Number(transaction.amountUsd || 0).toFixed(2)}`} />
              {calculatedFee > 0 && <InfoRow label="Platform Fee" value={`$${calculatedFee.toFixed(2)}`} />}
              {desc.memo && <InfoRow label="Memo" value={desc.memo} />}
            </SectionCard>
          )}

          {/* Buy Gold — Payment Details */}
          {isBuy && !isBnsl && !isSend && !isReceive && !isConversion && (
            <SectionCard title="Payment Details">
              {desc.bankName && <InfoRow label="Bank" value={desc.bankName} />}
              <InfoRow label="Amount Paid" value={`$${Number(transaction.amountUsd || 0).toFixed(2)}`} />
              {desc.exchangeRate && <InfoRow label="Exchange Rate" value={desc.exchangeRate} />}
              <InfoRow label="Gold Credited" value={`${Number(transaction.amountGrams || 0).toFixed(4)} g`} />
            </SectionCard>
          )}

          {/* Buy Gold — Certificate */}
          {isBuy && desc.certNumber && (
            <SectionCard title="Certificate Issued">
              <div className="py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span className="font-mono text-sm font-medium">{desc.certNumber}</span>
                </div>
                {onViewCertificate && (
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onViewCertificate(desc.certNumber!)}>
                    <ExternalLink className="w-3 h-3 mr-1" /> View Certificate
                  </Button>
                )}
              </div>
            </SectionCard>
          )}

          {/* Price Lock/Unlock — Conversion Details */}
          {isConversion && (
            <SectionCard title="Conversion Details">
              <InfoRow label="From Wallet" value={isActivating ? 'Live Gold Price (LGPW)' : 'Fixed Price Gold (FPGW)'} />
              <InfoRow label="To Wallet" value={isActivating ? 'Fixed Price Gold (FPGW)' : 'Live Gold Price (LGPW)'} />
              <InfoRow label="Gold Converted" value={`${Number(transaction.amountGrams || 0).toFixed(4)} g`} />
              {desc.priceLocked && <InfoRow label="Price Locked At" value={`$${desc.priceLocked}/g`} />}
            </SectionCard>
          )}

          {/* Conversion Certificate */}
          {isConversion && desc.certNumber && (
            <SectionCard title="Certificate">
              <div className="py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span className="font-mono text-sm font-medium">{desc.certNumber}</span>
                </div>
                {onViewCertificate && (
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onViewCertificate(desc.certNumber!)}>
                    <ExternalLink className="w-3 h-3 mr-1" /> View Certificate
                  </Button>
                )}
              </div>
            </SectionCard>
          )}

          {/* Standard transaction info (always shown) */}
          <SectionCard title="Details">
            <InfoRow label="Date & Time" value={`${new Date(transaction.timestamp).toLocaleDateString()} at ${new Date(transaction.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`} />
            <InfoRow
              label="Reference ID"
              value={
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{transaction.referenceId || '—'}</span>
                  {transaction.referenceId && (
                    <Copy
                      className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground cursor-pointer"
                      onClick={() => copyToClipboard(transaction.referenceId, 'Reference ID')}
                    />
                  )}
                </div>
              }
            />
            {!isConversion && !isBnsl && (
              <InfoRow
                label={isDeposit ? 'Deposit Fee (0.5%)' : 'Network Fee'}
                value={`$${calculatedFee.toFixed(2)}`}
              />
            )}
            {isConversion && <InfoRow label="Fee" value="No fee" />}
          </SectionCard>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3 pt-1">
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
              <Download className="w-4 h-4 mr-2" /> Download
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
