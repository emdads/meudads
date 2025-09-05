
-- Tabela para armazenar métricas históricas dos anúncios
CREATE TABLE ad_metrics_cache (
  id TEXT PRIMARY KEY,
  ad_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  ad_account_ref_id TEXT NOT NULL,
  date_start DATE NOT NULL,
  date_end DATE NOT NULL,
  period_days INTEGER NOT NULL,
  -- Métricas básicas
  spend REAL DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  ctr REAL DEFAULT 0,
  cpc REAL DEFAULT 0,
  cpm REAL DEFAULT 0,
  -- Métricas de conversão
  results INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  cost_per_conversion REAL DEFAULT 0,
  cpa REAL DEFAULT 0,
  -- Link clicks
  link_clicks INTEGER DEFAULT 0,
  cost_per_link_click REAL DEFAULT 0,
  -- Landing page views
  landing_page_views INTEGER DEFAULT 0,
  cost_per_landing_page_view REAL DEFAULT 0,
  -- Leads
  leads INTEGER DEFAULT 0,
  cost_per_lead REAL DEFAULT 0,
  -- Purchases e ROAS
  purchases INTEGER DEFAULT 0,
  revenue REAL DEFAULT 0,
  roas REAL DEFAULT 0,
  cost_per_purchase REAL DEFAULT 0,
  -- Outras conversões
  conversations INTEGER DEFAULT 0,
  thruplays INTEGER DEFAULT 0,
  video_views INTEGER DEFAULT 0,
  profile_visits INTEGER DEFAULT 0,
  post_engagement INTEGER DEFAULT 0,
  app_installs INTEGER DEFAULT 0,
  add_to_cart INTEGER DEFAULT 0,
  initiate_checkout INTEGER DEFAULT 0,
  complete_registration INTEGER DEFAULT 0,
  -- Metadados
  is_historical BOOLEAN DEFAULT FALSE, -- true para dados > 7 dias (não mudam)
  sync_status TEXT DEFAULT 'pending', -- pending, success, error
  sync_error TEXT,
  synced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  -- Índices únicos
  UNIQUE(ad_id, date_start, date_end, period_days)
);
