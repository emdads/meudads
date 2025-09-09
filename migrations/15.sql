
ALTER TABLE clients ADD COLUMN email TEXT;
ALTER TABLE clients ADD COLUMN temporary_password TEXT;
ALTER TABLE clients ADD COLUMN password_reset_required BOOLEAN DEFAULT FALSE;
