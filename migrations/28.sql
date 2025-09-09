CREATE TABLE IF NOT EXISTS user_permission_restrictions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  permission_name TEXT NOT NULL,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  allowed BOOLEAN NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_permission_restrictions_user_id ON user_permission_restrictions (user_id);
CREATE INDEX IF NOT EXISTS idx_user_permission_restrictions_permission ON user_permission_restrictions (permission_name);

INSERT OR IGNORE INTO permissions (id, name, description, module, action) VALUES
('perm_users_manage', 'users.manage', 'Gerenciar usuários do sistema', 'users', 'manage'),
('perm_permissions_manage', 'permissions.manage', 'Gerenciar permissões de usuários', 'permissions', 'manage');

INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id)
SELECT 
  'rp_super_admin_users_manage' as id,
  'role_super_admin' as role_id,
  'perm_users_manage' as permission_id
WHERE NOT EXISTS (
  SELECT 1 FROM role_permissions 
  WHERE role_id = 'role_super_admin' AND permission_id = 'perm_users_manage'
);

INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id)
SELECT 
  'rp_super_admin_permissions_manage' as id,
  'role_super_admin' as role_id,
  'perm_permissions_manage' as permission_id
WHERE NOT EXISTS (
  SELECT 1 FROM role_permissions 
  WHERE role_id = 'role_super_admin' AND permission_id = 'perm_permissions_manage'
);