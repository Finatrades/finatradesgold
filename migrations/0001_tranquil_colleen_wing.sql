CREATE TYPE "public"."exchange_rate_history_update_frequency" AS ENUM('realtime', 'hourly', 'daily');--> statement-breakpoint
CREATE TYPE "public"."supported_currency_code" AS ENUM('USD', 'EUR', 'GBP', 'AED', 'CHF', 'SAR', 'KWD', 'BHD', 'QAR', 'OMR');--> statement-breakpoint
CREATE TABLE "currency_conversion_logs" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255),
	"transaction_id" varchar(255),
	"from_currency" varchar(10) NOT NULL,
	"to_currency" varchar(10) NOT NULL,
	"from_amount" numeric(18, 8) NOT NULL,
	"to_amount" numeric(18, 8) NOT NULL,
	"exchange_rate_used" numeric(18, 8) NOT NULL,
	"exchange_rate_id" varchar(255),
	"conversion_type" varchar(50) DEFAULT 'transaction' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exchange_rate_history" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"base_currency" varchar(10) DEFAULT 'USD' NOT NULL,
	"quote_currency" varchar(10) NOT NULL,
	"open_rate" numeric(18, 8) NOT NULL,
	"close_rate" numeric(18, 8) NOT NULL,
	"high_rate" numeric(18, 8) NOT NULL,
	"low_rate" numeric(18, 8) NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"provider" varchar(50) DEFAULT 'internal' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exchange_rates" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"base_currency" varchar(10) DEFAULT 'USD' NOT NULL,
	"quote_currency" varchar(10) NOT NULL,
	"rate" numeric(18, 8) NOT NULL,
	"inverse_rate" numeric(18, 8) NOT NULL,
	"provider" varchar(50) DEFAULT 'internal' NOT NULL,
	"valid_from" timestamp DEFAULT now() NOT NULL,
	"valid_until" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supported_currencies" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(10) NOT NULL,
	"name" varchar(100) NOT NULL,
	"symbol" varchar(10) NOT NULL,
	"symbol_position" varchar(10) DEFAULT 'before' NOT NULL,
	"decimal_places" integer DEFAULT 2 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "supported_currencies_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "amount_gbp" numeric(18, 2);--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "amount_aed" numeric(18, 2);--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "primary_currency" varchar(10) DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "primary_amount" numeric(18, 2);--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "exchange_rate_to_usd" numeric(18, 8);--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "exchange_rate_id" varchar(255);--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "gold_price_in_primary_currency" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "wallets" ADD COLUMN "gbp_balance" numeric(18, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "wallets" ADD COLUMN "aed_balance" numeric(18, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "wallets" ADD COLUMN "chf_balance" numeric(18, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "wallets" ADD COLUMN "sar_balance" numeric(18, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "currency_conversion_logs" ADD CONSTRAINT "currency_conversion_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "currency_conversion_logs" ADD CONSTRAINT "currency_conversion_logs_exchange_rate_id_exchange_rates_id_fk" FOREIGN KEY ("exchange_rate_id") REFERENCES "public"."exchange_rates"("id") ON DELETE no action ON UPDATE no action;