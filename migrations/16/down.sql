
-- Remove role permissions
DELETE FROM role_permissions WHERE role_id IN ('role_super_admin', 'role_admin', 'role_client_user');

-- Remove roles
DELETE FROM roles WHERE id IN ('role_super_admin', 'role_admin', 'role_client_user');

-- Remove permissions
DELETE FROM permissions WHERE is_system = 1;
