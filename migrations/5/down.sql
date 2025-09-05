
-- Remove permissões e roles padrão
DELETE FROM role_permissions;
DELETE FROM permissions WHERE is_system = TRUE;
DELETE FROM roles WHERE is_system = TRUE;
