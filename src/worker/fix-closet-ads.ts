// Fix script to reactivate incorrectly paused ads for Closet da May
export async function fixClosetDaMayAds(db: D1Database): Promise<{ success: boolean; message: string; details?: any }> {
  try {
    console.log(`[FIX-CLOSET] Starting fix for Closet da May ads...`);
    
    // Find Closet da May client
    const client = await db.prepare(
      "SELECT id, name, slug FROM clients WHERE name LIKE '%closet%' OR name LIKE '%may%' OR slug LIKE '%closet%' OR slug LIKE '%may%'"
    ).first() as any;
    
    if (!client) {
      return { success: false, message: 'Cliente Closet da May não encontrado' };
    }
    
    console.log(`[FIX-CLOSET] Found client: ${client.name} (${client.slug})`);
    
    // Get paused ads for this client
    const pausedAds = await db.prepare(
      "SELECT ad_id, ad_name, effective_status, updated_at FROM ads_active_raw WHERE client_id = ? AND effective_status = 'PAUSED'"
    ).bind(client.id).all();
    
    console.log(`[FIX-CLOSET] Found ${pausedAds.results?.length || 0} paused ads`);
    
    if (!pausedAds.results || pausedAds.results.length === 0) {
      return { 
        success: true, 
        message: 'Nenhum anúncio pausado encontrado para o Closet da May',
        details: { client: client.name, pausedAds: 0 }
      };
    }
    
    // Reactivate all paused ads
    const result = await db.prepare(
      "UPDATE ads_active_raw SET effective_status = 'ACTIVE', updated_at = datetime('now') WHERE client_id = ? AND effective_status = 'PAUSED'"
    ).bind(client.id).run();
    
    console.log(`[FIX-CLOSET] Reactivated ${(result as any).changes || 0} ads`);
    
    // Get updated status
    const activeAds = await db.prepare(
      "SELECT ad_id, ad_name, effective_status FROM ads_active_raw WHERE client_id = ? ORDER BY updated_at DESC LIMIT 10"
    ).bind(client.id).all();
    
    return {
      success: true,
      message: `Sucesso! ${(result as any).changes || 0} anúncios reativados para ${client.name}`,
      details: {
        client: client.name,
        slug: client.slug,
        reactivatedCount: (result as any).changes || 0,
        totalAds: activeAds.results?.length || 0,
        sampleAds: activeAds.results?.slice(0, 5).map((ad: any) => ({
          id: ad.ad_id,
          name: ad.ad_name,
          status: ad.effective_status
        }))
      }
    };
    
  } catch (error) {
    console.error('[FIX-CLOSET] Error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}
