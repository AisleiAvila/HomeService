-- Migration: Add password reset fields to users table
-- Date: 2025-12-08
-- Description: Adds reset_token and reset_token_expiry columns to support custom password reset flow

-- Add reset_token column (6-digit code)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS reset_token VARCHAR(6);

-- Add reset_token_expiry column (timestamp)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMPTZ;

-- Add index for faster lookups on reset operations
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token) 
WHERE reset_token IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN users.reset_token IS 'Temporary 6-digit code for password reset, valid for 15 minutes';
COMMENT ON COLUMN users.reset_token_expiry IS 'Expiration timestamp for reset_token';
