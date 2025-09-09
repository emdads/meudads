-- Remove demo data
DELETE FROM ad_accounts WHERE client_id IN ('demo-client-001', 'demo-client-002');
DELETE FROM clients WHERE id IN ('demo-client-001', 'demo-client-002');