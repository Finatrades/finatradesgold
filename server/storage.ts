import { 
  users, wallets, transactions, vaultHoldings, kycSubmissions,
  bnslPlans, bnslPayouts, bnslEarlyTerminations, bnslWallets,
  bnslPlanTemplates, bnslTemplateVariants, bnslAgreements,
  tradeCases, tradeDocuments,
  tradeRequests, tradeProposals, forwardedProposals, tradeConfirmations,
  finabridgeWallets, settlementHolds,
  chatSessions, chatMessages, auditLogs, certificates,
  contentPages, contentBlocks, templates, mediaAssets,
  platformBankAccounts, platformFees, depositRequests, withdrawalRequests,
  peerTransfers, peerRequests,
  vaultDepositRequests, vaultWithdrawalRequests,
  binanceTransactions,
  ngeniusTransactions,
  paymentGatewaySettings,
  brandingSettings,
  employees, rolePermissions,
  securitySettings, otpVerifications, userPasskeys,
  invoices, certificateDeliveries,
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
  type TradeCase, type InsertTradeCase,
  type TradeDocument, type InsertTradeDocument,
  type TradeRequest, type InsertTradeRequest,
  type TradeProposal, type InsertTradeProposal,
  type ForwardedProposal, type InsertForwardedProposal,
  type TradeConfirmation, type InsertTradeConfirmation,
  type FinabridgeWallet, type InsertFinabridgeWallet,
  type SettlementHold, type InsertSettlementHold,
  type ChatSession, type InsertChatSession,
  type ChatMessage, type InsertChatMessage,
  type AuditLog, type InsertAuditLog,
  type Certificate, type InsertCertificate,
  type ContentPage, type InsertContentPage,
  type ContentBlock, type InsertContentBlock,
  type Template, type InsertTemplate,
  type MediaAsset, type InsertMediaAsset,
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
  type CertificateDelivery, type InsertCertificateDelivery
} from "@shared/schema";
import { db, pool } from "./db";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, desc, and, or, sql } from "drizzle-orm";
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
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  
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
  createSettlementHold(hold: InsertSettlementHold): Promise<SettlementHold>;
  updateSettlementHold(id: string, updates: Partial<SettlementHold>): Promise<SettlementHold | undefined>;
  
  // Chat
  getChatSession(userId: string): Promise<ChatSession | undefined>;
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

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db.update(users).set({ ...updates, updatedAt: new Date() }).where(eq(users.id, id)).returning();
    return user || undefined;
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

  async createSettlementHold(insertHold: InsertSettlementHold): Promise<SettlementHold> {
    const [hold] = await db.insert(settlementHolds).values(insertHold).returning();
    return hold;
  }

  async updateSettlementHold(id: string, updates: Partial<SettlementHold>): Promise<SettlementHold | undefined> {
    const [hold] = await db.update(settlementHolds).set({ ...updates, updatedAt: new Date() }).where(eq(settlementHolds.id, id)).returning();
    return hold || undefined;
  }

  // Chat
  async getChatSession(userId: string): Promise<ChatSession | undefined> {
    const [session] = await db.select().from(chatSessions).where(and(eq(chatSessions.userId, userId), eq(chatSessions.status, 'active'))).orderBy(desc(chatSessions.createdAt)).limit(1);
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

  async getUserCertificates(userId: string): Promise<Certificate[]> {
    return await db.select().from(certificates).where(eq(certificates.userId, userId)).orderBy(desc(certificates.issuedAt));
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
}

export const storage = new DatabaseStorage();
