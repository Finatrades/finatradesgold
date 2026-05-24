import type { Express, Request, Response, NextFunction } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage, type TransactionalStorage } from "./storage";
import { db, pool } from "./db";
import crypto from "crypto";
import { authRateLimiter, otpRateLimiter, passwordResetRateLimiter, withdrawalRateLimiter, apiRateLimiter, getSystemSettings } from "./index";
import { eq, and, gte, lte, desc, sql, or, isNull, inArray } from "drizzle-orm";
import { 
  insertUserSchema, insertKycSubmissionSchema, insertWalletSchema, 
  insertTransactionSchema, insertFinabridgeAgreementSchema, insertTradeCaseSchema,
  insertTradeDocumentSchema, insertChatSessionSchema, insertChatMessageSchema,
  insertAuditLogSchema, insertContentPageSchema, insertContentBlockSchema,
  insertTemplateSchema, insertMediaAssetSchema, 
  insertPlatformBankAccountSchema,
  insertTradeRequestSchema, insertTradeProposalSchema, insertForwardedProposalSchema,
  insertTradeConfirmationSchema, insertSettlementHoldSchema, insertFinabridgeWalletSchema,
  User, paymentGatewaySettings, insertPaymentGatewaySettingsSchema,
  insertSecuritySettingsSchema,
  wallets, transactions, auditLogs, certificates, platformConfig, systemLogs, users, tradeCases,
  userAccountStatus,
  partialSettlements, tradeDisputes, tradeDisputeComments, dealRoomDocuments, dealMilestones, dealDiscrepancies, dealRooms as dealRoomsTable,
  lcTerms, dealRoomDocumentMetadata, dealRoomInternalNotes, kycSubmissions, userRiskProfiles,
  physicalDeliveryRequests, goldBars, storageFees, vaultLocations, vaultTransfers, goldGifts, insuranceCertificates,
  tradeShipments, shipmentMilestones, tradeCertificates, exporterRatings, exporterTrustScores, tradeRiskAssessments,
  tradeRequests, tradeProposals, settlementHolds, tradeDocuments,
  geoRestrictions, geoRestrictionSettings, insertGeoRestrictionSchema,
  sarReports, fraudAlerts, reconciliationReports, regulatoryReports, announcements, amlCases,
  wallets as walletsTable, transactions as transactionsTable,
  priceAlerts, insertPriceAlertSchema,
  dcaPlans, dcaExecutions, insertDcaPlanSchema,
  savingsGoals, insertSavingsGoalSchema,
  beneficiaries, insertBeneficiarySchema,
  userActivityLogs, insertUserActivityLogSchema, InsertUserActivityLog,
  reportExports, insertReportExportSchema,
  emailLogs,
  orgPositions
} from "@shared/schema";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { authenticator } from "otplib";
import * as QRCode from "qrcode";
import { sendEmail, sendEmailDirect, sendEmailViaTemplate, sendEmailWithAttachment, EMAIL_TEMPLATES, seedEmailTemplates, verifyUnsubscribeToken } from "./email";
import { 
  processTransactionDocuments, 
  resendCertificate, 
  resendInvoice, 
  downloadCertificatePDF, 
  downloadInvoicePDF,
  generateTransferCertificates,
  generateBNSLLockCertificate,
  generateTradeLockCertificate,
  generateTradeReleaseCertificate
} from "./document-service";
import { generateUserManualPDF, generateAdminManualPDF, generateCertificatePDF, generateTransactionReceiptPDF } from "./pdf-generator";
// Gold-price service removed with the rest of the legacy gold stack.
// Inline no-op stubs so any remaining caller compiles; behavior is now an
// explicit "no live gold price available" rather than an unhandled crash.
const getGoldPrice = async (): Promise<{ pricePerGram: number; source: string }> => ({ pricePerGram: 0, source: 'unavailable' });
const getGoldPricePerGram = async (): Promise<number> => 0;
const getGoldPriceStatus = async (): Promise<{ available: boolean; source: string }> => ({ available: false, source: 'unavailable' });
const getGoldPriceForUser = async (_isAuthenticated: boolean): Promise<{ pricePerGram: number; source: string }> => ({ pricePerGram: 0, source: 'unavailable' });
import { 
  calculateUserRiskScore, 
  updateUserRiskProfile, 
  checkTransactionAgainstLimits,
  HIGH_RISK_COUNTRIES,
  ELEVATED_RISK_COUNTRIES
} from "./risk-scoring";
import { 
  evaluateTransaction, 
  getAmlAlerts, 
  seedDefaultAmlRules,
  DEFAULT_AML_RULES 
} from "./aml-monitoring";
import { platformLimits } from "./platform-limit-service";
import { placeHold as walletPlaceHold, releaseHold as walletReleaseHold, convertHoldToEscrow as walletConvertHoldToEscrow } from "./wallet-service";
import { b2bWalletHolds } from "@shared/schema";

// Margin required to commit to a trade request, expressed in basis points of trade value.
// Default: 10% (1000 bps). Override via FINABRIDGE_TRADE_MARGIN_BPS env var.
const TRADE_MARGIN_BPS = (() => {
  const raw = parseInt(process.env.FINABRIDGE_TRADE_MARGIN_BPS || "1000", 10);
  return Number.isFinite(raw) && raw > 0 && raw <= 10000 ? raw : 1000;
})();

function computeTradeMarginCents(tradeValueUsd: string | number): number {
  const usd = typeof tradeValueUsd === "string" ? parseFloat(tradeValueUsd) : tradeValueUsd;
  if (!Number.isFinite(usd) || usd <= 0) return 0;
  // cents = usd * 100; margin = cents * bps / 10_000
  return Math.ceil((usd * 100 * TRADE_MARGIN_BPS) / 10_000);
}

async function releaseOpenTradeRequestMarginHold(
  tradeRequestId: string,
  importerUserId: string,
  reason: string,
): Promise<void> {
  // Best-effort release of an open USD wallet margin hold for a trade request
  // that has reached a terminal pre-escrow outcome (AI rejection, tier
  // rejection, etc). Logged-only on failure — never throws into the caller —
  // so terminal status writes are not blocked.
  try {
    const walletHold = await findOpenWalletHoldForTradeRequest(tradeRequestId, importerUserId);
    if (!walletHold) return;
    await walletReleaseHold({
      userId: importerUserId,
      holdId: walletHold.id,
    });
    console.log(`[Wallet] Released margin hold ${walletHold.id} for trade_request=${tradeRequestId} (${reason})`);
  } catch (err) {
    console.error(
      `[Wallet] Failed to release margin hold for trade_request=${tradeRequestId} (${reason}):`,
      err,
    );
  }
}

async function findOpenWalletHoldForTradeRequest(tradeRequestId: string, userId: string) {
  // Scope by userId to prevent cross-user interference: another user could
  // create an unrelated open hold referencing the same trade_request id, and
  // an unscoped lookup would pick it up and either fail conversion or release
  // the wrong importer's funds.
  const rows = await db
    .select()
    .from(b2bWalletHolds)
    .where(and(
      eq(b2bWalletHolds.referenceType, "trade_request"),
      eq(b2bWalletHolds.referenceId, tradeRequestId),
      eq(b2bWalletHolds.userId, userId),
      eq(b2bWalletHolds.status, "open"),
    ))
    .orderBy(desc(b2bWalletHolds.createdAt))
    .limit(1);
  return rows[0] || null;
}
import { 
  getExpiringDocuments, 
  sendDocumentExpiryReminders, 
  getDocumentExpiryStats,
  startDocumentExpiryScheduler
} from "./document-expiry";
import PDFDocument from "pdfkit";
import multer from "multer";
import path from "path";
import fs from "fs";
import { emitLedgerEvent, emitLedgerEventToUsers, emitNotification, getIO } from "./socket";
import {
  createBackup,
  listBackups,
  getBackup,
  getBackupFileStream,
  verifyBackup,
  restoreBackup,
  deleteBackup,
  logBackupAction,
  getBackupAuditLogs
} from "./backup-service";
import { cacheGet, cacheSet, getRedisClient } from "./redis-client";
import { uploadToR2, isR2Configured, generateR2Key } from "./r2-storage";
import { logActivity, notifyError } from "./system-notifications";
import { checkKycOcrMismatch, scanDocumentBase64, nameSimilarity, extractAddressProofFields, scanCorporateDocument, type KycOcrResult, type TieredScanResult, type AddressProofFields, type CorpDocType, type CorpDocScanResult } from "./services/ocr-service";
import { format } from "date-fns";
// compliance-routes removed with the rest of the legacy gold stack.
const registerComplianceRoutes = (_app: Express, _ensureAdminAsync: any, _requirePermission: any): void => {};
import { getCsrfTokenHandler, logAdminAction, sanitizeRequest } from "./security-middleware";
import { checkIsSuperAdmin, loadUserPermissions } from "./rbac-middleware";
// sso-routes (WinGold SSO bridge) removed with the rest of the legacy gold stack.
import vcRoutes from "./vc-routes";
// wingold-partner-api, wingold-webhook-routes, and admin-vault-exposure-routes
// removed with the rest of the legacy gold stack.
import b2bRoutes from "./b2b-routes";
import consignmentsRouter from "./routes/consignments";
import marketplaceRouter from "./routes/marketplace";
import counterpartyRouter from "./routes/counterparty";
import { loadCounterpartyByUserId } from "./lib/counterparty";
import adminConsignmentsRouter from "./routes/admin-consignments";
import adminEmailQueuesRouter from "./routes/admin-email-queues";
import warehouseRouter from "./routes/warehouse";
// unified-tally-routes, physical-deposit-routes and wingold-user-sync-service
// removed with the rest of the legacy gold stack.
const WingoldUserSyncService = {
  onUserRegistered: async (_userId: string) => {},
  onKycApproved: async (_userId: string) => {},
  onKycRejected: async (_userId: string) => {},
};
import { credentialIssuer } from "./services/credential-issuer";
import { workflowAuditService, type FlowType } from "./workflow-audit-service";
// Geo-restriction enforcement middleware. Reads geoRestrictionSettings +
// geoRestrictions from DB, resolves the request's country code from IP via
// ip-api.com (best-effort), and blocks the request when the resolved country
// is marked as restricted for the relevant action. Fails open on lookup/DB
// errors so a transient outage does not lock all users out, but blocks on
// any positive restriction match.
const geoRestrictionMiddleware = (opts?: { allowRegistrationBypass?: boolean }) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const [settings] = await db.select().from(geoRestrictionSettings).limit(1);
      if (!settings?.isEnabled) { return next(); }

      const clientIp = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() ||
                       req.headers['x-real-ip']?.toString() ||
                       req.socket.remoteAddress || '';

      const isLoopbackOrPrivate = !clientIp || /^(127\.|::1|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(clientIp);

      let countryCode = '';
      let lookupFailed = false;
      if (!isLoopbackOrPrivate) {
        try {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 3000);
          try {
            const geoResponse = await fetch(
              `https://ipapi.co/${encodeURIComponent(clientIp)}/country/`,
              { signal: ctrl.signal },
            );
            if (geoResponse.ok) {
              const text = (await geoResponse.text()).trim();
              if (/^[A-Z]{2}$/.test(text)) countryCode = text;
              else lookupFailed = true;
            } else {
              lookupFailed = true;
            }
          } finally {
            clearTimeout(timer);
          }
        } catch {
          lookupFailed = true;
        }
      }

      // Fail-closed: if geo is enabled and we cannot resolve the country for a
      // non-private IP, block the request rather than silently allow it.
      if (!countryCode) {
        if (isLoopbackOrPrivate) { return next(); }
        if (lookupFailed) {
          res.status(503).json({
            message: 'Unable to verify your location at this time. Please try again shortly.',
            restricted: true,
            reason: 'geo_lookup_failed',
          });
          return;
        }
        return next();
      }

      const [restriction] = await db.select()
        .from(geoRestrictions)
        .where(and(
          eq(geoRestrictions.countryCode, countryCode),
          eq(geoRestrictions.isRestricted, true),
        ))
        .limit(1);

      if (!restriction) { return next(); }

      const isRegisterPath = req.path.includes('/register');
      const isLoginPath = req.path.includes('/login');
      const isTxnPath = !isRegisterPath && !isLoginPath;

      const allowedForThisRequest =
        (isRegisterPath && (restriction.allowRegistration || opts?.allowRegistrationBypass)) ||
        (isLoginPath && restriction.allowLogin) ||
        (isTxnPath && restriction.allowTransactions);

      if (allowedForThisRequest) { return next(); }

      res.status(403).json({
        message: restriction.restrictionMessage || settings.defaultMessage ||
          'Access from your country is not permitted at this time.',
        restricted: true,
        countryCode: restriction.countryCode,
        countryName: restriction.countryName,
      });
      return;
    } catch (err) {
      console.error('[GeoRestriction] enforcement error, failing open:', err);
      return next();
    }
  };
import { queueDocumentVerification } from "./jobs/verify-document.job";
import { queueTradeEmail } from "./jobs/trade-emails.job";
import { registerWalletRoutes } from "./routes/wallet";

// ============================================================================
// IDEMPOTENCY KEY MIDDLEWARE (PAYMENT PROTECTION)
// ============================================================================

interface IdempotencyResult {
  status: number;
  body: unknown;
}

const IDEMPOTENCY_TTL = 24 * 60 * 60; // 24 hours
const LOCK_TTL = 30; // 30 second lock for in-progress requests

// In-memory lock map for when Redis is unavailable
const inMemoryLocks = new Map<string, { inProgress: boolean; result?: IdempotencyResult }>();

async function acquireIdempotencyLock(key: string): Promise<{ acquired: boolean; cachedResult?: IdempotencyResult }> {
  const redis = getRedisClient();
  const lockKey = `idempotency:lock:${key}`;
  const resultKey = `idempotency:result:${key}`;
  
  if (redis) {
    try {
      // Check for existing result first
      const existingResult = await redis.get(resultKey);
      if (existingResult) {
        return { acquired: false, cachedResult: JSON.parse(existingResult) };
      }
      
      // Try to acquire lock atomically with SETNX
      const acquired = await redis.set(lockKey, 'processing', 'EX', LOCK_TTL, 'NX');
      return { acquired: acquired === 'OK' };
    } catch (error) {
      console.error('[Idempotency] Redis error:', error);
    }
  }
  
  // Fallback to in-memory
  const cached = inMemoryLocks.get(key);
  if (cached?.result) {
    return { acquired: false, cachedResult: cached.result };
  }
  if (cached?.inProgress) {
    return { acquired: false };
  }
  inMemoryLocks.set(key, { inProgress: true });
  return { acquired: true };
}

async function storeIdempotencyResult(key: string, status: number, body: unknown): Promise<void> {
  const redis = getRedisClient();
  const lockKey = `idempotency:lock:${key}`;
  const resultKey = `idempotency:result:${key}`;
  const result: IdempotencyResult = { status, body };
  
  if (redis) {
    try {
      await redis.setex(resultKey, IDEMPOTENCY_TTL, JSON.stringify(result));
      await redis.del(lockKey);
      return;
    } catch (error) {
      console.error('[Idempotency] Redis store error:', error);
    }
  }
  
  // Fallback to in-memory
  inMemoryLocks.set(key, { inProgress: false, result });
  setTimeout(() => inMemoryLocks.delete(key), IDEMPOTENCY_TTL * 1000);
}

async function releaseIdempotencyLock(key: string): Promise<void> {
  const redis = getRedisClient();
  const lockKey = `idempotency:lock:${key}`;
  
  if (redis) {
    try {
      await redis.del(lockKey);
    } catch {}
  }
  inMemoryLocks.delete(key);
}

function idempotencyMiddleware(req: Request, res: Response, next: NextFunction) {
  const idempotencyKey = req.headers['x-idempotency-key'] as string;
  
  if (!idempotencyKey) {
    return next();
  }
  
  // Validate key format (should be UUID-like or alphanumeric)
  if (!/^[a-zA-Z0-9-_]{8,64}$/.test(idempotencyKey)) {
    return res.status(400).json({ message: 'Invalid idempotency key format' });
  }
  
  // Create composite key with user ID and request path
  const userId = req.session?.userId || 'anonymous';
  const compositeKey = `${userId}:${req.path}:${idempotencyKey}`;
  
  acquireIdempotencyLock(compositeKey).then(({ acquired, cachedResult }) => {
    if (cachedResult) {
      console.log(`[Idempotency] Returning cached response for key: ${idempotencyKey}`);
      return res.status(cachedResult.status).json(cachedResult.body);
    }
    
    if (!acquired) {
      // Request in progress, return conflict
      return res.status(409).json({ message: 'Request already in progress. Please wait.' });
    }
    
    // Store original json method to capture response
    const originalJson = res.json.bind(res);
    res.json = function(body: unknown) {
      storeIdempotencyResult(compositeKey, res.statusCode, body);
      return originalJson(body);
    };
    
    // Handle errors - release lock on request failure
    res.on('close', () => {
      if (!res.writableEnded) {
        releaseIdempotencyLock(compositeKey);
      }
    });
    
    return next();
  }).catch(() => next());
}

// Configure multer for file uploads
// Use memory storage when R2 is configured, otherwise use disk storage as fallback
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const memoryStorage = multer.memoryStorage();
const multerStorage = isR2Configured() ? memoryStorage : diskStorage;

// Validate both mimetype and file extension for security
// Only allow PDF, DOC, JPEG, PNG formats
const allowedMimeTypes: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
};

const upload = multer({ 
  storage: multerStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = allowedMimeTypes[file.mimetype];
    
    // Check both mimetype is allowed AND extension matches
    if (allowedExts && allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, JPEG, and PNG files are allowed.'));
    }
  }
});

// ============================================================================
// AUTHENTICATION MIDDLEWARE (SECURITY-CRITICAL)
// ============================================================================

// Middleware to ensure user is authenticated via session
function ensureAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  return next();
}

// SECURITY: Server-side role-based authorization.
// Mirrors ROUTE_ACCESS matrix from artifacts/finatrades/src/lib/roleMenus.tsx.
// Admins bypass; otherwise the user's user_type must be in the allowed list.
type UserTypeAllowed = 'exporter' | 'importer' | 'government';
function requireUserType(...allowed: UserTypeAllowed[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionUserId = req.session?.userId;
      if (!sessionUserId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const user = await storage.getUser(sessionUserId);
      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      if (user.role === 'admin') {
        req.currentUser = user;
        return next();
      }
      const ut = user.userType as UserTypeAllowed | null | undefined;
      if (!ut || !allowed.includes(ut)) {
        return res.status(403).json({
          message: "Access denied for your account type",
          requiredUserType: allowed,
          actualUserType: ut ?? null,
        });
      }
      req.currentUser = user;
      return next();
    } catch (error: any) {
      console.error('[requireUserType]', error?.message || error);
      return res.status(500).json({ message: "Authorization check failed" });
    }
  };
}

// Middleware to check if platform is in maintenance mode
// Admin routes are exempt from this check
async function checkMaintenanceMode(req: Request, res: Response, next: NextFunction) {
  try {
    const isMaintenanceMode = await platformLimits.isMaintenanceMode();
    if (isMaintenanceMode) {
      // Check if user is admin (exempt from maintenance mode)
      if (req.session?.userId) {
        const user = await storage.getUser(req.session.userId);
        if (user?.role === 'admin') {
          return next();
        }
      }
      return res.status(503).json({ 
        message: "Platform is currently undergoing maintenance. Please try again later.",
        maintenanceMode: true
      });
    }
    return next();
  } catch (error) {
    // If config check fails, allow request to proceed (fail-open for availability)
    return next();
  }
}

// Middleware to ensure authenticated user matches the userId param
// This prevents users from accessing other users' data
async function ensureOwnerOrAdmin(req: Request, res: Response, next: NextFunction) {
  const sessionUserId = req.session?.userId;
  const targetUserId = req.params.userId || req.params.id;
  
  if (!sessionUserId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  
  // Allow if user is accessing their own data
  if (sessionUserId === targetUserId) {
    return next();
  }
  
  // Allow if user is an admin
  const user = await storage.getUser(sessionUserId);
  if (user?.role === 'admin') {
    req.adminUser = user;
    return next();
  }
  
  return res.status(403).json({ message: "Access denied" });
}

// Middleware to ensure admin access via session-based authentication
// SECURITY: Requires both admin role AND login via /admin/login path AND active employee status
async function ensureAdminAsync(req: Request, res: Response, next: NextFunction) {
  try {
    const sessionUserId = req.session?.userId;
    
    if (!sessionUserId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    const admin = await storage.getUser(sessionUserId);
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ message: "Admin access required" });
    }
    
    // SECURITY: Verify admin logged in via admin portal, not regular login
    // Exception: Allow super admins who logged in before this check was added
    const employee = await storage.getEmployeeByUserId(admin.id);
    const isSuperAdmin = !employee || employee.role === 'super_admin';
    
    if (req.session.adminPortal !== true && !isSuperAdmin) {
      return res.status(403).json({ 
        message: "Admin portal access required. Please log in via /admin/login" 
      });
    }
    
    // SECURITY: Check if employee is active (skip for original admins without employee records)
    if (employee && employee.status !== 'active') {
      // Destroy the session for inactive employees - promisified
      await new Promise<void>((resolve) => {
        req.session.destroy((err) => {
          if (err) console.error('Session destroy error:', err);
          resolve();
        });
      });
      return res.status(403).json({ 
        message: "Your account has been deactivated. Please contact a super admin." 
      });
    }
    
    // Attach the validated admin user and employee to the request
    req.adminUser = admin;
    req.adminEmployee = employee;
    return next();
  } catch (error: any) {
    console.error('[Admin Auth Error]', error?.message || error);
    return res.status(500).json({ message: "Authentication failed", error: error?.message });
  }
}

// Legacy permission to RBAC component mapping
// RBAC action type for permission checking
type RbacAction = 'view' | 'edit' | 'create' | 'delete' | 'approve_l1' | 'approve_final' | 'reject' | 'export';

// Legacy permission to RBAC component mapping
// Maps legacy string permissions to the new RBAC system (component slugs + action)
// Some permissions can be satisfied by ANY of multiple components (e.g., view_reports from financial-reports OR audit-logs)
const LEGACY_TO_RBAC_MAP: Record<string, { components: string[]; action: RbacAction }> = {
  // User management
  'view_users': { components: ['user-management'], action: 'view' },
  'manage_users': { components: ['user-management'], action: 'edit' },
  'approve_users': { components: ['user-management'], action: 'approve_final' },
  
  // KYC/Compliance
  'view_kyc': { components: ['kyc-reviews', 'compliance-dashboard'], action: 'view' },
  'manage_kyc': { components: ['kyc-reviews', 'compliance-dashboard'], action: 'edit' },
  'approve_kyc': { components: ['kyc-reviews'], action: 'approve_final' },
  'reject_kyc': { components: ['kyc-reviews'], action: 'reject' },
  
  // Vault management
  'view_vault': { components: ['vault-management', 'physical-deposits', 'unified-gold-tally'], action: 'view' },
  'manage_vault': { components: ['vault-management', 'physical-deposits', 'unified-gold-tally'], action: 'edit' },
  'approve_vault': { components: ['vault-management'], action: 'approve_final' },
  
  // Employees
  'manage_employees': { components: ['employees', 'role-management'], action: 'edit' },
  
  // Platform settings
  'manage_settings': { components: ['platform-settings', 'security-settings', 'branding'], action: 'edit' },
  
  // Reports
  'view_reports': { components: ['financial-reports', 'audit-logs', 'treasury', 'compliance-dashboard'], action: 'view' },
  'generate_reports': { components: ['financial-reports', 'treasury'], action: 'create' },
  'export_reports': { components: ['financial-reports'], action: 'export' },
  
  // Payment operations
  'manage_deposits': { components: ['payment-operations'], action: 'edit' },
  'manage_withdrawals': { components: ['payment-operations'], action: 'edit' },
  'view_transactions': { components: ['payment-operations'], action: 'view' },
  'manage_transactions': { components: ['payment-operations'], action: 'edit' },
  'approve_deposits': { components: ['payment-operations'], action: 'approve_final' },
  'approve_withdrawals': { components: ['payment-operations'], action: 'approve_final' },
  'reject_deposits': { components: ['payment-operations'], action: 'reject' },
  'reject_withdrawals': { components: ['payment-operations'], action: 'reject' },
  
  // Fee management
  'manage_fees': { components: ['fee-management'], action: 'edit' },
  
  // FinaBridge
  'view_finabridge': { components: ['finabridge-management'], action: 'view' },
  'manage_finabridge': { components: ['finabridge-management'], action: 'edit' },
  
  // BNSL
  'view_bnsl': { components: ['bnsl-management'], action: 'view' },
  'manage_bnsl': { components: ['bnsl-management'], action: 'edit' },
  
  // CMS
  'view_cms': { components: ['cms-management'], action: 'view' },
  'manage_cms': { components: ['cms-management'], action: 'edit' },
  
  // Support
  'view_support': { components: ['support'], action: 'view' },
  'manage_support': { components: ['support'], action: 'edit' },
};

// Middleware to require specific employee permissions
// Must be used AFTER ensureAdminAsync as it relies on adminUser and adminEmployee being set
// NOW INTEGRATED WITH RBAC SYSTEM
function requirePermission(...requiredPermissions: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.session?.userId;
      
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      if (req.session?.userRole !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      // Check if user is Super Admin (bypass all permission checks)
      if (req.session.isSuperAdmin === undefined) {
        req.session.isSuperAdmin = await checkIsSuperAdmin(userId);
      }
      
      if (req.session.isSuperAdmin) {
        return next();
      }

      // Load RBAC permissions if not cached
      const cachedAt = req.session.permissionsCachedAt || 0;
      const now = Date.now();
      const CACHE_TTL = 5 * 60 * 1000;
      
      if (!req.session.permissions || now - cachedAt > CACHE_TTL) {
        req.session.permissions = await loadUserPermissions(userId);
        req.session.permissionsCachedAt = now;
      }

      // If no permissions required, allow access
      if (requiredPermissions.length === 0) {
        return next();
      }

      // Check if user has at least one of the required permissions via RBAC
      const hasPermission = requiredPermissions.some(legacyPerm => {
        const rbacMapping = LEGACY_TO_RBAC_MAP[legacyPerm];
        if (!rbacMapping) {
          console.warn(`[RBAC] Unknown legacy permission: ${legacyPerm}`);
          return false;
        }
        
        return rbacMapping.components.some(component => {
          const componentPerms = req.session.permissions?.[component];
          return componentPerms && componentPerms[rbacMapping.action];
        });
      });
      
      if (!hasPermission) {
        console.log(`[RBAC] Permission denied for user ${userId}. Required: ${requiredPermissions.join(' or ')}`);
        return res.status(403).json({ 
          message: "Permission denied",
          required: requiredPermissions
        });
      }

      return next();
    } catch (error) {
      console.error('[RBAC] Permission check failed:', error);
      return res.status(500).json({ message: "Permission check failed" });
    }
  };
}

// Middleware to enforce 2FA verification on sensitive financial operations
// Must be used AFTER ensureAuthenticated. Returns 403 with code mfa_required if the user
// has MFA enabled but hasn't provided a valid OTP token in this request.
function requireMfaVerification() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.session?.userId;
    if (!userId) return next(); // handled by ensureAuthenticated

    try {
      const user = await storage.getUser(userId);
      // Only enforce MFA check if the user has it enabled
      if (!user || !user.mfaEnabled) return next();

      const mfaToken = req.headers['x-mfa-token'] as string | undefined;
      if (!mfaToken) {
        return res.status(403).json({ 
          code: 'mfa_required',
          message: 'Two-factor authentication is required for this operation. Please provide your authenticator code.'
        });
      }

      // Verify the TOTP code
      if (!user.mfaSecret) {
        return res.status(403).json({ code: 'mfa_required', message: 'MFA setup incomplete.' });
      }
      const isValid = authenticator.verify({ token: mfaToken, secret: user.mfaSecret });
      if (!isValid) {
        return res.status(403).json({ code: 'mfa_invalid', message: 'Invalid authenticator code. Please try again.' });
      }

      return next();
    } catch (err) {
      console.error('[MFA] Verification error:', err);
      next(); // Fail open to not block legitimate users on transient errors
    }
  };
}

// Middleware to require KYC approval for financial operations
// Must be used AFTER ensureAuthenticated
async function requireKycApproved(req: Request, res: Response, next: NextFunction) {
  try {
    const sessionUserId = req.session?.userId;
    
    if (!sessionUserId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    const user = await storage.getUser(sessionUserId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    
    // Admin users bypass KYC requirement
    if (user.role === 'admin') {
      return next();
    }
    
    // Check if KYC is approved
    if (user.kycStatus !== 'Approved') {
      const statusMessage = user.kycStatus === 'In Progress' 
        ? 'Your KYC verification is pending approval. Please wait for verification to complete.'
        : user.kycStatus === 'Rejected'
          ? 'Your KYC verification was rejected. Please re-submit your documents.'
          : 'Please complete KYC verification to access this feature.';
      
      return res.status(403).json({ 
        message: statusMessage,
        code: 'KYC_REQUIRED',
        kycStatus: user.kycStatus
      });
    }
    
    return next();
  } catch (error: any) {
    console.error('[KYC Check Error]', error?.message || error);
    return res.status(500).json({ message: "KYC verification check failed" });
  }
}

// Helper to notify all admin users
async function notifyAllAdmins(notification: { title: string; message: string; type: 'info' | 'success' | 'warning' | 'error' | 'transaction'; link?: string }) {
  try {
    const allUsers = await storage.getAllUsers();
    const admins = allUsers.filter(u => u.role === 'admin');
    for (const admin of admins) {
      await storage.createNotification({
        userId: admin.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        link: notification.link || null,
        read: false,
      });
    }
  } catch (error) {
    console.error('Failed to notify admins:', error);
  }
}

// Helper to strip sensitive fields from user object
function sanitizeUser(user: User): Omit<User, 'password' | 'emailVerificationCode' | 'mfaSecret' | 'mfaBackupCodes'> {
  const { password, emailVerificationCode, mfaSecret, mfaBackupCodes, ...safeUser } = user;
  return safeUser;
}

// ============================================================================
// USER ACTIVITY LOGGING HELPER
// ============================================================================

type UserActivityType = 'login' | 'logout' | 'login_failed' | 'password_change' | 'email_change' |
  'mfa_enabled' | 'mfa_disabled' | 'profile_update' | 'settings_change' |
  'beneficiary_added' | 'beneficiary_removed' | 'dca_created' | 'dca_updated' |
  'price_alert_created' | 'price_alert_triggered' | 'kyc_submitted' | 'kyc_approved';

// Parse device info from user agent string
function parseDeviceInfo(userAgent: string | undefined): { browser?: string; os?: string; device?: string } {
  if (!userAgent) return {};
  
  const deviceInfo: { browser?: string; os?: string; device?: string } = {};
  
  // Parse browser
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
    const match = userAgent.match(/Chrome\/(\d+)/);
    deviceInfo.browser = match ? `Chrome ${match[1]}` : 'Chrome';
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    const match = userAgent.match(/Version\/(\d+)/);
    deviceInfo.browser = match ? `Safari ${match[1]}` : 'Safari';
  } else if (userAgent.includes('Firefox')) {
    const match = userAgent.match(/Firefox\/(\d+)/);
    deviceInfo.browser = match ? `Firefox ${match[1]}` : 'Firefox';
  } else if (userAgent.includes('Edg')) {
    const match = userAgent.match(/Edg\/(\d+)/);
    deviceInfo.browser = match ? `Edge ${match[1]}` : 'Edge';
  }
  
  // Parse OS
  if (userAgent.includes('Windows NT 10')) {
    deviceInfo.os = 'Windows 10/11';
  } else if (userAgent.includes('Windows')) {
    deviceInfo.os = 'Windows';
  } else if (userAgent.includes('Mac OS X')) {
    const match = userAgent.match(/Mac OS X (\d+[._]\d+)/);
    deviceInfo.os = match ? `macOS ${match[1].replace('_', '.')}` : 'macOS';
  } else if (userAgent.includes('Android')) {
    const match = userAgent.match(/Android (\d+)/);
    deviceInfo.os = match ? `Android ${match[1]}` : 'Android';
  } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    const match = userAgent.match(/OS (\d+)/);
    deviceInfo.os = match ? `iOS ${match[1]}` : 'iOS';
  } else if (userAgent.includes('Linux')) {
    deviceInfo.os = 'Linux';
  }
  
  // Parse device type
  if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
    deviceInfo.device = 'Mobile';
  } else if (userAgent.includes('iPad') || userAgent.includes('Tablet')) {
    deviceInfo.device = 'Tablet';
  } else {
    deviceInfo.device = 'Desktop';
  }
  
  return deviceInfo;
}

// Log user activity to the user_activity_logs table
async function logUserActivity(
  req: Request,
  userId: string,
  activityType: UserActivityType,
  description: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 
                      req.ip || 
                      req.socket?.remoteAddress || 
                      null;
    const userAgent = req.headers['user-agent'] || null;
    const deviceInfo = parseDeviceInfo(userAgent || undefined);
    
    await db.insert(userActivityLogs).values({
      userId,
      activityType,
      description,
      ipAddress,
      userAgent,
      deviceInfo: Object.keys(deviceInfo).length > 0 ? deviceInfo : null,
      location: null, // Can be populated with IP geolocation service later
      metadata: metadata || null,
    });
  } catch (error) {
    console.error('[Activity Log] Failed to log activity:', error);
    // Don't throw - activity logging should not break the main flow
  }
}

// Helper to generate 6-digit verification code
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Helper to validate and consume PIN verification token
// Returns userId if valid, null if invalid
async function validatePinToken(token: string | undefined, action: string): Promise<{ valid: boolean; userId?: string; error?: string }> {
  if (!token) {
    return { valid: false, error: 'PIN verification token required' };
  }
  
  const pinToken = await storage.getPinVerificationToken(token);
  
  if (!pinToken) {
    return { valid: false, error: 'Invalid or expired PIN token' };
  }
  
  if (new Date(pinToken.expiresAt) < new Date()) {
    return { valid: false, error: 'PIN token has expired' };
  }
  
  if (pinToken.action !== action) {
    return { valid: false, error: 'PIN token action mismatch' };
  }
  
  // Mark token as used
  await storage.usePinVerificationToken(token);
  
  return { valid: true, userId: pinToken.userId };
}

// Session-bound PIN verification — always uses session.userId, never trusts body/params
// Use this on endpoints where userId is derived from the session (no body userId)
function requirePinVerificationForSession(action: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const pinToken = req.headers['x-pin-token'] as string | undefined;
    const userId = req.session?.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const transactionPin = await storage.getTransactionPin(userId);
    if (!transactionPin) {
      return next();
    }

    const result = await validatePinToken(pinToken, action);
    if (!result.valid) {
      return res.status(403).json({ message: result.error, requiresPin: true, action });
    }
    if (result.userId !== userId) {
      return res.status(403).json({ message: 'PIN verification user mismatch', requiresPin: true, action });
    }

    return next();
  };
}

// Middleware to require PIN verification for sensitive transactions
function requirePinVerification(action: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const pinToken = req.headers['x-pin-token'] as string | undefined;
    const userId = req.body.userId || req.body.senderId || req.params.userId || req.session?.userId;
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID required' });
    }
    
    // Check if user has PIN set up
    const transactionPin = await storage.getTransactionPin(userId);
    
    // If no PIN set up, allow transaction (user hasn't enabled this security feature)
    if (!transactionPin) {
      return next();
    }
    
    // PIN is set up, require verification token
    const result = await validatePinToken(pinToken, action);
    
    if (!result.valid) {
      return res.status(403).json({ 
        message: result.error,
        requiresPin: true,
        action
      });
    }
    
    // Verify token belongs to the requesting user
    if (result.userId !== userId) {
      return res.status(403).json({ 
        message: 'PIN verification user mismatch',
        requiresPin: true,
        action
      });
    }
    
    return next();
  };
}

/**
 * Server-side gold price validator.
 * Fetches live gold price and checks whether a client-supplied price is within tolerance.
 *
 * @param clientPrice  Price submitted by the client (0 or null means "not provided")
 * @param tolerance    Allowed deviation fraction (default 0.02 = 2%)
 * @returns livePrice, the server-authoritative price to use, and whether the client price is valid
 */
async function validateAndFetchGoldPrice(
  clientPrice: number | null | undefined,
  tolerance = 0.02,
): Promise<{ livePrice: number; priceToUse: number; valid: boolean; deviation: number; unavailable?: boolean }> {
  const livePrice = await getGoldPricePerGram().catch(() => 0);

  // Fail-closed: if live price is unavailable, never fall back to client-supplied price.
  // Callers must return a 503 when unavailable is true.
  if (!livePrice || livePrice <= 0) {
    console.error('[GoldPrice] Live price unavailable — rejecting price-sensitive request (fail-closed)');
    return { livePrice: 0, priceToUse: 0, valid: false, deviation: 0, unavailable: true };
  }

  // If no client price provided, accept as valid (no drift to check)
  if (!clientPrice || clientPrice <= 0) {
    return { livePrice, priceToUse: livePrice, valid: true, deviation: 0 };
  }

  const deviation = Math.abs(clientPrice - livePrice) / livePrice;
  return {
    livePrice,
    priceToUse: livePrice,  // Always authoritative: server-fetched live price used in all calculations
    valid: deviation <= tolerance,
    deviation,
  };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Seed email templates in the background — this can take 30+ seconds and would
  // otherwise block startup, causing platform healthcheck/promote probes to time out.
  // Templates aren't needed for the first few requests; emails are queued and processed
  // asynchronously, so seeding can finish after the server is already accepting traffic.
  seedEmailTemplates().catch(err => console.error('[Email] Failed to seed templates:', err));

  // RBAC Consistency Check: ensure all active employees have matching user_role_assignments
  try {
    const orphanedEmployees = await db.execute(sql`
      SELECT e.user_id, e.rbac_role_id, e.employee_id, e.created_by
      FROM employees e
      WHERE e.status = 'active' 
        AND e.user_id IS NOT NULL 
        AND e.rbac_role_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM user_role_assignments ura 
          WHERE ura.user_id = e.user_id AND ura.role_id = e.rbac_role_id AND ura.is_active = true
        )
    `);
    
    if (orphanedEmployees.rows.length > 0) {
      console.log(`[RBAC] Found ${orphanedEmployees.rows.length} employee(s) missing role assignments. Repairing...`);
      // db.execute returns generic Record<string, unknown> rows; narrow to the
      // shape selected by the preceding SELECT so emp.* are typed.
      type OrphanRow = { user_id: string; rbac_role_id: string; created_by: string | null; employee_id: string };
      for (const emp of orphanedEmployees.rows as OrphanRow[]) {
        await db.execute(sql`
          INSERT INTO user_role_assignments (id, user_id, role_id, assigned_by, assigned_at, is_active)
          VALUES (gen_random_uuid(), ${emp.user_id}, ${emp.rbac_role_id}, ${emp.created_by || 'system'}, NOW(), true)
        `);
        console.log(`[RBAC] Repaired: employee=${emp.employee_id}, user=${emp.user_id}, role=${emp.rbac_role_id}`);
      }
    } else {
      console.log('[RBAC] Consistency check passed: all employee role assignments are in sync');
    }
  } catch (err) {
    console.error('[RBAC] Consistency check failed:', err);
  }
  
  // Start document expiry reminder scheduler
  startDocumentExpiryScheduler();
  
  // Apply request sanitization middleware
  app.use(sanitizeRequest);
  
  // Public health check endpoint for testing and monitoring
  app.get("/api/health", (req, res) => {
    return res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0'
    });
  });

  // CSRF token endpoint
  app.get("/api/csrf-token", getCsrfTokenHandler);
  
  // Register compliance, reconciliation, SAR, and fraud detection routes
  registerComplianceRoutes(app, ensureAdminAsync, requirePermission);
  // Wingold SSO bridge removed with the rest of the legacy gold stack.
  // Register Verifiable Credentials routes for W3C VC 2.0
  app.use("/api", vcRoutes);
  // Wingold partner / webhook route registrations removed with the rest of the
  // legacy gold stack.

  // Brevo Email Bounce / Complaint Webhook
  // Brevo sends POST events: hard_bounce, soft_bounce, complaint, invalid_email
  app.post("/api/webhooks/email-bounce", async (req: Request, res: Response) => {
    try {
      // Authenticate webhook request using shared secret
      const webhookSecret = process.env.BREVO_WEBHOOK_SECRET;
      if (webhookSecret) {
        const providedToken = req.headers['x-brevo-webhook-token'] as string | undefined;
        if (!providedToken || providedToken !== webhookSecret) {
          console.warn('[EmailBounce] Webhook rejected: invalid or missing token');
          return res.status(401).json({ error: 'Unauthorized' });
        }
      }

      // Brevo sends an array of events or a single event object
      const events: any[] = Array.isArray(req.body) ? req.body : [req.body];

      for (const event of events) {
        const eventType: string = event.event || '';
        const recipientEmail: string = (event.email || '').toLowerCase().trim();

        if (!recipientEmail) continue;

        const bouncingEvents = ['hard_bounce', 'soft_bounce', 'complaint', 'invalid_email'];
        if (!bouncingEvents.includes(eventType)) continue;

        // Update most recent email_log entry for this recipient to 'Bounced'
        await db.update(emailLogs)
          .set({ status: 'Bounced', errorMessage: `Brevo event: ${eventType}` })
          .where(
            and(
              eq(emailLogs.recipientEmail, recipientEmail),
              eq(emailLogs.status, 'Sent')
            )
          );

        console.log(`[EmailBounce] Marked bounce for ${recipientEmail} — event: ${eventType}`);
      }

      return res.json({ received: true });
    } catch (err: any) {
      console.error('[EmailBounce] Webhook error:', err.message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Vault-exposure, physical-deposit, and unified-tally routes were part of
  // the legacy gold stack and have been removed.
  // Register B2B order receiving routes
  app.use("/api/b2b", b2bRoutes);
  // Register B2B USD Wallet routes (Task #74)
  registerWalletRoutes(app);
  app.use("/api/b2b/consignments", consignmentsRouter);
  app.use("/api/admin/consignments", ensureAdminAsync, adminConsignmentsRouter);
  app.use("/api/admin/email-queues", ensureAdminAsync, adminEmailQueuesRouter);
  app.use("/api/b2b/warehouse", warehouseRouter);
  app.use("/api/b2b/marketplace", marketplaceRouter);
  // Task #145: counterparty FT-ID + ratings + identity-consent + gated contract.
  // Mounted at /api so it serves /api/finatrades-id/:ftId and /api/trade/*.
  app.use("/api", counterpartyRouter);

  // File upload endpoint for Deal Room and other attachments
  app.post("/api/documents/upload", ensureAuthenticated, upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
      
      let fileUrl: string;
      
      // Upload to R2 if configured, otherwise use local disk
      if (isR2Configured() && req.file.buffer) {
        const r2Key = generateR2Key('documents', req.file.originalname);
        const result = await uploadToR2(r2Key, req.file.buffer, req.file.mimetype);
        fileUrl = result.url;
        console.log(`[R2] File uploaded: ${r2Key}`);
      } else {
        // Fallback to local disk storage
        fileUrl = `/uploads/${req.file.filename}`;
      }
      
      return res.json({ 
        url: fileUrl, 
        filename: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size 
      });
    } catch (error) {
      console.error('File upload error:', error);
      return res.status(500).json({ message: 'Failed to upload file' });
    }
  });
  
  // ============================================================================
  // GOLD PRICE API
  // ============================================================================
  
  // Get current gold price (live from Metals-API.com)
  app.post("/api/contact", async (req, res) => {
    try {
      const { name, email, phone, company, subject, message } = req.body;
      
      if (!name || !email || !subject || !message) {
        return res.status(400).json({ message: "Name, email, subject, and message are required" });
      }
      
      // Send email notification to support
      const contactEmailSubject = `[Contact Form] ${subject} - from ${name}`;
      const contactEmailHtml = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #8A2BE2;">New Contact Form Submission</h2>
  <table style="width: 100%; border-collapse: collapse;">
    <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Name:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${name}</td></tr>
    <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Email:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;"><a href="mailto:${email}">${email}</a></td></tr>
    <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Phone:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${phone || 'Not provided'}</td></tr>
    <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Company:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${company || 'Not provided'}</td></tr>
    <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Subject:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${subject}</td></tr>
  </table>
  <h3 style="color: #4B0082; margin-top: 20px;">Message:</h3>
  <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; white-space: pre-wrap;">${message}</div>
</div>
        `;
      await sendEmailDirect("support@finatrades.com", contactEmailSubject, contactEmailHtml);
      
      return res.json({ success: true, message: "Message sent successfully" });
    } catch (error) {
      console.error('[Contact Form] Error:', error);
      return res.status(500).json({ message: "Failed to send message" });
    }
  });

  // ============================================================================
  // AUTHENTICATION & USER MANAGEMENT
  // ============================================================================
  
  // Register new user (rate limited)
  app.post("/api/auth/register", geoRestrictionMiddleware({ allowRegistrationBypass: true }), authRateLimiter, async (req, res) => {
    try {
      // Check if registrations are enabled
      const { getSystemSettings } = await import("./index");
      const systemSettings = await getSystemSettings();
      if (!systemSettings.registrationsEnabled) {
        return res.status(403).json({ 
          message: "New registrations are currently disabled. Please try again later." 
        });
      }
      
      const { referralCode, ...restBody } = req.body;
      const userData = insertUserSchema.parse(restBody);
      const existingUser = await storage.getUserByEmail(userData.email);
      
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }
      
      // Hash the password before storing
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      // Generate verification code and expiry (10 minutes from now)
      const verificationCode = generateVerificationCode();
      const codeExpiry = new Date(Date.now() + 10 * 60 * 1000);
      
      // Generate unique Finatrades ID
      const finatradesId = storage.generateFinatradesId();
      
      // Auto-promote specific emails to admin role
      const adminEmails = ['blockchain@finatrades.com'];
      const isAdminEmail = adminEmails.includes(userData.email.toLowerCase());
      
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
        finatradesId,
        role: isAdminEmail ? 'admin' : 'user',
        isEmailVerified: false,
        emailVerificationCode: verificationCode,
        emailVerificationExpiry: codeExpiry,
      });
      
      // Create wallet for new user
      await storage.createWallet({
        userId: user.id,
        usdBalance: "0",
        eurBalance: "0",
      });

      // Sync new user to Wingold (non-blocking)
      /* WingoldUserSyncService removed */
      
      // Pending-invite/peer-transfer claiming removed with the legacy gold stack (task #144).
      let inviteSenderReferralCode: string | undefined;
      
      // Use sender's referral code from invitation if user didn't provide one
      const effectiveReferralCode = referralCode || inviteSenderReferralCode;
      
      // Handle referral code (from form or invitation) if provided
      if (effectiveReferralCode) {
        try {
          const referral = await storage.getReferralByCode(effectiveReferralCode);
          if (referral && referral.status === 'Active' && !referral.referredId) {
            // Link the referral to this new user
            await storage.updateReferral(referral.id, {
              referredId: user.id,
              referredEmail: user.email,
              status: 'Pending', // Will be marked as Completed after first deposit
            });
            console.log(`[Registration] Linked referral ${effectiveReferralCode} to new user ${user.email}`);
          }
        } catch (refError) {
          console.error('[Registration] Referral linking failed:', refError);
          // Don't fail registration if referral linking fails
        }
      }
      
      // Create audit log
      await storage.createAuditLog({
        entityType: "user",
        entityId: user.id,
        actionType: "create",
        actor: user.id,
        actorRole: "user",
        details: effectiveReferralCode 
          ? `User registered with referral code ${effectiveReferralCode}${inviteSenderReferralCode ? ' (from invitation)' : ''}` 
          : "User registered - pending email verification",
      });
      
      // Create welcome notification
      await storage.createNotification({
        userId: user.id,
        title: 'Welcome to Finatrades!',
        message: 'Your account has been created. Complete your email verification and KYC to unlock all features.',
        type: 'info',
        link: '/kyc',
      });
      
      // Send welcome email (non-blocking)
      sendEmail(user.email, EMAIL_TEMPLATES.WELCOME, {
        user_name: `${user.firstName} ${user.lastName}`,
      }).catch(err => console.error('[Email] Welcome email failed:', err));
      
      // Send verification email (wrapped in try-catch to prevent registration failure)
      let emailResult: { success: boolean; messageId?: string; error?: string } = { success: false, error: '' };
      try {
        emailResult = await sendEmail(user.email, EMAIL_TEMPLATES.EMAIL_VERIFICATION, {
          user_name: `${user.firstName} ${user.lastName}`,
          verification_code: verificationCode,
        });
      } catch (emailError) {
        console.error('[Registration] Email send failed:', emailError);
        emailResult = { success: false, error: emailError instanceof Error ? emailError.message : 'Email failed' };
      }
      
      // Log platform activity
      logActivity({
        type: 'user_registration',
        title: 'New User Registration',
        description: `${user.firstName} ${user.lastName} registered (${user.email})`,
        details: { finatradesId: user.finatradesId, hasReferral: !!effectiveReferralCode },
        severity: 'info',
      });
      
      return res.json({ 
        user: sanitizeUser(user),
        message: emailResult.success 
          ? "Registration successful. Please verify your email." 
          : "Registration successful. Email could not be sent - you can request a new verification code.",
        requiresVerification: true,
        emailSent: emailResult.success
      });
    } catch (error) {
      return res.status(400).json({ message: error instanceof Error ? error.message : "Registration failed" });
    }
  });
  
  // Send/Resend email verification code
  app.post("/api/auth/send-verification", async (req, res) => {
    try {
      const { email } = req.body;
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (user.isEmailVerified) {
        return res.status(400).json({ message: "Email already verified" });
      }
      
      // Generate new verification code
      const verificationCode = generateVerificationCode();
      const codeExpiry = new Date(Date.now() + 10 * 60 * 1000);
      
      await storage.updateUser(user.id, {
        emailVerificationCode: verificationCode,
        emailVerificationExpiry: codeExpiry,
      });
      
      // Send verification email
      const emailResult = await sendEmail(email, EMAIL_TEMPLATES.EMAIL_VERIFICATION, {
        user_name: `${user.firstName} ${user.lastName}`,
        verification_code: verificationCode,
      });
      
      if (!emailResult.success) {
        return res.status(500).json({ message: "Failed to send verification email. Please try again." });
      }
      
      return res.json({ message: "Verification code sent to your email" });
    } catch (error) {
      return res.status(400).json({ message: "Failed to send verification code" });
    }
  });
  
  // Verify email with code (rate limited)
  app.post("/api/auth/verify-email", otpRateLimiter, async (req, res) => {
    try {
      const { email, code } = req.body;
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (user.isEmailVerified) {
        return res.status(400).json({ message: "Email already verified" });
      }
      
      if (!user.emailVerificationCode || !user.emailVerificationExpiry) {
        return res.status(400).json({ message: "No verification code found. Please request a new one." });
      }
      
      if (new Date() > user.emailVerificationExpiry) {
        return res.status(400).json({ message: "Verification code expired. Please request a new one." });
      }
      
      if (user.emailVerificationCode !== code) {
        return res.status(400).json({ message: "Invalid verification code" });
      }
      
      // Mark email as verified
      const updatedUser = await storage.updateUser(user.id, {
        isEmailVerified: true,
        emailVerificationCode: null,
        emailVerificationExpiry: null,
      });
      
      // Create audit log
      await storage.createAuditLog({
        entityType: "user",
        entityId: user.id,
        actionType: "update",
        actor: user.id,
        actorRole: "user",
        details: "Email verified successfully",
      });
      
      return res.json({ 
        message: "Email verified successfully", 
        user: sanitizeUser(updatedUser!) 
      });
    } catch (error) {
      return res.status(400).json({ message: "Verification failed" });
    }
  });
  
  // In-memory MFA challenge store (in production, use Redis or database with TTL)
  const mfaChallenges = new Map<string, { userId: string; expiresAt: Date; attempts: number; adminPortal?: boolean; setupRequired?: boolean }>();
  
  // SECURITY: Cryptographically secure token generation
  function generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }
  
  // SECURITY: Rate limiting for login endpoints
  const loginAttempts = new Map<string, { count: number; firstAttempt: number }>();
  const LOGIN_RATE_LIMIT = 5; // max attempts
  const LOGIN_RATE_WINDOW_SECONDS = 15 * 60; // 15 minutes in seconds
  const LOGIN_RATE_WINDOW = LOGIN_RATE_WINDOW_SECONDS * 1000; // 15 minutes in ms
  
  async function checkLoginRateLimitAsync(identifier: string): Promise<{ allowed: boolean; remainingAttempts: number; retryAfter?: number }> {
    // Use in-memory rate limiting
    return checkLoginRateLimit(identifier);
  }
  
  function checkLoginRateLimit(identifier: string): { allowed: boolean; remainingAttempts: number; retryAfter?: number } {
    const now = Date.now();
    const attempts = loginAttempts.get(identifier);
    
    if (!attempts) {
      loginAttempts.set(identifier, { count: 1, firstAttempt: now });
      return { allowed: true, remainingAttempts: LOGIN_RATE_LIMIT - 1 };
    }
    
    // Reset if window expired
    if (now - attempts.firstAttempt > LOGIN_RATE_WINDOW) {
      loginAttempts.set(identifier, { count: 1, firstAttempt: now });
      return { allowed: true, remainingAttempts: LOGIN_RATE_LIMIT - 1 };
    }
    
    if (attempts.count >= LOGIN_RATE_LIMIT) {
      const retryAfter = Math.ceil((LOGIN_RATE_WINDOW - (now - attempts.firstAttempt)) / 1000);
      return { allowed: false, remainingAttempts: 0, retryAfter };
    }
    
    attempts.count++;
    return { allowed: true, remainingAttempts: LOGIN_RATE_LIMIT - attempts.count };
  }
  
  // Clean up rate limit entries periodically (only needed for in-memory fallback)
  setInterval(() => {
    const now = Date.now();
    Array.from(loginAttempts.entries()).forEach(([key, attempts]) => {
      if (now - attempts.firstAttempt > LOGIN_RATE_WINDOW) {
        loginAttempts.delete(key);
      }
    });
  }, 60 * 1000); // Clean every minute
  
  // Clean up expired challenges periodically
  setInterval(() => {
    const now = new Date();
    Array.from(mfaChallenges.entries()).forEach(([token, challenge]) => {
      if (challenge.expiresAt < now) {
        mfaChallenges.delete(token);
      }
    });
  }, 60000); // Clean every minute

  // Certificate-ledger startup backfill, daily cert-wallet reconciliation,
  // and BNSL/monthly/annual statement schedulers were part of the legacy gold
  // stack and have been removed along with their job modules.

  // FinaBridge LC Expiry Notification Cron — runs every 12 hours
  // Creates in-app + email notifications for open deal rooms where LC expires within 3 days
  setInterval(async () => {
    try {
      const now = new Date();
      const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      const openRooms = await db.select().from(dealRoomsTable).where(eq(dealRoomsTable.status, 'open'));
      for (const room of openRooms) {
        const [lcRow] = await db.select().from(lcTerms).where(eq(lcTerms.dealRoomId, room.id));
        if (!lcRow?.expiryDate) continue;
        const expiryDate = new Date(lcRow.expiryDate);
        if (expiryDate > now && expiryDate <= threeDaysFromNow) {
          const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          console.log(`[FinaBridge] LC Expiry Alert: Deal Room ${room.id} expires in ${daysUntilExpiry} day(s) (${lcRow.expiryDate})`);
          // Notify assigned admin if present, otherwise notify all admins
          const notificationTitle = `LC Expiry Alert — ${daysUntilExpiry} day(s) remaining`;
          const adminMessage = `Deal Room ${room.id.slice(0, 8)} has an LC expiring on ${lcRow.expiryDate}. Immediate review required.`;
          const partyMessage = `Your deal room LC expires in ${daysUntilExpiry} day(s) on ${lcRow.expiryDate}. Please contact your deal manager.`;

          // Notify admin(s) — assigned manager first, else all admins
          const adminUsers = await db.select().from(users).where(eq(users.role, 'admin'));
          const adminTargets = adminUsers.filter(u => !room.assignedAdminId || u.id === room.assignedAdminId);
          for (const admin of adminTargets) {
            if (!admin.id) continue;
            // In-app notification (bell)
            try {
              await storage.createNotification({
                userId: admin.id,
                title: notificationTitle,
                message: adminMessage,
                type: 'warning',
                link: `/admin/finabridge`,
                read: false,
              });
            } catch (notifErr) {
              console.error(`[FinaBridge] Failed to create in-app notification for admin ${admin.id}:`, notifErr);
            }
            // Email notification
            if (admin.email) {
              try {
                const { sendEmailDirect } = await import('./email');
                await sendEmailDirect(admin.email, `[FinaBridge] ${notificationTitle}`, `
                    <p>Dear ${admin.firstName || admin.email},</p>
                    <p>This is an automated alert from the FinaBridge Deal Manager.</p>
                    <p>Deal Room <strong>${room.id}</strong> has an LC that will expire in <strong>${daysUntilExpiry} day(s)</strong> on <strong>${lcRow.expiryDate}</strong>.</p>
                    <p>Please review the deal and take appropriate action before the LC expires.</p>
                    <p>Log in to the admin panel to manage this deal: <a href="${process.env.BASE_URL || 'https://finatrades.com'}/admin/finabridge">FinaBridge Admin</a></p>
                    <p>— FinaTrades FinaBridge System</p>
                  `
                );
              } catch (emailErr) {
                console.error(`[FinaBridge] Failed to send LC expiry email to ${admin.email}:`, emailErr);
              }
            }
          }

          // Notify deal participants (importer + exporter) — in-app only
          for (const userId of [room.importerUserId, room.exporterUserId]) {
            if (!userId) continue;
            await storage.createNotification({
              userId,
              title: notificationTitle,
              message: partyMessage,
              type: 'warning',
              link: `/finabridge`,
              read: false,
            }).catch(err => console.error(`[FinaBridge] Party LC expiry notification failed for ${userId}:`, err));
          }
        }
      }
    } catch (err) {
      console.error('[FinaBridge] LC expiry cron error:', err);
    }
  }, 12 * 60 * 60 * 1000);

  // Login with rate limiting
  app.post("/api/auth/login", geoRestrictionMiddleware(), authRateLimiter, async (req, res) => {
    try {
      const { email, password } = req.body;
      
      // SECURITY: Rate limiting to prevent brute force attacks
      const clientIP = req.ip || req.socket.remoteAddress || 'unknown';
      const rateLimitKey = `login:${clientIP}:${email}`;
      const rateCheck = await checkLoginRateLimitAsync(rateLimitKey);
      
      if (!rateCheck.allowed) {
        res.setHeader('Retry-After', rateCheck.retryAfter?.toString() || '900');
        return res.status(429).json({ 
          message: `Too many login attempts. Please try again in ${Math.ceil((rateCheck.retryAfter || 900) / 60)} minutes.`,
          retryAfter: rateCheck.retryAfter
        });
      }
      
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // SECURITY: All passwords must be bcrypt hashed
      // Plain text passwords are no longer accepted for security
      let isValidPassword = false;
      if (user.password.startsWith('$2')) {
        isValidPassword = await bcrypt.compare(password, user.password);
      } else {
        // Force migration: hash legacy plaintext passwords on login attempt
        // For security, we still compare to allow migration but then hash immediately
        if (user.password === password) {
          const hashedPassword = await bcrypt.hash(password, 12);
          await storage.updateUser(user.id, { password: hashedPassword });
          isValidPassword = true;
        }
      }
      
      if (!isValidPassword) {
        // Log failed login attempt
        logUserActivity(req, user.id, "login_failed", "Failed login attempt - invalid password").catch(err => console.error("[Activity Log] Failed login log failed:", err));
        return res.status(401).json({ message: "Invalid credentials" });
      }
      // SECURITY: Block unverified users from logging in
      // They must verify their email first via the verification link
      if (!user.isEmailVerified) {
        return res.status(403).json({ 
          message: "Please verify your email before logging in. Enter the 6-digit verification code sent to your email.",
          requiresEmailVerification: true,
          email: user.email
        });
      }
      // STRICT RULE: Admin/employee users cannot log in via regular login page
      // They must use /admin/login for proper admin portal access
      if (user.role === 'admin') {
        return res.status(403).json({ 
          message: "Admin accounts must log in via the Admin Portal. Please use /admin/login",
          redirectTo: "/admin/login"
        });
      }
      
      // Check if MFA is enabled
      if (user.mfaEnabled) {
        // Generate a SECURE challenge token for MFA verification
        const challengeToken = generateSecureToken(32);
        
        // Store challenge with 5 minute expiry and attempt counter
        mfaChallenges.set(challengeToken, {
          userId: user.id,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          attempts: 0,
          adminPortal: false
        });
        
        return res.json({ 
          requiresMfa: true, 
          challengeToken,
          mfaMethod: user.mfaMethod,
          message: "MFA verification required" 
        });
      }
      
      // SECURITY: Enforce 2FA when platform setting is enabled
      const systemSettings = await getSystemSettings();
      if (systemSettings.require2fa && !user.mfaEnabled) {
        // Generate a setup token so user can set up 2FA without full session
        const setupToken = generateSecureToken(32);
        
        // Store setup token with 15 minute expiry for 2FA setup
        mfaChallenges.set(setupToken, {
          userId: user.id,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          attempts: 0,
          adminPortal: false,
          setupRequired: true
        });
        
        return res.json({
          requires2faSetup: true,
          setupToken,
          message: "Two-factor authentication is required. Please set up 2FA to continue."
        });
      }
      
      // SECURITY: Regenerate session to prevent session fixation attacks
      await new Promise<void>((resolve, reject) => {
        req.session.regenerate((err) => {
          if (err) {
            console.error('[Session] Regeneration failed:', err);
            reject(err);
          } else {
            resolve();
          }
        });
      });
      
      // Set session for authenticated user (SECURITY-CRITICAL)
      // Regular login does NOT grant admin portal access
      req.session.userId = user.id;
      req.session.userRole = user.role;
      req.session.adminPortal = false;
      
      // Record login timestamp for session tracking
      const updatedUser = await storage.updateUser(user.id, {
        lastLoginAt: new Date(),
      });
      // Log successful login activity
      logUserActivity(req, user.id, "login", "User logged in successfully").catch(err => console.error("[Activity Log] Login log failed:", err));
      return res.json({ user: sanitizeUser(updatedUser || user), adminPortal: false });
    } catch (error) {
      console.error('[Login Error]', error);
      return res.status(400).json({ message: "Login failed" });
    }
  });

  // Admin-specific login with rate limiting - grants admin portal access
  app.post("/api/admin/login", geoRestrictionMiddleware(), async (req, res) => {
    try {
      const { email, password } = req.body;
      
      // SECURITY: Rate limiting to prevent brute force attacks (stricter for admin)
      const clientIP = req.ip || req.socket.remoteAddress || 'unknown';
      const rateLimitKey = `admin_login:${clientIP}:${email}`;
      const rateCheck = await checkLoginRateLimitAsync(rateLimitKey);
      
      if (!rateCheck.allowed) {
        res.setHeader('Retry-After', rateCheck.retryAfter?.toString() || '900');
        return res.status(429).json({ 
          message: `Too many login attempts. Please try again in ${Math.ceil((rateCheck.retryAfter || 900) / 60)} minutes.`,
          retryAfter: rateCheck.retryAfter
        });
      }
      
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Verify this is an admin user
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required. Please use the regular login page." });
      }
      
      // SECURITY: All passwords must be bcrypt hashed
      let isValidPassword = false;
      if (user.password.startsWith('$2')) {
        isValidPassword = await bcrypt.compare(password, user.password);
      } else {
        // Force migration: hash legacy plaintext passwords on login attempt
        if (user.password === password) {
          const hashedPassword = await bcrypt.hash(password, 12);
          await storage.updateUser(user.id, { password: hashedPassword });
          isValidPassword = true;
        }
      }
      
      if (!isValidPassword) {
        // Log failed login attempt
        logUserActivity(req, user.id, "login_failed", "Failed login attempt - invalid password").catch(err => console.error("[Activity Log] Failed login log failed:", err));
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Check if MFA is enabled
      if (user.mfaEnabled) {
        // Generate a SECURE challenge token for MFA verification
        const challengeToken = generateSecureToken(32);
        
        // Store challenge with 5 minute expiry, attempt counter, and admin portal flag
        mfaChallenges.set(challengeToken, {
          userId: user.id,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          attempts: 0,
          adminPortal: true
        });
        
        return res.json({ 
          requiresMfa: true, 
          challengeToken,
          mfaMethod: user.mfaMethod,
          message: "MFA verification required" 
        });
      }
      
      // SECURITY: Enforce 2FA for admins when platform setting is enabled
      const adminSystemSettings = await getSystemSettings();
      if (adminSystemSettings.require2fa && !user.mfaEnabled) {
        // Generate a setup token so admin can set up 2FA
        const setupToken = generateSecureToken(32);
        
        mfaChallenges.set(setupToken, {
          userId: user.id,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          attempts: 0,
          adminPortal: true,
          setupRequired: true
        });
        
        return res.json({
          requires2faSetup: true,
          setupToken,
          message: "Two-factor authentication is required for admin accounts. Please set up 2FA to continue."
        });
      }
      
      // SECURITY: Regenerate session to prevent session fixation attacks
      await new Promise<void>((resolve, reject) => {
        req.session.regenerate((err) => {
          if (err) {
            console.error('[Session] Regeneration failed:', err);
            reject(err);
          } else {
            resolve();
          }
        });
      });
      
      // Set session for authenticated admin user with admin portal access
      req.session.userId = user.id;
      req.session.userRole = user.role;
      req.session.adminPortal = true;
      
      // CRITICAL: Explicitly save session to ensure adminPortal flag persists
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      
      // Record login timestamp for session tracking
      const updatedUser = await storage.updateUser(user.id, {
        lastLoginAt: new Date(),
      });
      // Log successful login activity
      logUserActivity(req, user.id, "login", "User logged in successfully").catch(err => console.error("[Activity Log] Login log failed:", err));
      // Audit log for admin login
      await storage.createAuditLog({
        entityType: "user",
        entityId: user.id,
        actionType: "admin_login",
        actor: user.id,
        actorRole: "admin",
        details: "Admin portal login"
      });
      
      return res.json({ user: sanitizeUser(updatedUser || user), adminPortal: true });
    } catch (error) {
      return res.status(400).json({ message: "Login failed" });
    }
  });
  
  // Get current user - PROTECTED: requires matching session
  app.get("/api/auth/me/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const user = await storage.getUser(req.params.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      return res.json({ user: sanitizeUser(user) });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get user" });
    }
  });

  // ============================================================================
  // USER ACTIVITY LOG ENDPOINT
  // ============================================================================
  
  // Get user's activity log with pagination
  app.get("/api/activity-log", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const offset = parseInt(req.query.offset as string) || 0;
      
      const logs = await db
        .select()
        .from(userActivityLogs)
        .where(eq(userActivityLogs.userId, userId))
        .orderBy(desc(userActivityLogs.createdAt))
        .limit(limit)
        .offset(offset);
      
      const [countResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(userActivityLogs)
        .where(eq(userActivityLogs.userId, userId));
      
        return res.json({
        logs,
        pagination: {
          limit,
          offset,
          total: countResult?.count || 0,
          hasMore: offset + logs.length < (countResult?.count || 0)
        }
      });
    } catch (error) {
      console.error('[Activity Log] Failed to fetch activity logs:', error);
      return res.status(500).json({ message: "Failed to fetch activity logs" });
    }
  });
  
  // Get basic user info (for display in payment requests/transfers)
  // Any authenticated user can fetch public info about other users
  app.get("/api/users/:userId", ensureAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.params.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      // Return only public display information
        return res.json({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      });
    } catch (error) {
      console.error('[Get User Error]', error);
      return res.status(400).json({ message: "Failed to get user" });
    }
  });
  
  // Update user profile - PROTECTED: requires matching session
  // Change password — requires current password verification
  app.post("/api/users/:userId/change-password", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body || {};
      if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
        return res.status(400).json({ message: "currentPassword and newPassword are required" });
      }
      if (newPassword.length < 8) {
        return res.status(400).json({ message: "New password must be at least 8 characters long" });
      }
      if (newPassword === currentPassword) {
        return res.status(400).json({ message: "New password must be different from current password" });
      }

      const user = await storage.getUser(req.params.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify current password (supports legacy plaintext migration)
      let isValid = false;
      if (user.password.startsWith('$2')) {
        isValid = await bcrypt.compare(currentPassword, user.password);
      } else if (user.password === currentPassword) {
        isValid = true;
      }
      if (!isValid) {
        logUserActivity(req, req.params.userId, "password_change", "Failed password change attempt - invalid current password").catch(err => console.error("[Activity Log] Password change failure log failed:", err));
        return res.status(401).json({ message: "Current password is incorrect" });
      }

      const hashed = await bcrypt.hash(newPassword, 12);
      await storage.updateUser(req.params.userId, { password: hashed });

      logUserActivity(req, req.params.userId, "password_change", "Password changed successfully").catch(err => console.error("[Activity Log] Password change log failed:", err));

      return res.json({ success: true, message: "Password changed successfully" });
    } catch (error) {
      console.error("[change-password] error", error);
      return res.status(500).json({ message: "Failed to change password" });
    }
  });

  app.patch("/api/users/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      // SECURITY: Block password updates via generic PATCH — must use /change-password endpoint
      if ('password' in (req.body || {})) {
        return res.status(400).json({ message: "Password cannot be updated via this endpoint. Use /change-password." });
      }
      const user = await storage.updateUser(req.params.userId, req.body);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      // Log profile update activity
      logUserActivity(req, req.params.userId, "profile_update", "User profile was updated").catch(err => console.error("[Activity Log] Profile update log failed:", err));
      return res.json({ user: sanitizeUser(user) });
    } catch (error) {
      return res.status(400).json({ message: "Failed to update user" });
    }
  });
  
  // Delete user account - PROTECTED: requires matching session
  app.delete("/api/users/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const { password } = req.body;
      const userId = req.params.userId;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Verify password before deletion - SECURITY: bcrypt only
      let isValidPassword = false;
      if (user.password.startsWith('$2')) {
        isValidPassword = await bcrypt.compare(password, user.password);
      }
      // Legacy plaintext passwords no longer accepted for security-critical operations
      
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid password" });
      }
      
      // Create audit log before deletion
      await storage.createAuditLog({
        entityType: "user",
        entityId: userId,
        actionType: "delete",
        actor: userId,
        actorRole: "user",
        details: `User ${user.email} deleted their account`,
      });
      
      // Delete the user
      const deleted = await storage.deleteUser(userId);
      if (!deleted) {
        return res.status(500).json({ message: "Failed to delete account" });
      }
      
      // Destroy session after account deletion
      req.session.destroy(() => {});
      
      return res.json({ message: "Account deleted successfully" });
    } catch (error) {
      console.error("Account deletion error:", error);
      return res.status(500).json({ message: "Failed to delete account" });
    }
  });
  
  // ============================================================================
  // ACCOUNT DELETION REQUESTS (30-day grace period with admin approval)
  // ============================================================================
  
  // Submit account deletion request
  app.post("/api/account-deletion-request", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const { reason, additionalComments, password } = req.body;
      const userId = req.session.userId;
      
      // Validate required fields
      if (!reason || reason.trim().length < 10) {
        return res.status(400).json({ message: "Please provide a reason (minimum 10 characters)" });
      }
      
      if (!password) {
        return res.status(400).json({ message: "Password is required to confirm deletion request" });
      }
      
      // Verify user exists and password is correct
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      let isValidPassword = false;
      if (user.password.startsWith('$2')) {
        isValidPassword = await bcrypt.compare(password, user.password);
      }
      
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid password" });
      }
      
      // Check for existing pending request
      const existingRequest = await storage.getAccountDeletionRequestByUser(userId);
      if (existingRequest) {
        return res.status(400).json({ 
          message: "You already have a pending deletion request",
          request: existingRequest
        });
      }
      
      // Calculate scheduled deletion date (30 days from now)
      const scheduledDeletionDate = new Date();
      scheduledDeletionDate.setDate(scheduledDeletionDate.getDate() + 30);
      
      // Create deletion request
      const deletionRequest = await storage.createAccountDeletionRequest({
        userId,
        reason: reason.trim(),
        additionalComments: additionalComments?.trim() || null,
        status: 'Pending',
        scheduledDeletionDate,
      });
      
      // Create audit log
      await storage.createAuditLog({
        entityType: "account_deletion_request",
        entityId: deletionRequest.id,
        actionType: "create",
        actor: userId,
        actorRole: "user",
        details: `User ${user.email} submitted account deletion request`,
      });
      
      // Send confirmation email
      try {
        await sendEmailDirect(
          user.email,
          "Account Deletion Request Received",
          `<h2>Account Deletion Request Received</h2>
           <p>Dear ${user.firstName},</p>
           <p>We have received your request to delete your Finatrades account.</p>
           <p><strong>Scheduled Deletion Date:</strong> ${scheduledDeletionDate.toLocaleDateString()}</p>
           <p>Your request is now pending admin review. You have 30 days to cancel this request if you change your mind.</p>
           <p>If you did not make this request, please contact our support team immediately.</p>
           <p>Best regards,<br>The Finatrades Team</p>`
        );
      } catch (emailError) {
        console.error("Failed to send deletion request email:", emailError);
      }
      
      return res.status(201).json({ 
        message: "Deletion request submitted successfully",
        request: deletionRequest 
      });
    } catch (error) {
      console.error("Account deletion request error:", error);
      return res.status(500).json({ message: "Failed to submit deletion request" });
    }
  });
  
  // Get user's current deletion request
  app.get("/api/account-deletion-request", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const request = await storage.getAccountDeletionRequestByUser(req.session.userId);
      return res.json({ request: request || null });
    } catch (error) {
      console.error("Get deletion request error:", error);
      return res.status(500).json({ message: "Failed to get deletion request" });
    }
  });
  
  // Cancel deletion request (user can cancel within 30 days)
  app.post("/api/account-deletion-request/cancel", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const request = await storage.getAccountDeletionRequestByUser(req.session.userId);
      if (!request) {
        return res.status(404).json({ message: "No pending deletion request found" });
      }
      
      if (request.status !== 'Pending' && request.status !== 'Approved') {
        return res.status(400).json({ message: "This request cannot be cancelled" });
      }
      
      // Update request status to Cancelled
      const updated = await storage.updateAccountDeletionRequest(request.id, {
        status: 'Cancelled',
        cancelledAt: new Date(),
      });
      
      // Create audit log
      await storage.createAuditLog({
        entityType: "account_deletion_request",
        entityId: request.id,
        actionType: "cancel",
        actor: req.session.userId,
        actorRole: "user",
        details: "User cancelled account deletion request",
      });
      
      return res.json({ message: "Deletion request cancelled", request: updated });
    } catch (error) {
      console.error("Cancel deletion request error:", error);
      return res.status(500).json({ message: "Failed to cancel deletion request" });
    }
  });
  
  // Admin: Get all deletion requests
  app.get("/api/admin/account-deletion-requests", ensureAdminAsync, requirePermission('view_users', 'manage_users'), async (req, res) => {
    try {
      const requests = await storage.getAllAccountDeletionRequests();
      
      // Enrich with user data
      const enrichedRequests = await Promise.all(
        requests.map(async (request) => {
          const user = await storage.getUser(request.userId);
          const reviewer = request.reviewedBy ? await storage.getUser(request.reviewedBy) : null;
          return {
            ...request,
            user: user ? { 
              id: user.id, 
              email: user.email, 
              firstName: user.firstName, 
              lastName: user.lastName 
            } : null,
            reviewer: reviewer ? { 
              id: reviewer.id, 
              email: reviewer.email,
              firstName: reviewer.firstName, 
              lastName: reviewer.lastName 
            } : null,
          };
        })
      );
      
      return res.json({ requests: enrichedRequests });
    } catch (error) {
      console.error("Admin get deletion requests error:", error);
      return res.status(500).json({ message: "Failed to get deletion requests" });
    }
  });
  
  // Admin: Review deletion request (approve/reject)
  app.post("/api/admin/account-deletion-requests/:id/review", ensureAdminAsync, requirePermission('manage_users'), async (req, res) => {
    try {
      const { action, reviewNotes } = req.body;
      const requestId = req.params.id;
      const adminId = req.session.userId!;
      
      if (!['approve', 'reject'].includes(action)) {
        return res.status(400).json({ message: "Invalid action. Must be 'approve' or 'reject'" });
      }
      
      const request = await storage.getAccountDeletionRequest(requestId);
      if (!request) {
        return res.status(404).json({ message: "Deletion request not found" });
      }
      
      if (request.status !== 'Pending') {
        return res.status(400).json({ message: "This request has already been reviewed" });
      }
      
      const newStatus = action === 'approve' ? 'Approved' : 'Rejected';
      
      const updated = await storage.updateAccountDeletionRequest(requestId, {
        status: newStatus,
        reviewedBy: adminId,
        reviewedAt: new Date(),
        reviewNotes: reviewNotes?.trim() || null,
      });
      
      // Get user for email
      const user = await storage.getUser(request.userId);
      
      // Create audit log
      await storage.createAuditLog({
        entityType: "account_deletion_request",
        entityId: requestId,
        actionType: action,
        actor: adminId,
        actorRole: "admin",
        details: `Admin ${action}d account deletion request for user ${user?.email || request.userId}`,
      });
      
      // Send email notification to user
      if (user) {
        try {
          const emailContent = action === 'approve'
            ? `<h2>Account Deletion Request Approved</h2>
               <p>Dear ${user.firstName},</p>
               <p>Your account deletion request has been approved.</p>
               <p><strong>Scheduled Deletion Date:</strong> ${request.scheduledDeletionDate.toLocaleDateString()}</p>
               <p>Your account will be permanently deleted on this date unless you cancel the request before then.</p>
               ${reviewNotes ? `<p><strong>Admin Notes:</strong> ${reviewNotes}</p>` : ''}
               <p>Best regards,<br>The Finatrades Team</p>`
            : `<h2>Account Deletion Request Rejected</h2>
               <p>Dear ${user.firstName},</p>
               <p>Your account deletion request has been reviewed and rejected.</p>
               ${reviewNotes ? `<p><strong>Reason:</strong> ${reviewNotes}</p>` : ''}
               <p>If you have any questions, please contact our support team.</p>
               <p>Best regards,<br>The Finatrades Team</p>`;
          
          await sendEmailDirect(
            user.email,
            `Account Deletion Request ${action === 'approve' ? 'Approved' : 'Rejected'}`,
            emailContent
          );
        } catch (emailError) {
          console.error("Failed to send review notification email:", emailError);
        }
      }
      
      return res.json({ 
        message: `Deletion request ${action}d successfully`, 
        request: updated 
      });
    } catch (error) {
      console.error("Admin review deletion request error:", error);
      return res.status(500).json({ message: "Failed to review deletion request" });
    }
  });
  
  // Admin: Execute approved deletion (only for approved requests past scheduled date)
  app.post("/api/admin/account-deletion-requests/:id/execute", ensureAdminAsync, requirePermission('manage_users'), async (req, res) => {
    try {
      const requestId = req.params.id;
      const adminId = req.session.userId!;
      
      const request = await storage.getAccountDeletionRequest(requestId);
      if (!request) {
        return res.status(404).json({ message: "Deletion request not found" });
      }
      
      if (request.status !== 'Approved') {
        return res.status(400).json({ message: "Only approved requests can be executed" });
      }
      
      // Check if scheduled date has passed
      if (new Date() < new Date(request.scheduledDeletionDate)) {
        return res.status(400).json({ 
          message: "Cannot execute before scheduled deletion date",
          scheduledDate: request.scheduledDeletionDate
        });
      }
      
      const user = await storage.getUser(request.userId);
      
      // Delete the user account
      const deleted = await storage.deleteUser(request.userId);
      if (!deleted) {
        return res.status(500).json({ message: "Failed to delete user account" });
      }
      
      // Update request status
      await storage.updateAccountDeletionRequest(requestId, {
        status: 'Completed',
        completedAt: new Date(),
      });
      
      // Create audit log
      await storage.createAuditLog({
        entityType: "account_deletion_request",
        entityId: requestId,
        actionType: "execute",
        actor: adminId,
        actorRole: "admin",
        details: `Admin executed account deletion for user ${user?.email || request.userId}`,
      });
      
      return res.json({ message: "Account deleted successfully" });
    } catch (error) {
      console.error("Execute deletion request error:", error);
      return res.status(500).json({ message: "Failed to execute deletion request" });
    }
  });

  // Logout - destroy session
  app.post("/api/auth/logout", (req, res) => {
    const userId = req.session?.userId;
    
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Logout failed" });
      }
      
      // Clear cookie
      res.clearCookie('connect.sid');
      
      // Create audit log if we had a session
      if (userId) {
        storage.createAuditLog({
          entityType: "user",
          entityId: userId,
          actionType: "logout",
          actor: userId,
          actorRole: "user",
          details: "User logged out",
        }).catch(err => console.error("Audit log error:", err));
      }
        
        // Log logout activity
        if (userId) logUserActivity({ headers: req.headers, ip: req.ip, socket: req.socket } as Request, userId, "logout", "User logged out").catch(err => console.error("[Activity Log] Logout log failed:", err));
      
      return res.json({ message: "Logged out successfully" });
    });
  });
  
  // ============================================================================
  // PASSWORD RESET
  // ============================================================================
  
  // Request password reset (rate limited)
  app.post("/api/auth/forgot-password", passwordResetRateLimiter, async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      const user = await storage.getUserByEmail(email);
      
      // Always return success to prevent email enumeration attacks
      if (!user) {
        return res.json({ message: "If an account with that email exists, we've sent password reset instructions." });
      }
      
      // Generate a cryptographically secure token (SECURITY FIX: replaced Math.random())
      const token = generateSecureToken(48);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry
      
      // Store the token
      await storage.createPasswordResetToken({
        userId: user.id,
        token,
        expiresAt,
        used: false,
      });
      
      // Send reset email
      const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
      const resetUrl = `${baseUrl}/reset-password?token=${token}`;
      
      try {
        await sendEmailDirect(
          user.email,
          "Reset Your Password - Finatrades",
          `
            <h2>Password Reset Request</h2>
            <p>Hello ${user.firstName},</p>
            <p>We received a request to reset your password. Click the link below to set a new password:</p>
            <p><a href="${resetUrl}" style="background: linear-gradient(to right, #f97316, #ea580c); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Reset Password</a></p>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request this, you can safely ignore this email.</p>
            <br/>
            <p>Best regards,<br/>The Finatrades Team</p>
          `
        );
      } catch (emailError) {
        console.log("Email sending not configured - reset URL:", resetUrl);
      }
      
      // Log the audit
      await storage.createAuditLog({
        entityType: "user",
        entityId: user.id,
        actionType: "update",
        actor: user.id,
        actorRole: "user",
        details: "Password reset requested",
      });
      
      return res.json({ message: "If an account with that email exists, we've sent password reset instructions." });
    } catch (error) {
      console.error("Password reset request error:", error);
      return res.status(500).json({ message: "Failed to process password reset request" });
    }
  });
  
  // Reset password with token (rate limited)
  app.post("/api/auth/reset-password", passwordResetRateLimiter, async (req, res) => {
    try {
      const { token, password } = req.body;
      
      if (!token || !password) {
        return res.status(400).json({ message: "Token and password are required" });
      }
      
      if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }
      
      // Find the token
      const resetToken = await storage.getPasswordResetToken(token);
      
      if (!resetToken) {
        return res.status(400).json({ message: "Invalid or expired reset link" });
      }
      
      if (resetToken.used) {
        return res.status(400).json({ message: "This reset link has already been used" });
      }
      
      if (new Date() > resetToken.expiresAt) {
        return res.status(400).json({ message: "This reset link has expired. Please request a new one." });
      }
      
      // Hash the new password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Update the user's password
      await storage.updateUser(resetToken.userId, { password: hashedPassword });
      
      // Mark token as used
      await storage.markPasswordResetTokenUsed(resetToken.id);
      
      // Log the audit
      await storage.createAuditLog({
        entityType: "user",
        entityId: resetToken.userId,
        actionType: "update",
        actor: resetToken.userId,
        actorRole: "user",
        details: "Password reset completed",
      });
      
      // Create bell notification for password change
      await storage.createNotification({
        userId: resetToken.userId,
        title: 'Password Changed',
        message: 'Your password has been successfully reset. If you did not make this change, please contact support immediately.',
        type: 'warning',
        link: '/security',
      });
      
      // Send password changed email
      const user = await storage.getUser(resetToken.userId);
      if (user?.email) {
        sendEmail(user.email, EMAIL_TEMPLATES.PASSWORD_CHANGED, {
          user_name: `${user.firstName} ${user.lastName}`,
          change_time: new Date().toISOString(),
        }).catch(err => console.error('[Email] Password changed notification failed:', err));
      }
      
      // Log password change activity
      logUserActivity({ headers: req.headers, ip: req.ip, socket: req.socket } as Request, resetToken.userId, "password_change", "Password was reset via forgot password flow").catch(err => console.error("[Activity Log] Password change log failed:", err));

      return res.json({ message: "Password has been reset successfully" });
    } catch (error) {
      console.error("Password reset error:", error);
      return res.status(500).json({ message: "Failed to reset password" });
    }
  });
  

  // ============================================================================
  // Custom Finatrades ID System
  // ============================================================================

  // Check if a custom Finatrades ID is available
  app.post("/api/finatrades-id/check-availability", ensureAuthenticated, async (req, res) => {
    try {
      const { customId } = req.body;
      
      if (!customId || typeof customId !== 'string') {
        return res.status(400).json({ message: "Custom ID is required" });
      }
      
      const normalizedId = customId.toUpperCase().startsWith('FT-') 
        ? customId.toUpperCase() 
        : `FT-${customId.toUpperCase()}`;
      
      const idPart = normalizedId.replace('FT-', '');
      if (idPart.length < 4 || idPart.length > 15) {
        return res.status(400).json({ available: false, message: "ID must be 4-15 characters long" });
      }
      
      if (!/^[A-Z0-9]+$/.test(idPart)) {
        return res.status(400).json({ available: false, message: "ID can only contain letters and numbers" });
      }
      
      const reservedWords = ['ADMIN', 'FINATRADES', 'SYSTEM', 'SUPPORT', 'HELP', 'TEST', 'NULL', 'UNDEFINED'];
      if (reservedWords.some(word => idPart.includes(word))) {
        return res.status(400).json({ available: false, message: "This ID contains reserved words" });
      }
      
      const existingUser = await pool.query(
        'SELECT id FROM users WHERE UPPER(custom_finatrades_id) = $1 OR UPPER(finatrades_id) = $1',
        [normalizedId]
      );
      
      if (existingUser.rows.length > 0) {
        return res.json({ available: false, message: "This ID is already taken" });
      }
      
      return res.json({ available: true, normalizedId, message: "This ID is available!" });
    } catch (error) {
      console.error("Check Finatrades ID availability error:", error);
      return res.status(500).json({ message: "Failed to check availability" });
    }
  });

  // Set or update custom Finatrades ID
  app.post("/api/finatrades-id/set", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { customId } = req.body;
      
      if (!customId || typeof customId !== 'string') {
        return res.status(400).json({ message: "Custom ID is required" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (user.customFinatradesIdChangedAt) {
        const daysSinceChange = Math.floor(
          (Date.now() - new Date(user.customFinatradesIdChangedAt).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceChange < 30) {
          return res.status(400).json({ message: `You can change your Finatrades ID again in ${30 - daysSinceChange} days` });
        }
      }
      
      const normalizedId = customId.toUpperCase().startsWith('FT-') 
        ? customId.toUpperCase() 
        : `FT-${customId.toUpperCase()}`;
      
      const idPart = normalizedId.replace('FT-', '');
      if (idPart.length < 4 || idPart.length > 15) {
        return res.status(400).json({ message: "ID must be 4-15 characters long" });
      }
      
      if (!/^[A-Z0-9]+$/.test(idPart)) {
        return res.status(400).json({ message: "ID can only contain letters and numbers" });
      }
      
      const reservedWords = ['ADMIN', 'FINATRADES', 'SYSTEM', 'SUPPORT', 'HELP', 'TEST', 'NULL', 'UNDEFINED'];
      if (reservedWords.some(word => idPart.includes(word))) {
        return res.status(400).json({ message: "This ID contains reserved words" });
      }
      
      const existingUser = await pool.query(
        'SELECT id FROM users WHERE (UPPER(custom_finatrades_id) = $1 OR UPPER(finatrades_id) = $1) AND id != $2',
        [normalizedId, userId]
      );
      
      if (existingUser.rows.length > 0) {
        return res.status(400).json({ message: "This ID is already taken" });
      }
      
      await pool.query(
        'UPDATE users SET custom_finatrades_id = $1, custom_finatrades_id_changed_at = NOW(), updated_at = NOW() WHERE id = $2',
        [normalizedId, userId]
      );
      
      await storage.createAuditLog({
        entityType: "user",
        entityId: userId,
        actionType: "update",
        actor: userId,
        actorRole: "user",
        details: `Custom Finatrades ID set to ${normalizedId}`,
      });
      
      return res.json({ success: true, customFinatradesId: normalizedId, message: "Your Finatrades ID has been updated!" });
    } catch (error) {
      console.error("Set Finatrades ID error:", error);
      return res.status(500).json({ message: "Failed to set Finatrades ID" });
    }
  });

  // Get current user's Finatrades ID info
  app.get("/api/finatrades-id/info", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      
      const result = await pool.query(
        'SELECT finatrades_id, custom_finatrades_id, custom_finatrades_id_changed_at FROM users WHERE id = $1',
        [userId]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const user = result.rows[0];
      const displayId = user.custom_finatrades_id || user.finatrades_id;
      
      let canChangeIn = 0;
      if (user.custom_finatrades_id_changed_at) {
        const daysSinceChange = Math.floor(
          (Date.now() - new Date(user.custom_finatrades_id_changed_at).getTime()) / (1000 * 60 * 60 * 24)
        );
        canChangeIn = Math.max(0, 30 - daysSinceChange);
      }
      
      return res.json({
        finatradesId: user.finatrades_id,
        customFinatradesId: user.custom_finatrades_id,
        displayId,
        canChange: canChangeIn === 0,
        canChangeIn,
      });
    } catch (error) {
      console.error("Get Finatrades ID info error:", error);
      return res.status(500).json({ message: "Failed to get Finatrades ID info" });
    }
  });

  // Finatrades ID Login - Step 1: Request OTP
  app.post("/api/auth/finatrades-id-login", otpRateLimiter, async (req, res) => {
    try {
      const { finatradesId } = req.body;
      
      if (!finatradesId || typeof finatradesId !== 'string') {
        return res.status(400).json({ message: "Finatrades ID is required" });
      }
      
      const normalizedId = finatradesId.toUpperCase().startsWith('FT-') 
        ? finatradesId.toUpperCase() 
        : `FT-${finatradesId.toUpperCase()}`;
      
      const result = await pool.query(
        'SELECT id, email, first_name, is_email_verified, finatrades_id_otp_attempts FROM users WHERE UPPER(custom_finatrades_id) = $1 OR UPPER(finatrades_id) = $1',
        [normalizedId]
      );
      
      if (result.rows.length === 0) {
        return res.json({ success: true, message: "If this Finatrades ID exists, an OTP has been sent" });
      }
      
      const user = result.rows[0];
      
      if (!user.is_email_verified) {
        return res.status(403).json({ message: "Email not verified. Please login with email first.", requiresEmailVerification: true });
      }
      
      if (user.finatrades_id_otp_attempts >= 5) {
        const lockResult = await pool.query('SELECT finatrades_id_otp_expiry FROM users WHERE id = $1', [user.id]);
        if (lockResult.rows[0]?.finatrades_id_otp_expiry && new Date(lockResult.rows[0].finatrades_id_otp_expiry) > new Date()) {
          return res.status(429).json({ message: "Too many attempts. Please try again later." });
        }
        await pool.query('UPDATE users SET finatrades_id_otp_attempts = 0 WHERE id = $1', [user.id]);
      }
      
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiry = new Date(Date.now() + 5 * 60 * 1000);
      
      await pool.query(
        'UPDATE users SET finatrades_id_otp = $1, finatrades_id_otp_expiry = $2, finatrades_id_otp_attempts = 0 WHERE id = $3',
        [otp, expiry, user.id]
      );
      
      const maskedEmail = user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3');
      
      sendEmail(user.email, EMAIL_TEMPLATES.FINATRADES_ID_LOGIN_OTP, { otp_code: otp })
        .catch(err => console.error('[Email] Finatrades ID login OTP failed:', err));
      
      return res.json({ success: true, maskedEmail, message: `OTP sent to ${maskedEmail}` });
    } catch (error) {
      console.error("Finatrades ID login error:", error);
      return res.status(500).json({ message: "Failed to send OTP" });
    }
  });

  // Finatrades ID Login - Step 2: Verify OTP
  app.post("/api/auth/finatrades-id-verify", otpRateLimiter, async (req, res) => {
    try {
      const { finatradesId, otp } = req.body;
      
      if (!finatradesId || !otp) {
        return res.status(400).json({ message: "Finatrades ID and OTP are required" });
      }
      
      const normalizedId = finatradesId.toUpperCase().startsWith('FT-') 
        ? finatradesId.toUpperCase() 
        : `FT-${finatradesId.toUpperCase()}`;
      
      const result = await pool.query(
        'SELECT id, email, first_name, last_name, role, finatrades_id_otp, finatrades_id_otp_expiry, finatrades_id_otp_attempts FROM users WHERE UPPER(custom_finatrades_id) = $1 OR UPPER(finatrades_id) = $1',
        [normalizedId]
      );
      
      if (result.rows.length === 0) {
        return res.status(401).json({ message: "Invalid Finatrades ID or OTP" });
      }
      
      const user = result.rows[0];
      
      if (user.finatrades_id_otp_attempts >= 3) {
        await pool.query('UPDATE users SET finatrades_id_otp = NULL, finatrades_id_otp_expiry = NULL WHERE id = $1', [user.id]);
        return res.status(429).json({ message: "Too many attempts. Please request a new OTP." });
      }
      
      if (!user.finatrades_id_otp || !user.finatrades_id_otp_expiry) {
        return res.status(400).json({ message: "No OTP requested. Please request a new one." });
      }
      
      if (new Date() > new Date(user.finatrades_id_otp_expiry)) {
        return res.status(400).json({ message: "OTP has expired. Please request a new one." });
      }
      
      if (user.finatrades_id_otp !== otp) {
        await pool.query('UPDATE users SET finatrades_id_otp_attempts = finatrades_id_otp_attempts + 1 WHERE id = $1', [user.id]);
        const attemptsLeft = 3 - (user.finatrades_id_otp_attempts + 1);
        return res.status(401).json({ message: `Invalid OTP. ${attemptsLeft} attempts remaining.` });
      }
      
      await pool.query(
        'UPDATE users SET finatrades_id_otp = NULL, finatrades_id_otp_expiry = NULL, finatrades_id_otp_attempts = 0, last_login_at = NOW() WHERE id = $1',
        [user.id]
      );
      
      const fullUser = await storage.getUser(user.id);
      if (!fullUser) {
        return res.status(500).json({ message: "Failed to create session" });
      }
      
      req.session.regenerate((err) => {
        if (err) {
          console.error("Session regeneration error:", err);
          return res.status(500).json({ message: "Failed to create session" });
        }
        
        req.session.userId = user.id;
        
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("Session save error:", saveErr);
            return res.status(500).json({ message: "Failed to save session" });
          }
          
          logUserActivity(req, user.id, "login", "Logged in via Finatrades ID + OTP")
            .catch(err => console.error("[Activity Log] Finatrades ID login failed:", err));
          
          return res.json({ success: true, user: sanitizeUser(fullUser), message: "Login successful!" });
        });
        return undefined;
      });
      return undefined;
    } catch (error) {
      console.error("Finatrades ID OTP verify error:", error);
      return res.status(500).json({ message: "Failed to verify OTP" });
    }
  });


  // ===========================================================================
  // ============================================================================
  // MFA (Multi-Factor Authentication)
  // ============================================================================
  
  // Generate MFA setup (TOTP secret and QR code)
  app.post("/api/mfa/setup", ensureAuthenticated, async (req, res) => {
    try {
      const { userId } = req.body;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Generate a new secret
      const secret = authenticator.generateSecret();
      
      // Create otpauth URL for QR code
      const otpauthUrl = authenticator.keyuri(user.email, "Finatrades", secret);
      
      // Generate QR code as data URL
      const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
      
      // Store secret temporarily (not enabled yet until verified)
      await storage.updateUser(userId, { mfaSecret: secret });
      
      return res.json({ 
        secret, 
        qrCode: qrCodeDataUrl,
        message: "Scan the QR code with your authenticator app, then verify with a code"
      });
    } catch (error) {
      console.error("MFA setup error:", error);
      return res.status(400).json({ message: "Failed to setup MFA" });
    }
  });
  
  // Verify and enable MFA
  app.post("/api/mfa/enable", ensureAuthenticated, async (req, res) => {
    try {
      const { userId, token } = req.body;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (!user.mfaSecret) {
        return res.status(400).json({ message: "MFA not set up. Please run setup first." });
      }
      
      // Verify the token
      const isValid = authenticator.verify({ token, secret: user.mfaSecret });
      
      if (!isValid) {
        return res.status(400).json({ message: "Invalid verification code" });
      }
      
      // Generate cryptographically secure backup codes (SECURITY FIX: replaced Math.random())
      const backupCodes = Array.from({ length: 8 }, () => 
        crypto.randomBytes(4).toString('hex').toUpperCase()
      );
      
      // Hash backup codes for storage
      const hashedBackupCodes = await Promise.all(
        backupCodes.map(code => bcrypt.hash(code, 10))
      );
      
      // Enable MFA
      await storage.updateUser(userId, { 
        mfaEnabled: true, 
        mfaMethod: 'totp',
        mfaBackupCodes: JSON.stringify(hashedBackupCodes)
      });
      
      // Create audit log
      await storage.createAuditLog({
        entityType: "user",
        entityId: userId,
        actionType: "update",
        actor: userId,
        actorRole: "user",
        details: "MFA enabled via authenticator app",
      });
      
      // Create bell notification for MFA enabled
      await storage.createNotification({
        userId: userId,
        title: 'Two-Factor Authentication Enabled',
        message: 'Your account is now protected with two-factor authentication. Save your backup codes in a secure location.',
        type: 'success',
        link: '/security',
      });
      
      // Send MFA enabled email
      sendEmail(user.email, EMAIL_TEMPLATES.MFA_ENABLED, {
        user_name: `${user.firstName} ${user.lastName}`,
        enabled_time: new Date().toISOString(),
      }).catch(err => console.error('[Email] MFA enabled notification failed:', err));
      
      return res.json({ 
        success: true, 
        message: "MFA enabled successfully",
        backupCodes // Return plain backup codes once for user to save
      });
    } catch (error) {
      console.error("MFA enable error:", error);
      return res.status(400).json({ message: "Failed to enable MFA" });
    }
  });
  
  // Bootstrap 2FA setup for users who need to set up MFA to login (when require2fa is enabled)
  // This endpoint uses setupToken from login response instead of authenticated session
  app.post("/api/mfa/bootstrap-setup", async (req, res) => {
    try {
      const { setupToken } = req.body;
      
      // Validate setup token
      const challenge = mfaChallenges.get(setupToken);
      if (!challenge || !challenge.setupRequired) {
        return res.status(401).json({ message: "Invalid or expired setup token. Please login again." });
      }
      
      // Check if token is expired
      if (challenge.expiresAt < new Date()) {
        mfaChallenges.delete(setupToken);
        return res.status(401).json({ message: "Setup session expired. Please login again." });
      }
      
      const user = await storage.getUser(challenge.userId);
      if (!user) {
        mfaChallenges.delete(setupToken);
        return res.status(404).json({ message: "User not found" });
      }
      
      // Generate a new TOTP secret
      const secret = authenticator.generateSecret();
      
      // Create otpauth URL for QR code
      const otpauthUrl = authenticator.keyuri(user.email, "Finatrades", secret);
      
      // Generate QR code as data URL
      const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
      
      // Store secret temporarily (not enabled yet until verified)
      await storage.updateUser(user.id, { mfaSecret: secret });
      
        return res.json({
        secret,
        qrCode: qrCodeDataUrl,
        message: "Scan the QR code with your authenticator app, then verify with a code"
      });
    } catch (error) {
      console.error("MFA bootstrap setup error:", error);
      return res.status(400).json({ message: "Failed to setup MFA" });
    }
  });
  
  // Complete 2FA bootstrap - verify token and complete login
  app.post("/api/mfa/bootstrap-complete", async (req, res) => {
    try {
      const { setupToken, token } = req.body;
      
      // Validate setup token
      const challenge = mfaChallenges.get(setupToken);
      if (!challenge || !challenge.setupRequired) {
        return res.status(401).json({ message: "Invalid or expired setup token. Please login again." });
      }
      
      // Check if token is expired
      if (challenge.expiresAt < new Date()) {
        mfaChallenges.delete(setupToken);
        return res.status(401).json({ message: "Setup session expired. Please login again." });
      }
      
      // Rate limiting: max 5 attempts
      if (challenge.attempts >= 5) {
        mfaChallenges.delete(setupToken);
        return res.status(429).json({ message: "Too many failed attempts. Please login again." });
      }
      
      const user = await storage.getUser(challenge.userId);
      if (!user) {
        mfaChallenges.delete(setupToken);
        return res.status(404).json({ message: "User not found" });
      }
      
      if (!user.mfaSecret) {
        return res.status(400).json({ message: "MFA not set up. Please run setup first." });
      }
      
      // Verify the TOTP token
      const isValid = authenticator.verify({ token, secret: user.mfaSecret });
      
      if (!isValid) {
        challenge.attempts++;
        mfaChallenges.set(setupToken, challenge);
        return res.status(400).json({ message: "Invalid verification code" });
      }
      
      // Generate backup codes
      const backupCodes = Array.from({ length: 8 }, () =>
        crypto.randomBytes(4).toString('hex').toUpperCase()
      );
      
      const hashedBackupCodes = await Promise.all(
        backupCodes.map(code => bcrypt.hash(code, 10))
      );
      
      // Enable MFA for the user
      await storage.updateUser(user.id, {
        mfaEnabled: true,
        mfaMethod: 'totp',
        mfaBackupCodes: JSON.stringify(hashedBackupCodes),
        lastLoginAt: new Date()
      });
      
      // Clean up the challenge
      mfaChallenges.delete(setupToken);
      
      // Create audit log
      await storage.createAuditLog({
        entityType: "user",
        entityId: user.id,
        actionType: "update",
        actor: user.id,
        actorRole: user.role,
        details: "MFA enabled via required setup during login"
      });
      
      // SECURITY: Regenerate session to prevent session fixation attacks
      await new Promise<void>((resolve, reject) => {
        req.session.regenerate((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      
      // Create session
      req.session.userId = user.id;
      req.session.userRole = user.role;
      req.session.adminPortal = challenge.adminPortal || false;
      
      // Save session explicitly
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      
      const updatedUser = await storage.getUser(user.id);
      
        return res.json({
        success: true,
        message: "MFA enabled successfully. You are now logged in.",
        backupCodes,
        user: sanitizeUser(updatedUser || user),
        adminPortal: challenge.adminPortal || false
      });
    } catch (error) {
      console.error("MFA bootstrap complete error:", error);
      return res.status(400).json({ message: "Failed to complete MFA setup" });
    }
  });
  
  // Verify MFA token during login (requires challenge token from login step)
  app.post("/api/mfa/verify", async (req, res) => {
    try {
      const { challengeToken, token } = req.body;
      
      // Validate challenge token
      const challenge = mfaChallenges.get(challengeToken);
      if (!challenge) {
        return res.status(401).json({ message: "Invalid or expired challenge. Please login again." });
      }
      
      // Check if challenge is expired
      if (challenge.expiresAt < new Date()) {
        mfaChallenges.delete(challengeToken);
        return res.status(401).json({ message: "Challenge expired. Please login again." });
      }
      
      // Rate limiting: max 5 attempts per challenge
      if (challenge.attempts >= 5) {
        mfaChallenges.delete(challengeToken);
        return res.status(429).json({ message: "Too many failed attempts. Please login again." });
      }
      
      const user = await storage.getUser(challenge.userId);
      
      if (!user) {
        mfaChallenges.delete(challengeToken);
        return res.status(404).json({ message: "User not found" });
      }
      
      if (!user.mfaEnabled || !user.mfaSecret) {
        mfaChallenges.delete(challengeToken);
        return res.status(400).json({ message: "MFA not enabled for this user" });
      }
      
      // First try TOTP verification
      const isValid = authenticator.verify({ token, secret: user.mfaSecret });
      
      if (isValid) {
        // Capture adminPortal flag before deleting challenge
        const adminPortal = challenge.adminPortal || false;
        
        // Delete challenge after successful verification
        mfaChallenges.delete(challengeToken);
        
        // SECURITY: Regenerate session to prevent session fixation attacks
        await new Promise<void>((resolve, reject) => {
          req.session.regenerate((err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        
        // Set session for authenticated user (SECURITY-CRITICAL)
        req.session.userId = user.id;
        req.session.userRole = user.role;
        req.session.adminPortal = adminPortal;
        
        // CRITICAL: Explicitly save session to ensure adminPortal flag persists
        await new Promise<void>((resolve, reject) => {
          req.session.save((err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        
        return res.json({ success: true, user: sanitizeUser(user), adminPortal });
      }
      
      // Try backup codes
      if (user.mfaBackupCodes) {
        const backupCodes: string[] = JSON.parse(user.mfaBackupCodes);
        
        for (let i = 0; i < backupCodes.length; i++) {
          const isBackupValid = await bcrypt.compare(token.toUpperCase(), backupCodes[i]);
          if (isBackupValid) {
            // Capture adminPortal flag before deleting challenge
            const adminPortal = challenge.adminPortal || false;
            
            // Remove used backup code
            backupCodes.splice(i, 1);
            await storage.updateUser(challenge.userId, { 
              mfaBackupCodes: JSON.stringify(backupCodes) 
            });
            
            // Delete challenge after successful verification
            mfaChallenges.delete(challengeToken);
            
            // SECURITY: Regenerate session to prevent session fixation attacks
            await new Promise<void>((resolve, reject) => {
              req.session.regenerate((err) => {
                if (err) reject(err);
                else resolve();
              });
            });
            
            // Set session for authenticated user (SECURITY-CRITICAL)
            req.session.userId = user.id;
            req.session.userRole = user.role;
            req.session.adminPortal = adminPortal;
            
            // CRITICAL: Explicitly save session to ensure adminPortal flag persists
            await new Promise<void>((resolve, reject) => {
              req.session.save((err) => {
                if (err) reject(err);
                else resolve();
              });
            });
            
            return res.json({ 
              success: true, 
              user: sanitizeUser(user),
              adminPortal,
              message: "Backup code used. " + backupCodes.length + " codes remaining."
            });
          }
        }
      }
      
      // Increment attempt counter on failure
      challenge.attempts += 1;
      
      return res.status(400).json({ message: "Invalid verification code" });
    } catch (error) {
      console.error("MFA verify error:", error);
      return res.status(400).json({ message: "Failed to verify MFA" });
    }
  });
  
  // Disable MFA
  app.post("/api/mfa/disable", ensureAuthenticated, async (req, res) => {
    try {
      const { userId, password } = req.body;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Verify password before disabling MFA - SECURITY: bcrypt only
      let isValidPassword = false;
      if (user.password.startsWith('$2')) {
        isValidPassword = await bcrypt.compare(password, user.password);
      }
      // Legacy plaintext passwords no longer accepted
      
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid password" });
      }
      
      // Disable MFA
      await storage.updateUser(userId, { 
        mfaEnabled: false, 
        mfaMethod: null,
        mfaSecret: null,
        mfaBackupCodes: null
      });
      
      // Create audit log
      await storage.createAuditLog({
        entityType: "user",
        entityId: userId,
        actionType: "update",
        actor: userId,
        actorRole: "user",
        details: "MFA disabled",
      });
      
      return res.json({ success: true, message: "MFA disabled successfully" });
    } catch (error) {
      console.error("MFA disable error:", error);
      return res.status(400).json({ message: "Failed to disable MFA" });
    }
  });
  
  // Get MFA status
  app.get("/api/mfa/status/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const user = await storage.getUser(req.params.userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      return res.json({ 
        mfaEnabled: user.mfaEnabled,
        mfaMethod: user.mfaMethod,
        hasBackupCodes: user.mfaBackupCodes ? JSON.parse(user.mfaBackupCodes).length > 0 : false
      });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get MFA status" });
    }
  });

  // ============================================================================
  // BIOMETRIC AUTHENTICATION
  // ============================================================================
  
  // Enable biometric authentication
  app.post("/api/biometric/enable", ensureAuthenticated, async (req, res) => {
    try {
      const { userId, deviceId, password } = req.body;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Verify password before enabling biometric - SECURITY: bcrypt only
      let isValidPassword = false;
      if (user.password.startsWith('$2')) {
        isValidPassword = await bcrypt.compare(password, user.password);
      }
      // Legacy plaintext passwords no longer accepted
      
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid password" });
      }
      
      // Enable biometric authentication
      await storage.updateUser(userId, { 
        biometricEnabled: true,
        biometricDeviceId: deviceId || `device-${Date.now()}`
      });
      
      // Create audit log
      await storage.createAuditLog({
        entityType: "user",
        entityId: userId,
        actionType: "update",
        actor: userId,
        actorRole: "user",
        details: "Biometric authentication enabled",
      });
      
      return res.json({ 
        success: true, 
        message: "Biometric authentication enabled successfully",
        biometricEnabled: true
      });
    } catch (error) {
      console.error("Biometric enable error:", error);
      return res.status(400).json({ message: "Failed to enable biometric authentication" });
    }
  });

  // Disable biometric authentication
  app.post("/api/biometric/disable", ensureAuthenticated, async (req, res) => {
    try {
      const { userId, password } = req.body;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Verify password before disabling biometric - SECURITY: bcrypt only
      let isValidPassword = false;
      if (user.password.startsWith('$2')) {
        isValidPassword = await bcrypt.compare(password, user.password);
      }
      // Legacy plaintext passwords no longer accepted
      
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid password" });
      }
      
      // Disable biometric authentication
      await storage.updateUser(userId, { 
        biometricEnabled: false,
        biometricDeviceId: null
      });
      
      // Create audit log
      await storage.createAuditLog({
        entityType: "user",
        entityId: userId,
        actionType: "update",
        actor: userId,
        actorRole: "user",
        details: "Biometric authentication disabled",
      });
      
      return res.json({ 
        success: true, 
        message: "Biometric authentication disabled successfully",
        biometricEnabled: false
      });
    } catch (error) {
      console.error("Biometric disable error:", error);
      return res.status(400).json({ message: "Failed to disable biometric authentication" });
    }
  });

  // Get biometric status
  app.get("/api/biometric/status/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const user = await storage.getUser(req.params.userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      return res.json({ 
        biometricEnabled: user.biometricEnabled || false,
        hasDeviceId: !!user.biometricDeviceId
      });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get biometric status" });
    }
  });

  // Biometric login - verify user has biometric enabled and return auth token
  app.post("/api/biometric/login", async (req, res) => {
    try {
      const { email, deviceId } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (!user.biometricEnabled) {
        return res.status(403).json({ message: "Biometric authentication not enabled for this account" });
      }
      
      // Optional: verify device ID matches if stored
      if (user.biometricDeviceId && deviceId && user.biometricDeviceId !== deviceId) {
        return res.status(403).json({ message: "Device not authorized for biometric login" });
      }
      
      // SECURITY: Regenerate session to prevent session fixation attacks
      await new Promise<void>((resolve, reject) => {
        req.session.regenerate((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      
      // Set session
      req.session.userId = user.id;
      req.session.userRole = user.role;
      req.session.adminPortal = false;
      
      // Create audit log
      await storage.createAuditLog({
        entityType: "user",
        entityId: user.id,
        actionType: "login",
        actor: user.id,
        actorRole: user.role,
        details: "Logged in via biometric authentication",
      });
      
      // Return user without password
      const { password: _, ...safeUser } = user;
      return res.json({ 
        success: true, 
        user: safeUser,
        message: "Biometric login successful"
      });
    } catch (error) {
      console.error("Biometric login error:", error);
      return res.status(400).json({ message: "Biometric login failed" });
    }
  });
  
  // ============================================================================
  // USER CHECK AND INVITE
  // ============================================================================
  
  // Check if user exists and send invitation if not
  app.post("/api/users/check-and-invite", async (req, res) => {
    try {
      const { email, senderName, amount, type } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      const existingUser = await storage.getUserByEmail(email);
      
      if (existingUser) {
        return res.json({ userExists: true, userId: existingUser.id });
      }
      
      // User does not exist - send invitation email
      const baseUrl = process.env.REPLIT_DEV_DOMAIN || 'https://finatrades.com';
      const emailResult = await sendEmail(email, EMAIL_TEMPLATES.INVITATION, {
        sender_name: senderName || 'A Finatrades user',
        amount: `${amount}g gold`,
        register_url: `${baseUrl}/register?ref=${encodeURIComponent(senderName || '')}`,
      });
      
      // Create audit log for the invitation
      await storage.createAuditLog({
        entityType: "invitation",
        entityId: "0",
        actionType: "create",
        actor: "0",
        actorRole: "system",
        details: `Invitation ${emailResult.success ? 'sent' : 'failed'} to ${email} from ${senderName} for ${type} of ${amount}g gold`,
      });
      
      return res.json({ 
        userExists: false, 
        invitationSent: emailResult.success,
        message: emailResult.success 
          ? `Invitation sent to ${email}` 
          : `Could not send invitation email to ${email}. Please try again.`
      });
    } catch (error) {
      console.error("Check and invite error:", error);
      return res.status(500).json({ message: "Failed to process request" });
    }
  });
  
  // ============================================================================
  // ADMIN - USER MANAGEMENT
  // ============================================================================
  
  // Server-side cache for admin stats (expensive query)
  let adminStatsCache: { data: any; timestamp: number } | null = null;
  const ADMIN_STATS_CACHE_TTL = 30000; // 30 seconds

  // Admin Dashboard Stats
  app.get("/api/admin/stats", ensureAdminAsync, requirePermission('view_reports'), async (req, res) => {
    try {
      // Check cache first
      const now = Date.now();
      if (adminStatsCache && (now - adminStatsCache.timestamp) < ADMIN_STATS_CACHE_TTL) {
        console.log('[Admin Stats] Serving from cache');
        return res.json(adminStatsCache.data);
      }

      const startTime = now;
      
      // Fetch all data in parallel for speed with defensive error handling
      let users: any[] = [];
      let kycSubmissions: any[] = [];
      let allTransactions: any[] = [];
      let allDepositRequests: any[] = [];
      
      try {
        [users, kycSubmissions, allTransactions, allDepositRequests] = await Promise.all([
          storage.getAllUsers().catch(() => []),
          storage.getAllKycSubmissions().catch(() => []),
          storage.getAllTransactions().catch(() => []),
          Promise.resolve([] as any[])
        ]);
      } catch (e) {
        console.error('[admin/stats] Core data fetch failed:', e);
      }
      
      // Date calculations for period comparisons
      const currentDate = new Date();
      const currentMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const lastMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      const lastMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0, 23, 59, 59);
      
      // Helper to calculate percentage change
      const calcPercentChange = (current: number, previous: number): number => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100 * 10) / 10;
      };
      
      // Total users count
      const totalUsers = users.length;
      
      // Pending KYC count from both submissions table and users table
      const pendingKycSubmissions = kycSubmissions.filter(k => 
        k.status === 'In Progress' || k.status === 'Pending Review'
      ).length;
      const pendingKycUsers = users.filter(u => u.kycStatus === 'In Progress' || u.kycStatus === 'Pending Review').length;
      const pendingKycCount = Math.max(pendingKycSubmissions, pendingKycUsers);
      
      // Total transaction volume - calculate USD equivalent from all monetary fields
      const totalVolume = allTransactions.reduce((sum, tx) => {
        let txValue = 0;
        
        // If amountUsd is set, use it directly
        if (tx.amountUsd) {
          txValue = parseFloat(tx.amountUsd);
        }
        // If amountGold and price are set, calculate USD value
        else if (tx.amountGold && tx.goldPriceUsdPerGram) {
          txValue = parseFloat(tx.amountGold) * parseFloat(tx.goldPriceUsdPerGram);
        }
        // If amountEur is set, convert to USD (approximate rate)
        else if (tx.amountEur) {
          txValue = parseFloat(tx.amountEur) * 1.08;
        }
        
        return sum + (isNaN(txValue) ? 0 : Math.abs(txValue));
      }, 0);
      
      // Revenue estimate: 1% of total volume as a placeholder until fee data is fully modelled.
      // Labelled as estimated in the API response so admins are not misled.
      const revenue = totalVolume * 0.01;
      const revenueIsEstimated = true;
      
      // Calculate current month and last month volumes for percentage change
      const currentMonthVolume = allTransactions
        .filter(tx => new Date(tx.createdAt) >= currentMonthStart)
        .reduce((sum, tx) => {
          let txValue = 0;
          if (tx.amountUsd) txValue = parseFloat(tx.amountUsd);
          else if (tx.amountGold && tx.goldPriceUsdPerGram) {
            txValue = parseFloat(tx.amountGold) * parseFloat(tx.goldPriceUsdPerGram);
          }
          return sum + (isNaN(txValue) ? 0 : Math.abs(txValue));
        }, 0);
      
      const lastMonthVolume = allTransactions
        .filter(tx => {
          const txDate = new Date(tx.createdAt);
          return txDate >= lastMonthStart && txDate <= lastMonthEnd;
        })
        .reduce((sum, tx) => {
          let txValue = 0;
          if (tx.amountUsd) txValue = parseFloat(tx.amountUsd);
          else if (tx.amountGold && tx.goldPriceUsdPerGram) {
            txValue = parseFloat(tx.amountGold) * parseFloat(tx.goldPriceUsdPerGram);
          }
          return sum + (isNaN(txValue) ? 0 : Math.abs(txValue));
        }, 0);
      
      // Calculate percentage changes (real data only, 0 if no previous data)
      const volumeChange = calcPercentChange(currentMonthVolume, lastMonthVolume);
      const revenueChange = volumeChange; // Revenue is derived from volume
      
      // User growth: this month vs last month
      const currentMonthUsers = users.filter(u => new Date(u.createdAt) >= currentMonthStart).length;
      const lastMonthUsers = users.filter(u => {
        const createdAt = new Date(u.createdAt);
        return createdAt >= lastMonthStart && createdAt <= lastMonthEnd;
      }).length;
      const userGrowthChange = calcPercentChange(currentMonthUsers, lastMonthUsers);
      
      // Get pending KYC requests from submissions table with user details
      const pendingSubmissions = kycSubmissions.filter(k => k.status === 'In Progress');
      const pendingKycRequests = await Promise.all(
        pendingSubmissions.slice(0, 5).map(async (submission) => {
          const user = await storage.getUser(submission.userId);
          return {
            id: submission.id,
            userId: submission.userId,
            name: submission.companyName || submission.fullName || (user ? `${user.firstName} ${user.lastName}` : 'Unknown'),
            type: submission.accountType === 'business' ? 'Corporate' : 'Personal',
            status: submission.status,
            createdAt: submission.createdAt
          };
        })
      );
      
      // Pending transaction counts - include both transactions and deposit_requests tables
      const pendingDepositsFromTx = allTransactions.filter(tx => 
        tx.type === 'Deposit' && tx.status === 'Pending'
      ).length;
      const pendingDepositsFromRequests = allDepositRequests.filter(dep => 
        dep.status === 'Pending'
      ).length;
      const pendingDeposits = pendingDepositsFromTx + pendingDepositsFromRequests;
      
      const pendingWithdrawals = allTransactions.filter(tx => 
        tx.type === 'Withdrawal' && tx.status === 'Pending'
      ).length;
      
      const pendingTransactions = allTransactions.filter(tx => 
        tx.status === 'Pending'
      ).length;
      
      // Total completed deposits and withdrawals
      const totalDeposits = allTransactions.filter(tx => 
        tx.type === 'Deposit' && tx.status === 'Completed'
      ).length + allDepositRequests.filter(d => d.status === 'Approved').length;
      
      const totalWithdrawals = allTransactions.filter(tx => 
        tx.type === 'Withdrawal' && tx.status === 'Completed'
      ).length;
      
      const totalRequests = allTransactions.length + allDepositRequests.length;
      
      // Get trade finance cases
      let openTradeCases = 0;
      let pendingReviewCases = 0;
      try {
        const allTradeCases = await db.select().from(tradeCases);
        openTradeCases = allTradeCases.filter((c: any) => c.status === 'open' || c.status === 'in_progress').length;
        pendingReviewCases = allTradeCases.filter((c: any) => c.status === 'pending_review').length;
      } catch (e) { /* table may not exist */ }
      
      // Get recent critical events (audit logs)
      let recentCriticalEvents: any[] = [];
      try {
        const allAuditLogs = await db.select().from(auditLogs).orderBy(desc(auditLogs.timestamp)).limit(20);
        recentCriticalEvents = allAuditLogs.map(log => ({
          id: log.id,
          action: log.actionType,
          actorEmail: log.actor,
          actorRole: log.actorRole,
          targetType: log.entityType,
          targetId: log.entityId,
          createdAt: log.timestamp,
          details: log.details
        }));
      } catch (e) { /* table may not exist */ }
      
      // Collect all pending items from various modules
      const allPendingItems: any[] = [];
      
      // Pending deposit requests (bank deposits)
      const pendingDepositReqs = allDepositRequests.filter(d => 
        d.status === 'Pending' || d.status === 'Under Review'
      ).map(d => ({
        id: d.id,
        odooId: d.odooId,
        userId: d.userId,
        type: 'Deposit',
        status: d.status,
        amountGold: null,
        amountUsd: d.amount,
        description: `Bank deposit - ${d.bankName || 'Bank Transfer'}`,
        sourceModule: 'finapay',
            goldWalletType: 'LGPW',
        createdAt: d.createdAt
      }));
      allPendingItems.push(...pendingDepositReqs);
      
      // Pending withdrawal requests
      try {
        const allWithdrawals: any[] = []; // withdrawal_requests dropped (task #144)
        const pendingWithdrawReqs = allWithdrawals.filter((w: any) => 
          w.status === 'Pending' || w.status === 'Under Review' || w.status === 'Processing'
        ).map((w: any) => ({
          id: w.id,
          odooId: w.odooId,
          userId: w.userId,
          type: 'Withdrawal',
          status: w.status,
          amountGold: w.amountGold,
          amountUsd: w.amountUsd,
          description: `Withdrawal to ${w.bankName || 'bank account'}`,
          sourceModule: 'finapay',
            goldWalletType: 'LGPW',
          createdAt: w.createdAt
        }));
        allPendingItems.push(...pendingWithdrawReqs);
      } catch (e) { /* table may not exist */ }
      
      // Pending crypto payment requests
      try {
        const allCryptoReqs: any[] = []; // crypto_payment_requests dropped (task #144)
        const pendingCryptoReqs = allCryptoReqs.filter((c: any) => 
          c.status === 'Pending' || c.status === 'Under Review' || c.status === 'pending'
        ).map((c: any) => ({
          id: c.id,
          odooId: c.odooId,
          userId: c.userId,
          type: 'Crypto Deposit',
          status: c.status,
          amountGold: null,
          amountUsd: c.amountUsd,
          description: `Crypto deposit - ${c.network || 'Crypto'}`,
          sourceModule: 'finapay',
            goldWalletType: 'LGPW',
          createdAt: c.createdAt
        }));
        allPendingItems.push(...pendingCryptoReqs);
      } catch (e) { /* table may not exist */ }
      
      // Pending buy-gold (Wingold purchase) requests removed with the legacy gold stack.
      // Pending trade cases
      try {
        const allTrades = await db.select().from(tradeCases);
        const pendingTrades = allTrades.filter((t: any) => 
          t.status === 'pending_review' || t.status === 'draft'
        ).map((t: any) => ({
          id: t.id,
          odooId: t.odooId,
          userId: t.userId,
          type: 'Trade Finance',
          status: t.status === 'pending_review' ? 'Pending Review' : 'Draft',
          amountGold: null,
          amountUsd: t.amountUsd,
          description: `Trade case: ${t.productType || 'Trade finance request'}`,
          sourceModule: 'finabridge',
          createdAt: t.createdAt
        }));
        allPendingItems.push(...pendingTrades);
      } catch (e) { /* table may not exist */ }
      
      // Pending BNSL plans removed with the legacy gold stack.

      // Get recent transactions from main transactions table
      const recentTxFromTable = allTransactions
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 20)
        .map(tx => ({
          id: tx.id,
          odooId: tx.odooId,
          userId: tx.userId,
          type: tx.type,
          status: tx.status,
          amountGold: tx.amountGold,
          amountUsd: tx.amountUsd,
          description: tx.description,
          sourceModule: tx.sourceModule,
          createdAt: tx.createdAt
        }));
      
      // Merge all pending items with recent transactions, sort by date, take top 20
      const allItems = [...allPendingItems, ...recentTxFromTable];
      const recentTransactions = allItems
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 20);
      
      // USD to AED conversion rate
      const USD_TO_AED = 3.67;
      const totalVolumeAed = totalVolume * USD_TO_AED;
      const revenueAed = revenue * USD_TO_AED;
      
      const responseData = {
        totalUsers,
        pendingKycCount,
        totalVolume,
        totalVolumeAed,
        revenue,
        revenueAed,
        revenueIsEstimated,
        pendingKycRequests,
        pendingDeposits,
        pendingWithdrawals,
        pendingTransactions,
        totalDeposits,
        totalWithdrawals,
        totalRequests,
        openReviewCount: pendingKycCount + pendingDeposits + pendingWithdrawals,
        openTradeCases,
        pendingReviewCases,
        recentCriticalEvents,
        recentTransactions,
        // Percentage changes (real data - 0 if no previous period data)
        volumeChange,
        revenueChange,
        userGrowthChange,
        currentMonthVolume,
        lastMonthVolume
      };

      // Cache the response
      adminStatsCache = { data: responseData, timestamp: Date.now() };
      console.log(`[Admin Stats] Generated in ${Date.now() - startTime}ms`);
      
      return res.json(responseData);
    } catch (error) {
      console.error("Failed to get admin stats:", error);
      return res.status(400).json({ message: "Failed to get admin stats" });
    }
  });

  // Admin Pending Counts for Sidebar Badges
  app.get("/api/admin/pending-counts", ensureAdminAsync, requirePermission('view_reports'), async (req, res) => {
    try {
      const [kycSubmissions, allTransactions, allDepositRequests, allUsers] = await Promise.all([
        storage.getAllKycSubmissions().catch(() => []),
        storage.getAllTransactions().catch(() => []),
        Promise.resolve([] as any[]),
        storage.getAllUsers().catch(() => [])
      ]);
      const pendingKycSubmissions = kycSubmissions.filter((k: any) => k.status === 'In Progress' || k.status === 'Pending Review').length;
      const pendingKycUsers = allUsers.filter((u: any) => u.kycStatus === 'In Progress' || u.kycStatus === 'Pending Review').length;
      const pendingKyc = Math.max(pendingKycSubmissions, pendingKycUsers);
      const pendingTransactions = allTransactions.filter((tx: any) => tx.status === 'Pending').length;
      const pendingDeposits = allDepositRequests.filter((d: any) => d.status === 'Pending' || d.status === 'Under Review').length;

      let pendingWithdrawals = 0, pendingTradeCases = 0, pendingAccountDeletions = 0, openAmlCases = 0;
      try {
        const allWithdrawals: any[] = []; // withdrawal_requests dropped (task #144)
        pendingWithdrawals = allWithdrawals.filter((w: any) => w.status === 'Pending' || w.status === 'Under Review' || w.status === 'Processing').length;
      } catch {}
      try {
        const allTrades = await db.select().from(tradeCases);
        pendingTradeCases = allTrades.filter((t: any) => t.status === 'pending_review' || t.status === 'open').length;
      } catch {}
      try {
        const allDeletionRequests = await storage.getAllAccountDeletionRequests();
        pendingAccountDeletions = allDeletionRequests.filter((d: any) => d.status === 'Pending').length;
      } catch {}
      try {
        const allAmlCases = await db.select().from(amlCases);
        openAmlCases = allAmlCases.filter((c: any) => c.status === 'Open' || c.status === 'Under Investigation').length;
      } catch {}

      return res.json({
        pendingKyc,
        pendingTransactions,
        pendingDeposits,
        pendingWithdrawals,
        pendingTradeCases,
        pendingAccountDeletions,
        openAmlCases
      });
    } catch (error) {
      console.error("Failed to get pending counts:", error);
      return res.status(400).json({ message: "Failed to get pending counts" });
    }
  });

  // Gold Backing Report (Admin)
  app.get("/api/admin/system-health", ensureAdminAsync, requirePermission('view_reports', 'manage_settings'), async (req, res) => {
    const startTime = process.hrtime();
    
    try {
      const checks: Array<{
        name: string;
        status: 'healthy' | 'degraded' | 'unhealthy';
        responseTime?: number;
        lastChecked: string;
        details?: string;
      }> = [];
      
      // Check Database
      const dbStart = Date.now();
      try {
        await db.select().from(users).limit(1);
        checks.push({
          name: 'Database',
          status: 'healthy',
          responseTime: Date.now() - dbStart,
          lastChecked: new Date().toISOString(),
          details: 'PostgreSQL connection active'
        });
      } catch (dbError) {
        checks.push({
          name: 'Database',
          status: 'unhealthy',
          responseTime: Date.now() - dbStart,
          lastChecked: new Date().toISOString(),
          details: 'Database connection failed'
        });
      }
      
      // Check API Server
      checks.push({
        name: 'API Server',
        status: 'healthy',
        responseTime: 1,
        lastChecked: new Date().toISOString(),
        details: 'Express server responding'
      });
      
      // Check Session Store
      const sessionStart = Date.now();
      try {
        const sessionCount = await db.select({ count: sql<number>`count(*)` }).from(sql`user_sessions`);
        checks.push({
          name: 'Session Store',
          status: 'healthy',
          responseTime: Date.now() - sessionStart,
          lastChecked: new Date().toISOString(),
          details: `${sessionCount[0]?.count || 0} active sessions`
        });
      } catch (sessionError) {
        checks.push({
          name: 'Session Store',
          status: 'degraded',
          responseTime: Date.now() - sessionStart,
          lastChecked: new Date().toISOString(),
          details: 'Session store check failed'
        });
      }
      
      // Check Real-time (Socket.IO)
      checks.push({
        name: 'Real-time',
        status: 'healthy',
        lastChecked: new Date().toISOString(),
        details: 'Socket.IO server active'
      });

      // Check SMTP Connectivity
      const smtpHost = process.env.SMTP_HOST || 'smtp-relay.brevo.com';
      const smtpPort = parseInt(process.env.SMTP_PORT || '587');
      const smtpStart = Date.now();
      try {
        await new Promise<void>((resolve, reject) => {
          const net = require('net');
          const conn = net.createConnection({ host: smtpHost, port: smtpPort, timeout: 5000 });
          conn.once('connect', () => { conn.destroy(); resolve(); });
          conn.once('error', reject);
          conn.once('timeout', () => { conn.destroy(); reject(new Error('SMTP connection timed out')); });
        });
        checks.push({
          name: 'Email (SMTP)',
          status: 'healthy',
          responseTime: Date.now() - smtpStart,
          lastChecked: new Date().toISOString(),
          details: `Connected to ${smtpHost}:${smtpPort}`
        });
      } catch (smtpErr) {
        checks.push({
          name: 'Email (SMTP)',
          status: 'degraded',
          responseTime: Date.now() - smtpStart,
          lastChecked: new Date().toISOString(),
          details: `SMTP unreachable: ${smtpHost}:${smtpPort}`
        });
      }

      
      // Get recent errors from system logs
      let recentErrorCount = 0;
      let lastError: { message: string; timestamp: string; route?: string } | undefined;
      try {
        const errorLogs = await db.select().from(systemLogs)
          .where(and(
            eq(systemLogs.level, 'error'),
            gte(systemLogs.createdAt, sql`NOW() - INTERVAL '24 hours'`)
          ))
          .orderBy(desc(systemLogs.createdAt))
          .limit(10);
        
        recentErrorCount = errorLogs.length;
        if (errorLogs.length > 0) {
          lastError = {
            message: errorLogs[0].message,
            timestamp: errorLogs[0].createdAt.toISOString(),
            route: errorLogs[0].route || undefined
          };
        }
      } catch (e) { /* system_logs table may not exist */ }
      
      // Get active session count
      let activeSessions = 0;
      try {
        const result = await db.select({ count: sql<number>`count(*)` }).from(sql`user_sessions`);
        activeSessions = result[0]?.count || 0;
      } catch (e) { /* ignore */ }
      
      // Determine overall status
      const hasUnhealthy = checks.some(c => c.status === 'unhealthy');
      const hasDegraded = checks.some(c => c.status === 'degraded');
      const overall = hasUnhealthy ? 'unhealthy' : hasDegraded ? 'degraded' : 'healthy';
      
      // Calculate uptime (approximate based on process uptime)
      const uptime = Math.floor(process.uptime());
      
        return res.json({
        health: {
          overall,
          checks,
          uptime,
          version: '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          lastChecked: new Date().toISOString(),
          recentErrors: {
            count: recentErrorCount,
            lastError
          },
          activeSessions,
          dbPoolInfo: {
            total: 10,
            idle: 8,
            waiting: 0
          }
        }
      });
    } catch (error) {
      console.error("System health check failed:", error);
      return res.status(500).json({ 
        health: {
          overall: 'unhealthy',
          checks: [],
          uptime: 0,
          version: '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          lastChecked: new Date().toISOString(),
          recentErrors: { count: 0 },
          activeSessions: 0
        }
      });
    }
  });


  // Get all users (Admin)
  app.get("/api/admin/users", ensureAdminAsync, requirePermission('view_users', 'manage_users'), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      
      // Enrich admin users with their RBAC role info
      const enrichedUsers = await Promise.all(users.map(async (user) => {
        const sanitized = sanitizeUser(user);
        
        // For admin users, fetch their RBAC role
        if (user.role === 'admin') {
          const roleAssignment = await storage.getUserRoleAssignments(user.id);
          if (roleAssignment && roleAssignment.length > 0) {
            const activeAssignment = roleAssignment.find((ra: any) => ra.is_active);
            if (activeAssignment) {
              // Role data is already in activeAssignment via JOIN
              if (activeAssignment.role_name) {
                return {
                  ...sanitized,
                  rbacRole: {
                    id: activeAssignment.role_id,
                    name: activeAssignment.role_name,
                    risk_level: activeAssignment.risk_level,
                    department: activeAssignment.department
                  }
                };
              }
            }
          }
        }
        return sanitized;
      }));
      
      return res.json({ users: enrichedUsers });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get users" });
    }
  });

  // Get user list for account statements dropdown (with server-side search)
  // NOTE: This route MUST be defined before /api/admin/users/:userId to avoid route matching conflict
  app.get("/api/admin/users/list", ensureAdminAsync, requirePermission('view_users'), async (req, res) => {
    try {
      const search = (req.query.search as string || '').toLowerCase().trim();
      const allUsers = await storage.getAllUsers();
      
      let filteredUsers = allUsers.filter(u => u.role !== 'admin');
      
      if (search) {
        filteredUsers = filteredUsers.filter(u => 
          u.firstName?.toLowerCase().includes(search) ||
          u.lastName?.toLowerCase().includes(search) ||
          u.email?.toLowerCase().includes(search) ||
          u.finatradesId?.toLowerCase().includes(search)
        );
      }
      
      const userList = filteredUsers.slice(0, 50).map(u => ({
        id: u.id,
        finatradesId: u.finatradesId || `FT-${u.id.slice(0, 8).toUpperCase()}`,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        accountType: u.accountType || 'Personal'
      }));
      return res.json(userList);
    } catch (error) {
      console.error("Failed to get users list:", error);
      return res.status(400).json({ message: "Failed to get users list" });
    }
  });
  
  // Get single user details with wallet and transactions (Admin)
  app.get("/api/admin/users/:userId", ensureAdminAsync, requirePermission('view_users', 'manage_users'), async (req, res) => {
    try {
      const user = await storage.getUser(req.params.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get wallet
      const wallet = await storage.getWallet(user.id);
      
      // Get transactions
      const transactions = await storage.getUserTransactions(user.id);
      
      // Get KYC submission - check all KYC tables
      let kycSubmission = await storage.getKycSubmission(user.id);
      
      // If not found in legacy table, check finatrades personal KYC
      if (!kycSubmission) {
        const personalKyc = await storage.getFinatradesPersonalKyc(user.id);
        if (personalKyc) {
          kycSubmission = {
            ...personalKyc,
            tier: 'finatrades_personal',
            kycType: 'finatrades_personal',
            accountType: 'personal',
            idFrontUrl: personalKyc.idFrontUrl,
            idBackUrl: personalKyc.idBackUrl,
            passportUrl: personalKyc.passportUrl,
            addressProofUrl: personalKyc.addressProofUrl,
            // selfieUrl is a legacy field name not present on the current
            // schema; access via index until the field is renamed.
            livenessCapture: (personalKyc as unknown as Record<string, unknown>).selfieUrl,
            // The composed object adds derived fields (`tier`, `kycType`,
            // `accountType`, `livenessCapture`) that are not part of the
            // KycSubmission schema, so the union-cast is intentional.
          } as any;
        }
      }
      
      // If still not found, check finatrades corporate KYC
      if (!kycSubmission) {
        const corporateKyc = await storage.getFinatradesCorporateKyc(user.id);
        if (corporateKyc) {
          kycSubmission = {
            ...corporateKyc,
            tier: 'finatrades_corporate',
            kycType: 'finatrades_corporate',
            accountType: 'business',
            fullName: corporateKyc.companyName,
            // See note above: the composed object intentionally includes
            // derived fields not present on the KycSubmission schema.
          } as any;
        }
      }
      
      // Get audit logs for this user
      const auditLogs = await storage.getEntityAuditLogs('user', user.id);
      
      return res.json({ 
        user: sanitizeUser(user),
        wallet,
        transactions,
        kycSubmission,
        auditLogs
      });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get user details" });
    }
  });
  
  // Admin: Manually verify user email
  app.post("/api/admin/users/:userId/verify-email", ensureAdminAsync, requirePermission('manage_users'), async (req, res) => {
    try {
      const { adminId } = req.body;
      const user = await storage.getUser(req.params.userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (user.isEmailVerified) {
        return res.status(400).json({ message: "User email is already verified" });
      }
      
      const updatedUser = await storage.updateUser(user.id, {
        isEmailVerified: true,
        emailVerificationCode: null,
        emailVerificationExpiry: null,
      });
      
      // Create audit log
      await storage.createAuditLog({
        entityType: "user",
        entityId: user.id,
        actionType: "update",
        actor: adminId || "admin",
        actorRole: "admin",
        details: "Admin manually verified user email",
      });
      
      return res.json({ 
        message: "User email verified by admin", 
        user: sanitizeUser(updatedUser!) 
      });
    } catch (error) {
      return res.status(400).json({ message: "Failed to verify user email" });
    }
  });
  
  // Admin: Suspend user
  app.post("/api/admin/users/:userId/suspend", ensureAdminAsync, requirePermission('manage_users'), async (req, res) => {
    try {
      const { adminId, reason } = req.body;
      const user = await storage.getUser(req.params.userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const updatedUser = await storage.updateUser(user.id, {
        kycStatus: 'Rejected',
      });
      
      await storage.createAuditLog({
        entityType: "user",
        entityId: user.id,
        actionType: "update",
        actor: adminId || "admin",
        actorRole: "admin",
        details: `User suspended. Reason: ${reason || 'Not specified'}`,
      });
      
      return res.json({ 
        message: "User suspended", 
        user: sanitizeUser(updatedUser!) 
      });
    } catch (error) {
      return res.status(400).json({ message: "Failed to suspend user" });
    }
  });
  
  // Admin: Activate user
  app.post("/api/admin/users/:userId/activate", ensureAdminAsync, requirePermission('manage_users'), async (req, res) => {
    try {
      const { adminId } = req.body;
      const user = await storage.getUser(req.params.userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const updatedUser = await storage.updateUser(user.id, {
        kycStatus: 'Approved',
      });
      
      await storage.createAuditLog({
        entityType: "user",
        entityId: user.id,
        actionType: "update",
        actor: adminId || "admin",
        actorRole: "admin",
        details: "User activated by admin",
      });
      
      return res.json({ 
        message: "User activated", 
        user: sanitizeUser(updatedUser!) 
      });
    } catch (error) {
      return res.status(400).json({ message: "Failed to activate user" });
    }
  });
  
  // ============================================================================
  // ADMIN - EMPLOYEE MANAGEMENT
  // ============================================================================
  
  // Get all employees
  app.get("/api/admin/employees", ensureAdminAsync, requirePermission('manage_employees', 'view_users'), async (req, res) => {
    try {
      const employees = await storage.getAllEmployees();
      
      // Enrich with user details
      const enrichedEmployees = await Promise.all(
        employees.map(async (emp) => {
          const user = emp.userId ? await storage.getUser(emp.userId) : null;
          const rbacRole = emp.rbacRoleId ? await storage.getAdminRole(emp.rbacRoleId) : null;
          return {
            ...emp,
            rbacRole: rbacRole ? {
              id: rbacRole.id,
              name: rbacRole.name,
              risk_level: rbacRole.risk_level,
              department: rbacRole.department
            } : null,
            user: user ? {
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              profilePhoto: user.profilePhoto
            } : null
          };
        })
      );
      
      return res.json({ employees: enrichedEmployees });
    } catch (error) {
      console.error("Failed to get employees:", error);
      return res.status(400).json({ message: "Failed to get employees" });
    }
  });
  
  // Get single employee
  app.get("/api/admin/employees/:id", ensureAdminAsync, requirePermission('manage_employees', 'view_users'), async (req, res) => {
    try {
      const employee = await storage.getEmployee(req.params.id);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      const user = employee.userId ? await storage.getUser(employee.userId) : null;
      
      return res.json({ 
        employee: {
          ...employee,
          user: user ? {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            profilePhoto: user.profilePhoto
          } : null
        }
      });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get employee" });
    }
  });
  
  // Get employee by user ID (for current admin's permissions)
  // No permission required - admins need to fetch their own permissions
  app.get("/api/admin/employees/by-user/:userId", ensureAdminAsync, requirePermission('manage_employees'), async (req, res) => {
    try {
      const employee = await storage.getEmployeeByUserId(req.params.userId);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found for this user" });
      }
      
      return res.json({ employee });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get employee" });
    }
  });
  
  // Create new employee
  app.post("/api/admin/employees", ensureAdminAsync, requirePermission('manage_employees'), async (req, res) => {
    try {
      const { userId: rawUserId, role, rbacRoleId, department, jobTitle, permissions } = req.body;
      const userId = rawUserId || null; // Convert empty string to null for FK constraint
      const adminUser = req.adminUser!;
      
      // Validate permissions - require at least one permission
      if (!permissions || permissions.length === 0) {
        return res.status(400).json({ message: "At least one permission is required" });
      }
      
      // Check if user is already an employee
      if (userId) {
        const existingEmployee = await storage.getEmployeeByUserId(userId);
        if (existingEmployee) {
          return res.status(400).json({ message: "User is already an employee" });
        }
        
        // Update user role to admin
        await storage.updateUser(userId, { role: 'admin' });
      }
      
      // Generate employee ID
      const employeeId = await storage.generateEmployeeId();
      
      const employee = await storage.createEmployee({
        userId,
        employeeId,
        role: role || 'support',
        rbacRoleId: rbacRoleId || null,
        department,
        jobTitle,
        permissions: permissions || [],
        status: 'active',
        createdBy: adminUser.id
      });
      
      if (userId && rbacRoleId) {
        await db.execute(sql`
          DELETE FROM user_role_assignments WHERE user_id = ${userId} AND role_id = ${rbacRoleId}
        `);
        await db.execute(sql`
          INSERT INTO user_role_assignments (id, user_id, role_id, assigned_by, assigned_at, is_active)
          VALUES (gen_random_uuid(), ${userId}, ${rbacRoleId}, ${adminUser.id}, NOW(), true)
        `);
        console.log(`[RBAC] Role assignment created: user=${userId}, role=${rbacRoleId}`);
      }
      
      // Create audit log with detailed data
      await storage.createAuditLog({
        entityType: "employee",
        entityId: employee.id,
        actionType: "create",
        actor: adminUser.id,
        actorRole: "admin",
        details: `Employee ${employeeId} created with role ${role}`,
        newValue: JSON.stringify({ role, department, jobTitle, permissions }),
      });
      
      return res.json({ employee });
    } catch (error) {
      console.error("Failed to create employee:", error);
      return res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create employee" });
    }
  });
  
  // Update employee
  app.patch("/api/admin/employees/:id", ensureAdminAsync, requirePermission('manage_employees'), async (req, res) => {
    try {
      const { role, rbacRoleId, department, jobTitle, status, permissions } = req.body;
      const adminUser = req.adminUser!;
      
      const existingEmployee = await storage.getEmployee(req.params.id);
      if (!existingEmployee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      // Validate permissions if being updated (only for legacy permission mode)
      if (permissions !== undefined && Array.isArray(permissions) && permissions.length === 0 && !rbacRoleId) {
        return res.status(400).json({ message: "At least one permission is required" });
      }
      
      const updates: any = {};
      if (role !== undefined) updates.role = role;
      if (rbacRoleId !== undefined) updates.rbacRoleId = rbacRoleId || null;
      if (department !== undefined) updates.department = department;
      if (jobTitle !== undefined) updates.jobTitle = jobTitle;
      if (status !== undefined) updates.status = status;
      if (permissions !== undefined) updates.permissions = permissions;
      
      const employee = await storage.updateEmployee(req.params.id, updates);
      
      if (rbacRoleId !== undefined && existingEmployee.userId) {
        if (existingEmployee.rbacRoleId) {
          await db.execute(sql`
            DELETE FROM user_role_assignments
            WHERE user_id = ${existingEmployee.userId} AND role_id = ${existingEmployee.rbacRoleId}
          `);
        }
        
        if (rbacRoleId) {
          await db.execute(sql`
            INSERT INTO user_role_assignments (id, user_id, role_id, assigned_by, assigned_at, is_active)
            VALUES (gen_random_uuid(), ${existingEmployee.userId}, ${rbacRoleId}, ${adminUser.id}, NOW(), true)
          `);
          console.log(`[RBAC] Role assignment updated: user=${existingEmployee.userId}, role=${rbacRoleId}`);
        }
        
        if (req.session?.userId === existingEmployee.userId) {
          delete req.session.permissions;
          delete req.session.isSuperAdmin;
          delete req.session.permissionsCachedAt;
        }
      }
      
      // Create audit log with before/after data
      await storage.createAuditLog({
        entityType: "employee",
        entityId: req.params.id,
        actionType: "update",
        actor: adminUser.id,
        actorRole: "admin",
        details: `Employee ${existingEmployee.employeeId} updated`,
        oldValue: JSON.stringify({
          role: existingEmployee.role,
          department: existingEmployee.department,
          jobTitle: existingEmployee.jobTitle,
          permissions: existingEmployee.permissions,
        }),
        newValue: JSON.stringify(updates),
      });
      
      return res.json({ employee });
    } catch (error) {
      console.error('[Employee Update Error]', error);
      return res.status(400).json({ message: "Failed to update employee", error: String(error) });
    }
  });
  
  // Deactivate employee (soft delete)
  app.post("/api/admin/employees/:id/deactivate", ensureAdminAsync, requirePermission('manage_employees'), async (req, res) => {
    try {
      const { reason } = req.body;
      const adminUser = req.adminUser!;
      
      const existingEmployee = await storage.getEmployee(req.params.id);
      if (!existingEmployee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      const employee = await storage.updateEmployee(req.params.id, { status: 'inactive' });
      
      // If employee has a user account, update their role back to user and invalidate sessions
      if (existingEmployee.userId) {
        await storage.updateUser(existingEmployee.userId, { role: 'user' });
        
        await db.execute(sql`
          DELETE FROM user_role_assignments
          WHERE user_id = ${existingEmployee.userId}
        `);
        console.log(`[RBAC] Role assignments removed for deactivated user: ${existingEmployee.userId}`);
        
        // SECURITY: Invalidate all sessions for this user by deleting from session store
        // This ensures the deactivated employee is immediately logged out
        try {
          await pool.query(
            `DELETE FROM session WHERE sess::jsonb->>'userId' = $1 AND (sess::jsonb->'adminPortal')::boolean = true`,
            [existingEmployee.userId]
          );
          console.log(`[Security] Invalidated admin sessions for deactivated employee: ${existingEmployee.employeeId}`);
        } catch (sessionError) {
          console.error('Failed to invalidate sessions:', sessionError);
        }
      }
      
      // Create audit log with before/after data
      await storage.createAuditLog({
        entityType: "employee",
        entityId: req.params.id,
        actionType: "update",
        actor: adminUser.id,
        actorRole: "admin",
        details: `Employee ${existingEmployee.employeeId} deactivated. Reason: ${reason || 'Not specified'}. Sessions invalidated.`,
        oldValue: JSON.stringify({ status: existingEmployee.status }),
        newValue: JSON.stringify({ status: 'inactive' }),
      });
      
      return res.json({ message: "Employee deactivated and sessions invalidated", employee });
    } catch (error) {
      return res.status(400).json({ message: "Failed to deactivate employee" });
    }
  });
  
  // Reactivate employee
  app.post("/api/admin/employees/:id/activate", ensureAdminAsync, requirePermission('manage_employees'), async (req, res) => {
    try {
      const adminUser = req.adminUser!;
      
      const existingEmployee = await storage.getEmployee(req.params.id);
      if (!existingEmployee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      const employee = await storage.updateEmployee(req.params.id, { status: 'active' });
      
      // If employee has a user account, update their role to admin
      if (existingEmployee.userId) {
        await storage.updateUser(existingEmployee.userId, { role: 'admin' });
        
        if (existingEmployee.rbacRoleId) {
          await db.execute(sql`
            DELETE FROM user_role_assignments WHERE user_id = ${existingEmployee.userId} AND role_id = ${existingEmployee.rbacRoleId}
          `);
          await db.execute(sql`
            INSERT INTO user_role_assignments (id, user_id, role_id, assigned_by, assigned_at, is_active)
            VALUES (gen_random_uuid(), ${existingEmployee.userId}, ${existingEmployee.rbacRoleId}, ${adminUser.id}, NOW(), true)
          `);
          console.log(`[RBAC] Role assignment restored for reactivated user: ${existingEmployee.userId}, role=${existingEmployee.rbacRoleId}`);
        }
      }
      
      // Create audit log with before/after data
      await storage.createAuditLog({
        entityType: "employee",
        entityId: req.params.id,
        actionType: "update",
        actor: adminUser.id,
        actorRole: "admin",
        details: `Employee ${existingEmployee.employeeId} activated`,
        oldValue: JSON.stringify({ status: existingEmployee.status }),
        newValue: JSON.stringify({ status: 'active' }),
      });
      
      return res.json({ message: "Employee activated", employee });
    } catch (error) {
      return res.status(400).json({ message: "Failed to activate employee" });
    }
  });
  
  // Get role permissions
  app.get("/api/admin/role-permissions", ensureAdminAsync, requirePermission('manage_employees', 'manage_settings'), async (req, res) => {
    try {
      const permissions = await storage.getAllRolePermissions();
      return res.json({ permissions });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get role permissions" });
    }
  });
  
  // Update role permissions
  app.patch("/api/admin/role-permissions/:role", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      const { permissions } = req.body;
      const role = req.params.role;
      const adminUser = req.adminUser!;
      
      // Check if role permission exists
      let rolePermission = await storage.getRolePermission(role);
      
      if (rolePermission) {
        rolePermission = await storage.updateRolePermission(rolePermission.id, { permissions, updatedBy: adminUser.id });
      } else {
        rolePermission = await storage.createRolePermission({
          role: role as 'admin' | 'super_admin' | 'manager' | 'support' | 'finance' | 'compliance',
          permissions,
          updatedBy: adminUser.id
        });
      }
      
      // Create audit log
      await storage.createAuditLog({
        entityType: "role_permission",
        entityId: rolePermission?.id || role,
        actionType: "update",
        actor: adminUser.id,
        actorRole: "admin",
        details: `Role ${role} permissions updated`,
      });
      
      return res.json({ permission: rolePermission });
    } catch (error) {
      console.error("Failed to update role permissions:", error);
      return res.status(400).json({ message: "Failed to update role permissions" });
    }
  });
  
  // ============================================================================
  // DATABASE BACKUP & RESTORE MANAGEMENT
  // ============================================================================
  
  // List all backups
  app.get("/api/admin/backups", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      const backups = await listBackups();
      return res.json({ backups });
    } catch (error) {
      console.error("Failed to list backups:", error);
      return res.status(500).json({ message: "Failed to list backups" });
    }
  });
  
  // Create a new backup (requires OTP verification)
  app.post("/api/admin/backups", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      const adminUser = req.adminUser!;
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';
      
      // Require OTP verification for backup creation
      const { otpCode } = req.body;
      if (!adminUser.mfaEnabled) {
        return res.status(403).json({ 
          message: "Two-factor authentication must be enabled to perform backup operations. Please enable 2FA in your security settings.",
          requiresMfa: true
        });
      }
      
      if (!otpCode) {
        return res.status(400).json({ 
          message: "OTP verification code is required for backup operations.",
          requiresOtp: true
        });
      }
      
      if (!adminUser.mfaSecret) {
        return res.status(400).json({ message: "MFA is not configured for this admin." });
      }
      const isValidOtp = authenticator.verify({ token: otpCode, secret: adminUser.mfaSecret });
      if (!isValidOtp) {
        return res.status(401).json({ message: "Invalid OTP code. Please try again." });
      }
      
      const result = await createBackup(adminUser.id, 'manual');
      
      await logBackupAction(
        'BACKUP_CREATE',
        result.backupId || null,
        adminUser.id,
        adminUser.email,
        result.success ? 'SUCCESS' : 'FAILED',
        ipAddress,
        userAgent,
        result.error,
        { fileName: result.fileName, fileSizeBytes: result.fileSizeBytes }
      );
      
      if (!result.success) {
        return res.status(500).json({ message: result.error || "Backup failed" });
      }
      
        return res.json({
        message: "Backup created successfully",
        backup: {
          id: result.backupId,
          fileName: result.fileName,
          fileSizeBytes: result.fileSizeBytes,
          tablesIncluded: result.tablesIncluded,
          totalRows: result.totalRows
        }
      });
    } catch (error) {
      console.error("Failed to create backup:", error);
      return res.status(500).json({ message: "Failed to create backup" });
    }
  });
  
  // Get backup details
  app.get("/api/admin/backups/:id", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      const backup = await getBackup(req.params.id);
      if (!backup) {
        return res.status(404).json({ message: "Backup not found" });
      }
      return res.json({ backup });
    } catch (error) {
      console.error("Failed to get backup:", error);
      return res.status(500).json({ message: "Failed to get backup details" });
    }
  });
  
  // Verify backup integrity
  app.post("/api/admin/backups/:id/verify", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      const result = await verifyBackup(req.params.id);
      return res.json({ valid: result.valid, error: result.error });
    } catch (error) {
      console.error("Failed to verify backup:", error);
      return res.status(500).json({ message: "Failed to verify backup" });
    }
  });
  
  // Download backup file (requires OTP verification via POST body)
  app.post("/api/admin/backups/:id/download", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      const adminUser = req.adminUser!;
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';
      
      // Require OTP verification for download
      const { otpCode } = req.body;
      if (!adminUser.mfaEnabled) {
        return res.status(403).json({ 
          message: "Two-factor authentication must be enabled to download backups.",
          requiresMfa: true
        });
      }
      
      if (!otpCode) {
        return res.status(400).json({ 
          message: "OTP verification code is required to download backups.",
          requiresOtp: true
        });
      }
      
      if (!adminUser.mfaSecret) {
        return res.status(400).json({ message: "MFA is not configured for this admin." });
      }
      const isValidOtp = authenticator.verify({ token: otpCode, secret: adminUser.mfaSecret });
      if (!isValidOtp) {
        return res.status(401).json({ message: "Invalid OTP code. Please try again." });
      }
      
      const fileResult = await getBackupFileStream(req.params.id);
      
      if (!fileResult) {
        await logBackupAction(
          'BACKUP_DOWNLOAD',
          req.params.id,
          adminUser.id,
          adminUser.email,
          'FAILED',
          ipAddress,
          userAgent,
          'Backup file not found or not ready'
        );
        return res.status(404).json({ message: "Backup file not found or not ready" });
      }
      
      await logBackupAction(
        'BACKUP_DOWNLOAD',
        req.params.id,
        adminUser.id,
        adminUser.email,
        'SUCCESS',
        ipAddress,
        userAgent
      );
      
      res.setHeader('Content-Disposition', `attachment; filename="${fileResult.fileName}"`);
      res.setHeader('Content-Type', 'application/octet-stream');
      fileResult.stream.pipe(res);
      return undefined;
    } catch (error) {
      console.error("Failed to download backup:", error);
      return res.status(500).json({ message: "Failed to download backup" });
    }
  });
  
  // Restore from backup (DANGEROUS - requires super admin or manage_settings permission + OTP)
  app.post("/api/admin/backups/:id/restore", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      const adminUser = req.adminUser!;
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';
      
      // Require OTP verification for restore
      const { confirmed, otpCode } = req.body;
      if (!adminUser.mfaEnabled) {
        return res.status(403).json({ 
          message: "Two-factor authentication must be enabled to perform restore operations. Please enable 2FA in your security settings.",
          requiresMfa: true
        });
      }
      
      if (!otpCode) {
        return res.status(400).json({ 
          message: "OTP verification code is required for restore operations.",
          requiresOtp: true
        });
      }
      
      if (!adminUser.mfaSecret) {
        return res.status(400).json({ message: "MFA is not configured for this admin." });
      }
      const isValidOtp = authenticator.verify({ token: otpCode, secret: adminUser.mfaSecret });
      if (!isValidOtp) {
        return res.status(401).json({ message: "Invalid OTP code. Please try again." });
      }
      
      // Additional safety: Require confirmation flag
      if (!confirmed) {
        return res.status(400).json({
          message: "Restore operation requires explicit confirmation. Set 'confirmed: true' in request body.",
          warning: "This operation will replace all current data with the backup data. A pre-restore snapshot will be created automatically."
        });
      }
      
      const result = await restoreBackup(req.params.id, adminUser.id);
      
      await logBackupAction(
        'BACKUP_RESTORE',
        req.params.id,
        adminUser.id,
        adminUser.email,
        result.success ? 'SUCCESS' : 'FAILED',
        ipAddress,
        userAgent,
        result.error,
        {
          preRestoreBackupId: result.preRestoreBackupId,
          userCount: result.userCount,
          transactionCount: result.transactionCount
        }
      );
      
      if (!result.success) {
        return res.status(500).json({
          message: result.error || "Restore failed",
          preRestoreBackupId: result.preRestoreBackupId
        });
      }
      
        return res.json({
        message: "Database restored successfully",
        preRestoreBackupId: result.preRestoreBackupId,
        restoredFromBackupId: result.restoredFromBackupId,
        userCount: result.userCount,
        transactionCount: result.transactionCount,
        lastTransactionDate: result.lastTransactionDate
      });
    } catch (error) {
      console.error("Failed to restore backup:", error);
      return res.status(500).json({ message: "Failed to restore backup" });
    }
  });
  
  // Delete backup
  app.delete("/api/admin/backups/:id", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      const adminUser = req.adminUser!;
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';
      
      const backup = await getBackup(req.params.id);
      const result = await deleteBackup(req.params.id);
      
      await logBackupAction(
        'BACKUP_DELETE',
        req.params.id,
        adminUser.id,
        adminUser.email,
        result.success ? 'SUCCESS' : 'FAILED',
        ipAddress,
        userAgent,
        result.error,
        { fileName: backup?.fileName }
      );
      
      if (!result.success) {
        return res.status(500).json({ message: result.error || "Delete failed" });
      }
      
      return res.json({ message: "Backup deleted successfully" });
    } catch (error) {
      console.error("Failed to delete backup:", error);
      return res.status(500).json({ message: "Failed to delete backup" });
    }
  });
  
  // Get backup audit logs
  app.get("/api/admin/backup-audit-logs", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const logs = await getBackupAuditLogs(limit);
      return res.json({ logs });
    } catch (error) {
      console.error("Failed to get backup audit logs:", error);
      return res.status(500).json({ message: "Failed to get backup audit logs" });
    }
  });


  // ============================================================================
  // KYC MANAGEMENT
  // ============================================================================
  
  // Submit KYC
  app.post("/api/kyc", ensureAuthenticated, async (req, res) => {
    try {
      const kycData = insertKycSubmissionSchema.parse(req.body);
      const submission = await storage.createKycSubmission(kycData);
      
      // Update user KYC status
      await storage.updateUser(kycData.userId, {
        kycStatus: "In Progress",
      });
      
      // Create audit log
      await storage.createAuditLog({
        entityType: "kyc",
        entityId: submission.id,
        actionType: "create",
        actor: kycData.userId,
        actorRole: "user",
        details: "KYC submitted",
      });
      
      return res.json({ submission });
    } catch (error) {
      return res.status(400).json({ message: error instanceof Error ? error.message : "KYC submission failed" });
    }
  });
  

  // Reset rejected KYC submission - allows user to resubmit
  app.post("/api/kyc/reset", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { submissionId: reqSubmissionId, kycType: reqKycType } = req.body || {};
      let submissionId: string | null = null;
      let kycType: string = reqKycType || 'kycAml';

      

      if (reqSubmissionId) {
        if (reqKycType === 'finatrades_personal') {
          const personalKyc = await storage.getFinatradesPersonalKycById(reqSubmissionId);
          if (personalKyc && (personalKyc.status === 'Rejected' || personalKyc.status === 'Changes Requested')) {
            submissionId = personalKyc.id;
            kycType = 'finatrades_personal';
            await storage.updateFinatradesPersonalKyc(personalKyc.id, { status: 'In Progress' });
            await storage.updateUser(personalKyc.userId, { kycStatus: "In Progress" });
          }
        } else if (reqKycType === 'finatrades_corporate') {
          const corporateKyc = await storage.getFinatradesCorporateKycById(reqSubmissionId);
          if (corporateKyc && (corporateKyc.status === 'Rejected' || corporateKyc.status === 'Changes Requested')) {
            submissionId = corporateKyc.id;
            kycType = 'finatrades_corporate';
            await storage.updateFinatradesCorporateKyc(corporateKyc.id, { status: 'In Progress' });
            await storage.updateUser(corporateKyc.userId, { kycStatus: "In Progress" });
          }
        }
      }

      if (!submissionId) {
        const kycAmlSubmission = await storage.getKycSubmission(userId);
        if (kycAmlSubmission && (kycAmlSubmission.status === 'Rejected' || kycAmlSubmission.status === 'Changes Requested')) {
          submissionId = kycAmlSubmission.id;
          kycType = 'kycAml';
          await storage.deleteKycSubmission(kycAmlSubmission.id);
        }
      }

      if (!submissionId) {
        const personalKyc = await storage.getFinatradesPersonalKyc(userId);
        if (personalKyc && (personalKyc.status === 'Rejected' || personalKyc.status === 'Changes Requested')) {
          submissionId = personalKyc.id;
          kycType = 'finatrades_personal';
          await storage.updateFinatradesPersonalKyc(personalKyc.id, { status: 'In Progress' });
        }
      }

      if (!submissionId) {
        const corporateKyc = await storage.getFinatradesCorporateKyc(userId);
        if (corporateKyc && (corporateKyc.status === 'Rejected' || corporateKyc.status === 'Changes Requested')) {
          submissionId = corporateKyc.id;
          kycType = 'finatrades_corporate';
          await storage.updateFinatradesCorporateKyc(corporateKyc.id, { status: 'In Progress' });
        }
      }

      if (!submissionId) {
        
        return res.status(404).json({ message: "No rejected or changes-requested KYC submission found" });
      }

      if (!reqSubmissionId) {
        await storage.updateUser(userId, {
          kycStatus: "In Progress",
        });
      }

      await storage.createAuditLog({
        entityType: "kyc",
        entityId: submissionId,
        actionType: "update",
        actor: userId,
        actorRole: "user",
        details: `User reset ${kycType} KYC submission for resubmission`,
      });

      return res.json({ success: true, message: "KYC reset successfully. You can now update and resubmit your verification." });
    } catch (error) {
      return res.status(500).json({ message: error instanceof Error ? error.message : "Failed to reset KYC" });
    }
  });
  // KYC Draft — server-side draft persistence (keyed by userId + submissionType)
  // NOTE: Must be registered BEFORE /api/kyc/:userId to avoid Express shadowing 'draft' as a userId.
  // KYC My Reference — same reason: must be before /api/kyc/:userId
  app.get("/api/kyc/my-reference", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const personal = await storage.getFinatradesPersonalKyc(userId);
      if (personal?.id) {
        const ref = `FT-KYC-${personal.id.replace(/-/g, '').substring(0, 8).toUpperCase()}`;
        const sla = personal.updatedAt ? new Date(new Date(personal.updatedAt).getTime() + 1 * 24 * 60 * 60 * 1000).toISOString() : null;
        return res.json({ referenceNumber: ref, slaDeadline: sla, kycType: 'personal', status: personal.status });
      }
      const corporate = await storage.getFinatradesCorporateKyc(userId);
      if (corporate?.id) {
        const ref = `FT-KYC-${corporate.id.replace(/-/g, '').substring(0, 8).toUpperCase()}`;
        const sla = corporate.updatedAt ? new Date(new Date(corporate.updatedAt).getTime() + 5 * 24 * 60 * 60 * 1000).toISOString() : null;
        return res.json({ referenceNumber: ref, slaDeadline: sla, kycType: 'corporate', status: corporate.status });
      }
      return res.json({ referenceNumber: null, slaDeadline: null });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get KYC reference" });
    }
  });

  app.get("/api/kyc/draft", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) return res.status(401).json({ message: "Not authenticated" });
      const submissionType = (req.query.submissionType as string) || 'personal';
      if (!['personal', 'corporate'].includes(submissionType)) {
        return res.status(400).json({ message: "submissionType must be 'personal' or 'corporate'" });
      }
      const draft = await storage.getKycDraft(userId, submissionType);
      return res.json({ draft: draft || null });
    } catch (err) {
      return res.status(500).json({ message: "Failed to fetch draft" });
    }
  });

  app.put("/api/kyc/draft", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) return res.status(401).json({ message: "Not authenticated" });
      const { submissionType = 'personal', draftData } = req.body;
      if (!['personal', 'corporate'].includes(submissionType)) {
        return res.status(400).json({ message: "submissionType must be 'personal' or 'corporate'" });
      }
      if (!draftData || typeof draftData !== 'object') {
        return res.status(400).json({ message: "draftData is required" });
      }
      // Guard against oversized payloads (max 256 KB serialized)
      const serialized = JSON.stringify(draftData);
      if (serialized.length > 256 * 1024) {
        return res.status(413).json({ message: "draftData payload exceeds 256 KB limit" });
      }
      const draft = await storage.upsertKycDraft(userId, submissionType, draftData);
      return res.json({ draft });
    } catch (err) {
      return res.status(500).json({ message: "Failed to save draft" });
    }
  });

  app.delete("/api/kyc/draft", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) return res.status(401).json({ message: "Not authenticated" });
      const submissionType = (req.query.submissionType as string) || 'personal';
      if (!['personal', 'corporate'].includes(submissionType)) {
        return res.status(400).json({ message: "submissionType must be 'personal' or 'corporate'" });
      }
      await storage.deleteKycDraft(userId, submissionType);
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ message: "Failed to delete draft" });
    }
  });

  // Scan a document (base64) with OCR and return extracted name/DOB fields
  app.post("/api/kyc/scan-document", ensureAuthenticated, async (req, res) => {
    try {
      const { base64, mimeType, declaredName, declaredDob } = req.body;
      console.log(`[KYC Scan] Request received — mimeType: ${mimeType}, base64 length: ${base64?.length ?? 0}, user: ${req.session?.userId}`);
      if (!base64 || typeof base64 !== 'string') {
        return res.status(400).json({ error: 'base64 document data required' });
      }
      if (!mimeType || typeof mimeType !== 'string') {
        return res.status(400).json({ error: 'mimeType required' });
      }
      const supported = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
      if (!supported.includes(mimeType)) {
        return res.status(400).json({ error: 'Unsupported document type' });
      }

      const fields: TieredScanResult = await scanDocumentBase64(base64, mimeType);

      // Compute name + DOB comparison against pre-filled user data
      let verification: {
        nameMatch: boolean | null;
        dobMatch: boolean | null;
        similarity: number | null;
        declaredName: string | null;
        declaredDob: string | null;
      } | null = null;

      if (declaredName || declaredDob) {
        const similarity = (fields.full_name && declaredName)
          ? nameSimilarity(fields.full_name, declaredName)
          : null;
        const dobMatch = (fields.date_of_birth && declaredDob)
          ? fields.date_of_birth === declaredDob
          : null;
        verification = {
          nameMatch: similarity !== null ? similarity >= 0.75 : null,
          dobMatch,
          similarity: similarity !== null ? Math.round(similarity * 100) : null,
          declaredName: (typeof declaredName === 'string' && declaredName) ? declaredName : null,
          declaredDob: (typeof declaredDob === 'string' && declaredDob) ? declaredDob : null,
        };
      }

      return res.json({ success: true, fields, verification });
    } catch (err) {
      console.warn('[KYC] Document scan failed:', err instanceof Error ? err.message : err);
      return res.json({ success: false, fields: { is_identity_document: true, full_name: null, date_of_birth: null, nationality: null, document_number: null, expiry_date: null, source: 'gpt' }, verification: null });
    }
  });

  app.post("/api/kyc/scan-address-proof", ensureAuthenticated, async (req, res) => {
    try {
      const { base64, mimeType, declaredName } = req.body;
      if (!base64 || typeof base64 !== 'string') return res.status(400).json({ error: 'base64 required' });
      if (!mimeType || typeof mimeType !== 'string') return res.status(400).json({ error: 'mimeType required' });

      const fields: AddressProofFields = await extractAddressProofFields(base64, mimeType);

      let nameVerification: { nameMatch: boolean | null; similarity: number | null; declaredName: string | null } | null = null;
      if (declaredName && fields.full_name) {
        const similarity = nameSimilarity(fields.full_name, declaredName);
        nameVerification = { nameMatch: similarity >= 0.75, similarity: Math.round(similarity * 100), declaredName };
      }

      return res.json({ success: true, fields, nameVerification });
    } catch (err) {
      console.warn('[AddressProof Scan] Failed:', err instanceof Error ? err.message : err);
      return res.json({ success: false, fields: { is_address_document: true, document_type_label: null, full_name: null, address: null, city: null, postal_code: null, country: null, document_date: null }, nameVerification: null });
    }
  });

  // Scan corporate document with Groq OCR — verify document type and extract key fields
  app.post("/api/kyc/scan-corporate-document", ensureAuthenticated, async (req, res) => {
    try {
      const { base64, mimeType, documentType, companyName } = req.body;
      if (!base64 || typeof base64 !== 'string') return res.status(400).json({ error: 'base64 required' });
      if (!mimeType || typeof mimeType !== 'string') return res.status(400).json({ error: 'mimeType required' });
      if (!documentType || typeof documentType !== 'string') return res.status(400).json({ error: 'documentType required' });

      const result: CorpDocScanResult = await scanCorporateDocument(
        base64,
        mimeType,
        documentType as CorpDocType,
        companyName ?? undefined,
      );
      console.log(`[CorpDocScan] user=${req.session?.userId} type=${documentType} correct=${result.isCorrectType} conf=${result.confidence}`);
      return res.json({ success: true, result });
    } catch (err) {
      console.warn('[CorpDocScan] Failed:', err instanceof Error ? err.message : err);
      return res.json({ success: false, result: { isCorrectType: true, confidence: 'low', companyNameFound: null, companyNameMatch: null, keyFieldFound: null, issues: ['Scan could not complete — accepted for manual review'], raw: {} } });
    }
  });

  // Get user's KYC submission - PROTECTED: requires matching session
  app.get("/api/kyc/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const submission = await storage.getKycSubmission(req.params.userId);
      return res.json({ submission });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get KYC submission" });
    }
  });
  
  // Unified KYC status updater — single code path for personal, corporate, and AML submissions.
  async function updateKycSubmissionStatus(
    id: string,
    safeUpdates: Record<string, any>,
    fallbackUpdates: Record<string, any>,
  ): Promise<{ submission: any; kycType: string } | null> {
    const personal = await storage.getFinatradesPersonalKycById(id);
    if (personal) {
      const updated = await storage.updateFinatradesPersonalKyc(id, safeUpdates);
      return { submission: updated, kycType: 'finatrades_personal' };
    }
    const corporate = await storage.getFinatradesCorporateKycById(id);
    if (corporate) {
      const updated = await storage.updateFinatradesCorporateKyc(id, safeUpdates);
      return { submission: updated, kycType: 'finatrades_corporate' };
    }
    try {
      const updated = await storage.updateKycSubmission(id, fallbackUpdates);
      return { submission: updated, kycType: 'kycAml' };
    } catch (e) {
      console.error('[KYC] updateKycSubmissionStatus failed for id:', id, e instanceof Error ? e.message : e);
      return null;
    }
  }

  // Update KYC status (Admin) - handles kycAml, Finatrades personal, and corporate KYC
  app.patch("/api/kyc/:id", ensureAdminAsync, requirePermission('manage_kyc'), async (req, res) => {
    try {
      const updates = { ...req.body };
      const adminUser = req.adminUser!;
      
      if (updates.reviewedAt && typeof updates.reviewedAt === 'string') {
        updates.reviewedAt = new Date(updates.reviewedAt);
      }

      const { sectionReviews: sectionReviewsInput, decisionNotes, ...dbUpdates } = updates;

      const safeKycUpdates: any = {};
      if (dbUpdates.status !== undefined) safeKycUpdates.status = dbUpdates.status;
      if (dbUpdates.rejectionReason !== undefined) safeKycUpdates.rejectionReason = dbUpdates.rejectionReason;
      if (dbUpdates.reviewedBy !== undefined) safeKycUpdates.reviewedBy = dbUpdates.reviewedBy;
      if (dbUpdates.reviewedAt !== undefined) safeKycUpdates.reviewedAt = dbUpdates.reviewedAt;

      const result = await updateKycSubmissionStatus(req.params.id, safeKycUpdates, dbUpdates);
      if (!result) {
        notifyError({ error: new Error(`KYC submission not found: ${req.params.id}`), context: `KYC update failed`, route: req.originalUrl });
      }

      let submission = result?.submission ?? null;
      let kycType = result?.kycType ?? 'kycAml';
      
      if (!submission) {
        return res.status(404).json({ message: "KYC submission not found" });
      }
      
      if (req.body.status) {
        await storage.updateUser(submission.userId, { kycStatus: req.body.status });

        const latestVersion = await storage.getLatestKycVersion(req.params.id);

        if (latestVersion && (req.body.status === 'Approved' || req.body.status === 'Rejected' || req.body.status === 'Changes Requested')) {
          const versionStatus = req.body.status === 'Approved' ? 'approved' : req.body.status === 'Rejected' ? 'rejected' : 'changes_requested';
          await storage.updateKycVersion(latestVersion.id, {
            status: versionStatus,
            lockedAt: new Date(),
          });

          if (Array.isArray(sectionReviewsInput) && sectionReviewsInput.length > 0) {
            for (const sr of sectionReviewsInput) {
              await storage.createKycSectionReview({
                versionId: latestVersion.id,
                submissionId: req.params.id,
                sectionName: sr.section,
                status: sr.status,
                reasonCode: sr.reasonCode || null,
                freeText: sr.freeText || null,
                reviewedBy: adminUser?.id || 'admin',
                reviewedAt: new Date(),
              });
            }
            // Persist change-requested sections directly on submission for authoritative unlock (both personal + corporate)
            const rejectedSectionNames = sectionReviewsInput
              .filter((s: any) => s.status === 'rejected')
              .map((s: any) => s.section as string);
            if (kycType === 'finatrades_personal') {
              await storage.updateFinatradesPersonalKyc(req.params.id, {
                changeRequestedSections: rejectedSectionNames,
              }).catch((err: Error) => console.error('[KYC] Failed to persist changeRequestedSections for personal submission:', err?.message));
            } else if (kycType === 'finatrades_corporate') {
              await storage.updateFinatradesCorporateKyc(req.params.id, {
                changeRequestedSections: rejectedSectionNames,
              }).catch((err: Error) => console.error('[KYC] Failed to persist changeRequestedSections for corporate submission:', err?.message));
            }
          }

          await storage.createKycDecisionRecord({
            versionId: latestVersion.id,
            submissionId: req.params.id,
            userId: submission.userId,
            decision: req.body.status,
            decidedBy: adminUser?.id || 'admin',
            decidedByName: adminUser ? `${adminUser.firstName} ${adminUser.lastName}` : 'Admin',
            notes: decisionNotes || req.body.rejectionReason || null,
            sectionReviews: sectionReviewsInput || null,
            decidedAt: new Date(),
          });
        }
        
        const user = await storage.getUser(submission.userId);
        let emailSent = false;
        if (user) {
          const baseUrl = process.env.REPLIT_DEV_DOMAIN || 'https://finatrades.com';
          if (req.body.status === 'Approved') {
            const emailResult = await sendEmail(user.email, EMAIL_TEMPLATES.KYC_APPROVED, {
              user_name: `${user.firstName} ${user.lastName}`,
              dashboard_url: `${baseUrl}/dashboard`,
            });
            emailSent = emailResult.success;
            
            await storage.createNotification({
              userId: submission.userId,
              title: 'KYC Approved',
              message: 'Congratulations! Your identity verification has been approved. You now have full access to all Finatrades features.',
              type: 'success',
              link: '/dashboard',
              read: false,
            });

            /* WingoldUserSyncService removed */
            import('./push-notifications').then(({ sendFinancialPushNotification }) => {
              sendFinancialPushNotification(submission.userId, 'kyc_approved', {}).catch(err => console.error('[Push] KYC approved notification failed:', err));
            });

            // FIXME: issueKycCredential requires a `claims` argument that
            // is not constructed here. The cast preserves prior behavior
            // (the call rejects at runtime); fix tracked separately.
            (credentialIssuer.issueKycCredential as any)(user).then((credential: any) => {
              console.log("[VC] Verifiable credential issued on KYC approval for user:", submission.userId, "credentialId:", credential?.credentialId);
            }).catch((err: any) => console.error("[VC] Failed to issue verifiable credential on KYC approval:", err));
          } else if (req.body.status === 'Rejected') {
            const rejectionSummary = Array.isArray(sectionReviewsInput)
              ? sectionReviewsInput.filter((s: any) => s.status === 'rejected').map((s: any) => `${s.section}: ${s.freeText || s.reasonCode || 'Not specified'}`).join('; ')
              : req.body.rejectionReason || 'Documents could not be verified';

            const emailResult = await sendEmail(user.email, EMAIL_TEMPLATES.KYC_REJECTED, {
              user_name: `${user.firstName} ${user.lastName}`,
              rejection_reason: rejectionSummary,
              kyc_url: `${baseUrl}/kyc`,
            });
            emailSent = emailResult.success;
            
            await storage.createNotification({
              userId: submission.userId,
              title: 'KYC Rejected',
              message: rejectionSummary,
              type: 'error',
              link: '/kyc',
              read: false,
            });

            import('./push-notifications').then(({ sendFinancialPushNotification }) => {
              sendFinancialPushNotification(submission.userId, 'kyc_rejected', { reason: rejectionSummary }).catch(err => console.error('[Push] KYC rejected notification failed:', err));
            });

            /* WingoldUserSyncService removed */
          } else if (req.body.status === 'Changes Requested') {
            const rejectedSections = Array.isArray(sectionReviewsInput)
              ? sectionReviewsInput.filter((s: any) => s.status === 'rejected')
              : [];
            const sectionReasonsHtml = rejectedSections.length > 0
              ? `<ul style="margin: 15px 0; padding-left: 20px;">${rejectedSections.map((s: any) => `<li style="margin-bottom: 8px;"><strong>${s.section}:</strong> ${s.freeText || s.reasonCode || 'Update required'}</li>`).join('')}</ul>`
              : '<p>Please review your submission for required updates.</p>';

            const emailResult = await sendEmail(user.email, EMAIL_TEMPLATES.KYC_CHANGES_REQUESTED, {
              user_name: `${user.firstName} ${user.lastName}`,
              section_reasons: sectionReasonsHtml,
              kyc_url: `${baseUrl}/kyc?resubmit=true`,
            });
            emailSent = emailResult.success;

            await storage.createNotification({
              userId: submission.userId,
              title: 'KYC Changes Requested',
              message: 'Our compliance team has reviewed your submission and requires updates to some sections. Please check your KYC page for details.',
              type: 'warning',
              link: '/kyc?resubmit=true',
              read: false,
            });
          }
        }
        
        // `kyc_update` is a domain-specific event type not in emitLedgerEvent's
        // declared union, and timestamp/syncVersion are extra fields not in the
        // declared shape. Cast is intentional pending a wider refactor of the
        // socket event type to include KYC events.
        emitLedgerEvent(submission.userId, {
          type: 'kyc_update',
          module: 'system',
          action: `kyc_${req.body.status.toLowerCase().replace(/\s+/g, '_')}`,
          data: { status: req.body.status, submissionId: req.params.id },
          timestamp: new Date().toISOString(),
          syncVersion: Date.now(),
        } as any);

        return res.json({ submission, emailSent, kycType });
      }
      
      return res.json({ submission, kycType });
    } catch (error) {
      console.error("KYC update error:", error);
      const message = error instanceof Error ? error.message : "Failed to update KYC";
      return res.status(400).json({ message });
    }
  });

  // Get KYC reason codes (public for frontend use)
  app.get("/api/kyc/reason-codes", ensureAuthenticated, async (_req, res) => {
    try {
      const codes = await storage.getKycReasonCodes();
      return res.json({ reasonCodes: codes });
    } catch (error) {
      return res.status(500).json({ message: "Failed to fetch reason codes" });
    }
  });

  // Get KYC version history (Admin)
  app.get("/api/admin/kyc/:id/versions", ensureAdminAsync, requirePermission('view_kyc', 'manage_kyc'), async (req, res) => {
    try {
      const versions = await storage.getKycVersions(req.params.id);
      return res.json({ versions });
    } catch (error) {
      return res.status(500).json({ message: "Failed to fetch KYC versions" });
    }
  });

  // Get KYC section reviews for latest version (Admin + User)
  app.get("/api/kyc/:id/section-reviews", ensureAuthenticated, async (req, res) => {
    try {
      const latestVersion = await storage.getLatestKycVersion(req.params.id);
      if (!latestVersion) {
        return res.json({ reviews: [] });
      }
      const reviews = await storage.getKycSectionReviews(latestVersion.id);
      return res.json({ reviews });
    } catch (error) {
      return res.status(500).json({ message: "Failed to fetch section reviews" });
    }
  });

  // Get KYC decision records (Admin)
  app.get("/api/admin/kyc/:id/decisions", ensureAdminAsync, requirePermission('view_kyc', 'manage_kyc'), async (req, res) => {
    try {
      const decisions = await storage.getKycDecisionRecords(req.params.id);
      return res.json({ decisions });
    } catch (error) {
      return res.status(500).json({ message: "Failed to fetch decision records" });
    }
  });

  // Claim KYC review (Admin)
  app.post("/api/admin/kyc/:id/claim", ensureAdminAsync, requirePermission('manage_kyc'), async (req, res) => {
    try {
      const adminUser = req.adminUser!;
      let submission: any = await storage.updateKycSubmission(req.params.id, {
        status: 'In Review',
        reviewedBy: adminUser?.id || 'admin',
      });
      let kycType = 'kycAml';

      if (!submission) {
        submission = await storage.updateFinatradesPersonalKyc(req.params.id, {
          status: 'In Review',
          reviewedBy: adminUser?.id || 'admin',
        });
        kycType = 'finatrades_personal';
      }
      if (!submission) {
        submission = await storage.updateFinatradesCorporateKyc(req.params.id, {
          status: 'In Review',
          reviewedBy: adminUser?.id || 'admin',
        });
        kycType = 'finatrades_corporate';
      }

      if (!submission) {
        return res.status(404).json({ message: "KYC submission not found" });
      }

      await storage.updateUser(submission.userId, { kycStatus: 'In Review' });

      await storage.createNotification({
        userId: submission.userId,
        title: 'Your KYC is Under Active Review',
        message: 'A compliance officer has started reviewing your KYC submission. You will be notified of the outcome by email as soon as a decision is made.',
        type: 'info',
        link: '/kyc',
      });

      const latestVersion = await storage.getLatestKycVersion(req.params.id);
      if (latestVersion) {
        await storage.updateKycVersion(latestVersion.id, { status: 'in_review' });
      }

      await storage.createAuditLog({
        entityType: "kyc",
        entityId: req.params.id,
        actionType: "update",
        actor: adminUser?.id || "admin",
        actorRole: "admin",
        details: `KYC review claimed by ${adminUser?.firstName || 'admin'} ${adminUser?.lastName || ''}`,
      });

      return res.json({ submission, kycType, message: "Review claimed successfully" });
    } catch (error) {
      return res.status(400).json({ message: "Failed to claim review" });
    }
  });

  // Release KYC review (Admin)
  app.post("/api/admin/kyc/:id/release", ensureAdminAsync, requirePermission('manage_kyc'), async (req, res) => {
    try {
      let submission: any = await storage.updateKycSubmission(req.params.id, {
        status: 'Pending Review',
        reviewedBy: null,
      });
      let kycType = 'kycAml';

      if (!submission) {
        submission = await storage.updateFinatradesPersonalKyc(req.params.id, {
          status: 'Pending Review',
          reviewedBy: null,
        });
        kycType = 'finatrades_personal';
      }
      if (!submission) {
        submission = await storage.updateFinatradesCorporateKyc(req.params.id, {
          status: 'Pending Review',
          reviewedBy: null,
        });
        kycType = 'finatrades_corporate';
      }

      if (!submission) {
        return res.status(404).json({ message: "KYC submission not found" });
      }

      await storage.updateUser(submission.userId, { kycStatus: 'Pending Review' });

      const latestVersion = await storage.getLatestKycVersion(req.params.id);
      if (latestVersion) {
        await storage.updateKycVersion(latestVersion.id, { status: 'submitted' });
      }

      return res.json({ submission, kycType, message: "Review released" });
    } catch (error) {
      return res.status(400).json({ message: "Failed to release review" });
    }
  });

  // Simple test endpoint to verify admin access
  app.get("/api/admin/kyc-test", ensureAdminAsync, requirePermission('manage_kyc'), async (req, res) => {
    return res.json({ success: true, message: "Admin KYC test endpoint works", timestamp: new Date().toISOString() });
  });

  // Test endpoint with permission check
  app.get("/api/admin/kyc-test2", ensureAdminAsync, requirePermission('view_kyc', 'manage_kyc'), async (req, res) => {
    return res.json({ success: true, message: "Admin KYC test2 with permissions works", timestamp: new Date().toISOString() });
  });

  // Test endpoint that calls storage functions
  app.get("/api/admin/kyc-test3", ensureAdminAsync, requirePermission('view_kyc', 'manage_kyc'), async (req, res) => {
    const results: any = { success: true, timestamp: new Date().toISOString() };
    try {
      const kycAml = await storage.getAllKycSubmissions();
      results.kycAmlCount = Array.isArray(kycAml) ? kycAml.length : 'not array';
    } catch (e: any) {
      results.kycAmlError = e?.message || String(e);
    }
    try {
      const personal = await storage.getAllFinatradesPersonalKyc();
      results.personalCount = Array.isArray(personal) ? personal.length : 'not array';
    } catch (e: any) {
      results.personalError = e?.message || String(e);
    }
    try {
      const corporate = await storage.getAllFinatradesCorporateKyc();
      results.corporateCount = Array.isArray(corporate) ? corporate.length : 'not array';
    } catch (e: any) {
      results.corporateError = e?.message || String(e);
    }
    return res.json(results);
  });

  // Get all KYC submissions (Admin)
  app.get("/api/admin/kyc", ensureAdminAsync, requirePermission('view_kyc', 'manage_kyc'), async (req, res) => {
    try {
      const startTime = Date.now();
      const { status, type, page = '1', limit = '50' } = req.query;
      const pageNum = Math.max(1, parseInt(page as string) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 50));
      const statusFilter = (status as string) || 'all';
      const typeFilter = (type as string) || 'all';
      
      // For merged tables, we need to fetch enough records to paginate properly
      // We fetch 2x the limit from each table to ensure we have enough after merging
      const fetchLimit = limitNum * 3;
      
      // Run all queries in PARALLEL with database-level limits
      const [kycAmlResult, personalResult, corporateResult] = await Promise.all([
        typeFilter === 'all' || typeFilter === 'kycAml' 
          ? storage.getKycSubmissionsPaginated({ status: statusFilter, limit: fetchLimit, offset: 0 })
              .catch((e: any) => { console.error("KYC AML error:", e); return { data: [], total: 0 }; })
            ?? storage.getAllKycSubmissions().then((data: any) => ({ data: data.slice(0, fetchLimit), total: data.length })).catch(() => ({ data: [], total: 0 }))
          : Promise.resolve({ data: [], total: 0 }),
          
        typeFilter === 'all' || typeFilter === 'finatrades_personal'
          ? storage.getFinatradesPersonalKycPaginated({ status: statusFilter, limit: fetchLimit, offset: 0 })
              .catch((e: any) => { console.error("Personal KYC error:", e); return { data: [], total: 0 }; })
            ?? storage.getAllFinatradesPersonalKyc().then((data: any) => ({ data: data.slice(0, fetchLimit), total: data.length })).catch(() => ({ data: [], total: 0 }))
          : Promise.resolve({ data: [], total: 0 }),
          
        typeFilter === 'all' || typeFilter === 'finatrades_corporate'
          ? storage.getFinatradesCorporateKycPaginated({ status: statusFilter, limit: fetchLimit, offset: 0 })
              .catch((e: any) => { console.error("Corporate KYC error:", e); return { data: [], total: 0 }; })
            ?? storage.getAllFinatradesCorporateKyc().then((data: any) => ({ data: data.slice(0, fetchLimit), total: data.length })).catch(() => ({ data: [], total: 0 }))
          : Promise.resolve({ data: [], total: 0 })
      ]);
      
      const kycAmlArray = Array.isArray(kycAmlResult?.data) ? kycAmlResult.data : [];
      const personalArray = Array.isArray(personalResult?.data) ? personalResult.data : [];
      const corporateArray = Array.isArray(corporateResult?.data) ? corporateResult.data : [];
      
      // Calculate total from filtered counts
      const totalRecords = (kycAmlResult?.total || 0) + (personalResult?.total || 0) + (corporateResult?.total || 0);
      
      // Normalize all submissions
      const allSubmissions: any[] = [];
      
      for (const s of kycAmlArray) {
        if (s) allSubmissions.push({ ...s, kycType: 'kycAml' });
      }
      
      for (const s of personalArray) {
        if (s) allSubmissions.push({
          ...s,
          tier: 'finatrades_personal',
          kycType: 'finatrades_personal',
          accountType: 'personal',
        });
      }
      
      for (const s of corporateArray) {
        if (s) allSubmissions.push({
          ...s,
          tier: 'finatrades_corporate',
          kycType: 'finatrades_corporate',
          accountType: 'business',
          fullName: s?.companyName || null,
        });
      }
      
      // Sort by creation date
      allSubmissions.sort((a, b) => {
        const dateA = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      
      // Paginate the merged and sorted results
      const startIndex = (pageNum - 1) * limitNum;
      const paginatedSubmissions = allSubmissions.slice(startIndex, startIndex + limitNum);
      const totalPages = Math.ceil(totalRecords / limitNum);

      // Resolve reviewer names for submissions that have reviewedBy
      const reviewerIds = [...new Set(paginatedSubmissions.map(s => s.reviewedBy).filter(Boolean))];
      const reviewerMap: Record<string, string> = {};
      if (reviewerIds.length > 0) {
        for (const rid of reviewerIds) {
          try {
            const reviewer = await storage.getUser(rid);
            if (reviewer) {
              reviewerMap[rid] = `${reviewer.firstName || ''} ${reviewer.lastName || ''}`.trim() || reviewer.email;
            }
          } catch {}
        }
      }
      for (const s of paginatedSubmissions) {
        if (s.reviewedBy && reviewerMap[s.reviewedBy]) {
          s.reviewedByName = reviewerMap[s.reviewedBy];
        }
      }
      
      const duration = Date.now() - startTime;
      console.log(`[KYC] Admin query: ${duration}ms, ${totalRecords} total, page ${pageNum}/${totalPages}`);
      
      return res.json({ 
        submissions: paginatedSubmissions,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalRecords,
          totalPages,
          hasMore: pageNum < totalPages
        },
        timing: { durationMs: duration }
      });
    } catch (error: any) {
      console.error("KYC endpoint error:", error);
      return res.status(500).json({ message: "Failed to fetch KYC submissions", error: error?.message });
    }
  });

  // ============================================================================
  // KYC WORKFLOW - TIERED VERIFICATION & STATE MACHINE
  // ============================================================================
  // ============================================================================
  // ============================================================================
  // Submit tiered KYC with SLA tracking
  app.post("/api/kyc/submit-tiered", ensureAuthenticated, async (req, res) => {
    try {
      const { userId, accountType, ...kycData } = req.body;

      // Single-stage Finatrades review SLA (5 business days max)
      const slaDeadline = new Date();
      slaDeadline.setDate(slaDeadline.getDate() + 5);

      const submission = await storage.createKycSubmission({
        userId,
        accountType: accountType || 'personal',
        status: 'Pending Review',
        screeningStatus: 'Pending',
        slaDeadline,
        ...kycData,
      });
      
      // Update user KYC status
      await storage.updateUser(userId, { kycStatus: "In Progress" });
      
      // Create or update user risk profile
      await storage.getOrCreateUserRiskProfile(userId);
      
      // Create audit log
      await storage.createAuditLog({
        entityType: "kyc",
        entityId: submission.id,
        actionType: "create",
        actor: userId,
        actorRole: "user",
        details: `Finatrades KYC (${accountType}) submitted - SLA deadline: ${slaDeadline.toISOString()}`,
      });

      // Log platform activity
      logActivity({
        type: 'kyc_submission',
        title: 'KYC Submission',
        description: `Finatrades ${accountType} KYC submitted`,
        details: { accountType, slaDeadline: slaDeadline.toISOString() },
        severity: 'info',
      });
      
      return res.json({ submission, slaDeadline });
    } catch (error) {
      console.error("Tiered KYC submission error:", error);
      return res.status(400).json({ message: error instanceof Error ? error.message : "KYC submission failed" });
    }
  });

  // Escalate KYC submission (Admin)
  app.post("/api/admin/kyc/:id/escalate", ensureAdminAsync, requirePermission('manage_kyc'), async (req, res) => {
    try {
      const { escalatedTo, escalationReason, adminId } = req.body;
      
      const submission = await storage.updateKycSubmission(req.params.id, {
        status: 'Escalated',
        escalatedAt: new Date(),
        escalatedTo,
        reviewNotes: escalationReason,
      });
      
      if (!submission) {
        return res.status(404).json({ message: "KYC submission not found" });
      }
      
      // Update user KYC status
      await storage.updateUser(submission.userId, { kycStatus: "Escalated" });
      
      // Create audit log
      await storage.createAuditLog({
        entityType: "kyc",
        entityId: req.params.id,
        actionType: "update",
        actor: adminId || "admin",
        actorRole: "admin",
        details: `KYC escalated to ${escalatedTo}: ${escalationReason}`,
      });
      
      return res.json({ submission });
    } catch (error) {
      return res.status(400).json({ message: "Failed to escalate KYC" });
    }
  });

  // Run AML screening on KYC submission (Admin)
  app.post("/api/admin/kyc/:id/screen", ensureAdminAsync, requirePermission('manage_kyc'), async (req, res) => {
    try {
      const { adminId, screeningType } = req.body;
      const kycId = req.params.id;
      
      // Get KYC submission
      const allSubmissions = await storage.getAllKycSubmissions();
      const submission = allSubmissions.find(s => s.id === kycId);
      
      if (!submission) {
        return res.status(404).json({ message: "KYC submission not found" });
      }
      
      // Simulate screening check (in production, integrate with Sumsub/Onfido)
      const screeningTypes = screeningType ? [screeningType] : ['sanctions', 'pep', 'adverse_media'];
      const screeningResults: any[] = [];
      
      for (const type of screeningTypes) {
        // Create screening log
        const screeningLog = await storage.createAmlScreeningLog({
          userId: submission.userId,
          kycSubmissionId: kycId,
          screeningType: type,
          provider: 'internal',
          status: 'Clear',
          matchFound: false,
          matchScore: 0,
        });
        screeningResults.push(screeningLog);
      }
      
      // Update KYC submission with screening results
      await storage.updateKycSubmission(kycId, {
        screeningStatus: 'Clear',
        screeningResults: {
          sanctions: { checked: true, matchFound: false, checkedAt: new Date().toISOString() },
          pep: { checked: true, matchFound: false, checkedAt: new Date().toISOString() },
          adverseMedia: { checked: true, matchFound: false, checkedAt: new Date().toISOString() },
        },
      });
      
      // Update user risk profile
      const riskProfile = await storage.getOrCreateUserRiskProfile(submission.userId);
      await storage.updateUserRiskProfile(riskProfile.id, {
        screeningRisk: 0,
        isPep: false,
        isSanctioned: false,
        hasAdverseMedia: false,
        lastAssessedAt: new Date(),
        lastAssessedBy: adminId,
      });
      
      // Create audit log
      await storage.createAuditLog({
        entityType: "kyc",
        entityId: kycId,
        actionType: "update",
        actor: adminId || "admin",
        actorRole: "admin",
        details: `AML screening completed - Status: Clear`,
      });
      
      return res.json({ screeningResults, status: 'Clear' });
    } catch (error) {
      console.error("AML screening error:", error);
      return res.status(400).json({ message: "Failed to run AML screening" });
    }
  });

  // Get KYC submissions pending SLA breach (Admin)
  app.get("/api/admin/kyc/sla-alerts", ensureAdminAsync, requirePermission('view_kyc', 'manage_kyc'), async (req, res) => {
    try {
      const submissions = await storage.getAllKycSubmissions();
      const now = new Date();
      
      const slaAlerts = submissions
        .filter(s => s.status === 'Pending Review' || s.status === 'In Progress')
        .filter(s => s.slaDeadline && new Date(s.slaDeadline) <= new Date(now.getTime() + 24 * 60 * 60 * 1000))
        .map(s => ({
          ...s,
          hoursRemaining: s.slaDeadline ? Math.max(0, (new Date(s.slaDeadline).getTime() - now.getTime()) / (1000 * 60 * 60)) : null,
          isBreached: s.slaDeadline ? new Date(s.slaDeadline) < now : false,
        }));
      
      return res.json({ slaAlerts });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get SLA alerts" });
    }
  });

  // ============================================================================
  // USER RISK PROFILES
  // ============================================================================

  // Get user risk profile
  app.get("/api/risk-profile/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const profile = await storage.getOrCreateUserRiskProfile(req.params.userId);
      return res.json({ profile });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get risk profile" });
    }
  });

  // Get all risk profiles (Admin)
  app.get("/api/admin/risk-profiles", ensureAdminAsync, requirePermission('view_kyc', 'manage_kyc'), async (req, res) => {
    try {
      const profiles = await storage.getAllUserRiskProfiles();
      return res.json({ profiles });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get risk profiles" });
    }
  });

  // Get high-risk profiles (Admin)
  app.get("/api/admin/risk-profiles/high-risk", ensureAdminAsync, requirePermission('view_kyc', 'manage_kyc'), async (req, res) => {
    try {
      const profiles = await storage.getHighRiskProfiles();
      return res.json({ profiles });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get high-risk profiles" });
    }
  });

  // Update user risk profile (Admin)
  app.patch("/api/admin/risk-profile/:id", ensureAdminAsync, requirePermission('manage_kyc'), async (req, res) => {
    try {
      const { adminId, ...updates } = req.body;
      
      const profile = await storage.updateUserRiskProfile(req.params.id, {
        ...updates,
        lastAssessedAt: new Date(),
        lastAssessedBy: adminId,
      });
      
      if (!profile) {
        return res.status(404).json({ message: "Risk profile not found" });
      }
      
      // Create audit log
      await storage.createAuditLog({
        entityType: "risk_profile",
        entityId: req.params.id,
        actionType: "update",
        actor: adminId || "admin",
        actorRole: "admin",
        details: `Risk profile updated - Level: ${updates.riskLevel || profile.riskLevel}`,
      });
      
      return res.json({ profile });
    } catch (error) {
      return res.status(400).json({ message: "Failed to update risk profile" });
    }
  });

  // Calculate and update user risk score (Admin)
  app.post("/api/admin/risk-profile/:userId/calculate", ensureAdminAsync, requirePermission('manage_kyc'), async (req, res) => {
    try {
      const { userId } = req.params;
      const adminUser = req.adminUser!;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const profile = await updateUserRiskProfile(userId, adminUser.id);
      
      await storage.createAuditLog({
        entityType: "risk_profile",
        entityId: profile.id,
        actionType: "update",
        actor: adminUser.id,
        actorRole: "admin",
        details: `Risk score calculated - Score: ${profile.overallRiskScore}, Level: ${profile.riskLevel}`,
      });
      
      return res.json({ profile });
    } catch (error) {
      console.error("Risk calculation error:", error);
      return res.status(400).json({ message: "Failed to calculate risk score" });
    }
  });

  // Get risk score preview without saving (Admin)
  app.get("/api/admin/risk-profile/:userId/preview", ensureAdminAsync, requirePermission('view_kyc', 'manage_kyc'), async (req, res) => {
    try {
      const { userId } = req.params;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const riskScore = await calculateUserRiskScore(userId);
      return res.json({ riskScore });
    } catch (error) {
      console.error("Risk preview error:", error);
      return res.status(400).json({ message: "Failed to preview risk score" });
    }
  });

  // Check transaction against user limits
  app.post("/api/risk/check-limits", async (req, res) => {
    try {
      const { userId, amountUsd } = req.body;
      
      if (!userId || amountUsd === undefined) {
        return res.status(400).json({ message: "userId and amountUsd are required" });
      }
      
      const result = await checkTransactionAgainstLimits(userId, amountUsd);
      return res.json(result);
    } catch (error) {
      console.error("Limit check error:", error);
      return res.status(400).json({ message: "Failed to check transaction limits" });
    }
  });

  // Get country risk information
  app.get("/api/risk/countries", async (req, res) => {
    try {
        return res.json({
        highRisk: HIGH_RISK_COUNTRIES,
        elevated: ELEVATED_RISK_COUNTRIES
      });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get country risk data" });
    }
  });

  // Batch calculate risk scores for all users (Admin)
  app.post("/api/admin/risk-profiles/batch-calculate", ensureAdminAsync, requirePermission('manage_kyc'), async (req, res) => {
    try {
      const adminUser = req.adminUser!;
      const users = await storage.getAllUsers();
      
      const results = [];
      for (const user of users) {
        if (user.role !== 'admin') {
          try {
            const profile = await updateUserRiskProfile(user.id, adminUser.id);
            results.push({ userId: user.id, status: 'success', riskLevel: profile.riskLevel });
          } catch (e) {
            results.push({ userId: user.id, status: 'error', error: (e as Error).message });
          }
        }
      }
      
      return res.json({ processed: results.length, results });
    } catch (error) {
      console.error("Batch calculation error:", error);
      return res.status(400).json({ message: "Failed to batch calculate risk scores" });
    }
  });

  // ============================================================================
  // AML SCREENING LOGS
  // ============================================================================

  // Get user screening logs
  app.get("/api/screening-logs/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const logs = await storage.getUserAmlScreeningLogs(req.params.userId);
      return res.json({ logs });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get screening logs" });
    }
  });

  // Get all screening logs (Admin)
  app.get("/api/admin/screening-logs", ensureAdminAsync, requirePermission('view_kyc', 'manage_kyc'), async (req, res) => {
    try {
      const logs = await storage.getAllAmlScreeningLogs();
      return res.json({ logs });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get screening logs" });
    }
  });

  // Review screening log (Admin)
  app.patch("/api/admin/screening-logs/:id", ensureAdminAsync, requirePermission('manage_kyc'), async (req, res) => {
    try {
      const { adminId, reviewDecision, reviewNotes } = req.body;
      
      const log = await storage.updateAmlScreeningLog(req.params.id, {
        reviewedBy: adminId,
        reviewedAt: new Date(),
        reviewDecision,
        reviewNotes,
        status: reviewDecision === 'cleared' ? 'Clear' : reviewDecision === 'escalated' ? 'Escalated' : 'Manual Review',
      });
      
      if (!log) {
        return res.status(404).json({ message: "Screening log not found" });
      }
      
      return res.json({ log });
    } catch (error) {
      return res.status(400).json({ message: "Failed to update screening log" });
    }
  });

  // ============================================================================
  // AML CASES
  // ============================================================================

  // Get all AML cases (Admin)
  app.get("/api/admin/aml-cases", ensureAdminAsync, requirePermission('view_kyc', 'manage_kyc'), async (req, res) => {
    try {
      const cases = await storage.getAllAmlCases();
      return res.json({ cases });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get AML cases" });
    }
  });

  // Get open AML cases (Admin)
  app.get("/api/admin/aml-cases/open", ensureAdminAsync, requirePermission('view_kyc', 'manage_kyc'), async (req, res) => {
    try {
      const cases = await storage.getOpenAmlCases();
      return res.json({ cases });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get open AML cases" });
    }
  });

  // Get single AML case with activities (Admin)
  app.get("/api/admin/aml-cases/:id", ensureAdminAsync, requirePermission('view_kyc', 'manage_kyc'), async (req, res) => {
    try {
      const amlCase = await storage.getAmlCase(req.params.id);
      if (!amlCase) {
        return res.status(404).json({ message: "AML case not found" });
      }
      
      const activities = await storage.getAmlCaseActivities(req.params.id);
      const user = await storage.getUser(amlCase.userId);
      
      return res.json({ case: amlCase, activities, user });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get AML case" });
    }
  });

  // Create AML case (Admin)
  app.post("/api/admin/aml-cases", ensureAdminAsync, requirePermission('manage_kyc'), async (req, res) => {
    try {
      const { userId, caseType, priority, triggeredBy, triggerDetails, adminId } = req.body;
      
      const caseNumber = await storage.generateAmlCaseNumber();
      
      const amlCase = await storage.createAmlCase({
        caseNumber,
        userId,
        caseType,
        status: 'Open',
        priority: priority || 'Medium',
        triggeredBy: triggeredBy || 'manual',
        triggerDetails,
      });
      
      // Create initial activity
      await storage.createAmlCaseActivity({
        caseId: amlCase.id,
        activityType: 'created',
        description: `AML case created - Type: ${caseType}`,
        performedBy: adminId || 'system',
        performedAt: new Date(),
      });
      
      // Create audit log
      await storage.createAuditLog({
        entityType: "aml_case",
        entityId: amlCase.id,
        actionType: "create",
        actor: adminId || "system",
        actorRole: "admin",
        details: `AML case ${caseNumber} created`,
      });
      
      return res.json({ case: amlCase });
    } catch (error) {
      console.error("Create AML case error:", error);
      return res.status(400).json({ message: "Failed to create AML case" });
    }
  });

  // Update AML case (Admin)
  app.patch("/api/admin/aml-cases/:id", ensureAdminAsync, requirePermission('manage_kyc'), async (req, res) => {
    try {
      const { adminId, ...updates } = req.body;
      const previousCase = await storage.getAmlCase(req.params.id);
      
      if (!previousCase) {
        return res.status(404).json({ message: "AML case not found" });
      }
      
      // Handle assignment
      if (updates.assignedTo && updates.assignedTo !== previousCase.assignedTo) {
        updates.assignedAt = new Date();
        
        await storage.createAmlCaseActivity({
          caseId: req.params.id,
          activityType: 'assigned',
          description: `Case assigned to ${updates.assignedTo}`,
          previousValue: previousCase.assignedTo || 'Unassigned',
          newValue: updates.assignedTo,
          performedBy: adminId || 'admin',
          performedAt: new Date(),
        });
      }
      
      // Handle status change
      if (updates.status && updates.status !== previousCase.status) {
        await storage.createAmlCaseActivity({
          caseId: req.params.id,
          activityType: 'status_changed',
          description: `Status changed from ${previousCase.status} to ${updates.status}`,
          previousValue: previousCase.status,
          newValue: updates.status,
          performedBy: adminId || 'admin',
          performedAt: new Date(),
        });
        
        // Handle resolution
        if (updates.status.startsWith('Closed')) {
          updates.resolvedBy = adminId;
          updates.resolvedAt = new Date();
        }
      }
      
      // Handle SAR filing
      if (updates.sarFiledAt && !previousCase.sarFiledAt) {
        await storage.createAmlCaseActivity({
          caseId: req.params.id,
          activityType: 'sar_filed',
          description: `SAR filed - Reference: ${updates.sarReferenceNumber || 'N/A'}`,
          performedBy: adminId || 'admin',
          performedAt: new Date(),
        });
      }
      
      const amlCase = await storage.updateAmlCase(req.params.id, updates);
      
      // Create audit log
      await storage.createAuditLog({
        entityType: "aml_case",
        entityId: req.params.id,
        actionType: "update",
        actor: adminId || "admin",
        actorRole: "admin",
        details: `AML case updated`,
      });
      
      return res.json({ case: amlCase });
    } catch (error) {
      return res.status(400).json({ message: "Failed to update AML case" });
    }
  });

  // Add note to AML case (Admin)
  app.post("/api/admin/aml-cases/:id/notes", ensureAdminAsync, requirePermission('manage_kyc'), async (req, res) => {
    try {
      const { adminId, note } = req.body;
      
      const amlCase = await storage.getAmlCase(req.params.id);
      if (!amlCase) {
        return res.status(404).json({ message: "AML case not found" });
      }
      
      // Append to investigation notes
      const existingNotes = amlCase.investigationNotes || '';
      const timestamp = new Date().toISOString();
      const newNotes = existingNotes 
        ? `${existingNotes}\n\n[${timestamp}] ${adminId}: ${note}`
        : `[${timestamp}] ${adminId}: ${note}`;
      
      await storage.updateAmlCase(req.params.id, {
        investigationNotes: newNotes,
      });
      
      // Create activity
      await storage.createAmlCaseActivity({
        caseId: req.params.id,
        activityType: 'note_added',
        description: note,
        performedBy: adminId || 'admin',
        performedAt: new Date(),
      });
      
      return res.json({ message: "Note added successfully" });
    } catch (error) {
      return res.status(400).json({ message: "Failed to add note" });
    }
  });

  // ============================================================================
  // AML MONITORING RULES
  // ============================================================================

  // Get all monitoring rules (Admin)
  app.get("/api/admin/aml-rules", ensureAdminAsync, requirePermission('view_kyc', 'manage_kyc'), async (req, res) => {
    try {
      const rules = await storage.getAllAmlMonitoringRules();
      return res.json({ rules });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get AML rules" });
    }
  });

  // Get active monitoring rules (Admin)
  app.get("/api/admin/aml-rules/active", ensureAdminAsync, requirePermission('view_kyc', 'manage_kyc'), async (req, res) => {
    try {
      const rules = await storage.getActiveAmlMonitoringRules();
      return res.json({ rules });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get active AML rules" });
    }
  });

  // Create monitoring rule (Admin)
  app.post("/api/admin/aml-rules", ensureAdminAsync, requirePermission('manage_kyc'), async (req, res) => {
    try {
      const { adminId, ...ruleData } = req.body;
      
      const rule = await storage.createAmlMonitoringRule({
        ...ruleData,
        createdBy: adminId,
      });
      
      // Create audit log
      await storage.createAuditLog({
        entityType: "aml_rule",
        entityId: rule.id,
        actionType: "create",
        actor: adminId || "admin",
        actorRole: "admin",
        details: `AML rule created: ${rule.ruleName}`,
      });
      
      return res.json({ rule });
    } catch (error) {
      console.error("Create AML rule error:", error);
      return res.status(400).json({ message: "Failed to create AML rule" });
    }
  });

  // Update monitoring rule (Admin)
  app.patch("/api/admin/aml-rules/:id", ensureAdminAsync, requirePermission('manage_kyc'), async (req, res) => {
    try {
      const { adminId, ...updates } = req.body;
      
      const rule = await storage.updateAmlMonitoringRule(req.params.id, updates);
      
      if (!rule) {
        return res.status(404).json({ message: "AML rule not found" });
      }
      
      // Create audit log
      await storage.createAuditLog({
        entityType: "aml_rule",
        entityId: req.params.id,
        actionType: "update",
        actor: adminId || "admin",
        actorRole: "admin",
        details: `AML rule updated: ${rule.ruleName}`,
      });
      
      return res.json({ rule });
    } catch (error) {
      return res.status(400).json({ message: "Failed to update AML rule" });
    }
  });

  // Delete monitoring rule (Admin)
  app.delete("/api/admin/aml-rules/:id", ensureAdminAsync, requirePermission('manage_kyc'), async (req, res) => {
    try {
      const { adminId } = req.body;
      
      const deleted = await storage.deleteAmlMonitoringRule(req.params.id);
      
      if (!deleted) {
        return res.status(404).json({ message: "AML rule not found" });
      }
      
      // Create audit log
      await storage.createAuditLog({
        entityType: "aml_rule",
        entityId: req.params.id,
        actionType: "delete",
        actor: adminId || "admin",
        actorRole: "admin",
        details: "AML rule deleted",
      });
      
      return res.json({ message: "Rule deleted successfully" });
    } catch (error) {
      return res.status(400).json({ message: "Failed to delete AML rule" });
    }
  });

  // Seed default AML monitoring rules (Admin)
  app.post("/api/admin/aml-rules/seed-defaults", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      await seedDefaultAmlRules();
      const rules = await storage.getAllAmlMonitoringRules();
      return res.json({ message: `Seeded default AML rules`, rules });
    } catch (error) {
      console.error("Seed AML rules error:", error);
      return res.status(400).json({ message: "Failed to seed AML rules" });
    }
  });

  // Evaluate transaction against AML rules (Admin)
  app.post("/api/admin/aml/evaluate-transaction", ensureAdminAsync, requirePermission('manage_kyc'), async (req, res) => {
    try {
      const { transactionId, userId } = req.body;
      
      if (!transactionId || !userId) {
        return res.status(400).json({ message: "transactionId and userId are required" });
      }
      
      const transaction = await storage.getTransaction(transactionId);
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      const result = await evaluateTransaction(transaction, userId);
      return res.json(result);
    } catch (error) {
      console.error("AML evaluation error:", error);
      return res.status(400).json({ message: "Failed to evaluate transaction" });
    }
  });

  // Seed AML rules (frontend endpoint)
  app.post("/api/admin/aml/seed-rules", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      await seedDefaultAmlRules();
      const rules = await storage.getAllAmlMonitoringRules();
      return res.json({ success: true, message: `Seeded default AML rules`, rules });
    } catch (error) {
      console.error("Seed AML rules error:", error);
      return res.status(400).json({ success: false, message: "Failed to seed AML rules" });
    }
  });

  // Get AML alerts summary (Admin)
  app.get("/api/admin/aml/alerts", ensureAdminAsync, requirePermission('view_kyc', 'manage_kyc'), async (req, res) => {
    try {
      const alerts = await getAmlAlerts();
      return res.json(alerts);
    } catch (error) {
      console.error("AML alerts error:", error);
      return res.status(400).json({ message: "Failed to get AML alerts" });
    }
  });

  // Get default AML rule templates
  app.get("/api/admin/aml-rules/templates", ensureAdminAsync, requirePermission('view_kyc', 'manage_kyc'), async (req, res) => {
    try {
      return res.json({ templates: DEFAULT_AML_RULES });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get rule templates" });
    }
  });

  // ============================================================================
  // DOCUMENT EXPIRY REMINDERS
  // ============================================================================

  // Get documents expiring soon (Admin)
  app.get("/api/admin/document-expiry", ensureAdminAsync, requirePermission('view_kyc'), async (req, res) => {
    try {
      const daysAhead = parseInt(req.query.days as string) || 30;
      const expiringDocs = await getExpiringDocuments(daysAhead);
      return res.json({ expiringDocuments: expiringDocs });
    } catch (error) {
      console.error("Document expiry check error:", error);
      return res.status(400).json({ message: "Failed to get expiring documents" });
    }
  });

  // Get document expiry statistics (Admin)
  app.get("/api/admin/document-expiry/stats", ensureAdminAsync, requirePermission('view_kyc'), async (req, res) => {
    try {
      const stats = await getDocumentExpiryStats();
      return res.json(stats);
    } catch (error) {
      console.error("Document expiry stats error:", error);
      return res.status(400).json({ message: "Failed to get expiry statistics" });
    }
  });

  // Manually trigger document expiry reminders (Admin)
  app.post("/api/admin/document-expiry/send-reminders", ensureAdminAsync, requirePermission('manage_kyc'), async (req, res) => {
    try {
      const result = await sendDocumentExpiryReminders();
      return res.json({ 
        message: `Sent ${result.sent} reminders`,
        ...result 
      });
    } catch (error) {
      console.error("Document expiry reminder error:", error);
      return res.status(400).json({ message: "Failed to send reminders" });
    }
  });
  
  // ============================================================================
  // FINAPAY - WALLET & TRANSACTIONS
  // ============================================================================
  
  // Get user wallet - PROTECTED: requires matching session
  app.get("/api/admin/fees", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      const fees = await storage.getAllPlatformFees();
      return res.json({ fees });
    } catch (error) {
      console.error('Get fees error:', error);
      return res.status(400).json({ message: "Failed to get platform fees" });
    }
  });
  
  // Get fees by module (Admin)
  app.get("/api/admin/fees/module/:module", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      const fees = await storage.getModuleFees(req.params.module);
      return res.json({ fees });
    } catch (error) {
      console.error('Get module fees error:', error);
      return res.status(400).json({ message: "Failed to get module fees" });
    }
  });
  
  // Create platform fee (Admin)
  app.post("/api/admin/fees", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      const fee = await storage.createPlatformFee(req.body);
      return res.json({ fee });
    } catch (error) {
      console.error('Create fee error:', error);
      return res.status(400).json({ message: "Failed to create platform fee" });
    }
  });
  
  // Update platform fee (Admin)
  app.put("/api/admin/fees/:id", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      const fee = await storage.updatePlatformFee(req.params.id, req.body);
      if (!fee) {
        return res.status(404).json({ message: "Fee not found" });
      }
      return res.json({ fee });
    } catch (error) {
      console.error('Update fee error:', error);
      return res.status(400).json({ message: "Failed to update platform fee" });
    }
  });
  
  // Delete platform fee (Admin)
  app.delete("/api/admin/fees/:id", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      await storage.deletePlatformFee(req.params.id);
      return res.json({ success: true });
    } catch (error) {
      console.error('Delete fee error:', error);
      return res.status(400).json({ message: "Failed to delete platform fee" });
    }
  });
  
  // Seed default fees (Admin)
  app.post("/api/admin/fees/seed", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      await storage.seedDefaultFees();
      const fees = await storage.getAllPlatformFees();
      return res.json({ fees, message: "Default fees seeded successfully" });
    } catch (error) {
      console.error('Seed fees error:', error);
      return res.status(400).json({ message: "Failed to seed default fees" });
    }
  });
  
  // Public endpoint - get active fees (for frontend calculations)
  app.get("/api/fees", async (req, res) => {
    try {
      const fees = await storage.getActivePlatformFees();
      // Convert to a map for easy access by key
      const feeMap: Record<string, { value: number; type: string; min?: number; max?: number }> = {};
      for (const fee of fees) {
        feeMap[`${fee.module}_${fee.feeKey}`] = {
          value: parseFloat(fee.feeValue),
          type: fee.feeType,
          min: fee.minAmount ? parseFloat(fee.minAmount) : undefined,
          max: fee.maxAmount ? parseFloat(fee.maxAmount) : undefined
        };
      }
      return res.json({ fees, feeMap });
    } catch (error) {
      console.error('Get public fees error:', error);
      return res.status(400).json({ message: "Failed to get platform fees" });
    }
  });
  
  // ============================================================================
  // FINABRIDGE AGREEMENTS - T&C ACCEPTANCE TRACKING
  // ============================================================================
  
  // Get user's FinaBridge agreements
  app.get("/api/finabridge/agreements/user/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const agreements = await storage.getUserFinabridgeAgreements(req.params.userId);
      return res.json({ agreements });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get user agreements" });
    }
  });
  
  // Get all FinaBridge agreements (admin)
  app.get("/api/admin/finabridge/agreements", ensureAdminAsync, requirePermission('view_finabridge', 'manage_finabridge'), async (req, res) => {
    try {
      const agreements = await storage.getAllFinabridgeAgreements();
      return res.json({ agreements });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get agreements" });
    }
  });
  
  // Get single agreement by ID
  app.get("/api/finabridge/agreements/:id", ensureAuthenticated, async (req, res) => {
    try {
      const agreement = await storage.getFinabridgeAgreement(req.params.id);
      if (!agreement) {
        return res.status(404).json({ message: "Agreement not found" });
      }
      return res.json({ agreement });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get agreement" });
    }
  });
  
  // Create FinaBridge agreement
  app.post("/api/finabridge/agreements", ensureAuthenticated, async (req, res) => {
    try {
      const agreementData = insertFinabridgeAgreementSchema.parse(req.body);
      const agreement = await storage.createFinabridgeAgreement(agreementData);
      return res.json({ agreement });
    } catch (error) {
      return res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create agreement" });
    }
  });
  
  // ============================================================================
  // FINAPAY - BANK ACCOUNTS & DEPOSIT/WITHDRAWAL REQUESTS
  // ============================================================================
  
  // Get all platform bank accounts (Admin)
  app.get("/api/admin/bank-accounts", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      const accounts = await storage.getAllPlatformBankAccounts();
      return res.json({ accounts });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get bank accounts" });
    }
  });
  
  // Get public fees by module (for user-facing fee display)
  app.get("/api/fees/:module", async (req, res) => {
    try {
      const { module } = req.params;
      const fees = await storage.getModuleFees(module);
      // Only return active fees with essential info
      const publicFees = fees
        .filter(f => f.isActive)
        .map(f => ({
          feeKey: f.feeKey,
          feeName: f.feeName,
          feeType: f.feeType,
          feeValue: f.feeValue,
          minAmount: f.minAmount,
          maxAmount: f.maxAmount
        }));
      return res.json({ fees: publicFees });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get fees" });
    }
  });

  // Get active bank accounts (User - for deposit form)
  app.get("/api/bank-accounts/active", async (req, res) => {
    try {
      // First try to get from platform_bank_accounts table
      let accounts = await storage.getActivePlatformBankAccounts();
      
      // If empty, fallback to bank_accounts JSON in payment_gateway_settings
      if (accounts.length === 0) {
        const settings = await storage.getPaymentGatewaySettings();
        if (settings?.bankAccounts) {
          try {
            const jsonAccounts = typeof settings.bankAccounts === 'string' 
              ? JSON.parse(settings.bankAccounts) 
              : settings.bankAccounts;
            
            if (Array.isArray(jsonAccounts)) {
              const mappedAccounts = jsonAccounts
                .filter((acc: any) => acc.isActive !== false)
                .map((acc: any) => ({
                  id: acc.id,
                  bankName: acc.bankName || '',
                  accountName: acc.accountHolderName || acc.accountName || '',
                  accountNumber: acc.accountNumber || '',
                  routingNumber: acc.routingNumber || null,
                  swiftCode: acc.swiftCode || null,
                  iban: acc.iban || null,
                  currency: acc.currency || 'USD',
                  country: acc.country || 'UAE',
                  status: 'Active' as const,
                }));
              return res.json({ accounts: mappedAccounts });
            }
          } catch (e) {
            console.error('Failed to parse bank_accounts JSON:', e);
          }
        }
      }
      
      return res.json({ accounts });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get bank accounts" });
    }
  });
  
  // Create platform bank account (Admin) - PROTECTED
  app.post("/api/admin/bank-accounts", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      const accountData = insertPlatformBankAccountSchema.parse(req.body);
      const account = await storage.createPlatformBankAccount(accountData);
      return res.json({ account });
    } catch (error) {
      return res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create bank account" });
    }
  });
  
  // Update platform bank account (Admin) - PROTECTED
  app.patch("/api/admin/bank-accounts/:id", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      const account = await storage.updatePlatformBankAccount(req.params.id, req.body);
      if (!account) {
        return res.status(404).json({ message: "Bank account not found" });
      }
      return res.json({ account });
    } catch (error) {
      return res.status(400).json({ message: "Failed to update bank account" });
    }
  });
  
  // Delete platform bank account (Admin) - PROTECTED
  app.delete("/api/admin/bank-accounts/:id", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      await storage.deletePlatformBankAccount(req.params.id);
      return res.json({ success: true });
    } catch (error) {
      return res.status(400).json({ message: "Failed to delete bank account" });
    }
  });
  
  // Get user deposit requests - PROTECTED: requires matching session
  // Get current user's pending deposit requests - for dashboard display
  app.get("/api/trade/cases/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const cases = await storage.getUserTradeCases(req.params.userId);
      return res.json({ cases });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get trade cases" });
    }
  });
  
  // Get all trade cases (Admin)
  app.get("/api/admin/trade/cases", ensureAdminAsync, requirePermission('view_finabridge', 'manage_finabridge'), async (req, res) => {
    try {
      const cases = await storage.getAllTradeCases();
      return res.json({ cases });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get trade cases" });
    }
  });
  
  // Create trade case - PROTECTED - Requires KYC. Exporter/importer only (no government).
  app.post("/api/trade/cases", ensureAuthenticated, requireUserType('exporter', 'importer'), requireKycApproved, async (req, res) => {
    try {
      const caseData = insertTradeCaseSchema.parse(req.body);
      const tradeCase = await storage.createTradeCase(caseData);
      
      // Create audit log
      await storage.createAuditLog({
        entityType: "trade",
        entityId: tradeCase.id,
        actionType: "create",
        actor: caseData.userId,
        actorRole: "user",
        details: `Trade case created: ${caseData.tradeValueUsd} USD`,
      });
      
      // Create bell notification for trade case creation
      await storage.createNotification({
        userId: caseData.userId,
        title: 'Trade Case Submitted',
        message: `Your trade finance application for $${caseData.tradeValueUsd} has been submitted and is pending review.`,
        type: 'trade',
        link: '/finabridge',
      });
      
      // Send trade case created email
      const tradeUser = await storage.getUser(caseData.userId);
      if (tradeUser?.email) {
        sendEmail(tradeUser.email, EMAIL_TEMPLATES.TRADE_CASE_CREATED, {
          user_name: `${tradeUser.firstName} ${tradeUser.lastName}`,
          case_id: tradeCase.id,
          trade_value: caseData.tradeValueUsd,
        }).catch(err => console.error('[Email] Trade case created notification failed:', err));
      }
      
      return res.json({ tradeCase });
    } catch (error) {
      return res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create trade case" });
    }
  });
  
  // Update trade case - PROTECTED
  app.patch("/api/trade/cases/:id", ensureAuthenticated, requireUserType('exporter', 'importer'), async (req, res) => {
    try {
      const previousCase = await storage.getTradeCase(req.params.id);
      const tradeCase = await storage.updateTradeCase(req.params.id, req.body);
      if (!tradeCase) {
        return res.status(404).json({ message: "Trade case not found" });
      }

      // Enqueue post-update emails + notifications to the shared BullMQ queue
      // so they retry on failure and survive an api-server restart between the
      // response and the deferred work.
      const statusChanged = !!previousCase && previousCase.status !== tradeCase.status;
      const requestDocuments = req.body.requestDocuments === true;
      const notes = req.body.notes || req.body.adminNotes || '';
      const appBaseUrl = process.env.APP_URL || (process.env.REPLIT_DOMAINS ? `https://${(process.env.REPLIT_DOMAINS as string).split(',')[0]}` : 'https://finatrades.com');
      const caseRef = tradeCase.caseNumber || tradeCase.id;

      if (statusChanged || requestDocuments) {
        queueTradeEmail({
          kind: 'trade_case_status',
          caseId: tradeCase.id,
          caseRef,
          ownerUserId: tradeCase.userId,
          newStatus: tradeCase.status ?? null,
          previousStatus: previousCase?.status ?? null,
          tradeValueUsd: tradeCase.tradeValueUsd || '0',
          notes,
          requestDocuments,
          appBaseUrl,
        }).catch(err => console.error('[Email] Failed to queue trade case status email:', err));
      }

      return res.json({ tradeCase });
    } catch (error) {
      return res.status(400).json({ message: "Failed to update trade case" });
    }
  });
  
  // Get case documents - PROTECTED
  app.get("/api/trade/documents/:caseId", ensureAuthenticated, async (req, res) => {
    try {
      const documents = await storage.getCaseDocuments(req.params.caseId);
      return res.json({ documents });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get documents" });
    }
  });
  
  // Upload document - PROTECTED. Exporter/importer only.
  app.post("/api/trade/documents", ensureAuthenticated, requireUserType('exporter', 'importer'), async (req, res) => {
    try {
      const documentData = insertTradeDocumentSchema.parse(req.body);
      const document = await storage.createTradeDocument(documentData);

      // Queue AI verification (existing BullMQ queue handles trade case lookup
      // internally if needed) and enqueue the admin upload notification onto
      // the shared trade-emails queue so it survives restarts and retries on
      // failure.
      if (document.status === 'AI Review') {
        try {
          const tradeCase = await storage.getTradeCase(document.caseId);
          await queueDocumentVerification({
            documentId: document.id,
            documentUrl: document.documentUrl,
            documentType: document.documentType,
            caseId: document.caseId,
            tradeValueUsd: tradeCase?.tradeValueUsd ?? undefined,
            // Task #145: buyer/seller/company names are NOT forwarded to the
            // AI verification worker — counterparty PII must stay inside the
            // sealed case record until identity-reveal consent is given.
            buyerName: null,
            sellerName: null,
            companyName: null,
          });
        } catch (err) {
          console.error('[VerifyDoc] Failed to queue verification job:', err);
        }
      }

      queueTradeEmail({
        kind: 'trade_document_uploaded',
        documentId: document.id,
        caseId: document.caseId,
        documentType: document.documentType,
      }).catch(err => console.error('[Email] Failed to queue trade document uploaded notification:', err));

      return res.json({ document });
    } catch (error) {
      return res.status(400).json({ message: error instanceof Error ? error.message : "Failed to upload document" });
    }
  });
  
  // Update document status - PROTECTED
  app.patch("/api/trade/documents/:id", ensureAuthenticated, requireUserType('exporter', 'importer'), async (req, res) => {
    try {
      const document = await storage.updateTradeDocument(req.params.id, req.body);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      return res.json({ document });
    } catch (error) {
      return res.status(400).json({ message: "Failed to update document" });
    }
  });
  
  // ============================================================================
  // FINABRIDGE - TRADE REQUEST MATCHING SYSTEM
  // ============================================================================
  
  // Helper to generate Trade Reference ID
  function generateTradeRefId(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'TR';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
  
  // Record FinaBridge disclaimer acceptance with role selection - PROTECTED
  app.post("/api/finabridge/accept-disclaimer/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const user = await storage.getUser(req.params.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const { role } = req.body;
      if (!role || !['importer', 'exporter', 'both'].includes(role)) {
        return res.status(400).json({ message: "Please select your role: importer, exporter, or both" });
      }
      
      const updatedUser = await storage.updateUser(req.params.userId, {
        finabridgeDisclaimerAcceptedAt: new Date(),
        finabridgeRole: role,
      });
      
      await storage.createAuditLog({
        entityType: "user",
        entityId: req.params.userId,
        actionType: "update",
        actor: req.params.userId,
        actorRole: "user",
        details: `FinaBridge disclaimer accepted as ${role}`,
      });
      
      return res.json({ 
        success: true, 
        acceptedAt: updatedUser?.finabridgeDisclaimerAcceptedAt,
        role: updatedUser?.finabridgeRole 
      });
    } catch (error) {
      return res.status(400).json({ message: "Failed to record disclaimer acceptance" });
    }
  });
  
  // IMPORTER ENDPOINTS
  
  // Get importer's trade requests
  app.get("/api/finabridge/importer/requests/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const requests = await storage.getUserTradeRequests(req.params.userId);
      return res.json({ requests });
    } catch (error) {
      console.error('[FinaBridge] Error fetching trade requests:', error);
      return res.status(400).json({ message: "Failed to get trade requests" });
    }
  });
  
  // Create new trade request (Importer) - Requires KYC
  app.post("/api/finabridge/importer/requests", ensureAuthenticated, requireKycApproved, checkMaintenanceMode, async (req, res) => {
    try {
      // SECURITY: Use authenticated session user ID
      const sessionUserId = req.session?.userId;
      if (!sessionUserId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const isAdmin = req.session?.userRole === 'admin';
      
      // Parse and validate schema first
      const requestData = insertTradeRequestSchema.parse({
        ...req.body,
        tradeRefId: generateTradeRefId(),
      });
      
      // SECURITY: Enforce importerId from session - non-admins can only create for themselves
      if (!isAdmin) {
        requestData.importerUserId = sessionUserId;
      } else if (!requestData.importerUserId) {
        requestData.importerUserId = sessionUserId;
      }

      // Validate paymentInstrumentType
      const allowedInstruments = ['LC', 'POL', 'WR', 'Wallet'] as const;
      const pit = requestData.paymentInstrumentType as string | undefined;
      if (!pit || !allowedInstruments.includes(pit as typeof allowedInstruments[number])) {
        return res.status(400).json({ message: "paymentInstrumentType must be one of: LC, POL, WR, Wallet" });
      }

      const documentInstruments = ['LC', 'POL', 'WR'];
      const requiresDocument = documentInstruments.includes(pit);

      // Validate document presence for instrument types that require it
      if (requiresDocument && !requestData.supportingDocumentUrl) {
        return res.status(400).json({ message: "A supporting document URL is required for LC, POL, and WR payment instruments" });
      }

      // SECURITY: Derive initial status server-side based on paymentInstrumentType and document.
      // Client-supplied status is ignored — business routing is enforced here.
      if (requiresDocument) {
        requestData.status = 'AI Review';
      } else {
        requestData.status = 'Pending Review';
      }

      // Validate FinaBridge trade case value limits using PARSED data
      const amountUsd = parseFloat(requestData.tradeValueUsd || "0");
      if (isNaN(amountUsd) || amountUsd <= 0) {
        return res.status(400).json({ message: "Invalid trade value" });
      }
      
      const tradeCaseLimitResult = await platformLimits.validateTradeCaseValue(amountUsd);
      if (!tradeCaseLimitResult.valid) {
        return res.status(400).json({ 
          message: tradeCaseLimitResult.message,
          limit: tradeCaseLimitResult.limit,
          current: tradeCaseLimitResult.current
        });
      }
      
      // Balance check: when submitting as Open, verify FinaBridge wallet has enough gold
      if ((requestData.status as string) === 'Open') {
        const settlementGrams = parseFloat(requestData.settlementGoldGrams || '0');
        if (settlementGrams > 0) {
          const fbWallet = await storage.getOrCreateFinabridgeWallet(requestData.importerUserId);
          const available = parseFloat(fbWallet?.availableGoldGrams || '0');
          if (settlementGrams > available) {
            return res.status(400).json({
              message: `Insufficient FinaBridge wallet balance. Trade requires ${settlementGrams.toFixed(4)}g gold but your FinaBridge wallet only has ${available.toFixed(4)}g available. Please fund your FinaBridge wallet first.`,
              required: settlementGrams,
              available,
            });
          }
        }
      }
      
      const tradeRequest = await storage.createTradeRequest(requestData);
      
      await storage.createAuditLog({
        entityType: "trade_request",
        entityId: tradeRequest.id,
        actionType: "create",
        actor: requestData.importerUserId,
        actorRole: "user",
        details: `Trade request created: ${requestData.tradeValueUsd} USD`,
      });
      
      return res.json({ tradeRequest });
    } catch (error) {
      return res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create trade request" });
    }
  });
  
  // Submit trade request (change from Draft to Open)
  app.post("/api/finabridge/importer/requests/:id/submit", ensureAuthenticated, checkMaintenanceMode, async (req, res) => {
    try {
      const request = await storage.getTradeRequest(req.params.id);
      if (!request) {
        return res.status(404).json({ message: "Trade request not found" });
      }

      // SECURITY: Only the owning importer (or an admin) may submit the request.
      // Submitting another user's request places a real USD wallet hold on
      // their balance, which would be a broken-access-control violation.
      const sessionUserId = req.session?.userId;
      const isAdmin = req.session?.userRole === 'admin';
      if (!sessionUserId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      if (!isAdmin && sessionUserId !== request.importerUserId) {
        return res.status(403).json({ message: "You do not have permission to submit this trade request" });
      }

      if (request.status !== 'Draft') {
        return res.status(400).json({ message: "Only draft requests can be submitted" });
      }

      // Place a USD wallet hold on the importer for the required margin before
      // the request goes live. This enforces buyer commitment — declining the
      // request later releases the hold; accepting a proposal converts it to escrow.
      const marginCents = computeTradeMarginCents(request.tradeValueUsd?.toString() || '0');
      let placedHoldId: string | null = null;
      if (marginCents > 0) {
        const existingHold = await findOpenWalletHoldForTradeRequest(request.id, request.importerUserId);
        if (existingHold) {
          placedHoldId = existingHold.id;
        } else {
          try {
            const { hold } = await walletPlaceHold({
              userId: request.importerUserId,
              amountCents: marginCents,
              referenceType: 'trade_request',
              referenceId: request.id,
              metadata: {
                tradeRefId: request.tradeRefId,
                tradeValueUsd: request.tradeValueUsd,
                marginBps: TRADE_MARGIN_BPS,
              },
            });
            placedHoldId = hold.id;
          } catch (err: any) {
            if (err?.code === 'INSUFFICIENT_FUNDS') {
              const requiredUsd = (marginCents / 100).toFixed(2);
              return res.status(402).json({
                message: `Insufficient wallet balance to commit to this trade. Required margin: $${requiredUsd} USD (${(TRADE_MARGIN_BPS / 100).toFixed(2)}% of trade value). Please top up your wallet and try again.`,
                code: 'INSUFFICIENT_FUNDS',
                requiredMarginCents: marginCents,
                marginBps: TRADE_MARGIN_BPS,
              });
            }
            // Concurrent submit/retry raced with us — the partial unique
            // index on b2b_wallet_holds (user_id, reference_type, reference_id)
            // WHERE status='open' will reject the duplicate. Recover the
            // existing winning hold and proceed idempotently.
            if (err?.code === '23505' || err?.cause?.code === '23505') {
              const raced = await findOpenWalletHoldForTradeRequest(request.id, request.importerUserId);
              if (raced) {
                placedHoldId = raced.id;
              } else {
                throw err;
              }
            } else {
              throw err;
            }
          }
        }
      }

      let updated;
      try {
        updated = await storage.updateTradeRequest(req.params.id, { status: 'Open' });
      } catch (statusErr) {
        // Compensate: status flip failed after we placed a hold — release it so
        // we don't strand the importer's funds.
        if (placedHoldId) {
          try {
            await walletReleaseHold({ userId: request.importerUserId, holdId: placedHoldId });
          } catch (compensateErr) {
            console.error('[Wallet] Failed to release margin hold after submit status failure:', compensateErr);
          }
        }
        throw statusErr;
      }
      
      // Notify all admins of new trade request
      const importerUser = await storage.getUser(request.importerUserId);
      notifyAllAdmins({
        title: 'New Trade Request',
        message: `${importerUser?.companyName || importerUser?.firstName || 'Importer'} submitted trade request for ${request.goodsName} ($${parseFloat(request.tradeValueUsd.toString()).toLocaleString()})`,
        type: 'info',
        link: '/admin/finabridge',
      });

      // Email #2 — notify all 3 admins of new submission (FYI — AI is processing, no action required)
      try {
        const adminEmails = [
          { email: 'macy@finatrades.com', name: 'Macy' },
          { email: 'farah@finatrades.com', name: 'Farah Hashim' },
          { email: 'reda@finatrades.com', name: 'Reda' },
        ];
        const importerName = importerUser?.companyName || `${importerUser?.firstName || ''} ${importerUser?.lastName || ''}`.trim() || 'Importer';
        for (const admin of adminEmails) {
          sendEmailViaTemplate(admin.email, EMAIL_TEMPLATES.FINABRIDGE_REQUEST_SUBMITTED, {
            admin_name: admin.name,
            trade_ref: request.tradeRefId,
            importer_name: importerName,
            goods_name: request.goodsName,
            trade_value: parseFloat(request.tradeValueUsd.toString()).toLocaleString(),
            instrument_type: request.paymentInstrumentType || 'Not specified',
            submitted_at: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
            admin_url: '/admin/finabridge',
          }).catch(err => console.error('[Email] FinaBridge submission admin notification failed:', err));
        }
      } catch (e) { console.error('[Email] Failed to send FinaBridge submission emails:', e); }
      
      return res.json({ tradeRequest: updated });
    } catch (error) {
      return res.status(400).json({ message: "Failed to submit trade request" });
    }
  });
  
  // Get forwarded proposals for importer
  app.get("/api/finabridge/importer/requests/:id/forwarded-proposals", ensureAuthenticated, async (req, res) => {
    try {
      const forwardedList = await storage.getForwardedProposals(req.params.id);
      const proposalIds = forwardedList.map(f => f.proposalId);
      const proposals = await Promise.all(
        proposalIds.map(id => storage.getTradeProposal(id))
      );
      
      // Task #145: importer sees the exporter ONLY as an FT-ID + reputation
      // snapshot. Real name/email/phone/company are stripped from the payload.
      const proposalsWithExporter = await Promise.all(
        proposals.filter(Boolean).map(async (proposal) => {
          const counterparty = await loadCounterpartyByUserId(proposal!.exporterUserId);
          // Strip PII fields from the proposal itself
          const {
            companyName: _companyName,
            contactPerson: _contactPerson,
            contactEmail: _contactEmail,
            contactPhone: _contactPhone,
            ...safeProposal
          } = proposal as any;
          return {
            ...safeProposal,
            counterparty,
            // Backwards-compat shim — old UI reads `exporter.finatradesId`.
            exporter: counterparty ? {
              finatradesId: counterparty.finatradesId,
              displayId: counterparty.displayId,
            } : null,
          };
        })
      );
      
      return res.json({ proposals: proposalsWithExporter });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get forwarded proposals" });
    }
  });
  
  // Accept a forwarded proposal (creates settlement hold)
  app.post("/api/finabridge/importer/proposals/:proposalId/accept", ensureAuthenticated, async (req, res) => {
    try {
      const proposal = await storage.getTradeProposal(req.params.proposalId);
      if (!proposal) {
        return res.status(404).json({ message: "Proposal not found" });
      }
      
      const request = await storage.getTradeRequest(proposal.tradeRequestId);
      if (!request) {
        return res.status(404).json({ message: "Trade request not found" });
      }

      // Authorization: only the owning importer (or an admin) may accept a
      // proposal — this endpoint locks importer gold, creates a settlement
      // hold, and converts the importer's USD margin hold to escrow. Without
      // this check any authenticated user knowing a proposal id could trigger
      // financial mutations against another importer's account (IDOR). This
      // codebase uses session-based identity (req.session.userId/userRole),
      // not req.user — match the pattern used by the submit handler.
      const acceptSessionUserId = req.session?.userId;
      const acceptIsAdmin = req.session?.userRole === 'admin';
      if (!acceptSessionUserId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      if (!acceptIsAdmin && acceptSessionUserId !== request.importerUserId) {
        return res.status(403).json({ message: "Not authorized to accept this proposal" });
      }

      // Verify proposal was forwarded
      const forwarded = await storage.getForwardedProposals(proposal.tradeRequestId);
      const isForwarded = forwarded.some(f => f.proposalId === proposal.id);
      if (!isForwarded) {
        return res.status(400).json({ message: "Proposal has not been forwarded to importer" });
      }
      
      // Get or create importer's FinaBridge wallet
      const wallet = await storage.getOrCreateFinabridgeWallet(request.importerUserId);
      const availableGold = parseFloat(wallet.availableGoldGrams);
      const requiredGold = parseFloat(request.settlementGoldGrams);
      
      if (availableGold < requiredGold) {
        return res.status(400).json({ 
          message: `Insufficient gold balance. Required: ${requiredGold}g, Available: ${availableGold}g` 
        });
      }

      // Pre-check the importer's USD wallet margin hold BEFORE mutating any
      // gold balances or creating a settlement hold. If a hold exists it MUST
      // be in 'open' state so the upcoming conversion can succeed atomically.
      // Holds created before this wiring may legitimately be absent (legacy).
      const walletHold = await findOpenWalletHoldForTradeRequest(request.id, request.importerUserId);

      // Lock the gold in wallet
      await storage.updateFinabridgeWallet(wallet.id, {
        availableGoldGrams: (availableGold - requiredGold).toFixed(6),
        lockedGoldGrams: (parseFloat(wallet.lockedGoldGrams) + requiredGold).toFixed(6),
      });
      
      // Update exporter's wallet to show incoming locked funds
      const exporterWallet = await storage.getOrCreateFinabridgeWallet(proposal.exporterUserId);
      await storage.updateFinabridgeWallet(exporterWallet.id, {
        incomingLockedGoldGrams: (parseFloat(exporterWallet.incomingLockedGoldGrams || '0') + requiredGold).toFixed(6),
      });
      
      // Create settlement hold
      const settlementHold = await storage.createSettlementHold({
        tradeRequestId: request.id,
        importerUserId: request.importerUserId,
        exporterUserId: proposal.exporterUserId,
        lockedGoldGrams: request.settlementGoldGrams,
        status: 'Held',
      });

      // Convert the USD wallet margin hold into an escrow record tied to the
      // new settlement hold. If conversion fails, compensate by rolling back
      // the gold locks and cancelling the settlement hold so we don't leave
      // partial state. We only skip conversion when no hold exists (legacy).
      if (walletHold) {
        try {
          await walletConvertHoldToEscrow({
            userId: request.importerUserId,
            holdId: walletHold.id,
            escrowId: settlementHold.id,
          });
        } catch (convertErr) {
          console.error('[Wallet] Failed to convert margin hold to escrow, compensating:', convertErr);
          // Compensate: undo gold locks on both wallets and cancel the
          // settlement hold. These compensating writes are best-effort —
          // any failures here require manual reconciliation.
          try {
            await storage.updateFinabridgeWallet(wallet.id, {
              availableGoldGrams: availableGold.toFixed(6),
              lockedGoldGrams: parseFloat(wallet.lockedGoldGrams).toFixed(6),
            });
          } catch (rb) { console.error('[Wallet] Compensation: importer gold rollback failed:', rb); }
          try {
            await storage.updateFinabridgeWallet(exporterWallet.id, {
              incomingLockedGoldGrams: parseFloat(exporterWallet.incomingLockedGoldGrams || '0').toFixed(6),
            });
          } catch (rb) { console.error('[Wallet] Compensation: exporter incoming rollback failed:', rb); }
          try {
            await storage.updateSettlementHold(settlementHold.id, { status: 'Cancelled' });
          } catch (rb) { console.error('[Wallet] Compensation: settlement hold cancel failed:', rb); }
          return res.status(500).json({
            message: "Failed to convert wallet margin hold to escrow. Trade not advanced; please retry.",
            code: 'HOLD_CONVERSION_FAILED',
          });
        }
      }
      
      // Generate Trade Lock Certificate for the importer (non-blocking)
      const lockedGoldAmount = parseFloat(request.settlementGoldGrams);
      const tradeValueUsd = parseFloat(request.tradeValueUsd);
      const estimatedPricePerGram = tradeValueUsd / lockedGoldAmount;
      generateTradeLockCertificate(request.id, request.importerUserId, lockedGoldAmount, estimatedPricePerGram)
        .then(result => {
          if (result.error) {
            console.error(`[Routes] Failed to generate Trade Lock certificate for request ${request.id}:`, result.error);
          } else {
            console.log(`[Routes] Trade Lock certificate generated for request ${request.id}`);
          }
        })
        .catch(err => console.error('[Routes] Trade Lock certificate error:', err));
      
      // Update proposal status
      await storage.updateTradeProposal(proposal.id, { status: 'Accepted' });
      
      // Create trade confirmation
      await storage.createTradeConfirmation({
        tradeRequestId: request.id,
        acceptedProposalId: proposal.id,
      });
      
      // Update trade request status
      await storage.updateTradeRequest(request.id, { status: 'Active Trade' });
      
      // Reject other proposals
      const allProposals = await storage.getRequestProposals(request.id);
      for (const p of allProposals) {
        if (p.id !== proposal.id && p.status !== 'Rejected') {
          await storage.updateTradeProposal(p.id, { status: 'Declined' });
        }
      }
      
      // Create Deal Room for communication between importer, exporter, and admin
      const dealRoom = await storage.createDealRoom({
        tradeRequestId: request.id,
        acceptedProposalId: proposal.id,
        importerUserId: request.importerUserId,
        exporterUserId: proposal.exporterUserId,
        status: 'active',
      });

      // Send finabridge_deal_room_created invitation emails to both parties
      try {
        const importerDealUser = await storage.getUser(request.importerUserId);
        const exporterDealUser = await storage.getUser(proposal.exporterUserId);
        const dealRoomUrl = `/finabridge/deals/${dealRoom.id}`;

        const dealCreatedDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        // Task #145: counterparty in emails is the FT-ID only.
        const exporterFtId = exporterDealUser
          ? (exporterDealUser.customFinatradesId || exporterDealUser.finatradesId || `FT-${exporterDealUser.id.slice(0, 8).toUpperCase()}`)
          : 'your exporter';
        const importerFtId = importerDealUser
          ? (importerDealUser.customFinatradesId || importerDealUser.finatradesId || `FT-${importerDealUser.id.slice(0, 8).toUpperCase()}`)
          : 'your importer';
        if (importerDealUser?.email) {
          sendEmail(importerDealUser.email, EMAIL_TEMPLATES.FINABRIDGE_DEAL_ROOM_CREATED, {
            user_name: `${importerDealUser.firstName || ''} ${importerDealUser.lastName || ''}`.trim() || 'Valued Client',
            trade_ref: request.tradeRefId,
            deal_room_id: dealRoom.id,
            counterparty_name: exporterFtId,
            counterparty_ft_id: exporterFtId,
            created_date: dealCreatedDate,
          }, { userId: importerDealUser.id, recipientName: importerDealUser.firstName || undefined }).catch(e => console.error('[Email] Deal room created importer email failed:', e));
        }
        if (exporterDealUser?.email) {
          sendEmail(exporterDealUser.email, EMAIL_TEMPLATES.FINABRIDGE_DEAL_ROOM_CREATED, {
            user_name: `${exporterDealUser.firstName || ''} ${exporterDealUser.lastName || ''}`.trim() || 'Valued Partner',
            trade_ref: request.tradeRefId,
            deal_room_id: dealRoom.id,
            counterparty_name: importerFtId,
            counterparty_ft_id: importerFtId,
            created_date: dealCreatedDate,
          }, { userId: exporterDealUser.id, recipientName: exporterDealUser.firstName || undefined }).catch(e => console.error('[Email] Deal room created exporter email failed:', e));
        }
      } catch (dealRoomEmailErr) { console.error('[Email] Deal room created email trigger failed:', dealRoomEmailErr); }

      // Notify exporter that their proposal was accepted (FT-ID only in notification text)
      try {
        const importerUser = await storage.getUser(request.importerUserId);
        const importerFtIdNotif = importerUser
          ? (importerUser.customFinatradesId || importerUser.finatradesId || `FT-${importerUser.id.slice(0, 8).toUpperCase()}`)
          : 'the importer';
        await storage.createNotification({
          userId: proposal.exporterUserId,
          title: 'Trade Proposal Accepted',
          message: `Your trade proposal was accepted by ${importerFtIdNotif} — deal room is open`,
          type: 'trade',
          link: `/finabridge/deals/${dealRoom.id}`,
          read: false,
        });
        // Email to exporter (FT-ID only — no importer real name)
        const exporterUser = await storage.getUser(proposal.exporterUserId);
        if (exporterUser?.email) {
          sendEmail(exporterUser.email, EMAIL_TEMPLATES.FINABRIDGE_PROPOSAL_ACCEPTED, {
            user_name: `${exporterUser.firstName || ''} ${exporterUser.lastName || ''}`.trim() || 'Valued Partner',
            importer_name: importerFtIdNotif,
            counterparty_ft_id: importerFtIdNotif,
            trade_ref: request.tradeRefId,
            trade_value: parseFloat(request.tradeValueUsd).toLocaleString(),
            deal_room_url: `/finabridge/deals/${dealRoom.id}`,
          }, { userId: proposal.exporterUserId, recipientName: exporterUser.firstName || undefined }).catch(err => console.error('[Email] FinaBridge proposal accepted email failed:', err));
        }

        // Email #9 — notify importer their gold is now locked in escrow
        if (importerUser?.email) {
          sendEmail(importerUser.email, EMAIL_TEMPLATES.FINABRIDGE_SETTLEMENT_LOCKED, {
            user_name: `${importerUser.firstName || ''} ${importerUser.lastName || ''}`.trim() || 'Valued Partner',
            trade_ref: request.tradeRefId,
            gold_grams: parseFloat(request.settlementGoldGrams).toFixed(3),
            usd_value: parseFloat(request.tradeValueUsd).toLocaleString(),
            expiry_date: 'Upon trade completion',
          }, { userId: request.importerUserId, recipientName: importerUser.firstName || undefined }).catch(err => console.error('[Email] FinaBridge gold locked importer email failed:', err));
        }
      } catch (e) { console.error('[Notification] Failed to create proposal accepted notification:', e); }
      
      return res.json({ settlementHold, dealRoom, message: "Proposal accepted, gold locked, and deal room created" });
    } catch (error) {
      return res.status(400).json({ message: error instanceof Error ? error.message : "Failed to accept proposal" });
    }
  });

  // Decline a forwarded proposal
  app.post("/api/finabridge/importer/proposals/:proposalId/decline", ensureAuthenticated, async (req, res) => {
    try {
      const proposal = await storage.getTradeProposal(req.params.proposalId);
      if (!proposal) {
        return res.status(404).json({ message: "Proposal not found" });
      }

      // Authorization: only the owning importer (or admin) may decline a
      // proposal addressed to them. Closes IDOR symmetric to accept route.
      // Use session-based identity to match this codebase's auth pattern.
      const declineTradeReq = await storage.getTradeRequest(proposal.tradeRequestId);
      if (!declineTradeReq) {
        return res.status(404).json({ message: "Trade request not found" });
      }
      const declineSessionUserId = req.session?.userId;
      const declineIsAdmin = req.session?.userRole === 'admin';
      if (!declineSessionUserId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      if (!declineIsAdmin && declineSessionUserId !== declineTradeReq.importerUserId) {
        return res.status(403).json({ message: "Not authorized to decline this proposal" });
      }

      // Update proposal status to Declined
      await storage.updateTradeProposal(proposal.id, { status: 'Declined' });
      
      // Remove from forwarded proposals
      await storage.removeForwardedProposal(proposal.id);
      
      // Notify exporter that importer declined their proposal
      try {
        const tradeReq = await storage.getTradeRequest(proposal.tradeRequestId);
        if (tradeReq) {
          await storage.createNotification({
            userId: proposal.exporterUserId,
            title: 'Trade Proposal Declined',
            message: `Your trade proposal for trade ${tradeReq.tradeRefId} was not selected by the importer`,
            type: 'trade',
            link: '/finabridge',
            read: false,
          });

          // Send finabridge_proposal_declined email to the exporter
          const exporterUser = await storage.getUser(proposal.exporterUserId);
          if (exporterUser?.email) {
            sendEmail(exporterUser.email, EMAIL_TEMPLATES.FINABRIDGE_PROPOSAL_DECLINED, {
              user_name: `${exporterUser.firstName || ''} ${exporterUser.lastName || ''}`.trim() || 'Valued Partner',
              trade_ref: tradeReq.tradeRefId,
              proposal_amount: parseFloat(tradeReq.tradeValueUsd || '0').toLocaleString(),
              decline_reason: 'The importer has selected another proposal for this trade request.',
            }, { userId: exporterUser.id, recipientName: exporterUser.firstName || undefined }).catch(e => console.error('[Email] FinaBridge proposal declined email failed:', e));
          }
        }
      } catch (e) { console.error('[Notification] Failed to create importer decline notification:', e); }
      
      return res.json({ message: "Proposal declined successfully" });
    } catch (error) {
      return res.status(400).json({ message: error instanceof Error ? error.message : "Failed to decline proposal" });
    }
  });
  
  // EXPORTER ENDPOINTS
  
  // Get open trade requests for exporters (privacy filtered - no importer PII)
  app.get("/api/finabridge/exporter/open-requests/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const requests = await storage.getOpenTradeRequests();

      // Self-bid guard: exclude requests created by this user as importer
      const ownUserId = req.params.userId;
      const eligibleRequests = requests.filter(r => r.importerUserId !== ownUserId);

      // Filter out importer PII - only include tradeRefId and trade details
      const sanitizedRequests = await Promise.all(
        eligibleRequests.map(async (request) => {
          const importer = await storage.getUser(request.importerUserId);
          return {
            id: request.id,
            tradeRefId: request.tradeRefId,
            goodsName: request.goodsName,
            description: request.description,
            quantity: request.quantity,
            incoterms: request.incoterms,
            destination: request.destination,
            expectedShipDate: request.expectedShipDate,
            tradeValueUsd: request.tradeValueUsd,
            settlementGoldGrams: request.settlementGoldGrams,
            currency: request.currency,
            status: request.status,
            createdAt: request.createdAt,
            importer: importer ? { finatradesId: importer.finatradesId } : null,
          };
        })
      );
      
      return res.json({ requests: sanitizedRequests });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get open trade requests" });
    }
  });
  
  // Get exporter's submitted proposals
  app.get("/api/finabridge/exporter/proposals/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const proposals = await storage.getExporterProposals(req.params.userId);
      
      // Include trade request details but not importer PII
      const proposalsWithRequest = await Promise.all(
        proposals.map(async (proposal) => {
          const request = await storage.getTradeRequest(proposal.tradeRequestId);
          return {
            ...proposal,
            tradeRequest: request ? {
              tradeRefId: request.tradeRefId,
              goodsName: request.goodsName,
              tradeValueUsd: request.tradeValueUsd,
              status: request.status,
            } : null,
          };
        })
      );
      
      return res.json({ proposals: proposalsWithRequest });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get proposals" });
    }
  });
  
  // Get exporter's KYC profile for proposal form auto-fill
  app.get("/api/finabridge/exporter/kyc-profile/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const [user, kyc] = await Promise.all([
        storage.getUser(userId),
        storage.getFinatradesCorporateKyc(userId),
      ]);
      return res.json({
        companyName: kyc?.companyName || user?.companyName || '',
        registrationNumber: kyc?.registrationNumber || '',
        contactPerson: kyc?.tradingContactName || (user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() : ''),
        contactEmail: kyc?.tradingContactEmail || user?.email || '',
        contactPhone: kyc?.tradingContactPhone || user?.phoneNumber || '',
      });
    } catch (err: unknown) {
      return res.status(400).json({ message: "Failed to load KYC profile" });
    }
  });

  // Get importer's received forwarded proposals
  app.get("/api/finabridge/importer/forwarded-proposals/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const userId = req.params.userId;
      // Get all trade requests created by this importer
      const requests = await storage.getUserTradeRequests(userId);
      
      // For each request, get forwarded proposals
      const allForwardedProposals = [];
      for (const request of requests) {
        const forwarded = await storage.getForwardedProposals(request.id);
        for (const fp of forwarded) {
          // Get the original proposal details
          const proposal = await storage.getTradeProposal(fp.proposalId);
          if (proposal) {
            const exporter = await storage.getUser(proposal.exporterUserId);
            const counterparty = await loadCounterpartyByUserId(proposal.exporterUserId);
            // Task #145: strip exporter PII from the proposal before
            // returning it to the importer. Only FT-ID + reputation cross.
            const {
              companyName: _cn,
              contactPerson: _cp,
              contactEmail: _ce,
              contactPhone: _cph,
              ...safeProposal
            } = proposal as any;
            allForwardedProposals.push({
              ...safeProposal,
              forwardedAt: fp.createdAt,
              exporter: exporter ? { finatradesId: exporter.finatradesId } : null,
              counterparty,
              tradeRequest: {
                tradeRefId: request.tradeRefId,
                goodsName: request.goodsName,
                tradeValueUsd: request.tradeValueUsd,
                status: request.status,
              },
            });
          }
        }
      }
      
      return res.json({ proposals: allForwardedProposals });
    } catch (err) {
      console.error("Error fetching forwarded proposals:", err);
      return res.status(500).json({ message: "Failed to fetch forwarded proposals" });
    }
  });
  
  // Submit proposal for a trade request - Requires KYC
  app.post("/api/finabridge/exporter/proposals", ensureAuthenticated, requireKycApproved, async (req, res) => {
    try {
      const proposalData = insertTradeProposalSchema.parse(req.body);
      
      // Verify trade request exists and is open
      const request = await storage.getTradeRequest(proposalData.tradeRequestId);
      if (!request) {
        return res.status(404).json({ message: "Trade request not found" });
      }
      if (request.status !== 'Open' && request.status !== 'Proposal Review') {
        return res.status(400).json({ message: "Trade request is not accepting proposals" });
      }

      // Self-bid guard: exporter cannot bid on their own import request
      if (request.importerUserId === proposalData.exporterUserId) {
        return res.status(400).json({ message: "You cannot submit a proposal on your own trade request" });
      }

      // Check if exporter already submitted a proposal
      const existingProposals = await storage.getExporterProposals(proposalData.exporterUserId);
      const alreadySubmitted = existingProposals.some(p => p.tradeRequestId === proposalData.tradeRequestId);
      if (alreadySubmitted) {
        return res.status(400).json({ message: "You have already submitted a proposal for this request" });
      }
      
      const proposal = await storage.createTradeProposal(proposalData);
      
      // Update request status to Proposal Review if first proposal
      if (request.status === 'Open') {
        await storage.updateTradeRequest(request.id, { status: 'Proposal Review' });
      }
      
      // Notify all admins of new proposal
      const exporterUser = await storage.getUser(proposalData.exporterUserId);
      notifyAllAdmins({
        title: 'New Trade Proposal',
        message: `${exporterUser?.companyName || exporterUser?.firstName || 'Exporter'} submitted a proposal for ${request.tradeRefId} ($${parseFloat(proposalData.quotePrice).toLocaleString()})`,
        type: 'info',
        link: '/admin/finabridge',
      });

      // Notify importer via email that a new proposal has been submitted
      const importerUser = await storage.getUser(request.importerUserId);
      if (importerUser?.email) {
        // Task #145: counterparty stays anonymous in the email — FT-ID only.
        const exporterFtId = exporterUser?.customFinatradesId || exporterUser?.finatradesId || 'Verified Exporter';
        sendEmail(importerUser.email, EMAIL_TEMPLATES.FINABRIDGE_NEW_PROPOSAL, {
          user_name: `${importerUser.firstName || ''} ${importerUser.lastName || ''}`.trim() || 'Valued Client',
          exporter_name: exporterFtId,
          trade_ref: request.tradeRefId,
          quote_price: parseFloat(proposalData.quotePrice).toLocaleString(),
        }, { userId: request.importerUserId, recipientName: importerUser.firstName || undefined }).catch(err => console.error('[Email] FinaBridge new proposal email failed:', err));
      }
      
      return res.json({ proposal });
    } catch (error) {
      return res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create proposal" });
    }
  });

  // Update exporter proposal (for modification resubmission)
  app.put("/api/finabridge/exporter/proposals/:id", ensureAuthenticated, async (req, res) => {
    try {
      const proposal = await storage.getTradeProposal(req.params.id);
      if (!proposal) {
        return res.status(404).json({ message: "Proposal not found" });
      }
      
      // Only allow update if status is 'Modification Requested'
      if (proposal.status !== 'Modification Requested') {
        return res.status(400).json({ message: "Proposal cannot be modified at this stage" });
      }
      
      const updateData = {
        ...req.body,
        status: 'Submitted' as const, // Reset to Submitted after modification
        modificationRequest: null, // Clear the modification request
      };
      
      const updated = await storage.updateTradeProposal(req.params.id, updateData);
      
      return res.json({ proposal });
    } catch (error) {
      return res.status(400).json({ message: error instanceof Error ? error.message : "Failed to submit proposal" });
    }
  });
  
  // ADMIN ENDPOINTS
  
  // Get users who have accepted FinaBridge disclaimer (admin)
  app.get("/api/admin/finabridge/disclaimer-acceptances", ensureAdminAsync, requirePermission('view_finabridge', 'manage_finabridge'), async (req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      const businessUsers = allUsers.filter(u => u.accountType === 'business');
      
      const usersWithAcceptanceStatus = businessUsers.map(u => ({
        id: u.id,
        finatradesId: u.finatradesId,
        fullName: `${u.firstName} ${u.lastName}`,
        email: u.email,
        companyName: u.companyName,
        finabridgeDisclaimerAcceptedAt: u.finabridgeDisclaimerAcceptedAt,
        finabridgeRole: u.finabridgeRole,
      }));
      
      return res.json({ users: usersWithAcceptanceStatus });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get disclaimer acceptances" });
    }
  });
  
  // Get all trade requests (admin)
  app.get("/api/admin/finabridge/requests", ensureAdminAsync, requirePermission('view_finabridge', 'manage_finabridge'), async (req, res) => {
    try {
      const requests = await storage.getAllTradeRequests();
      
      // Include importer details for admin
      const requestsWithImporter = await Promise.all(
        requests.map(async (request) => {
          const importer = await storage.getUser(request.importerUserId);
          const proposals = await storage.getRequestProposals(request.id);
          return {
            ...request,
            importer: importer ? {
              id: importer.id,
              finatradesId: importer.finatradesId,
              fullName: `${importer.firstName} ${importer.lastName}`,
              email: importer.email,
              companyName: importer.companyName,
            } : null,
            proposalCount: proposals.length,
          };
        })
      );
      
      return res.json({ requests: requestsWithImporter });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get trade requests" });
    }
  });
  
  // Get proposals for a specific request (admin)
  app.get("/api/admin/finabridge/requests/:requestId/proposals", ensureAdminAsync, requirePermission('view_finabridge', 'manage_finabridge'), async (req, res) => {
    try {
      const proposals = await storage.getRequestProposals(req.params.requestId);
      
      // Include exporter details for admin - use exporter profile as fallback for missing proposal fields
      const proposalsWithExporter = await Promise.all(
        proposals.map(async (proposal) => {
          const exporter = await storage.getUser(proposal.exporterUserId);
          const exporterFullName = exporter ? `${exporter.firstName} ${exporter.lastName}` : null;
          return {
            ...proposal,
            // Use exporter profile as fallback for empty proposal fields
            companyName: proposal.companyName || exporter?.companyName || null,
            contactPerson: proposal.contactPerson || exporterFullName,
            contactEmail: proposal.contactEmail || exporter?.email || null,
            contactPhone: proposal.contactPhone || exporter?.phoneNumber || null,
            exporter: exporter ? {
              id: exporter.id,
              finatradesId: exporter.finatradesId,
              fullName: exporterFullName,
              email: exporter.email,
              companyName: exporter.companyName,
              phoneNumber: exporter.phoneNumber,
            } : null,
          };
        })
      );
      
      return res.json({ proposals: proposalsWithExporter });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get proposals" });
    }
  });
  
  // Shortlist a proposal (admin)
  app.post("/api/admin/finabridge/proposals/:id/shortlist", ensureAdminAsync, requirePermission('manage_finabridge'), async (req, res) => {
    try {
      const proposal = await storage.getTradeProposal(req.params.id);
      if (!proposal) {
        return res.status(404).json({ message: "Proposal not found" });
      }
      if (proposal.status !== 'Submitted') {
        return res.status(400).json({ message: "Only submitted proposals can be shortlisted" });
      }
      
      const updated = await storage.updateTradeProposal(req.params.id, { status: 'Shortlisted' });
      return res.json({ proposal: updated });
    } catch (error) {
      return res.status(400).json({ message: "Failed to shortlist proposal" });
    }
  });
  
  // Reject a proposal (admin)
  app.post("/api/admin/finabridge/proposals/:id/reject", ensureAdminAsync, requirePermission('manage_finabridge'), async (req, res) => {
    try {
      const proposal = await storage.getTradeProposal(req.params.id);
      if (!proposal) {
        return res.status(404).json({ message: "Proposal not found" });
      }
      
      const updated = await storage.updateTradeProposal(req.params.id, { status: 'Rejected' });
      
      // Notify exporter that their proposal was declined
      try {
        const tradeReq = await storage.getTradeRequest(proposal.tradeRequestId);
        if (tradeReq) {
          await storage.createNotification({
            userId: proposal.exporterUserId,
            title: 'Trade Proposal Declined',
            message: `Your trade proposal for trade ${tradeReq.tradeRefId} has been declined`,
            type: 'trade',
            link: '/finabridge',
            read: false,
          });
        }
      } catch (e) { console.error('[Notification] Failed to create proposal rejected notification:', e); }
      
      return res.json({ proposal: updated });
    } catch (error) {
      return res.status(400).json({ message: "Failed to reject proposal" });
    }
  });
  
  // Request modification from exporter (admin)
  app.post("/api/admin/finabridge/proposals/:id/request-modification", ensureAdminAsync, requirePermission('manage_finabridge'), async (req, res) => {
    try {
      const proposal = await storage.getTradeProposal(req.params.id);
      if (!proposal) {
        return res.status(404).json({ message: "Proposal not found" });
      }
      
      const { modificationRequest, requestedDocuments, customDocumentNotes } = req.body;
      
      // At least one of: text, documents, or notes must be provided
      if (!modificationRequest && (!requestedDocuments || requestedDocuments.length === 0) && !customDocumentNotes) {
        return res.status(400).json({ message: "Modification request details are required" });
      }
      
      const updated = await storage.updateTradeProposal(req.params.id, { 
        status: 'Modification Requested',
        modificationRequest: modificationRequest?.trim() || '',
        requestedDocuments: requestedDocuments || [],
        customDocumentNotes: customDocumentNotes?.trim() || '',
        uploadedRevisionDocuments: '[]', // Reset uploaded documents on new request
      });
      return res.json({ proposal: updated });
    } catch (error) {
      return res.status(400).json({ message: "Failed to request modification" });
    }
  });
  
  // Forward shortlisted proposals to importer (admin)
  app.post("/api/admin/finabridge/requests/:requestId/forward-proposals", ensureAdminAsync, requirePermission('manage_finabridge'), async (req, res) => {
    try {
      const { proposalIds, adminId } = req.body;
      
      if (!Array.isArray(proposalIds) || proposalIds.length === 0) {
        return res.status(400).json({ message: "No proposals selected" });
      }
      
      const request = await storage.getTradeRequest(req.params.requestId);
      if (!request) {
        return res.status(404).json({ message: "Trade request not found" });
      }
      
      // Verify all proposals are shortlisted
      for (const proposalId of proposalIds) {
        const proposal = await storage.getTradeProposal(proposalId);
        if (!proposal || proposal.status !== 'Shortlisted') {
          return res.status(400).json({ message: `Proposal ${proposalId} is not shortlisted` });
        }
      }
      
      // Create forwarded proposal records and update status
      for (const proposalId of proposalIds) {
        await storage.createForwardedProposal({
          tradeRequestId: req.params.requestId,
          proposalId,
          forwardedByAdminId: adminId,
        });
        await storage.updateTradeProposal(proposalId, { status: 'Forwarded' });
      }
      
      // Update request status
      await storage.updateTradeRequest(req.params.requestId, { status: 'Awaiting Importer' });
      
      // Notify importer that proposals are ready for review
      try {
        const importerRequest = await storage.getTradeRequest(req.params.requestId);
        if (importerRequest) {
          await storage.createNotification({
            userId: importerRequest.importerUserId,
            title: 'New Trade Proposals Ready for Review',
            message: `You have ${proposalIds.length} new trade proposal${proposalIds.length > 1 ? 's' : ''} to review for trade ${importerRequest.tradeRefId} — review now`,
            type: 'trade',
            link: '/finabridge',
            read: false,
          });
        }
      } catch (e) { console.error('[Notification] Failed to create proposal forwarded notification:', e); }
      
      return res.json({ message: `${proposalIds.length} proposals forwarded to importer` });
    } catch (error) {
      return res.status(400).json({ message: error instanceof Error ? error.message : "Failed to forward proposals" });
    }
  });
  
  // ——————————————————————————————————————————————
  // OPTION D — AI VERIFICATION CALLBACK
  // Called by the BullMQ AI worker (Task #34) when verification completes
  // ——————————————————————————————————————————————

  // Internal callback: AI verification completed
  // Protected by a shared secret header (FINABRIDGE_AI_CALLBACK_SECRET env var)
  app.post("/api/admin/finabridge/requests/:id/ai-callback", async (req, res) => {
    const callbackSecret = process.env.FINABRIDGE_AI_CALLBACK_SECRET;
    const providedSecret = req.headers['x-finabridge-secret'];
    if (!callbackSecret || !providedSecret || providedSecret !== callbackSecret) {
      return res.status(401).json({ message: "Unauthorized: invalid or missing callback secret" });
    }
    try {
      const { aiStatus, fraudScore, extractedData, rejectionReason } = req.body;
      const request = await storage.getTradeRequest(req.params.id);
      if (!request) return res.status(404).json({ message: "Trade request not found" });

      const importer = await storage.getUser(request.importerUserId);
      const importerName = importer?.companyName || `${importer?.firstName || ''} ${importer?.lastName || ''}`.trim() || 'Importer';
      const adminUrl = '/admin/finabridge';

      if (aiStatus === 'Pass') {
        // Update request to Tier 1 Review
        await storage.updateTradeRequest(req.params.id, {
          status: 'Pending Review',
          aiVerificationStatus: 'Pass',
          aiFraudScore: fraudScore?.toString() || null,
          aiExtractedData: extractedData ? JSON.stringify(extractedData) : null,
        });

        // Email #3A — AI pass → Macy action required; Farah and Reda get CC awareness copies
        const aiExtractedSummary = extractedData
          ? Object.entries(extractedData as Record<string, unknown>).map(([k, v]) => `${k}: ${v}`).join(' | ')
          : 'No extracted data available';
        const aiPassCommonVars = {
          trade_ref: request.tradeRefId,
          importer_name: importerName,
          fraud_score: fraudScore?.toFixed(1) || '0',
          instrument_type: request.paymentInstrumentType || 'Not specified',
          admin_url: adminUrl,
        };

        // Macy — ACTION REQUIRED (with fraud score + extracted fields summary)
        sendEmailViaTemplate('macy@finatrades.com', EMAIL_TEMPLATES.FINABRIDGE_AI_PASS_ADMIN, {
          admin_name: 'Macy',
          extracted_summary: aiExtractedSummary,
          ...aiPassCommonVars,
        }).catch(err => console.error('[Email] AI pass Macy email failed:', err));

        // Farah and Reda — CC awareness (no action required)
        for (const cc of [{ email: 'farah@finatrades.com', name: 'Farah Hashim' }, { email: 'reda@finatrades.com', name: 'Reda' }]) {
          sendEmailViaTemplate(cc.email, EMAIL_TEMPLATES.FINABRIDGE_AI_PASS_ADMIN_CC, {
            admin_name: cc.name,
            extracted_summary: aiExtractedSummary,
            ...aiPassCommonVars,
          }).catch(err => console.error('[Email] AI pass CC email failed:', err));
        }

        // Email #4 — importer "under review"
        if (importer?.email) {
          sendEmail(importer.email, EMAIL_TEMPLATES.FINABRIDGE_UNDER_REVIEW_IMPORTER, {
            user_name: `${importer.firstName || ''} ${importer.lastName || ''}`.trim() || 'Valued Partner',
            trade_ref: request.tradeRefId,
            goods_name: request.goodsName,
            trade_value: parseFloat(request.tradeValueUsd.toString()).toLocaleString(),
          }, { userId: importer.id, recipientName: importer.firstName || undefined }).catch(err => console.error('[Email] Under review importer email failed:', err));
        }

      } else {
        // AI failed — update request to AI Rejected
        await storage.updateTradeRequest(req.params.id, {
          status: 'AI Rejected',
          aiVerificationStatus: 'Fail',
          aiFraudScore: fraudScore?.toString() || null,
          aiRejectionReason: rejectionReason || 'Document verification failed',
          aiExtractedData: extractedData ? JSON.stringify(extractedData) : null,
        });

        // Terminal pre-escrow outcome — release any open USD wallet margin hold.
        await releaseOpenTradeRequestMarginHold(req.params.id, request.importerUserId, 'AI Rejected');

        // Email #3B — AI fail → importer notification
        if (importer?.email) {
          sendEmail(importer.email, EMAIL_TEMPLATES.FINABRIDGE_AI_REJECTED_IMPORTER, {
            user_name: `${importer.firstName || ''} ${importer.lastName || ''}`.trim() || 'Valued Partner',
            trade_ref: request.tradeRefId,
            rejection_reason: rejectionReason || 'Document verification could not be completed',
            dashboard_url: '/finabridge',
          }, { userId: importer.id, recipientName: importer.firstName || undefined }).catch(err => console.error('[Email] AI rejected importer email failed:', err));
        }

        // Email #3B admin awareness — Macy, Farah, and Reda all receive FYI copy (no action needed)
        const failAdmins = [
          { email: 'macy@finatrades.com', name: 'Macy' },
          { email: 'farah@finatrades.com', name: 'Farah Hashim' },
          { email: 'reda@finatrades.com', name: 'Reda' },
        ];
        for (const admin of failAdmins) {
          sendEmailViaTemplate(admin.email, EMAIL_TEMPLATES.FINABRIDGE_AI_FAIL_ADMIN, {
            admin_name: admin.name,
            trade_ref: request.tradeRefId,
            importer_name: importerName,
            rejection_reason: rejectionReason || 'Document verification failed',
            admin_url: adminUrl,
          }).catch(err => console.error('[Email] AI fail admin copy email failed:', err));
        }
      }

      return res.json({ message: `AI callback processed — status updated to ${aiStatus === 'Pass' ? 'Pending Review' : 'AI Rejected'}` });
    } catch (error) {
      return res.status(400).json({ message: error instanceof Error ? error.message : "Failed to process AI callback" });
    }
  });

  // ——————————————————————————————————————————————
  // OPTION D — THREE-TIER REVIEW ROUTES
  // Tier 1: Macy (macy@finatrades.com)
  // Tier 2: Farah (farah@finatrades.com)
  // Tier 3: Reda / Director (reda@finatrades.com)
  // ——————————————————————————————————————————————

  // Get all requests currently in any tier review stage (AI Review → Tier 3 Review)
  app.get("/api/admin/finabridge/tier-review", ensureAdminAsync, requirePermission('view_finabridge', 'manage_finabridge'), async (req, res) => {
    try {
      const allRequests = await storage.getAllTradeRequests();
      const tierStatuses = ['AI Review', 'AI Rejected', 'Pending Review', 'Pending Review', 'Pending Review'];
      const tierRequests = allRequests.filter(r => tierStatuses.includes(r.status));

      const enriched = await Promise.all(tierRequests.map(async (request) => {
        const importer = await storage.getUser(request.importerUserId);
        return {
          ...request,
          importer: importer ? {
            id: importer.id,
            finatradesId: importer.finatradesId,
            fullName: `${importer.firstName} ${importer.lastName}`.trim(),
            email: importer.email,
            companyName: importer.companyName,
          } : null,
        };
      }));

      return res.json({ requests: enriched });
    } catch (error) {
      console.error('[FinaBridge] GET tier-review failed:', error instanceof Error ? error.message : error);
      notifyError({ error: error instanceof Error ? error : new Error(String(error)), context: 'FinaBridge Tier Review Fetch Failed', route: 'GET /api/admin/finabridge/tier-review' });
      return res.status(400).json({ message: "Failed to get tier review requests" });
    }
  });

  // Single-stage FinaBridge approve (Task #124): one admin reviewer takes the
  // Pending Review request straight to Open and publishes it to exporters.
  // The legacy tier1 endpoint slug is retained so existing admin UIs keep
  // working, but the behavior is now single-stage (no Farah/Reda escalation).
  app.post("/api/admin/finabridge/requests/:id/tier1-approve", ensureAdminAsync, requirePermission('manage_finabridge'), async (req, res) => {
    try {
      const { notes, reviewedBy } = req.body;
      if (!notes || !notes.toString().trim()) return res.status(400).json({ message: "Approval notes are required" });
      const request = await storage.getTradeRequest(req.params.id);
      if (!request) return res.status(404).json({ message: "Trade request not found" });
      if (request.status !== 'Pending Review') return res.status(400).json({ message: "Request is not in Pending Review status" });

      const reviewerName = reviewedBy || 'Compliance';
      await storage.updateTradeRequest(req.params.id, {
        status: 'Open',
        publishedToExporters: true,
        tier1Status: 'Approved',
        tier1Notes: notes || '',
        tier1ReviewedBy: reviewerName,
      });

      const importer = await storage.getUser(request.importerUserId);
      const importerName = importer?.companyName || `${importer?.firstName || ''} ${importer?.lastName || ''}`.trim() || 'Importer';
      const tradeValue = parseFloat(request.tradeValueUsd.toString()).toLocaleString();

      // Notify importer their trade is live on the marketplace
      if (importer?.email) {
        sendEmail(importer.email, EMAIL_TEMPLATES.FINABRIDGE_TRADE_LIVE, {
          user_name: `${importer.firstName || ''} ${importer.lastName || ''}`.trim() || 'Valued Partner',
          trade_ref: request.tradeRefId,
          goods_name: request.goodsName,
          trade_value: tradeValue,
          dashboard_url: '/finabridge',
        }, { userId: importer.id, recipientName: importer.firstName || undefined }).catch(err => console.error('[Email] Trade live importer email failed:', err));
      }

      // FYI to the rest of the compliance team
      for (const teamMember of [
        { email: 'macy@finatrades.com', name: 'Macy' },
        { email: 'farah@finatrades.com', name: 'Farah Hashim' },
        { email: 'reda@finatrades.com', name: 'Reda' },
      ]) {
        sendEmail(teamMember.email, EMAIL_TEMPLATES.FINABRIDGE_TRADE_LIVE_TEAM, {
          admin_name: teamMember.name,
          trade_ref: request.tradeRefId,
          importer_name: importerName,
          trade_value: tradeValue,
          director_name: reviewerName,
          director_notes: notes || 'No notes',
        }).catch(err => console.error('[Email] Trade live team FYI email failed:', err));
      }

      return res.json({ message: "Approved — trade request is now live on exporter marketplace" });
    } catch (error) {
      console.error('[FinaBridge] approve failed for request', req.params.id, ':', error instanceof Error ? error.message : error);
      notifyError({ error: error instanceof Error ? error : new Error(String(error)), context: 'FinaBridge Approve Failed', route: `POST /api/admin/finabridge/requests/${req.params.id}/tier1-approve` });
      return res.status(400).json({ message: error instanceof Error ? error.message : "Failed to approve request" });
    }
  });

  // Tier 1 Reject (Macy → reject and notify importer)
  app.post("/api/admin/finabridge/requests/:id/tier1-reject", ensureAdminAsync, requirePermission('manage_finabridge'), async (req, res) => {
    try {
      const { notes, reviewedBy } = req.body;
      if (!notes || !notes.toString().trim()) return res.status(400).json({ message: "Rejection reason is required" });
      const request = await storage.getTradeRequest(req.params.id);
      if (!request) return res.status(404).json({ message: "Trade request not found" });

      await storage.updateTradeRequest(req.params.id, {
        status: 'Rejected',
        tier1Status: 'Rejected',
        tier1Notes: notes || '',
        tier1ReviewedBy: reviewedBy || 'Macy',
      });

      // Terminal pre-escrow outcome — release any open USD wallet margin hold.
      await releaseOpenTradeRequestMarginHold(req.params.id, request.importerUserId, 'Tier 1 Rejected');

      // Notify importer of rejection
      const importer = await storage.getUser(request.importerUserId);
      if (importer?.email) {
        sendEmail(importer.email, EMAIL_TEMPLATES.FINABRIDGE_AI_REJECTED_IMPORTER, {
          user_name: `${importer.firstName || ''} ${importer.lastName || ''}`.trim() || 'Valued Partner',
          trade_ref: request.tradeRefId,
          rejection_reason: notes || 'Application did not meet compliance requirements',
          dashboard_url: '/finabridge',
        }, { userId: importer.id, recipientName: importer.firstName || undefined }).catch(err => console.error('[Email] Tier1 rejection importer email failed:', err));
      }

      return res.json({ message: "Tier 1 rejected — importer notified" });
    } catch (error) {
      console.error('[FinaBridge] tier1-reject failed for request', req.params.id, ':', error instanceof Error ? error.message : error);
      notifyError({ error: error instanceof Error ? error : new Error(String(error)), context: 'FinaBridge Tier 1 Reject Failed', route: `POST /api/admin/finabridge/requests/${req.params.id}/tier1-reject` });
      return res.status(400).json({ message: error instanceof Error ? error.message : "Failed to reject Tier 1" });
    }
  });

  // Legacy tier-2 escalation endpoint — removed in Task #124 (single-stage review).
  // Returns 410 Gone so any stale clients fail loudly instead of silently.
  app.post("/api/admin/finabridge/requests/:id/tier2-approve", ensureAdminAsync, requirePermission('manage_finabridge'), async (_req, res) => {
    return res.status(410).json({ message: "Tier 2 review removed. FinaBridge now uses a single-stage admin review — use /tier1-approve." });
  });
  app.post("/api/admin/finabridge/requests/:id/tier2-reject", ensureAdminAsync, requirePermission('manage_finabridge'), async (_req, res) => {
    return res.status(410).json({ message: "Tier 2 review removed. FinaBridge now uses a single-stage admin review — use /tier1-reject." });
  });
  app.post("/api/admin/finabridge/requests/:id/tier3-approve", ensureAdminAsync, requirePermission('manage_finabridge'), async (_req, res) => {
    return res.status(410).json({ message: "Director (tier 3) review removed. FinaBridge now uses a single-stage admin review — use /tier1-approve." });
  });
  app.post("/api/admin/finabridge/requests/:id/tier3-reject", ensureAdminAsync, requirePermission('manage_finabridge'), async (_req, res) => {
    return res.status(410).json({ message: "Director (tier 3) review removed. FinaBridge now uses a single-stage admin review — use /tier1-reject." });
  });
  

  // Get FinaBridge ledger history for user - PROTECTED
  app.get("/api/finabridge/ledger/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const userId = req.params.userId;
      const limit = parseInt(req.query.limit as string) || 50;
      
      // Get trade requests created by this user
      const myRequests = await storage.getUserTradeRequests(userId);
      
      // Get settlements where user is involved
      const settlements = await storage.getUserSettlementHolds(userId);
      
      // Vault-ledger transfer history removed with the rest of the legacy gold stack.
      const tradeRelatedEntries: any[] = [];

      // Build ledger entries
      const entries: any[] = [];
      
      // Add trade request funding (gold locked for trades)
      for (const request of myRequests) {
        if (request.status !== 'Open') {
          const goldGrams = parseFloat(request.settlementGoldGrams || '0');
          entries.push({
            id: `request-${request.id}`,
            action: 'Funding_Lock',
            goldGrams: (-goldGrams).toString(),
            valueUsd: request.tradeValueUsd,
            tradeRequestId: request.id,
            balanceAfterGrams: '0',
            notes: `Trade Request - ${request.goodsName || 'Trade'} to ${request.destination || 'N/A'}`,
            createdAt: request.createdAt,
          });
        }
      }
      
      // Add settlements (credits for completed trades)
      for (const settlement of settlements) {
        if (settlement.status === 'Released') {
          const goldGrams = parseFloat(settlement.lockedGoldGrams || '0');
          entries.push({
            id: `settlement-${settlement.id}`,
            action: 'Settlement_Credit',
            goldGrams: goldGrams.toString(),
            tradeRequestId: settlement.tradeRequestId,
            balanceAfterGrams: '0',
            notes: 'Trade Settlement Completed',
            createdAt: settlement.updatedAt || settlement.createdAt,
          });
        }
      }
      
      // Add wallet transfers
      for (const entry of tradeRelatedEntries) {
        entries.push({
          id: `transfer-${entry.id}`,
          action: entry.action,
          goldGrams: entry.goldGrams,
          valueUsd: entry.valueUsd,
          balanceAfterGrams: '0',
          notes: entry.notes || ((entry.action as string) === 'FinaPay_To_Trade' ? 'Transfer from FinaPay' : 'Transfer to FinaPay'),
          createdAt: entry.createdAt,
        });
      }
      
      // Sort by date ascending first to calculate running balances chronologically
      entries.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      
      // Calculate running balances chronologically from beginning
      let runningBal = 0;
      for (const entry of entries) {
        const goldChange = parseFloat(entry.goldGrams);
        runningBal += goldChange; // Positive for credits, negative for debits
        entry.balanceAfterGrams = runningBal.toFixed(6);
      }
      
      // Now reverse to show newest first
      entries.reverse();
      const sortedEntries = entries.slice(0, limit);
      
      return res.json({ entries: sortedEntries });
    } catch (error) {
      console.error("Failed to get FinaBridge ledger:", error);
      return res.status(400).json({ message: "Failed to get FinaBridge ledger history" });
    }
  });
  

  
  // Get user's settlement holds
  app.get("/api/finabridge/settlement-holds/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const holds = await storage.getUserSettlementHolds(req.params.userId);
      return res.json({ holds });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get settlement holds" });
    }
  });
  
  // Admin: Get all settlement holds
  app.get("/api/admin/finabridge/settlement-holds", ensureAdminAsync, requirePermission('view_finabridge', 'manage_finabridge'), async (req, res) => {
    try {
      const holds = await storage.getAllSettlementHolds();
      return res.json({ holds });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get settlement holds" });
    }
  });
  
  // Release settlement hold (admin - after trade completion)
  app.post("/api/admin/finabridge/settlement-holds/:id/release", ensureAdminAsync, requirePermission('manage_finabridge'), async (req, res) => {
    try {
      const hold = await storage.getSettlementHold(req.params.id);
      if (!hold) {
        return res.status(404).json({ message: "Settlement hold not found" });
      }
      if (hold.status !== 'Held') {
        return res.status(400).json({ message: "Settlement hold is not active" });
      }
      
      const lockedAmount = parseFloat(hold.lockedGoldGrams);
      
      // Transfer gold from importer's locked to exporter's available
      const importerWallet = await storage.getFinabridgeWallet(hold.importerUserId);
      if (importerWallet) {
        await storage.updateFinabridgeWallet(importerWallet.id, {
          lockedGoldGrams: (parseFloat(importerWallet.lockedGoldGrams) - lockedAmount).toFixed(6),
        });
      }
      
      const exporterWallet = await storage.getOrCreateFinabridgeWallet(hold.exporterUserId);
      await storage.updateFinabridgeWallet(exporterWallet.id, {
        availableGoldGrams: (parseFloat(exporterWallet.availableGoldGrams) + lockedAmount).toFixed(6),
        incomingLockedGoldGrams: Math.max(0, parseFloat(exporterWallet.incomingLockedGoldGrams || '0') - lockedAmount).toFixed(6),
      });
      
      // Get trade request for transaction details
      const tradeRequest = await storage.getTradeRequest(hold.tradeRequestId);
      const tradeValue = tradeRequest ? parseFloat(tradeRequest.tradeValueUsd) : 0;
      
      // Create transaction record for exporter (receiving gold from trade settlement)
      await storage.createTransaction({
        userId: hold.exporterUserId,
        type: 'Receive',
        status: 'Completed',
        amountUsd: tradeValue.toFixed(2),
        description: `Trade Settlement - ${tradeRequest?.tradeRefId || 'FinaBridge'}`,
        sourceModule: 'FinaBridge',
      });
      
      // Update hold status
      await storage.updateSettlementHold(req.params.id, { status: 'Released' });
      
      // Update trade request status
      await storage.updateTradeRequest(hold.tradeRequestId, { status: 'Completed' });
      
      // Notify both parties that the deal is completed
      try {
        const completedTradeRef = tradeRequest?.tradeRefId || req.params.id;
        const completedDealRoom = await storage.getDealRoomByTradeRequest(hold.tradeRequestId);
        const completedDealLink = completedDealRoom ? `/finabridge/deals/${completedDealRoom.id}` : '/finabridge';
        const completedMsg = `Trade deal ${completedTradeRef} has been completed successfully`;
        await storage.createNotification({ userId: hold.importerUserId, title: 'Trade Deal Completed', message: completedMsg, type: 'trade', link: completedDealLink, read: false });
        await storage.createNotification({ userId: hold.exporterUserId, title: 'Trade Deal Completed', message: completedMsg, type: 'trade', link: completedDealLink, read: false });
      } catch (e) { console.error('[Notification] Failed to create deal completed notification:', e); }
      
      // Emails #11 (importer) and #12 (exporter) — settlement complete
      try {
        const releaseImporter = await storage.getUser(hold.importerUserId);
        const releaseExporter = await storage.getUser(hold.exporterUserId);
        const releaseTradeRef = tradeRequest?.tradeRefId || req.params.id;
        const releaseGoldGrams = lockedAmount.toFixed(3);
        const releaseUsdValue = tradeValue.toLocaleString();

        // Email #11 — importer trade complete (FT-ID only — exporter identity gated)
        if (releaseImporter?.email) {
          const exporterFtIdEmail = releaseExporter
            ? (releaseExporter.customFinatradesId || releaseExporter.finatradesId || `FT-${releaseExporter.id.slice(0, 8).toUpperCase()}`)
            : 'Exporter';
          sendEmail(releaseImporter.email, EMAIL_TEMPLATES.FINABRIDGE_SETTLEMENT_RELEASED, {
            user_name: `${releaseImporter.firstName || ''} ${releaseImporter.lastName || ''}`.trim() || 'Valued Partner',
            trade_ref: releaseTradeRef,
            gold_grams: releaseGoldGrams,
            usd_value: releaseUsdValue,
            exporter_name: exporterFtIdEmail,
            counterparty_ft_id: exporterFtIdEmail,
          }, { userId: hold.importerUserId, recipientName: releaseImporter.firstName || undefined }).catch(err => console.error('[Email] FinaBridge settlement importer email failed:', err));
        }

        // Email #12 — exporter receives gold
        if (releaseExporter?.email) {
          sendEmail(releaseExporter.email, EMAIL_TEMPLATES.FINABRIDGE_SETTLEMENT_EXPORTER, {
            user_name: `${releaseExporter.firstName || ''} ${releaseExporter.lastName || ''}`.trim() || 'Valued Partner',
            trade_ref: releaseTradeRef,
            gold_grams: releaseGoldGrams,
            usd_value: releaseUsdValue,
            dashboard_url: '/finabridge',
          }, { userId: hold.exporterUserId, recipientName: releaseExporter.firstName || undefined }).catch(err => console.error('[Email] FinaBridge settlement exporter email failed:', err));
        }
      } catch (e) { console.error('[Email] Failed to send settlement release emails:', e); }

      // Generate Trade Release Certificates for both importer and exporter (non-blocking)
      const releasedGoldAmount = lockedAmount;
      const releasePrice = tradeValue > 0 ? tradeValue / releasedGoldAmount : 0;
      
      // Find the lock certificate to link as related
      const importerCerts = await storage.getUserActiveCertificates(hold.importerUserId);
      const lockCert = importerCerts.find(c => c.tradeCaseId === hold.tradeRequestId && c.type === 'Trade Lock');
      
      // Generate release certificate for exporter (who receives the gold)
      generateTradeReleaseCertificate(hold.tradeRequestId, hold.exporterUserId, releasedGoldAmount, releasePrice, lockCert?.id)
        .then(result => {
          if (result.error) {
            console.error(`[Routes] Failed to generate Trade Release certificate for exporter:`, result.error);
          } else {
            console.log(`[Routes] Trade Release certificate generated for exporter`);
          }
        })
        .catch(err => console.error('[Routes] Trade Release certificate error:', err));
      
      return res.json({ message: "Settlement released and gold transferred to exporter" });
    } catch (error) {
      return res.status(400).json({ message: error instanceof Error ? error.message : "Failed to release settlement" });
    }
  });

  // Cancel settlement hold (admin - return gold to importer)
  app.post("/api/admin/finabridge/settlement-holds/:id/cancel", ensureAdminAsync, requirePermission('manage_finabridge'), async (req, res) => {
    try {
      const { reason } = req.body;
      const adminUser = req.adminUser!;
      
      const hold = await storage.getSettlementHold(req.params.id);
      if (!hold) {
        return res.status(404).json({ message: "Settlement hold not found" });
      }
      if (hold.status !== 'Held') {
        return res.status(400).json({ message: "Settlement hold is not active" });
      }
      
      const lockedAmount = parseFloat(hold.lockedGoldGrams);
      
      // Return gold to importer's available balance
      const importerWallet = await storage.getFinabridgeWallet(hold.importerUserId);
      if (importerWallet) {
        await storage.updateFinabridgeWallet(importerWallet.id, {
          lockedGoldGrams: Math.max(0, parseFloat(importerWallet.lockedGoldGrams) - lockedAmount).toFixed(6),
          availableGoldGrams: (parseFloat(importerWallet.availableGoldGrams) + lockedAmount).toFixed(6),
        });
      }
      
      // Clear exporter's incoming locked gold
      const exporterWallet = await storage.getFinabridgeWallet(hold.exporterUserId);
      if (exporterWallet) {
        await storage.updateFinabridgeWallet(exporterWallet.id, {
          incomingLockedGoldGrams: Math.max(0, parseFloat(exporterWallet.incomingLockedGoldGrams || '0') - lockedAmount).toFixed(6),
        });
      }
      
      // Update hold status
      await storage.updateSettlementHold(req.params.id, { status: 'Cancelled' });
      
      // Update trade request status
      await storage.updateTradeRequest(hold.tradeRequestId, { status: 'Cancelled' });

      // Release any still-open USD wallet margin hold for this trade request so
      // the importer's locked balance is returned to available. By the normal
      // flow the hold was converted to escrow at proposal-accept time, but if
      // the conversion was skipped or failed we release here as a safety net.
      try {
        const walletHold = await findOpenWalletHoldForTradeRequest(hold.tradeRequestId, hold.importerUserId);
        if (walletHold) {
          await walletReleaseHold({
            userId: hold.importerUserId,
            holdId: walletHold.id,
          });
        }
      } catch (releaseErr) {
        console.error('[Wallet] Failed to release margin hold on settlement cancel:', releaseErr);
      }
      
      // Vault-ledger recording removed with the rest of the legacy gold stack.

      // Audit log
      await storage.createAuditLog({
        entityType: "settlement_hold",
        entityId: req.params.id,
        actionType: "cancel",
        actor: adminUser.id,
        actorRole: "admin",
        details: `Settlement cancelled, ${lockedAmount}g returned to importer. Reason: ${reason}`,
      });
      
      return res.json({ message: "Settlement cancelled and gold returned to importer" });
    } catch (error) {
      return res.status(400).json({ message: error instanceof Error ? error.message : "Failed to cancel settlement" });
    }
  });

  // Partial settlement release (admin - release portion of gold)
  app.post("/api/admin/finabridge/settlement-holds/:id/partial-release", ensureAdminAsync, requirePermission('manage_finabridge'), async (req, res) => {
    try {
      const { percentage, reason, milestone } = req.body;
      const adminUser = req.adminUser!;
      
      if (!percentage || percentage <= 0 || percentage > 100) {
        return res.status(400).json({ message: "Invalid release percentage (must be 1-100)" });
      }
      
      const hold = await storage.getSettlementHold(req.params.id);
      if (!hold) {
        return res.status(404).json({ message: "Settlement hold not found" });
      }
      if (hold.status !== 'Held') {
        return res.status(400).json({ message: "Settlement hold is not active" });
      }
      
      // Calculate released amount
      const totalLocked = parseFloat(hold.lockedGoldGrams);
      const releaseGrams = (totalLocked * percentage) / 100;
      
      // Check how much has already been released
      const existingReleases = await db.select().from(partialSettlements).where(eq(partialSettlements.settlementHoldId, hold.id));
      const totalReleased = existingReleases.reduce((sum, r) => sum + parseFloat(r.releasedGoldGrams), 0);
      const remaining = totalLocked - totalReleased;
      
      if (releaseGrams > remaining) {
        return res.status(400).json({ message: `Cannot release ${releaseGrams.toFixed(4)}g. Only ${remaining.toFixed(4)}g remaining.` });
      }
      
      // Update importer's locked balance
      const importerWallet = await storage.getFinabridgeWallet(hold.importerUserId);
      if (importerWallet) {
        await storage.updateFinabridgeWallet(importerWallet.id, {
          lockedGoldGrams: Math.max(0, parseFloat(importerWallet.lockedGoldGrams) - releaseGrams).toFixed(6),
        });
      }
      
      // Credit exporter's available balance
      const exporterWallet = await storage.getOrCreateFinabridgeWallet(hold.exporterUserId);
      await storage.updateFinabridgeWallet(exporterWallet.id, {
        availableGoldGrams: (parseFloat(exporterWallet.availableGoldGrams) + releaseGrams).toFixed(6),
        incomingLockedGoldGrams: Math.max(0, parseFloat(exporterWallet.incomingLockedGoldGrams || '0') - releaseGrams).toFixed(6),
      });
      
      // Get trade request for transaction details
      const tradeRequest = await storage.getTradeRequest(hold.tradeRequestId);
      const tradeValue = tradeRequest ? parseFloat(tradeRequest.tradeValueUsd) * (percentage / 100) : 0;
      
      // Create transaction record for exporter
      const tx = await storage.createTransaction({
        userId: hold.exporterUserId,
        type: 'Receive',
        status: 'Completed',
        amountUsd: tradeValue.toFixed(2),
        description: `Partial Trade Settlement (${percentage}%) - ${tradeRequest?.tradeRefId || 'FinaBridge'}${milestone ? ': ' + milestone : ''}`,
        sourceModule: 'FinaBridge',
      });
      
      // Record partial settlement
      await db.insert(partialSettlements).values({
        id: crypto.randomUUID(),
        settlementHoldId: hold.id,
        tradeRequestId: hold.tradeRequestId,
        releasedGoldGrams: releaseGrams.toFixed(6),
        releasePercentage: percentage.toString(),
        reason,
        milestone,
        releasedBy: adminUser.id,
        transactionId: tx.id,
      });
      
      // Vault-ledger recording removed with the rest of the legacy gold stack.

      // Audit log
      await storage.createAuditLog({
        entityType: "settlement_hold",
        entityId: hold.id,
        actionType: "partial_release",
        actor: adminUser.id,
        actorRole: "admin",
        details: `Partial release: ${releaseGrams.toFixed(4)}g (${percentage}%) to exporter. Milestone: ${milestone || 'N/A'}. Reason: ${reason || 'N/A'}`,
      });
      
      // Check if fully released
      const newTotalReleased = totalReleased + releaseGrams;
      if (Math.abs(newTotalReleased - totalLocked) < 0.000001) {
        await storage.updateSettlementHold(hold.id, { status: 'Released' });
        await storage.updateTradeRequest(hold.tradeRequestId, { status: 'Completed' });
      }
      
      return res.json({ 
        message: `Released ${releaseGrams.toFixed(4)}g (${percentage}%) to exporter`,
        released: releaseGrams,
        remaining: remaining - releaseGrams,
        totalReleased: newTotalReleased,
      });
    } catch (error) {
      return res.status(400).json({ message: error instanceof Error ? error.message : "Failed to release partial settlement" });
    }
  });

  // Get partial settlements for a hold
  app.get("/api/admin/finabridge/settlement-holds/:id/partial-releases", ensureAdminAsync, requirePermission('view_finabridge', 'manage_finabridge'), async (req, res) => {
    try {
      const releases = await db.select().from(partialSettlements).where(eq(partialSettlements.settlementHoldId, req.params.id)).orderBy(desc(partialSettlements.createdAt));
      return res.json({ releases });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get partial releases" });
    }
  });

  // ============================================================================
  // FINABRIDGE - TRADE DISPUTES
  // ============================================================================

  // Raise a dispute
  app.post("/api/finabridge/disputes", ensureAuthenticated, async (req, res) => {
    try {
      const { tradeRequestId, dealRoomId, disputeType, subject, description, evidenceUrls, requestedResolution } = req.body;
      const sessionUserId = req.session?.userId;
      
      if (!sessionUserId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(sessionUserId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const tradeRequest = await storage.getTradeRequest(tradeRequestId);
      if (!tradeRequest) {
        return res.status(404).json({ message: "Trade request not found" });
      }
      
      // Verify user is party to the trade and determine role
      let userRole = '';
      if (tradeRequest.importerUserId === sessionUserId) {
        userRole = 'importer';
      } else {
        const proposals = await storage.getRequestProposals(tradeRequestId);
        const isExporter = proposals.some(p => p.exporterUserId === sessionUserId && p.status === 'Accepted');
        if (isExporter) {
          userRole = 'exporter';
        } else {
          return res.status(403).json({ message: "Not authorized to raise dispute on this trade" });
        }
      }
      
      const disputeRefId = `DSP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 4).toUpperCase()}`;
      
      const [dispute] = await db.insert(tradeDisputes).values({
        id: crypto.randomUUID(),
        disputeRefId,
        tradeRequestId,
        dealRoomId,
        raisedByUserId: sessionUserId,
        raisedByRole: userRole,
        disputeType,
        subject,
        description,
        evidenceUrls,
        requestedResolution,
        status: 'Open',
        priority: 'Medium',
      }).returning();
      
      await storage.createAuditLog({
        entityType: "trade_dispute",
        entityId: dispute.id,
        actionType: "create",
        actor: sessionUserId,
        actorRole: userRole,
        details: `Dispute raised: ${subject}`,
      });
      
      // Notify both parties about the dispute
      try {
        const disputeDealLink = dealRoomId ? `/finabridge/deals/${dealRoomId}` : '/finabridge';
        const disputeMsg = `A dispute has been raised on trade ${tradeRequest.tradeRefId}: "${subject}"`;
        // Notify importer
        await storage.createNotification({ userId: tradeRequest.importerUserId, title: 'Trade Dispute Raised', message: disputeMsg, type: 'trade', link: disputeDealLink, read: false });
        // Notify exporter — find them via accepted proposals
        const disputeProposals = await storage.getRequestProposals(tradeRequestId);
        const acceptedProp = disputeProposals.find(p => p.status === 'Accepted');
        if (acceptedProp) {
          await storage.createNotification({ userId: acceptedProp.exporterUserId, title: 'Trade Dispute Raised', message: disputeMsg, type: 'trade', link: disputeDealLink, read: false });
        }
      } catch (e) { console.error('[Notification] Failed to create dispute raised notification:', e); }
      
      return res.json({ dispute, message: "Dispute submitted successfully" });
    } catch (error) {
      return res.status(400).json({ message: error instanceof Error ? error.message : "Failed to raise dispute" });
    }
  });

  // Get user's disputes
  app.get("/api/finabridge/disputes/user/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const disputes = await db.select().from(tradeDisputes).where(eq(tradeDisputes.raisedByUserId, req.params.userId)).orderBy(desc(tradeDisputes.createdAt));
      return res.json({ disputes });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get disputes" });
    }
  });

  // Get dispute by ID
  app.get("/api/finabridge/disputes/:id", ensureAuthenticated, async (req, res) => {
    try {
      const sessionUserId = req.session?.userId;
      if (!sessionUserId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const [dispute] = await db.select().from(tradeDisputes).where(eq(tradeDisputes.id, req.params.id));
      if (!dispute) {
        return res.status(404).json({ message: "Dispute not found" });
      }
      
      // Check if admin with FinaBridge permissions.
      // `permissions` lives on the `employees` table (string[]), not on `users`.
      // Some legacy admin records also carry a `permissions` array on the user
      // row, so we read it via an index access until the storage layer is
      // refactored to always return the resolved employee permissions.
      const sessionUser = await storage.getUser(sessionUserId);
      const sessionPerms = (sessionUser as unknown as { permissions?: string[] } | undefined)?.permissions;
      const isAdmin = sessionUser?.role === 'admin' && (sessionPerms?.includes('view_finabridge') || sessionPerms?.includes('manage_finabridge'));
      
      if (!isAdmin) {
        // Verify user is party to the trade or is the dispute raiser
        const tradeRequest = await storage.getTradeRequest(dispute.tradeRequestId);
        if (!tradeRequest) {
          return res.status(404).json({ message: "Trade not found" });
        }
        
        const isImporter = tradeRequest.importerUserId === sessionUserId;
        const proposals = await storage.getRequestProposals(dispute.tradeRequestId);
        const isExporter = proposals.some(p => p.exporterUserId === sessionUserId && p.status === 'Accepted');
        const isDisputeRaiser = dispute.raisedByUserId === sessionUserId;
        
        if (!isImporter && !isExporter && !isDisputeRaiser) {
          return res.status(403).json({ message: "Not authorized to view this dispute" });
        }
      }
      
      const comments = await db.select().from(tradeDisputeComments).where(eq(tradeDisputeComments.disputeId, dispute.id)).orderBy(tradeDisputeComments.createdAt);
      
      return res.json({ dispute, comments });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get dispute" });
    }
  });

  // Add comment to dispute
  app.post("/api/finabridge/disputes/:id/comments", ensureAuthenticated, async (req, res) => {
    try {
      const { content, attachmentUrl, isInternal } = req.body;
      const sessionUserId = req.session?.userId;
      
      if (!sessionUserId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const [dispute] = await db.select().from(tradeDisputes).where(eq(tradeDisputes.id, req.params.id));
      if (!dispute) {
        return res.status(404).json({ message: "Dispute not found" });
      }
      
      // Check if admin with FinaBridge permissions.
      // See note above: `permissions` is not part of the typed User shape.
      const sessionUser = await storage.getUser(sessionUserId);
      const sessionPerms = (sessionUser as unknown as { permissions?: string[] } | undefined)?.permissions;
      const isAdmin = sessionUser?.role === 'admin' && sessionPerms?.includes('manage_finabridge');
      
      let userRole = '';
      if (isAdmin) {
        userRole = 'admin';
      } else {
        // Verify user is party to the trade
        const tradeRequest = await storage.getTradeRequest(dispute.tradeRequestId);
        if (!tradeRequest) {
          return res.status(404).json({ message: "Trade not found" });
        }
        
        if (tradeRequest.importerUserId === sessionUserId) {
          userRole = 'importer';
        } else {
          const proposals = await storage.getRequestProposals(dispute.tradeRequestId);
          const isExporter = proposals.some(p => p.exporterUserId === sessionUserId && p.status === 'Accepted');
          if (isExporter) {
            userRole = 'exporter';
          } else {
            return res.status(403).json({ message: "Not authorized to comment on this dispute" });
          }
        }
      }
      
      const [comment] = await db.insert(tradeDisputeComments).values({
        id: crypto.randomUUID(),
        disputeId: dispute.id,
        userId: sessionUserId,
        userRole,
        content,
        attachmentUrl,
        isInternal: isAdmin ? (isInternal || false) : false,
      }).returning();
      
      return res.json({ comment });
    } catch (error) {
      return res.status(400).json({ message: "Failed to add comment" });
    }
  });

  // Admin: Get all disputes
  app.get("/api/admin/finabridge/disputes", ensureAdminAsync, requirePermission('view_finabridge', 'manage_finabridge'), async (req, res) => {
    try {
      const disputes = await db.select().from(tradeDisputes).orderBy(desc(tradeDisputes.createdAt));
      
      const disputesWithDetails = await Promise.all(disputes.map(async (dispute) => {
        const tradeRequest = await storage.getTradeRequest(dispute.tradeRequestId);
        const raisedBy = await storage.getUser(dispute.raisedByUserId);
        return {
          ...dispute,
          tradeRequest: tradeRequest ? { tradeRefId: tradeRequest.tradeRefId, goodsName: tradeRequest.goodsName } : null,
          raisedBy: raisedBy ? { id: raisedBy.id, email: raisedBy.email, finatradesId: raisedBy.finatradesId } : null,
        };
      }));
      
      return res.json({ disputes: disputesWithDetails });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get disputes" });
    }
  });

  // Admin: Update dispute status
  app.post("/api/admin/finabridge/disputes/:id/status", ensureAdminAsync, requirePermission('manage_finabridge'), async (req, res) => {
    try {
      const { status, assignedAdminId } = req.body;
      const adminUser = req.adminUser!;
      
      const [dispute] = await db.select().from(tradeDisputes).where(eq(tradeDisputes.id, req.params.id));
      if (!dispute) {
        return res.status(404).json({ message: "Dispute not found" });
      }
      
      await db.update(tradeDisputes).set({
        status,
        assignedAdminId: assignedAdminId || dispute.assignedAdminId,
        updatedAt: new Date(),
      }).where(eq(tradeDisputes.id, req.params.id));
      
      await storage.createAuditLog({
        entityType: "trade_dispute",
        entityId: dispute.id,
        actionType: "update_status",
        actor: adminUser.id,
        actorRole: "admin",
        details: `Status changed to ${status}`,
      });
      
      return res.json({ message: "Dispute status updated" });
    } catch (error) {
      return res.status(400).json({ message: "Failed to update dispute" });
    }
  });

  // Admin: Resolve dispute
  app.post("/api/admin/finabridge/disputes/:id/resolve", ensureAdminAsync, requirePermission('manage_finabridge'), async (req, res) => {
    try {
      const { resolution } = req.body;
      const adminUser = req.adminUser!;
      
      const [dispute] = await db.select().from(tradeDisputes).where(eq(tradeDisputes.id, req.params.id));
      if (!dispute) {
        return res.status(404).json({ message: "Dispute not found" });
      }
      
      await db.update(tradeDisputes).set({
        status: 'Resolved',
        resolution,
        resolvedBy: adminUser.id,
        resolvedAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(tradeDisputes.id, req.params.id));
      
      await storage.createAuditLog({
        entityType: "trade_dispute",
        entityId: dispute.id,
        actionType: "resolve",
        actor: adminUser.id,
        actorRole: "admin",
        details: `Dispute resolved: ${resolution}`,
      });
      
      return res.json({ message: "Dispute resolved successfully" });
    } catch (error) {
      return res.status(400).json({ message: "Failed to resolve dispute" });
    }
  });

  // ============================================================================
  // FINABRIDGE - SHIPMENT TRACKING
  // ============================================================================

  // Get shipment for trade request
  app.get("/api/finabridge/shipments/:tradeRequestId", ensureAuthenticated, async (req, res) => {
    try {
      const [shipment] = await db.select().from(tradeShipments)
        .where(eq(tradeShipments.tradeRequestId, req.params.tradeRequestId));
      
      if (!shipment) {
        return res.json({ shipment: null });
      }
      
      const milestones = await db.select().from(shipmentMilestones)
        .where(eq(shipmentMilestones.shipmentId, shipment.id))
        .orderBy(shipmentMilestones.createdAt);
      
      return res.json({ shipment: { ...shipment, milestones } });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get shipment" });
    }
  });

  // Create/update shipment (admin)
  app.post("/api/admin/finabridge/shipments", ensureAdminAsync, requirePermission('manage_finabridge'), async (req, res) => {
    try {
      const { 
        tradeRequestId, dealRoomId, trackingNumber, courierName, status,
        estimatedShipDate, actualShipDate, estimatedArrivalDate, actualArrivalDate,
        originPort, destinationPort, currentLocation, customsStatus, notes
      } = req.body;
      
      const [existing] = await db.select().from(tradeShipments)
        .where(eq(tradeShipments.tradeRequestId, tradeRequestId));
      
      if (existing) {
        const [updated] = await db.update(tradeShipments).set({
          trackingNumber, courierName, status, estimatedShipDate: estimatedShipDate ? new Date(estimatedShipDate) : null,
          actualShipDate: actualShipDate ? new Date(actualShipDate) : null, estimatedArrivalDate: estimatedArrivalDate ? new Date(estimatedArrivalDate) : null,
          actualArrivalDate: actualArrivalDate ? new Date(actualArrivalDate) : null, originPort, destinationPort, currentLocation, customsStatus, notes,
          updatedAt: new Date()
        }).where(eq(tradeShipments.id, existing.id)).returning();
        
        // Notify both parties of shipment update (bell + email)
        try {
          const tradeReq = await storage.getTradeRequest(tradeRequestId);
          if (tradeReq) {
            const dealRoomForShipment = await storage.getDealRoomByTradeRequest(tradeRequestId);
            const dealLink = dealRoomForShipment ? `/finabridge/deals/${dealRoomForShipment.id}` : '/finabridge';
            const shipmentMsg = `Shipment status updated on deal ${tradeReq.tradeRefId}${status ? ` — now: ${status}` : ''}`;
            await storage.createNotification({ userId: tradeReq.importerUserId, title: 'Shipment Update', message: shipmentMsg, type: 'trade', link: dealLink, read: false });
            const acceptedProposals = await storage.getRequestProposals(tradeRequestId);
            const acceptedProposal = acceptedProposals.find(p => p.status === 'Accepted');
            if (acceptedProposal) {
              await storage.createNotification({ userId: acceptedProposal.exporterUserId, title: 'Shipment Update', message: shipmentMsg, type: 'trade', link: dealLink, read: false });
            }

            // Send finabridge_shipment_update emails to both importer and exporter
            const shipmentStatusText = status || 'Updated';
            const shipmentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
            const importerUser = await storage.getUser(tradeReq.importerUserId);
            if (importerUser?.email) {
              sendEmail(importerUser.email, EMAIL_TEMPLATES.FINABRIDGE_SHIPMENT_UPDATE, {
                user_name: `${importerUser.firstName || ''} ${importerUser.lastName || ''}`.trim() || 'Valued Client',
                trade_ref: tradeReq.tradeRefId,
                shipment_status: shipmentStatusText,
                tracking_number: trackingNumber || 'N/A',
                current_location: currentLocation || 'N/A',
                dashboard_url: dealLink,
              }, { userId: importerUser.id }).catch(e => console.error('[Email] Shipment update importer email failed:', e));
            }
            if (acceptedProposal) {
              const exporterUser = await storage.getUser(acceptedProposal.exporterUserId);
              if (exporterUser?.email) {
                sendEmail(exporterUser.email, EMAIL_TEMPLATES.FINABRIDGE_SHIPMENT_UPDATE, {
                  user_name: `${exporterUser.firstName || ''} ${exporterUser.lastName || ''}`.trim() || 'Valued Partner',
                  trade_ref: tradeReq.tradeRefId,
                  shipment_status: shipmentStatusText,
                  tracking_number: trackingNumber || 'N/A',
                  current_location: currentLocation || 'N/A',
                  dashboard_url: dealLink,
                }, { userId: exporterUser.id }).catch(e => console.error('[Email] Shipment update exporter email failed:', e));
              }
            }
          }
        } catch (e) { console.error('[Notification] Failed to create shipment update notification:', e); }
        
        return res.json({ shipment: updated });
      } else {
        const [shipment] = await db.insert(tradeShipments).values({
          id: crypto.randomUUID(), tradeRequestId, dealRoomId, trackingNumber, courierName, status: status || 'Pending',
          estimatedShipDate: estimatedShipDate ? new Date(estimatedShipDate) : null, actualShipDate: actualShipDate ? new Date(actualShipDate) : null,
          estimatedArrivalDate: estimatedArrivalDate ? new Date(estimatedArrivalDate) : null, actualArrivalDate: actualArrivalDate ? new Date(actualArrivalDate) : null,
          originPort, destinationPort, currentLocation, customsStatus, notes
        }).returning();
        
        // Notify both parties of new shipment tracking (bell + email)
        try {
          const tradeReq = await storage.getTradeRequest(tradeRequestId);
          if (tradeReq) {
            const dealRoomForShipment = dealRoomId ? await storage.getDealRoom(dealRoomId) : await storage.getDealRoomByTradeRequest(tradeRequestId);
            const dealLink = dealRoomForShipment ? `/finabridge/deals/${dealRoomForShipment.id}` : '/finabridge';
            const shipmentMsg = `Shipment status updated on deal ${tradeReq.tradeRefId}`;
            await storage.createNotification({ userId: tradeReq.importerUserId, title: 'Shipment Update', message: shipmentMsg, type: 'trade', link: dealLink, read: false });
            const allProposals = await storage.getRequestProposals(tradeRequestId);
            const acceptedProposal = allProposals.find(p => p.status === 'Accepted');
            if (acceptedProposal) {
              await storage.createNotification({ userId: acceptedProposal.exporterUserId, title: 'Shipment Update', message: shipmentMsg, type: 'trade', link: dealLink, read: false });
            }

            // Send finabridge_shipment_update emails for new shipment creation
            const importerUser = await storage.getUser(tradeReq.importerUserId);
            if (importerUser?.email) {
              sendEmail(importerUser.email, EMAIL_TEMPLATES.FINABRIDGE_SHIPMENT_UPDATE, {
                user_name: `${importerUser.firstName || ''} ${importerUser.lastName || ''}`.trim() || 'Valued Client',
                trade_ref: tradeReq.tradeRefId,
                shipment_status: status || 'Tracking Created',
                tracking_number: trackingNumber || 'N/A',
                current_location: currentLocation || 'N/A',
                dashboard_url: dealLink,
              }, { userId: importerUser.id }).catch(e => console.error('[Email] New shipment importer email failed:', e));
            }
            if (acceptedProposal) {
              const exporterUser = await storage.getUser(acceptedProposal.exporterUserId);
              if (exporterUser?.email) {
                sendEmail(exporterUser.email, EMAIL_TEMPLATES.FINABRIDGE_SHIPMENT_UPDATE, {
                  user_name: `${exporterUser.firstName || ''} ${exporterUser.lastName || ''}`.trim() || 'Valued Partner',
                  trade_ref: tradeReq.tradeRefId,
                  shipment_status: status || 'Tracking Created',
                  tracking_number: trackingNumber || 'N/A',
                  current_location: currentLocation || 'N/A',
                  dashboard_url: dealLink,
                }, { userId: exporterUser.id }).catch(e => console.error('[Email] New shipment exporter email failed:', e));
              }
            }
          }
        } catch (e) { console.error('[Notification] Failed to create new shipment notification:', e); }
        
        return res.json({ shipment });
      }
    } catch (error) {
      return res.status(400).json({ message: "Failed to update shipment" });
    }
  });

  // Add shipment milestone (admin)
  app.post("/api/admin/finabridge/shipments/:shipmentId/milestones", ensureAdminAsync, requirePermission('manage_finabridge'), async (req, res) => {
    try {
      const { milestone, status, location, description } = req.body;
      const [created] = await db.insert(shipmentMilestones).values({
        id: crypto.randomUUID(), shipmentId: req.params.shipmentId, milestone, status: status || 'completed',
        location, description, completedAt: status === 'completed' ? new Date() : null
      }).returning();
      return res.json({ milestone: created });
    } catch (error) {
      return res.status(400).json({ message: "Failed to add milestone" });
    }
  });

  // ============================================================================
  // FINABRIDGE - TRADE CERTIFICATES
  // ============================================================================

  // Get certificates for trade
  app.get("/api/finabridge/certificates/:tradeRequestId", ensureAuthenticated, async (req, res) => {
    try {
      const certificates = await db.select().from(tradeCertificates)
        .where(eq(tradeCertificates.tradeRequestId, req.params.tradeRequestId))
        .orderBy(desc(tradeCertificates.createdAt));
      return res.json({ certificates });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get certificates" });
    }
  });

  // Generate certificate (admin)
  app.post("/api/finabridge/certificates", ensureAuthenticated, async (req, res) => {
    try {
      const { tradeRequestId, type } = req.body;
      const tradeRequest = await storage.getTradeRequest(tradeRequestId);
      if (!tradeRequest) {
        return res.status(404).json({ message: "Trade request not found" });
      }
      
      const certNumber = `TC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const [certificate] = await db.insert(tradeCertificates).values({
        id: crypto.randomUUID(), tradeRequestId, certificateNumber: certNumber, type,
        importerUserId: tradeRequest.importerUserId, tradeValueUsd: tradeRequest.tradeValueUsd,
        settlementGoldGrams: tradeRequest.settlementGoldGrams, goodsDescription: tradeRequest.goodsName,
        incoterms: tradeRequest.incoterms, signedBy: 'Finatrades Admin'
      }).returning();
      return res.json({ certificate });
    } catch (error) {
      return res.status(400).json({ message: "Failed to generate certificate" });
    }
  });

  // ============================================================================
  // FINABRIDGE - EXPORTER RATINGS & TRUST SCORES
  // ============================================================================

  // Get exporter trust score
  app.get("/api/finabridge/exporter/:userId/trust-score", ensureAuthenticated, async (req, res) => {
    try {
      let [trustScore] = await db.select().from(exporterTrustScores)
        .where(eq(exporterTrustScores.exporterUserId, req.params.userId));
      
      if (!trustScore) {
        [trustScore] = await db.insert(exporterTrustScores).values({
          id: crypto.randomUUID(), exporterUserId: req.params.userId, trustScore: 50, verificationLevel: 'Unverified'
        }).returning();
      }
      return res.json({ trustScore });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get trust score" });
    }
  });

  // Submit rating
  app.post("/api/finabridge/ratings", ensureAuthenticated, async (req, res) => {
    try {
      const sessionUserId = req.session?.userId;
      if (!sessionUserId) return res.status(401).json({ message: "Not authenticated" });
      
      const { exporterUserId, tradeRequestId, overallRating, qualityRating, communicationRating, deliveryRating, review } = req.body;
      
      const [rating] = await db.insert(exporterRatings).values({
        id: crypto.randomUUID(), exporterUserId, importerUserId: sessionUserId, tradeRequestId,
        overallRating, qualityRating, communicationRating, deliveryRating, review
      }).returning();
      
      // Update trust score
      const ratings = await db.select().from(exporterRatings).where(eq(exporterRatings.exporterUserId, exporterUserId));
      const avgRating = ratings.reduce((sum, r) => sum + r.overallRating, 0) / ratings.length;
      const trustScoreValue = Math.min(100, Math.round(avgRating * 20));
      
      await db.update(exporterTrustScores).set({
        averageRating: avgRating.toFixed(2), totalRatings: ratings.length, trustScore: trustScoreValue, updatedAt: new Date()
      }).where(eq(exporterTrustScores.exporterUserId, exporterUserId));
      
      return res.json({ rating, message: "Rating submitted successfully" });
    } catch (error) {
      return res.status(400).json({ message: "Failed to submit rating" });
    }
  });

  // Get exporter ratings
  app.get("/api/finabridge/exporter/:userId/ratings", ensureAuthenticated, async (req, res) => {
    try {
      const ratings = await db.select().from(exporterRatings)
        .where(eq(exporterRatings.exporterUserId, req.params.userId))
        .orderBy(desc(exporterRatings.createdAt));
      return res.json({ ratings });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get ratings" });
    }
  });

  // ============================================================================
  // FINABRIDGE - TRADE RISK ASSESSMENTS
  // ============================================================================

  // Get risk assessment for trade
  app.get("/api/finabridge/risk-assessment/:tradeRequestId", ensureAuthenticated, async (req, res) => {
    try {
      const [assessment] = await db.select().from(tradeRiskAssessments)
        .where(eq(tradeRiskAssessments.tradeRequestId, req.params.tradeRequestId));
      return res.json({ assessment });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get risk assessment" });
    }
  });

  // Create/update risk assessment (admin)
  app.post("/api/admin/finabridge/risk-assessment", ensureAdminAsync, requirePermission('manage_finabridge'), async (req, res) => {
    try {
      const adminUser = req.adminUser!;
      const { tradeRequestId, riskScore, riskLevel, importerKycStatus, exporterKycStatus, countryRisk, valueRisk, exporterHistoryRisk, riskFactors, mitigationNotes, isFlagged, flagReason } = req.body;
      
      const [existing] = await db.select().from(tradeRiskAssessments).where(eq(tradeRiskAssessments.tradeRequestId, tradeRequestId));
      
      if (existing) {
        const [updated] = await db.update(tradeRiskAssessments).set({
          riskScore, riskLevel, importerKycStatus, exporterKycStatus, countryRisk, valueRisk, exporterHistoryRisk, riskFactors, mitigationNotes, isFlagged, flagReason, assessedBy: adminUser.id, assessedAt: new Date()
        }).where(eq(tradeRiskAssessments.id, existing.id)).returning();
        return res.json({ assessment: updated });
      } else {
        const [assessment] = await db.insert(tradeRiskAssessments).values({
          id: crypto.randomUUID(), tradeRequestId, riskScore, riskLevel, importerKycStatus, exporterKycStatus, countryRisk, valueRisk, exporterHistoryRisk, riskFactors, mitigationNotes, isFlagged, flagReason, assessedBy: adminUser.id
        }).returning();
        return res.json({ assessment });
      }
    } catch (error) {
      return res.status(400).json({ message: "Failed to update risk assessment" });
    }
  });

  // ============================================================================
  // FINABRIDGE - TRADE ANALYTICS
  // ============================================================================

  // Get trade cases with AI-verified documents - ADMIN
  app.get("/api/admin/finabridge/ai-cases", ensureAdminAsync, requirePermission('view_finabridge', 'manage_finabridge'), async (req, res) => {
    try {
      const allCases = await storage.getAllTradeCases();
      const casesWithDocs = await Promise.all(
        allCases.map(async (tc) => {
          const docs = await storage.getCaseDocuments(tc.id);
          const aiDocs = docs.filter(d =>
            d.status === 'Pending Review' || d.status === 'AI Rejected'
          );
          return { ...tc, documents: aiDocs };
        })
      );
      const filteredCases = casesWithDocs.filter(tc => tc.documents && tc.documents.length > 0);
      return res.json({ cases: filteredCases });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get AI cases" });
    }
  });

  // Get AI verification report for a trade document - ADMIN
  app.get("/api/admin/finabridge/documents/:documentId/ai-report", ensureAdminAsync, requirePermission('view_finabridge', 'manage_finabridge'), async (req, res) => {
    try {
      const [doc] = await db.select().from(tradeDocuments).where(eq(tradeDocuments.id, req.params.documentId));
      if (!doc) {
        return res.status(404).json({ message: "Document not found" });
      }
      return res.json({
        documentId: doc.id,
        documentType: doc.documentType,
        fileName: doc.fileName,
        documentUrl: doc.documentUrl,
        status: doc.status,
        aiVerificationStatus: doc.aiVerificationStatus,
        aiFraudScore: doc.aiFraudScore,
        aiExtractedData: doc.aiExtractedData,
        aiRejectionReason: doc.aiRejectionReason,
        aiVerifiedAt: doc.aiVerifiedAt,
        aiRetryCount: doc.aiRetryCount,
      });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get AI report" });
    }
  });

  // Get all documents for a trade case (admin) - ADMIN
  app.get("/api/admin/finabridge/cases/:caseId/documents", ensureAdminAsync, requirePermission('view_finabridge', 'manage_finabridge'), async (req, res) => {
    try {
      const docs = await storage.getCaseDocuments(req.params.caseId);
      return res.json({ documents: docs });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get case documents" });
    }
  });

  app.get("/api/admin/finabridge/analytics", ensureAdminAsync, requirePermission('view_finabridge'), async (req, res) => {
    try {
      const tradeRequestsList = await db.select().from(tradeRequests);
      const proposals = await db.select().from(tradeProposals);
      const settlements = await db.select().from(settlementHolds);
      const disputes = await db.select().from(tradeDisputes);
      
      const totalTrades = tradeRequestsList.length;
      const activeTrades = tradeRequestsList.filter(t => (t.status as string) === 'Submitted' || (t.status as string) === 'In Deal Room').length;
      const completedTrades = tradeRequestsList.filter(t => (t.status as string) === 'Completed' || (t.status as string) === 'Settled').length;
      const totalValueUsd = tradeRequestsList.reduce((sum, t) => sum + parseFloat(t.tradeValueUsd || '0'), 0);
      const totalGoldGrams = tradeRequestsList.reduce((sum, t) => sum + parseFloat(t.settlementGoldGrams || '0'), 0);
      const avgTradeValue = totalTrades > 0 ? totalValueUsd / totalTrades : 0;
      const successRate = totalTrades > 0 ? (completedTrades / totalTrades) * 100 : 0;
      const openDisputes = disputes.filter(d => d.status !== 'Resolved' && d.status !== 'Closed').length;
      
        return res.json({
        analytics: {
          totalTrades, activeTrades, completedTrades, totalValueUsd, totalGoldGrams, avgTradeValue, successRate,
          totalProposals: proposals.length, activeSettlements: settlements.filter(s => (s.status as string) === 'Locked').length,
          openDisputes, monthlyTrends: []
        }
      });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get analytics" });
    }
  });

  // ============================================================================
  // FINABRIDGE - DEAL ROOM DOCUMENTS
  // ============================================================================

  // Upload document to deal room
  app.post("/api/deal-rooms/:dealRoomId/documents", ensureAuthenticated, async (req, res) => {
    try {
      const { documentType, fileName, fileUrl, fileSize, description, expiresAt } = req.body;
      const sessionUserId = req.session?.userId;
      
      if (!sessionUserId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const dealRoom = await storage.getDealRoom(req.params.dealRoomId);
      if (!dealRoom) {
        return res.status(404).json({ message: "Deal room not found" });
      }
      
      // Verify user is party to the deal room and determine role
      let userRole = '';
      if (dealRoom.importerUserId === sessionUserId) {
        userRole = 'importer';
      } else if (dealRoom.exporterUserId === sessionUserId) {
        userRole = 'exporter';
      } else if (dealRoom.assignedAdminId === sessionUserId) {
        userRole = 'admin';
      } else {
        return res.status(403).json({ message: "Not authorized to upload to this deal room" });
      }
      
      // Version control: if parentDocumentId given, auto-increment version
      let versionNumber = 1;
      if (req.body.parentDocumentId) {
        const siblings = await db.select({ versionNumber: dealRoomDocuments.versionNumber })
          .from(dealRoomDocuments)
          .where(
            or(
              eq(dealRoomDocuments.id, req.body.parentDocumentId),
              eq(dealRoomDocuments.parentDocumentId, req.body.parentDocumentId)
            )
          );
        const maxVersion = siblings.reduce((m, s) => Math.max(m, s.versionNumber ?? 1), 1);
        versionNumber = maxVersion + 1;
      }

      const [document] = await db.insert(dealRoomDocuments).values({
        id: crypto.randomUUID(),
        dealRoomId: dealRoom.id,
        tradeRequestId: dealRoom.tradeRequestId,
        uploadedByUserId: sessionUserId,
        uploaderRole: userRole,
        documentType,
        fileName,
        fileUrl,
        fileSize,
        description,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        status: 'Pending',
        versionNumber,
        parentDocumentId: req.body.parentDocumentId || null,
      }).returning();

      // Smart notification: document submitted — notify admin(s) and the other party
      try {
        const notifMsg = `${documentType} submitted by ${userRole} in deal room — review required.`;
        const notifLink = `/finabridge/deal-room/${dealRoom.id}`;
        if (dealRoom.assignedAdminId && dealRoom.assignedAdminId !== sessionUserId) {
          // Assigned deal manager gets direct notification
          await storage.createNotification({ userId: dealRoom.assignedAdminId, title: 'Document Submitted', message: notifMsg, type: 'trade', link: notifLink, read: false });
        } else {
          // No deal manager assigned — notify all admins so nothing is silently missed
          const allAdmins = await db.select({ id: users.id }).from(users).where(eq(users.role, 'admin'));
          for (const admin of allAdmins) {
            if (admin.id !== sessionUserId) {
              await storage.createNotification({ userId: admin.id, title: 'Document Submitted (Unassigned Deal)', message: notifMsg, type: 'trade', link: `/admin/finabridge`, read: false }).catch(() => {});
            }
          }
        }
        if (userRole === 'exporter' && dealRoom.importerUserId !== sessionUserId) {
          await storage.createNotification({ userId: dealRoom.importerUserId, title: 'Document Submitted', message: notifMsg, type: 'trade', link: notifLink, read: false });
        } else if (userRole === 'importer' && dealRoom.exporterUserId !== sessionUserId) {
          await storage.createNotification({ userId: dealRoom.exporterUserId, title: 'Document Submitted', message: notifMsg, type: 'trade', link: notifLink, read: false });
        }
      } catch (e) { console.error('[Notification] doc upload notify failed:', e); }
      
      return res.json({ document, message: "Document uploaded successfully" });
    } catch (error) {
      return res.status(400).json({ message: error instanceof Error ? error.message : "Failed to upload document" });
    }
  });

  // Get deal room documents
  app.get("/api/deal-rooms/:dealRoomId/documents", ensureAuthenticated, async (req, res) => {
    try {
      const sessionUserId = req.session?.userId;
      
      if (!sessionUserId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const dealRoom = await storage.getDealRoom(req.params.dealRoomId);
      if (!dealRoom) {
        return res.status(404).json({ message: "Deal room not found" });
      }
      
      // Check if admin with FinaBridge permissions.
      // See note above: `permissions` is not part of the typed User shape.
      const sessionUser = await storage.getUser(sessionUserId);
      const sessionPerms = (sessionUser as unknown as { permissions?: string[] } | undefined)?.permissions;
      const isAdmin = sessionUser?.role === 'admin' && (sessionPerms?.includes('view_finabridge') || sessionPerms?.includes('manage_finabridge'));
      
      // Verify user is party to the deal room or is admin
      if (!isAdmin && dealRoom.importerUserId !== sessionUserId && dealRoom.exporterUserId !== sessionUserId && dealRoom.assignedAdminId !== sessionUserId) {
        return res.status(403).json({ message: "Not authorized to view documents in this deal room" });
      }
      
      const documents = await db.select().from(dealRoomDocuments).where(eq(dealRoomDocuments.dealRoomId, req.params.dealRoomId)).orderBy(desc(dealRoomDocuments.createdAt));
      return res.json({ documents });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get documents" });
    }
  });

  // Admin: Verify document
  app.post("/api/admin/deal-room-documents/:id/verify", ensureAdminAsync, requirePermission('manage_finabridge'), async (req, res) => {
    try {
      const { status, verificationNotes } = req.body;
      const adminUser = req.adminUser!;
      
      if (!['Verified', 'Rejected'].includes(status)) {
        return res.status(400).json({ message: "Status must be Verified or Rejected" });
      }
      
      await db.update(dealRoomDocuments).set({
        status,
        verifiedBy: adminUser.id,
        verifiedAt: new Date(),
        verificationNotes,
        updatedAt: new Date(),
      }).where(eq(dealRoomDocuments.id, req.params.id));
      
      return res.json({ message: `Document ${status.toLowerCase()}` });
    } catch (error) {
      return res.status(400).json({ message: "Failed to verify document" });
    }
  });

  // ============================================================================
  // DEAL ROOM - DOCUMENT REVIEW (admin approve/reject with notes)
  // ============================================================================

  app.patch("/api/deal-rooms/:dealRoomId/documents/:documentId/review", ensureAuthenticated, async (req, res) => {
    try {
      const sessionUserId = req.session?.userId;
      if (!sessionUserId) return res.status(401).json({ message: "Not authenticated" });

      const sessionUser = await storage.getUser(sessionUserId);
      const isAdmin = sessionUser?.role === 'admin';
      const dealRoom = await storage.getDealRoom(req.params.dealRoomId);
      if (!dealRoom) return res.status(404).json({ message: "Deal room not found" });

      const isAssignedAdmin = dealRoom.assignedAdminId === sessionUserId;
      if (!isAdmin && !isAssignedAdmin) return res.status(403).json({ message: "Only admins can review documents" });

      const { status, verificationNotes } = req.body;
      if (!['Approved', 'Rejected', 'Under Review'].includes(status)) {
        return res.status(400).json({ message: "Status must be Approved, Rejected, or Under Review" });
      }
      // Rejection always requires notes so discrepancy can be meaningful
      if (status === 'Rejected' && !verificationNotes?.trim()) {
        return res.status(400).json({ message: "Rejection notes are required when rejecting a document" });
      }

      const [updated] = await db.update(dealRoomDocuments).set({
        status,
        verifiedBy: sessionUserId,
        verifiedAt: new Date(),
        verificationNotes: verificationNotes?.trim() || null,
        updatedAt: new Date(),
      }).where(
        and(
          eq(dealRoomDocuments.id, req.params.documentId),
          eq(dealRoomDocuments.dealRoomId, req.params.dealRoomId)
        )
      ).returning();

      if (!updated) return res.status(404).json({ message: "Document not found" });

      // Rejection always auto-creates a discrepancy entry
      if (status === 'Rejected') {
        await db.insert(dealDiscrepancies).values({
          id: crypto.randomUUID(),
          dealRoomId: req.params.dealRoomId,
          documentId: req.params.documentId,
          raisedByUserId: sessionUserId,
          reasonType: 'Other',
          description: `Document rejected: ${verificationNotes.trim()}`,
          status: 'open',
        });
      }

      // Auto-trigger MT700 validation when an LC Draft document is approved
      if (status === 'Approved' && updated.documentType === 'LC Draft') {
        try {
          const MT700_MANDATORY_FIELDS = [
            { tag: ':40A:', name: 'Form of Documentary Credit', description: 'Type of LC (e.g., IRREVOCABLE)' },
            { tag: ':31D:', name: 'Date and Place of Expiry', description: 'Expiry date and location of the LC' },
            { tag: ':32B:', name: 'Currency Code, Amount', description: 'Currency and amount of the LC' },
            { tag: ':41A:', name: 'Available With By', description: 'Bank and method of availability' },
            { tag: ':43P:', name: 'Partial Shipments', description: 'Whether partial shipments are allowed' },
            { tag: ':44A:', name: 'Place of Taking in Charge', description: 'Port or place of loading' },
            { tag: ':44B:', name: 'Place of Final Destination', description: 'Port or place of discharge' },
            { tag: ':45A:', name: 'Description of Goods / Services', description: 'Description of the goods or services' },
          ];

          // Extract actual document text (same pipeline as manual validation endpoint)
          let extractedText = '';
          try {
            const fileUrl = updated.fileUrl;
            if (fileUrl) {
              let fileBuffer: Buffer | null = null;
              if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
                const r2PublicBase = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');
                const isTrustedOrigin = r2PublicBase && fileUrl.startsWith(r2PublicBase);
                if (isTrustedOrigin) {
                  const resp = await fetch(fileUrl, { headers: { 'User-Agent': 'FinaTrades-MT700-Validator/1.0' } });
                  if (resp.ok) {
                    fileBuffer = Buffer.from(await resp.arrayBuffer());
                  }
                }
              } else if (fileUrl.startsWith('/uploads/')) {
                const { readFile } = await import('fs/promises');
                const path = await import('path');
                fileBuffer = await readFile(path.join(process.cwd(), 'public', fileUrl)).catch(() => null);
              }
              if (fileBuffer) {
                const isPdf = updated.fileName?.toLowerCase().endsWith('.pdf') || fileBuffer[0] === 0x25;
                if (isPdf) {
                  try {
                    // pdf-parse has no shipped types and ships as dual CJS/ESM,
                    // so the dynamic import shape varies. The `as any` casts
                    // are intentional bridges around the missing typings.
                    const pdfParse: any = (await import('pdf-parse' as any) as any).default || (await import('pdf-parse' as any));
                    extractedText = (await pdfParse(fileBuffer)).text || '';
                  } catch {
                    extractedText = fileBuffer.toString('utf-8').replace(/[^\x20-\x7E\n\r\t]/g, ' ');
                  }
                } else {
                  extractedText = fileBuffer.toString('utf-8').replace(/[^\x20-\x7E\n\r\t]/g, ' ');
                }
              }
            }
          } catch (extractErr) {
            console.error('[MT700] Auto-validation file extraction error (non-blocking):', extractErr);
          }

          const upperText = extractedText.toUpperCase();
          const metaText = [updated.fileName, updated.description, updated.verificationNotes].filter(Boolean).join(' ').toUpperCase();
          const fullText = `${upperText} ${metaText}`;

          const validationFields = MT700_MANDATORY_FIELDS.map(field => {
            const tagNoColon = field.tag.replace(/:/g, '');
            return {
              tag: field.tag, name: field.name, description: field.description,
              present: fullText.includes(tagNoColon) || fullText.includes(field.tag),
            };
          });

          // Cross-check with LC terms stored in DB — confirmed terms count as present
          const [lcRow] = await db.select().from(lcTerms).where(eq(lcTerms.dealRoomId, req.params.dealRoomId));
          if (lcRow) {
            for (const field of validationFields) {
              if (field.tag === ':31D:' && lcRow.expiryDate) field.present = true;
              if (field.tag === ':32B:' && lcRow.amount) field.present = true;
              if (field.tag === ':40A:' && lcRow.lcType) field.present = true;
              if (field.tag === ':43P:') field.present = lcRow.partialShipment !== null;
            }
          }
          const presentCount = validationFields.filter(f => f.present).length;
          const missingCount = validationFields.length - presentCount;
          const validationResult = {
            documentId: updated.id, documentType: updated.documentType,
            triggeredBy: 'auto-approval', validatedAt: new Date().toISOString(),
            fields: validationFields,
            summary: { total: validationFields.length, present: presentCount, missing: missingCount },
            isValid: missingCount === 0,
          };
          await db.update(dealRoomDocuments).set({ mt700ValidationResult: validationResult, updatedAt: new Date() })
            .where(eq(dealRoomDocuments.id, updated.id));
          console.log(`[MT700] Auto-validated LC Draft ${updated.id} on approval — ${presentCount}/${validationFields.length} fields present`);
        } catch (mt700Err) {
          console.error('[MT700] Auto-validation failed (non-blocking):', mt700Err);
        }
      }

      return res.json({ document: updated, message: `Document ${status.toLowerCase()}` });
    } catch (error) {
      console.error('[DealRoom] Document review error:', error);
      return res.status(400).json({ message: "Failed to review document" });
    }
  });

  // ============================================================================
  // DEAL ROOM - LC LIFECYCLE STATUS
  // ============================================================================

  app.get("/api/deal-rooms/:dealRoomId/lc-status", ensureAuthenticated, async (req, res) => {
    try {
      const sessionUserId = req.session?.userId;
      if (!sessionUserId) return res.status(401).json({ message: "Not authenticated" });

      const sessionUser = await storage.getUser(sessionUserId);
      const isAdmin = sessionUser?.role === 'admin';
      const dealRoom = await storage.getDealRoom(req.params.dealRoomId);
      if (!dealRoom) return res.status(404).json({ message: "Deal room not found" });

      if (!isAdmin && dealRoom.importerUserId !== sessionUserId && dealRoom.exporterUserId !== sessionUserId && dealRoom.assignedAdminId !== sessionUserId) {
        return res.status(403).json({ message: "Not authorized" });
      }

      // Normalize legacy persisted stage values to the 9-stage model
      const LC_LEGACY_STAGE_MAP: Record<string, string> = {
        'Contract Signed': 'Draft',
        'Under Review': 'Docs Under Review',
        'Discrepancy': 'Discrepancy Raised',
        'Funds Released': 'Payment Triggered',
      };
      const rawStage = dealRoom.lcLifecycleStatus || 'Draft';
      const normalizedStage = LC_LEGACY_STAGE_MAP[rawStage] || rawStage;

      return res.json({
        lcLifecycleStatus: normalizedStage,
        dealRoomId: dealRoom.id,
        isClosed: dealRoom.isClosed,
      });
    } catch (error) {
      return res.status(400).json({ message: "Failed to fetch LC lifecycle status" });
    }
  });

  // LC stage transition handler — shared logic
  const handleLcStageTransition = async (req: Request, res: Response) => {
    try {
      const sessionUserId = req.session?.userId;
      if (!sessionUserId) return res.status(401).json({ message: "Not authenticated" });

      const sessionUser = await storage.getUser(sessionUserId);
      const isAdmin = sessionUser?.role === 'admin';
      const dealRoom = await storage.getDealRoom(req.params.dealRoomId);
      if (!dealRoom) return res.status(404).json({ message: "Deal room not found" });

      // Determine user role in this deal room
      let userRoleInDeal: 'importer' | 'exporter' | 'admin' | null = null;
      if (isAdmin || dealRoom.assignedAdminId === sessionUserId) userRoleInDeal = 'admin';
      else if (dealRoom.importerUserId === sessionUserId) userRoleInDeal = 'importer';
      else if (dealRoom.exporterUserId === sessionUserId) userRoleInDeal = 'exporter';
      if (!userRoleInDeal) return res.status(403).json({ message: "Not authorized to update this deal room" });

      const lcLifecycleStatus = req.body.lcLifecycleStatus || req.body.stage;
      const { notes } = req.body;

      // 9-stage state machine with strict role-based transition rules
      type TransitionRule = { allowedRoles: string[]; fromStages: string[] };
      const TRANSITION_RULES: Record<string, TransitionRule> = {
        'LC Issued':             { allowedRoles: ['admin'], fromStages: ['Draft'] },
        'Docs Submitted':        { allowedRoles: ['exporter'], fromStages: ['LC Issued'] }, // exporter-only
        'Docs Under Review':     { allowedRoles: ['admin'], fromStages: ['Docs Submitted', 'Discrepancy Resolved'] },
        'Discrepancy Raised':    { allowedRoles: ['admin'], fromStages: ['Docs Under Review'] },
        'Discrepancy Resolved':  { allowedRoles: ['admin', 'exporter'], fromStages: ['Discrepancy Raised'] },
        'Approved':              { allowedRoles: ['admin'], fromStages: ['Docs Under Review', 'Discrepancy Resolved'] },
        'Payment Triggered':     { allowedRoles: ['importer'], fromStages: ['Approved'] }, // importer-only
        'Closed':                { allowedRoles: ['admin'], fromStages: ['Payment Triggered'] },
      };

      // Legacy stage normalization map for server-side validation
      const LEGACY_STAGE_MAP: Record<string, string> = {
        'Contract Signed': 'Draft',
        'Under Review': 'Docs Under Review',
        'Discrepancy': 'Discrepancy Raised',
        'Funds Released': 'Payment Triggered',
      };

      const allValidStages = ['Draft', 'LC Issued', 'Docs Submitted', 'Docs Under Review', 'Discrepancy Raised', 'Discrepancy Resolved', 'Approved', 'Payment Triggered', 'Closed'];
      if (!allValidStages.includes(lcLifecycleStatus)) {
        return res.status(400).json({ message: "Invalid LC lifecycle status" });
      }

      // Every target stage must have an explicit transition rule — stages with no rule (e.g. 'Draft') are terminal starting states and cannot be set via this endpoint
      const rule = TRANSITION_RULES[lcLifecycleStatus];
      if (!rule) {
        return res.status(400).json({ message: `Transitioning to '${lcLifecycleStatus}' is not a permitted lifecycle action` });
      }
      // Normalize current stage before applying rules (handles legacy persisted values)
      const rawCurrentStage = dealRoom.lcLifecycleStatus || 'Draft';
      const currentStage = LEGACY_STAGE_MAP[rawCurrentStage] || rawCurrentStage;
      if (!rule.fromStages.includes(currentStage)) {
        return res.status(400).json({ message: `Cannot transition to ${lcLifecycleStatus} from ${currentStage}` });
      }
      if (!rule.allowedRoles.includes(userRoleInDeal)) {
        return res.status(403).json({ message: `Only ${rule.allowedRoles.join(' or ')} can trigger this transition` });
      }

      // Payment gate: enforce all required docs approved before Payment Triggered
      if (lcLifecycleStatus === 'Payment Triggered') {
        const BASE_REQUIRED_DOC_TYPES = [
          'Invoice', 'Bill of Lading', 'Packing List', 'Certificate of Origin',
          'Insurance Certificate', 'Inspection Report', 'LC Draft',
        ];
        const GOLD_ONLY_DOC_TYPES = ['Proof of Lading', 'Warehouse Receipt'];

        // Fetch LC terms to get custom required docs if set
        const [lcTermsRow] = await db.select({ requiredDocuments: lcTerms.requiredDocuments })
          .from(lcTerms).where(eq(lcTerms.dealRoomId, req.params.dealRoomId));

        let requiredTypes: string[];
        if (lcTermsRow?.requiredDocuments && lcTermsRow.requiredDocuments.length > 0) {
          // Use explicitly saved LC terms required docs (single source of truth when set)
          requiredTypes = lcTermsRow.requiredDocuments;
        } else {
          // Derive required docs from deal goods name (same heuristic as frontend)
          const tradeReq = await storage.getTradeRequest(dealRoom.tradeRequestId);
          const goodsName = tradeReq?.goodsName || '';
          const isGoldBacked = goodsName.toLowerCase().includes('gold');
          requiredTypes = isGoldBacked
            ? [...BASE_REQUIRED_DOC_TYPES, ...GOLD_ONLY_DOC_TYPES]
            : BASE_REQUIRED_DOC_TYPES;
        }

        // Get all approved docs for this deal room
        const allDocs = await db.select({
          documentType: dealRoomDocuments.documentType,
          status: dealRoomDocuments.status,
          versionNumber: dealRoomDocuments.versionNumber,
        }).from(dealRoomDocuments).where(eq(dealRoomDocuments.dealRoomId, req.params.dealRoomId));

        // For each required type, check latest version is Approved/Verified
        const unapprovedDocs: string[] = [];
        for (const reqType of requiredTypes) {
          const docsOfType = allDocs.filter(d => d.documentType === reqType);
          if (docsOfType.length === 0) { unapprovedDocs.push(reqType); continue; }
          const latest = docsOfType.sort((a, b) => (b.versionNumber ?? 1) - (a.versionNumber ?? 1))[0];
          if (!['Approved', 'Verified'].includes(latest.status ?? '')) {
            unapprovedDocs.push(reqType);
          }
        }
        if (unapprovedDocs.length > 0) {
          return res.status(400).json({
            message: `Cannot trigger payment: the following documents are not yet approved: ${unapprovedDocs.join(', ')}`,
          });
        }
      }

      await db.update(dealRoomsTable).set({
        lcLifecycleStatus,
        updatedAt: new Date(),
      }).where(eq(dealRoomsTable.id, req.params.dealRoomId));

      // Auto-create milestone
      await db.insert(dealMilestones).values({
        id: crypto.randomUUID(),
        dealRoomId: req.params.dealRoomId,
        milestoneName: lcLifecycleStatus,
        completedByUserId: sessionUserId,
        completedByRole: userRoleInDeal,
        notes: notes || null,
      });

      // Smart notifications for stage transitions
      try {
        const notifLink = `/finabridge/deal-room/${req.params.dealRoomId}`;
        const stageNotifs: Record<string, { title: string; message: string; notify: ('importer' | 'exporter' | 'admin')[] }> = {
          'LC Issued': { title: 'LC Issued', message: 'Your Letter of Credit has been issued. Please submit your trade documents.', notify: ['exporter'] },
          'Docs Submitted': { title: 'Documents Submitted', message: 'Exporter has submitted trade documents — review required.', notify: ['admin'] },
          'Docs Under Review': { title: 'Documents Under Review', message: 'Your submitted documents are now under review by the admin.', notify: ['exporter'] },
          'Discrepancy Raised': { title: 'Discrepancy Raised', message: 'A discrepancy has been raised on your documents. Please resolve it.', notify: ['exporter'] },
          'Discrepancy Resolved': { title: 'Discrepancy Resolved', message: 'The document discrepancy has been resolved. Admin will re-review.', notify: ['admin'] },
          'Approved': { title: 'Documents Approved', message: 'All documents have been approved. Please trigger payment to proceed.', notify: ['importer', 'exporter'] },
          'Payment Triggered': { title: 'Payment Triggered', message: 'Payment has been triggered by the importer. Admin will confirm and close.', notify: ['admin', 'exporter'] },
          'Closed': { title: 'Deal Closed — Gold Released', message: 'Congratulations! The deal is now closed and gold has been released.', notify: ['importer', 'exporter'] },
        };
        const notif = stageNotifs[lcLifecycleStatus];
        if (notif) {
          const userIdMap = {
            importer: dealRoom.importerUserId,
            exporter: dealRoom.exporterUserId,
            admin: dealRoom.assignedAdminId,
          };
          for (const role of notif.notify) {
            const uid = userIdMap[role];
            if (uid && uid !== sessionUserId) {
              await storage.createNotification({ userId: uid, title: notif.title, message: notif.message, type: 'trade', link: notifLink, read: false });
            }
          }
        }
      } catch (e) { console.error('[Notification] LC stage notify failed:', e); }

      return res.json({ message: "LC lifecycle status updated", lcLifecycleStatus });
    } catch (error) {
      console.error('[DealRoom] LC status update error:', error);
      return res.status(400).json({ message: "Failed to update LC lifecycle status" });
    }
  };

  // Register both route paths (lc-status = legacy, lc-stage = new spec)
  app.patch("/api/deal-rooms/:dealRoomId/lc-status", ensureAuthenticated, handleLcStageTransition);
  app.patch("/api/deal-rooms/:dealRoomId/lc-stage", ensureAuthenticated, handleLcStageTransition);

  // ============================================================================
  // DEAL ROOM - MILESTONES
  // ============================================================================

  app.get("/api/deal-rooms/:dealRoomId/milestones", ensureAuthenticated, async (req, res) => {
    try {
      const sessionUserId = req.session?.userId;
      if (!sessionUserId) return res.status(401).json({ message: "Not authenticated" });

      const sessionUser = await storage.getUser(sessionUserId);
      const isAdmin = sessionUser?.role === 'admin';
      const dealRoom = await storage.getDealRoom(req.params.dealRoomId);
      if (!dealRoom) return res.status(404).json({ message: "Deal room not found" });

      if (!isAdmin && dealRoom.importerUserId !== sessionUserId && dealRoom.exporterUserId !== sessionUserId && dealRoom.assignedAdminId !== sessionUserId) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const milestoneRows = await db.select().from(dealMilestones)
        .where(eq(dealMilestones.dealRoomId, req.params.dealRoomId))
        .orderBy(dealMilestones.completedAt);

      // Resolve user identity for milestone display
      const userIds = [...new Set(milestoneRows.map(m => m.completedByUserId).filter(Boolean) as string[])];
      const completedByUsers: Record<string, { finatradesId: string | null; email: string; firstName: string | null; lastName: string | null }> = {};
      for (const uid of userIds) {
        const u = await storage.getUser(uid);
        if (u) completedByUsers[uid] = { finatradesId: u.finatradesId ?? null, email: u.email, firstName: u.firstName ?? null, lastName: u.lastName ?? null };
      }

      const milestones = milestoneRows.map(m => ({
        ...m,
        completedByUser: m.completedByUserId ? (completedByUsers[m.completedByUserId] ?? null) : null,
      }));

      return res.json({ milestones });
    } catch (error) {
      return res.status(400).json({ message: "Failed to fetch milestones" });
    }
  });

  app.post("/api/deal-rooms/:dealRoomId/milestones", ensureAuthenticated, async (req, res) => {
    try {
      const sessionUserId = req.session?.userId;
      if (!sessionUserId) return res.status(401).json({ message: "Not authenticated" });

      const sessionUser = await storage.getUser(sessionUserId);
      const isAdmin = sessionUser?.role === 'admin';
      const dealRoom = await storage.getDealRoom(req.params.dealRoomId);
      if (!dealRoom) return res.status(404).json({ message: "Deal room not found" });

      const isAssignedAdmin = dealRoom.assignedAdminId === sessionUserId;
      if (!isAdmin && !isAssignedAdmin) return res.status(403).json({ message: "Only admins can add milestones" });

      const { milestoneName, notes } = req.body;
      if (!milestoneName) return res.status(400).json({ message: "Milestone name required" });

      const [milestone] = await db.insert(dealMilestones).values({
        id: crypto.randomUUID(),
        dealRoomId: req.params.dealRoomId,
        milestoneName,
        completedByUserId: sessionUserId,
        completedByRole: 'admin',
        notes: notes || null,
      }).returning();

      return res.json({ milestone, message: "Milestone added" });
    } catch (error) {
      return res.status(400).json({ message: "Failed to add milestone" });
    }
  });

  // ============================================================================
  // DEAL ROOM - DISCREPANCIES
  // ============================================================================

  app.get("/api/deal-rooms/:dealRoomId/discrepancies", ensureAuthenticated, async (req, res) => {
    try {
      const sessionUserId = req.session?.userId;
      if (!sessionUserId) return res.status(401).json({ message: "Not authenticated" });

      const sessionUser = await storage.getUser(sessionUserId);
      const isAdmin = sessionUser?.role === 'admin';
      const dealRoom = await storage.getDealRoom(req.params.dealRoomId);
      if (!dealRoom) return res.status(404).json({ message: "Deal room not found" });

      if (!isAdmin && dealRoom.importerUserId !== sessionUserId && dealRoom.exporterUserId !== sessionUserId && dealRoom.assignedAdminId !== sessionUserId) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const discrepancies = await db.select().from(dealDiscrepancies)
        .where(eq(dealDiscrepancies.dealRoomId, req.params.dealRoomId))
        .orderBy(desc(dealDiscrepancies.createdAt));

      return res.json({ discrepancies });
    } catch (error) {
      return res.status(400).json({ message: "Failed to fetch discrepancies" });
    }
  });

  app.post("/api/deal-rooms/:dealRoomId/discrepancies", ensureAuthenticated, async (req, res) => {
    try {
      const sessionUserId = req.session?.userId;
      if (!sessionUserId) return res.status(401).json({ message: "Not authenticated" });

      const sessionUser = await storage.getUser(sessionUserId);
      const isAdmin = sessionUser?.role === 'admin';
      const dealRoom = await storage.getDealRoom(req.params.dealRoomId);
      if (!dealRoom) return res.status(404).json({ message: "Deal room not found" });

      const isAssignedAdmin = dealRoom.assignedAdminId === sessionUserId;
      if (!isAdmin && !isAssignedAdmin) return res.status(403).json({ message: "Only admins can raise discrepancies" });

      const { documentId, reasonType, description } = req.body;
      const validReasons = ['Amount Mismatch', 'Date Discrepancy', 'Port of Loading Wrong', 'Missing Signature', 'Description Mismatch', 'Document Expired', 'Incorrect Document Type', 'Other'];
      if (!validReasons.includes(reasonType)) {
        return res.status(400).json({ message: "Invalid reason type" });
      }

      const [discrepancy] = await db.insert(dealDiscrepancies).values({
        id: crypto.randomUUID(),
        dealRoomId: req.params.dealRoomId,
        documentId: documentId || null,
        raisedByUserId: sessionUserId,
        reasonType,
        description: description || null,
        status: 'open',
      }).returning();

      // Smart notification: discrepancy raised — notify exporter
      try {
        const notifMsg = `A discrepancy has been raised on your documents: ${reasonType}. Please resolve it.`;
        const notifLink = `/finabridge/deal-room/${req.params.dealRoomId}`;
        await storage.createNotification({ userId: dealRoom.exporterUserId, title: 'Discrepancy Raised', message: notifMsg, type: 'trade', link: notifLink, read: false });
      } catch (e) { console.error('[Notification] discrepancy notify failed:', e); }

      return res.json({ discrepancy, message: "Discrepancy raised" });
    } catch (error) {
      console.error('[DealRoom] Discrepancy creation error:', error);
      return res.status(400).json({ message: "Failed to raise discrepancy" });
    }
  });

  app.patch("/api/deal-rooms/:dealRoomId/discrepancies/:discrepancyId/resolve", ensureAuthenticated, async (req, res) => {
    try {
      const sessionUserId = req.session?.userId;
      if (!sessionUserId) return res.status(401).json({ message: "Not authenticated" });

      const sessionUser = await storage.getUser(sessionUserId);
      const isAdmin = sessionUser?.role === 'admin';
      const dealRoom = await storage.getDealRoom(req.params.dealRoomId);
      if (!dealRoom) return res.status(404).json({ message: "Deal room not found" });

      // Admins and exporters (the party responsible for resolving discrepancies) can resolve
      const isAssignedAdmin = dealRoom.assignedAdminId === sessionUserId;
      const isExporter = dealRoom.exporterUserId === sessionUserId;
      if (!isAdmin && !isAssignedAdmin && !isExporter) {
        return res.status(403).json({ message: "Only admins or the exporter can resolve discrepancies" });
      }

      const { resolutionNotes } = req.body;

      const [resolved] = await db.update(dealDiscrepancies).set({
        status: 'resolved',
        resolvedAt: new Date(),
        resolvedByUserId: sessionUserId,
        resolutionNotes: resolutionNotes || null,
        updatedAt: new Date(),
      }).where(
        and(
          eq(dealDiscrepancies.id, req.params.discrepancyId),
          eq(dealDiscrepancies.dealRoomId, req.params.dealRoomId)
        )
      ).returning();

      if (!resolved) return res.status(404).json({ message: "Discrepancy not found" });
      return res.json({ discrepancy: resolved, message: "Discrepancy resolved" });
    } catch (error) {
      return res.status(400).json({ message: "Failed to resolve discrepancy" });
    }
  });

  // ============================================================================
  // DEAL ROOM - LC TERMS (WIZARD)
  // ============================================================================

  app.get("/api/deal-rooms/:dealRoomId/lc-terms", ensureAuthenticated, async (req, res) => {
    try {
      const sessionUserId = req.session?.userId;
      if (!sessionUserId) return res.status(401).json({ message: "Not authenticated" });
      const dealRoom = await storage.getDealRoom(req.params.dealRoomId);
      if (!dealRoom) return res.status(404).json({ message: "Deal room not found" });
      const sessionUser = await storage.getUser(sessionUserId);
      const isAdmin = sessionUser?.role === 'admin';
      if (!isAdmin && dealRoom.importerUserId !== sessionUserId && dealRoom.exporterUserId !== sessionUserId && dealRoom.assignedAdminId !== sessionUserId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const [terms] = await db.select().from(lcTerms).where(eq(lcTerms.dealRoomId, req.params.dealRoomId));
      return res.json({ lcTerms: terms || null });
    } catch (error) {
      return res.status(400).json({ message: "Failed to fetch LC terms" });
    }
  });

  app.post("/api/deal-rooms/:dealRoomId/lc-terms", ensureAuthenticated, async (req, res) => {
    try {
      const sessionUserId = req.session?.userId;
      if (!sessionUserId) return res.status(401).json({ message: "Not authenticated" });
      const dealRoom = await storage.getDealRoom(req.params.dealRoomId);
      if (!dealRoom) return res.status(404).json({ message: "Deal room not found" });
      const sessionUser = await storage.getUser(sessionUserId);
      const isAdmin = sessionUser?.role === 'admin';
      if (!isAdmin && dealRoom.importerUserId !== sessionUserId && dealRoom.assignedAdminId !== sessionUserId) {
        return res.status(403).json({ message: "Only importer or admin can set LC terms" });
      }
      const { lcType, expiryDate, expiryPlace, amount, currency, partialShipment, transshipment, requiredDocuments } = req.body;
      const existing = await db.select({ id: lcTerms.id }).from(lcTerms).where(eq(lcTerms.dealRoomId, req.params.dealRoomId));
      let result;
      if (existing.length > 0) {
        [result] = await db.update(lcTerms).set({
          lcType, expiryDate, expiryPlace, amount, currency, partialShipment, transshipment,
          requiredDocuments: requiredDocuments || null, updatedAt: new Date(),
        }).where(eq(lcTerms.dealRoomId, req.params.dealRoomId)).returning();
      } else {
        [result] = await db.insert(lcTerms).values({
          id: crypto.randomUUID(),
          dealRoomId: req.params.dealRoomId,
          lcType: lcType || 'Irrevocable',
          expiryDate: expiryDate || null,
          expiryPlace: expiryPlace || null,
          amount: amount || null,
          currency: currency || 'USD',
          partialShipment: partialShipment || false,
          transshipment: transshipment || false,
          requiredDocuments: requiredDocuments || null,
        }).returning();
      }
      return res.json({ lcTerms: result, message: "LC terms saved" });
    } catch (error) {
      console.error('[DealRoom] LC terms error:', error);
      return res.status(400).json({ message: "Failed to save LC terms" });
    }
  });

  // ============================================================================
  // DEAL ROOM - COUNTERPARTY RISK
  // ============================================================================

  app.get("/api/deal-rooms/:dealRoomId/counterparty-risk", ensureAuthenticated, async (req, res) => {
    try {
      const sessionUserId = req.session?.userId;
      if (!sessionUserId) return res.status(401).json({ message: "Not authenticated" });
      const dealRoom = await storage.getDealRoom(req.params.dealRoomId);
      if (!dealRoom) return res.status(404).json({ message: "Deal room not found" });
      const sessionUser = await storage.getUser(sessionUserId);
      const isAdmin = sessionUser?.role === 'admin';
      if (!isAdmin && dealRoom.importerUserId !== sessionUserId && dealRoom.exporterUserId !== sessionUserId && dealRoom.assignedAdminId !== sessionUserId) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const fetchPartyRisk = async (userId: string) => {
        const [user] = await db.select({
          id: users.id, email: users.email, kycStatus: users.kycStatus,
          country: users.country, firstName: users.firstName, lastName: users.lastName,
          finatradesId: users.finatradesId,
        }).from(users).where(eq(users.id, userId));
        if (!user) return null;

        const [kyc] = await db.select({
          riskLevel: kycSubmissions.riskLevel, riskScore: kycSubmissions.riskScore,
          isSanctioned: kycSubmissions.isSanctioned, isPep: kycSubmissions.isPep,
          country: kycSubmissions.country, status: kycSubmissions.status,
          screeningResults: kycSubmissions.screeningResults,
          screeningStatus: kycSubmissions.screeningStatus,
          // KYC completion fields
          fullName: kycSubmissions.fullName,
          dateOfBirth: kycSubmissions.dateOfBirth,
          nationality: kycSubmissions.nationality,
          address: kycSubmissions.address,
          companyName: kycSubmissions.companyName,
          registrationNumber: kycSubmissions.registrationNumber,
        }).from(kycSubmissions).where(eq(kycSubmissions.userId, userId))
          .orderBy(desc(kycSubmissions.createdAt)).limit(1);

        const [riskProfile] = await db.select({
          overallRiskScore: userRiskProfiles.overallRiskScore,
          riskLevel: userRiskProfiles.riskLevel,
          geographyRisk: userRiskProfiles.geographyRisk,
          isSanctioned: userRiskProfiles.isSanctioned,
          isPep: userRiskProfiles.isPep,
        }).from(userRiskProfiles).where(eq(userRiskProfiles.userId, userId)).limit(1);

        // Calculate KYC completion % using properly selected fields
        let kycCompletion = 0;
        if (kyc) {
          const completionChecks = [
            !!kyc.fullName, !!kyc.dateOfBirth, !!kyc.nationality,
            !!(kyc.country), !!kyc.address, !!kyc.companyName, !!kyc.registrationNumber,
          ];
          kycCompletion = Math.round((completionChecks.filter(Boolean).length / completionChecks.length) * 100);
        }

        return {
          userId: user.id,
          email: user.email,
          name: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.finatradesId || user.email,
          kycStatus: user.kycStatus,
          country: user.country || kyc?.country || 'Unknown',
          amlRiskLevel: riskProfile?.riskLevel || kyc?.riskLevel || 'Low',
          riskScore: isAdmin ? (riskProfile?.overallRiskScore ?? kyc?.riskScore ?? 0) : undefined,
          isSanctioned: kyc?.isSanctioned || riskProfile?.isSanctioned || false,
          isPep: kyc?.isPep || riskProfile?.isPep || false,
          sanctionsStatus: (kyc?.isSanctioned || riskProfile?.isSanctioned) ? 'Flagged' : 'Clear',
          jurisdictionRisk: riskProfile?.geographyRisk ? (riskProfile.geographyRisk > 70 ? 'High' : riskProfile.geographyRisk > 40 ? 'Medium' : 'Low') : 'Unknown',
          kycCompletion,
        };
      };

      const [importerRisk, exporterRisk] = await Promise.all([
        fetchPartyRisk(dealRoom.importerUserId),
        fetchPartyRisk(dealRoom.exporterUserId),
      ]);

      return res.json({ importerRisk, exporterRisk });
    } catch (error) {
      console.error('[DealRoom] Counterparty risk error:', error);
      return res.status(400).json({ message: "Failed to fetch counterparty risk" });
    }
  });

  // ============================================================================
  // DEAL ROOM - DOCUMENT METADATA (WR + POL)
  // ============================================================================

  // Helper to verify document belongs to deal room (IDOR prevention)
  const verifyDocumentOwnership = async (dealRoomId: string, documentId: string): Promise<boolean> => {
    const [doc] = await db.select({ id: dealRoomDocuments.id })
      .from(dealRoomDocuments)
      .where(and(eq(dealRoomDocuments.id, documentId), eq(dealRoomDocuments.dealRoomId, dealRoomId)));
    return !!doc;
  };

  app.post("/api/deal-rooms/:dealRoomId/documents/:documentId/metadata", ensureAuthenticated, async (req, res) => {
    try {
      const sessionUserId = req.session?.userId;
      if (!sessionUserId) return res.status(401).json({ message: "Not authenticated" });
      const sessionUser = await storage.getUser(sessionUserId);
      const isAdmin = sessionUser?.role === 'admin';
      const dealRoom = await storage.getDealRoom(req.params.dealRoomId);
      if (!dealRoom) return res.status(404).json({ message: "Deal room not found" });

      // Enforce deal room membership
      const isMember = isAdmin || dealRoom.importerUserId === sessionUserId
        || dealRoom.exporterUserId === sessionUserId || dealRoom.assignedAdminId === sessionUserId;
      if (!isMember) return res.status(403).json({ message: "Not authorized" });

      // Verify document belongs to this deal room (prevents IDOR)
      const docBelongs = await verifyDocumentOwnership(req.params.dealRoomId, req.params.documentId);
      if (!docBelongs) return res.status(404).json({ message: "Document not found in this deal room" });

      const {
        warehouseName, wrNumber, goldQuantityGrams, issuanceDate, expiryDate,
        carrierName, blNumber, portOfLoading, portOfDischarge, estimatedDeparture, estimatedArrival,
      } = req.body;
      const existing = await db.select({ id: dealRoomDocumentMetadata.id }).from(dealRoomDocumentMetadata)
        .where(eq(dealRoomDocumentMetadata.documentId, req.params.documentId));
      let result;
      if (existing.length > 0) {
        [result] = await db.update(dealRoomDocumentMetadata).set({
          warehouseName, wrNumber, goldQuantityGrams, issuanceDate, expiryDate,
          carrierName, blNumber, portOfLoading, portOfDischarge, estimatedDeparture, estimatedArrival,
          updatedAt: new Date(),
        }).where(eq(dealRoomDocumentMetadata.documentId, req.params.documentId)).returning();
      } else {
        [result] = await db.insert(dealRoomDocumentMetadata).values({
          id: crypto.randomUUID(),
          documentId: req.params.documentId,
          warehouseName, wrNumber, goldQuantityGrams, issuanceDate, expiryDate,
          carrierName, blNumber, portOfLoading, portOfDischarge, estimatedDeparture, estimatedArrival,
        }).returning();
      }
      return res.json({ metadata: result, message: "Document metadata saved" });
    } catch (error) {
      console.error('[DealRoom] Document metadata error:', error);
      return res.status(400).json({ message: "Failed to save document metadata" });
    }
  });

  app.get("/api/deal-rooms/:dealRoomId/documents/:documentId/metadata", ensureAuthenticated, async (req, res) => {
    try {
      const sessionUserId = req.session?.userId;
      if (!sessionUserId) return res.status(401).json({ message: "Not authenticated" });
      const sessionUser = await storage.getUser(sessionUserId);
      const isAdmin = sessionUser?.role === 'admin';
      const dealRoom = await storage.getDealRoom(req.params.dealRoomId);
      if (!dealRoom) return res.status(404).json({ message: "Deal room not found" });

      // Enforce deal room membership
      const isMember = isAdmin || dealRoom.importerUserId === sessionUserId
        || dealRoom.exporterUserId === sessionUserId || dealRoom.assignedAdminId === sessionUserId;
      if (!isMember) return res.status(403).json({ message: "Not authorized" });

      // Verify document belongs to this deal room (prevents IDOR)
      const docBelongs = await verifyDocumentOwnership(req.params.dealRoomId, req.params.documentId);
      if (!docBelongs) return res.status(404).json({ message: "Document not found in this deal room" });

      const [metadata] = await db.select().from(dealRoomDocumentMetadata)
        .where(eq(dealRoomDocumentMetadata.documentId, req.params.documentId));
      return res.json({ metadata: metadata || null });
    } catch (error) {
      return res.status(400).json({ message: "Failed to fetch document metadata" });
    }
  });

  // ============================================================================
  // FINABRIDGE - TRADE DEADLINES
  // ============================================================================

  // Set trade deadlines
  app.post("/api/admin/finabridge/requests/:id/deadlines", ensureAdminAsync, requirePermission('manage_finabridge'), async (req, res) => {
    try {
      const { proposalDeadline, settlementDeadline, deliveryDeadline } = req.body;
      
      const request = await storage.getTradeRequest(req.params.id);
      if (!request) {
        return res.status(404).json({ message: "Trade request not found" });
      }
      
      await storage.updateTradeRequest(req.params.id, {
        proposalDeadline: proposalDeadline ? new Date(proposalDeadline) : null,
        settlementDeadline: settlementDeadline ? new Date(settlementDeadline) : null,
        deliveryDeadline: deliveryDeadline ? new Date(deliveryDeadline) : null,
      });
      
      return res.json({ message: "Deadlines updated successfully" });
    } catch (error) {
      return res.status(400).json({ message: "Failed to update deadlines" });
    }
  });

  // Get overdue trades
  app.get("/api/admin/finabridge/overdue-trades", ensureAdminAsync, requirePermission('view_finabridge', 'manage_finabridge'), async (req, res) => {
    try {
      const now = new Date();
      const allRequests = await storage.getAllTradeRequests();
      
      const overdueTrades = allRequests.filter(r => {
        if (r.status === 'Completed' || r.status === 'Cancelled') return false;
        
        const proposalDeadline = r.proposalDeadline ? new Date(r.proposalDeadline) : null;
        const settlementDeadline = r.settlementDeadline ? new Date(r.settlementDeadline) : null;
        const deliveryDeadline = r.deliveryDeadline ? new Date(r.deliveryDeadline) : null;
        
        return (proposalDeadline && proposalDeadline < now) ||
               (settlementDeadline && settlementDeadline < now) ||
               (deliveryDeadline && deliveryDeadline < now);
      });
      
      return res.json({ overdueTrades });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get overdue trades" });
    }
  });
  
  // ============================================================================
  // DEAL ROOM - TRADE CASE CONVERSATIONS
  // ============================================================================

  // Admin: Get all deal rooms
  app.get("/api/admin/deal-rooms", ensureAdminAsync, requirePermission('view_finabridge', 'manage_finabridge'), async (req, res) => {
    try {
      const rooms = await storage.getAllDealRooms();
      
      // Fetch related data for each room
      const roomsWithDetails = await Promise.all(rooms.map(async (room) => {
        const [tradeRequest, importer, exporter, docs] = await Promise.all([
          storage.getTradeRequest(room.tradeRequestId),
          storage.getUser(room.importerUserId),
          storage.getUser(room.exporterUserId),
          db.select({ id: dealRoomDocuments.id, status: dealRoomDocuments.status })
            .from(dealRoomDocuments).where(eq(dealRoomDocuments.dealRoomId, room.id)),
        ]);
        const docsTotal = docs.length;
        const docsApproved = docs.filter(d => d.status === 'Approved').length;
        
        return {
          ...room,
          tradeRequest: tradeRequest ? {
            tradeRefId: tradeRequest.tradeRefId,
            goodsName: tradeRequest.goodsName,
            tradeValueUsd: tradeRequest.tradeValueUsd,
            status: tradeRequest.status,
          } : null,
          importer: importer ? { id: importer.id, finatradesId: importer.finatradesId, email: importer.email } : null,
          exporter: exporter ? { id: exporter.id, finatradesId: exporter.finatradesId, email: exporter.email } : null,
          docsTotal,
          docsApproved,
        };
      }));
      
      return res.json({ rooms: roomsWithDetails });
    } catch (error) {
      console.error('Failed to get all deal rooms:', error);
      return res.status(400).json({ message: "Failed to get deal rooms" });
    }
  });
  
  // Get user's deal rooms
  app.get("/api/deal-rooms/user/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const rooms = await storage.getUserDealRooms(req.params.userId);
      
      // Fetch related data for each room
      const roomsWithDetails = await Promise.all(rooms.map(async (room) => {
        const tradeRequest = await storage.getTradeRequest(room.tradeRequestId);
        const proposal = await storage.getTradeProposal(room.acceptedProposalId);
        const importer = await storage.getUser(room.importerUserId);
        const exporter = await storage.getUser(room.exporterUserId);
        const unreadCount = await storage.getUnreadDealRoomMessageCount(room.id, req.params.userId);
        
        return {
          ...room,
          tradeRequest,
          proposal,
          importer: importer ? { id: importer.id, finatradesId: importer.finatradesId, email: importer.email } : null,
          exporter: exporter ? { id: exporter.id, finatradesId: exporter.finatradesId, email: exporter.email } : null,
          unreadCount,
        };
      }));
      
      return res.json({ rooms: roomsWithDetails });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get deal rooms" });
    }
  });
  
  // Get deal room by ID
  app.get("/api/deal-rooms/:id", async (req, res) => {
    try {
      const room = await storage.getDealRoom(req.params.id);
      if (!room) {
        return res.status(404).json({ message: "Deal room not found" });
      }
      
      const tradeRequest = await storage.getTradeRequest(room.tradeRequestId);
      const proposal = await storage.getTradeProposal(room.acceptedProposalId);
      const importer = await storage.getUser(room.importerUserId);
      const exporter = await storage.getUser(room.exporterUserId);
      const assignedAdmin = room.assignedAdminId ? await storage.getUser(room.assignedAdminId) : null;
      
        return res.json({
        room: {
          ...room,
          tradeRequest,
          proposal,
          importer: importer ? { 
            id: importer.id, 
            finatradesId: importer.finatradesId, 
            email: importer.email,
            profilePhoto: importer.profilePhoto,
            firstName: importer.firstName,
            lastName: importer.lastName,
            accountType: importer.accountType,
          } : null,
          exporter: exporter ? { 
            id: exporter.id, 
            finatradesId: exporter.finatradesId, 
            email: exporter.email,
            profilePhoto: exporter.profilePhoto,
            firstName: exporter.firstName,
            lastName: exporter.lastName,
            accountType: exporter.accountType,
          } : null,
          assignedAdmin: assignedAdmin ? { 
            id: assignedAdmin.id, 
            finatradesId: assignedAdmin.finatradesId, 
            email: assignedAdmin.email,
            profilePhoto: assignedAdmin.profilePhoto,
            firstName: assignedAdmin.firstName,
            lastName: assignedAdmin.lastName,
            accountType: assignedAdmin.accountType,
          } : null,
        },
      });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get deal room" });
    }
  });
  
  // Get deal room by trade request ID
  app.get("/api/deal-rooms/trade-request/:tradeRequestId", async (req, res) => {
    try {
      const room = await storage.getDealRoomByTradeRequest(req.params.tradeRequestId);
      if (!room) {
        return res.status(404).json({ message: "Deal room not found for this trade request" });
      }
      return res.json({ room });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get deal room" });
    }
  });
  
  // Get deal room messages
  app.get("/api/deal-rooms/:id/messages", async (req, res) => {
    try {
      const { userId } = req.query;
      
      // Verify user is a participant before allowing message access
      const room = await storage.getDealRoom(req.params.id);
      if (!room) {
        return res.status(404).json({ message: "Deal room not found" });
      }
      
      if (userId) {
        // Check if user is an admin - admins can always access deal rooms
        const user = await storage.getUser(userId as string);
        const isAdmin = user?.role === 'admin';
        const isParticipant = [room.importerUserId, room.exporterUserId, room.assignedAdminId].includes(userId as string);
        if (!isParticipant && !isAdmin) {
          return res.status(403).json({ message: "Access denied - not a participant" });
        }
      }
      
      const messages = await storage.getDealRoomMessages(req.params.id);
      
      // Get sender info for each message
      const messagesWithSenders = await Promise.all(messages.map(async (msg) => {
        const sender = await storage.getUser(msg.senderUserId);
        return {
          ...msg,
          sender: sender ? { id: sender.id, finatradesId: sender.finatradesId, email: sender.email } : null,
        };
      }));
      
      return res.json({ messages: messagesWithSenders });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get messages" });
    }
  });
  
  // Send message in deal room
  app.post("/api/deal-rooms/:id/messages", async (req, res) => {
    try {
      const { senderUserId, senderRole, content, attachmentUrl, attachmentName, attachmentType } = req.body;
      
      if (!senderUserId || !senderRole) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      if (!content && !attachmentUrl) {
        return res.status(400).json({ message: "Message must have content or attachment" });
      }
      
      // Verify user is a participant or admin
      const room = await storage.getDealRoom(req.params.id);
      if (!room) {
        return res.status(404).json({ message: "Deal room not found" });
      }
      
      // Check if user is an admin - admins can always send messages
      const user = await storage.getUser(senderUserId);
      const isAdmin = user?.role === 'admin';
      const isParticipant = [room.importerUserId, room.exporterUserId, room.assignedAdminId].includes(senderUserId);
      if (!isParticipant && !isAdmin) {
        return res.status(403).json({ message: "User is not a participant in this deal room" });
      }
      
      const message = await storage.createDealRoomMessage({
        dealRoomId: req.params.id,
        senderUserId,
        senderRole,
        content: content || null,
        attachmentUrl: attachmentUrl || null,
        attachmentName: attachmentName || null,
        attachmentType: attachmentType || null,
        isRead: false,
      });
      
      const sender = await storage.getUser(senderUserId);
      
      return res.json({ 
        message: {
          ...message,
          sender: sender ? { id: sender.id, finatradesId: sender.finatradesId, email: sender.email } : null,
        }
      });
    } catch (error) {
      return res.status(400).json({ message: error instanceof Error ? error.message : "Failed to send message" });
    }
  });
  
  // Mark messages as read
  app.post("/api/deal-rooms/:id/mark-read", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ message: "Missing userId" });
      }
      
      await storage.markDealRoomMessagesAsRead(req.params.id, userId);
      return res.json({ message: "Messages marked as read" });
    } catch (error) {
      return res.status(400).json({ message: "Failed to mark messages as read" });
    }
  });
  
  // Admin: Assign admin to deal room
  app.post("/api/admin/deal-rooms/:id/assign", ensureAdminAsync, requirePermission('manage_finabridge'), async (req, res) => {
    try {
      const { adminId } = req.body;
      if (!adminId) {
        return res.status(400).json({ message: "Missing adminId" });
      }
      
      const room = await storage.updateDealRoom(req.params.id, { assignedAdminId: adminId });
      // Notify parties that a deal manager was assigned
      try {
        const updatedRoom = await storage.getDealRoom(req.params.id);
        if (updatedRoom) {
          const msg = `A deal manager has been assigned to your trade deal room.`;
          const link = `/finabridge/deal-room/${req.params.id}`;
          await storage.createNotification({ userId: updatedRoom.importerUserId, title: 'Deal Manager Assigned', message: msg, type: 'trade', link, read: false });
          await storage.createNotification({ userId: updatedRoom.exporterUserId, title: 'Deal Manager Assigned', message: msg, type: 'trade', link, read: false });
        }
      } catch (e) { console.error('[Notification] deal manager assign failed:', e); }
      return res.json({ room });
    } catch (error) {
      return res.status(400).json({ message: "Failed to assign admin" });
    }
  });

  // ============================================================================
  // DEAL ROOM - INTERNAL ADMIN NOTES
  // ============================================================================

  app.get("/api/admin/deal-rooms/:id/internal-notes", ensureAdminAsync, requirePermission('manage_finabridge'), async (req: Request, res: Response) => {
    try {
      const notes = await db.select().from(dealRoomInternalNotes)
        .where(eq(dealRoomInternalNotes.dealRoomId, req.params.id))
        .orderBy(desc(dealRoomInternalNotes.createdAt));
      const adminUser = req.adminUser!;
      const enriched = await Promise.all(notes.map(async (n) => {
        const author = await storage.getUser(n.adminUserId);
        return { ...n, authorName: author ? `${author.firstName || ''} ${author.lastName || ''}`.trim() || author.email : 'Admin' };
      }));
      return res.json({ notes: enriched });
    } catch (error) {
      return res.status(400).json({ message: "Failed to fetch internal notes" });
    }
  });

  app.post("/api/admin/deal-rooms/:id/internal-notes", ensureAdminAsync, requirePermission('manage_finabridge'), async (req: Request, res: Response) => {
    try {
      const adminUser = req.adminUser!;
      const { note, isEscalated } = req.body;
      if (!note?.trim()) return res.status(400).json({ message: "Note is required" });
      const [created] = await db.insert(dealRoomInternalNotes).values({
        id: crypto.randomUUID(),
        dealRoomId: req.params.id,
        adminUserId: adminUser.id,
        note: note.trim(),
        isEscalated: !!isEscalated,
      }).returning();
      return res.json({ note: created });
    } catch (error) {
      return res.status(400).json({ message: "Failed to create internal note" });
    }
  });

  // Admin: Mark deal as escalated via flag
  app.patch("/api/admin/deal-rooms/:id/escalate", ensureAdminAsync, requirePermission('manage_finabridge'), async (req: Request, res: Response) => {
    try {
      const adminUser = req.adminUser!;
      const { reason } = req.body;
      // Insert an escalation note
      await db.insert(dealRoomInternalNotes).values({
        id: crypto.randomUUID(),
        dealRoomId: req.params.id,
        adminUserId: adminUser.id,
        note: reason ? `ESCALATED: ${reason}` : 'Deal escalated by admin',
        isEscalated: true,
      });
      return res.json({ message: "Deal escalated" });
    } catch (error) {
      return res.status(400).json({ message: "Failed to escalate deal" });
    }
  });

  // Admin: Assign deal manager to a deal room
  app.post("/api/admin/deal-rooms/:id/assign-manager", ensureAdminAsync, requirePermission('manage_finabridge'), async (req: Request, res: Response) => {
    try {
      const { adminEmail } = req.body;
      if (!adminEmail?.trim()) return res.status(400).json({ message: "Admin email is required" });
      const targetAdmin = await storage.getUserByEmail(adminEmail.trim().toLowerCase());
      if (!targetAdmin) return res.status(404).json({ message: "Admin user not found with that email" });
      if (targetAdmin.role !== 'admin') return res.status(400).json({ message: "User is not an admin" });
      const room = await storage.getDealRoom(req.params.id);
      if (!room) return res.status(404).json({ message: "Deal room not found" });
      const [updated] = await db.update(dealRoomsTable).set({ assignedAdminId: targetAdmin.id }).where(eq(dealRoomsTable.id, req.params.id)).returning();
      const shortId = room.id.slice(0, 8);
      // Notify assigned deal manager (admin)
      await storage.createNotification({ userId: targetAdmin.id, title: 'Deal Manager Assigned', message: `You have been assigned as Deal Manager for deal room ${shortId}`, type: 'trade', link: `/admin/finabridge`, read: false });
      // Notify deal parties (importer + exporter)
      const partyMsg = `A deal manager has been assigned to your deal room ${shortId}. You will be contacted shortly.`;
      if (room.importerUserId) {
        await storage.createNotification({ userId: room.importerUserId, title: 'Deal Manager Assigned', message: partyMsg, type: 'trade', link: `/finabridge`, read: false }).catch(() => {});
      }
      if (room.exporterUserId) {
        await storage.createNotification({ userId: room.exporterUserId, title: 'Deal Manager Assigned', message: partyMsg, type: 'trade', link: `/finabridge`, read: false }).catch(() => {});
      }
      return res.json({ message: "Deal manager assigned", room: updated });
    } catch (error) {
      console.error("assign-manager error:", error);
      return res.status(500).json({ message: "Failed to assign deal manager" });
    }
  });

  // ============================================================================
  // DEAL ROOM - PDF EXPORT
  // ============================================================================

  app.get("/api/deal-rooms/:dealRoomId/export-pdf", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const sessionUserId = req.session?.userId;
      if (!sessionUserId) return res.status(401).json({ message: "Not authenticated" });

      const sessionUser = await storage.getUser(sessionUserId);
      const isAdmin = sessionUser?.role === 'admin';
      const dealRoom = await storage.getDealRoom(req.params.dealRoomId);
      if (!dealRoom) return res.status(404).json({ message: "Deal room not found" });

      if (!isAdmin && dealRoom.importerUserId !== sessionUserId && dealRoom.exporterUserId !== sessionUserId && dealRoom.assignedAdminId !== sessionUserId) {
        return res.status(403).json({ message: "Not authorized" });
      }

      // Gather all deal data
      const tradeRequest = await storage.getTradeRequest(dealRoom.tradeRequestId);
      const documents = await db.select().from(dealRoomDocuments)
        .where(eq(dealRoomDocuments.dealRoomId, req.params.dealRoomId))
        .orderBy(dealRoomDocuments.documentType, desc(dealRoomDocuments.versionNumber ?? 1));
      const milestones = await db.select().from(dealMilestones)
        .where(eq(dealMilestones.dealRoomId, req.params.dealRoomId))
        .orderBy(dealMilestones.completedAt);
      const discrepancyRows = await db.select().from(dealDiscrepancies)
        .where(eq(dealDiscrepancies.dealRoomId, req.params.dealRoomId))
        .orderBy(dealDiscrepancies.createdAt);
      const [lcTermsRow] = await db.select().from(lcTerms)
        .where(eq(lcTerms.dealRoomId, req.params.dealRoomId));

      const importer = dealRoom.importerUserId ? await storage.getUser(dealRoom.importerUserId) : null;
      const exporter = dealRoom.exporterUserId ? await storage.getUser(dealRoom.exporterUserId) : null;

      // Deduplicate docs — only latest version per doc type
      const latestDocsByType: Record<string, typeof documents[0]> = {};
      for (const doc of documents) {
        const existing = latestDocsByType[doc.documentType];
        if (!existing || (doc.versionNumber ?? 1) > (existing.versionNumber ?? 1)) {
          latestDocsByType[doc.documentType] = doc;
        }
      }
      const latestDocs = Object.values(latestDocsByType);

      const now = new Date();
      const formatDate = (d: Date | string | null | undefined) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';
      const safeStr = (s: string | null | undefined) => (s || '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');

      // Generate PDF using PDFKit (consistent with existing certificate/agreement PDF generation)
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const filename = `deal-summary-${tradeRequest?.tradeRefId || dealRoom.id}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      doc.pipe(res);

      const PURPLE = '#7c3aed';
      const GRAY = '#6b7280';
      const pageW = doc.page.width - 100; // content width (margins on both sides)

      // Helper: section heading
      const sectionHeading = (title: string) => {
        doc.moveDown(0.5);
        doc.fontSize(11).font('Helvetica-Bold').fillColor(PURPLE).text(title.toUpperCase());
        doc.moveTo(50, doc.y).lineTo(50 + pageW, doc.y).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
        doc.fillColor('#000000').moveDown(0.3);
      };

      // Helper: key-value row
      const kv = (label: string, value: string) => {
        const y = doc.y;
        doc.fontSize(9).font('Helvetica').fillColor(GRAY).text(label, 50, y, { width: 150, continued: false });
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#111827').text(safeStr(value) || 'N/A', 210, y, { width: pageW - 160 });
      };

      // ─── Header ───────────────────────────────────────────────────────────────
      doc.fontSize(18).font('Helvetica-Bold').fillColor(PURPLE).text('FinaTrades', 50, 50, { continued: true });
      doc.fillColor('#111827').text(' — FinaBridge Deal Summary');
      doc.fontSize(9).font('Helvetica').fillColor(GRAY)
        .text(`Generated: ${formatDate(now)} at ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`, 50, doc.y)
        .moveDown(0.2);
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#111827')
        .text(`Deal Ref: ${safeStr(tradeRequest?.tradeRefId) || 'N/A'}  |  Status: ${dealRoom.status}  |  LC Stage: ${dealRoom.lcLifecycleStatus || 'Draft'}`);
      doc.moveTo(50, doc.y + 4).lineTo(50 + pageW, doc.y + 4).strokeColor(PURPLE).lineWidth(1.5).stroke();
      doc.moveDown(1);

      // ─── Trade Overview ───────────────────────────────────────────────────────
      sectionHeading('Trade Overview');
      kv('Goods', safeStr(tradeRequest?.goodsName));
      kv('Trade Value', `$${parseFloat(tradeRequest?.tradeValueUsd || '0').toLocaleString()} USD`);
      kv('Settlement Gold', `${parseFloat(tradeRequest?.settlementGoldGrams || '0').toFixed(3)}g Au`);
      kv('Currency', safeStr(tradeRequest?.currency) || 'USD');
      kv('Incoterms', safeStr(tradeRequest?.incoterms));
      kv('Deal Opened', formatDate(dealRoom.createdAt));

      // ─── LC Terms ─────────────────────────────────────────────────────────────
      sectionHeading('LC Terms');
      kv('LC Type', safeStr(lcTermsRow?.lcType));
      kv('Expiry Date', safeStr(lcTermsRow?.expiryDate));
      kv('Expiry Place', safeStr(lcTermsRow?.expiryPlace));
      kv('LC Amount', lcTermsRow?.amount ? `$${parseFloat(lcTermsRow.amount).toLocaleString()}` : 'N/A');
      kv('Partial Shipment', lcTermsRow?.partialShipment ? 'Allowed' : 'Not Allowed');
      kv('Transshipment', lcTermsRow?.transshipment ? 'Allowed' : 'Not Allowed');

      // ─── Deal Parties ─────────────────────────────────────────────────────────
      sectionHeading('Deal Parties — Importer');
      kv('Name', importer ? safeStr(importer.firstName ? `${importer.firstName} ${importer.lastName || ''}` : importer.email) : 'N/A');
      kv('Company', safeStr(importer?.companyName));
      kv('FinaTrades ID', safeStr(importer?.finatradesId));
      kv('Email', safeStr(importer?.email));
      sectionHeading('Deal Parties — Exporter');
      kv('Name', exporter ? safeStr(exporter.firstName ? `${exporter.firstName} ${exporter.lastName || ''}` : exporter.email) : 'N/A');
      kv('Company', safeStr(exporter?.companyName));
      kv('FinaTrades ID', safeStr(exporter?.finatradesId));
      kv('Email', safeStr(exporter?.email));

      // ─── Document Checklist ───────────────────────────────────────────────────
      sectionHeading('Document Checklist');
      if (latestDocs.length === 0) {
        doc.fontSize(9).font('Helvetica').fillColor(GRAY).text('No documents uploaded.');
      } else {
        // Table header
        const cols = { type: 50, role: 195, status: 305, ver: 390, date: 440, notes: 500 };
        const tableHeaderY = doc.y;
        doc.rect(50, tableHeaderY, pageW, 16).fill('#f3f4f6');
        doc.fontSize(8).font('Helvetica-Bold').fillColor(GRAY)
          .text('DOCUMENT TYPE', cols.type, tableHeaderY + 4, { width: 140 })
          .text('UPLOADED BY', cols.role, tableHeaderY + 4, { width: 105 })
          .text('STATUS', cols.status, tableHeaderY + 4, { width: 80 })
          .text('VER', cols.ver, tableHeaderY + 4, { width: 45 })
          .text('VERIFIED', cols.date, tableHeaderY + 4, { width: 55 });
        doc.moveDown(0.1);
        doc.y = tableHeaderY + 20;
        for (const d of latestDocs) {
          const rowY = doc.y;
          if (rowY > 700) { doc.addPage(); }
          doc.fontSize(8).font('Helvetica').fillColor('#111827')
            .text(safeStr(d.documentType), cols.type, rowY, { width: 140 })
            .text(safeStr(d.uploaderRole), cols.role, rowY, { width: 105 })
            .text(safeStr(d.status), cols.status, rowY, { width: 80 })
            .text(`v${d.versionNumber ?? 1}`, cols.ver, rowY, { width: 45 })
            .text(formatDate(d.verifiedAt), cols.date, rowY, { width: 55 });
          doc.moveTo(50, doc.y + 2).lineTo(50 + pageW, doc.y + 2).strokeColor('#f3f4f6').lineWidth(0.5).stroke();
          doc.moveDown(0.2);
        }
      }

      // ─── Milestones ───────────────────────────────────────────────────────────
      sectionHeading('Deal Milestone Timeline');
      if (milestones.length === 0) {
        doc.fontSize(9).font('Helvetica').fillColor(GRAY).text('No milestones recorded.');
      } else {
        milestones.forEach((m, i) => {
          const rowY = doc.y;
          if (rowY > 700) { doc.addPage(); }
          doc.fontSize(8).font('Helvetica').fillColor('#111827')
            .text(`${i + 1}. ${safeStr(m.milestoneName)}`, 50, rowY, { width: 280 });
          doc.fontSize(8).fillColor(GRAY)
            .text(`${safeStr(m.completedByRole) || '—'}   ${formatDate(m.completedAt)}`, 340, rowY, { width: 210 });
          doc.moveTo(50, doc.y + 1).lineTo(50 + pageW, doc.y + 1).strokeColor('#f3f4f6').lineWidth(0.5).stroke();
          doc.moveDown(0.1);
        });
      }

      // ─── Discrepancies ────────────────────────────────────────────────────────
      if (discrepancyRows.length > 0) {
        sectionHeading('Discrepancy Log');
        discrepancyRows.forEach((d) => {
          if (doc.y > 700) { doc.addPage(); }
          doc.fontSize(8).font('Helvetica-Bold').fillColor('#111827')
            .text(`[${d.status?.toUpperCase()}] ${safeStr(d.reasonType)}`, 50, doc.y, { width: pageW });
          doc.fontSize(8).font('Helvetica').fillColor(GRAY)
            .text(`Raised: ${formatDate(d.createdAt)}  |  Resolved: ${formatDate(d.resolvedAt)}`, 50, doc.y);
          if (d.description) {
            doc.fontSize(8).fillColor('#374151').text(safeStr(d.description), 50, doc.y, { width: pageW });
          }
          doc.moveDown(0.3);
        });
      }

      // ─── Footer ───────────────────────────────────────────────────────────────
      doc.moveDown(1);
      doc.moveTo(50, doc.y).lineTo(50 + pageW, doc.y).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
      doc.moveDown(0.3);
      doc.fontSize(8).font('Helvetica').fillColor(GRAY)
        .text(
          `Confidential — authorized parties only. FinaTrades FinaBridge. Deal Room ID: ${dealRoom.id} | Generated: ${formatDate(now)}`,
          50, doc.y, { width: pageW, align: 'center' }
        );

      doc.end();
      return undefined;
    } catch (error) {
      console.error('[DealRoom] PDF export error:', error);
      return res.status(500).json({ message: "Failed to generate deal summary" });
    }
  });

  // ============================================================================
  // DEAL ROOM - MT700 LC DRAFT FIELD VALIDATOR
  // ============================================================================

  app.post("/api/deal-rooms/:dealRoomId/documents/:documentId/validate-mt700", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const sessionUserId = req.session?.userId;
      if (!sessionUserId) return res.status(401).json({ message: "Not authenticated" });

      const sessionUser = await storage.getUser(sessionUserId);
      const isAdmin = sessionUser?.role === 'admin';
      const dealRoom = await storage.getDealRoom(req.params.dealRoomId);
      if (!dealRoom) return res.status(404).json({ message: "Deal room not found" });

      if (!isAdmin && dealRoom.importerUserId !== sessionUserId && dealRoom.exporterUserId !== sessionUserId && dealRoom.assignedAdminId !== sessionUserId) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const [doc] = await db.select().from(dealRoomDocuments)
        .where(and(
          eq(dealRoomDocuments.id, req.params.documentId),
          eq(dealRoomDocuments.dealRoomId, req.params.dealRoomId)
        ));
      if (!doc) return res.status(404).json({ message: "Document not found" });

      // MT700 mandatory fields with descriptions
      const MT700_MANDATORY_FIELDS = [
        { tag: ':40A:', name: 'Form of Documentary Credit', description: 'Type of LC (e.g., IRREVOCABLE)' },
        { tag: ':31D:', name: 'Date and Place of Expiry', description: 'Expiry date and location of the LC' },
        { tag: ':32B:', name: 'Currency Code, Amount', description: 'Currency and amount of the LC' },
        { tag: ':41A:', name: 'Available With By', description: 'Bank and method of availability' },
        { tag: ':43P:', name: 'Partial Shipments', description: 'Whether partial shipments are allowed' },
        { tag: ':44A:', name: 'Place of Taking in Charge', description: 'Port or place of loading' },
        { tag: ':44B:', name: 'Place of Final Destination', description: 'Port or place of discharge' },
        { tag: ':45A:', name: 'Description of Goods / Services', description: 'Description of the goods or services' },
      ];

      // Extract actual document text from the uploaded file (PDF or text)
      let extractedText = '';
      let extractionSource = 'none';
      try {
        const fileUrl = doc.fileUrl;
        if (fileUrl) {
          let fileBuffer: Buffer | null = null;
          if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
            // R2 / CDN file — only fetch from trusted R2 origin (SSRF protection)
            const r2PublicBase = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');
            const isTrustedOrigin = r2PublicBase && fileUrl.startsWith(r2PublicBase);
            if (isTrustedOrigin) {
              const resp = await fetch(fileUrl, { headers: { 'User-Agent': 'FinaTrades-MT700-Validator/1.0' } });
              if (resp.ok) {
                const arrayBuf = await resp.arrayBuffer();
                fileBuffer = Buffer.from(arrayBuf);
                extractionSource = 'remote-fetch';
              }
            } else {
              console.warn(`[MT700] Blocked fetch of untrusted URL: ${fileUrl.slice(0, 80)}`);
            }
          } else if (fileUrl.startsWith('/uploads/')) {
            // Local upload file
            const { readFile } = await import('fs/promises');
            const path = await import('path');
            const localPath = path.join(process.cwd(), 'public', fileUrl);
            fileBuffer = await readFile(localPath).catch(() => null);
            if (fileBuffer) extractionSource = 'local-file';
          }
          if (fileBuffer) {
            // Try PDF extraction first
            const isPdf = doc.fileName?.toLowerCase().endsWith('.pdf') || fileBuffer[0] === 0x25; // '%PDF'
            if (isPdf) {
              try {
                // See note above on pdf-parse import shape; cast is intentional.
                const pdfParse: any = (await import('pdf-parse' as any) as any).default || (await import('pdf-parse' as any));
                const pdfData = await pdfParse(fileBuffer);
                extractedText = pdfData.text || '';
                extractionSource += '-pdf-parse';
              } catch (pdfErr) {
                // Fall back to raw text extraction
                extractedText = fileBuffer.toString('utf-8').replace(/[^\x20-\x7E\n\r\t]/g, ' ');
                extractionSource += '-raw-text';
              }
            } else {
              // Plain text or other format
              extractedText = fileBuffer.toString('utf-8').replace(/[^\x20-\x7E\n\r\t]/g, ' ');
              extractionSource += '-raw-text';
            }
          }
        }
      } catch (extractErr) {
        console.error('[MT700] Text extraction failed (non-blocking):', extractErr);
      }

      // Build the text corpus for tag scanning:
      // 1. Extracted document text (primary — actual content)
      // 2. Metadata fields (secondary — fallback)
      const upperText = extractedText.toUpperCase();
      const metaText = [doc.fileName, doc.description, doc.verificationNotes].filter(Boolean).join(' ').toUpperCase();
      const fullText = `${upperText} ${metaText}`;

      const validationFields = MT700_MANDATORY_FIELDS.map(field => {
        const tagNoColon = field.tag.replace(/:/g, '');
        const tagWithColon = field.tag;
        return {
          tag: field.tag,
          name: field.name,
          description: field.description,
          present: fullText.includes(tagNoColon) || fullText.includes(tagWithColon),
        };
      });

      // Cross-check with LC terms stored in DB — terms confirmed in system count as present
      const [lcRow] = await db.select().from(lcTerms).where(eq(lcTerms.dealRoomId, req.params.dealRoomId));
      if (lcRow) {
        for (const field of validationFields) {
          if (field.tag === ':31D:' && lcRow.expiryDate) field.present = true;
          if (field.tag === ':32B:' && lcRow.amount) field.present = true;
          if (field.tag === ':40A:' && lcRow.lcType) field.present = true;
          if (field.tag === ':43P:') field.present = lcRow.partialShipment !== null;
        }
      }

      const presentCount = validationFields.filter(f => f.present).length;
      const missingCount = validationFields.length - presentCount;
      const validationResult = {
        documentId: doc.id,
        documentType: doc.documentType,
        validatedAt: new Date().toISOString(),
        extractionSource,
        fields: validationFields,
        summary: { total: validationFields.length, present: presentCount, missing: missingCount },
        isValid: missingCount === 0,
      };

      // Persist result in the document record
      await db.update(dealRoomDocuments).set({
        mt700ValidationResult: validationResult,
        updatedAt: new Date(),
      }).where(eq(dealRoomDocuments.id, doc.id));

      return res.json({ validationResult });
    } catch (error) {
      console.error('[MT700] Validation error:', error);
      return res.status(500).json({ message: "Failed to validate MT700 fields" });
    }
  });

  // ============================================================================
  // FINABRIDGE DEAL ROOM ANALYTICS
  // ============================================================================

  app.get("/api/admin/finabridge/deal-analytics", ensureAdminAsync, requirePermission('manage_finabridge'), async (req: Request, res: Response) => {
    try {
      // 1. All deal rooms with creation and close dates
      const rooms = await db.select({
        id: dealRoomsTable.id,
        status: dealRoomsTable.status,
        isClosed: dealRoomsTable.isClosed,
        lcLifecycleStatus: dealRoomsTable.lcLifecycleStatus,
        createdAt: dealRoomsTable.createdAt,
        updatedAt: dealRoomsTable.updatedAt,
      }).from(dealRoomsTable);

      // 2. Active vs Closed by month (last 6 months)
      const now = new Date();
      const months: string[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push(d.toLocaleString('en-US', { month: 'short', year: '2-digit' }));
      }

      const activeVsClosed = months.map((month, idx) => {
        const startDate = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1);
        const endDate = new Date(now.getFullYear(), now.getMonth() - (5 - idx) + 1, 1);
        const inMonth = rooms.filter(r => {
          const created = new Date(r.createdAt);
          return created >= startDate && created < endDate;
        });
        return { month, active: inMonth.filter(r => !r.isClosed).length, closed: inMonth.filter(r => r.isClosed).length };
      });

      // 3. Document rejection rate by type
      const allDocs = await db.select({
        documentType: dealRoomDocuments.documentType,
        status: dealRoomDocuments.status,
      }).from(dealRoomDocuments);

      const docTypeStats: Record<string, { total: number; rejected: number }> = {};
      for (const doc of allDocs) {
        if (!docTypeStats[doc.documentType]) docTypeStats[doc.documentType] = { total: 0, rejected: 0 };
        docTypeStats[doc.documentType].total++;
        if (doc.status === 'Rejected') docTypeStats[doc.documentType].rejected++;
      }
      const docRejectionRates = Object.entries(docTypeStats)
        .map(([type, s]) => ({ type, rejectionRate: s.total > 0 ? Math.round((s.rejected / s.total) * 100) : 0, total: s.total, rejected: s.rejected }))
        .filter(d => d.total > 0)
        .sort((a, b) => b.total - a.total)
        .slice(0, 8);

      // 4. Most common discrepancy reasons
      const allDiscrepancies = await db.select({ reasonType: dealDiscrepancies.reasonType }).from(dealDiscrepancies);
      const discrepancyReasonCounts: Record<string, number> = {};
      for (const d of allDiscrepancies) {
        const key = d.reasonType || 'Other';
        discrepancyReasonCounts[key] = (discrepancyReasonCounts[key] || 0) + 1;
      }
      const discrepancyReasons = Object.entries(discrepancyReasonCounts)
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count);

      // 5. Average deal completion time by month (closed deals)
      const closedRooms = rooms.filter(r => r.isClosed && r.updatedAt);
      const completionByMonth: Record<string, number[]> = {};
      for (const r of closedRooms) {
        const closeDate = new Date(r.updatedAt);
        const monthKey = closeDate.toLocaleString('en-US', { month: 'short', year: '2-digit' });
        const daysOpen = Math.round((closeDate.getTime() - new Date(r.createdAt).getTime()) / (1000 * 60 * 60 * 24));
        if (!completionByMonth[monthKey]) completionByMonth[monthKey] = [];
        completionByMonth[monthKey].push(daysOpen);
      }
      const avgCompletionTime = months.map(month => {
        const days = completionByMonth[month];
        return { month, avgDays: days && days.length > 0 ? Math.round(days.reduce((a, b) => a + b, 0) / days.length) : 0 };
      });

      return res.json({
        activeVsClosed,
        docRejectionRates,
        discrepancyReasons,
        avgCompletionTime,
        summary: {
          totalRooms: rooms.length,
          activeRooms: rooms.filter(r => !r.isClosed).length,
          closedRooms: rooms.filter(r => r.isClosed).length,
          totalDocuments: allDocs.length,
          totalDiscrepancies: allDiscrepancies.length,
        },
      });
    } catch (error) {
      console.error('[Analytics] Error:', error);
      return res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Get deal room agreement acceptance status for current user
  app.get("/api/deal-rooms/:id/agreement", async (req, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const room = await storage.getDealRoom(req.params.id);
      if (!room) {
        return res.status(404).json({ message: "Deal room not found" });
      }

      const acceptance = await storage.getDealRoomAgreementAcceptance(req.params.id, userId);
      const allAcceptances = await storage.getDealRoomAgreementAcceptances(req.params.id);

        return res.json({
        hasAccepted: !!acceptance,
        acceptance,
        allAcceptances,
        agreementVersion: "1.0"
      });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get agreement status" });
    }
  });

  // Accept deal room terms and conditions
  app.post("/api/deal-rooms/:id/agreement/accept", async (req, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const room = await storage.getDealRoom(req.params.id);
      if (!room) {
        return res.status(404).json({ message: "Deal room not found" });
      }

      if (room.isClosed) {
        return res.status(400).json({ message: "Deal room is closed" });
      }

      const existingAcceptance = await storage.getDealRoomAgreementAcceptance(req.params.id, userId);
      if (existingAcceptance) {
        return res.status(400).json({ message: "Already accepted", acceptance: existingAcceptance });
      }

      let role: "importer" | "exporter" | "admin";
      if (room.importerUserId === userId) {
        role = "importer";
      } else if (room.exporterUserId === userId) {
        role = "exporter";
      } else if (room.assignedAdminId === userId) {
        role = "admin";
      } else {
        const user = await storage.getUser(userId);
        if (user?.role === "admin") {
          role = "admin";
        } else {
          return res.status(403).json({ message: "Not a participant of this deal room" });
        }
      }

      const acceptance = await storage.createDealRoomAgreementAcceptance({
        dealRoomId: req.params.id,
        userId,
        role,
        agreementVersion: "1.0",
        ipAddress: req.ip || req.socket.remoteAddress || null,
        userAgent: req.headers["user-agent"] || null
      });

      await storage.createAuditLog({
        entityType: "deal_room",
        entityId: req.params.id,
        actionType: "agreement_accepted",
        actor: userId,
        actorRole: "user",
        details: JSON.stringify({ role, agreementVersion: "1.0" })
      });

      return res.json({ acceptance, message: "Terms accepted successfully" });
    } catch (error) {
      console.error("Failed to accept agreement:", error);
      return res.status(400).json({ message: "Failed to accept agreement" });
    }
  });

  // Admin: Close deal room
  app.post("/api/admin/deal-rooms/:id/close", ensureAdminAsync, requirePermission('manage_finabridge'), async (req, res) => {
    try {
      const adminId = req.adminUser!.id;
      const { closureNotes } = req.body;

      const room = await storage.getDealRoom(req.params.id);
      if (!room) {
        return res.status(404).json({ message: "Deal room not found" });
      }

      if (room.isClosed) {
        return res.status(400).json({ message: "Deal room is already closed" });
      }

      const tradeRequest = await storage.getTradeRequest(room.tradeRequestId);
      if (!tradeRequest) {
        return res.status(404).json({ message: "Trade request not found" });
      }

      if (!["Settled", "Completed", "Cancelled"].includes(tradeRequest.status)) {
        return res.status(400).json({ 
          message: `Cannot close deal room. Trade must be Settled, Completed or Cancelled. Current status: ${tradeRequest.status}` 
        });
      }

      const closedRoom = await storage.closeDealRoom(req.params.id, adminId, closureNotes);

      await storage.createAuditLog({
        entityType: "deal_room",
        entityId: req.params.id,
        actionType: "deal_room_closed",
        actor: adminId,
        actorRole: "admin",
        details: JSON.stringify({ closureNotes, tradeStatus: tradeRequest.status })
      });

      // Email #13 — deal room closed → both importer and exporter
      try {
        const proposal = await storage.getTradeProposal(room.acceptedProposalId);
        const closedImporter = await storage.getUser(room.importerUserId);
        const closedExporter = proposal ? await storage.getUser(proposal.exporterUserId) : null;
        const tradeRef = tradeRequest.tradeRefId;

        for (const party of [closedImporter, closedExporter].filter(Boolean)) {
          if (party?.email) {
            sendEmail(party.email, EMAIL_TEMPLATES.FINABRIDGE_DEAL_ROOM_CLOSED, {
              user_name: `${party.firstName || ''} ${party.lastName || ''}`.trim() || 'Valued Partner',
              trade_ref: tradeRef,
              trade_status: tradeRequest.status,
              closure_notes: closureNotes || 'Trade successfully completed',
              dashboard_url: '/finabridge',
            }, { userId: party.id, recipientName: party.firstName || undefined }).catch(err => console.error('[Email] Deal room closed email failed:', err));
          }
        }
      } catch (e) { console.error('[Email] Failed to send deal room closed emails:', e); }

      return res.json({ room: closedRoom, message: "Deal room closed successfully" });
    } catch (error) {
      console.error("Failed to close deal room:", error);
      return res.status(400).json({ message: error instanceof Error ? error.message : "Failed to close deal room" });
    }
  });

  // Admin: Update deal room disclaimer
  app.post("/api/admin/deal-rooms/:id/disclaimer", ensureAdminAsync, requirePermission('manage_finabridge'), async (req, res) => {
    try {
      const adminId = req.adminUser!.id;
      const { disclaimer } = req.body;

      const room = await storage.getDealRoom(req.params.id);
      if (!room) {
        return res.status(404).json({ message: "Deal room not found" });
      }

      const updatedRoom = await storage.updateDealRoom(req.params.id, {
        adminDisclaimer: disclaimer,
        adminDisclaimerUpdatedAt: new Date(),
        adminDisclaimerUpdatedBy: adminId,
        updatedAt: new Date()
      });

      await storage.createAuditLog({
        entityType: "deal_room",
        entityId: req.params.id,
        actionType: "disclaimer_updated",
        actor: adminId,
        actorRole: "admin",
        details: JSON.stringify({ disclaimer })
      });

      return res.json({ room: updatedRoom, message: "Disclaimer saved successfully" });
    } catch (error) {
      console.error("Failed to update disclaimer:", error);
      return res.status(400).json({ message: "Failed to update disclaimer" });
    }
  });
  
  // ============================================================================
  // CHAT SYSTEM
  // ============================================================================
  
  // Get user chat session
  app.get("/api/chat/session/:userId", ensureAuthenticated, async (req, res) => {
    try {
      let session = await storage.getChatSession(req.params.userId);
      
      // Create new session if none exists
      if (!session) {
        session = await storage.createChatSession({
          userId: req.params.userId,
          status: "active",
          lastMessageAt: new Date(),
        });
      }
      
      return res.json({ session });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get chat session" });
    }
  });
  
  // Get all chat sessions (Admin)
  app.get("/api/admin/chat/sessions", ensureAdminAsync, requirePermission('view_support', 'manage_support'), async (req, res) => {
    try {
      const sessions = await storage.getAllChatSessions();
      
      // Enrich sessions with user details
      const enrichedSessions = await Promise.all(
        sessions.map(async (session) => {
          if (session.userId) {
            const user = await storage.getUser(session.userId);
            if (user) {
              return {
                ...session,
                userName: `${user.firstName} ${user.lastName}`.trim(),
                userEmail: user.email,
              };
            }
          }
          return {
            ...session,
            userName: session.guestName || 'Guest',
            userEmail: session.guestEmail || null,
          };
        })
      );
      
      return res.json({ sessions: enrichedSessions });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get chat sessions" });
    }
  });
  
  // Get session messages
  app.get("/api/chat/messages/:sessionId", ensureAuthenticated, async (req, res) => {
    try {
      const messages = await storage.getSessionMessages(req.params.sessionId);
      return res.json({ messages });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get messages" });
    }
  });
  
  // Send message
  app.post("/api/chat/messages", ensureAuthenticated, async (req, res) => {
    try {
      const messageData = insertChatMessageSchema.parse(req.body);
      const message = await storage.createChatMessage(messageData);
      
      // Update session last message time
      await storage.updateChatSession(messageData.sessionId, {
        lastMessageAt: new Date(),
      });
      
      return res.json({ message });
    } catch (error) {
      return res.status(400).json({ message: error instanceof Error ? error.message : "Failed to send message" });
    }
  });
  
  // Mark messages as read
  app.patch("/api/chat/messages/:sessionId/read", ensureAuthenticated, async (req, res) => {
    try {
      await storage.markMessagesAsRead(req.params.sessionId);
      return res.json({ success: true });
    } catch (error) {
      return res.status(400).json({ message: "Failed to mark messages as read" });
    }
  });
  
  // Update chat session
  app.patch("/api/chat/session/:id", ensureAuthenticated, async (req, res) => {
    try {
      const session = await storage.updateChatSession(req.params.id, req.body);
      if (!session) {
        return res.status(404).json({ message: "Chat session not found" });
      }
      return res.json({ session });
    } catch (error) {
      return res.status(400).json({ message: "Failed to update chat session" });
    }
  });
  
  // ============================================================================

  // ============================================================================
  // LIVE CHAT SUPPORT - USER-FACING ENDPOINTS
  // ============================================================================

  // POST /api/chat/sessions - Create a new chat session for the user
  app.post("/api/chat/sessions", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const { topic } = req.body;

      const session = await storage.createChatSession({
        userId,
        status: "open",
        context: topic ? JSON.stringify({ topic }) : null,
        lastMessageAt: new Date(),
      });

      // Emit socket event for real-time updates
      const io = getIO();
      if (io) {
        io.to('admin-room').emit('chat:session-created', {
          sessionId: session.id,
          userId,
          topic,
        });
      }

      return res.status(201).json({ session: { ...session, topic } });
    } catch (error) {
      console.error('[Chat] Failed to create session:', error);
      return res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create chat session" });
    }
  });

  // GET /api/chat/sessions - List user's chat sessions (limited to most recent 20)
  app.get("/api/chat/sessions", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const sessions = await storage.getUserChatSessions(userId, 20);

      // Parse topic from context for each session
      const sessionsWithTopic = sessions.map(session => {
        let topic = null;
        if (session.context) {
          try {
            const ctx = JSON.parse(session.context);
            topic = ctx.topic || null;
          } catch {}
        }
        return { ...session, topic };
      });

      return res.json({ sessions: sessionsWithTopic });
    } catch (error) {
      console.error('[Chat] Failed to list sessions:', error);
      return res.status(400).json({ message: "Failed to get chat sessions" });
    }
  });

  // GET /api/chat/sessions/:sessionId - Get a specific chat session with messages
  app.get("/api/chat/sessions/:sessionId", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const { sessionId } = req.params;

      const session = await storage.getChatSessionById(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Chat session not found" });
      }

      // Verify the session belongs to this user
      if (session.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const messages = await storage.getSessionMessages(sessionId);

      // Parse topic from context
      let topic = null;
      if (session.context) {
        try {
          const ctx = JSON.parse(session.context);
          topic = ctx.topic || null;
        } catch {}
      }

      return res.json({ session: { ...session, topic }, messages });
    } catch (error) {
      console.error('[Chat] Failed to get session:', error);
      return res.status(400).json({ message: "Failed to get chat session" });
    }
  });

  // POST /api/chat/sessions/:sessionId/messages - Send a message in a chat session
  app.post("/api/chat/sessions/:sessionId/messages", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const { sessionId } = req.params;
      const { content } = req.body;

      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return res.status(400).json({ message: "Message content is required" });
      }

      const session = await storage.getChatSessionById(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Chat session not found" });
      }

      // Verify the session belongs to this user
      if (session.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Check if session is closed
      if (session.status === 'closed') {
        return res.status(400).json({ message: "Cannot send messages to a closed session" });
      }

      // Create the message
      const message = await storage.createChatMessage({
        sessionId,
        content: content.trim(),
        sender: 'user',
        isRead: false,
      });

      // Update session last message time
      await storage.updateChatSession(sessionId, {
        lastMessageAt: new Date(),
      });

      // Emit socket events for real-time updates
      const io = getIO();
      if (io) {
        io.to(`session-${sessionId}`).emit('chat:message', {
          ...message,
          sessionId,
        });
        io.to('admin-room').emit('chat:new-message', {
          sessionId,
          message,
          userId,
        });
      }

      return res.status(201).json({ message });
    } catch (error) {
      console.error('[Chat] Failed to send message:', error);
      return res.status(400).json({ message: error instanceof Error ? error.message : "Failed to send message" });
    }
  });

  // PATCH /api/chat/sessions/:sessionId/close - Close a chat session
  app.patch("/api/chat/sessions/:sessionId/close", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const { sessionId } = req.params;

      const session = await storage.getChatSessionById(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Chat session not found" });
      }

      // Verify the session belongs to this user
      if (session.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updatedSession = await storage.updateChatSession(sessionId, {
        status: 'closed',
      });

      // Emit socket event for real-time updates
      const io = getIO();
      if (io) {
        io.to(`session-${sessionId}`).emit('chat:session-closed', {
          sessionId,
        });
        io.to('admin-room').emit('chat:session-closed', {
          sessionId,
          userId,
        });
      }

      return res.json({ session: updatedSession });
    } catch (error) {
      console.error('[Chat] Failed to close session:', error);
      return res.status(400).json({ message: "Failed to close chat session" });
    }
  });

  // CHAT AGENTS - MULTI-AGENT AI SYSTEM
  // ============================================================================
  
  // Get all active chat agents (public)
  app.get("/api/chat-agents", async (req, res) => {
    try {
      const agents = await storage.getActiveChatAgents();
      return res.json({ agents });
    } catch (error) {
      return res.status(500).json({ message: "Failed to fetch chat agents" });
    }
  });
  
  // Get specific chat agent
  app.get("/api/chat-agents/:id", async (req, res) => {
    try {
      const agent = await storage.getChatAgent(req.params.id);
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }
      return res.json({ agent });
    } catch (error) {
      return res.status(500).json({ message: "Failed to fetch chat agent" });
    }
  });
  
  // Get default chat agent
  app.get("/api/chat-agents/default", async (req, res) => {
    try {
      const agent = await storage.getDefaultChatAgent();
      return res.json({ agent });
    } catch (error) {
      return res.status(500).json({ message: "Failed to fetch default agent" });
    }
  });

  // Update chat agent (admin only)
  app.put("/api/chat-agents/:id", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      const agentId = req.params.id;
      
      const existingAgent = await storage.getChatAgent(agentId);
      if (!existingAgent) {
        return res.status(404).json({ message: "Agent not found" });
      }
      
      const { displayName, description, welcomeMessage, status } = req.body;
      const updates: any = {};
      if (displayName !== undefined) updates.displayName = displayName;
      if (description !== undefined) updates.description = description;
      if (welcomeMessage !== undefined) updates.welcomeMessage = welcomeMessage;
      if (status !== undefined) updates.status = status;
      
      const updatedAgent = await storage.updateChatAgent(agentId, updates);
      return res.json({ agent: updatedAgent });
    } catch (error) {
      console.error("Failed to update chat agent:", error);
      return res.status(500).json({ message: "Failed to update chat agent" });
    }
  });
  
  // ============================================================================
  // KNOWLEDGE BASE - FAQ & ARTICLE MANAGEMENT
  // ============================================================================

  // Get all knowledge categories
  app.get("/api/knowledge/categories", async (req, res) => {
    try {
      const categories = await storage.getAllKnowledgeCategories();
      return res.json({ categories });
    } catch (error) {
      console.error("Failed to fetch knowledge categories:", error);
      return res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  // Create knowledge category (admin only)
  app.post("/api/knowledge/categories", ensureAdminAsync, requirePermission('manage_cms'), async (req, res) => {
    try {
      const { name, description, icon, sortOrder } = req.body;
      if (!name) {
        return res.status(400).json({ message: "Category name is required" });
      }
      const category = await storage.createKnowledgeCategory({ name, description, icon, sortOrder: sortOrder || 0 });
      return res.json({ category });
    } catch (error) {
      console.error("Failed to create knowledge category:", error);
      return res.status(500).json({ message: "Failed to create category" });
    }
  });

  // Update knowledge category (admin only)
  app.put("/api/knowledge/categories/:id", ensureAdminAsync, requirePermission('manage_cms'), async (req, res) => {
    try {
      const { name, description, icon, sortOrder } = req.body;
      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;
      if (icon !== undefined) updates.icon = icon;
      if (sortOrder !== undefined) updates.sortOrder = sortOrder;
      
      const category = await storage.updateKnowledgeCategory(req.params.id, updates);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      return res.json({ category });
    } catch (error) {
      console.error("Failed to update knowledge category:", error);
      return res.status(500).json({ message: "Failed to update category" });
    }
  });

  // Delete knowledge category (admin only)
  app.delete("/api/knowledge/categories/:id", ensureAdminAsync, requirePermission('manage_cms'), async (req, res) => {
    try {
      await storage.deleteKnowledgeCategory(req.params.id);
      return res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete knowledge category:", error);
      return res.status(500).json({ message: "Failed to delete category" });
    }
  });

  // Get all knowledge articles (admin only - includes drafts)
  app.get("/api/knowledge/articles", ensureAdminAsync, requirePermission('view_cms', 'manage_cms'), async (req, res) => {
    try {
      const articles = await storage.getAllKnowledgeArticles();
      return res.json({ articles });
    } catch (error) {
      console.error("Failed to fetch knowledge articles:", error);
      return res.status(500).json({ message: "Failed to fetch articles" });
    }
  });

  // Get published knowledge articles (public)
  app.get("/api/knowledge/articles/published", async (req, res) => {
    try {
      const articles = await storage.getPublishedKnowledgeArticles();
      return res.json({ articles });
    } catch (error) {
      console.error("Failed to fetch published articles:", error);
      return res.status(500).json({ message: "Failed to fetch articles" });
    }
  });

  // Search knowledge base (public - for chatbot use)
  app.get("/api/knowledge/search", async (req, res) => {
    try {
      const { q, agentType } = req.query;
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ message: "Search query is required" });
      }
      const articles = await storage.searchKnowledgeArticles(q, agentType as string | undefined);
      return res.json({ articles });
    } catch (error) {
      console.error("Failed to search knowledge base:", error);
      return res.status(500).json({ message: "Failed to search" });
    }
  });

  // Get single knowledge article
  app.get("/api/knowledge/articles/:id", async (req, res) => {
    try {
      const article = await storage.getKnowledgeArticle(req.params.id);
      if (!article) {
        return res.status(404).json({ message: "Article not found" });
      }
      await storage.incrementArticleViewCount(req.params.id);
      return res.json({ article });
    } catch (error) {
      console.error("Failed to fetch knowledge article:", error);
      return res.status(500).json({ message: "Failed to fetch article" });
    }
  });

  // Create knowledge article (admin only)
  app.post("/api/knowledge/articles", ensureAdminAsync, requirePermission('manage_cms'), async (req, res) => {
    try {
      const { categoryId, title, summary, content, keywords, status, agentTypes } = req.body;
      if (!title || !content) {
        return res.status(400).json({ message: "Title and content are required" });
      }
      const adminUser = req.adminUser!;
      const article = await storage.createKnowledgeArticle({
        categoryId,
        title,
        summary,
        content,
        keywords: keywords ? JSON.stringify(keywords) : null,
        status: status || 'draft',
        agentTypes: agentTypes ? JSON.stringify(agentTypes) : null,
        createdBy: adminUser?.id,
        updatedBy: adminUser?.id,
      });
      return res.json({ article });
    } catch (error) {
      console.error("Failed to create knowledge article:", error);
      return res.status(500).json({ message: "Failed to create article" });
    }
  });

  // Update knowledge article (admin only)
  app.put("/api/knowledge/articles/:id", ensureAdminAsync, requirePermission('manage_cms'), async (req, res) => {
    try {
      const { categoryId, title, summary, content, keywords, status, agentTypes } = req.body;
      const adminUser = req.adminUser!;
      const updates: any = { updatedBy: adminUser?.id };
      
      if (categoryId !== undefined) updates.categoryId = categoryId;
      if (title !== undefined) updates.title = title;
      if (summary !== undefined) updates.summary = summary;
      if (content !== undefined) updates.content = content;
      if (keywords !== undefined) updates.keywords = JSON.stringify(keywords);
      if (status !== undefined) updates.status = status;
      if (agentTypes !== undefined) updates.agentTypes = JSON.stringify(agentTypes);
      
      const article = await storage.updateKnowledgeArticle(req.params.id, updates);
      if (!article) {
        return res.status(404).json({ message: "Article not found" });
      }
      return res.json({ article });
    } catch (error) {
      console.error("Failed to update knowledge article:", error);
      return res.status(500).json({ message: "Failed to update article" });
    }
  });

  // Delete knowledge article (admin only)
  app.delete("/api/knowledge/articles/:id", ensureAdminAsync, requirePermission('manage_cms'), async (req, res) => {
    try {
      await storage.deleteKnowledgeArticle(req.params.id);
      return res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete knowledge article:", error);
      return res.status(500).json({ message: "Failed to delete article" });
    }
  });

  // Mark article as helpful (public)
  app.post("/api/knowledge/articles/:id/helpful", async (req, res) => {
    try {
      await storage.incrementArticleHelpfulCount(req.params.id);
      return res.json({ success: true });
    } catch (error) {
      console.error("Failed to mark article as helpful:", error);
      return res.status(500).json({ message: "Failed to update article" });
    }
  });
  
  
  // ============================================================================
  // AUDIT LOGS
  // ============================================================================
  
  // Get entity audit logs
  app.get("/api/audit/:entityType/:entityId", async (req, res) => {
    try {
      const logs = await storage.getEntityAuditLogs(req.params.entityType, req.params.entityId);
      return res.json({ logs });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get audit logs" });
    }
  });

  // ============================================================================
  // CMS - CONTENT MANAGEMENT SYSTEM (PUBLIC)
  // ============================================================================
  
  // Get content by page slug (Public - for frontend consumption)
  app.get("/api/cms/page/:slug", async (req, res) => {
    try {
      const page = await storage.getContentPageBySlug(req.params.slug);
      if (!page || !page.isActive) {
        return res.status(404).json({ message: "Page not found" });
      }
      const blocks = await storage.getPageContentBlocks(page.id);
      // Only return published blocks
      const publishedBlocks = blocks.filter(b => b.status === 'published');
      
      // Transform blocks into a convenient format: { section: { key: content } }
      const content: Record<string, Record<string, string | null>> = {};
      for (const block of publishedBlocks) {
        if (!content[block.section]) {
          content[block.section] = {};
        }
        content[block.section][block.key] = block.content || block.defaultContent || null;
      }
      
      return res.json({ page, content });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get page content" });
    }
  });
  
  // Get all active pages with their content (Public - for frontend)
  app.get("/api/cms/pages", async (req, res) => {
    try {
      const allPages = await storage.getAllContentPages();
      const activePages = allPages.filter(p => p.isActive);
      
      const pagesWithContent: Record<string, {
        page: typeof activePages[0];
        content: Record<string, Record<string, string | null>>;
      }> = {};
      
      for (const page of activePages) {
        const blocks = await storage.getPageContentBlocks(page.id);
        const publishedBlocks = blocks.filter(b => b.status === 'published');
        
        const content: Record<string, Record<string, string | null>> = {};
        for (const block of publishedBlocks) {
          if (!content[block.section]) {
            content[block.section] = {};
          }
          content[block.section][block.key] = block.content || block.defaultContent || null;
        }
        
        pagesWithContent[page.slug] = { page, content };
      }
      
      return res.json({ pages: pagesWithContent });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get pages" });
    }
  });
  
  // ============================================================================
  // CMS - CONTENT MANAGEMENT SYSTEM (ADMIN)
  // ============================================================================
  
  // === Content Pages ===
  
  // Get all content pages (Admin)
  app.get("/api/admin/cms/pages", ensureAdminAsync, requirePermission('view_cms', 'manage_cms'), async (req, res) => {
    try {
      const pages = await storage.getAllContentPages();
      return res.json({ pages });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get content pages" });
    }
  });
  
  // Get content page by ID (Admin)
  app.get("/api/admin/cms/pages/:id", ensureAdminAsync, requirePermission('view_cms', 'manage_cms'), async (req, res) => {
    try {
      const page = await storage.getContentPage(req.params.id);
      if (!page) {
        return res.status(404).json({ message: "Content page not found" });
      }
      const blocks = await storage.getPageContentBlocks(page.id);
      return res.json({ page, blocks });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get content page" });
    }
  });
  
  // Create content page (Admin)
  app.post("/api/admin/cms/pages", ensureAdminAsync, requirePermission('manage_cms'), async (req, res) => {
    try {
      const pageData = insertContentPageSchema.parse(req.body);
      const page = await storage.createContentPage(pageData);
      return res.json({ page });
    } catch (error) {
      return res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create content page" });
    }
  });
  
  // Update content page (Admin)
  app.patch("/api/admin/cms/pages/:id", ensureAdminAsync, requirePermission('manage_cms'), async (req, res) => {
    try {
      const page = await storage.updateContentPage(req.params.id, req.body);
      if (!page) {
        return res.status(404).json({ message: "Content page not found" });
      }
      return res.json({ page });
    } catch (error) {
      return res.status(400).json({ message: "Failed to update content page" });
    }
  });
  
  // Delete content page (Admin)
  app.delete("/api/admin/cms/pages/:id", ensureAdminAsync, requirePermission('manage_cms'), async (req, res) => {
    try {
      await storage.deleteContentPage(req.params.id);
      return res.json({ success: true });
    } catch (error) {
      return res.status(400).json({ message: "Failed to delete content page" });
    }
  });
  
  // === Content Blocks ===
  
  // Get all content blocks (Admin)
  app.get("/api/admin/cms/blocks", ensureAdminAsync, requirePermission('view_cms', 'manage_cms'), async (req, res) => {
    try {
      const blocks = await storage.getAllContentBlocks();
      return res.json({ blocks });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get content blocks" });
    }
  });
  
  // Get content block by ID (Admin)
  app.get("/api/admin/cms/blocks/:id", ensureAdminAsync, requirePermission('view_cms', 'manage_cms'), async (req, res) => {
    try {
      const block = await storage.getContentBlock(req.params.id);
      if (!block) {
        return res.status(404).json({ message: "Content block not found" });
      }
      return res.json({ block });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get content block" });
    }
  });
  
  // Create content block (Admin)
  app.post("/api/admin/cms/blocks", ensureAdminAsync, requirePermission('manage_cms'), async (req, res) => {
    try {
      const blockData = insertContentBlockSchema.parse(req.body);
      const block = await storage.createContentBlock(blockData);
      return res.json({ block });
    } catch (error) {
      return res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create content block" });
    }
  });
  
  // Update content block (Admin)
  app.patch("/api/admin/cms/blocks/:id", ensureAdminAsync, requirePermission('manage_cms'), async (req, res) => {
    try {
      const block = await storage.updateContentBlock(req.params.id, req.body);
      if (!block) {
        return res.status(404).json({ message: "Content block not found" });
      }
      return res.json({ block });
    } catch (error) {
      return res.status(400).json({ message: "Failed to update content block" });
    }
  });
  
  // Delete content block (Admin)
  app.delete("/api/admin/cms/blocks/:id", ensureAdminAsync, requirePermission('manage_cms'), async (req, res) => {
    try {
      await storage.deleteContentBlock(req.params.id);
      return res.json({ success: true });
    } catch (error) {
      return res.status(400).json({ message: "Failed to delete content block" });
    }
  });
  
  // === Templates ===
  
  // Get all templates (Admin)
  app.get("/api/admin/cms/templates", ensureAdminAsync, requirePermission('view_cms', 'manage_cms'), async (req, res) => {
    try {
      const templates = await storage.getAllTemplates();
      return res.json({ templates });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get templates" });
    }
  });
  
  // Get templates by type (Admin)
  app.get("/api/admin/cms/templates/type/:type", ensureAdminAsync, requirePermission('view_cms', 'manage_cms'), async (req, res) => {
    try {
      const templates = await storage.getTemplatesByType(req.params.type);
      return res.json({ templates });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get templates" });
    }
  });
  
  // Get template by ID (Admin)
  app.get("/api/admin/cms/templates/:id", ensureAdminAsync, requirePermission('view_cms', 'manage_cms'), async (req, res) => {
    try {
      const template = await storage.getTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      return res.json({ template });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get template" });
    }
  });
  
  // Create template (Admin)
  app.post("/api/admin/cms/templates", ensureAdminAsync, requirePermission('manage_cms'), async (req, res) => {
    try {
      const templateData = insertTemplateSchema.parse(req.body);
      const template = await storage.createTemplate(templateData);
      return res.json({ template });
    } catch (error) {
      return res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create template" });
    }
  });
  
  // Update template (Admin)
  app.patch("/api/admin/cms/templates/:id", ensureAdminAsync, requirePermission('manage_cms'), async (req, res) => {
    try {
      const template = await storage.updateTemplate(req.params.id, req.body);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      return res.json({ template });
    } catch (error) {
      return res.status(400).json({ message: "Failed to update template" });
    }
  });
  
  // Delete template (Admin)
  app.delete("/api/admin/cms/templates/:id", ensureAdminAsync, requirePermission('manage_cms'), async (req, res) => {
    try {
      await storage.deleteTemplate(req.params.id);
      return res.json({ success: true });
    } catch (error) {
      return res.status(400).json({ message: "Failed to delete template" });
    }
  });
  
  // === CMS Labels ===
  
  // Get all labels
  app.get("/api/admin/cms/labels", ensureAdminAsync, requirePermission('view_cms', 'manage_cms'), async (req, res) => {
    try {
      const labels = await storage.getAllCmsLabels();
      return res.json({ labels });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get labels" });
    }
  });
  
  // Create or update label
  app.post("/api/admin/cms/labels", ensureAdminAsync, requirePermission('manage_cms'), async (req, res) => {
    try {
      const { key, value, category, description } = req.body;
      const label = await storage.upsertCmsLabel({ key, value, category, description, defaultValue: value });
      return res.json({ label });
    } catch (error) {
      return res.status(400).json({ message: "Failed to save label" });
    }
  });
  
  // === CMS Export/Import (Seed) ===
  
  // Export all CMS data to seed file
  app.post("/api/admin/cms/export", ensureAdminAsync, requirePermission('manage_cms'), async (req, res) => {
    try {
      
      throw new Error('CMS seed scripts have been removed');
      const filePath = '';
      
      return res.json({ 
        success: true, 
        message: 'CMS data exported successfully',
        filePath 
      });
    } catch (error) {
      console.error('[CMS Export] Error:', error);
      return res.status(500).json({ message: error instanceof Error ? error.message : "Failed to export CMS data" });
    }
  });
  
  // Get current CMS data as JSON (for download)
  app.get("/api/admin/cms/export/json", ensureAdminAsync, requirePermission('manage_cms'), async (req, res) => {
    try {
      
      throw new Error('CMS seed scripts have been removed');
      const data: any = {};
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="cms-seed-data-${new Date().toISOString().split('T')[0]}.json"`);
      return res.json(data);
    } catch (error) {
      console.error('[CMS Export] Error:', error);
      return res.status(500).json({ message: error instanceof Error ? error.message : "Failed to export CMS data" });
    }
  });
  
  // Import CMS data from seed file
  app.post("/api/admin/cms/import", ensureAdminAsync, requirePermission('manage_cms'), async (req, res) => {
    try {
      
      throw new Error('CMS seed scripts have been removed');
      const result: any = { counts: {} };
      
      return res.json({ 
        success: true, 
        message: 'CMS data imported successfully',
        counts: result.counts
      });
    } catch (error) {
      console.error('[CMS Import] Error:', error);
      return res.status(500).json({ message: error instanceof Error ? error.message : "Failed to import CMS data" });
    }
  });
  
  // Import CMS data from uploaded JSON
  app.post("/api/admin/cms/import/json", ensureAdminAsync, requirePermission('manage_cms'), async (req, res) => {
    try {
      
      throw new Error('CMS seed scripts have been removed');
      const result: any = { counts: {} };
      
      return res.json({ 
        success: true, 
        message: 'CMS data imported successfully',
        counts: result.counts
      });
    } catch (error) {
      console.error('[CMS Import] Error:', error);
      return res.status(500).json({ message: error instanceof Error ? error.message : "Failed to import CMS data" });
    }
  });
  
  // === Media Assets ===
  
  // Get all media assets (Admin)
  app.get("/api/admin/cms/media", ensureAdminAsync, requirePermission('view_cms', 'manage_cms'), async (req, res) => {
    try {
      const assets = await storage.getAllMediaAssets();
      return res.json({ assets });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get media assets" });
    }
  });
  
  // Create media asset (Admin)
  app.post("/api/admin/cms/media", ensureAdminAsync, requirePermission('manage_cms'), async (req, res) => {
    try {
      const assetData = insertMediaAssetSchema.parse(req.body);
      const asset = await storage.createMediaAsset(assetData);
      return res.json({ asset });
    } catch (error) {
      return res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create media asset" });
    }
  });
  
  // Delete media asset (Admin)
  app.delete("/api/admin/cms/media/:id", ensureAdminAsync, requirePermission('manage_cms'), async (req, res) => {
    try {
      await storage.deleteMediaAsset(req.params.id);
      return res.json({ success: true });
    } catch (error) {
      return res.status(400).json({ message: "Failed to delete media asset" });
    }
  });
  
  // === Branding Settings ===
  
  // Get branding settings (Public - for theming)
  app.get("/api/branding", async (req, res) => {
    try {
      const settings = await storage.getOrCreateBrandingSettings();
      return res.json({ settings });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get branding settings" });
    }
  });
  
  // Update branding settings (Admin only)
  app.patch("/api/admin/branding", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      const updates = req.body;
      const settings = await storage.updateBrandingSettings({
        ...updates,
        updatedBy: req.session.userId
      });
      return res.json({ settings });
    } catch (error) {
      return res.status(400).json({ message: error instanceof Error ? error.message : "Failed to update branding settings" });
    }
  });

  // Upload logo file (Admin only)
  app.post("/api/admin/branding/logo", ensureAdminAsync, requirePermission('manage_settings'), upload.single('logo'), async (req: Request, res: Response) => {
    try {
      
      if (!req.file) {
        return res.status(400).json({ message: 'No logo file uploaded' });
      }
      
      let logoUrl: string;
      
      // Upload to R2 if configured, otherwise use local disk
      if (isR2Configured() && req.file.buffer) {
        const r2Key = generateR2Key('branding', `logo-${Date.now()}-${req.file.originalname}`);
        const result = await uploadToR2(r2Key, req.file.buffer, req.file.mimetype);
        logoUrl = result.url;
        console.log(`[R2] Logo uploaded: ${r2Key}`);
      } else {
        // Fallback to local disk storage
        logoUrl = `/uploads/${req.file.filename}`;
      }
      
      return res.json({ 
        url: logoUrl,
        filename: req.file.originalname,
        size: req.file.size
      });
    } catch (error) {
      console.error('Logo upload error:', error);
      return res.status(500).json({ message: 'Failed to upload logo' });
    }
  });
  
  // === Public Content API (for frontend consumption) ===
  
  // Get content by page slug (Public)
  app.get("/api/content/:slug", async (req, res) => {
    try {
      const page = await storage.getContentPageBySlug(req.params.slug);
      if (!page || !page.isActive) {
        return res.status(404).json({ message: "Content not found" });
      }
      const blocks = await storage.getPageContentBlocks(page.id);
      
      // Transform blocks into a structured object by section and key
      const content: Record<string, Record<string, string>> = {};
      for (const block of blocks) {
        if (block.status === 'published') {
          if (!content[block.section]) {
            content[block.section] = {};
          }
          content[block.section][block.key] = block.content || block.defaultContent || '';
        }
      }
      
      return res.json({ page: { slug: page.slug, title: page.title }, content });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get content" });
    }
  });
  
  // Get terms and conditions content (Public - for modals)
  app.get("/api/terms/:type", async (req, res) => {
    try {
      const { type } = req.params;
      const validTypes = ['deposit', 'buy_gold', 'withdrawal', 'transfer'];
      
      if (!validTypes.includes(type)) {
        return res.status(400).json({ message: "Invalid terms type" });
      }
      
      // Check if terms are enabled for this type
      const enabledKey = `${type}_terms_enabled`;
      const enabledConfig = await storage.getPlatformConfig(enabledKey);
      const isEnabled = enabledConfig ? enabledConfig.configValue === 'true' : true;
      
      // Get from platform_config or return default
      const configKey = `${type}_terms`;
      const config = await storage.getPlatformConfig(configKey);
      
      if (config && config.configValue) {
        return res.json({ 
          terms: config.configValue,
          title: config.displayName || `${type.replace('_', ' ')} Terms`,
          enabled: isEnabled
        });
      }
      
      // Return default terms based on type
      const defaultTerms: Record<string, { title: string; terms: string }> = {
        deposit: {
          title: 'Deposit Terms & Conditions',
          terms: 'By proceeding with this deposit, you agree to the following terms:\n\n1. Gold price shown is tentative and subject to change upon fund verification.\n2. Deposits will be processed within 1-3 business days after verification.\n3. The final gold amount credited will be calculated at the confirmed rate at time of receipt.\n4. All deposits are subject to anti-money laundering (AML) verification.\n5. You confirm that the funds are from a legitimate source.'
        },
        buy_gold: {
          title: 'Gold Purchase Terms & Conditions',
          terms: 'By purchasing gold through Finatrades, you agree to the following:\n\n1. Gold prices are based on real-time market rates plus applicable spread.\n2. Once a purchase is confirmed, it cannot be cancelled or reversed.\n3. Purchased gold will be credited to your wallet within 24 hours.\n4. All purchases are subject to platform transaction limits.\n5. You understand that gold values may fluctuate after purchase.'
        },
        withdrawal: {
          title: 'Withdrawal Terms & Conditions',
          terms: 'By proceeding with this withdrawal, you agree to the following:\n\n1. Withdrawals are subject to verification and may take 1-5 business days.\n2. Withdrawal fees will be deducted from the amount.\n3. You confirm the receiving account details are correct.\n4. Finatrades is not responsible for incorrect account details provided.'
        },
        transfer: {
          title: 'Transfer Terms & Conditions',
          terms: 'By proceeding with this transfer, you agree to:\n\n1. Transfers are instant and cannot be reversed once completed.\n2. You confirm the recipient details are correct.\n3. Transfer limits apply based on your verification level.'
        }
      };
      
      const defaults = defaultTerms[type] || { title: 'Terms & Conditions', terms: 'Please review the terms and conditions before proceeding.' };
      return res.json({ ...defaults, enabled: isEnabled });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get terms" });
    }
  });
  
  // Get template by slug (Public - for rendering)
  app.get("/api/templates/:slug", async (req, res) => {
    try {
      const template = await storage.getTemplateBySlug(req.params.slug);
      if (!template || template.status !== 'published') {
        return res.status(404).json({ message: "Template not found" });
      }
      return res.json({ template: { slug: template.slug, name: template.name, body: template.body, variables: template.variables } });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get template" });
    }
  });

  // ============================================================================
  // FINAPAY - PEER TRANSFERS (SEND/REQUEST MONEY)
  // ============================================================================

  // Search user by email or Finatrades ID - PROTECTED: requires authentication
  app.post("/api/admin/users/:userId/freeze", ensureAdminAsync, requirePermission('manage_users'), async (req, res) => {
    try {
      const { userId } = req.params;
      const { freeze, reason } = req.body;
      const adminUser = req.adminUser!;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check if account status exists
      const [existing] = await db.select().from(userAccountStatus).where(eq(userAccountStatus.userId, userId));
      
      if (existing) {
        await db.update(userAccountStatus).set({
          isFrozen: freeze,
          frozenAt: freeze ? new Date() : null,
          frozenBy: freeze ? adminUser.id : null,
          frozenReason: freeze ? reason : null,
          updatedAt: new Date(),
        }).where(eq(userAccountStatus.userId, userId));
      } else {
        await db.insert(userAccountStatus).values({
          id: crypto.randomUUID(),
          userId,
          isFrozen: freeze,
          frozenAt: freeze ? new Date() : null,
          frozenBy: freeze ? adminUser.id : null,
          frozenReason: freeze ? reason : null,
        });
      }
      
      await storage.createAuditLog({
        entityType: "user_account",
        entityId: userId,
        actionType: freeze ? "freeze" : "unfreeze",
        actor: adminUser.id,
        actorRole: "admin",
        details: freeze ? `Account frozen: ${reason}` : "Account unfrozen",
      });
      


      return res.json({ 
        success: true,
        message: freeze ? "Account frozen successfully" : "Account unfrozen successfully"
      });
    } catch (error) {
      console.error('[Account Freeze] Error:', error);
      return res.status(400).json({ message: "Failed to update account status" });
    }
  });

  // Admin: Get user account status
  app.get("/api/admin/users/:userId/account-status", ensureAdminAsync, requirePermission('view_users', 'manage_users'), async (req, res) => {
    try {
      const { userId } = req.params;
      const [status] = await db.select().from(userAccountStatus).where(eq(userAccountStatus.userId, userId));
      


      return res.json({ 
        status: status || { 
          userId, 
          isFrozen: false, 
          dailyTransferLimitUsd: '10000', 
          monthlyTransferLimitUsd: '100000' 
        } 
      });
    } catch (error) {
      return res.status(400).json({ message: "Failed to get account status" });
    }
  });

  // Admin: Update user transfer limits
  app.post("/api/admin/users/:userId/transfer-limits", ensureAdminAsync, requirePermission('manage_users'), async (req, res) => {
    try {
      const { userId } = req.params;
      const { dailyLimit, monthlyLimit } = req.body;
      const adminUser = req.adminUser!;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const [existing] = await db.select().from(userAccountStatus).where(eq(userAccountStatus.userId, userId));
      
      if (existing) {
        await db.update(userAccountStatus).set({
          dailyTransferLimitUsd: dailyLimit.toString(),
          monthlyTransferLimitUsd: monthlyLimit.toString(),
          updatedAt: new Date(),
        }).where(eq(userAccountStatus.userId, userId));
      } else {
        await db.insert(userAccountStatus).values({
          id: crypto.randomUUID(),
          userId,
          dailyTransferLimitUsd: dailyLimit.toString(),
          monthlyTransferLimitUsd: monthlyLimit.toString(),
        });
      }
      
      await storage.createAuditLog({
        entityType: "user_account",
        entityId: userId,
        actionType: "update_limits",
        actor: adminUser.id,
        actorRole: "admin",
        details: `Updated transfer limits: Daily $${dailyLimit}, Monthly $${monthlyLimit}`,
      });
      


      return res.json({ success: true, message: "Transfer limits updated" });
    } catch (error) {
      return res.status(400).json({ message: "Failed to update limits" });
    }
  });


  // ============================================================================
  // ADMIN - FINANCIAL REPORTS
  // ============================================================================

  // Financial Overview - total revenue, AUM, liabilities, net position
  // GOLD-FIRST ARCHITECTURE: All balances are gold grams, USD computed dynamically
  app.get("/api/admin/financial/finabridge", ensureAdminAsync, requirePermission('view_reports', 'view_finabridge'), async (req, res) => {
    try {
      const GOLD_PRICE_USD = 93.50;
      const tradeCases = await storage.getAllTradeCases();
      const allUsers = await storage.getAllUsers();
      const userMap = new Map(allUsers.map(u => [u.id, u.companyName || `${u.firstName} ${u.lastName}`]));
      
      let activeCases = 0;
      let goldInEscrow = 0;
      let pendingSettlements = 0;
      let completedTrades = 0;
      let tradeVolumeUsd = 0;
      
      const casesData = tradeCases.map((tcAny: any) => {
        const tc = tcAny;
        const goldGrams = parseFloat(tc.goldAmountGrams || '0');
        
        if (tc.status === 'Active') {
          activeCases++;
          goldInEscrow += goldGrams;
        }
        if (tc.status === 'Pending') pendingSettlements++;
        if (tc.status === 'Completed') {
          completedTrades++;
          tradeVolumeUsd += goldGrams * GOLD_PRICE_USD;
        }
        
        return {
          id: tc.id,
          caseNumber: tc.caseNumber || `FB-${tc.id.slice(0,8).toUpperCase()}`,
          counterparty: tc.counterpartyName || 'N/A',
          goldGrams,
          status: tc.status,
          settlementDate: tc.settlementDate,
          companyName: userMap.get(tc.userId) || 'Unknown'
        };
      });
      


        return res.json({
        activeCases,
        totalCases: tradeCases.length,
        goldInEscrow,
        pendingSettlements,
        completedTrades,
        tradeVolumeUsd,
        cases: casesData
      });
    } catch (error) {
      console.error("Failed to get FinaBridge data:", error);
      return res.status(400).json({ message: "Failed to get FinaBridge data" });
    }
  });

  // Fees Summary - Platform revenue from fees
  app.get("/api/admin/payment-gateways", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      const settings = await db.select().from(paymentGatewaySettings).limit(1);
      return res.json(settings[0] || null);
    } catch (error) {
      console.error("Failed to get payment gateway settings:", error);
      return res.status(400).json({ message: "Failed to get payment gateway settings" });
    }
  });

  // Update payment gateway settings (Admin)
  app.put("/api/admin/payment-gateways", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      console.log("[PaymentGateway] Updating settings:", JSON.stringify(req.body, null, 2));
      const settings = await db.select().from(paymentGatewaySettings).limit(1);
      
      if (settings.length === 0) {
        // Create new settings
        const newSettings = await db.insert(paymentGatewaySettings).values({
          id: 'default',
          ...req.body,
          updatedAt: new Date()
        }).returning();
        console.log("[PaymentGateway] Created new settings");
        return res.json(newSettings[0]);
      } else {
        // Update existing settings
        const updatedSettings = await db.update(paymentGatewaySettings)
          .set({ ...req.body, updatedAt: new Date() })
          .where(eq(paymentGatewaySettings.id, settings[0].id))
          .returning();
        console.log("[PaymentGateway] Updated settings");
        return res.json(updatedSettings[0]);
      }
    } catch (error) {
      console.error("Failed to update payment gateway settings:", error);
      return res.status(400).json({ message: "Failed to update payment gateway settings", error: String(error) });
    }
  });

  // Get enabled payment methods (Public - for frontend)
  app.get("/api/payment-methods", async (req, res) => {
    try {
      const settings = await db.select().from(paymentGatewaySettings).limit(1);
      
      if (!settings[0]) {


        return res.json({
          
          
          bankTransfer: { enabled: false },
          binancePay: { enabled: false },
          minDeposit: 10,
          maxDeposit: 100000
        });
      }

      const s = settings[0];


        return res.json({
        bankTransfer: { 
          enabled: s.bankTransferEnabled,
          accounts: s.bankTransferEnabled ? s.bankAccounts : [],
          instructions: s.bankTransferEnabled ? s.bankInstructions : null
        },
        binancePay: { enabled: s.binancePayEnabled },
        minDeposit: parseFloat(s.minDepositUsd || '10'),
        maxDeposit: parseFloat(s.maxDepositUsd || '100000')
      });
    } catch (error) {
      console.error("Failed to get payment methods:", error);
      return res.status(400).json({ message: "Failed to get payment methods" });
    }
  });

  // ============================================================================
  // SECURITY SETTINGS & OTP VERIFICATION
  // ============================================================================

  // Get security settings (admin only with header-based auth)
  app.get("/api/admin/security-settings", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      const settings = await storage.getOrCreateSecuritySettings();
      return res.json(settings);
    } catch (error) {
      console.error("Failed to get security settings:", error);
      return res.status(400).json({ message: "Failed to get security settings" });
    }
  });

  // Update security settings (admin only with header-based auth)
  app.patch("/api/admin/security-settings", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      const updates = req.body;
      const adminUser = req.adminUser!;
      
      // Validate updates using partial schema
      const validatedUpdates = insertSecuritySettingsSchema.partial().parse(updates);
      
      const settings = await storage.updateSecuritySettings({
        ...validatedUpdates,
        updatedBy: adminUser.id
      });
      
      if (!settings) {
        return res.status(404).json({ message: "Security settings not found" });
      }
      
      // Create audit log
      await storage.createAuditLog({
        entityType: "security_settings",
        entityId: settings.id,
        actionType: "update",
        actor: adminUser.id,
        actorRole: "admin",
        details: `Security settings updated: ${Object.keys(validatedUpdates).join(", ")}`,
      });
      
      return res.json(settings);
    } catch (error) {
      console.error("Failed to update security settings:", error);
      return res.status(400).json({ message: error instanceof Error ? error.message : "Failed to update security settings" });
    }
  });

  // ============================================================================
  // TRANSACTION PIN
  // ============================================================================

  // Check if user has a transaction PIN set up
  app.get("/api/transaction-pin/status/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const pin = await storage.getTransactionPin(userId);
      
      if (!pin) {
        return res.json({ hasPin: false, isLocked: false });
      }
      
      const isLocked = pin.lockedUntil ? new Date(pin.lockedUntil) > new Date() : false;


      return res.json({ 
        hasPin: true, 
        isLocked,
        lockedUntil: isLocked ? pin.lockedUntil : null,
        failedAttempts: pin.failedAttempts
      });
    } catch (error) {
      console.error("Failed to get transaction PIN status:", error);
      return res.status(400).json({ message: "Failed to get PIN status" });
    }
  });

  // Set up a new transaction PIN
  app.post("/api/transaction-pin/setup", async (req, res) => {
    try {
      const { userId, pin, password } = req.body;
      
      if (!userId || !pin || !password) {
        return res.status(400).json({ message: "User ID, PIN, and password are required" });
      }
      
      // Validate PIN format (6 digits)
      if (!/^\d{6}$/.test(pin)) {
        return res.status(400).json({ message: "PIN must be exactly 6 digits" });
      }
      
      // Verify user's password
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Incorrect password" });
      }
      
      // Check if user already has a PIN
      const existingPin = await storage.getTransactionPin(userId);
      if (existingPin) {
        return res.status(400).json({ message: "Transaction PIN already exists. Use reset to change it." });
      }
      
      // Hash the PIN
      const hashedPin = await bcrypt.hash(pin, 12);
      
      // Create the transaction PIN
      const newPin = await storage.createTransactionPin({
        userId,
        hashedPin,
        failedAttempts: 0
      });
      
      // Create audit log
      await storage.createAuditLog({
        entityType: "transaction_pin",
        entityId: newPin.id,
        actionType: "create",
        actor: userId,
        actorRole: "user",
        details: "Transaction PIN created"
      });
      


      return res.json({ success: true, message: "Transaction PIN set up successfully" });
    } catch (error) {
      console.error("Failed to set up transaction PIN:", error);
      return res.status(400).json({ message: "Failed to set up transaction PIN" });
    }
  });

  // Verify transaction PIN and get a verification token
  app.post("/api/transaction-pin/verify", async (req, res) => {
    try {
      const { userId, pin, action } = req.body;
      
      if (!userId || !pin || !action) {
        return res.status(400).json({ message: "User ID, PIN, and action are required" });
      }
      
      const transactionPin = await storage.getTransactionPin(userId);
      if (!transactionPin) {
        return res.status(404).json({ message: "Transaction PIN not set up" });
      }
      
      // Check if locked
      if (transactionPin.lockedUntil && new Date(transactionPin.lockedUntil) > new Date()) {
        const remainingMinutes = Math.ceil((new Date(transactionPin.lockedUntil).getTime() - Date.now()) / 60000);
        return res.status(423).json({ 
          message: `PIN is locked. Try again in ${remainingMinutes} minutes.`,
          lockedUntil: transactionPin.lockedUntil
        });
      }
      
      // Verify PIN
      const isValid = await bcrypt.compare(pin, transactionPin.hashedPin);
      
      if (!isValid) {
        const newFailedAttempts = (transactionPin.failedAttempts || 0) + 1;
        
        // Lock after 5 failed attempts for 30 minutes
        let lockedUntil = null;
        if (newFailedAttempts >= 5) {
          lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
        }
        
        await storage.updateTransactionPin(userId, {
          failedAttempts: newFailedAttempts,
          lockedUntil
        });
        
        const remainingAttempts = Math.max(0, 5 - newFailedAttempts);
        
        if (lockedUntil) {
          return res.status(423).json({ 
            message: "Too many failed attempts. PIN locked for 30 minutes.",
            lockedUntil
          });
        }
        
        return res.status(401).json({ 
          message: `Incorrect PIN. ${remainingAttempts} attempts remaining.`,
          remainingAttempts
        });
      }
      
      // Reset failed attempts on success
      await storage.updateTransactionPin(userId, {
        failedAttempts: 0,
        lockedUntil: null,
        lastUsedAt: new Date()
      });
      
      // Generate a verification token (valid for 5 minutes)
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      
      await storage.createPinVerificationToken({
        userId,
        token,
        action,
        expiresAt
      });
      


      return res.json({ 
        success: true, 
        token,
        expiresAt,
        message: "PIN verified successfully"
      });
    } catch (error) {
      console.error("Failed to verify transaction PIN:", error);
      return res.status(400).json({ message: "Failed to verify transaction PIN" });
    }
  });

  // Reset transaction PIN (requires password and optionally MFA)
  app.post("/api/transaction-pin/reset", async (req, res) => {
    try {
      const { userId, newPin, password } = req.body;
      
      if (!userId || !newPin || !password) {
        return res.status(400).json({ message: "User ID, new PIN, and password are required" });
      }
      
      // Validate PIN format
      if (!/^\d{6}$/.test(newPin)) {
        return res.status(400).json({ message: "PIN must be exactly 6 digits" });
      }
      
      // Verify user's password
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Incorrect password" });
      }
      
      // Hash the new PIN
      const hashedPin = await bcrypt.hash(newPin, 12);
      
      // Check if user has an existing PIN
      const existingPin = await storage.getTransactionPin(userId);
      
      if (existingPin) {
        // Update existing PIN
        await storage.updateTransactionPin(userId, {
          hashedPin,
          failedAttempts: 0,
          lockedUntil: null
        });
      } else {
        // Create new PIN
        await storage.createTransactionPin({
          userId,
          hashedPin,
          failedAttempts: 0
        });
      }
      
      // Create audit log
      await storage.createAuditLog({
        entityType: "transaction_pin",
        entityId: userId,
        actionType: "update",
        actor: userId,
        actorRole: "user",
        details: existingPin ? "Transaction PIN reset" : "Transaction PIN created"
      });
      


      return res.json({ success: true, message: "Transaction PIN has been reset successfully" });
    } catch (error) {
      console.error("Failed to reset transaction PIN:", error);
      return res.status(400).json({ message: "Failed to reset transaction PIN" });
    }
  });

  // Validate PIN verification token (used by other endpoints to check token validity)
  app.post("/api/transaction-pin/validate-token", async (req, res) => {
    try {
      const { token, action } = req.body;
      
      if (!token || !action) {
        return res.status(400).json({ valid: false, message: "Token and action are required" });
      }
      
      const pinToken = await storage.getPinVerificationToken(token);
      
      if (!pinToken) {
        return res.json({ valid: false, message: "Invalid or expired token" });
      }
      
      if (new Date(pinToken.expiresAt) < new Date()) {
        return res.json({ valid: false, message: "Token has expired" });
      }
      
      if (pinToken.action !== action) {
        return res.json({ valid: false, message: "Token action mismatch" });
      }
      


      return res.json({ valid: true, userId: pinToken.userId });
    } catch (error) {
      console.error("Failed to validate PIN token:", error);
      return res.status(400).json({ valid: false, message: "Failed to validate token" });
    }
  });

  // Use (consume) PIN verification token
  app.post("/api/transaction-pin/use-token", async (req, res) => {
    try {
      const { token, action } = req.body;
      
      if (!token || !action) {
        return res.status(400).json({ success: false, message: "Token and action are required" });
      }
      
      const pinToken = await storage.getPinVerificationToken(token);
      
      if (!pinToken) {
        return res.status(400).json({ success: false, message: "Invalid or expired token" });
      }
      
      if (new Date(pinToken.expiresAt) < new Date()) {
        return res.status(400).json({ success: false, message: "Token has expired" });
      }
      
      if (pinToken.action !== action) {
        return res.status(400).json({ success: false, message: "Token action mismatch" });
      }
      
      // Mark token as used
      await storage.usePinVerificationToken(token);
      


      return res.json({ success: true, userId: pinToken.userId });
    } catch (error) {
      console.error("Failed to use PIN token:", error);
      return res.status(400).json({ success: false, message: "Failed to use token" });
    }
  });

  // Admin: Unlock a user's transaction PIN
  app.post("/api/admin/transaction-pin/unlock/:userId", ensureAdminAsync, requirePermission('manage_users'), async (req, res) => {
    try {
      const { userId } = req.params;
      const adminUser = req.adminUser!;
      
      const pin = await storage.getTransactionPin(userId);
      if (!pin) {
        return res.status(404).json({ message: "User does not have a transaction PIN" });
      }
      
      await storage.updateTransactionPin(userId, {
        failedAttempts: 0,
        lockedUntil: null
      });
      
      // Create audit log
      await storage.createAuditLog({
        entityType: "transaction_pin",
        entityId: userId,
        actionType: "update",
        actor: adminUser.id,
        actorRole: "admin",
        details: "Transaction PIN unlocked by admin"
      });
      


      return res.json({ success: true, message: "Transaction PIN unlocked successfully" });
    } catch (error) {
      console.error("Failed to unlock transaction PIN:", error);
      return res.status(400).json({ message: "Failed to unlock transaction PIN" });
    }
  });

  // ============================================================================
  // COMPLIANCE SETTINGS (KYC Mode Toggle)
  // ============================================================================

  // Get compliance settings (admin only)
  app.get("/api/admin/compliance-settings", ensureAdminAsync, requirePermission('manage_settings', 'manage_kyc'), async (req, res) => {
    try {
      const settings = await storage.getOrCreateComplianceSettings();
      return res.json(settings);
    } catch (error) {
      console.error("Failed to get compliance settings:", error);
      return res.status(400).json({ message: "Failed to get compliance settings" });
    }
  });

  // Update compliance settings (admin only)
  app.patch("/api/admin/compliance-settings", ensureAdminAsync, requirePermission('manage_settings', 'manage_kyc'), async (req, res) => {
    try {
      const updates = req.body;
      const adminUser = req.adminUser!;
      
      const settings = await storage.updateComplianceSettings({
        ...updates,
        updatedBy: adminUser.id
      });
      
      if (!settings) {
        return res.status(404).json({ message: "Compliance settings not found" });
      }
      
      await storage.createAuditLog({
        entityType: "compliance_settings",
        entityId: settings.id,
        actionType: "update",
        actor: adminUser.id,
        actorRole: "admin",
        details: `KYC mode changed to: ${settings.activeKycMode}`,
      });
      
      return res.json(settings);
    } catch (error) {
      console.error("Failed to update compliance settings:", error);
      return res.status(400).json({ message: error instanceof Error ? error.message : "Failed to update compliance settings" });
    }
  });

  // Get active KYC mode (public endpoint for frontend to know which KYC flow to show)
  app.get("/api/kyc-mode", async (req, res) => {
    try {
      const settings = await storage.getOrCreateComplianceSettings();


      return res.json({ 
        activeKycMode: settings.activeKycMode,
        finatradesPersonalConfig: settings.finatradesPersonalConfig,
        finanatradesCorporateConfig: settings.finanatradesCorporateConfig,
        blockedCountries: settings.blockedCountries || []
      });
    } catch (error) {
      console.error("Failed to get KYC mode:", error);
      return res.status(400).json({ message: "Failed to get KYC mode" });
    }
  });

  // Submit Finatrades Personal KYC (personal info + documents + liveness)
  // SECURITY: userId is derived from session (never trusted from body).
  // Personal KYC is only valid for individual importers; exporters/government must use corporate.
  app.post("/api/finatrades-kyc/personal", ensureAuthenticated, async (req, res) => {
    try {
      const sessionUserId = req.session?.userId;
      if (!sessionUserId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      console.log(`[KYC] Personal KYC submission received from user ${sessionUserId}, body size: ${JSON.stringify(req.body || {}).length} bytes`);
      const { personalInformation, documents, livenessCapture, livenessVerified, passportExpiryDate, isResubmit, lockedSections } = req.body;
      const userId = sessionUserId;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      if (user.role !== 'admin') {
        const ut = (user as any).userType as 'exporter' | 'importer' | 'government' | null | undefined;
        if (ut && ut !== 'importer') {
          return res.status(403).json({
            message: "Personal KYC is only available for individual importers. Use Corporate KYC.",
            actualUserType: ut,
          });
        }
      }
      
      const existing = await storage.getFinatradesPersonalKyc(userId);
      const locked: string[] = Array.isArray(lockedSections) ? lockedSections : [];
      const docsLocked = isResubmit && locked.includes('documents');
      const livenessLocked = isResubmit && locked.includes('liveness');
      
      // Flatten the nested objects into individual fields
      // For locked sections in resubmit mode, preserve existing values
      const kycData = {
        userId,
        // Personal Information
        fullName: personalInformation?.fullName,
        email: personalInformation?.email,
        phone: personalInformation?.phone,
        dateOfBirth: personalInformation?.dateOfBirth,
        nationality: personalInformation?.nationality,
        country: personalInformation?.country,
        city: personalInformation?.city,
        address: personalInformation?.address,
        postalCode: personalInformation?.postalCode,
        occupation: personalInformation?.occupation,
        sourceOfFunds: personalInformation?.sourceOfFunds,
        accountType: personalInformation?.accountType,
        // Documents — preserve existing URLs when section is locked
        idFrontUrl: docsLocked ? (existing?.idFrontUrl ?? undefined) : (documents?.idFront?.url ?? undefined),
        idBackUrl: docsLocked ? (existing?.idBackUrl ?? undefined) : (documents?.idBack?.url ?? undefined),
        passportUrl: docsLocked ? (existing?.passportUrl ?? undefined) : (documents?.passport?.url ?? undefined),
        addressProofUrl: docsLocked ? (existing?.addressProofUrl ?? undefined) : (documents?.addressProof?.url ?? undefined),
        // Document Expiry
        passportExpiryDate: passportExpiryDate || null,
        // Liveness — preserve existing when section is locked
        livenessCapture: livenessLocked ? (existing?.livenessCapture ?? undefined) : (livenessCapture ?? undefined),
        livenessVerified: livenessLocked ? (existing?.livenessVerified ?? false) : !!livenessVerified,
        livenessVerifiedAt: livenessLocked ? (existing?.livenessVerifiedAt ?? null) : (livenessVerified ? new Date() : null),
        status: 'In Progress' as const,
      };
      
      if (existing) {
        const updated = await storage.updateFinatradesPersonalKyc(existing.id, { ...kycData, status: 'Pending Review' });
        await storage.updateUser(userId, { kycStatus: 'Pending Review' });

        let nextVersion = 1;
        try {
          const versions = await storage.getKycVersions(existing.id);
          nextVersion = versions.length > 0 ? versions[0].versionNumber + 1 : 1;
          await storage.createKycVersion({
            submissionId: existing.id,
            userId,
            kycType: 'finatrades_personal',
            versionNumber: nextVersion,
            snapshot: kycData as Record<string, any>,
            status: 'submitted',
            submittedAt: new Date(),
          });
        } catch (versionError) {
          console.warn('[KYC] Could not create version record (table may not exist yet):', versionError instanceof Error ? versionError.message : versionError);
        }
        
        notifyAllAdmins({
          title: nextVersion > 1 ? 'KYC Resubmission' : 'KYC Updated',
          message: `${user.firstName} ${user.lastName} ${nextVersion > 1 ? 'resubmitted' : 'updated'} their personal KYC (v${nextVersion})`,
          type: 'info',
          link: '/admin/kyc',
        });

        const baseUrl = `${req.protocol}://${req.get('host')}`;
        sendEmail(user.email, EMAIL_TEMPLATES.KYC_PENDING_REVIEW, {
          user_name: user.firstName || personalInformation?.fullName || 'Valued Customer',
          kyc_type: 'Personal',
          processing_time: '24 hours',
          dashboard_url: `${baseUrl}/dashboard`,
        }).catch(err => console.error('[KYC] Failed to send submission confirmation email:', err));

        // Delete server-side draft now that submission is complete
        storage.deleteKycDraft(userId, 'personal').catch(() => null);

        const refUpdated = `FT-KYC-${updated!.id.replace(/-/g, '').substring(0, 8).toUpperCase()}`;
        const slaUpdated = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString();
        return res.json({ success: true, submission: updated, referenceNumber: refUpdated, slaDeadline: slaUpdated });

        // Async OCR mismatch check (fire-and-forget, does not block response)
        const docUrlForOcr = kycData.passportUrl || kycData.idFrontUrl;
        if (docUrlForOcr && kycData.fullName) {
          // Capture prior OCR state before async to allow additive risk scoring.
          // Note: this is a best-effort read-modify-write; concurrent writes to riskScore are unlikely
          // in practice (OCR is the only writer post-submit), but a future dedicated ocr_risk_score column
          // would fully eliminate any race.
          const priorOcrFlag = updated?.ocrMismatchFlag as { nameMismatch?: boolean; dobMismatch?: boolean } | null;
          const priorOcrDelta = (priorOcrFlag?.nameMismatch || priorOcrFlag?.dobMismatch) ? 10 : 0;
          const priorRiskScore: number = updated?.riskScore ?? 0;
          checkKycOcrMismatch(docUrlForOcr, kycData.fullName, kycData.dateOfBirth || '')
            .then(async (ocrResult: KycOcrResult) => {
              const mismatch = ocrResult.nameMismatch || ocrResult.dobMismatch;
              const newOcrDelta = mismatch ? 10 : 0;
              // Additive idempotent: remove prior OCR contribution, add new OCR contribution
              const newRiskScore = Math.max(0, priorRiskScore - priorOcrDelta) + newOcrDelta;
              await storage.updateFinatradesPersonalKyc(updated!.id, {
                ocrMismatchFlag: ocrResult,
                riskScore: newRiskScore,
              });
              if (mismatch) console.log(`[KYC OCR] Mismatch detected for ${userId}: name=${ocrResult.nameMismatch}, dob=${ocrResult.dobMismatch}`);
            })
            .catch(() => null);
        }
      } else {
        const submission = await storage.createFinatradesPersonalKyc(kycData);
        await storage.updateUser(userId, { kycStatus: 'Pending Review' });

        try {
          await storage.createKycVersion({
            submissionId: submission.id,
            userId,
            kycType: 'finatrades_personal',
            versionNumber: 1,
            snapshot: kycData as Record<string, any>,
            status: 'submitted',
            submittedAt: new Date(),
          });
        } catch (versionError) {
          console.warn('[KYC] Could not create version record (table may not exist yet):', versionError instanceof Error ? versionError.message : versionError);
        }
        
        notifyAllAdmins({
          title: 'New KYC Submission',
          message: `${user.firstName} ${user.lastName} submitted personal KYC documents for review`,
          type: 'info',
          link: '/admin/kyc',
        });

        const baseUrl = `${req.protocol}://${req.get('host')}`;
        sendEmail(user.email, EMAIL_TEMPLATES.KYC_PENDING_REVIEW, {
          user_name: user.firstName || personalInformation?.fullName || 'Valued Customer',
          kyc_type: 'Personal',
          processing_time: '24 hours',
          dashboard_url: `${baseUrl}/dashboard`,
        }).catch(err => console.error('[KYC] Failed to send submission confirmation email:', err));

        // Delete server-side draft now that submission is complete
        storage.deleteKycDraft(userId, 'personal').catch(() => null);

        const refNew = `FT-KYC-${submission.id.replace(/-/g, '').substring(0, 8).toUpperCase()}`;
        const slaNew = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString();
        return res.json({ success: true, submission, referenceNumber: refNew, slaDeadline: slaNew });

        // Async OCR mismatch check (fire-and-forget, does not block response)
        const docUrlForOcr2 = kycData.passportUrl || kycData.idFrontUrl;
        if (docUrlForOcr2 && kycData.fullName) {
          checkKycOcrMismatch(docUrlForOcr2, kycData.fullName, kycData.dateOfBirth || '')
            .then(async (ocrResult: KycOcrResult) => {
              const mismatch = ocrResult.nameMismatch || ocrResult.dobMismatch;
              // New submission: no prior OCR delta, so additive = just the new delta
              await storage.updateFinatradesPersonalKyc(submission.id, {
                ocrMismatchFlag: ocrResult,
                riskScore: mismatch ? 10 : 0,
              });
              if (mismatch) console.log(`[KYC OCR] Mismatch detected for ${userId}: name=${ocrResult.nameMismatch}, dob=${ocrResult.dobMismatch}`);
            })
            .catch(() => null);
        }
      }
    } catch (error) {
      console.error("Failed to submit Finatrades personal KYC:", error);
      notifyError({ error: error instanceof Error ? error : new Error(String(error)), context: 'Personal KYC Submission Failed', route: 'POST /api/finatrades-kyc/personal', userId: req.session?.userId || undefined });
      return res.status(400).json({ message: error instanceof Error ? error.message : "Failed to submit KYC" });
    }
  });

  app.get("/api/finatrades-kyc/personal/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const submission = await storage.getFinatradesPersonalKyc(userId);
      const referenceNumber = submission?.id ? `FT-KYC-${submission.id.replace(/-/g, '').substring(0, 8).toUpperCase()}` : null;
      const slaDeadline = submission?.updatedAt ? new Date(new Date(submission.updatedAt).getTime() + 1 * 24 * 60 * 60 * 1000).toISOString() : null;
      return res.json({ submission, referenceNumber, slaDeadline });
    } catch (error) {
      console.error("Failed to get Finatrades personal KYC:", error);
      return res.status(400).json({ message: "Failed to get KYC status" });
    }
  });

  // Submit Finatrades Corporate KYC (questionnaire)
  // SECURITY: userId is derived from session (never trusted from body).
  // Corporate KYC is required for exporters, business importers, and government.
  app.post("/api/finatrades-kyc/corporate", ensureAuthenticated, async (req, res) => {
    try {
      const sessionUserId = req.session?.userId;
      if (!sessionUserId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      console.log(`[KYC] Corporate KYC submission received from user ${sessionUserId}, body size: ${JSON.stringify(req.body || {}).length} bytes`);
      const {
        representativeLiveness,
        companyName,
        registrationNumber,
        incorporationDate,
        countryOfIncorporation,
        companyType,
        corporateRole,
        natureOfBusiness,
        numberOfEmployees,
        headOfficeAddress,
        telephoneNumber,
        website,
        emailAddress,
        tradingContactName,
        tradingContactEmail,
        tradingContactPhone,
        financeContactName,
        financeContactEmail,
        financeContactPhone,
        beneficialOwners,
        shareholderCompanyUbos,
        hasPepOwners,
        pepDetails,
        documents,
        tradeLicenseExpiryDate,
        directorPassportExpiryDate,
        isResubmit,
        lockedSections,
        status
      } = req.body;
      const userId = sessionUserId;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      if (user.role !== 'admin') {
        const ut = (user as any).userType as 'exporter' | 'importer' | 'government' | null | undefined;
        if (ut && !['exporter', 'importer', 'government'].includes(ut)) {
          return res.status(403).json({
            message: "Corporate KYC is not available for this account type.",
            actualUserType: ut,
          });
        }
      }

      const existing = await storage.getFinatradesCorporateKyc(userId);
      const locked: string[] = Array.isArray(lockedSections) ? lockedSections : [];
      const livenessLocked = isResubmit && locked.includes('representative_liveness');
      
      const kycData = {
        companyName,
        registrationNumber,
        incorporationDate,
        countryOfIncorporation,
        companyType,
        corporateRole,
        natureOfBusiness,
        numberOfEmployees,
        headOfficeAddress,
        telephoneNumber,
        website,
        emailAddress,
        tradingContactName,
        tradingContactEmail,
        tradingContactPhone,
        financeContactName,
        financeContactEmail,
        financeContactPhone,
        beneficialOwners,
        shareholderCompanyUbos,
        hasPepOwners,
        pepDetails,
        documents,
        tradeLicenseExpiryDate: tradeLicenseExpiryDate || null,
        directorPassportExpiryDate: directorPassportExpiryDate || null,
        livenessCapture: livenessLocked ? (existing?.livenessCapture ?? undefined) : (representativeLiveness ?? undefined),
        livenessVerified: livenessLocked ? (existing?.livenessVerified ?? false) : !!representativeLiveness,
        livenessVerifiedAt: livenessLocked ? (existing?.livenessVerifiedAt ?? null) : (representativeLiveness ? new Date() : null),
        status: status || 'In Progress',
      };
      
      if (existing) {
        const updated = await storage.updateFinatradesCorporateKyc(existing.id, { ...kycData, status: 'Pending Review' });
        await storage.updateUser(userId, { kycStatus: 'Pending Review', accountType: 'business' });

        let nextVersion = 1;
        try {
          const versions = await storage.getKycVersions(existing.id);
          nextVersion = versions.length > 0 ? versions[0].versionNumber + 1 : 1;
          await storage.createKycVersion({
            submissionId: existing.id,
            userId,
            kycType: 'finatrades_corporate',
            versionNumber: nextVersion,
            snapshot: kycData as Record<string, any>,
            status: 'submitted',
            submittedAt: new Date(),
          });
        } catch (versionError) {
          console.warn('[KYC] Could not create version record (table may not exist yet):', versionError instanceof Error ? versionError.message : versionError);
        }

        notifyAllAdmins({
          title: nextVersion > 1 ? 'Corporate KYC Resubmission' : 'Corporate KYC Updated',
          message: `${companyName || user.firstName} ${nextVersion > 1 ? 'resubmitted' : 'updated'} their corporate KYC (v${nextVersion})`,
          type: 'info',
          link: '/admin/kyc',
        });

        const baseUrl = `${req.protocol}://${req.get('host')}`;
        sendEmail(user.email, EMAIL_TEMPLATES.KYC_PENDING_REVIEW, {
          user_name: companyName || user.firstName || 'Valued Customer',
          kyc_type: 'Corporate',
          processing_time: '5 business days',
          dashboard_url: `${baseUrl}/dashboard`,
        }).catch(err => console.error('[KYC] Failed to send corporate submission confirmation email:', err));

        // Delete server-side draft now that submission is complete
        storage.deleteKycDraft(userId, 'corporate').catch(() => null);

        const refCorpUpdated = `FT-KYC-${updated!.id.replace(/-/g, '').substring(0, 8).toUpperCase()}`;
        const slaCorpUpdated = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
        return res.json({ success: true, submission: updated, referenceNumber: refCorpUpdated, slaDeadline: slaCorpUpdated });
      } else {
        const submission = await storage.createFinatradesCorporateKyc({
          userId,
          ...kycData,
        });
        await storage.updateUser(userId, { kycStatus: 'Pending Review', accountType: 'business' });

        try {
          await storage.createKycVersion({
            submissionId: submission.id,
            userId,
            kycType: 'finatrades_corporate',
            versionNumber: 1,
            snapshot: kycData as Record<string, any>,
            status: 'submitted',
            submittedAt: new Date(),
          });
        } catch (versionError) {
          console.warn('[KYC] Could not create version record (table may not exist yet):', versionError instanceof Error ? versionError.message : versionError);
        }

        notifyAllAdmins({
          title: 'New Corporate KYC',
          message: `${companyName || user.firstName} submitted corporate KYC documents for review`,
          type: 'info',
          link: '/admin/kyc',
        });

        const baseUrl = `${req.protocol}://${req.get('host')}`;
        sendEmail(user.email, EMAIL_TEMPLATES.KYC_PENDING_REVIEW, {
          user_name: companyName || user.firstName || 'Valued Customer',
          kyc_type: 'Corporate',
          processing_time: '5 business days',
          dashboard_url: `${baseUrl}/dashboard`,
        }).catch(err => console.error('[KYC] Failed to send corporate submission confirmation email:', err));

        // Delete server-side draft now that submission is complete
        storage.deleteKycDraft(userId, 'corporate').catch(() => null);

        const refCorpNew = `FT-KYC-${submission.id.replace(/-/g, '').substring(0, 8).toUpperCase()}`;
        const slaCorpNew = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
        return res.json({ success: true, submission, referenceNumber: refCorpNew, slaDeadline: slaCorpNew });
      }
    } catch (error) {
      console.error("Failed to submit Finatrades corporate KYC:", error);
      notifyError({ error: error instanceof Error ? error : new Error(String(error)), context: 'Corporate KYC Submission Failed', route: 'POST /api/finatrades-kyc/corporate', userId: req.session?.userId || undefined });
      return res.status(400).json({ message: error instanceof Error ? error.message : "Failed to submit KYC" });
    }
  });

  // Get Finatrades Corporate KYC status
  app.get("/api/finatrades-kyc/corporate/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const submission = await storage.getFinatradesCorporateKyc(userId);
      const referenceNumber = submission?.id ? `FT-KYC-${submission.id.replace(/-/g, '').substring(0, 8).toUpperCase()}` : null;
      const slaDeadline = submission?.updatedAt ? new Date(new Date(submission.updatedAt).getTime() + 5 * 24 * 60 * 60 * 1000).toISOString() : null;
      return res.json({ submission, referenceNumber, slaDeadline });
    } catch (error) {
      console.error("Failed to get Finatrades corporate KYC:", error);
      return res.status(400).json({ message: "Failed to get KYC status" });
    }
  });

  // Request OTP for an action (rate limited)
  app.post("/api/otp/request", otpRateLimiter, async (req, res) => {
    try {
      const { userId, action, metadata } = req.body;
      
      if (!userId || !action) {
        return res.status(400).json({ message: "userId and action are required" });
      }
      
      // Get user
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get security settings
      const settings = await storage.getOrCreateSecuritySettings();
      
      // Check if email OTP is enabled globally
      if (!settings.emailOtpEnabled) {


      return res.json({ otpRequired: false, message: "Email OTP is not enabled" });
      }
      
      // Check if OTP is required for this action
      const otpActionMap: Record<string, keyof typeof settings> = {
        'login': 'otpOnLogin',
        'withdrawal': 'otpOnWithdrawal',
        'transfer': 'otpOnTransfer',
        'sell_gold': 'otpOnSellGold',
        'profile_change': 'otpOnProfileChange',
        'password_change': 'otpOnPasswordChange',
        'trade_bridge': 'otpOnTradeBridge',
      };
      
      const settingKey = otpActionMap[action];
      if (!settingKey || !settings[settingKey]) {


      return res.json({ otpRequired: false, message: `OTP not required for ${action}` });
      }
      
      // Check cooldown - get most recent OTP for this user and action
      const existingOtp = await storage.getPendingOtp(userId, action);
      if (existingOtp) {
        const cooldownMs = settings.otpCooldownMinutes * 60 * 1000;
        const timeSinceCreated = Date.now() - new Date(existingOtp.createdAt).getTime();
        if (timeSinceCreated < cooldownMs) {
          const remainingSeconds = Math.ceil((cooldownMs - timeSinceCreated) / 1000);
          return res.status(429).json({ 
            message: `Please wait ${remainingSeconds} seconds before requesting a new code` 
          });
        }
      }
      
      // Generate OTP code
      const code = generateVerificationCode();
      const expiresAt = new Date(Date.now() + settings.otpExpiryMinutes * 60 * 1000);
      
      // Create OTP verification record
      const otpVerification = await storage.createOtpVerification({
        userId,
        action,
        code,
        expiresAt,
        attempts: 0,
        verified: false,
        metadata: metadata || null,
      });
      
      // Send OTP email
      const emailResult = await sendEmail(user.email, EMAIL_TEMPLATES.EMAIL_VERIFICATION, {
        user_name: `${user.firstName} ${user.lastName}`,
        verification_code: code,
      });
      
      if (!emailResult.success) {
        return res.status(500).json({ message: "Failed to send OTP email. Please try again." });
      }
      


      return res.json({ 
        otpRequired: true,
        otpId: otpVerification.id,
        expiresAt: otpVerification.expiresAt,
        message: `Verification code sent to ${user.email}` 
      });
    } catch (error) {
      console.error("Failed to request OTP:", error);
      return res.status(400).json({ message: "Failed to request OTP" });
    }
  });

  // Verify OTP code (rate limited)
  app.post("/api/otp/verify", otpRateLimiter, async (req, res) => {
    try {
      const { otpId, code, userId, action } = req.body;
      
      if (!code) {
        return res.status(400).json({ message: "Verification code is required" });
      }
      
      // Get security settings for max attempts
      const settings = await storage.getOrCreateSecuritySettings();
      
      // Get OTP verification - either by ID or by userId+action
      let otpVerification;
      if (otpId) {
        otpVerification = await storage.getOtpVerification(otpId);
      } else if (userId && action) {
        otpVerification = await storage.getPendingOtp(userId, action);
      }
      
      if (!otpVerification) {
        return res.status(404).json({ message: "Verification not found. Please request a new code." });
      }
      
      // Check if already verified
      if (otpVerification.verified) {
        return res.status(400).json({ message: "Code already used. Please request a new code." });
      }
      
      // Check expiry
      if (new Date() > new Date(otpVerification.expiresAt)) {
        return res.status(400).json({ message: "Code expired. Please request a new code." });
      }
      
      // Check max attempts
      if (otpVerification.attempts >= settings.otpMaxAttempts) {
        return res.status(429).json({ message: "Too many failed attempts. Please request a new code." });
      }
      
      // Verify code
      if (otpVerification.code !== code) {
        // Increment attempts
        await storage.updateOtpVerification(otpVerification.id, {
          attempts: otpVerification.attempts + 1
        });
        
        const remainingAttempts = settings.otpMaxAttempts - otpVerification.attempts - 1;
        return res.status(400).json({ 
          message: `Invalid code. ${remainingAttempts} attempts remaining.` 
        });
      }
      
      // Mark as verified
      await storage.updateOtpVerification(otpVerification.id, {
        verified: true,
        verifiedAt: new Date()
      });
      


      return res.json({ 
        verified: true, 
        message: "Verification successful",
        metadata: otpVerification.metadata
      });
    } catch (error) {
      console.error("Failed to verify OTP:", error);
      return res.status(400).json({ message: "Failed to verify OTP" });
    }
  });

  // Check if OTP is required for an action (without sending)
  app.get("/api/otp/check/:action", async (req, res) => {
    try {
      const { action } = req.params;
      
      const settings = await storage.getOrCreateSecuritySettings();
      
      if (!settings.emailOtpEnabled) {


      return res.json({ otpRequired: false });
      }
      
      const otpActionMap: Record<string, keyof typeof settings> = {
        'login': 'otpOnLogin',
        'withdrawal': 'otpOnWithdrawal',
        'transfer': 'otpOnTransfer',
        'sell_gold': 'otpOnSellGold',
        'profile_change': 'otpOnProfileChange',
        'password_change': 'otpOnPasswordChange',
        'trade_bridge': 'otpOnTradeBridge',
      };
      
      const settingKey = otpActionMap[action];
      const otpRequired = settingKey ? !!settings[settingKey] : false;
      


      return res.json({ otpRequired });
    } catch (error) {
      console.error("Failed to check OTP requirement:", error);
      return res.status(400).json({ message: "Failed to check OTP requirement" });
    }
  });

  // ============================================================================
  // ADMIN - DOCUMENTS MANAGEMENT (Invoices & Certificate Deliveries)
  // ============================================================================

  // Get all invoices with user info
  app.get("/api/documents/user-manual", async (req, res) => {
    try {
      const pdfBuffer = await generateUserManualPDF();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="Finatrades-User-Manual.pdf"');
      return res.send(pdfBuffer);
    } catch (error) {
      console.error('Error generating user manual:', error);
      return res.status(500).json({ message: "Failed to generate user manual" });
    }
  });

  // Admin Manual PDF download
  app.get("/api/documents/admin-manual", ensureAdminAsync, requirePermission('view_reports'), async (req, res) => {
    try {
      const pdfBuffer = await generateAdminManualPDF();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="Finatrades-Admin-Manual.pdf"');
      return res.send(pdfBuffer);
    } catch (error) {
      console.error('Error generating admin manual:', error);
      return res.status(500).json({ message: "Failed to generate admin manual" });
    }
  });

  // ============================================================================
  // ADMIN ACTION OTP VERIFICATION
  // ============================================================================

  // Check if OTP is required for a specific action type
  app.get("/api/users/:userId/notifications", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const notifications = await storage.getUserNotifications(userId);


      return res.json({ notifications });
    } catch (error) {
      console.error('[Notifications Error]', error);
      return res.status(500).json({ message: "Failed to get notifications" });
    }
  });

  // ============================================
  // USER PREFERENCES
  // ============================================

  // Get user preferences
  app.get("/api/users/:userId/preferences", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const preferences = await storage.getOrCreateUserPreferences(req.params.userId);


      return res.json({ preferences });
    } catch (error) {
      console.error('[Preferences Error]', error);
      return res.status(500).json({ message: "Failed to get preferences" });
    }
  });

  // Update user preferences
  app.put("/api/users/:userId/preferences", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const updates = req.body;
      
      // Ensure preferences exist first
      await storage.getOrCreateUserPreferences(userId);
      
      // Update preferences
      const preferences = await storage.updateUserPreferences(userId, updates);
      if (!preferences) {
        return res.status(404).json({ message: "Preferences not found" });
      }
      


      return res.json({ preferences, message: "Settings saved successfully" });
    } catch (error) {
      console.error('[Preferences Error]', error);
      return res.status(500).json({ message: "Failed to save preferences" });
    }
  });

  // Admin: Get all user preferences (for admin management)
  app.get("/api/admin/user-preferences", ensureAdminAsync, requirePermission('view_users'), async (req, res) => {
    try {
      // Get all users with their preferences
      const allUsers = await storage.getAllUsers();
      const usersWithPrefs = await Promise.all(
        allUsers.map(async (user) => {
          const prefs = await storage.getUserPreferences(user.id);
          return {
            userId: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            preferences: prefs || null,
          };
        })
      );


      return res.json({ users: usersWithPrefs });
    } catch (error) {
      console.error('[Admin Preferences Error]', error);
      return res.status(500).json({ message: "Failed to get user preferences" });
    }
  });

  // Admin: Update any user's preferences
  app.put("/api/admin/users/:userId/preferences", ensureAdminAsync, requirePermission('manage_users'), async (req, res) => {
    try {
      const { userId } = req.params;
      const updates = req.body;
      
      await storage.getOrCreateUserPreferences(userId);
      const preferences = await storage.updateUserPreferences(userId, updates);
      


      return res.json({ preferences, message: "User preferences updated" });
    } catch (error) {
      console.error('[Admin Preferences Error]', error);
      return res.status(500).json({ message: "Failed to update user preferences" });
    }
  });

  // Admin: Repair corrupted wallet balance by recalculating from transactions
  app.post("/api/notifications/:notificationId/read", async (req, res) => {
    try {
      const { notificationId } = req.params;
      const notification = await storage.getNotification(notificationId);
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      // Verify ownership: user can only mark their own notifications as read
      const sessionUserId = req.session?.userId;
      const isAdmin = req.session?.userRole === 'admin';
      if (notification.userId !== sessionUserId && !isAdmin) {
        return res.status(403).json({ message: "Not authorized to modify this notification" });
      }
      await storage.markNotificationRead(notificationId);


      return res.json({ success: true });
    } catch (error) {
      return res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // Mark all notifications as read for user
  app.post("/api/users/:userId/notifications/read-all", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      await storage.markAllNotificationsRead(userId);


      return res.json({ success: true });
    } catch (error) {
      return res.status(500).json({ message: "Failed to mark all as read" });
    }
  });

  // Get user email logs (user can view their own email history)
  app.get("/api/users/:userId/email-logs", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const emailLogs = await storage.getEmailLogsByUser(userId);
      return res.json({ emailLogs });
    } catch (error) {
      console.error('[Email Logs Error]', error);
      return res.status(500).json({ message: "Failed to get email history" });
    }
  });

  // Delete notification - with ownership verification
  app.delete("/api/notifications/:notificationId", async (req, res) => {
    try {
      const { notificationId } = req.params;
      const notification = await storage.getNotification(notificationId);
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      // Verify ownership: user can only delete their own notifications
      const sessionUserId = req.session?.userId;
      const isAdmin = req.session?.userRole === 'admin';
      if (notification.userId !== sessionUserId && !isAdmin) {
        return res.status(403).json({ message: "Not authorized to delete this notification" });
      }
      await storage.deleteNotification(notificationId);


      return res.json({ success: true });
    } catch (error) {
      return res.status(500).json({ message: "Failed to delete notification" });
    }
  });

  // ============================================
  // AUDIT LOGS
  // ============================================

  // Get all audit logs (Admin) - PROTECTED - with resolved names
  app.get("/api/admin/audit-logs", ensureAdminAsync, requirePermission('view_reports'), requirePermission('view_transactions', 'manage_settings'), async (req, res) => {
    try {
      const logs = await storage.getAllAuditLogs();
      
      // Cache for user lookups to avoid duplicate queries
      const userCache = new Map<string, { firstName: string; lastName: string; email: string } | null>();
      
      // Resolve user names for actor and entityId
      const enrichedLogs = await Promise.all(logs.map(async (log) => {
        let actorName = log.actor;
        let entityName = log.entityId;
        
        // Resolve actor name (if it's a UUID)
        if (log.actor && log.actor.includes('-') && log.actor.length > 30) {
          if (!userCache.has(log.actor)) {
            try {
              const user = await storage.getUser(log.actor);
              userCache.set(log.actor, user ? { firstName: user.firstName || '', lastName: user.lastName || '', email: user.email } : null);
            } catch { userCache.set(log.actor, null); }
          }
          const cached = userCache.get(log.actor);
          if (cached) {
            actorName = `${cached.firstName} ${cached.lastName}`.trim() || cached.email;
          }
        }
        
        // Resolve entity name (if entityType is 'user' and entityId is a UUID)
        if (log.entityType === 'user' && log.entityId && log.entityId.includes('-') && log.entityId.length > 30) {
          if (!userCache.has(log.entityId)) {
            try {
              const user = await storage.getUser(log.entityId);
              userCache.set(log.entityId, user ? { firstName: user.firstName || '', lastName: user.lastName || '', email: user.email } : null);
            } catch { userCache.set(log.entityId, null); }
          }
          const cached = userCache.get(log.entityId);
          if (cached) {
            entityName = `${cached.firstName} ${cached.lastName}`.trim() || cached.email;
          }
        }
        
        return {
          ...log,
          actorName,
          entityName,
        };
      }));
      


      return res.json({ logs: enrichedLogs });
    } catch (error) {
      return res.status(500).json({ message: "Failed to get audit logs" });
    }
  });

  // ============================================
  // CRYPTO WALLET CONFIGURATIONS (Admin managed)
  // ============================================

  // Get all crypto wallet configs (admin)
  app.get("/api/notifications/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const notifications = await storage.getUserNotifications(req.params.userId);


      return res.json({ notifications });
    } catch (error) {
      return res.status(500).json({ message: "Failed to get notifications" });
    }
  });

  // Create notification (internal use)
  app.post("/api/notifications", async (req, res) => {
    try {
      const { userId, title, message, type, link } = req.body;
      const notification = await storage.createNotification({
        userId,
        title,
        message,
        type: type || 'info',
        link,
        read: false,
      });

      // Emit real-time WebSocket event so the client doesn't have to poll
      if (userId && notification) {
        emitNotification(userId, {
          id: notification.id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          link: notification.link,
          read: notification.read,
          createdAt: notification.createdAt instanceof Date ? notification.createdAt.toISOString() : String(notification.createdAt),
        });
      }

      return res.json({ notification });
    } catch (error) {
      return res.status(500).json({ message: "Failed to create notification" });
    }
  });

  // Mark notification as read - with ownership verification
  app.patch("/api/notifications/:id/read", async (req, res) => {
    try {
      const notification = await storage.getNotification(req.params.id);
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      // Verify ownership
      const sessionUserId = req.session?.userId;
      const isAdmin = req.session?.userRole === 'admin';
      if (notification.userId !== sessionUserId && !isAdmin) {
        return res.status(403).json({ message: "Not authorized to modify this notification" });
      }
      const updated = await storage.markNotificationRead(req.params.id);


      return res.json({ notification: updated });
    } catch (error) {
      return res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // Mark all notifications as read - with ownership verification
  app.patch("/api/notifications/:userId/read-all", ensureOwnerOrAdmin, async (req, res) => {
    try {
      await storage.markAllNotificationsRead(req.params.userId);


      return res.json({ success: true });
    } catch (error) {
      return res.status(500).json({ message: "Failed to mark notifications as read" });
    }
  });

  // Delete notification - with ownership verification
  app.delete("/api/notifications/:id", async (req, res) => {
    try {
      const notification = await storage.getNotification(req.params.id);
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      // Verify ownership
      const sessionUserId = req.session?.userId;
      const isAdmin = req.session?.userRole === 'admin';
      if (notification.userId !== sessionUserId && !isAdmin) {
        return res.status(403).json({ message: "Not authorized to delete this notification" });
      }
      await storage.deleteNotification(req.params.id);


      return res.json({ success: true });
    } catch (error) {
      return res.status(500).json({ message: "Failed to delete notification" });
    }
  });

  // Clear all notifications for user - with ownership verification
  app.delete("/api/notifications/user/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      await storage.deleteAllNotifications(req.params.userId);


      return res.json({ success: true });
    } catch (error) {
      return res.status(500).json({ message: "Failed to clear notifications" });
    }
  });

  // ============================================
  // PUSH NOTIFICATION DEVICE TOKENS
  // ============================================

  // Register device token for push notifications
  app.post("/api/push/register", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.session?.userId;
      const { token, platform, deviceName, deviceId } = req.body;
      
      if (!token || !platform) {
        return res.status(400).json({ message: "Token and platform are required" });
      }
      
      if (!['ios', 'android', 'web'].includes(platform)) {
        return res.status(400).json({ message: "Invalid platform. Must be ios, android, or web" });
      }
      
      const { registerDeviceToken } = await import('./push-notifications');
      await registerDeviceToken(userId!, token, platform, deviceName, deviceId);
      


      return res.json({ success: true, message: "Device registered for push notifications" });
    } catch (error) {
      console.error("Failed to register push device:", error);
      return res.status(500).json({ message: "Failed to register device for push notifications" });
    }
  });

  // Unregister device token
  app.post("/api/push/unregister", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.session?.userId;
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ message: "Token is required" });
      }
      
      const { unregisterDeviceToken } = await import('./push-notifications');
      await unregisterDeviceToken(userId!, token);
      


      return res.json({ success: true, message: "Device unregistered from push notifications" });
    } catch (error) {
      console.error("Failed to unregister push device:", error);
      return res.status(500).json({ message: "Failed to unregister device" });
    }
  });

  // Get user's registered devices
  app.get("/api/push/devices", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.session?.userId;
      const { getUserDeviceTokens } = await import('./push-notifications');
      const tokens = await getUserDeviceTokens(userId!);
      


      return res.json({ devices: tokens.length, hasDevices: tokens.length > 0 });
    } catch (error) {
      console.error("Failed to get push devices:", error);
      return res.status(500).json({ message: "Failed to get registered devices" });
    }
  });

  // Unregister all device tokens for user (used during logout)
  app.post("/api/push/unregister-all", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.session?.userId;
      const { unregisterAllDeviceTokens } = await import('./push-notifications');
      const count = await unregisterAllDeviceTokens(userId!);
      


      return res.json({ success: true, devicesUnregistered: count });
    } catch (error) {
      console.error("Failed to unregister all push devices:", error);
      return res.status(500).json({ message: "Failed to unregister devices" });
    }
  });

  // ============================================
  // PLATFORM CONFIGURATION
  // ============================================

  // Get all platform configs
  app.get("/api/admin/platform-config", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      const configs = await storage.getAllPlatformConfigs();


      return res.json({ configs });
    } catch (error) {
      console.error("Failed to get platform configs:", error);
      return res.status(500).json({ message: "Failed to get platform configuration" });
    }
  });

  // Get platform configs by category
  app.get("/api/admin/platform-config/category/:category", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      const configs = await storage.getPlatformConfigsByCategory(req.params.category);


      return res.json({ configs });
    } catch (error) {
      console.error("Failed to get platform configs by category:", error);
      return res.status(500).json({ message: "Failed to get platform configuration" });
    }
  });

  // Get single platform config by key
  app.get("/api/admin/platform-config/key/:key", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      const config = await storage.getPlatformConfig(req.params.key);
      if (!config) {
        return res.status(404).json({ message: "Configuration not found" });
      }


      return res.json({ config });
    } catch (error) {
      console.error("Failed to get platform config:", error);
      return res.status(500).json({ message: "Failed to get platform configuration" });
    }
  });

  // Public endpoint to get specific configs (for frontend use)
  app.get("/api/platform-config/public", async (req, res) => {
    try {
      const allConfigs = await storage.getAllPlatformConfigs();
      // Filter to only include non-sensitive configs needed by frontend
      const publicKeys = [
        'buy_spread_percent', 'sell_spread_percent', 'storage_fee_percent', 'min_trade_amount',
        'tier1_daily_limit', 'tier1_monthly_limit', 'tier1_single_max',
        'tier2_daily_limit', 'tier2_monthly_limit', 'tier2_single_max',
        'tier3_daily_limit', 'tier3_monthly_limit', 'tier3_single_max',
        'min_deposit', 'max_deposit_single',
        'min_withdrawal', 'max_withdrawal_single',
        'min_p2p_transfer', 'max_p2p_transfer',
        'maintenance_mode', 'registrations_enabled',
        'referrer_bonus_usd', 'referee_bonus_usd'
      ];
      const publicConfigs = allConfigs.filter(c => publicKeys.includes(c.configKey));
      
      // Convert to key-value object for easier frontend use
      const configMap: Record<string, any> = {};
      for (const config of publicConfigs) {
        let value: any = config.configValue;
        if (config.configType === 'number') {
          value = parseFloat(config.configValue);
        } else if (config.configType === 'boolean') {
          value = config.configValue === 'true';
        } else if (config.configType === 'json') {
          try { value = JSON.parse(config.configValue); } catch { value = config.configValue; }
        }
        configMap[config.configKey] = value;
      }
      


      return res.json({ configs: configMap });
    } catch (error) {
      console.error("Failed to get public platform configs:", error);
      return res.status(500).json({ message: "Failed to get platform configuration" });
    }
  });

  // Update platform config
  app.patch("/api/admin/platform-config/:id", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      const { id } = req.params;
      const { configValue } = req.body;
      const adminUser = req.adminUser!;
      
      const updated = await storage.updatePlatformConfig(id, {
        configValue: String(configValue),
        updatedBy: adminUser.id,
      });
      
      if (!updated) {
        return res.status(404).json({ message: "Configuration not found" });
      }
      
      await storage.createAuditLog({
        entityType: "platform_config",
        entityId: id,
        actionType: "update",
        actor: adminUser.id,
        actorRole: "admin",
        details: `Updated ${updated.configKey} to ${configValue}`,
      });
      
      // Invalidate system settings cache when system_settings are updated
      if (updated.category === 'system_settings') {
        const { invalidateSystemSettingsCache } = await import("./index");
        invalidateSystemSettingsCache();
      }
      


      return res.json({ config: updated });
    } catch (error) {
      console.error("Failed to update platform config:", error);
      return res.status(500).json({ message: "Failed to update platform configuration" });
    }
  });

  // Bulk update platform configs
  app.post("/api/admin/platform-config/bulk-update", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      const { updates } = req.body; // Array of { id, configValue }
      const adminUser = req.adminUser!;
      
      if (!Array.isArray(updates)) {
        return res.status(400).json({ message: "Updates must be an array" });
      }
      
      const results: any[] = [];
      let hasSystemSettingsUpdate = false;
      for (const update of updates) {
        const updated = await storage.updatePlatformConfig(update.id, {
          configValue: String(update.configValue),
          updatedBy: adminUser.id,
        });
        if (updated) {
          results.push(updated);
          if (updated.category === 'system_settings') hasSystemSettingsUpdate = true;
          await storage.createAuditLog({
            entityType: "platform_config",
            entityId: update.id,
            actionType: "update",
            actor: adminUser.id,
            actorRole: "admin",
            details: `Updated ${updated.configKey} to ${update.configValue}`,
          });
        }
      }
      
      // Invalidate system settings cache if any system_settings were updated
      if (hasSystemSettingsUpdate) {
        const { invalidateSystemSettingsCache } = await import("./index");
        invalidateSystemSettingsCache();
      }
      


      return res.json({ configs: results, updated: results.length });
    } catch (error) {
      console.error("Failed to bulk update platform configs:", error);
      return res.status(500).json({ message: "Failed to update platform configuration" });
    }
  });

  // Seed default platform configs
  app.post("/api/admin/platform-config/seed", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      await storage.seedDefaultPlatformConfig();
      const configs = await storage.getAllPlatformConfigs();


      return res.json({ message: "Default platform configuration seeded", configs });
    } catch (error) {
      console.error("Failed to seed platform configs:", error);
      return res.status(500).json({ message: "Failed to seed platform configuration" });
    }
  });

  // Create new platform config (admin use)
  app.post("/api/admin/platform-config", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      const { category, configKey, configValue, configType, displayName, description, displayOrder } = req.body;
      const adminUser = req.adminUser!;
      
      const config = await storage.createPlatformConfig({
        category,
        configKey,
        configValue: String(configValue),
        configType: configType || 'string',
        displayName,
        description,
        displayOrder: displayOrder || 0,
        updatedBy: adminUser.id,
      });
      
      await storage.createAuditLog({
        entityType: "platform_config",
        entityId: config.id,
        actionType: "create",
        actor: adminUser.id,
        actorRole: "admin",
        details: `Created platform config: ${configKey}`,
      });
      


      return res.json({ config });
    } catch (error) {
      console.error("Failed to create platform config:", error);
      return res.status(500).json({ message: "Failed to create platform configuration" });
    }
  });

  // Delete platform config
  app.delete("/api/admin/platform-config/:id", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      const { id } = req.params;
      const adminUser = req.adminUser!;
      
      const config = await storage.getAllPlatformConfigs().then(configs => configs.find(c => c.id === id));
      
      const success = await storage.deletePlatformConfig(id);
      if (!success) {
        return res.status(404).json({ message: "Configuration not found" });
      }
      
      await storage.createAuditLog({
        entityType: "platform_config",
        entityId: id,
        actionType: "delete",
        actor: adminUser.id,
        actorRole: "admin",
        details: `Deleted platform config: ${config?.configKey || id}`,
      });
      


      return res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete platform config:", error);
      return res.status(500).json({ message: "Failed to delete platform configuration" });
    }
  });

  // ============================================
  // EMAIL NOTIFICATION SETTINGS ROUTES
  // ============================================

  // Get all email notification settings
  app.get("/api/admin/email-notifications", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      const settings = await storage.getAllEmailNotificationSettings();


      return res.json({ settings });
    } catch (error) {
      console.error("Failed to get email notification settings:", error);
      return res.status(500).json({ message: "Failed to get email notification settings" });
    }
  });

  // Get email notification settings by category
  app.get("/api/admin/email-notifications/category/:category", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      const { category } = req.params;
      const settings = await storage.getEmailNotificationSettingsByCategory(category);


      return res.json({ settings });
    } catch (error) {
      console.error("Failed to get email notification settings by category:", error);
      return res.status(500).json({ message: "Failed to get email notification settings" });
    }
  });

  // Toggle email notification
  app.patch("/api/admin/email-notifications/:type/toggle", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      const { type } = req.params;
      const { isEnabled } = req.body;
      const adminUser = req.adminUser!;
      
      const setting = await storage.toggleEmailNotification(type, isEnabled, adminUser.id);
      
      if (!setting) {
        return res.status(404).json({ message: "Notification setting not found" });
      }
      
      await storage.createAuditLog({
        entityType: "email_notification_setting",
        entityId: setting.id,
        actionType: "update",
        actor: adminUser.id,
        actorRole: "admin",
        details: `${isEnabled ? 'Enabled' : 'Disabled'} email notification: ${type}`,
      });
      


      return res.json({ setting });
    } catch (error) {
      console.error("Failed to toggle email notification:", error);
      return res.status(500).json({ message: "Failed to toggle email notification" });
    }
  });

  // Update email notification setting
  app.patch("/api/admin/email-notifications/:id", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const adminUser = req.adminUser!;
      
      const setting = await storage.updateEmailNotificationSetting(id, {
        ...updates,
        updatedBy: adminUser.id,
      });
      
      if (!setting) {
        return res.status(404).json({ message: "Notification setting not found" });
      }
      
      await storage.createAuditLog({
        entityType: "email_notification_setting",
        entityId: id,
        actionType: "update",
        actor: adminUser.id,
        actorRole: "admin",
        details: `Updated email notification setting: ${setting.notificationType}`,
      });
      


      return res.json({ setting });
    } catch (error) {
      console.error("Failed to update email notification setting:", error);
      return res.status(500).json({ message: "Failed to update email notification setting" });
    }
  });

  // Seed default email notification settings
  app.post("/api/admin/email-notifications/seed", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      await storage.seedDefaultEmailNotificationSettings();
      const settings = await storage.getAllEmailNotificationSettings();


      return res.json({ success: true, count: settings.length });
    } catch (error) {
      console.error("Failed to seed email notification settings:", error);
      return res.status(500).json({ message: "Failed to seed email notification settings" });
    }
  });

  // ============================================
  // EMAIL LOGS ROUTES
  // ============================================

  // Get all email logs
  app.get("/api/admin/email-logs", ensureAdminAsync, requirePermission('view_reports'), async (req, res) => {
    try {
      const logs = await storage.getAllEmailLogs();


      return res.json({ logs });
    } catch (error) {
      console.error("Failed to get email logs:", error);
      return res.status(500).json({ message: "Failed to get email logs" });
    }
  });

  // Get email logs by user
  app.get("/api/admin/email-logs/user/:userId", ensureAdminAsync, requirePermission('view_reports', 'view_users'), async (req, res) => {
    try {
      const { userId } = req.params;
      const logs = await storage.getEmailLogsByUser(userId);


      return res.json({ logs });
    } catch (error) {
      console.error("Failed to get user email logs:", error);
      return res.status(500).json({ message: "Failed to get user email logs" });
    }
  });

  // Get email logs by notification type
  app.get("/api/admin/email-logs/type/:type", ensureAdminAsync, requirePermission('view_reports'), async (req, res) => {
    try {
      const { type } = req.params;
      const logs = await storage.getEmailLogsByType(type);


      return res.json({ logs });
    } catch (error) {
      console.error("Failed to get email logs by type:", error);
      return res.status(500).json({ message: "Failed to get email logs by type" });
    }
  });

  // Get single email log
  app.get("/api/admin/email-logs/:id", ensureAdminAsync, requirePermission('view_reports'), async (req, res) => {
    try {
      const { id } = req.params;
      const log = await storage.getEmailLog(id);
      
      if (!log) {
        return res.status(404).json({ message: "Email log not found" });
      }
      


      return res.json({ log });
    } catch (error) {
      console.error("Failed to get email log:", error);
      return res.status(500).json({ message: "Failed to get email log" });
    }
  });


  // Send test email to verify template design
  // Get all email templates (for template management UI)
  app.get("/api/admin/email-templates", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      const templates = await storage.getAllTemplates();
      const emailTemplates = templates.filter(t => t.type === 'email');
      return res.json({ templates: emailTemplates });
    } catch (error) {
      console.error("Failed to get email templates:", error);
      return res.status(500).json({ message: "Failed to get email templates" });
    }
  });

  // Get single email template by ID
  app.get("/api/admin/email-templates/:id", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      const templates = await storage.getAllTemplates();
      const template = templates.find(t => t.id === req.params.id);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      return res.json({ template });
    } catch (error) {
      return res.status(500).json({ message: "Failed to get template" });
    }
  });

  // Update email template subject and/or body
  app.patch("/api/admin/email-templates/:id", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      const { subject, body } = req.body;
      if (!subject && !body) {
        return res.status(400).json({ message: "At least one of subject or body must be provided" });
      }
      const updates: Record<string, any> = {};
      if (subject) updates.subject = subject;
      if (body) updates.body = body;
      const updated = await storage.updateTemplate(req.params.id, updates);
      if (!updated) {
        return res.status(404).json({ message: "Template not found" });
      }
      await storage.createAuditLog({
        entityType: "email_template",
        entityId: req.params.id,
        actionType: "update",
        actor: req.session?.userId || 'admin',
        actorRole: "admin",
        details: `Email template updated: ${updated.name}`,
      });
      return res.json({ template: updated, message: "Template updated successfully" });
    } catch (error) {
      console.error("Failed to update email template:", error);
      return res.status(500).json({ message: "Failed to update template" });
    }
  });

  app.post("/api/admin/email-test", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      const { email, templateType } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email address is required" });
      }

      const testData = {
        user_name: "Test User",
        otp_code: "123456",
        amount: "1.5g",
        transaction_id: "TEST-" + Date.now(),
        dashboard_url: `${process.env.APP_URL || "https://finatrades.com"}/dashboard`,
        gold_amount: "1.5g",
        usd_value: "$225.00",
        certificate_id: "CERT-TEST-001",
        status: "Approved",
        date: new Date().toLocaleDateString()
      };

      await sendEmailDirect(email, "Finatrades Email Template Test", `<p>Test email from Finatrades</p>`);

      return res.json({ success: true, message: `Test email sent to ${email}` });
    } catch (error) {
      console.error("Failed to send test email:", error);
      return res.status(500).json({ message: "Failed to send test email: " + (error as Error).message });
    }
  });
  // ============================================
  // GEO RESTRICTIONS ROUTES
  // ============================================

  // Public endpoint to check IP restriction (for landing page notice)
  app.get("/api/geo-restriction/check", async (req, res) => {
    try {
      // Get settings first
      const [settings] = await db.select().from(geoRestrictionSettings).limit(1);
      
      if (!settings?.isEnabled) {
      return res.json({ restricted: false });
      }
      
      // Get client IP
      const clientIp = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || 
                       req.headers['x-real-ip']?.toString() || 
                       req.socket.remoteAddress || '';
      
      // Use ip-api.com free service to get country from IP
      let countryCode = '';
      try {
        const geoResponse = await fetch(`http://ip-api.com/json/${clientIp}?fields=countryCode`);
        if (geoResponse.ok) {
          const geoData: any = await geoResponse.json();
          countryCode = geoData.countryCode || '';
        }
      } catch (err) {
        console.log('Failed to get geo location for IP:', clientIp);
      }
      
      if (!countryCode) {
      return res.json({ restricted: false });
      }
      
      // Check if country is restricted
      const [restriction] = await db.select()
        .from(geoRestrictions)
        .where(and(
          eq(geoRestrictions.countryCode, countryCode),
          eq(geoRestrictions.isRestricted, true)
        ))
        .limit(1);
      
      if (restriction) {
        return res.json({
          restricted: true,
          countryCode: restriction.countryCode,
          countryName: restriction.countryName,
          message: restriction.restrictionMessage || settings.defaultMessage,
          allowRegistration: restriction.allowRegistration,
          allowLogin: restriction.allowLogin,
          allowTransactions: restriction.allowTransactions,
          showNotice: settings.showNoticeOnLanding,
          blockAccess: settings.blockAccess,
        });
      }
      


      return res.json({ restricted: false });
    } catch (error) {
      console.error("Failed to check geo restriction:", error);


      return res.json({ restricted: false });
    }
  });

  // Get all geo restrictions (admin)
  app.get("/api/admin/geo-restrictions", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      const restrictions = await db.select().from(geoRestrictions).orderBy(geoRestrictions.countryName);


      return res.json({ restrictions });
    } catch (error) {
      console.error("Failed to get geo restrictions:", error);
      return res.status(500).json({ message: "Failed to get geo restrictions" });
    }
  });

  // Get geo restriction settings (admin)
  app.get("/api/admin/geo-restriction-settings", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      const [settings] = await db.select().from(geoRestrictionSettings).limit(1);


      return res.json({ settings: settings || null });
    } catch (error) {
      console.error("Failed to get geo restriction settings:", error);
      return res.status(500).json({ message: "Failed to get geo restriction settings" });
    }
  });

  // Update or create geo restriction settings (admin)
  app.post("/api/admin/geo-restriction-settings", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      const { isEnabled, defaultMessage, showNoticeOnLanding, blockAccess } = req.body;
      const adminUser = req.adminUser!;
      
      // Check if settings exist
      const [existing] = await db.select().from(geoRestrictionSettings).limit(1);
      
      if (existing) {
        const [updated] = await db.update(geoRestrictionSettings)
          .set({
            isEnabled,
            defaultMessage,
            showNoticeOnLanding,
            blockAccess,
            updatedBy: adminUser.id,
            updatedAt: new Date(),
          })
          .where(eq(geoRestrictionSettings.id, existing.id))
          .returning();
        
        await storage.createAuditLog({
          entityType: "geo_restriction_settings",
          entityId: existing.id,
          actionType: "update",
          actor: adminUser.id,
          actorRole: "admin",
          details: `Updated geo restriction settings: ${isEnabled ? 'Enabled' : 'Disabled'}`,
        });
        


      return res.json({ settings: updated });
      } else {
        const [created] = await db.insert(geoRestrictionSettings)
          .values({
            isEnabled,
            defaultMessage: defaultMessage || 'Our services are not available in your region. Please contact support for more information.',
            showNoticeOnLanding,
            blockAccess,
            updatedBy: adminUser.id,
          })
          .returning();
        
        await storage.createAuditLog({
          entityType: "geo_restriction_settings",
          entityId: created.id,
          actionType: "create",
          actor: adminUser.id,
          actorRole: "admin",
          details: `Created geo restriction settings`,
        });
        


      return res.json({ settings: created });
      }
    } catch (error) {
      console.error("Failed to update geo restriction settings:", error);
      return res.status(500).json({ message: "Failed to update geo restriction settings" });
    }
  });

  // Add a new geo restriction (admin)
  app.post("/api/admin/geo-restrictions", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      const { countryCode, countryName, isRestricted, restrictionMessage, allowRegistration, allowLogin, allowTransactions, reason } = req.body;
      const adminUser = req.adminUser!;
      
      // Check if country already exists
      const [existing] = await db.select()
        .from(geoRestrictions)
        .where(eq(geoRestrictions.countryCode, countryCode.toUpperCase()))
        .limit(1);
      
      if (existing) {
        return res.status(400).json({ message: "Country restriction already exists" });
      }
      
      const [created] = await db.insert(geoRestrictions)
        .values({
          countryCode: countryCode.toUpperCase(),
          countryName,
          isRestricted: isRestricted ?? true,
          restrictionMessage,
          allowRegistration: allowRegistration ?? false,
          allowLogin: allowLogin ?? false,
          allowTransactions: allowTransactions ?? false,
          reason,
          updatedBy: adminUser.id,
        })
        .returning();
      
      await storage.createAuditLog({
        entityType: "geo_restriction",
        entityId: created.id,
        actionType: "create",
        actor: adminUser.id,
        actorRole: "admin",
        details: `Added geo restriction for ${countryName} (${countryCode})`,
      });
      


      return res.json({ restriction: created });
    } catch (error) {
      console.error("Failed to create geo restriction:", error);
      return res.status(500).json({ message: "Failed to create geo restriction" });
    }
  });

  // Update geo restriction (admin)
  app.patch("/api/admin/geo-restrictions/:id", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const adminUser = req.adminUser!;
      
      const [updated] = await db.update(geoRestrictions)
        .set({
          ...updates,
          updatedBy: adminUser.id,
          updatedAt: new Date(),
        })
        .where(eq(geoRestrictions.id, id))
        .returning();
      
      if (!updated) {
        return res.status(404).json({ message: "Geo restriction not found" });
      }
      
      await storage.createAuditLog({
        entityType: "geo_restriction",
        entityId: id,
        actionType: "update",
        actor: adminUser.id,
        actorRole: "admin",
        details: `Updated geo restriction for ${updated.countryName}`,
      });
      


      return res.json({ restriction: updated });
    } catch (error) {
      console.error("Failed to update geo restriction:", error);
      return res.status(500).json({ message: "Failed to update geo restriction" });
    }
  });

  // Delete geo restriction (admin)
  app.delete("/api/admin/geo-restrictions/:id", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      const { id } = req.params;
      const adminUser = req.adminUser!;
      
      const [deleted] = await db.delete(geoRestrictions)
        .where(eq(geoRestrictions.id, id))
        .returning();
      
      if (!deleted) {
        return res.status(404).json({ message: "Geo restriction not found" });
      }
      
      await storage.createAuditLog({
        entityType: "geo_restriction",
        entityId: id,
        actionType: "delete",
        actor: adminUser.id,
        actorRole: "admin",
        details: `Deleted geo restriction for ${deleted.countryName}`,
      });
      


      return res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete geo restriction:", error);
      return res.status(500).json({ message: "Failed to delete geo restriction" });
    }
  });

  // ============================================
  // ENTERPRISE ROLE-BASED ACCESS CONTROL (RBAC)
  // ============================================
  
  // Get all admin roles
  app.get("/api/admin/rbac/roles", ensureAdminAsync, requirePermission('manage_employees'), async (req, res) => {
    try {
      const roles = await storage.getAllAdminRoles();


      return res.json({ roles });
    } catch (error) {
      console.error('Get roles error:', error);
      return res.status(500).json({ error: 'Failed to get roles' });
    }
  });

  // Get single role with permissions
  app.get("/api/admin/rbac/roles/:id", ensureAdminAsync, requirePermission('manage_employees'), async (req, res) => {
    try {
      const role = await storage.getAdminRole(req.params.id);
      if (!role) {
        return res.status(404).json({ error: 'Role not found' });
      }
      const permissions = await storage.getRolePermissions(req.params.id);


      return res.json({ role, permissions });
    } catch (error) {
      console.error('Get role error:', error);
      return res.status(500).json({ error: 'Failed to get role' });
    }
  });

  // Create admin role
  app.post("/api/admin/rbac/roles", ensureAdminAsync, requirePermission('manage_employees'), async (req, res) => {
    try {
      const { name, description, department, riskLevel } = req.body;
      if (!name) {
        return res.status(400).json({ error: 'Role name is required' });
      }
      const role = await storage.createAdminRole({
        name,
        description,
        department,
        riskLevel: riskLevel || 'Low',
        createdBy: req.session?.userId
      });


      return res.json({ role });
    } catch (error) {
      console.error('Create role error:', error);
      return res.status(500).json({ error: 'Failed to create role' });
    }
  });

  // Update admin role
  app.patch("/api/admin/rbac/roles/:id", ensureAdminAsync, requirePermission('manage_employees'), async (req, res) => {
    try {
      const role = await storage.updateAdminRole(req.params.id, req.body);
      if (!role) {
        return res.status(404).json({ error: 'Role not found' });
      }


      return res.json({ role });
    } catch (error) {
      console.error('Update role error:', error);
      return res.status(500).json({ error: 'Failed to update role' });
    }
  });

  // Delete admin role
  app.delete("/api/admin/rbac/roles/:id", ensureAdminAsync, requirePermission('manage_employees'), async (req, res) => {
    try {
      const deleted = await storage.deleteAdminRole(req.params.id);
      if (!deleted) {
        return res.status(400).json({ error: 'Cannot delete system role or role not found' });
      }


      return res.json({ success: true });
    } catch (error) {
      console.error('Delete role error:', error);
      return res.status(500).json({ error: 'Failed to delete role' });
    }
  });

  // Get all admin components
  app.get("/api/admin/rbac/components", ensureAdminAsync, requirePermission('manage_employees'), async (req, res) => {
    try {
      const components = await storage.getAllAdminComponents();


      return res.json({ components });
    } catch (error) {
      console.error('Get components error:', error);
      return res.status(500).json({ error: 'Failed to get components' });
    }
  });

  // Update role-component permission
  app.post("/api/admin/rbac/permissions", ensureAdminAsync, requirePermission('manage_employees'), async (req, res) => {
    try {
      const { roleId, componentId, permissions } = req.body;
      if (!roleId || !componentId) {
        return res.status(400).json({ error: 'Role ID and Component ID are required' });
      }
      const result = await storage.updateRoleComponentPermission(roleId, componentId, permissions);


      return res.json({ permission: result });
    } catch (error) {
      console.error('Update permission error:', error);
      return res.status(500).json({ error: 'Failed to update permission' });
    }
  });

  // Get user role assignments
  app.get("/api/admin/rbac/users/:userId/roles", ensureAdminAsync, requirePermission('manage_employees'), async (req, res) => {
    try {
      const assignments = await storage.getUserRoleAssignments(req.params.userId);


      return res.json({ assignments });
    } catch (error) {
      console.error('Get user roles error:', error);
      return res.status(500).json({ error: 'Failed to get user roles' });
    }
  });


  app.get("/api/admin/rbac/my-role", ensureAdminAsync, async (req, res) => {
    try {
      const userId = req.session?.userId || "";
      const assignments = await storage.getUserRoleAssignments(userId);
      return res.json({ assignments });
    } catch (error) {
      console.error('Get my role error:', error);
      return res.status(500).json({ error: 'Failed to get role' });
    }
  });

  // Get user's effective RBAC permissions (for menu access control)
  app.get("/api/admin/rbac/my-permissions", ensureAdminAsync, async (req, res) => {
    try {
      const userId = req.session?.userId || "";
      const result = await storage.getUserEffectivePermissions(userId);
      return res.json(result);
    } catch (error) {
      console.error('Get user permissions error:', error);
      return res.status(500).json({ error: 'Failed to get user permissions' });
    }
  });
  // Assign role to user
  app.post("/api/admin/rbac/users/:userId/roles", ensureAdminAsync, requirePermission('manage_employees'), async (req, res) => {
    try {
      const { roleId, expiresAt } = req.body;
      if (!roleId) {
        return res.status(400).json({ error: 'Role ID is required' });
      }
      const assignment = await storage.assignUserRole(
        req.params.userId,
        roleId,
        req.session?.userId || '',
        expiresAt ? new Date(expiresAt) : undefined
      );


      return res.json({ assignment });
    } catch (error) {
      console.error('Assign role error:', error);
      return res.status(500).json({ error: 'Failed to assign role' });
    }
  });

  // Revoke role from user
  app.delete("/api/admin/rbac/users/:userId/roles/:roleId", ensureAdminAsync, requirePermission('manage_employees'), async (req, res) => {
    try {
      const revoked = await storage.revokeUserRole(req.params.userId, req.params.roleId);


      return res.json({ success: revoked });
    } catch (error) {
      console.error('Revoke role error:', error);
      return res.status(500).json({ error: 'Failed to revoke role' });
    }
  });

  // Get users assigned to a specific role
  app.get("/api/admin/rbac/roles/:roleId/users", ensureAdminAsync, requirePermission('manage_employees'), async (req, res) => {
    try {
      const users = await storage.getUsersByRoleId(req.params.roleId);
      return res.json({ users });
    } catch (error) {
      console.error("Get role users error:", error);
      return res.status(500).json({ error: "Failed to get users for role" });
    }
  });

  app.patch("/api/admin/rbac/users/:userId/roles/:roleId/approval-level", ensureAdminAsync, requirePermission('manage_employees'), async (req, res) => {
    try {
      const { userId, roleId } = req.params;
      const { approvalLevel } = req.body;
      const validLevels = ["none", "l1", "final", "both"];
      if (!validLevels.includes(approvalLevel)) {
        return res.status(400).json({ error: "Invalid approval level. Must be: none, l1, final, or both" });
      }
      const updated = await storage.updateUserApprovalLevel(userId, roleId, approvalLevel);
      if (!updated) {
        return res.status(404).json({ error: "Role assignment not found" });
      }
      return res.json({ success: true, approvalLevel });
    } catch (error) {
      console.error("Update approval level error:", error);
      return res.status(500).json({ error: "Failed to update approval level" });
    }
  });

  // Get task definitions
  app.get("/api/admin/rbac/tasks", ensureAdminAsync, requirePermission('manage_employees'), async (req, res) => {
    try {
      const tasks = await storage.getAllTaskDefinitions();


      return res.json({ tasks });
    } catch (error) {
      console.error('Get tasks error:', error);
      return res.status(500).json({ error: 'Failed to get task definitions' });
    }
  });

  // Get approval queue
  app.get("/api/admin/rbac/approvals", ensureAdminAsync, requirePermission('manage_employees'), async (req, res) => {
    try {
      const { status, initiatorId } = req.query;
      const queue = await storage.getApprovalQueue({
        status: status as string,
        initiatorId: initiatorId as string
      });


      return res.json({ queue });
    } catch (error) {
      console.error('Get approval queue error:', error);
      return res.status(500).json({ error: 'Failed to get approval queue' });
    }
  });

  // Get pending approvals for current user
  app.get("/api/admin/rbac/pending-approvals", ensureAdminAsync, requirePermission('manage_employees'), async (req, res) => {
    try {
      const pendingApprovals = await storage.getPendingApprovalsForUser(req.session?.userId || '');


      return res.json({ approvals: pendingApprovals });
    } catch (error) {
      console.error('Get pending approvals error:', error);
      return res.status(500).json({ error: 'Failed to get pending approvals' });
    }
  });

  // Get single approval item with history
  app.get("/api/admin/rbac/approvals/:id", ensureAdminAsync, requirePermission('manage_employees'), async (req, res) => {
    try {
      const approval = await storage.getApprovalQueueItem(req.params.id);
      if (!approval) {
        return res.status(404).json({ error: 'Approval not found' });
      }
      const history = await storage.getApprovalHistory(req.params.id);


      return res.json({ approval, history });
    } catch (error) {
      console.error('Get approval error:', error);
      return res.status(500).json({ error: 'Failed to get approval' });
    }
  });

  // Process approval (L1 approve, final approve, or reject)
  app.post("/api/admin/rbac/approvals/:id/process", ensureAdminAsync, requirePermission('manage_employees'), async (req, res) => {
    try {
      const { action, comments } = req.body;
      const approverId = req.session?.userId;
      
      if (!approverId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      if (!['approve_l1', 'approve_final', 'reject'].includes(action)) {
        return res.status(400).json({ error: 'Invalid action' });
      }
      
      const approval = await storage.getApprovalQueueItem(req.params.id);
      if (!approval) {
        return res.status(404).json({ error: 'Approval not found' });
      }
      
      if (approval.initiator_id === approverId) {
        return res.status(403).json({ error: 'Cannot approve your own request' });
      }
      
      let result;
      switch (action) {
        case 'approve_l1':
          result = await storage.approveL1(req.params.id, approverId, comments);
          break;
        case 'approve_final':
          result = await storage.approveFinal(req.params.id, approverId, comments);
          break;
        case 'reject':
          result = await storage.rejectApproval(req.params.id, approverId, comments || 'Rejected');
          break;
      }
      
      if (!result) {
        return res.status(400).json({ error: 'Failed to process approval' });
      }
      
      await storage.createApprovalHistory({
        approvalQueueId: req.params.id,
        action,
        actorId: approverId,
        comments,
        oldValue: { status: approval.status },
        newValue: { status: result.status },
        ipAddress: req.ip
      });
      


      return res.json({ approval: result });
    } catch (error) {
      console.error('Process approval error:', error);
      return res.status(500).json({ error: 'Failed to process approval' });
    }
  });

  // Create approval request
  app.post("/api/admin/rbac/approvals", ensureAdminAsync, requirePermission('manage_employees'), async (req, res) => {
    try {
      const { taskSlug, entityType, entityId, taskData, reason } = req.body;
      
      const taskDef = await storage.getTaskDefinitionBySlug(taskSlug);
      if (!taskDef) {
        return res.status(400).json({ error: 'Invalid task type' });
      }
      
      const expiresAt = taskDef.auto_expire_hours 
        ? new Date(Date.now() + taskDef.auto_expire_hours * 60 * 60 * 1000)
        : undefined;
      
      const approval = await storage.createApprovalRequest({
        taskDefinitionId: taskDef.id,
        initiatorId: req.session?.userId || '',
        entityType,
        entityId,
        taskData,
        reason,
        expiresAt
      });
      
      await storage.createApprovalHistory({
        approvalQueueId: approval.id,
        action: 'created',
        actorId: req.session?.userId || '',
        newValue: { taskData, reason }
      });
      


      return res.json({ approval });
    } catch (error) {
      console.error('Create approval error:', error);
      return res.status(500).json({ error: 'Failed to create approval request' });
    }
  });

  // ============================================================================
  // ADMIN FEATURE ROUTES - Audit, Revenue, Risk, Compliance, Operations
  // ============================================================================

  // Audit Trail
  app.get("/api/admin/sar-reports", ensureAdminAsync, requirePermission('view_kyc', 'manage_kyc'), async (req, res) => {
    try {
      const { status } = req.query;
      let reports = await db.select().from(sarReports)
        .orderBy(desc(sarReports.createdAt))
        .limit(100);
      
      if (status && status !== 'all') {
        reports = reports.filter(r => r.status === status);
      }
      
      const reportsWithUsers = await Promise.all(reports.map(async (report) => {
        const user = await storage.getUser(report.userId);
        return {
          ...report,
          user: user ? { firstName: user.firstName, lastName: user.lastName, email: user.email } : null,
        };
      }));
      


      return res.json({ reports: reportsWithUsers });
    } catch (error) {
      console.error('SAR reports error:', error);
      return res.status(500).json({ error: 'Failed to fetch SAR reports' });
    }
  });

  // Create SAR Report
  app.post("/api/admin/sar-reports", ensureAdminAsync, requirePermission('manage_kyc'), async (req, res) => {
    try {
      const adminUser = req.adminUser!;
      const { userId, incidentType, incidentDate, description, amountInvolved } = req.body;
      
      const reportNumber = `SAR-${Date.now()}`;
      
      const report = await db.insert(sarReports).values({
        userId,
        reportNumber,
        incidentDate: new Date(incidentDate),
        incidentType,
        description,
        amountInvolved: amountInvolved || null,
        status: 'draft',
        createdBy: adminUser?.id || '',
        // The sarReports schema requires several additional fields
        // (activityType, activityDescription, totalAmountInvolved,
        // dateRangeStart/End, reportingOfficer) that this admin endpoint
        // does not yet collect. Cast preserves prior runtime behavior
        // pending a proper insert-schema-aligned implementation.
      } as any).returning();
      


      return res.json({ report: report[0] });
    } catch (error) {
      console.error('Create SAR error:', error);
      return res.status(500).json({ error: 'Failed to create SAR report' });
    }
  });

  // Submit SAR Report
  app.post("/api/admin/sar-reports/:id/submit", ensureAdminAsync, requirePermission('manage_kyc'), async (req, res) => {
    try {
      const report = await db.update(sarReports)
        // `submittedAt`/`submittedTo` are not part of the sarReports schema
        // (the schema uses `filedAt`/`filedWithRegulator`/`regulatorReferenceNumber`).
        // Cast preserves prior runtime behavior pending alignment with the schema.
        .set({ 
          status: 'submitted',
          submittedAt: new Date(),
          submittedTo: 'DFSA',
        } as any)
        .where(eq(sarReports.id, req.params.id))
        .returning();
      


      return res.json({ report: report[0] });
    } catch (error) {
      console.error('Submit SAR error:', error);
      return res.status(500).json({ error: 'Failed to submit SAR report' });
    }
  });

  // Fraud Alerts
  app.get("/api/admin/fraud-alerts", ensureAdminAsync, requirePermission('view_kyc', 'manage_kyc'), async (req, res) => {
    try {
      const alerts = await db.select().from(fraudAlerts)
        .orderBy(desc(fraudAlerts.detectedAt))
        .limit(100);
      
      const alertsWithUsers = await Promise.all(alerts.map(async (alert) => {
        const user = await storage.getUser(alert.userId);
        return {
          ...alert,
          user: user ? { firstName: user.firstName, lastName: user.lastName, email: user.email } : null,
        };
      }));
      


      return res.json({ alerts: alertsWithUsers });
    } catch (error) {
      console.error('Fraud alerts error:', error);
      return res.status(500).json({ error: 'Failed to fetch fraud alerts' });
    }
  });

  // Scheduled Jobs
  app.get("/api/admin/scheduled-jobs", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      const jobs = [
        { id: '1', name: 'Database Backup Sync', description: 'Hourly AWS to Replit sync', cronExpression: '0 * * * *', status: 'active', runCount: 24, failCount: 0, lastRunAt: new Date(Date.now() - 3600000).toISOString(), lastRunDurationMs: 5000, nextRunAt: new Date(Date.now() + 3600000).toISOString() },
        { id: '2', name: 'Gold Price Update', description: 'Update gold prices from metals-api', cronExpression: '*/10 * * * *', status: 'active', runCount: 144, failCount: 2, lastRunAt: new Date(Date.now() - 600000).toISOString(), lastRunDurationMs: 1500, nextRunAt: new Date(Date.now() + 600000).toISOString() },
        { id: '3', name: 'BNSL Payout Processing', description: 'Process BNSL maturity payouts', cronExpression: '0 0 * * *', status: 'active', runCount: 30, failCount: 0, lastRunAt: new Date(Date.now() - 86400000).toISOString(), lastRunDurationMs: 10000, nextRunAt: new Date(Date.now() + 86400000).toISOString() },
        { id: '4', name: 'Session Cleanup', description: 'Clean expired sessions', cronExpression: '0 0 * * *', status: 'active', runCount: 30, failCount: 0, lastRunAt: new Date(Date.now() - 86400000).toISOString(), lastRunDurationMs: 2000, nextRunAt: new Date(Date.now() + 86400000).toISOString() },
        { id: '5', name: 'Email Queue Processor', description: 'Process pending email notifications', cronExpression: '*/5 * * * *', status: 'active', runCount: 288, failCount: 5, lastRunAt: new Date(Date.now() - 300000).toISOString(), lastRunDurationMs: 3000, nextRunAt: new Date(Date.now() + 300000).toISOString() },
      ];
      


      return res.json({ jobs });
    } catch (error) {
      console.error('Scheduled jobs error:', error);
      return res.status(500).json({ error: 'Failed to fetch scheduled jobs' });
    }
  });

  // System Logs
  app.get("/api/admin/system-logs", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      const { level, source, limit = 100 } = req.query;
      
      let logs = await db.select().from(systemLogs)
        .orderBy(desc(systemLogs.createdAt))
        .limit(Number(limit));
      
      if (level && level !== 'all') {
        logs = logs.filter(l => l.level === level);
      }
      if (source && source !== 'all') {
        logs = logs.filter(l => l.source === source);
      }
      


      return res.json({ logs });
    } catch (error) {
      console.error('System logs error:', error);
      return res.status(500).json({ error: 'Failed to fetch system logs' });
    }
  });

  // Settlement Queue
  app.get("/api/admin/regulatory-reports", ensureAdminAsync, requirePermission('view_reports', 'manage_kyc'), async (req, res) => {
    try {
      const { type, status } = req.query;
      
      let reports = await db.select().from(regulatoryReports)
        .orderBy(desc(regulatoryReports.createdAt))
        .limit(50);
      
      if (type && type !== 'all') {
        reports = reports.filter(r => r.reportType === type);
      }
      if (status && status !== 'all') {
        reports = reports.filter(r => r.status === status);
      }
      


      return res.json({ reports });
    } catch (error) {
      console.error('Regulatory reports error:', error);
      return res.status(500).json({ error: 'Failed to fetch regulatory reports' });
    }
  });

  // Generate Regulatory Report
  app.post("/api/admin/regulatory-reports/generate", ensureAdminAsync, requirePermission('generate_reports', 'manage_kyc'), async (req, res) => {
    try {
      const adminUser = req.adminUser!;
      const { reportType, reportPeriodStart, reportPeriodEnd, title, description } = req.body;
      
      const report = await db.insert(regulatoryReports).values({
        reportType,
        reportPeriodStart,
        reportPeriodEnd,
        title,
        description,
        status: 'generated',
        generatedBy: adminUser?.id,
        generatedAt: new Date(),
        summary: `${reportType} report for period ${reportPeriodStart} to ${reportPeriodEnd}`,
      }).returning();
      


      return res.json({ report: report[0] });
    } catch (error) {
      console.error('Generate regulatory report error:', error);
      return res.status(500).json({ error: 'Failed to generate regulatory report' });
    }
  });

  // Submit Regulatory Report
  app.post("/api/admin/regulatory-reports/:id/submit", ensureAdminAsync, requirePermission('manage_kyc'), async (req, res) => {
    try {
      const { submittedTo } = req.body;
      
      const report = await db.update(regulatoryReports)
        .set({
          status: 'submitted',
          submittedAt: new Date(),
          submittedTo,
        })
        .where(eq(regulatoryReports.id, req.params.id))
        .returning();
      


      return res.json({ report: report[0] });
    } catch (error) {
      console.error('Submit regulatory report error:', error);
      return res.status(500).json({ error: 'Failed to submit regulatory report' });
    }
  });


  // ============================================
  // ANNOUNCEMENTS API
  // ============================================

  // Get all announcements (admin)
  app.get("/api/admin/announcements", ensureAdminAsync, requirePermission('view_cms', 'manage_cms'), async (req, res) => {
    try {
      const allAnnouncements = await db.select().from(announcements).orderBy(desc(announcements.createdAt));
      return res.json(allAnnouncements);
    } catch (error) {
      console.error('Get announcements error:', error);
      return res.status(500).json({ error: 'Failed to get announcements' });
    }
  });

  // Create announcement
  app.post("/api/admin/announcements", ensureAdminAsync, requirePermission('manage_cms'), async (req, res) => {
    try {
      const adminUser = req.adminUser!;
      const { title, message, type, target, showBanner, startDate, endDate } = req.body;
      
      const announcement = await db.insert(announcements).values({
        title,
        message,
        type: type || 'info',
        target: target || 'all',
        showBanner: showBanner !== false,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        createdBy: adminUser?.id,
      }).returning();
      
      return res.json(announcement[0]);
    } catch (error) {
      console.error('Create announcement error:', error);
      return res.status(500).json({ error: 'Failed to create announcement' });
    }
  });

  // Update announcement
  app.patch("/api/admin/announcements/:id", ensureAdminAsync, requirePermission('manage_cms'), async (req, res) => {
    try {
      const { title, message, type, target, isActive, showBanner, startDate, endDate } = req.body;
      
      const updateData: any = { updatedAt: new Date() };
      if (title !== undefined) updateData.title = title;
      if (message !== undefined) updateData.message = message;
      if (type !== undefined) updateData.type = type;
      if (target !== undefined) updateData.target = target;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (showBanner !== undefined) updateData.showBanner = showBanner;
      if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
      if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
      
      const updated = await db.update(announcements)
        .set(updateData)
        .where(eq(announcements.id, req.params.id))
        .returning();
      
      return res.json(updated[0]);
    } catch (error) {
      console.error('Update announcement error:', error);
      return res.status(500).json({ error: 'Failed to update announcement' });
    }
  });

  // Delete announcement
  app.delete("/api/admin/announcements/:id", ensureAdminAsync, requirePermission('manage_cms'), async (req, res) => {
    try {
      await db.delete(announcements).where(eq(announcements.id, req.params.id));


      return res.json({ success: true });
    } catch (error) {
      console.error('Delete announcement error:', error);
      return res.status(500).json({ error: 'Failed to delete announcement' });
    }
  });

  // Get active announcements for users (public, filtered by target)
  app.get("/api/announcements", async (req, res) => {
    try {
      const user = req.user;
      const now = new Date();
      
      let targetFilters = ['all'];
      if (user) {
        targetFilters.push('users');
        if (user.accountType === 'business') {
          targetFilters.push('business');
        }
        if (user.role === 'admin') {
          targetFilters.push('admins');
        }
      }
      
      const activeAnnouncements = await db.select()
        .from(announcements)
        .where(
          and(
            eq(announcements.isActive, true),
            inArray(announcements.target, targetFilters as ("business" | "users" | "all" | "admins")[]),
            or(
              isNull(announcements.startDate),
              lte(announcements.startDate, now)
            ),
            or(
              isNull(announcements.endDate),
              gte(announcements.endDate, now)
            )
          )
        )
        .orderBy(desc(announcements.createdAt));
      
      return res.json(activeAnnouncements);
    } catch (error) {
      console.error('Get active announcements error:', error);
      return res.status(500).json({ error: 'Failed to get announcements' });
    }
  });


  // ============================================================================
  // WORKFLOW AUDIT ENDPOINTS (Admin)
  // ============================================================================
  
  // Get workflow audit summaries with filtering
  app.get("/api/admin/workflow-audit/summaries", ensureAdminAsync, requirePermission('view_reports'), async (req, res) => {
    try {
      const { flowType, result, userId, limit } = req.query;
      
      const summaries = await workflowAuditService.getFlowSummaries({
        flowType: flowType as FlowType | undefined,
        overallResult: result as 'PASS' | 'FAIL' | undefined,
        userId: userId as string | undefined,
        limit: limit ? parseInt(limit as string) : 100,
      });
      


      return res.json({ summaries });
    } catch (error: any) {
      console.error('Get workflow audit summaries error:', error);
      return res.status(500).json({ error: error.message || 'Failed to get summaries' });
    }
  });
  
  // Get workflow audit details for a specific flow instance
  app.get("/api/admin/workflow-audit/flow/:flowInstanceId", ensureAdminAsync, requirePermission('view_reports'), async (req, res) => {
    try {
      const { flowInstanceId } = req.params;
      
      const details = await workflowAuditService.getFlowDetails(flowInstanceId);
      
      if (!details.summary) {
        return res.status(404).json({ error: 'Flow not found' });
      }
      
      return res.json(details);
    } catch (error: any) {
      console.error('Get workflow audit details error:', error);
      return res.status(500).json({ error: error.message || 'Failed to get details' });
    }
  });
  
  // Compare a flow against expected steps
  app.get("/api/admin/workflow-audit/compare/:flowInstanceId", ensureAdminAsync, requirePermission('view_reports'), async (req, res) => {
    try {
      const { flowInstanceId } = req.params;
      
      const comparison = await workflowAuditService.compareFlow(flowInstanceId);
      
      return res.json(comparison);
    } catch (error: any) {
      console.error('Compare workflow flow error:', error);
      return res.status(500).json({ error: error.message || 'Failed to compare' });
    }
  });
  
  // Get expected steps for a flow type (for reference)
  app.get("/api/admin/workflow-audit/expected-steps/:flowType", ensureAdminAsync, requirePermission('view_reports'), async (req, res) => {
    try {
      const flowType = req.params.flowType as FlowType;
      
      const expectedSteps = workflowAuditService.getExpectedSteps(flowType);
      
      if (expectedSteps.length === 0) {
        return res.status(404).json({ error: 'Flow type not found' });
      }
      


      return res.json({ flowType, expectedSteps });
    } catch (error: any) {
      console.error('Get expected steps error:', error);
      return res.status(500).json({ error: error.message || 'Failed to get expected steps' });
    }
  });
  
  // Get workflow audit statistics
  app.get("/api/admin/workflow-audit/stats", ensureAdminAsync, requirePermission('view_reports'), async (req, res) => {
    try {
      const allSummaries = await workflowAuditService.getFlowSummaries({ limit: 1000 });
      
      const stats = {
        total: allSummaries.length,
        passed: allSummaries.filter(s => s.overallResult === 'PASS').length,
        failed: allSummaries.filter(s => s.overallResult === 'FAIL').length,
        pending: allSummaries.filter(s => s.overallResult === 'PENDING').length,
        byFlowType: {} as Record<string, { total: number; passed: number; failed: number }>,
      };
      
      for (const summary of allSummaries) {
        if (!stats.byFlowType[summary.flowType]) {
          stats.byFlowType[summary.flowType] = { total: 0, passed: 0, failed: 0 };
        }
        stats.byFlowType[summary.flowType].total++;
        if (summary.overallResult === 'PASS') stats.byFlowType[summary.flowType].passed++;
        if (summary.overallResult === 'FAIL') stats.byFlowType[summary.flowType].failed++;
      }
      
      return res.json(stats);
    } catch (error: any) {
      console.error('Get workflow audit stats error:', error);
      return res.status(500).json({ error: error.message || 'Failed to get stats' });
    }
  });


  // ============================================================================
  // PRICE ALERTS CRUD (User-authenticated routes)
  // ============================================================================

  // GET /api/price-alerts - List user's price alerts
  // GET /api/reports - List user's report exports with pagination
  app.get("/api/reports", ensureAuthenticated, async (req, res) => {
    try {
      const sessionUserId = req.session?.userId;
      if (!sessionUserId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
      const offset = (page - 1) * limit;

      const reports = await db
        .select()
        .from(reportExports)
        .where(eq(reportExports.userId, sessionUserId))
        .orderBy(desc(reportExports.createdAt))
        .limit(limit)
        .offset(offset);

      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(reportExports)
        .where(eq(reportExports.userId, sessionUserId));

      const total = Number(countResult?.count || 0);

      return res.json({
        reports,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      console.error("List reports error:", error);
      return res.status(500).json({ message: error.message || "Failed to list reports" });
    }
  });

  // POST /api/reports/generate - Create a new report export request
  app.get("/api/user/bank-accounts", ensureAuthenticated, async (req, res) => {
    try {
      const accounts = await storage.getUserBankAccounts(req.session.userId!);
      return res.json(accounts);
    } catch (error: any) {
      console.error("Get bank accounts error:", error);
      return res.status(500).json({ message: "Failed to retrieve bank accounts" });
    }
  });

  app.post("/api/user/bank-accounts", ensureAuthenticated, async (req, res) => {
    try {
      const account = await storage.createUserBankAccount({
        ...req.body,
        userId: req.session.userId!
      });
      return res.status(201).json(account);
    } catch (error: any) {
      console.error("Create bank account error:", error);
      return res.status(500).json({ message: "Failed to create bank account" });
    }
  });

  app.put("/api/user/bank-accounts/:id", ensureAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const existing = await storage.getUserBankAccount(id);
      if (!existing || existing.userId !== req.session.userId) {
        return res.status(404).json({ message: "Bank account not found" });
      }
      const updated = await storage.updateUserBankAccount(id, req.body);
      return res.json(updated);
    } catch (error: any) {
      console.error("Update bank account error:", error);
      return res.status(500).json({ message: "Failed to update bank account" });
    }
  });

  app.delete("/api/user/bank-accounts/:id", ensureAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const existing = await storage.getUserBankAccount(id);
      if (!existing || existing.userId !== req.session.userId) {
        return res.status(404).json({ message: "Bank account not found" });
      }
      await storage.deleteUserBankAccount(id);
      return res.json({ success: true });
    } catch (error: any) {
      console.error("Delete bank account error:", error);
      return res.status(500).json({ message: "Failed to delete bank account" });
    }
  });

  // ===========================================================================
  // User Crypto Wallets (Payment Methods)
  // ===========================================================================
  
  app.get("/api/user/crypto-wallets", ensureAuthenticated, async (req, res) => {
    try {
      const wallets = await storage.getUserCryptoWallets(req.session.userId!);
      return res.json(wallets);
    } catch (error: any) {
      console.error("Get crypto wallets error:", error);
      return res.status(500).json({ message: "Failed to retrieve crypto wallets" });
    }
  });

  app.post("/api/user/crypto-wallets", ensureAuthenticated, async (req, res) => {
    try {
      const wallet = await storage.createUserCryptoWallet({
        ...req.body,
        userId: req.session.userId!
      });
      return res.status(201).json(wallet);
    } catch (error: any) {
      console.error("Create crypto wallet error:", error);
      return res.status(500).json({ message: "Failed to create crypto wallet" });
    }
  });

  app.put("/api/user/crypto-wallets/:id", ensureAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const existing = await storage.getUserCryptoWallet(id);
      if (!existing || existing.userId !== req.session.userId) {
        return res.status(404).json({ message: "Crypto wallet not found" });
      }
      const updated = await storage.updateUserCryptoWallet(id, req.body);
      return res.json(updated);
    } catch (error: any) {
      console.error("Update crypto wallet error:", error);
      return res.status(500).json({ message: "Failed to update crypto wallet" });
    }
  });

  app.delete("/api/user/crypto-wallets/:id", ensureAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const existing = await storage.getUserCryptoWallet(id);
      if (!existing || existing.userId !== req.session.userId) {
        return res.status(404).json({ message: "Crypto wallet not found" });
      }
      await storage.deleteUserCryptoWallet(id);
      return res.json({ success: true });
    } catch (error: any) {
      console.error("Delete crypto wallet error:", error);
      return res.status(500).json({ message: "Failed to delete crypto wallet" });
    }
  });

  // ===========================================================================
  // Organizational Chart
  // ===========================================================================
  
  app.get("/api/admin/org-chart", ensureAdminAsync, requirePermission('manage_employees'), async (req, res) => {
    try {
      const positions = await db.select().from(orgPositions).orderBy(orgPositions.level, orgPositions.order);
      return res.json(positions);
    } catch (error: any) {
      console.error("Get org chart error:", error);
      return res.status(500).json({ message: "Failed to retrieve org chart" });
    }
  });

  app.post("/api/admin/org-chart", ensureAdminAsync, requirePermission('manage_employees'), async (req, res) => {
    try {
      const [position] = await db.insert(orgPositions).values(req.body).returning();
      return res.status(201).json(position);
    } catch (error: any) {
      console.error("Create org position error:", error);
      return res.status(500).json({ message: "Failed to create position" });
    }
  });

  app.post("/api/admin/org-chart/seed", ensureAdminAsync, requirePermission('manage_employees'), async (req, res) => {
    try {
      const defaultPositions = [
        { name: 'CEO', title: 'Chief Executive Officer', department: 'Executive', level: 0, order: 0 },
        { name: 'COO', title: 'Chief Operating Officer', department: 'Operations', level: 1, order: 0 },
        { name: 'CFO', title: 'Chief Financial Officer', department: 'Finance', level: 1, order: 1 },
        { name: 'CTO', title: 'Chief Technology Officer', department: 'Technology', level: 1, order: 2 },
        { name: 'CCO', title: 'Chief Compliance Officer', department: 'Compliance', level: 1, order: 3 },
        { name: 'Head of Support', title: 'Customer Service Manager', department: 'Customer Service', level: 2, order: 0 },
        { name: 'Lead Developer', title: 'Senior Software Engineer', department: 'Technology', level: 2, order: 1 },
        { name: 'Finance Manager', title: 'Senior Accountant', department: 'Finance', level: 2, order: 2 },
      ];
      const positions = await db.insert(orgPositions).values(defaultPositions).returning();
      return res.status(201).json(positions);
    } catch (error: any) {
      console.error("Seed org chart error:", error);
      return res.status(500).json({ message: "Failed to seed org chart" });
    }
  });

  app.put("/api/admin/org-chart/:id", ensureAdminAsync, requirePermission('manage_employees'), async (req, res) => {
    try {
      const { id } = req.params;
      const [updated] = await db.update(orgPositions)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(orgPositions.id, id))
        .returning();
      if (!updated) return res.status(404).json({ message: "Position not found" });
      return res.json(updated);
    } catch (error: any) {
      console.error("Update org position error:", error);
      return res.status(500).json({ message: "Failed to update position" });
    }
  });

  app.delete("/api/admin/org-chart/:id", ensureAdminAsync, requirePermission('manage_employees'), async (req, res) => {
    try {
      const { id } = req.params;
      await db.delete(orgPositions).where(eq(orgPositions.id, id));
      return res.json({ success: true });
    } catch (error: any) {
      console.error("Delete org position error:", error);
      return res.status(500).json({ message: "Failed to delete position" });
    }
  });


  // PDF Download endpoint for Clawd Integration Guide
  app.get("/api/docs/clawd-guide/download", async (req, res) => {
    try {
      const puppeteer = await import('puppeteer');
      const pathModule = await import('path');
      const fsModule = await import('fs');
      
      const htmlPath = pathModule.default.join(process.cwd(), 'public', 'clawd-integration-guide.html');
      
      if (!fsModule.default.existsSync(htmlPath)) {
        return res.status(404).json({ message: "Guide not found" });
      }
      
      const browser = await puppeteer.default.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      
      const htmlContent = fsModule.default.readFileSync(htmlPath, 'utf-8');
      
      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers.host;
      const baseUrl = `${protocol}://${host}`;
      
      const htmlWithAbsoluteUrls = htmlContent
        .replace(/src="\//g, `src="${baseUrl}/`)
        .replace(/href="\//g, `href="${baseUrl}/`);
      
      await page.setContent(htmlWithAbsoluteUrls, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' }
      });
      
      await browser.close();
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="Finatrades-Clawd-Integration-Guide.pdf"');
      return res.send(pdfBuffer);
      
    } catch (error: any) {
      console.error("PDF generation error:", error);
      return res.status(500).json({ message: "Failed to generate PDF", error: error.message });
    }
  });

  // Email Clawd Integration Guide as PDF
  app.post("/api/docs/clawd-guide/email", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      const { recipientEmail, recipientName, customMessage } = req.body;
      
      if (!recipientEmail) {
        return res.status(400).json({ message: "Recipient email is required" });
      }
      
      const puppeteer = await import('puppeteer');
      const pathModule = await import('path');
      const fsModule = await import('fs');
      const { sendEmailWithAttachment } = await import('./email');
      
      const htmlPath = pathModule.default.join(process.cwd(), 'public', 'clawd-integration-guide.html');
      
      if (!fsModule.default.existsSync(htmlPath)) {
        return res.status(404).json({ message: "Guide not found" });
      }
      
      // Generate PDF
      const browser = await puppeteer.default.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      const htmlContent = fsModule.default.readFileSync(htmlPath, 'utf-8');
      
      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers.host;
      const baseUrl = `${protocol}://${host}`;
      
      const htmlWithAbsoluteUrls = htmlContent
        .replace(/src="\//g, `src="${baseUrl}/`)
        .replace(/href="\//g, `href="${baseUrl}/`);
      
      await page.setContent(htmlWithAbsoluteUrls, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' }
      });
      
      await browser.close();
      
      // Create professional email HTML
      const greeting = recipientName ? `Dear ${recipientName}` : 'Dear Partner';
      const message = customMessage || 'We are pleased to share our comprehensive AI Integration Guide for your review.';
      
      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; }
    .header { background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%); padding: 40px 30px; text-align: center; }
    .header img { height: 50px; margin-bottom: 15px; }
    .header h1 { color: white; margin: 0; font-size: 24px; font-weight: 600; }
    .header p { color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 14px; }
    .content { padding: 40px 30px; }
    .content h2 { color: #8B5CF6; margin-top: 0; }
    .highlight-box { background: linear-gradient(135deg, #f5f3ff 0%, #fdf2f8 100%); border-left: 4px solid #8B5CF6; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0; }
    .features { margin: 25px 0; }
    .feature { display: flex; align-items: center; margin: 12px 0; }
    .feature-icon { width: 24px; height: 24px; background: #8B5CF6; color: white; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-right: 12px; font-size: 12px; }
    .cta-button { display: inline-block; background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; }
    .footer { background: #1a1a2e; color: #888; padding: 30px; text-align: center; font-size: 12px; }
    .footer a { color: #8B5CF6; }
    .divider { height: 1px; background: #eee; margin: 25px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>FINATRADES</h1>
      <p>Gold-Backed Digital Financial Platform</p>
    </div>
    
    <div class="content">
      <h2>Clawd.bot AI Integration Guide</h2>
      
      <p>${greeting},</p>
      
      <p>${message}</p>
      
      <div class="highlight-box">
        <strong>📎 Attached Document:</strong><br>
        <span style="color: #666;">Finatrades-Clawd-Integration-Guide.pdf</span><br>
        <small style="color: #999;">Comprehensive 12-page technical blueprint</small>
      </div>
      
      <p>This guide covers:</p>
      
      <div class="features">
        <div class="feature">
          <span class="feature-icon">✓</span>
          <span>System Architecture & Integration Overview</span>
        </div>
        <div class="feature">
          <span class="feature-icon">✓</span>
          <span>Product Integration Matrix (FinaVault, FinaPay, FinaBridge, BNSL)</span>
        </div>
        <div class="feature">
          <span class="feature-icon">✓</span>
          <span>Step-by-Step Setup & Configuration</span>
        </div>
        <div class="feature">
          <span class="feature-icon">✓</span>
          <span>Automated Workflows & Scheduling</span>
        </div>
        <div class="feature">
          <span class="feature-icon">✓</span>
          <span>Security & Compliance Considerations</span>
        </div>
      </div>
      
      <div class="divider"></div>
      
      <p>If you have any questions about the integration or would like to schedule a technical discussion, please don't hesitate to reach out.</p>
      
      <p>Best regards,<br>
      <strong>Finatrades Technology Team</strong></p>
    </div>
    
    <div class="footer">
      <p>© 2026 Finatrades. All rights reserved.</p>
      <p>This email contains confidential information intended for the recipient only.</p>
    </div>
  </div>
</body>
</html>`;
      
      // Send email with PDF attachment
      const result = await sendEmailWithAttachment(
        recipientEmail,
        'Finatrades AI Integration Guide - Clawd.bot Implementation Blueprint',
        emailHtml,
        [{
          filename: 'Finatrades-Clawd-Integration-Guide.pdf',
          content: Buffer.from(pdfBuffer),
          contentType: 'application/pdf'
        }]
      );
      
      if (result.success) {
        return res.json({ 
          success: true, 
          message: `Guide sent successfully to ${recipientEmail}`,
          messageId: result.messageId 
        });
      } else {
        return res.status(500).json({ message: "Failed to send email" });
      }
      
    } catch (error: any) {
      console.error("Email guide error:", error);
      return res.status(500).json({ message: "Failed to send guide", error: error.message });
    }
  });

  // ============================================
  // EMAIL UNSUBSCRIBE (public, no auth required)
  // ============================================
  app.get("/api/unsubscribe", async (req: Request, res: Response) => {
    const token = typeof req.query.token === 'string' ? req.query.token : '';
    const result = verifyUnsubscribeToken(token);

    const successHtml = (email: string) => `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Unsubscribed — FinaTrades</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0f0720;color:#e2e8f0;margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;}
.card{background:#1a0d3a;border:1px solid #4B0082;border-radius:16px;padding:48px 40px;max-width:480px;text-align:center;}
.logo{font-size:22px;font-weight:700;color:#8A2BE2;letter-spacing:-0.5px;margin-bottom:32px;}
h1{font-size:24px;font-weight:600;color:#fff;margin:0 0 12px;}
p{color:#A78BFA;font-size:15px;line-height:1.6;margin:0 0 24px;}
.email{font-size:13px;color:#6b7280;word-break:break-all;}
a{color:#8A2BE2;text-decoration:none;}a:hover{text-decoration:underline;}
</style></head><body><div class="card">
<div class="logo">FinaTrades</div>
<h1>You have been unsubscribed</h1>
<p>You will no longer receive marketing emails from FinaTrades Finance SA.</p>
<p class="email">${email}</p>
<p style="font-size:13px;">You can re-enable marketing emails at any time in your <a href="/settings">account settings</a>.</p>
</div></body></html>`;

    const errorHtml = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Invalid Link — FinaTrades</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0f0720;color:#e2e8f0;margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;}
.card{background:#1a0d3a;border:1px solid #4B0082;border-radius:16px;padding:48px 40px;max-width:480px;text-align:center;}
.logo{font-size:22px;font-weight:700;color:#8A2BE2;letter-spacing:-0.5px;margin-bottom:32px;}
h1{font-size:24px;font-weight:600;color:#fff;margin:0 0 12px;}
p{color:#A78BFA;font-size:15px;line-height:1.6;margin:0;}
a{color:#8A2BE2;text-decoration:none;}a:hover{text-decoration:underline;}
</style></head><body><div class="card">
<div class="logo">FinaTrades</div>
<h1>Invalid or expired link</h1>
<p>This unsubscribe link is invalid or has expired. Please <a href="/settings">visit your settings</a> to manage email preferences.</p>
</div></body></html>`;

    if (!result.valid || !result.email) {
      return res.status(400).send(errorHtml);
    }

    try {
      const user = await storage.getUserByEmail(result.email);
      if (user) {
        await storage.getOrCreateUserPreferences(user.id);
        await storage.updateUserPreferences(user.id, { marketingEmails: false });
      }
      return res.status(200).send(successHtml(result.email));
    } catch (err) {
      console.error('[Unsubscribe] Failed to process unsubscribe:', err);
      return res.status(500).send(errorHtml);
    }
  });

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const userId = req.session?.userId;
    const route = `${req.method} ${req.originalUrl}`;

    console.error(`[API Error] ${route}:`, errorMessage);

    notifyError({
      error: err instanceof Error ? err : new Error(errorMessage),
      context: 'Unhandled API Error',
      route,
      userId: userId || undefined,
      requestData: {
        method: req.method,
        path: req.originalUrl,
        userAgent: req.headers['user-agent'],
        ip: req.ip,
      },
    });

    if (!res.headersSent) {
      return res.status(500).json({ message: 'Something went wrong. Our team has been notified.' });
    }
    return undefined;
  });

  return httpServer;
}
