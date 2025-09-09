
-- Drop indexes
DROP INDEX IF EXISTS idx_metrics_cache_period;
DROP INDEX IF EXISTS idx_metrics_cache_ad_id;
DROP INDEX IF EXISTS idx_user_client_access_client_id;
DROP INDEX IF EXISTS idx_user_client_access_user_id;
DROP INDEX IF EXISTS idx_selections_user_id;
DROP INDEX IF EXISTS idx_selections_client_id;
DROP INDEX IF EXISTS idx_campaigns_client_id;
DROP INDEX IF EXISTS idx_ads_active_account_ref;
DROP INDEX IF EXISTS idx_ads_active_client_id;
DROP INDEX IF EXISTS idx_ad_accounts_client_id;
DROP INDEX IF EXISTS idx_clients_slug;
DROP INDEX IF EXISTS idx_user_sessions_token;
DROP INDEX IF EXISTS idx_user_sessions_user_id;
DROP INDEX IF EXISTS idx_user_roles_role_id;
DROP INDEX IF EXISTS idx_user_roles_user_id;
DROP INDEX IF EXISTS idx_users_email;

-- Drop tables in reverse order (respecting foreign keys)
DROP TABLE IF EXISTS metrics_cache;
DROP TABLE IF EXISTS admin_notifications;
DROP TABLE IF EXISTS sync_schedules;
DROP TABLE IF EXISTS selection_ad_reasons;
DROP TABLE IF EXISTS user_client_access;
DROP TABLE IF EXISTS selections;
DROP TABLE IF EXISTS campaigns;
DROP TABLE IF EXISTS ads_active_raw;
DROP TABLE IF EXISTS ad_accounts;
DROP TABLE IF EXISTS clients;
DROP TABLE IF EXISTS user_sessions;
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS users;
