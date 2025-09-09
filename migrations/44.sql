
-- Atualizar agendamentos para horário de Brasília (UTC-3)
UPDATE sync_schedules 
SET 
  cron_expression = '0 10 * * *',
  description = 'Sincronização de métricas matutina (7h Brasília)',
  next_run_at = datetime('now', '+1 day', 'start of day', '+10 hours'),
  updated_at = datetime('now')
WHERE schedule_type = 'metrics_morning';

UPDATE sync_schedules 
SET 
  cron_expression = '0 22 * * *',
  description = 'Sincronização de métricas noturna (19h Brasília)',
  next_run_at = datetime('now', '+1 day', 'start of day', '+22 hours'),
  updated_at = datetime('now')
WHERE schedule_type = 'metrics_evening';

UPDATE sync_schedules 
SET 
  cron_expression = '0 7 * * *',
  description = 'Sincronização de anúncios diária (4h Brasília)',
  next_run_at = datetime('now', '+1 day', 'start of day', '+7 hours'),
  updated_at = datetime('now')
WHERE schedule_type = 'ads_sync';
