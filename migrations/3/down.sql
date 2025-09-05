
-- Remove user tracking from selections table
ALTER TABLE selections DROP COLUMN user_id;
ALTER TABLE selections DROP COLUMN user_email;
ALTER TABLE selections DROP COLUMN user_name;

-- Drop admin table
DROP TABLE admins;

-- Drop client users table
DROP TABLE client_users;
