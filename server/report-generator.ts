import { db } from "./db";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { reportExports, transactions, users, wallets, vaultHoldings, bnslPlans } from "@shared/schema";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { format } from "date-fns";

const FINATRADES_ORANGE = '#f97316';
const REPORTS_DIR = path.join(process.cwd(), 'uploads', 'reports');

if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

interface TransactionData {
  id: string;
  type: string;
  amount: string;
  goldGrams: string | null;
  status: string;
  description: string | null;
  createdAt: Date;
  walletType?: string;
}

export async function processReportExport(reportId: string): Promise<void> {
  console.log(`[ReportGenerator] Processing report: ${reportId}`);
  
  try {
    const [report] = await db
      .select()
      .from(reportExports)
      .where(eq(reportExports.id, reportId));
    
    if (!report) {
      console.error(`[ReportGenerator] Report not found: ${reportId}`);
      return;
    }
    
    if (report.status !== 'pending') {
      console.log(`[ReportGenerator] Report ${reportId} already processed, status: ${report.status}`);
      return;
    }

    await db
      .update(reportExports)
      .set({ status: 'generating' })
      .where(eq(reportExports.id, reportId));

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, report.userId));

    if (!user) {
      throw new Error('User not found');
    }

    let filePath: string;
    let fileSize: number;

    switch (report.reportType) {
      case 'transaction_history':
        if (report.format === 'csv') {
          ({ filePath, fileSize } = await generateTransactionHistoryCSV(report, user));
        } else {
          ({ filePath, fileSize } = await generateTransactionHistoryPDF(report, user));
        }
        break;
      case 'tax_report':
        if (report.format === 'csv') {
          ({ filePath, fileSize } = await generateTaxReportCSV(report, user));
        } else {
          ({ filePath, fileSize } = await generateTaxReportPDF(report, user));
        }
        break;
      case 'portfolio_summary':
        if (report.format === 'csv') {
          ({ filePath, fileSize } = await generatePortfolioSummaryCSV(report, user));
        } else {
          ({ filePath, fileSize } = await generatePortfolioSummaryPDF(report, user));
        }
        break;
      default:
        throw new Error(`Unknown report type: ${report.reportType}`);
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await db
      .update(reportExports)
      .set({
        status: 'completed',
        fileUrl: filePath,
        fileSizeBytes: fileSize,
        completedAt: new Date(),
        expiresAt,
      })
      .where(eq(reportExports.id, reportId));

    console.log(`[ReportGenerator] Report ${reportId} completed: ${filePath}`);
  } catch (error: any) {
    console.error(`[ReportGenerator] Error processing report ${reportId}:`, error);
    
    await db
      .update(reportExports)
      .set({
        status: 'failed',
        errorMessage: error.message || 'Unknown error occurred',
      })
      .where(eq(reportExports.id, reportId));
  }
}

async function getTransactions(userId: string, dateFrom: string | null, dateTo: string | null): Promise<TransactionData[]> {
  let query = db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.createdAt));

  const results = await query;
  
  return results
    .filter((tx) => {
      if (dateFrom) {
        const from = new Date(dateFrom);
        if (tx.createdAt < from) return false;
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (tx.createdAt > to) return false;
      }
      return true;
    })
    .map((tx) => ({
      id: tx.id,
      type: tx.type,
      amount: tx.amountUsd || '0',
      goldGrams: tx.amountGold || '0',
      status: tx.status,
      description: tx.description,
      createdAt: tx.createdAt,
      walletType: tx.goldWalletType || undefined,
    }));
}

async function generateTransactionHistoryCSV(
  report: typeof reportExports.$inferSelect,
  user: typeof users.$inferSelect
): Promise<{ filePath: string; fileSize: number }> {
  const txns = await getTransactions(report.userId, report.dateFrom, report.dateTo);
  
  const headers = ['Date', 'Transaction ID', 'Type', 'Amount (AED)', 'Gold (g)', 'Status', 'Description', 'Wallet Type'];
  const rows = txns.map((tx) => [
    format(tx.createdAt, 'yyyy-MM-dd HH:mm:ss'),
    tx.id,
    tx.type,
    tx.amount,
    tx.goldGrams || '',
    tx.status,
    (tx.description || '').replace(/,/g, ';'),
    tx.walletType || '',
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

  const fileName = `transaction_history_${report.userId}_${Date.now()}.csv`;
  const filePath = path.join(REPORTS_DIR, fileName);
  
  fs.writeFileSync(filePath, csvContent, 'utf8');
  const stats = fs.statSync(filePath);
  
  return { filePath, fileSize: stats.size };
}

async function generateTransactionHistoryPDF(
  report: typeof reportExports.$inferSelect,
  user: typeof users.$inferSelect
): Promise<{ filePath: string; fileSize: number }> {
  const txns = await getTransactions(report.userId, report.dateFrom, report.dateTo);
  
  const fileName = `transaction_history_${report.userId}_${Date.now()}.pdf`;
  const filePath = path.join(REPORTS_DIR, fileName);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    doc.fontSize(20).fillColor(FINATRADES_ORANGE).text('Transaction History Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).fillColor('#333');
    doc.text(`Generated for: ${user.firstName} ${user.lastName}`);
    doc.text(`Email: ${user.email}`);
    doc.text(`Date Range: ${report.dateFrom || 'All'} to ${report.dateTo || 'Present'}`);
    doc.text(`Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`);
    doc.moveDown(2);

    doc.fontSize(10).fillColor('#666');
    const colWidths = [80, 60, 60, 60, 60, 80];
    const startX = 50;
    let currentY = doc.y;

    const headers = ['Date', 'Type', 'Amount', 'Gold (g)', 'Status', 'Description'];
    headers.forEach((header, i) => {
      doc.text(header, startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0), currentY, {
        width: colWidths[i],
        align: 'left',
      });
    });
    
    currentY += 20;
    doc.moveTo(startX, currentY).lineTo(startX + 400, currentY).stroke();
    currentY += 10;

    doc.fillColor('#333');
    for (const tx of txns.slice(0, 50)) {
      if (currentY > 700) {
        doc.addPage();
        currentY = 50;
      }

      const row = [
        format(tx.createdAt, 'MM/dd/yy'),
        tx.type,
        `${parseFloat(tx.amount).toFixed(2)}`,
        tx.goldGrams ? parseFloat(tx.goldGrams).toFixed(4) : '-',
        tx.status,
        (tx.description || '-').slice(0, 15),
      ];

      row.forEach((cell, i) => {
        doc.text(cell, startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0), currentY, {
          width: colWidths[i],
          align: 'left',
        });
      });
      currentY += 18;
    }

    if (txns.length > 50) {
      doc.moveDown();
      doc.fontSize(10).fillColor('#999').text(`... and ${txns.length - 50} more transactions`, { align: 'center' });
    }

    doc.moveDown(2);
    doc.fontSize(8).fillColor('#999').text('This report is automatically generated by Finatrades.', { align: 'center' });

    doc.end();

    writeStream.on('finish', () => {
      const stats = fs.statSync(filePath);
      resolve({ filePath, fileSize: stats.size });
    });
    writeStream.on('error', reject);
  });
}

async function generateTaxReportCSV(
  report: typeof reportExports.$inferSelect,
  user: typeof users.$inferSelect
): Promise<{ filePath: string; fileSize: number }> {
  const txns = await getTransactions(report.userId, report.dateFrom, report.dateTo);
  
  const buyTxns = txns.filter((tx) => tx.type === 'Buy' && tx.status === 'Completed');
  const sellTxns = txns.filter((tx) => tx.type === 'Sell' && tx.status === 'Completed');
  
  const totalBought = buyTxns.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
  const totalSold = sellTxns.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
  const totalGoldBought = buyTxns.reduce((sum, tx) => sum + parseFloat(tx.goldGrams || '0'), 0);
  const totalGoldSold = sellTxns.reduce((sum, tx) => sum + parseFloat(tx.goldGrams || '0'), 0);

  const headers = ['Category', 'Count', 'Total Amount (AED)', 'Total Gold (g)'];
  const rows = [
    ['Gold Purchases', buyTxns.length.toString(), totalBought.toFixed(2), totalGoldBought.toFixed(4)],
    ['Gold Sales', sellTxns.length.toString(), totalSold.toFixed(2), totalGoldSold.toFixed(4)],
    ['Net Position', '', (totalSold - totalBought).toFixed(2), (totalGoldBought - totalGoldSold).toFixed(4)],
  ];

  const csvContent = [
    `Tax Report for ${user.firstName} ${user.lastName}`,
    `Period: ${report.dateFrom || 'All time'} to ${report.dateTo || 'Present'}`,
    `Generated: ${format(new Date(), 'yyyy-MM-dd')}`,
    '',
    headers.join(','),
    ...rows.map((r) => r.join(',')),
  ].join('\n');

  const fileName = `tax_report_${report.userId}_${Date.now()}.csv`;
  const filePath = path.join(REPORTS_DIR, fileName);
  
  fs.writeFileSync(filePath, csvContent, 'utf8');
  const stats = fs.statSync(filePath);
  
  return { filePath, fileSize: stats.size };
}

async function generateTaxReportPDF(
  report: typeof reportExports.$inferSelect,
  user: typeof users.$inferSelect
): Promise<{ filePath: string; fileSize: number }> {
  const txns = await getTransactions(report.userId, report.dateFrom, report.dateTo);
  
  const buyTxns = txns.filter((tx) => tx.type === 'Buy' && tx.status === 'Completed');
  const sellTxns = txns.filter((tx) => tx.type === 'Sell' && tx.status === 'Completed');
  
  const totalBought = buyTxns.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
  const totalSold = sellTxns.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
  const totalGoldBought = buyTxns.reduce((sum, tx) => sum + parseFloat(tx.goldGrams || '0'), 0);
  const totalGoldSold = sellTxns.reduce((sum, tx) => sum + parseFloat(tx.goldGrams || '0'), 0);

  const fileName = `tax_report_${report.userId}_${Date.now()}.pdf`;
  const filePath = path.join(REPORTS_DIR, fileName);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    doc.fontSize(20).fillColor(FINATRADES_ORANGE).text('Tax Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).fillColor('#333');
    doc.text(`Account Holder: ${user.firstName} ${user.lastName}`);
    doc.text(`Email: ${user.email}`);
    doc.text(`Report Period: ${report.dateFrom || 'All time'} to ${report.dateTo || 'Present'}`);
    doc.text(`Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`);
    doc.moveDown(2);

    doc.fontSize(14).fillColor(FINATRADES_ORANGE).text('Summary');
    doc.moveDown();
    doc.fontSize(12).fillColor('#333');
    
    doc.text(`Total Gold Purchases: ${buyTxns.length} transactions`);
    doc.text(`  - Total Amount: AED ${totalBought.toFixed(2)}`);
    doc.text(`  - Total Gold: ${totalGoldBought.toFixed(4)}g`);
    doc.moveDown();
    
    doc.text(`Total Gold Sales: ${sellTxns.length} transactions`);
    doc.text(`  - Total Amount: AED ${totalSold.toFixed(2)}`);
    doc.text(`  - Total Gold: ${totalGoldSold.toFixed(4)}g`);
    doc.moveDown();

    doc.fontSize(14).fillColor(FINATRADES_ORANGE).text('Net Position');
    doc.moveDown();
    doc.fontSize(12).fillColor('#333');
    doc.text(`Net Cash Flow: AED ${(totalSold - totalBought).toFixed(2)}`);
    doc.text(`Net Gold Position: ${(totalGoldBought - totalGoldSold).toFixed(4)}g`);

    doc.moveDown(3);
    doc.fontSize(8).fillColor('#999');
    doc.text('This document is for informational purposes only and should not be considered tax advice.', { align: 'center' });
    doc.text('Please consult with a qualified tax professional for official tax filings.', { align: 'center' });

    doc.end();

    writeStream.on('finish', () => {
      const stats = fs.statSync(filePath);
      resolve({ filePath, fileSize: stats.size });
    });
    writeStream.on('error', reject);
  });
}

async function generatePortfolioSummaryCSV(
  report: typeof reportExports.$inferSelect,
  user: typeof users.$inferSelect
): Promise<{ filePath: string; fileSize: number }> {
  const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, report.userId));
  const holdings = await db.select().from(vaultHoldings).where(eq(vaultHoldings.userId, report.userId));
  const plans = await db.select().from(bnslPlans).where(eq(bnslPlans.userId, report.userId));

  const rows = [
    ['Asset Type', 'Description', 'Amount/Quantity', 'Value (USD)'],
    ['Gold Balance', 'Gold Wallet Balance (grams)', wallet?.goldGrams || '0', wallet?.goldGrams || '0'],
    ['USD Balance', 'USD Cash Balance', wallet?.usdBalance || '0', wallet?.usdBalance || '0'],
    ['EUR Balance', 'EUR Cash Balance', wallet?.eurBalance || '0', wallet?.eurBalance || '0'],
    ['Vault Holdings', 'Physical Gold Holdings', holdings.length.toString(), holdings.reduce((sum, h) => sum + parseFloat(h.goldGrams || '0'), 0).toFixed(4)],
    ['BNSL Plans', 'Active Savings Plans', plans.filter((p) => p.status === 'Active').length.toString(), plans.reduce((sum, p) => sum + parseFloat(p.goldSoldGrams || '0'), 0).toFixed(4)],
  ];

  const csvContent = [
    `Portfolio Summary for ${user.firstName} ${user.lastName}`,
    `Generated: ${format(new Date(), 'yyyy-MM-dd')}`,
    '',
    ...rows.map((r) => r.join(',')),
  ].join('\n');

  const fileName = `portfolio_summary_${report.userId}_${Date.now()}.csv`;
  const filePath = path.join(REPORTS_DIR, fileName);
  
  fs.writeFileSync(filePath, csvContent, 'utf8');
  const stats = fs.statSync(filePath);
  
  return { filePath, fileSize: stats.size };
}

async function generatePortfolioSummaryPDF(
  report: typeof reportExports.$inferSelect,
  user: typeof users.$inferSelect
): Promise<{ filePath: string; fileSize: number }> {
  const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, report.userId));
  const holdings = await db.select().from(vaultHoldings).where(eq(vaultHoldings.userId, report.userId));
  const plans = await db.select().from(bnslPlans).where(eq(bnslPlans.userId, report.userId));

  const fileName = `portfolio_summary_${report.userId}_${Date.now()}.pdf`;
  const filePath = path.join(REPORTS_DIR, fileName);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    doc.fontSize(20).fillColor(FINATRADES_ORANGE).text('Portfolio Summary', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).fillColor('#333');
    doc.text(`Account Holder: ${user.firstName} ${user.lastName}`);
    doc.text(`Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`);
    doc.moveDown(2);

    doc.fontSize(14).fillColor(FINATRADES_ORANGE).text('Wallet Balances');
    doc.moveDown();
    doc.fontSize(12).fillColor('#333');
    doc.text(`Gold Balance: ${parseFloat(wallet?.goldGrams || '0').toFixed(4)}g`);
    doc.text(`USD Balance: $${parseFloat(wallet?.usdBalance || '0').toFixed(2)}`);
    doc.text(`EUR Balance: €${parseFloat(wallet?.eurBalance || '0').toFixed(2)}`);
    doc.moveDown(2);

    doc.fontSize(14).fillColor(FINATRADES_ORANGE).text('Vault Holdings');
    doc.moveDown();
    doc.fontSize(12).fillColor('#333');
    doc.text(`Total Holdings: ${holdings.length} items`);
    doc.text(`Total Gold: ${holdings.reduce((sum, h) => sum + parseFloat(h.goldGrams || '0'), 0).toFixed(4)}g`);
    doc.moveDown(2);

    doc.fontSize(14).fillColor(FINATRADES_ORANGE).text('BNSL Plans');
    doc.moveDown();
    doc.fontSize(12).fillColor('#333');
    const activePlans = plans.filter((p) => p.status === 'Active');
    doc.text(`Active Plans: ${activePlans.length}`);
    doc.text(`Total Gold in Plans: ${activePlans.reduce((sum, p) => sum + parseFloat(p.goldSoldGrams || '0'), 0).toFixed(4)}g`);

    doc.moveDown(3);
    doc.fontSize(8).fillColor('#999').text('This report reflects your portfolio at the time of generation.', { align: 'center' });

    doc.end();

    writeStream.on('finish', () => {
      const stats = fs.statSync(filePath);
      resolve({ filePath, fileSize: stats.size });
    });
    writeStream.on('error', reject);
  });
}

export async function processPendingReports(): Promise<void> {
  console.log('[ReportGenerator] Checking for pending reports...');
  
  const pendingReports = await db
    .select()
    .from(reportExports)
    .where(eq(reportExports.status, 'pending'))
    .orderBy(reportExports.createdAt);

  console.log(`[ReportGenerator] Found ${pendingReports.length} pending reports`);

  for (const report of pendingReports) {
    await processReportExport(report.id);
  }
}

let processingInterval: NodeJS.Timeout | null = null;

export function startReportProcessor(intervalMs: number = 30000): void {
  if (processingInterval) {
    clearInterval(processingInterval);
  }
  
  console.log(`[ReportGenerator] Starting report processor (interval: ${intervalMs}ms)`);
  
  processPendingReports().catch(console.error);
  
  processingInterval = setInterval(() => {
    processPendingReports().catch(console.error);
  }, intervalMs);
}

export function stopReportProcessor(): void {
  if (processingInterval) {
    clearInterval(processingInterval);
    processingInterval = null;
    console.log('[ReportGenerator] Report processor stopped');
  }
}
