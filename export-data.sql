-- Script para exportar dados do D1 (SQLite) atual
-- Execute este script no seu banco D1 para gerar os dados para migração

-- Exportar clientes
.headers on
.mode csv
.output clients_export.csv
SELECT * FROM clients;

-- Exportar usuários
.output users_export.csv
SELECT * FROM users;

-- Exportar roles
.output roles_export.csv
SELECT * FROM roles;

-- Exportar permissões
.output permissions_export.csv
SELECT * FROM permissions;

-- Exportar campanhas
.output campaigns_export.csv
SELECT * FROM campaigns;

-- Exportar anúncios ativos
.output ads_active_raw_export.csv
SELECT * FROM ads_active_raw;

-- Exportar seleções
.output selections_export.csv
SELECT * FROM selections;

-- Exportar contas de anúncios
.output ad_accounts_export.csv
SELECT * FROM ad_accounts;

-- Exportar relações user_roles
.output user_roles_export.csv
SELECT * FROM user_roles;

-- Exportar relações role_permissions
.output role_permissions_export.csv
SELECT * FROM role_permissions;

-- Exportar user_client_access
.output user_client_access_export.csv
SELECT * FROM user_client_access;

-- Exportar selection_ad_reasons
.output selection_ad_reasons_export.csv
SELECT * FROM selection_ad_reasons;

-- Exportar admins
.output admins_export.csv
SELECT * FROM admins;

-- Exportar client_users
.output client_users_export.csv
SELECT * FROM client_users;

-- Exportar user_sessions
.output user_sessions_export.csv
SELECT * FROM user_sessions;

-- Exportar user_permission_restrictions
.output user_permission_restrictions_export.csv
SELECT * FROM user_permission_restrictions;

.output stdout
