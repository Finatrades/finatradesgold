CREATE TYPE "public"."fraud_alert_severity" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."fraud_alert_status" AS ENUM('new', 'investigating', 'confirmed_fraud', 'false_positive', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."fraud_alert_type" AS ENUM('velocity_breach', 'unusual_amount', 'geographic_anomaly', 'device_change', 'pattern_match', 'manual_flag');--> statement-breakpoint
CREATE TYPE "public"."reconciliation_status" AS ENUM('balanced', 'discrepancy_found', 'pending_review', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."sar_activity_type" AS ENUM('structuring', 'unusual_transaction_pattern', 'high_risk_jurisdiction', 'identity_concern', 'source_of_funds_concern', 'terrorist_financing_suspicion', 'money_laundering_suspicion', 'other');--> statement-breakpoint
CREATE TYPE "public"."sar_status" AS ENUM('draft', 'under_review', 'approved', 'filed', 'rejected');--> statement-breakpoint
CREATE TABLE "fraud_alerts" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"transaction_id" varchar(255),
	"alert_type" "fraud_alert_type" NOT NULL,
	"severity" "fraud_alert_severity" NOT NULL,
	"description" text NOT NULL,
	"risk_score" integer,
	"risk_factors" json,
	"status" "fraud_alert_status" DEFAULT 'new' NOT NULL,
	"reviewed_by" varchar(255),
	"reviewed_at" timestamp,
	"review_notes" text,
	"resolution" text,
	"resolved_by" varchar(255),
	"resolved_at" timestamp,
	"detected_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reconciliation_reports" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_date" date NOT NULL,
	"total_gold_grams" numeric(20, 4) NOT NULL,
	"total_usd_value" numeric(20, 2) NOT NULL,
	"transaction_count" integer NOT NULL,
	"deposit_count" integer NOT NULL,
	"withdrawal_count" integer NOT NULL,
	"gold_inflow" numeric(20, 4) NOT NULL,
	"gold_outflow" numeric(20, 4) NOT NULL,
	"net_gold_change" numeric(20, 4) NOT NULL,
	"discrepancies" json,
	"status" "reconciliation_status" DEFAULT 'balanced' NOT NULL,
	"generated_by" varchar(255),
	"reviewed_by" varchar(255),
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sar_reports" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_number" varchar(50) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"case_id" varchar(255),
	"activity_type" "sar_activity_type" NOT NULL,
	"activity_description" text NOT NULL,
	"transaction_ids" json,
	"total_amount_involved" numeric(20, 2) NOT NULL,
	"date_range_start" date NOT NULL,
	"date_range_end" date NOT NULL,
	"reporting_officer" varchar(255) NOT NULL,
	"supervisor_reviewed" boolean DEFAULT false,
	"supervisor_reviewed_by" varchar(255),
	"supervisor_reviewed_at" timestamp,
	"status" "sar_status" DEFAULT 'draft' NOT NULL,
	"filed_with_regulator" boolean DEFAULT false,
	"filed_at" timestamp,
	"regulator_reference_number" varchar(100),
	"notes" text,
	"attachments" json,
	"created_by" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sar_reports_report_number_unique" UNIQUE("report_number")
);
--> statement-breakpoint
ALTER TABLE "fraud_alerts" ADD CONSTRAINT "fraud_alerts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fraud_alerts" ADD CONSTRAINT "fraud_alerts_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fraud_alerts" ADD CONSTRAINT "fraud_alerts_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sar_reports" ADD CONSTRAINT "sar_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sar_reports" ADD CONSTRAINT "sar_reports_case_id_aml_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."aml_cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sar_reports" ADD CONSTRAINT "sar_reports_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;