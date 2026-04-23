-- Migration 0008: FinaBridge Phase 3 — Deal Manager Portal, MT700 Validation & Internal Notes
-- Applied: Task #47 FinaBridge Phase 3

-- MT700 validation result storage on deal room documents
ALTER TABLE "deal_room_documents"
    ADD COLUMN IF NOT EXISTS "mt700_validation_result" jsonb;

-- Admin-only internal notes per deal room
CREATE TABLE IF NOT EXISTS "deal_room_internal_notes" (
    "id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    "deal_room_id" varchar(255) NOT NULL REFERENCES "deal_rooms"("id"),
    "admin_user_id" varchar(255) NOT NULL REFERENCES "users"("id"),
    "note" text NOT NULL,
    "is_escalated" boolean NOT NULL DEFAULT false,
    "created_at" timestamp NOT NULL DEFAULT now()
);
