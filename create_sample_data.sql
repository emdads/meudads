-- Criar dados de exemplo para testar o setup
-- Cliente de exemplo
INSERT OR REPLACE INTO clients (id, name, slug, logo_url, email, is_active, created_at, updated_at)
VALUES (
  'client_example_1', 
  'Closet da May', 
  'closet-da-may', 
  'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=100&h=100&fit=crop&crop=center',
  'contato@closetdamay.com.br',
  1,
  datetime('now'),
  datetime('now')
);

INSERT OR REPLACE INTO clients (id, name, slug, logo_url, email, is_active, created_at, updated_at)
VALUES (
  'client_example_2', 
  'Moda Premium', 
  'moda-premium', 
  'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=100&h=100&fit=crop&crop=center',
  'contato@modapremium.com.br',
  1,
  datetime('now'),
  datetime('now')
);

-- Contas de anúncios de exemplo
INSERT OR REPLACE INTO ad_accounts (
  id, client_id, platform, account_name, account_id, 
  access_token_enc, is_active, sync_status, 
  created_at, updated_at
)
VALUES (
  'account_meta_1',
  'client_example_1',
  'meta',
  'Meta Ads - Closet da May',
  '123456789012345',
  'encrypted_token_example_1',
  1,
  'success',
  datetime('now'),
  datetime('now')
);

INSERT OR REPLACE INTO ad_accounts (
  id, client_id, platform, account_name, account_id, 
  access_token_enc, is_active, sync_status, 
  created_at, updated_at
)
VALUES (
  'account_google_1',
  'client_example_1',
  'google',
  'Google Ads - Closet da May',
  '987654321098765',
  'encrypted_token_example_2',
  1,
  'pending',
  datetime('now'),
  datetime('now')
);

INSERT OR REPLACE INTO ad_accounts (
  id, client_id, platform, account_name, account_id, 
  access_token_enc, is_active, sync_status, 
  created_at, updated_at
)
VALUES (
  'account_meta_2',
  'client_example_2',
  'meta',
  'Meta Ads - Moda Premium',
  '555666777888999',
  'encrypted_token_example_3',
  1,
  'success',
  datetime('now'),
  datetime('now')
);

INSERT OR REPLACE INTO ad_accounts (
  id, client_id, platform, account_name, account_id, 
  access_token_enc, is_active, sync_status, 
  created_at, updated_at
)
VALUES (
  'account_tiktok_1',
  'client_example_2',
  'tiktok',
  'TikTok Ads - Moda Premium',
  '111222333444555',
  'encrypted_token_example_4',
  1,
  'error',
  datetime('now'),
  datetime('now')
);

-- Alguns anúncios de exemplo
INSERT OR REPLACE INTO ads_active_raw (
  ad_id, ad_name, effective_status, campaign_id, adset_id,
  creative_id, creative_thumb, ad_account_id, ad_account_ref_id,
  client_id, created_at, updated_at
)
VALUES (
  '120212345678901',
  'Vestido Verão 2025 - Promoção',
  'ACTIVE',
  '23858456097330460',
  '23858456097340461',
  '120212345678902',
  'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400&h=400&fit=crop&crop=faces',
  '123456789012345',
  'account_meta_1',
  'client_example_1',
  datetime('now'),
  datetime('now')
);

INSERT OR REPLACE INTO ads_active_raw (
  ad_id, ad_name, effective_status, campaign_id, adset_id,
  creative_id, creative_thumb, ad_account_id, ad_account_ref_id,
  client_id, created_at, updated_at
)
VALUES (
  '120212345678903',
  'Coleção Outono - Desconto 20%',
  'ACTIVE',
  '23858456097330460',
  '23858456097340462',
  '120212345678904',
  'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=400&h=400&fit=crop&crop=faces',
  '123456789012345',
  'account_meta_1',
  'client_example_1',
  datetime('now'),
  datetime('now')
);

INSERT OR REPLACE INTO ads_active_raw (
  ad_id, ad_name, effective_status, campaign_id, adset_id,
  creative_id, creative_thumb, ad_account_id, ad_account_ref_id,
  client_id, created_at, updated_at
)
VALUES (
  '120212345678905',
  'Sapatos Premium - Lançamento',
  'PAUSED',
  '23858456097330461',
  '23858456097340463',
  '120212345678906',
  'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=400&h=400&fit=crop&crop=center',
  '555666777888999',
  'account_meta_2',
  'client_example_2',
  datetime('now'),
  datetime('now')
);

-- Campanhas de exemplo
INSERT OR REPLACE INTO campaigns (
  campaign_id, name, objective, ad_account_id, ad_account_ref_id, client_id,
  created_at, updated_at
)
VALUES (
  '23858456097330460',
  'Campanha Closet da May - Verão 2025',
  'CONVERSIONS',
  '123456789012345',
  'account_meta_1',
  'client_example_1',
  datetime('now'),
  datetime('now')
);

INSERT OR REPLACE INTO campaigns (
  campaign_id, name, objective, ad_account_id, ad_account_ref_id, client_id,
  created_at, updated_at
)
VALUES (
  '23858456097330461',
  'Campanha Moda Premium - Sapatos',
  'TRAFFIC',
  '555666777888999',
  'account_meta_2',
  'client_example_2',
  datetime('now'),
  datetime('now')
);
