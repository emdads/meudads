
-- Remove todas as novas tabelas na ordem correta para evitar conflitos de FK
DROP TABLE IF EXISTS user_sessions;
DROP TABLE IF EXISTS user_client_access;
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS users;
