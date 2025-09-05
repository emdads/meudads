
-- Reverter para horários UTC originais
UPDATE sync_schedules 
SET 
  cron_expression = '0 7 * * *',
  description = 'Sincronização de métricas matutina',
  updated_at = datetime('now')
WHERE schedule_type = 'metrics_morning';

UPDATE sync_schedules 
SET 
  cron_expression = '0 19 * * *',
  description = 'Sincronização de métricas noturna',
  updated_at = datetime('now')
WHERE schedule_type = 'metrics_evening';

UPDATE sync_schedules 
SET 
  cron_expression = '0 7 * * *',
  description = 'Sincronização de anúncios diária',
  updated_at = datetime('now')
WHERE schedule_type = 'ads_sync';
