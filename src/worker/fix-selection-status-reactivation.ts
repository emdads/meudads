// Fix for selection status after ad reactivation
import { SELECTION_STATUS, updateSelectionStatus } from './selection-status';

export async function fixSelectionStatusAfterReactivation(
  db: D1Database,
  selectionId?: string
): Promise<{ success: boolean; message: string; details?: any }> {
  try {
    console.log(`[FIX-SELECTION-REACTIVATION] Starting fix for selection: ${selectionId || 'all'}`);
    
    let selections;
    
    if (selectionId) {
      // Fix specific selection
      selections = await db.prepare(`
        SELECT id, status, ads_total_count, ads_paused_count, ad_ids
        FROM selections 
        WHERE id = ?
      `).bind(selectionId).all();
    } else {
      // Fix all selections that might need status correction
      selections = await db.prepare(`
        SELECT id, status, ads_total_count, ads_paused_count, ad_ids
        FROM selections 
        WHERE status IN ('in_progress', 'completed')
      `).all();
    }
    
    if (!selections.results || selections.results.length === 0) {
      return {
        success: false,
        message: selectionId ? "Seleção não encontrada" : "Nenhuma seleção encontrada para correção"
      };
    }
    
    let fixedCount = 0;
    const fixedSelections = [];
    
    for (const selection of selections.results as any[]) {
      try {
        // Parse ad IDs to count them
        let adIdsInSelection: string[] = [];
        try {
          adIdsInSelection = JSON.parse(selection.ad_ids || '[]');
        } catch (parseError) {
          console.warn(`[FIX-SELECTION-REACTIVATION] Could not parse ad_ids for selection ${selection.id}`);
          continue;
        }
        
        if (adIdsInSelection.length === 0) {
          console.warn(`[FIX-SELECTION-REACTIVATION] Selection ${selection.id} has no ads`);
          continue;
        }
        
        // Count how many ads are currently paused
        const placeholders = adIdsInSelection.map(() => '?').join(',');
        const pausedCountResult = await db.prepare(`
          SELECT COUNT(*) as count 
          FROM ads_active_raw 
          WHERE ad_id IN (${placeholders}) AND effective_status = 'PAUSED'
        `).bind(...adIdsInSelection).first() as any;
        
        const currentPausedCount = pausedCountResult?.count || 0;
        const totalAdsInSelection = selection.ads_total_count || adIdsInSelection.length;
        
        console.log(`[FIX-SELECTION-REACTIVATION] Selection ${selection.id}: ${currentPausedCount}/${totalAdsInSelection} ads paused, current status: ${selection.status}`);
        
        // Determine what the status should be
        let correctStatus = selection.status;
        
        if (currentPausedCount === 0) {
          // All ads are active - should be pending
          correctStatus = SELECTION_STATUS.PENDING;
        } else if (currentPausedCount < totalAdsInSelection) {
          // Some ads still paused - should be in progress
          correctStatus = SELECTION_STATUS.IN_PROGRESS;
        } else if (currentPausedCount === totalAdsInSelection) {
          // All ads paused - should be completed
          correctStatus = SELECTION_STATUS.COMPLETED;
        }
        
        // Update if status is incorrect
        if (correctStatus !== selection.status) {
          console.log(`[FIX-SELECTION-REACTIVATION] Correcting selection ${selection.id}: ${selection.status} → ${correctStatus}`);
          
          // Update selection status and paused count
          await db.prepare(`
            UPDATE selections 
            SET status = ?, ads_paused_count = ?, updated_at = datetime('now')
            WHERE id = ?
          `).bind(correctStatus, currentPausedCount, selection.id).run();
          
          fixedCount++;
          fixedSelections.push({
            id: selection.id,
            old_status: selection.status,
            new_status: correctStatus,
            paused_count: currentPausedCount,
            total_count: totalAdsInSelection
          });
        } else {
          console.log(`[FIX-SELECTION-REACTIVATION] Selection ${selection.id} status is already correct: ${selection.status}`);
        }
        
      } catch (selectionError) {
        console.error(`[FIX-SELECTION-REACTIVATION] Error processing selection ${selection.id}:`, selectionError);
      }
    }
    
    console.log(`[FIX-SELECTION-REACTIVATION] ✅ Fixed ${fixedCount} selections`);
    
    return {
      success: true,
      message: `${fixedCount} seleções corrigidas com sucesso`,
      details: {
        total_checked: selections.results.length,
        fixed_count: fixedCount,
        fixed_selections: fixedSelections
      }
    };
    
  } catch (error) {
    console.error(`[FIX-SELECTION-REACTIVATION] Error:`, error);
    return {
      success: false,
      message: `Erro na correção: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    };
  }
}
