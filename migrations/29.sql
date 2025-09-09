
-- Create user permission restrictions table
CREATE TABLE user_permission_restrictions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  permission_name TEXT NOT NULL,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  allowed BOOLEAN NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_user_permission_restrictions_user_id ON user_permission_restrictions (user_id);
CREATE INDEX idx_user_permission_restrictions_permission ON user_permission_restrictions (permission_name);
CREATE INDEX idx_user_permission_restrictions_type ON user_permission_restrictions (type);

-- Insert basic system roles if they don't exist
INSERT OR IGNORE INTO roles (id, name, description, is_system, is_active) VALUES
('role_super_admin', 'Super Admin', 'Administrador com acesso total ao sistema', 1, 1),
('role_admin', 'Administrador', 'Administrador com permissões de gestão', 1, 1),
('role_client', 'Cliente', 'Cliente com acesso aos próprios dados', 1, 1),
('role_user', 'Usuário', 'Usuário básico do sistema', 1, 1);

-- Insert basic permissions if they don't exist
INSERT OR IGNORE INTO permissions (id, name, description, module, action, is_system) VALUES
('perm_dashboard_view', 'dashboard.view', 'Visualizar dashboard', 'dashboard', 'view', 1),
('perm_dashboard_stats', 'dashboard.stats', 'Ver estatísticas do dashboard', 'dashboard', 'stats', 1),
('perm_clients_view', 'clients.view', 'Visualizar clientes', 'clients', 'view', 1),
('perm_clients_create', 'clients.create', 'Criar novos clientes', 'clients', 'create', 1),
('perm_clients_edit', 'clients.edit', 'Editar dados dos clientes', 'clients', 'edit', 1),
('perm_clients_delete', 'clients.delete', 'Excluir clientes', 'clients', 'delete', 1),
('perm_clients_manage', 'clients.manage', 'Gerenciar clientes (todas as operações)', 'clients', 'manage', 1),
('perm_clients_sync', 'clients.sync', 'Sincronizar dados dos clientes', 'clients', 'sync', 1),
('perm_users_view', 'users.view', 'Visualizar usuários', 'users', 'view', 1),
('perm_users_create', 'users.create', 'Criar novos usuários', 'users', 'create', 1),
('perm_users_edit', 'users.edit', 'Editar dados dos usuários', 'users', 'edit', 1),
('perm_users_delete', 'users.delete', 'Excluir usuários', 'users', 'delete', 1),
('perm_users_manage', 'users.manage', 'Gerenciar usuários (todas as operações)', 'users', 'manage', 1),
('perm_ads_view', 'ads.view', 'Visualizar anúncios', 'ads', 'view', 1),
('perm_ads_metrics', 'ads.metrics', 'Ver métricas dos anúncios', 'ads', 'metrics', 1),
('perm_ads_pause', 'ads.pause', 'Pausar anúncios', 'ads', 'pause', 1),
('perm_ads_reactivate', 'ads.reactivate', 'Reativar anúncios', 'ads', 'reactivate', 1),
('perm_selections_view', 'selections.view', 'Visualizar seleções', 'selections', 'view', 1),
('perm_selections_create', 'selections.create', 'Criar seleções', 'selections', 'create', 1),
('perm_selections_delete', 'selections.delete', 'Excluir seleções', 'selections', 'delete', 1),
('perm_selections_manage', 'selections.manage', 'Gerenciar todas as seleções', 'selections', 'manage', 1),
('perm_permissions_manage', 'permissions.manage', 'Gerenciar permissões de usuários', 'permissions', 'manage', 1),
('perm_system_setup', 'system.setup', 'Configurar sistema (super admin)', 'system', 'setup', 1);

-- Assign all permissions to Super Admin role
INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id)
SELECT 
  'rp_super_admin_' || REPLACE(p.id, 'perm_', '') as id,
  'role_super_admin' as role_id,
  p.id as permission_id
FROM permissions p 
WHERE p.is_system = 1;

-- Assign basic permissions to Admin role
INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id)
SELECT 
  'rp_admin_' || REPLACE(p.id, 'perm_', '') as id,
  'role_admin' as role_id,
  p.id as permission_id
FROM permissions p 
WHERE p.name IN (
  'dashboard.view', 'dashboard.stats', 'clients.view', 'clients.edit', 'clients.sync',
  'users.view', 'users.create', 'users.edit', 'ads.view', 'ads.metrics', 'ads.pause', 'ads.reactivate',
  'selections.view', 'selections.create', 'selections.manage'
);

-- Assign all existing admin users to Super Admin role
INSERT OR IGNORE INTO user_roles (id, user_id, role_id, assigned_by, assigned_at, is_active)
SELECT 
  'ur_' || u.id || '_super_admin' as id,
  u.id as user_id,
  'role_super_admin' as role_id,
  u.id as assigned_by,
  datetime('now') as assigned_at,
  1 as is_active
FROM users u 
WHERE u.user_type = 'admin' AND u.is_active = 1;
