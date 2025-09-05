-- Remove setup permission from super admin role
DELETE FROM role_permissions WHERE role_id = 'role_super_admin' AND permission_id = 'perm_setup';

-- Remove setup permission
DELETE FROM permissions WHERE id = 'perm_setup';