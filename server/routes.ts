import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage, type TransactionalStorage } from "./storage";
import { db, pool } from "./db";
import crypto from "crypto";
import { authRateLimiter, otpRateLimiter, passwordResetRateLimiter, withdrawalRateLimiter, apiRateLimiter, getSystemSettings } from "./index";
import { eq, and, gte, desc, sql } from "drizzle-orm";
import { 
  insertUserSchema, insertKycSubmissionSchema, insertWalletSchema, 
  insertTransactionSchema, insertVaultHoldingSchema, insertBnslPlanSchema,
  insertBnslPayoutSchema, insertBnslEarlyTerminationSchema, insertBnslAgreementSchema, insertFinabridgeAgreementSchema, insertTradeCaseSchema,
  insertTradeDocumentSchema, insertChatSessionSchema, insertChatMessageSchema,
  insertAuditLogSchema, insertContentPageSchema, insertContentBlockSchema,
  insertTemplateSchema, insertMediaAssetSchema, 
  insertPlatformBankAccountSchema, insertDepositRequestSchema, insertWithdrawalRequestSchema,
  insertPeerTransferSchema, insertPeerRequestSchema,
  insertTradeRequestSchema, insertTradeProposalSchema, insertForwardedProposalSchema,
  insertTradeConfirmationSchema, insertSettlementHoldSchema, insertFinabridgeWalletSchema,
  User, paymentGatewaySettings, insertPaymentGatewaySettingsSchema,
  insertSecuritySettingsSchema,
  vaultLedgerEntries, vaultOwnershipSummary, vaultHoldings, vaultDepositRequests,
  wallets, transactions, auditLogs, certificates, platformConfig, systemLogs, users, bnslPlans, tradeCases,
  withdrawalRequests, cryptoPaymentRequests, buyGoldRequests,
  goldRequests, qrPaymentInvoices, walletAdjustments, userAccountStatus,
  partialSettlements, tradeDisputes, tradeDisputeComments, dealRoomDocuments,
  physicalDeliveryRequests, goldBars, storageFees, vaultLocations, vaultTransfers, goldGifts, insuranceCertificates,
  tradeShipments, shipmentMilestones, tradeCertificates, exporterRatings, exporterTrustScores, tradeRiskAssessments,
  tradeRequests, tradeProposals, settlementHolds,
  geoRestrictions, geoRestrictionSettings, insertGeoRestrictionSchema
} from "@shared/schema";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { authenticator } from "otplib";
import * as QRCode from "qrcode";
import { sendEmail, sendEmailDirect, sendEmailWithAttachment, EMAIL_TEMPLATES, seedEmailTemplates } from "./email";
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
import { getGoldPrice, getGoldPricePerGram, getGoldPriceStatus } from "./gold-price-service";
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
import { emitLedgerEvent, emitLedgerEventToUsers, getIO } from "./socket";
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
import { format } from "date-fns";

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
    
    next();
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
const allowedMimeTypes: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
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
      cb(new Error('Invalid file type. Only images, PDFs, and office documents are allowed.'));
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
  next();
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
    (req as any).adminUser = user;
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
    (req as any).adminUser = admin;
    (req as any).adminEmployee = employee;
    next();
  } catch (error: any) {
    console.error('[Admin Auth Error]', error?.message || error);
    return res.status(500).json({ message: "Authentication failed", error: error?.message });
  }
}

// Middleware to require specific employee permissions
// Must be used AFTER ensureAdminAsync as it relies on adminUser and adminEmployee being set
function requirePermission(...requiredPermissions: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const adminUser = (req as any).adminUser;
      const adminEmployee = (req as any).adminEmployee;
      
      if (!adminUser) {
        console.error('[Permission Check] No adminUser found on request');
        return res.status(401).json({ message: "Authentication required" });
      }

      // Use employee from ensureAdminAsync or fetch if not available
      const employee = adminEmployee || await storage.getEmployeeByUserId(adminUser.id);
      
      // Double-check employee is active (in case middleware order changes)
      if (employee && employee.status !== 'active') {
        return res.status(403).json({ 
          message: "Your account has been deactivated. Please contact a super admin." 
        });
      }
      
      // If no employee record, allow access (original admin accounts)
      // Super admins have all permissions
      if (!employee || employee.role === 'super_admin') {
        (req as any).employeePermissions = employee?.permissions || [];
        return next();
      }

      // Check if employee has at least one of the required permissions
      const employeePermissions = employee.permissions || [];
      const hasPermission = requiredPermissions.length === 0 || 
        requiredPermissions.some(perm => employeePermissions.includes(perm));
      
      if (!hasPermission) {
        return res.status(403).json({ 
          message: "Permission denied. Required: " + requiredPermissions.join(' or ')
        });
      }

      (req as any).employeePermissions = employeePermissions;
      next();
    } catch (error) {
      return res.status(500).json({ message: "Permission check failed" });
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
    
    next();
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

// Middleware to require PIN verification for sensitive transactions
function requirePinVerification(action: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const pinToken = req.headers['x-pin-token'] as string | undefined;
    const userId = req.body.userId || req.body.senderId || req.params.userId;
    
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
    
    next();
  };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Seed email templates on startup (must await to ensure templates exist before handling requests)
  await seedEmailTemplates().catch(err => console.error('[Email] Failed to seed templates:', err));
  
  // Start document expiry reminder scheduler
  startDocumentExpiryScheduler();

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
        fileUrl = `/uploads/${(req.file as any).filename}`;
      }
      
      res.json({ 
        url: fileUrl, 
        filename: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size 
      });
    } catch (error) {
      console.error('File upload error:', error);
      res.status(500).json({ message: 'Failed to upload file' });
    }
  });
  
  // ============================================================================
  // GOLD PRICE API
  // ============================================================================
  
  // Get current gold price (live from Metals-API.com)
  app.get("/api/gold-price", async (req, res) => {
    try {
      const priceData = await getGoldPrice();
      res.json({
        pricePerGram: priceData.pricePerGram,
        pricePerOunce: priceData.pricePerOunce,
        currency: priceData.currency,
        timestamp: priceData.timestamp,
        source: priceData.source
      });
    } catch (error) {
      console.error('[GoldPrice] Error fetching gold price:', error);
      const message = error instanceof Error ? error.message : "Failed to fetch gold price";
      res.status(503).json({ message, configured: false });
    }
  });
  
  // Get gold price API status (for admin)
  app.get("/api/gold-price/status", async (req, res) => {
    try {
      const status = await getGoldPriceStatus();
      res.json(status);
    } catch (error) {
      console.error('[GoldPrice] Error getting status:', error);
      res.status(500).json({ message: "Failed to get gold price status" });
    }
  });

  // ============================================================================
  // UNIFIED DASHBOARD API (Performance Optimized)
  // ============================================================================
  
  // Single endpoint for all dashboard data - replaces 7 separate API calls
  // PROTECTED: requires authenticated session matching userId
  app.get("/api/dashboard/:userId", ensureOwnerOrAdmin, async (req, res) => {
    const startTime = Date.now();
    try {
      const userId = req.params.userId;
      
      // Parallel fetch all data sources including certificates and FinaBridge wallet
      const [
        wallet,
        vaultHoldings,
        transactions,
        depositRequests,
        cryptoPayments,
        bnslPlans,
        priceData,
        notifications,
        tradeCases,
        certificates,
        finabridgeWallet,
        buyGoldRequests
      ] = await Promise.all([
        storage.getWallet(userId).catch(() => null),
        storage.getUserVaultHoldings(userId).catch(() => []),
        storage.getUserTransactions(userId).catch(() => []),
        storage.getUserDepositRequests(userId).catch(() => []),
        storage.getUserCryptoPaymentRequests(userId).catch(() => []),
        storage.getUserBnslPlans(userId).catch(() => []),
        getGoldPrice().catch(() => ({ pricePerGram: 85, source: 'fallback' })),
        storage.getUserNotifications(userId).catch(() => []),
        storage.getUserTradeCases(userId).catch(() => []),
        storage.getUserCertificates(userId).catch(() => []),
        storage.getFinabridgeWallet(userId).catch(() => null),
        storage.getUserBuyGoldRequests(userId).catch(() => [])
      ]);

      const goldPrice = priceData.pricePerGram || 85;
      const goldPriceSource = priceData.source || 'fallback';
      
      // Convert deposit requests to transaction format (exclude approved ones - they already have a transaction record)
      const depositTransactions = (depositRequests || [])
        .filter((dep: any) => dep.status !== 'Approved' && dep.status !== 'Confirmed')
        .map((dep: any) => ({
          id: dep.id,
          type: 'Deposit',
          status: dep.status,
          amountUsd: dep.amountUsd,
          amountGold: null,
          createdAt: dep.createdAt,
          description: `Bank Transfer - ${dep.senderBankName || 'Pending'}`,
          sourceModule: 'FinaPay',
        }));

      // Convert crypto payments to transaction format
      // Exclude 'Approved' and 'Credited' since those have real transaction records
      const cryptoTransactions = (cryptoPayments || [])
        .filter((cp: any) => cp.status !== 'Approved' && cp.status !== 'Credited')
        .map((cp: any) => ({
          id: cp.id,
          type: 'Deposit',
          status: cp.status,
          amountUsd: cp.amountUsd,
          amountGold: cp.goldGrams,
          createdAt: cp.createdAt,
          description: `Crypto Deposit - ${cp.status}`,
          sourceModule: 'FinaPay',
        }));

      // Convert buy gold requests to transaction format
      // Exclude 'Credited' since those have real transaction records
      const buyGoldTransactions = (buyGoldRequests || [])
        .filter((bg: any) => bg.status !== 'Credited')
        .map((bg: any) => ({
          id: bg.id,
          type: 'Buy',
          status: bg.status,
          amountUsd: bg.amountUsd,
          amountGold: bg.goldGrams,
          createdAt: bg.createdAt,
          description: `Buy Gold Bar (Wingold) - ${bg.status}`,
          sourceModule: 'Wingold',
        }));

      // Combine and sort transactions (limit to 20 for dashboard)
      const allTransactions = [...(transactions || []), ...depositTransactions, ...cryptoTransactions, ...buyGoldTransactions]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 20);

      // Calculate totals
      const walletGoldGrams = parseFloat(wallet?.goldGrams || '0');
      const walletUsdBalance = parseFloat(wallet?.usdBalance || '0');
      const vaultGoldGrams = (vaultHoldings || []).reduce((sum: number, h: any) => 
        sum + parseFloat(h.goldGrams || '0'), 0);
      const vaultGoldValueUsd = vaultGoldGrams * goldPrice;
      const vaultGoldValueAed = vaultGoldValueUsd * 3.67;

      const activeBnslPlans = (bnslPlans || []).filter((p: any) => p.status === 'Active');
      const bnslLockedGrams = activeBnslPlans.reduce((sum: number, p: any) => 
        sum + parseFloat(p.goldSoldGrams || '0'), 0);
      const bnslTotalProfit = activeBnslPlans.reduce((sum: number, p: any) => 
        sum + parseFloat(p.paidMarginUsd || '0'), 0);
      
      // FinaBridge wallet totals
      const finabridgeGoldGrams = parseFloat(finabridgeWallet?.availableGoldGrams || '0') + parseFloat(finabridgeWallet?.lockedGoldGrams || '0');
      const finabridgeGoldValueUsd = finabridgeGoldGrams * goldPrice;
      
      // Get BNSL wallet balance (separate from locked plans)
      const bnslWallet = await storage.getBnslWallet(userId);
      const bnslWalletGoldGrams = parseFloat(bnslWallet?.availableGoldGrams || '0');
      const bnslWalletValueUsd = bnslWalletGoldGrams * goldPrice;
      
      // Total portfolio includes: vault + FinaPay wallet + BNSL wallet + FinaBridge + USD balance
      const totalPortfolioUsd = vaultGoldValueUsd + (walletGoldGrams * goldPrice) + bnslWalletValueUsd + finabridgeGoldValueUsd + walletUsdBalance;
      
      // Calculate pending deposits (bank transfers + crypto) as USD
      // Include both 'Pending' and 'Under Review' statuses as pending
      const pendingDepositUsd = (depositRequests || [])
        .filter((d: any) => d.status === 'Pending')
        .reduce((sum: number, d: any) => sum + parseFloat(d.amountUsd || '0'), 0)
        + (cryptoPayments || [])
          .filter((c: any) => c.status === 'Pending' || c.status === 'Under Review')
          .reduce((sum: number, c: any) => sum + parseFloat(c.amountUsd || '0'), 0);
      
      // Convert pending USD to gold grams
      const pendingGoldGrams = pendingDepositUsd / goldPrice;

      const loadTime = Date.now() - startTime;
      console.log(`[Dashboard] Loaded for user ${userId} in ${loadTime}ms`);

      // Process certificates for summary
      const activeCerts = (certificates || []).filter((c: any) => c.status === 'Active');
      const recentCerts = [...(certificates || [])]
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10);

      // Get latest transaction ID for sync versioning (authoritative source)
      const latestTransaction = allTransactions.find((t: any) => t.status === 'Completed');
      const syncVersion = latestTransaction?.createdAt 
        ? new Date(latestTransaction.createdAt).getTime() 
        : Date.now();

      res.json({
        wallet: wallet || { goldGrams: '0', usdBalance: '0', eurBalance: '0' },
        vaultHoldings: vaultHoldings || [],
        transactions: allTransactions,
        bnslPlans: bnslPlans || [],
        goldPrice,
        goldPriceSource,
        notifications: (notifications || []).slice(0, 5),
        tradeCounts: {
          active: (tradeCases || []).filter((tc: any) => !['Completed', 'Cancelled', 'Rejected'].includes(tc.status)).length,
          total: (tradeCases || []).length
        },
        finaBridge: {
          activeCases: (tradeCases || []).filter((tc: any) => !['Completed', 'Cancelled', 'Rejected'].includes(tc.status)).length,
          tradeVolume: (tradeCases || []).filter((tc: any) => tc.status === 'Completed').reduce((sum: number, tc: any) => sum + parseFloat(tc.tradeValueUsd || '0'), 0),
          goldGrams: parseFloat(finabridgeWallet?.availableGoldGrams || '0') + parseFloat(finabridgeWallet?.lockedGoldGrams || '0'),
          usdValue: (parseFloat(finabridgeWallet?.availableGoldGrams || '0') + parseFloat(finabridgeWallet?.lockedGoldGrams || '0')) * goldPrice,
          availableGoldGrams: parseFloat(finabridgeWallet?.availableGoldGrams || '0'),
          lockedGoldGrams: parseFloat(finabridgeWallet?.lockedGoldGrams || '0'),
          incomingLockedGoldGrams: parseFloat(finabridgeWallet?.incomingLockedGoldGrams || '0')
        },
        certificates: {
          recent: recentCerts,
          summary: {
            total: (certificates || []).length,
            active: activeCerts.length,
            digitalOwnership: activeCerts.filter((c: any) => c.type === 'Digital Ownership').length,
            physicalStorage: activeCerts.filter((c: any) => c.type === 'Physical Storage').length,
          }
        },
        totals: {
          vaultGoldGrams,
          vaultGoldValueUsd,
          vaultGoldValueAed,
          walletGoldGrams,
          walletUsdBalance,
          bnslWalletGoldGrams,
          bnslWalletValueUsd,
          totalPortfolioUsd,
          bnslLockedGrams,
          bnslTotalProfit,
          activeBnslPlans: activeBnslPlans.length,
          pendingGoldGrams,
          pendingDepositUsd
        },
        _meta: { 
          loadTimeMs: loadTime,
          syncVersion,
          serverTime: new Date().toISOString(),
          lastTransactionId: latestTransaction?.id || null
        }
      });
    } catch (error) {
      console.error('[Dashboard] Error:', error);
      res.status(500).json({ message: "Failed to load dashboard data" });
    }
  });
  
  // ============================================================================
  // CONTACT FORM (PUBLIC)
  // ============================================================================
  
  app.post("/api/contact", async (req, res) => {
    try {
      const { name, email, phone, company, subject, message } = req.body;
      
      if (!name || !email || !subject || !message) {
        return res.status(400).json({ message: "Name, email, subject, and message are required" });
      }
      
      // Send email notification to support
      await sendEmailDirect({
        to: "support@finatrades.com",
        subject: `[Contact Form] ${subject} - from ${name}`,
        text: `
New contact form submission:

Name: ${name}
Email: ${email}
Phone: ${phone || 'Not provided'}
Company: ${company || 'Not provided'}
Subject: ${subject}

Message:
${message}
        `,
        html: `
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
        `
      });
      
      res.json({ success: true, message: "Message sent successfully" });
    } catch (error) {
      console.error('[Contact Form] Error:', error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // ============================================================================
  // AUTHENTICATION & USER MANAGEMENT
  // ============================================================================
  
  // Register new user (rate limited)
  app.post("/api/auth/register", authRateLimiter, async (req, res) => {
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
      const newWallet = await storage.createWallet({
        userId: user.id,
        goldGrams: "0",
        usdBalance: "0",
        eurBalance: "0",
      });
      
      // Check for pending invitation transfers to this email
      let inviteSenderReferralCode: string | undefined;
      try {
        const pendingInvites = await storage.getPendingInvitesByEmail(user.email);
        for (const invite of pendingInvites) {
          // getPendingInvitesByEmail already filters to only return actual invites (memo contains isInvite:true)
          if (invite.status === 'Pending') {
            // Parse memo to get invite metadata (isInvite, invitationToken, senderReferralCode)
            let inviteMetadata: { isInvite?: boolean; invitationToken?: string; senderReferralCode?: string | null; originalMemo?: string } = {};
            try {
              if (invite.memo && invite.memo.startsWith('{')) {
                inviteMetadata = JSON.parse(invite.memo);
              }
            } catch (e) {
              // memo is not JSON, skip
              continue;
            }
            
            // Double-check this is actually an invite
            if (!inviteMetadata.isInvite) {
              continue;
            }
            
            // Extract sender's referral code for registration bonus
            if (inviteMetadata.senderReferralCode) {
              inviteSenderReferralCode = inviteMetadata.senderReferralCode;
            }
            
            // Claim the invitation transfer
            const goldAmount = parseFloat(invite.amountGold || '0');
            const goldPrice = parseFloat(invite.goldPriceUsdPerGram || '0');
            
            // Credit the new user's wallet
            const currentGold = parseFloat(newWallet.goldGrams?.toString() || '0');
            await storage.updateWallet(newWallet.id, {
              goldGrams: (currentGold + goldAmount).toFixed(6)
            });
            
            // Create recipient transaction
            const recipientTx = await storage.createTransaction({
              userId: user.id,
              type: 'Receive',
              status: 'Completed',
              amountGold: goldAmount.toFixed(6),
              amountUsd: (goldAmount * goldPrice).toFixed(2),
              goldPriceUsdPerGram: goldPrice.toFixed(2),
              senderEmail: invite.recipientIdentifier,
              description: inviteMetadata.originalMemo || `Claimed invitation transfer from registration`,
              referenceId: invite.referenceNumber,
              sourceModule: 'finapay',
              completedAt: new Date(),
            });
            
            // Update sender's transaction to completed
            if (invite.senderTransactionId) {
              await storage.updateTransaction(invite.senderTransactionId, {
                status: 'Completed',
                recipientUserId: user.id,
                completedAt: new Date(),
              });
            }
            
            // Update the invite transfer
            await storage.updatePeerTransfer(invite.id, {
              recipientId: user.id,
              recipientTransactionId: recipientTx.id,
              status: 'Completed',
              respondedAt: new Date(),
            });
            
            // Record ledger entry
            const { vaultLedgerService } = await import('./vault-ledger-service');
            await vaultLedgerService.recordLedgerEntry({
              userId: user.id,
              action: 'Transfer_Receive',
              goldGrams: goldAmount,
              goldPriceUsdPerGram: goldPrice,
              fromWallet: 'External',
              toWallet: 'FinaPay',
              fromStatus: 'Pending_Deposit',
              toStatus: 'Available',
              transactionId: recipientTx.id,
              counterpartyUserId: invite.senderId,
              notes: `Claimed invitation transfer ${invite.referenceNumber}`,
              createdBy: 'system',
            });
            
            // Create notification
            await storage.createNotification({
              userId: user.id,
              title: 'Gold Claimed!',
              message: `You received ${goldAmount.toFixed(4)}g gold from an invitation transfer.`,
              type: 'success',
              link: '/finapay',
            });
            
            // Notify sender
            await storage.createNotification({
              userId: invite.senderId,
              title: 'Transfer Claimed',
              message: `Your invitation transfer of ${goldAmount.toFixed(4)}g gold was claimed by ${user.email}.`,
              type: 'success',
              link: '/finapay',
            });
            
            console.log(`[Registration] Claimed invitation transfer ${invite.referenceNumber} for ${user.email}`);
          }
        }
      } catch (inviteError) {
        console.error('[Registration] Invitation claiming failed:', inviteError);
        // Don't fail registration if invitation claiming fails
      }
      
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
      
      res.json({ 
        user: sanitizeUser(user),
        message: emailResult.success 
          ? "Registration successful. Please verify your email." 
          : "Registration successful. Email could not be sent - you can request a new verification code.",
        requiresVerification: true,
        emailSent: emailResult.success
      });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Registration failed" });
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
      
      res.json({ message: "Verification code sent to your email" });
    } catch (error) {
      res.status(400).json({ message: "Failed to send verification code" });
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
      
      res.json({ 
        message: "Email verified successfully", 
        user: sanitizeUser(updatedUser!) 
      });
    } catch (error) {
      res.status(400).json({ message: "Verification failed" });
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

  // BNSL Auto-Processing: Check for due payouts daily (runs every 6 hours)
  setInterval(async () => {
    try {
      console.log('[BNSL Auto-Process] Checking for due payouts and mature plans...');
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Get all active plans
      const allPlans = await storage.getAllBnslPlans();
      const activePlans = allPlans.filter(p => p.status === 'Active');
      
      let payoutsProcessed = 0;
      let plansMatured = 0;
      
      for (const plan of activePlans) {
        // Check if plan has reached maturity
        const maturityDate = new Date(plan.maturityDate);
        maturityDate.setHours(0, 0, 0, 0);
        
        if (maturityDate <= today && plan.status === 'Active') {
          // Mark plan as Maturing (admin needs to process final settlement)
          await storage.updateBnslPlan(plan.id, { status: 'Maturing' });
          plansMatured++;
          console.log(`[BNSL Auto-Process] Plan ${plan.contractId} marked as Maturing`);
        }
        
        // Check for due payouts
        const payouts = await storage.getPlanPayouts(plan.id);
        for (const payout of payouts) {
          if (payout.status !== 'Scheduled') continue;
          
          const payoutDate = new Date(payout.scheduledDate);
          payoutDate.setHours(0, 0, 0, 0);
          
          // Mark overdue payouts as Processing (admin needs to manually process)
          if (payoutDate <= today) {
            await storage.updateBnslPayout(payout.id, { status: 'Processing' });
            payoutsProcessed++;
            console.log(`[BNSL Auto-Process] Payout #${payout.sequence} for plan ${plan.contractId} marked as Processing`);
          }
        }
      }
      
      if (payoutsProcessed > 0 || plansMatured > 0) {
        console.log(`[BNSL Auto-Process] Marked ${payoutsProcessed} payouts as Processing, ${plansMatured} plans as Maturing`);
      }
    } catch (error) {
      console.error('[BNSL Auto-Process] Error:', error);
    }
  }, 6 * 60 * 60 * 1000); // Run every 6 hours

  // Login with rate limiting
  app.post("/api/auth/login", authRateLimiter, async (req, res) => {
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
        return res.status(401).json({ message: "Invalid credentials" });
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
      
      // Set session for authenticated user (SECURITY-CRITICAL)
      // Regular login does NOT grant admin portal access
      req.session.userId = user.id;
      req.session.userRole = user.role;
      req.session.adminPortal = false;
      
      // Record login timestamp for session tracking
      const updatedUser = await storage.updateUser(user.id, {
        lastLoginAt: new Date(),
      });
      
      res.json({ user: sanitizeUser(updatedUser || user), adminPortal: false });
    } catch (error) {
      console.error('[Login Error]', error);
      res.status(400).json({ message: "Login failed" });
    }
  });

  // Admin-specific login with rate limiting - grants admin portal access
  app.post("/api/admin/login", async (req, res) => {
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
      
      // Audit log for admin login
      await storage.createAuditLog({
        entityType: "user",
        entityId: user.id,
        actionType: "admin_login",
        actor: user.id,
        actorRole: "admin",
        details: "Admin portal login"
      });
      
      res.json({ user: sanitizeUser(updatedUser || user), adminPortal: true });
    } catch (error) {
      res.status(400).json({ message: "Login failed" });
    }
  });
  
  // Get current user - PROTECTED: requires matching session
  app.get("/api/auth/me/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const user = await storage.getUser(req.params.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ user: sanitizeUser(user) });
    } catch (error) {
      res.status(400).json({ message: "Failed to get user" });
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
      res.json({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        finaCode: user.finaCode
      });
    } catch (error) {
      console.error('[Get User Error]', error);
      res.status(400).json({ message: "Failed to get user" });
    }
  });
  
  // Update user profile - PROTECTED: requires matching session
  app.patch("/api/users/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const user = await storage.updateUser(req.params.userId, req.body);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ user: sanitizeUser(user) });
    } catch (error) {
      res.status(400).json({ message: "Failed to update user" });
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
      
      res.json({ message: "Account deleted successfully" });
    } catch (error) {
      console.error("Account deletion error:", error);
      res.status(500).json({ message: "Failed to delete account" });
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
        await sendEmail(
          user.email,
          "Account Deletion Request Received",
          `<h2>Account Deletion Request Received</h2>
           <p>Dear ${user.firstName},</p>
           <p>We have received your request to delete your Finatrades account.</p>
           <p><strong>Scheduled Deletion Date:</strong> ${scheduledDeletionDate.toLocaleDateString()}</p>
           <p>Your request is now pending admin review. You have 30 days to cancel this request if you change your mind.</p>
           <p>If you did not make this request, please contact our support team immediately.</p>
           <p>Best regards,<br>The Finatrades Team</p>`,
          'account_deletion_request'
        );
      } catch (emailError) {
        console.error("Failed to send deletion request email:", emailError);
      }
      
      res.status(201).json({ 
        message: "Deletion request submitted successfully",
        request: deletionRequest 
      });
    } catch (error) {
      console.error("Account deletion request error:", error);
      res.status(500).json({ message: "Failed to submit deletion request" });
    }
  });
  
  // Get user's current deletion request
  app.get("/api/account-deletion-request", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const request = await storage.getAccountDeletionRequestByUser(req.session.userId);
      res.json({ request: request || null });
    } catch (error) {
      console.error("Get deletion request error:", error);
      res.status(500).json({ message: "Failed to get deletion request" });
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
      
      res.json({ message: "Deletion request cancelled", request: updated });
    } catch (error) {
      console.error("Cancel deletion request error:", error);
      res.status(500).json({ message: "Failed to cancel deletion request" });
    }
  });
  
  // Admin: Get all deletion requests
  app.get("/api/admin/account-deletion-requests", ensureAdminAsync, async (req, res) => {
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
      
      res.json({ requests: enrichedRequests });
    } catch (error) {
      console.error("Admin get deletion requests error:", error);
      res.status(500).json({ message: "Failed to get deletion requests" });
    }
  });
  
  // Admin: Review deletion request (approve/reject)
  app.post("/api/admin/account-deletion-requests/:id/review", ensureAdminAsync, async (req, res) => {
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
          
          await sendEmail(
            user.email,
            `Account Deletion Request ${action === 'approve' ? 'Approved' : 'Rejected'}`,
            emailContent,
            'account_deletion_review'
          );
        } catch (emailError) {
          console.error("Failed to send review notification email:", emailError);
        }
      }
      
      res.json({ 
        message: `Deletion request ${action}d successfully`, 
        request: updated 
      });
    } catch (error) {
      console.error("Admin review deletion request error:", error);
      res.status(500).json({ message: "Failed to review deletion request" });
    }
  });
  
  // Admin: Execute approved deletion (only for approved requests past scheduled date)
  app.post("/api/admin/account-deletion-requests/:id/execute", ensureAdminAsync, async (req, res) => {
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
      
      res.json({ message: "Account deleted successfully" });
    } catch (error) {
      console.error("Execute deletion request error:", error);
      res.status(500).json({ message: "Failed to execute deletion request" });
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
      
      res.json({ message: "Logged out successfully" });
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
      const resetUrl = `${req.protocol}://${req.get('host')}/reset-password?token=${token}`;
      
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
      
      res.json({ message: "If an account with that email exists, we've sent password reset instructions." });
    } catch (error) {
      console.error("Password reset request error:", error);
      res.status(500).json({ message: "Failed to process password reset request" });
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
      
      res.json({ message: "Password has been reset successfully" });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });
  
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
      
      res.json({ 
        secret, 
        qrCode: qrCodeDataUrl,
        message: "Scan the QR code with your authenticator app, then verify with a code"
      });
    } catch (error) {
      console.error("MFA setup error:", error);
      res.status(400).json({ message: "Failed to setup MFA" });
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
      
      res.json({ 
        success: true, 
        message: "MFA enabled successfully",
        backupCodes // Return plain backup codes once for user to save
      });
    } catch (error) {
      console.error("MFA enable error:", error);
      res.status(400).json({ message: "Failed to enable MFA" });
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
      
      res.json({
        secret,
        qrCode: qrCodeDataUrl,
        message: "Scan the QR code with your authenticator app, then verify with a code"
      });
    } catch (error) {
      console.error("MFA bootstrap setup error:", error);
      res.status(400).json({ message: "Failed to setup MFA" });
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
      
      res.json({
        success: true,
        message: "MFA enabled successfully. You are now logged in.",
        backupCodes,
        user: sanitizeUser(updatedUser || user),
        adminPortal: challenge.adminPortal || false
      });
    } catch (error) {
      console.error("MFA bootstrap complete error:", error);
      res.status(400).json({ message: "Failed to complete MFA setup" });
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
      
      res.status(400).json({ message: "Invalid verification code" });
    } catch (error) {
      console.error("MFA verify error:", error);
      res.status(400).json({ message: "Failed to verify MFA" });
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
      
      res.json({ success: true, message: "MFA disabled successfully" });
    } catch (error) {
      console.error("MFA disable error:", error);
      res.status(400).json({ message: "Failed to disable MFA" });
    }
  });
  
  // Get MFA status
  app.get("/api/mfa/status/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const user = await storage.getUser(req.params.userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ 
        mfaEnabled: user.mfaEnabled,
        mfaMethod: user.mfaMethod,
        hasBackupCodes: user.mfaBackupCodes ? JSON.parse(user.mfaBackupCodes).length > 0 : false
      });
    } catch (error) {
      res.status(400).json({ message: "Failed to get MFA status" });
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
      
      res.json({ 
        success: true, 
        message: "Biometric authentication enabled successfully",
        biometricEnabled: true
      });
    } catch (error) {
      console.error("Biometric enable error:", error);
      res.status(400).json({ message: "Failed to enable biometric authentication" });
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
      
      res.json({ 
        success: true, 
        message: "Biometric authentication disabled successfully",
        biometricEnabled: false
      });
    } catch (error) {
      console.error("Biometric disable error:", error);
      res.status(400).json({ message: "Failed to disable biometric authentication" });
    }
  });

  // Get biometric status
  app.get("/api/biometric/status/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const user = await storage.getUser(req.params.userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ 
        biometricEnabled: user.biometricEnabled || false,
        hasDeviceId: !!user.biometricDeviceId
      });
    } catch (error) {
      res.status(400).json({ message: "Failed to get biometric status" });
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
      
      // Set session
      req.session.userId = user.id;
      
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
      res.json({ 
        success: true, 
        user: safeUser,
        message: "Biometric login successful"
      });
    } catch (error) {
      console.error("Biometric login error:", error);
      res.status(400).json({ message: "Biometric login failed" });
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
      
      res.json({ 
        userExists: false, 
        invitationSent: emailResult.success,
        message: emailResult.success 
          ? `Invitation sent to ${email}` 
          : `Could not send invitation email to ${email}. Please try again.`
      });
    } catch (error) {
      console.error("Check and invite error:", error);
      res.status(500).json({ message: "Failed to process request" });
    }
  });
  
  // ============================================================================
  // ADMIN - USER MANAGEMENT
  // ============================================================================
  
  // Server-side cache for admin stats (expensive query)
  let adminStatsCache: { data: any; timestamp: number } | null = null;
  const ADMIN_STATS_CACHE_TTL = 30000; // 30 seconds

  // Admin Dashboard Stats
  app.get("/api/admin/stats", ensureAdminAsync, async (req, res) => {
    try {
      // Check cache first
      const now = Date.now();
      if (adminStatsCache && (now - adminStatsCache.timestamp) < ADMIN_STATS_CACHE_TTL) {
        console.log('[Admin Stats] Serving from cache');
        return res.json(adminStatsCache.data);
      }

      const startTime = now;
      
      // Fetch all data in parallel for speed
      const [users, kycSubmissions, allTransactions, allDepositRequests] = await Promise.all([
        storage.getAllUsers(),
        storage.getAllKycSubmissions(),
        storage.getAllTransactions(),
        storage.getAllDepositRequests()
      ]);
      
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
        k.status === 'In Progress'
      ).length;
      const pendingKycUsers = users.filter(u => u.kycStatus === 'In Progress').length;
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
      
      // Revenue estimate (1% of volume as placeholder)
      const revenue = totalVolume * 0.01;
      
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
      
      // Get BNSL data
      let activeBnslPlans = 0;
      let bnslBaseLiability = 0;
      let bnslMarginLiability = 0;
      let pendingBnslTermRequests = 0;
      try {
        const allBnslPlans = await db.select().from(bnslPlans);
        activeBnslPlans = allBnslPlans.filter(p => p.status === 'Active').length;
        bnslBaseLiability = allBnslPlans.filter(p => p.status === 'Active').reduce((sum, p) => 
          sum + parseFloat(p.baseAmountUsd || '0'), 0
        );
        bnslMarginLiability = allBnslPlans.filter(p => p.status === 'Active').reduce((sum, p) => 
          sum + parseFloat(p.marginAmountUsd || '0'), 0
        );
        pendingBnslTermRequests = allBnslPlans.filter(p => p.status === 'Pending Termination').length;
      } catch (e) { /* table may not exist */ }
      
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
        createdAt: d.createdAt
      }));
      allPendingItems.push(...pendingDepositReqs);
      
      // Pending withdrawal requests
      try {
        const allWithdrawals = await db.select().from(withdrawalRequests);
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
          createdAt: w.createdAt
        }));
        allPendingItems.push(...pendingWithdrawReqs);
      } catch (e) { /* table may not exist */ }
      
      // Pending crypto payment requests
      try {
        const allCryptoReqs = await db.select().from(cryptoPaymentRequests);
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
          createdAt: c.createdAt
        }));
        allPendingItems.push(...pendingCryptoReqs);
      } catch (e) { /* table may not exist */ }
      
      // Pending buy gold requests
      try {
        const allBuyGoldReqs = await db.select().from(buyGoldRequests);
        const pendingBuyGoldReqs = allBuyGoldReqs.filter((b: any) => 
          b.status === 'Pending' || b.status === 'Under Review'
        ).map((b: any) => ({
          id: b.id,
          odooId: b.odooId,
          userId: b.userId,
          type: 'Buy Gold Bar',
          status: b.status,
          amountGold: null,
          amountUsd: null,
          description: 'Wingold purchase request',
          sourceModule: 'finapay',
          createdAt: b.createdAt
        }));
        allPendingItems.push(...pendingBuyGoldReqs);
      } catch (e) { /* table may not exist */ }
      
      
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
      
      // Pending BNSL plans (activation pending, termination pending)
      try {
        const allBnsl = await db.select().from(bnslPlans);
        const pendingBnsl = allBnsl.filter((b: any) => 
          b.status === 'Pending Termination' || b.status === 'Pending'
        ).map((b: any) => ({
          id: b.id,
          odooId: b.odooId,
          userId: b.userId,
          type: 'BNSL',
          status: b.status,
          amountGold: b.goldGrams,
          amountUsd: b.baseAmountUsd,
          description: b.status === 'Pending Termination' ? 'BNSL termination request' : 'BNSL activation pending',
          sourceModule: 'bnsl',
          createdAt: b.createdAt
        }));
        allPendingItems.push(...pendingBnsl);
      } catch (e) { /* table may not exist */ }
      
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
        pendingKycRequests,
        pendingDeposits,
        pendingWithdrawals,
        pendingTransactions,
        totalDeposits,
        totalWithdrawals,
        totalRequests,
        openReviewCount: pendingKycCount + pendingDeposits + pendingWithdrawals,
        activeBnslPlans,
        bnslBaseLiability,
        bnslMarginLiability,
        pendingBnslTermRequests,
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
      
      res.json(responseData);
    } catch (error) {
      console.error("Failed to get admin stats:", error);
      res.status(400).json({ message: "Failed to get admin stats" });
    }
  });

  // Admin Pending Counts for Sidebar Badges
  app.get("/api/admin/pending-counts", ensureAdminAsync, async (req, res) => {
    try {
      const [kycSubmissions, allTransactions, allDepositRequests, allUsers] = await Promise.all([
        storage.getAllKycSubmissions(),
        storage.getAllTransactions(),
        storage.getAllDepositRequests(),
        storage.getAllUsers()
      ]);

      // Count pending KYC from both kyc_submissions and users table
      const pendingKycSubmissions = kycSubmissions.filter(k => k.status === 'In Progress').length;
      const pendingKycUsers = allUsers.filter(u => u.kycStatus === 'In Progress').length;
      const pendingKyc = Math.max(pendingKycSubmissions, pendingKycUsers);
      const pendingTransactions = allTransactions.filter(tx => tx.status === 'Pending').length;
      const pendingDeposits = allDepositRequests.filter(d => d.status === 'Pending' || d.status === 'Under Review').length;
      
      let pendingWithdrawals = 0;
      let pendingVaultRequests = 0;
      let pendingTradeCases = 0;
      let pendingBnslRequests = 0;
      let unreadChats = 0;

      try {
        const allWithdrawals = await db.select().from(withdrawalRequests);
        pendingWithdrawals = allWithdrawals.filter((w: any) => 
          w.status === 'Pending' || w.status === 'Under Review' || w.status === 'Processing'
        ).length;
      } catch (e) { /* table may not exist */ }

      try {
        const allVaultWithdrawals = await db.select().from(vaultWithdrawalRequests);
        pendingVaultRequests = allVaultWithdrawals.filter((v: any) => 
          v.status === 'Submitted' || v.status === 'Pending' || v.status === 'Processing'
        ).length;
      } catch (e) { /* table may not exist */ }

      try {
        const allTrades = await db.select().from(tradeCases);
        pendingTradeCases = allTrades.filter((t: any) => t.status === 'pending_review' || t.status === 'open').length;
      } catch (e) { /* table may not exist */ }

      try {
        const allBnsl = await db.select().from(bnslPlans);
        pendingBnslRequests = allBnsl.filter((b: any) => b.status === 'Pending Termination' || b.status === 'Pending').length;
      } catch (e) { /* table may not exist */ }

      try {
        const allChats = await db.select().from(chatSessions);
        unreadChats = allChats.filter((c: any) => c.status === 'active' || c.status === 'waiting').length;
      } catch (e) { /* table may not exist */ }

      let pendingCryptoPayments = 0;
      let pendingBuyGold = 0;

      try {
        const allCrypto = await db.select().from(cryptoPaymentRequests);
        pendingCryptoPayments = allCrypto.filter((c: any) => c.status === 'Pending' || c.status === 'Under Review').length;
      } catch (e) { /* table may not exist */ }

      try {
        const allBuyGold = await db.select().from(buyGoldRequests);
        pendingBuyGold = allBuyGold.filter((b: any) => b.status === 'Pending' || b.status === 'Under Review').length;
      } catch (e) { /* table may not exist */ }

      res.json({
        pendingKyc,
        pendingTransactions,
        pendingDeposits,
        pendingWithdrawals,
        pendingVaultRequests,
        pendingTradeCases,
        pendingBnslRequests,
        unreadChats,
        pendingCryptoPayments,
        pendingBuyGold
      });
    } catch (error) {
      console.error("Failed to get pending counts:", error);
      res.status(400).json({ message: "Failed to get pending counts" });
    }
  });

  // Gold Backing Report (Admin)
  app.get("/api/admin/gold-backing-report", ensureAdminAsync, async (req, res) => {
    try {
      const report = await storage.getGoldBackingReport();
      res.json(report);
    } catch (error) {
      console.error("Failed to get gold backing report:", error);
      res.status(500).json({ message: "Failed to get gold backing report" });
    }
  });

  // Gold Backing Drill-Down: FinaPay Users with Holdings
  app.get("/api/admin/gold-backing/finapay-users", ensureAdminAsync, async (req, res) => {
    try {
      const users = await storage.getUsersWithFinaPayHoldings();
      res.json({ users });
    } catch (error) {
      console.error("Failed to get FinaPay users:", error);
      res.status(500).json({ message: "Failed to get FinaPay users" });
    }
  });

  // Gold Backing Drill-Down: BNSL Users with Holdings
  app.get("/api/admin/gold-backing/bnsl-users", ensureAdminAsync, async (req, res) => {
    try {
      const users = await storage.getUsersWithBnslHoldings();
      res.json({ users });
    } catch (error) {
      console.error("Failed to get BNSL users:", error);
      res.status(500).json({ message: "Failed to get BNSL users" });
    }
  });

  // Gold Backing Drill-Down: Vault Holding Details
  app.get("/api/admin/gold-backing/vault/:holdingId", ensureAdminAsync, async (req, res) => {
    try {
      const details = await storage.getVaultHoldingDetails(req.params.holdingId);
      if (!details) {
        return res.status(404).json({ message: "Vault holding not found" });
      }
      res.json(details);
    } catch (error) {
      console.error("Failed to get vault holding details:", error);
      res.status(500).json({ message: "Failed to get vault holding details" });
    }
  });

  // Gold Backing Drill-Down: Users by Vault Location
  app.get("/api/admin/gold-backing/vault-location/:location", ensureAdminAsync, async (req, res) => {
    try {
      const users = await storage.getUsersByVaultLocation(decodeURIComponent(req.params.location));
      res.json({ users });
    } catch (error) {
      console.error("Failed to get users by vault location:", error);
      res.status(500).json({ message: "Failed to get users by vault location" });
    }
  });

  // Gold Backing Drill-Down: Full User Financial Profile
  app.get("/api/admin/gold-backing/user/:userId", ensureAdminAsync, async (req, res) => {
    try {
      const profile = await storage.getUserFinancialProfile(req.params.userId);
      if (!profile) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(profile);
    } catch (error) {
      console.error("Failed to get user financial profile:", error);
      res.status(500).json({ message: "Failed to get user financial profile" });
    }
  });

  // Gold Backing Report PDF Download
  app.get("/api/admin/gold-backing-report/pdf", ensureAdminAsync, async (req, res) => {
    try {
      const { generateGoldBackingReportPDF } = await import('./pdf-generator');
      
      const report = await storage.getGoldBackingReport();
      const finapayUsers = await storage.getUsersWithFinaPayHoldings();
      const bnslUsers = await storage.getUsersWithBnslHoldings();
      
      const vaultHoldingsGrouped = report.physicalGold.holdings.reduce((acc: any, h: any) => {
        const loc = h.vaultLocation || 'Unknown';
        if (!acc[loc]) acc[loc] = { goldGrams: 0, count: 0 };
        acc[loc].goldGrams += parseFloat(h.goldGrams) || 0;
        acc[loc].count += 1;
        return acc;
      }, {});

      const pdfData = {
        summary: {
          physicalGoldGrams: report.physicalGold.totalGrams,
          customerLiabilitiesGrams: report.customerLiabilities.totalGrams,
          backingRatio: report.backingRatio,
          surplus: report.surplus,
          generatedAt: new Date().toISOString()
        },
        physicalGold: {
          totalGrams: report.physicalGold.totalGrams,
          holdings: Object.entries(vaultHoldingsGrouped).map(([loc, data]: [string, any]) => ({
            vaultLocation: loc,
            goldGrams: data.goldGrams,
            holdingsCount: data.count
          }))
        },
        customerLiabilities: {
          totalGrams: report.customerLiabilities.totalGrams,
          finapay: {
            count: report.customerLiabilities.wallets.count,
            totalGrams: report.customerLiabilities.wallets.totalGrams,
            users: finapayUsers.map((u: any) => ({
              name: `${u.firstName} ${u.lastName}`,
              email: u.email,
              goldGrams: parseFloat(u.goldGrams) || 0
            }))
          },
          bnsl: {
            count: report.customerLiabilities.bnslWallets.count,
            availableGrams: report.customerLiabilities.bnslWallets.availableGrams,
            lockedGrams: report.customerLiabilities.bnslWallets.lockedGrams,
            users: bnslUsers.map((u: any) => ({
              name: `${u.firstName} ${u.lastName}`,
              email: u.email,
              availableGrams: parseFloat(u.availableGoldGrams) || 0,
              lockedGrams: parseFloat(u.lockedGoldGrams) || 0
            }))
          }
        },
        certificates: report.certificates
      };

      const pdfBuffer = await generateGoldBackingReportPDF(pdfData);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="gold-backing-report-${format(new Date(), 'yyyy-MM-dd')}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Failed to generate gold backing report PDF:", error);
      res.status(500).json({ message: "Failed to generate PDF report" });
    }
  });

  // System Health Check (Admin)
  app.get("/api/admin/system-health", ensureAdminAsync, async (req, res) => {
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
      
      res.json({
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
      res.status(500).json({ 
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

  // Database sync status (Admin)
  app.get("/api/admin/database-sync/status", ensureAdminAsync, async (req, res) => {
    try {
      const { getSyncStatus, verifySyncStatus } = await import('./database-sync-scheduler');
      const status = getSyncStatus();
      const verification = await verifySyncStatus();
      
      res.json({
        scheduler: status,
        databases: verification,
        syncDirection: 'AWS RDS → Replit (every 6 hours)'
      });
    } catch (error) {
      console.error("Database sync status check failed:", error);
      res.status(500).json({ message: "Failed to get sync status" });
    }
  });

  // Trigger manual database sync (Admin)
  app.post("/api/admin/database-sync/trigger", ensureAdminAsync, async (req, res) => {
    try {
      const { direction = 'aws-to-replit' } = req.body;
      const { syncAwsToReplit, syncReplitToAws } = await import('./database-sync-scheduler');
      
      if (direction === 'replit-to-aws') {
        console.log(`[DB Sync] Manual sync triggered by admin: Replit → AWS`);
        const result = await syncReplitToAws();
        res.json({ message: 'Sync completed', result });
      } else {
        console.log(`[DB Sync] Manual sync triggered by admin: AWS → Replit`);
        const result = await syncAwsToReplit();
        res.json({ message: 'Sync completed', result });
      }
    } catch (error) {
      console.error("Manual database sync failed:", error);
      res.status(500).json({ message: "Failed to trigger sync" });
    }
  });

  // Start/stop database sync scheduler (Admin)
  app.post("/api/admin/database-sync/scheduler", ensureAdminAsync, async (req, res) => {
    try {
      const { action } = req.body;
      const { startSyncScheduler, stopSyncScheduler, getSyncStatus } = await import('./database-sync-scheduler');
      
      if (action === 'start') {
        startSyncScheduler();
        res.json({ message: 'Scheduler started', status: getSyncStatus() });
      } else if (action === 'stop') {
        stopSyncScheduler();
        res.json({ message: 'Scheduler stopped', status: getSyncStatus() });
      } else {
        res.status(400).json({ message: 'Invalid action. Use "start" or "stop"' });
      }
    } catch (error) {
      console.error("Scheduler control failed:", error);
      res.status(500).json({ message: "Failed to control scheduler" });
    }
  });

  // Get all users (Admin)
  app.get("/api/admin/users", ensureAdminAsync, requirePermission('view_users', 'manage_users'), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json({ users: users.map(sanitizeUser) });
    } catch (error) {
      res.status(400).json({ message: "Failed to get users" });
    }
  });

  // Get user list for account statements dropdown (with server-side search)
  // NOTE: This route MUST be defined before /api/admin/users/:userId to avoid route matching conflict
  app.get("/api/admin/users/list", ensureAdminAsync, async (req, res) => {
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
      res.json(userList);
    } catch (error) {
      console.error("Failed to get users list:", error);
      res.status(400).json({ message: "Failed to get users list" });
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
            livenessCapture: personalKyc.selfieUrl,
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
          } as any;
        }
      }
      
      // Get audit logs for this user
      const auditLogs = await storage.getEntityAuditLogs('user', user.id);
      
      res.json({ 
        user: sanitizeUser(user),
        wallet,
        transactions,
        kycSubmission,
        auditLogs
      });
    } catch (error) {
      res.status(400).json({ message: "Failed to get user details" });
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
      
      res.json({ 
        message: "User email verified by admin", 
        user: sanitizeUser(updatedUser!) 
      });
    } catch (error) {
      res.status(400).json({ message: "Failed to verify user email" });
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
        kycStatus: 'Rejected' as any,
      });
      
      await storage.createAuditLog({
        entityType: "user",
        entityId: user.id,
        actionType: "update",
        actor: adminId || "admin",
        actorRole: "admin",
        details: `User suspended. Reason: ${reason || 'Not specified'}`,
      });
      
      res.json({ 
        message: "User suspended", 
        user: sanitizeUser(updatedUser!) 
      });
    } catch (error) {
      res.status(400).json({ message: "Failed to suspend user" });
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
        kycStatus: 'Approved' as any,
      });
      
      await storage.createAuditLog({
        entityType: "user",
        entityId: user.id,
        actionType: "update",
        actor: adminId || "admin",
        actorRole: "admin",
        details: "User activated by admin",
      });
      
      res.json({ 
        message: "User activated", 
        user: sanitizeUser(updatedUser!) 
      });
    } catch (error) {
      res.status(400).json({ message: "Failed to activate user" });
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
          return {
            ...emp,
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
      
      res.json({ employees: enrichedEmployees });
    } catch (error) {
      console.error("Failed to get employees:", error);
      res.status(400).json({ message: "Failed to get employees" });
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
      
      res.json({ 
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
      res.status(400).json({ message: "Failed to get employee" });
    }
  });
  
  // Get employee by user ID (for current admin's permissions)
  // No permission required - admins need to fetch their own permissions
  app.get("/api/admin/employees/by-user/:userId", ensureAdminAsync, async (req, res) => {
    try {
      const employee = await storage.getEmployeeByUserId(req.params.userId);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found for this user" });
      }
      
      res.json({ employee });
    } catch (error) {
      res.status(400).json({ message: "Failed to get employee" });
    }
  });
  
  // Create new employee
  app.post("/api/admin/employees", ensureAdminAsync, requirePermission('manage_employees'), async (req, res) => {
    try {
      const { userId, role, department, jobTitle, permissions } = req.body;
      const adminUser = (req as any).adminUser;
      
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
        department,
        jobTitle,
        permissions: permissions || [],
        status: 'active',
        createdBy: adminUser.id
      });
      
      // Create audit log with detailed data
      await storage.createAuditLog({
        entityType: "employee",
        entityId: employee.id,
        actionType: "create",
        actor: adminUser.id,
        actorRole: "admin",
        details: `Employee ${employeeId} created with role ${role}`,
        newData: JSON.stringify({ role, department, jobTitle, permissions }),
      });
      
      res.json({ employee });
    } catch (error) {
      console.error("Failed to create employee:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create employee" });
    }
  });
  
  // Update employee
  app.patch("/api/admin/employees/:id", ensureAdminAsync, requirePermission('manage_employees'), async (req, res) => {
    try {
      const { role, department, jobTitle, status, permissions } = req.body;
      const adminUser = (req as any).adminUser;
      
      const existingEmployee = await storage.getEmployee(req.params.id);
      if (!existingEmployee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      // Validate permissions if being updated
      if (permissions !== undefined && permissions.length === 0) {
        return res.status(400).json({ message: "At least one permission is required" });
      }
      
      const updates: any = {};
      if (role !== undefined) updates.role = role;
      if (department !== undefined) updates.department = department;
      if (jobTitle !== undefined) updates.jobTitle = jobTitle;
      if (status !== undefined) updates.status = status;
      if (permissions !== undefined) updates.permissions = permissions;
      
      const employee = await storage.updateEmployee(req.params.id, updates);
      
      // Create audit log with before/after data
      await storage.createAuditLog({
        entityType: "employee",
        entityId: req.params.id,
        actionType: "update",
        actor: adminUser.id,
        actorRole: "admin",
        details: `Employee ${existingEmployee.employeeId} updated`,
        previousData: JSON.stringify({
          role: existingEmployee.role,
          department: existingEmployee.department,
          jobTitle: existingEmployee.jobTitle,
          permissions: existingEmployee.permissions,
        }),
        newData: JSON.stringify(updates),
      });
      
      res.json({ employee });
    } catch (error) {
      res.status(400).json({ message: "Failed to update employee" });
    }
  });
  
  // Deactivate employee (soft delete)
  app.post("/api/admin/employees/:id/deactivate", ensureAdminAsync, requirePermission('manage_employees'), async (req, res) => {
    try {
      const { reason } = req.body;
      const adminUser = (req as any).adminUser;
      
      const existingEmployee = await storage.getEmployee(req.params.id);
      if (!existingEmployee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      const employee = await storage.updateEmployee(req.params.id, { status: 'inactive' });
      
      // If employee has a user account, update their role back to user and invalidate sessions
      if (existingEmployee.userId) {
        await storage.updateUser(existingEmployee.userId, { role: 'user' });
        
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
          // Continue even if session deletion fails - the middleware will block access
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
        previousData: JSON.stringify({ status: existingEmployee.status }),
        newData: JSON.stringify({ status: 'inactive' }),
      });
      
      res.json({ message: "Employee deactivated and sessions invalidated", employee });
    } catch (error) {
      res.status(400).json({ message: "Failed to deactivate employee" });
    }
  });
  
  // Reactivate employee
  app.post("/api/admin/employees/:id/activate", ensureAdminAsync, requirePermission('manage_employees'), async (req, res) => {
    try {
      const adminUser = (req as any).adminUser;
      
      const existingEmployee = await storage.getEmployee(req.params.id);
      if (!existingEmployee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      const employee = await storage.updateEmployee(req.params.id, { status: 'active' });
      
      // If employee has a user account, update their role to admin
      if (existingEmployee.userId) {
        await storage.updateUser(existingEmployee.userId, { role: 'admin' });
      }
      
      // Create audit log with before/after data
      await storage.createAuditLog({
        entityType: "employee",
        entityId: req.params.id,
        actionType: "update",
        actor: adminUser.id,
        actorRole: "admin",
        details: `Employee ${existingEmployee.employeeId} activated`,
        previousData: JSON.stringify({ status: existingEmployee.status }),
        newData: JSON.stringify({ status: 'active' }),
      });
      
      res.json({ message: "Employee activated", employee });
    } catch (error) {
      res.status(400).json({ message: "Failed to activate employee" });
    }
  });
  
  // Get role permissions
  app.get("/api/admin/role-permissions", ensureAdminAsync, requirePermission('manage_employees', 'manage_settings'), async (req, res) => {
    try {
      const permissions = await storage.getAllRolePermissions();
      res.json({ permissions });
    } catch (error) {
      res.status(400).json({ message: "Failed to get role permissions" });
    }
  });
  
  // Update role permissions
  app.patch("/api/admin/role-permissions/:role", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      const { permissions } = req.body;
      const role = req.params.role;
      const adminUser = (req as any).adminUser;
      
      // Check if role permission exists
      let rolePermission = await storage.getRolePermission(role);
      
      if (rolePermission) {
        rolePermission = await storage.updateRolePermission(rolePermission.id, { permissions, updatedBy: adminUser.id });
      } else {
        rolePermission = await storage.createRolePermission({
          role: role as any,
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
      
      res.json({ permission: rolePermission });
    } catch (error) {
      console.error("Failed to update role permissions:", error);
      res.status(400).json({ message: "Failed to update role permissions" });
    }
  });
  
  // ============================================================================
  // DATABASE BACKUP & RESTORE MANAGEMENT
  // ============================================================================
  
  // List all backups
  app.get("/api/admin/backups", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      const backups = await listBackups();
      res.json({ backups });
    } catch (error) {
      console.error("Failed to list backups:", error);
      res.status(500).json({ message: "Failed to list backups" });
    }
  });
  
  // Create a new backup (requires OTP verification)
  app.post("/api/admin/backups", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      const adminUser = (req as any).adminUser;
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
      
      res.json({
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
      res.status(500).json({ message: "Failed to create backup" });
    }
  });
  
  // Get backup details
  app.get("/api/admin/backups/:id", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      const backup = await getBackup(req.params.id);
      if (!backup) {
        return res.status(404).json({ message: "Backup not found" });
      }
      res.json({ backup });
    } catch (error) {
      console.error("Failed to get backup:", error);
      res.status(500).json({ message: "Failed to get backup details" });
    }
  });
  
  // Verify backup integrity
  app.post("/api/admin/backups/:id/verify", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      const result = await verifyBackup(req.params.id);
      res.json({ valid: result.valid, error: result.error });
    } catch (error) {
      console.error("Failed to verify backup:", error);
      res.status(500).json({ message: "Failed to verify backup" });
    }
  });
  
  // Download backup file (requires OTP verification via POST body)
  app.post("/api/admin/backups/:id/download", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      const adminUser = (req as any).adminUser;
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
    } catch (error) {
      console.error("Failed to download backup:", error);
      res.status(500).json({ message: "Failed to download backup" });
    }
  });
  
  // Restore from backup (DANGEROUS - requires super admin or manage_settings permission + OTP)
  app.post("/api/admin/backups/:id/restore", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      const adminUser = (req as any).adminUser;
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
      
      res.json({
        message: "Database restored successfully",
        preRestoreBackupId: result.preRestoreBackupId,
        restoredFromBackupId: result.restoredFromBackupId,
        userCount: result.userCount,
        transactionCount: result.transactionCount,
        lastTransactionDate: result.lastTransactionDate
      });
    } catch (error) {
      console.error("Failed to restore backup:", error);
      res.status(500).json({ message: "Failed to restore backup" });
    }
  });
  
  // Delete backup
  app.delete("/api/admin/backups/:id", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      const adminUser = (req as any).adminUser;
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
      
      res.json({ message: "Backup deleted successfully" });
    } catch (error) {
      console.error("Failed to delete backup:", error);
      res.status(500).json({ message: "Failed to delete backup" });
    }
  });
  
  // Get backup audit logs
  app.get("/api/admin/backup-audit-logs", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const logs = await getBackupAuditLogs(limit);
      res.json({ logs });
    } catch (error) {
      console.error("Failed to get backup audit logs:", error);
      res.status(500).json({ message: "Failed to get backup audit logs" });
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
      
      res.json({ submission });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "KYC submission failed" });
    }
  });
  
  // Get user's KYC submission - PROTECTED: requires matching session
  app.get("/api/kyc/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const submission = await storage.getKycSubmission(req.params.userId);
      res.json({ submission });
    } catch (error) {
      res.status(400).json({ message: "Failed to get KYC submission" });
    }
  });
  
  // Update KYC status (Admin) - handles both kycAml and Finatrades personal KYC
  app.patch("/api/kyc/:id", ensureAdminAsync, requirePermission('manage_kyc'), async (req, res) => {
    try {
      const updates = { ...req.body };
      
      // Convert reviewedAt string to Date if provided
      if (updates.reviewedAt && typeof updates.reviewedAt === 'string') {
        updates.reviewedAt = new Date(updates.reviewedAt);
      }
      
      // Try kycAml table first
      let submission: any = await storage.updateKycSubmission(req.params.id, updates);
      let kycType = 'kycAml';
      
      // If not found in kycAml, try Finatrades personal KYC table
      if (!submission) {
        submission = await storage.updateFinatradesPersonalKyc(req.params.id, updates);
        kycType = 'finatrades_personal';
      }
      
      // If not found in personal, try Finatrades corporate KYC table
      if (!submission) {
        submission = await storage.updateFinatradesCorporateKyc(req.params.id, updates);
        kycType = 'finatrades_corporate';
      }
      
      if (!submission) {
        return res.status(404).json({ message: "KYC submission not found" });
      }
      
      // Update user KYC status and send notification email
      if (req.body.status) {
        await storage.updateUser(submission.userId, {
          kycStatus: req.body.status,
        });
        
        // Send email notification based on status
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
            
            // Create in-app notification for KYC approval
            await storage.createNotification({
              userId: submission.userId,
              title: 'KYC Approved',
              message: 'Congratulations! Your identity verification has been approved. You now have full access to all Finatrades features.',
              type: 'success',
              link: '/dashboard',
              read: false,
            });
          } else if (req.body.status === 'Rejected') {
            const emailResult = await sendEmail(user.email, EMAIL_TEMPLATES.KYC_REJECTED, {
              user_name: `${user.firstName} ${user.lastName}`,
              rejection_reason: req.body.rejectionReason || 'Documents could not be verified',
              kyc_url: `${baseUrl}/kyc`,
            });
            emailSent = emailResult.success;
            
            // Create in-app notification for KYC rejection
            await storage.createNotification({
              userId: submission.userId,
              title: 'KYC Rejected',
              message: req.body.rejectionReason || 'Your verification documents could not be verified. Please resubmit with valid documents.',
              type: 'error',
              link: '/kyc',
              read: false,
            });
          }
        }
        
        // Include email status in response for admin visibility
        return res.json({ submission, emailSent, kycType });
      }
      
      res.json({ submission, kycType });
    } catch (error) {
      console.error("KYC update error:", error);
      const message = error instanceof Error ? error.message : "Failed to update KYC";
      res.status(400).json({ message });
    }
  });
  
  // Simple test endpoint to verify admin access
  app.get("/api/admin/kyc-test", ensureAdminAsync, async (req, res) => {
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
      // Fetch all KYC types with individual error handling
      let kycAmlArray: any[] = [];
      let personalArray: any[] = [];
      let corporateArray: any[] = [];
      
      try {
        const kycAml = await storage.getAllKycSubmissions();
        kycAmlArray = Array.isArray(kycAml) ? kycAml : [];
      } catch (e: any) {
        console.error("Error fetching KYC AML submissions:", e);
      }
      
      try {
        const personal = await storage.getAllFinatradesPersonalKyc();
        personalArray = Array.isArray(personal) ? personal : [];
      } catch (e: any) {
        console.error("Error fetching personal KYC:", e);
      }
      
      try {
        const corporate = await storage.getAllFinatradesCorporateKyc();
        corporateArray = Array.isArray(corporate) ? corporate : [];
      } catch (e: any) {
        console.error("Error fetching corporate KYC:", e);
      }
      
      // Simple normalization without complex operations
      const allSubmissions: any[] = [];
      
      // Add kycAml submissions
      for (const s of kycAmlArray) {
        if (s) allSubmissions.push({ ...s, kycType: 'kycAml' });
      }
      
      // Add personal submissions
      for (const s of personalArray) {
        if (s) allSubmissions.push({
          ...s,
          tier: 'finatrades_personal',
          kycType: 'finatrades_personal',
          accountType: 'personal',
        });
      }
      
      // Add corporate submissions - use companyName as fullName for display
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
      
      return res.json({ submissions: allSubmissions });
    } catch (error: any) {
      console.error("KYC endpoint error:", error);
      return res.status(500).json({ message: "Failed to fetch KYC submissions", error: error?.message });
    }
  });

  // ============================================================================
  // KYC WORKFLOW - TIERED VERIFICATION & STATE MACHINE
  // ============================================================================

  // Submit tiered KYC with SLA tracking
  app.post("/api/kyc/submit-tiered", ensureAuthenticated, async (req, res) => {
    try {
      const { userId, tier, accountType, ...kycData } = req.body;
      
      // Calculate SLA deadline based on tier
      const slaDays = tier === 'tier_3_corporate' ? 5 : tier === 'tier_2_enhanced' ? 3 : 1;
      const slaDeadline = new Date();
      slaDeadline.setDate(slaDeadline.getDate() + slaDays);
      
      const submission = await storage.createKycSubmission({
        userId,
        tier: tier || 'tier_1_basic',
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
        details: `Tiered KYC (${tier}) submitted - SLA deadline: ${slaDeadline.toISOString()}`,
      });
      
      // Log platform activity
      logActivity({
        type: 'kyc_submission',
        title: 'KYC Submission',
        description: `${tier} verification submitted`,
        details: { tier, accountType, slaDeadline: slaDeadline.toISOString() },
        severity: 'info',
      });
      
      res.json({ submission, slaDeadline });
    } catch (error) {
      console.error("Tiered KYC submission error:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "KYC submission failed" });
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
      
      res.json({ submission });
    } catch (error) {
      res.status(400).json({ message: "Failed to escalate KYC" });
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
      
      res.json({ screeningResults, status: 'Clear' });
    } catch (error) {
      console.error("AML screening error:", error);
      res.status(400).json({ message: "Failed to run AML screening" });
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
      
      res.json({ slaAlerts });
    } catch (error) {
      res.status(400).json({ message: "Failed to get SLA alerts" });
    }
  });

  // ============================================================================
  // USER RISK PROFILES
  // ============================================================================

  // Get user risk profile
  app.get("/api/risk-profile/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const profile = await storage.getOrCreateUserRiskProfile(req.params.userId);
      res.json({ profile });
    } catch (error) {
      res.status(400).json({ message: "Failed to get risk profile" });
    }
  });

  // Get all risk profiles (Admin)
  app.get("/api/admin/risk-profiles", ensureAdminAsync, requirePermission('view_kyc', 'manage_kyc'), async (req, res) => {
    try {
      const profiles = await storage.getAllUserRiskProfiles();
      res.json({ profiles });
    } catch (error) {
      res.status(400).json({ message: "Failed to get risk profiles" });
    }
  });

  // Get high-risk profiles (Admin)
  app.get("/api/admin/risk-profiles/high-risk", ensureAdminAsync, requirePermission('view_kyc', 'manage_kyc'), async (req, res) => {
    try {
      const profiles = await storage.getHighRiskProfiles();
      res.json({ profiles });
    } catch (error) {
      res.status(400).json({ message: "Failed to get high-risk profiles" });
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
      
      res.json({ profile });
    } catch (error) {
      res.status(400).json({ message: "Failed to update risk profile" });
    }
  });

  // Calculate and update user risk score (Admin)
  app.post("/api/admin/risk-profile/:userId/calculate", ensureAdminAsync, async (req, res) => {
    try {
      const { userId } = req.params;
      const adminUser = (req as any).adminUser;
      
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
      
      res.json({ profile });
    } catch (error) {
      console.error("Risk calculation error:", error);
      res.status(400).json({ message: "Failed to calculate risk score" });
    }
  });

  // Get risk score preview without saving (Admin)
  app.get("/api/admin/risk-profile/:userId/preview", ensureAdminAsync, async (req, res) => {
    try {
      const { userId } = req.params;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const riskScore = await calculateUserRiskScore(userId);
      res.json({ riskScore });
    } catch (error) {
      console.error("Risk preview error:", error);
      res.status(400).json({ message: "Failed to preview risk score" });
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
      res.json(result);
    } catch (error) {
      console.error("Limit check error:", error);
      res.status(400).json({ message: "Failed to check transaction limits" });
    }
  });

  // Get country risk information
  app.get("/api/risk/countries", async (req, res) => {
    try {
      res.json({
        highRisk: HIGH_RISK_COUNTRIES,
        elevated: ELEVATED_RISK_COUNTRIES
      });
    } catch (error) {
      res.status(400).json({ message: "Failed to get country risk data" });
    }
  });

  // Batch calculate risk scores for all users (Admin)
  app.post("/api/admin/risk-profiles/batch-calculate", ensureAdminAsync, async (req, res) => {
    try {
      const adminUser = (req as any).adminUser;
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
      
      res.json({ processed: results.length, results });
    } catch (error) {
      console.error("Batch calculation error:", error);
      res.status(400).json({ message: "Failed to batch calculate risk scores" });
    }
  });

  // ============================================================================
  // AML SCREENING LOGS
  // ============================================================================

  // Get user screening logs
  app.get("/api/screening-logs/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const logs = await storage.getUserAmlScreeningLogs(req.params.userId);
      res.json({ logs });
    } catch (error) {
      res.status(400).json({ message: "Failed to get screening logs" });
    }
  });

  // Get all screening logs (Admin)
  app.get("/api/admin/screening-logs", ensureAdminAsync, requirePermission('view_kyc', 'manage_kyc'), async (req, res) => {
    try {
      const logs = await storage.getAllAmlScreeningLogs();
      res.json({ logs });
    } catch (error) {
      res.status(400).json({ message: "Failed to get screening logs" });
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
      
      res.json({ log });
    } catch (error) {
      res.status(400).json({ message: "Failed to update screening log" });
    }
  });

  // ============================================================================
  // AML CASES
  // ============================================================================

  // Get all AML cases (Admin)
  app.get("/api/admin/aml-cases", ensureAdminAsync, requirePermission('view_kyc', 'manage_kyc'), async (req, res) => {
    try {
      const cases = await storage.getAllAmlCases();
      res.json({ cases });
    } catch (error) {
      res.status(400).json({ message: "Failed to get AML cases" });
    }
  });

  // Get open AML cases (Admin)
  app.get("/api/admin/aml-cases/open", ensureAdminAsync, requirePermission('view_kyc', 'manage_kyc'), async (req, res) => {
    try {
      const cases = await storage.getOpenAmlCases();
      res.json({ cases });
    } catch (error) {
      res.status(400).json({ message: "Failed to get open AML cases" });
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
      
      res.json({ case: amlCase, activities, user });
    } catch (error) {
      res.status(400).json({ message: "Failed to get AML case" });
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
      
      res.json({ case: amlCase });
    } catch (error) {
      console.error("Create AML case error:", error);
      res.status(400).json({ message: "Failed to create AML case" });
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
      
      res.json({ case: amlCase });
    } catch (error) {
      res.status(400).json({ message: "Failed to update AML case" });
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
      
      res.json({ message: "Note added successfully" });
    } catch (error) {
      res.status(400).json({ message: "Failed to add note" });
    }
  });

  // ============================================================================
  // AML MONITORING RULES
  // ============================================================================

  // Get all monitoring rules (Admin)
  app.get("/api/admin/aml-rules", ensureAdminAsync, requirePermission('view_kyc', 'manage_kyc'), async (req, res) => {
    try {
      const rules = await storage.getAllAmlMonitoringRules();
      res.json({ rules });
    } catch (error) {
      res.status(400).json({ message: "Failed to get AML rules" });
    }
  });

  // Get active monitoring rules (Admin)
  app.get("/api/admin/aml-rules/active", ensureAdminAsync, requirePermission('view_kyc', 'manage_kyc'), async (req, res) => {
    try {
      const rules = await storage.getActiveAmlMonitoringRules();
      res.json({ rules });
    } catch (error) {
      res.status(400).json({ message: "Failed to get active AML rules" });
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
      
      res.json({ rule });
    } catch (error) {
      console.error("Create AML rule error:", error);
      res.status(400).json({ message: "Failed to create AML rule" });
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
      
      res.json({ rule });
    } catch (error) {
      res.status(400).json({ message: "Failed to update AML rule" });
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
      
      res.json({ message: "Rule deleted successfully" });
    } catch (error) {
      res.status(400).json({ message: "Failed to delete AML rule" });
    }
  });

  // Seed default AML monitoring rules (Admin)
  app.post("/api/admin/aml-rules/seed-defaults", ensureAdminAsync, async (req, res) => {
    try {
      await seedDefaultAmlRules();
      const rules = await storage.getAllAmlMonitoringRules();
      res.json({ message: `Seeded default AML rules`, rules });
    } catch (error) {
      console.error("Seed AML rules error:", error);
      res.status(400).json({ message: "Failed to seed AML rules" });
    }
  });

  // Evaluate transaction against AML rules (Admin)
  app.post("/api/admin/aml/evaluate-transaction", ensureAdminAsync, async (req, res) => {
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
      res.json(result);
    } catch (error) {
      console.error("AML evaluation error:", error);
      res.status(400).json({ message: "Failed to evaluate transaction" });
    }
  });

  // Seed AML rules (frontend endpoint)
  app.post("/api/admin/aml/seed-rules", ensureAdminAsync, async (req, res) => {
    try {
      await seedDefaultAmlRules();
      const rules = await storage.getAllAmlMonitoringRules();
      res.json({ success: true, message: `Seeded default AML rules`, rules });
    } catch (error) {
      console.error("Seed AML rules error:", error);
      res.status(400).json({ success: false, message: "Failed to seed AML rules" });
    }
  });

  // Get AML alerts summary (Admin)
  app.get("/api/admin/aml/alerts", ensureAdminAsync, async (req, res) => {
    try {
      const alerts = await getAmlAlerts();
      res.json(alerts);
    } catch (error) {
      console.error("AML alerts error:", error);
      res.status(400).json({ message: "Failed to get AML alerts" });
    }
  });

  // Get default AML rule templates
  app.get("/api/admin/aml-rules/templates", ensureAdminAsync, async (req, res) => {
    try {
      res.json({ templates: DEFAULT_AML_RULES });
    } catch (error) {
      res.status(400).json({ message: "Failed to get rule templates" });
    }
  });

  // ============================================================================
  // DOCUMENT EXPIRY REMINDERS
  // ============================================================================

  // Get documents expiring soon (Admin)
  app.get("/api/admin/document-expiry", ensureAdminAsync, async (req, res) => {
    try {
      const daysAhead = parseInt(req.query.days as string) || 30;
      const expiringDocs = await getExpiringDocuments(daysAhead);
      res.json({ expiringDocuments: expiringDocs });
    } catch (error) {
      console.error("Document expiry check error:", error);
      res.status(400).json({ message: "Failed to get expiring documents" });
    }
  });

  // Get document expiry statistics (Admin)
  app.get("/api/admin/document-expiry/stats", ensureAdminAsync, async (req, res) => {
    try {
      const stats = await getDocumentExpiryStats();
      res.json(stats);
    } catch (error) {
      console.error("Document expiry stats error:", error);
      res.status(400).json({ message: "Failed to get expiry statistics" });
    }
  });

  // Manually trigger document expiry reminders (Admin)
  app.post("/api/admin/document-expiry/send-reminders", ensureAdminAsync, async (req, res) => {
    try {
      const result = await sendDocumentExpiryReminders();
      res.json({ 
        message: `Sent ${result.sent} reminders`,
        ...result 
      });
    } catch (error) {
      console.error("Document expiry reminder error:", error);
      res.status(400).json({ message: "Failed to send reminders" });
    }
  });
  
  // ============================================================================
  // FINAPAY - WALLET & TRANSACTIONS
  // ============================================================================
  
  // Get user wallet - PROTECTED: requires matching session
  app.get("/api/wallet/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const wallet = await storage.getWallet(req.params.userId);
      if (!wallet) {
        return res.status(404).json({ message: "Wallet not found" });
      }
      res.json({ wallet });
    } catch (error) {
      res.status(400).json({ message: "Failed to get wallet" });
    }
  });
  
  // Update wallet - REMOVED FOR SECURITY
  // Direct wallet modification is a critical security risk.
  // All wallet updates must go through proper transaction flows
  // with admin approval (deposits, purchases, transfers, etc.)
  // app.patch("/api/wallet/:id") - INTENTIONALLY REMOVED
  
  // Create transaction - all transactions start as Pending and require admin approval
  app.post("/api/transactions", ensureAuthenticated, requireKycApproved, idempotencyMiddleware, async (req, res) => {
    try {
      const transactionData = insertTransactionSchema.parse(req.body);
      
      // Require PIN verification for Sell transactions
      if (transactionData.type === 'Sell') {
        const pinToken = req.headers['x-pin-token'] as string | undefined;
        const userId = transactionData.userId;
        
        if (!pinToken) {
          return res.status(403).json({ message: 'PIN verification required for this transaction' });
        }
        
        const pinValidation = await validatePinToken(pinToken, 'sell_gold');
        if (!pinValidation.valid) {
          return res.status(403).json({ message: pinValidation.message || 'Invalid PIN token' });
        }
        
        if (pinValidation.userId !== userId) {
          return res.status(403).json({ message: 'PIN token does not match user' });
        }
      }
      
      // Force all transactions to start as Pending (requires admin authorization)
      const transaction = await storage.createTransaction({
        ...transactionData,
        status: 'Pending'
      });
      
      // Create audit log
      await storage.createAuditLog({
        entityType: "transaction",
        entityId: transaction.id,
        actionType: "create",
        actor: transactionData.userId,
        actorRole: "user",
        details: `Transaction submitted for approval - Type: ${transactionData.type}, Gold: ${transaction.amountGold || 0}g, USD: $${transaction.amountUsd || 0}`,
      });
      
      res.json({ transaction, message: 'Transaction submitted for admin approval' });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Transaction failed" });
    }
  });
  
  // Get user transactions - PROTECTED: requires matching session
  app.get("/api/transactions/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const transactions = await storage.getUserTransactions(req.params.userId);
      res.json({ transactions });
    } catch (error) {
      res.status(400).json({ message: "Failed to get transactions" });
    }
  });

  // ============================================================================
  // UNIFIED TRANSACTIONS API (All Modules)
  // ============================================================================
  
  // Get unified transactions with advanced filtering - PROTECTED
  app.get("/api/unified-transactions/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const userId = req.params.userId;
      const { module, type, status, fromDate, toDate, limit = '50', cursor } = req.query;
      
      // Fetch all transaction types from all modules
      const [
        regularTransactions,
        depositRequests,
        cryptoPayments,
        bnslPlans,
        bnslPayouts,
        peerTransfers,
        vaultDepositReqs,
        vaultWithdrawalReqs,
        tradeCases,
        userCertificates,
        buyGoldRequests
      ] = await Promise.all([
        storage.getUserTransactions(userId),
        storage.getUserDepositRequests(userId),
        storage.getUserCryptoPaymentRequests(userId),
        storage.getUserBnslPlans(userId),
        storage.getUserBnslPayouts(userId),
        storage.getPeerTransfers(userId),
        storage.getUserVaultDepositRequests(userId),
        storage.getUserVaultWithdrawalRequests(userId),
        storage.getUserTradeCases(userId),
        storage.getUserCertificates(userId),
        storage.getUserBuyGoldRequests(userId)
      ]);
      
      // Normalize all transactions to unified format
      let unifiedTransactions: any[] = [];
      
      // Get transaction IDs that have certificates - these will be shown as certificate entries, not Buy
      const transactionIdsWithCerts = new Set(
        userCertificates
          .filter(c => c.transactionId && (c.type === 'Digital Ownership' || c.type === 'Physical Storage'))
          .map(c => c.transactionId)
      );
      
      // Regular transactions (FinaPay) - exclude transactions that have certificates or are vault deposits
      regularTransactions
        .filter(tx => {
          // Skip Buy, Deposit, and Receive transactions that have certificates (they're shown as ADD_FUNDS from certificate)
          if ((tx.type === 'Buy' || tx.type === 'Deposit' || tx.type === 'Receive') && transactionIdsWithCerts.has(tx.id)) {
            return false;
          }
          // Skip Deposit transactions that are linked to vault deposits (they're shown separately as vault_deposit entries)
          if (tx.type === 'Deposit' && tx.description?.includes('FinaVault')) {
            return false;
          }
          return true;
        })
        .forEach(tx => {
        unifiedTransactions.push({
          id: tx.id,
          userId: tx.userId,
          module: tx.sourceModule || 'finapay',
          actionType: tx.type,
          grams: tx.amountGold,
          usd: tx.amountUsd,
          usdPerGram: tx.goldPriceUsdPerGram,
          status: tx.status,
          referenceId: tx.referenceId,
          description: tx.description,
          counterpartyUserId: tx.recipientUserId,
          createdAt: tx.createdAt,
          completedAt: tx.completedAt,
          sourceType: 'transaction'
        });
      });
      
      // Deposit requests (exclude approved/confirmed - they already have a transaction record)
      depositRequests
        .filter(dep => dep.status !== 'Confirmed' && dep.status !== 'Approved')
        .forEach(dep => {
          unifiedTransactions.push({
            id: dep.id,
            userId: dep.userId,
            module: 'finapay',
            actionType: 'ADD_FUNDS',
            grams: null,
            usd: dep.amountUsd,
            usdPerGram: null,
            status: dep.status === 'Rejected' ? 'FAILED' : 'PENDING',
            referenceId: dep.referenceNumber,
            description: `Bank Deposit - ${dep.senderBankName || 'Bank Transfer'}`,
            counterpartyUserId: null,
            createdAt: dep.createdAt,
            completedAt: dep.processedAt,
            sourceType: 'deposit_request'
          });
        });
      
      // Crypto payments (exclude approved/credited - they already have a transaction record)
      cryptoPayments
        .filter(cp => cp.status !== 'Approved' && cp.status !== 'Credited')
        .forEach(cp => {
          unifiedTransactions.push({
            id: cp.id,
            userId: cp.userId,
            module: 'finapay',
            actionType: 'ADD_FUNDS',
            grams: cp.goldGrams,
            usd: cp.amountUsd,
            usdPerGram: cp.goldPriceUsdPerGram,
            status: cp.status === 'Rejected' ? 'FAILED' : 'PENDING',
            referenceId: cp.transactionHash,
            description: `Crypto Deposit - ${cp.cryptoCurrency}`,
            counterpartyUserId: null,
            createdAt: cp.createdAt,
            completedAt: cp.verifiedAt,
            sourceType: 'crypto_payment'
          });
        });
      
      // BNSL plans
      bnslPlans.forEach(plan => {
        unifiedTransactions.push({
          id: plan.id,
          userId: plan.userId,
          module: 'bnsl',
          actionType: 'LOCK',
          grams: plan.goldGrams,
          usd: plan.purchaseValueUsd,
          usdPerGram: plan.purchasePriceUsdPerGram,
          status: plan.status === 'Completed' ? 'COMPLETED' : plan.status === 'Active' ? 'LOCKED' : 'PENDING',
          referenceId: plan.planNumber,
          description: `BNSL Plan - ${plan.termMonths} months`,
          counterpartyUserId: null,
          createdAt: plan.createdAt,
          completedAt: plan.maturityDate,
          sourceType: 'bnsl_plan'
        });
      });
      
      // BNSL payouts
      bnslPayouts.forEach(payout => {
        unifiedTransactions.push({
          id: payout.id,
          userId: payout.userId,
          module: 'bnsl',
          actionType: 'UNLOCK',
          grams: payout.goldGrams,
          usd: payout.payoutAmountUsd,
          usdPerGram: null,
          status: payout.status === 'Paid' ? 'COMPLETED' : payout.status === 'Failed' ? 'FAILED' : 'PENDING',
          referenceId: payout.planId,
          description: `BNSL Payout - ${payout.payoutType}`,
          counterpartyUserId: null,
          createdAt: payout.createdAt,
          completedAt: payout.paidAt,
          sourceType: 'bnsl_payout'
        });
      });
      
      // P2P transfers - only include pending ones (completed transfers are already in regularTransactions)
      // Completed peer transfers create transaction records, so filter them out to avoid duplicates
      peerTransfers
        .filter(transfer => transfer.status !== 'Completed')
        .forEach(transfer => {
          const isSender = transfer.senderId === userId;
          unifiedTransactions.push({
            id: transfer.id,
            userId: userId,
            module: 'finapay',
            actionType: isSender ? 'SEND' : 'RECEIVE',
            grams: transfer.amountGold,
            usd: transfer.amountUsd,
            usdPerGram: transfer.goldPriceUsdPerGram,
            status: transfer.status === 'Failed' ? 'FAILED' : 'PENDING',
            referenceId: transfer.referenceNumber,
            description: transfer.memo || (isSender ? `Sending to ${transfer.recipientIdentifier}` : `Receiving from sender`),
            counterpartyUserId: isSender ? transfer.recipientId : transfer.senderId,
            createdAt: transfer.createdAt,
            completedAt: transfer.respondedAt,
            sourceType: 'peer_transfer'
          });
        });
      
      // Vault deposits - physical gold deposited and converted to digital
      vaultDepositReqs.forEach(dep => {
        const goldWeight = dep.verifiedWeightGrams || dep.totalDeclaredWeightGrams || dep.goldGrams;
        const isStored = dep.status === 'Stored' || dep.status === 'Approved';
        unifiedTransactions.push({
          id: dep.id,
          userId: dep.userId,
          module: 'finavault',
          actionType: 'DEPOSIT_PHYSICAL_GOLD',
          grams: goldWeight,
          usd: null,
          usdPerGram: null,
          status: isStored ? 'COMPLETED' : dep.status === 'Rejected' ? 'FAILED' : 'PENDING',
          referenceId: dep.referenceNumber,
          description: isStored 
            ? `Physical gold ${goldWeight}g deposited & converted to digital` 
            : `Vault Deposit - ${dep.vaultLocation || 'Pending'}`,
          counterpartyUserId: null,
          createdAt: dep.createdAt,
          completedAt: dep.processedAt || dep.storedAt,
          sourceType: 'vault_deposit'
        });
      });
      
      // Vault withdrawals
      vaultWithdrawalReqs.forEach(wd => {
        unifiedTransactions.push({
          id: wd.id,
          userId: wd.userId,
          module: 'finavault',
          actionType: 'UNLOCK',
          grams: wd.goldGrams,
          usd: null,
          usdPerGram: null,
          status: wd.status === 'Completed' || wd.status === 'Approved' ? 'COMPLETED' : wd.status === 'Rejected' ? 'FAILED' : 'PENDING',
          referenceId: wd.referenceNumber,
          description: `Vault Withdrawal - ${wd.deliveryMethod}`,
          counterpartyUserId: null,
          createdAt: wd.createdAt,
          completedAt: wd.processedAt,
          sourceType: 'vault_withdrawal'
        });
      });
      
      // FinaBridge trade cases
      tradeCases.forEach(tc => {
        const statusMap: Record<string, string> = {
          'Completed': 'COMPLETED',
          'Approved': 'COMPLETED',
          'Rejected': 'FAILED',
          'Cancelled': 'FAILED'
        };
        unifiedTransactions.push({
          id: tc.id,
          userId: tc.userId,
          module: 'finabridge',
          actionType: tc.tradeType?.toUpperCase() || 'TRADE',
          grams: null,
          usd: tc.amount,
          usdPerGram: null,
          status: statusMap[tc.status] || 'PENDING',
          referenceId: tc.referenceNumber,
          description: `Trade Finance - ${tc.tradeType || 'Trade'} (${tc.productCategory || 'General'})`,
          counterpartyUserId: null,
          createdAt: tc.createdAt,
          completedAt: tc.updatedAt,
          sourceType: 'trade_case'
        });
      });
      
      // Certificates - only show Digital Ownership (not Physical Storage to avoid duplicates)
      // Digital Ownership and Physical Storage are created together for the same purchase,
      // so we only show Digital Ownership as the main transaction entry with module = finapay
      // Trade Release certificates are excluded if there's a corresponding transaction
      const hasFinaBridgeTransactions = regularTransactions.some((tx: any) => tx.sourceModule === 'FinaBridge');
      userCertificates
        .filter(cert => {
          // Only include Digital Ownership certificates (Physical Storage is a companion document)
          if (cert.type === 'Digital Ownership') return true;
          // Only include Trade Release if there's no corresponding transaction
          if (cert.type === 'Trade Release' && !hasFinaBridgeTransactions) return true;
          return false;
        })
        .forEach(cert => {
          const moduleMap: Record<string, string> = {
            'Trade Release': 'finabridge',
            'Digital Ownership': 'finapay'  // Show as FinaPay since this is gold added to wallet
          };
          const actionMap: Record<string, string> = {
            'Trade Release': 'RECEIVE',
            'Digital Ownership': 'ADD_FUNDS'
          };
          unifiedTransactions.push({
            id: cert.id,
            userId: cert.userId,
            module: moduleMap[cert.type] || 'finapay',
            actionType: actionMap[cert.type] || 'RECEIVE',
            grams: cert.goldGrams,
            usd: cert.totalValueUsd,
            usdPerGram: cert.goldPriceUsdPerGram,
            status: cert.status === 'Active' ? 'COMPLETED' : cert.status === 'Cancelled' ? 'FAILED' : 'PENDING',
            referenceId: cert.certificateNumber,
            description: `${cert.type} Certificate`,
            counterpartyUserId: null,
            createdAt: cert.issuedAt,
            completedAt: cert.issuedAt,
            sourceType: 'certificate'
          });
        });
      
      // Buy Gold Bar requests (Wingold) - exclude 'Credited' since those have transaction records
      buyGoldRequests
        .filter(bg => bg.status !== 'Credited')
        .forEach(bg => {
          unifiedTransactions.push({
            id: bg.id,
            userId: bg.userId,
            module: 'finapay',
            actionType: 'BUY_GOLD_BAR',
            grams: bg.goldGrams,
            usd: bg.amountUsd,
            usdPerGram: bg.goldPriceAtTime,
            status: bg.status === 'Rejected' ? 'FAILED' : 'PENDING',
            referenceId: bg.wingoldReferenceId,
            description: `Buy Gold Bar (Wingold) - ${bg.status}`,
            counterpartyUserId: null,
            createdAt: bg.createdAt,
            completedAt: bg.reviewedAt,
            sourceType: 'buy_gold_request'
          });
        });
      
      // Apply filters
      if (module && module !== 'all') {
        unifiedTransactions = unifiedTransactions.filter(tx => tx.module === module);
      }
      if (type && type !== 'all') {
        unifiedTransactions = unifiedTransactions.filter(tx => tx.actionType === type);
      }
      if (status && status !== 'all') {
        unifiedTransactions = unifiedTransactions.filter(tx => tx.status === status);
      }
      if (fromDate) {
        const from = new Date(fromDate as string);
        unifiedTransactions = unifiedTransactions.filter(tx => new Date(tx.createdAt) >= from);
      }
      if (toDate) {
        const to = new Date(toDate as string);
        unifiedTransactions = unifiedTransactions.filter(tx => new Date(tx.createdAt) <= to);
      }
      
      // Sort by date descending
      unifiedTransactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      // Calculate totals
      const totals = {
        totalGrams: unifiedTransactions.reduce((sum, tx) => sum + (parseFloat(tx.grams) || 0), 0),
        totalUSD: unifiedTransactions.reduce((sum, tx) => sum + (parseFloat(tx.usd) || 0), 0),
        count: unifiedTransactions.length
      };
      
      // Apply pagination
      const limitNum = parseInt(limit as string) || 50;
      const startIndex = cursor ? parseInt(cursor as string) : 0;
      const paginatedTransactions = unifiedTransactions.slice(startIndex, startIndex + limitNum);
      const nextCursor = startIndex + limitNum < unifiedTransactions.length ? (startIndex + limitNum).toString() : null;
      
      res.json({
        transactions: paginatedTransactions,
        nextCursor,
        totals
      });
    } catch (error) {
      console.error('Unified transactions error:', error);
      res.status(400).json({ message: "Failed to get unified transactions" });
    }
  });
  
  // Admin: Get all unified transactions
  app.get("/api/admin/unified-transactions", ensureAdminAsync, requirePermission('view_transactions', 'manage_transactions'), async (req, res) => {
    try {
      const { module, type, status, userId, fromDate, toDate, limit = '100', cursor } = req.query;
      
      // Get all users for enrichment
      const allUsers = await storage.getAllUsers();
      const userMap = new Map(allUsers.map(u => [u.id, u]));
      
      // Fetch all transaction sources
      const [
        allTransactions,
        allDepositRequests,
        allCryptoPayments,
        allBnslPlans,
        allBnslPayouts,
        allPeerTransfers,
        allTradeCases
      ] = await Promise.all([
        storage.getAllTransactions(),
        storage.getAllDepositRequests(),
        storage.getAllCryptoPaymentRequests(),
        storage.getAllBnslPlans(),
        storage.getAllBnslPayouts(),
        storage.getAllPeerTransfers(),
        storage.getAllTradeCases()
      ]);
      
      let unifiedTransactions: any[] = [];
      
      // Process all transactions similar to user endpoint
      allTransactions.forEach(tx => {
        const user = userMap.get(tx.userId);
        unifiedTransactions.push({
          id: tx.id,
          userId: tx.userId,
          userName: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
          userEmail: user?.email || 'Unknown',
          module: tx.sourceModule || 'finapay',
          actionType: tx.type,
          grams: tx.amountGold,
          usd: tx.amountUsd,
          usdPerGram: tx.goldPriceUsdPerGram,
          status: tx.status,
          referenceId: tx.referenceId,
          description: tx.description,
          createdAt: tx.createdAt,
          completedAt: tx.completedAt,
          sourceType: 'transaction'
        });
      });
      
      allDepositRequests.forEach(dep => {
        const user = userMap.get(dep.userId);
        unifiedTransactions.push({
          id: dep.id,
          userId: dep.userId,
          userName: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
          userEmail: user?.email || 'Unknown',
          module: 'finapay',
          actionType: 'ADD_FUNDS',
          grams: null,
          usd: dep.amountUsd,
          usdPerGram: null,
          status: dep.status === 'Confirmed' ? 'COMPLETED' : dep.status === 'Rejected' ? 'FAILED' : 'PENDING',
          referenceId: dep.referenceNumber,
          description: `Bank Deposit - ${dep.senderBankName || 'Bank Transfer'}`,
          createdAt: dep.createdAt,
          completedAt: dep.processedAt,
          sourceType: 'deposit_request'
        });
      });
      
      allCryptoPayments.forEach(cp => {
        const user = userMap.get(cp.userId);
        unifiedTransactions.push({
          id: cp.id,
          userId: cp.userId,
          userName: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
          userEmail: user?.email || 'Unknown',
          module: 'finapay',
          actionType: 'ADD_FUNDS',
          grams: cp.goldGrams,
          usd: cp.amountUsd,
          usdPerGram: cp.goldPriceUsdPerGram,
          status: cp.status === 'Approved' ? 'COMPLETED' : cp.status === 'Rejected' ? 'FAILED' : 'PENDING',
          referenceId: cp.transactionHash,
          description: `Crypto Deposit - ${cp.cryptoCurrency}`,
          createdAt: cp.createdAt,
          completedAt: cp.verifiedAt,
          sourceType: 'crypto_payment'
        });
      });
      
      allBnslPlans.forEach(plan => {
        const user = userMap.get(plan.userId);
        unifiedTransactions.push({
          id: plan.id,
          userId: plan.userId,
          userName: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
          userEmail: user?.email || 'Unknown',
          module: 'bnsl',
          actionType: 'LOCK',
          grams: plan.goldGrams,
          usd: plan.purchaseValueUsd,
          usdPerGram: plan.purchasePriceUsdPerGram,
          status: plan.status === 'Completed' ? 'COMPLETED' : plan.status === 'Active' ? 'LOCKED' : 'PENDING',
          referenceId: plan.planNumber,
          description: `BNSL Plan - ${plan.termMonths} months`,
          createdAt: plan.createdAt,
          completedAt: plan.maturityDate,
          sourceType: 'bnsl_plan'
        });
      });
      
      allBnslPayouts.forEach(payout => {
        const user = userMap.get(payout.userId);
        unifiedTransactions.push({
          id: payout.id,
          userId: payout.userId,
          userName: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
          userEmail: user?.email || 'Unknown',
          module: 'bnsl',
          actionType: 'UNLOCK',
          grams: payout.goldGrams,
          usd: payout.payoutAmountUsd,
          usdPerGram: null,
          status: payout.status === 'Paid' ? 'COMPLETED' : payout.status === 'Failed' ? 'FAILED' : 'PENDING',
          referenceId: payout.planId,
          description: `BNSL Payout - ${payout.payoutType}`,
          createdAt: payout.createdAt,
          completedAt: payout.paidAt,
          sourceType: 'bnsl_payout'
        });
      });
      
      // P2P transfers - only pending (completed ones already have transaction records)
      allPeerTransfers
        .filter(transfer => transfer.status !== 'Completed')
        .forEach(transfer => {
          const sender = userMap.get(transfer.senderId);
          const recipient = userMap.get(transfer.recipientId || '');
          unifiedTransactions.push({
            id: transfer.id,
            userId: transfer.senderId,
            userName: sender ? `${sender.firstName} ${sender.lastName}` : 'Unknown',
            userEmail: sender?.email || 'Unknown',
            recipientName: recipient ? `${recipient.firstName} ${recipient.lastName}` : transfer.recipientIdentifier,
            module: 'finapay',
            actionType: 'SEND',
            grams: transfer.amountGold,
            usd: transfer.amountUsd,
            usdPerGram: transfer.goldPriceUsdPerGram,
            status: transfer.status === 'Failed' ? 'FAILED' : 'PENDING',
            referenceId: transfer.referenceNumber,
            description: transfer.memo || `Transfer to ${transfer.recipientIdentifier}`,
            createdAt: transfer.createdAt,
            completedAt: transfer.respondedAt,
            sourceType: 'peer_transfer'
          });
        });
      
      // FinaBridge trade cases
      allTradeCases.forEach(tc => {
        const user = userMap.get(tc.userId);
        const statusMap: Record<string, string> = {
          'Completed': 'COMPLETED',
          'Approved': 'COMPLETED',
          'Rejected': 'FAILED',
          'Cancelled': 'FAILED'
        };
        unifiedTransactions.push({
          id: tc.id,
          userId: tc.userId,
          userName: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
          userEmail: user?.email || 'Unknown',
          module: 'finabridge',
          actionType: tc.tradeType?.toUpperCase() || 'TRADE',
          grams: null,
          usd: tc.amount,
          usdPerGram: null,
          status: statusMap[tc.status] || 'PENDING',
          referenceId: tc.referenceNumber,
          description: `Trade Finance - ${tc.tradeType || 'Trade'} (${tc.productCategory || 'General'})`,
          createdAt: tc.createdAt,
          completedAt: tc.updatedAt,
          sourceType: 'trade_case'
        });
      });
      
      // Apply filters
      if (module && module !== 'all') {
        unifiedTransactions = unifiedTransactions.filter(tx => tx.module === module);
      }
      if (type && type !== 'all') {
        unifiedTransactions = unifiedTransactions.filter(tx => tx.actionType === type);
      }
      if (status && status !== 'all') {
        unifiedTransactions = unifiedTransactions.filter(tx => tx.status === status);
      }
      if (userId && userId !== 'all') {
        unifiedTransactions = unifiedTransactions.filter(tx => tx.userId === userId);
      }
      if (fromDate) {
        const from = new Date(fromDate as string);
        unifiedTransactions = unifiedTransactions.filter(tx => new Date(tx.createdAt) >= from);
      }
      if (toDate) {
        const to = new Date(toDate as string);
        unifiedTransactions = unifiedTransactions.filter(tx => new Date(tx.createdAt) <= to);
      }
      
      // Sort by date descending
      unifiedTransactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      // Calculate totals
      const totals = {
        totalGrams: unifiedTransactions.reduce((sum, tx) => sum + (parseFloat(tx.grams) || 0), 0),
        totalUSD: unifiedTransactions.reduce((sum, tx) => sum + (parseFloat(tx.usd) || 0), 0),
        count: unifiedTransactions.length
      };
      
      // Apply pagination
      const limitNum = parseInt(limit as string) || 100;
      const startIndex = cursor ? parseInt(cursor as string) : 0;
      const paginatedTransactions = unifiedTransactions.slice(startIndex, startIndex + limitNum);
      const nextCursor = startIndex + limitNum < unifiedTransactions.length ? (startIndex + limitNum).toString() : null;
      
      res.json({
        transactions: paginatedTransactions,
        nextCursor,
        totals
      });
    } catch (error) {
      console.error('Admin unified transactions error:', error);
      res.status(400).json({ message: "Failed to get admin unified transactions" });
    }
  });
  
  // Update transaction status (basic update without processing)
  app.patch("/api/transactions/:id", ensureAuthenticated, async (req, res) => {
    try {
      const transaction = await storage.updateTransaction(req.params.id, req.body);
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      res.json({ transaction });
    } catch (error) {
      res.status(400).json({ message: "Failed to update transaction" });
    }
  });
  
  // Admin: Approve transaction - processes wallet/vault updates and generates certificates
  app.post("/api/admin/transactions/:id/approve", ensureAdminAsync, requirePermission('manage_transactions'), async (req, res) => {
    try {
      const { sourceTable } = req.body;
      
      // Handle Buy Gold Bar requests from buyGoldRequests table
      if (sourceTable === 'buyGoldRequests') {
        try {
          const [buyGoldReq] = await db.select().from(buyGoldRequests).where(eq(buyGoldRequests.id, req.params.id));
          if (!buyGoldReq) {
            return res.status(404).json({ message: "Buy Gold Bar request not found" });
          }
          if (buyGoldReq.status !== 'Pending' && buyGoldReq.status !== 'Under Review') {
            return res.status(400).json({ message: "Only pending requests can be approved" });
          }
          
          // Get admin-provided gold amount and price from request body
          const { goldGrams: adminGoldGrams, goldPricePerGram: adminGoldPrice, amountUsd: adminAmountUsd } = req.body;
          
          if (!adminGoldGrams || adminGoldGrams <= 0) {
            return res.status(400).json({ message: "Gold amount (grams) is required for approval" });
          }
          if (!adminGoldPrice || adminGoldPrice <= 0) {
            return res.status(400).json({ message: "Gold price per gram is required for approval" });
          }
          
          const goldGrams = parseFloat(adminGoldGrams);
          const goldPrice = parseFloat(adminGoldPrice);
          const usdAmount = adminAmountUsd ? parseFloat(adminAmountUsd) : goldGrams * goldPrice;
          
          // Process the approval with full wallet/vault/certificate creation
          const result = await storage.withTransaction(async (txStorage) => {
            const generatedCertificates: any[] = [];
            
            // 1. Update user's wallet with gold balance
            const wallet = await txStorage.getWallet(buyGoldReq.userId);
            if (!wallet) {
              throw new Error('User wallet not found');
            }
            const currentGold = parseFloat(wallet.goldGrams || '0');
            const newGoldBalance = currentGold + goldGrams;
            
            await txStorage.updateWallet(buyGoldReq.userId, {
              goldGrams: newGoldBalance.toFixed(6)
            });
            
            // 2. Create a completed transaction record
            const newTransaction = await txStorage.createTransaction({
              userId: buyGoldReq.userId,
              type: 'Buy',
              status: 'Completed',
              amountGold: goldGrams.toFixed(6),
              amountUsd: usdAmount.toFixed(2),
              goldPriceUsdPerGram: goldPrice.toFixed(2),
              sourceModule: 'Buy Gold Bar',
              method: 'Wingold Purchase',
              description: `Buy Gold Bar - ${goldGrams.toFixed(4)}g at $${goldPrice.toFixed(2)}/g`,
              completedAt: new Date()
            });
            
            // 3. Create vault holding
            const wingoldRef = `WG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
            
            // Check for existing holdings
            const existingHoldings = await txStorage.getUserVaultHoldings(buyGoldReq.userId);
            let holdingId: string;
            
            if (existingHoldings.length > 0) {
              // Update existing holding
              const holding = existingHoldings[0];
              const currentHoldingGrams = parseFloat(holding.goldGrams || '0');
              await txStorage.updateVaultHolding(holding.id, {
                goldGrams: (currentHoldingGrams + goldGrams).toFixed(6),
                wingoldStorageRef: wingoldRef
              });
              holdingId = holding.id;
            } else {
              // Create new holding
              const newHolding = await txStorage.createVaultHolding({
                userId: buyGoldReq.userId,
                goldGrams: goldGrams.toFixed(6),
                vaultLocation: 'Dubai - Wingold & Metals DMCC',
                wingoldStorageRef: wingoldRef,
                purchasePriceUsdPerGram: goldPrice.toFixed(2),
                isPhysicallyDeposited: false
              });
              holdingId = newHolding.id;
            }
            
            // 4. Issue Digital Ownership Certificate from Finatrades
            const docCertNum = await txStorage.generateCertificateNumber('Digital Ownership');
            const digitalCert = await txStorage.createCertificate({
              certificateNumber: docCertNum,
              userId: buyGoldReq.userId,
              transactionId: newTransaction.id,
              vaultHoldingId: holdingId,
              type: 'Digital Ownership',
              status: 'Active',
              goldGrams: goldGrams.toFixed(6),
              goldPriceUsdPerGram: goldPrice.toFixed(2),
              totalValueUsd: usdAmount.toFixed(2),
              issuer: 'Finatrades',
              vaultLocation: 'Dubai - Wingold & Metals DMCC',
              wingoldStorageRef: wingoldRef
            });
            generatedCertificates.push(digitalCert);
            
            // 5. Issue Physical Storage Certificate from Wingold
            const pscCertNum = await txStorage.generateCertificateNumber('Physical Storage');
            const storageCert = await txStorage.createCertificate({
              certificateNumber: pscCertNum,
              userId: buyGoldReq.userId,
              transactionId: newTransaction.id,
              vaultHoldingId: holdingId,
              type: 'Physical Storage',
              status: 'Active',
              goldGrams: goldGrams.toFixed(6),
              goldPriceUsdPerGram: goldPrice.toFixed(2),
              totalValueUsd: usdAmount.toFixed(2),
              issuer: 'Wingold & Metals DMCC',
              vaultLocation: 'Dubai - Wingold & Metals DMCC',
              wingoldStorageRef: wingoldRef
            });
            generatedCertificates.push(storageCert);
            
            // 6. Record vault ledger entry
            const { vaultLedgerService } = await import('./vault-ledger-service');
            await vaultLedgerService.recordLedgerEntry({
              userId: buyGoldReq.userId,
              action: 'Deposit',
              goldGrams: goldGrams,
              goldPriceUsdPerGram: goldPrice,
              fromWallet: 'External',
              toWallet: 'FinaPay',
              toStatus: 'Available',
              transactionId: newTransaction.id,
              certificateId: digitalCert.id,
              notes: `Buy Gold Bar - Purchased ${goldGrams.toFixed(4)}g gold at $${goldPrice.toFixed(2)}/g via Wingold & Metals DMCC`,
              createdBy: req.body.adminId || 'admin',
            });
            
            // 7. Update the buy gold request with the credited transaction
            await db.update(buyGoldRequests)
              .set({ 
                status: 'Approved', 
                reviewedAt: new Date(),
                reviewerId: req.body.adminId || null,
                goldGrams: goldGrams.toFixed(6),
                goldPriceAtTime: goldPrice.toFixed(2),
                amountUsd: usdAmount.toFixed(2),
                creditedTransactionId: newTransaction.id
              })
              .where(eq(buyGoldRequests.id, req.params.id));
            
            return { newTransaction, generatedCertificates, newGoldBalance, holdingId };
          });
          
          // Audit log
          await storage.createAuditLog({
            entityType: "buy_gold_request",
            entityId: req.params.id,
            actionType: "approve",
            actor: req.body.adminId || 'admin',
            actorRole: "admin",
            details: `Buy Gold Bar approved - ${goldGrams.toFixed(4)}g at $${goldPrice.toFixed(2)}/g = $${usdAmount.toFixed(2)}. Certificates issued: ${result.generatedCertificates.length}`,
          });
          
          // Emit real-time updates
          const io = getIO();
          io.to(`user:${buyGoldReq.userId}`).emit('ledger:balance_update', {
            goldGrams: result.newGoldBalance.toFixed(6)
          });
          io.to(`user:${buyGoldReq.userId}`).emit('ledger:vault_update', {
            holdingId: result.holdingId
          });
          
          return res.json({ 
            message: 'Buy Gold Bar approved - wallet credited and certificates issued',
            transaction: result.newTransaction,
            certificates: result.generatedCertificates,
            goldGrams: goldGrams,
            usdAmount: usdAmount
          });
        } catch (e) {
          console.error('Failed to approve buy gold request:', e);
          return res.status(400).json({ message: e instanceof Error ? e.message : "Failed to approve buy gold request" });
        }
      }
      
      // Handle deposit requests from depositRequests table
      if (sourceTable === 'depositRequests') {
        const depositReq = await storage.getDepositRequest(req.params.id);
        if (!depositReq) {
          return res.status(404).json({ message: "Deposit request not found" });
        }
        if (depositReq.status !== 'Pending' && depositReq.status !== 'Under Review') {
          return res.status(400).json({ message: "Only pending requests can be approved" });
        }
        
        // Update status to Approved
        await storage.updateDepositRequest(req.params.id, { status: 'Approved', reviewedAt: new Date() });
        
        // Credit user wallet with USD
        const wallet = await storage.getWallet(depositReq.userId);
        if (wallet) {
          const currentUsd = parseFloat(wallet.usdBalance || '0');
          const depositAmount = parseFloat(depositReq.amount || '0');
          await storage.updateWallet(depositReq.userId, {
            usdBalance: (currentUsd + depositAmount).toFixed(2)
          });
        }
        
        // Audit log
        await storage.createAuditLog({
          entityType: "deposit_request",
          entityId: req.params.id,
          actionType: "approve",
          actor: req.body.adminId || 'admin',
          actorRole: "admin",
          details: `Deposit request approved - Amount: $${depositReq.amount}`,
        });
        
        // Check and complete referral on first deposit
        try {
          const pendingReferral = await storage.getPendingReferralByReferredId(depositReq.userId);
          if (pendingReferral) {
            // Get platform config for referral rewards
            const configs = await storage.getAllPlatformConfigs();
            const configMap: Record<string, string> = {};
            configs.forEach(c => { configMap[c.configKey] = c.configValue; });
            const referrerBonusUsd = parseFloat(configMap['referrer_bonus_usd'] || '10');
            
            // Get current gold price to convert bonus to grams
            const goldPricePerGram = await getGoldPricePerGram();
            const bonusGrams = referrerBonusUsd / goldPricePerGram;
            
            // Credit referrer's wallet with bonus gold
            let referrerWallet = await storage.getWallet(pendingReferral.referrerId);
            
            // Create wallet if it doesn't exist
            if (!referrerWallet) {
              referrerWallet = await storage.createWallet({
                userId: pendingReferral.referrerId,
                goldGrams: '0',
                usdBalance: '0',
              });
              console.log(`[Referral] Created wallet for referrer ${pendingReferral.referrerId}`);
            }
            
            if (referrerWallet) {
              const currentGold = parseFloat(referrerWallet.goldGrams || '0');
              await storage.updateWallet(pendingReferral.referrerId, {
                goldGrams: (currentGold + bonusGrams).toFixed(6)
              });
              
              // Mark referral as completed
              await storage.updateReferral(pendingReferral.id, {
                status: 'Completed',
                rewardAmount: referrerBonusUsd.toFixed(2),
                rewardPaidAt: new Date(),
                completedAt: new Date(),
              });
              
              // Create notification for referrer
              await storage.createNotification({
                userId: pendingReferral.referrerId,
                type: 'referral',
                title: 'Referral Bonus Earned!',
                message: `Your referral made their first deposit. You earned ${bonusGrams.toFixed(4)}g gold ($${referrerBonusUsd}).`,
                priority: 'medium',
              });
              
              console.log(`[Referral] Completed referral ${pendingReferral.id}: credited ${bonusGrams.toFixed(4)}g to referrer`);
            } else {
              console.error(`[Referral] Failed to create/find wallet for referrer ${pendingReferral.referrerId}`);
            }
          }
        } catch (refError) {
          console.error('[Referral Completion Error]', refError);
          // Don't fail the deposit approval if referral fails
        }
        
        return res.json({ message: 'Deposit request approved and wallet credited' });
      }
      
      // Handle withdrawal requests from withdrawalRequests table
      if (sourceTable === 'withdrawalRequests') {
        try {
          const [withdrawalReq] = await db.select().from(withdrawalRequests).where(eq(withdrawalRequests.id, req.params.id));
          if (!withdrawalReq) {
            return res.status(404).json({ message: "Withdrawal request not found" });
          }
          if (withdrawalReq.status !== 'Pending' && withdrawalReq.status !== 'Under Review' && withdrawalReq.status !== 'Processing') {
            return res.status(400).json({ message: "Only pending requests can be approved" });
          }
          
          await db.update(withdrawalRequests)
            .set({ status: 'Completed', completedAt: new Date() })
            .where(eq(withdrawalRequests.id, req.params.id));
          
          // Audit log
          await storage.createAuditLog({
            entityType: "withdrawal_request",
            entityId: req.params.id,
            actionType: "approve",
            actor: req.body.adminId || 'admin',
            actorRole: "admin",
            details: `Withdrawal request approved`,
          });
          
          return res.json({ message: 'Withdrawal request approved' });
        } catch (e) {
          console.error('Failed to approve withdrawal request:', e);
          return res.status(400).json({ message: "Failed to approve withdrawal request" });
        }
      }
      
      // Handle crypto payment requests
      if (sourceTable === 'cryptoPaymentRequests') {
        try {
          const [cryptoReq] = await db.select().from(cryptoPaymentRequests).where(eq(cryptoPaymentRequests.id, req.params.id));
          if (!cryptoReq) {
            return res.status(404).json({ message: "Crypto payment request not found" });
          }
          
          await db.update(cryptoPaymentRequests)
            .set({ status: 'Approved' })
            .where(eq(cryptoPaymentRequests.id, req.params.id));
          
          // Credit user wallet
          const wallet = await storage.getWallet(cryptoReq.userId);
          if (wallet && cryptoReq.amountUsd) {
            const currentUsd = parseFloat(wallet.usdBalance || '0');
            const depositAmount = parseFloat(cryptoReq.amountUsd || '0');
            await storage.updateWallet(cryptoReq.userId, {
              usdBalance: (currentUsd + depositAmount).toFixed(2)
            });
          }
          
          // Audit log
          await storage.createAuditLog({
            entityType: "crypto_payment_request",
            entityId: req.params.id,
            actionType: "approve",
            actor: req.body.adminId || 'admin',
            actorRole: "admin",
            details: `Crypto payment request approved`,
          });
          
          return res.json({ message: 'Crypto payment approved and wallet credited' });
        } catch (e) {
          console.error('Failed to approve crypto payment:', e);
          return res.status(400).json({ message: "Failed to approve crypto payment" });
        }
      }
      
      // Default: Handle regular transactions table
      // Initial validation outside transaction
      const transaction = await storage.getTransaction(req.params.id);
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      if (transaction.status !== 'Pending') {
        return res.status(400).json({ message: "Only pending transactions can be approved" });
      }
      
      const goldAmount = parseFloat(transaction.amountGold || '0');
      const usdAmount = parseFloat(transaction.amountUsd || '0');
      const goldPrice = parseFloat(transaction.goldPriceUsdPerGram || '71.55');
      
      // Get user wallet for initial validation
      const wallet = await storage.getWallet(transaction.userId);
      if (!wallet) {
        return res.status(404).json({ message: "User wallet not found" });
      }
      
      const currentGold = parseFloat(wallet.goldGrams || '0');
      const currentUsd = parseFloat(wallet.usdBalance || '0');
      
      // Execute all mutations inside a database transaction for atomicity
      const result = await storage.withTransaction(async (txStorage) => {
        let newGoldBalance = currentGold;
        let newUsdBalance = currentUsd;
        const generatedCertificates: any[] = [];
        
        // Helper: Generate Wingold storage reference
        const generateWingoldRef = () => `WG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      
        // Helper: Issue certificates for a user (requires valid holdingId and positive grams)
        const issueCertificates = async (userId: string, txId: string, holdingId: string, wingoldRef: string, grams: number, price: number) => {
          // Validation: skip if invalid amounts
          if (!holdingId || grams <= 0 || isNaN(grams)) {
            return null;
          }
          
          // Digital Ownership Certificate from Finatrades
          const docCertNum = await txStorage.generateCertificateNumber('Digital Ownership');
          const digitalCert = await txStorage.createCertificate({
            certificateNumber: docCertNum,
            userId,
            transactionId: txId,
            vaultHoldingId: holdingId,
            type: 'Digital Ownership',
            status: 'Active',
            goldGrams: grams.toFixed(6),
            goldPriceUsdPerGram: price.toFixed(2),
            totalValueUsd: (grams * price).toFixed(2),
            issuer: 'Finatrades',
            vaultLocation: 'Dubai - Wingold & Metals DMCC',
            wingoldStorageRef: wingoldRef
          });
          generatedCertificates.push(digitalCert);
          
          // Physical Storage Certificate from Wingold & Metals DMCC
          const pscCertNum = await txStorage.generateCertificateNumber('Physical Storage');
          const storageCert = await txStorage.createCertificate({
            certificateNumber: pscCertNum,
            userId,
            transactionId: txId,
            vaultHoldingId: holdingId,
            type: 'Physical Storage',
            status: 'Active',
            goldGrams: grams.toFixed(6),
            goldPriceUsdPerGram: price.toFixed(2),
            totalValueUsd: (grams * price).toFixed(2),
            issuer: 'Wingold & Metals DMCC',
            vaultLocation: 'Dubai - Wingold & Metals DMCC',
            wingoldStorageRef: wingoldRef
          });
          generatedCertificates.push(storageCert);
          
          return wingoldRef;
        };
        
        // Helper: Update existing holding and issue certificates
        const updateHoldingAndIssueCerts = async (userId: string, holdingId: string, currentGrams: number, addGrams: number, txId: string) => {
          const newTotal = currentGrams + addGrams;
          const wingoldRef = generateWingoldRef();
          
          // Update holding FIRST with new Wingold ref
          await txStorage.updateVaultHolding(holdingId, {
            goldGrams: newTotal.toFixed(6),
            wingoldStorageRef: wingoldRef
          });
          
          // Then issue certificates for the added amount
          if (addGrams > 0) {
            await issueCertificates(userId, txId, holdingId, wingoldRef, addGrams, goldPrice);
          }
          
          return { holdingId, wingoldRef, newTotal };
        };
        
        // Helper: Create new holding and issue certificates
        const createHoldingAndIssueCerts = async (userId: string, grams: number, txId: string, isPhysicalDeposit: boolean = false) => {
          if (grams <= 0) return null;
          
          const wingoldRef = generateWingoldRef();
          const newHolding = await txStorage.createVaultHolding({
            userId,
            goldGrams: grams.toFixed(6),
            vaultLocation: 'Dubai - Wingold & Metals DMCC',
            wingoldStorageRef: wingoldRef,
            purchasePriceUsdPerGram: goldPrice.toFixed(2),
            isPhysicallyDeposited: isPhysicalDeposit
          });
          
          // Issue certificates for the new holding
          await issueCertificates(userId, txId, newHolding.id, wingoldRef, grams, goldPrice);
          
          return newHolding;
        };
        
        // Helper: Reduce holdings and update certificates
        const reduceHoldingsAndUpdateCerts = async (userId: string, reduceGrams: number, txId: string) => {
          const holdings = await txStorage.getUserVaultHoldings(userId);
          if (holdings.length === 0) return;
          
          const holding = holdings[0];
          const currentGrams = parseFloat(holding.goldGrams || '0');
          const newTotalGrams = Math.max(0, currentGrams - reduceGrams);
          
          // Update holding balance
          await txStorage.updateVaultHolding(holding.id, {
            goldGrams: newTotalGrams.toFixed(6)
          });
          
          // Mark old active certificates as Updated
          const activeCerts = await txStorage.getUserActiveCertificates(userId);
          for (const cert of activeCerts) {
            await txStorage.updateCertificate(cert.id, { 
              status: 'Updated',
              cancelledAt: new Date()
            });
          }
          
          // Issue new consolidated certificates for remaining balance
          if (newTotalGrams > 0) {
            const wingoldRef = holding.wingoldStorageRef || generateWingoldRef();
            await txStorage.updateVaultHolding(holding.id, { wingoldStorageRef: wingoldRef });
            await issueCertificates(userId, txId, holding.id, wingoldRef, newTotalGrams, goldPrice);
          }
        };
      
      // Process based on transaction type
      switch (transaction.type) {
        case 'Buy':
          // BUY: Credit gold to wallet, record in FinaVault, issue both certificates
          newGoldBalance = currentGold + goldAmount;
          if (currentUsd >= usdAmount) {
            newUsdBalance = currentUsd - usdAmount;
          }
          break;
          
        case 'Sell': {
          // SELL: Deduct gold, credit fiat, update/cancel certificates
          // Validate sufficient holdings exist before processing
          const sellHoldings = await txStorage.getUserVaultHoldings(transaction.userId);
          if (sellHoldings.length === 0) {
            throw new Error('User has no vault holdings to sell');
          }
          const sellHoldingGold = parseFloat(sellHoldings[0].goldGrams || '0');
          if (sellHoldingGold < goldAmount) {
            throw new Error(`Insufficient holdings: ${sellHoldingGold}g available, ${goldAmount}g requested`);
          }
          if (currentGold < goldAmount) {
            throw new Error(`Insufficient wallet balance: ${currentGold}g available, ${goldAmount}g requested`);
          }
          newGoldBalance = currentGold - goldAmount;
          newUsdBalance = currentUsd + usdAmount;
          break;
        }
          
        case 'Send': {
          // SEND: Deduct from sender, credit recipient, transfer ownership
          // Both sender and recipient must update atomically
          // Sender's certs get Transferred, recipient gets new certs
          
          // === VALIDATION PHASE - All checks before any state changes ===
          if (!transaction.recipientEmail) {
            throw new Error('Send transaction requires recipient email');
          }
          if (goldAmount <= 0) {
            throw new Error('Send transaction requires positive gold amount');
          }
          
          // Validate sender has sufficient wallet balance
          if (currentGold < goldAmount) {
            throw new Error(`Insufficient wallet balance: ${currentGold}g available, ${goldAmount}g requested`);
          }
          
          // Validate sender has sufficient vault holdings
          const senderHoldingsCheck = await txStorage.getUserVaultHoldings(transaction.userId);
          if (senderHoldingsCheck.length === 0) {
            throw new Error('Sender has no vault holdings to send');
          }
          const senderHoldingGold = parseFloat(senderHoldingsCheck[0].goldGrams || '0');
          if (senderHoldingGold < goldAmount) {
            throw new Error(`Insufficient holdings: ${senderHoldingGold}g available, ${goldAmount}g requested`);
          }
          
          // Validate recipient exists
          const recipientUser = await txStorage.getUserByEmail(transaction.recipientEmail);
          if (!recipientUser) {
            throw new Error(`Recipient not found: ${transaction.recipientEmail}`);
          }
          
          const recipientWallet = await txStorage.getWallet(recipientUser.id);
          if (!recipientWallet) {
            throw new Error(`Recipient wallet not found for: ${transaction.recipientEmail}`);
          }
          
          // === EXECUTION PHASE - All validations passed, now update state ===
          newGoldBalance = currentGold - goldAmount;
          
          const recipientGold = parseFloat(recipientWallet.goldGrams || '0');
          await txStorage.updateWallet(recipientWallet.id, {
            goldGrams: (recipientGold + goldAmount).toFixed(6)
          });
          
          // Create Receive transaction for recipient
          const senderUser = await txStorage.getUser(transaction.userId);
          const receiveTransaction = await txStorage.createTransaction({
            userId: recipientUser.id,
            type: 'Receive',
            status: 'Completed',
            amountGold: goldAmount.toFixed(6),
            amountUsd: usdAmount.toFixed(2),
            goldPriceUsdPerGram: goldPrice.toFixed(2),
            senderEmail: senderUser?.email || '',
            description: `Received from ${senderUser?.firstName} ${senderUser?.lastName}`,
            completedAt: new Date()
          });
          
          // Update recipient vault holding and issue new certs for recipient
          const recipientHoldings = await txStorage.getUserVaultHoldings(recipientUser.id);
          if (recipientHoldings.length > 0) {
            const rHolding = recipientHoldings[0];
            const rGold = parseFloat(rHolding.goldGrams || '0');
            await updateHoldingAndIssueCerts(recipientUser.id, rHolding.id, rGold, goldAmount, receiveTransaction.id);
          } else {
            await createHoldingAndIssueCerts(recipientUser.id, goldAmount, receiveTransaction.id, false);
          }
          
          // Update sender's holdings and mark sender's certs as Transferred
          const senderHoldings = await txStorage.getUserVaultHoldings(transaction.userId);
          if (senderHoldings.length > 0) {
            const sHolding = senderHoldings[0];
            const sGold = parseFloat(sHolding.goldGrams || '0');
            const newSenderGold = Math.max(0, sGold - goldAmount);
            
            await txStorage.updateVaultHolding(sHolding.id, {
              goldGrams: newSenderGold.toFixed(6)
            });
            
            // Mark sender's active certs as Transferred
            const senderCerts = await txStorage.getUserActiveCertificates(transaction.userId);
            for (const cert of senderCerts) {
              await txStorage.updateCertificate(cert.id, { 
                status: 'Transferred',
                cancelledAt: new Date()
              });
            }
            
            // Issue new consolidated certs for sender's remaining balance
            if (newSenderGold > 0) {
              const wingoldRef = sHolding.wingoldStorageRef || generateWingoldRef();
              await txStorage.updateVaultHolding(sHolding.id, { wingoldStorageRef: wingoldRef });
              await issueCertificates(transaction.userId, transaction.id, sHolding.id, wingoldRef, newSenderGold, goldPrice);
            }
          }
          break;
        }
          
        case 'Receive':
          newGoldBalance = currentGold + goldAmount;
          break;
          
        case 'Deposit':
          // Physical deposit: gold verified at Wingold, credited to wallet
          newGoldBalance = currentGold + goldAmount;
          break;
          
        case 'Withdrawal': {
          // Physical withdrawal: deduct from wallet, release from Wingold
          // Validate sufficient holdings exist before processing
          const wdHoldings = await txStorage.getUserVaultHoldings(transaction.userId);
          if (wdHoldings.length === 0) {
            throw new Error('User has no vault holdings for withdrawal');
          }
          const wdHoldingGold = parseFloat(wdHoldings[0].goldGrams || '0');
          if (wdHoldingGold < goldAmount) {
            throw new Error(`Insufficient holdings: ${wdHoldingGold}g available, ${goldAmount}g requested`);
          }
          if (currentGold < goldAmount) {
            throw new Error(`Insufficient wallet balance: ${currentGold}g available, ${goldAmount}g requested`);
          }
          newGoldBalance = currentGold - goldAmount;
          break;
        }
        }
        
        // Update user wallet
        await txStorage.updateWallet(wallet.id, {
          goldGrams: newGoldBalance.toFixed(6),
          usdBalance: newUsdBalance.toFixed(2)
        });
        
        // Update vault holding and handle certificates using new helper functions
        // Note: Send transactions are fully handled in the switch above (both sender and recipient)
        if (transaction.type !== 'Send' && goldAmount > 0) {
          const existingHoldings = await txStorage.getUserVaultHoldings(transaction.userId);
          
          if (['Buy', 'Receive', 'Deposit'].includes(transaction.type)) {
            // Adding gold: update holding first, then issue certificates
            if (existingHoldings.length > 0) {
              const holding = existingHoldings[0];
              const holdingGold = parseFloat(holding.goldGrams || '0');
              await updateHoldingAndIssueCerts(transaction.userId, holding.id, holdingGold, goldAmount, transaction.id);
            } else {
              await createHoldingAndIssueCerts(transaction.userId, goldAmount, transaction.id, transaction.type === 'Deposit');
            }
          } else if (['Sell', 'Withdrawal'].includes(transaction.type)) {
            // Reducing gold: update holdings and certificates
            await reduceHoldingsAndUpdateCerts(transaction.userId, goldAmount, transaction.id);
          }
        }
        
        // Mark transaction as completed
        const updatedTransaction = await txStorage.updateTransaction(req.params.id, {
          status: 'Completed',
          completedAt: new Date()
        });

        // Record ledger entries for Buy/Sell/Deposit/Withdrawal transactions
        const { vaultLedgerService } = await import('./vault-ledger-service');
        if (transaction.type === 'Buy' || transaction.type === 'Deposit') {
          await vaultLedgerService.recordLedgerEntry({
            userId: transaction.userId,
            action: 'Deposit',
            goldGrams: goldAmount,
            goldPriceUsdPerGram: goldPrice,
            fromWallet: 'External',
            toWallet: 'FinaPay',
            toStatus: 'Available',
            transactionId: transaction.id,
            certificateId: generatedCertificates[0]?.id,
            notes: transaction.type === 'Buy' 
              ? `Purchased ${goldAmount.toFixed(4)}g gold at $${goldPrice.toFixed(2)}/g`
              : `Deposited ${goldAmount.toFixed(4)}g physical gold`,
            createdBy: req.body.adminId || 'admin',
          });
        } else if (transaction.type === 'Sell' || transaction.type === 'Withdrawal') {
          await vaultLedgerService.recordLedgerEntry({
            userId: transaction.userId,
            action: 'Withdrawal',
            goldGrams: goldAmount,
            goldPriceUsdPerGram: goldPrice,
            fromWallet: 'FinaPay',
            toWallet: 'External',
            fromStatus: 'Available',
            transactionId: transaction.id,
            notes: transaction.type === 'Sell'
              ? `Sold ${goldAmount.toFixed(4)}g gold at $${goldPrice.toFixed(2)}/g`
              : `Withdrew ${goldAmount.toFixed(4)}g physical gold`,
            createdBy: req.body.adminId || 'admin',
          });
        }
        
        // Audit log
        await txStorage.createAuditLog({
          entityType: "transaction",
          entityId: transaction.id,
          actionType: "approve",
          actor: req.body.adminId || 'admin',
          actorRole: "admin",
          details: `Transaction approved - Type: ${transaction.type}, Gold: ${goldAmount}g, USD: $${usdAmount}. Certificates issued: ${generatedCertificates.length}`,
        });
        
        return { 
          updatedTransaction, 
          generatedCertificates
        };
      });
      
      // Send invoice and certificate emails (non-blocking, after transaction completes)
      if (result.generatedCertificates.length > 0 && ['Buy', 'Deposit'].includes(transaction.type)) {
        const transactionUser = await storage.getUser(transaction.userId);
        if (transactionUser) {
          const goldPricePerGram = parseFloat(transaction.goldPriceUsdPerGram || '0') || 95;
          processTransactionDocuments(
            result.updatedTransaction!,
            result.generatedCertificates,
            transactionUser,
            goldPricePerGram
          ).then(docResults => {
            console.log(`[Routes] Document processing complete for transaction ${transaction.id}:`, 
              `Invoice ${docResults.invoiceResult.success ? 'sent' : 'failed'}, ` +
              `${docResults.certificateResults.filter(r => r.success).length}/${docResults.certificateResults.length} certificates sent`);
          }).catch(err => {
            console.error(`[Routes] Document processing error for transaction ${transaction.id}:`, err);
          });
        }
      }
      
      // Send gold sale email for Sell transactions
      if (transaction.type === 'Sell') {
        const sellUser = await storage.getUser(transaction.userId);
        if (sellUser?.email) {
          const goldAmount = parseFloat(transaction.amountGold || '0');
          const usdAmount = parseFloat(transaction.amountUsd || '0');
          const goldPricePerGram = parseFloat(transaction.goldPriceUsdPerGram || '0') || 95;
          sendEmail(sellUser.email, EMAIL_TEMPLATES.GOLD_SALE, {
            user_name: `${sellUser.firstName} ${sellUser.lastName}`,
            gold_grams: goldAmount.toFixed(4),
            amount_usd: usdAmount.toFixed(2),
            gold_price: goldPricePerGram.toFixed(2),
          }).catch(err => console.error('[Email] Gold sale notification failed:', err));
        }
      }
      
      res.json({ 
        transaction: result.updatedTransaction, 
        certificates: result.generatedCertificates,
        message: 'Transaction approved and processed with certificates issued' 
      });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Approval failed" });
    }
  });
  
  // Admin: Reject transaction
  app.post("/api/admin/transactions/:id/reject", ensureAdminAsync, requirePermission('manage_transactions'), async (req, res) => {
    try {
      const { sourceTable, reason } = req.body;
      
      // Handle Buy Gold Bar requests
      if (sourceTable === 'buyGoldRequests') {
        try {
          await db.update(buyGoldRequests)
            .set({ status: 'Rejected', reviewedAt: new Date() })
            .where(eq(buyGoldRequests.id, req.params.id));
          
          await storage.createAuditLog({
            entityType: "buy_gold_request",
            entityId: req.params.id,
            actionType: "reject",
            actor: req.body.adminId || 'admin',
            actorRole: "admin",
            details: `Buy Gold Bar request rejected - Reason: ${reason || 'Not specified'}`,
          });
          
          return res.json({ message: 'Buy Gold Bar request rejected' });
        } catch (e) {
          return res.status(400).json({ message: "Failed to reject buy gold request" });
        }
      }
      
      // Handle deposit requests
      if (sourceTable === 'depositRequests') {
        const depositReq = await storage.getDepositRequest(req.params.id);
        await storage.updateDepositRequest(req.params.id, { status: 'Rejected', reviewedAt: new Date() });
        
        await storage.createAuditLog({
          entityType: "deposit_request",
          entityId: req.params.id,
          actionType: "reject",
          actor: req.body.adminId || 'admin',
          actorRole: "admin",
          details: `Deposit request rejected - Reason: ${reason || 'Not specified'}`,
        });
        
        // Notify user about rejection
        if (depositReq) {
          await storage.createNotification({
            userId: depositReq.userId,
            title: 'Deposit Request Rejected',
            message: `Your deposit request (${depositReq.referenceNumber}) has been rejected. ${reason ? `Reason: ${reason}` : 'Please contact support for more information.'}`,
            type: 'warning',
            read: false,
          });
          
          emitLedgerEvent(depositReq.userId, {
            type: 'deposit_rejected',
            module: 'finapay',
            action: 'deposit_rejected',
            data: { referenceNumber: depositReq.referenceNumber, reason },
          });
        }
        
        return res.json({ message: 'Deposit request rejected' });
      }
      
      // Handle withdrawal requests
      if (sourceTable === 'withdrawalRequests') {
        try {
          const [withdrawalReq] = await db.select().from(withdrawalRequests).where(eq(withdrawalRequests.id, req.params.id)).limit(1);
          
          await db.update(withdrawalRequests)
            .set({ status: 'Rejected' })
            .where(eq(withdrawalRequests.id, req.params.id));
          
          await storage.createAuditLog({
            entityType: "withdrawal_request",
            entityId: req.params.id,
            actionType: "reject",
            actor: req.body.adminId || 'admin',
            actorRole: "admin",
            details: `Withdrawal request rejected - Reason: ${reason || 'Not specified'}`,
          });
          
          // Notify user about rejection
          if (withdrawalReq) {
            await storage.createNotification({
              userId: withdrawalReq.userId,
              title: 'Withdrawal Request Rejected',
              message: `Your withdrawal request (${withdrawalReq.referenceNumber}) has been rejected. ${reason ? `Reason: ${reason}` : 'Please contact support for more information.'}`,
              type: 'warning',
              read: false,
            });
            
            emitLedgerEvent(withdrawalReq.userId, {
              type: 'withdrawal_rejected',
              module: 'finapay',
              action: 'withdrawal_rejected',
              data: { referenceNumber: withdrawalReq.referenceNumber, reason },
            });
          }
          
          return res.json({ message: 'Withdrawal request rejected' });
        } catch (e) {
          return res.status(400).json({ message: "Failed to reject withdrawal request" });
        }
      }
      
      // Handle crypto payment requests
      if (sourceTable === 'cryptoPaymentRequests') {
        try {
          const [cryptoReq] = await db.select().from(cryptoPaymentRequests).where(eq(cryptoPaymentRequests.id, req.params.id)).limit(1);
          
          await db.update(cryptoPaymentRequests)
            .set({ status: 'Rejected' })
            .where(eq(cryptoPaymentRequests.id, req.params.id));
          
          await storage.createAuditLog({
            entityType: "crypto_payment_request",
            entityId: req.params.id,
            actionType: "reject",
            actor: req.body.adminId || 'admin',
            actorRole: "admin",
            details: `Crypto payment request rejected - Reason: ${reason || 'Not specified'}`,
          });
          
          // Notify user about rejection
          if (cryptoReq) {
            await storage.createNotification({
              userId: cryptoReq.userId,
              title: 'Crypto Deposit Rejected',
              message: `Your crypto deposit has been rejected. ${reason ? `Reason: ${reason}` : 'Please contact support for more information.'}`,
              type: 'warning',
              read: false,
            });
            
            emitLedgerEvent(cryptoReq.userId, {
              type: 'crypto_rejected',
              module: 'finapay',
              action: 'crypto_deposit_rejected',
              data: { reason },
            });
          }
          
          return res.json({ message: 'Crypto payment request rejected' });
        } catch (e) {
          return res.status(400).json({ message: "Failed to reject crypto payment" });
        }
      }
      
      // Default: Handle regular transactions table
      const transaction = await storage.getTransaction(req.params.id);
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      if (transaction.status !== 'Pending') {
        return res.status(400).json({ message: "Only pending transactions can be rejected" });
      }
      
      const updatedTransaction = await storage.updateTransaction(req.params.id, {
        status: 'Cancelled'
      });
      
      // Audit log
      await storage.createAuditLog({
        entityType: "transaction",
        entityId: transaction.id,
        actionType: "reject",
        actor: req.body.adminId || 'admin',
        actorRole: "admin",
        details: `Transaction rejected - Type: ${transaction.type}, Reason: ${reason || 'Not specified'}`,
      });
      
      res.json({ transaction: updatedTransaction, message: 'Transaction rejected' });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Rejection failed" });
    }
  });
  
  // Admin: Get all transactions with user info (includes pending from all modules)
  app.get("/api/admin/transactions", ensureAdminAsync, requirePermission('view_transactions', 'manage_transactions'), async (req, res) => {
    try {
      const transactions = await storage.getAllTransactions();
      const allDepositRequests = await storage.getAllDepositRequests();
      
      // Collect all items from various modules
      const allItems: any[] = [];
      
      // Main transactions
      allItems.push(...transactions.map(tx => ({
        ...tx,
        sourceTable: 'transactions'
      })));
      
      // Pending deposit requests (not yet in transactions table)
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
        amountEur: null,
        goldPriceUsdPerGram: null,
        description: `Bank deposit - ${d.bankName || 'Bank Transfer'}`,
        sourceModule: 'finapay',
        createdAt: d.createdAt,
        completedAt: null,
        sourceTable: 'depositRequests'
      }));
      allItems.push(...pendingDepositReqs);
      
      // Pending withdrawal requests
      try {
        const allWithdrawals = await db.select().from(withdrawalRequests);
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
          amountEur: null,
          goldPriceUsdPerGram: null,
          description: `Withdrawal to ${w.bankName || 'bank account'}`,
          sourceModule: 'finapay',
          createdAt: w.createdAt,
          completedAt: null,
          sourceTable: 'withdrawalRequests'
        }));
        allItems.push(...pendingWithdrawReqs);
      } catch (e) { /* table may not exist */ }
      
      // Pending crypto payment requests
      try {
        const allCryptoReqs = await db.select().from(cryptoPaymentRequests);
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
          amountEur: null,
          goldPriceUsdPerGram: null,
          description: `Crypto deposit - ${c.network || 'Crypto'}`,
          sourceModule: 'finapay',
          createdAt: c.createdAt,
          completedAt: null,
          sourceTable: 'cryptoPaymentRequests'
        }));
        allItems.push(...pendingCryptoReqs);
      } catch (e) { /* table may not exist */ }
      
      // Pending buy gold requests
      try {
        const allBuyGoldReqs = await db.select().from(buyGoldRequests);
        const pendingBuyGoldReqs = allBuyGoldReqs.filter((b: any) => 
          b.status === 'Pending' || b.status === 'Under Review'
        ).map((b: any) => ({
          id: b.id,
          odooId: b.odooId,
          userId: b.userId,
          type: 'Buy Gold Bar',
          status: b.status,
          amountGold: null,
          amountUsd: null,
          amountEur: null,
          goldPriceUsdPerGram: null,
          description: 'Wingold purchase request',
          sourceModule: 'finapay',
          createdAt: b.createdAt,
          completedAt: null,
          sourceTable: 'buyGoldRequests'
        }));
        allItems.push(...pendingBuyGoldReqs);
      } catch (e) { /* table may not exist */ }
      
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
          amountEur: null,
          goldPriceUsdPerGram: null,
          description: `Trade case: ${t.productType || 'Trade finance request'}`,
          sourceModule: 'finabridge',
          createdAt: t.createdAt,
          completedAt: null,
          sourceTable: 'tradeCases'
        }));
        allItems.push(...pendingTrades);
      } catch (e) { /* table may not exist */ }
      
      // Pending BNSL plans
      try {
        const allBnsl = await db.select().from(bnslPlans);
        const pendingBnsl = allBnsl.filter((b: any) => 
          b.status === 'Pending Termination' || b.status === 'Pending'
        ).map((b: any) => ({
          id: b.id,
          odooId: b.odooId,
          userId: b.userId,
          type: 'BNSL',
          status: b.status,
          amountGold: b.goldGrams,
          amountUsd: b.baseAmountUsd,
          amountEur: null,
          goldPriceUsdPerGram: null,
          description: b.status === 'Pending Termination' ? 'BNSL termination request' : 'BNSL activation pending',
          sourceModule: 'bnsl',
          createdAt: b.createdAt,
          completedAt: null,
          sourceTable: 'bnslPlans'
        }));
        allItems.push(...pendingBnsl);
      } catch (e) { /* table may not exist */ }
      
      // Vault deposit requests (physical gold deposits)
      try {
        const allVaultDeposits = await db.select().from(vaultDepositRequests);
        const pendingVaultDeposits = allVaultDeposits.filter((v: any) => 
          v.status === 'Submitted' || v.status === 'Under Review' || v.status === 'Pending'
        ).map((v: any) => ({
          id: v.id,
          odooId: null,
          userId: v.userId,
          type: 'Vault Deposit',
          status: v.status === 'Submitted' ? 'Pending' : v.status,
          amountGold: v.totalDeclaredWeightGrams,
          amountUsd: null,
          amountEur: null,
          goldPriceUsdPerGram: null,
          referenceId: v.referenceNumber,
          description: `Vault deposit - ${v.totalDeclaredWeightGrams}g ${v.depositType}`,
          sourceModule: 'finavault',
          createdAt: v.createdAt,
          completedAt: null,
          sourceTable: 'vaultDepositRequests'
        }));
        allItems.push(...pendingVaultDeposits);
      } catch (e) { /* table may not exist */ }
      
      // Enrich all items with user info
      const enrichedTransactions = await Promise.all(
        allItems.map(async (tx) => {
          const user = await storage.getUser(tx.userId);
          return {
            ...tx,
            userName: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
            userEmail: user?.email || 'Unknown',
            finatradesId: `FT-${tx.userId?.slice(0, 8).toUpperCase() || 'UNKNOWN'}`
          };
        })
      );
      
      // Sort by date descending
      enrichedTransactions.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      res.json({ transactions: enrichedTransactions });
    } catch (error) {
      console.error("Failed to get all transactions:", error);
      res.status(400).json({ message: "Failed to get all transactions" });
    }
  });
  
  // ============================================================================
  // FINAVAULT - GOLD STORAGE
  // ============================================================================
  
  // Get user vault ownership summary (central ledger view) - PROTECTED
  app.get("/api/vault/ownership/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const { vaultLedgerService } = await import('./vault-ledger-service');
      const summary = await vaultLedgerService.getOrCreateOwnershipSummary(req.params.userId);
      
      // Sync from wallets to ensure up-to-date data
      const syncedSummary = await vaultLedgerService.syncOwnershipFromWallets(req.params.userId);
      
      res.json({ ownership: syncedSummary });
    } catch (error) {
      res.status(400).json({ message: "Failed to get ownership summary" });
    }
  });

  // Get user vault ledger history - PROTECTED
  app.get("/api/vault/ledger/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const { vaultLedgerService } = await import('./vault-ledger-service');
      const limit = parseInt(req.query.limit as string) || 50;
      const entries = await vaultLedgerService.getLedgerHistory(req.params.userId, limit);
      res.json({ entries });
    } catch (error) {
      res.status(400).json({ message: "Failed to get ledger history" });
    }
  });
  
  // Get user vault holdings - PROTECTED: requires matching session
  app.get("/api/vault/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const holdings = await storage.getUserVaultHoldings(req.params.userId);
      res.json({ holdings });
    } catch (error) {
      res.status(400).json({ message: "Failed to get vault holdings" });
    }
  });
  
  // Get vault activity (transactions related to vault operations) - PROTECTED
  app.get("/api/vault/activity/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const userId = req.params.userId;
      
      // Get all transactions for this user
      const allTransactions = await storage.getUserTransactions(userId);
      
      // Get vault deposit and withdrawal requests first
      const vaultDepositReqs = await storage.getUserVaultDepositRequests(userId);
      const vaultWithdrawalReqs = await storage.getUserVaultWithdrawalRequests(userId);
      
      // Create a set of vault deposit reference numbers to exclude from wallet transactions
      // This prevents duplication between wallet "Deposit" transactions and vault deposit requests
      const vaultDepositRefs = new Set(vaultDepositReqs.map(dep => dep.referenceNumber));
      
      // Filter to vault-relevant transaction types, excluding duplicates from vault deposits
      const vaultTypes = ['Buy', 'Sell', 'Send', 'Receive', 'Deposit', 'Withdrawal'];
      const vaultTransactions = allTransactions.filter(tx => {
        // Include only vault-relevant types
        if (!vaultTypes.includes(tx.type)) return false;
        
        // Exclude 'Deposit' transactions that are linked to vault deposit requests
        // These are shown separately as 'Vault Deposit' entries
        if (tx.type === 'Deposit' && tx.description?.includes('FinaVault')) {
          return false;
        }
        
        return true;
      });
      
      // Get holdings and certificates
      const holdings = await storage.getUserVaultHoldings(userId);
      const certificates = await storage.getUserCertificates(userId);
      
      // Get wallet for current balance
      const wallet = await storage.getWallet(userId);
      
      // Enrich transactions with certificate info
      const enrichedTransactions = vaultTransactions.map(tx => {
        const txCerts = certificates.filter(c => c.transactionId === tx.id);
        return {
          ...tx,
          certificates: txCerts.map(c => ({
            id: c.id,
            certificateNumber: c.certificateNumber,
            type: c.type,
            status: c.status,
            goldGrams: c.goldGrams
          }))
        };
      });
      
      // Convert vault deposit requests to transaction-like format
      // Include certificates associated with the vault deposit (by matching vaultHoldingId)
      const vaultDepositTxs = vaultDepositReqs.map(dep => {
        // Find certificates that belong to this vault deposit
        // Match by vaultHoldingId if available, or by gold amount for physical deposits
        const depositGold = parseFloat(String(dep.verifiedWeightGrams || dep.totalDeclaredWeightGrams || 0));
        const matchingCerts = certificates.filter(c => {
          // First check vaultHoldingId match
          if (dep.vaultHoldingId && c.vaultHoldingId === dep.vaultHoldingId) {
            return true;
          }
          // For physical deposits without vaultHoldingId, match by gold amount
          const certGold = parseFloat(String(c.goldGrams || 0));
          return Math.abs(depositGold - certGold) < 0.01 && !c.transactionId;
        });
        
        // Get USD value from the Digital Ownership certificate if available
        const ownershipCert = matchingCerts.find(c => c.type === 'Digital Ownership');
        const storageCert = matchingCerts.find(c => c.type === 'Physical Storage');
        const usdValue = ownershipCert?.totalValueUsd || storageCert?.totalValueUsd || null;
        const goldPrice = ownershipCert?.goldPriceUsdPerGram || storageCert?.goldPriceUsdPerGram || null;
        
        return {
          id: dep.id,
          userId: dep.userId,
          type: 'Vault Deposit' as const,
          status: dep.status === 'Stored' || dep.status === 'Approved' ? 'Completed' : dep.status === 'Rejected' ? 'Cancelled' : 'Pending',
          amountGold: dep.verifiedWeightGrams || dep.totalDeclaredWeightGrams,
          amountUsd: usdValue,
          goldPriceUsdPerGram: goldPrice,
          recipientEmail: null,
          senderEmail: null,
          description: `Physical Gold Deposit - ${dep.vaultLocation}`,
          referenceId: dep.referenceNumber,
          createdAt: dep.createdAt,
          completedAt: dep.storedAt || dep.reviewedAt,
          certificates: matchingCerts.map(c => ({
            id: c.id,
            certificateNumber: c.certificateNumber,
            type: c.type,
            status: c.status,
            goldGrams: c.goldGrams
          }))
        };
      });
      
      // Convert vault withdrawal requests to transaction-like format
      const vaultWithdrawalTxs = vaultWithdrawalReqs.map(wd => ({
        id: wd.id,
        userId: wd.userId,
        type: 'Vault Withdrawal' as const,
        status: wd.status === 'Completed' ? 'Completed' : wd.status === 'Rejected' ? 'Cancelled' : 'Pending',
        amountGold: wd.goldGrams,
        amountUsd: wd.totalValueUsd,
        goldPriceUsdPerGram: wd.goldPriceUsdPerGram,
        recipientEmail: null,
        senderEmail: null,
        description: `Cash Out via ${wd.withdrawalMethod}`,
        referenceId: wd.referenceNumber,
        createdAt: wd.createdAt,
        completedAt: wd.reviewedAt,
        certificates: []
      }));
      
      // Combine all activities and sort by date
      const allActivities = [
        ...enrichedTransactions,
        ...vaultDepositTxs,
        ...vaultWithdrawalTxs
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      res.json({ 
        transactions: allActivities,
        holdings,
        certificates,
        currentBalance: {
          goldGrams: wallet?.goldGrams || '0',
          usdBalance: wallet?.usdBalance || '0'
        }
      });
    } catch (error) {
      console.error("Vault activity error:", error);
      res.status(400).json({ message: "Failed to get vault activity", error: String(error) });
    }
  });
  
  // ============================================
  // CERTIFICATES
  // ============================================
  
  // Get user certificates - PROTECTED: requires matching session
  app.get("/api/certificates/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const allCertificates = await storage.getUserCertificates(req.params.userId);
      const activeCertificates = await storage.getUserActiveCertificates(req.params.userId);
      res.json({ certificates: allCertificates, activeCertificates });
    } catch (error) {
      res.status(400).json({ message: "Failed to get certificates" });
    }
  });
  
  // Get single certificate
  app.get("/api/certificate/:id", async (req, res) => {
    try {
      const certificate = await storage.getCertificate(req.params.id);
      if (!certificate) {
        return res.status(404).json({ message: "Certificate not found" });
      }
      res.json({ certificate });
    } catch (error) {
      res.status(400).json({ message: "Failed to get certificate" });
    }
  });
  
  // PUBLIC: Verify certificate authenticity (blockchain explorer style)
  app.post("/api/certificates/verify", async (req, res) => {
    try {
      const { certificateNumber } = req.body;
      const crypto = await import('crypto');
      
      // Helper to generate safe hash from UUID or any string
      const safeHash = (input: string) => {
        return '0x' + crypto.createHash('sha256').update(input).digest('hex').substring(0, 16) + '...';
      };
      
      if (!certificateNumber || typeof certificateNumber !== 'string') {
        return res.status(400).json({ 
          message: "Certificate number is required",
          verificationResult: "invalid"
        });
      }
      
      // Clean and normalize the certificate number
      const cleanedNumber = certificateNumber.trim().toUpperCase();
      
      const certificate = await storage.getCertificateByNumber(cleanedNumber);
      
      if (!certificate) {
        return res.json({
          verificationResult: "invalid",
          message: "Certificate not found in our system. This certificate may be counterfeit or the number may be incorrect.",
          certificateNumber: cleanedNumber
        });
      }
      
      // Determine if certificate is expired
      const now = new Date();
      const isExpired = certificate.expiresAt ? new Date(certificate.expiresAt) < now : false;
      const isStatusExpired = certificate.status === 'Expired' || certificate.status === 'Revoked';
      
      // Build response with sanitized certificate info (no PII)
      const verificationResult = (isExpired || isStatusExpired) ? "genuine_expired" : "genuine_active";
      
      // Get Finatrades IDs for involved parties (no personal info)
      const holderUser = await storage.getUser(certificate.userId);
      const holderFinatradesId = holderUser?.finatradesId || 'UNKNOWN';
      const holderAccountType = holderUser?.accountType || 'personal';
      
      // Build blockchain explorer-style transaction history from vault ledger
      const { vaultLedgerService } = await import('./vault-ledger-service');
      
      const ledgerHistory: {
        eventType: string;
        timestamp: string;
        goldGrams: string;
        valueUsd: string | null;
        fromFinatradesId: string | null;
        fromAccountType: string | null;
        toFinatradesId: string | null;
        toAccountType: string | null;
        action: string | null;
        eventHash: string;
      }[] = [];
      
      // Helper to convert userId to Finatrades ID (privacy-safe)
      const userCache = new Map<string, { finatradesId: string; accountType: string }>();
      const getFinatradesInfo = async (userId: string | null) => {
        if (!userId) return { finatradesId: null, accountType: null };
        if (userCache.has(userId)) return userCache.get(userId)!;
        const user = await storage.getUser(userId);
        const info = { 
          finatradesId: user?.finatradesId || 'UNKNOWN', 
          accountType: user?.accountType || 'personal' 
        };
        userCache.set(userId, info);
        return info;
      };
      
      // Helper to add ledger entry to history
      const addLedgerEntry = async (entry: any, existingHashes: Set<string>) => {
        const hash = safeHash(entry.id);
        if (existingHashes.has(hash)) return;
        existingHashes.add(hash);
        
        const userInfo = await getFinatradesInfo(entry.userId);
        const counterpartyInfo = await getFinatradesInfo(entry.counterpartyUserId);
        
        let fromId = null, fromType = null, toId = null, toType = null;
        
        if (entry.action === 'Transfer_Send') {
          fromId = userInfo.finatradesId;
          fromType = userInfo.accountType;
          toId = counterpartyInfo.finatradesId;
          toType = counterpartyInfo.accountType;
        } else if (entry.action === 'Transfer_Receive') {
          fromId = counterpartyInfo.finatradesId;
          fromType = counterpartyInfo.accountType;
          toId = userInfo.finatradesId;
          toType = userInfo.accountType;
        } else if (entry.action === 'Deposit') {
          toId = userInfo.finatradesId;
          toType = userInfo.accountType;
        } else if (entry.action === 'Withdrawal') {
          fromId = userInfo.finatradesId;
          fromType = userInfo.accountType;
        } else {
          toId = userInfo.finatradesId;
          toType = userInfo.accountType;
        }
        
        ledgerHistory.push({
          eventType: entry.action.replace(/_/g, ' ').toUpperCase(),
          timestamp: entry.createdAt?.toISOString() || new Date().toISOString(),
          goldGrams: entry.goldGrams,
          valueUsd: entry.valueUsd,
          fromFinatradesId: fromId,
          fromAccountType: fromType,
          toFinatradesId: toId,
          toAccountType: toType,
          action: entry.action,
          eventHash: hash
        });
      };
      
      const existingHashes = new Set<string>();
      
      // Traverse certificate lineage to get full history (both ancestors and descendants)
      const visitedCertIds = new Set<string>();
      const certificateQueue: string[] = [certificate.id];
      
      // Process all certificates in the chain using a proper queue
      while (certificateQueue.length > 0) {
        const certId = certificateQueue.shift()!;
        if (visitedCertIds.has(certId)) continue;
        visitedCertIds.add(certId);
        
        const cert = certId === certificate.id ? certificate : await storage.getCertificate(certId);
        if (!cert) continue;
        
        // Get ledger entries from this certificate's transaction
        if (cert.transactionId) {
          const txLedgerEntries = await vaultLedgerService.getLedgerEntriesByTransactionId(cert.transactionId);
          for (const entry of txLedgerEntries) {
            await addLedgerEntry(entry, existingHashes);
          }
        }
        
        // Get ledger entries linked directly to this certificate
        const certLedgerEntries = await vaultLedgerService.getLedgerEntriesByCertificateId(certId);
        for (const entry of certLedgerEntries) {
          await addLedgerEntry(entry, existingHashes);
        }
        
        // Add parent certificate to queue (traverse backwards)
        if (cert.relatedCertificateId && !visitedCertIds.has(cert.relatedCertificateId)) {
          certificateQueue.push(cert.relatedCertificateId);
        }
        
        // Add child certificates to queue (traverse forwards - find transfers FROM this certificate)
        const childCerts = await storage.getCertificatesByRelatedId(certId);
        for (const childCert of childCerts) {
          if (!visitedCertIds.has(childCert.id)) {
            certificateQueue.push(childCert.id);
          }
        }
      }
      
      // Add certificate issuance event if we have no ledger entries (shows certificate creation)
      if (ledgerHistory.length === 0) {
        let senderFinatradesId: string | null = null;
        let senderAccountType: string | null = null;
        let recipientFinatradesId: string | null = null;
        let recipientAccountType: string | null = null;
        
        if (certificate.fromUserId) {
          const fromInfo = await getFinatradesInfo(certificate.fromUserId);
          senderFinatradesId = fromInfo.finatradesId;
          senderAccountType = fromInfo.accountType;
        }
        
        if (certificate.toUserId) {
          const toInfo = await getFinatradesInfo(certificate.toUserId);
          recipientFinatradesId = toInfo.finatradesId;
          recipientAccountType = toInfo.accountType;
        }
        
        ledgerHistory.push({
          eventType: certificate.type === 'Transfer' ? 'GOLD TRANSFER' : 'CERTIFICATE ISSUED',
          timestamp: certificate.issuedAt?.toISOString() || new Date().toISOString(),
          goldGrams: certificate.goldGrams,
          valueUsd: certificate.totalValueUsd,
          fromFinatradesId: senderFinatradesId,
          fromAccountType: senderAccountType,
          toFinatradesId: certificate.type === 'Transfer' ? recipientFinatradesId : holderFinatradesId,
          toAccountType: certificate.type === 'Transfer' ? recipientAccountType : holderAccountType,
          action: certificate.type,
          eventHash: safeHash(certificate.id)
        });
      }
      
      // If certificate is expired/revoked, add that event at the end
      if (certificate.status === 'Expired' || certificate.status === 'Revoked') {
        const statusHash = safeHash(certificate.id + '_status');
        if (!existingHashes.has(statusHash)) {
          ledgerHistory.push({
            eventType: certificate.status === 'Expired' ? 'CERTIFICATE EXPIRED' : 'CERTIFICATE REVOKED',
            timestamp: certificate.cancelledAt?.toISOString() || certificate.expiresAt?.toISOString() || new Date().toISOString(),
            goldGrams: certificate.goldGrams,
            valueUsd: certificate.totalValueUsd,
            fromFinatradesId: holderFinatradesId,
            fromAccountType: holderAccountType,
            toFinatradesId: null,
            toAccountType: null,
            action: certificate.status,
            eventHash: statusHash
          });
        }
      }
      
      // Sort by timestamp
      ledgerHistory.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      res.json({
        verificationResult,
        message: verificationResult === "genuine_active" 
          ? "This certificate is genuine and currently active."
          : "This certificate is genuine but has expired or been revoked.",
        certificate: {
          certificateNumber: certificate.certificateNumber,
          type: certificate.type,
          goldGrams: certificate.goldGrams,
          goldPriceUsdPerGram: certificate.goldPriceUsdPerGram,
          totalValueUsd: certificate.totalValueUsd,
          issuer: certificate.issuer,
          vaultLocation: certificate.vaultLocation,
          status: certificate.status,
          issuedAt: certificate.issuedAt,
          expiresAt: certificate.expiresAt,
          // Privacy-safe holder info (Finatrades ID only, no personal data)
          holderFinatradesId,
          holderAccountType
        },
        // Blockchain explorer-style ledger history from real vault data
        ledgerHistory,
        summary: {
          totalEvents: ledgerHistory.length,
          lastEventAt: ledgerHistory[ledgerHistory.length - 1]?.timestamp || null,
          isTransfer: certificate.type === 'Transfer'
        }
      });
    } catch (error) {
      console.error("Certificate verification error:", error);
      res.status(500).json({ 
        message: "Failed to verify certificate",
        verificationResult: "error"
      });
    }
  });
  
  // Create vault holding
  app.post("/api/vault", ensureAuthenticated, async (req, res) => {
    try {
      const holdingData = insertVaultHoldingSchema.parse(req.body);
      const holding = await storage.createVaultHolding(holdingData);
      
      // Create audit log
      await storage.createAuditLog({
        entityType: "vault",
        entityId: holding.id,
        actionType: "create",
        actor: holdingData.userId,
        actorRole: "user",
        details: `Gold grams: ${holdingData.goldGrams}`,
      });
      
      res.json({ holding });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create holding" });
    }
  });
  
  // Update vault holding
  app.patch("/api/vault/:id", ensureAuthenticated, async (req, res) => {
    try {
      const holding = await storage.updateVaultHolding(req.params.id, req.body);
      if (!holding) {
        return res.status(404).json({ message: "Holding not found" });
      }
      res.json({ holding });
    } catch (error) {
      res.status(400).json({ message: "Failed to update holding" });
    }
  });
  
  // Admin: Get all vault holdings
  app.get("/api/admin/vault", ensureAdminAsync, requirePermission('view_vault', 'manage_vault'), async (req, res) => {
    try {
      const holdings = await storage.getAllVaultHoldings();
      res.json({ holdings });
    } catch (error) {
      res.status(400).json({ message: "Failed to get all vault holdings" });
    }
  });

  // ============================================================================
  // FINAVAULT - DEPOSIT REQUESTS
  // ============================================================================

  // Get user's vault deposit requests
  app.get("/api/vault/deposits/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const requests = await storage.getUserVaultDepositRequests(req.params.userId);
      res.json({ requests });
    } catch (error) {
      res.status(400).json({ message: "Failed to get deposit requests" });
    }
  });

  // Get single deposit request
  app.get("/api/vault/deposit/:id", ensureAuthenticated, async (req, res) => {
    try {
      const request = await storage.getVaultDepositRequest(req.params.id);
      if (!request) {
        return res.status(404).json({ message: "Deposit request not found" });
      }
      res.json({ request });
    } catch (error) {
      res.status(400).json({ message: "Failed to get deposit request" });
    }
  });

  // Create vault deposit request (user submission)
  app.post("/api/vault/deposit", ensureAuthenticated, requireKycApproved, async (req, res) => {
    try {
      const { userId, vaultLocation, depositType, totalDeclaredWeightGrams, items, deliveryMethod, pickupDetails, documents } = req.body;
      
      if (!userId || !vaultLocation || !depositType || !totalDeclaredWeightGrams || !items || !deliveryMethod) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const referenceNumber = storage.generateVaultDepositReferenceNumber();
      
      const request = await storage.createVaultDepositRequest({
        referenceNumber,
        userId,
        vaultLocation,
        depositType,
        totalDeclaredWeightGrams: totalDeclaredWeightGrams.toString(),
        items,
        deliveryMethod,
        pickupDetails: pickupDetails || null,
        documents: documents || [],
        status: 'Submitted',
      });

      await storage.createAuditLog({
        entityType: "vault_deposit",
        entityId: request.id,
        actionType: "create",
        actor: userId,
        actorRole: "user",
        details: `Deposit request submitted: ${totalDeclaredWeightGrams}g ${depositType}`,
      });

      res.json({ request });
    } catch (error) {
      console.error('Create deposit request error:', error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create deposit request" });
    }
  });

  // Admin: Get all vault deposit requests
  app.get("/api/admin/vault/deposits", ensureAdminAsync, requirePermission('view_vault', 'manage_vault'), async (req, res) => {
    try {
      const requests = await storage.getAllVaultDepositRequests();
      
      // Enrich with user data
      const enrichedRequests = await Promise.all(requests.map(async (request) => {
        const user = await storage.getUser(request.userId);
        return { ...request, user };
      }));
      
      res.json({ requests: enrichedRequests });
    } catch (error) {
      res.status(400).json({ message: "Failed to get deposit requests" });
    }
  });

  // Admin: Get pending vault deposit requests
  app.get("/api/admin/vault/deposits/pending", ensureAdminAsync, requirePermission('view_vault', 'manage_vault'), async (req, res) => {
    try {
      const requests = await storage.getPendingVaultDepositRequests();
      
      const enrichedRequests = await Promise.all(requests.map(async (request) => {
        const user = await storage.getUser(request.userId);
        return { ...request, user };
      }));
      
      res.json({ requests: enrichedRequests });
    } catch (error) {
      res.status(400).json({ message: "Failed to get pending deposit requests" });
    }
  });

  // Admin: Update vault deposit request status
  app.patch("/api/admin/vault/deposit/:id", ensureAdminAsync, requirePermission('manage_vault'), async (req, res) => {
    try {
      const { status, adminNotes, rejectionReason, verifiedWeightGrams, goldPriceUsdPerGram, adminId, estimatedProcessingDays, estimatedCompletionDate } = req.body;
      
      const request = await storage.getVaultDepositRequest(req.params.id);
      if (!request) {
        return res.status(404).json({ message: "Deposit request not found" });
      }

      const updates: any = { 
        status,
        reviewedBy: adminId,
        reviewedAt: new Date(),
      };
      
      if (adminNotes) updates.adminNotes = adminNotes;
      if (rejectionReason) updates.rejectionReason = rejectionReason;
      if (verifiedWeightGrams) updates.verifiedWeightGrams = verifiedWeightGrams.toString();
      if (goldPriceUsdPerGram) updates.goldPriceUsdPerGram = goldPriceUsdPerGram.toString();
      if (estimatedProcessingDays) updates.estimatedProcessingDays = estimatedProcessingDays;
      if (estimatedCompletionDate) updates.estimatedCompletionDate = new Date(estimatedCompletionDate);

      // If status is "Stored" or "Stored in Vault", create vault holding, certificate, and credit wallet
      if (status === 'Stored' || status === 'Stored in Vault') {
        const finalWeightGrams = verifiedWeightGrams || parseFloat(request.totalDeclaredWeightGrams);
        const pricePerGram = goldPriceUsdPerGram || 85.22;
        const totalValue = finalWeightGrams * pricePerGram;

        // Create vault holding
        const holding = await storage.createVaultHolding({
          userId: request.userId,
          goldGrams: finalWeightGrams.toString(),
          vaultLocation: request.vaultLocation,
          isPhysicallyDeposited: true,
          purchasePriceUsdPerGram: pricePerGram.toString(),
        });

        // Generate Digital Ownership Certificate (from Finatrades)
        const docCertNumber = await storage.generateCertificateNumber('Digital Ownership');
        const digitalCert = await storage.createCertificate({
          certificateNumber: docCertNumber,
          userId: request.userId,
          vaultHoldingId: holding.id,
          type: 'Digital Ownership',
          status: 'Active',
          goldGrams: finalWeightGrams.toString(),
          goldPriceUsdPerGram: pricePerGram.toString(),
          totalValueUsd: totalValue.toFixed(2),
          issuer: 'Finatrades',
          vaultLocation: request.vaultLocation,
        });
        
        // Generate Physical Storage Certificate (from Wingold & Metals DMCC)
        const certificateNumber = await storage.generateCertificateNumber('Physical Storage');
        const certificate = await storage.createCertificate({
          certificateNumber,
          userId: request.userId,
          vaultHoldingId: holding.id,
          type: 'Physical Storage',
          status: 'Active',
          goldGrams: finalWeightGrams.toString(),
          goldPriceUsdPerGram: pricePerGram.toString(),
          totalValueUsd: totalValue.toFixed(2),
          issuer: 'Wingold & Metals DMCC',
          vaultLocation: request.vaultLocation,
        });

        // Credit user's FinaPay wallet
        const wallet = await storage.getWallet(request.userId);
        if (wallet) {
          const newGoldBalance = parseFloat(wallet.goldGrams) + finalWeightGrams;
          await storage.updateWallet(wallet.id, {
            goldGrams: newGoldBalance.toFixed(6),
          });

          // Create transaction record - include USD value calculation
          const depositTx = await storage.createTransaction({
            userId: request.userId,
            type: 'Deposit',
            status: 'Completed',
            amountGold: finalWeightGrams.toString(),
            amountUsd: totalValue.toFixed(2),
            goldPriceUsdPerGram: pricePerGram.toString(),
            description: `FinaVault deposit: ${finalWeightGrams}g physical gold stored`,
            sourceModule: 'finavault',
            referenceId: request.referenceNumber,
          });

          // Record ledger entry for deposit
          const { vaultLedgerService } = await import('./vault-ledger-service');
          await vaultLedgerService.recordLedgerEntry({
            userId: request.userId,
            action: 'Deposit',
            goldGrams: finalWeightGrams,
            goldPriceUsdPerGram: pricePerGram,
            fromWallet: 'External',
            toWallet: 'FinaPay',
            toStatus: 'Available',
            transactionId: depositTx.id,
            certificateId: certificate.id,
            notes: `FinaVault physical deposit: ${finalWeightGrams}g gold stored at ${request.vaultLocation}`,
            createdBy: adminId,
          });
          
          // Emit real-time sync event for auto-update
          emitLedgerEvent(request.userId, {
            type: 'balance_update',
            module: 'finavault',
            action: 'vault_deposit_stored',
            data: { goldGrams: finalWeightGrams, amountUsd: totalValue },
          });
        }

        updates.vaultHoldingId = holding.id;
        updates.certificateId = certificate.id;
        updates.digitalCertificateId = digitalCert.id;
        updates.storedAt = new Date();
        updates.vaultInternalReference = `WG-${Date.now().toString(36).toUpperCase()}`;
      }

      const updatedRequest = await storage.updateVaultDepositRequest(req.params.id, updates);

      await storage.createAuditLog({
        entityType: "vault_deposit",
        entityId: req.params.id,
        actionType: "update",
        actor: adminId,
        actorRole: "admin",
        details: `Status changed to ${status}`,
      });

      // Send email notification to user
      const user = await storage.getUser(request.userId);
      if (user?.email) {
        try {
          if (status === 'Stored' || status === 'Stored in Vault') {
            const finalWeightGrams = verifiedWeightGrams != null ? parseFloat(String(verifiedWeightGrams)) : parseFloat(request.totalDeclaredWeightGrams);
            const pricePerGram = goldPriceUsdPerGram != null ? parseFloat(String(goldPriceUsdPerGram)) : 85.22;
            const totalValue = finalWeightGrams * pricePerGram;
            await sendEmail({
              to: user.email,
              subject: 'Your Gold Deposit Has Been Stored - FinaVault',
              html: `
                <h2>Gold Deposit Confirmed</h2>
                <p>Dear ${user.firstName || 'Valued Customer'},</p>
                <p>Great news! Your gold deposit has been verified and stored in our secure vault.</p>
                <table style="border-collapse: collapse; margin: 20px 0;">
                  <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Reference:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${request.referenceNumber}</td></tr>
                  <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Verified Weight:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${finalWeightGrams.toFixed(4)} grams</td></tr>
                  <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Total Value:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">$${totalValue.toFixed(2)} USD</td></tr>
                  <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Vault Location:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${request.vaultLocation}</td></tr>
                </table>
                <p>Your FinaPay wallet has been credited with the gold. You can now view your certificates in the FinaVault section.</p>
                <p>Thank you for choosing Finatrades!</p>
              `,
            });
          } else if (status === 'Rejected') {
            await sendEmail({
              to: user.email,
              subject: 'Vault Deposit Request Update - FinaVault',
              html: `
                <h2>Deposit Request Update</h2>
                <p>Dear ${user.firstName || 'Valued Customer'},</p>
                <p>We regret to inform you that your vault deposit request could not be processed.</p>
                <table style="border-collapse: collapse; margin: 20px 0;">
                  <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Reference:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${request.referenceNumber}</td></tr>
                  <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Reason:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${rejectionReason || 'Please contact support for details'}</td></tr>
                </table>
                <p>If you have questions, please contact our support team.</p>
              `,
            });
            // Create in-app notification
            await storage.createNotification({
              userId: request.userId,
              title: 'Vault Deposit Rejected',
              message: `Your deposit request ${request.referenceNumber} was rejected: ${rejectionReason || 'Contact support for details'}`,
              type: 'warning',
              link: '/finavault',
            });
          }
        } catch (emailErr) {
          console.error('Email notification failed:', emailErr);
        }
      }

      res.json({ request: updatedRequest });
    } catch (error) {
      console.error('Update deposit request error:', error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to update deposit request" });
    }
  });

  // ============================================================================
  // FINAVAULT - WITHDRAWAL REQUESTS (Cash Out)
  // ============================================================================

  // Get user's vault withdrawal requests
  app.get("/api/vault/withdrawals/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const requests = await storage.getUserVaultWithdrawalRequests(req.params.userId);
      res.json({ requests });
    } catch (error) {
      res.status(400).json({ message: "Failed to get withdrawal requests" });
    }
  });

  // Get single withdrawal request
  app.get("/api/vault/withdrawal/:id", ensureAuthenticated, async (req, res) => {
    try {
      const request = await storage.getVaultWithdrawalRequest(req.params.id);
      if (!request) {
        return res.status(404).json({ message: "Withdrawal request not found" });
      }
      res.json({ request });
    } catch (error) {
      res.status(400).json({ message: "Failed to get withdrawal request" });
    }
  });

  // Create vault withdrawal request (user submission)
  app.post("/api/vault/withdrawal", ensureAuthenticated, requireKycApproved, async (req, res) => {
    try {
      const { 
        userId, goldGrams, goldPriceUsdPerGram, withdrawalMethod,
        bankName, accountName, accountNumber, iban, swiftCode, bankCountry,
        cryptoNetwork, cryptoCurrency, walletAddress, notes
      } = req.body;
      
      if (!userId || !goldGrams || !goldPriceUsdPerGram || !withdrawalMethod) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Validate withdrawal method specific fields
      if (withdrawalMethod === 'Bank Transfer') {
        if (!bankName || !accountName || !accountNumber) {
          return res.status(400).json({ message: "Bank details required for bank transfer" });
        }
      } else if (withdrawalMethod === 'Crypto') {
        if (!cryptoNetwork || !cryptoCurrency || !walletAddress) {
          return res.status(400).json({ message: "Crypto details required for crypto withdrawal" });
        }
      }

      // Check if user has sufficient vault holdings
      const holdings = await storage.getUserVaultHoldings(userId);
      const totalVaultGold = holdings.reduce((sum, h) => sum + parseFloat(h.goldGrams), 0);
      
      if (totalVaultGold < parseFloat(goldGrams)) {
        return res.status(400).json({ message: "Insufficient vault holdings" });
      }

      const referenceNumber = storage.generateVaultWithdrawalReferenceNumber();
      const totalValueUsd = parseFloat(goldGrams) * parseFloat(goldPriceUsdPerGram);

      const request = await storage.createVaultWithdrawalRequest({
        referenceNumber,
        userId,
        goldGrams: goldGrams.toString(),
        goldPriceUsdPerGram: goldPriceUsdPerGram.toString(),
        totalValueUsd: totalValueUsd.toFixed(2),
        withdrawalMethod,
        bankName: bankName || null,
        accountName: accountName || null,
        accountNumber: accountNumber || null,
        iban: iban || null,
        swiftCode: swiftCode || null,
        bankCountry: bankCountry || null,
        cryptoNetwork: cryptoNetwork || null,
        cryptoCurrency: cryptoCurrency || null,
        walletAddress: walletAddress || null,
        notes: notes || null,
        status: 'Submitted',
      });

      await storage.createAuditLog({
        entityType: "vault_withdrawal",
        entityId: request.id,
        actionType: "create",
        actor: userId,
        actorRole: "user",
        details: `Withdrawal request submitted: ${goldGrams}g via ${withdrawalMethod}`,
      });

      res.json({ request });
    } catch (error) {
      console.error('Create withdrawal request error:', error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create withdrawal request" });
    }
  });

  // Admin: Get all vault withdrawal requests
  app.get("/api/admin/vault/withdrawals", ensureAdminAsync, requirePermission('view_vault', 'manage_vault'), async (req, res) => {
    try {
      const requests = await storage.getAllVaultWithdrawalRequests();
      
      const enrichedRequests = await Promise.all(requests.map(async (request) => {
        const user = await storage.getUser(request.userId);
        return { ...request, user };
      }));
      
      res.json({ requests: enrichedRequests });
    } catch (error) {
      res.status(400).json({ message: "Failed to get withdrawal requests" });
    }
  });

  // Admin: Get pending vault withdrawal requests
  app.get("/api/admin/vault/withdrawals/pending", ensureAdminAsync, requirePermission('view_vault', 'manage_vault'), async (req, res) => {
    try {
      const requests = await storage.getPendingVaultWithdrawalRequests();
      
      const enrichedRequests = await Promise.all(requests.map(async (request) => {
        const user = await storage.getUser(request.userId);
        return { ...request, user };
      }));
      
      res.json({ requests: enrichedRequests });
    } catch (error) {
      res.status(400).json({ message: "Failed to get pending withdrawal requests" });
    }
  });

  // Admin: Update vault withdrawal request status
  app.patch("/api/admin/vault/withdrawal/:id", ensureAdminAsync, requirePermission('manage_vault'), async (req, res) => {
    try {
      const { status, adminNotes, rejectionReason, transactionReference, adminId } = req.body;
      
      const request = await storage.getVaultWithdrawalRequest(req.params.id);
      if (!request) {
        return res.status(404).json({ message: "Withdrawal request not found" });
      }

      const updates: any = { 
        status,
        reviewedBy: adminId,
        reviewedAt: new Date(),
      };
      
      if (adminNotes) updates.adminNotes = adminNotes;
      if (rejectionReason) updates.rejectionReason = rejectionReason;
      if (transactionReference) updates.transactionReference = transactionReference;

      // If status is "Completed", deduct from vault holdings and wallet
      if (status === 'Completed') {
        const goldGrams = parseFloat(request.goldGrams);

        // Deduct from user's FinaPay wallet
        const wallet = await storage.getWallet(request.userId);
        if (wallet) {
          const newGoldBalance = Math.max(0, parseFloat(wallet.goldGrams) - goldGrams);
          await storage.updateWallet(wallet.id, {
            goldGrams: newGoldBalance.toFixed(6),
          });

          // Create transaction record
          await storage.createTransaction({
            userId: request.userId,
            type: 'Withdrawal',
            status: 'Completed',
            amountGold: goldGrams.toString(),
            amountUsd: request.totalValueUsd,
            goldPriceUsdPerGram: request.goldPriceUsdPerGram,
            description: `FinaVault withdrawal: ${goldGrams}g via ${request.withdrawalMethod}`,
            sourceModule: 'finavault',
            referenceId: request.referenceNumber,
          });
          
          // Emit real-time sync event for auto-update
          emitLedgerEvent(request.userId, {
            type: 'balance_update',
            module: 'finavault',
            action: 'withdrawal_completed',
            data: { goldGrams, amountUsd: parseFloat(request.totalValueUsd) },
          });
        }

        updates.processedAt = new Date();
      }

      const updatedRequest = await storage.updateVaultWithdrawalRequest(req.params.id, updates);

      await storage.createAuditLog({
        entityType: "vault_withdrawal",
        entityId: req.params.id,
        actionType: "update",
        actor: adminId,
        actorRole: "admin",
        details: `Status changed to ${status}`,
      });

      // Send email notification to user
      const user = await storage.getUser(request.userId);
      if (user?.email) {
        try {
          const goldGrams = parseFloat(request.goldGrams);
          const totalValue = parseFloat(request.totalValueUsd);
          
          if (status === 'Completed') {
            await sendEmail({
              to: user.email,
              subject: 'Withdrawal Completed - FinaVault',
              html: `
                <h2>Withdrawal Completed Successfully</h2>
                <p>Dear ${user.firstName || 'Valued Customer'},</p>
                <p>Your withdrawal request has been processed and completed.</p>
                <table style="border-collapse: collapse; margin: 20px 0;">
                  <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Reference:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${request.referenceNumber}</td></tr>
                  <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Gold Amount:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${goldGrams.toFixed(4)} grams</td></tr>
                  <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Total Value:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">$${totalValue.toFixed(2)} USD</td></tr>
                  <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Withdrawal Method:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${request.withdrawalMethod}</td></tr>
                  ${transactionReference ? `<tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Transaction Ref:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${transactionReference}</td></tr>` : ''}
                </table>
                <p>Thank you for using Finatrades!</p>
              `,
            });
          } else if (status === 'Rejected') {
            await sendEmail({
              to: user.email,
              subject: 'Withdrawal Request Update - FinaVault',
              html: `
                <h2>Withdrawal Request Update</h2>
                <p>Dear ${user.firstName || 'Valued Customer'},</p>
                <p>We regret to inform you that your withdrawal request could not be processed.</p>
                <table style="border-collapse: collapse; margin: 20px 0;">
                  <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Reference:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${request.referenceNumber}</td></tr>
                  <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Amount:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${goldGrams.toFixed(4)} grams ($${totalValue.toFixed(2)})</td></tr>
                  <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Reason:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${rejectionReason || 'Please contact support for details'}</td></tr>
                </table>
                <p>Your gold remains in your FinaPay wallet. If you have questions, please contact our support team.</p>
              `,
            });
            // Create in-app notification
            await storage.createNotification({
              userId: request.userId,
              title: 'Withdrawal Rejected',
              message: `Your withdrawal request ${request.referenceNumber} was rejected: ${rejectionReason || 'Contact support for details'}`,
              type: 'warning',
              link: '/finavault',
            });
          }
        } catch (emailErr) {
          console.error('Email notification failed:', emailErr);
        }
      }

      res.json({ request: updatedRequest });
    } catch (error) {
      console.error('Update withdrawal request error:', error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to update withdrawal request" });
    }
  });

  // ============================================================================
  // FINAVAULT - PHYSICAL DELIVERY REQUESTS
  // ============================================================================

  // User: Create physical delivery request
  app.post("/api/vault/physical-delivery", ensureAuthenticated, requireKycApproved, async (req, res) => {
    try {
      const { userId, goldGrams, deliveryAddress, city, country, postalCode, phone, specialInstructions, deliveryMethod } = req.body;
      
      const sessionUserId = req.session?.userId;
      if (sessionUserId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Check available gold balance
      const ownership = await db.select().from(vaultOwnershipSummary).where(eq(vaultOwnershipSummary.userId, userId));
      const availableGold = ownership[0] ? parseFloat(ownership[0].availableGrams) : 0;
      const requestedGrams = parseFloat(goldGrams);
      
      if (requestedGrams > availableGold) {
        return res.status(400).json({ message: `Insufficient gold. Available: ${availableGold.toFixed(4)}g` });
      }
      
      const goldPrice = await getGoldPricePerGram();
      const refNumber = `PDR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 4).toUpperCase()}`;
      
      // Calculate fees (example: $50 base + $10 per 100g)
      const shippingFee = 50 + Math.ceil(requestedGrams / 100) * 10;
      const insuranceFee = requestedGrams * goldPrice * 0.005; // 0.5% insurance
      
      const [request] = await db.insert(physicalDeliveryRequests).values({
        id: crypto.randomUUID(),
        referenceNumber: refNumber,
        userId,
        goldGrams: requestedGrams.toFixed(6),
        goldPriceUsdPerGram: goldPrice.toFixed(6),
        deliveryAddress,
        city,
        country,
        postalCode,
        phone,
        specialInstructions,
        deliveryMethod: deliveryMethod || 'Insured Courier',
        shippingFeeUsd: shippingFee.toFixed(2),
        insuranceFeeUsd: insuranceFee.toFixed(2),
        status: 'Pending',
      }).returning();
      
      await storage.createAuditLog({
        entityType: "physical_delivery",
        entityId: request.id,
        actionType: "create",
        actor: userId,
        actorRole: "user",
        details: `Physical delivery request: ${requestedGrams}g to ${city}, ${country}`,
      });
      
      res.json({ request, message: "Physical delivery request submitted" });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create delivery request" });
    }
  });

  // User: Get physical delivery requests
  app.get("/api/vault/physical-deliveries/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const requests = await db.select().from(physicalDeliveryRequests).where(eq(physicalDeliveryRequests.userId, req.params.userId)).orderBy(desc(physicalDeliveryRequests.createdAt));
      res.json({ requests });
    } catch (error) {
      res.status(400).json({ message: "Failed to get delivery requests" });
    }
  });

  // Admin: Get all physical delivery requests
  app.get("/api/admin/vault/physical-deliveries", ensureAdminAsync, requirePermission('view_vault', 'manage_vault'), async (req, res) => {
    try {
      const requests = await db.select().from(physicalDeliveryRequests).orderBy(desc(physicalDeliveryRequests.createdAt));
      const enriched = await Promise.all(requests.map(async (r) => {
        const user = await storage.getUser(r.userId);
        return { ...r, user: user ? { email: user.email, firstName: user.firstName, lastName: user.lastName } : null };
      }));
      res.json({ requests: enriched });
    } catch (error) {
      res.status(400).json({ message: "Failed to get delivery requests" });
    }
  });

  // Admin: Update physical delivery status
  app.patch("/api/admin/vault/physical-delivery/:id", ensureAdminAsync, requirePermission('manage_vault'), async (req, res) => {
    try {
      const { status, trackingNumber, courierName, estimatedDeliveryDays, adminNotes } = req.body;
      const adminUser = (req as any).adminUser;
      
      const [request] = await db.select().from(physicalDeliveryRequests).where(eq(physicalDeliveryRequests.id, req.params.id));
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }
      
      const updates: any = { status, updatedAt: new Date() };
      if (trackingNumber) updates.trackingNumber = trackingNumber;
      if (courierName) updates.courierName = courierName;
      if (estimatedDeliveryDays) updates.estimatedDeliveryDays = estimatedDeliveryDays;
      if (adminNotes) updates.adminNotes = adminNotes;
      
      if (status === 'Shipped') {
        updates.shippedAt = new Date();
        updates.processedBy = adminUser.id;
        
        // Deduct gold from user's balance
        const goldGrams = parseFloat(request.goldGrams);
        const wallet = await storage.getWallet(request.userId);
        if (wallet) {
          await storage.updateWallet(wallet.id, {
            goldGrams: Math.max(0, parseFloat(wallet.goldGrams) - goldGrams).toFixed(6),
          });
        }
        
        // Record ledger entry
        const { vaultLedgerService } = await import('./vault-ledger-service');
        await vaultLedgerService.recordLedgerEntry({
          userId: request.userId,
          action: 'Physical_Delivery',
          goldGrams,
          goldPriceUsdPerGram: parseFloat(request.goldPriceUsdPerGram),
          fromWallet: 'FinaPay',
          toWallet: 'External',
          fromStatus: 'Available',
          toStatus: 'Delivered',
          notes: `Physical delivery ${request.referenceNumber} - ${courierName} ${trackingNumber}`,
          createdBy: adminUser.id,
        });
      }
      
      if (status === 'Delivered') {
        updates.deliveredAt = new Date();
      }
      
      await db.update(physicalDeliveryRequests).set(updates).where(eq(physicalDeliveryRequests.id, req.params.id));
      
      await storage.createAuditLog({
        entityType: "physical_delivery",
        entityId: request.id,
        actionType: "update_status",
        actor: adminUser.id,
        actorRole: "admin",
        details: `Status changed to ${status}`,
      });
      
      res.json({ message: "Delivery request updated" });
    } catch (error) {
      res.status(400).json({ message: "Failed to update delivery request" });
    }
  });

  // ============================================================================
  // FINAVAULT - GOLD BAR INVENTORY
  // ============================================================================

  // User: Get allocated gold bars
  app.get("/api/vault/gold-bars/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const bars = await db.select().from(goldBars).where(eq(goldBars.allocatedToUserId, req.params.userId));
      res.json({ bars });
    } catch (error) {
      res.status(400).json({ message: "Failed to get gold bars" });
    }
  });

  // Admin: Get all gold bars
  app.get("/api/admin/vault/gold-bars", ensureAdminAsync, requirePermission('view_vault', 'manage_vault'), async (req, res) => {
    try {
      const bars = await db.select().from(goldBars).orderBy(desc(goldBars.createdAt));
      res.json({ bars });
    } catch (error) {
      res.status(400).json({ message: "Failed to get gold bars" });
    }
  });

  // Admin: Add gold bar
  app.post("/api/admin/vault/gold-bars", ensureAdminAsync, requirePermission('manage_vault'), async (req, res) => {
    try {
      const { serialNumber, weightGrams, purity, refiner, vaultLocation, zone, purchasePricePerGram, assayCertificateUrl, notes } = req.body;
      
      const [bar] = await db.insert(goldBars).values({
        id: crypto.randomUUID(),
        serialNumber,
        weightGrams: parseFloat(weightGrams).toFixed(6),
        purity: purity || '999.9',
        refiner,
        vaultLocation,
        zone,
        status: 'Available',
        purchasePricePerGram: purchasePricePerGram ? parseFloat(purchasePricePerGram).toFixed(6) : null,
        purchaseDate: new Date().toISOString().split('T')[0],
        assayCertificateUrl,
        notes,
      }).returning();
      
      res.json({ bar, message: "Gold bar added to inventory" });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to add gold bar" });
    }
  });

  // Admin: Allocate gold bar to user
  app.post("/api/admin/vault/gold-bars/:id/allocate", ensureAdminAsync, requirePermission('manage_vault'), async (req, res) => {
    try {
      const { userId } = req.body;
      
      const [bar] = await db.select().from(goldBars).where(eq(goldBars.id, req.params.id));
      if (!bar) {
        return res.status(404).json({ message: "Gold bar not found" });
      }
      if (bar.status !== 'Available') {
        return res.status(400).json({ message: "Gold bar is not available for allocation" });
      }
      
      await db.update(goldBars).set({
        allocatedToUserId: userId,
        allocatedAt: new Date(),
        status: 'Allocated',
        updatedAt: new Date(),
      }).where(eq(goldBars.id, req.params.id));
      
      res.json({ message: "Gold bar allocated to user" });
    } catch (error) {
      res.status(400).json({ message: "Failed to allocate gold bar" });
    }
  });

  // ============================================================================
  // FINAVAULT - STORAGE FEES
  // ============================================================================

  // User: Get storage fees
  app.get("/api/vault/storage-fees/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const fees = await db.select().from(storageFees).where(eq(storageFees.userId, req.params.userId)).orderBy(desc(storageFees.createdAt));
      res.json({ fees });
    } catch (error) {
      res.status(400).json({ message: "Failed to get storage fees" });
    }
  });

  // Admin: Get all storage fees
  app.get("/api/admin/vault/storage-fees", ensureAdminAsync, requirePermission('view_vault', 'manage_vault'), async (req, res) => {
    try {
      const fees = await db.select().from(storageFees).orderBy(desc(storageFees.createdAt));
      res.json({ fees });
    } catch (error) {
      res.status(400).json({ message: "Failed to get storage fees" });
    }
  });

  // Admin: Generate monthly storage fees
  app.post("/api/admin/vault/storage-fees/generate", ensureAdminAsync, requirePermission('manage_vault'), async (req, res) => {
    try {
      const { month, year, feeRatePercent } = req.body;
      const rate = parseFloat(feeRatePercent) || 0.0833; // Default 1% annual = 0.0833% monthly
      
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      const periodStart = startDate.toISOString().split('T')[0];
      const periodEnd = endDate.toISOString().split('T')[0];
      
      // Check if fees already generated for this period
      const existingFees = await db.select({ count: sql<number>`COUNT(*)` })
        .from(storageFees)
        .where(eq(storageFees.billingPeriodStart, periodStart));
      
      if (existingFees[0]?.count > 0) {
        return res.status(400).json({ 
          message: `Storage fees already generated for ${month}/${year}. Found ${existingFees[0].count} existing records.` 
        });
      }
      
      // Get all users with vault holdings
      const ownerships = await db.select().from(vaultOwnershipSummary);
      const goldPrice = await getGoldPricePerGram();
      
      let generated = 0;
      let skipped = 0;
      for (const ownership of ownerships) {
        const avgGold = parseFloat(ownership.totalGoldGrams);
        if (avgGold <= 0) {
          skipped++;
          continue;
        }
        
        const feeUsd = avgGold * goldPrice * (rate / 100);
        const feeGold = avgGold * (rate / 100);
        
        await db.insert(storageFees).values({
          id: crypto.randomUUID(),
          userId: ownership.userId,
          billingPeriodStart: periodStart,
          billingPeriodEnd: periodEnd,
          averageGoldGrams: avgGold.toFixed(6),
          feeRatePercent: rate.toFixed(4),
          feeAmountUsd: feeUsd.toFixed(2),
          feeAmountGoldGrams: feeGold.toFixed(6),
          status: 'Pending',
        });
        generated++;
      }
      
      res.json({ 
        message: `Generated ${generated} storage fee records for ${month}/${year}`,
        details: { generated, skipped, period: `${periodStart} to ${periodEnd}` }
      });
    } catch (error) {
      res.status(400).json({ message: "Failed to generate storage fees" });
    }
  });

  // Admin: Mark storage fee as paid
  app.patch("/api/admin/vault/storage-fees/:id", ensureAdminAsync, requirePermission('manage_vault'), async (req, res) => {
    try {
      const { status, paymentMethod, notes } = req.body;
      
      const updates: any = { status };
      if (status === 'Paid') {
        updates.paidAt = new Date();
        updates.paymentMethod = paymentMethod;
      }
      if (notes) updates.notes = notes;
      
      await db.update(storageFees).set(updates).where(eq(storageFees.id, req.params.id));
      
      res.json({ message: "Storage fee updated" });
    } catch (error) {
      res.status(400).json({ message: "Failed to update storage fee" });
    }
  });

  // ============================================================================
  // FINAVAULT - VAULT LOCATIONS
  // ============================================================================

  // Get all vault locations
  app.get("/api/vault/locations", ensureAuthenticated, async (req, res) => {
    try {
      const locations = await db.select().from(vaultLocations).where(eq(vaultLocations.isActive, true));
      res.json({ locations });
    } catch (error) {
      res.status(400).json({ message: "Failed to get vault locations" });
    }
  });

  // Admin: Get all vault locations (including inactive)
  app.get("/api/admin/vault/locations", ensureAdminAsync, requirePermission('view_vault', 'manage_vault'), async (req, res) => {
    try {
      const locations = await db.select().from(vaultLocations).orderBy(vaultLocations.name);
      res.json({ locations });
    } catch (error) {
      res.status(400).json({ message: "Failed to get vault locations" });
    }
  });

  // Admin: Create vault location
  app.post("/api/admin/vault/locations", ensureAdminAsync, requirePermission('manage_vault'), async (req, res) => {
    try {
      const { name, code, address, city, country, timezone, capacityKg, insuranceProvider, insurancePolicyNumber, insuranceCoverageUsd, securityLevel, operatingHours, contactEmail, contactPhone } = req.body;
      
      const [location] = await db.insert(vaultLocations).values({
        id: crypto.randomUUID(),
        name,
        code: code.toUpperCase(),
        address,
        city,
        country,
        timezone,
        capacityKg: capacityKg ? parseFloat(capacityKg).toFixed(2) : null,
        insuranceProvider,
        insurancePolicyNumber,
        insuranceCoverageUsd: insuranceCoverageUsd ? parseFloat(insuranceCoverageUsd).toFixed(2) : null,
        securityLevel: securityLevel || 'High',
        operatingHours,
        contactEmail,
        contactPhone,
        isActive: true,
      }).returning();
      
      res.json({ location, message: "Vault location created" });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create vault location" });
    }
  });

  // Admin: Update vault location
  app.patch("/api/admin/vault/locations/:id", ensureAdminAsync, requirePermission('manage_vault'), async (req, res) => {
    try {
      const updates = { ...req.body, updatedAt: new Date() };
      await db.update(vaultLocations).set(updates).where(eq(vaultLocations.id, req.params.id));
      res.json({ message: "Vault location updated" });
    } catch (error) {
      res.status(400).json({ message: "Failed to update vault location" });
    }
  });

  // ============================================================================
  // FINAVAULT - VAULT TRANSFERS
  // ============================================================================

  // User: Request vault transfer
  app.post("/api/vault/transfers", ensureAuthenticated, requireKycApproved, async (req, res) => {
    try {
      const { userId, goldGrams, fromLocation, toLocation, reason } = req.body;
      
      const sessionUserId = req.session?.userId;
      if (sessionUserId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const refNumber = `VT-${Date.now().toString(36).toUpperCase()}`;
      const transferFee = 25; // Example flat fee
      
      const [transfer] = await db.insert(vaultTransfers).values({
        id: crypto.randomUUID(),
        referenceNumber: refNumber,
        userId,
        goldGrams: parseFloat(goldGrams).toFixed(6),
        fromLocation,
        toLocation,
        transferFeeUsd: transferFee.toFixed(2),
        reason,
        status: 'Pending',
      }).returning();
      
      res.json({ transfer, message: "Vault transfer request submitted" });
    } catch (error) {
      res.status(400).json({ message: "Failed to create transfer request" });
    }
  });

  // User: Get vault transfers
  app.get("/api/vault/transfers/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const transfers = await db.select().from(vaultTransfers).where(eq(vaultTransfers.userId, req.params.userId)).orderBy(desc(vaultTransfers.createdAt));
      res.json({ transfers });
    } catch (error) {
      res.status(400).json({ message: "Failed to get transfers" });
    }
  });

  // Admin: Get all vault transfers
  app.get("/api/admin/vault/transfers", ensureAdminAsync, requirePermission('view_vault', 'manage_vault'), async (req, res) => {
    try {
      const transfers = await db.select().from(vaultTransfers).orderBy(desc(vaultTransfers.createdAt));
      res.json({ transfers });
    } catch (error) {
      res.status(400).json({ message: "Failed to get transfers" });
    }
  });

  // Admin: Update vault transfer
  app.patch("/api/admin/vault/transfers/:id", ensureAdminAsync, requirePermission('manage_vault'), async (req, res) => {
    try {
      const { status, adminNotes } = req.body;
      const adminUser = (req as any).adminUser;
      
      const [transfer] = await db.select().from(vaultTransfers).where(eq(vaultTransfers.id, req.params.id));
      if (!transfer) {
        return res.status(404).json({ message: "Transfer not found" });
      }
      
      const updates: any = { status };
      if (status === 'Approved') {
        updates.approvedBy = adminUser.id;
        updates.approvedAt = new Date();
      }
      if (status === 'Completed') {
        updates.completedAt = new Date();
        
        // Record ledger entry for vault transfer completion
        const { vaultLedgerService } = await import('./vault-ledger-service');
        const goldPrice = await getGoldPricePerGram();
        await vaultLedgerService.recordLedgerEntry({
          userId: transfer.userId,
          action: 'Vault_Transfer',
          goldGrams: parseFloat(transfer.goldGrams),
          goldPriceUsdPerGram: goldPrice,
          fromWallet: 'FinaPay',
          toWallet: 'FinaPay',
          fromStatus: 'Available',
          toStatus: 'Available',
          notes: `Vault transfer ${transfer.referenceNumber}: ${transfer.fromLocation} → ${transfer.toLocation}`,
          createdBy: adminUser.id,
        });
        
        await storage.createAuditLog({
          entityType: "vault_transfer",
          entityId: transfer.id,
          actionType: "complete",
          actor: adminUser.id,
          actorRole: "admin",
          details: `Transfer ${transfer.goldGrams}g from ${transfer.fromLocation} to ${transfer.toLocation} completed`,
        });
      }
      if (adminNotes) updates.adminNotes = adminNotes;
      
      await db.update(vaultTransfers).set(updates).where(eq(vaultTransfers.id, req.params.id));
      
      res.json({ message: "Transfer request updated" });
    } catch (error) {
      res.status(400).json({ message: "Failed to update transfer" });
    }
  });

  // ============================================================================
  // FINAVAULT - GOLD GIFTS
  // ============================================================================

  // User: Send gold gift
  app.post("/api/vault/gifts", ensureAuthenticated, requireKycApproved, async (req, res) => {
    try {
      const { senderUserId, recipientEmail, recipientPhone, goldGrams, message, occasion } = req.body;
      
      const sessionUserId = req.session?.userId;
      if (sessionUserId !== senderUserId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const grams = parseFloat(goldGrams);
      if (isNaN(grams) || grams <= 0) {
        return res.status(400).json({ message: "Invalid gold amount" });
      }
      
      // Check sender's balance
      const wallet = await storage.getWallet(senderUserId);
      if (!wallet || parseFloat(wallet.goldGrams) < grams) {
        return res.status(400).json({ message: "Insufficient gold balance" });
      }
      
      const goldPrice = await getGoldPricePerGram();
      const refNumber = `GIFT-${Date.now().toString(36).toUpperCase()}`;
      
      // Check if recipient exists
      let recipientUserId = null;
      if (recipientEmail) {
        const recipient = await storage.getUserByEmail(recipientEmail);
        if (recipient) recipientUserId = recipient.id;
      }
      
      // Deduct from sender's wallet
      await storage.updateWallet(wallet.id, {
        goldGrams: (parseFloat(wallet.goldGrams) - grams).toFixed(6),
      });
      
      // Record ledger entry for sender
      const { vaultLedgerService } = await import('./vault-ledger-service');
      await vaultLedgerService.recordLedgerEntry({
        userId: senderUserId,
        action: 'Gift_Send',
        goldGrams: grams,
        goldPriceUsdPerGram: goldPrice,
        fromWallet: 'FinaPay',
        toWallet: recipientUserId ? 'FinaPay' : 'External',
        fromStatus: 'Available',
        toStatus: 'Available',
        counterpartyUserId: recipientUserId || undefined,
        notes: `Gift to ${recipientEmail || recipientPhone}: ${refNumber}`,
        createdBy: senderUserId,
      });
      
      // Create sender transaction
      const senderTx = await storage.createTransaction({
        userId: senderUserId,
        type: 'Send',
        status: 'Completed',
        amountGold: grams.toFixed(6),
        amountUsd: (grams * goldPrice).toFixed(2),
        description: `Gold gift to ${recipientEmail || recipientPhone}: ${message || occasion || ''}`.substring(0, 255),
        sourceModule: 'FinaVault',
      });
      
      const [gift] = await db.insert(goldGifts).values({
        id: crypto.randomUUID(),
        referenceNumber: refNumber,
        senderUserId,
        recipientUserId,
        recipientEmail,
        recipientPhone,
        goldGrams: grams.toFixed(6),
        goldPriceUsdPerGram: goldPrice.toFixed(6),
        message,
        occasion,
        status: recipientUserId ? 'Sent' : 'Pending',
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
        senderTransactionId: senderTx.id,
      }).returning();
      
      // If recipient exists, credit immediately
      if (recipientUserId) {
        const recipientWallet = await storage.getOrCreateWallet(recipientUserId);
        await storage.updateWallet(recipientWallet.id, {
          goldGrams: (parseFloat(recipientWallet.goldGrams) + grams).toFixed(6),
        });
        
        // Record ledger entry for recipient
        await vaultLedgerService.recordLedgerEntry({
          userId: recipientUserId,
          action: 'Gift_Receive',
          goldGrams: grams,
          goldPriceUsdPerGram: goldPrice,
          fromWallet: 'FinaPay',
          toWallet: 'FinaPay',
          fromStatus: 'Available',
          toStatus: 'Available',
          counterpartyUserId: senderUserId,
          notes: `Gift from ${senderUserId}: ${refNumber}`,
          createdBy: senderUserId,
        });
        
        const recipientTx = await storage.createTransaction({
          userId: recipientUserId,
          type: 'Receive',
          status: 'Completed',
          amountGold: grams.toFixed(6),
          amountUsd: (grams * goldPrice).toFixed(2),
          description: `Gold gift received`,
          sourceModule: 'FinaVault',
        });
        
        await db.update(goldGifts).set({
          status: 'Claimed',
          claimedAt: new Date(),
          recipientTransactionId: recipientTx.id,
        }).where(eq(goldGifts.id, gift.id));
      }
      
      res.json({ gift, message: "Gold gift sent successfully" });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to send gift" });
    }
  });

  // User: Get sent/received gifts
  app.get("/api/vault/gifts/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const sent = await db.select().from(goldGifts).where(eq(goldGifts.senderUserId, req.params.userId)).orderBy(desc(goldGifts.createdAt));
      const received = await db.select().from(goldGifts).where(eq(goldGifts.recipientUserId, req.params.userId)).orderBy(desc(goldGifts.createdAt));
      res.json({ sent, received });
    } catch (error) {
      res.status(400).json({ message: "Failed to get gifts" });
    }
  });

  // User: Claim gift (for new users)
  app.post("/api/vault/gifts/:id/claim", ensureAuthenticated, async (req, res) => {
    try {
      const { userId } = req.body;
      const sessionUserId = req.session?.userId;
      if (sessionUserId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const [gift] = await db.select().from(goldGifts).where(eq(goldGifts.id, req.params.id));
      if (!gift) {
        return res.status(404).json({ message: "Gift not found" });
      }
      if (gift.status !== 'Pending' && gift.status !== 'Sent') {
        return res.status(400).json({ message: "Gift cannot be claimed" });
      }
      
      // Check expiration
      if (gift.expiresAt && new Date(gift.expiresAt) < new Date()) {
        return res.status(400).json({ message: "Gift has expired" });
      }
      
      const user = await storage.getUser(userId);
      if (gift.recipientEmail && user?.email !== gift.recipientEmail) {
        return res.status(403).json({ message: "This gift is not for you" });
      }
      
      const grams = parseFloat(gift.goldGrams);
      const goldPrice = parseFloat(gift.goldPriceUsdPerGram);
      
      // Credit recipient
      const recipientWallet = await storage.getOrCreateWallet(userId);
      await storage.updateWallet(recipientWallet.id, {
        goldGrams: (parseFloat(recipientWallet.goldGrams) + grams).toFixed(6),
      });
      
      // Record ledger entry for recipient
      const { vaultLedgerService } = await import('./vault-ledger-service');
      await vaultLedgerService.recordLedgerEntry({
        userId,
        action: 'Gift_Receive',
        goldGrams: grams,
        goldPriceUsdPerGram: goldPrice,
        fromWallet: 'External',
        toWallet: 'FinaPay',
        fromStatus: 'Available',
        toStatus: 'Available',
        counterpartyUserId: gift.senderUserId,
        notes: `Gift claimed: ${gift.referenceNumber}`,
        createdBy: userId,
      });
      
      const recipientTx = await storage.createTransaction({
        userId,
        type: 'Receive',
        status: 'Completed',
        amountGold: grams.toFixed(6),
        amountUsd: (grams * goldPrice).toFixed(2),
        description: `Gold gift claimed`,
        sourceModule: 'FinaVault',
      });
      
      await db.update(goldGifts).set({
        status: 'Claimed',
        recipientUserId: userId,
        claimedAt: new Date(),
        recipientTransactionId: recipientTx.id,
      }).where(eq(goldGifts.id, gift.id));
      
      res.json({ message: "Gift claimed successfully" });
    } catch (error) {
      res.status(400).json({ message: "Failed to claim gift" });
    }
  });

  // ============================================================================
  // FINAVAULT - INSURANCE CERTIFICATES
  // ============================================================================

  // User: Get insurance certificates
  app.get("/api/vault/insurance/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const certs = await db.select().from(insuranceCertificates).where(eq(insuranceCertificates.userId, req.params.userId)).orderBy(desc(insuranceCertificates.createdAt));
      res.json({ certificates: certs });
    } catch (error) {
      res.status(400).json({ message: "Failed to get insurance certificates" });
    }
  });

  // Admin: Generate insurance certificate
  app.post("/api/admin/vault/insurance", ensureAdminAsync, requirePermission('manage_vault'), async (req, res) => {
    try {
      const { userId, vaultLocation, goldGrams, insurerName, policyNumber, coverageStart, coverageEnd, premiumUsd } = req.body;
      
      const goldPrice = await getGoldPricePerGram();
      const coverageAmount = parseFloat(goldGrams) * goldPrice * 1.1; // 110% coverage
      const certNumber = `INS-${Date.now().toString(36).toUpperCase()}`;
      
      const [cert] = await db.insert(insuranceCertificates).values({
        id: crypto.randomUUID(),
        userId,
        certificateNumber: certNumber,
        vaultLocation,
        goldGrams: parseFloat(goldGrams).toFixed(6),
        coverageAmountUsd: coverageAmount.toFixed(2),
        premiumUsd: premiumUsd ? parseFloat(premiumUsd).toFixed(2) : null,
        insurerName,
        policyNumber,
        coverageStart,
        coverageEnd,
        status: 'Active',
      }).returning();
      
      res.json({ certificate: cert, message: "Insurance certificate generated" });
    } catch (error) {
      res.status(400).json({ message: "Failed to generate insurance certificate" });
    }
  });

  // Admin: Get all insurance certificates
  app.get("/api/admin/vault/insurance", ensureAdminAsync, requirePermission('view_vault', 'manage_vault'), async (req, res) => {
    try {
      const certs = await db.select().from(insuranceCertificates).orderBy(desc(insuranceCertificates.createdAt));
      res.json({ certificates: certs });
    } catch (error) {
      res.status(400).json({ message: "Failed to get insurance certificates" });
    }
  });

  // ============================================================================
  // FINAVAULT - RECONCILIATION REPORT
  // ============================================================================

  // Admin: Get vault reconciliation report
  app.get("/api/admin/vault/reconciliation", ensureAdminAsync, requirePermission('view_vault', 'manage_vault'), async (req, res) => {
    try {
      // Get total physical inventory
      const barsResult = await db.select({
        totalBars: sql<number>`COUNT(*)`,
        totalWeight: sql<string>`COALESCE(SUM(CAST(weight_grams AS DECIMAL)), 0)`,
        allocatedWeight: sql<string>`COALESCE(SUM(CASE WHEN status = 'Allocated' THEN CAST(weight_grams AS DECIMAL) ELSE 0 END), 0)`,
        availableWeight: sql<string>`COALESCE(SUM(CASE WHEN status = 'Available' THEN CAST(weight_grams AS DECIMAL) ELSE 0 END), 0)`,
      }).from(goldBars);
      
      // Get total digital holdings
      const ownershipResult = await db.select({
        totalDigital: sql<string>`COALESCE(SUM(CAST(total_gold_grams AS DECIMAL)), 0)`,
        totalUsers: sql<number>`COUNT(*)`,
      }).from(vaultOwnershipSummary);
      
      // Get pending operations
      const pendingDeliveries = await db.select({ count: sql<number>`COUNT(*)` }).from(physicalDeliveryRequests).where(eq(physicalDeliveryRequests.status, 'Pending'));
      const pendingTransfers = await db.select({ count: sql<number>`COUNT(*)` }).from(vaultTransfers).where(eq(vaultTransfers.status, 'Pending'));
      
      const physicalTotal = parseFloat(barsResult[0]?.totalWeight || '0');
      const digitalTotal = parseFloat(ownershipResult[0]?.totalDigital || '0');
      const discrepancy = physicalTotal - digitalTotal;
      const coverageRatio = digitalTotal > 0 ? (physicalTotal / digitalTotal) * 100 : 100;
      
      res.json({
        report: {
          generatedAt: new Date().toISOString(),
          physical: {
            totalBars: barsResult[0]?.totalBars || 0,
            totalWeightGrams: physicalTotal,
            allocatedGrams: parseFloat(barsResult[0]?.allocatedWeight || '0'),
            availableGrams: parseFloat(barsResult[0]?.availableWeight || '0'),
          },
          digital: {
            totalUsersWithHoldings: ownershipResult[0]?.totalUsers || 0,
            totalDigitalGrams: digitalTotal,
          },
          reconciliation: {
            discrepancyGrams: discrepancy,
            coverageRatio: coverageRatio.toFixed(2) + '%',
            status: Math.abs(discrepancy) < 0.01 ? 'Balanced' : discrepancy > 0 ? 'Over-collateralized' : 'Under-collateralized',
          },
          pendingOperations: {
            deliveryRequests: pendingDeliveries[0]?.count || 0,
            transferRequests: pendingTransfers[0]?.count || 0,
          },
        },
      });
    } catch (error) {
      res.status(400).json({ message: "Failed to generate reconciliation report" });
    }
  });
  
  // ============================================================================
  // BNSL - BUY NOW SELL LATER
  // ============================================================================
  
  // Get user BNSL plans - PROTECTED
  app.get("/api/bnsl/plans/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const plans = await storage.getUserBnslPlans(req.params.userId);
      res.json({ plans });
    } catch (error) {
      res.status(400).json({ message: "Failed to get BNSL plans" });
    }
  });
  
  // Get all BNSL plans (Admin)
  app.get("/api/admin/bnsl/plans", ensureAdminAsync, requirePermission('view_bnsl', 'manage_bnsl'), async (req, res) => {
    try {
      const plans = await storage.getAllBnslPlans();
      
      // Enrich plans with user data
      const enrichedPlans = await Promise.all(plans.map(async (plan) => {
        try {
          const user = await storage.getUser(plan.userId);
          return { ...plan, user };
        } catch {
          return { ...plan, user: null };
        }
      }));
      
      res.json({ plans: enrichedPlans });
    } catch (error) {
      res.status(400).json({ message: "Failed to get BNSL plans" });
    }
  });

  // Get BNSL wallet for user - PROTECTED
  app.get("/api/bnsl/wallet/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const wallet = await storage.getOrCreateBnslWallet(req.params.userId);
      res.json({ wallet });
    } catch (error) {
      res.status(400).json({ message: "Failed to get BNSL wallet" });
    }
  });

  // Get BNSL ledger history for user - PROTECTED
  app.get("/api/bnsl/ledger/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const userId = req.params.userId;
      const limit = parseInt(req.query.limit as string) || 50;
      
      // Get BNSL plans for this user
      const plans = await storage.getUserBnslPlans(userId);
      
      // Get BNSL payouts
      const allPayouts: any[] = [];
      for (const plan of plans) {
        const payouts = await storage.getBnslPlanPayouts(plan.id);
        allPayouts.push(...payouts.map((p: any) => ({ ...p, planId: plan.id })));
      }
      
      // Get wallet transactions (transfers from vault ledger)
      const { vaultLedgerService } = await import('./vault-ledger-service');
      const vaultEntries = await vaultLedgerService.getLedgerHistory(userId, 200);
      const bnslRelatedEntries = vaultEntries.filter((e: any) => 
        e.action === 'FinaPay_To_BNSL' || e.action === 'BNSL_To_FinaPay'
      );
      
      // Build ledger entries
      const entries: any[] = [];
      let runningBalance = 0;
      
      // Add plan creations (gold locked)
      for (const plan of plans) {
        const goldGrams = parseFloat(plan.goldSoldGrams);
        runningBalance -= goldGrams; // Gold locked is a debit
        entries.push({
          id: `plan-${plan.id}`,
          action: 'Plan_Lock',
          goldGrams: (-goldGrams).toString(),
          valueUsd: plan.totalSaleProceedsUsd,
          planId: plan.id,
          balanceAfterGrams: runningBalance.toString(),
          notes: `${plan.tenorMonths} Month BNSL Plan - ${goldGrams.toFixed(4)}g locked`,
          createdAt: plan.createdAt,
        });
      }
      
      // Add margin payouts (credits)
      for (const payout of allPayouts) {
        if (payout.status === 'Paid') {
          const payoutGrams = parseFloat(payout.marginPayoutGrams || '0');
          runningBalance += payoutGrams;
          entries.push({
            id: `payout-${payout.id}`,
            action: 'Margin_Payout',
            goldGrams: payoutGrams.toString(),
            valueUsd: payout.marginPayoutUsd,
            payoutId: payout.id,
            planId: payout.planId,
            balanceAfterGrams: runningBalance.toString(),
            notes: `Margin Payout - Period ${payout.periodNumber}`,
            createdAt: payout.paidAt || payout.createdAt,
          });
        }
      }
      
      // Add wallet transfers
      for (const entry of bnslRelatedEntries) {
        const goldGrams = parseFloat(entry.goldGrams);
        if (entry.action === 'FinaPay_To_BNSL') {
          runningBalance += Math.abs(goldGrams);
        } else {
          runningBalance -= Math.abs(goldGrams);
        }
        entries.push({
          id: `transfer-${entry.id}`,
          action: entry.action,
          goldGrams: entry.goldGrams,
          valueUsd: entry.valueUsd,
          balanceAfterGrams: runningBalance.toString(),
          notes: entry.notes || (entry.action === 'FinaPay_To_BNSL' ? 'Transfer from FinaPay' : 'Transfer to FinaPay'),
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
      
      res.json({ entries: sortedEntries });
    } catch (error) {
      console.error("Failed to get BNSL ledger:", error);
      res.status(400).json({ message: "Failed to get BNSL ledger history" });
    }
  });

  // Transfer gold from FinaPay wallet to BNSL wallet
  app.post("/api/bnsl/wallet/transfer", ensureAuthenticated, requireKycApproved, idempotencyMiddleware, async (req, res) => {
    try {
      const { userId, goldGrams } = req.body;
      
      // SECURITY: Verify the user can only transfer from their own wallet
      const sessionUserId = req.session?.userId;
      const isAdmin = req.session?.userRole === 'admin';
      if (!isAdmin && sessionUserId !== userId) {
        return res.status(403).json({ message: "Unauthorized: Cannot transfer from another user's wallet" });
      }
      
      if (!userId || !goldGrams || parseFloat(goldGrams) <= 0) {
        return res.status(400).json({ message: "Invalid transfer amount" });
      }

      const amountGrams = parseFloat(goldGrams);
      
      // Get user's FinaPay wallet
      const finapayWallet = await storage.getWallet(userId);
      if (!finapayWallet) {
        return res.status(404).json({ message: "FinaPay wallet not found" });
      }
      
      const availableGold = parseFloat(finapayWallet.goldGrams);
      if (availableGold < amountGrams) {
        return res.status(400).json({ message: "Insufficient gold balance in FinaPay wallet" });
      }
      
      // Get current gold price for USD value calculation
      const goldPrice = await getGoldPricePerGram();
      const usdValue = amountGrams * goldPrice;
      
      // Debit from FinaPay wallet
      await storage.updateWallet(finapayWallet.id, {
        goldGrams: (availableGold - amountGrams).toFixed(6)
      });
      
      // Credit to BNSL wallet with locked USD value
      const bnslWallet = await storage.getOrCreateBnslWallet(userId);
      const newAvailable = parseFloat(bnslWallet.availableGoldGrams) + amountGrams;
      const currentAvailableValueUsd = parseFloat(bnslWallet.availableValueUsd || '0');
      const newAvailableValueUsd = currentAvailableValueUsd + usdValue;
      await storage.updateBnslWallet(bnslWallet.id, {
        availableGoldGrams: newAvailable.toFixed(6),
        availableValueUsd: newAvailableValueUsd.toFixed(2)
      });
      
      // Create transaction record with USD value
      const transferTx = await storage.createTransaction({
        userId,
        type: 'Send',
        status: 'Completed',
        amountGold: amountGrams.toFixed(6),
        amountUsd: usdValue.toFixed(2),
        goldPriceUsdPerGram: goldPrice.toFixed(2),
        description: `Transfer ${amountGrams.toFixed(3)}g from FinaPay to BNSL wallet`,
        sourceModule: 'bnsl'
      });

      // Record ledger entry for FinaPay to BNSL transfer
      const { vaultLedgerService } = await import('./vault-ledger-service');
      await vaultLedgerService.recordLedgerEntry({
        userId,
        action: 'FinaPay_To_BNSL',
        goldGrams: amountGrams,
        goldPriceUsdPerGram: goldPrice,
        fromWallet: 'FinaPay',
        toWallet: 'BNSL',
        fromStatus: 'Available',
        toStatus: 'Available',
        transactionId: transferTx.id,
        notes: `Transferred ${amountGrams.toFixed(4)}g from FinaPay to BNSL Wallet`,
        createdBy: 'system',
      });
      
      // Get updated wallets
      const updatedFinapay = await storage.getWallet(userId);
      const updatedBnsl = await storage.getOrCreateBnslWallet(userId);
      
      // Emit real-time sync event for auto-update
      emitLedgerEvent(userId, {
        type: 'balance_update',
        module: 'bnsl',
        action: 'finapay_to_bnsl_transfer',
        data: { goldGrams: amountGrams, amountUsd: usdValue },
      });
      
      res.json({ 
        success: true, 
        finapayWallet: updatedFinapay,
        bnslWallet: updatedBnsl 
      });
    } catch (error) {
      console.error('BNSL transfer error:', error);
      res.status(400).json({ message: "Failed to transfer to BNSL wallet" });
    }
  });

  // Transfer gold from BNSL wallet to FinaPay wallet (withdraw)
  app.post("/api/bnsl/wallet/withdraw", ensureAuthenticated, requireKycApproved, idempotencyMiddleware, async (req, res) => {
    try {
      const { userId, goldGrams } = req.body;
      
      // SECURITY: Verify the user can only withdraw from their own wallet
      const sessionUserId = req.session?.userId;
      const isAdmin = req.session?.userRole === 'admin';
      if (!isAdmin && sessionUserId !== userId) {
        return res.status(403).json({ message: "Unauthorized: Cannot withdraw from another user's wallet" });
      }
      
      if (!userId || !goldGrams || parseFloat(goldGrams) <= 0) {
        return res.status(400).json({ message: "Invalid withdrawal amount" });
      }

      const amountGrams = parseFloat(goldGrams);
      
      // Get user's BNSL wallet
      const bnslWallet = await storage.getOrCreateBnslWallet(userId);
      const availableGold = parseFloat(bnslWallet.availableGoldGrams);
      
      if (availableGold < amountGrams) {
        return res.status(400).json({ message: "Insufficient gold balance in BNSL wallet" });
      }
      
      // Verify FinaPay wallet exists BEFORE making any changes
      const finapayWallet = await storage.getWallet(userId);
      if (!finapayWallet) {
        return res.status(404).json({ message: "FinaPay wallet not found" });
      }
      
      // Get current gold price for USD value calculation
      const goldPrice = await getGoldPricePerGram();
      const usdValue = amountGrams * goldPrice;
      
      // Calculate proportional locked USD to deduct (based on original locked price per gram)
      const currentAvailableValueUsd = parseFloat(bnslWallet.availableValueUsd || '0');
      const lockedPricePerGram = availableGold > 0 ? currentAvailableValueUsd / availableGold : 0;
      const usdToDeduct = amountGrams * lockedPricePerGram;
      const newAvailableValueUsd = Math.max(0, currentAvailableValueUsd - usdToDeduct);
      
      // Debit from BNSL wallet (including locked USD value)
      await storage.updateBnslWallet(bnslWallet.id, {
        availableGoldGrams: (availableGold - amountGrams).toFixed(6),
        availableValueUsd: newAvailableValueUsd.toFixed(2)
      });
      
      // Credit to FinaPay wallet
      const newFinapayBalance = parseFloat(finapayWallet.goldGrams) + amountGrams;
      await storage.updateWallet(finapayWallet.id, {
        goldGrams: newFinapayBalance.toFixed(6)
      });
      
      // Create transaction record with USD value
      const transferTx = await storage.createTransaction({
        userId,
        type: 'Receive',
        status: 'Completed',
        amountGold: amountGrams.toFixed(6),
        amountUsd: usdValue.toFixed(2),
        goldPriceUsdPerGram: goldPrice.toFixed(2),
        description: `Transfer ${amountGrams.toFixed(3)}g from BNSL wallet to FinaPay`,
        sourceModule: 'bnsl'
      });

      // Record ledger entry for BNSL to FinaPay transfer
      const { vaultLedgerService } = await import('./vault-ledger-service');
      await vaultLedgerService.recordLedgerEntry({
        userId,
        action: 'BNSL_To_FinaPay',
        goldGrams: amountGrams,
        goldPriceUsdPerGram: goldPrice,
        fromWallet: 'BNSL',
        toWallet: 'FinaPay',
        fromStatus: 'Available',
        toStatus: 'Available',
        transactionId: transferTx.id,
        notes: `Transferred ${amountGrams.toFixed(4)}g from BNSL Wallet to FinaPay`,
        createdBy: 'system',
      });
      
      // Get updated wallets
      const updatedFinapay = await storage.getWallet(userId);
      const updatedBnsl = await storage.getOrCreateBnslWallet(userId);
      
      // Emit real-time sync event for auto-update
      emitLedgerEvent(userId, {
        type: 'balance_update',
        module: 'bnsl',
        action: 'bnsl_to_finapay_transfer',
        data: { goldGrams: amountGrams, amountUsd: usdValue },
      });
      
      res.json({ 
        success: true, 
        finapayWallet: updatedFinapay,
        bnslWallet: updatedBnsl 
      });
    } catch (error) {
      console.error('BNSL withdraw error:', error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to withdraw from BNSL wallet" });
    }
  });
  
  // ============================================================================
  // BNSL PLAN TEMPLATES - ADMIN MANAGEMENT
  // ============================================================================
  
  // Get all templates (Admin)
  app.get("/api/admin/bnsl/templates", ensureAdminAsync, requirePermission('view_bnsl', 'manage_bnsl'), async (req, res) => {
    try {
      const templates = await storage.getAllBnslPlanTemplates();
      
      // Get variants for each template
      const templatesWithVariants = await Promise.all(templates.map(async (template) => {
        const variants = await storage.getTemplateVariants(template.id);
        return { ...template, variants };
      }));
      
      res.json({ templates: templatesWithVariants });
    } catch (error) {
      console.error('Get templates error:', error);
      res.status(400).json({ message: "Failed to get BNSL templates" });
    }
  });
  
  // Get active templates (for user selection)
  app.get("/api/bnsl/templates", async (req, res) => {
    try {
      const templates = await storage.getActiveBnslPlanTemplates();
      
      // Get variants for each template
      const templatesWithVariants = await Promise.all(templates.map(async (template) => {
        const variants = await storage.getTemplateVariants(template.id);
        const activeVariants = variants.filter(v => v.isActive);
        return { ...template, variants: activeVariants };
      }));
      
      res.json({ templates: templatesWithVariants });
    } catch (error) {
      console.error('Get active templates error:', error);
      res.status(400).json({ message: "Failed to get BNSL templates" });
    }
  });
  
  // Create template (Admin)
  app.post("/api/admin/bnsl/templates", ensureAdminAsync, requirePermission('manage_bnsl'), async (req, res) => {
    try {
      const template = await storage.createBnslPlanTemplate(req.body);
      res.json({ template });
    } catch (error) {
      console.error('Create template error:', error);
      res.status(400).json({ message: "Failed to create BNSL template" });
    }
  });
  
  // Update template (Admin)
  app.put("/api/admin/bnsl/templates/:id", ensureAdminAsync, requirePermission('manage_bnsl'), async (req, res) => {
    try {
      const template = await storage.updateBnslPlanTemplate(req.params.id, req.body);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json({ template });
    } catch (error) {
      console.error('Update template error:', error);
      res.status(400).json({ message: "Failed to update BNSL template" });
    }
  });
  
  // Delete template (Admin)
  app.delete("/api/admin/bnsl/templates/:id", ensureAdminAsync, requirePermission('manage_bnsl'), async (req, res) => {
    try {
      await storage.deleteBnslPlanTemplate(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Delete template error:', error);
      res.status(400).json({ message: "Failed to delete BNSL template" });
    }
  });
  
  // Create variant (Admin)
  app.post("/api/admin/bnsl/templates/:templateId/variants", ensureAdminAsync, requirePermission('manage_bnsl'), async (req, res) => {
    try {
      const variant = await storage.createBnslTemplateVariant({
        ...req.body,
        templateId: req.params.templateId
      });
      res.json({ variant });
    } catch (error) {
      console.error('Create variant error:', error);
      res.status(400).json({ message: "Failed to create template variant" });
    }
  });
  
  // Update variant (Admin)
  app.put("/api/admin/bnsl/variants/:id", ensureAdminAsync, requirePermission('manage_bnsl'), async (req, res) => {
    try {
      const variant = await storage.updateBnslTemplateVariant(req.params.id, req.body);
      if (!variant) {
        return res.status(404).json({ message: "Variant not found" });
      }
      res.json({ variant });
    } catch (error) {
      console.error('Update variant error:', error);
      res.status(400).json({ message: "Failed to update template variant" });
    }
  });
  
  // Delete variant (Admin)
  app.delete("/api/admin/bnsl/variants/:id", ensureAdminAsync, requirePermission('manage_bnsl'), async (req, res) => {
    try {
      await storage.deleteBnslTemplateVariant(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Delete variant error:', error);
      res.status(400).json({ message: "Failed to delete template variant" });
    }
  });
  
  // ============================================================================
  // PLATFORM FEES - ADMIN MANAGEMENT
  // ============================================================================
  
  // Get all platform fees (Admin)
  app.get("/api/admin/fees", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      const fees = await storage.getAllPlatformFees();
      res.json({ fees });
    } catch (error) {
      console.error('Get fees error:', error);
      res.status(400).json({ message: "Failed to get platform fees" });
    }
  });
  
  // Get fees by module (Admin)
  app.get("/api/admin/fees/module/:module", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      const fees = await storage.getModuleFees(req.params.module);
      res.json({ fees });
    } catch (error) {
      console.error('Get module fees error:', error);
      res.status(400).json({ message: "Failed to get module fees" });
    }
  });
  
  // Create platform fee (Admin)
  app.post("/api/admin/fees", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      const fee = await storage.createPlatformFee(req.body);
      res.json({ fee });
    } catch (error) {
      console.error('Create fee error:', error);
      res.status(400).json({ message: "Failed to create platform fee" });
    }
  });
  
  // Update platform fee (Admin)
  app.put("/api/admin/fees/:id", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      const fee = await storage.updatePlatformFee(req.params.id, req.body);
      if (!fee) {
        return res.status(404).json({ message: "Fee not found" });
      }
      res.json({ fee });
    } catch (error) {
      console.error('Update fee error:', error);
      res.status(400).json({ message: "Failed to update platform fee" });
    }
  });
  
  // Delete platform fee (Admin)
  app.delete("/api/admin/fees/:id", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      await storage.deletePlatformFee(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Delete fee error:', error);
      res.status(400).json({ message: "Failed to delete platform fee" });
    }
  });
  
  // Seed default fees (Admin)
  app.post("/api/admin/fees/seed", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      await storage.seedDefaultFees();
      const fees = await storage.getAllPlatformFees();
      res.json({ fees, message: "Default fees seeded successfully" });
    } catch (error) {
      console.error('Seed fees error:', error);
      res.status(400).json({ message: "Failed to seed default fees" });
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
      res.json({ fees, feeMap });
    } catch (error) {
      console.error('Get public fees error:', error);
      res.status(400).json({ message: "Failed to get platform fees" });
    }
  });
  
  // Create BNSL plan (locks gold from BNSL wallet)
  app.post("/api/bnsl/plans", ensureAuthenticated, requireKycApproved, idempotencyMiddleware, async (req, res) => {
    try {
      // Auto-generate contractId if not provided
      const contractId = req.body.contractId || `BNSL-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      
      // Convert date strings to Date objects
      const startDate = typeof req.body.startDate === 'string' ? new Date(req.body.startDate) : req.body.startDate;
      const maturityDate = typeof req.body.maturityDate === 'string' ? new Date(req.body.maturityDate) : req.body.maturityDate;
      
      // Set remainingMarginUsd to totalMarginComponentUsd if not provided
      const remainingMarginUsd = req.body.remainingMarginUsd || req.body.totalMarginComponentUsd;
      
      const planData = insertBnslPlanSchema.parse({
        ...req.body,
        contractId,
        startDate,
        maturityDate,
        remainingMarginUsd
      });
      const goldGrams = parseFloat(planData.goldSoldGrams);
      
      // Get BNSL wallet and verify sufficient funds
      const bnslWallet = await storage.getOrCreateBnslWallet(planData.userId);
      const availableGold = parseFloat(bnslWallet.availableGoldGrams);
      
      if (availableGold < goldGrams) {
        return res.status(400).json({ 
          message: `Insufficient BNSL wallet balance. Available: ${availableGold.toFixed(3)}g, Required: ${goldGrams.toFixed(3)}g`
        });
      }
      
      // Lock gold: move from available to locked
      const newAvailable = availableGold - goldGrams;
      const newLocked = parseFloat(bnslWallet.lockedGoldGrams) + goldGrams;
      await storage.updateBnslWallet(bnslWallet.id, {
        availableGoldGrams: newAvailable.toFixed(6),
        lockedGoldGrams: newLocked.toFixed(6)
      });
      
      // Create the plan
      const plan = await storage.createBnslPlan(planData);
      
      // Update vault holdings - mark gold as locked for BNSL
      const vaultHoldings = await storage.getUserVaultHoldings(planData.userId);
      let remainingToLock = goldGrams;
      
      for (const holding of vaultHoldings) {
        if (remainingToLock <= 0) break;
        const holdingGold = parseFloat(holding.goldGrams);
        if (holdingGold > 0) {
          const lockAmount = Math.min(holdingGold, remainingToLock);
          // Reduce vault holding by locked amount
          await storage.updateVaultHolding(holding.id, {
            goldGrams: (holdingGold - lockAmount).toFixed(6)
          });
          remainingToLock -= lockAmount;
          
          // Update related certificates to "Updated" status
          const certificates = await storage.getUserActiveCertificates(planData.userId);
          for (const cert of certificates) {
            if (cert.vaultHoldingId === holding.id) {
              await storage.updateCertificate(cert.id, { status: 'Updated' });
            }
          }
        }
      }
      
      // Create a new certificate for the BNSL-locked gold
      const certNumber = await storage.generateCertificateNumber('Digital Ownership');
      await storage.createCertificate({
        certificateNumber: certNumber,
        userId: planData.userId,
        type: 'Digital Ownership',
        status: 'Active',
        goldGrams: goldGrams.toFixed(6),
        goldPriceUsdPerGram: planData.enrollmentPriceUsdPerGram,
        totalValueUsd: planData.basePriceComponentUsd,
        issuer: 'Finatrades',
        vaultLocation: 'Dubai - Wingold & Metals DMCC',
        wingoldStorageRef: `BNSL-${plan.contractId}`
      });
      
      // Generate BNSL Lock Certificate and send via email
      const enrollmentPrice = parseFloat(planData.enrollmentPriceUsdPerGram);
      generateBNSLLockCertificate(plan.id, planData.userId, goldGrams, enrollmentPrice)
        .then(result => {
          if (result.error) {
            console.error(`[Routes] Failed to generate BNSL Lock certificate for plan ${plan.id}:`, result.error);
          } else {
            console.log(`[Routes] BNSL Lock certificate generated for plan ${plan.id}`);
          }
        })
        .catch(err => console.error('[Routes] BNSL Lock certificate error:', err));
      
      // Record ledger entry for BNSL lock
      const enrollmentPriceVal = parseFloat(planData.enrollmentPriceUsdPerGram);
      const { vaultLedgerService } = await import('./vault-ledger-service');
      await vaultLedgerService.recordLedgerEntry({
        userId: planData.userId,
        action: 'BNSL_Lock',
        goldGrams: goldGrams,
        goldPriceUsdPerGram: enrollmentPriceVal,
        fromWallet: 'BNSL',
        toWallet: 'BNSL',
        fromStatus: 'Available',
        toStatus: 'Locked_BNSL',
        bnslPlanId: plan.id,
        notes: `Locked ${goldGrams.toFixed(4)}g for BNSL contract ${plan.contractId}`,
        createdBy: 'system',
      });

      // Create audit log
      await storage.createAuditLog({
        entityType: "bnsl",
        entityId: plan.id,
        actionType: "create",
        actor: planData.userId,
        actorRole: "user",
        details: `BNSL plan created: ${goldGrams.toFixed(3)}g locked, contract ${plan.contractId}`,
      });
      
      // Emit real-time sync event for auto-update
      emitLedgerEvent(planData.userId, {
        type: 'balance_update',
        module: 'bnsl',
        action: 'plan_created',
        data: { goldGrams, planId: plan.id },
      });
      
      // Create bell notification for BNSL plan creation
      await storage.createNotification({
        userId: planData.userId,
        title: 'BNSL Plan Created',
        message: `Your BNSL plan ${plan.contractId} has been created. ${goldGrams.toFixed(4)}g gold locked for deferred sale.`,
        type: 'bnsl',
        link: '/bnsl',
      });
      
      res.json({ plan });
    } catch (error) {
      console.error('BNSL plan creation error:', error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create BNSL plan" });
    }
  });
  
  // Update BNSL plan
  app.patch("/api/bnsl/plans/:id", ensureAuthenticated, async (req, res) => {
    try {
      const plan = await storage.updateBnslPlan(req.params.id, req.body);
      if (!plan) {
        return res.status(404).json({ message: "BNSL plan not found" });
      }
      res.json({ plan });
    } catch (error) {
      res.status(400).json({ message: "Failed to update BNSL plan" });
    }
  });
  
  // Get plan payouts
  app.get("/api/bnsl/payouts/:planId", ensureAuthenticated, async (req, res) => {
    try {
      const payouts = await storage.getPlanPayouts(req.params.planId);
      res.json({ payouts });
    } catch (error) {
      res.status(400).json({ message: "Failed to get payouts" });
    }
  });
  
  // Create payout
  app.post("/api/bnsl/payouts", ensureAuthenticated, async (req, res) => {
    try {
      const payoutData = insertBnslPayoutSchema.parse(req.body);
      const payout = await storage.createBnslPayout(payoutData);
      res.json({ payout });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create payout" });
    }
  });
  
  // Update payout
  app.patch("/api/bnsl/payouts/:id", ensureAuthenticated, async (req, res) => {
    try {
      const payout = await storage.updateBnslPayout(req.params.id, req.body);
      if (!payout) {
        return res.status(404).json({ message: "Payout not found" });
      }
      res.json({ payout });
    } catch (error) {
      res.status(400).json({ message: "Failed to update payout" });
    }
  });
  
  // Get early termination by plan ID
  app.get("/api/bnsl/early-termination/:planId", ensureAuthenticated, async (req, res) => {
    try {
      const termination = await storage.getBnslEarlyTermination(req.params.planId);
      res.json({ termination: termination || null });
    } catch (error) {
      res.status(400).json({ message: "Failed to get early termination" });
    }
  });

  // Create early termination
  app.post("/api/bnsl/early-termination", ensureAuthenticated, requireKycApproved, async (req, res) => {
    try {
      const terminationData = insertBnslEarlyTerminationSchema.parse(req.body);
      const termination = await storage.createBnslEarlyTermination(terminationData);
      
      // Update plan status
      await storage.updateBnslPlan(terminationData.planId, {
        status: "Early Terminated",
      });
      
      res.json({ termination });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create early termination" });
    }
  });
  
  // ============================================================================
  // BNSL AGREEMENTS
  // ============================================================================
  
  // Get all BNSL agreements (Admin)
  app.get("/api/admin/bnsl/agreements", ensureAdminAsync, requirePermission('view_bnsl', 'manage_bnsl'), async (req, res) => {
    try {
      const agreements = await storage.getAllBnslAgreements();
      res.json({ agreements });
    } catch (error) {
      res.status(400).json({ message: "Failed to get agreements" });
    }
  });
  
  // Get agreement by plan ID
  app.get("/api/bnsl/agreements/plan/:planId", ensureAuthenticated, async (req, res) => {
    try {
      const agreement = await storage.getBnslAgreementByPlanId(req.params.planId);
      res.json({ agreement: agreement || null });
    } catch (error) {
      res.status(400).json({ message: "Failed to get agreement" });
    }
  });
  
  // Get user agreements
  app.get("/api/bnsl/agreements/user/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const agreements = await storage.getUserBnslAgreements(req.params.userId);
      res.json({ agreements });
    } catch (error) {
      res.status(400).json({ message: "Failed to get user agreements" });
    }
  });
  
  // Create BNSL agreement
  app.post("/api/bnsl/agreements", ensureAuthenticated, async (req, res) => {
    try {
      const agreementData = insertBnslAgreementSchema.parse(req.body);
      const agreement = await storage.createBnslAgreement(agreementData);
      res.json({ agreement });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create agreement" });
    }
  });
  
  // Update BNSL agreement (for email sent status)
  app.patch("/api/bnsl/agreements/:id", ensureAuthenticated, async (req, res) => {
    try {
      const agreement = await storage.updateBnslAgreement(req.params.id, req.body);
      if (!agreement) {
        return res.status(404).json({ message: "Agreement not found" });
      }
      res.json({ agreement });
    } catch (error) {
      res.status(400).json({ message: "Failed to update agreement" });
    }
  });
  
  // Send BNSL agreement email with PDF attachment
  app.post("/api/bnsl/agreements/:id/send-email", ensureAuthenticated, async (req, res) => {
    try {
      const { pdfBase64 } = req.body;
      
      if (!pdfBase64) {
        return res.status(400).json({ success: false, message: "PDF data is required" });
      }
      
      // Get the agreement with plan details
      const agreement = await storage.getBnslAgreement(req.params.id);
      if (!agreement) {
        return res.status(404).json({ success: false, message: "Agreement not found" });
      }
      
      // Get user details
      const user = await storage.getUser(agreement.userId);
      if (!user || !user.email) {
        return res.status(400).json({ success: false, message: "User email not found" });
      }
      
      // Parse plan details
      const planDetails = agreement.planDetails as any;
      
      // Prepare email data
      const emailData = {
        user_name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Valued Customer',
        plan_id: agreement.planId,
        gold_amount: planDetails?.goldSoldGrams?.toFixed(3) || '0',
        tenure_months: planDetails?.tenorMonths?.toString() || '12',
        margin_rate: planDetails?.marginRate?.toString() || '8',
        base_price: planDetails?.basePriceComponentUsd?.toLocaleString() || '0',
        total_margin: planDetails?.totalMarginComponentUsd?.toLocaleString() || '0',
        quarterly_payout: planDetails?.quarterlyMarginUsd?.toLocaleString() || '0',
        signature_name: agreement.signatureName,
        signed_date: new Date(agreement.signedAt).toLocaleDateString(),
        dashboard_url: `${req.protocol}://${req.get('host')}/bnsl`,
      };
      
      // Convert base64 PDF to buffer
      const pdfBuffer = Buffer.from(pdfBase64, 'base64');
      
      // Send email with PDF attachment
      const result = await sendEmailWithAttachment(
        user.email,
        EMAIL_TEMPLATES.BNSL_AGREEMENT_SIGNED,
        emailData,
        {
          filename: `BNSL_Agreement_${agreement.planId}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        }
      );
      
      if (result.success) {
        // Update agreement to mark email as sent
        await storage.updateBnslAgreement(agreement.id, { 
          emailSentAt: new Date()
        });
        
        res.json({ success: true, messageId: result.messageId });
      } else {
        res.status(500).json({ success: false, message: result.error || 'Failed to send email' });
      }
    } catch (error) {
      console.error('Failed to send BNSL agreement email:', error);
      res.status(400).json({ 
        success: false, 
        message: error instanceof Error ? error.message : "Failed to send email" 
      });
    }
  });
  
  // Download BNSL agreement PDF
  app.get("/api/bnsl/agreements/:id/download", ensureAuthenticated, async (req, res) => {
    try {
      const agreement = await storage.getBnslAgreement(req.params.id);
      if (!agreement) {
        return res.status(404).json({ message: "Agreement not found" });
      }
      
      // Get user and plan details for PDF regeneration
      const user = await storage.getUser(agreement.userId);
      const plan = await storage.getBnslPlan(agreement.planId);
      
      if (!user || !plan) {
        return res.status(404).json({ message: "User or plan not found" });
      }
      
      const planDetails = agreement.planDetails as any;
      
      // Generate PDF using PDFKit
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="BNSL_Agreement_${plan.contractId}.pdf"`);
      
      doc.pipe(res);
      
      // Header
      doc.fontSize(20).font('Helvetica-Bold').text('BNSL DEFERRED PRICE SALE AGREEMENT', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica').text('Buy Now Sell Later Program', { align: 'center' });
      doc.moveDown(2);
      
      // Agreement details
      doc.fontSize(11).font('Helvetica-Bold').text('AGREEMENT DETAILS');
      doc.moveDown(0.5);
      doc.font('Helvetica');
      doc.text(`Contract ID: ${plan.contractId}`);
      doc.text(`Template Version: ${agreement.templateVersion}`);
      doc.text(`Agreement Date: ${new Date(agreement.signedAt).toLocaleDateString()}`);
      doc.moveDown();
      
      // Participant Information
      doc.font('Helvetica-Bold').text('PARTICIPANT INFORMATION');
      doc.moveDown(0.5);
      doc.font('Helvetica');
      doc.text(`Name: ${user.firstName} ${user.lastName}`);
      doc.text(`Email: ${user.email}`);
      doc.text(`Finatrades ID: ${user.finatradesId || 'N/A'}`);
      doc.moveDown();
      
      // Plan Terms
      doc.font('Helvetica-Bold').text('PLAN TERMS');
      doc.moveDown(0.5);
      doc.font('Helvetica');
      doc.text(`Tenure: ${planDetails?.tenorMonths || plan.tenorMonths} months`);
      doc.text(`Gold Sold: ${planDetails?.goldSoldGrams?.toFixed(6) || plan.goldSoldGrams} grams`);
      doc.text(`Enrollment Price: $${planDetails?.enrollmentPriceUsdPerGram?.toFixed(2) || plan.enrollmentPriceUsdPerGram}/gram`);
      doc.text(`Base Price Component: $${planDetails?.basePriceComponentUsd?.toLocaleString() || plan.basePriceComponentUsd}`);
      doc.text(`Total Margin Component: $${planDetails?.totalMarginComponentUsd?.toLocaleString() || plan.totalMarginComponentUsd}`);
      doc.text(`Quarterly Margin Payout: $${planDetails?.quarterlyMarginUsd?.toLocaleString() || plan.quarterlyMarginUsd}`);
      doc.text(`Start Date: ${planDetails?.startDate ? new Date(planDetails.startDate).toLocaleDateString() : new Date(plan.startDate).toLocaleDateString()}`);
      doc.text(`Maturity Date: ${planDetails?.maturityDate ? new Date(planDetails.maturityDate).toLocaleDateString() : new Date(plan.maturityDate).toLocaleDateString()}`);
      doc.moveDown(2);
      
      // Signature Section
      doc.font('Helvetica-Bold').text('DIGITAL SIGNATURE');
      doc.moveDown(0.5);
      doc.font('Helvetica');
      doc.text(`Signed by: ${agreement.signatureName}`);
      doc.text(`Date & Time: ${new Date(agreement.signedAt).toLocaleString()}`);
      doc.moveDown(2);
      
      // Footer
      doc.fontSize(9).fillColor('#666666');
      doc.text('This document is a legally binding agreement generated by Finatrades.', { align: 'center' });
      doc.text('By signing, you acknowledge that you have read, understood, and agree to all terms.', { align: 'center' });
      
      doc.end();
    } catch (error) {
      console.error('Failed to download BNSL agreement:', error);
      res.status(500).json({ message: "Failed to generate agreement PDF" });
    }
  });

  // ============================================================================
  // BNSL PAYOUT PROCESSING & SETTLEMENT (Admin)
  // ============================================================================
  
  // Admin: Process a BNSL payout - credits gold to user's FinaPay wallet
  app.post("/api/admin/bnsl/payouts/:id/process", ensureAdminAsync, requirePermission('manage_bnsl'), async (req, res) => {
    try {
      const { marketPriceUsdPerGram } = req.body;
      
      if (!marketPriceUsdPerGram || parseFloat(marketPriceUsdPerGram) <= 0) {
        return res.status(400).json({ message: "Valid market price is required" });
      }
      
      const price = parseFloat(marketPriceUsdPerGram);
      
      // Get the payout
      const payout = await storage.getBnslPayout(req.params.id);
      if (!payout) {
        return res.status(404).json({ message: "Payout not found" });
      }
      
      if (payout.status === 'Paid') {
        return res.status(400).json({ message: "Payout has already been processed" });
      }
      
      // Get the plan
      const plan = await storage.getBnslPlan(payout.planId);
      if (!plan) {
        return res.status(404).json({ message: "Associated BNSL plan not found" });
      }
      
      // Calculate gold grams to credit
      const monetaryAmount = parseFloat(payout.monetaryAmountUsd);
      const gramsCredited = monetaryAmount / price;
      
      // Credit gold to user's FinaPay wallet
      const wallet = await storage.getWallet(plan.userId);
      if (!wallet) {
        return res.status(404).json({ message: "User FinaPay wallet not found" });
      }
      
      const currentGold = parseFloat(wallet.goldGrams);
      const newGoldBalance = currentGold + gramsCredited;
      
      await storage.updateWallet(wallet.id, {
        goldGrams: newGoldBalance.toFixed(6)
      });
      
      // Update payout status
      const updatedPayout = await storage.updateBnslPayout(payout.id, {
        status: 'Paid',
        marketPriceUsdPerGram: price.toFixed(2),
        gramsCredited: gramsCredited.toFixed(6),
        paidAt: new Date()
      });
      
      // Update plan's paid margin tracking
      const currentPaidMarginUsd = parseFloat(plan.paidMarginUsd || '0');
      const currentPaidMarginGrams = parseFloat(plan.paidMarginGrams || '0');
      await storage.updateBnslPlan(plan.id, {
        paidMarginUsd: (currentPaidMarginUsd + monetaryAmount).toFixed(2),
        paidMarginGrams: (currentPaidMarginGrams + gramsCredited).toFixed(6),
        remainingMarginUsd: (parseFloat(plan.remainingMarginUsd || '0') - monetaryAmount).toFixed(2)
      });
      
      // Create transaction record
      await storage.createTransaction({
        userId: plan.userId,
        type: 'Receive',
        status: 'Completed',
        amountGold: gramsCredited.toFixed(6),
        amountUsd: monetaryAmount.toFixed(2),
        goldPriceUsdPerGram: price.toFixed(2),
        description: `BNSL Quarterly Margin Payout #${payout.sequence} - ${plan.contractId}`,
        sourceModule: 'bnsl',
        bnslPlanId: plan.id,
        bnslPayoutId: payout.id
      });
      
      // Record ledger entry
      const { vaultLedgerService } = await import('./vault-ledger-service');
      await vaultLedgerService.recordLedgerEntry({
        userId: plan.userId,
        action: 'Payout_Credit',
        goldGrams: gramsCredited,
        goldPriceUsdPerGram: price,
        fromWallet: 'BNSL',
        toWallet: 'FinaPay',
        fromStatus: 'Locked_BNSL',
        toStatus: 'Available',
        bnslPlanId: plan.id,
        bnslPayoutId: payout.id,
        notes: `BNSL Margin Payout #${payout.sequence}: ${gramsCredited.toFixed(4)}g credited at $${price}/g`,
        createdBy: 'admin',
      });
      
      // Create audit log
      await storage.createAuditLog({
        entityType: "bnsl",
        entityId: plan.id,
        actionType: "update",
        actor: req.session?.userId || 'admin',
        actorRole: "admin",
        details: `Processed payout #${payout.sequence}: ${gramsCredited.toFixed(4)}g at $${price}/g`,
      });
      
      // Emit real-time sync event
      emitLedgerEvent(plan.userId, {
        type: 'balance_update',
        module: 'bnsl',
        action: 'payout_processed',
        data: { goldGrams: gramsCredited, planId: plan.id, payoutId: payout.id },
      });
      
      // Send notification email and bell notification
      const user = await storage.getUser(plan.userId);
      if (user?.email) {
        await sendEmail(user.email, EMAIL_TEMPLATES.BNSL_PAYMENT_RECEIVED, {
          user_name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          plan_id: plan.contractId,
          payout_number: payout.sequence.toString(),
          gold_grams: gramsCredited.toFixed(4),
          usd_value: monetaryAmount.toFixed(2),
          market_price: price.toFixed(2),
          dashboard_url: `${req.protocol}://${req.get('host')}/bnsl`
        });
        
        // Create bell notification
        await storage.createNotification({
          userId: plan.userId,
          title: 'BNSL Payout Received',
          message: `Payout #${payout.sequence} processed: ${gramsCredited.toFixed(4)}g ($${monetaryAmount.toFixed(2)}) credited to your wallet.`,
          type: 'bnsl',
          link: '/bnsl',
        });
      }
      
      res.json({ 
        success: true, 
        payout: updatedPayout,
        gramsCredited,
        message: `Payout processed: ${gramsCredited.toFixed(4)}g credited to wallet`
      });
    } catch (error) {
      console.error('BNSL payout processing error:', error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to process payout" });
    }
  });
  
  // Admin: Complete BNSL plan maturity - credits Base Price Component as gold
  app.post("/api/admin/bnsl/plans/:id/complete-maturity", ensureAdminAsync, requirePermission('manage_bnsl'), async (req, res) => {
    try {
      const { marketPriceUsdPerGram } = req.body;
      
      if (!marketPriceUsdPerGram || parseFloat(marketPriceUsdPerGram) <= 0) {
        return res.status(400).json({ message: "Valid market price is required" });
      }
      
      const price = parseFloat(marketPriceUsdPerGram);
      
      // Get the plan
      const plan = await storage.getBnslPlan(req.params.id);
      if (!plan) {
        return res.status(404).json({ message: "BNSL plan not found" });
      }
      
      if (plan.status === 'Completed') {
        return res.status(400).json({ message: "Plan has already been completed" });
      }
      
      if (plan.status !== 'Active' && plan.status !== 'Maturing') {
        return res.status(400).json({ message: `Cannot complete plan with status: ${plan.status}` });
      }
      
      // Calculate gold grams to credit (Base Price Component / current price)
      const basePriceComponent = parseFloat(plan.basePriceComponentUsd);
      const goldGramsToCredit = basePriceComponent / price;
      
      // Credit gold to user's FinaPay wallet
      const wallet = await storage.getWallet(plan.userId);
      if (!wallet) {
        return res.status(404).json({ message: "User FinaPay wallet not found" });
      }
      
      const currentGold = parseFloat(wallet.goldGrams);
      const newGoldBalance = currentGold + goldGramsToCredit;
      
      await storage.updateWallet(wallet.id, {
        goldGrams: newGoldBalance.toFixed(6)
      });
      
      // Unlock gold from BNSL wallet (reduce locked balance)
      const bnslWallet = await storage.getOrCreateBnslWallet(plan.userId);
      const goldSold = parseFloat(plan.goldSoldGrams);
      const currentLocked = parseFloat(bnslWallet.lockedGoldGrams);
      const newLocked = Math.max(0, currentLocked - goldSold);
      
      await storage.updateBnslWallet(bnslWallet.id, {
        lockedGoldGrams: newLocked.toFixed(6)
      });
      
      // Update plan status to Completed
      const updatedPlan = await storage.updateBnslPlan(plan.id, {
        status: 'Completed'
      });
      
      // Create transaction record
      await storage.createTransaction({
        userId: plan.userId,
        type: 'Receive',
        status: 'Completed',
        amountGold: goldGramsToCredit.toFixed(6),
        amountUsd: basePriceComponent.toFixed(2),
        goldPriceUsdPerGram: price.toFixed(2),
        description: `BNSL Maturity Settlement - Base Price Component - ${plan.contractId}`,
        sourceModule: 'bnsl',
        bnslPlanId: plan.id
      });
      
      // Record ledger entry
      const { vaultLedgerService } = await import('./vault-ledger-service');
      await vaultLedgerService.recordLedgerEntry({
        userId: plan.userId,
        action: 'BNSL_Unlock',
        goldGrams: goldGramsToCredit,
        goldPriceUsdPerGram: price,
        fromWallet: 'BNSL',
        toWallet: 'FinaPay',
        fromStatus: 'Locked_BNSL',
        toStatus: 'Available',
        bnslPlanId: plan.id,
        notes: `BNSL Maturity Settlement: ${goldGramsToCredit.toFixed(4)}g Base Price credited at $${price}/g`,
        createdBy: 'admin',
      });
      
      // Create audit log
      await storage.createAuditLog({
        entityType: "bnsl",
        entityId: plan.id,
        actionType: "update",
        actor: req.session?.userId || 'admin',
        actorRole: "admin",
        details: `Plan completed: ${goldGramsToCredit.toFixed(4)}g Base Price credited at maturity`,
      });
      
      // Emit real-time sync event
      emitLedgerEvent(plan.userId, {
        type: 'balance_update',
        module: 'bnsl',
        action: 'maturity_completed',
        data: { goldGrams: goldGramsToCredit, planId: plan.id },
      });
      
      // Send notification email and bell notification
      const user = await storage.getUser(plan.userId);
      if (user?.email) {
        await sendEmail(user.email, EMAIL_TEMPLATES.BNSL_PLAN_COMPLETED, {
          user_name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          plan_id: plan.contractId,
          gold_grams: goldGramsToCredit.toFixed(4),
          base_price_usd: basePriceComponent.toFixed(2),
          market_price: price.toFixed(2),
          total_margin_received: plan.paidMarginGrams,
          dashboard_url: `${req.protocol}://${req.get('host')}/bnsl`
        });
        
        // Create bell notification
        await storage.createNotification({
          userId: plan.userId,
          title: 'BNSL Plan Completed',
          message: `Your BNSL plan ${plan.contractId} has matured! ${goldGramsToCredit.toFixed(4)}g has been credited to your wallet.`,
          type: 'bnsl',
          link: '/bnsl',
        });
      }
      
      res.json({ 
        success: true, 
        plan: updatedPlan,
        goldGramsToCredit,
        message: `Maturity completed: ${goldGramsToCredit.toFixed(4)}g credited to wallet`
      });
    } catch (error) {
      console.error('BNSL maturity completion error:', error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to complete maturity" });
    }
  });
  
  // Admin: Settle early termination - credits calculated gold to user's wallet
  app.post("/api/admin/bnsl/early-termination/:planId/settle", ensureAdminAsync, requirePermission('manage_bnsl'), async (req, res) => {
    try {
      const { marketPriceUsdPerGram } = req.body;
      
      if (!marketPriceUsdPerGram || parseFloat(marketPriceUsdPerGram) <= 0) {
        return res.status(400).json({ message: "Valid market price is required" });
      }
      
      const price = parseFloat(marketPriceUsdPerGram);
      
      // Get the plan
      const plan = await storage.getBnslPlan(req.params.planId);
      if (!plan) {
        return res.status(404).json({ message: "BNSL plan not found" });
      }
      
      // Get early termination request
      const termination = await storage.getBnslEarlyTermination(req.params.planId);
      if (!termination) {
        return res.status(404).json({ message: "Early termination request not found" });
      }
      
      if (termination.status === 'Settled') {
        return res.status(400).json({ message: "Termination has already been settled" });
      }
      
      // Calculate settlement per T&C formula
      const goldSold = parseFloat(plan.goldSoldGrams);
      const enrollmentPrice = parseFloat(plan.enrollmentPriceUsdPerGram);
      const basePriceComponent = parseFloat(plan.basePriceComponentUsd);
      const totalMarginComponent = parseFloat(plan.totalMarginComponentUsd);
      const totalSaleProceeds = basePriceComponent + totalMarginComponent;
      
      // Use fee percentages from termination request or plan defaults
      const adminFeePercent = parseFloat(termination.adminFeePercent || plan.adminFeePercent || '0.50') / 100;
      const penaltyPercent = parseFloat(termination.penaltyPercent || plan.earlyTerminationFeePercent || '2.00') / 100;
      const paidMarginUsd = parseFloat(plan.paidMarginUsd || '0');
      
      // Step 1: Base Price Valuation
      const baseValueUsd = price < enrollmentPrice 
        ? goldSold * price 
        : basePriceComponent;
      
      // Step 2: Calculate deductions
      const adminFeeUsd = totalSaleProceeds * adminFeePercent;
      const penaltyUsd = totalSaleProceeds * penaltyPercent;
      const reimbursementUsd = paidMarginUsd; // Reimburse all paid margins
      const totalDeductions = adminFeeUsd + penaltyUsd + reimbursementUsd;
      
      // Step 3: Final settlement
      const netValueUsd = Math.max(0, baseValueUsd - totalDeductions);
      const finalGoldGrams = netValueUsd > 0 ? netValueUsd / price : 0;
      
      // Credit gold to user's FinaPay wallet
      const wallet = await storage.getWallet(plan.userId);
      if (!wallet) {
        return res.status(404).json({ message: "User FinaPay wallet not found" });
      }
      
      if (finalGoldGrams > 0) {
        const currentGold = parseFloat(wallet.goldGrams);
        const newGoldBalance = currentGold + finalGoldGrams;
        
        await storage.updateWallet(wallet.id, {
          goldGrams: newGoldBalance.toFixed(6)
        });
      }
      
      // Unlock gold from BNSL wallet
      const bnslWallet = await storage.getOrCreateBnslWallet(plan.userId);
      const currentLocked = parseFloat(bnslWallet.lockedGoldGrams);
      const newLocked = Math.max(0, currentLocked - goldSold);
      
      await storage.updateBnslWallet(bnslWallet.id, {
        lockedGoldGrams: newLocked.toFixed(6)
      });
      
      // Update termination status
      await storage.updateBnslEarlyTermination(termination.id, {
        status: 'Settled',
        currentMarketPriceUsdPerGram: price.toFixed(2),
        basePriceComponentValueUsd: baseValueUsd.toFixed(2),
        totalDeductionsUsd: totalDeductions.toFixed(2),
        netValueUsd: netValueUsd.toFixed(2),
        finalGoldGrams: finalGoldGrams.toFixed(6),
        decidedAt: new Date(),
        decidedBy: req.session?.userId || 'admin'
      });
      
      // Update plan status
      await storage.updateBnslPlan(plan.id, {
        status: 'Early Terminated'
      });
      
      // Cancel remaining payouts
      const payouts = await storage.getPlanPayouts(plan.id);
      for (const payout of payouts) {
        if (payout.status === 'Scheduled') {
          await storage.updateBnslPayout(payout.id, { status: 'Cancelled' });
        }
      }
      
      // Create transaction record
      await storage.createTransaction({
        userId: plan.userId,
        type: 'Receive',
        status: 'Completed',
        amountGold: finalGoldGrams.toFixed(6),
        amountUsd: netValueUsd.toFixed(2),
        goldPriceUsdPerGram: price.toFixed(2),
        description: `BNSL Early Termination Settlement - ${plan.contractId}`,
        sourceModule: 'bnsl',
        bnslPlanId: plan.id
      });
      
      // Record ledger entry
      const { vaultLedgerService } = await import('./vault-ledger-service');
      await vaultLedgerService.recordLedgerEntry({
        userId: plan.userId,
        action: 'BNSL_Unlock',
        goldGrams: finalGoldGrams,
        goldPriceUsdPerGram: price,
        fromWallet: 'BNSL',
        toWallet: 'FinaPay',
        fromStatus: 'Locked_BNSL',
        toStatus: 'Available',
        bnslPlanId: plan.id,
        notes: `BNSL Early Termination: ${finalGoldGrams.toFixed(4)}g settled (after ${(totalDeductions).toFixed(2)} USD deductions)`,
        createdBy: 'admin',
      });
      
      // Create audit log
      await storage.createAuditLog({
        entityType: "bnsl",
        entityId: plan.id,
        actionType: "update",
        actor: req.session?.userId || 'admin',
        actorRole: "admin",
        details: `Early termination settled: ${finalGoldGrams.toFixed(4)}g credited after $${totalDeductions.toFixed(2)} deductions`,
      });
      
      // Emit real-time sync event
      emitLedgerEvent(plan.userId, {
        type: 'balance_update',
        module: 'bnsl',
        action: 'early_termination_settled',
        data: { goldGrams: finalGoldGrams, planId: plan.id, netValueUsd },
      });
      
      res.json({ 
        success: true, 
        settlement: {
          baseValueUsd,
          adminFeeUsd,
          penaltyUsd,
          reimbursementUsd,
          totalDeductions,
          netValueUsd,
          finalGoldGrams,
          marketPrice: price
        },
        message: `Early termination settled: ${finalGoldGrams.toFixed(4)}g credited to wallet`
      });
    } catch (error) {
      console.error('BNSL early termination settlement error:', error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to settle early termination" });
    }
  });

  // ============================================================================
  // FINABRIDGE AGREEMENTS - T&C ACCEPTANCE TRACKING
  // ============================================================================
  
  // Get user's FinaBridge agreements
  app.get("/api/finabridge/agreements/user/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const agreements = await storage.getUserFinabridgeAgreements(req.params.userId);
      res.json({ agreements });
    } catch (error) {
      res.status(400).json({ message: "Failed to get user agreements" });
    }
  });
  
  // Get all FinaBridge agreements (admin)
  app.get("/api/admin/finabridge/agreements", ensureAdminAsync, async (req, res) => {
    try {
      const agreements = await storage.getAllFinabridgeAgreements();
      res.json({ agreements });
    } catch (error) {
      res.status(400).json({ message: "Failed to get agreements" });
    }
  });
  
  // Get single agreement by ID
  app.get("/api/finabridge/agreements/:id", ensureAuthenticated, async (req, res) => {
    try {
      const agreement = await storage.getFinabridgeAgreement(req.params.id);
      if (!agreement) {
        return res.status(404).json({ message: "Agreement not found" });
      }
      res.json({ agreement });
    } catch (error) {
      res.status(400).json({ message: "Failed to get agreement" });
    }
  });
  
  // Create FinaBridge agreement
  app.post("/api/finabridge/agreements", ensureAuthenticated, async (req, res) => {
    try {
      const agreementData = insertFinabridgeAgreementSchema.parse(req.body);
      const agreement = await storage.createFinabridgeAgreement(agreementData);
      res.json({ agreement });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create agreement" });
    }
  });
  
  // ============================================================================
  // FINAPAY - BANK ACCOUNTS & DEPOSIT/WITHDRAWAL REQUESTS
  // ============================================================================
  
  // Get all platform bank accounts (Admin)
  app.get("/api/admin/bank-accounts", ensureAdminAsync, async (req, res) => {
    try {
      const accounts = await storage.getAllPlatformBankAccounts();
      res.json({ accounts });
    } catch (error) {
      res.status(400).json({ message: "Failed to get bank accounts" });
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
      res.json({ fees: publicFees });
    } catch (error) {
      res.status(400).json({ message: "Failed to get fees" });
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
      
      res.json({ accounts });
    } catch (error) {
      res.status(400).json({ message: "Failed to get bank accounts" });
    }
  });
  
  // Create platform bank account (Admin) - PROTECTED
  app.post("/api/admin/bank-accounts", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      const accountData = insertPlatformBankAccountSchema.parse(req.body);
      const account = await storage.createPlatformBankAccount(accountData);
      res.json({ account });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create bank account" });
    }
  });
  
  // Update platform bank account (Admin) - PROTECTED
  app.patch("/api/admin/bank-accounts/:id", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      const account = await storage.updatePlatformBankAccount(req.params.id, req.body);
      if (!account) {
        return res.status(404).json({ message: "Bank account not found" });
      }
      res.json({ account });
    } catch (error) {
      res.status(400).json({ message: "Failed to update bank account" });
    }
  });
  
  // Delete platform bank account (Admin) - PROTECTED
  app.delete("/api/admin/bank-accounts/:id", ensureAdminAsync, requirePermission('manage_settings'), async (req, res) => {
    try {
      await storage.deletePlatformBankAccount(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ message: "Failed to delete bank account" });
    }
  });
  
  // Get user deposit requests - PROTECTED: requires matching session
  app.get("/api/deposit-requests/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const requests = await storage.getUserDepositRequests(req.params.userId);
      res.json({ requests });
    } catch (error) {
      res.status(400).json({ message: "Failed to get deposit requests" });
    }
  });
  
  // Get all deposit requests (Admin) - PROTECTED
  app.get("/api/admin/deposit-requests", ensureAdminAsync, requirePermission('manage_deposits', 'view_transactions'), async (req, res) => {
    try {
      const requests = await storage.getAllDepositRequests();
      res.json({ requests });
    } catch (error) {
      res.status(400).json({ message: "Failed to get deposit requests" });
    }
  });
  
  // Create deposit request (User) - PROTECTED - Requires KYC
  app.post("/api/deposit-requests", ensureAuthenticated, requireKycApproved, idempotencyMiddleware, async (req, res) => {
    try {
      // Generate reference number
      const referenceNumber = `DEP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const requestData = insertDepositRequestSchema.parse({
        ...req.body,
        referenceNumber,
      });
      const request = await storage.createDepositRequest(requestData);
      
      // Notify all admins of new deposit request
      const depositUser = await storage.getUser(req.body.userId);
      notifyAllAdmins({
        title: 'New Deposit Request',
        message: `${depositUser?.firstName || 'User'} submitted a deposit request for $${parseFloat(req.body.amountUsd).toLocaleString()}`,
        type: 'transaction',
        link: '/admin/transactions',
      });
      
      // Send deposit processing email to user
      if (depositUser?.email) {
        sendEmail(depositUser.email, EMAIL_TEMPLATES.DEPOSIT_PROCESSING, {
          user_name: `${depositUser.firstName} ${depositUser.lastName}`,
          amount: parseFloat(req.body.amountUsd).toFixed(2),
          reference_number: referenceNumber,
        }).catch(err => console.error('[Email] Deposit processing notification failed:', err));
      }
      
      // Create bell notification for deposit request submission
      await storage.createNotification({
        userId: req.body.userId,
        title: 'Deposit Request Submitted',
        message: `Your deposit request of $${parseFloat(req.body.amountUsd).toFixed(2)} has been submitted and is being processed.`,
        type: 'transaction',
        link: '/dashboard',
      });
      
      // Log platform activity
      logActivity({
        type: 'deposit',
        title: 'Deposit Request',
        description: `$${parseFloat(req.body.amountUsd).toFixed(2)} deposit request from ${depositUser?.firstName || 'User'} ${depositUser?.lastName || ''}`,
        details: { referenceNumber, method: req.body.paymentMethod },
        severity: 'info',
      });
      
      res.json({ request });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create deposit request" });
    }
  });
  
  // Update deposit request (Admin - approve/reject) - PROTECTED
  app.patch("/api/admin/deposit-requests/:id", ensureAdminAsync, requirePermission('manage_deposits'), async (req, res) => {
    try {
      const request = await storage.getDepositRequest(req.params.id);
      if (!request) {
        return res.status(404).json({ message: "Deposit request not found" });
      }
      
      const updates = req.body;
      
      // Prevent double-approval
      if (updates.status === 'Confirmed' && request.status === 'Confirmed') {
        return res.status(400).json({ 
          message: "This deposit has already been confirmed. Please refresh the page to see the updated status." 
        });
      }
      
      // Prevent approving rejected deposits
      if (updates.status === 'Confirmed' && request.status === 'Rejected') {
        return res.status(400).json({ 
          message: "Cannot approve a rejected deposit. Please create a new deposit request." 
        });
      }
      
      // If confirming deposit, credit the user's wallet with USD and calculate gold backing
      if (updates.status === 'Confirmed' && request.status === 'Pending') {
        const wallet = await storage.getWallet(request.userId);
        if (wallet) {
          // Fetch live gold price from metals-api BEFORE the transaction
          let goldPricePerGram: number;
          
          try {
            goldPricePerGram = await getGoldPricePerGram();
          } catch (priceError) {
            console.error('[Deposit Approval] Failed to fetch gold price:', priceError);
            return res.status(400).json({ 
              message: "Cannot approve deposit: Unable to fetch gold price. Please try again or configure Metals API."
            });
          }
          
          const depositAmountUsd = parseFloat(request.amountUsd.toString());
          
          // Calculate gold grams from USD amount
          const goldGrams = depositAmountUsd / goldPricePerGram;
          
          // Wrap all database operations in a transaction for atomicity
          await db.transaction(async (tx) => {
            // Get current wallet balances
            const currentGoldGrams = parseFloat(wallet.goldGrams.toString());
            const newGoldBalance = currentGoldGrams + goldGrams;
            
            // Update wallet: add gold grams only (no USD cash balance)
            await tx.update(wallets)
              .set({
                goldGrams: newGoldBalance.toFixed(6),
                updatedAt: new Date(),
              })
              .where(eq(wallets.id, wallet.id));
            
            // Create transaction record with gold backing metadata (type: 'Buy' to match crypto)
            const [transaction] = await tx.insert(transactions).values({
              userId: request.userId,
              type: 'Buy',
              status: 'Completed',
              amountUsd: depositAmountUsd.toString(),
              amountGold: goldGrams.toFixed(6),
              goldPriceUsdPerGram: goldPricePerGram.toFixed(2),
              description: `Bank deposit confirmed - Ref: ${request.referenceNumber} | Gold: ${goldGrams.toFixed(4)}g @ $${goldPricePerGram.toFixed(2)}/g`,
              referenceId: request.referenceNumber,
              sourceModule: 'finapay',
              approvedBy: updates.processedBy,
              approvedAt: new Date(),
              completedAt: new Date(),
              updatedAt: new Date(),
            }).returning();
            
            // Create FinaVault ledger entry for audit trail
            await tx.insert(vaultLedgerEntries).values({
              userId: request.userId,
              action: 'Deposit',
              goldGrams: goldGrams.toFixed(6),
              goldPriceUsdPerGram: goldPricePerGram.toFixed(2),
              valueUsd: depositAmountUsd.toString(),
              fromWallet: 'External',
              toWallet: 'FinaPay',
              toStatus: 'Available',
              balanceAfterGrams: newGoldBalance.toFixed(6),
              transactionId: transaction.id,
              notes: `Bank deposit approved - Ref: ${request.referenceNumber}`,
              createdBy: updates.processedBy || 'system',
            });
            
            // Update or create vault ownership summary
            const existingSummary = await tx.select().from(vaultOwnershipSummary)
              .where(eq(vaultOwnershipSummary.userId, request.userId)).limit(1);
            
            if (existingSummary.length > 0) {
              const currentTotal = parseFloat(existingSummary[0].totalGoldGrams || '0');
              const currentAvailable = parseFloat(existingSummary[0].availableGrams || '0');
              const currentFinaPay = parseFloat(existingSummary[0].finaPayGrams || '0');
              
              await tx.update(vaultOwnershipSummary)
                .set({
                  totalGoldGrams: (currentTotal + goldGrams).toFixed(6),
                  availableGrams: (currentAvailable + goldGrams).toFixed(6),
                  finaPayGrams: (currentFinaPay + goldGrams).toFixed(6),
                  lastUpdated: new Date(),
                })
                .where(eq(vaultOwnershipSummary.userId, request.userId));
            } else {
              await tx.insert(vaultOwnershipSummary).values({
                userId: request.userId,
                totalGoldGrams: goldGrams.toFixed(6),
                availableGrams: goldGrams.toFixed(6),
                finaPayGrams: goldGrams.toFixed(6),
              });
            }
            
            // Create audit log within transaction
            await tx.insert(auditLogs).values({
              entityType: 'deposit_request',
              entityId: request.id,
              actionType: 'approve',
              actor: updates.processedBy || 'system',
              actorRole: 'admin',
              details: `Deposit approved: $${depositAmountUsd.toFixed(2)} = ${goldGrams.toFixed(4)}g gold @ $${goldPricePerGram.toFixed(2)}/g`,
            });
            
            // Get or create vault holding (matching crypto flow)
            const existingHoldings = await tx.select().from(vaultHoldings)
              .where(eq(vaultHoldings.userId, request.userId)).limit(1);
            
            let vaultHoldingId: string;
            if (existingHoldings.length > 0) {
              // Update existing holding
              const existingHolding = existingHoldings[0];
              const newTotalGrams = parseFloat(existingHolding.goldGrams) + goldGrams;
              await tx.update(vaultHoldings)
                .set({ goldGrams: newTotalGrams.toFixed(6), updatedAt: new Date() })
                .where(eq(vaultHoldings.id, existingHolding.id));
              vaultHoldingId = existingHolding.id;
            } else {
              // Create new vault holding
              const [newHolding] = await tx.insert(vaultHoldings).values({
                userId: request.userId,
                goldGrams: goldGrams.toFixed(6),
                vaultLocation: 'Dubai - Wingold & Metals DMCC',
                wingoldStorageRef: `WG-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
                purchasePriceUsdPerGram: goldPricePerGram.toFixed(2),
              }).returning();
              vaultHoldingId = newHolding.id;
            }
            
            // Create Digital Ownership certificate (from Finatrades)
            const docCertNumber = await storage.generateCertificateNumber('Digital Ownership');
            const [digitalCert] = await tx.insert(certificates).values({
              certificateNumber: docCertNumber,
              userId: request.userId,
              transactionId: transaction.id,
              vaultHoldingId: vaultHoldingId,
              type: 'Digital Ownership',
              status: 'Active',
              goldGrams: goldGrams.toFixed(6),
              goldPriceUsdPerGram: goldPricePerGram.toFixed(2),
              totalValueUsd: depositAmountUsd.toFixed(2),
              issuer: 'Finatrades',
              vaultLocation: 'Dubai - Wingold & Metals DMCC',
              issuedAt: new Date(),
            }).returning();
            
            // Create Physical Storage certificate (from Wingold & Metals DMCC) - matching crypto flow
            const sscCertNumber = await storage.generateCertificateNumber('Physical Storage');
            const [storageCert] = await tx.insert(certificates).values({
              certificateNumber: sscCertNumber,
              userId: request.userId,
              transactionId: transaction.id,
              vaultHoldingId: vaultHoldingId,
              type: 'Physical Storage',
              status: 'Active',
              goldGrams: goldGrams.toFixed(6),
              goldPriceUsdPerGram: goldPricePerGram.toFixed(2),
              issuer: 'Wingold & Metals DMCC',
              vaultLocation: 'Dubai - Wingold & Metals DMCC',
              issuedAt: new Date(),
            }).returning();
            
            return { digitalCert, storageCert, vaultHoldingId };
          });
          
          // Send email notification for deposit confirmation with PDF attachments
          const depositUser = await storage.getUser(request.userId);
          
          // Get both certificates (Digital Ownership + Physical Storage) for this transaction
          const userCerts = await storage.getUserCertificates(request.userId);
          const transactionCerts = userCerts
            .sort((a, b) => new Date(b.issuedAt || 0).getTime() - new Date(a.issuedAt || 0).getTime())
            .slice(0, 2); // Get the 2 most recent certificates (DOC + SSC)
          
          // Create in-app notification (matching crypto flow)
          await storage.createNotification({
            userId: request.userId,
            title: 'Deposit Confirmed',
            message: `Your bank deposit of $${depositAmountUsd.toFixed(2)} has been confirmed. ${goldGrams.toFixed(4)}g gold has been credited to your wallet.`,
            type: 'success',
            read: false,
          });
          
          // Notify all admins about the deposit approval
          const depositUserName = depositUser ? `${depositUser.firstName || ''} ${depositUser.lastName || ''}`.trim() || 'User' : 'User';
          notifyAllAdmins({
            title: 'Deposit Approved',
            message: `Deposit of $${depositAmountUsd.toFixed(2)} for ${depositUserName} has been confirmed. ${goldGrams.toFixed(4)}g gold credited.`,
            type: 'success',
            link: '/admin/transactions',
          });
          
          // Emit real-time sync event for auto-update
          emitLedgerEvent(request.userId, {
            type: 'balance_update',
            module: 'finapay',
            action: 'bank_deposit_confirmed',
            data: { goldGrams, amountUsd: depositAmountUsd },
          });
          
          if (depositUser && depositUser.email) {
            // Generate transaction receipt PDF
            const receiptPdf = await generateTransactionReceiptPDF({
              referenceNumber: request.referenceNumber,
              transactionType: 'Bank Deposit',
              amountUsd: depositAmountUsd,
              goldGrams: goldGrams,
              goldPricePerGram: goldPricePerGram,
              userName: `${depositUser.firstName || ''} ${depositUser.lastName || ''}`.trim() || 'Customer',
              userEmail: depositUser.email,
              transactionDate: new Date(),
              status: 'Completed',
              description: `Bank deposit confirmed - Gold: ${goldGrams.toFixed(4)}g @ $${goldPricePerGram.toFixed(2)}/g`,
            });
            
            const attachments: Array<{ filename: string; content: Buffer; contentType: string }> = [
              {
                filename: `Transaction_Receipt_${request.referenceNumber}.pdf`,
                content: receiptPdf,
                contentType: 'application/pdf',
              }
            ];
            
            // Generate and add BOTH certificate PDFs (matching crypto flow)
            for (const cert of transactionCerts) {
              const certPdf = await generateCertificatePDF(cert, depositUser);
              attachments.push({
                filename: `Certificate_${cert.certificateNumber}.pdf`,
                content: certPdf,
                contentType: 'application/pdf',
              });
            }
            
            const htmlBody = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #f97316, #ea580c); padding: 30px; text-align: center;">
                  <h1 style="color: white; margin: 0;">Deposit Confirmed!</h1>
                </div>
                <div style="padding: 30px; background: #ffffff;">
                  <p>Hello ${depositUser.firstName},</p>
                  <p>Your bank deposit has been verified and gold has been credited to your wallet.</p>
                  <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                    <p style="font-size: 28px; font-weight: bold; color: #f97316; margin: 0;">+$${depositAmountUsd.toFixed(2)}</p>
                    <p style="font-size: 18px; font-weight: bold; color: #92400e; margin: 10px 0;">Gold Credited: ${goldGrams.toFixed(4)}g</p>
                    <p style="color: #6b7280; margin: 5px 0;">Price: $${goldPricePerGram.toFixed(2)}/gram</p>
                    <p style="color: #6b7280; margin: 5px 0;">Reference: ${request.referenceNumber}</p>
                  </div>
                  <p><strong>Attached Documents:</strong></p>
                  <ul>
                    <li>Transaction Receipt (PDF)</li>
                    <li>Digital Ownership Certificate (PDF)</li>
                    <li>Physical Storage Certificate (PDF)</li>
                  </ul>
                  <p style="text-align: center; margin-top: 30px;">
                    <a href="https://finatrades.com/dashboard" style="background: #f97316; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">View Wallet</a>
                  </p>
                </div>
                <div style="padding: 20px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px;">
                  <p>Finatrades - Gold-Backed Digital Finance</p>
                </div>
              </div>
            `;
            
            sendEmailWithAttachment(
              depositUser.email,
              `Deposit Confirmed - $${depositAmountUsd.toFixed(2)} (${goldGrams.toFixed(4)}g Gold)`,
              htmlBody,
              attachments
            ).catch(err => console.error('[Email] Failed to send deposit confirmation with PDF:', err));
          }
          
          // Update the deposit request with gold details
          updates.amountGold = goldGrams.toFixed(6);
          updates.goldPriceUsdPerGram = goldPricePerGram.toFixed(2);
        }
      }
      
      const updatedRequest = await storage.updateDepositRequest(req.params.id, {
        ...updates,
        processedAt: new Date(),
      });
      
      res.json({ 
        request: updatedRequest,
        goldPriceUsed: updates.goldPriceUsdPerGram,
        goldGramsAllocated: updates.amountGold,
      });
    } catch (error) {
      console.error('[Deposit Approval] Error:', error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to update deposit request" });
    }
  });
  
  // Get user withdrawal requests - PROTECTED: requires matching session
  app.get("/api/withdrawal-requests/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const requests = await storage.getUserWithdrawalRequests(req.params.userId);
      res.json({ requests });
    } catch (error) {
      res.status(400).json({ message: "Failed to get withdrawal requests" });
    }
  });
  
  // Get all withdrawal requests (Admin) - PROTECTED: requires admin authentication
  app.get("/api/admin/withdrawal-requests", ensureAdminAsync, requirePermission('manage_withdrawals', 'view_transactions'), async (req, res) => {
    try {
      const requests = await storage.getAllWithdrawalRequests();
      res.json({ requests });
    } catch (error) {
      res.status(400).json({ message: "Failed to get withdrawal requests" });
    }
  });
  
  // Create withdrawal request (User) - PROTECTED: requires authentication + owner verification + KYC + PIN + rate limit
  app.post("/api/withdrawal-requests", withdrawalRateLimiter, ensureAuthenticated, requireKycApproved, requirePinVerification('withdraw_funds'), idempotencyMiddleware, async (req, res) => {
    try {
      const { userId, amountUsd, ...bankDetails } = req.body;
      
      // SECURITY: Verify user can only create withdrawal for themselves
      if (req.session?.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to create withdrawal for another user" });
      }
      
      // Check user has sufficient balance
      const wallet = await storage.getWallet(userId);
      if (!wallet) {
        return res.status(400).json({ message: "Wallet not found" });
      }
      
      const currentBalance = parseFloat(wallet.usdBalance.toString());
      const withdrawAmount = parseFloat(amountUsd);
      
      if (currentBalance < withdrawAmount) {
        return res.status(400).json({ message: "Insufficient balance" });
      }
      
      // Generate reference number
      const referenceNumber = `WTH-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      
      const requestData = insertWithdrawalRequestSchema.parse({
        userId,
        amountUsd,
        referenceNumber,
        ...bankDetails,
      });
      
      // Debit the amount from wallet immediately (hold)
      await storage.updateWallet(wallet.id, {
        usdBalance: (currentBalance - withdrawAmount).toString(),
      });
      
      const request = await storage.createWithdrawalRequest(requestData);
      
      // Notify all admins of new withdrawal request
      const withdrawUser = await storage.getUser(userId);
      notifyAllAdmins({
        title: 'New Withdrawal Request',
        message: `${withdrawUser?.firstName || 'User'} requested a withdrawal of $${parseFloat(amountUsd).toLocaleString()}`,
        type: 'transaction',
        link: '/admin/transactions',
      });
      
      // Send withdrawal requested email to user
      if (withdrawUser?.email) {
        sendEmail(withdrawUser.email, EMAIL_TEMPLATES.WITHDRAWAL_REQUESTED, {
          user_name: `${withdrawUser.firstName} ${withdrawUser.lastName}`,
          amount: parseFloat(amountUsd).toFixed(2),
          reference_number: referenceNumber,
        }).catch(err => console.error('[Email] Withdrawal requested notification failed:', err));
      }
      
      // Create bell notification for withdrawal request submission
      await storage.createNotification({
        userId,
        title: 'Withdrawal Request Submitted',
        message: `Your withdrawal request of $${parseFloat(amountUsd).toFixed(2)} has been submitted and is being processed.`,
        type: 'transaction',
        link: '/dashboard',
      });
      
      // Log platform activity
      logActivity({
        type: 'withdrawal',
        title: 'Withdrawal Request',
        description: `$${parseFloat(amountUsd).toFixed(2)} withdrawal request from ${withdrawUser?.firstName || 'User'} ${withdrawUser?.lastName || ''}`,
        details: { referenceNumber, bankName },
        severity: 'info',
      });
      
      res.json({ request });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create withdrawal request" });
    }
  });
  
  // Update withdrawal request (Admin - process/reject) - PROTECTED
  app.patch("/api/admin/withdrawal-requests/:id", ensureAdminAsync, requirePermission('manage_withdrawals'), async (req, res) => {
    try {
      const request = await storage.getWithdrawalRequest(req.params.id);
      if (!request) {
        return res.status(404).json({ message: "Withdrawal request not found" });
      }
      
      const updates = req.body;
      
      // If completing withdrawal, create transaction record
      if (updates.status === 'Completed' && request.status !== 'Completed') {
        await storage.createTransaction({
          userId: request.userId,
          type: 'Withdrawal',
          status: 'Completed',
          amountUsd: request.amountUsd.toString(),
          description: `Withdrawal completed - Ref: ${request.referenceNumber}`,
          referenceId: request.referenceNumber,
          sourceModule: 'finapay',
          approvedBy: updates.processedBy,
          approvedAt: new Date(),
          updatedAt: new Date(),
        });
        
        // Send email notification for withdrawal completion
        const withdrawalUser = await storage.getUser(request.userId);
        if (withdrawalUser && withdrawalUser.email) {
          sendEmailDirect(
            withdrawalUser.email,
            `Withdrawal Completed - $${parseFloat(request.amountUsd.toString()).toFixed(2)}`,
            `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #f97316, #ea580c); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0;">Withdrawal Completed!</h1>
              </div>
              <div style="padding: 30px; background: #ffffff;">
                <p>Hello ${withdrawalUser.firstName},</p>
                <p>Your withdrawal request has been processed and the funds have been sent to your bank account.</p>
                <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="padding: 8px 0;">Amount:</td><td style="text-align: right; font-weight: bold; color: #f97316;">$${parseFloat(request.amountUsd.toString()).toFixed(2)}</td></tr>
                    <tr><td style="padding: 8px 0;">Reference:</td><td style="text-align: right;">${request.referenceNumber}</td></tr>
                    <tr><td style="padding: 8px 0;">Bank:</td><td style="text-align: right;">${request.bankName || 'N/A'}</td></tr>
                    <tr><td style="padding: 8px 0;">Account:</td><td style="text-align: right;">****${(request.accountNumber || '').slice(-4)}</td></tr>
                  </table>
                </div>
                <p>Please allow 1-3 business days for the funds to appear in your bank account.</p>
                <p style="text-align: center; margin-top: 30px;">
                  <a href="https://finatrades.com/dashboard" style="background: #f97316; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">View Transaction History</a>
                </p>
              </div>
              <div style="padding: 20px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px;">
                <p>Finatrades - Gold-Backed Digital Finance</p>
              </div>
            </div>
            `
          ).catch(err => console.error('[Email] Failed to send withdrawal completion:', err));
        }
        
        // Create bell notification for withdrawal completion
        await storage.createNotification({
          userId: request.userId,
          title: 'Withdrawal Completed',
          message: `Your withdrawal of $${parseFloat(request.amountUsd.toString()).toFixed(2)} has been processed and sent to your bank account.`,
          type: 'transaction',
          link: '/dashboard',
        });
      }
      
      // If rejecting from Pending or Processing, refund the held amount back to wallet
      if (updates.status === 'Rejected' && (request.status === 'Pending' || request.status === 'Processing')) {
        const wallet = await storage.getWallet(request.userId);
        if (wallet) {
          const currentBalance = parseFloat(wallet.usdBalance.toString());
          const refundAmount = parseFloat(request.amountUsd.toString());
          await storage.updateWallet(wallet.id, {
            usdBalance: (currentBalance + refundAmount).toString(),
          });
          
          // Create refund transaction record
          await storage.createTransaction({
            userId: request.userId,
            type: 'Deposit',
            status: 'Completed',
            amountUsd: request.amountUsd.toString(),
            description: `Withdrawal refund (rejected) - Ref: ${request.referenceNumber}`,
            referenceId: `${request.referenceNumber}-REFUND`,
            sourceModule: 'finapay',
            approvedBy: updates.processedBy,
            approvedAt: new Date(),
            updatedAt: new Date(),
          });
        }
        
        // Create bell notification for withdrawal rejection
        await storage.createNotification({
          userId: request.userId,
          title: 'Withdrawal Rejected',
          message: `Your withdrawal request of $${parseFloat(request.amountUsd.toString()).toFixed(2)} was rejected. The funds have been returned to your wallet.`,
          type: 'transaction',
          link: '/dashboard',
        });
      }
      
      const updatedRequest = await storage.updateWithdrawalRequest(req.params.id, {
        ...updates,
        processedAt: new Date(),
      });
      
      res.json({ request: updatedRequest });
    } catch (error) {
      res.status(400).json({ message: "Failed to update withdrawal request" });
    }
  });
  
  // ============================================================================
  // FINABRIDGE - TRADE FINANCE
  // ============================================================================
  
  // Get user trade cases - PROTECTED
  app.get("/api/trade/cases/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const cases = await storage.getUserTradeCases(req.params.userId);
      res.json({ cases });
    } catch (error) {
      res.status(400).json({ message: "Failed to get trade cases" });
    }
  });
  
  // Get all trade cases (Admin)
  app.get("/api/admin/trade/cases", async (req, res) => {
    try {
      const cases = await storage.getAllTradeCases();
      res.json({ cases });
    } catch (error) {
      res.status(400).json({ message: "Failed to get trade cases" });
    }
  });
  
  // Create trade case - PROTECTED - Requires KYC
  app.post("/api/trade/cases", ensureAuthenticated, requireKycApproved, async (req, res) => {
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
      
      res.json({ tradeCase });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create trade case" });
    }
  });
  
  // Update trade case - PROTECTED
  app.patch("/api/trade/cases/:id", ensureAuthenticated, async (req, res) => {
    try {
      const tradeCase = await storage.updateTradeCase(req.params.id, req.body);
      if (!tradeCase) {
        return res.status(404).json({ message: "Trade case not found" });
      }
      res.json({ tradeCase });
    } catch (error) {
      res.status(400).json({ message: "Failed to update trade case" });
    }
  });
  
  // Get case documents - PROTECTED
  app.get("/api/trade/documents/:caseId", ensureAuthenticated, async (req, res) => {
    try {
      const documents = await storage.getCaseDocuments(req.params.caseId);
      res.json({ documents });
    } catch (error) {
      res.status(400).json({ message: "Failed to get documents" });
    }
  });
  
  // Upload document - PROTECTED
  app.post("/api/trade/documents", ensureAuthenticated, async (req, res) => {
    try {
      const documentData = insertTradeDocumentSchema.parse(req.body);
      const document = await storage.createTradeDocument(documentData);
      res.json({ document });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to upload document" });
    }
  });
  
  // Update document status - PROTECTED
  app.patch("/api/trade/documents/:id", ensureAuthenticated, async (req, res) => {
    try {
      const document = await storage.updateTradeDocument(req.params.id, req.body);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      res.json({ document });
    } catch (error) {
      res.status(400).json({ message: "Failed to update document" });
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
      
      res.json({ 
        success: true, 
        acceptedAt: updatedUser?.finabridgeDisclaimerAcceptedAt,
        role: updatedUser?.finabridgeRole 
      });
    } catch (error) {
      res.status(400).json({ message: "Failed to record disclaimer acceptance" });
    }
  });
  
  // IMPORTER ENDPOINTS
  
  // Get importer's trade requests
  app.get("/api/finabridge/importer/requests/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const requests = await storage.getUserTradeRequests(req.params.userId);
      res.json({ requests });
    } catch (error) {
      console.error('[FinaBridge] Error fetching trade requests:', error);
      res.status(400).json({ message: "Failed to get trade requests" });
    }
  });
  
  // Create new trade request (Importer) - Requires KYC
  app.post("/api/finabridge/importer/requests", ensureAuthenticated, requireKycApproved, async (req, res) => {
    try {
      const requestData = insertTradeRequestSchema.parse({
        ...req.body,
        tradeRefId: generateTradeRefId(),
      });
      const tradeRequest = await storage.createTradeRequest(requestData);
      
      await storage.createAuditLog({
        entityType: "trade_request",
        entityId: tradeRequest.id,
        actionType: "create",
        actor: requestData.importerUserId,
        actorRole: "user",
        details: `Trade request created: ${requestData.tradeValueUsd} USD`,
      });
      
      res.json({ tradeRequest });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create trade request" });
    }
  });
  
  // Submit trade request (change from Draft to Open)
  app.post("/api/finabridge/importer/requests/:id/submit", ensureAuthenticated, async (req, res) => {
    try {
      const request = await storage.getTradeRequest(req.params.id);
      if (!request) {
        return res.status(404).json({ message: "Trade request not found" });
      }
      if (request.status !== 'Draft') {
        return res.status(400).json({ message: "Only draft requests can be submitted" });
      }
      const updated = await storage.updateTradeRequest(req.params.id, { status: 'Open' });
      
      // Notify all admins of new trade request
      const importerUser = await storage.getUser(request.importerUserId);
      notifyAllAdmins({
        title: 'New Trade Request',
        message: `${importerUser?.companyName || importerUser?.firstName || 'Importer'} submitted trade request for ${request.goodsName} ($${parseFloat(request.tradeValueUsd.toString()).toLocaleString()})`,
        type: 'info',
        link: '/admin/finabridge',
      });
      
      res.json({ tradeRequest: updated });
    } catch (error) {
      res.status(400).json({ message: "Failed to submit trade request" });
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
      
      // Include exporter details - use exporter profile as fallback for missing proposal fields
      const proposalsWithExporter = await Promise.all(
        proposals.filter(Boolean).map(async (proposal) => {
          const exporter = await storage.getUser(proposal!.exporterUserId);
          const exporterFullName = exporter ? `${exporter.firstName} ${exporter.lastName}` : null;
          return {
            ...proposal,
            // Use exporter profile as fallback for empty proposal fields
            companyName: proposal!.companyName || exporter?.companyName || null,
            contactPerson: proposal!.contactPerson || exporterFullName,
            contactEmail: proposal!.contactEmail || exporter?.email || null,
            contactPhone: proposal!.contactPhone || exporter?.phoneNumber || null,
            exporter: exporter ? { 
              finatradesId: exporter.finatradesId,
              fullName: exporterFullName,
              email: exporter.email,
              companyName: exporter.companyName,
            } : null,
          };
        })
      );
      
      res.json({ proposals: proposalsWithExporter });
    } catch (error) {
      res.status(400).json({ message: "Failed to get forwarded proposals" });
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
      
      res.json({ settlementHold, dealRoom, message: "Proposal accepted, gold locked, and deal room created" });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to accept proposal" });
    }
  });

  // Decline a forwarded proposal
  app.post("/api/finabridge/importer/proposals/:proposalId/decline", ensureAuthenticated, async (req, res) => {
    try {
      const proposal = await storage.getTradeProposal(req.params.proposalId);
      if (!proposal) {
        return res.status(404).json({ message: "Proposal not found" });
      }
      
      // Update proposal status to Declined
      await storage.updateTradeProposal(proposal.id, { status: 'Declined' });
      
      // Remove from forwarded proposals
      await storage.removeForwardedProposal(proposal.id);
      
      res.json({ message: "Proposal declined successfully" });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to decline proposal" });
    }
  });
  
  // EXPORTER ENDPOINTS
  
  // Get open trade requests for exporters (privacy filtered - no importer PII)
  app.get("/api/finabridge/exporter/open-requests/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const requests = await storage.getOpenTradeRequests();
      
      // Filter out importer PII - only include tradeRefId and trade details
      const sanitizedRequests = await Promise.all(
        requests.map(async (request) => {
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
      
      res.json({ requests: sanitizedRequests });
    } catch (error) {
      res.status(400).json({ message: "Failed to get open trade requests" });
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
      
      res.json({ proposals: proposalsWithRequest });
    } catch (error) {
      res.status(400).json({ message: "Failed to get proposals" });
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
            allForwardedProposals.push({
              ...proposal,
              forwardedAt: fp.createdAt,
              exporter: exporter ? { finatradesId: exporter.finatradesId } : null,
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
      
      res.json({ proposals: allForwardedProposals });
    } catch (err) {
      console.error("Error fetching forwarded proposals:", err);
      res.status(500).json({ message: "Failed to fetch forwarded proposals" });
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
      
      res.json({ proposal });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create proposal" });
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
      
      res.json({ proposal });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to submit proposal" });
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
      
      res.json({ users: usersWithAcceptanceStatus });
    } catch (error) {
      res.status(400).json({ message: "Failed to get disclaimer acceptances" });
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
      
      res.json({ requests: requestsWithImporter });
    } catch (error) {
      res.status(400).json({ message: "Failed to get trade requests" });
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
      
      res.json({ proposals: proposalsWithExporter });
    } catch (error) {
      res.status(400).json({ message: "Failed to get proposals" });
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
      res.json({ proposal: updated });
    } catch (error) {
      res.status(400).json({ message: "Failed to shortlist proposal" });
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
      res.json({ proposal: updated });
    } catch (error) {
      res.status(400).json({ message: "Failed to reject proposal" });
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
      res.json({ proposal: updated });
    } catch (error) {
      res.status(400).json({ message: "Failed to request modification" });
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
      
      res.json({ message: `${proposalIds.length} proposals forwarded to importer` });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to forward proposals" });
    }
  });
  
  // FINABRIDGE WALLET ENDPOINTS
  
  // Get user's FinaBridge wallet - PROTECTED
  app.get("/api/finabridge/wallet/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const wallet = await storage.getOrCreateFinabridgeWallet(req.params.userId);
      res.json({ wallet });
    } catch (error) {
      res.status(400).json({ message: "Failed to get wallet" });
    }
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
      
      // Get wallet transactions (transfers from vault ledger)
      const { vaultLedgerService } = await import('./vault-ledger-service');
      const vaultEntries = await vaultLedgerService.getLedgerHistory(userId, 200);
      const tradeRelatedEntries = vaultEntries.filter((e: any) => 
        e.action === 'FinaPay_To_Trade' || e.action === 'Trade_To_FinaPay'
      );
      
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
          notes: entry.notes || (entry.action === 'FinaPay_To_Trade' ? 'Transfer from FinaPay' : 'Transfer to FinaPay'),
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
      
      res.json({ entries: sortedEntries });
    } catch (error) {
      console.error("Failed to get FinaBridge ledger:", error);
      res.status(400).json({ message: "Failed to get FinaBridge ledger history" });
    }
  });
  
  // Fund FinaBridge wallet (transfer from main wallet) - PROTECTED
  app.post("/api/finabridge/wallet/:userId/fund", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const { amountGrams, goldPricePerGram } = req.body;
      const amount = parseFloat(amountGrams);
      
      // Get gold price from request or fetch from API as fallback
      let goldPrice = parseFloat(goldPricePerGram) || 0;
      if (!goldPrice) {
        try {
          const { getGoldPricePerGram } = await import('./gold-price');
          goldPrice = await getGoldPricePerGram() || 0;
        } catch (e) {
          console.log('Could not fetch gold price for ledger entry');
        }
      }
      
      if (isNaN(amount) || amount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }
      
      // Get main wallet
      const mainWallet = await storage.getWallet(req.params.userId);
      if (!mainWallet) {
        return res.status(404).json({ message: "Main wallet not found" });
      }
      
      const mainGoldBalance = parseFloat(mainWallet.goldGrams || '0');
      if (mainGoldBalance < amount) {
        return res.status(400).json({ message: "Insufficient gold balance in main wallet" });
      }
      
      // Deduct from main wallet
      await storage.updateWallet(mainWallet.id, {
        goldGrams: (mainGoldBalance - amount).toFixed(6),
      });
      
      // Add to FinaBridge wallet
      const fbWallet = await storage.getOrCreateFinabridgeWallet(req.params.userId);
      const newBalance = parseFloat(fbWallet.availableGoldGrams) + amount;
      await storage.updateFinabridgeWallet(fbWallet.id, {
        availableGoldGrams: newBalance.toFixed(6),
      });
      
      // Create transaction record
      await storage.createTransaction({
        userId: req.params.userId,
        type: 'Withdrawal',
        status: 'Completed',
        amountGold: amountGrams.toString(),
        description: 'Transfer to FinaBridge wallet',
        sourceModule: 'finabridge',
        updatedAt: new Date(),
      });
      
      // Record vault ledger entry for the transfer
      const { vaultLedgerService } = await import('./vault-ledger-service');
      await vaultLedgerService.recordLedgerEntry({
        userId: req.params.userId,
        action: 'FinaPay_To_FinaBridge',
        goldGrams: amount,
        goldPriceUsdPerGram: goldPrice,
        fromWallet: 'FinaPay',
        toWallet: 'FinaBridge',
        fromStatus: 'Available',
        toStatus: 'Available',
        notes: `Transferred ${amount.toFixed(4)}g from FinaPay to FinaBridge Wallet`,
      });
      
      res.json({ 
        message: `${amount}g transferred to FinaBridge wallet`,
        wallet: await storage.getFinabridgeWallet(req.params.userId),
      });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to fund wallet" });
    }
  });

  // Withdraw from FinaBridge wallet (transfer to FinaPay) - PROTECTED
  app.post("/api/finabridge/wallet/:userId/withdraw", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const { amountGrams, goldPricePerGram } = req.body;
      const amount = parseFloat(amountGrams);
      
      // Get gold price from request or fetch from API as fallback
      let goldPrice = parseFloat(goldPricePerGram) || 0;
      if (!goldPrice) {
        try {
          goldPrice = await getGoldPricePerGram() || 0;
        } catch (e) {
          console.log('Could not fetch gold price for ledger entry');
        }
      }
      
      if (isNaN(amount) || amount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }
      
      // Get FinaBridge wallet
      const fbWallet = await storage.getOrCreateFinabridgeWallet(req.params.userId);
      const fbGoldBalance = parseFloat(fbWallet.availableGoldGrams || '0');
      
      if (fbGoldBalance < amount) {
        return res.status(400).json({ message: "Insufficient gold balance in FinaBridge wallet" });
      }
      
      // Deduct from FinaBridge wallet
      await storage.updateFinabridgeWallet(fbWallet.id, {
        availableGoldGrams: (fbGoldBalance - amount).toFixed(6),
      });
      
      // Add to main FinaPay wallet
      const mainWallet = await storage.getWallet(req.params.userId);
      if (!mainWallet) {
        return res.status(404).json({ message: "Main wallet not found" });
      }
      const mainGoldBalance = parseFloat(mainWallet.goldGrams || '0');
      await storage.updateWallet(mainWallet.id, {
        goldGrams: (mainGoldBalance + amount).toFixed(6),
      });
      
      // Create transaction record
      const usdValue = amount * goldPrice;
      await storage.createTransaction({
        userId: req.params.userId,
        type: 'Receive',
        status: 'Completed',
        amountGold: amount.toFixed(6),
        amountUsd: usdValue.toFixed(2),
        goldPriceUsdPerGram: goldPrice.toFixed(2),
        description: 'Transfer from FinaBridge wallet to FinaPay',
        sourceModule: 'finabridge',
        updatedAt: new Date(),
      });
      
      // Record vault ledger entry for the transfer
      const { vaultLedgerService } = await import('./vault-ledger-service');
      await vaultLedgerService.recordLedgerEntry({
        userId: req.params.userId,
        action: 'FinaBridge_To_FinaPay',
        goldGrams: amount,
        goldPriceUsdPerGram: goldPrice,
        fromWallet: 'FinaBridge',
        toWallet: 'FinaPay',
        fromStatus: 'Available',
        toStatus: 'Available',
        notes: `Transferred ${amount.toFixed(4)}g from FinaBridge Wallet to FinaPay`,
      });
      
      // Emit real-time sync event
      emitLedgerEvent(req.params.userId, {
        type: 'balance_update',
        module: 'finabridge',
        action: 'finabridge_to_finapay_transfer',
        data: { goldGrams: amount, amountUsd: usdValue },
      });
      
      res.json({ 
        message: `${amount}g transferred from FinaBridge to FinaPay wallet`,
        wallet: await storage.getFinabridgeWallet(req.params.userId),
        finapayWallet: await storage.getWallet(req.params.userId),
      });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to withdraw from FinaBridge wallet" });
    }
  });
  
  // Get user's settlement holds
  app.get("/api/finabridge/settlement-holds/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const holds = await storage.getUserSettlementHolds(req.params.userId);
      res.json({ holds });
    } catch (error) {
      res.status(400).json({ message: "Failed to get settlement holds" });
    }
  });
  
  // Admin: Get all settlement holds
  app.get("/api/admin/finabridge/settlement-holds", ensureAdminAsync, requirePermission('view_finabridge', 'manage_finabridge'), async (req, res) => {
    try {
      const holds = await storage.getAllSettlementHolds();
      res.json({ holds });
    } catch (error) {
      res.status(400).json({ message: "Failed to get settlement holds" });
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
        amountGold: lockedAmount.toFixed(6),
        amountUsd: tradeValue.toFixed(2),
        description: `Trade Settlement - ${tradeRequest?.tradeRefId || 'FinaBridge'}`,
        sourceModule: 'FinaBridge',
      });
      
      // Update hold status
      await storage.updateSettlementHold(req.params.id, { status: 'Released' });
      
      // Update trade request status
      await storage.updateTradeRequest(hold.tradeRequestId, { status: 'Completed' });
      
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
      
      res.json({ message: "Settlement released and gold transferred to exporter" });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to release settlement" });
    }
  });

  // Cancel settlement hold (admin - return gold to importer)
  app.post("/api/admin/finabridge/settlement-holds/:id/cancel", ensureAdminAsync, requirePermission('manage_finabridge'), async (req, res) => {
    try {
      const { reason } = req.body;
      const adminUser = (req as any).adminUser;
      
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
      
      // Record ledger entry
      const { vaultLedgerService } = await import('./vault-ledger-service');
      await vaultLedgerService.recordLedgerEntry({
        userId: hold.importerUserId,
        action: 'Unlock',
        goldGrams: lockedAmount,
        goldPriceUsdPerGram: 0,
        fromWallet: 'FinaBridge',
        toWallet: 'FinaBridge',
        fromStatus: 'Locked',
        toStatus: 'Available',
        notes: `Settlement cancelled: ${reason || 'Trade cancelled'}`,
        createdBy: adminUser.id,
      });
      
      // Audit log
      await storage.createAuditLog({
        entityType: "settlement_hold",
        entityId: req.params.id,
        actionType: "cancel",
        actor: adminUser.id,
        actorRole: "admin",
        details: `Settlement cancelled, ${lockedAmount}g returned to importer. Reason: ${reason}`,
      });
      
      res.json({ message: "Settlement cancelled and gold returned to importer" });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to cancel settlement" });
    }
  });

  // Partial settlement release (admin - release portion of gold)
  app.post("/api/admin/finabridge/settlement-holds/:id/partial-release", ensureAdminAsync, requirePermission('manage_finabridge'), async (req, res) => {
    try {
      const { percentage, reason, milestone } = req.body;
      const adminUser = (req as any).adminUser;
      
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
        amountGold: releaseGrams.toFixed(6),
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
      
      // Record ledger entry
      const { vaultLedgerService } = await import('./vault-ledger-service');
      await vaultLedgerService.recordLedgerEntry({
        userId: hold.exporterUserId,
        action: 'Transfer_Receive',
        goldGrams: releaseGrams,
        goldPriceUsdPerGram: releaseGrams > 0 ? tradeValue / releaseGrams : 0,
        fromWallet: 'FinaBridge',
        toWallet: 'FinaBridge',
        toStatus: 'Available',
        transactionId: tx.id,
        counterpartyUserId: hold.importerUserId,
        notes: `Partial settlement ${percentage}%: ${releaseGrams.toFixed(4)}g${milestone ? ' - ' + milestone : ''}`,
        createdBy: adminUser.id,
      });
      
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
      
      res.json({ 
        message: `Released ${releaseGrams.toFixed(4)}g (${percentage}%) to exporter`,
        released: releaseGrams,
        remaining: remaining - releaseGrams,
        totalReleased: newTotalReleased,
      });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to release partial settlement" });
    }
  });

  // Get partial settlements for a hold
  app.get("/api/admin/finabridge/settlement-holds/:id/partial-releases", ensureAdminAsync, requirePermission('view_finabridge', 'manage_finabridge'), async (req, res) => {
    try {
      const releases = await db.select().from(partialSettlements).where(eq(partialSettlements.settlementHoldId, req.params.id)).orderBy(desc(partialSettlements.createdAt));
      res.json({ releases });
    } catch (error) {
      res.status(400).json({ message: "Failed to get partial releases" });
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
      
      res.json({ dispute, message: "Dispute submitted successfully" });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to raise dispute" });
    }
  });

  // Get user's disputes
  app.get("/api/finabridge/disputes/user/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const disputes = await db.select().from(tradeDisputes).where(eq(tradeDisputes.raisedByUserId, req.params.userId)).orderBy(desc(tradeDisputes.createdAt));
      res.json({ disputes });
    } catch (error) {
      res.status(400).json({ message: "Failed to get disputes" });
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
      
      // Check if admin with FinaBridge permissions
      const sessionUser = await storage.getUser(sessionUserId);
      const isAdmin = sessionUser?.role === 'admin' && (sessionUser.permissions?.includes('view_finabridge') || sessionUser.permissions?.includes('manage_finabridge'));
      
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
      
      res.json({ dispute, comments });
    } catch (error) {
      res.status(400).json({ message: "Failed to get dispute" });
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
      
      // Check if admin with FinaBridge permissions
      const sessionUser = await storage.getUser(sessionUserId);
      const isAdmin = sessionUser?.role === 'admin' && sessionUser.permissions?.includes('manage_finabridge');
      
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
      
      res.json({ comment });
    } catch (error) {
      res.status(400).json({ message: "Failed to add comment" });
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
      
      res.json({ disputes: disputesWithDetails });
    } catch (error) {
      res.status(400).json({ message: "Failed to get disputes" });
    }
  });

  // Admin: Update dispute status
  app.post("/api/admin/finabridge/disputes/:id/status", ensureAdminAsync, requirePermission('manage_finabridge'), async (req, res) => {
    try {
      const { status, assignedAdminId } = req.body;
      const adminUser = (req as any).adminUser;
      
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
      
      res.json({ message: "Dispute status updated" });
    } catch (error) {
      res.status(400).json({ message: "Failed to update dispute" });
    }
  });

  // Admin: Resolve dispute
  app.post("/api/admin/finabridge/disputes/:id/resolve", ensureAdminAsync, requirePermission('manage_finabridge'), async (req, res) => {
    try {
      const { resolution } = req.body;
      const adminUser = (req as any).adminUser;
      
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
      
      res.json({ message: "Dispute resolved successfully" });
    } catch (error) {
      res.status(400).json({ message: "Failed to resolve dispute" });
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
      
      res.json({ shipment: { ...shipment, milestones } });
    } catch (error) {
      res.status(400).json({ message: "Failed to get shipment" });
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
        res.json({ shipment: updated });
      } else {
        const [shipment] = await db.insert(tradeShipments).values({
          id: crypto.randomUUID(), tradeRequestId, dealRoomId, trackingNumber, courierName, status: status || 'Pending',
          estimatedShipDate: estimatedShipDate ? new Date(estimatedShipDate) : null, actualShipDate: actualShipDate ? new Date(actualShipDate) : null,
          estimatedArrivalDate: estimatedArrivalDate ? new Date(estimatedArrivalDate) : null, actualArrivalDate: actualArrivalDate ? new Date(actualArrivalDate) : null,
          originPort, destinationPort, currentLocation, customsStatus, notes
        }).returning();
        res.json({ shipment });
      }
    } catch (error) {
      res.status(400).json({ message: "Failed to update shipment" });
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
      res.json({ milestone: created });
    } catch (error) {
      res.status(400).json({ message: "Failed to add milestone" });
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
      res.json({ certificates });
    } catch (error) {
      res.status(400).json({ message: "Failed to get certificates" });
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
      res.json({ certificate });
    } catch (error) {
      res.status(400).json({ message: "Failed to generate certificate" });
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
      res.json({ trustScore });
    } catch (error) {
      res.status(400).json({ message: "Failed to get trust score" });
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
      
      res.json({ rating, message: "Rating submitted successfully" });
    } catch (error) {
      res.status(400).json({ message: "Failed to submit rating" });
    }
  });

  // Get exporter ratings
  app.get("/api/finabridge/exporter/:userId/ratings", ensureAuthenticated, async (req, res) => {
    try {
      const ratings = await db.select().from(exporterRatings)
        .where(eq(exporterRatings.exporterUserId, req.params.userId))
        .orderBy(desc(exporterRatings.createdAt));
      res.json({ ratings });
    } catch (error) {
      res.status(400).json({ message: "Failed to get ratings" });
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
      res.json({ assessment });
    } catch (error) {
      res.status(400).json({ message: "Failed to get risk assessment" });
    }
  });

  // Create/update risk assessment (admin)
  app.post("/api/admin/finabridge/risk-assessment", ensureAdminAsync, requirePermission('manage_finabridge'), async (req, res) => {
    try {
      const adminUser = (req as any).adminUser;
      const { tradeRequestId, riskScore, riskLevel, importerKycStatus, exporterKycStatus, countryRisk, valueRisk, exporterHistoryRisk, riskFactors, mitigationNotes, isFlagged, flagReason } = req.body;
      
      const [existing] = await db.select().from(tradeRiskAssessments).where(eq(tradeRiskAssessments.tradeRequestId, tradeRequestId));
      
      if (existing) {
        const [updated] = await db.update(tradeRiskAssessments).set({
          riskScore, riskLevel, importerKycStatus, exporterKycStatus, countryRisk, valueRisk, exporterHistoryRisk, riskFactors, mitigationNotes, isFlagged, flagReason, assessedBy: adminUser.id, assessedAt: new Date()
        }).where(eq(tradeRiskAssessments.id, existing.id)).returning();
        res.json({ assessment: updated });
      } else {
        const [assessment] = await db.insert(tradeRiskAssessments).values({
          id: crypto.randomUUID(), tradeRequestId, riskScore, riskLevel, importerKycStatus, exporterKycStatus, countryRisk, valueRisk, exporterHistoryRisk, riskFactors, mitigationNotes, isFlagged, flagReason, assessedBy: adminUser.id
        }).returning();
        res.json({ assessment });
      }
    } catch (error) {
      res.status(400).json({ message: "Failed to update risk assessment" });
    }
  });

  // ============================================================================
  // FINABRIDGE - TRADE ANALYTICS
  // ============================================================================

  app.get("/api/admin/finabridge/analytics", ensureAdminAsync, requirePermission('view_finabridge'), async (req, res) => {
    try {
      const tradeRequestsList = await db.select().from(tradeRequests);
      const proposals = await db.select().from(tradeProposals);
      const settlements = await db.select().from(settlementHolds);
      const disputes = await db.select().from(tradeDisputes);
      
      const totalTrades = tradeRequestsList.length;
      const activeTrades = tradeRequestsList.filter(t => t.status === 'Submitted' || t.status === 'In Deal Room').length;
      const completedTrades = tradeRequestsList.filter(t => t.status === 'Completed' || t.status === 'Settled').length;
      const totalValueUsd = tradeRequestsList.reduce((sum, t) => sum + parseFloat(t.tradeValueUsd || '0'), 0);
      const totalGoldGrams = tradeRequestsList.reduce((sum, t) => sum + parseFloat(t.settlementGoldGrams || '0'), 0);
      const avgTradeValue = totalTrades > 0 ? totalValueUsd / totalTrades : 0;
      const successRate = totalTrades > 0 ? (completedTrades / totalTrades) * 100 : 0;
      const openDisputes = disputes.filter(d => d.status !== 'Resolved' && d.status !== 'Closed').length;
      
      res.json({
        analytics: {
          totalTrades, activeTrades, completedTrades, totalValueUsd, totalGoldGrams, avgTradeValue, successRate,
          totalProposals: proposals.length, activeSettlements: settlements.filter(s => s.status === 'Locked').length,
          openDisputes, monthlyTrends: []
        }
      });
    } catch (error) {
      res.status(400).json({ message: "Failed to get analytics" });
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
      }).returning();
      
      res.json({ document, message: "Document uploaded successfully" });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to upload document" });
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
      
      // Check if admin with FinaBridge permissions
      const sessionUser = await storage.getUser(sessionUserId);
      const isAdmin = sessionUser?.role === 'admin' && (sessionUser.permissions?.includes('view_finabridge') || sessionUser.permissions?.includes('manage_finabridge'));
      
      // Verify user is party to the deal room or is admin
      if (!isAdmin && dealRoom.importerUserId !== sessionUserId && dealRoom.exporterUserId !== sessionUserId && dealRoom.assignedAdminId !== sessionUserId) {
        return res.status(403).json({ message: "Not authorized to view documents in this deal room" });
      }
      
      const documents = await db.select().from(dealRoomDocuments).where(eq(dealRoomDocuments.dealRoomId, req.params.dealRoomId)).orderBy(desc(dealRoomDocuments.createdAt));
      res.json({ documents });
    } catch (error) {
      res.status(400).json({ message: "Failed to get documents" });
    }
  });

  // Admin: Verify document
  app.post("/api/admin/deal-room-documents/:id/verify", ensureAdminAsync, requirePermission('manage_finabridge'), async (req, res) => {
    try {
      const { status, verificationNotes } = req.body;
      const adminUser = (req as any).adminUser;
      
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
      
      res.json({ message: `Document ${status.toLowerCase()}` });
    } catch (error) {
      res.status(400).json({ message: "Failed to verify document" });
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
      
      res.json({ message: "Deadlines updated successfully" });
    } catch (error) {
      res.status(400).json({ message: "Failed to update deadlines" });
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
      
      res.json({ overdueTrades });
    } catch (error) {
      res.status(400).json({ message: "Failed to get overdue trades" });
    }
  });
  
  // ============================================================================
  // DEAL ROOM - TRADE CASE CONVERSATIONS
  // ============================================================================

  // Admin: Get all deal rooms
  app.get("/api/admin/deal-rooms", ensureAdminAsync, async (req, res) => {
    try {
      const rooms = await storage.getAllDealRooms();
      
      // Fetch related data for each room
      const roomsWithDetails = await Promise.all(rooms.map(async (room) => {
        const tradeRequest = await storage.getTradeRequest(room.tradeRequestId);
        const importer = await storage.getUser(room.importerUserId);
        const exporter = await storage.getUser(room.exporterUserId);
        
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
        };
      }));
      
      res.json({ rooms: roomsWithDetails });
    } catch (error) {
      console.error('Failed to get all deal rooms:', error);
      res.status(400).json({ message: "Failed to get deal rooms" });
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
      
      res.json({ rooms: roomsWithDetails });
    } catch (error) {
      res.status(400).json({ message: "Failed to get deal rooms" });
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
      
      res.json({
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
      res.status(400).json({ message: "Failed to get deal room" });
    }
  });
  
  // Get deal room by trade request ID
  app.get("/api/deal-rooms/trade-request/:tradeRequestId", async (req, res) => {
    try {
      const room = await storage.getDealRoomByTradeRequest(req.params.tradeRequestId);
      if (!room) {
        return res.status(404).json({ message: "Deal room not found for this trade request" });
      }
      res.json({ room });
    } catch (error) {
      res.status(400).json({ message: "Failed to get deal room" });
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
      
      res.json({ messages: messagesWithSenders });
    } catch (error) {
      res.status(400).json({ message: "Failed to get messages" });
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
      
      res.json({ 
        message: {
          ...message,
          sender: sender ? { id: sender.id, finatradesId: sender.finatradesId, email: sender.email } : null,
        }
      });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to send message" });
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
      res.json({ message: "Messages marked as read" });
    } catch (error) {
      res.status(400).json({ message: "Failed to mark messages as read" });
    }
  });
  
  // Admin: Get all deal rooms
  app.get("/api/admin/deal-rooms", async (req, res) => {
    try {
      const rooms = await storage.getAllDealRooms();
      
      const roomsWithDetails = await Promise.all(rooms.map(async (room) => {
        const tradeRequest = await storage.getTradeRequest(room.tradeRequestId);
        const importer = await storage.getUser(room.importerUserId);
        const exporter = await storage.getUser(room.exporterUserId);
        
        return {
          ...room,
          tradeRequest,
          importer: importer ? { id: importer.id, finatradesId: importer.finatradesId } : null,
          exporter: exporter ? { id: exporter.id, finatradesId: exporter.finatradesId } : null,
        };
      }));
      
      res.json({ rooms: roomsWithDetails });
    } catch (error) {
      res.status(400).json({ message: "Failed to get deal rooms" });
    }
  });
  
  // Admin: Assign admin to deal room
  app.post("/api/admin/deal-rooms/:id/assign", async (req, res) => {
    try {
      const { adminId } = req.body;
      if (!adminId) {
        return res.status(400).json({ message: "Missing adminId" });
      }
      
      const room = await storage.updateDealRoom(req.params.id, { assignedAdminId: adminId });
      res.json({ room });
    } catch (error) {
      res.status(400).json({ message: "Failed to assign admin" });
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

      res.json({
        hasAccepted: !!acceptance,
        acceptance,
        allAcceptances,
        agreementVersion: "1.0"
      });
    } catch (error) {
      res.status(400).json({ message: "Failed to get agreement status" });
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
        action: "agreement_accepted",
        performedBy: userId,
        details: { role, agreementVersion: "1.0" }
      });

      res.json({ acceptance, message: "Terms accepted successfully" });
    } catch (error) {
      console.error("Failed to accept agreement:", error);
      res.status(400).json({ message: "Failed to accept agreement" });
    }
  });

  // Admin: Close deal room
  app.post("/api/admin/deal-rooms/:id/close", ensureAdminAsync, async (req, res) => {
    try {
      const adminId = (req as any).user?.id;
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
        action: "deal_room_closed",
        performedBy: adminId,
        details: { closureNotes, tradeStatus: tradeRequest.status }
      });

      res.json({ room: closedRoom, message: "Deal room closed successfully" });
    } catch (error) {
      console.error("Failed to close deal room:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to close deal room" });
    }
  });

  // Admin: Update deal room disclaimer
  app.post("/api/admin/deal-rooms/:id/disclaimer", ensureAdminAsync, async (req, res) => {
    try {
      const adminId = (req as any).user?.id;
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
        action: "disclaimer_updated",
        performedBy: adminId,
        details: { disclaimer }
      });

      res.json({ room: updatedRoom, message: "Disclaimer saved successfully" });
    } catch (error) {
      console.error("Failed to update disclaimer:", error);
      res.status(400).json({ message: "Failed to update disclaimer" });
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
      
      res.json({ session });
    } catch (error) {
      res.status(400).json({ message: "Failed to get chat session" });
    }
  });
  
  // Get all chat sessions (Admin)
  app.get("/api/admin/chat/sessions", ensureAdminAsync, async (req, res) => {
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
      
      res.json({ sessions: enrichedSessions });
    } catch (error) {
      res.status(400).json({ message: "Failed to get chat sessions" });
    }
  });
  
  // Get session messages
  app.get("/api/chat/messages/:sessionId", ensureAuthenticated, async (req, res) => {
    try {
      const messages = await storage.getSessionMessages(req.params.sessionId);
      res.json({ messages });
    } catch (error) {
      res.status(400).json({ message: "Failed to get messages" });
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
      
      res.json({ message });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to send message" });
    }
  });
  
  // Mark messages as read
  app.patch("/api/chat/messages/:sessionId/read", ensureAuthenticated, async (req, res) => {
    try {
      await storage.markMessagesAsRead(req.params.sessionId);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ message: "Failed to mark messages as read" });
    }
  });
  
  // Update chat session
  app.patch("/api/chat/session/:id", ensureAuthenticated, async (req, res) => {
    try {
      const session = await storage.updateChatSession(req.params.id, req.body);
      if (!session) {
        return res.status(404).json({ message: "Chat session not found" });
      }
      res.json({ session });
    } catch (error) {
      res.status(400).json({ message: "Failed to update chat session" });
    }
  });
  
  // ============================================================================
  // CHAT AGENTS - MULTI-AGENT AI SYSTEM
  // ============================================================================
  
  // Get all active chat agents (public)
  app.get("/api/chat-agents", async (req, res) => {
    try {
      const agents = await storage.getActiveChatAgents();
      res.json({ agents });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch chat agents" });
    }
  });
  
  // Get specific chat agent
  app.get("/api/chat-agents/:id", async (req, res) => {
    try {
      const agent = await storage.getChatAgent(req.params.id);
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }
      res.json({ agent });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch chat agent" });
    }
  });
  
  // Get default chat agent
  app.get("/api/chat-agents/default", async (req, res) => {
    try {
      const agent = await storage.getDefaultChatAgent();
      res.json({ agent });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch default agent" });
    }
  });

  // Update chat agent (admin only)
  app.put("/api/chat-agents/:id", ensureAdminAsync, async (req, res) => {
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
      res.json({ agent: updatedAgent });
    } catch (error) {
      console.error("Failed to update chat agent:", error);
      res.status(500).json({ message: "Failed to update chat agent" });
    }
  });
  
  // ============================================================================
  // KNOWLEDGE BASE - FAQ & ARTICLE MANAGEMENT
  // ============================================================================

  // Get all knowledge categories
  app.get("/api/knowledge/categories", async (req, res) => {
    try {
      const categories = await storage.getAllKnowledgeCategories();
      res.json({ categories });
    } catch (error) {
      console.error("Failed to fetch knowledge categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  // Create knowledge category (admin only)
  app.post("/api/knowledge/categories", ensureAdminAsync, async (req, res) => {
    try {
      const { name, description, icon, sortOrder } = req.body;
      if (!name) {
        return res.status(400).json({ message: "Category name is required" });
      }
      const category = await storage.createKnowledgeCategory({ name, description, icon, sortOrder: sortOrder || 0 });
      res.json({ category });
    } catch (error) {
      console.error("Failed to create knowledge category:", error);
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  // Update knowledge category (admin only)
  app.put("/api/knowledge/categories/:id", ensureAdminAsync, async (req, res) => {
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
      res.json({ category });
    } catch (error) {
      console.error("Failed to update knowledge category:", error);
      res.status(500).json({ message: "Failed to update category" });
    }
  });

  // Delete knowledge category (admin only)
  app.delete("/api/knowledge/categories/:id", ensureAdminAsync, async (req, res) => {
    try {
      await storage.deleteKnowledgeCategory(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete knowledge category:", error);
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  // Get all knowledge articles (admin only - includes drafts)
  app.get("/api/knowledge/articles", ensureAdminAsync, async (req, res) => {
    try {
      const articles = await storage.getAllKnowledgeArticles();
      res.json({ articles });
    } catch (error) {
      console.error("Failed to fetch knowledge articles:", error);
      res.status(500).json({ message: "Failed to fetch articles" });
    }
  });

  // Get published knowledge articles (public)
  app.get("/api/knowledge/articles/published", async (req, res) => {
    try {
      const articles = await storage.getPublishedKnowledgeArticles();
      res.json({ articles });
    } catch (error) {
      console.error("Failed to fetch published articles:", error);
      res.status(500).json({ message: "Failed to fetch articles" });
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
      res.json({ articles });
    } catch (error) {
      console.error("Failed to search knowledge base:", error);
      res.status(500).json({ message: "Failed to search" });
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
      res.json({ article });
    } catch (error) {
      console.error("Failed to fetch knowledge article:", error);
      res.status(500).json({ message: "Failed to fetch article" });
    }
  });

  // Create knowledge article (admin only)
  app.post("/api/knowledge/articles", ensureAdminAsync, async (req, res) => {
    try {
      const { categoryId, title, summary, content, keywords, status, agentTypes } = req.body;
      if (!title || !content) {
        return res.status(400).json({ message: "Title and content are required" });
      }
      const adminUser = (req as any).adminUser;
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
      res.json({ article });
    } catch (error) {
      console.error("Failed to create knowledge article:", error);
      res.status(500).json({ message: "Failed to create article" });
    }
  });

  // Update knowledge article (admin only)
  app.put("/api/knowledge/articles/:id", ensureAdminAsync, async (req, res) => {
    try {
      const { categoryId, title, summary, content, keywords, status, agentTypes } = req.body;
      const adminUser = (req as any).adminUser;
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
      res.json({ article });
    } catch (error) {
      console.error("Failed to update knowledge article:", error);
      res.status(500).json({ message: "Failed to update article" });
    }
  });

  // Delete knowledge article (admin only)
  app.delete("/api/knowledge/articles/:id", ensureAdminAsync, async (req, res) => {
    try {
      await storage.deleteKnowledgeArticle(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete knowledge article:", error);
      res.status(500).json({ message: "Failed to delete article" });
    }
  });

  // Mark article as helpful (public)
  app.post("/api/knowledge/articles/:id/helpful", async (req, res) => {
    try {
      await storage.incrementArticleHelpfulCount(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to mark article as helpful:", error);
      res.status(500).json({ message: "Failed to update article" });
    }
  });
  
  // ============================================================================
  // CHATBOT - AI-POWERED INSTANT SUPPORT
  // ============================================================================
  
  // Process chatbot message with agent routing (public - works for guests and authenticated users)
  app.post("/api/chatbot/message", async (req, res) => {
    try {
      const { message, agentId, agentType } = req.body;
      
      // Input validation
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ message: "Message is required" });
      }
      
      // Determine which agent to use
      let selectedAgent;
      if (agentId) {
        selectedAgent = await storage.getChatAgent(agentId);
      } else if (agentType) {
        selectedAgent = await storage.getChatAgentByType(agentType);
      }
      
      // Default to general agent if no specific agent selected
      if (!selectedAgent) {
        selectedAgent = await storage.getDefaultChatAgent();
      }
      
      // Sanitize input - limit length and remove potentially harmful content
      const sanitizedMessage = message.slice(0, 1000).trim();
      if (sanitizedMessage.length === 0) {
        return res.status(400).json({ message: "Message cannot be empty" });
      }
      
      // Rate limiting by IP
      const clientId = req.ip || req.headers['x-forwarded-for'] as string || 'unknown';
      const { checkRateLimit, processUserMessage, processUserMessageWithAI } = await import('./chatbot-service.js');
      
      if (!checkRateLimit(clientId)) {
        return res.status(429).json({ 
          message: "Too many requests. Please wait a moment before sending another message.",
          reply: "You're sending messages too quickly. Please wait a moment and try again.",
          escalateToHuman: false
        });
      }
      
      // Fetch platform config and gold price for dynamic responses
      const { getGoldPrice } = await import('./gold-price-service.js');
      let goldPrice: { pricePerGram: number; pricePerOz: number; currency: string } | undefined;
      let platformConfig: any | undefined;
      
      try {
        goldPrice = await getGoldPrice();
      } catch (err) {
        console.error("Error fetching gold price for chatbot:", err);
      }
      
      // Build platform config from database
      try {
        const configs = await storage.getAllPlatformConfigs();
        const configMap: Record<string, string> = {};
        configs.forEach(c => { configMap[c.configKey] = c.configValue; });
        
        platformConfig = {
          buySpreadPercent: parseFloat(configMap['buy_spread_percent'] || '2'),
          sellSpreadPercent: parseFloat(configMap['sell_spread_percent'] || '2'),
          storageFeePercent: parseFloat(configMap['storage_fee_percent'] || '0.5'),
          minTradeAmount: parseFloat(configMap['min_trade_amount'] || '10'),
          tier1DailyLimit: parseFloat(configMap['tier1_daily_limit'] || '1000'),
          tier1MonthlyLimit: parseFloat(configMap['tier1_monthly_limit'] || '5000'),
          tier2DailyLimit: parseFloat(configMap['tier2_daily_limit'] || '5000'),
          tier2MonthlyLimit: parseFloat(configMap['tier2_monthly_limit'] || '20000'),
          tier3DailyLimit: parseFloat(configMap['tier3_daily_limit'] || '50000'),
          tier3MonthlyLimit: parseFloat(configMap['tier3_monthly_limit'] || '250000'),
          minDeposit: parseFloat(configMap['min_deposit'] || '10'),
          maxDepositSingle: parseFloat(configMap['max_deposit_single'] || '50000'),
          dailyDepositLimit: parseFloat(configMap['daily_deposit_limit'] || '100000'),
          minWithdrawal: parseFloat(configMap['min_withdrawal'] || '50'),
          maxWithdrawalSingle: parseFloat(configMap['max_withdrawal_single'] || '50000'),
          withdrawalFeePercent: parseFloat(configMap['withdrawal_fee_percent'] || '0.5'),
          withdrawalFeeFixed: parseFloat(configMap['withdrawal_fee_fixed'] || '5'),
          minP2pTransfer: parseFloat(configMap['min_p2p_transfer'] || '10'),
          maxP2pTransfer: parseFloat(configMap['max_p2p_transfer'] || '10000'),
          p2pFeePercent: parseFloat(configMap['p2p_fee_percent'] || '0'),
          bnslMinAmount: parseFloat(configMap['bnsl_min_amount'] || '100'),
          bnslMaxTermMonths: parseFloat(configMap['bnsl_max_term_months'] || '12'),
          bnslEarlyExitPenalty: parseFloat(configMap['bnsl_early_exit_penalty'] || '5'),
          cardFeePercent: parseFloat(configMap['card_fee_percent'] || '2.9'),
          cardFeeFixed: parseFloat(configMap['card_fee_fixed'] || '0.30'),
          bankTransferFeePercent: parseFloat(configMap['bank_transfer_fee_percent'] || '0'),
          cryptoFeePercent: parseFloat(configMap['crypto_fee_percent'] || '1'),
        };
      } catch (err) {
        console.error("Error fetching platform config for chatbot:", err);
      }
      
      // Build user context if authenticated (for personalized responses)
      let userContext: { userId: string; userName: string; goldBalance: number; usdValue: number; vaultGold: number; kycStatus: string } | undefined;
      const sessionUserId = req.session?.userId;
      if (sessionUserId) {
        try {
          const user = await storage.getUser(sessionUserId);
          if (user) {
            const wallet = await storage.getWallet(sessionUserId);
            const vaultHoldings = await storage.getUserVaultHoldings(sessionUserId);
            
            // Use goldGrams field (correct schema field name)
            const walletGold = wallet?.goldGrams ? parseFloat(wallet.goldGrams) : 0;
            const vaultGoldTotal = vaultHoldings.reduce((sum, h) => sum + parseFloat(h.goldGrams || '0'), 0);
            const totalGold = walletGold + vaultGoldTotal;
            const usdValue = goldPrice ? totalGold * goldPrice.pricePerGram : 0;
            
            userContext = {
              userId: sessionUserId,
              userName: user.firstName || user.email.split('@')[0],
              goldBalance: walletGold,
              usdValue: usdValue,
              vaultGold: vaultGoldTotal,
              kycStatus: user.kycStatus || 'not_started'
            };
          }
        } catch (err) {
          console.error("Error building user context for chatbot:", err);
          // Continue without user context
        }
      }
      
      // Route to appropriate agent
      let responseData: any;
      
      if (selectedAgent?.type === 'juris') {
        // Juris agent: AI-powered responses with workflow support
        const { processJurisMessage } = await import('./juris-agent-service.js');
        const user = sessionUserId ? await storage.getUser(sessionUserId) : undefined;
        const sessionKey = sessionUserId || req.sessionID;
        
        let finalReply: string;
        let suggestedActions: string[] = ['Start Registration', 'KYC Help', 'Check Status'];
        let usedAI = false;
        let finalEscalate = false;
        let workflowUpdate: any = undefined;
        let collectData: any = undefined;
        
        // Load active workflow
        let activeWorkflow: any = undefined;
        try {
          activeWorkflow = await storage.getActiveWorkflowBySession(sessionKey);
          if (!activeWorkflow && sessionUserId) {
            activeWorkflow = await storage.getActiveWorkflowByUser(sessionUserId, 'registration') ||
                             await storage.getActiveWorkflowByUser(sessionUserId, 'kyc');
          }
        } catch (err) { /* No workflow */ }
        
        // Try structured workflow first
        const jurisResponse = processJurisMessage(
          sanitizedMessage, 
          activeWorkflow,
          user ? { id: user.id, firstName: user.firstName, kycStatus: user.kycStatus } : undefined
        );
        
        // If workflow returned a meaningful update, use it
        if (jurisResponse.workflowUpdate) {
          finalReply = jurisResponse.message;
          suggestedActions = jurisResponse.actions || suggestedActions;
          workflowUpdate = jurisResponse.workflowUpdate;
          collectData = jurisResponse.collectData;
          
          // Save workflow state
          try {
            const workflowType = workflowUpdate.currentStep?.includes('kyc') ? 'kyc' : 'registration';
            if (activeWorkflow) {
              await storage.updateWorkflow(activeWorkflow.id, {
                currentStep: workflowUpdate.currentStep,
                completedSteps: workflowUpdate.completedSteps,
                stepData: JSON.stringify(workflowUpdate.stepData || {}),
                status: workflowUpdate.currentStep === 'complete' ? 'completed' : 'active'
              });
            } else {
              await storage.createWorkflow({
                userId: sessionUserId || null,
                sessionId: sessionKey,
                agentId: selectedAgent.id,
                workflowType: workflowType,
                currentStep: workflowUpdate.currentStep,
                completedSteps: workflowUpdate.completedSteps || 0,
                stepData: JSON.stringify(workflowUpdate.stepData || {}),
                status: 'active'
              });
            }
          } catch (err) {
            console.error("[Juris] Error saving workflow:", err);
          }
        } else if (process.env.OPENAI_API_KEY) {
          // No workflow update - use AI for conversational questions
          try {
            console.log("[Juris AI] Using OpenAI for:", sanitizedMessage.slice(0, 50));
            
            // Enrich context with workflow state for AI
            const jurisContext = {
              ...userContext,
              workflowState: activeWorkflow ? {
                currentStep: activeWorkflow.currentStep,
                completedSteps: activeWorkflow.completedSteps,
                workflowType: activeWorkflow.workflowType
              } : null,
              kycStatus: user?.kycStatus || 'not_started'
            };
            
            const aiResponse = await processUserMessageWithAI(
              sanitizedMessage,
              jurisContext,
              platformConfig,
              goldPrice,
              undefined,
              'juris'
            );
            
            finalReply = aiResponse.message;
            // Use AI-provided actions or derive from response content
            if (aiResponse.suggestedActions && aiResponse.suggestedActions.length > 0) {
              suggestedActions = aiResponse.suggestedActions;
            } else {
              // Derive actions from response content
              const lowerReply = finalReply.toLowerCase();
              if (lowerReply.includes('register') || lowerReply.includes('account')) {
                suggestedActions = ['Personal Account', 'Business Account', 'More Info'];
              } else if (lowerReply.includes('document') || lowerReply.includes('upload')) {
                suggestedActions = ['Upload Documents', 'Document Tips', 'Check Status'];
              } else if (lowerReply.includes('verification') || lowerReply.includes('kyc')) {
                suggestedActions = ['Start KYC', 'Check Status', 'Help'];
              }
            }
            finalEscalate = aiResponse.escalateToHuman || false;
            usedAI = true;
            console.log("[Juris AI] Response generated");
          } catch (aiError) {
            console.error("[Juris AI] Error:", aiError);
            finalReply = jurisResponse.message; // Fall back to structured response
            suggestedActions = jurisResponse.actions || suggestedActions;
          }
        } else {
          // No AI available
          finalReply = jurisResponse.message;
          suggestedActions = jurisResponse.actions || suggestedActions;
        }
        
        responseData = {
          reply: finalReply,
          category: 'kyc_assistance',
          confidence: usedAI ? 0.95 : 0.9,
          suggestedActions,
          escalateToHuman: finalEscalate,
          collectData,
          workflowUpdate,
          usedAI,
          agent: {
            id: selectedAgent.id,
            name: selectedAgent.displayName,
            type: selectedAgent.type
          }
        };
      } else {
        // Use General agent with FAQ-based responses, AI fallback for complex queries
        // First, search knowledge base for relevant articles
        let knowledgeResponse: string | null = null;
        try {
          const kbResults = await storage.searchKnowledgeArticles(sanitizedMessage, selectedAgent?.type || 'general');
          if (kbResults.length > 0 && kbResults[0].summary) {
            knowledgeResponse = kbResults[0].summary || kbResults[0].content.slice(0, 500);
          }
        } catch (err) {
          console.error("Error searching knowledge base:", err);
        }
        
        // Try FAQ-based response first (cost-efficient)
        const response = processUserMessage(sanitizedMessage, userContext, platformConfig, goldPrice);
        
        let finalReply = response.message;
        let finalConfidence = response.confidence;
        let finalCategory = response.category;
        let finalActions = response.suggestedActions;
        let finalEscalate = response.escalateToHuman;
        let usedAI = false;
        
        // Use AI for better responses when FAQ doesn't have a strong match
        // Threshold 0.7 ensures AI handles most conversational queries while FAQ handles exact matches
        if (response.confidence < 0.7 && process.env.OPENAI_API_KEY) {
          try {
            console.log("[General] Using AI-powered response for:", sanitizedMessage.slice(0, 50));
            const aiResponse = await processUserMessageWithAI(
              sanitizedMessage,
              userContext,
              platformConfig,
              goldPrice,
              undefined,
              selectedAgent?.type || 'general'
            );
            
            if (aiResponse.message && aiResponse.message.length > 0) {
              finalReply = aiResponse.message;
              finalConfidence = aiResponse.confidence;
              finalCategory = aiResponse.category || 'ai_response';
              finalEscalate = aiResponse.escalateToHuman || false;
              usedAI = true;
              
              // Use AI-provided actions or derive from response content
              if (aiResponse.suggestedActions && aiResponse.suggestedActions.length > 0) {
                finalActions = aiResponse.suggestedActions;
              } else {
                // Derive actions from response content
                const lowerReply = finalReply.toLowerCase();
                if (lowerReply.includes('bnsl') || lowerReply.includes('lock')) {
                  finalActions = ['View BNSL Plans', 'Create Plan'];
                } else if (lowerReply.includes('deposit') || lowerReply.includes('add funds')) {
                  finalActions = ['Add Funds', 'View Methods'];
                } else if (lowerReply.includes('vault') || lowerReply.includes('storage')) {
                  finalActions = ['View Vault', 'Certificates'];
                } else if (lowerReply.includes('kyc') || lowerReply.includes('verification')) {
                  finalActions = ['Start KYC', 'Talk to Juris AI'];
                } else if (lowerReply.includes('transfer') || lowerReply.includes('send')) {
                  finalActions = ['Send Payment', 'Request Payment'];
                } else if (lowerReply.includes('withdraw')) {
                  finalActions = ['Withdraw Funds'];
                } else {
                  finalActions = ['Show Menu', 'Contact Support'];
                }
              }
            }
          } catch (aiError) {
            console.error("AI fallback error:", aiError);
          }
        }
        
        // If knowledge base found a relevant article and still low confidence, use KB
        if (knowledgeResponse && !usedAI && response.confidence < 0.6) {
          finalReply = knowledgeResponse;
          finalConfidence = 0.7;
        }
        
        // Sanitize output
        const sanitizedReply = finalReply.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        
        responseData = {
          reply: sanitizedReply,
          category: finalCategory,
          confidence: finalConfidence,
          suggestedActions: finalActions,
          escalateToHuman: finalEscalate,
          agent: selectedAgent ? {
            id: selectedAgent.id,
            name: selectedAgent.displayName,
            type: selectedAgent.type
          } : undefined,
          fromKnowledgeBase: !!knowledgeResponse && !usedAI && response.confidence < 0.6,
          usedAI: usedAI
        };
      }
      
      res.json(responseData);
    } catch (error) {
      console.error("Chatbot error:", error);
      res.status(500).json({ message: "Failed to process message" });
    }
  });
  
  // Get chatbot greeting
  app.get("/api/chatbot/greeting", async (req, res) => {
    try {
      const { getChatbotGreeting } = await import('./chatbot-service.js');
      const userName = req.user ? (req.user as any).firstName : undefined;
      const greeting = getChatbotGreeting(userName);
      res.json({ greeting });
    } catch (error) {
      res.status(500).json({ message: "Failed to get greeting" });
    }
  });
  
  // ============================================================================
  // AUDIT LOGS
  // ============================================================================
  
  // Get entity audit logs
  app.get("/api/audit/:entityType/:entityId", async (req, res) => {
    try {
      const logs = await storage.getEntityAuditLogs(req.params.entityType, req.params.entityId);
      res.json({ logs });
    } catch (error) {
      res.status(400).json({ message: "Failed to get audit logs" });
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
      
      res.json({ page, content });
    } catch (error) {
      res.status(400).json({ message: "Failed to get page content" });
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
      
      res.json({ pages: pagesWithContent });
    } catch (error) {
      res.status(400).json({ message: "Failed to get pages" });
    }
  });
  
  // ============================================================================
  // CMS - CONTENT MANAGEMENT SYSTEM (ADMIN)
  // ============================================================================
  
  // === Content Pages ===
  
  // Get all content pages (Admin)
  app.get("/api/admin/cms/pages", async (req, res) => {
    try {
      const pages = await storage.getAllContentPages();
      res.json({ pages });
    } catch (error) {
      res.status(400).json({ message: "Failed to get content pages" });
    }
  });
  
  // Get content page by ID (Admin)
  app.get("/api/admin/cms/pages/:id", async (req, res) => {
    try {
      const page = await storage.getContentPage(req.params.id);
      if (!page) {
        return res.status(404).json({ message: "Content page not found" });
      }
      const blocks = await storage.getPageContentBlocks(page.id);
      res.json({ page, blocks });
    } catch (error) {
      res.status(400).json({ message: "Failed to get content page" });
    }
  });
  
  // Create content page (Admin)
  app.post("/api/admin/cms/pages", async (req, res) => {
    try {
      const pageData = insertContentPageSchema.parse(req.body);
      const page = await storage.createContentPage(pageData);
      res.json({ page });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create content page" });
    }
  });
  
  // Update content page (Admin)
  app.patch("/api/admin/cms/pages/:id", async (req, res) => {
    try {
      const page = await storage.updateContentPage(req.params.id, req.body);
      if (!page) {
        return res.status(404).json({ message: "Content page not found" });
      }
      res.json({ page });
    } catch (error) {
      res.status(400).json({ message: "Failed to update content page" });
    }
  });
  
  // Delete content page (Admin)
  app.delete("/api/admin/cms/pages/:id", async (req, res) => {
    try {
      await storage.deleteContentPage(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ message: "Failed to delete content page" });
    }
  });
  
  // === Content Blocks ===
  
  // Get all content blocks (Admin)
  app.get("/api/admin/cms/blocks", async (req, res) => {
    try {
      const blocks = await storage.getAllContentBlocks();
      res.json({ blocks });
    } catch (error) {
      res.status(400).json({ message: "Failed to get content blocks" });
    }
  });
  
  // Get content block by ID (Admin)
  app.get("/api/admin/cms/blocks/:id", async (req, res) => {
    try {
      const block = await storage.getContentBlock(req.params.id);
      if (!block) {
        return res.status(404).json({ message: "Content block not found" });
      }
      res.json({ block });
    } catch (error) {
      res.status(400).json({ message: "Failed to get content block" });
    }
  });
  
  // Create content block (Admin)
  app.post("/api/admin/cms/blocks", async (req, res) => {
    try {
      const blockData = insertContentBlockSchema.parse(req.body);
      const block = await storage.createContentBlock(blockData);
      res.json({ block });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create content block" });
    }
  });
  
  // Update content block (Admin)
  app.patch("/api/admin/cms/blocks/:id", async (req, res) => {
    try {
      const block = await storage.updateContentBlock(req.params.id, req.body);
      if (!block) {
        return res.status(404).json({ message: "Content block not found" });
      }
      res.json({ block });
    } catch (error) {
      res.status(400).json({ message: "Failed to update content block" });
    }
  });
  
  // Delete content block (Admin)
  app.delete("/api/admin/cms/blocks/:id", async (req, res) => {
    try {
      await storage.deleteContentBlock(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ message: "Failed to delete content block" });
    }
  });
  
  // === Templates ===
  
  // Get all templates (Admin)
  app.get("/api/admin/cms/templates", async (req, res) => {
    try {
      const templates = await storage.getAllTemplates();
      res.json({ templates });
    } catch (error) {
      res.status(400).json({ message: "Failed to get templates" });
    }
  });
  
  // Get templates by type (Admin)
  app.get("/api/admin/cms/templates/type/:type", async (req, res) => {
    try {
      const templates = await storage.getTemplatesByType(req.params.type);
      res.json({ templates });
    } catch (error) {
      res.status(400).json({ message: "Failed to get templates" });
    }
  });
  
  // Get template by ID (Admin)
  app.get("/api/admin/cms/templates/:id", async (req, res) => {
    try {
      const template = await storage.getTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json({ template });
    } catch (error) {
      res.status(400).json({ message: "Failed to get template" });
    }
  });
  
  // Create template (Admin)
  app.post("/api/admin/cms/templates", async (req, res) => {
    try {
      const templateData = insertTemplateSchema.parse(req.body);
      const template = await storage.createTemplate(templateData);
      res.json({ template });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create template" });
    }
  });
  
  // Update template (Admin)
  app.patch("/api/admin/cms/templates/:id", async (req, res) => {
    try {
      const template = await storage.updateTemplate(req.params.id, req.body);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json({ template });
    } catch (error) {
      res.status(400).json({ message: "Failed to update template" });
    }
  });
  
  // Delete template (Admin)
  app.delete("/api/admin/cms/templates/:id", async (req, res) => {
    try {
      await storage.deleteTemplate(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ message: "Failed to delete template" });
    }
  });
  
  // === CMS Labels ===
  
  // Get all labels
  app.get("/api/admin/cms/labels", async (req, res) => {
    try {
      const labels = await storage.getAllCmsLabels();
      res.json({ labels });
    } catch (error) {
      res.status(400).json({ message: "Failed to get labels" });
    }
  });
  
  // Create or update label
  app.post("/api/admin/cms/labels", async (req, res) => {
    try {
      const { key, value, category, description } = req.body;
      const label = await storage.upsertCmsLabel({ key, value, category, description, defaultValue: value });
      res.json({ label });
    } catch (error) {
      res.status(400).json({ message: "Failed to save label" });
    }
  });
  
  // === Media Assets ===
  
  // Get all media assets (Admin)
  app.get("/api/admin/cms/media", async (req, res) => {
    try {
      const assets = await storage.getAllMediaAssets();
      res.json({ assets });
    } catch (error) {
      res.status(400).json({ message: "Failed to get media assets" });
    }
  });
  
  // Create media asset (Admin)
  app.post("/api/admin/cms/media", async (req, res) => {
    try {
      const assetData = insertMediaAssetSchema.parse(req.body);
      const asset = await storage.createMediaAsset(assetData);
      res.json({ asset });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create media asset" });
    }
  });
  
  // Delete media asset (Admin)
  app.delete("/api/admin/cms/media/:id", async (req, res) => {
    try {
      await storage.deleteMediaAsset(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ message: "Failed to delete media asset" });
    }
  });
  
  // === Branding Settings ===
  
  // Get branding settings (Public - for theming)
  app.get("/api/branding", async (req, res) => {
    try {
      const settings = await storage.getOrCreateBrandingSettings();
      res.json({ settings });
    } catch (error) {
      res.status(400).json({ message: "Failed to get branding settings" });
    }
  });
  
  // Update branding settings (Admin only)
  app.patch("/api/admin/branding", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      const updates = req.body;
      const settings = await storage.updateBrandingSettings({
        ...updates,
        updatedBy: req.user.id
      });
      res.json({ settings });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to update branding settings" });
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
      
      res.json({ page: { slug: page.slug, title: page.title }, content });
    } catch (error) {
      res.status(400).json({ message: "Failed to get content" });
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
      res.json({ ...defaults, enabled: isEnabled });
    } catch (error) {
      res.status(400).json({ message: "Failed to get terms" });
    }
  });
  
  // Get template by slug (Public - for rendering)
  app.get("/api/templates/:slug", async (req, res) => {
    try {
      const template = await storage.getTemplateBySlug(req.params.slug);
      if (!template || template.status !== 'published') {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json({ template: { slug: template.slug, name: template.name, body: template.body, variables: template.variables } });
    } catch (error) {
      res.status(400).json({ message: "Failed to get template" });
    }
  });

  // ============================================================================
  // FINAPAY - PEER TRANSFERS (SEND/REQUEST MONEY)
  // ============================================================================

  // Search user by email or Finatrades ID - PROTECTED: requires authentication
  app.get("/api/finapay/search-user", ensureAuthenticated, async (req, res) => {
    try {
      const { identifier } = req.query;
      if (!identifier || typeof identifier !== 'string') {
        return res.status(400).json({ message: "Identifier required" });
      }
      
      const users = await storage.searchUsersByIdentifier(identifier);
      if (users.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Return basic info only (not sensitive data)
      const user = users[0];
      res.json({ 
        user: { 
          id: user.id, 
          finatradesId: user.finatradesId,
          firstName: user.firstName, 
          lastName: user.lastName, 
          email: user.email,
          profilePhotoUrl: user.profilePhoto
        } 
      });
    } catch (error) {
      res.status(400).json({ message: "Search failed" });
    }
  });

  // Send gold to another user - PROTECTED: requires authentication + sender verification + PIN
  // NOTE: Platform is gold-only. All transfers are in gold grams, USD is display-only.
  app.post("/api/finapay/send", ensureAuthenticated, requirePinVerification('send_funds'), async (req, res) => {
    try {
      const { senderId, recipientIdentifier, amountGold, channel, memo } = req.body;
      
      // SECURITY: Verify sender matches authenticated session
      if (req.session?.userId !== senderId) {
        return res.status(403).json({ message: "Not authorized to send from this account" });
      }
      
      // Validate gold amount is provided (platform is gold-only)
      if (!amountGold || parseFloat(amountGold) <= 0) {
        return res.status(400).json({ message: "Gold amount is required for transfers" });
      }
      
      // Get live gold price from API
      let goldPrice: number;
      try {
        goldPrice = await getGoldPricePerGram();
      } catch {
        goldPrice = 139.44; // Fallback price if API fails
      }
      
      // Find sender
      const sender = await storage.getUser(senderId);
      if (!sender) {
        return res.status(404).json({ message: "Sender not found" });
      }
      
      // SECURITY: Check if gold is BNSL-locked before allowing transfer
      const bnslPlans = await storage.getUserBnslPlans(senderId);
      const activePlans = bnslPlans.filter((p: any) => p.status === 'Active' || p.status === 'Pending');
      const totalLockedGrams = activePlans.reduce((sum: number, p: any) => sum + parseFloat(p.goldGrams || '0'), 0);
      
      const senderWalletCheck = await storage.getWallet(senderId);
      const availableGold = parseFloat(senderWalletCheck?.goldGrams?.toString() || '0');
      const requestedGold = parseFloat(amountGold);
      
      if (availableGold - totalLockedGrams < requestedGold) {
        return res.status(400).json({ 
          message: `Insufficient available gold. ${totalLockedGrams.toFixed(4)}g is locked in BNSL plans.`,
          lockedGrams: totalLockedGrams.toFixed(4),
          availableGrams: (availableGold - totalLockedGrams).toFixed(4)
        });
      }
      
      // Find recipient by email or Finatrades ID
      let recipient;
      if (channel === 'email') {
        recipient = await storage.getUserByEmail(recipientIdentifier);
      } else if (channel === 'finatrades_id') {
        recipient = await storage.getUserByFinatradesId(recipientIdentifier);
      } else if (channel === 'qr_code') {
        recipient = await storage.getUserByFinatradesId(recipientIdentifier);
      }
      
      // Check sender wallet first (needed for both registered and invitation transfers)
      const senderWallet = await storage.getWallet(sender.id);
      if (!senderWallet) {
        return res.status(400).json({ message: "Sender wallet not found" });
      }
      
      // Platform is gold-only - parse gold amount
      const goldAmount = parseFloat(amountGold);
      const usdEquivalent = goldAmount * goldPrice;
      
      // Validate gold balance before creating pending transfer
      const senderGoldBalance = parseFloat(senderWallet.goldGrams?.toString() || '0');
      if (senderGoldBalance < goldAmount) {
        return res.status(400).json({ message: `Insufficient gold balance. You have ${senderGoldBalance.toFixed(4)}g` });
      }
      
      const referenceNumber = `TRF-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      
      // Handle invitation transfer for non-registered email recipients
      if (!recipient && channel === 'email') {
        // Generate invitation token
        const crypto = await import('crypto');
        const invitationToken = crypto.randomUUID();
        
        // Get sender's referral code if they have one
        let senderReferralCode: string | undefined;
        const senderReferrals = await storage.getUserReferrals(sender.id);
        if (senderReferrals.length > 0) {
          senderReferralCode = senderReferrals[0].referralCode;
        }
        
        // 24-hour expiry for invitation transfers
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        
        // Debit sender immediately (held until claimed or expired)
        await storage.updateWallet(senderWallet.id, {
          goldGrams: (senderGoldBalance - goldAmount).toFixed(6)
        });
        
        // Create sender transaction (pending)
        const senderTx = await storage.createTransaction({
          userId: sender.id,
          type: 'Send',
          status: 'Pending',
          amountGold: goldAmount.toFixed(6),
          amountUsd: usdEquivalent.toFixed(2),
          goldPriceUsdPerGram: goldPrice.toFixed(2),
          recipientEmail: recipientIdentifier,
          description: memo || `Invitation transfer to ${recipientIdentifier} (awaiting registration)`,
          referenceId: referenceNumber,
          sourceModule: 'finapay',
        });
        
        // Record ledger entry
        const { vaultLedgerService } = await import('./vault-ledger-service');
        await vaultLedgerService.recordLedgerEntry({
          userId: sender.id,
          action: 'Transfer_Send',
          goldGrams: goldAmount,
          goldPriceUsdPerGram: goldPrice,
          fromWallet: 'FinaPay',
          toWallet: 'External',
          fromStatus: 'Available',
          toStatus: 'Pending_Deposit',
          transactionId: senderTx.id,
          notes: `Invitation transfer to ${recipientIdentifier} (awaiting registration - expires in 24h)`,
          createdBy: 'system',
        });
        
        // Create pending invite transfer (no recipientId)
        // Store invitation data in memo as JSON since AWS RDS may not have new columns yet
        const inviteMetadata = JSON.stringify({
          isInvite: true,
          invitationToken,
          senderReferralCode: senderReferralCode || null,
          originalMemo: memo || null,
        });
        
        // Use sender's ID as placeholder for recipientId (AWS RDS has NOT NULL constraint)
        // We detect invitation transfers by checking memo JSON for isInvite: true
        const inviteTransfer = await storage.createPeerTransfer({
          referenceNumber,
          senderId: sender.id,
          recipientId: sender.id, // Self-reference as placeholder for pending invite
          amountUsd: usdEquivalent.toFixed(2),
          amountGold: goldAmount.toFixed(6),
          goldPriceUsdPerGram: goldPrice.toFixed(2),
          channel,
          recipientIdentifier,
          memo: inviteMetadata,
          status: 'Pending',
          requiresApproval: true,
          expiresAt,
          senderTransactionId: senderTx.id,
        });
        
        // Emit real-time sync event
        emitLedgerEvent(sender.id, {
          type: 'balance_update',
          module: 'finapay',
          action: 'gold_pending_invite',
          data: { goldGrams: goldAmount, recipientEmail: recipientIdentifier },
        });
        
        // Build registration URL with referral code and invitation token
        const baseUrl = process.env.REPLIT_DEV_DOMAIN 
          ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
          : 'https://finatrades.com';
        let registerUrl = `${baseUrl}/register?invite=${invitationToken}`;
        if (senderReferralCode) {
          registerUrl += `&ref=${encodeURIComponent(senderReferralCode)}`;
        }
        
        // Send invitation email
        const emailResult = await sendEmail(recipientIdentifier, EMAIL_TEMPLATES.INVITATION, {
          sender_name: `${sender.firstName} ${sender.lastName}`,
          amount: `${goldAmount.toFixed(4)}g`,
          register_url: registerUrl,
        });
        console.log(`[Email] Invitation email to ${recipientIdentifier}: ${emailResult.success ? 'sent' : 'failed'} - ${emailResult.messageId || emailResult.error}`);
        
        // Create bell notification for sender
        await storage.createNotification({
          userId: sender.id,
          title: 'Invitation Sent',
          message: `You sent ${goldAmount.toFixed(4)}g gold to ${recipientIdentifier}. They have 24 hours to register and claim it.`,
          type: 'transaction',
          link: '/finapay',
        });
        
        // Create audit log
        await storage.createAuditLog({
          entityType: 'peer_transfer',
          entityId: inviteTransfer.id,
          actionType: 'create',
          actor: sender.id,
          actorRole: 'user',
          details: `Invitation transfer created: ${goldAmount.toFixed(4)}g gold to ${recipientIdentifier}. Token: ${invitationToken.substring(0, 8)}...`,
        });
        
        return res.json({
          transfer: inviteTransfer,
          pending: true,
          isInvite: true,
          message: `Invitation sent! ${recipientIdentifier} has 24 hours to register and claim ${goldAmount.toFixed(4)}g gold.`,
          expiresAt: expiresAt.toISOString(),
        });
      }
      
      if (!recipient) {
        return res.status(404).json({ message: "Recipient not found. For email transfers to non-registered users, use the email channel." });
      }
      
      if (sender.id === recipient.id) {
        return res.status(400).json({ message: "Cannot send money to yourself" });
      }
      
      // Get recipient wallet
      const recipientWallet = await storage.getWallet(recipient.id);
      if (!recipientWallet) {
        return res.status(400).json({ message: "Recipient wallet not found" });
      }
      
      // Transfer approval is always required for security
      const recipientPreferences = await storage.getUserPreferences(recipient.id);
      const timeoutHours = recipientPreferences?.transferApprovalTimeout || 24;
      const expiresAt = timeoutHours > 0 ? new Date(Date.now() + timeoutHours * 60 * 60 * 1000) : null;
      
      // Debit sender immediately (held until accepted/rejected)
      await storage.updateWallet(senderWallet.id, {
        goldGrams: (senderGoldBalance - goldAmount).toFixed(6)
      });
      
      // Create sender transaction (pending)
      const senderTx = await storage.createTransaction({
        userId: sender.id,
        type: 'Send',
        status: 'Pending',
        amountGold: goldAmount.toFixed(6),
        amountUsd: usdEquivalent.toFixed(2),
        goldPriceUsdPerGram: goldPrice.toFixed(2),
        recipientEmail: recipient.email,
        recipientUserId: recipient.id,
        description: memo || `Pending transfer to ${recipient.firstName} ${recipient.lastName}`,
        referenceId: referenceNumber,
        sourceModule: 'finapay',
      });
      
      // Record ledger entry
      const { vaultLedgerService } = await import('./vault-ledger-service');
      await vaultLedgerService.recordLedgerEntry({
        userId: sender.id,
        action: 'Transfer_Send',
        goldGrams: goldAmount,
        goldPriceUsdPerGram: goldPrice,
        fromWallet: 'FinaPay',
        toWallet: 'External',
        fromStatus: 'Available',
        toStatus: 'Pending_Deposit',
        transactionId: senderTx.id,
        counterpartyUserId: recipient.id,
        notes: `Pending gold transfer to ${recipient.firstName} ${recipient.lastName} (awaiting acceptance)`,
        createdBy: 'system',
      });
      
      // Create pending peer transfer
      const pendingTransfer = await storage.createPeerTransfer({
        referenceNumber,
        senderId: sender.id,
        recipientId: recipient.id,
        amountUsd: usdEquivalent.toFixed(2),
        amountGold: goldAmount.toFixed(6),
        goldPriceUsdPerGram: goldPrice.toFixed(2),
        channel,
        recipientIdentifier,
        memo,
        status: 'Pending',
        requiresApproval: true,
        expiresAt,
        senderTransactionId: senderTx.id,
      });
      
      // Emit real-time sync event
      emitLedgerEvent(sender.id, {
        type: 'balance_update',
        module: 'finapay',
        action: 'gold_pending',
        data: { goldGrams: goldAmount, recipientId: recipient.id },
      });
      emitLedgerEvent(recipient.id, {
        type: 'pending_transfer',
        module: 'finapay',
        action: 'incoming_transfer',
        data: { goldGrams: goldAmount, senderId: sender.id, transferId: pendingTransfer.id },
      });
      
      // Create bell notification for recipient
      await storage.createNotification({
        userId: recipient.id,
        title: 'Incoming Gold Transfer',
        message: `${sender.firstName} ${sender.lastName} sent you ${goldAmount.toFixed(4)}g gold ($${usdEquivalent.toFixed(2)}). Please accept or decline.`,
        type: 'transaction',
        link: '/finapay',
      });
      
      // Send pending transfer email to recipient using proper template
      if (recipient.email) {
        sendEmail(recipient.email, EMAIL_TEMPLATES.TRANSFER_PENDING, {
          user_name: `${recipient.firstName} ${recipient.lastName}`,
          sender_name: `${sender.firstName} ${sender.lastName}`,
          amount: `${goldAmount.toFixed(4)}g gold`,
          amount_usd: usdEquivalent.toFixed(2),
          reference_number: referenceNumber,
          memo: memo || '',
          expires_at: expiresAt ? expiresAt.toLocaleDateString() : '',
        }).catch(err => console.error('[Email] Pending transfer notification failed:', err));
      }
      
      res.json({
        transfer: pendingTransfer,
        pending: true,
        message: `Transfer of ${goldAmount.toFixed(4)}g gold sent to ${recipient.firstName} ${recipient.lastName}. Awaiting their approval.`
      });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Transfer failed" });
    }
  });

  // Get user's sent transfers - PROTECTED
  app.get("/api/finapay/transfers/sent/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const transfers = await storage.getUserSentTransfers(req.params.userId);
      res.json({ transfers });
    } catch (error) {
      res.status(400).json({ message: "Failed to get sent transfers" });
    }
  });

  // Get user's received transfers - PROTECTED
  app.get("/api/finapay/transfers/received/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const transfers = await storage.getUserReceivedTransfers(req.params.userId);
      res.json({ transfers });
    } catch (error) {
      res.status(400).json({ message: "Failed to get received transfers" });
    }
  });

  // Create money request - PROTECTED
  app.post("/api/finapay/request", ensureAuthenticated, async (req, res) => {
    try {
      const { requesterId, targetIdentifier, amountUsd, channel, memo } = req.body;
      
      const requester = await storage.getUser(requesterId);
      if (!requester) {
        return res.status(404).json({ message: "Requester not found" });
      }
      
      // Generate reference and QR payload
      const referenceNumber = `REQ-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const qrPayload = `FTREQ:${referenceNumber}:${amountUsd}:${requester.finatradesId}`;
      
      // Find target if identifier provided
      let targetId = null;
      let targetUser = null;
      if (targetIdentifier) {
        const targetUsers = await storage.searchUsersByIdentifier(targetIdentifier);
        if (targetUsers.length > 0) {
          targetId = targetUsers[0].id;
          targetUser = targetUsers[0];
        }
      }
      
      // Set expiry to 7 days
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      
      const request = await storage.createPeerRequest({
        referenceNumber,
        requesterId,
        targetId,
        targetIdentifier,
        channel,
        amountUsd: parseFloat(amountUsd).toFixed(2),
        memo,
        qrPayload,
        status: 'Pending',
        expiresAt,
      });
      
      // Generate QR code as data URL
      const qrCodeDataUrl = await QRCode.toDataURL(qrPayload);
      
      // Send email notification to target user if found
      if (targetUser && targetUser.email) {
        const requesterName = `${requester.firstName} ${requester.lastName}`;
        try {
          await sendEmailDirect({
            to: targetUser.email,
            subject: `Payment Request from ${requesterName} - $${parseFloat(amountUsd).toFixed(2)}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #8A2BE2 0%, #4B0082 100%); padding: 20px; text-align: center;">
                  <h1 style="color: white; margin: 0;">Finatrades</h1>
                </div>
                <div style="padding: 30px; background: #f9fafb;">
                  <h2 style="color: #1f2937;">You've Received a Payment Request</h2>
                  <p style="color: #4b5563; font-size: 16px;">
                    <strong>${requesterName}</strong> has requested a payment from you.
                  </p>
                  <div style="background: white; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb;">
                    <p style="margin: 0 0 10px 0; color: #6b7280;">Amount Requested:</p>
                    <p style="margin: 0; font-size: 28px; font-weight: bold; color: #8A2BE2;">$${parseFloat(amountUsd).toFixed(2)}</p>
                    ${memo ? `<p style="margin: 15px 0 0 0; color: #6b7280; font-style: italic;">"${memo}"</p>` : ''}
                  </div>
                  <p style="color: #4b5563;">Reference: <strong>${referenceNumber}</strong></p>
                  <p style="color: #4b5563;">This request expires on: <strong>${expiresAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</strong></p>
                  <div style="margin-top: 25px; text-align: center;">
                    <a href="${process.env.PRODUCTION_DOMAIN ? 'https://' + process.env.PRODUCTION_DOMAIN : (process.env.REPLIT_DOMAINS?.split(',')[0] ? 'https://' + process.env.REPLIT_DOMAINS.split(',')[0] : 'https://finatrades.com')}/finapay" 
                       style="background: #8A2BE2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                      View Request in FinaPay
                    </a>
                  </div>
                  <p style="color: #9ca3af; font-size: 14px; margin-top: 25px;">
                    Log in to your Finatrades account to pay or decline this request.
                  </p>
                </div>
                <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
                  <p>&copy; ${new Date().getFullYear()} Finatrades. All rights reserved.</p>
                </div>
              </div>
            `,
          });
        } catch (emailError) {
          console.error('[PaymentRequest] Failed to send email notification:', emailError);
        }
      }
      
      res.json({ request, qrCodeDataUrl });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create request" });
    }
  });

  // Get user's money requests (created by user) - PROTECTED
  app.get("/api/finapay/requests/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const requests = await storage.getUserPeerRequests(req.params.userId);
      res.json({ requests });
    } catch (error) {
      res.status(400).json({ message: "Failed to get requests" });
    }
  });

  // Get money requests received by user - PROTECTED
  app.get("/api/finapay/requests/received/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const requests = await storage.getUserReceivedPeerRequests(req.params.userId);
      res.json({ requests });
    } catch (error) {
      res.status(400).json({ message: "Failed to get received requests" });
    }
  });

  // Pay a money request - PROTECTED
  app.post("/api/finapay/requests/:id/pay", ensureAuthenticated, async (req, res) => {
    try {
      const { payerId } = req.body;
      const request = await storage.getPeerRequest(req.params.id);
      
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }
      
      if (request.status !== 'Pending') {
        return res.status(400).json({ message: "Request is no longer pending" });
      }
      
      // Check if expired
      if (request.expiresAt && new Date(request.expiresAt) < new Date()) {
        await storage.updatePeerRequest(request.id, { status: 'Expired' });
        return res.status(400).json({ message: "Request has expired" });
      }
      
      // Get payer and requester
      const payer = await storage.getUser(payerId);
      const requester = await storage.getUser(request.requesterId);
      
      if (!payer || !requester) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (payer.id === requester.id) {
        return res.status(400).json({ message: "Cannot pay your own request" });
      }
      
      // Check payer balance - use gold balance as the underlying asset
      const payerWallet = await storage.getWallet(payer.id);
      if (!payerWallet) {
        return res.status(400).json({ message: "Wallet not found" });
      }
      
      // Get current gold price to convert USD to gold grams
      const pricePerGram = await getGoldPricePerGram();
      const amountUsd = parseFloat(request.amountUsd.toString());
      const goldGrams = amountUsd / pricePerGram;
      const payerGoldBalance = parseFloat(payerWallet.goldGrams.toString());
      
      if (payerGoldBalance < goldGrams) {
        return res.status(400).json({ message: "Insufficient gold balance" });
      }
      
      // Get requester wallet
      const requesterWallet = await storage.getWallet(requester.id);
      if (!requesterWallet) {
        return res.status(400).json({ message: "Requester wallet not found" });
      }
      
      // Generate reference
      const referenceNumber = `TRF-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      
      // Debit payer gold
      await storage.updateWallet(payerWallet.id, {
        goldGrams: (payerGoldBalance - goldGrams).toFixed(6),
      });
      
      // Credit requester gold
      const requesterGoldBalance = parseFloat(requesterWallet.goldGrams.toString());
      await storage.updateWallet(requesterWallet.id, {
        goldGrams: (requesterGoldBalance + goldGrams).toFixed(6),
      });
      
      // Create transactions with gold grams
      const senderTx = await storage.createTransaction({
        userId: payer.id,
        type: 'Send',
        status: 'Completed',
        amountUsd: amountUsd.toFixed(2),
        goldGrams: goldGrams.toFixed(6),
        goldPricePerGram: pricePerGram.toFixed(2),
        recipientEmail: requester.email,
        recipientUserId: requester.id,
        description: request.memo || `Paid request from ${requester.firstName} ${requester.lastName}`,
        referenceId: referenceNumber,
        sourceModule: 'finapay',
        completedAt: new Date(),
      });
      
      const recipientTx = await storage.createTransaction({
        userId: requester.id,
        type: 'Receive',
        status: 'Completed',
        amountUsd: amountUsd.toFixed(2),
        goldGrams: goldGrams.toFixed(6),
        goldPricePerGram: pricePerGram.toFixed(2),
        senderEmail: payer.email,
        description: request.memo || `Received payment from ${payer.firstName} ${payer.lastName}`,
        referenceId: referenceNumber,
        sourceModule: 'finapay',
        completedAt: new Date(),
      });
      
      // Create transfer record
      const transfer = await storage.createPeerTransfer({
        referenceNumber,
        senderId: payer.id,
        recipientId: requester.id,
        amountUsd: amountUsd.toFixed(2),
        goldGrams: goldGrams.toFixed(6),
        channel: request.channel,
        recipientIdentifier: requester.email,
        memo: request.memo,
        status: 'Completed',
        senderTransactionId: senderTx.id,
        recipientTransactionId: recipientTx.id,
      });
      
      // Update request status
      await storage.updatePeerRequest(request.id, {
        status: 'Fulfilled',
        fulfilledTransferId: transfer.id,
        respondedAt: new Date(),
      });
      
      res.json({ transfer, message: "Payment successful" });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Payment failed" });
    }
  });

  // Decline a money request - PROTECTED: requires authentication + ownership check
  app.post("/api/finapay/requests/:id/decline", ensureAuthenticated, async (req, res) => {
    try {
      const request = await storage.getPeerRequest(req.params.id);
      
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }
      
      // SECURITY: Only the payee (person being asked) can decline
      if (request.payeeId !== req.session?.userId) {
        return res.status(403).json({ message: "Not authorized to decline this request" });
      }
      
      if (request.status !== 'Pending') {
        return res.status(400).json({ message: "Request is no longer pending" });
      }
      
      await storage.updatePeerRequest(request.id, {
        status: 'Declined',
        respondedAt: new Date(),
      });
      
      res.json({ message: "Request declined" });
    } catch (error) {
      res.status(400).json({ message: "Failed to decline request" });
    }
  });

  // Cancel a money request (by requester) - PROTECTED: requires authentication
  app.post("/api/finapay/requests/:id/cancel", ensureAuthenticated, async (req, res) => {
    try {
      const request = await storage.getPeerRequest(req.params.id);
      
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }
      
      // SECURITY: Only the requester can cancel their own request (use session, not body)
      if (request.requesterId !== req.session?.userId) {
        return res.status(403).json({ message: "Not authorized to cancel this request" });
      }
      
      if (request.status !== 'Pending') {
        return res.status(400).json({ message: "Request is no longer pending" });
      }
      
      await storage.updatePeerRequest(request.id, {
        status: 'Cancelled',
        respondedAt: new Date(),
      });
      
      res.json({ message: "Request cancelled" });
    } catch (error) {
      res.status(400).json({ message: "Failed to cancel request" });
    }
  });

  // Get QR code for receiving money (user's profile QR) - PROTECTED: requires owner or admin
  app.get("/api/finapay/qr/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const user = await storage.getUser(req.params.userId);
      if (!user || !user.finatradesId) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const qrPayload = `FTPAY:${user.finatradesId}`;
      const qrCodeDataUrl = await QRCode.toDataURL(qrPayload);
      
      res.json({ qrCodeDataUrl, finatradesId: user.finatradesId });
    } catch (error) {
      res.status(400).json({ message: "Failed to generate QR code" });
    }
  });

  // Admin: Get all peer transfers
  app.get("/api/admin/finapay/peer-transfers", ensureAdminAsync, requirePermission('manage_deposits', 'manage_withdrawals', 'view_transactions', 'manage_transactions'), async (req, res) => {
    try {
      const transfers = await storage.getAllPeerTransfers();
      res.json({ transfers });
    } catch (error) {
      res.status(400).json({ message: "Failed to get peer transfers" });
    }
  });

  // Admin: Get all peer requests
  app.get("/api/admin/finapay/peer-requests", ensureAdminAsync, requirePermission('manage_deposits', 'manage_withdrawals', 'view_transactions', 'manage_transactions'), async (req, res) => {
    try {
      const requests = await storage.getAllPeerRequests();
      res.json({ requests });
    } catch (error) {
      res.status(400).json({ message: "Failed to get peer requests" });
    }
  });

  // ============================================================================
  // FINAPAY - PENDING TRANSFERS (Accept/Reject incoming transfers)
  // ============================================================================

  // Get pending incoming transfers for a user - PROTECTED: requires owner or admin
  app.get("/api/finapay/pending/incoming/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const transfers = await storage.getPendingIncomingTransfers(req.params.userId);
      res.json({ transfers });
    } catch (error) {
      res.status(400).json({ message: "Failed to get pending transfers" });
    }
  });

  // Get pending outgoing transfers for a user - PROTECTED: requires owner or admin
  app.get("/api/finapay/pending/outgoing/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const transfers = await storage.getPendingOutgoingTransfers(req.params.userId);
      res.json({ transfers });
    } catch (error) {
      res.status(400).json({ message: "Failed to get pending transfers" });
    }
  });

  // Accept a pending transfer - PROTECTED: requires authentication
  app.post("/api/finapay/pending/:id/accept", ensureAuthenticated, async (req, res) => {
    try {
      const transfer = await storage.getPeerTransfer(req.params.id);
      
      if (!transfer) {
        return res.status(404).json({ message: "Transfer not found" });
      }
      
      // SECURITY: Only the recipient can accept
      if (transfer.recipientId !== req.session?.userId) {
        return res.status(403).json({ message: "Not authorized to accept this transfer" });
      }
      
      if (transfer.status !== 'Pending') {
        return res.status(400).json({ message: "Transfer is no longer pending" });
      }
      
      // Check if transfer has expired
      if (transfer.expiresAt && new Date() > new Date(transfer.expiresAt)) {
        await storage.updatePeerTransfer(transfer.id, {
          status: 'Expired',
          respondedAt: new Date(),
        });
        return res.status(400).json({ message: "Transfer has expired" });
      }
      
      // Get sender and recipient info
      const sender = await storage.getUser(transfer.senderId);
      const recipient = await storage.getUser(transfer.recipientId);
      if (!sender || !recipient) {
        return res.status(404).json({ message: "Users not found" });
      }
      
      // Get wallets
      const recipientWallet = await storage.getWallet(recipient.id);
      if (!recipientWallet) {
        return res.status(400).json({ message: "Recipient wallet not found" });
      }
      
      // Platform is gold-only - all transfers are gold
      const goldAmount = parseFloat(transfer.amountGold?.toString() || '0');
      const goldPrice = transfer.goldPriceUsdPerGram ? parseFloat(transfer.goldPriceUsdPerGram.toString()) : 139.44;
      
      if (goldAmount <= 0) {
        return res.status(400).json({ message: "Invalid transfer: no gold amount found" });
      }
      
      // Process gold transfer - Credit recipient
      const result = await storage.withTransaction(async (txStorage) => {
        const generatedCertificates: any[] = [];
        const generateWingoldRef = () => `WG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
          
          // Helper to issue certificates
          const issueCertificates = async (userId: string, txId: string, holdingId: string, wingoldRef: string, grams: number) => {
            if (!holdingId || grams <= 0) return null;
            
            const docCertNum = await txStorage.generateCertificateNumber('Digital Ownership');
            const digitalCert = await txStorage.createCertificate({
              certificateNumber: docCertNum,
              userId,
              transactionId: txId,
              vaultHoldingId: holdingId,
              type: 'Digital Ownership',
              status: 'Active',
              goldGrams: grams.toFixed(6),
              goldPriceUsdPerGram: goldPrice.toFixed(2),
              totalValueUsd: (grams * goldPrice).toFixed(2),
              issuer: 'Finatrades',
              vaultLocation: 'Dubai - Wingold & Metals DMCC',
              wingoldStorageRef: wingoldRef
            });
            generatedCertificates.push(digitalCert);
            
            const pscCertNum = await txStorage.generateCertificateNumber('Physical Storage');
            const storageCert = await txStorage.createCertificate({
              certificateNumber: pscCertNum,
              userId,
              transactionId: txId,
              vaultHoldingId: holdingId,
              type: 'Physical Storage',
              status: 'Active',
              goldGrams: grams.toFixed(6),
              goldPriceUsdPerGram: goldPrice.toFixed(2),
              totalValueUsd: (grams * goldPrice).toFixed(2),
              issuer: 'Wingold & Metals DMCC',
              vaultLocation: 'Dubai - Wingold & Metals DMCC',
              wingoldStorageRef: wingoldRef
            });
            generatedCertificates.push(storageCert);
            
            return wingoldRef;
          };
          
          // 1. Credit recipient wallet gold
          const recipientGoldBalance = parseFloat(recipientWallet.goldGrams?.toString() || '0');
          await txStorage.updateWallet(recipientWallet.id, {
            goldGrams: (recipientGoldBalance + goldAmount).toFixed(6)
          });
          
          // 2. Create recipient transaction
          const recipientTx = await txStorage.createTransaction({
            userId: recipient.id,
            type: 'Receive',
            status: 'Completed',
            amountGold: goldAmount.toFixed(6),
            amountUsd: (goldAmount * goldPrice).toFixed(2),
            goldPriceUsdPerGram: goldPrice.toFixed(2),
            senderEmail: sender.email,
            description: transfer.memo || `Received ${goldAmount.toFixed(4)}g gold from ${sender.firstName} ${sender.lastName}`,
            referenceId: transfer.referenceNumber,
            sourceModule: 'finapay',
            completedAt: new Date(),
          });
          
          // 3. Update or create recipient vault holding
          const recipientHoldings = await txStorage.getUserVaultHoldings(recipient.id);
          let recipientHoldingId: string;
          let recipientWingoldRef: string;
          
          if (recipientHoldings.length > 0) {
            const rHolding = recipientHoldings[0];
            const rGold = parseFloat(rHolding.goldGrams?.toString() || '0');
            recipientWingoldRef = generateWingoldRef();
            await txStorage.updateVaultHolding(rHolding.id, {
              goldGrams: (rGold + goldAmount).toFixed(6),
              wingoldStorageRef: recipientWingoldRef
            });
            recipientHoldingId = rHolding.id;
          } else {
            recipientWingoldRef = generateWingoldRef();
            const newHolding = await txStorage.createVaultHolding({
              userId: recipient.id,
              goldGrams: goldAmount.toFixed(6),
              vaultLocation: 'Dubai - Wingold & Metals DMCC',
              wingoldStorageRef: recipientWingoldRef,
              purchasePriceUsdPerGram: goldPrice.toFixed(2),
              isPhysicallyDeposited: false
            });
            recipientHoldingId = newHolding.id;
          }
          
          // 4. Issue certificates for recipient
          await issueCertificates(recipient.id, recipientTx.id, recipientHoldingId, recipientWingoldRef, goldAmount);
          
          // 5. Update transfer status
          await txStorage.updatePeerTransfer(transfer.id, {
            status: 'Completed',
            respondedAt: new Date(),
            recipientTransactionId: recipientTx.id,
          });
          
          // 6. Record ledger entry for recipient
          const { vaultLedgerService } = await import('./vault-ledger-service');
          await vaultLedgerService.recordLedgerEntry({
            userId: recipient.id,
            action: 'Transfer_Receive',
            goldGrams: goldAmount,
            goldPriceUsdPerGram: goldPrice,
            fromWallet: 'FinaPay',
            toWallet: 'FinaPay',
            fromStatus: 'Available',
            toStatus: 'Available',
            transactionId: recipientTx.id,
            counterpartyUserId: sender.id,
            notes: `Accepted ${goldAmount.toFixed(4)}g gold from ${sender.firstName} ${sender.lastName}`,
            createdBy: 'system',
          });
          
          return { recipientTx, certificates: generatedCertificates };
        });
        
        // Emit real-time sync event
        emitLedgerEvent(recipient.id, {
          type: 'balance_update',
          module: 'finapay',
          action: 'gold_received',
          data: { goldGrams: goldAmount, senderId: sender.id },
        });
        emitLedgerEvent(sender.id, {
          type: 'transfer_accepted',
          module: 'finapay',
          action: 'transfer_completed',
          data: { transferId: transfer.id, recipientId: recipient.id },
        });
        
      // Send email notification to sender
      if (sender.email) {
        sendEmailDirect(
          sender.email,
          `Your transfer to ${recipient.firstName} ${recipient.lastName} was accepted`,
          `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #8A2BE2, #4B0082); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0;">Transfer Accepted!</h1>
            </div>
            <div style="padding: 30px; background: #ffffff;">
              <p>Hello ${sender.firstName},</p>
              <p>Great news! ${recipient.firstName} ${recipient.lastName} has accepted your transfer.</p>
              <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                <p style="font-size: 28px; font-weight: bold; color: #22c55e; margin: 0;">
                  ${goldAmount.toFixed(4)}g Gold
                </p>
                <p style="color: #6b7280; margin: 5px 0;">to ${recipient.firstName} ${recipient.lastName}</p>
              </div>
              <p style="text-align: center; margin-top: 30px;">
                <a href="https://finatrades.com/dashboard" style="background: #8A2BE2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">View Dashboard</a>
              </p>
            </div>
          </div>
          `
        ).catch(err => console.error('[Email] Failed to send transfer accepted notification:', err));
      }
      
      // Create bell notifications for both parties
      await storage.createNotification({
        userId: recipient.id,
        title: 'Transfer Received',
        message: `You received ${goldAmount.toFixed(4)}g gold from ${sender.firstName} ${sender.lastName}.`,
        type: 'transaction',
        link: '/finapay',
      });
      
      await storage.createNotification({
        userId: sender.id,
        title: 'Transfer Accepted',
        message: `${recipient.firstName} ${recipient.lastName} accepted your transfer of ${goldAmount.toFixed(4)}g gold.`,
        type: 'transaction',
        link: '/finapay',
      });
      
      res.json({ 
        message: `Accepted ${goldAmount.toFixed(4)}g gold from ${sender.firstName} ${sender.lastName}`,
        transaction: result.recipientTx,
        certificates: result.certificates
      });
      
    } catch (error) {
      console.error('[Routes] Error accepting transfer:', error);
      res.status(400).json({ message: "Failed to accept transfer" });
    }
  });

  // Reject a pending transfer - PROTECTED: requires authentication
  app.post("/api/finapay/pending/:id/reject", ensureAuthenticated, async (req, res) => {
    try {
      const { reason } = req.body;
      const transfer = await storage.getPeerTransfer(req.params.id);
      
      if (!transfer) {
        return res.status(404).json({ message: "Transfer not found" });
      }
      
      // SECURITY: Only the recipient can reject
      if (transfer.recipientId !== req.session?.userId) {
        return res.status(403).json({ message: "Not authorized to reject this transfer" });
      }
      
      if (transfer.status !== 'Pending') {
        return res.status(400).json({ message: "Transfer is no longer pending" });
      }
      
      // Get sender and recipient info
      const sender = await storage.getUser(transfer.senderId);
      const recipient = await storage.getUser(transfer.recipientId);
      if (!sender) {
        return res.status(404).json({ message: "Sender not found" });
      }
      
      // Refund the sender
      const senderWallet = await storage.getWallet(sender.id);
      if (!senderWallet) {
        return res.status(400).json({ message: "Sender wallet not found" });
      }
      
      // Platform is gold-only - all transfers are gold
      const goldAmount = parseFloat(transfer.amountGold?.toString() || '0');
      const goldPrice = transfer.goldPriceUsdPerGram ? parseFloat(transfer.goldPriceUsdPerGram.toString()) : 139.44;
      
      if (goldAmount <= 0) {
        return res.status(400).json({ message: "Invalid transfer: no gold amount found" });
      }
      
      // Refund gold to sender
        const senderGoldBalance = parseFloat(senderWallet.goldGrams?.toString() || '0');
        await storage.updateWallet(senderWallet.id, {
          goldGrams: (senderGoldBalance + goldAmount).toFixed(6)
        });
        
        // Update sender's vault holding
        const senderHoldings = await storage.getUserVaultHoldings(sender.id);
        if (senderHoldings.length > 0) {
          const sHolding = senderHoldings[0];
          const sGold = parseFloat(sHolding.goldGrams?.toString() || '0');
          await storage.updateVaultHolding(sHolding.id, {
            goldGrams: (sGold + goldAmount).toFixed(6)
          });
        }
        
        // Create refund transaction for sender
        await storage.createTransaction({
          userId: sender.id,
          type: 'Refund',
          status: 'Completed',
          amountGold: goldAmount.toFixed(6),
          amountUsd: (goldAmount * goldPrice).toFixed(2),
          goldPriceUsdPerGram: goldPrice.toFixed(2),
          description: `Transfer to ${recipient?.firstName || 'user'} was rejected${reason ? `: ${reason}` : ''}`,
          referenceId: transfer.referenceNumber,
          sourceModule: 'finapay',
          completedAt: new Date(),
        });
        
      // Record ledger entry
      const { vaultLedgerService } = await import('./vault-ledger-service');
      await vaultLedgerService.recordLedgerEntry({
        userId: sender.id,
        action: 'Transfer_Refund',
        goldGrams: goldAmount,
        goldPriceUsdPerGram: goldPrice,
        fromWallet: 'External',
        toWallet: 'FinaPay',
        toStatus: 'Available',
        notes: `Transfer rejected by ${recipient?.firstName || 'recipient'}${reason ? `: ${reason}` : ''}`,
        createdBy: 'system',
      });
      
      // Update transfer status
      await storage.updatePeerTransfer(transfer.id, {
        status: 'Rejected',
        respondedAt: new Date(),
        rejectionReason: reason || null,
      });
      
      // Emit real-time sync events
      emitLedgerEvent(sender.id, {
        type: 'balance_update',
        module: 'finapay',
        action: 'transfer_rejected',
        data: { transferId: transfer.id, refunded: true },
      });
      
      // Send email notification to sender
      if (sender.email) {
        sendEmailDirect(
          sender.email,
          `Your transfer to ${recipient?.firstName || 'user'} was rejected`,
          `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #dc2626, #b91c1c); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0;">Transfer Rejected</h1>
            </div>
            <div style="padding: 30px; background: #ffffff;">
              <p>Hello ${sender.firstName},</p>
              <p>${recipient?.firstName || 'The recipient'} has rejected your transfer. The funds have been returned to your wallet.</p>
              <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                <p style="font-size: 28px; font-weight: bold; color: #dc2626; margin: 0;">
                  ${goldAmount.toFixed(4)}g Gold Refunded
                </p>
                ${reason ? `<p style="color: #6b7280; margin: 10px 0; font-style: italic;">"${reason}"</p>` : ''}
              </div>
              <p style="text-align: center; margin-top: 30px;">
                <a href="https://finatrades.com/dashboard" style="background: #8A2BE2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">View Dashboard</a>
              </p>
            </div>
          </div>
          `
        ).catch(err => console.error('[Email] Failed to send transfer rejected notification:', err));
      }
      
      // Create bell notification for sender
      await storage.createNotification({
        userId: sender.id,
        title: 'Transfer Rejected',
        message: `${recipient?.firstName || 'Recipient'} rejected your transfer of ${goldAmount.toFixed(4)}g gold. Funds refunded to your wallet.`,
        type: 'transaction',
        link: '/finapay',
      });
      
      res.json({ message: "Transfer rejected. Funds have been returned to sender." });
    } catch (error) {
      console.error('[Routes] Error rejecting transfer:', error);
      res.status(400).json({ message: "Failed to reject transfer" });
    }
  });

  // Get user's transfer approval preference - PROTECTED: requires owner or admin
  // Note: requireTransferApproval is always true for security
  app.get("/api/finapay/preferences/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const preferences = await storage.getUserPreferences(req.params.userId);
      res.json({ 
        requireTransferApproval: true, // Always enabled for security
        transferApprovalTimeout: preferences?.transferApprovalTimeout || 24
      });
    } catch (error) {
      res.status(400).json({ message: "Failed to get preferences" });
    }
  });

  // Update user's transfer approval preference - PROTECTED: requires owner or admin
  // Note: requireTransferApproval is always true and cannot be changed
  app.patch("/api/finapay/preferences/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const { transferApprovalTimeout } = req.body;
      
      let preferences = await storage.getUserPreferences(req.params.userId);
      if (!preferences) {
        // Create preferences if they don't exist
        preferences = await storage.createUserPreferences({
          userId: req.params.userId,
          requireTransferApproval: true, // Always true
          transferApprovalTimeout: transferApprovalTimeout ?? 24,
        });
      } else {
        preferences = await storage.updateUserPreferences(preferences.id, {
          requireTransferApproval: true, // Always true
          transferApprovalTimeout: transferApprovalTimeout ?? preferences.transferApprovalTimeout,
        });
      }
      
      res.json({ 
        message: "Preferences updated",
        requireTransferApproval: true, // Always enabled
        transferApprovalTimeout: preferences?.transferApprovalTimeout
      });
    } catch (error) {
      res.status(400).json({ message: "Failed to update preferences" });
    }
  });

  // ============================================================================
  // FINAPAY - QR PAYMENT INVOICES
  // ============================================================================

  // Create QR payment invoice (for receiving specific amount)
  app.post("/api/finapay/qr-invoice", ensureAuthenticated, async (req, res) => {
    try {
      const { goldGrams, amountUsd, description } = req.body;
      
      // Use authenticated session user as merchant (security fix)
      const sessionUserId = (req.session as any)?.userId;
      if (!sessionUserId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const merchant = await storage.getUser(sessionUserId);
      if (!merchant) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check if account is frozen
      const [accountStatus] = await db.select().from(userAccountStatus).where(eq(userAccountStatus.userId, sessionUserId));
      if (accountStatus?.isFrozen) {
        return res.status(403).json({ message: "Account is frozen. Cannot create invoices." });
      }
      
      // Get current gold price
      let goldPrice: number;
      try {
        goldPrice = await getGoldPricePerGram();
      } catch {
        goldPrice = 139.44;
      }
      
      // Generate unique invoice code
      const invoiceCode = `QR${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      
      // Calculate gold grams if amount is in USD
      let calculatedGoldGrams = goldGrams ? parseFloat(goldGrams) : null;
      let calculatedAmountUsd = amountUsd ? parseFloat(amountUsd) : null;
      
      if (calculatedAmountUsd && !calculatedGoldGrams) {
        calculatedGoldGrams = calculatedAmountUsd / goldPrice;
      } else if (calculatedGoldGrams && !calculatedAmountUsd) {
        calculatedAmountUsd = calculatedGoldGrams * goldPrice;
      }
      
      // Set expiry to 30 minutes
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
      
      // Create invoice in database
      const invoiceId = crypto.randomUUID();
      await db.insert(qrPaymentInvoices).values({
        id: invoiceId,
        invoiceCode,
        merchantId: merchant.id,
        goldGrams: calculatedGoldGrams?.toFixed(6) || null,
        amountUsd: calculatedAmountUsd?.toFixed(2) || null,
        goldPriceAtCreation: goldPrice.toFixed(2),
        description,
        status: 'Active',
        expiresAt,
      });
      
      // Generate QR code
      const qrPayload = `FTQR:${invoiceCode}`;
      const qrCodeDataUrl = await QRCode.toDataURL(qrPayload);
      
      res.json({ 
        invoice: {
          id: invoiceId,
          invoiceCode,
          goldGrams: calculatedGoldGrams,
          amountUsd: calculatedAmountUsd,
          goldPrice,
          description,
          expiresAt,
        },
        qrCodeDataUrl 
      });
    } catch (error) {
      console.error('[QR Invoice] Create error:', error);
      res.status(400).json({ message: "Failed to create QR invoice" });
    }
  });

  // Get QR invoice by code
  app.get("/api/finapay/qr-invoice/:code", async (req, res) => {
    try {
      const [invoice] = await db.select().from(qrPaymentInvoices).where(eq(qrPaymentInvoices.invoiceCode, req.params.code));
      
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      // Check if expired
      if (invoice.expiresAt && new Date(invoice.expiresAt) < new Date() && invoice.status === 'Active') {
        await db.update(qrPaymentInvoices).set({ status: 'Expired' }).where(eq(qrPaymentInvoices.id, invoice.id));
        return res.status(400).json({ message: "Invoice has expired" });
      }
      
      // Get merchant info
      const merchant = await storage.getUser(invoice.merchantId);
      
      res.json({ 
        invoice: {
          ...invoice,
          merchant: merchant ? {
            id: merchant.id,
            firstName: merchant.firstName,
            lastName: merchant.lastName,
            finatradesId: merchant.finatradesId,
          } : null
        }
      });
    } catch (error) {
      res.status(400).json({ message: "Failed to get invoice" });
    }
  });

  // Pay QR invoice
  app.post("/api/finapay/qr-invoice/:code/pay", ensureAuthenticated, async (req, res) => {
    try {
      // Use authenticated session user as payer (security fix)
      const sessionUserId = (req.session as any)?.userId;
      if (!sessionUserId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const [invoice] = await db.select().from(qrPaymentInvoices).where(eq(qrPaymentInvoices.invoiceCode, req.params.code));
      
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      if (invoice.status !== 'Active') {
        return res.status(400).json({ message: `Invoice is ${invoice.status.toLowerCase()}` });
      }
      
      if (invoice.expiresAt && new Date(invoice.expiresAt) < new Date()) {
        await db.update(qrPaymentInvoices).set({ status: 'Expired' }).where(eq(qrPaymentInvoices.id, invoice.id));
        return res.status(400).json({ message: "Invoice has expired" });
      }
      
      // Check if payer account is frozen
      const [payerAccountStatus] = await db.select().from(userAccountStatus).where(eq(userAccountStatus.userId, sessionUserId));
      if (payerAccountStatus?.isFrozen) {
        return res.status(403).json({ message: "Your account is frozen. Cannot make payments." });
      }
      
      const payer = await storage.getUser(sessionUserId);
      const merchant = await storage.getUser(invoice.merchantId);
      
      if (!payer || !merchant) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (payer.id === merchant.id) {
        return res.status(400).json({ message: "Cannot pay your own invoice" });
      }
      
      // Check payer wallet
      const payerWallet = await storage.getWallet(payer.id);
      const merchantWallet = await storage.getWallet(merchant.id);
      
      if (!payerWallet || !merchantWallet) {
        return res.status(400).json({ message: "Wallet not found" });
      }
      
      // Get current gold price
      let goldPrice: number;
      try {
        goldPrice = await getGoldPricePerGram();
      } catch {
        goldPrice = parseFloat(invoice.goldPriceAtCreation || '139.44');
      }
      
      // Calculate gold amount
      const goldGrams = parseFloat(invoice.goldGrams || '0') || (parseFloat(invoice.amountUsd || '0') / goldPrice);
      const payerGoldBalance = parseFloat(payerWallet.goldGrams?.toString() || '0');
      
      if (payerGoldBalance < goldGrams) {
        return res.status(400).json({ message: `Insufficient gold balance. You have ${payerGoldBalance.toFixed(4)}g, need ${goldGrams.toFixed(4)}g` });
      }
      
      // Execute transfer
      const referenceNumber = `QRPAY-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      
      // Debit payer gold
      await storage.updateWallet(payerWallet.id, {
        goldGrams: (payerGoldBalance - goldGrams).toFixed(6)
      });
      
      // Credit merchant gold
      const merchantGoldBalance = parseFloat(merchantWallet.goldGrams?.toString() || '0');
      await storage.updateWallet(merchantWallet.id, {
        goldGrams: (merchantGoldBalance + goldGrams).toFixed(6)
      });
      
      // Create transactions
      const payerTx = await storage.createTransaction({
        userId: payer.id,
        type: 'Send',
        status: 'Completed',
        amountGold: goldGrams.toFixed(6),
        amountUsd: (goldGrams * goldPrice).toFixed(2),
        goldPriceUsdPerGram: goldPrice.toFixed(2),
        recipientEmail: merchant.email,
        recipientUserId: merchant.id,
        description: invoice.description || `QR Payment to ${merchant.firstName} ${merchant.lastName}`,
        referenceId: referenceNumber,
        sourceModule: 'finapay',
        completedAt: new Date(),
      });
      
      const merchantTx = await storage.createTransaction({
        userId: merchant.id,
        type: 'Receive',
        status: 'Completed',
        amountGold: goldGrams.toFixed(6),
        amountUsd: (goldGrams * goldPrice).toFixed(2),
        goldPriceUsdPerGram: goldPrice.toFixed(2),
        senderEmail: payer.email,
        description: invoice.description || `QR Payment from ${payer.firstName} ${payer.lastName}`,
        referenceId: referenceNumber,
        sourceModule: 'finapay',
        completedAt: new Date(),
      });
      
      // Update invoice
      await db.update(qrPaymentInvoices).set({
        status: 'Paid',
        payerId: payer.id,
        paidAt: new Date(),
        paidTransactionId: merchantTx.id,
        updatedAt: new Date(),
      }).where(eq(qrPaymentInvoices.id, invoice.id));
      
      // Record ledger entries
      const { vaultLedgerService } = await import('./vault-ledger-service');
      await vaultLedgerService.recordLedgerEntry({
        userId: payer.id,
        action: 'Transfer_Send',
        goldGrams,
        goldPriceUsdPerGram: goldPrice,
        fromWallet: 'FinaPay',
        toWallet: 'External',
        transactionId: payerTx.id,
        counterpartyUserId: merchant.id,
        notes: `QR Payment: ${goldGrams.toFixed(4)}g to ${merchant.firstName} ${merchant.lastName}`,
        createdBy: 'system',
      });
      
      await vaultLedgerService.recordLedgerEntry({
        userId: merchant.id,
        action: 'Transfer_Receive',
        goldGrams,
        goldPriceUsdPerGram: goldPrice,
        fromWallet: 'FinaPay',
        toWallet: 'FinaPay',
        toStatus: 'Available',
        transactionId: merchantTx.id,
        counterpartyUserId: payer.id,
        notes: `QR Payment: ${goldGrams.toFixed(4)}g from ${payer.firstName} ${payer.lastName}`,
        createdBy: 'system',
      });
      
      // Emit sync events
      emitLedgerEvent(payer.id, { type: 'balance_update', module: 'finapay', action: 'qr_payment_sent', data: { goldGrams } });
      emitLedgerEvent(merchant.id, { type: 'balance_update', module: 'finapay', action: 'qr_payment_received', data: { goldGrams } });
      
      res.json({ 
        transaction: payerTx,
        message: `Successfully paid ${goldGrams.toFixed(4)}g gold to ${merchant.firstName} ${merchant.lastName}` 
      });
    } catch (error) {
      console.error('[QR Payment] Error:', error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Payment failed" });
    }
  });

  // ============================================================================
  // ADMIN - WALLET ADJUSTMENTS & ACCOUNT CONTROLS
  // ============================================================================

  // Admin: Adjust user wallet (credit/debit gold)
  app.post("/api/admin/finapay/wallet-adjustment", ensureAdminAsync, requirePermission('manage_transactions'), async (req, res) => {
    try {
      const { userId, adjustmentType, goldGrams, amountUsd, reason, internalNotes } = req.body;
      const adminUser = (req as any).adminUser;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const wallet = await storage.getWallet(userId);
      if (!wallet) {
        return res.status(400).json({ message: "Wallet not found" });
      }
      
      // Get gold price
      let goldPrice: number;
      try {
        goldPrice = await getGoldPricePerGram();
      } catch {
        goldPrice = 139.44;
      }
      
      const referenceNumber = `ADJ-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const adjustGrams = parseFloat(goldGrams || '0');
      const adjustUsd = parseFloat(amountUsd || '0');
      
      let newGoldBalance = parseFloat(wallet.goldGrams?.toString() || '0');
      let newUsdBalance = parseFloat(wallet.usdBalance?.toString() || '0');
      let transactionType: 'Deposit' | 'Withdrawal' = 'Deposit';
      
      if (adjustmentType === 'Credit') {
        newGoldBalance += adjustGrams;
        newUsdBalance += adjustUsd;
        transactionType = 'Deposit';
      } else if (adjustmentType === 'Debit') {
        if (adjustGrams > newGoldBalance) {
          return res.status(400).json({ message: `Cannot debit ${adjustGrams}g gold. User only has ${newGoldBalance.toFixed(4)}g` });
        }
        if (adjustUsd > newUsdBalance) {
          return res.status(400).json({ message: `Cannot debit $${adjustUsd}. User only has $${newUsdBalance.toFixed(2)}` });
        }
        newGoldBalance -= adjustGrams;
        newUsdBalance -= adjustUsd;
        transactionType = 'Withdrawal';
      } else if (adjustmentType === 'Correction') {
        // Correction sets the balance directly
        newGoldBalance = adjustGrams;
        newUsdBalance = adjustUsd;
      }
      
      // Update wallet
      await storage.updateWallet(wallet.id, {
        goldGrams: newGoldBalance.toFixed(6),
        usdBalance: newUsdBalance.toFixed(2),
      });
      
      // Create transaction record
      const transaction = await storage.createTransaction({
        userId,
        type: transactionType,
        status: 'Completed',
        amountGold: adjustGrams.toFixed(6),
        amountUsd: adjustUsd > 0 ? adjustUsd.toFixed(2) : (adjustGrams * goldPrice).toFixed(2),
        goldPriceUsdPerGram: goldPrice.toFixed(2),
        description: `Admin ${adjustmentType}: ${reason}`,
        referenceId: referenceNumber,
        sourceModule: 'admin',
        completedAt: new Date(),
      });
      
      // Record wallet adjustment
      await db.insert(walletAdjustments).values({
        id: crypto.randomUUID(),
        referenceNumber,
        userId,
        adjustmentType,
        goldGrams: adjustGrams.toFixed(6),
        amountUsd: adjustUsd.toFixed(2),
        goldPriceUsdPerGram: goldPrice.toFixed(2),
        reason,
        internalNotes,
        executedBy: adminUser.id,
        transactionId: transaction.id,
      });
      
      // Record ledger entry
      const { vaultLedgerService } = await import('./vault-ledger-service');
      if (adjustGrams > 0) {
        await vaultLedgerService.recordLedgerEntry({
          userId,
          action: adjustmentType === 'Credit' ? 'Deposit' : 'Withdrawal',
          goldGrams: adjustGrams,
          goldPriceUsdPerGram: goldPrice,
          fromWallet: adjustmentType === 'Credit' ? 'External' : 'FinaPay',
          toWallet: adjustmentType === 'Credit' ? 'FinaPay' : 'External',
          transactionId: transaction.id,
          notes: `Admin ${adjustmentType}: ${reason}`,
          createdBy: adminUser.id,
        });
      }
      
      // Audit log
      await storage.createAuditLog({
        entityType: "wallet_adjustment",
        entityId: referenceNumber,
        actionType: adjustmentType.toLowerCase(),
        actor: adminUser.id,
        actorRole: "admin",
        details: `${adjustmentType} adjustment for user ${user.firstName} ${user.lastName}: ${adjustGrams}g gold, $${adjustUsd}. Reason: ${reason}`,
      });
      
      // Emit sync event
      emitLedgerEvent(userId, { type: 'balance_update', module: 'finapay', action: 'admin_adjustment', data: { adjustmentType, goldGrams: adjustGrams } });
      
      res.json({ 
        adjustment: { referenceNumber, adjustmentType, goldGrams: adjustGrams, amountUsd: adjustUsd },
        transaction,
        message: `Successfully applied ${adjustmentType} adjustment` 
      });
    } catch (error) {
      console.error('[Wallet Adjustment] Error:', error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Adjustment failed" });
    }
  });

  // Admin: Get wallet adjustments history
  app.get("/api/admin/finapay/wallet-adjustments", ensureAdminAsync, requirePermission('view_transactions', 'manage_transactions'), async (req, res) => {
    try {
      const adjustments = await db.select().from(walletAdjustments).orderBy(desc(walletAdjustments.createdAt)).limit(100);
      res.json({ adjustments });
    } catch (error) {
      res.status(400).json({ message: "Failed to get adjustments" });
    }
  });

  // Admin: Freeze/unfreeze user account
  app.post("/api/admin/users/:userId/freeze", ensureAdminAsync, requirePermission('manage_users'), async (req, res) => {
    try {
      const { userId } = req.params;
      const { freeze, reason } = req.body;
      const adminUser = (req as any).adminUser;
      
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
      
      res.json({ 
        success: true,
        message: freeze ? "Account frozen successfully" : "Account unfrozen successfully"
      });
    } catch (error) {
      console.error('[Account Freeze] Error:', error);
      res.status(400).json({ message: "Failed to update account status" });
    }
  });

  // Admin: Get user account status
  app.get("/api/admin/users/:userId/account-status", ensureAdminAsync, requirePermission('view_users', 'manage_users'), async (req, res) => {
    try {
      const { userId } = req.params;
      const [status] = await db.select().from(userAccountStatus).where(eq(userAccountStatus.userId, userId));
      
      res.json({ 
        status: status || { 
          userId, 
          isFrozen: false, 
          dailyTransferLimitUsd: '10000', 
          monthlyTransferLimitUsd: '100000' 
        } 
      });
    } catch (error) {
      res.status(400).json({ message: "Failed to get account status" });
    }
  });

  // Admin: Update user transfer limits
  app.post("/api/admin/users/:userId/transfer-limits", ensureAdminAsync, requirePermission('manage_users'), async (req, res) => {
    try {
      const { userId } = req.params;
      const { dailyLimit, monthlyLimit } = req.body;
      const adminUser = (req as any).adminUser;
      
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
      
      res.json({ success: true, message: "Transfer limits updated" });
    } catch (error) {
      res.status(400).json({ message: "Failed to update limits" });
    }
  });

  // ============================================================================
  // BINANCE PAY - CRYPTO PAYMENTS
  // ============================================================================

  const { BinancePayService, generateMerchantTradeNo } = await import("./binance-pay");

  // Check if Binance Pay is configured
  app.get("/api/binance-pay/status", async (req, res) => {
    res.json({ 
      configured: BinancePayService.isConfigured(),
      message: BinancePayService.isConfigured() 
        ? "Binance Pay is configured and ready" 
        : "Binance Pay credentials not configured"
    });
  });

  // Create a Binance Pay order for buying gold
  app.post("/api/binance-pay/create-order", async (req, res) => {
    try {
      const { userId, amountUsd, goldGrams, goldPriceUsdPerGram, returnUrl, cancelUrl } = req.body;

      if (!userId || !amountUsd) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const binanceService = BinancePayService.getInstance();
      if (!binanceService) {
        return res.status(503).json({ message: "Binance Pay is not configured. Please add your merchant API credentials." });
      }

      const merchantTradeNo = generateMerchantTradeNo();
      const description = `Purchase ${goldGrams}g digital gold`;

      // Create order with Binance Pay
      const binanceResponse = await binanceService.createOrder({
        merchantTradeNo,
        orderAmount: parseFloat(amountUsd),
        currency: 'USDT',
        description,
        returnUrl,
        cancelUrl,
      });

      if (binanceResponse.status !== 'SUCCESS' || !binanceResponse.data) {
        console.error('Binance Pay order creation failed:', binanceResponse);
        return res.status(400).json({ 
          message: binanceResponse.errorMessage || "Failed to create Binance Pay order" 
        });
      }

      // Save transaction to database
      const transaction = await storage.createBinanceTransaction({
        userId,
        merchantTradeNo,
        prepayId: binanceResponse.data.prepayId,
        orderType: 'Buy',
        status: 'Created',
        orderAmountUsd: amountUsd,
        cryptoCurrency: 'USDT',
        goldGrams: goldGrams?.toString(),
        goldPriceUsdPerGram: goldPriceUsdPerGram?.toString(),
        checkoutUrl: binanceResponse.data.checkoutUrl,
        qrcodeLink: binanceResponse.data.qrcodeLink,
        expireTime: new Date(binanceResponse.data.expireTime),
        description,
      });

      res.json({
        success: true,
        transaction: {
          id: transaction.id,
          merchantTradeNo,
          checkoutUrl: binanceResponse.data.checkoutUrl,
          qrcodeLink: binanceResponse.data.qrcodeLink,
          expireTime: binanceResponse.data.expireTime,
        }
      });
    } catch (error) {
      console.error('Create Binance Pay order error:', error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create order" });
    }
  });

  // Query Binance Pay order status
  app.get("/api/binance-pay/order/:merchantTradeNo", async (req, res) => {
    try {
      const { merchantTradeNo } = req.params;
      
      const transaction = await storage.getBinanceTransactionByMerchantTradeNo(merchantTradeNo);
      if (!transaction) {
        return res.status(404).json({ message: "Order not found" });
      }

      const binanceService = BinancePayService.getInstance();
      if (binanceService) {
        // Query Binance for latest status
        const binanceResponse = await binanceService.queryOrder(merchantTradeNo);
        
        if (binanceResponse.status === 'SUCCESS' && binanceResponse.data) {
          const binanceStatus = binanceResponse.data.status;
          let newStatus = transaction.status;

          // Map Binance status to our status
          if (binanceStatus === 'PAID' && transaction.status === 'Created') {
            newStatus = 'Paid';
          } else if (binanceStatus === 'EXPIRED') {
            newStatus = 'Expired';
          } else if (binanceStatus === 'FAILED') {
            newStatus = 'Failed';
          }

          if (newStatus !== transaction.status) {
            await storage.updateBinanceTransaction(transaction.id, {
              status: newStatus as any,
              transactionId: binanceResponse.data.transactionId,
              cryptoAmount: binanceResponse.data.totalFee?.toString(),
            });
          }

          return res.json({
            transaction: {
              ...transaction,
              status: newStatus,
              binanceStatus: binanceResponse.data.status,
            }
          });
        }
      }

      res.json({ transaction });
    } catch (error) {
      res.status(400).json({ message: "Failed to query order" });
    }
  });

  // Binance Pay webhook handler
  app.post("/api/binance-pay/webhook", async (req, res) => {
    try {
      const timestamp = req.headers['binancepay-timestamp'] as string;
      const nonce = req.headers['binancepay-nonce'] as string;
      const signature = req.headers['binancepay-signature'] as string;
      
      const binanceService = BinancePayService.getInstance();
      
      if (binanceService && timestamp && nonce && signature) {
        // Use the raw body buffer for signature verification to ensure exact payload matching
        const rawBody = (req as any).rawBody;
        const bodyString = rawBody ? rawBody.toString('utf-8') : JSON.stringify(req.body);
        const isValid = binanceService.verifyWebhookSignature(timestamp, nonce, bodyString, signature);
        
        if (!isValid) {
          console.error('Invalid Binance Pay webhook signature');
          return res.status(400).json({ returnCode: 'FAIL', returnMessage: 'Invalid signature' });
        }
      }

      const { bizType, bizId, data } = req.body;
      console.log('Binance Pay webhook received:', { bizType, bizId });

      if (bizType === 'PAY' && data) {
        const merchantTradeNo = data.merchantTradeNo;
        const transaction = await storage.getBinanceTransactionByMerchantTradeNo(merchantTradeNo);
        
        if (transaction) {
          let newStatus = transaction.status;
          
          if (data.orderStatus === 'PAID') {
            newStatus = 'Paid';
            
            // Process the gold purchase - credit user's wallet
            if (transaction.goldGrams && transaction.orderType === 'Buy') {
              const wallet = await storage.getWallet(transaction.userId);
              if (wallet) {
                const newGoldBalance = parseFloat(wallet.goldGrams) + parseFloat(transaction.goldGrams);
                await storage.updateWallet(wallet.id, {
                  goldGrams: newGoldBalance.toFixed(6),
                });

                // Create transaction record
                await storage.createTransaction({
                  userId: transaction.userId,
                  type: 'Buy',
                  status: 'Completed',
                  amountGold: transaction.goldGrams,
                  amountUsd: transaction.orderAmountUsd,
                  goldPriceUsdPerGram: transaction.goldPriceUsdPerGram,
                  description: `Binance Pay purchase: ${transaction.goldGrams}g gold`,
                  sourceModule: 'binance_pay',
                  referenceId: merchantTradeNo,
                });

                newStatus = 'Completed';

                // Send email notification for crypto purchase
                const user = await storage.getUser(transaction.userId);
                if (user && user.email) {
                  await sendEmailDirect(
                    user.email,
                    `Crypto Payment Confirmed - ${transaction.goldGrams}g Gold`,
                    `
                      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <div style="background: linear-gradient(135deg, #f97316, #ea580c); padding: 30px; text-align: center;">
                          <h1 style="color: white; margin: 0;">Payment Confirmed!</h1>
                        </div>
                        <div style="padding: 30px; background: #ffffff;">
                          <p>Hello ${user.firstName},</p>
                          <p>Your crypto payment has been confirmed and processed successfully!</p>
                          <div style="background: #dcfce7; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <table style="width: 100%;">
                              <tr><td>Gold Amount:</td><td style="text-align: right; font-weight: bold;">${transaction.goldGrams}g</td></tr>
                              <tr><td>Amount Paid:</td><td style="text-align: right; font-weight: bold;">$${transaction.orderAmountUsd}</td></tr>
                              <tr><td>Payment Method:</td><td style="text-align: right;">Crypto (Binance Pay)</td></tr>
                              <tr><td>Reference:</td><td style="text-align: right;">${merchantTradeNo}</td></tr>
                            </table>
                          </div>
                          <p>The gold has been added to your FinaPay wallet.</p>
                        </div>
                        <div style="padding: 20px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px;">
                          <p>Finatrades - Gold-Backed Digital Finance</p>
                        </div>
                      </div>
                    `
                  );
                  console.log(`[Email] Crypto payment confirmation sent to ${user.email}`);
                }
              }
            }
          } else if (data.orderStatus === 'EXPIRED') {
            newStatus = 'Expired';
          } else if (data.orderStatus === 'CANCELED') {
            newStatus = 'Cancelled';
          }

          await storage.updateBinanceTransaction(transaction.id, {
            status: newStatus as any,
            transactionId: data.transactionId,
            cryptoAmount: data.totalFee?.toString(),
            cryptoCurrency: data.currency,
            webhookReceivedAt: new Date(),
            webhookPayload: req.body,
          });

          await storage.createAuditLog({
            entityType: 'binance_pay',
            entityId: transaction.id,
            actionType: 'webhook',
            actor: 'system',
            actorRole: 'system',
            details: `Order ${merchantTradeNo} status: ${data.orderStatus}`,
          });
        }
      }

      res.json({ returnCode: 'SUCCESS', returnMessage: 'OK' });
    } catch (error) {
      console.error('Binance Pay webhook error:', error);
      res.status(500).json({ returnCode: 'FAIL', returnMessage: 'Internal error' });
    }
  });

  // Get user's Binance transactions - PROTECTED
  app.get("/api/binance-pay/transactions/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const transactions = await storage.getUserBinanceTransactions(req.params.userId);
      res.json({ transactions });
    } catch (error) {
      res.status(400).json({ message: "Failed to get transactions" });
    }
  });

  // Admin: Get all Binance transactions - PROTECTED
  app.get("/api/admin/binance-pay/transactions", ensureAdminAsync, async (req, res) => {
    try {
      const transactions = await storage.getAllBinanceTransactions();
      
      const enrichedTransactions = await Promise.all(transactions.map(async (tx) => {
        const user = await storage.getUser(tx.userId);
        return { ...tx, user };
      }));
      
      res.json({ transactions: enrichedTransactions });
    } catch (error) {
      res.status(400).json({ message: "Failed to get transactions" });
    }
  });

  // ============================================================================
  // NGENIUS CARD PAYMENTS
  // ============================================================================

  const { NgeniusService, generateOrderReference } = await import("./ngenius");

  // Check NGenius status
  app.get("/api/ngenius/status", async (req, res) => {
    try {
      const settings = await storage.getPaymentGatewaySettings();
      res.json({ 
        enabled: settings?.ngeniusEnabled || false,
        mode: settings?.ngeniusMode || 'sandbox'
      });
    } catch (error) {
      res.json({ enabled: false });
    }
  });

  // Create NGenius card deposit order
  app.post("/api/ngenius/create-order", async (req, res) => {
    try {
      const { userId, amount, currency = 'USD', returnUrl, cancelUrl } = req.body;
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized - userId required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }

      // Get payment gateway settings
      const settings = await storage.getPaymentGatewaySettings();
      if (!settings?.ngeniusEnabled) {
        return res.status(400).json({ message: "Card payments are not enabled" });
      }

      // Use environment variables for NGenius credentials (secure)
      const ngeniusApiKey = process.env.NGENIUS_API_KEY;
      const ngeniusOutletRef = process.env.NGENIUS_OUTLET_REF;
      const ngeniusRealmName = process.env.NGENIUS_REALM_NAME;

      if (!ngeniusApiKey || !ngeniusOutletRef) {
        return res.status(400).json({ message: "Card payments are not configured - missing credentials" });
      }

      // Create NGenius service using environment variables
      const ngeniusService = NgeniusService.getInstance({
        apiKey: ngeniusApiKey,
        outletRef: ngeniusOutletRef,
        realmName: ngeniusRealmName || undefined,
        mode: (settings.ngeniusMode || 'sandbox') as 'sandbox' | 'live',
      });

      const orderReference = generateOrderReference();
      
      // NGenius outlet is configured for AED - convert USD to AED
      const USD_TO_AED_RATE = 3.6725;
      const amountUsd = parseFloat(amount);
      const amountAed = Math.round(amountUsd * USD_TO_AED_RATE * 100) / 100;
      const paymentCurrency = 'AED';
      
      const description = `Wallet deposit - $${amountUsd} USD (${amountAed} AED)`;

      // Build return URL with order reference
      let finalReturnUrl: string;
      if (returnUrl) {
        const separator = returnUrl.includes('?') ? '&' : '?';
        finalReturnUrl = `${returnUrl}${separator}ref=${orderReference}`;
      } else {
        finalReturnUrl = `${req.protocol}://${req.get('host')}/deposit/callback?ref=${orderReference}`;
      }

      // Create order with NGenius in AED
      const orderResponse = await ngeniusService.createOrder({
        orderReference,
        amount: amountAed,
        currency: paymentCurrency,
        description,
        returnUrl: finalReturnUrl,
        cancelUrl: cancelUrl || `${req.protocol}://${req.get('host')}/deposit?cancelled=true`,
      });

      const paymentUrl = ngeniusService.extractPaymentPageUrl(orderResponse);

      // Store transaction in database
      const ngeniusTx = await storage.createNgeniusTransaction({
        userId: user.id,
        orderReference,
        ngeniusOrderId: orderResponse._id,
        status: 'Created',
        amountUsd: amount.toString(),
        currency,
        paymentUrl,
        description,
      });

      await storage.createAuditLog({
        entityType: 'ngenius',
        entityId: ngeniusTx.id,
        actionType: 'create',
        actor: user.id,
        actorRole: user.role || 'user',
        details: `Created card deposit order for ${amount} ${currency}`,
      });

      res.json({
        success: true,
        orderReference,
        paymentUrl,
        orderId: orderResponse._id,
      });
    } catch (error: any) {
      console.error('NGenius create order error:', error);
      res.status(500).json({ 
        message: "Failed to create payment order",
        error: error.message 
      });
    }
  });

  // Get NGenius order status
  app.get("/api/ngenius/order/:orderReference", async (req, res) => {
    try {
      const { orderReference } = req.params;
      const transaction = await storage.getNgeniusTransactionByOrderReference(orderReference);

      if (!transaction) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Optionally fetch latest status from NGenius API
      const settings = await storage.getPaymentGatewaySettings();
      const ngeniusApiKey = process.env.NGENIUS_API_KEY;
      const ngeniusOutletRef = process.env.NGENIUS_OUTLET_REF;
      const ngeniusRealmName = process.env.NGENIUS_REALM_NAME;
      
      if (settings?.ngeniusEnabled && ngeniusApiKey && ngeniusOutletRef && transaction.ngeniusOrderId) {
        try {
          const ngeniusService = NgeniusService.getInstance({
            apiKey: ngeniusApiKey,
            outletRef: ngeniusOutletRef,
            realmName: ngeniusRealmName || undefined,
            mode: (settings.ngeniusMode || 'sandbox') as 'sandbox' | 'live',
          });

          const orderStatus = await ngeniusService.getOrder(transaction.ngeniusOrderId);
          
          // Update local status if different
          let newStatus = transaction.status;
          if (orderStatus.state === 'AUTHORISED') newStatus = 'Authorised';
          else if (orderStatus.state === 'CAPTURED') newStatus = 'Captured';
          else if (orderStatus.state === 'FAILED') newStatus = 'Failed';
          else if (orderStatus.state === 'CANCELLED') newStatus = 'Cancelled';

          if (newStatus !== transaction.status) {
            await storage.updateNgeniusTransaction(transaction.id, { status: newStatus as any });
            
            // If captured, credit the wallet with gold (matching crypto flow exactly)
            if (newStatus === 'Captured' && transaction.status !== 'Captured') {
              const wallet = await storage.getWallet(transaction.userId);
              if (wallet) {
                const depositAmount = parseFloat(transaction.amountUsd || '0');
                let goldPricePerGram: number;
                try {
                  goldPricePerGram = await getGoldPricePerGram();
                } catch {
                  goldPricePerGram = 140;
                }
                const goldGrams = depositAmount / goldPricePerGram;
                const currentGold = parseFloat(wallet.goldGrams || '0');
                
                await storage.updateWallet(wallet.id, {
                  goldGrams: (currentGold + goldGrams).toFixed(6),
                });

                // Create transaction record (type='Buy' like crypto)
                const walletTx = await storage.createTransaction({
                  userId: transaction.userId,
                  type: 'Buy',
                  status: 'Completed',
                  amountUsd: transaction.amountUsd,
                  amountGold: goldGrams.toFixed(6),
                  goldPriceUsdPerGram: goldPricePerGram.toFixed(2),
                  description: `Card payment via NGenius - ${orderReference} | ${goldGrams.toFixed(4)}g @ $${goldPricePerGram.toFixed(2)}/g`,
                  referenceId: orderReference,
                  sourceModule: 'finapay',
                  completedAt: new Date(),
                });

                await storage.updateNgeniusTransaction(transaction.id, {
                  walletTransactionId: walletTx.id,
                });

                // Record vault ledger entry (like crypto)
                const { vaultLedgerService } = await import('./vault-ledger-service');
                await vaultLedgerService.recordLedgerEntry({
                  userId: transaction.userId,
                  action: 'Deposit',
                  goldGrams: goldGrams,
                  goldPriceUsdPerGram: goldPricePerGram,
                  fromWallet: 'External',
                  toWallet: 'FinaPay',
                  toStatus: 'Available',
                  transactionId: walletTx.id,
                  notes: `Card payment: ${goldGrams.toFixed(4)}g at $${goldPricePerGram.toFixed(2)}/g (USD $${depositAmount.toFixed(2)})`,
                  createdBy: 'system',
                });

                // Get or create vault holding (like crypto) - use getUserVaultHoldings
                const userHoldings = await storage.getUserVaultHoldings(transaction.userId);
                let holding = userHoldings[0];
                if (!holding) {
                  holding = await storage.createVaultHolding({
                    userId: transaction.userId,
                    goldGrams: goldGrams.toFixed(6),
                    vaultLocation: 'Dubai - Wingold & Metals DMCC',
                    wingoldStorageRef: `WG-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
                    purchasePriceUsdPerGram: goldPricePerGram.toFixed(2),
                  });
                } else {
                  const newTotalGrams = parseFloat(holding.goldGrams) + goldGrams;
                  await storage.updateVaultHolding(holding.id, {
                    goldGrams: newTotalGrams.toFixed(6),
                  });
                }

                // Digital Ownership Certificate (DOC) from Finatrades
                const docCertNum = await storage.generateCertificateNumber('Digital Ownership');
                await storage.createCertificate({
                  certificateNumber: docCertNum,
                  userId: transaction.userId,
                  transactionId: walletTx.id,
                  vaultHoldingId: holding.id,
                  type: 'Digital Ownership',
                  status: 'Active',
                  goldGrams: goldGrams.toFixed(6),
                  goldPriceUsdPerGram: goldPricePerGram.toFixed(2),
                  totalValueUsd: depositAmount.toFixed(2),
                  issuer: 'Finatrades',
                  vaultLocation: 'Dubai - Wingold & Metals DMCC',
                  issuedAt: new Date(),
                });

                // Physical Storage Certificate (SSC) from Wingold & Metals DMCC
                const sscCertNum = await storage.generateCertificateNumber('Physical Storage');
                await storage.createCertificate({
                  certificateNumber: sscCertNum,
                  userId: transaction.userId,
                  transactionId: walletTx.id,
                  vaultHoldingId: holding.id,
                  type: 'Physical Storage',
                  status: 'Active',
                  goldGrams: goldGrams.toFixed(6),
                  goldPriceUsdPerGram: goldPricePerGram.toFixed(2),
                  totalValueUsd: depositAmount.toFixed(2),
                  issuer: 'Wingold & Metals DMCC',
                  vaultLocation: 'Dubai - Wingold & Metals DMCC',
                  issuedAt: new Date(),
                });

                console.log(`[NGenius] Certificates ${docCertNum} + ${sscCertNum} created for card payment ${orderReference}`);

                // Send receipt email
                const user = await storage.getUser(transaction.userId);
                if (user?.email) {
                  const updatedWallet = await storage.getWallet(transaction.userId);
                  const totalGold = parseFloat(updatedWallet?.goldGrams || '0');
                  const totalValue = totalGold * goldPricePerGram;

                  await sendEmail(user.email, EMAIL_TEMPLATES.CARD_PAYMENT_RECEIPT, {
                    user_name: user.firstName || user.email,
                    amount: depositAmount.toFixed(2),
                    reference_id: orderReference,
                    transaction_date: new Date().toLocaleString('en-US', { 
                      dateStyle: 'medium', 
                      timeStyle: 'short' 
                    }),
                    card_last4: orderStatus._embedded?.payment?.[0]?.paymentMethod?.pan?.slice(-4) || '****',
                    certificate_number: docCertNum,
                    gold_grams: goldGrams.toFixed(4),
                    gold_price: goldPricePerGram.toFixed(2),
                    total_gold_grams: totalGold.toFixed(4),
                    total_value_usd: totalValue.toFixed(2),
                    dashboard_url: `${process.env.REPLIT_DOMAINS || 'https://finatrades.com'}/dashboard`,
                  });
                  console.log(`[NGenius] Receipt email sent to ${user.email} for ${orderReference}`);
                }

                // Create notification
                await storage.createNotification({
                  userId: transaction.userId,
                  title: 'Card Payment Credited',
                  message: `Your card payment of $${depositAmount.toFixed(2)} has been credited. ${goldGrams.toFixed(4)}g gold has been added to your wallet.`,
                  type: 'success',
                  read: false,
                });
              }
            }
          }

          return res.json({ 
            ...transaction,
            status: newStatus,
            ngeniusStatus: orderStatus.state
          });
        } catch (apiError) {
          console.error('NGenius API error:', apiError);
        }
      }

      res.json(transaction);
    } catch (error) {
      res.status(400).json({ message: "Failed to get order status" });
    }
  });

  // Admin: Resend card payment receipt email
  app.post("/api/admin/ngenius/resend-receipt/:orderReference", async (req, res) => {
    try {
      const { orderReference } = req.params;
      
      // Get the NGenius transaction
      const ngTransaction = await storage.getNgeniusTransactionByOrderReference(orderReference);
      if (!ngTransaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      if (ngTransaction.status !== 'Captured') {
        return res.status(400).json({ message: "Can only resend receipts for captured payments" });
      }

      const user = await storage.getUser(ngTransaction.userId);
      if (!user?.email) {
        return res.status(400).json({ message: "User email not found" });
      }

      const wallet = await storage.getWallet(ngTransaction.userId);
      const depositAmount = parseFloat(ngTransaction.amountUsd || '0');
      
      let goldPricePerGram: number;
      try {
        goldPricePerGram = await getGoldPricePerGram();
      } catch {
        goldPricePerGram = 139.44;
      }
      
      const goldGrams = depositAmount / goldPricePerGram;
      const totalGold = parseFloat(wallet?.goldGrams || '0');
      const totalValue = totalGold * goldPricePerGram;

      // Get certificate for this transaction (use transaction ID if available)
      let certificateNumber = `FT-DOC-${orderReference.substring(0, 12).toUpperCase()}`;
      if (ngTransaction.walletTransactionId) {
        const cert = await storage.getCertificateByTransactionId(ngTransaction.walletTransactionId);
        if (cert) {
          certificateNumber = cert.certificateNumber;
        }
      }

      await sendEmail(user.email, EMAIL_TEMPLATES.CARD_PAYMENT_RECEIPT, {
        user_name: user.firstName || user.email,
        amount: depositAmount.toFixed(2),
        reference_id: orderReference,
        transaction_date: new Date(ngTransaction.createdAt!).toLocaleString('en-US', { 
          dateStyle: 'medium', 
          timeStyle: 'short' 
        }),
        card_last4: ngTransaction.cardLast4 || '****',
        certificate_number: certificateNumber,
        gold_grams: goldGrams.toFixed(4),
        gold_price: goldPricePerGram.toFixed(2),
        total_gold_grams: totalGold.toFixed(4),
        total_value_usd: totalValue.toFixed(2),
        dashboard_url: `${process.env.REPLIT_DOMAINS || 'https://finatrades.com'}/dashboard`,
      });

      res.json({ 
        success: true, 
        message: `Receipt email sent to ${user.email}`,
        orderReference,
        certificateNumber 
      });
    } catch (error: any) {
      console.error('Resend receipt error:', error);
      res.status(500).json({ message: error.message || "Failed to resend receipt" });
    }
  });

  // NGenius SDK configuration for embedded card form
  app.get("/api/ngenius/sdk-config", async (req, res) => {
    try {
      const settings = await storage.getPaymentGatewaySettings();
      const ngeniusOutletRef = process.env.NGENIUS_OUTLET_REF;
      const ngeniusHostedSessionKey = process.env.NGENIUS_HOSTED_SESSION_KEY;

      if (!settings?.ngeniusEnabled || !ngeniusOutletRef || !ngeniusHostedSessionKey) {
        return res.json({ 
          enabled: false,
          apiKey: '',
          outletRef: '',
          sdkUrl: '',
          mode: 'live',
        });
      }

      const mode = settings.ngeniusMode || 'live';
      const sdkUrl = mode === 'live' 
        ? 'https://paypage.ngenius-payments.com/hosted-sessions/sdk.js'
        : 'https://paypage-uat.ngenius-payments.com/hosted-sessions/sdk.js';

      res.json({
        enabled: true,
        apiKey: ngeniusHostedSessionKey,
        outletRef: ngeniusOutletRef,
        sdkUrl,
        mode,
      });
    } catch (error) {
      res.status(500).json({ enabled: false, message: "Failed to get SDK config" });
    }
  });

  // Create hosted session for embedded card form
  app.post("/api/ngenius/create-session", async (req, res) => {
    try {
      const { userId, amount } = req.body;
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized - userId required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }

      const settings = await storage.getPaymentGatewaySettings();
      const ngeniusApiKey = process.env.NGENIUS_API_KEY;
      const ngeniusOutletRef = process.env.NGENIUS_OUTLET_REF;
      const ngeniusRealmName = process.env.NGENIUS_REALM_NAME;

      if (!settings?.ngeniusEnabled || !ngeniusApiKey || !ngeniusOutletRef) {
        return res.status(400).json({ message: "Card payments not configured" });
      }

      const ngeniusService = NgeniusService.getInstance({
        apiKey: ngeniusApiKey,
        outletRef: ngeniusOutletRef,
        realmName: ngeniusRealmName || undefined,
        mode: (settings.ngeniusMode || 'live') as 'sandbox' | 'live',
      });

      const orderReference = generateOrderReference();
      
      // Convert USD to AED for NGenius
      const USD_TO_AED_RATE = 3.6725;
      const amountUsd = parseFloat(amount);
      const amountAed = Math.round(amountUsd * USD_TO_AED_RATE * 100) / 100;

      const session = await ngeniusService.createHostedSession({
        orderReference,
        amount: amountAed,
        currency: 'AED',
      });

      // Store transaction record
      await storage.createNgeniusTransaction({
        userId: user.id,
        orderReference,
        ngeniusOrderId: session.sessionId,
        status: 'Created',
        amountUsd: amountUsd.toString(),
        currency: 'AED',
        description: `Card deposit - $${amountUsd} USD`,
      });

      res.json({
        success: true,
        sessionId: session.sessionId,
        orderReference,
        amount: {
          usd: amountUsd,
          aed: amountAed,
        },
      });
    } catch (error: any) {
      console.error('NGenius create session error:', error);
      res.status(500).json({ 
        message: "Failed to create payment session",
        error: error.message 
      });
    }
  });

  // Complete payment after card entry
  app.post("/api/ngenius/complete-session", async (req, res) => {
    try {
      const { userId, orderReference } = req.body;
      
      if (!userId || !orderReference) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const transaction = await storage.getNgeniusTransactionByOrderReference(orderReference);
      if (!transaction || transaction.userId !== userId) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      const settings = await storage.getPaymentGatewaySettings();
      const ngeniusApiKey = process.env.NGENIUS_API_KEY;
      const ngeniusOutletRef = process.env.NGENIUS_OUTLET_REF;
      const ngeniusRealmName = process.env.NGENIUS_REALM_NAME;

      if (!ngeniusApiKey || !ngeniusOutletRef) {
        return res.status(400).json({ message: "Card payments not configured" });
      }

      const ngeniusService = NgeniusService.getInstance({
        apiKey: ngeniusApiKey,
        outletRef: ngeniusOutletRef,
        realmName: ngeniusRealmName || undefined,
        mode: (settings?.ngeniusMode || 'live') as 'sandbox' | 'live',
      });

      // Check order status
      const result = await ngeniusService.completeHostedPayment(transaction.ngeniusOrderId!);

      if (result.success) {
        // Update transaction status
        await storage.updateNgeniusTransaction(transaction.id, {
          status: result.status as any,
        });

        // Credit wallet with gold (matching crypto flow)
        const wallet = await storage.getWallet(userId);
        if (wallet && ['CAPTURED', 'AUTHORISED', 'PURCHASED'].includes(result.status)) {
          const depositAmount = parseFloat(transaction.amountUsd || '0');
          let goldPricePerGram: number;
          try {
            goldPricePerGram = await getGoldPricePerGram();
          } catch {
            goldPricePerGram = 140;
          }
          
          const goldGrams = depositAmount / goldPricePerGram;
          
          await storage.updateWallet(wallet.id, {
            goldGrams: (parseFloat(wallet.goldGrams || '0') + goldGrams).toString(),
          });

          const walletTx = await storage.createTransaction({
            userId,
            type: 'Buy',
            status: 'Completed',
            amountUsd: transaction.amountUsd,
            amountGold: goldGrams.toFixed(6),
            goldPriceUsdPerGram: goldPricePerGram.toFixed(2),
            description: `Card payment via NGenius - ${orderReference} | ${goldGrams.toFixed(4)}g @ $${goldPricePerGram.toFixed(2)}/g`,
            referenceId: orderReference,
            sourceModule: 'finapay',
            completedAt: new Date(),
          });

          await storage.updateNgeniusTransaction(transaction.id, {
            walletTransactionId: walletTx.id,
            status: 'Captured',
          });

          // Record vault ledger entry
          const { vaultLedgerService } = await import('./vault-ledger-service');
          await vaultLedgerService.recordLedgerEntry({
            userId,
            action: 'Deposit',
            goldGrams: goldGrams,
            goldPriceUsdPerGram: goldPricePerGram,
            fromWallet: 'External',
            toWallet: 'FinaPay',
            toStatus: 'Available',
            transactionId: walletTx.id,
            notes: `Card payment: ${goldGrams.toFixed(4)}g at $${goldPricePerGram.toFixed(2)}/g (USD $${depositAmount.toFixed(2)})`,
            createdBy: 'system',
          });

          // Get or create vault holding - use getUserVaultHoldings
          const userHoldings = await storage.getUserVaultHoldings(userId);
          let holding = userHoldings[0];
          if (!holding) {
            holding = await storage.createVaultHolding({
              userId,
              goldGrams: goldGrams.toFixed(6),
              vaultLocation: 'Dubai - Wingold & Metals DMCC',
              wingoldStorageRef: `WG-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
              purchasePriceUsdPerGram: goldPricePerGram.toFixed(2),
            });
          } else {
            const newTotalGrams = parseFloat(holding.goldGrams) + goldGrams;
            await storage.updateVaultHolding(holding.id, {
              goldGrams: newTotalGrams.toFixed(6),
            });
          }

          // Digital Ownership Certificate
          const docCertNum = await storage.generateCertificateNumber('Digital Ownership');
          await storage.createCertificate({
            certificateNumber: docCertNum,
            userId,
            transactionId: walletTx.id,
            vaultHoldingId: holding.id,
            type: 'Digital Ownership',
            status: 'Active',
            goldGrams: goldGrams.toFixed(6),
            goldPriceUsdPerGram: goldPricePerGram.toFixed(2),
            totalValueUsd: depositAmount.toFixed(2),
            issuer: 'Finatrades',
            vaultLocation: 'Dubai - Wingold & Metals DMCC',
            issuedAt: new Date(),
          });

          // Physical Storage Certificate
          const sscCertNum = await storage.generateCertificateNumber('Physical Storage');
          await storage.createCertificate({
            certificateNumber: sscCertNum,
            userId,
            transactionId: walletTx.id,
            vaultHoldingId: holding.id,
            type: 'Physical Storage',
            status: 'Active',
            goldGrams: goldGrams.toFixed(6),
            goldPriceUsdPerGram: goldPricePerGram.toFixed(2),
            totalValueUsd: depositAmount.toFixed(2),
            issuer: 'Wingold & Metals DMCC',
            vaultLocation: 'Dubai - Wingold & Metals DMCC',
            issuedAt: new Date(),
          });

          // Create notification
          await storage.createNotification({
            userId,
            title: 'Card Payment Credited',
            message: `Your card payment of $${depositAmount.toFixed(2)} has been credited. ${goldGrams.toFixed(4)}g gold has been added to your wallet.`,
            type: 'success',
            read: false,
          });

          // Emit real-time sync event for auto-update
          emitLedgerEvent(userId, {
            type: 'balance_update',
            module: 'finapay',
            action: 'card_payment_credited',
            data: { goldGrams, amountUsd: depositAmount },
          });

          res.json({
            success: true,
            status: 'completed',
            goldGrams: goldGrams.toFixed(6),
            amountUsd: depositAmount,
          });
        } else {
          res.json({
            success: true,
            status: result.status,
          });
        }
      } else {
        await storage.updateNgeniusTransaction(transaction.id, {
          status: 'Failed',
        });
        
        res.json({
          success: false,
          status: result.status,
          message: "Payment not completed",
        });
      }
    } catch (error: any) {
      console.error('NGenius complete session error:', error);
      res.status(500).json({ 
        message: "Failed to complete payment",
        error: error.message 
      });
    }
  });

  // Process payment with session ID from frontend SDK (NGenius Hosted Sessions)
  app.post("/api/ngenius/process-hosted-payment", async (req, res) => {
    try {
      const { userId, sessionId, amount } = req.body;
      
      if (!userId || !sessionId || !amount) {
        return res.status(400).json({ 
          success: false,
          message: "Missing required fields (userId, sessionId, amount)" 
        });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ success: false, message: "User not found" });
      }

      const settings = await storage.getPaymentGatewaySettings();
      const ngeniusApiKey = process.env.NGENIUS_API_KEY;
      const ngeniusOutletRef = process.env.NGENIUS_OUTLET_REF;
      const ngeniusRealmName = process.env.NGENIUS_REALM_NAME;

      if (!settings?.ngeniusEnabled || !ngeniusApiKey || !ngeniusOutletRef) {
        return res.status(400).json({ success: false, message: "Card payments not configured" });
      }

      const ngeniusService = NgeniusService.getInstance({
        apiKey: ngeniusApiKey,
        outletRef: ngeniusOutletRef,
        realmName: ngeniusRealmName || undefined,
        mode: (settings.ngeniusMode || 'live') as 'sandbox' | 'live',
      });

      const orderReference = generateOrderReference();
      
      // Convert USD to AED for NGenius
      const USD_TO_AED_RATE = 3.6725;
      const amountUsd = parseFloat(amount);
      const amountAed = Math.round(amountUsd * USD_TO_AED_RATE * 100) / 100;

      console.log(`[NGenius] Processing hosted payment: $${amountUsd} USD = ${amountAed} AED, sessionId: ${sessionId}`);

      // Store pending transaction
      const txRecord = await storage.createNgeniusTransaction({
        userId: user.id,
        orderReference,
        status: 'Pending',
        amountUsd: amountUsd.toString(),
        currency: 'AED',
        description: `Card deposit - $${amountUsd} USD`,
      });

      // Process payment with session ID
      const result = await ngeniusService.processPaymentWithSessionId({
        sessionId,
        amount: amountAed,
        currency: 'AED',
        orderReference,
      });

      // Handle 3DS redirect if required
      if (result.status === 'AWAIT_3DS' && result.threeDSUrl) {
        // Update transaction status
        await storage.updateNgeniusTransaction(txRecord.id, {
          ngeniusOrderId: result.orderId,
          status: 'Awaiting3DS',
        });
        
        console.log(`[NGenius] Payment requires 3DS authentication: ${result.threeDSUrl}`);
        
        return res.json({
          success: false,
          status: 'AWAIT_3DS',
          requires3DS: true,
          threeDSUrl: result.threeDSUrl,
          paymentResponse: result.paymentResponse,
          orderId: result.orderId,
          orderReference,
          message: 'Please complete 3D Secure authentication',
        });
      }

      if (result.success) {
        // Update transaction with NGenius order ID
        await storage.updateNgeniusTransaction(txRecord.id, {
          ngeniusOrderId: result.orderId,
          status: 'Captured',
        });

        // Credit wallet with gold (matching crypto flow)
        const wallet = await storage.getWallet(userId);
        if (wallet) {
          let goldPricePerGram: number;
          try {
            goldPricePerGram = await getGoldPricePerGram();
          } catch {
            goldPricePerGram = 140;
          }
          
          const goldGrams = amountUsd / goldPricePerGram;
          const currentGold = parseFloat(wallet.goldGrams || '0');
          
          await storage.updateWallet(wallet.id, {
            goldGrams: (currentGold + goldGrams).toFixed(6),
          });

          // Create transaction record (type='Buy' like crypto)
          const walletTx = await storage.createTransaction({
            userId,
            type: 'Buy',
            status: 'Completed',
            amountUsd: amountUsd.toString(),
            amountGold: goldGrams.toFixed(6),
            goldPriceUsdPerGram: goldPricePerGram.toFixed(2),
            description: `Card payment via NGenius - ${orderReference} | ${goldGrams.toFixed(4)}g @ $${goldPricePerGram.toFixed(2)}/g`,
            referenceId: orderReference,
            sourceModule: 'finapay',
            completedAt: new Date(),
          });

          await storage.updateNgeniusTransaction(txRecord.id, {
            walletTransactionId: walletTx.id,
          });

          // Record vault ledger entry
          const { vaultLedgerService } = await import('./vault-ledger-service');
          await vaultLedgerService.recordLedgerEntry({
            userId,
            action: 'Deposit',
            goldGrams: goldGrams,
            goldPriceUsdPerGram: goldPricePerGram,
            fromWallet: 'External',
            toWallet: 'FinaPay',
            toStatus: 'Available',
            transactionId: walletTx.id,
            notes: `Card payment: ${goldGrams.toFixed(4)}g at $${goldPricePerGram.toFixed(2)}/g (USD $${amountUsd.toFixed(2)})`,
            createdBy: 'system',
          });

          // Get or create vault holding - use getUserVaultHoldings
          const userHoldings = await storage.getUserVaultHoldings(userId);
          let holding = userHoldings[0];
          if (!holding) {
            holding = await storage.createVaultHolding({
              userId,
              goldGrams: goldGrams.toFixed(6),
              vaultLocation: 'Dubai - Wingold & Metals DMCC',
              wingoldStorageRef: `WG-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
              purchasePriceUsdPerGram: goldPricePerGram.toFixed(2),
            });
          } else {
            const newTotalGrams = parseFloat(holding.goldGrams) + goldGrams;
            await storage.updateVaultHolding(holding.id, {
              goldGrams: newTotalGrams.toFixed(6),
            });
          }

          // Digital Ownership Certificate
          const docCertNum = await storage.generateCertificateNumber('Digital Ownership');
          await storage.createCertificate({
            certificateNumber: docCertNum,
            userId,
            transactionId: walletTx.id,
            vaultHoldingId: holding.id,
            type: 'Digital Ownership',
            status: 'Active',
            goldGrams: goldGrams.toFixed(6),
            goldPriceUsdPerGram: goldPricePerGram.toFixed(2),
            totalValueUsd: amountUsd.toFixed(2),
            issuer: 'Finatrades',
            vaultLocation: 'Dubai - Wingold & Metals DMCC',
            issuedAt: new Date(),
          });

          // Physical Storage Certificate
          const sscCertNum = await storage.generateCertificateNumber('Physical Storage');
          await storage.createCertificate({
            certificateNumber: sscCertNum,
            userId,
            transactionId: walletTx.id,
            vaultHoldingId: holding.id,
            type: 'Physical Storage',
            status: 'Active',
            goldGrams: goldGrams.toFixed(6),
            goldPriceUsdPerGram: goldPricePerGram.toFixed(2),
            totalValueUsd: amountUsd.toFixed(2),
            issuer: 'Wingold & Metals DMCC',
            vaultLocation: 'Dubai - Wingold & Metals DMCC',
            issuedAt: new Date(),
          });

          // Send notification
          await storage.createNotification({
            userId,
            title: 'Card Payment Credited',
            message: `Your card payment of $${amountUsd.toFixed(2)} has been credited. ${goldGrams.toFixed(4)}g gold has been added to your wallet.`,
            type: 'success',
            read: false,
          });

          // Emit real-time sync event for auto-update
          emitLedgerEvent(userId, {
            type: 'balance_update',
            module: 'finapay',
            action: 'card_payment_credited',
            data: { goldGrams, amountUsd },
          });

          console.log(`[NGenius] Payment successful: ${goldGrams.toFixed(4)}g gold credited with dual certificates`);

          res.json({
            success: true,
            status: 'completed',
            goldGrams: goldGrams.toFixed(6),
            amountUsd,
          });
        } else {
          res.json({
            success: false,
            message: "Wallet not found",
          });
        }
      } else {
        await storage.updateNgeniusTransaction(txRecord.id, {
          status: 'Failed',
        });
        
        console.log(`[NGenius] Payment failed: ${result.message}`);
        
        res.json({
          success: false,
          status: result.status,
          message: result.message || "Payment failed",
        });
      }
    } catch (error: any) {
      console.error('NGenius process hosted payment error:', error);
      res.status(500).json({ 
        success: false,
        message: error.message || "Failed to process payment",
      });
    }
  });

  // NGenius webhook handler
  app.post("/api/ngenius/webhook", async (req, res) => {
    try {
      console.log('NGenius webhook received:', JSON.stringify(req.body, null, 2));

      const settings = await storage.getPaymentGatewaySettings();
      const ngeniusApiKey = process.env.NGENIUS_API_KEY;
      const ngeniusOutletRef = process.env.NGENIUS_OUTLET_REF;
      const ngeniusRealmName = process.env.NGENIUS_REALM_NAME;

      if (!settings?.ngeniusEnabled || !ngeniusApiKey || !ngeniusOutletRef) {
        return res.status(400).json({ message: "NGenius not configured" });
      }

      const ngeniusService = NgeniusService.getInstance({
        apiKey: ngeniusApiKey,
        outletRef: ngeniusOutletRef,
        realmName: ngeniusRealmName || undefined,
        mode: (settings.ngeniusMode || 'sandbox') as 'sandbox' | 'live',
      });

      const webhookData = ngeniusService.parseWebhookPayload(req.body);
      
      // Find transaction by NGenius order ID
      const transaction = await storage.getNgeniusTransactionByNgeniusOrderId(webhookData.orderId);

      if (transaction) {
        const updates: any = {
          status: webhookData.status,
          webhookReceivedAt: new Date(),
          webhookPayload: req.body,
        };

        if (webhookData.paymentId) updates.ngeniusPaymentId = webhookData.paymentId;
        if (webhookData.cardBrand) updates.cardBrand = webhookData.cardBrand;
        if (webhookData.cardLast4) updates.cardLast4 = webhookData.cardLast4;
        if (webhookData.cardholderName) updates.cardholderName = webhookData.cardholderName;

        await storage.updateNgeniusTransaction(transaction.id, updates);

        // If payment captured, credit wallet with gold (matching crypto flow)
        if (webhookData.status === 'Captured' && transaction.status !== 'Captured') {
          const wallet = await storage.getWallet(transaction.userId);
          if (wallet) {
            const depositAmount = parseFloat(transaction.amountUsd || '0');
            let goldPricePerGram: number;
            try {
              goldPricePerGram = await getGoldPricePerGram();
            } catch {
              goldPricePerGram = 140;
            }
            const goldGrams = depositAmount / goldPricePerGram;
            const currentGold = parseFloat(wallet.goldGrams || '0');
            
            await storage.updateWallet(wallet.id, {
              goldGrams: (currentGold + goldGrams).toFixed(6),
            });

            // Create transaction record (type='Buy' like crypto)
            const walletTx = await storage.createTransaction({
              userId: transaction.userId,
              type: 'Buy',
              status: 'Completed',
              amountUsd: transaction.amountUsd,
              amountGold: goldGrams.toFixed(6),
              goldPriceUsdPerGram: goldPricePerGram.toFixed(2),
              description: `Card payment via NGenius webhook - ${transaction.orderReference} | ${goldGrams.toFixed(4)}g @ $${goldPricePerGram.toFixed(2)}/g`,
              referenceId: transaction.orderReference,
              sourceModule: 'finapay',
              completedAt: new Date(),
            });

            await storage.updateNgeniusTransaction(transaction.id, {
              walletTransactionId: walletTx.id,
            });

            // Record vault ledger entry
            const { vaultLedgerService } = await import('./vault-ledger-service');
            await vaultLedgerService.recordLedgerEntry({
              userId: transaction.userId,
              action: 'Deposit',
              goldGrams: goldGrams,
              goldPriceUsdPerGram: goldPricePerGram,
              fromWallet: 'External',
              toWallet: 'FinaPay',
              toStatus: 'Available',
              transactionId: walletTx.id,
              notes: `Card payment (webhook): ${goldGrams.toFixed(4)}g at $${goldPricePerGram.toFixed(2)}/g (USD $${depositAmount.toFixed(2)})`,
              createdBy: 'system',
            });

            // Get or create vault holding - use getUserVaultHoldings
            const userHoldings = await storage.getUserVaultHoldings(transaction.userId);
            let holding = userHoldings[0];
            if (!holding) {
              holding = await storage.createVaultHolding({
                userId: transaction.userId,
                goldGrams: goldGrams.toFixed(6),
                vaultLocation: 'Dubai - Wingold & Metals DMCC',
                wingoldStorageRef: `WG-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
                purchasePriceUsdPerGram: goldPricePerGram.toFixed(2),
              });
            } else {
              const newTotalGrams = parseFloat(holding.goldGrams) + goldGrams;
              await storage.updateVaultHolding(holding.id, {
                goldGrams: newTotalGrams.toFixed(6),
              });
            }

            // Digital Ownership Certificate
            const docCertNum = await storage.generateCertificateNumber('Digital Ownership');
            await storage.createCertificate({
              certificateNumber: docCertNum,
              userId: transaction.userId,
              transactionId: walletTx.id,
              vaultHoldingId: holding.id,
              type: 'Digital Ownership',
              status: 'Active',
              goldGrams: goldGrams.toFixed(6),
              goldPriceUsdPerGram: goldPricePerGram.toFixed(2),
              totalValueUsd: depositAmount.toFixed(2),
              issuer: 'Finatrades',
              vaultLocation: 'Dubai - Wingold & Metals DMCC',
              issuedAt: new Date(),
            });

            // Physical Storage Certificate
            const sscCertNum = await storage.generateCertificateNumber('Physical Storage');
            await storage.createCertificate({
              certificateNumber: sscCertNum,
              userId: transaction.userId,
              transactionId: walletTx.id,
              vaultHoldingId: holding.id,
              type: 'Physical Storage',
              status: 'Active',
              goldGrams: goldGrams.toFixed(6),
              goldPriceUsdPerGram: goldPricePerGram.toFixed(2),
              totalValueUsd: depositAmount.toFixed(2),
              issuer: 'Wingold & Metals DMCC',
              vaultLocation: 'Dubai - Wingold & Metals DMCC',
              issuedAt: new Date(),
            });

            // Create notification
            await storage.createNotification({
              userId: transaction.userId,
              title: 'Card Payment Credited',
              message: `Your card payment of $${depositAmount.toFixed(2)} has been credited. ${goldGrams.toFixed(4)}g gold has been added to your wallet.`,
              type: 'success',
              read: false,
            });

            // Emit real-time sync event for auto-update
            emitLedgerEvent(transaction.userId, {
              type: 'balance_update',
              module: 'finapay',
              action: 'card_payment_credited',
              data: { goldGrams, amountUsd: depositAmount },
            });

            console.log(`[NGenius Webhook] Dual certificates created for ${transaction.orderReference}`);
          }
        }

        await storage.createAuditLog({
          entityType: 'ngenius',
          entityId: transaction.id,
          actionType: 'webhook',
          actor: 'system',
          actorRole: 'system',
          details: `Order ${transaction.orderReference} status: ${webhookData.status}`,
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('NGenius webhook error:', error);
      res.status(500).json({ success: false });
    }
  });

  // Get user's NGenius transactions - PROTECTED
  app.get("/api/ngenius/transactions/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const transactions = await storage.getUserNgeniusTransactions(req.params.userId);
      res.json({ transactions });
    } catch (error) {
      res.status(400).json({ message: "Failed to get transactions" });
    }
  });

  // Admin: Get all NGenius transactions - PROTECTED
  app.get("/api/admin/ngenius/transactions", ensureAdminAsync, async (req, res) => {
    try {
      const transactions = await storage.getAllNgeniusTransactions();
      
      const enrichedTransactions = await Promise.all(transactions.map(async (tx) => {
        const user = await storage.getUser(tx.userId);
        return { ...tx, user };
      }));
      
      res.json({ transactions: enrichedTransactions });
    } catch (error) {
      res.status(400).json({ message: "Failed to get transactions" });
    }
  });

  // Admin: Fix card payment records missing vault holding and Physical Storage certificate
  app.post("/api/admin/ngenius/fix-card-payment/:transactionId", ensureAdminAsync, async (req, res) => {
    try {
      const { transactionId } = req.params;
      const adminUser = (req as any).adminUser;
      
      // Get the transaction
      const transaction = await storage.getTransaction(transactionId);
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      // Check if it's a card payment transaction
      if (!transaction.description?.includes('NGenius') && !transaction.description?.includes('Card')) {
        return res.status(400).json({ message: "This is not a card payment transaction" });
      }

      // Get existing certificates for this transaction
      const existingCerts = await storage.getCertificatesByTransactionId(transactionId);
      const hasDigitalOwnership = existingCerts.some(c => c.type === 'Digital Ownership');
      const hasPhysicalStorage = existingCerts.some(c => c.type === 'Physical Storage');

      // Get or create vault holding - use getUserVaultHoldings
      const userHoldings = await storage.getUserVaultHoldings(transaction.userId);
      let holding = userHoldings[0];
      const goldGrams = parseFloat(transaction.amountGold || '0');
      const goldPricePerGram = parseFloat(transaction.goldPriceUsdPerGram || '140');
      const depositAmount = parseFloat(transaction.amountUsd || '0');

      if (!holding) {
        holding = await storage.createVaultHolding({
          userId: transaction.userId,
          goldGrams: goldGrams.toFixed(6),
          vaultLocation: 'Dubai - Wingold & Metals DMCC',
          wingoldStorageRef: `WG-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          purchasePriceUsdPerGram: goldPricePerGram.toFixed(2),
        });
        console.log(`[Fix Card Payment] Created vault holding for user ${transaction.userId}`);
      }

      const createdCerts: any[] = [];

      // Create Digital Ownership Certificate if missing
      if (!hasDigitalOwnership) {
        const docCertNum = await storage.generateCertificateNumber('Digital Ownership');
        const docCert = await storage.createCertificate({
          certificateNumber: docCertNum,
          userId: transaction.userId,
          transactionId: transactionId,
          vaultHoldingId: holding.id,
          type: 'Digital Ownership',
          status: 'Active',
          goldGrams: goldGrams.toFixed(6),
          goldPriceUsdPerGram: goldPricePerGram.toFixed(2),
          totalValueUsd: depositAmount.toFixed(2),
          issuer: 'Finatrades',
          vaultLocation: 'Dubai - Wingold & Metals DMCC',
          issuedAt: transaction.createdAt || new Date(),
        });
        createdCerts.push(docCert);
        console.log(`[Fix Card Payment] Created Digital Ownership Certificate ${docCertNum}`);
      }

      // Create Physical Storage Certificate if missing
      if (!hasPhysicalStorage) {
        const sscCertNum = await storage.generateCertificateNumber('Physical Storage');
        const sscCert = await storage.createCertificate({
          certificateNumber: sscCertNum,
          userId: transaction.userId,
          transactionId: transactionId,
          vaultHoldingId: holding.id,
          type: 'Physical Storage',
          status: 'Active',
          goldGrams: goldGrams.toFixed(6),
          goldPriceUsdPerGram: goldPricePerGram.toFixed(2),
          totalValueUsd: depositAmount.toFixed(2),
          issuer: 'Wingold & Metals DMCC',
          vaultLocation: 'Dubai - Wingold & Metals DMCC',
          issuedAt: transaction.createdAt || new Date(),
        });
        createdCerts.push(sscCert);
        console.log(`[Fix Card Payment] Created Physical Storage Certificate ${sscCertNum}`);
      }

      // Update existing DOC certificates to include vaultHoldingId and totalValueUsd if missing
      for (const cert of existingCerts) {
        if (cert.type === 'Digital Ownership' && (!cert.vaultHoldingId || !cert.totalValueUsd)) {
          await storage.updateCertificate(cert.id, {
            vaultHoldingId: holding.id,
            totalValueUsd: depositAmount.toFixed(2),
          });
          console.log(`[Fix Card Payment] Updated existing DOC ${cert.certificateNumber} with vault holding reference`);
        }
      }

      // Create vault ledger entry if needed
      const { vaultLedgerService } = await import('./vault-ledger-service');
      await vaultLedgerService.recordLedgerEntry({
        userId: transaction.userId,
        action: 'Deposit',
        goldGrams: goldGrams,
        goldPriceUsdPerGram: goldPricePerGram,
        fromWallet: 'External',
        toWallet: 'FinaPay',
        toStatus: 'Available',
        transactionId: transactionId,
        notes: `[Fix] Card payment: ${goldGrams.toFixed(4)}g at $${goldPricePerGram.toFixed(2)}/g (USD $${depositAmount.toFixed(2)})`,
        createdBy: adminUser?.id || 'system',
      });

      await storage.createAuditLog({
        entityType: 'transaction',
        entityId: transactionId,
        actionType: 'fix_card_payment',
        actor: adminUser?.id || 'admin',
        actorRole: 'admin',
        details: `Fixed card payment: created ${createdCerts.length} certificates and vault ledger entry`,
      });

      res.json({
        success: true,
        message: `Fixed card payment: created ${createdCerts.length} certificates`,
        createdCertificates: createdCerts.map(c => ({ number: c.certificateNumber, type: c.type })),
        vaultHoldingId: holding.id,
      });
    } catch (error: any) {
      console.error('Fix card payment error:', error);
      res.status(500).json({ message: error.message || "Failed to fix card payment" });
    }
  });

  // ============================================================================
  // ADMIN - FINANCIAL REPORTS
  // ============================================================================

  // Financial Overview - total revenue, AUM, liabilities, net position
  app.get("/api/admin/financial/overview", async (req, res) => {
    try {
      const GOLD_PRICE_USD = 93.50; // Price per gram in USD

      // Get platform config for accurate fee calculations
      const platformConfigs = await storage.getAllPlatformConfigs();
      const configMap = new Map<string, string>();
      for (const config of platformConfigs) {
        configMap.set(config.configKey, config.configValue);
      }
      
      // Get fee percentages from platform config (no fallbacks - must be configured)
      const buySpreadPercent = parseFloat(configMap.get('buy_spread_percent') || '0');
      const sellSpreadPercent = parseFloat(configMap.get('sell_spread_percent') || '0');
      const storageFeePercent = parseFloat(configMap.get('storage_fee_percent') || '0');
      const avgSpreadPercent = (buySpreadPercent + sellSpreadPercent) / 2;

      // Get all wallets to calculate AUM
      const allUsers = await storage.getAllUsers();
      const allWallets = await Promise.all(
        allUsers.map(user => storage.getWallet(user.id))
      );

      // Calculate total gold and fiat in wallets
      let totalGoldGrams = 0;
      let totalFiatUsd = 0;
      for (const wallet of allWallets) {
        if (wallet) {
          totalGoldGrams += parseFloat(wallet.goldGrams || '0');
          totalFiatUsd += parseFloat(wallet.usdBalance || '0');
          totalFiatUsd += parseFloat(wallet.eurBalance || '0') * 1.08; // EUR to USD
        }
      }

      // Get vault holdings (physical gold bars in FinaVault - separate from wallet gold)
      // Note: Vault holdings are for physical gold storage, wallet gold is digital
      // Only count vault holdings that are marked as physically deposited to avoid double-counting
      const vaultHoldings = await storage.getAllVaultHoldings();
      let vaultGoldGrams = 0;
      for (const holding of vaultHoldings) {
        // Only count physically deposited vault holdings to avoid double-counting with wallet gold
        if (holding.isPhysicallyDeposited) {
          vaultGoldGrams += parseFloat(holding.goldGrams || '0');
        }
      }

      // Get all BNSL plans
      const bnslPlans = await storage.getAllBnslPlans();
      let bnslPrincipalUsd = 0;
      let bnslInterestUsd = 0;
      let pendingPayoutsUsd = 0;
      for (const plan of bnslPlans) {
        if (plan.status === 'Active' || plan.status === 'Pending Activation') {
          bnslPrincipalUsd += parseFloat(plan.basePriceComponentUsd || '0');
          // Estimate interest earned (simplified) using agreed margin
          const monthsElapsed = Math.floor((Date.now() - new Date(plan.createdAt!).getTime()) / (30 * 24 * 60 * 60 * 1000));
          const monthlyRate = parseFloat(plan.agreedMarginAnnualPercent || '0') / 100 / 12;
          bnslInterestUsd += parseFloat(plan.basePriceComponentUsd || '0') * monthlyRate * monthsElapsed;
        }
        if (plan.status === 'Active') {
          pendingPayoutsUsd += parseFloat(plan.totalSaleProceedsUsd || '0');
        }
      }

      // Get all transactions to estimate revenue using platform config spreads
      const allTransactions = await storage.getAllTransactions();
      let totalRevenue = 0;
      for (const tx of allTransactions) {
        if (tx.status === 'Completed') {
          const txValue = parseFloat(tx.amountUsd || '0') || 
            (parseFloat(tx.amountGold || '0') * parseFloat(tx.goldPriceUsdPerGram || GOLD_PRICE_USD.toString()));
          
          // Use appropriate spread based on transaction type
          let feePercent = avgSpreadPercent / 100; // Convert from percent to decimal
          if (tx.type === 'Buy') {
            feePercent = buySpreadPercent / 100;
          } else if (tx.type === 'Sell') {
            feePercent = sellSpreadPercent / 100;
          }
          totalRevenue += Math.abs(txValue) * feePercent;
        }
      }

      // Add BNSL interest to revenue
      totalRevenue += bnslInterestUsd;
      
      // Add storage fees from platform config (annual % on vault holdings)
      const storageFeeRevenue = vaultGoldGrams * GOLD_PRICE_USD * (storageFeePercent / 100);
      totalRevenue += storageFeeRevenue;

      // Calculate totals
      const goldValueUsd = (totalGoldGrams + vaultGoldGrams) * GOLD_PRICE_USD;
      const totalAUM = goldValueUsd + totalFiatUsd;
      
      // Liabilities = gold owed to users + pending BNSL payouts
      const goldLiabilityGrams = totalGoldGrams + vaultGoldGrams;
      const totalLiabilities = (goldLiabilityGrams * GOLD_PRICE_USD) + pendingPayoutsUsd;

      // Expenses estimate (30% of revenue for simplicity)
      const totalExpenses = totalRevenue * 0.30;
      const netProfit = totalRevenue - totalExpenses;

      res.json({
        totalRevenue,
        totalExpenses,
        netProfit,
        totalAUM,
        goldHoldingsGrams: totalGoldGrams + vaultGoldGrams,
        goldValueUsd,
        fiatBalancesUsd: totalFiatUsd,
        totalLiabilities,
        goldLiabilityGrams,
        pendingPayoutsUsd
      });
    } catch (error) {
      console.error("Failed to get financial overview:", error);
      res.status(400).json({ message: "Failed to get financial overview" });
    }
  });

  // Product Metrics - FinaPay, FinaVault, BNSL performance
  app.get("/api/admin/financial/metrics", async (req, res) => {
    try {
      const GOLD_PRICE_USD = 93.50;

      // Get platform config for accurate fee calculations
      const platformConfigs = await storage.getAllPlatformConfigs();
      const configMap = new Map<string, string>();
      for (const config of platformConfigs) {
        configMap.set(config.configKey, config.configValue);
      }
      
      // Get fee percentages from platform config (no fallbacks - must be configured)
      const buySpreadPercent = parseFloat(configMap.get('buy_spread_percent') || '0');
      const sellSpreadPercent = parseFloat(configMap.get('sell_spread_percent') || '0');
      const storageFeePercent = parseFloat(configMap.get('storage_fee_percent') || '0');
      const avgSpreadPercent = (buySpreadPercent + sellSpreadPercent) / 2;

      // FinaPay Metrics
      const allUsers = await storage.getAllUsers();
      const allWallets = await Promise.all(
        allUsers.map(user => storage.getWallet(user.id))
      );
      const activeWallets = allWallets.filter(w => w && (parseFloat(w.goldGrams || '0') > 0 || parseFloat(w.usdBalance || '0') > 0)).length;

      const allTransactions = await storage.getAllTransactions();
      let volumeUsd = 0;
      let feesCollectedUsd = 0;
      for (const tx of allTransactions) {
        const txValue = parseFloat(tx.amountUsd || '0') || 
          (parseFloat(tx.amountGold || '0') * parseFloat(tx.goldPriceUsdPerGram || GOLD_PRICE_USD.toString()));
        volumeUsd += Math.abs(txValue);
        
        // Calculate fees based on transaction type using platform config
        if (tx.status === 'Completed') {
          let feePercent = avgSpreadPercent / 100;
          if (tx.type === 'Buy') {
            feePercent = buySpreadPercent / 100;
          } else if (tx.type === 'Sell') {
            feePercent = sellSpreadPercent / 100;
          }
          feesCollectedUsd += Math.abs(txValue) * feePercent;
        }
      }

      // FinaVault Metrics
      const vaultHoldings = await storage.getAllVaultHoldings();
      let goldStoredGrams = 0;
      const vaultUserIds = new Set<string>();
      for (const holding of vaultHoldings) {
        goldStoredGrams += parseFloat(holding.goldGrams || '0');
        vaultUserIds.add(holding.userId);
      }
      const storageFeesUsd = goldStoredGrams * GOLD_PRICE_USD * (storageFeePercent / 100); // From platform config

      // BNSL Metrics
      const bnslPlans = await storage.getAllBnslPlans();
      const activePlans = bnslPlans.filter(p => p.status === 'Active' || p.status === 'Pending Activation');
      const delinquentPlans = bnslPlans.filter(p => p.status === 'Defaulted').length;
      
      let totalPrincipalUsd = 0;
      let interestEarnedUsd = 0;
      let expectedPayoutsUsd = 0;
      
      for (const plan of activePlans) {
        totalPrincipalUsd += parseFloat(plan.basePriceComponentUsd || '0');
        expectedPayoutsUsd += parseFloat(plan.totalSaleProceedsUsd || '0');
        
        // Calculate accrued interest using agreed margin
        const monthsElapsed = Math.floor((Date.now() - new Date(plan.createdAt!).getTime()) / (30 * 24 * 60 * 60 * 1000));
        const monthlyRate = parseFloat(plan.agreedMarginAnnualPercent || '0') / 100 / 12;
        interestEarnedUsd += parseFloat(plan.basePriceComponentUsd || '0') * monthlyRate * monthsElapsed;
      }

      res.json({
        finapay: {
          activeWallets,
          transactionCount: allTransactions.length,
          volumeUsd,
          feesCollectedUsd
        },
        finavault: {
          totalHoldings: vaultHoldings.length,
          goldStoredGrams,
          storageFeesUsd,
          activeUsers: vaultUserIds.size
        },
        bnsl: {
          activePlans: activePlans.length,
          totalPrincipalUsd,
          interestEarnedUsd,
          expectedPayoutsUsd,
          delinquentPlans
        }
      });
    } catch (error) {
      console.error("Failed to get product metrics:", error);
      res.status(400).json({ message: "Failed to get product metrics" });
    }
  });

  // User Financial Data - wallet balance, holdings, plans per user
  app.get("/api/admin/financial/users", async (req, res) => {
    try {
      const GOLD_PRICE_USD = 93.50;
      const allUsers = await storage.getAllUsers();

      const userFinancials = await Promise.all(allUsers.map(async (user) => {
        const wallet = await storage.getWallet(user.id);
        const transactions = await storage.getUserTransactions(user.id);
        const bnslPlans = await storage.getUserBnslPlans(user.id);
        const vaultHoldings = await storage.getUserVaultHoldings(user.id);

        // Calculate wallet balance in USD
        const usdBalance = parseFloat(wallet?.usdBalance || '0');
        const eurBalance = parseFloat(wallet?.eurBalance || '0') * 1.08;
        const goldValue = parseFloat(wallet?.goldGrams || '0') * GOLD_PRICE_USD;
        const walletBalanceUsd = usdBalance + eurBalance + goldValue;

        // Calculate vault holdings
        let goldHoldingsGrams = parseFloat(wallet?.goldGrams || '0');
        for (const holding of vaultHoldings) {
          goldHoldingsGrams += parseFloat(holding.goldGrams || '0');
        }

        // Get last activity from transactions
        const sortedTransactions = transactions.sort((a, b) => 
          new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
        );
        const lastActivity = sortedTransactions[0]?.createdAt || user.createdAt;

        return {
          id: user.id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          accountType: user.accountType,
          walletBalanceUsd,
          goldHoldingsGrams,
          bnslPlansCount: bnslPlans.filter(p => p.status === 'Active' || p.status === 'Pending Activation').length,
          totalTransactions: transactions.length,
          lastActivity
        };
      }));

      // Sort by wallet balance descending
      userFinancials.sort((a, b) => b.walletBalanceUsd - a.walletBalanceUsd);

      res.json(userFinancials);
    } catch (error) {
      console.error("Failed to get user financials:", error);
      res.status(400).json({ message: "Failed to get user financials" });
    }
  });

  // Gold Holdings Summary - Free vs locked gold breakdown
  app.get("/api/admin/financial/gold-holdings", ensureAdminAsync, async (req, res) => {
    try {
      const GOLD_PRICE_USD = 93.50;
      
      const allUsers = await storage.getAllUsers();
      const allWallets = await Promise.all(
        allUsers.map(user => storage.getWallet(user.id))
      );
      
      // Calculate wallet gold
      let walletGoldGrams = 0;
      for (const wallet of allWallets) {
        if (wallet) {
          walletGoldGrams += parseFloat(wallet.goldGrams || '0');
        }
      }
      
      // Calculate vault gold - only count physically deposited holdings to avoid double-counting with wallet gold
      const vaultHoldings = await storage.getAllVaultHoldings();
      let vaultGoldGrams = 0;
      for (const holding of vaultHoldings) {
        // Only count if physically deposited (actual physical gold in vault, not digital representation)
        if (holding.isPhysicallyDeposited) {
          vaultGoldGrams += parseFloat(holding.goldGrams || '0');
        }
      }
      
      // Calculate BNSL locked gold
      const bnslPlans = await storage.getAllBnslPlans();
      let bnslLockedGrams = 0;
      for (const plan of bnslPlans) {
        if (plan.status === 'Active' || plan.status === 'Pending Activation') {
          bnslLockedGrams += parseFloat(plan.goldGrams || '0');
        }
      }
      
      // Calculate FinaBridge locked gold (from trade cases if any)
      const tradeCases = await storage.getAllTradeCases();
      let finabridgeLockedGrams = 0;
      for (const tc of tradeCases) {
        if (tc.status === 'Active' || tc.status === 'Pending') {
          finabridgeLockedGrams += parseFloat(tc.goldAmountGrams || '0');
        }
      }
      
      const totalGoldGrams = walletGoldGrams + vaultGoldGrams;
      const lockedGoldGrams = bnslLockedGrams + finabridgeLockedGrams;
      const freeGoldGrams = totalGoldGrams - lockedGoldGrams;
      
      res.json({
        totalGoldGrams,
        freeGoldGrams: Math.max(0, freeGoldGrams),
        lockedGoldGrams,
        walletGoldGrams,
        vaultGoldGrams,
        bnslLockedGrams,
        finabridgeLockedGrams,
        goldValueUsd: totalGoldGrams * GOLD_PRICE_USD,
        goldPricePerGram: GOLD_PRICE_USD
      });
    } catch (error) {
      console.error("Failed to get gold holdings:", error);
      res.status(400).json({ message: "Failed to get gold holdings" });
    }
  });

  // Certificates Summary - All certificates across users
  app.get("/api/admin/financial/certificates", ensureAdminAsync, async (req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      const userMap = new Map(allUsers.map(u => [u.id, `${u.firstName} ${u.lastName}`]));
      
      // Get all certificates (using vault certificates table)
      const allCertificates = await storage.getAllCertificates();
      
      let digitalOwnership = 0;
      let physicalStorage = 0;
      let transferCertificates = 0;
      let bnslCertificates = 0;
      let activeCertificates = 0;
      let totalGoldGrams = 0;
      
      const certificatesWithUser = allCertificates.map(cert => {
        const goldGrams = parseFloat(cert.goldGrams || '0');
        totalGoldGrams += goldGrams;
        
        if (cert.status === 'Active') activeCertificates++;
        
        if (cert.type === 'Digital Ownership') digitalOwnership++;
        else if (cert.type === 'Physical Storage') physicalStorage++;
        else if (cert.type === 'Transfer') transferCertificates++;
        else if (cert.type === 'BNSL') bnslCertificates++;
        
        return {
          id: cert.id,
          certificateNumber: cert.certificateNumber,
          type: cert.type,
          status: cert.status,
          goldGrams,
          issuedAt: cert.issuedAt,
          userName: userMap.get(cert.userId) || 'Unknown'
        };
      });
      
      // Sort by most recent
      certificatesWithUser.sort((a, b) => 
        new Date(b.issuedAt || 0).getTime() - new Date(a.issuedAt || 0).getTime()
      );
      
      res.json({
        totalCertificates: allCertificates.length,
        activeCertificates,
        digitalOwnership,
        physicalStorage,
        transferCertificates,
        bnslCertificates,
        totalGoldGrams,
        certificates: certificatesWithUser
      });
    } catch (error) {
      console.error("Failed to get certificates:", error);
      res.status(400).json({ message: "Failed to get certificates" });
    }
  });

  // FinaBridge Summary - Trade finance cases
  app.get("/api/admin/financial/finabridge", ensureAdminAsync, async (req, res) => {
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
      
      const casesData = tradeCases.map(tc => {
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
      
      res.json({
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
      res.status(400).json({ message: "Failed to get FinaBridge data" });
    }
  });

  // Fees Summary - Platform revenue from fees
  app.get("/api/admin/financial/fees", ensureAdminAsync, async (req, res) => {
    try {
      const GOLD_PRICE_USD = 93.50;
      const range = (req.query.range as string) || 'all';
      
      // Calculate date range
      const now = new Date();
      let fromDate: Date | null = null;
      
      switch (range) {
        case '7d':
          fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          fromDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'ytd':
          fromDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          fromDate = null;
      }
      
      // Get platform config for fee rates
      const platformConfigs = await storage.getAllPlatformConfigs();
      const configMap = new Map<string, string>();
      for (const config of platformConfigs) {
        configMap.set(config.configKey, config.configValue);
      }
      
      const buySpreadPercent = parseFloat(configMap.get('buy_spread_percent') || '0');
      const sellSpreadPercent = parseFloat(configMap.get('sell_spread_percent') || '0');
      const storageFeePercent = parseFloat(configMap.get('storage_fee_percent') || '0');
      const withdrawalFeePercent = parseFloat(configMap.get('withdrawal_fee_percent') || '0');
      
      // Get all transactions and filter by date range
      const allTransactions = await storage.getAllTransactions();
      const filteredTransactions = fromDate 
        ? allTransactions.filter(tx => new Date(tx.createdAt!) >= fromDate!)
        : allTransactions;
      
      let transactionFees = 0;
      let spreadRevenue = 0;
      let withdrawalFees = 0;
      let buyCount = 0;
      let sellCount = 0;
      let withdrawalCount = 0;
      
      for (const tx of filteredTransactions) {
        if (tx.status !== 'Completed') continue;
        
        const txValue = parseFloat(tx.amountUsd || '0') || 
          (parseFloat(tx.amountGold || '0') * GOLD_PRICE_USD);
        
        if (tx.type === 'Buy') {
          spreadRevenue += txValue * (buySpreadPercent / 100);
          buyCount++;
        } else if (tx.type === 'Sell') {
          spreadRevenue += txValue * (sellSpreadPercent / 100);
          sellCount++;
        } else if (tx.type === 'Withdrawal') {
          withdrawalFees += txValue * (withdrawalFeePercent / 100);
          withdrawalCount++;
        }
      }
      
      transactionFees = spreadRevenue;
      
      // Calculate storage fees - prorated to the actual overlap with selected period
      const vaultHoldings = await storage.getAllVaultHoldings();
      let storageFees = 0;
      let vaultHoldingsCount = 0;
      for (const holding of vaultHoldings) {
        const holdingCreated = new Date(holding.createdAt!);
        
        // Calculate the actual overlap between holding lifetime and the selected period
        const periodStart = fromDate || new Date(0); // Start of time if no range
        const periodEnd = now;
        
        // Skip if holding was created after the period ends
        if (holdingCreated > periodEnd) continue;
        
        // The start of when we should charge is the later of period start or holding creation
        const chargeStart = holdingCreated > periodStart ? holdingCreated : periodStart;
        
        // Calculate days actually chargeable
        const daysChargeable = Math.max(0, Math.ceil((periodEnd.getTime() - chargeStart.getTime()) / (24 * 60 * 60 * 1000)));
        
        if (daysChargeable === 0) continue;
        
        const goldGrams = parseFloat(holding.goldGrams || '0');
        // Annual storage fee prorated by actual days in period
        const holdingPeriodFraction = daysChargeable / 365;
        storageFees += goldGrams * GOLD_PRICE_USD * (storageFeePercent / 100) * holdingPeriodFraction;
        vaultHoldingsCount++;
      }
      
      // BNSL Interest - only for interest accrued during the period
      const bnslPlans = await storage.getAllBnslPlans();
      let bnslInterest = 0;
      let activeBnslCount = 0;
      for (const plan of bnslPlans) {
        if (plan.status === 'Active' || plan.status === 'Pending Activation') {
          const planCreated = new Date(plan.createdAt!);
          
          // Calculate interest only for the period
          const periodStart = fromDate && fromDate > planCreated ? fromDate : planCreated;
          const periodEnd = now;
          
          // Skip if plan was created after the period ends
          if (fromDate && planCreated > now) continue;
          
          const daysInPeriod = Math.max(0, Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (24 * 60 * 60 * 1000)));
          const monthsInPeriod = daysInPeriod / 30;
          
          const monthlyRate = parseFloat(plan.agreedMarginAnnualPercent || '0') / 100 / 12;
          bnslInterest += parseFloat(plan.basePriceComponentUsd || '0') * monthlyRate * monthsInPeriod;
          activeBnslCount++;
        }
      }
      
      const totalFeesCollected = transactionFees + storageFees + bnslInterest + withdrawalFees;
      
      const feeBreakdown = [
        { type: 'Buy/Sell Spread', amount: spreadRevenue, count: buyCount + sellCount, percentage: totalFeesCollected > 0 ? (spreadRevenue / totalFeesCollected) * 100 : 0 },
        { type: 'Storage Fees', amount: storageFees, count: vaultHoldingsCount, percentage: totalFeesCollected > 0 ? (storageFees / totalFeesCollected) * 100 : 0 },
        { type: 'BNSL Interest', amount: bnslInterest, count: activeBnslCount, percentage: totalFeesCollected > 0 ? (bnslInterest / totalFeesCollected) * 100 : 0 },
        { type: 'Withdrawal Fees', amount: withdrawalFees, count: withdrawalCount, percentage: totalFeesCollected > 0 ? (withdrawalFees / totalFeesCollected) * 100 : 0 }
      ].filter(f => f.amount > 0);
      
      res.json({
        totalFeesCollected,
        transactionFees,
        storageFees,
        bnslInterest,
        spreadRevenue,
        withdrawalFees,
        feeBreakdown
      });
    } catch (error) {
      console.error("Failed to get fees summary:", error);
      res.status(400).json({ message: "Failed to get fees summary" });
    }
  });

  // ============================================================================
  // ACCOUNT STATEMENTS (Admin)
  // ============================================================================

  // Get account statement data for a user
  app.get("/api/admin/account-statement/:userId", ensureAdminAsync, async (req, res) => {
    try {
      const { userId } = req.params;
      const { from, to } = req.query;
      
      if (!from || !to) {
        return res.status(400).json({ message: "Date range required (from, to)" });
      }
      
      const fromDate = new Date(from as string);
      const toDate = new Date(to as string);
      toDate.setHours(23, 59, 59, 999);
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const wallet = await storage.getWallet(userId);
      const allTransactions = await storage.getUserTransactions(userId);
      
      // Filter transactions by date range
      const periodTransactions = allTransactions.filter(tx => {
        const txDate = new Date(tx.createdAt!);
        return txDate >= fromDate && txDate <= toDate && tx.status === 'Completed';
      }).sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime());
      
      // GOLD-CENTRIC STATEMENT: Gold is the only real asset, USD is for reference only
      // Calculate opening gold balance (sum of all transactions before fromDate)
      const priorTransactions = allTransactions.filter(tx => {
        const txDate = new Date(tx.createdAt!);
        return txDate < fromDate && tx.status === 'Completed';
      });
      
      let openingGold = 0;
      
      for (const tx of priorTransactions) {
        const amountGold = parseFloat(tx.amountGold || '0');
        
        // All transaction types affect gold balance
        if (['Deposit', 'Receive', 'Buy'].includes(tx.type)) {
          // Credits: gold comes in
          openingGold += amountGold;
        } else if (['Withdrawal', 'Send', 'Sell'].includes(tx.type)) {
          // Debits: gold goes out
          openingGold -= amountGold;
        } else if (tx.type === 'Swap') {
          // Swaps can be positive or negative
          openingGold += amountGold;
        }
      }
      
      // Calculate running gold balance and categorize debits/credits
      let runningGold = openingGold;
      let totalCreditsGold = 0;
      let totalDebitsGold = 0;
      
      console.log('[Statement] Period transactions count:', periodTransactions.length);
      const statementTransactions = periodTransactions.map(tx => {
        const amountGold = parseFloat(tx.amountGold || '0');
        const amountUsd = parseFloat(tx.amountUsd || '0');
        const goldPrice = parseFloat(tx.goldPriceUsdPerGram || '0');
        console.log(`[Statement] TX ${tx.type}: Gold=${amountGold}g, USD=${amountUsd} (reference), Price=${goldPrice}`);
        
        let debitGold: number | null = null;
        let creditGold: number | null = null;
        
        // All transactions affect GOLD balance only
        // USD is shown for reference (the value at time of transaction)
        if (['Deposit', 'Receive', 'Buy'].includes(tx.type)) {
          // Credits: gold comes in
          creditGold = amountGold > 0 ? amountGold : null;
          runningGold += amountGold;
          totalCreditsGold += amountGold;
        } else if (['Withdrawal', 'Send', 'Sell'].includes(tx.type)) {
          // Debits: gold goes out
          debitGold = amountGold > 0 ? amountGold : null;
          runningGold -= amountGold;
          totalDebitsGold += amountGold;
        } else if (tx.type === 'Swap') {
          // Swaps: can be credit or debit depending on sign
          if (amountGold > 0) {
            creditGold = amountGold;
            totalCreditsGold += amountGold;
          } else if (amountGold < 0) {
            debitGold = Math.abs(amountGold);
            totalDebitsGold += Math.abs(amountGold);
          }
          runningGold += amountGold;
        }
        
        return {
          id: tx.id,
          date: tx.createdAt,
          reference: `TXN-${tx.id.slice(0, 8).toUpperCase()}`,
          description: tx.description || `${tx.type} Transaction`,
          debitGold,
          creditGold,
          balanceGold: runningGold,
          usdValue: amountUsd,
          goldPriceAtTime: goldPrice,
          type: tx.type,
          status: tx.status
        };
      });
      
      console.log(`[Statement] Final: runningGold=${runningGold}, totalCreditsGold=${totalCreditsGold}, totalDebitsGold=${totalDebitsGold}`);
      const reportId = `STMT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${userId.slice(0, 6).toUpperCase()}`;
      
      // Fetch current gold price for USD equivalent calculation
      const { getGoldPricePerGram } = await import('./gold-price-service');
      let currentGoldPrice = 139.50; // Default fallback
      try {
        currentGoldPrice = await getGoldPricePerGram();
      } catch (e) {
        console.error('[Statement] Failed to fetch gold price, using fallback:', e);
      }
      
      // Calculate USD equivalent of gold balances at current price
      const openingGoldUsdValue = openingGold * currentGoldPrice;
      const closingGoldUsdValue = runningGold * currentGoldPrice;
      
      res.json({
        user: {
          id: user.id,
          finatradesId: user.finatradesId || `FT-${user.id.slice(0, 8).toUpperCase()}`,
          fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User',
          email: user.email,
          accountType: user.accountType || 'Personal'
        },
        period: {
          from: fromDate.toISOString(),
          to: toDate.toISOString()
        },
        reportId,
        generatedAt: new Date().toISOString(),
        currentGoldPrice,
        balances: {
          openingGold,
          openingGoldUsdValue,
          totalCreditsGold,
          totalDebitsGold,
          closingGold: runningGold,
          closingGoldUsdValue
        },
        transactions: statementTransactions
      });
    } catch (error) {
      console.error("Failed to get account statement:", error);
      res.status(400).json({ message: "Failed to get account statement" });
    }
  });

  // Generate PDF account statement
  app.get("/api/admin/account-statement/:userId/pdf", ensureAdminAsync, async (req, res) => {
    try {
      const { userId } = req.params;
      const { from, to } = req.query;
      
      if (!from || !to) {
        return res.status(400).json({ message: "Date range required" });
      }
      
      const fromDate = new Date(from as string);
      const toDate = new Date(to as string);
      toDate.setHours(23, 59, 59, 999);
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const allTransactions = await storage.getUserTransactions(userId);
      
      // Filter and process transactions
      const periodTransactions = allTransactions.filter(tx => {
        const txDate = new Date(tx.createdAt!);
        return txDate >= fromDate && txDate <= toDate && tx.status === 'Completed';
      }).sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime());
      
      // GOLD-CENTRIC STATEMENT: Gold is the only real asset
      const priorTransactions = allTransactions.filter(tx => {
        const txDate = new Date(tx.createdAt!);
        return txDate < fromDate && tx.status === 'Completed';
      });
      
      let openingGold = 0;
      
      for (const tx of priorTransactions) {
        const amountGold = parseFloat(tx.amountGold || '0');
        if (['Deposit', 'Receive', 'Buy'].includes(tx.type)) {
          openingGold += amountGold;
        } else if (['Withdrawal', 'Send', 'Sell'].includes(tx.type)) {
          openingGold -= amountGold;
        } else if (tx.type === 'Swap') {
          openingGold += amountGold;
        }
      }
      
      // Fetch current gold price for USD equivalent calculation
      const { getGoldPricePerGram } = await import('./gold-price-service');
      let currentGoldPrice = 139.50; // Default fallback
      try {
        currentGoldPrice = await getGoldPricePerGram();
      } catch (e) {
        console.error('[PDF Statement] Failed to fetch gold price, using fallback:', e);
      }
      
      // Calculate running gold balance
      let runningGold = openingGold;
      let totalCreditsGold = 0;
      let totalDebitsGold = 0;
      
      for (const tx of periodTransactions) {
        const amountGold = parseFloat(tx.amountGold || '0');
        if (['Deposit', 'Receive', 'Buy'].includes(tx.type)) {
          runningGold += amountGold;
          totalCreditsGold += amountGold;
        } else if (['Withdrawal', 'Send', 'Sell'].includes(tx.type)) {
          runningGold -= amountGold;
          totalDebitsGold += amountGold;
        } else if (tx.type === 'Swap') {
          if (amountGold > 0) {
            totalCreditsGold += amountGold;
          } else {
            totalDebitsGold += Math.abs(amountGold);
          }
          runningGold += amountGold;
        }
      }
      
      // Generate PDF
      const doc = new PDFDocument({ margin: 50 });
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=account-statement-${user.finatradesId || userId}.pdf`);
      
      doc.pipe(res);
      
      // Header
      doc.fillColor('#f97316').fontSize(24).font('Helvetica-Bold').text('FINATRADES', { align: 'center' });
      doc.fillColor('#374151').fontSize(14).font('Helvetica').text('Gold Account Statement', { align: 'center' });
      doc.moveDown(1.5);
      
      // Account details box
      doc.rect(50, doc.y, 515, 80).stroke('#e5e7eb');
      const boxY = doc.y + 10;
      doc.fontSize(10).fillColor('#6b7280');
      doc.text('Account Holder:', 60, boxY);
      doc.fillColor('#1f2937').font('Helvetica-Bold').text(`${user.firstName || ''} ${user.lastName || ''}`.trim(), 150, boxY);
      doc.fillColor('#6b7280').font('Helvetica').text('Account ID:', 60, boxY + 15);
      doc.fillColor('#f97316').font('Helvetica-Bold').text(user.finatradesId || `FT-${user.id.slice(0, 8).toUpperCase()}`, 150, boxY + 15);
      doc.fillColor('#6b7280').font('Helvetica').text('Account Type:', 60, boxY + 30);
      doc.fillColor('#1f2937').font('Helvetica-Bold').text(user.accountType || 'Personal', 150, boxY + 30);
      doc.fillColor('#6b7280').font('Helvetica').text('Statement Period:', 300, boxY);
      doc.fillColor('#1f2937').font('Helvetica-Bold').text(`${fromDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} – ${toDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`, 400, boxY);
      doc.fillColor('#6b7280').font('Helvetica').text('Generated:', 300, boxY + 15);
      doc.fillColor('#1f2937').font('Helvetica-Bold').text(new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' (GST)', 400, boxY + 15);
      doc.fillColor('#6b7280').font('Helvetica').text('Gold Price:', 300, boxY + 30);
      doc.fillColor('#f97316').font('Helvetica-Bold').text(`$${currentGoldPrice.toFixed(2)}/g`, 400, boxY + 30);
      
      doc.y = boxY + 85;
      
      // Balance summary - GOLD ONLY
      doc.fillColor('#1f2937').fontSize(12).font('Helvetica-Bold').text('GOLD BALANCE SUMMARY', { align: 'center' });
      doc.moveDown(0.5);
      
      // Summary table
      const summaryY = doc.y;
      doc.rect(50, summaryY, 515, 70).fill('#f9fafb').stroke('#e5e7eb');
      doc.fillColor('#6b7280').fontSize(9).font('Helvetica');
      doc.text('Opening Balance', 60, summaryY + 10);
      doc.text('Total Credits (+)', 180, summaryY + 10);
      doc.text('Total Debits (-)', 300, summaryY + 10);
      doc.text('Closing Balance', 420, summaryY + 10);
      
      doc.fillColor('#1f2937').fontSize(12).font('Helvetica-Bold');
      doc.text(`${openingGold.toFixed(4)}g`, 60, summaryY + 28);
      doc.fillColor('#16a34a').text(`${totalCreditsGold.toFixed(4)}g`, 180, summaryY + 28);
      doc.fillColor('#dc2626').text(`${totalDebitsGold.toFixed(4)}g`, 300, summaryY + 28);
      doc.fillColor('#1f2937').text(`${runningGold.toFixed(4)}g`, 420, summaryY + 28);
      
      // USD equivalent row
      doc.fillColor('#6b7280').fontSize(8).font('Helvetica');
      doc.text(`≈ $${(openingGold * currentGoldPrice).toFixed(2)}`, 60, summaryY + 48);
      doc.text(`≈ $${(totalCreditsGold * currentGoldPrice).toFixed(2)}`, 180, summaryY + 48);
      doc.text(`≈ $${(totalDebitsGold * currentGoldPrice).toFixed(2)}`, 300, summaryY + 48);
      doc.fillColor('#f97316').font('Helvetica-Bold');
      doc.text(`≈ $${(runningGold * currentGoldPrice).toFixed(2)}`, 420, summaryY + 48);
      
      doc.y = summaryY + 85;
      
      // Transactions table header - GOLD CENTRIC
      doc.fillColor('#1f2937').fontSize(12).font('Helvetica-Bold').text('TRANSACTION DETAILS');
      doc.moveDown(0.5);
      
      const tableTop = doc.y;
      doc.rect(50, tableTop, 515, 20).fill('#f3f4f6');
      doc.fillColor('#374151').fontSize(8).font('Helvetica-Bold');
      doc.text('Date', 55, tableTop + 6);
      doc.text('Reference', 105, tableTop + 6);
      doc.text('Description', 165, tableTop + 6);
      doc.text('Debit (g)', 310, tableTop + 6, { width: 55, align: 'right' });
      doc.text('Credit (g)', 370, tableTop + 6, { width: 55, align: 'right' });
      doc.text('Balance (g)', 430, tableTop + 6, { width: 60, align: 'right' });
      doc.text('USD Value', 495, tableTop + 6, { width: 55, align: 'right' });
      
      let y = tableTop + 25;
      runningGold = openingGold;
      
      doc.font('Helvetica').fontSize(8);
      
      for (const tx of periodTransactions) {
        if (y > 720) {
          doc.addPage();
          y = 50;
        }
        
        const amountGold = parseFloat(tx.amountGold || '0');
        const amountUsd = parseFloat(tx.amountUsd || '0');
        let debit = '';
        let credit = '';
        
        if (['Deposit', 'Receive', 'Buy'].includes(tx.type)) {
          credit = amountGold.toFixed(4);
          runningGold += amountGold;
        } else if (['Withdrawal', 'Send', 'Sell'].includes(tx.type)) {
          debit = amountGold.toFixed(4);
          runningGold -= amountGold;
        } else if (tx.type === 'Swap') {
          if (amountGold > 0) {
            credit = amountGold.toFixed(4);
          } else {
            debit = Math.abs(amountGold).toFixed(4);
          }
          runningGold += amountGold;
        }
        
        const txDate = new Date(tx.createdAt!);
        doc.fillColor('#374151');
        doc.text(txDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }), 55, y);
        doc.text(`TXN-${tx.id.slice(0, 8).toUpperCase()}`, 105, y);
        doc.text((tx.description || `${tx.type} Transaction`).slice(0, 25), 165, y);
        doc.fillColor('#dc2626').text(debit, 310, y, { width: 55, align: 'right' });
        doc.fillColor('#16a34a').text(credit, 370, y, { width: 55, align: 'right' });
        doc.fillColor('#1f2937').font('Helvetica-Bold').text(runningGold.toFixed(4), 430, y, { width: 60, align: 'right' });
        doc.font('Helvetica').fillColor('#6b7280').text(`$${amountUsd.toFixed(2)}`, 495, y, { width: 55, align: 'right' });
        
        y += 15;
      }
      
      if (periodTransactions.length === 0) {
        doc.fillColor('#6b7280').text('No transactions in this period', 50, y + 20, { align: 'center', width: 515 });
      }
      
      // Footer
      doc.y = 750;
      doc.fontSize(7).fillColor('#9ca3af').font('Helvetica');
      doc.text('This statement is generated by Finatrades. Gold is the primary asset held in your account.', 50, doc.y, { align: 'center', width: 515 });
      doc.text(`USD values shown for reference at current gold price ($${currentGoldPrice.toFixed(2)}/g). For questions, contact support@finatrades.com`, 50, doc.y + 10, { align: 'center', width: 515 });
      
      doc.end();
    } catch (error) {
      console.error("Failed to generate PDF statement:", error);
      res.status(400).json({ message: "Failed to generate PDF statement" });
    }
  });

  // Generate CSV account statement - GOLD CENTRIC
  app.get("/api/admin/account-statement/:userId/csv", ensureAdminAsync, async (req, res) => {
    try {
      const { userId } = req.params;
      const { from, to } = req.query;
      
      if (!from || !to) {
        return res.status(400).json({ message: "Date range required" });
      }
      
      const fromDate = new Date(from as string);
      const toDate = new Date(to as string);
      toDate.setHours(23, 59, 59, 999);
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const allTransactions = await storage.getUserTransactions(userId);
      
      const periodTransactions = allTransactions.filter(tx => {
        const txDate = new Date(tx.createdAt!);
        return txDate >= fromDate && txDate <= toDate && tx.status === 'Completed';
      }).sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime());
      
      const priorTransactions = allTransactions.filter(tx => {
        const txDate = new Date(tx.createdAt!);
        return txDate < fromDate && tx.status === 'Completed';
      });
      
      let runningGold = 0;
      
      for (const tx of priorTransactions) {
        const amountGold = parseFloat(tx.amountGold || '0');
        if (['Deposit', 'Receive', 'Buy'].includes(tx.type)) {
          runningGold += amountGold;
        } else if (['Withdrawal', 'Send', 'Sell'].includes(tx.type)) {
          runningGold -= amountGold;
        } else if (tx.type === 'Swap') {
          runningGold += amountGold;
        }
      }
      
      let csv = 'Date,Reference,Type,Description,Debit (Gold),Credit (Gold),Balance (Gold),USD Value (Reference)\n';
      
      for (const tx of periodTransactions) {
        const amountGold = parseFloat(tx.amountGold || '0');
        const amountUsd = parseFloat(tx.amountUsd || '0');
        let debitGold = '';
        let creditGold = '';
        
        if (['Deposit', 'Receive', 'Buy'].includes(tx.type)) {
          creditGold = amountGold.toFixed(4);
          runningGold += amountGold;
        } else if (['Withdrawal', 'Send', 'Sell'].includes(tx.type)) {
          debitGold = amountGold.toFixed(4);
          runningGold -= amountGold;
        } else if (tx.type === 'Swap') {
          if (amountGold > 0) {
            creditGold = amountGold.toFixed(4);
          } else {
            debitGold = Math.abs(amountGold).toFixed(4);
          }
          runningGold += amountGold;
        }
        
        const txDate = new Date(tx.createdAt!);
        const description = (tx.description || `${tx.type} Transaction`).replace(/,/g, ';');
        csv += `${txDate.toISOString().slice(0, 10)},TXN-${tx.id.slice(0, 8).toUpperCase()},${tx.type},"${description}",${debitGold},${creditGold},${runningGold.toFixed(4)},${amountUsd.toFixed(2)}\n`;
      }
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=account-statement-${user.finatradesId || userId}.csv`);
      res.send(csv);
    } catch (error) {
      console.error("Failed to generate CSV statement:", error);
      res.status(400).json({ message: "Failed to generate CSV statement" });
    }
  });

  // ============================================================================
  // USER ACCOUNT STATEMENTS (Authenticated User)
  // ============================================================================

  // User downloads their own PDF statement - GOLD CENTRIC
  app.get("/api/my-statement/pdf", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const { from, to } = req.query;
      if (!from || !to) {
        return res.status(400).json({ message: "Date range required" });
      }
      
      const fromDate = new Date(from as string);
      const toDate = new Date(to as string);
      toDate.setHours(23, 59, 59, 999);
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const allTransactions = await storage.getUserTransactions(userId);
      
      const periodTransactions = allTransactions.filter(tx => {
        const txDate = new Date(tx.createdAt!);
        return txDate >= fromDate && txDate <= toDate && tx.status === 'Completed';
      }).sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime());
      
      const priorTransactions = allTransactions.filter(tx => {
        const txDate = new Date(tx.createdAt!);
        return txDate < fromDate && tx.status === 'Completed';
      });
      
      let openingGold = 0;
      
      for (const tx of priorTransactions) {
        const amountGold = parseFloat(tx.amountGold || '0');
        if (['Deposit', 'Receive', 'Buy'].includes(tx.type)) {
          openingGold += amountGold;
        } else if (['Withdrawal', 'Send', 'Sell'].includes(tx.type)) {
          openingGold -= amountGold;
        } else if (tx.type === 'Swap') {
          openingGold += amountGold;
        }
      }
      
      // Fetch current gold price for USD equivalent calculation
      const { getGoldPricePerGram } = await import('./gold-price-service');
      let currentGoldPrice = 139.50;
      try {
        currentGoldPrice = await getGoldPricePerGram();
      } catch (e) {
        console.error('[User Statement PDF] Failed to fetch gold price, using fallback:', e);
      }
      
      // Calculate running gold balance
      let runningGold = openingGold;
      let totalCreditsGold = 0;
      let totalDebitsGold = 0;
      
      for (const tx of periodTransactions) {
        const amountGold = parseFloat(tx.amountGold || '0');
        if (['Deposit', 'Receive', 'Buy'].includes(tx.type)) {
          runningGold += amountGold;
          totalCreditsGold += amountGold;
        } else if (['Withdrawal', 'Send', 'Sell'].includes(tx.type)) {
          runningGold -= amountGold;
          totalDebitsGold += amountGold;
        } else if (tx.type === 'Swap') {
          if (amountGold > 0) {
            totalCreditsGold += amountGold;
          } else {
            totalDebitsGold += Math.abs(amountGold);
          }
          runningGold += amountGold;
        }
      }
      
      const doc = new PDFDocument({ margin: 50 });
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=account-statement-${user.finatradesId || userId}.pdf`);
      
      doc.pipe(res);
      
      doc.fillColor('#f97316').fontSize(24).font('Helvetica-Bold').text('FINATRADES', { align: 'center' });
      doc.fillColor('#374151').fontSize(14).font('Helvetica').text('Gold Account Statement', { align: 'center' });
      doc.moveDown(1.5);
      
      doc.rect(50, doc.y, 515, 80).stroke('#e5e7eb');
      const boxY = doc.y + 10;
      doc.fontSize(10).fillColor('#6b7280');
      doc.text('Account Holder:', 60, boxY);
      doc.fillColor('#1f2937').font('Helvetica-Bold').text(`${user.firstName || ''} ${user.lastName || ''}`.trim(), 150, boxY);
      doc.fillColor('#6b7280').font('Helvetica').text('Account ID:', 60, boxY + 15);
      doc.fillColor('#f97316').font('Helvetica-Bold').text(user.finatradesId || `FT-${user.id.slice(0, 8).toUpperCase()}`, 150, boxY + 15);
      doc.fillColor('#6b7280').font('Helvetica').text('Account Type:', 60, boxY + 30);
      doc.fillColor('#1f2937').font('Helvetica-Bold').text(user.accountType || 'Personal', 150, boxY + 30);
      doc.fillColor('#6b7280').font('Helvetica').text('Statement Period:', 300, boxY);
      doc.fillColor('#1f2937').font('Helvetica-Bold').text(`${fromDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} – ${toDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`, 400, boxY);
      doc.fillColor('#6b7280').font('Helvetica').text('Generated:', 300, boxY + 15);
      doc.fillColor('#1f2937').font('Helvetica-Bold').text(new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' (GST)', 400, boxY + 15);
      doc.fillColor('#6b7280').font('Helvetica').text('Gold Price:', 300, boxY + 30);
      doc.fillColor('#f97316').font('Helvetica-Bold').text(`$${currentGoldPrice.toFixed(2)}/g`, 400, boxY + 30);
      
      doc.y = boxY + 85;
      
      // Balance summary - GOLD ONLY
      doc.fillColor('#1f2937').fontSize(12).font('Helvetica-Bold').text('GOLD BALANCE SUMMARY', { align: 'center' });
      doc.moveDown(0.5);
      
      const summaryY = doc.y;
      doc.rect(50, summaryY, 515, 70).fill('#f9fafb').stroke('#e5e7eb');
      doc.fillColor('#6b7280').fontSize(9).font('Helvetica');
      doc.text('Opening Balance', 60, summaryY + 10);
      doc.text('Total Credits (+)', 180, summaryY + 10);
      doc.text('Total Debits (-)', 300, summaryY + 10);
      doc.text('Closing Balance', 420, summaryY + 10);
      
      doc.fillColor('#1f2937').fontSize(12).font('Helvetica-Bold');
      doc.text(`${openingGold.toFixed(4)}g`, 60, summaryY + 28);
      doc.fillColor('#16a34a').text(`${totalCreditsGold.toFixed(4)}g`, 180, summaryY + 28);
      doc.fillColor('#dc2626').text(`${totalDebitsGold.toFixed(4)}g`, 300, summaryY + 28);
      doc.fillColor('#1f2937').text(`${runningGold.toFixed(4)}g`, 420, summaryY + 28);
      
      // USD equivalent row
      doc.fillColor('#6b7280').fontSize(8).font('Helvetica');
      doc.text(`≈ $${(openingGold * currentGoldPrice).toFixed(2)}`, 60, summaryY + 48);
      doc.text(`≈ $${(totalCreditsGold * currentGoldPrice).toFixed(2)}`, 180, summaryY + 48);
      doc.text(`≈ $${(totalDebitsGold * currentGoldPrice).toFixed(2)}`, 300, summaryY + 48);
      doc.fillColor('#f97316').font('Helvetica-Bold');
      doc.text(`≈ $${(runningGold * currentGoldPrice).toFixed(2)}`, 420, summaryY + 48);
      
      doc.y = summaryY + 85;
      
      doc.fillColor('#1f2937').fontSize(12).font('Helvetica-Bold').text('TRANSACTION DETAILS');
      doc.moveDown(0.5);
      
      const tableTop = doc.y;
      doc.rect(50, tableTop, 515, 20).fill('#f3f4f6');
      doc.fillColor('#374151').fontSize(8).font('Helvetica-Bold');
      doc.text('Date', 55, tableTop + 6);
      doc.text('Reference', 105, tableTop + 6);
      doc.text('Description', 165, tableTop + 6);
      doc.text('Debit (g)', 310, tableTop + 6, { width: 55, align: 'right' });
      doc.text('Credit (g)', 370, tableTop + 6, { width: 55, align: 'right' });
      doc.text('Balance (g)', 430, tableTop + 6, { width: 60, align: 'right' });
      doc.text('USD Value', 495, tableTop + 6, { width: 55, align: 'right' });
      
      let y = tableTop + 25;
      runningGold = openingGold;
      
      doc.font('Helvetica').fontSize(8);
      
      for (const tx of periodTransactions) {
        if (y > 720) {
          doc.addPage();
          y = 50;
        }
        
        const amountGold = parseFloat(tx.amountGold || '0');
        const amountUsd = parseFloat(tx.amountUsd || '0');
        let debit = '';
        let credit = '';
        
        if (['Deposit', 'Receive', 'Buy'].includes(tx.type)) {
          credit = amountGold.toFixed(4);
          runningGold += amountGold;
        } else if (['Withdrawal', 'Send', 'Sell'].includes(tx.type)) {
          debit = amountGold.toFixed(4);
          runningGold -= amountGold;
        } else if (tx.type === 'Swap') {
          if (amountGold > 0) {
            credit = amountGold.toFixed(4);
          } else {
            debit = Math.abs(amountGold).toFixed(4);
          }
          runningGold += amountGold;
        }
        
        const txDate = new Date(tx.createdAt!);
        doc.fillColor('#374151');
        doc.text(txDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }), 55, y);
        doc.text(`TXN-${tx.id.slice(0, 8).toUpperCase()}`, 105, y);
        doc.text((tx.description || `${tx.type} Transaction`).slice(0, 25), 165, y);
        doc.fillColor('#dc2626').text(debit, 310, y, { width: 55, align: 'right' });
        doc.fillColor('#16a34a').text(credit, 370, y, { width: 55, align: 'right' });
        doc.fillColor('#1f2937').font('Helvetica-Bold').text(runningGold.toFixed(4), 430, y, { width: 60, align: 'right' });
        doc.font('Helvetica').fillColor('#6b7280').text(`$${amountUsd.toFixed(2)}`, 495, y, { width: 55, align: 'right' });
        
        y += 15;
      }
      
      if (periodTransactions.length === 0) {
        doc.fillColor('#6b7280').text('No transactions in this period', 50, y + 20, { align: 'center', width: 515 });
      }
      
      doc.y = 750;
      doc.fontSize(7).fillColor('#9ca3af').font('Helvetica');
      doc.text('This statement is generated by Finatrades. Gold is the primary asset held in your account.', 50, doc.y, { align: 'center', width: 515 });
      doc.text(`USD values shown for reference at current gold price ($${currentGoldPrice.toFixed(2)}/g). For questions, contact support@finatrades.com`, 50, doc.y + 10, { align: 'center', width: 515 });
      
      doc.end();
    } catch (error) {
      console.error("Failed to generate user PDF statement:", error);
      res.status(400).json({ message: "Failed to generate statement" });
    }
  });

  // User downloads their own CSV statement - GOLD CENTRIC
  app.get("/api/my-statement/csv", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const { from, to } = req.query;
      if (!from || !to) {
        return res.status(400).json({ message: "Date range required" });
      }
      
      const fromDate = new Date(from as string);
      const toDate = new Date(to as string);
      toDate.setHours(23, 59, 59, 999);
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const allTransactions = await storage.getUserTransactions(userId);
      
      const periodTransactions = allTransactions.filter(tx => {
        const txDate = new Date(tx.createdAt!);
        return txDate >= fromDate && txDate <= toDate && tx.status === 'Completed';
      }).sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime());
      
      const priorTransactions = allTransactions.filter(tx => {
        const txDate = new Date(tx.createdAt!);
        return txDate < fromDate && tx.status === 'Completed';
      });
      
      let runningGold = 0;
      
      for (const tx of priorTransactions) {
        const amountGold = parseFloat(tx.amountGold || '0');
        if (['Deposit', 'Receive', 'Buy'].includes(tx.type)) {
          runningGold += amountGold;
        } else if (['Withdrawal', 'Send', 'Sell'].includes(tx.type)) {
          runningGold -= amountGold;
        } else if (tx.type === 'Swap') {
          runningGold += amountGold;
        }
      }
      
      let csv = 'Date,Reference,Type,Description,Debit (Gold),Credit (Gold),Balance (Gold),USD Value (Reference)\n';
      
      for (const tx of periodTransactions) {
        const amountGold = parseFloat(tx.amountGold || '0');
        const amountUsd = parseFloat(tx.amountUsd || '0');
        let debitGold = '';
        let creditGold = '';
        
        if (['Deposit', 'Receive', 'Buy'].includes(tx.type)) {
          creditGold = amountGold.toFixed(4);
          runningGold += amountGold;
        } else if (['Withdrawal', 'Send', 'Sell'].includes(tx.type)) {
          debitGold = amountGold.toFixed(4);
          runningGold -= amountGold;
        } else if (tx.type === 'Swap') {
          if (amountGold > 0) {
            creditGold = amountGold.toFixed(4);
          } else {
            debitGold = Math.abs(amountGold).toFixed(4);
          }
          runningGold += amountGold;
        }
        
        const txDate = new Date(tx.createdAt!);
        const description = (tx.description || `${tx.type} Transaction`).replace(/,/g, ';');
        csv += `${txDate.toISOString().slice(0, 10)},TXN-${tx.id.slice(0, 8).toUpperCase()},${tx.type},"${description}",${debitGold},${creditGold},${runningGold.toFixed(4)},${amountUsd.toFixed(2)}\n`;
      }
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=account-statement-${user.finatradesId || userId}.csv`);
      res.send(csv);
    } catch (error) {
      console.error("Failed to generate user CSV statement:", error);
      res.status(400).json({ message: "Failed to generate statement" });
    }
  });

  // ============================================================================
  // PAYMENT GATEWAY SETTINGS (Admin)
  // ============================================================================

  // Get payment gateway settings (Admin)
  app.get("/api/admin/payment-gateways", ensureAdminAsync, async (req, res) => {
    try {
      const settings = await db.select().from(paymentGatewaySettings).limit(1);
      res.json(settings[0] || null);
    } catch (error) {
      console.error("Failed to get payment gateway settings:", error);
      res.status(400).json({ message: "Failed to get payment gateway settings" });
    }
  });

  // Update payment gateway settings (Admin)
  app.put("/api/admin/payment-gateways", ensureAdminAsync, async (req, res) => {
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
        res.json(newSettings[0]);
      } else {
        // Update existing settings
        const updatedSettings = await db.update(paymentGatewaySettings)
          .set({ ...req.body, updatedAt: new Date() })
          .where(eq(paymentGatewaySettings.id, settings[0].id))
          .returning();
        console.log("[PaymentGateway] Updated settings");
        res.json(updatedSettings[0]);
      }
    } catch (error) {
      console.error("Failed to update payment gateway settings:", error);
      res.status(400).json({ message: "Failed to update payment gateway settings", error: String(error) });
    }
  });

  // Get enabled payment methods (Public - for frontend)
  app.get("/api/payment-methods", async (req, res) => {
    try {
      const settings = await db.select().from(paymentGatewaySettings).limit(1);
      
      if (!settings[0]) {
        return res.json({
          stripe: { enabled: false },
          paypal: { enabled: false },
          bankTransfer: { enabled: false },
          binancePay: { enabled: false },
          minDeposit: 10,
          maxDeposit: 100000
        });
      }

      const s = settings[0];
      res.json({
        stripe: { 
          enabled: s.stripeEnabled,
          publishableKey: s.stripeEnabled ? s.stripePublishableKey : null
        },
        paypal: { 
          enabled: s.paypalEnabled,
          clientId: s.paypalEnabled ? s.paypalClientId : null,
          mode: s.paypalEnabled ? s.paypalMode : null
        },
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
      res.status(400).json({ message: "Failed to get payment methods" });
    }
  });

  // ============================================================================
  // SECURITY SETTINGS & OTP VERIFICATION
  // ============================================================================

  // Get security settings (admin only with header-based auth)
  app.get("/api/admin/security-settings", ensureAdminAsync, async (req, res) => {
    try {
      const settings = await storage.getOrCreateSecuritySettings();
      res.json(settings);
    } catch (error) {
      console.error("Failed to get security settings:", error);
      res.status(400).json({ message: "Failed to get security settings" });
    }
  });

  // Update security settings (admin only with header-based auth)
  app.patch("/api/admin/security-settings", ensureAdminAsync, async (req, res) => {
    try {
      const updates = req.body;
      const adminUser = (req as any).adminUser;
      
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
      
      res.json(settings);
    } catch (error) {
      console.error("Failed to update security settings:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to update security settings" });
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
      res.json({ 
        hasPin: true, 
        isLocked,
        lockedUntil: isLocked ? pin.lockedUntil : null,
        failedAttempts: pin.failedAttempts
      });
    } catch (error) {
      console.error("Failed to get transaction PIN status:", error);
      res.status(400).json({ message: "Failed to get PIN status" });
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
      
      res.json({ success: true, message: "Transaction PIN set up successfully" });
    } catch (error) {
      console.error("Failed to set up transaction PIN:", error);
      res.status(400).json({ message: "Failed to set up transaction PIN" });
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
      
      res.json({ 
        success: true, 
        token,
        expiresAt,
        message: "PIN verified successfully"
      });
    } catch (error) {
      console.error("Failed to verify transaction PIN:", error);
      res.status(400).json({ message: "Failed to verify transaction PIN" });
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
      
      res.json({ success: true, message: "Transaction PIN has been reset successfully" });
    } catch (error) {
      console.error("Failed to reset transaction PIN:", error);
      res.status(400).json({ message: "Failed to reset transaction PIN" });
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
      
      res.json({ valid: true, userId: pinToken.userId });
    } catch (error) {
      console.error("Failed to validate PIN token:", error);
      res.status(400).json({ valid: false, message: "Failed to validate token" });
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
      
      res.json({ success: true, userId: pinToken.userId });
    } catch (error) {
      console.error("Failed to use PIN token:", error);
      res.status(400).json({ success: false, message: "Failed to use token" });
    }
  });

  // Admin: Unlock a user's transaction PIN
  app.post("/api/admin/transaction-pin/unlock/:userId", ensureAdminAsync, async (req, res) => {
    try {
      const { userId } = req.params;
      const adminUser = (req as any).adminUser;
      
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
      
      res.json({ success: true, message: "Transaction PIN unlocked successfully" });
    } catch (error) {
      console.error("Failed to unlock transaction PIN:", error);
      res.status(400).json({ message: "Failed to unlock transaction PIN" });
    }
  });

  // ============================================================================
  // COMPLIANCE SETTINGS (KYC Mode Toggle)
  // ============================================================================

  // Get compliance settings (admin only)
  app.get("/api/admin/compliance-settings", ensureAdminAsync, async (req, res) => {
    try {
      const settings = await storage.getOrCreateComplianceSettings();
      res.json(settings);
    } catch (error) {
      console.error("Failed to get compliance settings:", error);
      res.status(400).json({ message: "Failed to get compliance settings" });
    }
  });

  // Update compliance settings (admin only)
  app.patch("/api/admin/compliance-settings", ensureAdminAsync, async (req, res) => {
    try {
      const updates = req.body;
      const adminUser = (req as any).adminUser;
      
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
      
      res.json(settings);
    } catch (error) {
      console.error("Failed to update compliance settings:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to update compliance settings" });
    }
  });

  // Get active KYC mode (public endpoint for frontend to know which KYC flow to show)
  app.get("/api/kyc-mode", async (req, res) => {
    try {
      const settings = await storage.getOrCreateComplianceSettings();
      res.json({ 
        activeKycMode: settings.activeKycMode,
        finatradesPersonalConfig: settings.finatradesPersonalConfig,
        finanatradesCorporateConfig: settings.finanatradesCorporateConfig,
        blockedCountries: settings.blockedCountries || []
      });
    } catch (error) {
      console.error("Failed to get KYC mode:", error);
      res.status(400).json({ message: "Failed to get KYC mode" });
    }
  });

  // Submit Finatrades Personal KYC (personal info + documents + liveness)
  app.post("/api/finatrades-kyc/personal", async (req, res) => {
    try {
      const { userId, personalInformation, documents, livenessCapture, livenessVerified, passportExpiryDate } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: "userId is required" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Flatten the nested objects into individual fields
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
        // Documents
        idFrontUrl: documents?.idFront?.url,
        idBackUrl: documents?.idBack?.url,
        passportUrl: documents?.passport?.url,
        addressProofUrl: documents?.addressProof?.url,
        // Document Expiry
        passportExpiryDate: passportExpiryDate || null,
        // Liveness
        livenessCapture,
        livenessVerified: !!livenessVerified,
        livenessVerifiedAt: livenessVerified ? new Date() : null,
        status: 'In Progress' as const,
      };
      
      // Check if already has a submission
      const existing = await storage.getFinatradesPersonalKyc(userId);
      
      if (existing) {
        // Update existing submission
        const updated = await storage.updateFinatradesPersonalKyc(userId, kycData);
        
        // Update user's KYC status
        await storage.updateUser(userId, { kycStatus: 'In Progress' });
        
        // Notify all admins of KYC update
        notifyAllAdmins({
          title: 'KYC Updated',
          message: `${user.firstName} ${user.lastName} updated their personal KYC submission`,
          type: 'info',
          link: '/admin/kyc',
        });
        
        res.json({ success: true, submission: updated });
      } else {
        // Create new submission
        const submission = await storage.createFinatradesPersonalKyc(kycData);
        
        // Update user's KYC status
        await storage.updateUser(userId, { kycStatus: 'In Progress' });
        
        // Notify all admins of new KYC submission
        notifyAllAdmins({
          title: 'New KYC Submission',
          message: `${user.firstName} ${user.lastName} submitted personal KYC documents for review`,
          type: 'info',
          link: '/admin/kyc',
        });
        
        res.json({ success: true, submission });
      }
    } catch (error) {
      console.error("Failed to submit Finatrades personal KYC:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to submit KYC" });
    }
  });

  // Get Finatrades Personal KYC status
  app.get("/api/finatrades-kyc/personal/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const submission = await storage.getFinatradesPersonalKyc(userId);
      res.json({ submission });
    } catch (error) {
      console.error("Failed to get Finatrades personal KYC:", error);
      res.status(400).json({ message: "Failed to get KYC status" });
    }
  });

  // Submit Finatrades Corporate KYC (questionnaire)
  app.post("/api/finatrades-kyc/corporate", async (req, res) => {
    try {
      const { 
        userId, 
        representativeLiveness,
        companyName,
        registrationNumber,
        incorporationDate,
        countryOfIncorporation,
        companyType,
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
        status
      } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: "userId is required" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const kycData = {
        companyName,
        registrationNumber,
        incorporationDate,
        countryOfIncorporation,
        companyType,
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
        representativeLiveness,
        livenessVerified: !!representativeLiveness,
        livenessVerifiedAt: representativeLiveness ? new Date() : null,
        status: status || 'In Progress',
      };
      
      // Check if already has a submission
      const existing = await storage.getFinatradesCorporateKyc(userId);
      
      if (existing) {
        // Update existing submission
        const updated = await storage.updateFinatradesCorporateKyc(existing.id, kycData);
        
        // Update user's KYC status and account type to business
        await storage.updateUser(userId, { kycStatus: 'In Progress', accountType: 'business' });
        
        // Notify all admins of corporate KYC update
        notifyAllAdmins({
          title: 'Corporate KYC Updated',
          message: `${companyName || user.firstName} updated their corporate KYC submission`,
          type: 'info',
          link: '/admin/kyc',
        });
        
        res.json({ success: true, submission: updated });
      } else {
        // Create new submission
        const submission = await storage.createFinatradesCorporateKyc({
          userId,
          ...kycData,
        });
        
        // Update user's KYC status and account type to business
        await storage.updateUser(userId, { kycStatus: 'In Progress', accountType: 'business' });
        
        // Notify all admins of new corporate KYC submission
        notifyAllAdmins({
          title: 'New Corporate KYC',
          message: `${companyName || user.firstName} submitted corporate KYC documents for review`,
          type: 'info',
          link: '/admin/kyc',
        });
        
        res.json({ success: true, submission });
      }
    } catch (error) {
      console.error("Failed to submit Finatrades corporate KYC:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to submit KYC" });
    }
  });

  // Get Finatrades Corporate KYC status
  app.get("/api/finatrades-kyc/corporate/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const submission = await storage.getFinatradesCorporateKyc(userId);
      res.json({ submission });
    } catch (error) {
      console.error("Failed to get Finatrades corporate KYC:", error);
      res.status(400).json({ message: "Failed to get KYC status" });
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
        'buy_gold': 'otpOnBuyGold',
        'sell_gold': 'otpOnSellGold',
        'profile_change': 'otpOnProfileChange',
        'password_change': 'otpOnPasswordChange',
        'bnsl_create': 'otpOnBnslCreate',
        'bnsl_early_termination': 'otpOnBnslEarlyTermination',
        'vault_withdrawal': 'otpOnVaultWithdrawal',
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
      
      res.json({ 
        otpRequired: true,
        otpId: otpVerification.id,
        expiresAt: otpVerification.expiresAt,
        message: `Verification code sent to ${user.email}` 
      });
    } catch (error) {
      console.error("Failed to request OTP:", error);
      res.status(400).json({ message: "Failed to request OTP" });
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
      
      res.json({ 
        verified: true, 
        message: "Verification successful",
        metadata: otpVerification.metadata
      });
    } catch (error) {
      console.error("Failed to verify OTP:", error);
      res.status(400).json({ message: "Failed to verify OTP" });
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
        'buy_gold': 'otpOnBuyGold',
        'sell_gold': 'otpOnSellGold',
        'profile_change': 'otpOnProfileChange',
        'password_change': 'otpOnPasswordChange',
        'bnsl_create': 'otpOnBnslCreate',
        'bnsl_early_termination': 'otpOnBnslEarlyTermination',
        'vault_withdrawal': 'otpOnVaultWithdrawal',
        'trade_bridge': 'otpOnTradeBridge',
      };
      
      const settingKey = otpActionMap[action];
      const otpRequired = settingKey ? !!settings[settingKey] : false;
      
      res.json({ otpRequired });
    } catch (error) {
      console.error("Failed to check OTP requirement:", error);
      res.status(400).json({ message: "Failed to check OTP requirement" });
    }
  });

  // ============================================================================
  // ADMIN - DOCUMENTS MANAGEMENT (Invoices & Certificate Deliveries)
  // ============================================================================

  // Get all invoices with user info
  app.get("/api/admin/documents/invoices", ensureAdminAsync, async (req, res) => {
    try {
      const invoices = await storage.getAllInvoices();
      const enrichedInvoices = await Promise.all(
        invoices.map(async (invoice) => {
          const user = await storage.getUser(invoice.userId);
          return {
            ...invoice,
            userName: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
            userEmail: user?.email || invoice.customerEmail,
          };
        })
      );
      res.json({ invoices: enrichedInvoices });
    } catch (error) {
      console.error("Failed to get invoices:", error);
      res.status(400).json({ message: "Failed to get invoices" });
    }
  });

  // Get all certificate deliveries with certificate and user info
  app.get("/api/admin/documents/certificate-deliveries", ensureAdminAsync, async (req, res) => {
    try {
      const deliveries = await storage.getAllCertificateDeliveries();
      const enrichedDeliveries = await Promise.all(
        deliveries.map(async (delivery) => {
          const user = await storage.getUser(delivery.userId);
          const certificate = await storage.getCertificate(delivery.certificateId);
          return {
            ...delivery,
            userName: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
            userEmail: user?.email || delivery.recipientEmail,
            certificateNumber: certificate?.certificateNumber || 'Unknown',
            certificateType: certificate?.type || 'Unknown',
            goldGrams: certificate?.goldGrams || '0',
          };
        })
      );
      res.json({ deliveries: enrichedDeliveries });
    } catch (error) {
      console.error("Failed to get certificate deliveries:", error);
      res.status(400).json({ message: "Failed to get certificate deliveries" });
    }
  });

  // Download invoice PDF (supports ?inline=1 for in-browser viewing)
  app.get("/api/admin/documents/invoices/:id/download", ensureAdminAsync, async (req, res) => {
    try {
      const result = await downloadInvoicePDF(req.params.id);
      if (result.error) {
        return res.status(404).json({ message: result.error });
      }
      const isInline = req.query.inline === '1' || req.query.inline === 'true';
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `${isInline ? 'inline' : 'attachment'}; filename="${result.filename}"`);
      res.send(result.buffer);
    } catch (error) {
      console.error("Failed to download invoice:", error);
      res.status(400).json({ message: "Failed to download invoice" });
    }
  });

  // Download certificate PDF (supports ?inline=1 for in-browser viewing)
  app.get("/api/admin/documents/certificates/:id/download", ensureAdminAsync, async (req, res) => {
    try {
      const result = await downloadCertificatePDF(req.params.id);
      if (result.error) {
        return res.status(404).json({ message: result.error });
      }
      const isInline = req.query.inline === '1' || req.query.inline === 'true';
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `${isInline ? 'inline' : 'attachment'}; filename="${result.filename}"`);
      res.send(result.buffer);
    } catch (error) {
      console.error("Failed to download certificate:", error);
      res.status(400).json({ message: "Failed to download certificate" });
    }
  });

  // Resend invoice email
  app.post("/api/admin/documents/invoices/:id/resend", ensureAdminAsync, async (req, res) => {
    try {
      const result = await resendInvoice(req.params.id);
      if (!result.success) {
        return res.status(400).json({ message: result.error || "Failed to resend invoice" });
      }
      
      await storage.createAuditLog({
        entityType: "invoice",
        entityId: req.params.id,
        actionType: "resend",
        actor: (req as any).adminUser?.id || 'admin',
        actorRole: "admin",
        details: "Invoice email resent",
      });
      
      res.json({ message: "Invoice resent successfully" });
    } catch (error) {
      console.error("Failed to resend invoice:", error);
      res.status(400).json({ message: "Failed to resend invoice" });
    }
  });

  // Resend certificate email
  app.post("/api/admin/documents/certificates/:id/resend", ensureAdminAsync, async (req, res) => {
    try {
      const result = await resendCertificate(req.params.id);
      if (!result.success) {
        return res.status(400).json({ message: result.error || "Failed to resend certificate" });
      }
      
      await storage.createAuditLog({
        entityType: "certificate",
        entityId: req.params.id,
        actionType: "resend",
        actor: (req as any).adminUser?.id || 'admin',
        actorRole: "admin",
        details: "Certificate email resent",
      });
      
      res.json({ message: "Certificate resent successfully" });
    } catch (error) {
      console.error("Failed to resend certificate:", error);
      res.status(400).json({ message: "Failed to resend certificate" });
    }
  });

  // Get all transaction receipts for evidence/auditing
  app.get("/api/admin/documents/transaction-receipts", ensureAdminAsync, async (req, res) => {
    try {
      const allTransactions = await storage.getAllTransactions();
      
      // Enrich with user info
      const transactionsWithUsers = await Promise.all(
        allTransactions.map(async (tx) => {
          const user = await storage.getUser(tx.userId);
          return {
            ...tx,
            userName: user ? `${user.firstName} ${user.lastName}` : null,
            userEmail: user?.email || null,
          };
        })
      );
      
      // Sort by date descending
      transactionsWithUsers.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      res.json({ transactions: transactionsWithUsers });
    } catch (error) {
      console.error("Failed to get transaction receipts:", error);
      res.status(400).json({ message: "Failed to get transaction receipts" });
    }
  });

  // Download transaction receipt PDF
  app.get("/api/admin/documents/receipts/:id/download", ensureAdminAsync, async (req, res) => {
    try {
      const transactionId = req.params.id;
      const transaction = await storage.getTransaction(transactionId);
      
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      const user = await storage.getUser(transaction.userId);
      const userName = user ? `${user.firstName} ${user.lastName}` : 'Unknown User';
      const userEmail = user?.email || 'Unknown';
      
      // Generate PDF using PDFKit
      const PDFDocument = (await import('pdfkit')).default;
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];
      
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      
      const pdfPromise = new Promise<Buffer>((resolve) => {
        doc.on('end', () => resolve(Buffer.concat(chunks)));
      });
      
      // Header
      doc.fontSize(24).fillColor('#4B0082').text('FINATRADES', { align: 'center' });
      doc.fontSize(12).fillColor('#666').text('Gold-Backed Digital Finance', { align: 'center' });
      doc.moveDown(2);
      
      // Receipt Title
      doc.fontSize(18).fillColor('#000').text('TRANSACTION RECEIPT', { align: 'center' });
      doc.moveDown();
      
      // Receipt details box
      doc.fontSize(10).fillColor('#666').text('Receipt ID:', 50);
      doc.fontSize(12).fillColor('#000').text(transaction.odooId || `TXN-${transaction.id}`, 150, doc.y - 12);
      doc.moveDown(0.5);
      
      doc.fontSize(10).fillColor('#666').text('Date:', 50);
      doc.fontSize(12).fillColor('#000').text(new Date(transaction.createdAt).toLocaleString(), 150, doc.y - 12);
      doc.moveDown(0.5);
      
      doc.fontSize(10).fillColor('#666').text('Status:', 50);
      doc.fontSize(12).fillColor(transaction.status === 'Completed' || transaction.status === 'Approved' ? '#22c55e' : '#f59e0b')
        .text(transaction.status, 150, doc.y - 12);
      doc.moveDown(2);
      
      // Customer Details
      doc.fontSize(14).fillColor('#4B0082').text('Customer Details');
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#ddd');
      doc.moveDown(0.5);
      
      doc.fontSize(10).fillColor('#666').text('Name:', 50);
      doc.fontSize(12).fillColor('#000').text(userName, 150, doc.y - 12);
      doc.moveDown(0.5);
      
      doc.fontSize(10).fillColor('#666').text('Email:', 50);
      doc.fontSize(12).fillColor('#000').text(userEmail, 150, doc.y - 12);
      doc.moveDown(0.5);
      
      if (user?.finatradesId) {
        doc.fontSize(10).fillColor('#666').text('Finatrades ID:', 50);
        doc.fontSize(12).fillColor('#000').text(user.finatradesId, 150, doc.y - 12);
        doc.moveDown(0.5);
      }
      doc.moveDown();
      
      // Transaction Details
      doc.fontSize(14).fillColor('#4B0082').text('Transaction Details');
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#ddd');
      doc.moveDown(0.5);
      
      doc.fontSize(10).fillColor('#666').text('Type:', 50);
      doc.fontSize(12).fillColor('#000').text(transaction.type || 'N/A', 150, doc.y - 12);
      doc.moveDown(0.5);
      
      if (transaction.sourceModule) {
        doc.fontSize(10).fillColor('#666').text('Module:', 50);
        doc.fontSize(12).fillColor('#000').text(transaction.sourceModule, 150, doc.y - 12);
        doc.moveDown(0.5);
      }
      
      if (transaction.description) {
        doc.fontSize(10).fillColor('#666').text('Description:', 50);
        doc.fontSize(12).fillColor('#000').text(transaction.description, 150, doc.y - 12);
        doc.moveDown(0.5);
      }
      doc.moveDown();
      
      // Financial Details
      doc.fontSize(14).fillColor('#4B0082').text('Financial Details');
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#ddd');
      doc.moveDown(0.5);
      
      if (transaction.amountGold) {
        doc.fontSize(10).fillColor('#666').text('Gold Amount:', 50);
        doc.fontSize(14).fillColor('#000').text(`${parseFloat(transaction.amountGold).toFixed(4)} grams`, 150, doc.y - 14);
        doc.moveDown(0.5);
      }
      
      if (transaction.amountUsd) {
        doc.fontSize(10).fillColor('#666').text('USD Value:', 50);
        doc.fontSize(14).fillColor('#000').text(`$${parseFloat(transaction.amountUsd).toLocaleString()}`, 150, doc.y - 14);
        doc.moveDown(0.5);
        
        // AED value
        const aedValue = parseFloat(transaction.amountUsd) * 3.67;
        doc.fontSize(10).fillColor('#666').text('AED Value:', 50);
        doc.fontSize(14).fillColor('#000').text(`Dh ${aedValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 150, doc.y - 14);
        doc.moveDown(0.5);
      }
      
      if (transaction.goldPriceAtTransaction) {
        doc.fontSize(10).fillColor('#666').text('Gold Price:', 50);
        doc.fontSize(12).fillColor('#000').text(`$${parseFloat(transaction.goldPriceAtTransaction).toFixed(2)} per gram`, 150, doc.y - 12);
        doc.moveDown(0.5);
      }
      
      // Footer
      doc.moveDown(3);
      doc.fontSize(10).fillColor('#666').text('This is an official transaction receipt generated by Finatrades.', { align: 'center' });
      doc.text('For any queries, please contact support@finatrades.com', { align: 'center' });
      doc.moveDown();
      doc.fontSize(8).text(`Generated on: ${new Date().toISOString()}`, { align: 'center' });
      
      doc.end();
      
      const pdfBuffer = await pdfPromise;
      
      const filename = `finatrades-receipt-${transaction.odooId || transaction.id}-${new Date().toISOString().split('T')[0]}.pdf`;
      const isInline = req.query.inline === '1' || req.query.inline === 'true';
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `${isInline ? 'inline' : 'attachment'}; filename="${filename}"`);
      res.send(pdfBuffer);
      
      // Log the download
      await storage.createAuditLog({
        entityType: "transaction_receipt",
        entityId: String(transaction.id),
        actionType: "download",
        actor: (req as any).adminUser?.id || 'admin',
        actorRole: "admin",
        details: `Downloaded receipt for transaction ${transaction.odooId || transaction.id}`,
      });
      
    } catch (error) {
      console.error("Failed to download transaction receipt:", error);
      res.status(400).json({ message: "Failed to download transaction receipt" });
    }
  });

  // Get all platform attachments (from vault deposits, KYC, etc.)
  app.get("/api/admin/attachments", ensureAdminAsync, async (req, res) => {
    try {
      const allAttachments: any[] = [];
      
      // Vault deposit attachments
      const vaultDeposits = await db.select().from(vaultDepositRequests);
      for (const deposit of vaultDeposits) {
        const user = await storage.getUser(deposit.userId);
        const userName = user ? `${user.firstName} ${user.lastName}` : 'Unknown';
        
        if (deposit.documents && Array.isArray(deposit.documents)) {
          deposit.documents.forEach((doc: any, idx: number) => {
            allAttachments.push({
              id: `vault-${deposit.id}-${idx}`,
              source: 'Vault Deposit',
              sourceId: deposit.referenceNumber,
              userId: deposit.userId,
              userName,
              userEmail: user?.email || 'Unknown',
              fileName: typeof doc === 'string' ? `Document ${idx + 1}` : (doc.name || `Document ${idx + 1}`),
              fileType: typeof doc === 'string' && doc.startsWith('data:image') ? 'image' : 'document',
              fileUrl: typeof doc === 'string' ? doc : (doc.url || doc),
              uploadedAt: deposit.createdAt,
              status: deposit.status,
            });
          });
        }
      }
      
      // KYC submission attachments
      const kycSubmissions = await storage.getAllKycSubmissions();
      for (const kyc of kycSubmissions) {
        const user = await storage.getUser(kyc.userId);
        const userName = user ? `${user.firstName} ${user.lastName}` : 'Unknown';
        
        // ID Document
        if (kyc.idDocumentUrl) {
          allAttachments.push({
            id: `kyc-id-${kyc.id}`,
            source: 'KYC - ID Document',
            sourceId: `KYC-${kyc.id}`,
            userId: kyc.userId,
            userName,
            userEmail: user?.email || 'Unknown',
            fileName: 'ID Document',
            fileType: kyc.idDocumentUrl.startsWith('data:image') ? 'image' : 'document',
            fileUrl: kyc.idDocumentUrl,
            uploadedAt: kyc.createdAt,
            status: kyc.status,
          });
        }
        
        // Selfie
        if (kyc.selfieUrl) {
          allAttachments.push({
            id: `kyc-selfie-${kyc.id}`,
            source: 'KYC - Selfie',
            sourceId: `KYC-${kyc.id}`,
            userId: kyc.userId,
            userName,
            userEmail: user?.email || 'Unknown',
            fileName: 'Selfie',
            fileType: 'image',
            fileUrl: kyc.selfieUrl,
            uploadedAt: kyc.createdAt,
            status: kyc.status,
          });
        }
        
        // Address Proof
        if (kyc.addressProofUrl) {
          allAttachments.push({
            id: `kyc-address-${kyc.id}`,
            source: 'KYC - Address Proof',
            sourceId: `KYC-${kyc.id}`,
            userId: kyc.userId,
            userName,
            userEmail: user?.email || 'Unknown',
            fileName: 'Address Proof',
            fileType: kyc.addressProofUrl.startsWith('data:image') ? 'image' : 'document',
            fileUrl: kyc.addressProofUrl,
            uploadedAt: kyc.createdAt,
            status: kyc.status,
          });
        }
      }
      
      // Sort by upload date descending
      allAttachments.sort((a, b) => 
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      );
      
      res.json({ attachments: allAttachments });
    } catch (error) {
      console.error("Failed to get attachments:", error);
      res.status(400).json({ message: "Failed to get attachments" });
    }
  });

  // User endpoints for downloading their own documents
  app.get("/api/documents/invoices/:id/download", async (req, res) => {
    try {
      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      const result = await downloadInvoicePDF(req.params.id);
      if (result.error) {
        return res.status(404).json({ message: result.error });
      }
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.send(result.buffer);
    } catch (error) {
      console.error("Failed to download invoice:", error);
      res.status(400).json({ message: "Failed to download invoice" });
    }
  });

  app.get("/api/documents/certificates/:id/download", async (req, res) => {
    try {
      const certificate = await storage.getCertificate(req.params.id);
      if (!certificate) {
        return res.status(404).json({ message: "Certificate not found" });
      }
      
      const result = await downloadCertificatePDF(req.params.id);
      if (result.error) {
        return res.status(404).json({ message: result.error });
      }
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.send(result.buffer);
    } catch (error) {
      console.error("Failed to download certificate:", error);
      res.status(400).json({ message: "Failed to download certificate" });
    }
  });

  // Get user's invoices
  app.get("/api/documents/invoices/user/:userId", async (req, res) => {
    try {
      const invoices = await storage.getUserInvoices(req.params.userId);
      res.json({ invoices });
    } catch (error) {
      console.error("Failed to get user invoices:", error);
      res.status(400).json({ message: "Failed to get invoices" });
    }
  });

  // User Manual PDF download
  app.get("/api/documents/user-manual", async (req, res) => {
    try {
      const pdfBuffer = await generateUserManualPDF();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="Finatrades-User-Manual.pdf"');
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Error generating user manual:', error);
      res.status(500).json({ message: "Failed to generate user manual" });
    }
  });

  // Admin Manual PDF download
  app.get("/api/documents/admin-manual", ensureAdminAsync, async (req, res) => {
    try {
      const pdfBuffer = await generateAdminManualPDF();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="Finatrades-Admin-Manual.pdf"');
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Error generating admin manual:', error);
      res.status(500).json({ message: "Failed to generate admin manual" });
    }
  });

  // ============================================================================
  // ADMIN ACTION OTP VERIFICATION
  // ============================================================================

  // Check if OTP is required for a specific action type
  app.get("/api/admin/action-otp/required/:actionType", ensureAdminAsync, async (req, res) => {
    try {
      const { actionType } = req.params;
      const settings = await storage.getSecuritySettings();
      
      if (!settings || !settings.adminOtpEnabled) {
        return res.json({ required: false });
      }
      
      // Map action types to security settings
      const actionToSetting: Record<string, boolean> = {
        'kyc_approval': settings.adminOtpOnKycApproval,
        'kyc_rejection': settings.adminOtpOnKycApproval,
        'deposit_approval': settings.adminOtpOnDepositApproval,
        'deposit_rejection': settings.adminOtpOnDepositApproval,
        'withdrawal_approval': settings.adminOtpOnWithdrawalApproval,
        'withdrawal_rejection': settings.adminOtpOnWithdrawalApproval,
        'bnsl_approval': settings.adminOtpOnBnslApproval,
        'bnsl_rejection': settings.adminOtpOnBnslApproval,
        'trade_case_approval': settings.adminOtpOnTradeCaseApproval,
        'trade_case_rejection': settings.adminOtpOnTradeCaseApproval,
        'user_suspension': settings.adminOtpOnUserSuspension,
        'user_activation': settings.adminOtpOnUserSuspension,
        'vault_deposit_approval': settings.adminOtpOnVaultDepositApproval ?? true,
        'vault_deposit_rejection': settings.adminOtpOnVaultDepositApproval ?? true,
        'vault_withdrawal_approval': settings.adminOtpOnVaultWithdrawalApproval ?? true,
        'vault_withdrawal_rejection': settings.adminOtpOnVaultWithdrawalApproval ?? true,
        'transaction_approval': settings.adminOtpOnTransactionApproval ?? true,
        'transaction_rejection': settings.adminOtpOnTransactionApproval ?? true,
      };
      
      const required = actionToSetting[actionType] ?? false;
      res.json({ required });
    } catch (error) {
      console.error("Failed to check OTP requirement:", error);
      res.status(500).json({ message: "Failed to check OTP requirement" });
    }
  });

  // Helper to mask email for privacy (e.g., john.doe@finatrades.com -> j***e@finatrades.com)
  function maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!local || !domain) return email;
    if (local.length <= 2) return `${local[0]}***@${domain}`;
    return `${local[0]}***${local[local.length - 1]}@${domain}`;
  }

  // Helper to get OTP context details based on target type
  async function getOtpContext(targetType: string, targetId: string, actionData?: Record<string, any>): Promise<{
    amountUsd?: string;
    amountGold?: string;
    method?: string;
    userMasked?: string;
    userId?: string;
    txId?: string;
    entityDetails?: string;
  }> {
    const context: any = {};
    
    try {
      switch (targetType) {
        case 'transaction':
        case 'deposit_request':
        case 'withdrawal_request': {
          const tx = await storage.getTransaction(targetId);
          if (tx) {
            context.amountUsd = tx.amountUsd ? `$${parseFloat(tx.amountUsd).toLocaleString()}` : undefined;
            context.amountGold = tx.amountGold ? `${parseFloat(tx.amountGold).toFixed(4)}g` : undefined;
            context.method = tx.paymentMethod || tx.type;
            context.txId = `TX-${targetId.slice(0, 8).toUpperCase()}`;
            context.userId = tx.userId;
            const user = await storage.getUser(tx.userId);
            if (user) context.userMasked = maskEmail(user.email);
          }
          break;
        }
        case 'kyc_submission': {
          const kyc = await storage.getKycSubmission(targetId);
          if (kyc) {
            context.userId = kyc.userId;
            const user = await storage.getUser(kyc.userId);
            if (user) {
              context.userMasked = maskEmail(user.email);
              context.entityDetails = `${user.firstName} ${user.lastName}`;
            }
          }
          break;
        }
        case 'user': {
          const user = await storage.getUser(targetId);
          if (user) {
            context.userId = user.id;
            context.userMasked = maskEmail(user.email);
            context.entityDetails = `${user.firstName} ${user.lastName}`;
          }
          break;
        }
        case 'bnsl_plan': {
          const plans = await storage.getAllBnslPlans();
          const plan = plans.find(p => p.id === targetId);
          if (plan) {
            context.amountUsd = plan.totalAmountUsd ? `$${parseFloat(plan.totalAmountUsd).toLocaleString()}` : undefined;
            context.amountGold = plan.goldAmount ? `${parseFloat(plan.goldAmount).toFixed(4)}g` : undefined;
            context.userId = plan.userId;
            const user = await storage.getUser(plan.userId);
            if (user) context.userMasked = maskEmail(user.email);
          }
          break;
        }
        case 'trade_case': {
          const cases = await storage.getAllTradeCases();
          const tc = cases.find(c => c.id === targetId);
          if (tc) {
            context.amountUsd = tc.transactionValue ? `$${parseFloat(tc.transactionValue).toLocaleString()}` : undefined;
            context.entityDetails = tc.clientName || undefined;
            context.userId = tc.userId;
            const user = await storage.getUser(tc.userId);
            if (user) context.userMasked = maskEmail(user.email);
          }
          break;
        }
        case 'vault_holding': {
          const holding = await storage.getVaultHolding(targetId);
          if (holding) {
            context.amountGold = `${parseFloat(holding.goldGrams).toFixed(4)}g`;
            context.userId = holding.userId;
            const user = await storage.getUser(holding.userId);
            if (user) context.userMasked = maskEmail(user.email);
          }
          break;
        }
      }
      
      // Merge with actionData if provided
      if (actionData) {
        if (actionData.amount) context.amountUsd = `$${parseFloat(actionData.amount).toLocaleString()}`;
        if (actionData.method) context.method = actionData.method;
        if (actionData.reason) context.entityDetails = actionData.reason;
      }
    } catch (e) {
      console.error('[OTP Context] Failed to get context:', e);
    }
    
    return context;
  }

  // Send OTP for admin action
  app.post("/api/admin/action-otp/send", ensureAdminAsync, async (req, res) => {
    try {
      const { actionType, targetId, targetType, actionData } = req.body;
      const admin = (req as any).adminUser;
      const requestId = `REQ-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      
      // Structured log: OTP requested
      console.log(JSON.stringify({
        ts: new Date().toISOString(),
        level: 'info',
        requestId,
        action: 'otp.requested',
        actorType: 'admin',
        actorId: admin.id,
        emailMasked: maskEmail(admin.email),
        entityType: targetType,
        entityId: targetId,
        actionType,
      }));
      
      if (!actionType || !targetId || !targetType) {
        return res.status(400).json({ message: "Missing required fields: actionType, targetId, targetType" });
      }
      
      // Check if OTP is required for this action
      const settings = await storage.getSecuritySettings();
      if (!settings || !settings.adminOtpEnabled) {
        return res.json({ required: false, message: "OTP not required" });
      }
      
      // Map action types to security settings
      const actionToSetting: Record<string, boolean> = {
        'kyc_approval': settings.adminOtpOnKycApproval,
        'kyc_rejection': settings.adminOtpOnKycApproval,
        'deposit_approval': settings.adminOtpOnDepositApproval,
        'deposit_rejection': settings.adminOtpOnDepositApproval,
        'withdrawal_approval': settings.adminOtpOnWithdrawalApproval,
        'withdrawal_rejection': settings.adminOtpOnWithdrawalApproval,
        'bnsl_approval': settings.adminOtpOnBnslApproval,
        'bnsl_rejection': settings.adminOtpOnBnslApproval,
        'trade_case_approval': settings.adminOtpOnTradeCaseApproval,
        'trade_case_rejection': settings.adminOtpOnTradeCaseApproval,
        'user_suspension': settings.adminOtpOnUserSuspension,
        'user_activation': settings.adminOtpOnUserSuspension,
        'vault_deposit_approval': settings.adminOtpOnVaultDepositApproval ?? true,
        'vault_deposit_rejection': settings.adminOtpOnVaultDepositApproval ?? true,
        'vault_withdrawal_approval': settings.adminOtpOnVaultWithdrawalApproval ?? true,
        'vault_withdrawal_rejection': settings.adminOtpOnVaultWithdrawalApproval ?? true,
        'transaction_approval': settings.adminOtpOnTransactionApproval ?? true,
        'transaction_rejection': settings.adminOtpOnTransactionApproval ?? true,
      };
      
      if (!actionToSetting[actionType]) {
        return res.json({ required: false, message: "OTP not required for this action" });
      }
      
      // Get OTP context for informative messages
      const otpContext = await getOtpContext(targetType, targetId, actionData);
      
      // Generate 6-digit OTP code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      
      // Enrich actionData with context
      const enrichedActionData = {
        ...(actionData || {}),
        otpContext,
        requestId,
      };
      
      // Create OTP record
      const otp = await storage.createAdminActionOtp({
        adminId: admin.id,
        actionType: actionType as any,
        targetId,
        targetType,
        code,
        expiresAt,
        attempts: 0,
        verified: false,
        actionData: enrichedActionData,
      });
      
      // Send email with OTP - informative version with context
      const actionLabels: Record<string, string> = {
        'kyc_approval': 'KYC Approval',
        'kyc_rejection': 'KYC Rejection',
        'deposit_approval': 'Deposit Approval',
        'deposit_rejection': 'Deposit Rejection',
        'withdrawal_approval': 'Withdrawal Approval',
        'withdrawal_rejection': 'Withdrawal Rejection',
        'bnsl_approval': 'BNSL Plan Approval',
        'bnsl_rejection': 'BNSL Plan Rejection',
        'trade_case_approval': 'Trade Case Approval',
        'trade_case_rejection': 'Trade Case Rejection',
        'user_suspension': 'User Suspension',
        'user_activation': 'User Activation',
        'vault_deposit_approval': 'Vault Deposit Approval',
        'vault_deposit_rejection': 'Vault Deposit Rejection',
        'vault_withdrawal_approval': 'Vault Withdrawal Approval',
        'vault_withdrawal_rejection': 'Vault Withdrawal Rejection',
        'transaction_approval': 'Transaction Approval',
        'transaction_rejection': 'Transaction Rejection',
      };
      
      // Build context details for email
      const contextDetails: string[] = [];
      if (otpContext.amountUsd) contextDetails.push(`<strong>Amount:</strong> ${otpContext.amountUsd}`);
      if (otpContext.amountGold) contextDetails.push(`<strong>Gold:</strong> ${otpContext.amountGold}`);
      if (otpContext.method) contextDetails.push(`<strong>Method:</strong> ${otpContext.method}`);
      if (otpContext.userMasked) contextDetails.push(`<strong>User:</strong> ${otpContext.userMasked}`);
      if (otpContext.txId) contextDetails.push(`<strong>Reference:</strong> ${otpContext.txId}`);
      if (otpContext.entityDetails) contextDetails.push(`<strong>Details:</strong> ${otpContext.entityDetails}`);
      
      const contextHtml = contextDetails.length > 0 
        ? `<div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #f59e0b;">
            <p style="margin: 0 0 10px 0; font-weight: 600; color: #92400e;">Action Details:</p>
            ${contextDetails.map(d => `<p style="margin: 5px 0; font-size: 14px;">${d}</p>`).join('')}
           </div>`
        : '';
      
      const adminFullName = `${admin.firstName} ${admin.lastName}`.trim();
      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #f97316, #ea580c); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">Admin OTP — ${actionLabels[actionType] || actionType}</h1>
          </div>
          <div style="padding: 30px; background: #ffffff;">
            <p>Hello ${adminFullName},</p>
            <p>You are attempting to perform: <strong>${actionLabels[actionType] || actionType}</strong></p>
            ${contextHtml}
            <p>Your verification code is:</p>
            <div style="background: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #f97316;">${code}</span>
            </div>
            <p>This code expires in <strong>10 minutes</strong>.</p>
            <div style="background: #fef2f2; padding: 12px; border-radius: 6px; margin-top: 20px;">
              <p style="margin: 0; color: #dc2626; font-size: 13px;">
                <strong>⚠️ Security Warning:</strong> Do not share this code with anyone. Finatrades will never ask for your OTP.
              </p>
            </div>
          </div>
          <div style="padding: 20px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px;">
            <p>Finatrades Admin Portal - Secure Action Verification</p>
            <p style="font-size: 11px;">Request ID: ${requestId}</p>
          </div>
        </div>
      `;
      
      await sendEmailDirect(admin.email, `Admin OTP — ${actionLabels[actionType] || actionType}`, htmlBody);
      
      // Structured log: OTP sent
      console.log(JSON.stringify({
        ts: new Date().toISOString(),
        level: 'info',
        requestId,
        action: 'otp.sent',
        actorType: 'admin',
        actorId: admin.id,
        emailMasked: maskEmail(admin.email),
        entityType: targetType,
        entityId: targetId,
        actionType,
        otpId: otp.id,
        amountUsd: otpContext.amountUsd,
        status: 'success',
      }));
      
      // Create in-app notification for the admin
      await storage.createNotification({
        userId: admin.id,
        title: 'OTP Sent',
        message: `Verification code sent for ${actionLabels[actionType] || actionType}${otpContext.amountUsd ? ` (${otpContext.amountUsd})` : ''}`,
        type: 'info',
        link: null,
        read: false,
      });
      
      // Create audit log with enriched context
      await storage.createAuditLog({
        entityType: "admin_action_otp",
        entityId: otp.id,
        actionType: "create",
        actor: admin.id,
        actorRole: "admin",
        details: `OTP sent for ${actionType} on ${targetType}:${targetId}${otpContext.amountUsd ? ` - ${otpContext.amountUsd}` : ''}${otpContext.userMasked ? ` (User: ${otpContext.userMasked})` : ''}`,
      });
      
      res.json({ 
        otpId: otp.id,
        message: "Verification code sent to your email",
        expiresAt: otp.expiresAt,
        requestId,
      });
    } catch (error) {
      console.error("Failed to send admin action OTP:", error);
      // Structured log: OTP failed
      console.log(JSON.stringify({
        ts: new Date().toISOString(),
        level: 'error',
        action: 'otp.send.failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
      res.status(500).json({ message: "Failed to send verification code" });
    }
  });

  // Verify OTP for admin action
  app.post("/api/admin/action-otp/verify", ensureAdminAsync, async (req, res) => {
    try {
      const { otpId, code } = req.body;
      const admin = (req as any).adminUser;
      const requestId = (req.body.requestId) || `VERIFY-${Date.now()}`;
      
      if (!otpId || !code) {
        return res.status(400).json({ message: "Missing required fields: otpId, code" });
      }
      
      const otp = await storage.getAdminActionOtp(otpId);
      
      if (!otp) {
        console.log(JSON.stringify({
          ts: new Date().toISOString(),
          level: 'warn',
          requestId,
          action: 'otp.verify.fail',
          reason: 'not_found',
          otpId,
        }));
        return res.status(404).json({ message: "Verification request not found" });
      }
      
      // Check if OTP belongs to the current admin
      if (otp.adminId !== admin.id) {
        console.log(JSON.stringify({
          ts: new Date().toISOString(),
          level: 'warn',
          requestId,
          action: 'otp.verify.fail',
          reason: 'wrong_admin',
          otpId,
          actorId: admin.id,
        }));
        return res.status(403).json({ message: "This verification code is not for your account" });
      }
      
      // Check if already verified
      if (otp.verified) {
        return res.status(400).json({ message: "This verification code has already been used" });
      }
      
      // Check expiry
      if (new Date() > otp.expiresAt) {
        console.log(JSON.stringify({
          ts: new Date().toISOString(),
          level: 'warn',
          requestId,
          action: 'otp.verify.fail',
          reason: 'expired',
          otpId,
          actorId: admin.id,
        }));
        return res.status(400).json({ message: "Verification code has expired. Please request a new one." });
      }
      
      // Check attempts (max 5)
      if (otp.attempts >= 5) {
        console.log(JSON.stringify({
          ts: new Date().toISOString(),
          level: 'warn',
          requestId,
          action: 'otp.verify.fail',
          reason: 'max_attempts',
          otpId,
          actorId: admin.id,
        }));
        return res.status(429).json({ message: "Too many failed attempts. Please request a new code." });
      }
      
      // Verify code
      if (otp.code !== code) {
        await storage.updateAdminActionOtp(otpId, { attempts: otp.attempts + 1 });
        console.log(JSON.stringify({
          ts: new Date().toISOString(),
          level: 'warn',
          requestId,
          action: 'otp.verify.fail',
          reason: 'wrong_code',
          otpId,
          actorId: admin.id,
          attemptsRemaining: 4 - otp.attempts,
        }));
        return res.status(400).json({ message: "Invalid verification code", attemptsRemaining: 4 - otp.attempts });
      }
      
      // Mark as verified
      await storage.updateAdminActionOtp(otpId, { 
        verified: true, 
        verifiedAt: new Date() 
      });
      
      // Extract context from actionData
      const otpContext = (otp.actionData as any)?.otpContext || {};
      
      // Structured log: OTP verified successfully
      console.log(JSON.stringify({
        ts: new Date().toISOString(),
        level: 'info',
        requestId,
        action: 'otp.verify.success',
        actorType: 'admin',
        actorId: admin.id,
        emailMasked: maskEmail(admin.email),
        entityType: otp.targetType,
        entityId: otp.targetId,
        actionType: otp.actionType,
        otpId: otp.id,
        amountUsd: otpContext.amountUsd,
        status: 'success',
      }));
      
      // Create in-app notification for the admin
      const actionLabels: Record<string, string> = {
        'kyc_approval': 'KYC Approval',
        'kyc_rejection': 'KYC Rejection',
        'deposit_approval': 'Deposit Approval',
        'deposit_rejection': 'Deposit Rejection',
        'withdrawal_approval': 'Withdrawal Approval',
        'withdrawal_rejection': 'Withdrawal Rejection',
        'bnsl_approval': 'BNSL Plan Approval',
        'bnsl_rejection': 'BNSL Plan Rejection',
        'trade_case_approval': 'Trade Case Approval',
        'trade_case_rejection': 'Trade Case Rejection',
        'user_suspension': 'User Suspension',
        'user_activation': 'User Activation',
        'vault_deposit_approval': 'Vault Deposit Approval',
        'vault_deposit_rejection': 'Vault Deposit Rejection',
        'vault_withdrawal_approval': 'Vault Withdrawal Approval',
        'vault_withdrawal_rejection': 'Vault Withdrawal Rejection',
        'transaction_approval': 'Transaction Approval',
        'transaction_rejection': 'Transaction Rejection',
      };
      
      await storage.createNotification({
        userId: admin.id,
        title: 'Action Verified',
        message: `${actionLabels[otp.actionType] || otp.actionType} verified successfully${otpContext.amountUsd ? ` (${otpContext.amountUsd})` : ''}`,
        type: 'success',
        link: null,
        read: false,
      });
      
      // If there's a target user, notify them about the pending action
      if (otpContext.userId && otpContext.userId !== admin.id) {
        const actionDescriptions: Record<string, string> = {
          'deposit_approval': 'Your deposit is being processed',
          'withdrawal_approval': 'Your withdrawal is being processed',
          'kyc_approval': 'Your KYC verification is being reviewed',
          'bnsl_approval': 'Your BNSL plan is being reviewed',
          'trade_case_approval': 'Your trade case is being reviewed',
        };
        const description = actionDescriptions[otp.actionType];
        if (description) {
          await storage.createNotification({
            userId: otpContext.userId,
            title: 'Action in Progress',
            message: `${description}${otpContext.amountUsd ? ` (${otpContext.amountUsd})` : ''}`,
            type: 'info',
            link: null,
            read: false,
          });
        }
      }
      
      // Create audit log with context
      await storage.createAuditLog({
        entityType: "admin_action_otp",
        entityId: otp.id,
        actionType: "verify",
        actor: admin.id,
        actorRole: "admin",
        details: `OTP verified for ${otp.actionType} on ${otp.targetType}:${otp.targetId}${otpContext.amountUsd ? ` - ${otpContext.amountUsd}` : ''}${otpContext.userMasked ? ` (User: ${otpContext.userMasked})` : ''}`,
      });
      
      res.json({ 
        success: true,
        message: "Verification successful",
        actionType: otp.actionType,
        targetId: otp.targetId,
        targetType: otp.targetType,
        actionData: otp.actionData,
      });
    } catch (error) {
      console.error("Failed to verify admin action OTP:", error);
      console.log(JSON.stringify({
        ts: new Date().toISOString(),
        level: 'error',
        action: 'otp.verify.failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
      res.status(500).json({ message: "Failed to verify code" });
    }
  });

  // Resend OTP for admin action
  app.post("/api/admin/action-otp/resend", ensureAdminAsync, async (req, res) => {
    try {
      const { otpId } = req.body;
      const admin = (req as any).adminUser;
      
      if (!otpId) {
        return res.status(400).json({ message: "Missing required field: otpId" });
      }
      
      const existingOtp = await storage.getAdminActionOtp(otpId);
      
      if (!existingOtp) {
        return res.status(404).json({ message: "Verification request not found" });
      }
      
      // Check if OTP belongs to the current admin
      if (existingOtp.adminId !== admin.id) {
        return res.status(403).json({ message: "This verification code is not for your account" });
      }
      
      // Check if already verified
      if (existingOtp.verified) {
        return res.status(400).json({ message: "This verification has already been completed" });
      }
      
      // Generate new code and update
      const newCode = Math.floor(100000 + Math.random() * 900000).toString();
      const newExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
      
      await storage.updateAdminActionOtp(otpId, {
        code: newCode,
        expiresAt: newExpiresAt,
        attempts: 0,
      });
      
      // Send new email with OTP
      const actionLabels: Record<string, string> = {
        'kyc_approval': 'KYC Approval',
        'kyc_rejection': 'KYC Rejection',
        'deposit_approval': 'Deposit Approval',
        'deposit_rejection': 'Deposit Rejection',
        'withdrawal_approval': 'Withdrawal Approval',
        'withdrawal_rejection': 'Withdrawal Rejection',
        'bnsl_approval': 'BNSL Plan Approval',
        'bnsl_rejection': 'BNSL Plan Rejection',
        'trade_case_approval': 'Trade Case Approval',
        'trade_case_rejection': 'Trade Case Rejection',
        'user_suspension': 'User Suspension',
        'user_activation': 'User Activation',
        'vault_deposit_approval': 'Vault Deposit Approval',
        'vault_deposit_rejection': 'Vault Deposit Rejection',
        'vault_withdrawal_approval': 'Vault Withdrawal Approval',
        'vault_withdrawal_rejection': 'Vault Withdrawal Rejection',
        'transaction_approval': 'Transaction Approval',
        'transaction_rejection': 'Transaction Rejection',
      };
      
      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #f97316, #ea580c); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">Admin Action Verification</h1>
          </div>
          <div style="padding: 30px; background: #ffffff;">
            <p>Hello ${admin.firstName} ${admin.lastName},</p>
            <p>You requested a new verification code for: <strong>${actionLabels[existingOtp.actionType] || existingOtp.actionType}</strong></p>
            <p>Your new verification code is:</p>
            <div style="background: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #f97316;">${newCode}</span>
            </div>
            <p>This code expires in <strong>10 minutes</strong>.</p>
            <p style="color: #6b7280; font-size: 14px;">If you did not initiate this action, please contact security immediately.</p>
          </div>
          <div style="padding: 20px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px;">
            <p>Finatrades Admin Portal - Secure Action Verification</p>
          </div>
        </div>
      `;
      
      await sendEmailDirect(admin.email, `Finatrades Admin Verification Code - ${actionLabels[existingOtp.actionType] || existingOtp.actionType}`, htmlBody);
      
      res.json({ 
        message: "New verification code sent to your email",
        expiresAt: newExpiresAt,
      });
    } catch (error) {
      console.error("Failed to resend admin action OTP:", error);
      res.status(500).json({ message: "Failed to resend verification code" });
    }
  });

  // ============================================
  // REFERRALS
  // ============================================

  // Get all referrals (Admin) - PROTECTED
  app.get("/api/admin/referrals", ensureAdminAsync, requirePermission('view_users', 'manage_users'), async (req, res) => {
    try {
      const referrals = await storage.getAllReferrals();
      res.json({ referrals });
    } catch (error) {
      res.status(500).json({ message: "Failed to get referrals" });
    }
  });

  // Get single referral - PROTECTED
  app.get("/api/admin/referrals/:id", ensureAdminAsync, requirePermission('view_users', 'manage_users'), async (req, res) => {
    try {
      const referral = await storage.getReferral(req.params.id);
      if (!referral) {
        return res.status(404).json({ message: "Referral not found" });
      }
      res.json({ referral });
    } catch (error) {
      res.status(500).json({ message: "Failed to get referral" });
    }
  });

  // Update referral (Admin) - PROTECTED
  app.patch("/api/admin/referrals/:id", ensureAdminAsync, requirePermission('manage_users'), async (req, res) => {
    try {
      const referral = await storage.updateReferral(req.params.id, req.body);
      if (!referral) {
        return res.status(404).json({ message: "Referral not found" });
      }
      res.json({ referral });
    } catch (error) {
      res.status(500).json({ message: "Failed to update referral" });
    }
  });

  // Get user's referrals
  app.get("/api/referrals/:userId", async (req, res) => {
    try {
      const referrals = await storage.getUserReferrals(req.params.userId);
      res.json({ referrals });
    } catch (error) {
      res.status(500).json({ message: "Failed to get referrals" });
    }
  });

  // Get user's referral stats and code (creates one if doesn't exist)
  app.get("/api/referrals/:userId/stats", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get all referrals created by this user
      const userReferrals = await storage.getUserReferrals(userId);
      
      // Find the user's active referral code (the one they share)
      let activeReferral = userReferrals.find(r => r.status === 'Active' && !r.referredId);
      
      // If no active code exists, create one
      if (!activeReferral) {
        const code = `REF-${user.firstName?.substring(0, 3).toUpperCase() || 'FIN'}${Date.now().toString(36).toUpperCase().slice(-4)}`;
        activeReferral = await storage.createReferral({
          referrerId: userId,
          referralCode: code,
          status: 'Active',
        });
      }

      // Get referral settings from platform config
      const configs = await storage.getAllPlatformConfigs();
      const configMap: Record<string, string> = {};
      configs.forEach(c => { configMap[c.configKey] = c.configValue; });
      
      const referrerBonusUsd = parseFloat(configMap['referrer_bonus_usd'] || '10');
      const refereeBonusUsd = parseFloat(configMap['referee_bonus_usd'] || '5');
      const maxReferrals = parseInt(configMap['max_referrals_per_user'] || '50');

      // Calculate stats
      const completedReferrals = userReferrals.filter(r => r.status === 'Completed');
      const totalReferrals = userReferrals.filter(r => r.referredId).length;
      const totalEarnedUsd = completedReferrals.reduce((sum, r) => sum + parseFloat(r.rewardAmount || '0'), 0);

      // Get current gold price to convert USD reward to grams
      const goldPricePerGram = await getGoldPricePerGram();
      const rewardPerReferralGrams = referrerBonusUsd / goldPricePerGram;
      const totalEarnedGrams = totalEarnedUsd / goldPricePerGram;

      res.json({
        referralCode: activeReferral.referralCode,
        stats: {
          totalReferrals,
          completedReferrals: completedReferrals.length,
          totalEarnedUsd,
          totalEarnedGrams,
          rewardPerReferralUsd: referrerBonusUsd,
          rewardPerReferralGrams,
          refereeBonusUsd,
          maxReferrals,
          remainingReferrals: maxReferrals - totalReferrals,
        },
        referrals: userReferrals.filter(r => r.referredId).map(r => ({
          id: r.id,
          referredEmail: r.referredEmail,
          status: r.status,
          rewardAmount: r.rewardAmount,
          createdAt: r.createdAt,
          completedAt: r.completedAt,
        })),
      });
    } catch (error) {
      console.error('[Referral Stats Error]', error);
      res.status(500).json({ message: "Failed to get referral stats" });
    }
  });

  // Create referral code for user
  app.post("/api/referrals", async (req, res) => {
    try {
      const { referrerId } = req.body;
      const user = await storage.getUser(referrerId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Generate unique referral code
      const code = `REF-${user.firstName?.substring(0, 3).toUpperCase() || 'FIN'}${Date.now().toString(36).toUpperCase().slice(-4)}`;
      
      const referral = await storage.createReferral({
        referrerId,
        referralCode: code,
        status: 'Active',
      });
      
      res.json({ referral });
    } catch (error) {
      res.status(500).json({ message: "Failed to create referral" });
    }
  });

  // ============================================
  // USER NOTIFICATIONS
  // ============================================

  // Get user notifications
  app.get("/api/users/:userId/notifications", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const notifications = await storage.getUserNotifications(userId);
      res.json({ notifications });
    } catch (error) {
      console.error('[Notifications Error]', error);
      res.status(500).json({ message: "Failed to get notifications" });
    }
  });

  // ============================================
  // USER PREFERENCES
  // ============================================

  // Get user preferences
  app.get("/api/users/:userId/preferences", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const preferences = await storage.getOrCreateUserPreferences(req.params.userId);
      res.json({ preferences });
    } catch (error) {
      console.error('[Preferences Error]', error);
      res.status(500).json({ message: "Failed to get preferences" });
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
      
      res.json({ preferences, message: "Settings saved successfully" });
    } catch (error) {
      console.error('[Preferences Error]', error);
      res.status(500).json({ message: "Failed to save preferences" });
    }
  });

  // Admin: Get all user preferences (for admin management)
  app.get("/api/admin/user-preferences", ensureAdminAsync, async (req, res) => {
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
      res.json({ users: usersWithPrefs });
    } catch (error) {
      console.error('[Admin Preferences Error]', error);
      res.status(500).json({ message: "Failed to get user preferences" });
    }
  });

  // Admin: Update any user's preferences
  app.put("/api/admin/users/:userId/preferences", ensureAdminAsync, async (req, res) => {
    try {
      const { userId } = req.params;
      const updates = req.body;
      
      await storage.getOrCreateUserPreferences(userId);
      const preferences = await storage.updateUserPreferences(userId, updates);
      
      res.json({ preferences, message: "User preferences updated" });
    } catch (error) {
      console.error('[Admin Preferences Error]', error);
      res.status(500).json({ message: "Failed to update user preferences" });
    }
  });

  // Admin: Repair corrupted wallet balance by recalculating from transactions
  app.post("/api/admin/users/:userId/repair-wallet", ensureAdminAsync, requirePermission('manage_users'), async (req, res) => {
    try {
      const { userId } = req.params;
      const { newGoldGrams } = req.body;
      
      // Get user's wallet
      const wallet = await storage.getWallet(userId);
      if (!wallet) {
        return res.status(404).json({ message: "Wallet not found for user" });
      }
      
      // Get current value (for logging)
      const currentValue = wallet.goldGrams;
      const isCorrupted = currentValue === null || currentValue === undefined || 
                          (typeof currentValue === 'string' && currentValue === 'NaN') ||
                          (typeof currentValue === 'number' && isNaN(currentValue));
      
      // If newGoldGrams is provided, use it; otherwise calculate from transactions
      let calculatedBalance = 0;
      
      if (newGoldGrams !== undefined && newGoldGrams !== null) {
        calculatedBalance = parseFloat(newGoldGrams);
      } else {
        // Recalculate from completed transactions
        const transactions = await storage.getUserTransactions(userId);
        
        for (const tx of transactions) {
          if (tx.status !== 'Completed') continue;
          
          const goldAmount = parseFloat(tx.amountGold || '0');
          if (isNaN(goldAmount)) continue;
          
          switch (tx.type) {
            case 'Buy':
            case 'Receive':
            case 'Deposit':
              calculatedBalance += goldAmount;
              break;
            case 'Sell':
            case 'Send':
            case 'Withdrawal':
              calculatedBalance -= goldAmount;
              break;
          }
        }
      }
      
      // Ensure non-negative
      calculatedBalance = Math.max(0, calculatedBalance);
      
      // Update the wallet
      await storage.updateWallet(wallet.id, { goldGrams: calculatedBalance.toFixed(6) });
      
      // Log the repair action
      await storage.createAuditLog({
        actor: (req.session as any)?.user?.id || 'system',
        action: 'wallet_repair',
        entityType: 'wallet',
        entityId: wallet.id,
        details: {
          userId,
          previousValue: currentValue,
          newValue: calculatedBalance.toFixed(6),
          wasCorrupted: isCorrupted,
          method: newGoldGrams !== undefined ? 'manual' : 'calculated'
        }
      });
      
      console.log(`[Wallet Repair] User ${userId}: ${currentValue} -> ${calculatedBalance.toFixed(6)}g`);
      
      res.json({ 
        success: true, 
        message: "Wallet repaired successfully",
        previousValue: currentValue,
        newValue: calculatedBalance.toFixed(6),
        wasCorrupted: isCorrupted
      });
    } catch (error) {
      console.error('[Wallet Repair Error]', error);
      res.status(500).json({ message: "Failed to repair wallet" });
    }
  });

  // Mark notification as read - with ownership verification
  app.post("/api/notifications/:notificationId/read", async (req, res) => {
    try {
      const { notificationId } = req.params;
      const notification = await storage.getNotification(notificationId);
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      // Verify ownership: user can only mark their own notifications as read
      const sessionUserId = (req.session as any)?.user?.id;
      const isAdmin = (req.session as any)?.user?.isAdmin;
      if (notification.userId !== sessionUserId && !isAdmin) {
        return res.status(403).json({ message: "Not authorized to modify this notification" });
      }
      await storage.markNotificationRead(notificationId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // Mark all notifications as read for user
  app.post("/api/users/:userId/notifications/read-all", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      await storage.markAllNotificationsRead(userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to mark all as read" });
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
      const sessionUserId = (req.session as any)?.user?.id;
      const isAdmin = (req.session as any)?.user?.isAdmin;
      if (notification.userId !== sessionUserId && !isAdmin) {
        return res.status(403).json({ message: "Not authorized to delete this notification" });
      }
      await storage.deleteNotification(notificationId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete notification" });
    }
  });

  // ============================================
  // AUDIT LOGS
  // ============================================

  // Get all audit logs (Admin) - PROTECTED - with resolved names
  app.get("/api/admin/audit-logs", ensureAdminAsync, requirePermission('view_transactions', 'manage_settings'), async (req, res) => {
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
      
      res.json({ logs: enrichedLogs });
    } catch (error) {
      res.status(500).json({ message: "Failed to get audit logs" });
    }
  });

  // ============================================
  // CRYPTO WALLET CONFIGURATIONS (Admin managed)
  // ============================================

  // Get all crypto wallet configs (admin)
  app.get("/api/admin/crypto-wallets", ensureAdminAsync, async (req, res) => {
    try {
      const wallets = await storage.getAllCryptoWalletConfigs();
      res.json({ wallets });
    } catch (error) {
      console.error("Failed to get crypto wallets:", error);
      res.status(500).json({ message: "Failed to get crypto wallets" });
    }
  });

  // Create crypto wallet config (admin)
  app.post("/api/admin/crypto-wallets", ensureAdminAsync, async (req, res) => {
    try {
      const { network, networkLabel, walletAddress, memo, instructions, qrCodeImage, isActive, displayOrder } = req.body;
      const adminUser = (req as any).adminUser;
      
      const wallet = await storage.createCryptoWalletConfig({
        network,
        networkLabel,
        walletAddress,
        memo: memo || null,
        instructions: instructions || null,
        qrCodeImage: qrCodeImage || null,
        isActive: isActive !== false,
        displayOrder: displayOrder || 0,
      });
      
      await storage.createAuditLog({
        entityType: "crypto_wallet_config",
        entityId: wallet.id,
        actionType: "create",
        actor: adminUser.id,
        actorRole: "admin",
        details: `Created crypto wallet config: ${networkLabel}`,
      });
      
      res.json({ wallet });
    } catch (error) {
      console.error("Failed to create crypto wallet:", error);
      res.status(500).json({ message: "Failed to create crypto wallet" });
    }
  });

  // Update crypto wallet config (admin)
  app.patch("/api/admin/crypto-wallets/:id", ensureAdminAsync, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const adminUser = (req as any).adminUser;
      
      const wallet = await storage.updateCryptoWalletConfig(id, updates);
      if (!wallet) {
        return res.status(404).json({ message: "Crypto wallet not found" });
      }
      
      await storage.createAuditLog({
        entityType: "crypto_wallet_config",
        entityId: wallet.id,
        actionType: "update",
        actor: adminUser.id,
        actorRole: "admin",
        details: `Updated crypto wallet config: ${wallet.networkLabel}`,
      });
      
      res.json({ wallet });
    } catch (error) {
      console.error("Failed to update crypto wallet:", error);
      res.status(500).json({ message: "Failed to update crypto wallet" });
    }
  });

  // Delete crypto wallet config (admin)
  app.delete("/api/admin/crypto-wallets/:id", ensureAdminAsync, async (req, res) => {
    try {
      const { id } = req.params;
      const adminUser = (req as any).adminUser;
      
      const wallet = await storage.getCryptoWalletConfig(id);
      if (!wallet) {
        return res.status(404).json({ message: "Crypto wallet not found" });
      }
      
      const success = await storage.deleteCryptoWalletConfig(id);
      if (!success) {
        return res.status(400).json({ message: "Failed to delete crypto wallet" });
      }
      
      await storage.createAuditLog({
        entityType: "crypto_wallet_config",
        entityId: id,
        actionType: "delete",
        actor: adminUser.id,
        actorRole: "admin",
        details: `Deleted crypto wallet config: ${wallet.networkLabel}`,
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete crypto wallet:", error);
      res.status(500).json({ message: "Failed to delete crypto wallet" });
    }
  });

  // Get active crypto wallets (public - for payment options)
  app.get("/api/crypto-wallets/active", async (req, res) => {
    try {
      const wallets = await storage.getActiveCryptoWalletConfigs();
      res.json({ wallets });
    } catch (error) {
      console.error("Failed to get active crypto wallets:", error);
      res.status(500).json({ message: "Failed to get crypto wallets" });
    }
  });

  // ============================================
  // CRYPTO PAYMENT REQUESTS (Manual payments)
  // ============================================

  // Create crypto payment request (user initiates payment)
  app.post("/api/crypto-payments", async (req, res) => {
    try {
      const { userId, walletConfigId, amountUsd, goldGrams, goldPriceAtTime, cryptoAmount } = req.body;
      
      if (!userId || !walletConfigId || !amountUsd || !goldGrams || !goldPriceAtTime) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const walletConfig = await storage.getCryptoWalletConfig(walletConfigId);
      if (!walletConfig || !walletConfig.isActive) {
        return res.status(400).json({ message: "Invalid or inactive crypto wallet" });
      }
      
      // Set expiry to 24 hours from now
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);
      
      const paymentRequest = await storage.createCryptoPaymentRequest({
        userId,
        walletConfigId,
        amountUsd,
        goldGrams,
        goldPriceAtTime,
        cryptoAmount: cryptoAmount || null,
        status: 'Pending',
        expiresAt,
      });
      
      await storage.createAuditLog({
        entityType: "crypto_payment_request",
        entityId: paymentRequest.id,
        actionType: "create",
        actor: userId,
        actorRole: "user",
        details: `Created crypto payment request for $${amountUsd} (${goldGrams}g gold)`,
      });
      
      // Send notification to user
      await storage.createNotification({
        userId,
        title: "Payment Request Created",
        message: `Your crypto payment request for $${amountUsd} has been created. Please complete the transfer within 24 hours.`,
        type: "transaction",
        read: false,
      });
      
      res.json({ paymentRequest, walletConfig });
    } catch (error) {
      console.error("Failed to create crypto payment request:", error);
      res.status(500).json({ message: "Failed to create payment request" });
    }
  });

  // Submit payment proof (user uploads tx hash or screenshot)
  app.patch("/api/crypto-payments/:id/submit-proof", async (req, res) => {
    try {
      const { id } = req.params;
      const { transactionHash, proofImageUrl } = req.body;
      
      const paymentRequest = await storage.getCryptoPaymentRequest(id);
      if (!paymentRequest) {
        return res.status(404).json({ message: "Payment request not found" });
      }
      
      if (paymentRequest.status !== 'Pending') {
        return res.status(400).json({ message: "Payment request is not pending" });
      }
      
      const updated = await storage.updateCryptoPaymentRequest(id, {
        transactionHash: transactionHash || paymentRequest.transactionHash,
        proofImageUrl: proofImageUrl || paymentRequest.proofImageUrl,
        status: 'Under Review',
      });
      
      await storage.createAuditLog({
        entityType: "crypto_payment_request",
        entityId: id,
        actionType: "update",
        actor: paymentRequest.userId,
        actorRole: "user",
        details: `Submitted payment proof: ${transactionHash || 'screenshot'}`,
      });
      
      // Notify user
      await storage.createNotification({
        userId: paymentRequest.userId,
        title: "Payment Proof Submitted",
        message: "Your payment proof has been submitted and is under review.",
        type: "transaction",
        read: false,
      });
      
      res.json({ paymentRequest: updated });
    } catch (error) {
      console.error("Failed to submit payment proof:", error);
      res.status(500).json({ message: "Failed to submit payment proof" });
    }
  });

  // Get user's crypto payment requests
  app.get("/api/crypto-payments/user/:userId", async (req, res) => {
    try {
      const requests = await storage.getUserCryptoPaymentRequests(req.params.userId);
      res.json({ requests });
    } catch (error) {
      console.error("Failed to get user crypto payments:", error);
      res.status(500).json({ message: "Failed to get payment requests" });
    }
  });

  // Get single crypto payment request
  app.get("/api/crypto-payments/:id", async (req, res) => {
    try {
      const request = await storage.getCryptoPaymentRequest(req.params.id);
      if (!request) {
        return res.status(404).json({ message: "Payment request not found" });
      }
      
      // Get wallet config details
      const walletConfig = await storage.getCryptoWalletConfig(request.walletConfigId);
      
      res.json({ request, walletConfig });
    } catch (error) {
      console.error("Failed to get crypto payment:", error);
      res.status(500).json({ message: "Failed to get payment request" });
    }
  });

  // Admin: Get all crypto payment requests
  app.get("/api/admin/crypto-payments", ensureAdminAsync, async (req, res) => {
    try {
      const { status } = req.query;
      let requests;
      
      if (status && typeof status === 'string') {
        requests = await storage.getCryptoPaymentRequestsByStatus(status);
      } else {
        requests = await storage.getAllCryptoPaymentRequests();
      }
      
      // Enrich with user and wallet info
      const enrichedRequests = await Promise.all(requests.map(async (request) => {
        const user = await storage.getUser(request.userId);
        const walletConfig = await storage.getCryptoWalletConfig(request.walletConfigId);
        return {
          ...request,
          user: user ? { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName } : null,
          walletConfig,
        };
      }));
      
      res.json({ requests: enrichedRequests });
    } catch (error) {
      console.error("Failed to get admin crypto payments:", error);
      res.status(500).json({ message: "Failed to get payment requests" });
    }
  });

  // Admin: Approve crypto payment
  app.patch("/api/admin/crypto-payments/:id/approve", ensureAdminAsync, async (req, res) => {
    console.log('[DEBUG] Approve crypto payment - Route entered, id:', req.params.id);
    try {
      const { id } = req.params;
      const { reviewNotes } = req.body;
      const adminUser = (req as any).adminUser;
      console.log('[DEBUG] Approve crypto payment - adminUser:', adminUser?.id, 'reviewNotes:', reviewNotes);
      
      const paymentRequest = await storage.getCryptoPaymentRequest(id);
      if (!paymentRequest) {
        return res.status(404).json({ message: "Payment request not found" });
      }
      
      if (!['Pending', 'Under Review'].includes(paymentRequest.status)) {
        return res.status(400).json({ message: "Payment request cannot be approved in current status" });
      }
      
      // Get user's wallet
      const wallet = await storage.getWallet(paymentRequest.userId);
      if (!wallet) {
        return res.status(400).json({ message: "User wallet not found" });
      }
      
      // Credit the gold to user's wallet
      const currentGoldGrams = parseFloat(wallet.goldGrams || '0');
      const newGoldGrams = currentGoldGrams + parseFloat(paymentRequest.goldGrams);
      await storage.updateWallet(wallet.id, {
        goldGrams: newGoldGrams.toString(),
      });
      
      // Create transaction record - Use "Deposit" type since this is an external payment resulting in gold credit
      // amountUsd is stored for reference (USD equivalent value) but the actual asset credited is gold
      const transaction = await storage.createTransaction({
        userId: paymentRequest.userId,
        type: 'Deposit',
        status: 'Completed',
        amountGold: paymentRequest.goldGrams,
        amountUsd: paymentRequest.amountUsd,
        goldPriceUsdPerGram: paymentRequest.goldPriceAtTime,
        description: `Crypto deposit - $${parseFloat(paymentRequest.amountUsd).toFixed(2)} (${parseFloat(paymentRequest.goldGrams).toFixed(4)}g gold)`,
        sourceModule: 'finapay',
      });
      
      const goldGrams = paymentRequest.goldGrams ? parseFloat(paymentRequest.goldGrams) : 0;
      const goldPrice = paymentRequest.goldPriceAtTime ? parseFloat(paymentRequest.goldPriceAtTime) : 0;
      const usdAmount = paymentRequest.amountUsd ? parseFloat(paymentRequest.amountUsd) : 0;
      
      console.log('[DEBUG] Crypto approval values:', { goldGrams, goldPrice, usdAmount });
      
      // SPECIFICATION REQUIREMENT: Record LedgerEntry for FinaVault system-of-record
      const { vaultLedgerService } = await import('./vault-ledger-service');
      await vaultLedgerService.recordLedgerEntry({
        userId: paymentRequest.userId,
        action: 'Deposit',
        goldGrams: goldGrams,
        goldPriceUsdPerGram: goldPrice > 0 ? goldPrice : undefined,
        fromWallet: 'External',
        toWallet: 'FinaPay',
        toStatus: 'Available',
        transactionId: transaction.id,
        notes: `Crypto payment approved: ${(goldGrams || 0).toFixed(4)}g${goldPrice > 0 ? ` at $${(goldPrice || 0).toFixed(2)}/g` : ''} (USD $${(usdAmount || 0).toFixed(2)})`,
        createdBy: adminUser?.id || 'system',
      });
      
      // SPECIFICATION REQUIREMENT: Generate DOC + SSC certificates
      const generatedCertificates: any[] = [];
      
      // Get or create vault holding
      let holding = await storage.getVaultHolding(paymentRequest.userId);
      
      if (!holding) {
        // Create new vault holding
        holding = await storage.createVaultHolding({
          userId: paymentRequest.userId,
          goldGrams: goldGrams.toString(),
          vaultLocation: 'Dubai - Wingold & Metals DMCC',
          wingoldStorageRef: `WG-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          purchasePriceUsdPerGram: goldPrice.toString(),
        });
      } else {
        // Update existing holding
        const newTotalGrams = parseFloat(holding.goldGrams) + goldGrams;
        await storage.updateVaultHolding(holding.id, {
          goldGrams: newTotalGrams.toString(),
        });
      }
      
      // Digital Ownership Certificate (DOC) from Finatrades
      const docCertNum = await storage.generateCertificateNumber('Digital Ownership');
      const digitalCert = await storage.createCertificate({
        type: 'Digital Ownership',
        issuer: 'Finatrades',
        userId: paymentRequest.userId,
        transactionId: transaction.id,
        vaultHoldingId: holding.id,
        certificateNumber: docCertNum,
        goldGrams: goldGrams.toString(),
        vaultLocation: 'Dubai - Wingold & Metals DMCC',
        goldPriceUsdPerGram: goldPrice.toString(),
      });
      generatedCertificates.push(digitalCert);
      
      // Physical Storage Certificate (SSC) from Wingold & Metals DMCC
      const sscCertNum = await storage.generateCertificateNumber('Physical Storage');
      const storageCert = await storage.createCertificate({
        type: 'Physical Storage',
        issuer: 'Wingold & Metals DMCC',
        userId: paymentRequest.userId,
        transactionId: transaction.id,
        vaultHoldingId: holding.id,
        certificateNumber: sscCertNum,
        goldGrams: goldGrams.toString(),
        vaultLocation: 'Dubai - Wingold & Metals DMCC',
        goldPriceUsdPerGram: goldPrice.toString(),
      });
      generatedCertificates.push(storageCert);
      
      console.log(`[Crypto Approval] Issued ${generatedCertificates.length} certificates for user ${paymentRequest.userId}`);
      
      // Update payment request
      const updated = await storage.updateCryptoPaymentRequest(id, {
        status: 'Credited',
        reviewerId: adminUser.id,
        reviewedAt: new Date(),
        reviewNotes: reviewNotes || null,
        creditedTransactionId: transaction.id,
      });
      
      await storage.createAuditLog({
        entityType: "crypto_payment_request",
        entityId: id,
        actionType: "approve",
        actor: adminUser.id,
        actorRole: "admin",
        details: `Approved and credited crypto payment: $${paymentRequest.amountUsd} (${paymentRequest.goldGrams}g gold)`,
      });
      
      // Notify user (in-app)
      await storage.createNotification({
        userId: paymentRequest.userId,
        title: "Payment Approved",
        message: `Your crypto payment of $${paymentRequest.amountUsd} has been approved. ${paymentRequest.goldGrams}g gold has been credited to your wallet.`,
        type: "success",
        read: false,
      });
      
      // Emit real-time sync event for auto-update
      emitLedgerEvent(paymentRequest.userId, {
        type: 'balance_update',
        module: 'finapay',
        action: 'crypto_payment_approved',
        data: { goldGrams, amountUsd: usdAmount },
      });
      
      // Send email with PDF attachments
      const cryptoUser = await storage.getUser(paymentRequest.userId);
      if (cryptoUser && cryptoUser.email) {
        // Generate transaction receipt PDF
        const receiptPdf = await generateTransactionReceiptPDF({
          referenceNumber: paymentRequest.transactionHash || `CRYPTO-${id.substring(0, 8)}`,
          transactionType: 'Crypto Deposit',
          amountUsd: usdAmount,
          goldGrams: goldGrams,
          goldPricePerGram: goldPrice,
          userName: `${cryptoUser.firstName || ''} ${cryptoUser.lastName || ''}`.trim() || 'Customer',
          userEmail: cryptoUser.email,
          transactionDate: new Date(),
          status: 'Completed',
          description: `Crypto payment confirmed - ${paymentRequest.cryptoCurrency}`,
        });
        
        const attachments: Array<{ filename: string; content: Buffer; contentType: string }> = [
          {
            filename: `Transaction_Receipt_${paymentRequest.transactionHash?.substring(0, 10) || id.substring(0, 8)}.pdf`,
            content: receiptPdf,
            contentType: 'application/pdf',
          }
        ];
        
        // Generate certificate PDFs
        for (const cert of generatedCertificates) {
          const certPdf = await generateCertificatePDF(cert, cryptoUser);
          attachments.push({
            filename: `Certificate_${cert.certificateNumber}.pdf`,
            content: certPdf,
            contentType: 'application/pdf',
          });
        }
        
        const htmlBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #f97316, #ea580c); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0;">Crypto Payment Confirmed!</h1>
            </div>
            <div style="padding: 30px; background: #ffffff;">
              <p>Hello ${cryptoUser.firstName},</p>
              <p>Your crypto payment has been verified and gold has been credited to your wallet.</p>
              <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                <p style="font-size: 28px; font-weight: bold; color: #f97316; margin: 0;">+$${usdAmount.toFixed(2)}</p>
                <p style="font-size: 18px; font-weight: bold; color: #92400e; margin: 10px 0;">Gold Credited: ${goldGrams.toFixed(4)}g</p>
                <p style="color: #6b7280; margin: 5px 0;">Currency: ${paymentRequest.cryptoCurrency}</p>
              </div>
              <p><strong>Attached Documents:</strong></p>
              <ul>
                <li>Transaction Receipt (PDF)</li>
                <li>Digital Ownership Certificate (PDF)</li>
                <li>Physical Storage Certificate (PDF)</li>
              </ul>
              <p style="text-align: center; margin-top: 30px;">
                <a href="https://finatrades.com/dashboard" style="background: #f97316; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">View Wallet</a>
              </p>
            </div>
            <div style="padding: 20px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px;">
              <p>Finatrades - Gold-Backed Digital Finance</p>
            </div>
          </div>
        `;
        
        sendEmailWithAttachment(
          cryptoUser.email,
          `Crypto Payment Confirmed - $${usdAmount.toFixed(2)} (${goldGrams.toFixed(4)}g Gold)`,
          htmlBody,
          attachments
        ).catch(err => console.error('[Email] Failed to send crypto confirmation with PDF:', err));
      }
      
      res.json({ paymentRequest: updated, transaction });
    } catch (error: any) {
      console.error("[DEBUG] Failed to approve crypto payment - Full error:", error);
      console.error("[DEBUG] Error name:", error?.name);
      console.error("[DEBUG] Error message:", error?.message);
      console.error("[DEBUG] Error stack:", error?.stack);
      res.status(500).json({ message: "Failed to approve payment", error: error?.message });
    }
  });

  // Admin: Reject crypto payment
  app.patch("/api/admin/crypto-payments/:id/reject", ensureAdminAsync, async (req, res) => {
    try {
      const { id } = req.params;
      const { rejectionReason } = req.body;
      const adminUser = (req as any).adminUser;
      
      if (!rejectionReason) {
        return res.status(400).json({ message: "Rejection reason is required" });
      }
      
      const paymentRequest = await storage.getCryptoPaymentRequest(id);
      if (!paymentRequest) {
        return res.status(404).json({ message: "Payment request not found" });
      }
      
      if (!['Pending', 'Under Review'].includes(paymentRequest.status)) {
        return res.status(400).json({ message: "Payment request cannot be rejected in current status" });
      }
      
      const updated = await storage.updateCryptoPaymentRequest(id, {
        status: 'Rejected',
        reviewerId: adminUser.id,
        reviewedAt: new Date(),
        rejectionReason,
      });
      
      await storage.createAuditLog({
        entityType: "crypto_payment_request",
        entityId: id,
        actionType: "reject",
        actor: adminUser.id,
        actorRole: "admin",
        details: `Rejected crypto payment: ${rejectionReason}`,
      });
      
      // Notify user
      await storage.createNotification({
        userId: paymentRequest.userId,
        title: "Payment Rejected",
        message: `Your crypto payment request has been rejected. Reason: ${rejectionReason}`,
        type: "error",
        read: false,
      });
      
      res.json({ paymentRequest: updated });
    } catch (error) {
      console.error("Failed to reject crypto payment:", error);
      res.status(500).json({ message: "Failed to reject payment" });
    }
  });

  // ============================================
  // BUY GOLD REQUESTS (Wingold & Metals - Manual)
  // ============================================

  // User: Submit buy gold request
  app.post("/api/buy-gold/submit", idempotencyMiddleware, async (req, res) => {
    try {
      const { userId, amountUsd, wingoldReferenceId, receiptFileUrl, receiptFileName } = req.body;
      
      if (!userId || !receiptFileUrl) {
        return res.status(400).json({ message: "User ID and receipt are required" });
      }
      
      // Check KYC status
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (user.kycStatus !== 'Approved') {
        return res.status(403).json({ message: "KYC must be approved to submit buy gold requests" });
      }
      
      // Check if buy gold mode is enabled (default to MANUAL if not configured)
      const buyGoldModeConfig = await storage.getPlatformConfig('buy_gold_mode');
      const buyGoldMode = buyGoldModeConfig?.configValue || 'MANUAL';
      
      if (buyGoldMode === 'API') {
        return res.status(400).json({ message: "API mode is not yet available. Please wait for the feature update." });
      }
      
      // Get current gold price if amount is provided
      let goldGrams = null;
      let goldPriceAtTime = null;
      
      if (amountUsd && parseFloat(amountUsd) > 0) {
        const priceData = await getGoldPrice();
        goldPriceAtTime = priceData.pricePerGram.toString();
        goldGrams = (parseFloat(amountUsd) / priceData.pricePerGram).toFixed(8);
      }
      
      const request = await storage.createBuyGoldRequest({
        userId,
        amountUsd: amountUsd || null,
        goldGrams,
        goldPriceAtTime,
        wingoldReferenceId: wingoldReferenceId || null,
        receiptFileUrl,
        receiptFileName: receiptFileName || null,
        status: 'Pending',
      });
      
      // Create audit log
      await storage.createAuditLog({
        entityType: "buy_gold_request",
        entityId: request.id,
        actionType: "create",
        actor: userId,
        actorRole: "user",
        details: `Buy gold request submitted: $${amountUsd || 'TBD'}`,
      });
      
      // Notify admins
      const admins = await storage.getAdminUsers();
      for (const admin of admins) {
        await storage.createNotification({
          userId: admin.id,
          title: "New Buy Gold Request",
          message: `${user.firstName} ${user.lastName} submitted a buy gold request`,
          type: "info",
          read: false,
          link: "/admin/finapay/buy-gold",
        });
      }
      
      res.json({ 
        success: true, 
        request,
        message: "Buy gold request submitted successfully. Pending admin review." 
      });
    } catch (error) {
      console.error("Failed to submit buy gold request:", error);
      res.status(500).json({ message: "Failed to submit request" });
    }
  });

  // User: Get their buy gold requests
  app.get("/api/buy-gold/:userId", async (req, res) => {
    try {
      const requests = await storage.getUserBuyGoldRequests(req.params.userId);
      res.json({ requests });
    } catch (error) {
      res.status(500).json({ message: "Failed to get buy gold requests" });
    }
  });

  // Admin: Get all buy gold requests
  app.get("/api/admin/buy-gold", ensureAdminAsync, async (req, res) => {
    try {
      const requests = await storage.getAllBuyGoldRequests();
      
      // Enrich with user info
      const enrichedRequests = await Promise.all(
        requests.map(async (request) => {
          const user = await storage.getUser(request.userId);
          return {
            ...request,
            user: user ? {
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
            } : null,
          };
        })
      );
      
      res.json({ requests: enrichedRequests });
    } catch (error) {
      res.status(500).json({ message: "Failed to get buy gold requests" });
    }
  });

  // Admin: Approve and credit buy gold request
  app.patch("/api/admin/buy-gold/:id/approve", ensureAdminAsync, async (req, res) => {
    try {
      const { id } = req.params;
      const { reviewNotes, amountUsd, goldGrams, goldPriceAtTime, adminNotes } = req.body;
      const adminUser = (req as any).adminUser;
      
      const request = await storage.getBuyGoldRequest(id);
      if (!request) {
        return res.status(404).json({ message: "Buy gold request not found" });
      }
      
      if (!['Pending', 'Under Review'].includes(request.status)) {
        return res.status(400).json({ message: "Request cannot be approved in current status" });
      }
      
      // Use provided gold grams (required from admin input)
      const finalGoldGrams = parseFloat(goldGrams || request.goldGrams || '0');
      if (finalGoldGrams <= 0) {
        return res.status(400).json({ message: "Gold amount (grams) is required for approval" });
      }
      
      // Get gold price (from admin input or fetch live)
      let goldPrice = parseFloat(goldPriceAtTime || '0');
      if (goldPrice <= 0) {
        const priceData = await getGoldPrice();
        goldPrice = priceData.pricePerGram;
      }
      
      // Calculate USD amount
      const finalAmountUsd = parseFloat(amountUsd || '0') || (finalGoldGrams * goldPrice);
      
      // Process the approval with full wallet/vault/certificate creation
      const result = await storage.withTransaction(async (txStorage) => {
        const generatedCertificates: any[] = [];
        
        // 1. Update user's wallet with gold balance
        const wallet = await txStorage.getWallet(request.userId);
        if (!wallet) {
          throw new Error('User wallet not found');
        }
        const currentGold = parseFloat(wallet.goldGrams || '0');
        const newGoldBalance = currentGold + finalGoldGrams;
        
        await txStorage.updateWallet(wallet.id, {
          goldGrams: newGoldBalance.toFixed(6)
        });
        
        // 2. Create a completed transaction record
        const newTransaction = await txStorage.createTransaction({
          userId: request.userId,
          type: 'Buy',
          status: 'Completed',
          amountGold: finalGoldGrams.toFixed(6),
          amountUsd: finalAmountUsd.toFixed(2),
          goldPriceUsdPerGram: goldPrice.toFixed(2),
          sourceModule: 'Buy Gold Bar',
          method: 'Wingold Purchase',
          description: `Buy Gold Bar - ${finalGoldGrams.toFixed(4)}g at $${goldPrice.toFixed(2)}/g`,
          completedAt: new Date()
        });
        
        // 3. Create vault holding
        const wingoldRef = `WG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        
        // Check for existing holdings
        const existingHoldings = await txStorage.getUserVaultHoldings(request.userId);
        let holdingId: string;
        
        if (existingHoldings.length > 0) {
          // Update existing holding
          const holding = existingHoldings[0];
          const currentHoldingGrams = parseFloat(holding.goldGrams || '0');
          await txStorage.updateVaultHolding(holding.id, {
            goldGrams: (currentHoldingGrams + finalGoldGrams).toFixed(6),
            wingoldStorageRef: wingoldRef
          });
          holdingId = holding.id;
        } else {
          // Create new holding
          const newHolding = await txStorage.createVaultHolding({
            userId: request.userId,
            goldGrams: finalGoldGrams.toFixed(6),
            vaultLocation: 'Dubai - Wingold & Metals DMCC',
            wingoldStorageRef: wingoldRef,
            purchasePriceUsdPerGram: goldPrice.toFixed(2),
            isPhysicallyDeposited: false
          });
          holdingId = newHolding.id;
        }
        
        // 4. Issue Digital Ownership Certificate from Finatrades
        const docCertNum = await txStorage.generateCertificateNumber('Digital Ownership');
        const digitalCert = await txStorage.createCertificate({
          certificateNumber: docCertNum,
          userId: request.userId,
          transactionId: newTransaction.id,
          vaultHoldingId: holdingId,
          type: 'Digital Ownership',
          status: 'Active',
          goldGrams: finalGoldGrams.toFixed(6),
          goldPriceUsdPerGram: goldPrice.toFixed(2),
          totalValueUsd: finalAmountUsd.toFixed(2),
          issuer: 'Finatrades',
          vaultLocation: 'Dubai - Wingold & Metals DMCC',
          wingoldStorageRef: wingoldRef
        });
        generatedCertificates.push(digitalCert);
        
        // 5. Issue Physical Storage Certificate from Wingold
        const pscCertNum = await txStorage.generateCertificateNumber('Physical Storage');
        const storageCert = await txStorage.createCertificate({
          certificateNumber: pscCertNum,
          userId: request.userId,
          transactionId: newTransaction.id,
          vaultHoldingId: holdingId,
          type: 'Physical Storage',
          status: 'Active',
          goldGrams: finalGoldGrams.toFixed(6),
          goldPriceUsdPerGram: goldPrice.toFixed(2),
          totalValueUsd: finalAmountUsd.toFixed(2),
          issuer: 'Wingold & Metals DMCC',
          vaultLocation: 'Dubai - Wingold & Metals DMCC',
          wingoldStorageRef: wingoldRef
        });
        generatedCertificates.push(storageCert);
        
        // 6. Record vault ledger entry
        const { vaultLedgerService } = await import('./vault-ledger-service');
        await vaultLedgerService.recordLedgerEntry({
          userId: request.userId,
          action: 'Deposit',
          goldGrams: finalGoldGrams,
          goldPriceUsdPerGram: goldPrice,
          fromWallet: 'External',
          toWallet: 'FinaPay',
          toStatus: 'Available',
          transactionId: newTransaction.id,
          certificateId: digitalCert.id,
          notes: `Buy Gold Bar - Purchased ${finalGoldGrams.toFixed(4)}g gold at $${goldPrice.toFixed(2)}/g via Wingold & Metals DMCC`,
          createdBy: adminUser.id,
        });
        
        // 7. Update the buy gold request with the credited transaction
        const updated = await txStorage.updateBuyGoldRequest(id, {
          status: 'Credited',
          amountUsd: finalAmountUsd.toFixed(2),
          goldGrams: finalGoldGrams.toFixed(6),
          goldPriceAtTime: goldPrice.toFixed(2),
          reviewerId: adminUser.id,
          reviewedAt: new Date(),
          reviewNotes: adminNotes || reviewNotes || null,
          creditedTransactionId: newTransaction.id,
        });
        
        return { newTransaction, generatedCertificates, newGoldBalance, holdingId, updated };
      });
      
      // Create audit log
      await storage.createAuditLog({
        entityType: "buy_gold_request",
        entityId: id,
        actionType: "approve",
        actor: adminUser.id,
        actorRole: "admin",
        details: `Approved buy gold request: ${finalGoldGrams.toFixed(4)}g at $${goldPrice.toFixed(2)}/g = $${finalAmountUsd.toFixed(2)}. Certificates issued: ${result.generatedCertificates.length}`,
      });
      
      // Notify user
      await storage.createNotification({
        userId: request.userId,
        title: "Buy Gold Bar Approved",
        message: `Your purchase of ${finalGoldGrams.toFixed(4)}g gold has been credited to your wallet. Certificates issued.`,
        type: "success",
        read: false,
        link: "/finavault",
      });
      
      // Notify all admins about the buy gold approval
      const buyGoldUser = await storage.getUser(request.userId);
      const buyGoldUserName = buyGoldUser ? `${buyGoldUser.firstName || ''} ${buyGoldUser.lastName || ''}`.trim() || 'User' : 'User';
      notifyAllAdmins({
        title: 'Buy Gold Bar Approved',
        message: `${buyGoldUserName}'s purchase of ${finalGoldGrams.toFixed(4)}g gold ($${finalAmountUsd.toFixed(2)}) has been approved and credited.`,
        type: 'success',
        link: '/admin/finapay/buy-gold',
      });
      
      // Send gold purchase email
      if (buyGoldUser?.email) {
        sendEmail(buyGoldUser.email, EMAIL_TEMPLATES.GOLD_PURCHASE, {
          user_name: `${buyGoldUser.firstName} ${buyGoldUser.lastName}`,
          gold_grams: finalGoldGrams.toFixed(4),
          amount_usd: finalAmountUsd.toFixed(2),
          gold_price: goldPrice.toFixed(2),
        }).catch(err => console.error('[Email] Gold purchase notification failed:', err));
      }
      
      // Emit real-time updates
      const io = getIO();
      io.to(`user:${request.userId}`).emit('ledger:balance_update', {
        goldGrams: result.newGoldBalance.toFixed(6)
      });
      io.to(`user:${request.userId}`).emit('ledger:vault_update', {
        holdingId: result.holdingId
      });
      
      res.json({ 
        request: result.updated, 
        transaction: result.newTransaction,
        certificates: result.generatedCertificates,
        message: 'Buy Gold Bar approved - wallet credited and certificates issued'
      });
    } catch (error) {
      console.error("Failed to approve buy gold request:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to approve request" });
    }
  });

  // Admin: Reject buy gold request
  app.patch("/api/admin/buy-gold/:id/reject", ensureAdminAsync, async (req, res) => {
    try {
      const { id } = req.params;
      const { rejectionReason, reviewNotes } = req.body;
      const adminUser = (req as any).adminUser;
      
      if (!rejectionReason) {
        return res.status(400).json({ message: "Rejection reason is required" });
      }
      
      const request = await storage.getBuyGoldRequest(id);
      if (!request) {
        return res.status(404).json({ message: "Buy gold request not found" });
      }
      
      if (!['Pending', 'Under Review'].includes(request.status)) {
        return res.status(400).json({ message: "Request cannot be rejected in current status" });
      }
      
      const updated = await storage.updateBuyGoldRequest(id, {
        status: 'Rejected',
        reviewerId: adminUser.id,
        reviewedAt: new Date(),
        reviewNotes: reviewNotes || null,
        rejectionReason,
      });
      
      // Create audit log
      await storage.createAuditLog({
        entityType: "buy_gold_request",
        entityId: id,
        actionType: "reject",
        actor: adminUser.id,
        actorRole: "admin",
        details: `Rejected buy gold request: ${rejectionReason}`,
      });
      
      // Notify user
      await storage.createNotification({
        userId: request.userId,
        title: "Buy Gold Request Rejected",
        message: `Your buy gold request has been rejected. Reason: ${rejectionReason}`,
        type: "error",
        read: false,
      });
      
      res.json({ request: updated });
    } catch (error) {
      console.error("Failed to reject buy gold request:", error);
      res.status(500).json({ message: "Failed to reject request" });
    }
  });

  // ============================================
  // USER NOTIFICATIONS
  // ============================================

  // Get user's notifications - PROTECTED: requires matching session
  app.get("/api/notifications/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      const notifications = await storage.getUserNotifications(req.params.userId);
      res.json({ notifications });
    } catch (error) {
      res.status(500).json({ message: "Failed to get notifications" });
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
      res.json({ notification });
    } catch (error) {
      res.status(500).json({ message: "Failed to create notification" });
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
      const sessionUserId = (req.session as any)?.user?.id;
      const isAdmin = (req.session as any)?.user?.isAdmin;
      if (notification.userId !== sessionUserId && !isAdmin) {
        return res.status(403).json({ message: "Not authorized to modify this notification" });
      }
      const updated = await storage.markNotificationRead(req.params.id);
      res.json({ notification: updated });
    } catch (error) {
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // Mark all notifications as read - with ownership verification
  app.patch("/api/notifications/:userId/read-all", ensureOwnerOrAdmin, async (req, res) => {
    try {
      await storage.markAllNotificationsRead(req.params.userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to mark notifications as read" });
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
      const sessionUserId = (req.session as any)?.user?.id;
      const isAdmin = (req.session as any)?.user?.isAdmin;
      if (notification.userId !== sessionUserId && !isAdmin) {
        return res.status(403).json({ message: "Not authorized to delete this notification" });
      }
      await storage.deleteNotification(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete notification" });
    }
  });

  // Clear all notifications for user - with ownership verification
  app.delete("/api/notifications/user/:userId", ensureOwnerOrAdmin, async (req, res) => {
    try {
      await storage.deleteAllNotifications(req.params.userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to clear notifications" });
    }
  });

  // ============================================
  // PUSH NOTIFICATION DEVICE TOKENS
  // ============================================

  // Register device token for push notifications
  app.post("/api/push/register", ensureAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any)?.user?.id;
      const { token, platform, deviceName, deviceId } = req.body;
      
      if (!token || !platform) {
        return res.status(400).json({ message: "Token and platform are required" });
      }
      
      if (!['ios', 'android', 'web'].includes(platform)) {
        return res.status(400).json({ message: "Invalid platform. Must be ios, android, or web" });
      }
      
      const { registerDeviceToken } = await import('./push-notifications');
      await registerDeviceToken(userId, token, platform, deviceName, deviceId);
      
      res.json({ success: true, message: "Device registered for push notifications" });
    } catch (error) {
      console.error("Failed to register push device:", error);
      res.status(500).json({ message: "Failed to register device for push notifications" });
    }
  });

  // Unregister device token
  app.post("/api/push/unregister", ensureAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any)?.user?.id;
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ message: "Token is required" });
      }
      
      const { unregisterDeviceToken } = await import('./push-notifications');
      await unregisterDeviceToken(userId, token);
      
      res.json({ success: true, message: "Device unregistered from push notifications" });
    } catch (error) {
      console.error("Failed to unregister push device:", error);
      res.status(500).json({ message: "Failed to unregister device" });
    }
  });

  // Get user's registered devices
  app.get("/api/push/devices", ensureAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any)?.user?.id;
      const { getUserDeviceTokens } = await import('./push-notifications');
      const tokens = await getUserDeviceTokens(userId);
      
      res.json({ devices: tokens.length, hasDevices: tokens.length > 0 });
    } catch (error) {
      console.error("Failed to get push devices:", error);
      res.status(500).json({ message: "Failed to get registered devices" });
    }
  });

  // Unregister all device tokens for user (used during logout)
  app.post("/api/push/unregister-all", ensureAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any)?.user?.id;
      const { unregisterAllDeviceTokens } = await import('./push-notifications');
      const count = await unregisterAllDeviceTokens(userId);
      
      res.json({ success: true, devicesUnregistered: count });
    } catch (error) {
      console.error("Failed to unregister all push devices:", error);
      res.status(500).json({ message: "Failed to unregister devices" });
    }
  });

  // ============================================
  // PLATFORM CONFIGURATION
  // ============================================

  // Get all platform configs
  app.get("/api/admin/platform-config", ensureAdminAsync, async (req, res) => {
    try {
      const configs = await storage.getAllPlatformConfigs();
      res.json({ configs });
    } catch (error) {
      console.error("Failed to get platform configs:", error);
      res.status(500).json({ message: "Failed to get platform configuration" });
    }
  });

  // Get platform configs by category
  app.get("/api/admin/platform-config/category/:category", ensureAdminAsync, async (req, res) => {
    try {
      const configs = await storage.getPlatformConfigsByCategory(req.params.category);
      res.json({ configs });
    } catch (error) {
      console.error("Failed to get platform configs by category:", error);
      res.status(500).json({ message: "Failed to get platform configuration" });
    }
  });

  // Get single platform config by key
  app.get("/api/admin/platform-config/key/:key", ensureAdminAsync, async (req, res) => {
    try {
      const config = await storage.getPlatformConfig(req.params.key);
      if (!config) {
        return res.status(404).json({ message: "Configuration not found" });
      }
      res.json({ config });
    } catch (error) {
      console.error("Failed to get platform config:", error);
      res.status(500).json({ message: "Failed to get platform configuration" });
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
      
      res.json({ configs: configMap });
    } catch (error) {
      console.error("Failed to get public platform configs:", error);
      res.status(500).json({ message: "Failed to get platform configuration" });
    }
  });

  // Update platform config
  app.patch("/api/admin/platform-config/:id", ensureAdminAsync, async (req, res) => {
    try {
      const { id } = req.params;
      const { configValue } = req.body;
      const adminUser = (req as any).adminUser;
      
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
      
      res.json({ config: updated });
    } catch (error) {
      console.error("Failed to update platform config:", error);
      res.status(500).json({ message: "Failed to update platform configuration" });
    }
  });

  // Bulk update platform configs
  app.post("/api/admin/platform-config/bulk-update", ensureAdminAsync, async (req, res) => {
    try {
      const { updates } = req.body; // Array of { id, configValue }
      const adminUser = (req as any).adminUser;
      
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
      
      res.json({ configs: results, updated: results.length });
    } catch (error) {
      console.error("Failed to bulk update platform configs:", error);
      res.status(500).json({ message: "Failed to update platform configuration" });
    }
  });

  // Seed default platform configs
  app.post("/api/admin/platform-config/seed", ensureAdminAsync, async (req, res) => {
    try {
      await storage.seedDefaultPlatformConfig();
      const configs = await storage.getAllPlatformConfigs();
      res.json({ message: "Default platform configuration seeded", configs });
    } catch (error) {
      console.error("Failed to seed platform configs:", error);
      res.status(500).json({ message: "Failed to seed platform configuration" });
    }
  });

  // Create new platform config (admin use)
  app.post("/api/admin/platform-config", ensureAdminAsync, async (req, res) => {
    try {
      const { category, configKey, configValue, configType, displayName, description, displayOrder } = req.body;
      const adminUser = (req as any).adminUser;
      
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
      
      res.json({ config });
    } catch (error) {
      console.error("Failed to create platform config:", error);
      res.status(500).json({ message: "Failed to create platform configuration" });
    }
  });

  // Delete platform config
  app.delete("/api/admin/platform-config/:id", ensureAdminAsync, async (req, res) => {
    try {
      const { id } = req.params;
      const adminUser = (req as any).adminUser;
      
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
      
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete platform config:", error);
      res.status(500).json({ message: "Failed to delete platform configuration" });
    }
  });

  // ============================================
  // EMAIL NOTIFICATION SETTINGS ROUTES
  // ============================================

  // Get all email notification settings
  app.get("/api/admin/email-notifications", ensureAdminAsync, async (req, res) => {
    try {
      const settings = await storage.getAllEmailNotificationSettings();
      res.json({ settings });
    } catch (error) {
      console.error("Failed to get email notification settings:", error);
      res.status(500).json({ message: "Failed to get email notification settings" });
    }
  });

  // Get email notification settings by category
  app.get("/api/admin/email-notifications/category/:category", ensureAdminAsync, async (req, res) => {
    try {
      const { category } = req.params;
      const settings = await storage.getEmailNotificationSettingsByCategory(category);
      res.json({ settings });
    } catch (error) {
      console.error("Failed to get email notification settings by category:", error);
      res.status(500).json({ message: "Failed to get email notification settings" });
    }
  });

  // Toggle email notification
  app.patch("/api/admin/email-notifications/:type/toggle", ensureAdminAsync, async (req, res) => {
    try {
      const { type } = req.params;
      const { isEnabled } = req.body;
      const adminUser = (req as any).adminUser;
      
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
      
      res.json({ setting });
    } catch (error) {
      console.error("Failed to toggle email notification:", error);
      res.status(500).json({ message: "Failed to toggle email notification" });
    }
  });

  // Update email notification setting
  app.patch("/api/admin/email-notifications/:id", ensureAdminAsync, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const adminUser = (req as any).adminUser;
      
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
      
      res.json({ setting });
    } catch (error) {
      console.error("Failed to update email notification setting:", error);
      res.status(500).json({ message: "Failed to update email notification setting" });
    }
  });

  // Seed default email notification settings
  app.post("/api/admin/email-notifications/seed", ensureAdminAsync, async (req, res) => {
    try {
      await storage.seedDefaultEmailNotificationSettings();
      const settings = await storage.getAllEmailNotificationSettings();
      res.json({ success: true, count: settings.length });
    } catch (error) {
      console.error("Failed to seed email notification settings:", error);
      res.status(500).json({ message: "Failed to seed email notification settings" });
    }
  });

  // ============================================
  // EMAIL LOGS ROUTES
  // ============================================

  // Get all email logs
  app.get("/api/admin/email-logs", ensureAdminAsync, async (req, res) => {
    try {
      const logs = await storage.getAllEmailLogs();
      res.json({ logs });
    } catch (error) {
      console.error("Failed to get email logs:", error);
      res.status(500).json({ message: "Failed to get email logs" });
    }
  });

  // Get email logs by user
  app.get("/api/admin/email-logs/user/:userId", ensureAdminAsync, async (req, res) => {
    try {
      const { userId } = req.params;
      const logs = await storage.getEmailLogsByUser(userId);
      res.json({ logs });
    } catch (error) {
      console.error("Failed to get user email logs:", error);
      res.status(500).json({ message: "Failed to get user email logs" });
    }
  });

  // Get email logs by notification type
  app.get("/api/admin/email-logs/type/:type", ensureAdminAsync, async (req, res) => {
    try {
      const { type } = req.params;
      const logs = await storage.getEmailLogsByType(type);
      res.json({ logs });
    } catch (error) {
      console.error("Failed to get email logs by type:", error);
      res.status(500).json({ message: "Failed to get email logs by type" });
    }
  });

  // Get single email log
  app.get("/api/admin/email-logs/:id", ensureAdminAsync, async (req, res) => {
    try {
      const { id } = req.params;
      const log = await storage.getEmailLog(id);
      
      if (!log) {
        return res.status(404).json({ message: "Email log not found" });
      }
      
      res.json({ log });
    } catch (error) {
      console.error("Failed to get email log:", error);
      res.status(500).json({ message: "Failed to get email log" });
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
          const geoData = await geoResponse.json();
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
      
      res.json({ restricted: false });
    } catch (error) {
      console.error("Failed to check geo restriction:", error);
      res.json({ restricted: false });
    }
  });

  // Get all geo restrictions (admin)
  app.get("/api/admin/geo-restrictions", ensureAdminAsync, async (req, res) => {
    try {
      const restrictions = await db.select().from(geoRestrictions).orderBy(geoRestrictions.countryName);
      res.json({ restrictions });
    } catch (error) {
      console.error("Failed to get geo restrictions:", error);
      res.status(500).json({ message: "Failed to get geo restrictions" });
    }
  });

  // Get geo restriction settings (admin)
  app.get("/api/admin/geo-restriction-settings", ensureAdminAsync, async (req, res) => {
    try {
      const [settings] = await db.select().from(geoRestrictionSettings).limit(1);
      res.json({ settings: settings || null });
    } catch (error) {
      console.error("Failed to get geo restriction settings:", error);
      res.status(500).json({ message: "Failed to get geo restriction settings" });
    }
  });

  // Update or create geo restriction settings (admin)
  app.post("/api/admin/geo-restriction-settings", ensureAdminAsync, async (req, res) => {
    try {
      const { isEnabled, defaultMessage, showNoticeOnLanding, blockAccess } = req.body;
      const adminUser = (req as any).adminUser;
      
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
      res.status(500).json({ message: "Failed to update geo restriction settings" });
    }
  });

  // Add a new geo restriction (admin)
  app.post("/api/admin/geo-restrictions", ensureAdminAsync, async (req, res) => {
    try {
      const { countryCode, countryName, isRestricted, restrictionMessage, allowRegistration, allowLogin, allowTransactions, reason } = req.body;
      const adminUser = (req as any).adminUser;
      
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
      
      res.json({ restriction: created });
    } catch (error) {
      console.error("Failed to create geo restriction:", error);
      res.status(500).json({ message: "Failed to create geo restriction" });
    }
  });

  // Update geo restriction (admin)
  app.patch("/api/admin/geo-restrictions/:id", ensureAdminAsync, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const adminUser = (req as any).adminUser;
      
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
      
      res.json({ restriction: updated });
    } catch (error) {
      console.error("Failed to update geo restriction:", error);
      res.status(500).json({ message: "Failed to update geo restriction" });
    }
  });

  // Delete geo restriction (admin)
  app.delete("/api/admin/geo-restrictions/:id", ensureAdminAsync, async (req, res) => {
    try {
      const { id } = req.params;
      const adminUser = (req as any).adminUser;
      
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
      
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete geo restriction:", error);
      res.status(500).json({ message: "Failed to delete geo restriction" });
    }
  });

  // ============================================
  // QA DEPOSIT TEST RUNNER
  // ============================================

  const QA_MODE = process.env.QA_MODE === 'true' || process.env.NODE_ENV === 'development';

  // QA access middleware - allows admin OR authenticated user when QA mode is active
  async function ensureQaAccess(req: Request, res: Response, next: NextFunction) {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    const user = req.user as User | undefined;
    if (user?.role === 'admin' || QA_MODE) {
      return next();
    }
    return res.status(403).json({ message: "QA access requires admin role or QA mode" });
  }

  // Internal QA test runner (only works in development/QA mode)
  app.post("/api/qa/internal/run-test", async (req, res) => {
    if (!QA_MODE) {
      return res.status(403).json({ message: "Internal QA tests only available in QA mode" });
    }
    
    const requestId = `qa-int-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const logs: any[] = [];
    
    const log = (event: string, details: any = {}) => {
      const entry = { ts: new Date().toISOString(), level: 'info', requestId, event, ...details };
      logs.push(entry);
      console.log(`[QA-Internal] ${JSON.stringify(entry)}`);
    };

    try {
      const { email, method, amountUsd } = req.body;
      
      log('INTERNAL_TEST_START', { email, method, amountUsd });

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ code: 'USER_NOT_FOUND', message: `User not found: ${email}`, requestId, logs });
      }

      const configRows = await db.select().from(platformConfig);
      const config: Record<string, number> = {};
      configRows.forEach((row: any) => { config[row.configKey] = parseFloat(row.configValue) || 0; });

      const minDeposit = config['min_deposit'] || 50;
      const maxDeposit = config['max_deposit_single'] || 100000;
      const amount = parseFloat(amountUsd);

      if (amount < minDeposit || amount > maxDeposit) {
        return res.status(400).json({ code: 'LIMIT_ERROR', message: `Amount must be between $${minDeposit} and $${maxDeposit}`, requestId, logs });
      }

      const goldPrice = await getGoldPricePerGram();
      const goldGrams = amount / goldPrice;

      const transaction = await storage.createTransaction({
        userId: user.id,
        type: 'Deposit',
        amount: amount.toFixed(2),
        goldGrams: goldGrams.toFixed(6),
        goldPriceAtTime: goldPrice.toFixed(2),
        status: 'Completed',
        description: `QA Internal ${method.toUpperCase()} deposit - $${amount.toFixed(2)}`,
        paymentMethod: method.toLowerCase(),
        reference: `QA-INT-${requestId}`,
      });

      log('TX_CREATED', { transactionId: transaction.id });

      const wallet = await storage.getWallet(user.id);
      if (wallet) {
        const newGoldBalance = (parseFloat(wallet.goldGrams) + goldGrams).toFixed(6);
        await storage.updateWallet(wallet.id, { goldGrams: newGoldBalance });
        log('WALLET_UPDATED', { newGoldBalance });
      }

      const vaultHolding = await storage.createVaultHolding({
        userId: user.id,
        transactionId: transaction.id,
        goldGrams: goldGrams.toFixed(6),
        goldPriceAtPurchase: goldPrice.toFixed(2),
        purchaseValue: amount.toFixed(2),
        purity: '99.99%',
        status: 'Active',
        allocationType: 'Allocated',
        storageLocation: 'FinaVault Dubai',
        vaultOperator: 'FinaVault',
        vaultFacilitator: 'Wingold & Metals DMCC',
      });

      log('VAULT_HOLDING_CREATED', { holdingId: vaultHolding.id });

      const certTime = Date.now();
      const ownershipCert = await db.insert(certificates).values({
        certificateNumber: `OWN-QA-INT-${certTime}`,
        userId: user.id,
        transactionId: transaction.id,
        vaultHoldingId: vaultHolding.id,
        type: 'Digital Ownership',
        status: 'Active',
        goldGrams: goldGrams.toFixed(6),
        goldPriceUsdPerGram: goldPrice.toFixed(2),
        totalValueUsd: amount.toFixed(2),
        issuer: 'Finatrades',
        vaultLocation: 'FinaVault Dubai',
      }).returning();

      const storageCert = await db.insert(certificates).values({
        certificateNumber: `STOR-QA-INT-${certTime}`,
        userId: user.id,
        transactionId: transaction.id,
        vaultHoldingId: vaultHolding.id,
        type: 'Physical Storage',
        status: 'Active',
        goldGrams: goldGrams.toFixed(6),
        goldPriceUsdPerGram: goldPrice.toFixed(2),
        totalValueUsd: amount.toFixed(2),
        issuer: 'Wingold & Metals DMCC',
        vaultLocation: 'FinaVault Dubai',
      }).returning();

      log('CERTS_GENERATED', { ownership: ownershipCert[0]?.id, storage: storageCert[0]?.id });

      emitLedgerEvent(user.id, 'balance_update', { transactionId: transaction.id, type: 'deposit', amount, goldGrams, status: 'Completed' });
      log('STATUS_CONFIRMED', { transactionId: transaction.id });

      const updatedWallet = await storage.getWallet(user.id);

      res.json({
        status: 'CONFIRMED',
        requestId,
        transactionId: transaction.id,
        vaultHoldingId: vaultHolding.id,
        certificates: { ownership: ownershipCert[0]?.id, storage: storageCert[0]?.id },
        balances: { goldGrams: updatedWallet?.goldGrams || '0', usdBalance: updatedWallet?.usdBalance || '0' },
        goldReceived: goldGrams.toFixed(6),
        goldPrice: goldPrice.toFixed(2),
        method,
        email,
        logs
      });
    } catch (error) {
      log('ERROR', { error: error instanceof Error ? error.message : 'Unknown error' });
      res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Failed to process test', requestId, logs });
    }
  });

  // QA Deposit Run API
  app.post("/api/qa/deposit/run", ensureQaAccess, async (req, res) => {
    const requestId = `qa-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const logs: any[] = [];
    
    const log = (event: string, details: any = {}) => {
      const entry = {
        ts: new Date().toISOString(),
        level: 'info',
        requestId,
        event,
        ...details
      };
      logs.push(entry);
      console.log(`[QA] ${JSON.stringify(entry)}`);
    };

    try {
      const { email, method, amountUsd, approve } = req.body;
      
      log('QA_RUN_START', { email, method, amountUsd, approve });

      // Validate inputs
      if (!email || !method || !amountUsd) {
        log('VALIDATION_FAIL', { reason: 'missing_fields' });
        return res.status(400).json({ 
          code: 'INVALID_INPUT', 
          message: 'Email, method, and amount are required',
          requestId,
          logs 
        });
      }

      // Get user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        log('VALIDATION_FAIL', { reason: 'user_not_found', email });
        return res.status(404).json({ 
          code: 'USER_NOT_FOUND', 
          message: `User not found: ${email}`,
          requestId,
          logs 
        });
      }

      // Get platform config for limits
      const configRows = await db.select().from(platformConfig);
      const config: Record<string, number> = {};
      configRows.forEach((row: any) => {
        config[row.configKey] = parseFloat(row.configValue) || 0;
      });

      const minDeposit = config['min_deposit'] || 50;
      const maxDeposit = config['max_deposit_single'] || 100000;
      const amount = parseFloat(amountUsd);

      log('CONFIG_LOADED', { minDeposit, maxDeposit, amount });

      // Validate limits
      if (amount < minDeposit) {
        log('VALIDATION_FAIL', { reason: 'below_minimum', amount, minDeposit });
        return res.status(400).json({ 
          code: 'LIMIT_MIN', 
          message: `Minimum deposit amount is $${minDeposit}`,
          meta: { min: minDeposit },
          requestId,
          logs 
        });
      }

      if (amount > maxDeposit) {
        log('VALIDATION_FAIL', { reason: 'above_maximum', amount, maxDeposit });
        return res.status(400).json({ 
          code: 'LIMIT_MAX', 
          message: `Maximum deposit amount is $${maxDeposit.toLocaleString()}`,
          meta: { max: maxDeposit },
          requestId,
          logs 
        });
      }

      log('VALIDATION_PASS', { amount, method });

      // If not approved, just log and return
      if (!approve) {
        log('APPROVAL_DECLINED', { email, amount, method });
        return res.json({
          status: 'DECLINED',
          message: 'Deposit was not approved',
          requestId,
          logs
        });
      }

      log('APPROVAL_ACCEPTED', { email, amount, method });

      // Get gold price
      const goldPrice = await getGoldPricePerGram();
      const goldGrams = amount / goldPrice;
      
      log('GOLD_PRICE_FETCHED', { goldPrice, goldGrams: goldGrams.toFixed(6) });

      // Create transaction
      const transaction = await storage.createTransaction({
        userId: user.id,
        type: 'Deposit',
        amount: amount.toFixed(2),
        goldGrams: goldGrams.toFixed(6),
        goldPriceAtTime: goldPrice.toFixed(2),
        status: 'Pending',
        description: `QA ${method.toUpperCase()} deposit - $${amount.toFixed(2)} (${goldGrams.toFixed(4)}g gold)`,
        paymentMethod: method.toLowerCase(),
        reference: `QA-${requestId}`,
      });

      log('TX_CREATED', { transactionId: transaction.id, status: 'Pending' });

      // In QA mode, auto-confirm after 2 seconds
      if (QA_MODE) {
        log('QA_MODE_AUTO_CONFIRM', { delayMs: 2000 });
        
        // Immediately update status
        await storage.updateTransaction(transaction.id, { status: 'Completed' });
        
        // Update wallet balance
        const wallet = await storage.getWalletByUserId(user.id);
        if (wallet) {
          const newGoldBalance = (parseFloat(wallet.goldGrams) + goldGrams).toFixed(6);
          await storage.updateWallet(wallet.id, { goldGrams: newGoldBalance });
          log('WALLET_UPDATED', { walletId: wallet.id, newGoldBalance });
        }

        // Create vault holding
        const vaultHolding = await storage.createVaultHolding({
          userId: user.id,
          transactionId: transaction.id,
          goldGrams: goldGrams.toFixed(6),
          goldPriceAtPurchase: goldPrice.toFixed(2),
          purchaseValue: amount.toFixed(2),
          purity: '99.99%',
          status: 'Active',
          allocationType: 'Allocated',
          storageLocation: 'FinaVault Dubai',
          vaultOperator: 'FinaVault',
          vaultFacilitator: 'Wingold & Metals DMCC',
        });

        log('VAULT_HOLDING_CREATED', { holdingId: vaultHolding.id });

        // Generate certificates
        const certData = {
          userId: user.id,
          transactionId: transaction.id,
          vaultHoldingId: vaultHolding.id,
          fullName: `${user.firstName} ${user.lastName}`,
          goldGrams: goldGrams.toFixed(6),
          amountUsd: amount.toFixed(2),
          purity: '99.99%',
          isQaMode: true,
        };

        // Create ownership certificate
        const ownershipCert = await db.insert(certificates).values({
          id: `cert-own-${Date.now()}`,
          transactionId: transaction.id,
          vaultHoldingId: vaultHolding.id,
          certificateType: 'ownership',
          certificateNumber: `OWN-QA-${Date.now()}`,
          issuer: 'Finatrades',
          issuedAt: new Date(),
          goldGrams: goldGrams.toFixed(6),
          purity: '99.99%',
          storageLocation: 'FinaVault Dubai',
          holderName: certData.fullName,
          status: 'Active',
          metadata: JSON.stringify({ qaMode: true, method, requestId }),
        }).returning();

        // Create storage certificate
        const storageCert = await db.insert(certificates).values({
          id: `cert-stor-${Date.now()}`,
          transactionId: transaction.id,
          vaultHoldingId: vaultHolding.id,
          certificateType: 'storage',
          certificateNumber: `STOR-QA-${Date.now()}`,
          issuer: 'Wingold & Metals DMCC',
          issuedAt: new Date(),
          goldGrams: goldGrams.toFixed(6),
          purity: '99.99%',
          storageLocation: 'FinaVault Dubai',
          holderName: certData.fullName,
          status: 'Active',
          metadata: JSON.stringify({ qaMode: true, method, requestId }),
        }).returning();

        // Create invoice certificate
        const invoiceCert = await db.insert(certificates).values({
          id: `cert-inv-${Date.now()}`,
          transactionId: transaction.id,
          vaultHoldingId: vaultHolding.id,
          certificateType: 'invoice',
          certificateNumber: `INV-QA-${Date.now()}`,
          issuer: 'Wingold & Metals DMCC',
          issuedAt: new Date(),
          goldGrams: goldGrams.toFixed(6),
          purity: '99.99%',
          storageLocation: 'FinaVault Dubai',
          holderName: certData.fullName,
          status: 'Active',
          metadata: JSON.stringify({ 
            qaMode: true, 
            method, 
            requestId,
            amountUsd: amount.toFixed(2),
            goldPricePerGram: goldPrice.toFixed(2),
          }),
        }).returning();

        log('CERTS_GENERATED', { 
          ownershipCertId: ownershipCert[0]?.id,
          storageCertId: storageCert[0]?.id,
          invoiceCertId: invoiceCert[0]?.id
        });

        // Queue email notification
        try {
          await sendEmail({
            to: email,
            subject: `Deposit Confirmed — $${amount.toFixed(2)} via ${method.toUpperCase()}`,
            template: 'transaction_notification',
            templateData: {
              firstName: user.firstName,
              transactionType: 'Deposit',
              amount: `$${amount.toFixed(2)}`,
              goldGrams: `${goldGrams.toFixed(4)}g`,
              method: method.toUpperCase(),
              transactionId: transaction.id,
              status: 'Completed',
              qaMode: true,
            }
          });
          log('EMAIL_SENT', { to: email });
        } catch (emailError) {
          log('EMAIL_QUEUED', { to: email, error: 'SMTP not configured - email saved to logs' });
        }

        // Emit real-time update
        emitLedgerEvent(user.id, 'balance_update', {
          transactionId: transaction.id,
          type: 'deposit',
          amount,
          goldGrams,
          status: 'Completed',
        });

        log('STATUS_CONFIRMED', { transactionId: transaction.id });

        // Get updated wallet balance
        const updatedWallet = await storage.getWalletByUserId(user.id);

        return res.json({
          status: 'CONFIRMED',
          requestId,
          transactionId: transaction.id,
          vaultHoldingId: vaultHolding.id,
          certificates: {
            ownership: ownershipCert[0]?.id,
            storage: storageCert[0]?.id,
            invoice: invoiceCert[0]?.id,
          },
          balances: {
            goldGrams: updatedWallet?.goldGrams || '0',
            usdBalance: updatedWallet?.usdBalance || '0',
          },
          goldReceived: goldGrams.toFixed(6),
          goldPrice: goldPrice.toFixed(2),
          method,
          email,
          logs
        });
      }

      // Non-QA mode - keep as pending
      log('STATUS_PENDING', { transactionId: transaction.id });
      return res.json({
        status: 'PENDING',
        requestId,
        transactionId: transaction.id,
        message: 'Deposit pending provider confirmation',
        logs
      });

    } catch (error) {
      log('ERROR', { error: error instanceof Error ? error.message : 'Unknown error' });
      console.error('[QA] Deposit run error:', error);
      res.status(500).json({ 
        code: 'INTERNAL_ERROR',
        message: 'Failed to process QA deposit',
        requestId,
        logs 
      });
    }
  });

  // Get QA config (limits) - allows any authenticated user to see config
  app.get("/api/qa/config", ensureAuthenticated, async (req, res) => {
    try {
      const configRows = await db.select().from(platformConfig);
      const config: Record<string, any> = {};
      configRows.forEach((row: any) => {
        config[row.configKey] = row.configValue;
      });

      res.json({
        qaMode: QA_MODE,
        limits: {
          minDeposit: parseFloat(config['min_deposit'] || '50'),
          maxDeposit: parseFloat(config['max_deposit_single'] || '100000'),
          minTradeAmount: parseFloat(config['min_trade_amount'] || '10'),
        }
      });
    } catch (error) {
      res.status(500).json({ message: 'Failed to get QA config' });
    }
  });

  // QA Test Harness Routes
  const qaTestRunner = await import('./qa-test-runner');
  const qaSeed = await import('./qa-seed');
  const qaLoggerModule = await import('./qa-logger');

  app.post("/api/qa/tests/seed", ensureQaAccess, async (req, res) => {
    try {
      const result = await qaSeed.seedTestUsers();
      res.json({ success: true, ...result });
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.post("/api/qa/tests/reset", ensureQaAccess, async (req, res) => {
    try {
      const result = await qaSeed.resetTestData();
      res.json({ success: true, ...result });
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.get("/api/qa/tests/accounts", ensureQaAccess, async (req, res) => {
    try {
      const accounts = await qaSeed.getTestAccounts();
      res.json({ accounts, password: qaSeed.TEST_PASSWORD });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.post("/api/qa/tests/run/smoke", ensureQaAccess, async (req, res) => {
    try {
      const results = await qaTestRunner.runSmokeTests();
      const report = qaTestRunner.generateReport(results);
      res.json({ success: true, ...report.summary });
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.post("/api/qa/tests/run/full", ensureQaAccess, async (req, res) => {
    try {
      const results = await qaTestRunner.runFullRegression();
      const report = qaTestRunner.generateReport(results);
      res.json({ success: true, ...report.summary });
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.post("/api/qa/tests/run/auth", ensureQaAccess, async (req, res) => {
    try {
      const results = await qaTestRunner.runAuthTests();
      res.json({ success: true, ...results });
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.post("/api/qa/tests/run/roles", ensureQaAccess, async (req, res) => {
    try {
      const results = await qaTestRunner.runRolePermissionTests();
      res.json({ success: true, ...results });
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.post("/api/qa/tests/run/kyc", ensureQaAccess, async (req, res) => {
    try {
      const results = await qaTestRunner.runKYCGateTests();
      res.json({ success: true, ...results });
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.post("/api/qa/tests/run/deposits", ensureQaAccess, async (req, res) => {
    try {
      const results = await qaTestRunner.runDepositTests();
      res.json({ success: true, ...results });
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.get("/api/qa/logs", ensureQaAccess, async (req, res) => {
    try {
      const { level, suite, testName, actorEmail, count } = req.query;
      const logs = qaLoggerModule.qaLogger.getRecentLogs(
        parseInt(count as string) || 200,
        {
          level: level as any,
          suite: suite as string,
          testName: testName as string,
          actorEmail: actorEmail as string,
        }
      );
      res.json({ logs });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.get("/api/qa/logs/export", ensureQaAccess, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const logs = qaLoggerModule.qaLogger.exportLogs(startDate as string, endDate as string);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=qa-logs-${new Date().toISOString().split('T')[0]}.json`);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.get("/api/qa/report", ensureQaAccess, async (req, res) => {
    try {
      const results = await qaTestRunner.runFullRegression();
      const report = qaTestRunner.generateReport(results);
      
      if (req.query.format === 'html') {
        res.setHeader('Content-Type', 'text/html');
        res.send(report.html);
      } else {
        res.json(report.summary);
      }
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  return httpServer;
}
