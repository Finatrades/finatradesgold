-- Migration 0007: KYC drafts server-side persistence and OCR mismatch fields
-- Applied: Task #42 KYC bug fixes & hardening

-- Server-side KYC draft persistence table (keyed by userId + submissionType)
CREATE TABLE IF NOT EXISTS "kyc_drafts" (
    "id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" varchar(255) NOT NULL REFERENCES "users"("id"),
    "submission_type" varchar(50) NOT NULL DEFAULT 'personal',
    "draft_data" jsonb DEFAULT '{}',
    "saved_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "kyc_drafts_user_submission_uniq" UNIQUE ("user_id", "submission_type")
);

-- OCR mismatch flag: populated async after personal KYC submission via GPT-4o vision
ALTER TABLE "finatrades_personal_kyc"
    ADD COLUMN IF NOT EXISTS "ocr_mismatch_flag" jsonb,
    ADD COLUMN IF NOT EXISTS "risk_score" integer DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "change_requested_sections" jsonb;
