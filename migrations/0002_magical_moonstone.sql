CREATE TYPE "public"."announcement_target" AS ENUM('all', 'users', 'admins', 'business');--> statement-breakpoint
CREATE TYPE "public"."announcement_type" AS ENUM('info', 'warning', 'success', 'critical');--> statement-breakpoint
CREATE TYPE "public"."approval_status" AS ENUM('pending_l1', 'pending_final', 'approved', 'rejected', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."permission_action" AS ENUM('view', 'create', 'edit', 'approve_l1', 'approve_final', 'reject', 'export', 'delete');--> statement-breakpoint
CREATE TYPE "public"."regulatory_report_status" AS ENUM('draft', 'generated', 'reviewed', 'submitted', 'archived');--> statement-breakpoint
CREATE TYPE "public"."regulatory_report_type" AS ENUM('daily_summary', 'weekly_summary', 'monthly_summary', 'aml_report', 'kyc_report', 'transaction_report', 'customer_due_diligence', 'risk_assessment', 'audit_report');--> statement-breakpoint
CREATE TYPE "public"."scheduled_job_status" AS ENUM('active', 'paused', 'completed', 'failed', 'running');--> statement-breakpoint
CREATE TYPE "public"."settlement_status" AS ENUM('pending', 'processing', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."settlement_type" AS ENUM('withdrawal', 'bnsl_payout', 'trade_finance', 'refund', 'commission');--> statement-breakpoint
CREATE TABLE "admin_components" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"category" varchar(100) NOT NULL,
	"description" text,
	"path" varchar(255),
	"icon" varchar(50),
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "admin_components_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "admin_roles" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"department" varchar(100),
	"risk_level" "risk_level" DEFAULT 'Low' NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "admin_roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "announcements" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"type" "announcement_type" DEFAULT 'info' NOT NULL,
	"target" "announcement_target" DEFAULT 'all' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"show_banner" boolean DEFAULT true NOT NULL,
	"start_date" timestamp,
	"end_date" timestamp,
	"created_by" varchar(255),
	"view_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_history" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"approval_queue_id" varchar(255) NOT NULL,
	"action" varchar(50) NOT NULL,
	"actor_id" varchar(255) NOT NULL,
	"actor_role" varchar(100),
	"old_value" json,
	"new_value" json,
	"comments" text,
	"ip_address" varchar(45),
	"user_agent" text,
	"session_id" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_queue" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_definition_id" varchar(255) NOT NULL,
	"initiator_id" varchar(255) NOT NULL,
	"entity_type" varchar(100),
	"entity_id" varchar(255),
	"task_data" json,
	"status" "approval_status" DEFAULT 'pending_l1' NOT NULL,
	"priority" varchar(20) DEFAULT 'normal',
	"reason" text,
	"l1_approver_id" varchar(255),
	"l1_approved_at" timestamp,
	"l1_comments" text,
	"final_approver_id" varchar(255),
	"final_approved_at" timestamp,
	"final_comments" text,
	"rejected_by" varchar(255),
	"rejected_at" timestamp,
	"rejection_reason" text,
	"expires_at" timestamp,
	"executed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emergency_overrides" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"approval_queue_id" varchar(255),
	"reason" text NOT NULL,
	"approver1_id" varchar(255) NOT NULL,
	"approver1_at" timestamp DEFAULT now() NOT NULL,
	"approver2_id" varchar(255),
	"approver2_at" timestamp,
	"status" varchar(50) DEFAULT 'pending_second' NOT NULL,
	"executed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "liquidity_snapshots" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"snapshot_date" timestamp NOT NULL,
	"total_gold_grams" numeric(20, 6) NOT NULL,
	"total_gold_value_usd" numeric(20, 2) NOT NULL,
	"total_cash_usd" numeric(20, 2) NOT NULL,
	"total_cash_aed" numeric(20, 2) NOT NULL,
	"pending_withdrawals_usd" numeric(20, 2) NOT NULL,
	"pending_deposits_usd" numeric(20, 2) NOT NULL,
	"bnsl_obligations_usd" numeric(20, 2) NOT NULL,
	"trade_finance_locked_usd" numeric(20, 2) NOT NULL,
	"available_liquidity_usd" numeric(20, 2) NOT NULL,
	"liquidity_ratio" numeric(10, 4) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "regulatory_reports" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_type" "regulatory_report_type" NOT NULL,
	"report_period_start" date NOT NULL,
	"report_period_end" date NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"report_data" json,
	"summary" text,
	"status" "regulatory_report_status" DEFAULT 'draft' NOT NULL,
	"generated_by" varchar(255),
	"generated_at" timestamp,
	"reviewed_by" varchar(255),
	"reviewed_at" timestamp,
	"review_notes" text,
	"submitted_to" varchar(255),
	"submitted_at" timestamp,
	"file_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "revenue_entries" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"module" varchar(100) NOT NULL,
	"revenue_type" varchar(100) NOT NULL,
	"transaction_id" varchar(255),
	"user_id" varchar(255),
	"gross_amount_usd" numeric(20, 2) NOT NULL,
	"fee_amount_usd" numeric(20, 2) NOT NULL,
	"net_amount_usd" numeric(20, 2) NOT NULL,
	"gold_grams" numeric(20, 6),
	"spread_percent" numeric(10, 4),
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_component_permissions" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_id" varchar(255) NOT NULL,
	"component_id" varchar(255) NOT NULL,
	"can_view" boolean DEFAULT false NOT NULL,
	"can_create" boolean DEFAULT false NOT NULL,
	"can_edit" boolean DEFAULT false NOT NULL,
	"can_approve_l1" boolean DEFAULT false NOT NULL,
	"can_approve_final" boolean DEFAULT false NOT NULL,
	"can_reject" boolean DEFAULT false NOT NULL,
	"can_export" boolean DEFAULT false NOT NULL,
	"can_delete" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scheduled_job_runs" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" varchar(255) NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"duration_ms" integer,
	"success" boolean,
	"result" text,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scheduled_jobs" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"cron_expression" varchar(100),
	"interval_ms" integer,
	"status" "scheduled_job_status" DEFAULT 'active' NOT NULL,
	"last_run_at" timestamp,
	"last_run_duration_ms" integer,
	"last_run_result" text,
	"last_error" text,
	"next_run_at" timestamp,
	"run_count" integer DEFAULT 0 NOT NULL,
	"fail_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settlement_queue" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference_id" varchar(255) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"type" "settlement_type" NOT NULL,
	"amount_usd" numeric(20, 2) NOT NULL,
	"amount_gold" numeric(20, 6),
	"currency" varchar(10) DEFAULT 'USD' NOT NULL,
	"payment_method" varchar(100),
	"bank_details" json,
	"status" "settlement_status" DEFAULT 'pending' NOT NULL,
	"priority" integer DEFAULT 5 NOT NULL,
	"scheduled_for" timestamp,
	"processed_at" timestamp,
	"processed_by" varchar(255),
	"external_ref" varchar(255),
	"notes" text,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "settlement_queue_reference_id_unique" UNIQUE("reference_id")
);
--> statement-breakpoint
CREATE TABLE "task_definitions" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"description" text,
	"component_id" varchar(255),
	"category" varchar(100),
	"requires_approval" boolean DEFAULT false NOT NULL,
	"first_approver_role_id" varchar(255),
	"final_approver_role_id" varchar(255),
	"sla_hours" integer DEFAULT 24,
	"auto_expire_hours" integer DEFAULT 72,
	"requires_reason" boolean DEFAULT false NOT NULL,
	"allowed_initiator_roles" json,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "task_definitions_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "user_role_assignments" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"role_id" varchar(255) NOT NULL,
	"assigned_by" varchar(255),
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "finatrades_corporate_kyc" ADD COLUMN "agreement_envelope_id" varchar(255);--> statement-breakpoint
ALTER TABLE "finatrades_corporate_kyc" ADD COLUMN "agreement_status" varchar(50) DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "finatrades_corporate_kyc" ADD COLUMN "agreement_sent_at" timestamp;--> statement-breakpoint
ALTER TABLE "finatrades_corporate_kyc" ADD COLUMN "agreement_completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "finatrades_corporate_kyc" ADD COLUMN "signed_document_url" text;--> statement-breakpoint
ALTER TABLE "finatrades_personal_kyc" ADD COLUMN "agreement_envelope_id" varchar(255);--> statement-breakpoint
ALTER TABLE "finatrades_personal_kyc" ADD COLUMN "agreement_status" varchar(50) DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "finatrades_personal_kyc" ADD COLUMN "agreement_sent_at" timestamp;--> statement-breakpoint
ALTER TABLE "finatrades_personal_kyc" ADD COLUMN "agreement_completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "finatrades_personal_kyc" ADD COLUMN "signed_document_url" text;--> statement-breakpoint
ALTER TABLE "peer_requests" ADD COLUMN "attachment_url" text;--> statement-breakpoint
ALTER TABLE "peer_requests" ADD COLUMN "attachment_name" varchar(255);--> statement-breakpoint
ALTER TABLE "peer_requests" ADD COLUMN "attachment_mime" varchar(100);--> statement-breakpoint
ALTER TABLE "peer_requests" ADD COLUMN "attachment_size" integer;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_history" ADD CONSTRAINT "approval_history_approval_queue_id_approval_queue_id_fk" FOREIGN KEY ("approval_queue_id") REFERENCES "public"."approval_queue"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_history" ADD CONSTRAINT "approval_history_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_queue" ADD CONSTRAINT "approval_queue_task_definition_id_task_definitions_id_fk" FOREIGN KEY ("task_definition_id") REFERENCES "public"."task_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_queue" ADD CONSTRAINT "approval_queue_initiator_id_users_id_fk" FOREIGN KEY ("initiator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_queue" ADD CONSTRAINT "approval_queue_l1_approver_id_users_id_fk" FOREIGN KEY ("l1_approver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_queue" ADD CONSTRAINT "approval_queue_final_approver_id_users_id_fk" FOREIGN KEY ("final_approver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_queue" ADD CONSTRAINT "approval_queue_rejected_by_users_id_fk" FOREIGN KEY ("rejected_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_overrides" ADD CONSTRAINT "emergency_overrides_approval_queue_id_approval_queue_id_fk" FOREIGN KEY ("approval_queue_id") REFERENCES "public"."approval_queue"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_overrides" ADD CONSTRAINT "emergency_overrides_approver1_id_users_id_fk" FOREIGN KEY ("approver1_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_overrides" ADD CONSTRAINT "emergency_overrides_approver2_id_users_id_fk" FOREIGN KEY ("approver2_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "regulatory_reports" ADD CONSTRAINT "regulatory_reports_generated_by_users_id_fk" FOREIGN KEY ("generated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "regulatory_reports" ADD CONSTRAINT "regulatory_reports_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_component_permissions" ADD CONSTRAINT "role_component_permissions_role_id_admin_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."admin_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_component_permissions" ADD CONSTRAINT "role_component_permissions_component_id_admin_components_id_fk" FOREIGN KEY ("component_id") REFERENCES "public"."admin_components"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_job_runs" ADD CONSTRAINT "scheduled_job_runs_job_id_scheduled_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."scheduled_jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_queue" ADD CONSTRAINT "settlement_queue_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_definitions" ADD CONSTRAINT "task_definitions_component_id_admin_components_id_fk" FOREIGN KEY ("component_id") REFERENCES "public"."admin_components"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_definitions" ADD CONSTRAINT "task_definitions_first_approver_role_id_admin_roles_id_fk" FOREIGN KEY ("first_approver_role_id") REFERENCES "public"."admin_roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_definitions" ADD CONSTRAINT "task_definitions_final_approver_role_id_admin_roles_id_fk" FOREIGN KEY ("final_approver_role_id") REFERENCES "public"."admin_roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_role_id_admin_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."admin_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_gateway_settings" DROP COLUMN "stripe_enabled";--> statement-breakpoint
ALTER TABLE "payment_gateway_settings" DROP COLUMN "stripe_publishable_key";--> statement-breakpoint
ALTER TABLE "payment_gateway_settings" DROP COLUMN "stripe_secret_key";--> statement-breakpoint
ALTER TABLE "payment_gateway_settings" DROP COLUMN "stripe_webhook_secret";--> statement-breakpoint
ALTER TABLE "payment_gateway_settings" DROP COLUMN "stripe_fee_percent";--> statement-breakpoint
ALTER TABLE "payment_gateway_settings" DROP COLUMN "stripe_fixed_fee";--> statement-breakpoint
ALTER TABLE "payment_gateway_settings" DROP COLUMN "paypal_enabled";--> statement-breakpoint
ALTER TABLE "payment_gateway_settings" DROP COLUMN "paypal_client_id";--> statement-breakpoint
ALTER TABLE "payment_gateway_settings" DROP COLUMN "paypal_client_secret";--> statement-breakpoint
ALTER TABLE "payment_gateway_settings" DROP COLUMN "paypal_mode";--> statement-breakpoint
ALTER TABLE "payment_gateway_settings" DROP COLUMN "paypal_fee_percent";--> statement-breakpoint
ALTER TABLE "payment_gateway_settings" DROP COLUMN "paypal_fixed_fee";