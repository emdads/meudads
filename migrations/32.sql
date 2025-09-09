
-- Add password_reset_required column to users table
ALTER TABLE users ADD COLUMN password_reset_required BOOLEAN DEFAULT FALSE;
