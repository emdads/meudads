
INSERT OR IGNORE INTO sync_schedules (
  id,
  schedule_type, 
  description, 
  cron_expression,
  status,
  next_run_at
) VALUES 
(
  'sched_metrics_morning_' || hex(randomblob(8)),
  'metrics_morning',
  'Sincronização matutina de métricas - 7h Brasília (10h UTC)',
  '0 10 * * *',
  'active',
  datetime('now', '+1 day', 'start of day', '+10 hours')
),
(
  'sched_metrics_evening_' || hex(randomblob(8)),
  'metrics_evening', 
  'Sincronização noturna de métricas - 19h Brasília (22h UTC)',
  '0 22 * * *',
  'active',
  datetime('now', '+1 day', 'start of day', '+22 hours')
);

UPDATE sync_schedules SET 
  cron_expression = '0 7 * * *',
  description = 'Sincronização principal de anúncios - 4h Brasília (7h UTC)',
  next_run_at = datetime('now', '+1 day', 'start of day', '+7 hours')
WHERE schedule_type = 'ads_sync';
