
-- Remover associações de permissões de seleções do Super Admin
DELETE FROM role_permissions WHERE id IN (
'rp_super_admin_selections_view',
'rp_super_admin_selections_create', 
'rp_super_admin_selections_delete',
'rp_super_admin_selections_manage'
);

-- Remover permissões de seleções
DELETE FROM permissions WHERE id IN (
'perm_selections_view',
'perm_selections_create',
'perm_selections_delete', 
'perm_selections_manage'
);
