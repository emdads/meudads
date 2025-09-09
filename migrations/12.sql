-- Criar permissão dashboard.view se não existir
INSERT OR IGNORE INTO permissions (id, name, description, module, action, is_system, created_at, updated_at)
VALUES ('perm_dashboard_view', 'dashboard.view', 'Visualizar dashboard', 'dashboard', 'view', 1, datetime('now'), datetime('now'));

-- Criar permissão dashboard.stats se não existir  
INSERT OR IGNORE INTO permissions (id, name, description, module, action, is_system, created_at, updated_at)
VALUES ('perm_dashboard_stats', 'dashboard.stats', 'Visualizar estatísticas do dashboard', 'dashboard', 'stats', 1, datetime('now'), datetime('now'));

-- Garantir que super admin role existe
INSERT OR IGNORE INTO roles (id, name, description, is_system, is_active, created_at, updated_at)
VALUES ('role_super_admin', 'Super Admin', 'Super Administrador com acesso total', 1, 1, datetime('now'), datetime('now'));

-- Adicionar permissões dashboard ao role super admin
INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id, created_at)
VALUES ('rp_super_dashboard_view', 'role_super_admin', 'perm_dashboard_view', datetime('now'));

INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id, created_at)
VALUES ('rp_super_dashboard_stats', 'role_super_admin', 'perm_dashboard_stats', datetime('now'));

-- Garantir que o usuário admin tem o role super admin
INSERT OR IGNORE INTO user_roles (id, user_id, role_id, assigned_by, assigned_at, is_active)
SELECT 'ur_admin_super', u.id, 'role_super_admin', u.id, datetime('now'), 1
FROM users u WHERE u.email = 'admin@meudads.com.br';