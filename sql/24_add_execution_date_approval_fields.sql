-- Migration 24: Add Execution Date Approval Fields
-- Data: 2025-09-19
-- Descrição: Adiciona campos para controle de aprovação de data de execução pelo cliente

-- Adicionar novos campos para aprovação de data de execução
ALTER TABLE service_requests
ADD COLUMN IF NOT EXISTS proposed_execution_date TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS proposed_execution_notes TEXT NULL,
ADD COLUMN IF NOT EXISTS execution_date_proposed_at TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS execution_date_approval TEXT NULL CHECK (execution_date_approval IN ('approved', 'rejected')),
ADD COLUMN IF NOT EXISTS execution_date_approved_at TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS execution_date_rejection_reason TEXT NULL;

-- Adicionar comentários nos campos
COMMENT ON COLUMN service_requests.proposed_execution_date IS 'Data de execução proposta pelo administrador';
COMMENT ON COLUMN service_requests.proposed_execution_notes IS 'Observações sobre a data proposta pelo administrador';
COMMENT ON COLUMN service_requests.execution_date_proposed_at IS 'Timestamp quando a data foi proposta';
COMMENT ON COLUMN service_requests.execution_date_approval IS 'Status de aprovação da data pelo cliente (approved/rejected)';
COMMENT ON COLUMN service_requests.execution_date_approved_at IS 'Timestamp da aprovação/rejeição da data';
COMMENT ON COLUMN service_requests.execution_date_rejection_reason IS 'Motivo da rejeição da data pelo cliente';

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_service_requests_execution_date_approval 
ON service_requests(execution_date_approval) 
WHERE execution_date_approval IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_service_requests_proposed_execution_date 
ON service_requests(proposed_execution_date) 
WHERE proposed_execution_date IS NOT NULL;

-- Atualizar a view de relatórios de agendamento se existir
-- (Comentado para evitar erro se tabela users não existir com estrutura esperada)
/*
DROP VIEW IF EXISTS scheduling_report_view;

CREATE OR REPLACE VIEW scheduling_report_view AS
SELECT 
    sr.id,
    sr.title,
    sr.category,
    sr.status,
    cp.name as client_name,
    pp.name as professional_name,
    sr.requested_datetime,
    sr.scheduled_start_datetime,
    sr.estimated_duration_minutes,
    sr.actual_start_datetime,
    sr.actual_end_datetime,
    sr.proposed_execution_date,
    sr.execution_date_approval,
    sr.execution_date_approved_at,
    CASE 
        WHEN sr.actual_end_datetime IS NOT NULL AND sr.actual_start_datetime IS NOT NULL THEN
            EXTRACT(EPOCH FROM (sr.actual_end_datetime - sr.actual_start_datetime)) / 60
        ELSE NULL
    END AS actual_duration_minutes,
    CASE 
        WHEN sr.actual_end_datetime IS NOT NULL AND sr.actual_start_datetime IS NOT NULL AND sr.estimated_duration_minutes IS NOT NULL THEN
            (EXTRACT(EPOCH FROM (sr.actual_end_datetime - sr.actual_start_datetime)) / 60) - sr.estimated_duration_minutes
        ELSE NULL
    END AS duration_variance_minutes,
    CASE 
        WHEN sr.status = 'Agendado' AND sr.scheduled_start_datetime IS NOT NULL THEN
            CASE 
                WHEN DATE(sr.scheduled_start_datetime) = CURRENT_DATE THEN 'Scheduled Today'
                WHEN sr.scheduled_start_datetime < NOW() THEN 'Delayed'
                ELSE 'Scheduled'
            END
        WHEN sr.status = 'Em execução' THEN 'In Progress'
        WHEN sr.status IN ('Concluído - Aguardando aprovação', 'Aprovado pelo cliente', 'Finalizado') THEN 'Completed'
        WHEN sr.status = 'Orçamento aprovado' AND sr.proposed_execution_date IS NULL THEN 'Awaiting Schedule'
        WHEN sr.proposed_execution_date IS NOT NULL AND sr.execution_date_approval IS NULL THEN 'Pending'
        ELSE 'Pending'
    END AS scheduling_status,
    CONCAT(sr.street, ', ', sr.city, ', ', sr.state, ' ', sr.zip_code) as full_address,
    sr.created_at,
    sr.updated_at
FROM service_requests sr
LEFT JOIN users cp ON sr.client_id = cp.id
LEFT JOIN users pp ON sr.professional_id = pp.id
WHERE sr.status IN (
    'Orçamento aprovado',
    'Aguardando data de execução',
    'Data proposta pelo administrador', 
    'Aguardando aprovação da data',
    'Data aprovada pelo cliente',
    'Data rejeitada pelo cliente',
    'Agendado',
    'Em execução',
    'Concluído - Aguardando aprovação',
    'Aprovado pelo cliente',
    'Finalizado'
);
*/

-- Função para propor data de execução
CREATE OR REPLACE FUNCTION propose_execution_date(
    p_service_request_id INTEGER,
    p_proposed_date TIMESTAMPTZ,
    p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verificar se o pedido está em estado válido para proposição de data
    IF NOT EXISTS (
        SELECT 1 FROM service_requests 
        WHERE id = p_service_request_id 
        AND status = 'Orçamento aprovado'
    ) THEN
        RAISE EXCEPTION 'Service request must be in "Orçamento aprovado" status to propose execution date';
    END IF;

    -- Atualizar o pedido com a data proposta
    UPDATE service_requests
    SET 
        proposed_execution_date = p_proposed_date,
        proposed_execution_notes = p_notes,
        execution_date_proposed_at = NOW(),
        status = 'Data proposta pelo administrador',
        updated_at = NOW()
    WHERE id = p_service_request_id;

    -- Verificar se a atualização foi bem-sucedida
    IF FOUND THEN
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$;

-- Função para aprovar/rejeitar data de execução
CREATE OR REPLACE FUNCTION respond_to_execution_date(
    p_service_request_id INTEGER,
    p_approval TEXT, -- 'approved' ou 'rejected'
    p_rejection_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_status TEXT;
BEGIN
    -- Validar parâmetros
    IF p_approval NOT IN ('approved', 'rejected') THEN
        RAISE EXCEPTION 'Approval must be either "approved" or "rejected"';
    END IF;

    -- Verificar se o pedido está em estado válido para resposta
    IF NOT EXISTS (
        SELECT 1 FROM service_requests 
        WHERE id = p_service_request_id 
        AND status IN ('Data proposta pelo administrador', 'Aguardando aprovação da data')
    ) THEN
        RAISE EXCEPTION 'Service request must be in appropriate status to respond to execution date';
    END IF;

    -- Determinar novo status
    IF p_approval = 'approved' THEN
        v_new_status := 'Data aprovada pelo cliente';
    ELSE
        v_new_status := 'Data rejeitada pelo cliente';
    END IF;

    -- Atualizar o pedido com a resposta
    UPDATE service_requests
    SET 
        execution_date_approval = p_approval,
        execution_date_approved_at = NOW(),
        execution_date_rejection_reason = CASE 
            WHEN p_approval = 'rejected' THEN p_rejection_reason 
            ELSE NULL 
        END,
        status = v_new_status,
        -- Se aprovado, copiar data proposta para agendamento
        scheduled_start_datetime = CASE 
            WHEN p_approval = 'approved' THEN proposed_execution_date 
            ELSE scheduled_start_datetime 
        END,
        updated_at = NOW()
    WHERE id = p_service_request_id;

    -- Se aprovado, atualizar status para "Agendado"
    IF p_approval = 'approved' THEN
        UPDATE service_requests
        SET status = 'Agendado'
        WHERE id = p_service_request_id;
    END IF;

    -- Verificar se a atualização foi bem-sucedida
    IF FOUND THEN
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$;

-- Inserir dados de exemplo apenas em ambiente de desenvolvimento
-- (remover em produção)
DO $$
BEGIN
    -- Exemplo de uso das funções (comentar em produção)
    -- SELECT propose_execution_date(1, NOW() + INTERVAL '3 days', 'Data sugerida para execução do serviço');
    -- SELECT respond_to_execution_date(1, 'approved', NULL);
END;
$$;

-- Log da migração (comentar se tabela migration_log não existir)
-- INSERT INTO migration_log (version, description, executed_at)
-- VALUES ('24', 'Add execution date approval fields and functions', NOW())
-- ON CONFLICT (version) DO NOTHING;

-- Log alternativo
DO $$
BEGIN
    RAISE NOTICE 'Migration 24 executed successfully: Add execution date approval fields and functions';
END;
$$;

COMMIT;