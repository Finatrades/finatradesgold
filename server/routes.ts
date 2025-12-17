import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage, type TransactionalStorage } from "./storage";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { 
  insertUserSchema, insertKycSubmissionSchema, insertWalletSchema, 
  insertTransactionSchema, insertVaultHoldingSchema, insertBnslPlanSchema,
  insertBnslPayoutSchema, insertBnslEarlyTerminationSchema, insertBnslAgreementSchema, insertTradeCaseSchema,
  insertTradeDocumentSchema, insertChatSessionSchema, insertChatMessageSchema,
  insertAuditLogSchema, insertContentPageSchema, insertContentBlockSchema,
  insertTemplateSchema, insertMediaAssetSchema, 
  insertPlatformBankAccountSchema, insertDepositRequestSchema, insertWithdrawalRequestSchema,
  insertPeerTransferSchema, insertPeerRequestSchema,
  insertTradeRequestSchema, insertTradeProposalSchema, insertForwardedProposalSchema,
  insertTradeConfirmationSchema, insertSettlementHoldSchema, insertFinabridgeWalletSchema,
  User, paymentGatewaySettings, insertPaymentGatewaySettingsSchema,
  insertSecuritySettingsSchema,
  vaultLedgerEntries, vaultOwnershipSummary,
  wallets, transactions, auditLogs, certificates
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

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

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

// Middleware to ensure admin access using header-based auth
// This middleware validates that the X-Admin-User-Id header contains a valid admin user ID
async function ensureAdminAsync(req: Request, res: Response, next: NextFunction) {
  try {
    const adminUserId = req.headers['x-admin-user-id'] as string;
    console.log('[DEBUG] ensureAdminAsync - Headers:', JSON.stringify(req.headers, null, 2));
    console.log('[DEBUG] ensureAdminAsync - adminUserId:', adminUserId);
    
    if (!adminUserId) {
      console.log('[DEBUG] ensureAdminAsync - No adminUserId found in headers');
      return res.status(401).json({ message: "Authentication required" });
    }
    
    const admin = await storage.getUser(adminUserId);
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ message: "Admin access required" });
    }
    
    // Attach the validated admin user to the request
    (req as any).adminUser = admin;
    next();
  } catch (error) {
    return res.status(500).json({ message: "Authentication failed" });
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

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Seed email templates on startup (must await to ensure templates exist before handling requests)
  await seedEmailTemplates().catch(err => console.error('[Email] Failed to seed templates:', err));
  
  // Start document expiry reminder scheduler
  startDocumentExpiryScheduler();

  // File upload endpoint for Deal Room and other attachments
  app.post("/api/documents/upload", upload.single('file'), (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
      
      // Return the URL to access the uploaded file
      const fileUrl = `/uploads/${req.file.filename}`;
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
  app.get("/api/dashboard/:userId", async (req, res) => {
    const startTime = Date.now();
    try {
      const userId = req.params.userId;
      
      // Parallel fetch all data sources
      const [
        wallet,
        vaultHoldings,
        transactions,
        depositRequests,
        cryptoPayments,
        bnslPlans,
        priceData,
        notifications,
        tradeCases
      ] = await Promise.all([
        storage.getWallet(userId).catch(() => null),
        storage.getUserVaultHoldings(userId).catch(() => []),
        storage.getUserTransactions(userId).catch(() => []),
        storage.getUserDepositRequests(userId).catch(() => []),
        storage.getUserCryptoPaymentRequests(userId).catch(() => []),
        storage.getUserBnslPlans(userId).catch(() => []),
        getGoldPrice().catch(() => ({ pricePerGram: 85, source: 'fallback' })),
        storage.getUserNotifications(userId).catch(() => []),
        storage.getUserTradeCases(userId).catch(() => [])
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
      const cryptoTransactions = (cryptoPayments || [])
        .filter((cp: any) => cp.status !== 'Approved')
        .map((cp: any) => ({
          id: cp.id,
          type: 'Deposit',
          status: cp.status === 'Approved' ? 'Completed' : cp.status,
          amountUsd: cp.amountUsd,
          amountGold: cp.goldGrams,
          createdAt: cp.createdAt,
          description: `Crypto Deposit - ${cp.status}`,
          sourceModule: 'FinaPay',
        }));

      // Combine and sort transactions (limit to 20 for dashboard)
      const allTransactions = [...(transactions || []), ...depositTransactions, ...cryptoTransactions]
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
      const totalPortfolioUsd = vaultGoldValueUsd + (walletGoldGrams * goldPrice) + walletUsdBalance;
      
      // Calculate pending deposits (bank transfers + crypto) as USD
      const pendingDepositUsd = (depositRequests || [])
        .filter((d: any) => d.status === 'Pending')
        .reduce((sum: number, d: any) => sum + parseFloat(d.amountUsd || '0'), 0)
        + (cryptoPayments || [])
          .filter((c: any) => c.status === 'Pending')
          .reduce((sum: number, c: any) => sum + parseFloat(c.amountUsd || '0'), 0);
      
      // Convert pending USD to gold grams
      const pendingGoldGrams = pendingDepositUsd / goldPrice;

      const loadTime = Date.now() - startTime;
      console.log(`[Dashboard] Loaded for user ${userId} in ${loadTime}ms`);

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
        totals: {
          vaultGoldGrams,
          vaultGoldValueUsd,
          vaultGoldValueAed,
          walletGoldGrams,
          walletUsdBalance,
          totalPortfolioUsd,
          bnslLockedGrams,
          bnslTotalProfit,
          activeBnslPlans: activeBnslPlans.length,
          pendingGoldGrams,
          pendingDepositUsd
        },
        _meta: { loadTimeMs: loadTime }
      });
    } catch (error) {
      console.error('[Dashboard] Error:', error);
      res.status(500).json({ message: "Failed to load dashboard data" });
    }
  });
  
  // ============================================================================
  // AUTHENTICATION & USER MANAGEMENT
  // ============================================================================
  
  // Register new user
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
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
        goldGrams: "0",
        usdBalance: "0",
        eurBalance: "0",
      });
      
      // Create audit log
      await storage.createAuditLog({
        entityType: "user",
        entityId: user.id,
        actionType: "create",
        actor: user.id,
        actorRole: "user",
        details: "User registered - pending email verification",
      });
      
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
  
  // Verify email with code
  app.post("/api/auth/verify-email", async (req, res) => {
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
  const mfaChallenges = new Map<string, { userId: string; expiresAt: Date; attempts: number }>();
  
  // Clean up expired challenges periodically
  setInterval(() => {
    const now = new Date();
    Array.from(mfaChallenges.entries()).forEach(([token, challenge]) => {
      if (challenge.expiresAt < now) {
        mfaChallenges.delete(token);
      }
    });
  }, 60000); // Clean every minute

  // Login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Check if password is hashed (starts with $2) or plain text (for demo/admin users)
      let isValidPassword = false;
      if (user.password.startsWith('$2')) {
        isValidPassword = await bcrypt.compare(password, user.password);
      } else {
        // Legacy plain text comparison for existing demo/admin users
        isValidPassword = user.password === password;
      }
      
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Check if MFA is enabled
      if (user.mfaEnabled) {
        // Generate a challenge token for MFA verification
        const challengeToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
        
        // Store challenge with 5 minute expiry and attempt counter
        mfaChallenges.set(challengeToken, {
          userId: user.id,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          attempts: 0
        });
        
        return res.json({ 
          requiresMfa: true, 
          challengeToken,
          mfaMethod: user.mfaMethod,
          message: "MFA verification required" 
        });
      }
      
      // Record login timestamp for session tracking
      const updatedUser = await storage.updateUser(user.id, {
        lastLoginAt: new Date(),
      });
      
      res.json({ user: sanitizeUser(updatedUser || user) });
    } catch (error) {
      res.status(400).json({ message: "Login failed" });
    }
  });
  
  // Get current user
  app.get("/api/auth/me/:userId", async (req, res) => {
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
  
  // Update user profile
  app.patch("/api/users/:userId", async (req, res) => {
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
  
  // Delete user account
  app.delete("/api/users/:userId", async (req, res) => {
    try {
      const { password } = req.body;
      const userId = req.params.userId;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Verify password before deletion
      let isValidPassword = false;
      if (user.password.startsWith('$2')) {
        isValidPassword = await bcrypt.compare(password, user.password);
      } else {
        isValidPassword = user.password === password;
      }
      
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
      
      res.json({ message: "Account deleted successfully" });
    } catch (error) {
      console.error("Account deletion error:", error);
      res.status(500).json({ message: "Failed to delete account" });
    }
  });
  
  // ============================================================================
  // PASSWORD RESET
  // ============================================================================
  
  // Request password reset
  app.post("/api/auth/forgot-password", async (req, res) => {
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
      
      // Generate a secure token
      const token = Math.random().toString(36).substring(2) + Date.now().toString(36) + Math.random().toString(36).substring(2);
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
  
  // Reset password with token
  app.post("/api/auth/reset-password", async (req, res) => {
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
  app.post("/api/mfa/setup", async (req, res) => {
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
  app.post("/api/mfa/enable", async (req, res) => {
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
      
      // Generate backup codes
      const backupCodes = Array.from({ length: 8 }, () => 
        Math.random().toString(36).substring(2, 8).toUpperCase()
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
        // Delete challenge after successful verification
        mfaChallenges.delete(challengeToken);
        return res.json({ success: true, user: sanitizeUser(user) });
      }
      
      // Try backup codes
      if (user.mfaBackupCodes) {
        const backupCodes: string[] = JSON.parse(user.mfaBackupCodes);
        
        for (let i = 0; i < backupCodes.length; i++) {
          const isBackupValid = await bcrypt.compare(token.toUpperCase(), backupCodes[i]);
          if (isBackupValid) {
            // Remove used backup code
            backupCodes.splice(i, 1);
            await storage.updateUser(challenge.userId, { 
              mfaBackupCodes: JSON.stringify(backupCodes) 
            });
            
            // Delete challenge after successful verification
            mfaChallenges.delete(challengeToken);
            
            return res.json({ 
              success: true, 
              user: sanitizeUser(user),
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
  app.post("/api/mfa/disable", async (req, res) => {
    try {
      const { userId, password } = req.body;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Verify password before disabling MFA
      let isValidPassword = false;
      if (user.password.startsWith('$2')) {
        isValidPassword = await bcrypt.compare(password, user.password);
      } else {
        isValidPassword = user.password === password;
      }
      
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
  app.get("/api/mfa/status/:userId", async (req, res) => {
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
  app.post("/api/biometric/enable", async (req, res) => {
    try {
      const { userId, deviceId, password } = req.body;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Verify password before enabling biometric
      let isValidPassword = false;
      if (user.password.startsWith('$2')) {
        isValidPassword = await bcrypt.compare(password, user.password);
      } else {
        isValidPassword = user.password === password;
      }
      
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
  app.post("/api/biometric/disable", async (req, res) => {
    try {
      const { userId, password } = req.body;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Verify password before disabling biometric
      let isValidPassword = false;
      if (user.password.startsWith('$2')) {
        isValidPassword = await bcrypt.compare(password, user.password);
      } else {
        isValidPassword = user.password === password;
      }
      
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
  app.get("/api/biometric/status/:userId", async (req, res) => {
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
  
  // Admin Dashboard Stats
  app.get("/api/admin/stats", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const kycSubmissions = await storage.getAllKycSubmissions();
      const allTransactions = await storage.getAllTransactions();
      const allDepositRequests = await storage.getAllDepositRequests();
      
      // Total users count
      const totalUsers = users.length;
      
      // Pending KYC count from submissions table
      const pendingKycCount = kycSubmissions.filter(k => 
        k.status === 'In Progress'
      ).length;
      
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
      
      // USD to AED conversion rate
      const USD_TO_AED = 3.67;
      const totalVolumeAed = totalVolume * USD_TO_AED;
      const revenueAed = revenue * USD_TO_AED;
      
      res.json({
        totalUsers,
        pendingKycCount,
        totalVolume,
        totalVolumeAed,
        revenue,
        revenueAed,
        pendingKycRequests,
        pendingDeposits,
        pendingWithdrawals,
        pendingTransactions
      });
    } catch (error) {
      console.error("Failed to get admin stats:", error);
      res.status(400).json({ message: "Failed to get admin stats" });
    }
  });

  // Get all users (Admin)
  app.get("/api/admin/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json({ users: users.map(sanitizeUser) });
    } catch (error) {
      res.status(400).json({ message: "Failed to get users" });
    }
  });
  
  // Get single user details with wallet and transactions (Admin)
  app.get("/api/admin/users/:userId", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get wallet
      const wallet = await storage.getWallet(user.id);
      
      // Get transactions
      const transactions = await storage.getUserTransactions(user.id);
      
      // Get KYC submission
      const kycSubmission = await storage.getKycSubmission(user.id);
      
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
  app.post("/api/admin/users/:userId/verify-email", async (req, res) => {
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
  app.post("/api/admin/users/:userId/suspend", async (req, res) => {
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
  app.post("/api/admin/users/:userId/activate", async (req, res) => {
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
  app.get("/api/admin/employees", async (req, res) => {
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
  app.get("/api/admin/employees/:id", async (req, res) => {
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
  
  // Create new employee
  app.post("/api/admin/employees", async (req, res) => {
    try {
      const { userId, role, department, jobTitle, permissions, createdBy } = req.body;
      
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
        createdBy
      });
      
      // Create audit log
      await storage.createAuditLog({
        entityType: "employee",
        entityId: employee.id,
        actionType: "create",
        actor: createdBy || "admin",
        actorRole: "admin",
        details: `Employee ${employeeId} created with role ${role}`,
      });
      
      res.json({ employee });
    } catch (error) {
      console.error("Failed to create employee:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create employee" });
    }
  });
  
  // Update employee
  app.patch("/api/admin/employees/:id", async (req, res) => {
    try {
      const { role, department, jobTitle, status, permissions, updatedBy } = req.body;
      
      const existingEmployee = await storage.getEmployee(req.params.id);
      if (!existingEmployee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      const updates: any = {};
      if (role !== undefined) updates.role = role;
      if (department !== undefined) updates.department = department;
      if (jobTitle !== undefined) updates.jobTitle = jobTitle;
      if (status !== undefined) updates.status = status;
      if (permissions !== undefined) updates.permissions = permissions;
      
      const employee = await storage.updateEmployee(req.params.id, updates);
      
      // Create audit log
      await storage.createAuditLog({
        entityType: "employee",
        entityId: req.params.id,
        actionType: "update",
        actor: updatedBy || "admin",
        actorRole: "admin",
        details: `Employee ${existingEmployee.employeeId} updated`,
      });
      
      res.json({ employee });
    } catch (error) {
      res.status(400).json({ message: "Failed to update employee" });
    }
  });
  
  // Deactivate employee (soft delete)
  app.post("/api/admin/employees/:id/deactivate", async (req, res) => {
    try {
      const { adminId, reason } = req.body;
      
      const existingEmployee = await storage.getEmployee(req.params.id);
      if (!existingEmployee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      const employee = await storage.updateEmployee(req.params.id, { status: 'inactive' });
      
      // If employee has a user account, update their role back to user
      if (existingEmployee.userId) {
        await storage.updateUser(existingEmployee.userId, { role: 'user' });
      }
      
      // Create audit log
      await storage.createAuditLog({
        entityType: "employee",
        entityId: req.params.id,
        actionType: "update",
        actor: adminId || "admin",
        actorRole: "admin",
        details: `Employee ${existingEmployee.employeeId} deactivated. Reason: ${reason || 'Not specified'}`,
      });
      
      res.json({ message: "Employee deactivated", employee });
    } catch (error) {
      res.status(400).json({ message: "Failed to deactivate employee" });
    }
  });
  
  // Reactivate employee
  app.post("/api/admin/employees/:id/activate", async (req, res) => {
    try {
      const { adminId } = req.body;
      
      const existingEmployee = await storage.getEmployee(req.params.id);
      if (!existingEmployee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      const employee = await storage.updateEmployee(req.params.id, { status: 'active' });
      
      // If employee has a user account, update their role to admin
      if (existingEmployee.userId) {
        await storage.updateUser(existingEmployee.userId, { role: 'admin' });
      }
      
      // Create audit log
      await storage.createAuditLog({
        entityType: "employee",
        entityId: req.params.id,
        actionType: "update",
        actor: adminId || "admin",
        actorRole: "admin",
        details: `Employee ${existingEmployee.employeeId} activated`,
      });
      
      res.json({ message: "Employee activated", employee });
    } catch (error) {
      res.status(400).json({ message: "Failed to activate employee" });
    }
  });
  
  // Get role permissions
  app.get("/api/admin/role-permissions", async (req, res) => {
    try {
      const permissions = await storage.getAllRolePermissions();
      res.json({ permissions });
    } catch (error) {
      res.status(400).json({ message: "Failed to get role permissions" });
    }
  });
  
  // Update role permissions
  app.patch("/api/admin/role-permissions/:role", async (req, res) => {
    try {
      const { permissions, updatedBy } = req.body;
      const role = req.params.role;
      
      // Check if role permission exists
      let rolePermission = await storage.getRolePermission(role);
      
      if (rolePermission) {
        rolePermission = await storage.updateRolePermission(rolePermission.id, { permissions, updatedBy });
      } else {
        rolePermission = await storage.createRolePermission({
          role: role as any,
          permissions,
          updatedBy
        });
      }
      
      // Create audit log
      await storage.createAuditLog({
        entityType: "role_permission",
        entityId: rolePermission?.id || role,
        actionType: "update",
        actor: updatedBy || "admin",
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
  // KYC MANAGEMENT
  // ============================================================================
  
  // Submit KYC
  app.post("/api/kyc", async (req, res) => {
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
  
  // Get user's KYC submission
  app.get("/api/kyc/:userId", async (req, res) => {
    try {
      const submission = await storage.getKycSubmission(req.params.userId);
      res.json({ submission });
    } catch (error) {
      res.status(400).json({ message: "Failed to get KYC submission" });
    }
  });
  
  // Update KYC status (Admin) - handles both kycAml and Finatrades personal KYC
  app.patch("/api/kyc/:id", async (req, res) => {
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
  
  // Get all KYC submissions (Admin)
  app.get("/api/admin/kyc", async (req, res) => {
    try {
      const kycAmlSubmissions = await storage.getAllKycSubmissions();
      const finatradesPersonalSubmissions = await storage.getAllFinatradesPersonalKyc();
      const finatradesCorporateSubmissions = await storage.getAllFinatradesCorporateKyc();
      
      // Normalize Finatrades personal KYC submissions to match kycAml format for admin display
      const normalizedFinatradesPersonal = finatradesPersonalSubmissions.map(s => ({
        ...s,
        tier: 'finatrades_personal',
        kycType: 'finatrades_personal',
        accountType: 'personal',
        documents: s.idFrontUrl || s.idBackUrl || s.passportUrl || s.addressProofUrl ? {
          idFront: s.idFrontUrl,
          idBack: s.idBackUrl,
          passport: s.passportUrl,
          addressProof: s.addressProofUrl,
        } : null,
      }));
      
      // Normalize Finatrades corporate KYC submissions - include user details for Applicant Details display
      const normalizedFinatradesCorporate = await Promise.all(finatradesCorporateSubmissions.map(async (s) => {
        // Fetch user data to get personal details (fullName, country, nationality)
        const user = await storage.getUser(s.userId);
        // Also check if there's a personal KYC with details
        const personalKyc = finatradesPersonalSubmissions.find(p => p.userId === s.userId);
        
        return {
          ...s,
          tier: 'finatrades_corporate',
          kycType: 'finatrades_corporate',
          accountType: 'business',
          // Include user's personal details for Applicant Details section
          fullName: personalKyc?.fullName || (user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : null),
          country: personalKyc?.country || user?.country || s.countryOfIncorporation,
          nationality: personalKyc?.nationality || user?.nationality,
        };
      }));
      
      // Combine and sort by creation date
      const allSubmissions = [
        ...kycAmlSubmissions.map(s => ({ ...s, kycType: 'kycAml' })),
        ...normalizedFinatradesPersonal,
        ...normalizedFinatradesCorporate,
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      res.json({ submissions: allSubmissions });
    } catch (error) {
      res.status(400).json({ message: "Failed to get KYC submissions" });
    }
  });

  // ============================================================================
  // KYC WORKFLOW - TIERED VERIFICATION & STATE MACHINE
  // ============================================================================

  // Submit tiered KYC with SLA tracking
  app.post("/api/kyc/submit-tiered", async (req, res) => {
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
      
      res.json({ submission, slaDeadline });
    } catch (error) {
      console.error("Tiered KYC submission error:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "KYC submission failed" });
    }
  });

  // Escalate KYC submission (Admin)
  app.post("/api/admin/kyc/:id/escalate", async (req, res) => {
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
  app.post("/api/admin/kyc/:id/screen", async (req, res) => {
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
  app.get("/api/admin/kyc/sla-alerts", async (req, res) => {
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
  app.get("/api/risk-profile/:userId", async (req, res) => {
    try {
      const profile = await storage.getOrCreateUserRiskProfile(req.params.userId);
      res.json({ profile });
    } catch (error) {
      res.status(400).json({ message: "Failed to get risk profile" });
    }
  });

  // Get all risk profiles (Admin)
  app.get("/api/admin/risk-profiles", async (req, res) => {
    try {
      const profiles = await storage.getAllUserRiskProfiles();
      res.json({ profiles });
    } catch (error) {
      res.status(400).json({ message: "Failed to get risk profiles" });
    }
  });

  // Get high-risk profiles (Admin)
  app.get("/api/admin/risk-profiles/high-risk", async (req, res) => {
    try {
      const profiles = await storage.getHighRiskProfiles();
      res.json({ profiles });
    } catch (error) {
      res.status(400).json({ message: "Failed to get high-risk profiles" });
    }
  });

  // Update user risk profile (Admin)
  app.patch("/api/admin/risk-profile/:id", async (req, res) => {
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
  app.get("/api/screening-logs/:userId", async (req, res) => {
    try {
      const logs = await storage.getUserAmlScreeningLogs(req.params.userId);
      res.json({ logs });
    } catch (error) {
      res.status(400).json({ message: "Failed to get screening logs" });
    }
  });

  // Get all screening logs (Admin)
  app.get("/api/admin/screening-logs", async (req, res) => {
    try {
      const logs = await storage.getAllAmlScreeningLogs();
      res.json({ logs });
    } catch (error) {
      res.status(400).json({ message: "Failed to get screening logs" });
    }
  });

  // Review screening log (Admin)
  app.patch("/api/admin/screening-logs/:id", async (req, res) => {
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
  app.get("/api/admin/aml-cases", async (req, res) => {
    try {
      const cases = await storage.getAllAmlCases();
      res.json({ cases });
    } catch (error) {
      res.status(400).json({ message: "Failed to get AML cases" });
    }
  });

  // Get open AML cases (Admin)
  app.get("/api/admin/aml-cases/open", async (req, res) => {
    try {
      const cases = await storage.getOpenAmlCases();
      res.json({ cases });
    } catch (error) {
      res.status(400).json({ message: "Failed to get open AML cases" });
    }
  });

  // Get single AML case with activities (Admin)
  app.get("/api/admin/aml-cases/:id", async (req, res) => {
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
  app.post("/api/admin/aml-cases", async (req, res) => {
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
  app.patch("/api/admin/aml-cases/:id", async (req, res) => {
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
  app.post("/api/admin/aml-cases/:id/notes", async (req, res) => {
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
  app.get("/api/admin/aml-rules", async (req, res) => {
    try {
      const rules = await storage.getAllAmlMonitoringRules();
      res.json({ rules });
    } catch (error) {
      res.status(400).json({ message: "Failed to get AML rules" });
    }
  });

  // Get active monitoring rules (Admin)
  app.get("/api/admin/aml-rules/active", async (req, res) => {
    try {
      const rules = await storage.getActiveAmlMonitoringRules();
      res.json({ rules });
    } catch (error) {
      res.status(400).json({ message: "Failed to get active AML rules" });
    }
  });

  // Create monitoring rule (Admin)
  app.post("/api/admin/aml-rules", async (req, res) => {
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
  app.patch("/api/admin/aml-rules/:id", async (req, res) => {
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
  app.delete("/api/admin/aml-rules/:id", async (req, res) => {
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
  
  // Get user wallet
  app.get("/api/wallet/:userId", async (req, res) => {
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
  
  // Update wallet
  app.patch("/api/wallet/:id", async (req, res) => {
    try {
      const wallet = await storage.updateWallet(req.params.id, req.body);
      if (!wallet) {
        return res.status(404).json({ message: "Wallet not found" });
      }
      res.json({ wallet });
    } catch (error) {
      res.status(400).json({ message: "Failed to update wallet" });
    }
  });
  
  // Create transaction - all transactions start as Pending and require admin approval
  app.post("/api/transactions", async (req, res) => {
    try {
      const transactionData = insertTransactionSchema.parse(req.body);
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
  
  // Get user transactions
  app.get("/api/transactions/:userId", async (req, res) => {
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
  
  // Get unified transactions with advanced filtering
  app.get("/api/unified-transactions/:userId", async (req, res) => {
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
        tradeCases
      ] = await Promise.all([
        storage.getUserTransactions(userId),
        storage.getUserDepositRequests(userId),
        storage.getUserCryptoPaymentRequests(userId),
        storage.getUserBnslPlans(userId),
        storage.getUserBnslPayouts(userId),
        storage.getPeerTransfers(userId),
        storage.getUserVaultDepositRequests(userId),
        storage.getUserVaultWithdrawalRequests(userId),
        storage.getUserTradeCases(userId)
      ]);
      
      // Normalize all transactions to unified format
      let unifiedTransactions: any[] = [];
      
      // Regular transactions (FinaPay)
      regularTransactions.forEach(tx => {
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
      
      // Crypto payments (exclude approved - they already have a transaction record)
      cryptoPayments
        .filter(cp => cp.status !== 'Approved')
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
      
      // P2P transfers
      peerTransfers.forEach(transfer => {
        const isSender = transfer.senderUserId === userId;
        unifiedTransactions.push({
          id: transfer.id,
          userId: userId,
          module: 'finapay',
          actionType: isSender ? 'SEND' : 'RECEIVE',
          grams: transfer.goldGrams,
          usd: transfer.amountUsd,
          usdPerGram: transfer.goldPriceUsdPerGram,
          status: transfer.status === 'Completed' ? 'COMPLETED' : transfer.status === 'Failed' ? 'FAILED' : 'PENDING',
          referenceId: transfer.referenceNumber,
          description: transfer.description || (isSender ? `Sent to ${transfer.recipientEmail}` : `Received from ${transfer.senderEmail}`),
          counterpartyUserId: isSender ? transfer.recipientUserId : transfer.senderUserId,
          createdAt: transfer.createdAt,
          completedAt: transfer.completedAt,
          sourceType: 'peer_transfer'
        });
      });
      
      // Vault deposits
      vaultDepositReqs.forEach(dep => {
        unifiedTransactions.push({
          id: dep.id,
          userId: dep.userId,
          module: 'finavault',
          actionType: 'ADD_FUNDS',
          grams: dep.goldGrams,
          usd: null,
          usdPerGram: null,
          status: dep.status === 'Stored' || dep.status === 'Approved' ? 'COMPLETED' : dep.status === 'Rejected' ? 'FAILED' : 'PENDING',
          referenceId: dep.referenceNumber,
          description: 'Vault Deposit',
          counterpartyUserId: null,
          createdAt: dep.createdAt,
          completedAt: dep.processedAt,
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
  app.get("/api/admin/unified-transactions", async (req, res) => {
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
      
      allPeerTransfers.forEach(transfer => {
        const sender = userMap.get(transfer.senderUserId);
        const recipient = userMap.get(transfer.recipientUserId || '');
        unifiedTransactions.push({
          id: transfer.id,
          userId: transfer.senderUserId,
          userName: sender ? `${sender.firstName} ${sender.lastName}` : 'Unknown',
          userEmail: sender?.email || 'Unknown',
          recipientName: recipient ? `${recipient.firstName} ${recipient.lastName}` : transfer.recipientEmail,
          module: 'finapay',
          actionType: 'SEND',
          grams: transfer.goldGrams,
          usd: transfer.amountUsd,
          usdPerGram: transfer.goldPriceUsdPerGram,
          status: transfer.status === 'Completed' ? 'COMPLETED' : transfer.status === 'Failed' ? 'FAILED' : 'PENDING',
          referenceId: transfer.referenceNumber,
          description: transfer.description || `Transfer to ${transfer.recipientEmail}`,
          createdAt: transfer.createdAt,
          completedAt: transfer.completedAt,
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
  app.patch("/api/transactions/:id", async (req, res) => {
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
  app.post("/api/admin/transactions/:id/approve", async (req, res) => {
    try {
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
  app.post("/api/admin/transactions/:id/reject", async (req, res) => {
    try {
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
        details: `Transaction rejected - Type: ${transaction.type}, Reason: ${req.body.reason || 'Not specified'}`,
      });
      
      res.json({ transaction: updatedTransaction, message: 'Transaction rejected' });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Rejection failed" });
    }
  });
  
  // Admin: Get all transactions with user info
  app.get("/api/admin/transactions", async (req, res) => {
    try {
      const transactions = await storage.getAllTransactions();
      // Enrich transactions with user info
      const enrichedTransactions = await Promise.all(
        transactions.map(async (tx) => {
          const user = await storage.getUser(tx.userId);
          return {
            ...tx,
            userName: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
            userEmail: user?.email || 'Unknown',
            finatradesId: `FT-${tx.userId.slice(0, 8).toUpperCase()}`
          };
        })
      );
      res.json({ transactions: enrichedTransactions });
    } catch (error) {
      res.status(400).json({ message: "Failed to get all transactions" });
    }
  });
  
  // ============================================================================
  // FINAVAULT - GOLD STORAGE
  // ============================================================================
  
  // Get user vault ownership summary (central ledger view)
  app.get("/api/vault/ownership/:userId", async (req, res) => {
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

  // Get user vault ledger history
  app.get("/api/vault/ledger/:userId", async (req, res) => {
    try {
      const { vaultLedgerService } = await import('./vault-ledger-service');
      const limit = parseInt(req.query.limit as string) || 50;
      const entries = await vaultLedgerService.getLedgerHistory(req.params.userId, limit);
      res.json({ entries });
    } catch (error) {
      res.status(400).json({ message: "Failed to get ledger history" });
    }
  });
  
  // Get user vault holdings
  app.get("/api/vault/:userId", async (req, res) => {
    try {
      const holdings = await storage.getUserVaultHoldings(req.params.userId);
      res.json({ holdings });
    } catch (error) {
      res.status(400).json({ message: "Failed to get vault holdings" });
    }
  });
  
  // Get vault activity (transactions related to vault operations)
  app.get("/api/vault/activity/:userId", async (req, res) => {
    try {
      const userId = req.params.userId;
      
      // Get all transactions for this user
      const allTransactions = await storage.getUserTransactions(userId);
      
      // Filter to vault-relevant transaction types
      const vaultTypes = ['Buy', 'Sell', 'Send', 'Receive', 'Deposit', 'Withdrawal'];
      const vaultTransactions = allTransactions.filter(tx => vaultTypes.includes(tx.type));
      
      // Get vault deposit and withdrawal requests
      const vaultDepositReqs = await storage.getUserVaultDepositRequests(userId);
      const vaultWithdrawalReqs = await storage.getUserVaultWithdrawalRequests(userId);
      
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
      const vaultDepositTxs = vaultDepositReqs.map(dep => ({
        id: dep.id,
        userId: dep.userId,
        type: 'Vault Deposit' as const,
        status: dep.status === 'Stored' || dep.status === 'Approved' ? 'Completed' : dep.status === 'Rejected' ? 'Cancelled' : 'Pending',
        amountGold: dep.verifiedWeightGrams || dep.totalDeclaredWeightGrams,
        amountUsd: null,
        goldPriceUsdPerGram: null,
        recipientEmail: null,
        senderEmail: null,
        description: `Physical Gold Deposit - ${dep.vaultLocation}`,
        referenceId: dep.referenceNumber,
        createdAt: dep.createdAt,
        completedAt: dep.storedAt || dep.reviewedAt,
        certificates: []
      }));
      
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
  
  // Get user certificates
  app.get("/api/certificates/:userId", async (req, res) => {
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
  
  // Create vault holding
  app.post("/api/vault", async (req, res) => {
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
  app.patch("/api/vault/:id", async (req, res) => {
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
  app.get("/api/admin/vault", async (req, res) => {
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
  app.get("/api/vault/deposits/:userId", async (req, res) => {
    try {
      const requests = await storage.getUserVaultDepositRequests(req.params.userId);
      res.json({ requests });
    } catch (error) {
      res.status(400).json({ message: "Failed to get deposit requests" });
    }
  });

  // Get single deposit request
  app.get("/api/vault/deposit/:id", async (req, res) => {
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
  app.post("/api/vault/deposit", async (req, res) => {
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
  app.get("/api/admin/vault/deposits", async (req, res) => {
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
  app.get("/api/admin/vault/deposits/pending", async (req, res) => {
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
  app.patch("/api/admin/vault/deposit/:id", async (req, res) => {
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

        // Generate certificate
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
        }

        updates.vaultHoldingId = holding.id;
        updates.certificateId = certificate.id;
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
  app.get("/api/vault/withdrawals/:userId", async (req, res) => {
    try {
      const requests = await storage.getUserVaultWithdrawalRequests(req.params.userId);
      res.json({ requests });
    } catch (error) {
      res.status(400).json({ message: "Failed to get withdrawal requests" });
    }
  });

  // Get single withdrawal request
  app.get("/api/vault/withdrawal/:id", async (req, res) => {
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
  app.post("/api/vault/withdrawal", async (req, res) => {
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
  app.get("/api/admin/vault/withdrawals", async (req, res) => {
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
  app.get("/api/admin/vault/withdrawals/pending", async (req, res) => {
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
  app.patch("/api/admin/vault/withdrawal/:id", async (req, res) => {
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

      res.json({ request: updatedRequest });
    } catch (error) {
      console.error('Update withdrawal request error:', error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to update withdrawal request" });
    }
  });
  
  // ============================================================================
  // BNSL - BUY NOW SELL LATER
  // ============================================================================
  
  // Get user BNSL plans
  app.get("/api/bnsl/plans/:userId", async (req, res) => {
    try {
      const plans = await storage.getUserBnslPlans(req.params.userId);
      res.json({ plans });
    } catch (error) {
      res.status(400).json({ message: "Failed to get BNSL plans" });
    }
  });
  
  // Get all BNSL plans (Admin)
  app.get("/api/admin/bnsl/plans", async (req, res) => {
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

  // Get BNSL wallet for user
  app.get("/api/bnsl/wallet/:userId", async (req, res) => {
    try {
      const wallet = await storage.getOrCreateBnslWallet(req.params.userId);
      res.json({ wallet });
    } catch (error) {
      res.status(400).json({ message: "Failed to get BNSL wallet" });
    }
  });

  // Transfer gold from FinaPay wallet to BNSL wallet
  app.post("/api/bnsl/wallet/transfer", async (req, res) => {
    try {
      const { userId, goldGrams } = req.body;
      
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
      
      // Credit to BNSL wallet
      const bnslWallet = await storage.getOrCreateBnslWallet(userId);
      const newAvailable = parseFloat(bnslWallet.availableGoldGrams) + amountGrams;
      await storage.updateBnslWallet(bnslWallet.id, {
        availableGoldGrams: newAvailable.toFixed(6)
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
  
  // ============================================================================
  // BNSL PLAN TEMPLATES - ADMIN MANAGEMENT
  // ============================================================================
  
  // Get all templates (Admin)
  app.get("/api/admin/bnsl/templates", async (req, res) => {
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
  app.post("/api/admin/bnsl/templates", async (req, res) => {
    try {
      const template = await storage.createBnslPlanTemplate(req.body);
      res.json({ template });
    } catch (error) {
      console.error('Create template error:', error);
      res.status(400).json({ message: "Failed to create BNSL template" });
    }
  });
  
  // Update template (Admin)
  app.put("/api/admin/bnsl/templates/:id", async (req, res) => {
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
  app.delete("/api/admin/bnsl/templates/:id", async (req, res) => {
    try {
      await storage.deleteBnslPlanTemplate(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Delete template error:', error);
      res.status(400).json({ message: "Failed to delete BNSL template" });
    }
  });
  
  // Create variant (Admin)
  app.post("/api/admin/bnsl/templates/:templateId/variants", async (req, res) => {
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
  app.put("/api/admin/bnsl/variants/:id", async (req, res) => {
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
  app.delete("/api/admin/bnsl/variants/:id", async (req, res) => {
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
  app.get("/api/admin/fees", async (req, res) => {
    try {
      const fees = await storage.getAllPlatformFees();
      res.json({ fees });
    } catch (error) {
      console.error('Get fees error:', error);
      res.status(400).json({ message: "Failed to get platform fees" });
    }
  });
  
  // Get fees by module (Admin)
  app.get("/api/admin/fees/module/:module", async (req, res) => {
    try {
      const fees = await storage.getModuleFees(req.params.module);
      res.json({ fees });
    } catch (error) {
      console.error('Get module fees error:', error);
      res.status(400).json({ message: "Failed to get module fees" });
    }
  });
  
  // Create platform fee (Admin)
  app.post("/api/admin/fees", async (req, res) => {
    try {
      const fee = await storage.createPlatformFee(req.body);
      res.json({ fee });
    } catch (error) {
      console.error('Create fee error:', error);
      res.status(400).json({ message: "Failed to create platform fee" });
    }
  });
  
  // Update platform fee (Admin)
  app.put("/api/admin/fees/:id", async (req, res) => {
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
  app.delete("/api/admin/fees/:id", async (req, res) => {
    try {
      await storage.deletePlatformFee(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Delete fee error:', error);
      res.status(400).json({ message: "Failed to delete platform fee" });
    }
  });
  
  // Seed default fees (Admin)
  app.post("/api/admin/fees/seed", async (req, res) => {
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
  app.post("/api/bnsl/plans", async (req, res) => {
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
      
      res.json({ plan });
    } catch (error) {
      console.error('BNSL plan creation error:', error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create BNSL plan" });
    }
  });
  
  // Update BNSL plan
  app.patch("/api/bnsl/plans/:id", async (req, res) => {
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
  app.get("/api/bnsl/payouts/:planId", async (req, res) => {
    try {
      const payouts = await storage.getPlanPayouts(req.params.planId);
      res.json({ payouts });
    } catch (error) {
      res.status(400).json({ message: "Failed to get payouts" });
    }
  });
  
  // Create payout
  app.post("/api/bnsl/payouts", async (req, res) => {
    try {
      const payoutData = insertBnslPayoutSchema.parse(req.body);
      const payout = await storage.createBnslPayout(payoutData);
      res.json({ payout });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create payout" });
    }
  });
  
  // Update payout
  app.patch("/api/bnsl/payouts/:id", async (req, res) => {
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
  
  // Create early termination
  app.post("/api/bnsl/early-termination", async (req, res) => {
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
  app.get("/api/admin/bnsl/agreements", async (req, res) => {
    try {
      const agreements = await storage.getAllBnslAgreements();
      res.json({ agreements });
    } catch (error) {
      res.status(400).json({ message: "Failed to get agreements" });
    }
  });
  
  // Get agreement by plan ID
  app.get("/api/bnsl/agreements/plan/:planId", async (req, res) => {
    try {
      const agreement = await storage.getBnslAgreementByPlanId(req.params.planId);
      res.json({ agreement: agreement || null });
    } catch (error) {
      res.status(400).json({ message: "Failed to get agreement" });
    }
  });
  
  // Get user agreements
  app.get("/api/bnsl/agreements/user/:userId", async (req, res) => {
    try {
      const agreements = await storage.getUserBnslAgreements(req.params.userId);
      res.json({ agreements });
    } catch (error) {
      res.status(400).json({ message: "Failed to get user agreements" });
    }
  });
  
  // Create BNSL agreement
  app.post("/api/bnsl/agreements", async (req, res) => {
    try {
      const agreementData = insertBnslAgreementSchema.parse(req.body);
      const agreement = await storage.createBnslAgreement(agreementData);
      res.json({ agreement });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create agreement" });
    }
  });
  
  // Update BNSL agreement (for email sent status)
  app.patch("/api/bnsl/agreements/:id", async (req, res) => {
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
  app.post("/api/bnsl/agreements/:id/send-email", async (req, res) => {
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
  app.get("/api/bnsl/agreements/:id/download", async (req, res) => {
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
  // FINAPAY - BANK ACCOUNTS & DEPOSIT/WITHDRAWAL REQUESTS
  // ============================================================================
  
  // Get all platform bank accounts (Admin)
  app.get("/api/admin/bank-accounts", async (req, res) => {
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
  
  // Create platform bank account (Admin)
  app.post("/api/admin/bank-accounts", async (req, res) => {
    try {
      const accountData = insertPlatformBankAccountSchema.parse(req.body);
      const account = await storage.createPlatformBankAccount(accountData);
      res.json({ account });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create bank account" });
    }
  });
  
  // Update platform bank account (Admin)
  app.patch("/api/admin/bank-accounts/:id", async (req, res) => {
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
  
  // Delete platform bank account (Admin)
  app.delete("/api/admin/bank-accounts/:id", async (req, res) => {
    try {
      await storage.deletePlatformBankAccount(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ message: "Failed to delete bank account" });
    }
  });
  
  // Get user deposit requests
  app.get("/api/deposit-requests/:userId", async (req, res) => {
    try {
      const requests = await storage.getUserDepositRequests(req.params.userId);
      res.json({ requests });
    } catch (error) {
      res.status(400).json({ message: "Failed to get deposit requests" });
    }
  });
  
  // Get all deposit requests (Admin)
  app.get("/api/admin/deposit-requests", async (req, res) => {
    try {
      const requests = await storage.getAllDepositRequests();
      res.json({ requests });
    } catch (error) {
      res.status(400).json({ message: "Failed to get deposit requests" });
    }
  });
  
  // Create deposit request (User)
  app.post("/api/deposit-requests", async (req, res) => {
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
      
      res.json({ request });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create deposit request" });
    }
  });
  
  // Update deposit request (Admin - approve/reject)
  app.patch("/api/admin/deposit-requests/:id", async (req, res) => {
    try {
      const request = await storage.getDepositRequest(req.params.id);
      if (!request) {
        return res.status(404).json({ message: "Deposit request not found" });
      }
      
      const updates = req.body;
      
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
            
            // Create transaction record with gold backing metadata
            const [transaction] = await tx.insert(transactions).values({
              userId: request.userId,
              type: 'Deposit',
              status: 'Completed',
              amountUsd: depositAmountUsd.toString(),
              amountGold: goldGrams.toFixed(6),
              goldPriceUsdPerGram: goldPricePerGram.toFixed(2),
              description: `Deposit confirmed - Ref: ${request.referenceNumber} | Gold backing: ${goldGrams.toFixed(4)}g @ $${goldPricePerGram.toFixed(2)}/g`,
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
            
            // Create Digital Ownership certificate for the deposited gold
            const certNumber = await storage.generateCertificateNumber('Digital Ownership');
            const [createdCert] = await tx.insert(certificates).values({
              certificateNumber: certNumber,
              userId: request.userId,
              transactionId: transaction.id,
              type: 'Digital Ownership',
              status: 'Active',
              goldGrams: goldGrams.toFixed(6),
              goldPriceUsdPerGram: goldPricePerGram.toFixed(2),
              totalValueUsd: depositAmountUsd.toFixed(2),
              issuer: 'Finatrades',
              vaultLocation: 'Dubai - Wingold & Metals DMCC',
              issuedAt: new Date(),
            }).returning();
            
            return { createdCert };
          });
          
          // Send email notification for deposit confirmation with PDF attachments
          const depositUser = await storage.getUser(request.userId);
          
          // Get the most recently created certificate for this user (the one we just created)
          const userCerts = await storage.getUserCertificates(request.userId);
          const freshCert = userCerts
            .filter(c => c.type === 'Digital Ownership')
            .sort((a, b) => new Date(b.issuedAt || 0).getTime() - new Date(a.issuedAt || 0).getTime())[0];
          
          if (depositUser && depositUser.email) {
            // Generate transaction receipt PDF
            const receiptPdf = await generateTransactionReceiptPDF({
              referenceNumber: request.referenceNumber,
              transactionType: 'Deposit',
              amountUsd: depositAmountUsd,
              goldGrams: goldGrams,
              goldPricePerGram: goldPricePerGram,
              userName: `${depositUser.firstName || ''} ${depositUser.lastName || ''}`.trim() || 'Customer',
              userEmail: depositUser.email,
              transactionDate: new Date(),
              status: 'Completed',
              description: `Bank deposit confirmed - Gold backing: ${goldGrams.toFixed(4)}g @ $${goldPricePerGram.toFixed(2)}/g`,
            });
            
            const attachments: Array<{ filename: string; content: Buffer; contentType: string }> = [
              {
                filename: `Transaction_Receipt_${request.referenceNumber}.pdf`,
                content: receiptPdf,
                contentType: 'application/pdf',
              }
            ];
            
            // Generate and add certificate PDF using the freshly created certificate
            if (freshCert) {
              const certPdf = await generateCertificatePDF(freshCert, depositUser);
              attachments.push({
                filename: `Certificate_${freshCert.certificateNumber}.pdf`,
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
                  <p>Your bank deposit has been confirmed and credited to your FinaPay wallet.</p>
                  <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                    <p style="font-size: 28px; font-weight: bold; color: #f97316; margin: 0;">+$${depositAmountUsd.toFixed(2)}</p>
                    <p style="font-size: 18px; font-weight: bold; color: #92400e; margin: 10px 0;">Gold Backing: ${goldGrams.toFixed(4)}g</p>
                    <p style="color: #6b7280; margin: 5px 0;">Price: $${goldPricePerGram.toFixed(2)}/gram</p>
                    <p style="color: #6b7280; margin: 5px 0;">Reference: ${request.referenceNumber}</p>
                  </div>
                  <p>Your gold-backed balance is now available in your FinaPay wallet.</p>
                  <p><strong>Attached Documents:</strong></p>
                  <ul>
                    <li>Transaction Receipt (PDF)</li>
                    ${latestCert ? '<li>Digital Ownership Certificate (PDF)</li>' : ''}
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
  
  // Get user withdrawal requests
  app.get("/api/withdrawal-requests/:userId", async (req, res) => {
    try {
      const requests = await storage.getUserWithdrawalRequests(req.params.userId);
      res.json({ requests });
    } catch (error) {
      res.status(400).json({ message: "Failed to get withdrawal requests" });
    }
  });
  
  // Get all withdrawal requests (Admin)
  app.get("/api/admin/withdrawal-requests", async (req, res) => {
    try {
      const requests = await storage.getAllWithdrawalRequests();
      res.json({ requests });
    } catch (error) {
      res.status(400).json({ message: "Failed to get withdrawal requests" });
    }
  });
  
  // Create withdrawal request (User)
  app.post("/api/withdrawal-requests", async (req, res) => {
    try {
      const { userId, amountUsd, ...bankDetails } = req.body;
      
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
      
      res.json({ request });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create withdrawal request" });
    }
  });
  
  // Update withdrawal request (Admin - process/reject)
  app.patch("/api/admin/withdrawal-requests/:id", async (req, res) => {
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
  
  // Get user trade cases
  app.get("/api/trade/cases/:userId", async (req, res) => {
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
  
  // Create trade case
  app.post("/api/trade/cases", async (req, res) => {
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
      
      res.json({ tradeCase });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create trade case" });
    }
  });
  
  // Update trade case
  app.patch("/api/trade/cases/:id", async (req, res) => {
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
  
  // Get case documents
  app.get("/api/trade/documents/:caseId", async (req, res) => {
    try {
      const documents = await storage.getCaseDocuments(req.params.caseId);
      res.json({ documents });
    } catch (error) {
      res.status(400).json({ message: "Failed to get documents" });
    }
  });
  
  // Upload document
  app.post("/api/trade/documents", async (req, res) => {
    try {
      const documentData = insertTradeDocumentSchema.parse(req.body);
      const document = await storage.createTradeDocument(documentData);
      res.json({ document });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to upload document" });
    }
  });
  
  // Update document status
  app.patch("/api/trade/documents/:id", async (req, res) => {
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
  
  // Record FinaBridge disclaimer acceptance with role selection
  app.post("/api/finabridge/accept-disclaimer/:userId", async (req, res) => {
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
  app.get("/api/finabridge/importer/requests/:userId", async (req, res) => {
    try {
      const requests = await storage.getUserTradeRequests(req.params.userId);
      res.json({ requests });
    } catch (error) {
      res.status(400).json({ message: "Failed to get trade requests" });
    }
  });
  
  // Create new trade request (Importer)
  app.post("/api/finabridge/importer/requests", async (req, res) => {
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
  app.post("/api/finabridge/importer/requests/:id/submit", async (req, res) => {
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
  app.get("/api/finabridge/importer/requests/:id/forwarded-proposals", async (req, res) => {
    try {
      const forwardedList = await storage.getForwardedProposals(req.params.id);
      const proposalIds = forwardedList.map(f => f.proposalId);
      const proposals = await Promise.all(
        proposalIds.map(id => storage.getTradeProposal(id))
      );
      
      // For each proposal, get exporter info but only return finatradesId (privacy)
      const proposalsWithExporter = await Promise.all(
        proposals.filter(Boolean).map(async (proposal) => {
          const exporter = await storage.getUser(proposal!.exporterUserId);
          return {
            ...proposal,
            exporter: exporter ? { finatradesId: exporter.finatradesId } : null,
          };
        })
      );
      
      res.json({ proposals: proposalsWithExporter });
    } catch (error) {
      res.status(400).json({ message: "Failed to get forwarded proposals" });
    }
  });
  
  // Accept a forwarded proposal (creates settlement hold)
  app.post("/api/finabridge/importer/proposals/:proposalId/accept", async (req, res) => {
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
  app.post("/api/finabridge/importer/proposals/:proposalId/decline", async (req, res) => {
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
  app.get("/api/finabridge/exporter/open-requests/:userId", async (req, res) => {
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
  app.get("/api/finabridge/exporter/proposals/:userId", async (req, res) => {
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
  app.get("/api/finabridge/importer/forwarded-proposals/:userId", async (req, res) => {
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
  
  // Submit proposal for a trade request
  app.post("/api/finabridge/exporter/proposals", async (req, res) => {
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
  app.put("/api/finabridge/exporter/proposals/:id", async (req, res) => {
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
  app.get("/api/admin/finabridge/disclaimer-acceptances", async (req, res) => {
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
  app.get("/api/admin/finabridge/requests", async (req, res) => {
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
  app.get("/api/admin/finabridge/requests/:requestId/proposals", async (req, res) => {
    try {
      const proposals = await storage.getRequestProposals(req.params.requestId);
      
      // Include exporter details for admin
      const proposalsWithExporter = await Promise.all(
        proposals.map(async (proposal) => {
          const exporter = await storage.getUser(proposal.exporterUserId);
          return {
            ...proposal,
            exporter: exporter ? {
              id: exporter.id,
              finatradesId: exporter.finatradesId,
              fullName: `${exporter.firstName} ${exporter.lastName}`,
              email: exporter.email,
              companyName: exporter.companyName,
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
  app.post("/api/admin/finabridge/proposals/:id/shortlist", async (req, res) => {
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
  app.post("/api/admin/finabridge/proposals/:id/reject", async (req, res) => {
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
  app.post("/api/admin/finabridge/proposals/:id/request-modification", async (req, res) => {
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
  app.post("/api/admin/finabridge/requests/:requestId/forward-proposals", async (req, res) => {
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
  
  // Get user's FinaBridge wallet
  app.get("/api/finabridge/wallet/:userId", async (req, res) => {
    try {
      const wallet = await storage.getOrCreateFinabridgeWallet(req.params.userId);
      res.json({ wallet });
    } catch (error) {
      res.status(400).json({ message: "Failed to get wallet" });
    }
  });
  
  // Fund FinaBridge wallet (transfer from main wallet)
  app.post("/api/finabridge/wallet/:userId/fund", async (req, res) => {
    try {
      const { amountGrams } = req.body;
      const amount = parseFloat(amountGrams);
      
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
      
      res.json({ 
        message: `${amount}g transferred to FinaBridge wallet`,
        wallet: await storage.getFinabridgeWallet(req.params.userId),
      });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to fund wallet" });
    }
  });
  
  // Get user's settlement holds
  app.get("/api/finabridge/settlement-holds/:userId", async (req, res) => {
    try {
      const holds = await storage.getUserSettlementHolds(req.params.userId);
      res.json({ holds });
    } catch (error) {
      res.status(400).json({ message: "Failed to get settlement holds" });
    }
  });
  
  // Admin: Get all settlement holds
  app.get("/api/admin/finabridge/settlement-holds", async (req, res) => {
    try {
      const holds = await storage.getAllSettlementHolds();
      res.json({ holds });
    } catch (error) {
      res.status(400).json({ message: "Failed to get settlement holds" });
    }
  });
  
  // Release settlement hold (admin - after trade completion)
  app.post("/api/admin/finabridge/settlement-holds/:id/release", async (req, res) => {
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
      });
      
      // Update hold status
      await storage.updateSettlementHold(req.params.id, { status: 'Released' });
      
      // Update trade request status
      await storage.updateTradeRequest(hold.tradeRequestId, { status: 'Completed' });
      
      // Generate Trade Release Certificates for both importer and exporter (non-blocking)
      const releasedGoldAmount = parseFloat(hold.lockedGoldGrams);
      // Get the trade request to calculate price per gram
      const tradeRequest = await storage.getTradeRequest(hold.tradeRequestId);
      const tradeValue = tradeRequest ? parseFloat(tradeRequest.tradeValueUsd) : 0;
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
  app.get("/api/deal-rooms/user/:userId", async (req, res) => {
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
          importer: importer ? { id: importer.id, finatradesId: importer.finatradesId, email: importer.email } : null,
          exporter: exporter ? { id: exporter.id, finatradesId: exporter.finatradesId, email: exporter.email } : null,
          assignedAdmin: assignedAdmin ? { id: assignedAdmin.id, finatradesId: assignedAdmin.finatradesId, email: assignedAdmin.email } : null,
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
        const isParticipant = [room.importerUserId, room.exporterUserId, room.assignedAdminId].includes(userId as string);
        if (!isParticipant) {
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
      
      // Verify user is a participant
      const room = await storage.getDealRoom(req.params.id);
      if (!room) {
        return res.status(404).json({ message: "Deal room not found" });
      }
      
      const isParticipant = [room.importerUserId, room.exporterUserId, room.assignedAdminId].includes(senderUserId);
      if (!isParticipant) {
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
  
  // ============================================================================
  // CHAT SYSTEM
  // ============================================================================
  
  // Get user chat session
  app.get("/api/chat/session/:userId", async (req, res) => {
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
  app.get("/api/admin/chat/sessions", async (req, res) => {
    try {
      const sessions = await storage.getAllChatSessions();
      res.json({ sessions });
    } catch (error) {
      res.status(400).json({ message: "Failed to get chat sessions" });
    }
  });
  
  // Get session messages
  app.get("/api/chat/messages/:sessionId", async (req, res) => {
    try {
      const messages = await storage.getSessionMessages(req.params.sessionId);
      res.json({ messages });
    } catch (error) {
      res.status(400).json({ message: "Failed to get messages" });
    }
  });
  
  // Send message
  app.post("/api/chat/messages", async (req, res) => {
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
  app.patch("/api/chat/messages/:sessionId/read", async (req, res) => {
    try {
      await storage.markMessagesAsRead(req.params.sessionId);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ message: "Failed to mark messages as read" });
    }
  });
  
  // Update chat session
  app.patch("/api/chat/session/:id", async (req, res) => {
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

  // Search user by email or Finatrades ID
  app.get("/api/finapay/search-user", async (req, res) => {
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

  // Send money to another user (USD or Gold)
  app.post("/api/finapay/send", async (req, res) => {
    try {
      const { senderId, recipientIdentifier, amountUsd, amountGold, assetType, channel, memo } = req.body;
      
      // Determine asset type (default to USD for backward compatibility)
      const isGoldTransfer = assetType === 'GOLD' || (amountGold && !amountUsd);
      const goldPrice = 71.55; // Current gold price per gram
      
      // Find sender
      const sender = await storage.getUser(senderId);
      if (!sender) {
        return res.status(404).json({ message: "Sender not found" });
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
      
      if (!recipient) {
        return res.status(404).json({ message: "Recipient not found" });
      }
      
      if (sender.id === recipient.id) {
        return res.status(400).json({ message: "Cannot send money to yourself" });
      }
      
      // Check sender wallet
      const senderWallet = await storage.getWallet(sender.id);
      if (!senderWallet) {
        return res.status(400).json({ message: "Sender wallet not found" });
      }
      
      // Get recipient wallet
      const recipientWallet = await storage.getWallet(recipient.id);
      if (!recipientWallet) {
        return res.status(400).json({ message: "Recipient wallet not found" });
      }
      
      const referenceNumber = `TRF-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      
      if (isGoldTransfer) {
        // GOLD TRANSFER
        const goldAmount = parseFloat(amountGold);
        const senderGoldBalance = parseFloat(senderWallet.goldGrams?.toString() || '0');
        
        if (senderGoldBalance < goldAmount) {
          return res.status(400).json({ message: `Insufficient gold balance. You have ${senderGoldBalance.toFixed(4)}g` });
        }
        
        // Check sender vault holdings
        const senderHoldings = await storage.getUserVaultHoldings(sender.id);
        if (senderHoldings.length === 0) {
          return res.status(400).json({ message: "Sender has no vault holdings" });
        }
        
        const senderHolding = senderHoldings[0];
        const senderHoldingGold = parseFloat(senderHolding.goldGrams?.toString() || '0');
        if (senderHoldingGold < goldAmount) {
          return res.status(400).json({ message: `Insufficient vault holdings. You have ${senderHoldingGold.toFixed(4)}g in vault` });
        }
        
        // Execute gold transfer atomically
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
          
          // 1. Debit sender wallet gold
          const newSenderGold = senderGoldBalance - goldAmount;
          await txStorage.updateWallet(senderWallet.id, {
            goldGrams: newSenderGold.toFixed(6)
          });
          
          // 2. Credit recipient wallet gold
          const recipientGoldBalance = parseFloat(recipientWallet.goldGrams?.toString() || '0');
          await txStorage.updateWallet(recipientWallet.id, {
            goldGrams: (recipientGoldBalance + goldAmount).toFixed(6)
          });
          
          // 3. Update sender vault holding (reduce)
          const newSenderHoldingGold = senderHoldingGold - goldAmount;
          await txStorage.updateVaultHolding(senderHolding.id, {
            goldGrams: newSenderHoldingGold.toFixed(6)
          });
          
          // 4. Mark sender's old certificates as Updated
          const senderActiveCerts = await txStorage.getUserActiveCertificates(sender.id);
          for (const cert of senderActiveCerts) {
            await txStorage.updateCertificate(cert.id, { 
              status: 'Updated',
              cancelledAt: new Date()
            });
          }
          
          // 5. Create sender transaction
          const senderTx = await txStorage.createTransaction({
            userId: sender.id,
            type: 'Send',
            status: 'Completed',
            amountGold: goldAmount.toFixed(6),
            amountUsd: (goldAmount * goldPrice).toFixed(2),
            goldPriceUsdPerGram: goldPrice.toFixed(2),
            recipientEmail: recipient.email,
            recipientUserId: recipient.id,
            description: memo || `Sent ${goldAmount.toFixed(4)}g gold to ${recipient.firstName} ${recipient.lastName}`,
            referenceId: referenceNumber,
            sourceModule: 'finapay',
            completedAt: new Date(),
          });
          
          // 6. Issue new certificates for sender's remaining balance
          if (newSenderHoldingGold > 0) {
            const senderWingoldRef = senderHolding.wingoldStorageRef || generateWingoldRef();
            await txStorage.updateVaultHolding(senderHolding.id, { wingoldStorageRef: senderWingoldRef });
            await issueCertificates(sender.id, senderTx.id, senderHolding.id, senderWingoldRef, newSenderHoldingGold);
          }
          
          // 7. Create recipient transaction
          const recipientTx = await txStorage.createTransaction({
            userId: recipient.id,
            type: 'Receive',
            status: 'Completed',
            amountGold: goldAmount.toFixed(6),
            amountUsd: (goldAmount * goldPrice).toFixed(2),
            goldPriceUsdPerGram: goldPrice.toFixed(2),
            senderEmail: sender.email,
            description: memo || `Received ${goldAmount.toFixed(4)}g gold from ${sender.firstName} ${sender.lastName}`,
            referenceId: referenceNumber,
            sourceModule: 'finapay',
            completedAt: new Date(),
          });
          
          // 8. Update or create recipient vault holding
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
          
          // 9. Issue certificates for recipient
          await issueCertificates(recipient.id, recipientTx.id, recipientHoldingId, recipientWingoldRef, goldAmount);
          
          // 10. Create peer transfer record
          const transfer = await txStorage.createPeerTransfer({
            referenceNumber,
            senderId: sender.id,
            recipientId: recipient.id,
            amountUsd: (goldAmount * goldPrice).toFixed(2),
            channel,
            recipientIdentifier,
            memo,
            status: 'Completed',
            senderTransactionId: senderTx.id,
            recipientTransactionId: recipientTx.id,
          });

          // 11. Record ledger entries for sender and recipient
          const { vaultLedgerService } = await import('./vault-ledger-service');
          
          // Sender: Transfer_Send
          await vaultLedgerService.recordLedgerEntry({
            userId: sender.id,
            action: 'Transfer_Send',
            goldGrams: goldAmount,
            goldPriceUsdPerGram: goldPrice,
            fromWallet: 'FinaPay',
            toWallet: 'External',
            fromStatus: 'Available',
            transactionId: senderTx.id,
            counterpartyUserId: recipient.id,
            notes: `Sent ${goldAmount.toFixed(4)}g gold to ${recipient.firstName} ${recipient.lastName}`,
            createdBy: 'system',
          });
          
          // Recipient: Transfer_Receive (from sender's FinaPay to recipient's FinaPay)
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
            notes: `Received ${goldAmount.toFixed(4)}g gold from ${sender.firstName} ${sender.lastName}`,
            createdBy: 'system',
          });
          
          return { transfer, certificates: generatedCertificates, senderTx, recipientTx };
        });
        
        generateTransferCertificates(
          result.senderTx.id,
          sender.id,
          recipient.id,
          goldAmount,
          goldPrice
        ).catch(err => console.error('[Routes] Failed to generate transfer certificates:', err));

        // Send email notification to recipient for gold transfer
        if (recipient.email) {
          sendEmailDirect(
            recipient.email,
            `You received ${goldAmount.toFixed(4)}g gold from ${sender.firstName} ${sender.lastName}`,
            `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #f97316, #ea580c); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0;">Gold Received!</h1>
              </div>
              <div style="padding: 30px; background: #ffffff;">
                <p>Hello ${recipient.firstName},</p>
                <p>Great news! You've received a gold transfer via FinaPay.</p>
                <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                  <p style="font-size: 28px; font-weight: bold; color: #f97316; margin: 0;">+${goldAmount.toFixed(4)}g Gold</p>
                  <p style="color: #6b7280; margin: 5px 0;">from ${sender.firstName} ${sender.lastName}</p>
                  <p style="color: #6b7280; font-size: 14px;">≈ $${(goldAmount * goldPrice).toFixed(2)}</p>
                  ${memo ? `<p style="color: #6b7280; font-style: italic;">"${memo}"</p>` : ''}
                </div>
                <p>The gold has been added to your vault holdings and is securely stored.</p>
                <p style="text-align: center; margin-top: 30px;">
                  <a href="https://finatrades.com/dashboard" style="background: #f97316; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">View Holdings</a>
                </p>
              </div>
              <div style="padding: 20px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px;">
                <p>Finatrades - Gold-Backed Digital Finance</p>
              </div>
            </div>
            `
          ).catch(err => console.error('[Email] Failed to send gold transfer notification:', err));
        }

        res.json({ 
          transfer: result.transfer,
          certificates: result.certificates,
          message: `Successfully sent ${goldAmount.toFixed(4)}g gold to ${recipient.firstName} ${recipient.lastName}` 
        });
        
      } else {
        // USD TRANSFER (original logic)
        const amount = parseFloat(amountUsd);
        const senderBalance = parseFloat(senderWallet.usdBalance?.toString() || '0');
        
        if (senderBalance < amount) {
          return res.status(400).json({ message: "Insufficient USD balance" });
        }
        
        // Debit sender wallet
        await storage.updateWallet(senderWallet.id, {
          usdBalance: (senderBalance - amount).toFixed(2),
        });
        
        // Credit recipient wallet
        const recipientBalance = parseFloat(recipientWallet.usdBalance?.toString() || '0');
        await storage.updateWallet(recipientWallet.id, {
          usdBalance: (recipientBalance + amount).toFixed(2),
        });
        
        // Create sender transaction (Send)
        const senderTx = await storage.createTransaction({
          userId: sender.id,
          type: 'Send',
          status: 'Completed',
          amountUsd: amount.toFixed(2),
          recipientEmail: recipient.email,
          recipientUserId: recipient.id,
          description: memo || `Sent to ${recipient.firstName} ${recipient.lastName}`,
          referenceId: referenceNumber,
          sourceModule: 'finapay',
          completedAt: new Date(),
        });
        
        // Create recipient transaction (Receive)
        const recipientTx = await storage.createTransaction({
          userId: recipient.id,
          type: 'Receive',
          status: 'Completed',
          amountUsd: amount.toFixed(2),
          senderEmail: sender.email,
          description: memo || `Received from ${sender.firstName} ${sender.lastName}`,
          referenceId: referenceNumber,
          sourceModule: 'finapay',
          completedAt: new Date(),
        });
        
        // Create peer transfer record
        const transfer = await storage.createPeerTransfer({
          referenceNumber,
          senderId: sender.id,
          recipientId: recipient.id,
          amountUsd: amount.toFixed(2),
          channel,
          recipientIdentifier,
          memo,
          status: 'Completed',
          senderTransactionId: senderTx.id,
          recipientTransactionId: recipientTx.id,
        });
        
        // Send email notification to recipient for USD transfer
        if (recipient.email) {
          sendEmailDirect(
            recipient.email,
            `You received $${amount.toFixed(2)} from ${sender.firstName} ${sender.lastName}`,
            `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #f97316, #ea580c); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0;">Money Received!</h1>
              </div>
              <div style="padding: 30px; background: #ffffff;">
                <p>Hello ${recipient.firstName},</p>
                <p>Great news! You've received a transfer via FinaPay.</p>
                <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                  <p style="font-size: 28px; font-weight: bold; color: #f97316; margin: 0;">+$${amount.toFixed(2)}</p>
                  <p style="color: #6b7280; margin: 5px 0;">from ${sender.firstName} ${sender.lastName}</p>
                  ${memo ? `<p style="color: #6b7280; font-style: italic;">"${memo}"</p>` : ''}
                </div>
                <p>The funds have been added to your FinaPay wallet and are ready to use.</p>
                <p style="text-align: center; margin-top: 30px;">
                  <a href="https://finatrades.com/dashboard" style="background: #f97316; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">View Wallet</a>
                </p>
              </div>
              <div style="padding: 20px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px;">
                <p>Finatrades - Gold-Backed Digital Finance</p>
              </div>
            </div>
            `
          ).catch(err => console.error('[Email] Failed to send transfer notification:', err));
        }
        
        res.json({ 
          transfer, 
          message: `Successfully sent $${amount.toFixed(2)} to ${recipient.firstName} ${recipient.lastName}` 
        });
      }
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Transfer failed" });
    }
  });

  // Get user's sent transfers
  app.get("/api/finapay/transfers/sent/:userId", async (req, res) => {
    try {
      const transfers = await storage.getUserSentTransfers(req.params.userId);
      res.json({ transfers });
    } catch (error) {
      res.status(400).json({ message: "Failed to get sent transfers" });
    }
  });

  // Get user's received transfers
  app.get("/api/finapay/transfers/received/:userId", async (req, res) => {
    try {
      const transfers = await storage.getUserReceivedTransfers(req.params.userId);
      res.json({ transfers });
    } catch (error) {
      res.status(400).json({ message: "Failed to get received transfers" });
    }
  });

  // Create money request
  app.post("/api/finapay/request", async (req, res) => {
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
      if (targetIdentifier) {
        const targetUsers = await storage.searchUsersByIdentifier(targetIdentifier);
        if (targetUsers.length > 0) {
          targetId = targetUsers[0].id;
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
      
      res.json({ request, qrCodeDataUrl });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create request" });
    }
  });

  // Get user's money requests (created by user)
  app.get("/api/finapay/requests/:userId", async (req, res) => {
    try {
      const requests = await storage.getUserPeerRequests(req.params.userId);
      res.json({ requests });
    } catch (error) {
      res.status(400).json({ message: "Failed to get requests" });
    }
  });

  // Get money requests received by user
  app.get("/api/finapay/requests/received/:userId", async (req, res) => {
    try {
      const requests = await storage.getUserReceivedPeerRequests(req.params.userId);
      res.json({ requests });
    } catch (error) {
      res.status(400).json({ message: "Failed to get received requests" });
    }
  });

  // Pay a money request
  app.post("/api/finapay/requests/:id/pay", async (req, res) => {
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
      
      // Check payer balance
      const payerWallet = await storage.getWallet(payer.id);
      if (!payerWallet) {
        return res.status(400).json({ message: "Wallet not found" });
      }
      
      const amount = parseFloat(request.amountUsd.toString());
      const payerBalance = parseFloat(payerWallet.usdBalance.toString());
      
      if (payerBalance < amount) {
        return res.status(400).json({ message: "Insufficient balance" });
      }
      
      // Get requester wallet
      const requesterWallet = await storage.getWallet(requester.id);
      if (!requesterWallet) {
        return res.status(400).json({ message: "Requester wallet not found" });
      }
      
      // Generate reference
      const referenceNumber = `TRF-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      
      // Debit payer
      await storage.updateWallet(payerWallet.id, {
        usdBalance: (payerBalance - amount).toFixed(2),
      });
      
      // Credit requester
      const requesterBalance = parseFloat(requesterWallet.usdBalance.toString());
      await storage.updateWallet(requesterWallet.id, {
        usdBalance: (requesterBalance + amount).toFixed(2),
      });
      
      // Create transactions
      const senderTx = await storage.createTransaction({
        userId: payer.id,
        type: 'Send',
        status: 'Completed',
        amountUsd: amount.toFixed(2),
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
        amountUsd: amount.toFixed(2),
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
        amountUsd: amount.toFixed(2),
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

  // Decline a money request
  app.post("/api/finapay/requests/:id/decline", async (req, res) => {
    try {
      const request = await storage.getPeerRequest(req.params.id);
      
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
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

  // Cancel a money request (by requester)
  app.post("/api/finapay/requests/:id/cancel", async (req, res) => {
    try {
      const { userId } = req.body;
      const request = await storage.getPeerRequest(req.params.id);
      
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }
      
      if (request.requesterId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
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

  // Get QR code for receiving money (user's profile QR)
  app.get("/api/finapay/qr/:userId", async (req, res) => {
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
  app.get("/api/admin/finapay/peer-transfers", async (req, res) => {
    try {
      const transfers = await storage.getAllPeerTransfers();
      res.json({ transfers });
    } catch (error) {
      res.status(400).json({ message: "Failed to get peer transfers" });
    }
  });

  // Admin: Get all peer requests
  app.get("/api/admin/finapay/peer-requests", async (req, res) => {
    try {
      const requests = await storage.getAllPeerRequests();
      res.json({ requests });
    } catch (error) {
      res.status(400).json({ message: "Failed to get peer requests" });
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

  // Get user's Binance transactions
  app.get("/api/binance-pay/transactions/:userId", async (req, res) => {
    try {
      const transactions = await storage.getUserBinanceTransactions(req.params.userId);
      res.json({ transactions });
    } catch (error) {
      res.status(400).json({ message: "Failed to get transactions" });
    }
  });

  // Admin: Get all Binance transactions
  app.get("/api/admin/binance-pay/transactions", async (req, res) => {
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
      if (!settings?.ngeniusEnabled || !settings.ngeniusApiKey || !settings.ngeniusOutletRef) {
        return res.status(400).json({ message: "Card payments are not configured" });
      }

      // Create NGenius service
      const ngeniusService = NgeniusService.getInstance({
        apiKey: settings.ngeniusApiKey,
        outletRef: settings.ngeniusOutletRef,
        realmName: settings.ngeniusRealmName || undefined,
        mode: (settings.ngeniusMode || 'sandbox') as 'sandbox' | 'live',
      });

      const orderReference = generateOrderReference();
      const description = `Wallet deposit - ${amount} ${currency}`;

      // Build return URL with order reference
      let finalReturnUrl: string;
      if (returnUrl) {
        const separator = returnUrl.includes('?') ? '&' : '?';
        finalReturnUrl = `${returnUrl}${separator}ref=${orderReference}`;
      } else {
        finalReturnUrl = `${req.protocol}://${req.get('host')}/deposit/callback?ref=${orderReference}`;
      }

      // Create order with NGenius
      const orderResponse = await ngeniusService.createOrder({
        orderReference,
        amount: parseFloat(amount),
        currency,
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
      if (settings?.ngeniusEnabled && settings.ngeniusApiKey && settings.ngeniusOutletRef && transaction.ngeniusOrderId) {
        try {
          const ngeniusService = NgeniusService.getInstance({
            apiKey: settings.ngeniusApiKey,
            outletRef: settings.ngeniusOutletRef,
            realmName: settings.ngeniusRealmName || undefined,
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
            
            // If captured, credit the wallet with gold (not USD cash)
            if (newStatus === 'Captured' && transaction.status !== 'Captured') {
              const wallet = await storage.getWallet(transaction.userId);
              if (wallet) {
                const depositAmount = parseFloat(transaction.amountUsd || '0');
                // Convert USD to gold at current price
                let goldPricePerGram: number;
                try {
                  goldPricePerGram = await getGoldPricePerGram();
                } catch {
                  goldPricePerGram = 85; // Fallback price
                }
                const goldGrams = depositAmount / goldPricePerGram;
                const currentGold = parseFloat(wallet.goldGrams || '0');
                
                await storage.updateWallet(wallet.id, {
                  goldGrams: (currentGold + goldGrams).toFixed(6),
                });

                // Create transaction record
                const walletTx = await storage.createTransaction({
                  userId: transaction.userId,
                  type: 'Deposit',
                  status: 'Completed',
                  amountUsd: transaction.amountUsd,
                  amountGold: goldGrams.toFixed(6),
                  goldPriceUsdPerGram: goldPricePerGram.toFixed(2),
                  description: `Card deposit via NGenius - ${orderReference} | ${goldGrams.toFixed(4)}g @ $${goldPricePerGram.toFixed(2)}/g`,
                  referenceId: orderReference,
                  sourceModule: 'finapay',
                  completedAt: new Date(),
                });

                await storage.updateNgeniusTransaction(transaction.id, {
                  walletTransactionId: walletTx.id,
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

  // NGenius webhook handler
  app.post("/api/ngenius/webhook", async (req, res) => {
    try {
      console.log('NGenius webhook received:', JSON.stringify(req.body, null, 2));

      const settings = await storage.getPaymentGatewaySettings();
      if (!settings?.ngeniusEnabled || !settings.ngeniusApiKey || !settings.ngeniusOutletRef) {
        return res.status(400).json({ message: "NGenius not configured" });
      }

      const ngeniusService = NgeniusService.getInstance({
        apiKey: settings.ngeniusApiKey,
        outletRef: settings.ngeniusOutletRef,
        realmName: settings.ngeniusRealmName || undefined,
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

        // If payment captured, credit wallet with gold (not USD cash)
        if (webhookData.status === 'Captured' && transaction.status !== 'Captured') {
          const wallet = await storage.getWallet(transaction.userId);
          if (wallet) {
            const depositAmount = parseFloat(transaction.amountUsd || '0');
            // Convert USD to gold at current price
            let goldPricePerGram: number;
            try {
              goldPricePerGram = await getGoldPricePerGram();
            } catch {
              goldPricePerGram = 85; // Fallback price
            }
            const goldGrams = depositAmount / goldPricePerGram;
            const currentGold = parseFloat(wallet.goldGrams || '0');
            
            await storage.updateWallet(wallet.id, {
              goldGrams: (currentGold + goldGrams).toFixed(6),
            });

            // Create transaction record
            const walletTx = await storage.createTransaction({
              userId: transaction.userId,
              type: 'Deposit',
              status: 'Completed',
              amountUsd: transaction.amountUsd,
              amountGold: goldGrams.toFixed(6),
              goldPriceUsdPerGram: goldPricePerGram.toFixed(2),
              description: `Card deposit via NGenius - ${transaction.orderReference} | ${goldGrams.toFixed(4)}g @ $${goldPricePerGram.toFixed(2)}/g`,
              referenceId: transaction.orderReference,
              sourceModule: 'finapay',
              completedAt: new Date(),
            });

            await storage.updateNgeniusTransaction(transaction.id, {
              walletTransactionId: walletTx.id,
            });
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

  // Get user's NGenius transactions
  app.get("/api/ngenius/transactions/:userId", async (req, res) => {
    try {
      const transactions = await storage.getUserNgeniusTransactions(req.params.userId);
      res.json({ transactions });
    } catch (error) {
      res.status(400).json({ message: "Failed to get transactions" });
    }
  });

  // Admin: Get all NGenius transactions
  app.get("/api/admin/ngenius/transactions", async (req, res) => {
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

  // ============================================================================
  // ADMIN - FINANCIAL REPORTS
  // ============================================================================

  // Financial Overview - total revenue, AUM, liabilities, net position
  app.get("/api/admin/financial/overview", async (req, res) => {
    try {
      const GOLD_PRICE_USD = 93.50; // Price per gram in USD

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

      // Get vault holdings
      const vaultHoldings = await storage.getAllVaultHoldings();
      let vaultGoldGrams = 0;
      for (const holding of vaultHoldings) {
        // All vault holdings are considered active (no status field)
        vaultGoldGrams += parseFloat(holding.goldGrams || '0');
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

      // Get all transactions to estimate revenue
      const allTransactions = await storage.getAllTransactions();
      let totalRevenue = 0;
      for (const tx of allTransactions) {
        if (tx.status === 'Completed') {
          // Estimate 1% fee on each transaction
          const txValue = parseFloat(tx.amountUsd || '0') || 
            (parseFloat(tx.amountGold || '0') * parseFloat(tx.goldPriceUsdPerGram || GOLD_PRICE_USD.toString()));
          totalRevenue += Math.abs(txValue) * 0.01;
        }
      }

      // Add BNSL interest to revenue
      totalRevenue += bnslInterestUsd;
      
      // Add storage fees (0.5% annual on vault holdings)
      const storageFeeRevenue = vaultGoldGrams * GOLD_PRICE_USD * 0.005;
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

      // FinaPay Metrics
      const allUsers = await storage.getAllUsers();
      const allWallets = await Promise.all(
        allUsers.map(user => storage.getWallet(user.id))
      );
      const activeWallets = allWallets.filter(w => w && (parseFloat(w.goldGrams || '0') > 0 || parseFloat(w.usdBalance || '0') > 0)).length;

      const allTransactions = await storage.getAllTransactions();
      let volumeUsd = 0;
      for (const tx of allTransactions) {
        const txValue = parseFloat(tx.amountUsd || '0') || 
          (parseFloat(tx.amountGold || '0') * parseFloat(tx.goldPriceUsdPerGram || GOLD_PRICE_USD.toString()));
        volumeUsd += Math.abs(txValue);
      }
      const feesCollectedUsd = volumeUsd * 0.01; // 1% fee

      // FinaVault Metrics
      const vaultHoldings = await storage.getAllVaultHoldings();
      let goldStoredGrams = 0;
      const vaultUserIds = new Set<string>();
      for (const holding of vaultHoldings) {
        goldStoredGrams += parseFloat(holding.goldGrams || '0');
        vaultUserIds.add(holding.userId);
      }
      const storageFeesUsd = goldStoredGrams * GOLD_PRICE_USD * 0.005; // 0.5% annual

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

  // ============================================================================
  // PAYMENT GATEWAY SETTINGS (Admin)
  // ============================================================================

  // Get payment gateway settings (Admin)
  app.get("/api/admin/payment-gateways", async (req, res) => {
    try {
      const settings = await db.select().from(paymentGatewaySettings).limit(1);
      res.json(settings[0] || null);
    } catch (error) {
      console.error("Failed to get payment gateway settings:", error);
      res.status(400).json({ message: "Failed to get payment gateway settings" });
    }
  });

  // Update payment gateway settings (Admin)
  app.put("/api/admin/payment-gateways", async (req, res) => {
    try {
      const settings = await db.select().from(paymentGatewaySettings).limit(1);
      
      if (settings.length === 0) {
        // Create new settings
        const newSettings = await db.insert(paymentGatewaySettings).values({
          id: 'default',
          ...req.body,
          updatedAt: new Date()
        }).returning();
        res.json(newSettings[0]);
      } else {
        // Update existing settings
        const updatedSettings = await db.update(paymentGatewaySettings)
          .set({ ...req.body, updatedAt: new Date() })
          .where(eq(paymentGatewaySettings.id, settings[0].id))
          .returning();
        res.json(updatedSettings[0]);
      }
    } catch (error) {
      console.error("Failed to update payment gateway settings:", error);
      res.status(400).json({ message: "Failed to update payment gateway settings" });
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
      const { userId, personalInformation, documents, livenessCapture, livenessVerified } = req.body;
      
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

  // Request OTP for an action
  app.post("/api/otp/request", async (req, res) => {
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

  // Verify OTP code
  app.post("/api/otp/verify", async (req, res) => {
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

  // Download invoice PDF
  app.get("/api/admin/documents/invoices/:id/download", ensureAdminAsync, async (req, res) => {
    try {
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

  // Download certificate PDF
  app.get("/api/admin/documents/certificates/:id/download", ensureAdminAsync, async (req, res) => {
    try {
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

  // Send OTP for admin action
  app.post("/api/admin/action-otp/send", ensureAdminAsync, async (req, res) => {
    try {
      const { actionType, targetId, targetType, actionData } = req.body;
      const admin = (req as any).adminUser;
      
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
      
      // Generate 6-digit OTP code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      
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
        actionData: actionData || null,
      });
      
      // Send email with OTP
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
            <p>Hello ${admin.firstName},</p>
            <p>You are attempting to perform: <strong>${actionLabels[actionType] || actionType}</strong></p>
            <p>Your verification code is:</p>
            <div style="background: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #f97316;">${code}</span>
            </div>
            <p>This code expires in <strong>10 minutes</strong>.</p>
            <p style="color: #6b7280; font-size: 14px;">If you did not initiate this action, please contact security immediately.</p>
          </div>
          <div style="padding: 20px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px;">
            <p>Finatrades Admin Portal - Secure Action Verification</p>
          </div>
        </div>
      `;
      
      await sendEmailDirect(admin.email, `Finatrades Admin Verification Code - ${actionLabels[actionType] || actionType}`, htmlBody);
      
      // Create audit log
      await storage.createAuditLog({
        entityType: "admin_action_otp",
        entityId: otp.id,
        actionType: "create",
        actor: admin.id,
        actorRole: "admin",
        details: `OTP sent for ${actionType} on ${targetType}:${targetId}`,
      });
      
      res.json({ 
        otpId: otp.id,
        message: "Verification code sent to your email",
        expiresAt: otp.expiresAt,
      });
    } catch (error) {
      console.error("Failed to send admin action OTP:", error);
      res.status(500).json({ message: "Failed to send verification code" });
    }
  });

  // Verify OTP for admin action
  app.post("/api/admin/action-otp/verify", ensureAdminAsync, async (req, res) => {
    try {
      const { otpId, code } = req.body;
      const admin = (req as any).adminUser;
      
      if (!otpId || !code) {
        return res.status(400).json({ message: "Missing required fields: otpId, code" });
      }
      
      const otp = await storage.getAdminActionOtp(otpId);
      
      if (!otp) {
        return res.status(404).json({ message: "Verification request not found" });
      }
      
      // Check if OTP belongs to the current admin
      if (otp.adminId !== admin.id) {
        return res.status(403).json({ message: "This verification code is not for your account" });
      }
      
      // Check if already verified
      if (otp.verified) {
        return res.status(400).json({ message: "This verification code has already been used" });
      }
      
      // Check expiry
      if (new Date() > otp.expiresAt) {
        return res.status(400).json({ message: "Verification code has expired. Please request a new one." });
      }
      
      // Check attempts (max 5)
      if (otp.attempts >= 5) {
        return res.status(429).json({ message: "Too many failed attempts. Please request a new code." });
      }
      
      // Verify code
      if (otp.code !== code) {
        await storage.updateAdminActionOtp(otpId, { attempts: otp.attempts + 1 });
        return res.status(400).json({ message: "Invalid verification code", attemptsRemaining: 4 - otp.attempts });
      }
      
      // Mark as verified
      await storage.updateAdminActionOtp(otpId, { 
        verified: true, 
        verifiedAt: new Date() 
      });
      
      // Create audit log
      await storage.createAuditLog({
        entityType: "admin_action_otp",
        entityId: otp.id,
        actionType: "verify",
        actor: admin.id,
        actorRole: "admin",
        details: `OTP verified for ${otp.actionType} on ${otp.targetType}:${otp.targetId}`,
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
            <p>Hello ${admin.firstName},</p>
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

  // Get all referrals (Admin)
  app.get("/api/admin/referrals", async (req, res) => {
    try {
      const referrals = await storage.getAllReferrals();
      res.json({ referrals });
    } catch (error) {
      res.status(500).json({ message: "Failed to get referrals" });
    }
  });

  // Get single referral
  app.get("/api/admin/referrals/:id", async (req, res) => {
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

  // Update referral (Admin)
  app.patch("/api/admin/referrals/:id", async (req, res) => {
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
  // AUDIT LOGS
  // ============================================

  // Get all audit logs (Admin)
  app.get("/api/admin/audit-logs", async (req, res) => {
    try {
      const logs = await storage.getAllAuditLogs();
      res.json({ logs });
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
      
      // Create transaction record
      const transaction = await storage.createTransaction({
        userId: paymentRequest.userId,
        type: 'Buy',
        status: 'Completed',
        amountGold: paymentRequest.goldGrams,
        amountUsd: paymentRequest.amountUsd,
        goldPriceUsdPerGram: paymentRequest.goldPriceAtTime,
        description: `Crypto payment approved - ${paymentRequest.transactionHash || 'Manual verification'}`,
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
  // USER NOTIFICATIONS
  // ============================================

  // Get user's notifications
  app.get("/api/notifications/:userId", async (req, res) => {
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

  // Mark notification as read
  app.patch("/api/notifications/:id/read", async (req, res) => {
    try {
      const notification = await storage.markNotificationRead(req.params.id);
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      res.json({ notification });
    } catch (error) {
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // Mark all notifications as read
  app.patch("/api/notifications/:userId/read-all", async (req, res) => {
    try {
      await storage.markAllNotificationsRead(req.params.userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to mark notifications as read" });
    }
  });

  // Delete notification
  app.delete("/api/notifications/:id", async (req, res) => {
    try {
      const success = await storage.deleteNotification(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Notification not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete notification" });
    }
  });

  // Clear all notifications for user
  app.delete("/api/notifications/user/:userId", async (req, res) => {
    try {
      await storage.deleteAllNotifications(req.params.userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to clear notifications" });
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
      for (const update of updates) {
        const updated = await storage.updatePlatformConfig(update.id, {
          configValue: String(update.configValue),
          updatedBy: adminUser.id,
        });
        if (updated) {
          results.push(updated);
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

  return httpServer;
}
