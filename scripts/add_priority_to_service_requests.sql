-- Adicionar campo priority à tabela service_requests
-- Este campo armazena a prioridade da solicitação de serviço

ALTER TABLE service_requests 
ADD COLUMN IF NOT EXISTS priority TEXT CHECK (priority IN ('Normal', 'Urgent'));

-- Comentário da coluna
COMMENT ON COLUMN service_requests.priority IS 'Prioridade da solicitação: Normal ou Urgent';
