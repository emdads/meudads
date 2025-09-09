// Plataformas de anúncios suportadas
export interface AdPlatform {
  id: string;
  name: string;
  icon: string;
  logo?: string;
  color: string;
  description: string;
  tokenRequired: boolean;
  accountIdFormat: string;
  accountIdPlaceholder: string;
}

export const AD_PLATFORMS: Record<string, AdPlatform> = {
  meta: {
    id: 'meta',
    name: 'Meta Ads',
    icon: '📘',
    logo: 'https://mocha-cdn.com/0198cf0a-d3c7-7d97-b482-1973c540093e/meta.png',
    color: 'blue',
    description: 'Facebook e Instagram Ads',
    tokenRequired: true,
    accountIdFormat: 'Números ou act_números',
    accountIdPlaceholder: 'Ex: 123456789 ou act_123456789'
  },
  pinterest: {
    id: 'pinterest',
    name: 'Pinterest Ads',
    icon: '📌',
    logo: 'https://mocha-cdn.com/0198cf0a-d3c7-7d97-b482-1973c540093e/pinterest.png',
    color: 'red',
    description: 'Pinterest Business Ads',
    tokenRequired: true,
    accountIdFormat: 'ID numérico da conta',
    accountIdPlaceholder: 'Ex: 549755885175'
  },
  tiktok: {
    id: 'tiktok',
    name: 'TikTok Ads',
    icon: '🎵',
    logo: 'https://mocha-cdn.com/0198cf0a-d3c7-7d97-b482-1973c540093e/tiktoksf.png',
    color: 'black',
    description: 'TikTok for Business',
    tokenRequired: true,
    accountIdFormat: 'ID numérico da conta',
    accountIdPlaceholder: 'Ex: 7012345678901234567'
  },
  google: {
    id: 'google',
    name: 'Google Ads',
    icon: '🔍',
    logo: 'https://mocha-cdn.com/0198cf0a-d3c7-7d97-b482-1973c540093e/googleads.png',
    color: 'green',
    description: 'Google Ads',
    tokenRequired: true,
    accountIdFormat: 'ID numérico sem hífens',
    accountIdPlaceholder: 'Ex: 1234567890'
  }
};

export const PLATFORM_COLORS: Record<string, string> = {
  meta: 'blue',
  pinterest: 'red',
  tiktok: 'gray',
  google: 'green'
};

export const PLATFORM_STATUS_COLORS: Record<string, string> = {
  success: 'green',
  error: 'red',
  pending: 'yellow',
  syncing: 'blue'
};

// Tipos para as contas de anúncios
export interface AdAccount {
  id: string;
  client_id: string;
  platform: string;
  account_name: string;
  account_id: string;
  access_token_enc?: string;
  refresh_token_enc?: string;
  token_expires_at?: string;
  is_active: boolean;
  last_sync_at?: string;
  sync_status: 'pending' | 'success' | 'error' | 'syncing';
  sync_error?: string;
  created_at: string;
  updated_at: string;
}

export interface AdAccountCreate {
  platform: string;
  account_name: string;
  account_id: string;
  access_token?: string;
  refresh_token?: string;
}

export interface AdAccountUpdate {
  account_name?: string;
  account_id?: string;
  access_token?: string;
  refresh_token?: string;
  is_active?: boolean;
}
