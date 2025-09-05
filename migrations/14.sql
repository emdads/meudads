
-- Adicionar permissões para seleções se ainda não existirem
INSERT OR IGNORE INTO permissions (id, name, description, module, action, is_system, created_at, updated_at)
VALUES 
('perm_selections_view', 'selections.view', 'Visualizar seleções de anúncios', 'selections', 'view', 1, datetime('now'), datetime('now')),
('perm_selections_create', 'selections.create', 'Criar seleções de anúncios', 'selections', 'create', 1, datetime('now'), datetime('now')),
('perm_selections_delete', 'selections.delete', 'Excluir seleções de anúncios', 'selections', 'delete', 1, datetime('now'), datetime('now')),
('perm_selections_manage', 'selections.manage', 'Gerenciar todas as seleções de anúncios', 'selections', 'manage', 1, datetime('now'), datetime('now'));

-- Associar permissões de seleções ao role Super Admin
INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id, created_at)
VALUES 
('rp_super_admin_selections_view', 'role_super_admin', 'perm_selections_view', datetime('now')),
('rp_super_admin_selections_create', 'role_super_admin', 'perm_selections_create', datetime('now')),
('rp_super_admin_selections_delete', 'role_super_admin', 'perm_selections_delete', datetime('now')),
('rp_super_admin_selections_manage', 'role_super_admin', 'perm_selections_manage', datetime('now'));
