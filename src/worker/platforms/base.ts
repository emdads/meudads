// Base platform interface for multi-platform ad management
export interface PlatformConfig {
  id: string;
  name: string;
  syncSupported: boolean;
  metricsSupported: boolean;
  pauseSupported: boolean;
  reactivateSupported: boolean;
}

export interface SyncResult {
  ok: boolean;
  campaigns: number;
  ads: number;
  skipped: number;
  error?: string;
}

export interface AdMetrics {
  spend: number;
  impressions: number;
  reach?: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  results?: number;
  conversions?: number;
  conversion_value?: number;
  cost_per_conversion?: number;
  [key: string]: any;
}

export interface MetricsResult {
  ok: boolean;
  metrics?: AdMetrics;
  error?: string;
}

export abstract class BasePlatform {
  abstract id: string;
  abstract name: string;
  
  abstract validateToken(token: string, accountId: string): Promise<boolean>;
  
  abstract syncAds(
    db: D1Database,
    accountId: string,
    clientId: string,
    token: string,
    adAccountId: string,
    days?: number
  ): Promise<SyncResult>;
  
  abstract getMetrics(
    token: string,
    adAccountId: string,
    adIds: string[],
    days: number,
    startDateStr?: string,
    endDateStr?: string
  ): Promise<Record<string, MetricsResult>>;
  
  abstract pauseAd(
    token: string,
    adId: string
  ): Promise<{ ok: boolean; error?: string }>;
  
  abstract reactivateAd(
    token: string,
    adId: string
  ): Promise<{ ok: boolean; error?: string }>;
  
  // Helper methods
  protected async saveAd(
    db: D1Database,
    ad: {
      ad_id: string;
      ad_name?: string;
      effective_status: string;
      creative_id?: string;
      creative_thumb?: string;
      object_story_id?: string;
      campaign_id?: string;
      adset_id?: string;
      adset_optimization_goal?: string;
      objective?: string;
      ad_account_id: string;
      ad_account_ref_id: string;
      client_id: string;
    }
  ): Promise<void> {
    await db.prepare(`
      INSERT OR REPLACE INTO ads_active_raw 
      (ad_id, ad_name, effective_status, creative_id, creative_thumb, object_story_id, 
       campaign_id, adset_id, adset_optimization_goal, objective, ad_account_id, ad_account_ref_id, client_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).bind(
      ad.ad_id,
      ad.ad_name || null,
      ad.effective_status,
      ad.creative_id || null,
      ad.creative_thumb || null,
      ad.object_story_id || null,
      ad.campaign_id || null,
      ad.adset_id || null,
      ad.adset_optimization_goal || null,
      ad.objective || null,
      ad.ad_account_id,
      ad.ad_account_ref_id,
      ad.client_id
    ).run();
  }
  
  protected async saveCampaign(
    db: D1Database,
    campaign: {
      campaign_id: string;
      name?: string;
      objective?: string;
      ad_account_id: string;
      ad_account_ref_id: string;
      client_id: string;
    }
  ): Promise<void> {
    await db.prepare(`
      INSERT OR REPLACE INTO campaigns 
      (campaign_id, name, objective, ad_account_id, ad_account_ref_id, client_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).bind(
      campaign.campaign_id,
      campaign.name || null,
      campaign.objective || null,
      campaign.ad_account_id,
      campaign.ad_account_ref_id,
      campaign.client_id
    ).run();
  }
}
