DROP TABLE IF EXISTS user_permission_restrictions;
DELETE FROM permissions WHERE id IN ('perm_users_manage', 'perm_permissions_manage');
DELETE FROM role_permissions WHERE id IN ('rp_super_admin_users_manage', 'rp_super_admin_permissions_manage');