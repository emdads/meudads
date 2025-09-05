
-- Tabela para controlar os agendamentos de sincronização
CREATE TABLE sync_schedules (
  id TEXT PRIMARY KEY,
  schedule_type TEXT NOT NULL, -- 'metrics_morning', 'metrics_evening', 'ads_sync'
  last_run_at TIMESTAMP,
  next_run_at TIMESTAMP,
  status TEXT DEFAULT 'active', -- active, paused, error
  run_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(schedule_type)
);

-- Inserir schedules padrão
INSERT INTO sync_schedules (id, schedule_type, next_run_at) VALUES
('schedule_metrics_7h', 'metrics_morning', datetime('now', '+1 day', '7 hours')),
('schedule_metrics_19h', 'metrics_evening', datetime('now', '+1 day', '19 hours')),
('schedule_ads_daily', 'ads_sync', datetime('now', '+1 day', '7 hours'));
