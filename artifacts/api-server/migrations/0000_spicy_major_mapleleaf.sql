CREATE TYPE "public"."account_deletion_status" AS ENUM('Pending', 'Approved', 'Rejected', 'Cancelled', 'Completed');--> statement-breakpoint
CREATE TYPE "public"."account_type" AS ENUM('personal', 'business');--> statement-breakpoint
CREATE TYPE "public"."admin_action_type" AS ENUM('kyc_approval', 'kyc_rejection', 'deposit_approval', 'deposit_rejection', 'withdrawal_approval', 'withdrawal_rejection', 'bnsl_approval', 'bnsl_rejection', 'trade_case_approval', 'trade_case_rejection', 'user_suspension', 'user_activation');--> statement-breakpoint
CREATE TYPE "public"."allocation_status" AS ENUM('Allocated', 'Released', 'Adjusted');--> statement-breakpoint
CREATE TYPE "public"."aml_case_status" AS ENUM('Open', 'Under Investigation', 'Pending SAR', 'SAR Filed', 'Closed - No Action', 'Closed - Action Taken');--> statement-breakpoint
CREATE TYPE "public"."backup_action" AS ENUM('BACKUP_CREATE', 'BACKUP_DOWNLOAD', 'BACKUP_RESTORE', 'BACKUP_DELETE');--> statement-breakpoint
CREATE TYPE "public"."backup_status" AS ENUM('In Progress', 'Success', 'Failed');--> statement-breakpoint
CREATE TYPE "public"."backup_type" AS ENUM('manual', 'scheduled', 'pre_restore');--> statement-breakpoint
CREATE TYPE "public"."bank_account_status" AS ENUM('Active', 'Inactive');--> statement-breakpoint
CREATE TYPE "public"."binance_order_status" AS ENUM('Created', 'Processing', 'Paid', 'Completed', 'Expired', 'Failed', 'Cancelled');--> statement-breakpoint
CREATE TYPE "public"."binance_order_type" AS ENUM('Buy', 'Payout');--> statement-breakpoint
CREATE TYPE "public"."bnsl_payout_status" AS ENUM('Scheduled', 'Processing', 'Paid', 'Failed', 'Cancelled');--> statement-breakpoint
CREATE TYPE "public"."bnsl_plan_status" AS ENUM('Pending Activation', 'Active', 'Maturing', 'Completed', 'Early Termination Requested', 'Early Terminated', 'Defaulted', 'Cancelled');--> statement-breakpoint
CREATE TYPE "public"."bnsl_template_status" AS ENUM('Active', 'Inactive', 'Draft');--> statement-breakpoint
CREATE TYPE "public"."bnsl_termination_status" AS ENUM('None', 'Requested', 'Under Review', 'Approved', 'Rejected', 'Settled');--> statement-breakpoint
CREATE TYPE "public"."buy_gold_status" AS ENUM('Pending', 'Under Review', 'Approved', 'Rejected', 'Credited', 'Cancelled');--> statement-breakpoint
CREATE TYPE "public"."certificate_status" AS ENUM('Active', 'Updated', 'Cancelled', 'Transferred');--> statement-breakpoint
CREATE TYPE "public"."certificate_type" AS ENUM('Digital Ownership', 'Physical Storage', 'Transfer', 'BNSL Lock', 'Trade Lock', 'Trade Release');--> statement-breakpoint
CREATE TYPE "public"."chat_agent_status" AS ENUM('active', 'inactive', 'maintenance');--> statement-breakpoint
CREATE TYPE "public"."chat_agent_type" AS ENUM('general', 'juris', 'support', 'custom');--> statement-breakpoint
CREATE TYPE "public"."chat_message_sender" AS ENUM('user', 'admin', 'agent');--> statement-breakpoint
CREATE TYPE "public"."chat_workflow_status" AS ENUM('active', 'completed', 'abandoned', 'paused');--> statement-breakpoint
CREATE TYPE "public"."content_block_type" AS ENUM('text', 'rich_text', 'image', 'json', 'html');--> statement-breakpoint
CREATE TYPE "public"."content_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."crypto_network" AS ENUM('Bitcoin', 'Ethereum', 'USDT_TRC20', 'USDT_ERC20', 'USDC', 'BNB', 'Solana', 'Polygon', 'Other');--> statement-breakpoint
CREATE TYPE "public"."crypto_payment_status" AS ENUM('Pending', 'Under Review', 'Approved', 'Rejected', 'Credited', 'Expired', 'Cancelled');--> statement-breakpoint
CREATE TYPE "public"."deal_room_document_status" AS ENUM('Pending', 'Verified', 'Rejected', 'Expired');--> statement-breakpoint
CREATE TYPE "public"."deal_room_document_type" AS ENUM('Invoice', 'Bill of Lading', 'Insurance Certificate', 'Certificate of Origin', 'Packing List', 'Quality Certificate', 'Customs Declaration', 'Other');--> statement-breakpoint
CREATE TYPE "public"."deal_room_participant_role" AS ENUM('importer', 'exporter', 'admin');--> statement-breakpoint
CREATE TYPE "public"."delivery_status" AS ENUM('Pending', 'Sent', 'Failed', 'Resent');--> statement-breakpoint
CREATE TYPE "public"."deposit_request_status" AS ENUM('Pending', 'Confirmed', 'Rejected', 'Cancelled');--> statement-breakpoint
CREATE TYPE "public"."device_platform" AS ENUM('ios', 'android', 'web');--> statement-breakpoint
CREATE TYPE "public"."document_status" AS ENUM('Pending', 'Approved', 'Rejected');--> statement-breakpoint
CREATE TYPE "public"."email_log_status" AS ENUM('Queued', 'Sending', 'Sent', 'Failed', 'Bounced');--> statement-breakpoint
CREATE TYPE "public"."employee_role" AS ENUM('super_admin', 'admin', 'manager', 'support', 'finance', 'compliance');--> statement-breakpoint
CREATE TYPE "public"."employee_status" AS ENUM('active', 'inactive', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."fee_module" AS ENUM('FinaPay', 'FinaVault', 'BNSL', 'FinaBridge');--> statement-breakpoint
CREATE TYPE "public"."fee_source" AS ENUM('FinaPay', 'FinaVault', 'BNSL', 'FinaBridge', 'Other');--> statement-breakpoint
CREATE TYPE "public"."fee_type_detail" AS ENUM('buy_spread', 'sell_spread', 'transaction_fee', 'transfer_fee', 'storage_fee', 'withdrawal_fee', 'deposit_fee', 'bnsl_interest', 'bnsl_early_termination', 'bnsl_late_fee', 'trade_finance_fee', 'other');--> statement-breakpoint
CREATE TYPE "public"."finabridge_role" AS ENUM('importer', 'exporter', 'both');--> statement-breakpoint
CREATE TYPE "public"."gold_bar_status" AS ENUM('Available', 'Allocated', 'Reserved', 'In Transit', 'Delivered');--> statement-breakpoint
CREATE TYPE "public"."gold_gift_status" AS ENUM('Pending', 'Sent', 'Claimed', 'Expired', 'Cancelled');--> statement-breakpoint
CREATE TYPE "public"."gold_request_status" AS ENUM('Pending', 'Fulfilled', 'Cancelled', 'Expired', 'Rejected');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('Generated', 'Sent', 'Failed');--> statement-breakpoint
CREATE TYPE "public"."knowledge_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."kyc_mode" AS ENUM('kycAml', 'finatrades');--> statement-breakpoint
CREATE TYPE "public"."kyc_status" AS ENUM('Not Started', 'In Progress', 'Approved', 'Rejected', 'Escalated', 'Pending Review');--> statement-breakpoint
CREATE TYPE "public"."kyc_tier" AS ENUM('tier_1_basic', 'tier_2_enhanced', 'tier_3_corporate');--> statement-breakpoint
CREATE TYPE "public"."ledger_action" AS ENUM('Deposit', 'Withdrawal', 'Transfer_Send', 'Transfer_Receive', 'FinaPay_To_BNSL', 'BNSL_To_FinaPay', 'BNSL_Lock', 'BNSL_Unlock', 'FinaPay_To_FinaBridge', 'FinaBridge_To_FinaPay', 'Trade_Reserve', 'Trade_Release', 'Payout_Credit', 'Fee_Deduction', 'Adjustment', 'Pending_Deposit', 'Pending_Confirm', 'Pending_Reject', 'Physical_Delivery', 'Vault_Transfer', 'Gift_Send', 'Gift_Receive', 'Storage_Fee');--> statement-breakpoint
CREATE TYPE "public"."mfa_method" AS ENUM('totp', 'email');--> statement-breakpoint
CREATE TYPE "public"."ngenius_order_status" AS ENUM('Created', 'Pending', 'Awaiting3DS', 'Authorised', 'Captured', 'Failed', 'Cancelled', 'Refunded');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('info', 'success', 'warning', 'error', 'transaction', 'kyc', 'bnsl', 'trade', 'system');--> statement-breakpoint
CREATE TYPE "public"."ownership_status" AS ENUM('Available', 'Locked_BNSL', 'Reserved_Trade', 'Pending_Deposit', 'Pending_Withdrawal');--> statement-breakpoint
CREATE TYPE "public"."peer_request_status" AS ENUM('Pending', 'Fulfilled', 'Declined', 'Expired', 'Cancelled');--> statement-breakpoint
CREATE TYPE "public"."peer_transfer_channel" AS ENUM('email', 'finatrades_id', 'qr_code');--> statement-breakpoint
CREATE TYPE "public"."peer_transfer_status" AS ENUM('Pending', 'Completed', 'Rejected', 'Expired', 'Failed', 'Reversed');--> statement-breakpoint
CREATE TYPE "public"."physical_delivery_status" AS ENUM('Pending', 'Processing', 'Shipped', 'In Transit', 'Delivered', 'Cancelled', 'Failed');--> statement-breakpoint
CREATE TYPE "public"."platform_config_category" AS ENUM('gold_pricing', 'transaction_limits', 'deposit_limits', 'withdrawal_limits', 'p2p_limits', 'bnsl_settings', 'finabridge_settings', 'payment_fees', 'kyc_settings', 'system_settings', 'vault_settings', 'referral_settings', 'terms_conditions');--> statement-breakpoint
CREATE TYPE "public"."proposal_status" AS ENUM('Submitted', 'Shortlisted', 'Rejected', 'Forwarded', 'Accepted', 'Declined', 'Modification Requested');--> statement-breakpoint
CREATE TYPE "public"."qr_payment_status" AS ENUM('Active', 'Paid', 'Expired', 'Cancelled');--> statement-breakpoint
CREATE TYPE "public"."referral_status" AS ENUM('Pending', 'Active', 'Completed', 'Expired', 'Cancelled');--> statement-breakpoint
CREATE TYPE "public"."risk_level" AS ENUM('Low', 'Medium', 'High', 'Critical');--> statement-breakpoint
CREATE TYPE "public"."screening_status" AS ENUM('Pending', 'Clear', 'Match Found', 'Manual Review', 'Escalated');--> statement-breakpoint
CREATE TYPE "public"."settlement_hold_status" AS ENUM('Held', 'Released', 'Cancelled');--> statement-breakpoint
CREATE TYPE "public"."storage_fee_status" AS ENUM('Pending', 'Paid', 'Overdue', 'Waived');--> statement-breakpoint
CREATE TYPE "public"."system_log_level" AS ENUM('info', 'warn', 'error', 'debug');--> statement-breakpoint
CREATE TYPE "public"."template_type" AS ENUM('email', 'certificate', 'notification', 'page_section', 'invoice', 'financial_report');--> statement-breakpoint
CREATE TYPE "public"."trade_case_status" AS ENUM('Draft', 'Submitted', 'Under Review', 'Approved', 'Active', 'Settled', 'Cancelled', 'Rejected');--> statement-breakpoint
CREATE TYPE "public"."trade_certificate_type" AS ENUM('Trade Confirmation', 'Settlement Certificate', 'Completion Certificate', 'Insurance Certificate');--> statement-breakpoint
CREATE TYPE "public"."trade_dispute_status" AS ENUM('Open', 'Under Review', 'Pending Resolution', 'Resolved', 'Escalated', 'Closed');--> statement-breakpoint
CREATE TYPE "public"."trade_request_status" AS ENUM('Draft', 'Open', 'Proposal Review', 'Awaiting Importer', 'Active Trade', 'Completed', 'Cancelled');--> statement-breakpoint
CREATE TYPE "public"."trade_risk_level" AS ENUM('Low', 'Medium', 'High', 'Critical');--> statement-breakpoint
CREATE TYPE "public"."trade_shipment_status" AS ENUM('Pending', 'Preparing', 'Shipped', 'In Transit', 'Customs Clearance', 'Out for Delivery', 'Delivered', 'Delayed', 'Cancelled');--> statement-breakpoint
CREATE TYPE "public"."transaction_status" AS ENUM('Draft', 'Pending', 'Pending Verification', 'Approved', 'Processing', 'Completed', 'Failed', 'Cancelled', 'Rejected');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('Buy', 'Sell', 'Send', 'Receive', 'Swap', 'Deposit', 'Withdrawal');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."vault_deposit_status" AS ENUM('Submitted', 'Under Review', 'Approved – Awaiting Delivery', 'Received at Vault', 'Stored in Vault', 'Approved', 'Awaiting Delivery', 'Received', 'Stored', 'Rejected', 'Cancelled');--> statement-breakpoint
CREATE TYPE "public"."vault_transfer_status" AS ENUM('Pending', 'Approved', 'In Transit', 'Completed', 'Rejected', 'Cancelled');--> statement-breakpoint
CREATE TYPE "public"."vault_withdrawal_method" AS ENUM('Bank Transfer', 'Crypto');--> statement-breakpoint
CREATE TYPE "public"."vault_withdrawal_status" AS ENUM('Submitted', 'Under Review', 'Approved', 'Processing', 'Completed', 'Rejected', 'Cancelled');--> statement-breakpoint
CREATE TYPE "public"."wallet_adjustment_type" AS ENUM('Credit', 'Debit', 'Freeze', 'Unfreeze', 'Correction');--> statement-breakpoint
CREATE TYPE "public"."wallet_type" AS ENUM('FinaPay', 'BNSL', 'FinaBridge', 'External');--> statement-breakpoint
CREATE TYPE "public"."withdrawal_request_status" AS ENUM('Pending', 'Processing', 'Completed', 'Rejected', 'Cancelled');--> statement-breakpoint
CREATE TABLE "account_deletion_requests" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"reason" text NOT NULL,
	"additional_comments" text,
	"status" "account_deletion_status" DEFAULT 'Pending' NOT NULL,
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"scheduled_deletion_date" timestamp NOT NULL,
	"reviewed_by" varchar(255),
	"reviewed_at" timestamp,
	"review_notes" text,
	"cancelled_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_action_otps" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" varchar(255) NOT NULL,
	"action_type" "admin_action_type" NOT NULL,
	"target_id" varchar(255) NOT NULL,
	"target_type" varchar(100) NOT NULL,
	"code" varchar(10) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"verified_at" timestamp,
	"action_data" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "allocations" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" varchar(255),
	"user_id" varchar(255) NOT NULL,
	"grams_allocated" numeric(18, 6) NOT NULL,
	"vault_location" varchar(255) DEFAULT 'Dubai - Wingold & Metals DMCC' NOT NULL,
	"physical_provider" varchar(255) DEFAULT 'Wingold & Metals DMCC' NOT NULL,
	"storage_certificate_id" varchar(255),
	"allocation_batch_ref" varchar(100),
	"status" "allocation_status" DEFAULT 'Allocated' NOT NULL,
	"notes" text,
	"created_by" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aml_case_activities" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" varchar(255) NOT NULL,
	"activity_type" varchar(50) NOT NULL,
	"description" text NOT NULL,
	"previous_value" text,
	"new_value" text,
	"performed_by" varchar(255) NOT NULL,
	"performed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aml_cases" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_number" varchar(50) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"case_type" varchar(50) NOT NULL,
	"status" "aml_case_status" DEFAULT 'Open' NOT NULL,
	"priority" "risk_level" DEFAULT 'Medium' NOT NULL,
	"triggered_by" varchar(50) NOT NULL,
	"trigger_transaction_id" varchar(255),
	"trigger_details" json,
	"assigned_to" varchar(255),
	"assigned_at" timestamp,
	"investigation_notes" text,
	"sar_required" boolean DEFAULT false,
	"sar_filed_at" timestamp,
	"sar_reference_number" varchar(100),
	"resolution" text,
	"resolved_by" varchar(255),
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "aml_cases_case_number_unique" UNIQUE("case_number")
);
--> statement-breakpoint
CREATE TABLE "aml_monitoring_rules" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rule_name" varchar(255) NOT NULL,
	"rule_code" varchar(50) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 5 NOT NULL,
	"rule_type" varchar(50) NOT NULL,
	"conditions" json,
	"action_type" varchar(50) NOT NULL,
	"created_by" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "aml_monitoring_rules_rule_code_unique" UNIQUE("rule_code")
);
--> statement-breakpoint
CREATE TABLE "aml_screening_logs" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"kyc_submission_id" varchar(255),
	"screening_type" varchar(50) NOT NULL,
	"provider" varchar(100),
	"status" "screening_status" DEFAULT 'Pending' NOT NULL,
	"match_found" boolean DEFAULT false NOT NULL,
	"match_score" integer,
	"raw_response" json,
	"match_details" json,
	"reviewed_by" varchar(255),
	"reviewed_at" timestamp,
	"review_decision" varchar(50),
	"review_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" varchar(100) NOT NULL,
	"entity_id" varchar(255),
	"actor" varchar(255) NOT NULL,
	"actor_role" varchar(100) NOT NULL,
	"action_type" varchar(100) NOT NULL,
	"details" text,
	"old_value" text,
	"new_value" text,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "backup_audit_logs" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action" "backup_action" NOT NULL,
	"backup_id" varchar(255),
	"actor_admin_id" varchar(255),
	"actor_email" varchar(255),
	"ip_address" varchar(100),
	"user_agent" text,
	"result" varchar(50) NOT NULL,
	"error_message" text,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "binance_transactions" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"merchant_trade_no" varchar(100) NOT NULL,
	"prepay_id" varchar(100),
	"transaction_id" varchar(100),
	"order_type" "binance_order_type" NOT NULL,
	"status" "binance_order_status" DEFAULT 'Created' NOT NULL,
	"order_amount_usd" numeric(18, 2) NOT NULL,
	"crypto_currency" varchar(20),
	"crypto_amount" numeric(18, 8),
	"gold_grams" numeric(18, 6),
	"gold_price_usd_per_gram" numeric(12, 2),
	"payout_wallet_address" varchar(255),
	"payout_network" varchar(50),
	"checkout_url" text,
	"qrcode_link" text,
	"expire_time" timestamp,
	"wallet_transaction_id" varchar(255),
	"vault_withdrawal_id" varchar(255),
	"webhook_received_at" timestamp,
	"webhook_payload" json,
	"description" text,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "binance_transactions_merchant_trade_no_unique" UNIQUE("merchant_trade_no")
);
--> statement-breakpoint
CREATE TABLE "bnsl_agreements" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" varchar(255) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"template_version" varchar(50) DEFAULT 'V3' NOT NULL,
	"signature_name" varchar(255) NOT NULL,
	"signed_at" timestamp NOT NULL,
	"terms_and_conditions" text,
	"pdf_path" text,
	"pdf_file_name" varchar(255),
	"plan_details" json NOT NULL,
	"email_sent_at" timestamp,
	"email_message_id" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bnsl_early_terminations" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" varchar(255) NOT NULL,
	"reason" text NOT NULL,
	"current_market_price_usd_per_gram" numeric(12, 2) NOT NULL,
	"admin_fee_percent" numeric(5, 2) NOT NULL,
	"penalty_percent" numeric(5, 2) NOT NULL,
	"total_disbursed_margin_usd" numeric(18, 2) NOT NULL,
	"base_price_component_value_usd" numeric(18, 2) NOT NULL,
	"total_sale_proceeds_usd" numeric(18, 2) NOT NULL,
	"total_deductions_usd" numeric(18, 2) NOT NULL,
	"net_value_usd" numeric(18, 2) NOT NULL,
	"final_gold_grams" numeric(18, 6) NOT NULL,
	"status" "bnsl_termination_status" DEFAULT 'Requested' NOT NULL,
	"decided_by" varchar(255),
	"decided_at" timestamp,
	"decision_notes" text,
	"requested_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bnsl_payouts" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" varchar(255) NOT NULL,
	"sequence" integer NOT NULL,
	"scheduled_date" timestamp NOT NULL,
	"monetary_amount_usd" numeric(18, 2) NOT NULL,
	"market_price_usd_per_gram" numeric(12, 2),
	"grams_credited" numeric(18, 6),
	"status" "bnsl_payout_status" DEFAULT 'Scheduled' NOT NULL,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bnsl_plan_templates" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"status" "bnsl_template_status" DEFAULT 'Draft' NOT NULL,
	"min_gold_grams" numeric(18, 6) DEFAULT '10' NOT NULL,
	"max_gold_grams" numeric(18, 6) DEFAULT '10000' NOT NULL,
	"payout_frequency" varchar(50) DEFAULT 'Quarterly' NOT NULL,
	"early_termination_fee_percent" numeric(5, 2) DEFAULT '2.00' NOT NULL,
	"admin_fee_percent" numeric(5, 2) DEFAULT '0.50' NOT NULL,
	"terms_and_conditions" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bnsl_plans" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" varchar(100) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"template_id" varchar(255),
	"variant_id" varchar(255),
	"template_name" varchar(255),
	"tenor_months" integer NOT NULL,
	"agreed_margin_annual_percent" numeric(5, 2) NOT NULL,
	"gold_sold_grams" numeric(18, 6) NOT NULL,
	"enrollment_price_usd_per_gram" numeric(12, 2) NOT NULL,
	"base_price_component_usd" numeric(18, 2) NOT NULL,
	"total_margin_component_usd" numeric(18, 2) NOT NULL,
	"quarterly_margin_usd" numeric(18, 2) NOT NULL,
	"total_sale_proceeds_usd" numeric(18, 2) NOT NULL,
	"start_date" timestamp NOT NULL,
	"maturity_date" timestamp NOT NULL,
	"status" "bnsl_plan_status" DEFAULT 'Pending Activation' NOT NULL,
	"paid_margin_usd" numeric(18, 2) DEFAULT '0' NOT NULL,
	"paid_margin_grams" numeric(18, 6) DEFAULT '0' NOT NULL,
	"remaining_margin_usd" numeric(18, 2) NOT NULL,
	"plan_risk_level" "risk_level" DEFAULT 'Low' NOT NULL,
	"notes" text,
	"early_termination_fee_percent" numeric(5, 2) DEFAULT '2.00' NOT NULL,
	"admin_fee_percent" numeric(5, 2) DEFAULT '0.50' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bnsl_plans_contract_id_unique" UNIQUE("contract_id")
);
--> statement-breakpoint
CREATE TABLE "bnsl_template_variants" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" varchar(255) NOT NULL,
	"tenor_months" integer NOT NULL,
	"margin_rate_percent" numeric(5, 2) NOT NULL,
	"min_margin_rate_percent" numeric(5, 2),
	"max_margin_rate_percent" numeric(5, 2),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bnsl_wallets" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"available_gold_grams" numeric(18, 6) DEFAULT '0' NOT NULL,
	"available_value_usd" numeric(18, 2) DEFAULT '0' NOT NULL,
	"locked_gold_grams" numeric(18, 6) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bnsl_wallets_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "branding_settings" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_name" varchar(255) DEFAULT 'Finatrades' NOT NULL,
	"tagline" varchar(500),
	"logo_url" text,
	"favicon_url" text,
	"primary_color" varchar(20) DEFAULT '#f97316' NOT NULL,
	"primary_foreground" varchar(20) DEFAULT '#ffffff' NOT NULL,
	"secondary_color" varchar(20) DEFAULT '#eab308' NOT NULL,
	"secondary_foreground" varchar(20) DEFAULT '#ffffff' NOT NULL,
	"accent_color" varchar(20) DEFAULT '#f59e0b' NOT NULL,
	"button_radius" varchar(20) DEFAULT '0.5rem' NOT NULL,
	"button_primary_bg" varchar(20) DEFAULT '#f97316' NOT NULL,
	"button_primary_text" varchar(20) DEFAULT '#ffffff' NOT NULL,
	"button_secondary_bg" varchar(20) DEFAULT '#f3f4f6' NOT NULL,
	"button_secondary_text" varchar(20) DEFAULT '#1f2937' NOT NULL,
	"font_family" varchar(100) DEFAULT 'Inter' NOT NULL,
	"heading_font_family" varchar(100),
	"background_color" varchar(20) DEFAULT '#ffffff' NOT NULL,
	"card_background" varchar(20) DEFAULT '#ffffff' NOT NULL,
	"sidebar_background" varchar(20) DEFAULT '#1f2937' NOT NULL,
	"border_radius" varchar(20) DEFAULT '0.5rem' NOT NULL,
	"border_color" varchar(20) DEFAULT '#e5e7eb' NOT NULL,
	"nav_link_names" json,
	"footer_text" text,
	"social_links" json,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_by" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "buy_gold_requests" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"amount_usd" numeric(18, 2),
	"gold_grams" numeric(18, 8),
	"gold_price_at_time" numeric(18, 2),
	"wingold_reference_id" varchar(255),
	"receipt_file_url" text NOT NULL,
	"receipt_file_name" varchar(255),
	"status" "buy_gold_status" DEFAULT 'Pending' NOT NULL,
	"reviewer_id" varchar(255),
	"reviewed_at" timestamp,
	"review_notes" text,
	"rejection_reason" text,
	"credited_transaction_id" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "certificate_deliveries" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"certificate_id" varchar(255) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"transaction_id" varchar(255),
	"delivery_method" varchar(50) DEFAULT 'email' NOT NULL,
	"recipient_email" varchar(255) NOT NULL,
	"status" "delivery_status" DEFAULT 'Pending' NOT NULL,
	"pdf_data" text,
	"sent_at" timestamp,
	"failure_reason" text,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "certificates" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"certificate_number" varchar(100) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"transaction_id" varchar(255),
	"vault_holding_id" varchar(255),
	"type" "certificate_type" NOT NULL,
	"status" "certificate_status" DEFAULT 'Active' NOT NULL,
	"gold_grams" numeric(18, 6) NOT NULL,
	"gold_price_usd_per_gram" numeric(12, 2),
	"total_value_usd" numeric(18, 2),
	"issuer" varchar(255) NOT NULL,
	"vault_location" varchar(255),
	"wingold_storage_ref" varchar(100),
	"from_user_id" varchar(255),
	"to_user_id" varchar(255),
	"from_user_name" varchar(255),
	"to_user_name" varchar(255),
	"related_certificate_id" varchar(255),
	"bnsl_plan_id" varchar(255),
	"trade_case_id" varchar(255),
	"issued_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"cancelled_at" timestamp,
	"superseded_by" varchar(255),
	CONSTRAINT "certificates_certificate_number_unique" UNIQUE("certificate_number")
);
--> statement-breakpoint
CREATE TABLE "chat_agent_workflows" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar(255) NOT NULL,
	"agent_id" varchar(255) NOT NULL,
	"user_id" varchar(255),
	"workflow_type" varchar(100) NOT NULL,
	"current_step" varchar(100) NOT NULL,
	"total_steps" integer DEFAULT 1 NOT NULL,
	"completed_steps" integer DEFAULT 0 NOT NULL,
	"step_data" text,
	"status" "chat_workflow_status" DEFAULT 'active' NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_agents" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"type" "chat_agent_type" NOT NULL,
	"description" text,
	"avatar" varchar(500),
	"welcome_message" text,
	"capabilities" text,
	"status" "chat_agent_status" DEFAULT 'active' NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"config" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar(255) NOT NULL,
	"agent_id" varchar(255),
	"sender" "chat_message_sender" NOT NULL,
	"content" text NOT NULL,
	"intent" varchar(100),
	"confidence" numeric(5, 4),
	"metadata" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_sessions" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255),
	"guest_name" varchar(255),
	"guest_email" varchar(255),
	"current_agent_id" varchar(255),
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"context" text,
	"last_message_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_labels" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(255) NOT NULL,
	"value" text NOT NULL,
	"default_value" text,
	"category" varchar(100) NOT NULL,
	"description" text,
	"updated_by" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cms_labels_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "compliance_settings" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"active_kyc_mode" "kyc_mode" DEFAULT 'kycAml' NOT NULL,
	"finatrades_personal_config" json,
	"finatrades_corporate_config" json,
	"allowed_countries" json,
	"blocked_countries" json,
	"updated_by" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_blocks" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page_id" varchar(255),
	"section" varchar(255) NOT NULL,
	"key" varchar(255) NOT NULL,
	"label" varchar(255),
	"type" "content_block_type" DEFAULT 'text' NOT NULL,
	"content" text,
	"default_content" text,
	"metadata" json,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"status" "content_status" DEFAULT 'published' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_pages" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(255) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"module" varchar(100),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "content_pages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "crypto_payment_requests" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"wallet_config_id" varchar(255) NOT NULL,
	"amount_usd" numeric(18, 2) NOT NULL,
	"gold_grams" numeric(18, 8) NOT NULL,
	"gold_price_at_time" numeric(18, 2) NOT NULL,
	"crypto_amount" varchar(100),
	"transaction_hash" varchar(255),
	"proof_image_url" text,
	"status" "crypto_payment_status" DEFAULT 'Pending' NOT NULL,
	"reviewer_id" varchar(255),
	"reviewed_at" timestamp,
	"review_notes" text,
	"rejection_reason" text,
	"credited_transaction_id" varchar(255),
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crypto_wallet_configs" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"network" "crypto_network" NOT NULL,
	"network_label" varchar(100) NOT NULL,
	"wallet_address" text NOT NULL,
	"memo" varchar(255),
	"instructions" text,
	"qr_code_image" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_financial_snapshots" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"snapshot_date" timestamp NOT NULL,
	"total_users" integer DEFAULT 0 NOT NULL,
	"active_users" integer DEFAULT 0 NOT NULL,
	"new_users_today" integer DEFAULT 0 NOT NULL,
	"kyc_approved_users" integer DEFAULT 0 NOT NULL,
	"total_gold_grams" numeric(18, 6) DEFAULT '0' NOT NULL,
	"total_gold_value_usd" numeric(18, 2) DEFAULT '0' NOT NULL,
	"total_fiat_balance_usd" numeric(18, 2) DEFAULT '0' NOT NULL,
	"gold_price_usd" numeric(12, 2) NOT NULL,
	"finapay_transaction_count" integer DEFAULT 0 NOT NULL,
	"finapay_volume_usd" numeric(18, 2) DEFAULT '0' NOT NULL,
	"finapay_fees_usd" numeric(18, 2) DEFAULT '0' NOT NULL,
	"vault_total_gold_grams" numeric(18, 6) DEFAULT '0' NOT NULL,
	"vault_storage_fees_usd" numeric(18, 2) DEFAULT '0' NOT NULL,
	"vault_active_holdings" integer DEFAULT 0 NOT NULL,
	"bnsl_active_plans" integer DEFAULT 0 NOT NULL,
	"bnsl_total_principal_usd" numeric(18, 2) DEFAULT '0' NOT NULL,
	"bnsl_expected_payouts_usd" numeric(18, 2) DEFAULT '0' NOT NULL,
	"bnsl_interest_earned_usd" numeric(18, 2) DEFAULT '0' NOT NULL,
	"total_revenue_usd" numeric(18, 2) DEFAULT '0' NOT NULL,
	"total_gold_liability_grams" numeric(18, 6) DEFAULT '0' NOT NULL,
	"total_fiat_liability_usd" numeric(18, 2) DEFAULT '0' NOT NULL,
	"pending_withdrawals_usd" numeric(18, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "daily_financial_snapshots_snapshot_date_unique" UNIQUE("snapshot_date")
);
--> statement-breakpoint
CREATE TABLE "database_backups" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"backup_type" "backup_type" DEFAULT 'manual' NOT NULL,
	"file_name" varchar(500) NOT NULL,
	"file_path" text NOT NULL,
	"file_size_bytes" integer,
	"status" "backup_status" DEFAULT 'In Progress' NOT NULL,
	"error_message" text,
	"checksum" varchar(64),
	"is_encrypted" boolean DEFAULT true NOT NULL,
	"is_compressed" boolean DEFAULT true NOT NULL,
	"tables_included" integer,
	"total_rows" integer,
	"created_by" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "deal_room_agreement_acceptances" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_room_id" varchar(255) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"role" "deal_room_participant_role" NOT NULL,
	"agreement_version" varchar(50) DEFAULT '1.0' NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"accepted_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deal_room_documents" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_room_id" varchar(255) NOT NULL,
	"trade_request_id" varchar(255) NOT NULL,
	"uploaded_by_user_id" varchar(255) NOT NULL,
	"uploader_role" varchar(20) NOT NULL,
	"document_type" "deal_room_document_type" NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_url" text NOT NULL,
	"file_size" integer,
	"description" text,
	"status" "deal_room_document_status" DEFAULT 'Pending' NOT NULL,
	"verified_by" varchar(255),
	"verified_at" timestamp,
	"verification_notes" text,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deal_room_messages" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_room_id" varchar(255) NOT NULL,
	"sender_user_id" varchar(255) NOT NULL,
	"sender_role" "deal_room_participant_role" NOT NULL,
	"content" text,
	"attachment_url" text,
	"attachment_name" varchar(255),
	"attachment_type" varchar(100),
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deal_rooms" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trade_request_id" varchar(255) NOT NULL,
	"accepted_proposal_id" varchar(255) NOT NULL,
	"importer_user_id" varchar(255) NOT NULL,
	"exporter_user_id" varchar(255) NOT NULL,
	"assigned_admin_id" varchar(255),
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"is_closed" boolean DEFAULT false NOT NULL,
	"closed_at" timestamp,
	"closed_by" varchar(255),
	"closure_notes" text,
	"admin_disclaimer" text,
	"admin_disclaimer_updated_at" timestamp,
	"admin_disclaimer_updated_by" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deposit_requests" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference_number" varchar(100) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"bank_account_id" varchar(255),
	"target_bank_name" varchar(255),
	"target_account_name" varchar(255),
	"target_account_number" varchar(255),
	"target_swift_code" varchar(100),
	"target_iban" varchar(100),
	"target_currency" varchar(10),
	"amount_usd" numeric(18, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'USD' NOT NULL,
	"payment_method" varchar(100) DEFAULT 'Bank Transfer' NOT NULL,
	"sender_bank_name" varchar(255),
	"sender_account_name" varchar(255),
	"transaction_reference" varchar(255),
	"proof_of_payment" text,
	"notes" text,
	"status" "deposit_request_status" DEFAULT 'Pending' NOT NULL,
	"processed_by" varchar(255),
	"processed_at" timestamp,
	"rejection_reason" text,
	"admin_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "deposit_requests_reference_number_unique" UNIQUE("reference_number")
);
--> statement-breakpoint
CREATE TABLE "email_logs" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255),
	"recipient_email" varchar(255) NOT NULL,
	"recipient_name" varchar(255),
	"notification_type" varchar(100) NOT NULL,
	"template_slug" varchar(255),
	"subject" varchar(500) NOT NULL,
	"status" "email_log_status" DEFAULT 'Queued' NOT NULL,
	"message_id" varchar(255),
	"error_message" text,
	"metadata" json,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_notification_settings" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notification_type" varchar(100) NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(100) NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"template_slug" varchar(255),
	"display_order" integer DEFAULT 0 NOT NULL,
	"updated_by" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "email_notification_settings_notification_type_unique" UNIQUE("notification_type")
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255),
	"employee_id" varchar(20) NOT NULL,
	"role" "employee_role" DEFAULT 'support' NOT NULL,
	"department" varchar(100),
	"job_title" varchar(255),
	"status" "employee_status" DEFAULT 'active' NOT NULL,
	"permissions" json,
	"hired_at" timestamp DEFAULT now() NOT NULL,
	"last_active_at" timestamp,
	"created_by" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "employees_employee_id_unique" UNIQUE("employee_id")
);
--> statement-breakpoint
CREATE TABLE "exporter_ratings" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exporter_user_id" varchar(255) NOT NULL,
	"importer_user_id" varchar(255) NOT NULL,
	"trade_request_id" varchar(255) NOT NULL,
	"overall_rating" integer NOT NULL,
	"quality_rating" integer,
	"communication_rating" integer,
	"delivery_rating" integer,
	"review" text,
	"is_verified" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exporter_trust_scores" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exporter_user_id" varchar(255) NOT NULL,
	"total_trades" integer DEFAULT 0 NOT NULL,
	"completed_trades" integer DEFAULT 0 NOT NULL,
	"disputed_trades" integer DEFAULT 0 NOT NULL,
	"cancelled_trades" integer DEFAULT 0 NOT NULL,
	"average_rating" numeric(3, 2) DEFAULT '0',
	"total_ratings" integer DEFAULT 0 NOT NULL,
	"total_trade_value_usd" numeric(18, 2) DEFAULT '0',
	"average_delivery_days" integer,
	"trust_score" integer DEFAULT 0 NOT NULL,
	"verification_level" varchar(50) DEFAULT 'Unverified',
	"verified_at" timestamp,
	"last_trade_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "exporter_trust_scores_exporter_user_id_unique" UNIQUE("exporter_user_id")
);
--> statement-breakpoint
CREATE TABLE "fee_transactions" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255),
	"source" "fee_source" NOT NULL,
	"fee_type" "fee_type_detail" NOT NULL,
	"amount_usd" numeric(18, 2) NOT NULL,
	"gold_grams" numeric(18, 6),
	"related_transaction_id" varchar(255),
	"related_entity_type" varchar(50),
	"related_entity_id" varchar(255),
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finabridge_agreements" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"template_version" varchar(50) DEFAULT 'V1-2025-12-23' NOT NULL,
	"signature_name" varchar(255) NOT NULL,
	"signed_at" timestamp NOT NULL,
	"role" varchar(50) NOT NULL,
	"terms_and_conditions" text,
	"acceptance_details" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finabridge_wallets" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"available_gold_grams" numeric(18, 6) DEFAULT '0' NOT NULL,
	"locked_gold_grams" numeric(18, 6) DEFAULT '0' NOT NULL,
	"incoming_locked_gold_grams" numeric(18, 6) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "finabridge_wallets_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "finatrades_corporate_kyc" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"company_name" varchar(255),
	"registration_number" varchar(100),
	"incorporation_date" varchar(50),
	"country_of_incorporation" varchar(100),
	"company_type" varchar(50),
	"nature_of_business" text,
	"number_of_employees" varchar(50),
	"head_office_address" text,
	"telephone_number" varchar(50),
	"website" varchar(255),
	"email_address" varchar(255),
	"trading_contact_name" varchar(255),
	"trading_contact_email" varchar(255),
	"trading_contact_phone" varchar(50),
	"finance_contact_name" varchar(255),
	"finance_contact_email" varchar(255),
	"finance_contact_phone" varchar(50),
	"beneficial_owners" json,
	"shareholder_company_ubos" text,
	"has_pep_owners" boolean DEFAULT false,
	"pep_details" text,
	"documents" json,
	"trade_license_expiry_date" varchar(20),
	"director_passport_expiry_date" varchar(20),
	"expiry_reminder_sent_30_days" boolean DEFAULT false,
	"expiry_reminder_sent_14_days" boolean DEFAULT false,
	"expiry_reminder_sent_7_days" boolean DEFAULT false,
	"expiry_reminder_sent_expired" boolean DEFAULT false,
	"bank_name" varchar(255),
	"bank_branch_address" text,
	"bank_city" varchar(100),
	"bank_country" varchar(100),
	"liveness_verified" boolean DEFAULT false,
	"liveness_capture" text,
	"liveness_verified_at" timestamp,
	"status" "kyc_status" DEFAULT 'In Progress' NOT NULL,
	"reviewed_by" varchar(255),
	"reviewed_at" timestamp,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finatrades_personal_kyc" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"full_name" varchar(255),
	"email" varchar(255),
	"phone" varchar(50),
	"country" varchar(100),
	"city" varchar(100),
	"address" text,
	"postal_code" varchar(20),
	"nationality" varchar(100),
	"occupation" varchar(100),
	"source_of_funds" varchar(100),
	"account_type" varchar(50),
	"date_of_birth" varchar(20),
	"id_front_url" text,
	"id_back_url" text,
	"passport_url" text,
	"address_proof_url" text,
	"passport_expiry_date" varchar(20),
	"expiry_reminder_sent_30_days" boolean DEFAULT false,
	"expiry_reminder_sent_14_days" boolean DEFAULT false,
	"expiry_reminder_sent_7_days" boolean DEFAULT false,
	"expiry_reminder_sent_expired" boolean DEFAULT false,
	"liveness_verified" boolean DEFAULT false,
	"liveness_capture" text,
	"liveness_verified_at" timestamp,
	"status" "kyc_status" DEFAULT 'In Progress' NOT NULL,
	"reviewed_by" varchar(255),
	"reviewed_at" timestamp,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "forwarded_proposals" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trade_request_id" varchar(255) NOT NULL,
	"proposal_id" varchar(255) NOT NULL,
	"forwarded_by_admin_id" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "geo_restriction_settings" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"is_enabled" boolean DEFAULT false NOT NULL,
	"default_message" text DEFAULT 'Our services are not available in your region. Please contact support for more information.' NOT NULL,
	"show_notice_on_landing" boolean DEFAULT true NOT NULL,
	"block_access" boolean DEFAULT false NOT NULL,
	"updated_by" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "geo_restrictions" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"country_code" varchar(2) NOT NULL,
	"country_name" varchar(100) NOT NULL,
	"is_restricted" boolean DEFAULT true NOT NULL,
	"restriction_message" text,
	"allow_registration" boolean DEFAULT false NOT NULL,
	"allow_login" boolean DEFAULT false NOT NULL,
	"allow_transactions" boolean DEFAULT false NOT NULL,
	"reason" text,
	"updated_by" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "geo_restrictions_country_code_unique" UNIQUE("country_code")
);
--> statement-breakpoint
CREATE TABLE "gold_bars" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"serial_number" varchar(100) NOT NULL,
	"weight_grams" numeric(18, 6) NOT NULL,
	"purity" varchar(10) DEFAULT '999.9' NOT NULL,
	"refiner" varchar(100) NOT NULL,
	"vault_location" varchar(100) NOT NULL,
	"zone" varchar(50),
	"status" varchar(50) DEFAULT 'Available' NOT NULL,
	"allocated_to_user_id" varchar(255),
	"allocated_at" timestamp,
	"purchase_price_per_gram" numeric(18, 6),
	"purchase_date" date,
	"assay_certificate_url" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "gold_bars_serial_number_unique" UNIQUE("serial_number")
);
--> statement-breakpoint
CREATE TABLE "gold_gifts" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference_number" varchar(50) NOT NULL,
	"sender_user_id" varchar(255) NOT NULL,
	"recipient_user_id" varchar(255),
	"recipient_email" varchar(255),
	"recipient_phone" varchar(50),
	"gold_grams" numeric(18, 6) NOT NULL,
	"gold_price_usd_per_gram" numeric(18, 6) NOT NULL,
	"message" text,
	"occasion" varchar(100),
	"gift_certificate_url" text,
	"status" varchar(50) DEFAULT 'Pending' NOT NULL,
	"claimed_at" timestamp,
	"expires_at" timestamp,
	"sender_transaction_id" varchar(255),
	"recipient_transaction_id" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "gold_gifts_reference_number_unique" UNIQUE("reference_number")
);
--> statement-breakpoint
CREATE TABLE "gold_requests" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference_number" varchar(100) NOT NULL,
	"requester_id" varchar(255) NOT NULL,
	"payer_id" varchar(255),
	"payer_email" varchar(255),
	"gold_grams" numeric(18, 6) NOT NULL,
	"amount_usd" numeric(18, 2),
	"gold_price_at_request" numeric(12, 2),
	"reason" text,
	"memo" text,
	"status" "gold_request_status" DEFAULT 'Pending' NOT NULL,
	"expires_at" timestamp,
	"fulfilled_at" timestamp,
	"fulfilled_transaction_id" varchar(255),
	"cancelled_at" timestamp,
	"cancel_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "gold_requests_reference_number_unique" UNIQUE("reference_number")
);
--> statement-breakpoint
CREATE TABLE "insurance_certificates" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"certificate_number" varchar(50) NOT NULL,
	"vault_location" varchar(100) NOT NULL,
	"gold_grams" numeric(18, 6) NOT NULL,
	"coverage_amount_usd" numeric(18, 2) NOT NULL,
	"premium_usd" numeric(18, 2),
	"insurer_name" varchar(100) NOT NULL,
	"policy_number" varchar(100),
	"coverage_start" date NOT NULL,
	"coverage_end" date NOT NULL,
	"certificate_url" text,
	"status" varchar(50) DEFAULT 'Active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "insurance_certificates_certificate_number_unique" UNIQUE("certificate_number")
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_number" varchar(100) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"transaction_id" varchar(255),
	"issuer" varchar(255) DEFAULT 'Wingold and Metals DMCC' NOT NULL,
	"issuer_address" text,
	"issuer_tax_id" varchar(100),
	"customer_name" varchar(255) NOT NULL,
	"customer_email" varchar(255) NOT NULL,
	"customer_address" text,
	"gold_grams" numeric(18, 6) NOT NULL,
	"gold_price_usd_per_gram" numeric(12, 2) NOT NULL,
	"subtotal_usd" numeric(18, 2) NOT NULL,
	"fees_usd" numeric(18, 2) DEFAULT '0' NOT NULL,
	"total_usd" numeric(18, 2) NOT NULL,
	"payment_method" varchar(100),
	"payment_reference" varchar(255),
	"status" "invoice_status" DEFAULT 'Generated' NOT NULL,
	"pdf_data" text,
	"issued_at" timestamp DEFAULT now() NOT NULL,
	"emailed_at" timestamp,
	CONSTRAINT "invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "knowledge_articles" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" varchar(255),
	"title" varchar(255) NOT NULL,
	"summary" text,
	"content" text NOT NULL,
	"keywords" text,
	"status" "knowledge_status" DEFAULT 'draft' NOT NULL,
	"agent_types" text,
	"view_count" integer DEFAULT 0 NOT NULL,
	"helpful_count" integer DEFAULT 0 NOT NULL,
	"created_by" varchar(255),
	"updated_by" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_categories" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"icon" varchar(50),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kyc_submissions" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"account_type" "account_type" NOT NULL,
	"tier" "kyc_tier" DEFAULT 'tier_1_basic' NOT NULL,
	"full_name" varchar(255),
	"date_of_birth" varchar(50),
	"nationality" varchar(100),
	"address" text,
	"city" varchar(100),
	"postal_code" varchar(20),
	"country" varchar(100),
	"company_name" varchar(255),
	"registration_number" varchar(100),
	"company_address" text,
	"tax_id" varchar(100),
	"documents" json,
	"id_expiry_date" timestamp,
	"address_proof_issued_date" timestamp,
	"screening_status" "screening_status" DEFAULT 'Pending',
	"risk_score" integer DEFAULT 0,
	"risk_level" "risk_level" DEFAULT 'Low',
	"is_pep" boolean DEFAULT false,
	"is_sanctioned" boolean DEFAULT false,
	"screening_results" json,
	"status" "kyc_status" DEFAULT 'In Progress' NOT NULL,
	"reviewed_by" varchar(255),
	"reviewed_at" timestamp,
	"rejection_reason" text,
	"review_notes" text,
	"sla_deadline" timestamp,
	"escalated_at" timestamp,
	"escalated_to" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"url" text NOT NULL,
	"alt_text" varchar(500),
	"mime_type" varchar(100),
	"file_size" integer,
	"tags" json,
	"uploaded_by" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ngenius_transactions" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"order_reference" varchar(100) NOT NULL,
	"ngenius_order_id" varchar(100),
	"ngenius_payment_id" varchar(100),
	"status" "ngenius_order_status" DEFAULT 'Created' NOT NULL,
	"amount_usd" numeric(18, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'USD' NOT NULL,
	"card_brand" varchar(50),
	"card_last4" varchar(4),
	"cardholder_name" varchar(255),
	"payment_url" text,
	"wallet_transaction_id" varchar(255),
	"webhook_received_at" timestamp,
	"webhook_payload" json,
	"description" text,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ngenius_transactions_order_reference_unique" UNIQUE("order_reference")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"type" "notification_type" DEFAULT 'info' NOT NULL,
	"link" varchar(500),
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "otp_verifications" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"action" varchar(100) NOT NULL,
	"code" varchar(10) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"verified_at" timestamp,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partial_settlements" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"settlement_hold_id" varchar(255) NOT NULL,
	"trade_request_id" varchar(255) NOT NULL,
	"released_gold_grams" numeric(18, 6) NOT NULL,
	"release_percentage" numeric(5, 2) NOT NULL,
	"reason" text,
	"milestone" varchar(255),
	"released_by" varchar(255) NOT NULL,
	"transaction_id" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "payment_gateway_settings" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stripe_enabled" boolean DEFAULT false NOT NULL,
	"stripe_publishable_key" text,
	"stripe_secret_key" text,
	"stripe_webhook_secret" text,
	"stripe_fee_percent" numeric(5, 2) DEFAULT '2.9',
	"stripe_fixed_fee" numeric(10, 2) DEFAULT '0.30',
	"paypal_enabled" boolean DEFAULT false NOT NULL,
	"paypal_client_id" text,
	"paypal_client_secret" text,
	"paypal_mode" varchar(20) DEFAULT 'sandbox',
	"paypal_fee_percent" numeric(5, 2) DEFAULT '2.9',
	"paypal_fixed_fee" numeric(10, 2) DEFAULT '0.30',
	"bank_transfer_enabled" boolean DEFAULT false NOT NULL,
	"bank_accounts" json DEFAULT '[]'::json,
	"bank_instructions" text,
	"binance_pay_enabled" boolean DEFAULT false NOT NULL,
	"ngenius_enabled" boolean DEFAULT false NOT NULL,
	"ngenius_api_key" text,
	"ngenius_outlet_ref" varchar(100),
	"ngenius_realm_name" varchar(100),
	"ngenius_mode" varchar(20) DEFAULT 'sandbox',
	"ngenius_fee_percent" numeric(5, 2) DEFAULT '2.5',
	"ngenius_fixed_fee" numeric(10, 2) DEFAULT '0.30',
	"metals_api_enabled" boolean DEFAULT false NOT NULL,
	"metals_api_key" text,
	"metals_api_provider" varchar(50) DEFAULT 'metals-api',
	"metals_api_cache_duration" integer DEFAULT 5,
	"gold_price_markup_percent" numeric(5, 2) DEFAULT '0',
	"min_deposit_usd" numeric(10, 2) DEFAULT '10',
	"max_deposit_usd" numeric(10, 2) DEFAULT '100000',
	"updated_by" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "peer_requests" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference_number" varchar(100) NOT NULL,
	"requester_id" varchar(255) NOT NULL,
	"target_id" varchar(255),
	"target_identifier" varchar(255),
	"channel" "peer_transfer_channel" NOT NULL,
	"amount_usd" numeric(18, 2) NOT NULL,
	"amount_gold" numeric(18, 6),
	"asset_type" varchar(20) DEFAULT 'GOLD' NOT NULL,
	"memo" text,
	"qr_payload" varchar(500),
	"status" "peer_request_status" DEFAULT 'Pending' NOT NULL,
	"fulfilled_transfer_id" varchar(255),
	"decline_reason" text,
	"expires_at" timestamp,
	"responded_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "peer_requests_reference_number_unique" UNIQUE("reference_number")
);
--> statement-breakpoint
CREATE TABLE "peer_transfers" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference_number" varchar(100) NOT NULL,
	"sender_id" varchar(255) NOT NULL,
	"recipient_id" varchar(255),
	"amount_usd" numeric(18, 2) NOT NULL,
	"amount_gold" numeric(18, 6),
	"gold_price_usd_per_gram" numeric(12, 2),
	"channel" "peer_transfer_channel" NOT NULL,
	"recipient_identifier" varchar(255) NOT NULL,
	"memo" text,
	"status" "peer_transfer_status" DEFAULT 'Completed' NOT NULL,
	"requires_approval" boolean DEFAULT false NOT NULL,
	"sender_transaction_id" varchar(255),
	"recipient_transaction_id" varchar(255),
	"expires_at" timestamp,
	"responded_at" timestamp,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "peer_transfers_reference_number_unique" UNIQUE("reference_number")
);
--> statement-breakpoint
CREATE TABLE "physical_delivery_requests" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference_number" varchar(50) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"gold_grams" numeric(18, 6) NOT NULL,
	"gold_price_usd_per_gram" numeric(18, 6) NOT NULL,
	"delivery_address" text NOT NULL,
	"city" varchar(100) NOT NULL,
	"country" varchar(100) NOT NULL,
	"postal_code" varchar(20),
	"phone" varchar(50) NOT NULL,
	"special_instructions" text,
	"delivery_method" varchar(50) DEFAULT 'Insured Courier',
	"estimated_delivery_days" integer,
	"shipping_fee_usd" numeric(18, 2) DEFAULT '0',
	"insurance_fee_usd" numeric(18, 2) DEFAULT '0',
	"status" varchar(50) DEFAULT 'Pending' NOT NULL,
	"tracking_number" varchar(100),
	"courier_name" varchar(100),
	"shipped_at" timestamp,
	"delivered_at" timestamp,
	"admin_notes" text,
	"processed_by" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "physical_delivery_requests_reference_number_unique" UNIQUE("reference_number")
);
--> statement-breakpoint
CREATE TABLE "pin_verification_tokens" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"token" varchar(255) NOT NULL,
	"action" varchar(100) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pin_verification_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "platform_bank_accounts" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bank_name" varchar(255) NOT NULL,
	"account_name" varchar(255) NOT NULL,
	"account_number" varchar(100) NOT NULL,
	"iban" varchar(100),
	"swift_code" varchar(50),
	"routing_number" varchar(50),
	"currency" varchar(10) DEFAULT 'USD' NOT NULL,
	"country" varchar(100) NOT NULL,
	"address" text,
	"status" "bank_account_status" DEFAULT 'Active' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_by" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_config" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" "platform_config_category" NOT NULL,
	"config_key" varchar(100) NOT NULL,
	"config_value" text NOT NULL,
	"config_type" varchar(50) DEFAULT 'string' NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"description" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_by" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "platform_config_config_key_unique" UNIQUE("config_key")
);
--> statement-breakpoint
CREATE TABLE "platform_expenses" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" varchar(100) NOT NULL,
	"description" text NOT NULL,
	"amount_usd" numeric(18, 2) NOT NULL,
	"expense_date" timestamp NOT NULL,
	"recorded_by" varchar(255),
	"attachment_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_fees" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module" "fee_module" NOT NULL,
	"fee_key" varchar(100) NOT NULL,
	"fee_name" varchar(255) NOT NULL,
	"description" text,
	"fee_type" varchar(50) DEFAULT 'percentage' NOT NULL,
	"fee_value" numeric(10, 4) NOT NULL,
	"min_amount" numeric(18, 2),
	"max_amount" numeric(18, 2),
	"is_active" boolean DEFAULT true NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"updated_by" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_device_tokens" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"token" text NOT NULL,
	"platform" "device_platform" NOT NULL,
	"device_name" varchar(255),
	"device_id" varchar(255),
	"is_active" boolean DEFAULT true NOT NULL,
	"last_used_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qr_payment_invoices" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_code" varchar(100) NOT NULL,
	"merchant_id" varchar(255) NOT NULL,
	"gold_grams" numeric(18, 6),
	"amount_usd" numeric(18, 2),
	"gold_price_at_creation" numeric(12, 2),
	"description" text,
	"status" "qr_payment_status" DEFAULT 'Active' NOT NULL,
	"payer_id" varchar(255),
	"paid_at" timestamp,
	"paid_transaction_id" varchar(255),
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "qr_payment_invoices_invoice_code_unique" UNIQUE("invoice_code")
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referrer_id" varchar(255) NOT NULL,
	"referred_id" varchar(255),
	"referral_code" varchar(50) NOT NULL,
	"referred_email" varchar(255),
	"status" "referral_status" DEFAULT 'Pending' NOT NULL,
	"reward_amount" numeric(18, 2) DEFAULT '0',
	"reward_currency" varchar(10) DEFAULT 'USD',
	"reward_paid_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	CONSTRAINT "referrals_referral_code_unique" UNIQUE("referral_code")
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role" "employee_role" NOT NULL,
	"permissions" json NOT NULL,
	"updated_by" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "role_permissions_role_unique" UNIQUE("role")
);
--> statement-breakpoint
CREATE TABLE "security_settings" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email_otp_enabled" boolean DEFAULT false NOT NULL,
	"passkey_enabled" boolean DEFAULT false NOT NULL,
	"otp_on_login" boolean DEFAULT false NOT NULL,
	"otp_on_withdrawal" boolean DEFAULT true NOT NULL,
	"otp_on_transfer" boolean DEFAULT true NOT NULL,
	"otp_on_buy_gold" boolean DEFAULT false NOT NULL,
	"otp_on_sell_gold" boolean DEFAULT true NOT NULL,
	"otp_on_profile_change" boolean DEFAULT false NOT NULL,
	"otp_on_password_change" boolean DEFAULT true NOT NULL,
	"otp_on_bnsl_create" boolean DEFAULT false NOT NULL,
	"otp_on_bnsl_early_termination" boolean DEFAULT true NOT NULL,
	"otp_on_vault_withdrawal" boolean DEFAULT true NOT NULL,
	"otp_on_trade_bridge" boolean DEFAULT true NOT NULL,
	"otp_on_peer_request" boolean DEFAULT true NOT NULL,
	"otp_on_account_deletion" boolean DEFAULT true NOT NULL,
	"admin_otp_enabled" boolean DEFAULT true NOT NULL,
	"admin_otp_on_kyc_approval" boolean DEFAULT true NOT NULL,
	"admin_otp_on_deposit_approval" boolean DEFAULT true NOT NULL,
	"admin_otp_on_withdrawal_approval" boolean DEFAULT true NOT NULL,
	"admin_otp_on_bnsl_approval" boolean DEFAULT true NOT NULL,
	"admin_otp_on_trade_case_approval" boolean DEFAULT true NOT NULL,
	"admin_otp_on_user_suspension" boolean DEFAULT true NOT NULL,
	"admin_otp_on_vault_deposit_approval" boolean DEFAULT true NOT NULL,
	"admin_otp_on_vault_withdrawal_approval" boolean DEFAULT true NOT NULL,
	"admin_otp_on_transaction_approval" boolean DEFAULT true NOT NULL,
	"passkey_on_login" boolean DEFAULT true NOT NULL,
	"passkey_on_withdrawal" boolean DEFAULT false NOT NULL,
	"passkey_on_transfer" boolean DEFAULT false NOT NULL,
	"passkey_on_high_value_transaction" boolean DEFAULT false NOT NULL,
	"passkey_high_value_threshold_usd" numeric(10, 2) DEFAULT '1000',
	"otp_expiry_minutes" integer DEFAULT 10 NOT NULL,
	"otp_max_attempts" integer DEFAULT 3 NOT NULL,
	"otp_cooldown_minutes" integer DEFAULT 1 NOT NULL,
	"updated_by" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settlement_holds" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trade_request_id" varchar(255) NOT NULL,
	"importer_user_id" varchar(255) NOT NULL,
	"exporter_user_id" varchar(255) NOT NULL,
	"locked_gold_grams" numeric(18, 6) NOT NULL,
	"status" "settlement_hold_status" DEFAULT 'Held' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipment_milestones" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shipment_id" varchar(255) NOT NULL,
	"milestone" varchar(100) NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"location" varchar(255),
	"description" text,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "storage_fees" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"billing_period_start" date NOT NULL,
	"billing_period_end" date NOT NULL,
	"average_gold_grams" numeric(18, 6) NOT NULL,
	"fee_rate_percent" numeric(5, 4) NOT NULL,
	"fee_amount_usd" numeric(18, 2) NOT NULL,
	"fee_amount_gold_grams" numeric(18, 6),
	"status" varchar(50) DEFAULT 'Pending' NOT NULL,
	"paid_at" timestamp,
	"payment_method" varchar(50),
	"transaction_id" varchar(255),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_logs" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"level" "system_log_level" DEFAULT 'info' NOT NULL,
	"source" varchar(100) NOT NULL,
	"request_id" varchar(255),
	"route" varchar(255),
	"action" varchar(255),
	"message" text NOT NULL,
	"details" text,
	"error_stack" text,
	"duration_ms" integer,
	"user_id" varchar(255),
	"ip_address" varchar(100),
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" "template_type" NOT NULL,
	"module" varchar(100),
	"subject" varchar(500),
	"body" text NOT NULL,
	"variables" json,
	"preview_data" json,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "templates_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "trade_cases" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_number" varchar(100) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"company_name" varchar(255) NOT NULL,
	"trade_type" varchar(100) NOT NULL,
	"commodity_type" varchar(255) NOT NULL,
	"trade_value_usd" numeric(18, 2) NOT NULL,
	"buyer_name" varchar(255),
	"buyer_country" varchar(100),
	"seller_name" varchar(255),
	"seller_country" varchar(100),
	"payment_terms" text,
	"shipment_details" text,
	"status" "trade_case_status" DEFAULT 'Draft' NOT NULL,
	"risk_level" "risk_level" DEFAULT 'Low' NOT NULL,
	"ops_approval" boolean DEFAULT false,
	"ops_approved_by" varchar(255),
	"ops_approved_at" timestamp,
	"compliance_approval" boolean DEFAULT false,
	"compliance_approved_by" varchar(255),
	"compliance_approved_at" timestamp,
	"risk_approval" boolean DEFAULT false,
	"risk_approved_by" varchar(255),
	"risk_approved_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "trade_cases_case_number_unique" UNIQUE("case_number")
);
--> statement-breakpoint
CREATE TABLE "trade_certificates" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trade_request_id" varchar(255) NOT NULL,
	"certificate_number" varchar(50) NOT NULL,
	"type" "trade_certificate_type" NOT NULL,
	"importer_user_id" varchar(255) NOT NULL,
	"exporter_user_id" varchar(255),
	"trade_value_usd" numeric(18, 2) NOT NULL,
	"settlement_gold_grams" numeric(18, 6) NOT NULL,
	"goods_description" text,
	"incoterms" varchar(50),
	"issued_at" timestamp DEFAULT now() NOT NULL,
	"valid_until" timestamp,
	"certificate_url" text,
	"signed_by" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "trade_certificates_certificate_number_unique" UNIQUE("certificate_number")
);
--> statement-breakpoint
CREATE TABLE "trade_confirmations" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trade_request_id" varchar(255) NOT NULL,
	"accepted_proposal_id" varchar(255) NOT NULL,
	"confirmed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trade_dispute_comments" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dispute_id" varchar(255) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"user_role" varchar(20) NOT NULL,
	"content" text NOT NULL,
	"attachment_url" text,
	"is_internal" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trade_disputes" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dispute_ref_id" varchar(50) NOT NULL,
	"trade_request_id" varchar(255) NOT NULL,
	"deal_room_id" varchar(255),
	"raised_by_user_id" varchar(255) NOT NULL,
	"raised_by_role" varchar(20) NOT NULL,
	"dispute_type" varchar(100) NOT NULL,
	"subject" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"evidence_urls" text[],
	"requested_resolution" text,
	"status" "trade_dispute_status" DEFAULT 'Open' NOT NULL,
	"priority" varchar(20) DEFAULT 'Medium',
	"assigned_admin_id" varchar(255),
	"resolution" text,
	"resolved_by" varchar(255),
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "trade_disputes_dispute_ref_id_unique" UNIQUE("dispute_ref_id")
);
--> statement-breakpoint
CREATE TABLE "trade_documents" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" varchar(255) NOT NULL,
	"document_type" varchar(100) NOT NULL,
	"document_url" text NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"status" "document_status" DEFAULT 'Pending' NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	"reviewed_by" varchar(255),
	"reviewed_at" timestamp,
	"review_notes" text
);
--> statement-breakpoint
CREATE TABLE "trade_proposals" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trade_request_id" varchar(255) NOT NULL,
	"exporter_user_id" varchar(255) NOT NULL,
	"quote_price" numeric(18, 2) NOT NULL,
	"timeline_days" integer NOT NULL,
	"notes" text,
	"attachment_url" text,
	"port_of_loading" varchar(255),
	"shipping_method" varchar(50),
	"incoterms" varchar(50),
	"payment_terms" text,
	"estimated_delivery_date" varchar(50),
	"insurance_included" boolean DEFAULT false,
	"certifications_available" text,
	"company_name" varchar(255),
	"company_registration" varchar(100),
	"contact_person" varchar(255),
	"contact_email" varchar(255),
	"contact_phone" varchar(50),
	"modification_request" text,
	"requested_documents" text[],
	"custom_document_notes" text,
	"fields_to_update" text[],
	"uploaded_revision_documents" text,
	"status" "proposal_status" DEFAULT 'Submitted' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trade_requests" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trade_ref_id" varchar(50) NOT NULL,
	"importer_user_id" varchar(255) NOT NULL,
	"goods_name" varchar(255) NOT NULL,
	"description" text,
	"quantity" varchar(100),
	"incoterms" varchar(50),
	"destination" varchar(255),
	"expected_ship_date" varchar(50),
	"trade_value_usd" numeric(18, 2) NOT NULL,
	"settlement_gold_grams" numeric(18, 6) NOT NULL,
	"gold_price_usd_per_gram" numeric(18, 6),
	"is_price_locked" boolean DEFAULT false,
	"currency" varchar(10) DEFAULT 'USD',
	"exporter_known" boolean DEFAULT false,
	"exporter_finatrades_id" varchar(20),
	"suggest_exporter" boolean DEFAULT false,
	"status" "trade_request_status" DEFAULT 'Draft' NOT NULL,
	"proposal_deadline" timestamp,
	"settlement_deadline" timestamp,
	"delivery_deadline" timestamp,
	"reminder_sent_at" timestamp,
	"is_overdue" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "trade_requests_trade_ref_id_unique" UNIQUE("trade_ref_id")
);
--> statement-breakpoint
CREATE TABLE "trade_risk_assessments" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trade_request_id" varchar(255) NOT NULL,
	"risk_score" integer NOT NULL,
	"risk_level" "trade_risk_level" NOT NULL,
	"importer_kyc_status" varchar(50),
	"exporter_kyc_status" varchar(50),
	"country_risk" varchar(50),
	"value_risk" varchar(50),
	"exporter_history_risk" varchar(50),
	"risk_factors" json,
	"mitigation_notes" text,
	"assessed_by" varchar(255),
	"assessed_at" timestamp DEFAULT now() NOT NULL,
	"is_flagged" boolean DEFAULT false,
	"flag_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trade_shipments" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trade_request_id" varchar(255) NOT NULL,
	"deal_room_id" varchar(255),
	"tracking_number" varchar(100),
	"courier_name" varchar(100),
	"status" "trade_shipment_status" DEFAULT 'Pending' NOT NULL,
	"estimated_ship_date" timestamp,
	"actual_ship_date" timestamp,
	"estimated_arrival_date" timestamp,
	"actual_arrival_date" timestamp,
	"origin_port" varchar(255),
	"destination_port" varchar(255),
	"current_location" varchar(255),
	"customs_status" varchar(100),
	"customs_clearance_date" timestamp,
	"customs_documents" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transaction_pins" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"hashed_pin" text NOT NULL,
	"failed_attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp,
	"last_used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "transaction_pins_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"type" "transaction_type" NOT NULL,
	"status" "transaction_status" DEFAULT 'Pending' NOT NULL,
	"amount_gold" numeric(18, 6),
	"amount_usd" numeric(18, 2),
	"amount_eur" numeric(18, 2),
	"gold_price_usd_per_gram" numeric(12, 2),
	"recipient_email" varchar(255),
	"sender_email" varchar(255),
	"recipient_user_id" varchar(255),
	"description" text,
	"reference_id" varchar(255),
	"source_module" varchar(50) DEFAULT 'finapay',
	"approved_by" varchar(255),
	"approved_at" timestamp,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "user_account_status" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"is_frozen" boolean DEFAULT false NOT NULL,
	"frozen_at" timestamp,
	"frozen_by" varchar(255),
	"frozen_reason" text,
	"daily_transfer_limit_usd" numeric(18, 2) DEFAULT '10000',
	"monthly_transfer_limit_usd" numeric(18, 2) DEFAULT '100000',
	"daily_transfer_used_usd" numeric(18, 2) DEFAULT '0',
	"monthly_transfer_used_usd" numeric(18, 2) DEFAULT '0',
	"last_daily_reset" timestamp DEFAULT now(),
	"last_monthly_reset" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_account_status_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_passkeys" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"credential_id" text NOT NULL,
	"public_key" text NOT NULL,
	"counter" integer DEFAULT 0 NOT NULL,
	"device_name" varchar(255),
	"last_used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_passkeys_credential_id_unique" UNIQUE("credential_id")
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"email_notifications" boolean DEFAULT true NOT NULL,
	"push_notifications" boolean DEFAULT true NOT NULL,
	"transaction_alerts" boolean DEFAULT true NOT NULL,
	"price_alerts" boolean DEFAULT true NOT NULL,
	"security_alerts" boolean DEFAULT true NOT NULL,
	"marketing_emails" boolean DEFAULT false NOT NULL,
	"display_currency" varchar(10) DEFAULT 'USD' NOT NULL,
	"language" varchar(10) DEFAULT 'en' NOT NULL,
	"theme" varchar(20) DEFAULT 'system' NOT NULL,
	"compact_mode" boolean DEFAULT false NOT NULL,
	"show_balance" boolean DEFAULT true NOT NULL,
	"two_factor_reminder" boolean DEFAULT true NOT NULL,
	"require_transfer_approval" boolean DEFAULT false NOT NULL,
	"transfer_approval_timeout" integer DEFAULT 24 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_risk_profiles" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"overall_risk_score" integer DEFAULT 0 NOT NULL,
	"risk_level" "risk_level" DEFAULT 'Low' NOT NULL,
	"geography_risk" integer DEFAULT 0,
	"transaction_risk" integer DEFAULT 0,
	"behavior_risk" integer DEFAULT 0,
	"screening_risk" integer DEFAULT 0,
	"is_pep" boolean DEFAULT false NOT NULL,
	"is_sanctioned" boolean DEFAULT false NOT NULL,
	"has_adverse_media" boolean DEFAULT false NOT NULL,
	"requires_edd" boolean DEFAULT false NOT NULL,
	"daily_transaction_limit" numeric(18, 2) DEFAULT '10000',
	"monthly_transaction_limit" numeric(18, 2) DEFAULT '50000',
	"last_assessed_at" timestamp DEFAULT now() NOT NULL,
	"last_assessed_by" varchar(255),
	"next_review_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"finatrades_id" varchar(20),
	"email" varchar(255) NOT NULL,
	"password" text NOT NULL,
	"first_name" varchar(255) NOT NULL,
	"last_name" varchar(255) NOT NULL,
	"phone_number" varchar(50),
	"address" text,
	"country" varchar(100),
	"account_type" "account_type" DEFAULT 'personal' NOT NULL,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"kyc_status" "kyc_status" DEFAULT 'Not Started' NOT NULL,
	"is_email_verified" boolean DEFAULT false NOT NULL,
	"email_verification_code" varchar(10),
	"email_verification_expiry" timestamp,
	"mfa_enabled" boolean DEFAULT false NOT NULL,
	"mfa_method" "mfa_method",
	"mfa_secret" varchar(255),
	"mfa_backup_codes" text,
	"biometric_enabled" boolean DEFAULT false NOT NULL,
	"biometric_device_id" varchar(255),
	"profile_photo" text,
	"company_name" varchar(255),
	"registration_number" varchar(100),
	"finabridge_disclaimer_accepted_at" timestamp,
	"finabridge_role" "finabridge_role",
	"last_login_at" timestamp,
	"last_logout_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_finatrades_id_unique" UNIQUE("finatrades_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vault_deposit_requests" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference_number" varchar(100) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"vault_location" varchar(255) NOT NULL,
	"deposit_type" varchar(50) NOT NULL,
	"total_declared_weight_grams" numeric(18, 6) NOT NULL,
	"items" json NOT NULL,
	"delivery_method" varchar(50) NOT NULL,
	"pickup_details" json,
	"documents" json,
	"status" "vault_deposit_status" DEFAULT 'Submitted' NOT NULL,
	"reviewed_by" varchar(255),
	"reviewed_at" timestamp,
	"admin_notes" text,
	"rejection_reason" text,
	"vault_holding_id" varchar(255),
	"certificate_id" varchar(255),
	"vault_internal_reference" varchar(100),
	"verified_weight_grams" numeric(18, 6),
	"gold_price_usd_per_gram" numeric(12, 2),
	"estimated_processing_days" varchar(20),
	"estimated_completion_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"stored_at" timestamp,
	CONSTRAINT "vault_deposit_requests_reference_number_unique" UNIQUE("reference_number")
);
--> statement-breakpoint
CREATE TABLE "vault_holdings" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"gold_grams" numeric(18, 6) NOT NULL,
	"vault_location" varchar(255) DEFAULT 'Dubai - Wingold & Metals DMCC' NOT NULL,
	"wingold_storage_ref" varchar(100),
	"storage_fees_annual_percent" numeric(5, 2) DEFAULT '0.5' NOT NULL,
	"purchase_price_usd_per_gram" numeric(12, 2),
	"is_physically_deposited" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vault_ledger_entries" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"action" "ledger_action" NOT NULL,
	"gold_grams" numeric(18, 6) NOT NULL,
	"gold_price_usd_per_gram" numeric(12, 2),
	"value_usd" numeric(18, 2),
	"from_wallet" "wallet_type",
	"to_wallet" "wallet_type",
	"from_status" "ownership_status",
	"to_status" "ownership_status",
	"balance_after_grams" numeric(18, 6) NOT NULL,
	"transaction_id" varchar(255),
	"bnsl_plan_id" varchar(255),
	"bnsl_payout_id" varchar(255),
	"trade_request_id" varchar(255),
	"certificate_id" varchar(255),
	"counterparty_user_id" varchar(255),
	"notes" text,
	"created_by" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vault_locations" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"code" varchar(20) NOT NULL,
	"address" text,
	"city" varchar(100),
	"country" varchar(100) NOT NULL,
	"timezone" varchar(50),
	"capacity_kg" numeric(18, 2),
	"current_holdings_kg" numeric(18, 2) DEFAULT '0',
	"insurance_provider" varchar(100),
	"insurance_policy_number" varchar(100),
	"insurance_coverage_usd" numeric(18, 2),
	"security_level" varchar(50) DEFAULT 'High',
	"is_active" boolean DEFAULT true,
	"operating_hours" text,
	"contact_email" varchar(255),
	"contact_phone" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "vault_locations_name_unique" UNIQUE("name"),
	CONSTRAINT "vault_locations_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "vault_ownership_summary" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"total_gold_grams" numeric(18, 6) DEFAULT '0' NOT NULL,
	"available_grams" numeric(18, 6) DEFAULT '0' NOT NULL,
	"pending_grams" numeric(18, 6) DEFAULT '0' NOT NULL,
	"locked_bnsl_grams" numeric(18, 6) DEFAULT '0' NOT NULL,
	"reserved_trade_grams" numeric(18, 6) DEFAULT '0' NOT NULL,
	"finapay_grams" numeric(18, 6) DEFAULT '0' NOT NULL,
	"bnsl_available_grams" numeric(18, 6) DEFAULT '0' NOT NULL,
	"bnsl_locked_grams" numeric(18, 6) DEFAULT '0' NOT NULL,
	"finabridge_available_grams" numeric(18, 6) DEFAULT '0' NOT NULL,
	"finabridge_reserved_grams" numeric(18, 6) DEFAULT '0' NOT NULL,
	"vault_location" varchar(255) DEFAULT 'Dubai - Wingold & Metals DMCC' NOT NULL,
	"wingold_storage_ref" varchar(100),
	"last_updated" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "vault_ownership_summary_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "vault_transfers" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference_number" varchar(50) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"gold_grams" numeric(18, 6) NOT NULL,
	"from_location" varchar(100) NOT NULL,
	"to_location" varchar(100) NOT NULL,
	"transfer_fee_usd" numeric(18, 2) DEFAULT '0',
	"reason" text,
	"status" varchar(50) DEFAULT 'Pending' NOT NULL,
	"approved_by" varchar(255),
	"approved_at" timestamp,
	"completed_at" timestamp,
	"admin_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "vault_transfers_reference_number_unique" UNIQUE("reference_number")
);
--> statement-breakpoint
CREATE TABLE "vault_withdrawal_requests" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference_number" varchar(100) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"gold_grams" numeric(18, 6) NOT NULL,
	"gold_price_usd_per_gram" numeric(12, 2) NOT NULL,
	"total_value_usd" numeric(18, 2) NOT NULL,
	"withdrawal_method" "vault_withdrawal_method" NOT NULL,
	"bank_name" varchar(255),
	"account_name" varchar(255),
	"account_number" varchar(100),
	"iban" varchar(100),
	"swift_code" varchar(50),
	"bank_country" varchar(100),
	"crypto_network" varchar(50),
	"crypto_currency" varchar(20),
	"wallet_address" varchar(255),
	"notes" text,
	"status" "vault_withdrawal_status" DEFAULT 'Submitted' NOT NULL,
	"reviewed_by" varchar(255),
	"reviewed_at" timestamp,
	"admin_notes" text,
	"rejection_reason" text,
	"transaction_reference" varchar(255),
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "vault_withdrawal_requests_reference_number_unique" UNIQUE("reference_number")
);
--> statement-breakpoint
CREATE TABLE "wallet_adjustments" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference_number" varchar(100) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"adjustment_type" "wallet_adjustment_type" NOT NULL,
	"gold_grams" numeric(18, 6),
	"amount_usd" numeric(18, 2),
	"gold_price_usd_per_gram" numeric(12, 2),
	"reason" text NOT NULL,
	"internal_notes" text,
	"approved_by" varchar(255),
	"approved_at" timestamp,
	"executed_by" varchar(255) NOT NULL,
	"transaction_id" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "wallet_adjustments_reference_number_unique" UNIQUE("reference_number")
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"gold_grams" numeric(18, 6) DEFAULT '0' NOT NULL,
	"usd_balance" numeric(18, 2) DEFAULT '0' NOT NULL,
	"eur_balance" numeric(18, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "withdrawal_requests" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference_number" varchar(100) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"amount_usd" numeric(18, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'USD' NOT NULL,
	"bank_name" varchar(255) NOT NULL,
	"account_name" varchar(255) NOT NULL,
	"account_number" varchar(100) NOT NULL,
	"iban" varchar(100),
	"swift_code" varchar(50),
	"routing_number" varchar(50),
	"bank_country" varchar(100),
	"notes" text,
	"status" "withdrawal_request_status" DEFAULT 'Pending' NOT NULL,
	"processed_by" varchar(255),
	"processed_at" timestamp,
	"transaction_reference" varchar(255),
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "withdrawal_requests_reference_number_unique" UNIQUE("reference_number")
);
--> statement-breakpoint
ALTER TABLE "account_deletion_requests" ADD CONSTRAINT "account_deletion_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_deletion_requests" ADD CONSTRAINT "account_deletion_requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_action_otps" ADD CONSTRAINT "admin_action_otps_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allocations" ADD CONSTRAINT "allocations_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allocations" ADD CONSTRAINT "allocations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allocations" ADD CONSTRAINT "allocations_storage_certificate_id_certificates_id_fk" FOREIGN KEY ("storage_certificate_id") REFERENCES "public"."certificates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aml_case_activities" ADD CONSTRAINT "aml_case_activities_case_id_aml_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."aml_cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aml_cases" ADD CONSTRAINT "aml_cases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aml_screening_logs" ADD CONSTRAINT "aml_screening_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aml_screening_logs" ADD CONSTRAINT "aml_screening_logs_kyc_submission_id_kyc_submissions_id_fk" FOREIGN KEY ("kyc_submission_id") REFERENCES "public"."kyc_submissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "backup_audit_logs" ADD CONSTRAINT "backup_audit_logs_backup_id_database_backups_id_fk" FOREIGN KEY ("backup_id") REFERENCES "public"."database_backups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "backup_audit_logs" ADD CONSTRAINT "backup_audit_logs_actor_admin_id_users_id_fk" FOREIGN KEY ("actor_admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "binance_transactions" ADD CONSTRAINT "binance_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "binance_transactions" ADD CONSTRAINT "binance_transactions_wallet_transaction_id_transactions_id_fk" FOREIGN KEY ("wallet_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bnsl_agreements" ADD CONSTRAINT "bnsl_agreements_plan_id_bnsl_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."bnsl_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bnsl_agreements" ADD CONSTRAINT "bnsl_agreements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bnsl_early_terminations" ADD CONSTRAINT "bnsl_early_terminations_plan_id_bnsl_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."bnsl_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bnsl_payouts" ADD CONSTRAINT "bnsl_payouts_plan_id_bnsl_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."bnsl_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bnsl_plans" ADD CONSTRAINT "bnsl_plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bnsl_plans" ADD CONSTRAINT "bnsl_plans_template_id_bnsl_plan_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."bnsl_plan_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bnsl_plans" ADD CONSTRAINT "bnsl_plans_variant_id_bnsl_template_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."bnsl_template_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bnsl_template_variants" ADD CONSTRAINT "bnsl_template_variants_template_id_bnsl_plan_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."bnsl_plan_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bnsl_wallets" ADD CONSTRAINT "bnsl_wallets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buy_gold_requests" ADD CONSTRAINT "buy_gold_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buy_gold_requests" ADD CONSTRAINT "buy_gold_requests_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificate_deliveries" ADD CONSTRAINT "certificate_deliveries_certificate_id_certificates_id_fk" FOREIGN KEY ("certificate_id") REFERENCES "public"."certificates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificate_deliveries" ADD CONSTRAINT "certificate_deliveries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificate_deliveries" ADD CONSTRAINT "certificate_deliveries_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_vault_holding_id_vault_holdings_id_fk" FOREIGN KEY ("vault_holding_id") REFERENCES "public"."vault_holdings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_to_user_id_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_agent_workflows" ADD CONSTRAINT "chat_agent_workflows_session_id_chat_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_agent_workflows" ADD CONSTRAINT "chat_agent_workflows_agent_id_chat_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."chat_agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_agent_workflows" ADD CONSTRAINT "chat_agent_workflows_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_session_id_chat_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_agent_id_chat_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."chat_agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_current_agent_id_chat_agents_id_fk" FOREIGN KEY ("current_agent_id") REFERENCES "public"."chat_agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_blocks" ADD CONSTRAINT "content_blocks_page_id_content_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."content_pages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crypto_payment_requests" ADD CONSTRAINT "crypto_payment_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crypto_payment_requests" ADD CONSTRAINT "crypto_payment_requests_wallet_config_id_crypto_wallet_configs_id_fk" FOREIGN KEY ("wallet_config_id") REFERENCES "public"."crypto_wallet_configs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crypto_payment_requests" ADD CONSTRAINT "crypto_payment_requests_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "database_backups" ADD CONSTRAINT "database_backups_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_room_agreement_acceptances" ADD CONSTRAINT "deal_room_agreement_acceptances_deal_room_id_deal_rooms_id_fk" FOREIGN KEY ("deal_room_id") REFERENCES "public"."deal_rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_room_agreement_acceptances" ADD CONSTRAINT "deal_room_agreement_acceptances_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_room_documents" ADD CONSTRAINT "deal_room_documents_deal_room_id_deal_rooms_id_fk" FOREIGN KEY ("deal_room_id") REFERENCES "public"."deal_rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_room_documents" ADD CONSTRAINT "deal_room_documents_trade_request_id_trade_requests_id_fk" FOREIGN KEY ("trade_request_id") REFERENCES "public"."trade_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_room_documents" ADD CONSTRAINT "deal_room_documents_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_room_documents" ADD CONSTRAINT "deal_room_documents_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_room_messages" ADD CONSTRAINT "deal_room_messages_deal_room_id_deal_rooms_id_fk" FOREIGN KEY ("deal_room_id") REFERENCES "public"."deal_rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_room_messages" ADD CONSTRAINT "deal_room_messages_sender_user_id_users_id_fk" FOREIGN KEY ("sender_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_rooms" ADD CONSTRAINT "deal_rooms_trade_request_id_trade_requests_id_fk" FOREIGN KEY ("trade_request_id") REFERENCES "public"."trade_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_rooms" ADD CONSTRAINT "deal_rooms_accepted_proposal_id_trade_proposals_id_fk" FOREIGN KEY ("accepted_proposal_id") REFERENCES "public"."trade_proposals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_rooms" ADD CONSTRAINT "deal_rooms_importer_user_id_users_id_fk" FOREIGN KEY ("importer_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_rooms" ADD CONSTRAINT "deal_rooms_exporter_user_id_users_id_fk" FOREIGN KEY ("exporter_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_rooms" ADD CONSTRAINT "deal_rooms_assigned_admin_id_users_id_fk" FOREIGN KEY ("assigned_admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_rooms" ADD CONSTRAINT "deal_rooms_closed_by_users_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_rooms" ADD CONSTRAINT "deal_rooms_admin_disclaimer_updated_by_users_id_fk" FOREIGN KEY ("admin_disclaimer_updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deposit_requests" ADD CONSTRAINT "deposit_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deposit_requests" ADD CONSTRAINT "deposit_requests_processed_by_users_id_fk" FOREIGN KEY ("processed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exporter_ratings" ADD CONSTRAINT "exporter_ratings_exporter_user_id_users_id_fk" FOREIGN KEY ("exporter_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exporter_ratings" ADD CONSTRAINT "exporter_ratings_importer_user_id_users_id_fk" FOREIGN KEY ("importer_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exporter_ratings" ADD CONSTRAINT "exporter_ratings_trade_request_id_trade_requests_id_fk" FOREIGN KEY ("trade_request_id") REFERENCES "public"."trade_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exporter_trust_scores" ADD CONSTRAINT "exporter_trust_scores_exporter_user_id_users_id_fk" FOREIGN KEY ("exporter_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_transactions" ADD CONSTRAINT "fee_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finabridge_agreements" ADD CONSTRAINT "finabridge_agreements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finabridge_wallets" ADD CONSTRAINT "finabridge_wallets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finatrades_corporate_kyc" ADD CONSTRAINT "finatrades_corporate_kyc_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finatrades_personal_kyc" ADD CONSTRAINT "finatrades_personal_kyc_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forwarded_proposals" ADD CONSTRAINT "forwarded_proposals_trade_request_id_trade_requests_id_fk" FOREIGN KEY ("trade_request_id") REFERENCES "public"."trade_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forwarded_proposals" ADD CONSTRAINT "forwarded_proposals_proposal_id_trade_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."trade_proposals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forwarded_proposals" ADD CONSTRAINT "forwarded_proposals_forwarded_by_admin_id_users_id_fk" FOREIGN KEY ("forwarded_by_admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geo_restriction_settings" ADD CONSTRAINT "geo_restriction_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geo_restrictions" ADD CONSTRAINT "geo_restrictions_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gold_bars" ADD CONSTRAINT "gold_bars_allocated_to_user_id_users_id_fk" FOREIGN KEY ("allocated_to_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gold_gifts" ADD CONSTRAINT "gold_gifts_sender_user_id_users_id_fk" FOREIGN KEY ("sender_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gold_gifts" ADD CONSTRAINT "gold_gifts_recipient_user_id_users_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gold_requests" ADD CONSTRAINT "gold_requests_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gold_requests" ADD CONSTRAINT "gold_requests_payer_id_users_id_fk" FOREIGN KEY ("payer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gold_requests" ADD CONSTRAINT "gold_requests_fulfilled_transaction_id_transactions_id_fk" FOREIGN KEY ("fulfilled_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insurance_certificates" ADD CONSTRAINT "insurance_certificates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_articles" ADD CONSTRAINT "knowledge_articles_category_id_knowledge_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."knowledge_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_articles" ADD CONSTRAINT "knowledge_articles_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_articles" ADD CONSTRAINT "knowledge_articles_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyc_submissions" ADD CONSTRAINT "kyc_submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ngenius_transactions" ADD CONSTRAINT "ngenius_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ngenius_transactions" ADD CONSTRAINT "ngenius_transactions_wallet_transaction_id_transactions_id_fk" FOREIGN KEY ("wallet_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "otp_verifications" ADD CONSTRAINT "otp_verifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partial_settlements" ADD CONSTRAINT "partial_settlements_settlement_hold_id_settlement_holds_id_fk" FOREIGN KEY ("settlement_hold_id") REFERENCES "public"."settlement_holds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partial_settlements" ADD CONSTRAINT "partial_settlements_trade_request_id_trade_requests_id_fk" FOREIGN KEY ("trade_request_id") REFERENCES "public"."trade_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partial_settlements" ADD CONSTRAINT "partial_settlements_released_by_users_id_fk" FOREIGN KEY ("released_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peer_requests" ADD CONSTRAINT "peer_requests_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peer_requests" ADD CONSTRAINT "peer_requests_target_id_users_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peer_requests" ADD CONSTRAINT "peer_requests_fulfilled_transfer_id_peer_transfers_id_fk" FOREIGN KEY ("fulfilled_transfer_id") REFERENCES "public"."peer_transfers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peer_transfers" ADD CONSTRAINT "peer_transfers_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peer_transfers" ADD CONSTRAINT "peer_transfers_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peer_transfers" ADD CONSTRAINT "peer_transfers_sender_transaction_id_transactions_id_fk" FOREIGN KEY ("sender_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peer_transfers" ADD CONSTRAINT "peer_transfers_recipient_transaction_id_transactions_id_fk" FOREIGN KEY ("recipient_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "physical_delivery_requests" ADD CONSTRAINT "physical_delivery_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "physical_delivery_requests" ADD CONSTRAINT "physical_delivery_requests_processed_by_users_id_fk" FOREIGN KEY ("processed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pin_verification_tokens" ADD CONSTRAINT "pin_verification_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_bank_accounts" ADD CONSTRAINT "platform_bank_accounts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_config" ADD CONSTRAINT "platform_config_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_expenses" ADD CONSTRAINT "platform_expenses_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_fees" ADD CONSTRAINT "platform_fees_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_device_tokens" ADD CONSTRAINT "push_device_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qr_payment_invoices" ADD CONSTRAINT "qr_payment_invoices_merchant_id_users_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qr_payment_invoices" ADD CONSTRAINT "qr_payment_invoices_payer_id_users_id_fk" FOREIGN KEY ("payer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qr_payment_invoices" ADD CONSTRAINT "qr_payment_invoices_paid_transaction_id_transactions_id_fk" FOREIGN KEY ("paid_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_id_users_id_fk" FOREIGN KEY ("referrer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referred_id_users_id_fk" FOREIGN KEY ("referred_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_holds" ADD CONSTRAINT "settlement_holds_trade_request_id_trade_requests_id_fk" FOREIGN KEY ("trade_request_id") REFERENCES "public"."trade_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_holds" ADD CONSTRAINT "settlement_holds_importer_user_id_users_id_fk" FOREIGN KEY ("importer_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_holds" ADD CONSTRAINT "settlement_holds_exporter_user_id_users_id_fk" FOREIGN KEY ("exporter_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_milestones" ADD CONSTRAINT "shipment_milestones_shipment_id_trade_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."trade_shipments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storage_fees" ADD CONSTRAINT "storage_fees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_cases" ADD CONSTRAINT "trade_cases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_certificates" ADD CONSTRAINT "trade_certificates_trade_request_id_trade_requests_id_fk" FOREIGN KEY ("trade_request_id") REFERENCES "public"."trade_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_certificates" ADD CONSTRAINT "trade_certificates_importer_user_id_users_id_fk" FOREIGN KEY ("importer_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_certificates" ADD CONSTRAINT "trade_certificates_exporter_user_id_users_id_fk" FOREIGN KEY ("exporter_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_confirmations" ADD CONSTRAINT "trade_confirmations_trade_request_id_trade_requests_id_fk" FOREIGN KEY ("trade_request_id") REFERENCES "public"."trade_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_confirmations" ADD CONSTRAINT "trade_confirmations_accepted_proposal_id_trade_proposals_id_fk" FOREIGN KEY ("accepted_proposal_id") REFERENCES "public"."trade_proposals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_dispute_comments" ADD CONSTRAINT "trade_dispute_comments_dispute_id_trade_disputes_id_fk" FOREIGN KEY ("dispute_id") REFERENCES "public"."trade_disputes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_dispute_comments" ADD CONSTRAINT "trade_dispute_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_disputes" ADD CONSTRAINT "trade_disputes_trade_request_id_trade_requests_id_fk" FOREIGN KEY ("trade_request_id") REFERENCES "public"."trade_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_disputes" ADD CONSTRAINT "trade_disputes_deal_room_id_deal_rooms_id_fk" FOREIGN KEY ("deal_room_id") REFERENCES "public"."deal_rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_disputes" ADD CONSTRAINT "trade_disputes_raised_by_user_id_users_id_fk" FOREIGN KEY ("raised_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_disputes" ADD CONSTRAINT "trade_disputes_assigned_admin_id_users_id_fk" FOREIGN KEY ("assigned_admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_disputes" ADD CONSTRAINT "trade_disputes_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_documents" ADD CONSTRAINT "trade_documents_case_id_trade_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."trade_cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_proposals" ADD CONSTRAINT "trade_proposals_trade_request_id_trade_requests_id_fk" FOREIGN KEY ("trade_request_id") REFERENCES "public"."trade_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_proposals" ADD CONSTRAINT "trade_proposals_exporter_user_id_users_id_fk" FOREIGN KEY ("exporter_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_requests" ADD CONSTRAINT "trade_requests_importer_user_id_users_id_fk" FOREIGN KEY ("importer_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_risk_assessments" ADD CONSTRAINT "trade_risk_assessments_trade_request_id_trade_requests_id_fk" FOREIGN KEY ("trade_request_id") REFERENCES "public"."trade_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_risk_assessments" ADD CONSTRAINT "trade_risk_assessments_assessed_by_users_id_fk" FOREIGN KEY ("assessed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_shipments" ADD CONSTRAINT "trade_shipments_trade_request_id_trade_requests_id_fk" FOREIGN KEY ("trade_request_id") REFERENCES "public"."trade_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_shipments" ADD CONSTRAINT "trade_shipments_deal_room_id_deal_rooms_id_fk" FOREIGN KEY ("deal_room_id") REFERENCES "public"."deal_rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_pins" ADD CONSTRAINT "transaction_pins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_account_status" ADD CONSTRAINT "user_account_status_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_account_status" ADD CONSTRAINT "user_account_status_frozen_by_users_id_fk" FOREIGN KEY ("frozen_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_passkeys" ADD CONSTRAINT "user_passkeys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_risk_profiles" ADD CONSTRAINT "user_risk_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vault_deposit_requests" ADD CONSTRAINT "vault_deposit_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vault_deposit_requests" ADD CONSTRAINT "vault_deposit_requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vault_deposit_requests" ADD CONSTRAINT "vault_deposit_requests_vault_holding_id_vault_holdings_id_fk" FOREIGN KEY ("vault_holding_id") REFERENCES "public"."vault_holdings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vault_deposit_requests" ADD CONSTRAINT "vault_deposit_requests_certificate_id_certificates_id_fk" FOREIGN KEY ("certificate_id") REFERENCES "public"."certificates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vault_holdings" ADD CONSTRAINT "vault_holdings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vault_ledger_entries" ADD CONSTRAINT "vault_ledger_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vault_ledger_entries" ADD CONSTRAINT "vault_ledger_entries_counterparty_user_id_users_id_fk" FOREIGN KEY ("counterparty_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vault_ownership_summary" ADD CONSTRAINT "vault_ownership_summary_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vault_transfers" ADD CONSTRAINT "vault_transfers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vault_transfers" ADD CONSTRAINT "vault_transfers_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vault_withdrawal_requests" ADD CONSTRAINT "vault_withdrawal_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vault_withdrawal_requests" ADD CONSTRAINT "vault_withdrawal_requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_adjustments" ADD CONSTRAINT "wallet_adjustments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_adjustments" ADD CONSTRAINT "wallet_adjustments_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_adjustments" ADD CONSTRAINT "wallet_adjustments_executed_by_users_id_fk" FOREIGN KEY ("executed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_adjustments" ADD CONSTRAINT "wallet_adjustments_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_processed_by_users_id_fk" FOREIGN KEY ("processed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;