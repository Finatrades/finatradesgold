


import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, boolean, pgEnum, json, date } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================
// ENUMS
// ============================================

export const kycStatusEnum = pgEnum('kyc_status', ['Not Started', 'In Progress', 'Approved', 'Rejected', 'Escalated', 'Pending Review']);
export const kycTierEnum = pgEnum('kyc_tier', ['tier_1_basic', 'tier_2_enhanced', 'tier_3_corporate']);
export const accountTypeEnum = pgEnum('account_type', ['personal', 'business']);
export const userRoleEnum = pgEnum('user_role', ['user', 'admin']);
export const riskLevelEnum = pgEnum('risk_level', ['Low', 'Medium', 'High', 'Critical']);
export const screeningStatusEnum = pgEnum('screening_status', ['Pending', 'Clear', 'Match Found', 'Manual Review', 'Escalated']);
export const amlCaseStatusEnum = pgEnum('aml_case_status', ['Open', 'Under Investigation', 'Pending SAR', 'SAR Filed', 'Closed - No Action', 'Closed - Action Taken']);

export const transactionTypeEnum = pgEnum('transaction_type', ['Buy', 'Sell', 'Send', 'Receive', 'Swap', 'Deposit', 'Withdrawal']);
export const transactionStatusEnum = pgEnum('transaction_status', ['Draft', 'Pending', 'Pending Verification', 'Approved', 'Processing', 'Completed', 'Failed', 'Cancelled', 'Rejected']);

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

// FinaBridge role enum for differentiating importers and exporters
export const finabridgeRoleEnum = pgEnum('finabridge_role', ['importer', 'exporter', 'both']);

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
  // Biometric authentication fields
  biometricEnabled: boolean("biometric_enabled").notNull().default(false),
  biometricDeviceId: varchar("biometric_device_id", { length: 255 }), // Device identifier for biometric auth
  // Profile photo (selfie)
  profilePhoto: text("profile_photo"), // Base64 encoded image or URL
  // Business fields (for business accounts)
  companyName: varchar("company_name", { length: 255 }),
  registrationNumber: varchar("registration_number", { length: 100 }),
  // FinaBridge disclaimer acceptance and role
  finabridgeDisclaimerAcceptedAt: timestamp("finabridge_disclaimer_accepted_at"),
  finabridgeRole: finabridgeRoleEnum("finabridge_role"), // importer, exporter, or both
  // Session tracking for auth timestamps display
  lastLoginAt: timestamp("last_login_at"),
  lastLogoutAt: timestamp("last_logout_at"),
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
    finabridgeDisclaimerAcceptedAt: z.date().nullable().optional(),
    finabridgeRole: z.enum(['importer', 'exporter', 'both']).nullable().optional(),
    // Session tracking fields
    lastLoginAt: z.date().nullable().optional(),
    lastLogoutAt: z.date().nullable().optional(),
    // MFA fields
    mfaEnabled: z.boolean().optional(),
    mfaMethod: z.enum(['totp', 'email']).nullable().optional(),
    mfaSecret: z.string().nullable().optional(),
    mfaBackupCodes: z.string().nullable().optional(),
    // Biometric fields
    biometricEnabled: z.boolean().optional(),
    biometricDeviceId: z.string().nullable().optional(),
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
  tier: kycTierEnum("tier").notNull().default('tier_1_basic'),
  
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
  
  // Documents (stored as JSON with base64 data or URLs)
  documents: json("documents").$type<{
    idProof?: { url: string; type: string; expiryDate?: string; };
    idBack?: { url: string; type: string; };
    selfie?: { url: string; type: string; };
    proofOfAddress?: { url: string; type: string; issuedDate?: string; };
    businessRegistration?: { url: string; type: string; };
    taxCertificate?: { url: string; type: string; };
    articlesOfIncorporation?: { url: string; type: string; };
    beneficialOwnership?: { url: string; type: string; };
  }>(),
  
  // Document Expiry Tracking
  idExpiryDate: timestamp("id_expiry_date"),
  addressProofIssuedDate: timestamp("address_proof_issued_date"),
  
  // Screening & Risk
  screeningStatus: screeningStatusEnum("screening_status").default('Pending'),
  riskScore: integer("risk_score").default(0),
  riskLevel: riskLevelEnum("risk_level").default('Low'),
  isPep: boolean("is_pep").default(false),
  isSanctioned: boolean("is_sanctioned").default(false),
  screeningResults: json("screening_results").$type<{
    sanctions?: { checked: boolean; matchFound: boolean; details?: string; checkedAt?: string; };
    pep?: { checked: boolean; matchFound: boolean; details?: string; checkedAt?: string; };
    adverseMedia?: { checked: boolean; matchFound: boolean; details?: string; checkedAt?: string; };
  }>(),
  
  status: kycStatusEnum("status").notNull().default('In Progress'),
  reviewedBy: varchar("reviewed_by", { length: 255 }),
  reviewedAt: timestamp("reviewed_at"),
  rejectionReason: text("rejection_reason"),
  reviewNotes: text("review_notes"),
  
  // SLA Tracking
  slaDeadline: timestamp("sla_deadline"),
  escalatedAt: timestamp("escalated_at"),
  escalatedTo: varchar("escalated_to", { length: 255 }),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertKycSubmissionSchema = createInsertSchema(kycSubmissions).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertKycSubmission = z.infer<typeof insertKycSubmissionSchema>;
export type KycSubmission = typeof kycSubmissions.$inferSelect;

// ============================================
// USER RISK PROFILES
// ============================================

export const userRiskProfiles = pgTable("user_risk_profiles", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  
  // Overall Risk Score (0-100)
  overallRiskScore: integer("overall_risk_score").notNull().default(0),
  riskLevel: riskLevelEnum("risk_level").notNull().default('Low'),
  
  // Risk Factors
  geographyRisk: integer("geography_risk").default(0),
  transactionRisk: integer("transaction_risk").default(0),
  behaviorRisk: integer("behavior_risk").default(0),
  screeningRisk: integer("screening_risk").default(0),
  
  // Flags
  isPep: boolean("is_pep").notNull().default(false),
  isSanctioned: boolean("is_sanctioned").notNull().default(false),
  hasAdverseMedia: boolean("has_adverse_media").notNull().default(false),
  requiresEnhancedDueDiligence: boolean("requires_edd").notNull().default(false),
  
  // Limits based on risk
  dailyTransactionLimit: decimal("daily_transaction_limit", { precision: 18, scale: 2 }).default('10000'),
  monthlyTransactionLimit: decimal("monthly_transaction_limit", { precision: 18, scale: 2 }).default('50000'),
  
  // Last Assessment
  lastAssessedAt: timestamp("last_assessed_at").notNull().defaultNow(),
  lastAssessedBy: varchar("last_assessed_by", { length: 255 }),
  nextReviewDate: timestamp("next_review_date"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserRiskProfileSchema = createInsertSchema(userRiskProfiles).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUserRiskProfile = z.infer<typeof insertUserRiskProfileSchema>;
export type UserRiskProfile = typeof userRiskProfiles.$inferSelect;

// ============================================
// AML SCREENING LOGS
// ============================================

export const amlScreeningLogs = pgTable("aml_screening_logs", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  kycSubmissionId: varchar("kyc_submission_id", { length: 255 }).references(() => kycSubmissions.id),
  
  screeningType: varchar("screening_type", { length: 50 }).notNull(), // 'sanctions', 'pep', 'adverse_media', 'watchlist'
  provider: varchar("provider", { length: 100 }), // Provider name if external (Sumsub, Onfido, etc.)
  
  status: screeningStatusEnum("status").notNull().default('Pending'),
  matchFound: boolean("match_found").notNull().default(false),
  matchScore: integer("match_score"), // Confidence score 0-100
  
  rawResponse: json("raw_response"), // Store provider's raw response
  matchDetails: json("match_details").$type<{
    matchedName?: string;
    matchedEntity?: string;
    listName?: string;
    matchReason?: string;
    additionalInfo?: string;
  }>(),
  
  reviewedBy: varchar("reviewed_by", { length: 255 }),
  reviewedAt: timestamp("reviewed_at"),
  reviewDecision: varchar("review_decision", { length: 50 }), // 'cleared', 'escalated', 'blocked'
  reviewNotes: text("review_notes"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAmlScreeningLogSchema = createInsertSchema(amlScreeningLogs).omit({ id: true, createdAt: true });
export type InsertAmlScreeningLog = z.infer<typeof insertAmlScreeningLogSchema>;
export type AmlScreeningLog = typeof amlScreeningLogs.$inferSelect;

// ============================================
// AML CASES
// ============================================

export const amlCases = pgTable("aml_cases", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  caseNumber: varchar("case_number", { length: 50 }).notNull().unique(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  
  caseType: varchar("case_type", { length: 50 }).notNull(), // 'suspicious_transaction', 'screening_match', 'threshold_breach', 'manual_referral'
  status: amlCaseStatusEnum("status").notNull().default('Open'),
  priority: riskLevelEnum("priority").notNull().default('Medium'),
  
  // Trigger Information
  triggeredBy: varchar("triggered_by", { length: 50 }).notNull(), // 'system', 'manual', 'threshold', 'screening'
  triggerTransactionId: varchar("trigger_transaction_id", { length: 255 }),
  triggerDetails: json("trigger_details").$type<{
    reason: string;
    amount?: number;
    threshold?: number;
    ruleId?: string;
  }>(),
  
  // Investigation
  assignedTo: varchar("assigned_to", { length: 255 }),
  assignedAt: timestamp("assigned_at"),
  investigationNotes: text("investigation_notes"),
  
  // SAR (Suspicious Activity Report) tracking
  sarRequired: boolean("sar_required").default(false),
  sarFiledAt: timestamp("sar_filed_at"),
  sarReferenceNumber: varchar("sar_reference_number", { length: 100 }),
  
  // Resolution
  resolution: text("resolution"),
  resolvedBy: varchar("resolved_by", { length: 255 }),
  resolvedAt: timestamp("resolved_at"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAmlCaseSchema = createInsertSchema(amlCases).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAmlCase = z.infer<typeof insertAmlCaseSchema>;
export type AmlCase = typeof amlCases.$inferSelect;

// ============================================
// AML CASE ACTIVITIES (Audit Trail)
// ============================================

export const amlCaseActivities = pgTable("aml_case_activities", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  caseId: varchar("case_id", { length: 255 }).notNull().references(() => amlCases.id),
  
  activityType: varchar("activity_type", { length: 50 }).notNull(), // 'created', 'assigned', 'note_added', 'status_changed', 'sar_filed', 'resolved'
  description: text("description").notNull(),
  previousValue: text("previous_value"),
  newValue: text("new_value"),
  
  performedBy: varchar("performed_by", { length: 255 }).notNull(),
  performedAt: timestamp("performed_at").notNull().defaultNow(),
});

export const insertAmlCaseActivitySchema = createInsertSchema(amlCaseActivities).omit({ id: true });
export type InsertAmlCaseActivity = z.infer<typeof insertAmlCaseActivitySchema>;
export type AmlCaseActivity = typeof amlCaseActivities.$inferSelect;

// ============================================
// TRANSACTION MONITORING RULES
// ============================================

export const amlMonitoringRules = pgTable("aml_monitoring_rules", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  ruleName: varchar("rule_name", { length: 255 }).notNull(),
  ruleCode: varchar("rule_code", { length: 50 }).notNull().unique(),
  description: text("description"),
  
  isActive: boolean("is_active").notNull().default(true),
  priority: integer("priority").notNull().default(5),
  
  // Rule Configuration
  ruleType: varchar("rule_type", { length: 50 }).notNull(), // 'threshold', 'velocity', 'pattern', 'geography'
  conditions: json("conditions").$type<{
    amountThreshold?: number;
    currency?: string;
    timeWindowHours?: number;
    transactionCount?: number;
    transactionTypes?: string[];
    highRiskCountries?: string[];
  }>(),
  
  // Actions when triggered
  actionType: varchar("action_type", { length: 50 }).notNull(), // 'alert', 'block', 'flag', 'escalate'
  
  createdBy: varchar("created_by", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAmlMonitoringRuleSchema = createInsertSchema(amlMonitoringRules).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAmlMonitoringRule = z.infer<typeof insertAmlMonitoringRuleSchema>;
export type AmlMonitoringRule = typeof amlMonitoringRules.$inferSelect;

// ============================================
// COMPLIANCE SETTINGS (KYC Mode Toggle)
// ============================================

export const kycModeEnum = pgEnum('kyc_mode', ['kycAml', 'finatrades']);

export const complianceSettings = pgTable("compliance_settings", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  activeKycMode: kycModeEnum("active_kyc_mode").notNull().default('kycAml'),
  
  // Finatrades KYC settings for personal accounts
  finatradesPersonalConfig: json("finatrades_personal_config").$type<{
    enableLivenessCapture: boolean;
    requiredDocuments?: string[];
  }>(),
  
  // Finatrades KYC settings for corporate accounts
  finanatradesCorporateConfig: json("finatrades_corporate_config").$type<{
    enableLivenessCapture: boolean;
    requiredDocuments: string[];
  }>(),
  
  // Country restrictions - list of allowed country codes (empty = all allowed)
  allowedCountries: json("allowed_countries").$type<string[]>(),
  blockedCountries: json("blocked_countries").$type<string[]>(),
  
  updatedBy: varchar("updated_by", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertComplianceSettingsSchema = createInsertSchema(complianceSettings).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertComplianceSettings = z.infer<typeof insertComplianceSettingsSchema>;
export type ComplianceSettings = typeof complianceSettings.$inferSelect;

// ============================================
// FINATRADES CORPORATE KYC SUBMISSIONS
// ============================================

export const finatradesCorporateKyc = pgTable("finatrades_corporate_kyc", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  
  // Section 1: Corporate Details
  companyName: varchar("company_name", { length: 255 }),
  registrationNumber: varchar("registration_number", { length: 100 }),
  incorporationDate: varchar("incorporation_date", { length: 50 }),
  countryOfIncorporation: varchar("country_of_incorporation", { length: 100 }),
  companyType: varchar("company_type", { length: 50 }), // 'public' or 'private'
  natureOfBusiness: text("nature_of_business"),
  numberOfEmployees: varchar("number_of_employees", { length: 50 }),
  headOfficeAddress: text("head_office_address"),
  telephoneNumber: varchar("telephone_number", { length: 50 }),
  website: varchar("website", { length: 255 }),
  emailAddress: varchar("email_address", { length: 255 }),
  tradingContactName: varchar("trading_contact_name", { length: 255 }),
  tradingContactEmail: varchar("trading_contact_email", { length: 255 }),
  tradingContactPhone: varchar("trading_contact_phone", { length: 50 }),
  financeContactName: varchar("finance_contact_name", { length: 255 }),
  financeContactEmail: varchar("finance_contact_email", { length: 255 }),
  financeContactPhone: varchar("finance_contact_phone", { length: 50 }),
  
  // Section 2: Beneficial Ownership & Shareholding
  beneficialOwners: json("beneficial_owners").$type<Array<{
    name: string;
    passportNumber: string;
    emailId: string;
    shareholdingPercentage: number;
  }>>(),
  shareholderCompanyUbos: text("shareholder_company_ubos"),
  hasPepOwners: boolean("has_pep_owners").default(false),
  pepDetails: text("pep_details"),
  
  // Section 3: Documentation (checklist with file uploads)
  documents: json("documents").$type<{
    certificateOfIncorporation?: { url: string; uploaded: boolean; };
    tradeLicense?: { url: string; uploaded: boolean; };
    memorandumArticles?: { url: string; uploaded: boolean; };
    shareholderList?: { url: string; uploaded: boolean; };
    uboPassports?: { url: string; uploaded: boolean; };
    bankReferenceLetter?: { url: string; uploaded: boolean; };
    authorizedSignatories?: { url: string; uploaded: boolean; };
  }>(),
  
  // Document Expiry Tracking
  tradeLicenseExpiryDate: varchar("trade_license_expiry_date", { length: 20 }),
  directorPassportExpiryDate: varchar("director_passport_expiry_date", { length: 20 }),
  expiryReminderSent30Days: boolean("expiry_reminder_sent_30_days").default(false),
  expiryReminderSent14Days: boolean("expiry_reminder_sent_14_days").default(false),
  expiryReminderSent7Days: boolean("expiry_reminder_sent_7_days").default(false),
  expiryReminderSentExpired: boolean("expiry_reminder_sent_expired").default(false),
  
  // Section 4: Banking Details
  bankName: varchar("bank_name", { length: 255 }),
  bankBranchAddress: text("bank_branch_address"),
  bankCity: varchar("bank_city", { length: 100 }),
  bankCountry: varchar("bank_country", { length: 100 }),
  
  // Liveness verification for authorized signatory
  livenessVerified: boolean("liveness_verified").default(false),
  livenessCapture: text("liveness_capture"), // Base64 or URL
  livenessVerifiedAt: timestamp("liveness_verified_at"),
  
  // Status tracking
  status: kycStatusEnum("status").notNull().default('In Progress'),
  reviewedBy: varchar("reviewed_by", { length: 255 }),
  reviewedAt: timestamp("reviewed_at"),
  rejectionReason: text("rejection_reason"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertFinatradesCorporateKycSchema = createInsertSchema(finatradesCorporateKyc).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFinatradesCorporateKyc = z.infer<typeof insertFinatradesCorporateKycSchema>;
export type FinatradesCorporateKyc = typeof finatradesCorporateKyc.$inferSelect;

// ============================================
// FINATRADES PERSONAL KYC (Personal Info + Documents + Liveness)
// ============================================

export const finatradesPersonalKyc = pgTable("finatrades_personal_kyc", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  
  // Personal Information
  fullName: varchar("full_name", { length: 255 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  country: varchar("country", { length: 100 }),
  city: varchar("city", { length: 100 }),
  address: text("address"),
  postalCode: varchar("postal_code", { length: 20 }),
  nationality: varchar("nationality", { length: 100 }),
  occupation: varchar("occupation", { length: 100 }),
  sourceOfFunds: varchar("source_of_funds", { length: 100 }),
  accountType: varchar("account_type", { length: 50 }),
  dateOfBirth: varchar("date_of_birth", { length: 20 }),
  
  // Document Uploads
  idFrontUrl: text("id_front_url"),
  idBackUrl: text("id_back_url"),
  passportUrl: text("passport_url"),
  addressProofUrl: text("address_proof_url"),
  
  // Document Expiry Tracking
  passportExpiryDate: varchar("passport_expiry_date", { length: 20 }),
  expiryReminderSent30Days: boolean("expiry_reminder_sent_30_days").default(false),
  expiryReminderSent14Days: boolean("expiry_reminder_sent_14_days").default(false),
  expiryReminderSent7Days: boolean("expiry_reminder_sent_7_days").default(false),
  expiryReminderSentExpired: boolean("expiry_reminder_sent_expired").default(false),
  
  // Liveness face capture
  livenessVerified: boolean("liveness_verified").default(false),
  livenessCapture: text("liveness_capture"),
  livenessVerifiedAt: timestamp("liveness_verified_at"),
  
  // Status tracking
  status: kycStatusEnum("status").notNull().default('In Progress'),
  reviewedBy: varchar("reviewed_by", { length: 255 }),
  reviewedAt: timestamp("reviewed_at"),
  rejectionReason: text("rejection_reason"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertFinatradesPersonalKycSchema = createInsertSchema(finatradesPersonalKyc).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFinatradesPersonalKyc = z.infer<typeof insertFinatradesPersonalKycSchema>;
export type FinatradesPersonalKyc = typeof finatradesPersonalKyc.$inferSelect;

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
  bankAccountId: varchar("bank_account_id", { length: 255 }), // Optional - no FK constraint to allow JSON-stored bank accounts
  // Snapshot of target bank account details (for audit trail)
  targetBankName: varchar("target_bank_name", { length: 255 }),
  targetAccountName: varchar("target_account_name", { length: 255 }),
  targetAccountNumber: varchar("target_account_number", { length: 255 }),
  targetSwiftCode: varchar("target_swift_code", { length: 100 }),
  targetIban: varchar("target_iban", { length: 100 }),
  targetCurrency: varchar("target_currency", { length: 10 }),
  amountUsd: decimal("amount_usd", { precision: 18, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).notNull().default('USD'),
  paymentMethod: varchar("payment_method", { length: 100 }).notNull().default('Bank Transfer'),
  senderBankName: varchar("sender_bank_name", { length: 255 }), // User's sending bank
  senderAccountName: varchar("sender_account_name", { length: 255 }), // Name on user's bank account
  transactionReference: varchar("transaction_reference", { length: 255 }), // User's bank transfer reference
  proofOfPayment: text("proof_of_payment"), // Base64 or URL to uploaded receipt image
  notes: text("notes"),
  status: depositRequestStatusEnum("status").notNull().default('Pending'),
  processedBy: varchar("processed_by", { length: 255 }).references(() => users.id),
  processedAt: timestamp("processed_at"),
  rejectionReason: text("rejection_reason"),
  adminNotes: text("admin_notes"), // Admin notes for processing
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
// FINAPAY - GOLD REQUESTS (P2P Request Money)
// ============================================

export const goldRequestStatusEnum = pgEnum('gold_request_status', ['Pending', 'Fulfilled', 'Cancelled', 'Expired', 'Rejected']);

export const goldRequests = pgTable("gold_requests", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  referenceNumber: varchar("reference_number", { length: 100 }).notNull().unique(),
  requesterId: varchar("requester_id", { length: 255 }).notNull().references(() => users.id),
  payerId: varchar("payer_id", { length: 255 }).references(() => users.id), // Who is being asked to pay
  payerEmail: varchar("payer_email", { length: 255 }), // If payer is not yet a user
  goldGrams: decimal("gold_grams", { precision: 18, scale: 6 }).notNull(),
  amountUsd: decimal("amount_usd", { precision: 18, scale: 2 }), // USD equivalent at time of request
  goldPriceAtRequest: decimal("gold_price_at_request", { precision: 12, scale: 2 }),
  reason: text("reason"),
  memo: text("memo"),
  status: goldRequestStatusEnum("status").notNull().default('Pending'),
  expiresAt: timestamp("expires_at"), // Request expiration
  fulfilledAt: timestamp("fulfilled_at"),
  fulfilledTransactionId: varchar("fulfilled_transaction_id", { length: 255 }).references(() => transactions.id),
  cancelledAt: timestamp("cancelled_at"),
  cancelReason: text("cancel_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertGoldRequestSchema = createInsertSchema(goldRequests).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertGoldRequest = z.infer<typeof insertGoldRequestSchema>;
export type GoldRequest = typeof goldRequests.$inferSelect;

// ============================================
// FINAPAY - QR PAYMENT INVOICES
// ============================================

export const qrPaymentStatusEnum = pgEnum('qr_payment_status', ['Active', 'Paid', 'Expired', 'Cancelled']);

export const qrPaymentInvoices = pgTable("qr_payment_invoices", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  invoiceCode: varchar("invoice_code", { length: 100 }).notNull().unique(), // Short code for QR
  merchantId: varchar("merchant_id", { length: 255 }).notNull().references(() => users.id),
  goldGrams: decimal("gold_grams", { precision: 18, scale: 6 }),
  amountUsd: decimal("amount_usd", { precision: 18, scale: 2 }),
  goldPriceAtCreation: decimal("gold_price_at_creation", { precision: 12, scale: 2 }),
  description: text("description"),
  status: qrPaymentStatusEnum("status").notNull().default('Active'),
  payerId: varchar("payer_id", { length: 255 }).references(() => users.id),
  paidAt: timestamp("paid_at"),
  paidTransactionId: varchar("paid_transaction_id", { length: 255 }).references(() => transactions.id),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertQrPaymentInvoiceSchema = createInsertSchema(qrPaymentInvoices).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertQrPaymentInvoice = z.infer<typeof insertQrPaymentInvoiceSchema>;
export type QrPaymentInvoice = typeof qrPaymentInvoices.$inferSelect;

// ============================================
// ADMIN - WALLET ADJUSTMENTS
// ============================================

export const walletAdjustmentTypeEnum = pgEnum('wallet_adjustment_type', ['Credit', 'Debit', 'Freeze', 'Unfreeze', 'Correction']);

export const walletAdjustments = pgTable("wallet_adjustments", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  referenceNumber: varchar("reference_number", { length: 100 }).notNull().unique(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  adjustmentType: walletAdjustmentTypeEnum("adjustment_type").notNull(),
  goldGrams: decimal("gold_grams", { precision: 18, scale: 6 }),
  amountUsd: decimal("amount_usd", { precision: 18, scale: 2 }),
  goldPriceUsdPerGram: decimal("gold_price_usd_per_gram", { precision: 12, scale: 2 }),
  reason: text("reason").notNull(),
  internalNotes: text("internal_notes"),
  approvedBy: varchar("approved_by", { length: 255 }).references(() => users.id),
  approvedAt: timestamp("approved_at"),
  executedBy: varchar("executed_by", { length: 255 }).notNull().references(() => users.id),
  transactionId: varchar("transaction_id", { length: 255 }).references(() => transactions.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertWalletAdjustmentSchema = createInsertSchema(walletAdjustments).omit({ id: true, createdAt: true });
export type InsertWalletAdjustment = z.infer<typeof insertWalletAdjustmentSchema>;
export type WalletAdjustment = typeof walletAdjustments.$inferSelect;

// ============================================
// USER ACCOUNT STATUS (Freeze/Suspend)
// ============================================

export const userAccountStatus = pgTable("user_account_status", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id).unique(),
  isFrozen: boolean("is_frozen").notNull().default(false),
  frozenAt: timestamp("frozen_at"),
  frozenBy: varchar("frozen_by", { length: 255 }).references(() => users.id),
  frozenReason: text("frozen_reason"),
  dailyTransferLimitUsd: decimal("daily_transfer_limit_usd", { precision: 18, scale: 2 }).default('10000'),
  monthlyTransferLimitUsd: decimal("monthly_transfer_limit_usd", { precision: 18, scale: 2 }).default('100000'),
  dailyTransferUsedUsd: decimal("daily_transfer_used_usd", { precision: 18, scale: 2 }).default('0'),
  monthlyTransferUsedUsd: decimal("monthly_transfer_used_usd", { precision: 18, scale: 2 }).default('0'),
  lastDailyReset: timestamp("last_daily_reset").defaultNow(),
  lastMonthlyReset: timestamp("last_monthly_reset").defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserAccountStatusSchema = createInsertSchema(userAccountStatus).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUserAccountStatus = z.infer<typeof insertUserAccountStatusSchema>;
export type UserAccountStatus = typeof userAccountStatus.$inferSelect;

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
// FINAVAULT - CENTRAL OWNERSHIP LEDGER
// ============================================

// Ownership status tracks where gold is allocated
export const ownershipStatusEnum = pgEnum('ownership_status', [
  'Available',           // In FinaPay wallet, freely transferable
  'Locked_BNSL',         // Locked in BNSL plan
  'Reserved_Trade',      // Reserved for FinaBridge trade settlement
  'Pending_Deposit',     // Awaiting deposit confirmation
  'Pending_Withdrawal'   // Awaiting withdrawal processing
]);

// Ledger action types for audit trail
export const ledgerActionEnum = pgEnum('ledger_action', [
  'Deposit',                    // Funds added to system
  'Withdrawal',                 // Funds removed from system
  'Transfer_Send',              // User-to-user transfer (sender)
  'Transfer_Receive',           // User-to-user transfer (receiver)
  'FinaPay_To_BNSL',           // Transfer from FinaPay to BNSL wallet
  'BNSL_To_FinaPay',           // Transfer back from BNSL to FinaPay
  'BNSL_Lock',                 // Lock gold in BNSL plan
  'BNSL_Unlock',               // Unlock gold from BNSL plan (maturity/termination)
  'FinaPay_To_FinaBridge',     // Transfer from FinaPay to FinaBridge wallet
  'FinaBridge_To_FinaPay',     // Transfer back from FinaBridge to FinaPay
  'Trade_Reserve',              // Reserve gold for trade settlement
  'Trade_Release',              // Release gold from trade (settlement complete)
  'Payout_Credit',              // BNSL payout credited as gold
  'Fee_Deduction',              // Fee deducted from balance
  'Adjustment',                 // Manual adjustment by admin
  'Pending_Deposit',            // Deposit awaiting verification
  'Pending_Confirm',            // Pending deposit confirmed
  'Pending_Reject',             // Pending deposit rejected
  'Physical_Delivery',          // Physical gold delivery
  'Vault_Transfer',             // Transfer between vault locations
  'Gift_Send',                  // Gold gift sent
  'Gift_Receive',               // Gold gift received
  'Storage_Fee'                 // Storage fee deduction
]);

// Wallet types for tracking source/destination
export const walletTypeEnum = pgEnum('wallet_type', [
  'FinaPay',      // Main user wallet
  'BNSL',         // BNSL dedicated wallet
  'FinaBridge',   // FinaBridge trade wallet
  'External',     // External (deposits/withdrawals)
  'Escrow'        // Escrow for pending invitation transfers
]);

// Central ledger tracking all gold ownership changes
export const vaultLedgerEntries = pgTable("vault_ledger_entries", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  
  // Action details
  action: ledgerActionEnum("action").notNull(),
  goldGrams: decimal("gold_grams", { precision: 18, scale: 6 }).notNull(),
  goldPriceUsdPerGram: decimal("gold_price_usd_per_gram", { precision: 12, scale: 2 }),
  valueUsd: decimal("value_usd", { precision: 18, scale: 2 }),
  
  // Source and destination
  fromWallet: walletTypeEnum("from_wallet"),
  toWallet: walletTypeEnum("to_wallet"),
  fromStatus: ownershipStatusEnum("from_status"),
  toStatus: ownershipStatusEnum("to_status"),
  
  // Running balance after this entry
  balanceAfterGrams: decimal("balance_after_grams", { precision: 18, scale: 6 }).notNull(),
  
  // Reference IDs for linking to related entities
  transactionId: varchar("transaction_id", { length: 255 }),
  bnslPlanId: varchar("bnsl_plan_id", { length: 255 }),
  bnslPayoutId: varchar("bnsl_payout_id", { length: 255 }),
  tradeRequestId: varchar("trade_request_id", { length: 255 }),
  certificateId: varchar("certificate_id", { length: 255 }),
  
  // For transfers between users
  counterpartyUserId: varchar("counterparty_user_id", { length: 255 }).references(() => users.id),
  
  // Audit fields
  notes: text("notes"),
  createdBy: varchar("created_by", { length: 255 }), // 'system' or admin userId
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertVaultLedgerEntrySchema = createInsertSchema(vaultLedgerEntries).omit({ id: true, createdAt: true });
export type InsertVaultLedgerEntry = z.infer<typeof insertVaultLedgerEntrySchema>;
export type VaultLedgerEntry = typeof vaultLedgerEntries.$inferSelect;

// User's consolidated ownership view (aggregated from ledger)
export const vaultOwnershipSummary = pgTable("vault_ownership_summary", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id).unique(),
  
  // Total gold owned by user
  totalGoldGrams: decimal("total_gold_grams", { precision: 18, scale: 6 }).notNull().default('0'),
  
  // Breakdown by status
  availableGrams: decimal("available_grams", { precision: 18, scale: 6 }).notNull().default('0'),
  pendingGrams: decimal("pending_grams", { precision: 18, scale: 6 }).notNull().default('0'),
  lockedBnslGrams: decimal("locked_bnsl_grams", { precision: 18, scale: 6 }).notNull().default('0'),
  reservedTradeGrams: decimal("reserved_trade_grams", { precision: 18, scale: 6 }).notNull().default('0'),
  
  // Breakdown by wallet
  finaPayGrams: decimal("finapay_grams", { precision: 18, scale: 6 }).notNull().default('0'),
  bnslAvailableGrams: decimal("bnsl_available_grams", { precision: 18, scale: 6 }).notNull().default('0'),
  bnslLockedGrams: decimal("bnsl_locked_grams", { precision: 18, scale: 6 }).notNull().default('0'),
  finaBridgeAvailableGrams: decimal("finabridge_available_grams", { precision: 18, scale: 6 }).notNull().default('0'),
  finaBridgeReservedGrams: decimal("finabridge_reserved_grams", { precision: 18, scale: 6 }).notNull().default('0'),
  
  // Vault custody info
  vaultLocation: varchar("vault_location", { length: 255 }).notNull().default('Dubai - Wingold & Metals DMCC'),
  wingoldStorageRef: varchar("wingold_storage_ref", { length: 100 }),
  
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertVaultOwnershipSummarySchema = createInsertSchema(vaultOwnershipSummary).omit({ id: true, createdAt: true, lastUpdated: true });
export type InsertVaultOwnershipSummary = z.infer<typeof insertVaultOwnershipSummarySchema>;
export type VaultOwnershipSummary = typeof vaultOwnershipSummary.$inferSelect;

// ============================================
// PHYSICAL GOLD ALLOCATIONS (Wingold & Metals DMCC)
// ============================================

export const allocationStatusEnum = pgEnum('allocation_status', ['Allocated', 'Released', 'Adjusted']);

export const allocations = pgTable("allocations", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  transactionId: varchar("transaction_id", { length: 255 }).references(() => transactions.id),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  
  // Allocation details
  gramsAllocated: decimal("grams_allocated", { precision: 18, scale: 6 }).notNull(),
  vaultLocation: varchar("vault_location", { length: 255 }).notNull().default('Dubai - Wingold & Metals DMCC'),
  physicalProvider: varchar("physical_provider", { length: 255 }).notNull().default('Wingold & Metals DMCC'),
  
  // Storage certificate reference
  storageCertificateId: varchar("storage_certificate_id", { length: 255 }).references(() => certificates.id),
  allocationBatchRef: varchar("allocation_batch_ref", { length: 100 }),
  
  // Status
  status: allocationStatusEnum("status").notNull().default('Allocated'),
  
  // Audit
  notes: text("notes"),
  createdBy: varchar("created_by", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAllocationSchema = createInsertSchema(allocations).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAllocation = z.infer<typeof insertAllocationSchema>;
export type Allocation = typeof allocations.$inferSelect;

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
  'Submitted', 'Under Review', 'Approved – Awaiting Delivery', 'Received at Vault', 'Stored in Vault', 'Approved', 'Awaiting Delivery', 'Received', 'Stored', 'Rejected', 'Cancelled'
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
  
  // Processing time estimates
  estimatedProcessingDays: varchar("estimated_processing_days", { length: 20 }),
  estimatedCompletionDate: timestamp("estimated_completion_date"),
  
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
  availableValueUsd: decimal("available_value_usd", { precision: 18, scale: 2 }).notNull().default('0'),
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
  
  termsAndConditions: text("terms_and_conditions"),
  
  pdfPath: text("pdf_path"),
  pdfFileName: varchar("pdf_file_name", { length: 255 }),
  
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

export const insertBnslAgreementSchema = createInsertSchema(bnslAgreements).omit({ id: true, createdAt: true }).extend({
  signedAt: z.union([z.date(), z.string().transform(s => new Date(s))]),
});
export type InsertBnslAgreement = z.infer<typeof insertBnslAgreementSchema>;
export type BnslAgreement = typeof bnslAgreements.$inferSelect;

// FinaBridge Agreements - Signed T&C storage for trade finance
export const finabridgeAgreements = pgTable("finabridge_agreements", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  
  templateVersion: varchar("template_version", { length: 50 }).notNull().default('V1-2025-12-23'),
  signatureName: varchar("signature_name", { length: 255 }).notNull(),
  signedAt: timestamp("signed_at").notNull(),
  
  role: varchar("role", { length: 50 }).notNull(), // 'importer', 'exporter', 'both'
  termsAndConditions: text("terms_and_conditions"),
  
  acceptanceDetails: json("acceptance_details").$type<{
    role: string;
    acceptedSections: string[];
    ipAddress?: string;
    userAgent?: string;
  }>(),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertFinabridgeAgreementSchema = createInsertSchema(finabridgeAgreements).omit({ id: true, createdAt: true }).extend({
  signedAt: z.union([z.date(), z.string().transform(s => new Date(s))]),
});
export type InsertFinabridgeAgreement = z.infer<typeof insertFinabridgeAgreementSchema>;
export type FinabridgeAgreement = typeof finabridgeAgreements.$inferSelect;

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
  'Submitted', 'Shortlisted', 'Rejected', 'Forwarded', 'Accepted', 'Declined', 'Modification Requested'
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
  
  // Trade Deadlines
  proposalDeadline: timestamp("proposal_deadline"),
  settlementDeadline: timestamp("settlement_deadline"),
  deliveryDeadline: timestamp("delivery_deadline"),
  reminderSentAt: timestamp("reminder_sent_at"),
  isOverdue: boolean("is_overdue").default(false),
  
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
  
  portOfLoading: varchar("port_of_loading", { length: 255 }),
  shippingMethod: varchar("shipping_method", { length: 50 }),
  incoterms: varchar("incoterms", { length: 50 }),
  paymentTerms: text("payment_terms"),
  estimatedDeliveryDate: varchar("estimated_delivery_date", { length: 50 }),
  insuranceIncluded: boolean("insurance_included").default(false),
  certificationsAvailable: text("certifications_available"),
  
  companyName: varchar("company_name", { length: 255 }),
  companyRegistration: varchar("company_registration", { length: 100 }),
  contactPerson: varchar("contact_person", { length: 255 }),
  contactEmail: varchar("contact_email", { length: 255 }),
  contactPhone: varchar("contact_phone", { length: 50 }),
  
  modificationRequest: text("modification_request"),
  requestedDocuments: text("requested_documents").array(),
  customDocumentNotes: text("custom_document_notes"),
  fieldsToUpdate: text("fields_to_update").array(),
  uploadedRevisionDocuments: text("uploaded_revision_documents"),
  
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
  incomingLockedGoldGrams: decimal("incoming_locked_gold_grams", { precision: 18, scale: 6 }).notNull().default('0'),
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

// Partial Settlements - for releasing gold in portions
export const partialSettlements = pgTable("partial_settlements", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  settlementHoldId: varchar("settlement_hold_id", { length: 255 }).notNull().references(() => settlementHolds.id),
  tradeRequestId: varchar("trade_request_id", { length: 255 }).notNull().references(() => tradeRequests.id),
  releasedGoldGrams: decimal("released_gold_grams", { precision: 18, scale: 6 }).notNull(),
  releasePercentage: decimal("release_percentage", { precision: 5, scale: 2 }).notNull(),
  reason: text("reason"),
  milestone: varchar("milestone", { length: 255 }),
  releasedBy: varchar("released_by", { length: 255 }).notNull().references(() => users.id),
  transactionId: varchar("transaction_id", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPartialSettlementSchema = createInsertSchema(partialSettlements).omit({ id: true, createdAt: true });
export type InsertPartialSettlement = z.infer<typeof insertPartialSettlementSchema>;
export type PartialSettlement = typeof partialSettlements.$inferSelect;

// Trade Disputes
export const tradeDisputeStatusEnum = pgEnum('trade_dispute_status', [
  'Open', 'Under Review', 'Pending Resolution', 'Resolved', 'Escalated', 'Closed'
]);

export const tradeDisputes = pgTable("trade_disputes", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  disputeRefId: varchar("dispute_ref_id", { length: 50 }).notNull().unique(),
  tradeRequestId: varchar("trade_request_id", { length: 255 }).notNull().references(() => tradeRequests.id),
  dealRoomId: varchar("deal_room_id", { length: 255 }).references(() => dealRooms.id),
  raisedByUserId: varchar("raised_by_user_id", { length: 255 }).notNull().references(() => users.id),
  raisedByRole: varchar("raised_by_role", { length: 20 }).notNull(),
  disputeType: varchar("dispute_type", { length: 100 }).notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  description: text("description").notNull(),
  evidenceUrls: text("evidence_urls").array(),
  requestedResolution: text("requested_resolution"),
  status: tradeDisputeStatusEnum("status").notNull().default('Open'),
  priority: varchar("priority", { length: 20 }).default('Medium'),
  assignedAdminId: varchar("assigned_admin_id", { length: 255 }).references(() => users.id),
  resolution: text("resolution"),
  resolvedBy: varchar("resolved_by", { length: 255 }).references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTradeDisputeSchema = createInsertSchema(tradeDisputes).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTradeDispute = z.infer<typeof insertTradeDisputeSchema>;
export type TradeDispute = typeof tradeDisputes.$inferSelect;

// Trade Dispute Comments
export const tradeDisputeComments = pgTable("trade_dispute_comments", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  disputeId: varchar("dispute_id", { length: 255 }).notNull().references(() => tradeDisputes.id),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  userRole: varchar("user_role", { length: 20 }).notNull(),
  content: text("content").notNull(),
  attachmentUrl: text("attachment_url"),
  isInternal: boolean("is_internal").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTradeDisputeCommentSchema = createInsertSchema(tradeDisputeComments).omit({ id: true, createdAt: true });
export type InsertTradeDisputeComment = z.infer<typeof insertTradeDisputeCommentSchema>;
export type TradeDisputeComment = typeof tradeDisputeComments.$inferSelect;

// Deal Room Documents - trade-related document uploads
export const dealRoomDocumentTypeEnum = pgEnum('deal_room_document_type', [
  'Invoice', 'Bill of Lading', 'Insurance Certificate', 'Certificate of Origin', 
  'Packing List', 'Quality Certificate', 'Customs Declaration', 'Other'
]);

export const dealRoomDocumentStatusEnum = pgEnum('deal_room_document_status', [
  'Pending', 'Verified', 'Rejected', 'Expired'
]);

export const dealRoomDocuments = pgTable("deal_room_documents", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  dealRoomId: varchar("deal_room_id", { length: 255 }).notNull().references(() => dealRooms.id),
  tradeRequestId: varchar("trade_request_id", { length: 255 }).notNull().references(() => tradeRequests.id),
  uploadedByUserId: varchar("uploaded_by_user_id", { length: 255 }).notNull().references(() => users.id),
  uploaderRole: varchar("uploader_role", { length: 20 }).notNull(),
  documentType: dealRoomDocumentTypeEnum("document_type").notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileUrl: text("file_url").notNull(),
  fileSize: integer("file_size"),
  description: text("description"),
  status: dealRoomDocumentStatusEnum("status").notNull().default('Pending'),
  verifiedBy: varchar("verified_by", { length: 255 }).references(() => users.id),
  verifiedAt: timestamp("verified_at"),
  verificationNotes: text("verification_notes"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertDealRoomDocumentSchema = createInsertSchema(dealRoomDocuments).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDealRoomDocument = z.infer<typeof insertDealRoomDocumentSchema>;
export type DealRoomDocument = typeof dealRoomDocuments.$inferSelect;

// ============================================
// DEAL ROOM - TRADE CASE CONVERSATIONS
// ============================================

export const dealRoomParticipantRoleEnum = pgEnum('deal_room_participant_role', [
  'importer', 'exporter', 'admin'
]);

export const dealRooms = pgTable("deal_rooms", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  tradeRequestId: varchar("trade_request_id", { length: 255 }).notNull().references(() => tradeRequests.id),
  acceptedProposalId: varchar("accepted_proposal_id", { length: 255 }).notNull().references(() => tradeProposals.id),
  importerUserId: varchar("importer_user_id", { length: 255 }).notNull().references(() => users.id),
  exporterUserId: varchar("exporter_user_id", { length: 255 }).notNull().references(() => users.id),
  assignedAdminId: varchar("assigned_admin_id", { length: 255 }).references(() => users.id),
  status: varchar("status", { length: 50 }).notNull().default('active'),
  
  isClosed: boolean("is_closed").notNull().default(false),
  closedAt: timestamp("closed_at"),
  closedBy: varchar("closed_by", { length: 255 }).references(() => users.id),
  closureNotes: text("closure_notes"),
  
  adminDisclaimer: text("admin_disclaimer"),
  adminDisclaimerUpdatedAt: timestamp("admin_disclaimer_updated_at"),
  adminDisclaimerUpdatedBy: varchar("admin_disclaimer_updated_by", { length: 255 }).references(() => users.id),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertDealRoomSchema = createInsertSchema(dealRooms).omit({ id: true, createdAt: true, updatedAt: true, adminDisclaimerUpdatedAt: true });
export type InsertDealRoom = z.infer<typeof insertDealRoomSchema>;
export type DealRoom = typeof dealRooms.$inferSelect;

export const dealRoomMessages = pgTable("deal_room_messages", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  dealRoomId: varchar("deal_room_id", { length: 255 }).notNull().references(() => dealRooms.id),
  senderUserId: varchar("sender_user_id", { length: 255 }).notNull().references(() => users.id),
  senderRole: dealRoomParticipantRoleEnum("sender_role").notNull(),
  content: text("content"),
  attachmentUrl: text("attachment_url"),
  attachmentName: varchar("attachment_name", { length: 255 }),
  attachmentType: varchar("attachment_type", { length: 100 }),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDealRoomMessageSchema = createInsertSchema(dealRoomMessages).omit({ id: true, createdAt: true });
export type InsertDealRoomMessage = z.infer<typeof insertDealRoomMessageSchema>;
export type DealRoomMessage = typeof dealRoomMessages.$inferSelect;

export const dealRoomAgreementAcceptances = pgTable("deal_room_agreement_acceptances", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  dealRoomId: varchar("deal_room_id", { length: 255 }).notNull().references(() => dealRooms.id),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  role: dealRoomParticipantRoleEnum("role").notNull(),
  agreementVersion: varchar("agreement_version", { length: 50 }).notNull().default('1.0'),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  acceptedAt: timestamp("accepted_at").notNull().defaultNow(),
});

export const insertDealRoomAgreementAcceptanceSchema = createInsertSchema(dealRoomAgreementAcceptances).omit({ id: true, acceptedAt: true });
export type InsertDealRoomAgreementAcceptance = z.infer<typeof insertDealRoomAgreementAcceptanceSchema>;
export type DealRoomAgreementAcceptance = typeof dealRoomAgreementAcceptances.$inferSelect;

// ============================================
// CHAT AGENTS
// ============================================

export const chatAgentTypeEnum = pgEnum('chat_agent_type', ['general', 'juris', 'support', 'custom']);
export const chatAgentStatusEnum = pgEnum('chat_agent_status', ['active', 'inactive', 'maintenance']);

export const chatAgents = pgTable("chat_agents", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  displayName: varchar("display_name", { length: 255 }).notNull(),
  type: chatAgentTypeEnum("type").notNull(),
  description: text("description"),
  avatar: varchar("avatar", { length: 500 }),
  welcomeMessage: text("welcome_message"),
  capabilities: text("capabilities"), // JSON array of capabilities
  status: chatAgentStatusEnum("status").notNull().default('active'),
  priority: integer("priority").notNull().default(0), // Higher = preferred for routing
  isDefault: boolean("is_default").notNull().default(false),
  config: text("config"), // JSON for agent-specific settings
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertChatAgentSchema = createInsertSchema(chatAgents).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertChatAgent = z.infer<typeof insertChatAgentSchema>;
export type ChatAgent = typeof chatAgents.$inferSelect;

// ============================================
// KNOWLEDGE BASE
// ============================================

export const knowledgeStatusEnum = pgEnum('knowledge_status', ['draft', 'published', 'archived']);

export const knowledgeCategories = pgTable("knowledge_categories", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 50 }),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertKnowledgeCategorySchema = createInsertSchema(knowledgeCategories).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertKnowledgeCategory = z.infer<typeof insertKnowledgeCategorySchema>;
export type KnowledgeCategory = typeof knowledgeCategories.$inferSelect;

export const knowledgeArticles = pgTable("knowledge_articles", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  categoryId: varchar("category_id", { length: 255 }).references(() => knowledgeCategories.id),
  title: varchar("title", { length: 255 }).notNull(),
  summary: text("summary"),
  content: text("content").notNull(),
  keywords: text("keywords"), // JSON array for search optimization
  status: knowledgeStatusEnum("status").notNull().default('draft'),
  agentTypes: text("agent_types"), // JSON array of agent types that can use this article
  viewCount: integer("view_count").notNull().default(0),
  helpfulCount: integer("helpful_count").notNull().default(0),
  createdBy: varchar("created_by", { length: 255 }).references(() => users.id),
  updatedBy: varchar("updated_by", { length: 255 }).references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertKnowledgeArticleSchema = createInsertSchema(knowledgeArticles).omit({ id: true, createdAt: true, updatedAt: true, viewCount: true, helpfulCount: true });
export type InsertKnowledgeArticle = z.infer<typeof insertKnowledgeArticleSchema>;
export type KnowledgeArticle = typeof knowledgeArticles.$inferSelect;

// ============================================
// CHAT
// ============================================

export const chatSessions = pgTable("chat_sessions", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).references(() => users.id),
  guestName: varchar("guest_name", { length: 255 }),
  guestEmail: varchar("guest_email", { length: 255 }),
  currentAgentId: varchar("current_agent_id", { length: 255 }).references(() => chatAgents.id),
  status: varchar("status", { length: 50 }).notNull().default('active'), // active, closed
  context: text("context"), // JSON for session context (workflow state, etc.)
  lastMessageAt: timestamp("last_message_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertChatSessionSchema = createInsertSchema(chatSessions).omit({ id: true, createdAt: true });
export type InsertChatSession = z.infer<typeof insertChatSessionSchema>;
export type ChatSession = typeof chatSessions.$inferSelect;

export const chatMessages = pgTable("chat_messages", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id", { length: 255 }).notNull().references(() => chatSessions.id),
  agentId: varchar("agent_id", { length: 255 }).references(() => chatAgents.id),
  sender: chatMessageSenderEnum("sender").notNull(),
  content: text("content").notNull(),
  intent: varchar("intent", { length: 100 }), // Detected intent category
  confidence: decimal("confidence", { precision: 5, scale: 4 }), // AI confidence score
  metadata: text("metadata"), // JSON for extra data
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({ id: true, createdAt: true });
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

// Chat Agent Workflows - For multi-step processes like registration/KYC
export const chatWorkflowStatusEnum = pgEnum('chat_workflow_status', ['active', 'completed', 'abandoned', 'paused']);

export const chatAgentWorkflows = pgTable("chat_agent_workflows", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id", { length: 255 }).notNull().references(() => chatSessions.id),
  agentId: varchar("agent_id", { length: 255 }).notNull().references(() => chatAgents.id),
  userId: varchar("user_id", { length: 255 }).references(() => users.id),
  workflowType: varchar("workflow_type", { length: 100 }).notNull(), // 'registration', 'kyc', 'support_ticket'
  currentStep: varchar("current_step", { length: 100 }).notNull(),
  totalSteps: integer("total_steps").notNull().default(1),
  completedSteps: integer("completed_steps").notNull().default(0),
  stepData: text("step_data"), // JSON for collected data per step
  status: chatWorkflowStatusEnum("status").notNull().default('active'),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertChatAgentWorkflowSchema = createInsertSchema(chatAgentWorkflows).omit({ id: true, startedAt: true, updatedAt: true });
export type InsertChatAgentWorkflow = z.infer<typeof insertChatAgentWorkflowSchema>;
export type ChatAgentWorkflow = typeof chatAgentWorkflows.$inferSelect;

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
// SYSTEM LOGS (for health monitoring)
// ============================================

export const systemLogLevelEnum = pgEnum('system_log_level', ['info', 'warn', 'error', 'debug']);

export const systemLogs = pgTable("system_logs", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  level: systemLogLevelEnum("level").notNull().default('info'),
  source: varchar("source", { length: 100 }).notNull(), // 'api', 'worker', 'cron', 'webhook'
  requestId: varchar("request_id", { length: 255 }),
  route: varchar("route", { length: 255 }),
  action: varchar("action", { length: 255 }),
  message: text("message").notNull(),
  details: text("details"), // JSON string for extra context
  errorStack: text("error_stack"),
  durationMs: integer("duration_ms"),
  userId: varchar("user_id", { length: 255 }),
  ipAddress: varchar("ip_address", { length: 100 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSystemLogSchema = createInsertSchema(systemLogs).omit({ id: true, createdAt: true });
export type InsertSystemLog = z.infer<typeof insertSystemLogSchema>;
export type SystemLog = typeof systemLogs.$inferSelect;

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

// CMS Labels - Editable UI labels for buttons, cards, etc.
export const cmsLabels = pgTable("cms_labels", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key", { length: 255 }).notNull().unique(),
  value: text("value").notNull(),
  defaultValue: text("default_value"),
  category: varchar("category", { length: 100 }).notNull(),
  description: text("description"),
  updatedBy: varchar("updated_by", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCmsLabelSchema = createInsertSchema(cmsLabels).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCmsLabel = z.infer<typeof insertCmsLabelSchema>;
export type CmsLabel = typeof cmsLabels.$inferSelect;

// ============================================
// EMAIL NOTIFICATION SETTINGS
// ============================================

export const emailNotificationSettings = pgTable("email_notification_settings", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  notificationType: varchar("notification_type", { length: 100 }).notNull().unique(),
  displayName: varchar("display_name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }).notNull(), // auth, transactions, kyc, bnsl, trade_finance, system
  isEnabled: boolean("is_enabled").notNull().default(true),
  templateSlug: varchar("template_slug", { length: 255 }), // Reference to email template
  displayOrder: integer("display_order").notNull().default(0),
  updatedBy: varchar("updated_by", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertEmailNotificationSettingSchema = createInsertSchema(emailNotificationSettings).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEmailNotificationSetting = z.infer<typeof insertEmailNotificationSettingSchema>;
export type EmailNotificationSetting = typeof emailNotificationSettings.$inferSelect;

// ============================================
// EMAIL LOGS (Sent Email History)
// ============================================

export const emailLogStatusEnum = pgEnum('email_log_status', ['Queued', 'Sending', 'Sent', 'Failed', 'Bounced']);

export const emailLogs = pgTable("email_logs", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).references(() => users.id),
  recipientEmail: varchar("recipient_email", { length: 255 }).notNull(),
  recipientName: varchar("recipient_name", { length: 255 }),
  notificationType: varchar("notification_type", { length: 100 }).notNull(),
  templateSlug: varchar("template_slug", { length: 255 }),
  subject: varchar("subject", { length: 500 }).notNull(),
  status: emailLogStatusEnum("status").notNull().default('Queued'),
  messageId: varchar("message_id", { length: 255 }), // SMTP message ID
  errorMessage: text("error_message"),
  metadata: json("metadata").$type<Record<string, any>>(), // Additional context like transaction ID, etc.
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertEmailLogSchema = createInsertSchema(emailLogs).omit({ id: true, createdAt: true });
export type InsertEmailLog = z.infer<typeof insertEmailLogSchema>;
export type EmailLog = typeof emailLogs.$inferSelect;

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

export const peerTransferStatusEnum = pgEnum('peer_transfer_status', ['Pending', 'Completed', 'Rejected', 'Expired', 'Failed', 'Reversed']);
export const peerTransferChannelEnum = pgEnum('peer_transfer_channel', ['email', 'finatrades_id', 'qr_code']);

export const peerTransfers = pgTable("peer_transfers", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  referenceNumber: varchar("reference_number", { length: 100 }).notNull().unique(),
  senderId: varchar("sender_id", { length: 255 }).notNull().references(() => users.id),
  recipientId: varchar("recipient_id", { length: 255 }).references(() => users.id), // Nullable for invitation transfers
  amountUsd: decimal("amount_usd", { precision: 18, scale: 2 }).notNull(),
  amountGold: decimal("amount_gold", { precision: 18, scale: 6 }), // Gold amount for gold transfers
  goldPriceUsdPerGram: decimal("gold_price_usd_per_gram", { precision: 12, scale: 2 }), // Gold price at time of transfer
  channel: peerTransferChannelEnum("channel").notNull(), // How the transfer was initiated
  recipientIdentifier: varchar("recipient_identifier", { length: 255 }).notNull(), // email, finatrades_id, or qr token
  memo: text("memo"),
  status: peerTransferStatusEnum("status").notNull().default('Completed'),
  requiresApproval: boolean("requires_approval").notNull().default(false), // Whether recipient needs to accept
  isInvite: boolean("is_invite").notNull().default(false), // True if recipient is not registered yet
  invitationToken: varchar("invitation_token", { length: 255 }), // Token for invitation-based claim
  senderReferralCode: varchar("sender_referral_code", { length: 100 }), // Sender's referral code for new user registration
  senderTransactionId: varchar("sender_transaction_id", { length: 255 }).references(() => transactions.id),
  recipientTransactionId: varchar("recipient_transaction_id", { length: 255 }).references(() => transactions.id),
  expiresAt: timestamp("expires_at"), // When pending transfer expires (auto-reject)
  respondedAt: timestamp("responded_at"), // When recipient accepted/rejected
  rejectionReason: text("rejection_reason"), // Optional reason for rejection
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPeerTransferSchema = createInsertSchema(peerTransfers).omit({ id: true, createdAt: true, updatedAt: true });
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
  amountGold: decimal("amount_gold", { precision: 18, scale: 6 }), // Gold amount for gold requests
  assetType: varchar("asset_type", { length: 20 }).notNull().default('GOLD'), // GOLD or USD
  memo: text("memo"),
  qrPayload: varchar("qr_payload", { length: 500 }), // Unique token for QR code requests
  status: peerRequestStatusEnum("status").notNull().default('Pending'),
  fulfilledTransferId: varchar("fulfilled_transfer_id", { length: 255 }).references(() => peerTransfers.id),
  declineReason: text("decline_reason"), // Optional reason for declining
  expiresAt: timestamp("expires_at"),
  respondedAt: timestamp("responded_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPeerRequestSchema = createInsertSchema(peerRequests).omit({ id: true, createdAt: true, updatedAt: true });
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
  'Awaiting3DS',  // Awaiting 3D Secure authentication
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
  bankAccounts: json("bank_accounts").$type<{
    id: string;
    bankName: string;
    bankAddress: string;
    accountHolderName: string;
    accountNumber: string;
    routingNumber: string;
    swiftCode: string;
    iban: string;
    currency: string;
    isActive: boolean;
  }[]>().default([]),
  bankInstructions: text("bank_instructions"),
  
  // Crypto Payment (Binance Pay) - already exists separately
  binancePayEnabled: boolean("binance_pay_enabled").notNull().default(false),
  
  // NGenius (Card Payments) Configuration
  ngeniusEnabled: boolean("ngenius_enabled").notNull().default(false),
  ngeniusApiKey: text("ngenius_api_key"),
  ngeniusOutletRef: varchar("ngenius_outlet_ref", { length: 100 }),
  ngeniusRealmName: varchar("ngenius_realm_name", { length: 100 }), // Tenant realm name for authentication
  ngeniusMode: varchar("ngenius_mode", { length: 20 }).default('sandbox'), // 'sandbox' or 'live'
  ngeniusFeePercent: decimal("ngenius_fee_percent", { precision: 5, scale: 2 }).default('2.5'),
  ngeniusFixedFee: decimal("ngenius_fixed_fee", { precision: 10, scale: 2 }).default('0.30'),
  
  // Gold Price API Configuration
  metalsApiEnabled: boolean("metals_api_enabled").notNull().default(false),
  metalsApiKey: text("metals_api_key"),
  metalsApiProvider: varchar("metals_api_provider", { length: 50 }).default('metals-api'), // 'metals-api', 'gold-api'
  metalsApiCacheDuration: integer("metals_api_cache_duration").default(5), // minutes
  goldPriceMarkupPercent: decimal("gold_price_markup_percent", { precision: 5, scale: 2 }).default('0'), // % markup on gold price
  
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
  otpOnPeerRequest: boolean("otp_on_peer_request").notNull().default(true),
  otpOnAccountDeletion: boolean("otp_on_account_deletion").notNull().default(true),
  
  // Admin Approval OTP Requirements
  adminOtpEnabled: boolean("admin_otp_enabled").notNull().default(true),
  adminOtpOnKycApproval: boolean("admin_otp_on_kyc_approval").notNull().default(true),
  adminOtpOnDepositApproval: boolean("admin_otp_on_deposit_approval").notNull().default(true),
  adminOtpOnWithdrawalApproval: boolean("admin_otp_on_withdrawal_approval").notNull().default(true),
  adminOtpOnBnslApproval: boolean("admin_otp_on_bnsl_approval").notNull().default(true),
  adminOtpOnTradeCaseApproval: boolean("admin_otp_on_trade_case_approval").notNull().default(true),
  adminOtpOnUserSuspension: boolean("admin_otp_on_user_suspension").notNull().default(true),
  adminOtpOnVaultDepositApproval: boolean("admin_otp_on_vault_deposit_approval").notNull().default(true),
  adminOtpOnVaultWithdrawalApproval: boolean("admin_otp_on_vault_withdrawal_approval").notNull().default(true),
  adminOtpOnTransactionApproval: boolean("admin_otp_on_transaction_approval").notNull().default(true),
  
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
// TRANSACTION PIN
// ============================================

export const transactionPins = pgTable("transaction_pins", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id).unique(),
  hashedPin: text("hashed_pin").notNull(),
  failedAttempts: integer("failed_attempts").notNull().default(0),
  lockedUntil: timestamp("locked_until"),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTransactionPinSchema = createInsertSchema(transactionPins).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTransactionPin = z.infer<typeof insertTransactionPinSchema>;
export type TransactionPin = typeof transactionPins.$inferSelect;

// Transaction PIN verification tokens (short-lived tokens after successful PIN entry)
export const pinVerificationTokens = pgTable("pin_verification_tokens", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  token: varchar("token", { length: 255 }).notNull().unique(),
  action: varchar("action", { length: 100 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPinVerificationTokenSchema = createInsertSchema(pinVerificationTokens).omit({ id: true, createdAt: true });
export type InsertPinVerificationToken = z.infer<typeof insertPinVerificationTokenSchema>;
export type PinVerificationToken = typeof pinVerificationTokens.$inferSelect;

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

// ============================================
// USER NOTIFICATIONS
// ============================================

export const notificationTypeEnum = pgEnum('notification_type', [
  'info', 'success', 'warning', 'error', 'transaction', 'kyc', 'bnsl', 'trade', 'system'
]);

export const notifications = pgTable("notifications", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  type: notificationTypeEnum("type").notNull().default('info'),
  link: varchar("link", { length: 500 }), // Optional link to related page
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// ============================================
// USER PREFERENCES
// ============================================

export const userPreferences = pgTable("user_preferences", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id).unique(),
  // Notification preferences
  emailNotifications: boolean("email_notifications").notNull().default(true),
  pushNotifications: boolean("push_notifications").notNull().default(true),
  transactionAlerts: boolean("transaction_alerts").notNull().default(true),
  priceAlerts: boolean("price_alerts").notNull().default(true),
  securityAlerts: boolean("security_alerts").notNull().default(true),
  marketingEmails: boolean("marketing_emails").notNull().default(false),
  // Display preferences
  displayCurrency: varchar("display_currency", { length: 10 }).notNull().default('USD'),
  language: varchar("language", { length: 10 }).notNull().default('en'),
  theme: varchar("theme", { length: 20 }).notNull().default('system'),
  compactMode: boolean("compact_mode").notNull().default(false),
  // Privacy preferences
  showBalance: boolean("show_balance").notNull().default(true),
  twoFactorReminder: boolean("two_factor_reminder").notNull().default(true),
  // Transfer preferences
  requireTransferApproval: boolean("require_transfer_approval").notNull().default(false), // Require accept/reject for incoming transfers
  transferApprovalTimeout: integer("transfer_approval_timeout").notNull().default(24), // Hours before auto-accept (0 = no auto-accept)
  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserPreferencesSchema = createInsertSchema(userPreferences).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;
export type UserPreferences = typeof userPreferences.$inferSelect;

// ============================================
// PUSH NOTIFICATION DEVICE TOKENS
// ============================================

export const devicePlatformEnum = pgEnum('device_platform', [
  'ios', 'android', 'web'
]);

export const pushDeviceTokens = pgTable("push_device_tokens", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  token: text("token").notNull(),
  platform: devicePlatformEnum("platform").notNull(),
  deviceName: varchar("device_name", { length: 255 }),
  deviceId: varchar("device_id", { length: 255 }),
  isActive: boolean("is_active").notNull().default(true),
  lastUsedAt: timestamp("last_used_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPushDeviceTokenSchema = createInsertSchema(pushDeviceTokens).omit({ id: true, createdAt: true, lastUsedAt: true });
export type InsertPushDeviceToken = z.infer<typeof insertPushDeviceTokenSchema>;
export type PushDeviceToken = typeof pushDeviceTokens.$inferSelect;

// ============================================
// CRYPTO WALLET CONFIGURATIONS (Admin managed)
// ============================================

export const cryptoNetworkEnum = pgEnum('crypto_network', [
  'Bitcoin', 'Ethereum', 'USDT_TRC20', 'USDT_ERC20', 'USDC', 'BNB', 'Solana', 'Polygon', 'Other'
]);

export const cryptoWalletConfigs = pgTable("crypto_wallet_configs", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  network: cryptoNetworkEnum("network").notNull(),
  networkLabel: varchar("network_label", { length: 100 }).notNull(), // Display name like "Bitcoin (BTC)"
  walletAddress: text("wallet_address").notNull(),
  memo: varchar("memo", { length: 255 }), // Optional memo/tag for some networks
  instructions: text("instructions"), // Optional instructions for users
  qrCodeImage: text("qr_code_image"), // Base64 encoded QR code image for users to scan
  isActive: boolean("is_active").notNull().default(true),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCryptoWalletConfigSchema = createInsertSchema(cryptoWalletConfigs).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCryptoWalletConfig = z.infer<typeof insertCryptoWalletConfigSchema>;
export type CryptoWalletConfig = typeof cryptoWalletConfigs.$inferSelect;

// ============================================
// CRYPTO PAYMENT REQUESTS (Manual payments)
// ============================================

export const cryptoPaymentStatusEnum = pgEnum('crypto_payment_status', [
  'Pending', 'Under Review', 'Approved', 'Rejected', 'Credited', 'Expired', 'Cancelled'
]);

export const cryptoPaymentRequests = pgTable("crypto_payment_requests", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  walletConfigId: varchar("wallet_config_id", { length: 255 }).notNull().references(() => cryptoWalletConfigs.id),
  amountUsd: decimal("amount_usd", { precision: 18, scale: 2 }).notNull(),
  goldGrams: decimal("gold_grams", { precision: 18, scale: 8 }).notNull(),
  goldPriceAtTime: decimal("gold_price_at_time", { precision: 18, scale: 2 }).notNull(), // Lock the price at time of request
  cryptoAmount: varchar("crypto_amount", { length: 100 }), // Expected crypto amount (optional)
  transactionHash: varchar("transaction_hash", { length: 255 }), // User submits their tx hash
  proofImageUrl: text("proof_image_url"), // Screenshot/proof upload
  status: cryptoPaymentStatusEnum("status").notNull().default('Pending'),
  reviewerId: varchar("reviewer_id", { length: 255 }).references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  rejectionReason: text("rejection_reason"),
  creditedTransactionId: varchar("credited_transaction_id", { length: 255 }), // Reference to transaction when credited
  expiresAt: timestamp("expires_at"), // Optional expiry for pending payments
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCryptoPaymentRequestSchema = createInsertSchema(cryptoPaymentRequests).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCryptoPaymentRequest = z.infer<typeof insertCryptoPaymentRequestSchema>;
export type CryptoPaymentRequest = typeof cryptoPaymentRequests.$inferSelect;

// ============================================
// BUY GOLD REQUESTS (Manual via Wingold & Metals)
// ============================================

export const buyGoldStatusEnum = pgEnum('buy_gold_status', [
  'Pending', 'Under Review', 'Approved', 'Rejected', 'Credited', 'Cancelled'
]);

export const buyGoldRequests = pgTable("buy_gold_requests", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  amountUsd: decimal("amount_usd", { precision: 18, scale: 2 }),
  goldGrams: decimal("gold_grams", { precision: 18, scale: 8 }),
  goldPriceAtTime: decimal("gold_price_at_time", { precision: 18, scale: 2 }),
  wingoldReferenceId: varchar("wingold_reference_id", { length: 255 }),
  receiptFileUrl: text("receipt_file_url").notNull(),
  receiptFileName: varchar("receipt_file_name", { length: 255 }),
  status: buyGoldStatusEnum("status").notNull().default('Pending'),
  reviewerId: varchar("reviewer_id", { length: 255 }).references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  rejectionReason: text("rejection_reason"),
  creditedTransactionId: varchar("credited_transaction_id", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertBuyGoldRequestSchema = createInsertSchema(buyGoldRequests).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBuyGoldRequest = z.infer<typeof insertBuyGoldRequestSchema>;
export type BuyGoldRequest = typeof buyGoldRequests.$inferSelect;

// ============================================
// CENTRALIZED PLATFORM CONFIGURATION
// ============================================

export const platformConfigCategoryEnum = pgEnum('platform_config_category', [
  'gold_pricing', 'transaction_limits', 'deposit_limits', 'withdrawal_limits',
  'p2p_limits', 'bnsl_settings', 'finabridge_settings', 'payment_fees',
  'kyc_settings', 'system_settings', 'vault_settings', 'referral_settings',
  'terms_conditions'
]);

export const platformConfig = pgTable("platform_config", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  category: platformConfigCategoryEnum("category").notNull(),
  configKey: varchar("config_key", { length: 100 }).notNull().unique(),
  configValue: text("config_value").notNull(),
  configType: varchar("config_type", { length: 50 }).notNull().default('string'), // 'string', 'number', 'boolean', 'json'
  displayName: varchar("display_name", { length: 255 }).notNull(),
  description: text("description"),
  displayOrder: integer("display_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  updatedBy: varchar("updated_by", { length: 255 }).references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPlatformConfigSchema = createInsertSchema(platformConfig).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPlatformConfig = z.infer<typeof insertPlatformConfigSchema>;
export type PlatformConfig = typeof platformConfig.$inferSelect;

// ============================================
// GEO RESTRICTIONS (IP-based cross-border restrictions)
// ============================================

export const geoRestrictions = pgTable("geo_restrictions", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  countryCode: varchar("country_code", { length: 2 }).notNull().unique(), // ISO 3166-1 alpha-2
  countryName: varchar("country_name", { length: 100 }).notNull(),
  isRestricted: boolean("is_restricted").notNull().default(true),
  restrictionMessage: text("restriction_message"), // Custom message for this country
  allowRegistration: boolean("allow_registration").notNull().default(false),
  allowLogin: boolean("allow_login").notNull().default(false),
  allowTransactions: boolean("allow_transactions").notNull().default(false),
  reason: text("reason"), // Internal note for why restricted
  updatedBy: varchar("updated_by", { length: 255 }).references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertGeoRestrictionSchema = createInsertSchema(geoRestrictions).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertGeoRestriction = z.infer<typeof insertGeoRestrictionSchema>;
export type GeoRestriction = typeof geoRestrictions.$inferSelect;

// Global geo restriction settings
export const geoRestrictionSettings = pgTable("geo_restriction_settings", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  isEnabled: boolean("is_enabled").notNull().default(false),
  defaultMessage: text("default_message").notNull().default('Our services are not available in your region. Please contact support for more information.'),
  showNoticeOnLanding: boolean("show_notice_on_landing").notNull().default(true),
  blockAccess: boolean("block_access").notNull().default(false), // If true, block access completely
  updatedBy: varchar("updated_by", { length: 255 }).references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertGeoRestrictionSettingsSchema = createInsertSchema(geoRestrictionSettings).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertGeoRestrictionSettings = z.infer<typeof insertGeoRestrictionSettingsSchema>;
export type GeoRestrictionSettings = typeof geoRestrictionSettings.$inferSelect;

// ============================================
// DATABASE BACKUPS
// ============================================

export const backupStatusEnum = pgEnum('backup_status', ['In Progress', 'Success', 'Failed']);
export const backupTypeEnum = pgEnum('backup_type', ['manual', 'scheduled', 'pre_restore']);

export const databaseBackups = pgTable("database_backups", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  backupType: backupTypeEnum("backup_type").notNull().default('manual'),
  fileName: varchar("file_name", { length: 500 }).notNull(),
  filePath: text("file_path").notNull(),
  fileSizeBytes: integer("file_size_bytes"),
  status: backupStatusEnum("status").notNull().default('In Progress'),
  errorMessage: text("error_message"),
  checksum: varchar("checksum", { length: 64 }),
  isEncrypted: boolean("is_encrypted").notNull().default(true),
  isCompressed: boolean("is_compressed").notNull().default(true),
  tablesIncluded: integer("tables_included"),
  totalRows: integer("total_rows"),
  createdBy: varchar("created_by", { length: 255 }).references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertDatabaseBackupSchema = createInsertSchema(databaseBackups).omit({ id: true, createdAt: true });
export type InsertDatabaseBackup = z.infer<typeof insertDatabaseBackupSchema>;
export type DatabaseBackup = typeof databaseBackups.$inferSelect;

// ============================================
// BACKUP AUDIT LOGS (Separate from main audit for security)
// ============================================

export const backupActionEnum = pgEnum('backup_action', ['BACKUP_CREATE', 'BACKUP_DOWNLOAD', 'BACKUP_RESTORE', 'BACKUP_DELETE']);

export const backupAuditLogs = pgTable("backup_audit_logs", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  action: backupActionEnum("action").notNull(),
  backupId: varchar("backup_id", { length: 255 }).references(() => databaseBackups.id),
  actorAdminId: varchar("actor_admin_id", { length: 255 }).references(() => users.id),
  actorEmail: varchar("actor_email", { length: 255 }),
  ipAddress: varchar("ip_address", { length: 100 }),
  userAgent: text("user_agent"),
  result: varchar("result", { length: 50 }).notNull(),
  errorMessage: text("error_message"),
  metadata: json("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBackupAuditLogSchema = createInsertSchema(backupAuditLogs).omit({ id: true, createdAt: true });
export type InsertBackupAuditLog = z.infer<typeof insertBackupAuditLogSchema>;
export type BackupAuditLog = typeof backupAuditLogs.$inferSelect;

// ============================================
// FINAVAULT - PHYSICAL DELIVERY REQUESTS
// ============================================

export const physicalDeliveryStatusEnum = pgEnum('physical_delivery_status', [
  'Pending', 'Processing', 'Shipped', 'In Transit', 'Delivered', 'Cancelled', 'Failed'
]);

export const physicalDeliveryRequests = pgTable("physical_delivery_requests", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  referenceNumber: varchar("reference_number", { length: 50 }).notNull().unique(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  goldGrams: decimal("gold_grams", { precision: 18, scale: 6 }).notNull(),
  goldPriceUsdPerGram: decimal("gold_price_usd_per_gram", { precision: 18, scale: 6 }).notNull(),
  deliveryAddress: text("delivery_address").notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  country: varchar("country", { length: 100 }).notNull(),
  postalCode: varchar("postal_code", { length: 20 }),
  phone: varchar("phone", { length: 50 }).notNull(),
  specialInstructions: text("special_instructions"),
  deliveryMethod: varchar("delivery_method", { length: 50 }).default('Insured Courier'),
  estimatedDeliveryDays: integer("estimated_delivery_days"),
  shippingFeeUsd: decimal("shipping_fee_usd", { precision: 18, scale: 2 }).default('0'),
  insuranceFeeUsd: decimal("insurance_fee_usd", { precision: 18, scale: 2 }).default('0'),
  status: varchar("status", { length: 50 }).notNull().default('Pending'),
  trackingNumber: varchar("tracking_number", { length: 100 }),
  courierName: varchar("courier_name", { length: 100 }),
  shippedAt: timestamp("shipped_at"),
  deliveredAt: timestamp("delivered_at"),
  adminNotes: text("admin_notes"),
  processedBy: varchar("processed_by", { length: 255 }).references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPhysicalDeliveryRequestSchema = createInsertSchema(physicalDeliveryRequests).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPhysicalDeliveryRequest = z.infer<typeof insertPhysicalDeliveryRequestSchema>;
export type PhysicalDeliveryRequest = typeof physicalDeliveryRequests.$inferSelect;

// ============================================
// FINAVAULT - GOLD BAR INVENTORY
// ============================================

export const goldBarStatusEnum = pgEnum('gold_bar_status', [
  'Available', 'Allocated', 'Reserved', 'In Transit', 'Delivered'
]);

export const goldBars = pgTable("gold_bars", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  serialNumber: varchar("serial_number", { length: 100 }).notNull().unique(),
  weightGrams: decimal("weight_grams", { precision: 18, scale: 6 }).notNull(),
  purity: varchar("purity", { length: 10 }).notNull().default('999.9'),
  refiner: varchar("refiner", { length: 100 }).notNull(),
  vaultLocation: varchar("vault_location", { length: 100 }).notNull(),
  zone: varchar("zone", { length: 50 }),
  status: varchar("status", { length: 50 }).notNull().default('Available'),
  allocatedToUserId: varchar("allocated_to_user_id", { length: 255 }).references(() => users.id),
  allocatedAt: timestamp("allocated_at"),
  purchasePricePerGram: decimal("purchase_price_per_gram", { precision: 18, scale: 6 }),
  purchaseDate: date("purchase_date"),
  assayCertificateUrl: text("assay_certificate_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertGoldBarSchema = createInsertSchema(goldBars).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertGoldBar = z.infer<typeof insertGoldBarSchema>;
export type GoldBar = typeof goldBars.$inferSelect;

// ============================================
// FINAVAULT - STORAGE FEES
// ============================================

export const storageFeeStatusEnum = pgEnum('storage_fee_status', [
  'Pending', 'Paid', 'Overdue', 'Waived'
]);

export const storageFees = pgTable("storage_fees", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  billingPeriodStart: date("billing_period_start").notNull(),
  billingPeriodEnd: date("billing_period_end").notNull(),
  averageGoldGrams: decimal("average_gold_grams", { precision: 18, scale: 6 }).notNull(),
  feeRatePercent: decimal("fee_rate_percent", { precision: 5, scale: 4 }).notNull(),
  feeAmountUsd: decimal("fee_amount_usd", { precision: 18, scale: 2 }).notNull(),
  feeAmountGoldGrams: decimal("fee_amount_gold_grams", { precision: 18, scale: 6 }),
  status: varchar("status", { length: 50 }).notNull().default('Pending'),
  paidAt: timestamp("paid_at"),
  paymentMethod: varchar("payment_method", { length: 50 }),
  transactionId: varchar("transaction_id", { length: 255 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertStorageFeeSchema = createInsertSchema(storageFees).omit({ id: true, createdAt: true });
export type InsertStorageFee = z.infer<typeof insertStorageFeeSchema>;
export type StorageFee = typeof storageFees.$inferSelect;

// ============================================
// FINAVAULT - VAULT LOCATIONS
// ============================================

export const vaultLocations = pgTable("vault_locations", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull().unique(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  country: varchar("country", { length: 100 }).notNull(),
  timezone: varchar("timezone", { length: 50 }),
  capacityKg: decimal("capacity_kg", { precision: 18, scale: 2 }),
  currentHoldingsKg: decimal("current_holdings_kg", { precision: 18, scale: 2 }).default('0'),
  insuranceProvider: varchar("insurance_provider", { length: 100 }),
  insurancePolicyNumber: varchar("insurance_policy_number", { length: 100 }),
  insuranceCoverageUsd: decimal("insurance_coverage_usd", { precision: 18, scale: 2 }),
  securityLevel: varchar("security_level", { length: 50 }).default('High'),
  isActive: boolean("is_active").default(true),
  operatingHours: text("operating_hours"),
  contactEmail: varchar("contact_email", { length: 255 }),
  contactPhone: varchar("contact_phone", { length: 50 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertVaultLocationSchema = createInsertSchema(vaultLocations).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertVaultLocation = z.infer<typeof insertVaultLocationSchema>;
export type VaultLocation = typeof vaultLocations.$inferSelect;

// ============================================
// FINAVAULT - VAULT TRANSFERS
// ============================================

export const vaultTransferStatusEnum = pgEnum('vault_transfer_status', [
  'Pending', 'Approved', 'In Transit', 'Completed', 'Rejected', 'Cancelled'
]);

export const vaultTransfers = pgTable("vault_transfers", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  referenceNumber: varchar("reference_number", { length: 50 }).notNull().unique(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  goldGrams: decimal("gold_grams", { precision: 18, scale: 6 }).notNull(),
  fromLocation: varchar("from_location", { length: 100 }).notNull(),
  toLocation: varchar("to_location", { length: 100 }).notNull(),
  transferFeeUsd: decimal("transfer_fee_usd", { precision: 18, scale: 2 }).default('0'),
  reason: text("reason"),
  status: varchar("status", { length: 50 }).notNull().default('Pending'),
  approvedBy: varchar("approved_by", { length: 255 }).references(() => users.id),
  approvedAt: timestamp("approved_at"),
  completedAt: timestamp("completed_at"),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertVaultTransferSchema = createInsertSchema(vaultTransfers).omit({ id: true, createdAt: true });
export type InsertVaultTransfer = z.infer<typeof insertVaultTransferSchema>;
export type VaultTransfer = typeof vaultTransfers.$inferSelect;

// ============================================
// FINAVAULT - GOLD GIFTS
// ============================================

export const goldGiftStatusEnum = pgEnum('gold_gift_status', [
  'Pending', 'Sent', 'Claimed', 'Expired', 'Cancelled'
]);

export const goldGifts = pgTable("gold_gifts", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  referenceNumber: varchar("reference_number", { length: 50 }).notNull().unique(),
  senderUserId: varchar("sender_user_id", { length: 255 }).notNull().references(() => users.id),
  recipientUserId: varchar("recipient_user_id", { length: 255 }).references(() => users.id),
  recipientEmail: varchar("recipient_email", { length: 255 }),
  recipientPhone: varchar("recipient_phone", { length: 50 }),
  goldGrams: decimal("gold_grams", { precision: 18, scale: 6 }).notNull(),
  goldPriceUsdPerGram: decimal("gold_price_usd_per_gram", { precision: 18, scale: 6 }).notNull(),
  message: text("message"),
  occasion: varchar("occasion", { length: 100 }),
  giftCertificateUrl: text("gift_certificate_url"),
  status: varchar("status", { length: 50 }).notNull().default('Pending'),
  claimedAt: timestamp("claimed_at"),
  expiresAt: timestamp("expires_at"),
  senderTransactionId: varchar("sender_transaction_id", { length: 255 }),
  recipientTransactionId: varchar("recipient_transaction_id", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertGoldGiftSchema = createInsertSchema(goldGifts).omit({ id: true, createdAt: true });
export type InsertGoldGift = z.infer<typeof insertGoldGiftSchema>;
export type GoldGift = typeof goldGifts.$inferSelect;

// ============================================
// FINAVAULT - INSURANCE CERTIFICATES
// ============================================

export const insuranceCertificates = pgTable("insurance_certificates", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  certificateNumber: varchar("certificate_number", { length: 50 }).notNull().unique(),
  vaultLocation: varchar("vault_location", { length: 100 }).notNull(),
  goldGrams: decimal("gold_grams", { precision: 18, scale: 6 }).notNull(),
  coverageAmountUsd: decimal("coverage_amount_usd", { precision: 18, scale: 2 }).notNull(),
  premiumUsd: decimal("premium_usd", { precision: 18, scale: 2 }),
  insurerName: varchar("insurer_name", { length: 100 }).notNull(),
  policyNumber: varchar("policy_number", { length: 100 }),
  coverageStart: date("coverage_start").notNull(),
  coverageEnd: date("coverage_end").notNull(),
  certificateUrl: text("certificate_url"),
  status: varchar("status", { length: 50 }).notNull().default('Active'),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertInsuranceCertificateSchema = createInsertSchema(insuranceCertificates).omit({ id: true, createdAt: true });
export type InsertInsuranceCertificate = z.infer<typeof insertInsuranceCertificateSchema>;
export type InsuranceCertificate = typeof insuranceCertificates.$inferSelect;

// ============================================
// FINABRIDGE - SHIPMENT TRACKING
// ============================================

export const tradeShipmentStatusEnum = pgEnum('trade_shipment_status', [
  'Pending', 'Preparing', 'Shipped', 'In Transit', 'Customs Clearance', 'Out for Delivery', 'Delivered', 'Delayed', 'Cancelled'
]);

export const tradeShipments = pgTable("trade_shipments", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  tradeRequestId: varchar("trade_request_id", { length: 255 }).notNull().references(() => tradeRequests.id),
  dealRoomId: varchar("deal_room_id", { length: 255 }).references(() => dealRooms.id),
  
  trackingNumber: varchar("tracking_number", { length: 100 }),
  courierName: varchar("courier_name", { length: 100 }),
  
  status: tradeShipmentStatusEnum("status").notNull().default('Pending'),
  
  estimatedShipDate: timestamp("estimated_ship_date"),
  actualShipDate: timestamp("actual_ship_date"),
  estimatedArrivalDate: timestamp("estimated_arrival_date"),
  actualArrivalDate: timestamp("actual_arrival_date"),
  
  originPort: varchar("origin_port", { length: 255 }),
  destinationPort: varchar("destination_port", { length: 255 }),
  currentLocation: varchar("current_location", { length: 255 }),
  
  customsStatus: varchar("customs_status", { length: 100 }),
  customsClearanceDate: timestamp("customs_clearance_date"),
  customsDocuments: text("customs_documents"),
  
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTradeShipmentSchema = createInsertSchema(tradeShipments).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTradeShipment = z.infer<typeof insertTradeShipmentSchema>;
export type TradeShipment = typeof tradeShipments.$inferSelect;

// Shipment Milestones - tracking each step
export const shipmentMilestones = pgTable("shipment_milestones", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  shipmentId: varchar("shipment_id", { length: 255 }).notNull().references(() => tradeShipments.id),
  
  milestone: varchar("milestone", { length: 100 }).notNull(),
  status: varchar("status", { length: 50 }).notNull().default('pending'),
  location: varchar("location", { length: 255 }),
  description: text("description"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertShipmentMilestoneSchema = createInsertSchema(shipmentMilestones).omit({ id: true, createdAt: true });
export type InsertShipmentMilestone = z.infer<typeof insertShipmentMilestoneSchema>;
export type ShipmentMilestone = typeof shipmentMilestones.$inferSelect;

// ============================================
// FINABRIDGE - TRADE CERTIFICATES
// ============================================

export const tradeCertificateTypeEnum = pgEnum('trade_certificate_type', [
  'Trade Confirmation', 'Settlement Certificate', 'Completion Certificate', 'Insurance Certificate'
]);

export const tradeCertificates = pgTable("trade_certificates", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  tradeRequestId: varchar("trade_request_id", { length: 255 }).notNull().references(() => tradeRequests.id),
  
  certificateNumber: varchar("certificate_number", { length: 50 }).notNull().unique(),
  type: tradeCertificateTypeEnum("type").notNull(),
  
  importerUserId: varchar("importer_user_id", { length: 255 }).notNull().references(() => users.id),
  exporterUserId: varchar("exporter_user_id", { length: 255 }).references(() => users.id),
  
  tradeValueUsd: decimal("trade_value_usd", { precision: 18, scale: 2 }).notNull(),
  settlementGoldGrams: decimal("settlement_gold_grams", { precision: 18, scale: 6 }).notNull(),
  
  goodsDescription: text("goods_description"),
  incoterms: varchar("incoterms", { length: 50 }),
  
  issuedAt: timestamp("issued_at").notNull().defaultNow(),
  validUntil: timestamp("valid_until"),
  
  certificateUrl: text("certificate_url"),
  signedBy: varchar("signed_by", { length: 255 }),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTradeCertificateSchema = createInsertSchema(tradeCertificates).omit({ id: true, createdAt: true });
export type InsertTradeCertificate = z.infer<typeof insertTradeCertificateSchema>;
export type TradeCertificate = typeof tradeCertificates.$inferSelect;

// ============================================
// FINABRIDGE - EXPORTER RATINGS
// ============================================

export const exporterRatings = pgTable("exporter_ratings", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  exporterUserId: varchar("exporter_user_id", { length: 255 }).notNull().references(() => users.id),
  importerUserId: varchar("importer_user_id", { length: 255 }).notNull().references(() => users.id),
  tradeRequestId: varchar("trade_request_id", { length: 255 }).notNull().references(() => tradeRequests.id),
  
  overallRating: integer("overall_rating").notNull(),
  qualityRating: integer("quality_rating"),
  communicationRating: integer("communication_rating"),
  deliveryRating: integer("delivery_rating"),
  
  review: text("review"),
  isVerified: boolean("is_verified").default(false),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertExporterRatingSchema = createInsertSchema(exporterRatings).omit({ id: true, createdAt: true });
export type InsertExporterRating = z.infer<typeof insertExporterRatingSchema>;
export type ExporterRating = typeof exporterRatings.$inferSelect;

// Exporter Trust Score - aggregated stats
export const exporterTrustScores = pgTable("exporter_trust_scores", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  exporterUserId: varchar("exporter_user_id", { length: 255 }).notNull().references(() => users.id).unique(),
  
  totalTrades: integer("total_trades").notNull().default(0),
  completedTrades: integer("completed_trades").notNull().default(0),
  disputedTrades: integer("disputed_trades").notNull().default(0),
  cancelledTrades: integer("cancelled_trades").notNull().default(0),
  
  averageRating: decimal("average_rating", { precision: 3, scale: 2 }).default('0'),
  totalRatings: integer("total_ratings").notNull().default(0),
  
  totalTradeValueUsd: decimal("total_trade_value_usd", { precision: 18, scale: 2 }).default('0'),
  averageDeliveryDays: integer("average_delivery_days"),
  
  trustScore: integer("trust_score").notNull().default(0),
  verificationLevel: varchar("verification_level", { length: 50 }).default('Unverified'),
  verifiedAt: timestamp("verified_at"),
  
  lastTradeAt: timestamp("last_trade_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertExporterTrustScoreSchema = createInsertSchema(exporterTrustScores).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertExporterTrustScore = z.infer<typeof insertExporterTrustScoreSchema>;
export type ExporterTrustScore = typeof exporterTrustScores.$inferSelect;

// ============================================
// FINABRIDGE - TRADE RISK SCORING
// ============================================

export const tradeRiskLevelEnum = pgEnum('trade_risk_level', [
  'Low', 'Medium', 'High', 'Critical'
]);

export const tradeRiskAssessments = pgTable("trade_risk_assessments", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  tradeRequestId: varchar("trade_request_id", { length: 255 }).notNull().references(() => tradeRequests.id),
  
  riskScore: integer("risk_score").notNull(),
  riskLevel: tradeRiskLevelEnum("risk_level").notNull(),
  
  importerKycStatus: varchar("importer_kyc_status", { length: 50 }),
  exporterKycStatus: varchar("exporter_kyc_status", { length: 50 }),
  
  countryRisk: varchar("country_risk", { length: 50 }),
  valueRisk: varchar("value_risk", { length: 50 }),
  exporterHistoryRisk: varchar("exporter_history_risk", { length: 50 }),
  
  riskFactors: json("risk_factors"),
  mitigationNotes: text("mitigation_notes"),
  
  assessedBy: varchar("assessed_by", { length: 255 }).references(() => users.id),
  assessedAt: timestamp("assessed_at").notNull().defaultNow(),
  
  isFlagged: boolean("is_flagged").default(false),
  flagReason: text("flag_reason"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTradeRiskAssessmentSchema = createInsertSchema(tradeRiskAssessments).omit({ id: true, createdAt: true });
export type InsertTradeRiskAssessment = z.infer<typeof insertTradeRiskAssessmentSchema>;
export type TradeRiskAssessment = typeof tradeRiskAssessments.$inferSelect;

// ============================================
// ACCOUNT DELETION REQUESTS
// ============================================

export const accountDeletionStatusEnum = pgEnum('account_deletion_status', [
  'Pending', 'Approved', 'Rejected', 'Cancelled', 'Completed'
]);

export const accountDeletionRequests = pgTable("account_deletion_requests", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  
  reason: text("reason").notNull(),
  additionalComments: text("additional_comments"),
  
  status: accountDeletionStatusEnum("status").notNull().default('Pending'),
  
  requestedAt: timestamp("requested_at").notNull().defaultNow(),
  scheduledDeletionDate: timestamp("scheduled_deletion_date").notNull(),
  
  reviewedBy: varchar("reviewed_by", { length: 255 }).references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  
  cancelledAt: timestamp("cancelled_at"),
  completedAt: timestamp("completed_at"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAccountDeletionRequestSchema = createInsertSchema(accountDeletionRequests).omit({ 
  id: true, createdAt: true, updatedAt: true, reviewedAt: true, cancelledAt: true, completedAt: true 
});
export type InsertAccountDeletionRequest = z.infer<typeof insertAccountDeletionRequestSchema>;
export type AccountDeletionRequest = typeof accountDeletionRequests.$inferSelect;
