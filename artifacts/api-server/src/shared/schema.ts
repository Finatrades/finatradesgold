


import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, bigint, decimal, timestamp, boolean, pgEnum, json, jsonb, date, unique, type AnyPgColumn } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================
// ENUMS
// ============================================

export const kycStatusEnum = pgEnum('kyc_status', ['Not Started', 'In Progress', 'Approved', 'Rejected', 'Escalated', 'Pending Review', 'Changes Requested', 'In Review']);
export const kycTierEnum = pgEnum('kyc_tier', ['tier_1_basic', 'tier_2_enhanced', 'tier_3_corporate']);
export const accountTypeEnum = pgEnum('account_type', ['personal', 'business']);
export const userRoleEnum = pgEnum('user_role', ['user', 'admin']);
export const riskLevelEnum = pgEnum('risk_level', ['Low', 'Medium', 'High', 'Critical']);
export const screeningStatusEnum = pgEnum('screening_status', ['Pending', 'Clear', 'Match Found', 'Manual Review', 'Escalated']);
export const amlCaseStatusEnum = pgEnum('aml_case_status', ['Open', 'Under Investigation', 'Pending SAR', 'SAR Filed', 'Closed - No Action', 'Closed - Action Taken']);

export const transactionTypeEnum = pgEnum('transaction_type', ['Buy', 'Sell', 'Send', 'Receive', 'Swap', 'Deposit', 'Withdrawal']);
export const transactionStatusEnum = pgEnum('transaction_status', ['Draft', 'Pending', 'Pending Verification', 'Approved', 'Processing', 'Completed', 'Failed', 'Cancelled', 'Rejected']);


export const tradeCaseStatusEnum = pgEnum('trade_case_status', [
  'Draft', 'Submitted', 'Under Review', 'Approved', 'Active', 'Settled', 'Cancelled', 'Rejected'
]);
export const documentStatusEnum = pgEnum('document_status', ['Pending', 'AI Review', 'Pending Review', 'Approved', 'Rejected', 'AI Rejected']);

export const chatMessageSenderEnum = pgEnum('chat_message_sender', ['user', 'admin', 'agent']);

// ============================================
// USERS & AUTH
// ============================================

export const mfaMethodEnum = pgEnum('mfa_method', ['totp', 'email']);

// FinaBridge role enum for differentiating importers and exporters
export const finabridgeRoleEnum = pgEnum('finabridge_role', ['importer', 'exporter', 'both']);

// User type enum for role-based platform workflow (exporter / importer / government)
// Separate from `role` (user/admin) — admin gating is preserved via `role`.
export const userTypeEnum = pgEnum('user_type', ['exporter', 'importer', 'government', 'warehouse']);

export const users = pgTable("users", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  finatradesId: varchar("finatrades_id", { length: 20 }).unique(), // Unique user identifier for transfers
  customFinatradesId: varchar("custom_finatrades_id", { length: 25 }).unique(), // User-chosen custom ID (e.g., FT-MYNAME)
  customFinatradesIdChangedAt: timestamp("custom_finatrades_id_changed_at"), // Last time custom ID was changed (30-day rule)
  finatradesIdOtp: varchar("finatrades_id_otp", { length: 6 }), // OTP for Finatrades ID login
  finatradesIdOtpExpiry: timestamp("finatrades_id_otp_expiry"), // OTP expiry time
  finatradesIdOtpAttempts: integer("finatrades_id_otp_attempts").default(0), // Failed OTP attempts
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  firstName: varchar("first_name", { length: 255 }).notNull(),
  lastName: varchar("last_name", { length: 255 }).notNull(),
  phoneNumber: varchar("phone_number", { length: 50 }),
  address: text("address"),
  country: varchar("country", { length: 100 }),
  accountType: accountTypeEnum("account_type").notNull().default('personal'),
  role: userRoleEnum("role").notNull().default('user'),
  userType: userTypeEnum("user_type").notNull().default('exporter'),
  assignedHubCode: varchar("assigned_hub_code", { length: 10 }),
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
  // Counterparty reputation (Task #145 anonymisation)
  ratingAvg: decimal("rating_avg", { precision: 2, scale: 1 }),
  ratingCount: integer("rating_count").notNull().default(0),
  completedTradesCount: integer("completed_trades_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    // Make fields with database defaults optional for API validation
    finatradesId: z.string().nullable().optional(),
    customFinatradesId: z.string().nullable().optional(),
    customFinatradesIdChangedAt: z.date().nullable().optional(),
    finatradesIdOtp: z.string().nullable().optional(),
    finatradesIdOtpExpiry: z.date().nullable().optional(),
    finatradesIdOtpAttempts: z.number().optional(),
    accountType: z.enum(['personal', 'business']).optional(),
    role: z.enum(['user', 'admin']).optional(),
    userType: z.enum(['exporter', 'importer', 'government', 'warehouse']).optional(),
    assignedHubCode: z.string().nullable().optional(),
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
    ratingAvg: z.string().nullable().optional(),
    ratingCount: z.number().optional(),
    completedTradesCount: z.number().optional(),
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
  rbacRoleId: varchar("rbac_role_id", { length: 255 }),
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
    rbacRoleId: z.string().nullable().optional(),
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
  'view_analytics',
  'view_risk',
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
    'view_reports', 'manage_fees', 'view_analytics', 'view_risk'
  ],
  manager: [
    'view_users', 'manage_kyc', 'view_kyc',
    'view_transactions', 'manage_vault', 'view_vault',
    'view_bnsl', 'view_finabridge', 'view_support', 'view_reports', 'view_analytics'
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
    'view_transactions', 'view_reports', 'generate_reports',
    'view_analytics', 'view_risk'
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
  approvalLevel: varchar("approval_level", { length: 20 }).default("none"),
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
  activeKycMode: kycModeEnum("active_kyc_mode").notNull().default('finatrades'),
  
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
  corporateRole: varchar("corporate_role", { length: 20 }), // 'importer', 'exporter', or 'both'
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
  // Sections the admin has requested changes on (populated on Changes Requested decision)
  changeRequestedSections: jsonb("change_requested_sections").$type<string[]>(),
  
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

  // Sections the admin has requested changes on (populated on Changes Requested decision)
  changeRequestedSections: jsonb("change_requested_sections").$type<string[]>(),

  // OCR Mismatch Flagging — populated async after submission
  ocrMismatchFlag: jsonb("ocr_mismatch_flag").$type<{
    checked: boolean;
    nameMismatch: boolean;
    dobMismatch: boolean;
    extractedName: string | null;
    extractedDob: string | null;
    similarity: number;
    checkedAt: string;
  } | null>(),
  // Submission-level risk score: 10 if OCR mismatch (idempotent per submission), 0 if clean
  riskScore: integer("risk_score").default(0),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertFinatradesPersonalKycSchema = createInsertSchema(finatradesPersonalKyc).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFinatradesPersonalKyc = z.infer<typeof insertFinatradesPersonalKycSchema>;
export type FinatradesPersonalKyc = typeof finatradesPersonalKyc.$inferSelect;

// ============================================
// KYC DRAFTS (server-side draft persistence)
// ============================================

export const kycDrafts = pgTable("kyc_drafts", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  submissionType: varchar("submission_type", { length: 50 }).notNull().default('personal'),
  draftData: jsonb("draft_data").$type<Record<string, any>>(),
  savedAt: timestamp("saved_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userSubmissionTypeUniq: unique().on(table.userId, table.submissionType),
}));

export const insertKycDraftSchema = createInsertSchema(kycDrafts).omit({ id: true, savedAt: true, updatedAt: true });
export type InsertKycDraft = z.infer<typeof insertKycDraftSchema>;
export type KycDraft = typeof kycDrafts.$inferSelect;

// ============================================
// KYC SUBMISSION VERSIONING
// ============================================

export const kycVersionStatusEnum = pgEnum('kyc_version_status', ['draft', 'submitted', 'in_review', 'changes_requested', 'approved', 'rejected']);

export const kycSubmissionVersions = pgTable("kyc_submission_versions", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  submissionId: varchar("submission_id", { length: 255 }).notNull(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  kycType: varchar("kyc_type", { length: 50 }).notNull(),
  versionNumber: integer("version_number").notNull().default(1),
  snapshot: json("snapshot").$type<Record<string, any>>(),
  status: kycVersionStatusEnum("status").notNull().default('submitted'),
  submittedAt: timestamp("submitted_at").notNull().defaultNow(),
  lockedAt: timestamp("locked_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertKycSubmissionVersionSchema = createInsertSchema(kycSubmissionVersions).omit({ id: true, createdAt: true });
export type InsertKycSubmissionVersion = z.infer<typeof insertKycSubmissionVersionSchema>;
export type KycSubmissionVersion = typeof kycSubmissionVersions.$inferSelect;

// ============================================
// KYC SECTION REVIEWS (per-section rejection reasons)
// ============================================

export const kycSectionStatusEnum = pgEnum('kyc_section_status', ['pending', 'approved', 'rejected']);

export const kycSectionReviews = pgTable("kyc_section_reviews", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  versionId: varchar("version_id", { length: 255 }).notNull().references(() => kycSubmissionVersions.id),
  submissionId: varchar("submission_id", { length: 255 }).notNull(),
  sectionName: varchar("section_name", { length: 100 }).notNull(),
  status: kycSectionStatusEnum("status").notNull().default('pending'),
  reasonCode: varchar("reason_code", { length: 50 }),
  freeText: text("free_text"),
  reviewedBy: varchar("reviewed_by", { length: 255 }),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertKycSectionReviewSchema = createInsertSchema(kycSectionReviews).omit({ id: true, createdAt: true });
export type InsertKycSectionReview = z.infer<typeof insertKycSectionReviewSchema>;
export type KycSectionReview = typeof kycSectionReviews.$inferSelect;

// ============================================
// KYC REASON CODES (reference data)
// ============================================

export const kycReasonCodes = pgTable("kyc_reason_codes", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 50 }).notNull().unique(),
  label: varchar("label", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertKycReasonCodeSchema = createInsertSchema(kycReasonCodes).omit({ id: true, createdAt: true });
export type InsertKycReasonCode = z.infer<typeof insertKycReasonCodeSchema>;
export type KycReasonCode = typeof kycReasonCodes.$inferSelect;

// ============================================
// KYC DECISION RECORDS (audit trail for decisions)
// ============================================

export const kycDecisionRecords = pgTable("kyc_decision_records", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  versionId: varchar("version_id", { length: 255 }).notNull().references(() => kycSubmissionVersions.id),
  submissionId: varchar("submission_id", { length: 255 }).notNull(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  decision: varchar("decision", { length: 50 }).notNull(),
  decidedBy: varchar("decided_by", { length: 255 }).notNull(),
  decidedByName: varchar("decided_by_name", { length: 255 }),
  notes: text("notes"),
  sectionReviews: json("section_reviews").$type<Array<{
    section: string;
    status: string;
    reasonCode?: string;
    freeText?: string;
  }>>(),
  decidedAt: timestamp("decided_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertKycDecisionRecordSchema = createInsertSchema(kycDecisionRecords).omit({ id: true, createdAt: true });
export type InsertKycDecisionRecord = z.infer<typeof insertKycDecisionRecordSchema>;
export type KycDecisionRecord = typeof kycDecisionRecords.$inferSelect;

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
 * TRANSACTIONS TABLE
 *
 * amountUsd/amountEur store the value at transaction time (historical record).
 */
export const transactions = pgTable("transactions", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  type: transactionTypeEnum("type").notNull(),
  status: transactionStatusEnum("status").notNull().default('Pending'),

  // HISTORICAL RECORD: USD value at time of transaction (for audit purposes)
  amountUsd: decimal("amount_usd", { precision: 18, scale: 2 }),
  // HISTORICAL RECORD: EUR value at time of transaction (for audit purposes)
  amountEur: decimal("amount_eur", { precision: 18, scale: 2 }),

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



// ============================================

// ============================================

// ============================================

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

export const certificates = pgTable("certificates", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  certificateNumber: varchar("certificate_number", { length: 100 }).notNull().unique(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  transactionId: varchar("transaction_id", { length: 255 }).references(() => transactions.id),
  
  type: certificateTypeEnum("type").notNull(),
  status: certificateStatusEnum("status").notNull().default('Active'),
  totalValueUsd: decimal("total_value_usd", { precision: 18, scale: 2 }),
  
  issuer: varchar("issuer", { length: 255 }).notNull(), // "Finatrades" or "Wingold & Metals DMCC"
  vaultLocation: varchar("vault_location", { length: 255 }),
  
  // Transfer-related fields
  fromUserId: varchar("from_user_id", { length: 255 }).references(() => users.id), // Sender for transfers
  toUserId: varchar("to_user_id", { length: 255 }).references(() => users.id), // Recipient for transfers
  fromUserName: varchar("from_user_name", { length: 255 }), // Sender name for certificate display
  toUserName: varchar("to_user_name", { length: 255 }), // Recipient name for certificate display
  relatedCertificateId: varchar("related_certificate_id", { length: 255 }), // Links to parent/related certificate
  
  // BNSL-related fields
  bnslPlanId: varchar("bnsl_plan_id", { length: 255 }), // Legacy column; bnsl tables removed.
  
  // Trade finance (FinaBridge) fields
  tradeCaseId: varchar("trade_case_id", { length: 255 }), // References tradeCases.id for Trade Lock/Release certs
  
  // LGPW/FGPW Conversion fields
  goldWalletType: varchar("gold_wallet_type", { length: 10 }), // 'LGPW' or 'FGPW' - which wallet this certificate belongs to
  fromGoldWalletType: varchar("from_gold_wallet_type", { length: 10 }), // For conversion certificates
  toGoldWalletType: varchar("to_gold_wallet_type", { length: 10 }), // For conversion certificates
  fpgwBatchId: varchar("fpgw_batch_id", { length: 255 }), // For FGPW certificates, links to batch
  conversionPriceUsd: decimal("conversion_price_usd", { precision: 12, scale: 2 }), // Price at time of conversion
  
  // Certificate lineage - track remaining grams after partial conversions
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

// Vault Deposit Requests - Physical gold deposits requiring admin approval

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

  // Task #146 — Trade Finance suite: multi-currency + milestone escrow
  settlementCurrency: varchar("settlement_currency", { length: 8 }).notNull().default('USD'),
  settlementAmountCents: bigint("settlement_amount_cents", { mode: 'number' }),
  milestoneSchedule: jsonb("milestone_schedule"),
  escrowHoldId: varchar("escrow_hold_id", { length: 255 }),
  escrowFundedAt: timestamp("escrow_funded_at"),
  escrowReleasedAt: timestamp("escrow_released_at"),
  // Funds held back after Goods Received until the 30-day dispute window
  // closes (or a tribunal decision spends them). Round-4 fix.
  disputeReserveCents: bigint("dispute_reserve_cents", { mode: 'number' }).notNull().default(0),

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
  // AI Verification Fields
  aiVerificationStatus: varchar("ai_verification_status", { length: 50 }), // 'pending' | 'processing' | 'completed' | 'failed'
  aiFraudScore: decimal("ai_fraud_score", { precision: 5, scale: 2 }), // 0.00–100.00
  aiExtractedData: jsonb("ai_extracted_data"), // Structured fields extracted by AI
  aiRejectionReason: text("ai_rejection_reason"),
  aiVerifiedAt: timestamp("ai_verified_at"),
  aiRetryCount: integer("ai_retry_count").default(0),
});

export const insertTradeDocumentSchema = createInsertSchema(tradeDocuments).omit({ id: true });
export type InsertTradeDocument = z.infer<typeof insertTradeDocumentSchema>;
export type TradeDocument = typeof tradeDocuments.$inferSelect;

// ============================================
// FINABRIDGE - TRADE MATCHING & SETTLEMENT
// ============================================

export const tradeRequestStatusEnum = pgEnum('trade_request_status', [
  'Draft', 'Open', 'Proposal Review', 'Awaiting Importer', 'Active Trade', 'Completed', 'Cancelled',
  'AI Review', 'AI Rejected', 'Pending Review', 'Rejected'
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

  // Payment Instrument & Document
  paymentInstrumentType: varchar("payment_instrument_type", { length: 50 }),
  supportingDocumentUrl: text("supporting_document_url"),

  // AI Verification
  aiVerificationStatus: varchar("ai_verification_status", { length: 50 }),
  aiFraudScore: decimal("ai_fraud_score", { precision: 5, scale: 2 }),
  aiExtractedData: text("ai_extracted_data"),
  aiRejectionReason: text("ai_rejection_reason"),

  // Three-Tier Review
  tier1Status: varchar("tier1_status", { length: 50 }),
  tier1Notes: text("tier1_notes"),
  tier1ReviewedBy: varchar("tier1_reviewed_by", { length: 255 }),
  tier2Status: varchar("tier2_status", { length: 50 }),
  tier2Notes: text("tier2_notes"),
  tier2ReviewedBy: varchar("tier2_reviewed_by", { length: 255 }),
  tier3Status: varchar("tier3_status", { length: 50 }),
  tier3Notes: text("tier3_notes"),
  tier3ReviewedBy: varchar("tier3_reviewed_by", { length: 255 }),

  // Publishing
  publishedToExporters: boolean("published_to_exporters").default(false),

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

// ============================================
// COUNTERPARTY REPUTATION (Task #145)
// ============================================

export const tradeReviews = pgTable("trade_reviews", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  tradeCaseId: varchar("trade_case_id", { length: 255 }).references(() => tradeCases.id, { onDelete: 'cascade' }),
  tradeRequestId: varchar("trade_request_id", { length: 255 }).references(() => tradeRequests.id, { onDelete: 'cascade' }),
  reviewerUserId: varchar("reviewer_user_id", { length: 255 }).notNull().references(() => users.id),
  revieweeUserId: varchar("reviewee_user_id", { length: 255 }).notNull().references(() => users.id),
  rating: integer("rating").notNull(),
  reviewText: varchar("review_text", { length: 500 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTradeReviewSchema = createInsertSchema(tradeReviews).omit({ id: true, createdAt: true });
export type InsertTradeReview = z.infer<typeof insertTradeReviewSchema>;
export type TradeReview = typeof tradeReviews.$inferSelect;

// One row per party per finalised trade; settlement contract may reveal real
// names only when BOTH parties have consented.
export const tradeIdentityConsents = pgTable("trade_identity_consents", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  tradeCaseId: varchar("trade_case_id", { length: 255 }).references(() => tradeCases.id, { onDelete: 'cascade' }),
  tradeRequestId: varchar("trade_request_id", { length: 255 }).references(() => tradeRequests.id, { onDelete: 'cascade' }),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  consentedAt: timestamp("consented_at").notNull().defaultNow(),
});

export const insertTradeIdentityConsentSchema = createInsertSchema(tradeIdentityConsents).omit({ id: true, consentedAt: true });
export type InsertTradeIdentityConsent = z.infer<typeof insertTradeIdentityConsentSchema>;
export type TradeIdentityConsent = typeof tradeIdentityConsents.$inferSelect;

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
  tradeRequestId: varchar("trade_request_id", { length: 255 }).references(() => tradeRequests.id),
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
  // Task #146 — dispute tribunal extensions
  tradeCaseId: varchar("trade_case_id", { length: 255 }).references(() => tradeCases.id),
  panelMemberIds: text("panel_member_ids").array(),
  importerAllocationCents: bigint("importer_allocation_cents", { mode: 'number' }),
  exporterAllocationCents: bigint("exporter_allocation_cents", { mode: 'number' }),
  currency: varchar("currency", { length: 8 }),
  appealDeadline: timestamp("appeal_deadline"),
  finalizedAt: timestamp("finalized_at"),
  // Task #146 round-2: tribunal decision fields (spec contract).
  decision: varchar("decision", { length: 48 }), // 'release_to_seller' | 'refund_to_buyer' | 'split'
  splitBps: integer("split_bps"),
  decisionNotes: text("decision_notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Task #146 round-2: dedicated evidence rows (spec requirement; replaces the
// loose `evidenceUrls` array, which stays for backwards compat).
export const tradeDisputeEvidence = pgTable("trade_dispute_evidence", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  disputeId: varchar("dispute_id", { length: 255 }).notNull().references(() => tradeDisputes.id, { onDelete: 'cascade' }),
  uploadedByUserId: varchar("uploaded_by_user_id", { length: 255 }).notNull().references(() => users.id),
  uploadedByRole: varchar("uploaded_by_role", { length: 20 }).notNull(),
  fileUrl: text("file_url").notNull(),
  fileName: varchar("file_name", { length: 255 }),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
export type TradeDisputeEvidence = typeof tradeDisputeEvidence.$inferSelect;

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
  'Packing List', 'Quality Certificate', 'Customs Declaration',
  'Inspection Report', 'LC Draft', 'Proof of Lading', 'Warehouse Receipt', 'Other'
]);

export const dealRoomDocumentStatusEnum = pgEnum('deal_room_document_status', [
  'Pending', 'Under Review', 'Approved', 'Verified', 'Rejected', 'Expired'
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
  versionNumber: integer("version_number").default(1),
  parentDocumentId: varchar("parent_document_id", { length: 255 }).references((): AnyPgColumn => dealRoomDocuments.id),
  mt700ValidationResult: jsonb("mt700_validation_result"),
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
  
  // DB CHECK constraint: deal_rooms_lc_lifecycle_status_check enforces only these 9 values or NULL (applied directly to DB)
  lcLifecycleStatus: varchar("lc_lifecycle_status", { length: 50 }).default('Draft'),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const LC_LIFECYCLE_STAGES = [
  'Draft', 'LC Issued', 'Docs Submitted', 'Docs Under Review',
  'Discrepancy Raised', 'Discrepancy Resolved', 'Approved', 'Payment Triggered', 'Closed',
] as const;
export type LcLifecycleStage = typeof LC_LIFECYCLE_STAGES[number];

export const insertDealRoomSchema = createInsertSchema(dealRooms).omit({ id: true, createdAt: true, updatedAt: true, adminDisclaimerUpdatedAt: true }).extend({
  lcLifecycleStatus: z.enum(LC_LIFECYCLE_STAGES).default('Draft').optional(),
});
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
// DEAL ROOM - MILESTONES
// ============================================

export const dealMilestones = pgTable("deal_milestones", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  dealRoomId: varchar("deal_room_id", { length: 255 }).notNull().references(() => dealRooms.id),
  milestoneName: varchar("milestone_name", { length: 100 }).notNull(),
  completedByUserId: varchar("completed_by_user_id", { length: 255 }).references(() => users.id),
  completedByRole: varchar("completed_by_role", { length: 20 }),
  notes: text("notes"),
  completedAt: timestamp("completed_at").notNull().defaultNow(),
});

export const insertDealMilestoneSchema = createInsertSchema(dealMilestones).omit({ id: true, completedAt: true });
export type InsertDealMilestone = z.infer<typeof insertDealMilestoneSchema>;
export type DealMilestone = typeof dealMilestones.$inferSelect;

// ============================================
// DEAL ROOM - DISCREPANCIES
// ============================================

export const dealDiscrepancyReasonEnum = pgEnum('deal_discrepancy_reason', [
  'Amount Mismatch',
  'Date Discrepancy',
  'Port of Loading Wrong',
  'Missing Signature',
  'Description Mismatch',
  'Document Expired',
  'Incorrect Document Type',
  'Other'
]);

export const dealDiscrepancies = pgTable("deal_discrepancies", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  dealRoomId: varchar("deal_room_id", { length: 255 }).notNull().references(() => dealRooms.id),
  documentId: varchar("document_id", { length: 255 }).references(() => dealRoomDocuments.id),
  raisedByUserId: varchar("raised_by_user_id", { length: 255 }).notNull().references(() => users.id),
  reasonType: dealDiscrepancyReasonEnum("reason_type").notNull(),
  description: text("description"),
  status: varchar("status", { length: 20 }).notNull().default('open'),
  resolvedAt: timestamp("resolved_at"),
  resolvedByUserId: varchar("resolved_by_user_id", { length: 255 }).references(() => users.id),
  resolutionNotes: text("resolution_notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertDealDiscrepancySchema = createInsertSchema(dealDiscrepancies).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDealDiscrepancy = z.infer<typeof insertDealDiscrepancySchema>;
export type DealDiscrepancy = typeof dealDiscrepancies.$inferSelect;

// ============================================
// DEAL ROOM - LC TERMS (LC WIZARD)
// ============================================

export const lcTerms = pgTable("lc_terms", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  dealRoomId: varchar("deal_room_id", { length: 255 }).notNull().unique().references(() => dealRooms.id),
  lcType: varchar("lc_type", { length: 50 }).notNull().default('Irrevocable'),
  expiryDate: varchar("expiry_date", { length: 50 }),
  expiryPlace: varchar("expiry_place", { length: 255 }),
  amount: decimal("amount", { precision: 18, scale: 2 }),
  currency: varchar("currency", { length: 10 }).default('USD'),
  partialShipment: boolean("partial_shipment").default(false),
  transshipment: boolean("transshipment").default(false),
  requiredDocuments: text("required_documents").array(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertLcTermsSchema = createInsertSchema(lcTerms).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLcTerms = z.infer<typeof insertLcTermsSchema>;
export type LcTerms = typeof lcTerms.$inferSelect;

// ============================================
// DEAL ROOM - DOCUMENT METADATA (WR + POL)
// ============================================

export const dealRoomDocumentMetadata = pgTable("deal_room_document_metadata", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id", { length: 255 }).notNull().unique().references(() => dealRoomDocuments.id),
  warehouseName: varchar("warehouse_name", { length: 255 }),
  wrNumber: varchar("wr_number", { length: 100 }),
  goldQuantityGrams: decimal("gold_quantity_grams", { precision: 18, scale: 6 }),
  issuanceDate: varchar("issuance_date", { length: 50 }),
  expiryDate: varchar("expiry_date", { length: 50 }),
  carrierName: varchar("carrier_name", { length: 255 }),
  blNumber: varchar("bl_number", { length: 100 }),
  portOfLoading: varchar("port_of_loading", { length: 255 }),
  portOfDischarge: varchar("port_of_discharge", { length: 255 }),
  estimatedDeparture: varchar("estimated_departure", { length: 50 }),
  estimatedArrival: varchar("estimated_arrival", { length: 50 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertDealRoomDocumentMetadataSchema = createInsertSchema(dealRoomDocumentMetadata).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDealRoomDocumentMetadata = z.infer<typeof insertDealRoomDocumentMetadataSchema>;
export type DealRoomDocumentMetadata = typeof dealRoomDocumentMetadata.$inferSelect;

// ============================================
// DEAL ROOM - INTERNAL ADMIN NOTES
// ============================================

export const dealRoomInternalNotes = pgTable("deal_room_internal_notes", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  dealRoomId: varchar("deal_room_id", { length: 255 }).notNull().references(() => dealRooms.id),
  adminUserId: varchar("admin_user_id", { length: 255 }).notNull().references(() => users.id),
  note: text("note").notNull(),
  isEscalated: boolean("is_escalated").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDealRoomInternalNoteSchema = createInsertSchema(dealRoomInternalNotes).omit({ id: true, createdAt: true });
export type InsertDealRoomInternalNote = z.infer<typeof insertDealRoomInternalNoteSchema>;
export type DealRoomInternalNote = typeof dealRoomInternalNotes.$inferSelect;

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

// ============================================

// ============================================

// ============================================

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
  'user_suspension', 'user_activation',
  'vault_deposit_approval', 'vault_deposit_rejection',
  'vault_withdrawal_approval', 'vault_withdrawal_rejection',
  'transaction_approval', 'transaction_rejection',
  'database_sync'
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
  monthlySummaryEmails: boolean("monthly_summary_emails").notNull().default(true),
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
  // Alert preferences
  lowBalanceThresholdGrams: decimal("low_balance_threshold_grams", { precision: 18, scale: 6 }).default('0.1'), // Alert when LGPW balance drops below this (grams)
  // Per-event email opt-outs for trade-finance lifecycle alerts.
  // Shape: { lc_issued?: boolean, lc_compliant?: boolean, lc_discrepant?: boolean,
  //          escrow_funded?: boolean, milestone_released?: boolean,
  //          dispute_opened?: boolean, dispute_resolved?: boolean }
  // Missing keys default to TRUE (preserve historical behaviour of always emailing).
  // In-app notifications are unaffected by this setting.
  tradeFinanceEmailPrefs: jsonb("trade_finance_email_prefs").$type<Record<string, boolean>>().notNull().default(sql`'{}'::jsonb`),
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

// ============================================

// ============================================
// BUY GOLD REQUESTS (Manual via Wingold & Metals)
// ============================================

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

  // Task #168 — Hub & Logistics Master wiring
  carrierId: varchar("carrier_id", { length: 255 }).references((): AnyPgColumn => carriers.id),
  shippingRouteId: varchar("shipping_route_id", { length: 255 }).references((): AnyPgColumn => shippingRoutes.id),

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

export const tradeRiskAssessments = pgTable("trade_risk_assessments", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  tradeRequestId: varchar("trade_request_id", { length: 255 }).notNull().references(() => tradeRequests.id),
  
  riskScore: integer("risk_score").notNull(),
  riskLevel: riskLevelEnum("risk_level").notNull(),
  
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

export const workflowExpectedSteps = pgTable("workflow_expected_steps", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  flowType: workflowFlowTypeEnum("flow_type").notNull(),
  stepKey: varchar("step_key", { length: 100 }).notNull(),
  stepOrder: integer("step_order").notNull(),
  description: text("description"),
  required: boolean("required").notNull().default(true),
});

export const insertWorkflowExpectedStepSchema = createInsertSchema(workflowExpectedSteps).omit({ id: true });
export type InsertWorkflowExpectedStep = z.infer<typeof insertWorkflowExpectedStepSchema>;
export type WorkflowExpectedStep = typeof workflowExpectedSteps.$inferSelect;

// ============================================
// B2B INTEGRATION - Wingold Receiving Orders from Finatrades
// ============================================

// Kept for b2bOrders / b2bOrderBars (originally defined for legacy wingold_purchase_orders)
export const wingoldBarSizeEnum = pgEnum('wingold_bar_size', ['1g', '10g', '100g', '1kg']);

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
  fpgwBatchId: varchar("fpgw_batch_id", { length: 255 }),
  cashLedgerEntryId: varchar("cash_ledger_entry_id", { length: 255 }),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertWalletConversionSchema = createInsertSchema(walletConversions).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWalletConversion = z.infer<typeof insertWalletConversionSchema>;
export type WalletConversion = typeof walletConversions.$inferSelect;

// Cash Safety Ledger Entry Type
export const cashLedgerEntryTypeEnum = pgEnum('cash_ledger_entry_type', [
  'FPGW_LOCK',           // Cash credited when user locks LGPW→FPGW
  'FPGW_UNLOCK',         // Cash debited when user unlocks FPGW→LGPW
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

// Unified Gold Tally Transactions - Single source of truth for all gold deposits

// Deposit Items - Individual gold items in a deposit request
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

// ============================================
// USER BANK ACCOUNTS & CRYPTO WALLETS
// ============================================

// Bank account status enum
export const userBankAccountStatusEnum = pgEnum('user_bank_account_status', ['Active', 'Inactive', 'Pending Verification']);

// User Bank Accounts - for withdrawal destinations
export const userBankAccounts = pgTable("user_bank_accounts", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  
  // Bank details
  bankName: varchar("bank_name", { length: 255 }).notNull(),
  accountHolderName: varchar("account_holder_name", { length: 255 }).notNull(),
  accountNumber: varchar("account_number", { length: 100 }).notNull(),
  iban: varchar("iban", { length: 50 }),
  swiftCode: varchar("swift_code", { length: 20 }),
  routingNumber: varchar("routing_number", { length: 20 }),
  bankAddress: text("bank_address"),
  bankCountry: varchar("bank_country", { length: 100 }),
  
  // Account type
  accountType: varchar("account_type", { length: 50 }).default('Savings'),
  currency: varchar("currency", { length: 10 }).default('USD'),
  
  // User-friendly label
  label: varchar("label", { length: 100 }),
  
  // Status and verification
  status: userBankAccountStatusEnum("status").notNull().default('Active'),
  isPrimary: boolean("is_primary").default(false),
  verifiedAt: timestamp("verified_at"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserBankAccountSchema = createInsertSchema(userBankAccounts).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUserBankAccount = z.infer<typeof insertUserBankAccountSchema>;
export type UserBankAccount = typeof userBankAccounts.$inferSelect;

// Kept for userCryptoWallets (originally defined for legacy cryptoPaymentRequests)
export const cryptoNetworkEnum = pgEnum('crypto_network', ['Bitcoin', 'Ethereum', 'USDT_TRC20', 'USDT_ERC20', 'USDC', 'BNB', 'Solana', 'Polygon', 'Other']);

// User Crypto Wallets - for crypto withdrawal destinations
export const userCryptoWallets = pgTable("user_crypto_wallets", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  
  // Wallet details
  network: cryptoNetworkEnum("network").notNull(),
  walletAddress: varchar("wallet_address", { length: 255 }).notNull(),
  
  // User-friendly label
  label: varchar("label", { length: 100 }),
  
  // Status
  isActive: boolean("is_active").default(true),
  isPrimary: boolean("is_primary").default(false),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserCryptoWalletSchema = createInsertSchema(userCryptoWallets).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUserCryptoWallet = z.infer<typeof insertUserCryptoWalletSchema>;
export type UserCryptoWallet = typeof userCryptoWallets.$inferSelect;

// Organizational Chart Positions
// ============================================

export const orgPositions = pgTable("org_positions", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  department: varchar("department", { length: 100 }).notNull(),
  parentId: varchar("parent_id", { length: 255 }),
  photoUrl: text("photo_url"),
  level: integer("level").notNull().default(0),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertOrgPositionSchema = createInsertSchema(orgPositions).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOrgPosition = z.infer<typeof insertOrgPositionSchema>;
export type OrgPosition = typeof orgPositions.$inferSelect;

// ============================================
// COMMODITY TRADE PLATFORM — NEW TABLES
// Steps 2-8 of the 9-step workflow
// ============================================

// --- Enums ---
export const consignmentStatusEnum = pgEnum('consignment_status', [
  'Draft', 'Submitted', 'Pending Review', 'Under Review', 'Approved', 'Rejected', 'Needs More Info', 'In Transit', 'At Warehouse', 'Verified', 'Physically Verified', 'Listed'
]);

export const warehouseReceiptStatusEnum = pgEnum('warehouse_receipt_status', ['active', 'consumed', 'cancelled']);
export const warehouseReceiptPdfStatusEnum = pgEnum('warehouse_receipt_pdf_status', ['pending', 'generating', 'ready', 'failed']);

export const consignmentDocTypeEnum = pgEnum('consignment_doc_type', [
  'commercial_invoice',
  'packing_list',
  'phytosanitary_certificate',
  'certificate_of_origin',
  'quality_inspection_report',
  'mining_license',
  'export_license',
  'bill_of_lading',
  'fumigation_certificate',
  'weight_certificate',
  'other',
]);

export const consignmentDocStatusEnum = pgEnum('consignment_doc_status', [
  'pending', 'uploaded', 'verified', 'rejected', 'changes_requested'
]);

export const qualityGradeEnum = pgEnum('quality_grade', ['A+', 'A', 'B+', 'B', 'C', 'D']);

export const rfqStatusEnum = pgEnum('rfq_status', [
  'Open', 'Offers Received', 'Negotiating', 'Accepted', 'Expired', 'Cancelled'
]);

export const escrowStatusEnum = pgEnum('escrow_status', [
  'Pending Funding', 'Funded', 'Active', 'Conditions Met', 'Released', 'Disputed', 'Refunded'
]);

export const commodityCategoryEnum = pgEnum('commodity_category', [
  'Agricultural', 'Energy', 'Metals', 'Soft Commodities', 'Industrial'
]);

// --- Commodities (admin-managed, HS codes) ---
export const commodities = pgTable("commodities", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  hsCode: varchar("hs_code", { length: 20 }).notNull(),
  category: commodityCategoryEnum("category").notNull(),
  unit: varchar("unit", { length: 20 }).notNull().default('MT'),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: varchar("created_by", { length: 255 }).references((): AnyPgColumn => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCommoditySchema = createInsertSchema(commodities).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCommodity = z.infer<typeof insertCommoditySchema>;
export type Commodity = typeof commodities.$inferSelect;

// --- Warehouse Hubs (admin-managed) — extended by Task #168 ---
export const warehouseHubs = pgTable("warehouse_hubs", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 10 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  country: varchar("country", { length: 100 }).notNull(),
  address: text("address"),
  capacityMT: integer("capacity_mt"),
  operatorName: varchar("operator_name", { length: 255 }),
  isActive: boolean("is_active").notNull().default(true),
  // Task #168 — Hub & Logistics Master extensions
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  commodityTypes: jsonb("commodity_types").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  contactEmail: varchar("contact_email", { length: 255 }),
  contactPhone: varchar("contact_phone", { length: 50 }),
  hubInchargeUserId: varchar("hub_incharge_user_id", { length: 255 }).references((): AnyPgColumn => users.id),
  status: varchar("status", { length: 32 }).notNull().default('active'), // active | inactive | under_maintenance
  photos: jsonb("photos").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  lastActivityAt: timestamp("last_activity_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertWarehouseHubSchema = createInsertSchema(warehouseHubs).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWarehouseHub = z.infer<typeof insertWarehouseHubSchema>;
export type WarehouseHub = typeof warehouseHubs.$inferSelect;

// --- Carriers (Task #168) ---
export const carriers = pgTable("carriers", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  carrierType: varchar("carrier_type", { length: 20 }).notNull(), // sea | road | rail | air
  registrationNo: varchar("registration_no", { length: 100 }),
  contactName: varchar("contact_name", { length: 255 }),
  contactEmail: varchar("contact_email", { length: 255 }),
  contactPhone: varchar("contact_phone", { length: 50 }),
  supportedLanes: jsonb("supported_lanes").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  onTimeScore: decimal("on_time_score", { precision: 5, scale: 2 }),
  status: varchar("status", { length: 32 }).notNull().default('active'),
  notes: text("notes"),
  createdBy: varchar("created_by", { length: 255 }).references((): AnyPgColumn => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Carrier = typeof carriers.$inferSelect;
export type InsertCarrier = typeof carriers.$inferInsert;

// --- Shipping Routes (Task #168) ---
export const shippingRoutes = pgTable("shipping_routes", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 40 }).unique(),
  originHubId: varchar("origin_hub_id", { length: 255 }).notNull().references((): AnyPgColumn => warehouseHubs.id),
  destinationName: varchar("destination_name", { length: 255 }).notNull(),
  destinationCountry: varchar("destination_country", { length: 100 }).notNull(),
  mode: varchar("mode", { length: 20 }).notNull(), // sea | road | rail | air
  transitDays: integer("transit_days"),
  baseFreightRateCents: bigint("base_freight_rate_cents", { mode: "number" }),
  freightCurrency: varchar("freight_currency", { length: 10 }).notNull().default('USD'),
  freightPerUnit: varchar("freight_per_unit", { length: 20 }).notNull().default('MT'),
  customsBroker: varchar("customs_broker", { length: 255 }),
  carrierId: varchar("carrier_id", { length: 255 }).references((): AnyPgColumn => carriers.id),
  status: varchar("status", { length: 32 }).notNull().default('active'),
  notes: text("notes"),
  createdBy: varchar("created_by", { length: 255 }).references((): AnyPgColumn => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type ShippingRoute = typeof shippingRoutes.$inferSelect;
export type InsertShippingRoute = typeof shippingRoutes.$inferInsert;

// --- Consignments (Step 2) ---
export const consignments = pgTable("consignments", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  referenceNo: varchar("reference_no", { length: 50 }).unique(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  commodityId: varchar("commodity_id", { length: 255 }).references(() => commodities.id),
  commodityName: varchar("commodity_name", { length: 255 }).notNull(),
  hsCode: varchar("hs_code", { length: 20 }),
  quantity: decimal("quantity", { precision: 15, scale: 3 }).notNull(),
  unit: varchar("unit", { length: 20 }).notNull().default('MT'),
  qualityGrade: qualityGradeEnum("quality_grade"),
  originCountry: varchar("origin_country", { length: 100 }).notNull(),
  packingType: varchar("packing_type", { length: 100 }),
  targetHubId: varchar("target_hub_id", { length: 255 }).references(() => warehouseHubs.id),
  targetHubCode: varchar("target_hub_code", { length: 10 }),
  incoterms: varchar("incoterms", { length: 20 }),
  estimatedValue: decimal("estimated_value", { precision: 20, scale: 2 }),
  valueCurrency: varchar("value_currency", { length: 10 }).default('USD'),
  // Money fields in cents (BIGINT — preferred going forward; legacy `estimated_value` decimal kept for back-compat)
  askingPriceCents: bigint("asking_price_cents", { mode: "number" }),
  askingCurrency: varchar("asking_currency", { length: 10 }).default('USD'),
  estimatedValueCents: bigint("estimated_value_cents", { mode: "number" }),
  harvestDate: date("harvest_date"),
  batchNumber: varchar("batch_number", { length: 100 }),
  commodityCategory: varchar("commodity_category", { length: 50 }),
  complianceDeclarations: jsonb("compliance_declarations"),
  metadata: jsonb("metadata"),
  status: consignmentStatusEnum("status").notNull().default('Draft'),
  notes: text("notes"),
  adminNotes: text("admin_notes"),
  reviewerId: varchar("reviewer_id", { length: 255 }).references((): AnyPgColumn => users.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  submittedAt: timestamp("submitted_at"),
  approvedAt: timestamp("approved_at"),
  approvedBy: varchar("approved_by", { length: 255 }).references((): AnyPgColumn => users.id),
  marketplacePublished: boolean("marketplace_published").notNull().default(false),
  marketplacePublishedAt: timestamp("marketplace_published_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertConsignmentSchema = createInsertSchema(consignments).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertConsignment = z.infer<typeof insertConsignmentSchema>;
export type Consignment = typeof consignments.$inferSelect;

// --- Consignment Documents (trade docs uploaded with the listing) ---
export const consignmentDocuments = pgTable("consignment_documents", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  consignmentId: varchar("consignment_id", { length: 255 }).notNull().references(() => consignments.id, { onDelete: 'cascade' }),
  docType: consignmentDocTypeEnum("doc_type").notNull(),
  docLabel: varchar("doc_label", { length: 255 }),
  isRequired: boolean("is_required").notNull().default(false),
  status: consignmentDocStatusEnum("status").notNull().default('pending'),
  fileName: varchar("file_name", { length: 500 }),
  fileSize: integer("file_size"),
  mimeType: varchar("mime_type", { length: 100 }),
  storageKey: text("storage_key"),
  storageUrl: text("storage_url"),
  uploadedAt: timestamp("uploaded_at"),
  reviewedAt: timestamp("reviewed_at"),
  reviewerId: varchar("reviewer_id", { length: 255 }).references((): AnyPgColumn => users.id),
  reviewNotes: text("review_notes"),
  rejectReason: text("reject_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertConsignmentDocumentSchema = createInsertSchema(consignmentDocuments).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertConsignmentDocument = z.infer<typeof insertConsignmentDocumentSchema>;
export type ConsignmentDocument = typeof consignmentDocuments.$inferSelect;

// --- Consignment Status History ---
export const consignmentStatusHistory = pgTable("consignment_status_history", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  consignmentId: varchar("consignment_id", { length: 255 }).notNull().references(() => consignments.id, { onDelete: 'cascade' }),
  fromStatus: consignmentStatusEnum("from_status"),
  toStatus: consignmentStatusEnum("to_status").notNull(),
  actorId: varchar("actor_id", { length: 255 }).references((): AnyPgColumn => users.id),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertConsignmentStatusHistorySchema = createInsertSchema(consignmentStatusHistory).omit({ id: true, createdAt: true });
export type InsertConsignmentStatusHistory = z.infer<typeof insertConsignmentStatusHistorySchema>;
export type ConsignmentStatusHistory = typeof consignmentStatusHistory.$inferSelect;

// --- Consignment-derived marketplace listings (Task #77) ---
// Separate from `marketplaceListings` (which requires a warehouse inventory item).
// Auto-created when an admin approves a consignment, before the goods physically
// arrive at the hub.
export const consignmentListings = pgTable("consignment_listings", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  consignmentId: varchar("consignment_id", { length: 255 }).notNull().unique().references(() => consignments.id, { onDelete: 'cascade' }),
  sellerId: varchar("seller_id", { length: 255 }).notNull().references(() => users.id),
  commodityName: varchar("commodity_name", { length: 255 }).notNull(),
  commodityCategory: varchar("commodity_category", { length: 50 }),
  hsCode: varchar("hs_code", { length: 20 }),
  hubCode: varchar("hub_code", { length: 10 }),
  originCountry: varchar("origin_country", { length: 100 }),
  qualityGrade: qualityGradeEnum("quality_grade"),
  quantity: decimal("quantity", { precision: 15, scale: 3 }).notNull(),
  unit: varchar("unit", { length: 20 }).notNull().default('MT'),
  minOrderQty: decimal("min_order_qty", { precision: 15, scale: 3 }),
  askingPriceCents: bigint("asking_price_cents", { mode: "number" }),
  askingCurrency: varchar("asking_currency", { length: 10 }).default('USD'),
  incoterms: varchar("incoterms", { length: 20 }),
  isVisible: boolean("is_visible").notNull().default(true),
  publishedAt: timestamp("published_at").notNull().defaultNow(),
  hiddenAt: timestamp("hidden_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type ConsignmentListing = typeof consignmentListings.$inferSelect;
export type InsertConsignmentListing = typeof consignmentListings.$inferInsert;

// --- Consignment Tally (Step 4 — warehouse weigh/count/verify) ---
export const consignmentTallyStatusEnum = pgEnum('consignment_tally_status', [
  'Draft', 'Tallied', 'Verified', 'Rejected'
]);

export const consignmentTally = pgTable("consignment_tally", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  consignmentId: varchar("consignment_id", { length: 255 }).notNull().unique().references(() => consignments.id, { onDelete: 'cascade' }),
  hubCode: varchar("hub_code", { length: 10 }).notNull(),
  operatorId: varchar("operator_id", { length: 255 }).notNull().references(() => users.id),
  arrivedAt: timestamp("arrived_at"),
  declaredQuantity: decimal("declared_quantity", { precision: 15, scale: 3 }).notNull(),
  actualQuantity: decimal("actual_quantity", { precision: 15, scale: 3 }),
  unit: varchar("unit", { length: 20 }).notNull().default('MT'),
  packageCount: integer("package_count"),
  packageType: varchar("package_type", { length: 100 }),
  qualityGrade: qualityGradeEnum("quality_grade"),
  moisturePct: decimal("moisture_pct", { precision: 5, scale: 2 }),
  sampleNotes: text("sample_notes"),
  damageNotes: text("damage_notes"),
  photos: jsonb("photos"),
  status: consignmentTallyStatusEnum("status").notNull().default('Draft'),
  verifiedAt: timestamp("verified_at"),
  verifiedBy: varchar("verified_by", { length: 255 }).references((): AnyPgColumn => users.id),
  rejectedAt: timestamp("rejected_at"),
  rejectionReason: text("rejection_reason"),
  inventoryItemId: varchar("inventory_item_id", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertConsignmentTallySchema = createInsertSchema(consignmentTally).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertConsignmentTally = z.infer<typeof insertConsignmentTallySchema>;
export type ConsignmentTally = typeof consignmentTally.$inferSelect;

// --- Consignment Physical Tally (warehouse inspector reading — Task #73) ---
export const consignmentTallies = pgTable("consignment_tallies", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  consignmentId: varchar("consignment_id", { length: 255 }).notNull().references(() => consignments.id, { onDelete: 'cascade' }),
  inspectorId: varchar("inspector_id", { length: 255 }).references((): AnyPgColumn => users.id),
  inspectorName: varchar("inspector_name", { length: 255 }).notNull(),
  inspectedAt: timestamp("inspected_at").notNull().defaultNow(),
  declaredQuantity: decimal("declared_quantity", { precision: 15, scale: 3 }).notNull(),
  actualQuantity: decimal("actual_quantity", { precision: 15, scale: 3 }).notNull(),
  variancePct: decimal("variance_pct", { precision: 8, scale: 3 }),
  actualGrade: varchar("actual_grade", { length: 20 }),
  moisturePct: decimal("moisture_pct", { precision: 8, scale: 3 }),
  qualityReadings: jsonb("quality_readings"),
  weighbridgeSlipKey: text("weighbridge_slip_key"),
  photoKeys: jsonb("photo_keys").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
export type ConsignmentTallyRow = typeof consignmentTallies.$inferSelect;

// --- Electronic Warehouse Receipts (eWR) ---
export const warehouseReceipts = pgTable("warehouse_receipts", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  wrNumber: varchar("wr_number", { length: 64 }).notNull().unique(),
  consignmentId: varchar("consignment_id", { length: 255 }).notNull().references(() => consignments.id, { onDelete: 'cascade' }),
  tallyId: varchar("tally_id", { length: 255 }).references((): AnyPgColumn => consignmentTallies.id),
  hubCode: varchar("hub_code", { length: 20 }).notNull(),
  commodityName: varchar("commodity_name", { length: 255 }).notNull(),
  quantity: decimal("quantity", { precision: 15, scale: 3 }).notNull(),
  unit: varchar("unit", { length: 20 }).notNull(),
  grade: varchar("grade", { length: 20 }),
  issuedAt: timestamp("issued_at").notNull().defaultNow(),
  issuedBy: varchar("issued_by", { length: 255 }).references((): AnyPgColumn => users.id),
  pdfObjectKey: text("pdf_object_key"),
  pdfStatus: warehouseReceiptPdfStatusEnum("pdf_status").notNull().default('pending'),
  pdfError: text("pdf_error"),
  qrPayload: text("qr_payload").notNull(),
  status: warehouseReceiptStatusEnum("status").notNull().default('active'),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
export type WarehouseReceipt = typeof warehouseReceipts.$inferSelect;

// --- Inventory Items (Steps 3 & 4 — warehouse stock) ---
export const inventoryItems = pgTable("inventory_items", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  warehouseReceiptNo: varchar("warehouse_receipt_no", { length: 100 }).unique(),
  consignmentId: varchar("consignment_id", { length: 255 }).references(() => consignments.id),
  hubId: varchar("hub_id", { length: 255 }).notNull().references(() => warehouseHubs.id),
  commodityId: varchar("commodity_id", { length: 255 }).references(() => commodities.id),
  commodityName: varchar("commodity_name", { length: 255 }).notNull(),
  ownerId: varchar("owner_id", { length: 255 }).notNull().references(() => users.id),
  quantityReceived: decimal("quantity_received", { precision: 15, scale: 3 }).notNull(),
  quantityAvailable: decimal("quantity_available", { precision: 15, scale: 3 }).notNull(),
  quantityReserved: decimal("quantity_reserved", { precision: 15, scale: 3 }).default('0'),
  unit: varchar("unit", { length: 20 }).notNull().default('MT'),
  qualityGrade: qualityGradeEnum("quality_grade"),
  valuationPerUnit: decimal("valuation_per_unit", { precision: 15, scale: 2 }),
  valuationCurrency: varchar("valuation_currency", { length: 10 }).default('USD'),
  isListed: boolean("is_listed").notNull().default(false),
  receivedAt: timestamp("received_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertInventoryItemSchema = createInsertSchema(inventoryItems).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;
export type InventoryItem = typeof inventoryItems.$inferSelect;

// --- Marketplace Listings (Step 5) ---
export const marketplaceListings = pgTable("marketplace_listings", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  inventoryItemId: varchar("inventory_item_id", { length: 255 }).notNull().references(() => inventoryItems.id),
  sellerId: varchar("seller_id", { length: 255 }).notNull().references(() => users.id),
  hubId: varchar("hub_id", { length: 255 }).notNull().references(() => warehouseHubs.id),
  commodityName: varchar("commodity_name", { length: 255 }).notNull(),
  hsCode: varchar("hs_code", { length: 20 }),
  quantityAvailable: decimal("quantity_available", { precision: 15, scale: 3 }).notNull(),
  unit: varchar("unit", { length: 20 }).notNull().default('MT'),
  askPricePerUnit: decimal("ask_price_per_unit", { precision: 15, scale: 2 }),
  currency: varchar("currency", { length: 10 }).default('USD'),
  qualityGrade: qualityGradeEnum("quality_grade"),
  incoterms: varchar("incoterms", { length: 20 }),
  minOrderQty: decimal("min_order_qty", { precision: 15, scale: 3 }),
  isActive: boolean("is_active").notNull().default(true),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertMarketplaceListingSchema = createInsertSchema(marketplaceListings).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMarketplaceListing = z.infer<typeof insertMarketplaceListingSchema>;
export type MarketplaceListing = typeof marketplaceListings.$inferSelect;

// --- RFQs (Step 5/6 — Request for Quotation) ---
export const rfqs = pgTable("rfqs", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  referenceNo: varchar("reference_no", { length: 50 }).unique(),
  buyerId: varchar("buyer_id", { length: 255 }).notNull().references(() => users.id),
  listingId: varchar("listing_id", { length: 255 }).references(() => marketplaceListings.id),
  commodityName: varchar("commodity_name", { length: 255 }).notNull(),
  hubId: varchar("hub_id", { length: 255 }).references(() => warehouseHubs.id),
  requestedQuantity: decimal("requested_quantity", { precision: 15, scale: 3 }).notNull(),
  unit: varchar("unit", { length: 20 }).notNull().default('MT'),
  targetPricePerUnit: decimal("target_price_per_unit", { precision: 15, scale: 2 }),
  currency: varchar("currency", { length: 10 }).default('USD'),
  qualityRequired: qualityGradeEnum("quality_required"),
  incoterms: varchar("incoterms", { length: 20 }),
  deliveryDeadline: date("delivery_deadline"),
  notes: text("notes"),
  status: rfqStatusEnum("status").notNull().default('Open'),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertRfqSchema = createInsertSchema(rfqs).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRfq = z.infer<typeof insertRfqSchema>;
export type Rfq = typeof rfqs.$inferSelect;

// --- RFQ Offers (seller responses) ---
export const rfqOffers = pgTable("rfq_offers", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  rfqId: varchar("rfq_id", { length: 255 }).notNull().references(() => rfqs.id),
  sellerId: varchar("seller_id", { length: 255 }).notNull().references(() => users.id),
  offeredQuantity: decimal("offered_quantity", { precision: 15, scale: 3 }).notNull(),
  pricePerUnit: decimal("price_per_unit", { precision: 15, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).default('USD'),
  validUntil: timestamp("valid_until"),
  notes: text("notes"),
  status: text("status").notNull().default('Pending'),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertRfqOfferSchema = createInsertSchema(rfqOffers).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRfqOffer = z.infer<typeof insertRfqOfferSchema>;
export type RfqOffer = typeof rfqOffers.$inferSelect;

// --- Trade Orders (Step 6) ---
export const tradeOrders = pgTable("trade_orders", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  orderNo: varchar("order_no", { length: 50 }).unique(),
  rfqId: varchar("rfq_id", { length: 255 }).references(() => rfqs.id),
  buyerId: varchar("buyer_id", { length: 255 }).notNull().references(() => users.id),
  sellerId: varchar("seller_id", { length: 255 }).notNull().references(() => users.id),
  hubId: varchar("hub_id", { length: 255 }).references(() => warehouseHubs.id),
  commodityName: varchar("commodity_name", { length: 255 }).notNull(),
  quantity: decimal("quantity", { precision: 15, scale: 3 }).notNull(),
  unit: varchar("unit", { length: 20 }).notNull().default('MT'),
  pricePerUnit: decimal("price_per_unit", { precision: 15, scale: 2 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 20, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).default('USD'),
  status: text("status").notNull().default('Pending Payment'),
  paymentMethod: varchar("payment_method", { length: 50 }),
  paidAt: timestamp("paid_at"),
  deliveredAt: timestamp("delivered_at"),
  listingId: varchar("listing_id", { length: 255 }),
  consignmentId: varchar("consignment_id", { length: 255 }).references((): AnyPgColumn => consignments.id),
  walletHoldId: varchar("wallet_hold_id", { length: 255 }),
  marginCents: bigint("margin_cents", { mode: "number" }),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const b2bWatchlist = pgTable("b2b_watchlist", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  consignmentId: varchar("consignment_id", { length: 255 }).notNull().references(() => consignments.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
export type B2bWatchlistItem = typeof b2bWatchlist.$inferSelect;

export const insertTradeOrderSchema = createInsertSchema(tradeOrders).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTradeOrder = z.infer<typeof insertTradeOrderSchema>;
export type TradeOrder = typeof tradeOrders.$inferSelect;

// --- Escrow Holds (Step 8 — FUSD-backed) ---
export const escrowHolds = pgTable("escrow_holds", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  escrowRef: varchar("escrow_ref", { length: 50 }).unique(),
  tradeOrderId: varchar("trade_order_id", { length: 255 }).notNull().references(() => tradeOrders.id),
  buyerId: varchar("buyer_id", { length: 255 }).notNull().references(() => users.id),
  sellerId: varchar("seller_id", { length: 255 }).notNull().references(() => users.id),
  amount: decimal("amount", { precision: 20, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).default('FUSD'),
  status: escrowStatusEnum("status").notNull().default('Pending Funding'),
  fundedAt: timestamp("funded_at"),
  releasedAt: timestamp("released_at"),
  releaseConditions: jsonb("release_conditions"),
  disputeRaisedAt: timestamp("dispute_raised_at"),
  disputeNotes: text("dispute_notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertEscrowHoldSchema = createInsertSchema(escrowHolds).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEscrowHold = z.infer<typeof insertEscrowHoldSchema>;
export type EscrowHold = typeof escrowHolds.$inferSelect;

// --- Government Barter Requests (Step 7) ---
export const barterRequests = pgTable("barter_requests", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  referenceNo: varchar("reference_no", { length: 50 }).unique(),
  initiatorId: varchar("initiator_id", { length: 255 }).notNull().references(() => users.id),
  offeringCommodity: varchar("offering_commodity", { length: 255 }).notNull(),
  offeringQuantity: decimal("offering_quantity", { precision: 15, scale: 3 }).notNull(),
  offeringUnit: varchar("offering_unit", { length: 20 }).notNull().default('MT'),
  requestedCommodity: varchar("requested_commodity", { length: 255 }).notNull(),
  requestedQuantity: decimal("requested_quantity", { precision: 15, scale: 3 }).notNull(),
  requestedUnit: varchar("requested_unit", { length: 20 }).notNull().default('MT'),
  status: text("status").notNull().default('Draft'),
  governmentApprovalRef: varchar("government_approval_ref", { length: 100 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertBarterRequestSchema = createInsertSchema(barterRequests).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBarterRequest = z.infer<typeof insertBarterRequestSchema>;
export type BarterRequest = typeof barterRequests.$inferSelect;

// --- Delivery Milestones (logistics tracking) ---
export const deliveryMilestones = pgTable("delivery_milestones", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  consignmentId: varchar("consignment_id", { length: 255 }).notNull().references(() => consignments.id),
  tradeOrderId: varchar("trade_order_id", { length: 255 }).references(() => tradeOrders.id),
  milestone: varchar("milestone", { length: 255 }).notNull(),
  status: text("status").notNull().default('Pending'),
  location: varchar("location", { length: 255 }),
  notes: text("notes"),
  achievedAt: timestamp("achieved_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDeliveryMilestoneSchema = createInsertSchema(deliveryMilestones).omit({ id: true, createdAt: true });
export type InsertDeliveryMilestone = z.infer<typeof insertDeliveryMilestoneSchema>;
export type DeliveryMilestone = typeof deliveryMilestones.$inferSelect;

// ============================================
// B2B USD WALLET (Task #74)
// All amounts are bigint cents. Balance math owned by walletService.
// ============================================

export const b2bWallets = pgTable("b2b_wallets", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull().unique().references(() => users.id),
  currency: varchar("currency", { length: 8 }).notNull().default('USD'),
  availableCents: integer("available_cents").notNull().default(0),
  lockedCents: integer("locked_cents").notNull().default(0),
  pendingCents: integer("pending_cents").notNull().default(0),
  virtualAccountNumber: varchar("virtual_account_number", { length: 64 }),
  virtualAccountBank: varchar("virtual_account_bank", { length: 128 }),
  virtualAccountReference: varchar("virtual_account_reference", { length: 64 }),
  stablecoinAddress: varchar("stablecoin_address", { length: 128 }),
  stablecoinNetwork: varchar("stablecoin_network", { length: 32 }).notNull().default('polygon'),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
export type B2bWallet = typeof b2bWallets.$inferSelect;

export const b2bWalletTransactions = pgTable("b2b_wallet_transactions", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  walletId: varchar("wallet_id", { length: 255 }).notNull().references(() => b2bWallets.id, { onDelete: 'cascade' }),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  type: varchar("type", { length: 48 }).notNull(),
  amountCents: integer("amount_cents").notNull(),
  balanceAfterCents: integer("balance_after_cents").notNull(),
  lockedAfterCents: integer("locked_after_cents").notNull().default(0),
  referenceType: varchar("reference_type", { length: 64 }),
  referenceId: varchar("reference_id", { length: 255 }),
  idempotencyKey: varchar("idempotency_key", { length: 128 }),
  description: text("description"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
export type B2bWalletTransaction = typeof b2bWalletTransactions.$inferSelect;

export const b2bWalletHolds = pgTable("b2b_wallet_holds", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  walletId: varchar("wallet_id", { length: 255 }).notNull().references(() => b2bWallets.id, { onDelete: 'cascade' }),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  amountCents: integer("amount_cents").notNull(),
  status: varchar("status", { length: 32 }).notNull().default('open'),
  referenceType: varchar("reference_type", { length: 64 }),
  referenceId: varchar("reference_id", { length: 255 }),
  expiresAt: timestamp("expires_at"),
  releasedAt: timestamp("released_at"),
  convertedEscrowId: varchar("converted_escrow_id", { length: 255 }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
export type B2bWalletHold = typeof b2bWalletHolds.$inferSelect;

export const b2bDepositIntents = pgTable("b2b_deposit_intents", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  walletId: varchar("wallet_id", { length: 255 }).notNull().references(() => b2bWallets.id, { onDelete: 'cascade' }),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  rail: varchar("rail", { length: 32 }).notNull(),
  amountCents: integer("amount_cents").notNull(),
  status: varchar("status", { length: 32 }).notNull().default('pending'),
  externalRef: varchar("external_ref", { length: 255 }),
  proofObjectKey: varchar("proof_object_key", { length: 512 }),
  metadata: jsonb("metadata"),
  creditedTransactionId: varchar("credited_transaction_id", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
export type B2bDepositIntent = typeof b2bDepositIntents.$inferSelect;

export const b2bWithdrawalRequests = pgTable("b2b_withdrawal_requests", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  walletId: varchar("wallet_id", { length: 255 }).notNull().references(() => b2bWallets.id, { onDelete: 'cascade' }),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  amountCents: integer("amount_cents").notNull(),
  bankDetailsEncrypted: text("bank_details_encrypted").notNull(),
  bankDetailsHint: varchar("bank_details_hint", { length: 128 }),
  holdId: varchar("hold_id", { length: 255 }).references(() => b2bWalletHolds.id),
  status: varchar("status", { length: 32 }).notNull().default('pending'),
  reviewerId: varchar("reviewer_id", { length: 255 }).references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  rejectReason: text("reject_reason"),
  externalRef: varchar("external_ref", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
export type B2bWithdrawalRequest = typeof b2bWithdrawalRequests.$inferSelect;

// ============================================
// TRADE FINANCE SUITE (Task #146)
// Multi-currency wallet, milestone escrow, LC lifecycle, dispute tribunal.
// All money in BIGINT cents (decimal places per currency).
// ============================================

export const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP'] as const;
export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

export const currencyRates = pgTable("currency_rates", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  baseCurrency: varchar("base_currency", { length: 8 }).notNull(),
  quoteCurrency: varchar("quote_currency", { length: 8 }).notNull(),
  rate: decimal("rate", { precision: 18, scale: 8 }).notNull(),
  source: varchar("source", { length: 64 }).notNull().default('manual'),
  effectiveDate: timestamp("effective_date", { mode: 'date' }).notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
export type CurrencyRate = typeof currencyRates.$inferSelect;

export const walletBalances = pgTable("wallet_balances", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  currency: varchar("currency", { length: 8 }).notNull(),
  availableCents: bigint("available_cents", { mode: 'number' }).notNull().default(0),
  lockedCents: bigint("locked_cents", { mode: 'number' }).notNull().default(0),
  // In-flight credits awaiting payment-rail confirmation (bank wire, on-chain
  // settlement, etc.) — counted neither as available nor locked.
  pendingCents: bigint("pending_cents", { mode: 'number' }).notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
export type WalletBalance = typeof walletBalances.$inferSelect;

export const walletBalanceTransactions = pgTable("wallet_balance_transactions", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  balanceId: varchar("balance_id", { length: 255 }).notNull().references(() => walletBalances.id, { onDelete: 'cascade' }),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  currency: varchar("currency", { length: 8 }).notNull(),
  type: varchar("type", { length: 48 }).notNull(),
  amountCents: bigint("amount_cents", { mode: 'number' }).notNull(),
  balanceAfterCents: bigint("balance_after_cents", { mode: 'number' }).notNull(),
  lockedAfterCents: bigint("locked_after_cents", { mode: 'number' }).notNull().default(0),
  referenceType: varchar("reference_type", { length: 64 }),
  referenceId: varchar("reference_id", { length: 255 }),
  idempotencyKey: varchar("idempotency_key", { length: 128 }),
  description: text("description"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
export type WalletBalanceTransaction = typeof walletBalanceTransactions.$inferSelect;

export const tradeMilestones = pgTable("trade_milestones", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  tradeCaseId: varchar("trade_case_id", { length: 255 }).notNull().references(() => tradeCases.id, { onDelete: 'cascade' }),
  sequence: integer("sequence").notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  trigger: varchar("trigger", { length: 64 }).notNull(),
  percent: decimal("percent", { precision: 5, scale: 2 }).notNull(),
  amountCents: bigint("amount_cents", { mode: 'number' }).notNull(),
  currency: varchar("currency", { length: 8 }).notNull().default('USD'),
  status: varchar("status", { length: 32 }).notNull().default('pending'),
  releasedAmountCents: bigint("released_amount_cents", { mode: 'number' }).notNull().default(0),
  releasedAt: timestamp("released_at"),
  releasedBy: varchar("released_by", { length: 255 }).references(() => users.id),
  releaseReason: text("release_reason"),
  evidenceDocumentIds: text("evidence_document_ids").array(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
export type TradeMilestone = typeof tradeMilestones.$inferSelect;

export const lettersOfCredit = pgTable("letters_of_credit", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  lcRef: varchar("lc_ref", { length: 64 }).notNull().unique(),
  tradeCaseId: varchar("trade_case_id", { length: 255 }).notNull().references(() => tradeCases.id, { onDelete: 'cascade' }),
  dealRoomId: varchar("deal_room_id", { length: 255 }).references(() => dealRooms.id),
  issuingBankName: varchar("issuing_bank_name", { length: 255 }),
  applicantUserId: varchar("applicant_user_id", { length: 255 }).notNull().references(() => users.id),
  beneficiaryUserId: varchar("beneficiary_user_id", { length: 255 }).notNull().references(() => users.id),
  currency: varchar("currency", { length: 8 }).notNull().default('USD'),
  amountCents: bigint("amount_cents", { mode: 'number' }).notNull(),
  incoterms: varchar("incoterms", { length: 32 }),
  expiryDate: timestamp("expiry_date", { mode: 'date' }),
  latestShipmentDate: timestamp("latest_shipment_date", { mode: 'date' }),
  requiredDocuments: text("required_documents").array(),
  draftUrl: text("draft_url"),
  status: varchar("status", { length: 48 }).notNull().default('Draft'),
  termsJson: jsonb("terms_json"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
export type LetterOfCredit = typeof lettersOfCredit.$inferSelect;

export const lcEvents = pgTable("lc_events", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  lcId: varchar("lc_id", { length: 255 }).notNull().references(() => lettersOfCredit.id, { onDelete: 'cascade' }),
  eventType: varchar("event_type", { length: 48 }).notNull(),
  actorUserId: varchar("actor_user_id", { length: 255 }).references(() => users.id),
  actorRole: varchar("actor_role", { length: 32 }),
  payload: jsonb("payload"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
export type LcEvent = typeof lcEvents.$inferSelect;

export const lcPresentations = pgTable("lc_presentations", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  lcId: varchar("lc_id", { length: 255 }).notNull().references(() => lettersOfCredit.id, { onDelete: 'cascade' }),
  presentedByUserId: varchar("presented_by_user_id", { length: 255 }).notNull().references(() => users.id),
  documentIds: text("document_ids").array().notNull(),
  status: varchar("status", { length: 48 }).notNull().default('Pending Review'),
  discrepancies: text("discrepancies").array(),
  reviewedBy: varchar("reviewed_by", { length: 255 }).references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  decision: varchar("decision", { length: 48 }),
  decisionNotes: text("decision_notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
export type LcPresentation = typeof lcPresentations.$inferSelect;

// ============================================
// TRADE FINANCE MASTER DATA (Task #172)
// ============================================

export const bankPartners = pgTable("bank_partners", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  swiftBic: varchar("swift_bic", { length: 20 }).notNull().unique(),
  country: varchar("country", { length: 100 }).notNull(),
  role: varchar("role", { length: 32 }).notNull().default('issuing'),
  supportedCurrencies: text("supported_currencies").array().notNull().default(sql`ARRAY['USD']::text[]`),
  rating: varchar("rating", { length: 16 }),
  contactEmail: varchar("contact_email", { length: 255 }),
  contactPhone: varchar("contact_phone", { length: 64 }),
  notes: text("notes"),
  status: varchar("status", { length: 16 }).notNull().default('active'),
  createdBy: varchar("created_by", { length: 255 }).references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
export type BankPartner = typeof bankPartners.$inferSelect;
export type InsertBankPartner = typeof bankPartners.$inferInsert;

export const lcTemplates = pgTable("lc_templates", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  lcType: varchar("lc_type", { length: 32 }).notNull(),
  description: text("description"),
  defaultIncoterms: varchar("default_incoterms", { length: 16 }),
  defaultTenorDays: integer("default_tenor_days"),
  defaultTolerancePct: decimal("default_tolerance_pct", { precision: 5, scale: 2 }),
  requiredDocuments: text("required_documents").array().notNull().default(sql`ARRAY[]::text[]`),
  defaultTerms: jsonb("default_terms").notNull().default(sql`'{}'::jsonb`),
  status: varchar("status", { length: 16 }).notNull().default('active'),
  createdBy: varchar("created_by", { length: 255 }).references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
export type LcTemplate = typeof lcTemplates.$inferSelect;
export type InsertLcTemplate = typeof lcTemplates.$inferInsert;

export const milestonePresets = pgTable("milestone_presets", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  commodityCategory: varchar("commodity_category", { length: 100 }),
  schedule: jsonb("schedule").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  status: varchar("status", { length: 16 }).notNull().default('active'),
  createdBy: varchar("created_by", { length: 255 }).references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
export type MilestonePreset = typeof milestonePresets.$inferSelect;
export type InsertMilestonePreset = typeof milestonePresets.$inferInsert;

export const escrowConfigurations = pgTable("escrow_configurations", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  currency: varchar("currency", { length: 8 }).notNull().unique(),
  accountHolder: varchar("account_holder", { length: 255 }).notNull(),
  holdingBank: varchar("holding_bank", { length: 255 }).notNull(),
  accountNumber: varchar("account_number", { length: 64 }),
  swiftBic: varchar("swift_bic", { length: 20 }),
  maxHoldPerCaseCents: bigint("max_hold_per_case_cents", { mode: "number" }),
  autoReleaseTimeoutDays: integer("auto_release_timeout_days").notNull().default(30),
  requiresKyc: boolean("requires_kyc").notNull().default(true),
  notes: text("notes"),
  status: varchar("status", { length: 16 }).notNull().default('active'),
  createdBy: varchar("created_by", { length: 255 }).references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
export type EscrowConfiguration = typeof escrowConfigurations.$inferSelect;
export type InsertEscrowConfiguration = typeof escrowConfigurations.$inferInsert;
