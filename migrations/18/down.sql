
-- Remover tabela de motivos
DROP TABLE selection_ad_reasons;

-- Remover campos de seleção
ALTER TABLE selections DROP COLUMN description;
ALTER TABLE selections DROP COLUMN selection_type;
