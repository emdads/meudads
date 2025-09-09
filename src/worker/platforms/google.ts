// Google Ads platform implementation
import { BasePlatform, SyncResult, MetricsResult } from './base';

export class GoogleAdsPlatform extends BasePlatform {
  id = 'google';
  name = 'Google Ads';

  async validateToken(token: string, accountId: string): Promise<boolean> {
    try {
      // Test Google Ads API access
      const response = await fetch(
        `https://googleads.googleapis.com/v16/customers/${accountId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'developer-token': 'YOUR_DEVELOPER_TOKEN', // Would need to be configured
            'Accept': 'application/json'
          }
        }
      );
      
      return response.ok;
    } catch (error) {
      console.error('[GOOGLE] Token validation error:', error);
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
    console.log(`[GOOGLE-SYNC] Starting sync for account: ${adAccountId}`);
    
    try {
      // Clean up existing data for this account
      await db.prepare(`DELETE FROM campaigns WHERE ad_account_ref_id = ?`).bind(accountId).run();
      await db.prepare(`DELETE FROM ads_active_raw WHERE ad_account_ref_id = ?`).bind(accountId).run();

      // Fetch campaigns
      const campaigns = await this.fetchCampaigns(token, adAccountId);
      console.log(`[GOOGLE-SYNC] Found ${campaigns.length} campaigns`);
      
      let campaignCount = 0;
      const campaignObjectives = new Map<string, string>();
      
      for (const campaign of campaigns) {
        if (campaign.status === 'ENABLED') {
          await this.saveCampaign(db, {
            campaign_id: campaign.id,
            name: campaign.name || undefined,
            objective: campaign.advertisingChannelType || 'SEARCH',
            ad_account_id: adAccountId,
            ad_account_ref_id: accountId,
            client_id: clientId
          });
          
          campaignObjectives.set(campaign.id, campaign.advertisingChannelType || 'SEARCH');
          campaignCount++;
        }
      }

      // Fetch ads
      const ads = await this.fetchAds(token, adAccountId);
      console.log(`[GOOGLE-SYNC] Found ${ads.length} ads`);
      
      let adsCount = 0;
      let skippedCount = 0;
      
      for (const ad of ads) {
        if (ad.status === 'ENABLED' && campaignObjectives.has(ad.campaignId)) {
          try {
            await this.saveAd(db, {
              ad_id: ad.id,
              ad_name: ad.name || undefined,
              effective_status: 'ACTIVE',
              creative_id: ad.id, // Google doesn't have separate creative IDs like Meta
              creative_thumb: undefined,
              object_story_id: undefined,
              campaign_id: ad.campaignId,
              adset_id: ad.adGroupId,
              adset_optimization_goal: ad.type || undefined,
              objective: campaignObjectives.get(ad.campaignId) || undefined,
              ad_account_id: adAccountId,
              ad_account_ref_id: accountId,
              client_id: clientId
            });
            adsCount++;
          } catch (error) {
            console.error(`[GOOGLE-SYNC] Error saving ad ${ad.id}:`, error);
            skippedCount++;
          }
        } else {
          skippedCount++;
        }
      }

      console.log(`[GOOGLE-SYNC] Sync completed: ${campaignCount} campaigns, ${adsCount} ads, ${skippedCount} skipped`);
      
      return {
        ok: true,
        campaigns: campaignCount,
        ads: adsCount,
        skipped: skippedCount
      };
      
    } catch (error) {
      console.error('[GOOGLE-SYNC] Sync error:', error);
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
      // Calculate date range - FIXED: Ensure consistent date calculation
      const now = new Date();
      
      // End date: yesterday (complete day)
      const endDate = new Date();
      endDate.setUTCDate(now.getUTCDate() - 1);
      endDate.setUTCHours(23, 59, 59, 999);
      
      // Start date: N days before end date (to get exactly N days)
      const startDate = new Date(endDate);
      startDate.setUTCDate(endDate.getUTCDate() - (days - 1));
      startDate.setUTCHours(0, 0, 0, 0);
      
      const dateRange = {
        start_date: startDate.toISOString().slice(0, 10),
        end_date: endDate.toISOString().slice(0, 10)
      };

      // Google Ads API query for metrics
      const query = `
        SELECT
          ad_group_ad.ad.id,
          ad_group_ad.ad.name,
          metrics.cost_micros,
          metrics.impressions,
          metrics.clicks,
          metrics.ctr,
          metrics.average_cpc,
          metrics.average_cpm,
          metrics.conversions,
          metrics.conversions_value,
          metrics.cost_per_conversion
        FROM ad_group_ad
        WHERE
          ad_group_ad.ad.id IN (${adIds.map(id => `'${id}'`).join(',')})
          AND segments.date BETWEEN '${dateRange.start_date}' AND '${dateRange.end_date}'
      `;

      const response = await fetch(
        `https://googleads.googleapis.com/v16/customers/${adAccountId}/googleAds:searchStream`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'developer-token': 'YOUR_DEVELOPER_TOKEN',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ query })
        }
      );

      if (!response.ok) {
        const errorData = await response.json() as any;
        throw new Error(`Google Ads API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json() as any;
      
      // Process Google Ads metrics
      for (const result of data.results || []) {
        const adId = result.adGroupAd?.ad?.id;
        if (!adId) continue;
        
        const metrics = result.metrics || {};
        
        results[adId] = {
          ok: true,
          metrics: {
            spend: (metrics.costMicros || 0) / 1000000, // Convert from micros
            impressions: metrics.impressions || 0,
            clicks: metrics.clicks || 0,
            ctr: metrics.ctr || 0,
            cpc: (metrics.averageCpc || 0) / 1000000, // Convert from micros
            cpm: (metrics.averageCpm || 0) / 1000000, // Convert from micros
            conversions: metrics.conversions || 0,
            conversion_value: metrics.conversionsValue || 0,
            cost_per_conversion: (metrics.costPerConversion || 0) / 1000000
          }
        };
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
      console.error('[GOOGLE-METRICS] Error:', error);
      
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

  async reactivateAd(_token: string, adId: string): Promise<{ ok: boolean; error?: string }> {
    try {
      console.log(`[GOOGLE-REACTIVATE] Attempting to reactivate ad: ${adId}`);
      
      // Note: Google Ads requires the customer ID and ad group ID to reactivate an ad
      // This is a simplified implementation - in reality, you'd need to store more context
      
      return {
        ok: false,
        error: 'Google Ads reactivate functionality not yet fully implemented. Requires additional API setup.'
      };
      
    } catch (error) {
      console.error('[GOOGLE-REACTIVATE] Error:', error);
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async pauseAd(_token: string, adId: string): Promise<{ ok: boolean; error?: string }> {
    try {
      // Note: Google Ads requires the customer ID and ad group ID to pause an ad
      // This is a simplified implementation - in reality, you'd need to store more context
      
      console.log(`[GOOGLE-PAUSE] Attempting to pause ad: ${adId}`);
      
      // This would require a proper Google Ads API call to update the ad status
      // For now, we'll return a placeholder response
      
      return {
        ok: false,
        error: 'Google Ads pause functionality not yet fully implemented. Requires additional API setup.'
      };
      
    } catch (error) {
      console.error('[GOOGLE-PAUSE] Error:', error);
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async fetchCampaigns(token: string, accountId: string): Promise<any[]> {
    const query = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type
      FROM campaign
      WHERE campaign.status = 'ENABLED'
    `;

    const response = await fetch(
      `https://googleads.googleapis.com/v16/customers/${accountId}/googleAds:searchStream`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'developer-token': 'YOUR_DEVELOPER_TOKEN',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
      }
    );

    if (!response.ok) {
      const errorData = await response.json() as any;
      throw new Error(`Failed to fetch campaigns: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json() as any;
    return (data.results || []).map((result: any) => ({
      id: result.campaign?.id,
      name: result.campaign?.name,
      status: result.campaign?.status,
      advertisingChannelType: result.campaign?.advertisingChannelType
    }));
  }

  private async fetchAds(token: string, accountId: string): Promise<any[]> {
    const query = `
      SELECT
        ad_group_ad.ad.id,
        ad_group_ad.ad.name,
        ad_group_ad.status,
        ad_group_ad.ad.type,
        campaign.id,
        ad_group.id
      FROM ad_group_ad
      WHERE ad_group_ad.status = 'ENABLED'
    `;

    const response = await fetch(
      `https://googleads.googleapis.com/v16/customers/${accountId}/googleAds:searchStream`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'developer-token': 'YOUR_DEVELOPER_TOKEN',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
      }
    );

    if (!response.ok) {
      const errorData = await response.json() as any;
      throw new Error(`Failed to fetch ads: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json() as any;
    return (data.results || []).map((result: any) => ({
      id: result.adGroupAd?.ad?.id,
      name: result.adGroupAd?.ad?.name,
      status: result.adGroupAd?.status,
      type: result.adGroupAd?.ad?.type,
      campaignId: result.campaign?.id,
      adGroupId: result.adGroup?.id
    }));
  }
}
