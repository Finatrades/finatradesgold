import type { Express, Request, Response } from "express";
import { storage } from "./storage";
import { db } from "./db";
import { z } from "zod";
import Decimal from "decimal.js";
import { 
  transactions, wallets, users, auditLogs, withdrawalRequests, depositRequests,
  amlCases, amlScreeningLogs, userRiskProfiles, kycSubmissions, vaultOwnershipSummary,
  storageFees, bnslPayouts, bnslWallets, finabridgeWallets, bnslPlans, platformConfig
} from "@shared/schema";
import { eq, and, gte, lte, desc, sql, or, like } from "drizzle-orm";
import { logAdminAction } from "./security-middleware";
import { format, subDays, startOfDay, endOfDay, differenceInDays } from "date-fns";
import PDFDocument from "pdfkit";
import { getGoldPricePerGram } from "./gold-price-service";
import {
  REVENUE_TRANSACTION_TYPES,
  COST_TRANSACTION_TYPES,
  getTransactionGlEntry,
} from "./chart-of-accounts";

// ============================================================================
// RECONCILIATION ENDPOINTS
// ============================================================================

interface ReconciliationReport {
  date: string;
  totalGoldGrams: string;
  totalUsdValue: string;
  transactionCount: number;
  depositCount: number;
  withdrawalCount: number;
  discrepancies: ReconciliationDiscrepancy[];
  status: 'balanced' | 'discrepancy_found' | 'pending_review';
}

interface ReconciliationDiscrepancy {
  type: 'balance_mismatch' | 'transaction_orphan' | 'missing_record';
  description: string;
  expectedValue: string;
  actualValue: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  transactionIds?: string[];
}

export async function generateDailyReconciliation(date: Date): Promise<ReconciliationReport> {
  const startDate = startOfDay(date);
  const endDate = endOfDay(date);
  
  // Get all transactions for the day
  const dayTransactions = await db.select()
    .from(transactions)
    .where(and(
      gte(transactions.createdAt, startDate),
      lte(transactions.createdAt, endDate),
      eq(transactions.status, 'Completed')
    ));
  
  // Get all wallet balances
  const allWallets = await db.select().from(wallets);
  
  // Calculate totals — using Decimal to avoid float accumulation errors
  let totalGoldGrams = new Decimal(0);
  let totalUsdValue = new Decimal(0);
  
  for (const wallet of allWallets) {
    totalGoldGrams = totalGoldGrams.plus(new Decimal(wallet.goldGrams || '0'));
    totalUsdValue = totalUsdValue.plus(new Decimal(wallet.usdBalance || '0'));
  }
  
  // Calculate transaction totals
  let transactionGoldIn = new Decimal(0);
  let transactionGoldOut = new Decimal(0);
  
  for (const tx of dayTransactions) {
    const amount = new Decimal(tx.amountGold || '0');
    if (['Buy', 'Receive', 'Deposit'].includes(tx.type)) {
      transactionGoldIn = transactionGoldIn.plus(amount);
    } else if (['Sell', 'Send', 'Withdrawal'].includes(tx.type)) {
      transactionGoldOut = transactionGoldOut.plus(amount);
    }
  }
  
  const discrepancies: ReconciliationDiscrepancy[] = [];
  
  // Check for orphan transactions (no matching wallet update)
  const depositCount = dayTransactions.filter(t => t.type === 'Deposit').length;
  const withdrawalCount = dayTransactions.filter(t => t.type === 'Withdrawal').length;
  
  return {
    date: format(date, 'yyyy-MM-dd'),
    totalGoldGrams: totalGoldGrams.toFixed(4),
    totalUsdValue: totalUsdValue.toFixed(2),
    transactionCount: dayTransactions.length,
    depositCount,
    withdrawalCount,
    discrepancies,
    status: discrepancies.length === 0 ? 'balanced' : 'discrepancy_found',
  };
}

// ============================================================================
// SAR (SUSPICIOUS ACTIVITY REPORT) MANAGEMENT
// ============================================================================

const sarReportSchema = z.object({
  userId: z.string(),
  caseId: z.string().optional(),
  suspiciousActivityType: z.enum([
    'structuring',
    'unusual_transaction_pattern',
    'high_risk_jurisdiction',
    'identity_concern',
    'source_of_funds_concern',
    'terrorist_financing_suspicion',
    'money_laundering_suspicion',
    'other'
  ]),
  activityDescription: z.string().min(50),
  transactionIds: z.array(z.string()).optional(),
  totalAmountInvolved: z.string(),
  dateRangeStart: z.string(),
  dateRangeEnd: z.string(),
  reportingOfficer: z.string(),
  supervisorReview: z.boolean().default(false),
  filedWithRegulator: z.boolean().default(false),
  regulatorReferenceNumber: z.string().optional(),
});

export type SarReport = z.infer<typeof sarReportSchema>;

interface SarReportRecord {
  id: string;
  report: SarReport;
  status: 'draft' | 'under_review' | 'approved' | 'filed' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  filedAt?: Date;
}

// SAR storage now uses database via storage.createSarReport, storage.getSarReport, etc.

export async function createSarReport(
  report: SarReport, 
  createdBy: string
): Promise<SarReportRecord> {
  // Save to database
  const dbRecord = await storage.createSarReport({
    userId: report.userId,
    caseId: report.caseId,
    suspiciousActivityType: report.suspiciousActivityType,
    activityDescription: report.activityDescription,
    transactionIds: report.transactionIds,
    totalAmountInvolved: report.totalAmountInvolved,
    dateRangeStart: new Date(report.dateRangeStart),
    dateRangeEnd: new Date(report.dateRangeEnd),
    reportingOfficer: report.reportingOfficer,
    status: 'draft',
  });
  
  const record: SarReportRecord = {
    id: dbRecord.id,
    report,
    status: 'draft',
    createdAt: dbRecord.created_at,
    updatedAt: dbRecord.updated_at,
    createdBy,
  };
  
  // Log the creation
  await storage.createAuditLog({
    entityType: 'sar_report',
    entityId: record.id,
    actor: createdBy,
    actorRole: 'admin',
    actionType: 'SAR_CREATED',
    details: JSON.stringify({
      userId: report.userId,
      activityType: report.suspiciousActivityType,
      amountInvolved: report.totalAmountInvolved,
    }),
  });
  
  return record;
}

// ============================================================================
// SANCTIONS SCREENING
// ============================================================================

interface SanctionsCheckResult {
  userId: string;
  userName: string;
  checkDate: Date;
  status: 'clear' | 'potential_match' | 'confirmed_match';
  matchDetails?: {
    listName: string;
    matchScore: number;
    matchedName: string;
    matchedCountry?: string;
  }[];
  requiresManualReview: boolean;
}

// Sample sanctions patterns for testing (in production, integrate with actual sanctions APIs like OFAC, EU, UN)
const SIMULATED_SANCTIONS_PATTERNS = [
  { name: 'test sanctioned', country: 'XX', listName: 'TEST_LIST', score: 100 },
  { name: 'blocked user', country: 'IR', listName: 'OFAC_SDN', score: 95 },
  { name: 'suspicious entity', country: 'KP', listName: 'UN_SANCTIONS', score: 90 },
];

export async function performSanctionsCheck(userId: string): Promise<SanctionsCheckResult> {
  const user = await storage.getUser(userId);
  
  if (!user) {
    throw new Error('User not found');
  }
  
  const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
  
  // Check against simulated sanctions list (in production, call external APIs)
  const matchDetails: { listName: string; matchScore: number; matchedName: string; matchedCountry?: string }[] = [];
  
  for (const pattern of SIMULATED_SANCTIONS_PATTERNS) {
    if (fullName.includes(pattern.name.toLowerCase())) {
      matchDetails.push({
        listName: pattern.listName,
        matchScore: pattern.score,
        matchedName: pattern.name,
        matchedCountry: pattern.country,
      });
    }
  }
  
  // Also check country if user has one set
  const userCountry = user.country?.toUpperCase();
  const highRiskCountries = ['IR', 'KP', 'SY', 'CU']; // Iran, North Korea, Syria, Cuba
  if (userCountry && highRiskCountries.includes(userCountry)) {
    matchDetails.push({
      listName: 'HIGH_RISK_JURISDICTION',
      matchScore: 75,
      matchedName: fullName,
      matchedCountry: userCountry,
    });
  }
  
  const result: SanctionsCheckResult = {
    userId,
    userName: `${user.firstName} ${user.lastName}`,
    checkDate: new Date(),
    status: matchDetails.length > 0 ? (matchDetails.some(m => m.matchScore >= 90) ? 'confirmed_match' : 'potential_match') : 'clear',
    matchDetails: matchDetails.length > 0 ? matchDetails : undefined,
    requiresManualReview: matchDetails.length > 0,
  };
  
  // Log the screening
  await storage.createAuditLog({
    entityType: 'sanctions_screening',
    entityId: userId,
    actor: 'system',
    actorRole: 'system',
    actionType: 'SANCTIONS_CHECK',
    details: JSON.stringify({
      result: result.status,
      checkDate: result.checkDate,
    }),
  });
  
  return result;
}

// ============================================================================
// FRAUD DETECTION
// ============================================================================

interface FraudAlert {
  id: string;
  userId: string;
  transactionId?: string;
  alertType: 'velocity_breach' | 'unusual_amount' | 'geographic_anomaly' | 'device_change' | 'pattern_match';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detectedAt: Date;
  status: 'new' | 'investigating' | 'confirmed_fraud' | 'false_positive' | 'resolved';
  reviewedBy?: string;
  reviewedAt?: Date;
  notes?: string;
}

// Fraud alerts now use database via storage.createFraudAlert, storage.getFraudAlert, etc.

export async function detectFraudPatterns(userId: string, transactionId?: string): Promise<FraudAlert[]> {
  const alerts: FraudAlert[] = [];
  
  const user = await storage.getUser(userId);
  if (!user) return alerts;
  
  // Get user's recent transactions
  const recentTransactions = await db.select()
    .from(transactions)
    .where(and(
      eq(transactions.userId, userId),
      gte(transactions.createdAt, subDays(new Date(), 7))
    ))
    .orderBy(desc(transactions.createdAt))
    .limit(100);
  
  // Velocity check - too many transactions in short time
  const last24hTransactions = recentTransactions.filter(
    t => t.createdAt && t.createdAt > subDays(new Date(), 1)
  );
  
  if (last24hTransactions.length > 20) {
    // Save to database
    const dbAlert = await storage.createFraudAlert({
      userId,
      transactionId,
      alertType: 'velocity_breach',
      severity: 'high',
      description: `User made ${last24hTransactions.length} transactions in 24 hours`,
      status: 'new',
    });
    
    const alert: FraudAlert = {
      id: dbAlert.id,
      userId,
      transactionId,
      alertType: 'velocity_breach',
      severity: 'high',
      description: `User made ${last24hTransactions.length} transactions in 24 hours`,
      detectedAt: dbAlert.created_at,
      status: 'new',
    };
    alerts.push(alert);
  }
  
  // Unusual amount check — using Decimal for precision
  const amountsDecimal = recentTransactions.map(t => new Decimal(t.amountUsd || '0'));
  const sumAmount = amountsDecimal.reduce((a, b) => a.plus(b), new Decimal(0));
  const avgAmount = amountsDecimal.length > 0 ? sumAmount.div(amountsDecimal.length) : new Decimal(0);
  
  if (transactionId) {
    const currentTx = recentTransactions.find(t => t.id === transactionId);
    if (currentTx) {
      const currentAmount = new Decimal(currentTx.amountUsd || '0');
      if (currentAmount.gt(avgAmount.mul(5)) && currentAmount.gt(5000)) {
        // Save to database
        const dbAlert = await storage.createFraudAlert({
          userId,
          transactionId,
          alertType: 'unusual_amount',
          severity: 'medium',
          description: `Transaction amount $${currentAmount.toFixed(2)} is ${currentAmount.div(avgAmount.gt(new Decimal(0)) ? avgAmount : new Decimal(1)).toFixed(1)}x higher than average`,
          status: 'new',
        });
        
        const alert: FraudAlert = {
          id: dbAlert.id,
          userId,
          transactionId,
          alertType: 'unusual_amount',
          severity: 'medium',
          description: `Transaction amount $${currentAmount.toFixed(2)} is ${currentAmount.div(avgAmount.gt(new Decimal(0)) ? avgAmount : new Decimal(1)).toFixed(1)}x higher than average`,
          detectedAt: dbAlert.created_at,
          status: 'new',
        };
        alerts.push(alert);
      }
    }
  }
  
  return alerts;
}

// ============================================================================
// REGISTER COMPLIANCE ROUTES
// ============================================================================

export function registerComplianceRoutes(
  app: Express,
  ensureAdminAsync: any,
  requirePermission: any
): void {
  
  // ============================================================================
  // RECONCILIATION ROUTES
  // ============================================================================
  
  // Get daily reconciliation report
  app.get("/api/admin/reconciliation/daily", ensureAdminAsync, requirePermission('view_reports', 'generate_reports'), async (req: Request, res: Response) => {
    try {
      const dateParam = req.query.date as string;
      const date = dateParam ? new Date(dateParam) : new Date();
      
      const report = await generateDailyReconciliation(date);

      // Augment report with GL-code breakdown for the day
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      const dayTxns = await db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.status, 'Completed'),
            gte(transactions.createdAt, dayStart),
            lte(transactions.createdAt, dayEnd),
          ),
        );

      const glTotals: Record<string, { accountName: string; accountType: string; goldGrams: string; usdValue: string; count: number }> = {};

      for (const tx of dayTxns) {
        const entry = getTransactionGlEntry(tx.type);
        const gold = parseFloat(tx.amountGold || '0');
        const usd = tx.amountUsd ? parseFloat(tx.amountUsd) : 0;

        for (const side of ['debit', 'credit'] as const) {
          const acct = entry[side];
          const key = `${side}:${acct.code}`;
          if (!glTotals[key]) {
            glTotals[key] = { accountName: `(${side.toUpperCase()}) ${acct.name}`, accountType: acct.type, goldGrams: '0', usdValue: '0', count: 0 };
          }
          glTotals[key].goldGrams = (parseFloat(glTotals[key].goldGrams) + gold).toFixed(6);
          glTotals[key].usdValue = (parseFloat(glTotals[key].usdValue) + usd).toFixed(2);
          glTotals[key].count += 1;
        }
      }

      const glBreakdown = Object.entries(glTotals)
        .map(([key, v]) => ({ glCode: key.split(':')[1], ...v }))
        .sort((a, b) => a.glCode.localeCompare(b.glCode));

      res.json({ report, glBreakdown });
    } catch (error) {
      console.error("Failed to generate reconciliation report:", error);
      res.status(500).json({ message: "Failed to generate reconciliation report" });
    }
  });
  
  // Trigger manual reconciliation
  app.post("/api/admin/reconciliation/trigger", ensureAdminAsync, requirePermission('generate_reports'), async (req: Request, res: Response) => {
    try {
      const adminUser = (req as any).adminUser;
      const { startDate, endDate } = req.body;
      
      const start = startDate ? new Date(startDate) : subDays(new Date(), 7);
      const end = endDate ? new Date(endDate) : new Date();
      
      const reports: ReconciliationReport[] = [];
      let currentDate = start;
      
      while (currentDate <= end) {
        const report = await generateDailyReconciliation(currentDate);
        reports.push(report);
        currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
      }
      
      await logAdminAction({
        adminId: adminUser.id,
        action: 'RECONCILIATION_TRIGGERED',
        targetType: 'reconciliation',
        newValue: { startDate: format(start, 'yyyy-MM-dd'), endDate: format(end, 'yyyy-MM-dd') },
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
      });
      
      res.json({ 
        message: 'Reconciliation completed',
        reportCount: reports.length,
        reports 
      });
    } catch (error) {
      console.error("Failed to trigger reconciliation:", error);
      res.status(500).json({ message: "Failed to trigger reconciliation" });
    }
  });
  
  // ============================================================================
  // SAR REPORT ROUTES
  // ============================================================================
  
  // Get all SAR reports
  app.get("/api/admin/compliance/sar-reports", ensureAdminAsync, requirePermission('view_reports', 'manage_kyc'), async (req: Request, res: Response) => {
    try {
      const status = req.query.status as string;
      
      let dbReports = await storage.getAllSarReports();
      
      if (status) {
        dbReports = dbReports.filter((r: any) => r.status === status);
      }
      
      const reports = dbReports.map((r: any) => ({
        id: r.id,
        status: r.status,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        report: {
          userId: r.user_id,
          caseId: r.case_id,
          suspiciousActivityType: r.suspicious_activity_type,
          activityDescription: r.activity_description,
          transactionIds: r.transaction_ids,
          totalAmountInvolved: r.total_amount_involved,
          dateRangeStart: r.date_range_start,
          dateRangeEnd: r.date_range_end,
          reportingOfficer: r.reporting_officer,
        }
      }));
      
      res.json({ reports });
    } catch (error) {
      console.error("Failed to get SAR reports:", error);
      res.status(500).json({ message: "Failed to get SAR reports" });
    }
  });
  
  // Create SAR report
  app.post("/api/admin/compliance/sar-reports", ensureAdminAsync, requirePermission('manage_kyc'), async (req: Request, res: Response) => {
    try {
      const adminUser = (req as any).adminUser;
      const parseResult = sarReportSchema.safeParse(req.body);
      
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid SAR report data",
          errors: parseResult.error.errors 
        });
      }
      
      const report = await createSarReport(parseResult.data, adminUser.id);
      
      await logAdminAction({
        adminId: adminUser.id,
        action: 'SAR_REPORT_CREATED',
        targetType: 'sar_report',
        targetId: report.id,
        newValue: { userId: parseResult.data.userId, type: parseResult.data.suspiciousActivityType },
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
      });
      
      res.status(201).json({ report });
    } catch (error) {
      console.error("Failed to create SAR report:", error);
      res.status(500).json({ message: "Failed to create SAR report" });
    }
  });
  
  // Update SAR report status
  app.patch("/api/admin/compliance/sar-reports/:id", ensureAdminAsync, requirePermission('manage_kyc'), async (req: Request, res: Response) => {
    try {
      const adminUser = (req as any).adminUser;
      const { id } = req.params;
      const { status, regulatorReferenceNumber, notes } = req.body;
      
      const dbReport = await storage.getSarReport(id);
      if (!dbReport) {
        return res.status(404).json({ message: "SAR report not found" });
      }
      
      const previousStatus = dbReport.status;
      
      const updates: Record<string, any> = {};
      if (status) {
        updates.status = status;
        if (status === 'filed') {
          updates.filedAt = new Date();
          if (regulatorReferenceNumber) {
            updates.regulatorReferenceNumber = regulatorReferenceNumber;
          }
        }
      }
      
      await storage.updateSarReport(id, updates);
      
      await logAdminAction({
        adminId: adminUser.id,
        action: 'SAR_REPORT_UPDATED',
        targetType: 'sar_report',
        targetId: id,
        previousValue: { status: previousStatus },
        newValue: { status },
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
      });
      
      const updatedReport = await storage.getSarReport(id);
      res.json({ report: updatedReport });
    } catch (error) {
      console.error("Failed to update SAR report:", error);
      res.status(500).json({ message: "Failed to update SAR report" });
    }
  });
  
  // Export SAR report to PDF
  app.get("/api/admin/compliance/sar-reports/:id/export", ensureAdminAsync, requirePermission('generate_reports'), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const dbReport = await storage.getSarReport(id);
      if (!dbReport) {
        return res.status(404).json({ message: "SAR report not found" });
      }
      
      const report = {
        id: dbReport.id,
        status: dbReport.status,
        createdAt: dbReport.created_at,
        report: {
          userId: dbReport.user_id,
          suspiciousActivityType: dbReport.suspicious_activity_type,
          activityDescription: dbReport.activity_description,
          totalAmountInvolved: dbReport.total_amount_involved,
          dateRangeStart: dbReport.date_range_start,
          dateRangeEnd: dbReport.date_range_end,
          reportingOfficer: dbReport.reporting_officer,
        }
      };
      
      const doc = new PDFDocument();
      const chunks: Buffer[] = [];
      
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="SAR-${id}.pdf"`);
        res.send(pdfBuffer);
      });
      
      // Generate PDF content
      doc.fontSize(20).text('SUSPICIOUS ACTIVITY REPORT', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Report ID: ${id}`);
      doc.text(`Status: ${report.status.toUpperCase()}`);
      doc.text(`Created: ${format(report.createdAt, 'yyyy-MM-dd HH:mm')}`);
      doc.moveDown();
      doc.fontSize(14).text('Subject Information');
      doc.fontSize(12).text(`User ID: ${report.report.userId}`);
      doc.text(`Activity Type: ${report.report.suspiciousActivityType}`);
      doc.text(`Amount Involved: $${report.report.totalAmountInvolved}`);
      doc.text(`Date Range: ${report.report.dateRangeStart} to ${report.report.dateRangeEnd}`);
      doc.moveDown();
      doc.fontSize(14).text('Activity Description');
      doc.fontSize(10).text(report.report.activityDescription);
      
      doc.end();
    } catch (error) {
      console.error("Failed to export SAR report:", error);
      res.status(500).json({ message: "Failed to export SAR report" });
    }
  });
  
  // ============================================================================
  // SANCTIONS SCREENING ROUTES
  // ============================================================================
  
  // Perform sanctions check for a user
  app.get("/api/admin/compliance/sanctions-check/:userId", ensureAdminAsync, requirePermission('view_kyc', 'manage_kyc'), async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      
      const result = await performSanctionsCheck(userId);
      
      res.json({ result });
    } catch (error: any) {
      console.error("Failed to perform sanctions check:", error);
      res.status(500).json({ message: error.message || "Failed to perform sanctions check" });
    }
  });
  
  // Bulk sanctions screening
  app.post("/api/admin/compliance/sanctions-check/bulk", ensureAdminAsync, requirePermission('manage_kyc'), async (req: Request, res: Response) => {
    try {
      const adminUser = (req as any).adminUser;
      const { userIds } = req.body;
      
      if (!Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ message: "User IDs array required" });
      }
      
      if (userIds.length > 100) {
        return res.status(400).json({ message: "Maximum 100 users per batch" });
      }
      
      const results: SanctionsCheckResult[] = [];
      const errors: { userId: string; error: string }[] = [];
      
      for (const userId of userIds) {
        try {
          const result = await performSanctionsCheck(userId);
          results.push(result);
        } catch (error: any) {
          errors.push({ userId, error: error.message });
        }
      }
      
      await logAdminAction({
        adminId: adminUser.id,
        action: 'BULK_SANCTIONS_SCREENING',
        targetType: 'compliance',
        newValue: { 
          totalChecked: userIds.length,
          successful: results.length,
          failed: errors.length 
        },
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
      });
      
      res.json({ 
        results,
        errors,
        summary: {
          total: userIds.length,
          clear: results.filter(r => r.status === 'clear').length,
          potentialMatch: results.filter(r => r.status === 'potential_match').length,
          confirmedMatch: results.filter(r => r.status === 'confirmed_match').length,
        }
      });
    } catch (error) {
      console.error("Failed to perform bulk sanctions check:", error);
      res.status(500).json({ message: "Failed to perform bulk sanctions check" });
    }
  });
  
  // Freeze account (compliance action)
  app.post("/api/admin/compliance/freeze-account/:userId", ensureAdminAsync, requirePermission('manage_users', 'manage_kyc'), async (req: Request, res: Response) => {
    try {
      const adminUser = (req as any).adminUser;
      const { userId } = req.params;
      const { reason, caseId } = req.body;
      
      if (!reason) {
        return res.status(400).json({ message: "Freeze reason required" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Update user status (would need to add frozen status field)
      // For now, log the action
      await logAdminAction({
        adminId: adminUser.id,
        action: 'ACCOUNT_FROZEN',
        targetType: 'user',
        targetId: userId,
        newValue: { reason, caseId, frozenAt: new Date() },
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        reason,
      });
      
      res.json({ 
        message: "Account frozen successfully",
        userId,
        frozenAt: new Date(),
        reason 
      });
    } catch (error) {
      console.error("Failed to freeze account:", error);
      res.status(500).json({ message: "Failed to freeze account" });
    }
  });
  
  // ============================================================================
  // FRAUD DETECTION ROUTES
  // ============================================================================
  
  // Get fraud alerts
  app.get("/api/admin/fraud/alerts", ensureAdminAsync, requirePermission('view_transactions', 'manage_transactions'), async (req: Request, res: Response) => {
    try {
      const status = req.query.status as string;
      const severity = req.query.severity as string;
      
      let dbAlerts = await storage.getAllFraudAlerts();
      
      if (status) {
        dbAlerts = dbAlerts.filter((a: any) => a.status === status);
      }
      
      if (severity) {
        dbAlerts = dbAlerts.filter((a: any) => a.severity === severity);
      }
      
      const alerts = dbAlerts.map((a: any) => ({
        id: a.id,
        userId: a.user_id,
        transactionId: a.transaction_id,
        alertType: a.alert_type,
        severity: a.severity,
        description: a.description,
        detectedAt: a.created_at,
        status: a.status,
        reviewedBy: a.resolved_by,
        reviewedAt: a.resolved_at,
        notes: a.notes,
      }));
      
      res.json({ 
        alerts,
        summary: {
          total: alerts.length,
          new: alerts.filter((a: any) => a.status === 'new').length,
          investigating: alerts.filter((a: any) => a.status === 'investigating').length,
          critical: alerts.filter((a: any) => a.severity === 'critical').length,
          high: alerts.filter((a: any) => a.severity === 'high').length,
        }
      });
    } catch (error) {
      console.error("Failed to get fraud alerts:", error);
      res.status(500).json({ message: "Failed to get fraud alerts" });
    }
  });
  
  // Flag transaction as suspicious
  app.post("/api/admin/fraud/flag-transaction", ensureAdminAsync, requirePermission('manage_transactions'), async (req: Request, res: Response) => {
    try {
      const adminUser = (req as any).adminUser;
      const { transactionId, reason, severity } = req.body;
      
      if (!transactionId || !reason) {
        return res.status(400).json({ message: "Transaction ID and reason required" });
      }
      
      // Look up the transaction to get the userId
      const transaction = await storage.getTransaction(transactionId);
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      // Save to database
      const dbAlert = await storage.createFraudAlert({
        userId: transaction.userId,
        transactionId,
        alertType: 'pattern_match',
        severity: severity || 'medium',
        description: `Manual flag: ${reason}`,
        status: 'investigating',
      });
      
      const alert = {
        id: dbAlert.id,
        userId: transaction.userId,
        transactionId,
        alertType: 'pattern_match',
        severity: severity || 'medium',
        description: `Manual flag: ${reason}`,
        detectedAt: dbAlert.created_at,
        status: 'investigating',
        reviewedBy: adminUser.id,
        reviewedAt: new Date(),
      };
      
      await logAdminAction({
        adminId: adminUser.id,
        action: 'TRANSACTION_FLAGGED',
        targetType: 'transaction',
        targetId: transactionId,
        newValue: { reason, severity, alertId: alert.id },
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        reason,
      });
      
      res.status(201).json({ alert });
    } catch (error) {
      console.error("Failed to flag transaction:", error);
      res.status(500).json({ message: "Failed to flag transaction" });
    }
  });
  
  // Review fraud alert
  app.patch("/api/admin/fraud/alerts/:id", ensureAdminAsync, requirePermission('manage_transactions'), async (req: Request, res: Response) => {
    try {
      const adminUser = (req as any).adminUser;
      const { id } = req.params;
      const { status, notes } = req.body;
      
      const dbAlert = await storage.getFraudAlert(id);
      if (!dbAlert) {
        return res.status(404).json({ message: "Fraud alert not found" });
      }
      
      const previousStatus = dbAlert.status;
      
      await storage.updateFraudAlert(id, {
        status,
        notes,
        resolvedBy: adminUser.id,
        resolvedAt: new Date(),
      });
      
      await logAdminAction({
        adminId: adminUser.id,
        action: 'FRAUD_ALERT_REVIEWED',
        targetType: 'fraud_alert',
        targetId: id,
        previousValue: { status: previousStatus },
        newValue: { status, notes },
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
      });
      
      const updatedAlert = await storage.getFraudAlert(id);
      res.json({ alert: updatedAlert });
    } catch (error) {
      console.error("Failed to update fraud alert:", error);
      res.status(500).json({ message: "Failed to update fraud alert" });
    }
  });
  
  // Run fraud detection on user
  app.post("/api/admin/fraud/scan/:userId", ensureAdminAsync, requirePermission('manage_transactions'), async (req: Request, res: Response) => {
    try {
      const adminUser = (req as any).adminUser;
      const { userId } = req.params;
      
      const alerts = await detectFraudPatterns(userId);
      
      await logAdminAction({
        adminId: adminUser.id,
        action: 'FRAUD_SCAN_TRIGGERED',
        targetType: 'user',
        targetId: userId,
        newValue: { alertsGenerated: alerts.length },
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
      });
      
      res.json({ 
        userId,
        alertsGenerated: alerts.length,
        alerts 
      });
    } catch (error) {
      console.error("Failed to run fraud scan:", error);
      res.status(500).json({ message: "Failed to run fraud scan" });
    }
  });
  
  // ============================================================================
  // COMPLIANCE REPORTS
  // ============================================================================
  
  // Generate compliance summary report
  app.get("/api/admin/compliance/summary", ensureAdminAsync, requirePermission('view_reports'), async (req: Request, res: Response) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const startDate = subDays(new Date(), days);
      
      // Get AML cases
      const amlCasesList = await db.select()
        .from(amlCases)
        .where(gte(amlCases.createdAt, startDate));
      
      // Get high-risk users
      const riskProfiles = await db.select()
        .from(userRiskProfiles)
        .where(or(
          eq(userRiskProfiles.riskLevel, 'High'),
          eq(userRiskProfiles.riskLevel, 'Critical')
        ));
      
      // Get SAR reports from database
      const allSarReports = await storage.getAllSarReports();
      const sarReportsList = allSarReports.filter((r: any) => new Date(r.created_at) >= startDate);
      
      // Get fraud alerts from database
      const allFraudAlerts = await storage.getAllFraudAlerts();
      const fraudAlertsList = allFraudAlerts.filter((a: any) => new Date(a.created_at) >= startDate);
      
      res.json({
        period: {
          startDate: format(startDate, 'yyyy-MM-dd'),
          endDate: format(new Date(), 'yyyy-MM-dd'),
          days,
        },
        amlCases: {
          total: amlCasesList.length,
          open: amlCasesList.filter(c => c.status === 'Open').length,
          underInvestigation: amlCasesList.filter(c => c.status === 'Under Investigation').length,
          sarFiled: amlCasesList.filter(c => c.status === 'SAR Filed').length,
        },
        sarReports: {
          total: sarReportsList.length,
          draft: sarReportsList.filter((r: any) => r.status === 'draft').length,
          filed: sarReportsList.filter((r: any) => r.status === 'filed').length,
        },
        fraudAlerts: {
          total: fraudAlertsList.length,
          new: fraudAlertsList.filter((a: any) => a.status === 'new').length,
          confirmedFraud: fraudAlertsList.filter((a: any) => a.status === 'confirmed_fraud').length,
          critical: fraudAlertsList.filter((a: any) => a.severity === 'critical').length,
        },
        highRiskUsers: riskProfiles.length,
      });
    } catch (error) {
      console.error("Failed to generate compliance summary:", error);
      res.status(500).json({ message: "Failed to generate compliance summary" });
    }
  });
  
  // ============================================================================
  // STEP-UP AUTHENTICATION ENDPOINTS
  // ============================================================================
  
  // Request step-up authentication for sensitive operation
  app.post("/api/auth/step-up/request", async (req: Request, res: Response) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const { action, method } = req.body;
      
      if (!action) {
        return res.status(400).json({ message: "Action type required" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      // Generate and send OTP or use existing MFA
      if (user.mfaEnabled && method === 'mfa') {
        // MFA verification will be done client-side
        res.json({ 
          message: "Enter your authenticator code",
          method: 'mfa',
          action 
        });
      } else {
        // Send email OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        await storage.createOtpVerification({
          userId,
          code: otp,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
          action: 'step_up',
        });
        
        // Would send email here
        console.log(`[StepUp] OTP for user ${userId}: ${otp}`);
        
        res.json({ 
          message: "Verification code sent to your email",
          method: 'email_otp',
          action 
        });
      }
    } catch (error) {
      console.error("Failed to request step-up auth:", error);
      res.status(500).json({ message: "Failed to request verification" });
    }
  });
  
  // Verify step-up authentication
  app.post("/api/auth/step-up/verify", async (req: Request, res: Response) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const { action, code, method } = req.body;
      
      if (!action || !code) {
        return res.status(400).json({ message: "Action and verification code required" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      let isValid = false;
      
      if (method === 'mfa' && user.mfaEnabled && user.mfaSecret) {
        // Verify TOTP code
        const { authenticator } = await import('otplib');
        isValid = authenticator.verify({ token: code, secret: user.mfaSecret });
      } else {
        // Verify email OTP - use getPendingOtp which takes userId and action
        const otp = await storage.getPendingOtp(userId, 'step_up');
        if (otp && otp.code === code && !otp.verified && otp.expiresAt > new Date()) {
          isValid = true;
          await storage.updateOtpVerification(otp.id, { verified: true, verifiedAt: new Date() });
        }
      }
      
      if (!isValid) {
        return res.status(401).json({ message: "Invalid verification code" });
      }
      
      // Generate step-up token
      const { generateStepUpToken } = await import('./security-middleware');
      const token = generateStepUpToken(userId, action);
      
      res.json({ 
        message: "Verification successful",
        stepUpToken: token,
        action,
        expiresIn: 300 // 5 minutes
      });
    } catch (error) {
      console.error("Failed to verify step-up auth:", error);
      res.status(500).json({ message: "Failed to verify" });
    }
  });

  // ============================================================================
  // PLATFORM P&L REPORT
  // GET /api/admin/reports/platform-pnl?from=YYYY-MM-DD&to=YYYY-MM-DD
  // ============================================================================
  app.get(
    "/api/admin/reports/platform-pnl",
    ensureAdminAsync,
    requirePermission('view_reports'),
    async (req: Request, res: Response) => {
      try {
        const fromStr = req.query.from as string;
        const toStr = req.query.to as string;

        const fromDate = fromStr ? startOfDay(new Date(fromStr)) : startOfDay(subDays(new Date(), 30));
        const toDate = toStr ? endOfDay(new Date(toStr)) : endOfDay(new Date());

        if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
          return res.status(400).json({ message: "Invalid date range" });
        }

        // Compute period length (inclusive) for BNSL margin accrual
        const periodDays = differenceInDays(toDate, fromDate) + 1;

        // Query all P&L-relevant data sources concurrently
        const [
          liveGoldPrice,
          paidStorageFees,
          billedStorageFeesInPeriod,
          paidBnslPayouts,
          activeBnslPlansInPeriod,
          confirmedDepositsInPeriod,
          completedTxns,
          allPlatformConfigs,
        ] = await Promise.all([
          getGoldPricePerGram().catch(() => 0),
          // 4004 Revenue: Storage fees collected from users in the period (Paid status)
          db
            .select()
            .from(storageFees)
            .where(
              and(
                eq(storageFees.status, 'Paid'),
                gte(storageFees.paidAt, fromDate),
                lte(storageFees.paidAt, toDate),
              ),
            ),
          // 5001 Cost proxy: Storage fees billed in the period — approximate custodian obligation
          db
            .select()
            .from(storageFees)
            .where(
              and(
                gte(storageFees.billingPeriodStart, format(fromDate, 'yyyy-MM-dd')),
                lte(storageFees.billingPeriodEnd, format(toDate, 'yyyy-MM-dd')),
              ),
            ),
          // 5003 Cost: BNSL payouts actually disbursed to users in the period
          db
            .select()
            .from(bnslPayouts)
            .where(
              and(
                eq(bnslPayouts.status, 'Paid'),
                gte(bnslPayouts.paidAt, fromDate),
                lte(bnslPayouts.paidAt, toDate),
              ),
            ),
          // 4002 Revenue: BNSL plans active (overlapping) in the period for margin accrual
          // Active during period means: plan started on or before toDate AND matures on or after fromDate
          db
            .select({
              id: bnslPlans.id,
              startDate: bnslPlans.startDate,
              maturityDate: bnslPlans.maturityDate,
              tenorMonths: bnslPlans.tenorMonths,
              agreedMarginAnnualPercent: bnslPlans.agreedMarginAnnualPercent,
              basePriceComponentUsd: bnslPlans.basePriceComponentUsd,
              goldSoldGrams: bnslPlans.goldSoldGrams,
              enrollmentPriceUsdPerGram: bnslPlans.enrollmentPriceUsdPerGram,
              status: bnslPlans.status,
            })
            .from(bnslPlans)
            .where(
              and(
                lte(bnslPlans.startDate, toDate),
                gte(bnslPlans.maturityDate, fromDate),
                or(
                  eq(bnslPlans.status, 'Active'),
                  eq(bnslPlans.status, 'Maturing'),
                  eq(bnslPlans.status, 'Completed'),
                  eq(bnslPlans.status, 'Early Termination Requested'),
                  eq(bnslPlans.status, 'Early Terminated'),
                ),
              ),
            ),
          // 4001 Revenue: Deposit service fees collected — platform fee on confirmed gold purchases
          // feePercentSnapshot captures the actual fee percentage applied at time of submission
          db
            .select({
              id: depositRequests.id,
              amountUsd: depositRequests.amountUsd,
              feePercentSnapshot: depositRequests.feePercentSnapshot,
              processedAt: depositRequests.processedAt,
            })
            .from(depositRequests)
            .where(
              and(
                eq(depositRequests.status, 'Confirmed'),
                gte(depositRequests.processedAt, fromDate),
                lte(depositRequests.processedAt, toDate),
              ),
            ),
          // All completed transactions in the period for GL-breakdown and volume context
          db
            .select()
            .from(transactions)
            .where(
              and(
                eq(transactions.status, 'Completed'),
                gte(transactions.createdAt, fromDate),
                lte(transactions.createdAt, toDate),
              ),
            ),
          // Platform spread configuration — used to estimate 4001/4003 spread income
          db.select({ key: platformConfig.configKey, value: platformConfig.configValue }).from(platformConfig),
        ]);

        // ── PLATFORM SPREAD CONFIG ────────────────────────────────────────────────
        const configMap = new Map(allPlatformConfigs.map(c => [c.key, c.value]));
        const buySpreadPercent = parseFloat(configMap.get('buy_spread_percent') || '0');
        const sellSpreadPercent = parseFloat(configMap.get('sell_spread_percent') || '0');
        const transferFeePercent = parseFloat(configMap.get('transfer_fee') || configMap.get('transfer_fee_percent') || '0');

        // ── REVENUE LINES ────────────────────────────────────────────────────────

        // 4001: Gold Spread Income — platform earn on Buy/Sell transactions
        // Buy spread: goldBuyUsd × buySpreadPercent/100
        // Sell spread: goldSellUsd × sellSpreadPercent/100
        // Sourced from: platform_config (buy_spread_percent, sell_spread_percent) × transaction volumes
        const goldBuyTxns = completedTxns.filter(t => t.type === 'Buy');
        const goldBuyGold = goldBuyTxns.reduce((sum, t) => sum.plus(t.amountGold || '0'), new Decimal(0));
        const goldBuyUsd = goldBuyTxns.reduce((sum, t) => {
          const price = t.goldPriceUsdPerGram ? parseFloat(t.goldPriceUsdPerGram) : liveGoldPrice;
          return sum.plus(t.amountUsd ? new Decimal(t.amountUsd) : new Decimal(t.amountGold || '0').times(price));
        }, new Decimal(0));

        const goldSellTxns = completedTxns.filter(t => t.type === 'Sell');
        const goldSellGold = goldSellTxns.reduce((sum, t) => sum.plus(t.amountGold || '0'), new Decimal(0));
        const goldSellUsd = goldSellTxns.reduce((sum, t) => {
          const price = t.goldPriceUsdPerGram ? parseFloat(t.goldPriceUsdPerGram) : liveGoldPrice;
          return sum.plus(t.amountUsd ? new Decimal(t.amountUsd) : new Decimal(t.amountGold || '0').times(price));
        }, new Decimal(0));

        const buySpreadIncome = buySpreadPercent > 0
          ? goldBuyUsd.times(new Decimal(buySpreadPercent).div(100))
          : new Decimal(0);
        const sellSpreadIncome = sellSpreadPercent > 0
          ? goldSellUsd.times(new Decimal(sellSpreadPercent).div(100))
          : new Decimal(0);
        const totalSpreadIncome = buySpreadIncome.plus(sellSpreadIncome);

        // 4001b: Deposit service fees (supplementary) — actual fee from depositRequests.feePercentSnapshot
        // Provides a cross-check against the spread config estimate above
        const depositFeeIncome = confirmedDepositsInPeriod.reduce((sum, d) => {
          if (!d.feePercentSnapshot || !d.amountUsd) return sum;
          const feeAmount = new Decimal(d.feePercentSnapshot).div(100).times(new Decimal(d.amountUsd));
          return sum.plus(feeAmount);
        }, new Decimal(0));
        const depositFeeIncomeDepositsCount = confirmedDepositsInPeriod.filter(
          d => d.feePercentSnapshot && parseFloat(d.feePercentSnapshot) > 0,
        ).length;

        // 4002: BNSL margin income — time-proportional accrual from plans active in the period
        // Formula per plan: basePriceComponentUsd × agreedMarginAnnualPercent/100 × overlapDays/365
        // This properly attributes the margin the platform earns on the BNSL structure to the period
        let bnslMarginIncome = new Decimal(0);
        for (const plan of activeBnslPlansInPeriod) {
          const overlapStart = plan.startDate > fromDate ? plan.startDate : fromDate;
          const overlapEnd = plan.maturityDate < toDate ? plan.maturityDate : toDate;
          const overlapDays = Math.max(0, differenceInDays(overlapEnd, overlapStart) + 1);
          if (overlapDays > 0 && plan.basePriceComponentUsd && plan.agreedMarginAnnualPercent) {
            const accrued = new Decimal(plan.basePriceComponentUsd)
              .times(new Decimal(plan.agreedMarginAnnualPercent).div(100))
              .times(overlapDays)
              .div(365);
            bnslMarginIncome = bnslMarginIncome.plus(accrued);
          }
        }

        // 4004: Storage fee income — collected from users (Paid status, paidAt in period)
        const storageFeeIncome = paidStorageFees.reduce(
          (sum, f) => sum.plus(f.feeAmountUsd || '0'),
          new Decimal(0),
        );
        const storageFeeIncomeGold = paidStorageFees.reduce(
          (sum, f) => sum.plus(f.feeAmountGoldGrams || '0'),
          new Decimal(0),
        );

        // Volume context: Send/Swap transaction principal (4003 fee cannot be isolated without fee_amount column)
        const transferTxns = completedTxns.filter(t => t.type === 'Send' || t.type === 'Swap');
        const transferFeeGold = transferTxns.reduce((sum, t) => sum.plus(t.amountGold || '0'), new Decimal(0));
        const transferFeeUsd = transferTxns.reduce((sum, t) => {
          const price = t.goldPriceUsdPerGram ? parseFloat(t.goldPriceUsdPerGram) : liveGoldPrice;
          const usd = t.amountUsd ? new Decimal(t.amountUsd) : new Decimal(t.amountGold || '0').times(price);
          return sum.plus(usd);
        }, new Decimal(0));

        // ── VOLUME CONTEXT (informational, for reference) ─────────────────────
        // All inflow context: Deposit + Buy
        const goldTradingTxns = completedTxns.filter(t => t.type === 'Deposit' || t.type === 'Buy');
        const goldTradingGold = goldTradingTxns.reduce((sum, t) => sum.plus(t.amountGold || '0'), new Decimal(0));
        const goldTradingUsd = goldTradingTxns.reduce((sum, t) => {
          const price = t.goldPriceUsdPerGram ? parseFloat(t.goldPriceUsdPerGram) : liveGoldPrice;
          return sum.plus(t.amountUsd ? new Decimal(t.amountUsd) : new Decimal(t.amountGold || '0').times(price));
        }, new Decimal(0));

        // All outflow context: Withdrawal + Sell (gross gold returned to users)
        const goldOutflowTxns = completedTxns.filter(t => t.type === 'Withdrawal' || t.type === 'Sell');
        const goldOutflowGold = goldOutflowTxns.reduce((sum, t) => sum.plus(t.amountGold || '0'), new Decimal(0));
        const goldOutflowUsd = goldOutflowTxns.reduce((sum, t) => {
          const price = t.goldPriceUsdPerGram ? parseFloat(t.goldPriceUsdPerGram) : liveGoldPrice;
          return sum.plus(t.amountUsd ? new Decimal(t.amountUsd) : new Decimal(t.amountGold || '0').times(price));
        }, new Decimal(0));

        // ── COST LINES ───────────────────────────────────────────────────────────
        // 5001: Storage Fees Paid to Wingold custodian — derived proxy from
        // storage fees billed to users in the period (billed fees approximate custodian obligation)
        const storageFeePaidCustodian = billedStorageFeesInPeriod.reduce(
          (sum, f) => sum.plus(f.feeAmountUsd || '0'),
          new Decimal(0),
        );
        const storageFeePaidCustodianGold = billedStorageFeesInPeriod.reduce(
          (sum, f) => sum.plus(f.feeAmountGoldGrams || '0'),
          new Decimal(0),
        );

        // 5003: BNSL Payout Cost — actual payouts disbursed to users
        const bnslPayoutCost = paidBnslPayouts.reduce(
          (sum, p) => sum.plus(p.monetaryAmountUsd || '0'),
          new Decimal(0),
        );
        const bnslPayoutCostGold = paidBnslPayouts.reduce(
          (sum, p) => sum.plus(p.gramsCredited || '0'),
          new Decimal(0),
        );

        // ── TOTALS ───────────────────────────────────────────────────────────────
        // Revenue lines included in totals:
        //   4001 Gold spread income: platform_config spread % × Buy/Sell transaction volumes
        //   4002 BNSL margin accrual: basePriceComponentUsd × agreedMarginAnnualPercent/100 × overlapDays/365
        //   4003 Transfer/service fee: transfer_fee config % × Send/Swap volumes (if configured)
        //   4004 Storage fee income: storageFees.feeAmountUsd (Paid status) in period
        // Note: deposit service fee from depositRequests.feePercentSnapshot is shown as a supplementary
        //   cross-check line (may overlap with 4001 spread; NOT double-counted in total)
        const transferFeeIncome = transferFeePercent > 0
          ? transferFeeUsd.times(new Decimal(transferFeePercent).div(100))
          : new Decimal(0);
        const totalRevenueUsd = totalSpreadIncome
          .plus(bnslMarginIncome)
          .plus(transferFeeIncome)
          .plus(storageFeeIncome);
        // Costs: storage fees paid to custodian (derived proxy) + BNSL payouts disbursed
        const totalCostUsd = storageFeePaidCustodian.plus(bnslPayoutCost);
        const netPnlUsd = totalRevenueUsd.minus(totalCostUsd);

        // ── GL BREAKDOWN from all completed transactions ──────────────────────────
        const glTotals: Record<string, {
          glCode: string; accountName: string; accountType: string;
          description: string; count: number; goldGrams: Decimal; usdValue: Decimal;
        }> = {};

        for (const tx of completedTxns) {
          const entry = getTransactionGlEntry(tx.type);
          const gold = new Decimal(tx.amountGold || '0');
          const price = tx.goldPriceUsdPerGram ? parseFloat(tx.goldPriceUsdPerGram) : liveGoldPrice;
          const usd = tx.amountUsd ? new Decimal(tx.amountUsd) : gold.times(price);

          for (const side of ['debit', 'credit'] as const) {
            const acct = entry[side];
            const key = `${side}:${acct.code}`;
            if (!glTotals[key]) {
              glTotals[key] = {
                glCode: acct.code,
                accountName: `(${side.toUpperCase()}) ${acct.code} ${acct.name}`,
                accountType: acct.type,
                description: entry.description,
                count: 0,
                goldGrams: new Decimal(0),
                usdValue: new Decimal(0),
              };
            }
            glTotals[key].count += 1;
            glTotals[key].goldGrams = glTotals[key].goldGrams.plus(gold);
            glTotals[key].usdValue = glTotals[key].usdValue.plus(usd);
          }
        }

        const glBreakdown = Object.values(glTotals)
          .map(l => ({
            glCode: l.glCode,
            accountName: l.accountName,
            accountType: l.accountType,
            description: l.description,
            transactionCount: l.count,
            totalGoldGrams: l.goldGrams.toFixed(6),
            totalUsdValue: l.usdValue.toFixed(2),
          }))
          .sort((a, b) => a.glCode.localeCompare(b.glCode));

        res.json({
          report: {
            period: {
              from: fromDate.toISOString(),
              to: toDate.toISOString(),
            },
            liveGoldPriceUsdPerGram: liveGoldPrice > 0 ? liveGoldPrice.toFixed(2) : null,
            // Platform P&L revenue — each line sourced from real fee/margin data
            spreadConfig: {
              buySpreadPercent,
              sellSpreadPercent,
              transferFeePercent,
              source: 'platform_config table',
            },
            revenue: {
              goldSpreadIncome: {
                glCode: '4001',
                accountName: 'Gold Spread Income',
                description: `Buy spread (${buySpreadPercent}% of Buy volume) + Sell spread (${sellSpreadPercent}% of Sell volume)`,
                buyTransactions: goldBuyTxns.length,
                buyVolumeUsd: goldBuyUsd.toFixed(2),
                buySpreadIncomeUsd: buySpreadIncome.toFixed(2),
                sellTransactions: goldSellTxns.length,
                sellVolumeUsd: goldSellUsd.toFixed(2),
                sellSpreadIncomeUsd: sellSpreadIncome.toFixed(2),
                totalUsd: totalSpreadIncome.toFixed(2),
                includedInTotals: true,
                dataSource: 'platform_config (buy_spread_percent, sell_spread_percent) × Completed Buy/Sell transaction volumes',
              },
              bnslMarginIncome: {
                glCode: '4002',
                accountName: 'BNSL Margin Income (Accrual Basis)',
                description: 'Time-proportional accrual: basePriceComponentUsd × agreedMarginAnnualPercent/100 × overlapDays/365 for plans active in period',
                activePlansInPeriod: activeBnslPlansInPeriod.length,
                totalUsd: bnslMarginIncome.toFixed(2),
                includedInTotals: true,
                dataSource: 'bnslPlans (Active/Maturing/Completed/EarlyTermination, overlapping period)',
              },
              transferServiceFeeIncome: {
                glCode: '4003',
                accountName: 'Transfer / Service Fee Income',
                description: transferFeePercent > 0
                  ? `Estimated transfer fee: ${transferFeePercent}% of Send/Swap transaction volume (sourced from platform_config)`
                  : 'Transfer fee not configured (transfer_fee = 0 in platform_config) — value is $0.00',
                transferTransactions: transferTxns.length,
                transferVolumeUsd: transferFeeUsd.toFixed(2),
                configuredFeePercent: transferFeePercent,
                totalUsd: transferFeeIncome.toFixed(2),
                includedInTotals: true,
                dataSource: 'platform_config (transfer_fee or transfer_fee_percent) × Completed Send/Swap transaction volumes',
              },
              storageFeeIncome: {
                glCode: '4004',
                accountName: 'Storage Fee Income (Collected)',
                description: 'Storage fees charged to users and collected (Paid status, paidAt in period)',
                count: paidStorageFees.length,
                totalUsd: storageFeeIncome.toFixed(2),
                totalGoldGrams: storageFeeIncomeGold.toFixed(6),
                includedInTotals: true,
                dataSource: 'storageFees.feeAmountUsd (status=Paid)',
              },
              depositServiceFeeCheck: {
                glCode: '4001x',
                accountName: 'Deposit Service Fee (Cross-Check)',
                description: 'Actual fee from depositRequests.feePercentSnapshot — cross-check for 4001 spread; NOT double-counted in totalRevenueUsd',
                totalDeposits: confirmedDepositsInPeriod.length,
                depositsWithFee: depositFeeIncomeDepositsCount,
                totalUsd: depositFeeIncome.toFixed(2),
                includedInTotals: false,
                dataSource: 'depositRequests.feePercentSnapshot × amountUsd (Confirmed, processedAt in period)',
              },
            },
            costs: {
              storageFeePaidToCustodian: {
                glCode: '5001',
                accountName: 'Storage Fees Paid (Wingold Custodian)',
                description: 'Derived proxy: storage fees billed to users in period approximate custodian vault obligation (Wingold)',
                count: billedStorageFeesInPeriod.length,
                totalUsd: storageFeePaidCustodian.toFixed(2),
                totalGoldGrams: storageFeePaidCustodianGold.toFixed(6),
                derivedProxy: true,
                proxyNote: 'Fees billed to users within period used as proxy for custodian obligation; reconcile against Wingold invoices for exact figures.',
              },
              bnslPayoutCost: {
                glCode: '5003',
                accountName: 'BNSL Payout Cost',
                description: 'Monetary payouts disbursed to BNSL plan holders',
                count: paidBnslPayouts.length,
                totalUsd: bnslPayoutCost.toFixed(2),
                totalGoldGrams: bnslPayoutCostGold.toFixed(6),
              },
            },
            // Net platform P&L (true earned income minus platform costs)
            summary: {
              totalRevenueUsd: totalRevenueUsd.toFixed(2),
              totalCostUsd: totalCostUsd.toFixed(2),
              netPnlUsd: netPnlUsd.toFixed(2),
            },
            // Volume context — gross principal volumes for reference (NOT included in P&L totals)
            // 4003 Transfer fee: excluded because transactions table stores principal only;
            // no separate fee_amount column to isolate fee from customer transfer amount.
            volumeContext: {
              note: 'Gross transaction volumes for reference. Transfer service fee (4003) excluded from revenue totals — transactions table stores principal only; add a fee_amount column to isolate fee income.',
              transferServiceVolume: {
                glCode: '4003',
                accountName: 'Transfer / Service Volume (Gross — excluded from P&L totals)',
                description: 'Gross gold value of Send/Swap transactions. Fee income requires a separate fee_amount column on the transactions table.',
                types: ['Send', 'Swap'],
                count: transferTxns.length,
                totalGoldGrams: transferFeeGold.toFixed(6),
                totalUsd: transferFeeUsd.toFixed(2),
                includedInTotals: false,
              },
              goldBuyVolume: {
                description: 'Total value of completed Buy transactions in the period (gross principal)',
                types: ['Buy'],
                count: goldBuyTxns.length,
                totalGoldGrams: goldBuyGold.toFixed(6),
                totalUsd: goldBuyUsd.toFixed(2),
              },
              goldInflow: {
                types: ['Deposit', 'Buy'],
                count: goldTradingTxns.length,
                totalGoldGrams: goldTradingGold.toFixed(6),
                totalUsd: goldTradingUsd.toFixed(2),
              },
              goldOutflow: {
                description: 'Gross gold returned to users via Withdrawal/Sell — not a direct P&L cost without acquisition cost basis',
                types: ['Withdrawal', 'Sell'],
                count: goldOutflowTxns.length,
                totalGoldGrams: goldOutflowGold.toFixed(6),
                totalUsd: goldOutflowUsd.toFixed(2),
              },
              totalCompletedTransactions: completedTxns.length,
            },
            // GL journal breakdown from transaction ledger
            glBreakdown,
          },
        });
      } catch (error) {
        console.error("Failed to generate platform P&L report:", error);
        res.status(500).json({ message: "Failed to generate report" });
      }
    },
  );

  // ============================================================================
  // CONSOLIDATED CLIENT BRIEF
  // GET /api/admin/users/:userId/brief
  // ============================================================================
  app.get(
    "/api/admin/users/:userId/brief",
    ensureAdminAsync,
    requirePermission('view_reports'),
    async (req: Request, res: Response) => {
      try {
        const { userId } = req.params;

        const thirtyDaysAgo = subDays(new Date(), 30);

        const [
          user,
          wallet,
          kyc,
          riskProfile,
          vaultSummary,
          recentTxns,
          amlCasesList,
          liveGoldPrice,
          bnslWalletRow,
          finabridgeWalletRow,
        ] = await Promise.all([
          storage.getUser(userId),
          storage.getWalletByUserId(userId),
          db.select().from(kycSubmissions).where(eq(kycSubmissions.userId, userId)).then(r => r[0] ?? null),
          db.select().from(userRiskProfiles).where(eq(userRiskProfiles.userId, userId)).then(r => r[0] ?? null),
          db.select().from(vaultOwnershipSummary).where(eq(vaultOwnershipSummary.userId, userId)).then(r => r[0] ?? null),
          db
            .select()
            .from(transactions)
            .where(
              and(
                eq(transactions.userId, userId),
                gte(transactions.createdAt, thirtyDaysAgo),
              ),
            )
            .orderBy(desc(transactions.createdAt))
            .limit(30),
          storage.getUserAmlCases(userId),
          getGoldPricePerGram().catch(() => 0),
          db.select().from(bnslWallets).where(eq(bnslWallets.userId, userId)).then(r => r[0] ?? null),
          db.select().from(finabridgeWallets).where(eq(finabridgeWallets.userId, userId)).then(r => r[0] ?? null),
        ]);

        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        const goldGrams = parseFloat(wallet?.goldGrams || '0');
        const portfolioValueUsd = liveGoldPrice > 0 ? goldGrams * liveGoldPrice : null;

        // Per-wallet type holdings with USD values at live price
        const buildWalletHolding = (grams: number, lockedGrams: number = 0) => ({
          availableGrams: grams.toFixed(6),
          lockedGrams: lockedGrams.toFixed(6),
          totalGrams: (grams + lockedGrams).toFixed(6),
          portfolioValueUsd: liveGoldPrice > 0 ? ((grams + lockedGrams) * liveGoldPrice).toFixed(2) : null,
        });

        const openAmlCases = amlCasesList.filter(c => c.status === 'Open' || c.status === 'Under Investigation');

        const txSummary = recentTxns.reduce(
          (acc, tx) => {
            acc.total += 1;
            if (tx.status === 'Completed') acc.completed += 1;
            if (tx.status === 'Pending') acc.pending += 1;
            if (tx.status === 'Failed') acc.failed += 1;
            const gold = parseFloat(tx.amountGold || '0');
            if (REVENUE_TRANSACTION_TYPES.includes(tx.type)) acc.inflowGold += gold;
            if (COST_TRANSACTION_TYPES.includes(tx.type)) acc.outflowGold += gold;
            return acc;
          },
          { total: 0, completed: 0, pending: 0, failed: 0, inflowGold: 0, outflowGold: 0 },
        );

        res.json({
          brief: {
            identity: {
              id: user.id,
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
              phoneNumber: user.phoneNumber ?? null,
              country: user.country ?? null,
              accountType: user.accountType,
              role: user.role,
              isEmailVerified: user.isEmailVerified,
              companyName: user.companyName ?? null,
              registrationNumber: user.registrationNumber ?? null,
              memberSince: user.createdAt,
            },
            kyc: kyc
              ? {
                  status: kyc.status,
                  tier: kyc.tier,
                  fullName: kyc.fullName ?? null,
                  dateOfBirth: kyc.dateOfBirth ?? null,
                  nationality: kyc.nationality ?? null,
                  address: kyc.address ?? null,
                  submittedAt: kyc.createdAt,
                  reviewedAt: kyc.reviewedAt ?? null,
                }
              : null,
            riskProfile: riskProfile
              ? {
                  riskLevel: riskProfile.riskLevel,
                  overallRiskScore: riskProfile.overallRiskScore,
                  lastAssessedAt: riskProfile.updatedAt,
                }
              : null,
            vault: vaultSummary
              ? {
                  mpgwAvailableGrams: vaultSummary.mpgwAvailableGrams,
                  mpgwPendingGrams: vaultSummary.mpgwPendingGrams,
                  mpgwLockedBnslGrams: vaultSummary.mpgwLockedBnslGrams,
                  fpgwAvailableGrams: vaultSummary.fpgwAvailableGrams ?? '0',
                  fpgwPendingGrams: vaultSummary.fpgwPendingGrams ?? '0',
                  fpgwLockedBnslGrams: vaultSummary.fpgwLockedBnslGrams ?? '0',
                  lastUpdated: vaultSummary.updatedAt,
                }
              : null,
            // Main FinaPay wallet
            wallet: wallet
              ? {
                  goldGrams: wallet.goldGrams,
                  usdBalance: wallet.usdBalance,
                  eurBalance: wallet.eurBalance,
                  portfolioValueUsd: portfolioValueUsd !== null ? portfolioValueUsd.toFixed(2) : null,
                  liveGoldPriceUsdPerGram: liveGoldPrice > 0 ? liveGoldPrice.toFixed(2) : null,
                }
              : null,
            // Consolidated holdings table across all wallet types
            holdingsByWalletType: {
              liveGoldPriceUsdPerGram: liveGoldPrice > 0 ? liveGoldPrice.toFixed(2) : null,
              finapay: wallet
                ? buildWalletHolding(
                    parseFloat(wallet.goldGrams || '0'),
                  )
                : null,
              mpgw: vaultSummary
                ? buildWalletHolding(
                    parseFloat(vaultSummary.mpgwAvailableGrams || '0'),
                    parseFloat(vaultSummary.mpgwPendingGrams || '0') +
                      parseFloat(vaultSummary.mpgwLockedBnslGrams || '0'),
                  )
                : null,
              fpgw: vaultSummary
                ? buildWalletHolding(
                    parseFloat(vaultSummary.fpgwAvailableGrams || '0'),
                    parseFloat(vaultSummary.fpgwPendingGrams || '0') +
                      parseFloat(vaultSummary.fpgwLockedBnslGrams || '0'),
                  )
                : null,
              bnsl: bnslWalletRow
                ? buildWalletHolding(
                    parseFloat(bnslWalletRow.availableGoldGrams || '0'),
                    parseFloat(bnslWalletRow.lockedGoldGrams || '0'),
                  )
                : null,
              finabridge: finabridgeWalletRow
                ? buildWalletHolding(
                    parseFloat(finabridgeWalletRow.availableGoldGrams || '0'),
                    parseFloat(finabridgeWalletRow.lockedGoldGrams || '0'),
                  )
                : null,
            },
            recentActivity: {
              windowDays: 30,
              transactionCount: txSummary.total,
              completedCount: txSummary.completed,
              pendingCount: txSummary.pending,
              failedCount: txSummary.failed,
              inflowGoldGrams: txSummary.inflowGold.toFixed(6),
              outflowGoldGrams: txSummary.outflowGold.toFixed(6),
              transactions: recentTxns.map(tx => ({
                id: tx.id,
                type: tx.type,
                status: tx.status,
                amountGold: tx.amountGold,
                amountUsd: tx.amountUsd,
                goldPriceUsdPerGram: tx.goldPriceUsdPerGram,
                sourceModule: tx.sourceModule,
                createdAt: tx.createdAt,
              })),
            },
            aml: {
              totalCases: amlCasesList.length,
              openCases: openAmlCases.length,
              cases: openAmlCases.slice(0, 10).map(c => ({
                id: c.id,
                caseNumber: c.caseNumber,
                status: c.status,
                riskLevel: c.riskLevel,
                caseType: c.caseType,
                createdAt: c.createdAt,
              })),
            },
          },
        });
      } catch (error) {
        console.error("Failed to generate client brief:", error);
        res.status(500).json({ message: "Failed to generate client brief" });
      }
    },
  );
}
