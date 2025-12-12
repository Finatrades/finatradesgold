import { 
  users, wallets, transactions, vaultHoldings, kycSubmissions,
  bnslPlans, bnslPayouts, bnslEarlyTerminations,
  tradeCases, tradeDocuments,
  chatSessions, chatMessages, auditLogs, certificates,
  contentPages, contentBlocks, templates, mediaAssets,
  type User, type InsertUser,
  type Wallet, type InsertWallet,
  type Transaction, type InsertTransaction,
  type VaultHolding, type InsertVaultHolding,
  type KycSubmission, type InsertKycSubmission,
  type BnslPlan, type InsertBnslPlan,
  type BnslPayout, type InsertBnslPayout,
  type BnslEarlyTermination, type InsertBnslEarlyTermination,
  type TradeCase, type InsertTradeCase,
  type TradeDocument, type InsertTradeDocument,
  type ChatSession, type InsertChatSession,
  type ChatMessage, type InsertChatMessage,
  type AuditLog, type InsertAuditLog,
  type Certificate, type InsertCertificate,
  type ContentPage, type InsertContentPage,
  type ContentBlock, type InsertContentBlock,
  type Template, type InsertTemplate,
  type MediaAsset, type InsertMediaAsset
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
  updateCertificate(id: string, updates: Partial<Certificate>): Promise<Certificate | undefined>;
  generateCertificateNumber(type: 'Digital Ownership' | 'Physical Storage'): Promise<string>;
  
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
}

export const storage = new DatabaseStorage();
