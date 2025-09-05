
-- Create user permission restrictions table
CREATE TABLE IF NOT EXISTS user_permission_restrictions (
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_permission_restrictions_user_id ON user_permission_restrictions (user_id);
CREATE INDEX IF NOT EXISTS idx_user_permission_restrictions_permission ON user_permission_restrictions (permission_name);

-- Insert basic system roles if they don't exist
INSERT OR IGNORE INTO roles (id, name, description, is_system, is_active) VALUES 
('role_super_admin', 'Super Admin', 'Acesso total ao sistema', 1, 1),
('role_admin', 'Administrador', 'Administrador do sistema', 1, 1),
('role_client', 'Cliente', 'Usuário cliente com acesso limitado', 1, 1),
('role_user', 'Usuário', 'Usuário básico do sistema', 1, 1);

-- Insert basic system permissions if they don't exist
INSERT OR IGNORE INTO permissions (id, name, description, module, action, is_system) VALUES 
('perm_system_setup', 'system.setup', 'Configurar sistema', 'system', 'setup', 1),
('perm_dashboard_view', 'dashboard.view', 'Ver dashboard', 'dashboard', 'view', 1),
('perm_dashboard_stats', 'dashboard.stats', 'Ver estatísticas do dashboard', 'dashboard', 'stats', 1),
('perm_clients_view', 'clients.view', 'Ver clientes', 'clients', 'view', 1),
('perm_clients_create', 'clients.create', 'Criar clientes', 'clients', 'create', 1),
('perm_clients_edit', 'clients.edit', 'Editar clientes', 'clients', 'edit', 1),
('perm_clients_delete', 'clients.delete', 'Excluir clientes', 'clients', 'delete', 1),
('perm_clients_manage', 'clients.manage', 'Gerenciar clientes', 'clients', 'manage', 1),
('perm_clients_sync', 'clients.sync', 'Sincronizar dados dos clientes', 'clients', 'sync', 1),
('perm_users_view', 'users.view', 'Ver usuários', 'users', 'view', 1),
('perm_users_create', 'users.create', 'Criar usuários', 'users', 'create', 1),
('perm_users_edit', 'users.edit', 'Editar usuários', 'users', 'edit', 1),
('perm_users_delete', 'users.delete', 'Excluir usuários', 'users', 'delete', 1),
('perm_users_manage', 'users.manage', 'Gerenciar usuários e permissões', 'users', 'manage', 1),
('perm_ads_view', 'ads.view', 'Ver anúncios', 'ads', 'view', 1),
('perm_ads_metrics', 'ads.metrics', 'Ver métricas dos anúncios', 'ads', 'metrics', 1),
('perm_ads_pause', 'ads.pause', 'Pausar/reativar anúncios', 'ads', 'pause', 1),
('perm_selections_view', 'selections.view', 'Ver seleções', 'selections', 'view', 1),
('perm_selections_create', 'selections.create', 'Criar seleções', 'selections', 'create', 1),
('perm_selections_delete', 'selections.delete', 'Excluir seleções', 'selections', 'delete', 1),
('perm_selections_manage', 'selections.manage', 'Gerenciar seleções', 'selections', 'manage', 1);

-- Assign permissions to Super Admin role
INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id) 
SELECT 
  'rp_' || p.id || '_super_admin',
  'role_super_admin',
  p.id
FROM permissions p;

-- Assign admin permissions to Admin role
INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id) 
SELECT 
  'rp_' || p.id || '_admin',
  'role_admin',
  p.id
FROM permissions p
WHERE p.name NOT IN ('system.setup');

-- Assign basic permissions to Client role
INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id) 
SELECT 
  'rp_' || p.id || '_client',
  'role_client',
  p.id
FROM permissions p
WHERE p.name IN ('dashboard.view', 'ads.view', 'ads.metrics', 'selections.view', 'selections.create');

-- Assign basic permissions to User role
INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id) 
SELECT 
  'rp_' || p.id || '_user',
  'role_user',
  p.id
FROM permissions p
WHERE p.name IN ('dashboard.view', 'ads.view', 'selections.view');

-- Assign Super Admin role to existing admin users
INSERT OR IGNORE INTO user_roles (id, user_id, role_id, assigned_by, assigned_at, is_active)
SELECT 
  'ur_' || u.id || '_super_admin',
  u.id,
  'role_super_admin',
  u.id,
  datetime('now'),
  1
FROM users u 
WHERE u.user_type = 'admin' 
AND NOT EXISTS (
  SELECT 1 FROM user_roles ur 
  WHERE ur.user_id = u.id AND ur.role_id = 'role_super_admin'
);
