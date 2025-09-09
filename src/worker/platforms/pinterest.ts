// Pinterest Ads platform implementation
import { BasePlatform, SyncResult, MetricsResult } from './base';

export class PinterestPlatform extends BasePlatform {
  id = 'pinterest';
  name = 'Pinterest Ads';

  async validateToken(token: string, accountId: string): Promise<boolean> {
    try {
      // Test Pinterest Ads API access
      const response = await fetch(
        `https://api.pinterest.com/v5/ad_accounts/${accountId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        console.error('[PINTEREST] Token validation failed:', response.status, response.statusText);
        return false;
      }
      
      const data = await response.json();
      console.log(`[PINTEREST] Token validation successful - Account: ${(data as any).name}, Status: ${(data as any).status}`);
      return true;
      
    } catch (error) {
      console.error('[PINTEREST] Token validation error:', error);
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
    console.log(`[PINTEREST-SYNC] Starting sync for account: ${adAccountId}`);
    
    try {
      // Clean up existing data for this account
      await db.prepare(`DELETE FROM campaigns WHERE ad_account_ref_id = ?`).bind(accountId).run();
      await db.prepare(`DELETE FROM ads_active_raw WHERE ad_account_ref_id = ?`).bind(accountId).run();

      // Fetch campaigns from Pinterest
      const campaigns = await this.fetchCampaigns(token, adAccountId);
      console.log(`[PINTEREST-SYNC] Found ${campaigns.length} campaigns`);
      
      let campaignCount = 0;
      const campaignObjectives = new Map<string, string>();
      
      for (const campaign of campaigns) {
        if (campaign.status === 'ACTIVE' || campaign.status === 'PAUSED') {
          await this.saveCampaign(db, {
            campaign_id: campaign.id,
            name: campaign.name || undefined,
            objective: campaign.objective || 'AWARENESS',
            ad_account_id: adAccountId,
            ad_account_ref_id: accountId,
            client_id: clientId
          });
          
          campaignObjectives.set(campaign.id, campaign.objective || 'AWARENESS');
          campaignCount++;
        }
      }

      // Fetch ad groups (Pinterest doesn't have individual ads like Meta, ad groups are the atomic unit)
      const adGroups = await this.fetchAdGroups(token, adAccountId);
      console.log(`[PINTEREST-SYNC] Found ${adGroups.length} ad groups`);
      
      let adsCount = 0;
      let skippedCount = 0;
      
      for (const adGroup of adGroups) {
        if ((adGroup.status === 'ACTIVE' || adGroup.status === 'PAUSED') && campaignObjectives.has(adGroup.campaign_id)) {
          try {
            await this.saveAd(db, {
              ad_id: adGroup.id,
              ad_name: adGroup.name || undefined,
              effective_status: adGroup.status === 'ACTIVE' ? 'ACTIVE' : 'PAUSED',
              creative_id: adGroup.id, // Pinterest ad groups act as the creative unit
              creative_thumb: undefined,
              object_story_id: undefined,
              campaign_id: adGroup.campaign_id,
              adset_id: adGroup.id,
              adset_optimization_goal: adGroup.optimization_goal_metadata?.optimization_goal_type || undefined,
              objective: campaignObjectives.get(adGroup.campaign_id) || undefined,
              ad_account_id: adAccountId,
              ad_account_ref_id: accountId,
              client_id: clientId
            });
            adsCount++;
          } catch (error) {
            console.error(`[PINTEREST-SYNC] Error saving ad group ${adGroup.id}:`, error);
            skippedCount++;
          }
        } else {
          skippedCount++;
        }
      }

      const syncDuration = Date.now() - startTime;
      console.log(`[PINTEREST-SYNC] Sync completed: ${campaignCount} campaigns, ${adsCount} ad groups, ${skippedCount} skipped, ${syncDuration}ms`);

      return {
        ok: true,
        campaigns: campaignCount,
        ads: adsCount,
        skipped: skippedCount
      };
      
    } catch (error) {
      console.error('[PINTEREST-SYNC] Sync error:', error);
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

      // Pinterest Analytics API - get metrics for ad groups
      for (const adId of adIds) {
        try {
          const metricsUrl = `https://api.pinterest.com/v5/ad_accounts/${adAccountId}/analytics`;
          const params = new URLSearchParams({
            start_date: startDateStr,
            end_date: endDateStr,
            granularity: 'TOTAL',
            columns: 'SPEND_IN_DOLLAR,IMPRESSION_1,CLICKTHROUGH_1,CTR,CPC_IN_DOLLAR,CPM_IN_DOLLAR,TOTAL_CONVERSIONS,TOTAL_CONVERSIONS_VALUE',
            entity_ids: adId,
            entity_types: 'AD_GROUP'
          });

          const response = await fetch(`${metricsUrl}?${params.toString()}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json'
            }
          });

          if (!response.ok) {
            throw new Error(`Pinterest API error: ${response.status} ${response.statusText}`);
          }

          const data = await response.json() as any;
          
          if (data.data && data.data.length > 0) {
            const metrics = data.data[0].metrics;
            
            results[adId] = {
              ok: true,
              metrics: {
                spend: parseFloat(metrics.SPEND_IN_DOLLAR || '0'),
                impressions: parseInt(metrics.IMPRESSION_1 || '0'),
                clicks: parseInt(metrics.CLICKTHROUGH_1 || '0'),
                ctr: parseFloat(metrics.CTR || '0'),
                cpc: parseFloat(metrics.CPC_IN_DOLLAR || '0'),
                cpm: parseFloat(metrics.CPM_IN_DOLLAR || '0'),
                conversions: parseInt(metrics.TOTAL_CONVERSIONS || '0'),
                conversion_value: parseFloat(metrics.TOTAL_CONVERSIONS_VALUE || '0'),
                cost_per_conversion: metrics.TOTAL_CONVERSIONS > 0 
                  ? parseFloat(metrics.SPEND_IN_DOLLAR || '0') / parseInt(metrics.TOTAL_CONVERSIONS)
                  : 0
              }
            };
          } else {
            results[adId] = {
              ok: false,
              error: 'No data available for this period'
            };
          }
          
        } catch (error) {
          console.error(`[PINTEREST-METRICS] Error for ad ${adId}:`, error);
          results[adId] = {
            ok: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      }
      
    } catch (error) {
      console.error('[PINTEREST-METRICS] Top level error:', error);
      
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
      console.log(`[PINTEREST-REACTIVATE] Attempting to reactivate ad group: ${adId}`);
      
      // Pinterest uses PATCH to update ad group status
      const response = await fetch(`https://api.pinterest.com/v5/ad_groups/${adId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'ACTIVE'
        })
      });

      if (!response.ok) {
        const errorData = await response.json() as any;
        console.error('[PINTEREST-REACTIVATE] API error:', errorData);
        return {
          ok: false,
          error: errorData?.message || `HTTP ${response.status}`
        };
      }

      console.log(`[PINTEREST-REACTIVATE] Ad group ${adId} reactivated successfully`);
      return { ok: true };
      
    } catch (error) {
      console.error('[PINTEREST-REACTIVATE] Error:', error);
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async pauseAd(token: string, adId: string): Promise<{ ok: boolean; error?: string }> {
    try {
      console.log(`[PINTEREST-PAUSE] Attempting to pause ad group: ${adId}`);
      
      // Pinterest uses PATCH to update ad group status
      const response = await fetch(`https://api.pinterest.com/v5/ad_groups/${adId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'PAUSED'
        })
      });

      if (!response.ok) {
        const errorData = await response.json() as any;
        console.error('[PINTEREST-PAUSE] API error:', errorData);
        return {
          ok: false,
          error: errorData?.message || `HTTP ${response.status}`
        };
      }

      console.log(`[PINTEREST-PAUSE] Ad group ${adId} paused successfully`);
      return { ok: true };
      
    } catch (error) {
      console.error('[PINTEREST-PAUSE] Error:', error);
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async fetchCampaigns(token: string, accountId: string): Promise<any[]> {
    try {
      const response = await fetch(
        `https://api.pinterest.com/v5/ad_accounts/${accountId}/campaigns?page_size=250`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch campaigns: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as any;
      return data.items || [];
      
    } catch (error) {
      console.error('[PINTEREST] Error fetching campaigns:', error);
      throw error;
    }
  }

  private async fetchAdGroups(token: string, accountId: string): Promise<any[]> {
    try {
      const response = await fetch(
        `https://api.pinterest.com/v5/ad_accounts/${accountId}/ad_groups?page_size=250`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch ad groups: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as any;
      return data.items || [];
      
    } catch (error) {
      console.error('[PINTEREST] Error fetching ad groups:', error);
      throw error;
    }
  }
}
