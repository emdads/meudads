
-- Adicionar campos para tipos de seleção
ALTER TABLE selections ADD COLUMN selection_type TEXT DEFAULT 'pause';
ALTER TABLE selections ADD COLUMN description TEXT;

-- Criar tabela para motivos de cada anúncio na seleção
CREATE TABLE selection_ad_reasons (
  id TEXT PRIMARY KEY,
  selection_id TEXT NOT NULL,
  ad_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(selection_id, ad_id)
);
