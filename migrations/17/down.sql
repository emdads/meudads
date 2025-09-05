
-- Remover índices
DROP INDEX IF EXISTS idx_ads_ad_account_ref;
DROP INDEX IF EXISTS idx_campaigns_ad_account_ref;
DROP INDEX IF EXISTS idx_ad_accounts_active;
DROP INDEX IF EXISTS idx_ad_accounts_client_platform;

-- Remover colunas adicionadas
ALTER TABLE ads_active_raw DROP COLUMN ad_account_ref_id;
ALTER TABLE campaigns DROP COLUMN ad_account_ref_id;

-- Remover tabela
DROP TABLE ad_accounts;
