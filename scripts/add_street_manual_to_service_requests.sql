-- Adiciona campo street_manual à tabela service_requests
-- Este campo armazena o logradouro informado manualmente pelo usuário
-- quando o código postal não possui designacao_postal (logradouro) associado

-- Adicionar coluna street_manual (texto, opcional)
ALTER TABLE service_requests
ADD COLUMN IF NOT EXISTS street_manual TEXT;

-- Comentário na coluna para documentação
COMMENT ON COLUMN service_requests.street_manual IS 
'Logradouro informado manualmente pelo usuário quando o código postal não possui designacao_postal associado';

-- Verificar criação da coluna
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'service_requests' 
  AND column_name = 'street_manual';
