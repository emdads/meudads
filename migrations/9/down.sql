
-- Remove super admin user role assignment
DELETE FROM user_roles WHERE id = 'ur_super_admin';

-- Remove super admin user
DELETE FROM users WHERE id = 'user_super_admin';

-- Remove role permissions for super admin
DELETE FROM role_permissions WHERE role_id = 'role_super_admin';

-- Remove permissions
DELETE FROM permissions WHERE is_system = 1;

-- Remove roles
DELETE FROM roles WHERE is_system = 1;
