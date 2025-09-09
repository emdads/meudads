// Meta (Facebook/Instagram) Ads platform implementation
import { BasePlatform, SyncResult, MetricsResult } from './base';
import { toActPath } from '../crypto';
import { rateLimitManager } from '../rate-limit-manager';

export class MetaPlatform extends BasePlatform {
  id = 'meta';
  name = 'Meta Ads';

  async validateToken(token: string, accountId: string): Promise<boolean> {
    try {
      const actPath = toActPath(accountId);
      const graphVersion = 'v23.0'; // Could be passed as parameter
      
      const testUrl = `https://graph.facebook.com/${graphVersion}/${actPath}?fields=name,account_status,account_id&access_token=${token}`;
      
      // Sistema de retry inteligente para validação
      const response = await this.fetchWithIntelligentRetry(testUrl, {
        maxRetries: 2,
        initialDelay: 1000,
        context: 'token_validation'
      });
      
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
    days: number = 30
  ): Promise<SyncResult & { metrics_synced?: number; metrics_errors?: number }> {
    const requestId = Math.random().toString(36).substring(2, 8);
    const startTime = Date.now();
    console.log(`[META-SYNC-${requestId}] ==================== SINCRONIZAÇÃO INTELIGENTE ====================`);
    console.log(`[META-SYNC-${requestId}] Starting intelligent sync for account: ${adAccountId}, ${days} days`);
    
    try {
      // PRE-CHECK: Verify if account is currently rate limited
      const existingRateLimit = rateLimitManager.isAccountLimited('meta', adAccountId);
      if (existingRateLimit) {
        console.log(`[META-SYNC-${requestId}] ⚠️ Account is currently rate limited: ${existingRateLimit.message}`);
        return {
          ok: false,
          campaigns: 0,
          ads: 0,
          skipped: 0,
          error: existingRateLimit.message,
          error_details: `Rate limit ativo até ${existingRateLimit.resetTime?.toLocaleString('pt-BR') || 'horário desconhecido'}`,
          rate_limit_active: true,
          wait_time_minutes: Math.ceil(existingRateLimit.waitTime / 60000)
        };
      }
      
      const actPath = toActPath(adAccountId);
      const graphVersion = 'v21.0';
      
      // ETAPA 1: VERIFICAR DADOS EXISTENTES
      console.log(`[META-SYNC-${requestId}] ETAPA 1: Verificando dados existentes...`);
      
      const existingAds = await db.prepare(`
        SELECT ad_id, ad_name, effective_status FROM ads_active_raw 
        WHERE ad_account_ref_id = ?
      `).bind(accountId).all();
      
      const existingAdIds = new Set((existingAds.results as any[]).map(ad => ad.ad_id));
      console.log(`[META-SYNC-${requestId}] Encontrados ${existingAdIds.size} anúncios existentes no banco`);

      // ETAPA 2: BUSCAR DADOS ATUAIS DA META
      console.log(`[META-SYNC-${requestId}] ETAPA 2: Buscando dados atuais da Meta...`);
      
      // Fetch ACTIVE campaigns from Meta
      const campaignsUrl = `https://graph.facebook.com/${graphVersion}/${actPath}/campaigns?fields=id,name,objective&effective_status=["ACTIVE"]&limit=200&access_token=${token}`;
      
      const campaignsResponse = await this.fetchWithIntelligentRetry(campaignsUrl, {
        maxRetries: 3,
        initialDelay: 2000,
        context: 'campaigns_fetch'
      });
      
      if (!campaignsResponse.ok) {
        let errorData: any = {};
        try {
          errorData = await campaignsResponse.json();
        } catch (parseError) {
          console.error(`[META-SYNC-${requestId}] Failed to parse campaigns error response:`, parseError);
        }
        
        const errorMessage = errorData.error?.message || campaignsResponse.statusText;
        const errorCode = errorData.error?.code || campaignsResponse.status;
        const errorSubcode = errorData.error?.error_subcode;
        
        console.error(`[META-SYNC-${requestId}] Meta campaigns API error:`, {
          status: campaignsResponse.status,
          code: errorCode,
          subcode: errorSubcode,
          message: errorMessage,
          fullError: errorData
        });
        
        // ANALYZE RATE LIMIT with intelligent system
        const rateLimitState = rateLimitManager.analyzeRateLimit(
          'meta',
          adAccountId,
          errorCode,
          errorMessage,
          campaignsResponse.headers
        );
        
        if (rateLimitState.isLimited) {
          console.log(`[META-SYNC-${requestId}] 🚦 INTELLIGENT RATE LIMIT DETECTED: ${rateLimitState.message}`);
          
          // For automatic sync systems, we can intelligently wait and retry
          // For user-triggered sync, return rate limit info for UI handling
          return {
            ok: false,
            campaigns: 0,
            ads: 0,
            skipped: 0,
            error: rateLimitState.message,
            error_details: `Rate limit automático detectado. Sistema pode aguardar e tentar novamente.`,
            rate_limit_detected: true,
            rate_limit_wait_time: rateLimitState.waitTime,
            rate_limit_severity: rateLimitState.severity,
            intelligent_retry_available: true,
            suggested_action: rateLimitState.severity === 'high' 
              ? 'Aguarde automaticamente ou tente em 1-2 horas'
              : 'Sistema pode aguardar automaticamente e tentar novamente'
          };
        }
        
        // CRIAR ERRO DETALHADO COM TODAS AS INFORMAÇÕES DA META
        let detailedError = `Meta API Error ${errorCode}`;
        if (errorSubcode) detailedError += ` (Subcode: ${errorSubcode})`;
        detailedError += `: ${errorMessage}`;
        
        // Adicionar informações de contexto se disponíveis
        if (errorData.error?.error_user_title) {
          detailedError += ` | Título: ${errorData.error.error_user_title}`;
        }
        if (errorData.error?.error_user_msg) {
          detailedError += ` | Detalhes: ${errorData.error.error_user_msg}`;
        }
        
        console.error(`[META-SYNC-${requestId}] Meta API Error Details:`, {
          code: errorCode,
          subcode: errorSubcode,
          message: errorMessage,
          title: errorData.error?.error_user_title,
          user_msg: errorData.error?.error_user_msg,
          full_error: errorData
        });
        
        throw new Error(detailedError);
      }
      
      const campaignsData = await campaignsResponse.json() as any;
      console.log(`[META-SYNC-${requestId}] Found ${campaignsData.data?.length || 0} ACTIVE campaigns on Meta`);

      // Build objective mapping
      const objectiveByCampaignId = new Map<string, string>();
      const currentCampaigns = new Set<string>();
      
      for (const campaign of campaignsData.data || []) {
        objectiveByCampaignId.set(campaign.id, campaign.objective);
        currentCampaigns.add(campaign.id);
      }

      // Fetch ACTIVE ads from Meta
      const basicFields = "id,name,effective_status,campaign_id,adset_id";
      const expandedFields = "adset{optimization_goal,id},creative{id,thumbnail_url,effective_object_story_id}";
      
      let adsBaseUrl = `https://graph.facebook.com/${graphVersion}/${actPath}/ads?fields=${basicFields}&effective_status=["ACTIVE"]&limit=100&access_token=${token}`;
      
      // Fetch with basic fields first
      let allAds = await this.fetchAll(adsBaseUrl, 50, 3);
      console.log(`[META-SYNC-${requestId}] Meta API returned ${allAds.length} ads total`);
      
      // Try to enrich with expanded fields if reasonable number of ads
      if (allAds.length > 0 && allAds.length <= 500) {
        try {
          const enrichUrl = `https://graph.facebook.com/${graphVersion}/${actPath}/ads?fields=${basicFields},${expandedFields}&effective_status=["ACTIVE"]&limit=100&access_token=${token}`;
          const enrichedAds = await this.fetchAll(enrichUrl, 50, 2);
          
          if (enrichedAds.length === allAds.length) {
            allAds = enrichedAds;
            console.log(`[META-SYNC-${requestId}] Successfully enriched all ${allAds.length} ads`);
          }
        } catch (enrichError) {
          console.warn(`[META-SYNC-${requestId}] Enrichment failed, using basic data:`, enrichError);
        }
      }

      // Filter ads to only include those from valid ACTIVE campaigns
      const validCampaignIds = new Set(Array.from(objectiveByCampaignId.keys()));
      const adsFromActiveCampaigns = allAds.filter((ad: any) => 
        ad.campaign_id && validCampaignIds.has(ad.campaign_id)
      );

      const currentAdIds = new Set(adsFromActiveCampaigns.map((ad: any) => ad.id));
      console.log(`[META-SYNC-${requestId}] Meta tem ${currentAdIds.size} anúncios ativos válidos`);

      // ETAPA 3: ANÁLISE INCREMENTAL
      console.log(`[META-SYNC-${requestId}] ETAPA 3: Análise incremental...`);
      
      const newAds = [...currentAdIds].filter(id => !existingAdIds.has(id));
      const removedAds = [...existingAdIds].filter(id => !currentAdIds.has(id));
      const potentialUpdates = [...currentAdIds].filter(id => existingAdIds.has(id));
      
      console.log(`[META-SYNC-${requestId}] Análise: ${newAds.length} novos, ${removedAds.length} removidos, ${potentialUpdates.length} potenciais updates`);

      let campaignUpdates = 0;
      let adUpdates = 0;
      let adInserts = 0;
      let adDeletes = 0;

      // ETAPA 4: APLICAR MUDANÇAS INCREMENTAIS

      // 4.1: Atualizar/Inserir campanhas (apenas se necessário)
      console.log(`[META-SYNC-${requestId}] ETAPA 4.1: Processando campanhas...`);
      
      for (const campaign of campaignsData.data || []) {
        // Verificar se campanha já existe
        const existing = await db.prepare(`
          SELECT campaign_id FROM campaigns 
          WHERE campaign_id = ? AND ad_account_ref_id = ?
        `).bind(campaign.id, accountId).first();
        
        if (!existing) {
          // Nova campanha - inserir
          await this.saveCampaign(db, {
            campaign_id: campaign.id,
            name: campaign.name || undefined,
            objective: campaign.objective || undefined,
            ad_account_id: adAccountId,
            ad_account_ref_id: accountId,
            client_id: clientId
          });
          campaignUpdates++;
          console.log(`[META-SYNC-${requestId}] Nova campanha inserida: ${campaign.id}`);
        }
      }

      // 4.2: Remover campanhas não encontradas na Meta
      if (campaignsData.data?.length > 0) {
        const currentCampaignIds = (campaignsData.data || []).map((c: any) => c.id);
        const campaignPlaceholders = currentCampaignIds.map(() => '?').join(',');
        
        const deletedCampaigns = await db.prepare(`
          DELETE FROM campaigns 
          WHERE ad_account_ref_id = ? 
          AND campaign_id NOT IN (${campaignPlaceholders})
        `).bind(accountId, ...currentCampaignIds).run();
        
        console.log(`[META-SYNC-${requestId}] Campanhas removidas: ${deletedCampaigns.meta?.changes || 0}`);
      }

      // 4.3: Remover anúncios que não existem mais na Meta
      console.log(`[META-SYNC-${requestId}] ETAPA 4.2: Removendo anúncios deletados...`);
      
      if (removedAds.length > 0) {
        for (const adId of removedAds) {
          await db.prepare(`
            DELETE FROM ads_active_raw WHERE ad_id = ? AND ad_account_ref_id = ?
          `).bind(adId, accountId).run();
          
          // Também remover métricas do anúncio deletado
          await db.prepare(`
            DELETE FROM ad_metrics_cache WHERE ad_id = ?
          `).bind(adId).run();
          
          adDeletes++;
        }
        console.log(`[META-SYNC-${requestId}] Anúncios removidos: ${adDeletes}`);
      }

      // 4.4: Inserir novos anúncios
      console.log(`[META-SYNC-${requestId}] ETAPA 4.3: Inserindo novos anúncios...`);
      
      for (const ad of adsFromActiveCampaigns) {
        if (!newAds.includes(ad.id)) continue;
        
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
          
          adInserts++;
          console.log(`[META-SYNC-${requestId}] Novo anúncio inserido: ${ad.id}`);
        } catch (dbError) {
          console.error(`[META-SYNC-${requestId}] Database error saving new ad ${ad.id}:`, dbError);
        }
      }

      // 4.5: Verificar e atualizar anúncios existentes (apenas se houve mudanças)
      console.log(`[META-SYNC-${requestId}] ETAPA 4.4: Verificando updates em anúncios existentes...`);
      
      for (const ad of adsFromActiveCampaigns) {
        if (!potentialUpdates.includes(ad.id)) continue;
        
        // Verificar se houve mudanças significativas
        const existing = await db.prepare(`
          SELECT ad_name, creative_id, adset_optimization_goal 
          FROM ads_active_raw 
          WHERE ad_id = ? AND ad_account_ref_id = ?
        `).bind(ad.id, accountId).first() as any;
        
        if (existing) {
          const hasChanges = 
            existing.ad_name !== (ad.name || null) ||
            existing.creative_id !== (ad.creative?.id || null) ||
            existing.adset_optimization_goal !== (ad.adset?.optimization_goal || null);
          
          if (hasChanges) {
            const objective = objectiveByCampaignId.get(ad.campaign_id) || null;
            
            await db.prepare(`
              UPDATE ads_active_raw 
              SET ad_name = ?, creative_id = ?, creative_thumb = ?, 
                  adset_optimization_goal = ?, objective = ?, updated_at = datetime('now')
              WHERE ad_id = ? AND ad_account_ref_id = ?
            `).bind(
              ad.name || null,
              ad.creative?.id || null,
              ad.creative?.thumbnail_url || null,
              ad.adset?.optimization_goal || null,
              objective,
              ad.id,
              accountId
            ).run();
            
            adUpdates++;
            console.log(`[META-SYNC-${requestId}] Anúncio atualizado: ${ad.id}`);
          }
        }
      }

      // ETAPA 5: SINCRONIZAÇÃO INTELIGENTE DE MÉTRICAS PARA MÚLTIPLOS PERÍODOS
      console.log(`[META-SYNC-${requestId}] ETAPA 5: Sincronização INTELIGENTE de métricas para períodos 7, 14 e 30 dias...`);
      
      const allCurrentAdIds = [...currentAdIds];
      let metricsSuccess = 0;
      let metricsErrors = 0;
      let metricsDetails = { days_7: 0, days_14: 0, days_30: 0 };
      
      if (allCurrentAdIds.length > 0) {
        console.log(`[META-SYNC-${requestId}] 🚀 MODO MANUAL: Sincronizando métricas para TODOS os períodos (7, 14, 30 dias)`);
        
        // SINCRONIZAR PARA TODOS OS PERÍODOS IMPORTANTES: 7, 14 E 30 DIAS
        const periodosParaSincronizar = [7, 14, 30];
        
        for (const periodoDias of periodosParaSincronizar) {
          console.log(`[META-SYNC-${requestId}] 📊 Sincronizando métricas para ${periodoDias} dias...`);
          
          try {
            // CALCULAR PERÍODO CORRIGIDO para cada período
            const now = new Date();
            const brazilTime = new Date(now.getTime() - (3 * 60 * 60 * 1000));
            
            // Data final: ONTEM no horário do Brasil
            const endDate = new Date(brazilTime);
            endDate.setDate(brazilTime.getDate() - 1);
            
            // Data inicial: X dias antes da data final
            const startDate = new Date(endDate);
            startDate.setDate(endDate.getDate() - (periodoDias - 1));
            
            const startStr = startDate.toISOString().slice(0, 10);
            const endStr = endDate.toISOString().slice(0, 10);
            
            console.log(`[META-SYNC-${requestId}] Período ${periodoDias} dias: ${startStr} até ${endStr}`);
            
            // Buscar métricas em chunks para evitar timeout
            const metricsChunkSize = Math.min(20, Math.max(5, Math.floor(50 / periodosParaSincronizar.length)));
            const metricsChunks = this.chunk(allCurrentAdIds, metricsChunkSize);
            
            let successThisPeriod = 0;
            let errorsThisPeriod = 0;
            
            for (let i = 0; i < metricsChunks.length; i++) {
              const chunk = metricsChunks[i];
              
              try {
                const metricsResult = await this.getMetrics(token, adAccountId, chunk, periodoDias, startStr, endStr);
                
                // Salvar métricas no cache
                for (const [adId, result] of Object.entries(metricsResult)) {
                  if ((result as any).ok && (result as any).metrics) {
                    await this.saveMetricsToCache(
                      db, 
                      adId, 
                      clientId, 
                      accountId, 
                      startStr, 
                      endStr, 
                      periodoDias, 
                      (result as any).metrics
                    );
                    successThisPeriod++;
                  } else {
                    errorsThisPeriod++;
                  }
                }
                
                // Delay reduzido entre chunks para eficiência
                if (i < metricsChunks.length - 1) {
                  await new Promise(resolve => setTimeout(resolve, 500));
                }
                
              } catch (chunkError) {
                console.error(`[META-SYNC-${requestId}] Erro no chunk ${i + 1} para ${periodoDias} dias:`, chunkError);
                errorsThisPeriod += chunk.length;
              }
            }
            
            // Registrar resultados por período
            (metricsDetails as any)[`days_${periodoDias}`] = successThisPeriod;
            metricsSuccess += successThisPeriod;
            metricsErrors += errorsThisPeriod;
            
            console.log(`[META-SYNC-${requestId}] ✅ Período ${periodoDias} dias: ${successThisPeriod} sucessos, ${errorsThisPeriod} erros`);
            
            // Delay entre períodos para evitar rate limits da Meta
            if (periodoDias !== 30) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
          } catch (periodError) {
            console.error(`[META-SYNC-${requestId}] Erro no período ${periodoDias} dias:`, periodError);
            metricsErrors += allCurrentAdIds.length;
          }
        }
        
        console.log(`[META-SYNC-${requestId}] 📊 TOTAL MÉTRICAS: ${metricsSuccess} sucessos, ${metricsErrors} erros`);
        console.log(`[META-SYNC-${requestId}] Detalhes: 7d=${metricsDetails.days_7}, 14d=${metricsDetails.days_14}, 30d=${metricsDetails.days_30}`);
      }

      const syncDuration = Date.now() - startTime;
      console.log(`[META-SYNC-${requestId}] ==================== SINCRONIZAÇÃO COMPLETA ====================`);
      console.log(`[META-SYNC-${requestId}] Resumo:`);
      console.log(`[META-SYNC-${requestId}] - Campanhas: ${campaignUpdates} atualizadas`);
      console.log(`[META-SYNC-${requestId}] - Anúncios: ${adInserts} inseridos, ${adUpdates} atualizados, ${adDeletes} removidos`);
      console.log(`[META-SYNC-${requestId}] - Métricas: ${metricsSuccess} sucessos, ${metricsErrors} erros`);
      console.log(`[META-SYNC-${requestId}] - Tempo total: ${syncDuration}ms`);

      return {
        ok: true,
        campaigns: campaignUpdates,
        ads: adInserts + adUpdates,
        skipped: 0,
        metrics_synced: metricsSuccess,
        metrics_errors: metricsErrors,
        summary: {
          ads_inserted: adInserts,
          ads_updated: adUpdates,
          ads_deleted: adDeletes,
          campaigns_updated: campaignUpdates,
          metrics_synced: metricsSuccess,
          metrics_7d: metricsDetails.days_7,
          metrics_14d: metricsDetails.days_14,
          metrics_30d: metricsDetails.days_30,
          total_current_ads: currentAdIds.size,
          duration_ms: syncDuration
        }
      };
      
    } catch (error) {
      const syncDuration = Date.now() - startTime;
      console.error(`[META-SYNC-${requestId}] Sync error after ${syncDuration}ms:`, error);
      
      // Extract detailed error information for user display
      let userErrorMessage = 'Erro desconhecido na sincronização';
      let errorDetails = '';
      
      if (error instanceof Error) {
        console.error(`[META-SYNC-${requestId}] Error name: ${error.name}`);
        console.error(`[META-SYNC-${requestId}] Error message: ${error.message}`);
        console.error(`[META-SYNC-${requestId}] Error stack:`, error.stack);
        
        userErrorMessage = error.message;
        
        // Check for specific Meta API errors
        if (error.message.includes('Meta API Error')) {
          errorDetails = error.message; // Keep full Meta error message
        } else if (error.message.includes('Token')) {
          errorDetails = 'Problema com token de acesso - verifique as configurações da conta';
        } else if (error.message.includes('Rate limit') || error.message.includes('rate limit')) {
          errorDetails = 'Limite de requisições atingido - aguarde alguns minutos';
        } else if (error.message.includes('Network') || error.message.includes('fetch')) {
          errorDetails = 'Problema de conexão com a Meta';
        } else {
          errorDetails = error.message;
        }
      }
      
      return {
        ok: false,
        campaigns: 0,
        ads: 0,
        skipped: 0,
        metrics_synced: 0,
        metrics_errors: 0,
        error: userErrorMessage,
        error_details: errorDetails,
        error_type: error instanceof Error ? error.name : 'UnknownError',
        duration_ms: syncDuration,
        // PRESERVAR ERRO ORIGINAL COMPLETO PARA DEBUG
        original_error: error instanceof Error ? error.message : String(error),
        meta_api_details: error instanceof Error && error.message.includes('Meta API Error') ? error.message : null
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
    console.log(`[META-METRICS-DEBUG] ==================== META METRICS START ====================`);
    console.log(`[META-METRICS-DEBUG] Account: ${adAccountId}, Ads: ${adIds.length}, Days: ${days}`);
    
    const results: Record<string, MetricsResult> = {};
    
    try {
      // USAR DATAS FORNECIDAS quando disponíveis (enviadas do frontend)
      let sinceStr: string, untilStr: string;
      
      if (startDateStr && endDateStr) {
        // USAR AS DATAS EXATAS FORNECIDAS - NÃO RECALCULAR
        sinceStr = startDateStr;
        untilStr = endDateStr;
        console.log(`[META-METRICS] Using provided exact dates: ${sinceStr} to ${untilStr}`);
      } else {
        // Fallback: LÓGICA CORRIGIDA com timezone do Brasil (UTC-3)
        const now = new Date();
        // Ajustar para timezone do Brasil (UTC-3)
        const brazilTime = new Date(now.getTime() - (3 * 60 * 60 * 1000));
        
        console.log(`[META-METRICS] Timezone: UTC=${now.toISOString()}, Brasil=${brazilTime.toISOString()}`);
        
        // Data final: ONTEM no horário do Brasil (último dia com dados completos)
        // Se hoje é 06/09 no Brasil, dados vão até 05/09
        const endDate = new Date(brazilTime);
        endDate.setDate(brazilTime.getDate() - 1);
        
        // Data inicial: X dias antes da data final
        // Para 7 dias: se final=05/09, início=29/08 (7 dias: 29,30,31,01,02,03,04,05)
        const startDate = new Date(endDate);
        startDate.setDate(endDate.getDate() - (days - 1));
        
        sinceStr = startDate.toISOString().slice(0, 10);
        untilStr = endDate.toISOString().slice(0, 10);
        
        console.log(`[META-METRICS] CORRIGIDO (Brasil): Final=${endDate.getDate()}/${endDate.getMonth()+1}, Inicial=${startDate.getDate()}/${startDate.getMonth()+1}, Período=${sinceStr} até ${untilStr} (${days} dias)`);
      }
      
      // Verificação: contar dias entre as datas (deve ser igual a N)
      const sinceDate = new Date(sinceStr + 'T00:00:00Z');
      const untilDate = new Date(untilStr + 'T23:59:59Z');
      const diffTime = untilDate.getTime() - sinceDate.getTime();
      const actualDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
      
      console.log(`[META-METRICS] Date range corrected for exactly ${days} days:`, {
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
        
        console.log(`[META-METRICS-DEBUG] Calling Meta Insights API with intelligent retry...`);
        console.log(`[META-METRICS-DEBUG] URL: ${baseUrl}?level=ad&fields=${iFields}&time_range=...&filtering=...`);
        
        try {
          // TIMEOUT OTIMIZADO: Páginas limitadas para evitar timeouts + intelligent retry
          const maxPages = slice.length > 20 ? 3 : slice.length > 10 ? 4 : 5;
          const retryCount = slice.length > 20 ? 2 : 3; // Fewer retries for large batches
          const list = await this.fetchAll(insightsUrl, maxPages, retryCount);
          console.log(`[META-METRICS-DEBUG] ✅ Received ${list.length} insights from Meta API (chunk ${chunkIndex + 1}/${chunks.length})`);
          
          // Para cada insight, vamos buscar o adset info para pegar o optimization_goal
          const adsetIds = [...new Set(list.map(row => row?.adset_id).filter(Boolean))];
          const adsetOptimizationGoals = new Map<string, string>();
          
          // Buscar optimization goals dos adsets em batch
          if (adsetIds.length > 0) {
            try {
              const adsetFields = "id,optimization_goal";
              const adsetUrl = `https://graph.facebook.com/${graphVersion}/?ids=${adsetIds.join(',')}&fields=${adsetFields}&access_token=${encodeURIComponent(token)}`;
              const adsetResponse = await this.fetchWithIntelligentRetry(adsetUrl, {
                maxRetries: 2,
                initialDelay: 1000,
                context: 'adset_optimization_goals'
              });
              
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

  // SISTEMA INTELIGENTE DE RETRY COM RATE LIMIT OTIMIZADO
  private async fetchWithIntelligentRetry(
    url: string, 
    options: {
      maxRetries?: number;
      initialDelay?: number;
      context?: string;
      fetchOptions?: RequestInit;
    } = {}
  ): Promise<Response> {
    const { maxRetries = 3, initialDelay = 1000, context = 'api_call', fetchOptions = {} } = options;
    const requestId = Math.random().toString(36).substring(2, 6);
    
    console.log(`[META-RETRY-${requestId}] Starting intelligent retry for: ${context}`);
    
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        console.log(`[META-RETRY-${requestId}] Attempt ${attempt}/${maxRetries + 1} for ${context}`);
        
        const response = await fetch(url, {
          ...fetchOptions,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; MetaAdsManager/1.0)',
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip, deflate, br',
            ...fetchOptions.headers
          }
        });
        
        // SUCCESS - return immediately
        if (response.ok) {
          console.log(`[META-RETRY-${requestId}] ✅ Success on attempt ${attempt}`);
          return response;
        }
        
        // ANALYZE ERROR for intelligent handling
        let errorData: any = {};
        let responseText = '';
        
        try {
          responseText = await response.text();
          errorData = JSON.parse(responseText);
        } catch (parseError) {
          console.warn(`[META-RETRY-${requestId}] Could not parse error response: ${responseText.substring(0, 200)}`);
        }
        
        const errorCode = errorData.error?.code || response.status;
        const errorMessage = errorData.error?.message || response.statusText;
        const rateLimitType = this.detectRateLimitType(errorCode, errorMessage, response.headers);
        
        console.log(`[META-RETRY-${requestId}] Error analysis:`, {
          status: response.status,
          code: errorCode,
          message: errorMessage?.substring(0, 100),
          rateLimitType,
          attempt
        });
        
        // HANDLE DIFFERENT ERROR TYPES
        if (rateLimitType.isRateLimit) {
          // RATE LIMIT DETECTED - intelligent wait
          if (attempt <= maxRetries) {
            const waitTime = this.calculateRateLimitWait(rateLimitType, attempt, initialDelay);
            console.log(`[META-RETRY-${requestId}] 🚦 Rate limit detected: ${rateLimitType.type}. Waiting ${waitTime}ms before retry ${attempt + 1}`);
            
            await this.intelligentWait(waitTime, requestId, rateLimitType.type);
            continue; // Try again
          } else {
            // Exceeded retries - create detailed rate limit error
            const detailedError = this.createDetailedRateLimitError(rateLimitType, errorData, attempt);
            console.error(`[META-RETRY-${requestId}] ❌ Rate limit retries exhausted: ${detailedError}`);
            
            // Return the response so the caller can handle the specific error
            return new Response(JSON.stringify({
              error: {
                code: errorCode,
                message: detailedError,
                type: 'OAuthException',
                error_subcode: errorData.error?.error_subcode,
                error_user_title: errorData.error?.error_user_title,
                error_user_msg: errorData.error?.error_user_msg,
                is_transient: true
              }
            }), {
              status: response.status,
              headers: response.headers
            });
          }
        } else if (this.isPermanentError(errorCode, errorMessage)) {
          // PERMANENT ERROR - don't retry
          console.log(`[META-RETRY-${requestId}] ❌ Permanent error detected, not retrying: ${errorCode} - ${errorMessage}`);
          return response;
        } else if (attempt <= maxRetries) {
          // TEMPORARY ERROR - retry with exponential backoff
          const waitTime = Math.min(initialDelay * Math.pow(2, attempt - 1), 30000); // Max 30 seconds
          console.log(`[META-RETRY-${requestId}] ⏱️ Temporary error, retrying in ${waitTime}ms`);
          await this.intelligentWait(waitTime, requestId, 'temporary_error');
          continue;
        } else {
          // Exceeded retries for temporary error
          console.error(`[META-RETRY-${requestId}] ❌ Temporary error retries exhausted`);
          return response;
        }
        
      } catch (fetchError: any) {
        console.error(`[META-RETRY-${requestId}] ❌ Fetch error on attempt ${attempt}:`, fetchError.message);
        
        if (attempt <= maxRetries && !fetchError.name?.includes('AbortError')) {
          const waitTime = Math.min(initialDelay * Math.pow(2, attempt - 1), 15000);
          console.log(`[META-RETRY-${requestId}] Retrying fetch error in ${waitTime}ms`);
          await this.intelligentWait(waitTime, requestId, 'network_error');
          continue;
        } else {
          throw fetchError;
        }
      }
    }
    
    throw new Error(`[META-RETRY-${requestId}] All retry attempts exhausted`);
  }
  
  // DETECTION SYSTEM FOR RATE LIMIT TYPES
  private detectRateLimitType(errorCode: number, errorMessage: string, headers: Headers): {
    isRateLimit: boolean;
    type: string;
    severity: 'low' | 'medium' | 'high';
    suggestedWait: number;
  } {
    const message = (errorMessage || '').toLowerCase();
    const retryAfter = headers.get('retry-after');
    
    // SPECIFIC RATE LIMIT PATTERNS
    if (errorCode === 17 || message.includes('user request limit reached')) {
      return {
        isRateLimit: true,
        type: 'USER_RATE_LIMIT',
        severity: 'high',
        suggestedWait: retryAfter ? parseInt(retryAfter) * 1000 : 3600000 // 1 hour default
      };
    }
    
    if (errorCode === 80004 || message.includes('application request limit reached')) {
      return {
        isRateLimit: true,
        type: 'APP_RATE_LIMIT',
        severity: 'medium',
        suggestedWait: retryAfter ? parseInt(retryAfter) * 1000 : 1800000 // 30 minutes default
      };
    }
    
    if (errorCode === 613 || message.includes('calls per hour exceeded')) {
      return {
        isRateLimit: true,
        type: 'HOURLY_LIMIT',
        severity: 'medium',
        suggestedWait: 3600000 // 1 hour
      };
    }
    
    if (errorCode === 429 || message.includes('too many requests')) {
      return {
        isRateLimit: true,
        type: 'GENERIC_RATE_LIMIT',
        severity: 'low',
        suggestedWait: retryAfter ? parseInt(retryAfter) * 1000 : 300000 // 5 minutes default
      };
    }
    
    if (message.includes('rate limit') || message.includes('throttled')) {
      return {
        isRateLimit: true,
        type: 'THROTTLED',
        severity: 'low',
        suggestedWait: 60000 // 1 minute
      };
    }
    
    return {
      isRateLimit: false,
      type: 'NOT_RATE_LIMIT',
      severity: 'low',
      suggestedWait: 0
    };
  }
  
  // CALCULATE INTELLIGENT WAIT TIME
  private calculateRateLimitWait(rateLimitInfo: any, attempt: number, baseDelay: number): number {
    const { severity, suggestedWait } = rateLimitInfo;
    
    // Use suggested wait if available, otherwise calculate based on severity and attempt
    if (suggestedWait > 0) {
      return Math.min(suggestedWait, 7200000); // Max 2 hours
    }
    
    // Exponential backoff based on severity
    const multiplier = severity === 'high' ? 4 : severity === 'medium' ? 2 : 1;
    const waitTime = baseDelay * multiplier * Math.pow(2, attempt - 1);
    
    // Caps based on severity
    const maxWait = severity === 'high' ? 3600000 : severity === 'medium' ? 1800000 : 300000;
    
    return Math.min(waitTime, maxWait);
  }
  
  // INTELLIGENT WAIT WITH PROGRESS FEEDBACK
  private async intelligentWait(ms: number, requestId: string, context: string): Promise<void> {
    if (ms <= 0) return;
    
    const seconds = Math.ceil(ms / 1000);
    console.log(`[META-RETRY-${requestId}] ⏳ Intelligent wait: ${seconds}s for ${context}`);
    
    // For longer waits, provide periodic updates
    if (ms > 30000) { // More than 30 seconds
      const updateInterval = Math.min(30000, ms / 4); // Update every 30s or 1/4 of wait time
      let elapsed = 0;
      
      while (elapsed < ms) {
        const waitChunk = Math.min(updateInterval, ms - elapsed);
        await new Promise(resolve => setTimeout(resolve, waitChunk));
        elapsed += waitChunk;
        
        const remaining = Math.ceil((ms - elapsed) / 1000);
        if (remaining > 0) {
          console.log(`[META-RETRY-${requestId}] ⏳ Still waiting: ${remaining}s remaining for ${context}`);
        }
      }
    } else {
      // Short wait - just wait
      await new Promise(resolve => setTimeout(resolve, ms));
    }
    
    console.log(`[META-RETRY-${requestId}] ✅ Wait completed for ${context}`);
  }
  
  // CHECK IF ERROR IS PERMANENT (should not retry)
  private isPermanentError(errorCode: number, errorMessage: string): boolean {
    const message = (errorMessage || '').toLowerCase();
    
    // Authentication/permission errors
    if (errorCode === 190 || errorCode === 200) return true;
    if (message.includes('invalid access token')) return true;
    if (message.includes('oauth')) return true;
    if (message.includes('permission')) return true;
    if (message.includes('not found')) return true;
    
    // Invalid parameters
    if (errorCode === 100 && !message.includes('rate')) return true;
    
    return false;
  }
  
  // CREATE DETAILED RATE LIMIT ERROR MESSAGE
  private createDetailedRateLimitError(rateLimitInfo: any, errorData: any, attempts: number): string {
    const { type, severity, suggestedWait } = rateLimitInfo;
    
    let message = '';
    const waitMinutes = Math.ceil(suggestedWait / 60000);
    
    switch (type) {
      case 'USER_RATE_LIMIT':
        message = `Rate limit do usuário atingido (Código 17). Esta conta específica excedeu o limite de requisições. Aguarde ${waitMinutes} minutos antes de tentar novamente.`;
        break;
      case 'APP_RATE_LIMIT':
        message = `Rate limit da aplicação atingido (Código 80004). Muitas contas sendo sincronizadas simultaneamente. Aguarde ${waitMinutes} minutos.`;
        break;
      case 'HOURLY_LIMIT':
        message = `Limite de chamadas por hora excedido (Código 613). Aguarde até ${waitMinutes} minutos para o limite ser resetado.`;
        break;
      case 'GENERIC_RATE_LIMIT':
        message = `Rate limit genérico detectado (HTTP 429). Servidor sobrecarregado. Aguarde ${waitMinutes} minutos.`;
        break;
      case 'THROTTLED':
        message = `Requisições sendo limitadas pelo Meta. Sistema está sob alta carga. Aguarde ${waitMinutes} minutos.`;
        break;
      default:
        message = `Rate limit detectado. Aguarde ${waitMinutes} minutos antes de tentar novamente.`;
    }
    
    // Add specific Meta error details if available
    if (errorData.error?.error_user_msg) {
      message += ` Detalhes do Meta: ${errorData.error.error_user_msg}`;
    }
    
    message += ` (${attempts} tentativas realizadas)`;
    
    return message;
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
          
          // Use intelligent retry system for API calls
          const r = await this.fetchWithIntelligentRetry(next!, {
            maxRetries: retries,
            initialDelay: 2000,
            context: `fetchAll_page_${pages + 1}`,
            fetchOptions: {
              signal: controller.signal
            }
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

  // Salvar métricas no cache do banco de dados com timestamp correto do Brasil
  async saveMetricsToCacheWithBrazilTime(
    db: D1Database,
    adId: string,
    clientId: string,
    adAccountRefId: string,
    startStr: string,
    endStr: string,
    days: number,
    metrics: any
  ): Promise<void> {
    const id = `${adId}_${startStr}_${endStr}_${days}`;
    
    try {
      // Timestamp em horário do Brasil (UTC-3)
      const now = new Date();
      const brazilTime = new Date(now.getTime() - (3 * 60 * 60 * 1000));
      const brazilTimestamp = brazilTime.toISOString().replace('T', ' ').slice(0, 19); // Format: YYYY-MM-DD HH:MM:SS
      
      await db.prepare(`
        INSERT OR REPLACE INTO ad_metrics_cache (
          id, ad_id, client_id, ad_account_ref_id, date_start, date_end, period_days,
          spend, impressions, reach, clicks, ctr, cpc, cpm,
          results, conversions, cost_per_conversion, cpa,
          link_clicks, cost_per_link_click,
          landing_page_views, cost_per_landing_page_view,
          leads, cost_per_lead,
          purchases, revenue, roas, cost_per_purchase,
          conversations, thruplays, video_views, profile_visits,
          post_engagement, app_installs, add_to_cart,
          initiate_checkout, complete_registration,
          is_historical, sync_status, synced_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?,
          ?, ?,
          ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?,
          ?, ?, ?, ?
        )
      `).bind(
        id, adId, clientId, adAccountRefId, startStr, endStr, days,
        metrics.spend || 0,
        metrics.impressions || 0,
        metrics.reach || 0,
        metrics.clicks || 0,
        metrics.ctr || 0,
        metrics.cpc || 0,
        metrics.cpm || 0,
        metrics.results || 0,
        metrics.conversions || 0,
        metrics.cost_per_conversion || 0,
        metrics.cpa || 0,
        metrics.link_clicks || 0,
        metrics.cost_per_link_click || 0,
        metrics.landing_page_views || 0,
        metrics.cost_per_landing_page_view || 0,
        metrics.leads || 0,
        metrics.cost_per_lead || 0,
        metrics.purchases || 0,
        metrics.revenue || 0,
        metrics.roas || 0,
        metrics.cost_per_purchase || 0,
        metrics.conversations || 0,
        metrics.thruplays || 0,
        metrics.video_views || 0,
        metrics.profile_visits || 0,
        metrics.post_engagement || 0,
        metrics.app_installs || 0,
        metrics.add_to_cart || 0,
        metrics.initiate_checkout || 0,
        metrics.complete_registration || 0,
        0, // is_historical - 0 for recent data
        'success',
        brazilTimestamp, // synced_at em horário do Brasil
        brazilTimestamp  // updated_at em horário do Brasil
      ).run();
      
      console.log(`[META-METRICS-CACHE] ✅ Saved metrics for ad ${adId}, period ${startStr} to ${endStr} (timestamp: ${brazilTimestamp})`);
    } catch (error) {
      console.error(`[META-METRICS-CACHE] ❌ Error saving metrics for ad ${adId}:`, error);
      
      // Se falhar, salvar entrada de erro com timestamp correto
      try {
        const now = new Date();
        const brazilTime = new Date(now.getTime() - (3 * 60 * 60 * 1000));
        const brazilTimestamp = brazilTime.toISOString().replace('T', ' ').slice(0, 19);
        
        await db.prepare(`
          INSERT OR REPLACE INTO ad_metrics_cache (
            id, ad_id, client_id, ad_account_ref_id, date_start, date_end, period_days,
            sync_status, synced_at, updated_at
          ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, 'error', ?, ?
          )
        `).bind(id, adId, clientId, adAccountRefId, startStr, endStr, days, brazilTimestamp, brazilTimestamp).run();
      } catch (errorSaveError) {
        console.error(`[META-METRICS-CACHE] ❌ Failed to save error entry:`, errorSaveError);
      }
    }
  }

  // Manter método original para compatibilidade com código existente
  async saveMetricsToCache(
    db: D1Database,
    adId: string,
    clientId: string,
    adAccountRefId: string,
    startStr: string,
    endStr: string,
    days: number,
    metrics: any
  ): Promise<void> {
    // Redirecionar para o método com timestamp correto
    return this.saveMetricsToCacheWithBrazilTime(db, adId, clientId, adAccountRefId, startStr, endStr, days, metrics);
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
