// Sistema inteligente de cache de métricas
// Implementa a estratégia: dados antigos no banco, dados recentes via API

import { getPlatform } from './platforms';



interface CacheStrategy {
  useCache: boolean;
  needsSync: boolean;
  reason: string;
}

export class MetricsCache {
  constructor(private db: D1Database) {}

  // Determina estratégia para buscar métricas (usando datas exatas fornecidas)
  async determineStrategy(days: number, startDateStr?: string, endDateStr?: string): Promise<CacheStrategy> {
    let startStr: string, endStr: string;
    
    if (startDateStr && endDateStr) {
      // USAR AS DATAS EXATAS FORNECIDAS - NÃO RECALCULAR
      startStr = startDateStr;
      endStr = endDateStr;
      console.log(`[METRICS-CACHE] Using provided dates: ${startStr} to ${endStr}`);
    } else {
      // Fallback: LÓGICA CORRIGIDA baseada na data/hora atual do sistema
      const now = new Date();
      
      // Data final: ONTEM (último dia com dados completos)
      // Se hoje é 06/09, dados vão até 05/09
      const endDate = new Date(now);
      endDate.setDate(now.getDate() - 1);
      
      // Data inicial: X dias antes da data final
      // Para 7 dias: se final=05/09, início=30/08 (contando: 30,31,01,02,03,04,05 = 7 dias)
      const startDate = new Date(endDate);
      startDate.setDate(endDate.getDate() - (days - 1));
      
      startStr = startDate.toISOString().slice(0, 10);
      endStr = endDate.toISOString().slice(0, 10);
      console.log(`[METRICS-CACHE] CORRIGIDO: Hoje=${now.getDate()}/${now.getMonth()+1}, Final=${endDate.getDate()}/${endDate.getMonth()+1}, Inicial=${startDate.getDate()}/${startDate.getMonth()+1}, Período=${startStr} até ${endStr} (${days} dias)`);
    }
    
    // Calcular quantos dias são "históricos" (> 7 dias atrás)
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    
    const endDate = new Date(endStr + 'T00:00:00Z');
    const isHistorical = endDate <= sevenDaysAgo;
    
    console.log(`[METRICS-CACHE] Strategy analysis:`, {
      period: `${startStr} to ${endStr}`,
      days,
      isHistorical,
      sevenDaysAgo: sevenDaysAgo.toISOString().slice(0, 10)
    });

    if (isHistorical) {
      return {
        useCache: true,
        needsSync: false,
        reason: 'Período histórico - dados não mudam'
      };
    } else {
      return {
        useCache: false,
        needsSync: true,
        reason: 'Período recente - buscar da API'
      };
    }
  }

  // NOVO MÉTODO: Buscar métricas por faixa de datas exata
  async getFromCacheByDateRange(adIds: string[], startDateStr: string, endDateStr: string): Promise<Record<string, any>> {
    console.log(`[METRICS-CACHE-DATE-RANGE] ==================== CACHE LOOKUP BY DATE RANGE ====================`);
    console.log(`[METRICS-CACHE-DATE-RANGE] Request: ${adIds?.length || 0} ads, ${startDateStr} to ${endDateStr}`);
    
    // Validação
    if (!Array.isArray(adIds) || adIds.length === 0) {
      console.warn(`[METRICS-CACHE-DATE-RANGE] Invalid adIds, returning empty`);
      return {};
    }
    
    if (!startDateStr || !endDateStr) {
      console.warn(`[METRICS-CACHE-DATE-RANGE] Invalid date range, falling back to days-based lookup`);
      // Calcular days baseado nas datas
      const start = new Date(startDateStr + 'T00:00:00Z');
      const end = new Date(endDateStr + 'T00:00:00Z');
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 para incluir ambos os dias
      return this.getFromCache(adIds, diffDays);
    }
    
    // Calcular quantos dias são no período
    const start = new Date(startDateStr + 'T00:00:00Z');
    const end = new Date(endDateStr + 'T00:00:00Z');
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const periodDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 para incluir ambos os dias
    
    console.log(`[METRICS-CACHE-DATE-RANGE] Calculated period: ${periodDays} days`);
    
    // Estratégias em ordem de preferência para data exata
    const strategies = [
      { name: 'exact_dates', priority: 1 },
      { name: 'exact_period', priority: 2 },
      { name: 'recent_similar', priority: 3 },
      { name: 'fallback', priority: 4 }
    ];
    
    let foundResults: Record<string, any> = {};
    
    for (const strategy of strategies) {
      try {
        console.log(`[METRICS-CACHE-DATE-RANGE] Trying ${strategy.name} strategy...`);
        
        let strategyResults: Record<string, any> = {};
        
        if (strategy.name === 'exact_dates') {
          strategyResults = await this.getCacheByExactDates(adIds, startDateStr, endDateStr, periodDays);
        } else if (strategy.name === 'exact_period') {
          strategyResults = await this.getCacheByPeriodLength(adIds, periodDays);
        } else if (strategy.name === 'recent_similar') {
          strategyResults = await this.getCacheRecent(adIds, periodDays);
        } else {
          strategyResults = await this.getAnyAvailableMetrics(adIds);
        }
        
        const newFound = Object.keys(strategyResults).length;
        console.log(`[METRICS-CACHE-DATE-RANGE] ${strategy.name}: found ${newFound} results`);
        
        // Adicionar novos resultados
        for (const [adId, result] of Object.entries(strategyResults)) {
          if (!foundResults[adId] && result && (result as any).ok) {
            foundResults[adId] = result;
          }
        }
        
        // Se encontramos dados suficientes nas primeiras estratégias, parar
        const coverage = Object.keys(foundResults).length / adIds.length;
        if (strategy.priority <= 2 && coverage >= 0.8) {
          console.log(`[METRICS-CACHE-DATE-RANGE] Good coverage (${Math.round(coverage * 100)}%) with ${strategy.name}, stopping`);
          break;
        }
        
      } catch (error) {
        console.warn(`[METRICS-CACHE-DATE-RANGE] Strategy ${strategy.name} failed:`, error);
      }
    }
    
    // Para ads sem dados, criar resultado padrão
    const missingAds = adIds.filter(adId => !foundResults[adId]);
    console.log(`[METRICS-CACHE-DATE-RANGE] Missing ads: ${missingAds.length}/${adIds.length}`);
    
    for (const adId of missingAds) {
      foundResults[adId] = this.createEmptyMetricsResultWithDates(adId, startDateStr, endDateStr, periodDays);
    }
    
    console.log(`[METRICS-CACHE-DATE-RANGE] ✅ Final result: ${Object.keys(foundResults).length}/${adIds.length} ads`);
    return foundResults;
  }

  // Buscar métricas do cache - USAR DATAS EXATAS quando fornecidas
  async getFromCache(adIds: string[], days: number, startDateStr?: string, endDateStr?: string): Promise<Record<string, any>> {
    console.log(`[METRICS-CACHE] ==================== CACHE LOOKUP ====================`);
    console.log(`[METRICS-CACHE] Request: ${adIds?.length || 0} ads, ${days} days`);
    
    // PRIORIZAR BUSCA POR DATAS EXATAS
    if (startDateStr && endDateStr) {
      console.log(`[METRICS-CACHE] 🎯 Using exact date range: ${startDateStr} to ${endDateStr}`);
      return await this.getFromCacheByDateRange(adIds, startDateStr, endDateStr);
    }
    
    // Validação
    if (!Array.isArray(adIds) || adIds.length === 0) {
      console.warn(`[METRICS-CACHE] Invalid adIds, returning empty`);
      return {};
    }
    
    if (!days || ![7, 14, 30].includes(days)) {
      console.warn(`[METRICS-CACHE] Invalid days: ${days}, using default 7`);
      days = 7;
    }
    
    // Estratégias em ordem de preferência (fallback quando não há datas exatas)
    const strategies = [
      { name: 'exact', priority: 1 },
      { name: 'recent', priority: 2 },
      { name: 'similar', priority: 3 },
      { name: 'any', priority: 4 }
    ];
    
    let foundResults: Record<string, any> = {};
    
    for (const strategy of strategies) {
      try {
        console.log(`[METRICS-CACHE] Trying ${strategy.name} strategy...`);
        
        let strategyResults: Record<string, any> = {};
        
        if (strategy.name === 'exact') {
          strategyResults = await this.getExactPeriodMetrics(adIds, days);
        } else if (strategy.name === 'recent') {
          strategyResults = await this.getRecentMetrics(adIds);
        } else if (strategy.name === 'similar') {
          strategyResults = await this.getSimilarPeriodMetrics(adIds, days);
        } else {
          strategyResults = await this.getAnyAvailableMetrics(adIds);
        }
        
        const newFound = Object.keys(strategyResults).length;
        console.log(`[METRICS-CACHE] ${strategy.name}: found ${newFound} results`);
        
        // Adicionar novos resultados
        for (const [adId, result] of Object.entries(strategyResults)) {
          if (!foundResults[adId] && result && (result as any).ok) {
            foundResults[adId] = result;
          }
        }
        
        // Se encontramos dados suficientes, parar nas primeiras estratégias
        const coverage = Object.keys(foundResults).length / adIds.length;
        if (strategy.priority <= 2 && coverage >= 0.7) {
          console.log(`[METRICS-CACHE] Good coverage (${Math.round(coverage * 100)}%) with ${strategy.name}, stopping`);
          break;
        }
        
      } catch (error) {
        console.warn(`[METRICS-CACHE] Strategy ${strategy.name} failed:`, error);
      }
    }
    
    // Para ads sem dados, criar resultado padrão
    const missingAds = adIds.filter(adId => !foundResults[adId]);
    console.log(`[METRICS-CACHE] Missing ads: ${missingAds.length}/${adIds.length}`);
    
    for (const adId of missingAds) {
      foundResults[adId] = this.createEmptyMetricsResult(adId, days);
    }
    
    console.log(`[METRICS-CACHE] ✅ Final result: ${Object.keys(foundResults).length}/${adIds.length} ads`);
    return foundResults;
  }

  // IMPLEMENTAÇÕES DOS MÉTODOS DE ESTRATÉGIA DE CACHE

  // Buscar métricas para período exato (NÃO RECALCULAR SE JÁ TEMOS AS DATAS)
  private async getExactPeriodMetrics(adIds: string[], days: number, startDateStr?: string, endDateStr?: string): Promise<Record<string, any>> {
    let startStr: string, endStr: string;
    
    if (startDateStr && endDateStr) {
      // USAR AS DATAS FORNECIDAS - NÃO RECALCULAR
      startStr = startDateStr;
      endStr = endDateStr;
      console.log(`[METRICS-CACHE-EXACT] Using provided exact dates: ${startStr} to ${endStr}`);
    } else {
      // Fallback: LÓGICA CORRIGIDA baseada na data/hora atual do sistema
      const now = new Date();
      
      // Data final: ONTEM (último dia com dados completos)
      // Se hoje é 06/09, dados vão até 05/09
      const endDate = new Date(now);
      endDate.setDate(now.getDate() - 1);
      
      // Data inicial: X dias antes da data final
      // Para 7 dias: se final=05/09, início=30/08 (contando: 30,31,01,02,03,04,05 = 7 dias)
      const startDate = new Date(endDate);
      startDate.setDate(endDate.getDate() - (days - 1));
      
      startStr = startDate.toISOString().slice(0, 10);
      endStr = endDate.toISOString().slice(0, 10);
      
      console.log(`[METRICS-CACHE-EXACT] CORRIGIDO: Hoje=${now.getDate()}/${now.getMonth()+1}, Final=${endDate.getDate()}/${endDate.getMonth()+1}, Inicial=${startDate.getDate()}/${startDate.getMonth()+1}, Período=${startStr} até ${endStr} (${days} dias)`);
    }
    
    return await this.getCacheExact(adIds, startStr, endStr, days);
  }

  // Buscar métricas recentes (últimos 14 dias)
  private async getRecentMetrics(adIds: string[]): Promise<Record<string, any>> {
    return await this.getCacheRecent(adIds, 7); // Use 7 days as default for recent
  }

  // Buscar métricas de períodos similares
  private async getSimilarPeriodMetrics(adIds: string[], days: number): Promise<Record<string, any>> {
    return await this.getCacheSimilar(adIds, days);
  }

  // Buscar qualquer métrica disponível (fallback final)
  private async getAnyAvailableMetrics(adIds: string[]): Promise<Record<string, any>> {
    return await this.getCacheAny(adIds);
  }

  // Buscar métricas por datas exatas
  private async getCacheByExactDates(adIds: string[], startDateStr: string, endDateStr: string, periodDays: number): Promise<Record<string, any>> {
    try {
      const placeholders = adIds.map(() => '?').join(',');
      const query = `
        SELECT ad_id, spend, impressions, reach, clicks, ctr, cpc, cpm,
               results, conversions, cost_per_conversion, cpa,
               link_clicks, cost_per_link_click,
               landing_page_views, cost_per_landing_page_view,
               leads, cost_per_lead,
               purchases, revenue, roas, cost_per_purchase,
               conversations, thruplays, video_views, profile_visits,
               post_engagement, app_installs, add_to_cart,
               initiate_checkout, complete_registration,
               synced_at, sync_status, period_days, date_start, date_end
        FROM ad_metrics_cache 
        WHERE ad_id IN (${placeholders}) 
        AND date_start = ? AND date_end = ? AND period_days = ?
        AND sync_status = 'success'
      `;
      
      const rows = await this.db.prepare(query)
        .bind(...adIds, startDateStr, endDateStr, periodDays)
        .all();
      
      const results: Record<string, any> = {};
      
      for (const row of rows.results as any[]) {
        results[row.ad_id] = this.formatCacheResult(row, false, false, 'exact_dates');
      }
      
      console.log(`[METRICS-CACHE-EXACT-DATES] Found ${Object.keys(results).length} exact matches for ${startDateStr} to ${endDateStr}`);
      return results;
      
    } catch (error) {
      console.error(`[METRICS-CACHE-EXACT-DATES] Error:`, error);
      return {};
    }
  }

  // Buscar métricas por duração do período (mesmo número de dias)
  private async getCacheByPeriodLength(adIds: string[], periodDays: number): Promise<Record<string, any>> {
    try {
      const placeholders = adIds.map(() => '?').join(',');
      const query = `
        SELECT ad_id, spend, impressions, reach, clicks, ctr, cpc, cpm,
               results, conversions, cost_per_conversion, cpa,
               link_clicks, cost_per_link_click,
               landing_page_views, cost_per_landing_page_view,
               leads, cost_per_lead,
               purchases, revenue, roas, cost_per_purchase,
               conversations, thruplays, video_views, profile_visits,
               post_engagement, app_installs, add_to_cart,
               initiate_checkout, complete_registration,
               synced_at, sync_status, period_days, date_start, date_end
        FROM ad_metrics_cache 
        WHERE ad_id IN (${placeholders}) 
        AND period_days = ?
        AND sync_status = 'success'
        AND date_end >= date('now', '-14 days')
        ORDER BY date_end DESC
      `;
      
      const rows = await this.db.prepare(query)
        .bind(...adIds, periodDays)
        .all();
      
      const results: Record<string, any> = {};
      
      // Pegar o mais recente para cada ad_id
      for (const row of rows.results as any[]) {
        if (!results[row.ad_id]) {
          results[row.ad_id] = this.formatCacheResult(row, true, false, 'period_length');
        }
      }
      
      console.log(`[METRICS-CACHE-PERIOD-LENGTH] Found ${Object.keys(results).length} matches for ${periodDays} day periods`);
      return results;
      
    } catch (error) {
      console.error(`[METRICS-CACHE-PERIOD-LENGTH] Error:`, error);
      return {};
    }
  }

  // Criar resultado vazio para faixa de datas específica
  private createEmptyMetricsResultWithDates(adId: string, startDateStr: string, endDateStr: string, periodDays: number): any {
    return {
      ok: false,
      error: `Dados não disponíveis para o período de ${startDateStr} até ${endDateStr} (${periodDays} dias)`,
      suggestion: 'Métricas são atualizadas automaticamente às 7h e 19h. Use "Atualizar Anúncios" para sincronizar dados mais recentes.',
      empty: true,
      ad_id: adId,
      requested_period: `${startDateStr} to ${endDateStr}`,
      requested_days: periodDays
    };
  }

  // Criar resultado vazio quando não há métricas
  private createEmptyMetricsResult(adId: string, days: number): any {
    return {
      ok: false,
      error: `Dados não disponíveis no período de ${days} dias`,
      suggestion: 'Métricas são atualizadas automaticamente às 7h e 19h. Use "Atualizar Anúncios" para sincronizar dados mais recentes.',
      empty: true,
      ad_id: adId,
      requested_days: days
    };
  }
  
  // NOVA ESTRATÉGIA: Buscar dados recentes (últimos 14 dias)
  private async getCacheRecent(adIds: string[], _days: number): Promise<Record<string, any>> {
    try {
      const placeholders = adIds.map(() => '?').join(',');
      const query = `
        SELECT ad_id, spend, impressions, reach, clicks, ctr, cpc, cpm,
               results, conversions, cost_per_conversion, cpa,
               link_clicks, cost_per_link_click,
               landing_page_views, cost_per_landing_page_view,
               leads, cost_per_lead,
               purchases, revenue, roas, cost_per_purchase,
               conversations, thruplays, video_views, profile_visits,
               post_engagement, app_installs, add_to_cart,
               initiate_checkout, complete_registration,
               synced_at, sync_status, period_days, date_start, date_end
        FROM ad_metrics_cache 
        WHERE ad_id IN (${placeholders}) 
        AND sync_status = 'success'
        AND date_end >= date('now', '-14 days')
        ORDER BY date_end DESC, period_days DESC
      `;
      
      const rows = await this.db.prepare(query)
        .bind(...adIds)
        .all();
      
      const results: Record<string, any> = {};
      
      // Pegar o mais recente para cada ad_id
      for (const row of rows.results as any[]) {
        if (!results[row.ad_id]) {
          results[row.ad_id] = this.formatCacheResult(row, false, false, 'recent');
        }
      }
      
      return results;
      
    } catch (error) {
      console.error(`[METRICS-CACHE-ULTRA-SAFE] getCacheRecent error:`, error);
      return {};
    }
  }
  
  // BUSCAR CACHE EXATO
  private async getCacheExact(adIds: string[], startStr: string, endStr: string, days: number): Promise<Record<string, any>> {
    const placeholders = adIds.map(() => '?').join(',');
    const query = `
      SELECT ad_id, spend, impressions, reach, clicks, ctr, cpc, cpm,
             results, conversions, cost_per_conversion, cpa,
             link_clicks, cost_per_link_click,
             landing_page_views, cost_per_landing_page_view,
             leads, cost_per_lead,
             purchases, revenue, roas, cost_per_purchase,
             conversations, thruplays, video_views, profile_visits,
             post_engagement, app_installs, add_to_cart,
             initiate_checkout, complete_registration,
             synced_at, sync_status
      FROM ad_metrics_cache 
      WHERE ad_id IN (${placeholders}) 
      AND date_start = ? AND date_end = ? AND period_days = ?
      AND sync_status = 'success'
    `;
    
    const rows = await this.db.prepare(query)
      .bind(...adIds, startStr, endStr, days)
      .all();
    
    const results: Record<string, any> = {};
    
    for (const row of rows.results as any[]) {
      results[row.ad_id] = this.formatCacheResult(row);
    }
    
    return results;
  }
  
  // BUSCAR PERÍODOS SIMILARES (mesma duração)
  private async getCacheSimilar(adIds: string[], days: number): Promise<Record<string, any>> {
    const placeholders = adIds.map(() => '?').join(',');
    const query = `
      SELECT ad_id, spend, impressions, reach, clicks, ctr, cpc, cpm,
             results, conversions, cost_per_conversion, cpa,
             link_clicks, cost_per_link_click,
             landing_page_views, cost_per_landing_page_view,
             leads, cost_per_lead,
             purchases, revenue, roas, cost_per_purchase,
             conversations, thruplays, video_views, profile_visits,
             post_engagement, app_installs, add_to_cart,
             initiate_checkout, complete_registration,
             synced_at, sync_status, date_start, date_end
      FROM ad_metrics_cache 
      WHERE ad_id IN (${placeholders}) 
      AND period_days = ?
      AND sync_status = 'success'
      AND date_end >= date('now', '-14 days')
      ORDER BY date_end DESC
    `;
    
    const rows = await this.db.prepare(query)
      .bind(...adIds, days)
      .all();
    
    const results: Record<string, any> = {};
    
    // Pegar o mais recente para cada ad_id
    for (const row of rows.results as any[]) {
      if (!results[row.ad_id]) {
        results[row.ad_id] = this.formatCacheResult(row, true, false, 'similar'); // Mark as similar
      }
    }
    
    return results;
  }
  
  // BUSCAR QUALQUER DADO DISPONÍVEL (emergency fallback)
  private async getCacheAny(adIds: string[]): Promise<Record<string, any>> {
    const placeholders = adIds.map(() => '?').join(',');
    const query = `
      SELECT ad_id, spend, impressions, reach, clicks, ctr, cpc, cpm,
             results, conversions, cost_per_conversion, cpa,
             link_clicks, cost_per_link_click,
             landing_page_views, cost_per_landing_page_view,
             leads, cost_per_lead,
             purchases, revenue, roas, cost_per_purchase,
             conversations, thruplays, video_views, profile_visits,
             post_engagement, app_installs, add_to_cart,
             initiate_checkout, complete_registration,
             synced_at, sync_status, period_days
      FROM ad_metrics_cache 
      WHERE ad_id IN (${placeholders}) 
      AND sync_status = 'success'
      ORDER BY synced_at DESC
    `;
    
    const rows = await this.db.prepare(query)
      .bind(...adIds)
      .all();
    
    const results: Record<string, any> = {};
    
    // Pegar o mais recente para cada ad_id
    for (const row of rows.results as any[]) {
      if (!results[row.ad_id]) {
        results[row.ad_id] = this.formatCacheResult(row, false, true, 'fallback'); // Mark as fallback
      }
    }
    
    return results;
  }
  
  // FORMATAR RESULTADO DO CACHE
  private formatCacheResult(row: any, isSimilar: boolean = false, isFallback: boolean = false, source: string = 'exact'): any {
    return {
      ok: true,
      metrics: {
        spend: row.spend || 0,
        impressions: row.impressions || 0,
        reach: row.reach || 0,
        clicks: row.clicks || 0,
        ctr: row.ctr || 0,
        cpc: row.cpc || 0,
        cpm: row.cpm || 0,
        results: row.results || 0,
        conversions: row.conversions || 0,
        cost_per_conversion: row.cost_per_conversion || 0,
        cpa: row.cpa || 0,
        link_clicks: row.link_clicks || 0,
        cost_per_link_click: row.cost_per_link_click || 0,
        landing_page_views: row.landing_page_views || 0,
        cost_per_landing_page_view: row.cost_per_landing_page_view || 0,
        leads: row.leads || 0,
        cost_per_lead: row.cost_per_lead || 0,
        purchases: row.purchases || 0,
        revenue: row.revenue || 0,
        roas: row.roas || 0,
        cost_per_purchase: row.cost_per_purchase || 0,
        conversations: row.conversations || 0,
        thruplays: row.thruplays || 0,
        video_views: row.video_views || 0,
        profile_visits: row.profile_visits || 0,
        post_engagement: row.post_engagement || 0,
        app_installs: row.app_installs || 0,
        add_to_cart: row.add_to_cart || 0,
        initiate_checkout: row.initiate_checkout || 0,
        complete_registration: row.complete_registration || 0
      },
      cached: true,
      synced_at: row.synced_at,
      data_source: isFallback ? 'fallback_cache' : isSimilar ? 'similar_period' : source === 'recent' ? 'recent_cache' : 'exact_cache',
      period_days: row.period_days || null,
      original_period: row.date_start && row.date_end ? `${row.date_start} to ${row.date_end}` : null
    };
  }

  // Salvar métricas no cache (USAR DATAS FORNECIDAS quando disponíveis)
  async saveToCache(
    adId: string,
    clientId: string,
    adAccountRefId: string,
    days: number,
    metrics: any,
    isHistorical: boolean = false,
    startDateStr?: string,
    endDateStr?: string
  ): Promise<void> {
    let startStr: string, endStr: string;
    
    if (startDateStr && endDateStr) {
      // USAR AS DATAS FORNECIDAS - NÃO RECALCULAR
      startStr = startDateStr;
      endStr = endDateStr;
      console.log(`[METRICS-CACHE-SAVE] Using provided dates for save: ${startStr} to ${endStr}`);
    } else {
      // Fallback: LÓGICA CORRIGIDA com timezone do Brasil (UTC-3)
      const now = new Date();
      // Ajustar para timezone do Brasil (UTC-3)
      const brazilTime = new Date(now.getTime() - (3 * 60 * 60 * 1000));
      
      // Data final: ONTEM no horário do Brasil (último dia com dados completos)
      // Se hoje é 06/09 no Brasil, dados vão até 05/09
      const endDate = new Date(brazilTime);
      endDate.setDate(brazilTime.getDate() - 1);
      
      // Data inicial: X dias antes da data final
      // Para 7 dias: se final=05/09, início=30/08 (contando: 30,31,01,02,03,04,05 = 7 dias)
      const startDate = new Date(endDate);
      startDate.setDate(endDate.getDate() - (days - 1));
      
      startStr = startDate.toISOString().slice(0, 10);
      endStr = endDate.toISOString().slice(0, 10);
      
      console.log(`[METRICS-CACHE-SAVE] CORRIGIDO (Brasil): salvando período ${startStr} até ${endStr} (${days} dias)`);
    }
    
    const id = `${adId}_${startStr}_${endStr}_${days}`;
    
    try {
      // Timestamp em horário do Brasil (UTC-3)
      const now = new Date();
      const brazilTime = new Date(now.getTime() - (3 * 60 * 60 * 1000));
      const brazilTimestamp = brazilTime.toISOString().replace('T', ' ').slice(0, 19); // Format: YYYY-MM-DD HH:MM:SS
      
      await this.db.prepare(`
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
        isHistorical ? 1 : 0,
        'success',
        brazilTimestamp, // synced_at em horário do Brasil
        brazilTimestamp  // updated_at em horário do Brasil
      ).run();
      
      console.log(`[METRICS-CACHE] Saved metrics for ad ${adId}, period ${startStr} to ${endStr} (timestamp: ${brazilTimestamp})`);
    } catch (error) {
      console.error(`[METRICS-CACHE] Error saving metrics for ad ${adId}:`, error);
    }
  }

  // Sincronizar métricas para um período específico COM DATAS EXATAS (usado nos agendamentos)
  async syncMetricsForPeriodWithDates(
    adAccountRefId: string,
    clientId: string,
    days: number,
    startDateStr: string,
    endDateStr: string,
    isHistorical: boolean = false
  ): Promise<{ success: number; errors: number }> {
    console.log(`[METRICS-SYNC-WITH-DATES] Sincronizando COM DATAS EXATAS: ${startDateStr} até ${endDateStr} (${days} dias)`);
    
    // Use the new method with exact dates
    return this.syncMetricsForPeriodInternal(adAccountRefId, clientId, days, isHistorical, startDateStr, endDateStr);
  }

  // Método original (fallback para compatibilidade)
  async syncMetricsForPeriod(
    adAccountRefId: string,
    clientId: string,
    days: number,
    isHistorical: boolean = false
  ): Promise<{ success: number; errors: number }> {
    console.log(`[METRICS-SYNC-LEGACY] Usando método legado SEM datas específicas para ${days} dias`);
    
    // Use the internal method without specific dates (will calculate)
    return this.syncMetricsForPeriodInternal(adAccountRefId, clientId, days, isHistorical);
  }

  // Método interno que funciona com ou sem datas específicas
  private async syncMetricsForPeriodInternal(
    adAccountRefId: string,
    clientId: string,
    days: number,
    isHistorical: boolean = false,
    startDateStr?: string,
    endDateStr?: string
  ): Promise<{ success: number; errors: number }> {
    console.log(`[METRICS-SYNC] Starting sync for account ${adAccountRefId}, ${days} days, historical: ${isHistorical}`);
    
    let success = 0;
    let errors = 0;
    
    try {
      // Buscar conta de anúncios
      const adAccount = await this.db.prepare(`
        SELECT * FROM ad_accounts WHERE id = ? AND is_active = 1
      `).bind(adAccountRefId).first() as any;
      
      if (!adAccount) {
        console.error(`[METRICS-SYNC] Ad account not found: ${adAccountRefId}`);
        return { success: 0, errors: 1 };
      }
      
      // Buscar TODOS os anúncios desta conta (ACTIVE e PAUSED) para ter histórico completo
      const ads = await this.db.prepare(`
        SELECT ad_id FROM ads_active_raw 
        WHERE ad_account_ref_id = ?
      `).bind(adAccountRefId).all();
      
      const adIds = (ads.results as any[]).map(ad => ad.ad_id);
      
      if (adIds.length === 0) {
        console.log(`[METRICS-SYNC] No ads found for account ${adAccountRefId}`);
        return { success: 0, errors: 0 };
      }
      
      console.log(`[METRICS-SYNC] Found ${adIds.length} ads to sync metrics`);
      
      // USAR DATAS EXATAS SE FORNECIDAS, senão calcular corretamente
      let startStr: string, endStr: string;
      
      if (startDateStr && endDateStr) {
        // USAR AS DATAS FORNECIDAS - NÃO RECALCULAR
        startStr = startDateStr;
        endStr = endDateStr;
        console.log(`[METRICS-SYNC] 🎯 USANDO DATAS EXATAS FORNECIDAS: ${startStr} até ${endStr} (${days} dias)`);
      } else {
        // VERIFICAR SE JÁ TEMOS DADOS NO CACHE PARA ESTE PERÍODO
        // LÓGICA CORRIGIDA baseada na data/hora atual do sistema
        const now = new Date();
        
        // Data final: ONTEM (último dia com dados completos)
        // Se hoje é 06/09, dados vão até 05/09
        const endDate = new Date(now);
        endDate.setDate(now.getDate() - 1);
        
        // Data inicial: X dias antes da data final
        // Para 7 dias: se final=05/09, início=30/08 (contando: 30,31,01,02,03,04,05 = 7 dias)
        const startDate = new Date(endDate);
        startDate.setDate(endDate.getDate() - (days - 1));
        
        startStr = startDate.toISOString().slice(0, 10);
        endStr = endDate.toISOString().slice(0, 10);
        
        console.log(`[METRICS-SYNC] CORRIGIDO: Hoje=${now.getDate()}/${now.getMonth()+1}, verificando cache para período ${startStr} até ${endStr} (${days} dias)`);
      }
      
      // Verificar quantos ads já têm dados salvos para este período
      const existingMetrics = await this.db.prepare(`
        SELECT COUNT(*) as count FROM ad_metrics_cache 
        WHERE ad_account_ref_id = ? AND date_start = ? AND date_end = ? AND period_days = ?
        AND sync_status = 'success'
      `).bind(adAccountRefId, startStr, endStr, days).first() as any;
      
      const existingCount = existingMetrics?.count || 0;
      console.log(`[METRICS-SYNC] Already have ${existingCount}/${adIds.length} metrics for period ${startStr} to ${endStr}`);
      
      // Se já temos dados para a maioria dos ads (>80%), pular sincronização
      if (existingCount >= adIds.length * 0.8) {
        console.log(`[METRICS-SYNC] ✅ Most metrics already cached (${existingCount}/${adIds.length}), skipping sync`);
        return { success: existingCount, errors: 0 };
      }
      
      // Filtrar apenas ads que ainda não têm métricas salvas
      const adsNeedingSync = [];
      for (const adId of adIds) {
        const hasMetrics = await this.db.prepare(`
          SELECT 1 FROM ad_metrics_cache 
          WHERE ad_id = ? AND date_start = ? AND date_end = ? AND period_days = ?
          AND sync_status = 'success'
        `).bind(adId, startStr, endStr, days).first();
        
        if (!hasMetrics) {
          adsNeedingSync.push(adId);
        }
      }
      
      console.log(`[METRICS-SYNC] ${adsNeedingSync.length} ads need metrics sync for ${days} days`);
      
      if (adsNeedingSync.length === 0) {
        console.log(`[METRICS-SYNC] ✅ All metrics already cached`);
        return { success: adIds.length, errors: 0 };
      }
      
      // Descriptografar token
      const { decrypt } = await import('./crypto');
      const cryptoKey = 'c8e2b9f7a1d4e6f8c9e2b7f4a1d6e8f9c2e5b8f1a4d7e9f2c5e8b1f4a7d9e2f5c8';
      const cryptoIV = 'a1b2c3d4e5f6a7b8c9d0e1f2';
      
      let accessToken;
      try {
        accessToken = await decrypt(adAccount.access_token_enc, cryptoKey, cryptoIV);
        if (!accessToken?.trim()) {
          throw new Error('Token vazio');
        }
      } catch (error) {
        console.error(`[METRICS-SYNC] Token decryption failed:`, error);
        return { success: 0, errors: 1 };
      }
      
      // Buscar métricas da plataforma
      const platform = getPlatform(adAccount.platform);
      if (!platform) {
        console.error(`[METRICS-SYNC] Platform not supported: ${adAccount.platform}`);
        return { success: 0, errors: 1 };
      }
      
      // Validar token
      const isValidToken = await platform.validateToken(accessToken, adAccount.account_id);
      if (!isValidToken) {
        console.error(`[METRICS-SYNC] Invalid token for account ${adAccount.account_name}`);
        return { success: 0, errors: 1 };
      }
      
      // Buscar métricas em chunks menores para evitar timeout
      const chunkSize = 15; // Reduzido para maior estabilidade
      const chunks = this.chunk(adsNeedingSync, chunkSize);
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`[METRICS-SYNC] Processing chunk ${i + 1}/${chunks.length} with ${chunk.length} ads`);
        
        try {
          const metricsResult = await platform.getMetrics(
            accessToken,
            adAccount.account_id,
            chunk,
            days,
            startStr,
            endStr
          );
          
          // Salvar cada métrica no cache
          for (const [adId, result] of Object.entries(metricsResult)) {
            if ((result as any).ok && (result as any).metrics) {
              await this.saveToCache(
                adId,
                clientId,
                adAccountRefId,
                days,
                (result as any).metrics,
                isHistorical
              );
              success++;
            } else {
              console.warn(`[METRICS-SYNC] No metrics for ad ${adId}:`, (result as any).error);
              // Salvar entrada de erro no cache para evitar tentar novamente
              await this.saveErrorToCache(adId, clientId, adAccountRefId, days, (result as any).error || 'No data');
              errors++;
            }
          }
          
          // Delay entre chunks para evitar rate limits
          if (i < chunks.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
        } catch (chunkError) {
          console.error(`[METRICS-SYNC] Error processing chunk ${i + 1}:`, chunkError);
          errors += chunk.length;
        }
      }
      
      // Adicionar os que já existiam ao sucesso
      success += existingCount;
      
    } catch (error) {
      console.error(`[METRICS-SYNC] Sync error:`, error);
      errors++;
    }
    
    console.log(`[METRICS-SYNC] Completed: ${success} success, ${errors} errors`);
    return { success, errors };
  }

  // Salvar erro no cache para evitar retentativas desnecessárias (USAR DATAS FORNECIDAS)
  private async saveErrorToCache(
    adId: string,
    clientId: string,
    adAccountRefId: string,
    days: number,
    error: string,
    startDateStr?: string,
    endDateStr?: string
  ): Promise<void> {
    let startStr: string, endStr: string;
    
    if (startDateStr && endDateStr) {
      // USAR AS DATAS FORNECIDAS - NÃO RECALCULAR
      startStr = startDateStr;
      endStr = endDateStr;
      console.log(`[METRICS-CACHE-ERROR] Using provided dates for error: ${startStr} to ${endStr}`);
    } else {
      // Fallback: LÓGICA CORRIGIDA baseada na data/hora atual do sistema
      const now = new Date();
      
      // Data final: ONTEM (último dia com dados completos)
      // Se hoje é 06/09, dados vão até 05/09
      const endDate = new Date(now);
      endDate.setDate(now.getDate() - 1);
      
      // Data inicial: X dias antes da data final
      // Para 7 dias: se final=05/09, início=30/08 (contando: 30,31,01,02,03,04,05 = 7 dias)
      const startDate = new Date(endDate);
      startDate.setDate(endDate.getDate() - (days - 1));
      
      startStr = startDate.toISOString().slice(0, 10);
      endStr = endDate.toISOString().slice(0, 10);
      
      console.log(`[METRICS-CACHE-ERROR] CORRIGIDO: Hoje=${now.getDate()}/${now.getMonth()+1}, salvando erro para período ${startStr} até ${endStr} (${days} dias)`);
    }
    
    const id = `${adId}_${startStr}_${endStr}_${days}`;
    
    try {
      await this.db.prepare(`
        INSERT OR REPLACE INTO ad_metrics_cache (
          id, ad_id, client_id, ad_account_ref_id, date_start, date_end, period_days,
          sync_status, synced_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, 'error', datetime('now'), datetime('now')
        )
      `).bind(id, adId, clientId, adAccountRefId, startStr, endStr, days).run();
      
      console.log(`[METRICS-CACHE] Saved error entry for ad ${adId}, period ${startStr} to ${endStr}: ${error}`);
    } catch (dbError) {
      console.error(`[METRICS-CACHE] Error saving error entry for ad ${adId}:`, dbError);
    }
  }

  // Utilidade para dividir arrays em chunks
  private chunk<T>(arr: T[], size: number): T[][] {
    const result: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      result.push(arr.slice(i, i + size));
    }
    return result;
  }

  // Limpar cache antigo (opcional, para manutenção)
  async cleanOldCache(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffStr = cutoffDate.toISOString().slice(0, 10);
    
    const result = await this.db.prepare(`
      DELETE FROM ad_metrics_cache 
      WHERE date_end < ? AND is_historical = 1
    `).bind(cutoffStr).run();
    
    console.log(`[METRICS-CACHE] Cleaned ${result.meta?.changes || 0} old cache entries`);
    return result.meta?.changes || 0;
  }
}

// Funções utilitárias para agendamentos
export async function shouldRunScheduledSync(db: D1Database, scheduleType: string): Promise<boolean> {
  const schedule = await db.prepare(`
    SELECT * FROM sync_schedules WHERE schedule_type = ? AND status = 'active'
  `).bind(scheduleType).first() as any;
  
  if (!schedule) return false;
  
  const now = new Date();
  const nextRun = new Date(schedule.next_run_at);
  
  return now >= nextRun;
}

export async function updateScheduleStatus(
  db: D1Database, 
  scheduleType: string, 
  success: boolean, 
  error?: string
): Promise<void> {
  const now = new Date();
  const nextRun = new Date();
  
  // Calcular próxima execução (12h depois)
  if (scheduleType === 'metrics_morning') {
    nextRun.setDate(nextRun.getDate() + 1);
    nextRun.setHours(7, 0, 0, 0);
  } else if (scheduleType === 'metrics_evening') {
    nextRun.setDate(nextRun.getDate() + 1);
    nextRun.setHours(19, 0, 0, 0);
  } else if (scheduleType === 'ads_sync') {
    nextRun.setDate(nextRun.getDate() + 1);
    nextRun.setHours(7, 0, 0, 0);
  }
  
  await db.prepare(`
    UPDATE sync_schedules 
    SET last_run_at = ?, 
        next_run_at = ?, 
        run_count = run_count + 1,
        error_count = CASE WHEN ? THEN error_count ELSE error_count + 1 END,
        last_error = ?,
        updated_at = datetime('now')
    WHERE schedule_type = ?
  `).bind(
    now.toISOString(),
    nextRun.toISOString(),
    success ? 1 : 0,
    error || null,
    scheduleType
  ).run();
}
