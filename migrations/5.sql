
-- Inserção de roles padrão do sistema
INSERT INTO roles (id, name, description, is_system, is_active) VALUES 
('role_super_admin', 'Super Admin', 'Acesso total ao sistema', TRUE, TRUE),
('role_admin', 'Administrador', 'Administrador com acesso amplo', TRUE, TRUE),
('role_client_manager', 'Gerente de Cliente', 'Gerencia clientes específicos', TRUE, TRUE),
('role_client_user', 'Usuário Cliente', 'Acesso apenas aos dados do cliente', TRUE, TRUE),
('role_viewer', 'Visualizador', 'Apenas visualização de dados permitidos', TRUE, TRUE);

-- Inserção de permissões padrão do sistema
INSERT INTO permissions (id, name, description, module, action, is_system) VALUES 
-- Dashboard
('perm_dashboard_view', 'dashboard.view', 'Visualizar dashboard', 'dashboard', 'view', TRUE),
('perm_dashboard_stats', 'dashboard.stats', 'Ver estatísticas do dashboard', 'dashboard', 'stats', TRUE),

-- Usuários
('perm_users_view', 'users.view', 'Visualizar usuários', 'users', 'view', TRUE),
('perm_users_create', 'users.create', 'Criar usuários', 'users', 'create', TRUE),
('perm_users_edit', 'users.edit', 'Editar usuários', 'users', 'edit', TRUE),
('perm_users_delete', 'users.delete', 'Excluir usuários', 'users', 'delete', TRUE),
('perm_users_manage', 'users.manage', 'Gerenciar usuários completamente', 'users', 'manage', TRUE),

-- Clientes
('perm_clients_view', 'clients.view', 'Visualizar clientes', 'clients', 'view', TRUE),
('perm_clients_create', 'clients.create', 'Criar clientes', 'clients', 'create', TRUE),
('perm_clients_edit', 'clients.edit', 'Editar clientes', 'clients', 'edit', TRUE),
('perm_clients_delete', 'clients.delete', 'Excluir clientes', 'clients', 'delete', TRUE),
('perm_clients_sync', 'clients.sync', 'Sincronizar dados Meta', 'clients', 'sync', TRUE),

-- Anúncios
('perm_ads_view', 'ads.view', 'Visualizar anúncios', 'ads', 'view', TRUE),
('perm_ads_metrics', 'ads.metrics', 'Ver métricas de anúncios', 'ads', 'metrics', TRUE),
('perm_ads_pause', 'ads.pause', 'Pausar anúncios', 'ads', 'pause', TRUE),
('perm_ads_manage', 'ads.manage', 'Gerenciar anúncios completamente', 'ads', 'manage', TRUE),

-- Seleções
('perm_selections_view', 'selections.view', 'Visualizar seleções', 'selections', 'view', TRUE),
('perm_selections_create', 'selections.create', 'Criar seleções', 'selections', 'create', TRUE),
('perm_selections_edit', 'selections.edit', 'Editar seleções', 'selections', 'edit', TRUE),
('perm_selections_delete', 'selections.delete', 'Excluir seleções', 'selections', 'delete', TRUE),

-- Sistema
('perm_system_setup', 'system.setup', 'Acessar configurações do sistema', 'system', 'setup', TRUE),
('perm_system_logs', 'system.logs', 'Ver logs do sistema', 'system', 'logs', TRUE);
