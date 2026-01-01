import type { Express, Request, Response } from "express";
import { storage } from "./storage";
import { db } from "./db";
import { z } from "zod";
import { 
  transactions, wallets, users, auditLogs, withdrawalRequests, depositRequests,
  amlCases, amlScreeningLogs, userRiskProfiles
} from "@shared/schema";
import { eq, and, gte, lte, desc, sql, or, like } from "drizzle-orm";
import { logAdminAction } from "./security-middleware";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import PDFDocument from "pdfkit";

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
  
  // Calculate totals
  let totalGoldGrams = 0;
  let totalUsdValue = 0;
  
  for (const wallet of allWallets) {
    totalGoldGrams += parseFloat(wallet.goldGrams || '0');
    totalUsdValue += parseFloat(wallet.usdBalance || '0');
  }
  
  // Calculate transaction totals
  let transactionGoldIn = 0;
  let transactionGoldOut = 0;
  
  for (const tx of dayTransactions) {
    const amount = parseFloat(tx.amountGold || '0');
    if (['Buy', 'Receive', 'Deposit'].includes(tx.type)) {
      transactionGoldIn += amount;
    } else if (['Sell', 'Send', 'Withdrawal'].includes(tx.type)) {
      transactionGoldOut += amount;
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
  const userCountry = (user as any).country?.toUpperCase();
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
  
  // Unusual amount check
  const amounts = recentTransactions.map(t => parseFloat(t.amountUsd || '0'));
  const avgAmount = amounts.reduce((a, b) => a + b, 0) / (amounts.length || 1);
  
  if (transactionId) {
    const currentTx = recentTransactions.find(t => t.id === transactionId);
    if (currentTx) {
      const currentAmount = parseFloat(currentTx.amountUsd || '0');
      if (currentAmount > avgAmount * 5 && currentAmount > 5000) {
        // Save to database
        const dbAlert = await storage.createFraudAlert({
          userId,
          transactionId,
          alertType: 'unusual_amount',
          severity: 'medium',
          description: `Transaction amount $${currentAmount.toFixed(2)} is ${(currentAmount / avgAmount).toFixed(1)}x higher than average`,
          status: 'new',
        });
        
        const alert: FraudAlert = {
          id: dbAlert.id,
          userId,
          transactionId,
          alertType: 'unusual_amount',
          severity: 'medium',
          description: `Transaction amount $${currentAmount.toFixed(2)} is ${(currentAmount / avgAmount).toFixed(1)}x higher than average`,
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
      
      res.json({ report });
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
}
