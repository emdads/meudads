
-- Remover campos de status e execução
ALTER TABLE selections DROP COLUMN status;
ALTER TABLE selections DROP COLUMN executed_at;
ALTER TABLE selections DROP COLUMN executed_by_user_id;
ALTER TABLE selections DROP COLUMN executed_by_user_name;
ALTER TABLE selections DROP COLUMN execution_notes;
ALTER TABLE selections DROP COLUMN ads_paused_count;
ALTER TABLE selections DROP COLUMN ads_total_count;
