
CREATE TABLE clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  ad_account_id TEXT,
  slug TEXT UNIQUE NOT NULL,
  meta_token_enc TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE campaigns (
  campaign_id TEXT PRIMARY KEY,
  name TEXT,
  objective TEXT,
  ad_account_id TEXT,
  client_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ads_active_raw (
  ad_id TEXT PRIMARY KEY,
  ad_name TEXT,
  effective_status TEXT,
  creative_id TEXT,
  creative_thumb TEXT,
  object_story_id TEXT,
  campaign_id TEXT,
  adset_id TEXT,
  adset_optimization_goal TEXT,
  objective TEXT,
  ad_account_id TEXT,
  client_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE selections (
  id TEXT PRIMARY KEY,
  client_id TEXT,
  slug TEXT,
  ad_ids TEXT, -- JSON array de ad_ids
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
