// Debug específico para métricas CPA
export async function debugCPAForAd(
  db: D1Database, 
  adId: string, 
  token: string, 
  accountId: string
): Promise<any> {
  console.log(`[DEBUG-CPA] Iniciando debug para anúncio: ${adId}`);
  
  try {
    // 1. Buscar dados do anúncio no banco
    const adResult = await db.prepare(`
      SELECT a.*, aa.platform, aa.account_id, c.name as client_name
      FROM ads_active_raw a 
      LEFT JOIN ad_accounts aa ON a.ad_account_ref_id = aa.id
      LEFT JOIN clients c ON a.client_id = c.id
      WHERE a.ad_id = ?
    `).bind(adId).first();
    
    if (!adResult) {
      return { error: 'Anúncio não encontrado no banco de dados' };
    }
    
    console.log(`[DEBUG-CPA] Anúncio encontrado:`, adResult);
    
    // 2. Buscar dados diretos da API Meta
    const graphVersion = 'v23.0';
    const today = new Date();
    const yesterdayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - 1));
    const sinceDate = new Date(Date.UTC(yesterdayUTC.getUTCFullYear(), yesterdayUTC.getUTCMonth(), yesterdayUTC.getUTCDate() - 6)); // 7 dias
    
    const sinceStr = sinceDate.toISOString().slice(0, 10);
    const untilStr = yesterdayUTC.toISOString().slice(0, 10);
    
    const actPath = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
    const timeRange = JSON.stringify({since: sinceStr, until: untilStr});
    const filtering = JSON.stringify([{ field: "ad.id", operator: "IN", value: [adId] }]);
    
    const insightsFields = [
      "ad_id", "ad_name", "spend", "impressions", "clicks", "ctr", "cpc", "cpm",
      "actions", "action_values", "cost_per_action_type", "purchase_roas"
    ].join(",");
    
    const insightsUrl = `https://graph.facebook.com/${graphVersion}/${actPath}/insights?level=ad&fields=${insightsFields}&time_range=${encodeURIComponent(timeRange)}&filtering=${encodeURIComponent(filtering)}&access_token=${encodeURIComponent(token)}`;
    
    console.log(`[DEBUG-CPA] Chamando Meta API: ${insightsUrl}`);
    
    const response = await fetch(insightsUrl);
    const data = await response.json() as any;
    
    if (!response.ok) {
      console.error(`[DEBUG-CPA] Erro na API Meta:`, data);
      return { 
        error: `Erro Meta API: ${data.error?.message || 'Unknown error'}`,
        adData: adResult 
      };
    }
    
    const insightData = data.data?.[0];
    if (!insightData) {
      return { 
        error: 'Nenhum dado de métricas encontrado para este anúncio no período',
        adData: adResult,
        period: { since: sinceStr, until: untilStr }
      };
    }
    
    console.log(`[DEBUG-CPA] Dados da API Meta:`, insightData);
    
    // 3. Analisar métricas CPA
    const actions = Array.isArray(insightData.actions) ? insightData.actions : [];
    const costPerAction = Array.isArray(insightData.cost_per_action_type) ? insightData.cost_per_action_type : [];
    
    // Chaves para diferentes tipos de conversão
    const KEYS_PURCHASE = ["omni_purchase", "offsite_conversion.fb_pixel_purchase", "purchase", "offsite_conversion.purchase"];
    const KEYS_LEAD = ["omni_lead", "offsite_conversion.fb_pixel_lead", "lead", "offsite_conversion.lead"];
    const KEYS_LPV = ["landing_page_view", "omni_landing_page_view"];
    
    const pickAction = (arr: any[], keys: string[]) => {
      if (!Array.isArray(arr)) return 0;
      for (const k of keys) {
        const hit = arr.find(a => String(a?.action_type || "") === k);
        if (hit) {
          const v = Number(hit?.value || 0);
          if (v > 0) return v;
        }
      }
      return 0;
    };
    
    const pickCPA = (arr: any[], keys: string[]) => {
      if (!Array.isArray(arr)) return 0;
      for (const k of keys) {
        const hit = arr.find(a => String(a?.action_type || "") === k);
        if (hit) {
          const v = Number(hit?.value || 0);
          if (v > 0) return v;
        }
      }
      return 0;
    };
    
    const purchases = pickAction(actions, KEYS_PURCHASE);
    const leads = pickAction(actions, KEYS_LEAD);
    const lpv = pickAction(actions, KEYS_LPV);
    
    const cpaPurchase = pickCPA(costPerAction, KEYS_PURCHASE);
    const cpaLead = pickCPA(costPerAction, KEYS_LEAD);
    const cpaLPV = pickCPA(costPerAction, KEYS_LPV);
    
    // CPA manual (spend / conversões)
    const spend = Number(insightData.spend || 0);
    const manualCPAPurchase = purchases > 0 ? spend / purchases : 0;
    const manualCPALead = leads > 0 ? spend / leads : 0;
    const manualCPALPV = lpv > 0 ? spend / lpv : 0;
    
    return {
      adData: adResult,
      period: { since: sinceStr, until: untilStr },
      metaApiData: insightData,
      analysis: {
        spend: spend,
        conversions: {
          purchases: purchases,
          leads: leads,
          landing_page_views: lpv
        },
        cpaFromMeta: {
          purchase: cpaPurchase,
          lead: cpaLead,
          landing_page_view: cpaLPV
        },
        cpaManual: {
          purchase: manualCPAPurchase,
          lead: manualCPALead,
          landing_page_view: manualCPALPV
        },
        rawData: {
          actions: actions,
          costPerAction: costPerAction
        }
      }
    };
    
  } catch (error) {
    console.error(`[DEBUG-CPA] Erro no debug:`, error);
    return { 
      error: `Erro no debug: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}
