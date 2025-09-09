
-- Remove role permissions
DELETE FROM role_permissions WHERE role_id IN ('role_super_admin', 'role_admin', 'role_user');

-- Remove permissions
DELETE FROM permissions WHERE id LIKE 'perm_%';

-- Remove roles
DELETE FROM roles WHERE id IN ('role_super_admin', 'role_admin', 'role_user');
