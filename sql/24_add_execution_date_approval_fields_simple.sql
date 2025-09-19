-- Migration 24: Add Execution Date Approval Fields (SIMPLIFIED VERSION)
-- Data: 2025-09-19
-- Descrição: Adiciona campos para controle de aprovação de data de execução pelo cliente

-- Verificar se a tabela service_requests existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'service_requests') THEN
        RAISE EXCEPTION 'Table service_requests does not exist';
    END IF;
END;
$$;

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

-- Verificar se os campos foram criados corretamente
DO $$
DECLARE
    col_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns
    WHERE table_name = 'service_requests'
    AND column_name IN (
        'proposed_execution_date',
        'proposed_execution_notes',
        'execution_date_proposed_at',
        'execution_date_approval',
        'execution_date_approved_at',
        'execution_date_rejection_reason'
    );
    
    IF col_count = 6 THEN
        RAISE NOTICE 'SUCCESS: All 6 execution date approval fields created successfully';
    ELSE
        RAISE NOTICE 'WARNING: Only % of 6 expected fields were created', col_count;
    END IF;
END;
$$;

-- Log da migração
DO $$
BEGIN
    RAISE NOTICE 'Migration 24 executed successfully: Add execution date approval fields and functions at %', NOW();
END;
$$;