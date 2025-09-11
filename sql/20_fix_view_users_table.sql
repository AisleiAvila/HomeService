-- ================================================================
-- CORREÇÃO: Recriar view usando tabela 'users' em vez de 'profiles'
-- Execute este script para corrigir o erro da view
-- ================================================================

-- Remover a view com erro
DROP VIEW IF EXISTS vw_service_scheduling_report;

-- Recriar view correta usando tabela 'users'
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
    sr.street || ', ' || sr.city || ', ' || sr.state as full_address,
    COALESCE(sr.created_at, NOW()) as created_at,
    COALESCE(sr.updated_at, NOW()) as updated_at
FROM service_requests sr
LEFT JOIN users client_user ON sr.client_id = client_user.id
LEFT JOIN users professional_user ON sr.professional_id = professional_user.id
ORDER BY sr.scheduled_start_datetime DESC NULLS LAST, sr.requested_datetime DESC;

-- Comentário na view
COMMENT ON VIEW vw_service_scheduling_report IS 'View consolidada para relatórios de agendamento e controle de tempo dos serviços (versão corrigida para tabela users)';

-- Mensagem de conclusão
DO $$
BEGIN
    RAISE NOTICE '✅ View corrigida com sucesso!';
    RAISE NOTICE '📊 Agora usando tabela users em vez de profiles';
    RAISE NOTICE '🔧 Sistema de agendamento está pronto para uso';
END $$;
