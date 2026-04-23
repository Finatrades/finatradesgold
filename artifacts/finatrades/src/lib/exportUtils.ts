import { jsPDF } from 'jspdf';
import { format } from 'date-fns';

async function loadLogoBase64(): Promise<string | null> {
  // Try the local public logo first, fall back to R2 CDN
  const sources = [
    `${window.location.origin}/finatrades-logo-purple.png`,
    'https://pub-37061337f46b4aeca26cb47a9ab5190b.r2.dev/branding/finatrades-logo-purple.png',
  ];
  for (const url of sources) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const blob = await res.blob();
      const b64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      if (b64) return b64;
    } catch { continue; }
  }
  return null;
}

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

export async function exportFinancialReportToPDF(data: FinancialReportData, title: string = 'Financial Report') {
  const logoBase64 = await loadLogoBase64();

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let yPos = 15;
  
  const checkPageBreak = (requiredSpace: number = 20) => {
    if (yPos + requiredSpace > 270) {
      doc.addPage();
      yPos = 20;
    }
  };

  // --- BRANDED COVER SECTION ---
  const pageHeight = doc.internal.pageSize.getHeight();

  // Purple header bar
  doc.setFillColor(138, 43, 226);
  doc.rect(0, 0, pageWidth, 24, 'F');

  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', margin, 3, 44, 18);
    } catch {}
  }

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);
  doc.text('FinaTrades Finance SA — Confidential', pageWidth - margin, 14, { align: 'right' });

  // Cover block
  yPos = 35;
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(74, 0, 130);
  doc.text(title, margin, yPos);
  yPos += 8;

  doc.setDrawColor(245, 158, 11);
  doc.setLineWidth(0.8);
  doc.line(margin, yPos, margin + 80, yPos);
  yPos += 6;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80);
  doc.text(`Report Period:`, margin, yPos);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40);
  doc.text(data.dateRange || '—', margin + 30, yPos);
  yPos += 6;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80);
  doc.text(`Generated:`, margin, yPos);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40);
  doc.text(data.generatedAt || new Date().toLocaleString(), margin + 30, yPos);
  yPos += 6;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80);
  doc.text(`Issued by:`, margin, yPos);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40);
  doc.text('FinaTrades Finance SA — Rue Robert-Céard 6, 1204 Geneva', margin + 30, yPos);
  yPos += 6;

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(130);
  doc.text('This report is confidential and intended solely for the named recipient.', margin, yPos);
  yPos += 12;

  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;
  
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

function getCleanTxLabel(tx: ExportTransaction): string {
  const desc = tx.description || '';
  const type = tx.type || '';
  // Conversion / price protection — check both type and description
  const isLgpwToFgpw = desc.includes('LGPW to FGPW') || desc.includes('LGPW To FGPW') ||
    type.toLowerCase().includes('lock gold') || type.toLowerCase().includes('lgpw to fgpw');
  const isFgpwToLgpw = desc.includes('FGPW to LGPW') || desc.includes('FGPW To LGPW') ||
    type.toLowerCase().includes('unlock gold') || type.toLowerCase().includes('fgpw to lgpw');
  if (type === 'Swap' || isLgpwToFgpw || isFgpwToLgpw) {
    if (isLgpwToFgpw) return 'Price Protection Activated';
    if (isFgpwToLgpw) return 'Price Protection Removed';
    return 'Wallet Conversion';
  }
  if (desc.includes('Bank Deposit') || desc.includes('Bank Transfer')) return 'Bank Deposit';
  if (desc.includes('FinaVault') || desc.includes('physical gold')) return 'Physical Gold Deposit';
  if (type === 'Deposit' || type === 'Buy' || type === 'Acquire Gold') return 'Acquire Gold';
  if (type === 'FinaCard Return') return 'FinaCard Return';
  if (type === 'FinaCard Fund') return 'FinaCard Fund';
  if (type === 'Withdrawal') return 'Withdrawal';
  if (type === 'Send') return 'Send Gold';
  if (type === 'Receive') return 'Receive Gold';
  return type;
}

function isConversionTx(tx: ExportTransaction): boolean {
  const type = tx.type || '';
  const desc = tx.description || '';
  return type === 'Swap' ||
    type.toLowerCase().includes('lock gold') ||
    type.toLowerCase().includes('unlock gold') ||
    desc.includes('LGPW to FGPW') || desc.includes('LGPW To FGPW') ||
    desc.includes('FGPW to LGPW') || desc.includes('FGPW To LGPW');
}

export async function exportToPDF(transactions: ExportTransaction[], title: string = 'Transaction History') {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const headerH = 44; // purple band (22) + gold line (2) + white sub-header (18) + separator (2)

  // Load logo
  const logoBase64 = await loadLogoBase64();

  const drawHeader = (pageNum: number, totalPages: number) => {
    // ── Purple top band ──────────────────────────────────────
    doc.setFillColor(74, 0, 130);
    doc.rect(0, 0, pageWidth, 22, 'F');
    // Gold accent bar
    doc.setFillColor(212, 175, 55);
    doc.rect(0, 22, pageWidth, 2, 'F');

    // White "FINATRADES" text on purple
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('FINATRADES', margin, 14);

    // Right side on purple band — title + page info
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(title, pageWidth - margin, 11, { align: 'right' });
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(210, 185, 255);
    doc.text(`Page ${pageNum} of ${totalPages}  |  ${transactions.length} records`, pageWidth - margin, 18, { align: 'right' });

    // ── White sub-header with logo ───────────────────────────
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 24, pageWidth, 18, 'F');

    if (logoBase64) {
      try {
        // Logo on white background — purple logo is visible
        doc.addImage(logoBase64, 'PNG', margin, 26, 42, 12);
      } catch {
        // fallback text if image fails
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(74, 0, 130);
        doc.text('FINATRADES', margin, 35);
      }
    } else {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(74, 0, 130);
      doc.text('FINATRADES', margin, 35);
    }

    // Generated date on the right of sub-header
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy, HH:mm')}`, pageWidth - margin, 30, { align: 'right' });
    doc.text('Confidential  |  Finatrades Finance SA', pageWidth - margin, 37, { align: 'right' });

    // Separator line
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.3);
    doc.line(margin, 42, pageWidth - margin, 42);
    doc.setLineWidth(0.1);
  };

  // ── Table setup ──────────────────────────────────────────
  // Columns: Date | Type | Reference | Gold (g) | USD ($) | Status
  const cols = {
    date:   { x: margin,      w: 28 },
    type:   { x: margin + 28, w: 56 },
    ref:    { x: margin + 84, w: 28 },
    gold:   { x: margin + 112,w: 26 },
    usd:    { x: margin + 138,w: 26 },
    status: { x: margin + 164,w: 24 },
  };
  const tableHeaders = ['Date', 'Type', 'Reference', 'Gold (g)', 'USD ($)', 'Status'];
  const colKeys = ['date', 'type', 'ref', 'gold', 'usd', 'status'] as const;

  let yPos = headerH + 12;
  let currentPage = 1;

  // Estimate total pages (rough)
  const rowH = 7;
  const rowsPerPage = Math.floor((pageHeight - headerH - 40) / rowH);
  const totalPages = Math.ceil(transactions.length / rowsPerPage) + 1;

  drawHeader(currentPage, totalPages);

  const drawTableHeader = () => {
    doc.setFillColor(245, 244, 252);
    doc.rect(margin, yPos - 5, pageWidth - margin * 2, 7.5, 'F');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(74, 0, 130);
    colKeys.forEach((key, i) => {
      const col = cols[key];
      const isRight = key === 'gold' || key === 'usd' || key === 'status';
      if (isRight) {
        doc.text(tableHeaders[i], col.x + col.w - 1, yPos, { align: 'right' });
      } else {
        doc.text(tableHeaders[i], col.x + 1, yPos);
      }
    });
    yPos += 8;
    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(0.3);
    doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2);
    doc.setLineWidth(0.1);
  };

  drawTableHeader();

  doc.setFont('helvetica', 'normal');

  transactions.forEach((tx, index) => {
    // Page break
    if (yPos > pageHeight - 28) {
      // Footer on current page
      doc.setFontSize(7);
      doc.setTextColor(160);
      doc.setFont('helvetica', 'normal');
      doc.text('Finatrades Finance SA  ·  Confidential  ·  finatrades.com', pageWidth / 2, pageHeight - 8, { align: 'center' });

      doc.addPage();
      currentPage++;
      yPos = headerH + 12;
      drawHeader(currentPage, totalPages);
      drawTableHeader();
    }

    const isConv = isConversionTx(tx);
    const label = getCleanTxLabel(tx);
    const date = tx.createdAt || tx.timestamp;
    const formattedDate = date ? format(new Date(date), 'dd/MM/yy HH:mm') : '';
    const goldAmount = tx.amountGold ? parseFloat(String(tx.amountGold)).toFixed(4) : '-';
    const usdAmount = (!isConv && tx.amountUsd) ? parseFloat(String(tx.amountUsd)).toFixed(2) : '-';
    const refId = tx.referenceId ? String(tx.referenceId).substring(0, 10) : tx.id?.substring(0, 8) || '-';

    // Alternating row bg
    if (index % 2 === 0) {
      doc.setFillColor(251, 250, 255);
      doc.rect(margin, yPos - 4.5, pageWidth - margin * 2, rowH, 'F');
    }

    doc.setFontSize(7.5);
    doc.setTextColor(60, 60, 60);

    // Date
    doc.setFont('helvetica', 'normal');
    doc.text(formattedDate, cols.date.x + 1, yPos);

    // Type label — colour coded
    if (isConv) {
      doc.setTextColor(120, 75, 0);
      doc.setFont('helvetica', 'bold');
    } else if (['Buy', 'Receive', 'Deposit', 'Acquire Gold'].includes(tx.type || '')) {
      doc.setTextColor(22, 101, 52);
      doc.setFont('helvetica', 'normal');
    } else if (['Send', 'Sell', 'Withdrawal'].includes(tx.type || '')) {
      doc.setTextColor(153, 27, 27);
      doc.setFont('helvetica', 'normal');
    } else {
      doc.setTextColor(60, 60, 60);
      doc.setFont('helvetica', 'normal');
    }
    const labelFit = label.length > 30 ? label.substring(0, 28) + '..' : label;
    doc.text(labelFit, cols.type.x + 1, yPos);

    // Reference
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(refId, cols.ref.x + 1, yPos);

    // Gold
    doc.setTextColor(60, 60, 60);
    doc.text(isConv ? goldAmount + 'g' : goldAmount, cols.gold.x + cols.gold.w - 1, yPos, { align: 'right' });

    // USD
    doc.text(usdAmount, cols.usd.x + cols.usd.w - 1, yPos, { align: 'right' });

    // Status
    if (tx.status === 'Completed') doc.setTextColor(22, 101, 52);
    else if (tx.status === 'Pending') doc.setTextColor(133, 100, 4);
    else if (tx.status === 'Failed') doc.setTextColor(153, 27, 27);
    else doc.setTextColor(100);
    doc.setFont('helvetica', 'bold');
    doc.text(tx.status || '-', cols.status.x + cols.status.w - 1, yPos, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60);

    yPos += rowH;
  });

  // ── Summary ─────────────────────────────────────────────
  yPos += 6;
  if (yPos > pageHeight - 36) {
    doc.setFontSize(7);
    doc.setTextColor(160);
    doc.text('Finatrades Finance SA  ·  Confidential  ·  finatrades.com', pageWidth / 2, pageHeight - 8, { align: 'center' });
    doc.addPage();
    currentPage++;
    yPos = headerH + 14;
    drawHeader(currentPage, totalPages);
  }

  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  doc.setLineWidth(0.1);
  yPos += 7;

  const creditTx = transactions.filter(tx => !isConversionTx(tx) &&
    ['Buy', 'Receive', 'Deposit', 'Acquire Gold'].includes(tx.type || ''));
  const debitTx = transactions.filter(tx => !isConversionTx(tx) &&
    ['Send', 'Sell', 'Withdrawal'].includes(tx.type || ''));
  const totalGoldIn = creditTx.reduce((s, tx) => s + (tx.amountGold ? parseFloat(String(tx.amountGold)) : 0), 0);
  const totalGoldOut = debitTx.reduce((s, tx) => s + (tx.amountGold ? parseFloat(String(tx.amountGold)) : 0), 0);
  const convCount = transactions.filter(isConversionTx).length;

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(74, 0, 130);
  doc.text('Summary', margin, yPos);
  yPos += 7;

  // Summary cards
  const cardW = (pageWidth - margin * 2 - 10) / 3;
  [[`Gold In`, `+${totalGoldIn.toFixed(4)}g`, [22, 101, 52]],
   [`Gold Out`, `-${totalGoldOut.toFixed(4)}g`, [153, 27, 27]],
   [`Wallet Conversions`, `${convCount}`, [120, 75, 0]]
  ].forEach(([label, value, color], i) => {
    const cx = margin + (cardW + 5) * i;
    doc.setFillColor(248, 246, 255);
    doc.roundedRect(cx, yPos - 4, cardW, 14, 2, 2, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(label as string, cx + 4, yPos + 1);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...(color as [number, number, number]));
    doc.text(value as string, cx + 4, yPos + 8);
  });

  // ── Final footer on last page ────────────────────────────
  const totalPagesActual = doc.getNumberOfPages();
  for (let i = 1; i <= totalPagesActual; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(160);
    doc.text(
      'Finatrades Finance SA  ·  Confidential  ·  finatrades.com',
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  }

  doc.save(`finatrades_transactions_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`);
}
