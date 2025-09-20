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

-- Função para selecionar automaticamente o profissional mais adequado
CREATE OR REPLACE FUNCTION auto_assign_professional(
    p_service_request_id INTEGER,
    p_service_category TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_selected_professional_id INTEGER;
    v_professional_count INTEGER;
BEGIN
    -- Primeiro: Buscar profissionais especializados na categoria
    SELECT u.id INTO v_selected_professional_id
    FROM users u
    WHERE u.role = 'professional'
    AND u.specialties IS NOT NULL
    AND u.specialties LIKE '%' || p_service_category || '%'
    AND u.active = true
    -- Priorizar profissionais com menor carga de trabalho
    ORDER BY (
        SELECT COUNT(*) 
        FROM service_requests sr 
        WHERE sr.professional_id = u.id 
        AND sr.status IN ('Agendado', 'Em execução')
    ) ASC, u.created_at ASC
    LIMIT 1;

    -- Se não encontrou especialista, buscar qualquer profissional disponível
    IF v_selected_professional_id IS NULL THEN
        SELECT u.id INTO v_selected_professional_id
        FROM users u
        WHERE u.role = 'professional'
        AND u.active = true
        -- Priorizar profissionais com menor carga de trabalho
        ORDER BY (
            SELECT COUNT(*) 
            FROM service_requests sr 
            WHERE sr.professional_id = u.id 
            AND sr.status IN ('Agendado', 'Em execução')
        ) ASC, u.created_at ASC
        LIMIT 1;
    END IF;

    -- Log da seleção
    IF v_selected_professional_id IS NOT NULL THEN
        -- Contar quantos profissionais estavam disponíveis
        SELECT COUNT(*) INTO v_professional_count
        FROM users u
        WHERE u.role = 'professional' AND u.active = true;
        
        RAISE NOTICE 'Auto-assigned professional % for service category % (% total professionals available)', 
            v_selected_professional_id, p_service_category, v_professional_count;
    ELSE
        RAISE NOTICE 'No available professionals found for auto-assignment';
    END IF;

    RETURN v_selected_professional_id;
END;
$$;

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
    v_service_category TEXT;
    v_selected_professional_id INTEGER;
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

    -- Se aprovado, atribuir profissional automaticamente e agendar
    IF p_approval = 'approved' THEN
        -- Obter categoria do serviço
        SELECT category INTO v_service_category 
        FROM service_requests 
        WHERE id = p_service_request_id;

        -- Selecionar profissional automaticamente baseado na categoria
        SELECT auto_assign_professional(p_service_request_id, v_service_category) 
        INTO v_selected_professional_id;

        -- Atualizar pedido com profissional atribuído e status "Agendado"
        UPDATE service_requests
        SET 
            professional_id = v_selected_professional_id,
            selected_professional_id = v_selected_professional_id,
            status = 'Agendado'
        WHERE id = p_service_request_id;

        -- Log da atribuição
        IF v_selected_professional_id IS NOT NULL THEN
            RAISE NOTICE 'Professional % automatically assigned to service request %', 
                v_selected_professional_id, p_service_request_id;
        ELSE
            RAISE NOTICE 'No available professional found for category: %', v_service_category;
            -- Se não conseguir atribuir profissional, manter status como "Buscando profissional"
            UPDATE service_requests
            SET status = 'Buscando profissional'
            WHERE id = p_service_request_id;
        END IF;
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

-- Função auxiliar para notificar profissional sobre novo agendamento
CREATE OR REPLACE FUNCTION notify_professional_assignment(
    p_service_request_id INTEGER,
    p_professional_id INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_service_title TEXT;
    v_scheduled_date TIMESTAMPTZ;
    v_professional_name TEXT;
BEGIN
    -- Obter dados do serviço
    SELECT title, scheduled_start_datetime INTO v_service_title, v_scheduled_date
    FROM service_requests 
    WHERE id = p_service_request_id;

    -- Obter nome do profissional
    SELECT name INTO v_professional_name
    FROM users 
    WHERE id = p_professional_id;

    -- Log da notificação (em produção, aqui seria enviada notificação real)
    RAISE NOTICE 'NOTIFICATION: Professional % (%) assigned to service "%". Scheduled for: %', 
        v_professional_name, p_professional_id, v_service_title, v_scheduled_date;

    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error sending notification: %', SQLERRM;
        RETURN FALSE;
END;
$$;

-- Atualizar a função respond_to_execution_date para incluir notificação
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
    v_service_category TEXT;
    v_selected_professional_id INTEGER;
    v_notification_sent BOOLEAN := FALSE;
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

    -- Se aprovado, atribuir profissional automaticamente e agendar
    IF p_approval = 'approved' THEN
        -- Obter categoria do serviço
        SELECT category INTO v_service_category 
        FROM service_requests 
        WHERE id = p_service_request_id;

        -- Selecionar profissional automaticamente baseado na categoria
        SELECT auto_assign_professional(p_service_request_id, v_service_category) 
        INTO v_selected_professional_id;

        -- Atualizar pedido com profissional atribuído e status "Agendado"
        UPDATE service_requests
        SET 
            professional_id = v_selected_professional_id,
            selected_professional_id = v_selected_professional_id,
            status = 'Agendado'
        WHERE id = p_service_request_id;

        -- Notificar profissional se atribuído com sucesso
        IF v_selected_professional_id IS NOT NULL THEN
            SELECT notify_professional_assignment(p_service_request_id, v_selected_professional_id)
            INTO v_notification_sent;
            
            RAISE NOTICE 'Professional % automatically assigned to service request % (notification sent: %)', 
                v_selected_professional_id, p_service_request_id, v_notification_sent;
        ELSE
            RAISE NOTICE 'No available professional found for category: %', v_service_category;
            -- Se não conseguir atribuir profissional, manter status como "Buscando profissional"
            UPDATE service_requests
            SET status = 'Buscando profissional'
            WHERE id = p_service_request_id;
        END IF;
    END IF;

    -- Verificar se a atualização foi bem-sucedida
    IF FOUND THEN
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$;

-- Log da migração
DO $$
BEGIN
    RAISE NOTICE 'Migration 24 executed successfully: Add execution date approval fields and functions at %', NOW();
END;
$$;