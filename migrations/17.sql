
-- Criar tabela para gerenciar contas de anúncios de múltiplas plataformas
CREATE TABLE ad_accounts (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  platform TEXT NOT NULL, -- 'meta', 'pinterest', 'tiktok', etc
  account_name TEXT NOT NULL, -- Nome amigável da conta
  account_id TEXT NOT NULL, -- ID da conta na plataforma
  access_token_enc TEXT, -- Token de acesso criptografado
  refresh_token_enc TEXT, -- Token de refresh (se aplicável)
  token_expires_at TIMESTAMP, -- Quando o token expira
  is_active BOOLEAN DEFAULT TRUE,
  last_sync_at TIMESTAMP,
  sync_status TEXT DEFAULT 'pending', -- 'pending', 'success', 'error'
  sync_error TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(client_id, platform, account_id)
);

-- Adicionar nova coluna nas tabelas existentes para referenciar a conta específica
ALTER TABLE campaigns ADD COLUMN ad_account_ref_id TEXT;
ALTER TABLE ads_active_raw ADD COLUMN ad_account_ref_id TEXT;

-- Criar índices para performance
CREATE INDEX idx_ad_accounts_client_platform ON ad_accounts(client_id, platform);
CREATE INDEX idx_ad_accounts_active ON ad_accounts(is_active, platform);
CREATE INDEX idx_campaigns_ad_account_ref ON campaigns(ad_account_ref_id);
CREATE INDEX idx_ads_ad_account_ref ON ads_active_raw(ad_account_ref_id);
