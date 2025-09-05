
-- Add user tracking to selections table
ALTER TABLE selections ADD COLUMN user_id TEXT;
ALTER TABLE selections ADD COLUMN user_email TEXT;
ALTER TABLE selections ADD COLUMN user_name TEXT;

-- Add admin table to manage system admins
CREATE TABLE admins (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add client users table to manage client access
CREATE TABLE client_users (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  client_id TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
