// Sistema de sincronização agendada para métricas e anúncios
// Executa no horário de Brasília (UTC-3): 7h e 19h

import { MetricsCache, shouldRunScheduledSync, updateScheduleStatus } from './metrics-cache';
import { getPlatform } from './platforms';

export async function runScheduledSyncs(db: D1Database, env: any): Promise<void> {
  console.log('[SCHEDULED-SYNC] SISTEMA AUTOMÁTICO COMPLETAMENTE DESABILITADO');
  console.log('[SCHEDULED-SYNC] Sincronização automática foi removida do sistema');
  console.log('[SCHEDULED-SYNC] Use apenas o botão "Atualizar Anúncios" na interface');
  
  // Sistema de sincronização automática COMPLETAMENTE REMOVIDO
  // Para sincronizar dados, use o botão "Atualizar Anúncios" na interface
  
  return;
  
  // Código original comentado para preservar funcionalidade:
  /*
  try {
    // Verificar sync de métricas matutino (7h Brasília = 10h UTC)
    if (await shouldRunScheduledSync(db, 'metrics_morning')) {
      console.log('[SCHEDULED-SYNC] Running morning metrics sync (7h Brasília)...');
      await runMetricsSync(db, env, 'metrics_morning');
    }
    
    // Verificar sync de métricas noturno (19h Brasília = 22h UTC)
    if (await shouldRunScheduledSync(db, 'metrics_evening')) {
      console.log('[SCHEDULED-SYNC] Running evening metrics sync (19h Brasília)...');
      await runMetricsSync(db, env, 'metrics_evening');
    }
    
    // Verificar sync de anúncios diário (4h Brasília = 7h UTC)
    if (await shouldRunScheduledSync(db, 'ads_sync')) {
      console.log('[SCHEDULED-SYNC] Running daily ads sync (4h Brasília)...');
      await runAdsSync(db, env);
    }
    
  } catch (error) {
    console.error('[SCHEDULED-SYNC] Error in scheduled sync:', error);
  }
  */
}

async function runMetricsSync(db: D1Database, _env: any, scheduleType: string): Promise<void> {
  const startTime = Date.now();
  let totalSuccess = 0;
  let totalErrors = 0;
  
  try {
    console.log(`[SCHEDULED-SYNC] Starting ${scheduleType}...`);
    
    // Buscar todas as contas de anúncios ativas
    const adAccounts = await db.prepare(`
      SELECT aa.*, c.id as client_id, c.name as client_name
      FROM ad_accounts aa
      JOIN clients c ON aa.client_id = c.id
      WHERE aa.is_active = 1 AND c.is_active = 1
      AND aa.access_token_enc IS NOT NULL
      ORDER BY c.name, aa.account_name
    `).all();
    
    console.log(`[SCHEDULED-SYNC] Found ${adAccounts.results?.length || 0} active ad accounts`);
    
    const metricsCache = new MetricsCache(db);
    
    // Sincronizar métricas para diferentes períodos
    const periods = [
      { days: 7, isHistorical: false },   // Últimos 7 dias (sempre atualizar)
      { days: 14, isHistorical: false },  // Últimos 14 dias (sempre atualizar)
      { days: 30, isHistorical: true }    // Últimos 30 dias (histórico parcial)
    ];
    
    for (const account of (adAccounts.results as any[])) {
      console.log(`[SCHEDULED-SYNC] Processing account: ${account.client_name} - ${account.account_name}`);
      
      for (const period of periods) {
        try {
          const result = await metricsCache.syncMetricsForPeriod(
            account.id,
            account.client_id,
            period.days,
            period.isHistorical
          );
          
          totalSuccess += result.success;
          totalErrors += result.errors;
          
          console.log(`[SCHEDULED-SYNC] Account ${account.account_name}, ${period.days} days: ${result.success} success, ${result.errors} errors`);
          
          // Delay entre contas para evitar rate limits
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (accountError) {
          console.error(`[SCHEDULED-SYNC] Error syncing account ${account.account_name}:`, accountError);
          totalErrors++;
        }
      }
    }
    
    const duration = Date.now() - startTime;
    console.log(`[SCHEDULED-SYNC] ${scheduleType} completed: ${totalSuccess} success, ${totalErrors} errors, ${duration}ms`);
    
    // Atualizar status do agendamento
    await updateScheduleStatus(db, scheduleType, totalErrors === 0);
    
  } catch (error) {
    console.error(`[SCHEDULED-SYNC] ${scheduleType} failed:`, error);
    await updateScheduleStatus(db, scheduleType, false, error instanceof Error ? error.message : 'Unknown error');
  }
}

async function runAdsSync(db: D1Database, env: any): Promise<void> {
  const startTime = Date.now();
  let totalCampaigns = 0;
  let totalAds = 0;
  let totalErrors = 0;
  
  try {
    console.log('[SCHEDULED-SYNC] Starting daily ads sync...');
    
    // Buscar todas as contas de anúncios ativas
    const adAccounts = await db.prepare(`
      SELECT aa.*, c.id as client_id, c.name as client_name
      FROM ad_accounts aa
      JOIN clients c ON aa.client_id = c.id
      WHERE aa.is_active = 1 AND c.is_active = 1
      AND aa.access_token_enc IS NOT NULL
      ORDER BY c.name, aa.account_name
    `).all();
    
    console.log(`[SCHEDULED-SYNC] Found ${adAccounts.results?.length || 0} active ad accounts for ads sync`);
    
    for (const account of (adAccounts.results as any[])) {
      console.log(`[SCHEDULED-SYNC] Syncing ads for: ${account.client_name} - ${account.account_name}`);
      
      try {
        const platform = getPlatform(account.platform);
        if (!platform) {
          console.warn(`[SCHEDULED-SYNC] Platform not supported: ${account.platform}`);
          totalErrors++;
          continue;
        }
        
        // Descriptografar token
        const cryptoKey = env.CRYPTO_KEY || 'fallback_key';
        const cryptoIV = env.CRYPTO_IV || 'fallback_iv';
        
        const { decrypt } = await import('./crypto');
        let accessToken;
        try {
          accessToken = await decrypt(account.access_token_enc, cryptoKey, cryptoIV);
          if (!accessToken?.trim()) {
            throw new Error('Token vazio');
          }
        } catch (error) {
          console.error(`[SCHEDULED-SYNC] Token decryption failed for ${account.account_name}:`, error);
          totalErrors++;
          continue;
        }
        
        // Validar token
        const isValidToken = await platform.validateToken(accessToken, account.account_id);
        if (!isValidToken) {
          console.error(`[SCHEDULED-SYNC] Invalid token for ${account.account_name}`);
          totalErrors++;
          continue;
        }
        
        // Sincronizar anúncios
        const syncResult = await platform.syncAds(
          db,
          account.id,
          account.client_id,
          accessToken,
          account.account_id,
          30 // Últimos 30 dias
        );
        
        if (syncResult.ok) {
          totalCampaigns += syncResult.campaigns;
          totalAds += syncResult.ads;
          
          // Atualizar status da conta
          await db.prepare(`
            UPDATE ad_accounts 
            SET sync_status = 'success', sync_error = NULL, last_sync_at = datetime('now'), updated_at = datetime('now')
            WHERE id = ?
          `).bind(account.id).run();
          
          console.log(`[SCHEDULED-SYNC] Account ${account.account_name}: ${syncResult.campaigns} campaigns, ${syncResult.ads} ads`);
        } else {
          totalErrors++;
          
          // Atualizar status de erro
          await db.prepare(`
            UPDATE ad_accounts 
            SET sync_status = 'error', sync_error = ?, updated_at = datetime('now')
            WHERE id = ?
          `).bind(syncResult.error || 'Unknown sync error', account.id).run();
          
          console.error(`[SCHEDULED-SYNC] Account ${account.account_name} sync failed:`, syncResult.error);
        }
        
        // Delay entre contas para evitar rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (accountError) {
        console.error(`[SCHEDULED-SYNC] Error syncing ads for ${account.account_name}:`, accountError);
        totalErrors++;
      }
    }
    
    const duration = Date.now() - startTime;
    console.log(`[SCHEDULED-SYNC] Daily ads sync completed: ${totalCampaigns} campaigns, ${totalAds} ads, ${totalErrors} errors, ${duration}ms`);
    
    // Atualizar status do agendamento
    await updateScheduleStatus(db, 'ads_sync', totalErrors === 0);
    
  } catch (error) {
    console.error('[SCHEDULED-SYNC] Daily ads sync failed:', error);
    await updateScheduleStatus(db, 'ads_sync', false, error instanceof Error ? error.message : 'Unknown error');
  }
}

// Endpoint para trigger manual dos syncs (apenas para admins)
export function addScheduledSyncEndpoints(app: any) {
  
  // Trigger manual da sincronização de métricas
  app.post('/api/admin/trigger-metrics-sync', async (c: any) => {
    try {
      const { schedule_type } = await c.req.json();
      
      if (!schedule_type || !['metrics_morning', 'metrics_evening'].includes(schedule_type)) {
        return c.json({ error: 'schedule_type deve ser metrics_morning ou metrics_evening' }, 400);
      }
      
      console.log(`[MANUAL-SYNC] Triggering manual ${schedule_type}...`);
      await runMetricsSync(c.env.DB, c.env, schedule_type);
      
      return c.json({ 
        ok: true, 
        message: `Sincronização manual ${schedule_type} executada com sucesso` 
      });
      
    } catch (error) {
      console.error('[MANUAL-SYNC] Manual metrics sync error:', error);
      return c.json({ 
        error: 'Erro na sincronização manual', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }, 500);
    }
  });
  
  // Trigger manual da sincronização de anúncios
  app.post('/api/admin/trigger-ads-sync', async (c: any) => {
    try {
      console.log('[MANUAL-SYNC] Triggering manual ads sync...');
      await runAdsSync(c.env.DB, c.env);
      
      return c.json({ 
        ok: true, 
        message: 'Sincronização manual de anúncios executada com sucesso' 
      });
      
    } catch (error) {
      console.error('[MANUAL-SYNC] Manual ads sync error:', error);
      return c.json({ 
        error: 'Erro na sincronização manual de anúncios', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }, 500);
    }
  });
  
  // Status dos agendamentos
  app.get('/api/admin/sync-schedules', async (c: any) => {
    try {
      const schedules = await c.env.DB.prepare(`
        SELECT * FROM sync_schedules ORDER BY schedule_type
      `).all();
      
      return c.json({ 
        ok: true, 
        schedules: schedules.results 
      });
      
    } catch (error) {
      console.error('[SYNC-STATUS] Error fetching schedules:', error);
      return c.json({ 
        error: 'Erro ao buscar status dos agendamentos' 
      }, 500);
    }
  });
}
