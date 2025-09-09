
-- Insert system roles
INSERT OR IGNORE INTO roles (id, name, description, is_system, is_active) VALUES
('role_super_admin', 'Super Admin', 'Acesso total ao sistema', 1, 1),
('role_admin', 'Administrador', 'Acesso administrativo', 1, 1),
('role_user', 'Usuário', 'Usuário padrão', 1, 1);

-- Insert system permissions
INSERT OR IGNORE INTO permissions (id, name, description, module, action) VALUES
('perm_dashboard_stats', 'dashboard.stats', 'Visualizar estatísticas do dashboard', 'dashboard', 'view'),
('perm_clients_view', 'clients.view', 'Visualizar clientes', 'clients', 'view'),
('perm_clients_create', 'clients.create', 'Criar clientes', 'clients', 'create'),
('perm_clients_edit', 'clients.edit', 'Editar clientes', 'clients', 'edit'),
('perm_clients_delete', 'clients.delete', 'Excluir clientes', 'clients', 'delete'),
('perm_clients_manage', 'clients.manage', 'Gerenciar clientes', 'clients', 'manage'),
('perm_clients_sync', 'clients.sync', 'Sincronizar dados dos clientes', 'clients', 'sync'),
('perm_ads_view', 'ads.view', 'Visualizar anúncios', 'ads', 'view'),
('perm_ads_pause', 'ads.pause', 'Pausar/reativar anúncios', 'ads', 'pause'),
('perm_ads_metrics', 'ads.metrics', 'Visualizar métricas de anúncios', 'ads', 'metrics'),
('perm_selections_view', 'selections.view', 'Visualizar seleções', 'selections', 'view'),
('perm_selections_create', 'selections.create', 'Criar seleções', 'selections', 'create'),
('perm_selections_delete', 'selections.delete', 'Excluir seleções', 'selections', 'delete'),
('perm_selections_manage', 'selections.manage', 'Gerenciar seleções', 'selections', 'manage'),
('perm_users_view', 'users.view', 'Visualizar usuários', 'users', 'view'),
('perm_users_create', 'users.create', 'Criar usuários', 'users', 'create'),
('perm_users_edit', 'users.edit', 'Editar usuários', 'users', 'edit'),
('perm_users_delete', 'users.delete', 'Excluir usuários', 'users', 'delete'),
('perm_users_manage', 'users.manage', 'Gerenciar usuários', 'users', 'manage'),
('perm_system_setup', 'system.setup', 'Configurações do sistema', 'system', 'setup');

-- Assign permissions to Super Admin role
INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id)
SELECT 
  'rp_super_admin_' || LOWER(REPLACE(p.name, '.', '_')) as id,
  'role_super_admin' as role_id,
  p.id as permission_id
FROM permissions p;

-- Assign basic permissions to Admin role
INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id)
SELECT 
  'rp_admin_' || LOWER(REPLACE(p.name, '.', '_')) as id,
  'role_admin' as role_id,
  p.id as permission_id
FROM permissions p 
WHERE p.name IN (
  'dashboard.stats', 'clients.view', 'clients.edit', 'clients.sync',
  'ads.view', 'ads.pause', 'ads.metrics',
  'selections.view', 'selections.create', 'selections.delete', 'selections.manage',
  'users.view', 'users.create', 'users.edit'
);

-- Assign basic permissions to User role
INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id)
SELECT 
  'rp_user_' || LOWER(REPLACE(p.name, '.', '_')) as id,
  'role_user' as role_id,
  p.id as permission_id
FROM permissions p 
WHERE p.name IN (
  'ads.view', 'ads.metrics', 'selections.view', 'selections.create'
);
