
DELETE FROM role_permissions WHERE role_id IN ('role_super_admin', 'role_admin', 'role_manager', 'role_client_manager', 'role_user');
DELETE FROM permissions WHERE is_system = 1;
DELETE FROM roles WHERE is_system = 1;
