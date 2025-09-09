
DELETE FROM users WHERE email = 'admin@meudads.com.br';

INSERT INTO users (id, email, name, password_hash, user_type, is_active, created_at, updated_at)
VALUES ('user_super_admin', 'admin@meudads.com.br', 'Super Admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'admin', 1, datetime('now'), datetime('now'));
