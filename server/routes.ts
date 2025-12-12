import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, type TransactionalStorage } from "./storage";
import { 
  insertUserSchema, insertKycSubmissionSchema, insertWalletSchema, 
  insertTransactionSchema, insertVaultHoldingSchema, insertBnslPlanSchema,
  insertBnslPayoutSchema, insertBnslEarlyTerminationSchema, insertTradeCaseSchema,
  insertTradeDocumentSchema, insertChatSessionSchema, insertChatMessageSchema,
  insertAuditLogSchema, insertContentPageSchema, insertContentBlockSchema,
  insertTemplateSchema, insertMediaAssetSchema, User
} from "@shared/schema";
import { z } from "zod";
import bcrypt from "bcryptjs";

// Helper to strip sensitive fields from user object
function sanitizeUser(user: User): Omit<User, 'password' | 'emailVerificationCode'> {
  const { password, emailVerificationCode, ...safeUser } = user;
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
      
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
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
      
      // In production, send email with verification code
      // For now, we'll log it and the user can see it in the response for testing
      console.log(`[Email Verification] Code for ${user.email}: ${verificationCode}`);
      
      res.json({ 
        user: sanitizeUser(user),
        message: "Registration successful. Please verify your email.",
        requiresVerification: true 
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
      
      // In production, send email
      console.log(`[Email Verification] New code for ${email}: ${verificationCode}`);
      
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
  // ADMIN - USER MANAGEMENT
  // ============================================================================
  
  // Get all users (Admin)
  app.get("/api/admin/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json({ users: users.map(sanitizeUser) });
    } catch (error) {
      res.status(400).json({ message: "Failed to get users" });
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
      const submission = await storage.updateKycSubmission(req.params.id, req.body);
      if (!submission) {
        return res.status(404).json({ message: "KYC submission not found" });
      }
      
      // Update user KYC status
      if (req.body.status) {
        await storage.updateUser(submission.userId, {
          kycStatus: req.body.status,
        });
      }
      
      res.json({ submission });
    } catch (error) {
      res.status(400).json({ message: "Failed to update KYC" });
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
      res.json({ plans });
    } catch (error) {
      res.status(400).json({ message: "Failed to get BNSL plans" });
    }
  });
  
  // Create BNSL plan
  app.post("/api/bnsl/plans", async (req, res) => {
    try {
      const planData = insertBnslPlanSchema.parse(req.body);
      const plan = await storage.createBnslPlan(planData);
      
      // Create audit log
      await storage.createAuditLog({
        entityType: "bnsl",
        entityId: plan.id,
        actionType: "create",
        actor: planData.userId,
        actorRole: "user",
        details: `BNSL plan created: ${planData.goldSoldGrams}g`,
      });
      
      res.json({ plan });
    } catch (error) {
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
      
      res.json({ case: tradeCase });
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
      res.json({ case: tradeCase });
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
  // CMS - CONTENT MANAGEMENT SYSTEM
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

  return httpServer;
}
