
INSERT OR IGNORE INTO roles (id, name, description, is_system, is_active) VALUES 
('role_super_admin', 'Super Admin', 'Acesso total ao sistema, pode criar admins', 1, 1),
('role_admin', 'Administrador', 'Acesso administrativo geral', 1, 1),
('role_manager', 'Gerente', 'Gerencia clientes e usuários', 1, 1),
('role_client_manager', 'Gerente de Cliente', 'Acesso a funcionalidades de cliente', 1, 1),
('role_user', 'Usuário', 'Usuário padrão do sistema', 1, 1);

INSERT OR IGNORE INTO permissions (id, name, description, module, action, is_system) VALUES 
-- System permissions
('perm_system_setup', 'system.setup', 'Acesso ao setup do sistema', 'system', 'setup', 1),

-- Dashboard permissions  
('perm_dashboard_stats', 'dashboard.stats', 'Ver estatísticas do dashboard', 'dashboard', 'view_stats', 1),
('perm_dashboard_view', 'dashboard.view', 'Acessar dashboard', 'dashboard', 'view', 1),

-- User management permissions
('perm_users_view', 'users.view', 'Visualizar usuários', 'users', 'view', 1),
('perm_users_create', 'users.create', 'Criar usuários', 'users', 'create', 1),
('perm_users_edit', 'users.edit', 'Editar usuários', 'users', 'edit', 1),
('perm_users_delete', 'users.delete', 'Excluir usuários', 'users', 'delete', 1),
('perm_users_manage', 'users.manage', 'Gerenciar usuários (ver todos)', 'users', 'manage', 1),

-- Client management permissions
('perm_clients_view', 'clients.view', 'Visualizar clientes', 'clients', 'view', 1),
('perm_clients_create', 'clients.create', 'Criar clientes', 'clients', 'create', 1),
('perm_clients_edit', 'clients.edit', 'Editar clientes', 'clients', 'edit', 1),
('perm_clients_delete', 'clients.delete', 'Excluir clientes', 'clients', 'delete', 1),
('perm_clients_sync', 'clients.sync', 'Sincronizar dados do Meta', 'clients', 'sync', 1),

-- Ads permissions
('perm_ads_view', 'ads.view', 'Visualizar anúncios', 'ads', 'view', 1),
('perm_ads_metrics', 'ads.metrics', 'Ver métricas de anúncios', 'ads', 'metrics', 1),
('perm_ads_pause', 'ads.pause', 'Pausar anúncios', 'ads', 'pause', 1),

-- Selection permissions
('perm_selections_view', 'selections.view', 'Visualizar seleções', 'selections', 'view', 1),
('perm_selections_create', 'selections.create', 'Criar seleções', 'selections', 'create', 1),
('perm_selections_delete', 'selections.delete', 'Excluir seleções', 'selections', 'delete', 1),
('perm_selections_manage', 'selections.manage', 'Gerenciar todas as seleções', 'selections', 'manage', 1);

-- Super Admin permissions (all)
INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id) VALUES 
('rp_sa_1', 'role_super_admin', 'perm_system_setup'),
('rp_sa_2', 'role_super_admin', 'perm_dashboard_stats'),
('rp_sa_3', 'role_super_admin', 'perm_dashboard_view'),
('rp_sa_4', 'role_super_admin', 'perm_users_view'),
('rp_sa_5', 'role_super_admin', 'perm_users_create'),
('rp_sa_6', 'role_super_admin', 'perm_users_edit'),
('rp_sa_7', 'role_super_admin', 'perm_users_delete'),
('rp_sa_8', 'role_super_admin', 'perm_users_manage'),
('rp_sa_9', 'role_super_admin', 'perm_clients_view'),
('rp_sa_10', 'role_super_admin', 'perm_clients_create'),
('rp_sa_11', 'role_super_admin', 'perm_clients_edit'),
('rp_sa_12', 'role_super_admin', 'perm_clients_delete'),
('rp_sa_13', 'role_super_admin', 'perm_clients_sync'),
('rp_sa_14', 'role_super_admin', 'perm_ads_view'),
('rp_sa_15', 'role_super_admin', 'perm_ads_metrics'),
('rp_sa_16', 'role_super_admin', 'perm_ads_pause'),
('rp_sa_17', 'role_super_admin', 'perm_selections_view'),
('rp_sa_18', 'role_super_admin', 'perm_selections_create'),
('rp_sa_19', 'role_super_admin', 'perm_selections_delete'),
('rp_sa_20', 'role_super_admin', 'perm_selections_manage');

-- Admin permissions (most except system setup)
INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id) VALUES 
('rp_admin_1', 'role_admin', 'perm_dashboard_stats'),
('rp_admin_2', 'role_admin', 'perm_dashboard_view'),
('rp_admin_3', 'role_admin', 'perm_users_view'),
('rp_admin_4', 'role_admin', 'perm_users_create'),
('rp_admin_5', 'role_admin', 'perm_users_edit'),
('rp_admin_6', 'role_admin', 'perm_users_manage'),
('rp_admin_7', 'role_admin', 'perm_clients_view'),
('rp_admin_8', 'role_admin', 'perm_clients_create'),
('rp_admin_9', 'role_admin', 'perm_clients_edit'),
('rp_admin_10', 'role_admin', 'perm_clients_sync'),
('rp_admin_11', 'role_admin', 'perm_ads_view'),
('rp_admin_12', 'role_admin', 'perm_ads_metrics'),
('rp_admin_13', 'role_admin', 'perm_ads_pause'),
('rp_admin_14', 'role_admin', 'perm_selections_view'),
('rp_admin_15', 'role_admin', 'perm_selections_create'),
('rp_admin_16', 'role_admin', 'perm_selections_delete'),
('rp_admin_17', 'role_admin', 'perm_selections_manage');

-- Manager permissions
INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id) VALUES 
('rp_mgr_1', 'role_manager', 'perm_dashboard_view'),
('rp_mgr_2', 'role_manager', 'perm_users_view'),
('rp_mgr_3', 'role_manager', 'perm_clients_view'),
('rp_mgr_4', 'role_manager', 'perm_clients_sync'),
('rp_mgr_5', 'role_manager', 'perm_ads_view'),
('rp_mgr_6', 'role_manager', 'perm_ads_metrics'),
('rp_mgr_7', 'role_manager', 'perm_ads_pause'),
('rp_mgr_8', 'role_manager', 'perm_selections_view'),
('rp_mgr_9', 'role_manager', 'perm_selections_create'),
('rp_mgr_10', 'role_manager', 'perm_selections_delete'),
('rp_mgr_11', 'role_manager', 'perm_selections_manage');

-- Client Manager permissions
INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id) VALUES 
('rp_cm_1', 'role_client_manager', 'perm_dashboard_view'),
('rp_cm_2', 'role_client_manager', 'perm_ads_view'),
('rp_cm_3', 'role_client_manager', 'perm_ads_metrics'),
('rp_cm_4', 'role_client_manager', 'perm_selections_view'),
('rp_cm_5', 'role_client_manager', 'perm_selections_create');

-- User permissions (basic)
INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id) VALUES 
('rp_user_1', 'role_user', 'perm_dashboard_view'),
('rp_user_2', 'role_user', 'perm_ads_view'),
('rp_user_3', 'role_user', 'perm_selections_view');
