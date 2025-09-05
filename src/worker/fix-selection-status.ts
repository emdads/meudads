// Fix selection status for existing selections that should be completed

import { SELECTION_STATUS, updateSelectionStatus, SelectionExecutionData } from './selection-status';

interface FixResult {
  success: boolean;
  message: string;
  details?: any;
}

export async function fixSelectionStatus(db: D1Database, selectionId?: string): Promise<FixResult> {
  try {
    console.log(`[FIX-SELECTION-STATUS] Starting fix for ${selectionId || 'all selections'}`);
    
    let selections;
    
    if (selectionId) {
      // Fix specific selection
      selections = await db.prepare(`
        SELECT * FROM selections 
        WHERE id = ? AND selection_type = 'pause' AND status != 'completed'
      `).bind(selectionId).all();
    } else {
      // Fix all pause selections that are in_progress but should be completed
      selections = await db.prepare(`
        SELECT * FROM selections 
        WHERE selection_type = 'pause' AND status = 'in_progress'
      `).all();
    }

    if (!selections.results || selections.results.length === 0) {
      return {
        success: false,
        message: selectionId ? 'Seleção não encontrada ou não precisa de correção' : 'Nenhuma seleção encontrada para correção'
      };
    }

    const fixedSelections = [];
    
    for (const selection of selections.results as any[]) {
      try {
        const adIds = JSON.parse(selection.ad_ids || '[]');
        const totalAds = selection.ads_total_count || adIds.length;
        
        // Check how many ads are actually paused
        const placeholders = adIds.map(() => '?').join(',');
        const pausedCount = await db.prepare(`
          SELECT COUNT(*) as count FROM ads_active_raw 
          WHERE ad_id IN (${placeholders}) AND effective_status = 'PAUSED'
        `).bind(...adIds).first() as any;
        
        const currentPausedCount = pausedCount?.count || 0;
        
        console.log(`[FIX-SELECTION-STATUS] Selection ${selection.id}: ${currentPausedCount}/${totalAds} ads paused`);
        
        if (currentPausedCount === totalAds) {
          // All ads are paused, mark as completed
          const executionData: SelectionExecutionData = {
            selection_id: selection.id,
            executed_by_user_id: selection.user_id,
            executed_by_user_name: selection.user_name,
            ads_paused_count: currentPausedCount,
            ads_total_count: totalAds,
            execution_notes: undefined
          };
          
          await updateSelectionStatus(db, selection.id, SELECTION_STATUS.COMPLETED, executionData);
          
          fixedSelections.push({
            id: selection.id,
            note: selection.note,
            ads_paused: currentPausedCount,
            total_ads: totalAds
          });
          
          console.log(`[FIX-SELECTION-STATUS] ✅ Fixed selection ${selection.id} - marked as completed`);
        }
        
      } catch (error) {
        console.error(`[FIX-SELECTION-STATUS] Error fixing selection ${selection.id}:`, error);
      }
    }

    if (fixedSelections.length > 0) {
      return {
        success: true,
        message: `${fixedSelections.length} seleção(ões) corrigida(s) com sucesso`,
        details: {
          fixed_selections: fixedSelections
        }
      };
    } else {
      return {
        success: false,
        message: 'Nenhuma seleção precisava de correção'
      };
    }
    
  } catch (error) {
    console.error('[FIX-SELECTION-STATUS] Error:', error);
    return {
      success: false,
      message: 'Erro ao corrigir status das seleções: ' + (error instanceof Error ? error.message : 'Unknown error')
    };
  }
}
