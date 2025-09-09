// TikTok Ads platform implementation
import { BasePlatform, SyncResult, MetricsResult } from './base';

export class TikTokPlatform extends BasePlatform {
  id = 'tiktok';
  name = 'TikTok Ads';

  async validateToken(token: string, accountId: string): Promise<boolean> {
    try {
      // Test TikTok Ads API access
      const response = await fetch(
        `https://business-api.tiktok.com/open_api/v1.3/advertiser/info/?advertiser_ids=[${accountId}]`,
        {
          headers: {
            'Access-Token': token,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        console.error('[TIKTOK] Token validation failed:', response.status, response.statusText);
        return false;
      }
      
      const data = await response.json() as any;
      
      if (data.code !== 0) {
        console.error('[TIKTOK] API error:', data.message);
        return false;
      }
      
      if (data.data?.list && data.data.list.length > 0) {
        const advertiser = data.data.list[0];
        console.log(`[TIKTOK] Token validation successful - Account: ${advertiser.name}, Status: ${advertiser.status}`);
        return true;
      }
      
      return false;
      
    } catch (error) {
      console.error('[TIKTOK] Token validation error:', error);
      return false;
    }
  }

  async syncAds(
    db: D1Database,
    accountId: string,
    clientId: string,
    token: string,
    adAccountId: string,
    _days: number = 30
  ): Promise<SyncResult> {
    const startTime = Date.now();
    console.log(`[TIKTOK-SYNC] Starting sync for account: ${adAccountId}`);
    
    try {
      // Clean up existing data for this account
      await db.prepare(`DELETE FROM campaigns WHERE ad_account_ref_id = ?`).bind(accountId).run();
      await db.prepare(`DELETE FROM ads_active_raw WHERE ad_account_ref_id = ?`).bind(accountId).run();

      // Fetch campaigns from TikTok
      const campaigns = await this.fetchCampaigns(token, adAccountId);
      console.log(`[TIKTOK-SYNC] Found ${campaigns.length} campaigns`);
      
      let campaignCount = 0;
      const campaignObjectives = new Map<string, string>();
      
      for (const campaign of campaigns) {
        if (campaign.status === 'ENABLE' || campaign.status === 'DISABLE') {
          await this.saveCampaign(db, {
            campaign_id: campaign.campaign_id,
            name: campaign.campaign_name,
            objective: campaign.objective_type || 'TRAFFIC',
            ad_account_id: adAccountId,
            ad_account_ref_id: accountId,
            client_id: clientId
          });
          
          campaignObjectives.set(campaign.campaign_id, campaign.objective_type || 'TRAFFIC');
          campaignCount++;
        }
      }

      // Fetch ad groups
      const adGroups = await this.fetchAdGroups(token, adAccountId);
      console.log(`[TIKTOK-SYNC] Found ${adGroups.length} ad groups`);
      
      // Create a map of ad groups by campaign for context
      const adGroupsByCampaign = new Map<string, any[]>();
      for (const adGroup of adGroups) {
        if (!adGroupsByCampaign.has(adGroup.campaign_id)) {
          adGroupsByCampaign.set(adGroup.campaign_id, []);
        }
        adGroupsByCampaign.get(adGroup.campaign_id)!.push(adGroup);
      }

      // Fetch ads
      const ads = await this.fetchAds(token, adAccountId);
      console.log(`[TIKTOK-SYNC] Found ${ads.length} ads`);
      
      let adsCount = 0;
      let skippedCount = 0;
      
      for (const ad of ads) {
        if ((ad.status === 'ENABLE' || ad.status === 'DISABLE') && campaignObjectives.has(ad.campaign_id)) {
          try {
            // Find the ad group for this ad to get optimization goal
            const adGroupsForCampaign = adGroupsByCampaign.get(ad.campaign_id) || [];
            const relatedAdGroup = adGroupsForCampaign.find(ag => ag.adgroup_id === ad.adgroup_id);
            
            await this.saveAd(db, {
              ad_id: ad.ad_id,
              ad_name: ad.ad_name || undefined,
              effective_status: ad.status === 'ENABLE' ? 'ACTIVE' : 'PAUSED',
              creative_id: ad.creative_material_mode || ad.ad_id,
              creative_thumb: ad.image_info?.image_url || undefined,
              object_story_id: undefined,
              campaign_id: ad.campaign_id,
              adset_id: ad.adgroup_id,
              adset_optimization_goal: relatedAdGroup?.optimization_goal || undefined,
              objective: campaignObjectives.get(ad.campaign_id) || undefined,
              ad_account_id: adAccountId,
              ad_account_ref_id: accountId,
              client_id: clientId
            });
            adsCount++;
          } catch (error) {
            console.error(`[TIKTOK-SYNC] Error saving ad ${ad.ad_id}:`, error);
            skippedCount++;
          }
        } else {
          skippedCount++;
        }
      }

      const syncDuration = Date.now() - startTime;
      console.log(`[TIKTOK-SYNC] Sync completed: ${campaignCount} campaigns, ${adsCount} ads, ${skippedCount} skipped, ${syncDuration}ms`);

      return {
        ok: true,
        campaigns: campaignCount,
        ads: adsCount,
        skipped: skippedCount
      };
      
    } catch (error) {
      console.error('[TIKTOK-SYNC] Sync error:', error);
      return {
        ok: false,
        campaigns: 0,
        ads: 0,
        skipped: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getMetrics(
    token: string,
    adAccountId: string,
    adIds: string[],
    days: number,
    startDateStr?: string,
    endDateStr?: string
  ): Promise<Record<string, MetricsResult>> {
    const results: Record<string, MetricsResult> = {};
    
    try {
      // DEFINITIVO: Calcular exatamente os últimos N dias completos
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Data final: ONTEM (último dia completo)
      const endDate = new Date(today);
      endDate.setDate(today.getDate() - 1);
      
      // Data inicial: N dias antes de ontem
      const startDate = new Date(endDate);
      startDate.setDate(endDate.getDate() - (days - 1));
      
      const startDateStr = startDate.toISOString().slice(0, 10);
      const endDateStr = endDate.toISOString().slice(0, 10);

      // TikTok Reports API - get metrics for ads
      // Process ads in chunks due to API limitations
      for (const chunk of this.chunk(adIds, 100)) {
        try {
          const requestBody = {
            advertiser_id: adAccountId,
            report_type: 'BASIC',
            data_level: 'AUCTION_AD',
            dimensions: ['ad_id'],
            metrics: [
              'spend', 'impressions', 'clicks', 'ctr', 'cpc', 'cpm',
              'conversions', 'conversion_rate', 'cost_per_conversion',
              'total_conversion_value', 'video_play_actions', 'video_watched_2s'
            ],
            start_date: startDateStr,
            end_date: endDateStr,
            filters: [
              {
                field_name: 'ad_ids',
                filter_type: 'IN',
                filter_value: chunk
              }
            ]
          };

          const response = await fetch(
            'https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/',
            {
              method: 'POST',
              headers: {
                'Access-Token': token,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(requestBody)
            }
          );

          if (!response.ok) {
            throw new Error(`TikTok API error: ${response.status} ${response.statusText}`);
          }

          const data = await response.json() as any;
          
          if (data.code !== 0) {
            throw new Error(`TikTok API error: ${data.message}`);
          }
          
          // Process TikTok metrics
          if (data.data?.list) {
            for (const item of data.data.list) {
              const adId = item.dimensions?.ad_id;
              if (!adId) continue;
              
              const metrics = item.metrics || {};
              
              results[adId] = {
                ok: true,
                metrics: {
                  spend: parseFloat(metrics.spend || '0'),
                  impressions: parseInt(metrics.impressions || '0'),
                  clicks: parseInt(metrics.clicks || '0'),
                  ctr: parseFloat(metrics.ctr || '0'),
                  cpc: parseFloat(metrics.cpc || '0'),
                  cpm: parseFloat(metrics.cpm || '0'),
                  conversions: parseInt(metrics.conversions || '0'),
                  conversion_value: parseFloat(metrics.total_conversion_value || '0'),
                  cost_per_conversion: parseFloat(metrics.cost_per_conversion || '0'),
                  video_views: parseInt(metrics.video_play_actions || '0'),
                  video_views_2s: parseInt(metrics.video_watched_2s || '0'),
                  conversion_rate: parseFloat(metrics.conversion_rate || '0')
                }
              };
            }
          }
          
        } catch (error) {
          console.error(`[TIKTOK-METRICS] Error for chunk:`, error);
          
          // Add error for this chunk
          for (const adId of chunk) {
            if (!results[adId]) {
              results[adId] = {
                ok: false,
                error: error instanceof Error ? error.message : 'Unknown error'
              };
            }
          }
        }
      }
      
      // Fill in missing ads with empty results
      for (const adId of adIds) {
        if (!results[adId]) {
          results[adId] = {
            ok: false,
            error: 'No data available for this period'
          };
        }
      }
      
    } catch (error) {
      console.error('[TIKTOK-METRICS] Top level error:', error);
      
      // Return error for all requested ads
      for (const adId of adIds) {
        results[adId] = {
          ok: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
    
    return results;
  }

  async reactivateAd(token: string, adId: string): Promise<{ ok: boolean; error?: string }> {
    try {
      console.log(`[TIKTOK-REACTIVATE] Attempting to reactivate ad: ${adId}`);
      
      // TikTok uses POST to update ad status
      const requestBody = {
        advertiser_id: '', // Will need to be determined from context
        ad_ids: [adId],
        status: 'ENABLE'
      };

      const response = await fetch(
        'https://business-api.tiktok.com/open_api/v1.3/ad/status/update/',
        {
          method: 'POST',
          headers: {
            'Access-Token': token,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        }
      );

      if (!response.ok) {
        return {
          ok: false,
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }

      const data = await response.json() as any;
      
      if (data.code !== 0) {
        console.error('[TIKTOK-REACTIVATE] API error:', data);
        return {
          ok: false,
          error: data.message || 'TikTok API error'
        };
      }

      console.log(`[TIKTOK-REACTIVATE] Ad ${adId} reactivated successfully`);
      return { ok: true };
      
    } catch (error) {
      console.error('[TIKTOK-REACTIVATE] Error:', error);
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async pauseAd(token: string, adId: string): Promise<{ ok: boolean; error?: string }> {
    try {
      console.log(`[TIKTOK-PAUSE] Attempting to pause ad: ${adId}`);
      
      // TikTok uses POST to update ad status
      const requestBody = {
        advertiser_id: '', // Will need to be determined from context
        ad_ids: [adId],
        status: 'DISABLE'
      };

      const response = await fetch(
        'https://business-api.tiktok.com/open_api/v1.3/ad/status/update/',
        {
          method: 'POST',
          headers: {
            'Access-Token': token,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        }
      );

      if (!response.ok) {
        return {
          ok: false,
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }

      const data = await response.json() as any;
      
      if (data.code !== 0) {
        console.error('[TIKTOK-PAUSE] API error:', data);
        return {
          ok: false,
          error: data.message || 'TikTok API error'
        };
      }

      console.log(`[TIKTOK-PAUSE] Ad ${adId} paused successfully`);
      return { ok: true };
      
    } catch (error) {
      console.error('[TIKTOK-PAUSE] Error:', error);
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async fetchCampaigns(token: string, accountId: string): Promise<any[]> {
    try {

      const response = await fetch(
        `https://business-api.tiktok.com/open_api/v1.3/campaign/get/?advertiser_id=${accountId}`,
        {
          method: 'GET',
          headers: {
            'Access-Token': token,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch campaigns: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as any;
      
      if (data.code !== 0) {
        throw new Error(`TikTok API error: ${data.message}`);
      }

      return data.data?.list || [];
      
    } catch (error) {
      console.error('[TIKTOK] Error fetching campaigns:', error);
      throw error;
    }
  }

  private async fetchAdGroups(token: string, accountId: string): Promise<any[]> {
    try {

      const response = await fetch(
        `https://business-api.tiktok.com/open_api/v1.3/adgroup/get/?advertiser_id=${accountId}`,
        {
          method: 'GET',
          headers: {
            'Access-Token': token,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch ad groups: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as any;
      
      if (data.code !== 0) {
        throw new Error(`TikTok API error: ${data.message}`);
      }

      return data.data?.list || [];
      
    } catch (error) {
      console.error('[TIKTOK] Error fetching ad groups:', error);
      throw error;
    }
  }

  private async fetchAds(token: string, accountId: string): Promise<any[]> {
    try {

      const response = await fetch(
        `https://business-api.tiktok.com/open_api/v1.3/ad/get/?advertiser_id=${accountId}`,
        {
          method: 'GET',
          headers: {
            'Access-Token': token,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch ads: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as any;
      
      if (data.code !== 0) {
        throw new Error(`TikTok API error: ${data.message}`);
      }

      return data.data?.list || [];
      
    } catch (error) {
      console.error('[TIKTOK] Error fetching ads:', error);
      throw error;
    }
  }

  private chunk<T>(arr: T[], size: number): T[][] {
    const result: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      result.push(arr.slice(i, i + size));
    }
    return result;
  }
}
