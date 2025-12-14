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
  insertSecuritySettingsSchema
} from "@shared/schema";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { authenticator } from "otplib";
import * as QRCode from "qrcode";
import { sendEmail, sendEmailWithAttachment, EMAIL_TEMPLATES, seedEmailTemplates } from "./email";
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
import { generateUserManualPDF, generateAdminManualPDF } from "./pdf-generator";

// Middleware to ensure admin access using header-based auth
// This middleware validates that the X-Admin-User-Id header contains a valid admin user ID
async function ensureAdminAsync(req: Request, res: Response, next: NextFunction) {
  try {
    const adminUserId = req.headers['x-admin-user-id'] as string;
    
    if (!adminUserId) {
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
      
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
        finatradesId,
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
      
      // Send verification email
      const emailResult = await sendEmail(user.email, EMAIL_TEMPLATES.EMAIL_VERIFICATION, {
        user_name: `${user.firstName} ${user.lastName}`,
        verification_code: verificationCode,
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
      
      res.json({ user: sanitizeUser(user) });
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
      
      res.json({
        totalUsers,
        pendingKycCount,
        totalVolume,
        revenue,
        pendingKycRequests
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
  
  // Update KYC status (Admin)
  app.patch("/api/kyc/:id", async (req, res) => {
    try {
      const updates = { ...req.body };
      
      // Convert reviewedAt string to Date if provided
      if (updates.reviewedAt && typeof updates.reviewedAt === 'string') {
        updates.reviewedAt = new Date(updates.reviewedAt);
      }
      
      const submission = await storage.updateKycSubmission(req.params.id, updates);
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
          } else if (req.body.status === 'Rejected') {
            const emailResult = await sendEmail(user.email, EMAIL_TEMPLATES.KYC_REJECTED, {
              user_name: `${user.firstName} ${user.lastName}`,
              rejection_reason: req.body.rejectionReason || 'Documents could not be verified',
              kyc_url: `${baseUrl}/kyc`,
            });
            emailSent = emailResult.success;
          }
        }
        
        // Include email status in response for admin visibility
        return res.json({ submission, emailSent });
      }
      
      res.json({ submission });
    } catch (error) {
      console.error("KYC update error:", error);
      const message = error instanceof Error ? error.message : "Failed to update KYC";
      res.status(400).json({ message });
    }
  });
  
  // Get all KYC submissions (Admin)
  app.get("/api/admin/kyc", async (req, res) => {
    try {
      const submissions = await storage.getAllKycSubmissions();
      res.json({ submissions });
    } catch (error) {
      res.status(400).json({ message: "Failed to get KYC submissions" });
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
      
      res.json({ 
        transactions: enrichedTransactions,
        holdings,
        certificates,
        currentBalance: {
          goldGrams: wallet?.goldGrams || '0',
          usdBalance: wallet?.usdBalance || '0'
        }
      });
    } catch (error) {
      res.status(400).json({ message: "Failed to get vault activity" });
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
      const { status, adminNotes, rejectionReason, verifiedWeightGrams, goldPriceUsdPerGram, adminId } = req.body;
      
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

      // If status is "Stored", create vault holding, certificate, and credit wallet
      if (status === 'Stored') {
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

          // Create transaction record
          await storage.createTransaction({
            userId: request.userId,
            type: 'Deposit',
            status: 'Completed',
            amountGold: finalWeightGrams.toString(),
            goldPriceUsdPerGram: pricePerGram.toString(),
            description: `FinaVault deposit: ${finalWeightGrams}g physical gold stored`,
            sourceModule: 'finavault',
            referenceId: request.referenceNumber,
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
      
      // Create transaction record
      await storage.createTransaction({
        userId,
        type: 'Send',
        status: 'Completed',
        amountGold: amountGrams.toFixed(6),
        description: `Transfer ${amountGrams.toFixed(3)}g from FinaPay to BNSL wallet`
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
  
  // Get active bank accounts (User - for deposit form)
  app.get("/api/bank-accounts/active", async (req, res) => {
    try {
      const accounts = await storage.getActivePlatformBankAccounts();
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
      
      // If confirming deposit, credit the user's wallet
      if (updates.status === 'Confirmed' && request.status === 'Pending') {
        const wallet = await storage.getWallet(request.userId);
        if (wallet) {
          const currentBalance = parseFloat(wallet.usdBalance.toString());
          const depositAmount = parseFloat(request.amountUsd.toString());
          await storage.updateWallet(wallet.id, {
            usdBalance: (currentBalance + depositAmount).toString(),
          });
          
          // Create transaction record
          await storage.createTransaction({
            userId: request.userId,
            type: 'Deposit',
            status: 'Completed',
            amountUsd: request.amountUsd.toString(),
            description: `Deposit confirmed - Ref: ${request.referenceNumber}`,
            referenceId: request.referenceNumber,
            sourceModule: 'finapay',
            approvedBy: updates.processedBy,
            approvedAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }
      
      const updatedRequest = await storage.updateDepositRequest(req.params.id, {
        ...updates,
        processedAt: new Date(),
      });
      
      res.json({ request: updatedRequest });
    } catch (error) {
      res.status(400).json({ message: "Failed to update deposit request" });
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
      
      res.json({ settlementHold, message: "Proposal accepted and gold locked" });
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
      
      res.json({ proposal });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to submit proposal" });
    }
  });
  
  // ADMIN ENDPOINTS
  
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
          email: user.email 
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
          
          return { transfer, certificates: generatedCertificates, senderTx, recipientTx };
        });
        
        generateTransferCertificates(
          result.senderTx.id,
          sender.id,
          recipient.id,
          goldAmount,
          goldPrice
        ).catch(err => console.error('[Routes] Failed to generate transfer certificates:', err));

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
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = req.user as User;
      const { amount, currency = 'USD', returnUrl, cancelUrl } = req.body;

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
            
            // If captured, credit the wallet
            if (newStatus === 'Captured' && transaction.status !== 'Captured') {
              const wallet = await storage.getWallet(transaction.userId);
              if (wallet) {
                const currentBalance = parseFloat(wallet.usdBalance || '0');
                const depositAmount = parseFloat(transaction.amountUsd || '0');
                await storage.updateWallet(wallet.id, {
                  usdBalance: (currentBalance + depositAmount).toString(),
                });

                // Create transaction record
                const walletTx = await storage.createTransaction({
                  userId: transaction.userId,
                  type: 'Deposit',
                  status: 'Completed',
                  amountUsd: transaction.amountUsd,
                  description: `Card deposit via NGenius - ${orderReference}`,
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

        // If payment captured, credit wallet
        if (webhookData.status === 'Captured' && transaction.status !== 'Captured') {
          const wallet = await storage.getWallet(transaction.userId);
          if (wallet) {
            const currentBalance = parseFloat(wallet.usdBalance || '0');
            const depositAmount = parseFloat(transaction.amountUsd || '0');
            await storage.updateWallet(wallet.id, {
              usdBalance: (currentBalance + depositAmount).toString(),
            });

            // Create transaction record
            const walletTx = await storage.createTransaction({
              userId: transaction.userId,
              type: 'Deposit',
              status: 'Completed',
              amountUsd: transaction.amountUsd,
              description: `Card deposit via NGenius - ${transaction.orderReference}`,
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
          bankName: s.bankTransferEnabled ? s.bankName : null,
          accountName: s.bankTransferEnabled ? s.bankAccountName : null,
          accountNumber: s.bankTransferEnabled ? s.bankAccountNumber : null,
          routingNumber: s.bankTransferEnabled ? s.bankRoutingNumber : null,
          swiftCode: s.bankTransferEnabled ? s.bankSwiftCode : null,
          iban: s.bankTransferEnabled ? s.bankIban : null,
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

  return httpServer;
}
