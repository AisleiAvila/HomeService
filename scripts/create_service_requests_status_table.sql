-- =============================================================================
-- Tabela auxiliar para histórico de status das solicitações de serviço
-- =============================================================================
-- Esta tabela armazena todas as mudanças de status que ocorrem em uma
-- solicitação de serviço, permitindo rastrear o fluxo completo do workflow.
-- =============================================================================

-- Criar tabela de histórico de status
CREATE TABLE IF NOT EXISTS service_requests_status (
    id BIGSERIAL PRIMARY KEY,
    service_request_id BIGINT NOT NULL,
    status VARCHAR(50) NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    changed_by BIGINT,
    notes TEXT,
    
    -- Foreign keys
    CONSTRAINT fk_service_request 
        FOREIGN KEY (service_request_id) 
        REFERENCES service_requests(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_changed_by_user 
        FOREIGN KEY (changed_by) 
        REFERENCES users(id) 
        ON DELETE SET NULL
);

-- Criar índices para melhorar performance de consultas
CREATE INDEX IF NOT EXISTS idx_service_requests_status_request_id 
    ON service_requests_status(service_request_id);

CREATE INDEX IF NOT EXISTS idx_service_requests_status_changed_at 
    ON service_requests_status(changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_service_requests_status_status 
    ON service_requests_status(status);

-- Comentários para documentação
COMMENT ON TABLE service_requests_status IS 
    'Histórico de mudanças de status das solicitações de serviço';

COMMENT ON COLUMN service_requests_status.service_request_id IS 
    'ID da solicitação de serviço (FK para service_requests)';

COMMENT ON COLUMN service_requests_status.status IS 
    'Status registrado no histórico';

COMMENT ON COLUMN service_requests_status.changed_at IS 
    'Data e hora da mudança de status';

COMMENT ON COLUMN service_requests_status.changed_by IS 
    'ID do usuário que realizou a mudança (FK para users)';

COMMENT ON COLUMN service_requests_status.notes IS 
    'Observações adicionais sobre a mudança de status';

-- =============================================================================
-- Inserir registros iniciais para solicitações existentes
-- =============================================================================
-- Cria uma entrada inicial para cada solicitação existente com seu status atual
-- Isso garante que o histórico comece a partir do estado atual do sistema

INSERT INTO service_requests_status (
    service_request_id, 
    status, 
    changed_at, 
    changed_by,
    notes
)
SELECT 
    id,
    status,
    NOW(), -- Data atual como timestamp inicial
    client_id, -- Assume que o cliente criou inicialmente
    'Status inicial registrado automaticamente durante criação da tabela de histórico'
FROM service_requests
WHERE id NOT IN (
    SELECT DISTINCT service_request_id 
    FROM service_requests_status
);

-- =============================================================================
-- Verificação
-- =============================================================================
-- Query para verificar se a tabela foi criada corretamente e tem dados

SELECT 
    'service_requests_status' as tabela,
    COUNT(*) as total_registros,
    COUNT(DISTINCT service_request_id) as solicitacoes_com_historico,
    MIN(changed_at) as primeira_mudanca,
    MAX(changed_at) as ultima_mudanca
FROM service_requests_status;

-- Query para ver as últimas mudanças de status
SELECT 
    srs.id,
    srs.service_request_id,
    sr.title as solicitacao_titulo,
    srs.status,
    srs.changed_at,
    u.name as alterado_por,
    srs.notes
FROM service_requests_status srs
LEFT JOIN service_requests sr ON srs.service_request_id = sr.id
LEFT JOIN users u ON srs.changed_by = u.id
ORDER BY srs.changed_at DESC
LIMIT 20;
