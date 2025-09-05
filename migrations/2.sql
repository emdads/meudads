
CREATE INDEX idx_ads_client_status ON ads_active_raw(client_id, effective_status);
CREATE INDEX idx_ads_client_optimization ON ads_active_raw(client_id, adset_optimization_goal);
CREATE INDEX idx_campaigns_client_objective ON campaigns(client_id, objective);
CREATE INDEX idx_clients_slug ON clients(slug);
