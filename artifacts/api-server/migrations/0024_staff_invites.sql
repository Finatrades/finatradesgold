-- Task #175: Staff & Role Management UI
--
-- Adds staff_invites table for the "Invite Staff" flow: an admin invites
-- a new staff member by email + role(s); the invitee receives a one-time
-- token link that lets them set a password and activate the account.
--
-- Token is stored as SHA-256 hash (token_hash); raw token only ever lives
-- in the email link.

CREATE TABLE IF NOT EXISTS staff_invites (
  id varchar(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email varchar(255) NOT NULL,
  first_name varchar(255),
  last_name varchar(255),
  role_ids text[] NOT NULL DEFAULT '{}',
  invited_by varchar(255) NOT NULL,
  token_hash varchar(128) NOT NULL UNIQUE,
  expires_at timestamp NOT NULL,
  accepted_at timestamp,
  revoked_at timestamp,
  accepted_user_id varchar(255),
  status varchar(32) NOT NULL DEFAULT 'pending',
  created_at timestamp NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_invites_email ON staff_invites (lower(email));
CREATE INDEX IF NOT EXISTS idx_staff_invites_status ON staff_invites (status);
CREATE INDEX IF NOT EXISTS idx_staff_invites_token_hash ON staff_invites (token_hash);

-- Flag used by the Staff & Role admin tool to suspend an account. The
-- existing /api/admin/users/:id/suspend route only flipped kycStatus, which
-- did not prevent the user from logging back in. The Staff tool uses this
-- column plus session destruction for a real suspension.
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_users_is_suspended ON users (is_suspended) WHERE is_suspended = true;
