-- Remover permissões dashboard
DELETE FROM role_permissions WHERE permission_id IN ('perm_dashboard_view', 'perm_dashboard_stats');
DELETE FROM permissions WHERE id IN ('perm_dashboard_view', 'perm_dashboard_stats');