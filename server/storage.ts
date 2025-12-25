import { 
  users, wallets, transactions, vaultHoldings, kycSubmissions,
  bnslPlans, bnslPayouts, bnslEarlyTerminations, bnslWallets,
  bnslPlanTemplates, bnslTemplateVariants, bnslAgreements, finabridgeAgreements,
  tradeCases, tradeDocuments,
  tradeRequests, tradeProposals, forwardedProposals, tradeConfirmations,
  finabridgeWallets, settlementHolds, dealRooms, dealRoomMessages,
  chatSessions, chatMessages, auditLogs, certificates, allocations,
  contentPages, contentBlocks, templates, mediaAssets, cmsLabels,
  platformBankAccounts, platformFees, depositRequests, withdrawalRequests,
  peerTransfers, peerRequests,
  vaultDepositRequests, vaultWithdrawalRequests,
  binanceTransactions,
  ngeniusTransactions,
  paymentGatewaySettings,
  brandingSettings,
  employees, rolePermissions,
  securitySettings, otpVerifications, userPasskeys,
  invoices, certificateDeliveries, adminActionOtps,
  userRiskProfiles, amlScreeningLogs, amlCases, amlCaseActivities, amlMonitoringRules,
  complianceSettings, finatradesPersonalKyc, finatradesCorporateKyc,
  type User, type InsertUser,
  type Wallet, type InsertWallet,
  type Transaction, type InsertTransaction,
  type VaultHolding, type InsertVaultHolding,
  type KycSubmission, type InsertKycSubmission,
  type BnslPlan, type InsertBnslPlan,
  type BnslPayout, type InsertBnslPayout,
  type BnslEarlyTermination, type InsertBnslEarlyTermination,
  type BnslWallet, type InsertBnslWallet,
  type BnslPlanTemplate, type InsertBnslPlanTemplate,
  type BnslTemplateVariant, type InsertBnslTemplateVariant,
  type BnslAgreement, type InsertBnslAgreement,
  type FinabridgeAgreement, type InsertFinabridgeAgreement,
  type TradeCase, type InsertTradeCase,
  type TradeDocument, type InsertTradeDocument,
  type TradeRequest, type InsertTradeRequest,
  type TradeProposal, type InsertTradeProposal,
  type ForwardedProposal, type InsertForwardedProposal,
  type TradeConfirmation, type InsertTradeConfirmation,
  type FinabridgeWallet, type InsertFinabridgeWallet,
  type SettlementHold, type InsertSettlementHold,
  type DealRoom, type InsertDealRoom,
  type DealRoomMessage, type InsertDealRoomMessage,
  type DealRoomAgreementAcceptance, type InsertDealRoomAgreementAcceptance,
  dealRoomAgreementAcceptances,
  type ChatAgent, type InsertChatAgent,
  type ChatAgentWorkflow, type InsertChatAgentWorkflow,
  type ChatSession, type InsertChatSession,
  type ChatMessage, type InsertChatMessage,
  chatAgents, chatAgentWorkflows,
  type KnowledgeCategory, type InsertKnowledgeCategory,
  type KnowledgeArticle, type InsertKnowledgeArticle,
  knowledgeCategories, knowledgeArticles,
  type AuditLog, type InsertAuditLog,
  type Certificate, type InsertCertificate,
  type Allocation, type InsertAllocation,
  type ContentPage, type InsertContentPage,
  type ContentBlock, type InsertContentBlock,
  type Template, type InsertTemplate,
  type MediaAsset, type InsertMediaAsset,
  type CmsLabel, type InsertCmsLabel,
  type PlatformBankAccount, type InsertPlatformBankAccount,
  type PlatformFee, type InsertPlatformFee,
  type DepositRequest, type InsertDepositRequest,
  type WithdrawalRequest, type InsertWithdrawalRequest,
  type PeerTransfer, type InsertPeerTransfer,
  type PeerRequest, type InsertPeerRequest,
  type VaultDepositRequest, type InsertVaultDepositRequest,
  type VaultWithdrawalRequest, type InsertVaultWithdrawalRequest,
  type BinanceTransaction, type InsertBinanceTransaction,
  type NgeniusTransaction, type InsertNgeniusTransaction,
  type PaymentGatewaySettings, type InsertPaymentGatewaySettings,
  type BrandingSettings, type InsertBrandingSettings,
  type Employee, type InsertEmployee,
  type RolePermission, type InsertRolePermission,
  type SecuritySettings, type InsertSecuritySettings,
  type OtpVerification, type InsertOtpVerification,
  type UserPasskey, type InsertUserPasskey,
  type Invoice, type InsertInvoice,
  type CertificateDelivery, type InsertCertificateDelivery,
  type AdminActionOtp, type InsertAdminActionOtp,
  passwordResetTokens,
  type PasswordResetToken, type InsertPasswordResetToken,
  referrals,
  type Referral, type InsertReferral,
  type UserRiskProfile, type InsertUserRiskProfile,
  type AmlScreeningLog, type InsertAmlScreeningLog,
  type AmlCase, type InsertAmlCase,
  type AmlCaseActivity, type InsertAmlCaseActivity,
  type AmlMonitoringRule, type InsertAmlMonitoringRule,
  type ComplianceSettings, type InsertComplianceSettings,
  type FinatradesPersonalKyc, type InsertFinatradesPersonalKyc,
  type FinatradesCorporateKyc, type InsertFinatradesCorporateKyc,
  notifications,
  type Notification, type InsertNotification,
  userPreferences,
  type UserPreferences, type InsertUserPreferences,
  cryptoWalletConfigs, cryptoPaymentRequests,
  type CryptoWalletConfig, type InsertCryptoWalletConfig,
  type CryptoPaymentRequest, type InsertCryptoPaymentRequest,
  buyGoldRequests,
  type BuyGoldRequest, type InsertBuyGoldRequest,
  platformConfig,
  type PlatformConfig, type InsertPlatformConfig,
  emailNotificationSettings,
  emailLogs,
  type EmailNotificationSetting, type InsertEmailNotificationSetting,
  type EmailLog, type InsertEmailLog
} from "@shared/schema";
import { db, pool } from "./db";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, desc, and, or, sql, inArray } from "drizzle-orm";
import * as schema from "@shared/schema";

export type DbClient = typeof db;

export interface TransactionalStorage {
  updateWallet(id: string, updates: Partial<Wallet>): Promise<Wallet | undefined>;
  createTransaction(insertTransaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction | undefined>;
  createVaultHolding(insertHolding: InsertVaultHolding): Promise<VaultHolding>;
  updateVaultHolding(id: string, updates: Partial<VaultHolding>): Promise<VaultHolding | undefined>;
  createCertificate(insertCertificate: InsertCertificate): Promise<Certificate>;
  updateCertificate(id: string, updates: Partial<Certificate>): Promise<Certificate | undefined>;
  createAuditLog(insertLog: InsertAuditLog): Promise<AuditLog>;
  generateCertificateNumber(type: 'Digital Ownership' | 'Physical Storage'): Promise<string>;
  getUserVaultHoldings(userId: string): Promise<VaultHolding[]>;
  getUserActiveCertificates(userId: string): Promise<Certificate[]>;
  getWallet(userId: string): Promise<Wallet | undefined>;
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createPeerTransfer(insertTransfer: InsertPeerTransfer): Promise<PeerTransfer>;
  createInvoice(insertInvoice: InsertInvoice): Promise<Invoice>;
  createCertificateDelivery(insertDelivery: InsertCertificateDelivery): Promise<CertificateDelivery>;
  generateInvoiceNumber(): Promise<string>;
}

function createTransactionalStorage(txDb: DbClient): TransactionalStorage {
  return {
    async updateWallet(id: string, updates: Partial<Wallet>): Promise<Wallet | undefined> {
      const [wallet] = await txDb.update(wallets).set({ ...updates, updatedAt: new Date() }).where(eq(wallets.id, id)).returning();
      return wallet || undefined;
    },
    async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
      const [transaction] = await txDb.insert(transactions).values(insertTransaction).returning();
      return transaction;
    },
    async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction | undefined> {
      const [transaction] = await txDb.update(transactions).set({ ...updates, updatedAt: new Date() }).where(eq(transactions.id, id)).returning();
      return transaction || undefined;
    },
    async createVaultHolding(insertHolding: InsertVaultHolding): Promise<VaultHolding> {
      const [holding] = await txDb.insert(vaultHoldings).values(insertHolding).returning();
      return holding;
    },
    async updateVaultHolding(id: string, updates: Partial<VaultHolding>): Promise<VaultHolding | undefined> {
      const [holding] = await txDb.update(vaultHoldings).set({ ...updates, updatedAt: new Date() }).where(eq(vaultHoldings.id, id)).returning();
      return holding || undefined;
    },
    async createCertificate(insertCertificate: InsertCertificate): Promise<Certificate> {
      const [certificate] = await txDb.insert(certificates).values(insertCertificate).returning();
      return certificate;
    },
    async updateCertificate(id: string, updates: Partial<Certificate>): Promise<Certificate | undefined> {
      const [certificate] = await txDb.update(certificates).set(updates).where(eq(certificates.id, id)).returning();
      return certificate || undefined;
    },
    async createAuditLog(insertLog: InsertAuditLog): Promise<AuditLog> {
      const [log] = await txDb.insert(auditLogs).values(insertLog).returning();
      return log;
    },
    async generateCertificateNumber(type: 'Digital Ownership' | 'Physical Storage'): Promise<string> {
      const prefix = type === 'Digital Ownership' ? 'FT-DOC' : 'WG-PSC';
      const timestamp = Date.now().toString(36).toUpperCase();
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      return `${prefix}-${timestamp}-${random}`;
    },
    async getUserVaultHoldings(userId: string): Promise<VaultHolding[]> {
      return await txDb.select().from(vaultHoldings).where(eq(vaultHoldings.userId, userId)).orderBy(desc(vaultHoldings.createdAt));
    },
    async getUserActiveCertificates(userId: string): Promise<Certificate[]> {
      return await txDb.select().from(certificates).where(and(eq(certificates.userId, userId), eq(certificates.status, 'Active'))).orderBy(desc(certificates.issuedAt));
    },
    async getWallet(userId: string): Promise<Wallet | undefined> {
      const [wallet] = await txDb.select().from(wallets).where(eq(wallets.userId, userId));
      return wallet || undefined;
    },
    async getUser(id: string): Promise<User | undefined> {
      const [user] = await txDb.select().from(users).where(eq(users.id, id));
      return user || undefined;
    },
    async getUserByEmail(email: string): Promise<User | undefined> {
      const [user] = await txDb.select().from(users).where(eq(users.email, email));
      return user || undefined;
    },
    async createPeerTransfer(insertTransfer: InsertPeerTransfer): Promise<PeerTransfer> {
      const [transfer] = await txDb.insert(peerTransfers).values(insertTransfer).returning();
      return transfer;
    },
    async createInvoice(insertInvoice: InsertInvoice): Promise<Invoice> {
      const [invoice] = await txDb.insert(invoices).values(insertInvoice).returning();
      return invoice;
    },
    async createCertificateDelivery(insertDelivery: InsertCertificateDelivery): Promise<CertificateDelivery> {
      const [delivery] = await txDb.insert(certificateDeliveries).values(insertDelivery).returning();
      return delivery;
    },
    async generateInvoiceNumber(): Promise<string> {
      const prefix = 'INV';
      const timestamp = Date.now().toString(36).toUpperCase();
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      return `${prefix}-${timestamp}-${random}`;
    }
  };
}

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  getAdminUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  
  // KYC
  getKycSubmission(userId: string): Promise<KycSubmission | undefined>;
  createKycSubmission(submission: InsertKycSubmission): Promise<KycSubmission>;
  updateKycSubmission(id: string, updates: Partial<KycSubmission>): Promise<KycSubmission | undefined>;
  getAllKycSubmissions(): Promise<KycSubmission[]>;
  
  // Wallets
  getWallet(userId: string): Promise<Wallet | undefined>;
  createWallet(wallet: InsertWallet): Promise<Wallet>;
  updateWallet(id: string, updates: Partial<Wallet>): Promise<Wallet | undefined>;
  
  // Transactions
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getTransaction(id: string): Promise<Transaction | undefined>;
  getUserTransactions(userId: string): Promise<Transaction[]>;
  getAllTransactions(): Promise<Transaction[]>;
  updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction | undefined>;
  
  // Vault Holdings
  getVaultHolding(id: string): Promise<VaultHolding | undefined>;
  getUserVaultHoldings(userId: string): Promise<VaultHolding[]>;
  getAllVaultHoldings(): Promise<VaultHolding[]>;
  createVaultHolding(holding: InsertVaultHolding): Promise<VaultHolding>;
  updateVaultHolding(id: string, updates: Partial<VaultHolding>): Promise<VaultHolding | undefined>;
  
  // BNSL Plans
  getBnslPlan(id: string): Promise<BnslPlan | undefined>;
  getUserBnslPlans(userId: string): Promise<BnslPlan[]>;
  getAllBnslPlans(): Promise<BnslPlan[]>;
  createBnslPlan(plan: InsertBnslPlan): Promise<BnslPlan>;
  updateBnslPlan(id: string, updates: Partial<BnslPlan>): Promise<BnslPlan | undefined>;
  
  // BNSL Payouts
  getUserBnslPayouts(userId: string): Promise<BnslPayout[]>;
  getAllBnslPayouts(): Promise<BnslPayout[]>;
  
  // Peer Transfers
  getPeerTransfers(userId: string): Promise<PeerTransfer[]>;
  
  // BNSL Payouts
  getBnslPayout(id: string): Promise<BnslPayout | undefined>;
  getPlanPayouts(planId: string): Promise<BnslPayout[]>;
  createBnslPayout(payout: InsertBnslPayout): Promise<BnslPayout>;
  updateBnslPayout(id: string, updates: Partial<BnslPayout>): Promise<BnslPayout | undefined>;
  
  // BNSL Early Terminations
  getBnslEarlyTermination(planId: string): Promise<BnslEarlyTermination | undefined>;
  createBnslEarlyTermination(termination: InsertBnslEarlyTermination): Promise<BnslEarlyTermination>;
  updateBnslEarlyTermination(id: string, updates: Partial<BnslEarlyTermination>): Promise<BnslEarlyTermination | undefined>;
  
  // BNSL Wallets
  getBnslWallet(userId: string): Promise<BnslWallet | undefined>;
  createBnslWallet(wallet: InsertBnslWallet): Promise<BnslWallet>;
  updateBnslWallet(id: string, updates: Partial<BnslWallet>): Promise<BnslWallet | undefined>;
  getOrCreateBnslWallet(userId: string): Promise<BnslWallet>;
  
  // BNSL Plan Templates
  getBnslPlanTemplate(id: string): Promise<BnslPlanTemplate | undefined>;
  getAllBnslPlanTemplates(): Promise<BnslPlanTemplate[]>;
  getActiveBnslPlanTemplates(): Promise<BnslPlanTemplate[]>;
  createBnslPlanTemplate(template: InsertBnslPlanTemplate): Promise<BnslPlanTemplate>;
  updateBnslPlanTemplate(id: string, updates: Partial<BnslPlanTemplate>): Promise<BnslPlanTemplate | undefined>;
  deleteBnslPlanTemplate(id: string): Promise<boolean>;
  
  // BNSL Template Variants
  getBnslTemplateVariant(id: string): Promise<BnslTemplateVariant | undefined>;
  getTemplateVariants(templateId: string): Promise<BnslTemplateVariant[]>;
  createBnslTemplateVariant(variant: InsertBnslTemplateVariant): Promise<BnslTemplateVariant>;
  updateBnslTemplateVariant(id: string, updates: Partial<BnslTemplateVariant>): Promise<BnslTemplateVariant | undefined>;
  deleteBnslTemplateVariant(id: string): Promise<boolean>;
  
  // BNSL Agreements
  getBnslAgreement(id: string): Promise<BnslAgreement | undefined>;
  getBnslAgreementByPlanId(planId: string): Promise<BnslAgreement | undefined>;
  getUserBnslAgreements(userId: string): Promise<BnslAgreement[]>;
  getAllBnslAgreements(): Promise<BnslAgreement[]>;
  createBnslAgreement(agreement: InsertBnslAgreement): Promise<BnslAgreement>;
  updateBnslAgreement(id: string, updates: Partial<BnslAgreement>): Promise<BnslAgreement | undefined>;
  
  // FinaBridge Agreements
  getFinabridgeAgreement(id: string): Promise<FinabridgeAgreement | undefined>;
  getUserFinabridgeAgreements(userId: string): Promise<FinabridgeAgreement[]>;
  getAllFinabridgeAgreements(): Promise<FinabridgeAgreement[]>;
  createFinabridgeAgreement(agreement: InsertFinabridgeAgreement): Promise<FinabridgeAgreement>;
  
  // Trade Cases
  getTradeCase(id: string): Promise<TradeCase | undefined>;
  getUserTradeCases(userId: string): Promise<TradeCase[]>;
  getAllTradeCases(): Promise<TradeCase[]>;
  createTradeCase(tradeCase: InsertTradeCase): Promise<TradeCase>;
  updateTradeCase(id: string, updates: Partial<TradeCase>): Promise<TradeCase | undefined>;
  
  // Trade Documents
  getCaseDocuments(caseId: string): Promise<TradeDocument[]>;
  createTradeDocument(document: InsertTradeDocument): Promise<TradeDocument>;
  updateTradeDocument(id: string, updates: Partial<TradeDocument>): Promise<TradeDocument | undefined>;
  
  // Trade Requests (FinaBridge Matching)
  getTradeRequest(id: string): Promise<TradeRequest | undefined>;
  getTradeRequestByRef(tradeRefId: string): Promise<TradeRequest | undefined>;
  getUserTradeRequests(userId: string): Promise<TradeRequest[]>;
  getOpenTradeRequests(): Promise<TradeRequest[]>;
  getAllTradeRequests(): Promise<TradeRequest[]>;
  createTradeRequest(request: InsertTradeRequest): Promise<TradeRequest>;
  updateTradeRequest(id: string, updates: Partial<TradeRequest>): Promise<TradeRequest | undefined>;
  
  // Trade Proposals
  getTradeProposal(id: string): Promise<TradeProposal | undefined>;
  getRequestProposals(tradeRequestId: string): Promise<TradeProposal[]>;
  getExporterProposals(exporterUserId: string): Promise<TradeProposal[]>;
  createTradeProposal(proposal: InsertTradeProposal): Promise<TradeProposal>;
  updateTradeProposal(id: string, updates: Partial<TradeProposal>): Promise<TradeProposal | undefined>;
  
  // Forwarded Proposals
  getForwardedProposals(tradeRequestId: string): Promise<ForwardedProposal[]>;
  createForwardedProposal(forwarded: InsertForwardedProposal): Promise<ForwardedProposal>;
  removeForwardedProposal(proposalId: string): Promise<void>;
  
  // Trade Confirmations
  getTradeConfirmation(tradeRequestId: string): Promise<TradeConfirmation | undefined>;
  createTradeConfirmation(confirmation: InsertTradeConfirmation): Promise<TradeConfirmation>;
  
  // FinaBridge Wallets
  getFinabridgeWallet(userId: string): Promise<FinabridgeWallet | undefined>;
  createFinabridgeWallet(wallet: InsertFinabridgeWallet): Promise<FinabridgeWallet>;
  updateFinabridgeWallet(id: string, updates: Partial<FinabridgeWallet>): Promise<FinabridgeWallet | undefined>;
  getOrCreateFinabridgeWallet(userId: string): Promise<FinabridgeWallet>;
  
  // Settlement Holds
  getSettlementHold(id: string): Promise<SettlementHold | undefined>;
  getTradeSettlementHold(tradeRequestId: string): Promise<SettlementHold | undefined>;
  getUserSettlementHolds(userId: string): Promise<SettlementHold[]>;
  getExporterSettlementHolds(exporterUserId: string): Promise<SettlementHold[]>;
  getAllSettlementHolds(): Promise<SettlementHold[]>;
  createSettlementHold(hold: InsertSettlementHold): Promise<SettlementHold>;
  updateSettlementHold(id: string, updates: Partial<SettlementHold>): Promise<SettlementHold | undefined>;
  
  // Deal Rooms
  getDealRoom(id: string): Promise<DealRoom | undefined>;
  getDealRoomByTradeRequest(tradeRequestId: string): Promise<DealRoom | undefined>;
  getUserDealRooms(userId: string): Promise<DealRoom[]>;
  createDealRoom(room: InsertDealRoom): Promise<DealRoom>;
  updateDealRoom(id: string, updates: Partial<DealRoom>): Promise<DealRoom | undefined>;
  getAllDealRooms(): Promise<DealRoom[]>;
  
  // Deal Room Messages
  getDealRoomMessages(dealRoomId: string): Promise<DealRoomMessage[]>;
  createDealRoomMessage(message: InsertDealRoomMessage): Promise<DealRoomMessage>;
  markDealRoomMessagesAsRead(dealRoomId: string, userId: string): Promise<void>;
  getUnreadDealRoomMessageCount(dealRoomId: string, userId: string): Promise<number>;
  
  // Deal Room Agreement Acceptances
  getDealRoomAgreementAcceptance(dealRoomId: string, userId: string): Promise<DealRoomAgreementAcceptance | undefined>;
  getDealRoomAgreementAcceptances(dealRoomId: string): Promise<DealRoomAgreementAcceptance[]>;
  createDealRoomAgreementAcceptance(acceptance: InsertDealRoomAgreementAcceptance): Promise<DealRoomAgreementAcceptance>;
  closeDealRoom(id: string, closedBy: string, closureNotes?: string): Promise<DealRoom | undefined>;
  
  // Chat Agents
  getChatAgent(id: string): Promise<ChatAgent | undefined>;
  getChatAgentByType(type: string): Promise<ChatAgent | undefined>;
  getAllChatAgents(): Promise<ChatAgent[]>;
  getActiveChatAgents(): Promise<ChatAgent[]>;
  getDefaultChatAgent(): Promise<ChatAgent | undefined>;
  createChatAgent(agent: InsertChatAgent): Promise<ChatAgent>;
  updateChatAgent(id: string, updates: Partial<ChatAgent>): Promise<ChatAgent | undefined>;
  seedDefaultChatAgents(): Promise<void>;
  
  // Chat Agent Workflows
  getChatAgentWorkflow(id: string): Promise<ChatAgentWorkflow | undefined>;
  getSessionWorkflow(sessionId: string): Promise<ChatAgentWorkflow | undefined>;
  getUserActiveWorkflow(userId: string, workflowType: string): Promise<ChatAgentWorkflow | undefined>;
  createChatAgentWorkflow(workflow: InsertChatAgentWorkflow): Promise<ChatAgentWorkflow>;
  updateChatAgentWorkflow(id: string, updates: Partial<ChatAgentWorkflow>): Promise<ChatAgentWorkflow | undefined>;
  
  // Knowledge Base
  getKnowledgeCategory(id: string): Promise<KnowledgeCategory | undefined>;
  getAllKnowledgeCategories(): Promise<KnowledgeCategory[]>;
  createKnowledgeCategory(category: InsertKnowledgeCategory): Promise<KnowledgeCategory>;
  updateKnowledgeCategory(id: string, updates: Partial<KnowledgeCategory>): Promise<KnowledgeCategory | undefined>;
  deleteKnowledgeCategory(id: string): Promise<boolean>;
  
  getKnowledgeArticle(id: string): Promise<KnowledgeArticle | undefined>;
  getAllKnowledgeArticles(): Promise<KnowledgeArticle[]>;
  getPublishedKnowledgeArticles(): Promise<KnowledgeArticle[]>;
  getKnowledgeArticlesByCategory(categoryId: string): Promise<KnowledgeArticle[]>;
  searchKnowledgeArticles(query: string, agentType?: string): Promise<KnowledgeArticle[]>;
  createKnowledgeArticle(article: InsertKnowledgeArticle): Promise<KnowledgeArticle>;
  updateKnowledgeArticle(id: string, updates: Partial<KnowledgeArticle>): Promise<KnowledgeArticle | undefined>;
  deleteKnowledgeArticle(id: string): Promise<boolean>;
  incrementArticleViewCount(id: string): Promise<void>;
  incrementArticleHelpfulCount(id: string): Promise<void>;
  seedDefaultKnowledgeBase(): Promise<void>;
  
  // Chat
  getChatSession(userId: string): Promise<ChatSession | undefined>;
  getChatSessionById(id: string): Promise<ChatSession | undefined>;
  getChatSessionByGuest(guestName?: string, guestEmail?: string): Promise<ChatSession | undefined>;
  getAllChatSessions(): Promise<ChatSession[]>;
  createChatSession(session: InsertChatSession): Promise<ChatSession>;
  updateChatSession(id: string, updates: Partial<ChatSession>): Promise<ChatSession | undefined>;
  
  getSessionMessages(sessionId: string): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  markMessagesAsRead(sessionId: string): Promise<void>;
  
  // Audit Logs
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getEntityAuditLogs(entityType: string, entityId: string): Promise<AuditLog[]>;
  
  // Certificates
  createCertificate(certificate: InsertCertificate): Promise<Certificate>;
  getCertificate(id: string): Promise<Certificate | undefined>;
  getCertificateByNumber(certificateNumber: string): Promise<Certificate | undefined>;
  getCertificatesByTransactionId(transactionId: string): Promise<Certificate[]>;
  getCertificatesByRelatedId(relatedCertificateId: string): Promise<Certificate[]>;
  getUserCertificates(userId: string): Promise<Certificate[]>;
  getUserActiveCertificates(userId: string): Promise<Certificate[]>;
  getAllCertificates(): Promise<Certificate[]>;
  updateCertificate(id: string, updates: Partial<Certificate>): Promise<Certificate | undefined>;
  generateCertificateNumber(type: 'Digital Ownership' | 'Physical Storage'): Promise<string>;
  
  // FinaPay - Platform Bank Accounts
  getPlatformBankAccount(id: string): Promise<PlatformBankAccount | undefined>;
  getAllPlatformBankAccounts(): Promise<PlatformBankAccount[]>;
  getActivePlatformBankAccounts(): Promise<PlatformBankAccount[]>;
  createPlatformBankAccount(account: InsertPlatformBankAccount): Promise<PlatformBankAccount>;
  updatePlatformBankAccount(id: string, updates: Partial<PlatformBankAccount>): Promise<PlatformBankAccount | undefined>;
  deletePlatformBankAccount(id: string): Promise<boolean>;
  
  // Platform Fees
  getPlatformFee(id: string): Promise<PlatformFee | undefined>;
  getPlatformFeeByKey(module: string, feeKey: string): Promise<PlatformFee | undefined>;
  getAllPlatformFees(): Promise<PlatformFee[]>;
  getModuleFees(module: string): Promise<PlatformFee[]>;
  getActivePlatformFees(): Promise<PlatformFee[]>;
  createPlatformFee(fee: InsertPlatformFee): Promise<PlatformFee>;
  updatePlatformFee(id: string, updates: Partial<PlatformFee>): Promise<PlatformFee | undefined>;
  deletePlatformFee(id: string): Promise<boolean>;
  seedDefaultFees(): Promise<void>;
  
  // FinaPay - Deposit Requests
  getDepositRequest(id: string): Promise<DepositRequest | undefined>;
  getUserDepositRequests(userId: string): Promise<DepositRequest[]>;
  getAllDepositRequests(): Promise<DepositRequest[]>;
  createDepositRequest(request: InsertDepositRequest): Promise<DepositRequest>;
  updateDepositRequest(id: string, updates: Partial<DepositRequest>): Promise<DepositRequest | undefined>;
  
  // FinaPay - Withdrawal Requests
  getWithdrawalRequest(id: string): Promise<WithdrawalRequest | undefined>;
  getUserWithdrawalRequests(userId: string): Promise<WithdrawalRequest[]>;
  getAllWithdrawalRequests(): Promise<WithdrawalRequest[]>;
  createWithdrawalRequest(request: InsertWithdrawalRequest): Promise<WithdrawalRequest>;
  updateWithdrawalRequest(id: string, updates: Partial<WithdrawalRequest>): Promise<WithdrawalRequest | undefined>;
  
  // CMS - Content Pages
  getContentPage(id: string): Promise<ContentPage | undefined>;
  getContentPageBySlug(slug: string): Promise<ContentPage | undefined>;
  getAllContentPages(): Promise<ContentPage[]>;
  createContentPage(page: InsertContentPage): Promise<ContentPage>;
  updateContentPage(id: string, updates: Partial<ContentPage>): Promise<ContentPage | undefined>;
  deleteContentPage(id: string): Promise<boolean>;
  
  // CMS - Content Blocks
  getContentBlock(id: string): Promise<ContentBlock | undefined>;
  getPageContentBlocks(pageId: string): Promise<ContentBlock[]>;
  getContentBlockByKey(pageId: string, section: string, key: string): Promise<ContentBlock | undefined>;
  getAllContentBlocks(): Promise<ContentBlock[]>;
  createContentBlock(block: InsertContentBlock): Promise<ContentBlock>;
  updateContentBlock(id: string, updates: Partial<ContentBlock>): Promise<ContentBlock | undefined>;
  deleteContentBlock(id: string): Promise<boolean>;
  
  // CMS - Templates
  getTemplate(id: string): Promise<Template | undefined>;
  getTemplateBySlug(slug: string): Promise<Template | undefined>;
  getAllTemplates(): Promise<Template[]>;
  getTemplatesByType(type: string): Promise<Template[]>;
  createTemplate(template: InsertTemplate): Promise<Template>;
  updateTemplate(id: string, updates: Partial<Template>): Promise<Template | undefined>;
  deleteTemplate(id: string): Promise<boolean>;
  
  // CMS - Labels
  getAllCmsLabels(): Promise<CmsLabel[]>;
  getCmsLabel(key: string): Promise<CmsLabel | undefined>;
  upsertCmsLabel(label: InsertCmsLabel): Promise<CmsLabel>;
  
  // CMS - Media Assets
  getMediaAsset(id: string): Promise<MediaAsset | undefined>;
  getAllMediaAssets(): Promise<MediaAsset[]>;
  createMediaAsset(asset: InsertMediaAsset): Promise<MediaAsset>;
  deleteMediaAsset(id: string): Promise<boolean>;
  
  // Branding Settings
  getBrandingSettings(): Promise<BrandingSettings | undefined>;
  getOrCreateBrandingSettings(): Promise<BrandingSettings>;
  updateBrandingSettings(updates: Partial<BrandingSettings>): Promise<BrandingSettings | undefined>;
  
  // Employees
  getEmployee(id: string): Promise<Employee | undefined>;
  getEmployeeByUserId(userId: string): Promise<Employee | undefined>;
  getEmployeeByEmployeeId(employeeId: string): Promise<Employee | undefined>;
  getAllEmployees(): Promise<Employee[]>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(id: string, updates: Partial<Employee>): Promise<Employee | undefined>;
  deleteEmployee(id: string): Promise<boolean>;
  generateEmployeeId(): Promise<string>;
  
  // Role Permissions
  getRolePermission(role: string): Promise<RolePermission | undefined>;
  getAllRolePermissions(): Promise<RolePermission[]>;
  createRolePermission(permission: InsertRolePermission): Promise<RolePermission>;
  updateRolePermission(id: string, updates: Partial<RolePermission>): Promise<RolePermission | undefined>;
  
  // Security Settings
  getSecuritySettings(): Promise<SecuritySettings | undefined>;
  getOrCreateSecuritySettings(): Promise<SecuritySettings>;
  updateSecuritySettings(updates: Partial<SecuritySettings>): Promise<SecuritySettings | undefined>;
  
  // OTP Verifications
  createOtpVerification(otp: InsertOtpVerification): Promise<OtpVerification>;
  getOtpVerification(id: string): Promise<OtpVerification | undefined>;
  getPendingOtp(userId: string, action: string): Promise<OtpVerification | undefined>;
  updateOtpVerification(id: string, updates: Partial<OtpVerification>): Promise<OtpVerification | undefined>;
  
  // User Passkeys
  createUserPasskey(passkey: InsertUserPasskey): Promise<UserPasskey>;
  getUserPasskeys(userId: string): Promise<UserPasskey[]>;
  getPasskeyByCredentialId(credentialId: string): Promise<UserPasskey | undefined>;
  updateUserPasskey(id: string, updates: Partial<UserPasskey>): Promise<UserPasskey | undefined>;
  deleteUserPasskey(id: string): Promise<boolean>;
  
  // Invoices
  getInvoice(id: string): Promise<Invoice | undefined>;
  getInvoiceByNumber(invoiceNumber: string): Promise<Invoice | undefined>;
  getInvoiceByTransaction(transactionId: string): Promise<Invoice | undefined>;
  getUserInvoices(userId: string): Promise<Invoice[]>;
  getAllInvoices(): Promise<Invoice[]>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice | undefined>;
  generateInvoiceNumber(): Promise<string>;
  
  // Certificate Deliveries
  getCertificateDelivery(id: string): Promise<CertificateDelivery | undefined>;
  getCertificateDeliveryByCertificate(certificateId: string): Promise<CertificateDelivery | undefined>;
  getUserCertificateDeliveries(userId: string): Promise<CertificateDelivery[]>;
  getAllCertificateDeliveries(): Promise<CertificateDelivery[]>;
  createCertificateDelivery(delivery: InsertCertificateDelivery): Promise<CertificateDelivery>;
  updateCertificateDelivery(id: string, updates: Partial<CertificateDelivery>): Promise<CertificateDelivery | undefined>;
  
  // Password Reset Tokens
  createPasswordResetToken(token: InsertPasswordResetToken): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  markPasswordResetTokenUsed(id: string): Promise<void>;
  
  // Referrals
  getReferral(id: string): Promise<Referral | undefined>;
  getReferralByCode(code: string): Promise<Referral | undefined>;
  getPendingReferralByReferredId(referredId: string): Promise<Referral | undefined>;
  getUserReferrals(referrerId: string): Promise<Referral[]>;
  getAllReferrals(): Promise<Referral[]>;
  createReferral(referral: InsertReferral): Promise<Referral>;
  updateReferral(id: string, updates: Partial<Referral>): Promise<Referral | undefined>;
  
  // Audit Logs (extended)
  getAllAuditLogs(): Promise<AuditLog[]>;
  
  // User Risk Profiles
  getUserRiskProfile(userId: string): Promise<UserRiskProfile | undefined>;
  getAllUserRiskProfiles(): Promise<UserRiskProfile[]>;
  getHighRiskProfiles(): Promise<UserRiskProfile[]>;
  createUserRiskProfile(profile: InsertUserRiskProfile): Promise<UserRiskProfile>;
  updateUserRiskProfile(id: string, updates: Partial<UserRiskProfile>): Promise<UserRiskProfile | undefined>;
  getOrCreateUserRiskProfile(userId: string): Promise<UserRiskProfile>;
  
  // AML Screening Logs
  getAmlScreeningLog(id: string): Promise<AmlScreeningLog | undefined>;
  getUserAmlScreeningLogs(userId: string): Promise<AmlScreeningLog[]>;
  getKycSubmissionScreeningLogs(kycSubmissionId: string): Promise<AmlScreeningLog[]>;
  getAllAmlScreeningLogs(): Promise<AmlScreeningLog[]>;
  createAmlScreeningLog(log: InsertAmlScreeningLog): Promise<AmlScreeningLog>;
  updateAmlScreeningLog(id: string, updates: Partial<AmlScreeningLog>): Promise<AmlScreeningLog | undefined>;
  
  // AML Cases
  getAmlCase(id: string): Promise<AmlCase | undefined>;
  getAmlCaseByCaseNumber(caseNumber: string): Promise<AmlCase | undefined>;
  getUserAmlCases(userId: string): Promise<AmlCase[]>;
  getAllAmlCases(): Promise<AmlCase[]>;
  getOpenAmlCases(): Promise<AmlCase[]>;
  createAmlCase(amlCase: InsertAmlCase): Promise<AmlCase>;
  updateAmlCase(id: string, updates: Partial<AmlCase>): Promise<AmlCase | undefined>;
  generateAmlCaseNumber(): Promise<string>;
  
  // AML Case Activities
  getAmlCaseActivities(caseId: string): Promise<AmlCaseActivity[]>;
  createAmlCaseActivity(activity: InsertAmlCaseActivity): Promise<AmlCaseActivity>;
  
  // AML Monitoring Rules
  getAmlMonitoringRule(id: string): Promise<AmlMonitoringRule | undefined>;
  getAmlMonitoringRuleByCode(ruleCode: string): Promise<AmlMonitoringRule | undefined>;
  getAllAmlMonitoringRules(): Promise<AmlMonitoringRule[]>;
  getActiveAmlMonitoringRules(): Promise<AmlMonitoringRule[]>;
  createAmlMonitoringRule(rule: InsertAmlMonitoringRule): Promise<AmlMonitoringRule>;
  updateAmlMonitoringRule(id: string, updates: Partial<AmlMonitoringRule>): Promise<AmlMonitoringRule | undefined>;
  deleteAmlMonitoringRule(id: string): Promise<boolean>;
  
  // Compliance Settings
  getComplianceSettings(): Promise<ComplianceSettings | undefined>;
  getOrCreateComplianceSettings(): Promise<ComplianceSettings>;
  updateComplianceSettings(updates: Partial<ComplianceSettings>): Promise<ComplianceSettings | undefined>;
  
  // Finatrades Personal KYC
  getFinatradesPersonalKyc(userId: string): Promise<FinatradesPersonalKyc | undefined>;
  getAllFinatradesPersonalKyc(): Promise<FinatradesPersonalKyc[]>;
  createFinatradesPersonalKyc(kyc: InsertFinatradesPersonalKyc): Promise<FinatradesPersonalKyc>;
  updateFinatradesPersonalKyc(id: string, updates: Partial<FinatradesPersonalKyc>): Promise<FinatradesPersonalKyc | undefined>;
  
  // Finatrades Corporate KYC
  getFinatradesCorporateKyc(userId: string): Promise<FinatradesCorporateKyc | undefined>;
  getAllFinatradesCorporateKyc(): Promise<FinatradesCorporateKyc[]>;
  createFinatradesCorporateKyc(kyc: InsertFinatradesCorporateKyc): Promise<FinatradesCorporateKyc>;
  updateFinatradesCorporateKyc(id: string, updates: Partial<FinatradesCorporateKyc>): Promise<FinatradesCorporateKyc | undefined>;
  
  // User Notifications
  getNotification(id: string): Promise<Notification | undefined>;
  getUserNotifications(userId: string): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationRead(id: string): Promise<Notification | undefined>;
  markAllNotificationsRead(userId: string): Promise<void>;
  deleteNotification(id: string): Promise<boolean>;
  deleteAllNotifications(userId: string): Promise<void>;
  
  // User Preferences
  getUserPreferences(userId: string): Promise<UserPreferences | undefined>;
  createUserPreferences(preferences: InsertUserPreferences): Promise<UserPreferences>;
  updateUserPreferences(userId: string, updates: Partial<UserPreferences>): Promise<UserPreferences | undefined>;
  getOrCreateUserPreferences(userId: string): Promise<UserPreferences>;
  
  // Platform Configuration
  getPlatformConfig(key: string): Promise<PlatformConfig | undefined>;
  getPlatformConfigsByCategory(category: string): Promise<PlatformConfig[]>;
  getAllPlatformConfigs(): Promise<PlatformConfig[]>;
  createPlatformConfig(config: InsertPlatformConfig): Promise<PlatformConfig>;
  updatePlatformConfig(id: string, updates: Partial<PlatformConfig>): Promise<PlatformConfig | undefined>;
  upsertPlatformConfig(config: InsertPlatformConfig): Promise<PlatformConfig>;
  deletePlatformConfig(id: string): Promise<boolean>;
  seedDefaultPlatformConfig(): Promise<void>;
  
  // Email Notification Settings
  getEmailNotificationSetting(notificationType: string): Promise<EmailNotificationSetting | undefined>;
  getEmailNotificationSettingsByCategory(category: string): Promise<EmailNotificationSetting[]>;
  getAllEmailNotificationSettings(): Promise<EmailNotificationSetting[]>;
  createEmailNotificationSetting(setting: InsertEmailNotificationSetting): Promise<EmailNotificationSetting>;
  updateEmailNotificationSetting(id: string, updates: Partial<EmailNotificationSetting>): Promise<EmailNotificationSetting | undefined>;
  toggleEmailNotification(notificationType: string, isEnabled: boolean, updatedBy?: string): Promise<EmailNotificationSetting | undefined>;
  isEmailNotificationEnabled(notificationType: string): Promise<boolean>;
  seedDefaultEmailNotificationSettings(): Promise<void>;
  
  // Email Logs
  getEmailLog(id: string): Promise<EmailLog | undefined>;
  getEmailLogsByUser(userId: string): Promise<EmailLog[]>;
  getEmailLogsByType(notificationType: string): Promise<EmailLog[]>;
  getAllEmailLogs(): Promise<EmailLog[]>;
  createEmailLog(log: InsertEmailLog): Promise<EmailLog>;
  updateEmailLog(id: string, updates: Partial<EmailLog>): Promise<EmailLog | undefined>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getAdminUsers(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, 'admin'));
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db.update(users).set({ ...updates, updatedAt: new Date() }).where(eq(users.id, id)).returning();
    return user || undefined;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id)).returning();
    return result.length > 0;
  }

  // KYC
  async getKycSubmission(userId: string): Promise<KycSubmission | undefined> {
    const [submission] = await db.select().from(kycSubmissions).where(eq(kycSubmissions.userId, userId)).orderBy(desc(kycSubmissions.createdAt)).limit(1);
    return submission || undefined;
  }

  async createKycSubmission(insertSubmission: InsertKycSubmission): Promise<KycSubmission> {
    const [submission] = await db.insert(kycSubmissions).values(insertSubmission).returning();
    return submission;
  }

  async updateKycSubmission(id: string, updates: Partial<KycSubmission>): Promise<KycSubmission | undefined> {
    const [submission] = await db.update(kycSubmissions).set({ ...updates, updatedAt: new Date() }).where(eq(kycSubmissions.id, id)).returning();
    return submission || undefined;
  }

  async getAllKycSubmissions(): Promise<KycSubmission[]> {
    return await db.select().from(kycSubmissions).orderBy(desc(kycSubmissions.createdAt));
  }

  // Wallets
  async getWallet(userId: string): Promise<Wallet | undefined> {
    const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, userId));
    return wallet || undefined;
  }

  async createWallet(insertWallet: InsertWallet): Promise<Wallet> {
    const [wallet] = await db.insert(wallets).values(insertWallet).returning();
    return wallet;
  }

  async updateWallet(id: string, updates: Partial<Wallet>): Promise<Wallet | undefined> {
    const [wallet] = await db.update(wallets).set({ ...updates, updatedAt: new Date() }).where(eq(wallets.id, id)).returning();
    return wallet || undefined;
  }

  // Transactions
  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const [transaction] = await db.insert(transactions).values(insertTransaction).returning();
    return transaction;
  }

  async getTransaction(id: string): Promise<Transaction | undefined> {
    const [transaction] = await db.select().from(transactions).where(eq(transactions.id, id));
    return transaction || undefined;
  }

  async getUserTransactions(userId: string): Promise<Transaction[]> {
    return await db.select().from(transactions).where(eq(transactions.userId, userId)).orderBy(desc(transactions.createdAt));
  }

  async getAllTransactions(): Promise<Transaction[]> {
    return await db.select().from(transactions).orderBy(desc(transactions.createdAt));
  }

  async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction | undefined> {
    const [transaction] = await db.update(transactions).set(updates).where(eq(transactions.id, id)).returning();
    return transaction || undefined;
  }

  // Vault Holdings
  async getVaultHolding(id: string): Promise<VaultHolding | undefined> {
    const [holding] = await db.select().from(vaultHoldings).where(eq(vaultHoldings.id, id));
    return holding || undefined;
  }

  async getUserVaultHoldings(userId: string): Promise<VaultHolding[]> {
    return await db.select().from(vaultHoldings).where(eq(vaultHoldings.userId, userId)).orderBy(desc(vaultHoldings.createdAt));
  }

  async getAllVaultHoldings(): Promise<VaultHolding[]> {
    return await db.select().from(vaultHoldings).orderBy(desc(vaultHoldings.createdAt));
  }

  async createVaultHolding(insertHolding: InsertVaultHolding): Promise<VaultHolding> {
    const [holding] = await db.insert(vaultHoldings).values(insertHolding).returning();
    return holding;
  }

  async updateVaultHolding(id: string, updates: Partial<VaultHolding>): Promise<VaultHolding | undefined> {
    const [holding] = await db.update(vaultHoldings).set({ ...updates, updatedAt: new Date() }).where(eq(vaultHoldings.id, id)).returning();
    return holding || undefined;
  }

  // BNSL Plans
  async getBnslPlan(id: string): Promise<BnslPlan | undefined> {
    const [plan] = await db.select().from(bnslPlans).where(eq(bnslPlans.id, id));
    return plan || undefined;
  }

  async getUserBnslPlans(userId: string): Promise<BnslPlan[]> {
    return await db.select().from(bnslPlans).where(eq(bnslPlans.userId, userId)).orderBy(desc(bnslPlans.createdAt));
  }

  async getAllBnslPlans(): Promise<BnslPlan[]> {
    return await db.select().from(bnslPlans).orderBy(desc(bnslPlans.createdAt));
  }

  async getUserBnslPayouts(userId: string): Promise<BnslPayout[]> {
    // Get payouts for plans belonging to this user
    const userPlans = await db.select({ id: bnslPlans.id }).from(bnslPlans).where(eq(bnslPlans.userId, userId));
    const planIds = userPlans.map(p => p.id);
    if (planIds.length === 0) return [];
    return await db.select().from(bnslPayouts).where(inArray(bnslPayouts.planId, planIds)).orderBy(desc(bnslPayouts.createdAt));
  }

  async getAllBnslPayouts(): Promise<BnslPayout[]> {
    return await db.select().from(bnslPayouts).orderBy(desc(bnslPayouts.createdAt));
  }

  async getPeerTransfers(userId: string): Promise<PeerTransfer[]> {
    return await db.select().from(peerTransfers).where(
      or(eq(peerTransfers.senderId, userId), eq(peerTransfers.recipientId, userId))
    ).orderBy(desc(peerTransfers.createdAt));
  }

  async createBnslPlan(insertPlan: InsertBnslPlan): Promise<BnslPlan> {
    const [plan] = await db.insert(bnslPlans).values(insertPlan).returning();
    return plan;
  }

  async updateBnslPlan(id: string, updates: Partial<BnslPlan>): Promise<BnslPlan | undefined> {
    const [plan] = await db.update(bnslPlans).set({ ...updates, updatedAt: new Date() }).where(eq(bnslPlans.id, id)).returning();
    return plan || undefined;
  }

  // BNSL Payouts
  async getBnslPayout(id: string): Promise<BnslPayout | undefined> {
    const [payout] = await db.select().from(bnslPayouts).where(eq(bnslPayouts.id, id));
    return payout || undefined;
  }

  async getPlanPayouts(planId: string): Promise<BnslPayout[]> {
    return await db.select().from(bnslPayouts).where(eq(bnslPayouts.planId, planId)).orderBy(bnslPayouts.sequence);
  }

  async createBnslPayout(insertPayout: InsertBnslPayout): Promise<BnslPayout> {
    const [payout] = await db.insert(bnslPayouts).values(insertPayout).returning();
    return payout;
  }

  async updateBnslPayout(id: string, updates: Partial<BnslPayout>): Promise<BnslPayout | undefined> {
    const [payout] = await db.update(bnslPayouts).set(updates).where(eq(bnslPayouts.id, id)).returning();
    return payout || undefined;
  }

  // BNSL Early Terminations
  async getBnslEarlyTermination(planId: string): Promise<BnslEarlyTermination | undefined> {
    const [termination] = await db.select().from(bnslEarlyTerminations).where(eq(bnslEarlyTerminations.planId, planId));
    return termination || undefined;
  }

  async createBnslEarlyTermination(insertTermination: InsertBnslEarlyTermination): Promise<BnslEarlyTermination> {
    const [termination] = await db.insert(bnslEarlyTerminations).values(insertTermination).returning();
    return termination;
  }

  async updateBnslEarlyTermination(id: string, updates: Partial<BnslEarlyTermination>): Promise<BnslEarlyTermination | undefined> {
    const [termination] = await db.update(bnslEarlyTerminations).set(updates).where(eq(bnslEarlyTerminations.id, id)).returning();
    return termination || undefined;
  }

  // BNSL Wallets
  async getBnslWallet(userId: string): Promise<BnslWallet | undefined> {
    const [wallet] = await db.select().from(bnslWallets).where(eq(bnslWallets.userId, userId));
    return wallet || undefined;
  }

  async createBnslWallet(insertWallet: InsertBnslWallet): Promise<BnslWallet> {
    const [wallet] = await db.insert(bnslWallets).values(insertWallet).returning();
    return wallet;
  }

  async updateBnslWallet(id: string, updates: Partial<BnslWallet>): Promise<BnslWallet | undefined> {
    const [wallet] = await db.update(bnslWallets).set({ ...updates, updatedAt: new Date() }).where(eq(bnslWallets.id, id)).returning();
    return wallet || undefined;
  }

  async getOrCreateBnslWallet(userId: string): Promise<BnslWallet> {
    let wallet = await this.getBnslWallet(userId);
    if (!wallet) {
      wallet = await this.createBnslWallet({ userId, availableGoldGrams: '0', lockedGoldGrams: '0' });
    }
    return wallet;
  }

  // BNSL Plan Templates
  async getBnslPlanTemplate(id: string): Promise<BnslPlanTemplate | undefined> {
    const [template] = await db.select().from(bnslPlanTemplates).where(eq(bnslPlanTemplates.id, id));
    return template || undefined;
  }

  async getAllBnslPlanTemplates(): Promise<BnslPlanTemplate[]> {
    return await db.select().from(bnslPlanTemplates).orderBy(bnslPlanTemplates.displayOrder);
  }

  async getActiveBnslPlanTemplates(): Promise<BnslPlanTemplate[]> {
    return await db.select().from(bnslPlanTemplates)
      .where(eq(bnslPlanTemplates.status, 'Active'))
      .orderBy(bnslPlanTemplates.displayOrder);
  }

  async createBnslPlanTemplate(insertTemplate: InsertBnslPlanTemplate): Promise<BnslPlanTemplate> {
    const [template] = await db.insert(bnslPlanTemplates).values(insertTemplate).returning();
    return template;
  }

  async updateBnslPlanTemplate(id: string, updates: Partial<BnslPlanTemplate>): Promise<BnslPlanTemplate | undefined> {
    const [template] = await db.update(bnslPlanTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(bnslPlanTemplates.id, id))
      .returning();
    return template || undefined;
  }

  async deleteBnslPlanTemplate(id: string): Promise<boolean> {
    const result = await db.delete(bnslPlanTemplates).where(eq(bnslPlanTemplates.id, id));
    return true;
  }

  // BNSL Template Variants
  async getBnslTemplateVariant(id: string): Promise<BnslTemplateVariant | undefined> {
    const [variant] = await db.select().from(bnslTemplateVariants).where(eq(bnslTemplateVariants.id, id));
    return variant || undefined;
  }

  async getTemplateVariants(templateId: string): Promise<BnslTemplateVariant[]> {
    return await db.select().from(bnslTemplateVariants)
      .where(eq(bnslTemplateVariants.templateId, templateId))
      .orderBy(bnslTemplateVariants.tenorMonths);
  }

  async createBnslTemplateVariant(insertVariant: InsertBnslTemplateVariant): Promise<BnslTemplateVariant> {
    const [variant] = await db.insert(bnslTemplateVariants).values(insertVariant).returning();
    return variant;
  }

  async updateBnslTemplateVariant(id: string, updates: Partial<BnslTemplateVariant>): Promise<BnslTemplateVariant | undefined> {
    const [variant] = await db.update(bnslTemplateVariants)
      .set(updates)
      .where(eq(bnslTemplateVariants.id, id))
      .returning();
    return variant || undefined;
  }

  async deleteBnslTemplateVariant(id: string): Promise<boolean> {
    await db.delete(bnslTemplateVariants).where(eq(bnslTemplateVariants.id, id));
    return true;
  }

  // BNSL Agreements
  async getBnslAgreement(id: string): Promise<BnslAgreement | undefined> {
    const [agreement] = await db.select().from(bnslAgreements).where(eq(bnslAgreements.id, id));
    return agreement || undefined;
  }

  async getBnslAgreementByPlanId(planId: string): Promise<BnslAgreement | undefined> {
    const [agreement] = await db.select().from(bnslAgreements).where(eq(bnslAgreements.planId, planId));
    return agreement || undefined;
  }

  async getUserBnslAgreements(userId: string): Promise<BnslAgreement[]> {
    return await db.select().from(bnslAgreements).where(eq(bnslAgreements.userId, userId)).orderBy(desc(bnslAgreements.createdAt));
  }

  async getAllBnslAgreements(): Promise<BnslAgreement[]> {
    return await db.select().from(bnslAgreements).orderBy(desc(bnslAgreements.createdAt));
  }

  async createBnslAgreement(insertAgreement: InsertBnslAgreement): Promise<BnslAgreement> {
    const [agreement] = await db.insert(bnslAgreements).values(insertAgreement).returning();
    return agreement;
  }

  async updateBnslAgreement(id: string, updates: Partial<BnslAgreement>): Promise<BnslAgreement | undefined> {
    const [agreement] = await db.update(bnslAgreements).set(updates).where(eq(bnslAgreements.id, id)).returning();
    return agreement || undefined;
  }

  // FinaBridge Agreements
  async getFinabridgeAgreement(id: string): Promise<FinabridgeAgreement | undefined> {
    const [agreement] = await db.select().from(finabridgeAgreements).where(eq(finabridgeAgreements.id, id));
    return agreement || undefined;
  }

  async getUserFinabridgeAgreements(userId: string): Promise<FinabridgeAgreement[]> {
    return await db.select().from(finabridgeAgreements).where(eq(finabridgeAgreements.userId, userId)).orderBy(desc(finabridgeAgreements.createdAt));
  }

  async getAllFinabridgeAgreements(): Promise<FinabridgeAgreement[]> {
    return await db.select().from(finabridgeAgreements).orderBy(desc(finabridgeAgreements.createdAt));
  }

  async createFinabridgeAgreement(insertAgreement: InsertFinabridgeAgreement): Promise<FinabridgeAgreement> {
    const [agreement] = await db.insert(finabridgeAgreements).values(insertAgreement).returning();
    return agreement;
  }

  // Trade Cases
  async getTradeCase(id: string): Promise<TradeCase | undefined> {
    const [tradeCase] = await db.select().from(tradeCases).where(eq(tradeCases.id, id));
    return tradeCase || undefined;
  }

  async getUserTradeCases(userId: string): Promise<TradeCase[]> {
    return await db.select().from(tradeCases).where(eq(tradeCases.userId, userId)).orderBy(desc(tradeCases.createdAt));
  }

  async getAllTradeCases(): Promise<TradeCase[]> {
    return await db.select().from(tradeCases).orderBy(desc(tradeCases.createdAt));
  }

  async createTradeCase(insertTradeCase: InsertTradeCase): Promise<TradeCase> {
    const [tradeCase] = await db.insert(tradeCases).values(insertTradeCase).returning();
    return tradeCase;
  }

  async updateTradeCase(id: string, updates: Partial<TradeCase>): Promise<TradeCase | undefined> {
    const [tradeCase] = await db.update(tradeCases).set({ ...updates, updatedAt: new Date() }).where(eq(tradeCases.id, id)).returning();
    return tradeCase || undefined;
  }

  // Trade Documents
  async getCaseDocuments(caseId: string): Promise<TradeDocument[]> {
    return await db.select().from(tradeDocuments).where(eq(tradeDocuments.caseId, caseId)).orderBy(desc(tradeDocuments.uploadedAt));
  }

  async createTradeDocument(insertDocument: InsertTradeDocument): Promise<TradeDocument> {
    const [document] = await db.insert(tradeDocuments).values(insertDocument).returning();
    return document;
  }

  async updateTradeDocument(id: string, updates: Partial<TradeDocument>): Promise<TradeDocument | undefined> {
    const [document] = await db.update(tradeDocuments).set(updates).where(eq(tradeDocuments.id, id)).returning();
    return document || undefined;
  }

  // Trade Requests (FinaBridge Matching)
  async getTradeRequest(id: string): Promise<TradeRequest | undefined> {
    const [request] = await db.select().from(tradeRequests).where(eq(tradeRequests.id, id));
    return request || undefined;
  }

  async getTradeRequestByRef(tradeRefId: string): Promise<TradeRequest | undefined> {
    const [request] = await db.select().from(tradeRequests).where(eq(tradeRequests.tradeRefId, tradeRefId));
    return request || undefined;
  }

  async getUserTradeRequests(userId: string): Promise<TradeRequest[]> {
    return await db.select().from(tradeRequests).where(eq(tradeRequests.importerUserId, userId)).orderBy(desc(tradeRequests.createdAt));
  }

  async getOpenTradeRequests(): Promise<TradeRequest[]> {
    return await db.select().from(tradeRequests).where(
      and(
        eq(tradeRequests.status, 'Open'),
        eq(tradeRequests.suggestExporter, true)
      )
    ).orderBy(desc(tradeRequests.createdAt));
  }

  async getAllTradeRequests(): Promise<TradeRequest[]> {
    return await db.select().from(tradeRequests).orderBy(desc(tradeRequests.createdAt));
  }

  async createTradeRequest(insertRequest: InsertTradeRequest): Promise<TradeRequest> {
    const [request] = await db.insert(tradeRequests).values(insertRequest).returning();
    return request;
  }

  async updateTradeRequest(id: string, updates: Partial<TradeRequest>): Promise<TradeRequest | undefined> {
    const [request] = await db.update(tradeRequests).set({ ...updates, updatedAt: new Date() }).where(eq(tradeRequests.id, id)).returning();
    return request || undefined;
  }

  // Trade Proposals
  async getTradeProposal(id: string): Promise<TradeProposal | undefined> {
    const [proposal] = await db.select().from(tradeProposals).where(eq(tradeProposals.id, id));
    return proposal || undefined;
  }

  async getRequestProposals(tradeRequestId: string): Promise<TradeProposal[]> {
    return await db.select().from(tradeProposals).where(eq(tradeProposals.tradeRequestId, tradeRequestId)).orderBy(desc(tradeProposals.createdAt));
  }

  async getExporterProposals(exporterUserId: string): Promise<TradeProposal[]> {
    return await db.select().from(tradeProposals).where(eq(tradeProposals.exporterUserId, exporterUserId)).orderBy(desc(tradeProposals.createdAt));
  }

  async createTradeProposal(insertProposal: InsertTradeProposal): Promise<TradeProposal> {
    const [proposal] = await db.insert(tradeProposals).values(insertProposal).returning();
    return proposal;
  }

  async updateTradeProposal(id: string, updates: Partial<TradeProposal>): Promise<TradeProposal | undefined> {
    const [proposal] = await db.update(tradeProposals).set({ ...updates, updatedAt: new Date() }).where(eq(tradeProposals.id, id)).returning();
    return proposal || undefined;
  }

  // Forwarded Proposals
  async getForwardedProposals(tradeRequestId: string): Promise<ForwardedProposal[]> {
    return await db.select().from(forwardedProposals).where(eq(forwardedProposals.tradeRequestId, tradeRequestId)).orderBy(desc(forwardedProposals.createdAt));
  }

  async createForwardedProposal(insertForwarded: InsertForwardedProposal): Promise<ForwardedProposal> {
    const [forwarded] = await db.insert(forwardedProposals).values(insertForwarded).returning();
    return forwarded;
  }

  async removeForwardedProposal(proposalId: string): Promise<void> {
    await db.delete(forwardedProposals).where(eq(forwardedProposals.proposalId, proposalId));
  }

  // Trade Confirmations
  async getTradeConfirmation(tradeRequestId: string): Promise<TradeConfirmation | undefined> {
    const [confirmation] = await db.select().from(tradeConfirmations).where(eq(tradeConfirmations.tradeRequestId, tradeRequestId));
    return confirmation || undefined;
  }

  async createTradeConfirmation(insertConfirmation: InsertTradeConfirmation): Promise<TradeConfirmation> {
    const [confirmation] = await db.insert(tradeConfirmations).values(insertConfirmation).returning();
    return confirmation;
  }

  // FinaBridge Wallets
  async getFinabridgeWallet(userId: string): Promise<FinabridgeWallet | undefined> {
    const [wallet] = await db.select().from(finabridgeWallets).where(eq(finabridgeWallets.userId, userId));
    return wallet || undefined;
  }

  async createFinabridgeWallet(insertWallet: InsertFinabridgeWallet): Promise<FinabridgeWallet> {
    const [wallet] = await db.insert(finabridgeWallets).values(insertWallet).returning();
    return wallet;
  }

  async updateFinabridgeWallet(id: string, updates: Partial<FinabridgeWallet>): Promise<FinabridgeWallet | undefined> {
    const [wallet] = await db.update(finabridgeWallets).set({ ...updates, updatedAt: new Date() }).where(eq(finabridgeWallets.id, id)).returning();
    return wallet || undefined;
  }

  async getOrCreateFinabridgeWallet(userId: string): Promise<FinabridgeWallet> {
    const existing = await this.getFinabridgeWallet(userId);
    if (existing) return existing;
    return await this.createFinabridgeWallet({ userId, availableGoldGrams: '0', lockedGoldGrams: '0' });
  }

  // Settlement Holds
  async getSettlementHold(id: string): Promise<SettlementHold | undefined> {
    const [hold] = await db.select().from(settlementHolds).where(eq(settlementHolds.id, id));
    return hold || undefined;
  }

  async getTradeSettlementHold(tradeRequestId: string): Promise<SettlementHold | undefined> {
    const [hold] = await db.select().from(settlementHolds).where(eq(settlementHolds.tradeRequestId, tradeRequestId));
    return hold || undefined;
  }

  async getUserSettlementHolds(userId: string): Promise<SettlementHold[]> {
    return await db.select().from(settlementHolds).where(eq(settlementHolds.importerUserId, userId)).orderBy(desc(settlementHolds.createdAt));
  }

  async getExporterSettlementHolds(exporterUserId: string): Promise<SettlementHold[]> {
    return await db.select().from(settlementHolds).where(eq(settlementHolds.exporterUserId, exporterUserId)).orderBy(desc(settlementHolds.createdAt));
  }

  async getAllSettlementHolds(): Promise<SettlementHold[]> {
    return await db.select().from(settlementHolds).orderBy(desc(settlementHolds.createdAt));
  }

  async createSettlementHold(insertHold: InsertSettlementHold): Promise<SettlementHold> {
    const [hold] = await db.insert(settlementHolds).values(insertHold).returning();
    return hold;
  }

  async updateSettlementHold(id: string, updates: Partial<SettlementHold>): Promise<SettlementHold | undefined> {
    const [hold] = await db.update(settlementHolds).set({ ...updates, updatedAt: new Date() }).where(eq(settlementHolds.id, id)).returning();
    return hold || undefined;
  }

  // Deal Rooms
  async getDealRoom(id: string): Promise<DealRoom | undefined> {
    const [room] = await db.select().from(dealRooms).where(eq(dealRooms.id, id));
    return room || undefined;
  }

  async getDealRoomByTradeRequest(tradeRequestId: string): Promise<DealRoom | undefined> {
    const [room] = await db.select().from(dealRooms).where(eq(dealRooms.tradeRequestId, tradeRequestId));
    return room || undefined;
  }

  async getUserDealRooms(userId: string): Promise<DealRoom[]> {
    return await db.select().from(dealRooms).where(
      or(
        eq(dealRooms.importerUserId, userId),
        eq(dealRooms.exporterUserId, userId),
        eq(dealRooms.assignedAdminId, userId)
      )
    ).orderBy(desc(dealRooms.updatedAt));
  }

  async createDealRoom(insertRoom: InsertDealRoom): Promise<DealRoom> {
    const [room] = await db.insert(dealRooms).values(insertRoom).returning();
    return room;
  }

  async updateDealRoom(id: string, updates: Partial<DealRoom>): Promise<DealRoom | undefined> {
    const [room] = await db.update(dealRooms).set({ ...updates, updatedAt: new Date() }).where(eq(dealRooms.id, id)).returning();
    return room || undefined;
  }

  async getAllDealRooms(): Promise<DealRoom[]> {
    return await db.select().from(dealRooms).orderBy(desc(dealRooms.createdAt));
  }

  // Deal Room Messages
  async getDealRoomMessages(dealRoomId: string): Promise<DealRoomMessage[]> {
    return await db.select().from(dealRoomMessages).where(eq(dealRoomMessages.dealRoomId, dealRoomId)).orderBy(dealRoomMessages.createdAt);
  }

  async createDealRoomMessage(insertMessage: InsertDealRoomMessage): Promise<DealRoomMessage> {
    const [message] = await db.insert(dealRoomMessages).values(insertMessage).returning();
    await db.update(dealRooms).set({ updatedAt: new Date() }).where(eq(dealRooms.id, insertMessage.dealRoomId));
    return message;
  }

  async markDealRoomMessagesAsRead(dealRoomId: string, userId: string): Promise<void> {
    await db.update(dealRoomMessages).set({ isRead: true }).where(
      and(
        eq(dealRoomMessages.dealRoomId, dealRoomId),
        eq(dealRoomMessages.isRead, false),
        sql`${dealRoomMessages.senderUserId} != ${userId}`
      )
    );
  }

  async getUnreadDealRoomMessageCount(dealRoomId: string, userId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(dealRoomMessages).where(
      and(
        eq(dealRoomMessages.dealRoomId, dealRoomId),
        eq(dealRoomMessages.isRead, false),
        sql`${dealRoomMessages.senderUserId} != ${userId}`
      )
    );
    return result[0]?.count || 0;
  }

  // Deal Room Agreement Acceptances
  async getDealRoomAgreementAcceptance(dealRoomId: string, userId: string): Promise<DealRoomAgreementAcceptance | undefined> {
    const [acceptance] = await db.select().from(dealRoomAgreementAcceptances)
      .where(and(
        eq(dealRoomAgreementAcceptances.dealRoomId, dealRoomId),
        eq(dealRoomAgreementAcceptances.userId, userId)
      ))
      .limit(1);
    return acceptance || undefined;
  }

  async getDealRoomAgreementAcceptances(dealRoomId: string): Promise<DealRoomAgreementAcceptance[]> {
    return await db.select().from(dealRoomAgreementAcceptances)
      .where(eq(dealRoomAgreementAcceptances.dealRoomId, dealRoomId))
      .orderBy(dealRoomAgreementAcceptances.acceptedAt);
  }

  async createDealRoomAgreementAcceptance(acceptance: InsertDealRoomAgreementAcceptance): Promise<DealRoomAgreementAcceptance> {
    const [created] = await db.insert(dealRoomAgreementAcceptances).values(acceptance).returning();
    return created;
  }

  async closeDealRoom(id: string, closedBy: string, closureNotes?: string): Promise<DealRoom | undefined> {
    const [room] = await db.update(dealRooms).set({
      isClosed: true,
      closedAt: new Date(),
      closedBy,
      closureNotes,
      updatedAt: new Date()
    }).where(eq(dealRooms.id, id)).returning();
    return room || undefined;
  }

  // Chat
  // Chat Agents
  async getChatAgent(id: string): Promise<ChatAgent | undefined> {
    const [agent] = await db.select().from(chatAgents).where(eq(chatAgents.id, id));
    return agent || undefined;
  }

  async getChatAgentByType(type: string): Promise<ChatAgent | undefined> {
    const [agent] = await db.select().from(chatAgents).where(eq(chatAgents.type, type as any)).limit(1);
    return agent || undefined;
  }

  async getAllChatAgents(): Promise<ChatAgent[]> {
    return await db.select().from(chatAgents).orderBy(desc(chatAgents.priority));
  }

  async getActiveChatAgents(): Promise<ChatAgent[]> {
    return await db.select().from(chatAgents).where(eq(chatAgents.status, 'active')).orderBy(desc(chatAgents.priority));
  }

  async getDefaultChatAgent(): Promise<ChatAgent | undefined> {
    const [agent] = await db.select().from(chatAgents).where(eq(chatAgents.isDefault, true));
    return agent || undefined;
  }

  async createChatAgent(insertAgent: InsertChatAgent): Promise<ChatAgent> {
    const [agent] = await db.insert(chatAgents).values(insertAgent).returning();
    return agent;
  }

  async updateChatAgent(id: string, updates: Partial<ChatAgent>): Promise<ChatAgent | undefined> {
    const [agent] = await db.update(chatAgents).set({ ...updates, updatedAt: new Date() }).where(eq(chatAgents.id, id)).returning();
    return agent || undefined;
  }

  async seedDefaultChatAgents(): Promise<void> {
    const existingAgents = await this.getAllChatAgents();
    if (existingAgents.length > 0) return;

    const defaultAgents: InsertChatAgent[] = [
      {
        name: 'general',
        displayName: 'Finatrades Assistant',
        type: 'general',
        description: 'General support and FAQ assistant',
        welcomeMessage: 'Hello! I\'m your Finatrades assistant. I can help with buying/selling gold, deposits, withdrawals, vault storage, and more. How can I assist you today?',
        capabilities: JSON.stringify(['faq', 'balance', 'fees', 'limits', 'trading', 'deposits', 'withdrawals', 'vault', 'bnsl']),
        status: 'active',
        priority: 10,
        isDefault: true
      },
      {
        name: 'juris',
        displayName: 'Juris - Registration & KYC',
        type: 'juris',
        description: 'Registration and KYC verification assistant',
        welcomeMessage: 'Hello! I\'m Juris, your registration and verification assistant. I can help you create an account or complete your KYC verification. What would you like to do?',
        capabilities: JSON.stringify(['registration', 'kyc', 'account_setup', 'document_guidance', 'verification']),
        status: 'active',
        priority: 20,
        isDefault: false
      }
    ];

    for (const agent of defaultAgents) {
      await this.createChatAgent(agent);
    }
  }

  // Chat Agent Workflows
  async getChatAgentWorkflow(id: string): Promise<ChatAgentWorkflow | undefined> {
    const [workflow] = await db.select().from(chatAgentWorkflows).where(eq(chatAgentWorkflows.id, id));
    return workflow || undefined;
  }

  async getSessionWorkflow(sessionId: string): Promise<ChatAgentWorkflow | undefined> {
    const [workflow] = await db.select().from(chatAgentWorkflows).where(and(eq(chatAgentWorkflows.sessionId, sessionId), eq(chatAgentWorkflows.status, 'active'))).limit(1);
    return workflow || undefined;
  }

  async getUserActiveWorkflow(userId: string, workflowType: string): Promise<ChatAgentWorkflow | undefined> {
    const [workflow] = await db.select().from(chatAgentWorkflows).where(and(eq(chatAgentWorkflows.userId, userId), eq(chatAgentWorkflows.workflowType, workflowType), eq(chatAgentWorkflows.status, 'active'))).limit(1);
    return workflow || undefined;
  }

  async createChatAgentWorkflow(insertWorkflow: InsertChatAgentWorkflow): Promise<ChatAgentWorkflow> {
    const [workflow] = await db.insert(chatAgentWorkflows).values(insertWorkflow).returning();
    return workflow;
  }

  async updateChatAgentWorkflow(id: string, updates: Partial<ChatAgentWorkflow>): Promise<ChatAgentWorkflow | undefined> {
    const [workflow] = await db.update(chatAgentWorkflows).set({ ...updates, updatedAt: new Date() }).where(eq(chatAgentWorkflows.id, id)).returning();
    return workflow || undefined;
  }

  // Knowledge Base
  async getKnowledgeCategory(id: string): Promise<KnowledgeCategory | undefined> {
    const [category] = await db.select().from(knowledgeCategories).where(eq(knowledgeCategories.id, id));
    return category || undefined;
  }

  async getAllKnowledgeCategories(): Promise<KnowledgeCategory[]> {
    return await db.select().from(knowledgeCategories).orderBy(knowledgeCategories.sortOrder);
  }

  async createKnowledgeCategory(category: InsertKnowledgeCategory): Promise<KnowledgeCategory> {
    const [newCategory] = await db.insert(knowledgeCategories).values(category).returning();
    return newCategory;
  }

  async updateKnowledgeCategory(id: string, updates: Partial<KnowledgeCategory>): Promise<KnowledgeCategory | undefined> {
    const [category] = await db.update(knowledgeCategories).set({ ...updates, updatedAt: new Date() }).where(eq(knowledgeCategories.id, id)).returning();
    return category || undefined;
  }

  async deleteKnowledgeCategory(id: string): Promise<boolean> {
    const result = await db.delete(knowledgeCategories).where(eq(knowledgeCategories.id, id));
    return true;
  }

  async getKnowledgeArticle(id: string): Promise<KnowledgeArticle | undefined> {
    const [article] = await db.select().from(knowledgeArticles).where(eq(knowledgeArticles.id, id));
    return article || undefined;
  }

  async getAllKnowledgeArticles(): Promise<KnowledgeArticle[]> {
    return await db.select().from(knowledgeArticles).orderBy(desc(knowledgeArticles.createdAt));
  }

  async getPublishedKnowledgeArticles(): Promise<KnowledgeArticle[]> {
    return await db.select().from(knowledgeArticles).where(eq(knowledgeArticles.status, 'published')).orderBy(desc(knowledgeArticles.createdAt));
  }

  async getKnowledgeArticlesByCategory(categoryId: string): Promise<KnowledgeArticle[]> {
    return await db.select().from(knowledgeArticles).where(eq(knowledgeArticles.categoryId, categoryId)).orderBy(desc(knowledgeArticles.createdAt));
  }

  async searchKnowledgeArticles(query: string, agentType?: string): Promise<KnowledgeArticle[]> {
    const searchPattern = `%${query.toLowerCase()}%`;
    let articles = await db.select().from(knowledgeArticles)
      .where(and(
        eq(knowledgeArticles.status, 'published'),
        or(
          sql`LOWER(${knowledgeArticles.title}) LIKE ${searchPattern}`,
          sql`LOWER(${knowledgeArticles.summary}) LIKE ${searchPattern}`,
          sql`LOWER(${knowledgeArticles.content}) LIKE ${searchPattern}`,
          sql`LOWER(${knowledgeArticles.keywords}) LIKE ${searchPattern}`
        )
      ))
      .orderBy(desc(knowledgeArticles.viewCount))
      .limit(10);
    
    if (agentType) {
      articles = articles.filter(article => {
        if (!article.agentTypes) return true;
        try {
          const types = JSON.parse(article.agentTypes);
          return Array.isArray(types) && (types.length === 0 || types.includes(agentType));
        } catch {
          return true;
        }
      });
    }
    
    return articles;
  }

  async createKnowledgeArticle(article: InsertKnowledgeArticle): Promise<KnowledgeArticle> {
    const [newArticle] = await db.insert(knowledgeArticles).values(article).returning();
    return newArticle;
  }

  async updateKnowledgeArticle(id: string, updates: Partial<KnowledgeArticle>): Promise<KnowledgeArticle | undefined> {
    const [article] = await db.update(knowledgeArticles).set({ ...updates, updatedAt: new Date() }).where(eq(knowledgeArticles.id, id)).returning();
    return article || undefined;
  }

  async deleteKnowledgeArticle(id: string): Promise<boolean> {
    await db.delete(knowledgeArticles).where(eq(knowledgeArticles.id, id));
    return true;
  }

  async incrementArticleViewCount(id: string): Promise<void> {
    await db.update(knowledgeArticles).set({ viewCount: sql`${knowledgeArticles.viewCount} + 1` }).where(eq(knowledgeArticles.id, id));
  }

  async incrementArticleHelpfulCount(id: string): Promise<void> {
    await db.update(knowledgeArticles).set({ helpfulCount: sql`${knowledgeArticles.helpfulCount} + 1` }).where(eq(knowledgeArticles.id, id));
  }

  async seedDefaultKnowledgeBase(): Promise<void> {
    const existingCategories = await this.getAllKnowledgeCategories();
    if (existingCategories.length > 0) return;

    const defaultCategories: InsertKnowledgeCategory[] = [
      { name: 'Getting Started', description: 'Basics of using Finatrades platform', icon: 'BookOpen', sortOrder: 1 },
      { name: 'Account & Security', description: 'Account management and security settings', icon: 'Shield', sortOrder: 2 },
      { name: 'Gold Trading', description: 'Buying, selling, and trading gold', icon: 'Coins', sortOrder: 3 },
      { name: 'FinaVault', description: 'Gold storage and vault services', icon: 'Lock', sortOrder: 4 },
      { name: 'FinaPay', description: 'Payment and transfer features', icon: 'CreditCard', sortOrder: 5 },
      { name: 'BNSL', description: 'Buy Now Sell Later plans', icon: 'TrendingUp', sortOrder: 6 },
      { name: 'KYC & Verification', description: 'Identity verification process', icon: 'UserCheck', sortOrder: 7 },
    ];

    for (const category of defaultCategories) {
      await this.createKnowledgeCategory(category);
    }
    console.log('[Knowledge Base] Default categories seeded successfully');
  }

  // Chat Sessions
  async getChatSession(userId: string): Promise<ChatSession | undefined> {
    const [session] = await db.select().from(chatSessions).where(and(eq(chatSessions.userId, userId), eq(chatSessions.status, 'active'))).orderBy(desc(chatSessions.createdAt)).limit(1);
    return session || undefined;
  }

  async getChatSessionById(id: string): Promise<ChatSession | undefined> {
    const [session] = await db.select().from(chatSessions).where(eq(chatSessions.id, id));
    return session || undefined;
  }

  async getChatSessionByGuest(guestName?: string, guestEmail?: string): Promise<ChatSession | undefined> {
    if (!guestName || !guestEmail) return undefined;
    const [session] = await db.select().from(chatSessions).where(and(eq(chatSessions.guestEmail, guestEmail), eq(chatSessions.status, 'active'))).orderBy(desc(chatSessions.createdAt)).limit(1);
    return session || undefined;
  }

  async getAllChatSessions(): Promise<ChatSession[]> {
    return await db.select().from(chatSessions).orderBy(desc(chatSessions.lastMessageAt));
  }

  async createChatSession(insertSession: InsertChatSession): Promise<ChatSession> {
    const [session] = await db.insert(chatSessions).values(insertSession).returning();
    return session;
  }

  async updateChatSession(id: string, updates: Partial<ChatSession>): Promise<ChatSession | undefined> {
    const [session] = await db.update(chatSessions).set(updates).where(eq(chatSessions.id, id)).returning();
    return session || undefined;
  }

  async getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
    return await db.select().from(chatMessages).where(eq(chatMessages.sessionId, sessionId)).orderBy(chatMessages.createdAt);
  }

  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const [message] = await db.insert(chatMessages).values(insertMessage).returning();
    return message;
  }

  async markMessagesAsRead(sessionId: string): Promise<void> {
    await db.update(chatMessages).set({ isRead: true }).where(and(eq(chatMessages.sessionId, sessionId), eq(chatMessages.isRead, false)));
  }

  // Audit Logs
  async createAuditLog(insertLog: InsertAuditLog): Promise<AuditLog> {
    const [log] = await db.insert(auditLogs).values(insertLog).returning();
    return log;
  }

  async getEntityAuditLogs(entityType: string, entityId: string): Promise<AuditLog[]> {
    return await db.select().from(auditLogs).where(and(eq(auditLogs.entityType, entityType), eq(auditLogs.entityId, entityId))).orderBy(desc(auditLogs.timestamp));
  }

  // Certificates
  async createCertificate(insertCertificate: InsertCertificate): Promise<Certificate> {
    const [certificate] = await db.insert(certificates).values(insertCertificate).returning();
    return certificate;
  }

  async getCertificate(id: string): Promise<Certificate | undefined> {
    const [certificate] = await db.select().from(certificates).where(eq(certificates.id, id));
    return certificate || undefined;
  }

  async getCertificateByNumber(certificateNumber: string): Promise<Certificate | undefined> {
    const [certificate] = await db.select().from(certificates).where(eq(certificates.certificateNumber, certificateNumber));
    return certificate || undefined;
  }

  async getUserCertificates(userId: string): Promise<Certificate[]> {
    return await db.select().from(certificates).where(eq(certificates.userId, userId)).orderBy(desc(certificates.issuedAt));
  }

  async getCertificateByTransactionId(transactionId: string): Promise<Certificate | undefined> {
    const [certificate] = await db.select().from(certificates).where(eq(certificates.transactionId, transactionId));
    return certificate || undefined;
  }

  async getCertificatesByTransactionId(transactionId: string): Promise<Certificate[]> {
    return await db.select().from(certificates).where(eq(certificates.transactionId, transactionId)).orderBy(desc(certificates.issuedAt));
  }

  async getCertificatesByRelatedId(relatedCertificateId: string): Promise<Certificate[]> {
    return await db.select().from(certificates).where(eq(certificates.relatedCertificateId, relatedCertificateId)).orderBy(desc(certificates.issuedAt));
  }

  async getUserActiveCertificates(userId: string): Promise<Certificate[]> {
    return await db.select().from(certificates).where(and(eq(certificates.userId, userId), eq(certificates.status, 'Active'))).orderBy(desc(certificates.issuedAt));
  }

  async getAllCertificates(): Promise<Certificate[]> {
    return await db.select().from(certificates).orderBy(desc(certificates.issuedAt));
  }

  async updateCertificate(id: string, updates: Partial<Certificate>): Promise<Certificate | undefined> {
    const [certificate] = await db.update(certificates).set(updates).where(eq(certificates.id, id)).returning();
    return certificate || undefined;
  }

  async generateCertificateNumber(type: 'Digital Ownership' | 'Physical Storage'): Promise<string> {
    const prefix = type === 'Digital Ownership' ? 'FT-DOC' : 'WG-PSC';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  // Allocations (Physical Gold Tracking)
  async createAllocation(insertAllocation: InsertAllocation): Promise<Allocation> {
    const [allocation] = await db.insert(allocations).values(insertAllocation).returning();
    return allocation;
  }

  async getAllocation(id: string): Promise<Allocation | undefined> {
    const [allocation] = await db.select().from(allocations).where(eq(allocations.id, id));
    return allocation || undefined;
  }

  async getAllocationByTransaction(transactionId: string): Promise<Allocation | undefined> {
    const [allocation] = await db.select().from(allocations).where(eq(allocations.transactionId, transactionId));
    return allocation || undefined;
  }

  async getUserAllocations(userId: string): Promise<Allocation[]> {
    return await db.select().from(allocations).where(eq(allocations.userId, userId)).orderBy(desc(allocations.createdAt));
  }

  async updateAllocation(id: string, updates: Partial<Allocation>): Promise<Allocation | undefined> {
    const [allocation] = await db.update(allocations).set({ ...updates, updatedAt: new Date() }).where(eq(allocations.id, id)).returning();
    return allocation || undefined;
  }

  async withTransaction<T>(fn: (txStorage: TransactionalStorage) => Promise<T>): Promise<T> {
    return await db.transaction(async (tx) => {
      const txStorage = createTransactionalStorage(tx as unknown as DbClient);
      return await fn(txStorage);
    });
  }

  async updateWalletTx(txDb: DbClient, id: string, updates: Partial<Wallet>): Promise<Wallet | undefined> {
    const [wallet] = await txDb.update(wallets).set({ ...updates, updatedAt: new Date() }).where(eq(wallets.id, id)).returning();
    return wallet || undefined;
  }

  async createTransactionTx(txDb: DbClient, insertTransaction: InsertTransaction): Promise<Transaction> {
    const [transaction] = await txDb.insert(transactions).values(insertTransaction).returning();
    return transaction;
  }

  async updateTransactionTx(txDb: DbClient, id: string, updates: Partial<Transaction>): Promise<Transaction | undefined> {
    const [transaction] = await txDb.update(transactions).set({ ...updates, updatedAt: new Date() }).where(eq(transactions.id, id)).returning();
    return transaction || undefined;
  }

  async createVaultHoldingTx(txDb: DbClient, insertHolding: InsertVaultHolding): Promise<VaultHolding> {
    const [holding] = await txDb.insert(vaultHoldings).values(insertHolding).returning();
    return holding;
  }

  async updateVaultHoldingTx(txDb: DbClient, id: string, updates: Partial<VaultHolding>): Promise<VaultHolding | undefined> {
    const [holding] = await txDb.update(vaultHoldings).set({ ...updates, updatedAt: new Date() }).where(eq(vaultHoldings.id, id)).returning();
    return holding || undefined;
  }

  async createCertificateTx(txDb: DbClient, insertCertificate: InsertCertificate): Promise<Certificate> {
    const [certificate] = await txDb.insert(certificates).values(insertCertificate).returning();
    return certificate;
  }

  async updateCertificateTx(txDb: DbClient, id: string, updates: Partial<Certificate>): Promise<Certificate | undefined> {
    const [certificate] = await txDb.update(certificates).set(updates).where(eq(certificates.id, id)).returning();
    return certificate || undefined;
  }

  async createAuditLogTx(txDb: DbClient, insertLog: InsertAuditLog): Promise<AuditLog> {
    const [log] = await txDb.insert(auditLogs).values(insertLog).returning();
    return log;
  }

  // CMS - Content Pages
  async getContentPage(id: string): Promise<ContentPage | undefined> {
    const [page] = await db.select().from(contentPages).where(eq(contentPages.id, id));
    return page || undefined;
  }

  async getContentPageBySlug(slug: string): Promise<ContentPage | undefined> {
    const [page] = await db.select().from(contentPages).where(eq(contentPages.slug, slug));
    return page || undefined;
  }

  async getAllContentPages(): Promise<ContentPage[]> {
    return await db.select().from(contentPages).orderBy(contentPages.title);
  }

  async createContentPage(insertPage: InsertContentPage): Promise<ContentPage> {
    const [page] = await db.insert(contentPages).values(insertPage).returning();
    return page;
  }

  async updateContentPage(id: string, updates: Partial<ContentPage>): Promise<ContentPage | undefined> {
    const [page] = await db.update(contentPages).set({ ...updates, updatedAt: new Date() }).where(eq(contentPages.id, id)).returning();
    return page || undefined;
  }

  async deleteContentPage(id: string): Promise<boolean> {
    const result = await db.delete(contentPages).where(eq(contentPages.id, id));
    return true;
  }

  // CMS - Content Blocks
  async getContentBlock(id: string): Promise<ContentBlock | undefined> {
    const [block] = await db.select().from(contentBlocks).where(eq(contentBlocks.id, id));
    return block || undefined;
  }

  async getPageContentBlocks(pageId: string): Promise<ContentBlock[]> {
    return await db.select().from(contentBlocks).where(eq(contentBlocks.pageId, pageId)).orderBy(contentBlocks.sortOrder);
  }

  async getContentBlockByKey(pageId: string, section: string, key: string): Promise<ContentBlock | undefined> {
    const [block] = await db.select().from(contentBlocks).where(
      and(eq(contentBlocks.pageId, pageId), eq(contentBlocks.section, section), eq(contentBlocks.key, key))
    );
    return block || undefined;
  }

  async getAllContentBlocks(): Promise<ContentBlock[]> {
    return await db.select().from(contentBlocks).orderBy(contentBlocks.pageId, contentBlocks.section, contentBlocks.sortOrder);
  }

  async createContentBlock(insertBlock: InsertContentBlock): Promise<ContentBlock> {
    const [block] = await db.insert(contentBlocks).values(insertBlock).returning();
    return block;
  }

  async updateContentBlock(id: string, updates: Partial<ContentBlock>): Promise<ContentBlock | undefined> {
    const [block] = await db.update(contentBlocks).set({ ...updates, updatedAt: new Date() }).where(eq(contentBlocks.id, id)).returning();
    return block || undefined;
  }

  async deleteContentBlock(id: string): Promise<boolean> {
    await db.delete(contentBlocks).where(eq(contentBlocks.id, id));
    return true;
  }

  // CMS - Templates
  async getTemplate(id: string): Promise<Template | undefined> {
    const [template] = await db.select().from(templates).where(eq(templates.id, id));
    return template || undefined;
  }

  async getTemplateBySlug(slug: string): Promise<Template | undefined> {
    const [template] = await db.select().from(templates).where(eq(templates.slug, slug));
    return template || undefined;
  }

  async getAllTemplates(): Promise<Template[]> {
    return await db.select().from(templates).orderBy(templates.type, templates.name);
  }

  async getTemplatesByType(type: string): Promise<Template[]> {
    return await db.select().from(templates).where(eq(templates.type, type as any)).orderBy(templates.name);
  }

  async createTemplate(insertTemplate: InsertTemplate): Promise<Template> {
    const [template] = await db.insert(templates).values(insertTemplate).returning();
    return template;
  }

  async updateTemplate(id: string, updates: Partial<Template>): Promise<Template | undefined> {
    const [template] = await db.update(templates).set({ ...updates, updatedAt: new Date() }).where(eq(templates.id, id)).returning();
    return template || undefined;
  }

  async deleteTemplate(id: string): Promise<boolean> {
    await db.delete(templates).where(eq(templates.id, id));
    return true;
  }

  // CMS - Media Assets
  async getMediaAsset(id: string): Promise<MediaAsset | undefined> {
    const [asset] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, id));
    return asset || undefined;
  }

  async getAllMediaAssets(): Promise<MediaAsset[]> {
    return await db.select().from(mediaAssets).orderBy(desc(mediaAssets.createdAt));
  }

  async createMediaAsset(insertAsset: InsertMediaAsset): Promise<MediaAsset> {
    const [asset] = await db.insert(mediaAssets).values(insertAsset).returning();
    return asset;
  }

  async deleteMediaAsset(id: string): Promise<boolean> {
    await db.delete(mediaAssets).where(eq(mediaAssets.id, id));
    return true;
  }

  // CMS - Labels
  async getAllCmsLabels(): Promise<CmsLabel[]> {
    return await db.select().from(cmsLabels).orderBy(cmsLabels.category, cmsLabels.key);
  }

  async getCmsLabel(key: string): Promise<CmsLabel | undefined> {
    const [label] = await db.select().from(cmsLabels).where(eq(cmsLabels.key, key));
    return label || undefined;
  }

  async upsertCmsLabel(insertLabel: InsertCmsLabel): Promise<CmsLabel> {
    const existing = await this.getCmsLabel(insertLabel.key);
    if (existing) {
      const [updated] = await db.update(cmsLabels)
        .set({ ...insertLabel, updatedAt: new Date() })
        .where(eq(cmsLabels.key, insertLabel.key))
        .returning();
      return updated;
    }
    const [label] = await db.insert(cmsLabels).values(insertLabel).returning();
    return label;
  }

  // FinaPay - Platform Bank Accounts
  async getPlatformBankAccount(id: string): Promise<PlatformBankAccount | undefined> {
    const [account] = await db.select().from(platformBankAccounts).where(eq(platformBankAccounts.id, id));
    return account || undefined;
  }

  async getAllPlatformBankAccounts(): Promise<PlatformBankAccount[]> {
    return await db.select().from(platformBankAccounts).orderBy(desc(platformBankAccounts.createdAt));
  }

  async getActivePlatformBankAccounts(): Promise<PlatformBankAccount[]> {
    return await db.select().from(platformBankAccounts).where(eq(platformBankAccounts.status, 'Active')).orderBy(platformBankAccounts.bankName);
  }

  async createPlatformBankAccount(insertAccount: InsertPlatformBankAccount): Promise<PlatformBankAccount> {
    const [account] = await db.insert(platformBankAccounts).values(insertAccount).returning();
    return account;
  }

  async updatePlatformBankAccount(id: string, updates: Partial<PlatformBankAccount>): Promise<PlatformBankAccount | undefined> {
    const [account] = await db.update(platformBankAccounts).set({ ...updates, updatedAt: new Date() }).where(eq(platformBankAccounts.id, id)).returning();
    return account || undefined;
  }

  async deletePlatformBankAccount(id: string): Promise<boolean> {
    await db.delete(platformBankAccounts).where(eq(platformBankAccounts.id, id));
    return true;
  }

  // Platform Fees
  async getPlatformFee(id: string): Promise<PlatformFee | undefined> {
    const [fee] = await db.select().from(platformFees).where(eq(platformFees.id, id));
    return fee || undefined;
  }

  async getPlatformFeeByKey(module: string, feeKey: string): Promise<PlatformFee | undefined> {
    const [fee] = await db.select().from(platformFees)
      .where(and(eq(platformFees.module, module as any), eq(platformFees.feeKey, feeKey)));
    return fee || undefined;
  }

  async getAllPlatformFees(): Promise<PlatformFee[]> {
    return await db.select().from(platformFees).orderBy(platformFees.module, platformFees.displayOrder);
  }

  async getModuleFees(module: string): Promise<PlatformFee[]> {
    return await db.select().from(platformFees)
      .where(eq(platformFees.module, module as any))
      .orderBy(platformFees.displayOrder);
  }

  async getActivePlatformFees(): Promise<PlatformFee[]> {
    return await db.select().from(platformFees)
      .where(eq(platformFees.isActive, true))
      .orderBy(platformFees.module, platformFees.displayOrder);
  }

  async createPlatformFee(insertFee: InsertPlatformFee): Promise<PlatformFee> {
    const [fee] = await db.insert(platformFees).values(insertFee).returning();
    return fee;
  }

  async updatePlatformFee(id: string, updates: Partial<PlatformFee>): Promise<PlatformFee | undefined> {
    const [fee] = await db.update(platformFees)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(platformFees.id, id))
      .returning();
    return fee || undefined;
  }

  async deletePlatformFee(id: string): Promise<boolean> {
    await db.delete(platformFees).where(eq(platformFees.id, id));
    return true;
  }

  async seedDefaultFees(): Promise<void> {
    const existingFees = await this.getAllPlatformFees();
    if (existingFees.length > 0) return; // Already seeded

    const defaultFees: InsertPlatformFee[] = [
      // FinaPay fees
      { module: 'FinaPay', feeKey: 'buy_gold_spread', feeName: 'Buy Gold Spread', description: 'Spread applied when buying gold', feeType: 'percentage', feeValue: '0.50', displayOrder: 1 },
      { module: 'FinaPay', feeKey: 'sell_gold_spread', feeName: 'Sell Gold Spread', description: 'Spread applied when selling gold', feeType: 'percentage', feeValue: '1.50', displayOrder: 2 },
      { module: 'FinaPay', feeKey: 'deposit_fee', feeName: 'Deposit Fee', description: 'Fee for fiat deposits', feeType: 'percentage', feeValue: '0.50', displayOrder: 3 },
      { module: 'FinaPay', feeKey: 'withdrawal_fee', feeName: 'Withdrawal Fee', description: 'Fee for fiat withdrawals', feeType: 'percentage', feeValue: '1.50', displayOrder: 4 },
      { module: 'FinaPay', feeKey: 'p2p_transfer_fee', feeName: 'P2P Transfer Fee', description: 'Fee for peer-to-peer transfers', feeType: 'percentage', feeValue: '0.00', displayOrder: 5 },
      
      // FinaVault fees
      { module: 'FinaVault', feeKey: 'annual_storage_fee', feeName: 'Annual Storage Fee', description: 'Annual storage fee for vault holdings', feeType: 'percentage', feeValue: '0.50', displayOrder: 1 },
      { module: 'FinaVault', feeKey: 'cashout_bank_fee', feeName: 'Cash Out to Bank Fee', description: 'Fee for cashing out to bank', feeType: 'percentage', feeValue: '1.50', displayOrder: 2 },
      { module: 'FinaVault', feeKey: 'cashout_wallet_fee', feeName: 'Cash Out to Wallet Fee', description: 'Fee for cashing out to FinaPay wallet', feeType: 'percentage', feeValue: '0.00', displayOrder: 3 },
      
      // BNSL fees
      { module: 'BNSL', feeKey: 'early_termination_admin_fee', feeName: 'Early Termination Admin Fee', description: 'Admin fee for early termination', feeType: 'percentage', feeValue: '1.00', displayOrder: 1 },
      { module: 'BNSL', feeKey: 'early_termination_penalty', feeName: 'Early Termination Penalty', description: 'Penalty for early termination', feeType: 'percentage', feeValue: '5.00', displayOrder: 2 },
      
      // FinaBridge fees
      { module: 'FinaBridge', feeKey: 'platform_service_fee', feeName: 'Platform Service Fee', description: 'Service fee for trade finance', feeType: 'percentage', feeValue: '0.50', displayOrder: 1 },
    ];

    for (const fee of defaultFees) {
      await this.createPlatformFee(fee);
    }
  }

  // FinaPay - Deposit Requests
  async getDepositRequest(id: string): Promise<DepositRequest | undefined> {
    const [request] = await db.select().from(depositRequests).where(eq(depositRequests.id, id));
    return request || undefined;
  }

  async getUserDepositRequests(userId: string): Promise<DepositRequest[]> {
    return await db.select().from(depositRequests).where(eq(depositRequests.userId, userId)).orderBy(desc(depositRequests.createdAt));
  }

  async getAllDepositRequests(): Promise<DepositRequest[]> {
    return await db.select().from(depositRequests).orderBy(desc(depositRequests.createdAt));
  }

  async createDepositRequest(insertRequest: InsertDepositRequest): Promise<DepositRequest> {
    const [request] = await db.insert(depositRequests).values(insertRequest).returning();
    return request;
  }

  async updateDepositRequest(id: string, updates: Partial<DepositRequest>): Promise<DepositRequest | undefined> {
    const [request] = await db.update(depositRequests).set({ ...updates, updatedAt: new Date() }).where(eq(depositRequests.id, id)).returning();
    return request || undefined;
  }

  // FinaPay - Withdrawal Requests
  async getWithdrawalRequest(id: string): Promise<WithdrawalRequest | undefined> {
    const [request] = await db.select().from(withdrawalRequests).where(eq(withdrawalRequests.id, id));
    return request || undefined;
  }

  async getUserWithdrawalRequests(userId: string): Promise<WithdrawalRequest[]> {
    return await db.select().from(withdrawalRequests).where(eq(withdrawalRequests.userId, userId)).orderBy(desc(withdrawalRequests.createdAt));
  }

  async getAllWithdrawalRequests(): Promise<WithdrawalRequest[]> {
    return await db.select().from(withdrawalRequests).orderBy(desc(withdrawalRequests.createdAt));
  }

  async createWithdrawalRequest(insertRequest: InsertWithdrawalRequest): Promise<WithdrawalRequest> {
    const [request] = await db.insert(withdrawalRequests).values(insertRequest).returning();
    return request;
  }

  async updateWithdrawalRequest(id: string, updates: Partial<WithdrawalRequest>): Promise<WithdrawalRequest | undefined> {
    const [request] = await db.update(withdrawalRequests).set({ ...updates, updatedAt: new Date() }).where(eq(withdrawalRequests.id, id)).returning();
    return request || undefined;
  }

  // Peer Transfers (Send Money)
  async getUserByFinatradesId(finatradesId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.finatradesId, finatradesId));
    return user || undefined;
  }

  async searchUsersByIdentifier(identifier: string): Promise<User[]> {
    return await db.select().from(users).where(
      or(
        eq(users.email, identifier),
        eq(users.finatradesId, identifier)
      )
    );
  }

  async getPeerTransfer(id: string): Promise<PeerTransfer | undefined> {
    const [transfer] = await db.select().from(peerTransfers).where(eq(peerTransfers.id, id));
    return transfer || undefined;
  }

  async getUserSentTransfers(userId: string): Promise<PeerTransfer[]> {
    return await db.select().from(peerTransfers).where(eq(peerTransfers.senderId, userId)).orderBy(desc(peerTransfers.createdAt));
  }

  async getUserReceivedTransfers(userId: string): Promise<PeerTransfer[]> {
    return await db.select().from(peerTransfers).where(eq(peerTransfers.recipientId, userId)).orderBy(desc(peerTransfers.createdAt));
  }

  async getAllPeerTransfers(): Promise<PeerTransfer[]> {
    return await db.select().from(peerTransfers).orderBy(desc(peerTransfers.createdAt));
  }

  async createPeerTransfer(insertTransfer: InsertPeerTransfer): Promise<PeerTransfer> {
    const [transfer] = await db.insert(peerTransfers).values(insertTransfer).returning();
    return transfer;
  }

  async updatePeerTransfer(id: string, updates: Partial<PeerTransfer>): Promise<PeerTransfer | undefined> {
    const [transfer] = await db.update(peerTransfers).set(updates).where(eq(peerTransfers.id, id)).returning();
    return transfer || undefined;
  }

  // Peer Requests (Request Money)
  async getPeerRequest(id: string): Promise<PeerRequest | undefined> {
    const [request] = await db.select().from(peerRequests).where(eq(peerRequests.id, id));
    return request || undefined;
  }

  async getPeerRequestByQrPayload(qrPayload: string): Promise<PeerRequest | undefined> {
    const [request] = await db.select().from(peerRequests).where(eq(peerRequests.qrPayload, qrPayload));
    return request || undefined;
  }

  async getUserPeerRequests(userId: string): Promise<PeerRequest[]> {
    return await db.select().from(peerRequests).where(eq(peerRequests.requesterId, userId)).orderBy(desc(peerRequests.createdAt));
  }

  async getUserReceivedPeerRequests(userId: string): Promise<PeerRequest[]> {
    return await db.select().from(peerRequests).where(eq(peerRequests.targetId, userId)).orderBy(desc(peerRequests.createdAt));
  }

  async getAllPeerRequests(): Promise<PeerRequest[]> {
    return await db.select().from(peerRequests).orderBy(desc(peerRequests.createdAt));
  }

  async createPeerRequest(insertRequest: InsertPeerRequest): Promise<PeerRequest> {
    const [request] = await db.insert(peerRequests).values(insertRequest).returning();
    return request;
  }

  async updatePeerRequest(id: string, updates: Partial<PeerRequest>): Promise<PeerRequest | undefined> {
    const [request] = await db.update(peerRequests).set(updates).where(eq(peerRequests.id, id)).returning();
    return request || undefined;
  }

  // Generate Finatrades ID for new users
  generateFinatradesId(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = 'FT';
    for (let i = 0; i < 8; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
  }

  // ============================================
  // VAULT DEPOSIT REQUESTS
  // ============================================
  
  generateVaultDepositReferenceNumber(): string {
    const prefix = 'VD';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  async getVaultDepositRequest(id: string): Promise<VaultDepositRequest | undefined> {
    const [request] = await db.select().from(vaultDepositRequests).where(eq(vaultDepositRequests.id, id));
    return request || undefined;
  }

  async getVaultDepositRequestByRef(referenceNumber: string): Promise<VaultDepositRequest | undefined> {
    const [request] = await db.select().from(vaultDepositRequests).where(eq(vaultDepositRequests.referenceNumber, referenceNumber));
    return request || undefined;
  }

  async getUserVaultDepositRequests(userId: string): Promise<VaultDepositRequest[]> {
    return await db.select().from(vaultDepositRequests).where(eq(vaultDepositRequests.userId, userId)).orderBy(desc(vaultDepositRequests.createdAt));
  }

  async getAllVaultDepositRequests(): Promise<VaultDepositRequest[]> {
    return await db.select().from(vaultDepositRequests).orderBy(desc(vaultDepositRequests.createdAt));
  }

  async getPendingVaultDepositRequests(): Promise<VaultDepositRequest[]> {
    return await db.select().from(vaultDepositRequests)
      .where(or(
        eq(vaultDepositRequests.status, 'Submitted'),
        eq(vaultDepositRequests.status, 'Under Review'),
        eq(vaultDepositRequests.status, 'Approved'),
        eq(vaultDepositRequests.status, 'Awaiting Delivery'),
        eq(vaultDepositRequests.status, 'Received')
      ))
      .orderBy(desc(vaultDepositRequests.createdAt));
  }

  async createVaultDepositRequest(insertRequest: InsertVaultDepositRequest): Promise<VaultDepositRequest> {
    const [request] = await db.insert(vaultDepositRequests).values(insertRequest).returning();
    return request;
  }

  async updateVaultDepositRequest(id: string, updates: Partial<VaultDepositRequest>): Promise<VaultDepositRequest | undefined> {
    const [request] = await db.update(vaultDepositRequests).set({ ...updates, updatedAt: new Date() }).where(eq(vaultDepositRequests.id, id)).returning();
    return request || undefined;
  }

  // ============================================
  // VAULT WITHDRAWAL REQUESTS
  // ============================================

  generateVaultWithdrawalReferenceNumber(): string {
    const prefix = 'VW';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  async getVaultWithdrawalRequest(id: string): Promise<VaultWithdrawalRequest | undefined> {
    const [request] = await db.select().from(vaultWithdrawalRequests).where(eq(vaultWithdrawalRequests.id, id));
    return request || undefined;
  }

  async getVaultWithdrawalRequestByRef(referenceNumber: string): Promise<VaultWithdrawalRequest | undefined> {
    const [request] = await db.select().from(vaultWithdrawalRequests).where(eq(vaultWithdrawalRequests.referenceNumber, referenceNumber));
    return request || undefined;
  }

  async getUserVaultWithdrawalRequests(userId: string): Promise<VaultWithdrawalRequest[]> {
    return await db.select().from(vaultWithdrawalRequests).where(eq(vaultWithdrawalRequests.userId, userId)).orderBy(desc(vaultWithdrawalRequests.createdAt));
  }

  async getAllVaultWithdrawalRequests(): Promise<VaultWithdrawalRequest[]> {
    return await db.select().from(vaultWithdrawalRequests).orderBy(desc(vaultWithdrawalRequests.createdAt));
  }

  async getPendingVaultWithdrawalRequests(): Promise<VaultWithdrawalRequest[]> {
    return await db.select().from(vaultWithdrawalRequests)
      .where(or(
        eq(vaultWithdrawalRequests.status, 'Submitted'),
        eq(vaultWithdrawalRequests.status, 'Under Review'),
        eq(vaultWithdrawalRequests.status, 'Approved'),
        eq(vaultWithdrawalRequests.status, 'Processing')
      ))
      .orderBy(desc(vaultWithdrawalRequests.createdAt));
  }

  async createVaultWithdrawalRequest(insertRequest: InsertVaultWithdrawalRequest): Promise<VaultWithdrawalRequest> {
    const [request] = await db.insert(vaultWithdrawalRequests).values(insertRequest).returning();
    return request;
  }

  async updateVaultWithdrawalRequest(id: string, updates: Partial<VaultWithdrawalRequest>): Promise<VaultWithdrawalRequest | undefined> {
    const [request] = await db.update(vaultWithdrawalRequests).set({ ...updates, updatedAt: new Date() }).where(eq(vaultWithdrawalRequests.id, id)).returning();
    return request || undefined;
  }

  // ============================================
  // BINANCE PAY TRANSACTIONS
  // ============================================

  async createBinanceTransaction(insertTransaction: InsertBinanceTransaction): Promise<BinanceTransaction> {
    const [transaction] = await db.insert(binanceTransactions).values(insertTransaction).returning();
    return transaction;
  }

  async getBinanceTransaction(id: string): Promise<BinanceTransaction | undefined> {
    const [transaction] = await db.select().from(binanceTransactions).where(eq(binanceTransactions.id, id));
    return transaction || undefined;
  }

  async getBinanceTransactionByMerchantTradeNo(merchantTradeNo: string): Promise<BinanceTransaction | undefined> {
    const [transaction] = await db.select().from(binanceTransactions).where(eq(binanceTransactions.merchantTradeNo, merchantTradeNo));
    return transaction || undefined;
  }

  async getBinanceTransactionByPrepayId(prepayId: string): Promise<BinanceTransaction | undefined> {
    const [transaction] = await db.select().from(binanceTransactions).where(eq(binanceTransactions.prepayId, prepayId));
    return transaction || undefined;
  }

  async getUserBinanceTransactions(userId: string): Promise<BinanceTransaction[]> {
    return await db.select().from(binanceTransactions).where(eq(binanceTransactions.userId, userId)).orderBy(desc(binanceTransactions.createdAt));
  }

  async getAllBinanceTransactions(): Promise<BinanceTransaction[]> {
    return await db.select().from(binanceTransactions).orderBy(desc(binanceTransactions.createdAt));
  }

  async updateBinanceTransaction(id: string, updates: Partial<BinanceTransaction>): Promise<BinanceTransaction | undefined> {
    const [transaction] = await db.update(binanceTransactions).set({ ...updates, updatedAt: new Date() }).where(eq(binanceTransactions.id, id)).returning();
    return transaction || undefined;
  }

  async updateBinanceTransactionByMerchantTradeNo(merchantTradeNo: string, updates: Partial<BinanceTransaction>): Promise<BinanceTransaction | undefined> {
    const [transaction] = await db.update(binanceTransactions).set({ ...updates, updatedAt: new Date() }).where(eq(binanceTransactions.merchantTradeNo, merchantTradeNo)).returning();
    return transaction || undefined;
  }

  // ============================================
  // NGENIUS TRANSACTIONS
  // ============================================

  async createNgeniusTransaction(insertTransaction: InsertNgeniusTransaction): Promise<NgeniusTransaction> {
    const [transaction] = await db.insert(ngeniusTransactions).values(insertTransaction).returning();
    return transaction;
  }

  async getNgeniusTransaction(id: string): Promise<NgeniusTransaction | undefined> {
    const [transaction] = await db.select().from(ngeniusTransactions).where(eq(ngeniusTransactions.id, id));
    return transaction || undefined;
  }

  async getNgeniusTransactionByOrderReference(orderReference: string): Promise<NgeniusTransaction | undefined> {
    const [transaction] = await db.select().from(ngeniusTransactions).where(eq(ngeniusTransactions.orderReference, orderReference));
    return transaction || undefined;
  }

  async getNgeniusTransactionByNgeniusOrderId(ngeniusOrderId: string): Promise<NgeniusTransaction | undefined> {
    const [transaction] = await db.select().from(ngeniusTransactions).where(eq(ngeniusTransactions.ngeniusOrderId, ngeniusOrderId));
    return transaction || undefined;
  }

  async getUserNgeniusTransactions(userId: string): Promise<NgeniusTransaction[]> {
    return await db.select().from(ngeniusTransactions).where(eq(ngeniusTransactions.userId, userId)).orderBy(desc(ngeniusTransactions.createdAt));
  }

  async getAllNgeniusTransactions(): Promise<NgeniusTransaction[]> {
    return await db.select().from(ngeniusTransactions).orderBy(desc(ngeniusTransactions.createdAt));
  }

  async updateNgeniusTransaction(id: string, updates: Partial<NgeniusTransaction>): Promise<NgeniusTransaction | undefined> {
    const [transaction] = await db.update(ngeniusTransactions).set({ ...updates, updatedAt: new Date() }).where(eq(ngeniusTransactions.id, id)).returning();
    return transaction || undefined;
  }

  async updateNgeniusTransactionByOrderReference(orderReference: string, updates: Partial<NgeniusTransaction>): Promise<NgeniusTransaction | undefined> {
    const [transaction] = await db.update(ngeniusTransactions).set({ ...updates, updatedAt: new Date() }).where(eq(ngeniusTransactions.orderReference, orderReference)).returning();
    return transaction || undefined;
  }

  // ============================================
  // BRANDING SETTINGS
  // ============================================

  async getBrandingSettings(): Promise<BrandingSettings | undefined> {
    const [settings] = await db.select().from(brandingSettings).where(eq(brandingSettings.isActive, true)).limit(1);
    return settings || undefined;
  }

  async getOrCreateBrandingSettings(): Promise<BrandingSettings> {
    const existing = await this.getBrandingSettings();
    if (existing) return existing;
    
    const [settings] = await db.insert(brandingSettings).values({}).returning();
    return settings;
  }

  async updateBrandingSettings(updates: Partial<BrandingSettings>): Promise<BrandingSettings | undefined> {
    const existing = await this.getOrCreateBrandingSettings();
    const [settings] = await db.update(brandingSettings).set({ ...updates, updatedAt: new Date() }).where(eq(brandingSettings.id, existing.id)).returning();
    return settings || undefined;
  }

  // ============================================
  // PAYMENT GATEWAY SETTINGS
  // ============================================

  async getPaymentGatewaySettings(): Promise<PaymentGatewaySettings | undefined> {
    const [settings] = await db.select().from(paymentGatewaySettings).limit(1);
    return settings || undefined;
  }

  async getOrCreatePaymentGatewaySettings(): Promise<PaymentGatewaySettings> {
    const existing = await this.getPaymentGatewaySettings();
    if (existing) return existing;
    
    const [settings] = await db.insert(paymentGatewaySettings).values({}).returning();
    return settings;
  }

  async updatePaymentGatewaySettings(updates: Partial<PaymentGatewaySettings>): Promise<PaymentGatewaySettings | undefined> {
    const existing = await this.getOrCreatePaymentGatewaySettings();
    const [settings] = await db.update(paymentGatewaySettings).set({ ...updates, updatedAt: new Date() }).where(eq(paymentGatewaySettings.id, existing.id)).returning();
    return settings || undefined;
  }

  // ============================================
  // EMPLOYEES
  // ============================================

  async getEmployee(id: string): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.id, id));
    return employee || undefined;
  }

  async getEmployeeByUserId(userId: string): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.userId, userId));
    return employee || undefined;
  }

  async getEmployeeByEmployeeId(employeeId: string): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.employeeId, employeeId));
    return employee || undefined;
  }

  async getAllEmployees(): Promise<Employee[]> {
    return await db.select().from(employees).orderBy(desc(employees.createdAt));
  }

  async createEmployee(employee: InsertEmployee): Promise<Employee> {
    const [newEmployee] = await db.insert(employees).values(employee).returning();
    return newEmployee;
  }

  async updateEmployee(id: string, updates: Partial<Employee>): Promise<Employee | undefined> {
    const [employee] = await db.update(employees).set({ ...updates, updatedAt: new Date() }).where(eq(employees.id, id)).returning();
    return employee || undefined;
  }

  async deleteEmployee(id: string): Promise<boolean> {
    const result = await db.delete(employees).where(eq(employees.id, id)).returning();
    return result.length > 0;
  }

  async generateEmployeeId(): Promise<string> {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 4).toUpperCase();
    return `EMP-${timestamp}${random}`;
  }

  // ============================================
  // ROLE PERMISSIONS
  // ============================================

  async getRolePermission(role: string): Promise<RolePermission | undefined> {
    const [permission] = await db.select().from(rolePermissions).where(sql`${rolePermissions.role} = ${role}`);
    return permission || undefined;
  }

  async getAllRolePermissions(): Promise<RolePermission[]> {
    return await db.select().from(rolePermissions).orderBy(rolePermissions.role);
  }

  async createRolePermission(permission: InsertRolePermission): Promise<RolePermission> {
    const [newPermission] = await db.insert(rolePermissions).values(permission).returning();
    return newPermission;
  }

  async updateRolePermission(id: string, updates: Partial<RolePermission>): Promise<RolePermission | undefined> {
    const [permission] = await db.update(rolePermissions).set({ ...updates, updatedAt: new Date() }).where(eq(rolePermissions.id, id)).returning();
    return permission || undefined;
  }

  // ============================================
  // SECURITY SETTINGS
  // ============================================

  async getSecuritySettings(): Promise<SecuritySettings | undefined> {
    const [settings] = await db.select().from(securitySettings).limit(1);
    return settings || undefined;
  }

  async getOrCreateSecuritySettings(): Promise<SecuritySettings> {
    let settings = await this.getSecuritySettings();
    if (!settings) {
      const [newSettings] = await db.insert(securitySettings).values({}).returning();
      settings = newSettings;
    }
    return settings;
  }

  async updateSecuritySettings(updates: Partial<SecuritySettings>): Promise<SecuritySettings | undefined> {
    const existing = await this.getSecuritySettings();
    if (!existing) return undefined;
    const [settings] = await db.update(securitySettings).set({ ...updates, updatedAt: new Date() }).where(eq(securitySettings.id, existing.id)).returning();
    return settings || undefined;
  }

  // ============================================
  // OTP VERIFICATIONS
  // ============================================

  async createOtpVerification(otp: InsertOtpVerification): Promise<OtpVerification> {
    const [verification] = await db.insert(otpVerifications).values(otp).returning();
    return verification;
  }

  async getOtpVerification(id: string): Promise<OtpVerification | undefined> {
    const [verification] = await db.select().from(otpVerifications).where(eq(otpVerifications.id, id));
    return verification || undefined;
  }

  async getPendingOtp(userId: string, action: string): Promise<OtpVerification | undefined> {
    const [verification] = await db.select().from(otpVerifications)
      .where(and(
        eq(otpVerifications.userId, userId),
        eq(otpVerifications.action, action),
        eq(otpVerifications.verified, false)
      ))
      .orderBy(desc(otpVerifications.createdAt))
      .limit(1);
    return verification || undefined;
  }

  async updateOtpVerification(id: string, updates: Partial<OtpVerification>): Promise<OtpVerification | undefined> {
    const [verification] = await db.update(otpVerifications).set(updates).where(eq(otpVerifications.id, id)).returning();
    return verification || undefined;
  }

  // ============================================
  // USER PASSKEYS
  // ============================================

  async createUserPasskey(passkey: InsertUserPasskey): Promise<UserPasskey> {
    const [newPasskey] = await db.insert(userPasskeys).values(passkey).returning();
    return newPasskey;
  }

  async getUserPasskeys(userId: string): Promise<UserPasskey[]> {
    return await db.select().from(userPasskeys).where(eq(userPasskeys.userId, userId)).orderBy(desc(userPasskeys.createdAt));
  }

  async getPasskeyByCredentialId(credentialId: string): Promise<UserPasskey | undefined> {
    const [passkey] = await db.select().from(userPasskeys).where(eq(userPasskeys.credentialId, credentialId));
    return passkey || undefined;
  }

  async updateUserPasskey(id: string, updates: Partial<UserPasskey>): Promise<UserPasskey | undefined> {
    const [passkey] = await db.update(userPasskeys).set(updates).where(eq(userPasskeys.id, id)).returning();
    return passkey || undefined;
  }

  async deleteUserPasskey(id: string): Promise<boolean> {
    const result = await db.delete(userPasskeys).where(eq(userPasskeys.id, id)).returning();
    return result.length > 0;
  }

  // ============================================
  // INVOICES
  // ============================================

  async getInvoice(id: string): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice || undefined;
  }

  async getInvoiceByNumber(invoiceNumber: string): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.invoiceNumber, invoiceNumber));
    return invoice || undefined;
  }

  async getInvoiceByTransaction(transactionId: string): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.transactionId, transactionId));
    return invoice || undefined;
  }

  async getUserInvoices(userId: string): Promise<Invoice[]> {
    return await db.select().from(invoices).where(eq(invoices.userId, userId)).orderBy(desc(invoices.issuedAt));
  }

  async getAllInvoices(): Promise<Invoice[]> {
    return await db.select().from(invoices).orderBy(desc(invoices.issuedAt));
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const [newInvoice] = await db.insert(invoices).values(invoice).returning();
    return newInvoice;
  }

  async updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice | undefined> {
    const [invoice] = await db.update(invoices).set(updates).where(eq(invoices.id, id)).returning();
    return invoice || undefined;
  }

  async generateInvoiceNumber(): Promise<string> {
    const prefix = 'INV';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  // ============================================
  // CERTIFICATE DELIVERIES
  // ============================================

  async getCertificateDelivery(id: string): Promise<CertificateDelivery | undefined> {
    const [delivery] = await db.select().from(certificateDeliveries).where(eq(certificateDeliveries.id, id));
    return delivery || undefined;
  }

  async getCertificateDeliveryByCertificate(certificateId: string): Promise<CertificateDelivery | undefined> {
    const [delivery] = await db.select().from(certificateDeliveries).where(eq(certificateDeliveries.certificateId, certificateId));
    return delivery || undefined;
  }

  async getUserCertificateDeliveries(userId: string): Promise<CertificateDelivery[]> {
    return await db.select().from(certificateDeliveries).where(eq(certificateDeliveries.userId, userId)).orderBy(desc(certificateDeliveries.createdAt));
  }

  async getAllCertificateDeliveries(): Promise<CertificateDelivery[]> {
    return await db.select().from(certificateDeliveries).orderBy(desc(certificateDeliveries.createdAt));
  }

  async createCertificateDelivery(delivery: InsertCertificateDelivery): Promise<CertificateDelivery> {
    const [newDelivery] = await db.insert(certificateDeliveries).values(delivery).returning();
    return newDelivery;
  }

  async updateCertificateDelivery(id: string, updates: Partial<CertificateDelivery>): Promise<CertificateDelivery | undefined> {
    const [delivery] = await db.update(certificateDeliveries).set(updates).where(eq(certificateDeliveries.id, id)).returning();
    return delivery || undefined;
  }

  // ============================================
  // ADMIN ACTION OTP VERIFICATIONS
  // ============================================

  async createAdminActionOtp(otp: InsertAdminActionOtp): Promise<AdminActionOtp> {
    const [verification] = await db.insert(adminActionOtps).values(otp).returning();
    return verification;
  }

  async getAdminActionOtp(id: string): Promise<AdminActionOtp | undefined> {
    const [verification] = await db.select().from(adminActionOtps).where(eq(adminActionOtps.id, id));
    return verification || undefined;
  }

  async getPendingAdminActionOtp(adminId: string, actionType: string, targetId: string): Promise<AdminActionOtp | undefined> {
    const [verification] = await db.select().from(adminActionOtps)
      .where(and(
        eq(adminActionOtps.adminId, adminId),
        sql`${adminActionOtps.actionType} = ${actionType}`,
        eq(adminActionOtps.targetId, targetId),
        eq(adminActionOtps.verified, false)
      ))
      .orderBy(desc(adminActionOtps.createdAt))
      .limit(1);
    return verification || undefined;
  }

  async updateAdminActionOtp(id: string, updates: Partial<AdminActionOtp>): Promise<AdminActionOtp | undefined> {
    const [verification] = await db.update(adminActionOtps).set(updates).where(eq(adminActionOtps.id, id)).returning();
    return verification || undefined;
  }

  async cleanupExpiredAdminOtps(): Promise<number> {
    const result = await db.delete(adminActionOtps)
      .where(sql`${adminActionOtps.expiresAt} < NOW() AND ${adminActionOtps.verified} = false`)
      .returning();
    return result.length;
  }

  // ============================================
  // PASSWORD RESET TOKENS
  // ============================================

  async createPasswordResetToken(token: InsertPasswordResetToken): Promise<PasswordResetToken> {
    const [resetToken] = await db.insert(passwordResetTokens).values(token).returning();
    return resetToken;
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const [resetToken] = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.token, token));
    return resetToken || undefined;
  }

  async markPasswordResetTokenUsed(id: string): Promise<void> {
    await db.update(passwordResetTokens).set({ used: true }).where(eq(passwordResetTokens.id, id));
  }

  // ============================================
  // REFERRALS
  // ============================================

  async getReferral(id: string): Promise<Referral | undefined> {
    const [referral] = await db.select().from(referrals).where(eq(referrals.id, id));
    return referral || undefined;
  }

  async getReferralByCode(code: string): Promise<Referral | undefined> {
    const [referral] = await db.select().from(referrals).where(eq(referrals.referralCode, code));
    return referral || undefined;
  }

  async getPendingReferralByReferredId(referredId: string): Promise<Referral | undefined> {
    const [referral] = await db.select().from(referrals)
      .where(and(eq(referrals.referredId, referredId), eq(referrals.status, 'Pending')));
    return referral || undefined;
  }

  async getUserReferrals(referrerId: string): Promise<Referral[]> {
    return await db.select().from(referrals).where(eq(referrals.referrerId, referrerId)).orderBy(desc(referrals.createdAt));
  }

  async getAllReferrals(): Promise<Referral[]> {
    return await db.select().from(referrals).orderBy(desc(referrals.createdAt));
  }

  async createReferral(referral: InsertReferral): Promise<Referral> {
    const [newReferral] = await db.insert(referrals).values(referral).returning();
    return newReferral;
  }

  async updateReferral(id: string, updates: Partial<Referral>): Promise<Referral | undefined> {
    const [referral] = await db.update(referrals).set(updates).where(eq(referrals.id, id)).returning();
    return referral || undefined;
  }

  // ============================================
  // AUDIT LOGS (extended)
  // ============================================

  async getAllAuditLogs(): Promise<AuditLog[]> {
    return await db.select().from(auditLogs).orderBy(desc(auditLogs.timestamp));
  }

  // ============================================
  // USER RISK PROFILES
  // ============================================

  async getUserRiskProfile(userId: string): Promise<UserRiskProfile | undefined> {
    const [profile] = await db.select().from(userRiskProfiles).where(eq(userRiskProfiles.userId, userId));
    return profile || undefined;
  }

  async getAllUserRiskProfiles(): Promise<UserRiskProfile[]> {
    return await db.select().from(userRiskProfiles).orderBy(desc(userRiskProfiles.updatedAt));
  }

  async getHighRiskProfiles(): Promise<UserRiskProfile[]> {
    return await db.select().from(userRiskProfiles)
      .where(or(
        eq(userRiskProfiles.riskLevel, 'High'),
        eq(userRiskProfiles.riskLevel, 'Critical')
      ))
      .orderBy(desc(userRiskProfiles.overallRiskScore));
  }

  async createUserRiskProfile(profile: InsertUserRiskProfile): Promise<UserRiskProfile> {
    const [newProfile] = await db.insert(userRiskProfiles).values(profile).returning();
    return newProfile;
  }

  async updateUserRiskProfile(id: string, updates: Partial<UserRiskProfile>): Promise<UserRiskProfile | undefined> {
    const [profile] = await db.update(userRiskProfiles).set({ ...updates, updatedAt: new Date() }).where(eq(userRiskProfiles.id, id)).returning();
    return profile || undefined;
  }

  async getOrCreateUserRiskProfile(userId: string): Promise<UserRiskProfile> {
    const existing = await this.getUserRiskProfile(userId);
    if (existing) return existing;
    
    return await this.createUserRiskProfile({
      userId,
      overallRiskScore: 0,
      riskLevel: 'Low',
      lastAssessedAt: new Date(),
    });
  }

  // ============================================
  // AML SCREENING LOGS
  // ============================================

  async getAmlScreeningLog(id: string): Promise<AmlScreeningLog | undefined> {
    const [log] = await db.select().from(amlScreeningLogs).where(eq(amlScreeningLogs.id, id));
    return log || undefined;
  }

  async getUserAmlScreeningLogs(userId: string): Promise<AmlScreeningLog[]> {
    return await db.select().from(amlScreeningLogs).where(eq(amlScreeningLogs.userId, userId)).orderBy(desc(amlScreeningLogs.createdAt));
  }

  async getKycSubmissionScreeningLogs(kycSubmissionId: string): Promise<AmlScreeningLog[]> {
    return await db.select().from(amlScreeningLogs).where(eq(amlScreeningLogs.kycSubmissionId, kycSubmissionId)).orderBy(desc(amlScreeningLogs.createdAt));
  }

  async getAllAmlScreeningLogs(): Promise<AmlScreeningLog[]> {
    return await db.select().from(amlScreeningLogs).orderBy(desc(amlScreeningLogs.createdAt));
  }

  async createAmlScreeningLog(log: InsertAmlScreeningLog): Promise<AmlScreeningLog> {
    const [newLog] = await db.insert(amlScreeningLogs).values(log).returning();
    return newLog;
  }

  async updateAmlScreeningLog(id: string, updates: Partial<AmlScreeningLog>): Promise<AmlScreeningLog | undefined> {
    const [log] = await db.update(amlScreeningLogs).set(updates).where(eq(amlScreeningLogs.id, id)).returning();
    return log || undefined;
  }

  // ============================================
  // AML CASES
  // ============================================

  async getAmlCase(id: string): Promise<AmlCase | undefined> {
    const [amlCase] = await db.select().from(amlCases).where(eq(amlCases.id, id));
    return amlCase || undefined;
  }

  async getAmlCaseByCaseNumber(caseNumber: string): Promise<AmlCase | undefined> {
    const [amlCase] = await db.select().from(amlCases).where(eq(amlCases.caseNumber, caseNumber));
    return amlCase || undefined;
  }

  async getUserAmlCases(userId: string): Promise<AmlCase[]> {
    return await db.select().from(amlCases).where(eq(amlCases.userId, userId)).orderBy(desc(amlCases.createdAt));
  }

  async getAllAmlCases(): Promise<AmlCase[]> {
    return await db.select().from(amlCases).orderBy(desc(amlCases.createdAt));
  }

  async getOpenAmlCases(): Promise<AmlCase[]> {
    return await db.select().from(amlCases)
      .where(or(
        eq(amlCases.status, 'Open'),
        eq(amlCases.status, 'Under Investigation'),
        eq(amlCases.status, 'Pending SAR')
      ))
      .orderBy(desc(amlCases.createdAt));
  }

  async createAmlCase(amlCase: InsertAmlCase): Promise<AmlCase> {
    const [newCase] = await db.insert(amlCases).values(amlCase).returning();
    return newCase;
  }

  async updateAmlCase(id: string, updates: Partial<AmlCase>): Promise<AmlCase | undefined> {
    const [amlCase] = await db.update(amlCases).set({ ...updates, updatedAt: new Date() }).where(eq(amlCases.id, id)).returning();
    return amlCase || undefined;
  }

  async generateAmlCaseNumber(): Promise<string> {
    const prefix = 'AML';
    const year = new Date().getFullYear();
    const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${year}-${timestamp}${random}`;
  }

  // ============================================
  // AML CASE ACTIVITIES
  // ============================================

  async getAmlCaseActivities(caseId: string): Promise<AmlCaseActivity[]> {
    return await db.select().from(amlCaseActivities).where(eq(amlCaseActivities.caseId, caseId)).orderBy(desc(amlCaseActivities.performedAt));
  }

  async createAmlCaseActivity(activity: InsertAmlCaseActivity): Promise<AmlCaseActivity> {
    const [newActivity] = await db.insert(amlCaseActivities).values(activity).returning();
    return newActivity;
  }

  // ============================================
  // AML MONITORING RULES
  // ============================================

  async getAmlMonitoringRule(id: string): Promise<AmlMonitoringRule | undefined> {
    const [rule] = await db.select().from(amlMonitoringRules).where(eq(amlMonitoringRules.id, id));
    return rule || undefined;
  }

  async getAmlMonitoringRuleByCode(ruleCode: string): Promise<AmlMonitoringRule | undefined> {
    const [rule] = await db.select().from(amlMonitoringRules).where(eq(amlMonitoringRules.ruleCode, ruleCode));
    return rule || undefined;
  }

  async getAllAmlMonitoringRules(): Promise<AmlMonitoringRule[]> {
    return await db.select().from(amlMonitoringRules).orderBy(desc(amlMonitoringRules.priority));
  }

  async getActiveAmlMonitoringRules(): Promise<AmlMonitoringRule[]> {
    return await db.select().from(amlMonitoringRules).where(eq(amlMonitoringRules.isActive, true)).orderBy(desc(amlMonitoringRules.priority));
  }

  async createAmlMonitoringRule(rule: InsertAmlMonitoringRule): Promise<AmlMonitoringRule> {
    const [newRule] = await db.insert(amlMonitoringRules).values(rule).returning();
    return newRule;
  }

  async updateAmlMonitoringRule(id: string, updates: Partial<AmlMonitoringRule>): Promise<AmlMonitoringRule | undefined> {
    const [rule] = await db.update(amlMonitoringRules).set({ ...updates, updatedAt: new Date() }).where(eq(amlMonitoringRules.id, id)).returning();
    return rule || undefined;
  }

  async deleteAmlMonitoringRule(id: string): Promise<boolean> {
    const result = await db.delete(amlMonitoringRules).where(eq(amlMonitoringRules.id, id)).returning();
    return result.length > 0;
  }

  // ============================================
  // COMPLIANCE SETTINGS
  // ============================================

  async getComplianceSettings(): Promise<ComplianceSettings | undefined> {
    const [settings] = await db.select().from(complianceSettings).limit(1);
    return settings || undefined;
  }

  async getOrCreateComplianceSettings(): Promise<ComplianceSettings> {
    const existing = await this.getComplianceSettings();
    if (existing) return existing;
    
    const [settings] = await db.insert(complianceSettings).values({
      activeKycMode: 'finatrades',
      finatradesPersonalConfig: {
        enableBankingVerification: true,
        enableLivenessCapture: true
      },
      finanatradesCorporateConfig: {
        enableLivenessCapture: true,
        requiredDocuments: ['certificate_of_incorporation', 'trade_license', 'memorandum_articles', 'ubo_passports', 'bank_reference', 'authorized_signatories']
      }
    }).returning();
    return settings;
  }

  async updateComplianceSettings(updates: Partial<ComplianceSettings>): Promise<ComplianceSettings | undefined> {
    const existing = await this.getOrCreateComplianceSettings();
    const [settings] = await db.update(complianceSettings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(complianceSettings.id, existing.id))
      .returning();
    return settings || undefined;
  }

  // ============================================
  // FINATRADES PERSONAL KYC
  // ============================================

  async getFinatradesPersonalKyc(userId: string): Promise<FinatradesPersonalKyc | undefined> {
    const [kyc] = await db.select().from(finatradesPersonalKyc).where(eq(finatradesPersonalKyc.userId, userId)).orderBy(desc(finatradesPersonalKyc.createdAt)).limit(1);
    return kyc || undefined;
  }

  async getAllFinatradesPersonalKyc(): Promise<FinatradesPersonalKyc[]> {
    return await db.select().from(finatradesPersonalKyc).orderBy(desc(finatradesPersonalKyc.createdAt));
  }

  async createFinatradesPersonalKyc(kyc: InsertFinatradesPersonalKyc): Promise<FinatradesPersonalKyc> {
    const [newKyc] = await db.insert(finatradesPersonalKyc).values(kyc).returning();
    return newKyc;
  }

  async updateFinatradesPersonalKyc(id: string, updates: Partial<FinatradesPersonalKyc>): Promise<FinatradesPersonalKyc | undefined> {
    const [kyc] = await db.update(finatradesPersonalKyc).set({ ...updates, updatedAt: new Date() }).where(eq(finatradesPersonalKyc.id, id)).returning();
    return kyc || undefined;
  }

  // ============================================
  // FINATRADES CORPORATE KYC
  // ============================================

  async getFinatradesCorporateKyc(userId: string): Promise<FinatradesCorporateKyc | undefined> {
    const [kyc] = await db.select().from(finatradesCorporateKyc).where(eq(finatradesCorporateKyc.userId, userId)).orderBy(desc(finatradesCorporateKyc.createdAt)).limit(1);
    return kyc || undefined;
  }

  async getAllFinatradesCorporateKyc(): Promise<FinatradesCorporateKyc[]> {
    return await db.select().from(finatradesCorporateKyc).orderBy(desc(finatradesCorporateKyc.createdAt));
  }

  async createFinatradesCorporateKyc(kyc: InsertFinatradesCorporateKyc): Promise<FinatradesCorporateKyc> {
    const [newKyc] = await db.insert(finatradesCorporateKyc).values(kyc).returning();
    return newKyc;
  }

  async updateFinatradesCorporateKyc(id: string, updates: Partial<FinatradesCorporateKyc>): Promise<FinatradesCorporateKyc | undefined> {
    const [kyc] = await db.update(finatradesCorporateKyc).set({ ...updates, updatedAt: new Date() }).where(eq(finatradesCorporateKyc.id, id)).returning();
    return kyc || undefined;
  }

  // ============================================
  // USER NOTIFICATIONS
  // ============================================

  async getNotification(id: string): Promise<Notification | undefined> {
    const [notification] = await db.select().from(notifications).where(eq(notifications.id, id));
    return notification || undefined;
  }

  async getUserNotifications(userId: string): Promise<Notification[]> {
    return await db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db.insert(notifications).values(notification).returning();
    return newNotification;
  }

  async markNotificationRead(id: string): Promise<Notification | undefined> {
    const [notification] = await db.update(notifications).set({ read: true }).where(eq(notifications.id, id)).returning();
    return notification || undefined;
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await db.update(notifications).set({ read: true }).where(eq(notifications.userId, userId));
  }

  async deleteNotification(id: string): Promise<boolean> {
    const result = await db.delete(notifications).where(eq(notifications.id, id)).returning();
    return result.length > 0;
  }

  async deleteAllNotifications(userId: string): Promise<void> {
    await db.delete(notifications).where(eq(notifications.userId, userId));
  }

  // ============================================
  // USER PREFERENCES
  // ============================================

  async getUserPreferences(userId: string): Promise<UserPreferences | undefined> {
    const [prefs] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId));
    return prefs || undefined;
  }

  async createUserPreferences(preferences: InsertUserPreferences): Promise<UserPreferences> {
    const [newPrefs] = await db.insert(userPreferences).values(preferences).returning();
    return newPrefs;
  }

  async updateUserPreferences(userId: string, updates: Partial<UserPreferences>): Promise<UserPreferences | undefined> {
    const [prefs] = await db.update(userPreferences)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(userPreferences.userId, userId))
      .returning();
    return prefs || undefined;
  }

  async getOrCreateUserPreferences(userId: string): Promise<UserPreferences> {
    let prefs = await this.getUserPreferences(userId);
    if (!prefs) {
      prefs = await this.createUserPreferences({ userId });
    }
    return prefs;
  }

  // ============================================
  // CRYPTO WALLET CONFIGURATIONS
  // ============================================

  async getCryptoWalletConfig(id: string): Promise<CryptoWalletConfig | undefined> {
    const [config] = await db.select().from(cryptoWalletConfigs).where(eq(cryptoWalletConfigs.id, id));
    return config || undefined;
  }

  async getAllCryptoWalletConfigs(): Promise<CryptoWalletConfig[]> {
    return await db.select().from(cryptoWalletConfigs).orderBy(cryptoWalletConfigs.displayOrder);
  }

  async getActiveCryptoWalletConfigs(): Promise<CryptoWalletConfig[]> {
    return await db.select().from(cryptoWalletConfigs)
      .where(eq(cryptoWalletConfigs.isActive, true))
      .orderBy(cryptoWalletConfigs.displayOrder);
  }

  async createCryptoWalletConfig(config: InsertCryptoWalletConfig): Promise<CryptoWalletConfig> {
    const [newConfig] = await db.insert(cryptoWalletConfigs).values(config).returning();
    return newConfig;
  }

  async updateCryptoWalletConfig(id: string, updates: Partial<CryptoWalletConfig>): Promise<CryptoWalletConfig | undefined> {
    const [config] = await db.update(cryptoWalletConfigs).set({ ...updates, updatedAt: new Date() }).where(eq(cryptoWalletConfigs.id, id)).returning();
    return config || undefined;
  }

  async deleteCryptoWalletConfig(id: string): Promise<boolean> {
    const result = await db.delete(cryptoWalletConfigs).where(eq(cryptoWalletConfigs.id, id)).returning();
    return result.length > 0;
  }

  // ============================================
  // CRYPTO PAYMENT REQUESTS
  // ============================================

  async getCryptoPaymentRequest(id: string): Promise<CryptoPaymentRequest | undefined> {
    const [request] = await db.select().from(cryptoPaymentRequests).where(eq(cryptoPaymentRequests.id, id));
    return request || undefined;
  }

  async getUserCryptoPaymentRequests(userId: string): Promise<CryptoPaymentRequest[]> {
    return await db.select().from(cryptoPaymentRequests)
      .where(eq(cryptoPaymentRequests.userId, userId))
      .orderBy(desc(cryptoPaymentRequests.createdAt));
  }

  async getAllCryptoPaymentRequests(): Promise<CryptoPaymentRequest[]> {
    return await db.select().from(cryptoPaymentRequests).orderBy(desc(cryptoPaymentRequests.createdAt));
  }

  async getCryptoPaymentRequestsByStatus(status: string): Promise<CryptoPaymentRequest[]> {
    return await db.select().from(cryptoPaymentRequests)
      .where(eq(cryptoPaymentRequests.status, status as any))
      .orderBy(desc(cryptoPaymentRequests.createdAt));
  }

  async createCryptoPaymentRequest(request: InsertCryptoPaymentRequest): Promise<CryptoPaymentRequest> {
    const [newRequest] = await db.insert(cryptoPaymentRequests).values(request).returning();
    return newRequest;
  }

  async updateCryptoPaymentRequest(id: string, updates: Partial<CryptoPaymentRequest>): Promise<CryptoPaymentRequest | undefined> {
    const [request] = await db.update(cryptoPaymentRequests).set({ ...updates, updatedAt: new Date() }).where(eq(cryptoPaymentRequests.id, id)).returning();
    return request || undefined;
  }

  // ============================================
  // BUY GOLD REQUESTS (Wingold & Metals)
  // ============================================

  async getBuyGoldRequest(id: string): Promise<BuyGoldRequest | undefined> {
    const [request] = await db.select().from(buyGoldRequests).where(eq(buyGoldRequests.id, id));
    return request || undefined;
  }

  async getUserBuyGoldRequests(userId: string): Promise<BuyGoldRequest[]> {
    return await db.select().from(buyGoldRequests)
      .where(eq(buyGoldRequests.userId, userId))
      .orderBy(desc(buyGoldRequests.createdAt));
  }

  async getAllBuyGoldRequests(): Promise<BuyGoldRequest[]> {
    return await db.select().from(buyGoldRequests).orderBy(desc(buyGoldRequests.createdAt));
  }

  async getBuyGoldRequestsByStatus(status: string): Promise<BuyGoldRequest[]> {
    return await db.select().from(buyGoldRequests)
      .where(eq(buyGoldRequests.status, status as any))
      .orderBy(desc(buyGoldRequests.createdAt));
  }

  async createBuyGoldRequest(request: InsertBuyGoldRequest): Promise<BuyGoldRequest> {
    const [newRequest] = await db.insert(buyGoldRequests).values(request).returning();
    return newRequest;
  }

  async updateBuyGoldRequest(id: string, updates: Partial<BuyGoldRequest>): Promise<BuyGoldRequest | undefined> {
    const [request] = await db.update(buyGoldRequests).set({ ...updates, updatedAt: new Date() }).where(eq(buyGoldRequests.id, id)).returning();
    return request || undefined;
  }

  // ============================================
  // PLATFORM CONFIGURATION
  // ============================================

  async getPlatformConfig(key: string): Promise<PlatformConfig | undefined> {
    const [config] = await db.select().from(platformConfig).where(eq(platformConfig.configKey, key));
    return config || undefined;
  }

  async getPlatformConfigsByCategory(category: string): Promise<PlatformConfig[]> {
    return await db.select().from(platformConfig)
      .where(eq(platformConfig.category, category as any))
      .orderBy(platformConfig.displayOrder);
  }

  async getAllPlatformConfigs(): Promise<PlatformConfig[]> {
    return await db.select().from(platformConfig).orderBy(platformConfig.category, platformConfig.displayOrder);
  }

  async createPlatformConfig(config: InsertPlatformConfig): Promise<PlatformConfig> {
    const [newConfig] = await db.insert(platformConfig).values(config).returning();
    return newConfig;
  }

  async updatePlatformConfig(id: string, updates: Partial<PlatformConfig>): Promise<PlatformConfig | undefined> {
    const [config] = await db.update(platformConfig).set({ ...updates, updatedAt: new Date() }).where(eq(platformConfig.id, id)).returning();
    return config || undefined;
  }

  async upsertPlatformConfig(config: InsertPlatformConfig): Promise<PlatformConfig> {
    const existing = await this.getPlatformConfig(config.configKey);
    if (existing) {
      const [updated] = await db.update(platformConfig)
        .set({ ...config, updatedAt: new Date() })
        .where(eq(platformConfig.configKey, config.configKey))
        .returning();
      return updated;
    }
    return await this.createPlatformConfig(config);
  }

  async deletePlatformConfig(id: string): Promise<boolean> {
    const result = await db.delete(platformConfig).where(eq(platformConfig.id, id)).returning();
    return result.length > 0;
  }

  async seedDefaultPlatformConfig(): Promise<void> {
    const existingConfigs = await this.getAllPlatformConfigs();
    if (existingConfigs.length > 0) return;

    const defaultConfigs: InsertPlatformConfig[] = [
      // Gold Pricing
      { category: 'gold_pricing', configKey: 'buy_spread_percent', configValue: '1.5', configType: 'number', displayName: 'Buy Spread %', description: 'Markup on spot gold price for purchases', displayOrder: 1 },
      { category: 'gold_pricing', configKey: 'sell_spread_percent', configValue: '1.0', configType: 'number', displayName: 'Sell Spread %', description: 'Markdown on spot gold price for sales', displayOrder: 2 },
      { category: 'gold_pricing', configKey: 'storage_fee_percent', configValue: '0.5', configType: 'number', displayName: 'Storage Fee (Annual %)', description: 'Annual custody fee for vault holdings', displayOrder: 3 },
      { category: 'gold_pricing', configKey: 'gold_price_cache_minutes', configValue: '5', configType: 'number', displayName: 'Price Cache Duration (min)', description: 'How long to cache API gold price', displayOrder: 4 },

      // Transaction Limits - Tier 1
      { category: 'transaction_limits', configKey: 'tier1_daily_limit', configValue: '5000', configType: 'number', displayName: 'Tier 1 Daily Limit (USD)', description: 'Maximum daily transactions for Tier 1 users', displayOrder: 1 },
      { category: 'transaction_limits', configKey: 'tier1_monthly_limit', configValue: '20000', configType: 'number', displayName: 'Tier 1 Monthly Limit (USD)', description: 'Maximum monthly transactions for Tier 1 users', displayOrder: 2 },
      { category: 'transaction_limits', configKey: 'tier1_single_max', configValue: '2000', configType: 'number', displayName: 'Tier 1 Single Transaction Max (USD)', description: 'Maximum single transaction for Tier 1 users', displayOrder: 3 },
      // Transaction Limits - Tier 2
      { category: 'transaction_limits', configKey: 'tier2_daily_limit', configValue: '50000', configType: 'number', displayName: 'Tier 2 Daily Limit (USD)', description: 'Maximum daily transactions for Tier 2 users', displayOrder: 4 },
      { category: 'transaction_limits', configKey: 'tier2_monthly_limit', configValue: '250000', configType: 'number', displayName: 'Tier 2 Monthly Limit (USD)', description: 'Maximum monthly transactions for Tier 2 users', displayOrder: 5 },
      { category: 'transaction_limits', configKey: 'tier2_single_max', configValue: '25000', configType: 'number', displayName: 'Tier 2 Single Transaction Max (USD)', description: 'Maximum single transaction for Tier 2 users', displayOrder: 6 },
      // Transaction Limits - Tier 3
      { category: 'transaction_limits', configKey: 'tier3_daily_limit', configValue: '500000', configType: 'number', displayName: 'Tier 3 Daily Limit (USD)', description: 'Maximum daily transactions for Tier 3 users', displayOrder: 7 },
      { category: 'transaction_limits', configKey: 'tier3_monthly_limit', configValue: '0', configType: 'number', displayName: 'Tier 3 Monthly Limit (USD)', description: '0 means unlimited', displayOrder: 8 },
      { category: 'transaction_limits', configKey: 'tier3_single_max', configValue: '500000', configType: 'number', displayName: 'Tier 3 Single Transaction Max (USD)', description: 'Maximum single transaction for Tier 3 users', displayOrder: 9 },
      { category: 'transaction_limits', configKey: 'min_trade_amount', configValue: '50', configType: 'number', displayName: 'Minimum Trade Amount (USD)', description: 'Minimum amount for any buy/sell transaction', displayOrder: 10 },

      // Deposit Limits
      { category: 'deposit_limits', configKey: 'min_deposit', configValue: '50', configType: 'number', displayName: 'Minimum Deposit (USD)', description: 'Minimum allowed deposit amount', displayOrder: 1 },
      { category: 'deposit_limits', configKey: 'max_deposit_single', configValue: '100000', configType: 'number', displayName: 'Maximum Single Deposit (USD)', description: 'Maximum amount per deposit', displayOrder: 2 },
      { category: 'deposit_limits', configKey: 'daily_deposit_limit', configValue: '250000', configType: 'number', displayName: 'Daily Deposit Limit (USD)', description: 'Maximum total deposits per day', displayOrder: 3 },
      { category: 'deposit_limits', configKey: 'monthly_deposit_limit', configValue: '1000000', configType: 'number', displayName: 'Monthly Deposit Limit (USD)', description: 'Maximum total deposits per month', displayOrder: 4 },

      // Withdrawal Limits
      { category: 'withdrawal_limits', configKey: 'min_withdrawal', configValue: '100', configType: 'number', displayName: 'Minimum Withdrawal (USD)', description: 'Minimum allowed withdrawal amount', displayOrder: 1 },
      { category: 'withdrawal_limits', configKey: 'max_withdrawal_single', configValue: '50000', configType: 'number', displayName: 'Maximum Single Withdrawal (USD)', description: 'Maximum amount per withdrawal', displayOrder: 2 },
      { category: 'withdrawal_limits', configKey: 'daily_withdrawal_limit', configValue: '100000', configType: 'number', displayName: 'Daily Withdrawal Limit (USD)', description: 'Maximum total withdrawals per day', displayOrder: 3 },
      { category: 'withdrawal_limits', configKey: 'withdrawal_pending_hours', configValue: '24', configType: 'number', displayName: 'Withdrawal Pending Period (hours)', description: 'Security hold before processing', displayOrder: 4 },
      { category: 'withdrawal_limits', configKey: 'withdrawal_fee_percent', configValue: '0', configType: 'number', displayName: 'Withdrawal Fee (%)', description: 'Percentage fee for withdrawals', displayOrder: 5 },
      { category: 'withdrawal_limits', configKey: 'withdrawal_fee_fixed', configValue: '0', configType: 'number', displayName: 'Withdrawal Fee (Fixed USD)', description: 'Fixed fee for withdrawals', displayOrder: 6 },

      // P2P Limits
      { category: 'p2p_limits', configKey: 'min_p2p_transfer', configValue: '10', configType: 'number', displayName: 'Minimum P2P Transfer (USD)', description: 'Minimum amount for peer-to-peer transfers', displayOrder: 1 },
      { category: 'p2p_limits', configKey: 'max_p2p_transfer', configValue: '10000', configType: 'number', displayName: 'Maximum P2P Transfer (USD)', description: 'Maximum single P2P transfer', displayOrder: 2 },
      { category: 'p2p_limits', configKey: 'daily_p2p_limit', configValue: '25000', configType: 'number', displayName: 'Daily P2P Limit (USD)', description: 'Maximum total P2P transfers per day', displayOrder: 3 },
      { category: 'p2p_limits', configKey: 'monthly_p2p_limit', configValue: '100000', configType: 'number', displayName: 'Monthly P2P Limit (USD)', description: 'Maximum total P2P transfers per month', displayOrder: 4 },
      { category: 'p2p_limits', configKey: 'p2p_fee_percent', configValue: '0', configType: 'number', displayName: 'P2P Fee (%)', description: 'Percentage fee for P2P transfers', displayOrder: 5 },

      // BNSL Settings
      { category: 'bnsl_settings', configKey: 'bnsl_agreement_fee_percent', configValue: '1.0', configType: 'number', displayName: 'BNSL Agreement Fee (%)', description: 'Fee charged when creating BNSL agreement', displayOrder: 1 },
      { category: 'bnsl_settings', configKey: 'bnsl_max_term_months', configValue: '24', configType: 'number', displayName: 'Max BNSL Term (months)', description: 'Maximum contract duration', displayOrder: 2 },
      { category: 'bnsl_settings', configKey: 'bnsl_min_amount', configValue: '500', configType: 'number', displayName: 'Minimum BNSL Amount (USD)', description: 'Minimum value for BNSL agreement', displayOrder: 3 },
      { category: 'bnsl_settings', configKey: 'bnsl_early_exit_penalty', configValue: '5.0', configType: 'number', displayName: 'Early Exit Penalty (%)', description: 'Penalty for early termination', displayOrder: 4 },

      // FinaBridge Settings
      { category: 'finabridge_settings', configKey: 'trade_finance_fee_percent', configValue: '1.5', configType: 'number', displayName: 'Trade Finance Fee (%)', description: 'Fee for trade finance services', displayOrder: 1 },
      { category: 'finabridge_settings', configKey: 'max_trade_case_value', configValue: '1000000', configType: 'number', displayName: 'Max Trade Case Value (USD)', description: 'Maximum value for single trade case', displayOrder: 2 },
      { category: 'finabridge_settings', configKey: 'lc_issuance_fee', configValue: '250', configType: 'number', displayName: 'LC Issuance Fee (USD)', description: 'Letter of Credit issuance fee', displayOrder: 3 },
      { category: 'finabridge_settings', configKey: 'document_processing_fee', configValue: '25', configType: 'number', displayName: 'Document Processing Fee (USD)', description: 'Fee per document processed', displayOrder: 4 },

      // Payment Fees
      { category: 'payment_fees', configKey: 'bank_transfer_fee_percent', configValue: '0', configType: 'number', displayName: 'Bank Transfer Fee (%)', description: 'Fee for bank transfer payments', displayOrder: 1 },
      { category: 'payment_fees', configKey: 'bank_transfer_fee_fixed', configValue: '0', configType: 'number', displayName: 'Bank Transfer Fee (Fixed USD)', description: 'Fixed fee for bank transfers', displayOrder: 2 },
      { category: 'payment_fees', configKey: 'card_fee_percent', configValue: '2.9', configType: 'number', displayName: 'Card Payment Fee (%)', description: 'Fee for card payments (Stripe/NGenius)', displayOrder: 3 },
      { category: 'payment_fees', configKey: 'card_fee_fixed', configValue: '0.30', configType: 'number', displayName: 'Card Payment Fee (Fixed USD)', description: 'Fixed fee for card payments', displayOrder: 4 },
      { category: 'payment_fees', configKey: 'crypto_fee_percent', configValue: '0.5', configType: 'number', displayName: 'Crypto Payment Fee (%)', description: 'Fee for cryptocurrency payments', displayOrder: 5 },

      // KYC Settings
      { category: 'kyc_settings', configKey: 'auto_approve_low_risk', configValue: 'false', configType: 'boolean', displayName: 'Auto-approve Low Risk KYC', description: 'Automatically approve low-risk KYC submissions', displayOrder: 1 },
      { category: 'kyc_settings', configKey: 'kyc_expiry_days', configValue: '365', configType: 'number', displayName: 'KYC Expiry (days)', description: 'When to request re-verification', displayOrder: 2 },
      { category: 'kyc_settings', configKey: 'document_expiry_warning_days', configValue: '30', configType: 'number', displayName: 'Document Expiry Warning (days)', description: 'Days before document expiry to warn user', displayOrder: 3 },
      { category: 'kyc_settings', configKey: 'blocked_countries', configValue: '[]', configType: 'json', displayName: 'Blocked Countries', description: 'List of restricted countries (JSON array)', displayOrder: 4 },

      // System Settings
      { category: 'system_settings', configKey: 'maintenance_mode', configValue: 'false', configType: 'boolean', displayName: 'Maintenance Mode', description: 'Disable platform for maintenance', displayOrder: 1 },
      { category: 'system_settings', configKey: 'registrations_enabled', configValue: 'true', configType: 'boolean', displayName: 'Registration Enabled', description: 'Allow new user signups', displayOrder: 2 },
      { category: 'system_settings', configKey: 'email_notifications_enabled', configValue: 'true', configType: 'boolean', displayName: 'Email Notifications', description: 'Enable email alerts', displayOrder: 3 },
      { category: 'system_settings', configKey: 'sms_notifications_enabled', configValue: 'false', configType: 'boolean', displayName: 'SMS Notifications', description: 'Enable SMS alerts', displayOrder: 4 },
      { category: 'system_settings', configKey: 'session_timeout_minutes', configValue: '30', configType: 'number', displayName: 'Session Timeout (minutes)', description: 'Auto-logout after inactivity', displayOrder: 5 },
      { category: 'system_settings', configKey: 'require_2fa', configValue: 'false', configType: 'boolean', displayName: '2FA Required', description: 'Force 2FA for all users', displayOrder: 6 },

      // Vault Settings
      { category: 'vault_settings', configKey: 'vault_inventory_grams', configValue: '125000', configType: 'number', displayName: 'Vault Inventory (grams)', description: 'Total physical gold in vault', displayOrder: 1 },
      { category: 'vault_settings', configKey: 'reserved_gold_grams', configValue: '118450', configType: 'number', displayName: 'Reserved Gold (grams)', description: 'Gold allocated to users', displayOrder: 2 },
      { category: 'vault_settings', configKey: 'low_stock_alert_grams', configValue: '1000', configType: 'number', displayName: 'Low Stock Alert (grams)', description: 'Alert when available stock is below this', displayOrder: 3 },
      { category: 'vault_settings', configKey: 'min_physical_redemption_grams', configValue: '10', configType: 'number', displayName: 'Min Physical Redemption (grams)', description: 'Minimum gold for physical delivery', displayOrder: 4 },

      // Referral Settings
      { category: 'referral_settings', configKey: 'referrer_bonus_usd', configValue: '10', configType: 'number', displayName: 'Referrer Bonus (USD)', description: 'Bonus for existing user who refers', displayOrder: 1 },
      { category: 'referral_settings', configKey: 'referee_bonus_usd', configValue: '5', configType: 'number', displayName: 'Referee Bonus (USD)', description: 'Bonus for new referred user', displayOrder: 2 },
      { category: 'referral_settings', configKey: 'max_referrals_per_user', configValue: '50', configType: 'number', displayName: 'Max Referrals per User', description: 'Limit on referrals per user', displayOrder: 3 },
      { category: 'referral_settings', configKey: 'referral_validity_days', configValue: '30', configType: 'number', displayName: 'Referral Validity (days)', description: 'How long referral code is valid', displayOrder: 4 },
      { category: 'referral_settings', configKey: 'min_deposit_for_bonus', configValue: '100', configType: 'number', displayName: 'Min Deposit for Bonus (USD)', description: 'Minimum first deposit to earn referral bonus', displayOrder: 5 },
      
      // Terms & Conditions
      { category: 'terms_conditions', configKey: 'deposit_terms', configValue: 'By proceeding with this deposit, you agree to the following terms:\n\n1. Gold price shown is tentative and subject to change upon fund verification.\n2. Deposits will be processed within 1-3 business days after verification.\n3. The final gold amount credited will be calculated at the confirmed rate at time of receipt.\n4. All deposits are subject to anti-money laundering (AML) verification.\n5. You confirm that the funds are from a legitimate source.', configType: 'text', displayName: 'Deposit Terms', description: 'Terms and conditions shown when depositing funds', displayOrder: 1 },
      { category: 'terms_conditions', configKey: 'buy_gold_terms', configValue: 'By purchasing gold through Finatrades, you agree to the following:\n\n1. Gold prices are based on real-time market rates plus applicable spread.\n2. Once a purchase is confirmed, it cannot be cancelled or reversed.\n3. Purchased gold will be credited to your wallet within 24 hours.\n4. All purchases are subject to platform transaction limits.\n5. You understand that gold values may fluctuate after purchase.', configType: 'text', displayName: 'Buy Gold Terms', description: 'Terms and conditions shown when purchasing gold', displayOrder: 2 },
      { category: 'terms_conditions', configKey: 'withdrawal_terms', configValue: 'By proceeding with this withdrawal, you agree to the following:\n\n1. Withdrawals are subject to verification and may take 1-5 business days.\n2. Withdrawal fees will be deducted from the amount.\n3. You confirm the receiving account details are correct.\n4. Finatrades is not responsible for incorrect account details provided.', configType: 'text', displayName: 'Withdrawal Terms', description: 'Terms and conditions shown when withdrawing funds', displayOrder: 3 },
      { category: 'terms_conditions', configKey: 'transfer_terms', configValue: 'By proceeding with this transfer, you agree to:\n\n1. Transfers are instant and cannot be reversed once completed.\n2. You confirm the recipient details are correct.\n3. Transfer limits apply based on your verification level.', configType: 'text', displayName: 'Transfer Terms', description: 'Terms and conditions shown when transferring to another user', displayOrder: 4 },
    ];

    for (const config of defaultConfigs) {
      await this.createPlatformConfig(config);
    }
  }

  // Email Notification Settings
  async getEmailNotificationSetting(notificationType: string): Promise<EmailNotificationSetting | undefined> {
    const [setting] = await db.select().from(emailNotificationSettings).where(eq(emailNotificationSettings.notificationType, notificationType));
    return setting || undefined;
  }

  async getEmailNotificationSettingsByCategory(category: string): Promise<EmailNotificationSetting[]> {
    return await db.select().from(emailNotificationSettings).where(eq(emailNotificationSettings.category, category)).orderBy(emailNotificationSettings.displayOrder);
  }

  async getAllEmailNotificationSettings(): Promise<EmailNotificationSetting[]> {
    return await db.select().from(emailNotificationSettings).orderBy(emailNotificationSettings.category, emailNotificationSettings.displayOrder);
  }

  async createEmailNotificationSetting(setting: InsertEmailNotificationSetting): Promise<EmailNotificationSetting> {
    const [created] = await db.insert(emailNotificationSettings).values(setting).returning();
    return created;
  }

  async updateEmailNotificationSetting(id: string, updates: Partial<EmailNotificationSetting>): Promise<EmailNotificationSetting | undefined> {
    const [setting] = await db.update(emailNotificationSettings).set({ ...updates, updatedAt: new Date() }).where(eq(emailNotificationSettings.id, id)).returning();
    return setting || undefined;
  }

  async toggleEmailNotification(notificationType: string, isEnabled: boolean, updatedBy?: string): Promise<EmailNotificationSetting | undefined> {
    const [setting] = await db.update(emailNotificationSettings)
      .set({ isEnabled, updatedBy, updatedAt: new Date() })
      .where(eq(emailNotificationSettings.notificationType, notificationType))
      .returning();
    return setting || undefined;
  }

  async isEmailNotificationEnabled(notificationType: string): Promise<boolean> {
    const setting = await this.getEmailNotificationSetting(notificationType);
    return setting?.isEnabled ?? true; // Default to enabled if not found
  }

  async seedDefaultEmailNotificationSettings(): Promise<void> {
    const existingSettings = await this.getAllEmailNotificationSettings();
    if (existingSettings.length > 0) {
      console.log('[EmailNotifications] Settings already exist, skipping seed');
      return;
    }

    console.log('[EmailNotifications] Seeding default notification settings...');

    const defaultSettings: InsertEmailNotificationSetting[] = [
      // Auth category
      { notificationType: 'welcome_email', displayName: 'Welcome Email', description: 'Sent when a new user registers', category: 'auth', isEnabled: true, templateSlug: 'welcome_email', displayOrder: 1 },
      { notificationType: 'email_verification', displayName: 'Email Verification', description: 'Verification code for new accounts', category: 'auth', isEnabled: true, templateSlug: 'email_verification', displayOrder: 2 },
      { notificationType: 'password_reset', displayName: 'Password Reset', description: 'Password reset instructions', category: 'auth', isEnabled: true, templateSlug: 'password_reset', displayOrder: 3 },
      { notificationType: 'mfa_enabled', displayName: 'MFA Enabled', description: 'Confirmation when 2FA is enabled', category: 'auth', isEnabled: true, templateSlug: 'mfa_enabled', displayOrder: 4 },
      
      // Transactions category
      { notificationType: 'gold_purchase', displayName: 'Gold Purchase Confirmation', description: 'Sent after gold is purchased', category: 'transactions', isEnabled: true, templateSlug: 'gold_purchase', displayOrder: 1 },
      { notificationType: 'gold_sale', displayName: 'Gold Sale Confirmation', description: 'Sent after gold is sold', category: 'transactions', isEnabled: true, templateSlug: 'gold_sale', displayOrder: 2 },
      { notificationType: 'transfer_sent', displayName: 'Transfer Sent', description: 'Confirmation of outgoing transfer', category: 'transactions', isEnabled: true, templateSlug: 'transfer_sent', displayOrder: 3 },
      { notificationType: 'transfer_received', displayName: 'Transfer Received', description: 'Notification of incoming transfer', category: 'transactions', isEnabled: true, templateSlug: 'transfer_received', displayOrder: 4 },
      { notificationType: 'deposit_confirmed', displayName: 'Deposit Confirmed', description: 'Deposit has been processed', category: 'transactions', isEnabled: true, templateSlug: 'deposit_confirmed', displayOrder: 5 },
      { notificationType: 'withdrawal_initiated', displayName: 'Withdrawal Initiated', description: 'Withdrawal request received', category: 'transactions', isEnabled: true, templateSlug: 'withdrawal_initiated', displayOrder: 6 },
      { notificationType: 'withdrawal_completed', displayName: 'Withdrawal Completed', description: 'Withdrawal has been processed', category: 'transactions', isEnabled: true, templateSlug: 'withdrawal_completed', displayOrder: 7 },
      
      // KYC category
      { notificationType: 'kyc_approved', displayName: 'KYC Approved', description: 'KYC verification approved', category: 'kyc', isEnabled: true, templateSlug: 'kyc_approved', displayOrder: 1 },
      { notificationType: 'kyc_rejected', displayName: 'KYC Rejected', description: 'KYC verification rejected', category: 'kyc', isEnabled: true, templateSlug: 'kyc_rejected', displayOrder: 2 },
      { notificationType: 'kyc_document_expiry', displayName: 'Document Expiry Reminder', description: 'Reminder when documents are expiring', category: 'kyc', isEnabled: true, templateSlug: 'document_expiry_reminder', displayOrder: 3 },
      
      // BNSL category
      { notificationType: 'bnsl_agreement_signed', displayName: 'BNSL Agreement Signed', description: 'BNSL plan agreement confirmation', category: 'bnsl', isEnabled: true, templateSlug: 'bnsl_agreement_signed', displayOrder: 1 },
      { notificationType: 'bnsl_payout', displayName: 'BNSL Payout', description: 'Monthly BNSL payout notification', category: 'bnsl', isEnabled: true, templateSlug: 'bnsl_payout', displayOrder: 2 },
      { notificationType: 'bnsl_maturity', displayName: 'BNSL Maturity', description: 'BNSL plan reaching maturity', category: 'bnsl', isEnabled: true, templateSlug: 'bnsl_maturity', displayOrder: 3 },
      
      // Trade Finance category
      { notificationType: 'trade_case_created', displayName: 'Trade Case Created', description: 'New trade case submitted', category: 'trade_finance', isEnabled: true, templateSlug: 'trade_case_created', displayOrder: 1 },
      { notificationType: 'trade_case_approved', displayName: 'Trade Case Approved', description: 'Trade case has been approved', category: 'trade_finance', isEnabled: true, templateSlug: 'trade_case_approved', displayOrder: 2 },
      { notificationType: 'trade_proposal_received', displayName: 'Trade Proposal Received', description: 'New proposal on trade request', category: 'trade_finance', isEnabled: true, templateSlug: 'trade_proposal_received', displayOrder: 3 },
      
      // Documents category
      { notificationType: 'certificate_delivery', displayName: 'Certificate Delivery', description: 'Ownership certificate delivered', category: 'documents', isEnabled: true, templateSlug: 'certificate_delivery', displayOrder: 1 },
      { notificationType: 'invoice_delivery', displayName: 'Invoice Delivery', description: 'Invoice sent after purchase', category: 'documents', isEnabled: true, templateSlug: 'invoice_delivery', displayOrder: 2 },
      
      // System category
      { notificationType: 'invitation', displayName: 'Referral Invitation', description: 'Invitation sent to referred users', category: 'system', isEnabled: true, templateSlug: 'invitation', displayOrder: 1 },
      { notificationType: 'account_locked', displayName: 'Account Locked', description: 'Security alert when account is locked', category: 'system', isEnabled: true, templateSlug: 'account_locked', displayOrder: 2 },
      { notificationType: 'suspicious_activity', displayName: 'Suspicious Activity Alert', description: 'Security warning for unusual activity', category: 'system', isEnabled: true, templateSlug: 'suspicious_activity', displayOrder: 3 },
    ];

    for (const setting of defaultSettings) {
      try {
        await this.createEmailNotificationSetting(setting);
      } catch (error) {
        console.log(`[EmailNotifications] Setting ${setting.notificationType} already exists or failed:`, error);
      }
    }

    console.log(`[EmailNotifications] Seeded ${defaultSettings.length} default notification settings`);
  }

  // Email Logs
  async getEmailLog(id: string): Promise<EmailLog | undefined> {
    const [log] = await db.select().from(emailLogs).where(eq(emailLogs.id, id));
    return log || undefined;
  }

  async getEmailLogsByUser(userId: string): Promise<EmailLog[]> {
    return await db.select().from(emailLogs).where(eq(emailLogs.userId, userId)).orderBy(desc(emailLogs.createdAt));
  }

  async getEmailLogsByType(notificationType: string): Promise<EmailLog[]> {
    return await db.select().from(emailLogs).where(eq(emailLogs.notificationType, notificationType)).orderBy(desc(emailLogs.createdAt));
  }

  async getAllEmailLogs(): Promise<EmailLog[]> {
    return await db.select().from(emailLogs).orderBy(desc(emailLogs.createdAt));
  }

  async createEmailLog(log: InsertEmailLog): Promise<EmailLog> {
    const [created] = await db.insert(emailLogs).values(log).returning();
    return created;
  }

  async updateEmailLog(id: string, updates: Partial<EmailLog>): Promise<EmailLog | undefined> {
    const [log] = await db.update(emailLogs).set(updates).where(eq(emailLogs.id, id)).returning();
    return log || undefined;
  }
}

export const storage = new DatabaseStorage();
