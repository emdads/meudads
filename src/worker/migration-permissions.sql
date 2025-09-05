-- Migration to add permission restrictions table
CREATE TABLE IF NOT EXISTS user_permission_restrictions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  permission_name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'column', 'feature', 'data'
  name TEXT NOT NULL, -- specific restriction name
  allowed BOOLEAN NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_permission_restrictions_user_id ON user_permission_restrictions (user_id);
CREATE INDEX IF NOT EXISTS idx_user_permission_restrictions_permission ON user_permission_restrictions (permission_name);
CREATE INDEX IF NOT EXISTS idx_user_permission_restrictions_type ON user_permission_restrictions (type);

-- Insert detailed permissions if they don't exist
INSERT OR IGNORE INTO permissions (id, name, description, module, action) VALUES
('perm_ads_metrics_columns', 'ads.metrics.columns', 'Controlar quais colunas de métricas o usuário pode ver', 'ads', 'view_columns'),
('perm_performance_view', 'performance.view', 'Visualizar relatórios de performance', 'performance', 'view'),
('perm_performance_export', 'performance.export', 'Exportar dados de performance', 'performance', 'export'),
('perm_permissions_manage', 'permissions.manage', 'Gerenciar permissões de outros usuários', 'permissions', 'manage');

-- Add these permissions to Super Admin role if it doesn't exist
INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id)
SELECT 
  'rp_super_admin_' || LOWER(REPLACE(p.name, '.', '_')) as id,
  'role_super_admin' as role_id,
  p.id as permission_id
FROM permissions p 
WHERE p.name IN ('ads.metrics.columns', 'performance.view', 'performance.export', 'permissions.manage')
AND NOT EXISTS (
  SELECT 1 FROM role_permissions rp 
  WHERE rp.role_id = 'role_super_admin' AND rp.permission_id = p.id
);
