
-- Adicionar campos de status e execução às seleções
ALTER TABLE selections ADD COLUMN status TEXT DEFAULT 'pending';
ALTER TABLE selections ADD COLUMN executed_at DATETIME;
ALTER TABLE selections ADD COLUMN executed_by_user_id TEXT;
ALTER TABLE selections ADD COLUMN executed_by_user_name TEXT;
ALTER TABLE selections ADD COLUMN execution_notes TEXT;
ALTER TABLE selections ADD COLUMN ads_paused_count INTEGER DEFAULT 0;
ALTER TABLE selections ADD COLUMN ads_total_count INTEGER DEFAULT 0;

-- Calcular contagem de anúncios para seleções existentes
UPDATE selections 
SET ads_total_count = (
  SELECT COUNT(*) 
  FROM json_each(selections.ad_ids)
) 
WHERE ads_total_count = 0;
