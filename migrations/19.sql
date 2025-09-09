-- Insert a demo client with multiple ad platforms
INSERT INTO clients (id, name, slug, email, is_active, created_at, updated_at)
VALUES ('demo-client-001', 'Empresa Demo Ltda', 'empresa-demo', 'demo@empresa.com.br', 1, datetime('now'), datetime('now'));

-- Insert multiple ad accounts for different platforms
INSERT INTO ad_accounts (id, client_id, platform, account_name, account_id, is_active, sync_status, created_at, updated_at)
VALUES 
('demo-meta-001', 'demo-client-001', 'meta', 'Conta Meta Principal', '123456789', 1, 'pending', datetime('now'), datetime('now')),
('demo-pinterest-001', 'demo-client-001', 'pinterest', 'Conta Pinterest Empresa', '549755885175', 1, 'pending', datetime('now'), datetime('now')),
('demo-tiktok-001', 'demo-client-001', 'tiktok', 'Conta TikTok Business', '7012345678901234567', 1, 'pending', datetime('now'), datetime('now'));

-- Insert a second client with only one platform
INSERT INTO clients (id, name, slug, email, is_active, created_at, updated_at)
VALUES ('demo-client-002', 'Startup Inovadora', 'startup-inovadora', 'contato@startup.com.br', 1, datetime('now'), datetime('now'));

INSERT INTO ad_accounts (id, client_id, platform, account_name, account_id, is_active, sync_status, created_at, updated_at)
VALUES 
('demo-meta-002', 'demo-client-002', 'meta', 'Meta Ads Startup', '987654321', 1, 'pending', datetime('now'), datetime('now'));