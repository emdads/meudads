
DELETE FROM sync_schedules WHERE schedule_type IN ('metrics_morning', 'metrics_evening');

UPDATE sync_schedules SET 
  cron_expression = '0 7 * * *',
  description = 'Sincronização de anúncios diária',
  next_run_at = datetime('now', '+1 day', 'start of day', '+7 hours')
WHERE schedule_type = 'ads_sync';
