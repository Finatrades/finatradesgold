import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, insertKycSubmissionSchema, insertWalletSchema, 
  insertTransactionSchema, insertVaultHoldingSchema, insertBnslPlanSchema,
  insertBnslPayoutSchema, insertBnslEarlyTerminationSchema, insertTradeCaseSchema,
  insertTradeDocumentSchema, insertChatSessionSchema, insertChatMessageSchema,
  insertAuditLogSchema, User
} from "@shared/schema";
import { z } from "zod";
import bcrypt from "bcryptjs";

// Helper to strip sensitive fields from user object
function sanitizeUser(user: User): Omit<User, 'password'> {
  const { password, ...safeUser } = user;
  return safeUser;
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
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
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
        details: "User registered",
      });
      
      res.json({ user: sanitizeUser(user) });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Registration failed" });
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

  // Admin Dashboard Statistics
  app.get("/api/admin/dashboard/stats", async (req, res) => {
    try {
      const [users, wallets, allTransactions, vaultHoldings, kycSubmissions, bnslPlans, tradeCases] = await Promise.all([
        storage.getAllUsers(),
        storage.getAllWallets(),
        storage.getAllTransactions(),
        storage.getAllVaultHoldings(),
        storage.getAllKycSubmissions(),
        storage.getAllBnslPlans(),
        storage.getAllTradeCases()
      ]);

      // Safe number parsing helper
      const safeParseFloat = (value: any): number => {
        if (value === null || value === undefined) return 0;
        const parsed = parseFloat(String(value));
        return isNaN(parsed) ? 0 : parsed;
      };

      // Current gold price (would come from external API in production)
      const currentGoldPriceUsd = 78.50;

      // Calculate totals
      const totalGoldGrams = wallets.reduce((sum, w) => sum + safeParseFloat(w.goldGrams), 0);
      const totalUsdBalances = wallets.reduce((sum, w) => sum + safeParseFloat(w.usdBalance), 0);
      const totalEurBalances = wallets.reduce((sum, w) => sum + safeParseFloat(w.eurBalance), 0);
      const totalAUM = totalGoldGrams * currentGoldPriceUsd + totalUsdBalances + (totalEurBalances * 1.08);

      // User stats
      const totalUsers = users.length;
      const personalUsers = users.filter(u => u.accountType === 'personal').length;
      const businessUsers = users.filter(u => u.accountType === 'business').length;
      
      // KYC stats
      const verifiedUsers = users.filter(u => u.kycStatus === 'Approved').length;
      const pendingKyc = kycSubmissions.filter(k => k.status === 'In Progress' || k.status === 'Submitted').length;
      const highRiskUsers = users.filter(u => u.kycStatus === 'Rejected').length;

      // Transaction stats - today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTransactions = allTransactions.filter(t => new Date(t.createdAt) >= today);
      const dailyTransactionCount = todayTransactions.length;
      const dailyTransactionVolume = todayTransactions.reduce((sum, t) => sum + safeParseFloat(t.amountUsd), 0);

      // Transaction types breakdown
      const buyTransactions = allTransactions.filter(t => t.type === 'Buy');
      const sellTransactions = allTransactions.filter(t => t.type === 'Sell');
      const sendTransactions = allTransactions.filter(t => t.type === 'Send');
      const receiveTransactions = allTransactions.filter(t => t.type === 'Receive');
      const failedTransactions = allTransactions.filter(t => t.status === 'Failed' || t.status === 'Pending');

      // Vault stats
      const totalVaultGold = vaultHoldings.reduce((sum, h) => sum + safeParseFloat(h.goldGrams), 0);
      const vaultDeposits = vaultHoldings.length;

      // BNSL stats
      const activeBnslPlans = bnslPlans.filter(p => p.status === 'Active').length;
      const totalBnslInvested = bnslPlans.reduce((sum, p) => sum + safeParseFloat(p.goldGrams), 0) * currentGoldPriceUsd;

      // Trade Finance stats
      const activeTradeCases = tradeCases.filter(c => c.status === 'Active' || c.status === 'In Progress').length;
      const totalTradeValue = tradeCases.reduce((sum, c) => sum + safeParseFloat(c.valueUsd), 0);

      res.json({
        overview: {
          totalAUM,
          totalGoldGrams,
          totalUsdBalances,
          totalUsers,
          personalUsers,
          businessUsers,
          dailyTransactionCount,
          dailyTransactionVolume,
          currentGoldPriceUsd
        },
        finavault: {
          totalGoldStored: totalVaultGold || totalGoldGrams,
          totalDeposits: buyTransactions.length,
          totalWithdrawals: sellTransactions.length,
          netGoldBalance: totalGoldGrams,
          vaultReconciliationStatus: 'Reconciled',
          dailyGoldPrice: currentGoldPriceUsd,
          platformSpread: 0.50
        },
        finapay: {
          paymentsProcessedToday: dailyTransactionCount,
          totalValueSent: sendTransactions.reduce((sum, t) => sum + safeParseFloat(t.amountUsd), 0),
          totalValueReceived: receiveTransactions.reduce((sum, t) => sum + safeParseFloat(t.amountUsd), 0),
          crossBorderTransfers: sendTransactions.filter(t => t.description?.includes('International')).length,
          cardTransactions: allTransactions.filter(t => t.description?.includes('Card')).length,
          failedTransactions: failedTransactions.length,
          flaggedTransactions: 0
        },
        bnsl: {
          activePlans: activeBnslPlans,
          totalInvested: totalBnslInvested,
          upcomingMaturities: bnslPlans.filter(p => {
            const maturity = new Date(p.maturityDate);
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
            return maturity <= thirtyDaysFromNow && p.status === 'Active';
          }).length,
          earlyWithdrawals: bnslPlans.filter(p => p.status === 'Early Terminated').length,
          dailyCollections: 0
        },
        finabridge: {
          activeTradeCases,
          settlementsProcessed: tradeCases.filter(c => c.status === 'Completed').length,
          totalTradeValue,
          corporateRevenue: totalTradeValue * 0.015
        },
        compliance: {
          verifiedUsers,
          pendingKyc,
          highRiskUsers,
          suspiciousAlerts: 0
        },
        operations: {
          systemUptime: 99.9,
          apiResponseTime: 45,
          errorsToday: failedTransactions.length,
          supportTickets: 0
        }
      });
    } catch (error) {
      console.error('Dashboard stats error:', error);
      res.status(400).json({ message: "Failed to get dashboard stats" });
    }
  });

  // Get all users (Admin)
  app.get("/api/admin/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      // Remove passwords from response
      const safeUsers = users.map(({ password, ...user }) => user);
      res.json({ users: safeUsers });
    } catch (error) {
      res.status(400).json({ message: "Failed to get users" });
    }
  });

  // Update user (Admin)
  app.patch("/api/admin/users/:id", async (req, res) => {
    try {
      const user = await storage.updateUser(req.params.id, req.body);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ user });
    } catch (error) {
      res.status(400).json({ message: "Failed to update user" });
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
  
  // Create transaction with wallet balance update
  app.post("/api/transactions", async (req, res) => {
    try {
      const transactionData = insertTransactionSchema.parse(req.body);
      const { userId, type, amountGold, amountUsd } = transactionData;

      // Get current wallet
      const wallet = await storage.getWallet(userId);
      if (!wallet) {
        return res.status(400).json({ message: "Wallet not found" });
      }

      const currentGold = parseFloat(wallet.goldGrams);
      const currentUsd = parseFloat(wallet.usdBalance);
      const goldAmount = amountGold ? parseFloat(amountGold) : 0;
      const usdAmount = amountUsd ? parseFloat(amountUsd) : 0;

      // Validate and calculate new balances based on transaction type
      let newGoldBalance = currentGold;
      let newUsdBalance = currentUsd;

      switch (type) {
        case 'Buy':
          if (currentUsd < usdAmount) {
            return res.status(400).json({ message: "Insufficient USD balance" });
          }
          newGoldBalance = currentGold + goldAmount;
          newUsdBalance = currentUsd - usdAmount;
          break;
        case 'Sell':
          if (currentGold < goldAmount) {
            return res.status(400).json({ message: "Insufficient gold balance" });
          }
          newGoldBalance = currentGold - goldAmount;
          newUsdBalance = currentUsd + usdAmount;
          break;
        case 'Send':
          if (goldAmount > 0 && currentGold < goldAmount) {
            return res.status(400).json({ message: "Insufficient gold balance" });
          }
          if (usdAmount > 0 && currentUsd < usdAmount) {
            return res.status(400).json({ message: "Insufficient USD balance" });
          }
          newGoldBalance = currentGold - goldAmount;
          newUsdBalance = currentUsd - usdAmount;
          break;
        case 'Receive':
          newGoldBalance = currentGold + goldAmount;
          newUsdBalance = currentUsd + usdAmount;
          break;
        case 'Deposit':
          newUsdBalance = currentUsd + usdAmount;
          break;
        case 'Withdrawal':
          if (currentUsd < usdAmount) {
            return res.status(400).json({ message: "Insufficient USD balance" });
          }
          newUsdBalance = currentUsd - usdAmount;
          break;
      }

      // Update wallet
      await storage.updateWallet(wallet.id, {
        goldGrams: newGoldBalance.toFixed(6),
        usdBalance: newUsdBalance.toFixed(2),
      });

      // Create transaction with completed status
      const transaction = await storage.createTransaction({
        ...transactionData,
        status: 'Completed',
      });
      
      // Create audit log
      await storage.createAuditLog({
        entityType: "transaction",
        entityId: transaction.id,
        actionType: "create",
        actor: transactionData.userId,
        actorRole: "user",
        details: `Transaction type: ${transactionData.type}, Gold: ${goldAmount}g, USD: $${usdAmount}`,
      });
      
      res.json({ transaction, wallet: { goldGrams: newGoldBalance.toFixed(6), usdBalance: newUsdBalance.toFixed(2) } });
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
  
  // Update transaction status
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
  
  // ============================================================================
  // FINAVAULT - GOLD STORAGE
  // ============================================================================
  
  // Admin: Get all vault holdings
  app.get("/api/admin/vault/holdings", async (req, res) => {
    try {
      const holdings = await storage.getAllVaultHoldings();
      res.json({ holdings });
    } catch (error) {
      res.status(400).json({ message: "Failed to get vault holdings" });
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
  
  // ============================================================================
  // BNSL PLAN TEMPLATES (Dynamic Plan Configuration)
  // ============================================================================

  // Get all active plan templates (for users to see available plans)
  app.get("/api/bnsl/templates", async (req, res) => {
    try {
      const templates = await storage.getActiveBnslPlanTemplates();
      res.json({ templates });
    } catch (error) {
      res.status(400).json({ message: "Failed to get plan templates" });
    }
  });

  // Get all plan templates (Admin - includes inactive)
  app.get("/api/admin/bnsl/templates", async (req, res) => {
    try {
      const templates = await storage.getAllBnslPlanTemplates();
      res.json({ templates });
    } catch (error) {
      res.status(400).json({ message: "Failed to get plan templates" });
    }
  });

  // Create a new plan template (Admin)
  app.post("/api/admin/bnsl/templates", async (req, res) => {
    try {
      const { name, description, tenorMonths, marginAnnualPercent, minGoldGrams, maxGoldGrams, earlyTerminationPenaltyPercent, adminFeePercent, displayOrder } = req.body;
      
      const template = await storage.createBnslPlanTemplate({
        name,
        description,
        tenorMonths,
        marginAnnualPercent,
        minGoldGrams: minGoldGrams || '1',
        maxGoldGrams,
        earlyTerminationPenaltyPercent: earlyTerminationPenaltyPercent || '2',
        adminFeePercent: adminFeePercent || '1',
        isActive: true,
        displayOrder: displayOrder || 0,
      });
      
      res.json({ template });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create plan template" });
    }
  });

  // Update a plan template (Admin)
  app.patch("/api/admin/bnsl/templates/:id", async (req, res) => {
    try {
      const template = await storage.updateBnslPlanTemplate(req.params.id, req.body);
      if (!template) {
        return res.status(404).json({ message: "Plan template not found" });
      }
      res.json({ template });
    } catch (error) {
      res.status(400).json({ message: "Failed to update plan template" });
    }
  });

  // Delete a plan template (Admin)
  app.delete("/api/admin/bnsl/templates/:id", async (req, res) => {
    try {
      await storage.deleteBnslPlanTemplate(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ message: "Failed to delete plan template" });
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
  // REFERRAL PROGRAM
  // ============================================================================

  // Get user's referral info and stats
  app.get("/api/referrals/:userId", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const referrals = await storage.getUserReferrals(req.params.userId);
      const stats = await storage.getReferralStats(req.params.userId);
      
      res.json({ 
        referralCode: user.referralCode,
        referrals,
        stats
      });
    } catch (error) {
      res.status(400).json({ message: "Failed to get referral info" });
    }
  });

  // Validate a referral code
  app.get("/api/referrals/validate/:code", async (req, res) => {
    try {
      const referrer = await storage.getUserByReferralCode(req.params.code);
      if (!referrer) {
        return res.json({ valid: false });
      }
      res.json({ 
        valid: true, 
        referrerName: `${referrer.firstName} ${referrer.lastName.charAt(0)}.`
      });
    } catch (error) {
      res.status(400).json({ message: "Failed to validate code" });
    }
  });

  // Complete a referral (called when referred user completes first transaction)
  app.post("/api/referrals/complete", async (req, res) => {
    try {
      const { referredUserId, referralCode } = req.body;
      
      const referrer = await storage.getUserByReferralCode(referralCode);
      if (!referrer) {
        return res.status(400).json({ message: "Invalid referral code" });
      }

      // Credit bonus to both users' wallets (0.5g gold each)
      const bonusGold = 0.5;
      
      // Get referrer's wallet
      const referrerWallet = await storage.getWallet(referrer.id);
      if (referrerWallet) {
        const newGold = parseFloat(referrerWallet.goldGrams) + bonusGold;
        await storage.updateWallet(referrerWallet.id, { goldGrams: newGold.toFixed(6) });
      }

      // Get referred user's wallet
      const referredWallet = await storage.getWallet(referredUserId);
      if (referredWallet) {
        const newGold = parseFloat(referredWallet.goldGrams) + bonusGold;
        await storage.updateWallet(referredWallet.id, { goldGrams: newGold.toFixed(6) });
      }

      // Create referral record
      await storage.createReferral({
        referrerId: referrer.id,
        referredId: referredUserId,
        referralCode: referralCode,
        status: 'Completed',
        bonusGoldGrams: bonusGold.toString(),
        referrerBonusPaid: true,
        referredBonusPaid: true,
        completedAt: new Date(),
      });

      res.json({ success: true, bonusGold });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to complete referral" });
    }
  });

  // ============================================================================
  // DASHBOARD LAYOUTS
  // ============================================================================

  // Get user's dashboard layout
  app.get("/api/dashboard/layout/:userId", async (req, res) => {
    try {
      const layout = await storage.getDashboardLayout(req.params.userId);
      res.json({ layout: layout?.layout || null });
    } catch (error) {
      res.status(400).json({ message: "Failed to get dashboard layout" });
    }
  });

  // Save user's dashboard layout
  app.post("/api/dashboard/layout/:userId", async (req, res) => {
    try {
      const saved = await storage.saveDashboardLayout(req.params.userId, req.body.layout);
      res.json({ layout: saved });
    } catch (error) {
      res.status(400).json({ message: "Failed to save dashboard layout" });
    }
  });

  // ============================================================================
  // BANK ACCOUNTS
  // ============================================================================

  // Get user's bank accounts
  app.get("/api/bank-accounts/:userId", async (req, res) => {
    try {
      const accounts = await storage.getUserBankAccounts(req.params.userId);
      // Don't return full account numbers for security
      const safeAccounts = accounts.map(acc => ({
        ...acc,
        accountNumber: undefined,
      }));
      res.json({ accounts: safeAccounts });
    } catch (error) {
      res.status(400).json({ message: "Failed to get bank accounts" });
    }
  });

  // Create a bank account
  app.post("/api/bank-accounts", async (req, res) => {
    try {
      const { userId, bankName, accountHolderName, accountNumber, ibanOrRouting, swiftCode, country, currency, accountType, label } = req.body;
      
      // Mask the account number (show last 4 digits)
      const maskedAccountNumber = `****${accountNumber.slice(-4)}`;
      
      const account = await storage.createBankAccount({
        userId,
        bankName,
        accountHolderName,
        accountNumber,
        maskedAccountNumber,
        ibanOrRouting,
        swiftCode,
        country,
        currency: currency || 'USD',
        accountType: accountType || 'Checking',
        label,
      });
      
      // Don't return full account number
      res.json({ account: { ...account, accountNumber: undefined } });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create bank account" });
    }
  });

  // Update bank account
  app.patch("/api/bank-accounts/:id", async (req, res) => {
    try {
      const { label, status } = req.body;
      const updates: any = {};
      if (label !== undefined) updates.label = label;
      if (status !== undefined) updates.status = status;
      
      const account = await storage.updateBankAccount(req.params.id, updates);
      if (!account) {
        return res.status(404).json({ message: "Bank account not found" });
      }
      res.json({ account: { ...account, accountNumber: undefined } });
    } catch (error) {
      res.status(400).json({ message: "Failed to update bank account" });
    }
  });

  // Set primary bank account
  app.post("/api/bank-accounts/:id/primary", async (req, res) => {
    try {
      const account = await storage.getBankAccount(req.params.id);
      if (!account) {
        return res.status(404).json({ message: "Bank account not found" });
      }
      await storage.setPrimaryBankAccount(account.userId, req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ message: "Failed to set primary account" });
    }
  });

  // Delete bank account
  app.delete("/api/bank-accounts/:id", async (req, res) => {
    try {
      await storage.deleteBankAccount(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ message: "Failed to delete bank account" });
    }
  });

  // Verify bank account (simulated micro-deposit verification)
  app.post("/api/bank-accounts/:id/verify", async (req, res) => {
    try {
      const { verificationCode } = req.body;
      const account = await storage.getBankAccount(req.params.id);
      
      if (!account) {
        return res.status(404).json({ message: "Bank account not found" });
      }
      
      // For demo purposes, accept any 4-digit code or auto-verify
      if (verificationCode && verificationCode.length === 4) {
        await storage.updateBankAccount(req.params.id, {
          status: 'Verified',
          verifiedAt: new Date(),
        });
        res.json({ success: true, message: "Bank account verified" });
      } else {
        res.status(400).json({ message: "Invalid verification code" });
      }
    } catch (error) {
      res.status(400).json({ message: "Failed to verify bank account" });
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

  return httpServer;
}
