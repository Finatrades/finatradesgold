CREATE TYPE "public"."b2b_certificate_type" AS ENUM('bar', 'storage');--> statement-breakpoint
CREATE TYPE "public"."b2b_order_status" AS ENUM('pending', 'confirmed', 'processing', 'partially_fulfilled', 'fulfilled', 'cancelled', 'failed');--> statement-breakpoint
CREATE TYPE "public"."balance_bucket" AS ENUM('Available', 'Pending', 'Locked_BNSL', 'Reserved_Trade');--> statement-breakpoint
CREATE TYPE "public"."cash_ledger_entry_type" AS ENUM('FGPW_LOCK', 'FGPW_UNLOCK', 'BANK_DEPOSIT', 'BANK_WITHDRAWAL', 'ADJUSTMENT', 'FEE_REVENUE');--> statement-breakpoint
CREATE TYPE "public"."certificate_event_type" AS ENUM('ISSUED', 'PARTIAL_SURRENDER', 'FULL_SURRENDER', 'CANCELLED', 'UPDATED', 'WALLET_RECLASSIFICATION');--> statement-breakpoint
CREATE TYPE "public"."credential_status" AS ENUM('active', 'revoked', 'expired', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."credential_type" AS ENUM('kyc', 'identity', 'aml_screening', 'address_verification');--> statement-breakpoint
CREATE TYPE "public"."fpgw_batch_status" AS ENUM('Active', 'Consumed', 'Transferred');--> statement-breakpoint
CREATE TYPE "public"."gold_item_type" AS ENUM('RAW', 'GOLD_BAR', 'GOLD_COIN', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."gold_wallet_type" AS ENUM('LGPW', 'FGPW');--> statement-breakpoint
CREATE TYPE "public"."physical_deposit_status" AS ENUM('SUBMITTED', 'UNDER_REVIEW', 'RECEIVED', 'INSPECTION', 'NEGOTIATION', 'AGREED', 'READY_FOR_PAYMENT', 'APPROVED', 'REJECTED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."physical_storage_certificate_status" AS ENUM('Active', 'Linked', 'Voided', 'Transferred');--> statement-breakpoint
CREATE TYPE "public"."reconciliation_alert_severity" AS ENUM('info', 'warning', 'critical');--> statement-breakpoint
CREATE TYPE "public"."reconciliation_alert_type" AS ENUM('LGPW_EXCEEDS_PHYSICAL', 'FGPW_EXCEEDS_CASH', 'INVENTORY_MISMATCH', 'LARGE_CONVERSION', 'CASH_LOW', 'MANUAL_ADJUSTMENT');--> statement-breakpoint
CREATE TYPE "public"."revocation_reason" AS ENUM('user_request', 'kyc_expired', 'kyc_rejected', 'security_concern', 'data_update', 'key_rotation', 'compliance', 'admin_action');--> statement-breakpoint
CREATE TYPE "public"."unified_tally_event_type" AS ENUM('CREATED', 'PAYMENT_CONFIRMED', 'PHYSICAL_ORDERED', 'PHYSICAL_ALLOCATED', 'BARS_ASSIGNED', 'CERT_RECEIVED', 'APPROVED', 'CREDITED', 'COMPLETED', 'REJECTED', 'FAILED', 'NOTE_ADDED', 'MODIFIED');--> statement-breakpoint
CREATE TYPE "public"."unified_tally_pricing_mode" AS ENUM('MARKET', 'FIXED');--> statement-breakpoint
CREATE TYPE "public"."unified_tally_source_method" AS ENUM('CARD', 'BANK', 'CRYPTO', 'VAULT_GOLD');--> statement-breakpoint
CREATE TYPE "public"."unified_tally_status" AS ENUM('PENDING_PAYMENT', 'PAYMENT_CONFIRMED', 'PHYSICAL_ORDERED', 'PHYSICAL_ALLOCATED', 'CERT_RECEIVED', 'CREDITED', 'COMPLETED', 'REJECTED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."unified_tally_txn_type" AS ENUM('FIAT_CRYPTO_DEPOSIT', 'VAULT_GOLD_DEPOSIT');--> statement-breakpoint
CREATE TYPE "public"."vault_reconciliation_status" AS ENUM('success', 'warning', 'error');--> statement-breakpoint
CREATE TYPE "public"."wallet_conversion_direction" AS ENUM('LGPW_TO_FGPW', 'FGPW_TO_LGPW');--> statement-breakpoint
CREATE TYPE "public"."wallet_conversion_status" AS ENUM('pending', 'approved', 'completed', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."wingold_bar_custody_status" AS ENUM('in_vault', 'reserved', 'released', 'transferred');--> statement-breakpoint
CREATE TYPE "public"."wingold_bar_size" AS ENUM('1g', '10g', '100g', '1kg');--> statement-breakpoint
CREATE TYPE "public"."wingold_certificate_type" AS ENUM('bar', 'storage');--> statement-breakpoint
CREATE TYPE "public"."wingold_order_status" AS ENUM('pending', 'submitted', 'confirmed', 'processing', 'wingold_approved', 'fulfilled', 'cancelled', 'failed');--> statement-breakpoint
CREATE TYPE "public"."workflow_flow_type" AS ENUM('ADD_FUNDS', 'INTERNAL_TRANSFER_LGPW_TO_FGPW', 'INTERNAL_TRANSFER_FGPW_TO_LGPW', 'TRANSFER_USER_TO_USER', 'WITHDRAWAL', 'BNSL_ACTIVATION', 'BNSL_PAYOUT', 'FINABRIDGE_LOCK');--> statement-breakpoint
CREATE TYPE "public"."workflow_step_result" AS ENUM('PASS', 'FAIL', 'PENDING', 'SKIPPED');--> statement-breakpoint
ALTER TYPE "public"."certificate_type" ADD VALUE 'Conversion';--> statement-breakpoint
ALTER TYPE "public"."certificate_type" ADD VALUE 'Title Transfer';--> statement-breakpoint
ALTER TYPE "public"."deposit_request_status" ADD VALUE 'Under Review' BEFORE 'Confirmed';--> statement-breakpoint
ALTER TYPE "public"."ledger_action" ADD VALUE 'LGPW_To_FGPW';--> statement-breakpoint
ALTER TYPE "public"."ledger_action" ADD VALUE 'FGPW_To_LGPW';--> statement-breakpoint
CREATE TABLE "b2b_certificates" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" varchar(255) NOT NULL,
	"bar_id" varchar(255),
	"certificate_number" varchar(100) NOT NULL,
	"certificate_type" "b2b_certificate_type" NOT NULL,
	"pdf_url" text,
	"json_data" json,
	"issued_at" timestamp DEFAULT now() NOT NULL,
	"webhook_sent_at" timestamp,
	"signature" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "b2b_certificates_certificate_number_unique" UNIQUE("certificate_number")
);
--> statement-breakpoint
CREATE TABLE "b2b_order_bars" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" varchar(255) NOT NULL,
	"bar_id" varchar(100) NOT NULL,
	"serial_number" varchar(100) NOT NULL,
	"bar_size" "wingold_bar_size" NOT NULL,
	"weight_grams" numeric(18, 6) NOT NULL,
	"purity" numeric(8, 6) DEFAULT '0.9999' NOT NULL,
	"mint" varchar(255),
	"vault_location_id" varchar(255) NOT NULL,
	"vault_location_name" varchar(255),
	"allocated_at" timestamp DEFAULT now() NOT NULL,
	"webhook_sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "b2b_order_bars_bar_id_unique" UNIQUE("bar_id")
);
--> statement-breakpoint
CREATE TABLE "b2b_orders" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"finatrades_ref" varchar(100) NOT NULL,
	"customer_external_id" varchar(255) NOT NULL,
	"customer_email" varchar(255) NOT NULL,
	"customer_name" varchar(255) NOT NULL,
	"bar_size" "wingold_bar_size" NOT NULL,
	"bar_count" integer NOT NULL,
	"total_grams" numeric(18, 6) NOT NULL,
	"usd_amount" numeric(18, 2) NOT NULL,
	"gold_price_per_gram" numeric(18, 6) NOT NULL,
	"preferred_vault_location_id" varchar(255),
	"actual_vault_location_id" varchar(255),
	"webhook_url" text NOT NULL,
	"status" "b2b_order_status" DEFAULT 'pending' NOT NULL,
	"bars_allocated" integer DEFAULT 0 NOT NULL,
	"certificates_issued" integer DEFAULT 0 NOT NULL,
	"confirmed_at" timestamp,
	"fulfilled_at" timestamp,
	"cancelled_at" timestamp,
	"cancellation_reason" text,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "b2b_orders_finatrades_ref_unique" UNIQUE("finatrades_ref")
);
--> statement-breakpoint
CREATE TABLE "b2b_vault_locations" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(20) NOT NULL,
	"name" varchar(255) NOT NULL,
	"city" varchar(100) NOT NULL,
	"country" varchar(100) NOT NULL,
	"address" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"capacity_kg" numeric(18, 2),
	"current_stock_kg" numeric(18, 2) DEFAULT '0',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "b2b_vault_locations_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "b2b_webhook_logs" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" varchar(255) NOT NULL,
	"event" varchar(50) NOT NULL,
	"webhook_url" text NOT NULL,
	"payload" json,
	"http_status" integer,
	"response_body" text,
	"success" boolean DEFAULT false NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"last_attempt_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cash_safety_ledger" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entry_type" "cash_ledger_entry_type" NOT NULL,
	"amount_usd" numeric(18, 2) NOT NULL,
	"direction" varchar(10) NOT NULL,
	"running_balance_usd" numeric(18, 2) NOT NULL,
	"conversion_id" varchar(255),
	"user_id" varchar(255),
	"bank_reference" varchar(255),
	"bank_account_last4" varchar(4),
	"created_by" varchar(255),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "certificate_events" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"certificate_id" varchar(255) NOT NULL,
	"event_type" "certificate_event_type" NOT NULL,
	"grams_affected" numeric(18, 6) NOT NULL,
	"grams_before" numeric(18, 6) NOT NULL,
	"grams_after" numeric(18, 6) NOT NULL,
	"transaction_id" varchar(255),
	"child_certificate_id" varchar(255),
	"notes" text,
	"created_by" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credential_presentations" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"credential_id" varchar(100) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"verifier_domain" varchar(255) NOT NULL,
	"verifier_name" varchar(255),
	"claims_shared" json,
	"verification_successful" boolean DEFAULT true NOT NULL,
	"verification_error" text,
	"presentation_context" varchar(100),
	"ip_address" varchar(45),
	"user_agent" text,
	"presented_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credential_revocations" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"credential_id" varchar(100) NOT NULL,
	"reason" "revocation_reason" NOT NULL,
	"reason_details" text,
	"revoked_by" varchar(255),
	"revoked_by_system" boolean DEFAULT false NOT NULL,
	"replacement_credential_id" varchar(100),
	"revoked_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deposit_inspections" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deposit_request_id" varchar(255) NOT NULL,
	"inspector_id" varchar(255) NOT NULL,
	"gross_weight_grams" numeric(18, 6) NOT NULL,
	"net_weight_grams" numeric(18, 6) NOT NULL,
	"purity_result" varchar(20) NOT NULL,
	"assay_method" varchar(100),
	"assay_fee_usd" numeric(12, 2) DEFAULT '0',
	"refining_fee_usd" numeric(12, 2) DEFAULT '0',
	"handling_fee_usd" numeric(12, 2) DEFAULT '0',
	"other_fees_usd" numeric(12, 2) DEFAULT '0',
	"total_fees_usd" numeric(12, 2) DEFAULT '0',
	"credited_grams" numeric(18, 6) NOT NULL,
	"assay_report_url" varchar(500),
	"inspection_photos" json,
	"inspector_notes" text,
	"discrepancy_notes" text,
	"inspected_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deposit_items" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deposit_request_id" varchar(255) NOT NULL,
	"item_type" "gold_item_type" NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"weight_per_unit_grams" numeric(18, 6) NOT NULL,
	"total_declared_weight_grams" numeric(18, 6) NOT NULL,
	"purity" varchar(20) NOT NULL,
	"brand" varchar(255),
	"mint" varchar(255),
	"serial_number" varchar(100),
	"custom_description" text,
	"photo_front_url" varchar(500),
	"photo_back_url" varchar(500),
	"additional_photos" json,
	"verified_weight_grams" numeric(18, 6),
	"verified_purity" varchar(20),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deposit_negotiation_messages" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deposit_request_id" varchar(255) NOT NULL,
	"message_type" varchar(20) NOT NULL,
	"sender_id" varchar(255) NOT NULL,
	"sender_role" varchar(20) NOT NULL,
	"proposed_grams" numeric(18, 6),
	"proposed_purity" varchar(20),
	"proposed_fees" numeric(12, 2),
	"gold_price_at_time" numeric(12, 2),
	"message" text,
	"is_latest" boolean DEFAULT true,
	"responded_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fpgw_batches" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"original_grams" numeric(18, 6) NOT NULL,
	"remaining_grams" numeric(18, 6) NOT NULL,
	"locked_price_usd" numeric(12, 2) NOT NULL,
	"status" "fpgw_batch_status" DEFAULT 'Active' NOT NULL,
	"balance_bucket" "balance_bucket" DEFAULT 'Available' NOT NULL,
	"source_transaction_id" varchar(255),
	"source_type" varchar(50),
	"from_user_id" varchar(255),
	"notes" text,
	"gold_wallet_type" varchar(10) DEFAULT 'LGPW' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "physical_deposit_requests" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference_number" varchar(100) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"deposit_type" "gold_item_type" NOT NULL,
	"requires_negotiation" boolean DEFAULT false NOT NULL,
	"total_declared_weight_grams" numeric(18, 6) NOT NULL,
	"item_count" integer DEFAULT 1 NOT NULL,
	"is_beneficial_owner" boolean DEFAULT true NOT NULL,
	"source_of_metal" varchar(255),
	"source_details" text,
	"delivery_method" varchar(50) NOT NULL,
	"pickup_address" text,
	"pickup_contact_name" varchar(255),
	"pickup_contact_phone" varchar(50),
	"preferred_datetime" timestamp,
	"scheduled_datetime" timestamp,
	"invoice_url" varchar(500),
	"assay_certificate_url" varchar(500),
	"additional_documents" json,
	"no_lien_dispute" boolean DEFAULT false NOT NULL,
	"accept_vault_terms" boolean DEFAULT false NOT NULL,
	"accept_insurance" boolean DEFAULT false NOT NULL,
	"accept_fees" boolean DEFAULT false NOT NULL,
	"status" "physical_deposit_status" DEFAULT 'SUBMITTED' NOT NULL,
	"usd_estimate_from_user" numeric(18, 2),
	"usd_counter_from_admin" numeric(18, 2),
	"usd_agreed_value" numeric(18, 2),
	"negotiation_notes" text,
	"user_accepted_at" timestamp,
	"admin_accepted_at" timestamp,
	"assigned_to" varchar(255),
	"reviewed_by" varchar(255),
	"reviewed_at" timestamp,
	"received_at" timestamp,
	"received_by" varchar(255),
	"batch_lot_id" varchar(100),
	"inspection_id" varchar(255),
	"approved_at" timestamp,
	"approved_by" varchar(255),
	"final_credited_grams" numeric(18, 6),
	"gold_price_at_approval" numeric(12, 2),
	"physical_storage_certificate_id" varchar(255),
	"digital_ownership_certificate_id" varchar(255),
	"wallet_transaction_id" varchar(255),
	"admin_notes" text,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "physical_deposit_requests_reference_number_unique" UNIQUE("reference_number")
);
--> statement-breakpoint
CREATE TABLE "physical_storage_certificates" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"physical_storage_ref" varchar(255) NOT NULL,
	"issuer" varchar(255) DEFAULT 'Wingold & Metals DMCC' NOT NULL,
	"gold_grams" numeric(20, 6) NOT NULL,
	"gold_purity" numeric(5, 4) DEFAULT '0.9999' NOT NULL,
	"bar_serial_number" varchar(255),
	"bar_weight" numeric(20, 6),
	"bar_type" varchar(50),
	"vault_location_id" varchar(255),
	"country_code" varchar(3),
	"status" "physical_storage_certificate_status" DEFAULT 'Active' NOT NULL,
	"linked_vault_certificate_id" varchar(255),
	"linked_at" timestamp,
	"linked_by" varchar(255),
	"document_url" text,
	"issued_at" timestamp DEFAULT now() NOT NULL,
	"voided_at" timestamp,
	"voided_by" varchar(255),
	"void_reason" text,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "physical_storage_certificates_physical_storage_ref_unique" UNIQUE("physical_storage_ref")
);
--> statement-breakpoint
CREATE TABLE "platform_exposure_snapshots" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"snapshot_date" timestamp NOT NULL,
	"total_mpgw_grams" numeric(18, 6) NOT NULL,
	"total_mpgw_value_usd" numeric(18, 2) NOT NULL,
	"total_fpgw_grams" numeric(18, 6) NOT NULL,
	"total_fpgw_locked_value_usd" numeric(18, 2) NOT NULL,
	"physical_inventory_grams" numeric(18, 6) NOT NULL,
	"physical_inventory_value_usd" numeric(18, 2) NOT NULL,
	"cash_safety_balance_usd" numeric(18, 2) NOT NULL,
	"gold_price_usd_per_gram" numeric(12, 4) NOT NULL,
	"gold_price_usd_per_ounce" numeric(12, 2) NOT NULL,
	"mpgw_coverage_ratio" numeric(8, 4) NOT NULL,
	"fpgw_coverage_ratio" numeric(8, 4) NOT NULL,
	"total_users_with_mpgw" integer DEFAULT 0 NOT NULL,
	"total_users_with_fpgw" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reconciliation_alerts" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alert_type" "reconciliation_alert_type" NOT NULL,
	"severity" "reconciliation_alert_severity" NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"expected_value" numeric(18, 6),
	"actual_value" numeric(18, 6),
	"difference_value" numeric(18, 6),
	"difference_percentage" numeric(8, 4),
	"is_resolved" boolean DEFAULT false NOT NULL,
	"resolved_at" timestamp,
	"resolved_by" varchar(255),
	"resolution_notes" text,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "third_party_vault_locations" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"address" text,
	"city" varchar(100),
	"country" varchar(100) NOT NULL,
	"country_code" varchar(3) NOT NULL,
	"capacity_kg" numeric(20, 6),
	"current_holdings_kg" numeric(20, 6) DEFAULT '0' NOT NULL,
	"insurance_provider" varchar(255),
	"insurance_coverage_usd" numeric(20, 2),
	"insurance_expiry_date" date,
	"security_level" varchar(50) DEFAULT 'Standard',
	"contact_name" varchar(255),
	"contact_email" varchar(255),
	"contact_phone" varchar(50),
	"is_active" boolean DEFAULT true NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "third_party_vault_locations_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "unified_tally_events" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tally_id" varchar(255) NOT NULL,
	"event_type" "unified_tally_event_type" NOT NULL,
	"previous_status" "unified_tally_status",
	"new_status" "unified_tally_status",
	"details" json,
	"notes" text,
	"triggered_by" varchar(255),
	"triggered_by_name" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "unified_tally_transactions" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"txn_id" varchar(50) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"user_name" varchar(255),
	"user_email" varchar(255),
	"txn_type" "unified_tally_txn_type" NOT NULL,
	"source_method" "unified_tally_source_method" NOT NULL,
	"wallet_type" "gold_wallet_type" DEFAULT 'LGPW' NOT NULL,
	"status" "unified_tally_status" DEFAULT 'PENDING_PAYMENT' NOT NULL,
	"deposit_currency" varchar(10) DEFAULT 'USD',
	"deposit_amount" numeric(18, 2) DEFAULT '0',
	"fee_amount" numeric(18, 2) DEFAULT '0',
	"fee_currency" varchar(10) DEFAULT 'USD',
	"net_amount" numeric(18, 2) DEFAULT '0',
	"payment_reference" varchar(255),
	"payment_confirmed_at" timestamp,
	"pricing_mode" "unified_tally_pricing_mode" DEFAULT 'MARKET',
	"gold_rate_value" numeric(12, 4),
	"rate_timestamp" timestamp,
	"gold_equivalent_g" numeric(18, 6),
	"gold_credited_g" numeric(18, 6),
	"gold_credited_value_usd" numeric(18, 2),
	"vault_gold_deposited_g" numeric(18, 6),
	"vault_deposit_certificate_id" varchar(255),
	"vault_deposit_verified_by" varchar(255),
	"vault_deposit_verified_at" timestamp,
	"wingold_order_id" varchar(100),
	"wingold_supplier_invoice_id" varchar(100),
	"physical_gold_allocated_g" numeric(18, 6),
	"wingold_buy_rate" numeric(12, 4),
	"wingold_cost_usd" numeric(18, 2),
	"bar_lot_serials_json" json,
	"vault_location" varchar(255),
	"storage_certificate_id" varchar(255),
	"certificate_file_url" text,
	"certificate_date" timestamp,
	"gateway_cost_usd" numeric(18, 2) DEFAULT '0',
	"bank_cost_usd" numeric(18, 2) DEFAULT '0',
	"network_cost_usd" numeric(18, 2) DEFAULT '0',
	"ops_cost_usd" numeric(18, 2) DEFAULT '0',
	"total_costs_usd" numeric(18, 2) DEFAULT '0',
	"net_profit_usd" numeric(18, 2) DEFAULT '0',
	"approved_by" varchar(255),
	"approved_at" timestamp,
	"rejection_reason" text,
	"notes" text,
	"created_by" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unified_tally_transactions_txn_id_unique" UNIQUE("txn_id")
);
--> statement-breakpoint
CREATE TABLE "vault_country_routing_rules" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"country_code" varchar(3) NOT NULL,
	"country_name" varchar(100) NOT NULL,
	"primary_vault_id" varchar(255) NOT NULL,
	"fallback_vault_id" varchar(255),
	"priority" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vault_reconciliation_runs" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_date" timestamp DEFAULT now() NOT NULL,
	"run_by" varchar(255),
	"status" "vault_reconciliation_status" NOT NULL,
	"total_digital_grams" numeric(20, 6) NOT NULL,
	"total_physical_grams" numeric(20, 6) NOT NULL,
	"discrepancy_grams" numeric(20, 6) NOT NULL,
	"mpgw_grams" numeric(20, 6) DEFAULT '0' NOT NULL,
	"fpgw_grams" numeric(20, 6) DEFAULT '0' NOT NULL,
	"unlinked_deposits" integer DEFAULT 0 NOT NULL,
	"country_mismatches" integer DEFAULT 0 NOT NULL,
	"negative_balances" integer DEFAULT 0 NOT NULL,
	"issues_json" json,
	"report_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verifiable_credentials" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"credential_id" varchar(100) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"credential_type" "credential_type" DEFAULT 'kyc' NOT NULL,
	"schema_version" varchar(20) DEFAULT '1.0' NOT NULL,
	"issuer_did" varchar(255) NOT NULL,
	"subject_did" varchar(255),
	"vc_jwt" text NOT NULL,
	"vc_payload" json,
	"claims_summary" json,
	"status" "credential_status" DEFAULT 'active' NOT NULL,
	"issued_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"key_id" varchar(100),
	"signature_algorithm" varchar(20) DEFAULT 'RS256' NOT NULL,
	"issued_by" varchar(255),
	"presentation_count" integer DEFAULT 0 NOT NULL,
	"last_presented_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "verifiable_credentials_credential_id_unique" UNIQUE("credential_id")
);
--> statement-breakpoint
CREATE TABLE "wallet_conversions" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"direction" "wallet_conversion_direction" NOT NULL,
	"gold_grams" numeric(18, 6) NOT NULL,
	"spot_price_usd_per_gram" numeric(12, 4) NOT NULL,
	"locked_value_usd" numeric(18, 2) NOT NULL,
	"fee_percentage" numeric(5, 4) DEFAULT '0',
	"fee_amount_usd" numeric(12, 2) DEFAULT '0',
	"execution_price_usd_per_gram" numeric(12, 4),
	"execution_value_usd" numeric(18, 2),
	"status" "wallet_conversion_status" DEFAULT 'pending' NOT NULL,
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"reviewed_at" timestamp,
	"reviewed_by" varchar(255),
	"completed_at" timestamp,
	"admin_notes" text,
	"rejection_reason" text,
	"ledger_debit_id" varchar(255),
	"ledger_credit_id" varchar(255),
	"fpgw_batch_id" varchar(255),
	"cash_ledger_entry_id" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wingold_allocations" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tally_id" varchar(255),
	"user_id" varchar(255) NOT NULL,
	"allocated_g" numeric(18, 6) NOT NULL,
	"vault_location" varchar(255) NOT NULL,
	"certificate_id" varchar(255),
	"wingold_order_id" varchar(100),
	"wingold_invoice_id" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wingold_api_credentials" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"api_key_id" varchar(255) NOT NULL,
	"description" varchar(255),
	"public_key" text,
	"allowed_ips" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_used_at" timestamp,
	"last_rotated_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "wingold_api_credentials_api_key_id_unique" UNIQUE("api_key_id")
);
--> statement-breakpoint
CREATE TABLE "wingold_bar_lots" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" varchar(255) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"bar_id" varchar(100) NOT NULL,
	"serial_number" varchar(100) NOT NULL,
	"bar_size" "wingold_bar_size" NOT NULL,
	"weight_grams" numeric(18, 6) NOT NULL,
	"purity" numeric(5, 4) DEFAULT '0.9999' NOT NULL,
	"mint" varchar(100),
	"vault_location_id" varchar(255),
	"vault_location_name" varchar(255),
	"custody_status" "wingold_bar_custody_status" DEFAULT 'in_vault' NOT NULL,
	"bar_certificate_id" varchar(255),
	"storage_certificate_id" varchar(255),
	"vault_holding_id" varchar(255),
	"ledger_entry_id" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "wingold_bar_lots_bar_id_unique" UNIQUE("bar_id")
);
--> statement-breakpoint
CREATE TABLE "wingold_bars" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"allocation_id" varchar(255),
	"tally_id" varchar(255),
	"serial" varchar(100) NOT NULL,
	"purity" numeric(5, 2) DEFAULT '999.9' NOT NULL,
	"weight_g" numeric(18, 6) NOT NULL,
	"vault_location" varchar(255) NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "wingold_bars_serial_unique" UNIQUE("serial")
);
--> statement-breakpoint
CREATE TABLE "wingold_certificates" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" varchar(255) NOT NULL,
	"bar_lot_id" varchar(255),
	"user_id" varchar(255) NOT NULL,
	"certificate_type" "wingold_certificate_type" NOT NULL,
	"certificate_number" varchar(100) NOT NULL,
	"provider_hash" varchar(255),
	"pdf_url" text,
	"json_data" json,
	"signature" text,
	"issued_at" timestamp NOT NULL,
	"verified_at" timestamp,
	"verified_by" varchar(255),
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "wingold_certificates_certificate_number_unique" UNIQUE("certificate_number")
);
--> statement-breakpoint
CREATE TABLE "wingold_products" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wingold_product_id" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"weight" varchar(50) NOT NULL,
	"weight_grams" numeric(18, 4) NOT NULL,
	"purity" varchar(20) DEFAULT '999.9' NOT NULL,
	"live_price" numeric(18, 2),
	"price_per_gram" numeric(18, 6),
	"currency" varchar(10) DEFAULT 'USD' NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"in_stock" boolean DEFAULT true NOT NULL,
	"category" varchar(100) DEFAULT 'bars',
	"image_url" text,
	"thumbnail_url" text,
	"gallery_urls" json,
	"certification_image_url" text,
	"description" text,
	"metadata" json,
	"synced_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "wingold_products_wingold_product_id_unique" UNIQUE("wingold_product_id")
);
--> statement-breakpoint
CREATE TABLE "wingold_purchase_orders" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference_number" varchar(50) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"transaction_id" varchar(255),
	"bar_size" "wingold_bar_size" NOT NULL,
	"bar_count" integer NOT NULL,
	"total_grams" numeric(18, 6) NOT NULL,
	"usd_amount" numeric(18, 2) NOT NULL,
	"gold_price_usd_per_gram" numeric(18, 6) NOT NULL,
	"status" "wingold_order_status" DEFAULT 'pending' NOT NULL,
	"wingold_order_id" varchar(255),
	"wingold_vault_location_id" varchar(255),
	"submitted_at" timestamp,
	"confirmed_at" timestamp,
	"fulfilled_at" timestamp,
	"cancelled_at" timestamp,
	"error_message" text,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "wingold_purchase_orders_reference_number_unique" UNIQUE("reference_number")
);
--> statement-breakpoint
CREATE TABLE "wingold_reconciliations" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reconciliation_date" date NOT NULL,
	"wingold_total_bars" integer,
	"wingold_total_grams" numeric(18, 6),
	"finatrades_total_bars" integer,
	"finatrades_total_grams" numeric(18, 6),
	"is_matched" boolean DEFAULT false NOT NULL,
	"discrepancy_grams" numeric(18, 6),
	"discrepancy_notes" text,
	"raw_payload" json,
	"reviewed_by" varchar(255),
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wingold_vault_locations" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wingold_location_id" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(50),
	"city" varchar(100),
	"country" varchar(100) NOT NULL,
	"address" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" json,
	"synced_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "wingold_vault_locations_wingold_location_id_unique" UNIQUE("wingold_location_id")
);
--> statement-breakpoint
CREATE TABLE "workflow_audit_logs" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"flow_type" "workflow_flow_type" NOT NULL,
	"flow_instance_id" varchar(255) NOT NULL,
	"user_id" varchar(255),
	"transaction_id" varchar(255),
	"deposit_request_id" varchar(255),
	"step_key" varchar(100) NOT NULL,
	"step_order" integer NOT NULL,
	"expected" text,
	"actual" text,
	"result" "workflow_step_result" DEFAULT 'PENDING' NOT NULL,
	"mismatch_reason" text,
	"payload_json" json,
	"wallet_credited" varchar(20),
	"ledger_entry_id" varchar(255),
	"certificate_id" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_audit_summaries" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"flow_type" "workflow_flow_type" NOT NULL,
	"flow_instance_id" varchar(255) NOT NULL,
	"user_id" varchar(255),
	"transaction_id" varchar(255),
	"total_steps" integer DEFAULT 0 NOT NULL,
	"passed_steps" integer DEFAULT 0 NOT NULL,
	"failed_steps" integer DEFAULT 0 NOT NULL,
	"pending_steps" integer DEFAULT 0 NOT NULL,
	"overall_result" "workflow_step_result" DEFAULT 'PENDING' NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workflow_audit_summaries_flow_instance_id_unique" UNIQUE("flow_instance_id")
);
--> statement-breakpoint
DROP TABLE "liquidity_snapshots" CASCADE;--> statement-breakpoint
DROP TABLE "settlement_queue" CASCADE;--> statement-breakpoint
ALTER TABLE "allocations" ADD COLUMN "gold_wallet_type" varchar(10) DEFAULT 'LGPW' NOT NULL;--> statement-breakpoint
ALTER TABLE "bnsl_plans" ADD COLUMN "gold_wallet_type" varchar(10) DEFAULT 'LGPW' NOT NULL;--> statement-breakpoint
ALTER TABLE "certificates" ADD COLUMN "gold_wallet_type" varchar(10);--> statement-breakpoint
ALTER TABLE "certificates" ADD COLUMN "from_gold_wallet_type" varchar(10);--> statement-breakpoint
ALTER TABLE "certificates" ADD COLUMN "to_gold_wallet_type" varchar(10);--> statement-breakpoint
ALTER TABLE "certificates" ADD COLUMN "fpgw_batch_id" varchar(255);--> statement-breakpoint
ALTER TABLE "certificates" ADD COLUMN "conversion_price_usd" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "certificates" ADD COLUMN "remaining_grams" numeric(18, 6);--> statement-breakpoint
ALTER TABLE "certificates" ADD COLUMN "parent_certificate_id" varchar(255);--> statement-breakpoint
ALTER TABLE "deposit_requests" ADD COLUMN "expected_gold_grams" numeric(18, 6);--> statement-breakpoint
ALTER TABLE "deposit_requests" ADD COLUMN "price_snapshot_usd_per_gram" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "deposit_requests" ADD COLUMN "fee_percent_snapshot" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "deposit_requests" ADD COLUMN "gold_wallet_type" varchar(10) DEFAULT 'LGPW' NOT NULL;--> statement-breakpoint
ALTER TABLE "deposit_requests" ADD COLUMN "gold_bar_purchase" json DEFAULT 'null'::json;--> statement-breakpoint
ALTER TABLE "deposit_requests" ADD COLUMN "wingold_order_id" varchar(255) DEFAULT NULL;--> statement-breakpoint
ALTER TABLE "deposit_requests" ADD COLUMN "crypto_transaction_hash" varchar(255);--> statement-breakpoint
ALTER TABLE "deposit_requests" ADD COLUMN "crypto_network" varchar(50);--> statement-breakpoint
ALTER TABLE "deposit_requests" ADD COLUMN "crypto_wallet_config_id" varchar(255);--> statement-breakpoint
ALTER TABLE "deposit_requests" ADD COLUMN "crypto_amount" varchar(100);--> statement-breakpoint
ALTER TABLE "deposit_requests" ADD COLUMN "card_transaction_ref" varchar(255);--> statement-breakpoint
ALTER TABLE "deposit_requests" ADD COLUMN "card_payment_status" varchar(50);--> statement-breakpoint
ALTER TABLE "gold_bars" ADD COLUMN "gold_wallet_type" varchar(10) DEFAULT 'LGPW' NOT NULL;--> statement-breakpoint
ALTER TABLE "ngenius_transactions" ADD COLUMN "gold_wallet_type" varchar(10) DEFAULT 'LGPW';--> statement-breakpoint
ALTER TABLE "platform_bank_accounts" ADD COLUMN "gold_wallet_type" varchar(10) DEFAULT 'LGPW' NOT NULL;--> statement-breakpoint
ALTER TABLE "referrals" ADD COLUMN "gold_wallet_type" varchar(10) DEFAULT 'LGPW' NOT NULL;--> statement-breakpoint
ALTER TABLE "sar_reports" ADD COLUMN "gold_wallet_type" varchar(10) DEFAULT 'LGPW' NOT NULL;--> statement-breakpoint
ALTER TABLE "storage_fees" ADD COLUMN "gold_wallet_type" varchar(10) DEFAULT 'LGPW' NOT NULL;--> statement-breakpoint
ALTER TABLE "trade_cases" ADD COLUMN "gold_wallet_type" varchar(10) DEFAULT 'LGPW' NOT NULL;--> statement-breakpoint
ALTER TABLE "trade_proposals" ADD COLUMN "gold_wallet_type" varchar(10) DEFAULT 'LGPW' NOT NULL;--> statement-breakpoint
ALTER TABLE "trade_shipments" ADD COLUMN "gold_wallet_type" varchar(10) DEFAULT 'LGPW' NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "gold_wallet_type" varchar(10);--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "fpgw_batch_id" varchar(255);--> statement-breakpoint
ALTER TABLE "vault_ledger_entries" ADD COLUMN "gold_wallet_type" "gold_wallet_type";--> statement-breakpoint
ALTER TABLE "vault_ledger_entries" ADD COLUMN "from_gold_wallet_type" "gold_wallet_type";--> statement-breakpoint
ALTER TABLE "vault_ledger_entries" ADD COLUMN "to_gold_wallet_type" "gold_wallet_type";--> statement-breakpoint
ALTER TABLE "vault_ledger_entries" ADD COLUMN "fpgw_batch_id" varchar(255);--> statement-breakpoint
ALTER TABLE "vault_ownership_summary" ADD COLUMN "mpgw_available_grams" numeric(18, 6) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "vault_ownership_summary" ADD COLUMN "mpgw_pending_grams" numeric(18, 6) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "vault_ownership_summary" ADD COLUMN "mpgw_locked_bnsl_grams" numeric(18, 6) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "vault_ownership_summary" ADD COLUMN "mpgw_reserved_trade_grams" numeric(18, 6) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "vault_ownership_summary" ADD COLUMN "fpgw_available_grams" numeric(18, 6) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "vault_ownership_summary" ADD COLUMN "fpgw_pending_grams" numeric(18, 6) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "vault_ownership_summary" ADD COLUMN "fpgw_locked_bnsl_grams" numeric(18, 6) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "vault_ownership_summary" ADD COLUMN "fpgw_reserved_trade_grams" numeric(18, 6) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "vault_ownership_summary" ADD COLUMN "fpgw_weighted_avg_price_usd" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "vault_withdrawal_requests" ADD COLUMN "gold_wallet_type" varchar(10) DEFAULT 'LGPW' NOT NULL;--> statement-breakpoint
ALTER TABLE "withdrawal_requests" ADD COLUMN "gold_wallet_type" varchar(10) DEFAULT 'LGPW' NOT NULL;--> statement-breakpoint
ALTER TABLE "withdrawal_requests" ADD COLUMN "gold_grams" numeric(18, 6);--> statement-breakpoint
ALTER TABLE "withdrawal_requests" ADD COLUMN "gold_price_at_request" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "b2b_certificates" ADD CONSTRAINT "b2b_certificates_order_id_b2b_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."b2b_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "b2b_certificates" ADD CONSTRAINT "b2b_certificates_bar_id_b2b_order_bars_id_fk" FOREIGN KEY ("bar_id") REFERENCES "public"."b2b_order_bars"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "b2b_order_bars" ADD CONSTRAINT "b2b_order_bars_order_id_b2b_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."b2b_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "b2b_webhook_logs" ADD CONSTRAINT "b2b_webhook_logs_order_id_b2b_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."b2b_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_safety_ledger" ADD CONSTRAINT "cash_safety_ledger_conversion_id_wallet_conversions_id_fk" FOREIGN KEY ("conversion_id") REFERENCES "public"."wallet_conversions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_safety_ledger" ADD CONSTRAINT "cash_safety_ledger_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_safety_ledger" ADD CONSTRAINT "cash_safety_ledger_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificate_events" ADD CONSTRAINT "certificate_events_certificate_id_certificates_id_fk" FOREIGN KEY ("certificate_id") REFERENCES "public"."certificates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificate_events" ADD CONSTRAINT "certificate_events_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credential_presentations" ADD CONSTRAINT "credential_presentations_credential_id_verifiable_credentials_credential_id_fk" FOREIGN KEY ("credential_id") REFERENCES "public"."verifiable_credentials"("credential_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credential_presentations" ADD CONSTRAINT "credential_presentations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credential_revocations" ADD CONSTRAINT "credential_revocations_credential_id_verifiable_credentials_credential_id_fk" FOREIGN KEY ("credential_id") REFERENCES "public"."verifiable_credentials"("credential_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credential_revocations" ADD CONSTRAINT "credential_revocations_revoked_by_users_id_fk" FOREIGN KEY ("revoked_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deposit_inspections" ADD CONSTRAINT "deposit_inspections_inspector_id_users_id_fk" FOREIGN KEY ("inspector_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deposit_negotiation_messages" ADD CONSTRAINT "deposit_negotiation_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fpgw_batches" ADD CONSTRAINT "fpgw_batches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fpgw_batches" ADD CONSTRAINT "fpgw_batches_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "physical_deposit_requests" ADD CONSTRAINT "physical_deposit_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "physical_deposit_requests" ADD CONSTRAINT "physical_deposit_requests_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "physical_deposit_requests" ADD CONSTRAINT "physical_deposit_requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "physical_deposit_requests" ADD CONSTRAINT "physical_deposit_requests_received_by_users_id_fk" FOREIGN KEY ("received_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "physical_deposit_requests" ADD CONSTRAINT "physical_deposit_requests_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "physical_deposit_requests" ADD CONSTRAINT "physical_deposit_requests_physical_storage_certificate_id_certificates_id_fk" FOREIGN KEY ("physical_storage_certificate_id") REFERENCES "public"."certificates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "physical_deposit_requests" ADD CONSTRAINT "physical_deposit_requests_digital_ownership_certificate_id_certificates_id_fk" FOREIGN KEY ("digital_ownership_certificate_id") REFERENCES "public"."certificates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "physical_deposit_requests" ADD CONSTRAINT "physical_deposit_requests_wallet_transaction_id_transactions_id_fk" FOREIGN KEY ("wallet_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "physical_storage_certificates" ADD CONSTRAINT "physical_storage_certificates_vault_location_id_third_party_vault_locations_id_fk" FOREIGN KEY ("vault_location_id") REFERENCES "public"."third_party_vault_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "physical_storage_certificates" ADD CONSTRAINT "physical_storage_certificates_linked_vault_certificate_id_certificates_id_fk" FOREIGN KEY ("linked_vault_certificate_id") REFERENCES "public"."certificates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "physical_storage_certificates" ADD CONSTRAINT "physical_storage_certificates_linked_by_users_id_fk" FOREIGN KEY ("linked_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "physical_storage_certificates" ADD CONSTRAINT "physical_storage_certificates_voided_by_users_id_fk" FOREIGN KEY ("voided_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reconciliation_alerts" ADD CONSTRAINT "reconciliation_alerts_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unified_tally_events" ADD CONSTRAINT "unified_tally_events_tally_id_unified_tally_transactions_id_fk" FOREIGN KEY ("tally_id") REFERENCES "public"."unified_tally_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unified_tally_events" ADD CONSTRAINT "unified_tally_events_triggered_by_users_id_fk" FOREIGN KEY ("triggered_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unified_tally_transactions" ADD CONSTRAINT "unified_tally_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unified_tally_transactions" ADD CONSTRAINT "unified_tally_transactions_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unified_tally_transactions" ADD CONSTRAINT "unified_tally_transactions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vault_country_routing_rules" ADD CONSTRAINT "vault_country_routing_rules_primary_vault_id_third_party_vault_locations_id_fk" FOREIGN KEY ("primary_vault_id") REFERENCES "public"."third_party_vault_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vault_country_routing_rules" ADD CONSTRAINT "vault_country_routing_rules_fallback_vault_id_third_party_vault_locations_id_fk" FOREIGN KEY ("fallback_vault_id") REFERENCES "public"."third_party_vault_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vault_reconciliation_runs" ADD CONSTRAINT "vault_reconciliation_runs_run_by_users_id_fk" FOREIGN KEY ("run_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verifiable_credentials" ADD CONSTRAINT "verifiable_credentials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_conversions" ADD CONSTRAINT "wallet_conversions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_conversions" ADD CONSTRAINT "wallet_conversions_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_conversions" ADD CONSTRAINT "wallet_conversions_fpgw_batch_id_fpgw_batches_id_fk" FOREIGN KEY ("fpgw_batch_id") REFERENCES "public"."fpgw_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wingold_allocations" ADD CONSTRAINT "wingold_allocations_tally_id_unified_tally_transactions_id_fk" FOREIGN KEY ("tally_id") REFERENCES "public"."unified_tally_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wingold_allocations" ADD CONSTRAINT "wingold_allocations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wingold_bar_lots" ADD CONSTRAINT "wingold_bar_lots_order_id_wingold_purchase_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."wingold_purchase_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wingold_bar_lots" ADD CONSTRAINT "wingold_bar_lots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wingold_bar_lots" ADD CONSTRAINT "wingold_bar_lots_vault_holding_id_vault_holdings_id_fk" FOREIGN KEY ("vault_holding_id") REFERENCES "public"."vault_holdings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wingold_bars" ADD CONSTRAINT "wingold_bars_allocation_id_wingold_allocations_id_fk" FOREIGN KEY ("allocation_id") REFERENCES "public"."wingold_allocations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wingold_bars" ADD CONSTRAINT "wingold_bars_tally_id_unified_tally_transactions_id_fk" FOREIGN KEY ("tally_id") REFERENCES "public"."unified_tally_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wingold_certificates" ADD CONSTRAINT "wingold_certificates_order_id_wingold_purchase_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."wingold_purchase_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wingold_certificates" ADD CONSTRAINT "wingold_certificates_bar_lot_id_wingold_bar_lots_id_fk" FOREIGN KEY ("bar_lot_id") REFERENCES "public"."wingold_bar_lots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wingold_certificates" ADD CONSTRAINT "wingold_certificates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wingold_purchase_orders" ADD CONSTRAINT "wingold_purchase_orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_audit_logs" ADD CONSTRAINT "workflow_audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_audit_logs" ADD CONSTRAINT "workflow_audit_logs_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_audit_summaries" ADD CONSTRAINT "workflow_audit_summaries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
DROP TYPE "public"."settlement_status";--> statement-breakpoint
DROP TYPE "public"."settlement_type";