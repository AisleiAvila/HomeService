-- ================================================================
-- MIGRAÇÃO COMPLETA: Agendamento e Controle de Tempo
-- Script corrigido para tabela 'users' (não 'profiles')
-- ================================================================

-- 1. Adicionar novas colunas para agendamento e controle de tempo
ALTER TABLE service_requests 
ADD COLUMN IF NOT EXISTS requested_datetime TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS scheduled_start_datetime TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS estimated_duration_minutes INTEGER,
ADD COLUMN IF NOT EXISTS actual_start_datetime TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS actual_end_datetime TIMESTAMP WITH TIME ZONE;

-- 2. Adicionar comentários para documentar os campos
COMMENT ON COLUMN service_requests.requested_datetime IS 'Data e hora solicitada pelo cliente para prestação do serviço';
COMMENT ON COLUMN service_requests.scheduled_start_datetime IS 'Data e hora agendada pelo administrador para início do atendimento';
COMMENT ON COLUMN service_requests.estimated_duration_minutes IS 'Previsão de duração do serviço em minutos (inputada pelo administrador)';
COMMENT ON COLUMN service_requests.actual_start_datetime IS 'Data e hora real de início do atendimento (inputada pelo profissional)';
COMMENT ON COLUMN service_requests.actual_end_datetime IS 'Data e hora real do final do atendimento (inputada pelo profissional)';

-- 3. Migrar dados existentes (se existirem colunas antigas)
-- Converter campo requested_date para requested_datetime onde possível
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_requests' AND column_name = 'requested_date') THEN
        UPDATE service_requests 
        SET requested_datetime = requested_date::timestamp with time zone
        WHERE requested_date IS NOT NULL 
        AND requested_datetime IS NULL;
    END IF;
END $$;

-- Converter campo scheduled_date para scheduled_start_datetime onde possível
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_requests' AND column_name = 'scheduled_date') THEN
        UPDATE service_requests 
        SET scheduled_start_datetime = scheduled_date::timestamp with time zone
        WHERE scheduled_date IS NOT NULL 
        AND scheduled_start_datetime IS NULL;
    END IF;
END $$;

-- 4. Adicionar constraints de validação (removendo se existirem primeiro)
DO $$
BEGIN
    -- Remover constraints se existirem
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'chk_estimated_duration_positive') THEN
        ALTER TABLE service_requests DROP CONSTRAINT chk_estimated_duration_positive;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'chk_actual_start_before_end') THEN
        ALTER TABLE service_requests DROP CONSTRAINT chk_actual_start_before_end;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'chk_scheduled_before_actual_start') THEN
        ALTER TABLE service_requests DROP CONSTRAINT chk_scheduled_before_actual_start;
    END IF;
END $$;

-- Adicionar constraints
ALTER TABLE service_requests 
ADD CONSTRAINT chk_estimated_duration_positive 
CHECK (estimated_duration_minutes IS NULL OR estimated_duration_minutes > 0);

ALTER TABLE service_requests 
ADD CONSTRAINT chk_actual_start_before_end 
CHECK (actual_start_datetime IS NULL OR actual_end_datetime IS NULL OR actual_start_datetime <= actual_end_datetime);

ALTER TABLE service_requests 
ADD CONSTRAINT chk_scheduled_before_actual_start 
CHECK (scheduled_start_datetime IS NULL OR actual_start_datetime IS NULL OR scheduled_start_datetime <= actual_start_datetime + INTERVAL '24 hours');

-- 5. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_service_requests_requested_datetime ON service_requests(requested_datetime);
CREATE INDEX IF NOT EXISTS idx_service_requests_scheduled_start_datetime ON service_requests(scheduled_start_datetime);
CREATE INDEX IF NOT EXISTS idx_service_requests_actual_start_datetime ON service_requests(actual_start_datetime);
CREATE INDEX IF NOT EXISTS idx_service_requests_actual_end_datetime ON service_requests(actual_end_datetime);

-- 6. Criar função para calcular duração real do serviço
CREATE OR REPLACE FUNCTION calculate_actual_duration_minutes(
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE
) RETURNS INTEGER AS $$
BEGIN
    IF start_time IS NULL OR end_time IS NULL THEN
        RETURN NULL;
    END IF;
    
    RETURN EXTRACT(EPOCH FROM (end_time - start_time)) / 60;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 7. Criar função para calcular status do agendamento
CREATE OR REPLACE FUNCTION get_scheduling_status(
    requested_dt TIMESTAMP WITH TIME ZONE,
    scheduled_dt TIMESTAMP WITH TIME ZONE,
    actual_start_dt TIMESTAMP WITH TIME ZONE,
    actual_end_dt TIMESTAMP WITH TIME ZONE,
    service_status TEXT
) RETURNS TEXT AS $$
BEGIN
    -- Se o serviço está concluído
    IF service_status = 'Completed' AND actual_end_dt IS NOT NULL THEN
        RETURN 'Completed';
    END IF;
    
    -- Se o serviço está em progresso
    IF actual_start_dt IS NOT NULL AND actual_end_dt IS NULL THEN
        RETURN 'In Progress';
    END IF;
    
    -- Se o serviço está atrasado (passou da data agendada e não iniciou)
    IF scheduled_dt IS NOT NULL 
       AND actual_start_dt IS NULL 
       AND NOW() > scheduled_dt + INTERVAL '30 minutes' THEN
        RETURN 'Delayed';
    END IF;
    
    -- Se o serviço está agendado para hoje
    IF scheduled_dt IS NOT NULL 
       AND DATE(scheduled_dt) = CURRENT_DATE THEN
        RETURN 'Scheduled Today';
    END IF;
    
    -- Se o serviço está agendado para o futuro
    IF scheduled_dt IS NOT NULL AND scheduled_dt > NOW() THEN
        RETURN 'Scheduled';
    END IF;
    
    -- Se tem data solicitada mas não agendada
    IF requested_dt IS NOT NULL AND scheduled_dt IS NULL THEN
        RETURN 'Awaiting Schedule';
    END IF;
    
    -- Default
    RETURN 'Pending';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 8. Remover view com erro (se existir)
DROP VIEW IF EXISTS vw_service_scheduling_report;

-- 9. Criar view para relatórios de agendamento (versão com tabela 'users')
CREATE OR REPLACE VIEW vw_service_scheduling_report AS
SELECT 
    sr.id,
    sr.title,
    sr.category,
    sr.status,
    COALESCE(client_user.name, client_user.email, 'Unknown Client') as client_name,
    COALESCE(professional_user.name, professional_user.email, 'Unassigned') as professional_name,
    sr.requested_datetime,
    sr.scheduled_start_datetime,
    sr.estimated_duration_minutes,
    sr.actual_start_datetime,
    sr.actual_end_datetime,
    calculate_actual_duration_minutes(sr.actual_start_datetime, sr.actual_end_datetime) as actual_duration_minutes,
    get_scheduling_status(
        sr.requested_datetime,
        sr.scheduled_start_datetime,
        sr.actual_start_datetime,
        sr.actual_end_datetime,
        sr.status
    ) as scheduling_status,
    CASE 
        WHEN sr.estimated_duration_minutes IS NOT NULL 
             AND sr.actual_start_datetime IS NOT NULL 
             AND sr.actual_end_datetime IS NOT NULL
        THEN calculate_actual_duration_minutes(sr.actual_start_datetime, sr.actual_end_datetime) - sr.estimated_duration_minutes
        ELSE NULL
    END as duration_variance_minutes,
    COALESCE(sr.street, '') || CASE WHEN sr.street IS NOT NULL AND sr.city IS NOT NULL THEN ', ' ELSE '' END ||
    COALESCE(sr.city, '') || CASE WHEN sr.city IS NOT NULL AND sr.state IS NOT NULL THEN ', ' ELSE '' END ||
    COALESCE(sr.state, '') as full_address
FROM service_requests sr
LEFT JOIN users client_user ON sr.client_id = client_user.id
LEFT JOIN users professional_user ON sr.professional_id = professional_user.id
ORDER BY sr.scheduled_start_datetime DESC NULLS LAST, sr.requested_datetime DESC;

-- 10. Comentários na view
COMMENT ON VIEW vw_service_scheduling_report IS 'View consolidada para relatórios de agendamento e controle de tempo dos serviços (versão para tabela users)';

-- 11. Criar trigger para atualizar status automaticamente
CREATE OR REPLACE FUNCTION update_service_status_on_time_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Se o profissional iniciou o serviço, mudar status para "In Progress"
    IF NEW.actual_start_datetime IS NOT NULL 
       AND (OLD.actual_start_datetime IS NULL OR OLD.actual_start_datetime != NEW.actual_start_datetime)
       AND NEW.actual_end_datetime IS NULL 
       AND NEW.status != 'In Progress' THEN
        NEW.status = 'In Progress';
    END IF;
    
    -- Se o profissional finalizou o serviço, mudar status para "Completed"
    IF NEW.actual_end_datetime IS NOT NULL 
       AND (OLD.actual_end_datetime IS NULL OR OLD.actual_end_datetime != NEW.actual_end_datetime)
       AND NEW.status != 'Completed' THEN
        NEW.status = 'Completed';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger
DROP TRIGGER IF EXISTS tr_update_service_status_on_time_change ON service_requests;
CREATE TRIGGER tr_update_service_status_on_time_change
    BEFORE UPDATE ON service_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_service_status_on_time_change();

-- Mensagem de conclusão
DO $$
BEGIN
    RAISE NOTICE '✅ Migração completa executada com sucesso!';
    RAISE NOTICE '📊 Novos campos adicionados à tabela service_requests';
    RAISE NOTICE '🔧 Funções e triggers criados';
    RAISE NOTICE '📈 View vw_service_scheduling_report criada usando tabela users';
    RAISE NOTICE '🚀 Sistema de agendamento está pronto para uso!';
END $$;
