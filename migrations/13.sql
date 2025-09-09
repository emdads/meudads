-- Add setup permission if it doesn't exist
INSERT OR IGNORE INTO permissions (id, name, description, module, action, is_system, created_at, updated_at)
VALUES ('perm_setup', 'system.setup', 'Acesso às configurações do sistema', 'system', 'setup', 1, datetime('now'), datetime('now'));

-- Grant setup permission to super admin role
INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id, created_at)
VALUES ('rp_super_admin_setup', 'role_super_admin', 'perm_setup', datetime('now'));