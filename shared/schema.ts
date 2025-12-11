import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, boolean, pgEnum, json } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================
// ENUMS
// ============================================

export const kycStatusEnum = pgEnum('kyc_status', ['Not Started', 'In Progress', 'Approved', 'Rejected']);
export const accountTypeEnum = pgEnum('account_type', ['personal', 'business']);
export const userRoleEnum = pgEnum('user_role', ['user', 'admin']);
export const riskLevelEnum = pgEnum('risk_level', ['Low', 'Medium', 'High', 'Critical']);

export const transactionTypeEnum = pgEnum('transaction_type', ['Buy', 'Sell', 'Send', 'Receive', 'Swap', 'Deposit', 'Withdrawal']);
export const transactionStatusEnum = pgEnum('transaction_status', ['Pending', 'Processing', 'Completed', 'Failed', 'Cancelled']);

export const bnslPlanStatusEnum = pgEnum('bnsl_plan_status', [
  'Pending Activation', 'Active', 'Maturing', 'Completed', 
  'Early Termination Requested', 'Early Terminated', 'Defaulted', 'Cancelled'
]);
export const bnslPayoutStatusEnum = pgEnum('bnsl_payout_status', ['Scheduled', 'Processing', 'Paid', 'Failed', 'Cancelled']);
export const bnslTerminationStatusEnum = pgEnum('bnsl_termination_status', [
  'None', 'Requested', 'Under Review', 'Approved', 'Rejected', 'Settled'
]);

export const tradeCaseStatusEnum = pgEnum('trade_case_status', [
  'Draft', 'Submitted', 'Under Review', 'Approved', 'Active', 'Settled', 'Cancelled', 'Rejected'
]);
export const documentStatusEnum = pgEnum('document_status', ['Pending', 'Approved', 'Rejected']);

export const chatMessageSenderEnum = pgEnum('chat_message_sender', ['user', 'admin', 'agent']);

// ============================================
// USERS & AUTH
// ============================================

export const users = pgTable("users", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  firstName: varchar("first_name", { length: 255 }).notNull(),
  lastName: varchar("last_name", { length: 255 }).notNull(),
  phoneNumber: varchar("phone_number", { length: 50 }),
  country: varchar("country", { length: 100 }),
  accountType: accountTypeEnum("account_type").notNull().default('personal'),
  role: userRoleEnum("role").notNull().default('user'),
  kycStatus: kycStatusEnum("kyc_status").notNull().default('Not Started'),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const selectUserSchema = createSelectSchema(users);
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ============================================
// KYC
// ============================================

export const kycSubmissions = pgTable("kyc_submissions", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  accountType: accountTypeEnum("account_type").notNull(),
  
  // Personal Info
  fullName: varchar("full_name", { length: 255 }),
  dateOfBirth: varchar("date_of_birth", { length: 50 }),
  nationality: varchar("nationality", { length: 100 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  postalCode: varchar("postal_code", { length: 20 }),
  country: varchar("country", { length: 100 }),
  
  // Business Info (if applicable)
  companyName: varchar("company_name", { length: 255 }),
  registrationNumber: varchar("registration_number", { length: 100 }),
  companyAddress: text("company_address"),
  taxId: varchar("tax_id", { length: 100 }),
  
  // Documents (stored as JSON with URLs)
  documents: json("documents").$type<{
    idProof?: { url: string; type: string; };
    proofOfAddress?: { url: string; type: string; };
    businessRegistration?: { url: string; type: string; };
    taxCertificate?: { url: string; type: string; };
  }>(),
  
  status: kycStatusEnum("status").notNull().default('In Progress'),
  reviewedBy: varchar("reviewed_by", { length: 255 }),
  reviewedAt: timestamp("reviewed_at"),
  rejectionReason: text("rejection_reason"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertKycSubmissionSchema = createInsertSchema(kycSubmissions).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertKycSubmission = z.infer<typeof insertKycSubmissionSchema>;
export type KycSubmission = typeof kycSubmissions.$inferSelect;

// ============================================
// FINAPAY - WALLETS & TRANSACTIONS
// ============================================

export const wallets = pgTable("wallets", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  goldGrams: decimal("gold_grams", { precision: 18, scale: 6 }).notNull().default('0'),
  usdBalance: decimal("usd_balance", { precision: 18, scale: 2 }).notNull().default('0'),
  eurBalance: decimal("eur_balance", { precision: 18, scale: 2 }).notNull().default('0'),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertWalletSchema = createInsertSchema(wallets).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWallet = z.infer<typeof insertWalletSchema>;
export type Wallet = typeof wallets.$inferSelect;

export const transactions = pgTable("transactions", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  type: transactionTypeEnum("type").notNull(),
  status: transactionStatusEnum("status").notNull().default('Pending'),
  
  amountGold: decimal("amount_gold", { precision: 18, scale: 6 }),
  amountUsd: decimal("amount_usd", { precision: 18, scale: 2 }),
  amountEur: decimal("amount_eur", { precision: 18, scale: 2 }),
  
  goldPriceUsdPerGram: decimal("gold_price_usd_per_gram", { precision: 12, scale: 2 }),
  
  recipientEmail: varchar("recipient_email", { length: 255 }),
  senderEmail: varchar("sender_email", { length: 255 }),
  
  description: text("description"),
  referenceId: varchar("reference_id", { length: 255 }),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true, createdAt: true });
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

// ============================================
// FINAVAULT - GOLD STORAGE
// ============================================

export const vaultHoldings = pgTable("vault_holdings", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  goldGrams: decimal("gold_grams", { precision: 18, scale: 6 }).notNull(),
  vaultLocation: varchar("vault_location", { length: 255 }).notNull(),
  certificateNumber: varchar("certificate_number", { length: 100 }),
  storageFeesAnnualPercent: decimal("storage_fees_annual_percent", { precision: 5, scale: 2 }).notNull().default('1.5'),
  purchasePriceUsdPerGram: decimal("purchase_price_usd_per_gram", { precision: 12, scale: 2 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertVaultHoldingSchema = createInsertSchema(vaultHoldings).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertVaultHolding = z.infer<typeof insertVaultHoldingSchema>;
export type VaultHolding = typeof vaultHoldings.$inferSelect;

// ============================================
// BNSL - BUY NOW SELL LATER
// ============================================

export const bnslPlans = pgTable("bnsl_plans", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  contractId: varchar("contract_id", { length: 100 }).notNull().unique(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  
  tenorMonths: integer("tenor_months").notNull(), // 12, 24, 36
  agreedMarginAnnualPercent: decimal("agreed_margin_annual_percent", { precision: 5, scale: 2 }).notNull(),
  
  goldSoldGrams: decimal("gold_sold_grams", { precision: 18, scale: 6 }).notNull(),
  enrollmentPriceUsdPerGram: decimal("enrollment_price_usd_per_gram", { precision: 12, scale: 2 }).notNull(),
  basePriceComponentUsd: decimal("base_price_component_usd", { precision: 18, scale: 2 }).notNull(),
  totalMarginComponentUsd: decimal("total_margin_component_usd", { precision: 18, scale: 2 }).notNull(),
  quarterlyMarginUsd: decimal("quarterly_margin_usd", { precision: 18, scale: 2 }).notNull(),
  totalSaleProceedsUsd: decimal("total_sale_proceeds_usd", { precision: 18, scale: 2 }).notNull(),
  
  startDate: timestamp("start_date").notNull(),
  maturityDate: timestamp("maturity_date").notNull(),
  status: bnslPlanStatusEnum("status").notNull().default('Pending Activation'),
  
  paidMarginUsd: decimal("paid_margin_usd", { precision: 18, scale: 2 }).notNull().default('0'),
  paidMarginGrams: decimal("paid_margin_grams", { precision: 18, scale: 6 }).notNull().default('0'),
  remainingMarginUsd: decimal("remaining_margin_usd", { precision: 18, scale: 2 }).notNull(),
  
  planRiskLevel: riskLevelEnum("plan_risk_level").notNull().default('Low'),
  notes: text("notes"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertBnslPlanSchema = createInsertSchema(bnslPlans).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBnslPlan = z.infer<typeof insertBnslPlanSchema>;
export type BnslPlan = typeof bnslPlans.$inferSelect;

export const bnslPayouts = pgTable("bnsl_payouts", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  planId: varchar("plan_id", { length: 255 }).notNull().references(() => bnslPlans.id),
  sequence: integer("sequence").notNull(),
  scheduledDate: timestamp("scheduled_date").notNull(),
  monetaryAmountUsd: decimal("monetary_amount_usd", { precision: 18, scale: 2 }).notNull(),
  marketPriceUsdPerGram: decimal("market_price_usd_per_gram", { precision: 12, scale: 2 }),
  gramsCredited: decimal("grams_credited", { precision: 18, scale: 6 }),
  status: bnslPayoutStatusEnum("status").notNull().default('Scheduled'),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBnslPayoutSchema = createInsertSchema(bnslPayouts).omit({ id: true, createdAt: true });
export type InsertBnslPayout = z.infer<typeof insertBnslPayoutSchema>;
export type BnslPayout = typeof bnslPayouts.$inferSelect;

export const bnslEarlyTerminations = pgTable("bnsl_early_terminations", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  planId: varchar("plan_id", { length: 255 }).notNull().references(() => bnslPlans.id),
  reason: text("reason").notNull(),
  currentMarketPriceUsdPerGram: decimal("current_market_price_usd_per_gram", { precision: 12, scale: 2 }).notNull(),
  adminFeePercent: decimal("admin_fee_percent", { precision: 5, scale: 2 }).notNull(),
  penaltyPercent: decimal("penalty_percent", { precision: 5, scale: 2 }).notNull(),
  totalDisbursedMarginUsd: decimal("total_disbursed_margin_usd", { precision: 18, scale: 2 }).notNull(),
  basePriceComponentValueUsd: decimal("base_price_component_value_usd", { precision: 18, scale: 2 }).notNull(),
  totalSaleProceedsUsd: decimal("total_sale_proceeds_usd", { precision: 18, scale: 2 }).notNull(),
  totalDeductionsUsd: decimal("total_deductions_usd", { precision: 18, scale: 2 }).notNull(),
  netValueUsd: decimal("net_value_usd", { precision: 18, scale: 2 }).notNull(),
  finalGoldGrams: decimal("final_gold_grams", { precision: 18, scale: 6 }).notNull(),
  status: bnslTerminationStatusEnum("status").notNull().default('Requested'),
  decidedBy: varchar("decided_by", { length: 255 }),
  decidedAt: timestamp("decided_at"),
  decisionNotes: text("decision_notes"),
  requestedAt: timestamp("requested_at").notNull().defaultNow(),
});

export const insertBnslEarlyTerminationSchema = createInsertSchema(bnslEarlyTerminations).omit({ id: true });
export type InsertBnslEarlyTermination = z.infer<typeof insertBnslEarlyTerminationSchema>;
export type BnslEarlyTermination = typeof bnslEarlyTerminations.$inferSelect;

// ============================================
// FINABRIDGE - TRADE FINANCE
// ============================================

export const tradeCases = pgTable("trade_cases", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  caseNumber: varchar("case_number", { length: 100 }).notNull().unique(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  
  companyName: varchar("company_name", { length: 255 }).notNull(),
  tradeType: varchar("trade_type", { length: 100 }).notNull(), // Import/Export
  commodityType: varchar("commodity_type", { length: 255 }).notNull(),
  tradeValueUsd: decimal("trade_value_usd", { precision: 18, scale: 2 }).notNull(),
  
  buyerName: varchar("buyer_name", { length: 255 }),
  buyerCountry: varchar("buyer_country", { length: 100 }),
  sellerName: varchar("seller_name", { length: 255 }),
  sellerCountry: varchar("seller_country", { length: 100 }),
  
  paymentTerms: text("payment_terms"),
  shipmentDetails: text("shipment_details"),
  
  status: tradeCaseStatusEnum("status").notNull().default('Draft'),
  riskLevel: riskLevelEnum("risk_level").notNull().default('Low'),
  
  opsApproval: boolean("ops_approval").default(false),
  opsApprovedBy: varchar("ops_approved_by", { length: 255 }),
  opsApprovedAt: timestamp("ops_approved_at"),
  
  complianceApproval: boolean("compliance_approval").default(false),
  complianceApprovedBy: varchar("compliance_approved_by", { length: 255 }),
  complianceApprovedAt: timestamp("compliance_approved_at"),
  
  riskApproval: boolean("risk_approval").default(false),
  riskApprovedBy: varchar("risk_approved_by", { length: 255 }),
  riskApprovedAt: timestamp("risk_approved_at"),
  
  notes: text("notes"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTradeCaseSchema = createInsertSchema(tradeCases).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTradeCase = z.infer<typeof insertTradeCaseSchema>;
export type TradeCase = typeof tradeCases.$inferSelect;

export const tradeDocuments = pgTable("trade_documents", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  caseId: varchar("case_id", { length: 255 }).notNull().references(() => tradeCases.id),
  documentType: varchar("document_type", { length: 100 }).notNull(), // Invoice, Bill of Lading, etc.
  documentUrl: text("document_url").notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  status: documentStatusEnum("status").notNull().default('Pending'),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
  reviewedBy: varchar("reviewed_by", { length: 255 }),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
});

export const insertTradeDocumentSchema = createInsertSchema(tradeDocuments).omit({ id: true });
export type InsertTradeDocument = z.infer<typeof insertTradeDocumentSchema>;
export type TradeDocument = typeof tradeDocuments.$inferSelect;

// ============================================
// CHAT
// ============================================

export const chatSessions = pgTable("chat_sessions", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).references(() => users.id),
  guestName: varchar("guest_name", { length: 255 }),
  guestEmail: varchar("guest_email", { length: 255 }),
  status: varchar("status", { length: 50 }).notNull().default('active'), // active, closed
  lastMessageAt: timestamp("last_message_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertChatSessionSchema = createInsertSchema(chatSessions).omit({ id: true, createdAt: true });
export type InsertChatSession = z.infer<typeof insertChatSessionSchema>;
export type ChatSession = typeof chatSessions.$inferSelect;

export const chatMessages = pgTable("chat_messages", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id", { length: 255 }).notNull().references(() => chatSessions.id),
  sender: chatMessageSenderEnum("sender").notNull(),
  content: text("content").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({ id: true, createdAt: true });
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

// ============================================
// AUDIT LOGS
// ============================================

export const auditLogs = pgTable("audit_logs", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  entityType: varchar("entity_type", { length: 100 }).notNull(), // BnslPlan, TradeCase, etc.
  entityId: varchar("entity_id", { length: 255 }),
  actor: varchar("actor", { length: 255 }).notNull(),
  actorRole: varchar("actor_role", { length: 100 }).notNull(),
  actionType: varchar("action_type", { length: 100 }).notNull(),
  details: text("details"),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true });
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
