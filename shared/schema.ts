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

export const mfaMethodEnum = pgEnum('mfa_method', ['totp', 'email']);

export const users = pgTable("users", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  finatradesId: varchar("finatrades_id", { length: 20 }).unique(), // Unique user identifier for transfers
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  firstName: varchar("first_name", { length: 255 }).notNull(),
  lastName: varchar("last_name", { length: 255 }).notNull(),
  phoneNumber: varchar("phone_number", { length: 50 }),
  address: text("address"),
  country: varchar("country", { length: 100 }),
  accountType: accountTypeEnum("account_type").notNull().default('personal'),
  role: userRoleEnum("role").notNull().default('user'),
  kycStatus: kycStatusEnum("kyc_status").notNull().default('Not Started'),
  isEmailVerified: boolean("is_email_verified").notNull().default(false),
  emailVerificationCode: varchar("email_verification_code", { length: 10 }),
  emailVerificationExpiry: timestamp("email_verification_expiry"),
  // MFA fields
  mfaEnabled: boolean("mfa_enabled").notNull().default(false),
  mfaMethod: mfaMethodEnum("mfa_method"),
  mfaSecret: varchar("mfa_secret", { length: 255 }),
  mfaBackupCodes: text("mfa_backup_codes"), // JSON array of hashed backup codes
  // Profile photo (selfie)
  profilePhoto: text("profile_photo"), // Base64 encoded image or URL
  // Business fields (for business accounts)
  companyName: varchar("company_name", { length: 255 }),
  registrationNumber: varchar("registration_number", { length: 100 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    // Make fields with database defaults optional for API validation
    finatradesId: z.string().nullable().optional(),
    accountType: z.enum(['personal', 'business']).optional(),
    role: z.enum(['user', 'admin']).optional(),
    kycStatus: z.enum(['Not Started', 'In Progress', 'Approved', 'Rejected']).optional(),
    isEmailVerified: z.boolean().optional(),
    emailVerificationCode: z.string().nullable().optional(),
    emailVerificationExpiry: z.date().nullable().optional(),
    phoneNumber: z.string().nullable().optional(),
    address: z.string().nullable().optional(),
    country: z.string().nullable().optional(),
    companyName: z.string().nullable().optional(),
    registrationNumber: z.string().nullable().optional(),
    profilePhoto: z.string().nullable().optional(),
    // MFA fields
    mfaEnabled: z.boolean().optional(),
    mfaMethod: z.enum(['totp', 'email']).nullable().optional(),
    mfaSecret: z.string().nullable().optional(),
    mfaBackupCodes: z.string().nullable().optional(),
  });
export const selectUserSchema = createSelectSchema(users);
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ============================================
// PASSWORD RESET TOKENS
// ============================================

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({ id: true, createdAt: true });
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

// ============================================
// EMPLOYEES & ROLE-BASED ACCESS
// ============================================

export const employeeRoleEnum = pgEnum('employee_role', [
  'super_admin', 'admin', 'manager', 'support', 'finance', 'compliance'
]);

export const employeeStatusEnum = pgEnum('employee_status', ['active', 'inactive', 'suspended']);

export const employees = pgTable("employees", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).references(() => users.id),
  employeeId: varchar("employee_id", { length: 20 }).notNull().unique(),
  role: employeeRoleEnum("role").notNull().default('support'),
  department: varchar("department", { length: 100 }),
  jobTitle: varchar("job_title", { length: 255 }),
  status: employeeStatusEnum("status").notNull().default('active'),
  permissions: json("permissions").$type<string[]>(),
  hiredAt: timestamp("hired_at").notNull().defaultNow(),
  lastActiveAt: timestamp("last_active_at"),
  createdBy: varchar("created_by", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertEmployeeSchema = createInsertSchema(employees)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    permissions: z.array(z.string()).nullable().optional(),
    department: z.string().nullable().optional(),
    jobTitle: z.string().nullable().optional(),
    lastActiveAt: z.date().nullable().optional(),
    createdBy: z.string().nullable().optional(),
    hiredAt: z.date().optional(),
  });
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = typeof employees.$inferSelect;

// Role Permissions - Default permissions for each role
export const rolePermissions = pgTable("role_permissions", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  role: employeeRoleEnum("role").notNull().unique(),
  permissions: json("permissions").$type<string[]>().notNull(),
  updatedBy: varchar("updated_by", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertRolePermissionSchema = createInsertSchema(rolePermissions)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    permissions: z.array(z.string()),
    updatedBy: z.string().nullable().optional(),
  });
export type InsertRolePermission = z.infer<typeof insertRolePermissionSchema>;
export type RolePermission = typeof rolePermissions.$inferSelect;

// Available permissions list
export const AVAILABLE_PERMISSIONS = [
  'manage_users',
  'view_users',
  'manage_employees',
  'manage_kyc',
  'view_kyc',
  'manage_transactions',
  'view_transactions',
  'manage_withdrawals',
  'manage_deposits',
  'manage_vault',
  'view_vault',
  'manage_bnsl',
  'view_bnsl',
  'manage_finabridge',
  'view_finabridge',
  'manage_support',
  'view_support',
  'manage_cms',
  'view_cms',
  'manage_settings',
  'view_reports',
  'generate_reports',
  'manage_fees',
] as const;

export type Permission = typeof AVAILABLE_PERMISSIONS[number];

// Default permissions by role
export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: [...AVAILABLE_PERMISSIONS],
  admin: [
    'manage_users', 'view_users', 'manage_kyc', 'view_kyc',
    'manage_transactions', 'view_transactions', 'manage_withdrawals', 'manage_deposits',
    'manage_vault', 'view_vault', 'manage_bnsl', 'view_bnsl',
    'manage_finabridge', 'view_finabridge', 'manage_support', 'view_support',
    'view_reports', 'manage_fees'
  ],
  manager: [
    'view_users', 'manage_kyc', 'view_kyc',
    'view_transactions', 'manage_vault', 'view_vault',
    'view_bnsl', 'view_finabridge', 'view_support', 'view_reports'
  ],
  support: [
    'view_users', 'view_kyc', 'view_transactions',
    'manage_support', 'view_support'
  ],
  finance: [
    'view_transactions', 'manage_transactions',
    'manage_withdrawals', 'manage_deposits',
    'view_reports', 'generate_reports', 'manage_fees'
  ],
  compliance: [
    'view_users', 'manage_kyc', 'view_kyc',
    'view_transactions', 'view_reports', 'generate_reports'
  ],
};

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
  recipientUserId: varchar("recipient_user_id", { length: 255 }),
  
  description: text("description"),
  referenceId: varchar("reference_id", { length: 255 }),
  sourceModule: varchar("source_module", { length: 50 }).default('finapay'),
  
  approvedBy: varchar("approved_by", { length: 255 }),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true, createdAt: true });
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

// ============================================
// FINAPAY - BANK ACCOUNTS (Admin-managed)
// ============================================

export const bankAccountStatusEnum = pgEnum('bank_account_status', ['Active', 'Inactive']);
export const depositRequestStatusEnum = pgEnum('deposit_request_status', ['Pending', 'Confirmed', 'Rejected', 'Cancelled']);
export const withdrawalRequestStatusEnum = pgEnum('withdrawal_request_status', ['Pending', 'Processing', 'Completed', 'Rejected', 'Cancelled']);

// Admin-managed bank accounts for receiving deposits
export const platformBankAccounts = pgTable("platform_bank_accounts", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  bankName: varchar("bank_name", { length: 255 }).notNull(),
  accountName: varchar("account_name", { length: 255 }).notNull(),
  accountNumber: varchar("account_number", { length: 100 }).notNull(),
  iban: varchar("iban", { length: 100 }),
  swiftCode: varchar("swift_code", { length: 50 }),
  routingNumber: varchar("routing_number", { length: 50 }),
  currency: varchar("currency", { length: 10 }).notNull().default('USD'),
  country: varchar("country", { length: 100 }).notNull(),
  address: text("address"),
  status: bankAccountStatusEnum("status").notNull().default('Active'),
  isDefault: boolean("is_default").notNull().default(false),
  notes: text("notes"),
  createdBy: varchar("created_by", { length: 255 }).references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPlatformBankAccountSchema = createInsertSchema(platformBankAccounts).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPlatformBankAccount = z.infer<typeof insertPlatformBankAccountSchema>;
export type PlatformBankAccount = typeof platformBankAccounts.$inferSelect;

// ============================================
// PLATFORM FEES - Centralized Fee Configuration
// ============================================

export const feeModuleEnum = pgEnum('fee_module', ['FinaPay', 'FinaVault', 'BNSL', 'FinaBridge']);

export const platformFees = pgTable("platform_fees", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  module: feeModuleEnum("module").notNull(),
  feeKey: varchar("fee_key", { length: 100 }).notNull(), // e.g., 'buy_gold_spread', 'sell_gold_spread'
  feeName: varchar("fee_name", { length: 255 }).notNull(), // Display name
  description: text("description"),
  feeType: varchar("fee_type", { length: 50 }).notNull().default('percentage'), // 'percentage' or 'fixed'
  feeValue: decimal("fee_value", { precision: 10, scale: 4 }).notNull(), // e.g., 0.50 for 0.5%
  minAmount: decimal("min_amount", { precision: 18, scale: 2 }), // Minimum fee amount (for fixed or cap)
  maxAmount: decimal("max_amount", { precision: 18, scale: 2 }), // Maximum fee amount (cap)
  isActive: boolean("is_active").notNull().default(true),
  displayOrder: integer("display_order").notNull().default(0),
  updatedBy: varchar("updated_by", { length: 255 }).references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPlatformFeeSchema = createInsertSchema(platformFees).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPlatformFee = z.infer<typeof insertPlatformFeeSchema>;
export type PlatformFee = typeof platformFees.$inferSelect;

// User deposit requests (fiat to wallet)
export const depositRequests = pgTable("deposit_requests", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  referenceNumber: varchar("reference_number", { length: 100 }).notNull().unique(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  bankAccountId: varchar("bank_account_id", { length: 255 }).notNull().references(() => platformBankAccounts.id),
  amountUsd: decimal("amount_usd", { precision: 18, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).notNull().default('USD'),
  paymentMethod: varchar("payment_method", { length: 100 }).notNull().default('Bank Transfer'),
  senderBankName: varchar("sender_bank_name", { length: 255 }), // User's sending bank
  senderAccountName: varchar("sender_account_name", { length: 255 }), // Name on user's bank account
  transactionReference: varchar("transaction_reference", { length: 255 }), // User's bank transfer reference
  proofOfPayment: text("proof_of_payment"), // URL to uploaded receipt
  notes: text("notes"),
  status: depositRequestStatusEnum("status").notNull().default('Pending'),
  processedBy: varchar("processed_by", { length: 255 }).references(() => users.id),
  processedAt: timestamp("processed_at"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertDepositRequestSchema = createInsertSchema(depositRequests).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDepositRequest = z.infer<typeof insertDepositRequestSchema>;
export type DepositRequest = typeof depositRequests.$inferSelect;

// User withdrawal requests (wallet to bank)
export const withdrawalRequests = pgTable("withdrawal_requests", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  referenceNumber: varchar("reference_number", { length: 100 }).notNull().unique(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  amountUsd: decimal("amount_usd", { precision: 18, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).notNull().default('USD'),
  // User's bank account details
  bankName: varchar("bank_name", { length: 255 }).notNull(),
  accountName: varchar("account_name", { length: 255 }).notNull(),
  accountNumber: varchar("account_number", { length: 100 }).notNull(),
  iban: varchar("iban", { length: 100 }),
  swiftCode: varchar("swift_code", { length: 50 }),
  routingNumber: varchar("routing_number", { length: 50 }),
  bankCountry: varchar("bank_country", { length: 100 }),
  notes: text("notes"),
  status: withdrawalRequestStatusEnum("status").notNull().default('Pending'),
  processedBy: varchar("processed_by", { length: 255 }).references(() => users.id),
  processedAt: timestamp("processed_at"),
  transactionReference: varchar("transaction_reference", { length: 255 }), // Admin's transfer reference
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertWithdrawalRequestSchema = createInsertSchema(withdrawalRequests).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWithdrawalRequest = z.infer<typeof insertWithdrawalRequestSchema>;
export type WithdrawalRequest = typeof withdrawalRequests.$inferSelect;

// ============================================
// FINAVAULT - GOLD STORAGE
// ============================================

export const certificateTypeEnum = pgEnum('certificate_type', [
  'Digital Ownership',    // Finatrades - issued when gold is purchased
  'Physical Storage',     // Wingold - confirms physical gold in vault
  'Transfer',             // Finatrades - issued when gold moves between users
  'BNSL Lock',            // Finatrades - issued when gold is locked into BNSL plan
  'Trade Lock',           // Finatrades - issued when FinaBridge reserve is created
  'Trade Release'         // Finatrades - issued when FinaBridge trade settles
]);
export const certificateStatusEnum = pgEnum('certificate_status', ['Active', 'Updated', 'Cancelled', 'Transferred']);

export const vaultHoldings = pgTable("vault_holdings", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  goldGrams: decimal("gold_grams", { precision: 18, scale: 6 }).notNull(),
  vaultLocation: varchar("vault_location", { length: 255 }).notNull().default('Dubai - Wingold & Metals DMCC'),
  wingoldStorageRef: varchar("wingold_storage_ref", { length: 100 }),
  storageFeesAnnualPercent: decimal("storage_fees_annual_percent", { precision: 5, scale: 2 }).notNull().default('0.5'),
  purchasePriceUsdPerGram: decimal("purchase_price_usd_per_gram", { precision: 12, scale: 2 }),
  isPhysicallyDeposited: boolean("is_physically_deposited").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertVaultHoldingSchema = createInsertSchema(vaultHoldings).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertVaultHolding = z.infer<typeof insertVaultHoldingSchema>;
export type VaultHolding = typeof vaultHoldings.$inferSelect;

// Certificates - Digital Ownership (Finatrades) + Physical Storage (Wingold)
export const certificates = pgTable("certificates", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  certificateNumber: varchar("certificate_number", { length: 100 }).notNull().unique(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  transactionId: varchar("transaction_id", { length: 255 }).references(() => transactions.id),
  vaultHoldingId: varchar("vault_holding_id", { length: 255 }).references(() => vaultHoldings.id),
  
  type: certificateTypeEnum("type").notNull(),
  status: certificateStatusEnum("status").notNull().default('Active'),
  
  goldGrams: decimal("gold_grams", { precision: 18, scale: 6 }).notNull(),
  goldPriceUsdPerGram: decimal("gold_price_usd_per_gram", { precision: 12, scale: 2 }),
  totalValueUsd: decimal("total_value_usd", { precision: 18, scale: 2 }),
  
  issuer: varchar("issuer", { length: 255 }).notNull(), // "Finatrades" or "Wingold & Metals DMCC"
  vaultLocation: varchar("vault_location", { length: 255 }),
  wingoldStorageRef: varchar("wingold_storage_ref", { length: 100 }),
  
  // Transfer-related fields
  fromUserId: varchar("from_user_id", { length: 255 }).references(() => users.id), // Sender for transfers
  toUserId: varchar("to_user_id", { length: 255 }).references(() => users.id), // Recipient for transfers
  relatedCertificateId: varchar("related_certificate_id", { length: 255 }), // Links to parent/related certificate
  
  // BNSL-related fields
  bnslPlanId: varchar("bnsl_plan_id", { length: 255 }), // References bnslPlans.id for BNSL Lock certs
  
  // Trade finance (FinaBridge) fields
  tradeCaseId: varchar("trade_case_id", { length: 255 }), // References tradeCases.id for Trade Lock/Release certs
  
  issuedAt: timestamp("issued_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"),
  cancelledAt: timestamp("cancelled_at"),
  supersededBy: varchar("superseded_by", { length: 255 }),
});

export const insertCertificateSchema = createInsertSchema(certificates).omit({ id: true, issuedAt: true });
export type InsertCertificate = z.infer<typeof insertCertificateSchema>;
export type Certificate = typeof certificates.$inferSelect;

// ============================================
// INVOICES - GOLD PURCHASE INVOICES
// ============================================

export const invoiceStatusEnum = pgEnum('invoice_status', ['Generated', 'Sent', 'Failed']);

export const invoices = pgTable("invoices", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  invoiceNumber: varchar("invoice_number", { length: 100 }).notNull().unique(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  transactionId: varchar("transaction_id", { length: 255 }).references(() => transactions.id),
  
  issuer: varchar("issuer", { length: 255 }).notNull().default('Wingold and Metals DMCC'),
  issuerAddress: text("issuer_address"),
  issuerTaxId: varchar("issuer_tax_id", { length: 100 }),
  
  customerName: varchar("customer_name", { length: 255 }).notNull(),
  customerEmail: varchar("customer_email", { length: 255 }).notNull(),
  customerAddress: text("customer_address"),
  
  goldGrams: decimal("gold_grams", { precision: 18, scale: 6 }).notNull(),
  goldPriceUsdPerGram: decimal("gold_price_usd_per_gram", { precision: 12, scale: 2 }).notNull(),
  subtotalUsd: decimal("subtotal_usd", { precision: 18, scale: 2 }).notNull(),
  feesUsd: decimal("fees_usd", { precision: 18, scale: 2 }).notNull().default('0'),
  totalUsd: decimal("total_usd", { precision: 18, scale: 2 }).notNull(),
  
  paymentMethod: varchar("payment_method", { length: 100 }),
  paymentReference: varchar("payment_reference", { length: 255 }),
  
  status: invoiceStatusEnum("status").notNull().default('Generated'),
  pdfData: text("pdf_data"), // Base64 encoded PDF
  
  issuedAt: timestamp("issued_at").notNull().defaultNow(),
  emailedAt: timestamp("emailed_at"),
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, issuedAt: true });
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;

// ============================================
// CERTIFICATE DELIVERIES - EMAIL TRACKING
// ============================================

export const deliveryStatusEnum = pgEnum('delivery_status', ['Pending', 'Sent', 'Failed', 'Resent']);

export const certificateDeliveries = pgTable("certificate_deliveries", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  certificateId: varchar("certificate_id", { length: 255 }).notNull().references(() => certificates.id),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  transactionId: varchar("transaction_id", { length: 255 }).references(() => transactions.id),
  
  deliveryMethod: varchar("delivery_method", { length: 50 }).notNull().default('email'),
  recipientEmail: varchar("recipient_email", { length: 255 }).notNull(),
  
  status: deliveryStatusEnum("status").notNull().default('Pending'),
  pdfData: text("pdf_data"), // Base64 encoded PDF
  
  sentAt: timestamp("sent_at"),
  failureReason: text("failure_reason"),
  retryCount: integer("retry_count").notNull().default(0),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCertificateDeliverySchema = createInsertSchema(certificateDeliveries).omit({ id: true, createdAt: true });
export type InsertCertificateDelivery = z.infer<typeof insertCertificateDeliverySchema>;
export type CertificateDelivery = typeof certificateDeliveries.$inferSelect;

// ============================================
// FINAVAULT - DEPOSIT & WITHDRAWAL REQUESTS
// ============================================

export const vaultDepositStatusEnum = pgEnum('vault_deposit_status', [
  'Submitted', 'Under Review', 'Approved', 'Awaiting Delivery', 'Received', 'Stored', 'Rejected', 'Cancelled'
]);

export const vaultWithdrawalStatusEnum = pgEnum('vault_withdrawal_status', [
  'Submitted', 'Under Review', 'Approved', 'Processing', 'Completed', 'Rejected', 'Cancelled'
]);

export const vaultWithdrawalMethodEnum = pgEnum('vault_withdrawal_method', ['Bank Transfer', 'Crypto']);

// Vault Deposit Requests - Physical gold deposits requiring admin approval
export const vaultDepositRequests = pgTable("vault_deposit_requests", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  referenceNumber: varchar("reference_number", { length: 100 }).notNull().unique(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  
  vaultLocation: varchar("vault_location", { length: 255 }).notNull(),
  depositType: varchar("deposit_type", { length: 50 }).notNull(), // 'Bars', 'Coins', 'Mixed'
  totalDeclaredWeightGrams: decimal("total_declared_weight_grams", { precision: 18, scale: 6 }).notNull(),
  
  // Items stored as JSON
  items: json("items").$type<{
    id: string;
    itemType: string;
    quantity: number;
    weightPerUnitGrams: number;
    totalWeightGrams: number;
    purity: string;
    brand: string;
    notes?: string;
  }[]>().notNull(),
  
  deliveryMethod: varchar("delivery_method", { length: 50 }).notNull(), // 'Walk-in', 'Courier', 'Pickup'
  pickupDetails: json("pickup_details").$type<{
    address: string;
    contactName: string;
    contactMobile: string;
    date: string;
    timeSlot: string;
  }>(),
  
  documents: json("documents").$type<{
    id: string;
    type: string;
    name: string;
    url?: string;
  }[]>(),
  
  status: vaultDepositStatusEnum("status").notNull().default('Submitted'),
  
  // Admin processing
  reviewedBy: varchar("reviewed_by", { length: 255 }).references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  adminNotes: text("admin_notes"),
  rejectionReason: text("rejection_reason"),
  
  // Fulfillment references
  vaultHoldingId: varchar("vault_holding_id", { length: 255 }).references(() => vaultHoldings.id),
  certificateId: varchar("certificate_id", { length: 255 }).references(() => certificates.id),
  vaultInternalReference: varchar("vault_internal_reference", { length: 100 }),
  
  // Verified weight (may differ from declared)
  verifiedWeightGrams: decimal("verified_weight_grams", { precision: 18, scale: 6 }),
  goldPriceUsdPerGram: decimal("gold_price_usd_per_gram", { precision: 12, scale: 2 }),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  storedAt: timestamp("stored_at"),
});

export const insertVaultDepositRequestSchema = createInsertSchema(vaultDepositRequests).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertVaultDepositRequest = z.infer<typeof insertVaultDepositRequestSchema>;
export type VaultDepositRequest = typeof vaultDepositRequests.$inferSelect;

// Vault Withdrawal Requests - Cash out via bank transfer or crypto
export const vaultWithdrawalRequests = pgTable("vault_withdrawal_requests", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  referenceNumber: varchar("reference_number", { length: 100 }).notNull().unique(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  
  goldGrams: decimal("gold_grams", { precision: 18, scale: 6 }).notNull(),
  goldPriceUsdPerGram: decimal("gold_price_usd_per_gram", { precision: 12, scale: 2 }).notNull(),
  totalValueUsd: decimal("total_value_usd", { precision: 18, scale: 2 }).notNull(),
  
  withdrawalMethod: vaultWithdrawalMethodEnum("withdrawal_method").notNull(),
  
  // Bank details (if bank transfer)
  bankName: varchar("bank_name", { length: 255 }),
  accountName: varchar("account_name", { length: 255 }),
  accountNumber: varchar("account_number", { length: 100 }),
  iban: varchar("iban", { length: 100 }),
  swiftCode: varchar("swift_code", { length: 50 }),
  bankCountry: varchar("bank_country", { length: 100 }),
  
  // Crypto details (if crypto)
  cryptoNetwork: varchar("crypto_network", { length: 50 }),
  cryptoCurrency: varchar("crypto_currency", { length: 20 }),
  walletAddress: varchar("wallet_address", { length: 255 }),
  
  notes: text("notes"),
  status: vaultWithdrawalStatusEnum("status").notNull().default('Submitted'),
  
  // Admin processing
  reviewedBy: varchar("reviewed_by", { length: 255 }).references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  adminNotes: text("admin_notes"),
  rejectionReason: text("rejection_reason"),
  
  // Fulfillment
  transactionReference: varchar("transaction_reference", { length: 255 }),
  processedAt: timestamp("processed_at"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertVaultWithdrawalRequestSchema = createInsertSchema(vaultWithdrawalRequests).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertVaultWithdrawalRequest = z.infer<typeof insertVaultWithdrawalRequestSchema>;
export type VaultWithdrawalRequest = typeof vaultWithdrawalRequests.$inferSelect;

// ============================================
// BNSL - BUY NOW SELL LATER
// ============================================

// BNSL Wallets - Dedicated wallet for BNSL operations
export const bnslWallets = pgTable("bnsl_wallets", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id).unique(),
  availableGoldGrams: decimal("available_gold_grams", { precision: 18, scale: 6 }).notNull().default('0'),
  lockedGoldGrams: decimal("locked_gold_grams", { precision: 18, scale: 6 }).notNull().default('0'),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertBnslWalletSchema = createInsertSchema(bnslWallets).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBnslWallet = z.infer<typeof insertBnslWalletSchema>;
export type BnslWallet = typeof bnslWallets.$inferSelect;

// BNSL Plan Templates - Admin-configurable plan types
export const bnslTemplateStatusEnum = pgEnum('bnsl_template_status', ['Active', 'Inactive', 'Draft']);

export const bnslPlanTemplates = pgTable("bnsl_plan_templates", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  status: bnslTemplateStatusEnum("status").notNull().default('Draft'),
  
  minGoldGrams: decimal("min_gold_grams", { precision: 18, scale: 6 }).notNull().default('10'),
  maxGoldGrams: decimal("max_gold_grams", { precision: 18, scale: 6 }).notNull().default('10000'),
  
  payoutFrequency: varchar("payout_frequency", { length: 50 }).notNull().default('Quarterly'),
  earlyTerminationFeePercent: decimal("early_termination_fee_percent", { precision: 5, scale: 2 }).notNull().default('2.00'),
  adminFeePercent: decimal("admin_fee_percent", { precision: 5, scale: 2 }).notNull().default('0.50'),
  
  termsAndConditions: text("terms_and_conditions"),
  displayOrder: integer("display_order").notNull().default(0),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertBnslPlanTemplateSchema = createInsertSchema(bnslPlanTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBnslPlanTemplate = z.infer<typeof insertBnslPlanTemplateSchema>;
export type BnslPlanTemplate = typeof bnslPlanTemplates.$inferSelect;

// BNSL Template Variants - Tenor/rate combinations for each template
export const bnslTemplateVariants = pgTable("bnsl_template_variants", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id", { length: 255 }).notNull().references(() => bnslPlanTemplates.id),
  
  tenorMonths: integer("tenor_months").notNull(),
  marginRatePercent: decimal("margin_rate_percent", { precision: 5, scale: 2 }).notNull(),
  
  minMarginRatePercent: decimal("min_margin_rate_percent", { precision: 5, scale: 2 }),
  maxMarginRatePercent: decimal("max_margin_rate_percent", { precision: 5, scale: 2 }),
  
  isActive: boolean("is_active").notNull().default(true),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBnslTemplateVariantSchema = createInsertSchema(bnslTemplateVariants).omit({ id: true, createdAt: true });
export type InsertBnslTemplateVariant = z.infer<typeof insertBnslTemplateVariantSchema>;
export type BnslTemplateVariant = typeof bnslTemplateVariants.$inferSelect;

export const bnslPlans = pgTable("bnsl_plans", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  contractId: varchar("contract_id", { length: 100 }).notNull().unique(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  
  // Template reference (optional for backward compatibility)
  templateId: varchar("template_id", { length: 255 }).references(() => bnslPlanTemplates.id),
  variantId: varchar("variant_id", { length: 255 }).references(() => bnslTemplateVariants.id),
  templateName: varchar("template_name", { length: 255 }),
  
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
  
  // Fee percentages (captured from template at enrollment)
  earlyTerminationFeePercent: decimal("early_termination_fee_percent", { precision: 5, scale: 2 }).notNull().default('2.00'),
  adminFeePercent: decimal("admin_fee_percent", { precision: 5, scale: 2 }).notNull().default('0.50'),
  
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

// BNSL Agreements - Signed agreements storage
export const bnslAgreements = pgTable("bnsl_agreements", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  planId: varchar("plan_id", { length: 255 }).notNull().references(() => bnslPlans.id),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  
  templateVersion: varchar("template_version", { length: 50 }).notNull().default('V3'),
  signatureName: varchar("signature_name", { length: 255 }).notNull(),
  signedAt: timestamp("signed_at").notNull(),
  
  pdfPath: text("pdf_path").notNull(),
  pdfFileName: varchar("pdf_file_name", { length: 255 }).notNull(),
  
  planDetails: json("plan_details").$type<{
    tenorMonths: number;
    goldSoldGrams: number;
    enrollmentPriceUsdPerGram: number;
    basePriceComponentUsd: number;
    totalMarginComponentUsd: number;
    quarterlyMarginUsd: number;
    agreedMarginAnnualPercent: number;
    startDate: string;
    maturityDate: string;
  }>().notNull(),
  
  emailSentAt: timestamp("email_sent_at"),
  emailMessageId: varchar("email_message_id", { length: 255 }),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBnslAgreementSchema = createInsertSchema(bnslAgreements).omit({ id: true, createdAt: true });
export type InsertBnslAgreement = z.infer<typeof insertBnslAgreementSchema>;
export type BnslAgreement = typeof bnslAgreements.$inferSelect;

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
// FINABRIDGE - TRADE MATCHING & SETTLEMENT
// ============================================

export const tradeRequestStatusEnum = pgEnum('trade_request_status', [
  'Draft', 'Open', 'Proposal Review', 'Awaiting Importer', 'Active Trade', 'Completed', 'Cancelled'
]);

export const proposalStatusEnum = pgEnum('proposal_status', [
  'Submitted', 'Shortlisted', 'Rejected', 'Forwarded', 'Accepted', 'Declined'
]);

export const settlementHoldStatusEnum = pgEnum('settlement_hold_status', [
  'Held', 'Released', 'Cancelled'
]);

export const tradeRequests = pgTable("trade_requests", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  tradeRefId: varchar("trade_ref_id", { length: 50 }).notNull().unique(),
  importerUserId: varchar("importer_user_id", { length: 255 }).notNull().references(() => users.id),
  
  goodsName: varchar("goods_name", { length: 255 }).notNull(),
  description: text("description"),
  quantity: varchar("quantity", { length: 100 }),
  incoterms: varchar("incoterms", { length: 50 }),
  destination: varchar("destination", { length: 255 }),
  expectedShipDate: varchar("expected_ship_date", { length: 50 }),
  
  tradeValueUsd: decimal("trade_value_usd", { precision: 18, scale: 2 }).notNull(),
  settlementGoldGrams: decimal("settlement_gold_grams", { precision: 18, scale: 6 }).notNull(),
  currency: varchar("currency", { length: 10 }).default('USD'),
  
  exporterKnown: boolean("exporter_known").default(false),
  exporterFinatradesId: varchar("exporter_finatrades_id", { length: 20 }),
  suggestExporter: boolean("suggest_exporter").default(false),
  
  status: tradeRequestStatusEnum("status").notNull().default('Draft'),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTradeRequestSchema = createInsertSchema(tradeRequests).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTradeRequest = z.infer<typeof insertTradeRequestSchema>;
export type TradeRequest = typeof tradeRequests.$inferSelect;

export const tradeProposals = pgTable("trade_proposals", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  tradeRequestId: varchar("trade_request_id", { length: 255 }).notNull().references(() => tradeRequests.id),
  exporterUserId: varchar("exporter_user_id", { length: 255 }).notNull().references(() => users.id),
  
  quotePrice: decimal("quote_price", { precision: 18, scale: 2 }).notNull(),
  timelineDays: integer("timeline_days").notNull(),
  notes: text("notes"),
  attachmentUrl: text("attachment_url"),
  
  status: proposalStatusEnum("status").notNull().default('Submitted'),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTradeProposalSchema = createInsertSchema(tradeProposals).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTradeProposal = z.infer<typeof insertTradeProposalSchema>;
export type TradeProposal = typeof tradeProposals.$inferSelect;

export const forwardedProposals = pgTable("forwarded_proposals", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  tradeRequestId: varchar("trade_request_id", { length: 255 }).notNull().references(() => tradeRequests.id),
  proposalId: varchar("proposal_id", { length: 255 }).notNull().references(() => tradeProposals.id),
  forwardedByAdminId: varchar("forwarded_by_admin_id", { length: 255 }).notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertForwardedProposalSchema = createInsertSchema(forwardedProposals).omit({ id: true, createdAt: true });
export type InsertForwardedProposal = z.infer<typeof insertForwardedProposalSchema>;
export type ForwardedProposal = typeof forwardedProposals.$inferSelect;

export const tradeConfirmations = pgTable("trade_confirmations", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  tradeRequestId: varchar("trade_request_id", { length: 255 }).notNull().references(() => tradeRequests.id),
  acceptedProposalId: varchar("accepted_proposal_id", { length: 255 }).notNull().references(() => tradeProposals.id),
  confirmedAt: timestamp("confirmed_at").notNull().defaultNow(),
});

export const insertTradeConfirmationSchema = createInsertSchema(tradeConfirmations).omit({ id: true, confirmedAt: true });
export type InsertTradeConfirmation = z.infer<typeof insertTradeConfirmationSchema>;
export type TradeConfirmation = typeof tradeConfirmations.$inferSelect;

export const finabridgeWallets = pgTable("finabridge_wallets", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id).unique(),
  availableGoldGrams: decimal("available_gold_grams", { precision: 18, scale: 6 }).notNull().default('0'),
  lockedGoldGrams: decimal("locked_gold_grams", { precision: 18, scale: 6 }).notNull().default('0'),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertFinabridgeWalletSchema = createInsertSchema(finabridgeWallets).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFinabridgeWallet = z.infer<typeof insertFinabridgeWalletSchema>;
export type FinabridgeWallet = typeof finabridgeWallets.$inferSelect;

export const settlementHolds = pgTable("settlement_holds", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  tradeRequestId: varchar("trade_request_id", { length: 255 }).notNull().references(() => tradeRequests.id),
  importerUserId: varchar("importer_user_id", { length: 255 }).notNull().references(() => users.id),
  exporterUserId: varchar("exporter_user_id", { length: 255 }).notNull().references(() => users.id),
  lockedGoldGrams: decimal("locked_gold_grams", { precision: 18, scale: 6 }).notNull(),
  status: settlementHoldStatusEnum("status").notNull().default('Held'),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSettlementHoldSchema = createInsertSchema(settlementHolds).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSettlementHold = z.infer<typeof insertSettlementHoldSchema>;
export type SettlementHold = typeof settlementHolds.$inferSelect;

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

// ============================================
// CMS - CONTENT MANAGEMENT SYSTEM
// ============================================

export const contentBlockTypeEnum = pgEnum('content_block_type', ['text', 'rich_text', 'image', 'json', 'html']);
export const contentStatusEnum = pgEnum('content_status', ['draft', 'published']);
export const templateTypeEnum = pgEnum('template_type', ['email', 'certificate', 'notification', 'page_section', 'invoice', 'financial_report']);

// Content Pages - Groups content by page/module
export const contentPages = pgTable("content_pages", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  slug: varchar("slug", { length: 255 }).notNull().unique(), // e.g., "home", "finapay", "finavault"
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  module: varchar("module", { length: 100 }), // FinaPay, FinaVault, BNSL, FinaBridge, etc.
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertContentPageSchema = createInsertSchema(contentPages).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertContentPage = z.infer<typeof insertContentPageSchema>;
export type ContentPage = typeof contentPages.$inferSelect;

// Content Blocks - Individual editable content pieces
export const contentBlocks = pgTable("content_blocks", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  pageId: varchar("page_id", { length: 255 }).references(() => contentPages.id),
  section: varchar("section", { length: 255 }).notNull(), // e.g., "hero", "features", "footer"
  key: varchar("key", { length: 255 }).notNull(), // e.g., "title", "description", "cta_button"
  label: varchar("label", { length: 255 }), // Human-readable label for admin UI
  type: contentBlockTypeEnum("type").notNull().default('text'),
  content: text("content"), // The actual content (text, HTML, or stringified JSON)
  defaultContent: text("default_content"), // Fallback content if content is empty
  metadata: json("metadata").$type<{
    maxLength?: number;
    placeholder?: string;
    helpText?: string;
    imageUrl?: string;
    imageAlt?: string;
  }>(),
  sortOrder: integer("sort_order").notNull().default(0),
  status: contentStatusEnum("status").notNull().default('published'),
  version: integer("version").notNull().default(1),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertContentBlockSchema = createInsertSchema(contentBlocks).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertContentBlock = z.infer<typeof insertContentBlockSchema>;
export type ContentBlock = typeof contentBlocks.$inferSelect;

// Templates - For emails, certificates, notifications
export const templates = pgTable("templates", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  slug: varchar("slug", { length: 255 }).notNull().unique(), // e.g., "welcome_email", "certificate_ownership"
  name: varchar("name", { length: 255 }).notNull(),
  type: templateTypeEnum("type").notNull(),
  module: varchar("module", { length: 100 }), // Which module this template belongs to
  subject: varchar("subject", { length: 500 }), // For emails
  body: text("body").notNull(), // Template content (HTML/text with variables)
  variables: json("variables").$type<{
    name: string;
    description: string;
    example?: string;
  }[]>(), // Available variables for this template
  previewData: json("preview_data"), // Sample data for preview rendering
  status: contentStatusEnum("status").notNull().default('draft'),
  version: integer("version").notNull().default(1),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTemplateSchema = createInsertSchema(templates).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type Template = typeof templates.$inferSelect;

// Media Assets - For managing uploaded images
export const mediaAssets = pgTable("media_assets", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  url: text("url").notNull(),
  altText: varchar("alt_text", { length: 500 }),
  mimeType: varchar("mime_type", { length: 100 }),
  fileSize: integer("file_size"), // in bytes
  tags: json("tags").$type<string[]>(),
  uploadedBy: varchar("uploaded_by", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMediaAssetSchema = createInsertSchema(mediaAssets).omit({ id: true, createdAt: true });
export type InsertMediaAsset = z.infer<typeof insertMediaAssetSchema>;
export type MediaAsset = typeof mediaAssets.$inferSelect;

// ============================================
// PEER TRANSFERS (Send/Receive Money)
// ============================================

export const peerTransferStatusEnum = pgEnum('peer_transfer_status', ['Completed', 'Failed', 'Reversed']);
export const peerTransferChannelEnum = pgEnum('peer_transfer_channel', ['email', 'finatrades_id', 'qr_code']);

export const peerTransfers = pgTable("peer_transfers", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  referenceNumber: varchar("reference_number", { length: 100 }).notNull().unique(),
  senderId: varchar("sender_id", { length: 255 }).notNull().references(() => users.id),
  recipientId: varchar("recipient_id", { length: 255 }).notNull().references(() => users.id),
  amountUsd: decimal("amount_usd", { precision: 18, scale: 2 }).notNull(),
  channel: peerTransferChannelEnum("channel").notNull(), // How the transfer was initiated
  recipientIdentifier: varchar("recipient_identifier", { length: 255 }).notNull(), // email, finatrades_id, or qr token
  memo: text("memo"),
  status: peerTransferStatusEnum("status").notNull().default('Completed'),
  senderTransactionId: varchar("sender_transaction_id", { length: 255 }).references(() => transactions.id),
  recipientTransactionId: varchar("recipient_transaction_id", { length: 255 }).references(() => transactions.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPeerTransferSchema = createInsertSchema(peerTransfers).omit({ id: true, createdAt: true });
export type InsertPeerTransfer = z.infer<typeof insertPeerTransferSchema>;
export type PeerTransfer = typeof peerTransfers.$inferSelect;

// ============================================
// PEER REQUESTS (Request Money)
// ============================================

export const peerRequestStatusEnum = pgEnum('peer_request_status', ['Pending', 'Fulfilled', 'Declined', 'Expired', 'Cancelled']);

export const peerRequests = pgTable("peer_requests", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  referenceNumber: varchar("reference_number", { length: 100 }).notNull().unique(),
  requesterId: varchar("requester_id", { length: 255 }).notNull().references(() => users.id),
  targetId: varchar("target_id", { length: 255 }).references(() => users.id), // If known
  targetIdentifier: varchar("target_identifier", { length: 255 }), // email or finatrades_id if target unknown
  channel: peerTransferChannelEnum("channel").notNull(),
  amountUsd: decimal("amount_usd", { precision: 18, scale: 2 }).notNull(),
  memo: text("memo"),
  qrPayload: varchar("qr_payload", { length: 500 }), // Unique token for QR code requests
  status: peerRequestStatusEnum("status").notNull().default('Pending'),
  fulfilledTransferId: varchar("fulfilled_transfer_id", { length: 255 }).references(() => peerTransfers.id),
  expiresAt: timestamp("expires_at"),
  respondedAt: timestamp("responded_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPeerRequestSchema = createInsertSchema(peerRequests).omit({ id: true, createdAt: true });
export type InsertPeerRequest = z.infer<typeof insertPeerRequestSchema>;
export type PeerRequest = typeof peerRequests.$inferSelect;

// ============================================
// BINANCE PAY TRANSACTIONS
// ============================================

export const binanceOrderTypeEnum = pgEnum('binance_order_type', ['Buy', 'Payout']);
export const binanceOrderStatusEnum = pgEnum('binance_order_status', [
  'Created',      // Order created, awaiting payment
  'Processing',   // Payment in progress
  'Paid',         // Payment confirmed
  'Completed',    // Fully processed (gold credited/payout sent)
  'Expired',      // Order expired
  'Failed',       // Payment failed
  'Cancelled'     // User cancelled
]);

export const binanceTransactions = pgTable("binance_transactions", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  
  // Binance Pay Order Info
  merchantTradeNo: varchar("merchant_trade_no", { length: 100 }).notNull().unique(), // Our order ID
  prepayId: varchar("prepay_id", { length: 100 }),  // Binance's order ID
  transactionId: varchar("transaction_id", { length: 100 }), // Binance's transaction ID (after payment)
  
  orderType: binanceOrderTypeEnum("order_type").notNull(), // Buy gold or Payout
  status: binanceOrderStatusEnum("status").notNull().default('Created'),
  
  // Order amounts
  orderAmountUsd: decimal("order_amount_usd", { precision: 18, scale: 2 }).notNull(),
  cryptoCurrency: varchar("crypto_currency", { length: 20 }), // USDT, BTC, etc.
  cryptoAmount: decimal("crypto_amount", { precision: 18, scale: 8 }),
  
  // Gold details (for Buy orders)
  goldGrams: decimal("gold_grams", { precision: 18, scale: 6 }),
  goldPriceUsdPerGram: decimal("gold_price_usd_per_gram", { precision: 12, scale: 2 }),
  
  // Payout details (for withdrawals)
  payoutWalletAddress: varchar("payout_wallet_address", { length: 255 }),
  payoutNetwork: varchar("payout_network", { length: 50 }), // BSC, ETH, TRX, etc.
  
  // Binance response data
  checkoutUrl: text("checkout_url"),
  qrcodeLink: text("qrcode_link"),
  expireTime: timestamp("expire_time"),
  
  // Related records
  walletTransactionId: varchar("wallet_transaction_id", { length: 255 }).references(() => transactions.id),
  vaultWithdrawalId: varchar("vault_withdrawal_id", { length: 255 }),
  
  // Webhook tracking
  webhookReceivedAt: timestamp("webhook_received_at"),
  webhookPayload: json("webhook_payload"),
  
  // Metadata
  description: text("description"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertBinanceTransactionSchema = createInsertSchema(binanceTransactions).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBinanceTransaction = z.infer<typeof insertBinanceTransactionSchema>;
export type BinanceTransaction = typeof binanceTransactions.$inferSelect;

// ============================================
// NGENIUS CARD PAYMENT TRANSACTIONS
// ============================================

export const ngeniusOrderStatusEnum = pgEnum('ngenius_order_status', [
  'Created',      // Order created, awaiting payment
  'Pending',      // Payment pending
  'Authorised',   // Payment authorized
  'Captured',     // Payment captured/completed
  'Failed',       // Payment failed
  'Cancelled',    // Order cancelled
  'Refunded'      // Payment refunded
]);

export const ngeniusTransactions = pgTable("ngenius_transactions", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  
  // Order reference
  orderReference: varchar("order_reference", { length: 100 }).notNull().unique(), // Our unique order ID
  ngeniusOrderId: varchar("ngenius_order_id", { length: 100 }), // NGenius order ID (from response)
  ngeniusPaymentId: varchar("ngenius_payment_id", { length: 100 }), // NGenius payment ID
  
  status: ngeniusOrderStatusEnum("status").notNull().default('Created'),
  
  // Order amounts
  amountUsd: decimal("amount_usd", { precision: 18, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).notNull().default('USD'),
  
  // Payment details (populated after payment)
  cardBrand: varchar("card_brand", { length: 50 }), // VISA, Mastercard, etc.
  cardLast4: varchar("card_last4", { length: 4 }), // Last 4 digits
  cardholderName: varchar("cardholder_name", { length: 255 }),
  
  // URLs
  paymentUrl: text("payment_url"), // Redirect URL for hosted payment page
  
  // Related records
  walletTransactionId: varchar("wallet_transaction_id", { length: 255 }).references(() => transactions.id),
  
  // Webhook/callback tracking
  webhookReceivedAt: timestamp("webhook_received_at"),
  webhookPayload: json("webhook_payload"),
  
  // Metadata
  description: text("description"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertNgeniusTransactionSchema = createInsertSchema(ngeniusTransactions).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertNgeniusTransaction = z.infer<typeof insertNgeniusTransactionSchema>;
export type NgeniusTransaction = typeof ngeniusTransactions.$inferSelect;

// ============================================
// BRANDING & THEME SETTINGS
// ============================================

export const brandingSettings = pgTable("branding_settings", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  
  // Company Info
  companyName: varchar("company_name", { length: 255 }).notNull().default('Finatrades'),
  tagline: varchar("tagline", { length: 500 }),
  logoUrl: text("logo_url"),
  faviconUrl: text("favicon_url"),
  
  // Colors - Primary theme
  primaryColor: varchar("primary_color", { length: 20 }).notNull().default('#f97316'),
  primaryForeground: varchar("primary_foreground", { length: 20 }).notNull().default('#ffffff'),
  secondaryColor: varchar("secondary_color", { length: 20 }).notNull().default('#eab308'),
  secondaryForeground: varchar("secondary_foreground", { length: 20 }).notNull().default('#ffffff'),
  accentColor: varchar("accent_color", { length: 20 }).notNull().default('#f59e0b'),
  
  // Button styles
  buttonRadius: varchar("button_radius", { length: 20 }).notNull().default('0.5rem'),
  buttonPrimaryBg: varchar("button_primary_bg", { length: 20 }).notNull().default('#f97316'),
  buttonPrimaryText: varchar("button_primary_text", { length: 20 }).notNull().default('#ffffff'),
  buttonSecondaryBg: varchar("button_secondary_bg", { length: 20 }).notNull().default('#f3f4f6'),
  buttonSecondaryText: varchar("button_secondary_text", { length: 20 }).notNull().default('#1f2937'),
  
  // Typography
  fontFamily: varchar("font_family", { length: 100 }).notNull().default('Inter'),
  headingFontFamily: varchar("heading_font_family", { length: 100 }),
  
  // Background colors
  backgroundColor: varchar("background_color", { length: 20 }).notNull().default('#ffffff'),
  cardBackground: varchar("card_background", { length: 20 }).notNull().default('#ffffff'),
  sidebarBackground: varchar("sidebar_background", { length: 20 }).notNull().default('#1f2937'),
  
  // Border and effects
  borderRadius: varchar("border_radius", { length: 20 }).notNull().default('0.5rem'),
  borderColor: varchar("border_color", { length: 20 }).notNull().default('#e5e7eb'),
  
  // Navigation link names (JSON for custom names)
  navLinkNames: json("nav_link_names").$type<Record<string, string>>(),
  
  // Footer
  footerText: text("footer_text"),
  socialLinks: json("social_links").$type<{twitter?: string; linkedin?: string; facebook?: string; instagram?: string}>(),
  
  // Meta
  isActive: boolean("is_active").notNull().default(true),
  updatedBy: varchar("updated_by", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertBrandingSettingsSchema = createInsertSchema(brandingSettings).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBrandingSettings = z.infer<typeof insertBrandingSettingsSchema>;
export type BrandingSettings = typeof brandingSettings.$inferSelect;

// ============================================
// PAYMENT GATEWAY SETTINGS
// ============================================

export const paymentGatewaySettings = pgTable("payment_gateway_settings", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  
  // Stripe Configuration
  stripeEnabled: boolean("stripe_enabled").notNull().default(false),
  stripePublishableKey: text("stripe_publishable_key"),
  stripeSecretKey: text("stripe_secret_key"),
  stripeWebhookSecret: text("stripe_webhook_secret"),
  stripeFeePercent: decimal("stripe_fee_percent", { precision: 5, scale: 2 }).default('2.9'),
  stripeFixedFee: decimal("stripe_fixed_fee", { precision: 10, scale: 2 }).default('0.30'),
  
  // PayPal Configuration
  paypalEnabled: boolean("paypal_enabled").notNull().default(false),
  paypalClientId: text("paypal_client_id"),
  paypalClientSecret: text("paypal_client_secret"),
  paypalMode: varchar("paypal_mode", { length: 20 }).default('sandbox'), // 'sandbox' or 'live'
  paypalFeePercent: decimal("paypal_fee_percent", { precision: 5, scale: 2 }).default('2.9'),
  paypalFixedFee: decimal("paypal_fixed_fee", { precision: 10, scale: 2 }).default('0.30'),
  
  // Bank Transfer / Wire Configuration
  bankTransferEnabled: boolean("bank_transfer_enabled").notNull().default(false),
  bankName: varchar("bank_name", { length: 255 }),
  bankAccountName: varchar("bank_account_name", { length: 255 }),
  bankAccountNumber: varchar("bank_account_number", { length: 100 }),
  bankRoutingNumber: varchar("bank_routing_number", { length: 100 }),
  bankSwiftCode: varchar("bank_swift_code", { length: 50 }),
  bankIban: varchar("bank_iban", { length: 100 }),
  bankInstructions: text("bank_instructions"),
  
  // Crypto Payment (Binance Pay) - already exists separately
  binancePayEnabled: boolean("binance_pay_enabled").notNull().default(false),
  
  // NGenius (Card Payments) Configuration
  ngeniusEnabled: boolean("ngenius_enabled").notNull().default(false),
  ngeniusApiKey: text("ngenius_api_key"),
  ngeniusOutletRef: varchar("ngenius_outlet_ref", { length: 100 }),
  ngeniusMode: varchar("ngenius_mode", { length: 20 }).default('sandbox'), // 'sandbox' or 'live'
  ngeniusFeePercent: decimal("ngenius_fee_percent", { precision: 5, scale: 2 }).default('2.5'),
  ngeniusFixedFee: decimal("ngenius_fixed_fee", { precision: 10, scale: 2 }).default('0.30'),
  
  // General Settings
  minDepositUsd: decimal("min_deposit_usd", { precision: 10, scale: 2 }).default('10'),
  maxDepositUsd: decimal("max_deposit_usd", { precision: 10, scale: 2 }).default('100000'),
  
  // Audit
  updatedBy: varchar("updated_by", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPaymentGatewaySettingsSchema = createInsertSchema(paymentGatewaySettings).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPaymentGatewaySettings = z.infer<typeof insertPaymentGatewaySettingsSchema>;
export type PaymentGatewaySettings = typeof paymentGatewaySettings.$inferSelect;

// ============================================
// ADMIN FINANCIAL REPORTING
// ============================================

export const feeSourceEnum = pgEnum('fee_source', ['FinaPay', 'FinaVault', 'BNSL', 'FinaBridge', 'Other']);
export const feeTypeDetailEnum = pgEnum('fee_type_detail', [
  'buy_spread', 'sell_spread', 'transaction_fee', 'transfer_fee',
  'storage_fee', 'withdrawal_fee', 'deposit_fee',
  'bnsl_interest', 'bnsl_early_termination', 'bnsl_late_fee',
  'trade_finance_fee', 'other'
]);

// Track every fee/revenue transaction
export const feeTransactions = pgTable("fee_transactions", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).references(() => users.id),
  source: feeSourceEnum("source").notNull(),
  feeType: feeTypeDetailEnum("fee_type").notNull(),
  
  amountUsd: decimal("amount_usd", { precision: 18, scale: 2 }).notNull(),
  goldGrams: decimal("gold_grams", { precision: 18, scale: 6 }), // If fee was in gold
  
  relatedTransactionId: varchar("related_transaction_id", { length: 255 }),
  relatedEntityType: varchar("related_entity_type", { length: 50 }), // 'transaction', 'bnsl_plan', 'vault_holding'
  relatedEntityId: varchar("related_entity_id", { length: 255 }),
  
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertFeeTransactionSchema = createInsertSchema(feeTransactions).omit({ id: true, createdAt: true });
export type InsertFeeTransaction = z.infer<typeof insertFeeTransactionSchema>;
export type FeeTransaction = typeof feeTransactions.$inferSelect;

// Daily financial snapshots for reporting
export const dailyFinancialSnapshots = pgTable("daily_financial_snapshots", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  snapshotDate: timestamp("snapshot_date").notNull().unique(),
  
  // User metrics
  totalUsers: integer("total_users").notNull().default(0),
  activeUsers: integer("active_users").notNull().default(0), // Users with activity in last 30 days
  newUsersToday: integer("new_users_today").notNull().default(0),
  kycApprovedUsers: integer("kyc_approved_users").notNull().default(0),
  
  // Assets Under Management
  totalGoldGrams: decimal("total_gold_grams", { precision: 18, scale: 6 }).notNull().default('0'),
  totalGoldValueUsd: decimal("total_gold_value_usd", { precision: 18, scale: 2 }).notNull().default('0'),
  totalFiatBalanceUsd: decimal("total_fiat_balance_usd", { precision: 18, scale: 2 }).notNull().default('0'),
  goldPriceUsd: decimal("gold_price_usd", { precision: 12, scale: 2 }).notNull(),
  
  // FinaPay metrics
  finapayTransactionCount: integer("finapay_transaction_count").notNull().default(0),
  finapayVolumeUsd: decimal("finapay_volume_usd", { precision: 18, scale: 2 }).notNull().default('0'),
  finapayFeesUsd: decimal("finapay_fees_usd", { precision: 18, scale: 2 }).notNull().default('0'),
  
  // FinaVault metrics
  vaultTotalGoldGrams: decimal("vault_total_gold_grams", { precision: 18, scale: 6 }).notNull().default('0'),
  vaultStorageFeesUsd: decimal("vault_storage_fees_usd", { precision: 18, scale: 2 }).notNull().default('0'),
  vaultActiveHoldings: integer("vault_active_holdings").notNull().default(0),
  
  // BNSL metrics
  bnslActivePlans: integer("bnsl_active_plans").notNull().default(0),
  bnslTotalPrincipalUsd: decimal("bnsl_total_principal_usd", { precision: 18, scale: 2 }).notNull().default('0'),
  bnslExpectedPayoutsUsd: decimal("bnsl_expected_payouts_usd", { precision: 18, scale: 2 }).notNull().default('0'),
  bnslInterestEarnedUsd: decimal("bnsl_interest_earned_usd", { precision: 18, scale: 2 }).notNull().default('0'),
  
  // Revenue summary
  totalRevenueUsd: decimal("total_revenue_usd", { precision: 18, scale: 2 }).notNull().default('0'),
  
  // Liabilities
  totalGoldLiabilityGrams: decimal("total_gold_liability_grams", { precision: 18, scale: 6 }).notNull().default('0'),
  totalFiatLiabilityUsd: decimal("total_fiat_liability_usd", { precision: 18, scale: 2 }).notNull().default('0'),
  pendingWithdrawalsUsd: decimal("pending_withdrawals_usd", { precision: 18, scale: 2 }).notNull().default('0'),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDailyFinancialSnapshotSchema = createInsertSchema(dailyFinancialSnapshots).omit({ id: true, createdAt: true });
export type InsertDailyFinancialSnapshot = z.infer<typeof insertDailyFinancialSnapshotSchema>;
export type DailyFinancialSnapshot = typeof dailyFinancialSnapshots.$inferSelect;

// Platform expenses tracking
export const platformExpenses = pgTable("platform_expenses", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  category: varchar("category", { length: 100 }).notNull(), // 'custody', 'insurance', 'operations', 'hedging'
  description: text("description").notNull(),
  amountUsd: decimal("amount_usd", { precision: 18, scale: 2 }).notNull(),
  expenseDate: timestamp("expense_date").notNull(),
  recordedBy: varchar("recorded_by", { length: 255 }).references(() => users.id),
  attachmentUrl: text("attachment_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPlatformExpenseSchema = createInsertSchema(platformExpenses).omit({ id: true, createdAt: true });
export type InsertPlatformExpense = z.infer<typeof insertPlatformExpenseSchema>;
export type PlatformExpense = typeof platformExpenses.$inferSelect;

// ============================================
// SECURITY SETTINGS
// ============================================

export const securitySettings = pgTable("security_settings", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  
  // Global Security Features
  emailOtpEnabled: boolean("email_otp_enabled").notNull().default(false),
  passkeyEnabled: boolean("passkey_enabled").notNull().default(false),
  
  // Email OTP Requirements per Action (when emailOtpEnabled is true)
  otpOnLogin: boolean("otp_on_login").notNull().default(false),
  otpOnWithdrawal: boolean("otp_on_withdrawal").notNull().default(true),
  otpOnTransfer: boolean("otp_on_transfer").notNull().default(true),
  otpOnBuyGold: boolean("otp_on_buy_gold").notNull().default(false),
  otpOnSellGold: boolean("otp_on_sell_gold").notNull().default(true),
  otpOnProfileChange: boolean("otp_on_profile_change").notNull().default(false),
  otpOnPasswordChange: boolean("otp_on_password_change").notNull().default(true),
  otpOnBnslCreate: boolean("otp_on_bnsl_create").notNull().default(false),
  otpOnBnslEarlyTermination: boolean("otp_on_bnsl_early_termination").notNull().default(true),
  otpOnVaultWithdrawal: boolean("otp_on_vault_withdrawal").notNull().default(true),
  otpOnTradeBridge: boolean("otp_on_trade_bridge").notNull().default(true),
  
  // Admin Approval OTP Requirements
  adminOtpEnabled: boolean("admin_otp_enabled").notNull().default(true),
  adminOtpOnKycApproval: boolean("admin_otp_on_kyc_approval").notNull().default(true),
  adminOtpOnDepositApproval: boolean("admin_otp_on_deposit_approval").notNull().default(true),
  adminOtpOnWithdrawalApproval: boolean("admin_otp_on_withdrawal_approval").notNull().default(true),
  adminOtpOnBnslApproval: boolean("admin_otp_on_bnsl_approval").notNull().default(true),
  adminOtpOnTradeCaseApproval: boolean("admin_otp_on_trade_case_approval").notNull().default(true),
  adminOtpOnUserSuspension: boolean("admin_otp_on_user_suspension").notNull().default(true),
  
  // Passkey Requirements per Action (when passkeyEnabled is true)
  passkeyOnLogin: boolean("passkey_on_login").notNull().default(true),
  passkeyOnWithdrawal: boolean("passkey_on_withdrawal").notNull().default(false),
  passkeyOnTransfer: boolean("passkey_on_transfer").notNull().default(false),
  passkeyOnHighValueTransaction: boolean("passkey_on_high_value_transaction").notNull().default(false),
  passkeyHighValueThresholdUsd: decimal("passkey_high_value_threshold_usd", { precision: 10, scale: 2 }).default('1000'),
  
  // OTP Configuration
  otpExpiryMinutes: integer("otp_expiry_minutes").notNull().default(10),
  otpMaxAttempts: integer("otp_max_attempts").notNull().default(3),
  otpCooldownMinutes: integer("otp_cooldown_minutes").notNull().default(1),
  
  // Audit
  updatedBy: varchar("updated_by", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSecuritySettingsSchema = createInsertSchema(securitySettings).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSecuritySettings = z.infer<typeof insertSecuritySettingsSchema>;
export type SecuritySettings = typeof securitySettings.$inferSelect;

// OTP Verification Requests - tracks pending OTP verifications
export const otpVerifications = pgTable("otp_verifications", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  action: varchar("action", { length: 100 }).notNull(), // 'withdrawal', 'transfer', 'sell_gold', etc.
  code: varchar("code", { length: 10 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  attempts: integer("attempts").notNull().default(0),
  verified: boolean("verified").notNull().default(false),
  verifiedAt: timestamp("verified_at"),
  metadata: json("metadata").$type<Record<string, any>>(), // Store action-specific data
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertOtpVerificationSchema = createInsertSchema(otpVerifications).omit({ id: true, createdAt: true });
export type InsertOtpVerification = z.infer<typeof insertOtpVerificationSchema>;
export type OtpVerification = typeof otpVerifications.$inferSelect;

// User Passkeys - stores registered passkeys per user
export const userPasskeys = pgTable("user_passkeys", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  credentialId: text("credential_id").notNull().unique(),
  publicKey: text("public_key").notNull(),
  counter: integer("counter").notNull().default(0),
  deviceName: varchar("device_name", { length: 255 }),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserPasskeySchema = createInsertSchema(userPasskeys).omit({ id: true, createdAt: true });
export type InsertUserPasskey = z.infer<typeof insertUserPasskeySchema>;
export type UserPasskey = typeof userPasskeys.$inferSelect;

// ============================================
// ADMIN ACTION OTP VERIFICATIONS
// ============================================

export const adminActionTypeEnum = pgEnum('admin_action_type', [
  'kyc_approval', 'kyc_rejection', 
  'deposit_approval', 'deposit_rejection',
  'withdrawal_approval', 'withdrawal_rejection',
  'bnsl_approval', 'bnsl_rejection',
  'trade_case_approval', 'trade_case_rejection',
  'user_suspension', 'user_activation'
]);

export const adminActionOtps = pgTable("admin_action_otps", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  adminId: varchar("admin_id", { length: 255 }).notNull().references(() => users.id),
  actionType: adminActionTypeEnum("action_type").notNull(),
  targetId: varchar("target_id", { length: 255 }).notNull(), // ID of the entity being acted upon
  targetType: varchar("target_type", { length: 100 }).notNull(), // 'user', 'kyc_submission', 'deposit_request', etc.
  code: varchar("code", { length: 10 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  attempts: integer("attempts").notNull().default(0),
  verified: boolean("verified").notNull().default(false),
  verifiedAt: timestamp("verified_at"),
  actionData: json("action_data").$type<Record<string, any>>(), // Store action-specific data like reason
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAdminActionOtpSchema = createInsertSchema(adminActionOtps).omit({ id: true, createdAt: true });
export type InsertAdminActionOtp = z.infer<typeof insertAdminActionOtpSchema>;
export type AdminActionOtp = typeof adminActionOtps.$inferSelect;

// ============================================
// REFERRALS
// ============================================

export const referralStatusEnum = pgEnum('referral_status', ['Pending', 'Active', 'Completed', 'Expired', 'Cancelled']);

export const referrals = pgTable("referrals", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  referrerId: varchar("referrer_id", { length: 255 }).notNull().references(() => users.id),
  referredId: varchar("referred_id", { length: 255 }).references(() => users.id),
  referralCode: varchar("referral_code", { length: 50 }).notNull().unique(),
  referredEmail: varchar("referred_email", { length: 255 }),
  status: referralStatusEnum("status").notNull().default('Pending'),
  rewardAmount: decimal("reward_amount", { precision: 18, scale: 2 }).default('0'),
  rewardCurrency: varchar("reward_currency", { length: 10 }).default('USD'),
  rewardPaidAt: timestamp("reward_paid_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertReferralSchema = createInsertSchema(referrals).omit({ id: true, createdAt: true });
export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type Referral = typeof referrals.$inferSelect;
