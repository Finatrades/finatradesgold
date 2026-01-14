import { jsPDF } from 'jspdf';
import { format } from 'date-fns';

export interface FinancialReportData {
  overview?: {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    totalAUM: number;
    goldHoldingsGrams: number;
    goldValueUsd: number;
    fiatBalancesUsd?: number;
    totalLiabilities: number;
    goldLiabilityGrams: number;
    pendingPayoutsUsd: number;
  };
  metrics?: {
    finapay: {
      activeWallets: number;
      transactionCount: number;
      volumeUsd: number;
      feesCollectedUsd: number;
    };
    finavault: {
      totalHoldings: number;
      goldStoredGrams: number;
      storageFeesUsd: number;
      activeUsers: number;
    };
    bnsl: {
      activePlans: number;
      totalPrincipalUsd: number;
      interestEarnedUsd: number;
      expectedPayoutsUsd: number;
      delinquentPlans: number;
    };
  };
  goldHoldings?: {
    totalGoldGrams: number;
    freeGoldGrams: number;
    lockedGoldGrams: number;
    walletGoldGrams: number;
    vaultGoldGrams: number;
    bnslLockedGrams: number;
    finabridgeLockedGrams: number;
    goldValueUsd: number;
    goldPricePerGram: number;
  };
  dateRange: string;
  generatedAt: string;
}

export function exportFinancialReportToCSV(data: FinancialReportData, filename: string = 'financial_report') {
  const rows: string[][] = [];
  
  rows.push(['Finatrades Financial Report']);
  rows.push([`Generated: ${data.generatedAt}`]);
  rows.push([`Date Range: ${data.dateRange}`]);
  rows.push([]);
  
  if (data.overview) {
    rows.push(['=== FINANCIAL OVERVIEW ===']);
    rows.push(['Metric', 'Value']);
    rows.push(['Total Revenue', `$${data.overview.totalRevenue.toLocaleString()}`]);
    rows.push(['Total Expenses', `$${data.overview.totalExpenses.toLocaleString()}`]);
    rows.push(['Net Profit', `$${data.overview.netProfit.toLocaleString()}`]);
    rows.push(['Assets Under Management', `$${data.overview.totalAUM.toLocaleString()}`]);
    rows.push(['Gold Holdings', `${data.overview.goldHoldingsGrams.toFixed(4)}g ($${data.overview.goldValueUsd.toLocaleString()})`]);
    rows.push(['Fiat Balances', `$${(data.overview.fiatBalancesUsd || 0).toLocaleString()}`]);
    rows.push(['Total Liabilities', `$${data.overview.totalLiabilities.toLocaleString()}`]);
    rows.push(['Gold Liability', `${data.overview.goldLiabilityGrams.toFixed(4)}g`]);
    rows.push(['Pending Payouts', `$${data.overview.pendingPayoutsUsd.toLocaleString()}`]);
    rows.push([]);
  }
  
  if (data.metrics) {
    rows.push(['=== PRODUCT METRICS ===']);
    rows.push([]);
    rows.push(['--- FinaPay ---']);
    rows.push(['Active Wallets', data.metrics.finapay.activeWallets.toString()]);
    rows.push(['Transaction Count', data.metrics.finapay.transactionCount.toString()]);
    rows.push(['Volume (USD)', `$${data.metrics.finapay.volumeUsd.toLocaleString()}`]);
    rows.push(['Fees Collected', `$${data.metrics.finapay.feesCollectedUsd.toLocaleString()}`]);
    rows.push([]);
    rows.push(['--- FinaVault ---']);
    rows.push(['Total Holdings', data.metrics.finavault.totalHoldings.toString()]);
    rows.push(['Gold Stored', `${data.metrics.finavault.goldStoredGrams.toFixed(4)}g`]);
    rows.push(['Storage Fees', `$${data.metrics.finavault.storageFeesUsd.toLocaleString()}`]);
    rows.push(['Active Users', data.metrics.finavault.activeUsers.toString()]);
    rows.push([]);
    rows.push(['--- BNSL ---']);
    rows.push(['Active Plans', data.metrics.bnsl.activePlans.toString()]);
    rows.push(['Total Principal', `$${data.metrics.bnsl.totalPrincipalUsd.toLocaleString()}`]);
    rows.push(['Interest Earned', `$${data.metrics.bnsl.interestEarnedUsd.toLocaleString()}`]);
    rows.push(['Expected Payouts', `$${data.metrics.bnsl.expectedPayoutsUsd.toLocaleString()}`]);
    rows.push(['Delinquent Plans', data.metrics.bnsl.delinquentPlans.toString()]);
    rows.push([]);
  }
  
  if (data.goldHoldings) {
    rows.push(['=== GOLD HOLDINGS BREAKDOWN ===']);
    rows.push(['Category', 'Grams']);
    rows.push(['Total Gold', `${data.goldHoldings.totalGoldGrams.toFixed(4)}g`]);
    rows.push(['Free Gold', `${data.goldHoldings.freeGoldGrams.toFixed(4)}g`]);
    rows.push(['Locked Gold', `${data.goldHoldings.lockedGoldGrams.toFixed(4)}g`]);
    rows.push(['Wallet Gold', `${data.goldHoldings.walletGoldGrams.toFixed(4)}g`]);
    rows.push(['Vault Gold', `${data.goldHoldings.vaultGoldGrams.toFixed(4)}g`]);
    rows.push(['BNSL Locked', `${data.goldHoldings.bnslLockedGrams.toFixed(4)}g`]);
    rows.push(['FinaBridge Locked', `${data.goldHoldings.finabridgeLockedGrams.toFixed(4)}g`]);
    rows.push(['Total Value (USD)', `$${data.goldHoldings.goldValueUsd.toLocaleString()}`]);
    rows.push(['Gold Price/g', `$${data.goldHoldings.goldPricePerGram.toFixed(2)}`]);
  }
  
  const csvContent = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function exportFinancialReportToPDF(data: FinancialReportData, title: string = 'Financial Report') {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let yPos = 20;
  
  const checkPageBreak = (requiredSpace: number = 20) => {
    if (yPos + requiredSpace > 270) {
      doc.addPage();
      yPos = 20;
    }
  };
  
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(74, 0, 130);
  doc.text('Finatrades', margin, yPos);
  
  doc.setFontSize(14);
  doc.setTextColor(60);
  doc.text(title, margin, yPos + 8);
  yPos += 18;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`Generated: ${data.generatedAt}`, margin, yPos);
  doc.text(`Period: ${data.dateRange}`, pageWidth - margin - 50, yPos);
  yPos += 15;
  
  if (data.overview) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40);
    doc.text('Financial Overview', margin, yPos);
    yPos += 8;
    
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, yPos - 4, pageWidth - margin * 2, 50, 'F');
    
    const col1 = margin + 5;
    const col2 = pageWidth / 2 + 5;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    doc.setTextColor(100);
    doc.text('Total Revenue', col1, yPos);
    doc.setTextColor(34, 139, 34);
    doc.setFont('helvetica', 'bold');
    doc.text(`$${data.overview.totalRevenue.toLocaleString()}`, col1, yPos + 5);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text('Net Profit', col2, yPos);
    doc.setTextColor(34, 139, 34);
    doc.setFont('helvetica', 'bold');
    doc.text(`$${data.overview.netProfit.toLocaleString()}`, col2, yPos + 5);
    
    yPos += 15;
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text('Assets Under Management', col1, yPos);
    doc.setTextColor(30, 64, 175);
    doc.setFont('helvetica', 'bold');
    doc.text(`$${data.overview.totalAUM.toLocaleString()}`, col1, yPos + 5);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text('Total Liabilities', col2, yPos);
    doc.setTextColor(147, 51, 234);
    doc.setFont('helvetica', 'bold');
    doc.text(`$${data.overview.totalLiabilities.toLocaleString()}`, col2, yPos + 5);
    
    yPos += 15;
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text('Gold Holdings', col1, yPos);
    doc.setTextColor(202, 138, 4);
    doc.setFont('helvetica', 'bold');
    doc.text(`${data.overview.goldHoldingsGrams.toFixed(2)}g ($${data.overview.goldValueUsd.toLocaleString()})`, col1, yPos + 5);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text('Pending Payouts', col2, yPos);
    doc.setTextColor(220, 38, 38);
    doc.setFont('helvetica', 'bold');
    doc.text(`$${data.overview.pendingPayoutsUsd.toLocaleString()}`, col2, yPos + 5);
    
    yPos += 25;
  }
  
  if (data.metrics) {
    checkPageBreak(80);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40);
    doc.text('Product Performance', margin, yPos);
    yPos += 10;
    
    const productWidth = (pageWidth - margin * 2 - 10) / 3;
    
    [
      { name: 'FinaPay', data: data.metrics.finapay, color: [59, 130, 246] as [number, number, number] },
      { name: 'FinaVault', data: data.metrics.finavault, color: [168, 85, 247] as [number, number, number] },
      { name: 'BNSL', data: data.metrics.bnsl, color: [34, 197, 94] as [number, number, number] }
    ].forEach((product, index) => {
      const xPos = margin + (productWidth + 5) * index;
      
      doc.setFillColor(...product.color);
      doc.rect(xPos, yPos, productWidth, 6, 'F');
      
      doc.setFillColor(248, 250, 252);
      doc.rect(xPos, yPos + 6, productWidth, 35, 'F');
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255);
      doc.text(product.name, xPos + 3, yPos + 4);
      
      doc.setFontSize(8);
      doc.setTextColor(60);
      doc.setFont('helvetica', 'normal');
      
      if (product.name === 'FinaPay') {
        doc.text(`Wallets: ${(product.data as typeof data.metrics.finapay).activeWallets}`, xPos + 3, yPos + 14);
        doc.text(`Transactions: ${(product.data as typeof data.metrics.finapay).transactionCount}`, xPos + 3, yPos + 20);
        doc.text(`Volume: $${(product.data as typeof data.metrics.finapay).volumeUsd.toLocaleString()}`, xPos + 3, yPos + 26);
        doc.text(`Fees: $${(product.data as typeof data.metrics.finapay).feesCollectedUsd.toLocaleString()}`, xPos + 3, yPos + 32);
      } else if (product.name === 'FinaVault') {
        doc.text(`Holdings: ${(product.data as typeof data.metrics.finavault).totalHoldings}`, xPos + 3, yPos + 14);
        doc.text(`Gold: ${(product.data as typeof data.metrics.finavault).goldStoredGrams.toFixed(2)}g`, xPos + 3, yPos + 20);
        doc.text(`Storage Fees: $${(product.data as typeof data.metrics.finavault).storageFeesUsd.toLocaleString()}`, xPos + 3, yPos + 26);
        doc.text(`Users: ${(product.data as typeof data.metrics.finavault).activeUsers}`, xPos + 3, yPos + 32);
      } else if (product.name === 'BNSL') {
        doc.text(`Active Plans: ${(product.data as typeof data.metrics.bnsl).activePlans}`, xPos + 3, yPos + 14);
        doc.text(`Principal: $${(product.data as typeof data.metrics.bnsl).totalPrincipalUsd.toLocaleString()}`, xPos + 3, yPos + 20);
        doc.text(`Interest: $${(product.data as typeof data.metrics.bnsl).interestEarnedUsd.toLocaleString()}`, xPos + 3, yPos + 26);
        doc.text(`Payouts: $${(product.data as typeof data.metrics.bnsl).expectedPayoutsUsd.toLocaleString()}`, xPos + 3, yPos + 32);
      }
    });
    
    yPos += 50;
  }
  
  if (data.goldHoldings) {
    checkPageBreak(60);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40);
    doc.text('Gold Holdings Breakdown', margin, yPos);
    yPos += 8;
    
    doc.setFillColor(254, 249, 195);
    doc.rect(margin, yPos - 4, pageWidth - margin * 2, 45, 'F');
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    const gCol1 = margin + 5;
    const gCol2 = margin + 65;
    const gCol3 = pageWidth / 2 + 5;
    
    doc.setTextColor(100);
    doc.text('Total Gold:', gCol1, yPos);
    doc.setTextColor(40);
    doc.setFont('helvetica', 'bold');
    doc.text(`${data.goldHoldings.totalGoldGrams.toFixed(4)}g`, gCol2, yPos);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text('Gold Value:', gCol3, yPos);
    doc.setTextColor(40);
    doc.setFont('helvetica', 'bold');
    doc.text(`$${data.goldHoldings.goldValueUsd.toLocaleString()}`, gCol3 + 50, yPos);
    
    yPos += 8;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text('Free Gold:', gCol1, yPos);
    doc.setTextColor(34, 139, 34);
    doc.text(`${data.goldHoldings.freeGoldGrams.toFixed(4)}g`, gCol2, yPos);
    
    doc.setTextColor(100);
    doc.text('Locked Gold:', gCol3, yPos);
    doc.setTextColor(220, 38, 38);
    doc.text(`${data.goldHoldings.lockedGoldGrams.toFixed(4)}g`, gCol3 + 50, yPos);
    
    yPos += 8;
    doc.setTextColor(100);
    doc.text('Wallet Gold:', gCol1, yPos);
    doc.setTextColor(40);
    doc.text(`${data.goldHoldings.walletGoldGrams.toFixed(4)}g`, gCol2, yPos);
    
    doc.setTextColor(100);
    doc.text('Vault Gold:', gCol3, yPos);
    doc.setTextColor(40);
    doc.text(`${data.goldHoldings.vaultGoldGrams.toFixed(4)}g`, gCol3 + 50, yPos);
    
    yPos += 8;
    doc.setTextColor(100);
    doc.text('BNSL Locked:', gCol1, yPos);
    doc.setTextColor(40);
    doc.text(`${data.goldHoldings.bnslLockedGrams.toFixed(4)}g`, gCol2, yPos);
    
    doc.setTextColor(100);
    doc.text('FinaBridge:', gCol3, yPos);
    doc.setTextColor(40);
    doc.text(`${data.goldHoldings.finabridgeLockedGrams.toFixed(4)}g`, gCol3 + 50, yPos);
    
    yPos += 8;
    doc.setTextColor(100);
    doc.text('Gold Price/gram:', gCol1, yPos);
    doc.setTextColor(202, 138, 4);
    doc.setFont('helvetica', 'bold');
    doc.text(`$${data.goldHoldings.goldPricePerGram.toFixed(2)}`, gCol2, yPos);
  }
  
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Finatrades Financial Report - Page ${i} of ${pageCount} - Confidential`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }
  
  doc.save(`financial_report_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`);
}

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
