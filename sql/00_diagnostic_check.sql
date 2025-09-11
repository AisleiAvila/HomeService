-- ================================================================
-- SCRIPT DE VERIFICAÇÃO E DIAGNÓSTICO
-- Para executar ANTES do script principal de migração
-- ================================================================

-- 1. Verificar se a tabela service_requests existe e listar suas colunas
DO $$
BEGIN
    RAISE NOTICE '=== VERIFICAÇÃO DA ESTRUTURA ATUAL ===';
    
    -- Verificar se a tabela service_requests existe
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'service_requests') THEN
        RAISE NOTICE '✅ Tabela service_requests encontrada';
    ELSE
        RAISE NOTICE '❌ Tabela service_requests NÃO encontrada';
        RETURN;
    END IF;
    
    -- Verificar se a tabela users existe
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        RAISE NOTICE '✅ Tabela users encontrada';
    ELSE
        RAISE NOTICE '⚠️ Tabela users NÃO encontrada - verificando se existe tabela profiles';
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
            RAISE NOTICE '✅ Tabela profiles encontrada como alternativa';
        ELSE
            RAISE NOTICE '❌ Nem tabela users nem profiles encontradas';
        END IF;
    END IF;
    
    RAISE NOTICE '=== ESTRUTURA ATUAL DA TABELA service_requests ===';
END $$;

-- 2. Mostrar colunas existentes na tabela service_requests
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'service_requests'
ORDER BY ordinal_position;

-- 3. Verificar se as novas colunas já existem
DO $$
DECLARE
    col_count INTEGER;
BEGIN
    RAISE NOTICE '=== VERIFICAÇÃO DAS NOVAS COLUNAS ===';
    
    -- Verificar requested_datetime
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns 
    WHERE table_name = 'service_requests' AND column_name = 'requested_datetime';
    
    IF col_count > 0 THEN
        RAISE NOTICE '✅ Coluna requested_datetime já existe';
    ELSE
        RAISE NOTICE '➕ Coluna requested_datetime será criada';
    END IF;
    
    -- Verificar scheduled_start_datetime
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns 
    WHERE table_name = 'service_requests' AND column_name = 'scheduled_start_datetime';
    
    IF col_count > 0 THEN
        RAISE NOTICE '✅ Coluna scheduled_start_datetime já existe';
    ELSE
        RAISE NOTICE '➕ Coluna scheduled_start_datetime será criada';
    END IF;
    
    -- Verificar estimated_duration_minutes
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns 
    WHERE table_name = 'service_requests' AND column_name = 'estimated_duration_minutes';
    
    IF col_count > 0 THEN
        RAISE NOTICE '✅ Coluna estimated_duration_minutes já existe';
    ELSE
        RAISE NOTICE '➕ Coluna estimated_duration_minutes será criada';
    END IF;
    
    -- Verificar actual_start_datetime
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns 
    WHERE table_name = 'service_requests' AND column_name = 'actual_start_datetime';
    
    IF col_count > 0 THEN
        RAISE NOTICE '✅ Coluna actual_start_datetime já existe';
    ELSE
        RAISE NOTICE '➕ Coluna actual_start_datetime será criada';
    END IF;
    
    -- Verificar actual_end_datetime
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns 
    WHERE table_name = 'service_requests' AND column_name = 'actual_end_datetime';
    
    IF col_count > 0 THEN
        RAISE NOTICE '✅ Coluna actual_end_datetime já existe';
    ELSE
        RAISE NOTICE '➕ Coluna actual_end_datetime será criada';
    END IF;
END $$;

-- 4. Verificar se as funções já existem
DO $$
BEGIN
    RAISE NOTICE '=== VERIFICAÇÃO DAS FUNÇÕES ===';
    
    -- Verificar calculate_actual_duration_minutes
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'calculate_actual_duration_minutes') THEN
        RAISE NOTICE '✅ Função calculate_actual_duration_minutes já existe';
    ELSE
        RAISE NOTICE '➕ Função calculate_actual_duration_minutes será criada';
    END IF;
    
    -- Verificar get_scheduling_status
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_scheduling_status') THEN
        RAISE NOTICE '✅ Função get_scheduling_status já existe';
    ELSE
        RAISE NOTICE '➕ Função get_scheduling_status será criada';
    END IF;
END $$;

-- 5. Verificar se a view já existe
DO $$
BEGIN
    RAISE NOTICE '=== VERIFICAÇÃO DA VIEW ===';
    
    IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'vw_service_scheduling_report') THEN
        RAISE NOTICE '✅ View vw_service_scheduling_report já existe (será recriada)';
    ELSE
        RAISE NOTICE '➕ View vw_service_scheduling_report será criada';
    END IF;
END $$;

-- 6. Mostrar alguns dados existentes para referência
DO $$
DECLARE
    record_count INTEGER;
BEGIN
    RAISE NOTICE '=== DADOS EXISTENTES ===';
    
    SELECT COUNT(*) INTO record_count FROM service_requests;
    RAISE NOTICE 'Total de service_requests existentes: %', record_count;
    
    IF record_count > 0 THEN
        RAISE NOTICE 'Primeiros 3 registros:';
    END IF;
END $$;

-- Mostrar primeiros registros se existirem
SELECT 
    id, 
    title, 
    status, 
    client_id, 
    professional_id,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_requests' AND column_name = 'requested_date') 
        THEN requested_date 
        ELSE NULL 
    END as existing_requested_date,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_requests' AND column_name = 'scheduled_date') 
        THEN scheduled_date 
        ELSE NULL 
    END as existing_scheduled_date
FROM service_requests 
LIMIT 3;

-- Finalizar diagnóstico
DO $$
BEGIN
    RAISE NOTICE '=== DIAGNÓSTICO CONCLUÍDO ===';
    RAISE NOTICE '';
    RAISE NOTICE '🔍 PRÓXIMOS PASSOS:';
    RAISE NOTICE '';
    
    -- Verificar qual script usar baseado na existência da tabela users/profiles
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        RAISE NOTICE '1️⃣ Execute o script: 18_add_scheduling_time_control.sql';
        RAISE NOTICE '   (Porque a tabela "users" foi encontrada)';
    ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        RAISE NOTICE '1️⃣ Execute o script: 18_add_scheduling_time_control_profiles.sql';
        RAISE NOTICE '   (Porque a tabela "profiles" foi encontrada)';
    ELSE
        RAISE NOTICE '⚠️ ATENÇÃO: Nenhuma tabela de usuários encontrada!';
        RAISE NOTICE '   Verifique se as tabelas users/profiles existem antes de continuar.';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '2️⃣ Após executar o script principal, teste com:';
    RAISE NOTICE '   SELECT * FROM vw_service_scheduling_report LIMIT 3;';
    RAISE NOTICE '';
    RAISE NOTICE '3️⃣ Teste as funções com:';
    RAISE NOTICE '   SELECT calculate_actual_duration_minutes(NOW() - INTERVAL ''2 hours'', NOW());';
    RAISE NOTICE '';
END $$;
