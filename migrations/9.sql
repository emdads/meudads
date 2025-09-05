
-- Create system roles if they don't exist
INSERT OR IGNORE INTO roles (id, name, description, is_system, is_active) VALUES 
('role_super_admin', 'Super Admin', 'Acesso total ao sistema incluindo configurações', 1, 1),
('role_admin', 'Administrador', 'Acesso administrativo completo exceto setup do sistema', 1, 1),
('role_manager', 'Gerente', 'Gestão operacional de clientes e anúncios', 1, 1),
('role_client_manager', 'Gerente de Cliente', 'Gestão específica de clientes atribuídos', 1, 1),
('role_user', 'Usuário', 'Acesso básico de visualização', 1, 1);

-- Create system permissions if they don't exist
INSERT OR IGNORE INTO permissions (id, name, description, module, action, is_system) VALUES 
-- Dashboard
('perm_dashboard_view', 'dashboard.view', 'Visualizar dashboard', 'dashboard', 'view', 1),
('perm_dashboard_stats', 'dashboard.stats', 'Visualizar estatísticas do dashboard', 'dashboard', 'stats', 1),

-- System Setup
('perm_system_setup', 'system.setup', 'Configurar sistema (apenas super admin)', 'system', 'setup', 1),

-- Users Management
('perm_users_view', 'users.view', 'Visualizar usuários', 'users', 'view', 1),
('perm_users_create', 'users.create', 'Criar novos usuários', 'users', 'create', 1),
('perm_users_edit', 'users.edit', 'Editar usuários existentes', 'users', 'edit', 1),
('perm_users_delete', 'users.delete', 'Excluir usuários', 'users', 'delete', 1),
('perm_users_manage', 'users.manage', 'Gestão completa de usuários', 'users', 'manage', 1),

-- Clients Management
('perm_clients_view', 'clients.view', 'Visualizar clientes', 'clients', 'view', 1),
('perm_clients_create', 'clients.create', 'Criar novos clientes', 'clients', 'create', 1),
('perm_clients_edit', 'clients.edit', 'Editar clientes existentes', 'clients', 'edit', 1),
('perm_clients_delete', 'clients.delete', 'Excluir clientes', 'clients', 'delete', 1),
('perm_clients_sync', 'clients.sync', 'Sincronizar dados do Meta', 'clients', 'sync', 1),

-- Ads Management
('perm_ads_view', 'ads.view', 'Visualizar anúncios', 'ads', 'view', 1),
('perm_ads_metrics', 'ads.metrics', 'Visualizar métricas de anúncios', 'ads', 'metrics', 1),
('perm_ads_pause', 'ads.pause', 'Pausar anúncios', 'ads', 'pause', 1),
('perm_ads_manage', 'ads.manage', 'Gestão completa de anúncios', 'ads', 'manage', 1),

-- Selections Management
('perm_selections_view', 'selections.view', 'Visualizar seleções', 'selections', 'view', 1),
('perm_selections_create', 'selections.create', 'Criar seleções', 'selections', 'create', 1),
('perm_selections_edit', 'selections.edit', 'Editar seleções', 'selections', 'edit', 1),
('perm_selections_delete', 'selections.delete', 'Excluir seleções', 'selections', 'delete', 1),
('perm_selections_manage', 'selections.manage', 'Gestão completa de seleções', 'selections', 'manage', 1);

-- Assign permissions to Super Admin role
INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id) VALUES 
('rp_super_dashboard_view', 'role_super_admin', 'perm_dashboard_view'),
('rp_super_dashboard_stats', 'role_super_admin', 'perm_dashboard_stats'),
('rp_super_system_setup', 'role_super_admin', 'perm_system_setup'),
('rp_super_users_view', 'role_super_admin', 'perm_users_view'),
('rp_super_users_create', 'role_super_admin', 'perm_users_create'),
('rp_super_users_edit', 'role_super_admin', 'perm_users_edit'),
('rp_super_users_delete', 'role_super_admin', 'perm_users_delete'),
('rp_super_users_manage', 'role_super_admin', 'perm_users_manage'),
('rp_super_clients_view', 'role_super_admin', 'perm_clients_view'),
('rp_super_clients_create', 'role_super_admin', 'perm_clients_create'),
('rp_super_clients_edit', 'role_super_admin', 'perm_clients_edit'),
('rp_super_clients_delete', 'role_super_admin', 'perm_clients_delete'),
('rp_super_clients_sync', 'role_super_admin', 'perm_clients_sync'),
('rp_super_ads_view', 'role_super_admin', 'perm_ads_view'),
('rp_super_ads_metrics', 'role_super_admin', 'perm_ads_metrics'),
('rp_super_ads_pause', 'role_super_admin', 'perm_ads_pause'),
('rp_super_ads_manage', 'role_super_admin', 'perm_ads_manage'),
('rp_super_selections_view', 'role_super_admin', 'perm_selections_view'),
('rp_super_selections_create', 'role_super_admin', 'perm_selections_create'),
('rp_super_selections_edit', 'role_super_admin', 'perm_selections_edit'),
('rp_super_selections_delete', 'role_super_admin', 'perm_selections_delete'),
('rp_super_selections_manage', 'role_super_admin', 'perm_selections_manage');

-- Create Super Admin user with specific password hash
INSERT OR IGNORE INTO users (id, email, name, password_hash, user_type, is_active, created_at, updated_at)
VALUES ('user_super_admin', 'admin@meudads.com.br', 'Super Admin', 'e3afed0047b08059d0fada10f400c1e5', 'admin', 1, datetime('now'), datetime('now'));

-- Assign super admin role to the user
INSERT OR IGNORE INTO user_roles (id, user_id, role_id, assigned_by, assigned_at, is_active)
VALUES ('ur_super_admin', 'user_super_admin', 'role_super_admin', 'user_super_admin', datetime('now'), 1);
