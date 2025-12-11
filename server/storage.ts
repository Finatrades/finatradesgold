import { 
  users, wallets, transactions, vaultHoldings, kycSubmissions,
  bnslPlans, bnslPayouts, bnslEarlyTerminations,
  tradeCases, tradeDocuments,
  chatSessions, chatMessages, auditLogs,
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
  type AuditLog, type InsertAuditLog
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, sql } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
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
  updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction | undefined>;
  
  // Vault Holdings
  getVaultHolding(id: string): Promise<VaultHolding | undefined>;
  getUserVaultHoldings(userId: string): Promise<VaultHolding[]>;
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
}

export const storage = new DatabaseStorage();
