
-- Ensure basic permissions exist for system initialization
INSERT OR IGNORE INTO permissions (id, name, description, module, action, is_system, created_at, updated_at)
VALUES 
  ('perm_dashboard_view', 'dashboard.view', 'Visualizar dashboard', 'dashboard', 'view', 1, datetime('now'), datetime('now')),
  ('perm_clients_view', 'clients.view', 'Visualizar clientes', 'clients', 'view', 1, datetime('now'), datetime('now')),
  ('perm_clients_create', 'clients.create', 'Criar clientes', 'clients', 'create', 1, datetime('now'), datetime('now')),
  ('perm_clients_edit', 'clients.edit', 'Editar clientes', 'clients', 'edit', 1, datetime('now'), datetime('now')),
  ('perm_clients_delete', 'clients.delete', 'Excluir clientes', 'clients', 'delete', 1, datetime('now'), datetime('now')),
  ('perm_clients_sync', 'clients.sync', 'Sincronizar dados de clientes', 'clients', 'sync', 1, datetime('now'), datetime('now')),
  ('perm_clients_manage', 'clients.manage', 'Gerenciar clientes (todas as ações)', 'clients', 'manage', 1, datetime('now'), datetime('now')),
  ('perm_ads_view', 'ads.view', 'Visualizar anúncios', 'ads', 'view', 1, datetime('now'), datetime('now')),
  ('perm_ads_metrics', 'ads.metrics', 'Visualizar métricas de anúncios', 'ads', 'metrics', 1, datetime('now'), datetime('now')),
  ('perm_ads_pause', 'ads.pause', 'Pausar anúncios', 'ads', 'pause', 1, datetime('now'), datetime('now')),
  ('perm_selections_view', 'selections.view', 'Visualizar seleções', 'selections', 'view', 1, datetime('now'), datetime('now')),
  ('perm_selections_create', 'selections.create', 'Criar seleções', 'selections', 'create', 1, datetime('now'), datetime('now')),
  ('perm_selections_delete', 'selections.delete', 'Excluir seleções', 'selections', 'delete', 1, datetime('now'), datetime('now')),
  ('perm_selections_manage', 'selections.manage', 'Gerenciar seleções (todas as ações)', 'selections', 'manage', 1, datetime('now'), datetime('now')),
  ('perm_users_view', 'users.view', 'Visualizar usuários', 'users', 'view', 1, datetime('now'), datetime('now')),
  ('perm_users_create', 'users.create', 'Criar usuários', 'users', 'create', 1, datetime('now'), datetime('now')),
  ('perm_users_edit', 'users.edit', 'Editar usuários', 'users', 'edit', 1, datetime('now'), datetime('now')),
  ('perm_users_delete', 'users.delete', 'Excluir usuários', 'users', 'delete', 1, datetime('now'), datetime('now')),
  ('perm_dashboard_stats', 'dashboard.stats', 'Visualizar estatísticas do dashboard', 'dashboard', 'stats', 1, datetime('now'), datetime('now')),
  ('perm_system_setup', 'system.setup', 'Configuração do sistema', 'system', 'setup', 1, datetime('now'), datetime('now'));

-- Ensure system roles exist
INSERT OR IGNORE INTO roles (id, name, description, is_system, is_active, created_at, updated_at)
VALUES 
  ('role_super_admin', 'Super Admin', 'Acesso total ao sistema', 1, 1, datetime('now'), datetime('now')),
  ('role_admin', 'Administrador', 'Acesso administrativo ao sistema', 1, 1, datetime('now'), datetime('now')),
  ('role_client_user', 'Usuário Cliente', 'Acesso básico aos dados do cliente', 1, 1, datetime('now'), datetime('now'));

-- Assign ALL permissions to Super Admin role
INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id, created_at)
SELECT 
  'rp_super_admin_' || substr(p.id, -8),
  'role_super_admin',
  p.id,
  datetime('now')
FROM permissions p;

-- Assign basic permissions to Admin role
INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id, created_at)
SELECT 
  'rp_admin_' || substr(p.id, -8),
  'role_admin',
  p.id,
  datetime('now')
FROM permissions p
WHERE p.name IN (
  'dashboard.view', 'dashboard.stats',
  'clients.view', 'clients.create', 'clients.edit', 'clients.sync', 'clients.manage',
  'ads.view', 'ads.metrics', 'ads.pause',
  'selections.view', 'selections.create', 'selections.delete', 'selections.manage',
  'users.view', 'users.create', 'users.edit'
);

-- Assign basic permissions to Client User role
INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id, created_at)
SELECT 
  'rp_client_' || substr(p.id, -8),
  'role_client_user',
  p.id,
  datetime('now')
FROM permissions p
WHERE p.name IN (
  'dashboard.view',
  'ads.view', 'ads.metrics',
  'selections.view', 'selections.create', 'selections.delete'
);
