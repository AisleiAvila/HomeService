-- ================================================================
-- MIGRAÇÃO: Adição de campos para agendamento e controle de tempo
-- Data: Setembro 2025
-- Descrição: Adiciona campos para controle completo de tempo dos serviços
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

-- 3. Migrar dados existentes
-- Converter campo requested_date para requested_datetime onde possível
UPDATE service_requests 
SET requested_datetime = requested_date::timestamp with time zone
WHERE requested_date IS NOT NULL 
AND requested_datetime IS NULL;

-- Converter campo scheduled_date para scheduled_start_datetime onde possível
UPDATE service_requests 
SET scheduled_start_datetime = scheduled_date::timestamp with time zone
WHERE scheduled_date IS NOT NULL 
AND scheduled_start_datetime IS NULL;

-- 4. Adicionar constraints de validação
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

-- 8. Criar view para relatórios de agendamento
-- Nota: Se usar Supabase com tabela 'profiles' em vez de 'users', altere as referências abaixo
CREATE OR REPLACE VIEW vw_service_scheduling_report AS
SELECT 
    sr.id,
    sr.title,
    sr.category,
    sr.status,
    COALESCE(client_user.name, 'Unknown Client') as client_name,
    COALESCE(professional_user.name, 'Unassigned') as professional_name,
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
    sr.street || ', ' || sr.city || ', ' || sr.state as full_address,
    COALESCE(sr.created_at, NOW()) as created_at,
    COALESCE(sr.updated_at, NOW()) as updated_at
FROM service_requests sr
LEFT JOIN users client_user ON sr.client_id = client_user.id
LEFT JOIN users professional_user ON sr.professional_id = professional_user.id
ORDER BY sr.scheduled_start_datetime DESC NULLS LAST, sr.requested_datetime DESC;

-- ALTERNATIVA: Se a tabela de usuários se chama 'profiles' (comum no Supabase)
-- Descomente as linhas abaixo e comente a view acima se necessário:
/*
CREATE OR REPLACE VIEW vw_service_scheduling_report AS
SELECT 
    sr.id,
    sr.title,
    sr.category,
    sr.status,
    COALESCE(client_profile.name, 'Unknown Client') as client_name,
    COALESCE(professional_profile.name, 'Unassigned') as professional_name,
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
    sr.street || ', ' || sr.city || ', ' || sr.state as full_address,
    sr.created_at,
    sr.updated_at
FROM service_requests sr
LEFT JOIN profiles client_profile ON sr.client_id = client_profile.id
LEFT JOIN profiles professional_profile ON sr.professional_id = professional_profile.id
ORDER BY sr.scheduled_start_datetime DESC NULLS LAST, sr.requested_datetime DESC;
*/

-- 9. Comentários na view
COMMENT ON VIEW vw_service_scheduling_report IS 'View consolidada para relatórios de agendamento e controle de tempo dos serviços';

-- 10. Criar trigger para atualizar status automaticamente
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

-- 11. Inserir dados de exemplo com novos campos
INSERT INTO service_requests (
    client_id, client_auth_id, title, description, category,
    street, city, state, zip_code,
    status, payment_status, 
    requested_datetime, scheduled_start_datetime, estimated_duration_minutes
) VALUES
(1, 'client-uuid-1', 'Exemplo com agendamento completo', 'Serviço de exemplo para testar novos campos', 'Plumbing',
 'Rua dos Exemplos, 123', 'Lisboa', 'Lisboa', '1000-001',
 'Scheduled', 'Unpaid',
 NOW() + INTERVAL '1 day', -- Solicitado para amanhã
 NOW() + INTERVAL '2 days' + INTERVAL '14 hours', -- Agendado para depois de amanhã às 14h
 120 -- 2 horas estimadas
),
(1, 'client-uuid-1', 'Exemplo em progresso', 'Serviço que já começou', 'Electrical',
 'Avenida do Progresso, 456', 'Porto', 'Porto', '4000-001',
 'In Progress', 'Unpaid',
 NOW() - INTERVAL '2 days', -- Solicitado há 2 dias
 NOW() - INTERVAL '1 hour', -- Agendado para há 1 hora
 90, -- 1.5 horas estimadas
 NOW() - INTERVAL '30 minutes', -- Iniciado há 30 minutos
 NULL -- Ainda não terminou
)
ON CONFLICT DO NOTHING;

COMMIT;

-- Mensagem de conclusão
DO $$
BEGIN
    RAISE NOTICE '✅ Migração concluída com sucesso!';
    RAISE NOTICE '📊 Novos campos adicionados:';
    RAISE NOTICE '   - requested_datetime (data/hora solicitada pelo cliente)';
    RAISE NOTICE '   - scheduled_start_datetime (data/hora agendada pelo admin)';
    RAISE NOTICE '   - estimated_duration_minutes (previsão de duração pelo admin)';
    RAISE NOTICE '   - actual_start_datetime (início real pelo profissional)';
    RAISE NOTICE '   - actual_end_datetime (fim real pelo profissional)';
    RAISE NOTICE '🔧 Funções criadas:';
    RAISE NOTICE '   - calculate_actual_duration_minutes()';
    RAISE NOTICE '   - get_scheduling_status()';
    RAISE NOTICE '📈 View criada: vw_service_scheduling_report';
    RAISE NOTICE '⚡ Trigger criado para atualização automática de status';
END $$;
