// Quick fix script to reactivate ads from problematic selection
export async function fixSelectionAds(
  db: D1Database, 
  selectionId: string = '41473f9b-ed83-404a-847a-18d2cc546fe6'
): Promise<{ success: boolean; message: string; details?: any }> {
  try {
    console.log(`[FIX-SELECTION] Starting fix for selection: ${selectionId}`);
    
    // Get the selection data
    const selection = await db.prepare(
      "SELECT id, ad_ids, status, selection_type FROM selections WHERE id = ?"
    ).bind(selectionId).first() as any;
    
    if (!selection) {
      return { success: false, message: 'Selection not found' };
    }
    
    console.log('[FIX-SELECTION] Selection found:', {
      id: selection.id,
      type: selection.selection_type,
      status: selection.status
    });
    
    // Parse ad IDs
    let adIds: string[] = [];
    try {
      adIds = JSON.parse(selection.ad_ids || '[]');
    } catch {
      return { success: false, message: 'Invalid ad_ids format in selection' };
    }
    
    console.log(`[FIX-SELECTION] Found ${adIds.length} ads to reactivate`);
    
    // Reactivate all ads from this selection
    let reactivatedCount = 0;
    for (const adId of adIds) {
      try {
        const result = await db.prepare(
          "UPDATE ads_active_raw SET effective_status = 'ACTIVE', updated_at = datetime('now') WHERE ad_id = ? AND effective_status = 'PAUSED'"
        ).bind(adId).run();
        
        if ((result as any).changes && (result as any).changes > 0) {
          reactivatedCount++;
          console.log(`[FIX-SELECTION] Reactivated ad: ${adId}`);
        }
      } catch (error) {
        console.error(`[FIX-SELECTION] Error reactivating ad ${adId}:`, error);
      }
    }
    
    // Reset selection status to pending
    await db.prepare(`
      UPDATE selections 
      SET status = 'pending', 
          executed_at = NULL,
          executed_by_user_id = NULL,
          executed_by_user_name = NULL,
          ads_paused_count = NULL,
          execution_notes = NULL,
          updated_at = datetime('now')
      WHERE id = ?
    `).bind(selectionId).run();
    
    console.log('[FIX-SELECTION] Selection status reset to pending');
    
    return {
      success: true,
      message: `Successfully reactivated ${reactivatedCount} ads and reset selection status`,
      details: {
        selectionId,
        totalAds: adIds.length,
        reactivatedAds: reactivatedCount,
        adIds
      }
    };
    
  } catch (error) {
    console.error('[FIX-SELECTION] Error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
