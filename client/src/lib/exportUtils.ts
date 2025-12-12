import jsPDF from 'jspdf';
import { format } from 'date-fns';

export interface ExportTransaction {
  id: string;
  type: string;
  status: string;
  amountGold?: number | string | null;
  amountUsd?: number | string | null;
  description?: string | null;
  referenceId?: string | null;
  createdAt?: string;
  timestamp?: string;
  assetType?: string;
}

export function exportToCSV(transactions: ExportTransaction[], filename: string = 'transactions') {
  const headers = ['Date', 'Reference', 'Type', 'Asset', 'Amount (Gold)', 'Amount (USD)', 'Status', 'Description'];
  
  const rows = transactions.map(tx => {
    const date = tx.createdAt || tx.timestamp;
    const formattedDate = date ? format(new Date(date), 'yyyy-MM-dd HH:mm:ss') : '';
    const goldAmount = tx.amountGold ? parseFloat(String(tx.amountGold)).toFixed(4) : '';
    const usdAmount = tx.amountUsd ? parseFloat(String(tx.amountUsd)).toFixed(2) : '';
    
    return [
      formattedDate,
      tx.referenceId || tx.id.slice(0, 8),
      tx.type,
      tx.assetType || 'USD',
      goldAmount,
      usdAmount,
      tx.status,
      tx.description || ''
    ];
  });
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function exportToPDF(transactions: ExportTransaction[], title: string = 'Transaction History') {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let yPos = 20;
  
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(title, margin, yPos);
  yPos += 8;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`Generated: ${format(new Date(), 'PPpp')}`, margin, yPos);
  doc.text(`Total Transactions: ${transactions.length}`, pageWidth - margin - 50, yPos);
  yPos += 15;
  
  const colWidths = [35, 25, 25, 30, 30, 35];
  const headers = ['Date', 'Type', 'Asset', 'Gold (g)', 'USD ($)', 'Status'];
  
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, yPos - 5, pageWidth - margin * 2, 8, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60);
  
  let xPos = margin;
  headers.forEach((header, i) => {
    doc.text(header, xPos + 2, yPos);
    xPos += colWidths[i];
  });
  yPos += 10;
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40);
  
  transactions.forEach((tx, index) => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
    
    if (index % 2 === 0) {
      doc.setFillColor(252, 252, 252);
      doc.rect(margin, yPos - 4, pageWidth - margin * 2, 7, 'F');
    }
    
    const date = tx.createdAt || tx.timestamp;
    const formattedDate = date ? format(new Date(date), 'MM/dd/yy HH:mm') : '';
    const goldAmount = tx.amountGold ? parseFloat(String(tx.amountGold)).toFixed(4) : '-';
    const usdAmount = tx.amountUsd ? parseFloat(String(tx.amountUsd)).toFixed(2) : '-';
    
    xPos = margin;
    doc.setFontSize(8);
    
    doc.text(formattedDate, xPos + 2, yPos);
    xPos += colWidths[0];
    
    doc.text(tx.type, xPos + 2, yPos);
    xPos += colWidths[1];
    
    doc.text(tx.assetType || 'USD', xPos + 2, yPos);
    xPos += colWidths[2];
    
    doc.text(goldAmount, xPos + 2, yPos);
    xPos += colWidths[3];
    
    doc.text(usdAmount, xPos + 2, yPos);
    xPos += colWidths[4];
    
    if (tx.status === 'Completed') {
      doc.setTextColor(34, 139, 34);
    } else if (tx.status === 'Pending') {
      doc.setTextColor(218, 165, 32);
    } else if (tx.status === 'Failed') {
      doc.setTextColor(220, 20, 60);
    }
    doc.text(tx.status, xPos + 2, yPos);
    doc.setTextColor(40);
    
    yPos += 7;
  });
  
  yPos += 10;
  doc.setDrawColor(200);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;
  
  const totalGold = transactions.reduce((sum, tx) => {
    const gold = tx.amountGold ? parseFloat(String(tx.amountGold)) : 0;
    return sum + (tx.type === 'Buy' || tx.type === 'Receive' ? gold : -gold);
  }, 0);
  
  const totalUsd = transactions.reduce((sum, tx) => {
    const usd = tx.amountUsd ? parseFloat(String(tx.amountUsd)) : 0;
    return sum + (tx.type === 'Sell' || tx.type === 'Receive' ? usd : -usd);
  }, 0);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary:', margin, yPos);
  yPos += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Net Gold Movement: ${totalGold >= 0 ? '+' : ''}${totalGold.toFixed(4)}g`, margin, yPos);
  yPos += 5;
  doc.text(`Net USD Movement: ${totalUsd >= 0 ? '+' : ''}$${totalUsd.toFixed(2)}`, margin, yPos);
  
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Finatrades - Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }
  
  doc.save(`transactions_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`);
}
