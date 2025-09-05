// Meta (Facebook/Instagram) Ads platform implementation
import { BasePlatform, SyncResult, MetricsResult } from './base';
import { toActPath } from '../crypto';

export class MetaPlatform extends BasePlatform {
  id = 'meta';
  name = 'Meta Ads';

  async validateToken(token: string, accountId: string): Promise<boolean> {
    try {
      const actPath = toActPath(accountId);
      const graphVersion = 'v23.0'; // Could be passed as parameter
      
      const testUrl = `https://graph.facebook.com/${graphVersion}/${actPath}?fields=name,account_status,account_id&access_token=${token}`;
      const response = await fetch(testUrl);
      const data = await response.json();
      
      if (!response.ok) {
        console.error('[META] Token validation failed:', data);
        return false;
      }
      
      console.log(`[META] Token validation successful - Account: ${(data as any).name}, Status: ${(data as any).account_status}`);
      return true;
      
    } catch (error) {
      console.error('[META] Token validation error:', error);
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
    console.log(`[META-SYNC] Starting sync for account: ${adAccountId}`);
    
    try {
      const actPath = toActPath(adAccountId);
      const graphVersion = 'v21.0';
      
      // Clean up existing data for this account
      await db.prepare(`DELETE FROM campaigns WHERE ad_account_ref_id = ?`).bind(accountId).run();
      await db.prepare(`DELETE FROM ads_active_raw WHERE ad_account_ref_id = ?`).bind(accountId).run();

      // Fetch ACTIVE campaigns from Meta
      const campaignsUrl = `https://graph.facebook.com/${graphVersion}/${actPath}/campaigns?fields=id,name,objective&effective_status=["ACTIVE"]&limit=200&access_token=${token}`;
      
      const campaignsResponse = await fetch(campaignsUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MetaAdsManager/1.0)',
          'Accept': 'application/json'
        }
      });
      
      if (!campaignsResponse.ok) {
        const errorData = await campaignsResponse.json() as any;
        throw new Error(`Meta campaigns API error: ${errorData.error?.message || campaignsResponse.statusText}`);
      }
      
      const campaignsData = await campaignsResponse.json() as any;
      console.log(`[META-SYNC] Found ${campaignsData.data?.length || 0} ACTIVE campaigns`);

      // Save campaigns and build objective mapping
      const objectiveByCampaignId = new Map<string, string>();
      let campaignCount = 0;
      
      for (const campaign of campaignsData.data || []) {
        objectiveByCampaignId.set(campaign.id, campaign.objective);
        
        await this.saveCampaign(db, {
          campaign_id: campaign.id,
          name: campaign.name || undefined,
          objective: campaign.objective || undefined,
          ad_account_id: adAccountId,
          ad_account_ref_id: accountId,
          client_id: clientId
        });
        
        campaignCount++;
      }

      // Fetch ACTIVE ads
      const basicFields = "id,name,effective_status,campaign_id,adset_id";
      const expandedFields = "adset{optimization_goal,id},creative{id,thumbnail_url,effective_object_story_id}";
      
      let adsBaseUrl = `https://graph.facebook.com/${graphVersion}/${actPath}/ads?fields=${basicFields}&effective_status=["ACTIVE"]&limit=100&access_token=${token}`;
      
      // Fetch with basic fields first
      let allAds = await this.fetchAll(adsBaseUrl, 50, 3);
      console.log(`[META-SYNC] Meta API returned ${allAds.length} ads total`);
      
      // Try to enrich with expanded fields if reasonable number of ads
      if (allAds.length > 0 && allAds.length <= 500) {
        try {
          const enrichUrl = `https://graph.facebook.com/${graphVersion}/${actPath}/ads?fields=${basicFields},${expandedFields}&effective_status=["ACTIVE"]&limit=100&access_token=${token}`;
          const enrichedAds = await this.fetchAll(enrichUrl, 50, 2);
          
          if (enrichedAds.length === allAds.length) {
            allAds = enrichedAds;
            console.log(`[META-SYNC] Successfully enriched all ${allAds.length} ads`);
          }
        } catch (enrichError) {
          console.warn(`[META-SYNC] Enrichment failed, using basic data:`, enrichError);
        }
      }

      // Filter ads to only include those from valid ACTIVE campaigns
      const validCampaignIds = new Set(Array.from(objectiveByCampaignId.keys()));
      const adsFromActiveCampaigns = allAds.filter((ad: any) => 
        ad.campaign_id && validCampaignIds.has(ad.campaign_id)
      );

      // Save ACTIVE ads
      let adsCount = 0;
      let skippedCount = 0;
      const processedIds = new Set<string>();
      
      for (const ad of adsFromActiveCampaigns) {
        // Skip duplicates
        if (processedIds.has(ad.id)) {
          skippedCount++;
          continue;
        }
        processedIds.add(ad.id);
        
        // Only save truly ACTIVE ads
        if (ad.effective_status !== 'ACTIVE' || !ad.id || !ad.campaign_id) {
          skippedCount++;
          continue;
        }
        
        const objective = objectiveByCampaignId.get(ad.campaign_id) || null;
        
        try {
          await this.saveAd(db, {
            ad_id: ad.id,
            ad_name: ad.name || undefined,
            effective_status: 'ACTIVE',
            creative_id: ad.creative?.id || undefined,
            creative_thumb: ad.creative?.thumbnail_url || undefined,
            object_story_id: ad.creative?.effective_object_story_id || undefined,
            campaign_id: ad.campaign_id || undefined,
            adset_id: ad.adset_id || undefined,
            adset_optimization_goal: ad.adset?.optimization_goal || undefined,
            objective: objective || undefined,
            ad_account_id: adAccountId,
            ad_account_ref_id: accountId,
            client_id: clientId
          });
          
          adsCount++;
        } catch (dbError) {
          console.error(`[META-SYNC] Database error saving ad ${ad.id}:`, dbError);
          skippedCount++;
        }
      }
      
      const syncDuration = Date.now() - startTime;
      console.log(`[META-SYNC] Sync completed: ${campaignCount} campaigns, ${adsCount} ads, ${skippedCount} skipped, ${syncDuration}ms`);

      return {
        ok: true,
        campaigns: campaignCount,
        ads: adsCount,
        skipped: skippedCount
      };
      
    } catch (error) {
      console.error('[META-SYNC] Sync error:', error);
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
    days: number
  ): Promise<Record<string, MetricsResult>> {
    console.log(`[META-METRICS-DEBUG] ==================== META METRICS START ====================`);
    console.log(`[META-METRICS-DEBUG] Account: ${adAccountId}, Ads: ${adIds.length}, Days: ${days}`);
    
    const results: Record<string, MetricsResult> = {};
    
    try {
      // DEFINITIVO: Calcular exatamente os últimos N dias completos 
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Zerar horas de hoje
      
      // Data final: ONTEM (último dia completo de dados)
      const untilDate = new Date(today);
      untilDate.setDate(today.getDate() - 1); // Ontem
      
      // Data inicial: exatamente N dias antes de ontem (inclusivo)
      // Para 7 dias: se ontem=24, então início=24-6=18. Dias: 18,19,20,21,22,23,24 = 7 dias
      const sinceDate = new Date(untilDate);
      sinceDate.setDate(untilDate.getDate() - (days - 1));
      
      const sinceStr = sinceDate.toISOString().slice(0, 10);
      const untilStr = untilDate.toISOString().slice(0, 10);
      
      // Verificação: contar dias entre as datas (deve ser igual a N)
      const diffTime = untilDate.getTime() - sinceDate.getTime();
      const actualDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
      
      console.log(`[META-METRICS] Date range corrected for exactly ${days} days:`, {
        today: today.toISOString(),
        requestedDays: days,
        actualDays: actualDays,
        sinceDate: sinceDate.toISOString(),
        untilDate: untilDate.toISOString(),
        sinceStr,
        untilStr,
        period: `${sinceStr} até ${untilStr} (${actualDays} dias calculados, ${days} solicitados)`
      });
      
      const graphVersion = 'v23.0';
      const act = toActPath(adAccountId);

      // Action type mappings for Meta - TODAS as conversões disponíveis
      const KEYS_PURCHASE = ["omni_purchase", "offsite_conversion.fb_pixel_purchase", "purchase", "offsite_conversion.purchase"];
      const KEYS_LEAD = ["omni_lead", "offsite_conversion.fb_pixel_lead", "lead", "offsite_conversion.lead"];
      const KEYS_MSG = ["onsite_conversion.messaging_conversation_started_7d", "messaging_conversation_started_7d"];
      const KEYS_LPV = ["landing_page_view", "omni_landing_page_view"];
      const KEYS_TP = ["thruplay", "omni_thruplay"];
      const KEYS_VIDEO_VIEW = ["video_view", "omni_video_view"];
      const KEYS_PROFILE = ["profile_visit", "profile_visits"];
      const KEYS_POST_ENG = ["post_engagement", "omni_post_engagement"];
      const KEYS_LINK_CLICK = ["link_click", "omni_link_click"];
      const KEYS_PAGE_ENGAGEMENT = ["page_engagement", "omni_page_engagement"];
      const KEYS_APP_INSTALL = ["mobile_app_install", "omni_app_install", "app_install"];
      const KEYS_ADD_TO_CART = ["add_to_cart", "omni_add_to_cart", "offsite_conversion.fb_pixel_add_to_cart"];
      const KEYS_INITIATE_CHECKOUT = ["initiate_checkout", "omni_initiate_checkout", "offsite_conversion.fb_pixel_initiate_checkout"];
      const KEYS_ADD_PAYMENT_INFO = ["add_payment_info", "omni_add_payment_info", "offsite_conversion.fb_pixel_add_payment_info"];
      const KEYS_COMPLETE_REGISTRATION = ["complete_registration", "omni_complete_registration", "offsite_conversion.fb_pixel_complete_registration"];
      const KEYS_SEARCH = ["search", "omni_search", "offsite_conversion.fb_pixel_search"];
      const KEYS_SUBSCRIBE = ["subscribe", "omni_subscribe"];
      const KEYS_START_TRIAL = ["start_trial", "omni_start_trial"];
      const KEYS_SUBMIT_APPLICATION = ["submit_application", "omni_submit_application"];
      const KEYS_CONTACT = ["contact", "omni_contact"];
      const KEYS_CUSTOMIZE_PRODUCT = ["customize_product", "omni_customize_product"];
      const KEYS_FIND_LOCATION = ["find_location", "omni_find_location"];
      const KEYS_SCHEDULE = ["schedule", "omni_schedule"];
      const KEYS_ADD_TO_WISHLIST = ["add_to_wishlist", "omni_add_to_wishlist", "offsite_conversion.fb_pixel_add_to_wishlist"];
      const KEYS_VIEW_CONTENT = ["view_content", "omni_view_content", "offsite_conversion.fb_pixel_view_content"];
      const KEYS_ACHIEVE_LEVEL = ["achieve_level", "omni_achieve_level"];
      const KEYS_UNLOCK_ACHIEVEMENT = ["unlock_achievement", "omni_unlock_achievement"];
      const KEYS_SPEND_CREDITS = ["spend_credits", "omni_spend_credits"];
      const KEYS_RATE = ["rate", "omni_rate"];
      const KEYS_TUTORIAL_COMPLETION = ["tutorial_completion", "omni_tutorial_completion"];
      const KEYS_D2_RETENTION = ["d2_retention", "omni_d2_retention"];
      const KEYS_D7_RETENTION = ["d7_retention", "omni_d7_retention"];
      const KEYS_DONATE = ["donate", "omni_donate"];
      const KEYS_OTHER = ["other", "omni_other"];

      // Fields for insights - incluindo todas as métricas diretas da API + optimization goal
      const iFields = [
        "ad_id", "ad_name", "adset_id",
        "impressions", "reach", "spend",
        "clicks", "inline_link_clicks", "ctr", "inline_link_click_ctr", "cpc", "cpm", "cost_per_inline_link_click",
        "actions", "action_values", "cost_per_action_type", "purchase_roas",
        "conversion_rate_ranking", "quality_ranking", "engagement_rate_ranking"
      ].join(",");

      // SISTEMA OTIMIZADO: Chunks menores e mais eficientes
      const maxBatchSize = adIds.length > 200 ? 10 : adIds.length > 100 ? 15 : adIds.length > 50 ? 25 : 40;
      const chunks = this.chunk(adIds, maxBatchSize);
      
      console.log(`[META-METRICS-OPTIMIZED] Processing ${adIds.length} ads in ${chunks.length} optimized chunks of max ${maxBatchSize} ads each`);
      
      // Delay inteligente baseado no volume total
      const shouldDelay = adIds.length > 30;
      const delayMs = adIds.length > 200 ? 1200 : adIds.length > 100 ? 800 : adIds.length > 50 ? 500 : 300;
      
      // Process ads in chunks
      for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
        const slice = chunks[chunkIndex];
        console.log(`[META-METRICS-DEBUG] Processing chunk ${chunkIndex + 1}/${chunks.length} with ${slice.length} ads`);
        
        // Add delay between chunks for large batches to avoid rate limits
        if (shouldDelay && chunkIndex > 0) {
          console.log(`[META-METRICS-DEBUG] Adding ${delayMs}ms delay before chunk ${chunkIndex + 1}`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
        
        const timeRange = JSON.stringify({since: sinceStr, until: untilStr});
        const filtering = JSON.stringify([{ field: "ad.id", operator: "IN", value: slice }]);
        
        const baseUrl = `https://graph.facebook.com/${graphVersion}/${act}/insights`;
        const insightsUrl = `${baseUrl}?level=ad&fields=${iFields}&time_range=${encodeURIComponent(timeRange)}&filtering=${encodeURIComponent(filtering)}&limit=200&access_token=${encodeURIComponent(token)}`;
        
        console.log(`[META-METRICS-DEBUG] Calling Meta Insights API...`);
        console.log(`[META-METRICS-DEBUG] URL: ${baseUrl}?level=ad&fields=${iFields}&time_range=...&filtering=...`);
        
        try {
          // TIMEOUT OTIMIZADO: Páginas limitadas para evitar timeouts
          const maxPages = slice.length > 20 ? 3 : slice.length > 10 ? 4 : 5;
          const list = await this.fetchAll(insightsUrl, maxPages);
          console.log(`[META-METRICS-DEBUG] ✅ Received ${list.length} insights from Meta API (chunk ${chunkIndex + 1}/${chunks.length})`);
          
          // Para cada insight, vamos buscar o adset info para pegar o optimization_goal
          const adsetIds = [...new Set(list.map(row => row?.adset_id).filter(Boolean))];
          const adsetOptimizationGoals = new Map<string, string>();
          
          // Buscar optimization goals dos adsets em batch
          if (adsetIds.length > 0) {
            try {
              const adsetFields = "id,optimization_goal";
              const adsetUrl = `https://graph.facebook.com/${graphVersion}/?ids=${adsetIds.join(',')}&fields=${adsetFields}&access_token=${encodeURIComponent(token)}`;
              const adsetResponse = await fetch(adsetUrl);
              
              if (adsetResponse.ok) {
                const adsetData = await adsetResponse.json() as any;
                
                for (const [adsetId, adsetInfo] of Object.entries(adsetData)) {
                  if ((adsetInfo as any)?.optimization_goal) {
                    adsetOptimizationGoals.set(adsetId, (adsetInfo as any).optimization_goal);
                  }
                }
              }
            } catch (adsetError) {
              console.warn('[META-METRICS] Failed to fetch adset optimization goals:', adsetError);
            }
          }
          
          for (const row of list) {
            const id = String(row?.ad_id || "");
            if (!id) continue;
            
            // Adicionar optimization goal do adset ao row
            const adsetId = row?.adset_id;
            if (adsetId && adsetOptimizationGoals.has(adsetId)) {
              row.optimization_goal = adsetOptimizationGoals.get(adsetId);
            }
            
            const actions = Array.isArray(row?.actions) ? row.actions : [];
            const aValues = Array.isArray(row?.action_values) ? row.action_values : [];
            const costPerAction = Array.isArray(row?.cost_per_action_type) ? row.cost_per_action_type : [];
            const purchaseRoas = Array.isArray(row?.purchase_roas) ? row.purchase_roas : [];
            
            // Métricas de conversão diretas da API - TODAS as possíveis
            const purchases = this.pickAction(actions, KEYS_PURCHASE);
            const leads = this.pickAction(actions, KEYS_LEAD);
            const conversations = this.pickAction(actions, KEYS_MSG);
            const lpv = this.pickAction(actions, KEYS_LPV);
            const thruplays = this.pickAction(actions, KEYS_TP);
            const videoViews = this.pickAction(actions, KEYS_VIDEO_VIEW);
            const profileVisits = this.pickAction(actions, KEYS_PROFILE);
            const postEngagement = this.pickAction(actions, KEYS_POST_ENG);
            const linkClicks = this.pickAction(actions, KEYS_LINK_CLICK);
            const pageEngagement = this.pickAction(actions, KEYS_PAGE_ENGAGEMENT);
            const appInstalls = this.pickAction(actions, KEYS_APP_INSTALL);
            const addToCart = this.pickAction(actions, KEYS_ADD_TO_CART);
            const initiateCheckout = this.pickAction(actions, KEYS_INITIATE_CHECKOUT);
            const addPaymentInfo = this.pickAction(actions, KEYS_ADD_PAYMENT_INFO);
            const completeRegistration = this.pickAction(actions, KEYS_COMPLETE_REGISTRATION);
            const search = this.pickAction(actions, KEYS_SEARCH);
            const subscribe = this.pickAction(actions, KEYS_SUBSCRIBE);
            const startTrial = this.pickAction(actions, KEYS_START_TRIAL);
            const submitApplication = this.pickAction(actions, KEYS_SUBMIT_APPLICATION);
            const contact = this.pickAction(actions, KEYS_CONTACT);
            const customizeProduct = this.pickAction(actions, KEYS_CUSTOMIZE_PRODUCT);
            const findLocation = this.pickAction(actions, KEYS_FIND_LOCATION);
            const schedule = this.pickAction(actions, KEYS_SCHEDULE);
            const addToWishlist = this.pickAction(actions, KEYS_ADD_TO_WISHLIST);
            const viewContent = this.pickAction(actions, KEYS_VIEW_CONTENT);
            const achieveLevel = this.pickAction(actions, KEYS_ACHIEVE_LEVEL);
            const unlockAchievement = this.pickAction(actions, KEYS_UNLOCK_ACHIEVEMENT);
            const spendCredits = this.pickAction(actions, KEYS_SPEND_CREDITS);
            const rate = this.pickAction(actions, KEYS_RATE);
            const tutorialCompletion = this.pickAction(actions, KEYS_TUTORIAL_COMPLETION);
            const d2Retention = this.pickAction(actions, KEYS_D2_RETENTION);
            const d7Retention = this.pickAction(actions, KEYS_D7_RETENTION);
            const donate = this.pickAction(actions, KEYS_DONATE);
            const other = this.pickAction(actions, KEYS_OTHER);
            
            // CPA direto da API Meta (cost_per_action_type) - TODOS os tipos
            const cpaPurchase = this.pickCPA(costPerAction, KEYS_PURCHASE);
            const cpaLead = this.pickCPA(costPerAction, KEYS_LEAD);
            const cpaConversation = this.pickCPA(costPerAction, KEYS_MSG);
            const cpaLPV = this.pickCPA(costPerAction, KEYS_LPV);
            const cpaThruplay = this.pickCPA(costPerAction, KEYS_TP);
            const cpaVideoView = this.pickCPA(costPerAction, KEYS_VIDEO_VIEW);
            const cpaProfileVisit = this.pickCPA(costPerAction, KEYS_PROFILE);
            const cpaPostEngagement = this.pickCPA(costPerAction, KEYS_POST_ENG);
            const cpaLinkClick = this.pickCPA(costPerAction, KEYS_LINK_CLICK);
            const cpaAppInstall = this.pickCPA(costPerAction, KEYS_APP_INSTALL);
            const cpaAddToCart = this.pickCPA(costPerAction, KEYS_ADD_TO_CART);
            const cpaCompleteRegistration = this.pickCPA(costPerAction, KEYS_COMPLETE_REGISTRATION);
            
            // CPA inteligente baseado na meta de otimização do anúncio
            let generalCPA = 0;
            const optimizationGoal = row?.optimization_goal?.toUpperCase() || '';
            
            // Se é otimizado para Landing Page Views, priorizar CPA de LPV
            if (optimizationGoal === 'LANDING_PAGE_VIEWS' && cpaLPV > 0) {
              generalCPA = cpaLPV;
            }
            // Se é otimizado para Leads, priorizar CPA de Lead
            else if (optimizationGoal === 'LEAD_GENERATION' && cpaLead > 0) {
              generalCPA = cpaLead;
            }
            // Se é otimizado para Conversões/Compras, priorizar CPA de Purchase
            else if ((optimizationGoal === 'OFFSITE_CONVERSIONS' || optimizationGoal === 'CONVERSIONS' || optimizationGoal === 'PURCHASES') && cpaPurchase > 0) {
              generalCPA = cpaPurchase;
            }
            // Se é otimizado para Conversas, priorizar CPA de Conversation
            else if ((optimizationGoal === 'CONVERSATIONS' || optimizationGoal === 'MESSAGING_CONVERSATIONS_STARTED') && cpaConversation > 0) {
              generalCPA = cpaConversation;
            }
            // Se é otimizado para ThruPlay, priorizar CPA de ThruPlay
            else if ((optimizationGoal === 'THRUPLAY' || optimizationGoal === 'THRUPLAYS') && cpaThruplay > 0) {
              generalCPA = cpaThruplay;
            }
            // Se é otimizado para Video Views, priorizar CPA de Video View
            else if (optimizationGoal === 'VIDEO_VIEWS' && cpaVideoView > 0) {
              generalCPA = cpaVideoView;
            }
            // Se é otimizado para App Installs, priorizar CPA de App Install
            else if ((optimizationGoal === 'APP_INSTALLS' || optimizationGoal === 'MOBILE_APP_INSTALLS') && cpaAppInstall > 0) {
              generalCPA = cpaAppInstall;
            }
            // Hierarquia geral como fallback (valor de negócio decrescente)
            else if (cpaPurchase > 0) generalCPA = cpaPurchase;
            else if (cpaLead > 0) generalCPA = cpaLead;
            else if (cpaCompleteRegistration > 0) generalCPA = cpaCompleteRegistration;
            else if (cpaConversation > 0) generalCPA = cpaConversation;
            else if (cpaAppInstall > 0) generalCPA = cpaAppInstall;
            else if (cpaAddToCart > 0) generalCPA = cpaAddToCart;
            else if (cpaLPV > 0) generalCPA = cpaLPV;
            else if (cpaThruplay > 0) generalCPA = cpaThruplay;
            else if (cpaVideoView > 0) generalCPA = cpaVideoView;
            else if (cpaPostEngagement > 0) generalCPA = cpaPostEngagement;
            else if (cpaProfileVisit > 0) generalCPA = cpaProfileVisit;
            else if (cpaLinkClick > 0) generalCPA = cpaLinkClick;

            // Debug específico para o anúncio 6576852772185 - LPV FOCUS
            if (id === '6576852772185') {
              console.log(`[DEBUG-CPA-LPV-${id}] ========== ANÁLISE DETALHADA CPA LPV ==========`);
              console.log(`[DEBUG-CPA-LPV-${id}] Meta de otimização: ${row?.optimization_goal}`);
              console.log(`[DEBUG-CPA-LPV-${id}] Gasto total: R$ ${this.safeNum(row?.spend).toFixed(2)}`);
              console.log(`[DEBUG-CPA-LPV-${id}] Landing Page Views: ${lpv}`);
              console.log(`[DEBUG-CPA-LPV-${id}] CPA LPV da API: R$ ${cpaLPV.toFixed(4)}`);
              console.log(`[DEBUG-CPA-LPV-${id}] CPA LPV manual: R$ ${lpv > 0 ? (this.safeNum(row?.spend) / lpv).toFixed(4) : 'N/A'}`);
              console.log(`[DEBUG-CPA-LPV-${id}] CPA selecionado pelo sistema: R$ ${generalCPA.toFixed(4)}`);
              console.log(`[DEBUG-CPA-LPV-${id}] Comparação com Meta Ads Manager (R$ 0,03):`);
              console.log(`[DEBUG-CPA-LPV-${id}] - Diferença: R$ ${Math.abs(generalCPA - 0.03).toFixed(4)}`);
              console.log(`[DEBUG-CPA-LPV-${id}] - Status: ${Math.abs(generalCPA - 0.03) < 0.001 ? '✅ CORRETO' : '❌ INCORRETO'}`);
              
              console.log(`[DEBUG-CPA-LPV-${id}] Dados brutos da API Meta:`);
              console.log(`[DEBUG-CPA-LPV-${id}] - Actions:`, actions.filter((a: any) => a.action_type?.includes('landing_page')));
              console.log(`[DEBUG-CPA-LPV-${id}] - Cost per action:`, costPerAction.filter((a: any) => a.action_type?.includes('landing_page')));
              
              console.log(`[DEBUG-CPA-LPV-${id}] Todos os CPAs calculados:`, {
                cpaPurchase: cpaPurchase > 0 ? `R$ ${cpaPurchase.toFixed(4)}` : 'N/A',
                cpaLead: cpaLead > 0 ? `R$ ${cpaLead.toFixed(4)}` : 'N/A',
                cpaLPV: cpaLPV > 0 ? `R$ ${cpaLPV.toFixed(4)}` : 'N/A',
                cpaConversation: cpaConversation > 0 ? `R$ ${cpaConversation.toFixed(4)}` : 'N/A',
                cpaThruplay: cpaThruplay > 0 ? `R$ ${cpaThruplay.toFixed(4)}` : 'N/A'
              });
              console.log(`[DEBUG-CPA-LPV-${id}] ========================================`);
            }

            results[id] = {
              ok: true,
              metrics: {
                // Métricas básicas diretas da API
                spend: this.safeNum(row?.spend),
                impressions: this.safeNum(row?.impressions),
                reach: this.safeNum(row?.reach),
                clicks: this.safeNum(row?.clicks),
                ctr: this.safeNum(row?.inline_link_click_ctr || row?.ctr),
                cpc: this.safeNum(row?.cpc),
                cpm: this.safeNum(row?.cpm),
                
                // CPA direto da API Meta
                cpa: generalCPA,
                
                // Link clicks diretos da API
                link_clicks: this.safeNum(row?.inline_link_clicks),
                cost_per_link_click: this.safeNum(row?.cost_per_inline_link_click),
                
                // Conversões individuais diretas da API - TODAS as métricas
                purchases: purchases,
                leads: leads,
                conversations: conversations,
                landing_page_views: lpv,
                thruplays: thruplays,
                video_views: videoViews,
                profile_visits: profileVisits,
                post_engagement: postEngagement,
                link_clicks_action: linkClicks, // Link clicks da action (diferente do inline_link_clicks)
                page_engagement: pageEngagement,
                app_installs: appInstalls,
                add_to_cart: addToCart,
                initiate_checkout: initiateCheckout,
                add_payment_info: addPaymentInfo,
                complete_registration: completeRegistration,
                search: search,
                subscribe: subscribe,
                start_trial: startTrial,
                submit_application: submitApplication,
                contact: contact,
                customize_product: customizeProduct,
                find_location: findLocation,
                schedule: schedule,
                add_to_wishlist: addToWishlist,
                view_content: viewContent,
                achieve_level: achieveLevel,
                unlock_achievement: unlockAchievement,
                spend_credits: spendCredits,
                rate: rate,
                tutorial_completion: tutorialCompletion,
                d2_retention: d2Retention,
                d7_retention: d7Retention,
                donate: donate,
                other: other,
                
                // Resultado específico baseado na meta de otimização do criativo
                results: this.getSpecificResult(row, {
                  purchases, leads, conversations, lpv, thruplays, videoViews,
                  profileVisits, postEngagement, linkClicks, pageEngagement, appInstalls,
                  addToCart, initiateCheckout, addPaymentInfo, completeRegistration,
                  search, subscribe, startTrial, submitApplication, contact,
                  customizeProduct, findLocation, schedule, addToWishlist, viewContent,
                  achieveLevel, unlockAchievement, spendCredits, rate, tutorialCompletion,
                  d2Retention, d7Retention, donate, other
                }),
                
                // Total de conversões (focado em compras como principal métrica)
                conversions: purchases,
                
                // Valores e custos diretos da API - TODOS os tipos
                revenue: this.pickAction(aValues, KEYS_PURCHASE),
                cost_per_purchase: cpaPurchase,
                cost_per_lead: cpaLead,
                cost_per_conversation: cpaConversation,
                cost_per_landing_page_view: cpaLPV,
                cost_per_thruplay: cpaThruplay,
                cost_per_video_view: cpaVideoView,
                cost_per_profile_visit: cpaProfileVisit,
                cost_per_post_engagement: cpaPostEngagement,
                cost_per_app_install: cpaAppInstall,
                cost_per_add_to_cart: cpaAddToCart,
                cost_per_complete_registration: cpaCompleteRegistration,
                cost_per_initiate_checkout: this.pickCPA(costPerAction, KEYS_INITIATE_CHECKOUT),
                cost_per_add_payment_info: this.pickCPA(costPerAction, KEYS_ADD_PAYMENT_INFO),
                cost_per_search: this.pickCPA(costPerAction, KEYS_SEARCH),
                cost_per_subscribe: this.pickCPA(costPerAction, KEYS_SUBSCRIBE),
                cost_per_start_trial: this.pickCPA(costPerAction, KEYS_START_TRIAL),
                cost_per_submit_application: this.pickCPA(costPerAction, KEYS_SUBMIT_APPLICATION),
                cost_per_contact: this.pickCPA(costPerAction, KEYS_CONTACT),
                cost_per_view_content: this.pickCPA(costPerAction, KEYS_VIEW_CONTENT),
                cost_per_add_to_wishlist: this.pickCPA(costPerAction, KEYS_ADD_TO_WISHLIST),
                
                // ROAS direto da API
                roas: this.pickROAS(purchaseRoas, KEYS_PURCHASE)
              }
            };
          }
        } catch (error: any) {
          console.error(`[META-METRICS-DEBUG] ❌ Error fetching chunk ${chunkIndex + 1}:`, error);
          console.error(`[META-METRICS-DEBUG] Error type:`, error.name);
          console.error(`[META-METRICS-DEBUG] Error details:`, error.message);
          
          // Add error for this batch
          for (const adId of slice) {
            if (!results[adId]) {
              results[adId] = {
                ok: false,
                error: error.message || 'Erro na API do Meta'
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
      console.error('[META-METRICS-DEBUG] ❌ Top level error:', error);
      console.error('[META-METRICS-DEBUG] Error stack:', error instanceof Error ? error.stack : 'No stack');
      
      // Return error for all requested ads
      for (const adId of adIds) {
        results[adId] = {
          ok: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        };
      }
    }
    
    console.log(`[META-METRICS-DEBUG] ==================== META METRICS END ====================`);
    return results;
  }

  async reactivateAd(token: string, adId: string): Promise<{ ok: boolean; error?: string }> {
    try {
      // Using latest Meta Marketing API version as of 2024/2025
      const graphVersion = 'v20.0'; // v20.0 is the current stable version for Marketing API
      const reactivateUrl = `https://graph.facebook.com/${graphVersion}/${adId}`;
      
      console.log(`[META-REACTIVATE] Starting reactivation for ad: ${adId} using API ${graphVersion}`);
      
      // CRITICAL: Meta Marketing API requires status update via POST with proper form data
      // Documentation: https://developers.facebook.com/docs/marketing-api/reference/adgroup
      const formData = new URLSearchParams();
      formData.append('status', 'ACTIVE'); // Use 'status' field to reactivate
      formData.append('access_token', token);
      
      const response = await fetch(reactivateUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'MeuDads/1.0 (Meta Marketing API Client)',
          'Accept': 'application/json'
        },
        body: formData.toString()
      });

      console.log(`[META-REACTIVATE] API Response status: ${response.status}`);
      
      // Handle rate limiting properly
      const retryAfter = response.headers.get('retry-after');
      if (retryAfter) {
        const waitTime = parseInt(retryAfter) * 1000;
        console.log(`[META-REACTIVATE] Rate limited, waiting ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return {
          ok: false,
          error: `Rate limit atingido. Aguarde ${Math.ceil(parseInt(retryAfter) / 60)} minutos e tente novamente.`
        };
      }
      
      let data: any;
      try {
        data = await response.json();
        console.log(`[META-REACTIVATE] API Response data:`, data);
      } catch (parseError) {
        const textResponse = await response.text();
        console.log('[META-REACTIVATE] Raw response:', textResponse);
        
        // If we get a 200 OK but can't parse JSON, it might still be successful
        if (response.ok && textResponse.includes('success')) {
          console.log(`[META-REACTIVATE] ✅ Success inferred from text response`);
          return { ok: true };
        }
        
        return {
          ok: false,
          error: `Resposta inválida da API: ${textResponse.substring(0, 100)}`
        };
      }

      if (!response.ok) {
        console.error('[META-REACTIVATE] ❌ API error:', data);
        
        const errorCode = data?.error?.code;
        const errorMessage = data?.error?.message || 'Erro desconhecido';
        const errorSubcode = data?.error?.error_subcode;
        
        // Check specific error patterns that indicate ad is already active
        if (this.looksAlreadyActive(errorMessage) || 
            (errorCode === 100 && errorMessage.toLowerCase().includes('status'))) {
          console.log(`[META-REACTIVATE] ✅ Already active (detected from error)`);
          return { ok: true };
        }
        
        // Handle specific error codes from Meta Marketing API
        if (errorCode === 100) {
          return {
            ok: false,
            error: `Parâmetro inválido: ${errorMessage}. Verifique se o ID do anúncio está correto.`
          };
        } else if (errorCode === 190 || response.status === 401) {
          return {
            ok: false,
            error: `Token expirado ou inválido. Atualize o token de acesso da conta.`
          };
        } else if (errorCode === 200 || response.status === 403) {
          return {
            ok: false,
            error: `Permissões insuficientes. Verifique se o token tem permissão 'ads_management'.`
          };
        } else if (errorCode === 17 || errorCode === 80004 || response.status === 429) {
          return {
            ok: false,
            error: `Rate limit atingido. Aguarde alguns minutos e tente novamente.`
          };
        } else if (errorCode === 2635) {
          return {
            ok: false,
            error: `Anúncio não pode ser reativado no momento. Tente novamente em alguns minutos.`
          };
        } else if (errorSubcode === 1487758) {
          return {
            ok: false,
            error: `Anúncio já está em processo de atualização. Aguarde alguns minutos.`
          };
        }
        
        // For other errors, check current status to verify if reactivation was successful
        console.log(`[META-REACTIVATE] 🔍 Checking current status after error...`);
        
        await new Promise(resolve => setTimeout(resolve, 500)); // Brief delay
        
        const checkUrl = `https://graph.facebook.com/${graphVersion}/${adId}?fields=id,effective_status,configured_status,status&access_token=${encodeURIComponent(token)}`;
        const checkResponse = await fetch(checkUrl, { method: 'GET' });
        
        if (checkResponse.ok) {
          const checkData = await checkResponse.json() as any;
          console.log(`[META-REACTIVATE] Status verification:`, checkData);
          
          if (this.decideActive(checkData)) {
            console.log(`[META-REACTIVATE] ✅ Ad is actually active despite error`);
            return { ok: true };
          }
        }
        
        return {
          ok: false,
          error: `Erro ${errorCode}: ${errorMessage}`
        };
      }

      // Success response - check for explicit success indicators
      if (data?.success === true) {
        console.log(`[META-REACTIVATE] ✅ Explicit success response`);
        return { ok: true };
      }
      
      // Meta Marketing API typically returns the updated object on success
      if (data?.id === adId) {
        console.log(`[META-REACTIVATE] ✅ Updated object returned - reactivation successful`);
        return { ok: true };
      }
      
      // For 200 OK without clear success indicator, verify status
      console.log(`[META-REACTIVATE] 🔍 Verifying reactivation status...`);
      
      await new Promise(resolve => setTimeout(resolve, 300)); // Small delay for API consistency
      
      const verifyUrl = `https://graph.facebook.com/${graphVersion}/${adId}?fields=id,effective_status,configured_status,status&access_token=${encodeURIComponent(token)}`;
      const verifyResponse = await fetch(verifyUrl, { method: 'GET' });
      
      if (verifyResponse.ok) {
        const verifyData = await verifyResponse.json() as any;
        console.log(`[META-REACTIVATE] Final verification:`, verifyData);
        
        if (this.decideActive(verifyData)) {
          console.log(`[META-REACTIVATE] ✅ Ad confirmed active`);
          return { ok: true };
        } else {
          console.log(`[META-REACTIVATE] ❌ Ad still not active after reactivation request`);
          return {
            ok: false,
            error: 'Anúncio não foi reativado. Tente novamente em alguns minutos.'
          };
        }
      }
      
      // If we can't verify, assume success based on 200 OK
      console.log(`[META-REACTIVATE] ✅ Assuming success based on 200 OK response`);
      return { ok: true };
      
    } catch (error) {
      console.error('[META-REACTIVATE] ❌ Exception in reactivateAd:', error);
      return {
        ok: false,
        error: `Erro na conexão: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      };
    }
  }

  async pauseAd(token: string, adId: string): Promise<{ ok: boolean; error?: string }> {
    try {
      // Using latest Meta Marketing API version as of 2024/2025
      const graphVersion = 'v20.0'; // v20.0 is the current stable version for Marketing API
      const pauseUrl = `https://graph.facebook.com/${graphVersion}/${adId}`;
      
      console.log(`[META-PAUSE-FIXED] Starting pause for ad: ${adId} using API ${graphVersion}`);
      
      // CRITICAL: Meta Marketing API requires status update via POST with proper form data
      // Documentation: https://developers.facebook.com/docs/marketing-api/reference/adgroup
      const formData = new URLSearchParams();
      formData.append('status', 'PAUSED'); // Use 'status' field, not 'effective_status'
      formData.append('access_token', token);
      
      const response = await fetch(pauseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'MeuDads/1.0 (Meta Marketing API Client)',
          'Accept': 'application/json'
        },
        body: formData.toString()
      });

      console.log(`[META-PAUSE-FIXED] API Response status: ${response.status}`);
      
      // Handle rate limiting properly
      const retryAfter = response.headers.get('retry-after');
      if (retryAfter) {
        const waitTime = parseInt(retryAfter) * 1000;
        console.log(`[META-PAUSE-FIXED] Rate limited, waiting ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        // Don't retry automatically, return rate limit error
        return {
          ok: false,
          error: `Rate limit atingido. Aguarde ${Math.ceil(parseInt(retryAfter) / 60)} minutos e tente novamente.`
        };
      }
      
      let data: any;
      try {
        data = await response.json();
        console.log(`[META-PAUSE-FIXED] API Response data:`, data);
      } catch (parseError) {
        const textResponse = await response.text();
        console.log('[META-PAUSE-FIXED] Raw response:', textResponse);
        
        // If we get a 200 OK but can't parse JSON, it might still be successful
        if (response.ok && textResponse.includes('success')) {
          console.log(`[META-PAUSE-FIXED] ✅ Success inferred from text response`);
          return { ok: true };
        }
        
        return {
          ok: false,
          error: `Resposta inválida da API: ${textResponse.substring(0, 100)}`
        };
      }

      if (!response.ok) {
        console.error('[META-PAUSE-FIXED] ❌ API error:', data);
        
        const errorCode = data?.error?.code;
        const errorMessage = data?.error?.message || 'Erro desconhecido';
        const errorSubcode = data?.error?.error_subcode;
        
        // Check specific error patterns that indicate ad is already paused
        if (this.looksAlreadyPaused(errorMessage) || 
            (errorCode === 100 && errorMessage.toLowerCase().includes('status'))) {
          console.log(`[META-PAUSE-FIXED] ✅ Already paused (detected from error)`);
          return { ok: true };
        }
        
        // Handle specific error codes from Meta Marketing API
        if (errorCode === 100) {
          return {
            ok: false,
            error: `Parâmetro inválido: ${errorMessage}. Verifique se o ID do anúncio está correto.`
          };
        } else if (errorCode === 190 || response.status === 401) {
          return {
            ok: false,
            error: `Token expirado ou inválido. Atualize o token de acesso da conta.`
          };
        } else if (errorCode === 200 || response.status === 403) {
          return {
            ok: false,
            error: `Permissões insuficientes. Verifique se o token tem permissão 'ads_management'.`
          };
        } else if (errorCode === 17 || errorCode === 80004 || response.status === 429) {
          return {
            ok: false,
            error: `Rate limit atingido. Aguarde alguns minutos e tente novamente.`
          };
        } else if (errorCode === 2635) {
          return {
            ok: false,
            error: `Anúncio não pode ser pausado no momento. Tente novamente em alguns minutos.`
          };
        } else if (errorSubcode === 1487758) {
          return {
            ok: false,
            error: `Anúncio já está em processo de atualização. Aguarde alguns minutos.`
          };
        }
        
        // For other errors, check current status to verify if pause was successful
        console.log(`[META-PAUSE-FIXED] 🔍 Checking current status after error...`);
        
        await new Promise(resolve => setTimeout(resolve, 500)); // Brief delay
        
        const checkUrl = `https://graph.facebook.com/${graphVersion}/${adId}?fields=id,effective_status,configured_status,status&access_token=${encodeURIComponent(token)}`;
        const checkResponse = await fetch(checkUrl, { method: 'GET' });
        
        if (checkResponse.ok) {
          const checkData = await checkResponse.json() as any;
          console.log(`[META-PAUSE-FIXED] Status verification:`, checkData);
          
          if (this.decidePaused(checkData)) {
            console.log(`[META-PAUSE-FIXED] ✅ Ad is actually paused despite error`);
            return { ok: true };
          }
        }
        
        return {
          ok: false,
          error: `Erro ${errorCode}: ${errorMessage}`
        };
      }

      // Success response - check for explicit success indicators
      if (data?.success === true) {
        console.log(`[META-PAUSE-FIXED] ✅ Explicit success response`);
        return { ok: true };
      }
      
      // Meta Marketing API typically returns the updated object on success
      if (data?.id === adId) {
        console.log(`[META-PAUSE-FIXED] ✅ Updated object returned - pause successful`);
        return { ok: true };
      }
      
      // For 200 OK without clear success indicator, verify status
      console.log(`[META-PAUSE-FIXED] 🔍 Verifying pause status...`);
      
      await new Promise(resolve => setTimeout(resolve, 300)); // Small delay for API consistency
      
      const verifyUrl = `https://graph.facebook.com/${graphVersion}/${adId}?fields=id,effective_status,configured_status,status&access_token=${encodeURIComponent(token)}`;
      const verifyResponse = await fetch(verifyUrl, { method: 'GET' });
      
      if (verifyResponse.ok) {
        const verifyData = await verifyResponse.json() as any;
        console.log(`[META-PAUSE-FIXED] Final verification:`, verifyData);
        
        if (this.decidePaused(verifyData)) {
          console.log(`[META-PAUSE-FIXED] ✅ Ad confirmed paused`);
          return { ok: true };
        } else {
          console.log(`[META-PAUSE-FIXED] ❌ Ad still active after pause request`);
          return {
            ok: false,
            error: 'Anúncio não foi pausado. Tente novamente em alguns minutos.'
          };
        }
      }
      
      // If we can't verify, assume success based on 200 OK
      console.log(`[META-PAUSE-FIXED] ✅ Assuming success based on 200 OK response`);
      return { ok: true };
      
    } catch (error) {
      console.error('[META-PAUSE-FIXED] ❌ Exception in pauseAd:', error);
      return {
        ok: false,
        error: `Erro na conexão: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      };
    }
  }

  // Enhanced helper methods for Meta Marketing API pause/reactivate detection
  private looksAlreadyActive(errorMessage: string): boolean {
    if (!errorMessage) return false;
    
    const message = errorMessage.toLowerCase();
    return (
      message.includes('already active') ||
      message.includes('já ativo') ||
      message.includes('status active') ||
      message.includes('cannot change status') ||
      message.includes('não é possível alterar') ||
      message.includes('same status') ||
      message.includes('no changes to make') ||
      message.includes('nenhuma alteração') ||
      message.includes('current status is already') ||
      message.includes('status atual já é') ||
      message.includes('status is the same') ||
      message.includes('mesmo status')
    );
  }

  private decideActive(adData: any): boolean {
    if (!adData) return false;
    
    // Meta Marketing API status hierarchy (effective_status is the most reliable)
    const effective = (adData.effective_status || '').toUpperCase();
    const configured = (adData.configured_status || '').toUpperCase();
    const status = (adData.status || '').toUpperCase();
    
    console.log(`[META-STATUS-CHECK] Checking active status fields:`, {
      effective_status: effective,
      configured_status: configured,
      status: status
    });
    
    // Active states in Meta Marketing API
    const activeStates = [
      'ACTIVE',                // Direct active
      'LEARNING',             // Campaign learning phase
      'LEARNING_LIMITED'      // Limited learning phase
    ];
    
    const isActive = (
      activeStates.includes(effective) ||
      activeStates.includes(configured) ||
      activeStates.includes(status)
    );
    
    console.log(`[META-STATUS-CHECK] Is active: ${isActive}`);
    return isActive;
  }

  private looksAlreadyPaused(errorMessage: string): boolean {
    if (!errorMessage) return false;
    
    const message = errorMessage.toLowerCase();
    return (
      message.includes('already paused') ||
      message.includes('já pausado') ||
      message.includes('status paused') ||
      message.includes('cannot change status') ||
      message.includes('não é possível alterar') ||
      message.includes('same status') ||
      message.includes('no changes to make') ||
      message.includes('nenhuma alteração') ||
      message.includes('current status is already') ||
      message.includes('status atual já é') ||
      message.includes('status is the same') ||
      message.includes('mesmo status')
    );
  }

  private decidePaused(adData: any): boolean {
    if (!adData) return false;
    
    // Meta Marketing API status hierarchy (effective_status is the most reliable)
    const effective = (adData.effective_status || '').toUpperCase();
    const configured = (adData.configured_status || '').toUpperCase();
    const status = (adData.status || '').toUpperCase();
    
    console.log(`[META-STATUS-CHECK] Checking status fields:`, {
      effective_status: effective,
      configured_status: configured,
      status: status
    });
    
    // All possible paused states in Meta Marketing API
    const pausedStates = [
      'PAUSED',                // Direct pause
      'ADSET_PAUSED',         // Paused at adset level
      'CAMPAIGN_PAUSED',      // Paused at campaign level  
      'ACCOUNT_PAUSED',       // Paused at account level
      'DISAPPROVED',          // Facebook disapproved
      'PENDING_REVIEW',       // Under review
      'PENDING_BILLING_INFO', // Billing issue
      'CAMPAIGN_GROUP_PAUSED',// Campaign group paused
      'ARCHIVED',             // Archived
      'DELETED'               // Deleted
    ];
    
    const isPaused = (
      pausedStates.includes(effective) ||
      pausedStates.includes(configured) ||
      pausedStates.includes(status)
    );
    
    console.log(`[META-STATUS-CHECK] Is paused: ${isPaused}`);
    return isPaused;
  }

  // Helper methods specific to Meta
  private async fetchAll(url: string, maxPages: number = 5, retries: number = 2): Promise<any[]> {
    console.log(`[META-FETCH-OPTIMIZED] Starting optimized fetchAll with maxPages: ${maxPages}, retries: ${retries}`);
    
    let data: any[] = [];
    let next: string | null = url;
    let pages = 0;
    const seen = new Set<string>();
    const startTime = Date.now();
    
    // TIMEOUT GLOBAL para evitar travamentos
    const globalTimeout = 25000; // 25 segundos máximo
    
    while (next && pages < maxPages) {
      // Verificar timeout global
      if (Date.now() - startTime > globalTimeout) {
        console.log(`[META-FETCH-OPTIMIZED] ⏰ Global timeout reached (${globalTimeout}ms), stopping fetch`);
        break;
      }
      
      if (seen.has(next)) {
        console.log(`[META-FETCH-OPTIMIZED] Breaking due to seen URL (infinite loop protection)`);
        break;
      }
      seen.add(next);

      let lastError: any = null;
      let success = false;
      
      console.log(`[META-FETCH-OPTIMIZED] Fetching page ${pages + 1}/${maxPages}...`);
      
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          console.log(`[META-FETCH-OPTIMIZED] Attempt ${attempt}/${retries} for page ${pages + 1}`);
          
          // TIMEOUT POR REQUEST mais agressivo
          const controller = new AbortController();
          const requestTimeout = setTimeout(() => {
            controller.abort();
          }, 8000); // 8 segundos por request
          
          const r = await fetch(next!, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; MetaAdsManager/1.0)',
              'Accept': 'application/json',
              'Accept-Encoding': 'gzip, deflate, br'
            },
            signal: controller.signal
          });
          
          clearTimeout(requestTimeout);
          
          const text = await r.text();
          let j: any;
          
          try { 
            j = JSON.parse(text); 
          } catch (parseError) { 
            j = { error: { message: `JSON parse error: ${text}` } }; 
          }

          if (!r.ok) {
            const errorMsg = j?.error?.message || `HTTP ${r.status}: ${r.statusText}`;
            const errorCode = j?.error?.code || r.status;
            
            console.error(`[META-FETCH-DEBUG] ❌ API Error - Status: ${r.status}, Code: ${errorCode}, Message: ${errorMsg}`);
            
            if (r.status === 401 || errorCode === 190 || errorCode === 102) {
              throw new Error(`Token expirado ou sem permissões (${errorCode}): ${errorMsg}`);
            }
            if (r.status === 429 || errorCode === 17 || errorCode === 80004) {
              throw new Error(`Rate limit atingido (${errorCode}): ${errorMsg}`);
            }
            
            lastError = new Error(`Meta API Error (${errorCode}): ${errorMsg}`);
            console.error(`[META-FETCH-DEBUG] Will retry attempt ${attempt}/${retries}:`, lastError.message);
            
            if (attempt === retries) throw lastError;
            
            const delay = Math.pow(2, attempt) * 1000;
            console.log(`[META-FETCH-DEBUG] Waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          
          if (Array.isArray(j?.data)) {
            console.log(`[META-FETCH-DEBUG] ✅ Page ${pages + 1} successful - ${j.data.length} items`);
            data.push(...j.data);
          } else {
            console.log(`[META-FETCH-DEBUG] ⚠️ Page ${pages + 1} - no data array in response`);
          }
          
          next = j?.paging?.next || null;
          console.log(`[META-FETCH-DEBUG] Next page available: ${!!next}`);
          success = true;
          break;
          
        } catch (error: any) {
          lastError = error;
          console.error(`[META-FETCH-DEBUG] ❌ Attempt ${attempt}/${retries} failed:`, error.message);
          
          if (attempt === retries) {
            console.error(`[META-FETCH-DEBUG] ❌ All attempts failed for page ${pages + 1}`);
            throw error;
          }
          
          const delay = Math.pow(2, attempt) * 1000;
          console.log(`[META-FETCH-DEBUG] Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      
      if (!success) {
        throw lastError || new Error('All fetch attempts failed');
      }
      
      pages++;
    }
    
    console.log(`[META-FETCH-DEBUG] ✅ fetchAll completed - ${data.length} total items from ${pages} pages`);
    return data;
  }

  private chunk<T>(arr: T[], size: number): T[][] {
    const result: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      result.push(arr.slice(i, i + size));
    }
    return result;
  }

  private safeNum(v: any): number {
    const n = typeof v === "string" ? Number(v) : Number(v ?? 0);
    return Number.isFinite(n) ? n : 0;
  }

  private pickAction(arr: any[], keys: string[]): number {
    if (!Array.isArray(arr) || !arr.length) return 0;
    for (const k of keys) {
      const hit = arr.find(a => String(a?.action_type || "") === k);
      if (!hit) continue;
      const v = this.safeNum(hit?.value);
      if (v > 0) return v;
    }
    return 0;
  }

  private pickCPA(costsArr: any[], keys: string[]): number {
    if (!Array.isArray(costsArr) || !costsArr.length) return 0;
    for (const k of keys) {
      const hit = costsArr.find(a => String(a?.action_type || "") === k);
      if (!hit) continue;
      const v = this.safeNum(hit?.value);
      if (v > 0) return v;
    }
    return 0;
  }

  private pickROAS(roasArr: any[], keys: string[]): number {
    if (!Array.isArray(roasArr) || !roasArr.length) return 0;
    for (const k of keys) {
      const hit = roasArr.find(a => String(a?.action_type || "") === k);
      if (!hit) continue;
      const v = this.safeNum(hit?.value);
      if (v > 0) return v;
    }
    return 0;
  }

  // Método para obter o resultado específico baseado na meta de otimização
  private getSpecificResult(row: any, allResults: any): number {
    // Primeiro, tenta buscar o optimization goal que adicionamos ao row
    let optimizationGoal = row?.optimization_goal;
    
    // Se não temos meta específica, usa hierarquia de valor de negócio
    if (!optimizationGoal) {
      if (allResults.purchases > 0) return allResults.purchases;
      if (allResults.leads > 0) return allResults.leads;
      if (allResults.conversations > 0) return allResults.conversations;
      if (allResults.lpv > 0) return allResults.lpv;
      if (allResults.thruplays > 0) return allResults.thruplays;
      if (allResults.videoViews > 0) return allResults.videoViews;
      if (allResults.postEngagement > 0) return allResults.postEngagement;
      if (allResults.profileVisits > 0) return allResults.profileVisits;
      if (allResults.linkClicks > 0) return allResults.linkClicks;
      if (allResults.appInstalls > 0) return allResults.appInstalls;
      return 0;
    }

    // Mapear meta de otimização para o resultado correspondente
    switch (optimizationGoal.toUpperCase()) {
      // E-commerce e Conversões (focado em compras)
      case 'OFFSITE_CONVERSIONS':
      case 'PURCHASES':
      case 'CONVERSIONS':
        return allResults.purchases;
      
      // Leads
      case 'LEAD_GENERATION':
      case 'LEADS':
        return allResults.leads;
      
      // Mensagens/Conversas
      case 'CONVERSATIONS':
      case 'MESSAGING_CONVERSATIONS_STARTED':
        return allResults.conversations;
      
      // Landing Page Views
      case 'LANDING_PAGE_VIEWS':
        return allResults.lpv;
      
      // Vídeo
      case 'THRUPLAY':
      case 'THRUPLAYS':
        return allResults.thruplays;
      case 'VIDEO_VIEWS':
        return allResults.videoViews;
      
      // Engajamento
      case 'POST_ENGAGEMENT':
        return allResults.postEngagement;
      case 'PAGE_LIKES':
      case 'PAGE_ENGAGEMENT':
        return allResults.pageEngagement;
      
      // Perfil/Tráfego
      case 'LINK_CLICKS':
        return allResults.linkClicks;
      case 'PROFILE_VISITS':
      case 'VISIT_INSTAGRAM_PROFILE':
      case 'PROFILE_VISIT':
      case 'VISIT_PROFILE':
        return allResults.profileVisits;
      
      // Apps
      case 'APP_INSTALLS':
      case 'MOBILE_APP_INSTALLS':
        return allResults.appInstalls;
      case 'MOBILE_APP_ENGAGEMENT':
        return allResults.appInstalls; // App engagement usa app installs como proxy
      
      // E-commerce específico
      case 'ADD_TO_CART':
        return allResults.addToCart;
      case 'INITIATE_CHECKOUT':
        return allResults.initiateCheckout;
      case 'ADD_PAYMENT_INFO':
        return allResults.addPaymentInfo;
      case 'COMPLETE_REGISTRATION':
        return allResults.completeRegistration;
      case 'ADD_TO_WISHLIST':
        return allResults.addToWishlist;
      case 'VIEW_CONTENT':
        return allResults.viewContent;
      
      // Outros
      case 'SEARCH':
        return allResults.search;
      case 'SUBSCRIBE':
        return allResults.subscribe;
      case 'START_TRIAL':
        return allResults.startTrial;
      case 'SUBMIT_APPLICATION':
        return allResults.submitApplication;
      case 'CONTACT':
        return allResults.contact;
      case 'FIND_LOCATION':
        return allResults.findLocation;
      case 'SCHEDULE':
        return allResults.schedule;
      case 'RATE':
        return allResults.rate;
      case 'DONATE':
        return allResults.donate;
      
      // Métricas básicas como fallback
      case 'IMPRESSIONS':
        return 0; // Impressões já estão em campo separado
      case 'REACH':
        return 0; // Reach já está em campo separado
      
      // Se não encontrar correspondência, usar hierarquia de valor de negócio (compras como conversão principal)
      default:
        if (allResults.purchases > 0) return allResults.purchases;
        if (allResults.leads > 0) return allResults.leads;
        if (allResults.completeRegistration > 0) return allResults.completeRegistration;
        if (allResults.conversations > 0) return allResults.conversations;
        if (allResults.appInstalls > 0) return allResults.appInstalls;
        if (allResults.addToCart > 0) return allResults.addToCart;
        if (allResults.lpv > 0) return allResults.lpv;
        if (allResults.thruplays > 0) return allResults.thruplays;
        if (allResults.videoViews > 0) return allResults.videoViews;
        if (allResults.profileVisits > 0) return allResults.profileVisits;
        if (allResults.postEngagement > 0) return allResults.postEngagement;
        if (allResults.linkClicks > 0) return allResults.linkClicks;
        return 0;
    }
  }
}
