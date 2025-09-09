
-- Configuração de permissões para Super Admin (acesso total)
INSERT INTO role_permissions (id, role_id, permission_id) 
SELECT 
  'rp_' || substr(p.id, 6) || '_super', 
  'role_super_admin', 
  p.id 
FROM permissions p WHERE p.is_system = TRUE;

-- Configuração de permissões para Admin (acesso amplo, exceto sistema)
INSERT INTO role_permissions (id, role_id, permission_id) VALUES 
('rp_dashboard_view_admin', 'role_admin', 'perm_dashboard_view'),
('rp_dashboard_stats_admin', 'role_admin', 'perm_dashboard_stats'),
('rp_users_view_admin', 'role_admin', 'perm_users_view'),
('rp_users_create_admin', 'role_admin', 'perm_users_create'),
('rp_users_edit_admin', 'role_admin', 'perm_users_edit'),
('rp_clients_view_admin', 'role_admin', 'perm_clients_view'),
('rp_clients_create_admin', 'role_admin', 'perm_clients_create'),
('rp_clients_edit_admin', 'role_admin', 'perm_clients_edit'),
('rp_clients_sync_admin', 'role_admin', 'perm_clients_sync'),
('rp_ads_view_admin', 'role_admin', 'perm_ads_view'),
('rp_ads_metrics_admin', 'role_admin', 'perm_ads_metrics'),
('rp_ads_pause_admin', 'role_admin', 'perm_ads_pause'),
('rp_ads_manage_admin', 'role_admin', 'perm_ads_manage'),
('rp_selections_view_admin', 'role_admin', 'perm_selections_view'),
('rp_selections_create_admin', 'role_admin', 'perm_selections_create'),
('rp_selections_edit_admin', 'role_admin', 'perm_selections_edit'),
('rp_selections_delete_admin', 'role_admin', 'perm_selections_delete');

-- Configuração de permissões para Gerente de Cliente
INSERT INTO role_permissions (id, role_id, permission_id) VALUES 
('rp_dashboard_view_cm', 'role_client_manager', 'perm_dashboard_view'),
('rp_clients_view_cm', 'role_client_manager', 'perm_clients_view'),
('rp_clients_edit_cm', 'role_client_manager', 'perm_clients_edit'),
('rp_ads_view_cm', 'role_client_manager', 'perm_ads_view'),
('rp_ads_metrics_cm', 'role_client_manager', 'perm_ads_metrics'),
('rp_ads_pause_cm', 'role_client_manager', 'perm_ads_pause'),
('rp_selections_view_cm', 'role_client_manager', 'perm_selections_view'),
('rp_selections_create_cm', 'role_client_manager', 'perm_selections_create'),
('rp_selections_edit_cm', 'role_client_manager', 'perm_selections_edit'),
('rp_selections_delete_cm', 'role_client_manager', 'perm_selections_delete');

-- Configuração de permissões para Usuário Cliente
INSERT INTO role_permissions (id, role_id, permission_id) VALUES 
('rp_dashboard_view_cu', 'role_client_user', 'perm_dashboard_view'),
('rp_ads_view_cu', 'role_client_user', 'perm_ads_view'),
('rp_ads_metrics_cu', 'role_client_user', 'perm_ads_metrics'),
('rp_selections_view_cu', 'role_client_user', 'perm_selections_view'),
('rp_selections_create_cu', 'role_client_user', 'perm_selections_create');

-- Configuração de permissões para Visualizador
INSERT INTO role_permissions (id, role_id, permission_id) VALUES 
('rp_dashboard_view_viewer', 'role_viewer', 'perm_dashboard_view'),
('rp_ads_view_viewer', 'role_viewer', 'perm_ads_view'),
('rp_ads_metrics_viewer', 'role_viewer', 'perm_ads_metrics'),
('rp_selections_view_viewer', 'role_viewer', 'perm_selections_view');
