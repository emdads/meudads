
-- Remove all role assignments
DELETE FROM user_roles WHERE role_id IN ('role_super_admin', 'role_admin', 'role_client', 'role_user');

-- Remove all role permissions
DELETE FROM role_permissions WHERE role_id IN ('role_super_admin', 'role_admin', 'role_client', 'role_user');

-- Remove permissions
DELETE FROM permissions WHERE is_system = 1;

-- Remove roles
DELETE FROM roles WHERE is_system = 1;

-- Drop indexes
DROP INDEX IF EXISTS idx_user_permission_restrictions_type;
DROP INDEX IF EXISTS idx_user_permission_restrictions_permission;
DROP INDEX IF EXISTS idx_user_permission_restrictions_user_id;

-- Drop table
DROP TABLE user_permission_restrictions;
