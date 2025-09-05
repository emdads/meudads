
-- Seed basic system roles and permissions
INSERT OR IGNORE INTO roles (id, name, description, is_system, is_active, created_at, updated_at) VALUES
('role_super_admin', 'Super Admin', 'Acesso total ao sistema, incluindo configurações avançadas', 1, 1, datetime('now'), datetime('now')),
('role_admin', 'Administrador', 'Acesso administrativo completo, exceto configurações do sistema', 1, 1, datetime('now'), datetime('now')),
('role_manager', 'Gerente', 'Gestão operacional de campanhas e anúncios', 1, 1, datetime('now'), datetime('now')),
('role_client_manager', 'Gerente de Cliente', 'Acesso específico a clientes designados', 1, 1, datetime('now'), datetime('now')),
('role_user', 'Usuário', 'Acesso básico somente leitura', 1, 1, datetime('now'), datetime('now'));

-- System permissions
INSERT OR IGNORE INTO permissions (id, name, description, module, action, is_system, created_at, updated_at) VALUES
-- System setup
('perm_system_setup', 'system.setup', 'Configurar o sistema', 'system', 'setup', 1, datetime('now'), datetime('now')),

-- Dashboard
('perm_dashboard_view', 'dashboard.view', 'Visualizar dashboard', 'dashboard', 'view', 1, datetime('now'), datetime('now')),
('perm_dashboard_stats', 'dashboard.stats', 'Ver estatísticas do dashboard', 'dashboard', 'stats', 1, datetime('now'), datetime('now')),

-- Users management
('perm_users_view', 'users.view', 'Visualizar usuários', 'users', 'view', 1, datetime('now'), datetime('now')),
('perm_users_create', 'users.create', 'Criar usuários', 'users', 'create', 1, datetime('now'), datetime('now')),
('perm_users_edit', 'users.edit', 'Editar usuários', 'users', 'edit', 1, datetime('now'), datetime('now')),
('perm_users_delete', 'users.delete', 'Excluir usuários', 'users', 'delete', 1, datetime('now'), datetime('now')),
('perm_users_manage', 'users.manage', 'Gerenciar todos os usuários', 'users', 'manage', 1, datetime('now'), datetime('now')),

-- Clients management
('perm_clients_view', 'clients.view', 'Visualizar clientes', 'clients', 'view', 1, datetime('now'), datetime('now')),
('perm_clients_create', 'clients.create', 'Criar clientes', 'clients', 'create', 1, datetime('now'), datetime('now')),
('perm_clients_edit', 'clients.edit', 'Editar clientes', 'clients', 'edit', 1, datetime('now'), datetime('now')),
('perm_clients_delete', 'clients.delete', 'Excluir clientes', 'clients', 'delete', 1, datetime('now'), datetime('now')),
('perm_clients_sync', 'clients.sync', 'Sincronizar dados do Meta', 'clients', 'sync', 1, datetime('now'), datetime('now')),

-- Ads management
('perm_ads_view', 'ads.view', 'Visualizar anúncios', 'ads', 'view', 1, datetime('now'), datetime('now')),
('perm_ads_metrics', 'ads.metrics', 'Ver métricas de anúncios', 'ads', 'metrics', 1, datetime('now'), datetime('now')),
('perm_ads_pause', 'ads.pause', 'Pausar anúncios', 'ads', 'pause', 1, datetime('now'), datetime('now')),

-- Selections management
('perm_selections_view', 'selections.view', 'Visualizar seleções', 'selections', 'view', 1, datetime('now'), datetime('now')),
('perm_selections_create', 'selections.create', 'Criar seleções', 'selections', 'create', 1, datetime('now'), datetime('now')),
('perm_selections_edit', 'selections.edit', 'Editar seleções', 'selections', 'edit', 1, datetime('now'), datetime('now')),
('perm_selections_delete', 'selections.delete', 'Excluir seleções', 'selections', 'delete', 1, datetime('now'), datetime('now')),
('perm_selections_manage', 'selections.manage', 'Gerenciar todas as seleções', 'selections', 'manage', 1, datetime('now'), datetime('now'));

-- Assign permissions to roles
-- Super Admin: ALL permissions
INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id, created_at) 
SELECT 
  'rp_super_' || substr(id, 6),
  'role_super_admin',
  id,
  datetime('now')
FROM permissions;

-- Admin: All except system setup
INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id, created_at) 
SELECT 
  'rp_admin_' || substr(id, 6),
  'role_admin',
  id,
  datetime('now')
FROM permissions 
WHERE name != 'system.setup';

-- Manager: Operational permissions
INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id, created_at) VALUES
('rp_mgr_dashboard_view', 'role_manager', 'perm_dashboard_view', datetime('now')),
('rp_mgr_dashboard_stats', 'role_manager', 'perm_dashboard_stats', datetime('now')),
('rp_mgr_clients_view', 'role_manager', 'perm_clients_view', datetime('now')),
('rp_mgr_clients_sync', 'role_manager', 'perm_clients_sync', datetime('now')),
('rp_mgr_ads_view', 'role_manager', 'perm_ads_view', datetime('now')),
('rp_mgr_ads_metrics', 'role_manager', 'perm_ads_metrics', datetime('now')),
('rp_mgr_ads_pause', 'role_manager', 'perm_ads_pause', datetime('now')),
('rp_mgr_selections_view', 'role_manager', 'perm_selections_view', datetime('now')),
('rp_mgr_selections_create', 'role_manager', 'perm_selections_create', datetime('now')),
('rp_mgr_selections_edit', 'role_manager', 'perm_selections_edit', datetime('now')),
('rp_mgr_selections_delete', 'role_manager', 'perm_selections_delete', datetime('now'));

-- Client Manager: Basic client-specific permissions
INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id, created_at) VALUES
('rp_cmgr_dashboard_view', 'role_client_manager', 'perm_dashboard_view', datetime('now')),
('rp_cmgr_clients_view', 'role_client_manager', 'perm_clients_view', datetime('now')),
('rp_cmgr_ads_view', 'role_client_manager', 'perm_ads_view', datetime('now')),
('rp_cmgr_ads_metrics', 'role_client_manager', 'perm_ads_metrics', datetime('now')),
('rp_cmgr_selections_view', 'role_client_manager', 'perm_selections_view', datetime('now')),
('rp_cmgr_selections_create', 'role_client_manager', 'perm_selections_create', datetime('now'));

-- User: Read-only permissions
INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id, created_at) VALUES
('rp_user_dashboard_view', 'role_user', 'perm_dashboard_view', datetime('now')),
('rp_user_clients_view', 'role_user', 'perm_clients_view', datetime('now')),
('rp_user_ads_view', 'role_user', 'perm_ads_view', datetime('now')),
('rp_user_selections_view', 'role_user', 'perm_selections_view', datetime('now'));
