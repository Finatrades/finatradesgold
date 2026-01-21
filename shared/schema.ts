


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
// ENTERPRISE ROLE & PERMISSION MANAGEMENT
// ============================================

// Permission actions
export const permissionActionEnum = pgEnum('permission_action', [
  'view', 'create', 'edit', 'approve_l1', 'approve_final', 'reject', 'export', 'delete'
]);

// Approval status
export const approvalStatusEnum = pgEnum('approval_status', [
  'pending_l1', 'pending_final', 'approved', 'rejected', 'expired', 'cancelled'
]);

// Dynamic Roles (Super Admin creates these)
export const adminRoles = pgTable("admin_roles", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  department: varchar("department", { length: 100 }),
  riskLevel: riskLevelEnum("risk_level").notNull().default('Low'),
  isSystem: boolean("is_system").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: varchar("created_by", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAdminRoleSchema = createInsertSchema(adminRoles)
  .omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAdminRole = z.infer<typeof insertAdminRoleSchema>;
export type AdminRole = typeof adminRoles.$inferSelect;

// Admin Components (modular admin sections)
export const adminComponents = pgTable("admin_components", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  category: varchar("category", { length: 100 }).notNull(),
  description: text("description"),
  path: varchar("path", { length: 255 }),
  icon: varchar("icon", { length: 50 }),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAdminComponentSchema = createInsertSchema(adminComponents)
  .omit({ id: true, createdAt: true });
export type InsertAdminComponent = z.infer<typeof insertAdminComponentSchema>;
export type AdminComponent = typeof adminComponents.$inferSelect;

// Role Component Permissions (permission matrix per role per component)
export const roleComponentPermissions = pgTable("role_component_permissions", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  roleId: varchar("role_id", { length: 255 }).notNull().references(() => adminRoles.id, { onDelete: 'cascade' }),
  componentId: varchar("component_id", { length: 255 }).notNull().references(() => adminComponents.id, { onDelete: 'cascade' }),
  canView: boolean("can_view").notNull().default(false),
  canCreate: boolean("can_create").notNull().default(false),
  canEdit: boolean("can_edit").notNull().default(false),
  canApproveL1: boolean("can_approve_l1").notNull().default(false),
  canApproveFinal: boolean("can_approve_final").notNull().default(false),
  canReject: boolean("can_reject").notNull().default(false),
  canExport: boolean("can_export").notNull().default(false),
  canDelete: boolean("can_delete").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertRoleComponentPermissionSchema = createInsertSchema(roleComponentPermissions)
  .omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRoleComponentPermission = z.infer<typeof insertRoleComponentPermissionSchema>;
export type RoleComponentPermission = typeof roleComponentPermissions.$inferSelect;

// User Role Assignments (link users to roles)
export const userRoleAssignments = pgTable("user_role_assignments", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  roleId: varchar("role_id", { length: 255 }).notNull().references(() => adminRoles.id, { onDelete: 'cascade' }),
  assignedBy: varchar("assigned_by", { length: 255 }),
  assignedAt: timestamp("assigned_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertUserRoleAssignmentSchema = createInsertSchema(userRoleAssignments)
  .omit({ id: true, assignedAt: true });
export type InsertUserRoleAssignment = z.infer<typeof insertUserRoleAssignmentSchema>;
export type UserRoleAssignment = typeof userRoleAssignments.$inferSelect;

// Task Definitions (all approvable tasks)
export const taskDefinitions = pgTable("task_definitions", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: text("description"),
  componentId: varchar("component_id", { length: 255 }).references(() => adminComponents.id),
  category: varchar("category", { length: 100 }),
  requiresApproval: boolean("requires_approval").notNull().default(false),
  firstApproverRoleId: varchar("first_approver_role_id", { length: 255 }).references(() => adminRoles.id),
  finalApproverRoleId: varchar("final_approver_role_id", { length: 255 }).references(() => adminRoles.id),
  slaHours: integer("sla_hours").default(24),
  autoExpireHours: integer("auto_expire_hours").default(72),
  requiresReason: boolean("requires_reason").notNull().default(false),
  allowedInitiatorRoles: json("allowed_initiator_roles").$type<string[]>(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTaskDefinitionSchema = createInsertSchema(taskDefinitions)
  .omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTaskDefinition = z.infer<typeof insertTaskDefinitionSchema>;
export type TaskDefinition = typeof taskDefinitions.$inferSelect;

// Approval Queue (pending tasks)
export const approvalQueue = pgTable("approval_queue", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  taskDefinitionId: varchar("task_definition_id", { length: 255 }).notNull().references(() => taskDefinitions.id),
  initiatorId: varchar("initiator_id", { length: 255 }).notNull().references(() => users.id),
  entityType: varchar("entity_type", { length: 100 }),
  entityId: varchar("entity_id", { length: 255 }),
  taskData: json("task_data").$type<Record<string, any>>(),
  status: approvalStatusEnum("status").notNull().default('pending_l1'),
  priority: varchar("priority", { length: 20 }).default('normal'),
  reason: text("reason"),
  l1ApproverId: varchar("l1_approver_id", { length: 255 }).references(() => users.id),
  l1ApprovedAt: timestamp("l1_approved_at"),
  l1Comments: text("l1_comments"),
  finalApproverId: varchar("final_approver_id", { length: 255 }).references(() => users.id),
  finalApprovedAt: timestamp("final_approved_at"),
  finalComments: text("final_comments"),
  rejectedBy: varchar("rejected_by", { length: 255 }).references(() => users.id),
  rejectedAt: timestamp("rejected_at"),
  rejectionReason: text("rejection_reason"),
  expiresAt: timestamp("expires_at"),
  executedAt: timestamp("executed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertApprovalQueueSchema = createInsertSchema(approvalQueue)
  .omit({ id: true, createdAt: true, updatedAt: true });
export type InsertApprovalQueue = z.infer<typeof insertApprovalQueueSchema>;
export type ApprovalQueueItem = typeof approvalQueue.$inferSelect;

// Approval History (audit trail)
export const approvalHistory = pgTable("approval_history", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  approvalQueueId: varchar("approval_queue_id", { length: 255 }).notNull().references(() => approvalQueue.id, { onDelete: 'cascade' }),
  action: varchar("action", { length: 50 }).notNull(),
  actorId: varchar("actor_id", { length: 255 }).notNull().references(() => users.id),
  actorRole: varchar("actor_role", { length: 100 }),
  oldValue: json("old_value").$type<Record<string, any>>(),
  newValue: json("new_value").$type<Record<string, any>>(),
  comments: text("comments"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  sessionId: varchar("session_id", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertApprovalHistorySchema = createInsertSchema(approvalHistory)
  .omit({ id: true, createdAt: true });
export type InsertApprovalHistory = z.infer<typeof insertApprovalHistorySchema>;
export type ApprovalHistoryEntry = typeof approvalHistory.$inferSelect;

// Emergency Overrides (2-approver emergency actions)
export const emergencyOverrides = pgTable("emergency_overrides", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  approvalQueueId: varchar("approval_queue_id", { length: 255 }).references(() => approvalQueue.id),
  reason: text("reason").notNull(),
  approver1Id: varchar("approver1_id", { length: 255 }).notNull().references(() => users.id),
  approver1At: timestamp("approver1_at").notNull().defaultNow(),
  approver2Id: varchar("approver2_id", { length: 255 }).references(() => users.id),
  approver2At: timestamp("approver2_at"),
  status: varchar("status", { length: 50 }).notNull().default('pending_second'),
  executedAt: timestamp("executed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertEmergencyOverrideSchema = createInsertSchema(emergencyOverrides)
  .omit({ id: true, createdAt: true });
export type InsertEmergencyOverride = z.infer<typeof insertEmergencyOverrideSchema>;
export type EmergencyOverride = typeof emergencyOverrides.$inferSelect;

// Admin Component Actions Enum (for permission checks)
export const ADMIN_PERMISSION_ACTIONS = [
  'view', 'create', 'edit', 'approve_l1', 'approve_final', 'reject', 'export', 'delete'
] as const;
export type AdminPermissionAction = typeof ADMIN_PERMISSION_ACTIONS[number];

// Admin Component Categories
export const ADMIN_COMPONENT_CATEGORIES = [
  'dashboard', 'users', 'finance', 'products', 'system', 'reports'
] as const;

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
  
  // DocuSign Agreement Tracking
  agreementEnvelopeId: varchar("agreement_envelope_id", { length: 255 }),
  agreementStatus: varchar("agreement_status", { length: 50 }).default('pending'),
  agreementSentAt: timestamp("agreement_sent_at"),
  agreementCompletedAt: timestamp("agreement_completed_at"),
  signedDocumentUrl: text("signed_document_url"),
  
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
  
  // DocuSign Agreement Tracking
  agreementEnvelopeId: varchar("agreement_envelope_id", { length: 255 }),
  agreementStatus: varchar("agreement_status", { length: 50 }).default('pending'),
  agreementSentAt: timestamp("agreement_sent_at"),
  agreementCompletedAt: timestamp("agreement_completed_at"),
  signedDocumentUrl: text("signed_document_url"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertFinatradesPersonalKycSchema = createInsertSchema(finatradesPersonalKyc).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFinatradesPersonalKyc = z.infer<typeof insertFinatradesPersonalKycSchema>;
export type FinatradesPersonalKyc = typeof finatradesPersonalKyc.$inferSelect;

// ============================================
// FINAPAY - WALLETS & TRANSACTIONS
// ============================================

/**
 * WALLET TABLE - GOLD-ONLY COMPLIANCE
 * 
 * GOLD GRAMS is the SINGLE SOURCE OF TRUTH for user balances.
 * All USD values should be computed dynamically from goldGrams × currentGoldPrice.
 * 
 * @deprecated usdBalance, eurBalance - These fields are DEPRECATED and will be removed.
 * They exist only for backwards compatibility. Do NOT use for new features.
 * Always compute USD equivalent: goldGrams * currentGoldPrice
 */
export const wallets = pgTable("wallets", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  // PRIMARY SOURCE OF TRUTH - gold grams owned
  goldGrams: decimal("gold_grams", { precision: 18, scale: 6 }).notNull().default('0'),
  // @deprecated - DO NOT USE. Will be removed. Compute USD from gold × price instead.
  usdBalance: decimal("usd_balance", { precision: 18, scale: 2 }).notNull().default('0'),
  // @deprecated - DO NOT USE. Will be removed. Compute EUR from gold × price instead.
  eurBalance: decimal("eur_balance", { precision: 18, scale: 2 }).notNull().default('0'),
  // Legacy currency columns (preserved for production data compatibility)
  gbpBalance: decimal("gbp_balance", { precision: 18, scale: 2 }).notNull().default('0'),
  aedBalance: decimal("aed_balance", { precision: 18, scale: 2 }).notNull().default('0'),
  chfBalance: decimal("chf_balance", { precision: 18, scale: 2 }).notNull().default('0'),
  sarBalance: decimal("sar_balance", { precision: 18, scale: 2 }).notNull().default('0'),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertWalletSchema = createInsertSchema(wallets).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWallet = z.infer<typeof insertWalletSchema>;
export type Wallet = typeof wallets.$inferSelect;

/**
 * TRANSACTIONS TABLE - GOLD-ONLY COMPLIANCE
 * 
 * amountGold and goldPriceUsdPerGram are the source of truth.
 * amountUsd/amountEur are stored for HISTORICAL RECORD only (the price at transaction time).
 * For display, recalculate if showing "current value" vs "transaction value".
 */
export const transactions = pgTable("transactions", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  type: transactionTypeEnum("type").notNull(),
  status: transactionStatusEnum("status").notNull().default('Pending'),
  
  // PRIMARY: Gold amount transferred
  amountGold: decimal("amount_gold", { precision: 18, scale: 6 }),
  // HISTORICAL RECORD: USD value at time of transaction (for audit purposes)
  amountUsd: decimal("amount_usd", { precision: 18, scale: 2 }),
  // HISTORICAL RECORD: EUR value at time of transaction (for audit purposes)
  amountEur: decimal("amount_eur", { precision: 18, scale: 2 }),
  
  // Gold price at transaction time (for historical value calculation)
  goldPriceUsdPerGram: decimal("gold_price_usd_per_gram", { precision: 12, scale: 2 }),
  
  // Legacy columns (preserved for production data compatibility)
  exchangeRateId: varchar("exchange_rate_id", { length: 255 }),
  exchangeRateToUsd: decimal("exchange_rate_to_usd", { precision: 18, scale: 6 }),
  goldPriceInPrimaryCurrency: decimal("gold_price_in_primary_currency", { precision: 18, scale: 6 }),
  amountGbp: decimal("amount_gbp", { precision: 18, scale: 2 }),
  amountAed: decimal("amount_aed", { precision: 18, scale: 2 }),
  primaryCurrency: varchar("primary_currency", { length: 10 }),
  primaryAmount: decimal("primary_amount", { precision: 18, scale: 6 }),
  
  // LGPW/FGPW wallet selection
  goldWalletType: varchar("gold_wallet_type", { length: 10 }), // 'LGPW' or 'FGPW'
  fpgwBatchId: varchar("fpgw_batch_id", { length: 255 }), // For FGPW transactions, links to batch
  
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
export const depositRequestStatusEnum = pgEnum('deposit_request_status', ['Pending', 'Under Review', 'Confirmed', 'Rejected', 'Cancelled']);
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

  // LGPW/FGPW wallet selection - which wallet gold is used for settlement
  goldWalletType: varchar("gold_wallet_type", { length: 10 }).notNull().default('LGPW'), // 'LGPW' or 'FGPW'
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
  
  // Expected gold calculation snapshot (informational - final calculated at approval)
  expectedGoldGrams: decimal("expected_gold_grams", { precision: 18, scale: 6 }), // Gold grams after fee deduction at submission time
  priceSnapshotUsdPerGram: decimal("price_snapshot_usd_per_gram", { precision: 12, scale: 2 }), // Gold price at submission time
  feePercentSnapshot: decimal("fee_percent_snapshot", { precision: 5, scale: 2 }), // Fee percentage at submission time

  // LGPW/FGPW wallet selection - which wallet gold is used for settlement
  goldWalletType: varchar("gold_wallet_type", { length: 10 }).notNull().default('LGPW'), // 'LGPW' or 'FGPW'
  status: depositRequestStatusEnum("status").notNull().default('Pending'),
  processedBy: varchar("processed_by", { length: 255 }).references(() => users.id),
  processedAt: timestamp("processed_at"),
  rejectionReason: text("rejection_reason"),
  adminNotes: text("admin_notes"), // Admin notes for processing
  
  // Gold Bar Purchase Integration (for Buy Gold Bar flow via Wingold)
  goldBarPurchase: json("gold_bar_purchase").$type<{
    isGoldBarPurchase: boolean;
    barSize: '1g' | '10g' | '100g' | '1kg';
    barCount: number;
    totalGrams: number;
    vaultLocationId: string;
    vaultLocationName: string;
    estimatedPricePerGram: number;
  } | null>().default(null),
  wingoldOrderId: varchar("wingold_order_id", { length: 255 }).default(sql`NULL`),
  
  // Crypto Payment Fields (when paymentMethod = 'Crypto')
  cryptoTransactionHash: varchar("crypto_transaction_hash", { length: 255 }), // Blockchain TX hash
  cryptoNetwork: varchar("crypto_network", { length: 50 }), // BTC, ETH, USDT_TRC20, etc.
  cryptoWalletConfigId: varchar("crypto_wallet_config_id", { length: 255 }), // Reference to crypto_wallet_configs
  cryptoAmount: varchar("crypto_amount", { length: 100 }), // Expected crypto amount
  
  // Card Payment Fields (when paymentMethod = 'Card Payment')
  cardTransactionRef: varchar("card_transaction_ref", { length: 255 }), // N-Genius order reference
  cardPaymentStatus: varchar("card_payment_status", { length: 50 }), // CAPTURED, FAILED, etc.
  
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

  // LGPW/FGPW wallet selection - which wallet gold is used for settlement
  goldWalletType: varchar("gold_wallet_type", { length: 10 }).notNull().default('LGPW'), // 'LGPW' or 'FGPW'
  status: withdrawalRequestStatusEnum("status").notNull().default('Pending'),
  // Gold amount being withdrawn
  goldGrams: decimal("gold_grams", { precision: 18, scale: 6 }),
  goldPriceAtRequest: decimal("gold_price_at_request", { precision: 12, scale: 2 }),
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
  'Trade Release',        // Finatrades - issued when FinaBridge trade settles
  'Conversion',           // Finatrades - issued when gold moves LGPW<->FGPW
  'Title Transfer'        // Finatrades - issued when user sells/withdraws gold
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
  // Legacy column (preserved for production data compatibility)
  goldWalletType: varchar("gold_wallet_type", { length: 10 }),
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
  fromUserName: varchar("from_user_name", { length: 255 }), // Sender name for certificate display
  toUserName: varchar("to_user_name", { length: 255 }), // Recipient name for certificate display
  relatedCertificateId: varchar("related_certificate_id", { length: 255 }), // Links to parent/related certificate
  
  // BNSL-related fields
  bnslPlanId: varchar("bnsl_plan_id", { length: 255 }), // References bnslPlans.id for BNSL Lock certs
  
  // Trade finance (FinaBridge) fields
  tradeCaseId: varchar("trade_case_id", { length: 255 }), // References tradeCases.id for Trade Lock/Release certs
  
  // LGPW/FGPW Conversion fields
  goldWalletType: varchar("gold_wallet_type", { length: 10 }), // 'LGPW' or 'FGPW' - which wallet this certificate belongs to
  fromGoldWalletType: varchar("from_gold_wallet_type", { length: 10 }), // For conversion certificates
  toGoldWalletType: varchar("to_gold_wallet_type", { length: 10 }), // For conversion certificates
  fpgwBatchId: varchar("fpgw_batch_id", { length: 255 }), // For FGPW certificates, links to batch
  conversionPriceUsd: decimal("conversion_price_usd", { precision: 12, scale: 2 }), // Price at time of conversion
  
  // Certificate lineage - track remaining grams after partial conversions
  remainingGrams: decimal("remaining_grams", { precision: 18, scale: 6 }), // Current active grams (may be less than goldGrams due to conversions)
  parentCertificateId: varchar("parent_certificate_id", { length: 255 }), // For child certificates created from partial surrender
  
  issuedAt: timestamp("issued_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"),
  cancelledAt: timestamp("cancelled_at"),
  supersededBy: varchar("superseded_by", { length: 255 }),
});

export const insertCertificateSchema = createInsertSchema(certificates).omit({ id: true, issuedAt: true });
export type InsertCertificate = z.infer<typeof insertCertificateSchema>;
export type Certificate = typeof certificates.$inferSelect;

// Certificate Events - Audit trail for certificate lifecycle changes
export const certificateEventTypeEnum = pgEnum('certificate_event_type', [
  'ISSUED',              // Certificate created
  'PARTIAL_SURRENDER',   // Portion of certificate converted/transferred
  'FULL_SURRENDER',      // Full certificate converted/transferred
  'CANCELLED',           // Certificate cancelled
  'UPDATED',             // Certificate details updated
  'WALLET_RECLASSIFICATION' // Physical storage backing reclassified between LGPW/FGPW
]);

export const certificateEvents = pgTable("certificate_events", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  certificateId: varchar("certificate_id", { length: 255 }).notNull().references(() => certificates.id),
  eventType: certificateEventTypeEnum("event_type").notNull(),
  
  // Amount details
  gramsAffected: decimal("grams_affected", { precision: 18, scale: 6 }).notNull(),
  gramsBefore: decimal("grams_before", { precision: 18, scale: 6 }).notNull(),
  gramsAfter: decimal("grams_after", { precision: 18, scale: 6 }).notNull(),
  
  // Linked entities
  transactionId: varchar("transaction_id", { length: 255 }).references(() => transactions.id),
  childCertificateId: varchar("child_certificate_id", { length: 255 }), // New certificate created from partial surrender
  
  notes: text("notes"),
  createdBy: varchar("created_by", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCertificateEventSchema = createInsertSchema(certificateEvents).omit({ id: true, createdAt: true });
export type InsertCertificateEvent = z.infer<typeof insertCertificateEventSchema>;
export type CertificateEvent = typeof certificateEvents.$inferSelect;

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
  'Storage_Fee',                // Storage fee deduction
  'LGPW_To_FGPW',              // Convert from Market Price to Fixed Price wallet
  'FGPW_To_LGPW'               // Convert from Fixed Price to Market Price wallet
]);

// Wallet types for tracking source/destination
export const walletTypeEnum = pgEnum('wallet_type', [
  'FinaPay',      // Main user wallet
  'BNSL',         // BNSL dedicated wallet
  'FinaBridge',   // FinaBridge trade wallet
  'External'      // External (deposits/withdrawals/escrow)
]);

// ============================================
// LGPW/FGPW DUAL-WALLET SYSTEM
// ============================================

/**
 * Gold Wallet Valuation Types:
 * - LGPW (Live Gold Price Wallet): Gold value follows live market price
 * - FGPW (Fixed Gold Price Wallet): Gold value locked at transaction time
 */
export const goldWalletTypeEnum = pgEnum('gold_wallet_type', ['LGPW', 'FGPW']);

// Balance bucket types for tracking gold status
export const balanceBucketEnum = pgEnum('balance_bucket', [
  'Available',      // Ready to spend
  'Pending',        // Awaiting verification
  'Locked_BNSL',    // Locked in BNSL plan
  'Reserved_Trade'  // Reserved for FinaBridge
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
  
  // LGPW/FGPW tracking
  goldWalletType: goldWalletTypeEnum("gold_wallet_type"), // Which valuation wallet this affects
  fromGoldWalletType: goldWalletTypeEnum("from_gold_wallet_type"), // For LGPW<->FGPW transfers
  toGoldWalletType: goldWalletTypeEnum("to_gold_wallet_type"), // For LGPW<->FGPW transfers
  
  // Running balance after this entry
  balanceAfterGrams: decimal("balance_after_grams", { precision: 18, scale: 6 }).notNull(),
  
  // Reference IDs for linking to related entities
  transactionId: varchar("transaction_id", { length: 255 }),
  bnslPlanId: varchar("bnsl_plan_id", { length: 255 }),
  bnslPayoutId: varchar("bnsl_payout_id", { length: 255 }),
  tradeRequestId: varchar("trade_request_id", { length: 255 }),
  certificateId: varchar("certificate_id", { length: 255 }),
  fpgwBatchId: varchar("fpgw_batch_id", { length: 255 }), // For FGPW batch tracking
  
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
  
  // Breakdown by status (legacy - aggregated across both wallet types)
  availableGrams: decimal("available_grams", { precision: 18, scale: 6 }).notNull().default('0'),
  pendingGrams: decimal("pending_grams", { precision: 18, scale: 6 }).notNull().default('0'),
  lockedBnslGrams: decimal("locked_bnsl_grams", { precision: 18, scale: 6 }).notNull().default('0'),
  reservedTradeGrams: decimal("reserved_trade_grams", { precision: 18, scale: 6 }).notNull().default('0'),
  
  // ============================================
  // LGPW (Live Gold Price Wallet) Breakdown
  // Gold value follows live market price
  // ============================================
  mpgwAvailableGrams: decimal("mpgw_available_grams", { precision: 18, scale: 6 }).notNull().default('0'),
  mpgwPendingGrams: decimal("mpgw_pending_grams", { precision: 18, scale: 6 }).notNull().default('0'),
  mpgwLockedBnslGrams: decimal("mpgw_locked_bnsl_grams", { precision: 18, scale: 6 }).notNull().default('0'),
  mpgwReservedTradeGrams: decimal("mpgw_reserved_trade_grams", { precision: 18, scale: 6 }).notNull().default('0'),
  
  // ============================================
  // FGPW (Fixed Gold Price Wallet) Breakdown
  // Gold value locked at transaction time
  // ============================================
  fpgwAvailableGrams: decimal("fpgw_available_grams", { precision: 18, scale: 6 }).notNull().default('0'),
  fpgwPendingGrams: decimal("fpgw_pending_grams", { precision: 18, scale: 6 }).notNull().default('0'),
  fpgwLockedBnslGrams: decimal("fpgw_locked_bnsl_grams", { precision: 18, scale: 6 }).notNull().default('0'),
  fpgwReservedTradeGrams: decimal("fpgw_reserved_trade_grams", { precision: 18, scale: 6 }).notNull().default('0'),
  // FGPW weighted average price (computed from active batches)
  fpgwWeightedAvgPriceUsd: decimal("fpgw_weighted_avg_price_usd", { precision: 12, scale: 2 }),
  
  // Breakdown by wallet (FinaPay/BNSL/FinaBridge)
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
// FGPW BATCHES - Fixed Price Gold Batches
// ============================================

/**
 * FGPW Batches track gold purchased at specific prices.
 * When spending FGPW gold, FIFO (First-In-First-Out) is used.
 * Each batch represents gold added at a specific price point.
 */
export const fpgwBatchStatusEnum = pgEnum('fpgw_batch_status', [
  'Active',       // Batch has remaining grams
  'Consumed',     // All grams spent/transferred
  'Transferred'   // Transferred to another user
]);

export const fpgwBatches = pgTable("fpgw_batches", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  
  // Batch details
  originalGrams: decimal("original_grams", { precision: 18, scale: 6 }).notNull(),
  remainingGrams: decimal("remaining_grams", { precision: 18, scale: 6 }).notNull(),
  lockedPriceUsd: decimal("locked_price_usd", { precision: 12, scale: 2 }).notNull(),
  
  // Status tracking
  status: fpgwBatchStatusEnum("status").notNull().default('Active'),
  balanceBucket: balanceBucketEnum("balance_bucket").notNull().default('Available'),
  
  // Source tracking
  sourceTransactionId: varchar("source_transaction_id", { length: 255 }),
  sourceType: varchar("source_type", { length: 50 }), // 'deposit', 'transfer', 'conversion'
  fromUserId: varchar("from_user_id", { length: 255 }).references(() => users.id), // For transfers
  
  // Audit
  notes: text("notes"),

  // LGPW/FGPW wallet selection - which wallet gold is used for settlement
  goldWalletType: varchar("gold_wallet_type", { length: 10 }).notNull().default('LGPW'), // 'LGPW' or 'FGPW'
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertFpgwBatchSchema = createInsertSchema(fpgwBatches).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFpgwBatch = z.infer<typeof insertFpgwBatchSchema>;
export type FpgwBatch = typeof fpgwBatches.$inferSelect;

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

  // LGPW/FGPW wallet selection - which wallet gold is used for settlement
  goldWalletType: varchar("gold_wallet_type", { length: 10 }).notNull().default('LGPW'), // 'LGPW' or 'FGPW'
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

  // LGPW/FGPW wallet selection - which wallet gold is used for settlement
  goldWalletType: varchar("gold_wallet_type", { length: 10 }).notNull().default('LGPW'), // 'LGPW' or 'FGPW'
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

  // LGPW/FGPW wallet selection - which wallet gold is locked from
  goldWalletType: varchar("gold_wallet_type", { length: 10 }).notNull().default('LGPW'), // 'LGPW' or 'FGPW'
  
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

  // LGPW/FGPW wallet selection - which wallet gold is used for settlement
  goldWalletType: varchar("gold_wallet_type", { length: 10 }).notNull().default('LGPW'), // 'LGPW' or 'FGPW'
  
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
  goldPriceUsdPerGram: decimal("gold_price_usd_per_gram", { precision: 18, scale: 6 }),
  isPriceLocked: boolean("is_price_locked").default(false),
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

  // LGPW/FGPW wallet selection - which wallet gold is used for settlement
  goldWalletType: varchar("gold_wallet_type", { length: 10 }).notNull().default('LGPW'), // 'LGPW' or 'FGPW'
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
  memo: text("memo"), // For invitations: stores JSON with {isInvite, invitationToken, senderReferralCode}
  status: peerTransferStatusEnum("status").notNull().default('Completed'),
  requiresApproval: boolean("requires_approval").notNull().default(false), // Whether recipient needs to accept
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
  attachmentUrl: text("attachment_url"), // Base64 or storage URL for invoice attachment
  attachmentName: varchar("attachment_name", { length: 255 }), // Original filename
  attachmentMime: varchar("attachment_mime", { length: 100 }), // MIME type (pdf, png, jpg)
  attachmentSize: integer("attachment_size"), // File size in bytes
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
  
  // Dual-wallet support
  goldWalletType: varchar("gold_wallet_type", { length: 10 }).default('LGPW'), // LGPW or FGPW
  
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

  // LGPW/FGPW wallet selection - which wallet gold is used for settlement
  goldWalletType: varchar("gold_wallet_type", { length: 10 }).notNull().default('LGPW'), // 'LGPW' or 'FGPW'
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

  // LGPW/FGPW wallet selection - which wallet gold is used for settlement
  goldWalletType: varchar("gold_wallet_type", { length: 10 }).notNull().default('LGPW'), // 'LGPW' or 'FGPW'
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

  // LGPW/FGPW wallet selection - which wallet gold is used for settlement
  goldWalletType: varchar("gold_wallet_type", { length: 10 }).notNull().default('LGPW'), // 'LGPW' or 'FGPW'
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
// WINGOLD INTEGRATION - B2B GOLD PURCHASING
// ============================================

export const wingoldBarSizeEnum = pgEnum('wingold_bar_size', ['1g', '10g', '100g', '1kg']);
export const wingoldOrderStatusEnum = pgEnum('wingold_order_status', [
  'pending', 'submitted', 'confirmed', 'processing', 'wingold_approved', 'fulfilled', 'cancelled', 'failed'
]);
export const wingoldBarCustodyStatusEnum = pgEnum('wingold_bar_custody_status', [
  'in_vault', 'reserved', 'released', 'transferred'
]);
export const wingoldCertificateTypeEnum = pgEnum('wingold_certificate_type', ['bar', 'storage']);

// Wingold purchase orders - orders sent to Wingold for physical gold
export const wingoldPurchaseOrders = pgTable("wingold_purchase_orders", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  referenceNumber: varchar("reference_number", { length: 50 }).notNull().unique(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  transactionId: varchar("transaction_id", { length: 255 }),
  
  barSize: wingoldBarSizeEnum("bar_size").notNull(),
  barCount: integer("bar_count").notNull(),
  totalGrams: decimal("total_grams", { precision: 18, scale: 6 }).notNull(),
  usdAmount: decimal("usd_amount", { precision: 18, scale: 2 }).notNull(),
  goldPriceUsdPerGram: decimal("gold_price_usd_per_gram", { precision: 18, scale: 6 }).notNull(),
  
  status: wingoldOrderStatusEnum("status").notNull().default('pending'),
  wingoldOrderId: varchar("wingold_order_id", { length: 255 }),
  wingoldVaultLocationId: varchar("wingold_vault_location_id", { length: 255 }),
  
  submittedAt: timestamp("submitted_at"),
  confirmedAt: timestamp("confirmed_at"),
  fulfilledAt: timestamp("fulfilled_at"),
  cancelledAt: timestamp("cancelled_at"),
  
  errorMessage: text("error_message"),
  metadata: json("metadata"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertWingoldPurchaseOrderSchema = createInsertSchema(wingoldPurchaseOrders).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWingoldPurchaseOrder = z.infer<typeof insertWingoldPurchaseOrderSchema>;
export type WingoldPurchaseOrder = typeof wingoldPurchaseOrders.$inferSelect;

// Wingold bar lots - individual bars received from Wingold
export const wingoldBarLots = pgTable("wingold_bar_lots", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id", { length: 255 }).notNull().references(() => wingoldPurchaseOrders.id),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  
  barId: varchar("bar_id", { length: 100 }).notNull().unique(),
  serialNumber: varchar("serial_number", { length: 100 }).notNull(),
  barSize: wingoldBarSizeEnum("bar_size").notNull(),
  weightGrams: decimal("weight_grams", { precision: 18, scale: 6 }).notNull(),
  purity: decimal("purity", { precision: 5, scale: 4 }).notNull().default('0.9999'),
  mint: varchar("mint", { length: 100 }),
  
  vaultLocationId: varchar("vault_location_id", { length: 255 }),
  vaultLocationName: varchar("vault_location_name", { length: 255 }),
  
  custodyStatus: wingoldBarCustodyStatusEnum("custody_status").notNull().default('in_vault'),
  
  barCertificateId: varchar("bar_certificate_id", { length: 255 }),
  storageCertificateId: varchar("storage_certificate_id", { length: 255 }),
  
  vaultHoldingId: varchar("vault_holding_id", { length: 255 }).references(() => vaultHoldings.id),
  ledgerEntryId: varchar("ledger_entry_id", { length: 255 }),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertWingoldBarLotSchema = createInsertSchema(wingoldBarLots).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWingoldBarLot = z.infer<typeof insertWingoldBarLotSchema>;
export type WingoldBarLot = typeof wingoldBarLots.$inferSelect;

// Wingold certificates - bar and storage certificates from Wingold
export const wingoldCertificates = pgTable("wingold_certificates", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id", { length: 255 }).notNull().references(() => wingoldPurchaseOrders.id),
  barLotId: varchar("bar_lot_id", { length: 255 }).references(() => wingoldBarLots.id),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  
  certificateType: wingoldCertificateTypeEnum("certificate_type").notNull(),
  certificateNumber: varchar("certificate_number", { length: 100 }).notNull().unique(),
  
  providerHash: varchar("provider_hash", { length: 255 }),
  pdfUrl: text("pdf_url"),
  jsonData: json("json_data"),
  signature: text("signature"),
  
  issuedAt: timestamp("issued_at").notNull(),
  verifiedAt: timestamp("verified_at"),
  verifiedBy: varchar("verified_by", { length: 255 }),
  
  metadata: json("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertWingoldCertificateSchema = createInsertSchema(wingoldCertificates).omit({ id: true, createdAt: true });
export type InsertWingoldCertificate = z.infer<typeof insertWingoldCertificateSchema>;
export type WingoldCertificate = typeof wingoldCertificates.$inferSelect;

// Wingold vault locations - cache of Wingold's vault locations
export const wingoldVaultLocations = pgTable("wingold_vault_locations", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  wingoldLocationId: varchar("wingold_location_id", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }),
  city: varchar("city", { length: 100 }),
  country: varchar("country", { length: 100 }).notNull(),
  address: text("address"),
  isActive: boolean("is_active").notNull().default(true),
  metadata: json("metadata"),
  syncedAt: timestamp("synced_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertWingoldVaultLocationSchema = createInsertSchema(wingoldVaultLocations).omit({ id: true, createdAt: true });
export type InsertWingoldVaultLocation = z.infer<typeof insertWingoldVaultLocationSchema>;
export type WingoldVaultLocation = typeof wingoldVaultLocations.$inferSelect;

// Wingold API credentials - for B2B API authentication
export const wingoldApiCredentials = pgTable("wingold_api_credentials", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  apiKeyId: varchar("api_key_id", { length: 255 }).notNull().unique(),
  description: varchar("description", { length: 255 }),
  publicKey: text("public_key"),
  allowedIps: text("allowed_ips"),
  isActive: boolean("is_active").notNull().default(true),
  lastUsedAt: timestamp("last_used_at"),
  lastRotatedAt: timestamp("last_rotated_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertWingoldApiCredentialSchema = createInsertSchema(wingoldApiCredentials).omit({ id: true, createdAt: true });
export type InsertWingoldApiCredential = z.infer<typeof insertWingoldApiCredentialSchema>;
export type WingoldApiCredential = typeof wingoldApiCredentials.$inferSelect;

// Wingold reconciliation records - for daily reconciliation with Wingold
export const wingoldReconciliations = pgTable("wingold_reconciliations", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  reconciliationDate: date("reconciliation_date").notNull(),
  
  wingoldTotalBars: integer("wingold_total_bars"),
  wingoldTotalGrams: decimal("wingold_total_grams", { precision: 18, scale: 6 }),
  finatradesTotalBars: integer("finatrades_total_bars"),
  finatradesTotalGrams: decimal("finatrades_total_grams", { precision: 18, scale: 6 }),
  
  isMatched: boolean("is_matched").notNull().default(false),
  discrepancyGrams: decimal("discrepancy_grams", { precision: 18, scale: 6 }),
  discrepancyNotes: text("discrepancy_notes"),
  
  rawPayload: json("raw_payload"),
  reviewedBy: varchar("reviewed_by", { length: 255 }),
  reviewedAt: timestamp("reviewed_at"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertWingoldReconciliationSchema = createInsertSchema(wingoldReconciliations).omit({ id: true, createdAt: true });
export type InsertWingoldReconciliation = z.infer<typeof insertWingoldReconciliationSchema>;
export type WingoldReconciliation = typeof wingoldReconciliations.$inferSelect;

// Wingold checkout sessions - for redirect checkout flow (production-ready)
export const wingoldCheckoutSessionStatusEnum = pgEnum('wingold_checkout_session_status', [
  'pending', 'completed', 'cancelled', 'failed', 'expired'
]);

export const wingoldCheckoutSessions = pgTable("wingold_checkout_sessions", {
  id: varchar("id", { length: 255 }).primaryKey(), // orderId from JWT
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  nonce: varchar("nonce", { length: 64 }).notNull(),
  
  totalGrams: decimal("total_grams", { precision: 18, scale: 6 }).notNull(),
  totalUsd: decimal("total_usd", { precision: 18, scale: 2 }).notNull(),
  totalAed: decimal("total_aed", { precision: 18, scale: 2 }).notNull(),
  
  items: json("items").$type<Array<{
    barSize: string;
    grams: number;
    quantity: number;
    priceUsd: number;
    priceAed: number;
  }>>().notNull(),
  
  vaultLocationId: varchar("vault_location_id", { length: 255 }),
  
  status: wingoldCheckoutSessionStatusEnum("status").notNull().default('pending'),
  wingoldReferenceNumber: varchar("wingold_reference_number", { length: 100 }),
  errorMessage: text("error_message"),
  
  expiresAt: timestamp("expires_at").notNull(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertWingoldCheckoutSessionSchema = createInsertSchema(wingoldCheckoutSessions).omit({ createdAt: true });
export type InsertWingoldCheckoutSession = z.infer<typeof insertWingoldCheckoutSessionSchema>;
export type WingoldCheckoutSession = typeof wingoldCheckoutSessions.$inferSelect;

// Wingold Order Events - for webhook idempotency and tracking
export const wingoldPaymentMethodEnum = pgEnum('wingold_payment_method', ['CARD', 'BANK', 'CRYPTO']);
export const wingoldPaymentStatusEnum = pgEnum('wingold_payment_status', ['PENDING', 'PAID', 'VERIFIED', 'FAILED', 'REFUNDED']);

export const wingoldOrderEvents = pgTable("wingold_order_events", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id", { length: 255 }).notNull().unique(), // For idempotency
  wingoldOrderId: varchar("wingold_order_id", { length: 255 }).notNull(),
  // Nullable to allow storing events for idempotency even when user is unknown
  userId: varchar("user_id", { length: 255 }),
  finatradesIdFromPayload: varchar("finatrades_id_from_payload", { length: 255 }), // Store the ID from payload for later lookup
  
  eventType: varchar("event_type", { length: 100 }).notNull(), // order.confirmed, order.fulfilled, etc.
  
  // Amounts - may not be available for all event types
  amount: decimal("amount", { precision: 18, scale: 2 }),
  currency: varchar("currency", { length: 10 }).default('USD'),
  totalGrams: decimal("total_grams", { precision: 18, scale: 6 }),
  
  // Payment info - optional, not all events have this
  paymentMethod: wingoldPaymentMethodEnum("payment_method"),
  paymentStatus: wingoldPaymentStatusEnum("payment_status"),
  
  bankReference: varchar("bank_reference", { length: 255 }),
  cryptoTxHash: varchar("crypto_tx_hash", { length: 255 }),
  gatewayRef: varchar("gateway_ref", { length: 255 }),
  
  goldItems: json("gold_items").$type<Array<{
    sku: string;
    weightGrams: number;
    purity: string;
    quantity: number;
  }>>(),
  
  payloadJson: json("payload_json"), // Full webhook payload for audit
  
  processedAt: timestamp("processed_at"),
  walletCredited: boolean("wallet_credited").notNull().default(false),
  creditedGrams: decimal("credited_grams", { precision: 18, scale: 6 }),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertWingoldOrderEventSchema = createInsertSchema(wingoldOrderEvents).omit({ id: true, createdAt: true });
export type InsertWingoldOrderEvent = z.infer<typeof insertWingoldOrderEventSchema>;
export type WingoldOrderEvent = typeof wingoldOrderEvents.$inferSelect;

// External Purchase References - for CARD payments (no wallet credit, reference only)
export const externalPurchaseRefs = pgTable("external_purchase_refs", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  wingoldOrderId: varchar("wingold_order_id", { length: 255 }).notNull(),
  
  paymentMethod: varchar("payment_method", { length: 50 }).notNull().default('CARD'),
  gatewayRef: varchar("gateway_ref", { length: 255 }),
  
  amount: decimal("amount", { precision: 18, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).notNull().default('AED'),
  totalGrams: decimal("total_grams", { precision: 18, scale: 6 }).notNull(),
  
  goldItems: json("gold_items").$type<Array<{
    sku: string;
    weightGrams: number;
    purity: string;
    quantity: number;
  }>>(),
  
  note: text("note").default('External purchase via Wingold - Card'),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertExternalPurchaseRefSchema = createInsertSchema(externalPurchaseRefs).omit({ id: true, createdAt: true });
export type InsertExternalPurchaseRef = z.infer<typeof insertExternalPurchaseRefSchema>;
export type ExternalPurchaseRef = typeof externalPurchaseRefs.$inferSelect;

// Wingold products catalog - synced from B2B API
export const wingoldProducts = pgTable("wingold_products", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  wingoldProductId: varchar("wingold_product_id", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  weight: varchar("weight", { length: 50 }).notNull(), // e.g., "1kg", "100g"
  weightGrams: decimal("weight_grams", { precision: 18, scale: 4 }).notNull(),
  purity: varchar("purity", { length: 20 }).notNull().default('999.9'),
  livePrice: decimal("live_price", { precision: 18, scale: 2 }),
  pricePerGram: decimal("price_per_gram", { precision: 18, scale: 6 }),
  currency: varchar("currency", { length: 10 }).notNull().default('USD'),
  stock: integer("stock").notNull().default(0),
  inStock: boolean("in_stock").notNull().default(true),
  category: varchar("category", { length: 100 }).default('bars'),
  imageUrl: text("image_url"),
  thumbnailUrl: text("thumbnail_url"),
  galleryUrls: json("gallery_urls").$type<string[]>(),
  certificationImageUrl: text("certification_image_url"),
  description: text("description"),
  metadata: json("metadata"),
  // Fee fields for pricing breakdown
  makingFee: decimal("making_fee", { precision: 18, scale: 2 }).default('0'), // Flat USD amount per bar
  premiumFeePercent: decimal("premium_fee_percent", { precision: 5, scale: 2 }).default('0'), // Premium as % of gold price
  vatPercent: decimal("vat_percent", { precision: 5, scale: 2 }).default('0'), // VAT percentage
  syncedAt: timestamp("synced_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertWingoldProductSchema = createInsertSchema(wingoldProducts).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWingoldProduct = z.infer<typeof insertWingoldProductSchema>;
export type WingoldProduct = typeof wingoldProducts.$inferSelect;

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

  // LGPW/FGPW wallet selection - which wallet gold is used for settlement
  goldWalletType: varchar("gold_wallet_type", { length: 10 }).notNull().default('LGPW'), // 'LGPW' or 'FGPW'
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
// SAR (SUSPICIOUS ACTIVITY REPORTS)
// ============================================

export const sarStatusEnum = pgEnum('sar_status', [
  'draft', 'under_review', 'approved', 'filed', 'rejected'
]);

export const sarActivityTypeEnum = pgEnum('sar_activity_type', [
  'structuring', 'unusual_transaction_pattern', 'high_risk_jurisdiction',
  'identity_concern', 'source_of_funds_concern', 'terrorist_financing_suspicion',
  'money_laundering_suspicion', 'other'
]);

export const sarReports = pgTable("sar_reports", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  reportNumber: varchar("report_number", { length: 50 }).notNull().unique(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  caseId: varchar("case_id", { length: 255 }).references(() => amlCases.id),
  
  activityType: sarActivityTypeEnum("activity_type").notNull(),
  activityDescription: text("activity_description").notNull(),
  
  transactionIds: json("transaction_ids").$type<string[]>(),
  totalAmountInvolved: decimal("total_amount_involved", { precision: 20, scale: 2 }).notNull(),
  dateRangeStart: date("date_range_start").notNull(),
  dateRangeEnd: date("date_range_end").notNull(),
  
  reportingOfficer: varchar("reporting_officer", { length: 255 }).notNull(),
  supervisorReviewed: boolean("supervisor_reviewed").default(false),
  supervisorReviewedBy: varchar("supervisor_reviewed_by", { length: 255 }),
  supervisorReviewedAt: timestamp("supervisor_reviewed_at"),
  
  status: sarStatusEnum("status").notNull().default('draft'),
  filedWithRegulator: boolean("filed_with_regulator").default(false),
  filedAt: timestamp("filed_at"),
  regulatorReferenceNumber: varchar("regulator_reference_number", { length: 100 }),
  
  notes: text("notes"),

  // LGPW/FGPW wallet selection - which wallet gold is used for settlement
  goldWalletType: varchar("gold_wallet_type", { length: 10 }).notNull().default('LGPW'), // 'LGPW' or 'FGPW'
  attachments: json("attachments").$type<string[]>(),
  
  createdBy: varchar("created_by", { length: 255 }).notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSarReportSchema = createInsertSchema(sarReports).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSarReport = z.infer<typeof insertSarReportSchema>;
export type SarReport = typeof sarReports.$inferSelect;

// ============================================
// FRAUD ALERTS
// ============================================

export const fraudAlertTypeEnum = pgEnum('fraud_alert_type', [
  'velocity_breach', 'unusual_amount', 'geographic_anomaly', 
  'device_change', 'pattern_match', 'manual_flag'
]);

export const fraudAlertSeverityEnum = pgEnum('fraud_alert_severity', [
  'low', 'medium', 'high', 'critical'
]);

export const fraudAlertStatusEnum = pgEnum('fraud_alert_status', [
  'new', 'investigating', 'confirmed_fraud', 'false_positive', 'resolved'
]);

export const fraudAlerts = pgTable("fraud_alerts", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  transactionId: varchar("transaction_id", { length: 255 }),
  
  alertType: fraudAlertTypeEnum("alert_type").notNull(),
  severity: fraudAlertSeverityEnum("severity").notNull(),
  description: text("description").notNull(),
  
  riskScore: integer("risk_score"),
  riskFactors: json("risk_factors").$type<Record<string, any>>(),
  
  status: fraudAlertStatusEnum("status").notNull().default('new'),
  reviewedBy: varchar("reviewed_by", { length: 255 }).references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  
  resolution: text("resolution"),
  resolvedBy: varchar("resolved_by", { length: 255 }).references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  
  detectedAt: timestamp("detected_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertFraudAlertSchema = createInsertSchema(fraudAlerts).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFraudAlert = z.infer<typeof insertFraudAlertSchema>;
export type FraudAlert = typeof fraudAlerts.$inferSelect;

// ============================================
// RECONCILIATION REPORTS
// ============================================

export const reconciliationStatusEnum = pgEnum('reconciliation_status', [
  'balanced', 'discrepancy_found', 'pending_review', 'resolved'
]);

export const reconciliationReports = pgTable("reconciliation_reports", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  reportDate: date("report_date").notNull(),
  
  totalGoldGrams: decimal("total_gold_grams", { precision: 20, scale: 4 }).notNull(),
  totalUsdValue: decimal("total_usd_value", { precision: 20, scale: 2 }).notNull(),
  
  transactionCount: integer("transaction_count").notNull(),
  depositCount: integer("deposit_count").notNull(),
  withdrawalCount: integer("withdrawal_count").notNull(),
  
  goldInflow: decimal("gold_inflow", { precision: 20, scale: 4 }).notNull(),
  goldOutflow: decimal("gold_outflow", { precision: 20, scale: 4 }).notNull(),
  netGoldChange: decimal("net_gold_change", { precision: 20, scale: 4 }).notNull(),
  
  discrepancies: json("discrepancies").$type<any[]>(),
  status: reconciliationStatusEnum("status").notNull().default('balanced'),
  
  generatedBy: varchar("generated_by", { length: 255 }),
  reviewedBy: varchar("reviewed_by", { length: 255 }),
  reviewedAt: timestamp("reviewed_at"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertReconciliationReportSchema = createInsertSchema(reconciliationReports).omit({ id: true, createdAt: true });
export type InsertReconciliationReport = z.infer<typeof insertReconciliationReportSchema>;
export type ReconciliationReport = typeof reconciliationReports.$inferSelect;

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

// ============================================
// SCHEDULED JOBS (Background Tasks)
// ============================================

export const scheduledJobStatusEnum = pgEnum('scheduled_job_status', [
  'active', 'paused', 'completed', 'failed', 'running'
]);

export const scheduledJobs = pgTable("scheduled_jobs", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  cronExpression: varchar("cron_expression", { length: 100 }),
  intervalMs: integer("interval_ms"),
  
  status: scheduledJobStatusEnum("status").notNull().default('active'),
  
  lastRunAt: timestamp("last_run_at"),
  lastRunDurationMs: integer("last_run_duration_ms"),
  lastRunResult: text("last_run_result"),
  lastError: text("last_error"),
  
  nextRunAt: timestamp("next_run_at"),
  runCount: integer("run_count").notNull().default(0),
  failCount: integer("fail_count").notNull().default(0),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertScheduledJobSchema = createInsertSchema(scheduledJobs).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertScheduledJob = z.infer<typeof insertScheduledJobSchema>;
export type ScheduledJob = typeof scheduledJobs.$inferSelect;

// Scheduled Job Runs (History)
export const scheduledJobRuns = pgTable("scheduled_job_runs", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id", { length: 255 }).notNull().references(() => scheduledJobs.id),
  
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  durationMs: integer("duration_ms"),
  
  success: boolean("success"),
  result: text("result"),
  error: text("error"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertScheduledJobRunSchema = createInsertSchema(scheduledJobRuns).omit({ id: true, createdAt: true });
export type InsertScheduledJobRun = z.infer<typeof insertScheduledJobRunSchema>;
export type ScheduledJobRun = typeof scheduledJobRuns.$inferSelect;

// ============================================
// REVENUE TRACKING
// ============================================

export const revenueEntries = pgTable("revenue_entries", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  
  date: date("date").notNull(),
  module: varchar("module", { length: 100 }).notNull(),
  revenueType: varchar("revenue_type", { length: 100 }).notNull(),
  
  transactionId: varchar("transaction_id", { length: 255 }),
  userId: varchar("user_id", { length: 255 }),
  
  grossAmountUsd: decimal("gross_amount_usd", { precision: 20, scale: 2 }).notNull(),
  feeAmountUsd: decimal("fee_amount_usd", { precision: 20, scale: 2 }).notNull(),
  netAmountUsd: decimal("net_amount_usd", { precision: 20, scale: 2 }).notNull(),
  
  goldGrams: decimal("gold_grams", { precision: 20, scale: 6 }),
  spreadPercent: decimal("spread_percent", { precision: 10, scale: 4 }),
  
  metadata: json("metadata").$type<Record<string, any>>(),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertRevenueEntrySchema = createInsertSchema(revenueEntries).omit({ id: true, createdAt: true });
export type InsertRevenueEntry = z.infer<typeof insertRevenueEntrySchema>;
export type RevenueEntry = typeof revenueEntries.$inferSelect;

// ============================================
// REGULATORY REPORTS
// ============================================

export const regulatoryReportTypeEnum = pgEnum('regulatory_report_type', [
  'daily_summary', 'weekly_summary', 'monthly_summary',
  'aml_report', 'kyc_report', 'transaction_report',
  'customer_due_diligence', 'risk_assessment', 'audit_report'
]);

export const regulatoryReportStatusEnum = pgEnum('regulatory_report_status', [
  'draft', 'generated', 'reviewed', 'submitted', 'archived'
]);

export const regulatoryReports = pgTable("regulatory_reports", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  
  reportType: regulatoryReportTypeEnum("report_type").notNull(),
  reportPeriodStart: date("report_period_start").notNull(),
  reportPeriodEnd: date("report_period_end").notNull(),
  
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  
  reportData: json("report_data").$type<Record<string, any>>(),
  summary: text("summary"),
  
  status: regulatoryReportStatusEnum("status").notNull().default('draft'),
  
  generatedBy: varchar("generated_by", { length: 255 }).references(() => users.id),
  generatedAt: timestamp("generated_at"),
  
  reviewedBy: varchar("reviewed_by", { length: 255 }).references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  
  submittedTo: varchar("submitted_to", { length: 255 }),
  submittedAt: timestamp("submitted_at"),
  
  fileUrl: text("file_url"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertRegulatoryReportSchema = createInsertSchema(regulatoryReports).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRegulatoryReport = z.infer<typeof insertRegulatoryReportSchema>;
export type RegulatoryReport = typeof regulatoryReports.$inferSelect;

// ============================================
// ANNOUNCEMENTS
// ============================================

export const announcementTypeEnum = pgEnum('announcement_type', ['info', 'warning', 'success', 'critical']);
export const announcementTargetEnum = pgEnum('announcement_target', ['all', 'users', 'admins', 'business']);

export const announcements = pgTable("announcements", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  type: announcementTypeEnum("type").notNull().default('info'),
  target: announcementTargetEnum("target").notNull().default('all'),
  isActive: boolean("is_active").notNull().default(true),
  showBanner: boolean("show_banner").notNull().default(true),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  createdBy: varchar("created_by", { length: 255 }).references(() => users.id),
  viewCount: integer("view_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAnnouncementSchema = createInsertSchema(announcements).omit({ id: true, createdAt: true, updatedAt: true, viewCount: true });
export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;
export type Announcement = typeof announcements.$inferSelect;

// ============================================
// VAULT MANAGEMENT SYSTEM
// ============================================

// Third-Party Vault Locations (WinGold, Brinks, etc.)
export const thirdPartyVaultLocations = pgTable("third_party_vault_locations", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  country: varchar("country", { length: 100 }).notNull(),
  countryCode: varchar("country_code", { length: 3 }).notNull(),
  
  capacityKg: decimal("capacity_kg", { precision: 20, scale: 6 }),
  currentHoldingsKg: decimal("current_holdings_kg", { precision: 20, scale: 6 }).notNull().default('0'),
  
  insuranceProvider: varchar("insurance_provider", { length: 255 }),
  insuranceCoverageUsd: decimal("insurance_coverage_usd", { precision: 20, scale: 2 }),
  insuranceExpiryDate: date("insurance_expiry_date"),
  
  securityLevel: varchar("security_level", { length: 50 }).default('Standard'),
  
  contactName: varchar("contact_name", { length: 255 }),
  contactEmail: varchar("contact_email", { length: 255 }),
  contactPhone: varchar("contact_phone", { length: 50 }),
  
  isActive: boolean("is_active").notNull().default(true),
  isPrimary: boolean("is_primary").notNull().default(false),
  
  metadata: json("metadata").$type<Record<string, any>>(),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertThirdPartyVaultLocationSchema = createInsertSchema(thirdPartyVaultLocations).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertThirdPartyVaultLocation = z.infer<typeof insertThirdPartyVaultLocationSchema>;
export type ThirdPartyVaultLocation = typeof thirdPartyVaultLocations.$inferSelect;

// Country Routing Rules - Maps user countries to vault locations
export const vaultCountryRoutingRules = pgTable("vault_country_routing_rules", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  countryCode: varchar("country_code", { length: 3 }).notNull(),
  countryName: varchar("country_name", { length: 100 }).notNull(),
  
  primaryVaultId: varchar("primary_vault_id", { length: 255 }).references(() => thirdPartyVaultLocations.id).notNull(),
  fallbackVaultId: varchar("fallback_vault_id", { length: 255 }).references(() => thirdPartyVaultLocations.id),
  
  priority: integer("priority").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  
  notes: text("notes"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertVaultCountryRoutingRuleSchema = createInsertSchema(vaultCountryRoutingRules).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertVaultCountryRoutingRule = z.infer<typeof insertVaultCountryRoutingRuleSchema>;
export type VaultCountryRoutingRule = typeof vaultCountryRoutingRules.$inferSelect;

// Physical Storage Certificates - WinGold bar inventory
export const physicalStorageCertificateStatusEnum = pgEnum('physical_storage_certificate_status', ['Active', 'Linked', 'Voided', 'Transferred']);

export const physicalStorageCertificates = pgTable("physical_storage_certificates", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  physicalStorageRef: varchar("physical_storage_ref", { length: 255 }).notNull().unique(),
  
  issuer: varchar("issuer", { length: 255 }).notNull().default('Wingold & Metals DMCC'),
  goldGrams: decimal("gold_grams", { precision: 20, scale: 6 }).notNull(),
  goldPurity: decimal("gold_purity", { precision: 5, scale: 4 }).notNull().default('0.9999'),
  
  barSerialNumber: varchar("bar_serial_number", { length: 255 }),
  barWeight: decimal("bar_weight", { precision: 20, scale: 6 }),
  barType: varchar("bar_type", { length: 50 }),
  
  vaultLocationId: varchar("vault_location_id", { length: 255 }).references(() => thirdPartyVaultLocations.id),
  countryCode: varchar("country_code", { length: 3 }),
  
  status: physicalStorageCertificateStatusEnum("status").notNull().default('Active'),
  
  linkedVaultCertificateId: varchar("linked_vault_certificate_id", { length: 255 }).references(() => certificates.id),
  linkedAt: timestamp("linked_at"),
  linkedBy: varchar("linked_by", { length: 255 }).references(() => users.id),
  
  documentUrl: text("document_url"),
  
  issuedAt: timestamp("issued_at").notNull().defaultNow(),
  voidedAt: timestamp("voided_at"),
  voidedBy: varchar("voided_by", { length: 255 }).references(() => users.id),
  voidReason: text("void_reason"),
  
  metadata: json("metadata").$type<Record<string, any>>(),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPhysicalStorageCertificateSchema = createInsertSchema(physicalStorageCertificates).omit({ id: true, createdAt: true, updatedAt: true, issuedAt: true });
export type InsertPhysicalStorageCertificate = z.infer<typeof insertPhysicalStorageCertificateSchema>;
export type PhysicalStorageCertificate = typeof physicalStorageCertificates.$inferSelect;

// Vault Reconciliation Runs - Audit trail of reconciliation checks
export const vaultReconciliationStatusEnum = pgEnum('vault_reconciliation_status', ['success', 'warning', 'error']);

export const vaultReconciliationRuns = pgTable("vault_reconciliation_runs", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  
  runDate: timestamp("run_date").notNull().defaultNow(),
  runBy: varchar("run_by", { length: 255 }).references(() => users.id),
  
  status: vaultReconciliationStatusEnum("status").notNull(),
  
  totalDigitalGrams: decimal("total_digital_grams", { precision: 20, scale: 6 }).notNull(),
  totalPhysicalGrams: decimal("total_physical_grams", { precision: 20, scale: 6 }).notNull(),
  discrepancyGrams: decimal("discrepancy_grams", { precision: 20, scale: 6 }).notNull(),
  
  mpgwGrams: decimal("mpgw_grams", { precision: 20, scale: 6 }).notNull().default('0'),
  fpgwGrams: decimal("fpgw_grams", { precision: 20, scale: 6 }).notNull().default('0'),
  
  unlinkedDeposits: integer("unlinked_deposits").notNull().default(0),
  countryMismatches: integer("country_mismatches").notNull().default(0),
  negativeBalances: integer("negative_balances").notNull().default(0),
  
  issuesJson: json("issues_json").$type<Array<{
    id: string;
    type: string;
    severity: string;
    description: string;
    affectedEntity: string;
    affectedEntityId: string;
    resolved: boolean;
  }>>(),
  
  reportUrl: text("report_url"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertVaultReconciliationRunSchema = createInsertSchema(vaultReconciliationRuns).omit({ id: true, createdAt: true, runDate: true });
export type InsertVaultReconciliationRun = z.infer<typeof insertVaultReconciliationRunSchema>;
export type VaultReconciliationRun = typeof vaultReconciliationRuns.$inferSelect;

// ============================================
// WORKFLOW AUDIT SYSTEM - Replication & Compare
// ============================================

export const workflowFlowTypeEnum = pgEnum('workflow_flow_type', [
  'ADD_FUNDS',
  'INTERNAL_TRANSFER_LGPW_TO_FGPW',
  'INTERNAL_TRANSFER_FGPW_TO_LGPW',
  'TRANSFER_USER_TO_USER',
  'WITHDRAWAL',
  'BNSL_ACTIVATION',
  'BNSL_PAYOUT',
  'FINABRIDGE_LOCK'
]);

export const workflowStepResultEnum = pgEnum('workflow_step_result', ['PASS', 'FAIL', 'PENDING', 'SKIPPED']);

export const workflowAuditLogs = pgTable("workflow_audit_logs", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  
  flowType: workflowFlowTypeEnum("flow_type").notNull(),
  flowInstanceId: varchar("flow_instance_id", { length: 255 }).notNull(),
  
  userId: varchar("user_id", { length: 255 }).references(() => users.id),
  transactionId: varchar("transaction_id", { length: 255 }).references(() => transactions.id),
  depositRequestId: varchar("deposit_request_id", { length: 255 }),
  
  stepKey: varchar("step_key", { length: 100 }).notNull(),
  stepOrder: integer("step_order").notNull(),
  
  expected: text("expected"),
  actual: text("actual"),
  
  result: workflowStepResultEnum("result").notNull().default('PENDING'),
  mismatchReason: text("mismatch_reason"),
  
  payloadJson: json("payload_json").$type<Record<string, any>>(),
  
  walletCredited: varchar("wallet_credited", { length: 20 }),
  ledgerEntryId: varchar("ledger_entry_id", { length: 255 }),
  certificateId: varchar("certificate_id", { length: 255 }),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertWorkflowAuditLogSchema = createInsertSchema(workflowAuditLogs).omit({ id: true, createdAt: true });
export type InsertWorkflowAuditLog = z.infer<typeof insertWorkflowAuditLogSchema>;
export type WorkflowAuditLog = typeof workflowAuditLogs.$inferSelect;

export const workflowAuditSummaries = pgTable("workflow_audit_summaries", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  
  flowType: workflowFlowTypeEnum("flow_type").notNull(),
  flowInstanceId: varchar("flow_instance_id", { length: 255 }).notNull().unique(),
  
  userId: varchar("user_id", { length: 255 }).references(() => users.id),
  transactionId: varchar("transaction_id", { length: 255 }),
  
  totalSteps: integer("total_steps").notNull().default(0),
  passedSteps: integer("passed_steps").notNull().default(0),
  failedSteps: integer("failed_steps").notNull().default(0),
  pendingSteps: integer("pending_steps").notNull().default(0),
  
  overallResult: workflowStepResultEnum("overall_result").notNull().default('PENDING'),
  
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  
  metadata: json("metadata").$type<Record<string, any>>(),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertWorkflowAuditSummarySchema = createInsertSchema(workflowAuditSummaries).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWorkflowAuditSummary = z.infer<typeof insertWorkflowAuditSummarySchema>;
export type WorkflowAuditSummary = typeof workflowAuditSummaries.$inferSelect;

// ============================================
// B2B INTEGRATION - Wingold Receiving Orders from Finatrades
// ============================================

export const b2bOrderStatusEnum = pgEnum('b2b_order_status', [
  'pending', 'confirmed', 'processing', 'partially_fulfilled', 'fulfilled', 'cancelled', 'failed'
]);

export const b2bCertificateTypeEnum = pgEnum('b2b_certificate_type', ['bar', 'storage']);

export const b2bOrders = pgTable("b2b_orders", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  finatradesRef: varchar("finatrades_ref", { length: 100 }).notNull().unique(),
  
  customerExternalId: varchar("customer_external_id", { length: 255 }).notNull(),
  customerEmail: varchar("customer_email", { length: 255 }).notNull(),
  customerName: varchar("customer_name", { length: 255 }).notNull(),
  
  barSize: wingoldBarSizeEnum("bar_size").notNull(),
  barCount: integer("bar_count").notNull(),
  totalGrams: decimal("total_grams", { precision: 18, scale: 6 }).notNull(),
  usdAmount: decimal("usd_amount", { precision: 18, scale: 2 }).notNull(),
  goldPricePerGram: decimal("gold_price_per_gram", { precision: 18, scale: 6 }).notNull(),
  
  preferredVaultLocationId: varchar("preferred_vault_location_id", { length: 255 }),
  actualVaultLocationId: varchar("actual_vault_location_id", { length: 255 }),
  
  webhookUrl: text("webhook_url").notNull(),
  status: b2bOrderStatusEnum("status").notNull().default('pending'),
  
  barsAllocated: integer("bars_allocated").notNull().default(0),
  certificatesIssued: integer("certificates_issued").notNull().default(0),
  
  confirmedAt: timestamp("confirmed_at"),
  fulfilledAt: timestamp("fulfilled_at"),
  cancelledAt: timestamp("cancelled_at"),
  cancellationReason: text("cancellation_reason"),
  
  metadata: json("metadata").$type<Record<string, any>>(),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertB2bOrderSchema = createInsertSchema(b2bOrders).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertB2bOrder = z.infer<typeof insertB2bOrderSchema>;
export type B2bOrder = typeof b2bOrders.$inferSelect;

export const b2bOrderBars = pgTable("b2b_order_bars", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id", { length: 255 }).notNull().references(() => b2bOrders.id),
  
  barId: varchar("bar_id", { length: 100 }).notNull().unique(),
  serialNumber: varchar("serial_number", { length: 100 }).notNull(),
  
  barSize: wingoldBarSizeEnum("bar_size").notNull(),
  weightGrams: decimal("weight_grams", { precision: 18, scale: 6 }).notNull(),
  purity: decimal("purity", { precision: 8, scale: 6 }).notNull().default('0.9999'),
  mint: varchar("mint", { length: 255 }),
  
  vaultLocationId: varchar("vault_location_id", { length: 255 }).notNull(),
  vaultLocationName: varchar("vault_location_name", { length: 255 }),
  
  allocatedAt: timestamp("allocated_at").notNull().defaultNow(),
  webhookSentAt: timestamp("webhook_sent_at"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertB2bOrderBarSchema = createInsertSchema(b2bOrderBars).omit({ id: true, createdAt: true });
export type InsertB2bOrderBar = z.infer<typeof insertB2bOrderBarSchema>;
export type B2bOrderBar = typeof b2bOrderBars.$inferSelect;

export const b2bCertificates = pgTable("b2b_certificates", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id", { length: 255 }).notNull().references(() => b2bOrders.id),
  barId: varchar("bar_id", { length: 255 }).references(() => b2bOrderBars.id),
  
  certificateNumber: varchar("certificate_number", { length: 100 }).notNull().unique(),
  certificateType: b2bCertificateTypeEnum("certificate_type").notNull(),
  
  pdfUrl: text("pdf_url"),
  jsonData: json("json_data").$type<Record<string, any>>(),
  
  issuedAt: timestamp("issued_at").notNull().defaultNow(),
  webhookSentAt: timestamp("webhook_sent_at"),
  signature: text("signature"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertB2bCertificateSchema = createInsertSchema(b2bCertificates).omit({ id: true, createdAt: true });
export type InsertB2bCertificate = z.infer<typeof insertB2bCertificateSchema>;
export type B2bCertificate = typeof b2bCertificates.$inferSelect;

export const b2bVaultLocations = pgTable("b2b_vault_locations", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 20 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  country: varchar("country", { length: 100 }).notNull(),
  address: text("address"),
  
  isActive: boolean("is_active").notNull().default(true),
  capacityKg: decimal("capacity_kg", { precision: 18, scale: 2 }),
  currentStockKg: decimal("current_stock_kg", { precision: 18, scale: 2 }).default('0'),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertB2bVaultLocationSchema = createInsertSchema(b2bVaultLocations).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertB2bVaultLocation = z.infer<typeof insertB2bVaultLocationSchema>;
export type B2bVaultLocation = typeof b2bVaultLocations.$inferSelect;

export const b2bWebhookLogs = pgTable("b2b_webhook_logs", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id", { length: 255 }).notNull().references(() => b2bOrders.id),
  
  event: varchar("event", { length: 50 }).notNull(),
  webhookUrl: text("webhook_url").notNull(),
  payload: json("payload").$type<Record<string, any>>(),
  
  httpStatus: integer("http_status"),
  responseBody: text("response_body"),
  
  success: boolean("success").notNull().default(false),
  retryCount: integer("retry_count").notNull().default(0),
  lastAttemptAt: timestamp("last_attempt_at").notNull().defaultNow(),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertB2bWebhookLogSchema = createInsertSchema(b2bWebhookLogs).omit({ id: true, createdAt: true });
export type InsertB2bWebhookLog = z.infer<typeof insertB2bWebhookLogSchema>;
export type B2bWebhookLog = typeof b2bWebhookLogs.$inferSelect;


// ============================================
// ADMIN VAULT MANAGEMENT - LGPW/FGPW SYSTEM
// ============================================

// Wallet Conversion Status
export const walletConversionStatusEnum = pgEnum('wallet_conversion_status', [
  'pending',           // Awaiting admin approval
  'approved',          // Admin approved, processing
  'completed',         // Conversion complete
  'rejected',          // Admin rejected
  'cancelled'          // User cancelled
]);

// Wallet Conversion Direction
export const walletConversionDirectionEnum = pgEnum('wallet_conversion_direction', [
  'LGPW_TO_FGPW',     // Market Price to Fixed Price (locks value, backend sells gold exposure)
  'FGPW_TO_LGPW'      // Fixed Price to Market Price (unlocks, backend buys gold exposure)
]);

// WALLET CONVERSIONS - Track all LGPW↔FGPW conversion requests
export const walletConversions = pgTable("wallet_conversions", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  
  // Conversion details
  direction: walletConversionDirectionEnum("direction").notNull(),
  goldGrams: decimal("gold_grams", { precision: 18, scale: 6 }).notNull(),
  
  // Price at time of request
  spotPriceUsdPerGram: decimal("spot_price_usd_per_gram", { precision: 12, scale: 4 }).notNull(),
  lockedValueUsd: decimal("locked_value_usd", { precision: 18, scale: 2 }).notNull(),
  
  // Fee/spread (configurable)
  feePercentage: decimal("fee_percentage", { precision: 5, scale: 4 }).default('0'),
  feeAmountUsd: decimal("fee_amount_usd", { precision: 12, scale: 2 }).default('0'),
  
  // Final execution price (may differ from request if admin adjusts)
  executionPriceUsdPerGram: decimal("execution_price_usd_per_gram", { precision: 12, scale: 4 }),
  executionValueUsd: decimal("execution_value_usd", { precision: 18, scale: 2 }),
  
  // Status and approval
  status: walletConversionStatusEnum("status").notNull().default('pending'),
  requestedAt: timestamp("requested_at").notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: varchar("reviewed_by", { length: 255 }).references(() => users.id),
  completedAt: timestamp("completed_at"),
  
  // Admin notes
  adminNotes: text("admin_notes"),
  rejectionReason: text("rejection_reason"),
  
  // Links to ledger entries created
  ledgerDebitId: varchar("ledger_debit_id", { length: 255 }),
  ledgerCreditId: varchar("ledger_credit_id", { length: 255 }),
  fpgwBatchId: varchar("fpgw_batch_id", { length: 255 }).references(() => fpgwBatches.id),
  cashLedgerEntryId: varchar("cash_ledger_entry_id", { length: 255 }),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertWalletConversionSchema = createInsertSchema(walletConversions).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWalletConversion = z.infer<typeof insertWalletConversionSchema>;
export type WalletConversion = typeof walletConversions.$inferSelect;

// Cash Safety Ledger Entry Type
export const cashLedgerEntryTypeEnum = pgEnum('cash_ledger_entry_type', [
  'FGPW_LOCK',           // Cash credited when user locks LGPW→FGPW
  'FGPW_UNLOCK',         // Cash debited when user unlocks FGPW→LGPW
  'BANK_DEPOSIT',        // Manual deposit from bank
  'BANK_WITHDRAWAL',     // Manual withdrawal to bank
  'ADJUSTMENT',          // Admin adjustment
  'FEE_REVENUE'          // Fee collected from conversions
]);

// CASH SAFETY LEDGER - Track cash backing for FGPW positions
export const cashSafetyLedger = pgTable("cash_safety_ledger", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  
  // Entry details
  entryType: cashLedgerEntryTypeEnum("entry_type").notNull(),
  amountUsd: decimal("amount_usd", { precision: 18, scale: 2 }).notNull(),
  direction: varchar("direction", { length: 10 }).notNull(), // 'credit' or 'debit'
  
  // Running balance after this entry
  runningBalanceUsd: decimal("running_balance_usd", { precision: 18, scale: 2 }).notNull(),
  
  // Reference to what triggered this entry
  conversionId: varchar("conversion_id", { length: 255 }).references(() => walletConversions.id),
  userId: varchar("user_id", { length: 255 }).references(() => users.id),
  
  // Bank transaction details (for manual deposits/withdrawals)
  bankReference: varchar("bank_reference", { length: 255 }),
  bankAccountLast4: varchar("bank_account_last4", { length: 4 }),
  
  // Admin who created (for manual entries)
  createdBy: varchar("created_by", { length: 255 }).references(() => users.id),
  notes: text("notes"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCashSafetyLedgerSchema = createInsertSchema(cashSafetyLedger).omit({ id: true, createdAt: true });
export type InsertCashSafetyLedger = z.infer<typeof insertCashSafetyLedgerSchema>;
export type CashSafetyLedger = typeof cashSafetyLedger.$inferSelect;

// Reconciliation Alert Severity
export const reconciliationAlertSeverityEnum = pgEnum('reconciliation_alert_severity', [
  'info',              // Informational
  'warning',           // Needs attention
  'critical'           // Immediate action required
]);

// Reconciliation Alert Type
export const reconciliationAlertTypeEnum = pgEnum('reconciliation_alert_type', [
  'LGPW_EXCEEDS_PHYSICAL',       // Total LGPW > physical inventory
  'FGPW_EXCEEDS_CASH',           // Total FGPW value > cash safety balance
  'INVENTORY_MISMATCH',          // Wingold inventory doesn't match our records
  'LARGE_CONVERSION',            // Conversion > threshold (e.g., 100g)
  'CASH_LOW',                    // Cash safety account running low
  'MANUAL_ADJUSTMENT'            // Admin made manual adjustment
]);

// RECONCILIATION ALERTS - Alert when platform exposure is out of balance
export const reconciliationAlerts = pgTable("reconciliation_alerts", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  
  alertType: reconciliationAlertTypeEnum("alert_type").notNull(),
  severity: reconciliationAlertSeverityEnum("severity").notNull(),
  
  // Alert details
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  
  // Numeric data for dashboard
  expectedValue: decimal("expected_value", { precision: 18, scale: 6 }),
  actualValue: decimal("actual_value", { precision: 18, scale: 6 }),
  differenceValue: decimal("difference_value", { precision: 18, scale: 6 }),
  differencePercentage: decimal("difference_percentage", { precision: 8, scale: 4 }),
  
  // Resolution
  isResolved: boolean("is_resolved").notNull().default(false),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: varchar("resolved_by", { length: 255 }).references(() => users.id),
  resolutionNotes: text("resolution_notes"),
  
  // Metadata
  metadata: json("metadata").$type<Record<string, any>>(),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertReconciliationAlertSchema = createInsertSchema(reconciliationAlerts).omit({ id: true, createdAt: true });
export type InsertReconciliationAlert = z.infer<typeof insertReconciliationAlertSchema>;
export type ReconciliationAlert = typeof reconciliationAlerts.$inferSelect;

// PLATFORM EXPOSURE SNAPSHOT - Daily snapshots for audit trail
export const platformExposureSnapshots = pgTable("platform_exposure_snapshots", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  
  snapshotDate: timestamp("snapshot_date").notNull(),
  
  // LGPW exposure (physical gold liability)
  totalMpgwGrams: decimal("total_mpgw_grams", { precision: 18, scale: 6 }).notNull(),
  totalMpgwValueUsd: decimal("total_mpgw_value_usd", { precision: 18, scale: 2 }).notNull(),
  
  // FGPW exposure (cash liability)
  totalFpgwGrams: decimal("total_fpgw_grams", { precision: 18, scale: 6 }).notNull(),
  totalFpgwLockedValueUsd: decimal("total_fpgw_locked_value_usd", { precision: 18, scale: 2 }).notNull(),
  
  // Physical inventory
  physicalInventoryGrams: decimal("physical_inventory_grams", { precision: 18, scale: 6 }).notNull(),
  physicalInventoryValueUsd: decimal("physical_inventory_value_usd", { precision: 18, scale: 2 }).notNull(),
  
  // Cash safety account
  cashSafetyBalanceUsd: decimal("cash_safety_balance_usd", { precision: 18, scale: 2 }).notNull(),
  
  // Gold price at snapshot
  goldPriceUsdPerGram: decimal("gold_price_usd_per_gram", { precision: 12, scale: 4 }).notNull(),
  goldPriceUsdPerOunce: decimal("gold_price_usd_per_ounce", { precision: 12, scale: 2 }).notNull(),
  
  // Coverage ratios
  mpgwCoverageRatio: decimal("mpgw_coverage_ratio", { precision: 8, scale: 4 }).notNull(), // physical / LGPW
  fpgwCoverageRatio: decimal("fpgw_coverage_ratio", { precision: 8, scale: 4 }).notNull(), // cash / FGPW value
  
  // User counts
  totalUsersWithMpgw: integer("total_users_with_mpgw").notNull().default(0),
  totalUsersWithFpgw: integer("total_users_with_fpgw").notNull().default(0),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPlatformExposureSnapshotSchema = createInsertSchema(platformExposureSnapshots).omit({ id: true, createdAt: true });
export type InsertPlatformExposureSnapshot = z.infer<typeof insertPlatformExposureSnapshotSchema>;
export type PlatformExposureSnapshot = typeof platformExposureSnapshots.$inferSelect;

// ============================================
// UNIFIED GOLD TALLY SYSTEM
// ============================================

// Transaction type for unified tally
export const unifiedTallyTxnTypeEnum = pgEnum('unified_tally_txn_type', [
  'FIAT_CRYPTO_DEPOSIT',    // Card, Bank, or Crypto payment for gold
  'VAULT_GOLD_DEPOSIT'      // Physical gold deposited into vault
]);

// Source method for deposits
export const unifiedTallySourceMethodEnum = pgEnum('unified_tally_source_method', [
  'CARD',        // Credit/Debit card payment
  'BANK',        // Bank wire transfer
  'CRYPTO',      // Cryptocurrency payment
  'VAULT_GOLD'   // Physical gold deposit
]);

// Pricing mode for gold rate
export const unifiedTallyPricingModeEnum = pgEnum('unified_tally_pricing_mode', [
  'MARKET',   // Market price at time of approval
  'FIXED'     // Fixed price (FGPW)
]);

// Status enum for unified tally lifecycle
export const unifiedTallyStatusEnum = pgEnum('unified_tally_status', [
  'PENDING_PAYMENT',       // Awaiting payment confirmation
  'PAYMENT_CONFIRMED',     // Payment received, awaiting physical allocation
  'PHYSICAL_ORDERED',      // Order placed with Wingold
  'PHYSICAL_ALLOCATED',    // Physical gold allocated (bars assigned)
  'CERT_RECEIVED',         // Storage certificate received
  'CREDITED',              // Wallet credited, awaiting completion
  'COMPLETED',             // Fully completed
  'REJECTED',              // Rejected by admin
  'FAILED'                 // Failed (payment failed, etc.)
]);

// Unified Gold Tally Transactions - Single source of truth for all gold deposits
export const unifiedTallyTransactions = pgTable("unified_tally_transactions", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  
  // Core transaction info
  txnId: varchar("txn_id", { length: 50 }).notNull().unique(), // Human-readable ID like UGT-2026-001234
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  userName: varchar("user_name", { length: 255 }), // Denormalized for display
  userEmail: varchar("user_email", { length: 255 }), // Denormalized for display
  
  // Transaction classification
  txnType: unifiedTallyTxnTypeEnum("txn_type").notNull(),
  sourceMethod: unifiedTallySourceMethodEnum("source_method").notNull(),
  walletType: goldWalletTypeEnum("wallet_type").notNull().default('LGPW'),
  status: unifiedTallyStatusEnum("status").notNull().default('PENDING_PAYMENT'),
  
  // Money In (for FIAT/CRYPTO deposits)
  depositCurrency: varchar("deposit_currency", { length: 10 }).default('USD'),
  depositAmount: decimal("deposit_amount", { precision: 18, scale: 2 }).default('0'),
  feeAmount: decimal("fee_amount", { precision: 18, scale: 2 }).default('0'),
  feeCurrency: varchar("fee_currency", { length: 10 }).default('USD'),
  netAmount: decimal("net_amount", { precision: 18, scale: 2 }).default('0'), // deposit - fee
  
  // Payment reference
  paymentReference: varchar("payment_reference", { length: 255 }),
  paymentConfirmedAt: timestamp("payment_confirmed_at"),
  
  // Rate & Digital Credit calculation
  pricingMode: unifiedTallyPricingModeEnum("pricing_mode").default('MARKET'),
  goldRateValue: decimal("gold_rate_value", { precision: 12, scale: 4 }), // USD per gram
  rateTimestamp: timestamp("rate_timestamp"),
  goldEquivalentG: decimal("gold_equivalent_g", { precision: 18, scale: 6 }), // net_amount / rate
  goldCreditedG: decimal("gold_credited_g", { precision: 18, scale: 6 }), // Actual grams credited
  goldCreditedValueUsd: decimal("gold_credited_value_usd", { precision: 18, scale: 2 }), // Display value
  
  // FinaVault deposit (for VAULT_GOLD_DEPOSIT only)
  vaultGoldDepositedG: decimal("vault_gold_deposited_g", { precision: 18, scale: 6 }),
  vaultDepositCertificateId: varchar("vault_deposit_certificate_id", { length: 255 }),
  vaultDepositVerifiedBy: varchar("vault_deposit_verified_by", { length: 255 }),
  vaultDepositVerifiedAt: timestamp("vault_deposit_verified_at"),
  
  // Wingold & Metals procurement (physical proof)
  wingoldOrderId: varchar("wingold_order_id", { length: 100 }),
  wingoldSupplierInvoiceId: varchar("wingold_supplier_invoice_id", { length: 100 }),
  physicalGoldAllocatedG: decimal("physical_gold_allocated_g", { precision: 18, scale: 6 }),
  wingoldBuyRate: decimal("wingold_buy_rate", { precision: 12, scale: 4 }), // USD per gram Wingold bought at
  wingoldCostUsd: decimal("wingold_cost_usd", { precision: 18, scale: 2 }), // Total cost to Wingold
  barLotSerialsJson: json("bar_lot_serials_json").$type<Array<{
    serial: string;
    purity: number;
    weightG: number;
    notes?: string;
  }>>(),
  vaultLocation: varchar("vault_location", { length: 255 }),
  
  // Certificate (required for approval)
  storageCertificateId: varchar("storage_certificate_id", { length: 255 }),
  certificateFileUrl: text("certificate_file_url"),
  certificateDate: timestamp("certificate_date"),
  
  // Costs & Profit calculation
  gatewayCostUsd: decimal("gateway_cost_usd", { precision: 18, scale: 2 }).default('0'),
  bankCostUsd: decimal("bank_cost_usd", { precision: 18, scale: 2 }).default('0'),
  networkCostUsd: decimal("network_cost_usd", { precision: 18, scale: 2 }).default('0'),
  opsCostUsd: decimal("ops_cost_usd", { precision: 18, scale: 2 }).default('0'),
  totalCostsUsd: decimal("total_costs_usd", { precision: 18, scale: 2 }).default('0'),
  netProfitUsd: decimal("net_profit_usd", { precision: 18, scale: 2 }).default('0'),
  
  // Audit trail
  approvedBy: varchar("approved_by", { length: 255 }).references(() => users.id),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  notes: text("notes"),
  
  // Metadata
  createdBy: varchar("created_by", { length: 255 }).references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUnifiedTallyTransactionSchema = createInsertSchema(unifiedTallyTransactions)
  .omit({ id: true, txnId: true, createdAt: true, updatedAt: true })
  .extend({
    barLotSerialsJson: z.array(z.object({
      serial: z.string(),
      purity: z.number().default(999.9),
      weightG: z.number(),
      notes: z.string().optional(),
    })).nullable().optional(),
  });
export type InsertUnifiedTallyTransaction = z.infer<typeof insertUnifiedTallyTransactionSchema>;
export type UnifiedTallyTransaction = typeof unifiedTallyTransactions.$inferSelect;

// Unified Tally Events - Audit trail for status changes
export const unifiedTallyEventTypeEnum = pgEnum('unified_tally_event_type', [
  'CREATED',
  'PAYMENT_CONFIRMED',
  'PHYSICAL_ORDERED',
  'PHYSICAL_ALLOCATED',
  'BARS_ASSIGNED',
  'CERT_RECEIVED',
  'APPROVED',
  'CREDITED',
  'COMPLETED',
  'REJECTED',
  'FAILED',
  'NOTE_ADDED',
  'MODIFIED'
]);

export const unifiedTallyEvents = pgTable("unified_tally_events", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  tallyId: varchar("tally_id", { length: 255 }).notNull().references(() => unifiedTallyTransactions.id),
  eventType: unifiedTallyEventTypeEnum("event_type").notNull(),
  
  // Event details
  previousStatus: unifiedTallyStatusEnum("previous_status"),
  newStatus: unifiedTallyStatusEnum("new_status"),
  details: json("details").$type<Record<string, any>>(),
  notes: text("notes"),
  
  // Who triggered this event
  triggeredBy: varchar("triggered_by", { length: 255 }).references(() => users.id),
  triggeredByName: varchar("triggered_by_name", { length: 255 }),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUnifiedTallyEventSchema = createInsertSchema(unifiedTallyEvents).omit({ id: true, createdAt: true });
export type InsertUnifiedTallyEvent = z.infer<typeof insertUnifiedTallyEventSchema>;
export type UnifiedTallyEvent = typeof unifiedTallyEvents.$inferSelect;

// Wingold Allocations - Track physical gold allocated per user
export const wingoldAllocations = pgTable("wingold_allocations", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  
  // Links
  tallyId: varchar("tally_id", { length: 255 }).references(() => unifiedTallyTransactions.id),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  
  // Allocation details
  allocatedG: decimal("allocated_g", { precision: 18, scale: 6 }).notNull(),
  vaultLocation: varchar("vault_location", { length: 255 }).notNull(),
  certificateId: varchar("certificate_id", { length: 255 }),
  
  // Wingold order info
  wingoldOrderId: varchar("wingold_order_id", { length: 100 }),
  wingoldInvoiceId: varchar("wingold_invoice_id", { length: 100 }),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertWingoldAllocationSchema = createInsertSchema(wingoldAllocations).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWingoldAllocation = z.infer<typeof insertWingoldAllocationSchema>;
export type WingoldAllocation = typeof wingoldAllocations.$inferSelect;

// Wingold Bars - Individual bar tracking
export const wingoldBars = pgTable("wingold_bars", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  
  // Links
  allocationId: varchar("allocation_id", { length: 255 }).references(() => wingoldAllocations.id),
  tallyId: varchar("tally_id", { length: 255 }).references(() => unifiedTallyTransactions.id),
  
  // Bar details
  serial: varchar("serial", { length: 100 }).notNull().unique(),
  purity: decimal("purity", { precision: 5, scale: 2 }).notNull().default('999.9'),
  weightG: decimal("weight_g", { precision: 18, scale: 6 }).notNull(),
  vaultLocation: varchar("vault_location", { length: 255 }).notNull(),
  
  // Additional info
  notes: text("notes"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertWingoldBarSchema = createInsertSchema(wingoldBars).omit({ id: true, createdAt: true });
export type InsertWingoldBar = z.infer<typeof insertWingoldBarSchema>;
export type WingoldBar = typeof wingoldBars.$inferSelect;

// ====================================
// PHYSICAL GOLD DEPOSIT WORKFLOW
// ====================================

// Gold Item Types for Physical Deposits
export const goldItemTypeEnum = pgEnum('gold_item_type', ['RAW', 'GOLD_BAR', 'GOLD_COIN', 'OTHER']);

// Extended status for physical deposit workflow
export const physicalDepositStatusEnum = pgEnum('physical_deposit_status', [
  'SUBMITTED',
  'UNDER_REVIEW', 
  'RECEIVED',
  'INSPECTION',
  'NEGOTIATION',
  'AGREED',
  'READY_FOR_PAYMENT',  // Ready for UFM approval (after inspection/negotiation complete)
  'APPROVED',
  'REJECTED',
  'CANCELLED'
]);

// Deposit Items - Individual gold items in a deposit request
export const depositItems = pgTable("deposit_items", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  depositRequestId: varchar("deposit_request_id", { length: 255 }).notNull(),
  
  // Item details
  itemType: goldItemTypeEnum("item_type").notNull(),
  quantity: integer("quantity").notNull().default(1),
  weightPerUnitGrams: decimal("weight_per_unit_grams", { precision: 18, scale: 6 }).notNull(),
  totalDeclaredWeightGrams: decimal("total_declared_weight_grams", { precision: 18, scale: 6 }).notNull(),
  purity: varchar("purity", { length: 20 }).notNull(), // '999.9', '995', '916', 'Unknown'
  
  // Brand/Mint details
  brand: varchar("brand", { length: 255 }),
  mint: varchar("mint", { length: 255 }),
  serialNumber: varchar("serial_number", { length: 100 }),
  customDescription: text("custom_description"),
  
  // Photos
  photoFrontUrl: varchar("photo_front_url", { length: 500 }),
  photoBackUrl: varchar("photo_back_url", { length: 500 }),
  additionalPhotos: json("additional_photos").$type<string[]>(),
  
  // After inspection
  verifiedWeightGrams: decimal("verified_weight_grams", { precision: 18, scale: 6 }),
  verifiedPurity: varchar("verified_purity", { length: 20 }),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertDepositItemSchema = createInsertSchema(depositItems).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDepositItem = z.infer<typeof insertDepositItemSchema>;
export type DepositItem = typeof depositItems.$inferSelect;

// Deposit Inspections - Assay and verification results
export const depositInspections = pgTable("deposit_inspections", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  depositRequestId: varchar("deposit_request_id", { length: 255 }).notNull(),
  inspectorId: varchar("inspector_id", { length: 255 }).notNull().references(() => users.id),
  
  // Inspection results
  grossWeightGrams: decimal("gross_weight_grams", { precision: 18, scale: 6 }).notNull(),
  netWeightGrams: decimal("net_weight_grams", { precision: 18, scale: 6 }).notNull(),
  purityResult: varchar("purity_result", { length: 20 }).notNull(),
  assayMethod: varchar("assay_method", { length: 100 }), // 'XRF', 'Fire Assay', 'Visual', etc.
  
  // Fees and deductions
  assayFeeUsd: decimal("assay_fee_usd", { precision: 12, scale: 2 }).default('0'),
  refiningFeeUsd: decimal("refining_fee_usd", { precision: 12, scale: 2 }).default('0'),
  handlingFeeUsd: decimal("handling_fee_usd", { precision: 12, scale: 2 }).default('0'),
  otherFeesUsd: decimal("other_fees_usd", { precision: 12, scale: 2 }).default('0'),
  totalFeesUsd: decimal("total_fees_usd", { precision: 12, scale: 2 }).default('0'),
  
  // Calculated credited grams after fees
  creditedGrams: decimal("credited_grams", { precision: 18, scale: 6 }).notNull(),
  
  // Documents
  assayReportUrl: varchar("assay_report_url", { length: 500 }),
  inspectionPhotos: json("inspection_photos").$type<string[]>(),
  
  // Notes
  inspectorNotes: text("inspector_notes"),
  discrepancyNotes: text("discrepancy_notes"),
  
  inspectedAt: timestamp("inspected_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDepositInspectionSchema = createInsertSchema(depositInspections).omit({ id: true, createdAt: true });
export type InsertDepositInspection = z.infer<typeof insertDepositInspectionSchema>;
export type DepositInspection = typeof depositInspections.$inferSelect;

// Deposit Negotiation Messages - Offer/Counter history for RAW/OTHER
export const depositNegotiationMessages = pgTable("deposit_negotiation_messages", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  depositRequestId: varchar("deposit_request_id", { length: 255 }).notNull(),
  
  // Message type
  messageType: varchar("message_type", { length: 20 }).notNull(), // 'ADMIN_OFFER', 'USER_COUNTER', 'USER_ACCEPT', 'ADMIN_ACCEPT', 'USER_REJECT'
  senderId: varchar("sender_id", { length: 255 }).notNull().references(() => users.id),
  senderRole: varchar("sender_role", { length: 20 }).notNull(), // 'admin', 'user'
  
  // Offer details
  proposedGrams: decimal("proposed_grams", { precision: 18, scale: 6 }),
  proposedPurity: varchar("proposed_purity", { length: 20 }),
  proposedFees: decimal("proposed_fees", { precision: 12, scale: 2 }),
  goldPriceAtTime: decimal("gold_price_at_time", { precision: 12, scale: 2 }),
  
  // Message content
  message: text("message"),
  
  // Response tracking
  isLatest: boolean("is_latest").default(true),
  respondedAt: timestamp("responded_at"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDepositNegotiationMessageSchema = createInsertSchema(depositNegotiationMessages).omit({ id: true, createdAt: true });
export type InsertDepositNegotiationMessage = z.infer<typeof insertDepositNegotiationMessageSchema>;
export type DepositNegotiationMessage = typeof depositNegotiationMessages.$inferSelect;

// Physical Deposit Requests - Enhanced table for full workflow
export const physicalDepositRequests = pgTable("physical_deposit_requests", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  referenceNumber: varchar("reference_number", { length: 100 }).notNull().unique(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  
  // Deposit type (determines workflow)
  depositType: goldItemTypeEnum("deposit_type").notNull(),
  requiresNegotiation: boolean("requires_negotiation").notNull().default(false),
  
  // Totals (calculated from items)
  totalDeclaredWeightGrams: decimal("total_declared_weight_grams", { precision: 18, scale: 6 }).notNull(),
  itemCount: integer("item_count").notNull().default(1),
  
  // Ownership declaration
  isBeneficialOwner: boolean("is_beneficial_owner").notNull().default(true),
  sourceOfMetal: varchar("source_of_metal", { length: 255 }),
  sourceDetails: text("source_details"),
  
  // Delivery method
  deliveryMethod: varchar("delivery_method", { length: 50 }).notNull(), // 'PERSONAL_DROPOFF', 'COURIER', 'ARMORED_PICKUP'
  pickupAddress: text("pickup_address"),
  pickupContactName: varchar("pickup_contact_name", { length: 255 }),
  pickupContactPhone: varchar("pickup_contact_phone", { length: 50 }),
  preferredDatetime: timestamp("preferred_datetime"),
  scheduledDatetime: timestamp("scheduled_datetime"),
  
  // Documents
  invoiceUrl: varchar("invoice_url", { length: 500 }),
  assayCertificateUrl: varchar("assay_certificate_url", { length: 500 }),
  additionalDocuments: json("additional_documents").$type<{name: string; url: string}[]>(),
  
  // Declarations
  noLienDispute: boolean("no_lien_dispute").notNull().default(false),
  acceptVaultTerms: boolean("accept_vault_terms").notNull().default(false),
  acceptInsurance: boolean("accept_insurance").notNull().default(false),
  acceptFees: boolean("accept_fees").notNull().default(false),
  
  // Status workflow
  status: physicalDepositStatusEnum("status").notNull().default('SUBMITTED'),
  
  // Negotiation - USD Value Tracking
  usdEstimateFromUser: decimal("usd_estimate_from_user", { precision: 18, scale: 2 }), // User's optional target
  usdCounterFromAdmin: decimal("usd_counter_from_admin", { precision: 18, scale: 2 }), // Admin's latest offer
  usdAgreedValue: decimal("usd_agreed_value", { precision: 18, scale: 2 }), // Final agreed value
  negotiationNotes: text("negotiation_notes"),
  userAcceptedAt: timestamp("user_accepted_at"),
  adminAcceptedAt: timestamp("admin_accepted_at"),
  
  // Admin processing
  assignedTo: varchar("assigned_to", { length: 255 }).references(() => users.id),
  reviewedBy: varchar("reviewed_by", { length: 255 }).references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  
  // Receipt
  receivedAt: timestamp("received_at"),
  receivedBy: varchar("received_by", { length: 255 }).references(() => users.id),
  batchLotId: varchar("batch_lot_id", { length: 100 }),
  
  // Inspection reference
  inspectionId: varchar("inspection_id", { length: 255 }),
  
  // Final approval
  approvedAt: timestamp("approved_at"),
  approvedBy: varchar("approved_by", { length: 255 }).references(() => users.id),
  
  // Credited amount
  finalCreditedGrams: decimal("final_credited_grams", { precision: 18, scale: 6 }),
  goldPriceAtApproval: decimal("gold_price_at_approval", { precision: 12, scale: 2 }),
  goldPriceAtSubmission: decimal("gold_price_at_submission", { precision: 12, scale: 2 }), // Price locked at submission time
  
  // Generated certificates (dual)
  physicalStorageCertificateId: varchar("physical_storage_certificate_id", { length: 255 }).references(() => certificates.id),
  digitalOwnershipCertificateId: varchar("digital_ownership_certificate_id", { length: 255 }).references(() => certificates.id),
  
  // Wallet credit reference
  walletTransactionId: varchar("wallet_transaction_id", { length: 255 }).references(() => transactions.id),
  
  // Admin notes
  adminNotes: text("admin_notes"),
  rejectionReason: text("rejection_reason"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPhysicalDepositRequestSchema = createInsertSchema(physicalDepositRequests).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPhysicalDepositRequest = z.infer<typeof insertPhysicalDepositRequestSchema>;
export type PhysicalDepositRequest = typeof physicalDepositRequests.$inferSelect;

// ============================================
// VERIFIABLE CREDENTIALS (W3C VC 2.0)
// ============================================

export const credentialStatusEnum = pgEnum('credential_status', ['active', 'revoked', 'expired', 'suspended']);
export const credentialTypeEnum = pgEnum('credential_type', ['kyc', 'identity', 'aml_screening', 'address_verification']);

export const verifiableCredentials = pgTable("verifiable_credentials", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  credentialId: varchar("credential_id", { length: 100 }).notNull().unique(), // jti claim - unique identifier
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  
  // Credential type and version
  credentialType: credentialTypeEnum("credential_type").notNull().default('kyc'),
  schemaVersion: varchar("schema_version", { length: 20 }).notNull().default('1.0'),
  
  // W3C VC fields
  issuerDid: varchar("issuer_did", { length: 255 }).notNull(), // did:web:finatrades.com
  subjectDid: varchar("subject_did", { length: 255 }), // did:key:user... (optional)
  
  // The signed credential
  vcJwt: text("vc_jwt").notNull(), // Full signed JWT containing the VC
  vcPayload: json("vc_payload").$type<{
    '@context': string[];
    type: string[];
    issuer: { id: string; name: string };
    issuanceDate: string;
    expirationDate: string;
    credentialSubject: Record<string, any>;
  }>(), // Decoded payload for querying
  
  // Claims summary (for quick access without decoding)
  claimsSummary: json("claims_summary").$type<{
    kycLevel?: string;
    kycStatus?: string;
    idVerified?: boolean;
    addressVerified?: boolean;
    amlPassed?: boolean;
    documentHashes?: Record<string, string>;
  }>(),
  
  // Status tracking
  status: credentialStatusEnum("status").notNull().default('active'),
  
  // Validity period
  issuedAt: timestamp("issued_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  
  // Signing key reference
  keyId: varchar("key_id", { length: 100 }), // kid from JWKS for key rotation
  signatureAlgorithm: varchar("signature_algorithm", { length: 20 }).notNull().default('RS256'),
  
  // Audit fields
  issuedBy: varchar("issued_by", { length: 255 }), // admin or system
  presentationCount: integer("presentation_count").notNull().default(0),
  lastPresentedAt: timestamp("last_presented_at"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertVerifiableCredentialSchema = createInsertSchema(verifiableCredentials)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    vcPayload: z.any().optional(),
    claimsSummary: z.any().optional(),
    subjectDid: z.string().nullable().optional(),
    keyId: z.string().nullable().optional(),
    issuedBy: z.string().nullable().optional(),
    lastPresentedAt: z.date().nullable().optional(),
  });
export type InsertVerifiableCredential = z.infer<typeof insertVerifiableCredentialSchema>;
export type VerifiableCredential = typeof verifiableCredentials.$inferSelect;

// Credential Revocations - Tracks revoked credentials with reasons
export const revocationReasonEnum = pgEnum('revocation_reason', [
  'user_request', 'kyc_expired', 'kyc_rejected', 'security_concern', 
  'data_update', 'key_rotation', 'compliance', 'admin_action'
]);

export const credentialRevocations = pgTable("credential_revocations", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  credentialId: varchar("credential_id", { length: 100 }).notNull().references(() => verifiableCredentials.credentialId),
  
  // Revocation details
  reason: revocationReasonEnum("reason").notNull(),
  reasonDetails: text("reason_details"),
  
  // Who revoked
  revokedBy: varchar("revoked_by", { length: 255 }).references(() => users.id),
  revokedBySystem: boolean("revoked_by_system").notNull().default(false),
  
  // Replacement credential (if reissued)
  replacementCredentialId: varchar("replacement_credential_id", { length: 100 }),
  
  revokedAt: timestamp("revoked_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCredentialRevocationSchema = createInsertSchema(credentialRevocations)
  .omit({ id: true, createdAt: true })
  .extend({
    reasonDetails: z.string().nullable().optional(),
    revokedBy: z.string().nullable().optional(),
    replacementCredentialId: z.string().nullable().optional(),
  });
export type InsertCredentialRevocation = z.infer<typeof insertCredentialRevocationSchema>;
export type CredentialRevocation = typeof credentialRevocations.$inferSelect;

// Credential Presentations - Audit log of when credentials were presented
export const credentialPresentations = pgTable("credential_presentations", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  credentialId: varchar("credential_id", { length: 100 }).notNull().references(() => verifiableCredentials.credentialId),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  
  // Where it was presented
  verifierDomain: varchar("verifier_domain", { length: 255 }).notNull(), // wingoldandmetals.com
  verifierName: varchar("verifier_name", { length: 255 }), // Wingold & Metals
  
  // What was shared (selective disclosure)
  claimsShared: json("claims_shared").$type<string[]>(), // List of claim names shared
  
  // Verification result
  verificationSuccessful: boolean("verification_successful").notNull().default(true),
  verificationError: text("verification_error"),
  
  // Context
  presentationContext: varchar("presentation_context", { length: 100 }), // 'sso', 'api_request', 'manual'
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  
  presentedAt: timestamp("presented_at").notNull().defaultNow(),
});

export const insertCredentialPresentationSchema = createInsertSchema(credentialPresentations)
  .omit({ id: true })
  .extend({
    verifierName: z.string().nullable().optional(),
    claimsShared: z.array(z.string()).nullable().optional(),
    verificationError: z.string().nullable().optional(),
    presentationContext: z.string().nullable().optional(),
    ipAddress: z.string().nullable().optional(),
    userAgent: z.string().nullable().optional(),
  });
export type InsertCredentialPresentation = z.infer<typeof insertCredentialPresentationSchema>;
export type CredentialPresentation = typeof credentialPresentations.$inferSelect;


// ============================================
// PRICE ALERTS
// ============================================

export const priceAlertDirectionEnum = pgEnum('price_alert_direction', ['above', 'below']);
export const priceAlertChannelEnum = pgEnum('price_alert_channel', ['email', 'push', 'in_app', 'all']);

export const priceAlerts = pgTable("price_alerts", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  targetPricePerGram: decimal("target_price_per_gram", { precision: 12, scale: 4 }).notNull(),
  direction: priceAlertDirectionEnum("direction").notNull(), // 'above' or 'below'
  channel: priceAlertChannelEnum("channel").notNull().default('all'),
  isActive: boolean("is_active").notNull().default(true),
  triggeredAt: timestamp("triggered_at"),
  notificationSentAt: timestamp("notification_sent_at"),
  note: text("note"), // Optional user note
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPriceAlertSchema = createInsertSchema(priceAlerts)
  .omit({ id: true, createdAt: true, updatedAt: true, triggeredAt: true, notificationSentAt: true })
  .extend({
    note: z.string().nullable().optional(),
  });
export type InsertPriceAlert = z.infer<typeof insertPriceAlertSchema>;
export type PriceAlert = typeof priceAlerts.$inferSelect;

// ============================================
// AUTO-BUY / DCA (Dollar Cost Averaging)
// ============================================

export const dcaFrequencyEnum = pgEnum('dca_frequency', ['daily', 'weekly', 'biweekly', 'monthly']);
export const dcaPlanStatusEnum = pgEnum('dca_plan_status', ['active', 'paused', 'cancelled', 'completed']);
export const dcaExecutionStatusEnum = pgEnum('dca_execution_status', ['pending', 'processing', 'completed', 'failed', 'skipped']);

export const dcaPlans = pgTable("dca_plans", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  name: varchar("name", { length: 255 }), // Optional plan name
  amountUsd: decimal("amount_usd", { precision: 12, scale: 2 }).notNull(), // Amount in USD per purchase
  frequency: dcaFrequencyEnum("frequency").notNull(),
  dayOfWeek: integer("day_of_week"), // 0-6 for weekly (Sunday=0)
  dayOfMonth: integer("day_of_month"), // 1-31 for monthly
  nextRunAt: timestamp("next_run_at").notNull(),
  lastRunAt: timestamp("last_run_at"),
  status: dcaPlanStatusEnum("status").notNull().default('active'),
  totalExecutions: integer("total_executions").notNull().default(0),
  totalGoldPurchased: decimal("total_gold_purchased", { precision: 18, scale: 8 }).notNull().default('0'),
  totalUsdSpent: decimal("total_usd_spent", { precision: 12, scale: 2 }).notNull().default('0'),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertDcaPlanSchema = createInsertSchema(dcaPlans)
  .omit({ id: true, createdAt: true, updatedAt: true, lastRunAt: true, totalExecutions: true, totalGoldPurchased: true, totalUsdSpent: true })
  .extend({
    name: z.string().nullable().optional(),
    dayOfWeek: z.number().min(0).max(6).nullable().optional(),
    dayOfMonth: z.number().min(1).max(31).nullable().optional(),
    status: z.enum(['active', 'paused', 'cancelled', 'completed']).optional(),
  });
export type InsertDcaPlan = z.infer<typeof insertDcaPlanSchema>;
export type DcaPlan = typeof dcaPlans.$inferSelect;

export const dcaExecutions = pgTable("dca_executions", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  planId: varchar("plan_id", { length: 255 }).notNull().references(() => dcaPlans.id),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  transactionId: varchar("transaction_id", { length: 255 }).references(() => transactions.id),
  amountUsd: decimal("amount_usd", { precision: 12, scale: 2 }).notNull(),
  goldGrams: decimal("gold_grams", { precision: 18, scale: 8 }),
  pricePerGram: decimal("price_per_gram", { precision: 12, scale: 4 }),
  status: dcaExecutionStatusEnum("status").notNull().default('pending'),
  errorMessage: text("error_message"),
  scheduledAt: timestamp("scheduled_at").notNull(),
  executedAt: timestamp("executed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDcaExecutionSchema = createInsertSchema(dcaExecutions)
  .omit({ id: true, createdAt: true, executedAt: true })
  .extend({
    transactionId: z.string().nullable().optional(),
    goldGrams: z.string().nullable().optional(),
    pricePerGram: z.string().nullable().optional(),
    errorMessage: z.string().nullable().optional(),
  });
export type InsertDcaExecution = z.infer<typeof insertDcaExecutionSchema>;
export type DcaExecution = typeof dcaExecutions.$inferSelect;

// ============================================
// SAVINGS GOALS
// ============================================

export const savingsGoalStatusEnum = pgEnum('savings_goal_status', ['active', 'completed', 'cancelled']);

export const savingsGoals = pgTable("savings_goals", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  targetGrams: decimal("target_grams", { precision: 18, scale: 8 }).notNull(),
  targetDate: date("target_date"),
  status: savingsGoalStatusEnum("status").notNull().default('active'),
  completedAt: timestamp("completed_at"),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSavingsGoalSchema = createInsertSchema(savingsGoals)
  .omit({ id: true, createdAt: true, updatedAt: true, completedAt: true })
  .extend({
    targetDate: z.string().nullable().optional(),
    note: z.string().nullable().optional(),
    status: z.enum(['active', 'completed', 'cancelled']).optional(),
  });
export type InsertSavingsGoal = z.infer<typeof insertSavingsGoalSchema>;
export type SavingsGoal = typeof savingsGoals.$inferSelect;

// ============================================
// BENEFICIARIES (Estate Planning)
// ============================================

export const beneficiaryStatusEnum = pgEnum('beneficiary_status', ['pending', 'verified', 'rejected']);
export const beneficiaryRelationshipEnum = pgEnum('beneficiary_relationship', [
  'spouse', 'child', 'parent', 'sibling', 'grandchild', 'grandparent', 
  'other_relative', 'friend', 'business_partner', 'charity', 'trust', 'other'
]);

export const beneficiaries = pgTable("beneficiaries", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  relationship: beneficiaryRelationshipEnum("relationship").notNull(),
  email: varchar("email", { length: 255 }),
  phoneNumber: varchar("phone_number", { length: 50 }),
  address: text("address"),
  allocationPercent: decimal("allocation_percent", { precision: 5, scale: 2 }).notNull(), // 0.00 to 100.00
  status: beneficiaryStatusEnum("status").notNull().default('pending'),
  verifiedAt: timestamp("verified_at"),
  identificationDocument: text("identification_document"), // Document path/URL
  note: text("note"),
  isPrimary: boolean("is_primary").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertBeneficiarySchema = createInsertSchema(beneficiaries)
  .omit({ id: true, createdAt: true, updatedAt: true, verifiedAt: true })
  .extend({
    email: z.string().email().nullable().optional(),
    phoneNumber: z.string().nullable().optional(),
    address: z.string().nullable().optional(),
    identificationDocument: z.string().nullable().optional(),
    note: z.string().nullable().optional(),
    isPrimary: z.boolean().optional(),
    status: z.enum(['pending', 'verified', 'rejected']).optional(),
  });
export type InsertBeneficiary = z.infer<typeof insertBeneficiarySchema>;
export type Beneficiary = typeof beneficiaries.$inferSelect;

// ============================================
// USER ACTIVITY LOGS (User-facing audit trail)
// ============================================

export const userActivityTypeEnum = pgEnum('user_activity_type', [
  'login', 'logout', 'login_failed', 'password_change', 'email_change',
  'mfa_enabled', 'mfa_disabled', 'profile_update', 'settings_change',
  'beneficiary_added', 'beneficiary_removed', 'dca_created', 'dca_updated',
  'price_alert_created', 'price_alert_triggered', 'kyc_submitted', 'kyc_approved'
]);

export const userActivityLogs = pgTable("user_activity_logs", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  activityType: userActivityTypeEnum("activity_type").notNull(),
  description: text("description"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  deviceInfo: json("device_info").$type<{ browser?: string; os?: string; device?: string }>(),
  location: varchar("location", { length: 255 }), // City, Country (from IP)
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserActivityLogSchema = createInsertSchema(userActivityLogs)
  .omit({ id: true, createdAt: true })
  .extend({
    description: z.string().nullable().optional(),
    ipAddress: z.string().nullable().optional(),
    userAgent: z.string().nullable().optional(),
    deviceInfo: z.object({
      browser: z.string().optional(),
      os: z.string().optional(),
      device: z.string().optional(),
    }).nullable().optional(),
    location: z.string().nullable().optional(),
    metadata: z.record(z.unknown()).nullable().optional(),
  });
export type InsertUserActivityLog = z.infer<typeof insertUserActivityLogSchema>;
export type UserActivityLog = typeof userActivityLogs.$inferSelect;

// ============================================
// REPORT EXPORTS
// ============================================

export const reportTypeEnum = pgEnum('report_type', [
  'transaction_history', 'tax_report', 'portfolio_summary', 
  'trading_activity', 'vault_holdings', 'fee_summary'
]);
export const reportFormatEnum = pgEnum('report_format', ['pdf', 'csv', 'xlsx']);
export const reportStatusEnum = pgEnum('report_status', ['pending', 'generating', 'completed', 'failed']);

export const reportExports = pgTable("report_exports", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  reportType: reportTypeEnum("report_type").notNull(),
  format: reportFormatEnum("format").notNull(),
  status: reportStatusEnum("status").notNull().default('pending'),
  dateFrom: date("date_from"),
  dateTo: date("date_to"),
  filters: json("filters").$type<Record<string, unknown>>(),
  fileUrl: text("file_url"),
  fileSizeBytes: integer("file_size_bytes"),
  errorMessage: text("error_message"),
  expiresAt: timestamp("expires_at"), // Auto-delete after expiry
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertReportExportSchema = createInsertSchema(reportExports)
  .omit({ id: true, createdAt: true, completedAt: true, fileUrl: true, fileSizeBytes: true, errorMessage: true })
  .extend({
    dateFrom: z.string().nullable().optional(),
    dateTo: z.string().nullable().optional(),
    filters: z.record(z.unknown()).nullable().optional(),
    expiresAt: z.date().nullable().optional(),
    status: z.enum(['pending', 'generating', 'completed', 'failed']).optional(),
  });
export type InsertReportExport = z.infer<typeof insertReportExportSchema>;
export type ReportExport = typeof reportExports.$inferSelect;

// ============================================
// LEGACY TABLES (preserved for production data compatibility)
// ============================================

export const exchangeRates = pgTable("exchange_rates", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  baseCurrency: varchar("base_currency", { length: 10 }).notNull(),
  targetCurrency: varchar("target_currency", { length: 10 }),
  quoteCurrency: varchar("quote_currency", { length: 10 }),
  rate: decimal("rate", { precision: 18, scale: 6 }).notNull(),
  inverseRate: decimal("inverse_rate", { precision: 18, scale: 6 }),
  source: varchar("source", { length: 100 }),
  provider: varchar("provider", { length: 100 }),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  validFrom: timestamp("valid_from"),
  validUntil: timestamp("valid_until"),
  isActive: boolean("is_active").default(true),
  fetchedAt: timestamp("fetched_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const supportedCurrencies = pgTable("supported_currencies", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 10 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  symbol: varchar("symbol", { length: 10 }).notNull(),
  symbolPosition: varchar("symbol_position", { length: 10 }).default('before'),
  decimalPlaces: integer("decimal_places").default(2),
  isDefault: boolean("is_default").default(false),
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const userSessions = pgTable("user_sessions", {
  sid: varchar("sid", { length: 255 }).primaryKey(),
  sess: json("sess").notNull().$type<Record<string, unknown>>(),
  expire: timestamp("expire").notNull(),
});

// ============================================
// TREASURY MANAGEMENT SYSTEM
// Cash Vault & Gold Vault for full financial tracking
// ============================================

// Cash Vault Entry Types
export const treasuryCashEntryTypeEnum = pgEnum('treasury_cash_entry_type', [
  'DEPOSIT_CARD',        // User deposit via card
  'DEPOSIT_BANK',        // User deposit via bank transfer
  'DEPOSIT_CRYPTO',      // User deposit via crypto
  'GOLD_PURCHASE',       // Platform buys physical gold (cash out)
  'GOLD_SALE',           // Platform sells gold (cash in from withdrawal)
  'WITHDRAWAL_PAYOUT',   // User withdrawal to bank
  'FEE_COLLECTED',       // Platform fee revenue
  'EXPENSE',             // Platform operating expense
  'ADJUSTMENT',          // Manual adjustment by admin
  'REFUND'               // Refund to user
]);

// Gold Vault Entry Types  
export const treasuryGoldEntryTypeEnum = pgEnum('treasury_gold_entry_type', [
  'PURCHASE',            // Gold purchased from supplier
  'ALLOCATE_TO_USER',    // Gold credited to user wallet
  'RETURN_FROM_USER',    // Gold returned from user (withdrawal/sale)
  'SOLD',                // Physical gold sold
  'PHYSICAL_DELIVERY',   // Gold delivered to user
  'ADJUSTMENT',          // Manual adjustment by admin
  'STORAGE_FEE'          // Gold deducted for storage fees
]);

// TREASURY CASH VAULT - Tracks all USD in/out
export const treasuryCashVault = pgTable("treasury_cash_vault", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  
  // Entry details
  entryType: treasuryCashEntryTypeEnum("entry_type").notNull(),
  amountUsd: decimal("amount_usd", { precision: 18, scale: 2 }).notNull(),
  direction: varchar("direction", { length: 10 }).notNull(), // 'in' or 'out'
  
  // Running balance after this entry
  runningBalanceUsd: decimal("running_balance_usd", { precision: 18, scale: 2 }).notNull(),
  
  // Source/reference tracking
  sourceType: varchar("source_type", { length: 50 }), // 'deposit_request', 'withdrawal_request', 'gold_order', etc.
  sourceId: varchar("source_id", { length: 255 }),
  userId: varchar("user_id", { length: 255 }).references(() => users.id),
  
  // Bank/payment details
  paymentMethod: varchar("payment_method", { length: 50 }), // 'card', 'bank', 'crypto'
  paymentReference: varchar("payment_reference", { length: 255 }),
  
  // Admin tracking
  processedBy: varchar("processed_by", { length: 255 }).references(() => users.id),
  notes: text("notes"),
  
  date: date("date").notNull().default(sql`CURRENT_DATE`),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTreasuryCashVaultSchema = createInsertSchema(treasuryCashVault).omit({ id: true, createdAt: true });
export type InsertTreasuryCashVault = z.infer<typeof insertTreasuryCashVaultSchema>;
export type TreasuryCashVault = typeof treasuryCashVault.$inferSelect;

// TREASURY GOLD VAULT - Tracks all physical gold in/out
export const treasuryGoldVault = pgTable("treasury_gold_vault", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  
  // Entry details
  entryType: treasuryGoldEntryTypeEnum("entry_type").notNull(),
  goldGrams: decimal("gold_grams", { precision: 18, scale: 6 }).notNull(),
  direction: varchar("direction", { length: 10 }).notNull(), // 'in' or 'out'
  
  // Cost/value tracking
  costPerGramUsd: decimal("cost_per_gram_usd", { precision: 18, scale: 4 }),
  totalCostUsd: decimal("total_cost_usd", { precision: 18, scale: 2 }),
  
  // Running balance after this entry
  runningBalanceGrams: decimal("running_balance_grams", { precision: 18, scale: 6 }).notNull(),
  
  // Source/reference tracking
  sourceType: varchar("source_type", { length: 50 }), // 'utt', 'withdrawal', 'delivery', etc.
  sourceId: varchar("source_id", { length: 255 }),
  userId: varchar("user_id", { length: 255 }).references(() => users.id),
  
  // Supplier/storage tracking
  supplier: varchar("supplier", { length: 100 }), // 'Wingold', etc.
  storageLocation: varchar("storage_location", { length: 255 }),
  wingoldOrderId: varchar("wingold_order_id", { length: 255 }),
  
  // Admin tracking
  processedBy: varchar("processed_by", { length: 255 }).references(() => users.id),
  notes: text("notes"),
  
  date: date("date").notNull().default(sql`CURRENT_DATE`),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTreasuryGoldVaultSchema = createInsertSchema(treasuryGoldVault).omit({ id: true, createdAt: true });
export type InsertTreasuryGoldVault = z.infer<typeof insertTreasuryGoldVaultSchema>;
export type TreasuryGoldVault = typeof treasuryGoldVault.$inferSelect;

// DAILY TREASURY RECONCILIATION - Daily snapshot for audit
export const treasuryDailyReconciliation = pgTable("treasury_daily_reconciliation", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  
  // Date of reconciliation
  date: date("date").notNull().unique(),
  
  // Cash position
  cashVaultBalanceUsd: decimal("cash_vault_balance_usd", { precision: 18, scale: 2 }).notNull(),
  totalDepositsUsd: decimal("total_deposits_usd", { precision: 18, scale: 2 }).notNull(),
  totalWithdrawalsUsd: decimal("total_withdrawals_usd", { precision: 18, scale: 2 }).notNull(),
  totalFeesCollectedUsd: decimal("total_fees_collected_usd", { precision: 18, scale: 2 }).notNull(),
  
  // Gold position
  goldVaultBalanceGrams: decimal("gold_vault_balance_grams", { precision: 18, scale: 6 }).notNull(),
  goldVaultValueUsd: decimal("gold_vault_value_usd", { precision: 18, scale: 2 }).notNull(),
  totalGoldPurchasedGrams: decimal("total_gold_purchased_grams", { precision: 18, scale: 6 }).notNull(),
  totalGoldPurchaseCostUsd: decimal("total_gold_purchase_cost_usd", { precision: 18, scale: 2 }).notNull(),
  
  // User digital gold position
  totalUserDigitalGoldGrams: decimal("total_user_digital_gold_grams", { precision: 18, scale: 6 }).notNull(),
  totalUserDigitalGoldValueUsd: decimal("total_user_digital_gold_value_usd", { precision: 18, scale: 2 }).notNull(),
  
  // Reconciliation check
  goldVarianceGrams: decimal("gold_variance_grams", { precision: 18, scale: 6 }).notNull(), // Physical - Digital (should be 0)
  status: varchar("status", { length: 20 }).notNull().default('matched'), // 'matched', 'mismatch', 'pending'
  
  // Gold price used for valuation
  goldPricePerGramUsd: decimal("gold_price_per_gram_usd", { precision: 18, scale: 4 }).notNull(),
  
  // Breakdown by deposit method
  cardDepositsUsd: decimal("card_deposits_usd", { precision: 18, scale: 2 }),
  bankDepositsUsd: decimal("bank_deposits_usd", { precision: 18, scale: 2 }),
  cryptoDepositsUsd: decimal("crypto_deposits_usd", { precision: 18, scale: 2 }),
  
  // Audit
  auditedBy: varchar("audited_by", { length: 255 }).references(() => users.id),
  auditNotes: text("audit_notes"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTreasuryDailyReconciliationSchema = createInsertSchema(treasuryDailyReconciliation).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTreasuryDailyReconciliation = z.infer<typeof insertTreasuryDailyReconciliationSchema>;
export type TreasuryDailyReconciliation = typeof treasuryDailyReconciliation.$inferSelect;
