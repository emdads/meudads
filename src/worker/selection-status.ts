// Selection status management utilities

export const SELECTION_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress', 
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
} as const;

export type SelectionStatus = typeof SELECTION_STATUS[keyof typeof SELECTION_STATUS];

export const SELECTION_STATUS_PT: Record<SelectionStatus, string> = {
  'pending': 'Pendente',
  'in_progress': 'Em Execução',
  'completed': 'Concluída',
  'cancelled': 'Cancelada'
};

export const SELECTION_STATUS_COLORS: Record<SelectionStatus, string> = {
  'pending': 'bg-yellow-100 text-yellow-800',
  'in_progress': 'bg-blue-100 text-blue-800', 
  'completed': 'bg-green-100 text-green-800',
  'cancelled': 'bg-red-100 text-red-800'
};

export const SELECTION_STATUS_ICONS: Record<SelectionStatus, string> = {
  'pending': '⏳',
  'in_progress': '🔄',
  'completed': '✅',
  'cancelled': '❌'
};

export interface SelectionExecutionData {
  selection_id: string;
  executed_by_user_id: string;
  executed_by_user_name: string;
  ads_paused_count: number;
  ads_total_count: number;
  execution_notes?: string;
}

export async function updateSelectionStatus(
  db: D1Database,
  selectionId: string,
  status: SelectionStatus,
  executionData?: SelectionExecutionData
): Promise<void> {
  if (executionData) {
    // Full execution update
    await db.prepare(`
      UPDATE selections 
      SET status = ?, 
          executed_at = datetime('now'),
          executed_by_user_id = ?,
          executed_by_user_name = ?,
          ads_paused_count = ?,
          ads_total_count = ?,
          execution_notes = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).bind(
      status,
      executionData.executed_by_user_id,
      executionData.executed_by_user_name,
      executionData.ads_paused_count,
      executionData.ads_total_count,
      executionData.execution_notes || null,
      selectionId
    ).run();
  } else {
    // Simple status update
    await db.prepare(`
      UPDATE selections 
      SET status = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(status, selectionId).run();
  }
}

export async function markSelectionAsExecuted(
  db: D1Database,
  selectionId: string,
  executionData: SelectionExecutionData
): Promise<void> {
  await updateSelectionStatus(db, selectionId, SELECTION_STATUS.COMPLETED, executionData);
}

export async function markSelectionInProgress(
  db: D1Database,
  selectionId: string,
  userId: string,
  userName: string
): Promise<void> {
  await db.prepare(`
    UPDATE selections 
    SET status = ?, 
        executed_by_user_id = ?,
        executed_by_user_name = ?,
        updated_at = datetime('now')
    WHERE id = ?
  `).bind(SELECTION_STATUS.IN_PROGRESS, userId, userName, selectionId).run();
}
