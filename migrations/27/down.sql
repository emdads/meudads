
-- Remove user permission restrictions table and related data
DROP INDEX IF EXISTS idx_user_permission_restrictions_user_id;
DROP INDEX IF EXISTS idx_user_permission_restrictions_permission;
DROP INDEX IF EXISTS idx_user_permission_restrictions_type;
DROP TABLE IF EXISTS user_permission_restrictions;

-- Remove permissions
DELETE FROM permissions WHERE id IN ('perm_ads_metrics_columns', 'perm_performance_view', 'perm_performance_export', 'perm_permissions_manage');

-- Remove role permissions
DELETE FROM role_permissions WHERE role_id = 'role_super_admin';

-- Remove user roles for Super Admin
DELETE FROM user_roles WHERE role_id = 'role_super_admin';

-- Remove Super Admin role
DELETE FROM roles WHERE id = 'role_super_admin';
