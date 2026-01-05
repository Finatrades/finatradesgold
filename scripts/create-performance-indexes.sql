-- Performance indexes for optimized pagination queries
-- Run this script after database setup or migration to ensure indexes exist

-- Admin-facing indexes (created earlier)
CREATE INDEX IF NOT EXISTS transactions_created_at_idx ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS transactions_status_idx ON transactions(status);
CREATE INDEX IF NOT EXISTS transactions_user_id_idx ON transactions(user_id);
CREATE INDEX IF NOT EXISTS transactions_reference_idx ON transactions(reference_id);

CREATE INDEX IF NOT EXISTS vault_deposit_status_created_idx ON vault_deposit_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS vault_deposit_user_id_idx ON vault_deposit_requests(user_id);

CREATE INDEX IF NOT EXISTS vault_withdrawal_status_created_idx ON vault_withdrawal_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS vault_withdrawal_user_id_idx ON vault_withdrawal_requests(user_id);

CREATE INDEX IF NOT EXISTS trade_cases_status_created_idx ON trade_cases(status, created_at DESC);
CREATE INDEX IF NOT EXISTS trade_cases_user_id_idx ON trade_cases(user_id);

CREATE INDEX IF NOT EXISTS chat_sessions_status_idx ON chat_sessions(status);
CREATE INDEX IF NOT EXISTS chat_sessions_last_message_idx ON chat_sessions(last_message_at DESC);

CREATE INDEX IF NOT EXISTS chat_messages_session_created_idx ON chat_messages(session_id, created_at);

CREATE INDEX IF NOT EXISTS audit_logs_timestamp_idx ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS audit_logs_entity_type_idx ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS audit_logs_actor_idx ON audit_logs(actor);

-- User-facing indexes
CREATE INDEX IF NOT EXISTS transactions_user_created_idx ON transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS bnsl_plans_user_created_idx ON bnsl_plans(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS bnsl_plans_user_status_idx ON bnsl_plans(user_id, status);
CREATE INDEX IF NOT EXISTS peer_transfers_sender_created_idx ON peer_transfers(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS peer_transfers_recipient_created_idx ON peer_transfers(recipient_id, created_at DESC);

-- KYC indexes
CREATE INDEX IF NOT EXISTS kyc_submissions_status_idx ON kyc_submissions(status);
CREATE INDEX IF NOT EXISTS kyc_submissions_created_at_idx ON kyc_submissions(created_at DESC);
