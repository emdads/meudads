
-- Adicionar coluna password_reset_required na tabela users
ALTER TABLE users ADD COLUMN password_reset_required BOOLEAN DEFAULT FALSE;
